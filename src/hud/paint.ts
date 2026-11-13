import { fillMaterial, gradientMean, luminance, MATERIAL_BASE, mix, parseColor, rgba, withAlpha } from './material';
const MATERIAL_BASE_OF = (m: string) => MATERIAL_BASE[m];
import { drawOrnaments, modWidths, ornamentInScope, swell } from './ornament';
import { drawFrame } from './frame';
import { drawFx, FX_BEHIND } from './fx';
import { FONT_WEIGHTS } from './fontList';
import { uiImagesVersion } from './uiAssets';
import { LEGIBLE, LEGIBLE_PX, PIXROLE, ROLE_LAYERS } from './pixelRoles';
import type { BoxStyle, ColorRef, Corner, Paint, PatternOverlay, Radius, Shadow, SkinPalette, TextStyle } from './types';
import { drawVectorIcon, glyphIconName, ICON_STYLE } from './icons/draw';

/*
 * Canvas2D 绘制工具：把盒子样式（BoxStyle）画成和原 CSS 一样的面板。
 * 坐标单位是 CSS 像素；调用方已经把 ctx 缩放到画布分辨率。
 * 盒模型按 border-box：传进来的矩形就是外框，边框画在里面。
 */

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * 只量不画的画布（M12a-38：模板构图器的测量阶段）：所有绘制调用都不做事，状态照常记（font、globalAlpha……），measureText 交给一张离屏画布
 * （同一套字体；没有 document 时交给 measureWith）；渐变 / 图案给空对象，getTransform 是单位矩阵
 */
let MEASURE_CTX: CanvasRenderingContext2D | null = null;
export function measureOnlyCtx(measureWith: CanvasRenderingContext2D, w = 960, h = 540): CanvasRenderingContext2D {
  if (!MEASURE_CTX && typeof document !== 'undefined') MEASURE_CTX = (document.createElement('canvas') as HTMLCanvasElement).getContext('2d');
  const mc = MEASURE_CTX ?? measureWith;
  const state: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1, lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', filter: 'none', globalCompositeOperation: 'source-over', shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetX: 0, shadowOffsetY: 0, letterSpacing: '0px', textAlign: 'start', textBaseline: 'alphabetic', imageSmoothingEnabled: true, imageSmoothingQuality: 'low', lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, lineDashOffset: 0 };
  const stack: Record<string, unknown>[] = [];
  const noop = () => undefined;
  const fns: Record<string, (...a: never[]) => unknown> = {
    measureText: (s: string) => { mc.save(); mc.font = String(state.font); (mc as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = String(state.letterSpacing); const m = mc.measureText(s); mc.restore(); return m; },
    save: () => { stack.push({ ...state }); return undefined; },
    restore: () => { const s = stack.pop(); if (s) Object.assign(state, s); return undefined; },
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, is2D: true, isIdentity: true }),
    createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createConicGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({ setTransform: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    isPointInPath: () => false, isPointInStroke: () => false, getLineDash: () => [],
  };
  const canvas = { width: w, height: h };
  return new Proxy({}, {
    get: (_, k) => (k === MEASURE_ONLY ? true : k === 'canvas' ? canvas : typeof k !== 'string' ? undefined : k in fns ? fns[k] : k in state ? state[k] : noop),
    set: (_, k, v) => { state[String(k)] = v; return true; },
  }) as CanvasRenderingContext2D;
}

/*
 * 可读性检查（M8a）用的绘制记录：打开时，每次画字、画盒子都记下画布像素坐标、颜色与透明度。
 * 只记平移与缩放（旋转、倾斜的盒子按外接矩形近似）。
 */
export interface LoggedText { x: number; y: number; w: number; h: number; size: number; color: string; aided: boolean; bold: boolean; text: string; cw: number; /** 特效自己画的字（飘字、横幅）：不算被特效挡住的对象 */ fx?: boolean; /** 贴在固定尺寸图形上的小字（fixedSize：格子角标、键位、徽章数；字号下限 21px@1080p） */ fixed?: boolean }
export interface LoggedBox { x: number; y: number; w: number; h: number; color: string | null; blur: number; cw: number }
/** 可点 / 可按的目标（格子、按钮、页签、列表行）：触控尺寸检查用（M8b） */
export interface LoggedTarget { x: number; y: number; w: number; h: number; cw: number; label: string; /** 部件种类（COMPONENTS 的名字：button / tab / listRow / slot / tooltip……；轨道 E 第二阶段的部件命中框用，没写时按形状猜） */ part?: string }
/** 特效占的区域（飘字、横幅、提示、速度线、故障、面板前景特效）：特效遮挡检查用（M8b） */
export interface LoggedFx { x: number; y: number; w: number; h: number; cw: number; kind: string }
export const DRAW_LOG: { on: boolean; texts: LoggedText[]; boxes: LoggedBox[]; targets: LoggedTarget[]; fx: LoggedFx[]; inFx: number } = { on: false, texts: [], boxes: [], targets: [], fx: [], inFx: 0 };
export function logTarget(ctx: CanvasRenderingContext2D, r: Rect, label = '', part?: string) {
  if (DRAW_LOG.on) DRAW_LOG.targets.push({ ...devRect(ctx, r.x, r.y, r.w, r.h), label, ...(part ? { part } : {}) });
}
/** 记一块不经 drawBox 画的底（自己画的圆章、衬底……）进绘制记录：可读性检查与 colorUnder 才知道字底下有它（§8，轨道 E） */
export function logBoxRect(ctx: CanvasRenderingContext2D, r: Rect, color: string, blur = 0) {
  if (DRAW_LOG.on && typeof ctx.getTransform === 'function') DRAW_LOG.boxes.push({ ...devRect(ctx, r.x, r.y, r.w, r.h), color, blur });
}
export function logFx(ctx: CanvasRenderingContext2D, r: Rect, kind: string) {
  if (DRAW_LOG.on) DRAW_LOG.fx.push({ ...devRect(ctx, r.x, r.y, r.w, r.h), kind });
}
/**
 * 绘制记录里盖住 (x, y)（当前坐标系）的最上面一块够不透明（≥ minAlpha，默认 0.85）的盒子的底色；没开记录、没盖住时 null。
 * M12a-04：继续提示这类直接压在背景上的字按底下的明暗选字色（HudSystem 画的时候记录一直开着；位图背景不进记录，按没盖住算）
 */
export function colorUnder(ctx: CanvasRenderingContext2D, x: number, y: number, minAlpha = 0.85): string | null {
  if (!DRAW_LOG.on) return null;
  const m = ctx.getTransform();
  const px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f;
  for (let i = DRAW_LOG.boxes.length - 1; i >= 0; i--) {
    const b = DRAW_LOG.boxes[i];
    if (b.color && b.cw === ctx.canvas.width && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h && alphaOf(b.color) >= minAlpha) return b.color;
  }
  return null;
}
/** 在特效里画的字打上 fx 标记 */
export function inFx<T>(f: () => T): T {
  DRAW_LOG.inFx++;
  try { return f(); } finally { DRAW_LOG.inFx--; }
}

/*
 * 伪本地化（chk.overflow，M8b）：把界面文字按比例加长（模拟翻译成英 / 德 / 俄后变长），量宽与画字都走它，
 * 所以按文字量宽排的版会跟着变宽，写死宽度的地方就会溢出、被检查标出来。纯数字、单个字符（按键、图标字）不加长。
 */
export const PSEUDO = { pct: 0 };
/** 文字缩放（a11y.textScale，M8b）：画字与量宽统一乘的字号倍数，HudSystem 按当前一侧的主题设 */
export const TEXT_K = { k: 1 };
/**
 * HUD 品质下限（docs/workbench-redesign.md §8 P0，轨道 E）。画字、量字、画盒子统一按它兜底，皮肤 / 元素写的数比它大时不动：
 *   textMin  文字字号下限（设计单位，960 × 540 画布 = 1080p 的一半）：11 = 22px@1080p，字号阶梯里「标签」的硬下限；
 *   fixedMin 贴在固定尺寸图形上的小字（fixedSize：格子角标、键位、徽章数）的下限：10.5 = 21px@1080p（格子不随字长大，留半档）；
 *   lineDev  线宽下限（设备像素）：任何描线都不细于 1 个设备像素（compose/layers.ts 给 HUD 画布装的线宽下限）；
 *   stroke   盒子描边下限（设计单位）：1.5 = 3px@1080p；
 *   halo     没有不透明底（盒子不透明度 < 0.85）的字自动加一圈反差描边 + 软投影（亮场景上的字，§8 RC3 ①）。
 * on = false 时全部关掉（开发 / QA 对照改前的样子：__gae.hudQa.floors(false)）
 */
export const QUALITY = { on: true, textMin: 11, fixedMin: 10.5, lineDev: 1, stroke: 1.5, halo: true };
/**
 * 这一侧主题的下限豁免（审查修复：下限是默认的兜底，不是覆盖）。compose/layers.ts 每次合成前按 th.floors 设（theme.ts 的 floorsOf）：
 *   textK  字号下限的倍数：皮肤之后的层（手动 / 复刻 / 用户选的预设）显式给了更小的基准字号 / 文字缩放 / UI 缩放时按比例降（显式的小字照它画、层级不塌平）；
 *   fade   淡字抬到 78%（显式给了 col.muted 时关）；
 *   halo   自动反差描边（显式给了 typ.legibility，含 none，时关）；
 *   stroke 盒子描边 1.5 单位下限（显式给了 vis.strokeWidth 时关；1 设备像素的线宽下限照旧）
 * 不经 composeLayers 的画（单元测试、离屏工具）保持全开（与原来一样）
 */
export const FLOOR = { textK: 1, fade: true, halo: true, stroke: true };
export function setFloors(f: Partial<typeof FLOOR> | undefined) { Object.assign(FLOOR, { textK: 1, fade: true, halo: true, stroke: true }, f ?? {}); }
/** 下限状态的签名（烘焙缓存的键要带上：同一块画法开 / 关描边下限画出来不一样） */
export const floorSig = () => (QUALITY.on ? `${FLOOR.textK.toFixed(3)}${FLOOR.stroke ? 's' : ''}` : 'off');
/**
 * 按品质下限兜底的字号（设计单位；像素字族按原生 12 兜底）。量字与画字都过它，所以按量出来的字宽排的盒子跟着变宽。
 * k = 画布上这段字的局部缩放（被避让收缩 / 后退缩小的元素在变换里画）：0.7 ≤ k < 1 时按画出来的大小兜底（局部字号 = 下限 / k）；
 * 更小的缩放是有意画的缩略图（卡面预览、远处的牌子），只按局部字号兜底
 */
export function flooredSize(o: Pick<TextOpts, 'size' | 'fixedSize' | 'font'>, k = 1): number {
  if (!QUALITY.on) return o.size;
  const min0 = (/"GAE Pixel"/.test(o.font ?? '') ? 12 : o.fixedSize ? QUALITY.fixedMin : QUALITY.textMin) * FLOOR.textK;
  const min = k >= 0.7 && k < 0.999 ? min0 / k : min0;
  return o.size >= min ? o.size : min;
}
/** 这段字在这张画布上实际画出来的字号（含文字缩放与品质下限）：按字排版的行高用它（审查修复：行高原来按没抬的字号算，抬过的字两行叠在一起） */
export function drawnSize(ctx: CanvasRenderingContext2D, o: Pick<TextOpts, 'size' | 'fixedSize' | 'font'>): number {
  const s = TEXT_K.k !== 1 && !o.fixedSize ? o.size * TEXT_K.k : o.size;
  return QUALITY.on ? flooredSize({ ...o, size: s }, localScale(ctx)) : s;
}
/**
 * 这张画布当前变换相对绘制单位的缩放（flooredSize 的 k）：只算 HUD 的主画布（装过线宽下限的那几张，变换 = S × 局部缩放）；
 * 量字用的离屏 / 只量不画画布、单元测试的替身按 1
 */
function localScale(ctx: CanvasRenderingContext2D): number {
  if (!HUD_CANVAS.has(ctx) || typeof ctx.getTransform !== 'function') return 1;
  const m = ctx.getTransform(), s = sOf(ctx);
  return s > 0 ? Math.hypot(m.a, m.b) / s : 1;
}
/** 字体加载的版本（HudSystem 每次合成前写 hudFontsVersion()；fonts.ts 用 Vite 的 import.meta.glob，构图代码不直接引它）：模板测量的记忆按它失效（审查修复 A · L7） */
export const FONT_EPOCH = { v: 0 };
const pseudo = (s: string) => {
  if (!PSEUDO.pct || s.length < 2 || !/\p{L}/u.test(s)) return s;
  const n = Math.ceil([...s].length * PSEUDO.pct);
  return s + (/[　-鿿＀-￯]/.test(s) ? '～' : '~').repeat(n);
};
const devRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  const m = ctx.getTransform();
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, w: w * Math.hypot(m.a, m.b), h: h * Math.hypot(m.c, m.d), cw: ctx.canvas.width };
};

/**
 * 饰件的绘制上下文（M12a-07，HudSystem 每次重画、每画一屏前设置）：where = 现在画的是局内 HUD 还是界面模板 / 菜单（ast.ornamentScope 用），
 * frame = 画面矩形（largePanels 的大小基准，设计单位）；最小面板 ast.ornamentMinSize 在 theme.ts 里已用 px1080 换成设计单位（M12a-05）
 */
export const ORN: { where: 'hud' | 'screen'; frame: Rect | null } = { where: 'hud', frame: null };

/**
 * S = 画布像素 / 绘制单位（= 画布像素 / CSS 像素 × HUD 画布缩放 unitK，M12a-05）：Canvas 的阴影偏移与模糊不受变换矩阵影响，要自己乘；
 * C = 画布像素 / CSS 像素：绘制记录（可读性检查）里的字号按 CSS 像素记
 */
let S = 1, C = 1;
export const setPaintScale = (s: number, css = s) => { S = s; C = css; };
/**
 * 按画布层取的缩放（B10 审查修复 ① / ⑩）：按角色像素化（vis.pixelRoles / typ.rasterize，HudSystem 的 pixelPlan）时盒子 / 文字各拆成低分辨率与清晰两层，
 * 每层的「设备像素 / 绘制单位」不同，全局一个 S 时低分辨率层上的阴影、发光、字的软投影放大回来后大了 boxK / textK 倍。
 * of(ctx) = 这张画布（代理画布按当前落墨角色挑中的那一层）的 [S, C]；不是拆出来的层（离屏烘焙、遮罩……）返回 null 用全局值。没拆层时 of = null（原来的，调用逐字节不变）
 */
export const PAINT_LAYERS: { of: ((ctx: CanvasRenderingContext2D) => [number, number] | null) | null } = { of: null };
/** 这张画布的 S（见 PAINT_LAYERS） */
const sOf = (ctx: CanvasRenderingContext2D) => (PAINT_LAYERS.of ? PAINT_LAYERS.of(ctx)?.[0] ?? S : S);
/** 这张画布的 C（可读性记录的字号按 CSS 像素记） */
const cOf = (ctx: CanvasRenderingContext2D) => (PAINT_LAYERS.of ? PAINT_LAYERS.of(ctx)?.[1] ?? C : C);
/** 画布像素 / 绘制单位（S）：自己设 shadowBlur / shadowOffset 的画法要乘它（B8 审查修复 ㉓：花托的光晕原来按绘制单位写，1080p / 4K 上相对节点变小）；给了 ctx 时按它所在的层（B10 审查修复 ⑩） */
export const paintScale = (ctx?: CanvasRenderingContext2D) => (ctx ? sOf(ctx) : S);

export const resolveColor = (c: ColorRef | undefined, pal: SkinPalette, fallback = 'transparent'): string => {
  if (!c) return fallback;
  if (c.startsWith('@')) return pal[c.slice(1) as keyof SkinPalette] ?? fallback;
  return c;
};

