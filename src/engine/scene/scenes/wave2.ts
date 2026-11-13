import { poissonDisc } from '../../../core/noise';
import { ROLE_INDEX, type Role } from '../../../content/roles';
import { num } from '../../../dims/registry';
import { B, castleWall, cnLantern, crateStack, euroHouse, pipeRun, scifiDoor, shelf, tank, torch, tower } from '../kits';
import * as K from '../kits2';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, cloudsOver, shapeOf, terrainFrom } from '../sceneUtil';
import type { DynamicGroup, Item, SceneDesc } from '../types';


/*
 * 第二批场景：山路、水下、农场、城市、城堡、地牢、酒馆、工厂、废城、超现实、赛道、竞技场、桌游、策略地图。
 * 每个场景都有自己的空间结构，而不是同一块底座上的摆件。
 */

const flat = (half: number) => ({ heightAt: () => 0, inside: (x: number, z: number) => Math.abs(x) < half && Math.abs(z) < half });

/* ---------- 山地：盘山路 ---------- */
registerSceneBuilder('mountain', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 40, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 31, { size: S, island: 'circle', fractal: 'ridged', height: Math.max(9, num(v, 'world.height') * 1.7), frequency: 0.045, sea: 0.08, redistribute: 1.6 });
  const shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  // 盘山路：螺旋线贴着地表
  let id = 20;
  for (let t = 0; t < 1; t += 0.008) {
    const a = t * Math.PI * 5;
    const r = half * 0.75 * (1 - t * 0.8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = terrain.surfaceAt(x, z);
    items.push({ prim: 'box', args: [0.4], pos: [x, y + 0.04, z], rot: [0, -a, 0], scale: [1.4, 0.12, 1.6], role: 'path', id: 5, noOutline: true });
  }
  for (const [px, pz] of poissonDisc(S, S, 2.2, rng, (x, z) => terrain.inside(x - half, z - half))) {
    const x = px - half, z = pz - half;
    const h = terrain.heightAt(x, z) / terrain.amplitude;
    if (h < 0.12) continue;
    const y = terrain.surfaceAt(x, z);
    const r = rng();
    if (h < 0.5 && r < 0.4) items.push(...parts.pineTree(x, y, z, 1.2 + rng() * 0.6, shape, rng, id++));
    else if (r < 0.2) items.push(...parts.rock(x, y, z, 0.7 + rng() * 0.8, shape, rng, id++));
  }
  // 山顶经幡/小亭与洞口
  const top = (() => { let best: [number, number] = [0, 0]; let bh = -1; for (let k = 0; k < 300; k++) { const x = (rng() - 0.5) * S * 0.5, z = (rng() - 0.5) * S * 0.5; const h = terrain.heightAt(x, z); if (h > bh) { bh = h; best = [x, z]; } } return best; })();
  const ty = terrain.surfaceAt(top[0], top[1]);
  b.withId(id++).cyl(top[0], ty, top[1], 0.06, 3, 'wood');
  for (let k = 0; k < 5; k++) b.withId(id++).add('box', top[0] + 0.3 + k * 0.35, ty + 2.6 - k * 0.25, top[1], 0.3, 0.4, 0.02, (['accent', 'interactive', 'cloth', 'grass', 'paper'] as Role[])[k], { sway: 0.5, noOutline: true });
  const sx = Math.cos(0) * half * 0.75, sz = 0;
  const sy = terrain.surfaceAt(sx, sz);
  return {
    items, terrain,
    dynamic: [characterAt(v, sx, sy, sz), ...cloudsOver(v, rng, 5, half, terrain.amplitude + 4)],
    water: { level: terrain.seaY, shape: 'square', size: S * 8 },
    lights: [], bounds: { center: [0, terrain.amplitude * 0.4, 0], radius: half * 1.3 + terrain.amplitude * 0.5 }, viewSize: S * 0.7, playerStart: [sx, sy, sz],
  };
});

