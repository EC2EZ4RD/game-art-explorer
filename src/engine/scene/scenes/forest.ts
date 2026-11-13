import { makeNoise, poissonDisc } from '../../../core/noise';
import { ROLE_INDEX } from '../../../content/roles';
import { num } from '../../../dims/registry';
import { B, bamboo, logPile } from '../kits';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf, terrainFrom } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 林地：起伏缓和的地面上，阔叶林、针叶林与竹林三片，一条蜿蜒土路穿过。
 * 主要验证：遮挡、植被语言、光斑与层次。
 */
registerSceneBuilder('forest', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 34;
  const terrain = terrainFrom(v, ctx.seed, { size: S, island: 'none', sea: 0, height: Math.min(num(v, 'world.height'), 3.2), forceRole: ROLE_INDEX.grass, base: String(v['world.base']) === 'none' ? 'plinth' : String(v['world.base']) });
  const shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  const half = S / 2;
  // 小路：一条正弦曲线
  const pathX = (z: number) => Math.sin(z * 0.18) * 4;
  const onPath = (x: number, z: number) => Math.abs(x - pathX(z)) < 1.3;
  for (let z = -half + 1; z < half - 1; z += 0.9) {
    const x = pathX(z);
    const y = terrain.surfaceAt(x, z);
    const dx = pathX(z + 0.5) - pathX(z - 0.5);
    items.push({ prim: 'box', args: [0.6], pos: [x, y + 0.02, z], rot: [0, Math.atan2(dx, 1), 0], scale: [1.8, 0.08, 1.1], role: 'path', id: 5, noOutline: true });
  }
  const zone = makeNoise('simplex', ctx.seed + 3);
  let id = 20;
  const density = 0.6 + num(v, 'world.trees') * 0.8;
  for (const [px, pz] of poissonDisc(S - 2, S - 2, 1.7 / Math.sqrt(density), rng)) {
    const x = px - half + 1, z = pz - half + 1;
    if (onPath(x, z) || Math.hypot(x - pathX(0), z) < 2.5) continue;
    const y = terrain.surfaceAt(x, z);
    const zv = zone(x * 0.06, z * 0.06);
    const roll = rng();
    if (zv > 0.35) {
      if (roll < 0.25) bamboo(b.withId(id++).at(x, y, z), 2, rng, 0.5);
    } else if (zv < -0.2) {
      if (roll < 0.7) items.push(...parts.pineTree(x, y, z, 1.3 + rng() * 0.6, shape, rng, id++));
    } else if (roll < 0.62) {
      items.push(...parts.broadleafTree(x, y, z, 1.2 + rng() * 0.7, shape, rng, id++));
    } else if (roll < 0.72) items.push(...parts.bush(x, y, z, 0.8, shape, rng, id++));
    else if (roll < 0.78) items.push(...parts.mushroom(x, y, z, 0.35 + rng() * 0.2, id++));
    else if (roll < 0.84) items.push(...parts.rock(x, y, z, 0.5, shape, rng, id++));
    else if (roll < 0.88) logPile(b.withId(id++).at(x, y, z, rng() * 3), rng);
    else if (roll < 0.95) items.push(...parts.flowers(x, y, z, 0.6, shape, rng, id++));
  }
  // 林间空地上的宝箱与路标
  const cx = pathX(-6) + 2.2, cz = -6;
  items.push(...parts.chest(cx, terrain.surfaceAt(cx, cz), cz, 0.6, id++));
  items.push(...parts.lanternPost(pathX(4) - 1.6, terrain.surfaceAt(pathX(4) - 1.6, 4), 4, id++));
  const lights: SceneDesc['lights'] = [{ pos: [pathX(4) - 1.6, terrain.surfaceAt(pathX(4) - 1.6, 4) + 1.35, 4], color: '#FFB347', range: 7, intensity: 1.5, night: true }];
  const sx = pathX(0);
  const sy = terrain.surfaceAt(sx, 0);
  return {
    items,
    dynamic: [characterAt(v, sx, sy, 0)],
    terrain,
    lights,
    bounds: { center: [0, 1, 0], radius: half * 1.2 },
    viewSize: S * 0.6,
    playerStart: [sx, sy, 0],
  };
});
