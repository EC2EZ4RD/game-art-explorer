import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash3 } from '../../core/rng';
import type { Item, PrimType } from './types';

/*
 * 图元 → 几何。光滑与低模走这里；体素走 inside()。
 * 所有几何都输出非索引的 BufferGeometry，带 normal（着色用）与 aOutline（描边用的平滑法线）。
 */

export type Rep = 'smooth' | 'faceted';

export interface PrimOpts {
  rep: Rep;
  segments: number;
  roundness: number;
  jitter: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function itemMatrix(it: Item, target = new THREE.Matrix4()): THREE.Matrix4 {
  _e.set(...(it.rot ?? [0, 0, 0]));
  _q.setFromEuler(_e);
  _p.set(...it.pos);
  _s.set(...it.scale);
  return target.compose(_p, _q, _s);
}

/** 生成图元的局部几何（索引几何），盒子按真实尺寸建模以保证圆角不被拉伸 */
function baseGeometry(it: Item, o: PrimOpts): { geo: THREE.BufferGeometry; scaleBaked: boolean } {
  const seg = o.rep === 'smooth' ? Math.max(o.segments, 12) : Math.max(3, Math.min(o.segments, 10));
  const a0 = it.args?.[0];
  switch (it.prim) {
    case 'box': {
      const [w, h, d] = it.scale;
      const r = Math.min(w, h, d) * 0.5 * Math.min(0.95, (a0 ?? 0.3) * o.roundness * 1.6);
      if (r > 0.004) {
        const bs = o.rep === 'smooth' ? 4 : 1;
        return { geo: new RoundedBoxGeometry(w, h, d, bs, r), scaleBaked: true };
      }
      return { geo: new THREE.BoxGeometry(w, h, d), scaleBaked: true };
    }
    case 'sphere':
      return {
        geo: o.rep === 'smooth'
          ? new THREE.SphereGeometry(0.5, seg + 4, Math.max(6, Math.round((seg + 4) * 0.6)))
          : new THREE.IcosahedronGeometry(0.5, seg >= 8 ? 1 : 0),
        scaleBaked: false,
      };
    case 'poly':
      return { geo: a0 === 1 ? new THREE.DodecahedronGeometry(0.5, 0) : new THREE.IcosahedronGeometry(0.5, 0), scaleBaked: false };
    case 'cylinder': {
      const top = a0 ?? 1;
      const radial = o.rep === 'smooth' ? seg + 6 : seg;
      return { geo: new THREE.CylinderGeometry(0.5 * top, 0.5, 1, radial, 1, false), scaleBaked: false };
    }
    case 'torus': {
      const arc = it.args?.[1] ?? Math.PI * 2;
      const rs = Math.max(6, Math.round((o.rep === 'smooth' ? 28 : 10) * (arc / (Math.PI * 2))));
      return { geo: new THREE.TorusGeometry(0.5 - (a0 ?? 0.15), a0 ?? 0.15, o.rep === 'smooth' ? 10 : 4, rs, arc), scaleBaked: false };
    }
    case 'roof':
      return { geo: roofGeometry(it.args ?? [], o.rep === 'smooth' ? 18 : 6), scaleBaked: false };
    case 'wedge': {
      const g = new THREE.BufferGeometry();
      // 三角棱柱：底边 [-0.5,0.5]，顶点在 (0,0.5)
      const v = [
        [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0, 0.5, -0.5],
        [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0, 0.5, 0.5],
      ];
      const idx = [0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5];
      g.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3));
      g.setIndex(idx);
      return { geo: g, scaleBaked: false };
    }
    case 'pyramid':
      return { geo: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4), scaleBaked: false };
  }
}

/** 三维值噪声（格点 hash + 平滑插值），0~1 */
function valueNoise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const fx = s(x - xi), fy = s(y - yi), fz = s(z - zi);
  const h = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}

/**
 * 手作歪斜：按位置取低频噪声位移。同一位置的顶点位移相同（不裂缝）；
 * 用平滑噪声而不是逐顶点随机，高分段曲面才不会皱成一团。
 */
