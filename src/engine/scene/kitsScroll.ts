import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B, cnHall } from './kits';
import type { Item } from './types';

/*
 * 卷轴长街（清明上河图式的界画长卷）的套件（技术补全 2026-10-23，H 轨道）：
 *   临街铺面（台基、柱、门面格栅、凉棚、招牌、酒旗、悬山顶，两层的有回廊）、柳树（垂下来的柳条）、榆树、
 *   漕船（船身、篷、桅、橹）、虹桥（木拱：一道道拱肋 + 弧形桥面 + 栏杆）、城门楼、田块、
 *   小人（行人、挑担的、骑驴的、抬轿的、推车的）。
 * 都朝 +z（临街一面对着镜头），斜投影下看得到正面、顶面和右侧面——界画的「正面 + 斜向退去的侧面」。
 */

/** 临街铺面：宽 w（沿街）、进深 d、檐高 h；two = 两层（二层略缩进，带栏杆） */
export function streetShop(b: B, w: number, d: number, h: number, rng: Rng, two = false, sign: Role = 'paper') {
  b.box(0, 0, 0, w + 0.3, 0.16, d + 0.3, 'stone', { args: [0] });
  // 后墙、山墙；屋里压暗（门面敞开，看进去是暗的）
  b.box(0, 0.16, -d / 2 + 0.08, w, h, 0.16, 'structure', { args: [0] });
  for (const s of [-1, 1]) b.box(s * (w / 2 - 0.08), 0.16, 0, 0.16, h, d, 'structure', { args: [0] });
  b.box(0, 0.16, -d * 0.1, w - 0.3, h * 0.8, 0.05, 'ink', { args: [0], noOutline: true });
  // 门面：柱、额枋、上半截格栅、柜台
  const n = Math.max(2, Math.round(w / 1.3));
  for (let i = 0; i <= n; i++) b.box(-w / 2 + 0.08 + (i / n) * (w - 0.16), 0.16, d / 2 - 0.08, 0.13, h, 0.13, 'trim', { args: [0] });
  b.box(0, 0.16 + h - 0.22, d / 2 - 0.06, w, 0.22, 0.16, 'trim', { args: [0] });
  b.box(0, 0.16 + h * 0.66, d / 2 - 0.1, w - 0.2, h * 0.24, 0.05, 'wood', { args: [0] });
  for (let k = 1; k < 8; k++) b.box(-w / 2 + (k / 8) * w, 0.16 + h * 0.66, d / 2 - 0.07, 0.03, h * 0.24, 0.03, 'trim', { args: [0], noOutline: true });
  b.box(-w * 0.18, 0.16, d / 2 - 0.25, w * 0.5, 0.62, 0.3, 'wood', { args: [0] });
  // 柜台上的货（坛子、布匹）
  for (let k = 0; k < 3; k++) b.ball(-w * 0.36 + k * w * 0.17, 0.9, d / 2 - 0.25, 0.12, 0.14, 0.12, rng() < 0.5 ? 'stone' : 'cloth', { noOutline: true });
  // 凉棚：斜搭出来的一片布 / 席，两根撑杆
  if (rng() < 0.7) {
    const aw = w * (0.7 + rng() * 0.25);
    b.add('box', 0, 0.16 + h * 0.72, d / 2 + 0.55, aw, 0.05, 1.15, rng() < 0.5 ? 'cloth' : 'wood', { rx: 0.32, args: [0] });
    for (const s of [-1, 1]) b.cyl(s * aw * 0.45, 0, d / 2 + 1.05, 0.03, 0.16 + h * 0.62, 'wood');
  }
  let top = 0.16 + h;
  if (two) {
    const h2 = h * 0.8;
    b.box(0, top, 0, w, 0.12, d, 'trim', { args: [0] });
    b.box(0, top + 0.12, -0.15, w - 0.4, h2, d - 0.5, 'structure', { args: [0] });
    for (let k = 0; k < Math.round(w / 0.9); k++) b.box(-w / 2 + 0.6 + k * 0.9, top + 0.12 + h2 * 0.3, d / 2 - 0.39, 0.5, h2 * 0.45, 0.04, 'glass', { args: [0], noOutline: true });
    // 回廊栏杆
    b.box(0, top + 0.12, d / 2 - 0.08, w, 0.32, 0.05, 'trim', { args: [0] });
    for (let k = 0; k <= Math.round(w / 0.3); k++) b.box(-w / 2 + k * 0.3, top + 0.12, d / 2 - 0.08, 0.035, 0.32, 0.04, 'trim', { args: [0], noOutline: true });
    // 腰檐
    b.add('roof', 0, top + 0.05, 0.1, w + 0.7, 0.3, d + 0.9, 'roof', { args: [1, 0.8, 0.05], rx: 0 });
    top += 0.12 + h2;
  }
  // 悬山顶 + 正脊 + 鸱吻
  const rh = Math.max(0.7, w * 0.26);
  b.add('roof', 0, top + rh / 2, 0, w + 0.8, rh, d + 1.0, 'roof', { args: [rng() < 0.3 ? 3 : 1, 1.4, 0.12] });
  b.box(0, top + rh - 0.1, 0, w + 0.7, 0.16, 0.16, 'roof', { args: [0] });
  for (const s of [-1, 1]) b.box(s * (w / 2 + 0.3), top + rh - 0.1, 0, 0.12, 0.3, 0.16, 'ink', { args: [0] });
  // 招牌：门前竖一块（白底黑框）或者檐下一块横匾
  if (rng() < 0.55) {
    b.box(-w / 2 - 0.05, 0, d / 2 + 0.35, 0.36, 1.5, 0.06, 'trim', { args: [0] });
    b.box(-w / 2 - 0.05, 0.12, d / 2 + 0.37, 0.28, 1.25, 0.04, sign, { args: [0], noOutline: true });
    for (let k = 0; k < 3; k++) b.box(-w / 2 - 0.05, 0.4 + k * 0.32, d / 2 + 0.4, 0.14, 0.16, 0.02, 'ink', { args: [0], noOutline: true });
  } else b.box(0, 0.16 + h - 0.6, d / 2 + 0.02, w * 0.4, 0.34, 0.05, 'ink', { args: [0] });
  // 酒旗：一根高杆挑着一面布
  if (rng() < 0.3) {
    const fx = w / 2 + 0.2;
    b.cyl(fx, 0, d / 2 + 0.2, 0.04, top + rh + 0.8, 'wood');
    b.box(fx + 0.02, top + rh * 0.3, d / 2 + 0.55, 0.05, 1.3, 0.62, 'accent', { args: [0], sway: 0.5 });
    b.box(fx + 0.04, top + rh * 0.3 + 0.1, d / 2 + 0.55, 0.05, 1.1, 0.42, 'paper', { args: [0], noOutline: true, sway: 0.5 });
  }
  return top + rh;
}

