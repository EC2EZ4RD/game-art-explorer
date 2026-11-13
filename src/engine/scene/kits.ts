import * as THREE from 'three';
import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import type { Item, PrimType } from './types';

/*
 * 建筑与道具套件。每个套件都是一组带角色的图元，按文化/题材分组：
 *   中式（殿、墙、门、亭、月洞门、桥、竹、太湖石、灯笼）
 *   欧式（木框架房、塔楼、城墙）
 *   现代街道（店铺、路灯、摊位）
 *   室内（房间壳、家具）
 *   科幻/工业（走廊模块、管线、控制台）
 *   自然补充（棕榈、仙人掌、断柱、船）
 * 形体比例来自 docs/survey 的建筑调研；这里是可调的程序化近似，不是考据级复原。
 */

const _q = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** 局部坐标系构建器：在 (x,y,z) 处绕 Y 旋转 ry 的局部空间里摆图元 */
export class B {
  constructor(
    public items: Item[],
    public id: number,
    private ox = 0,
    private oy = 0,
    private oz = 0,
    private ry = 0,
  ) {}

  /** 进入一个子坐标系 */
  at(x: number, y: number, z: number, ry = 0): B {
    _v.set(x, y, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.ry);
    return new B(this.items, this.id, this.ox + _v.x, this.oy + _v.y, this.oz + _v.z, this.ry + ry);
  }

  withId(id: number): B {
    return new B(this.items, id, this.ox, this.oy, this.oz, this.ry);
  }

  add(prim: PrimType, x: number, y: number, z: number, sx: number, sy: number, sz: number, role: Role, extra: Partial<Item> & { rx?: number; ry?: number; rz?: number } = {}) {
    _v.set(x, y, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.ry);
    const { rx = 0, ry = 0, rz = 0, ...rest } = extra;
    _e.set(rx, ry, rz);
    _qc.setFromEuler(_e);
    _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.ry).multiply(_qc);
    _e.setFromQuaternion(_q, 'XYZ');
    this.items.push({ prim, pos: [this.ox + _v.x, this.oy + _v.y, this.oz + _v.z], rot: [_e.x, _e.y, _e.z], scale: [sx, sy, sz], role, id: this.id, ...rest });
    return this;
  }

  /** 底面贴地的盒子：y 是底部高度 */
  box(x: number, y: number, z: number, w: number, h: number, d: number, role: Role, extra: Partial<Item> & { rx?: number; ry?: number; rz?: number } = {}) {
    return this.add('box', x, y + h / 2, z, w, h, d, role, { args: [0.25], ...extra });
  }

  cyl(x: number, y: number, z: number, r: number, h: number, role: Role, top = 1, extra: Partial<Item> & { rx?: number; ry?: number; rz?: number } = {}) {
    return this.add('cylinder', x, y + h / 2, z, r * 2, h, r * 2, role, { args: [top], ...extra });
  }

  ball(x: number, y: number, z: number, rx: number, ry: number, rz: number, role: Role, extra: Partial<Item> = {}) {
    return this.add('sphere', x, y, z, rx * 2, ry * 2, rz * 2, role, extra);
  }
}

/* ======================== 中式 ======================== */

