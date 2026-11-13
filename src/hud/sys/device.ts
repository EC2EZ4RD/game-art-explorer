import type { Resolved } from './resolve';

/*
 * 设备相关的排版约束（docs/ui-hud-plan.md M8b）：
 *   安全区——手机刘海 / 圆角 / 底部横条、电视过扫描会切掉的边（占画面宽 / 高的比例），排版逐边避开，可读性检查逐边核对；
 *   触控尺寸——触屏输入时可点控件的最短边下限（ix.touchSize，单位 px@1080p，和 typ.baseSize 同一套），控件尺寸取它和原尺寸的较大值。
 */
export interface Insets { l: number; r: number; t: number; b: number }
export const SAFE_INSETS: Record<string, Insets> = {
  // iPhone 横握：左右各 47pt / 844pt，底部横条 21pt / 390pt
  phoneLandscape: { l: 0.056, r: 0.056, t: 0, b: 0.054 },
  // 竖握：顶部刘海 47pt / 844pt，底部横条 34pt / 844pt
  phonePortrait: { l: 0, r: 0, t: 0.056, b: 0.04 },
  // 平板：只有底部横条
  tablet: { l: 0, r: 0, t: 0, b: 0.025 },
  // 电视标题安全区：四边各 5%
  tv: { l: 0.05, r: 0.05, t: 0.05, b: 0.05 },
};

export function safeInsets(r: Resolved): Insets | null {
  const dev = r.str('ctx.device', 'pc');
  if (dev === 'phone') return r.str('ctx.orientation', 'landscape') === 'portrait' ? SAFE_INSETS.phonePortrait : SAFE_INSETS.phoneLandscape;
  if (dev === 'tablet') return SAFE_INSETS.tablet;
  if (dev === 'tv') return SAFE_INSETS.tv;
  return null;
}

/**
 * 设备宽高比表（ctx.aspect 的取值 → 横屏时的宽 / 高）。工作台舞台的画框（src/ui/stage/frameMath.ts 的 aspectOf）用同一张表，
 * 画框比例与 HUD 认的设备比例永远一致（docs/workbench-redesign.md §3.3）；16x10（掌机）参数表还没有这个取值，先放在表里备用
 */
export const ASPECT_RATIO: Readonly<Record<string, number>> = { '16x9': 16 / 9, '21x9': 21 / 9, '4x3': 4 / 3, '19.5x9': 19.5 / 9, '16x10': 16 / 10 };

/** 设备宽高比（宽 / 高）：竖屏取倒数；不认识的取值按 16:9 */
export const aspectRatioOf = (aspect: string, portrait: boolean): number => {
  const a = ASPECT_RATIO[aspect] ?? 16 / 9;
  return portrait ? 1 / a : a;
};

/** 画框已经等于设备比例时允许的相对误差：画框按整 CSS 像素取整（§3.3「差 <0.01」） */
export const FRAME_MATCH_TOL = 0.01;

/**
 * 设备画幅黑边（ctx.aspect × ctx.orientation，M10）：返回要加的黑边比例（宽 / 高），0 = 不加。
 *   - 默认横屏 16:9：0（画布多大 HUD 就排多大，和以前一样）；
 *   - frameAspect（画布的宽 / 高）给了、并且已经等于设备比例（相对差 < FRAME_MATCH_TOL）：也返回 0——工作台的画框本来就按设备比例取尺寸（§3.3），
 *     HUD 和 OUTPUT pass 不再加一圈取整误差的黑边（避免黑边加两次）；QA 脚本把画布钉成 960 × 540 而设备是 21:9 时照旧加黑边；
 *   - 不给 frameAspect（Godot 迁移说明这类只问「是不是特殊画幅」的地方）：与以前一样。
 */
export function deviceAspect(r: Resolved, frameAspect?: number): number {
  const asp = r.str('ctx.aspect', '16x9');
  const portrait = r.str('ctx.orientation', 'landscape') === 'portrait';
  if (!portrait && asp === '16x9') return 0;
  const a = aspectRatioOf(asp, portrait);
  if (frameAspect && Number.isFinite(frameAspect) && Math.abs(frameAspect - a) / a < FRAME_MATCH_TOL) return 0;
  return a;
}

