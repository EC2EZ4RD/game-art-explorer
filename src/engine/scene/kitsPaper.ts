import * as THREE from 'three';
import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { num, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import type { Item } from './types';

/*
 * 纸艺与剧场的套件（技术补全 2026-10-23，H 轨道）：
 *   纸片（Flat）：在「卡面」坐标里（XY 平面、卡面法线 +z）用圆片 / 三角 / 矩形 / 圆弧拼剪影，每片是有厚度的实体，
 *     可选白色纸芯描边（背后垫一片放大的纸色卡，像 Paper Mario 的贴纸人物）、叠层贴片（窗、眼睛 = 再贴一层纸）、双面（纸片人的正反面）；
 *   placeGroup：把一组图元整体刚体变换（纸片的后仰 / 扭转 = 「纸片微微翘起」）；
 *   纸片人、纸片小怪、纸片树、纸片山丘、纸片云、纸房子、支架与粘贴片……
 * 全部是带颜色角色的图元：色板、描边、低模 / 体素、阴影照常生效，纸片之间按 z 错开，互相投影。
 */

export type V3 = [number, number, number];

/** 纸片厚度与纸芯描边宽度：体素表示时至少一个体素厚（不然薄片被体素化吃掉），描边也至少一格 */
export interface PaperOpts { t: number; e: number }
export function paperOpts(v: Values): PaperOpts {
  if (str(v, 'geometry.representation') === 'voxel') {
    const s = num(v, 'geometry.voxelSize');
    return { t: s * 1.05, e: s * 0.9 };
  }
  return { t: 0.06, e: 0.045 };
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** 一组图元整体刚体变换（先绕 XYZ 旋转再平移） */
export function placeGroup(items: Item[], pos: V3, rot: V3 = [0, 0, 0]): Item[] {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  return items.map((it) => {
    _v.set(it.pos[0], it.pos[1], it.pos[2]).applyQuaternion(_q);
    _e.set(...(it.rot ?? [0, 0, 0]));
    _q2.setFromEuler(_e).premultiply(_q);
    _e.setFromQuaternion(_q2, 'XYZ');
    return { ...it, pos: [_v.x + pos[0], _v.y + pos[1], _v.z + pos[2]] as V3, rot: [_e.x, _e.y, _e.z] as V3 };
  });
}

export interface PieceOpts {
  /** 叠层：0 = 底卡，1、2 = 再贴一层（每层往外凸 0.7 个厚度） */
  lvl?: number;
  /** 纸芯描边：true = 用 Flat 的默认（纸色），也可以给角色色；false = 不垫 */
  border?: boolean | Role;
  /** 绕卡面法线的旋转（弧度） */
  rz?: number;
  /** 不描边（细小的贴片） */
  noOutline?: boolean;
  sway?: number;
}

/**
 * 纸片：卡面坐标 XY，卡面朝 +z。double = 双面（叠层贴片在背面镜像一份；底卡居中，正反都看得到）。
 * 默认 border 跟构造参数走（人物 / 小道具有白边，大布景没有）
 */
export class Flat {
  items: Item[] = [];
  constructor(public o: PaperOpts, public id: number, public opts: { border?: boolean | Role; double?: boolean; flat?: boolean } = {}) {}

  private zOf(lvl: number) { return lvl * this.o.t * 0.7; }
  private push(it: Item, lvl: number, border: boolean | Role | undefined, grow: (e: number) => Partial<Item>) {
    const t = this.o.t, dbl = !!this.opts.double;
    const z = this.zOf(lvl);
    const base: Item = { ...it, id: this.id, flat: this.opts.flat ?? true };
    const faceT = lvl > 0 ? t * 0.55 : t;
    this.items.push({ ...base, pos: [it.pos[0], it.pos[1], z], scale: withDepth(it, faceT) });
    if (dbl && lvl > 0) this.items.push({ ...base, pos: [it.pos[0], it.pos[1], -z], scale: withDepth(it, faceT) });
    const b = border ?? this.opts.border;
    if (b && lvl === 0) {
      const g = grow(this.o.e);
      const bt = dbl ? t * 0.6 : t * 0.8;
      const bz = dbl ? 0 : -t * 0.6;
      const gi: Item = { ...base, ...g, role: b === true ? 'paper' : b, noOutline: false };
      this.items.push({ ...gi, pos: [(g.pos ?? it.pos)[0], (g.pos ?? it.pos)[1], bz], scale: withDepth(gi, bt) });
    }
  }

  /** 圆片 / 椭圆片：中心 (x, y)，半径 r，sy = 纵向倍数 */
  disc(x: number, y: number, r: number, role: Role, o: PieceOpts & { sy?: number; arc?: number } = {}) {
    const sy = o.sy ?? 1;
    const it: Item = { prim: 'cylinder', args: [1], pos: [x, y, 0], rot: discRot(o.rz ?? 0), scale: [r * 2, 0, r * 2 * sy], role, noOutline: o.noOutline, sway: o.sway };
    this.push(it, o.lvl ?? 0, o.border, (e) => ({ scale: [(r + e) * 2, 0, (r * sy + e) * 2] }));
    return this;
  }

  /** 等腰三角：底边中点 (x, y)，底宽 w、高 h；rz 绕底边中点转 */
  tri(x: number, y: number, w: number, h: number, role: Role, o: PieceOpts = {}) {
    const rz = o.rz ?? 0, c = Math.cos(rz), s = Math.sin(rz);
    const at = (dy: number): V3 => [x - s * dy, y + c * dy, 0];
    const it: Item = { prim: 'wedge', pos: at(h / 2), rot: [0, 0, rz], scale: [w, h, 0], role, noOutline: o.noOutline, sway: o.sway };
    // 白边：按内切圆心放大（三边各外移 e）
    const side = Math.hypot(w / 2, h), rin = (w * h) / (w + 2 * side), k = (rin + this.o.e) / rin;
    this.push(it, o.lvl ?? 0, o.border, () => ({ pos: at(rin + (h / 2 - rin) * k), scale: [w * k, h * k, 0] }));
    return this;
  }

  /** 矩形：底边中点 (x, y)，宽 w、高 h；rz 绕底边中点转 */
  rect(x: number, y: number, w: number, h: number, role: Role, o: PieceOpts = {}) {
    const rz = o.rz ?? 0, c = Math.cos(rz), s = Math.sin(rz);
    const at = (dy: number): V3 => [x - s * dy, y + c * dy, 0];
    const it: Item = { prim: 'box', args: [0], pos: at(h / 2), rot: [0, 0, rz], scale: [w, h, 0], role, noOutline: o.noOutline, sway: o.sway };
    this.push(it, o.lvl ?? 0, o.border, (e) => ({ scale: [w + e * 2, h + e * 2, 0] }));
    return this;
  }

  /** 圆弧条（彩虹、拱门、弯月）：圆心 (x, y)，外半径 r，条宽 band，从 a0 转过 arc（弧度） */
  arc(x: number, y: number, r: number, band: number, role: Role, a0 = 0, arc = Math.PI, o: PieceOpts = {}) {
    // TorusGeometry(0.5 − tube, tube)：外半径 0.5、环宽 2·tube（单位空间），放大 2r 后环宽 = 4r·tube
    const it: Item = { prim: 'torus', args: [band / (4 * r), arc], pos: [x, y, 0], rot: [0, 0, a0], scale: [r * 2, r * 2, 0], role, noOutline: o.noOutline };
    this.push(it, o.lvl ?? 0, o.border, (e) => ({ args: [(band + 2 * e) / (4 * (r + e)), arc], scale: [(r + e) * 2, (r + e) * 2, 0] }));
    return this;
  }

  /** 摆到世界里：pos = 卡面原点，rot = 后仰 / 扭转 / 卡面旋转 */
  place(pos: V3, rot: V3 = [0, 0, 0]): Item[] {
    return placeGroup(this.items, pos, rot);
  }
}

/** 把卡面坐标里的「厚度」写进缩放：圆片（圆柱绕 x 转了 90°）的厚度在 y 分量；圆环的截面是圆，z 向厚度 = 2·tube·sz；其余在 z */
function withDepth(it: Item, d: number): V3 {
  if (it.prim === 'cylinder') return [it.scale[0], d, it.scale[2]];
  if (it.prim === 'torus') return [it.scale[0], it.scale[1], d / (2 * Math.max(1e-3, it.args?.[0] ?? 0.15))];
  return [it.scale[0], it.scale[1], d];
}

/** 圆片的旋转：先把圆柱轴转到 z（卡面法线），再绕 z 转 rz（椭圆片在卡面里的朝向） */
const _qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const _qz = new THREE.Quaternion();
const _ez = new THREE.Vector3(0, 0, 1);
function discRot(rz: number): V3 {
  if (!rz) return [Math.PI / 2, 0, 0];
  _qz.setFromAxisAngle(_ez, rz).multiply(_qx);
  _e.setFromQuaternion(_qz, 'XYZ');
  return [_e.x, _e.y, _e.z];
}

/* ======================== 纸片角色 ======================== */

/**
 * 双面纸片人（玩家）：卡面在角色的 YZ 平面（角色局部 x 方向很薄），所以朝右走时镜头看到一面、朝左走时看到另一面，
 * 转身时（引擎按朝向插值转 180°）会经过「侧对镜头只剩一条线」的那一刻——纸片翻面。两面都印着人物（正面 / 背面各一层贴片），鼻子朝前进方向。
 * 身高约 1.2，脚底在原点。
 */
export function paperHero(o: PaperOpts, id = 2): Item[] {
  const f = new Flat(o, id, { border: true, double: true, flat: true });
  // 鞋、腿、身子、背带裤、手套、头、鼻子、眼睛、帽子、帽檐、头发、围巾
  f.disc(-0.1, 0.07, 0.12, 'trunk', { sy: 0.55 }).disc(0.13, 0.07, 0.12, 'trunk', { sy: 0.55 });
  f.rect(0, 0.08, 0.3, 0.26, 'cloth');
  f.disc(0, 0.47, 0.25, 'character', { sy: 1.05 });
  f.rect(0, 0.26, 0.44, 0.17, 'cloth', { lvl: 1 });
  f.rect(-0.1, 0.38, 0.06, 0.26, 'cloth', { lvl: 1, rz: 0.15 });
  f.disc(0.05, 0.36, 0.04, 'interactive', { lvl: 2, noOutline: true });
  f.disc(0.22, 0.42, 0.085, 'paper', { lvl: 2 });
  f.disc(0.03, 0.86, 0.22, 'skin');
  f.disc(-0.13, 0.86, 0.1, 'trunk', { lvl: 1 });
  f.disc(0.23, 0.82, 0.075, 'skin', { lvl: 1 });
  f.disc(0.13, 0.91, 0.026, 'ink', { lvl: 2, sy: 2.1, noOutline: true });
  f.rect(0.16, 0.74, 0.11, 0.025, 'ink', { lvl: 2, rz: 0.15, noOutline: true });
  f.disc(0.0, 1.0, 0.21, 'characterAccent', { lvl: 1, sy: 0.62 });
  f.rect(0.16, 0.94, 0.26, 0.05, 'characterAccent', { lvl: 1, rz: -0.08 });
  f.disc(0.0, 1.06, 0.055, 'paper', { lvl: 2 });
  f.tri(-0.2, 0.66, 0.12, 0.3, 'accent', { lvl: 1, rz: 1.9 });
  // 卡面 XY → 角色局部 YZ：绕 y 转 −90°（卡面 +x 鼻子方向 → 角色前方 +z，卡面法线 +z → 角色 −x，朝右走时正对镜头）
  return placeGroup(f.items, [0, 0, 0], [0, -Math.PI / 2, 0]);
}

/** 纸片小怪（蘑菇头、怒眉、小脚）：正对镜头的单面纸片，dir = −1 朝左看；高约 0.75 × s */
export function paperGoon(o: PaperOpts, id: number, dir = -1, s = 1, body: Role = 'accent'): Flat {
  const f = new Flat(o, id, { border: true });
  const k = dir * s;
  f.disc(-0.14 * k, 0.06 * s, 0.11 * s, 'trunk', { sy: 0.55 }).disc(0.14 * k, 0.06 * s, 0.11 * s, 'trunk', { sy: 0.55 });
  f.rect(0, 0.08 * s, 0.3 * s, 0.2 * s, 'sand');
  f.disc(0, 0.42 * s, 0.36 * s, body, { sy: 0.72 });
  f.disc(0.1 * k, 0.4 * s, 0.07 * s, 'paper', { lvl: 1, sy: 1.4 }).disc(0.26 * k, 0.4 * s, 0.065 * s, 'paper', { lvl: 1, sy: 1.4 });
  f.disc(0.12 * k, 0.38 * s, 0.035 * s, 'ink', { lvl: 2, sy: 1.5, noOutline: true }).disc(0.27 * k, 0.38 * s, 0.033 * s, 'ink', { lvl: 2, sy: 1.5, noOutline: true });
  f.rect(0.1 * k, 0.5 * s, 0.14 * s, 0.035 * s, 'ink', { lvl: 2, rz: -0.45 * dir, noOutline: true });
  f.rect(0.27 * k, 0.5 * s, 0.13 * s, 0.035 * s, 'ink', { lvl: 2, rz: 0.4 * dir, noOutline: true });
  f.disc(-0.16 * k, 0.6 * s, 0.07 * s, 'paper', { lvl: 1 });
  return f;
}

/** 纸片村民（圆身子 + 尖帽），朝 dir 看；高约 1.0 */
export function paperVillager(o: PaperOpts, id: number, dir = 1, robe: Role = 'cloth', hat: Role = 'roof'): Flat {
  const f = new Flat(o, id, { border: true });
  f.disc(0, 0.32, 0.3, robe, { sy: 1.05 });
  f.rect(0, 0.0, 0.42, 0.22, robe);
  f.disc(0.04 * dir, 0.72, 0.19, 'skin');
  f.tri(0, 0.82, 0.46, 0.36, hat, { lvl: 1 });
  f.disc(0.12 * dir, 0.72, 0.024, 'ink', { lvl: 1, sy: 2, noOutline: true });
  f.disc(-0.02 * dir, 0.25, 0.08, 'paper', { lvl: 1 });
  return f;
}

/** 纸片金币：圆片 + 内圈 + 竖条，浮在半空 */
export function paperCoin(o: PaperOpts, id: number, r = 0.22): Flat {
  return new Flat(o, id, { border: true }).disc(0, 0, r, 'emissive').disc(0, 0, r * 0.72, 'interactive', { lvl: 1 }).rect(0, -r * 0.45, r * 0.22, r * 0.9, 'emissive', { lvl: 2, noOutline: true });
}

/* ======================== 纸片布景 ======================== */

/** 树：树干 + 三个圆片树冠（叠层）或三层三角（松） */
export function paperTree(o: PaperOpts, id: number, h: number, kind: 'round' | 'pine', rng: Rng, leaf: Role = 'foliage'): Flat {
  const f = new Flat(o, id, { border: rng() < 0.5 ? 'paper' : false });
  f.rect(0, 0, h * 0.12, h * 0.55, 'trunk');
  if (kind === 'round') {
    const r = h * 0.3;
    f.disc(-r * 0.55, h * 0.62, r * 0.75, leaf).disc(r * 0.55, h * 0.64, r * 0.78, leaf).disc(0, h * 0.82, r * 0.9, leaf);
    // 叶片上的高光圆点（再贴一层纸）
    for (let k = 0; k < 3; k++) f.disc((rng() - 0.5) * r * 1.4, h * (0.62 + rng() * 0.28), r * (0.12 + rng() * 0.08), 'foliage2', { lvl: 1, noOutline: true });
  } else {
    for (let k = 0; k < 3; k++) f.tri(0, h * (0.3 + k * 0.2), h * (0.62 - k * 0.14), h * 0.42, k % 2 ? 'foliage2' : leaf);
  }
  return f;
}

/** 灌木：一排三五个圆片，压在地面一条矩形上 */
export function paperBush(o: PaperOpts, id: number, w: number, rng: Rng, role: Role = 'foliage'): Flat {
  const f = new Flat(o, id, { border: 'paper' });
  const n = Math.max(2, Math.round(w / 0.55));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n), r = 0.32 + rng() * 0.18;
    f.disc(x, r * 0.6, r, role);
  }
  f.rect(0, 0, w, 0.25, role);
  if (rng() < 0.6) for (let k = 0; k < 3; k++) f.disc(-w / 2 + rng() * w, 0.35 + rng() * 0.3, 0.07, 'flower', { lvl: 1, noOutline: true });
  return f;
}