/** 殿堂：台基 + 柱网 + 墙与隔扇 + 斗拱（细节高时）+ 曲面屋顶 + 正脊 */
export function cnHall(b: B, w: number, d: number, h: number, roofKind: number, detail: number, lift = 0.18) {
  const base = 0.5;
  b.box(0, 0, 0, w + 1.0, base, d + 1.0, 'stone');
  b.box(0, base, d / 2 + 0.55, w * 0.35, 0.18, 0.5, 'stone'); // 踏步
  const cols = Math.max(2, Math.round(w / 1.6));
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i / cols) * w;
    for (const z of [-d / 2, d / 2]) b.cyl(x, base, z, 0.14, h, 'trim');
  }
  b.box(0, base, -d / 2 + 0.08, w, h * 0.92, 0.16, 'structure');
  for (const sx of [-1, 1]) b.box(sx * (w / 2 - 0.08), base, 0, 0.16, h * 0.92, d, 'structure');
  // 前檐隔扇
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + ((i + 0.5) / cols) * w;
    const center = i === Math.floor(cols / 2);
    b.box(x, base, d / 2 - 0.12, (w / cols) * 0.86, h * 0.86, 0.1, center ? 'wood' : 'trim');
    if (detail > 0.35) for (let k = 0; k < 3; k++) b.box(x, base + h * (0.35 + k * 0.17), d / 2 - 0.05, (w / cols) * 0.7, 0.03, 0.04, 'wood', { noOutline: true });
  }
  // 额枋
  b.box(0, base + h, 0, w + 0.3, 0.22, d + 0.3, 'trim');
  if (detail > 0.55) {
    for (let i = 0; i <= cols * 2; i++) {
      const x = -w / 2 + (i / (cols * 2)) * w;
      for (const z of [-d / 2 - 0.12, d / 2 + 0.12]) b.box(x, base + h + 0.22, z, 0.2, 0.16, 0.22, 'accent', { noOutline: true });
    }
  }
  const roofH = Math.max(1.2, w * 0.28);
  b.add('roof', 0, base + h + 0.3 + roofH / 2, 0, w + 1.8, roofH, d + 1.8, 'roof', { args: [roofKind, 1.6, lift] });
  if (roofKind !== 2) {
    b.box(0, base + h + 0.3 + roofH - 0.1, 0, roofKind === 1 ? w + 1.8 : w * 0.62, 0.22, 0.2, 'roof');
    for (const sx of [-1, 1]) b.box(sx * (roofKind === 1 ? (w + 1.8) / 2 : w * 0.31), base + h + 0.3 + roofH - 0.1, 0, 0.18, 0.42, 0.22, 'accent');
  } else {
    b.ball(0, base + h + 0.3 + roofH + 0.15, 0, 0.15, 0.22, 0.15, 'accent');
  }
}

/** 院墙：墙身 + 瓦顶 */
export function cnWall(b: B, len: number, h = 2.2, thick = 0.4) {
  b.box(0, 0, 0, len, h, thick, 'structure');
  b.box(0, 0, 0, len + 0.02, 0.35, thick + 0.04, 'stone');
  b.add('roof', 0, h + 0.18, 0, len + 0.3, 0.36, thick + 0.55, 'roof', { args: [1, 1.2, 0] });
}

/** 月洞门：两段墙 + 门洞上方墙 + 圆形门框 */
export function moonGate(b: B, len: number, r = 1.1, h = 2.6) {
  const side = (len - r * 2) / 2;
  for (const s of [-1, 1]) {
    const c = b.at(s * (r + side / 2), 0, 0);
    cnWall(c, side, h);
  }
  b.box(0, r * 2, 0, r * 2, h - r * 2, 0.4, 'structure');
  b.add('roof', 0, h + 0.18, 0, r * 2 + 0.3, 0.36, 0.95, 'roof', { args: [1, 1.2, 0] });
  b.add('torus', 0, r, 0, r * 2.15, r * 2.15, 0.6, 'stone', { args: [0.08] });
}

/** 门楼 */
export function cnGate(b: B, w = 3.2, h = 3) {
  for (const s of [-1, 1]) b.box(s * w * 0.42, 0, 0, 0.5, h, 0.6, 'structure');
  b.box(0, 0, 0, w * 0.62, h * 0.85, 0.12, 'trim');
  b.box(0, h * 0.85, 0, w * 0.7, h * 0.15, 0.5, 'structure');
  b.add('roof', 0, h + 0.4, 0, w + 1.2, 0.8, 1.6, 'roof', { args: [3, 1.6, 0.25] });
  b.box(0, h * 0.7, 0.2, w * 0.3, 0.32, 0.06, 'accent');
}

