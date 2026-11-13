import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';
import { flatten } from './kits2d';
import type { DynamicGroup, Item } from './types';

/*
 * 伪 3D 与复古镜头的套件（技术补全 2026-10-23，K 轨道）：
 *   精灵（公告板）：路边棕榈、弯道箭头牌、广告牌、岩石、灌木、云、迷宫里的骷髅兵 / 史莱姆 / 宝物——都在 xy 平面里摆、正面朝 +z，
 *     再用 sprite() 压扁成一片、做成每帧转向镜头的动态组（DynamicGroup.billboard）；
 *   载具（真 3D，车头朝 +z）：跑车、卡丁车、飞船。
 * 全是带颜色角色的图元，换色板 / 描边 / 体素照常生效。
 */

/** 把一组「正面朝 +z」的图元压成一片公告板（厚度 k 倍），放在 (x, y, z) */
export function sprite(items: Item[], x: number, y: number, z: number, k = 0.12, extra: Partial<DynamicGroup> = {}): DynamicGroup {
  return { kind: 'prop', items: flatten(items, 0, k), origin: [x, y, z], billboard: true, ...extra };
}

/** 画一组精灵图元：f 往 B 里加东西，返回图元表 */
export function draw(id: number, f: (b: B) => void): Item[] {
  const items: Item[] = [];
  f(new B(items, id));
  return items;
}

/* ---------------- 路边精灵（OutRun / Super Hang-On） ---------------- */

/** 棕榈（侧面剪影）：弯曲的分节树干 + 一冠下垂的羽状叶 + 椰子；lean = 往哪边歪（−1 ~ 1） */
export function palmSprite(b: B, h: number, lean: number, rng: Rng) {
  const n = 7;
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < n; i++) {
    const seg = h / n, r = 0.3 - i * 0.022;
    a = lean * (0.05 + (i / n) * 0.42);
    b.add('cylinder', x + Math.sin(a) * seg * 0.5, y + Math.cos(a) * seg * 0.5, 0, r * 2, seg * 1.08, r * 2, i % 2 ? 'trunk' : 'wood', { args: [0.82], rz: -a, noOutline: i > 0 });
    x += Math.sin(a) * seg;
    y += Math.cos(a) * seg;
  }
  // 叶：每片两节（里节往上翘、外节往下垂），左右各几片，正中一片竖起
  const fronds = [-2.75, -2.25, -1.7, -1.05, -0.45, 0.45, 1.05, 1.7, 2.25, 2.75];
  for (const f of fronds) {
    const s = Math.sign(f), up = Math.abs(f) < 1.2 ? 0.55 : Math.abs(f) < 2 ? 0.2 : -0.25;
    const L1 = 1.3 + rng() * 0.3, L2 = 1.2 + rng() * 0.4;
    const a1 = s * (Math.PI / 2) - s * up;
    const mx = x + Math.sin(a1) * L1 * 0.5, my = y + Math.cos(a1) * L1 * 0.5;
    b.add('sphere', mx, my, 0, 0.42, L1 * 1.1, 0.6, Math.abs(f) > 2 ? 'foliage2' : 'foliage', { rz: -a1, sway: 1 });
    const ex = x + Math.sin(a1) * L1, ey = y + Math.cos(a1) * L1;
    const a2 = a1 + s * (0.7 + rng() * 0.3);
    b.add('sphere', ex + Math.sin(a2) * L2 * 0.45, ey + Math.cos(a2) * L2 * 0.45, 0.05, 0.32, L2, 0.5, 'foliage', { rz: -a2, sway: 1 });
  }
  b.add('sphere', x, y + 0.45, 0.06, 0.42, 1.2, 0.5, 'foliage2', { sway: 1 });
  for (const [cx, cy] of [[-0.22, -0.12], [0.2, -0.16], [0.0, -0.3]]) b.ball(x + cx, y + cy, 0.12, 0.17, 0.17, 0.17, 'trunk', { noOutline: true });
}

