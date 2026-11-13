/*
 * UI 参考库 R1：汇总"美术好评"的游戏，出候选清单（docs/ui-hud-plan.md 研究轨）。
 * 运行：npx tsx scripts/refs/collect-candidates.ts
 *
 * 来源（每款都记下证据，可回溯）：
 *   1. 案例库 src/content/cases/cases.json（361 款，含调研代表作与 IGF/BAFTA/TGA 奖项匹配）
 *   2. 奖项名单：src/content/cases/awards.json（IGF 视觉艺术 / BAFTA 艺术成就 / TGA 最佳美术指导）
 *      + 维基百科：GDC 选择奖 最佳视觉艺术（只列得奖者）、D.I.C.E. 杰出美术指导（得奖 + 入围）、
 *        Golden Joystick 最佳视觉设计（主页按年列得奖者）、Apple Design Awards 视觉与图形（手机，R4 用）
 *   3. Steam 信号：SteamSpy 按美术标签列游戏，取好评率 ≥ 90% 且评测 ≥ 2,000
 * 之后每款用 SteamSpy appdetails 取标签与评测数，按标签映射到 16 个品类。
 * 所有网络请求缓存在 qa/refs-cache/（重跑不重复请求）；SteamSpy 每秒 1 次。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type AwardHit, parseAppleDesign, parseDice, parseGdca, parseGoldenJoystick } from './awards';
import { type GenreId, type ManualEntry, MANUAL_BY_RAW } from './nonsteam';

const ROOT = process.cwd();
const CACHE = join(ROOT, 'qa', 'refs-cache');
const OUT_JSON = join(ROOT, 'docs', 'survey', 'data', 'ui-ref-candidates.json');
const UA = 'game-art-explorer-research/0.1';
mkdirSync(CACHE, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastHit: Record<string, number> = {};

async function cached(key: string, url: string, host: string, gapMs: number): Promise<unknown> {
  const f = join(CACHE, `${key.replace(/[^\w.-]+/g, '_').slice(0, 120)}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const wait = (lastHit[host] ?? 0) + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  for (let attempt = 0; attempt < 3; attempt++) {
    lastHit[host] = Date.now();
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 429 || r.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
      const text = await r.text();
      const data = JSON.parse(text);
      writeFileSync(f, JSON.stringify(data));
      return data;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

const wiki = async (page: string) => {
  const d = await cached(`wiki_${page}`, `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`, 'wiki', 500) as { parse?: { wikitext: string } } | null;
  return d?.parse?.wikitext ?? '';
};
const spyTag = async (tag: string) => (await cached(`spy_tag_${tag}`, `https://steamspy.com/api.php?request=tag&tag=${encodeURIComponent(tag)}`, 'spy', 1100) ?? {}) as Record<string, SpyApp>;
const spyApp = async (appid: number) => (await cached(`spy_app_${appid}`, `https://steamspy.com/api.php?request=appdetails&appid=${appid}`, 'spy', 1100)) as SpyApp | null;
const storeSearch = async (term: string) => (await cached(`store_search_${term}`, `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=us&l=en`, 'store', 400)) as { items?: { id: number; name: string; type: string }[] } | null;

interface SpyApp {
  appid: number; name: string; developer?: string; publisher?: string;
  positive: number; negative: number; tags?: Record<string, number> | []; owners?: string;
}

/* ---------------- 名称归一与匹配 ---------------- */
const norm = (s: string) => s.toLowerCase()
  .replace(/\(.*?\)/g, ' ')
  .replace(/[™®©:'’!?.,\-–—_/&+]/g, ' ')
  .replace(/\b(the|a|an|edition|definitive|remastered|game of the year|goty|director s cut|hd)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** loose：只给手工对照表里写明的 Steam 名称用，允许"包含"匹配（如 "Hellblade II" → "Senua's Saga: Hellblade II"） */
async function resolveSteam(name: string, loose = false): Promise<{ appid: number; name: string; confidence: 'exact' | 'prefix' | 'contains' } | null> {
  const r = await storeSearch(name);
  const items = (r?.items ?? []).filter((x) => x.type === 'app');
  const n = norm(name);
  const exact = items.find((x) => norm(x.name) === n);
  if (exact) return { appid: exact.id, name: exact.name, confidence: 'exact' };
  // 前缀必须落在词边界上："assassin s creed ii" 不能匹配 "assassin s creed iii remastered"（2026-10-14 抽查发现的误配）
  const pre = items.filter((x) => { const k = norm(x.name); return k.startsWith(`${n} `) || n.startsWith(`${k} `); });
  if (pre.length === 1 && Math.min(norm(pre[0].name).length, n.length) >= 4) return { appid: pre[0].id, name: pre[0].name, confidence: 'prefix' };
  if (loose) {
    const has = items.find((x) => ` ${norm(x.name)} `.includes(` ${n} `));
    if (has) return { appid: has.id, name: has.name, confidence: 'contains' };
  }
  return null;
}

/* ---------------- 品类映射（Steam 用户标签 → 探索台 16 个品类） ---------------- */
const GENRE_TAGS: Record<string, string[]> = {
  strategy: ['Strategy', 'RTS', 'Turn-Based Strategy', 'Grand Strategy', 'Tactical', 'Turn-Based Tactics', '4X', 'Wargame', 'Tower Defense', 'Real Time Tactics', 'Auto Battler', 'Military'],
  builder: ['City Builder', 'Colony Sim', 'Base Building', 'Building', 'Management', 'Resource Management', 'God Game', 'Economy', 'Town Builder', 'Business'],
  factory: ['Automation', 'Logistics', 'Programming', 'Engineering'],
  explore: ['Exploration', 'Open World', 'Walking Simulator', 'Adventure', 'Atmospheric'],
  action: ['Action', 'Hack and Slash', 'Action Roguelike', 'Souls-like', "Beat 'em up", 'Bullet Hell', 'Character Action Game', 'Fighting', 'Spectacle fighter', 'Combat'],
  platformer: ['Platformer', '2D Platformer', '3D Platformer', 'Precision Platformer', 'Metroidvania', 'Side Scroller'],
  shooter: ['FPS', 'Shooter', 'Third-Person Shooter', 'Twin Stick Shooter', "Shoot 'Em Up", 'Arena Shooter', 'Looter Shooter', 'Boomer Shooter'],
  rpg: ['RPG', 'JRPG', 'CRPG', 'Action RPG', 'Party-Based RPG', 'Dungeon Crawler', 'Turn-Based Combat', 'Strategy RPG'],
  puzzle: ['Puzzle', 'Puzzle Platformer', 'Logic', 'Hidden Object', 'Point & Click', 'Detective', 'Investigation'],
  horror: ['Horror', 'Psychological Horror', 'Survival Horror', 'Lovecraftian', 'Thriller'],
  survival: ['Survival', 'Crafting', 'Open World Survival Craft'],
  life: ['Life Sim', 'Farming Sim', 'Cozy', 'Relaxing', 'Dating Sim', 'Farming', 'Cooking', 'Wholesome'],
  card: ['Card Game', 'Deckbuilding', 'Card Battler', 'Board Game', 'Tabletop', 'Solitaire', 'Roguelike Deckbuilder'],
  racing: ['Racing', 'Driving', 'Automobile Sim', 'Offroad', 'Motorbike', 'Combat Racing'],
  sandbox: ['Sandbox', 'Physics', 'Voxel', 'Destruction'],
  narrative: ['Story Rich', 'Visual Novel', 'Interactive Fiction', 'Choices Matter', 'Narrative', 'Choose Your Own Adventure'],
};
// 宽泛标签（几乎所有游戏都有）权重打折
const BROAD = new Set(['Action', 'Adventure', 'Atmospheric', 'Story Rich', 'Strategy', 'RPG', 'Puzzle', 'Exploration']);

function genresOf(tags: Record<string, number>): { primary: string | null; all: string[]; scores: Record<string, number> } {
  const ranked = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const scores: Record<string, number> = {};
  ranked.forEach(([tag], i) => {
    const w = (1 - i / 24) * (BROAD.has(tag) ? 0.45 : 1);
    for (const [g, list] of Object.entries(GENRE_TAGS)) if (list.includes(tag)) scores[g] = (scores[g] ?? 0) + w;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[1] ?? 0;
  return { primary: sorted[0]?.[0] ?? null, all: sorted.filter(([, s]) => s >= top * 0.55 && s >= 0.3).map(([g]) => g), scores };
}

/* ---------------- 美术标签（Steam 信号） ---------------- */
// "Atmospheric"（氛围）不收：它描述情绪而不是美术，一个标签就带进 864 款
const ART_TAGS = ['Beautiful', 'Stylized', 'Hand-drawn', 'Colorful', 'Cartoony', 'Pixel Graphics', 'Cel-Shaded', 'Comic Book', 'Anime', 'Surreal', 'Minimalist', 'Abstract', 'Psychedelic', 'Cartoon', 'Cute', 'Voxel', 'Noir'];
const STEAM_MIN_REVIEWS = 2000;
const STEAM_MIN_RATIO = 0.9;
// 只靠 Steam 标签入选的游戏：美术标签必须排在玩家标签的前 12 位（标签只是"挂着"太弱）
const ART_TAG_MAX_RANK = 12;
// 品类补充（E 级）：门槛放宽，只限这些品类
const GENRE_FILL: Record<string, string[]> = { factory: ['Automation', 'Logistics'], racing: ['Racing', 'Driving', 'Combat Racing'] };
const FILL_MIN_REVIEWS = 500;
const FILL_MIN_RATIO = 0.85;

interface Candidate {
  key: string;
  appid: number | null;
  name: string;
  platform: 'steam' | 'non-steam';
  evidence: { awards: AwardHit[]; cases: string[]; artTags: string[]; tier: 'A' | 'B' | 'C' | 'D' | 'E' };
  reviews?: { positive: number; negative: number; ratio: number };
  tags?: string[];
  genres?: { primary: string | null; all: string[]; note?: string };
  match?: string;
  /** 手工对照表（scripts/refs/nonsteam.ts）：平台、说明 */
  manual?: { canonical: string; platform: string; note?: string };
}

async function main() {
  const cands = new Map<string, Candidate>();
  const byApp = (appid: number) => `app:${appid}`;
  const add = (key: string, init: () => Candidate) => {
    if (!cands.has(key)) cands.set(key, init());
    return cands.get(key)!;
  };

  // 手工对照表：缩写 / 旧名 → Steam 上的名称；真不在 Steam 的给出平台与品类
  const manualOf = async (raw: string) => {
    const e = MANUAL_BY_RAW.get(raw);
    if (!e) return null;
    if (e.appid) return { e, appid: e.appid as number | null, key: byApp(e.appid), match: 'manual-appid' };
    if (e.steam) {
      const r = await resolveSteam(e.steam, true);
      if (r) return { e, appid: r.appid as number | null, key: byApp(r.appid), match: `manual-${r.confidence}` };
      console.log(`  对照表里的 Steam 名称没找到：${e.steam}（按非 Steam 处理）`);
    }
    return { e, appid: null as number | null, key: `name:${norm(e.canonical)}`, match: 'manual' };
  };
  const applyManual = (k: Candidate, e: ManualEntry) => {
    k.manual = { canonical: e.canonical, platform: e.platform, note: e.note };
    if (!k.appid) {
      k.name = e.canonical;
      k.genres = { primary: e.primary ?? null, all: [e.primary, ...(e.blend ?? [])].filter((g): g is GenreId => !!g), note: e.note };
    }
  };

  // 1. 案例库
  const cases = JSON.parse(readFileSync(join(ROOT, 'src/content/cases/cases.json'), 'utf8')).cases as {
    id: string; name: string; appid: number | null; platform: string; evidence: { awards: { award?: string; year?: number; result?: string }[] }; verifyStatus: string;
  }[];
  for (const c of cases) {
    const m = c.appid ? null : await manualOf(c.name);
    const appid = c.appid ?? m?.appid ?? null;
    const key = appid ? byApp(appid) : m?.key ?? `name:${norm(c.name)}`;
    const k = add(key, () => ({ key, appid, name: c.name, platform: appid ? 'steam' : 'non-steam', evidence: { awards: [], cases: [], artTags: [], tier: 'C' }, match: m?.match }));
    if (m) applyManual(k, m.e);
    k.evidence.cases.push(c.id);
    for (const a of c.evidence.awards ?? []) {
      if (a.award) k.evidence.awards.push({ source: a.award, year: a.year ?? 0, result: a.result === 'winner' ? 'winner' : 'nominee', title: c.name });
    }
  }
  console.log('案例库', cands.size);

  // 2. 奖项
  const awardsJson = JSON.parse(readFileSync(join(ROOT, 'src/content/cases/awards.json'), 'utf8')).awards as { award: string; year: number; name: string; result: string }[];
  const hits: AwardHit[] = awardsJson.map((a) => ({ source: a.award, year: a.year, result: a.result === 'winner' ? 'winner' : 'nominee', title: a.name }));
  hits.push(...parseGdca(await wiki('Game_Developers_Choice_Award_for_Best_Visual_Art')));
  hits.push(...parseDice(await wiki('D.I.C.E._Award_for_Outstanding_Achievement_in_Art_Direction')));
  hits.push(...parseGoldenJoystick(await wiki('Golden_Joystick_Awards')));
  const apple = parseAppleDesign(await wiki('Apple_Design_Awards'));
  hits.push(...apple);
  const bySource: Record<string, number> = {};
  hits.forEach((h) => (bySource[h.source] = (bySource[h.source] ?? 0) + 1));
  console.log('奖项条目', hits.length, bySource);

  // 已在案例库里的奖项条目（按名称）不重复解析
  const caseNames = new Map(cases.map((c) => [norm(c.name), c]));
  let resolved = 0, unresolved = 0;
  for (const h of hits) {
    const m = await manualOf(h.title);
    const inCase = m ? undefined : caseNames.get(norm(h.title));
    let key: string;
    let appid: number | null = m ? m.appid : inCase?.appid ?? null;
    let match = m ? m.match : inCase ? 'case' : '';
    if (!appid && !m) {
      const r = await resolveSteam(h.title);
      if (r) { appid = r.appid; match = r.confidence; resolved++; } else unresolved++;
    }
    key = m && !appid ? m.key : appid ? byApp(appid) : `name:${norm(h.title)}`;
    const k = add(key, () => ({ key, appid, name: h.title, platform: appid ? 'steam' : 'non-steam', evidence: { awards: [], cases: [], artTags: [], tier: 'B' }, match }));
    if (m) applyManual(k, m.e);
    if (!k.evidence.awards.some((a) => a.source === h.source && a.year === h.year)) k.evidence.awards.push(h);
  }
  console.log('奖项 → Steam：解析', resolved, '未解析（多为主机独占 / 手机 / 未上 Steam）', unresolved);
  const unclassified = [...cands.values()].filter((c) => !c.appid && !c.manual);
  if (unclassified.length) console.log(`  非 Steam 但对照表里没有（需要补进 scripts/refs/nonsteam.ts）：${unclassified.map((c) => c.name).join(' | ')}`);

  // 3. Steam 美术标签
  for (const tag of ART_TAGS) {
    const list = await spyTag(tag);
    let n = 0;
    for (const a of Object.values(list)) {
      const tot = a.positive + a.negative;
      if (tot < STEAM_MIN_REVIEWS || a.positive / tot < STEAM_MIN_RATIO) continue;
      const key = byApp(a.appid);
      const k = add(key, () => ({ key, appid: a.appid, name: a.name, platform: 'steam', evidence: { awards: [], cases: [], artTags: [], tier: 'D' } }));
      if (!k.evidence.artTags.includes(tag)) k.evidence.artTags.push(tag);
      n++;
    }
    console.log(`标签 ${tag}: ${Object.keys(list).length} 款，合格 ${n}`);
  }

  // 3b. 品类补充：工厂、竞速在上面的门槛下不足 15 款（R1 第一轮：4 款、6 款）→ 放宽门槛只收该品类，记 E 级；
  //     第 5 步还要求主品类对得上、标签里有美术标签，否则移进备查池
  const fillOf = new Map<string, string>();
  for (const [g, tags] of Object.entries(GENRE_FILL)) {
    for (const tag of tags) {
      const list = await spyTag(tag);
      let n = 0;
      for (const a of Object.values(list)) {
        const tot = a.positive + a.negative;
        if (tot < FILL_MIN_REVIEWS || a.positive / tot < FILL_MIN_RATIO) continue;
        const key = byApp(a.appid);
        if (cands.has(key)) continue;
        add(key, () => ({ key, appid: a.appid, name: a.name, platform: 'steam', evidence: { awards: [], cases: [], artTags: [], tier: 'E' } }));
        fillOf.set(key, g);
        n++;
      }
      console.log(`品类补充 ${g} / ${tag}: 新增 ${n}`);
    }
  }

  // 4. 每款取标签与评测（SteamSpy appdetails，每秒 1 次）
  const steamCands = [...cands.values()].filter((c) => c.appid);
  console.log('需要取详情的 Steam 游戏', steamCands.length);
  let i = 0;
  for (const c of steamCands) {
    const d = await spyApp(c.appid!);
    i++;
    if (i % 50 === 0) console.log(`  详情 ${i}/${steamCands.length}`);
    if (!d || !d.name) continue;
    const tot = (d.positive ?? 0) + (d.negative ?? 0);
    c.reviews = { positive: d.positive ?? 0, negative: d.negative ?? 0, ratio: tot ? +(d.positive / tot).toFixed(3) : 0 };
    const tags = Array.isArray(d.tags) ? {} : (d.tags ?? {});
    c.tags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);
    const g = genresOf(tags);
    c.genres = { primary: g.primary, all: g.all, note: c.manual?.note };
    if (c.name !== d.name && c.evidence.cases.length === 0) c.name = d.name;
    // 美术标签补记（来自奖项 / 案例的游戏也看看它有没有美术标签）
    for (const t of ART_TAGS) if (t in tags && !c.evidence.artTags.includes(t)) c.evidence.artTags.push(t);
  }

  // 5. 分级：A 美术奖得主 / B 入围 / C 案例库代表作 / D Steam 美术标签（前 12 位）+ 高好评
  const pool: Candidate[] = [];
  for (const c of cands.values()) {
    const win = c.evidence.awards.some((a) => a.result === 'winner');
    const nom = c.evidence.awards.length > 0;
    c.evidence.tier = win ? 'A' : nom ? 'B' : c.evidence.cases.length ? 'C' : 'D';
    const fill = fillOf.get(c.key);
    if (fill) {
      c.evidence.tier = 'E';
      if (!c.genres?.all.includes(fill) || !c.evidence.artTags.length) { pool.push(c); cands.delete(c.key); }
      continue;
    }
    if (c.evidence.tier === 'D') {
      const top = (c.tags ?? []).slice(0, ART_TAG_MAX_RANK);
      c.evidence.artTags = c.evidence.artTags.filter((t) => top.includes(t));
      if (!c.evidence.artTags.length) { pool.push(c); cands.delete(c.key); }
    }
  }
  writeFileSync(OUT_JSON.replace('.json', '.pool.json'), JSON.stringify({ note: `只靠 Steam 标签、但美术标签不在前 ${ART_TAG_MAX_RANK} 位的游戏（不进候选，备查）`, games: pool.map((c) => ({ appid: c.appid, name: c.name, tags: c.tags?.slice(0, 12) })) }, null, 1));
  console.log('只靠标签、美术标签排名靠后（移出候选）', pool.length);

  const list = [...cands.values()].sort((a, b) => a.evidence.tier.localeCompare(b.evidence.tier) || (b.reviews?.positive ?? 0) - (a.reviews?.positive ?? 0));
  const genreCount: Record<string, number> = {};
  const genrePrimary: Record<string, number> = {};
  for (const c of list) {
    for (const g of c.genres?.all ?? []) genreCount[g] = (genreCount[g] ?? 0) + 1;
    if (c.genres?.primary) genrePrimary[c.genres.primary] = (genrePrimary[c.genres.primary] ?? 0) + 1;
  }
  const tierCount: Record<string, number> = {};
  list.forEach((c) => (tierCount[c.evidence.tier] = (tierCount[c.evidence.tier] ?? 0) + 1));
  const summary = {
    generatedAt: new Date().toISOString(),
    total: list.length,
    steam: list.filter((c) => c.appid).length,
    nonSteam: list.filter((c) => !c.appid).length,
    tiers: tierCount,
    awardSources: bySource,
    genreCount,
    genrePrimary,
    criteria: { steamMinReviews: STEAM_MIN_REVIEWS, steamMinRatio: STEAM_MIN_RATIO, artTags: ART_TAGS },
    tierNote: 'A 美术类奖项得主；B 美术类奖项入围；C 案例库调研代表作；D Steam 美术标签（前 12 位）且好评率 ≥ 90%、评测 ≥ 2,000；E 品类补充（工厂、竞速：评测 ≥ 500、好评率 ≥ 85%，标签里有美术标签）',
  };
  writeFileSync(OUT_JSON, JSON.stringify({ summary, candidates: list }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
}

main();