/** 山丘：半圆片（下半截藏在地面以下），上面贴圆点或条纹 */
export function paperHill(o: PaperOpts, id: number, r: number, role: Role, deco: Role, rng: Rng, pattern: 'dots' | 'stripes' | 'none' = 'dots'): Flat {
  const f = new Flat(o, id);
  f.disc(0, 0, r, role, { sy: 0.85 });
  if (pattern === 'dots') for (let k = 0; k < Math.round(r * 2.2); k++) {
    const a = 0.25 + rng() * (Math.PI - 0.5), d = r * (0.25 + rng() * 0.55);
    f.disc(Math.cos(a) * d, Math.sin(a) * d * 0.85, r * (0.05 + rng() * 0.04), deco, { lvl: 1, noOutline: true });
  } else if (pattern === 'stripes') for (let k = 1; k <= 3; k++) f.arc(0, 0, r * (1 - k * 0.22), r * 0.07, deco, 0, Math.PI, { lvl: 1, noOutline: true });
  return f;
}

/** 远山：三角 + 雪顶（再贴一层） */
export function paperMountain(o: PaperOpts, id: number, w: number, h: number, role: Role, cap: Role = 'snow'): Flat {
  const f = new Flat(o, id);
  f.tri(0, 0, w, h, role);
  f.tri(0, h * 0.62, w * 0.38 * 0.98, h * 0.38, cap, { lvl: 1 });
  return f;
}

