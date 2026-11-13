import { getAsset } from '../content/assets';
import { pack } from './content';
import { fillMaterial, MATERIAL_BASE, mix, withAlpha } from './material';
import { FONT_EPOCH, ORN, QUALITY, type Rect } from './paint';
import type { BoxStyle, Ornament } from './types';
import { atlasReady, cornerItem, drawAtlasItem, drawAtlasItemTinted } from './uiAssets';

/*
 * 程序化装饰（vis.ornament 装饰预算 × vis.motif 母题 × ast.ornaments 饰件）：
 * 角花、分隔饰条、铆钉、宝石、挂件、端盖、花枝、缎带、徽章底座。母题决定每个饰件画成什么形状。
 * M11：ast.ornaments 点名的角花 / 宝石 / 铆钉 / 徽章底座 / 端盖改用 AI 生成的饰件图集（ui_ornament_corners / ui_ornament_gems），
 * 图没加载完照旧画矢量；只由装饰预算自动带出来的饰件（没点名，调用方经 extra.named 告知）一直是矢量。
 * 角花图集只画了花叶 / 祥云 / 羽翼 / 符文四类：几何、科幻括号、铆钉、骷髅、火焰这些母题图集里没有，角花照旧画矢量。
 */

type Ctx = CanvasRenderingContext2D;

/* ---------------- 位图饰件 ---------------- */

const CORNERS = 'ui_ornament_corners', GEMS = 'ui_ornament_gems';
/** vis.motif 的取值 → cornerItem 认的母题名（复数 / 近义的对上） */
const MOTIF_ALIAS: Record<string, string> = { runes: 'rune', stars: 'star', hearts: 'heart', inkSplash: 'inkWash' };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * 图集里的一项画在 (x, y)：长边 s，按 ax / ay（0~1）对位（0,0 = 左上角落在 (x, y)，默认中心），
 * 先转 rot 再按 sx / sy 镜像。图没加载完返回 false
 */
function piece(g: Ctx, id: string, name: string, x: number, y: number, s: number, o: { rot?: number; ax?: number; ay?: number; sx?: number; sy?: number; tint?: string } = {}): boolean {
  const rc = (getAsset(id)?.meta.rects as unknown as Record<string, number[]> | undefined)?.[name];
  if (!rc) return false;
  const k = s / Math.max(rc[2], rc[3]), w = rc[2] * k, h = rc[3] * k;
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  if (o.sx !== undefined || o.sy !== undefined) g.scale(o.sx ?? 1, o.sy ?? 1);
  // 大幅缩小的位图要平滑采样（像素化皮肤的小画布默认关了平滑）
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  // 矩形与这一项同宽高比，drawAtlasItem 的 contain 正好铺满
  const box = { x: -w * (o.ax ?? 0.5), y: -h * (o.ay ?? 0.5), w, h };
  const ok = o.tint ? drawAtlasItemTinted(g, id, name, box, o.tint) : drawAtlasItem(g, id, name, box);
  g.restore();
  return ok;
}

/** 颜色 → [色相 0~360, 饱和度 0~1, 亮度 0~1]（#rgb / #rrggbb / rgb()；认不出返回 null） */
function hsl(c: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(c.trim());
  let v: number[];
  if (hex) {
    const h = hex[1];
    v = h.length < 6 ? [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)) : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = /rgba?\(([^)]+)\)/i.exec(c);
    if (!m) return null;
    v = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  }
  if (v.length < 3 || v.some((x) => !Number.isFinite(x))) return null;
  const [rr, gg, bb] = v.map((x) => x / 255);
  const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const hue = mx === rr ? ((gg - bb) / d + 6) % 6 : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [hue * 60, d / (1 - Math.abs(2 * l - 1)), l];
}

/** 宝石按强调色色相：绿 → 祖母绿，青蓝紫 → 蓝宝石，其余（红橙黄、灰）→ 红宝石 */
function gemItem(accent: string): string {
  const v = hsl(accent);
  if (!v || v[1] < 0.15) return 'ruby';
  return v[0] >= 70 && v[0] < 170 ? 'emerald' : v[0] >= 170 && v[0] < 290 ? 'sapphire' : 'ruby';
}

/** 铆钉：铁 / 石材质、或饰色是深色 / 中性灰 → 铁铆钉，其余金铆钉 */
function rivetItem(color: string, mat?: string): string {
  if (mat === 'iron' || mat === 'stone') return 'rivetIron';
  const v = hsl(color);
  return v && (v[2] < 0.3 || (v[1] < 0.12 && v[2] < 0.8)) ? 'rivetIron' : 'rivetGold';
}

/**
 * 母题 → 角花图集里的一项；图集没画这类母题返回 null（画矢量）。
 * cornerItem 认不出的母题一律归花叶，所以花叶只认 floral 本身；没有母题时只有确知是点名的（sure）才用花叶兜底
 */
function cornerArt(motif: string, sure: boolean): string | null {
  if (!motif || motif === 'none') return sure ? 'floral' : null;
  // B4 的新母题只画矢量（M12b-43 / 44：图集只有花叶 / 祥云 / 羽翼 / 符文四类，kamon 原来会被别名到祥云）
  if (VECTOR_MOTIFS.has(motif)) return null;
  const item = cornerItem(MOTIF_ALIAS[motif] ?? motif);
  return item !== 'floral' || motif === 'floral' ? item : null;
}

/** 位图角花的边长：短边的 28%，夹在 18~90px；面板太小时不超过短边一半（四片不互相压） */
const cornerArtSize = (r: Rect) => { const short = Math.min(r.w, r.h); return Math.min(clamp(short * 0.28, 18, 90), short * 0.5); };
/** 尖顶饰的高（M12b-44）：装饰尺寸的 1.6 倍，夹在 10~36 */
const finialSize = (size: number) => clamp(size * 1.6, 10, 36);

/**
 * 饰色是不是金属色（M12a-08）：金 / 铜一类（色相 25~60°、有饱和度、中等亮度）。角花图集画的是成品色，饰色是金属色时照原图画，
 * 否则（白、墨、描线材质 lineArt……）按饰色着色——原来一律画金色图集，Hollow 的白描角花画不出来
 */
function metallic(c: string): boolean {
  const v = hsl(c);
  return !!v && v[0] >= 25 && v[0] <= 60 && v[1] >= 0.3 && v[2] >= 0.25 && v[2] <= 0.8;
}

/**
 * 四角各一片角花（源图是左上角件，其余三角镜像），大小按面板短边；图没加载完或图集没有这类母题返回 false。
 * tint 给了时按它着色（drawAtlasItemTinted）
 */
function cornerPieces(g: Ctx, r: Rect, motif: string, sure: boolean, tint?: string, overhang = 0): boolean {
  const item = cornerArt(motif, sure);
  if (!item) return false;
  const cs = cornerArtSize(r);
  // 角点略探出盒外，压住边框；出框量（ast.ornamentOverhang，M12b-49）再往外推
  const o = cs * 0.04 + overhang * cs * 0.35;
  const at: [number, number, number, number][] = [[r.x - o, r.y - o, 1, 1], [r.x + r.w + o, r.y - o, -1, 1], [r.x + r.w + o, r.y + r.h + o, -1, -1], [r.x - o, r.y + r.h + o, 1, -1]];
  for (const [x, y, sx, sy] of at) if (!piece(g, CORNERS, item, x, y, cs, { ax: 0, ay: 0, sx, sy, tint })) return false;
  return true;
}

/* ---------------- 卷草图元（M12b-44） ---------------- */

/** 一段三次贝塞尔：起点 (x0, y0)、两个控制点、终点 (x3, y3)；一串首尾相接的段组成一根卷须 */
export type Bez = [number, number, number, number, number, number, number, number];
/** 卷须端头：volute 涡卷（宽度递减地卷进去 + 一颗卷心）/ thorn 短刺 / leaf 叶 / ball 圆珠 / none 只收细 */
export type ScrollEnd = 'volute' | 'thorn' | 'leaf' | 'ball' | 'none';
/** scroll() 的端头选项：end / start = 两端的端头；curl = 涡卷往行进方向的右手（1）还是左手（-1）卷（屏幕坐标 y 朝下）；size = 涡卷半径 / 刺长 / 叶长（没给按卷须长） */
export interface ScrollOpts { end?: ScrollEnd; start?: ScrollEnd; curl?: number; size?: number }
/** 卷草母题（vis.motif，M12b-44）：角花、母题符号、尖顶饰都用 scroll() 的带状卷须画，不调金色角件图集 */
export const SCROLL_MOTIFS = new Set(['baroque', 'ironScroll', 'wroughtIron']);
/** M12b-43 的新母题（glyph() 的单色矢量分支） */
export const NEW_MOTIFS = new Set(['sigil', 'lightning', 'notes', 'chevrons', 'atom', 'starburst', 'interlace', 'greekKey', 'kamon', 'hexWarn', 'wedge', 'whiplash', 'drips', 'sunsetStripes']);
/** 只画矢量、不调角件图集的母题（B4 的全部新母题）；水印 ast.watermark = sigil 时它们画成大号符号 */
export const VECTOR_MOTIFS = new Set([...SCROLL_MOTIFS, ...NEW_MOTIFS]);
/** 卷草母题的默认粗细调制（没给 vis.strokeModulation 时）：巴洛克书法卷须调制最强，铸铁卷须几乎等宽 */
const SCROLL_MOD: Record<string, number> = { baroque: 0.7, ironScroll: 0.3, wroughtIron: 0.45 };
/** 粗细调制 → 卷须两端宽 / 中段宽（lw = 原来等宽线的线宽；m = 0 时两者都是 lw） */
export const modWidths = (lw: number, m: number): [number, number] => [lw * (1 - Math.min(1, m) * 0.6), lw * (1 + Math.min(1, m) * 1.8)];

type Pt = [number, number];
const bzAt = (b: Bez, t: number): Pt => {
  const u = 1 - t, a = u * u * u, c = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return [a * b[0] + c * b[2] + d * b[4] + e * b[6], a * b[1] + c * b[3] + d * b[5] + e * b[7]];
};
/** 中线采样：每段按控制多边形长度取 6~24 个点（段间的接点只留一个） */
function sampleLine(beziers: Bez[]): Pt[] {
  const out: Pt[] = [];
  for (const b of beziers) {
    const L = Math.hypot(b[2] - b[0], b[3] - b[1]) + Math.hypot(b[4] - b[2], b[5] - b[3]) + Math.hypot(b[6] - b[4], b[7] - b[5]);
    const n = Math.max(6, Math.min(24, Math.ceil(L / 3)));
    for (let i = out.length ? 1 : 0; i <= n; i++) out.push(bzAt(b, i / n));
  }
  return out;
}
/** 点列在 i 处的单位切线 */
function tangentAt(P: Pt[], i: number): Pt {
  const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}
/**
 * 终点之后接一段收紧的涡卷中线（约 1.1 圈，半径从 R 收到 0.3R）：圆心在终点切线的右手（curl = 1）或左手（-1），卷的方向顺着原来的行进方向。返回追加的点（不含终点）
 */
function voluteLine(P: Pt[], curl: number, R: number): Pt[] {
  const E = P[P.length - 1], [tx, ty] = tangentAt(P, P.length - 1);
  const cx = E[0] - ty * R * curl, cy = E[1] + tx * R * curl, a0 = Math.atan2(E[1] - cy, E[0] - cx);
  const d = -Math.sin(a0) * tx + Math.cos(a0) * ty >= 0 ? 1 : -1, out: Pt[] = [], m = 22;
  for (let k = 1; k <= m; k++) { const f = k / m, a = a0 + d * f * Math.PI * 2.2, rad = R * (1 - 0.7 * f); out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return out;
}
/** 带状多边形：中线 P、逐点宽 W（沿法线两侧各偏一半），填充（nonzero，当前 fillStyle） */
function ribbon(g: Ctx, P: Pt[], W: number[]) {
  if (P.length < 2) return;
  const L: Pt[] = [], Rr: Pt[] = [];
  for (let i = 0; i < P.length; i++) { const [tx, ty] = tangentAt(P, i), h = W[i] / 2; L.push([P[i][0] - ty * h, P[i][1] + tx * h]); Rr.push([P[i][0] + ty * h, P[i][1] - tx * h]); }
  g.beginPath();
  g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]);
  g.closePath();
  g.fill();
}
/** 端头（刺 / 叶 / 珠）：在点 E、沿方向 (tx, ty) 向外长 len，底宽 w */
function scrollTip(g: Ctx, kind: ScrollEnd, E: Pt, tx: number, ty: number, len: number, w: number) {
  if (kind === 'none' || kind === 'volute') return;
  const nx = -ty, ny = tx;
  g.beginPath();
  if (kind === 'thorn') { g.moveTo(E[0] + nx * w * 0.9, E[1] + ny * w * 0.9); g.lineTo(E[0] + tx * len, E[1] + ty * len); g.lineTo(E[0] - nx * w * 0.9, E[1] - ny * w * 0.9); g.closePath(); }
  else if (kind === 'leaf') {
    const T: Pt = [E[0] + tx * len, E[1] + ty * len], k = len * 0.38;
    g.moveTo(E[0], E[1]);
    g.quadraticCurveTo(E[0] + tx * len * 0.45 + nx * k, E[1] + ty * len * 0.45 + ny * k, T[0], T[1]);
    g.quadraticCurveTo(E[0] + tx * len * 0.45 - nx * k, E[1] + ty * len * 0.45 - ny * k, E[0], E[1]);
    g.closePath();
  } else { const rr = Math.max(w * 0.8, len * 0.3); g.arc(E[0] + tx * rr * 0.7, E[1] + ty * rr * 0.7, rr, 0, Math.PI * 2); }
  g.fill();
}
/**
 * 卷须（§2 的 scroll(g, beziers, w0, w1, terminal)，M12b-44）：沿一串贝塞尔采样中线，宽度按「细 — 胖 — 细」（两端 w0、中段 w1，正弦包络）沿法线偏移，
 * 填成带状多边形（当前 fillStyle）；端头 terminal = volute（接一段宽度递减的涡卷 + 卷心圆珠）/ thorn / leaf / ball / none，或 ScrollOpts（两端各自的端头、涡卷方向、端头大小）。
 * 线描花饰、巴洛克角花、铸铁 / 铁艺卷须、花饰标牌、端头都用它；Godot 侧把同一组点列移植成 draw_polygon（或预渲染成纹理）
 */
