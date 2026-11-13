import { poissonDisc } from '../../../core/noise';
import { ROLE_INDEX } from '../../../content/roles';
import { num } from '../../../dims/registry';
import { B, euroHouse, logPile } from '../kits';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf, terrainFrom } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 雪村：缓坡雪地、冻湖、几栋屋顶积雪的木屋、针叶林、柴堆与暖光窗。
 * 主要验证：高明度场景的冷暖对比、材质区分（雪、木、石、冰）。
 */
registerSceneBuilder('snowVillage', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 36, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 9, { size: S, island: 'circle', sea: 0.12, height: Math.min(num(v, 'world.height'), 4), forceRole: ROLE_INDEX.snow, redistribute: 1.8 });
  const shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  const lights: SceneDesc['lights'] = [];
  let id = 20;
  // 村子：在中心附近找几块平地
  const spots: [number, number][] = [];
  for (let k = 0; k < 60 && spots.length < 5; k++) {
    const a = rng() * Math.PI * 2, r = 3 + rng() * half * 0.45;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = terrain.heightAt(x, z);
    if (y < terrain.seaY + 0.3) continue;
    const slope = Math.abs(terrain.heightAt(x + 1, z) - terrain.heightAt(x - 1, z)) + Math.abs(terrain.heightAt(x, z + 1) - terrain.heightAt(x, z - 1));
    if (slope > 0.9 || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 6)) continue;
    spots.push([x, z]);
  }
  for (const [x, z] of spots) {
    const y = terrain.surfaceAt(x, z) - 0.2;
    const ang = Math.atan2(-x, -z);
    const at = b.withId(id++).at(x, y, z, ang);
    euroHouse(at, 4 + rng() * 1.5, 3.6, 1 + (rng() > 0.6 ? 1 : 0), shape.detail, rng, 'snow');
    logPile(b.withId(id++).at(x + 2.6, y + 0.2, z + 1, ang), rng);
    if (lights.length < 6) lights.push({ pos: [x, y + 1.5, z], color: '#FFB347', range: 6, intensity: 1.6, night: true });
  }
  for (const [px, pz] of poissonDisc(S, S, 1.8, rng, (x, z) => terrain.inside(x - half, z - half))) {
    const x = px - half, z = pz - half;
    const h = terrain.heightAt(x, z);
    if (h < terrain.seaY + 0.15 || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 4.5) || Math.hypot(x, z) < 2) continue;
    const y = terrain.surfaceAt(x, z);
    const r = rng();
    if (r < 0.32) items.push(...parts.pineTree(x, y, z, 1.2 + rng() * 0.8, shape, rng, id++));
    else if (r < 0.38) items.push(...parts.rock(x, y, z, 0.5, shape, rng, id++));
  }
  const sy = terrain.surfaceAt(0, 0);
  return {
    items,
    dynamic: [characterAt(v, 0, sy, 0)],
    terrain,
    water: { level: terrain.seaY, shape: 'square', size: S * 6 },
    lights,
    bounds: { center: [0, 1, 0], radius: half * 1.25 },
    viewSize: S * 0.62,
    playerStart: [0, sy, 0],
  };
});
