import { withAlpha } from './material';
import type { ElCtx } from './elements/core';

/*
 * 连线库（M12b-24，§2 的 drawConnector）：节点图的连线（vis.connector）、主体 → 插槽组 / 兴趣点 → 地名的引线（cmp.leader）、
 * 出牌指向的 V 形链（el.crosshair = aimArrow + vis.connector@el.crosshair = chevronChain）都走这里，screen.ts 不再各写一段。
 *   原来的七种（straight / curve / dashed / string / circuit / beam / brush）：画法、颜色、线宽与原来逐字一样（一组连线一次 save / restore）；
 *   elbow = 先沿主方向走一半再拐直角（圆角）的折线（ITB 面板到预览的折角线）；chevronChain = 沿二次贝塞尔排一串 V 形 + 末端大箭头（StS 出牌指向）；
 *   orbit = 绕图中心的虚线弧（星图 / 放射树的轨道）；progress = 已走段强调色实线、未走段次要色虚线（Cult 的路线）。
 * 每条线的附加量：vis.connectorProgress（progress 的已走比例，auto = 按节点完成 / 当前）、vis.connectorWeight = byValue（线宽按值 1–4）、
 * vis.connectorTint = bySign（正 = 好色、负 = 坏色，关系图的好感 / 敌对）。
 * Godot：Line2D（width、default_color、joint_mode）+ Curve2D（曲线 / 贝塞尔）；虚线与 V 形链 = Line2D 平铺纹理（texture_mode = TILE）或 _draw() 逐段画。
 */

export type Pt = [number, number];
/** 已实现的连线画法（vis.connector 去掉 auto 的取值表；B8 审查修复 ⑫：test-knowledge 核对两边一致） */
export const CONNECTOR_STYLES = ['straight', 'curve', 'dashed', 'string', 'circuit', 'beam', 'brush', 'elbow', 'chevronChain', 'orbit', 'progress'] as const;
/** 原来就有的七种（一组连线共用一套描边状态，调用序列与 M12b 之前一样） */
const LEGACY = new Set(['straight', 'curve', 'dashed', 'string', 'circuit', 'beam', 'brush', 'auto', '']);

export interface EdgeInfo {
  /** 这条线算「已走」（progress：两端都完成，或完成 → 当前） */
  walked?: boolean;
  /** 0–1 的值（vis.connectorWeight = byValue 的线宽） */
  value?: number;
  /** 正负（vis.connectorTint = bySign 的颜色） */
  sign?: number;
}

export interface ConnOpts {
  /** 图中心（orbit 绕它画） */
  center?: Pt;
  /** 每条线的附加量（与 pairs 一一对应） */
  edges?: EdgeInfo[];
  /** 按值定线宽 / 按正负着色（vis.connectorWeight / Tint 的取值） */
  weight?: string;
  tint?: string;
  /** 颜色（不给时按画法：红绳 #c0392b、光束强调色、其余字色 45%） */
  color?: string;
  /** 尺寸系数（版面缩放） */
  k?: number;
}

/** 一条线的路径（不 beginPath / stroke）：曲线向下弯 20、电路先横后竖再横、折线沿主方向拐直角（圆角 6k）、轨道绕中心 */
function edgePath(g: CanvasRenderingContext2D, a: Pt, b: Pt, kind: string, o: ConnOpts) {
  const [x0, y0] = a, [x1, y1] = b, k = o.k ?? 1;
  g.moveTo(x0, y0);
  if (kind === 'curve' || kind === 'string') g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 20, x1, y1);
  else if (kind === 'circuit') { g.lineTo((x0 + x1) / 2, y0); g.lineTo((x0 + x1) / 2, y1); g.lineTo(x1, y1); }
  else if (kind === 'elbow') {
    const rr = Math.min(6 * k, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2);
    if (Math.abs(y1 - y0) >= Math.abs(x1 - x0)) { const my = (y0 + y1) / 2; g.arcTo(x0, my, x1, my, rr); g.arcTo(x1, my, x1, y1, rr); g.lineTo(x1, y1); }
    else { const mx = (x0 + x1) / 2; g.arcTo(mx, y0, mx, y1, rr); g.arcTo(mx, y1, x1, y1, rr); g.lineTo(x1, y1); }
  } else if (kind === 'orbit' && o.center) {
    // 两点到中心的半径与角度插值：同一圈上是圆弧，不同圈之间是一段螺线（取 16 段折线）
    const [cx, cy] = o.center, r0 = Math.hypot(x0 - cx, y0 - cy), r1 = Math.hypot(x1 - cx, y1 - cy);
    const t0 = Math.atan2(y0 - cy, x0 - cx);
    let dt = Math.atan2(y1 - cy, x1 - cx) - t0;
    if (dt > Math.PI) dt -= Math.PI * 2; if (dt < -Math.PI) dt += Math.PI * 2;
    if (r0 < 1 || r1 < 1) { g.lineTo(x1, y1); return; }
    for (let i = 1; i <= 16; i++) { const f = i / 16, r = r0 + (r1 - r0) * f, t = t0 + dt * f; g.lineTo(cx + r * Math.cos(t), cy + r * Math.sin(t)); }
  } else g.lineTo(x1, y1);
}