/* ---------- 水下：浅海珊瑚与沉船 ---------- */
registerSceneBuilder('underwater', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 32, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 41, { size: S, island: 'none', sea: 0, fractal: 'fbm', height: 2.4, frequency: 0.07, forceRole: ROLE_INDEX.sand, base: String(v['world.base']) === 'none' ? 'plinth' : String(v['world.base']) });
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  const coralRoles: Role[] = ['accent', 'flower', 'interactive', 'character', 'highland'];
  for (const [px, pz] of poissonDisc(S - 2, S - 2, 1.4, rng)) {
    const x = px - half + 1, z = pz - half + 1;
    const y = terrain.surfaceAt(x, z);
    const r = rng();
    if (Math.hypot(x, z) < 2) continue;
    if (r < 0.35) K.coral(b.withId(id++).at(x, y, z, rng() * 6), rng, coralRoles[Math.floor(rng() * coralRoles.length)]);
    else if (r < 0.6) K.seaweed(b.withId(id++).at(x, y, z), 1.5 + rng() * 2.5);
    else if (r < 0.68) items.push(...parts.rock(x, y, z, 0.6, shapeOf(v), rng, id++));
  }
  K.shipwreck(b.withId(id++).at(6, terrain.surfaceAt(6, -5) - 0.3, -5, 0.6));
  b.withId(id++).add('torus', -6, terrain.surfaceAt(-6, 5) + 0.4, 5, 1.6, 1.6, 1.6, 'metal', { rx: 1.3, args: [0.1] });
  const dynamic: DynamicGroup[] = [characterAt(v, 0, terrain.surfaceAt(0, 0), 0)];
  for (let k = 0; k < 9; k++) {
    const fi: Item[] = [];
    const school = new B(fi, 3);
    const role = coralRoles[k % coralRoles.length];
    for (let j = 0; j < 4; j++) K.fish(school.at((rng() - 0.5) * 1.5, (rng() - 0.5) * 0.6, (rng() - 0.5) * 1.5), role);
    dynamic.push({ kind: 'cloud', items: fi, origin: [(rng() - 0.5) * S * 0.8, 2.5 + rng() * 3, (rng() - 0.5) * S * 0.8], data: { speed: 0.6 + rng(), range: half } });
  }
  return { items, terrain, dynamic, lights: [{ pos: [6, 1.5, -5], color: '#7FE7FF', range: 6, intensity: 1.2 }], bounds: { center: [0, 1, 0], radius: half * 1.2 }, viewSize: S * 0.6, playerStart: [0, terrain.surfaceAt(0, 0), 0] };
});

/* ---------- 乡村与农场 ---------- */
registerSceneBuilder('farm', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 40, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 51, { size: S, island: 'none', sea: 0, height: 1.2, frequency: 0.04, forceRole: ROLE_INDEX.grass, base: String(v['world.base']) === 'none' ? 'plinth' : String(v['world.base']) });
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  const kinds = ['wheat', 'cabbage', 'corn', 'wheat'] as const;
  for (let k = 0; k < 4; k++) {
    const x = (k % 2 ? 1 : -1) * 7.5, z = (k < 2 ? -1 : 1) * 7;
    K.cropRows(b.withId(id++).at(x, terrain.surfaceAt(x, z), z), 9, 8, kinds[k], rng);
  }
  for (let z = -half + 1; z < half - 1; z += 1) items.push({ prim: 'box', args: [0.4], pos: [0, terrain.surfaceAt(0, z) + 0.03, z], scale: [1.6, 0.08, 1.05], role: 'path', id: 5, noOutline: true });
  K.barn(b.withId(id++).at(-14, terrain.surfaceAt(-14, -14), -14, 0.4), 6, 5);
  euroHouse(b.withId(id++).at(13.5, terrain.surfaceAt(13.5, -14), -14, -0.3), 5, 4, 1, shapeOf(v).detail, rng);
  K.windmill(b.withId(id++).at(14, terrain.surfaceAt(14, 13), 13, -0.6), 6);
  for (let k = 0; k < 4; k++) K.haystack(b.withId(id++).at(-14 + k * 2.2, terrain.surfaceAt(-14 + k * 2.2, 14), 14));
  K.scarecrow(b.withId(id++).at(7.5, terrain.surfaceAt(7.5, -7), -7));
  for (let k = 0; k < 8; k++) items.push(...parts.broadleafTree(-half + 2, terrain.surfaceAt(-half + 2, -half + 3 + k * 4.6), -half + 3 + k * 4.6, 1.3, shapeOf(v), rng, id++));
  return { items, terrain, dynamic: [characterAt(v, 0, terrain.surfaceAt(0, 2), 2), ...cloudsOver(v, rng, 4, half, 8)], lights: [{ pos: [13.5, 2, -14], color: '#FFB347', range: 6, intensity: 1.4, night: true }], bounds: { center: [0, 1, 0], radius: half * 1.2 }, viewSize: S * 0.62, playerStart: [0, terrain.surfaceAt(0, 2), 2] };
});

