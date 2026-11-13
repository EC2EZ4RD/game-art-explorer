// 第 6 步：SteamPeek 相似游戏（每个种子只抓第一页，约 36 条）
//   https://steampeek.hu/?appid=<id>  服务端直出 HTML；页面文字只当数据解析，不执行其中任何内容。
// 输出：src/content/cases/steampeek.json
// 用法：node scripts/cases/steampeek.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, writeJson, fetchRetry, sleep, nowIso } from './lib.mjs';

const SEEDS = [
  { appid: 1055540, name: 'A Short Hike', style: '低多边形 + 像素化后处理' },
  { appid: 1291340, name: 'Townscaper', style: '程序化微缩小镇' },
  { appid: 587620, name: 'Okami HD', style: '水墨 / 浮世绘' },
  { appid: 653530, name: 'Return of the Obra Dinn', style: '1-bit 抖色' },
  { appid: 1167630, name: 'Teardown', style: '体素' },
  { appid: 683320, name: 'GRIS', style: '水彩' },
  { appid: 1145360, name: 'Hades', style: '绘画感三维 + 强描边' },
  { appid: 921570, name: 'OCTOPATH TRAVELER', style: 'HD-2D' },
  { appid: 1262350, name: 'SIGNALIS', style: 'PS1 复古三维' },
  { appid: 757310, name: 'Sable', style: '墨比斯式线稿' },
  { appid: 553420, name: 'TUNIC', style: '卡通分阶三维' },
  { appid: 1161170, name: 'The Rewinder（山海旅人）', style: '像素表现水墨' },
];

// --charts：把榜单上的作品（cases.json 里有 evidence.charts 的）也作为种子，结果并入现有 steampeek.json
const WITH_CHARTS = process.argv.includes('--charts');
const OUT = join(CONTENT_DIR, 'steampeek.json');
let seedList = SEEDS;
if (WITH_CHARTS) {
  const cases = JSON.parse(readFileSync(join(CONTENT_DIR, 'cases.json'), 'utf8')).cases;
  seedList = cases
    .filter((c) => c.appid && (c.evidence?.charts ?? []).length)
    .map((c) => ({ appid: c.appid, name: c.name, style: `榜单：${c.evidence.charts.map((x) => `${x.label}#${x.rank}`).join('、')}`, fromChart: true }));
}

const decode = (s) =>
  String(s ?? '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, '')));

function parseArticle(chunk) {
  const head = chunk.slice(0, chunk.indexOf('>') + 1);
  const attr = (k) => head.match(new RegExp(`data-${k}="([^"]*)"`))?.[1];
  const visible = chunk.split('lister_item_info_details_more')[0]; // 之后是转义过的详情，不解析
  const rating = visible.match(/class="app_sprating[^"]*"[^>]*>([^<]*)</)?.[1]?.trim() ?? null;
  const votes = visible.match(/ratepos"><\/i>\s*([\d,]+)[\s\S]*?rateneg"><\/i>\s*([\d,]+)/);
  const release = visible.match(/class="lister_item_data_release"[^>]*title="([^"]*)"/)?.[1] ?? null;
  const score = attr('score');
  return {
    appid: num(attr('appid')),
    name: decode(attr('appname')),
    rs: score && score !== 'na' ? Math.round(Number(score) * 1000) / 1000 : null,
    steamPeekRating: rating && rating !== 'N/A' ? Number(rating) : null,
    steamPositive: votes ? num(votes[1]) : null,
    steamNegative: votes ? num(votes[2]) : null,
    release: decode(release) || null,
    tags: [...visible.matchAll(/data-tagname="([^"]*)"/g)].map((m) => decode(m[1])),
  };
}

const fetchedAt = nowIso();
const seeds = [];
const failures = [];
for (const seed of seedList) {
  const url = `https://steampeek.hu/?appid=${seed.appid}`;
  try {
    const html = await fetchRetry(url, { as: 'text', baseDelay: 5000, tries: 4 });
    const updatedOn = html.match(/<time datetime="([^"]+)"/)?.[1] ?? null;
    const totalFound = num(html.match(/<i>([\d,]+)<\/i>\s*games found/)?.[1]);
    const articles = html.split(/<article class="lister_item_cont/).slice(1);
    const requested = articles.find((a) => a.slice(0, 200).includes('requested_lister_item'));
    const seedInfo = requested ? parseArticle(requested) : null;
    const related = articles
      .filter((a) => !a.slice(0, 200).includes('requested_lister_item'))
      .map(parseArticle)
      .filter((x) => x.appid && x.appid !== seed.appid)
      .map((x, i) => ({ rank: i + 1, ...x }));
    seeds.push({
      seed: seed.appid,
      name: seed.name,
      style: seed.style,
      fromChart: !!seed.fromChart,
      fetchedAt: nowIso(),
      url,
      updatedOn,
      totalFound,
      seedTags: seedInfo?.tags ?? [],
      seedRating: seedInfo?.steamPeekRating ?? null,
      related,
    });
    console.log(`${seed.name}: ${related.length} related (total ${totalFound}, updated ${updatedOn})`);
  } catch (e) {
    failures.push({ seed: seed.appid, url, error: e.message });
    console.warn(`${seed.name}: FAILED ${e.message}`);
  }
  await sleep(2500);
}

// 合并：按种子 appid 覆盖或追加，保留之前抓过的其他种子
const prev = WITH_CHARTS && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
const merged = prev ? [...prev.seeds.filter((s) => !seeds.some((n) => n.seed === s.seed)), ...seeds] : seeds;
writeJson(OUT, {
  fetchedAt: prev?.fetchedAt ?? fetchedAt,
  chartsFetchedAt: WITH_CHARTS ? fetchedAt : prev?.chartsFetchedAt,
  source: 'https://steampeek.hu/ （第三方相似游戏推荐，主要按标签相似度；只取第一页）',
  note: 'rs = SteamPeek 页面上的相似度分数（data-score）；steamPeekRating 为 SteamPeek 评分（N/A 记为 null）。推荐基于标签，和美术风格相近的只占一部分，需要人工看图筛选。fromChart = 种子来自热销/愿望单榜单。',
  seeds: merged,
  failures: [...(prev?.failures ?? []).filter((f) => !seeds.some((n) => n.seed === f.seed)), ...failures],
});