/** 弯道箭头牌：白底红箭头（dir = 1 往右、−1 往左），两条腿 */
export function chevronSign(b: B, dir: number, s = 1) {
  for (const x of [-0.8, 0.8]) b.box(x * s, 0, -0.05, 0.12 * s, 1.1 * s, 0.1, 'metal', { args: [0] });
  b.box(0, 1.0 * s, 0, 2.6 * s, 1.15 * s, 0.12, 'paper', { args: [0.1] });
  for (let k = -1; k <= 1; k++) {
    const cx = (k * 0.75 + dir * 0.12) * s;
    b.add('box', cx - dir * 0.1 * s, 1.0 * s + 0.2 * s, 0.08, 0.2 * s, 0.6 * s, 0.05, 'accent', { args: [0], rz: dir * 0.75, noOutline: true });
    b.add('box', cx - dir * 0.1 * s, 1.0 * s - 0.2 * s, 0.08, 0.2 * s, 0.6 * s, 0.05, 'accent', { args: [0], rz: -dir * 0.75, noOutline: true });
  }
}

/** 广告牌：两根柱子 + 大牌面（上下两色条 + 一块色块） */
export function adBoard(b: B, rng: Rng, s = 1) {
  const W = 5.2 * s, H = 2.4 * s, Y = 2.2 * s;
  for (const x of [-W * 0.32, W * 0.32]) b.box(x, 0, -0.1, 0.22 * s, Y, 0.18, 'metal', { args: [0] });
  b.box(0, Y, 0, W, H, 0.16, 'paper', { args: [0.05] });
  const band: Role = rng() < 0.5 ? 'accent' : 'interactive';
  b.box(0, Y + H * 0.66, 0.1, W * 0.94, H * 0.26, 0.04, band, { args: [0], noOutline: true });
  b.box(-W * 0.22, Y + H * 0.12, 0.1, W * 0.42, H * 0.36, 0.04, rng() < 0.5 ? 'cloth' : 'characterAccent', { args: [0], noOutline: true });
  b.box(W * 0.25, Y + H * 0.3, 0.1, W * 0.3, H * 0.08, 0.04, 'ink', { args: [0], noOutline: true });
  b.box(W * 0.25, Y + H * 0.13, 0.1, W * 0.3, H * 0.08, 0.04, 'ink', { args: [0], noOutline: true });
}

/** 路边岩石（一堆多面体） */
export function rockSprite(b: B, rng: Rng, s = 1, role: Role = 'rock') {
  b.add('poly', 0, 0.6 * s, 0, 2.2 * s, 1.5 * s, 1, role, { args: [1], rz: rng() * 0.5 });
  b.add('poly', 0.9 * s, 0.4 * s, 0.1, 1.3 * s, 0.9 * s, 1, role, { args: [0], rz: rng() });
  b.add('poly', -0.8 * s, 0.35 * s, 0.1, 1.0 * s, 0.75 * s, 1, 'stone', { args: [1], rz: rng() });
}

/** 灌木（几团圆球） */
export function bushSprite(b: B, rng: Rng, s = 1, role: Role = 'foliage2') {
  for (let k = 0; k < 4; k++) b.ball((k - 1.5) * 0.55 * s, (0.45 + rng() * 0.25) * s, k * 0.02, (0.6 + rng() * 0.25) * s, (0.5 + rng() * 0.2) * s, 0.5, k % 2 ? role : 'foliage', { sway: 0.4 });
}

/** 一朵云（扁的几团） */
export function cloudSprite(b: B, rng: Rng, s = 1) {
  const n = 4 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) b.ball((k - (n - 1) / 2) * 1.6 * s, (rng() * 0.8) * s, k * 0.01, (1.4 + rng() * 0.8) * s, (0.8 + rng() * 0.5) * s, 0.5, 'cloud', { noOutline: true });
}