export function scroll(g: Ctx, beziers: Bez[], w0: number, w1: number, terminal: ScrollEnd | ScrollOpts = 'volute') {
  const o: ScrollOpts = typeof terminal === 'string' ? { end: terminal } : terminal;
  const P = sampleLine(beziers);
  if (P.length < 2) return;
  const acc = [0];
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const len = acc[acc.length - 1] || 1, W = acc.map((a) => w0 + (w1 - w0) * Math.sin(Math.PI * (a / len)));
  const end = o.end ?? 'volute', start = o.start ?? 'none', sz = o.size ?? Math.max(w1 * 1.4, len * 0.14);
  let line = P, widths = W, eye: Pt | null = null;
  if (end === 'volute') {
    const V = voluteLine(P, o.curl ?? 1, sz);
    line = [...P, ...V]; widths = [...W, ...V.map((_, k) => w0 * (1 - 0.45 * ((k + 1) / V.length)))];
    eye = V[V.length - 1];
  }
  ribbon(g, line, widths);
  if (eye) { g.beginPath(); g.arc(eye[0], eye[1], Math.max(w0 * 0.75, w1 * 0.55, sz * 0.16), 0, Math.PI * 2); g.fill(); }
  const [ex, ey] = tangentAt(P, P.length - 1), [sx, sy] = tangentAt(P, 0);
  scrollTip(g, end, P[P.length - 1], ex, ey, sz, Math.max(w0, w1 * 0.6));
  scrollTip(g, start, P[0], -sx, -sy, sz, Math.max(w0, w1 * 0.6));
}
/** 膨线：从 (x0, y0) 到 (x1, y1) 的直线段画成两端 w0、中段 w1 的填充带（书法线、分隔线的 swelled、调制过的描边边） */
export function swell(g: Ctx, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = 10;
  g.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, h = (w0 + (w1 - w0) * Math.sin(Math.PI * t)) / 2; const x = x0 + dx * t + nx * h, y = y0 + dy * t + ny * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const t = i / n, h = (w0 + (w1 - w0) * Math.sin(Math.PI * t)) / 2; g.lineTo(x0 + dx * t - nx * h, y0 + dy * t - ny * h); }
  g.closePath();
  g.fill();
}
/** 贝塞尔沿对角线（x ↔ y）镜像：角花的竖臂由横臂镜像得到（镜像后旋向相反，curl 取反） */
const swapXY = (b: Bez): Bez => [b[1], b[0], b[3], b[2], b[5], b[4], b[7], b[6]];
/** 贝塞尔左右镜像（x → -x，符号的左半边） */
const flipX = (b: Bez): Bez => [-b[0], b[1], -b[2], b[3], -b[4], b[5], -b[6], b[7]];
/** 沿一根贝塞尔在参数 t 处朝法线方向（side = ±1）长一根短刺（铁艺的刺） */
function thornOn(g: Ctx, b: Bez, t: number, side: number, len: number, w: number) {
  const p = bzAt(b, t), q = bzAt(b, Math.min(1, t + 0.02)), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, tx = (q[0] - p[0]) / l, ty = (q[1] - p[1]) / l;
  scrollTip(g, 'thorn', p, -ty * side * 0.85 + tx * 0.5, tx * side * 0.85 + ty * 0.5, len, w);
}

/**
 * 卷草角花（M12b-44；局部坐标：角在 (0, 0)，x 沿上边向右、y 沿左边向下，调用方按角镜像）：两条沿边的臂（横臂画好、竖臂沿对角线镜像），臂长 A，
 * 线宽两端 w0、中段 w1。baroque = S 形卷 + 内卷的涡卷收尾，装饰预算 ≥ 2 加对角叶与臂上的内卷小枝、3 再加一片叶；
 * ironScroll = 细而均匀、贴边的直臂收成紧涡卷，角上一对背靠背的 C 形卷（铸铁格栅），≥ 2 加一道内侧的平行短卷；
 * wroughtIron = 带刺的铁艺：臂端是刺、臂上两根内刺，角上一个内卷 + 一根朝内的尖刺，≥ 2 臂中再加一个小卷
 */
function scrollCorner(g: Ctx, s: number, motif: string, level: number, A: number, w0: number, w1: number) {
  const both = (b: Bez, o: ScrollOpts, w0b = w0, w1b = w1) => { scroll(g, [b], w0b, w1b, o); scroll(g, [swapXY(b)], w0b, w1b, { ...o, curl: -(o.curl ?? 1) }); };
  if (motif === 'baroque') {
    both([s * 0.1, s * 0.1, A * 0.42, -s * 0.2, A * 0.68, s * 0.55, A, s * 0.16], { end: 'volute', curl: 1, size: s * 0.24 });
    if (level >= 2) {
      scroll(g, [[s * 0.12, s * 0.12, s * 0.3, s * 0.22, s * 0.36, s * 0.42, s * 0.62, s * 0.62]], w0 * 0.8, w1 * 0.9, { end: 'leaf', size: s * 0.42 });
      both([A * 0.42, s * 0.16, A * 0.34, s * 0.5, A * 0.56, s * 0.66, A * 0.62, s * 0.46], { end: 'volute', curl: -1, size: s * 0.13 }, w0 * 0.7, w1 * 0.7);
    }
    if (level >= 3) both([A * 0.78, s * 0.2, A * 0.86, s * 0.42, A * 0.84, s * 0.6, A * 0.74, s * 0.74], { end: 'leaf', size: s * 0.3 }, w0 * 0.6, w1 * 0.6);
  } else if (motif === 'ironScroll') {
    both([s * 0.06, s * 0.06, A * 0.4, s * 0.02, A * 0.72, s * 0.02, A, s * 0.1], { end: 'volute', curl: 1, size: s * 0.17 });
    both([s * 0.42, s * 0.42, s * 0.62, s * 0.36, s * 0.72, s * 0.14, s * 0.56, s * 0.06], { end: 'volute', curl: -1, size: s * 0.12 }, w0 * 0.85, w1 * 0.85);
    if (level >= 2) both([s * 0.5, s * 0.36, A * 0.45, s * 0.32, A * 0.62, s * 0.34, A * 0.68, s * 0.42], { end: 'volute', curl: 1, size: s * 0.11 }, w0 * 0.75, w1 * 0.75);
  } else {
    const arm: Bez = [s * 0.04, s * 0.04, A * 0.35, s * 0.04, A * 0.66, s * 0.14, A, s * 0.06];
    both(arm, { end: 'thorn', size: s * 0.34 });
    for (const t of [0.38, 0.72]) { thornOn(g, arm, t, 1, s * 0.26, w1 * 0.7); thornOn(g, swapXY(arm), t, -1, s * 0.26, w1 * 0.7); }
    scroll(g, [[s * 0.1, s * 0.1, s * 0.42, s * 0.12, s * 0.5, s * 0.36, s * 0.38, s * 0.5]], w0, w1, { end: 'volute', curl: 1, size: s * 0.14 });
    scrollTip(g, 'thorn', [s * 0.2, s * 0.2], Math.SQRT1_2, Math.SQRT1_2, s * 0.62, w1 * 0.8);
    if (level >= 2) both([A * 0.5, s * 0.1, A * 0.48, s * 0.36, A * 0.66, s * 0.44, A * 0.7, s * 0.3], { end: 'volute', curl: -1, size: s * 0.1 }, w0 * 0.7, w1 * 0.7);
  }
}

/**
 * 卷草角花实际画到哪（B4 审查修复：ornamentInsets 原来按「尺寸 × 0.45 / 0.3」估，装饰预算 ≥ 2 的内枝、平行卷与 3 的叶伸得更深——巴洛克 3 级多伸进 25px，
 * 页头标题 / 名牌 / 按钮压在卷须上）：用只记点的假画布空跑一遍 scrollCorner（局部坐标：角在原点，x 沿上边、y 沿左边往里），返回尺寸 = 1 时的点列。
 * 按 (母题, 等级, 臂长 / 尺寸（向上取 0.05）, 调制) 缓存；圆弧记外接方块的两角、二次曲线记控制点（偏保守）
 */
const SCROLL_PTS = new Map<string, Pt[]>();
function scrollCornerPts(motif: string, level: number, armK: number, mod: number): Pt[] {
  const ak = Math.ceil(armK * 20) / 20, key = `${motif}|${level}|${ak}|${mod.toFixed(2)}`;
  const hit = SCROLL_PTS.get(key);
  if (hit) return hit;
  const s = 100, pts: Pt[] = [], [w0, w1] = modWidths(s * 0.09, mod), noop = () => undefined;
  const rec = { beginPath: noop, closePath: noop, fill: noop, stroke: noop, save: noop, restore: noop, lineWidth: s * 0.09,
    moveTo: (x: number, y: number) => { pts.push([x, y]); }, lineTo: (x: number, y: number) => { pts.push([x, y]); },
    arc: (x: number, y: number, rr: number) => { pts.push([x - rr, y - rr], [x + rr, y + rr]); },
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => { pts.push([cx, cy], [x, y]); } } as unknown as Ctx;
  scrollCorner(rec, s, motif, level, ak * s, w0, w1);
  const out = pts.map(([x, y]): Pt => [x / s, y / s]);
  if (SCROLL_PTS.size > 256) SCROLL_PTS.clear();
  SCROLL_PTS.set(key, out);
  return out;
}

/**
 * 卷草母题的符号（glyph() 的 baroque / ironScroll / wroughtIron 分支，以 (0, 0) 为中心、大小约 s）：巴洛克 = 一对镜像 S 卷 + 中间一片叶；
 * 铸铁 = 一对背靠背的 C 形卷（心形卷）；铁艺 = 中间一根尖刺、底部左右一对内卷。线宽取当前 lineWidth（两端细、中段胖）
 */
function scrollGlyph(g: Ctx, motif: string, s: number) {
  const w1 = Math.max(g.lineWidth * 1.4, s * 0.09), w0 = w1 * 0.35;
  const pair = (b: Bez, o: ScrollOpts) => { scroll(g, [b], w0, w1, o); scroll(g, [flipX(b)], w0, w1, { ...o, curl: -(o.curl ?? 1) }); };
  if (motif === 'baroque') {
    pair([s * 0.04, s * 0.2, s * 0.3, s * 0.32, s * 0.52, s * 0.02, s * 0.32, -s * 0.18], { end: 'volute', curl: -1, size: s * 0.12 });
    scroll(g, [[0, s * 0.18, -s * 0.04, s * 0.02, s * 0.04, -s * 0.18, 0, -s * 0.34]], w0, w1, { end: 'leaf', size: s * 0.16 });
  } else if (motif === 'ironScroll') {
    // 心形卷：从底尖往上、向外鼓出，越过顶再往中间卷进去
    const half = (b: Bez[], curl: number) => scroll(g, b, w0, w1, { end: 'volute', curl, size: s * 0.12 });
    const R: Bez[] = [[0, s * 0.4, 0, s * 0.15, s * 0.3, s * 0.02, s * 0.32, -s * 0.2], [s * 0.32, -s * 0.2, s * 0.34, -s * 0.44, s * 0.08, -s * 0.46, s * 0.08, -s * 0.24]];
    half(R, 1); half(R.map(flipX), -1);
  } else {
    scroll(g, [[0, s * 0.34, 0, s * 0.1, 0, -s * 0.06, 0, -s * 0.2]], w1 * 0.9, w1 * 1.1, { end: 'thorn', size: s * 0.3 });
    pair([0, s * 0.28, s * 0.26, s * 0.34, s * 0.4, s * 0.08, s * 0.22, -s * 0.04], { end: 'volute', curl: -1, size: s * 0.1 });
  }
}

/**
 * 尖顶饰（ast.ornaments = finials，M12b-44，dont-starve#17）：框边中点向外伸的尖塔，(x, y) = 底座在边上的点，dir = -1 朝上 / 1 朝下，s = 高。
 * wroughtIron = 蝙蝠翼尖饰（中间尖刺 + 两片带扇贝下沿的翼）；卷草母题 = 尖刺 + 底部一对内卷；其余 = 圆珠底座 + 菱形矛尖
 */
function finial(g: Ctx, x: number, y: number, s: number, dir: number, motif: string) {
  g.save();
  g.translate(x, y);
  g.scale(1, dir);
  const w = Math.max(1, s * 0.07);
  if (motif === 'wroughtIron') {
    scrollTip(g, 'thorn', [0, s * 0.05], 0, 1, s, w * 1.4);
    for (const k of [-1, 1]) {
      g.beginPath(); g.moveTo(0, s * 0.18); g.quadraticCurveTo(k * s * 0.35, s * 0.42, k * s * 0.62, s * 0.34);
      for (let i = 2; i >= 0; i--) g.quadraticCurveTo(k * s * (0.1 + i * 0.2 + 0.1), s * (0.12 + i * 0.03), k * s * (0.08 + i * 0.18), s * 0.2);
      g.closePath(); g.fill();
    }
  } else if (SCROLL_MOTIFS.has(motif)) {
    scrollTip(g, 'thorn', [0, s * 0.1], 0, 1, s * 0.9, w * 1.6);
    for (const k of [-1, 1]) scroll(g, [[0, s * 0.06, k * s * 0.22, s * 0.04, k * s * 0.34, s * 0.22, k * s * 0.22, s * 0.32]], w * 0.6, w * 1.8, { end: 'volute', curl: k > 0 ? -1 : 1, size: s * 0.09 });
  } else {
    g.beginPath(); g.arc(0, s * 0.12, s * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0, s); g.lineTo(s * 0.14, s * 0.55); g.lineTo(0, s * 0.24); g.lineTo(-s * 0.14, s * 0.55); g.closePath(); g.fill();
  }
  g.restore();
}

/**
 * 一个母题符号，画在以 (0,0) 为中心、大小约 s 的范围内。v = 变体（装饰等级）：sigil 的 0~1 = 倒五芒星圈、2 = 三角里的全视之眼、3 = 王冠（M12b-43）。
 * 描线的母题用当前 strokeStyle / lineWidth，实心的用 fillStyle（调用方两者都设成饰色）
 */
