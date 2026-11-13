import * as THREE from 'three';
import Delaunator from 'delaunator';
import { MeshBVH } from 'three-mesh-bvh';
import { fractal, makeNoise, poissonDisc, warp, type FractalKind, type NoiseKind } from '../../core/noise';
import { hash2, mulberry32 } from '../../core/rng';
import { ROLE_INDEX } from '../../content/roles';
import { addOutlineNormals } from './prims';

/*
 * 地形：高度场 → 网格。
 * 地表颜色不在这里决定：顶点带 aRole=-1 与 aFaceH（面中心高度），着色器按高度/坡度/湿度实时分带，
 * 所以调分带阈值不用重建几何。
 */

export interface TerrainParams {
  seed: number;
  size: number;
  noise: NoiseKind;
  fractal: FractalKind;
  octaves: number;
  frequency: number;
  height: number;
  warp: number;
  redistribute: number;
  terraces: number;
  terraceSoft: number;
  island: string;
  sea: number;
  mesh: string;
  resolution: number;
  jitter: number;
  tileLevels: number;
  base: string;
  voxel: boolean;
  voxelSize: number;
  faceted: boolean;
  /** 场景强制的地表角色（如雪村全是雪、沙漠全是沙）；不设则按高度分带 */
  forceRole?: number;
}

export interface VoxelCell {
  x: number; y: number; z: number;
  role: number; // -1 = 按高度分带
  faceH: number;
  id: number;
}

export interface TerrainResult {
  geometry?: THREE.BufferGeometry;
  voxels?: VoxelCell[];
  /** 解析高度（世界 y） */
  heightAt: (x: number, z: number) => number;
  /** 实际表面高度（射线投射到网格 / 体素柱顶） */
  surfaceAt: (x: number, z: number) => number;
  /** 在陆地范围内（底座形状内） */
  inside: (x: number, z: number) => boolean;
  heightTexture: THREE.DataTexture;
  amplitude: number;
  seaY: number;
  size: number;
  shape: 'square' | 'circle';
  bottomY: number;
}

const ROLE_SOIL = ROLE_INDEX.soil;
const ROLE_ROCK = ROLE_INDEX.rock;