/** 原来的描边状态（screen.ts connector() 的写法，逐字搬过来） */
function legacyLook(g: CanvasRenderingContext2D, e: ElCtx, kind: string) {
  g.strokeStyle = kind === 'string' ? '#c0392b' : kind === 'beam' ? withAlpha(e.accent, 0.9) : withAlpha(e.text, 0.45);
  g.lineWidth = kind === 'beam' ? 3 : kind === 'brush' ? 4 : 2;
  if (kind === 'dashed') g.setLineDash([6, 5]);
  if (kind === 'beam') { g.shadowColor = e.accent; g.shadowBlur = 10; }
}

/**
 * 一组连线（节点图）：pairs 是节点序号对。原来的七种、没有逐条附加量时调用序列与 M12b 之前的 connector() 逐字一样；
 * 其余画法 / 有附加量时每条线自己定颜色与线宽（仍在同一个 save / restore 里）
 */
export function drawConnectors(e: ElCtx, pts: Pt[], pairs: [number, number][], kind0: string, o: ConnOpts = {}) {
  const g = e.g, kind = kind0 || 'straight';
  const perEdge = !LEGACY.has(kind) || (o.weight === 'byValue') || (o.tint === 'bySign') || !!o.color;
  g.save();
  if (!perEdge) {
    legacyLook(g, e, kind);
    for (const [i, j] of pairs) { g.beginPath(); edgePath(g, pts[i], pts[j], kind, o); g.stroke(); }
    g.restore();
    return;
  }
  if (kind === 'chevronChain') {
    pairs.forEach(([i, j], n) => chevronChain(g, pts[i], pts[j], edgeColor(e, kind, o, n), (o.k ?? 1) * 7, false));
    g.restore();
    return;
  }
  const base = LEGACY.has(kind) ? kind : kind === 'progress' ? 'straight' : kind;
  pairs.forEach(([i, j], n) => {
    const ed = o.edges?.[n] ?? {};
    g.save();
    if (LEGACY.has(kind)) legacyLook(g, e, kind);
    else { g.strokeStyle = withAlpha(e.text, 0.45); g.lineWidth = 2; }
    if (kind === 'progress') {
      if (ed.walked) { g.strokeStyle = e.accent; g.lineWidth = 3; }
      else { g.strokeStyle = withAlpha(e.muted, 0.85); g.lineWidth = 2; g.setLineDash([5, 5]); }
    }
    if (kind === 'orbit') g.setLineDash([3, 4]);
    if (kind === 'elbow') { g.lineJoin = 'round'; g.lineWidth = 1.5; }
    const c = edgeColor(e, kind, o, n);
    if (o.color || o.tint === 'bySign') g.strokeStyle = c;
    if (o.weight === 'byValue') g.lineWidth = 1 + 3 * Math.max(0, Math.min(1, ed.value ?? 0.5));
    g.beginPath(); edgePath(g, pts[i], pts[j], base, o); g.stroke();
    g.restore();
  });
  g.restore();
}

/** 一条线的颜色：调用方给的 → 按正负（好 / 坏色）→ 画法的默认色 */
function edgeColor(e: ElCtx, kind: string, o: ConnOpts, n: number): string {
  if (o.tint === 'bySign') { const s = o.edges?.[n]?.sign ?? 1; return s < 0 ? e.bad : e.good; }
  if (o.color) return o.color;
  return kind === 'chevronChain' ? e.accent : kind === 'string' ? '#c0392b' : kind === 'beam' ? withAlpha(e.accent, 0.9) : withAlpha(e.text, 0.45);
}

/**
 * V 形链（StS 出牌指向，slay-the-spire#13）：从 a 沿二次贝塞尔（控制点在中点往「上」抬 0.35 × 距离）弧向 b，每隔 2.2 × size 一枚 V 形（朝前进方向），
 * 末端一枚 1.8 倍的实心箭头；bigHead = false 时末端也是普通 V 形（节点图里一段段的链）
 */