/* ---------- 大型城市 ---------- */
registerSceneBuilder('city', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const blocks = 4, block = 12, road = 4;
  const span = blocks * block + (blocks + 1) * road;
  const half = span / 2;
  items.push({ prim: 'box', args: [0], pos: [0, -0.15, 0], scale: [span, 0.3, span], role: 'path', id: 3, noOutline: true });
  let id = 20;
  const lights: SceneDesc['lights'] = [];
  for (let i = 0; i < blocks; i++) for (let j = 0; j < blocks; j++) {
    const cx = -half + road + block / 2 + i * (block + road), cz = -half + road + block / 2 + j * (block + road);
    b.box(cx, 0, cz, block, 0.2, block, 'stone', { noOutline: true });
    if (i === 1 && j === 2) {
      b.box(cx, 0.2, cz, block - 1, 0.05, block - 1, 'grass', { noOutline: true });
      for (let k = 0; k < 6; k++) items.push(...parts.broadleafTree(cx + (rng() - 0.5) * 8, 0.2, cz + (rng() - 0.5) * 8, 1.2, shapeOf(v), rng, id++));
      continue;
    }
    const center = 1 - Math.hypot(cx, cz) / half;
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2 ? 1 : -1) * 2.9, oz = (k < 2 ? -1 : 1) * 2.9;
      const h = 6 + rng() * 10 + center * 26;
      K.tallBuilding(b.withId(id++).at(cx + ox, 0.2, cz + oz), 5, 5, h, rng);
    }
  }
  for (let k = 0; k < 14; k++) {
    const onX = rng() > 0.5;
    const t = (rng() - 0.5) * span * 0.9;
    const lane = -half + road / 2 + Math.floor(rng() * (blocks + 1)) * (block + road);
    const roles: Role[] = ['accent', 'interactive', 'character', 'cloth', 'paper'];
    K.car(b.withId(id++).at(onX ? t : lane + 0.8, 0, onX ? lane + 0.8 : t, onX ? 0 : Math.PI / 2), roles[k % roles.length]);
  }
  for (let k = 0; k < 6; k++) lights.push({ pos: [-half + road / 2 + k * (block + road) * 0.8, 4, 0], color: '#FFD08A', range: 14, intensity: 1.4, night: true });
  return { items, dynamic: [characterAt(v, -half + road / 2, 0, 0)], lights, ground: flat(half - 1), bounds: { center: [0, 6, 0], radius: half * 1.25 }, viewSize: span * 0.7, playerStart: [-half + road / 2, 0, 0] };
});

/* ---------- 城堡 ---------- */
registerSceneBuilder('castle', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 44, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 61, { size: S, island: 'circle', sea: 0.06, height: 2.5, frequency: 0.035, forceRole: ROLE_INDEX.grass });
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  const R = 9;
  const base = terrain.surfaceAt(0, 0);
  // 护城河：一圈低洼（用水面表现），城墙四边 + 角楼
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    castleWall(b.withId(id++).at(Math.cos(a) * R, base - 0.2, Math.sin(a) * R, -a + Math.PI / 2), R * 2 - 1.5, 4);
    const c = a + Math.PI / 4;
    tower(b.withId(id++).at(Math.cos(c) * R * 1.41, base - 0.2, Math.sin(c) * R * 1.41), 1.6, 6.5, k % 2 === 0);
  }
  // 主堡
  b.withId(id++).box(0, base, -2, 8, 7, 6, 'stone');
  tower(b.withId(id++).at(-3.2, base + 7, -4), 1.2, 3.5, false);
  tower(b.withId(id++).at(3.2, base + 7, -4), 1.2, 3.5, false);
  b.withId(id++).add('cylinder', 0, base + 10.5, -2, 4, 4, 4, 'roof', { args: [0] });
  b.withId(id++).box(0, base, R - 0.2, 2.4, 3, 0.8, 'wood');
  // 吊桥
  b.withId(id++).box(0, base - 0.1, R + 2.5, 2.6, 0.2, 4, 'wood');
  for (let k = 0; k < 6; k++) euroHouse(b.withId(id++).at(-5 + (k % 3) * 5, base, 4 + Math.floor(k / 3) * 3.3 - 2, rng() * 0.3), 3, 2.6, 1, 0.3, rng);
  for (const [px, pz] of poissonDisc(S, S, 2.4, rng, (x, z) => terrain.inside(x - half, z - half))) {
    const x = px - half, z = pz - half;
    if (Math.hypot(x, z) < R * 1.7 || terrain.heightAt(x, z) < terrain.seaY + 0.3) continue;
    if (rng() < 0.4) items.push(...parts.broadleafTree(x, terrain.surfaceAt(x, z), z, 1.3, shapeOf(v), rng, id++));
  }
  const lights: SceneDesc['lights'] = [0, 1, 2, 3].map((k) => { const c = (k / 4) * Math.PI * 2 + Math.PI / 4; return { pos: [Math.cos(c) * R * 1.41, base + 3.5, Math.sin(c) * R * 1.41] as [number, number, number], color: '#FFB347', range: 7, intensity: 1.4, night: true }; });
  return {
    items, terrain, dynamic: [characterAt(v, 0, terrain.surfaceAt(0, R + 6), R + 6), ...cloudsOver(v, rng, 4, half, 14)],
    water: { level: terrain.seaY, shape: 'square', size: S * 6 }, lights,
    bounds: { center: [0, 3, 0], radius: half * 1.2 }, viewSize: S * 0.62, playerStart: [0, terrain.surfaceAt(0, R + 6), R + 6],
  };
});

