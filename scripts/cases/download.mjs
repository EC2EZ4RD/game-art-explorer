// 第 4 步：下载 Steam 官方 CDN 截图到 public/cases/<appid>/（本地学习参考，不再分发）
//   header.jpg、t1–t4.jpg（截图 0–3 的 600x338 缩略图）、f1.jpg（截图 0 原图）、f2.jpg（截图 2 原图，没有就用 1）
//   分三轮：①header+缩略图 ②全部 f1 ③f2（有奖项依据的案例优先），总量超过预算就停止下载原图。
//   已存在的文件跳过（可续跑）；每个目录写 provenance.json。
// 用法：node scripts/cases/download.mjs [--budget-mb=295] [--concurrency=4] [--phases=1,2,3]
import { existsSync, writeFileSync, renameSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, CACHE_DIR, PUBLIC_DIR, readJson, writeJson, fetchRetry, sleep, nowIso, dirSize, mb } from './lib.mjs';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? Number(a.split('=')[1]) : d;
};
const BUDGET = arg('budget-mb', 295) * 1024 * 1024;
const CONCURRENCY = arg('concurrency', 4);
const PHASES = ((process.argv.find((x) => x.startsWith('--phases=')) ?? '--phases=1,2,3').split('=')[1]).split(',').map(Number);
const EST_FULL = 650 * 1024; // 预估一张 1920x1080 原图的大小，用于预算判断

const IMAGE_TYPE = 'Steam 商店截图（未逐张核验是否为宣传合成图）';
const USAGE = '本地学习参考，不再分发';

const { candidates } = readJson(join(CONTENT_DIR, 'candidates.json'));
const verify = readJson(join(CONTENT_DIR, 'verify.json'));
const screens = readJson(join(CACHE_DIR, 'screens.json')).apps;

// appid → 是否有奖项依据（调研文字里出现 IGF/BAFTA/TGA）
const apps = new Map();
for (const r of verify.results) {
  if (!r.appid || !(r.status === 'verified' || r.status === 'corrected')) continue;
  const c = candidates[r.index];
  const prio = /IGF|BAFTA|TGA/.test(c.evidence) ? 1 : 0;
  const prev = apps.get(r.appid);
  apps.set(r.appid, { appid: r.appid, name: r.steamName ?? c.name, prio: Math.max(prio, prev?.prio ?? 0) });
}

function planFor(appid) {
  const s = screens[appid];
  if (!s) return { p1: [], p2: [], p3: [] };
  const shots = s.screenshots ?? [];
  const p1 = [];
  if (s.header) p1.push({ file: 'header.jpg', url: s.header, kind: 'header（商店头图 460x215）' });
  shots.slice(0, 4).forEach((x, i) => p1.push({ file: `t${i + 1}.jpg`, url: x.thumb, kind: '截图缩略图 600x338', screenshotIndex: i }));
  const p2 = shots[0] ? [{ file: 'f1.jpg', url: shots[0].full, kind: '截图原图 1920x1080', screenshotIndex: 0 }] : [];
  const idx2 = shots[2] ? 2 : shots[1] ? 1 : null;
  const p3 = idx2 != null ? [{ file: 'f2.jpg', url: shots[idx2].full, kind: '截图原图 1920x1080', screenshotIndex: idx2 }] : [];
  return { p1, p2, p3 };
}

const provCache = new Map();
function provenance(appid) {
  if (provCache.has(appid)) return provCache.get(appid);
  const path = join(PUBLIC_DIR, String(appid), 'provenance.json');
  const s = screens[appid];
  const base = existsSync(path) ? readJson(path) : {};
  const p = {
    appid,
    name: apps.get(appid)?.name ?? s?.name,
    sourcePage: `https://store.steampowered.com/app/${appid}/`,
    imageType: IMAGE_TYPE,
    usage: USAGE,
    screenshotListSource: { method: s?.source, url: s?.sourceUrl, fetchedAt: s?.fetchedAt, note: s?.note },
    fetchedAt: base.fetchedAt ?? null,
    files: base.files ?? {},
  };
  provCache.set(appid, p);
  return p;
}
const FILE_ORDER = ['header.jpg', 't1.jpg', 't2.jpg', 't3.jpg', 't4.jpg', 'f1.jpg', 'f2.jpg'];
function saveProvenance(appid) {
  const p = provenance(appid);
  const files = Object.fromEntries(Object.entries(p.files).sort(([a], [b]) => FILE_ORDER.indexOf(a) - FILE_ORDER.indexOf(b)));
  writeJson(join(PUBLIC_DIR, String(appid), 'provenance.json'), { ...p, files });
}