/** 亭：台基 + 柱 + 坐凳 + 攒尖顶 */
export function pavilion(b: B, r = 1.6, sides = 6) {
  b.cyl(0, 0, 0, r + 0.4, 0.4, 'stone', 1);
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2;
    b.cyl(Math.cos(a) * r, 0.4, Math.sin(a) * r, 0.1, 2.3, 'trim');
  }
  for (let k = 0; k < sides; k++) {
    const a = ((k + 0.5) / sides) * Math.PI * 2;
    if (k === 0) continue;
    b.box(Math.cos(a) * r * 0.92, 0.4, Math.sin(a) * r * 0.92, r * 0.9, 0.42, 0.25, 'wood', { ry: -a + Math.PI / 2 });
  }
  b.add('roof', 0, 2.7 + 0.8, 0, (r + 0.8) * 2, 1.6, (r + 0.8) * 2, 'roof', { args: [2, 1.8, 0.35], ry: Math.PI / sides });
  b.ball(0, 4.45, 0, 0.14, 0.24, 0.14, 'accent');
}

/** 拱桥 */
export function archBridge(b: B, len = 5, w = 1.6, h = 1.1) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const x0 = -len / 2 + t0 * len, x1 = -len / 2 + t1 * len;
    const y0 = Math.sin(t0 * Math.PI) * h, y1 = Math.sin(t1 * Math.PI) * h;
    const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    const seg = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    b.add('box', xm, ym, 0, seg + 0.04, 0.22, w, 'stone', { rz: ang, args: [0.1] });
    for (const s of [-1, 1]) b.add('box', xm, ym + 0.35, s * (w / 2 - 0.06), seg + 0.02, 0.08, 0.1, 'stone', { rz: ang, args: [0.2] });
  }
}

export function bamboo(b: B, n: number, rng: Rng, spread = 1.2) {
  for (let k = 0; k < n; k++) {
    const x = (rng() - 0.5) * spread * 2, z = (rng() - 0.5) * spread * 2;
    const h = 3 + rng() * 2.5;
    const lean = (rng() - 0.5) * 0.12;
    b.add('cylinder', x, h / 2, z, 0.09, h, 0.09, 'foliage2', { rz: lean, sway: 0.5 });
    for (let s = 1; s < 4; s++) b.add('torus', x + lean * -h * (s / 4), (h * s) / 4, z, 0.13, 0.13, 0.13, 'foliage2', { rx: Math.PI / 2, args: [0.2], noOutline: true, sway: 0.4 });
    for (let l = 0; l < 3; l++) {
      b.add('sphere', x + lean * -h + (rng() - 0.5) * 0.7, h * (0.7 + l * 0.12), z + (rng() - 0.5) * 0.7, 0.9, 0.22, 0.45, 'foliage', { ry: rng() * 6, sway: 1 });
    }
  }
}

export function taihuRock(b: B, s: number, rng: Rng) {
  const n = 3 + Math.floor(rng() * 3);
  let y = 0;
  for (let k = 0; k < n; k++) {
    const r = s * (0.55 - k * 0.07) * (0.8 + rng() * 0.4);
    b.add('poly', (rng() - 0.5) * s * 0.4, y + r * 0.7, (rng() - 0.5) * s * 0.3, r * 1.6, r * 1.5, r * 1.3, 'stone', { args: [1], rx: rng(), ry: rng() * 6, rz: rng() });
    y += r * 1.1;
  }
}

export function cnLantern(b: B, x: number, y: number, z: number) {
  b.cyl(x, y + 0.5, z, 0.03, 0.25, 'trim');
  b.ball(x, y + 0.32, z, 0.2, 0.26, 0.2, 'emissive');
  b.box(x, y + 0.02, z, 0.08, 0.06, 0.08, 'accent', { noOutline: true });
}

export function stoneLanternPost(b: B, x: number, z: number) {
  b.box(x, 0, z, 0.4, 0.3, 0.4, 'stone');
  b.cyl(x, 0.3, z, 0.1, 0.6, 'stone');
  b.box(x, 0.9, z, 0.36, 0.34, 0.36, 'emissive');
  b.add('pyramid', x, 1.4, z, 0.6, 0.32, 0.6, 'stone');
}

/* ======================== 欧式 ======================== */

