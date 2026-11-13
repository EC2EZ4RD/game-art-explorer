import { mix, parseColor, rgba, withAlpha } from '../material';
import { GLYPH_ICON, ICONS, itemIconName, type IconDef } from './set';

/*
 * 矢量图标的画法（docs/workbench-redesign.md §8 RC4，轨道 E）。图标按 24 × 24 格子定义（set.ts），画在以 (cx, cy) 为中心、边长 size（设计单位）的方块里。
 * 画风跟 vis.iconStyle（一屏一种图标语言）：
 *   line（默认）/ etched / woodcut / nato / alchemy：外形描线、实心几何填色、内部笔画描线（etched 等由 core.ts 的 glyphIcon 叠两遍、套框）；
 *   flat：外形填色、内部笔画用压暗的同色；painted / render3d / realistic：flat + 上亮下暗的竖向渐变（没有图集素材时的近似）；
 *   duotone：外形 32% 填色 + 描线；silhouette：整块剪影（笔画加粗糊成一块）；pixel：先画进 16 × 16 的小画布再最近邻放大（像素皮肤）；
 *   symbol / singleChar：不画矢量（返回 false，调用方照旧画字形 / 首字）。
 * 线宽：24 格里 2 格，小图标加粗到至少 26 / size 格（11 单位的图标约 2.4 格）；HUD 画布另有 1 设备像素的线宽下限。
 * 没有 Path2D（单元测试的 node 环境）时一律返回 false，调用方照旧画字形。
 */

/** 当前这一侧的图标画风（compose/layers.ts 每次合成前写整屏的 th.iconStyle；core.ts 的 icon() 按元素的作用域画风临时改） */
export const ICON_STYLE: { v: string; on: boolean } = { v: 'line', on: true };

const PATHS = new Map<string, { shape?: Path2D; detail?: Path2D }>();
function pathsOf(name: string, d: IconDef): { shape?: Path2D; detail?: Path2D } | null {
  if (typeof Path2D === 'undefined') return null;
  let p = PATHS.get(name);
  if (!p) { p = { shape: d.shape ? new Path2D(d.shape) : undefined, detail: d.detail ? new Path2D(d.detail) : undefined }; PATHS.set(name, p); }
  return p;
}

/**
 * 图标的上下文（审查修复 E 视觉 ⑦⑧⑬）：item = 正在画的这一格 / 这一项的物品名（core.ts 的 glyphIcon、icon 临时设）——名字对得上物品图标（set.ts 的 ITEM_ICON）时
 * 符号换成那个物品的图标（◆ 木材 → 原木、✿ 小麦种子 → 种子袋）；pack = 当前内容包里「符号 → 物品图标」的对照（compose/layers.ts 每次合成前按包设）：
 * 包里的工具 / 建筑 / 物品清单把同一个符号只用来指一样东西时，这个符号在这一屏的物品上下文里画成那样东西（≡ 道路、⚙ 工业……）；同一个符号指了几样不同东西时不换。
 * items = 物品上下文的嵌套深度（格子 / 工具栏 / 资源 / asItem 里 > 0；pack 只在这时用）
 */
export const ICON_CTX: { item: string | null; pack: Map<string, string> | null; items: number } = { item: null, pack: null, items: 0 };
/** 一段字是不是「一个当图标用的符号」（允许前后空白与变体选择符），是的话返回图标名 */
export function glyphIconName(s: string): string | null {
  const t = s.replace(/[︎️]/g, '').trim();
  if (!t || [...t].length !== 1) return null;
  const base = GLYPH_ICON[t] ?? null;
  if (!base) return null;
  // 包的对照只在「物品」上下文里用（整合修复，ID 的请求：格子、工具栏、资源、物品清单——core.ts 的 slot / asItem / 带名字的图标进出时 items ± 1）：
  // 原来整屏都换，图鉴、天赋、暂停菜单里同一个符号的别的意思（◆ 道具、☾ 亡兵）也被画成物品
  return itemIconName(ICON_CTX.item) ?? (ICON_CTX.items > 0 ? ICON_CTX.pack?.get(t) : undefined) ?? base;
}
/** 内容包的「符号 → 物品图标」对照：清单里 [符号, 名字] 的名字对得上物品图标、且这个符号在包里只指一种图标时收进来 */
const PACK_MAPS = new Map<string, Map<string, string>>();
export function packIconMap(id: string, lists: unknown[][], reserved: Set<string> = new Set()): Map<string, string> {
  const hit = PACK_MAPS.get(id);
  if (hit) return hit;
  const seen = new Map<string, Set<string>>();
  for (const list of lists) for (const row of list) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || typeof row[1] !== 'string') continue;
    const g = row[0].trim(), ic = itemIconName(row[1].replace(/\s*\d+$/, ''));
    if (!g || [...g].length !== 1 || reserved.has(g)) continue;
    if (!seen.has(g)) seen.set(g, new Set());
    seen.get(g)!.add(ic ?? `?${row[1]}`);
  }
  const m = new Map<string, string>();
  for (const [g, set] of seen) if (set.size === 1) { const v = [...set][0]; if (!v.startsWith('?')) m.set(g, v); }
  PACK_MAPS.set(id, m);
  return m;
}

/** 不画矢量的画风（照旧画字形） */
const TEXT_STYLES = new Set(['symbol', 'singleChar']);
/** 填色类画风 */
const FILLED = new Set(['flat', 'painted', 'render3d', 'realistic']);

export interface VectorIconOpts {
  /** 描边（文字描边 / 自动反差描边）：画在图标下面一圈，宽 = 设计单位 */
  outline?: { color: string; width: number };
  /** 画风（不给 = ICON_STYLE.v） */
  style?: string;
}