/** 云：一排圆片 + 平底 */
export function paperCloud(o: PaperOpts, id: number, w: number, rng: Rng, role: Role = 'cloud'): Flat {
  const f = new Flat(o, id, { border: 'paper' });
  const n = 3 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n), mid = 1 - Math.abs(k - (n - 1) / 2) / n;
    f.disc(x, 0.15 + mid * 0.35, w * (0.16 + mid * 0.1), role);
  }
  f.rect(0, 0, w * 0.95, 0.3, role);
  return f;
}

/** 太阳：圆片 + 一圈三角光芒 */
export function paperSun(o: PaperOpts, id: number, r: number, role: Role = 'emissive'): Flat {
  const f = new Flat(o, id);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    f.tri(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, r * 0.42, r * 0.5, role, { rz: a - Math.PI / 2 });
  }
  f.disc(0, 0, r, role, { lvl: 1 });
  f.disc(0, 0, r * 0.7, 'flower', { lvl: 2, noOutline: true });
  return f;
}

/** 纸房子：墙 + 三角屋顶 + 门窗（叠层），宽 w、墙高 h */
export function paperHouse(o: PaperOpts, id: number, w: number, h: number, wall: Role, roof: Role, rng: Rng): Flat {
  const f = new Flat(o, id, { border: 'paper' });
  f.rect(0, 0, w, h, wall);
  f.tri(0, h - 0.05, w * 1.25, w * 0.62, roof);
  f.rect(w * 0.18, 0, w * 0.24, h * 0.55, 'wood', { lvl: 1 });
  f.disc(w * 0.25, h * 0.27, 0.03, 'interactive', { lvl: 2, noOutline: true });
  const win = (x: number, y: number) => { f.rect(x, y, w * 0.22, w * 0.22, 'glass', { lvl: 1 }); f.rect(x, y + w * 0.1, w * 0.22, 0.03, 'trim', { lvl: 2, noOutline: true }); };
  win(-w * 0.22, h * 0.45);
  if (h > 1.6) win(w * 0.2, h * 0.68);
  // 烟囱
  if (rng() < 0.6) f.rect(-w * 0.3, h + w * 0.12, w * 0.13, w * 0.4, wall);
  return f;
}

