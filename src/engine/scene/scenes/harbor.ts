import { num, str } from '../../../dims/registry';
import { B, boat, cnHall, crateStack, euroHouse, pierSegment, shop, tower } from '../kits';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, heightTextureFrom, shapeOf } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 港口：一侧是岸（沙滩→草地→房屋），一侧是海；木栈桥、渔船、货箱、灯塔。
 * 主要验证：水陆交界、反射与透明、湿度与生产痕迹。
 */
registerSceneBuilder('harbor', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const kit = str(v, 'game.kit');
  const detail = num(v, 'shape.detail');
  const shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  const half = 22;
  // 岸线：x < shore(z) 为陆地，坡向海里
  const shore = (z: number) => 2 + Math.sin(z * 0.25) * 2.2;
  const groundH = (x: number, z: number) => {
    const d = shore(z) - x; // >0 陆地
    return d > 0 ? Math.min(1.2, d * 0.18) : Math.max(-3, d * 0.35);
  };
  const T = 1.5;
  for (let z = -half; z < half; z += T) for (let x = -half; x < half; x += T) {
    const cx = x + T / 2, cz = z + T / 2;
    const h = groundH(cx, cz);
    const role = h > 0.55 ? 'grass' : 'sand';
    items.push({ prim: 'box', args: [0.05], pos: [cx, h / 2 - 1.6, cz], scale: [T, h + 3.2, T], role, id: 3, noOutline: true });
  }
  let id = 20;
  // 房屋一排
  for (let k = 0; k < 4; k++) {
    const z = -12 + k * 7.5, x = -10 + rng() * 2;
    const at = b.withId(id++).at(x, groundH(x, z), z, Math.PI / 2);
    if (kit === 'chinese') cnHall(at, 5, 4, 3, 1, detail * 0.5, 0.06);
    else if (kit === 'european') euroHouse(at, 4.5, 4, 2, detail, rng);
    else shop(at, 4.6, 4.5, 2, rng);
  }
  // 栈桥与船
  const pz = 2;
  pierSegment(b.withId(id++).at(shore(pz) + 5, 0, pz, Math.PI / 2), 10, 2.2, 0.2);
  boat(b.withId(id++).at(shore(pz) + 6, -0.25, pz + 2.6, 0.1), 3.6, true);
  boat(b.withId(id++).at(shore(pz) + 8.5, -0.25, pz - 2.8, -0.2), 2.8, false);
  boat(b.withId(id++).at(shore(-10) + 9, -0.25, -10, 1.2), 3.2, true);
  for (let k = 0; k < 4; k++) crateStack(b.withId(id++).at(shore(pz) + 2 + k * 1.1, 0.38, pz + (rng() - 0.5), rng()), rng);
  // 灯塔
  const lx = shore(14) + 2, lz = 14;
  tower(b.withId(id++).at(lx, groundH(lx, lz), lz), 1.1, 7, false);
  const lights: SceneDesc['lights'] = [{ pos: [lx, groundH(lx, lz) + 6.5, lz + 1.1], color: '#FFE08A', range: 12, intensity: 2, night: true }];
  for (let k = 0; k < 3; k++) {
    const z = -12 + k * 7.5;
    lights.push({ pos: [-8.5, groundH(-8.5, z) + 1.5, z], color: '#FFB347', range: 6, intensity: 1.3, night: true });
  }
  for (let k = 0; k < 12; k++) {
    const z = (rng() - 0.5) * 40, x = -18 + rng() * 6;
    items.push(...parts.broadleafTree(x, groundH(x, z), z, 1.2 + rng() * 0.5, shape, rng, id++));
  }
  const heightTexture = heightTextureFrom(half, groundH);
  return {
    items,
    dynamic: [characterAt(v, shore(pz) - 1.5, groundH(shore(pz) - 1.5, pz), pz)],
    lights,
    water: { level: 0, shape: 'square', size: 300, center: [0, 0], heightTexture, heightHalf: half },
    ground: { heightAt: (x, z) => Math.max(groundH(x, z), x > shore(z) && Math.abs(z - pz) < 1.1 && x < shore(pz) + 10 ? 0.38 : -9), inside: (x, z) => Math.abs(x) < half - 1 && Math.abs(z) < half - 1 && (groundH(x, z) > -0.2 || (Math.abs(z - pz) < 1.1 && x < shore(pz) + 10)) },
    bounds: { center: [0, 1, 0], radius: half * 1.15 },
    viewSize: 30,
    playerStart: [shore(pz) - 1.5, groundH(shore(pz) - 1.5, pz), pz],
  };
});
