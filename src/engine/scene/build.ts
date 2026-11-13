import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ROLE_INDEX } from '../../content/roles';
import { hash2 } from '../../core/rng';
import { insideUnit, itemBox, itemMatrix, primGeometry, addOutlineNormals, type PrimOpts } from './prims';
import type { Item, SceneDesc, DynamicGroup, SceneImage } from './types';
import type { VoxelCell } from './terrain';
import { spriteMaterial } from '../sprites';
import { assetTexture, proceduralTexture } from '../textures';

/*
 * 场景描述 → three.js 对象。
 * 静态部件合并成一个网格（一次绘制）；描边外壳共用同一份几何；体素用 InstancedMesh。
 */

export const LAYER_MAIN = 0;   // 主相机与阴影相机都看得到
export const LAYER_HULL = 1;   // 只有主相机（描边不投影）
export const LAYER_FX = 2;     // 只有主相机（天空、水、粒子）

export interface Materials {
  surface: THREE.ShaderMaterial;
  outline: THREE.ShaderMaterial;
}

export interface BuildOpts {
  /** wireframe（M 轨道，线框几何）按折面建，重心坐标由 ext/material-attrs.ts 补 */
  rep: 'smooth' | 'faceted' | 'voxel' | 'wireframe';
  prim: PrimOpts;
  voxelSize: number;
  voxelBevel: number;
  seed: number;
}

export interface BuiltDynamic {
  group: DynamicGroup;
  object: THREE.Group;
}

/** 横版深度带：一组网格，正交分层视差时引擎每帧改它的缩放与位置（透视时保持原样） */
export interface BuiltLayer {
  z: number;
  group: THREE.Group;
}

export interface BuiltScene {
  root: THREE.Group;
  dynamics: BuiltDynamic[];
  /** 横版深度带（没有时为空） */
  layers: BuiltLayer[];
  /** 静态网格（铺物体空间笔触用：不含深度带——正交视差会挪动它们，笔触点是建场景时烘死的） */
  strokeSources: THREE.Mesh[];
  /** 铺满画面的贴图（SceneImage.cover）：引擎每帧按取景把它们放大到盖住画面；cx / cy 是中心，w / h 是原尺寸，sx = ±1（水平翻转） */
  covers: { mesh: THREE.Mesh; cx: number; cy: number; w: number; h: number; sx: number }[];
  triangles: number;
  dispose: () => void;
}

function tintOf(it: Item, i: number, seed: number) {
  return hash2((it.id ?? i) * 7 + 3, Math.round(it.pos[0] * 10) + Math.round(it.pos[2] * 10) * 131, seed);
}

/** 给几何补齐着色器需要的属性 */
function fillAttrs(geo: THREE.BufferGeometry, role: number, tint: number, sway: number, outlineOff: boolean) {
  const n = geo.getAttribute('position').count;
  geo.setAttribute('aRole', new THREE.BufferAttribute(new Float32Array(n).fill(outlineOff ? role + 0.001 : role), 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n).fill(tint), 1));
  geo.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n).fill(sway), 1));
  geo.setAttribute('aFaceH', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aId', new THREE.BufferAttribute(new Float32Array(n), 1));
}

/** 只保留着色需要的属性，合并时属性集合必须一致 */
const KEEP = ['position', 'normal', 'aOutline', 'aRole', 'aTint', 'aSway', 'aFaceH', 'aId'];
function normalizeAttrs(geo: THREE.BufferGeometry) {
  for (const k of Object.keys(geo.attributes)) if (!KEEP.includes(k)) geo.deleteAttribute(k);
  geo.morphAttributes = {};
  return geo;
}

/** 不描边的部件：把 aOutline 设为零向量，外壳退化为原形，不会露出 */
function killOutline(geo: THREE.BufferGeometry) {
  const a = geo.getAttribute('aOutline') as THREE.BufferAttribute;
  (a.array as Float32Array).fill(0);
}

export function itemsGeometry(items: Item[], o: PrimOpts, seed: number): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  items.forEach((it, i) => {
    const g = primGeometry(it, o, seed + i * 13);
    fillAttrs(g, ROLE_INDEX[it.role], tintOf(it, i, seed), it.sway ?? 0, false);
    if (it.noOutline) killOutline(g);
    parts.push(normalizeAttrs(g));
  });
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/* ---------------- 体素化 ---------------- */
export interface VoxelOut {
  cells: VoxelCell[];
}

const _inv = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _box = new THREE.Box3();