/** 可复现的伪随机（抖动、撕边每帧一样） */
function rand(seed: number) {
  let t = (seed * 2654435761) >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// 印刷磨损（vis.edge = printWorn，M12b-47）不改轮廓：是盒子画完以后的斑点侵蚀（fadeBox 里做）
const needsPoly = (s: BoxStyle) => (s.shape && s.shape !== 'box') || (s.edge && s.edge !== 'clean' && s.edge !== 'printWorn') || (s.jitter ?? 0) > 0.001;

/* ---------------- M12b-38 / 39：外形库与生成轮廓 ---------------- */

const CORNER_ORDER: Corner[] = ['tl', 'tr', 'br', 'bl'];
/** 随机外形的种子（M12b-39）：盒子种子（panel() 混进了元素 id）+ 外框尺寸——内缩的路径（双线内线、外框带、贴纸墨环）按外框的尺寸取种子，和外框是同一个形状 */
const shapeSeed = (s: BoxStyle, ow: number, oh: number) => ((((s.seed ?? 1) * 2654435761) >>> 0) ^ Math.imul(Math.round(ow) + 7, 40503) ^ Math.imul(Math.round(oh) + 3, 9973)) >>> 0;
/** 箭头端的尖深（M12b-38）：没给 vis.cornerSize 时 = 高的一半（45° 尖），给了 = 高 × cornerSize% × 2；不超过宽的 45% */
export const arrowTip = (w: number, h: number, s: Pick<BoxStyle, 'shapeSize'> = {}) => Math.min(w * 0.45, h * (s.shapeSize !== undefined ? (s.shapeSize / 100) * 2 : 0.5));
/** 扇贝 / 云边的半径（% 短边，默认 8%，夹在 2~14） */
export const scallopR = (w: number, h: number, s: Pick<BoxStyle, 'shapeSize'> = {}) => Math.max(2, Math.min(14, Math.min(w, h) * (s.shapeSize !== undefined ? s.shapeSize / 100 : 0.08)));
/** 装饰艺术阶梯顶的一级台阶高（给了 vis.cornerSize 时 = 高 × cornerSize%） */
export const stepRise = (w: number, h: number, s: Pick<BoxStyle, 'shapeSize'> = {}) => Math.min(h * (s.shapeSize !== undefined ? s.shapeSize / 100 : 0.12), w * 0.1);
/** 椭圆的横半轴：近方的框里画成竖椭圆（饥荒的头像框），扁长的框贴满 */
const ovalRx = (w: number, h: number) => (w <= h * 1.15 && h <= w * 1.15 ? (w / 2) * 0.8 : w / 2);
/** 矩形周长上的点（t = 0~1，从左上角顺时针） */
function perimPoint(x: number, y: number, w: number, h: number, t: number): [number, number] {
  let d = (((t % 1) + 1) % 1) * 2 * (w + h);
  if (d < w) return [x + d, y];
  d -= w; if (d < h) return [x + w, y + d];
  d -= h; if (d < w) return [x + w - d, y + h];
  d -= w; return [x, y + h - d];
}
/**
 * 一笔干笔刷（brushStroke，M12b-39，ghost-of-tsushima#1）：起笔圆钝、收笔按笔锋长度（vis.brushTip）收尖、上下沿轻微起伏、中线微弯；笔向 vis.brushDir（ltr = 从左往右写，尖在右）
 */
function brushPoints(x: number, y: number, w: number, h: number, s: BoxStyle, R: () => number): [number, number][] {
  const tip = Math.max(0.02, Math.min(0.4, s.brush?.tip ?? 0.12)), rtl = s.brush?.dir === 'rtl', ph = R() * 6.28, N = 28;
  const top: [number, number][] = [], bot: [number, number][] = [];
  const cl = (v: number) => Math.max(y, Math.min(y + h, v));
  for (let i = 0; i <= N; i++) {
    const u = i / N, t = rtl ? 1 - u : u;
    const f = t < 0.06 ? Math.sqrt(t / 0.06) * 0.8 + 0.2 : t > 1 - tip ? Math.max(0.04, (1 - t) / tip) : 1;
    const cy = y + h / 2 + h * 0.04 * Math.sin(t * 2.4 + ph), ht = (h / 2) * 0.94 * f * (1 + 0.04 * Math.sin(t * 9 + ph * 2));
    top.push([x + u * w, cl(cy - ht)]); bot.push([x + u * w, cl(cy + ht * (0.93 + 0.05 * Math.sin(t * 5 + ph)))]);
  }
  return [...top, ...bot.reverse()];
}
/**
 * 干笔刷的飞白（vis.brushDryness > 0）：笔尾一段里几道细长的楔形缺口（与外形反向绕行，nonzero 裁剪时成洞；只进填充的裁剪，描边不画它们）。
 * 种子与外形分开（改飞白不改笔形）；越干道数越多、伸得越长
 */
function brushHoles(x: number, y: number, w: number, h: number, s: BoxStyle, ow: number, oh: number): [number, number][][] {
  // 没给干笔刷参数时按参数表的兜底（飞白 0.4）
  const dry = Math.max(0, Math.min(1, s.brush?.dryness ?? 0.4));
  if (dry <= 0) return [];
  const R = rand(shapeSeed(s, ow, oh) ^ 0x5bd1e995), tip = Math.max(0.02, Math.min(0.4, s.brush?.tip ?? 0.12)), rtl = s.brush?.dir === 'rtl';
  const n = 2 + Math.round(dry * 6), out: [number, number][][] = [];
  for (let j = 0; j < n; j++) {
    const yc = y + h * (0.16 + (0.68 * (j + 0.5)) / n) + (R() - 0.5) * h * (0.3 / n), th = h * (0.02 + 0.035 * R()) * (0.6 + dry * 0.6);
    const t0 = Math.max(0.3, 1 - tip - (0.12 + 0.45 * dry) * (0.4 + 0.6 * R()));
    const xa = rtl ? x + w * (1 - t0) : x + w * t0, xb = rtl ? x - 2 : x + w + 2;
    // 尖朝笔身的楔形（顺时针外形里反向绕 = 洞）
    out.push(rtl ? [[xa, yc], [xb, yc - th / 2], [xb, yc + th / 2]] : [[xa, yc], [xb, yc + th / 2], [xb, yc - th / 2]]);
  }
  return out;
}

/** 基本外形的采样点（顺时针），供撕边 / 锯齿 / 笔触 / 抖动扰动；ow / oh = 外框尺寸（随机外形的种子，内缩路径与外框同形） */
function shapePoints(x: number, y: number, w: number, h: number, s: BoxStyle, ow = w, oh = h): [number, number][] {
  const P: [number, number][] = [];
  const cx = x + w / 2, cy = y + h / 2;
  switch (s.shape) {
    case 'oval': { const rx = ovalRx(w, h); for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; P.push([cx + Math.cos(a) * rx, cy + (Math.sin(a) * h) / 2]); } return P; }
    case 'octagon': { const k = Math.min(w, h) * 0.293; return [[x + k, y], [x + w - k, y], [x + w, y + k], [x + w, y + h - k], [x + w - k, y + h], [x + k, y + h], [x, y + h - k], [x, y + k]]; }
    case 'arrowRight': { const t = arrowTip(w, h, s); return [[x, y], [x + w - t, y], [x + w, cy], [x + w - t, y + h], [x, y + h]]; }
    case 'arrowLeft': { const t = arrowTip(w, h, s); return [[x + t, y], [x + w, y], [x + w, y + h], [x + t, y + h], [x, cy]]; }
    case 'arch': {
      // 拱顶：下面方、上面半椭圆（高不超过 0.6 × 盒高）
      const ry = Math.min(w / 2, h * 0.6);
      P.push([x, y + h], [x, y + ry]);
      for (let i = 1; i < 16; i++) { const a = Math.PI + (i / 16) * Math.PI; P.push([cx + (Math.cos(a) * w) / 2, y + ry + Math.sin(a) * ry]); }
      P.push([x + w, y + ry], [x + w, y + h]);
      return P;
    }
    case 'stepped': {
      // 装饰艺术的两级阶梯顶：中段最高、两侧各低一级
      const s1 = stepRise(w, h, s), a = w * 0.14, b = w * 0.28;
      return [[x, y + h], [x, y + 2 * s1], [x + a, y + 2 * s1], [x + a, y + s1], [x + b, y + s1], [x + b, y], [x + w - b, y], [x + w - b, y + s1], [x + w - a, y + s1], [x + w - a, y + 2 * s1], [x + w, y + 2 * s1], [x + w, y + h]];
    }
    case 'scallop': {
      // 扇贝 / 云边：内缩 rr 的框，四边各排一串向外的半圆（团块气泡、云朵页签）
      const rr = scallopR(w, h, s), x0 = x + rr, y0 = y + rr, x1 = x + w - rr, y1 = y + h - rr;
      const side = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
        const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / (rr * 2)));
        for (let j = 0; j < n; j++) for (let k = 0; k < 6; k++) {
          const u = (j + k / 6) / n, bump = Math.sin((k / 6) * Math.PI) * rr;
          P.push([ax + (bx - ax) * u + nx * bump, ay + (by - ay) * u + ny * bump]);
        }
      };
      side(x0, y0, x1, y0, 0, -1); side(x1, y0, x1, y1, 1, 0); side(x1, y1, x0, y1, 0, 1); side(x0, y1, x0, y0, -1, 0);
      return P;
    }
    case 'randomQuad': {
      // 逐角随机的不规则四边形（persona5#1）：每个角往里偏 0~vis.shapeJitter × 短边（种子 = 盒子种子 + 外框尺寸，帧间稳定）
      const R = rand(shapeSeed(s, ow, oh)), j = Math.max(0, Math.min(0.3, s.shapeJitter ?? 0.08)) * Math.min(ow, oh);
      return [[x + R() * j, y + R() * j], [x + w - R() * j, y + R() * j], [x + w - R() * j, y + h - R() * j], [x + R() * j, y + h - R() * j]];
    }
    case 'shard': {
      // 尖碎片：沿矩形周长取 5~7 个点，隔一个往中心收一截（尖角朝外）
      const R = rand(shapeSeed(s, ow, oh)), n = 5 + Math.floor(R() * 3), t0 = R();
      for (let i = 0; i < n; i++) {
        const [px, py] = perimPoint(x, y, w, h, t0 + i / n + ((R() - 0.5) * 0.5) / n);
        const pull = i % 2 ? 0.14 + R() * 0.3 : R() * 0.04;
        P.push([px + (cx - px) * pull, py + (cy - py) * pull]);
      }
      return P;
    }
    case 'brushStroke': return brushPoints(x, y, w, h, s, rand(shapeSeed(s, ow, oh)));
    // M12b-63 外形余项（K1 G-silhouette）：回旋镖 / 肾形（原子朋克：上沿一道往下凹的弧、下沿往外鼓）、四分之一圆底座（右下大圆角的展台）、圆盾（北欧：正圆）
    case 'boomerang': {
      for (let i = 0; i <= 16; i++) { const t = i / 16; P.push([x + t * w, y + h * 0.18 + Math.sin(t * Math.PI) * h * 0.22]); }
      for (let i = 16; i >= 0; i--) { const t = i / 16, tip = Math.max(0, 0.15 - Math.min(t, 1 - t)) * h * 1.2; P.push([x + t * w, y + h * 0.82 + Math.sin(t * Math.PI) * h * 0.18 - tip]); }
      return P;
    }
    case 'quarterCircleBase': {
      // 左上方角、右下一个占短边 85% 的大圆角（台座 / 展台的四分之一圆）
      const q = Math.min(w, h) * 0.85;
      P.push([x, y], [x + w, y], [x + w, y + h - q]);
      for (let i = 1; i < 16; i++) { const a = (i / 16) * (Math.PI / 2); P.push([x + w - q + Math.cos(a) * q, y + h - q + Math.sin(a) * q]); }
      P.push([x + w - q, y + h], [x, y + h]);
      return P;
    }
    case 'roundShield':
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, rr = Math.min(w, h) / 2; P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      return P;
    case 'circle':
      for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; P.push([cx + (Math.cos(a) * w) / 2, cy + (Math.sin(a) * h) / 2]); }
      return P;
    case 'diamond': return [[cx, y], [x + w, cy], [cx, y + h], [x, cy]];
    case 'hexagon': { const k = Math.min(w, h) * 0.28; return [[x + k, y], [x + w - k, y], [x + w, cy], [x + w - k, y + h], [x + k, y + h], [x, cy]]; }
    case 'shield': return [[x, y], [x + w, y], [x + w, y + h * 0.6], [cx, y + h], [x, y + h * 0.6]];
    case 'shieldTail': return [[x, y], [x + w, y], [x + w, y + h * 0.82], [cx, y + h], [x, y + h * 0.82]];
    case 'ribbon': { const k = Math.min(h * 0.45, w * 0.2); return [[x, y], [x + w, y], [x + w - k, cy], [x + w, y + h], [x, y + h], [x + k, cy]]; }
    case 'trapezoid': { const k = Math.min(w * 0.12, h * 0.5); return [[x + k, y], [x + w - k, y], [x + w, y + h], [x, y + h]]; }
    default: break;
  }
  const rad = radiusOf({ x, y, w, h }, s);
  const rr = typeof rad === 'number' ? Math.min(rad, w / 2, h / 2) : 0;
  const mask = s.cornerMask;
  if (s.chamfer && !mask) { const c = s.chamfer; return [[x + c, y], [x + w, y], [x + w, y + h - c], [x + w - c, y + h], [x, y + h], [x, y + c]]; }
  // 分角遮罩（vis.cornerMask，M12b-38）：只切 / 只圆这几个角，其余是直角
  if (s.chamfer && mask) return maskedChamfer(x, y, w, h, s.chamfer, mask);
  if (rr <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const arc = (ax: number, ay: number, a0: number) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); P.push([ax + Math.cos(a) * rr, ay + Math.sin(a) * rr]); } };
  const corner = (c: Corner, ax: number, ay: number, a0: number, px: number, py: number) => (!mask || mask.includes(c) ? arc(ax, ay, a0) : P.push([px, py]));
  corner('tr', x + w - rr, y + rr, -Math.PI / 2, x + w, y);
  corner('br', x + w - rr, y + h - rr, 0, x + w, y + h);
  corner('bl', x + rr, y + h - rr, Math.PI / 2, x, y + h);
  corner('tl', x + rr, y + rr, Math.PI, x, y);
  return P;
}

/** 分角切角的点列（顺时针，从左上角起）：mask 里的角切掉 c，其余直角 */
function maskedChamfer(x: number, y: number, w: number, h: number, c: number, mask: Corner[]): [number, number][] {
  const on = (k: Corner) => mask.includes(k), P: [number, number][] = [];
  if (on('tl')) P.push([x, y + c], [x + c, y]); else P.push([x, y]);
  if (on('tr')) P.push([x + w - c, y], [x + w, y + c]); else P.push([x + w, y]);
  if (on('br')) P.push([x + w, y + h - c], [x + w - c, y + h]); else P.push([x + w, y + h]);
  if (on('bl')) P.push([x + c, y + h], [x, y + h - c]); else P.push([x, y + h]);
  return P;
}
/** 分角像素台阶（vis.corner = step + vis.cornerMask）：mask 里的角切两级台阶，其余直角 */
function maskedStep(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, mask: Corner[]) {
  const on = (c: Corner) => mask.includes(c);
  const P: [number, number][] = [
    ...(on('tl') ? [[x, y + 2 * k], [x + k, y + 2 * k], [x + k, y + k], [x + 2 * k, y + k], [x + 2 * k, y]] : [[x, y]]),
    ...(on('tr') ? [[x + w - 2 * k, y], [x + w - 2 * k, y + k], [x + w - k, y + k], [x + w - k, y + 2 * k], [x + w, y + 2 * k]] : [[x + w, y]]),
    ...(on('br') ? [[x + w, y + h - 2 * k], [x + w - k, y + h - 2 * k], [x + w - k, y + h - k], [x + w - 2 * k, y + h - k], [x + w - 2 * k, y + h]] : [[x + w, y + h]]),
    ...(on('bl') ? [[x + 2 * k, y + h], [x + 2 * k, y + h - k], [x + k, y + h - k], [x + k, y + h - 2 * k], [x, y + h - 2 * k]] : [[x, y + h]]),
  ] as [number, number][];
  P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
}

/** 沿外形每隔约 step 像素重采样（让扰动均匀） */
function resample(P: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

function perturbed(x: number, y: number, w: number, h: number, s: BoxStyle, ow = w, oh = h): [number, number][] {
  const base = shapePoints(x, y, w, h, s, ow, oh);
  const edge = s.edge ?? 'clean', jit = s.jitter ?? 0;
  if (edge === 'clean' && jit <= 0.001) return base;
  const R = rand(s.seed ?? 1);
  // 采样步长：锯齿 6、毛边纸 2（细纤维）、扇贝边 3，其余 4（原来的）
  const step = edge === 'jagged' ? 6 : edge === 'deckle' ? 2 : edge === 'scallop' ? 3 : 4;
  const pts = resample(base, step);
  const cx = x + w / 2, cy = y + h / 2;
  const phase = R() * 10;
  // 分边处理（vis.edgeSides，M12b-39）：点按离它最近的那条边归属，不在所选边上的只留手绘抖动；扇贝边的波长与幅度按短边
  const sides = s.edgeSides, short = Math.min(w, h), lam = Math.max(6, short * 0.09), amp = Math.min(4.5, short * 0.045);
  const sideOf = (px: number, py: number) => { const t = py - y, b = y + h - py, l = px - x, r = x + w - px, m = Math.min(t, b, l, r); return m === t ? 't' : m === b ? 'b' : m === l ? 'l' : 'r'; };
  return pts.map(([px, py], i) => {
    // 朝外的方向近似为离开中心的方向
    const dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    let d = 0;
    if (edge === 'torn') d = -(R() ** 2) * 4.5;
    else if (edge === 'jagged') d = i % 2 ? 3 : -2;
    else if (edge === 'brush') d = Math.sin(i * 0.35 + phase) * 1.6 + (R() - 0.5) * 2.4;
    else if (edge === 'ornate') d = Math.abs(Math.sin(i * 0.5)) * 3.5 - 1;
    // 烧边（M12b-39）：比撕边咬得更深、更不规则（焦边的暗色在 drawBox 里另画）；毛边纸：细碎纤维；扇贝边：一串半圆
    else if (edge === 'burnt') d = -(R() ** 1.6) * 6 - Math.abs(Math.sin(i * 0.23 + phase)) * 1.8;
    else if (edge === 'deckle') d = (R() - 0.5) * 2 + Math.sin(i * 1.9 + phase) * 0.45;
    else if (edge === 'scallop') d = (Math.abs(Math.sin(((i * step) / lam) * Math.PI)) - 0.75) * amp;
    if (sides && !sides.includes(sideOf(px, py))) d = 0;
    d += Math.sin(i * 0.12 + phase) * jit * 3 + (R() - 0.5) * jit * 1.5;
    return [px + nx * d, py + ny * d] as [number, number];
  });
}

/** 圆角半径：按短边百分比（vis.cornerSize）优先 */
function radiusOf(r: Rect, s: BoxStyle): Radius | undefined {
  // 百分比圆角封顶 40px：HUD 小面板照样是药丸形，整屏菜单、抽屉这类大面板不会变成椭圆
  if (s.radiusPct !== undefined) return Math.min(40, (Math.min(r.w, r.h) * s.radiusPct) / 100);
  return s.radius;
}

/**
 * 把盒子的外形加进当前路径；inset > 0 时整体内缩（双线边框的内线、边框内的填充区域），< 0 时外扩（贴纸描边的外墨环）。
 * holes = 干笔刷的飞白缺口也加进去（只给填充的裁剪用，M12b-39）
 */
export function boxPath(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, inset = 0, holes = false) {
  const x = r.x + inset, y = r.y + inset, w = Math.max(0, r.w - inset * 2), h = Math.max(0, r.h - inset * 2);
  if (needsPoly(s)) {
    const P = perturbed(x, y, w, h, s, r.w, r.h);
    P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    if (holes && s.shape === 'brushStroke') for (const q of brushHoles(x, y, w, h, s, r.w, r.h)) { q.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); }
    return;
  }
  if (s.step && s.cornerMask) { maskedStep(ctx, x, y, w, h, Math.max(1, s.step - inset * 0.5), s.cornerMask); return; }
  if (s.step) {
    // 像素台阶转角：每个角切两级台阶
    const k = Math.max(1, s.step - inset * 0.5);
    ctx.moveTo(x + 2 * k, y); ctx.lineTo(x + w - 2 * k, y); ctx.lineTo(x + w - 2 * k, y + k); ctx.lineTo(x + w - k, y + k); ctx.lineTo(x + w - k, y + 2 * k); ctx.lineTo(x + w, y + 2 * k);
    ctx.lineTo(x + w, y + h - 2 * k); ctx.lineTo(x + w - k, y + h - 2 * k); ctx.lineTo(x + w - k, y + h - k); ctx.lineTo(x + w - 2 * k, y + h - k); ctx.lineTo(x + w - 2 * k, y + h);
    ctx.lineTo(x + 2 * k, y + h); ctx.lineTo(x + 2 * k, y + h - k); ctx.lineTo(x + k, y + h - k); ctx.lineTo(x + k, y + h - 2 * k); ctx.lineTo(x, y + h - 2 * k);
    ctx.lineTo(x, y + 2 * k); ctx.lineTo(x + k, y + 2 * k); ctx.lineTo(x + k, y + k); ctx.lineTo(x + 2 * k, y + k); ctx.closePath();
    return;
  }
  if (s.circle) {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return;
  }
  if (s.chamfer && s.cornerMask) {
    maskedChamfer(x, y, w, h, Math.max(0, s.chamfer - inset * 0.4), s.cornerMask).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    return;
  }
  if (s.chamfer) {
    const c = Math.max(0, s.chamfer - inset * 0.4);
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + c);
    ctx.closePath();
    return;
  }
  const radii = radiusList(radiusOf(r, s), inset, s.cornerMask);
  if (!radii) ctx.rect(x, y, w, h);
  else ctx.roundRect(x, y, w, h, radii);
}

/** 圆角表（左上、右上、右下、左下）；mask（vis.cornerMask，M12b-38）给了时不在里面的角是直角 */
function radiusList(r: Radius | undefined, inset: number, mask?: Corner[]): (number | DOMPointInit)[] | null {
  if (r === undefined || r === 0) return null;
  const list = typeof r === 'number' ? [r, r, r, r] : r;
  const out = list.map((v) => (typeof v === 'number' ? Math.max(0, v - inset) : { x: Math.max(0, v.x - inset), y: Math.max(0, v.y - inset) }));
  return mask ? out.map((v, i) => (mask.includes(CORNER_ORDER[i]) ? v : 0)) : out;
}

