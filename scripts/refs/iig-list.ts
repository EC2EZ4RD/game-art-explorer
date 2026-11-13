/*
 * Interface In Game（interfaceingame.com）收录的游戏名单 → 与 R1 候选清单对照。
 * 运行：npx tsx scripts/refs/iig-list.ts
 *
 * 该站用户条款禁止爬取（"spider, crawl, or scrape"），所以这里只用它公开给搜索引擎的
 * games-sitemap.xml（一次请求，已缓存在 qa/refs-cache/iig/）得到游戏名单与链接，
 * 不抓游戏页、不下载截图；看图请人工打开链接。
 * 名称由网址 slug 还原（近似），再按归一化名称对照 R1 候选（含候选池），对上的继承 R1 的 Steam appid、档位与品类。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SITEMAP = join(ROOT, 'qa', 'refs-cache', 'iig', 'games-sitemap.xml');
const OUT = join(ROOT, 'docs', 'survey', 'data', 'iig-games.json');

interface Cand { key: string; appid: number | null; name: string; evidence: { tier: string }; genres?: { primary: string | null } }

const norm = (s: string) => s.toLowerCase()
  .replace(/['’]/g, '')
  .replace(/\(.*?\)/g, ' ')
  .replace(/[™®©:'’!?.,\-–—_/&+]/g, ' ')
  .replace(/\b(the|a|an|of|edition|definitive|remastered|game of the year|goty|director s cut|hd)\b/g, ' ')
  .replace(/\b(\d+)\b/g, ' $1 ')
  .replace(/\s+/g, ' ').trim();
const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const key = (s: string) => norm(s).split(' ').map((w) => ROMAN[w] ?? w).join(' ');

const xml = readFileSync(SITEMAP, 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/games\/[^/]+\/$/.test(u));
const lastmod = new Map([...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));

const read = (f: string) => JSON.parse(readFileSync(join(ROOT, 'docs', 'survey', 'data', f), 'utf8'));
// 候选池（没进清单的 Steam 游戏）只有 appid / 名称 / 标签
const pool = (read('ui-ref-candidates.pool.json') as { games: { appid: number; name: string }[] }).games
  .map((g): Cand => ({ key: `app:${g.appid}`, appid: g.appid, name: g.name, evidence: { tier: '-' } }));
const cands = [...(read('ui-ref-candidates.json') as { candidates: Cand[] }).candidates.map((c) => ({ ...c, inList: true })), ...pool.map((c) => ({ ...c, inList: false }))];
const byKey = new Map<string, (Cand & { inList: boolean })>();
for (const c of cands) if (!byKey.has(key(c.name))) byKey.set(key(c.name), c);

/** 没对上 R1 的，用 Steam 商店搜索补 appid（与 R1 收集脚本共用缓存 qa/refs-cache/store_search_*.json；只接受归一化后完全相同的名称） */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function storeSearch(term: string): Promise<{ id: number; name: string; type: string }[]> {
  const f = join(ROOT, 'qa', 'refs-cache', `${`store_search_${term}`.replace(/[^\w.-]+/g, '_').slice(0, 120)}.json`);
  if (existsSync(f)) return (JSON.parse(readFileSync(f, 'utf8')).items ?? []);
  await sleep(400);
  try {
    const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=us&l=en`, { headers: { 'User-Agent': 'game-art-explorer-research/0.1' } });
    const j = await r.json() as { items?: { id: number; name: string; type: string }[] };
    writeFileSync(f, JSON.stringify(j));
    return j.items ?? [];
  } catch { return []; }
}

const games = urls.map((url) => {
  const slug = url.split('/').filter(Boolean).pop()!;
  const name = slug.split('-').map((w) => (w.length <= 2 && /^[ivx]+$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
  const k = key(slug.replace(/-/g, ' '));
  // 精确对上；或 slug 去掉末尾的年份 / 平台后缀再对
  const c = byKey.get(k) ?? byKey.get(k.replace(/ (\d{4}|remake|remaster|reboot)$/, ''));
  return {
    slug, url, name,
    lastmod: lastmod.get(url) ?? null,
    r1: c ? { key: c.key, name: c.name, appid: c.appid, tier: c.evidence.tier, primary: c.genres?.primary ?? null, inList: c.inList } : null,
  };
});

const steamOnly: Record<string, { appid: number; name: string }> = {};
for (const g of games.filter((x) => !x.r1)) {
  const items = (await storeSearch(g.name)).filter((x) => x.type === 'app');
  const hit = items.find((x) => key(x.name) === key(g.name));
  if (hit) steamOnly[g.slug] = { appid: hit.id, name: hit.name };
}
const out = games.map((g) => ({ ...g, steam: g.r1?.appid ? null : steamOnly[g.slug] ?? null }));

const matched = games.filter((g) => g.r1);
const summary = {
  source: 'https://interfaceingame.com/games-sitemap.xml（只用名单与链接；该站条款禁止爬取）',
  total: games.length,
  matchedR1: matched.filter((g) => g.r1!.inList).length,
  matchedPoolOnly: matched.filter((g) => !g.r1!.inList).length,
  steamOnly: Object.keys(steamOnly).length,
  unmatched: games.length - matched.length - Object.keys(steamOnly).length,
};
writeFileSync(OUT, JSON.stringify({ summary, games: out }, null, 1));
console.log(summary);
console.log('unmatched sample:', out.filter((g) => !g.r1 && !g.steam).slice(0, 30).map((g) => g.name).join(' | '));
