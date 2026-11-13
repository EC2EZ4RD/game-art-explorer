// 第 7 步：汇总 → src/content/cases/cases.json
//   候选表 + 核验结果 + 已下载截图 + 奖项交叉引用 + 榜单 + SteamPeek
// 用法：node scripts/cases/assemble.mjs
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, PUBLIC_DIR, CACHE_DIR, readJson, writeJson, nowIso, normName, tokens, splitName, slugify, dirSize, mb } from './lib.mjs';

const { candidates, surveyRows } = readJson(join(CONTENT_DIR, 'candidates.json'));
const verify = readJson(join(CONTENT_DIR, 'verify.json'));
const { awards } = readJson(join(CONTENT_DIR, 'awards.json'));
const charts = readJson(join(CONTENT_DIR, 'charts.json'), null);
const steampeek = readJson(join(CONTENT_DIR, 'steampeek.json'), null);
const download = readJson(join(CACHE_DIR, 'download-report.json'), null);

/** 奖项表里的简称 → 调研案例名。只在自动匹配会出错或有歧义时使用。 */
const AWARD_ALIASES = {
  hellblade: { to: "Hellblade: Senua's Sacrifice" },
  rdr2: { to: 'Red Dead Redemption 2' },
  'zelda botw': { to: 'Zelda: Breath of the Wild' },
  'zelda totk': { to: 'Zelda: Tears of the Kingdom' },
  kingdom: { to: 'Kingdom Two Crowns', note: '奖项针对 2015 年初代 Kingdom（本条为续作 Kingdom Two Crowns）' },
  tlou: { to: 'The Last of Us Part I', note: '奖项针对 2013 年 PS3 原版 The Last of Us（本条为 2022 年重制版）' },
  'persona 5': { to: 'Persona 5 Royal', note: '奖项针对 2017 年原版 Persona 5（本条为加强版 Royal）' },
  'ni no kuni': { to: 'Ni no Kuni Remastered', note: '奖项针对 2013 年原版《二之国：白色圣灰的女王》（本条为重制版）' },
  'elden ring shadow of the erdtree': { to: 'ELDEN RING', note: '提名针对 DLC Shadow of the Erdtree' },
  'sludge life 2': { to: 'SLUDGE LIFE', note: '荣誉提名针对续作 SLUDGE LIFE 2（本条为初代）' },
  'death stranding': { to: "DEATH STRANDING DIRECTOR'S CUT", note: '奖项针对 2019 年原版（本条为导演剪辑版）' },
  'ghost of tsushima': { to: 'Ghost of Tsushima DC', note: '奖项针对 2020 年 PS4 原版（本条为导演剪辑版）' },
  'dear esther': { to: 'Dear Esther: Landmark Edition', note: '奖项针对 2012 年原版（本条为 Landmark Edition）' },
  'ori and the blind forest': { to: 'Ori and the Blind Forest DE', note: '奖项针对 2015 年原版（本条为决定版）' },
};
/** 非拉丁名称案例的 id */
const ID_OVERRIDES = { '绘真·妙笔千山': 'huizhen-miaobi-qianshan', 江南百景图: 'jiangnan-baijingtu', 尼山萨满: 'nishan-saman' };

// ---------- 合并重复行（同一 appid / 同名出现在多个组） ----------
const vByIndex = new Map(verify.results.map((r) => [r.index, r]));
const merged = new Map();
candidates.forEach((c, index) => {
  const v = vByIndex.get(index);
  const key = v?.appid ? `app:${v.appid}` : `name:${normName(c.name)}`;
  const entry = { c, v, index };
  if (!merged.has(key)) merged.set(key, []);
  merged.get(key).push(entry);
});

// ---------- 名称索引（奖项交叉引用用） ----------
const caseNameKey = (name) => normName(splitName(name).latin || name);
const groupsList = [...merged.values()].map((rows) => {
  const primary = rows.find((r) => !r.c.crossRefGroup) ?? rows[0];
  return { rows, primary };
});
const byKey = new Map();
for (const g of groupsList) {
  for (const r of g.rows) {
    const k = caseNameKey(r.c.name);
    if (!byKey.has(k)) byKey.set(k, g);
  }
}