/** 柳树：短而歪的树干分两三杈，杈顶几小团嫩叶，四周垂下一圈长长的柳条（会随风摆）——画里的柳是「一帘」而不是一个树冠 */
export function willow(b: B, h: number, rng: Rng) {
  const lean = (rng() - 0.5) * 0.35, tr = 0.07 * h / 3;
  b.add('cylinder', -lean * h * 0.2, h * 0.22, 0, tr * 2.4, h * 0.45, tr * 2.4, 'trunk', { rz: lean, args: [0.65] });
  const tx = -lean * h * 0.42, ty = h * 0.44;
  const tips: [number, number, number][] = [];
  for (let k = 0; k < 3; k++) {
    const a = -0.7 + k * 0.7 + (rng() - 0.5) * 0.3, L = h * (0.22 + rng() * 0.1);
    b.add('cylinder', tx + Math.sin(a) * L * 0.5, ty + Math.cos(a) * L * 0.5, (rng() - 0.5) * 0.3, tr * 1.3, L, tr * 1.3, 'trunk', { rz: -a, args: [0.6] });
    tips.push([tx + Math.sin(a) * L, ty + Math.cos(a) * L, (rng() - 0.5) * 0.3]);
  }
  for (const [x, y, z] of tips) b.ball(x, y + h * 0.03, z, h * 0.12, h * 0.07, h * 0.1, 'foliage2', { sway: 0.4 });
  const n = 26;
  for (let k = 0; k < n; k++) {
    const [x, y, z] = tips[k % 3], a = rng() * Math.PI * 2, r = h * (0.05 + rng() * 0.16), L = h * (0.3 + rng() * 0.32);
    b.add('cylinder', x + Math.cos(a) * r, y - L / 2 + h * 0.02, z + Math.sin(a) * r * 0.7, 0.045, L, 0.045, rng() < 0.6 ? 'foliage' : 'foliage2', { rz: (rng() - 0.5) * 0.18, args: [0.4], sway: 1, noOutline: true });
  }
}

/** 榆树 / 槐树：直干 + 两三团圆冠 */
export function roundTree(b: B, h: number, rng: Rng, leaf: Role = 'foliage2') {
  b.cyl(0, 0, 0, 0.06 * h / 3, h * 0.55, 'trunk', 0.7);
  for (let k = 0; k < 3; k++) b.ball((rng() - 0.5) * h * 0.3, h * (0.6 + rng() * 0.2), (rng() - 0.5) * h * 0.2, h * (0.18 + rng() * 0.08), h * 0.16, h * 0.18, leaf, { sway: 0.4 });
}

