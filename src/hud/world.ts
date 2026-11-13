import type { SceneDesc } from '../engine/scene/types';
import { withAlpha, mix, parseColor } from './material';
import { mapAsset, uiImage } from './uiAssets';

/*
 * 世界里的 UI（docs/ui-hud-plan.md M6）：
 *   兴趣点（POI）：从场景描述自动推导——交互物（宝箱等，按物体编号合并）、光源（灯、窗）、最高的物体（地标）、玩家；
 *   投影：引擎在每帧渲染时用同一台相机（含晃动、像素对齐）、同一组世界弯曲参数、顶点吸附与镜头畸变的反函数，
 *        把 POI 投到画布的 CSS 像素上（engine.projectWorld）；屏幕外的给出方向（屏幕边缘指示用）；
 *   小地图烘焙：按场景的地形高度与物体角色画一张俯视图，画风读 vis.mapStyle（羊皮纸 / 手绘水彩垫手绘羊皮纸位图）；走过的地方记成"已探索"（未探索区压暗）。
 * HUD 绘制时读 worldNow()：挂在世界上的元素（交互提示、敌人血条、飘字、任务标记……）落在投影点上。
 */

/**
 * 兴趣点种类：interact / light / landmark 从图元推导；其余来自场景的 actors（RC8，F 轨道）——
 * enemy / boss 是「目标」（头顶血条、伤害数字挂这里），npc / pickup / objective 是「交互点」（名牌、交互提示挂这里），ally 是友方单位
 */
export type PoiKind = 'interact' | 'light' | 'landmark' | 'enemy' | 'boss' | 'npc' | 'pickup' | 'objective' | 'ally';
export interface Poi { kind: PoiKind; pos: [number, number, number]; id: number; label: string }
/** 算「交互点」的种类（离玩家最近的那个给交互提示 / 名牌） */
export const INTERACT_KINDS: readonly PoiKind[] = ['interact', 'npc', 'pickup', 'objective'];
/** 算「目标」的种类（离画面中心最近的那个给头顶血条 / 伤害数字） */
export const TARGET_KINDS: readonly PoiKind[] = ['boss', 'enemy'];
/** 小地图上的颜色只认三种（HUD 的 combat.ts：交互金色、灯第二强调色、其余红色）：交互类 → interact，友方 → light，敌人 → 红 */
export const mapKindOf = (k: PoiKind): PoiKind => (INTERACT_KINDS.includes(k) ? 'interact' : k === 'ally' ? 'light' : k);

/** derivePois 里 actors 的先后：敌人类在前 */
const ACTOR_RANK: Partial<Record<PoiKind, number>> = { boss: 0, enemy: 1, objective: 2, pickup: 3, npc: 4, ally: 5 };
/** 任务顺序（小地图的兴趣点、任务路线取第一个，审查修复 24）：目标点 → 宝箱等交互物 → 拾取物 → NPC → 敌人 → 友方 → 灯 → 地标 */
const QUEST_RANK: Record<PoiKind, number> = { objective: 0, interact: 1, pickup: 2, npc: 3, boss: 4, enemy: 5, ally: 6, light: 7, landmark: 8 };
export function questOrder<T extends { kind: PoiKind }>(pois: readonly T[]): T[] {
  return pois.map((q, n) => ({ q, n })).sort((a, b) => QUEST_RANK[a.q.kind] - QUEST_RANK[b.q.kind] || a.n - b.n).map((x) => x.q);
}

/**
 * 场景的兴趣点：先放 actors（RC8：场景写明的敌人 / NPC / 拾取物 / Boss / 目标，挂点在头顶），
 * 再放从图元推导的交互物、灯和地标——没有 actors 的场景与原来一样
 */
export function derivePois(desc: SceneDesc): Poi[] {
  const out: Poi[] = [];
  // actors 按种类排（审查修复 24）：敌人 / Boss 在前（HUD 取 world.all 的前几个当「敌人」：攻击顺序编号、锁定），再是目标点 / 拾取物 / NPC，友方最后；同种按场景写的顺序
  const rank = (k: PoiKind) => ACTOR_RANK[k] ?? 9;
  (desc.actors ?? []).slice(0, 24).map((a, n) => ({ a, n })).sort((p, q) => rank(p.a.kind) - rank(q.a.kind) || p.n - q.n)
    .forEach(({ a, n }) => out.push({ kind: a.kind, id: a.id ?? -2000 - n, label: a.label, pos: [a.pos[0], a.pos[1] + a.height, a.pos[2]] }));
  // 交互物：有物体编号的按编号合并；没编号的按距离聚成团（相距 1.6 以内算同一个），取包围盒顶部中心
  const groups: { key: number | null; min: number[]; max: number[]; c: number[] }[] = [];
  let tallest: { id: number; top: number; x: number; z: number } | null = null;
  for (const it of desc.items) {
    const top = it.pos[1] + it.scale[1] / 2;
    if (it.role === 'interactive') {
      const id = it.id ?? null;
      let g = id !== null && id >= 0 ? groups.find((x) => x.key === id) : groups.find((x) => x.key === null && Math.hypot(x.c[0] - it.pos[0], x.c[2] - it.pos[2]) < 1.6);
      if (!g) { g = { key: id !== null && id >= 0 ? id : null, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], c: [...it.pos] }; groups.push(g); }
      for (let i = 0; i < 3; i++) { g.min[i] = Math.min(g.min[i], it.pos[i] - it.scale[i] / 2); g.max[i] = Math.max(g.max[i], it.pos[i] + it.scale[i] / 2); g.c[i] = (g.min[i] + g.max[i]) / 2; }
    }
    if (it.role !== 'cloud' && (!tallest || top > tallest.top)) tallest = { id: it.id ?? -1, top, x: it.pos[0], z: it.pos[2] };
  }
  // 场景写了 actors 时（收尾 X，G §5）：交互物组离某个 actor 不到 0.8 的跳过（同一个东西 actor 已经标好了名字，比如「包裹」，不再多一个交互点）；
  // 剩下的统一叫「交互物」——不知道它是什么，不写死成「宝箱」。没有 actors 的场景照旧（第一个叫「宝箱」）
  const acts = desc.actors ?? [];
  const nearActor = (g: { c: number[] }) => acts.some((a) => Math.hypot(a.pos[0] - g.c[0], a.pos[2] - g.c[2]) < 0.8);
  groups.filter((g) => !acts.length || !nearActor(g)).slice(0, 12).forEach((g, n) => out.push({
    kind: 'interact', id: g.key ?? -1000 - n, label: acts.length ? (n ? `交互物 ${n + 1}` : '交互物') : n ? `交互物 ${n + 1}` : '宝箱', pos: [g.c[0], g.max[1], g.c[2]],
  }));
  desc.lights.slice(0, 6).forEach((l, i) => out.push({ kind: 'light', id: -100 - i, label: '灯', pos: [...l.pos] as [number, number, number] }));
  if (tallest) out.push({ kind: 'landmark', id: tallest.id, label: '地标', pos: [tallest.x, tallest.top, tallest.z] });
  return out;
}