/** 填充：纯色、线性 / 径向渐变、图案（在当前裁剪区域里画） */
export function fillPaint(ctx: CanvasRenderingContext2D, r: Rect, p: Paint | undefined, pal: SkinPalette) {
  if (!p) return;
  if ('solid' in p) {
    ctx.fillStyle = resolveColor(p.solid, pal);
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    return;
  }
  if ('linear' in p) {
    // CSS 的渐变线：穿过中心，角度 θ（0 = 向上），长度 |w·sinθ| + |h·cosθ|
    const a = (p.linear.angle * Math.PI) / 180;
    const len = Math.abs(r.w * Math.sin(a)) + Math.abs(r.h * Math.cos(a));
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    for (const [t, c] of p.linear.stops) g.addColorStop(t, resolveColor(c, pal));
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    return;
  }
  if ('radial' in p) {
    const [ax, ay] = p.radial.at ?? [0.5, 0.5];
    const cx = r.x + r.w * ax, cy = r.y + r.h * ay;
    // 半径到最远的角（CSS 默认 farthest-corner）
    const fx = Math.max(ax, 1 - ax) * r.w, fy = Math.max(ay, 1 - ay) * r.h;
    ctx.save();
    if (p.radial.shape === 'circle') {
      const rad = Math.hypot(fx, fy);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      for (const [t, c] of p.radial.stops) g.addColorStop(t, resolveColor(c, pal));
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    } else {
      // 椭圆：按宽高比把圆形渐变压扁；椭圆的 farthest-corner 半径是 √2 倍的半轴
      const rx = fx * Math.SQRT2, ry = fy * Math.SQRT2;
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      for (const [t, c] of p.radial.stops) g.addColorStop(t, resolveColor(c, pal));
      ctx.fillStyle = g;
      ctx.fillRect(-rx - 2, -rx - 2, rx * 2 + 4, rx * 2 + 4);
    }
    ctx.restore();
    return;
  }
  const pt = p.pattern;
  if (pt.bg) {
    ctx.fillStyle = resolveColor(pt.bg, pal);
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  }
  ctx.fillStyle = resolveColor(pt.fg, pal);
  ctx.strokeStyle = ctx.fillStyle;
  // 图块铺（审查修复 A · L9，与 drawOverlay 同一套图块缓存）：一个周期画一块，createPattern 一次铺满——漫画皮肤的点底原来每个点一条路径（任务页一帧 2 万多个点）
  if (fillPatternTiled(ctx, r, pt, resolveColor(pt.fg, pal))) return;
  if (pt.kind === 'stripes') {
    // 竖条：每个周期前 line 像素有色（CSS repeating-linear-gradient(90deg, c 0 line, transparent line size)）
    for (let x = r.x; x < r.x + r.w; x += pt.size) ctx.fillRect(x, r.y, Math.min(pt.line, r.x + r.w - x), r.h);
  } else if (pt.kind === 'ruled') {
    // 横格纸：每 size 像素一条线，线在周期末尾（CSS repeating-linear-gradient(0deg, bg 0 size-line, fg size-line size)，从下往上）
    for (let y = r.y + r.h - pt.size; y > r.y - pt.size; y -= pt.size) ctx.fillRect(r.x, y, r.w, pt.line);
  } else if (pt.kind === 'dots') {
    for (let y = r.y; y < r.y + r.h; y += pt.size) for (let x = r.x; x < r.x + r.w; x += pt.size) {
      ctx.beginPath();
      ctx.arc(x, y, pt.line, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 斜条纹（-45°）
    ctx.lineWidth = pt.line / Math.SQRT2 * 1.41;
    const step = pt.size * Math.SQRT2;
    for (let d = -r.h; d < r.w + r.h; d += step) {
      ctx.beginPath();
      ctx.moveTo(r.x + d, r.y + r.h);
      ctx.lineTo(r.x + d + r.h, r.y);
      ctx.stroke();
    }
  }
}

/**
 * 外层已经套了斜切（M12a-06）：整块元素 / 按钮 / 格子 / 标牌连字一起斜（withSkew），里面的盒子不再各自斜一次（drawBox 看它）。
 * depth = 嵌套层数；旋转（vis.jitter / vis.tilt）不受影响——只有斜切带动文字，倾角只转盒子
 */
export const SKEW = { depth: 0 };
/** 在 deg 度的横向斜切下画（绕 r 的中心，几块画布一起）；deg = 0 或外层已经斜过时直接画 */
export function withSkew(ctxs: CanvasRenderingContext2D[], r: Rect, deg: number | undefined, draw: () => void) {
  if (!deg || SKEW.depth) return draw();
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, k = Math.tan((deg * Math.PI) / 180);
  // 同一块画布只斜一次（中期审查修复 ㉚：调用方传 [e.g, e.tx]，文字画布就是主画布时原来斜了两遍——模板里的格子 / 按钮 / 标牌是面板的 2 倍斜度，像素皮肤（分开的文字画布）才对）
  const cs = [...new Set(ctxs)];
  for (const c of cs) { c.save(); c.translate(cx, cy); c.transform(1, 0, k, 1, 0, 0); c.translate(-cx, -cy); }
  SKEW.depth++;
  try { draw(); } finally { SKEW.depth--; for (const c of cs) c.restore(); }
}

/* ---------------- M12b-63 K1 视觉语言余项：叠纸、做旧、玻璃亮边与颗粒 ---------------- */

/** 确定的伪随机（做旧的污渍位置按盒子尺寸取种子，帧间稳定） */
function seeded(seed: number) { let t = (seed * 2654435761) >>> 0 || 1; return () => { t += 0x6d2b79f5; let z = t; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; }; }
/** 叠纸：后面 n 张纸（每张往右下错 3 × k、转 ±1.4°，底色比面板暗 6% × k、软投影） */
function paperStack(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, pal: SkinPalette) {
  const base = s.bg && 'solid' in s.bg ? resolveColor(s.bg.solid, pal) : '#f2ecdc', n = Math.max(1, Math.min(3, s.paperStack ?? 2));
  for (let k = n; k >= 1; k--) {
    ctx.save();
    const cx = r.x + r.w / 2 + k * 3, cy = r.y + r.h / 2 + k * 2.4;
    ctx.translate(cx, cy); ctx.rotate(((k % 2 ? 1 : -1) * 1.4 * Math.PI) / 180); ctx.translate(-r.w / 2, -r.h / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 6 * sOf(ctx); ctx.shadowOffsetY = 2 * sOf(ctx);
    ctx.fillStyle = mix(withAlpha(base, 1), '#000', 0.06 * k); ctx.fillRect(0, 0, r.w, r.h);
    ctx.restore();
  }
}
/**
 * 做旧（ast.aging）：yellowed = 四周泛黄暗角；stains = 两三块淡褐污渍；creases = 一横一竖的折痕（亮暗两道线）；coffeeRing = 一圈不均匀的咖啡渍；
 * staples = 左上角两枚订书钉；photocopy = 复印噪点（细碎的暗点）。种子 = 盒子尺寸 + 逐块序号 seed（B10 审查修复 ⑭：原来只按尺寸，同尺寸的卡 / 行 / 面板一模一样，像盖的章；
 * 序号按画的顺序、帧间稳定）。小盒子不画咖啡圈（短边 < 48）与订书钉（< 60 × 40）
 */
function drawAging(ctx: CanvasRenderingContext2D, r: Rect, kinds: string[], seed = 0) {
  const R0 = seeded(Math.round(r.w) * 131 + Math.round(r.h) + seed * 7919), m = Math.min(r.w, r.h);
  ctx.save();
  if (kinds.includes('yellowed')) {
    const gr = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, m * 0.3, r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) * 0.6);
    gr.addColorStop(0, 'rgba(180,140,60,0)'); gr.addColorStop(1, 'rgba(150,105,35,0.32)'); ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  if (kinds.includes('stains')) for (let i = 0; i < 3; i++) {
    const x = r.x + R0() * r.w, y = r.y + R0() * r.h, rr = m * (0.08 + R0() * 0.1);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,80,30,0.16)'); gr.addColorStop(0.75, 'rgba(120,80,30,0.1)'); gr.addColorStop(1, 'rgba(120,80,30,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.2, rr, R0() * 3, 0, Math.PI * 2); ctx.fill();
  }
  if (kinds.includes('creases')) {
    const fx = r.x + r.w * (0.35 + R0() * 0.3), fy = r.y + r.h * (0.4 + R0() * 0.2);
    for (const [c, d] of [['rgba(0,0,0,0.16)', 0], ['rgba(255,255,255,0.3)', 1]] as [string, number][]) {
      ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx + d, r.y); ctx.lineTo(fx + d + r.w * 0.01, r.y + r.h); ctx.moveTo(r.x, fy + d); ctx.lineTo(r.x + r.w, fy + d - r.h * 0.01); ctx.stroke();
    }
  }
  if (kinds.includes('coffeeRing') && m >= 48) {
    const x = r.x + r.w * (0.65 + R0() * 0.2), y = r.y + r.h * (0.6 + R0() * 0.25), rr = m * 0.16;
    ctx.lineWidth = Math.max(1.5, m * 0.012);
    for (let i = 0; i < 24; i++) { const a0 = (i / 24) * Math.PI * 2; ctx.strokeStyle = `rgba(110,65,25,${(0.12 + R0() * 0.2).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, rr * (0.97 + R0() * 0.06), a0, a0 + Math.PI / 12 + 0.02); ctx.stroke(); }
  }
  if (kinds.includes('staples') && r.w >= 60 && r.h >= 40) {
    ctx.fillStyle = '#8f949a'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
    for (const [dx, dy, a] of [[0.06, 0.05, -0.6], [0.06, 0.11, -0.6]] as const) { ctx.save(); ctx.translate(r.x + r.w * dx + 8, r.y + r.h * dy + 6); ctx.rotate(a); ctx.fillRect(-7, -1.2, 14, 2.4); ctx.strokeRect(-7, -1.2, 14, 2.4); ctx.restore(); }
  }
  if (kinds.includes('photocopy')) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const n = Math.min(260, Math.round((r.w * r.h) / 260));
    for (let i = 0; i < n; i++) { const s0 = R0() < 0.85 ? 0.8 : 1.6; ctx.fillRect(r.x + R0() * r.w, r.y + R0() * r.h, s0, s0); }
  }
  ctx.restore();
}
/** 玻璃颗粒（vis.grain）：细碎的亮 / 暗点（防色带），密度按 grain */
function grainDots(ctx: CanvasRenderingContext2D, r: Rect, k: number) {
  const R0 = seeded(Math.round(r.w) * 17 + Math.round(r.h) * 3), n = Math.min(400, Math.round(((r.w * r.h) / 90) * k));
  ctx.save();
  for (let i = 0; i < n; i++) { ctx.fillStyle = R0() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; ctx.fillRect(r.x + R0() * r.w, r.y + R0() * r.h, 1, 1); }
  ctx.restore();
}
/** 玻璃亮边（vis.edgeLight）：top / left / topLeft / all 这几条边里侧一道往里渐隐的亮线 */
function glassEdge(ctx: CanvasRenderingContext2D, r: Rect, edge: string) {
  const w = Math.max(1, Math.min(r.w, r.h) * 0.02), sides = edge === 'all' ? 'tlrb' : edge === 'topLeft' ? 'tl' : edge === 'left' ? 'l' : 't';
  ctx.save();
  for (const sd of sides) {
    const v = sd === 't' || sd === 'b', x0 = sd === 'r' ? r.x + r.w - w * 3 : r.x, y0 = sd === 'b' ? r.y + r.h - w * 3 : r.y;
    const gr = v ? ctx.createLinearGradient(0, sd === 't' ? r.y : r.y + r.h, 0, sd === 't' ? r.y + w * 3 : r.y + r.h - w * 3) : ctx.createLinearGradient(sd === 'l' ? r.x : r.x + r.w, 0, sd === 'l' ? r.x + w * 3 : r.x + r.w - w * 3, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x0, y0, v ? r.w : w * 3, v ? w * 3 : r.h);
  }
  ctx.restore();
}

/** 盒子绕中心旋转 / 倾斜（CSS transform-origin: center） */
export function withTransform(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, draw: () => void) {
  if (!s.rotate && !s.skewX) return draw();
  ctx.save();
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  ctx.translate(cx, cy);
  if (s.rotate) ctx.rotate((s.rotate * Math.PI) / 180);
  if (s.skewX) ctx.transform(1, 0, Math.tan((s.skewX * Math.PI) / 180), 1, 0, 0);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}

/** 画一个盒子：外阴影 → 外圈 → 填充 → 内阴影 → 边框；盒子自己的旋转 / 斜切（rotate / skewX）在这里统一套上（M12a-06，外层已斜过时不再斜） */
/** 盒子描边下限（§8 P0）：边框 / 分边比 QUALITY.stroke 细的抬到它（只改画法，排版的内边距照旧按原来的边宽） */
function strokeFloor(s: BoxStyle): BoxStyle {
  if (!FLOOR.stroke) return s;
  const m = QUALITY.stroke;
  const thin = (b: { width: number } | undefined) => !!b && b.width > 0 && b.width < m;
  if (!thin(s.border) && !(s.sides && (thin(s.sides.t) || thin(s.sides.r) || thin(s.sides.b) || thin(s.sides.l)))) return s;
  const up = <T extends { width: number }>(b: T | undefined): T | undefined => (b && thin(b) ? { ...b, width: m } : b);
  return { ...s, border: up(s.border), sides: s.sides ? { t: up(s.sides.t), r: up(s.sides.r), b: up(s.sides.b), l: up(s.sides.l) } : s.sides };
}
/** 装过线宽下限的画布（HUD 主画布 + 离屏烘焙 / 渐隐的临时画布） */
const LINE_FLOORED = new WeakSet<object>();
/** HUD 的主画布（compose/layers.ts 装的那几张）：「看底下有没有不透明盒子」这类判断只在它上面做 */
const HUD_CANVAS = new WeakSet<object>();
/** 装没装线宽下限（HUD 主画布 + 烘焙 / 渐隐的临时画布；QA 的细线统计只数这些——像素化的低分辨率字层另按美术像素画，不在此列） */
export const hasLineFloor = (ctx: CanvasRenderingContext2D) => LINE_FLOORED.has(ctx);
/** 是不是 HUD 的主画布（compose/layers.ts 装过线宽下限的那几张）：离屏烘焙 / 量字 / 单元测试的替身画布不是 */
export const isHudCanvas = (ctx: CanvasRenderingContext2D) => HUD_CANVAS.has(ctx);
/**
 * 给一张 HUD 画布装线宽下限（§8 P0「没有细于 1 个设备像素的线」）：之后设 lineWidth 时按当前变换换算，细于 QUALITY.lineDev 个设备像素的抬上去。
 * compose/layers.ts 每次合成前给这一侧的画布装（同一张画布只装一次）；不是真画布（单元测试的替身、代理画布）时不装。
 * hud = false：只装线宽下限、不算 HUD 主画布（离屏烘焙 / 渐隐的临时画布，审查修复：原来这些画布不装，烘焙的框与端头可以细于 1 设备像素）
 */
export function installLineFloor(ctx: CanvasRenderingContext2D | undefined, hud = true) {
  if (!ctx || typeof CanvasRenderingContext2D === 'undefined') return;
  if (hud && Object.getPrototypeOf(ctx) === CanvasRenderingContext2D.prototype) HUD_CANVAS.add(ctx);
  if (LINE_FLOORED.has(ctx)) return;
  if (Object.getPrototypeOf(ctx) !== CanvasRenderingContext2D.prototype) return;
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth');
  if (!d?.get || !d.set) return;
  const get = d.get, set = d.set;
  LINE_FLOORED.add(ctx);
  Object.defineProperty(ctx, 'lineWidth', {
    configurable: true, enumerable: true,
    get() { return get.call(this); },
    set(v: number) {
      if (QUALITY.on && v > 0) {
        const m = (this as CanvasRenderingContext2D).getTransform(), k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1, min = QUALITY.lineDev / k;
        if (v < min) v = min;
      }
      set.call(this, v);
    },
  });
}

/** 盒子的四条边按当前变换落到整设备像素上（只在没有旋转 / 斜切时；宽高至少 1 个设备像素） */
function snapRect(ctx: CanvasRenderingContext2D, r: Rect): Rect {
  const m = ctx.getTransform();
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || !m.a || !m.d) return r;
  const X0 = Math.round(m.a * r.x + m.e), X1 = Math.round(m.a * (r.x + r.w) + m.e), Y0 = Math.round(m.d * r.y + m.f), Y1 = Math.round(m.d * (r.y + r.h) + m.f);
  return { x: (X0 - m.e) / m.a, y: (Y0 - m.f) / m.d, w: Math.max(1, X1 - X0) / m.a, h: Math.max(1, Y1 - Y0) / m.d };
}

export function drawBox(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, pal: SkinPalette): void {
  if (QUALITY.on) s = strokeFloor(s);
  // 做旧的逐块序号（B10 审查修复 ⑭）：在最外面这一层填好（旋转 / 渐隐分支里递归画的是同一块，不再数）
  if (s.aging?.length && s.agingSeed === undefined && !BAKING && !(ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) s = { ...s, agingSeed: ++AGING.n };
  const sk = SKEW.depth ? 0 : s.skewX ?? 0;
  if (s.rotate || sk) return withTransform(ctx, r, { rotate: s.rotate, skewX: sk }, () => drawBox(ctx, r, { ...s, rotate: 0, skewX: 0 }, pal));
  // 渐隐遮罩（vis.fade，M12b-41）：整块盒子画进按尺寸缓存的临时画布、按渐变裁掉透明度再贴回来（只裁这块盒子，不动画布上已经画好的东西）
  if ((s.fade && s.fade.dir !== 'none' && s.fade.len > 0) || s.edge === 'printWorn') return fadeBox(ctx, r, s, pal);
  // 对齐到设备像素（§8 RC5，轨道 E）：HUD 主画布上、没有旋转 / 斜切时，盒子的四条边落在整设备像素上（细描边不再糊成两条半透明线）
  if (QUALITY.on && isHudCanvas(ctx)) r = snapRect(ctx, r);
  logBox(ctx, r, s, pal);
  const path = (inset = 0, holes = false) => { ctx.beginPath(); boxPath(ctx, r, s, inset, holes); };
  const big = { x: r.x - 200, y: r.y - 200, w: r.w + 400, h: r.h + 400 };

  const outline = () => boxPath(ctx, r, s);
  // 叠加特效里画在盒子后面的（外发光、放射光、法阵……）
  if (s.fx?.kinds.length) drawFx(ctx, r, s.fx.kinds, resolveColor(s.fx.color, pal, '#fff'), false, outline);
  // 叠纸（vis.depth = layeredPaper，M12b-63）：盒子后面先垫几张错开、略转的纸（比底色暗一档，各带软投影）
  if (s.paperStack) paperStack(ctx, r, s, pal);
  // 外阴影：只画在盒子外面（CSS 的 box-shadow 不会透过半透明底色）
  for (const sh of (s.shadows ?? []).filter((x) => !x.inset)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(big.x, big.y, big.w, big.h);
    boxPath(ctx, r, s);
    ctx.clip('evenodd');
    // 实心厚度（vis.depth = extrude，M12b-36）：沿偏移方向几份副本叠成连续的侧壁（只向一个方向、无模糊），不是一块错位的影子
    if (sh.sweep) { extrudeSweep(ctx, r, s, sh, pal); ctx.restore(); continue; }
    // 盒子本身被上面的 evenodd 裁剪挡掉，只留下外面的影子。不能用"把形状平移到画外、影子偏移回来"的老办法：
    // 盒子旋转时平移沿旋转后的 x 轴走，影子会偏出一大截（手绘皮肤倾斜 0.6° 时偏约 100px）
    ctx.shadowColor = resolveColor(sh.color, pal);
    ctx.shadowBlur = sh.blur * sOf(ctx);
    ctx.shadowOffsetX = sh.x * sOf(ctx);
    ctx.shadowOffsetY = sh.y * sOf(ctx);
    path();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }
  // 贴纸描边的外墨环（vis.stroke = sticker，M12b-37）：画在盒子外面，宽 = 描边宽
  if (s.border?.style === 'sticker' && s.border.width > 0) {
    const w = s.border.width;
    ctx.save();
    ctx.beginPath();
    boxPath(ctx, r, s, -w);
    boxPath(ctx, r, s);
    ctx.fillStyle = resolveColor(s.border.ink ?? '#111', pal);
    ctx.fill('evenodd');
    ctx.restore();
  }
  // 外圈实线（像素风的双层边）
  if (s.ring) {
    ctx.save();
    ctx.beginPath();
    boxPath(ctx, { x: r.x - s.ring.width, y: r.y - s.ring.width, w: r.w + s.ring.width * 2, h: r.h + s.ring.width * 2 }, s);
    boxPath(ctx, r, s);
    ctx.fillStyle = resolveColor(s.ring.color, pal);
    ctx.fill('evenodd');
    ctx.restore();
  }
  // 套印错位（vis.misregister，M12b-63）：先垫一块错开的强调色版，盒子盖上去后露出一道错版边（底色半透明时透出重叠色）
  if (s.misregister) { ctx.save(); ctx.translate(s.misregister.x, s.misregister.y); path(); ctx.fillStyle = withAlpha(resolveColor(s.misregister.color, pal), 0.85); ctx.fill(); ctx.restore(); }
  // 填充（干笔刷外形的飞白缺口只进这里的裁剪，M12b-39）
  ctx.save();
  path(0, true);
  ctx.clip();
  fillPaint(ctx, r, s.bg, pal);
  // 玻璃着色（vis.blurTint，M12b-63）：底色之上再压一层玻璃色（与面板底色分开）
  if (s.glass?.tint) { ctx.fillStyle = withAlpha(resolveColor(s.glass.tint, pal), 0.22); ctx.fillRect(r.x, r.y, r.w, r.h); }
  let matBase: string | undefined;
  if (s.material) {
    // 材质内芯：以底色为基色的程序化贴图（半透明底保持透明度）；渐变底按渐变的平均色（R4 回归修复 elden-ring#49，见 paintBase）
    const base = paintBase(s.bg, pal);
    matBase = base ? withAlpha(base, 1 / Math.max(0.01, alphaOf(base))) : undefined;
    ctx.save();
    if (base) ctx.globalAlpha = Math.max(0.15, alphaOf(base));
    fillMaterial(ctx, r.x, r.y, r.w, r.h, s.material, matBase);
    ctx.restore();
    // 材质的盒级处理（M12b-52）：水彩的潮线、瓷的釉光、透明塑料的光泽条——跟着盒子外形走，不进平铺小图
    materialBox(ctx, r, s, s.material, matBase ?? MATERIAL_BASE[s.material] ?? '#ccc');
  }
  if (s.overlay && s.overlay.kind !== 'none') drawPattern(ctx, r, s.overlay, pal);
  if (s.gloss) drawGloss(ctx, r, s.gloss, s);
  // 表面处理（ast.finish，M12b-52）与磨损（ast.wear）：叠在材质 / 图案 / 光泽之上、描边之下
  if (s.finish && s.finish !== 'none') drawFinish(ctx, r, s.finish, () => boxPath(ctx, r, s, 0.75), lightFace(matBase ?? (s.bg && 'solid' in s.bg ? resolveColor(s.bg.solid, pal) : null)));
  if (s.wear && s.wear > 0) drawWear(ctx, r, s, s.wear);
  // 做旧（ast.aging，M12b-63）与玻璃颗粒（vis.grain）：叠在磨损之后、描边之前
  if (s.aging?.length) drawAging(ctx, r, s.aging, s.agingSeed ?? 0);
  if (s.glass?.grain) grainDots(ctx, r, s.glass.grain);
  // 内阴影：在盒子里，给"盒子外面的大框"投影
  for (const sh of (s.shadows ?? []).filter((x) => x.inset)) {
    ctx.save();
    ctx.shadowColor = resolveColor(sh.color, pal);
    ctx.shadowBlur = sh.blur * sOf(ctx);
    ctx.shadowOffsetX = sh.x * sOf(ctx);
    ctx.shadowOffsetY = sh.y * sOf(ctx);
    ctx.beginPath();
    ctx.rect(big.x, big.y, big.w, big.h);
    boxPath(ctx, r, s);
    ctx.fillStyle = '#000';
    ctx.fill('evenodd');
    ctx.restore();
  }
  // 分层立体（vis.depth@frame / @core，M12b-36）：外框带 + 内芯各自的立体
  if (s.layers) drawLayers(ctx, r, s, pal, big);
  // 玻璃亮边（vis.edgeLight，M12b-63）：沿受光的边描一道内亮线（往里渐隐）
  if (s.glass?.edge) glassEdge(ctx, r, s.glass.edge);
  // 烧边的焦边（vis.edge = burnt，M12b-39）：沿外形在盒内描两道暗色（宽而淡 + 窄而深），像纸边被火燎过
  if (s.edge === 'burnt') {
    ctx.save();
    path(); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(70,35,10,0.32)'; ctx.stroke();
    path(); ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(28,14,4,0.6)'; ctx.stroke();
    ctx.restore();
  }
  // 边框：沿外形描两倍线宽、裁剪在盒子内 = 正好一层向内的边框（任意外形都对）
  if (s.border && s.border.width > 0) {
    const b = s.border;
    ctx.strokeStyle = resolveColor(b.color, pal);
    if (b.glow) { ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = b.glow * 14 * sOf(ctx); }
    const plainRect = !needsPoly(s) && !s.circle && !s.chamfer && !s.step && !radiusList(radiusOf(r, s), 0) && (b.style ?? 'solid') === 'solid';
    // 粗细调制（vis.strokeModulation，M12b-44）：方框的四边各画一条贴着内沿、两端细中段胖的膨线（书法线框）；圆角 / 多边形外形照常等宽
    if (b.mod && b.mod > 0 && plainRect) {
      const [w0, w1] = modWidths(b.width, b.mod);
      ctx.fillStyle = ctx.strokeStyle;
      swell(ctx, r.x, r.y + w1 / 2, r.x + r.w, r.y + w1 / 2, w0, w1);
      swell(ctx, r.x, r.y + r.h - w1 / 2, r.x + r.w, r.y + r.h - w1 / 2, w0, w1);
      swell(ctx, r.x + w1 / 2, r.y, r.x + w1 / 2, r.y + r.h, w0, w1);
      swell(ctx, r.x + r.w - w1 / 2, r.y, r.x + r.w - w1 / 2, r.y + r.h, w0, w1);
    } else
    // 两端渐隐（vis.strokeFade，M12b-37）：方框（不是多边形外形、没有圆角）的四边各画一条两端渐隐的线
    if (b.fade && b.fade > 0 && plainRect) {
      const c = ctx.strokeStyle as string, w = b.width;
      fadeStroke(ctx, r.x, r.y + w / 2, r.x + r.w, r.y + w / 2, c, w, b.fade);
      fadeStroke(ctx, r.x, r.y + r.h - w / 2, r.x + r.w, r.y + r.h - w / 2, c, w, b.fade);
      fadeStroke(ctx, r.x + w / 2, r.y, r.x + w / 2, r.y + r.h, c, w, b.fade);
      fadeStroke(ctx, r.x + r.w - w / 2, r.y, r.x + r.w - w / 2, r.y + r.h, c, w, b.fade);
    } else if (b.style === 'sticker') {
      // 贴纸多重环：主描边 2w（外墨环在盒外、上面已画）+ 内墨环 w
      ctx.lineWidth = b.width * 4;
      path();
      ctx.stroke();
      ctx.save();
      path(b.width * 2);
      ctx.clip();
      ctx.lineWidth = b.width * 2;
      ctx.strokeStyle = resolveColor(b.ink ?? '#111', pal);
      path(b.width * 2);
      ctx.stroke();
      ctx.restore();
    } else if (b.style === 'inline') {
      // 内二线型材：主边 + 内缩 2 的 1px 对比线（暗金型材、双色边）
      ctx.lineWidth = b.width * 2;
      path();
      ctx.stroke();
      const ink = b.ink ? resolveColor(b.ink, pal) : luminance(resolveColor(b.color, pal)) > 0.45 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
      ctx.save();
      path(b.width + 2);
      ctx.clip();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ink;
      path(b.width + 2);
      ctx.stroke();
      ctx.restore();
    } else if (b.style === 'stitched') {
      // 缝线：内缩 3 的虚线（针脚长 3w、间隔 2.4w），不画外框
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.setLineDash([b.width * 3, b.width * 2.4]);
      path(3 + b.width / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (b.style === 'pencil') {
      // 铅笔线：两遍错开种子的抖动线，各 60% 透明（手绘笔记本、民艺）
      ctx.save();
      ctx.lineWidth = b.width;
      ctx.lineJoin = 'round';
      ctx.globalAlpha *= 0.6;
      for (let k = 0; k < 2; k++) {
        const P = perturbed(r.x + b.width / 2, r.y + b.width / 2, Math.max(0, r.w - b.width), Math.max(0, r.h - b.width), { ...s, edge: 'clean', jitter: 0.32, seed: (s.seed ?? 1) * 31 + 17 * (k + 1) }, r.w, r.h);
        ctx.beginPath();
        P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    } else if (b.style === 'dashed') {
      ctx.lineWidth = b.width * 2;
      ctx.setLineDash([b.width * 3, b.width * 2.5]);
      path();
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (b.style === 'double') {
      // 双线：外线、空隙、内线各占三分之一，每段至少 1px（细于 3px 的双线原来只看得出一条，M12a-06）
      const t = Math.max(1, b.width / 3);
      ctx.lineWidth = t * 2;
      path();
      ctx.stroke();
      ctx.save();
      path(t * 2);
      ctx.clip();
      path(t * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = b.width * 2;
      path();
      ctx.stroke();
    }
  }
  // 四角括角（vis.strokeSides = corners，M12a-06）：取景框式的 L 形角，不画整边
  if (s.cornerMarks) {
    const cm = s.cornerMarks, L = Math.min(cm.len, r.w / 2, r.h / 2), w = cm.width;
    ctx.fillStyle = resolveColor(cm.color, pal);
    for (const [x, y, sx, sy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x + r.w, r.y + r.h, -1, -1], [r.x, r.y + r.h, 1, -1]] as [number, number, number, number][]) {
      ctx.fillRect(sx > 0 ? x : x - L, sy > 0 ? y : y - w, L, w);
      ctx.fillRect(sx > 0 ? x : x - w, sy > 0 ? y : y - L, w, L);
    }
  }
  if (s.sides && s.sideEnds) {
    // 开口线 + 端头小方块（vis.strokeSides = endSquares，M12b-37，二次元白卡细线）：上下两条线两端各让出 inset，线端一个实心小方块
    const sd = s.sides, se = s.sideEnds, x0 = r.x + r.w * se.inset, x1 = r.x + r.w * (1 - se.inset), q = se.square;
    for (const [b, y] of [[sd.t, r.y], [sd.b, r.y + r.h]] as const) {
      if (!b) continue;
      const c = resolveColor(b.color, pal), yy = y === r.y ? y + q / 2 : y - q / 2;
      if (b.fade) fadeStroke(ctx, x0, yy, x1, yy, c, b.width, b.fade);
      else { ctx.fillStyle = c; ctx.fillRect(x0, yy - b.width / 2, x1 - x0, b.width); }
      ctx.fillStyle = c; ctx.fillRect(x0 - q / 2, yy - q / 2, q, q); ctx.fillRect(x1 - q / 2, yy - q / 2, q, q);
    }
  } else if (s.sides) {
    const sd = s.sides;
    // 两端渐隐（vis.strokeFade，M12b-37，hollow-knight#22 / elden-ring#27 的发丝线）：分边沿自己的方向渐隐，没给时原来的实心条
    const side = (b: NonNullable<typeof sd.t>, x: number, y: number, w: number, h: number, horiz: boolean) => {
      const c = resolveColor(b.color, pal);
      if (b.mod && b.mod > 0) { const [w0, w1] = modWidths(horiz ? h : w, b.mod); ctx.fillStyle = c; if (horiz) swell(ctx, x, y + h / 2, x + w, y + h / 2, w0, w1); else swell(ctx, x + w / 2, y, x + w / 2, y + h, w0, w1); }
      else if (b.fade && b.fade > 0) fadeStroke(ctx, horiz ? x : x + w / 2, horiz ? y + h / 2 : y, horiz ? x + w : x + w / 2, horiz ? y + h / 2 : y + h, c, horiz ? h : w, b.fade);
      else { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
    };
    if (sd.t) side(sd.t, r.x, r.y, r.w, sd.t.width, true);
    if (sd.b) side(sd.b, r.x, r.y + r.h - sd.b.width, r.w, sd.b.width, true);
    if (sd.l) side(sd.l, r.x, r.y, sd.l.width, r.h, false);
    if (sd.r) side(sd.r, r.x + r.w - sd.r.width, r.y, sd.r.width, r.h, false);
  }
  ctx.restore();
  // 外框结构（程序化九宫格 / 包角），画在边框之上、装饰之下
  // 顶冠框的顶冠 / 底坠放进画面（ORN.frame）的安全区（B4 审查修复）
  if (s.frame) drawFrame(ctx, r, s.frame, (inset) => boxPath(ctx, r, s, inset), ORN.frame);
  // 饰件：作用范围（ast.ornamentScope）与最小面板（ast.ornamentMinSize，px@1080p）都按主题给的值，没给时是原来的画法；
  // 画面矩形给饰件用来把顶边居中的徽章 / 宝石 / 缎带收进画面（M12a-08），分隔线样式见 vis.dividerStyle
  const o = s.ornament;
  if (o && (o.level > 0 || o.parts.length) && ornamentInScope(o.scope, o.container ? 'container' : ORN.where, r, ORN.frame ?? r)) {
    drawOrnaments(ctx, r, o.level, o.motif, resolveColor(o.color, pal), o.parts, o.dividerAt, { accent: resolveColor('@accent', pal), mat: s.frame?.mat, named: o.named ?? [], minSize: o.minSize, dividerStyle: o.dividerStyle, frame: ORN.frame, micro: o.micro, fade: o.fade, mod: o.mod, motif2: o.motif2, dividerPlace: o.dividerPlace, gem: o.gem ? resolveColor(o.gem, pal) : undefined, anchors: o.anchors, overhang: o.overhang, endcap: o.endcap });
  }
  if (s.fx?.kinds.length) {
    drawFx(ctx, r, s.fx.kinds, resolveColor(s.fx.color, pal, '#fff'), true, outline);
    const front = s.fx.kinds.filter((k) => !FX_BEHIND.has(k));
    if (front.length) logFx(ctx, r, front.join(','));
  }
}

/** 可读性检查的盒子记录（drawBox 与渐隐盒子共用：渐隐盒子只在主画布上记一次，临时画布里的不记） */
function logBox(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, pal: SkinPalette) {
  if (!DRAW_LOG.on) return;
  const bg = s.bg ? ('solid' in s.bg ? resolveColor(s.bg.solid, pal) : 'pattern' in s.bg ? resolveColor(s.bg.pattern.bg ?? s.bg.pattern.fg, pal) : resolveColor(('linear' in s.bg ? s.bg.linear.stops : s.bg.radial.stops)[0][1], pal)) : null;
  // 材质内芯的盒子记材质的底色；渐变底的材质内芯按渐变平均色着色（R4 回归修复 elden-ring#49），记录跟着画出来的颜色（纯色底照旧记材质基色）
  // 纯色底的内芯也按底色着色（drawBox 的 fillMaterial 基色 = 底色，整合修复 U#1：原来记材质基色，奶油色布纹面板被记成深红，米白字被误判及格）
  const matC = s.material ? paintBase(s.bg, pal) ?? MATERIAL_BASE_OF(s.material) : undefined;
  DRAW_LOG.boxes.push({ ...devRect(ctx, r.x, r.y, r.w, r.h), color: s.material ? matC ?? bg : bg, blur: s.backdropBlur ?? 0 });
}

/**
 * 盒子底色的代表色（材质内芯的基色）：纯色 = 本身；线性 / 径向渐变 = 渐变的平均色（material.ts 的 gradientMean）；图案底 / 没有底色 → undefined（用材质自己的基色）。
 * R4 回归修复 elden-ring#49：原来只认纯色底，vis.fill = gradient 的面板 / 格子上 ast.core = texture 的内芯退回材质自己的基色（石纹 #8d8d88），col.surface 压不暗；
 * 现在内芯的明暗跟着底色走，与 procedural 内芯（直接画这条渐变）看上去的平均明暗一致（渐变本身的明暗走向被材质盖住——与纯色底时盖住底色一样）
 */
export function paintBase(p: Paint | undefined, pal: SkinPalette): string | undefined {
  if (!p || 'pattern' in p) return undefined;
  if ('solid' in p) return resolveColor(p.solid, pal);
  return gradientMean(('linear' in p ? p.linear.stops : p.radial.stops).map(([t, c]) => [t, resolveColor(c, pal)] as [number, string]));
}

/* ---------------- M12b-41：渐隐遮罩 ---------------- */

/** 渐隐用的临时画布（按设备像素尺寸缓存，最多 8 张，最近用的留下；每帧清空重画，不新建）——给超过烘焙预算的大盒子与还没稳住的盒子用，其余走 BAKES 的成品缓存 */
const FADE_CANVAS = new Map<string, HTMLCanvasElement>();
/**
 * 静态小件的成品缓存（B4 审查修复）：渐隐 / 印刷磨损的盒子（fadeBox）、HUD 元素的套框与两端卷须（bakedPaint）画好一次就留着，键相同时直接贴图。
 * 原来 vis.edge = printWorn 每帧都在 8 张临时画布里重画（盒子 + 最多 700 个斑点），一屏超过 8 种盒子尺寸就每帧新建画布；元素套框每帧几千条路径。
 * 中期审查修复 ㉗ ㉘ ㊲：
 *   ①在设备像素里烘、按 1 : 1 贴回（tileFill 的口径）：键 = 画法参数 + 尺寸 + 设备缩放 + 设备相位（设备坐标的小数部分，量化到 1/8 像素）+ 字体 / 素材版本，不再带绝对位置——
 *     整像素平移的元素命中同一块；贴回时 setTransform(1,0,0,1, 整数) + drawImage(c, 0, 0)，不再按小数偏移重采样（发丝线 / 双线不糊，像素皮肤不抖 ±1）；
 *     斜切 / 旋转 / 镜像的变换里不烘（直接画；渐隐盒子照原来的写法经变换贴）。
 *   ②稳住了才烘：同一块（同样的画法、尺寸与缩放）上一帧（或这一帧早些时候）也在这个相位上才新建画布，否则直接画——挂世界点跟着镜头走的、入场缩放中的、
 *     滑动中的元素每帧不再新建画布（整像素地挪的相位不变，烘一次以后到哪都命中）；
 *     每帧最多新烘 BAKE_PER_FRAME 块，其余直接画。
 *   ③预算按画布定：max(6M, 2.5 × 画布宽 × 高) 设备像素；淘汰最久没用的，但这一帧用过的不淘汰——腾不出地方就这次不烘、直接画（原来 4K 下一帧要的几块互相挤掉，每帧全部重烘）。
 * BAKE.eager = true（快照 / 测试用）：不看②，第一次见到就烘（B4 / B5 的行为）
 */
const BAKES = new Map<string, { c: HTMLCanvasElement; px: number; f: number }>();
const BAKE_MIN = 6_000_000;
/** 每帧最多新烘几块 */
const BAKE_PER_FRAME = 4;
/** 烘焙账：frame = 帧号（composeLayers 每画一侧 +1，bakeFrame）；budget = 设备像素预算；made = 这一帧新烘的块数；eager 见上 */
export const BAKE = { frame: 0, budget: BAKE_MIN, made: 0, eager: false };
let bakePx = 0;
/** 同一块最近见过的设备相位与最后见到的帧（稳住了才烘，②）：键 = 不带相位的烘焙键，每块记 4 个相位；最多 512 项，满了清空 */
const PHASES = new Map<string, { p: string; f: number }[]>();
/**
 * 新的一帧（composeLayers 开头调；w / h = 画布的设备像素尺寸，按它定预算）。newFrame = false：同一帧里的另一侧（A / B 对照，终期审查修复 ㉒——
 * 原来每侧各调一次，帧号一帧涨 2，只在一侧出现的块「上一帧也见过」永远不成立、一块都烘不上，淘汰保护也只护着正在画的那一侧）：帧号与每帧新烘的计数不动，只清做旧盒子的序号
 */
export function bakeFrame(w?: number, h?: number, newFrame = true) {
  if (newFrame) { BAKE.frame++; BAKE.made = 0; }
  AGING.n = 0;
  if (w && h && Number.isFinite(w * h)) BAKE.budget = Math.max(BAKE_MIN, 2.5 * w * h);
}
/** 清空成品缓存（画布上下文丢失后重建、测试量缓存命中时用） */
export function clearBakes() { BAKES.clear(); PHASES.clear(); bakePx = 0; }
function bakeGet(key: string): HTMLCanvasElement | undefined {
  const v = BAKES.get(key);
  if (v) { BAKES.delete(key); v.f = BAKE.frame; BAKES.set(key, v); }
  return v?.c;
}
/** 这一块能不能新烘（②③）：太大、相位还没稳住、这一帧已烘够、腾不出地方（这一帧用过的不淘汰）时不烘 */
function bakeAllowed(base: string, phase: string, px: number): boolean {
  if (px > BAKE.budget / 4) return false;
  if (!BAKE.eager) {
    let seen = PHASES.get(base);
    if (!seen) { if (PHASES.size >= 512) PHASES.clear(); PHASES.set(base, (seen = [])); }
    const hit = seen.find((q) => q.p === phase), stable = !!hit && hit.f >= BAKE.frame - 1;
    if (hit) hit.f = BAKE.frame;
    else { seen.push({ p: phase, f: BAKE.frame }); if (seen.length > 4) seen.shift(); }
    if (!stable || BAKE.made >= BAKE_PER_FRAME) return false;
  }
  for (const [k0, v0] of BAKES) {
    if (bakePx + px <= BAKE.budget) break;
    if (v0.f === BAKE.frame) continue;
    BAKES.delete(k0); bakePx -= v0.px;
  }
  return bakePx + px <= BAKE.budget;
}
function bakePut(key: string, c: HTMLCanvasElement, px: number) {
  BAKES.set(key, { c, px, f: BAKE.frame }); bakePx += px; BAKE.made++;
}
/** 做旧盒子的序号（B10 审查修复 ⑭）：每画一侧（bakeFrame）清零；成品缓存的离屏那一遍（BAKING > 0）与只量不画的不数，帧间顺序不变 */
const AGING = { n: 0 };
let BAKING = 0;
/** 当前变换的整体缩放（离屏画布按它取设备像素尺寸） */
const devScale = (ctx: CanvasRenderingContext2D) => { const m = ctx.getTransform(); return Math.max(0.25, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1); };
/**
 * 设备像素里的烘焙几何（①）：变换是轴对齐的正缩放时，设计坐标 (x0, y0)（外接框左上角减留边）落在设备坐标 (ix + fx, iy + fy)——ix / iy 取整、fx / fy 量化到 1/8；
 * 不是轴对齐（斜切 / 旋转 / 镜像）时 null
 */
function devPlace(ctx: CanvasRenderingContext2D, x0: number, y0: number): { sx: number; sy: number; ix: number; iy: number; fx: number; fy: number } | null {
  const m = ctx.getTransform();
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || !(m.a > 0) || !(m.d > 0)) return null;
  const qx = Math.round((m.a * x0 + m.e) * 8) / 8, qy = Math.round((m.d * y0 + m.f) * 8) / 8, ix = Math.floor(qx), iy = Math.floor(qy);
  return { sx: m.a, sy: m.d, ix, iy, fx: qx - ix, fy: qy - iy };
}
/** 按 1 : 1 贴回设备像素（①） */
function blitDev(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, ix: number, iy: number) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, ix, iy); ctx.drawImage(c, 0, 0); ctx.restore();
}
/**
 * 把一块静态的矢量画法烘进离屏画布再贴（B4 审查修复：HUD 元素的套框 / 两端卷须 / 顶冠每帧重建几千条路径）：r = 画法的外接框，pad = 往外多留的边，
 * key = 画法参数（调用方保证同键、同尺寸时画面相同——与位置无关；画法跟着位置变的（顶冠夹进安全区）把相对位置写进键）；只量不画 / 没有 document（Node 导出）时直接画。
 * 太大的块（超过预算 1/4）、不是轴对齐的变换、还没稳住的块直接画（见上）
 */
export function bakedPaint(ctx: CanvasRenderingContext2D, key: string, r: Rect, pad: number, draw: (g: CanvasRenderingContext2D) => void): void {
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || typeof document === 'undefined') { draw(ctx); return; }
  const x0 = r.x - pad, y0 = r.y - pad, W0 = r.w + pad * 2, H0 = r.h + pad * 2, dp = devPlace(ctx, x0, y0);
  if (!dp) { draw(ctx); return; }
  const tw = Math.max(1, Math.min(4096, Math.ceil(W0 * dp.sx + dp.fx))), th = Math.max(1, Math.min(4096, Math.ceil(H0 * dp.sy + dp.fy)));
  const base = `bk|${key}|${W0.toFixed(2)}x${H0.toFixed(2)}|${dp.sx.toFixed(4)},${dp.sy.toFixed(4)}|${FONT_EPOCH.v}|${uiImagesVersion()}|${floorSig()}`, phase = `${dp.fx},${dp.fy}`, k = `${base}|${phase}`;
  let c = bakeGet(k);
  if (!c) {
    if (!bakeAllowed(base, phase, tw * th)) { draw(ctx); return; }
    const nc = document.createElement('canvas'); nc.width = tw; nc.height = th;
    const g = nc.getContext('2d');
    if (!g) { draw(ctx); return; }
    installLineFloor(g, false);
    const log = DRAW_LOG.on, S0 = S;
    g.setTransform(dp.sx, 0, 0, dp.sy, dp.fx - x0 * dp.sx, dp.fy - y0 * dp.sy);
    DRAW_LOG.on = false; S = dp.sx; BAKING++;
    try { draw(g); } finally { DRAW_LOG.on = log; S = S0; BAKING--; }
    bakePut(k, nc, tw * th); c = nc;
  }
  blitDev(ctx, c, dp.ix, dp.iy);
}
/**
 * 一条透明度渐变（dir 方向、len 渐隐长度占边长的比例）：left = 左端透明 → 右边实、right 反过来、both = 两端透明；top / bottom / vertical 同理竖着；
 * color 给了时是那个颜色从透明到实（直接当填充 / 描边用），没给时是遮罩（黑色 alpha，destination-in 用）
 */
export function fadePaint(ctx: CanvasRenderingContext2D, r: Rect, dir: string, len: number, color?: string): CanvasGradient {
  const L = Math.max(0.01, Math.min(0.5, len)), vert = dir === 'top' || dir === 'bottom' || dir === 'vertical';
  const g = vert ? ctx.createLinearGradient(0, r.y, 0, r.y + r.h) : ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  const c0 = color ? withAlpha(color, 0) : 'rgba(0,0,0,0)', c1 = color ?? 'rgba(0,0,0,1)';
  const lead = dir === 'left' || dir === 'top' || dir === 'both' || dir === 'vertical', tail = dir === 'right' || dir === 'bottom' || dir === 'both' || dir === 'vertical';
  g.addColorStop(0, lead ? c0 : c1);
  if (lead) g.addColorStop(L, c1);
  if (tail) g.addColorStop(1 - L, c1);
  g.addColorStop(1, tail ? c0 : c1);
  return g;
}
/** 两端渐隐的直线（vis.strokeFade，M12b-37 / §2 的 fadeStroke）：从 (x0, y0) 到 (x1, y1)，线宽 w，两端各 fade 比例渐隐到透明；B4 的分隔线、B8 的段间线、B4 的标题带都调它 */
export function fadeStroke(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w: number, fade: number) {
  const f = Math.max(0, Math.min(0.5, fade));
  ctx.save();
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, withAlpha(color, 0)); g.addColorStop(Math.max(0.001, f), color); g.addColorStop(Math.min(0.999, 1 - f), color); g.addColorStop(1, withAlpha(color, 0));
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}
/** 盒子画到画布外面多远（阴影偏移 + 模糊、外圈、发光、贴纸墨环），临时画布留这么宽的边 */
function boxBleed(s: BoxStyle): number {
  let m = 4 + (s.ring?.width ?? 0) + (s.border?.glow ? 16 : 0) + (s.border?.style === 'sticker' ? s.border.width : 0) + (s.glow?.blur ?? 0);
  for (const sh of s.shadows ?? []) if (!sh.inset) m = Math.max(m, Math.abs(sh.x) + Math.abs(sh.y) + sh.blur * 1.5 + 4);
  return Math.ceil(m + (s.fx?.kinds.length || s.ornament ? 24 : 0));
}
function fadeBox(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, pal: SkinPalette): void {
  const worn = s.edge === 'printWorn', fading = !!s.fade && s.fade.dir !== 'none' && s.fade.len > 0;
  const plain: BoxStyle = { ...s, fade: undefined, ...(worn ? { edge: undefined } : {}) };
  // 只量不画 / 没有 document（Node 里的导出、校验）：照常画、不渐隐
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || typeof document === 'undefined') return drawBox(ctx, r, plain, pal);
  const pad = boxBleed(s), x0 = r.x - pad, y0 = r.y - pad, W0 = r.w + pad * 2, H0 = r.h + pad * 2;
  // 设备像素里画、1 : 1 贴回（中期审查修复 ㊲）；斜切 / 旋转里照原来的写法：按整体缩放画、经当前变换贴
  const dp = devPlace(ctx, x0, y0), sc = dp ? 0 : devScale(ctx), sx = dp?.sx ?? sc, sy = dp?.sy ?? sc, fx = dp?.fx ?? 0, fy = dp?.fy ?? 0;
  const tw = Math.max(1, Math.min(4096, Math.ceil(W0 * sx + fx))), th = Math.max(1, Math.min(4096, Math.ceil(H0 * sy + fy)));
  // 成品缓存（B4 审查修复；中期审查修复 ㉗：键不带位置）：同一块盒子（样式、色板、尺寸、缩放、相位、画面、字体 / 素材版本都相同）直接贴上次的成品。
  // 外框（顶冠夹进 ORN.frame 的安全区）与饰件（收进画面）跟着位置变，带它们的盒子键里仍写位置；不是轴对齐的变换也写（经变换贴，原来的键）
  const posK = dp && !s.frame && !s.ornament ? '' : `${r.x},${r.y},`;
  const px = tw * th, base = `fb|${JSON.stringify(s)}|${JSON.stringify(pal)}|${posK}${r.w},${r.h}|${sx.toFixed(4)},${sy.toFixed(4)}|${ORN.where}|${ORN.frame ? `${ORN.frame.x},${ORN.frame.y},${ORN.frame.w},${ORN.frame.h}` : '-'}|${FONT_EPOCH.v}|${uiImagesVersion()}|${floorSig()}`;
  const phase = `${fx},${fy}`, bakeK = `${base}|${phase}`;
  const blit = (c: HTMLCanvasElement) => (dp ? blitDev(ctx, c, dp.ix, dp.iy) : ctx.drawImage(c, 0, 0, tw, th, x0, y0, W0, H0));
  const hit = bakeGet(bakeK);
  if (hit) { logBox(ctx, r, plain, pal); blit(hit); return; }
  // 稳住了、预算有地方才留成品；否则画进按尺寸复用的临时画布（不新建）
  const keep = bakeAllowed(base, phase, px);
  let c: HTMLCanvasElement | undefined;
  if (keep) { c = document.createElement('canvas'); c.width = tw; c.height = th; }
  else {
    const key = `${tw}x${th}`;
    c = FADE_CANVAS.get(key);
    if (c) FADE_CANVAS.delete(key);
    else { c = document.createElement('canvas'); c.width = tw; c.height = th; if (FADE_CANVAS.size >= 8) FADE_CANVAS.delete(FADE_CANVAS.keys().next().value!); }
    FADE_CANVAS.set(key, c);
  }
  const g = c.getContext('2d');
  if (!g) return drawBox(ctx, r, plain, pal);
  installLineFloor(g, false);
  logBox(ctx, r, plain, pal);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, tw, th);
  g.setTransform(sx, 0, 0, sy, fx - x0 * sx, fy - y0 * sy);
  // 临时画布里阴影按它自己的缩放（S 是主画布的），盒子不进可读性记录
  const log = DRAW_LOG.on, S0 = S;
  DRAW_LOG.on = false; S = sx;
  try { drawBox(g, r, plain, pal); } finally { DRAW_LOG.on = log; S = S0; }
  if (fading) {
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = fadePaint(g, r, s.fade!.dir, s.fade!.len);
    g.fillRect(x0, y0, W0, H0);
  }
  // 印刷磨损（vis.edge = printWorn，M12b-47，disco-elysium#2）：按种子撒一层擦掉的斑点（越靠边越密）+ 几块大一点的缺墨
  if (worn) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.85)'; printWornSpecks(g, r, s.seed ?? 1); }
  g.globalCompositeOperation = 'source-over';
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (keep) bakePut(bakeK, c, px);
  blit(c);
}

/** 印刷磨损的斑点（printWorn）：数量按面积（上限 700），离边越近越密；半径 0.3~1.4，另有 3~6 块 2~4 的缺墨（一条 path 填完） */
function printWornSpecks(g: CanvasRenderingContext2D, r: Rect, seed: number) {
  const R = rand(seed * 977 + Math.round(r.w) * 13 + Math.round(r.h)), n = Math.min(700, Math.round((r.w * r.h) / 60)), band = Math.max(4, Math.min(r.w, r.h) * 0.3);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = r.x + R() * r.w, y = r.y + R() * r.h, d = Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y);
    if (R() > 0.2 + 0.8 * Math.max(0, 1 - d / band)) continue;
    const rr = 0.3 + R() * 1.1; g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2);
  }
  for (let i = 0, m = 3 + Math.floor(R() * 4); i < m; i++) { const x = r.x + R() * r.w, y = r.y + R() * r.h, rr = 2 + R() * 2; g.moveTo(x + rr, y); g.ellipse(x, y, rr * 1.6, rr, R() * 3, 0, Math.PI * 2); }
  g.fill();
}

/* ---------------- M12b-36：分层立体 ---------------- */

/** 实心厚度（extrude）：沿偏移方向把外形副本从 1/n 叠到满偏移（n ≤ 6），成一块连续的侧壁；画在盒外（调用方已按 evenodd 裁掉盒子本身） */
function extrudeSweep(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, sh: Shadow, pal: SkinPalette) {
  const n = Math.max(1, Math.min(6, Math.ceil(Math.max(Math.abs(sh.x), Math.abs(sh.y)))));
  ctx.fillStyle = resolveColor(sh.color, pal);
  ctx.beginPath();
  for (let i = 1; i <= n; i++) boxPath(ctx, { x: r.x + (sh.x * i) / n, y: r.y + (sh.y * i) / n, w: r.w, h: r.h }, s);
  ctx.fill('nonzero');
}
/** 立体的一组内阴影（bevel 凸起 / innerShadow 凹下 / pixelBevel 像素倒角；flat = 没有），p = 线宽（像素倒角 = 1 美术像素） */
const DEPTH_INSET: Record<string, (p: number) => Shadow[]> = {
  bevel: (p) => [{ color: 'rgba(255,255,255,0.5)', x: p, y: p, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.42)', x: -p, y: -p, blur: 0, inset: true }],
  pixelBevel: (p) => [{ color: 'rgba(255,255,255,0.5)', x: p, y: p, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.45)', x: -p, y: -p, blur: 0, inset: true }],
  innerShadow: (p) => [{ color: 'rgba(0,0,0,0.45)', x: p, y: p, blur: p * 1.5, inset: true }, { color: 'rgba(255,255,255,0.18)', x: -p, y: -p, blur: 0, inset: true }],
};
/** 在 path(inset) 的形状里画一组内阴影（外面那一大块的影子投进来） */
function insetShade(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, inset: number, shadows: Shadow[], pal: SkinPalette, big: Rect) {
  for (const sh of shadows) {
    ctx.save();
    ctx.beginPath(); boxPath(ctx, r, s, inset); ctx.clip();
    const s0 = sOf(ctx); ctx.shadowColor = resolveColor(sh.color, pal); ctx.shadowBlur = sh.blur * s0; ctx.shadowOffsetX = sh.x * s0; ctx.shadowOffsetY = sh.y * s0;
    ctx.beginPath(); ctx.rect(big.x, big.y, big.w, big.h); boxPath(ctx, r, s, inset);
    ctx.fillStyle = '#000'; ctx.fill('evenodd');
    ctx.restore();
  }
}
/**
 * 外框带 + 内芯（M12b-36，factorio#0「框凸、芯平、槽凹」）：外框带 = 外形与内缩 width 的外形之间铺外框色、按 depth 画立体；
 * 外框凸起时内芯的上左压一道暗线、下右一道亮线（框高出芯的那道台阶）；内芯另按 core.depth 画自己的立体
 */
function drawLayers(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, pal: SkinPalette, big: Rect) {
  const L = s.layers!, fw = L.frame ? Math.min(L.frame.width, Math.min(r.w, r.h) * 0.25) : 0;
  if (L.frame && fw > 0) {
    ctx.save();
    ctx.beginPath(); boxPath(ctx, r, s); boxPath(ctx, r, s, fw);
    ctx.fillStyle = resolveColor(L.frame.color, pal); ctx.fill('evenodd');
    ctx.restore();
    const kind = L.frame.depth, p = L.frame.px;
    if (DEPTH_INSET[kind]) insetShade(ctx, r, s, 0, DEPTH_INSET[kind](p), pal, big);
    // 框与芯的台阶：凸框 = 芯的上左暗、下右亮；凹框反过来
    if (kind === 'bevel' || kind === 'pixelBevel') insetShade(ctx, r, s, fw, [{ color: 'rgba(0,0,0,0.45)', x: p, y: p, blur: 0, inset: true }, { color: 'rgba(255,255,255,0.3)', x: -p, y: -p, blur: 0, inset: true }], pal, big);
    else if (kind === 'innerShadow') insetShade(ctx, r, s, fw, [{ color: 'rgba(255,255,255,0.3)', x: p, y: p, blur: 0, inset: true }], pal, big);
  }
  if (L.core && DEPTH_INSET[L.core.depth]) insetShade(ctx, r, s, fw, DEPTH_INSET[L.core.depth](L.core.px), pal, big);
}

function alphaOf(c: string) {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(',').map((x) => Number(x));
  return parts.length > 3 ? parts[3] : 1;
}

/**
 * 图案叠层（vis.pattern）：斜条纹、警示条、排线、圆点、网点、棋盘、方格纸、绗缝、叶子、云纹、几何、重复文字、图腾。
 * 审查修复 A · L9：周期性的图案先画一块图块（整数个周期，按画布当前的缩放取像素、对齐到设备像素，缓存），再用 createPattern 一次铺满——
 * 原来每个点 / 每根线一条路径，漫画 / 布纹类皮肤的面板一帧上万次调用。几何与原来逐个画的完全一样（周期、相位从盒子左上角起、形状、线宽、
 * 透明度叠加次序），只有右 / 下边缘可能多出下一个图形压进盒子的一小截（不超过图形半径）；网点（halftone）的点径随横向位置渐变、不是周期的，
 * 按盒子宽缓存一条 12 高的竖向周期条。绗缝的虚线、重复文字、图腾（一排）照旧逐个画。对照：scratchpad 的 fixA/tilecheck.mts（软件光栅化逐像素比）
 */
function drawOverlay(ctx: CanvasRenderingContext2D, r: Rect, kind: string, color: string, opacity: number) {
  // 只量不画的画布（模板构图器的测量阶段）：不画
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) return;
  const per = OVERLAY_TILES[kind];
  if (per && r.w > 0 && r.h > 0) {
    const alpha = kind === 'hazard' ? Math.min(1, opacity * 2) : opacity;
    if (kind === 'halftone') {
      // 竖向 12 一个周期（两行，奇偶行错开）：按 (y / 6) % 2 取错开量（与原来一样用绝对纵坐标；盒子在画面上沿以上时取模换号、不是周期，逐个画）
      const o0 = ((r.y / 6) % 2) * 3, o1 = (((r.y + 6) / 6) % 2) * 3;
      if (r.y >= 0 && tileFill(ctx, r, `halftone|${r.w.toFixed(2)}|${o0.toFixed(3)}|${o1.toFixed(3)}|${color}|${alpha}`, [r.w, 12], false, (c, _x0, y0, _x1, y1) => {
        c.fillStyle = color; c.globalAlpha = alpha;
        for (let y = Math.floor(y0 / 6) * 6; y <= y1; y += 6) { const o = ((y / 6) % 2 + 2) % 2 ? o1 : o0; for (let x = o; x < r.w; x += 6) { c.beginPath(); c.arc(x, y, 0.4 + (x / r.w) * 2.2, 0, Math.PI * 2); c.fill(); } }
      }, true)) return;
    } else if (tileFill(ctx, r, `${kind}|${color}|${alpha}`, per.p, kind === 'hazard', (c, x0, y0, x1, y1) => {
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.2; c.globalAlpha = alpha;
      per.draw(c, x0, y0, x1, y1);
    })) return;
  }
  drawOverlayDirect(ctx, r, kind, color, opacity);
}

/** 周期格的格点（左上角）：铺满 [x0, x1] × [y0, y1]（已含外扩的一圈） */
const cells = (pw: number, ph: number, x0: number, y0: number, x1: number, y1: number, f: (x: number, y: number) => void) => { for (let y = y0; y <= y1 + 1e-9; y += ph) for (let x = x0; x <= x1 + 1e-9; x += pw) f(x, y); };
/** 斜线（与原来 diag() 的线同一组：x' + y' = k × 步长，过盒子左下角起每隔一个步长一根），每根整条画一次 */
function diagLines(c: CanvasRenderingContext2D, P: number, w: number, x0: number, y0: number, x1: number, y1: number) {
  c.lineWidth = w;
  for (let k = Math.floor((x0 + y0) / P) - 1; k * P <= x1 + y1 + P; k++) { const d = k * P; c.beginPath(); c.moveTo(x0 - P, d - x0 + P); c.lineTo(d - y0 + P, y0 - P); c.stroke(); }
}
/** 走图块的叠层：周期 [宽, 高]、画法（坐标与原来逐个画时相对盒子左上角的一样；区域已含外扩一圈；画的次序与原来一样：方格纸先竖后横、警示条先底后条） */
const OVERLAY_TILES: Record<string, { p: [number, number]; draw: (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => void }> = {
  dots: { p: [8, 8], draw: (c, x0, y0, x1, y1) => cells(8, 8, x0, y0, x1, y1, (x, y) => { c.beginPath(); c.arc(x + 4, y + 4, 1.2, 0, Math.PI * 2); c.fill(); }) },
  checker: { p: [16, 16], draw: (c, x0, y0, x1, y1) => cells(16, 16, x0, y0, x1, y1, (x, y) => { c.fillRect(x, y, 8, 8); c.fillRect(x + 8, y + 8, 8, 8); }) },
  grid: { p: [10, 10], draw: (c, x0, y0, x1, y1) => {
    c.lineWidth = 0.6;
    for (let x = x0; x <= x1; x += 10) { c.beginPath(); c.moveTo(x + 0.5, y0); c.lineTo(x + 0.5, y1); c.stroke(); }
    for (let y = y0; y <= y1; y += 10) { c.beginPath(); c.moveTo(x0, y + 0.5); c.lineTo(x1, y + 0.5); c.stroke(); }
  } },
  leafTile: { p: [14, 28], draw: (c, x0, y0, x1, y1) => cells(14, 28, x0, y0, x1, y1, (x, y) => { for (const [dx, dy] of [[0, 0], [7, 14]]) { c.beginPath(); c.ellipse(x + dx, y + dy, 4, 2, 0.7, 0, Math.PI * 2); c.fill(); } }) },
  cloudTile: { p: [24, 36], draw: (c, x0, y0, x1, y1) => cells(24, 36, x0, y0, x1, y1, (x, y) => { for (const [dx, dy] of [[0, 8], [12, 26]]) { c.beginPath(); c.arc(x + dx, y + dy, 4, Math.PI, 0); c.arc(x + dx + 6, y + dy, 3, Math.PI, 0); c.stroke(); } }) },
  geometricTile: { p: [12, 12], draw: (c, x0, y0, x1, y1) => cells(12, 12, x0, y0, x1, y1, (x, y) => { c.beginPath(); c.moveTo(x + 6, y); c.lineTo(x + 12, y + 6); c.lineTo(x + 6, y + 12); c.lineTo(x, y + 6); c.closePath(); c.stroke(); }) },
  diagStripes: { p: [8, 8], draw: (c, x0, y0, x1, y1) => diagLines(c, 8, 2, x0, y0, x1, y1) },
  hatching: { p: [4, 4], draw: (c, x0, y0, x1, y1) => diagLines(c, 4, 0.8, x0, y0, x1, y1) },
  // 警示条：原来先铺一层黄（透明度设成绝对值 min(1, 2 × opacity)），再画黑斜条
  hazard: { p: [14, 14], draw: (c, x0, y0, x1, y1) => { c.fillStyle = '#f2c200'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.strokeStyle = '#111'; diagLines(c, 14, 6, x0, y0, x1, y1); } },
  halftone: { p: [12, 12], draw: () => undefined },
};

/* ---------------- M12b-42：图案库（有序抖动、双色网屏、K1 纹样集）与作用区域 ---------------- */

const b2 = (x: number, y: number) => { const a = ((Math.floor(x) % 2) + 2) % 2, b = ((Math.floor(y) % 2) + 2) % 2; return (a * 2 + b * 3 - 4 * a * b) / 4; };
/** 有序抖动矩阵（与画面后处理 src/engine/post/postGlsl.ts 的 bayer2 / bayer4 / bayer8 同一公式：画面侧 color.dither 与 UI 的 dither 图案点阵一致） */
export const bayer = (n: 4 | 8, x: number, y: number) => (n === 4 ? b2(x * 0.5, y * 0.5) * 0.25 + b2(x, y) : (b2(x * 0.25, y * 0.25) * 0.25 + b2(x * 0.5, y * 0.5)) * 0.25 + b2(x, y));
/** 反斜线（y = x − k × 步长），与 diagLines 一起成交叉排线 */
function antiDiagLines(c: CanvasRenderingContext2D, P: number, w: number, x0: number, y0: number, x1: number, y1: number) {
  c.lineWidth = w;
  for (let k = Math.floor((x0 - y1) / P) - 1; k * P <= x1 - y0 + P; k++) { const d = k * P; c.beginPath(); c.moveTo(y0 - P + d, y0 - P); c.lineTo(y1 + P + d, y1 + P); c.stroke(); }
}
/** 线条类图块画完之后统一乘透明度（线条交叠处不会叠深） */
const tileAlpha = (c: CanvasRenderingContext2D, a: number, x0: number, y0: number, x1: number, y1: number) => { c.globalCompositeOperation = 'destination-in'; c.globalAlpha = 1; c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2); c.globalCompositeOperation = 'source-over'; };
type TileSpec = { p: [number, number]; key: string; draw: (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => void };
/**
 * 新图案的图块（审查修复 A · L9 的图块化规则：一个整周期一块，按设备像素相位缓存，createPattern 铺满）。cs = 多色图案的颜色（第一色 / 第二色……）
 *   dither：有序抖动（bayer4 / bayer8），抖动格边长 = cell（跟 vis.pixelScale），点阵覆盖率 = vis.patternOpacity，满色无透明（1-bit 的「灰」，obra-dinn#0）；
 *   halftoneDuo：两层网屏（≈14° 与 76°，有理角度让图块正好成周期），点色 = 强调色 / 第二强调色（disco-elysium#25 的暖米 + 青）；
 *   seigaiha 青海波、asanoha 麻叶、starTile 八角星镶嵌、kente 肯特布条块、tortoiseShell 龟甲（丹青 / 亀甲）、flowerTone 少女漫画花朵网点、crossHatch 交叉排线、
 *   ruledMargin 横格纸（红色页边线在图块之外另画）
 */
function newTile(kind: string, ov: PatternOverlay, color: string, cs: string[], alpha: number): TileSpec | null {
  const c1 = cs[0] ?? color, c2 = cs[1] ?? c1, c3 = cs[2] ?? color;
  switch (kind) {
    case 'dither': {
      const n: 4 | 8 = ov.matrix === 'bayer8' ? 8 : 4, cell = Math.max(0.5, ov.cell ?? 1), level = Math.max(0, Math.min(1, ov.opacity));
      return { p: [n * cell, n * cell], key: `dither|${n}|${cell}|${level}|${color}`, draw: (c, x0, y0, x1, y1) => {
        c.fillStyle = color; c.globalAlpha = 1;
        for (let gy = Math.floor(y0 / cell); gy * cell <= y1; gy++) for (let gx = Math.floor(x0 / cell); gx * cell <= x1; gx++) if (bayer(n, gx, gy) < level) c.fillRect(gx * cell, gy * cell, cell, cell);
      } };
    }
    case 'halftoneDuo': {
      const P = 6, s = P / Math.sqrt(17), T = 17 * s;
      return { p: [T, T], key: `htduo|${c1}|${c2}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.globalAlpha = alpha;
        const lat = (ux: number, uy: number, vx: number, vy: number, rad: number, col: string) => {
          c.fillStyle = col;
          for (let a = -26; a <= 26; a++) for (let b = -26; b <= 26; b++) {
            const px = (a * ux + b * vx) * s, py = (a * uy + b * vy) * s;
            if (px < x0 - P || px > x1 + P || py < y0 - P || py > y1 + P) continue;
            c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill();
          }
        };
        lat(4, 1, -1, 4, P * 0.32, c1); lat(1, 4, -4, 1, P * 0.25, c2);
      } };
    }
    case 'seigaiha': {
      const R = 8;
      return { p: [2 * R, R], key: `seigaiha|${color}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.strokeStyle = color; c.lineWidth = 0.8; c.globalAlpha = 1;
        for (let row = Math.floor(y0 / (R / 2)) - 3; (row * R) / 2 <= y1 + R; row++) {
          const cy = (row * R) / 2 + R, off = ((row % 2) + 2) % 2 ? R : 0;
          for (let cx = Math.floor((x0 - off) / (2 * R)) * 2 * R - 2 * R + off; cx <= x1 + 2 * R; cx += 2 * R) {
            c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(cx, cy, R, Math.PI, Math.PI * 2); c.closePath(); c.fill();
            c.globalCompositeOperation = 'source-over';
            for (const k of [1, 0.7, 0.42]) { c.beginPath(); c.arc(cx, cy, R * k - 0.4, Math.PI, Math.PI * 2); c.stroke(); }
          }
        }
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'asanoha': {
      const P = 14, hh = (P * Math.sqrt(3)) / 2;
      return { p: [P, 2 * hh], key: `asanoha|${color}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.strokeStyle = color; c.lineWidth = 0.7; c.globalAlpha = 1;
        const pt = (i: number, j: number): [number, number] => [i * P + (((j % 2) + 2) % 2 ? P / 2 : 0), j * hh];
        const tri = (a: [number, number], b: [number, number], d: [number, number]) => {
          const gx = (a[0] + b[0] + d[0]) / 3, gy = (a[1] + b[1] + d[1]) / 3;
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath();
          for (const q of [a, b, d]) { c.moveTo(q[0], q[1]); c.lineTo(gx, gy); }
          c.stroke();
        };
        for (let j = Math.floor(y0 / hh) - 1; j * hh <= y1 + hh; j++) for (let i = Math.floor(x0 / P) - 2; i * P <= x1 + P; i++) {
          const odd = ((j % 2) + 2) % 2, a = pt(i, j), b = pt(i + 1, j), d = pt(i + odd, j + 1), e2 = pt(i + odd - 1, j + 1);
          tri(a, b, d); tri(e2, d, a);
        }
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'starTile': {
      const P = 24;
      return { p: [P, P], key: `star8|${color}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.strokeStyle = color; c.lineWidth = 0.8; c.globalAlpha = 1;
        const sq = (cx: number, cy: number, rad: number, rot: number) => { c.beginPath(); for (let i = 0; i < 4; i++) { const a = rot + (i * Math.PI) / 2; c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } c.closePath(); c.stroke(); };
        cells(P, P, x0, y0, x1, y1, (x, y) => { sq(x + P / 2, y + P / 2, P * 0.42, 0); sq(x + P / 2, y + P / 2, P * 0.42, Math.PI / 4); sq(x, y, P * 0.15, Math.PI / 4); });
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'kente': {
      const B = 8, cols = [c1, c2, c3];
      const M = [[0, 1, 0, 2], [0, 2, 0, 1], [0, 1, 0, 2], [0, 2, 0, 1]];
      return { p: [4 * B, 4 * B], key: `kente|${c1}|${c2}|${c3}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.globalAlpha = 1;
        cells(4 * B, 4 * B, x0, y0, x1, y1, (x, y) => {
          for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
            const k = M[j][(i + j) % 4];
            c.fillStyle = cols[k]; c.fillRect(x + i * B, y + j * B, B, B);
            if (k === 0) { c.fillStyle = c3; for (let t = 1; t < 4; t++) c.fillRect(x + i * B, y + j * B + t * (B / 4), B, B * 0.08); }
          }
          c.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i <= 4; i++) c.fillRect(x + i * B - 0.3, y, 0.6, 4 * B);
        });
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'tortoiseShell': {
      const R = 9, wx = Math.sqrt(3) * R;
      return { p: [wx, 3 * R], key: `kikko|${color}|${c1}|${c2}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.globalAlpha = 1; c.lineWidth = 0.9; c.strokeStyle = color;
        const hex = (cx: number, cy: number, rad: number) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 3; c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } c.closePath(); };
        for (let row = Math.floor(y0 / (1.5 * R)) - 1; row * 1.5 * R <= y1 + R; row++) {
          const odd = ((row % 2) + 2) % 2, cy = row * 1.5 * R;
          for (let i = Math.floor(x0 / wx) - 1; i * wx <= x1 + wx; i++) {
            const cx = i * wx + (odd ? wx / 2 : 0);
            hex(cx, cy, R * 0.6); c.fillStyle = (i + row) % 2 ? c1 : c2; c.fill();
            hex(cx, cy, R); c.stroke();
          }
        }
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'flowerTone': {
      const P = 18;
      return { p: [P, P], key: `flowerTone|${color}|${c1}|${alpha}`, draw: (c, x0, y0, x1, y1) => {
        c.globalAlpha = 1;
        cells(P, P, x0, y0, x1, y1, (x, y) => {
          c.fillStyle = withAlpha(color, 0.55);
          for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + i * 3 + 1.5, y + j * 3 + 1.5, 0.45, 0, Math.PI * 2); c.fill(); }
          for (const [fx, fy] of [[4.5, 4.5], [13.5, 13.5]]) {
            c.fillStyle = c1;
            for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; c.beginPath(); c.ellipse(x + fx + Math.cos(a) * 1.7, y + fy + Math.sin(a) * 1.7, 1.5, 0.95, a, 0, Math.PI * 2); c.fill(); }
            c.fillStyle = color; c.beginPath(); c.arc(x + fx, y + fy, 0.7, 0, Math.PI * 2); c.fill();
          }
        });
        tileAlpha(c, alpha, x0, y0, x1, y1);
      } };
    }
    case 'crossHatch': return { p: [5, 5], key: `xhatch|${color}|${alpha}`, draw: (c, x0, y0, x1, y1) => { c.strokeStyle = color; c.globalAlpha = 1; diagLines(c, 5, 0.7, x0, y0, x1, y1); antiDiagLines(c, 5, 0.7, x0, y0, x1, y1); tileAlpha(c, alpha, x0, y0, x1, y1); } };
    case 'ruledMargin': return { p: [12, 12], key: `ruledM|${color}|${alpha}`, draw: (c, x0, y0, x1, y1) => { c.fillStyle = color; c.globalAlpha = alpha; for (let y = Math.floor(y0 / 12) * 12; y <= y1; y += 12) c.fillRect(x0, y + 11, x1 - x0, 0.8); } };
    default: return null;
  }
}
/** M12b-42 加的图案名（drawPattern 先认它们，其余交给原来的 drawOverlay，逐像素不变） */
const NEW_PATTERNS = new Set(['dither', 'halftoneDuo', 'seigaiha', 'asanoha', 'starTile', 'kente', 'tortoiseShell', 'flowerTone', 'crossHatch', 'ruledMargin', 'sunburst']);
/** 一种图案铺满 r（在当前裁剪里）：新图案走 newTile / 放射光芒，原来的走 drawOverlay */
function patternFill(ctx: CanvasRenderingContext2D, r: Rect, ov: PatternOverlay, color: string, opacity: number, pal: SkinPalette) {
  if (!NEW_PATTERNS.has(ov.kind)) return drawOverlay(ctx, r, ov.kind, color, opacity);
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || r.w <= 0 || r.h <= 0) return;
  const cs = (ov.colors ?? []).map((c) => resolveColor(c, pal));
  if (ov.kind === 'sunburst') {
    // 放射光芒（静态）：从 vis.patternOrigin 放射的 24 道扇形，隔一道着色
    const [ax, ay] = ov.origin ?? [0.5, 0.5], cx = r.x + r.w * ax, cy = r.y + r.h * ay, rad = Math.hypot(r.w, r.h) * 1.05;
    ctx.save(); ctx.globalAlpha *= opacity; ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 24; i += 2) { const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad); ctx.lineTo(cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad); ctx.closePath(); }
    ctx.fill(); ctx.restore();
    return;
  }
  const spec = newTile(ov.kind, { ...ov, opacity }, color, cs, opacity);
  if (spec) tileFill(ctx, r, spec.key, spec.p, false, spec.draw);
  // 横格纸的红色页边线（不是周期的，图块之外另画两道）
  if (ov.kind === 'ruledMargin') { ctx.save(); ctx.fillStyle = withAlpha('#d9534f', Math.min(1, opacity * 1.6)); const mx = r.x + Math.max(10, r.w * 0.07); ctx.fillRect(mx, r.y, 0.9, r.h); ctx.fillRect(mx + 2.4, r.y, 0.6, r.h); ctx.restore(); }
}
/**
 * 图案叠层（vis.pattern）按作用区域画（vis.patternArea，M12b-42）：panel = 整块（原来的）；header = 标题带（ov.header 高，没给时 dividerAt / 盒高 18%）；
 * edgeStrip = 沿描边那几条边（vis.strokeSides；全边 = 四条）6% 宽的带；shadowOnly = 下方与右侧 40% 的 L 形，往右下角四层叠深（离散渐隐，不用临时画布）。
 * 图块原点都在盒子左上角（区域之间花纹接得上）
 */
export function drawPattern(ctx: CanvasRenderingContext2D, r: Rect, ov: PatternOverlay, pal: SkinPalette) {
  const color = resolveColor(ov.color, pal), area = ov.area ?? 'panel';
  if (area === 'panel') return patternFill(ctx, r, ov, color, ov.opacity, pal);
  const clipTo = (rs: Rect[], op: number) => { ctx.save(); ctx.beginPath(); for (const q of rs) ctx.rect(q.x, q.y, q.w, q.h); ctx.clip(); patternFill(ctx, r, ov, color, op, pal); ctx.restore(); };
  if (area === 'header') { const h = Math.min(r.h, ov.header ?? Math.max(16, Math.min(44, r.h * 0.18))); return clipTo([{ x: r.x, y: r.y, w: r.w, h }], ov.opacity); }
  if (area === 'edgeStrip') {
    const e = ov.edges ?? 'trbl', tv = Math.max(3, r.h * 0.06), th = Math.max(3, r.w * 0.06), rs: Rect[] = [];
    if (e.includes('t')) rs.push({ x: r.x, y: r.y, w: r.w, h: tv });
    if (e.includes('b')) rs.push({ x: r.x, y: r.y + r.h - tv, w: r.w, h: tv });
    if (e.includes('l')) rs.push({ x: r.x, y: r.y, w: th, h: r.h });
    if (e.includes('r')) rs.push({ x: r.x + r.w - th, y: r.y, w: th, h: r.h });
    return clipTo(rs, ov.opacity);
  }
  if (area === 'shadowOnly') {
    // 四层嵌套的 L 形，每层透明度 a（叠满四层 = 设定的强度）：越靠右下越深；抖动图案是 1-bit，按层降覆盖率
    const n = 4, a = 1 - Math.pow(1 - Math.max(0, Math.min(1, ov.opacity)), 1 / n);
    for (let k = 0; k < n; k++) {
      const f = (0.4 * (n - k)) / n, rs = [{ x: r.x, y: r.y + r.h * (1 - f), w: r.w, h: r.h * f }, { x: r.x + r.w * (1 - f), y: r.y, w: r.w * f, h: r.h }];
      if (ov.kind === 'dither') { ctx.save(); ctx.beginPath(); for (const q of rs) ctx.rect(q.x, q.y, q.w, q.h); ctx.clip(); patternFill(ctx, r, { ...ov, opacity: (ov.opacity * (k + 1)) / n }, color, (ov.opacity * (k + 1)) / n, pal); ctx.restore(); }
      else clipTo(rs, a);
    }
    return;
  }
  patternFill(ctx, r, ov, color, ov.opacity, pal);
}

/* ---------------- M12b-52：表面处理与磨损 ---------------- */

/**
 * 表面处理（ast.finish，§2；balatro#14 的牌面版本）：foil = 银金斜向箔光（overlay 合成）+ 细噪点；holo = 斜向彩虹（screen）+ 细斜纹；
 * polychrome = 多色（color 合成的彩虹径向渐变）；glass = 半透明玻璃（screen 白光斜带 + 内缘亮线）。都在调用方的裁剪里画，只是渐变与缓存图块
 */
export function drawFinish(ctx: CanvasRenderingContext2D, r: Rect, kind: string, rim?: () => void, light = false) {
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) return;
  // 浅色面（牌白、收藏卡白、浅瓷……：lightFace）走浅色版（B7 审查修复 ⑯）：overlay / screen / color 在近白底上几乎不改色（最大 ≈ 9 / 255），换成 multiply / 压色
  if (light && FINISH_LIGHT[kind]) { drawFinishLight(ctx, r, kind, rim); return; }
  ctx.save();
  if (kind === 'foil') {
    ctx.globalCompositeOperation = 'overlay';
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    for (const [t, c] of [[0, 'rgba(255,255,255,0.55)'], [0.22, 'rgba(201,162,74,0.45)'], [0.45, 'rgba(255,255,255,0.7)'], [0.7, 'rgba(120,110,80,0.4)'], [1, 'rgba(255,255,255,0.5)']] as const) g.addColorStop(t, c);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    drawOverlay(ctx, r, 'dots', '#ffffff', 0.12);
  } else if (kind === 'holo') {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(r.x, r.y + r.h, r.x + r.w, r.y);
    ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#7b5cff', '#ff4d6d'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), withAlpha(c, 0.3)));
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    drawOverlay(ctx, r, 'hatching', '#ffffff', 0.08);
  } else if (kind === 'polychrome') {
    ctx.globalCompositeOperation = 'color';
    const g = ctx.createRadialGradient(r.x + r.w * 0.3, r.y + r.h * 0.25, 0, r.x + r.w * 0.5, r.y + r.h * 0.5, Math.hypot(r.w, r.h) * 0.6);
    ['#ff5e5e', '#ffd25e', '#5eff9b', '#5ec8ff', '#b05eff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), withAlpha(c, 0.45)));
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  } else if (kind === 'glass') {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.8, r.y + r.h);
    g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(0.35, 'rgba(255,255,255,0.08)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(0.6, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    if (rim) { ctx.beginPath(); rim(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke(); }
  }
  ctx.restore();
}
/** 浅色面（与白色的对比 < 1.3：牌白 #f7f3ea、收藏卡白、浅色面板）——表面处理要换浅色版（drawFinish 的 light） */
export const lightFace = (c: string | null | undefined): boolean => !!c && alphaOf(c) >= 0.85 && luminance(c) > 0.757;
/**
 * 表面处理的浅色版（B7 审查修复 ⑯，Balatro 的白牌面版本）：op = 合成方式，stops = 主渐变的色标（diag 左上 → 右下、diagUp 左下 → 右上、radial 偏左上的径向）。
 * foil = 蓝银 + 金的斜向箔带（multiply）+ 深色细噪点；holo = 饱和彩虹斜带（multiply）+ 深色细斜纹；polychrome = 色相扫过（multiply 的径向渐变）；
 * glass = 半透明冷色压一层（source-over）+ 白光斜带 + 深色内缘线。导出给 test-knowledge 量「白底上明度 / 色的变化」
 */
export const FINISH_LIGHT: Record<string, { op: GlobalCompositeOperation; dir: 'diag' | 'diagUp' | 'radial'; stops: [number, string][] }> = {
  foil: { op: 'multiply', dir: 'diag', stops: [[0, 'rgba(150,170,205,0.42)'], [0.22, 'rgba(201,162,74,0.45)'], [0.45, 'rgba(230,236,248,0.12)'], [0.7, 'rgba(110,128,168,0.42)'], [1, 'rgba(190,160,90,0.38)']] },
  holo: { op: 'multiply', dir: 'diagUp', stops: ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#7b5cff', '#ff4d6d'].map((c, i, a) => [i / (a.length - 1), withAlpha(c, 0.4)] as [number, string]) },
  polychrome: { op: 'multiply', dir: 'radial', stops: ['#ff5e5e', '#ffd25e', '#5eff9b', '#5ec8ff', '#b05eff'].map((c, i, a) => [i / (a.length - 1), withAlpha(c, 0.42)] as [number, string]) },
  glass: { op: 'source-over', dir: 'diag', stops: [[0, 'rgba(110,160,210,0.30)'], [0.35, 'rgba(110,160,210,0.18)'], [0.5, 'rgba(255,255,255,0.45)'], [0.6, 'rgba(110,160,210,0.22)'], [1, 'rgba(90,140,200,0.30)']] },
};
function drawFinishLight(ctx: CanvasRenderingContext2D, r: Rect, kind: string, rim?: () => void) {
  const f = FINISH_LIGHT[kind];
  ctx.save();
  ctx.globalCompositeOperation = f.op;
  const g = f.dir === 'radial' ? ctx.createRadialGradient(r.x + r.w * 0.3, r.y + r.h * 0.25, 0, r.x + r.w * 0.5, r.y + r.h * 0.5, Math.hypot(r.w, r.h) * 0.6)
    : f.dir === 'diagUp' ? ctx.createLinearGradient(r.x, r.y + r.h, r.x + r.w, r.y) : ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  for (const [t, c] of f.stops) g.addColorStop(t, c);
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalCompositeOperation = 'source-over';
  if (kind === 'foil') drawOverlay(ctx, r, 'dots', '#4a5a7a', 0.16);
  else if (kind === 'holo') drawOverlay(ctx, r, 'hatching', '#3a3f6a', 0.12);
  else if (kind === 'glass' && rim) { ctx.beginPath(); rim(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(50,95,150,0.7)'; ctx.stroke(); }
  ctx.restore();
}
/** 划痕图块（磨损档 1~4，48 一个周期，线条首尾绕回图块，按图块缓存） */
function wearTile(level: number): TileSpec {
  return { p: [48, 48], key: `wear|${level}`, draw: (c, x0, y0, x1, y1) => {
    c.lineWidth = 0.6; c.globalAlpha = 1;
    cells(48, 48, x0, y0, x1, y1, (x, y) => {
      const R2 = rand(977 + level);
      for (let i = 0; i < level * 5; i++) {
        const sx = R2() * 48, sy = R2() * 48, a = R2() * Math.PI, l = 4 + R2() * 12 * (0.5 + level * 0.2), dark = R2() < 0.55;
        c.strokeStyle = dark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.3)';
        c.beginPath(); c.moveTo(x + sx, y + sy); c.lineTo(x + sx + Math.cos(a) * l, y + sy + Math.sin(a) * l); c.stroke();
      }
    });
  } };
}
/**
 * 磨损（ast.wear，M12b-52）：四角压暗（径向渐变）、划痕（缓存图块，按磨损分 4 档）、沿边的小缺口（按种子定位置，数量随周长与磨损，最多 24 个）
 */
function drawWear(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, wear: number) {
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) return;
  const a = Math.max(0, Math.min(1, wear)), short = Math.min(r.w, r.h);
  ctx.save();
  for (const [cx, cy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, short * 0.5);
    g.addColorStop(0, `rgba(0,0,0,${0.36 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - short * 0.5, cy - short * 0.5, short, short);
  }
  const t = wearTile(Math.max(1, Math.min(4, Math.ceil(a * 4))));
  tileFill(ctx, r, t.key, t.p, false, t.draw);
  const R = rand(shapeSeed(s, r.w, r.h) ^ 0x2c1b3c6d), n = Math.min(24, Math.round(((2 * (r.w + r.h)) / 40) * a));
  for (let i = 0; i < n; i++) {
    const [px, py] = perimPoint(r.x, r.y, r.w, r.h, R()), k = 1.5 + R() * 3 * a, dx = r.x + r.w / 2 - px, dy = r.y + r.h / 2 - py, l = Math.hypot(dx, dy) || 1;
    const nx = (dx / l) * k, ny = (dy / l) * k;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.moveTo(px - ny, py + nx); ctx.lineTo(px + nx, py + ny); ctx.lineTo(px + ny, py - nx); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/**
 * 材质的盒级处理（M12b-52）：watercolor = 沿外形的深色潮线 + 内侧一圈淡晕（storybook）；porcelain = 上亮下暗的釉光 + 内缘亮线（slay-the-spire#16）；
 * translucentPlastic = 上 38% 的白色光泽条 + 顶边亮线（Y2K）；velvet = 一层向下的柔光（civ6#29）。都是渐变 / 一两道描边，不进平铺小图
 */
function materialBox(ctx: CanvasRenderingContext2D, r: Rect, s: BoxStyle, mat: string, base: string) {
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) return;
  const path = (i: number) => { ctx.beginPath(); boxPath(ctx, r, s, i); };
  if (mat === 'watercolor') {
    ctx.save();
    path(1.5); ctx.lineWidth = 5; ctx.strokeStyle = withAlpha(mix(base, '#000', 0.3), 0.12); ctx.stroke();
    path(1.2); ctx.lineWidth = 1.6; ctx.strokeStyle = withAlpha(mix(base, '#3a2a10', 0.55), 0.5); ctx.stroke();
    ctx.restore();
  } else if (mat === 'porcelain' || mat === 'velvet' || mat === 'translucentPlastic') {
    ctx.save();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    if (mat === 'porcelain') { g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(0.5, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); }
    else if (mat === 'velvet') { g.addColorStop(0, 'rgba(255,240,230,0.14)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.38, 'rgba(255,255,255,0.12)'); g.addColorStop(0.39, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.06)'); }
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (mat !== 'velvet') { path(1); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke(); }
    ctx.restore();
  }
}

/** 只量不画的画布的记号（measureOnlyCtx 的代理对它返回 true） */
export const MEASURE_ONLY = Symbol('measureOnly');

/** 图块缓存（键 = 图案 + 色 + 透明度 + 像素密度 + 设备像素相位），最多 96 张，最近用的留下 */
const TILES = new Map<string, HTMLCanvasElement>();

/**
 * 用图块铺满盒子（图块原点 = 盒子左上角）。per = 一个周期 [宽, 高]（设计单位）；absolute = 警示条原来把透明度设成绝对值（不乘外层透明度）；
 * strip = 只在竖向是周期（网点条：横向就是整个盒子宽，不重复）。
 * 像素密度：画布当前变换的缩放 s；图块取整数个周期（k ≤ 8，挑 k × 周期 × s 最接近整数的），每单位 sg ≈ s 像素、图块宽高正好是整像素；
 * 画布只有缩放与平移时（绝大多数），图块按盒子左上角在设备像素里的小数部分错开、图案原点放在整像素上——图块像素与屏幕像素对齐，不做插值；有旋转 / 斜切时按单位铺
 */
function tileFill(ctx: CanvasRenderingContext2D, r: Rect, key: string, per: [number, number], absolute: boolean, draw: (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => void, strip = false): boolean {
  const m = ctx.getTransform();
  const aligned = Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && m.a > 0 && Math.abs(m.a - m.d) < 1e-9;
  const s = aligned ? m.a : Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
  // 竖向取 ky 个周期定像素密度 sg，横向取 kx 个周期让图块宽也是整像素（误差最小的）
  const pick = (P: number, sc: number) => { let best = 1, err = Infinity; for (let k = 1; k <= 8; k++) { const v = k * P * sc; if (v > 512 && k > 1) break; const e = Math.abs(v - Math.round(v)); if (e < err - 1e-6) { err = e; best = k; } } return best; };
  const ky = pick(per[1], s);
  const sg = Math.round(ky * per[1] * s) / (ky * per[1]);
  if (!(sg > 0)) return false;
  const kx = strip ? 1 : pick(per[0], sg);
  const tw = strip ? Math.ceil(per[0] * sg) + 2 : Math.round(kx * per[0] * sg), th = Math.round(ky * per[1] * sg);
  if (tw < 1 || th < 1 || tw > 4096 || th > 512) return false;
  // 设备像素相位（对齐时）：盒子左上角落在设备像素的小数部分，量化到 1/32 像素
  const dx0 = aligned ? m.a * r.x + m.e : 0, dy0 = aligned ? m.d * r.y + m.f : 0;
  const fx = aligned ? Math.round((dx0 - Math.floor(dx0)) * 32) / 32 : 0, fy = aligned ? Math.round((dy0 - Math.floor(dy0)) * 32) / 32 : 0;
  const k = `${key}|${tw}x${th}|${sg.toFixed(5)}|${fx},${fy}`;
  let tile = TILES.get(k);
  if (tile) { TILES.delete(k); TILES.set(k, tile); }
  else {
    if (typeof document === 'undefined') return false;
    tile = document.createElement('canvas');
    tile.width = tw; tile.height = th;
    const c = tile.getContext('2d');
    if (!c) return false;
    c.translate(fx, fy); c.scale(sg, sg);
    // 周期格铺满图块，外加一圈（盖住相位错开与跨格的图形）
    const W = strip ? per[0] : kx * per[0], H = ky * per[1];
    draw(c, strip ? 0 : -per[0], -per[1], strip ? W : W + per[0], H + per[1]);
    if (TILES.size >= 96) TILES.delete(TILES.keys().next().value!);
    TILES.set(k, tile);
  }
  const pat = ctx.createPattern(tile, strip ? 'repeat-y' : 'repeat');
  if (!pat) return false;
  ctx.save();
  if (absolute) ctx.globalAlpha = 1;
  if (aligned) { ctx.setTransform(1, 0, 0, 1, Math.floor(dx0), Math.floor(dy0)); ctx.fillStyle = pat; ctx.fillRect(dx0 - Math.floor(dx0), dy0 - Math.floor(dy0), r.w * s, r.h * s); }
  else { ctx.translate(r.x, r.y); ctx.scale(1 / sg, 1 / sg); ctx.fillStyle = pat; ctx.fillRect(0, 0, r.w * sg, r.h * sg); }
  ctx.restore();
  return true;
}

/**
 * 盒子底的图案（bg.pattern：竖条 / 横格 / 点）按图块铺（审查修复 A · L9，与 drawOverlay 同一套 tileFill）：几何与原来逐个画的一样——竖条从左缘起、
 * 横格从下缘往上数、点在格点上（左上角起）。斜条与图块建不出来（没有 document）时返回 false，调用方逐个画
 */
function fillPatternTiled(ctx: CanvasRenderingContext2D, r: Rect, pt: { kind: string; size: number; line: number }, fg: string): boolean {
  if ((ctx as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) return true;
  // 斜条的周期是 size × √2（无理数，图块铺不出整像素周期、会漂）：照旧逐条画（一块面板只有几百条，不是瓶颈）
  if (!(pt.size > 0) || r.w <= 0 || r.h <= 0 || !['stripes', 'ruled', 'dots'].includes(pt.kind)) return false;
  const P = pt.size;
  // 横格的相位：线在 y' ≡ h (mod size)（从下缘往上数）
  const phi = pt.kind === 'ruled' ? ((r.h % pt.size) + pt.size) % pt.size : 0;
  return tileFill(ctx, r, `bg:${pt.kind}|${pt.size}|${pt.line}|${fg}|${pt.kind === 'ruled' ? phi.toFixed(3) : ''}`, [P, P], false, (c, x0, y0, x1, y1) => {
    c.fillStyle = fg; c.strokeStyle = fg;
    if (pt.kind === 'stripes') { for (let x = x0; x <= x1; x += P) c.fillRect(x, y0, pt.line, y1 - y0); }
    else if (pt.kind === 'ruled') { for (let y = y0; y <= y1; y += P) c.fillRect(x0, y + phi, x1 - x0, pt.line); }
    else cells(P, P, x0, y0, x1, y1, (x, y) => { c.beginPath(); c.arc(x, y, pt.line, 0, Math.PI * 2); c.fill(); });
  });
}

/** 逐个画（原来的画法；绗缝 / 重复文字 / 图腾，以及图块建不出来时） */
function drawOverlayDirect(ctx: CanvasRenderingContext2D, r: Rect, kind: string, color: string, opacity: number) {
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  const diag = (step: number, w: number) => {
    ctx.lineWidth = w;
    for (let d = -r.h; d < r.w + r.h; d += step) { ctx.beginPath(); ctx.moveTo(r.x + d, r.y + r.h); ctx.lineTo(r.x + d + r.h, r.y); ctx.stroke(); }
  };
  switch (kind) {
    case 'diagStripes': diag(8, 2); break;
    case 'hazard': ctx.fillStyle = '#f2c200'; ctx.globalAlpha = Math.min(1, opacity * 2); ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = '#111'; diag(14, 6); break;
    case 'hatching': diag(4, 0.8); break;
    case 'dots': for (let y = r.y + 4; y < r.y + r.h; y += 8) for (let x = r.x + 4; x < r.x + r.w; x += 8) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); } break;
    case 'halftone': for (let y = r.y; y < r.y + r.h; y += 6) for (let x = r.x + ((y / 6) % 2) * 3; x < r.x + r.w; x += 6) { const k = (x - r.x) / r.w; ctx.beginPath(); ctx.arc(x, y, 0.4 + k * 2.2, 0, Math.PI * 2); ctx.fill(); } break;
    case 'checker': for (let y = r.y; y < r.y + r.h; y += 8) for (let x = r.x; x < r.x + r.w; x += 8) if ((Math.round((x - r.x) / 8) + Math.round((y - r.y) / 8)) % 2 === 0) ctx.fillRect(x, y, 8, 8); break;
    case 'grid':
      ctx.lineWidth = 0.6;
      for (let x = r.x; x < r.x + r.w; x += 10) { ctx.beginPath(); ctx.moveTo(x + 0.5, r.y); ctx.lineTo(x + 0.5, r.y + r.h); ctx.stroke(); }
      for (let y = r.y; y < r.y + r.h; y += 10) { ctx.beginPath(); ctx.moveTo(r.x, y + 0.5); ctx.lineTo(r.x + r.w, y + 0.5); ctx.stroke(); }
      break;
    case 'quilt':
      ctx.setLineDash([3, 3]);
      diag(16, 1);
      ctx.save(); ctx.translate(r.x * 2 + r.w, 0); ctx.scale(-1, 1); diag(16, 1); ctx.restore();
      ctx.setLineDash([]);
      break;
    case 'leafTile': for (let y = r.y; y < r.y + r.h; y += 14) for (let x = r.x + (Math.round((y - r.y) / 14) % 2) * 7; x < r.x + r.w; x += 14) { ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0.7, 0, Math.PI * 2); ctx.fill(); } break;
    case 'cloudTile': for (let y = r.y + 8; y < r.y + r.h; y += 18) for (let x = r.x + (Math.round((y - r.y) / 18) % 2) * 12; x < r.x + r.w; x += 24) { ctx.beginPath(); ctx.arc(x, y, 4, Math.PI, 0); ctx.arc(x + 6, y, 3, Math.PI, 0); ctx.stroke(); } break;
    case 'geometricTile': for (let y = r.y; y < r.y + r.h; y += 12) for (let x = r.x; x < r.x + r.w; x += 12) { ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y + 6); ctx.lineTo(x + 6, y + 12); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.stroke(); } break;
    case 'repeatText':
      ctx.font = '700 9px sans-serif';
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(-0.35);
      for (let y = -r.w; y < r.h + r.w; y += 12) ctx.fillText('UI · '.repeat(60), -r.w, y);
      ctx.restore();
      break;
    case 'totem': for (let x = r.x + 6; x < r.x + r.w; x += 16) { ctx.beginPath(); ctx.moveTo(x, r.y + r.h); ctx.lineTo(x + 5, r.y + r.h - 8); ctx.lineTo(x + 10, r.y + r.h); ctx.moveTo(x + 2, r.y + 4); ctx.lineTo(x + 8, r.y + 4); ctx.stroke(); } break;
    default: break;
  }
  ctx.restore();
}

/**
 * 光泽高光（vis.gloss）。M12b-41：diagonalSheen = 一道 30° 的宽斜光带（透明度约 0.13，hades#23）；arc = 沿顶部转角的弧形玻璃高光
 * （圆 / 椭圆外形是一弯贴着上沿的月牙，方框 / 药丸是跟着转角半径的上半截圆角块，Frutiger Aero）
 */
function drawGloss(ctx: CanvasRenderingContext2D, r: Rect, kind: NonNullable<BoxStyle['gloss']>, s: BoxStyle = {}) {
  ctx.save();
  if (kind === 'diagonalSheen') {
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + Math.min(r.h, r.w) * 0.58);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0.13)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.06)'); g.addColorStop(0.62, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    return;
  }
  if (kind === 'arc') {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.62)'); g.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (s.circle || s.shape === 'circle' || s.shape === 'oval') {
      const rx = (s.shape === 'oval' ? ovalRx(r.w, r.h) : r.w / 2) * 0.78;
      ctx.ellipse(r.x + r.w / 2, r.y + r.h * 0.28, rx, r.h * 0.22, 0, 0, Math.PI * 2);
    } else {
      const rad = radiusOf(r, s), rr = typeof rad === 'number' ? rad : 0, ix = Math.max(1.5, Math.min(r.w, r.h) * 0.05);
      ctx.roundRect(r.x + ix, r.y + ix, r.w - ix * 2, r.h * 0.45, Math.max(0, Math.min(rr - ix, r.h * 0.22)));
    }
    ctx.fill();
    ctx.restore();
    return;
  }
  if (kind === 'topShine' || kind === 'candy') {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.5);
    g.addColorStop(0, `rgba(255,255,255,${kind === 'candy' ? 0.55 : 0.35})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    if (kind === 'candy') { ctx.beginPath(); ctx.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.18, r.w * 0.42, r.h * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(r.x, r.y, r.w, r.h * 0.5);
  } else if (kind === 'chrome') {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.45, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(0.5, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(255,240,200,0.3)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

export { mix };

/** 各边边框宽度（排版用：border-box 的内容区要减掉它们） */
export function borderWidths(s: BoxStyle): { t: number; r: number; b: number; l: number } {
  if (s.border) return { t: s.border.width, r: s.border.width, b: s.border.width, l: s.border.width };
  return { t: s.sides?.t?.width ?? 0, r: s.sides?.r?.width ?? 0, b: s.sides?.b?.width ?? 0, l: s.sides?.l?.width ?? 0 };
}

export interface TextOpts extends TextStyle {
  font: string;
  size: number;
  weight: number;
  color: string;
  glow?: string;
  /** 不随文字缩放放大（格子角上的数量 / 键位这类贴在固定尺寸图形上的小字） */
  fixedSize?: boolean;
  /** 不加自动反差描边（§8 RC3 ①：有自己底色处理的字，如强调色底上的字） */
  noHalo?: boolean;
}

/**
 * 字重就近取（M12a-33）：字体栈第一个是自托管的 GAE 字族时，按它实际打包的字重（fontList.ts 的 FONT_WEIGHTS）取——
 * 比最细的一档还细（细体 300，GAE 字族最细 400）→ 最细的一档；落在两档之间 → 就近（等距取重的）；比最粗的一档还粗 → 原样
 * （浏览器本来就取最粗那档；只有 400 一档的楷体 / 像素字照旧由浏览器合成粗体，旧皮肤的粗体像素字不变）。不是 GAE 字族的栈原样
 */
export function faceWeight(font: string, w: number): number {
  const fam = /^\s*"([^"]+)"/.exec(font)?.[1];
  const ws = fam ? FONT_WEIGHTS[fam] : undefined;
  if (!ws?.length || ws.includes(w) || w > ws[ws.length - 1]) return w;
  if (w < ws[0]) return ws[0];
  return ws.reduce((a, b) => (Math.abs(b - w) <= Math.abs(a - w) ? b : a));
}

export const fontString = (o: { font: string; size: number; weight: number; italic?: boolean }) => `${o.italic ? 'italic ' : ''}${faceWeight(o.font, o.weight)} ${o.size}px ${o.font}`;

/* ---------------- 矢量数字字形（M12b-07）：七段数码管 / 5 × 7 点阵 / 单线笔画，不用字体文件，Canvas 直接画 ---------------- */

/** 用矢量画的数字字族（typ.numerals.family）：七段数码、点阵、单线笔画（Hershey 式） */
export const VECTOR_NUMERALS = new Set(['sevenSeg', 'dotMatrix', 'singleStroke']);
/** 七段数码管每个字点亮的段：a 顶、b 右上、c 右下、d 底、e 左下、f 左上、g 中 */
const SEG7: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', '−': 'g' };
/** 5 × 7 点阵（每行 5 位，1 = 亮） */
const DOT57: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'], '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'], '%': ['11000', '11001', '00010', '00100', '01000', '10011', '00011'],
};
/** 单线笔画（Hershey 式）：每个字若干条折线，坐标 x 0..1（字宽）、y 0..1（字高，向下） */
const STROKE1: Record<string, number[][]> = {
  '0': [[0.5, 0, 0.85, 0.1, 1, 0.5, 0.85, 0.9, 0.5, 1, 0.15, 0.9, 0, 0.5, 0.15, 0.1, 0.5, 0]],
  '1': [[0.25, 0.2, 0.58, 0, 0.58, 1]],
  '2': [[0.05, 0.22, 0.22, 0.04, 0.5, 0, 0.8, 0.05, 0.95, 0.25, 0.85, 0.45, 0, 1, 1, 1]],
  '3': [[0.05, 0, 0.92, 0, 0.45, 0.42, 0.75, 0.45, 0.98, 0.65, 0.93, 0.86, 0.72, 1, 0.3, 1, 0.03, 0.88]],
  '4': [[0.75, 1, 0.75, 0, 0, 0.7, 1, 0.7]],
  '5': [[0.9, 0, 0.15, 0, 0.08, 0.45, 0.35, 0.38, 0.75, 0.42, 0.98, 0.65, 0.9, 0.9, 0.6, 1, 0.3, 1, 0.02, 0.88]],
  '6': [[0.85, 0.06, 0.55, 0, 0.25, 0.08, 0.05, 0.4, 0.03, 0.7, 0.15, 0.92, 0.45, 1, 0.75, 0.95, 0.97, 0.75, 0.9, 0.52, 0.6, 0.42, 0.3, 0.45, 0.05, 0.62]],
  '7': [[0, 0, 1, 0, 0.35, 1]],
  '8': [[0.5, 0.45, 0.15, 0.35, 0.1, 0.15, 0.3, 0, 0.7, 0, 0.9, 0.15, 0.85, 0.35, 0.5, 0.45, 0.1, 0.6, 0.02, 0.8, 0.2, 1, 0.8, 1, 0.98, 0.8, 0.9, 0.6, 0.5, 0.45]],
  '9': [[0.95, 0.38, 0.7, 0.55, 0.4, 0.58, 0.1, 0.48, 0.02, 0.25, 0.2, 0.03, 0.5, 0, 0.8, 0.05, 0.97, 0.3, 0.95, 0.6, 0.75, 0.92, 0.45, 1, 0.15, 0.92]],
  '-': [[0.15, 0.55, 0.85, 0.55]], '+': [[0.15, 0.55, 0.85, 0.55], [0.5, 0.25, 0.5, 0.85]], '/': [[0.95, 0, 0.05, 1]], '%': [[0.9, 0, 0.1, 1]],
};
/** 窄字（冒号、小数点、千分位）：只画点，字宽小 */
const NARROW = new Set([':', '.', ',']);
/**
 * 矢量数字的一个字占的宽（size = 实际字号，已乘文字缩放）：数字 / 符号 ≈ 0.6 字号、冒号 / 小数点 0.3、空格 0.35；这个字族不认识的字（字母、汉字）返回 null——
 * 调用方按字体量、用字体画（混排：「LAP 2/3」的 LAP 照常是字）
 */
export function vectorAdvance(ch: string, size: number, fam: string): number | null {
  if (ch === ' ') return size * 0.35;
  if (NARROW.has(ch)) return size * 0.3;
  const known = fam === 'sevenSeg' ? ch in SEG7 : fam === 'dotMatrix' ? ch in DOT57 : ch in STROKE1;
  return known ? size * (fam === 'dotMatrix' ? 0.62 : 0.6) : null;
}
/**
 * 画一个矢量数字字形：x = 字的左边、ty = 行的中线、size = 实际字号；字身高 0.72 字号、居中在 ty。
 * thick = 笔画粗细倍数（typ.numerals.weight：细 0.65 / 常规 1 / 粗 1.35 / 特粗 1.7）；unlit = 熄灭段 / 熄灭点的颜色（七段 / 点阵的「暗段」，null 不画）；
 * outline = 描边（先画一圈加粗的描边色，与文字描边同口径）。Godot：七段 = DSEG7 字体或 _draw() 画段，点阵 / 单线 = _draw()（同一组点表移植）
 */
export function vectorGlyph(ctx: CanvasRenderingContext2D, ch: string, x: number, ty: number, size: number, fam: string, color: string, unlit: string | null, thick = 1, outline?: { color: string; width: number }) {
  const adv = vectorAdvance(ch, size, fam);
  if (adv === null || ch === ' ') return;
  const H = size * 0.72, top = ty - H / 2, w = adv * 0.82, x0 = x + (adv - w) / 2;
  ctx.save();
  if (NARROW.has(ch)) {
    // 冒号两点、小数点 / 千分位一点（点阵字族画方点）
    const r = Math.max(0.8, size * 0.055 * thick), cx = x + adv / 2, ys = ch === ':' ? [top + H * 0.3, top + H * 0.72] : [top + H - r];
    for (const pass of outline ? [0, 1] : [1]) {
      ctx.fillStyle = pass ? color : outline!.color;
      const rr = pass ? r : r + outline!.width;
      for (const yy of ys) { ctx.beginPath(); if (fam === 'dotMatrix') ctx.rect(cx - rr, yy - rr, rr * 2, rr * 2); else ctx.arc(cx, yy, rr, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    return;
  }
  if (fam === 'sevenSeg') {
    // 七段：每段是两头尖的六边形，熄灭段画暗色（LED 的「鬼影段」）
    const t = Math.max(1, size * 0.1 * thick), hh = (H - t) / 2, lx = x0 + t / 2, rx = x0 + w - t / 2;
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      const horiz = ay === by, d = t / 2, gap = t * 0.18;
      ctx.beginPath();
      if (horiz) { const a = ax + gap, b = bx - gap; ctx.moveTo(a, ay); ctx.lineTo(a + d, ay - d); ctx.lineTo(b - d, ay - d); ctx.lineTo(b, ay); ctx.lineTo(b - d, ay + d); ctx.lineTo(a + d, ay + d); }
      else { const a = ay + gap, b = by - gap; ctx.moveTo(ax, a); ctx.lineTo(ax + d, a + d); ctx.lineTo(ax + d, b - d); ctx.lineTo(ax, b); ctx.lineTo(ax - d, b - d); ctx.lineTo(ax - d, a + d); }
      ctx.closePath();
    };
    const y0 = top + t / 2, y1 = y0 + hh, y2 = y1 + hh;
    const SEGS: Record<string, [number, number, number, number]> = { a: [lx, y0, rx, y0], b: [rx, y0, rx, y1], c: [rx, y1, rx, y2], d: [lx, y2, rx, y2], e: [lx, y1, lx, y2], f: [lx, y0, lx, y1], g: [lx, y1, rx, y1] };
    const on = SEG7[ch] ?? '';
    for (const k of 'abcdefg') {
      const lit = on.includes(k);
      if (!lit && !unlit) continue;
      seg(...SEGS[k]);
      if (lit && outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline.width * 2; ctx.strokeStyle = outline.color; ctx.stroke(); }
      ctx.fillStyle = lit ? color : unlit!;
      ctx.fill();
    }
  } else if (fam === 'dotMatrix') {
    // 5 × 7 点阵：亮点实心圆，暗点淡色
    const rows = DOT57[ch], cw = w / 5, chh = H / 7, r = Math.max(0.6, Math.min(cw, chh) * 0.4 * Math.min(1.25, thick));
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) {
      const lit = rows[j][i] === '1';
      if (!lit && !unlit) continue;
      const cx = x0 + cw * (i + 0.5), cy = top + chh * (j + 0.5);
      if (lit && outline) { ctx.fillStyle = outline.color; ctx.beginPath(); ctx.arc(cx, cy, r + outline.width, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = lit ? color : unlit!; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // 单线笔画：等粗圆头折线（矢量显示器 / 示波器的笔画字）
    const lw = Math.max(1, size * 0.075 * thick);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); for (const l of STROKE1[ch]) { ctx.moveTo(x0 + l[0] * w, top + l[1] * H); for (let i = 2; i < l.length; i += 2) ctx.lineTo(x0 + l[i] * w, top + l[i + 1] * H); } };
    if (outline) { path(); ctx.lineWidth = lw + outline.width * 2; ctx.strokeStyle = outline.color; ctx.stroke(); }
    path(); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
    if (ch === '%') { ctx.lineWidth = lw; for (const [cx, cy] of [[0.22, 0.18], [0.78, 0.82]]) { ctx.beginPath(); ctx.arc(x0 + cx * w, top + cy * H, w * 0.16, 0, Math.PI * 2); ctx.stroke(); } }
  }
  ctx.restore();
}
/** 记一段字进可读性记录（M12b-07：矢量数字 / 逐字排的数字不经 drawText，也要让可读性检查看得到；与 drawText 同口径） */
export function logText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, w: number, lh: number, o: TextOpts) {
  if (DRAW_LOG.on && s.trim()) DRAW_LOG.texts.push({ ...devRect(ctx, x, y, w, lh), size: o.size * Math.hypot(ctx.getTransform().a, ctx.getTransform().b) / cOf(ctx), color: o.color, aided: !!(o.outline || o.shadow || o.glowColor || o.glow), bold: o.weight >= 700, text: s.slice(0, 24), fx: DRAW_LOG.inFx > 0, ...(o.fixedSize ? { fixed: true } : {}) });
}

/* ---------------- 文字引擎（M12a-33）：描边随字号、勒索信逐字混排、CJK 避头尾断行 ---------------- */

/** 按字号算描边的阈值（设计单位）：更小的字不描边（描边会填满字怀），改画一圈软投影 */
export const OUTLINE_MIN = 12;
/** 描边实际宽度：带 widthEm 的（参数生成的描边）= max(1, 字号 × widthEm)，字号 < OUTLINE_MIN 时 0；旧皮肤 token 写死的描边照旧 */
export function outlineWidth(ol: NonNullable<TextStyle['outline']>, size: number): number {
  if (ol.widthEm === undefined) return ol.width;
  return size < OUTLINE_MIN ? 0 : Math.max(1, size * ol.widthEm);
}

/** 勒索信的字族池（粗黑 / 宋 / 罗马碑刻 / 黑体；拉丁字体没有中文，中文落到各自后备的 GAE 黑 / 宋） */
const RANSOM_FONTS = ['"GAE Grotesk", "GAE Sans", sans-serif', '"GAE Serif", serif', '"GAE Cinzel", "GAE Serif", serif', '"GAE Sans", sans-serif'];
interface RansomGlyph { ch: string; font: string; weight: number; size: number; inv: boolean; rot: number; dy: number; pad: number; w: number }
/**
 * 勒索信排字（typ.display.family = ransom）：每个字按 hash(字串, 序号) 取字族、字重（400 / 700 / 900）、字号 ±10%、约两成反白方块、±8° 旋转、±10% 基线抖动；
 * 同一串字每帧一样，量宽（measure）与画字（drawText）走同一算法，所以按量出来的宽居中仍然对得齐。空格只占位
 */
function ransomGlyphs(ctx: CanvasRenderingContext2D, t: string, o: TextOpts): RansomGlyph[] {
  let seed = 2166136261;
  for (let i = 0; i < t.length; i++) seed = Math.imul(seed ^ t.charCodeAt(i), 16777619);
  const out: RansomGlyph[] = [];
  let i = 0;
  for (const ch of t) {
    const R = rand((seed ^ Math.imul(i + 1, 2654435761)) >>> 0);
    i++;
    const space = /\s/.test(ch);
    const font = RANSOM_FONTS[Math.floor(R() * RANSOM_FONTS.length)], weight = [400, 700, 900][Math.floor(R() * 3)];
    const size = o.size * (0.9 + R() * 0.22), inv = !space && R() < 0.22, rot = (R() * 2 - 1) * 8, dy = (R() * 2 - 1) * 0.1 * o.size;
    ctx.font = fontString({ font, size, weight, italic: o.italic });
    const pad = inv ? size * 0.12 : 0;
    out.push({ ch, font, weight, size, inv, rot, dy, pad, w: ctx.measureText(ch).width + pad * 2 + o.size * 0.06 });
  }
  return out;
}
/** 画勒索信字串（ty = 行的中线），返回宽 */
function drawRansom(ctx: CanvasRenderingContext2D, t: string, x: number, ty: number, o: TextOpts): number {
  const gs = ransomGlyphs(ctx, t, o);
  const ink = luminance(o.color) > 0.5 ? '#111' : '#fff';
  let cx = x;
  for (const q of gs) {
    if (/\s/.test(q.ch)) { cx += q.w; continue; }
    ctx.save();
    ctx.translate(cx + q.w / 2, ty + q.dy);
    ctx.rotate((q.rot * Math.PI) / 180);
    ctx.font = fontString({ font: q.font, size: q.size, weight: q.weight, italic: o.italic });
    const gw = q.w - o.size * 0.06;
    // 反白方块：底 = 字色，字 = 反差色（深字白块、浅字黑字）
    if (q.inv) { ctx.fillStyle = o.color; ctx.fillRect(-gw / 2, -q.size * 0.62, gw, q.size * 1.24); }
    const ow = o.outline && !q.inv ? outlineWidth(o.outline, q.size) : 0;
    const ch = textPresentation(q.ch);
    if (ow) { ctx.lineJoin = 'round'; ctx.lineWidth = ow * 2; ctx.strokeStyle = o.outline!.color; ctx.strokeText(ch, -gw / 2 + q.pad, 0); }
    ctx.fillStyle = q.inv ? ink : o.color;
    ctx.fillText(ch, -gw / 2 + q.pad, 0);
    ctx.restore();
    cx += q.w;
  }
  return cx - x;
}

/** 行首禁则（避头）：这些标点不放在行首 */
const NO_START = new Set([...'，。、；：？！」』）》〉】〕〗”’…‥·・ー々〻～,.;:?!)]}%％℃°']);
/** 行尾禁则（避尾）：这些标点不放在行尾 */
const NO_END = new Set([...'（「『《〈【〔〖“‘([{¥￥$']);
/** 中日文字符（逐字断行的单位）：CJK 部首到统一汉字、兼容汉字、全角形式、CJK 标点（写成转义，免得范围端点被当成画布字收进字体子集） */
const CJK_RANGE = '\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f';
const CJK = new RegExp(`[${CJK_RANGE}]`);
const UNITS = new RegExp(`\\n|[^\\s${CJK_RANGE}]+\\s*|\\s+|[\\s\\S]`, 'g');
/**
 * 多行文字断行（M12a-33，取代 screen.ts 的 wrapText 与 menu.ts 的 wrap）：中日文逐字、拉丁文按词（一个词比整行还宽时才拆字）；
 * CJK 避头尾：行首不放 ，。、；：？！」』）》… 等，超宽不到半个字时让标点悬挂在本行末尾，否则把上一行最后一个字带下来；行尾不放 （「『《 等开括号（带到下一行）。
 * \n 强制换行。Godot：TextServer 的 ICU 断行本来就带这些规则（Label.autowrap_mode = AUTOWRAP_WORD_SMART）
 */
/** 超宽时截断加省略号；more = 后面还有被截掉的行（折行只取前几行时），这一行放得下也写「…」（终期审查修复 ⑦，从 compose/sample.ts 挪来） */
export function fitLine(ctx: CanvasRenderingContext2D, s: string, w: number, o: TextOpts, more = false): string {
  if (!more && measure(ctx, s, o) <= w) return s;
  let x = more ? s.replace(/\s+$/, '') : s;
  while (x.length > 1 && measure(ctx, `${x}…`, o) > w) x = x.slice(0, -1);
  return `${x}…`;
}
export function wrapLines(ctx: CanvasRenderingContext2D, s: string, w: number, o: TextOpts): string[] {
  // 单位：中日文一个字一个单位；拉丁文一个词（连着后面的空格）一个单位
  const units: string[] = [];
  for (const m of s.matchAll(UNITS)) units.push(m[0]);
  const lines: string[] = [];
  let cur: string[] = [];
  const fits = (us: string[]) => measure(ctx, us.join('').trimEnd(), o) <= w;
  const flush = () => { if (cur.length) lines.push(cur.join('').trimEnd()); cur = []; };
  for (let u of units) {
    if (u === '\n') { flush(); continue; }
    if (!cur.length) u = u.trimStart();
    if (!u) continue;
    if (!cur.length || fits([...cur, u])) { cur.push(u); continue; }
    const head = u[0];
    if (NO_START.has(head)) {
      // 标点悬挂：多出来的不到半个字宽就挂在本行
      if (measure(ctx, [...cur, u].join('').trimEnd(), o) - w <= o.size * 0.5) { cur.push(u); continue; }
      // 否则把本行最后一个字和标点一起带到下一行
      if (cur.length > 1) { const last = cur.pop()!; flush(); cur = [last, u]; continue; }
    }
    // 本行以开括号结尾：开括号跟着下一个字走
    const carry: string[] = [];
    while (cur.length > 1 && NO_END.has(cur[cur.length - 1].trimEnd().slice(-1))) carry.unshift(cur.pop()!);
    flush();
    // 拉丁长词比整行还宽：按字拆开
    if (!CJK.test(u) && !fits([u])) {
      let part = '';
      for (const ch of u) { if (part && !fits([part + ch])) { lines.push(part); part = ''; } part += ch; }
      cur = [...carry, part];
      continue;
    }
    cur = [...carry, u];
  }
  flush();
  return lines;
}

export function setText(ctx: CanvasRenderingContext2D, o: TextOpts) {
  ctx.font = fontString(o);
  ctx.fillStyle = o.color;
  ctx.textBaseline = 'middle';
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(o.spacing ?? 0) * o.size}px`;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 6 * sOf(ctx); } else { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
}