export function glyph(g: Ctx, motif: string, s: number, v = 0) {
  if (SCROLL_MOTIFS.has(motif)) { scrollGlyph(g, motif, s); return; }
  g.beginPath();
  switch (motif) {
    case 'sigil':
      if (v >= 3) {
        // 王冠：底带 + 三个尖 + 尖上的圆珠
        g.moveTo(-s * 0.4, s * 0.3); g.lineTo(-s * 0.4, -s * 0.05); g.lineTo(-s * 0.22, s * 0.08); g.lineTo(0, -s * 0.22); g.lineTo(s * 0.22, s * 0.08); g.lineTo(s * 0.4, -s * 0.05); g.lineTo(s * 0.4, s * 0.3); g.closePath(); g.fill();
        g.beginPath(); for (const [x, y] of [[-s * 0.4, -s * 0.12], [0, -s * 0.3], [s * 0.4, -s * 0.12]]) { g.moveTo(x + s * 0.07, y); g.arc(x, y, s * 0.07, 0, Math.PI * 2); } g.fill();
        return;
      }
      if (v === 2) {
        // 全视之眼：三角 + 杏仁眼 + 瞳
        g.moveTo(0, -s * 0.45); g.lineTo(s * 0.45, s * 0.35); g.lineTo(-s * 0.45, s * 0.35); g.closePath();
        g.moveTo(-s * 0.24, s * 0.1); g.quadraticCurveTo(0, -s * 0.12, s * 0.24, s * 0.1); g.quadraticCurveTo(0, s * 0.3, -s * 0.24, s * 0.1);
        g.stroke(); g.beginPath(); g.arc(0, s * 0.1, s * 0.07, 0, Math.PI * 2); g.fill();
        return;
      }
      // 倒五芒星圈（尖朝下）
      g.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 + (i * 4 * Math.PI) / 5, x = Math.cos(a) * s * 0.42, y = Math.sin(a) * s * 0.42; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); return;
    case 'lightning':
      g.moveTo(s * 0.12, -s * 0.5); g.lineTo(-s * 0.26, s * 0.06); g.lineTo(-s * 0.02, s * 0.06); g.lineTo(-s * 0.12, s * 0.5); g.lineTo(s * 0.26, -s * 0.1); g.lineTo(s * 0.03, -s * 0.1); g.closePath(); g.fill(); return;
    case 'notes':
      // 两个连尾的八分音符：符头、符干、一道符尾横梁
      g.ellipse(-s * 0.26, s * 0.3, s * 0.13, s * 0.09, -0.4, 0, Math.PI * 2); g.ellipse(s * 0.2, s * 0.22, s * 0.13, s * 0.09, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-s * 0.15, s * 0.28); g.lineTo(-s * 0.15, -s * 0.34); g.lineTo(s * 0.31, -s * 0.42); g.lineTo(s * 0.31, s * 0.2); g.lineTo(s * 0.25, s * 0.2); g.lineTo(s * 0.25, -s * 0.3); g.lineTo(-s * 0.09, -s * 0.24); g.lineTo(-s * 0.09, s * 0.28); g.closePath(); g.fill(); return;
    case 'chevrons':
      g.moveTo(-s * 0.36, -s * 0.3); g.lineTo(-s * 0.06, 0); g.lineTo(-s * 0.36, s * 0.3); g.moveTo(s * 0.04, -s * 0.3); g.lineTo(s * 0.34, 0); g.lineTo(s * 0.04, s * 0.3); g.stroke(); return;
    case 'atom':
      for (let k = 0; k < 3; k++) { g.moveTo(Math.cos((k * Math.PI) / 3) * s * 0.46, Math.sin((k * Math.PI) / 3) * s * 0.46); g.ellipse(0, 0, s * 0.46, s * 0.15, (k * Math.PI) / 3, 0, Math.PI * 2); }
      g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.08, 0, Math.PI * 2); g.fill(); return;
    case 'starburst':
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? s * 0.16 : i % 6 === 0 ? s * 0.52 : s * 0.34; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); return;
    case 'interlace':
      // 三环相扣（博罗米恩环，北欧结绳纹的近似）
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3, x = Math.cos(a) * s * 0.17, y = Math.sin(a) * s * 0.17; g.moveTo(x + s * 0.27, y); g.arc(x, y, s * 0.27, 0, Math.PI * 2); }
      g.stroke(); return;
    case 'greekKey':
      g.moveTo(-s * 0.45, s * 0.4); g.lineTo(-s * 0.45, -s * 0.4); g.lineTo(s * 0.4, -s * 0.4); g.lineTo(s * 0.4, s * 0.22); g.lineTo(-s * 0.22, s * 0.22); g.lineTo(-s * 0.22, -s * 0.16); g.lineTo(s * 0.16, -s * 0.16); g.lineTo(s * 0.16, s * 0.02);
      g.stroke(); return;
    case 'kamon':
      // 家纹「一文字に三つ星」：外圈 + 上方一道横杠 + 品字三星
      g.arc(0, 0, s * 0.46, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.rect(-s * 0.26, -s * 0.3, s * 0.52, s * 0.08);
      for (const [x, y] of [[0, -s * 0.04], [-s * 0.17, s * 0.2], [s * 0.17, s * 0.2]]) { g.moveTo(x + s * 0.12, y); g.arc(x, y, s * 0.12, 0, Math.PI * 2); }
      g.fill(); return;
    case 'hexWarn':
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * s * 0.46, y = Math.sin(a) * s * 0.46; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.beginPath(); g.rect(-s * 0.05, -s * 0.26, s * 0.1, s * 0.3); g.moveTo(s * 0.06, s * 0.17); g.arc(0, s * 0.17, s * 0.06, 0, Math.PI * 2); g.fill(); return;
    case 'wedge':
      // 构成主义：粗环 + 刺进去的楔形 + 一根长条
      g.arc(-s * 0.1, -s * 0.04, s * 0.26, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(s * 0.48, -s * 0.2); g.lineTo(s * 0.48, s * 0.04); g.lineTo(-s * 0.18, -s * 0.06); g.closePath(); g.rect(-s * 0.46, s * 0.3, s * 0.9, s * 0.09); g.fill(); return;
    case 'geometric':
      g.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      g.moveTo(s * 0.25, 0); g.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      g.stroke(); return;
    case 'brackets':
      g.moveTo(-s / 2, -s / 6); g.lineTo(-s / 2, -s / 2); g.lineTo(-s / 6, -s / 2);
      g.stroke(); return;
    case 'floral':
      for (let i = 0; i < 2; i++) {
        const k = i ? -1 : 1;
        g.moveTo(0, 0);
        g.bezierCurveTo(k * s * 0.5, -s * 0.1, k * s * 0.5, -s * 0.55, k * s * 0.15, -s * 0.45);
        g.bezierCurveTo(k * s * 0.0, -s * 0.4, k * s * 0.1, -s * 0.25, k * s * 0.25, -s * 0.3);
      }
      g.stroke(); return;
    case 'cloud':
      for (const [x, r] of [[-s * 0.22, s * 0.18], [0, s * 0.26], [s * 0.22, s * 0.18]] as const) { g.moveTo(x + r, 0); g.arc(x, 0, r, Math.PI, 0); }
      g.moveTo(-s * 0.4, 0); g.lineTo(s * 0.4, 0);
      g.moveTo(s * 0.06, -s * 0.05); g.arc(0, -s * 0.05, s * 0.06, 0, Math.PI * 1.5);
      g.stroke(); return;
    case 'sakura':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.moveTo(0, 0);
        g.ellipse(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22, s * 0.18, s * 0.11, a, 0, Math.PI * 2);
      }
      g.fill(); return;
    case 'rivets':
      g.arc(0, 0, s * 0.16, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(-s * 0.04, -s * 0.05, s * 0.05, 0, Math.PI * 2); g.save(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); g.restore();
      return;
    case 'circuit':
      g.moveTo(-s / 2, -s * 0.2); g.lineTo(-s * 0.1, -s * 0.2); g.lineTo(s * 0.1, 0); g.lineTo(s / 2, 0);
      g.stroke(); g.beginPath(); g.arc(s / 2, 0, s * 0.07, 0, Math.PI * 2); g.arc(-s / 2, -s * 0.2, s * 0.07, 0, Math.PI * 2); g.fill(); return;
    case 'stars':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? s * 0.12 : s * 0.45; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); return;
    case 'hearts':
      g.moveTo(0, s * 0.35);
      g.bezierCurveTo(-s * 0.55, 0, -s * 0.3, -s * 0.45, 0, -s * 0.15);
      g.bezierCurveTo(s * 0.3, -s * 0.45, s * 0.55, 0, 0, s * 0.35);
      g.fill(); return;
    case 'skulls':
      g.arc(0, -s * 0.05, s * 0.3, Math.PI, 0); g.lineTo(s * 0.2, s * 0.3); g.lineTo(-s * 0.2, s * 0.3); g.closePath(); g.fill();
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(-s * 0.11, 0, s * 0.08, 0, Math.PI * 2); g.arc(s * 0.11, 0, s * 0.08, 0, Math.PI * 2); g.fill(); g.restore(); return;
    case 'wings':
      for (let i = 0; i < 3; i++) { g.moveTo(0, i * s * 0.12); g.quadraticCurveTo(-s * 0.3, -s * 0.2 + i * s * 0.12, -s * (0.55 - i * 0.1), -s * 0.1 + i * s * 0.1); }
      for (let i = 0; i < 3; i++) { g.moveTo(0, i * s * 0.12); g.quadraticCurveTo(s * 0.3, -s * 0.2 + i * s * 0.12, s * (0.55 - i * 0.1), -s * 0.1 + i * s * 0.1); }
      g.stroke(); return;
    case 'flames':
      g.moveTo(0, s * 0.4); g.bezierCurveTo(-s * 0.4, s * 0.1, -s * 0.1, -s * 0.2, 0, -s * 0.5); g.bezierCurveTo(s * 0.1, -s * 0.2, s * 0.4, s * 0.1, 0, s * 0.4); g.fill(); return;
    case 'inkSplash':
      for (let i = 0; i < 7; i++) { const a = i * 0.9; g.moveTo(0, 0); g.ellipse(Math.cos(a) * s * 0.18, Math.sin(a) * s * 0.18, s * (0.12 + (i % 3) * 0.05), s * 0.08, a, 0, Math.PI * 2); }
      g.fill(); return;
    case 'whiplash':
      // 鞭形曲线（M12b-63，K1 新艺术 G-motif-lib）：一道 S 形回卷的长弧，尾端卷成小圈
      g.moveTo(-s * 0.45, s * 0.35); g.bezierCurveTo(-s * 0.1, s * 0.45, -s * 0.5, -s * 0.2, 0, -s * 0.25); g.bezierCurveTo(s * 0.45, -s * 0.3, s * 0.3, s * 0.15, s * 0.1, s * 0.05);
      g.arc(s * 0.16, -s * 0.02, s * 0.08, Math.PI * 0.8, Math.PI * 2.6); g.stroke(); return;
    case 'drips':
      // 滴流（M12b-63，K1 街头涂鸦的喷漆滴痕）：一道横条往下挂三条长短不一的滴痕、端头圆珠
      g.rect(-s * 0.45, -s * 0.4, s * 0.9, s * 0.16);
      for (const [x, L] of [[-s * 0.28, 0.55], [0, 0.32], [s * 0.24, 0.72]] as const) { g.rect(x - s * 0.04, -s * 0.26, s * 0.08, s * L); g.moveTo(x + s * 0.07, -s * 0.26 + s * L); g.arc(x, -s * 0.26 + s * L, s * 0.07, 0, Math.PI * 2); }
      g.fill(); return;
    case 'sunsetStripes':
      // 落日条纹（M12b-63，K1 合成波 / 70 年代）：半个圆盘被几道越往下越粗的横缝切开
      // 横缝用裁剪留出来（不用 destination-out：直接画在画布上时会擦掉下面的画面）
      g.save(); g.beginPath(); g.rect(-s * 0.5, -s * 0.3, s, s * 0.22);
      for (let i = 0; i < 4; i++) { const y = -s * 0.08 + i * s * 0.07 + s * (0.015 + i * 0.012), h = s * 0.07 - s * (0.015 + (i + 1) * 0.012); if (h > 0) g.rect(-s * 0.5, y, s, h); }
      g.clip(); g.beginPath(); g.arc(0, s * 0.18, s * 0.42, Math.PI, 0); g.closePath(); g.fill(); g.restore(); return;
    case 'runes':
      // 符文圈：圆 + 竖杆 + 两根朝右上的短枝（ᚠ 一类的符文；M12a-08：原来的「圆 + 斜杠」读成禁止标志）
      g.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      g.moveTo(0, -s * 0.26); g.lineTo(0, s * 0.26);
      g.moveTo(0, -s * 0.04); g.lineTo(s * 0.16, -s * 0.2); g.moveTo(0, s * 0.1); g.lineTo(s * 0.16, -s * 0.06);
      g.stroke(); return;
    default:
      g.moveTo(-s * 0.3, 0); g.lineTo(0, -s * 0.3); g.lineTo(s * 0.3, 0); g.lineTo(0, s * 0.3); g.closePath(); g.fill();
  }
}

/**
 * 角花：沿两条边伸出的饰线 + 角上的母题符号。卷草母题（M12b-44）画 scrollCorner（臂长不超过 maxArm——四角的花互不相连）；
 * mod = 粗细调制（vis.strokeModulation 或卷草母题的默认）：别的母题只有显式给了才把两条直臂画成膨线
 */
function corner(g: Ctx, x: number, y: number, sx: number, sy: number, size: number, motif: string, level: number, mod = 0, maxArm = Infinity) {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  if (SCROLL_MOTIFS.has(motif)) {
    const [w0, w1] = modWidths(g.lineWidth, mod);
    scrollCorner(g, size, motif, level, Math.max(size * 0.6, Math.min(size * (1.1 + level * 0.45), maxArm)), w0, w1);
  } else if (motif === 'brackets') {
    g.lineWidth = Math.max(1.5, size * 0.12);
    g.beginPath(); g.moveTo(0, size * 0.9); g.lineTo(0, 0); g.lineTo(size * 0.9, 0); g.stroke();
  } else {
    const len = size * (0.8 + level * 0.4);
    if (mod > 0) { const [w0, w1] = modWidths(g.lineWidth, mod); swell(g, size * 0.35, 0, len, 0, w0, w1); swell(g, 0, size * 0.35, 0, len, w0, w1); }
    else { g.beginPath(); g.moveTo(size * 0.35, 0); g.lineTo(len, 0); g.moveTo(0, size * 0.35); g.lineTo(0, len); g.stroke(); }
    g.save();
    g.translate(size * 0.18, size * 0.18);
    g.rotate(sx * sy < 0 ? Math.PI / 4 : -Math.PI / 4);
    glyph(g, motif, size * (0.55 + level * 0.12), level);
    g.restore();
  }
  g.restore();
}

/**
 * 饰件作用范围（ast.ornamentScope，M12a-07）：where = hud（局内 HUD 元素）/ screen（界面模板、菜单屏里的面板）/ container（界面的主容器面板）；
 * frame = 画面（largePanels 按画面短边的 1/4 判断大面板）。scope 没给或 all → 都画
 */
export function ornamentInScope(scope: string | undefined, where: 'hud' | 'screen' | 'container', box: Rect, frame: Rect): boolean {
  switch (scope) {
    case 'screens': return where !== 'hud';
    case 'templatePanels': return where === 'container';
    case 'largePanels': return Math.min(box.w, box.h) >= Math.min(frame.w, frame.h) * 0.25;
    default: return true;
  }
}

/** drawOrnaments / ornamentInsets 的附加项：位图饰件用的强调色、外框材质、点名的饰件、最小面板（M12a-07）、分隔线样式与画面（M12a-08）、功能性微字饰件（M12b-48） */
export interface OrnExtra { accent?: string; mat?: string; named?: string[]; minSize?: number; dividerStyle?: string; frame?: Rect | null; micro?: Ornament['micro']; fade?: number;
  /** 粗细调制（vis.strokeModulation 显式给了才有，M12b-44） */
  mod?: number;
  /** 第二母题（vis.motif2，M12b-43）：分隔线中间的符号、矢量端头用它 */
  motif2?: string;
  /** 分隔线的位置（vis.dividerPlace 显式给了才有，M12b-45）：不含 panelBottom 时饰件的底边分隔线不画 */
  dividerPlace?: string[];
  /** M12b-49：宝石 / 挂件色（col.gem，没给 = 原来写死的品红宝石、红挂件）、饰件挂点（ast.ornamentAnchor：没给 = 面板四角 + 边上）、出框量（ast.ornamentOverhang 0~1）、端头形（ast.endcapShape） */
  gem?: string; anchors?: string[]; overhang?: number; endcap?: string }

/**
 * 饰件的几何（drawOrnaments 与 ornamentInsets 共用，M12a-08）：装饰尺寸、角饰画不画、分隔线在哪、顶边居中的饰件下移多少。
 * top(half) = 顶边居中的饰件（徽章底座、宝石、缎带）的中心 y：没给画面或不会探出画面时就是盒子顶边；会被画面顶边截掉时下移到画面里（顶边留 2）
 */
