import * as THREE from 'three';
import { U } from '../materials/uniforms';
import type { SceneDesc } from '../scene/types';

/*
 * M 轨道按需补的顶点属性（只有对应参数打开时才算，算一次挂在几何上；场景重建后的新几何没有，就再算）：
 *   aBary   线框：每个三角形的重心坐标；和相邻三角形共面的边加 1，那条边就不画（四边形不露对角线）
 *   aVox    体素：每个方块 27 邻居（含自己）有没有方块，拆成两个整数位掩码（实例属性）
 *   aGround 污渍：这个顶点离地面多高 + 1000（0 = 没有数据）
 * 着色器在几何没有这些属性时读材质的 defaultAttributeValues（全 0 = 关）。
 */

/** 是不是场景表面材质（surface / outline / depth 都直接用共享的 U） */
const isSurface = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material as THREE.ShaderMaterial)?.uniforms === U;

/* ---------- 线框重心坐标 ---------- */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _e = new THREE.Vector3();
function baryFor(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const n = pos.count;
  // 三角形 → 三个顶点下标（索引几何也行，只要每个顶点只属于一个三角形：地形被 BVH 补了索引、重排过三角形）
  const index = geo.index;
  const tris = index ? Math.floor(index.count / 3) : Math.floor(n / 3);
  const vi = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  if (index) {
    const used = new Uint8Array(n);
    for (let i = 0; i < index.count; i++) { const x = index.getX(i); if (used[x]) return; used[x] = 1; }
  }
  const bary = new Float32Array(n * 3);
  const normals = new Float32Array(tris * 3);
  const q = (i: number) => `${Math.round(pos.getX(i) * 500)},${Math.round(pos.getY(i) * 500)},${Math.round(pos.getZ(i) * 500)}`;
  const keys: string[] = new Array(n);
  for (let i = 0; i < n; i++) keys[i] = q(i);
  // 每条边（两个端点键，排好序）→ 用到它的三角形
  const edges = new Map<string, number[]>();
  const ekey = (t: number, k: number) => { const k1 = keys[vi(t, (k + 1) % 3)], k2 = keys[vi(t, (k + 2) % 3)]; return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`; };
  for (let t = 0; t < tris; t++) {
    _a.fromBufferAttribute(pos, vi(t, 0)); _b.fromBufferAttribute(pos, vi(t, 1)); _c.fromBufferAttribute(pos, vi(t, 2));
    _n.subVectors(_c, _b).cross(_e.subVectors(_a, _b));
    const len = _n.length();
    if (len > 0) _n.multiplyScalar(1 / len);
    normals[t * 3] = _n.x; normals[t * 3 + 1] = _n.y; normals[t * 3 + 2] = _n.z;
    for (let k = 0; k < 3; k++) {
      const ek = ekey(t, k);
      const list = edges.get(ek);
      if (list) list.push(t); else edges.set(ek, [t]);
    }
  }
  const len2 = (t: number, k: number) => {
    _a.fromBufferAttribute(pos, vi(t, (k + 1) % 3)); _b.fromBufferAttribute(pos, vi(t, (k + 2) % 3));
    return _a.distanceToSquared(_b);
  };
  for (let t = 0; t < tris; t++) {
    // 与顶点 k 相对的那条边：是这个三角形最长的边（四边形的对角线、扇形面的半径）且和邻居共面时，
    // 把第 k 个分量整体抬 1（这条边上 bary[k] 不再接近 0，就不画）。只看共面会把平地上真正的格线也藏掉
    const hide = [0, 0, 0];
    const L = [len2(t, 0), len2(t, 1), len2(t, 2)];
    const Lmax = Math.max(L[0], L[1], L[2]);
    for (let k = 0; k < 3; k++) {
      if (L[k] < Lmax * 0.998) continue;
      for (const o of edges.get(ekey(t, k))!) {
        if (o === t) continue;
        const d = normals[t * 3] * normals[o * 3] + normals[t * 3 + 1] * normals[o * 3 + 1] + normals[t * 3 + 2] * normals[o * 3 + 2];
        if (d > 0.995) { hide[k] = 1; break; }
      }
    }
    for (let v = 0; v < 3; v++) { const x = vi(t, v); for (let k = 0; k < 3; k++) bary[x * 3 + k] = (v === k ? 1 : 0) + hide[k]; }
  }
  geo.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));
}

/* ---------- 体素邻居掩码 ---------- */
const _m = new THREE.Matrix4(), _p = new THREE.Vector3();
function voxFor(mesh: THREE.InstancedMesh) {
  const geo = mesh.geometry;
  geo.computeBoundingBox();
  const v = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
  if (!(v > 0)) return;
  const n = mesh.count;
  const ijk = new Int32Array(n * 3);
  const occ = new Set<number>();
  // 整数格坐标打包成一个数（各分量偏移 2048，够 ±2048 格）
  const pack = (i: number, j: number, k: number) => ((i + 2048) * 4096 + (j + 2048)) * 4096 + (k + 2048);
  for (let t = 0; t < n; t++) {
    mesh.getMatrixAt(t, _m);
    _p.setFromMatrixPosition(_m);
    const i = Math.floor(_p.x / v), j = Math.floor(_p.y / v), k = Math.floor(_p.z / v);
    ijk[t * 3] = i; ijk[t * 3 + 1] = j; ijk[t * 3 + 2] = k;
    occ.add(pack(i, j, k));
  }
  const out = new Float32Array(n * 2);
  for (let t = 0; t < n; t++) {
    const i = ijk[t * 3], j = ijk[t * 3 + 1], k = ijk[t * 3 + 2];
    let lo = 0, hi = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const b = (dx + 1) * 9 + (dy + 1) * 3 + (dz + 1);
      if (b !== 13 && !occ.has(pack(i + dx, j + dy, k + dz))) continue;
      if (b < 14) lo |= 1 << b; else hi |= 1 << (b - 14);
    }
    out[t * 2] = lo; out[t * 2 + 1] = hi;
  }
  geo.setAttribute('aVox', new THREE.InstancedBufferAttribute(out, 2));
}

/* ---------- 离地高度 ---------- */
function groundFor(mesh: THREE.Mesh, heightAt: (x: number, z: number) => number) {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const out = new Float32Array(pos.count);
  mesh.updateWorldMatrix(true, false);
  const cache = new Map<number, number>();
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    // 按 0.25 米的格子缓存地面高度（同一根柱子上的顶点很多）
    const kx = Math.round(_p.x * 4), kz = Math.round(_p.z * 4);
    const key = (kx + 100000) * 200001 + (kz + 100000);
    let h = cache.get(key);
    if (h === undefined) { h = heightAt(kx / 4, kz / 4); cache.set(key, h); }
    out[i] = Math.max(-500, _p.y - h) + 1000;
  }
  geo.setAttribute('aGround', new THREE.BufferAttribute(out, 1));
}

export interface AttrNeeds { bary: boolean; vox: boolean; ground: boolean }

/** 给 root 下还没有这些属性的表面几何补上（开关打开、或场景 / 角色重建后调用；已有的跳过，很便宜） */
export function ensureAttrs(root: THREE.Object3D | null, desc: SceneDesc | null, need: AttrNeeds) {
  if (!root || (!need.bary && !need.vox && !need.ground)) return;
  const heightAt = desc?.terrain?.heightAt ?? desc?.ground?.heightAt ?? (() => 0);
  const seen = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (!isSurface(o)) return;
    const geo = o.geometry;
    if (seen.has(geo)) return;
    seen.add(geo);
    const inst = (o as THREE.InstancedMesh).isInstancedMesh;
    try {
      if (inst) {
        if (need.vox && !geo.getAttribute('aVox')) voxFor(o as THREE.InstancedMesh);
      } else {
        if (need.bary && !geo.getAttribute('aBary')) baryFor(geo);
        if (need.ground && !geo.getAttribute('aGround')) groundFor(o, heightAt);
      }
    } catch (err) { console.error('M 轨道补顶点属性出错', err); }
  });
}
