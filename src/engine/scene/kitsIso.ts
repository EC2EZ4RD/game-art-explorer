import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';
import type { Item } from './types';

/*
 * 技术补全 G（等距与 2.5D）的套件：悬空底座、按格合并的地面、等距小城的房子 / 商店 / 高楼 / 公园 / 工地、
 * 小人、火灾、运河与桥。都是带颜色角色的图元，换配方（光滑 / 低模 / 体素、色板、描边、像素化）照常生效。
 * 只给 scenes/iso.ts 用；不改 kits.ts / kits2.ts / kits2d.ts / prims.ts。
 */

/** 0~1 的格哈希（同一格每次一样，不吃 rng 的序列） */
export const hash2 = (i: number, j: number, k = 0) => ((Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453) % 1 + 1) % 1;

/** 从数组里按 0~1 的值挑一个 */
export const pick = <T>(xs: readonly T[], t: number): T => xs[Math.min(xs.length - 1, Math.floor(t * xs.length))];

/**
 * 按格贪心合并的矩形：同一种区域的格子合并成尽量少的矩形（区域内部没有接缝线，区域交界才有边）。
 * skip(t) = true 的格不出矩形（底座本身就是那种区域）
 */
export function mergeRects<T>(W: number, D: number, at: (i: number, j: number) => T, skip: (t: T) => boolean): { i: number; j: number; w: number; d: number; t: T }[] {
  const used = new Uint8Array(W * D);
  const out: { i: number; j: number; w: number; d: number; t: T }[] = [];
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const t = at(i, j);
    if (skip(t) || used[j * W + i]) continue;
    let w = 1;
    while (i + w < W && at(i + w, j) === t && !used[j * W + i + w]) w++;
    let d = 1;
    grow: while (j + d < D) { for (let k = 0; k < w; k++) if (at(i + k, j + d) !== t || used[(j + d) * W + i + k]) break grow; d++; }
    for (let jj = j; jj < j + d; jj++) for (let ii = i; ii < i + w; ii++) used[jj * W + ii] = 1;
    out.push({ i, j, w, d, t });
  }
  return out;
}

/**
 * 悬空底座的剖面（SimCity 2000 / 微缩模型的「切开的地块」）：顶上一层草皮，下面土层、一道碎石带、岩层，
 * 底下挂几块倒锥形的岩石（浮岛）。x0..x1 × z0..z1 是这一块的范围，top = 草皮顶面，soilTo = 土层下沿，
 * turf = 草皮厚度（0 = 没有草皮，比如运河底下那一截）。同一个物体编号：地层之间只有颜色变化，没有描边接缝
 */
export function dioramaBlock(items: Item[], id: number, x0: number, x1: number, z0: number, z1: number, top: number, opts: { turf?: number; soilTo?: number; rockTo?: number; turfRole?: Role } = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const turf = opts.turf ?? 0.22, soilTo = opts.soilTo ?? -1.25, rockTo = opts.rockTo ?? -2.7;
  const box = (y0: number, y1: number, role: Role) => { if (y1 - y0 > 1e-3) items.push({ prim: 'box', args: [0], pos: [cx, (y0 + y1) / 2, cz], scale: [w, y1 - y0, d], role, id, flat: true }); };
  if (turf > 0) box(top - turf, top, opts.turfRole ?? 'grass');
  box(Math.max(soilTo + 0.18, -9), top - turf, 'soil');
  box(soilTo, soilTo + 0.18, 'stone');
  box(rockTo, soilTo, 'rock');
}