const crossRef = { exact: 0, alias: [], prefix: [], ambiguous: [], unmatched: [] };
const awardsByGroup = new Map();
for (const a of awards) {
  const k = normName(a.name);
  let target = null;
  let how = null;
  let note = null;
  const alias = AWARD_ALIASES[k];
  if (alias) {
    target = byKey.get(caseNameKey(alias.to));
    how = 'alias';
    note = alias.note ?? null;
  } else if (byKey.has(k)) {
    target = byKey.get(k);
    how = 'exact';
  } else {
    // 词边界前缀匹配：奖项名是案例名的前缀，或反过来
    const at = tokens(a.name);
    const hits = [...byKey.entries()].filter(([ck]) => {
      const ct = ck.split(' ');
      const [short, long] = at.length <= ct.length ? [at, ct] : [ct, at];
      return short.length > 0 && short.every((t, i) => long[i] === t);
    });
    const uniq = [...new Set(hits.map(([, g]) => g))];
    if (uniq.length === 1) {
      target = uniq[0];
      how = 'prefix';
    } else if (uniq.length > 1) {
      crossRef.ambiguous.push({ award: `${a.awardKey} ${a.year}`, listedAs: a.name, candidates: uniq.map((g) => g.primary.c.name) });
    }
  }
  if (!target) {
    if (!crossRef.ambiguous.some((x) => x.listedAs === a.name && x.award === `${a.awardKey} ${a.year}`)) crossRef.unmatched.push(`${a.awardKey} ${a.year} ${a.name}`);
    continue;
  }
  const rec = { award: a.award, awardKey: a.awardKey, year: a.year, result: a.result, listedAs: a.name, source: a.source };
  if (a.yearLabel) rec.yearLabel = a.yearLabel;
  if (note) rec.note = note;
  if (how === 'exact') crossRef.exact++;
  else crossRef[how].push({ award: `${a.awardKey} ${a.year} ${a.result}`, listedAs: a.name, case: target.primary.c.name, ...(note ? { note } : {}) });
  if (!awardsByGroup.has(target)) awardsByGroup.set(target, []);
  awardsByGroup.get(target).push(rec);
}

// ---------- 榜单与 SteamPeek 索引 ----------
const chartHits = new Map();
for (const [list, data] of Object.entries(charts?.lists ?? {})) {
  for (const it of data.items) {
    if (!chartHits.has(it.appid)) chartHits.set(it.appid, []);
    chartHits.get(it.appid).push({ list, label: data.label, rank: it.rank, steamRank: it.steamRank, region: charts.region, fetchedAt: charts.fetchedAt });
  }
}
const spHits = new Map();
for (const s of steampeek?.seeds ?? []) {
  for (const r of s.related) {
    if (!spHits.has(r.appid)) spHits.set(r.appid, []);
    spHits.get(r.appid).push({ seed: s.seed, seedName: s.name, rank: r.rank, rs: r.rs, steamPeekRating: r.steamPeekRating });
  }
}

// ---------- 组装 ----------
const IMG = ['header.jpg', 't1.jpg', 't2.jpg', 't3.jpg', 't4.jpg', 'f1.jpg', 'f2.jpg'];
const usedIds = new Set();
const evidenceCheck = [];
const cases = [];
for (const g of groupsList) {
  const { c, v } = g.primary;
  const appid = v?.appid ?? null;
  const steamOk = appid && (v.status === 'verified' || v.status === 'corrected') && v.steamName;
  const latin = splitName(c.name).latin;
  let id = ID_OVERRIDES[c.name] ?? (slugify(latin) || (steamOk ? slugify(v.steamName) : '') || `case-${c.group.toLowerCase()}-${c.row}`);
  while (usedIds.has(id)) id = `${id}-${appid ?? c.row}`;
  usedIds.add(id);

  const files = appid ? IMG.filter((f) => existsSync(join(PUBLIC_DIR, String(appid), f))) : [];
  const rel = (f) => `cases/${appid}/${f}`;
  const caseAwards = (awardsByGroup.get(g) ?? []).sort((a, b) => b.year - a.year || a.awardKey.localeCompare(b.awardKey));

  // 调研文字里提到的奖项年份 vs 交叉引用结果（只做提示，不改数据）
  const mentioned = [...c.evidence.matchAll(/\b(IGF|BAFTA|TGA)(\d{2})\b/g)].map((m) => `${m[1]}${m[2]}`);
  const linked = new Set(caseAwards.map((a) => `${a.awardKey}${String(a.year).slice(2)}`));
  const missing = [...new Set(mentioned)].filter((m) => !linked.has(m));
  if (missing.length) evidenceCheck.push({ case: c.name, surveyEvidence: c.evidence, notInAwardTables: missing });

  const sources = [];
  const addSrc = (u) => u && !sources.includes(u) && sources.push(u);
  if (steamOk) addSrc(`https://store.steampowered.com/app/${appid}/`);
  for (const r of g.rows) r.c.sources.forEach(addSrc);
  for (const a of caseAwards) addSrc(a.source);

  const devSurvey = c.developer;
  cases.push({
    id,
    name: c.name,
    nameZh: steamOk ? v.steamNameZh ?? null : null,
    appid: steamOk ? appid : null,
    platform: c.platform,
    developers: steamOk && v.developers?.length ? v.developers : devSurvey.split(/\s*\/\s*/).filter((x) => x && x !== '待核验'),
    developersSurvey: devSurvey,
    publishers: steamOk ? v.publishers ?? [] : [],
    group: c.group,
    groupTitle: c.groupTitle,
    alsoInGroups: g.rows.filter((r) => r !== g.primary).map((r) => ({ group: r.c.group, groupTitle: r.c.groupTitle, artFeature: r.c.artFeature })),
    artFeature: c.artFeature,
    evidence: {
      awards: caseAwards,
      charts: steamOk ? chartHits.get(appid) ?? [] : [],
      steampeek: steamOk ? [...new Set((spHits.get(appid) ?? []).map((x) => x.seed))] : [],
      steampeekDetail: steamOk ? spHits.get(appid) ?? [] : [],
      other: c.evidence.split(/[；;]/).map((s) => s.trim()).filter(Boolean),
    },
    sources,
    sourcesPending: sources.length === 0, // 调研表写"来源待补"或没有链接
    verifyStatus: v?.status ?? 'unknown',
    verifiedAt: v?.verifiedAt ?? null,
    verifyNote: v?.note ?? null,
    surveyAppid: c.surveyAppid,
    steam: steamOk
      ? { name: v.steamName, nameZh: v.steamNameZh, type: v.type, releaseDate: v.releaseDate, comingSoon: v.comingSoon }
      : null,
    images: {
      header: files.includes('header.jpg') ? rel('header.jpg') : null,
      thumbs: ['t1.jpg', 't2.jpg', 't3.jpg', 't4.jpg'].filter((f) => files.includes(f)).map(rel),
      full: ['f1.jpg', 'f2.jpg'].filter((f) => files.includes(f)).map(rel),
      provenance: files.length ? rel('provenance.json') : null,
    },
    steamTags: steamOk ? v.tags ?? [] : [],
    steamTagsEn: steamOk ? v.tagsEn ?? [] : [],
    ...(c.splitFrom ? { splitFrom: c.splitFrom } : {}),
  });
}