/* ---------- 地牢：BSP 房间 + 走廊 ---------- */
registerSceneBuilder('dungeon', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const N = 34, cell = 1;
  const half = (N * cell) / 2;
  const grid = new Uint8Array(N * N).fill(1);
  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  const split = (x: number, y: number, w: number, h: number, depth: number) => {
    if (depth === 0 || w < 9 || h < 9) {
      const rw = Math.max(4, Math.floor(w * (0.55 + rng() * 0.3))), rh = Math.max(4, Math.floor(h * (0.55 + rng() * 0.3)));
      const rx = x + 1 + Math.floor(rng() * Math.max(1, w - rw - 1)), ry = y + 1 + Math.floor(rng() * Math.max(1, h - rh - 1));
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (let j = ry; j < ry + rh; j++) for (let i = rx; i < rx + rw; i++) grid[j * N + i] = 0;
      return;
    }
    if (w > h) { const s = Math.floor(w * (0.4 + rng() * 0.2)); split(x, y, s, h, depth - 1); split(x + s, y, w - s, h, depth - 1); }
    else { const s = Math.floor(h * (0.4 + rng() * 0.2)); split(x, y, w, s, depth - 1); split(x, y + s, w, h - s, depth - 1); }
  };
  split(0, 0, N, N, 3);
  for (let k = 1; k < rooms.length; k++) {
    const a = rooms[k - 1], c = rooms[k];
    let x = Math.floor(a.x + a.w / 2), y = Math.floor(a.y + a.h / 2);
    const tx = Math.floor(c.x + c.w / 2), ty = Math.floor(c.y + c.h / 2);
    while (x !== tx) { grid[y * N + x] = 0; grid[(y + 1) * N + x] = 0; x += Math.sign(tx - x); }
    while (y !== ty) { grid[y * N + x] = 0; grid[y * N + x + 1] = 0; y += Math.sign(ty - y); }
  }
  const items: Item[] = [];
  const b = new B(items, 10);
  const wx = (i: number) => -half + (i + 0.5) * cell;
  items.push({ prim: 'box', args: [0], pos: [0, -0.1, 0], scale: [N * cell, 0.2, N * cell], role: 'stone', id: 3 });
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!grid[j * N + i]) continue;
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < N && y < N && !grid[y * N + x]) { near = true; break; } }
    if (!near) continue;
    items.push({ prim: 'box', args: [0.15], pos: [wx(i), 1.1, wx(j)], scale: [cell, 2.2, cell], role: 'structure', id: 5 + ((i * 3 + j) % 7) });
  }
  let id = 30;
  const lights: SceneDesc['lights'] = [];
  rooms.forEach((r, k) => {
    const cx = wx(r.x + r.w / 2 - 0.5), cz = wx(r.y + r.h / 2 - 0.5);
    if (lights.length < 8) { torch(b.withId(id++), wx(r.x) + 0.3, wx(r.y) + 0.3); lights.push({ pos: [wx(r.x) + 0.3, 1.35, wx(r.y) + 0.3], color: '#FF9A3D', range: 6, intensity: 1.8 }); }
    if (k % 3 === 0) items.push(...parts.chest(cx, 0, cz, rng() * 3, id++));
    else if (k % 3 === 1) K.dangerZone(b.withId(id++).at(cx, 0, cz), 1.1);
    else for (let p = 0; p < 2; p++) b.withId(id++).cyl(cx + (p - 0.5) * 2, 0, cz, 0.3, 2.2, 'stone');
  });
  const s = rooms[0];
  const sx = wx(s.x + 1), sz = wx(s.y + 1);
  return {
    items, dynamic: [characterAt(v, sx, 0, sz)], lights,
    ground: { heightAt: () => 0, inside: (x, z) => { const i = Math.floor((x + half) / cell), j = Math.floor((z + half) / cell); return i >= 0 && j >= 0 && i < N && j < N && !grid[j * N + i]; } },
    bounds: { center: [0, 1, 0], radius: half * 1.25 }, viewSize: N * cell * 0.75, playerStart: [sx, 0, sz],
  };
});

