import { B, bed, chair, desk, pottedPlant, roomShell, rug, shelf } from '../kits';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item } from '../types';

/*
 * 生活室内（书房兼卧室）：剖开两面墙的房间，床、书桌、椅、书架、地毯、盆栽、台灯，后墙有窗。
 * 主要验证：家具尺度、材料区分、室内光（窗光与台灯）与生活叙事。
 */
registerSceneBuilder('room', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const W = 7, D = 6, H = 3;
  roomShell(b.withId(3), W, D, H);
  rug(b.withId(4).at(0.4, 0.01, 0.6), 3.2, 2.2);
  bed(b.withId(5).at(-2.2, 0, -1.6));
  desk(b.withId(6).at(1.8, 0, -2.4));
  chair(b.withId(7).at(1.8, 0, -1.6, Math.PI));
  shelf(b.withId(8).at(-3.2, 0, 1.4, Math.PI / 2), rng);
  pottedPlant(b.withId(9), 3.0, 1.9, 1.3);
  pottedPlant(b.withId(9), -0.4, -2.55, 0.8);
  b.withId(11).box(2.8, 0, 0.4, 0.9, 0.7, 0.5, 'wood').box(2.8, 0.7, 0.4, 0.95, 0.04, 0.55, 'trim');
  b.withId(12).cyl(2.75, 0.74, 0.35, 0.09, 0.14, 'interactive', 0.8);
  b.withId(13).box(-1.0, 1.6, -2.88, 1.2, 0.8, 0.04, 'paper', { noOutline: true });
  return {
    items,
    dynamic: [characterAt(v, 0.6, 0, 1.2)],
    lights: [
      { pos: [2.25, 1.2, -2.55], color: '#FFD08A', range: 4.5, intensity: 1.6 },
      { pos: [0, 2.6, 0], color: '#FFF1D6', range: 7, intensity: 0.5, night: true },
    ],
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x) < W / 2 - 0.4 && Math.abs(z) < D / 2 - 0.4 },
    bounds: { center: [0, 1.2, 0], radius: 5.5 },
    viewSize: 9,
    playerStart: [0.6, 0, 1.2],
  };
});
