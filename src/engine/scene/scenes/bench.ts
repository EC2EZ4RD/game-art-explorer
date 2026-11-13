import { num, str } from '../../../dims/registry';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import type { Item, SceneDesc } from '../types';

/*
 * 对象测试台：转台上一圈典型对象（角色、房屋、阔叶树、松、石、木桶、木箱、灯笼、蘑菇、宝箱）。
 * 不受地形干扰，专心看形状、材质和线条。
 */

registerSceneBuilder('bench', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const shape: parts.ShapeOpts = {
    roundness: num(v, 'shape.roundness'),
    proportion: num(v, 'shape.proportion'),
    detail: num(v, 'shape.detail'),
    variation: num(v, 'shape.variation'),
    canopy: str(v, 'shape.canopy'),
  };
  const R = 5.2;
  const items: Item[] = [
    { prim: 'cylinder', pos: [0, -0.25, 0], scale: [R * 2.15, 0.5, R * 2.15], role: 'stone', id: 1 },
    { prim: 'cylinder', pos: [0, -0.75, 0], scale: [R * 2.3, 0.5, R * 2.3], role: 'wood', id: 1 },
  ];
  let id = 10;
  const slots: [string, number][] = [
    ['house', 0], ['tree', 1], ['pine', 2], ['rocks', 3], ['barrel', 4], ['crate', 5], ['lantern', 6], ['mushroom', 7], ['chest', 8],
  ];
  const lights: SceneDesc['lights'] = [];
  for (const [kind, k] of slots) {
    const a = (k / slots.length) * Math.PI * 2 + 0.3;
    const r = kind === 'house' ? R * 0.62 : R * 0.72;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    switch (kind) {
      case 'house': items.push(...parts.house(x, 0, z, 2.2, shape, -a + Math.PI / 2, id++)); break;
      case 'tree': items.push(...parts.broadleafTree(x, 0, z, 1.5, shape, rng, id++)); break;
      case 'pine': items.push(...parts.pineTree(x, 0, z, 1.5, shape, rng, id++)); break;
      case 'rocks':
        items.push(...parts.rock(x, 0, z, 0.8, shape, rng, id++));
        items.push(...parts.rock(x + 0.6, 0, z + 0.4, 0.45, shape, rng, id++));
        break;
      case 'barrel': items.push(...parts.barrel(x, 0, z, id++)); break;
      case 'crate':
        items.push(...parts.crate(x, 0, z, 0.7, 0.3, id++));
        items.push(...parts.crate(x + 0.1, 0.7, z, 0.45, 0.9, id++));
        break;
      case 'lantern':
        items.push(...parts.lanternPost(x, 0, z, id++));
        lights.push({ pos: [x, 1.35, z], color: '#FFB347', range: 6, intensity: 1.5, night: true });
        break;
      case 'mushroom':
        items.push(...parts.mushroom(x, 0, z, 0.9, id++));
        items.push(...parts.mushroom(x + 0.45, 0, z + 0.2, 0.5, id++));
        break;
      case 'chest': items.push(...parts.chest(x, 0, z, -a, id++)); break;
    }
  }
  return {
    items,
    dynamic: [{ kind: 'character', items: parts.character(str(v, 'shape.character'), num(v, 'shape.headRatio'), shape, 2), origin: [0, 0, 0] }],
    lights,
    bounds: { center: [0, 1, 0], radius: R * 1.35 },
    viewSize: R * 2.6,
    playerStart: [0, 0, 0],
  };
});