/* ---------- 公共室内：酒馆 ---------- */
registerSceneBuilder('tavern', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const W = 12, D = 10, H = 3.6;
  b.withId(3).box(0, -0.2, 0, W + 0.4, 0.2, D + 0.4, 'wood');
  b.withId(4).box(0, 0, -D / 2, W, H, 0.3, 'structure').box(-W / 2, 0, 0, 0.3, H, D, 'structure');
  for (let k = 0; k < 5; k++) b.withId(4).box(-W / 2 + 1.2 + k * 2.4, H - 0.3, -D / 2 + 0.3, 0.25, 0.25, 0.4, 'wood');
  // 吧台
  b.withId(5).box(-1, 0, -2.6, 7, 1.1, 0.8, 'wood').box(-1, 1.1, -2.6, 7.2, 0.08, 1.0, 'trim');
  shelf(b.withId(6).at(-2.5, 0, -D / 2 + 0.4), rng);
  shelf(b.withId(6).at(0, 0, -D / 2 + 0.4), rng);
  for (let k = 0; k < 4; k++) b.withId(7).cyl(2.8 + k * 0.6, 0, -D / 2 + 0.7, 0.28, 0.7, 'wood', 0.9);
  // 桌椅
  let id = 20;
  for (let k = 0; k < 4; k++) {
    const x = -3.5 + (k % 2) * 5, z = 1 + Math.floor(k / 2) * 2.8;
    const t = b.withId(id++).at(x, 0, z);
    t.cyl(0, 0, 0, 0.12, 0.75, 'wood').cyl(0, 0.75, 0, 0.8, 0.06, 'wood');
    for (let c = 0; c < 3; c++) { const a = (c / 3) * Math.PI * 2 + rng(); t.cyl(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, 0.25, 0.45, 'wood'); }
    t.cyl(0.2, 0.81, 0.1, 0.07, 0.18, 'interactive', 0.9);
    if (k % 2) t.ball(-0.25, 0.85, -0.1, 0.1, 0.08, 0.1, 'accent');
  }
  for (let k = 0; k < 3; k++) cnLantern(b.withId(id++), -4 + k * 4, H - 0.6, 0.5);
  b.withId(id++).box(W / 2 - 1.5, 0, -D / 2 + 0.6, 2, 1.6, 0.8, 'stone').ball(W / 2 - 1.5, 0.4, -D / 2 + 0.9, 0.35, 0.3, 0.2, 'emissive');
  crateStack(b.withId(id++).at(W / 2 - 1, 0, 3.5, 0.3), rng);
  return {
    items, dynamic: [characterAt(v, 2, 0, 3.5)],
    lights: [
      { pos: [-4, 2.9, 0.5], color: '#FFB060', range: 6, intensity: 1.6 }, { pos: [0, 2.9, 0.5], color: '#FFB060', range: 6, intensity: 1.6 },
      { pos: [4, 2.9, 0.5], color: '#FFB060', range: 6, intensity: 1.6 }, { pos: [W / 2 - 1.5, 0.6, -D / 2 + 1], color: '#FF7A3D', range: 5, intensity: 2 },
    ],
    ground: flat(W / 2 - 0.5), bounds: { center: [0, 1.5, 0], radius: 8.5 }, viewSize: 14, playerStart: [2, 0, 3.5],
  };
});

/* ---------- 工业：车间 ---------- */
registerSceneBuilder('factory', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const W = 30, D = 22;
  b.withId(3).box(0, -0.2, 0, W, 0.2, D, 'metal');
  b.withId(4).box(0, 0, -D / 2, W, 6, 0.4, 'structure').box(-W / 2, 0, 0, 0.4, 6, D, 'structure');
  for (let k = 0; k < 6; k++) b.withId(4).box(-W / 2 + 2 + k * 5, 0, -D / 2 + 0.4, 0.5, 6, 0.5, 'trim');
  let id = 20;
  for (let k = 0; k < 4; k++) K.machine(b.withId(id++).at(-9 + k * 6, 0, -6), rng);
  K.conveyor(b.withId(id++).at(-1, 0, -2, Math.PI / 2), 22);
  K.conveyor(b.withId(id++).at(10.5, 0, 3.5), 11);
  K.hazardStripe(b.withId(id++).at(-1, 0, 0), 24);
  tank(b.withId(id++).at(11, 0, -7), 1.6, 4);
  tank(b.withId(id++).at(7.5, 0, -7.5), 1.2, 3.4);
  pipeRun(b.withId(id++).at(0, 0, -D / 2 + 1), W - 2, 4.5);
  pipeRun(b.withId(id++).at(-W / 2 + 1, 0, 0, Math.PI / 2), D - 2, 3.6, 0.18);
  scifiDoor(b.withId(id++).at(4, 0, -D / 2 + 0.3), 3, 3.4);
  for (let k = 0; k < 6; k++) crateStack(b.withId(id++).at(-12 + k * 1.6, 0, 7 + (rng() - 0.5), rng()), rng);
  const lights: SceneDesc['lights'] = [-9, -3, 3, 9].map((x) => ({ pos: [x, 4.5, 0] as [number, number, number], color: '#FFE6B0', range: 9, intensity: 1.3, night: true }));
  return { items, dynamic: [characterAt(v, 0, 0, 5)], lights, ground: flat(13), bounds: { center: [0, 2, 0], radius: 19 }, viewSize: 26, playerStart: [0, 0, 5] };
});

