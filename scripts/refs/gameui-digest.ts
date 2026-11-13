/*
 * GameUI.net 元数据 → 统计摘要（scripts/refs/gameui-collect.ts 的输出）。
 * 运行：npx tsx scripts/refs/gameui-digest.ts
 * 输出：docs/survey/data/gameui-digest.json（完整统计）、qa/refs-cache/gameui/digest.md（给人看的精简版）
 * 全部是计数与排序，不调用模型。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'qa', 'refs-cache', 'gameui');
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

interface Game { id: number; name: string; hash: string; style: string | null; device: string | null; era: string | null; orientation: string | null; tags: string[] | null; praise: number | null; see: number | null; collect_num: number | null; total_image_count: number | null; category: { id: number; name: string } | null }
interface Work { id: number; name: string; hash: string; praise: number | null; see: number | null; collect_num: number | null; total_image_count: number | null; video_url: string | null; tags: string[] | null; createdAt: string; category: { id: number; name: string } | null }
interface Img { id: number; content: string; width: number; height: number; tags: string[] | null; article: { id: number; name: string; style: string | null; device: string | null; category_id: number | null; tags: string[] | null } | null }
interface FilterList { name: string; field: string; list: { id: number; name: string; num: number }[] | null }

const { counts, filters, categories } = read<{ counts: { games: number; images: number }; filters: FilterList[]; categories: { id: number; name: string; parent_id: number }[] }>('filters.json');
const games = read<Game[]>('games.json');
const works = read<Work[]>('works.json');
const mat = read<Record<string, Img[]>>('material-samples.json');
const fun = read<Record<string, Img[]>>('function-samples.json');
const comments = read<Record<string, { content: string; praise: number }[]>>('comments.json');

const list = (name: string) => filters.find((f) => f.name === name)?.list ?? [];
const MATERIALS = list('材质').map((x) => x.name);
const FUNCTIONS = list('功能').map((x) => x.name);
const isMat = new Set(MATERIALS);
const isFun = new Set(FUNCTIONS);
const catName = new Map(categories.map((c) => [c.id, c.name]));
const gameById = new Map(games.map((g) => [g.id, g]));

const tally = <T>(xs: T[], f: (x: T) => string | string[] | null | undefined) => {
  const m: Record<string, number> = {};
  for (const x of xs) { const v = f(x); for (const k of Array.isArray(v) ? v : v ? [v] : []) m[k] = (m[k] ?? 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const pct = (rows: [string, number][], n: number, top = 6) => rows.slice(0, top).map(([k, v]) => `${k} ${Math.round((v / Math.max(1, n)) * 100)}%`).join('、');
const score = (g: Game) => (g.collect_num ?? 0) * 3 + (g.praise ?? 0) * 5 + (g.see ?? 0) / 100;
const uniq = <T>(xs: T[]) => [...new Set(xs)];

/* ---------- 游戏 ---------- */
const gameStats = {
  total: games.length,
  byStyle: tally(games, (g) => g.style),
  byDevice: tally(games, (g) => g.device),
  byGenre: tally(games, (g) => g.category?.name),
  byEra: tally(games, (g) => g.era),
  topTags: tally(games, (g) => g.tags).slice(0, 60),
  top: [...games].sort((a, b) => score(b) - score(a)).slice(0, 60).map((g) => ({ id: g.id, name: g.name, style: g.style, device: g.device, genre: g.category?.name, era: g.era, praise: g.praise, see: g.see, collect: g.collect_num, images: g.total_image_count, url: `https://www.gameui.net/games/${g.hash}` })),
};
const topByStyle = Object.fromEntries(gameStats.byStyle.map(([s]) => [s, games.filter((g) => g.style === s).sort((a, b) => score(b) - score(a)).slice(0, 8).map((g) => g.name)]));
const topByGenre = Object.fromEntries(gameStats.byGenre.map(([s]) => [s, games.filter((g) => g.category?.name === s).sort((a, b) => score(b) - score(a)).slice(0, 6).map((g) => g.name)]));

