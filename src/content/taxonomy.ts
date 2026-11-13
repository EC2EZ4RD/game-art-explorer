import type { Values } from '../dims/types';
import { RECIPES, RECIPE_MAP, type Recipe, type RecipeCategory } from './recipes';
import { MOODS } from './styles.data';

/*
 * 配方图库的分类与筛选（轨道 C，docs/workbench-redesign.md §1.3 / §7）。
 *   6 个分类（芯片上用短名）；筛选维度：感觉（36 个情绪词）、2D / 3D、可实现度（● 实时 / ◐ 局部 / ○ 仅参考）。
 *   68 张卡 = 29 个基础配方 + 15 个新配方（轨道 C）+ 24 个技术补全新配方（Z1，2026-10-23）（recipes.ts 里 kind = 'style' 的条目）；
 *   14 个变体在父配方的配方卡里做芯片；4 个叠加 + 4 个时段做成「叠加」一行，可以配任何配方；
 *   3 张「仅参考」卡：做不出来的风格，只放进学习库（和图库的 ○ 筛选）。原来的 8 张里，8 位 / 16 位像素、橡皮管、手抄本、黑绘陶
 *   在技术补全后有了真配方（nes-8bit / snes-mode7 / rubber-hose / manuscript / black-figure），从这里拿掉了。
 * 本文件不引用 cases.ts（那边用了 import.meta.glob，node 脚本跑不了），游戏名只存案例 id。
 */

export interface Category { id: RecipeCategory; name: string; short: string }
export const CATEGORIES: Category[] = [
  { id: 'pixel', name: '像素与复古', short: '像素' },
  { id: 'paint', name: '绘画与线条', short: '绘画' },
  { id: 'east', name: '东方笔墨', short: '东方' },
  { id: 'flat', name: '平面与图形', short: '平面' },
  { id: 'form', name: '形体与材质', short: '材质' },
  { id: 'light', name: '光影与渲染', short: '光影' },
];
export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export type Realtime = 'live' | 'partial' | 'ref';
export const REALTIME_DOT: Record<Realtime, string> = { live: '●', partial: '◐', ref: '○' };
export const REALTIME_LABEL: Record<Realtime, string> = { live: '实时', partial: '局部', ref: '仅参考' };
export const realtimeOf = (r: Recipe): Realtime => r.realtime ?? (/局部/.test(r.name) ? 'partial' : 'live');

/** 卡片名（≤8 字） */
export const cardName = (r: Recipe) => r.short ?? r.name.replace(/（.*?）/g, '');

const catOrder = (c?: RecipeCategory) => CATEGORIES.findIndex((x) => x.id === c);
/** 图库里的卡（风格卡，现在 68 张）：按分类排，同类里保持 recipes.ts 的顺序 */
export const GALLERY: Recipe[] = RECIPES.filter((r) => (r.kind ?? 'style') === 'style')
  .map((r, i) => ({ r, i }))
  .sort((a, b) => catOrder(a.r.category) - catOrder(b.r.category) || a.i - b.i)
  .map((x) => x.r);

export const variantsOf = (id: string): Recipe[] => RECIPES.filter((r) => r.kind === 'variant' && r.parent === id);

/**
 * 这张卡现在算不算 2D（图库的「2D」角标和筛选）：写了 is2d、并且它的 2D 展示场景（F 轨道的 sideStage / tileTown / greybox）已经有构建器。
 * 2D 场景上线前一律不算——缩略图和套用后的画面都还是 3D，不能先挂「2D」的牌子。
 */
export const is2dLive = (r: Recipe, has?: (id: string) => boolean) => !!(r.is2d && r.showcase?.scene2d && has?.(r.showcase.scene2d));