/* ---------------- 投影后的视图（每帧由引擎给 HudSystem） ---------------- */

export interface ScreenPt { x: number; y: number; depth: number; on: boolean; /** 屏幕外时从画面中心指向它的方向（单位向量） */ dir: [number, number]; /** 世界坐标（叙事内 UI 挂板子用） */ wp?: [number, number, number] }
export interface WorldView {
  player: ScreenPt | null;
  /** 离玩家最近的交互物 */
  poi: (ScreenPt & { label: string; dist: number }) | null;
  /** "目标"：离画面中心最近、不是交互物的兴趣点（敌人 / 任务地点的替身） */
  target: (ScreenPt & { label: string }) | null;
  /**
   * 手持物 / 武器（M12a-15，elx.attachTo = held）：场景报了手持物就用它；null = 明确没有（挂在它上面的元素不画）；
   * 不给（undefined，引擎现在不建模手持物）= 用玩家的点
   */
  held?: ScreenPt | null;
  all: (ScreenPt & { kind: PoiKind; label: string })[];
  /** 小地图：底图、玩家与兴趣点在图上的位置（0~1）、朝向 */
  map: { canvas: HTMLCanvasElement; player: [number, number]; pois: { uv: [number, number]; kind: PoiKind }[]; heading: number; explored: Uint8Array; en: number } | null;
  /**
   * 按需烘焙（M12a-30）：世界地图界面按自己的尺寸（a.w × 设备像素比，上限 1024）、画风与颜色单独烘一张（小地图仍是上面那张 160 的），
   * 结果按（场景, 画风, 尺寸, 颜色）缓存；引擎给，没有场景时不给
   */
  bake?: (style: string, size: number, colors?: MapColors) => HTMLCanvasElement;
  /** 参考深度（玩家到相机），"透视"世界渲染用来缩放 */
  refDepth: number;
  /**
   * 场景的格子（战棋棋盘，F 轨道 §9.1）：o = 玩家脚下那一格的中心（贴地，不是胸口的 player 点）；u / v = 沿两条格轴各走一格在画面上的位移（CSS px）；
   * at = o 是第几格，size = 棋盘几乘几。HUD 的移动范围 / 掩体 / 格子高亮按它画就和地面对齐；没有格子的场景不给（undefined）
   */
  grid?: WorldGrid | null;
}

export interface WorldGrid { o: ScreenPt; u: [number, number]; v: [number, number]; at: [number, number]; size: [number, number] }

/** 格子 (i, j) 相对 o 那一格的画面位置（i / j 可以是小数：格角 = ±0.5） */
export const gridPoint = (g: WorldGrid, i: number, j: number): [number, number] => [g.o.x + i * g.u[0] + j * g.v[0], g.o.y + i * g.u[1] + j * g.v[1]];

let WORLD: WorldView | null = null;
export const worldNow = () => WORLD;
export const setWorld = (w: WorldView | null) => { WORLD = w; };

/** 投影点乘 k（M12a-05：HUD 画布按 unitK 缩放、按设计单位排版，HudSystem 用 k = 1 / unitK 把 CSS 像素的投影换成设计单位） */
export function scaleWorld(w: WorldView, k: number): WorldView {
  if (k === 1) return w;
  const p = <T extends ScreenPt>(q: T | null): T | null => (q ? { ...q, x: q.x * k, y: q.y * k } : null);
  const grid = w.grid ? { ...w.grid, o: p(w.grid.o)!, u: [w.grid.u[0] * k, w.grid.u[1] * k] as [number, number], v: [w.grid.v[0] * k, w.grid.v[1] * k] as [number, number] } : w.grid;
  return { ...w, player: p(w.player), poi: p(w.poi), target: p(w.target), ...(w.held !== undefined ? { held: p(w.held) } : {}), all: w.all.map((q) => ({ ...q, x: q.x * k, y: q.y * k })), ...(grid !== undefined ? { grid } : {}) };
}

/** 世界渲染方式下，挂点处元素的缩放（透视：近大远小，夹在 0.5~1.6） */
export function perspectiveScale(depth: number, ref: number) {
  return Math.max(0.5, Math.min(1.6, ref / Math.max(0.1, depth)));
}

/* ---------------- 镜头畸变的反函数（passes.ts LENS 的逆） ---------------- */

/** 输出像素 cc_out 显示的是输入的 cc_in = cc_out·(1 + r²·a·0.35)/(1 + 2a·0.35)。给定物体在输入里的 cc_in，求它出现在哪个 cc_out */
export function lensInverse(cx: number, cy: number, a: number): [number, number] {
  if (a <= 0) return [cx, cy];
  const k = 0.35 * a, t = Math.hypot(cx, cy);
  if (t < 1e-9) return [cx, cy];
  // 半径方向：t·(1+2k) = s + k·s³（单调递增的三次方程），牛顿法解 s
  const c = t * (1 + 2 * k);
  let s0 = t;
  for (let i = 0; i < 20; i++) { const f = k * s0 * s0 * s0 + s0 - c; s0 -= f / (3 * k * s0 * s0 + 1); }
  return [(cx * s0) / t, (cy * s0) / t];
}
export function lensForward(ox: number, oy: number, a: number): [number, number] {
  const k = 0.35 * a, r2 = ox * ox + oy * oy;
  return [(ox * (1 + r2 * k)) / (1 + 2 * k), (oy * (1 + r2 * k)) / (1 + 2 * k)];
}

/* ---------------- 小地图烘焙 ---------------- */