export function voxelizeItems(items: Item[], v: number, idBase = 0): VoxelCell[] {
  const map = new Map<string, VoxelCell>();
  for (const it of items) {
    const m = itemMatrix(it);
    _inv.copy(m).invert();
    itemBox(it, _box);
    const i0 = Math.floor(_box.min.x / v), i1 = Math.ceil(_box.max.x / v);
    const j0 = Math.floor(_box.min.y / v), j1 = Math.ceil(_box.max.y / v);
    const k0 = Math.floor(_box.min.z / v), k1 = Math.ceil(_box.max.z / v);
    let any = false;
    const tryCell = (i: number, j: number, k: number, force = false) => {
      const key = `${i},${j},${k}`;
      if (map.has(key)) return;
      _p.set((i + 0.5) * v, (j + 0.5) * v, (k + 0.5) * v).applyMatrix4(_inv);
      if (force || insideUnit(it.prim, _p, it.args)) {
        map.set(key, { x: (i + 0.5) * v, y: (j + 0.5) * v, z: (k + 0.5) * v, role: ROLE_INDEX[it.role], faceH: 0, id: it.id ?? idBase });
        any = true;
      }
    };
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) for (let k = k0; k < k1; k++) tryCell(i, j, k);
    // 比体素还小的部件（眼睛、花）至少占一格
    if (!any) {
      const c = new THREE.Vector3(...it.pos);
      tryCell(Math.floor(c.x / v), Math.floor(c.y / v), Math.floor(c.z / v), true);
    }
  }
  return [...map.values()];
}

/** 体素实例：一个立方体几何 + 每实例的角色/高度 */
export function voxelMesh(cells: VoxelCell[], v: number, bevel: number, mats: Materials, seed: number): { mesh: THREE.InstancedMesh; hull: THREE.InstancedMesh } {
  let box: THREE.BufferGeometry = bevel > 0.01 ? new RoundedBoxGeometry(v, v, v, 1, v * bevel) : new THREE.BoxGeometry(v, v, v);
  box.deleteAttribute('uv');
  addOutlineNormals(box);
  box = box.index ? box.toNonIndexed() : box;
  const n = cells.length;
  const role = new Float32Array(n), tint = new Float32Array(n), sway = new Float32Array(n), faceH = new Float32Array(n), id = new Float32Array(n);
  const mesh = new THREE.InstancedMesh(box, mats.surface, n);
  const m = new THREE.Matrix4();
  cells.forEach((c, i) => {
    m.makeTranslation(c.x, c.y, c.z);
    mesh.setMatrixAt(i, m);
    role[i] = c.role;
    tint[i] = hash2(Math.round(c.x / v) * 3 + c.id, Math.round(c.z / v) * 7 + Math.round(c.y / v), seed);
    faceH[i] = c.faceH;
    id[i] = c.id;
  });
  box.setAttribute('aRole', new THREE.InstancedBufferAttribute(role, 1));
  box.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  box.setAttribute('aSway', new THREE.InstancedBufferAttribute(sway, 1));
  box.setAttribute('aFaceH', new THREE.InstancedBufferAttribute(faceH, 1));
  box.setAttribute('aId', new THREE.InstancedBufferAttribute(id, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  const hull = new THREE.InstancedMesh(box, mats.outline, n);
  hull.instanceMatrix = mesh.instanceMatrix;
  hull.layers.set(LAYER_HULL);
  mesh.frustumCulled = false;
  hull.frustumCulled = false;
  return { mesh, hull };
}

function meshWithHull(geo: THREE.BufferGeometry, mats: Materials) {
  const mesh = new THREE.Mesh(geo, mats.surface);
  const hull = new THREE.Mesh(geo, mats.outline);
  hull.layers.set(LAYER_HULL);
  hull.raycast = () => {};
  return { mesh, hull };
}

/** 贴图四边形 → 网格（复用精灵的材质：写颜色 + 法线 / 角色两张输出，主相机层、不投影） */
function imageMesh(im: SceneImage, idx: number): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const [w, h] = im.size;
  const geo = new THREE.PlaneGeometry(w, h);
  if ((im.anchor ?? 'bottom') === 'bottom') geo.translate(0, h / 2, 0);
  const m = spriteMaterial(im.cut ?? 0.5, ROLE_INDEX[im.role ?? 'paper']);
  m.uniforms.tMap.value = im.canvas ? proceduralTexture(im.canvas.key, im.canvas.w, im.canvas.h, im.canvas.draw) : assetTexture(im.file, { srgb: true, placeholder: '#00000000' });
  m.uniforms.uLit.value = im.lit ?? 0;
  // 跟画面层走（色板 / 时段 / 色阶，审查修复 1）；抠图立绘去品红边（审查修复 6）
  m.uniforms.uRecolor.value = im.recolor ?? 0.7;
  m.uniforms.uDespill.value = im.despill ? 1 : 0;
  m.uniforms.uDither.value = im.dither ? 1 : 0;
  m.uniforms.uImgGlow.value = im.glow ?? 1;
  const c = im.crop;
  if (c) m.uniforms.uRect.value.set(c[0], c[1], c[2], c[3]);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...im.pos);
  if (im.rot) mesh.rotation.set(...im.rot);
  if (im.flipX) mesh.scale.x = -1;
  mesh.renderOrder = idx;
  mesh.layers.set(LAYER_FX);
  mesh.frustumCulled = false;
  return mesh;
}