/* ---------- 废弃与末日：废城 ---------- */
registerSceneBuilder('ruins', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 36, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 71, { size: S, island: 'none', sea: 0, height: 0.8, frequency: 0.05, forceRole: ROLE_INDEX.soil, base: String(v['world.base']) === 'none' ? 'plinth' : String(v['world.base']) });
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  for (let z = -half + 1; z < half - 1; z += 1.2) items.push({ prim: 'box', args: [0.1], pos: [0, terrain.surfaceAt(0, z) + 0.02, z], rot: [0, (rng() - 0.5) * 0.15, 0], scale: [3.5, 0.1, 1.15], role: 'path', id: 5, noOutline: true });
  for (let k = 0; k < 8; k++) {
    const s = k % 2 ? 1 : -1;
    const z = -half + 3 + Math.floor(k / 2) * 8.5;
    K.ruinedBuilding(b.withId(id++).at(s * 8, terrain.surfaceAt(s * 8, z), z, rng() * 0.3), 7, 6, 6 + rng() * 6, rng);
  }
  for (let k = 0; k < 4; k++) K.car(b.withId(id++).at((rng() - 0.5) * 3, terrain.surfaceAt(0, -10 + k * 6), -10 + k * 6, rng() * 3), 'metal');
  const lights: SceneDesc['lights'] = [];
  for (let k = 0; k < 4; k++) {
    const x = (k % 2 ? 1 : -1) * 3, z = -12 + k * 7;
    K.fireBarrel(b.withId(id++).at(x, terrain.surfaceAt(x, z), z));
    lights.push({ pos: [x, terrain.surfaceAt(x, z) + 1.1, z], color: '#FF7A2D', range: 6, intensity: 1.8 });
  }
  for (let k = 0; k < 18; k++) {
    const x = (rng() - 0.5) * S * 0.9, z = (rng() - 0.5) * S * 0.9;
    if (Math.abs(x) < 2.2) continue;
    items.push(...parts.bush(x, terrain.surfaceAt(x, z), z, 1.1, shapeOf(v), rng, id++));
  }
  return { items, terrain, dynamic: [characterAt(v, 0, terrain.surfaceAt(0, 4), 4)], lights, bounds: { center: [0, 2, 0], radius: half * 1.25 }, viewSize: S * 0.62, playerStart: [0, terrain.surfaceAt(0, 4), 4] };
});

/* ---------- 超现实：浮空块与不可能楼梯 ---------- */
registerSceneBuilder('surreal', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 20;
  // 棋盘地面
  for (let j = -6; j < 6; j++) for (let i = -6; i < 6; i++) b.withId(3).box(i * 2 + 1, -0.2, j * 2 + 1, 1.98, 0.2, 1.98, (i + j) % 2 ? 'paper' : 'ink', { noOutline: true, args: [0] });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    K.floatingChunk(b.withId(id++).at(Math.cos(a) * (7 + rng() * 6), 3 + rng() * 8, Math.sin(a) * (7 + rng() * 6)), 1.2 + rng() * 1.4, rng);
  }
  K.stairs(b.withId(id++).at(-3, 0, -4), 10, 1.6);
  K.stairs(b.withId(id++).at(-3, 3, 0, Math.PI / 2), 8, 1.6);
  for (let k = 0; k < 3; k++) K.doorFrame(b.withId(id++).at(4 + k * 1.8, k * 1.5, -2 - k, -0.4 * k));
  b.withId(id++).ball(9, 14, -12, 4, 4, 4, 'emissive');
  b.withId(id++).add('torus', 0, 6, -10, 7, 7, 7, 'accent', { args: [0.06] });
  b.withId(id++).box(5, 0, 5, 1.6, 1.6, 1.6, 'interactive', { rx: 0.7, rz: 0.6 });
  return { items, dynamic: [characterAt(v, 0, 0, 4)], lights: [{ pos: [9, 14, -12], color: '#FFE08A', range: 30, intensity: 1.5 }], ground: flat(11.5), bounds: { center: [0, 4, 0], radius: 17 }, viewSize: 26, playerStart: [0, 0, 4] };
});