/* ---------------- 载具（车头朝 +z） ---------------- */

/** 敞篷跑车（OutRun 的红色跑车，从后面看得到尾灯、排气管、两个人） */
export function sportsCar(b: B, body: Role = 'character', withCrew = true) {
  // 车身：下半截 + 后盖 + 前盖
  b.box(0, 0.22, 0, 1.92, 0.5, 4.3, body, { args: [0.35] });
  b.box(0, 0.68, -1.3, 1.86, 0.22, 1.5, body, { args: [0.4] });
  b.box(0, 0.62, 1.35, 1.8, 0.16, 1.5, body, { args: [0.4], rx: 0.08 });
  // 侧面的进气格栅（Testarossa 的横条）
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) b.box(s * 0.97, 0.36 + k * 0.1, -0.55, 0.04, 0.04, 1.3, 'ink', { args: [0], noOutline: true });
  // 挡风玻璃、座舱
  b.add('box', 0, 0.98, 0.42, 1.62, 0.42, 0.05, 'glass', { args: [0], rx: -0.55, noOutline: true });
  b.box(0, 0.62, -0.25, 1.55, 0.18, 1.25, 'ink', { args: [0.2] });
  if (withCrew) {
    for (const [x, hair] of [[0.4, 'ink'], [-0.4, 'characterAccent']] as [number, Role][]) {
      b.add('cylinder', x, 0.98, -0.32, 0.46, 0.48, 0.36, 'cloth', { args: [0.75] });
      b.ball(x, 1.36, -0.3, 0.2, 0.22, 0.2, 'skin');
      b.ball(x, 1.42, -0.36, 0.23, 0.2, 0.22, hair);
    }
    // 副驾驶的金发往后飘
    b.ball(-0.42, 1.36, -0.6, 0.2, 0.14, 0.26, 'characterAccent', { noOutline: true });
  }
  // 车尾：黑色格栅 + 两组尾灯 + 车牌 + 排气管
  b.box(0, 0.32, -2.16, 1.8, 0.32, 0.06, 'ink', { args: [0] });
  for (const s of [-1, 1]) {
    b.box(s * 0.6, 0.38, -2.2, 0.48, 0.13, 0.04, 'accent', { args: [0], noOutline: true });
    b.box(s * 0.6, 0.38, -2.22, 0.2, 0.07, 0.03, 'emissive', { args: [0], noOutline: true });
    b.add('cylinder', s * 0.42, 0.2, -2.2, 0.13, 0.16, 0.13, 'metal', { rx: Math.PI / 2 });
  }
  b.box(0, 0.12, -2.21, 0.5, 0.15, 0.03, 'paper', { args: [0], noOutline: true });
  // 轮子：后轮宽
  for (const sz of [-1.35, 1.38]) for (const sx of [-1, 1]) b.add('cylinder', sx * 0.9, 0.34, sz, 0.68, sz < 0 ? 0.42 : 0.32, 0.68, 'ink', { rz: Math.PI / 2 });
}

/** 对手车：方一点的轿跑（颜色换个角色），不带乘客 */
export function rivalCar(b: B, body: Role) {
  b.box(0, 0.22, 0, 1.85, 0.55, 4.1, body, { args: [0.3] });
  b.box(0, 0.76, -0.35, 1.6, 0.5, 1.9, body, { args: [0.5] });
  b.box(0, 0.82, -0.35, 1.64, 0.32, 1.7, 'glass', { args: [0.2], noOutline: true });
  b.box(0, 0.4, -2.06, 1.7, 0.18, 0.05, 'ink', { args: [0], noOutline: true });
  for (const s of [-1, 1]) b.box(s * 0.65, 0.44, -2.09, 0.38, 0.1, 0.03, 'accent', { args: [0], noOutline: true });
  for (const sz of [-1.3, 1.3]) for (const sx of [-1, 1]) b.add('cylinder', sx * 0.88, 0.33, sz, 0.66, 0.3, 0.66, 'ink', { rz: Math.PI / 2 });
}

