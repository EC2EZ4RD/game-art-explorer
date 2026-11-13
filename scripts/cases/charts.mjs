// 第 5 步：Steam 热销榜 / 热门愿望单快照（美区，各取过滤后的前 100）
//   https://store.steampowered.com/search/results/?query&start=N&count=50&filter=<f>&infinite=1&cc=us
//   从 results_html 里解析 data-ds-appid 和标题，再用 GetItems 查 type，去掉硬件、DLC 等非游戏条目。
// 输出：src/content/cases/charts.json
// 用法：node scripts/cases/charts.mjs
import { join } from 'node:path';
import { CONTENT_DIR, writeJson, fetchRetry, getItems, sleep, nowIso } from './lib.mjs';

const LISTS = { topsellers: '热销榜', popularwishlist: '热门愿望单' };
const WANT = 100;
const TYPE_NAMES = { 0: '游戏', 1: '试玩版', 2: 'Mod', 3: '电影', 4: 'DLC', 5: '原声', 6: '软件', 7: '视频', 8: '系列', 9: '剧集', 10: '硬件' };

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function parseRows(html) {
  const rows = [];
  // 每条结果是一个 <a ... class="search_result_row ..."> ... </a>
  for (const chunk of html.split(/<a\s+href="/).slice(1)) {
    if (!chunk.includes('search_result_row')) continue;
    const appidAttr = chunk.match(/data-ds-appid="([^"]*)"/)?.[1] ?? null;
    const bundle = chunk.match(/data-ds-bundleid="([^"]*)"/)?.[1] ?? null;
    const pkg = chunk.match(/data-ds-packageid="([^"]*)"/)?.[1] ?? null;
    const title = decode(chunk.match(/<span class="title">([^<]*)<\/span>/)?.[1] ?? '').trim();
    const release = decode(chunk.match(/<div class="search_released[^"]*">\s*([^<]*?)\s*<\/div>/)?.[1] ?? '').trim() || null;
    const ids = appidAttr ? appidAttr.split(',').map(Number) : [];
    rows.push({ appid: ids.length === 1 ? ids[0] : null, appids: ids, bundleid: bundle, packageid: pkg, title, release });
  }
  return rows;
}

const fetchedAt = nowIso();
const lists = {};
for (const [filter, label] of Object.entries(LISTS)) {
  const raw = [];
  let start = 0;
  let totalCount = null;
  const pages = [];
  while (start < 300) {
    const url = `https://store.steampowered.com/search/results/?query&start=${start}&count=50&filter=${filter}&infinite=1&cc=us`;
    const j = await fetchRetry(url);
    totalCount = j.total_count ?? totalCount;
    const rows = parseRows(j.results_html ?? '');
    pages.push({ start, rows: rows.length });
    rows.forEach((r) => raw.push({ steamRank: raw.length + 1, ...r }));
    start += 50;
    await sleep(1500);
    // 先抓 3 页（150 条），过滤掉非游戏后通常仍 ≥100
    if (raw.length >= 150 || rows.length === 0) break;
  }
  const appids = raw.filter((r) => r.appid).map((r) => r.appid);
  const en = await getItems(appids, { language: 'english' });
  await sleep(1200);
  const zh = await getItems(appids, { language: 'schinese' });
  await sleep(1200);
  const items = [];
  const excluded = [];
  for (const r of raw) {
    const it = r.appid ? en.get(r.appid) : null;
    const type = it?.success === 1 ? it.type : null;
    if (!r.appid || type !== 0) {
      excluded.push({ steamRank: r.steamRank, appid: r.appid, title: r.title, type, typeName: TYPE_NAMES[type] ?? (r.bundleid ? '捆绑包' : r.packageid ? '礼包' : '未知'), reason: !r.appid ? '非单个 app（捆绑包/礼包）' : '非游戏（硬件/DLC 等）' });
      continue;
    }
    if (items.length >= WANT) continue;
    const z = zh.get(r.appid);
    items.push({
      rank: items.length + 1,
      steamRank: r.steamRank,
      appid: r.appid,
      name: it.name,
      nameZh: z?.success === 1 && z.name !== it.name ? z.name : null,
      title: r.title,
      release: r.release,
      developers: (it.basic_info?.developers ?? []).map((d) => d.name),
    });
  }
  lists[filter] = {
    label,
    url: `https://store.steampowered.com/search/?filter=${filter}&cc=us`,
    totalCount,
    pages,
    count: items.length,
    items,
    excluded: excluded.filter((e) => e.steamRank <= (items.at(-1)?.steamRank ?? Infinity)),
  };
  console.log(`${filter}: raw ${raw.length}, kept ${items.length}, excluded (within range) ${lists[filter].excluded.length}, total_count ${totalCount}`);
}

writeJson(join(CONTENT_DIR, 'charts.json'), {
  fetchedAt,
  region: 'US（cc=us）',
  scopeNote: '热度信号，不代表美术质量',
  method: 'store.steampowered.com/search/results（infinite=1，按 start 翻页）解析 data-ds-appid；GetItems 的 type 字段过滤，只保留 type=0（游戏）',
  lists,
});