function geom(r: Rect, level: number, motif: string, parts: string[], dividerAt: number | undefined, extra: OrnExtra | undefined) {
  const size = Math.max(6, Math.min(r.w, r.h) * (0.08 + level * 0.025));
  const want = (p: string) => parts.includes(p);
  // 画位图的饰件：点名的（调用方没给 named 时退回 parts）
  const named = extra?.named ?? parts;
  const art = (p: string) => want(p) && named.includes(p);
  // 装饰预算 1 又没有母题、没有指定饰件：只是"允许一点点装饰"，不自动加角花（新拟态、扁平这类皮肤靠它兜底为 1）
  const hasMotif = !!motif && motif !== 'none';
  const tiny = extra?.minSize !== undefined && Math.min(r.w, r.h) < extra.minSize;
  const corners = !tiny && (want('corners') || (!parts.length && (level >= 2 || (level >= 1 && hasMotif))));
  // 分隔线的位置（vis.dividerPlace，M12b-45）：显式给了又不含 panelBottom 时盒子底边不画（构图给了 dividerAt 的照画）
  const placed = !extra?.dividerPlace || dividerAt !== undefined || extra.dividerPlace.includes('panelBottom');
  const divider = placed && (want('dividers') || level >= 3) && (extra?.minSize !== undefined ? !tiny : dividerAt !== undefined || r.h >= 70);
  // 顶边居中的饰件放进画面的安全区（M12b-64 ⑨，hollow-knight#8）：离画面顶边至少 2% 短边（原来 2，floral 这类母题符号比算的半高大，仍被截掉一截）
  const safe = extra?.frame ? Math.max(2, Math.min(extra.frame.w, extra.frame.h) * 0.02) : 2;
  const top = (half: number) => (extra?.frame && r.y - half < extra.frame.y + safe ? extra.frame.y + safe + half : r.y);
  // bottom(ext) = 往下垂 ext 的底边饰件（B4 的尖顶饰、封印条）挂在哪个 y：会伸出画面底边时上移到画面里（B4 审查修复，与 top 同口径）
  const bottom = (ext: number) => (extra?.frame && r.y + r.h + ext > extra.frame.y + extra.frame.h - safe ? extra.frame.y + extra.frame.h - safe - ext : r.y + r.h);
  return { size, want, art, corners, divider, divY: dividerAt !== undefined ? r.y + dividerAt : r.y + r.h - 7, top, bottom };
}

/* ---------------- 花饰标牌的饰线（M12b-46） ---------------- */

/**
 * 对称花饰（M12b-46，cmp.plate = flourish / el.title.form = areaCard，hollow-knight#10 / #32）：以 (cx, cy) 为中、宽 w、高 h 的一对镜像卷须——
 * 从中间下方向两侧伸出、中段下沉、两端翘起收成涡卷（铁艺母题收成刺），中间垂一枚小饰（母题符号，没有母题时水滴形）；线宽两端细中段胖。当前 fillStyle / strokeStyle
 */
export function flourish(g: Ctx, cx: number, cy: number, w: number, h: number, motif: string) {
  const hw = w / 2, w1 = Math.max(1.2, h * 0.16), w0 = w1 * 0.3, end: ScrollEnd = motif === 'wroughtIron' ? 'thorn' : 'volute';
  for (const k of [-1, 1]) {
    scroll(g, [[cx + k * hw * 0.04, cy + h * 0.05, cx + k * hw * 0.35, cy + h * 0.55, cx + k * hw * 0.7, cy - h * 0.45, cx + k * hw * 0.94, cy - h * 0.05]], w0, w1, { end, curl: k, size: h * 0.2 });
    // 中段一根往里卷的小枝
    scroll(g, [[cx + k * hw * 0.42, cy + h * 0.12, cx + k * hw * 0.38, cy + h * 0.5, cx + k * hw * 0.5, cy + h * 0.62, cx + k * hw * 0.56, cy + h * 0.4]], w0 * 0.8, w1 * 0.7, { end: 'volute', curl: -k, size: h * 0.11 });
  }
  g.save(); g.translate(cx, cy + h * 0.38);
  if (!motif || motif === 'none') { g.beginPath(); g.moveTo(0, -h * 0.22); g.quadraticCurveTo(h * 0.16, h * 0.05, 0, h * 0.2); g.quadraticCurveTo(-h * 0.16, h * 0.05, 0, -h * 0.22); g.closePath(); g.fill(); }
  else glyph(g, motif, h * 0.42, 1);
  g.restore();
}
/**
 * 开口括号（M12b-46，cmp.plate = bracketFrame，frostpunk#33）：r 的左右两侧各一个「[」「]」——竖线 + 上下两条短臂，臂尖卷成涡卷（铁艺母题收成刺），
 * 中间不封口；线宽 lw，当前 fillStyle
 */
export function bracketFrame(g: Ctx, r: Rect, lw: number, motif: string) {
  const arm = Math.min(r.h * 0.5, r.w * 0.22), end: ScrollEnd = motif === 'wroughtIron' ? 'thorn' : 'volute', w1 = lw * 1.6, w0 = lw * 0.6;
  for (const k of [-1, 1]) {
    const x = k < 0 ? r.x : r.x + r.w;
    g.fillRect(x - lw / 2, r.y + lw, lw, r.h - lw * 2);
    for (const [y, dy] of [[r.y, 1], [r.y + r.h, -1]] as const) scroll(g, [[x, y + dy * lw / 2, x - k * arm * 0.4, y + dy * lw / 2, x - k * arm * 0.8, y, x - k * arm, y + dy * lw * 2.5]], w0, w1, { end, curl: k * dy, size: Math.max(lw * 1.4, arm * 0.18) });
  }
}

/* ---------------- 饰件挂点的小件（M12b-49） ---------------- */

/**
 * 四角花焦点（ix.focus = cornerFlourish，M12b-49，hollow-knight#16）：r 四角外侧各一片角花（corner() 的画法，尺寸 size，母题没有时用花叶），臂沿边内伸，色 = color
 */
export function flourishCorners(g: Ctx, r: Rect, size: number, motif: string, color: string) {
  const m = !motif || motif === 'none' ? 'floral' : motif, o = size * 0.35, maxArm = Math.min(r.w, r.h) / 2;
  g.save();
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(1, size * 0.12); g.lineCap = 'round';
  corner(g, r.x - o, r.y - o, 1, 1, size, m, 1, SCROLL_MOD[m] ?? 0, maxArm);
  corner(g, r.x + r.w + o, r.y - o, -1, 1, size, m, 1, SCROLL_MOD[m] ?? 0, maxArm);
  corner(g, r.x - o, r.y + r.h + o, 1, -1, size, m, 1, SCROLL_MOD[m] ?? 0, maxArm);
  corner(g, r.x + r.w + o, r.y + r.h + o, -1, -1, size, m, 1, SCROLL_MOD[m] ?? 0, maxArm);
  g.restore();
}

/** 端头形（ast.endcapShape）的 auto：卷草母题 → scroll、祥云 → cloud、水墨 → brushTail，其余 fallback */
export function endcapShapeOf(shape: string | undefined, motif: string, fallback = 'spike'): string {
  if (shape && shape !== 'auto') return shape;
  return SCROLL_MOTIFS.has(motif) ? 'scroll' : motif === 'cloud' ? 'cloud' : motif === 'inkSplash' ? 'brushTail' : fallback;
}
/**
 * 端头（§2 的 drawEndcap(g, x, y, h, side, shape, color)，M12b-49）：贴在 (x, y)（条 / 元素 / 面板一端的中点）往外（side = -1 左、1 右）长的一个小件，高约 h。
 * spike = 尖角、ball = 短颈 + 圆珠、square = 方块、cloud = 三朵云头、brushTail = 收尖的墨刷尾、scroll = 一对上下卷开的卷须（M12b-44 scroll()）。
 * 饰件的端盖（ast.ornaments = endcaps）、元素两端（ast.ornamentAnchor = elementEnds）、数值条两端（barEnds；B5 · 03 的 cmp.gaugeCap = motif 也经它）共用
 */
export function drawEndcap(g: Ctx, x: number, y: number, h: number, side: number, shape: string, color: string) {
  const k = side < 0 ? -1 : 1, H = Math.max(4, h);
  g.save();
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, H * 0.09);
  g.beginPath();
  switch (shape) {
    case 'ball': g.rect(k < 0 ? x - H * 0.3 : x, y - H * 0.12, H * 0.3, H * 0.24); g.moveTo(x + k * H * 0.6 + H * 0.32, y); g.arc(x + k * H * 0.6, y, H * 0.32, 0, Math.PI * 2); g.fill(); break;
    case 'square': g.rect(k < 0 ? x - H * 0.55 : x, y - H * 0.28, H * 0.55, H * 0.56); g.fill(); break;
    case 'cloud':
      for (const [dx, dy, rr] of [[0.28, -0.12, 0.26], [0.55, 0.05, 0.22], [0.25, 0.2, 0.2]] as const) { g.moveTo(x + k * H * dx + H * rr, y + H * dy); g.arc(x + k * H * dx, y + H * dy, H * rr, 0, Math.PI * 2); }
      g.fill(); break;
    case 'brushTail':
      g.moveTo(x, y - H * 0.42); g.quadraticCurveTo(x + k * H * 0.9, y - H * 0.4, x + k * H * 1.7, y + H * 0.05); g.quadraticCurveTo(x + k * H * 0.8, y + H * 0.12, x + k * H * 1.1, y + H * 0.3);
      g.quadraticCurveTo(x + k * H * 0.5, y + H * 0.45, x, y + H * 0.42); g.closePath(); g.fill(); break;
    case 'scroll': {
      const w1 = Math.max(1, H * 0.13), w0 = w1 * 0.4;
      scroll(g, [[x, y, x + k * H * 0.5, y - H * 0.1, x + k * H * 0.8, y - H * 0.55, x + k * H * 0.45, y - H * 0.45]], w0, w1, { end: 'volute', curl: -k, size: H * 0.14 });
      scroll(g, [[x, y, x + k * H * 0.5, y + H * 0.1, x + k * H * 0.8, y + H * 0.55, x + k * H * 0.45, y + H * 0.45]], w0, w1, { end: 'volute', curl: k, size: H * 0.14 });
      break;
    }
    case 'beastHead':
      // 兽首（M12b-63，K1 G-ornament-lib：龙 / 狮头的剪影）：口朝外的头，张口、一只眼、顶上两只角
      g.moveTo(x, y - H * 0.32); g.lineTo(x + k * H * 0.45, y - H * 0.42); g.lineTo(x + k * H * 0.62, y - H * 0.62); g.lineTo(x + k * H * 0.66, y - H * 0.36); g.lineTo(x + k * H * 0.95, y - H * 0.18);
      g.lineTo(x + k * H * 0.6, y - H * 0.02); g.lineTo(x + k * H * 0.92, y + H * 0.14); g.lineTo(x + k * H * 0.5, y + H * 0.34); g.lineTo(x, y + H * 0.32); g.closePath(); g.fill();
      g.fillStyle = withAlpha('#ffffff', 0.7); g.beginPath(); g.arc(x + k * H * 0.5, y - H * 0.2, H * 0.06, 0, Math.PI * 2); g.fill(); break;
    case 'crestPillar':
      // 柱头徽（M12b-63）：一截竖柱（上下两道柱头线）+ 柱心一枚菱形徽
      g.rect(k < 0 ? x - H * 0.42 : x + H * 0.12, y - H * 0.5, H * 0.3, H); g.rect(k < 0 ? x - H * 0.5 : x + H * 0.04, y - H * 0.56, H * 0.46, H * 0.1); g.rect(k < 0 ? x - H * 0.5 : x + H * 0.04, y + H * 0.46, H * 0.46, H * 0.1);
      g.rect(k < 0 ? x - H * 0.12 : x, y - H * 0.06, H * 0.12, H * 0.12); g.fill();
      g.beginPath(); { const cx = x + k * H * 0.27; g.moveTo(cx, y - H * 0.2); g.lineTo(cx + H * 0.14, y); g.lineTo(cx, y + H * 0.2); g.lineTo(cx - H * 0.14, y); g.closePath(); } g.fillStyle = withAlpha('#ffffff', 0.55); g.fill(); break;
    case 'wing':
      // 翼（M12b-63）：三片向外、往上翘的羽
      for (let i = 0; i < 3; i++) { const yy = y - H * 0.25 + i * H * 0.22, L = H * (1 - i * 0.18); g.moveTo(x, yy); g.quadraticCurveTo(x + k * L * 0.55, yy - H * 0.28, x + k * L, yy - H * 0.32 + i * H * 0.08); g.quadraticCurveTo(x + k * L * 0.6, yy + H * 0.02, x, yy + H * 0.16); g.closePath(); }
      g.fill(); break;
    default: g.moveTo(x, y - H * 0.4); g.lineTo(x + k * H * 0.7, y); g.lineTo(x, y + H * 0.4); g.closePath(); g.fill();
  }
  g.restore();
}
/** 端头往外伸多长（占位 / 避让用）：按 drawEndcap 的形 */
export const endcapReach = (shape: string, h: number) => Math.max(4, h) * (shape === 'brushTail' ? 1.7 : shape === 'ball' ? 0.92 : shape === 'scroll' ? 0.85 : shape === 'cloud' ? 0.8 : shape === 'square' ? 0.55 : shape === 'beastHead' || shape === 'wing' ? 0.95 : shape === 'crestPillar' ? 0.5 : 0.7);
/**
 * 花枝（M12b-49，hades#32 的红色月桂）：从 (x, cy) 往 dir（-1 左 / 1 右）长一根略弯的枝，两侧交替 5 片叶，高约 s；名牌旁（ast.ornamentAnchor = plateSide）用
 */
export function sprig(g: Ctx, x: number, cy: number, s: number, dir: number, color: string) {
  const k = dir < 0 ? -1 : 1, L = s * 1.6;
  g.save();
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, s * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, cy + s * 0.25); g.quadraticCurveTo(x + k * L * 0.5, cy + s * 0.3, x + k * L, cy - s * 0.25); g.stroke();
  for (let i = 0; i < 5; i++) {
    const t = 0.18 + i * 0.18, px = x + k * L * t, py = cy + s * 0.25 - s * 0.5 * t * t, up = i % 2 ? 1 : -1;
    g.beginPath(); g.ellipse(px + k * s * 0.06, py + up * s * 0.16, s * 0.2, s * 0.08, k * (up < 0 ? -0.7 : 0.7), 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
/** 胶带（ast.ornaments = tape）：角上斜贴的一条半透明胶带（两端锯齿），dir = -1 左上 / 1 右上 */
function tapeStrip(g: Ctx, x: number, y: number, s: number, dir: number, color?: string) {
  const w = s * 2.6, h = s * 0.7;
  g.save();
  g.translate(x, y); g.rotate(dir * -0.6);
  g.fillStyle = color ? withAlpha(color, 0.7) : 'rgba(244,236,212,0.72)';
  g.beginPath(); g.moveTo(-w / 2, -h / 2);
  for (let i = 0; i <= 4; i++) g.lineTo(-w / 2 + (i % 2 ? 1.2 : 0), -h / 2 + (h * i) / 4);
  g.lineTo(w / 2, h / 2);
  for (let i = 4; i >= 0; i--) g.lineTo(w / 2 - (i % 2 ? 1.2 : 0), -h / 2 + (h * i) / 4);
  g.closePath(); g.fill();
  g.restore();
}
/** 封印条（ast.ornaments = sealStrip）：从 (x, y)（底边）垂下两条羊皮纸 + 一枚蜡封（上压一枚母题符号） */
function sealStrip(g: Ctx, x: number, y: number, s: number, wax: string, motif: string, level: number) {
  g.save();
  g.fillStyle = '#e6d7b0';
  g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.15, y); g.lineTo(x - s * 0.3, y + s * 3.2); g.lineTo(x - s * 0.62, y + s * 2.9); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + s * 0.05, y); g.lineTo(x + s * 0.45, y); g.lineTo(x + s * 0.6, y + s * 2.6); g.lineTo(x + s * 0.25, y + s * 2.8); g.closePath(); g.fill();
  g.fillStyle = 'rgba(80,60,30,0.45)';
  for (let i = 0; i < 3; i++) g.fillRect(x - s * 0.48, y + s * (1.3 + i * 0.32), s * 0.28, Math.max(0.6, s * 0.05));
  g.fillStyle = wax;
  g.beginPath();
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2, rr = s * (0.62 + (i % 2) * 0.06); if (i) g.lineTo(x + Math.cos(a) * rr, y + s * 0.4 + Math.sin(a) * rr); else g.moveTo(x + rr, y + s * 0.4); }
  g.closePath(); g.fill();
  g.translate(x, y + s * 0.4);
  g.fillStyle = withAlpha('#000', 0.35); g.strokeStyle = g.fillStyle; g.lineWidth = Math.max(1, s * 0.07);
  glyph(g, motif, s * 0.62, level);
  g.restore();
}
/**
 * 墨团底衬（ast.ornaments = inkBacking，M12b-49，disco-elysium#22）：大号数字背后的不规则水墨团（主团 + 3 个飞溅小点），seed 定形（帧间稳定），色 = 类别色（col.lineColors）
 */