function jitterGeometry(geo: THREE.BufferGeometry, amount: number, seed: number, scale: THREE.Vector3) {
  if (amount <= 0) return;
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const a = amount / Math.max(0.3, Math.min(scale.x, scale.y, scale.z));
  const F = 2.2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(
      i,
      x + (valueNoise3(x * F, y * F, z * F, seed) - 0.5) * a * 0.9,
      y + (valueNoise3(x * F + 17.3, y * F, z * F, seed + 1) - 0.5) * a * 0.9,
      z + (valueNoise3(x * F, y * F + 31.7, z * F, seed + 2) - 0.5) * a * 0.9,
    );
  }
}

/** 把平滑法线写进 aOutline（描边沿它挤出，硬边处也不裂） */
export function addOutlineNormals(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position');
  const acc = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const nonIdx = geo.index ? geo.toNonIndexed() : geo;
  const P = nonIdx.getAttribute('position');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const k2 = (i: number) => `${Math.round(P.getX(i) * 1e4)},${Math.round(P.getY(i) * 1e4)},${Math.round(P.getZ(i) * 1e4)}`;
  for (let i = 0; i < P.count; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)); // 面积加权
    for (let j = 0; j < 3; j++) {
      const k = k2(i + j);
      const v = acc.get(k);
      if (v) v.add(n); else acc.set(k, n.clone());
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = acc.get(key(i));
    if (v && v.lengthSq() > 0) {
      v.normalize();
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
  }
  geo.setAttribute('aOutline', new THREE.BufferAttribute(out, 3));
}

/**
 * 生成一个图元的世界空间几何（非索引），附带 aOutline。
 * 光滑：保留平滑法线；低模：面法线。
 */
export function primGeometry(it: Item, o: PrimOpts, seed: number): THREE.BufferGeometry {
  const { geo: g0, scaleBaked } = baseGeometry(it, o);
  let geo = g0;
  // 去掉 uv；没有法线的几何先按面算硬边法线，再焊接（法线不同的顶点不会被焊接，硬边得以保留）
  geo.deleteAttribute('uv');
  if (!geo.getAttribute('normal')) {
    const ni = geo.toNonIndexed();
    geo.dispose();
    geo = ni;
    geo.computeVertexNormals();
  }
  const merged = mergeVertices(geo, 1e-4);
  geo.dispose();
  geo = merged;
  _s.set(...it.scale);
  if (o.jitter > 0 && !it.flat) jitterGeometry(geo, o.jitter, seed, _s);
  // 缩放（盒子已按尺寸建模）
  if (!scaleBaked) geo.scale(it.scale[0], it.scale[1], it.scale[2]);
  // 旋转 + 平移
  _e.set(...(it.rot ?? [0, 0, 0]));
  _q.setFromEuler(_e);
  _m.compose(_p.set(...it.pos), _q, _s.set(1, 1, 1));
  geo.applyMatrix4(_m);
  geo.computeVertexNormals();
  addOutlineNormals(geo);
  const flat = geo.toNonIndexed();
  if (o.rep === 'faceted') flat.computeVertexNormals();
  geo.dispose();
  return flat;
}

/* ---------------- 体素：单位空间内外判定 ---------------- */

