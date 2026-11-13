import { ROLE_INDEX } from '../../../content/roles';
import { B, brokenColumn, cactus, palm } from '../kits';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf, terrainFrom } from '../sceneUtil';
import type { Item } from '../types';

/*
 * 沙漠绿洲：鼓包噪声的沙丘、中间一汪绿洲水、棕榈、仙人掌、断柱遗迹与石拱。
 * 主要验证：留白、风化、暖色强光、大面积单色上的形体可读性。
 */
registerSceneBuilder('desert', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 40, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 21, {
    size: S, island: 'none', sea: 0.1, fractal: 'billow', noise: 'simplex', height: 3.6, frequency: 0.05, redistribute: 1.1, forceRole: ROLE_INDEX.sand,
    base: String(v['world.base']) === 'none' ? 'plinth' : String(v['world.base']),
  });
  const shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  // 绿洲：找最低点
  let low: [number, number] = [0, 0];
  let lowH = Infinity;
  for (let k = 0; k < 200; k++) {
    const x = (rng() - 0.5) * S * 0.6, z = (rng() - 0.5) * S * 0.6;
    const h = terrain.heightAt(x, z);
    if (h < lowH) { lowH = h; low = [x, z]; }
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rng();
    const r = 3.2 + rng() * 1.5;
    const x = low[0] + Math.cos(a) * r, z = low[1] + Math.sin(a) * r;
    palm(b.withId(id++).at(x, terrain.surfaceAt(x, z) - 0.1, z, a + Math.PI), 4 + rng() * 2, rng);
  }
  for (let k = 0; k < 14; k++) {
    const x = (rng() - 0.5) * S * 0.85, z = (rng() - 0.5) * S * 0.85;
    if (Math.hypot(x - low[0], z - low[1]) < 6) continue;
    const y = terrain.surfaceAt(x, z);
    if (k < 9) cactus(b.withId(id++).at(x, y - 0.05, z, rng() * 6), 1.2 + rng() * 1.4, rng);
    else items.push(...parts.rock(x, y, z, 0.7 + rng() * 0.6, shape, rng, id++));
  }
  // 遗迹：一排断柱 + 半个拱
  const rx = low[0] > 0 ? -7 : 7, rz = -4;
  for (let k = 0; k < 5; k++) {
    const x = rx + (k - 2) * 1.8, z = rz;
    brokenColumn(b.withId(id++).at(x, terrain.surfaceAt(x, z) - 0.15, z), 1.5 + rng() * 2.2, rng);
  }
  b.withId(id++).add('torus', rx, terrain.surfaceAt(rx, rz + 3) + 0.4, rz + 3, 4.2, 4.2, 1.0, 'stone', { args: [0.14, Math.PI] });
  const sy = terrain.surfaceAt(low[0] + 4.5, low[1]);
  return {
    items,
    dynamic: [characterAt(v, low[0] + 4.5, sy, low[1])],
    terrain,
    water: { level: lowH + 0.45, shape: 'square', size: 9, center: low },
    lights: [],
    bounds: { center: [0, 1, 0], radius: half * 1.25 },
    viewSize: S * 0.6,
    playerStart: [low[0] + 4.5, sy, low[1]],
  };
});
