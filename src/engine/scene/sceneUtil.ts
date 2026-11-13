import * as THREE from 'three';
import type { FractalKind, NoiseKind } from '../../core/noise';
import { num, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import * as parts from './parts';
import { buildTerrain, type TerrainParams } from './terrain';
import type { DynamicGroup } from './types';

/** 从参数读出形状选项 */
export function shapeOf(v: Values): parts.ShapeOpts {
  return {
    roundness: num(v, 'shape.roundness'),
    proportion: num(v, 'shape.proportion'),
    detail: num(v, 'shape.detail'),
    variation: num(v, 'shape.variation'),
    canopy: str(v, 'shape.canopy'),
  };
}

/** 用"地貌"维度的参数生成地形，场景可以覆盖其中一部分 */
export function terrainFrom(v: Values, seed: number, over: Partial<TerrainParams> = {}) {
  const rep = str(v, 'geometry.representation');
  const size = over.size ?? num(v, 'world.size');
  return buildTerrain({
    seed,
    size,
    noise: str(v, 'world.noise') as NoiseKind,
    fractal: str(v, 'world.fractal') as FractalKind,
    octaves: num(v, 'world.octaves'),
    frequency: num(v, 'world.frequency') * (40 / Math.max(16, size)),
    height: num(v, 'world.height'),
    warp: num(v, 'world.warp'),
    redistribute: num(v, 'world.redistribute'),
    terraces: num(v, 'world.terraces'),
    terraceSoft: num(v, 'world.terraceSoft'),
    island: str(v, 'world.island'),
    sea: num(v, 'world.seaLevel'),
    mesh: str(v, 'world.mesh'),
    resolution: num(v, 'world.resolution'),
    jitter: num(v, 'world.jitter'),
    tileLevels: num(v, 'world.tileLevels'),
    base: str(v, 'world.base'),
    voxel: rep === 'voxel',
    voxelSize: num(v, 'geometry.voxelSize'),
    faceted: rep === 'faceted',
    ...over,
  });
}

/** 平地场景的水深贴图：f(x,z) 返回地面高度 */
export function heightTextureFrom(half: number, f: (x: number, z: number) => number, res = 96): THREE.DataTexture {
  const d = new Float32Array(res * res);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) d[j * res + i] = f(-half + (i / (res - 1)) * half * 2, -half + (j / (res - 1)) * half * 2);
  const t = new THREE.DataTexture(d, res, res, THREE.RedFormat, THREE.FloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function characterAt(v: Values, x: number, y: number, z: number): DynamicGroup {
  return { kind: 'character', items: parts.character(str(v, 'shape.character'), num(v, 'shape.headRatio'), shapeOf(v), 2), origin: [x, y, z] };
}

export function cloudsOver(v: Values, rng: () => number, n: number, radius: number, y: number): DynamicGroup[] {
  const out: DynamicGroup[] = [];
  const shape = shapeOf(v);
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2, r = radius * (0.2 + rng() * 0.75);
    out.push({ kind: 'cloud', items: parts.cloud(1.2 + rng(), shape, rng, 3), origin: [Math.cos(a) * r, y + rng() * 3, Math.sin(a) * r], data: { speed: 0.4 + rng() * 0.6, range: radius * 1.3 } });
  }
  return out;
}
