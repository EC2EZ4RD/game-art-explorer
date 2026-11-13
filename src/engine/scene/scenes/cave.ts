import { B, crystalCluster, torch } from '../kits';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 洞穴：元胞自动机生成的洞穴平面，岩壁柱高低错落，没有顶（俯视剖开），火把与发光水晶照亮通路。
 * 主要验证：局部照明、封闭感、识路。
 */
registerSceneBuilder('cave', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const N = 30, cell = 1.1;
  const half = (N * cell) / 2;
  // 元胞自动机：初始 45% 墙，迭代 5 次（4-5 规则），边界全是墙
  let g: number[] = Array.from({ length: N * N }, (_, i) => {
    const x = i % N, y = Math.floor(i / N);
    return x === 0 || y === 0 || x === N - 1 || y === N - 1 || rng() < 0.45 ? 1 : 0;
  });
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? 1 : g[y * N + x]);
  for (let it = 0; it < 5; it++) {
    const ng = g.slice();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let c = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) c += at(x + i, y + j);
      ng[y * N + x] = c >= 5 || (c >= 4 && at(x, y)) ? 1 : 0;
    }
    g = ng;
  }
  // 保证中心一块空地
  for (let y = N / 2 - 3; y < N / 2 + 3; y++) for (let x = N / 2 - 3; x < N / 2 + 3; x++) g[y * N + x] = 0;
  const items: Item[] = [];
  const b = new B(items, 10);
  const wx = (x: number) => -half + (x + 0.5) * cell;
  items.push({ prim: 'box', args: [0.1], pos: [0, -0.15, 0], scale: [N * cell, 0.3, N * cell], role: 'soil', id: 3 });
  const floor: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!g[y * N + x]) { floor.push([wx(x), wx(y)]); continue; }
    // 只画靠近空地的墙，内部墙矮一些
    let open = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!at(x + i, y + j)) open++;
    const h = open ? 2.2 + rng() * 2.0 : 1.2 + rng() * 0.6;
    items.push({ prim: open ? 'poly' : 'box', args: [rng() > 0.5 ? 1 : 0], pos: [wx(x), h / 2 - 0.1, wx(y)], rot: [rng() * 0.3, rng() * 6, rng() * 0.3], scale: [cell * 1.35, h, cell * 1.35], role: 'rock', id: 5 + (x * 7 + y) % 9 });
  }
  // 火把、水晶、蘑菇沿空地分布
  const lights: SceneDesc['lights'] = [];
  const pickFloor = () => floor[Math.floor(rng() * floor.length)];
  for (let k = 0; k < 4; k++) {
    const [x, z] = pickFloor();
    torch(b.withId(40 + k), x, z);
    lights.push({ pos: [x, 1.35, z], color: '#FF9A3D', range: 6.5, intensity: 1.8 });
  }
  for (let k = 0; k < 4; k++) {
    const [x, z] = pickFloor();
    crystalCluster(b.withId(50 + k).at(x, 0, z), rng);
    lights.push({ pos: [x, 0.6, z], color: '#7FE7FF', range: 4.5, intensity: 1.3 });
  }
  for (let k = 0; k < 10; k++) {
    const [x, z] = pickFloor();
    items.push({ prim: 'cylinder', args: [0.8], pos: [x, 0.12, z], scale: [0.1, 0.24, 0.1], role: 'structure', id: 60 + k, noOutline: true });
    items.push({ prim: 'sphere', pos: [x, 0.26, z], scale: [0.3, 0.16, 0.3], role: rng() > 0.5 ? 'accent' : 'emissive', id: 60 + k });
  }
  return {
    items,
    dynamic: [characterAt(v, 0, 0, 0)],
    lights,
    ground: { heightAt: () => 0, inside: (x, z) => !at(Math.floor((x + half) / cell), Math.floor((z + half) / cell)) },
    bounds: { center: [0, 1, 0], radius: half * 1.25 },
    viewSize: N * cell * 0.75,
    playerStart: [0, 0, 0],
  };
});