export function euroHouse(b: B, w: number, d: number, floors: number, detail: number, rng: Rng, roofRole: Role = 'roof') {
  const fh = 2.4;
  b.box(0, 0, 0, w, fh, d, 'stone');
  for (let f = 1; f < floors; f++) b.box(0, f * fh, 0, w + 0.25, fh, d + 0.25, 'structure');
  const H = floors * fh;
  // 木构架
  if (floors > 1) {
    for (let f = 1; f < floors; f++) {
      for (const s of [-1, 1]) b.box(0, f * fh, s * (d / 2 + 0.13), w + 0.3, 0.14, 0.06, 'wood', { noOutline: true });
      const n = Math.max(2, Math.round(w / 1.2));
      for (let i = 0; i <= n; i++) b.box(-w / 2 + (i / n) * w, f * fh, d / 2 + 0.14, 0.12, fh, 0.05, 'wood', { noOutline: true });
      if (detail > 0.5) b.add('box', 0, f * fh + fh / 2, d / 2 + 0.15, 0.1, fh * 1.1, 0.04, 'wood', { rz: 0.7, noOutline: true });
    }
  }
  b.box(0, 0, d / 2 + 0.02, 0.9, 1.9, 0.06, 'wood');
  for (let f = 0; f < floors; f++) for (const s of [-1, 1]) b.box(s * w * 0.3, f * fh + 1.0, d / 2 + 0.14, 0.6, 0.8, 0.06, 'emissive', { noOutline: true });
  const rh = w * 0.75;
  b.add('wedge', 0, H + rh / 2, 0, w + 0.7, rh, d + 0.6, roofRole);
  b.box(w * 0.25, H, -d * 0.15, 0.5, rh * 0.95, 0.5, 'stone');
  if (detail > 0.65 && rng() > 0.4) b.box(-w / 2 - 0.3, 0, 0.4, 0.5, 0.8, 0.5, 'wood');
}

export function tower(b: B, r: number, h: number, crenel: boolean) {
  b.cyl(0, 0, 0, r, h, 'stone', 1);
  if (crenel) {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      b.box(Math.cos(a) * r * 0.9, h, Math.sin(a) * r * 0.9, 0.4, 0.5, 0.4, 'stone');
    }
  } else {
    b.add('cylinder', 0, h + r * 1.1, 0, r * 2.5, r * 2.2, r * 2.5, 'roof', { args: [0] });
  }
  b.box(0, h * 0.55, r * 0.98, 0.4, 0.7, 0.08, 'emissive', { noOutline: true });
}

export function castleWall(b: B, len: number, h = 3) {
  b.box(0, 0, 0, len, h, 1.2, 'stone');
  const n = Math.round(len / 0.9);
  for (let i = 0; i < n; i += 2) b.box(-len / 2 + (i + 0.5) * (len / n), h, 0.35, len / n, 0.55, 0.5, 'stone');
}

/* ======================== 现代街道 ======================== */

export function shop(b: B, w: number, d: number, floors: number, rng: Rng, signRole: Role = 'accent') {
  const fh = 3;
  const H = floors * fh;
  b.box(0, 0, 0, w, H, d, 'structure');
  b.box(0, 0.05, d / 2 + 0.01, w * 0.8, 2.2, 0.06, 'glass', { noOutline: true });
  b.add('wedge', 0, 2.75, d / 2 + 0.6, w * 0.9, 0.4, 1.2, signRole, { rx: -Math.PI / 2 + 0.25 });
  b.box(0, 3.2, d / 2 + 0.05, w * 0.6, 0.5, 0.1, 'emissive');
  for (let f = 1; f < floors; f++) {
    const n = Math.max(1, Math.round(w / 1.6));
    for (let i = 0; i < n; i++) b.box(-w / 2 + ((i + 0.5) / n) * w, f * fh + 0.9, d / 2 + 0.02, 0.9, 1.2, 0.05, rng() > 0.5 ? 'emissive' : 'glass', { noOutline: true });
  }
  b.box(0, H, 0, w + 0.1, 0.3, d + 0.1, 'trim');
  if (rng() > 0.5) b.box(w * 0.25, H + 0.3, 0, 0.8, 0.8, 0.8, 'metal');
}