type Pal = Record<string, string>;
/** 地图取色（M12a-30）：底色 + 墨色（col.source = skin 时 bg = col.surface、ink = col.accent2 或 vis.mapInk）；陆地 / 水面由底色的明度阶派生 */
export interface MapColors { bg: string; ink: string }
interface MapStyleColors { bg: string; ink: string; land: (h: number) => string; water: string }
/** 画风的底色与线色（写死的色表只作 auto 默认，M12a-30）：el.minimap 没有场景时的平面图底色也读它 */
export const MAP_STYLE: Record<string, MapStyleColors> = {
  parchment: { bg: '#e8d5a6', ink: '#5a3e1b', land: (h: number) => mix('#e2c993', '#a8834a', h), water: '#c9b48a' },
  tactical: { bg: '#0d1a12', ink: '#4cff8f', land: (h: number) => mix('#163322', '#2e6b45', h), water: '#0a1410' },
  schematic: { bg: '#123a6b', ink: '#cfe6ff', land: (h: number) => mix('#1b4c86', '#2e6fb8', h), water: '#0f2f58' },
  chalk: { bg: '#2b3330', ink: '#f2f2ea', land: (h: number) => mix('#3a4541', '#59665f', h), water: '#25302c' },
  glowSilhouette: { bg: '#06070c', ink: '#5ff3ff', land: () => '#0d1220', water: '#05060a' },
  // M12b-25 的程序画风（见下面的 MAP_STEPS）：底色 / 线色也给没有场景时的小地图平面图用
  linePlan: { bg: '#0b0c0e', ink: '#e9ecef', land: () => '#121418', water: '#0b0c0e' },
  vectorOutline: { bg: '#05070a', ink: '#7fe3ff', land: () => '#05070a', water: '#05070a' },
  hexChart: { bg: '#dccba2', ink: '#5a4a2e', land: (h: number) => mix('#d9c48e', '#a8a06a', h), water: '#9fb6b2' },
  chart: { bg: '#1d1d1b', ink: '#d9d4c2', land: (h: number) => mix('#3d3a2e', '#57513f', h), water: '#2f4f6f' },
  inkTiles: { bg: '#17140f', ink: '#050403', land: (h: number) => mix('#4a4231', '#2f3a28', h), water: '#1d2a30' },
  frostSketch: { bg: '#dfe3e6', ink: '#3e4a55', land: (h: number) => mix('#dfe3e6', '#b9c1c8', h), water: '#c9d0d4' },
  pencil: { bg: '#ece5d3', ink: '#4b4036', land: (h: number) => mix('#ece5d3', '#c8bea8', h), water: '#d9d2c0' },
  desatTerrain: { bg: '#1b1d1c', ink: '#c9c6bd', land: (h: number) => mix('#3b3f3a', '#6b6c64', h), water: '#1e2a30' },
};
/**
 * 程序画风表（M12b-25，G-map-lib）：每个画风 = 底（bg）/ 陆地（land）/ 水面（water）/ 线（walls）/ 记号（marks）五个通道各选一种画法，
 * 大地图（mapView 的按需烘焙）与小地图（el.minimap）共用 bakeMinimap。位图画风（inkTerrain、pixelIllustration、satellite 底图）→ M12c-A6。
 *   land：flat 平涂 / inner 底色压暗的内填（轮廓画风）/ hex 轴向六角格（地形带着色）/ chartRole 按物体类别着色 / turf 地皮暗色贴片 + 噪声 / hatch 按明暗排线 / desat 地形去饱和压暗 / none
 *   walls：edges 陆地边缘检测描线（+ 建筑轮廓）/ glow 只画海岸发光线 / turfEdges 地皮交界墨线 / hexBorders 领土交界的平涂阵营色边 / none
 *   marks：rooms 建筑的并集轮廓（房间框）/ cities 符号化城市方块 / chart 物体按类别实心块 / none
 *   clear：不铺底色（地图外与水面透明，轮廓画风）；paper：纸面画风（纸色 / 线色是画风本身，col.source = skin 不换，见 screen.ts mapColors）
 * R4 回归修复 C4：chalk / glowSilhouette（M12a-30 的轮廓画风）搬进这张表——原来在 bakeMinimap 里逐格 fillRect 描陆地边（台阶）、每个建筑各描一个框；
 * 连续色调的陆地（flat / inner / hatch / desat）每格一个像素画进 N × N 的小画布、平滑放大铺满（原来逐格平涂，大地图上一格 4–8 px 的马赛克）
 */