export const textOf = (s: string, o: TextStyle) => pseudo(o.upper ? s.toUpperCase() : s);

/**
 * 默认按彩色 emoji 显示的 BMP 符号（Unicode Emoji_Presentation：⚡ ✊ ⭐ ⌛……）：画字时补一个文本变体选择符 U+FE0E，按字色画成单色字形（M12b-68，control#11：
 * 资源栏 / 格子里的闪电原来落到彩色 emoji 字体，画成橙色，不跟 col.icon / 字色）。只在 fillText / strokeText 时补，量字不补（变体选择符零宽）；已经带了 FE0E / FE0F 的不动
 */
const EMOJI_PRESENTATION = /[⌚⌛⏩-⏬⏰⏳◽◾☔☕♈-♓♿⚓⚡⚪⚫⚽⚾⛄⛅⛎⛔⛪⛲⛳⛵⛺⛽✅✊✋✨❌❎❓-❕❗➕-➗➰➿⬛⬜⭐⭕](?![︎️])/g;
export const textPresentation = (t: string) => t.replace(EMOJI_PRESENTATION, '$&︎');

/** 在一行（行高 lh，顶边 y）里画文字，返回宽度 */
export function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, lh: number, o: TextOpts): number {
  // 套印错位（vis.misregister，M12b-63）：先按偏移画一遍强调色的字（不描边、不发光），再画本色
  if (o.misregister) { const m = o.misregister; drawText(ctx, s, x + m.x, y + m.y, lh, { ...o, misregister: undefined, color: String(m.color), outline: undefined, shadow: undefined, glow: undefined, glowColor: undefined, fill: undefined, metal: undefined }); o = { ...o, misregister: undefined }; }
  // 按角色像素化（M12b-56）：没在别的角色里（数字 / 图标）时按字号分标题与大字 / 正文；没开时（displayMin = ∞）直接画
  if (PIXROLE.displayMin === Infinity) return drawText0(ctx, s, x, y, lh, o);
  const r0 = PIXROLE.text;
  let role = r0 || (o.size >= PIXROLE.displayMin ? 'display' : 'text');
  // 可读下限（R4 回归修复 into-the-breach#43，pixelRoles.ts 的 LEGIBLE_PX）：要进低分辨率字层、但在那一层上不到下限的字（小号中文标题、细框条的小读数）改画在清晰层
  if (PIXROLE.lowPx > 0 && PIXROLE.lowText.has(role) && (ctx as unknown as Record<symbol, unknown>)[ROLE_LAYERS] && lowLayerPx(ctx, o) < (CJK.test(s) ? LEGIBLE_PX.cjk : LEGIBLE_PX.other)) role = LEGIBLE;
  if (role === r0) return drawText0(ctx, s, x, y, lh, o);
  PIXROLE.text = role;
  try { return drawText0(ctx, s, x, y, lh, o); } finally { PIXROLE.text = r0; }
}
/**
 * 自动反差描边（§8 RC3 ①）：字底下没有够不透明的盒子（绘制记录里不透明度 ≥ 0.85 的盒子都没盖住字的中心）、字自己也没有描边 / 投影 / 发光时，
 * 按字色加一圈反差描边（亮字配暗边、暗字配亮边；字号 ≥ OUTLINE_MIN 时才描，小字只加软投影）+ 一层软投影。只在 HudSystem 画的时候（绘制记录开着）判断；
 * 特效字（飘字、横幅）与勒索信 / 套印字不加（它们有自己的字效）
 */