/** 「叠加」一行：4 个效果 + 4 个时段。values = 叠加时只写的键 */
export interface OverlayDef { id: string; short: string; chip: string; values: Values; recipe?: string; group: 'fx' | 'time' }
const OVERLAY_CHIP: Record<string, string> = { 'neon-night': '霓虹', weathered: '做旧', 'vhs-tape': 'VHS', 'cel-2dfx': '特效' };
export const OVERLAYS: OverlayDef[] = [
  ...RECIPES.filter((r) => r.kind === 'overlay' && r.overlay).map((r): OverlayDef => ({ id: r.id, short: r.short ?? r.name, chip: OVERLAY_CHIP[r.id] ?? r.short ?? r.name, values: r.overlay!, recipe: r.id, group: 'fx' })),
  { id: 'tod.dawn', short: '清晨', chip: '清晨', values: { 'lighting.cycle': false, 'lighting.time': 6.6 }, group: 'time' },
  { id: 'tod.noon', short: '正午', chip: '正午', values: { 'lighting.cycle': false, 'lighting.time': 12 }, group: 'time' },
  { id: 'tod.dusk', short: '黄昏', chip: '黄昏', values: { 'lighting.cycle': false, 'lighting.time': 18.2 }, group: 'time' },
  { id: 'tod.night', short: '夜晚', chip: '夜晚', values: { 'lighting.cycle': false, 'lighting.time': 21.5, 'lighting.lanterns': 1.6 }, group: 'time' },
];
export const OVERLAY_MAP = new Map(OVERLAYS.map((o) => [o.id, o]));
/** 当前值里这一层叠加是否完全生效（所有键都吻合） */
export const overlayOn = (o: OverlayDef, v: Values) => Object.entries(o.values).every(([k, x]) => v[k] === x);

/** 「仅参考」卡：做不出来的风格。nearest = 最接近的可做配方；atlas = 风格图谱条目；games = 代表作（案例 id 优先，没有时是名字） */
export interface RefOnlyCard { id: string; name: string; why: string; nearest: string[]; atlas?: string; games: string[]; category: RecipeCategory }
export const REF_ONLY: RefOnlyCard[] = [
  { id: 'ref.densePixel', name: '精细像素', category: 'pixel', why: '每一格都是手点的像素画', nearest: ['glow-pixel', 'hd2d-sprite', 'snes-mode7'], atlas: 'hi-bit-pixel', games: ['owlboy', 'blasphemous'] },
  { id: 'ref.gothicLine', name: '哥特线描', category: 'paint', why: '手绘线稿与分层背景板', nearest: ['ink-block', 'layered-silhouette'], atlas: 'hollow-knight', games: ['hollow-knight'] },
  { id: 'ref.oldMaster', name: '古典拼贴', category: 'paint', why: '剪下古典名画的局部拼起来', nearest: ['papercut', 'oil'], atlas: 'collage', games: ['the-procession-to-calvary', 'death-of-the-reprobate'] },
];
/** 技术补全（Z1）后有了真配方、从仅参考里拿掉的卡：旧卡 id → 配方 id（学习库里旧链接、示意图的出处） */
export const REF_CONVERTED: Record<string, string> = {
  'ref.8bit': 'nes-8bit', 'ref.16bit': 'snes-mode7', 'ref.rubberHose': 'rubber-hose', 'ref.manuscript': 'manuscript', 'ref.blackFigure': 'black-figure',
};

/** 感觉（36 个情绪词）→ 配方：情绪条目里写的走法 + 标签里有这个词的配方 */
export const MOOD_LIST = MOODS.map((m) => ({ id: m.id, name: m.name }));
export function recipesForMood(moodId: string): Set<string> {
  const m = MOODS.find((x) => x.id === moodId);
  if (!m) return new Set();
  const ids = new Set<string>(m.recipes ?? []);
  for (const r of RECIPES) if (r.tags.includes(m.name)) ids.add(r.id);
  // 变体 / 叠加命中时，把父配方算进来（图库只显示风格卡）
  for (const id of [...ids]) { const r = RECIPE_MAP.get(id); if (r?.parent) ids.add(r.parent); }
  return ids;
}

/** 缩略图（public/thumbs/<id>.webp，640×360，开发钩子 __gae.gallery.bake() 烘焙） */
export const thumbUrl = (id: string) => `./thumbs/${id}.webp`;
/** 仅参考卡的代表图（public/thumbs/ref/<卡 id>.webp，640×360）：自己画的示意插画（src/ui/learn/refArt.ts，__gae.gallery.bakeRef() 烘焙） */
export const refThumbUrl = (id: string) => `./thumbs/ref/${id}.webp`;

/** 展示场景：2D 场景（F 轨道）有构建器时用 2D 的，否则用现有 3D 场景 */
export function showcaseScene(r: Recipe, has?: (id: string) => boolean): string {
  const s = r.showcase;
  if (s?.scene2d && has?.(s.scene2d)) return s.scene2d;
  return s?.scene ?? r.scene ?? 'sandbox';
}