const byStatus = cases.reduce((m, x) => ((m[x.verifyStatus] = (m[x.verifyStatus] ?? 0) + 1), m), {});
const totalBytes = dirSize(PUBLIC_DIR);
const meta = {
  generatedAt: nowIso(),
  surveyRows,
  candidateRows: candidates.length,
  cases: cases.length,
  mergedDuplicates: candidates.length - cases.length,
  byStatus,
  withImages: cases.filter((x) => x.images.thumbs.length).length,
  withFullImages: cases.filter((x) => x.images.full.length).length,
  withAwards: cases.filter((x) => x.evidence.awards.length).length,
  imagesTotalBytes: totalBytes,
  imagesTotalMiB: mb(totalBytes),
  imageType: 'Steam 商店截图（未逐张核验是否为宣传合成图）',
  imageUsage: '本地学习参考，不再分发',
  sources: {
    candidates: 'src/content/cases/candidates.json',
    verify: 'src/content/cases/verify.json',
    awards: 'src/content/cases/awards.json',
    charts: charts ? `src/content/cases/charts.json（${charts.fetchedAt}）` : null,
    steampeek: steampeek ? `src/content/cases/steampeek.json（${steampeek.fetchedAt}）` : null,
    download: download ? `${download.finishedAt}，${download.totalMB} MiB（${download.totalBytes} 字节）` : null,
  },
  crossRef: {
    rule: '奖项名与案例名做大小写/标点无关的精确匹配；不行再做词边界前缀匹配（唯一命中才采用）；简称和版本差异用脚本里的 AWARD_ALIASES 人工表',
    exactMatches: crossRef.exact,
    aliasMatches: crossRef.alias,
    prefixMatches: crossRef.prefix,
    ambiguous: crossRef.ambiguous,
    unmatchedAwardEntries: crossRef.unmatched.length,
  },
  evidenceCheck: {
    note: '调研"入选依据"里写了某奖项年份，但在第二节奖项表里没对上的条目（多为 IGF 大奖/其他奖项，或年份写法不同）。只做提示，未修改数据。',
    items: evidenceCheck,
  },
};
writeJson(join(CONTENT_DIR, 'cases.json'), { meta, cases });
writeJson(join(CACHE_DIR, 'crossref-unmatched.json'), { unmatched: crossRef.unmatched });
console.log(JSON.stringify({ ...meta, crossRef: { ...meta.crossRef, aliasMatches: meta.crossRef.aliasMatches.length, prefixMatches: meta.crossRef.prefixMatches.length, ambiguous: meta.crossRef.ambiguous.length }, evidenceCheck: evidenceCheck.length }, null, 2));