export function chevronChain(g: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, size: number, bigHead = true) {
  const [x0, y0] = a, [x1, y1] = b, d = Math.hypot(x1 - x0, y1 - y0);
  if (d < size) return;
  const cx = (x0 + x1) / 2 + (y1 - y0) * 0.18, cy = (y0 + y1) / 2 - Math.abs(x1 - x0) * 0.35 - d * 0.05;
  const at = (t: number): [number, number, number] => {
    const u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
    return [x, y, Math.atan2(dy, dx)];
  };
  const n = Math.max(2, Math.floor(d / (size * 2.2)));
  g.save();
  g.fillStyle = color; g.strokeStyle = withAlpha('#000', 0.45); g.lineWidth = 1;
  // 一条链的所有 V 形（连同末端大箭头）算好旋转后的顶点、并进一条路径，最后一次填 + 一次描（B8 审查修复 ㉓：原来每枚 save / translate / rotate / fill / stroke / restore，
  // 30 层的路线图一帧上千次）
  const poly = (x: number, y: number, ang: number, vs: [number, number][]) => {
    const c = Math.cos(ang), sn = Math.sin(ang);
    vs.forEach(([px, py], k) => { const X = x + px * c - py * sn, Y = y + px * sn + py * c; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.closePath();
  };
  g.beginPath();
  // 有大箭头时 V 形排到 1 − 1.6 × size / 弧长 为止，末端留给箭头
  const tEnd = bigHead ? Math.max(0.5, 1 - (size * 2.4) / d) : 1;
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * tEnd, [x, y, ang] = at(t), s = size * (0.75 + 0.25 * t);
    if (bigHead && i === n) break;
    poly(x, y, ang, [[s * 0.5, 0], [-s * 0.5, -s * 0.7], [-s * 0.15, 0], [-s * 0.5, s * 0.7]]);
  }
  if (bigHead) { const [x, y, ang] = at(1); poly(x, y, ang, [[size * 0.6, 0], [-size * 1.4, -size * 1.3], [-size * 0.8, 0], [-size * 1.4, size * 1.3]]); }
  g.fill(); g.stroke();
  g.restore();
}

/**
 * 单条连线（面板 → 预览的折角线、引线的线身）：自己 save / restore。B8 里还没有调用方——留给 B9 · 17 的多块独立面板之间的折角线（into-the-breach#9 / #22 的简报面板 ↔ 棋盘预览，
 * 进度记录「B8 审查修复 ⑫」）；test-knowledge 有单测
 */
export function drawConnector(e: ElCtx, a: Pt, b: Pt, kind: string, o: ConnOpts & { width?: number; dash?: number[] } = {}) {
  const g = e.g;
  if (kind === 'chevronChain') { chevronChain(g, a, b, o.color ?? e.accent, (o.k ?? 1) * 7); return; }
  g.save();
  g.strokeStyle = o.color ?? withAlpha(e.text, 0.6);
  g.lineWidth = o.width ?? 1.5;
  g.lineJoin = 'round';
  if (o.dash) g.setLineDash(o.dash);
  g.beginPath(); edgePath(g, a, b, kind === 'progress' ? 'straight' : kind, o); g.stroke();
  g.restore();
}

/** 引线的线身 / 端头（cmp.leader / cmp.leaderEnd 去掉 auto 的取值表；B8 审查修复 ⑫：test-knowledge 核对两边一致） */
export const LEADER_KINDS = ['none', 'straight', 'curve', 'elbow'] as const;
export const LEADER_ENDS = ['dot', 'bracket', 'none'] as const;

/**
 * 引线（cmp.leader，G-leader-dataviz）：起点（主体的部位点 / 兴趣点）一枚小圆、线身直线 / 三次曲线（先水平离开再弯向终点）/ 直角折线，
 * 终点按 cmp.leaderEnd 画实心圆点或一对短括号（括住终点所在的那条边）；颜色调用方给（插槽组 = 强调色，cyberpunk-2077#11 的红引线）
 */
export function drawLeader(e: ElCtx, from: Pt, to: Pt, kind: string, end: string, color: string, k = e.k) {
  if (kind === 'none' || !kind) return;
  const g = e.g, [x0, y0] = from, [x1, y1] = to;
  g.save();
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(1, 1.5 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0);
  if (kind === 'curve') { const mx = (x0 + x1) / 2; g.bezierCurveTo(mx, y0, mx, y1, x1, y1); }
  else if (kind === 'elbow') { const mx = x0 + (x1 - x0) * 0.6; g.lineTo(mx, y0); g.lineTo(mx, y1); g.lineTo(x1, y1); }
  else g.lineTo(x1, y1);
  g.stroke();
  // 起点小圆（空心）
  g.beginPath(); g.arc(x0, y0, 3 * k, 0, Math.PI * 2); g.stroke();
  if (end === 'dot') { g.beginPath(); g.arc(x1, y1, 2.6 * k, 0, Math.PI * 2); g.fill(); }
  else if (end === 'bracket') {
    const s = 6 * k, dir = x1 >= x0 ? 1 : -1;
    g.beginPath(); g.moveTo(x1 + dir * s * 0.6, y1 - s); g.lineTo(x1, y1 - s); g.lineTo(x1, y1 + s); g.lineTo(x1 + dir * s * 0.6, y1 + s); g.stroke();
  }
  g.restore();
}