/** 底座下面挂的岩块（浮岛的底）：在 [x0,x1]×[z0,z1] 底面下撒倒锥 */
export function islandUnderside(items: Item[], id: number, x0: number, x1: number, z0: number, z1: number, y: number, rng: Rng, n = 9) {
  const w = x1 - x0, d = z1 - z0;
  items.push({ prim: 'pyramid', pos: [(x0 + x1) / 2, y - 1.6, (z0 + z1) / 2], rot: [Math.PI, 0, 0], scale: [w * 0.92, 3.2, d * 0.92], role: 'rock', id });
  for (let k = 0; k < n; k++) {
    const x = x0 + w * (0.15 + 0.7 * rng()), z = z0 + d * (0.15 + 0.7 * rng()), s = 1.6 + rng() * 2.4;
    items.push({ prim: 'pyramid', pos: [x, y - s * 0.55, z], rot: [Math.PI, rng() * 1.5, 0], scale: [s, s * (1 + rng() * 0.8), s * 0.9], role: k % 3 ? 'rock' : 'soil', id });
  }
}

/* ======================== 小城的建筑 ======================== */

/** 墙面的颜色角色（暖白、纸色、沙色、石色、木色轮换，色板换了照样有区分） */
export const WALLS: Role[] = ['structure', 'paper', 'sand', 'stone', 'wood'];
export const ROOFS: Role[] = ['roof', 'trim', 'metal', 'roof'];

/**
 * 住宅：墙身 + 人字屋顶（ridgeX = 屋脊沿 x）+ 门 + 窗 + 烟囱。门开在 door 指的那一面（'+x' / '+z' / '-x' / '-z'）。
 * floors 层，每层高 0.85；窗户夜里亮（发光体）的只有一部分
 */
export function house(b: B, w: number, d: number, floors: number, wall: Role, roof: Role, door: '+x' | '+z' | '-x' | '-z', ridgeX: boolean, rng: Rng, steep = 1) {
  const h = floors * 0.85 + 0.15;
  b.box(0, 0, 0, w, 0.14, d, 'stone', { args: [0.05] });
  b.box(0, 0.12, 0, w - 0.08, h - 0.12, d - 0.08, wall, { args: [0.06] });
  const rh = (ridgeX ? d : w) * 0.55 * steep;
  b.add('wedge', 0, h + rh / 2, 0, (ridgeX ? d : w) + 0.24, rh, (ridgeX ? w : d) + 0.18, roof, { ry: ridgeX ? Math.PI / 2 : 0 });
  // 门与窗：只开在看得见的两面（+x、+z）和门那一面
  const face = (f: '+x' | '+z' | '-x' | '-z', fn: (u: number, y: number, du: number, dh: number, role: Role) => void) => {
    const len = f === '+x' || f === '-x' ? d : w;
    const n = Math.max(1, Math.round(len / 0.55));
    for (let fl = 0; fl < floors; fl++) for (let k = 0; k < n; k++) {
      const u = -len / 2 + (k + 0.5) * (len / n);
      if (f === door && fl === 0 && k === Math.floor(n / 2)) { fn(u, 0.12, 0.3, 0.55, 'wood'); continue; }
      if (k % 2 === 1 && n > 2) continue;
      fn(u, 0.42 + fl * 0.85, 0.2, 0.24, rng() < 0.14 ? 'emissive' : 'glass');
    }
  };
  for (const f of new Set<'+x' | '+z' | '-x' | '-z'>(['+x', '+z', door])) {
    face(f, (u, y, du, dh, role) => {
      const o = role === 'wood' ? 0.035 : 0.025;
      if (f === '+x') b.box(w / 2 - 0.04 + o, y, u, 0.04, dh, du, role, { noOutline: role !== 'wood' });
      else if (f === '-x') b.box(-w / 2 + 0.04 - o, y, u, 0.04, dh, du, role, { noOutline: role !== 'wood' });
      else if (f === '+z') b.box(u, y, d / 2 - 0.04 + o, du, dh, 0.04, role, { noOutline: role !== 'wood' });
      else b.box(u, y, -d / 2 + 0.04 - o, du, dh, 0.04, role, { noOutline: role !== 'wood' });
    });
  }
  if (rng() < 0.7) b.box((ridgeX ? 0.25 : 0.3) * w, h + rh * 0.3, (ridgeX ? -0.25 : 0.1) * d, 0.16, rh * 0.75, 0.16, 'stone', { args: [0.1] });
}