/* ---------- 交通与赛道 ---------- */
registerSceneBuilder('racetrack', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const half = 26;
  items.push({ prim: 'box', args: [0], pos: [0, -0.15, 0], scale: [half * 2, 0.3, half * 2], role: 'grass', id: 3, noOutline: true });
  // 赛道：椭圆环 + 路肩
  const A = 18, Bz = 11, w = 4.2;
  const n = 72;
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
    const p0 = [Math.cos(t0) * A, Math.sin(t0) * Bz], p1 = [Math.cos(t1) * A, Math.sin(t1) * Bz];
    const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const ang = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
    items.push({ prim: 'box', args: [0], pos: [mx, 0.02, mz], rot: [0, ang, 0], scale: [w, 0.06, len + 0.08], role: 'path', id: 4, noOutline: true });
    const nx = Math.cos(ang), nz = -Math.sin(ang);
    for (const s of [-1, 1]) items.push({ prim: 'box', args: [0], pos: [mx + nx * s * (w / 2 + 0.25), 0.05, mz + nz * s * (w / 2 + 0.25)], rot: [0, ang, 0], scale: [0.5, 0.1, len + 0.08], role: k % 2 ? 'accent' : 'paper', id: 5, noOutline: true });
  }
  let id = 20;
  K.barrier(b.withId(id++).at(0, 0, -Bz - 4), 16);
  K.barrier(b.withId(id++).at(0, 0, Bz + 4), 16);
  b.withId(id++).box(-3, 0, -Bz, 0.4, 4, 0.4, 'metal').box(3, 0, -Bz, 0.4, 4, 0.4, 'metal').box(0, 4, -Bz, 6.6, 0.8, 0.4, 'accent');
  const roles: Role[] = ['accent', 'interactive', 'character', 'cloth'];
  for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.12; K.car(b.withId(id++).at(Math.cos(t) * A + (k % 2) * 1.2, 0.05, Math.sin(t) * Bz, -t), roles[k]); }
  for (let k = 0; k < 26; k++) {
    const a = rng() * Math.PI * 2, r = 1.25 + rng() * 0.35;
    const x = Math.cos(a) * A * r, z = Math.sin(a) * Bz * r;
    if (Math.abs(x) > half - 1 || Math.abs(z) > half - 1) continue;
    items.push(...parts.pineTree(x, 0, z, 1.4, shapeOf(v), rng, id++));
  }
  return { items, dynamic: [characterAt(v, 0, 0, 0)], lights: [], ground: flat(half - 1), bounds: { center: [0, 1, 0], radius: half * 1.15 }, viewSize: 40, playerStart: [0, 0, 0] };
});

/* ---------- 战斗与竞技：Boss 房 ---------- */
registerSceneBuilder('arena', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  const R = 13;
  b.withId(3).cyl(0, -0.4, 0, R, 0.4, 'stone', 1);
  for (let k = 0; k < 6; k++) b.withId(3).add('torus', 0, 0.01, 0, (R - 1 - k * 2) * 2, (R - 1 - k * 2) * 2, 0.3, 'path', { rx: Math.PI / 2, args: [0.015], noOutline: true });
  let id = 20;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    b.withId(id++).box(Math.cos(a) * (R + 0.6), -0.4, Math.sin(a) * (R + 0.6), 2.4, 3 + (k % 2) * 1.5, 1.4, 'structure', { ry: -a });
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    b.withId(id++).cyl(Math.cos(a) * 7, 0, Math.sin(a) * 7, 0.7, 3.5 + rng(), 'stone', 0.9);
  }
  K.statue(b.withId(id++).at(0, 0, -R + 2.5), 5);
  K.dangerZone(b.withId(id++).at(3, 0, 1), 2.2);
  K.dangerZone(b.withId(id++).at(-4, 0, -3), 1.6);
  const lights: SceneDesc['lights'] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    K.brazier(b.withId(id++).at(Math.cos(a) * (R - 1.5), 0, Math.sin(a) * (R - 1.5)));
    lights.push({ pos: [Math.cos(a) * (R - 1.5), 1.5, Math.sin(a) * (R - 1.5)], color: '#FF8A3D', range: 8, intensity: 1.8 });
  }
  return { items, dynamic: [characterAt(v, 0, 0, 7)], lights, ground: { heightAt: () => 0, inside: (x, z) => Math.hypot(x, z) < R - 0.8 }, bounds: { center: [0, 1.5, 0], radius: R * 1.25 }, viewSize: R * 2.3, playerStart: [0, 0, 7] };
});