export function streetLamp(b: B, x: number, z: number) {
  b.cyl(x, 0, z, 0.06, 3.2, 'metal');
  b.box(x, 3.2, z, 0.5, 0.08, 0.12, 'metal');
  b.box(x + 0.22, 2.95, z, 0.3, 0.25, 0.3, 'emissive');
}

export function stall(b: B, w: number, rng: Rng) {
  b.box(0, 0, 0, w, 0.9, 0.9, 'wood');
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.cyl(s * (w / 2 - 0.05), 0, t * 0.4, 0.04, 2.2, 'wood');
  b.add('wedge', 0, 2.4, 0, w + 0.3, 0.45, 1.3, 'cloth');
  for (let k = 0; k < 4; k++) b.ball(-w / 2 + 0.3 + k * (w - 0.6) / 3, 1.0, 0, 0.16, 0.13, 0.16, rng() > 0.5 ? 'accent' : 'flower', { noOutline: true });
}

/* ======================== 室内 ======================== */

/** 房间壳：地板 + 两面墙（剖开视角）+ 窗洞 + 踢脚线 */
export function roomShell(b: B, w: number, d: number, h: number) {
  b.box(0, -0.2, 0, w + 0.4, 0.2, d + 0.4, 'wood');
  // 后墙（带窗）
  const wx = w * 0.18, ww = 1.6, wy = 1.0, wh = 1.3;
  b.box(-w / 4 - wx / 2 - ww / 4, 0, -d / 2, w / 2 - ww / 2 + wx, h, 0.2, 'structure');
  b.box(w / 4 + ww / 4 + wx / 2, 0, -d / 2, w / 2 - ww / 2 - wx, h, 0.2, 'structure');
  b.box(wx, 0, -d / 2, ww, wy, 0.2, 'structure');
  b.box(wx, wy + wh, -d / 2, ww, h - wy - wh, 0.2, 'structure');
  b.box(wx, wy, -d / 2, ww, 0.06, 0.32, 'trim');
  // 左墙
  b.box(-w / 2, 0, 0, 0.2, h, d, 'structure');
  b.box(0, 0, -d / 2 + 0.12, w, 0.15, 0.04, 'trim', { noOutline: true });
  b.box(-w / 2 + 0.12, 0, 0, 0.04, 0.15, d, 'trim', { noOutline: true });
}

export function bed(b: B) {
  b.box(0, 0, 0, 1.5, 0.45, 2.1, 'wood');
  b.box(0, 0.45, 0.1, 1.4, 0.2, 1.8, 'cloth');
  b.box(0, 0.45, -0.8, 1.2, 0.18, 0.35, 'paper');
  b.box(0, 0, -1.05, 1.5, 1.1, 0.1, 'wood');
}
export function desk(b: B) {
  b.box(0, 0.72, 0, 1.4, 0.06, 0.7, 'wood');
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.box(s * 0.62, 0, t * 0.28, 0.06, 0.72, 0.06, 'wood');
  b.box(-0.4, 0.78, -0.1, 0.4, 0.06, 0.3, 'paper', { noOutline: true });
  b.cyl(0.45, 0.78, -0.15, 0.08, 0.35, 'metal');
  b.ball(0.45, 1.15, -0.15, 0.13, 0.1, 0.13, 'emissive');
}
export function chair(b: B) {
  b.box(0, 0.42, 0, 0.45, 0.05, 0.45, 'wood');
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.box(s * 0.19, 0, t * 0.19, 0.04, 0.42, 0.04, 'wood');
  b.box(0, 0.47, -0.2, 0.45, 0.5, 0.04, 'wood');
}
export function shelf(b: B, rng: Rng) {
  b.box(0, 0, 0, 1.2, 1.9, 0.35, 'wood');
  for (let r = 0; r < 4; r++) {
    let x = -0.5;
    while (x < 0.5) {
      const bw = 0.05 + rng() * 0.06;
      const bh = 0.25 + rng() * 0.12;
      const roles: Role[] = ['accent', 'cloth', 'character', 'interactive', 'paper', 'trim'];
      b.box(x + bw / 2, 0.08 + r * 0.45, 0.04, bw, bh, 0.24, roles[Math.floor(rng() * roles.length)], { noOutline: true });
      x += bw + 0.01;
    }
  }
}
export function pottedPlant(b: B, x: number, z: number, s = 1) {
  b.cyl(x, 0, z, 0.18 * s, 0.35 * s, 'stone', 0.8);
  b.ball(x, 0.6 * s, z, 0.32 * s, 0.38 * s, 0.32 * s, 'foliage', { sway: 0.3 });
}
export function rug(b: B, w: number, d: number) {
  b.box(0, 0, 0, w, 0.03, d, 'cloth', { noOutline: true });
  b.box(0, 0.005, 0, w * 0.8, 0.03, d * 0.8, 'accent', { noOutline: true });
}