/**
 * 首次打开用的配方与场景（F0：「低多边形」一类里由 C 挑最好看的一个）。
 * 2026-10-21 在小岛上并排比过 低多边形 / 灵感修正 / 玩具手办：灵感修正的色块最干净、一眼读得出岛和路（qa/redesign/trial_first.png）。
 * 真正生效的是轨道 A 的 src/state/layers.ts START_RECIPE（已请 A 改成引用这里，见 docs/redesign/track-C.md）。
 */
export const FIRST_RUN = { recipe: 'inspiration-fixed', scene: 'sandbox' } as const;

export interface GalleryCheckOpts {
  /** 看点挂的参数在这套配方的值下是否生效（activeState(param, defaults ⊕ values) === true）；不生效的看点悬停会闪「当前不生效」里的行 */
  bulletLive?: (r: Recipe, param: string) => true | string;
  /** 画框下方配方卡的默认可见字数（§7 ≤100；生产构建口径：游戏只显示名字） */
  deckChars?: (r: Recipe) => number;
}

/** 图库应有的风格卡数（加减配方时一起改；防止 kind 写错让卡片悄悄少了或多了） */
export const GALLERY_SIZE = 68;

/** 自检：卡片名 ≤8 字、看点 3 条且每条 ≤12 字、参数挂得上并且生效、仅参考卡与叠加芯片的名字长度、配方卡字数（scripts/bake-thumbs.ts 调用） */
export function galleryProblems(paramExists: (id: string) => boolean, opts: GalleryCheckOpts = {}): string[] {
  const out: string[] = [];
  const len = (s: string) => [...s].length;
  for (const r of RECIPES) {
    if (len(cardName(r)) > 8) out.push(`${r.id}：卡片名「${cardName(r)}」超过 8 字`);
    if (!r.bullets || r.bullets.length !== 3) out.push(`${r.id}：看点不是 3 条`);
    for (const b of r.bullets ?? []) {
      if (len(b.text) > 12) out.push(`${r.id}：看点「${b.text}」超过 12 字`);
      if (!paramExists(b.param)) { out.push(`${r.id}：看点挂的参数 ${b.param} 不存在`); continue; }
      const live = opts.bulletLive?.(r, b.param) ?? true;
      if (live !== true) out.push(`${r.id}：看点「${b.text}」挂的 ${b.param} 在这套配方里不生效（${live}）`);
    }
    if (r.pitch && len(r.pitch) > 30) out.push(`${r.id}：卖点超过 30 字`);
    if (r.kind === 'style' && !r.category) out.push(`${r.id}：没有分类`);
    if (r.kind === 'variant' && !(r.parent && RECIPE_MAP.has(r.parent))) out.push(`${r.id}：变体的父配方不存在`);
    for (const n of r.neighbors ?? []) if (!RECIPE_MAP.has(n)) out.push(`${r.id}：相邻配方 ${n} 不存在`);
  }
  if (GALLERY.length !== GALLERY_SIZE) out.push(`图库应有 ${GALLERY_SIZE} 张卡，现在 ${GALLERY.length} 张`);
  for (const c of CATEGORIES) if (GALLERY.filter((r) => r.category === c.id).length < 3) out.push(`分类「${c.name}」不到 3 张卡`);
  for (const [ref, id] of Object.entries(REF_CONVERTED)) if (!RECIPE_MAP.has(id)) out.push(`${ref} 转成的配方 ${id} 不存在`);
  for (const c of REF_ONLY) {
    if (len(c.name) > 8) out.push(`${c.id}：仅参考卡名「${c.name}」超过 8 字`);
    for (const n of c.nearest) if (!RECIPE_MAP.has(n)) out.push(`${c.id}：最接近的配方 ${n} 不存在`);
  }
  for (const o of OVERLAYS) if (len(o.chip) > 4) out.push(`${o.id}：叠加芯片「${o.chip}」超过 4 字`);
  if (opts.deckChars) for (const r of GALLERY) { const n = opts.deckChars(r); if (n > 100) out.push(`${r.id}：配方卡默认可见 ${n} 字，超过 100`); }
  return out;
}