export function buildTerrain(p: TerrainParams): TerrainResult {
  const S = p.size;
  const half = S / 2;
  const amp = Math.max(0.01, p.height);
  const shape: 'square' | 'circle' = p.base === 'round' || (p.base === 'floating' && p.island !== 'square') ? 'circle' : 'square';
  const base = fractal(makeNoise(p.noise, p.seed), { kind: p.fractal, octaves: p.octaves, lacunarity: 2, gain: 0.5 });
  const field = warp(base, p.warp * 1.6, p.seed);
  const edgeNoise = makeNoise('simplex', p.seed + 33);
  const blob = makeNoise('simplex', p.seed + 77);

  const inside = (x: number, z: number) => (shape === 'circle' ? x * x + z * z <= half * half * 1.0001 : Math.abs(x) <= half + 1e-6 && Math.abs(z) <= half + 1e-6);

  /** 归一化高度 0~1 */
  const h01 = (x: number, z: number) => {
    const f = p.frequency;
    let n = field(x * f, z * f) * 0.5 + 0.5;
    // 岛屿遮罩
    const nx = x / half, nz = z / half;
    let m = 1;
    if (p.island === 'circle') {
      const d = Math.hypot(nx, nz) + edgeNoise(nx * 1.7, nz * 1.7) * 0.12;
      m = 1 - smooth(0.45, 0.98, d);
    } else if (p.island === 'square') {
      const d = Math.max(Math.abs(nx), Math.abs(nz)) + edgeNoise(nx * 2, nz * 2) * 0.06;
      m = 1 - smooth(0.6, 0.97, d);
    } else if (p.island === 'archipelago') {
      const b = blob(nx * 2.2, nz * 2.2) * 0.5 + 0.5;
      const d = Math.hypot(nx, nz);
      m = smooth(0.35, 0.62, b) * (1 - smooth(0.7, 1.0, d));
    }
    n *= m;
    n = Math.pow(Math.max(0, Math.min(1, n * 1.15)), p.redistribute);
    if (p.terraces > 0) {
      const k = p.terraces;
      const t = n * k;
      const fl = Math.floor(t);
      const s = Math.max(0.02, p.terraceSoft);
      n = (fl + smooth(1 - s, 1, t - fl)) / k;
    }
    return n;
  };
  const heightAt = (x: number, z: number) => h01(x, z) * amp;
  const seaY = p.sea * amp;
  const bottomY = -Math.max(1.6, amp * 0.25);

  // 高度贴图（水面算水深用）
  const HT = 128;
  const ht = new Float32Array(HT * HT);
  for (let j = 0; j < HT; j++) {
    for (let i = 0; i < HT; i++) {
      const x = -half + (i / (HT - 1)) * S, z = -half + (j / (HT - 1)) * S;
      ht[j * HT + i] = heightAt(x, z);
    }
  }
  const heightTexture = new THREE.DataTexture(ht, HT, HT, THREE.RedFormat, THREE.FloatType);
  heightTexture.minFilter = THREE.LinearFilter;
  heightTexture.magFilter = THREE.LinearFilter;
  heightTexture.needsUpdate = true;

  const common = { heightAt, inside, heightTexture, amplitude: amp, seaY, size: S, shape, bottomY };

  /* ---------- 体素 ---------- */
  if (p.voxel) {
    const v = Math.max(0.1, p.voxelSize);
    const n = Math.floor(S / v);
    const tops = new Map<string, number>();
    const topAt = (i: number, j: number) => {
      const k = `${i},${j}`;
      let t = tops.get(k);
      if (t === undefined) {
        const x = -half + (i + 0.5) * v, z = -half + (j + 0.5) * v;
        t = inside(x, z) ? Math.max(1, Math.round(heightAt(x, z) / v)) : -999;
        tops.set(k, t);
      }
      return t;
    };
    const cells: VoxelCell[] = [];
    const floorL = Math.round(bottomY / v);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const t = topAt(i, j);
        if (t === -999) continue;
        const nb = Math.min(topAt(i + 1, j), topAt(i - 1, j), topAt(i, j + 1), topAt(i, j - 1));
        const edge = nb === -999;
        const lo = edge ? floorL : Math.max(floorL, Math.min(t - 1, nb) );
        for (let l = t; l >= lo; l--) {
          const y = (l - 0.5) * v;
          cells.push({ x: -half + (i + 0.5) * v, y, z: -half + (j + 0.5) * v, role: l < 0 ? ROLE_SOIL : p.forceRole ?? -1, faceH: y + v * 0.5, id: 1 });
        }
      }
    }
    return {
      ...common,
      voxels: cells,
      surfaceAt: (x, z) => {
        const i = Math.floor((x + half) / v), j = Math.floor((z + half) / v);
        const t = topAt(i, j);
        return t === -999 ? seaY : t * v;
      },
    };
  }

  /* ---------- 地块（六边形 / 方格） ---------- */
  if (p.mesh === 'hexTiles' || p.mesh === 'squareTiles') {
    const tiles = buildTiles(p, heightAt, inside, amp, bottomY);
    return { ...common, geometry: tiles.geo, surfaceAt: tiles.surfaceAt };
  }

  /* ---------- 三角网 ---------- */
  const rng = mulberry32(p.seed + 5);
  const res = Math.max(8, p.resolution);
  const step = S / res;
  const pts: number[][] = [];
  let tris: number[] = [];
  const useGrid = shape === 'square' && (p.mesh === 'grid' || p.mesh === 'alternate' || p.mesh === 'jitter');
  if (useGrid) {
    for (let j = 0; j <= res; j++) {
      for (let i = 0; i <= res; i++) {
        let x = -half + i * step, z = -half + j * step;
        if (p.mesh === 'jitter' && i > 0 && j > 0 && i < res && j < res) {
          x += (hash2(i, j, p.seed) - 0.5) * 2 * p.jitter * step;
          z += (hash2(j, i, p.seed + 9) - 0.5) * 2 * p.jitter * step;
        }
        pts.push([x, z]);
      }
    }
    const idx = (i: number, j: number) => j * (res + 1) + i;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
        const flip = p.mesh === 'alternate' ? (i + j) % 2 === 1 : p.mesh === 'jitter' ? hash2(i, j, p.seed + 3) > 0.5 : false;
        if (!flip) tris.push(a, c, b, b, c, d);
        else tris.push(a, c, d, a, d, b);
      }
    }
  } else {
    // 不规则点集（Poisson 或网格点）+ 边界点 → Delaunay
    const spacing = step * (p.mesh === 'delaunay' ? 1.15 : 1);
    if (p.mesh === 'delaunay') {
      for (const [x, z] of poissonDisc(S, S, spacing, rng, (x, z) => inside(x - half, z - half))) pts.push([x - half, z - half]);
    } else {
      for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) {
        let x = -half + i * step, z = -half + j * step;
        if (p.mesh === 'jitter') { x += (hash2(i, j, p.seed) - 0.5) * 2 * p.jitter * step; z += (hash2(j, i, p.seed + 9) - 0.5) * 2 * p.jitter * step; }
        if (inside(x, z) && (shape === 'square' || Math.hypot(x, z) < half - step * 0.4)) pts.push([x, z]);
      }
    }
    // 边界
    if (shape === 'circle') {
      const nRing = Math.max(24, Math.round((Math.PI * S) / step));
      for (let k = 0; k < nRing; k++) {
        const a = (k / nRing) * Math.PI * 2;
        pts.push([Math.cos(a) * half, Math.sin(a) * half]);
      }
      // 去掉离边界太近的内点
      for (let i = pts.length - nRing - 1; i >= 0; i--) if (Math.hypot(pts[i][0], pts[i][1]) > half - spacing * 0.45) pts.splice(i, 1);
    } else {
      const nE = res;
      for (let k = 0; k <= nE; k++) {
        const t = -half + (k / nE) * S;
        pts.push([t, -half], [t, half]);
        if (k > 0 && k < nE) pts.push([-half, t], [half, t]);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const [x, z] = pts[i];
        const nearEdge = half - Math.max(Math.abs(x), Math.abs(z));
        if (nearEdge > 1e-6 && nearEdge < spacing * 0.4) pts.splice(i, 1);
      }
    }
    const del = Delaunator.from(pts);
    tris = Array.from(del.triangles);
  }

  // 顶点高度
  const ys = pts.map(([x, z]) => heightAt(x, z));

  // 边界环（按角度排序），用于侧壁
  const boundary = boundaryLoop(pts, shape, half);

  const positions: number[] = [];
  const faceH: number[] = [];
  const roles: number[] = [];
  const pushTri = (a: number[], b: number[], c: number[], role: number, dir: number[] = [0, 1, 0]) => {
    oriented(positions, a, b, c, dir);
    const fh = (a[1] + b[1] + c[1]) / 3;
    faceH.push(fh, fh, fh);
    roles.push(role, role, role);
  };
  for (let t = 0; t < tris.length; t += 3) {
    const [i0, i1, i2] = [tris[t], tris[t + 1], tris[t + 2]];
    const P = (i: number) => [pts[i][0], ys[i], pts[i][1]];
    pushTri(P(i0), P(i1), P(i2), p.forceRole ?? -1);
  }

  // 侧壁与底部
  const wallRole = p.base === 'floating' ? ROLE_ROCK : ROLE_SOIL;
  const ringPts = boundary.map((i) => [pts[i][0], ys[i], pts[i][1]]);
  if (p.base === 'floating') {
    // 倒锥：几圈逐渐收缩的环 + 尖点
    const layers = 4;
    let prev = ringPts;
    const nz = makeNoise('simplex', p.seed + 404);
    for (let L = 1; L <= layers; L++) {
      const k = 1 - L / (layers + 0.6);
      const ring = ringPts.map(([x, , z], idx) => {
        const r = k * (0.85 + 0.25 * (nz(idx * 0.3, L) * 0.5 + 0.5));
        return [x * r, bottomY * 0.4 - L * amp * 0.38 - (nz(idx * 0.2, L * 3) * 0.5 + 0.5) * amp * 0.25, z * r];
      });
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        const out = [prev[i][0], -0.4, prev[i][2]];
        pushTri(prev[i], ring[i], prev[j], wallRole, out);
        pushTri(prev[j], ring[i], ring[j], wallRole, out);
      }
      prev = ring;
    }
    const apex = [0, bottomY * 0.4 - (layers + 1.2) * amp * 0.4, 0];
    for (let i = 0; i < prev.length; i++) pushTri(prev[i], apex, prev[(i + 1) % prev.length], wallRole, [prev[i][0], -1, prev[i][2]]);
  } else if (p.base !== 'none' || p.island === 'none') {
    const bottom = ringPts.map(([x, , z]) => [x, bottomY, z]);
    for (let i = 0; i < ringPts.length; i++) {
      const j = (i + 1) % ringPts.length;
      const out = [ringPts[i][0] + ringPts[j][0], 0, ringPts[i][2] + ringPts[j][2]];
      pushTri(ringPts[i], bottom[i], ringPts[j], wallRole, out);
      pushTri(ringPts[j], bottom[i], bottom[j], wallRole, out);
    }
    // 底面
    for (let i = 1; i < bottom.length - 1; i++) pushTri(bottom[0], bottom[i + 1], bottom[i], wallRole, [0, -1, 0]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // 平滑法线：先焊接计算，再展开
  const smoothN = smoothNormalsFor(geo);
  if (p.faceted) geo.computeVertexNormals();
  else geo.setAttribute('normal', smoothN.clone());
  geo.setAttribute('aOutline', smoothN);
  const count = positions.length / 3;
  geo.setAttribute('aRole', new THREE.Float32BufferAttribute(roles, 1));
  geo.setAttribute('aFaceH', new THREE.Float32BufferAttribute(faceH, 1));
  geo.setAttribute('aTint', new THREE.Float32BufferAttribute(new Float32Array(count).fill(0.5), 1));
  geo.setAttribute('aSway', new THREE.Float32BufferAttribute(new Float32Array(count), 1));
  geo.setAttribute('aId', new THREE.Float32BufferAttribute(new Float32Array(count).fill(1), 1));

  const bvh = new MeshBVH(geo);
  const ray = new THREE.Ray();
  const surfaceAt = (x: number, z: number) => {
    ray.origin.set(x, amp * 3 + 10, z);
    ray.direction.set(0, -1, 0);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    return hit ? hit.point.y : heightAt(x, z);
  };
  return { ...common, geometry: geo, surfaceAt };
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 焊接后计算平滑法线，返回对应非索引顶点顺序的法线属性 */
function smoothNormalsFor(geo: THREE.BufferGeometry): THREE.BufferAttribute {
  addOutlineNormals(geo);
  const a = geo.getAttribute('aOutline') as THREE.BufferAttribute;
  geo.deleteAttribute('aOutline');
  return a;
}

/** 边界点按环顺序排列 */
function boundaryLoop(pts: number[][], shape: 'square' | 'circle', half: number): number[] {
  const onEdge: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const e = shape === 'circle' ? Math.abs(Math.hypot(x, z) - half) < 1e-3 : half - Math.max(Math.abs(x), Math.abs(z)) < 1e-4;
    if (e) onEdge.push(i);
  }
  onEdge.sort((a, b) => Math.atan2(pts[a][1], pts[a][0]) - Math.atan2(pts[b][1], pts[b][0]));
  return onEdge;
}

function buildTiles(
  p: TerrainParams,
  heightAt: (x: number, z: number) => number,
  inside: (x: number, z: number) => boolean,
  amp: number,
  bottomY: number,
) {
  const S = p.size, half = S / 2;
  const hex = p.mesh === 'hexTiles';
  const cell = S / Math.max(6, Math.round(p.resolution / 3));
  const levels = Math.max(2, p.tileLevels);
  const gap = cell * 0.04;
  const positions: number[] = [];
  const faceH: number[] = [];
  const tops: { x: number; z: number; y: number; r: number }[] = [];
  const quant = (y: number) => Math.max(amp / levels, Math.round((y / amp) * levels) / levels * amp);
  const pushTri = (a: number[], b: number[], c: number[], fh: number, dir: number[] = [0, 1, 0]) => {
    oriented(positions, a, b, c, dir);
    faceH.push(fh, fh, fh);
  };
  const prism = (cx: number, cz: number, r: number, sides: number, rot: number) => {
    const y = quant(heightAt(cx, cz));
    tops.push({ x: cx, z: cz, y, r });
    const ring: number[][] = [];
    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
    for (let k = 0; k < sides; k++) {
      const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % sides];
      pushTri([cx, y, cz], [x1, y, z1], [x0, y, z0], y);
      const out = [x0 + x1 - 2 * cx, 0, z0 + z1 - 2 * cz];
      pushTri([x0, y, z0], [x1, y, z1], [x0, bottomY, z0], y, out);
      pushTri([x1, y, z1], [x1, bottomY, z1], [x0, bottomY, z0], y, out);
    }
  };
  if (hex) {
    const r = cell / Math.sqrt(3);
    const w = cell, hgt = r * 1.5;
    const rows = Math.ceil(S / hgt) + 1;
    const cols = Math.ceil(S / w) + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cx = -half + i * w + (j % 2 ? w / 2 : 0);
        const cz = -half + j * hgt;
        if (!inside(cx, cz)) continue;
        prism(cx, cz, r - gap, 6, Math.PI / 6);
      }
    }
  } else {
    const n = Math.round(S / cell);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const cx = -half + (i + 0.5) * cell, cz = -half + (j + 0.5) * cell;
      if (!inside(cx, cz)) continue;
      prism(cx, cz, (cell / 2 - gap) * Math.SQRT2, 4, Math.PI / 4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const sm = smoothNormalsFor(geo);
  geo.computeVertexNormals();
  geo.setAttribute('aOutline', sm);
  const count = positions.length / 3;
  geo.setAttribute('aRole', new THREE.Float32BufferAttribute(new Float32Array(count).fill(p.forceRole ?? -1), 1));
  geo.setAttribute('aFaceH', new THREE.Float32BufferAttribute(faceH, 1));
  geo.setAttribute('aTint', new THREE.Float32BufferAttribute(new Float32Array(count).fill(0.5), 1));
  geo.setAttribute('aSway', new THREE.Float32BufferAttribute(new Float32Array(count), 1));
  geo.setAttribute('aId', new THREE.Float32BufferAttribute(new Float32Array(count).fill(1), 1));
  const surfaceAt = (x: number, z: number) => {
    let best = tops[0], bd = Infinity;
    for (const t of tops) {
      const d = (t.x - x) ** 2 + (t.z - z) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best ? best.y : 0;
  };
  return { geo, surfaceAt };
}

/** 按期望朝向写入三角形：法线与 dir 反向时交换顶点顺序 */
function oriented(out: number[], a: number[], b: number[], c: number[], dir: number[]) {
  const cbx = c[0] - b[0], cby = c[1] - b[1], cbz = c[2] - b[2];
  const abx = a[0] - b[0], aby = a[1] - b[1], abz = a[2] - b[2];
  const nx = cby * abz - cbz * aby, ny = cbz * abx - cbx * abz, nz = cbx * aby - cby * abx;
  if (nx * dir[0] + ny * dir[1] + nz * dir[2] < 0) out.push(...a, ...c, ...b);
  else out.push(...a, ...b, ...c);
}