/** 商店：平顶 + 女儿墙 + 条纹雨篷 + 招牌 + 大玻璃橱窗（橱窗朝 front） */
export function shop(b: B, w: number, d: number, floors: number, wall: Role, awning: Role, front: '+x' | '+z') {
  const h = floors * 0.9 + 0.2;
  b.box(0, 0, 0, w, h, d, wall, { args: [0.04] });
  b.box(0, h, 0, w + 0.06, 0.14, d + 0.06, 'trim', { args: [0.05] });
  const fx = front === '+x';
  const len = fx ? d : w;
  // 橱窗 + 门
  const fw = (u: number, y: number, du: number, dh: number, role: Role, o = 0.02) => (fx ? b.box(w / 2 + o, y, u, 0.04, dh, du, role, { noOutline: true, args: [0] }) : b.box(u, y, d / 2 + o, du, dh, 0.04, role, { noOutline: true, args: [0] }));
  fw(-len * 0.18, 0.12, len * 0.5, 0.52, 'glass');
  fw(len * 0.3, 0.05, 0.28, 0.62, 'wood', 0.03);
  // 雨篷：斜着挑出去的一片，红白条
  const n = Math.max(3, Math.round(len / 0.22));
  for (let k = 0; k < n; k++) {
    const u = -len / 2 + (k + 0.5) * (len / n);
    const role = k % 2 ? 'paper' : awning;
    if (fx) b.add('box', w / 2 + 0.2, 0.86, u, 0.46, 0.04, len / n, role, { rz: -0.45, noOutline: true, args: [0] });
    else b.add('box', u, 0.86, d / 2 + 0.2, len / n, 0.04, 0.46, role, { rx: 0.45, noOutline: true, args: [0] });
  }
  // 招牌
  if (fx) b.box(w / 2 + 0.04, h - 0.32, 0, 0.05, 0.22, len * 0.7, 'sand', { args: [0.1] });
  else b.box(0, h - 0.32, d / 2 + 0.04, len * 0.7, 0.22, 0.05, 'sand', { args: [0.1] });
  if (floors > 1) for (let k = 0; k < 2; k++) fw(-len * 0.25 + k * len * 0.5, 1.22, 0.3, 0.32, 'glass');
  // 屋顶的空调外机
  b.box(-w * 0.2, h + 0.14, -d * 0.15, 0.32, 0.2, 0.24, 'metal', { args: [0.1] });
}

/**
 * 写字楼：主体 + 退台（setback）+ 横向窗带（只贴看得见的两面）+ 屋顶的水箱 / 天线。
 * 窗带夜里有一部分亮
 */
export function tower(b: B, w: number, d: number, h: number, wall: Role, rng: Rng) {
  const tiers = h > 4.5 ? 2 : 1;
  let y = 0, tw = w, td = d;
  for (let t = 0; t < tiers; t++) {
    const th = t === 0 ? (tiers === 2 ? h * 0.62 : h) : h * 0.38;
    b.box(0, y, 0, tw, th, td, wall, { args: [0.03] });
    // 竖向的玻璃窗带（只贴看得见的 +x / +z 两面）：几条整的长条比一层层的小窗更干净，像素化后读得出「高楼」而不是一片噪点
    const cols = Math.max(2, Math.round(tw / 0.42));
    for (let c = 0; c < cols; c++) {
      const u = -0.5 + (c + 0.5) / cols;
      const lit = rng() < 0.12;
      b.box(tw / 2 + 0.012, y + 0.22, u * td, 0.03, th - 0.42, (td / cols) * 0.34, lit ? 'emissive' : 'glass', { noOutline: true, args: [0] });
      b.box(u * tw, y + 0.22, td / 2 + 0.012, (tw / cols) * 0.34, th - 0.42, 0.03, rng() < 0.12 ? 'emissive' : 'glass', { noOutline: true, args: [0] });
    }
    // 每三层一道横向的楼板线
    for (let f = 1; f * 1.6 < th - 0.4; f++) {
      b.box(tw / 2 + 0.02, y + f * 1.6, 0, 0.04, 0.08, td, wall, { noOutline: true, args: [0] });
      b.box(0, y + f * 1.6, td / 2 + 0.02, tw, 0.08, 0.04, wall, { noOutline: true, args: [0] });
    }
    y += th;
    b.box(0, y, 0, tw + 0.08, 0.08, td + 0.08, 'trim', { args: [0.04] });
    y += 0.08;
    tw *= 0.7; td *= 0.7;
  }
  if (rng() < 0.6) { b.cyl(-tw * 0.15, y, -td * 0.1, 0.22, 0.38, 'wood', 1); b.add('cylinder', -tw * 0.15, y + 0.46, -td * 0.1, 0.5, 0.16, 0.5, 'wood', { args: [0] }); }
  else b.box(0, y, 0, tw * 0.5, 0.3, td * 0.5, 'metal', { args: [0.1] });
  b.cyl(tw * 0.25, y, td * 0.2, 0.025, 0.9 + rng() * 0.6, 'metal');
  b.ball(tw * 0.25, y + 1.0, td * 0.2, 0.05, 0.05, 0.05, 'accent', { noOutline: true, args: [0] });
}