/** 卡丁车（SNES 马车式）：底盘、大头盔车手、四个胖轮子；车头朝 +z */
export function kart(b: B, body: Role, helmet: Role = 'paper') {
  b.box(0, 0.12, 0, 1.25, 0.18, 1.9, 'metal', { args: [0.3] });
  b.box(0, 0.22, 0.75, 1.05, 0.32, 0.5, body, { args: [0.5] });
  b.box(0, 0.25, -0.75, 1.15, 0.26, 0.42, body, { args: [0.5] });
  b.box(0, 0.32, -0.2, 0.62, 0.36, 0.62, 'ink', { args: [0.4] });
  b.add('cylinder', 0, 0.62, -0.18, 0.5, 0.42, 0.4, body, { args: [0.8] });
  b.ball(0, 1.02, -0.15, 0.32, 0.31, 0.32, helmet);
  b.box(0, 1.0, 0.1, 0.4, 0.14, 0.06, 'glass', { args: [0.3], noOutline: true });
  b.ball(0, 1.18, -0.35, 0.12, 0.1, 0.1, body, { noOutline: true });
  b.add('cylinder', 0, 0.62, 0.42, 0.42, 0.06, 0.42, 'ink', { rx: 1.1 });
  for (const sz of [-0.68, 0.7]) for (const sx of [-1, 1]) b.add('cylinder', sx * 0.66, 0.26, sz, 0.52, sz < 0 ? 0.42 : 0.32, 0.52, 'ink', { rz: Math.PI / 2 });
  b.add('cylinder', 0.22, 0.3, -1.0, 0.14, 0.2, 0.14, 'metal', { rx: Math.PI / 2 });
}

/** 竖版射击的自机：箭形机身 + 两翼 + 座舱 + 两个发光的引擎口；机头朝 −z（画面上方） */
export function fighter(b: B, hull: Role = 'character', trim: Role = 'characterAccent', s = 1) {
  b.add('pyramid', 0, 0.3 * s, -0.55 * s, 0.5 * s, 1.5 * s, 0.4 * s, hull, { rx: -Math.PI / 2 });
  b.box(0, 0.12 * s, 0.25 * s, 0.6 * s, 0.36 * s, 1.1 * s, hull, { args: [0.4] });
  for (const sx of [-1, 1]) {
    b.add('wedge', sx * 0.72 * s, 0.25 * s, 0.35 * s, 1.0 * s, 0.12 * s, 0.9 * s, trim, { rz: sx * 0.08, ry: 0 });
    b.box(sx * 1.16 * s, 0.1 * s, 0.4 * s, 0.14 * s, 0.32 * s, 0.75 * s, hull, { args: [0.3] });
    b.ball(sx * 0.22 * s, 0.28 * s, 0.86 * s, 0.13 * s, 0.13 * s, 0.1 * s, 'emissive', { noOutline: true });
  }
  b.ball(0, 0.48 * s, -0.15 * s, 0.17 * s, 0.14 * s, 0.38 * s, 'glass', { noOutline: true });
}

/** 敌机（小）：圆盘 + 发光核心 + 三片尖翼；机头朝 +z（朝玩家） */
export function drone(b: B, body: Role = 'accent', s = 1) {
  b.add('cylinder', 0, 0.2 * s, 0, 1.1 * s, 0.3 * s, 1.1 * s, body, { args: [0.7] });
  b.ball(0, 0.38 * s, 0, 0.26 * s, 0.2 * s, 0.26 * s, 'emissive', { noOutline: true });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    b.add('pyramid', Math.sin(a) * 0.7 * s, 0.2 * s, Math.cos(a) * 0.7 * s, 0.32 * s, 0.7 * s, 0.14 * s, 'metal', { rx: Math.PI / 2, ry: a });
  }
}