/* ---------- 材质 × 风格 / 平台 / 类型 / 功能 ---------- */
const matStats = list('材质').map(({ name, num }) => {
  const rows = mat[name] ?? [];
  const n = rows.length;
  const gamesIn = tally(rows, (r) => r.article?.name ?? null);
  const topGames = uniq(rows.map((r) => r.article?.id).filter((x): x is number => !!x))
    .map((id) => gameById.get(id)).filter((g): g is Game => !!g).sort((a, b) => score(b) - score(a)).slice(0, 5).map((g) => g.name);
  return {
    name, num, sampled: n,
    style: tally(rows, (r) => r.article?.style), device: tally(rows, (r) => r.article?.device),
    genre: tally(rows, (r) => (r.article?.category_id ? catName.get(r.article.category_id) : null)),
    functions: tally(rows, (r) => uniq((r.tags ?? []).filter((t) => isFun.has(t)))).slice(0, 8),
    withMaterials: tally(rows, (r) => uniq((r.tags ?? []).filter((t) => isMat.has(t) && t !== name))).slice(0, 6),
    distinctGames: gamesIn.length, topGames,
    examples: rows.filter((r) => r.article && gameById.has(r.article.id)).sort((a, b) => score(gameById.get(b.article!.id)!) - score(gameById.get(a.article!.id)!))
      .filter((r, i, arr) => arr.findIndex((x) => x.article!.id === r.article!.id) === i).slice(0, 6).map((r) => ({ id: r.id, game: r.article!.name, w: r.width, h: r.height, tags: r.tags })), // 不收原图地址：站内作品不转载
  };
});

/* ---------- 功能（界面类型） ---------- */
const funStats = list('功能').map(({ name, num }) => {
  const rows = fun[name] ?? [];
  return {
    name, num, sampled: rows.length,
    materials: tally(rows, (r) => uniq((r.tags ?? []).filter((t) => isMat.has(t)))).slice(0, 6),
    tagged: rows.filter((r) => (r.tags ?? []).some((t) => isMat.has(t))).length,
    style: tally(rows, (r) => r.article?.style).slice(0, 4), device: tally(rows, (r) => r.article?.device).slice(0, 3),
  };
});

/* ---------- 作品 ---------- */
const wScore = (w: Work) => (w.collect_num ?? 0) * 2 + (w.praise ?? 0) * 3 + (w.see ?? 0) / 100;
const workStats = {
  total: works.length,
  byCategory: tally(works, (w) => w.category?.name),
  topTags: tally(works, (w) => w.tags).slice(0, 80),
  withVideo: works.filter((w) => w.video_url).length,
  top: [...works].sort((a, b) => wScore(b) - wScore(a)).slice(0, 60).map((w) => ({ id: w.id, name: w.name, category: w.category?.name, praise: w.praise, see: w.see, collect: w.collect_num, images: w.total_image_count, video: !!w.video_url, tags: w.tags, url: `https://www.gameui.net/works/${w.hash}` })),
  medians: (() => { const m = (k: keyof Work) => { const v = works.map((w) => Number(w[k] ?? 0)).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; }; return { praise: m('praise'), see: m('see'), collect: m('collect_num') }; })(),
};