/** 树：圆冠（阔叶）或锥冠（针叶），s ≈ 高度 */
export function tree(b: B, s: number, kind: 'round' | 'cone', rng: Rng) {
  b.add('cylinder', 0, s * 0.22, 0, s * 0.12, s * 0.44, s * 0.12, 'trunk', { args: [0.7] });
  if (kind === 'round') {
    b.ball(0, s * 0.62, 0, s * 0.34, s * 0.32, s * 0.34, 'foliage', { sway: 0.3 });
    if (rng() < 0.6) b.ball(s * 0.12, s * 0.8, -s * 0.06, s * 0.22, s * 0.2, s * 0.22, 'foliage', { sway: 0.35 });
  } else {
    b.add('cylinder', 0, s * 0.62, 0, s * 0.52, s * 0.62, s * 0.52, 'foliage2', { args: [0], sway: 0.3 });
    b.add('cylinder', 0, s * 0.92, 0, s * 0.36, s * 0.42, s * 0.36, 'foliage2', { args: [0], sway: 0.4 });
  }
}

/** 小人（市民 / 村民）：身子 + 头 + 两条腿，高约 0.85 × s，朝 +z */
export function citizen(b: B, s: number, shirt: Role, hair: Role = 'trim') {
  for (const x of [-0.07, 0.07]) b.box(x * s, 0, 0, 0.1 * s, 0.32 * s, 0.11 * s, 'characterAccent', { args: [0.3] });
  b.add('cylinder', 0, 0.48 * s, 0, 0.3 * s, 0.34 * s, 0.22 * s, shirt, { args: [0.8] });
  b.ball(0, 0.75 * s, 0, 0.12 * s, 0.13 * s, 0.12 * s, 'skin');
  b.ball(0, 0.81 * s, -0.02 * s, 0.13 * s, 0.09 * s, 0.13 * s, hair);
}

/** 公园长椅（沿 x） */
export function bench(b: B) {
  b.box(0, 0.18, 0, 0.7, 0.05, 0.22, 'wood', { args: [0.2] });
  b.box(0, 0.25, -0.1, 0.7, 0.22, 0.04, 'wood', { args: [0.2] });
  for (const x of [-0.28, 0.28]) b.box(x, 0, 0, 0.05, 0.18, 0.2, 'metal');
}

/** 路灯（高 1.5）：灯头发光 */
export function lamp(b: B, h = 1.5) {
  b.cyl(0, 0, 0, 0.035, h, 'metal');
  b.box(0.12, h - 0.06, 0, 0.3, 0.05, 0.06, 'metal');
  b.box(0.24, h - 0.16, 0, 0.12, 0.1, 0.12, 'emissive', { noOutline: true, args: [0] });
}