export function inkBlob(g: Ctx, cx: number, cy: number, s: number, color: string, seed: number) {
  const R = mrand(seed * 7 + 3);
  g.save();
  g.fillStyle = color;
  g.beginPath();
  // 一圈 16 个半径，最后一点回到第一点（B4 审查修复：原来第 17 个点另取一个随机半径，团的接缝处错开一截）
  const n = 16, rad: number[] = [];
  for (let i = 0; i < n; i++) rad.push(s * (0.36 + R() * 0.14));
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = rad[i % n]; const x = cx + Math.cos(a) * rr * 1.1, y = cy + Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.fill();
  for (let i = 0; i < 3; i++) { const a = R() * Math.PI * 2, d = s * (0.52 + R() * 0.12), rr = s * (0.04 + R() * 0.05); g.beginPath(); g.arc(cx + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d, rr, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/* ---------------- 顶冠框的几何（M12b-50） ---------------- */

/**
 * 顶冠 / 底坠的几何（ast.frame = crowned / threePart，M12b-50；frame.ts 的 crownPieces 与 ornamentInsets / elementFrame 的占位共用）：顶冠大小 = 短边 18%（12~48），
 * 底坠 0.6 倍；两件都长在盒边外、最远伸出 1.05 × 大小。B4 审查修复：给了画面（safe）时会伸出画面边（留 2% 短边）就先缩到 0.6 倍，还放不下再往盒里挪
 * （与 geom().top 同口径：全屏面板顶上的顶冠原来被画面顶边截掉大半）。返回中线 cx、两件的底座 y 与大小、外接框 rects
 */
export function crownGeom(r: Rect, safe?: Rect | null): { cx: number; top: { y: number; sz: number }; bot: { y: number; sz: number }; rects: Rect[] } {
  const s = clamp(Math.min(r.w, r.h) * 0.18, 12, 48), cx = r.x + r.w / 2, m = safe ? Math.max(2, Math.min(safe.w, safe.h) * 0.02) : 0;
  const fit = (y: number, sz0: number, dir: number) => {
    if (!safe) return { y, sz: sz0 };
    const room = dir < 0 ? y - (safe.y + m) : safe.y + safe.h - m - y, sz = room < sz0 * 1.05 ? Math.max(sz0 * 0.6, room / 1.05) : sz0;
    return { y: room < sz * 1.05 ? (dir < 0 ? safe.y + m + sz * 1.05 : safe.y + safe.h - m - sz * 1.05) : y, sz };
  };
  const top = fit(r.y, s, -1), bot = fit(r.y + r.h, s * 0.6, 1);
  return { cx, top, bot, rects: [{ x: cx - top.sz * 0.65, y: top.y - top.sz * 1.05, w: top.sz * 1.3, h: top.sz * 1.3 }, { x: cx - bot.sz * 0.65, y: bot.y - bot.sz * 0.25, w: bot.sz * 1.3, h: bot.sz * 1.3 }] };
}

/* ---------------- 分隔线（M12b-45） ---------------- */

/** 一整条的印刷分隔线（vis.dividerStyle，M12b-45）：牛津线（粗 + 细双线）/ 膨线（两端收尖）/ 双线 / 点线 / 渐隐线；其余（glyph / plain / auto）是两段线 + 中间的空当 */
export const LINE_DIVIDERS = new Set(['oxford', 'swelled', 'double', 'dotted', 'fade']);
/** divider() 的选项：lw = 线宽（没给 1）；size = 中间母题符号的大小；level = 符号变体；fade = 两端渐隐比例（vis.strokeFade）；mod = 粗细调制（两段线画成膨线） */
export interface DividerOpts { lw?: number; size?: number; level?: number; fade?: number; mod?: number }
/**
 * 分隔线（§2 的 divider(g, x0, x1, y, style, motif, color)，M12b-45；从 drawOrnaments 抽出）：在 [x0, x1]、高度 y 处画一条分隔线。
 * glyph（auto）= 两段线（各占 37.5%，中间空 25%）+ 中间一枚母题符号（原来的饰件分隔饰条，逐字不变）；plain = 只有两段线；
 * oxford = 粗细双线（上粗下细，19 世纪印刷线）；swelled = 中间鼓起、两端收尖的膨线；double = 两条等粗细线；dotted = 一串圆点；fade = 一条两端渐隐的线。
 * glyph / plain 画在调用方设好的 strokeStyle / lineWidth 上（color 只给渐隐用），一整条的线型自己按 color 填；fade > 0 时都按两端渐隐的渐变画。
 * 饰件的底边分隔线、模板的分栏线（lay.grouping = divider）、页头下 / 块之间 / 网格行间（vis.dividerPlace）共用
 */
export function divider(g: Ctx, x0: number, x1: number, y: number, style: string, motif: string, color: string, o: DividerOpts = {}) {
  const f = o.fade ?? 0, span = x1 - x0, lw = o.lw ?? 1;
  const grad = () => { const gr = g.createLinearGradient(x0, 0, x1, 0), c0 = withAlpha(color, 0); gr.addColorStop(0, c0); gr.addColorStop(Math.min(0.49, f), color); gr.addColorStop(Math.max(0.51, 1 - f), color); gr.addColorStop(1, c0); return gr; };
  if (!LINE_DIVIDERS.has(style)) {
    const a = x0 + span * 0.375, b = x1 - span * 0.375;
    // 两端渐隐（vis.strokeFade，M12b-37，hollow-knight#22）：两段线共用一条从左端到右端的透明度渐变，外侧两端淡到透明
    if (f > 0) { g.save(); g.strokeStyle = grad(); if (o.mod && o.mod > 0) g.fillStyle = g.strokeStyle; g.lineCap = 'butt'; }
    // 粗细调制（vis.strokeModulation 显式给了，M12b-44）：两段线画成膨线
    if (o.mod && o.mod > 0) { const [w0, w1] = modWidths(lw, o.mod); swell(g, x0, y, a, y, w0, w1); swell(g, b, y, x1, y, w0, w1); }
    else { g.beginPath(); g.moveTo(x0, y); g.lineTo(a, y); g.moveTo(b, y); g.lineTo(x1, y); g.stroke(); }
    if (f > 0) g.restore();
    if (style !== 'plain') { g.save(); g.translate((x0 + x1) / 2, y); glyph(g, motif, o.size ?? 10, o.level ?? 0); g.restore(); }
    return;
  }
  g.save();
  g.fillStyle = f > 0 ? grad() : color;
  if (style === 'oxford') { const th = Math.max(1.5, lw * 2.4), tn = Math.max(0.6, lw * 0.7), gap = Math.max(1.2, lw * 1.4), t = y - (th + gap + tn) / 2; g.fillRect(x0, t, span, th); g.fillRect(x0, t + th + gap, span, tn); }
  else if (style === 'double') { const t = Math.max(0.6, lw), gap = Math.max(1.5, lw * 1.6); g.fillRect(x0, y - gap / 2 - t, span, t); g.fillRect(x0, y + gap / 2, span, t); }
  else if (style === 'swelled') swell(g, x0, y, x1, y, Math.max(0.3, lw * 0.25), Math.max(2.2, lw * 3.2));
  else if (style === 'dotted') { const rr = Math.max(0.7, lw * 0.75), step = rr * 4.2, n = Math.max(1, Math.floor(span / step)), x00 = x0 + (span - (n - 1) * step) / 2; g.beginPath(); for (let i = 0; i < n; i++) { const x = x00 + i * step; g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2); } g.fill(); }
  else { if (!(f > 0)) { const ff = 0.35, gr = g.createLinearGradient(x0, 0, x1, 0), c0 = withAlpha(color, 0); gr.addColorStop(0, c0); gr.addColorStop(ff, color); gr.addColorStop(1 - ff, color); gr.addColorStop(1, c0); g.fillStyle = gr; } g.fillRect(x0, y - lw / 2, span, lw); }
  g.restore();
}

/**
 * 在面板 r 上画装饰。level：0 无 1 少 2 中 3 华丽；parts：ast.ornaments 的饰件。
 * dividerAt：分隔线离盒子顶边的距离（由构图给出，例如标题行下沿）；没给时只在够高的盒子底部画。
 * extra：位图饰件用——accent 强调色（宝石色，没给用 color）、mat 外框材质（铆钉金 / 铁，没给按 color 深浅；描线材质 lineArt 时角花按饰色着色）、
 *   named 真正点名的饰件（ast.ornaments 来自派生层时给 []）：给了就只有其中的饰件画位图；没给按 parts 算，但没有母题时角花不画位图（分不清是不是派生的）。
 * extra.minSize：盒子短边低于它（设计单位，= ast.ornamentMinSize 的 px@1080p 经 px1080 换算，M12a-07 / 05）时不画角饰与分隔饰条；没给 = 原来的门槛（分隔线要高 ≥ 70，角饰不限）。
 * M12a-08：extra.dividerStyle = plain 时分隔线只画两段线、不放中间的母题符号（vis.dividerStyle）；extra.frame = 画面矩形——顶边居中的徽章底座 / 宝石 / 缎带
 *   会被画面顶边截掉时下移进画面（Hollow 全屏面板顶边正中的母题原来只剩半个）；角花位图在饰色不是金属色或外框是描线材质时按饰色着色
 */
/**
 * 花枝（ast.ornaments = sprigs）画不画（整合修复 U#25）：品质下限开着时整屏 / 大弹窗这类大面板（短边 ≥ 240 设计单位）不画——
 * 饰件尺寸跟面板短边走，大面板上一枝花放大到两百多像素、正好压在页头右上的关闭钮旁边，像一笔多余的笔刷；小面板（HUD 元素、卡片）照画
 */
const sprigOn = (r: Rect) => !QUALITY.on || Math.min(r.w, r.h) < 240;
export function drawOrnaments(g: Ctx, r: Rect, level: number, motif: string, color: string, parts: string[], dividerAt?: number, extra?: OrnExtra) {
  if (level <= 0 && !parts.length) return;
  const m = motif === 'none' || !motif ? 'diamond' : motif;
  const { size, want, art, corners, divider: hasDivider, divY, top, bottom } = geom(r, level, motif, parts, dividerAt, extra);
  // 伸出盒外的饰件进帧占位表（B4 审查修复 ⑳ 顺延到 M12b-63）：局内 HUD 的元素画面板端盖 / 尖顶饰 / 挂件 / 封印条 / 回形针 / 蝴蝶结 / 丝带 / 拍立得白边 / 蜡封时，
  // 伸到盒子外面的那几块交给 compose/hud.ts 登记成 decor.orn:<元素>（合规层、浮动详情、别的元素的两端卷须这些后画的东西躲它们）；元素自己的排位不变
  overhangOf(g, r, size, extra, { want, art, top, bottom });
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(1, size * 0.09);
  g.lineCap = 'round';
  // 点名了角花、图集画了这类母题且已加载：画位图角花，不再画矢量的
  // 粗细调制（M12b-44）：显式给了 vis.strokeModulation 用它，卷草母题按母题默认，其余等宽（原来的）
  const mod = extra?.mod ?? SCROLL_MOD[m] ?? 0;
  // 饰件挂点（ast.ornamentAnchor，M12b-49）：显式给了时只画列出的——panelCorners = 四角的角花 / 铆钉 / 花枝，panelEdges = 边上的徽章底座 / 宝石 / 缎带 / 挂件 / 端盖 / 尖顶饰
  const anc = extra?.anchors, onCorners = !anc || anc.includes('panelCorners'), onEdges = !anc || anc.includes('panelEdges'), ovh = extra?.overhang ?? 0;
  if (corners && onCorners && !(art('corners') && cornerPieces(g, r, motif, !!extra?.named, extra?.mat === 'lineArt' || !metallic(color) ? color : undefined, ovh))) {
    // 出框量（ast.ornamentOverhang）：角花往盒外推 0.6 × 尺寸 × 出框量
    const o = Math.max(2, size * 0.25) - ovh * size * 0.6, maxArm = Math.min(r.w, r.h) / 2 - o - 2;
    corner(g, r.x + o, r.y + o, 1, 1, size, m, level, mod, maxArm);
    corner(g, r.x + r.w - o, r.y + o, -1, 1, size, m, level, mod, maxArm);
    if (level >= 2 || want('corners')) {
      corner(g, r.x + o, r.y + r.h - o, 1, -1, size, m, level, mod, maxArm);
      corner(g, r.x + r.w - o, r.y + r.h - o, -1, -1, size, m, level, mod, maxArm);
    }
  }
  // 分隔饰条（M12b-45 起抽成 divider()：线型 vis.dividerStyle，两端渐隐 vis.strokeFade，中间的符号取第二母题）
  // 第二母题 = none（「无」，B4 审查修复）：中间不放符号（两段线，= plain 线型），不是 glyph('none') 的菱形
  if (hasDivider) { const ds = extra?.dividerStyle ?? 'glyph'; divider(g, r.x + r.w * 0.18, r.x + r.w * 0.82, divY, extra?.motif2 === 'none' && !LINE_DIVIDERS.has(ds) ? 'plain' : ds, extra?.motif2 ?? m, color, { lw: g.lineWidth as number, size: size * 0.7, level, fade: extra?.fade ?? 0, mod: extra?.mod }); }
  // 徽章底座：点名了 → 顶边居中一枚月桂圆章（位图）；装饰预算 3 自动带的仍是母题符号
  if (onEdges && (level >= 3 || want('badgeBase'))) {
    const bs = clamp(size * 1.8, 18, 56);
    // 程序画的母题符号（1.2 × 尺寸）半高按 0.62 × 尺寸算（M12b-64 ⑨：原来 0.54，符号上沿伸出画面）
    if (!(art('badgeBase') && piece(g, GEMS, 'medallion', r.x + r.w / 2, top(bs / 2), bs))) { g.save(); g.translate(r.x + r.w / 2, top(size * 0.62)); glyph(g, m, size * 1.2); g.restore(); }
  }
  if (onCorners && want('rivets')) {
    // 位图铆钉：直径随装饰尺寸，圆心内缩到不探出盒外太多
    const rs = clamp(size * 0.5, 7, 16), ri = Math.max(6, rs * 0.6), item = rivetItem(color, extra?.mat);
    const at = [[r.x + ri, r.y + ri], [r.x + r.w - ri, r.y + ri], [r.x + ri, r.y + r.h - ri], [r.x + r.w - ri, r.y + r.h - ri]];
    if (!(art('rivets') && at.every(([x, y]) => piece(g, GEMS, item, x, y, rs)))) for (const [x, y] of [[r.x + 6, r.y + 6], [r.x + r.w - 6, r.y + 6], [r.x + 6, r.y + r.h - 6], [r.x + r.w - 6, r.y + r.h - 6]]) {
      g.save(); g.translate(x, y); glyph(g, 'rivets', Math.max(8, size * 0.6)); g.restore();
    }
  }
  if (onEdges && want('gems')) {
    const gs = clamp(size * 1.1, 12, 32);
    // 宝石色（col.gem，M12b-49，hades#25 的紫水晶）：给了时位图宝石按它着色、矢量宝石用它；没给时按强调色选红 / 绿 / 蓝宝石（原来的）
    if (!(art('gems') && piece(g, GEMS, extra?.gem ? 'ruby' : gemItem(extra?.accent ?? color), r.x + r.w / 2, top(gs / 2), gs, extra?.gem ? { tint: extra.gem } : {}))) {
      g.save(); g.translate(r.x + r.w / 2, top(size * 0.31 - 2) + 2); g.rotate(Math.PI / 4);
      g.fillStyle = extra?.gem ?? '#c23b8f'; g.fillRect(-size * 0.22, -size * 0.22, size * 0.44, size * 0.44);
      g.strokeRect(-size * 0.22, -size * 0.22, size * 0.44, size * 0.44); g.restore();
    }
  }
  if (onEdges && want('hangers')) {
    const x = r.x + r.w / 2, y = r.y + r.h, hc = extra?.gem ?? '#c8102e';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + size * 1.2); g.stroke();
    g.save(); g.translate(x, y + size * 1.3); g.fillStyle = hc; glyph(g, 'diamond', size * 0.8); g.restore();
    g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x + i * 1.5, y + size * 1.6); g.lineTo(x + i * 2.5, y + size * 2.4); } g.strokeStyle = hc; g.stroke();
  }
  if (onEdges && want('endcaps')) for (const sx of [-1, 1]) {
    const x = sx < 0 ? r.x : r.x + r.w;
    // 位图尖顶饰（源图尖朝上）：转 ±90° 让尖朝外，底座压进盒边 15%
    const L = clamp(r.h * 0.4, 14, 44);
    if (art('endcaps') && piece(g, GEMS, 'finial', x + sx * L * 0.35, r.y + r.h / 2, L, { rot: (sx * Math.PI) / 2 })) continue;
    // 端头形（ast.endcapShape 选过，M12b-49）：drawEndcap 的形，高按位图尖顶饰的口径夹在 14~44（B4 审查修复：原来 0.6 × 盒高不封顶，300 × 500 的面板上墨刷尾伸出 510、
    // 比面板还宽）；画面给了时伸出量不超过盒子到画面边的空当（放不下 6 高的不画）。第二母题（M12b-43，none 除外）给了时端头画它的符号；都没有时原来的三角
    if (extra?.endcap) {
      const room = extra.frame ? (sx < 0 ? r.x - extra.frame.x : extra.frame.x + extra.frame.w - x) - 2 : Infinity, H0 = clamp(Math.min(r.h * 0.4, size * 1.6), 14, 44);
      const H = Math.min(H0, room / (endcapReach(extra.endcap, 100) / 100));
      if (H >= 6) drawEndcap(g, x, r.y + r.h / 2, H, sx, extra.endcap, color);
      continue;
    }
    if (extra?.motif2 && extra.motif2 !== 'none') { g.save(); g.translate(x + sx * size * 0.45, r.y + r.h / 2); glyph(g, extra.motif2, size * 0.9, level); g.restore(); continue; }
    g.beginPath(); g.moveTo(x, r.y + r.h * 0.2); g.lineTo(x + sx * size * 0.6, r.y + r.h / 2); g.lineTo(x, r.y + r.h * 0.8); g.closePath(); g.fill();
  }
  // 尖顶饰（M12b-44）：上下两条边的中点各一个朝外的尖塔（铁艺 = 蝙蝠翼），顶上的会被画面顶边截掉时下移
  if (onEdges && want('finials')) { const fs = finialSize(size); finial(g, r.x + r.w / 2, top(fs), fs, -1, m); finial(g, r.x + r.w / 2, bottom(fs), fs, 1, m); }
  // 胶带（M12b-49，K1 街头涂鸦 / 贴纸与剪贴簿）：上面两个角各斜贴一条半透明胶带
  if (onCorners && want('tape')) for (const sx of [-1, 1]) tapeStrip(g, sx < 0 ? r.x + size * 0.6 : r.x + r.w - size * 0.6, r.y + size * 0.3, size, sx, extra?.gem);
  // 封印条（M12b-49，K1 哥特科技的羊皮纸封印）：底边左段垂下两条羊皮纸 + 一枚蜡封（色 = col.gem，没给时暗红）
  if (onEdges && want('sealStrip')) sealStrip(g, r.x + Math.min(r.w * 0.22, size * 5), bottom(size * 3.3), size, extra?.gem ?? '#8e1b1b', m, level);
  if (onCorners && !anc?.includes('plateSide') && want('sprigs') && sprigOn(r)) {
    g.save(); g.translate(r.x + r.w - size, r.y + size * 0.4);
    if (QUALITY.on) {
      // 一枝带叶的小枝（整合修复 U#25：原来是四个斜排的实心椭圆，放大到整屏面板上像一笔多余的笔刷）：细茎 + 交替的叶片
      g.lineWidth = Math.max(1, size * 0.07); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-size * 0.6, size * 0.05, -size * 1.25, size * 0.5); g.stroke();
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.6) / 4.4, x = -size * 1.25 * t, y = size * 0.5 * t * t + size * 0.05 * t, sd = i % 2 ? 1 : -1;
        g.beginPath(); g.ellipse(x + size * 0.04, y + sd * size * 0.13, size * 0.17, size * 0.07, sd * 0.7 - 0.3, 0, Math.PI * 2); g.fill();
      }
    } else for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-i * size * 0.35, i * size * 0.15, size * 0.22, size * 0.1, -0.5, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  if (onEdges && want('ribbons')) {
    const w = Math.min(r.w * 0.5, 160), x = r.x + r.w / 2 - w / 2, h = size * 1.1, y = top(size * 0.5) - size * 0.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - h * 0.4, y + h / 2); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x + h * 0.4, y + h / 2); g.closePath(); g.fill();
  }
  g.restore();
  // M12b-63 饰件清单余项（K1 G-ornament-lib）：点名了才画
  if (K1_PARTS.some((k) => want(k))) k1Parts(g, r, size, color, extra?.gem, want);
  // 功能性微字饰件（M12b-48）：刻度侧轨、数据噪声块、套准十字（不受装饰预算与最小面板以外的门槛影响，点名了就画）
  if (want('rulerRail')) drawRails(g, r, extra?.micro, extra?.mat);
  if (want('microText')) drawMicroText(g, r, extra?.micro, motif, !!extra?.micro && want('rulerRail'));
  if (want('registration')) drawRegistration(g, r, extra?.micro?.color ?? color);
}

