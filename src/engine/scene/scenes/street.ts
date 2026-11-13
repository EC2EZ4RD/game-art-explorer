import { num, str } from '../../../dims/registry';
import { B, cnHall, cnLantern, crateStack, euroHouse, shop, stall, streetLamp } from '../kits';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 街巷：一条石板路，两侧临街建筑，摊位、货箱、灯。
 * "文化套件"决定建筑语法：中式市井（悬山铺面 + 幌子 + 灯笼）/ 欧洲小镇（木框架房）/ 现代街道（店铺 + 路灯）。
 * 主要验证：街道层级、招牌、建筑密度与尺度。
 */
registerSceneBuilder('street', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const kit = str(v, 'game.kit');
  const detail = num(v, 'shape.detail');
  const items: Item[] = [];
  const b = new B(items, 10);
  const L = 40, roadW = 6;
  // 路面与人行道
  for (let z = -L / 2; z < L / 2; z += 1.5) {
    for (let x = -roadW / 2; x < roadW / 2; x += 1.5) {
      items.push({ prim: 'box', args: [0.15], pos: [x + 0.75, -0.1, z + 0.75], scale: [1.46, 0.2, 1.46], role: 'path', id: 3, noOutline: true });
    }
  }
  for (const s of [-1, 1]) items.push({ prim: 'box', args: [0.1], pos: [s * (roadW / 2 + 1.2), 0.0, 0], scale: [2.4, 0.2, L], role: 'stone', id: 4, noOutline: true });
  const lights: SceneDesc['lights'] = [];
  let id = 20;
  for (const s of [-1, 1]) {
    let z = -L / 2 + 1;
    let k = 0;
    while (z < L / 2 - 3) {
      const w = 4.2 + rng() * 2.2;
      const d = 5 + rng() * 2;
      const x = s * (roadW / 2 + 2.4 + d / 2);
      const face = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      const at = b.withId(id++).at(x, 0, z + w / 2, face);
      if (kit === 'chinese') {
        cnHall(at, w - 0.4, d - 1.2, 3 + rng() * 0.8, 1, detail * 0.5, 0.08);
        // 幌子
        at.box(w / 2 - 0.6, 2.2, d / 2 + 0.9, 0.05, 1.4, 0.5, rng() > 0.5 ? 'accent' : 'cloth', { sway: 0.3 });
      } else if (kit === 'european') {
        euroHouse(at, w - 0.3, d - 0.6, 2 + (rng() > 0.6 ? 1 : 0), detail, rng);
      } else {
        shop(at, w - 0.2, d, 2 + Math.floor(rng() * 3), rng, k % 2 ? 'accent' : 'interactive');
      }
      if (k % 2 === 0 && lights.length < 8) {
        const lx = s * (roadW / 2 + 0.4), lz = z + w / 2;
        if (kit === 'chinese') {
          cnLantern(b.withId(id++), s * (roadW / 2 + 1.6), 3.1, lz);
          lights.push({ pos: [s * (roadW / 2 + 1.6), 3.4, lz], color: '#FF7A45', range: 7, intensity: 1.5, night: true });
        } else {
          streetLamp(b.withId(id++).at(lx, 0, lz, s > 0 ? Math.PI : 0), 0, 0);
          lights.push({ pos: [lx + (s > 0 ? -0.22 : 0.22), 3.0, lz], color: kit === 'european' ? '#FFC46B' : '#BFE3FF', range: 8, intensity: 1.6, night: true });
        }
      }
      z += w + 0.2;
      k++;
    }
  }
  // 摊位与杂物
  for (let k = 0; k < 4; k++) {
    const s = k % 2 ? 1 : -1;
    stall(b.withId(id++).at(s * (roadW / 2 - 0.9), 0, -12 + k * 7, s > 0 ? -Math.PI / 2 : Math.PI / 2), 1.8, rng);
  }
  for (let k = 0; k < 5; k++) crateStack(b.withId(id++).at((rng() > 0.5 ? 1 : -1) * (roadW / 2 + 1.2), 0.1, -L / 2 + 4 + rng() * (L - 8), rng() * 3), rng);
  return {
    items,
    dynamic: [characterAt(v, 0, 0, 8)],
    lights,
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x) < roadW / 2 + 2.2 && Math.abs(z) < L / 2 - 0.5 },
    bounds: { center: [0, 2, 0], radius: 24 },
    viewSize: 24,
    playerStart: [0, 0, 8],
  };
});