let total = dirSize(PUBLIC_DIR);
console.log(`start: public/cases = ${mb(total)} MB, budget ${mb(BUDGET)} MB, ${apps.size} apps`);
const stats = { downloaded: 0, skippedExisting: 0, skippedBudget: 0, failed: [] };

async function runTasks(tasks, { budgeted }) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const t = tasks[next++];
      const dir = join(PUBLIC_DIR, String(t.appid));
      const dest = join(dir, t.file);
      const prov = provenance(t.appid);
      if (existsSync(dest) && statSync(dest).size > 0) {
        stats.skippedExisting++;
        if (!prov.files[t.file]) {
          prov.files[t.file] = { url: t.url, kind: t.kind, screenshotIndex: t.screenshotIndex, bytes: statSync(dest).size, fetchedAt: null, note: '文件已存在，未重新下载' };
          saveProvenance(t.appid);
        }
        continue;
      }
      if (budgeted && total + EST_FULL > BUDGET) {
        stats.skippedBudget++;
        continue;
      }
      try {
        const { buf, contentType } = await fetchRetry(t.url, { as: 'buffer', baseDelay: 2000, tries: 4, log: false });
        if (!/image\//.test(contentType) || buf.length < 1000) throw new Error(`not an image (${contentType}, ${buf.length} B)`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(dest + '.part', buf);
        renameSync(dest + '.part', dest);
        total += buf.length;
        stats.downloaded++;
        const at = nowIso();
        prov.files[t.file] = { url: t.url, kind: t.kind, screenshotIndex: t.screenshotIndex, bytes: buf.length, fetchedAt: at };
        prov.fetchedAt = prov.fetchedAt ?? at;
        saveProvenance(t.appid);
      } catch (e) {
        stats.failed.push({ appid: t.appid, file: t.file, url: t.url, error: e.message });
      }
      if ((stats.downloaded + stats.skippedExisting) % 25 === 0) {
        process.stdout.write(`\r  downloaded=${stats.downloaded} existing=${stats.skippedExisting} budgetSkip=${stats.skippedBudget} failed=${stats.failed.length} total=${mb(total)} MB   `);
      }
      await sleep(120);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const appList = [...apps.values()];
const plans = new Map(appList.map((a) => [a.appid, planFor(a.appid)]));
const withApp = (a, list) => list.map((t) => ({ ...t, appid: a.appid }));

console.log('phase 1: header + thumbnails');
if (PHASES.includes(1)) await runTasks(appList.flatMap((a) => withApp(a, plans.get(a.appid).p1)), { budgeted: false });
console.log(`\nphase 2: f1 (full size, index 0) — total so far ${mb(total)} MB`);
const byPrio = [...appList].sort((a, b) => b.prio - a.prio);
if (PHASES.includes(2)) await runTasks(byPrio.flatMap((a) => withApp(a, plans.get(a.appid).p2)), { budgeted: true });
console.log(`\nphase 3: f2 (full size, index 2) — total so far ${mb(total)} MB`);
if (PHASES.includes(3)) await runTasks(byPrio.flatMap((a) => withApp(a, plans.get(a.appid).p3)), { budgeted: true });

// 给所有 app 目录写一次 provenance（含没有新下载的）
for (const a of appList) if (existsSync(join(PUBLIC_DIR, String(a.appid)))) saveProvenance(a.appid);

const finalSize = dirSize(PUBLIC_DIR);
const noScreens = appList.filter((a) => !screens[a.appid]).map((a) => a.appid);
const report = {
  finishedAt: nowIso(),
  budgetMB: mb(BUDGET),
  totalMB: mb(finalSize),
  totalBytes: finalSize,
  apps: appList.length,
  appsWithoutScreenshotList: noScreens,
  ...stats,
};
writeJson(join(CACHE_DIR, 'download-report.json'), report);
console.log(`\ndone: ${JSON.stringify({ ...report, failed: report.failed.length })}`);
if (stats.failed.length) console.log('failed sample', stats.failed.slice(0, 10));
