import { makeNoise, poissonDisc } from '../../../core/noise';
import { num, str } from '../../../dims/registry';
import type { NoiseKind, FractalKind } from '../../../core/noise';
import { buildTerrain } from '../terrain';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import type { Item, SceneDesc, DynamicGroup, PointLightDesc } from '../types';

/*
 * 灵感沙盒岛：噪声地形 + 生物群系 + 植被 + 云 + 水 + 可行走的小人。
 * 对应灵感提示词里的每一行，每一行都能在维度面板里换成别的选项。
 */

registerSceneBuilder('sandbox', (ctx) => {
  const v = ctx.values;
  const seed = ctx.seed;
  const rng = ctx.rng;
  const rep = str(v, 'geometry.representation');
  const terrain = buildTerrain({
    seed,
    size: num(v, 'world.size'),
    noise: str(v, 'world.noise') as NoiseKind,
    fractal: str(v, 'world.fractal') as FractalKind,
    octaves: num(v, 'world.octaves'),
    frequency: num(v, 'world.frequency') * (40 / Math.max(16, num(v, 'world.size'))),
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
  });
  const S = terrain.size, half = S / 2, amp = terrain.amplitude, sea = terrain.seaY;
  const shape: parts.ShapeOpts = {
    roundness: num(v, 'shape.roundness'),
    proportion: num(v, 'shape.proportion'),
    detail: num(v, 'shape.detail'),
    variation: num(v, 'shape.variation'),
    canopy: str(v, 'shape.canopy'),
  };
  const items: Item[] = [];
  const lights: PointLightDesc[] = [];
  const density = makeNoise('simplex', seed + 11);
  const vary = () => 1 + (rng() - 0.5) * 1.1 * shape.variation;

  // 出生点：中心附近最高的陆地之一
  let spawn: [number, number] = [0, 0];
  {
    let best = -1;
    for (let k = 0; k < 80; k++) {
      const a = rng() * Math.PI * 2, r = rng() * half * 0.35;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = terrain.heightAt(x, z);
      const score = h > sea + amp * 0.06 ? 10 - Math.abs(h - (sea + amp * 0.2)) : -1;
      if (score > best && terrain.inside(x, z)) { best = score; spawn = [x, z]; }
    }
  }

  // 散布
  const spacing = num(v, 'world.scatterSpacing');
  const treeD = num(v, 'world.trees'), rockD = num(v, 'world.rocks'), flowerD = num(v, 'world.flowers');
  const pts = poissonDisc(S, S, spacing, rng, (x, z) => terrain.inside(x - half, z - half));
  let id = 10;
  for (const [px, pz] of pts) {
    const x = px - half, z = pz - half;
    if (Math.hypot(x - spawn[0], z - spawn[1]) < 2.2) continue;
    const hA = terrain.heightAt(x, z);
    const h01 = hA / amp;
    if (hA < sea + amp * 0.02) continue;
    const y = terrain.surfaceAt(x, z);
    const d = density(x * 0.09, z * 0.09) * 0.5 + 0.5;
    const roll = rng();
    const beach = h01 < num(v, 'world.seaLevel') + num(v, 'world.beach') + 0.01;
    const high = h01 > num(v, 'world.highland');
    const snow = h01 > num(v, 'world.snowLine');
    if (!beach && !snow && roll < treeD * 0.55 * d) {
      const size = (high ? 1.3 : 1.15) * vary();
      items.push(...(high ? parts.pineTree(x, y, z, size, shape, rng, id++) : parts.broadleafTree(x, y, z, size, shape, rng, id++)));
    } else if (roll < treeD * 0.55 * d + rockD * 0.12) {
      items.push(...parts.rock(x, y, z, 0.45 * vary() * (high ? 1.4 : 1), shape, rng, id++));
    } else if (!beach && !high && roll < treeD * 0.55 * d + rockD * 0.12 + flowerD * 0.2) {
      items.push(...(rng() < 0.5 ? parts.flowers(x, y, z, 0.7, shape, rng, id++) : parts.bush(x, y, z, 0.7 * vary(), shape, rng, id++)));
    }
  }

  // 营地：灯笼、宝箱、水晶（交互物与夜间光源）
  const camp = (dx: number, dz: number) => {
    const x = spawn[0] + dx, z = spawn[1] + dz;
    return [x, terrain.surfaceAt(x, z), z] as [number, number, number];
  };
  {
    const [lx, ly, lz] = camp(1.6, 0.9);
    items.push(...parts.lanternPost(lx, ly, lz, id++));
    lights.push({ pos: [lx, ly + 1.35, lz], color: '#FFB347', range: 7, intensity: 1.6, night: true });
    const [cx, cy, cz] = camp(-1.4, 1.3);
    items.push(...parts.chest(cx, cy, cz, 0.4, id++));
    const [kx, ky, kz] = camp(0.6, -1.8);
    items.push(...parts.crystal(kx, ky, kz, id++));
    lights.push({ pos: [kx, ky + 0.6, kz], color: '#7FE7FF', range: 4.5, intensity: 1.2, night: true });
  }

  // 动态：角色 + 云
  const dynamic: DynamicGroup[] = [];
  const sy = terrain.surfaceAt(spawn[0], spawn[1]);
  dynamic.push({
    kind: 'character',
    items: parts.character(str(v, 'shape.character'), num(v, 'shape.headRatio'), shape, 2),
    origin: [spawn[0], sy, spawn[1]],
  });
  const nClouds = num(v, 'world.clouds');
  for (let k = 0; k < nClouds; k++) {
    const a = rng() * Math.PI * 2, r = half * (0.2 + rng() * 0.75);
    dynamic.push({
      kind: 'cloud',
      items: parts.cloud(1.2 + rng() * 1.0, shape, rng, 3),
      origin: [Math.cos(a) * r, amp + 5 + rng() * 3, Math.sin(a) * r],
      data: { speed: 0.4 + rng() * 0.6, range: half * 1.3 },
    });
  }

  const water = { level: sea, shape: terrain.shape, size: str(v, 'world.base') === 'none' ? Math.max(S * 10, 600) : S };

  const desc: SceneDesc = {
    items,
    dynamic,
    terrain,
    water,
    lights,
    bounds: { center: [0, amp * 0.3, 0], radius: half * 1.25 + amp },
    viewSize: S * 0.62,
    playerStart: [spawn[0], sy, spawn[1]],
  };
  return desc;
});