/** 火灾（城建的灾害 = 敌人）：房顶冒出的火苗 + 黑烟 */
export function fire(b: B, s = 1) {
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3, r = k ? 0.18 * s : 0;
    b.add('cylinder', Math.cos(a) * r, (0.28 + (k ? 0 : 0.12)) * s, Math.sin(a) * r, 0.24 * s, (0.56 + (k ? 0 : 0.3)) * s, 0.24 * s, k % 2 ? 'accent' : 'emissive', { args: [0], noOutline: true, sway: 0.6 });
  }
  b.ball(0.1 * s, 1.15 * s, -0.05 * s, 0.32 * s, 0.26 * s, 0.32 * s, 'ink', { noOutline: true, args: [0] });
  b.ball(0.32 * s, 1.55 * s, -0.12 * s, 0.4 * s, 0.3 * s, 0.4 * s, 'ink', { noOutline: true, args: [0] });
  b.ball(0.62 * s, 1.95 * s, -0.2 * s, 0.46 * s, 0.3 * s, 0.42 * s, 'cloud', { noOutline: true, args: [0] });
}

/** 工地（城建的「在这里建」= 目标点）：地基坑 + 脚手架 + 塔吊 */
export function construction(b: B, w: number, d: number) {
  b.box(0, 0, 0, w, 0.08, d, 'soil', { noOutline: true, args: [0] });
  b.box(0, 0.08, 0, w * 0.75, 0.6, d * 0.75, 'stone', { args: [0.02] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(sx * w * 0.36, 0.68, sz * d * 0.36, 0.06, 1.2, 0.06, 'sand');
  b.box(0, 1.3, d * 0.36, w * 0.78, 0.05, 0.06, 'sand');
  b.box(w * 0.36, 1.3, 0, 0.06, 0.05, d * 0.78, 'sand');
  // 塔吊
  b.box(-w * 0.3, 0, -d * 0.3, 0.16, 3.6, 0.16, 'sand', { args: [0] });
  b.box(-w * 0.3 + 0.7, 3.6, -d * 0.3, 2.4, 0.12, 0.12, 'sand', { args: [0] });
  b.box(-w * 0.3 - 0.55, 3.45, -d * 0.3, 0.4, 0.3, 0.3, 'stone');
  b.box(-w * 0.3 + 1.6, 2.6, -d * 0.3, 0.02, 1.0, 0.02, 'ink', { noOutline: true, args: [0] });
  b.box(-w * 0.3 + 1.6, 2.45, -d * 0.3, 0.3, 0.16, 0.3, 'wood');
}

/** 小船（运河里） */
export function rowboat(b: B, len = 1.1) {
  b.add('wedge', 0, 0.1, 0, 0.42, 0.22, len, 'wood', { rz: Math.PI });
  b.box(0, 0.12, 0, 0.36, 0.04, len * 0.7, 'trim', { noOutline: true, args: [0] });
}

/* ======================== 等距地牢（Hades / Diablo） ======================== */

/**
 * 地牢的墙段（沿 x，长 len、厚 0.5）：墙身 + 每 2 米一根壁柱（柱头、柱础）+ 顶上一道檐口。
 * tall = true 是后墙（高 3.2，柱间开拱形壁龛、挂旗）；false 是前面切低的矮墙（0.5 高，像剖面）
 */
export function dungeonWall(b: B, len: number, tall: boolean, rng: Rng, opts: { banner?: Role; niches?: boolean } = {}) {
  const h = tall ? 3.2 : 0.5, t = 0.5;
  b.box(0, 0, 0, len, h, t, 'structure', { args: [0.02] });
  b.box(0, h, 0, len + 0.12, tall ? 0.22 : 0.12, t + 0.14, 'stone', { args: [0.05] });
  if (!tall) {
    // 矮墙顶上的垛口
    for (let x = -len / 2 + 0.5; x < len / 2 - 0.2; x += 1) b.box(x, h + 0.12, 0, 0.5, 0.2, t, 'stone', { args: [0.05] });
    return;
  }
  const n = Math.max(1, Math.round(len / 2));
  for (let k = 0; k <= n; k++) {
    const x = -len / 2 + (k / n) * len;
    b.box(x, 0, t / 2 + 0.08, 0.42, h, 0.2, 'stone', { args: [0.04] });
    b.box(x, 0, t / 2 + 0.1, 0.56, 0.3, 0.28, 'stone', { args: [0.05] });
    b.box(x, h - 0.32, t / 2 + 0.1, 0.56, 0.3, 0.28, 'stone', { args: [0.05] });
  }
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + ((k + 0.5) / n) * len;
    if (opts.niches !== false && rng() < 0.55) {
      // 拱形壁龛（深色的凹进去一块 + 半圆拱顶）
      b.box(x, 0.9, t / 2 + 0.005, 0.7, 1.1, 0.02, 'ink', { noOutline: true, args: [0] });
      b.add('cylinder', x, 2.0, t / 2 + 0.005, 0.7, 0.02, 0.7, 'ink', { rx: Math.PI / 2, noOutline: true, args: [1] });
      b.box(x, 0.86, t / 2 + 0.04, 0.82, 0.08, 0.1, 'stone');
      if (rng() < 0.5) b.add('cylinder', x, 1.12, t / 2 - 0.04, 0.22, 0.38, 0.22, 'soil', { args: [0.6] });
    } else if (opts.banner) {
      // 垂旗：一长条布 + 下端燕尾 + 旗杆
      b.box(x, 2.85, t / 2 + 0.06, 0.84, 0.06, 0.06, 'trim');
      b.box(x, 1.2, t / 2 + 0.05, 0.64, 1.62, 0.03, opts.banner, { noOutline: true, args: [0] });
      b.add('pyramid', x, 1.08, t / 2 + 0.05, 0.64, 0.36, 0.03, opts.banner, { rz: Math.PI, noOutline: true, args: [0] });
      b.ball(x, 2.3, t / 2 + 0.08, 0.14, 0.14, 0.02, 'emissive', { noOutline: true, args: [0] });
    }
  }
}

/**
 * 地板：每格一块石板（留 0.06 的缝，下面是深色的垫层 = 灰缝），整间一个物体编号（缝靠深度出线，不按块出线）。
 * 房间 [x0,x1]×[z0,z1]，cell 格大小；pattern(i, j) 给某一格换颜色角色（中间的圆形纹样）
 */
export function flagstones(items: Item[], id: number, x0: number, x1: number, z0: number, z1: number, cell: number, pattern: (i: number, j: number) => Role | null, foundation = 2.6) {
  const w = x1 - x0, d = z1 - z0;
  items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, -0.06, (z0 + z1) / 2], scale: [w, 0.12, d], role: 'ink', id, flat: true, noOutline: true });
  // 地基：上面一截石层（剖面读得出是一块石台），再往下是和深渊同色的墨色（Hades：石台边缘下面就是黑暗）
  const slab = Math.min(0.7, foundation);
  items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, -0.12 - slab / 2, (z0 + z1) / 2], scale: [w, slab, d], role: 'rock', id: id + 1, flat: true });
  if (foundation > slab) items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, -0.12 - slab - (foundation - slab) / 2, (z0 + z1) / 2], scale: [w - 0.02, foundation - slab, d - 0.02], role: 'ink', id: 1, flat: true, noOutline: true });
  const ni = Math.round(w / cell), nj = Math.round(d / cell);
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const role = pattern(i, j) ?? (hash2(i + x0, j + z0, 3) < 0.18 ? 'rock' : 'stone');
    items.push({ prim: 'box', args: [0.08], pos: [x0 + (i + 0.5) * cell, 0.04, z0 + (j + 0.5) * cell], scale: [cell - 0.07, 0.08, cell - 0.07], role, id, flat: true, noOutline: true });
  }
}