export interface MapSteps { land: 'none' | 'flat' | 'inner' | 'hex' | 'chartRole' | 'turf' | 'hatch' | 'desat'; water: 'none' | 'flat' | 'hatch'; walls: 'none' | 'edges' | 'glow' | 'turfEdges' | 'hexBorders'; marks: 'none' | 'rooms' | 'cities' | 'chart'; clear?: boolean; paper?: boolean }
export const MAP_STEPS: Record<string, MapSteps> = {
  // 粉笔线稿（Hollow Knight）：暗色内填 + 陆地边与房间的并集轮廓，地图外透明（hollow-knight#27）
  chalk: { land: 'inner', water: 'none', walls: 'edges', marks: 'rooms', clear: true },
  // 发光剪影（Ori）：同上，轮廓带外发光
  glowSilhouette: { land: 'inner', water: 'none', walls: 'glow', marks: 'rooms', clear: true },
  linePlan: { land: 'flat', water: 'none', walls: 'edges', marks: 'rooms' },
  vectorOutline: { land: 'none', water: 'none', walls: 'glow', marks: 'none' },
  hexChart: { land: 'hex', water: 'flat', walls: 'hexBorders', marks: 'cities' },
  chart: { land: 'chartRole', water: 'flat', walls: 'none', marks: 'chart' },
  inkTiles: { land: 'turf', water: 'flat', walls: 'turfEdges', marks: 'none' },
  frostSketch: { land: 'hatch', water: 'hatch', walls: 'edges', marks: 'none', paper: true },
  pencil: { land: 'hatch', water: 'hatch', walls: 'edges', marks: 'none', paper: true },
  desatTerrain: { land: 'desat', water: 'flat', walls: 'none', marks: 'none' },
};
/** 画风串里带的颜色表（chart 的类别色 / hexChart 的阵营色）：`chart|#a,#b,…`——引擎的烘焙缓存键里有画风串，换色会重烘（不改 Engine.ts） */
export const styleBase = (style: string) => style.split('|')[0];
const styleCats = (style: string) => (style.split('|')[1] ?? '').split(',').filter((c) => /^#|^rgb/.test(c));
/** 给了地图取色时的色表：底色 → 陆地按高度往墨色走一点、水面压暗（明度阶派生） */
const colorsStyle = (c: MapColors): MapStyleColors => ({ bg: c.bg, ink: c.ink, land: (h: number) => mix(mix(c.bg, '#fff', 0.06), c.ink, 0.08 + 0.22 * h), water: mix(c.bg, '#000', 0.3) });
/** 不铺底色的画风（chalk / glowSilhouette，M12a-30 的轮廓画风）：地图外透明——世界地图的「虚线出口」遮罩改成从地图上抠掉（screen.ts mapBase，R4 C4） */
export const mapClear = (style: string) => MAP_STEPS[styleBase(style)]?.clear === true;
/** 纸面画风（frostSketch / pencil）：纸色与线色是画风本身（R4 C4，frostpunk#51：col.source = skin 时原来换成面板底色 + 第二强调色，成了近黑底上的红排线） */
export const mapPaper = (style: string) => MAP_STEPS[styleBase(style)]?.paper === true;
/**
 * 线宽（烘焙像素，R4 C4）：walls = 陆地边 / 海岸线、rooms = 房间轮廓、blur = 发光半径。烘焙尺寸按显示尺寸 × 设备像素比取（上限 1024），
 * 一个烘焙像素在 1080p 下约 1–1.9 px，所以线稿画风取固定的 1–2 个烘焙像素（control#33：线宽 1–2 px@1080p；原来按 size / 260 → 1024 的整屏地图上 7 px 粗线）；
 * glowSilhouette 沿用 M12a-30 的粗细与发光（size / 160、size / 200、size / 60）；其余画风照原来
 */
function mapLines(style: string, walls: MapSteps['walls'], size: number): { walls: number; rooms: number; blur: number } {
  if (style === 'linePlan') return { walls: 1.25, rooms: 1.25, blur: 0 };
  if (style === 'chalk') { const w = Math.min(2, Math.max(1, size / 128)); return { walls: w, rooms: w, blur: 0 }; }
  if (style === 'glowSilhouette') return { walls: Math.max(1, size / 160), rooms: Math.max(1, size / 200), blur: Math.max(2, size / 60) };
  return { walls: walls === 'turfEdges' ? Math.max(1, size / 200) : Math.max(1, size / 260), rooms: Math.max(1, size / 360), blur: Math.max(2, size / 50) };
}

const BAKES = new Map<string, HTMLCanvasElement>();
/** 烘焙缓存（M12a-30）：键 = 场景 + 画风 + 尺寸 + 颜色；最多留 6 张（大地图按窗口尺寸烘，拖动窗口时不无限增长） */
export function bakeCached(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  const hit = BAKES.get(key);
  if (hit) { BAKES.delete(key); BAKES.set(key, hit); return hit; }
  const cv = make();
  BAKES.set(key, cv);
  while (BAKES.size > 6) BAKES.delete(BAKES.keys().next().value as string);
  return cv;
}

/** 世界 → 小地图 uv（0~1，x 向右、z 向下） */
export function mapUV(desc: SceneDesc, x: number, z: number): [number, number] {
  const c = desc.bounds.center, r = desc.bounds.radius;
  return [(x - (c[0] - r)) / (2 * r), (z - (c[2] - r)) / (2 * r)];
}

/**
 * 小地图按哪张平面烘（F 轨道 §9.1）：侧视场景（desc.map.plane = 'xy'）换成一份「把 x / y 当成俯视的 x / −z」的代理描述——
 * 实心的格子算陆地、空中算地图外，角色平面附近的图元按侧面投影画上去；俯视的所有画风（平面、羊皮纸、粉笔线稿……）原样可用。没有 map 的场景原样返回
 */
const MAP_PROXY = new WeakMap<SceneDesc, SceneDesc>();
export function mapDesc(desc: SceneDesc): SceneDesc {
  const m = desc.map;
  if (!m) return desc;
  const hit = MAP_PROXY.get(desc);
  if (hit) return hit;
  const cx = (m.x[0] + m.x[1]) / 2, cy = (m.y[0] + m.y[1]) / 2, r = (Math.max(m.x[1] - m.x[0], m.y[1] - m.y[0]) / 2) * 1.04;
  const proxy: SceneDesc = {
    ...desc,
    terrain: undefined, water: undefined, layers: undefined, images: undefined, map: undefined,
    ground: { heightAt: () => 0, inside: (x, z) => x >= m.x[0] && x <= m.x[1] && -z >= m.y[0] && -z <= m.y[1] && m.solidAt(x, -z) },
    items: desc.items.filter((it) => Math.abs(it.pos[2]) < 3).map((it) => ({ ...it, pos: [it.pos[0], 0, -it.pos[1]], scale: [it.scale[0], it.scale[2], it.scale[1]] })),
    lights: desc.lights.map((l) => ({ ...l, pos: [l.pos[0], 0, -l.pos[1]] })),
    bounds: { center: [cx, 0, -cy], radius: r },
  };
  MAP_PROXY.set(desc, proxy);
  return proxy;
}

/** 世界点 → 小地图 uv（侧视场景按 x / y） */
export function mapUVOf(desc: SceneDesc, x: number, y: number, z: number): [number, number] {
  return desc.map ? mapUV(mapDesc(desc), x, -y) : mapUV(desc, x, z);
}

/** 小地图缓存键里的素材部分：羊皮纸底图加载完之前烘焙的是纯程序化版本，加载完（版本号变）要重烘 */
export const minimapArtKey = (style: string) => { const f = mapAsset(style); return f && uiImage(f) ? 1 : 0; };

export function bakeMinimap(desc0: SceneDesc, pal: Pal, style: string, size = 160, colors?: MapColors): HTMLCanvasElement {
  // 侧视场景按 x / y 烘（F 轨道：mapDesc 给一份代理描述；俯视场景原样）
  const desc = mapDesc(desc0);
  // 程序画风表的取值（M12b-25）走 bakeStyled；原来的画风下面逐字不变
  if (MAP_STEPS[styleBase(style)]) return bakeStyled(desc, pal, styleBase(style), size, colors, styleCats(style));
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  const c = desc.bounds.center, rad = desc.bounds.radius;
  const terr = desc.terrain, ground = desc.ground;
  const col = (k: string, d: string) => pal[k] ?? d;
  // 风格的底色与线色（M12a-30：给了 colors 时按它派生——col.source = skin 的地图跟皮肤配色走）
  const st = colors ? colorsStyle(colors) : MAP_STYLE[style];
  // 格数随尺寸走（160 的小地图 80 格；大地图按尺寸加密，上限 256）。轮廓画风 chalk / glowSilhouette 已搬进程序画风表（R4 C4）
  const N = style === 'pixelRooms' ? 40 : Math.max(80, Math.min(256, Math.round(size / 2)));
  const cell = size / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = c[0] - rad + ((i + 0.5) / N) * 2 * rad, z = c[2] - rad + ((j + 0.5) / N) * 2 * rad;
    const inside = terr ? terr.inside(x, z) : ground ? ground.inside(x, z) : Math.hypot(x - c[0], z - c[2]) < rad * 0.9;
    let fill: string;
    if (!inside) fill = st ? st.bg : col('waterDeep', '#2c5d8a');
    else {
      const h = terr ? (terr.heightAt(x, z) - terr.seaY) / Math.max(1e-3, terr.amplitude) : 0.3;
      if (terr && h < 0) fill = st ? st.water : col('water', '#4f8fbf');
      else if (st) fill = st.land(Math.max(0, Math.min(1, h)));
      else fill = h < 0.08 ? col('sand', '#e8d68a') : h < 0.45 ? col('grass', '#7cc45a') : h < 0.75 ? col('highland', '#5c9a48') : h < 0.9 ? col('rock', '#8a8f96') : col('snow', '#f2f4f8');
      if (style === 'satellite' || style === 'diorama' || style === 'painted') {
        // 坡向明暗：向东北的坡亮
        const e = terr ? terr.heightAt(x + 0.3, z - 0.3) - terr.heightAt(x - 0.3, z + 0.3) : 0;
        fill = mix(fill, e > 0 ? '#ffffff' : '#000000', Math.min(0.35, Math.abs(e) * (style === 'diorama' ? 0.9 : 0.5)));
      }
    }
    g.fillStyle = fill;
    g.fillRect(Math.floor(i * cell), Math.floor(j * cell), Math.ceil(cell), Math.ceil(cell));
  }
  // 物体：按角色上色（俯视的小方块 / 圆点）
  for (const it of desc.items) {
    if (it.role === 'cloud') continue;
    const [u, v] = mapUV(desc, it.pos[0], it.pos[2]);
    const w = Math.max(1.5, (it.scale[0] / (2 * rad)) * size), h = Math.max(1.5, (it.scale[2] / (2 * rad)) * size);
    const roleCol = it.role === 'foliage' || it.role === 'foliage2' ? col(it.role, '#3f7a3a') : it.role === 'roof' ? col('roof', '#b5523b') : it.role === 'structure' ? col('structure', '#d9c9a8') : it.role === 'interactive' ? col('interactive', '#e3b341') : null;
    if (!roleCol) continue;
    g.fillStyle = st ? withAlpha(st.ink, it.role.startsWith('foliage') ? 0.35 : 0.8) : roleCol;
    if (it.role.startsWith('foliage')) { g.beginPath(); g.arc(u * size, v * size, Math.max(w, h) / 2, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(u * size - w / 2, v * size - h / 2, w, h);
  }
  // 风格后处理：等高线 / 网格 / 描边
  if (st) {
    g.strokeStyle = withAlpha(st.ink, 0.5);
    g.lineWidth = 1;
    if (style === 'tactical' || style === 'schematic') {
      for (let k = 0; k <= size; k += size / 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, size); g.moveTo(0, k); g.lineTo(size, k); g.stroke(); }
    }
    if (terr) {
      // 海岸线（等高线 0）
      g.beginPath();
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = c[0] - rad + ((i + 0.5) / N) * 2 * rad, z = c[2] - rad + ((j + 0.5) / N) * 2 * rad;
        const a = terr.inside(x, z) && terr.heightAt(x, z) >= terr.seaY;
        const b = terr.inside(x + (2 * rad) / N, z) && terr.heightAt(x + (2 * rad) / N, z) >= terr.seaY;
        if (a !== b) g.rect((i + 1) * cell, j * cell, 1, cell);
      }
      g.fillStyle = st.ink; g.fill();
    }
  }
  // 羊皮纸 / 手绘水彩：场景俯视图提亮（降到约一半不透明度）后与手绘羊皮纸正片叠底——纸的质感 + 和场景一致的形状；底图没加载完时就是上面的程序化版本
  const paper = mapAsset(style);
  const img = paper ? uiImage(paper) : null;
  if (img) {
    g.save();
    g.fillStyle = `rgba(255,255,255,${style === 'parchment' ? 0.45 : 0.4})`; g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = 'multiply';
    // 1024 → 160 的大比例缩小：high 质量采样，免得纸纹闪成噪点（save/restore 会还原）
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const iw = img.naturalWidth, ih = img.naturalHeight, s0 = Math.min(iw, ih);
    g.drawImage(img, (iw - s0) / 2, (ih - s0) / 2, s0, s0, 0, 0, size, size);
    g.restore();
  }
  if (style === 'parchment') { const gr = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(80,50,10,0.35)'); g.fillStyle = gr; g.fillRect(0, 0, size, size); }
  return cv;
}

/** 物体类别（程序画风的采样）：数大的压住数小的 */
const R_FOL = 1, R_STR = 2, R_ROOF = 3, R_INT = 4;
const ROLE_CODE: Record<string, number> = { foliage: R_FOL, foliage2: R_FOL, structure: R_STR, roof: R_ROOF, interactive: R_INT };
/** 确定的格子噪声（0~1） */
const cellHash = (k: number) => { let x = (k + 1) * 2654435761; x ^= x >>> 13; x = Math.imul(x, 1274126177); return ((x >>> 0) % 1000) / 1000; };
/** 去饱和（按亮度往灰走 t）：desatTerrain 用 */
function desat(c: string, t: number): string {
  const [r, gg, b] = parseColor(c), l = Math.round(0.299 * r + 0.587 * gg + 0.114 * b);
  return mix(c, `rgb(${l},${l},${l})`, t);
}
/** 地皮暗色贴片（inkTiles，饥荒）：沙地 / 草地 / 林地 / 岩地 / 植被，按高度带取 */
const TURF = ['#4a4231', '#3a4430', '#2f3a28', '#454340', '#263222'];
/** 六角格的地形带色（hexChart，Civ6 战略视图：羊皮纸调的平涂地形） */
const HEX_TERR = ['#e2cf9c', '#c9c48a', '#aaa86f', '#9b8f76', '#eee8d8'];
/** 六角格的阵营色（hexChart 的领土边界；画风串里给了 `hexChart|#a,#b,#c` 时用它） */
const HEX_TEAMS = ['#2f6db5', '#b8412e', '#3f8f4a'];
/** 类别色块（chart，Factorio 地图视图）：地面 / 植被 / 建筑 / 屋顶 / 交互物；画风串里给了类别色（col.lineColors）时建筑 / 屋顶 / 交互物 / 植被依次换成它 */
const CHART_ROLE = ['#3d3a2e', '#2c4a25', '#7d7d7d', '#9a6a3a', '#d0a73a'];

/**
 * 程序画风（M12b-25）：场景按 N × N 格采样（陆地 / 水 / 归一高度 / 坡向 / 物体类别），按 MAP_STEPS 的通道依次画；底色 / 线色给了地图取色（col.source = skin、vis.mapInk）时按它。
 * 只在烘焙时跑一次（bakeCached 按场景 + 画风串 + 尺寸 + 颜色缓存）
 */
function bakeStyled(desc: SceneDesc, pal: Pal, style: string, size: number, colors: MapColors | undefined, cats: string[]): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  const steps = MAP_STEPS[style], st0 = MAP_STYLE[style];
  const bg = colors?.bg ?? st0.bg, ink = colors?.ink ?? st0.ink;
  const landC = (h: number) => (colors ? mix(mix(bg, '#fff', 0.06), ink, 0.04 + 0.12 * h) : st0.land(h)), waterC = colors ? mix(bg, '#000', 0.3) : st0.water;
  const c = desc.bounds.center, rad = desc.bounds.radius, terr = desc.terrain, ground = desc.ground;
  const col = (k: string, d: string) => pal[k] ?? d;
  const N = Math.max(80, Math.min(256, Math.round(size / 2))), cell = size / N;
  const land = new Uint8Array(N * N), wet = new Uint8Array(N * N), hh = new Float32Array(N * N), slope = new Float32Array(N * N), role = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = c[0] - rad + ((i + 0.5) / N) * 2 * rad, z = c[2] - rad + ((j + 0.5) / N) * 2 * rad, k = j * N + i;
    const inside = terr ? terr.inside(x, z) : ground ? ground.inside(x, z) : Math.hypot(x - c[0], z - c[2]) < rad * 0.9;
    if (!inside) continue;
    const h = terr ? (terr.heightAt(x, z) - terr.seaY) / Math.max(1e-3, terr.amplitude) : 0.3;
    if (terr && h < 0) { wet[k] = 1; continue; }
    land[k] = 1; hh[k] = Math.max(0, Math.min(1, h));
    slope[k] = terr ? terr.heightAt(x + 0.3, z - 0.3) - terr.heightAt(x - 0.3, z + 0.3) : 0;
  }
  for (const it of desc.items) {
    const rc = ROLE_CODE[it.role]; if (!rc) continue;
    const [u, v] = mapUV(desc, it.pos[0], it.pos[2]);
    const hw = Math.max(0.5, (it.scale[0] / (2 * rad)) * N / 2), hd = Math.max(0.5, (it.scale[2] / (2 * rad)) * N / 2);
    for (let j = Math.floor(v * N - hd); j <= Math.floor(v * N + hd); j++) for (let i = Math.floor(u * N - hw); i <= Math.floor(u * N + hw); i++) if (i >= 0 && j >= 0 && i < N && j < N && role[j * N + i] < rc) role[j * N + i] = rc;
  }
  // 底色（clear 的轮廓画风不铺：地图外与水面透明）
  if (!steps.clear) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  // 陆地与水面。连续色调的陆地（flat / inner / hatch / desat，R4 C4，ghost-of-tsushima#31）：每格一个像素画进 N × N 的小画布，再平滑（双线性）放大铺满——
  // 格心落在像素中心，与 isoSegs 的等值线对齐；原来逐格平涂，1024 的整屏地图上一格 4 px（显示约 8 px）的马赛克、海岸一格一格的台阶。
  // 块状的陆地（chartRole 类别色块、turf 地皮贴片的格子噪声）是画风本身，照旧逐格平涂；六角格另画
  const turfOf = (k: number) => (role[k] === R_FOL ? 4 : hh[k] < 0.12 ? 0 : hh[k] < 0.4 ? 1 : hh[k] < 0.7 ? 2 : 3);
  const smooth = steps.land === 'flat' || steps.land === 'inner' || steps.land === 'hatch' || steps.land === 'desat';
  const sm = smooth ? document.createElement('canvas') : null;
  if (sm) sm.width = sm.height = N;
  const gl = sm ? sm.getContext('2d')! : g;
  const rect = sm ? (i: number, j: number) => gl.fillRect(i, j, 1, 1) : (i: number, j: number) => g.fillRect(Math.floor(i * cell), Math.floor(j * cell), Math.ceil(cell), Math.ceil(cell));
  const innerC = mix(bg, '#000', 0.25);
  if (steps.land !== 'hex') for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (wet[k]) { if (steps.water !== 'none') { gl.fillStyle = waterC; rect(i, j); } continue; }
    if (!land[k] || steps.land === 'none') continue;
    const h = hh[k];
    let f: string;
    if (steps.land === 'chartRole') { const rc = role[k]; f = rc === R_FOL ? cats[3] ?? CHART_ROLE[1] : rc === R_STR ? cats[0] ?? CHART_ROLE[2] : rc === R_ROOF ? cats[1] ?? CHART_ROLE[3] : rc === R_INT ? cats[2] ?? CHART_ROLE[4] : landC(h); }
    else if (steps.land === 'turf') f = mix(TURF[turfOf(k)], cellHash(k) > 0.5 ? '#000' : '#fff', Math.abs(cellHash(k) - 0.5) * 0.16);
    else if (steps.land === 'desat') {
      const base = h < 0.08 ? col('sand', '#e8d68a') : h < 0.45 ? col('grass', '#7cc45a') : h < 0.75 ? col('highland', '#5c9a48') : h < 0.9 ? col('rock', '#8a8f96') : col('snow', '#f2f4f8');
      const e = slope[k];
      f = mix(desat(mix(base, e > 0 ? '#fff' : '#000', Math.min(0.35, Math.abs(e) * 0.5)), 0.8), '#000', 0.4);
    } else if (steps.land === 'inner') f = innerC;
    else f = landC(h);
    gl.fillStyle = f; rect(i, j);
  }
  if (sm) { g.save(); g.imageSmoothingEnabled = true; g.drawImage(sm, 0, 0, size, size); g.restore(); }
  // 六角格制图（hexChart，civ6#46）：轴向六角格（尖顶、奇数行右移），格色 = 格心所在的地形带（羊皮纸调），水面一档；
  // 离中心 0.75 半径以内的陆地格按方位分成三块领土（淡染阵营色），领土交界画平涂的阵营色边（往格内缩一点，两边的边并排）；建筑画成符号化的城市方块
  if (steps.land === 'hex') {
    const hr = size / 22, wq = Math.sqrt(3) * hr, rows = Math.ceil(size / (1.5 * hr)) + 1, colsN = Math.ceil(size / wq) + 1;
    const teams = [0, 1, 2].map((t) => cats[t] ?? HEX_TEAMS[t]);
    const team: number[][] = [];
    const ctr = (r: number, q: number): [number, number] => [q * wq + (r % 2 ? wq / 2 : 0), r * 1.5 * hr];
    const hexPath = (x: number, y: number, s = 1) => { g.beginPath(); for (let t = 0; t < 6; t++) { const a = -Math.PI / 2 + (t * Math.PI) / 3; const px = x + Math.cos(a) * hr * s, py = y + Math.sin(a) * hr * s; if (t) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
    for (let r = 0; r < rows; r++) {
      team.push([]);
      for (let q = 0; q < colsN; q++) {
        const [x, y] = ctr(r, q), i = Math.max(0, Math.min(N - 1, Math.floor(x / cell))), j = Math.max(0, Math.min(N - 1, Math.floor(y / cell))), k = j * N + i;
        team[r].push(-1);
        if (!land[k] && !wet[k]) continue;
        let f = wet[k] ? waterC : HEX_TERR[Math.min(4, Math.floor(hh[k] * 5))];
        if (land[k]) {
          const du = x / size - 0.5, dv = y / size - 0.5;
          if (Math.hypot(du, dv) < 0.36) { const tm = Math.floor(((Math.atan2(dv, du) + Math.PI) / (Math.PI * 2)) * 3) % 3; team[r][q] = tm; f = mix(f, teams[tm], 0.16); }
        }
        g.fillStyle = f; hexPath(x, y); g.fill();
        g.strokeStyle = withAlpha(ink, 0.2); g.lineWidth = Math.max(0.6, hr * 0.06); g.stroke();
      }
    }
    g.lineWidth = Math.max(1.5, hr * 0.2); g.lineCap = 'round';
    for (let r = 0; r < rows; r++) for (let q = 0; q < colsN; q++) {
      const tm = team[r][q]; if (tm < 0) continue;
      const [x, y] = ctr(r, q);
      const nb: [number, number][] = r % 2 ? [[r, q - 1], [r, q + 1], [r - 1, q], [r - 1, q + 1], [r + 1, q], [r + 1, q + 1]] : [[r, q - 1], [r, q + 1], [r - 1, q - 1], [r - 1, q], [r + 1, q - 1], [r + 1, q]];
      for (const [rr, qq] of nb) {
        if ((team[rr]?.[qq] ?? -1) === tm) continue;
        const [nx, ny] = ctr(rr, qq), th = Math.atan2(ny - y, nx - x), s = 0.84;
        g.strokeStyle = teams[tm]; g.beginPath();
        g.moveTo(x + Math.cos(th - Math.PI / 6) * hr * s, y + Math.sin(th - Math.PI / 6) * hr * s); g.lineTo(x + Math.cos(th + Math.PI / 6) * hr * s, y + Math.sin(th + Math.PI / 6) * hr * s); g.stroke();
      }
    }
    // 符号化的城市 / 单位：建筑 = 纸色方块 + 墨框 + 屋顶色小点；交互物 = 墨色小圆
    for (const it of desc.items) {
      if (it.role !== 'structure' && it.role !== 'interactive') continue;
      const [u, v] = mapUV(desc, it.pos[0], it.pos[2]), x = u * size, y = v * size, s = Math.max(3, hr * 0.62);
      if (it.role === 'structure') { g.fillStyle = '#f2e8d0'; g.fillRect(x - s / 2, y - s / 2, s, s); g.strokeStyle = ink; g.lineWidth = Math.max(1, hr * 0.1); g.strokeRect(x - s / 2, y - s / 2, s, s); g.fillStyle = col('roof', '#b5523b'); g.fillRect(x - s * 0.18, y - s * 0.18, s * 0.36, s * 0.36); }
      else { g.fillStyle = ink; g.beginPath(); g.arc(x, y, s * 0.3, 0, Math.PI * 2); g.fill(); }
    }
  }
  // 排线（frostSketch / pencil，frostpunk#39）：按块（约 N / 64 格）的明暗排 1–3 层线——背光坡与低处更暗：/ → 再加 \ → 再加横线；水面是稀疏的横线。
  // B10 审查修复 ⑰：每块的线按坡向 + 格哈希各自偏一点角度、长短不一、中心错开，隔行错半块（原来每块一条对角满格的线，整张图拼成固定格的纱窗网）
  if (steps.land === 'hatch') {
    const B = Math.max(2, Math.round(N / 64)), bs = B * cell, lv: number[][] = [[], [], []], wp: number[] = [];
    const BASE = [-Math.PI / 4, Math.PI / 4, 0];
    for (let j = 0; j < N; j += B) for (let i = 0; i < N; i += B) {
      const k = Math.min(N - 1, j + (B >> 1)) * N + Math.min(N - 1, i + (B >> 1)), h0 = cellHash(k), h1 = cellHash(k + 7919), h2 = cellHash(k + 104729);
      const cx = i * cell + bs / 2 + ((j / B) % 2 ? bs / 2 : 0) + (h0 - 0.5) * bs * 0.5, cy = j * cell + bs / 2 + (h1 - 0.5) * bs * 0.5;
      if (wet[k]) { if ((j / B) % 2 === 0) { const L = bs * (0.6 + 0.7 * h2); wp.push(cx - L / 2, cy, cx + L / 2, cy + (h0 - 0.5) * bs * 0.15); } continue; }
      if (!land[k]) continue;
      const light = 0.5 + 0.5 * Math.max(-1, Math.min(1, slope[k] * 1.2)), d = (1 - light) * 0.85 + (1 - hh[k]) * 0.25;
      const tilt = Math.max(-1, Math.min(1, slope[k])) * 0.25 + (h2 - 0.5) * 0.35, L = bs * (0.75 + 0.6 * h0);
      const put = (q: number[], a: number) => { const dx = (Math.cos(a) * L) / 2, dy = (Math.sin(a) * L) / 2; q.push(cx - dx, cy - dy, cx + dx, cy + dy); };
      if (d > 0.3) put(lv[0], BASE[0] + tilt);
      if (d > 0.52) put(lv[1], BASE[1] + tilt);
      if (d > 0.72) put(lv[2], BASE[2] + tilt * 0.6);
    }
    // 一层一条路径（线段按 4 个数一组）
    const strokeSegs = (q: number[]) => { if (!q.length) return; g.beginPath(); for (let t = 0; t < q.length; t += 4) { g.moveTo(q[t], q[t + 1]); g.lineTo(q[t + 2], q[t + 3]); } g.stroke(); };
    g.save(); g.lineWidth = Math.max(0.6, size / 700); g.lineCap = 'round'; g.strokeStyle = withAlpha(ink, 0.5);
    for (const q of lv) strokeSegs(q);
    g.strokeStyle = withAlpha(ink, 0.3); strokeSegs(wp);
    g.restore();
  }
  const LW = mapLines(style, steps.walls, size);
  // 房间（linePlan / chalk / glowSilhouette）：建筑 / 屋顶 / 交互物的占地按格记一张表——描它们并集的外轮廓（isoSegs，一条路径一次描边），
  // 两边都够大的单个建筑再画一道隔墙（分成两间）。R4 C4（control#33）：原来每个物体各描一个框，墙由一排 1 × 1 的墙块拼成时画成一串小方格（梯子）
  if (steps.marks === 'rooms') {
    // 占地按格心取（格心落在物体的俯视框里才算，与陆地的格心采样同一口径）：墙块与地面格正好互补时，墙的内侧轮廓与陆地边是同一条线（不再并排两道）；
    // 小到一个格心都不含的物体记它所在的那一格（照样画一个小记号）。role 表那种多算一圈的占地只给类别色块 / 地皮用
    const room = new Uint8Array(N * N), divs: number[] = [];
    for (const it of desc.items) {
      if (it.role !== 'structure' && it.role !== 'roof' && it.role !== 'interactive') continue;
      const [u, v] = mapUV(desc, it.pos[0], it.pos[2]);
      const cx = u * N, cz = v * N, hw = (it.scale[0] / (2 * rad)) * N / 2, hd = (it.scale[2] / (2 * rad)) * N / 2;
      const i0 = Math.max(0, Math.ceil(cx - hw - 0.5)), i1 = Math.min(N - 1, Math.floor(cx + hw - 0.5)), j0 = Math.max(0, Math.ceil(cz - hd - 0.5)), j1 = Math.min(N - 1, Math.floor(cz + hd - 0.5));
      if (i0 > i1 || j0 > j1) { const i = Math.floor(cx), j = Math.floor(cz); if (i >= 0 && j >= 0 && i < N && j < N) room[j * N + i] = 1; }
      else for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) room[j * N + i] = 1;
      const w = (it.scale[0] / (2 * rad)) * size, h = (it.scale[2] / (2 * rad)) * size;
      if (Math.min(w, h) > size * 0.05) divs.push(u * size + w * 0.05, v * size - h / 2, u * size + w * 0.05, v * size + h / 2);
    }
    const segs = isoSegs(N, cell, (i, j) => room[j * N + i] === 1).concat(divs);
    if (segs.length) {
      g.save(); g.strokeStyle = withAlpha(ink, 0.9); g.lineWidth = LW.rooms; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      for (let t = 0; t < segs.length; t += 4) { g.moveTo(segs[t], segs[t + 1]); g.lineTo(segs[t + 2], segs[t + 3]); }
      g.stroke(); g.restore();
    }
  }
  // 物体：chart 已按格着色，交互物（资源点）再压一块实心亮块
  if (steps.marks === 'chart') for (const it of desc.items) {
    if (it.role !== 'interactive') continue;
    const [u, v] = mapUV(desc, it.pos[0], it.pos[2]);
    const w = Math.max(2, (it.scale[0] / (2 * rad)) * size), h = Math.max(2, (it.scale[2] / (2 * rad)) * size), x = u * size - w / 2, y = v * size - h / 2;
    g.fillStyle = cats[2] ?? CHART_ROLE[4]; g.fillRect(x, y, w, h);
  }
  // 线：陆地边缘（edges / glow）或地皮交界（turfEdges）。B10 审查修复 ⑰ / ⑳：按 marching squares 描成等值线、一条路径一次描边（圆头圆角），
  // 拐角切成斜线——原来逐格 fillRect，斜着的海岸线是台阶，整屏地图放大后 7–15 px 一级；发光轮廓（glow）原来每一小段各带一次 shadowBlur，现在整条一次。
  // 墨块 / 铅笔 / 冰霜素描的线手绘一点：端点按位置抖（相邻线段共用端点，连着抖）、粗细分三档
  if (steps.walls === 'edges' || steps.walls === 'glow' || steps.walls === 'turfEdges') {
    g.save();
    if (steps.walls === 'glow') { g.shadowColor = ink; g.shadowBlur = LW.blur; }
    const lw = LW.walls;
    const hand = style === 'inkTiles' || style === 'pencil' || style === 'frostSketch', jit = hand ? cell * 0.45 : 0;
    g.strokeStyle = steps.walls === 'turfEdges' ? ink : withAlpha(ink, steps.walls === 'glow' ? 0.95 : 0.85);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const strokeSegs = (q: number[], w: number) => {
      if (!q.length) return;
      // 手绘的线粗细分三档（按线段中点的哈希），每档一条路径
      const tiers = hand ? [0.7, 1, 1.35] : [1];
      tiers.forEach((tk, ti) => {
        g.lineWidth = w * tk; g.beginPath();
        for (let t = 0; t < q.length; t += 4) { if (hand && Math.floor(cellHash(Math.round(q[t] + q[t + 2]) * 7349 + Math.round(q[t + 1] + q[t + 3])) * 3) !== ti) continue; g.moveTo(q[t], q[t + 1]); g.lineTo(q[t + 2], q[t + 3]); }
        g.stroke();
      });
    };
    // 地皮交界（细，半宽）：每一类自己的轮廓并成一条路径（两边各描一遍，同一条路径里重叠的只上一次色）
    if (steps.walls === 'turfEdges') {
      let inner: number[] = [];
      for (let c0 = 0; c0 < 5; c0++) inner = inner.concat(isoSegs(N, cell, (i, j) => { const k = j * N + i; return !!land[k] && turfOf(k) === c0; }, jit));
      strokeSegs(inner, lw / 2);
    }
    // 海岸 / 陆地边缘（粗）
    strokeSegs(isoSegs(N, cell, (i, j) => !!land[j * N + i], jit), lw);
    g.restore();
  }
  return cv;
}

