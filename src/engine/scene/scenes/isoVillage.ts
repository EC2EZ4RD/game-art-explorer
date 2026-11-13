import { RIG_OBLIQUE } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor, gem, grassTuft, npcFigure, signpost } from '../kits2d';
import * as I from '../kitsIso';
import * as J from '../kitsIso2';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, heightTextureFrom, shapeOf } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc } from '../types';

/* ============================================================
 * 斜俯视·村落 oblique-village（塞尔达 众神的三角力量 / Eastward 的 3/4 俯视；技术补全 G，由 scenes/iso.ts 引入）
 * 1 米一格的地图：北边一层台地（崖壁有一道地层线、崖顶一圈草沿），西北角再高一层；石阶在崖上切出缺口连上去。
 * 台地下是村子（几栋屋顶很显眼的村舍、土路、灌木、陶罐、高草、花丛、路牌），一条河从东到西穿过、上面一座木桥，河南还有一户人家。
 * 地图四周是一圈密林（比镜头能走到的范围多铺 3 米，台地顶上的东西也不会露出地图外）。
 * 镜头：正交、俯角 60°、方位 0（房子和崖壁的正面都朝镜头），在地面上跟拍，夹在地图里。
 * ============================================================ */

const W = 40, D = 34, X0 = -20, Z0 = -18, TH = 2.2;
/** 镜头能走到的地面范围（比地图每边少 3 米：外面那圈是密林） */
const BOUNDS: [number, number, number, number] = [-17, 17, -14.5, 13.5];