/* ---------------- 伸出盒外的饰件登记（M12b-63 收 B4 审查修复 ⑳） ---------------- */

/** 伸出盒外的饰件的外接框（盒子坐标）：只算真的画在盒外的那几种 */
interface OvhGeom { want: (k: string) => boolean; art: (k: string) => boolean; top: (half: number) => number; bottom: (ext: number) => number }
function overhangRects(r: Rect, size: number, extra: OrnExtra | undefined, G: OvhGeom): Rect[] {
  const { want, art, top, bottom } = G, anc = extra?.anchors, onEdges = !anc || anc.includes('panelEdges'), cx = r.x + r.w / 2, out: Rect[] = [];
  // 端盖：与 drawOrnaments 同一组分支——位图尖顶饰（伸出 0.85 L）/ 端头形（按到画面边的空当收，伸出 endcapReach）/ 第二母题符号 / 原来的三角
  if (onEdges && want('endcaps')) for (const sx of [-1, 1]) {
    const x = sx < 0 ? r.x : r.x + r.w, L = clamp(r.h * 0.4, 14, 44);
    let reach: number, h: number;
    if (art('endcaps')) { reach = L * 0.85; h = L * 0.5; }
    else if (extra?.endcap) {
      const room = extra.frame ? (sx < 0 ? r.x - extra.frame.x : extra.frame.x + extra.frame.w - x) - 2 : Infinity, H0 = clamp(Math.min(r.h * 0.4, size * 1.6), 14, 44);
      h = Math.min(H0, room / (endcapReach(extra.endcap, 100) / 100));
      if (h < 6) continue;
      reach = endcapReach(extra.endcap, h);
    } else if (extra?.motif2 && extra.motif2 !== 'none') { reach = size * 0.9; h = size * 0.9; }
    else { reach = size * 0.6; h = r.h * 0.6; }
    out.push({ x: sx < 0 ? x - reach : x, y: r.y + r.h / 2 - h / 2, w: reach, h });
  }
  if (onEdges && want('finials')) { const fs = finialSize(size), t0 = top(fs), b0 = bottom(fs); if (t0 - fs * 1.05 < r.y) out.push({ x: cx - fs * 0.45, y: t0 - fs * 1.05, w: fs * 0.9, h: Math.min(fs * 1.05, r.y - (t0 - fs * 1.05)) }); if (b0 + fs * 1.05 > r.y + r.h) out.push({ x: cx - fs * 0.45, y: Math.max(b0, r.y + r.h), w: fs * 0.9, h: b0 + fs * 1.05 - Math.max(b0, r.y + r.h) }); }
  if (onEdges && want('hangers')) out.push({ x: cx - size * 0.5, y: r.y + r.h, w: size, h: size * 2.4 });
  if (onEdges && want('sealStrip')) { const x = r.x + Math.min(r.w * 0.22, size * 5), b0 = bottom(size * 3.3); if (b0 + size * 3.3 > r.y + r.h) out.push({ x: x - size * 0.7, y: Math.max(b0, r.y + r.h), w: size * 1.4, h: b0 + size * 3.3 - Math.max(b0, r.y + r.h) }); }
  const s = Math.max(6, size);
  if (want('paperclip')) { const x = r.x + Math.min(r.w * 0.18, s * 3); out.push({ x: x - s * 0.35, y: r.y - s * 0.9, w: s * 0.7, h: s * 0.9 }); }
  if (want('bow')) out.push({ x: cx - s * 1.5, y: r.y - s * 1.1, w: s * 3, h: s * 1.1 });
  if (want('wavyRibbon')) { const w = Math.min(r.w * 0.6, s * 12); out.push({ x: r.x + (r.w - w) / 2 - s * 0.6, y: r.y - s * 0.6, w: w + s * 1.2, h: s * 0.6 }); }
  if (want('polaroid')) { const m0 = s * 0.6; out.push({ x: r.x - m0, y: r.y - m0, w: r.w + m0 * 2, h: m0 }, { x: r.x - m0, y: r.y + r.h, w: r.w + m0 * 2, h: s * 2.2 }, { x: r.x - m0, y: r.y, w: m0, h: r.h }, { x: r.x + r.w, y: r.y, w: m0, h: r.h }); }
  if (want('waxSeal')) { const rr = s * 0.95 * 1.08; out.push({ x: cx - rr, y: r.y + r.h, w: rr * 2, h: rr }); }
  // 只登记画面以内的那部分（位图尖顶饰端盖不按画面边收，伸出画面的部分画不出来，也不占位）
  const F = extra?.frame;
  const clip = (q: Rect): Rect => { if (!F) return q; const x0 = Math.max(q.x, F.x), y0 = Math.max(q.y, F.y), x1 = Math.min(q.x + q.w, F.x + F.w), y1 = Math.min(q.y + q.h, F.y + F.h); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  return out.map(clip).filter((q) => q.w > 0.5 && q.h > 0.5);
}
/**
 * 伸出部分的收集器（compose/hud.ts 画每个屏上元素前打开：ctx = 元素画在的那张画布，base = 那一刻的变换 [a, b, c, d, e, f]）：
 * 饰件按「base 的逆 × 当前变换」换回元素排位的坐标（元素自己的倾斜 / 斜切 / 进场缩放都算进去），画完由 hud.ts 取走登记。没打开时（界面模板、成品缓存的离屏画布、测量）不收
 */
export const ORN_OVH: { ctx: Ctx | null; base: number[]; list: Rect[] } = { ctx: null, base: [1, 0, 0, 1, 0, 0], list: [] };
/** 打开收集器（hud.ts 用）：之后在这张画布上画的饰件伸出部分记进 list */
export function ovhBegin(g: Ctx) { const m = typeof g.getTransform === 'function' ? g.getTransform() : null; ORN_OVH.ctx = m ? g : null; ORN_OVH.base = m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [1, 0, 0, 1, 0, 0]; ORN_OVH.list = []; }
/** 关掉收集器、取走收集到的矩形 */
export function ovhEnd(): Rect[] { const out = ORN_OVH.list; ORN_OVH.ctx = null; ORN_OVH.list = []; return out; }
function overhangOf(g: Ctx, r: Rect, size: number, extra: OrnExtra | undefined, G: OvhGeom) {
  if (ORN.where !== 'hud' || !ORN_OVH.ctx || g !== ORN_OVH.ctx) return;
  const rs = overhangRects(r, size, extra, G);
  if (!rs.length) return;
  const m = g.getTransform(), [a, b, c, d, e, f] = ORN_OVH.base, det = a * d - b * c;
  if (!det) return;
  // 设备坐标 → base 的逆：x' = ( d·(X − e) − c·(Y − f)) / det，y' = (−b·(X − e) + a·(Y − f)) / det
  const back = (x: number, y: number): [number, number] => { const X = m.a * x + m.c * y + m.e - e, Y = m.b * x + m.d * y + m.f - f; return [(d * X - c * Y) / det, (-b * X + a * Y) / det]; };
  for (const q of rs) {
    const ps = [back(q.x, q.y), back(q.x + q.w, q.y), back(q.x, q.y + q.h), back(q.x + q.w, q.y + q.h)], xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    ORN_OVH.list.push({ x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 });
  }
}

/* ---------------- 饰件清单余项（M12b-63，K1 G-ornament-lib） ---------------- */

/** 新饰件（ast.ornaments 的取值）：手账 / 剪贴簿（狗耳、相角、回形针、图钉、和纸胶带、拍立得白边、蝴蝶结）、印章（蜡封）、民间（串旗）、工业（螺丝、格栅）、涂鸦（页边涂鸦）、波浪丝带 */
/**
 * 手画小涂鸦的路径（B10 审查修复 ⑧：页边涂鸦饰件 marginDoodles 与 ast.watermark = doodles 共用，原来两处各写一份）：kind 0 螺旋 / 1 五角星 / 2 箭头 / 3 波浪线，
 * (x, y) = 中心（螺旋 = 起点），d = 半径 / 半长。只建路径（含 beginPath），描边由调用方
 */
export function doodlePath(g: CanvasRenderingContext2D, kind: number, x: number, y: number, d: number) {
  g.beginPath();
  if (kind === 0) for (let t = 0; t <= 24; t++) { const a = t * 0.58, q = (d * t) / 24; if (t) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x, y); }
  else if (kind === 1) for (let t = 0; t <= 10; t++) { const a = -Math.PI / 2 + (t * Math.PI) / 5, q = t % 2 ? d * 0.45 : d; if (t) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  else if (kind === 2) { g.moveTo(x - d, y); g.lineTo(x + d, y); g.moveTo(x + d * 0.45, y - d * 0.5); g.lineTo(x + d, y); g.lineTo(x + d * 0.45, y + d * 0.5); }
  else for (let t = 0; t <= 16; t++) { const xx = x - d + (t / 16) * d * 2, yy = y + Math.sin(t * 1.2) * d * 0.3; if (t) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
}
export const K1_PARTS = ['dogEar', 'photoCorners', 'paperclip', 'pushpin', 'washiTape', 'polaroid', 'bow', 'waxSeal', 'bunting', 'screws', 'grille', 'marginDoodles', 'wavyRibbon'];
/** 画 K1 饰件：size = 装饰尺寸，color = 饰色，gem = 宝石色（蜡封 / 蝴蝶结 / 串旗用，没给时各自的默认） */
function k1Parts(g: Ctx, r: Rect, size: number, color: string, gem: string | undefined, want: (k: string) => boolean) {
  const s = Math.max(6, size);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  // 狗耳：右下角折起一个三角（背面颜色 = 盒子的暗面），折痕一道细线
  if (want('dogEar')) {
    // （不擦掉角外那块：直接画在画布上时 destination-out 会连下面的背景一起擦掉；折起的纸角 + 投影已经读得出）
    const c = Math.min(r.w, r.h) * 0.14, x = r.x + r.w, y = r.y + r.h;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(x - c, y); g.lineTo(x, y - c); g.lineTo(x - c * 0.92, y - c * 0.92); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x - c, y); g.lineTo(x, y - c); g.lineTo(x - c, y - c); g.closePath(); g.fill();
  }
  // 相角：四角各一枚深色三角相角
  if (want('photoCorners')) {
    const c = s * 1.3; g.fillStyle = withAlpha('#1c1c1c', 0.85);
    for (const [x, y, sx, sy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]] as const) { g.beginPath(); g.moveTo(x - sx * 2, y - sy * 2); g.lineTo(x + sx * c, y - sy * 2); g.lineTo(x - sx * 2, y + sy * c); g.closePath(); g.fill(); }
  }
  // 回形针：左上沿夹一枚（两道套着的长圆角线）
  if (want('paperclip')) {
    const x = r.x + Math.min(r.w * 0.18, s * 3), y = r.y - s * 0.9, w = s * 0.7, h = s * 2.6;
    g.strokeStyle = '#9aa3ad'; g.lineWidth = Math.max(1.2, s * 0.14);
    g.beginPath(); g.roundRect(x - w / 2, y, w, h, w / 2); g.stroke(); g.beginPath(); g.roundRect(x - w * 0.28, y + h * 0.18, w * 0.56, h * 0.7, w * 0.28); g.stroke();
  }
  // 图钉：顶边正中一枚（钉帽圆 + 高光 + 投影）
  if (want('pushpin')) {
    const x = r.x + r.w / 2, y = r.y + s * 0.4, rr = s * 0.55, c = gem ?? '#d33a3a';
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + rr * 0.4, y + rr * 0.5, rr, rr * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.3, 0, Math.PI * 2); g.fill();
  }
  // 和纸胶带：左上 / 右上各斜贴一条带斜纹的半透明胶带
  if (want('washiTape')) for (const sx of [-1, 1]) {
    const x = sx < 0 ? r.x + s * 0.8 : r.x + r.w - s * 0.8, y = r.y + s * 0.2, w = s * 3, h = s * 0.8, c = gem ?? '#e9a3b8';
    g.save(); g.translate(x, y); g.rotate(sx * -0.55); g.fillStyle = withAlpha(c, 0.7); g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = withAlpha('#ffffff', 0.55); g.lineWidth = Math.max(1, h * 0.12); g.beginPath(); for (let t = -w / 2; t < w / 2; t += h * 0.6) { g.moveTo(t, h / 2); g.lineTo(t + h * 0.5, -h / 2); } g.stroke(); g.restore();
  }
  // 拍立得白边：盒子外一圈白框、底边加厚
  if (want('polaroid')) {
    const m0 = s * 0.6, mb = s * 2.2; g.fillStyle = '#f7f5ef'; g.beginPath(); g.rect(r.x - m0, r.y - m0, r.w + m0 * 2, r.h + m0 + mb); g.rect(r.x, r.y, r.w, r.h); g.fill('evenodd');
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.strokeRect(r.x - m0, r.y - m0, r.w + m0 * 2, r.h + m0 + mb);
  }
  // 蝴蝶结：顶边正中一个（两片结翼 + 结心 + 两条飘带）
  if (want('bow')) {
    const x = r.x + r.w / 2, y = r.y, c = gem ?? '#c8303c';
    g.fillStyle = c;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * s * 1.4, y - s * 1.1, x + k * s * 1.5, y); g.quadraticCurveTo(x + k * s * 1.4, y + s * 0.9, x, y); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * s * 0.7, y + s * 1.8); g.lineTo(x + k * s * 0.25, y + s * 1.6); g.closePath(); g.fill(); }
    g.fillStyle = mix(c, '#000', 0.25); g.beginPath(); g.arc(x, y, s * 0.35, 0, Math.PI * 2); g.fill();
  }
  // 蜡封：底边正中一枚波边蜡封（上压一圈细线）
  if (want('waxSeal')) {
    const x = r.x + r.w / 2, y = r.y + r.h, rr = s * 0.95, c = gem ?? '#8e1b1b';
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, q = rr * (1 + (i % 2) * 0.08); if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x + q, y); }
    g.closePath(); g.fill(); g.strokeStyle = withAlpha('#000', 0.35); g.lineWidth = Math.max(1, s * 0.08); g.beginPath(); g.arc(x, y, rr * 0.62, 0, Math.PI * 2); g.stroke();
  }
  // 串旗：顶边上方一根下垂的绳 + 一串三角小旗（颜色轮着取宝石色 / 饰色 / 两个暖色；亡灵节的镂空彩纸旗）
  if (want('bunting')) {
    const n = Math.max(4, Math.min(12, Math.round(r.w / (s * 2.2)))), y0 = r.y - s * 0.2, sag = s * 0.9, cols = [gem ?? '#e0457b', color, '#f2b134', '#3fb6a8'];
    const at = (t: number) => [r.x + t * r.w, y0 + Math.sin(t * Math.PI) * sag] as const;
    g.strokeStyle = withAlpha(color, 0.85); g.lineWidth = Math.max(1, s * 0.08); g.beginPath(); for (let i = 0; i <= 24; i++) { const [x, y] = at(i / 24); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < n; i++) { const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n, [x0, y00] = at(t0), [x1, y1] = at(t1), [xm, ym] = at((t0 + t1) / 2); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x0, y00); g.lineTo(x1, y1); g.lineTo(xm, ym + s * 1.3); g.closePath(); g.fill(); }
  }
  // 螺丝：四角各一颗（圆头 + 一字槽）
  if (want('screws')) {
    const rr = Math.max(2.5, s * 0.32), m0 = rr * 2;
    for (const [x, y, a] of [[r.x + m0, r.y + m0, 0.4], [r.x + r.w - m0, r.y + m0, 1.2], [r.x + m0, r.y + r.h - m0, 2.1], [r.x + r.w - m0, r.y + r.h - m0, 0.9]] as const) {
      g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(1, rr * 0.3);
      g.beginPath(); g.moveTo(x - Math.cos(a) * rr * 0.7, y - Math.sin(a) * rr * 0.7); g.lineTo(x + Math.cos(a) * rr * 0.7, y + Math.sin(a) * rr * 0.7); g.stroke();
    }
  }
  // 格栅：右下一组散热格栅（几道圆角长槽）
  if (want('grille')) {
    const w = Math.min(r.w * 0.22, s * 4), x = r.x + r.w - w - s * 0.8, n = 4; g.fillStyle = withAlpha('#000', 0.45);
    for (let i = 0; i < n; i++) { g.beginPath(); g.roundRect(x, r.y + r.h - s * (0.8 + (i + 1) * 0.55), w, s * 0.28, s * 0.14); g.fill(); }
  }
  // 页边涂鸦：沿左右两边几个手画小图案（螺旋 / 星 / 箭头）
  if (want('marginDoodles')) {
    g.strokeStyle = withAlpha(color, 0.75); g.lineWidth = Math.max(1, s * 0.09);
    for (let i = 0; i < 4; i++) {
      const left = i % 2 === 0, x = left ? r.x + s * 0.9 : r.x + r.w - s * 0.9, y = r.y + r.h * (0.25 + i * 0.17), d = s * 0.6;
      doodlePath(g, i % 3, x, y, d);
      g.stroke();
    }
  }
  // 波浪丝带：顶边上一条起伏的丝带（两端剪成燕尾）
  if (want('wavyRibbon')) {
    const w = Math.min(r.w * 0.6, s * 12), x0 = r.x + (r.w - w) / 2, y0 = r.y - s * 0.3, h = s * 0.9, c = gem ?? color;
    g.fillStyle = c; g.beginPath();
    for (let t = 0; t <= 20; t++) { const x = x0 + (t / 20) * w, y = y0 + Math.sin((t / 20) * Math.PI * 3) * s * 0.3; if (t) g.lineTo(x, y); else g.moveTo(x, y); }
    g.lineTo(x0 + w + h * 0.6, y0 + h * 0.5); g.lineTo(x0 + w, y0 + h);
    for (let t = 20; t >= 0; t--) { const x = x0 + (t / 20) * w, y = y0 + h + Math.sin((t / 20) * Math.PI * 3) * s * 0.3; g.lineTo(x, y); }
    g.lineTo(x0 - h * 0.6, y0 + h * 0.5); g.closePath(); g.fill();
  }
  g.restore();
}