/**
 * 等值线（B10 审查修复 ⑰ / ⑳）：N × N 格的格心网格上做 marching squares——inside(i, j) = 这一格在线里面（界外算外面）；返回线段（四个数一组，画布坐标）。
 * 线走相邻两格格心连线的中点（= 格子边界），直的地方与原来逐格画的位置一样，拐角切成 45° 斜线（不再是台阶）；鞍点按「里面的角各自圈开」。
 * jit > 0 时端点按位置哈希错开最多 ±jit / 2（端点是共用的，相邻线段连着抖）
 */
function isoSegs(N: number, cell: number, inside: (i: number, j: number) => boolean, jit = 0): number[] {
  const out: number[] = [];
  const v = (i: number, j: number) => (i >= 0 && j >= 0 && i < N && j < N && inside(i, j) ? 1 : 0);
  // 端点在半格网格上（2x / cell 是整数），按整数坐标哈希抖
  const P = (x: number, y: number): [number, number] => {
    if (!jit) return [x, y];
    const ix = Math.round((x * 2) / cell), iy = Math.round((y * 2) / cell);
    return [x + (cellHash(ix * 4099 + iy * 7) - 0.5) * jit, y + (cellHash(iy * 4099 + ix * 13 + 1) - 0.5) * jit];
  };
  const seg = (a: [number, number], b: [number, number]) => { const p = P(a[0], a[1]), q = P(b[0], b[1]); out.push(p[0], p[1], q[0], q[1]); };
  for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
    const k = v(i, j) * 8 + v(i + 1, j) * 4 + v(i + 1, j + 1) * 2 + v(i, j + 1);
    if (k === 0 || k === 15) continue;
    const T: [number, number] = [(i + 1) * cell, (j + 0.5) * cell], R: [number, number] = [(i + 1.5) * cell, (j + 1) * cell];
    const B: [number, number] = [(i + 1) * cell, (j + 1.5) * cell], L: [number, number] = [(i + 0.5) * cell, (j + 1) * cell];
    switch (k) {
      case 1: case 14: seg(L, B); break;
      case 2: case 13: seg(B, R); break;
      case 3: case 12: seg(L, R); break;
      case 4: case 11: seg(T, R); break;
      case 6: case 9: seg(T, B); break;
      case 7: case 8: seg(L, T); break;
      case 5: seg(T, R); seg(L, B); break;
      case 10: seg(L, T); seg(B, R); break;
    }
  }
  return out;
}

/** 已探索区：网格，玩家走过的格子周围一圈标记为已探索 */
export class ExploredMask {
  readonly n = 32;
  cells = new Uint8Array(32 * 32);
  reset() { this.cells.fill(0); }
  mark(u: number, v: number, r = 4) {
    const cx = Math.floor(u * this.n), cy = Math.floor(v * this.n);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r) continue;
      const x = cx + i, y = cy + j;
      if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.cells[y * this.n + x] = 1;
    }
  }
}