/* ---------- 评论（只看关键词与高赞短评） ---------- */
const allC = Object.values(comments).flat();
const KEYWORDS = ['配色', '颜色', '色彩', '质感', '材质', '图标', 'icon', '动效', '动画', '字体', '排版', '布局', '层次', '细节', '风格', '氛围', '统一', '干净', '简洁', '精致', '高级', '可读', '交互', '体验', '信息', '光影', '立体', '扁平', '手绘', '像素', '国风', '二次元', '科幻', '复古', '参考', '学习', '源文件', '教程', '流程', 'AI'];
const kw = KEYWORDS.map((k) => [k, allC.filter((c) => c.content?.toLowerCase().includes(k.toLowerCase())).length] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
const substantive = allC.filter((c) => (c.content ?? '').replace(/\s/g, '').length >= 12).sort((a, b) => (b.praise ?? 0) - (a.praise ?? 0));

const digest = { generatedFrom: 'qa/refs-cache/gameui（gameui-collect.ts）', counts, filters: filters.map((f) => ({ name: f.name, values: (f.list ?? []).map((x) => [x.name, x.num]) })), gameStats, topByStyle, topByGenre, matStats, funStats, workStats, comments: { works: Object.keys(comments).length, total: allC.length, substantive: substantive.length, keywords: kw } };
writeFileSync(join(ROOT, 'docs', 'survey', 'data', 'gameui-digest.json'), JSON.stringify(digest, null, 1));

/* ---------- 精简版 ---------- */
const L: string[] = [];
L.push(`# GameUI 摘要`, `游戏 ${games.length}（站方 ${counts.games}），截图 ${counts.images}，作品 ${works.length}`);
for (const f of filters) if (['风格', '平台', '材质'].includes(f.name)) L.push(`- ${f.name}：${(f.list ?? []).map((x) => `${x.name} ${x.num}`).join('、')}`);
L.push(`- 功能 top30：${list('功能').slice().sort((a, b) => b.num - a.num).slice(0, 30).map((x) => `${x.name} ${x.num}`).join('、')}`);
L.push(`- 游戏风格：${pct(gameStats.byStyle, games.length, 8)}；平台：${pct(gameStats.byDevice, games.length)}`);
L.push(`- 游戏类型：${pct(gameStats.byGenre, games.length, 19)}`);
L.push(`- 年份：${pct(gameStats.byEra, games.length, 10)}`);
L.push(`- 主题标签 top30：${gameStats.topTags.slice(0, 30).map(([k, v]) => `${k} ${v}`).join('、')}`);
L.push('', '## 热门游戏 top30（收藏×3 + 点赞×5 + 浏览/100）');
for (const g of gameStats.top.slice(0, 30)) L.push(`- ${g.name}｜${g.style}/${g.device}/${g.genre}/${g.era}｜赞${g.praise} 藏${g.collect} 看${g.see} 图${g.images}`);
L.push('', '## 各风格热门游戏');
for (const [s, ns] of Object.entries(topByStyle)) L.push(`- ${s}：${ns.join('、')}`);
L.push('', '## 材质（截图数｜抽样里的风格 / 平台 / 常见界面 / 常同时出现的材质 / 热门游戏）');
for (const m of matStats) L.push(`- **${m.name}** ${m.num}｜${pct(m.style, m.sampled, 4)}｜${pct(m.device, m.sampled, 2)}｜界面：${m.functions.slice(0, 5).map(([k]) => k).join('、')}｜伴随：${m.withMaterials.slice(0, 3).map(([k]) => k).join('、')}｜${m.topGames.slice(0, 3).join('、')}`);
L.push('', '## 功能（界面类型）× 材质（抽样 100 张里带材质标签的张数 / 最常见材质）');
for (const f of funStats.slice().sort((a, b) => b.num - a.num)) L.push(`- ${f.name} ${f.num}｜带材质 ${f.tagged}/${f.sampled}｜${f.materials.slice(0, 4).map(([k, v]) => `${k}${v}`).join('、')}｜${pct(f.style, f.sampled, 3)}`);
L.push('', `## 作品 ${works.length}（中位数 赞${workStats.medians.praise} 看${workStats.medians.see} 藏${workStats.medians.collect}；有视频 ${workStats.withVideo}）`);
L.push(`- 分类：${workStats.byCategory.map(([k, v]) => `${k} ${v}`).join('、')}`);
L.push(`- 标签 top50：${workStats.topTags.slice(0, 50).map(([k, v]) => `${k} ${v}`).join('、')}`);
L.push('- 高分作品 top40：');
for (const w of workStats.top.slice(0, 40)) L.push(`  - ${w.name}｜${w.category}｜赞${w.praise} 藏${w.collect} 看${w.see}${w.video ? '｜视频' : ''}｜${(w.tags ?? []).slice(0, 5).join(',')}`);
L.push('', `## 评论：${Object.keys(comments).length} 个高赞作品共 ${allC.length} 条，≥12 字的 ${substantive.length} 条`);
L.push(`- 关键词：${kw.map(([k, n]) => `${k} ${n}`).join('、')}`);
L.push('- 高赞长评（截 50 字）：');
for (const c of substantive.slice(0, 40)) L.push(`  - [${c.praise}] ${c.content.replace(/\s+/g, ' ').slice(0, 50)}`);
writeFileSync(join(DIR, 'digest.md'), L.join('\n'));
console.log(`digest: ${L.length} lines`);