/* ---------- 桌面与界面：棋盘与卡牌 ---------- */
registerSceneBuilder('tabletop', () => {
  const items: Item[] = [];
  const b = new B(items, 10);
  b.withId(3).box(0, -0.4, 0, 16, 0.4, 11, 'wood');
  b.withId(3).box(0, -0.05, 0, 15, 0.06, 10, 'cloth', { noOutline: true });
  const n = 6, size = 0.9;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) K.boardTile(b.withId(4), -2.5 + (i - n / 2 + 0.5) * size, (j - n / 2 + 0.5) * size, size, (i + j) % 2 === 1);
  b.withId(4).box(-2.5, -0.03, 0, n * size + 0.4, 0.1, n * size + 0.4, 'trim', { noOutline: true });
  let id = 20;
  const pieces: ['pawn' | 'king' | 'rook', Role][] = [['king', 'ink'], ['rook', 'ink'], ['pawn', 'ink'], ['pawn', 'paper'], ['rook', 'paper'], ['king', 'paper']];
  pieces.forEach(([kind, role], k) => K.chessPiece(b.withId(id++).at(-2.5 + ((k % 3) - 1) * size * 2 + 0.45, 0.12, (k < 3 ? -1.5 : 1.5) * size), kind, role));
  for (let k = 0; k < 5; k++) K.card(b.withId(id++).at(3.4 + k * 0.35, 0.01 + k * 0.025, -1.6 + k * 0.1), (['accent', 'interactive', 'cloth', 'character', 'grass'] as Role[])[k], -0.3 + k * 0.15);
  for (let k = 0; k < 3; k++) K.card(b.withId(id++).at(3.6 + k * 0.8, 0.01, 1.6), (['accent', 'cloth', 'highland'] as Role[])[k], 0);
  K.die(b.withId(id++).at(1.6, 0.15, 2.6), 0.4);
  K.die(b.withId(id++).at(2.1, 0.15, 2.8), 1.1);
  K.coinStack(b.withId(id++).at(5.8, 0, -2.6), 6);
  K.coinStack(b.withId(id++).at(6.3, 0, -2.4), 3);
  b.withId(id++).cyl(-6.6, 0, 3.6, 0.35, 0.9, 'glass', 0.9).ball(-6.6, 1.1, 3.6, 0.2, 0.25, 0.2, 'emissive');
  return { items, dynamic: [], lights: [{ pos: [-6.6, 1.3, 3.6], color: '#FFC46B', range: 9, intensity: 1.6 }], ground: flat(7), bounds: { center: [0, 0.5, 0], radius: 9 }, viewSize: 13, playerStart: [0, 0, 0] };
});

/* ---------- 宏观观察：六边形策略地图 ---------- */
registerSceneBuilder('strategy', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const S = 46, half = S / 2;
  const terrain = terrainFrom(v, ctx.seed + 81, { size: S, island: 'circle', mesh: 'hexTiles', resolution: 66, tileLevels: 6, height: 4, sea: 0.2, voxel: false });
  const items: Item[] = [];
  let id = 20;
  const roles: Role[] = ['accent', 'cloth'];
  for (const [px, pz] of poissonDisc(S, S, 2.6, rng, (x, z) => terrain.inside(x - half, z - half))) {
    const x = px - half, z = pz - half;
    const h = terrain.surfaceAt(x, z);
    if (h < terrain.seaY + 0.2) continue;
    const r = rng();
    if (r < 0.25) items.push(...parts.pineTree(x, h, z, 0.8, shapeOf(v), rng, id++));
    else if (r < 0.32) items.push(...parts.house(x, h, z, 0.9, shapeOf(v), rng() * 6, id++));
    else if (r < 0.4) {
      const side = roles[Math.floor(rng() * 2)];
      items.push({ prim: 'cylinder', args: [0.7], pos: [x, h + 0.25, z], scale: [0.4, 0.5, 0.4], role: side, id: id++ });
      items.push({ prim: 'box', args: [0], pos: [x + 0.12, h + 0.75, z], scale: [0.35, 0.22, 0.02], role: side, id: id - 1, noOutline: true });
    }
  }
  return {
    items, terrain, dynamic: cloudsOver(v, rng, 4, half, 8),
    water: { level: terrain.seaY, shape: 'square', size: S * 6 }, lights: [],
    bounds: { center: [0, 1, 0], radius: half * 1.2 }, viewSize: S * 0.7,
  };
});