/** 一块区域（CSS 像素） */
export interface AreaRect { x: number; y: number; w: number; h: number }

/**
 * 画幅黑边以内的区域（CSS 像素，与 OUTPUT 的黑边公式一致）：letterbox = 宽 / 高，0 = 没有黑边（整块画布）。
 * 对齐到整 CSS 像素（M12a-37）：起点向里取整、终点向里取整，内容不压到黑边那一行。
 * HudSystem 排 HUD、舞台栏条算「预览 N%」共用这一个函数，两边的 unitK 一致（frameUnitK）
 */
export function contentRect(cssW: number, cssH: number, letterbox: number): AreaRect {
  const asp = cssW / cssH;
  if (letterbox > asp) { const h = cssW / letterbox, y0 = Math.ceil((cssH - h) / 2), y1 = Math.floor((cssH + h) / 2); return { x: 0, y: y0, w: cssW, h: y1 - y0 }; }
  if (letterbox > 0) { const w = cssH * letterbox, x0 = Math.ceil((cssW - w) / 2), x1 = Math.floor((cssW + w) / 2); return { x: x0, y: 0, w: x1 - x0, h: cssH }; }
  return { x: 0, y: 0, w: cssW, h: cssH };
}

/** 触屏时可点控件的最短边下限（px@1080p，画的时候用 theme.ts 的 px1080 换成绘制单位）；不是触屏输入时为 0 */
export const tapMin = (r: Resolved) => (r.str('ctx.input', 'kbm') === 'touch' ? r.num('ix.touchSize', 88) : 0);

/*
 * px@1080p 单位（M12a-05）：元素里的尺寸常量和默认 13px 正文是在约 540 高的画布上调的——「设计画布 960 × 540 = 1080p 的一半」。
 * HUD 一律按设计单位排版绘制，HudSystem 再把整张 HUD 画布按 unitK 缩放到实际画面（画幅黑边以内的区域 R），
 * 等价于 Godot 的 stretch mode = canvas_items、aspect = expand、基准 960 × 540（导出的 project.godot 就是这个基准，见 export/godot.ts 的 hudDisplay；
 * 并入 1920 × 1080 基准的工程时 stretch scale 设 2）：横屏取 min(R.w / 960, R.h / 540)
 * （16:9 及更宽的画面就是 R.h / 540，更窄的画面按宽算，元素不会挤出两边）；竖屏（ctx.orientation = portrait）基准换成 540 × 960。
 * pixel1to1（编辑器的「UI 1:1」开关，不进配方）：unitK = 1，设计单位 = CSS 像素，方便对齐像素皮肤。
 */
export function unitKOf(r: Resolved, R: { w: number; h: number }, pixel1to1 = false): number {
  if (pixel1to1 || R.w < 2 || R.h < 2) return 1;
  const portrait = r.str('ctx.orientation', 'landscape') === 'portrait';
  return portrait ? Math.min(R.w / 540, R.h / 960) : Math.min(R.w / 960, R.h / 540);
}

/**
 * 一块画布里 HUD 实际的 unitK（与 HudSystem.update 同一条路：画面黑边 camera.letterbox → 没有时设备黑边 → 黑边以内的区域 → unitKOf）。
 * 舞台栏条的「预览 N%（相对 1080p）」用它，画了电影黑边、开了「UI 1:1」、竖屏时都与画框上真实的 HUD 大小一致（轨道 B2，§3.3）
 */
export function frameUnitK(r: Resolved, cssW: number, cssH: number, letterbox = 0, pixel1to1 = false): number {
  if (cssW < 2 || cssH < 2) return 1;
  const lb = letterbox > 0 ? letterbox : deviceAspect(r, cssW / cssH);
  return unitKOf(r, contentRect(cssW, cssH, lb), pixel1to1);
}
