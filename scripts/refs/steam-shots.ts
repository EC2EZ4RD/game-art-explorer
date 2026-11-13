/*
 * Interface In Game 名单里能对上 Steam 的游戏 → Steam 商店截图列表（代替抓 IIG 的截图：该站条款禁止爬取）。
 * 运行：npx tsx scripts/refs/steam-shots.ts [--per=6]
 * 输入：docs/survey/data/iig-games.json（iig-list.ts 生成）
 * 输出：qa/refs-cache/steam/shots.json = [{ appid, name, iig, thumbs: [600x338 缩略图地址] }]
 * 截图列表优先用案例库已缓存的 scripts/cases/cache/screens.json，其余调 Steam appdetails（每 1.5 秒一次，缓存）。
 * 之后：build-lists.py → 把 qa/refs-cache/lists/steam-iig.json 里的缩略图存到 qa/refs-cache/steam/img/<id>.jpg（仓库不带下载脚本）→ sheets.py steam-iig
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'qa', 'refs-cache', 'steam');
mkdirSync(DIR, { recursive: true });
const PER = Number(process.argv.find((a) => a.startsWith('--per='))?.split('=')[1] ?? 6);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface IigGame { slug: string; url: string; name: string; r1: { appid: number | null; name: string } | null; steam: { appid: number; name: string } | null }
const iig = (JSON.parse(readFileSync(join(ROOT, 'docs', 'survey', 'data', 'iig-games.json'), 'utf8')) as { games: IigGame[] }).games;
const casePath = join(ROOT, 'scripts', 'cases', 'cache', 'screens.json');
const caseScreens: Record<string, { name?: string; screenshots?: { thumb: string }[] }> = existsSync(casePath) ? JSON.parse(readFileSync(casePath, 'utf8')).apps : {};

let last = 0;
async function appdetails(appid: number): Promise<{ name: string; thumbs: string[] } | null> {
  const f = join(DIR, `appdetails_${appid}.json`);
  let j: any;
  if (existsSync(f)) j = JSON.parse(readFileSync(f, 'utf8'));
  else {
    for (let attempt = 0; attempt < 3 && !j; attempt++) {
      const wait = last + 1500 - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`, { headers: { 'User-Agent': 'game-art-explorer-research/0.1' }, signal: AbortSignal.timeout(30_000) });
        if (r.status === 429) { await sleep(60_000); continue; }
        j = await r.json();
        writeFileSync(f, JSON.stringify(j));
      } catch { await sleep(5000); }
    }
  }
  const d = j?.[appid]?.data;
  if (!d) return null;
  return { name: d.name, thumbs: (d.screenshots ?? []).map((s: { path_thumbnail: string }) => s.path_thumbnail) };
}

const out: { appid: number; name: string; iig: string; thumbs: string[] }[] = [];
let n = 0;
for (const g of iig) {
  const appid = g.r1?.appid ?? g.steam?.appid;
  if (!appid) continue;
  const cached = caseScreens[appid];
  const info = cached?.screenshots?.length ? { name: cached.name ?? g.name, thumbs: cached.screenshots.map((s) => s.thumb) } : await appdetails(appid);
  if (info?.thumbs.length) out.push({ appid, name: info.name, iig: g.url, thumbs: info.thumbs.slice(0, PER) });
  if (++n % 50 === 0) console.log(`  ${n} apps`);
}
writeFileSync(join(DIR, 'shots.json'), JSON.stringify(out, null, 1));
console.log(`steam shots: ${out.length} apps, ${out.reduce((s, a) => s + a.thumbs.length, 0)} thumbs`);
