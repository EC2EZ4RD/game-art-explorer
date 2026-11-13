import { RIG_TILE } from '../../../content/sceneCatalog';
import type { Role } from '../../../content/roles';
import { B, stall } from '../kits';
import * as K from '../kits2';
import { actor, crawler, gem, grassTuft, npcFigure, signpost } from '../kits2d';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, heightTextureFrom, shapeOf } from '../sceneUtil';
import type { BuildCtx, Item, SceneActor, SceneDesc } from '../types';

/*
 * 俯视瓦片场景 tileTown（小镇 / 农田 / 原野，docs/workbench-redesign.md §9.1）：
 * 地面是 1 × 1 的格子，按「区域」合并成整块（同一区域同一个物体编号，区域内部没有接缝线，区域交界才有边）——草地、土路、石板广场、田、池底、高台；
 * 盒子房屋配楔形屋顶，树、篱笆、作物、水；镜头正交、方位 0、高俯角 50°（camera.angle 选正俯视时 88°），角色在地面上四向走、镜头跟拍。
 */

type Cell = 'grass' | 'path' | 'plaza' | 'water' | 'farm' | 'high' | 'sand';
/** 各区域顶面高度：草地是整块底座（0），别的区域是略高出一点的薄片（区域交界处有一道小台阶，读得出瓦片的边） */
const TOP: Record<Cell, number> = { grass: 0, path: 0.02, plaza: 0.06, water: 0.006, farm: 0.05, high: 1.1, sand: 0.02 };
/** 池底用深水色（审查修复 14：原来是沙色，非像素配方里水面半透明，池塘读成一块灰白的板） */
const ROLE: Record<Cell, Role> = { grass: 'grass', path: 'path', plaza: 'stone', water: 'waterDeep', farm: 'soil', high: 'grass', sand: 'sand' };
const REGION_ID: Record<Cell, number> = { grass: 3, path: 4, plaza: 5, water: 6, farm: 7, high: 8, sand: 9 };

interface Map2 { W: number; D: number; at: (i: number, j: number) => Cell }

/**
 * 地面（§9.1「按区域合并的瓦片」）：草地是整张一块底座（内部没有任何接缝）；其余区域按格子贪心合并成尽量少的矩形，
 * 做成略高出草地的薄片，同一区域一个物体编号——区域交界才有边（后处理按物体编号出线），区域内部不会出现一道道接缝线。
 * 薄片不要描边外壳（外壳会在矩形之间露出线）；高台是实心的（侧面岩壁 + 顶上一层草）。水格只铺池底，水面交给引擎的水。
 */
function groundItems(m: Map2, items: Item[]): { x: number; z: number; w: number; d: number }[] {
  const x0 = -m.W / 2, z0 = -m.D / 2;
  items.push({ prim: 'box', args: [0], pos: [0, -0.3, 0], scale: [m.W, 0.6, m.D], role: 'grass', id: REGION_ID.grass, noOutline: true, flat: true });
  const used = new Uint8Array(m.W * m.D);
  const water: { x: number; z: number; w: number; d: number }[] = [];
  for (let j = 0; j < m.D; j++) for (let i = 0; i < m.W; i++) {
    const t = m.at(i, j);
    if (t === 'grass' || used[j * m.W + i]) continue;
    let w = 1;
    while (i + w < m.W && m.at(i + w, j) === t && !used[j * m.W + i + w]) w++;
    let d = 1;
    grow: while (j + d < m.D) { for (let k = 0; k < w; k++) if (m.at(i + k, j + d) !== t || used[(j + d) * m.W + i + k]) break grow; d++; }
    for (let jj = j; jj < j + d; jj++) for (let ii = i; ii < i + w; ii++) used[jj * m.W + ii] = 1;
    const cx = x0 + i + w / 2, cz = z0 + j + d / 2, top = TOP[t];
    if (t === 'high') {
      items.push({ prim: 'box', args: [0.04], pos: [cx, (top - 0.25) / 2, cz], scale: [w, top - 0.25, d], role: 'rock', id: REGION_ID.high });
      items.push({ prim: 'box', args: [0.04], pos: [cx, top - 0.125, cz], scale: [w, 0.25, d], role: 'grass', id: REGION_ID.high });
    } else {
      items.push({ prim: 'box', args: [0], pos: [cx, top / 2, cz], scale: [w, top, d], role: ROLE[t], id: REGION_ID[t], noOutline: true, flat: true });
      if (t === 'water') water.push({ x: cx, z: cz, w, d });
    }
  }
  return water;
}

type Variant = 'town' | 'farm' | 'field';

