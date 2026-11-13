/*
 * 配方图库缩略图与图库数据的检查（轨道 C，docs/workbench-redesign.md §11.1）。
 * 运行：npx tsx scripts/bake-thumbs.ts
 *
 * 缩略图由浏览器里的引擎渲染（node 里没有 WebGL），烘焙步骤：
 *   1. npm run dev，打开页面（最好是一个单独的标签页，烘焙时会改这一页的画面）；
 *   2. 控制台运行  await __gae.gallery.bake()        → public/thumbs/<配方 id>.webp（640×360）
 *                  await __gae.gallery.bakeAtlas()   → public/thumbs/atlas/<风格 id>.webp（480×270）
 *                  await __gae.gallery.sheet()       → qa/redesign/gallery_sheet.png（接触表，人工看一遍）
 *   3. 再跑本脚本：检查每个配方都有缩略图、尺寸对、图库数据（卡片名 ≤8 字、看点 3 条 ≤12 字、参数挂得上并且生效）没问题；
 *      另查：生产构建（游戏只显示名字）下配方卡默认可见 ≤100 字；复制提示词【UI】一段的家族语法和写出来的皮肤是同一套。
 *   变体是否一眼看得出：在开发页面跑 await __gae.gallery.vdiffAll()（缩略图变化 <2% 像素的变体要么调值、要么标 subtle 收进「更多」）。
 * 2D 场景（轨道 F）上线后，recipes.ts 里写了 showcase.scene2d 的配方会自动改用 2D 场景，需要重新烘焙这几张；
 *   本脚本对比 2D 展示场景构建器文件与缩略图的修改时间，构建器更新时提醒（不算问题）。
 * 仅参考 8 张卡的示意图：await __gae.gallery.bakeRef() → public/thumbs/ref/<卡 id>.webp，本脚本查齐全与尺寸。
 * 建议在 package.json 加 "check:thumbs": "tsx scripts/bake-thumbs.ts"（package.json 不归轨道 C）。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import '../src/dims/index';
import { activeState, defaultValues, getParam } from '../src/dims/registry';
import { RECIPES } from '../src/content/recipes';
import { STYLES } from '../src/content/styles.data';
import { GALLERY, galleryProblems, OVERLAYS, REF_ONLY } from '../src/content/taxonomy';
import { artPrompt } from '../src/export/artPrompt';
import { bestTarget, countChars, deckTexts, fitGames, gameLabel, IMAGE_NOTE, pickFamily, promptSkin, type DeckCtx, type DeckGame, type FamilyLike } from '../src/ui/deck/deckText';

const DIR = join(process.cwd(), 'public', 'thumbs');
let problems = 0;
const warn = (m: string) => { problems++; console.log('  ✗', m); };

/** WebP 的宽高（VP8 / VP8L / VP8X 三种块） */
function webpSize(file: string): [number, number] | null {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return null;
}