/** 石柱：柱础 + 柱身 + 柱头（broken = 断柱，顶上是碎口） */
export function pillar(b: B, h: number, broken = false) {
  b.box(0, 0, 0, 0.9, 0.3, 0.9, 'stone', { args: [0.06] });
  b.cyl(0, 0.3, 0, 0.32, broken ? h * 0.55 : h - 0.6, 'structure', 0.92);
  if (broken) { b.add('poly', 0.05, 0.3 + h * 0.55, 0, 0.62, 0.34, 0.6, 'structure', { args: [1] }); b.add('poly', 0.6, 0.15, 0.4, 0.5, 0.3, 0.42, 'structure', { args: [1], ry: 0.6 }); return; }
  b.box(0, h - 0.3, 0, 0.8, 0.14, 0.8, 'stone', { args: [0.05] });
  b.box(0, h - 0.16, 0, 0.96, 0.16, 0.96, 'stone', { args: [0.05] });
}

/** 火盆：三条腿 + 浅盆 + 火苗（发光） */
export function brazierIso(b: B, s = 1) {
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; b.add('cylinder', Math.cos(a) * 0.2 * s, 0.35 * s, Math.sin(a) * 0.2 * s, 0.06 * s, 0.72 * s, 0.06 * s, 'metal', { rz: Math.cos(a) * 0.25, rx: -Math.sin(a) * 0.25 }); }
  b.add('cylinder', 0, 0.76 * s, 0, 0.7 * s, 0.18 * s, 0.7 * s, 'metal', { args: [1.4] });
  b.add('cylinder', 0, 1.02 * s, 0, 0.42 * s, 0.5 * s, 0.42 * s, 'emissive', { args: [0], noOutline: true, sway: 0.5 });
  b.add('cylinder', 0.08 * s, 0.98 * s, 0.06 * s, 0.26 * s, 0.34 * s, 0.26 * s, 'accent', { args: [0], noOutline: true, sway: 0.6 });
}