export function buildScene(desc: SceneDesc, o: BuildOpts, mats: Materials): BuiltScene {
  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const strokeSources: THREE.Mesh[] = [];
  let triangles = 0;
  const addGeo = (geo: THREE.BufferGeometry | null, parent: THREE.Object3D = root) => {
    if (!geo) return;
    const { mesh, hull } = meshWithHull(geo, mats);
    parent.add(mesh, hull);
    disposables.push(geo);
    triangles += geo.getAttribute('position').count / 3;
    if (parent === root) strokeSources.push(mesh);
  };

  if (o.rep === 'voxel') {
    const cells: VoxelCell[] = [...(desc.terrain?.voxels ?? []), ...voxelizeItems(desc.items, o.voxelSize)];
    if (cells.length) {
      const { mesh, hull } = voxelMesh(cells, o.voxelSize, o.voxelBevel, mats, o.seed);
      root.add(mesh, hull);
      disposables.push(mesh.geometry);
      triangles += cells.length * 12;
      strokeSources.push(mesh);
    }
  } else {
    if (desc.terrain?.geometry) {
      const tg = desc.terrain.geometry;
      addGeo(tg);
    }
    addGeo(itemsGeometry(desc.items, o.prim, o.seed));
  }

  // 横版深度带：每带一组（正交时引擎按透视换算缩放 + 视差）
  const layers: BuiltLayer[] = (desc.layers ?? []).map((L, li) => {
    const g = new THREE.Group();
    g.name = L.name ?? `layer${li}`;
    if (o.rep === 'voxel') {
      const cells = voxelizeItems(L.items, o.voxelSize, 200 + li);
      if (cells.length) {
        const { mesh, hull } = voxelMesh(cells, o.voxelSize, o.voxelBevel, mats, o.seed + 37 * (li + 1));
        g.add(mesh, hull);
        disposables.push(mesh.geometry);
        triangles += cells.length * 12;
      }
    } else addGeo(itemsGeometry(L.items, o.prim, o.seed + 37 * (li + 1)), g);
    root.add(g);
    return { z: L.z, group: g };
  });

  // 贴图四边形（立绘背景）：按给的顺序画，后面的压前面的（同深度时）
  const covers: BuiltScene['covers'] = [];
  (desc.images ?? []).forEach((im, i) => {
    const mesh = imageMesh(im, i);
    root.add(mesh);
    disposables.push(mesh.geometry, mesh.material);
    if (im.cover) covers.push({ mesh, cx: im.pos[0], cy: im.pos[1] + ((im.anchor ?? 'bottom') === 'bottom' ? im.size[1] / 2 : 0), w: im.size[0], h: im.size[1], sx: im.flipX ? -1 : 1 });
  });

  const dynamics: BuiltDynamic[] = desc.dynamic.map((dg, di) => {
    const g = new THREE.Group();
    g.position.set(...dg.origin);
    // 引擎扩展（舞台追光跟着角色）按这个标记找到动态组
    g.userData.dynKind = dg.kind;
    if (o.rep === 'voxel') {
      const v = dg.kind === 'character' ? Math.min(o.voxelSize, 0.16) : o.voxelSize;
      const cells = voxelizeItems(dg.items, v, 100 + di);
      if (cells.length) {
        const { mesh, hull } = voxelMesh(cells, v, o.voxelBevel, mats, o.seed + di);
        g.add(mesh, hull);
        disposables.push(mesh.geometry);
      }
    } else {
      const geo = itemsGeometry(dg.items, o.prim, o.seed + 1000 + di);
      if (geo) {
        const { mesh, hull } = meshWithHull(geo, mats);
        g.add(mesh, hull);
        disposables.push(geo);
        triangles += geo.getAttribute('position').count / 3;
      }
    }
    root.add(g);
    return { group: dg, object: g };
  });

  return {
    root,
    dynamics,
    layers,
    strokeSources,
    covers,
    triangles: Math.round(triangles),
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** 单独重建一个动态组（角色比例变化时只重建角色） */
export function rebuildDynamic(bd: BuiltDynamic, items: Item[], o: BuildOpts, mats: Materials) {
  bd.object.children.slice().forEach((c) => {
    bd.object.remove(c);
    (c as THREE.Mesh).geometry?.dispose();
  });
  bd.group.items = items;
  if (o.rep === 'voxel') {
    const v = Math.min(o.voxelSize, 0.16);
    const cells = voxelizeItems(items, v, 100);
    if (cells.length) {
      const { mesh, hull } = voxelMesh(cells, v, o.voxelBevel, mats, o.seed);
      bd.object.add(mesh, hull);
    }
  } else {
    const geo = itemsGeometry(items, o.prim, o.seed + 1000);
    if (geo) {
      const { mesh, hull } = meshWithHull(geo, mats);
      bd.object.add(mesh, hull);
    }
  }
}