/* ---------------- 功能性微字饰件（M12b-48） ---------------- */

/** 微字的固定字号（设计单位 = 11 px@1080p）：贴在面板上的装饰小字，不随文字缩放膨胀（像 e.small 的 fixedSize） */
const MICRO_SIZE = 5.5;
/** 可复现的伪随机（饰件按盒子尺寸取种子，帧间稳定） */
function mrand(seed: number) {
  let t = (seed * 2654435761) >>> 0 || 1;
  return () => { t += 0x6d2b79f5; let z = t; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
}
const HEX = '0123456789ABCDEF';
/** 一行数据噪声：编号 / 版本串 / 坐标 / 序列号（内容包 hud.microText 有就从里面取一行，否则按种子生成；只用 ASCII，字体子集里都有） */
function microLine(R: () => number, own: string[]): string {
  if (own.length && R() < 0.5) return own[Math.floor(R() * own.length)];
  const hex = (n: number) => Array.from({ length: n }, () => HEX[Math.floor(R() * 16)]).join('');
  const d = (n: number) => Array.from({ length: n }, () => Math.floor(R() * 10)).join('');
  switch (Math.floor(R() * 6)) {
    case 0: return `CONN-0x${hex(4)}`;
    case 1: return `SYS v${d(1)}.${d(2)}.${d(3)}`;
    case 2: return `LAT ${Math.floor(R() * 90)}.${d(4)} N  LON ${Math.floor(R() * 180)}.${d(3)} E`;
    case 3: return `ID#${d(6)}-${hex(2)}`;
    case 4: return `BLK ${hex(2)}:${hex(2)}:${hex(2)}`;
    default: return `REF/${hex(3)}-${d(3)}`;
  }
}
/**
 * 数据噪声块（ast.ornaments = microText，cyberpunk-2077#1 / 二次元白卡）：面板四角的 2~4 组小字（编号、条码、坐标、版本串），每组 3~5 行，
 * 组数 / 行数 / 条码出现的概率随 vis.noiseDensity；字色 col.muted、窄体固定小字。短边不到 60 的小盒子不画（格子、按钮不长噪声）。
 * 有刻度侧轨时字往里让开一条轨宽
 */
function drawMicroText(g: Ctx, r: Rect, micro: Ornament['micro'] | undefined, motif: string, railed: boolean) {
  if (Math.min(r.w, r.h) < 60) return;
  const dens = micro?.density ?? 0.5;
  const R = mrand(Math.round(r.w) * 131 + Math.round(r.h) * 17 + motif.length);
  const groups = 2 + Math.round(dens * 2), lines = 3 + Math.round(dens * 2), pad = 5 + (railed ? railW(r) + 2 : 0);
  const corners: [number, number, boolean, boolean][] = [[r.x + pad, r.y + pad, false, false], [r.x + r.w - pad, r.y + r.h - pad, true, true], [r.x + r.w - pad, r.y + pad, true, false], [r.x + pad, r.y + r.h - pad, false, true]];
  for (let k = 0; k < groups; k++) { const [ax, ay, right, bottom] = corners[k]; microBlock(g, ax, ay, right, bottom, lines - (k % 2), micro, R); }
}
/** 一组数据噪声的大小（microBlock 画的范围，屏幕边的噪声块避让 / 登记占位用） */
export const microBlockSize = (lines: number) => ({ w: 64, h: lines * MICRO_SIZE * 1.25 });
/**
 * 一组数据噪声（M12b-48）：(ax, ay) = 这组贴的角（right / bottom = 从右 / 下往里排），lines 行小字，条码行的概率随密度；字色 / 字族 / 密度取 micro（没给时灰色窄体、0.5）。
 * 面板四角（drawMicroText）与屏幕边（compose/hud.ts 的 vis.noiseEdges）共用
 */
export function microBlock(g: Ctx, ax: number, ay: number, right: boolean, bottom: boolean, lines: number, micro: Ornament['micro'] | undefined, R: () => number) {
  const dens = micro?.density ?? 0.5, lh = MICRO_SIZE * 1.25, own = pack().hud.microText ?? [];
  g.save();
  g.font = `500 ${MICRO_SIZE}px ${micro?.font ?? 'sans-serif'}`;
  g.textBaseline = 'top';
  g.textAlign = right ? 'right' : 'left';
  g.fillStyle = micro?.color ?? 'rgba(160,160,160,0.7)';
  const y0 = bottom ? ay - lines * lh : ay;
  for (let i = 0; i < lines; i++) {
    const y = y0 + i * lh;
    // 条码行：一串粗细不一的竖线（密度越高越常见）
    if (R() < 0.18 + dens * 0.25) {
      let x = 0;
      const w = 26 + R() * 18;
      while (x < w) { const bw = 0.5 + Math.floor(R() * 3) * 0.5; g.fillRect(right ? ax - w + x : ax + x, y, bw, MICRO_SIZE); x += bw + 0.5 + Math.floor(R() * 2) * 0.5; }
      continue;
    }
    g.fillText(microLine(R, own), ax, y);
  }
  g.restore();
}
/** 可复现的伪随机（导出给屏幕边的噪声块用同一套） */
export const microRand = (seed: number) => mrand(seed);
/** 刻度侧轨的宽（10~14 px@1080p = 5~7 设计单位，按短边） */
const railW = (r: Rect) => Math.max(5, Math.min(7, Math.min(r.w, r.h) * 0.04));
/** 侧轨条的缓存（长度 / 宽 / 方向 / 颜色 / 材质 / 设备像素密度 → 离屏画布，最多 24 张，最近用的留下）：刻度与竖排小数字一帧不重画 */
const RAILS = new Map<string, HTMLCanvasElement>();
/**
 * 刻度侧轨（ast.ornaments = rulerRail，disco-elysium#0）：沿边（vis.strokeSides 指定的边，没给 = 左右）一条 10~14 px@1080p 的金属轨——轨面金属渐变（或 ast.frameMat 的材质），
 * 每 4 px@1080p 一刻、每 5 刻一长刻、每 20 px@1080p 一个小数字（竖轨上竖排）；整条轨画进缓存画布再贴上（按设备像素密度）。ornamentInsets 给这几条边留出轨宽
 */
function drawRails(g: Ctx, r: Rect, micro: Ornament['micro'] | undefined, mat?: string) {
  const sides = micro?.rail ?? 'lr', w = railW(r), color = micro?.color ?? 'rgba(40,40,40,0.8)', font = micro?.font ?? 'sans-serif';
  for (const sd of ['l', 'r', 't', 'b']) {
    if (!sides.includes(sd)) continue;
    const vert = sd === 'l' || sd === 'r', len = vert ? r.h : r.w;
    const at: Rect = sd === 'l' ? { x: r.x, y: r.y, w, h: r.h } : sd === 'r' ? { x: r.x + r.w - w, y: r.y, w, h: r.h } : sd === 't' ? { x: r.x, y: r.y, w: r.w, h: w } : { x: r.x, y: r.y + r.h - w, w: r.w, h: w };
    const m = g.getTransform(), sc = Math.max(0.5, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1);
    // 键带字体版本（中期审查修复 ㉞：刻度数字用窄体，字体加载前烘的轨原来整个会话都留着回落字）——与 paint.ts 的烘焙缓存同口径（循环引用只在调用时读，安全）
    const key = `${Math.round(len)}|${w.toFixed(2)}|${vert ? 'v' : 'h'}|${sd}|${color}|${mat ?? ''}|${sc.toFixed(3)}|${FONT_EPOCH.v}`;
    let c = RAILS.get(key);
    if (c) { RAILS.delete(key); RAILS.set(key, c); }
    else if (typeof document !== 'undefined') {
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(at.w * sc)); c.height = Math.max(1, Math.ceil(at.h * sc));
      const q = c.getContext('2d');
      if (q) { q.scale(sc, sc); railBody(q, { x: 0, y: 0, w: at.w, h: at.h }, vert, sd, color, font, mat); }
      if (RAILS.size >= 24) RAILS.delete(RAILS.keys().next().value!);
      RAILS.set(key, c);
    }
    if (c) g.drawImage(c, 0, 0, c.width, c.height, at.x, at.y, at.w, at.h);
    else railBody(g, at, vert, sd, color, font, mat);
  }
}
/** 一条轨：轨面 → 刻度 → 小数字（坐标在 a 里，竖轨刻度朝内侧） */
function railBody(q: Ctx, a: Rect, vert: boolean, sd: string, color: string, font: string, mat?: string) {
  q.save();
  if (mat && MATERIAL_BASE[mat]) fillMaterial(q, a.x, a.y, a.w, a.h, mat);
  else {
    const gr = vert ? q.createLinearGradient(a.x, 0, a.x + a.w, 0) : q.createLinearGradient(0, a.y, 0, a.y + a.h);
    gr.addColorStop(0, '#5d6066'); gr.addColorStop(0.45, '#a9adb3'); gr.addColorStop(1, '#4a4d52');
    q.fillStyle = gr; q.fillRect(a.x, a.y, a.w, a.h);
  }
  const len = vert ? a.h : a.w, thick = vert ? a.w : a.h, inner = sd === 'l' || sd === 't';
  q.fillStyle = mix(color, '#000', 0.35);
  for (let i = 0, p = 2; p < len - 1; i++, p += 2) {
    const tl = i % 5 === 0 ? thick * 0.55 : thick * 0.28, o = inner ? thick - tl : 0;
    if (vert) q.fillRect(a.x + o, a.y + p, tl, 0.5); else q.fillRect(a.x + p, a.y + o, 0.5, tl);
  }
  q.font = `600 ${Math.min(MICRO_SIZE, thick * 0.8)}px ${font}`;
  q.fillStyle = mix(color, '#000', 0.5);
  q.textAlign = 'center'; q.textBaseline = 'middle';
  for (let n = 1, p = 10; p < len - 4; n++, p += 10) {
    const s = String(n * 10).padStart(2, '0'), cx = vert ? a.x + thick * (inner ? 0.3 : 0.7) : a.x + p, cy = vert ? a.y + p : a.y + thick * (inner ? 0.3 : 0.7);
    if (vert) { q.save(); q.translate(cx, cy); q.rotate(-Math.PI / 2); q.fillText(s, 0, 0); q.restore(); } else q.fillText(s, cx, cy);
  }
  q.restore();
}
/** 套准十字（ast.ornaments = registration，disco-elysium#33）：内容区四角（内缩 9%）各一个 ⊕ */
function drawRegistration(g: Ctx, r: Rect, color: string) {
  if (Math.min(r.w, r.h) < 40) return;
  const k = Math.max(2.5, Math.min(5, Math.min(r.w, r.h) * 0.025)), ix = r.w * 0.09, iy = r.h * 0.09;
  g.save();
  g.strokeStyle = color; g.lineWidth = 0.6;
  for (const [x, y] of [[r.x + ix, r.y + iy], [r.x + r.w - ix, r.y + iy], [r.x + ix, r.y + r.h - iy], [r.x + r.w - ix, r.y + r.h - iy]]) {
    g.beginPath(); g.arc(x, y, k, 0, Math.PI * 2); g.moveTo(x - k * 1.7, y); g.lineTo(x + k * 1.7, y); g.moveTo(x, y - k * 1.7); g.lineTo(x, y + k * 1.7); g.stroke();
  }
  g.restore();
}

