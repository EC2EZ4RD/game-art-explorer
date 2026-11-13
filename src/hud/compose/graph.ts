/*
 * 图结构生成（M12b-24）：树 / 路线图 / 星图 / 放射树 / 牌阵的节点位置与连线。纯函数（不碰画布、不读参数），
 * 画布（compose/screen.ts 的 network / spreadCards）与 Godot 导出（godotHud.ts 的迁移说明里写出点位）共用，可单测。
 *
 * 坐标是 0–1 的相对位置：树 / 路线 / 星图 / 放射树落在数据区四边各留 26（设计单位）之后的内框里，牌阵是格子中心（grid 给列 / 行数）。
 * 方向 dir：down = 第一层在上、往下长（原来的树）；up = 自下而上（路线图走向 Boss、Frostpunk 科技树）；right / left = 按层分列（Civ6 的时代列）。
 * 分叉 branching：symmetric = 原来的规则（每层在内框里均分，宽层往窄层并）；seeded = 按种子每层 2–6 个、横向错开、相邻层就近连 1–2 条、
 * 每个节点至少一个上家（StS 的路线），确定的（同一种子每帧一样）。
 */

export type FlowDir = 'down' | 'up' | 'right' | 'left';
export const FLOW_DIRS: readonly FlowDir[] = ['down', 'up', 'right', 'left'];
export type GraphKind = 'tree' | 'constellation' | 'radialTree' | 'spread';
/** 牌阵（lay.spread 去掉 auto 的取值表；B8 审查修复 ⑫：test-knowledge 核对两边一致） */
export const SPREADS = ['cross', 'celticCross', 'triangle'] as const;

export interface GraphOpts {
  /** 层数（0 / 不给 = 按节点数推：对称树用 treeLayers，种子分叉每层 2–6 个排到 n 个为止） */
  layers?: number;
  branching?: 'symmetric' | 'seeded';
  /** 内框宽 ÷ 高（放射树按它把圆排圆） */
  aspect?: number;
  /** 牌阵（kind = spread）：cross / celticCross / triangle */
  spread?: string;
  /** 最后一层收成 1 个（路线图的 Boss 节点，lay.rootEmphasis = end） */
  endOne?: boolean;
}

export interface Graph {
  pts: [number, number][];
  pairs: [number, number][];
  /** 每个节点在第几层（星图 = 0；放射树 = 离中心第几圈；牌阵 = 序号） */
  layer: number[];
  nLayers: number;
  /** 根（第一层只有一个节点时是它；放射树的中心）；没有时 -1 */
  root: number;
  /** 终点（最后一层只有一个节点时是它）；没有时 -1 */
  end: number;
  /** 牌阵：每张牌的旋转（度，凯尔特十字的第 2 张横压在第 1 张上）与格子列 / 行数 */
  rot?: number[];
  grid?: { cols: number; rows: number };
}

