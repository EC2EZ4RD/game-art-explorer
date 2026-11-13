// 第 2 步：用 Steam 官方接口核验候选 appid
//   - IStoreBrowseService/GetItems：每批 50 个，schinese + english 各查一次（中文名/中文标签 + 英文名用于比对）
//   - storesearch：(SP)/待核验/名称对不上的条目按名字反查
// 输入 src/content/cases/candidates.json；输出 src/content/cases/verify.json 与 scripts/cases/cache/getitems.json
// 用法：node scripts/cases/verify.mjs
import { join } from 'node:path';
import {
  CONTENT_DIR, CACHE_DIR, readJson, writeJson, sleep, today, nowIso,
  getItems, getTagList, storeSearch, nameMatch, splitName, unixToDate,
} from './lib.mjs';

/**
 * 人工复核表：只用于"Steam 接口返回的 appid/名称是否接受"这类判断，appid 本身必须来自 Steam 接口。
 * key = 调研表里的名称。accept = 接受 GetItems 返回的这个 appid（名称写法不同但确为同一作品）。
 */
const MANUAL = {
  // 运行后根据输出补充，例如：
  // 'Overwatch': { accept: 2357570, note: 'Steam 商店名为 Overwatch® 2 / Overwatch' },
};

const SEARCH_DELAY = 1200;
const { candidates } = readJson(join(CONTENT_DIR, 'candidates.json'));

const numericIds = [...new Set(candidates.map((c) => c.surveyAppid).filter(Boolean))];
console.log(`GetItems for ${numericIds.length} appids (schinese + english)...`);
const zh = await getItems(numericIds, { language: 'schinese' });
await sleep(1200);
const en = await getItems(numericIds, { language: 'english' });
await sleep(1200);
const tagZh = await getTagList('schinese');
await sleep(800);
const tagEn = await getTagList('english');

const searchLog = [];
async function searchByName(name) {
  const { latin, cjk } = splitName(name);
  const tries = [];
  if (latin) tries.push({ term: latin, l: 'english', cc: 'US' });
  if (cjk) tries.push({ term: cjk, l: 'schinese', cc: 'CN' });
  for (const t of tries) {
    await sleep(SEARCH_DELAY);
    let items = [];
    try {
      items = await storeSearch(t.term, { l: t.l, cc: t.cc });
    } catch (e) {
      searchLog.push({ name, ...t, error: e.message });
      continue;
    }
    const scored = items
      .map((it) => ({ id: it.id, name: it.name, type: it.type, m: nameMatch(name, it.name, it.name) }))
      .filter((x) => x.m.ok)
      .sort((a, b) => (b.m.exact - a.m.exact) || (b.m.cov - a.m.cov) || (b.m.rev - a.m.rev));
    searchLog.push({ name, ...t, returned: items.map((i) => `${i.id}:${i.name}`).slice(0, 8), picked: scored[0] ? `${scored[0].id}:${scored[0].name}` : null });
    if (scored.length) return { best: scored[0], all: scored.slice(0, 5), term: t };
  }
  return null;
}