/** 尖刺陷阱：一块深色铁板 + 3×3 个孔（up = 刺伸出来） */
export function spikeTrap(b: B, size: number, up: boolean) {
  b.box(0, 0, 0, size, 0.1, size, 'metal', { args: [0.08], flat: true });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = (i - 1) * size * 0.28, z = (j - 1) * size * 0.28;
    if (up) b.add('pyramid', x, 0.1 + 0.24, z, 0.12, 0.48, 0.12, 'metal');
    else b.box(x, 0.1, z, 0.1, 0.01, 0.1, 'ink', { noOutline: true, args: [0], flat: true });
  }
}

/** 地牢的小怪（游魂 / 骷髅兵）：兜帽长袍 + 发光眼 + 一把弯刀，高约 1.1 */
export function wretch(b: B, robe: Role = 'accent') {
  b.add('cylinder', 0, 0.42, 0, 0.66, 0.84, 0.56, robe, { args: [0.45] });
  b.ball(0, 0.9, 0.02, 0.24, 0.24, 0.24, robe);
  b.add('pyramid', 0, 1.12, -0.04, 0.3, 0.3, 0.3, robe, { rx: -0.3 });
  b.ball(0, 0.9, 0.14, 0.15, 0.13, 0.1, 'ink', { noOutline: true, args: [0] });
  b.ball(-0.06, 0.92, 0.22, 0.035, 0.03, 0.02, 'emissive', { noOutline: true, args: [0] });
  b.ball(0.06, 0.92, 0.22, 0.035, 0.03, 0.02, 'emissive', { noOutline: true, args: [0] });
  b.add('box', 0.36, 0.62, 0.18, 0.06, 0.62, 0.1, 'metal', { rx: 0.5, rz: -0.2 });
  b.box(0.36, 0.3, 0.06, 0.12, 0.06, 0.12, 'trim');
}