/** 确定的伪随机（与 screen.ts 的泊松撒点同一个 mulberry32 变体） */
export function graphRng(seed: number): () => number {
  let s = (0x9e3779b9 ^ seed) | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** 字符串 → 种子（内容包 id + 模板，同一屏每帧一样） */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * 树的分层（M12a-10）：第一层 1 个，中间按「宽 − 1 / 宽」交替，余数放最后一层；宽 = 3（12 个以内，12 个时正好是原来的 1-2-3-2-3-1），
 * 节点多了按 √n 加宽，层数不至于拉到看不清
 */
export function treeLayers(n: number): number[] {
  if (n <= 1) return [1];
  const wide = Math.max(3, Math.round(Math.sqrt(n * 0.75)));
  const out = [1];
  let left = n - 1, k = 0;
  while (left > 0) { const w = Math.min(left, k++ % 2 ? wide : wide - 1); if (left - w === 1 && out.length > 1) { out.push(w, 1); left = 0; break; } out.push(w); left -= w; }
  return out;
}

/** 给定层数时把 n 个节点分到 L 层：第一层 1 个，其余均分（余数从中间层起加） */
export function layersOf(n: number, L: number): number[] {
  const L1 = Math.max(1, Math.min(n, Math.round(L)));
  if (L1 === 1) return [n];
  const out = [1], rest = n - 1, per = Math.floor(rest / (L1 - 1));
  let extra = rest - per * (L1 - 1);
  for (let i = 1; i < L1; i++) { const add = extra > 0 && i >= Math.floor((L1 - 1) / 2) ? 1 : 0; extra -= add; out.push(per + add); }
  return out.filter((w) => w > 0);
}

/** 星图的点（相对位置 0~1）与连线：9 个点用原来的固定星座；其余按向日葵螺旋撒点（确定的），每点连向最近的前一个点 */
export function constellationPoints(n: number): { pts: [number, number][]; pairs: [number, number][] } {
  if (n === 9) return { pts: [[0.5, 0.15], [0.3, 0.32], [0.7, 0.3], [0.2, 0.55], [0.42, 0.52], [0.62, 0.55], [0.82, 0.5], [0.33, 0.8], [0.68, 0.82]], pairs: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 8]] };
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = 0.4 * Math.sqrt((i + 0.5) / n), t = i * 2.39996 - Math.PI / 2;
    pts.push([Math.max(0.08, Math.min(0.92, 0.5 + r * Math.cos(t) * 1.05)), Math.max(0.1, Math.min(0.9, 0.5 + r * Math.sin(t) * 0.95))]);
  }
  const pairs: [number, number][] = [];
  for (let i = 1; i < n; i++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < i; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < bd) { bd = d; best = j; } }
    pairs.push([best, i]);
  }
  return { pts, pairs };
}

/** 按方向把（层内位置 u、层位置 v）换成内框里的相对坐标 */
const orient = (u: number, v: number, dir: FlowDir): [number, number] => (dir === 'up' ? [u, 1 - v] : dir === 'right' ? [v, u] : dir === 'left' ? [1 - v, u] : [u, v]);

/** 种子分叉的每层宽度：每层 2–6 个（第一层 2–4），到 n 个为止或排满给定层数；endOne 时最后一层 1 个 */
function seededWidths(n: number, L: number, rnd: () => number, endOne: boolean): number[] {
  const out: number[] = [];
  const pick = (i: number) => (i === 0 ? 2 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 5));
  if (L > 0) { for (let i = 0; i < L; i++) out.push(endOne && i === L - 1 ? 1 : pick(i)); return out; }
  let left = Math.max(1, n - (endOne ? 1 : 0));
  for (let i = 0; left > 0; i++) { const w = Math.min(left, pick(i)); out.push(w); left -= w; }
  if (endOne) out.push(1);
  return out;
}

/**
 * 生成图（M12b-24 §2 的 layoutGraph(kind, n, seed, dir)）：树（对称 / 种子分叉、层数、方向）、星图（原来的固定星座 / 螺旋撒点）、
 * 放射树（中心一个根 + 3–8 根轮辐，第 3 圈起左右分叉）、牌阵（十字 5 张 / 凯尔特十字 10 张 / 三角 3 张；格子坐标）
 */