/* ======================== 科幻 / 工业 ======================== */

export function corridorModule(b: B, len: number, w: number, h: number, detail: number) {
  b.box(0, -0.2, 0, w, 0.2, len, 'metal');
  for (let i = 0; i < Math.round(len / 1.2); i++) b.box(0, 0.001, -len / 2 + (i + 0.5) * 1.2, w * 0.9, 0.02, 0.06, 'trim', { noOutline: true });
  for (const s of [-1, 1]) {
    b.box(s * (w / 2), 0, 0, 0.3, h, len, 'structure');
    b.box(s * (w / 2 - 0.16), 0.2, 0, 0.04, 0.06, len, 'emissive', { noOutline: true });
    if (detail > 0.3) {
      for (let k = 0; k < 2; k++) b.add('cylinder', s * (w / 2 - 0.3 - k * 0.18), h * (0.7 + k * 0.08), 0, 0.14, len, 0.14, 'metal', { rx: Math.PI / 2 });
    }
    for (let i = 0; i < Math.round(len / 2); i++) b.box(s * (w / 2 - 0.17), h * 0.35, -len / 2 + (i + 0.5) * 2, 0.06, h * 0.3, 1.4, 'trim');
  }
}
export function console_(b: B) {
  b.box(0, 0, 0, 1.2, 0.9, 0.6, 'metal');
  b.add('box', 0, 1.0, 0.05, 1.1, 0.06, 0.55, 'emissive', { rx: -0.5, noOutline: true });
  b.box(0, 0.9, -0.25, 1.2, 0.7, 0.1, 'structure');
  b.add('box', 0, 1.25, -0.19, 0.9, 0.45, 0.02, 'emissive', { noOutline: true });
}
export function scifiDoor(b: B, w = 1.8, h = 2.6) {
  b.box(0, 0, 0, w + 0.6, h + 0.4, 0.3, 'structure');
  b.box(0, 0, 0.1, w, h, 0.2, 'metal');
  b.box(0, h * 0.5, 0.21, w * 0.08, h * 0.9, 0.02, 'accent', { noOutline: true });
  b.box(w * 0.6, 1.2, 0.18, 0.2, 0.3, 0.05, 'emissive', { noOutline: true });
}
export function tank(b: B, r: number, h: number) {
  b.cyl(0, 0, 0, r, h, 'metal');
  b.ball(0, h, 0, r, r * 0.5, r, 'metal');
  b.cyl(r * 0.8, 0, 0, 0.06, h + 0.5, 'trim');
}
export function pipeRun(b: B, len: number, y: number, r = 0.12) {
  b.add('cylinder', 0, y, 0, r * 2, len, r * 2, 'metal', { rz: Math.PI / 2 });
  for (let i = 0; i <= Math.round(len / 2); i++) b.box(-len / 2 + i * 2, 0, 0, 0.12, y, 0.12, 'trim');
}

/* ======================== 自然补充 ======================== */

