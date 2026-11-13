// 第 3 步：为每个已核验的 Steam 案例取得截图地址（header + 截图缩略图/原图）
//   优先复用另一个项目已抓好的 appdetails 原始响应（只读），否则请求
//   https://store.steampowered.com/api/appdetails?appids=<id>&l=schinese（一次一个，间隔约 1.3 秒）。
//   appdetails 失败时退回 GetItems 的截图文件名（scripts/cases/cache/getitems.json）。
// 输出：scripts/cases/cache/screens.json（可续跑：已有的 appid 不再请求）
// 用法：node scripts/cases/screens.mjs [--refresh]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, CACHE_DIR, RAW_REUSE_DIR, readJson, writeJson, fetchRetry, sleep, nowIso } from './lib.mjs';

const DELAY = 1500;
const CDN = 'https://shared.akamai.steamstatic.com/store_item_assets/';
const refresh = process.argv.includes('--refresh');

const verify = readJson(join(CONTENT_DIR, 'verify.json'));
const getitems = readJson(join(CACHE_DIR, 'getitems.json'), { items: {} }).items;
const outPath = join(CACHE_DIR, 'screens.json');
const out = refresh ? { apps: {} } : readJson(outPath, { apps: {} });

const appids = [...new Set(verify.results.filter((r) => r.appid && (r.status === 'verified' || r.status === 'corrected')).map((r) => r.appid))];
console.log(`${appids.length} steam appids; cached ${Object.keys(out.apps).length}`);

function fromAppdetails(data) {
  return {
    name: data.name,
    header: data.header_image ?? null,
    screenshots: (data.screenshots ?? []).map((s) => ({ thumb: s.path_thumbnail, full: s.path_full })),
  };
}

function fromGetItems(id) {
  const it = getitems[id]?.zh;
  if (!it) return null;
  const fmt = it.assets?.asset_url_format; // steam/apps/<id>/${FILENAME}?t=...
  const header = fmt && it.assets?.header ? CDN + fmt.replace('${FILENAME}', it.assets.header) : null;
  const shots = (it.screenshots?.all_ages_screenshots ?? []).slice().sort((a, b) => a.ordinal - b.ordinal);
  return {
    name: it.name,
    header,
    screenshots: shots.map((s) => {
      const [path, q] = s.filename.split('?');
      const base = CDN + path.replace(/\.jpg$/, '');
      return { thumb: `${base}.600x338.jpg${q ? '?' + q : ''}`, full: `${base}.1920x1080.jpg${q ? '?' + q : ''}` };
    }),
  };
}

let fetched = 0;
let reused = 0;
let fallback = 0;
const failed = [];
for (const [i, id] of appids.entries()) {
  if (out.apps[id] && !refresh) continue;
  const rawPath = RAW_REUSE_DIR ? join(RAW_REUSE_DIR, String(id), 'details_us.json') : '';
  if (rawPath && existsSync(rawPath)) {
    const raw = readJson(rawPath);
    const data = raw?.data?.[id]?.data;
    if (raw?.data?.[id]?.success && data) {
      out.apps[id] = { ...fromAppdetails(data), source: 'reuse', sourceUrl: raw.source_url, fetchedAt: raw.collected_at_utc };
      reused++;
      continue;
    }
  }
  const url = `https://store.steampowered.com/api/appdetails?appids=${id}&l=schinese`;
  let rec = null;
  try {
    const j = await fetchRetry(url, { baseDelay: 10000, tries: 6 });
    const entry = j?.[id];
    if (entry?.success && entry.data) rec = { ...fromAppdetails(entry.data), source: 'appdetails', sourceUrl: url, fetchedAt: nowIso() };
  } catch (e) {
    console.warn(`  appdetails ${id} failed: ${e.message}`);
  }
  if (!rec || !rec.screenshots.length) {
    const g = fromGetItems(id);
    if (g && (g.screenshots.length || g.header)) {
      rec = { ...g, source: 'getitems', sourceUrl: 'IStoreBrowseService/GetItems', fetchedAt: readJson(join(CACHE_DIR, 'getitems.json')).fetchedAt, note: rec ? 'appdetails 无截图，改用 GetItems' : 'appdetails 失败，改用 GetItems' };
      fallback++;
    }
  }
  if (rec) {
    out.apps[id] = rec;
    fetched++;
  } else failed.push(id);
  if (fetched % 20 === 0) writeJson(outPath, { updatedAt: nowIso(), ...out });
  process.stdout.write(`\r  ${i + 1}/${appids.length} fetched=${fetched} reused=${reused} fallback=${fallback} failed=${failed.length}   `);
  await sleep(DELAY);
}
out.updatedAt = nowIso();
out.failed = failed;
writeJson(outPath, out);
console.log(`\ndone: fetched=${fetched} reused=${reused} getitems-fallback=${fallback} failed=${failed.length}`, failed);