/** 栅栏：尖头木条 + 两根横档 */
export function paperFence(o: PaperOpts, id: number, w: number, role: Role = 'wood'): Flat {
  const f = new Flat(o, id, { border: 'paper' });
  const n = Math.max(2, Math.round(w / 0.32));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n);
    f.rect(x, 0, 0.18, 0.62, role);
    f.tri(x, 0.62, 0.18, 0.14, role);
  }
  f.rect(0, 0.18, w, 0.07, role, { lvl: 1 });
  f.rect(0, 0.46, w, 0.07, role, { lvl: 1 });
  return f;
}

/** 花：茎 + 花瓣圆片 + 花心 */
export function paperFlower(o: PaperOpts, id: number, h: number, petal: Role = 'flower'): Flat {
  const f = new Flat(o, id, { border: 'paper' });
  f.rect(0, 0, 0.05, h, 'foliage');
  f.disc(0.1, h * 0.45, 0.08, 'foliage', { sy: 0.5, rz: 0.5 });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; f.disc(Math.cos(a) * 0.1, h + Math.sin(a) * 0.1, 0.075, petal); }
  f.disc(0, h, 0.065, 'emissive', { lvl: 1 });
  return f;
}

/**
 * 卷边的蕨叶：一根茎 + 两排叶片，分两节——下半节直立，上半节往前（+z）卷过来 curl 弧度（纸被弯过的样子）。
 * 返回已经摆好的图元（原点 = 茎的底）
 */