function tileTown(variant: Variant) {
  return (ctx: BuildCtx): SceneDesc => {
    const v = ctx.values, rng = ctx.rng, shape = shapeOf(v);
    const W = variant === 'field' ? 40 : 30, D = variant === 'field' ? 30 : 22;
    const hx = W / 2, hz = D / 2;
    const cell = (x: number, z: number) => [Math.floor(x + hx), Math.floor(z + hz)] as const;
    // ---- 区域图
    const grid: Cell[] = new Array(W * D).fill('grass');
    const set = (i0: number, j0: number, i1: number, j1: number, t: Cell) => { for (let j = Math.max(0, j0); j < Math.min(D, j1); j++) for (let i = Math.max(0, i0); i < Math.min(W, i1); i++) grid[j * W + i] = t; };
    const ix = (x: number) => Math.round(x + hx), jz = (z: number) => Math.round(z + hz);
    /**
     * 不规则的一片（审查修复 14：原来沙地是一个个硬边的整矩形）：椭圆加格哈希抖动，边上缺一格多一格，贪心合并后是台阶状的瓦片边；
     * keep = 这些格不覆盖（池塘外一圈沙岸不盖掉池水和路）
     */
    const blob = (ci: number, cj: number, ri: number, rj: number, t: Cell, keep: Cell[] = []) => {
      for (let j = Math.floor(cj - rj - 1); j <= cj + rj + 1; j++) for (let i = Math.floor(ci - ri - 1); i <= ci + ri + 1; i++) {
        if (i < 0 || j < 0 || i >= W || j >= D || keep.includes(grid[j * W + i])) continue;
        const d = ((i + 0.5 - ci) / ri) ** 2 + ((j + 0.5 - cj) / rj) ** 2, n = ((Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1;
        if (d < 0.78 + n * 0.45) grid[j * W + i] = t;
      }
    };
    if (variant === 'town') {
      set(0, jz(1), W, jz(3), 'path');
      set(ix(-1), 0, ix(1), D, 'path');
      set(ix(-4), jz(-4), ix(4), jz(1), 'plaza');
      set(ix(7), jz(5), ix(12), jz(10), 'water');
      blob(ix(9.5), jz(7.5), 4.6, 4.2, 'sand', ['water', 'path']);
      set(0, jz(5), ix(-9), D, 'high');
    } else if (variant === 'farm') {
      set(0, jz(-1), W, jz(1), 'path');
      set(ix(-2), jz(-1), ix(0), D, 'path');
      for (const [x, z] of [[-12, 3], [-12, 7], [4, 3], [4, 7]] as [number, number][]) set(ix(x), jz(z), ix(x + 7), jz(z + 3), 'farm');
      set(ix(10), jz(-9), ix(14), jz(-5), 'water');
      blob(ix(12), jz(-7), 3.8, 3.6, 'sand', ['water', 'path']);
      set(0, 0, ix(-10), jz(-6), 'high');
    } else {
      // 原野：大片草地，零星的土坑与一条干河床
      for (let k = 0; k < 6; k++) blob(3 + rng() * (W - 6), 3 + rng() * (D - 6), 1.8 + rng() * 1.6, 1.4 + rng() * 1.2, 'sand');
      set(0, jz(6), W, jz(8), 'path');
    }
    const at = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= D ? 'grass' : grid[j * W + i]);
    const items: Item[] = [];
    const ponds = groundItems({ W, D, at }, items);
    // 地图外：一整片深色树海（原来是一圈土色的边，走到地图边上露出土边和天色，审查修复 4；镜头也夹在地图里）
    items.push({ prim: 'box', args: [0], pos: [0, -0.75, 0], scale: [200, 0.2, 200], role: 'foliage2', id: 2, noOutline: true, flat: true });

    const b = new B(items, 20);
    let id = 30;
    const blocked: { x0: number; x1: number; z0: number; z1: number }[] = [];
    const block = (x: number, z: number, w: number, d: number) => blocked.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    const yOf = (x: number, z: number) => { const [i, j] = cell(x, z); return TOP[at(i, j)]; };
    const house = (x: number, z: number, s: number, rot = 0) => { items.push(...parts.house(x, yOf(x, z), z, s, shape, rot, id++)); block(x, z, s * 1.1, s * 0.9); };
    const tree = (x: number, z: number, s = 1) => { const y = yOf(x, z); items.push(...(rng() < 0.6 ? parts.broadleafTree(x, y, z, s * (1.2 + rng() * 0.5), shape, rng, id++) : parts.pineTree(x, y, z, s * (1.3 + rng() * 0.6), shape, rng, id++))); block(x, z, 0.8, 0.8); };
    const lights: SceneDesc['lights'] = [];
    const lamp = (x: number, z: number) => { items.push(...parts.lanternPost(x, yOf(x, z), z, id++)); if (lights.length < 8) lights.push({ pos: [x, yOf(x, z) + 1.35, z], color: '#FFB347', range: 5, intensity: 1.4, night: true }); };
    const actors: SceneActor[] = [];
    const put = (x: number, z: number, f: (g: B) => void, kind: SceneActor['kind'], label: string, h: number) => { const y = yOf(x, z), g = b.withId(id++).at(x, y, z); f(g); actors.push(actor(kind, label, [x, y, z], h, g.id)); };

    if (variant === 'town') {
      for (const [x, s] of [[-11, 2.6], [-6, 2.2], [6, 2.4], [11.5, 2.8]] as [number, number][]) house(x, -7.5, s);
      house(-5.5, 6, 2.2); house(3.5, 7.5, 2);
      // 广场：喷泉 + 摊位
      b.withId(id++).at(0, TOP.plaza, -1.5).cyl(0, 0, 0, 1.3, 0.45, 'stone', 1).cyl(0, 0.45, 0, 0.25, 0.9, 'stone', 0.8).ball(0, 0.45, 0, 1.05, 0.12, 1.05, 'water', { noOutline: true });
      block(0, -1.5, 2.8, 2.8);
      stall(b.withId(id++).at(-3, TOP.plaza, -3.2), 2, rng); block(-3, -3.2, 2, 1.2);
      for (const x of [-9, -3.5, 3.5, 9]) lamp(x, 0.4);
      for (let k = 0; k < 12; k++) tree(-hx + 1 + rng() * 6, -hz + 1 + rng() * 2.5);
      for (let k = 0; k < 8; k++) tree(hx - 1 - rng() * 4, -2 + rng() * 6);
      for (let k = 0; k < 5; k++) tree(-hx + 1 + rng() * 4, 6.5 + rng() * 3.5);
      // 花园篱笆 + 花
      items.push(...parts.fence(3, 3.6, 8, 3.6, yOf, id++), ...parts.fence(3, 3.6, 3, 6, yOf, id++));
      for (let k = 0; k < 8; k++) items.push(...parts.flowers(4 + rng() * 2.4, 0, 4 + rng() * 1.6, 0.5, shape, rng, id++));
      put(-2.2, 0.2, (g) => npcFigure(g, 'cloth'), 'npc', '镇长', 1.25);
      put(6.5, -4.6, (g) => npcFigure(g, 'trim', 'cloth'), 'npc', '铁匠', 1.25);
      put(9.5, 2.2, (g) => { g.items.push(...parts.chest(0, 0, 0, 0, g.id).map((it) => ({ ...it, pos: [it.pos[0] + 9.5, it.pos[1] + yOf(9.5, 2.2), it.pos[2] + 2.2] as [number, number, number] }))); }, 'pickup', '宝箱', 0.6);
      // 起点附近一只（审查修复 23：原来两只都在 x = ±12.5，默认取景里没有敌人，敌人血条挂到了路灯上）
      put(-3.8, 3.7, (g) => crawler(g, 'accent'), 'enemy', '史莱姆', 0.8);
      put(12.5, 3.8, (g) => crawler(g, 'accent'), 'enemy', '史莱姆', 0.8);
      put(-12.5, 3.4, (g) => crawler(g, 'accent', 0.9), 'enemy', '史莱姆', 0.75);
      put(0, hz - 1, (g) => signpost(g), 'objective', '出镇', 1.6);
    } else if (variant === 'farm') {
      for (const [x, z, k] of [[-12, 3, 'wheat'], [-12, 7, 'cabbage'], [4, 3, 'corn'], [4, 7, 'cabbage']] as [number, number, 'wheat' | 'cabbage' | 'corn'][]) {
        K.cropRows(b.withId(id++).at(x + 3.5, TOP.farm, z + 1.5), 6.6, 2.8, k, rng);
        items.push(...parts.fence(x - 0.2, z - 0.25, x + 7.2, z - 0.25, yOf, id++));
      }
      K.barn(b.withId(id++).at(-5.5, 0, -6), 5, 4); block(-5.5, -6, 5.4, 4.4);
      house(5, -6.5, 2.6);
      b.withId(id++).at(1.2, 0, -3.6).cyl(0, 0, 0, 0.55, 0.6, 'stone', 1).box(0, 0.6, 0, 0.1, 1, 0.1, 'wood').box(0, 1.6, 0, 1.3, 0.12, 0.9, 'roof'); block(1.2, -3.6, 1.2, 1.2);
      for (let k = 0; k < 3; k++) K.haystack(b.withId(id++).at(-10 + k * 2, 0, -2.6));
      K.scarecrow(b.withId(id++).at(-8.5, TOP.farm, 5));
      for (let k = 0; k < 9; k++) tree(hx - 1 - rng() * 3, -2 + rng() * 12);
      for (let k = 0; k < 6; k++) tree(-hx + 0.5 + rng() * 8, -hz + 0.5 + rng() * 3);
      lamp(-1, -1.6); lamp(3, -1.6);
      put(-1, 4.5, (g) => npcFigure(g, 'cloth', 'sand'), 'npc', '农夫', 1.25);
      put(8.5, 0.4, (g) => gem(g, 'interactive', 1.1), 'pickup', '种子袋', 0.5);
      put(2.6, 1.9, (g) => crawler(g, 'accent', 0.8), 'enemy', '偷菜的乌鸦', 0.7);
      put(11, 6, (g) => crawler(g, 'accent', 0.8), 'enemy', '偷菜的乌鸦', 0.7);
      put(-1, hz - 1, (g) => signpost(g), 'objective', '去镇上', 1.6);
    } else {
      // 原野：零星的树丛、石块、断墙；四面围上来的敌群，地上散着经验宝石
      for (let k = 0; k < 18; k++) { const x = (rng() - 0.5) * (W - 4), z = (rng() - 0.5) * (D - 4); if (Math.hypot(x, z) < 5) continue; if (rng() < 0.55) tree(x, z, 0.9); else items.push(...parts.rock(x, 0, z, 0.8 + rng() * 0.8, shape, rng, id++)); }
      for (let k = 0; k < 40; k++) grassTuft(b.withId(id++).at((rng() - 0.5) * W, 0, (rng() - 0.5) * D), rng, 1.2);
      K.ruinedBuilding(b.withId(id++).at(-11, 0, -7), 4, 3, 2.2, rng); block(-11, -7, 4.2, 3.2);
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2 + rng() * 0.2, r = 5.5 + rng() * 4, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
        const big = k % 9 === 0;
        put(x, z, (g) => crawler(g, k % 3 ? 'accent' : 'cloth', big ? 1.5 : 0.8), big ? 'boss' : 'enemy', big ? '精英' : ['蝙蝠', '骷髅', '幽灵'][k % 3], big ? 1.2 : 0.7);
      }
      for (let k = 0; k < 24; k++) { const x = (rng() - 0.5) * 12, z = (rng() - 0.5) * 9; const g = b.withId(id++).at(x, 0, z); gem(g, k % 4 ? 'emissive' : 'interactive', 0.55); if (k < 3) actors.push(actor('pickup', '经验宝石', [x, 0, z], 0.4, g.id)); }
    }
    // 水面：引擎的水只有一张方形水面——铺在第一个池塘上（池塘画成正方形），略高出池底；深度贴图按格子（池里深、岸上浅，岸边起白沫）
    const pond = ponds[0];
    const half = Math.max(W, D) / 2 + 2;
    const water = pond ? { level: 0.05, shape: 'square' as const, size: Math.max(pond.w, pond.d), center: [pond.x, pond.z] as [number, number], heightTexture: heightTextureFrom(half, (x, z) => { const [i, j] = cell(x, z); return at(i, j) === 'water' ? -0.6 : 0.2; }, 128), heightHalf: half } : undefined;
    const inside = (x: number, z: number) => {
      if (Math.abs(x) > hx - 0.4 || Math.abs(z) > hz - 0.4) return false;
      const [i, j] = cell(x, z);
      // 水里、高台上（没有台阶）都走不进去
      if (at(i, j) === 'water' || at(i, j) === 'high') return false;
      return !blocked.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
    };
    const start: [number, number, number] = variant === 'farm' ? [-1, 0, 1.6] : variant === 'town' ? [0, 0, 2] : [0, 0, 0];
    const view = variant === 'field' ? 14 : 11;
    return {
      items, actors, lights, water,
      dynamic: [characterAt(v, start[0], start[1], start[2])],
      ground: { heightAt: (x, z) => yOf(x, z), inside },
      bounds: { center: [0, 0.5, 0], radius: Math.max(hx, hz) * 1.15 },
      viewSize: view,
      playerStart: start,
      camera: { ...RIG_TILE, viewSize: view, bounds: [-hx, hx, -hz, hz] },
    };
  };
}

registerSceneBuilder('tileTown', tileTown('town'));
registerSceneBuilder('tileTown-farm', tileTown('farm'));
registerSceneBuilder('tileTown-field', tileTown('field'));