/** p 为图元局部单位空间坐标 */
export function insideUnit(prim: PrimType, p: THREE.Vector3, args?: number[]): boolean {
  const a0 = args?.[0];
  switch (prim) {
    case 'box':
      return Math.abs(p.x) <= 0.5 && Math.abs(p.y) <= 0.5 && Math.abs(p.z) <= 0.5;
    case 'sphere':
    case 'poly':
      return p.lengthSq() <= 0.25;
    case 'cylinder': {
      if (Math.abs(p.y) > 0.5) return false;
      const t = p.y + 0.5;
      const r = 0.5 * (1 + ((a0 ?? 1) - 1) * t);
      return p.x * p.x + p.z * p.z <= r * r;
    }
    case 'torus': {
      const tube = a0 ?? 0.15;
      const R = 0.5 - tube;
      const arc = args?.[1] ?? Math.PI * 2;
      if (arc < Math.PI * 2) {
        let ang = Math.atan2(p.y, p.x);
        if (ang < 0) ang += Math.PI * 2;
        if (ang > arc) return false;
      }
      const q = Math.hypot(p.x, p.y) - R;
      return q * q + p.z * p.z <= tube * tube;
    }
    case 'wedge':
      return Math.abs(p.z) <= 0.5 && p.y >= -0.5 && p.y <= 0.5 && Math.abs(p.x) <= 0.5 * (0.5 - p.y);
    case 'pyramid':
      return p.y >= -0.5 && p.y <= 0.5 && Math.abs(p.x) <= 0.5 * (0.5 - p.y) && Math.abs(p.z) <= 0.5 * (0.5 - p.y);
    case 'roof':
      return Math.abs(p.x) <= 0.5 && Math.abs(p.z) <= 0.5 && p.y >= -0.5 && p.y <= -0.5 + roofHeight(p.x, p.z, args ?? []);
  }
}

/** 图元世界包围盒（用于体素化遍历） */
export function itemBox(it: Item, target = new THREE.Box3()): THREE.Box3 {
  const m = itemMatrix(it);
  target.makeEmpty();
  const v = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5).applyMatrix4(m);
    target.expandByPoint(v);
  }
  return target;
}

/* ---------------- 曲面屋顶（中式坡屋面的近似） ---------------- */

/** 归一化屋面高度：0（檐口）~1（屋脊），含凹曲（举折）与角部起翘 */
export function roofHeight(x: number, z: number, args: number[]): number {
  const kind = args[0] ?? 0;
  const concave = args[1] ?? 1.5;
  const lift = args[2] ?? 0.15;
  const ax = Math.abs(x) * 2, az = Math.abs(z) * 2; // 0 中心 ~ 1 边缘
  let lin: number;
  if (kind === 1) lin = 1 - az; // 悬山/硬山：屋脊沿 x
  else if (kind === 2) lin = 1 - Math.max(ax, az); // 攒尖
  else {
    const a = kind === 3 ? 0.45 : 0.3; // 屋脊半长（歇山更长）
    const hx = ax <= a ? 1 : 1 - (ax - a) / (1 - a);
    lin = Math.min(1 - az, hx);
    if (kind === 3 && lin > 0.62) lin = Math.min(1 - az, 1); // 歇山上部做成两坡
  }
  lin = Math.max(0, Math.min(1, lin));
  let h = Math.pow(lin, concave);
  // 起翘：檐口越靠近角部抬得越高
  const corner = kind === 1 ? Math.pow(ax, 4) : Math.pow(Math.max(ax, az), 2) * Math.pow(Math.min(ax, az) + 0.0001, 1.5) * 1.6 + Math.pow(ax * az, 3);
  h += lift * Math.pow(1 - lin, 2) * Math.min(1, corner);
  return h;
}

export function roofGeometry(args: number[], seg: number): THREE.BufferGeometry {
  const n = Math.max(2, seg);
  const thick = 0.07;
  const pos: number[] = [];
  const v = (i: number, j: number, top: boolean) => {
    const x = -0.5 + i / n, z = -0.5 + j / n;
    const y = -0.5 + roofHeight(x, z, args) - (top ? 0 : thick);
    return [x, y, z];
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    quad(v(i, j, true), v(i, j + 1, true), v(i + 1, j + 1, true), v(i + 1, j, true));
    quad(v(i, j, false), v(i + 1, j, false), v(i + 1, j + 1, false), v(i, j + 1, false));
  }
  // 四周的檐口厚度
  for (let k = 0; k < n; k++) {
    quad(v(k, 0, true), v(k + 1, 0, true), v(k + 1, 0, false), v(k, 0, false));
    quad(v(k + 1, n, true), v(k, n, true), v(k, n, false), v(k + 1, n, false));
    quad(v(0, k + 1, true), v(0, k, true), v(0, k, false), v(0, k + 1, false));
    quad(v(n, k, true), v(n, k + 1, true), v(n, k + 1, false), v(n, k, false));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