console.log('== 图库数据');
// 生产构建口径：没有 Steam 截图，「像这些游戏」只显示名字（cases.json 里的中文名 / 原名）
const casesRaw = JSON.parse(readFileSync(join(process.cwd(), 'src', 'content', 'cases', 'cases.json'), 'utf8')) as { id: string; name: string; nameZh?: string }[] | { cases: { id: string; name: string; nameZh?: string }[] };
const CASES = Array.isArray(casesRaw) ? casesRaw : casesRaw.cases;
const CASE_BY_ID = new Map(CASES.map((c) => [c.id, c]));
const prodGames = (ids: string[] = []): DeckGame[] => ids.map((id) => { const c = CASE_BY_ID.get(id); return { id, name: c ? gameLabel(c.name, c.nameZh) : id, img: null, inLib: !!c }; });
const defs = defaultValues();
for (const p of galleryProblems((id) => !!getParam(id), {
  bulletLive: (r, param) => activeState(getParam(param)!, { ...defs, ...r.values }),
  deckChars: (r) => countChars(deckTexts(r, r, fitGames(r, r, prodGames(r.games))).join(' ')),
})) warn(p);
const deckMax = Math.max(...GALLERY.map((r) => countChars(deckTexts(r, r, fitGames(r, r, prodGames(r.games))).join(' '))));
console.log(`  配方卡默认可见字数（生产构建）最多 ${deckMax} 字`);
// 最挤的情形：首次引导 + 建议镜头（最长的机位名）+ 立绘提示同时出现（StyleDeck 这时不放「相邻」，游戏名按字数少放）
const worst: DeckCtx = { extra: ['① 点左边的图 · ② 右边微调 · ③ 切到 UI', '建议镜头', '透视 · 真等距 35.26°', IMAGE_NOTE], noNeighbors: true };
let worstMax = 0;
for (const r of GALLERY) {
  const n = countChars(deckTexts(r, r, fitGames(r, r, prodGames(r.games), worst), worst).join(' '));
  worstMax = Math.max(worstMax, n);
  if (n > 100) warn(`${r.id}：首次引导 + 建议镜头 + 立绘提示同时出现时配方卡 ${n} 字，超过 100`);
}
console.log(`  最挤的情形（首次引导 + 建议镜头 + 立绘提示）最多 ${worstMax} 字`);
// 「在 X 最好看 ›」：能对上场景的用场景名（node 里按 3D 环境算）
const bestKinds = GALLERY.map((r) => bestTarget(r)).filter(Boolean);
console.log(`  「在 X 最好看」${bestKinds.length} 张卡：对上场景 ${bestKinds.filter((t) => t!.scene).length}，只换环境 ${bestKinds.filter((t) => !t!.scene).length}（node 口径：2D 环境按没注册算）`);

console.log('== 复制提示词：【UI】的皮肤和家族语法是同一套');
const FAM = (JSON.parse(readFileSync(join(process.cwd(), 'src', 'content', 'uiStyleFamilies.json'), 'utf8')) as { families: FamilyLike[] }).families;
let promptBad = 0;
for (const r of RECIPES) {
  const v = { ...defs, ...r.values };
  // 三种情形：没选皮肤（hud.style 是注册表默认）、选了配套的第一个、手动选了毛玻璃
  for (const origin of [null, { skin: 'skin.glass' }]) {
    const skin = promptSkin(r, v, origin);
    const fam = pickFamily(FAM, r, skin);
    const p = artPrompt({ values: v, recipeId: r.id, skin, family: fam, lang: 'zh' });
    if (fam?.skin && skin && fam.skin !== skin) { promptBad++; warn(`${r.id}：提示词写皮肤 ${skin}，语法却取自 ${fam.id}（${fam.skin}）`); }
    if (/…/.test(p.text)) { promptBad++; warn(`${r.id}：复制的提示词里有截断号「…」`); }
    if (/ACES|AgX|Kuwahara|Voronoi|GGX|MeshToon|PlaneGeometry/.test(p.text)) { promptBad++; warn(`${r.id}：复制的提示词里有引擎术语`); }
  }
}
if (!promptBad) console.log(`  ${RECIPES.length} 套 × 2 种皮肤情形都一致，没有截断号和引擎术语`);
const kinds = RECIPES.reduce<Record<string, number>>((m, r) => ((m[r.kind ?? 'style'] = (m[r.kind ?? 'style'] ?? 0) + 1), m), {});
console.log(`  配方 ${RECIPES.length} 个：风格卡 ${GALLERY.length}，变体 ${kinds.variant ?? 0}，叠加 ${kinds.overlay ?? 0}（另有时段 ${OVERLAYS.filter((o) => o.group === 'time').length} 个）；仅参考 ${REF_ONLY.length} 张`);