export function paperFern(o: PaperOpts, id: number, h: number, curl: number, role: Role = 'foliage'): Item[] {
  const seg = (y0: number, len: number) => {
    const f = new Flat(o, id, { border: 'paper' });
    f.rect(0, 0, 0.05, len, 'foliage2');
    for (let k = 0; k < 4; k++) {
      const y = len * (0.15 + k * 0.22), w = 0.28 * (1 - (y0 + y) / (h * 1.3));
      f.disc(-w * 0.55, y, w * 0.5, role, { sy: 0.45, rz: 0.5 }).disc(w * 0.55, y, w * 0.5, role, { sy: 0.45, rz: -0.5 });
    }
    return f;
  };
  const L = h / 2;
  const lower = seg(0, L).place([0, 0, 0]);
  // 上半节：绕卡面底边（y = L）往前折 curl
  const upper = placeGroup(seg(L, L).items, [0, L, 0], [curl, 0, 0]);
  return [...lower, ...upper];
}

/** 草边：一排锯齿（剪刀剪出来的草叶），底边在 y = 0 */
export function paperGrassEdge(o: PaperOpts, id: number, w: number, h: number, rng: Rng, role: Role = 'grass'): Flat {
  const f = new Flat(o, id);
  const n = Math.max(2, Math.round(w / (h * 0.7)));
  for (let k = 0; k < n; k++) f.tri(-w / 2 + (k + 0.5) * (w / n), 0, (w / n) * 1.25, h * (0.7 + rng() * 0.5), role, { rz: (rng() - 0.5) * 0.25 });
  return f;
}