export function layoutGraph(kind: GraphKind | string, n0: number, seed: number, dir: FlowDir = 'down', o: GraphOpts = {}): Graph {
  const n = Math.max(1, Math.round(n0));
  if (kind === 'constellation') {
    const { pts, pairs } = constellationPoints(n);
    return { pts, pairs, layer: pts.map(() => 0), nLayers: 1, root: -1, end: -1 };
  }
  if (kind === 'spread') return spreadLayout(o.spread ?? 'cross');
  if (kind === 'radialTree') return radialLayout(n, o.aspect ?? 1);
  const rnd = graphRng(seed);
  const seeded = o.branching === 'seeded';
  const widths = seeded ? seededWidths(n, Math.max(0, Math.round(o.layers ?? 0)), rnd, !!o.endOne)
    : o.layers && o.layers > 0 ? layersOf(n, o.layers) : treeLayers(n);
  if (!seeded && o.endOne && widths.length > 1 && widths[widths.length - 1] !== 1) { widths[widths.length - 1] -= 1; if (!widths[widths.length - 1]) widths.pop(); widths.push(1); }
  const L = widths.length;
  const pts: [number, number][] = [], pairs: [number, number][] = [], layer: number[] = [];
  let prevStart = -1, prevN = 0;
  const us: number[] = [];
  widths.forEach((w, li) => {
    // 层位置：第一层 0、最后一层 1（只有一层时居中——原来 0 / 0 是 NaN）
    const v = L > 1 ? li / (L - 1) : 0.5;
    const start = pts.length;
    for (let i = 0; i < w; i++) {
      // 层内均分（原来的写法：(i + 0.5) / 宽）；种子分叉时横向错开（每边至多 0.15 格，相邻两个至少隔 0.7 格——B8 审查修复 ⑯：原来 ±0.275 格，两个点能挤到 0.45 格，节点跟着缩到 0.4）
      const u = seeded && w > 1 ? Math.max(0.02, Math.min(0.98, (i + 0.5) / w + (rnd() - 0.5) * (0.3 / w))) : (i + 0.5) / w;
      us.push(u);
      pts.push(orient(u, v, dir));
      layer.push(li);
    }
    if (prevStart >= 0) {
      if (!seeded) {
        // 对称：原来的连法（第 i 个连上一层按比例对应的那个；上一层更宽时最后一个也连过来）
        for (let i = 0; i < w; i++) { pairs.push([prevStart + Math.min(prevN - 1, Math.floor((i * prevN) / w)), start + i]); if (prevN > w && i === w - 1) pairs.push([prevStart + prevN - 1, start + i]); }
      } else {
        // 种子分叉：上一层每个节点连这一层横向最近的那个，四成概率再连一个相邻的；这一层没有上家的连上一层最近的（路径交错合流、不交叉）。
        // B8 审查修复 ⑲：相邻两层之间的两条线 (a→b)、(c→d) 交叉当且仅当 (u_a − u_c)(u_b − u_d) < 0——最近的那条按层内顺序单调、互不交叉；
        // 多连的那条（四成）等这两层的「最近」都连完再加，压到已有的线就不加；没有上家的从近到远找第一个不交叉的上家（一定有：左右夹着它的两个上家之一）。
        // 随机数的取用次序与原来一样（每个上家一次），层宽、点位不变
        const has = new Array(w).fill(false), mine: [number, number][] = [];
        const near = (u: number) => { let b = 0, bd = Infinity; for (let j = 0; j < w; j++) { const d = Math.abs(us[start + j] - u); if (d < bd) { bd = d; b = j; } } return b; };
        const crosses = (a: number, b: number) => mine.some(([c, d]) => (us[a] - us[c]) * (us[b] - us[d]) < 0);
        const add = (a: number, b: number) => { pairs.push([a, b]); mine.push([a, b]); has[b - start] = true; };
        const extra: [number, number][] = [];
        for (let i = 0; i < prevN; i++) {
          const pu = us[prevStart + i], j = near(pu);
          add(prevStart + i, start + j);
          if (rnd() < 0.4) { const j2 = us[start + j] < pu ? j + 1 : j - 1; if (j2 >= 0 && j2 < w) extra.push([prevStart + i, start + j2]); }
        }
        for (const [a, b] of extra) if (!mine.some(([c, d]) => c === a && d === b) && !crosses(a, b)) add(a, b);
        for (let j = 0; j < w; j++) if (!has[j]) {
          const order = Array.from({ length: prevN }, (_, i) => i).sort((p, q) => Math.abs(us[prevStart + p] - us[start + j]) - Math.abs(us[prevStart + q] - us[start + j]) || p - q);
          const b = order.find((i) => !crosses(prevStart + i, start + j)) ?? order[0];
          add(prevStart + b, start + j);
        }
      }
    }
    prevStart = start; prevN = w;
  });
  return { pts, pairs, layer, nLayers: L, root: widths[0] === 1 ? 0 : -1, end: widths[L - 1] === 1 && L > 1 ? pts.length - 1 : -1 };
}

/** 放射树横向 / 纵向最多拉成多扁的椭圆（B8 审查修复 ⑭：原来内框多宽都画正圆，宽数据区两边大片空着） */
export const RADIAL_MAX_ELLIPSE = 1.6;
/**
 * 放射树的横 / 纵压缩系数（点位 = 0.5 + (宽高比 1 的点位 − 0.5) × 系数，逐轴的线性变换）：圆按短边，内框宽高比超过 1 时横向（不到 1 时纵向）
 * 最多拉长到 RADIAL_MAX_ELLIPSE 倍。Godot 导出写的是宽高比 1 的点位，GraphLayout 按实际内框宽高比乘这两个系数
 */