function withHalo(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, lh: number, o: TextOpts): TextOpts {
  if (!QUALITY.halo || !FLOOR.halo || !DRAW_LOG.on || o.outline || o.shadow || o.glow || o.glowColor || o.ransom || o.noHalo || !s.trim()) return o;
  if (typeof ctx.getTransform !== 'function') return o;
  let w = o.size * Math.max(1, [...s].length) * 0.6;
  try { w = measure(ctx, s, o); } catch { /* 极简替身画布量不了字：按字数估 */ }
  if (colorUnder(ctx, x + w / 2, y + lh / 2) !== null) return o;
  const light = luminance(o.color) > 0.42;
  // 暗字（浅色 UI 的墨色字）只加一层淡的亮色软投影：元素 HUD 里没有底的字另有衬底（compose/hud.ts），白描边压在浅衬底上会把字糊粗
  if (!light) return { ...o, shadow: { color: 'rgba(255,255,255,0.7)', x: 0, y: 0, blur: 2 } };
  return { ...o, outline: o.size >= OUTLINE_MIN ? { color: 'rgba(8,10,14,0.72)', width: Math.max(1, o.size * 0.09) } : undefined, shadow: { color: 'rgba(0,0,0,0.85)', x: 0, y: 0.75, blur: 2.5 } };
}
/** 这段字画在低分辨率字层上的字号（层像素）：设计单位字号 × 文字缩放 × 局部变换的缩放（当前挑中那一层的变换 / 那一层的基准缩放）× 低分辨率层每设计单位的像素 */
function lowLayerPx(ctx: CanvasRenderingContext2D, o: TextOpts): number {
  const m = ctx.getTransform();
  return (TEXT_K.k !== 1 && !o.fixedSize ? o.size * TEXT_K.k : o.size) * (Math.hypot(m.a, m.b) / sOf(ctx)) * PIXROLE.lowPx;
}
function drawText0(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, lh: number, o: TextOpts): number {
  if (TEXT_K.k !== 1 && !o.fixedSize) o = { ...o, size: o.size * TEXT_K.k };
  // 品质下限（§8 P0）：字号兜底；没有不透明底的字加反差描边 + 软投影
  if (QUALITY.on) {
    const fs = flooredSize(o, localScale(ctx));
    if (fs !== o.size) o = { ...o, size: fs };
    // 淡字下限（§8 RC3，轨道 E）：45%–78% 不透明的字（未选中的页签、次要说明）抬到 78%——还是比正文淡，但不再只有 4 : 1；更淡的（里程表的前导零、水印、装饰小字）不动
    if (FLOOR.fade && typeof o.color === 'string' && o.color.startsWith('rgba')) { const a = alphaOf(o.color); if (a >= 0.45 && a < 0.78) { const [r, g, b] = parseColor(o.color); o = { ...o, color: rgba([r, g, b, 0.78]) }; } }
    o = withHalo(ctx, s, x, y, lh, o);
  }
  // 文字发光（CSS text-shadow）只属于这段文字：save/restore，免得漏到后面画的盒子上
  ctx.save();
  setText(ctx, o);
  const t = textOf(s, o), tp = textPresentation(t);
  const ty = y + lh / 2, S1 = sOf(ctx);
  if (o.shadow) {
    ctx.shadowColor = o.shadow.color;
    ctx.shadowOffsetX = o.shadow.x * S1;
    ctx.shadowOffsetY = o.shadow.y * S1;
    ctx.shadowBlur = o.shadow.blur * S1;
  } else if (o.glowColor) {
    ctx.shadowColor = o.glowColor;
    ctx.shadowBlur = 8 * S1;
  }
  // 描边（M12a-33）：参数生成的描边按字号算宽（outlineWidth）；字太小不描边时，没有别的投影就补一圈描边色的软投影
  const ow = o.outline ? outlineWidth(o.outline, o.size) : 0;
  if (o.outline && !ow && !o.shadow && !o.glowColor) { ctx.shadowColor = o.outline.color; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1 * S1; ctx.shadowBlur = 2.5 * S1; }
  if (o.ransom) {
    const w = drawRansom(ctx, t, x, ty, o);
    ctx.restore();
    if (DRAW_LOG.on && t.trim()) DRAW_LOG.texts.push({ ...devRect(ctx, x, y, w, lh), size: o.size * Math.hypot(ctx.getTransform().a, ctx.getTransform().b) / cOf(ctx), color: o.color, aided: !!(o.outline || o.shadow || o.glowColor || o.glow), bold: o.weight >= 700, text: t.slice(0, 24), fx: DRAW_LOG.inFx > 0, ...(o.fixedSize ? { fixed: true } : {}) });
    return w;
  }
  // 矢量图标（§8 RC4，轨道 E）：整段就是一个当图标用的符号（⚔ ⚡ ♨ ⛨……）时画成图标集里的矢量图标（字宽照字形量，排版不变）；画风跟 vis.iconStyle，字形类画风照旧画字
  const iname = QUALITY.on && ICON_STYLE.on && !o.tilt && !o.fill && !o.metal ? glyphIconName(t) : null;
  if (iname) {
    const w = ctx.measureText(t).width;
    if (drawVectorIcon(ctx, iname, x + w / 2, ty, o.size * 0.95, o.color, { outline: o.outline && ow ? { color: o.outline.color, width: ow } : undefined })) {
      ctx.restore();
      if (DRAW_LOG.on) DRAW_LOG.texts.push({ ...devRect(ctx, x, y, w, lh), size: o.size * Math.hypot(ctx.getTransform().a, ctx.getTransform().b) / cOf(ctx), color: o.color, aided: !!(o.outline || o.shadow || o.glowColor || o.glow), bold: o.weight >= 700, text: t.slice(0, 24), fx: DRAW_LOG.inFx > 0, ...(o.fixedSize ? { fixed: true } : {}) });
      return w;
    }
  }
  if (o.outline && ow && !o.tilt) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = ow * 2;
    ctx.strokeStyle = o.outline.color;
    ctx.strokeText(tp, x, ty);
    if (!o.shadow) ctx.shadowColor = 'transparent';
  }
  if (o.metal || o.fill?.kind === 'metal') {
    // 金属字：渐变只铺在字形高度上，亮 → 本色 → 暗 → 回亮，过渡留宽，小字号不会断成两截
    const g = ctx.createLinearGradient(0, ty - o.size * 0.55, 0, ty + o.size * 0.55);
    g.addColorStop(0, '#fff4c8'); g.addColorStop(0.42, o.color); g.addColorStop(0.62, '#9a7428'); g.addColorStop(1, '#f2d684');
    ctx.fillStyle = g;
  } else if (o.fill) ctx.fillStyle = textFill(ctx, o, ty);
  // 逐字倾斜（M12b-20）：每个字绕自己的中心转（字宽不变，量字与原来一样）
  if (o.tilt) {
    const w = tiltedText(ctx, tp, x, ty, o);
    ctx.restore();
    if (DRAW_LOG.on && t.trim()) DRAW_LOG.texts.push({ ...devRect(ctx, x, y, w, lh), size: o.size * Math.hypot(ctx.getTransform().a, ctx.getTransform().b) / cOf(ctx), color: o.color, aided: !!(o.outline || o.shadow || o.glowColor || o.glow), bold: o.weight >= 700, text: t.slice(0, 24), fx: DRAW_LOG.inFx > 0, ...(o.fixedSize ? { fixed: true } : {}) });
    return w;
  }
  ctx.fillText(tp, x, ty);
  // 枯笔描边（M12a-23）：沿字形描一圈断续的半透明笔触，像干笔扫过留下的飞白；Godot：LabelSettings.outline + 噪声贴图的 CanvasItem shader
  if (o.drybrush) {
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(1, o.size * 0.06);
    ctx.strokeStyle = withAlpha(o.color, 0.55);
    ctx.setLineDash([o.size * 0.42, o.size * 0.12, o.size * 0.18, o.size * 0.07]);
    ctx.strokeText(tp, x, ty);
    ctx.setLineDash([]);
  }
  const w = ctx.measureText(t).width;
  ctx.restore();
  if (DRAW_LOG.on && t.trim()) DRAW_LOG.texts.push({ ...devRect(ctx, x, y, w, lh), size: o.size * Math.hypot(ctx.getTransform().a, ctx.getTransform().b) / cOf(ctx), color: o.color, aided: !!(o.outline || o.shadow || o.glowColor || o.glow), bold: o.weight >= 700, text: t.slice(0, 24), fx: DRAW_LOG.inFx > 0, ...(o.fixedSize ? { fixed: true } : {}) });
  return w;
}