/** 出口门（下一间的门，上面悬着奖励的图标）：石拱门框 + 发光的门洞 + 门楣上的圆徽 */
export function rewardDoor(b: B, w = 1.8, h = 2.6, reward: Role = 'interactive') {
  for (const s of [-1, 1]) b.box(s * (w / 2 + 0.2), 0, 0, 0.4, h, 0.7, 'stone', { args: [0.05] });
  b.box(0, h, 0, w + 0.8, 0.5, 0.7, 'stone', { args: [0.05] });
  b.box(0, 0, 0.05, w, h, 0.06, 'emissive', { noOutline: true, args: [0] });
  b.box(0, 0, 0.1, w * 0.12, h * 0.96, 0.04, 'ink', { noOutline: true, args: [0] });
  b.ball(0, h + 0.95, 0.3, 0.36, 0.36, 0.12, reward);
  b.ball(0, h + 0.95, 0.38, 0.2, 0.2, 0.06, 'emissive', { noOutline: true, args: [0] });
}

/** 陶罐（可打碎的道具） */
export function urn(b: B, s = 1, role: Role = 'soil') {
  b.ball(0, 0.26 * s, 0, 0.24 * s, 0.26 * s, 0.24 * s, role);
  b.add('cylinder', 0, 0.54 * s, 0, 0.22 * s, 0.14 * s, 0.22 * s, role, { args: [1.3] });
}

/**
 * 地面镶嵌的圆徽（Hades 大厅地上的金色纹样）：两道细圆环 + 八道放射线 + 圆心一块强调色。
 * 贴在地面上方一点点（薄片，不描外壳），r = 外环半径
 */
export function floorSeal(b: B, r: number, ring: Role = 'trim', core: Role = 'accent') {
  b.add('torus', 0, 0.09, 0, r * 2, r * 2, 0.02, ring, { rx: Math.PI / 2, args: [0.035], noOutline: true, flat: true });
  b.add('torus', 0, 0.09, 0, r * 1.36, r * 1.36, 0.02, ring, { rx: Math.PI / 2, args: [0.045], noOutline: true, flat: true });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add('box', Math.cos(a) * r * 0.5, 0.088, Math.sin(a) * r * 0.5, r * 0.62, 0.012, k % 2 ? 0.06 : 0.12, ring, { ry: -a, noOutline: true, args: [0], flat: true });
  }
  b.add('cylinder', 0, 0.09, 0, r * 0.5, 0.016, r * 0.5, core, { noOutline: true, args: [1], flat: true });
  b.add('pyramid', 0, 0.1, 0, r * 0.26, 0.02, r * 0.26, ring, { ry: Math.PI / 4, noOutline: true, args: [0], flat: true });
}

/* ======================== 错觉塔（纪念碑谷） ======================== */

/** 墙面上的拱门浮雕（朝 +z）：一块矩形 + 半圆顶，宽 w、总高 h，贴在墙面外 0.02 */
export function archRelief(b: B, w: number, h: number, role: Role) {
  b.box(0, 0, 0.02, w, h - w / 2, 0.04, role, { args: [0], noOutline: true, flat: true });
  b.add('cylinder', 0, h - w / 2, 0.02, w, 0.04, w, role, { rx: Math.PI / 2, args: [1], noOutline: true, flat: true });
}

/** 独立的拱（沿 x 宽 w、高 h，厚 0.5）：两根方柱 + 半圆拱 + 顶梁 */
export function archFrame(b: B, w: number, h: number, role: Role) {
  const p = 0.4, r = (w - p) / 2;
  for (const s of [-1, 1]) b.box(s * (w / 2 - p / 2), 0, 0, p, h - r, 0.5, role, { args: [0.04] });
  // 圆环：中线半径 r、管半径 p/2 → 缩放 w、管径比 p/(2w)；z 方向拉到 0.5 厚
  const a0 = p / (2 * w);
  b.add('torus', 0, h - r, 0, w, w, 0.5 / (2 * a0), role, { args: [a0, Math.PI] });
  b.box(0, h + p * 0.3, 0, w + 0.1, 0.3, 0.6, 'paper', { args: [0] });
}