export function radialSquash(aspect: number): [number, number] {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return a >= 1 ? [Math.min(a, RADIAL_MAX_ELLIPSE) / a, 1] : [1, Math.min(1 / a, RADIAL_MAX_ELLIPSE) * a];
}
/**
 * 放射树：中心 1 个，k = 3–8 根轮辐，每根轮辐沿直线往外排；第 3 圈起交替向两侧分叉（Frostpunk 法典的「轮辐 + 分支」）。
 * B8 审查修复 ⑭：先加轮辐、再加圈（k = (n − 1) ÷ 2 向上取整，原来 ÷ 2.5：13 个节点 5 根 × 3 圈，圈距只有短边的 0.135，节点挤成一团）；内框宽时拉成椭圆（radialSquash）
 */
function radialLayout(n: number, aspect: number): Graph {
  const pts: [number, number][] = [[0.5, 0.5]], pairs: [number, number][] = [], layer = [0];
  if (n <= 1) return { pts, pairs, layer, nLayers: 1, root: 0, end: -1 };
  const k = Math.max(3, Math.min(8, Math.ceil((n - 1) / 2)));
  const depth = Math.ceil((n - 1) / k);
  const [sx, sy] = radialSquash(aspect);
  // 第一圈半径 0.25（原来 0.2：根放大后第一圈与根贴得太近；圈与圈、轮辐与轮辐的间距差不多）
  const R0 = 0.25, step = (0.47 - R0) / Math.max(1, depth - 1);
  const prevOn: number[] = new Array(k).fill(0);
  for (let i = 1; i < n; i++) {
    const s = (i - 1) % k, d = Math.floor((i - 1) / k);
    const branch = d >= 2 ? (d % 2 ? 1 : -1) * 0.28 : 0;
    const t = -Math.PI / 2 + (s * Math.PI * 2) / k + branch, r = depth > 1 ? R0 + d * step : R0 + 0.12;
    pts.push([0.5 + r * Math.cos(t) * sx, 0.5 + r * Math.sin(t) * sy]);
    layer.push(d + 1);
    // 轮辐上的节点连前一个轮辐节点（第一圈连中心）；分叉出去的连它所在轮辐的上一个节点
    pairs.push([prevOn[s], i]);
    if (!branch) prevOn[s] = i;
  }
  return { pts, pairs, layer, nLayers: depth + 1, root: 0, end: -1 };
}

/** 牌阵（格子坐标）：十字 = 中 / 上 / 下 / 左 / 右；凯尔特十字 = 十字 6 张（第 2 张横压在第 1 张上）+ 右侧一列 4 张（自下而上）；三角 = 左下 / 右下 / 上中 */
function spreadLayout(kind: string): Graph {
  const cell = (c: number, r: number, cols: number, rows: number): [number, number] => [(c + 0.5) / cols, (r + 0.5) / rows];
  let cells: [number, number][], rot: number[], cols: number, rows: number;
  if (kind === 'celticCross') {
    cols = 4; rows = 4;
    cells = [[1, 1.5], [1, 1.5], [1, 3], [0, 1.5], [1, 0], [2, 1.5], [3, 3], [3, 2], [3, 1], [3, 0]];
    rot = [0, 90, 0, 0, 0, 0, 0, 0, 0, 0];
  } else if (kind === 'triangle') {
    cols = 2; rows = 2;
    cells = [[0, 1], [1, 1], [0.5, 0]];
    rot = [0, 0, 0];
  } else {
    cols = 3; rows = 3;
    cells = [[1, 1], [1, 0], [1, 2], [0, 1], [2, 1]];
    rot = [0, 0, 0, 0, 0];
  }
  const pts = cells.map(([c, r]) => cell(c, r, cols, rows));
  return { pts, pairs: [], layer: pts.map((_, i) => i), nLayers: 1, root: -1, end: -1, rot, grid: { cols, rows } };
}