/**
 * 字内填充（M12b-20，TextStyle.fill）：gradient = 字高方向从第一色到第二色；halftone = 第一色底上第二色网点（6 × 6 设计单位一格的图块，按色缓存，最多 24 张）。
 * 建不出图块（没有 document）时退回第一色
 */
const HALFTONE = new Map<string, HTMLCanvasElement>();
function textFill(ctx: CanvasRenderingContext2D, o: TextOpts, ty: number): string | CanvasGradient | CanvasPattern {
  const c0 = o.fill?.colors?.[0] ?? o.color, c1 = o.fill?.colors?.[1] ?? mix(o.color, '#ffffff', 0.55);
  if (o.fill?.kind === 'gradient') { const g = ctx.createLinearGradient(0, ty - o.size * 0.5, 0, ty + o.size * 0.5); g.addColorStop(0, c1); g.addColorStop(1, c0); return g; }
  const m = ctx.getTransform(), sc = Math.max(0.25, Math.hypot(m.a, m.b)), cell = Math.max(3, Math.round(Math.max(3, o.size * 0.16) * sc)), key = `${c0}|${c1}|${cell}`;
  let tile = HALFTONE.get(key);
  if (!tile) {
    if (typeof document === 'undefined') return c0;
    tile = document.createElement('canvas'); tile.width = cell; tile.height = cell;
    const c = tile.getContext('2d');
    if (!c) return c0;
    c.fillStyle = c0; c.fillRect(0, 0, cell, cell); c.fillStyle = c1; c.beginPath(); c.arc(cell / 2, cell / 2, cell * 0.32, 0, Math.PI * 2); c.fill();
    if (HALFTONE.size >= 24) HALFTONE.delete(HALFTONE.keys().next().value!);
    HALFTONE.set(key, tile);
  }
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return c0;
  // 图案按设备像素铺（不随字缩放糊掉）
  if (typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([1 / sc, 0, 0, 1 / sc, 0, 0]));
  return pat;
}
/** 逐字倾斜地画一串字（ty = 行中线）：角度 = 哈希(字串, 序号) 映射到 ±tilt 度；描边与填充都按字转。返回总宽 */
function tiltedText(ctx: CanvasRenderingContext2D, t: string, x: number, ty: number, o: TextOpts): number {
  let seed = 2166136261;
  for (let i = 0; i < t.length; i++) seed = Math.imul(seed ^ t.charCodeAt(i), 16777619);
  const fill = ctx.fillStyle, ow = o.outline ? outlineWidth(o.outline, o.size) : 0;
  let cx = x, i = 0;
  for (const ch of t) {
    const w = ctx.measureText(ch).width, R = rand((seed ^ Math.imul(++i, 2654435761)) >>> 0), rot = ((R() * 2 - 1) * (o.tilt ?? 0) * Math.PI) / 180;
    // 绕字中心转、再平移回原来的坐标系里画（B5 审查修复 ㉒：原来平移到字中心后在局部坐标里画，渐变 / 金属填充是在平移前的坐标里建的，
    // 中线 ty ≠ 0 时整段渐变跟着挪走，字填成第一个色标的平色）
    const px = cx + w / 2;
    ctx.save(); ctx.translate(px, ty); ctx.rotate(rot); ctx.translate(-px, -ty);
    if (ow) { ctx.lineJoin = 'round'; ctx.lineWidth = ow * 2; ctx.strokeStyle = o.outline!.color; ctx.strokeText(ch, cx, ty); }
    ctx.fillStyle = fill; ctx.fillText(ch, cx, ty);
    ctx.restore();
    cx += w;
  }
  return cx - x;
}