/**
 * 画一枚矢量图标：name = 图标名（set.ts 的 ICONS），中心 (cx, cy)、边长 size（设计单位）、颜色 color。返回 false = 没画（画风是字形类、没有这个图标、没有 Path2D）
 */
export function drawVectorIcon(g: CanvasRenderingContext2D, name: string, cx: number, cy: number, size: number, color: string, o: VectorIconOpts = {}): boolean {
  const def = ICONS[name], style = o.style ?? ICON_STYLE.v;
  if (!def || TEXT_STYLES.has(style) || size <= 0) return false;
  const P = pathsOf(name, def);
  if (!P) return false;
  if (style === 'pixel') return pixelIcon(g, name, def, cx, cy, size, color, o);
  const k = size / 24, lw = Math.max(2, 26 / Math.max(1, size));
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(k, k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 描边垫底：外形与笔画各描一圈加粗的描边色（只描这一圈的影子，不带画布上原来的投影）
  if (o.outline && o.outline.width > 0) {
    const w = lw + (o.outline.width * 2) / k;
    g.strokeStyle = o.outline.color; g.lineWidth = w;
    if (P.shape) { g.stroke(P.shape); if ((def.solid || style !== 'line') && !def.hollow) { g.fillStyle = o.outline.color; g.fill(P.shape); } }
    if (P.detail) g.stroke(P.detail);
    g.shadowColor = 'transparent';
  }
  paint(g, def, P, style, color, lw, 24);
  g.restore();
  return true;
}

/** 按画风把外形 / 笔画画出来（坐标已是 24 格） */
function paint(g: CanvasRenderingContext2D, def: IconDef, P: { shape?: Path2D; detail?: Path2D }, style: string, color: string, lw: number, box: number) {
  g.lineWidth = lw;
  // 空心符号：任何画风都只描线（剪影加粗）
  if (def.hollow) { g.strokeStyle = color; if (style === 'silhouette') g.lineWidth = lw * 1.4; if (P.shape) g.stroke(P.shape); if (P.detail) g.stroke(P.detail); return; }
  if (FILLED.has(style) || style === 'silhouette') {
    if (P.shape) {
      if (style === 'flat' || style === 'silhouette') g.fillStyle = color;
      else { const gr = g.createLinearGradient(0, 2, 0, box - 2); gr.addColorStop(0, mix(color, '#ffffff', 0.38)); gr.addColorStop(0.55, color); gr.addColorStop(1, mix(color, '#000000', 0.35)); g.fillStyle = gr; }
      g.fill(P.shape);
      if (style !== 'flat' && style !== 'silhouette') { g.strokeStyle = mix(color, '#000000', 0.45); g.lineWidth = lw * 0.6; g.stroke(P.shape); g.lineWidth = lw; }
    }
    if (P.detail) {
      // 有外形时内部笔画是压暗的同色（刻在填色上），没有外形的纯笔画图标（双剑、勾、箭头）照本色、剪影再加粗
      g.strokeStyle = P.shape && style !== 'silhouette' ? mix(color, '#000000', 0.5) : color;
      g.lineWidth = style === 'silhouette' ? lw * 1.6 : P.shape ? lw * 0.85 : lw * 1.2;
      g.stroke(P.detail);
    }
    return;
  }
  if (style === 'duotone' && P.shape) { g.fillStyle = withAlpha(color, 0.32); g.fill(P.shape); }
  g.strokeStyle = color; g.fillStyle = color;
  if (P.shape) { if (def.solid) g.fill(P.shape); else g.stroke(P.shape); }
  if (P.detail) g.stroke(P.detail);
}

/** 像素画风：16 × 16 小画布上按 flat 画，最近邻放大到 size（按名字 / 颜色 / 描边缓存） */
const PIX = new Map<string, HTMLCanvasElement>();
function pixelIcon(g: CanvasRenderingContext2D, name: string, def: IconDef, cx: number, cy: number, size: number, color: string, o: VectorIconOpts): boolean {
  if (typeof document === 'undefined') return false;
  // 审查修复 ⑬：先用不透明的颜色画、二值化，贴的时候再乘颜色的透明度（原来用半透明色画再按 128 二值化：锁定 / 变暗的 35% 图标整枚消失，50%–99% 变成全不透明）
  const ca = parseColor(color)[3], solid = ca < 1 ? rgba([...parseColor(color).slice(0, 3), 1] as [number, number, number, number]) : color;
  const N = 16, key = `${name}|${solid}|${o.outline?.color ?? ''}`;
  let c = PIX.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = N; c.height = N;
    const q = c.getContext('2d');
    if (!q) return false;
    const P = pathsOf(name, def)!;
    q.imageSmoothingEnabled = false;
    q.scale(N / 24, N / 24);
    q.lineCap = 'square'; q.lineJoin = 'miter';
    if (o.outline) { q.strokeStyle = o.outline.color; q.lineWidth = 5; if (P.shape) { q.stroke(P.shape); q.fillStyle = o.outline.color; q.fill(P.shape); } if (P.detail) q.stroke(P.detail); }
    paint(q, def, P, 'flat', solid, 3, 24);
    // 去掉半透明的边（按 50% 阈值二值化），像素图标没有抗锯齿
    const img = q.getImageData(0, 0, N, N);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 128 ? 255 : 0;
    q.putImageData(img, 0, 0);
    if (PIX.size > 256) PIX.delete(PIX.keys().next().value!);
    PIX.set(key, c);
  }
  const on = g.imageSmoothingEnabled, ga = g.globalAlpha;
  g.imageSmoothingEnabled = false;
  if (ca < 1) g.globalAlpha = ga * ca;
  g.drawImage(c, cx - size / 2, cy - size / 2, size, size);
  g.globalAlpha = ga;
  g.imageSmoothingEnabled = on;
  return true;
}
