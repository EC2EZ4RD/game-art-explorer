import { num } from '../../../dims/registry';
import { B, console_, corridorModule, crateStack, pipeRun, scifiDoor, tank } from '../kits';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 科幻舱室：L 形走廊 + 控制室，墙板、灯带、管线、舱门、储罐与控制台，俯视剖开。
 * 主要验证：模块重复、科技构形、指示灯与信息密度。
 */
registerSceneBuilder('scifi', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const detail = num(v, 'shape.detail');
  const items: Item[] = [];
  const b = new B(items, 10);
  const W = 4.4, H = 3.2;
  corridorModule(b.withId(3).at(0, 0, -2), 16, W, H, detail);
  corridorModule(b.withId(4).at(-8.5, 0, -8, Math.PI / 2), 13, W, H, detail);
  // 控制室
  const room = b.withId(5).at(6.5, 0, 7);
  room.box(0, -0.2, 0, 11, 0.2, 9, 'metal');
  room.box(0, 0, -4.5, 11, H, 0.3, 'structure');
  room.box(5.5, 0, 0, 0.3, H, 9, 'structure');
  for (let k = 0; k < 3; k++) console_(b.withId(20 + k).at(6.5 - 3 + k * 3, 0, 3.4, 0));
  tank(b.withId(30).at(10, 0, 9.5), 1.0, 2.6);
  tank(b.withId(31).at(10, 0, 6.8), 0.8, 2.2);
  pipeRun(b.withId(32).at(6.5, 0, 2.7), 10, 2.7);
  scifiDoor(b.withId(33).at(0, 0, 6.1));
  scifiDoor(b.withId(34).at(-8.5, 0, -14.4));
  for (let k = 0; k < 4; k++) crateStack(b.withId(40 + k).at(-1.2 + (rng() - 0.5) * 0.4, 0, -6 + k * 2.8, rng() * 2), rng);
  const lights: SceneDesc['lights'] = [
    { pos: [0, 2.6, -6], color: '#6FE3FF', range: 7, intensity: 1.4 },
    { pos: [0, 2.6, 2], color: '#6FE3FF', range: 7, intensity: 1.4 },
    { pos: [-8.5, 2.6, -8], color: '#6FE3FF', range: 7, intensity: 1.4 },
    { pos: [6.5, 2.4, 6.5], color: '#9CFFB8', range: 8, intensity: 1.5 },
    { pos: [9.6, 1.5, 8], color: '#FF6B4A', range: 4, intensity: 1.2 },
  ];
  return {
    items,
    dynamic: [characterAt(v, 0, 0, 0)],
    lights,
    ground: {
      heightAt: () => 0,
      inside: (x, z) => (Math.abs(x) < W / 2 - 0.3 && z > -10 && z < 6) || (Math.abs(z + 8) < W / 2 - 0.3 && x > -14.5 && x < 0) || (x > 1.3 && x < 11.6 && z > 2.8 && z < 11.2),
    },
    bounds: { center: [0, 1.4, 0], radius: 16 },
    viewSize: 22,
    playerStart: [0, 0, 0],
  };
});