/* ---------------- 饰件占位（M12a-08） ---------------- */

/**
 * 饰件在盒子上的占位：t / r / b / l = 沿整条边的细饰带（角花的横竖臂、位图角件的边带、底边分隔线）向里伸进来多深（含 3 的间隙），内容从这里往里排就不压饰带；
 * corners = 四角的角花（矢量是角上母题符号那一块、括角是两条臂、位图是整片角件）与铆钉；marks = 别的成块饰件（顶边居中的徽章 / 宝石 / 缎带、分隔线中间的符号、
 * 两端的尖顶饰、右上的花枝）。页头的标题 / 关闭钮、底部按钮行避开 corners 与 marks（screen.ts）
 */
export interface OrnamentInsets { t: number; r: number; b: number; l: number; corners: Rect[]; marks: Rect[] }
export const NO_ORNAMENT_INSETS: OrnamentInsets = { t: 0, r: 0, b: 0, l: 0, corners: [], marks: [] };

/**
 * 盒子样式 style 画在 r 上时饰件的占位（M12a-08，规则与 drawOrnaments 同一套几何；不在作用范围里 / 没有饰件时全 0）。
 * at：where = 画在哪（ast.ornamentScope 判断用；主容器面板自带 container 标记）、frame = 画面（顶边饰件下移与 largePanels 判断）。
 * Godot：饰件是 NinePatchRect 角件子节点，t / r / b / l 对应 MarginContainer 的 margin（或 StyleBox 的 content_margin）
 */
export function ornamentInsets(style: BoxStyle, r: Rect, at: { where?: 'hud' | 'screen' | 'container'; frame?: Rect | null } = {}): OrnamentInsets {
  // 顶冠框（ast.frame = crowned / threePart，M12b-50）的顶冠 / 底坠登记成 marks（B4 审查修复：挪进画面后压在盒子里，页头 / 按钮行避开它）——外框不归饰件管，没有饰件也登记
  const crown = style.frame && (style.frame.kind === 'crowned' || style.frame.kind === 'threePart') ? crownGeom(r, at.frame).rects : [];
  const o = style.ornament;
  if (!o || (o.level <= 0 && !o.parts.length) || !ornamentInScope(o.scope, o.container ? 'container' : at.where ?? 'screen', r, at.frame ?? r)) return crown.length ? { ...NO_ORNAMENT_INSETS, corners: [], marks: crown } : NO_ORNAMENT_INSETS;
  const level = o.level, motif = o.motif, parts = o.parts, named = o.named ?? [];
  const m = motif === 'none' || !motif ? 'diamond' : motif;
  const { size, want, art, corners, divider, divY, top, bottom } = geom(r, level, motif, parts, o.dividerAt, { named, minSize: o.minSize, frame: at.frame, dividerPlace: o.dividerPlace });
  const lw = Math.max(1, size * 0.09), GAP = 3;
  const out: OrnamentInsets = { t: 0, r: 0, b: 0, l: 0, corners: [], marks: [...crown] };
  // 饰件挂点与出框量（M12b-49，与 drawOrnaments 同口径）：没列 panelCorners / panelEdges 的不占位；出框时沿边的带少伸进来 0.6 × 尺寸 × 出框量
  const anc = o.anchors, onCorners = !anc || anc.includes('panelCorners'), onEdges = !anc || anc.includes('panelEdges'), out0 = (o.overhang ?? 0) * size * 0.6;
  const band = (side: 't' | 'r' | 'b' | 'l', v: number) => { out[side] = Math.max(out[side], v - out0 + GAP); };
  // 四个角上的矩形（宽 w、高 h，离角 dx / dy），按角镜像；bottom = false 时只有上面两个角
  const atCorner = (w: number, h: number, dx = 0, dy = 0, bottom = true) => {
    const list: Rect[] = [{ x: r.x + dx, y: r.y + dy, w, h }, { x: r.x + r.w - dx - w, y: r.y + dy, w, h }];
    if (bottom) list.push({ x: r.x + dx, y: r.y + r.h - dy - h, w, h }, { x: r.x + r.w - dx - w, y: r.y + r.h - dy - h, w, h });
    return list;
  };
  if (corners && onCorners) {
    if (art('corners') && cornerArt(motif, true) && atlasReady(CORNERS)) {
      // 位图角件：整片 cs × cs（L 形，两条臂约占 30%），四角都有
      const cs = cornerArtSize(r), d = cs * 0.04;
      out.corners.push(...atCorner(cs, cs, -d, -d));
      for (const s0 of ['t', 'r', 'b', 'l'] as const) band(s0, cs * 0.3 - d);
    } else {
      const ov = Math.max(2, size * 0.25), all = level >= 2 || want('corners');
      if (SCROLL_MOTIFS.has(m)) {
        // 卷草角花（M12b-44）：角上一块 + 沿边的带。B4 审查修复：按 scrollCorner 实际画的点量（scrollCornerPts，与 drawOrnaments 同一组臂长 / 调制 / 等级）——
        // 带深 = 角块以外的点离边最深处，角块 = 比带更深的点都包进去的方块（起码原来的 0.75 × 尺寸）
        const o0 = ov - out0, A = Math.max(size * 0.6, Math.min(size * (1.1 + level * 0.45), Math.min(r.w, r.h) / 2 - o0 - 2));
        const P = scrollCornerPts(m, level, A / size, o.mod ?? SCROLL_MOD[m] ?? 0);
        const deep = (c0: number) => P.reduce((d, [x, y]) => (Math.max(x, y) * size > c0 ? Math.max(d, Math.min(x, y) * size) : d), 0);
        let cb = size * 0.75, dp = deep(cb);
        cb = P.reduce((c0, [x, y]) => (Math.min(x, y) * size > dp ? Math.max(c0, Math.max(x, y) * size) : c0), cb);
        dp = deep(cb);
        const c = ov + cb, dep = ov + Math.max(dp, size * 0.2);
        out.corners.push(...atCorner(c, c, 0, 0, all));
        band('t', dep); band('l', dep); band('r', dep); if (all) band('b', dep);
      } else if (m === 'brackets') {
        // 括角：两条臂（长 0.9 × 尺寸、线宽 max(1.5, 0.12 × 尺寸)），角上没有成块的符号
        const bw = Math.max(1.5, size * 0.12), L = size * 0.9;
        out.corners.push(...atCorner(ov + L + bw / 2, ov + bw / 2, 0, 0, all), ...atCorner(ov + bw / 2, ov + L + bw / 2, 0, 0, all));
        band('t', ov + bw / 2); band('l', ov + bw / 2); band('r', ov + bw / 2); if (all) band('b', ov + bw / 2);
      } else {
        // 臂在离边 ov 处（线宽 lw）；角上的母题符号：中心在 ov + 0.18 × 尺寸，半径约 0.45 × 符号大小
        const gs = size * (0.55 + level * 0.12), c = ov + size * 0.18 + gs * 0.45 + lw / 2;
        out.corners.push(...atCorner(c, c, 0, 0, all));
        band('t', ov + lw / 2); band('l', ov + lw / 2); band('r', ov + lw / 2); if (all) band('b', ov + lw / 2);
      }
    }
  }
  if (divider) {
    if (o.dividerAt === undefined) band('b', r.y + r.h - divY + lw / 2);
    // 中间的母题符号（glyph 线型）才占一块；plain 与一整条的印刷线（M12b-45）只算底边的带
    if (o.dividerStyle !== 'plain' && !LINE_DIVIDERS.has(o.dividerStyle ?? '')) { const h = size * 0.32; out.marks.push({ x: r.x + r.w / 2 - h, y: divY - h, w: h * 2, h: h * 2 }); }
  }
  const cx = r.x + r.w / 2, gemArt = atlasReady(GEMS);
  if (onEdges && (level >= 3 || want('badgeBase'))) { const h = art('badgeBase') && gemArt ? clamp(size * 1.8, 18, 56) / 2 : size * 0.62, y = top(h); out.marks.push({ x: cx - h, y: y - h, w: h * 2, h: h * 2 }); }
  if (onCorners && want('rivets')) { const rs = Math.max(8, size * 0.6) * 0.2 + 6; out.corners.push(...atCorner(rs * 1.6, rs * 1.6)); }
  if (onEdges && want('gems')) { const pic = art('gems') && gemArt, h = pic ? clamp(size * 1.1, 12, 32) / 2 : size * 0.31, y = pic ? top(h) : top(h - 2) + 2; out.marks.push({ x: cx - h, y: y - h, w: h * 2, h: h * 2 }); }
  if (onEdges && want('endcaps') && art('endcaps') && gemArt) { const L = clamp(r.h * 0.4, 14, 44); for (const x of [r.x, r.x + r.w - L * 0.15]) out.marks.push({ x, y: r.y + r.h / 2 - L * 0.2, w: L * 0.15, h: L * 0.4 }); }
  if (onEdges && want('finials')) { const fs = finialSize(size), w = fs * 1.3, y0 = top(fs); out.marks.push({ x: cx - w / 2, y: y0 - fs, w, h: fs }, { x: cx - w / 2, y: bottom(fs), w, h: fs }); }
  if (onCorners && !anc?.includes('plateSide') && want('sprigs') && sprigOn(r)) out.marks.push({ x: r.x + r.w - size * 2.3, y: r.y + size * 0.25, w: size * 1.55, h: size * 0.75 });
  // 胶带 / 封印条（M12b-49）：胶带压在上面两个角，封印条垂在底边外
  if (onCorners && want('tape')) out.corners.push(...atCorner(size * 2, size * 1.4, -size * 0.4, -size * 0.4, false));
  if (onEdges && want('sealStrip')) { const x = r.x + Math.min(r.w * 0.22, size * 5); out.marks.push({ x: x - size * 0.7, y: bottom(size * 3.3) - size * 0.3, w: size * 1.4, h: size * 3.6 }); }
  if (onEdges && want('ribbons')) { const w = Math.min(r.w * 0.5, 160), y = top(size * 0.5) - size * 0.5; out.marks.push({ x: cx - w / 2, y, w, h: size * 1.1 }); }
  // 刻度侧轨（M12b-48）：轨所在的边留出轨宽（内容不压轨）；数据噪声块与套准十字是叠在角上的装饰，不占位
  if (want('rulerRail')) { const rw = railW(r), sd = o.micro?.rail ?? 'lr'; for (const k of ['t', 'r', 'b', 'l'] as const) if (sd.includes(k)) band(k, rw); }
  return out;
}