registerSceneBuilder('oblique-village', (ctx) => {
  const v = ctx.values, rng = ctx.rng, shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 60;
  const actors: SceneActor[] = [];
  const lights: SceneDesc['lights'] = [];
  const blocked: [number, number, number, number][] = [];
  const blk = (x: number, z: number, w: number, d: number) => blocked.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  const cx = (i: number) => X0 + i + 0.5;
  const cellOf = (x: number, z: number) => [Math.floor(x - X0), Math.floor(z - Z0)] as const;

  // ---- 地形格：台地边（每列一个行号）、西北的高台、河
  const e1 = new Int16Array(W), e2 = new Int16Array(W);
  for (let i = 0; i < W; i++) {
    e1[i] = 15 + Math.round(1.1 * Math.sin(i * 0.45) + I.hash2(i, 1) * 0.8 - 0.4);
    e2[i] = i <= 13 ? 7 + Math.round(Math.sin(i * 0.7) * 0.8) - Math.max(0, i - 10) * 2 : 0;
  }
  const S1 = [23, 24], S2 = [6, 7];
  e1[S1[1]] = e1[S1[0]]; e2[S2[1]] = e2[S2[0]];
  const riverC = (i: number) => 27 + Math.sin(i * 0.28 + 0.5) * 1.0;
  const tier = new Int8Array(W * D), stair = new Int8Array(W * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    let t = 0;
    if (j < e1[i]) t = 1;
    if (j < e2[i]) t = 2;
    if (Math.abs(j + 0.5 - riverC(i)) < 1.25) t = -1;
    tier[j * W + i] = t;
  }
  for (const i of S1) for (let k = 1; k <= 3; k++) stair[(e1[i] - k) * W + i] = 1;
  for (const i of S2) for (let k = 1; k <= 3; k++) stair[(e2[i] - k) * W + i] = 2;
  const T = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= D ? 0 : tier[j * W + i]);
  const St = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= D ? 0 : stair[j * W + i]);

  // ---- 地面：陆地（草皮 + 土层）与河床；台地（崖体 + 崖顶草沿）
  for (const r of I.mergeRects(W, D, (i, j) => (T(i, j) >= 0 ? 'land' : 'river'), () => false)) {
    const x = X0 + r.i + r.w / 2, z = Z0 + r.j + r.d / 2;
    if (r.t === 'land') {
      items.push({ prim: 'box', args: [0], pos: [x, -0.07, z], scale: [r.w, 0.14, r.d], role: 'grass', id: 2, flat: true });
      items.push({ prim: 'box', args: [0], pos: [x, -0.4, z], scale: [r.w, 0.52, r.d], role: 'soil', id: 2, flat: true });
    } else {
      items.push({ prim: 'box', args: [0], pos: [x, -1.3, z], scale: [r.w, 0.4, r.d], role: 'waterDeep', id: 3, flat: true, noOutline: true });
      items.push({ prim: 'box', args: [0], pos: [x, -0.9, z], scale: [r.w, 0.4, r.d], role: 'soil', id: 2, flat: true, noOutline: true });
    }
  }
  for (const t of [1, 2]) {
    for (const r of I.mergeRects(W, D, (i, j) => T(i, j) >= t && St(i, j) !== t, (k) => !k)) {
      const x = X0 + r.i + r.w / 2, z = Z0 + r.j + r.d / 2;
      items.push({ prim: 'box', args: [0], pos: [x, (t - 1) * TH + (TH - 0.16) / 2, z], scale: [r.w, TH - 0.16, r.d], role: 'rock', id: 4 + t, flat: true });
      items.push({ prim: 'box', args: [0], pos: [x, t * TH - 0.08, z], scale: [r.w, 0.16, r.d], role: 'grass', id: 4 + t, flat: true });
    }
    // 崖壁正面（朝镜头）的地层线 + 崖脚的碎石：逐格找「这一格是台地、南边一格不是」
    for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
      if (!(T(i, j) >= t && St(i, j) !== t && T(i, j + 1) < t && St(i, j + 1) !== t)) continue;
      const zf = Z0 + j + 1;
      items.push({ prim: 'box', args: [0], pos: [cx(i), (t - 1) * TH + TH * 0.42, zf + 0.03], scale: [1.0, 0.16, 0.06], role: 'soil', id: 4 + t, noOutline: true, flat: true });
      items.push({ prim: 'box', args: [0], pos: [cx(i), (t - 1) * TH + TH * 0.72, zf + 0.03], scale: [1.0, 0.1, 0.05], role: 'soil', id: 4 + t, noOutline: true, flat: true });
      items.push({ prim: 'box', args: [0], pos: [cx(i), t * TH - 0.2, zf + 0.04], scale: [1.04, 0.1, 0.1], role: 'grass', id: 4 + t, noOutline: true, flat: true });
      // 竖向的岩缝（崖壁不是一整块平面）
      for (const u of [-0.28, 0.18]) { const gh = TH * (0.3 + I.hash2(i, j, u + 3) * 0.35); items.push({ prim: 'box', args: [0], pos: [cx(i) + u + (I.hash2(j, i) - 0.5) * 0.15, (t - 1) * TH + 0.1 + gh / 2, zf + 0.025], scale: [0.07, gh, 0.04], role: 'soil', id: 4 + t, noOutline: true, flat: true }); }
      if (I.hash2(i, j, t) < 0.3 && T(i, j + 1) >= 0) items.push({ prim: 'poly', args: [1], pos: [cx(i) + (I.hash2(i, j) - 0.5) * 0.5, (t - 1) * TH + 0.12, zf + 0.3], rot: [0, I.hash2(j, i) * 3, 0], scale: [0.42, 0.3, 0.36], role: 'rock', id: 9 });
    }
  }
  // 石阶：在崖上切出的缺口里一级级下来
  const steps = (cols: number[], e: Int16Array, t: number) => {
    const zs = Z0 + e[cols[0]] - 3, ze = Z0 + e[cols[0]], n = 10, x0 = X0 + cols[0], x1 = X0 + cols[cols.length - 1] + 1;
    const sid = id++;
    for (let k = 0; k < n; k++) items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, ((t - 1) * TH + t * TH - (k * TH) / n) / 2, zs + ((k + 0.5) * (ze - zs)) / n], scale: [x1 - x0, TH - (k * TH) / n, (ze - zs) / n], role: 'stone', id: sid, flat: true });
    return { x0, x1, zs, ze, t };
  };
  const stairs = [steps(S1, e1, 1), steps(S2, e2, 2)];
  // 地图外：一整片深色的树海（镜头夹在地图里，只是保险）
  items.push({ prim: 'box', args: [0], pos: [0, -1.2, 0], scale: [200, 0.2, 200], role: 'foliage2', id: 1, noOutline: true, flat: true });

  const heightAt = (x: number, z: number) => {
    for (const s of stairs) if (x >= s.x0 && x <= s.x1 && z >= s.zs && z <= s.ze) return (s.t - 1) * TH + TH * Math.max(0, Math.min(1, (s.ze - z) / (s.ze - s.zs)));
    const [i, j] = cellOf(x, z), t = T(i, j);
    return t < 0 ? -1.1 : t * TH;
  };

  // ---- 河上的木桥（i 19–21）
  const riverRows = (i: number) => { const js: number[] = []; for (let j = 0; j < D; j++) if (T(i, j) < 0) js.push(j); return js; };
  const bx0 = X0 + 19, bx1 = X0 + 22;
  const rj = [...riverRows(19), ...riverRows(21)];
  const bz0 = Z0 + Math.min(...rj) - 0.4, bz1 = Z0 + Math.max(...rj) + 1.4;
  {
    const g = b.withId(id++);
    for (let z = bz0; z < bz1 - 0.05; z += 0.36) g.box((bx0 + bx1) / 2, -0.02, z + 0.16, bx1 - bx0 - 0.2, 0.1, 0.3, 'wood', { args: [0] });
    for (const x of [bx0 + 0.15, bx1 - 0.15]) {
      for (let z = bz0 + 0.2; z < bz1; z += 1.1) g.box(x, -0.3, z, 0.14, 0.95, 0.14, 'trim', { args: [0] });
      g.box(x, 0.48, (bz0 + bz1) / 2, 0.1, 0.08, bz1 - bz0, 'trim', { args: [0] });
    }
  }
  const onBridge = (x: number, z: number) => x > bx0 + 0.35 && x < bx1 - 0.35 && z > bz0 - 0.3 && z < bz1 + 0.3;

  // ---- 土路：桥 → 村子中间 → 石阶；村子里一条东西向的路；河南一段
  const pathSlab = (x0: number, x1: number, z0: number, z1: number) => items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, 0.012, (z0 + z1) / 2], scale: [x1 - x0, 0.024, z1 - z0], role: 'path', id: 7, noOutline: true, flat: true });
  pathSlab(bx0 + 0.3, bx1 - 0.3, Z0 + e1[20] + 0.2, bz0 + 0.1);
  pathSlab(-16, 16, 3.0, 4.4);
  pathSlab(bx1 - 0.6, X0 + S1[1] + 1, Z0 + e1[S1[0]] + 0.05, Z0 + e1[S1[0]] + 1.6);
  pathSlab(bx0 + 0.3, bx1 - 0.3, bz1 - 0.1, 15.5);
  pathSlab(-12, bx0 + 0.6, 14.4, 15.4);

  // ---- 村舍（正面朝镜头）
  const yAt = heightAt;
  const house = (x: number, z: number, w: number, d: number, wall: Role, roof: Role) => {
    J.cottage(b.withId(id++).at(x, yAt(x, z), z), w, d, wall, roof);
    blk(x, z, w + 0.1, d + 0.1);
    if (lights.length < 6) { items.push(...parts.lanternPost(x + w / 2 + 0.4, yAt(x, z), z + d / 2 + 0.3, id++)); lights.push({ pos: [x + w / 2 + 0.4, yAt(x, z) + 1.35, z + d / 2 + 0.3], color: '#FFB347', range: 4.5, intensity: 1.3, night: true }); blk(x + w / 2 + 0.4, z + d / 2 + 0.3, 0.3, 0.3); }
  };
  house(-10, 0.6, 3.4, 2.6, 'structure', 'cloth');
  house(-3.4, 0.9, 3.0, 2.4, 'paper', 'roof');
  house(9.6, 0.5, 3.6, 2.6, 'sand', 'trim');
  house(-8.6, 12.6, 3.2, 2.4, 'structure', 'roof');
  house(12.6, -9.2, 3.4, 2.6, 'paper', 'metal');
  // 河南那户的菜园篱笆
  items.push(...parts.fence(-12.2, 14.2, -5.2, 14.2, yAt, id++), ...parts.fence(-5.2, 14.2, -5.2, 11.4, yAt, id++));

  // ---- 树：地图四周的密林（比镜头范围多铺 3 米）+ 村里几棵
  const treeAt = (x: number, z: number, s: number) => {
    const [i, j] = cellOf(x, z);
    if (T(i, j) < 0 || St(i, j) || (x > bx0 - 1 && x < bx1 + 1 && z > bz0 - 1.5 && z < bz1 + 1.5)) return;
    I.tree(b.withId(id++).at(x, yAt(x, z), z), s, I.hash2(x, z) < 0.25 ? 'cone' : 'round', rng);
    blk(x, z, 0.8, 0.8);
  };
  for (let x = X0 + 0.8; x < X0 + W; x += 1.7) for (let z = Z0 + 0.8; z < Z0 + D; z += 1.7) {
    const jx = x + (I.hash2(x, z, 1) - 0.5) * 0.9, jz = z + (I.hash2(x, z, 2) - 0.5) * 0.9;
    const edge = Math.min(jx - BOUNDS[0], BOUNDS[1] - jx, jz - BOUNDS[2], BOUNDS[3] - jz);
    if (edge < 1.2 - I.hash2(x, z, 3) * 1.6) treeAt(jx, jz, 2.3 + I.hash2(x, z, 4) * 0.9);
  }
  for (const [x, z] of [[-14, -0.7], [-6.5, -1.1], [5.8, -0.4], [14.5, 2.8], [3.5, 13.8], [13.5, 13.2], [-14.5, 11.0], [6.5, -11.5], [-2.5, -10.5], [15.5, -6.8]] as [number, number][]) treeAt(x, z, 2.4 + I.hash2(x, z) * 0.7);

  // ---- 灌木、陶罐、高草、花、石头、路牌
  const shrubAt = (x: number, z: number, s = 1) => { J.shrub(b.withId(id++).at(x, yAt(x, z), z), s * (0.9 + I.hash2(x, z) * 0.3), rng, I.hash2(z, x) < 0.35); blk(x, z, 0.8 * s, 0.7 * s); };
  for (const [x, z] of [[-12.5, 3.0], [-11.4, 2.8], [-6.2, 2.7], [-1.2, 2.5], [0.0, 2.4], [6.8, 2.4], [7.9, 2.6], [12.6, 2.6], [-15.5, 6.0], [-4.5, 6.4], [-3.5, 6.2], [6.2, 6.0], [11.5, 5.8], [12.6, 6.1], [-1.5, 11.7], [6.5, 12.0], [8.0, 14.7], [-14.5, -7.5], [-1.5, -6.8], [2.5, -12.5], [9.5, -6.5], [-9.5, -14.0], [-5.5, -13.6]] as [number, number][]) shrubAt(x, z);
  for (const [x, z] of [[-8.0, 2.4], [-7.5, 2.2], [-1.6, 2.7], [11.8, 1.8], [12.2, 2.1], [-6.6, 14.8]] as [number, number][]) { I.urn(b.withId(id++).at(x, yAt(x, z), z), 0.8, 'soil'); blk(x, z, 0.35, 0.35); }
  for (let k = 0; k < 130; k++) {
    const x = (I.hash2(k, 11) - 0.5) * 32, z = (I.hash2(k, 12) - 0.5) * 28;
    const [i, j] = cellOf(x, z);
    if (T(i, j) < 0 || St(i, j) || blocked.some(([a, c, d, e]) => x > a - 0.3 && x < c + 0.3 && z > d - 0.3 && z < e + 0.3) || (z > 2.8 && z < 4.6)) continue;
    grassTuft(b.withId(id++).at(x, yAt(x, z), z), rng, 0.9);
  }
  for (let k = 0; k < 22; k++) { const x = (I.hash2(k, 21) - 0.5) * 30, z = (I.hash2(k, 22) - 0.5) * 24; const [i, j] = cellOf(x, z); if (T(i, j) >= 0 && !St(i, j)) items.push(...parts.flowers(x, yAt(x, z), z, 0.8, shape, rng, id++)); }
  for (const [x, z, s] of [[-13.2, 7.4, 0.9], [15.2, 8.6, 1.1], [2.8, -7.6, 0.8]] as [number, number, number][]) { items.push(...parts.rock(x, yAt(x, z), z, s, shape, rng, id++)); blk(x, z, s, s * 0.8); }
  signpost(b.withId(id++).at(bx1 + 0.6, 0, bz0 - 0.5)); blk(bx1 + 0.6, bz0 - 0.5, 0.4, 0.4);
  // 路边的灌木篱（沿东西向土路北侧、房子之间）+ 河岸一排矮灌木
  for (const [x0, x1] of [[-15.6, -12.4], [-7.6, -5.4], [-1.4, -0.2], [2.6, 4.6], [12.4, 15.8]] as [number, number][]) {
    for (let x = x0; x <= x1; x += 0.75) { J.shrub(b.withId(id++).at(x, 0, 2.55), 0.62, rng, I.hash2(x, 5) < 0.25); }
    blk((x0 + x1) / 2, 2.55, x1 - x0 + 0.6, 0.6);
  }
  for (const x of [-16, -14.6, -9.2, -7.9, 5.8, 7.2, 13.2, 14.6]) { const z = Z0 + riverC(Math.floor(x - X0)) - 1.75; J.shrub(b.withId(id++).at(x, 0, z), 0.7, rng, false); blk(x, z, 0.6, 0.5); }
  // 村口的水井、屋前的花坛（一排花 + 矮木框）、院子的矮篱笆
  J.well(b.withId(id++).at(14.2, 0, 5.6)); blk(14.2, 5.6, 1.4, 1.4);
  for (const [fx, fz, n] of [[-10, 2.5, 6], [-3.4, 2.6, 5], [9.6, 2.4, 6]] as [number, number, number][]) {
    const g = b.withId(id++).at(fx - 2.6, 0, fz);
    g.box(0, 0, 0, 1.4, 0.16, 0.5, 'wood', { args: [0] });
    for (let k = 0; k < n; k++) g.ball(-0.55 + (k * 1.1) / (n - 1), 0.24, (k % 2) * 0.12 - 0.06, 0.09, 0.09, 0.09, k % 3 ? 'flower' : 'sand', { noOutline: true });
    blk(fx - 2.6, fz, 1.5, 0.6);
  }
  items.push(...parts.fence(5.2, 2.2, 7.4, 2.2, yAt, id++), ...parts.fence(11.8, 2.2, 13.8, 2.2, yAt, id++));

  // ---- 角色：老人、小孩（NPC），巡逻兵（台地上）、章鱼怪（河南岸），绿宝石（拾取），西北高台上的大宝箱（目标）
  const put = (x: number, z: number, ry: number, f: (g: B) => void, kind: SceneActor['kind'], label: string, h: number) => {
    const y = yAt(x, z), g = b.withId(id++).at(x, y, z, ry);
    f(g);
    actors.push(actor(kind, label, [x, y, z], h, g.id));
    blk(x, z, 0.5, 0.5);
  };
  put(-6.4, 5.0, 0.3, (g) => npcFigure(g, 'cloth', 'trim'), 'npc', '老人', 1.25);
  put(4.9, 4.8, -0.4, (g) => I.citizen(g, 0.8, 'flower'), 'npc', '小孩', 0.75);
  put(5.5, -8.2, 0.2, (g) => J.soldier(g), 'enemy', '巡逻兵', 1.6);
  put(-1.5, -12.0, 0.6, (g) => J.soldier(g), 'enemy', '巡逻兵', 1.6);
  put(9.0, 11.8, Math.PI * 0.85, (g) => J.octorok(g), 'enemy', '章鱼怪', 0.8);
  put(-12.6, 5.2, 0, (g) => gem(g, 'interactive', 0.8), 'pickup', '绿宝石', 0.5);
  {
    const x = -11.5, z = -12.6, y = yAt(x, z);
    const cid = id++;
    items.push(...parts.chest(x, y, z, 0, cid).map((it) => ({ ...it, scale: [it.scale[0] * 1.4, it.scale[1] * 1.4, it.scale[2] * 1.4] as [number, number, number], pos: [it.pos[0], y + (it.pos[1] - y) * 1.4, it.pos[2]] as [number, number, number] })));
    actors.push(actor('objective', '大宝箱', [x, y, z], 0.9, cid));
    blk(x, z, 1.0, 0.8);
  }

  // 水面：铺满地图的一张，只在河里露出来（陆地顶面都比它高）；深度贴图按格（河里深、岸上浅）
  const half = Math.max(W, D) / 2 + 1;
  const water = { level: -0.25, shape: 'square' as const, size: half * 2, center: [0, 0] as [number, number], heightTexture: heightTextureFrom(half, (x, z) => { const [i, j] = cellOf(x, z); return T(i, j) < 0 ? -1.2 : 0.6; }, 128), heightHalf: half };
  const start: [number, number, number] = [1.0, 0, 3.7];
  const V = 12;
  return {
    items, actors, lights, water,
    dynamic: [characterAt(v, ...start)],
    ground: {
      heightAt: (x, z) => (onBridge(x, z) ? 0.08 : heightAt(x, z)),
      inside: (x, z) => {
        if (x < BOUNDS[0] + 0.4 || x > BOUNDS[1] - 0.4 || z < BOUNDS[2] + 0.4 || z > BOUNDS[3] - 0.4) return false;
        if (blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e)) return false;
        if (onBridge(x, z)) return true;
        const [i, j] = cellOf(x, z), t = T(i, j);
        if (t < 0) return false;
        // 崖边：四角落在别的高度上就不能走（石阶除外）
        for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
          const [i2, j2] = cellOf(x + dx, z + dz);
          if (T(i2, j2) !== t && !St(i, j) && !St(i2, j2)) return false;
        }
        return true;
      },
    },
    bounds: { center: [0, 0.5, 0], radius: 22 },
    viewSize: V,
    playerStart: start,
    playerFacing: 0,
    camera: { ...RIG_OBLIQUE, viewSize: V, bounds: BOUNDS, frameOffset: [0, 0.18] },
  } satisfies SceneDesc;
});