/** 每次重画前把画布状态归零（上一个皮肤留下的阴影、透明度、字距不能带进来） */
export function resetState(ctx: CanvasRenderingContext2D) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.filter = 'none';
  ctx.setLineDash([]);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
}

export function measure(ctx: CanvasRenderingContext2D, s: string, o: TextOpts): number {
  let oo = TEXT_K.k !== 1 && !o.fixedSize ? { ...o, size: o.size * TEXT_K.k } : o;
  // 品质下限（§8 P0）：与 drawText 同一个兜底，按量出来的字宽排的盒子跟着变宽
  if (QUALITY.on) { const fs = flooredSize(oo, localScale(ctx)); if (fs !== oo.size) oo = { ...oo, size: fs }; }
  // 量字只借用画布的字体状态：save / restore 包住，字距 / 基线 / 填充色 / 发光不漏到后面画的东西上（审查修复 A · L16）；
  // 没有 save 的极简替身（单元测试里只有 measureText 的对象）改为把 setText 改的几项放回去
  const c = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  const stack = typeof c.save === 'function';
  const keep = stack ? null : [c.font, c.fillStyle, c.textBaseline, c.letterSpacing, c.shadowBlur, c.shadowColor] as const;
  if (stack) c.save();
  try {
    setText(ctx, oo);
    // 勒索信（M12a-33）：逐字换字族 / 字号，宽 = 各字宽之和（与 drawText 同一算法）
    if (o.ransom) return ransomGlyphs(ctx, textOf(s, o), oo).reduce((a, q) => a + q.w, 0);
    return ctx.measureText(textOf(s, o)).width;
  } finally {
    if (stack) c.restore();
    else [c.font, c.fillStyle, c.textBaseline, c.letterSpacing, c.shadowBlur, c.shadowColor] = keep as unknown as [string, string, CanvasTextBaseline, string, number, string];
  }
}