/* ---------------- 第一人称迷宫（Wolfenstein 3D / 魔眼杀机 / Grimrock） ---------------- */

/** 骷髅兵（正面精灵）：骨白的头骨、肋骨、破盾、锈剑，眼窝发光 */
export function skeletonSprite(b: B, s = 1) {
  const bone: Role = 'paper';
  for (const x of [-0.17, 0.17]) { b.box(x * s, 0, 0, 0.1 * s, 0.82 * s, 0.1, bone, { args: [0.3] }); b.box(x * s * 1.3, 0, 0.05, 0.22 * s, 0.08 * s, 0.1, bone, { args: [0.3] }); }
  b.box(0, 0.82 * s, 0, 0.5 * s, 0.14 * s, 0.12, bone, { args: [0.4] });
  b.box(0, 0.95 * s, 0, 0.08 * s, 0.58 * s, 0.1, bone, { args: [0.3] });
  for (let k = 0; k < 4; k++) b.box(0, (1.05 + k * 0.12) * s, 0.02, (0.52 - k * 0.04) * s, 0.06 * s, 0.1, bone, { args: [0.5] });
  b.box(0, 1.58 * s, 0, 0.66 * s, 0.09 * s, 0.1, bone, { args: [0.4] });
  b.ball(0, 1.86 * s, 0, 0.24 * s, 0.26 * s, 0.22, bone);
  b.box(0, 1.69 * s, 0.05, 0.2 * s, 0.1 * s, 0.12, bone, { args: [0.3] });
  for (const x of [-0.09, 0.09]) b.ball(x * s, 1.88 * s, 0.12, 0.06 * s, 0.07 * s, 0.05, 'emissive', { noOutline: true });
  // 手臂：一边举锈剑，一边挎破盾
  b.add('box', -0.42 * s, 1.32 * s, 0, 0.08 * s, 0.6 * s, 0.1, bone, { args: [0.3], rz: -0.5 });
  b.add('box', -0.62 * s, 1.75 * s, 0.05, 0.07 * s, 1.0 * s, 0.08, 'metal', { args: [0.2], rz: -0.25 });
  b.add('box', -0.55 * s, 1.27 * s, 0.06, 0.32 * s, 0.06 * s, 0.08, 'trim', { args: [0.2], rz: -0.25 });
  b.add('box', 0.4 * s, 1.25 * s, 0, 0.08 * s, 0.55 * s, 0.1, bone, { args: [0.3], rz: 0.3 });
  b.add('cylinder', 0.48 * s, 1.1 * s, 0.12, 0.62 * s, 0.08, 0.62 * s, 'wood', { rx: Math.PI / 2, args: [1] });
  b.add('cylinder', 0.48 * s, 1.1 * s, 0.17, 0.2 * s, 0.06, 0.2 * s, 'metal', { rx: Math.PI / 2, args: [1] });
}

/** 史莱姆（正面精灵）：半透明的水滴 + 一对眼睛 */
export function slimeSprite(b: B, role: Role = 'accent', s = 1) {
  b.ball(0, 0.42 * s, 0, 0.72 * s, 0.46 * s, 0.4, role);
  b.ball(0, 0.78 * s, 0, 0.38 * s, 0.32 * s, 0.35, role);
  b.ball(-0.22 * s, 0.6 * s, 0.25, 0.14 * s, 0.1 * s, 0.05, 'paper', { noOutline: true });
  for (const x of [-0.16, 0.16]) { b.ball(x * s, 0.66 * s, 0.32, 0.11 * s, 0.14 * s, 0.05, 'paper', { noOutline: true }); b.ball(x * s, 0.64 * s, 0.36, 0.05 * s, 0.08 * s, 0.03, 'ink', { noOutline: true }); }
}