/**
 * 支架：立着的纸片背后一根斜撑（从卡背斜到地面）+ 卡脚前面折出来贴在地上的一小片（纸剧场的「粘贴片」）。
 * x = 卡面中心 x，z = 卡面 z，h = 撑到多高，role = 纸板色
 */
export function paperStand(items: Item[], o: PaperOpts, id: number, x: number, z: number, h: number, w = 0.4, role: Role = 'wood') {
  const lean = 0.6, len = h / Math.cos(lean);
  items.push({ prim: 'box', args: [0], pos: [x, h / 2, z - o.t - Math.tan(lean) * h / 2], rot: [lean, 0, 0], scale: [Math.min(0.12, w * 0.3), len, o.t], role, id, flat: true });
  items.push({ prim: 'box', args: [0], pos: [x, 0.012, z + 0.11], scale: [w, 0.02, 0.2], role: 'paper', id, flat: true });
}

/** 吊线：从 (x, y, z) 往上一根细线到 y1（布景上挂云、太阳、飞行的纸片怪） */
export function hangString(items: Item[], x: number, y: number, z: number, y1: number, id: number) {
  items.push({ prim: 'cylinder', args: [1], pos: [x, (y + y1) / 2, z], scale: [0.018, y1 - y, 0.018], role: 'ink', id, noOutline: true, flat: true });
}