export function palm(b: B, h: number, rng: Rng) {
  const n = 6;
  let x = 0, y = 0;
  const lean = 0.12 + rng() * 0.15;
  for (let i = 0; i < n; i++) {
    const seg = h / n;
    b.add('cylinder', x, y + seg / 2, 0, 0.26 - i * 0.02, seg * 1.05, 0.26 - i * 0.02, 'trunk', { args: [0.85], rz: -lean });
    x += Math.sin(lean) * seg;
    y += Math.cos(lean) * seg;
  }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rng();
    b.add('sphere', x + Math.cos(a) * 0.9, y - 0.1, Math.sin(a) * 0.9, 2.0, 0.18, 0.55, 'foliage', { ry: -a, rz: -0.35, sway: 1 });
  }
  b.ball(x, y, 0, 0.25, 0.25, 0.25, 'trunk');
}
export function cactus(b: B, h: number, rng: Rng) {
  b.cyl(0, 0, 0, 0.22, h, 'foliage2', 0.9);
  b.ball(0, h, 0, 0.2, 0.15, 0.2, 'foliage2');
  for (const s of [-1, 1]) {
    if (rng() < 0.3) continue;
    const y = h * (0.35 + rng() * 0.25);
    b.add('cylinder', s * 0.35, y, 0, 0.14, 0.4, 0.14, 'foliage2', { rz: Math.PI / 2 });
    b.cyl(s * 0.5, y, 0, 0.13, h * 0.35, 'foliage2', 0.9);
  }
  if (rng() > 0.6) b.ball(0, h + 0.15, 0, 0.08, 0.08, 0.08, 'flower', { noOutline: true });
}
export function brokenColumn(b: B, h: number, rng: Rng) {
  b.box(0, 0, 0, 0.9, 0.3, 0.9, 'stone');
  b.cyl(0, 0.3, 0, 0.3, h, 'stone', 0.92, { rz: (rng() - 0.5) * 0.1 });
  if (rng() > 0.5) b.add('cylinder', 0.9, 0.3, 0.3, 0.6, 1.2, 0.6, 'stone', { rz: Math.PI / 2, ry: rng() * 3 });
}
export function boat(b: B, len: number, sail: boolean) {
  b.add('wedge', 0, 0.35, 0, len * 0.38, 0.7, len, 'wood', { rz: Math.PI, args: [] });
  b.box(0, 0.62, 0, len * 0.36, 0.08, len * 0.92, 'wood');
  if (sail) {
    b.cyl(0, 0.6, 0, 0.05, len * 0.9, 'wood');
    b.add('wedge', 0, 0.6 + len * 0.5, len * 0.05, 0.04, len * 0.75, len * 0.55, 'cloth', { rx: 0, sway: 0.4 });
  }
}
export function pierSegment(b: B, len: number, w: number, y: number) {
  b.box(0, y, 0, w, 0.18, len, 'wood');
  for (let i = 0; i <= Math.round(len / 2); i++) for (const s of [-1, 1]) b.cyl(s * (w / 2 - 0.1), y - 2.2, -len / 2 + i * 2, 0.1, 2.5, 'wood');
}
export function crateStack(b: B, rng: Rng) {
  b.box(0, 0, 0, 0.8, 0.8, 0.8, 'wood', { ry: rng() * 0.5 });
  if (rng() > 0.3) b.box(0.15, 0.8, 0, 0.6, 0.6, 0.6, 'wood', { ry: rng() * 0.8 });
  if (rng() > 0.5) b.cyl(0.9, 0, 0.2, 0.28, 0.7, 'wood', 0.9);
}
export function logPile(b: B, rng: Rng) {
  for (let k = 0; k < 3; k++) b.add('cylinder', 0, 0.18 + (k === 2 ? 0.3 : 0), (k - (k === 2 ? 1.5 : 0.5)) * 0.36, 0.34, 1.6, 0.34, 'trunk', { rz: Math.PI / 2, ry: rng() * 0.2 });
}
export function torch(b: B, x: number, z: number) {
  b.cyl(x, 0, z, 0.05, 1.2, 'wood');
  b.ball(x, 1.3, z, 0.12, 0.18, 0.12, 'emissive');
}
export function crystalCluster(b: B, rng: Rng) {
  for (let k = 0; k < 4; k++) {
    const a = rng() * Math.PI * 2;
    b.add('pyramid', Math.cos(a) * 0.25, 0.35, Math.sin(a) * 0.25, 0.25, 0.7 + rng() * 0.6, 0.25, 'emissive', { rx: (rng() - 0.5) * 0.6, rz: (rng() - 0.5) * 0.6 });
  }
}