console.log('== 配方缩略图（public/thumbs/<id>.webp，640×360）');
let bytes = 0;
for (const r of RECIPES) {
  const f = join(DIR, `${r.id}.webp`);
  if (!existsSync(f)) { warn(`${r.id} 没有缩略图`); continue; }
  const sz = webpSize(f);
  bytes += statSync(f).size;
  if (!sz) warn(`${r.id}.webp 不是有效的 WebP`);
  else if (sz[0] !== 640 || sz[1] !== 360) warn(`${r.id}.webp 是 ${sz[0]}×${sz[1]}，应为 640×360`);
}
const known = new Set(RECIPES.map((r) => `${r.id}.webp`));
const stray = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.webp') && !known.has(f)) : [];
if (stray.length) console.log(`  多出来的文件（配方已删或改名）：${stray.join('、')}`);
console.log(`  ${RECIPES.length} 张，合计 ${(bytes / 1024).toFixed(0)} KB`);

console.log('== 仅参考卡的示意图（public/thumbs/ref/<卡 id>.webp，640×360，__gae.gallery.bakeRef() 画）');
for (const c of REF_ONLY) {
  const f = join(DIR, 'ref', `${c.id}.webp`);
  if (!existsSync(f)) { warn(`${c.id}（${c.name}）没有示意图`); continue; }
  const sz = webpSize(f);
  if (!sz || sz[0] !== 640 || sz[1] !== 360) warn(`ref/${c.id}.webp 尺寸不对（${sz ? sz.join('×') : '不是 WebP'}）`);
}
console.log(`  ${REF_ONLY.length} 张卡`);

console.log('== 2D 展示场景的缩略图比场景构建器新吗（只提醒，不算问题）');
// scene2d → 注册它的文件（src/engine/scene/scenes/*.ts 里 registerSceneBuilder('<id>'）；构建器文件比缩略图新 = 场景可能改过，缩略图可能过期
const SCN = join(process.cwd(), 'src', 'engine', 'scene', 'scenes');
const builderFile = new Map<string, string>();
for (const f of existsSync(SCN) ? readdirSync(SCN).filter((x) => x.endsWith('.ts')) : []) {
  const src = readFileSync(join(SCN, f), 'utf8');
  for (const m of src.matchAll(/registerSceneBuilder\('([\w-]+)'/g)) if (!builderFile.has(m[1])) builderFile.set(m[1], join(SCN, f));
}
let stale = 0;
for (const r of RECIPES) {
  const s2 = r.showcase?.scene2d;
  const bf = s2 ? builderFile.get(s2) : undefined;
  const tf = join(DIR, `${r.id}.webp`);
  if (!bf || !existsSync(tf)) continue;
  const dt = statSync(bf).mtimeMs - statSync(tf).mtimeMs;
  if (dt > 0) { stale++; console.log(`  ⚠ ${r.id}（${s2}）：${bf.split(/[\\/]/).pop()} 比缩略图晚改 ${Math.round(dt / 60000)} 分钟，看一眼要不要 __gae.gallery.bake(['${r.id}'])`); }
}
if (!stale) console.log('  2D 展示场景的缩略图都比构建器新');

console.log('== 风格研究库缩略图（public/thumbs/atlas/<id>.webp，480×270，可选）');
const ad = join(DIR, 'atlas');
const have = existsSync(ad) ? new Set(readdirSync(ad).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5))) : new Set<string>();
let abytes = 0;
for (const id of have) abytes += statSync(join(ad, `${id}.webp`)).size;
const missingAtlas = STYLES.filter((s) => !have.has(s.id) && (Object.keys(s.approx).length || s.recipe));
console.log(`  ${have.size} / ${STYLES.length} 张，合计 ${(abytes / 1024).toFixed(0)} KB；有参数但没烘焙的 ${missingAtlas.length} 条${missingAtlas.length ? `（如 ${missingAtlas.slice(0, 5).map((s) => s.id).join('、')}）` : ''}`);

console.log(problems ? `\n发现 ${problems} 个问题` : '\n没有发现问题');
process.exit(problems ? 1 : 0);