/** 小人：长袍 + 头 + 帽（斗笠 / 幞头），高约 1.0 × s；pose：0 行人、1 挑担、2 骑驴、3 推车 */
export function person(b: B, rng: Rng, s = 1, pose = 0) {
  const robes: Role[] = ['cloth', 'paper', 'trim', 'wood', 'structure', 'stone', 'characterAccent'];
  const robe = robes[Math.floor(rng() * robes.length)];
  const y0 = pose === 2 ? 0.55 * s : 0;
  b.add('cylinder', 0, y0 + 0.33 * s, 0, 0.36 * s, 0.66 * s, 0.3 * s, robe, { args: [0.6] });
  b.ball(0, y0 + 0.78 * s, 0, 0.12 * s, 0.13 * s, 0.12 * s, 'skin');
  if (rng() < 0.45) b.add('cylinder', 0, y0 + 0.9 * s, 0, 0.42 * s, 0.07 * s, 0.42 * s, 'wood', { args: [0.25] }); // 斗笠
  else b.box(0, y0 + 0.86 * s, 0, 0.2 * s, 0.12 * s, 0.18 * s, 'ink', { args: [0.2] }); // 幞头
  if (pose === 1) {
    // 扁担 + 两头的筐
    b.add('box', 0, 0.72 * s, 0, 1.3 * s, 0.04 * s, 0.05 * s, 'wood', { rz: 0.06, args: [0] });
    for (const sx of [-1, 1]) { b.cyl(sx * 0.6 * s, 0.18 * s, 0, 0.17 * s, 0.26 * s, 'wood', 1.2); b.cyl(sx * 0.6 * s, 0.44 * s, 0, 0.01, 0.28 * s, 'ink'); }
  } else if (pose === 2) {
    // 驴：身子、四条腿、头颈、耳朵
    b.box(0, 0.32 * s, 0, 0.8 * s, 0.32 * s, 0.26 * s, 'stone', { args: [0.4] });
    for (const [lx, lz] of [[-0.3, -0.08], [-0.3, 0.08], [0.3, -0.08], [0.3, 0.08]]) b.cyl(lx * s, 0, lz * s, 0.04 * s, 0.34 * s, 'stone');
    b.add('box', 0.46 * s, 0.62 * s, 0, 0.16 * s, 0.38 * s, 0.14 * s, 'stone', { rz: -0.5, args: [0.3] });
    b.box(0.55 * s, 0.82 * s, 0, 0.06 * s, 0.14 * s, 0.05 * s, 'stone', { args: [0] });
  } else if (pose === 3) {
    // 独轮车
    b.box(0.55 * s, 0.32 * s, 0, 0.7 * s, 0.18 * s, 0.36 * s, 'wood', { args: [0] });
    b.add('torus', 0.75 * s, 0.22 * s, 0, 0.44 * s, 0.44 * s, 0.3 * s, 'wood', { args: [0.14] });
    b.box(0.55 * s, 0.5 * s, 0, 0.5 * s, 0.24 * s, 0.3 * s, rng() < 0.5 ? 'cloth' : 'sand', { args: [0.3] });
  }
}

/** 轿子：轿厢 + 小顶 + 两根轿杆，前后各一个轿夫 */
export function sedan(b: B, rng: Rng, s = 1) {
  b.box(0, 0.45 * s, 0, 0.62 * s, 0.75 * s, 0.55 * s, 'accent', { args: [0.1] });
  b.add('roof', 0, 1.32 * s, 0, 0.8 * s, 0.25 * s, 0.7 * s, 'roof', { args: [2, 1.2, 0.2] });
  for (const z of [-0.2, 0.2]) b.add('box', 0, 0.62 * s, z * s, 2.4 * s, 0.05 * s, 0.05 * s, 'wood', { args: [0] });
  person(b.at(-1.0 * s, 0, 0), rng, s);
  person(b.at(1.0 * s, 0, 0), rng, s);
}

/** 漕船（沿 x 方向）：船身 + 两头上翘 + 船篷 + 桅杆 + 船尾的橹，船上两三个人 */
export function cargoBoat(b: B, len: number, rng: Rng) {
  const w = len * 0.24;
  b.box(0, 0, 0, len * 0.7, 0.55, w, 'wood', { args: [0.1] });
  for (const s of [-1, 1]) b.add('wedge', s * len * 0.42, 0.42, 0, 0.55, len * 0.18, w * 0.96, 'wood', { rz: s * Math.PI / 2 + s * 0.25 });
  b.box(0, 0.52, 0, len * 0.72, 0.06, w + 0.06, 'trim', { args: [0] });
  // 船篷（半圆的篷顶 = 横放的圆柱的一半露在外面）
  b.box(-len * 0.05, 0.55, 0, len * 0.4, 0.55, w * 0.86, 'wood', { args: [0] });
  b.add('cylinder', -len * 0.05, 1.08, 0, w * 0.9, len * 0.42, w * 0.6, 'cloth', { rz: Math.PI / 2, args: [1] });
  // 桅杆 + 两根索
  b.cyl(len * 0.18, 0.55, 0, 0.05, len * 0.55, 'wood');
  b.add('cylinder', len * 0.02, 0.55 + len * 0.27, 0, 0.015, len * 0.6, 0.015, 'ink', { rz: 0.6, noOutline: true });
  // 橹
  b.add('box', -len * 0.48, 0.55, 0, len * 0.35, 0.04, 0.06, 'wood', { rz: -0.45, args: [0] });
  for (let k = 0; k < 2 + Math.floor(rng() * 2); k++) person(b.at(len * (0.25 - k * 0.32) + 0.1, 0.55, (rng() - 0.5) * w * 0.4), rng, 0.8);
}