const results = [];
for (const [index, c] of candidates.entries()) {
  const r = {
    index,
    name: c.name,
    group: c.group,
    surveyAppid: c.surveyAppid,
    marker: c.marker,
    appid: null,
    status: null,
    method: [],
    note: null,
  };
  results.push(r);
  if (c.marker === 'non-steam') {
    r.status = 'non-steam';
    r.note = '调研表标注不在 Steam 上（—）';
    continue;
  }
  const manual = MANUAL[c.name];
  let itemOk = false;
  let match = null;
  if (c.surveyAppid) {
    const ie = en.get(c.surveyAppid);
    const iz = zh.get(c.surveyAppid);
    itemOk = ie?.success === 1;
    r.method.push('GetItems');
    if (itemOk) match = nameMatch(c.name, ie.name, iz?.name);
    if (itemOk && manual?.accept === c.surveyAppid) {
      r.appid = c.surveyAppid;
      r.status = 'verified';
      r.note = `人工复核：${manual.note}`;
      continue;
    }
    if (itemOk && match.ok && c.marker !== 'SP') {
      r.appid = c.surveyAppid;
      r.status = 'verified';
      continue;
    }
  }
  // (SP) / 待核验 / 名称对不上 / GetItems 查不到 → 按名字搜索
  const found = await searchByName(c.name);
  r.method.push('storesearch');
  if (found) r.search = { term: found.term.term, l: found.term.l, cc: found.term.cc, picked: { id: found.best.id, name: found.best.name }, alternatives: found.all.slice(1).map((x) => ({ id: x.id, name: x.name })) };
  if (c.surveyAppid && itemOk && match.ok) {
    // SP 条目：GetItems 已确认名称；搜索结果仅作佐证
    r.appid = c.surveyAppid;
    r.status = 'verified';
    r.note = found?.best.id === c.surveyAppid ? 'SP 标记：GetItems 名称一致，storesearch 结果一致' : `SP 标记：GetItems 名称一致${found ? `；storesearch 首选为 ${found.best.id}（${found.best.name}），未采用` : '；storesearch 无匹配'}`;
    continue;
  }
  if (found) {
    if (found.best.id === c.surveyAppid) {
      r.appid = c.surveyAppid;
      r.status = 'verified';
      r.note = '名称写法与 Steam 不同，但 storesearch 指向同一 appid';
    } else {
      r.appid = found.best.id;
      r.status = 'corrected';
      const was = c.surveyAppid
        ? `调研 appid ${c.surveyAppid}${itemOk ? ` 在 Steam 上是「${en.get(c.surveyAppid).name}」` : ' 在 GetItems 查不到'}`
        : `调研表为「${c.appidCell}」`;
      r.note = `${was}；按名称搜索改为 ${found.best.id}（${found.best.name}）`;
    }
    continue;
  }
  r.status = 'not-found';
  r.note = c.surveyAppid
    ? `调研 appid ${c.surveyAppid}${itemOk ? ` 在 Steam 上是「${en.get(c.surveyAppid).name}」，名称不符` : ' 在 GetItems 查不到'}；按名称搜索无匹配`
    : `调研表为「${c.appidCell}」；按名称搜索无匹配`;
  if (c.surveyAppid && itemOk) r.mismatchSteamName = en.get(c.surveyAppid).name;
}

// 改正后的新 appid 需要补查详情
const newIds = [...new Set(results.map((r) => r.appid).filter((id) => id && !en.has(id)))];
if (newIds.length) {
  console.log(`GetItems for ${newIds.length} corrected appids...`);
  await sleep(1200);
  for (const [k, v] of await getItems(newIds, { language: 'schinese' })) zh.set(k, v);
  await sleep(1200);
  for (const [k, v] of await getItems(newIds, { language: 'english' })) en.set(k, v);
}

const verifiedAt = today();
for (const r of results) {
  if (!r.appid) continue;
  const ie = en.get(r.appid);
  const iz = zh.get(r.appid);
  if (ie?.success !== 1) {
    r.note = `${r.note ?? ''}（GetItems 未返回详情）`.trim();
    continue;
  }
  const tags = (ie.tags ?? []).slice().sort((a, b) => b.weight - a.weight).map((t) => t.tagid);
  Object.assign(r, {
    verifiedAt,
    steamName: ie.name,
    steamNameZh: iz?.name && iz.name !== ie.name ? iz.name : null,
    type: ie.type, // 0=游戏 4=DLC 10=硬件
    developers: (ie.basic_info?.developers ?? []).map((d) => d.name),
    publishers: (ie.basic_info?.publishers ?? []).map((d) => d.name),
    releaseDate: unixToDate(ie.release?.steam_release_date ?? ie.release?.original_release_date),
    comingSoon: Boolean(ie.release?.is_coming_soon),
    tagIds: tags,
    tags: tags.map((t) => tagZh.get(t)).filter(Boolean),
    tagsEn: tags.map((t) => tagEn.get(t)).filter(Boolean),
  });
}

const counts = results.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
writeJson(join(CONTENT_DIR, 'verify.json'), {
  verifiedAt,
  generatedAt: nowIso(),
  endpoints: [
    'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/ (context schinese/US 与 english/US)',
    'https://store.steampowered.com/api/storesearch/ (l=english&cc=US；纯中文名用 l=schinese&cc=CN)',
    'https://api.steampowered.com/IStoreService/GetTagList/v1/',
  ],
  counts,
  results,
  searchLog,
});
// 供截图兜底使用的原始条目
const cache = {};
for (const [id, it] of zh) if (it?.success === 1) cache[id] = { zh: it, en: en.get(id) };
writeJson(join(CACHE_DIR, 'getitems.json'), { fetchedAt: nowIso(), items: cache });

console.log('counts', counts);
for (const r of results.filter((r) => r.status === 'corrected' || r.status === 'not-found' || (r.note && r.status === 'verified'))) {
  console.log(`[${r.status}] ${r.group} ${r.name} :: ${r.note}`);
}
