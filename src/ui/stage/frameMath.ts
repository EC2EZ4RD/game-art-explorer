import { aspectRatioOf } from '../../hud/sys/device';
import type { Zoom } from './shell';

/*
 * 画框尺寸（轨道 B，docs/workbench-redesign.md §3.3 的画框公式）：
 *   frameW = min(stageW − 24, (stageH − 36 − deckH − 16) × aspect)，frameH = frameW / aspect。
 * 画框是一个只靠 CSS 尺寸变化的稳定 host（引擎的 ResizeObserver 跟着变，不重新挂 WebGL）；画框比例永远等于设备比例。
 * 50% / 100% = HUD 的 unitK 正好 1 / 2（16:9 时 960 × 540 / 1920 × 1080，CSS px），比舞台大时可平移。
 *   unitK = min(w / 960, h / 540)（竖屏 540 × 960），所以画框取 w = 2k · max(960, 540 · 宽高比)（竖屏 2k · max(540, 960 · 宽高比)）：
 *   16:9 及更宽按高度定（h = 1080k），更窄的横屏（4:3、16:10）按宽度定（w = 1920k）——原来一律按高度定，4:3 的 50% / 100% 只有 unitK 0.75 / 1.5（B2 审查修复 ⑤）。
 */

/** 舞台栏条高度、画框四周留白 */
export const BAR_H = 36;
export const PAD_X = 24;
export const PAD_Y = 16;
/** 画框下方的最小高度：画面模式（配方卡）/ UI 模式（界面胶片 96 + 皮肤行 96 + 边距）；单行时 */
export const DECK_MIN = { art: 248, ui: 224, oneRow: 112 } as const;
/** 窗口矮（<800）本该只留一行，但画框按宽度受限、下方剩的高度够两行时照样给两行 */
export const TWO_ROWS_FIT = { art: 190, ui: 224 } as const;

export interface FrameBox {
  w: number;
  h: number;
  /** 画框下方实际拿到的高度（≥ 最小值；专注时 0） */
  deckH: number;
  /** 画框比舞台大（50% / 100% 放不下）：要平移 */
  overflow: boolean;
}

export function frameBox(o: { stageW: number; stageH: number; aspect: number; deckMin: number; zoom: Zoom }): FrameBox {
  const { stageW, stageH, aspect, deckMin, zoom } = o;
  const availW = Math.max(40, stageW - PAD_X);
  const availH = Math.max(40, stageH - BAR_H - deckMin - PAD_Y);
  let w: number, h: number;
  if (zoom === 'fit') {
    w = Math.min(availW, availH * aspect);
    h = w / aspect;
  } else {
    // 50% / 100%：HUD 的 unitK = 1 / 2（与 sys/device.ts 的 unitKOf 同一个公式反过来算）
    w = zoomWidth(aspect, zoom === 'half' ? 1 : 2);
    h = w / aspect;
  }
  w = Math.floor(w);
  h = Math.floor(h);
  // 适应：画框按宽度受限时，多出来的高度都给画框下方；放大时画框下方只拿最小值，画框区域可平移
  const deckH = deckMin === 0 ? 0 : zoom === 'fit' ? Math.max(deckMin, Math.floor(stageH - BAR_H - PAD_Y - h)) : deckMin;
  return { w, h, deckH, overflow: w > availW + 0.5 || h > availH + 0.5 };
}

/** 让 HUD 的 unitK 正好等于 uk 的画框宽度（CSS px）：横屏基准 960 × 540、竖屏（宽高比 < 1）540 × 960 */
export function zoomWidth(aspect: number, uk: number): number {
  const [bw, bh] = aspect >= 1 ? [960, 540] : [540, 960];
  return uk * Math.max(bw, bh * aspect);
}

/** 竖屏时画框右边那一栏（画框下方的内容）至少要多宽，放不下就照旧放在画框下方 */
export const SIDE_DECK_MIN = 300;
/** 竖屏设备：画框用满舞台高度后，右边还剩得下一栏吗 */
export function sideDeckFits(o: { stageW: number; stageH: number; aspect: number }): boolean {
  const h = Math.max(40, o.stageH - BAR_H - PAD_Y);
  return o.stageW - (Math.floor(h * o.aspect) + PAD_X) >= SIDE_DECK_MIN;
}

/** 设备宽高比（ctx.aspect × ctx.orientation，16:9 横屏 = 16 / 9）：直接用 HUD 的那张表（sys/device.ts 的 ASPECT_RATIO，轨道 B2），画框与 HUD 认的设备比例不会分叉 */
export const aspectOf = (aspect: string, portrait: boolean): number => aspectRatioOf(aspect, portrait);

/**
 * HUD 的 unitK（设计画布 960 × 540 → 整个画框，不管黑边 / UI 1:1）。
 * @deprecated 栏条「预览 N%」改用 HUD 自己那条路（src/hud/sys/device.ts 的 frameUnitK，电影黑边、设备黑边、UI 1:1 都算进去，轨道 B2）；留着给老调用方
 */
export const unitKOfFrame = (w: number, h: number, portrait: boolean) => (portrait ? Math.min(w / 540, h / 960) : Math.min(w / 960, h / 540));