/**
 * 虹桥（汴河上的木拱桥）：桥沿 z 跨过河，宽 w（沿 x），跨度 z0 → z1（z0 < z1），拱高 rise。
 * 返回桥面高度函数（给走在桥上的小人摆位置）
 */
export function rainbowBridge(items: Item[], id: number, x: number, z0: number, z1: number, w: number, rise: number): (z: number) => number {
  const span = z1 - z0, n = 14;
  const yAt = (z: number) => rise * Math.sin(Math.PI * Math.min(1, Math.max(0, (z - z0) / span)));
  const push = (it: Omit<Item, 'id'>) => items.push({ ...it, id });
  for (let i = 0; i < n; i++) {
    const za = z0 + (i / n) * span, zb = z0 + ((i + 1) / n) * span, ya = yAt(za), yb = yAt(zb);
    const zm = (za + zb) / 2, ym = (ya + yb) / 2, len = Math.hypot(zb - za, yb - ya), ang = Math.atan2(yb - ya, zb - za);
    // 桥面（板子）+ 两侧栏杆（扶手 + 望柱）
    push({ prim: 'box', args: [0], pos: [x, ym - 0.08, zm], rot: [-ang, 0, 0], scale: [w, 0.16, len + 0.03], role: 'wood' });
    for (const s of [-1, 1]) {
      push({ prim: 'box', args: [0], pos: [x + s * (w / 2 - 0.05), ym + 0.42, zm], rot: [-ang, 0, 0], scale: [0.07, 0.07, len + 0.02], role: 'trim' });
      push({ prim: 'box', args: [0], pos: [x + s * (w / 2 - 0.05), ym + 0.2, za], scale: [0.08, 0.5, 0.08], role: 'trim' });
    }
  }
  // 拱肋：几道沿 z 的木拱（圆环的一段，转到 zy 平面），从水面下起拱
  const R = (span * span / 4 + (rise + 1.2) ** 2) / (2 * (rise + 1.2)), cy = rise - 0.2 - R;
  const half = Math.asin(Math.min(1, (span / 2) / R));
  for (let k = 0; k < 4; k++) {
    const xk = x - w / 2 + 0.2 + (k / 3) * (w - 0.4);
    push({ prim: 'torus', args: [0.14 / (2 * R) * 2, half * 2], pos: [xk, cy, (z0 + z1) / 2], rot: [0, Math.PI / 2, Math.PI / 2 - half], scale: [R * 2, R * 2, R * 2 * 0.25], role: 'wood' });
  }
  // 两岸的石桥台
  for (const zz of [z0, z1]) push({ prim: 'box', args: [0], pos: [x, -0.7, zz], scale: [w + 0.5, 1.4, 0.9], role: 'stone' });
  return yAt;
}

/** 城门楼：沿 z 的一段厚城墙（门洞对着街），墙上一座歇山顶的门楼（沿 z 摆） */
export function cityGate(b: B, zFront: number, zBack: number, gap: [number, number], H = 3.2, thick = 3) {
  const seg = (za: number, zb: number) => b.box(0, 0, (za + zb) / 2, thick, H, zb - za, 'stone', { args: [0] });
  seg(zBack, gap[0]);
  seg(gap[1], zFront);
  // 门洞上方的墙 + 门洞里压暗
  b.box(0, H * 0.62, (gap[0] + gap[1]) / 2, thick, H * 0.38, gap[1] - gap[0], 'stone', { args: [0] });
  b.box(thick / 2 - 0.02, 0, (gap[0] + gap[1]) / 2, 0.04, H * 0.62, gap[1] - gap[0], 'ink', { args: [0], noOutline: true });
  // 垛口
  for (let z = zBack + 0.3; z < zFront; z += 0.7) b.box(thick / 2 - 0.15, H, z, 0.3, 0.32, 0.4, 'stone', { args: [0] });
  // 门楼（长边沿 z）
  const g = b.at(-0.2, H, (gap[0] + gap[1]) / 2, Math.PI / 2);
  cnHall(g, 5.4, 2.4, 1.7, 3, 0.6, 0.24);
}
