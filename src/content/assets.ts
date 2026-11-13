import data from './assets.json';

/*
 * 素材登记表：AI 生成或程序生成的基础素材（纸纹、笔刷、皴法、法线、精灵、序列帧……）。
 * 数据由 scripts/assets/register.py 生成，不要手改；新增素材在它的 ENTRIES 里加一条再重跑（见 docs/assets.md）。
 * 文件放在 public/assets/tex/，网页与 Godot 迁移包都直接读这些 PNG。
 */

export type AssetKind = 'paper' | 'stroke-atlas' | 'cun' | 'detail' | 'field' | 'mask' | 'sprite-sheet' | 'puppet' | 'flipbook' | 'tam'
  // 游戏 UI 素材（M11① / M11②）
  | 'ui-frame' | 'ui-ornament' | 'ui-ribbon' | 'ui-icons' | 'ui-character' | 'ui-backdrop' | 'ui-container' | 'ui-badges' | 'ui-empty' | 'ui-map' | 'ui-title' | 'ui';

export interface AssetSource {
  /** ai = 外部图像模型生成，procedural = 本地程序生成，manual = 作者自己画的，third-party = 第三方 CC0 等宽松许可的图片 */
  service: 'ai' | 'procedural' | 'manual' | 'third-party';
  /** 公开模型名，例如 gpt-image-2 */
  tool?: string;
  /** 通用生成参数，例如「1:1，medium 质量，PNG」 */
  params?: string;
  date: string;
  prompt?: string;
  script?: string;
  /** 作者（manual / third-party） */
  author?: string;
  /** 原始页面（third-party） */
  url?: string;
}

export interface UvRect { x: number; y: number; w: number; h: number }

export interface PuppetPart {
  file: string;
  /** 原图里的裁切框 [x, y, w, h]（像素） */
  src: [number, number, number, number];
  /** 输出图的尺寸 [w, h]（像素） */
  size: [number, number];
  /** 关节点：部件最上 / 最下 10% 像素的质心，部件 UV（0~1，y 向下） */
  top: [number, number];
  bottom: [number, number];
}

export interface AssetMeta {
  seam?: number;
  mean?: number;
  rects?: UvRect[];
  grid?: [number, number];
  cell?: number;
  frame?: number;
  frames?: number;
  rows?: string[];
  spriteSize?: [number, number];
  parts?: Record<string, PuppetPart>;
  [k: string]: unknown;
}

export interface AssetEntry {
  id: string;
  label: string;
  kind: AssetKind;
  batch: number;
  source: AssetSource;
  raw: string | null;
  files: Record<string, string>;
  meta: AssetMeta;
  process: string;
  usedBy: string[];
  limits: string;
  license: string;
}

export const ASSETS = (data as unknown as { assets: AssetEntry[] }).assets;
const MAP = new Map(ASSETS.map((a) => [a.id, a]));

export const getAsset = (id: string): AssetEntry | undefined => MAP.get(id);

/** 某个文件的网址：开发与构建都按相对路径（单文件构建时把 assets/ 放在 HTML 旁边） */
export function assetUrl(file: string): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
  return `${base}assets/tex/${file}`;
}

/** 参数选项 → 素材 id 的对照（引擎与迁移包共用） */
export const PAPER_ASSET: Record<string, string> = {
  xuan: 'xuan_paper', coldPress: 'watercolor_cold', hotPress: 'watercolor_hot', kraft: 'kraft_paper', silk: 'silk_juan',
};
export const CUN_ASSET: Record<string, string> = { pima: 'cun_pima', fupi: 'cun_fupi', midian: 'cun_midian' };
export const DETAIL_ASSET: Record<string, string> = { clay: 'clay_fingerprint', knit: 'knit_wool' };
export const STROKE_ASSET: Record<string, string> = { long: 'brush_strokes_a', marks: 'brush_marks_b' };
export const CARRIER_ASSET: Record<string, string> = { pixelA: 'pixel_walk_32', pixelB: 'pixel_walk_64', puppet: 'paper_puppet_parts' };
export const FX_ASSET: Record<string, string> = { smoke: 'fx_smoke', explosion: 'fx_explosion', slash: 'fx_slash' };

/** 纸纹图（灰度高度或彩色）：返回文件名与是否彩色 */
export function paperFile(opt: string): { file: string; color: boolean; mean: number; sat: number } | null {
  const a = getAsset(PAPER_ASSET[opt] ?? '');
  if (!a) return null;
  const file = a.files.gray ?? a.files.height ?? a.files.color;
  // 彩色纸的饱和度：牛皮纸保留棕色，绢本原图偏橙、收得更多
  const sat = opt === 'silk' ? 0.45 : 0.8;
  return file ? { file, color: !!a.files.color, mean: Number(a.meta.mean ?? 0.5), sat } : null;
}