/** 药水瓶（精灵）：圆肚瓶 + 发光的药水 + 木塞 */
export function potionSprite(b: B, role: Role = 'accent', s = 1) {
  b.ball(0, 0.2 * s, 0, 0.2 * s, 0.2 * s, 0.2, 'glass', { noOutline: true });
  b.ball(0, 0.17 * s, 0.02, 0.17 * s, 0.14 * s, 0.17, role);
  b.box(0, 0.36 * s, 0, 0.1 * s, 0.14 * s, 0.1, 'glass', { args: [0.3], noOutline: true });
  b.box(0, 0.48 * s, 0, 0.12 * s, 0.07 * s, 0.12, 'wood', { args: [0.3] });
}

/** 钥匙（精灵）：金色的圈 + 杆 + 齿 */
export function keySprite(b: B, s = 1) {
  b.add('torus', 0, 0.3 * s, 0, 0.26 * s, 0.26 * s, 0.26 * s, 'interactive', { args: [0.22], rx: Math.PI / 2 });
  b.box(0.36 * s, 0.26 * s, 0, 0.44 * s, 0.07 * s, 0.07, 'interactive', { args: [0.2] });
  b.box(0.5 * s, 0.17 * s, 0, 0.06 * s, 0.12 * s, 0.07, 'interactive', { args: [0.2] });
  b.box(0.38 * s, 0.17 * s, 0, 0.06 * s, 0.1 * s, 0.07, 'interactive', { args: [0.2] });
}

/** 一堆金币 + 宝石（精灵） */
export function treasureSprite(b: B, s = 1) {
  for (let k = 0; k < 7; k++) b.add('cylinder', (k - 3) * 0.1 * s, 0.05 * s + (k % 3) * 0.05 * s, 0, 0.18 * s, 0.05 * s, 0.18 * s, 'interactive', { rz: (k - 3) * 0.12 });
  b.add('poly', 0.05 * s, 0.24 * s, 0.05, 0.16 * s, 0.16 * s, 0.16, 'emissive', { args: [0] });
}

/** 墙上的火把：铁托架 + 木柄 + 火苗（发光）；挂在 +z 朝外的墙面上 */
export function wallTorch(b: B) {
  b.box(0, 1.55, 0.06, 0.18, 0.28, 0.12, 'metal', { args: [0.2] });
  b.add('cylinder', 0, 1.82, 0.2, 0.1, 0.55, 0.1, 'wood', { rx: 0.35 });
  b.add('cylinder', 0, 2.06, 0.3, 0.17, 0.12, 0.17, 'metal', { rx: 0.35, args: [1.3] });
  b.ball(0, 2.22, 0.33, 0.13, 0.22, 0.13, 'emissive', { noOutline: true });
  b.ball(0, 2.36, 0.35, 0.07, 0.13, 0.07, 'emissive', { noOutline: true });
}

/** 木门（铁箍、门环），门洞宽 w 高 h；石门框；正面朝 +z */
export function dungeonDoor(b: B, w: number, h: number) {
  const n = 5;
  for (let k = 0; k < n; k++) b.box(-w / 2 + (k + 0.5) * (w / n), 0, 0, w / n - 0.04, h, 0.14, 'wood', { args: [0.1] });
  for (const y of [0.45, h - 0.55]) b.box(0, y, 0.09, w, 0.14, 0.04, 'metal', { args: [0] });
  for (const x of [-w / 2 + 0.14, w / 2 - 0.14]) for (const y of [0.45, h - 0.55]) b.ball(x, y + 0.07, 0.12, 0.05, 0.05, 0.04, 'metal', { noOutline: true });
  b.add('torus', w * 0.28, h * 0.48, 0.16, 0.22, 0.22, 0.22, 'metal', { args: [0.18], rx: Math.PI / 2 });
  for (const s of [-1, 1]) b.box(s * (w / 2 + 0.2), -0.02, 0.06, 0.42, h + 0.1, 0.36, 'stone', { args: [0.1] });
  b.box(0, h + 0.05, 0.06, w + 0.84, 0.42, 0.38, 'stone', { args: [0.1] });
}
