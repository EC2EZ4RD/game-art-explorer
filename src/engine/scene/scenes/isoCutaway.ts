import { RIG_CUTAWAY } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor, crawler } from '../kits2d';
import * as I from '../kitsIso';
import * as J from '../kitsIso2';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc } from '../types';

/* ============================================================
 * 等距·剖面屋 iso-cutaway（模拟人生的「墙面降下」/ 大和绘的吹抜屋台；技术补全 G，由 scenes/iso.ts 引入）
 * 去掉屋顶的一栋平房：离镜头远的两面外墙（北、西）整面高，墙里贴各房间的墙纸、开窗、挂画；
 * 离镜头近的外墙（南、东）和所有内墙都切到齐膝高（切口是深色的墙顶），五个房间一眼看全：
 * 客厅（电视、沙发、地毯、书架、落地灯）、厨房餐厅（一排橱柜、冰箱、餐桌）、卧室（床、床头柜、衣柜）、浴室、书房。
 * 屋外：草坪、前门小路、车道和车、泳池、篱笆、信箱、树，门前一条马路。
 * 比例：1 单位 ≈ 1.25 米，玩家放大 1.5 倍（约 1.7 米高）。镜头：正交、俯角 45°、方位 45°，固定机位。
 * ============================================================ */

const HX = 4.8, HZ = 3.6, FLOOR = 0.15, WALL_H = 2.1, CUT_H = 0.42, WT = 0.18;

registerSceneBuilder('iso-cutaway', (ctx) => {
  const v = ctx.values, rng = ctx.rng, shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 60;
  const actors: SceneActor[] = [];
  const lights: SceneDesc['lights'] = [];
  const blocked: [number, number, number, number][] = [];
  const blk = (x: number, z: number, w: number, d: number) => blocked.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, role: Role, oid: number, extra: Partial<Item> = {}) =>
    items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], scale: [x1 - x0, y1 - y0, z1 - z0], role, id: oid, flat: true, ...extra });

  // ---- 地面：一大片草地（四周都是草，不露边）、马路、人行道、小路、车道
  slab(-100, 100, -0.3, 0, -100, 100, 'grass', 2, { noOutline: true });
  slab(-100, 100, 0, 0.03, 8.2, 10.8, 'metal', 3, { noOutline: true });
  for (let x = -40; x < 40; x += 2) slab(x, x + 1, 0.03, 0.04, 9.45, 9.55, 'paper', 3, { noOutline: true });
  slab(-100, 100, 0, 0.08, 7.0, 8.2, 'stone', 4, { noOutline: true });
  slab(-2.55, -1.55, 0, 0.06, HZ, 7.0, 'stone', 4, { noOutline: true });
  slab(1.6, 4.2, 0, 0.05, HZ + 0.2, 7.0, 'stone', 4, { noOutline: true });
  // ---- 房基 + 各房间的地板（客厅木地板条、厨房黑白格、卧室地毯、浴室小方砖、书房木地板）
  slab(-HX - 0.1, HX + 0.1, 0, FLOOR, -HZ - 0.1, HZ + 0.1, 'stone', 5);
  const ROOMS: { name: string; r: [number, number, number, number]; floor: 'planks' | 'checker' | 'carpet' | 'tiles'; paper: Role }[] = [
    { name: '客厅', r: [-HX, 0.4, 0, HZ], floor: 'planks', paper: 'sand' },
    { name: '厨房', r: [0.4, HX, 0, HZ], floor: 'checker', paper: 'paper' },
    { name: '卧室', r: [-HX, 0.4, -HZ, 0], floor: 'carpet', paper: 'glass' },
    { name: '浴室', r: [0.4, 2.6, -HZ, 0], floor: 'tiles', paper: 'water' },
    { name: '书房', r: [2.6, HX, -HZ, 0], floor: 'planks', paper: 'highland' },
  ];
  for (const { r: [x0, x1, z0, z1], floor } of ROOMS) {
    const fid = id++, y0 = FLOOR, y1 = FLOOR + 0.03;
    if (floor === 'planks') for (let z = z0; z < z1 - 0.01; z += 0.3) slab(x0, x1, y0, y1, z + 0.012, Math.min(z1, z + 0.3) - 0.012, 'wood', fid, { noOutline: true });
    else if (floor === 'checker') for (let i = 0; x0 + i * 0.5 < x1 - 0.01; i++) for (let j = 0; z0 + j * 0.5 < z1 - 0.01; j++) slab(x0 + i * 0.5, Math.min(x1, x0 + i * 0.5 + 0.5), y0, y1, z0 + j * 0.5, Math.min(z1, z0 + j * 0.5 + 0.5), (i + j) % 2 ? 'paper' : 'stone', fid, { noOutline: true });
    else if (floor === 'tiles') for (let i = 0; x0 + i * 0.3 < x1 - 0.01; i++) for (let j = 0; z0 + j * 0.3 < z1 - 0.01; j++) slab(x0 + i * 0.3 + 0.01, Math.min(x1, x0 + i * 0.3 + 0.3) - 0.01, y0, y1, z0 + j * 0.3 + 0.01, Math.min(z1, z0 + j * 0.3 + 0.3) - 0.01, 'paper', fid, { noOutline: true });
    else slab(x0, x1, y0, y1, z0, z1, 'sand', fid, { noOutline: true });
  }

  // ---- 墙：北 / 西两面外墙整面高（里面贴墙纸、开窗、挂画）；南 / 东外墙与内墙切到齐膝（深色切口）
  const wid = id++;
  const wallX = (x0: number, x1: number, z: number, h: number) => { if (x1 - x0 < 0.05) return; slab(x0, x1, FLOOR, FLOOR + h, z - WT / 2, z + WT / 2, 'structure', wid); if (h < 1) slab(x0, x1, FLOOR + h, FLOOR + h + 0.03, z - WT / 2, z + WT / 2, 'trim', wid, { noOutline: true }); };
  const wallZ = (z0: number, z1: number, x: number, h: number) => { if (z1 - z0 < 0.05) return; slab(x - WT / 2, x + WT / 2, FLOOR, FLOOR + h, z0, z1, 'structure', wid); if (h < 1) slab(x - WT / 2, x + WT / 2, FLOOR + h, FLOOR + h + 0.03, z0, z1, 'trim', wid, { noOutline: true }); };
  wallX(-HX - WT / 2, HX + WT / 2, -HZ, WALL_H);
  wallZ(-HZ, HZ + WT / 2, -HX, WALL_H);
  wallX(-HX, -2.65, HZ, CUT_H); wallX(-1.45, HX + WT / 2, HZ, CUT_H);
  wallZ(-HZ, HZ, HX, CUT_H);
  wallX(-HX, -1.5, 0, CUT_H); wallX(-0.5, 0.95, 0, CUT_H); wallX(1.85, 3.35, 0, CUT_H); wallX(4.25, HX, 0, CUT_H);
  wallZ(-HZ, 0, 0.4, CUT_H); wallZ(-HZ, 0, 2.6, CUT_H);
  // 墙顶的压顶线（整面高的两面）
  slab(-HX - WT / 2 - 0.03, HX + WT / 2 + 0.03, FLOOR + WALL_H, FLOOR + WALL_H + 0.06, -HZ - WT / 2 - 0.03, -HZ + WT / 2 + 0.03, 'trim', wid);
  slab(-HX - WT / 2 - 0.03, -HX + WT / 2 + 0.03, FLOOR + WALL_H, FLOOR + WALL_H + 0.06, -HZ, HZ + WT / 2 + 0.03, 'trim', wid);
  // 墙纸（整面高的墙的内侧，按房间分色）+ 踢脚线
  for (const { r: [x0, x1, z0, z1], paper } of ROOMS) {
    const pid = id++;
    if (z0 === -HZ) { slab(x0 + (x0 === -HX ? WT / 2 : 0.09), x1 - 0.09, FLOOR + 0.12, FLOOR + WALL_H, -HZ + WT / 2, -HZ + WT / 2 + 0.015, paper, pid, { noOutline: true }); slab(x0 + 0.09, x1 - 0.09, FLOOR, FLOOR + 0.12, -HZ + WT / 2, -HZ + WT / 2 + 0.03, 'wood', pid, { noOutline: true }); }
    if (x0 === -HX) { slab(-HX + WT / 2, -HX + WT / 2 + 0.015, FLOOR + 0.12, FLOOR + WALL_H, z0 + (z0 === -HZ ? WT / 2 : 0.09), z1 - 0.09, paper, pid, { noOutline: true }); slab(-HX + WT / 2, -HX + WT / 2 + 0.03, FLOOR, FLOOR + 0.12, z0 + 0.09, z1 - 0.09, 'wood', pid, { noOutline: true }); }
  }
  // 窗（玻璃 + 窗框 + 窗帘）与挂画：北墙朝 +z、西墙朝 +x
  const winN = (x: number, w: number) => { const g = b.withId(id++).at(x, FLOOR, -HZ + WT / 2 + 0.02); g.box(0, 0.85, 0, w, 0.85, 0.03, 'glass', { args: [0], noOutline: true }); g.box(0, 0.8, 0.01, w + 0.12, 0.06, 0.05, 'trim', { args: [0] }); g.box(0, 1.7, 0.01, w + 0.12, 0.06, 0.05, 'trim', { args: [0] }); for (const s of [-1, 1]) g.box(s * (w / 2 + 0.08), 0.7, 0.04, 0.16, 1.15, 0.03, 'cloth', { args: [0], noOutline: true }); };
  const winW = (z: number, w: number) => { const g = b.withId(id++).at(-HX + WT / 2 + 0.02, FLOOR, z, Math.PI / 2); g.box(0, 0.85, 0, w, 0.85, 0.03, 'glass', { args: [0], noOutline: true }); g.box(0, 0.8, 0.01, w + 0.12, 0.06, 0.05, 'trim', { args: [0] }); g.box(0, 1.7, 0.01, w + 0.12, 0.06, 0.05, 'trim', { args: [0] }); for (const s of [-1, 1]) g.box(s * (w / 2 + 0.08), 0.7, 0.04, 0.16, 1.15, 0.03, 'accent', { args: [0], noOutline: true }); };
  winN(-3.2, 1.0); winN(1.5, 0.5); winN(3.7, 0.8); winW(-1.6, 1.0);
  const painting = (g: B, w: number, h: number, role: Role) => { g.box(0, 0, 0, w + 0.08, h + 0.08, 0.03, 'trim', { args: [0] }); g.box(0, 0.04, 0.01, w, h, 0.03, role, { args: [0], noOutline: true }); };
  painting(b.withId(id++).at(-HX + WT / 2 + 0.02, FLOOR + 1.15, 1.8, Math.PI / 2), 0.9, 0.55, 'foliage');
  painting(b.withId(id++).at(-1.6, FLOOR + 1.2, -HZ + WT / 2 + 0.02), 0.5, 0.6, 'accent');

  // ---- 客厅
  {
    const y = FLOOR + 0.03;
    J.tvSet(b.withId(id++).at(-HX + 0.32, y, 1.8, Math.PI / 2)); blk(-HX + 0.3, 1.8, 0.5, 1.3);
    slab(-3.9, -2.2, y, y + 0.015, 1.05, 2.55, 'accent', id++, { noOutline: true });
    J.table(b.withId(id++).at(-3.05, y, 1.8), 0.8, 0.5, false); blk(-3.05, 1.8, 0.9, 0.6);
    J.sofa(b.withId(id++).at(-1.75, y, 1.8, -Math.PI / 2), 1.8, 'cloth'); blk(-1.75, 1.8, 0.8, 1.9);
    J.shelf(b.withId(id++).at(-HX + 0.3, y, 3.05, Math.PI / 2), 0.9, 1.5, rng); blk(-HX + 0.3, 3.05, 0.45, 1.0);
    J.floorLamp(b.withId(id++).at(-HX + 0.35, y, 0.45)); blk(-HX + 0.35, 0.45, 0.3, 0.3);
    J.pottedPlant(b.withId(id++).at(-0.15, y, 3.25), 1.1); blk(-0.15, 3.25, 0.4, 0.4);
    lights.push({ pos: [-HX + 0.35, FLOOR + 1.4, 0.45], color: '#FFD08A', range: 4, intensity: 1.4, night: true });
  }
  // ---- 厨房餐厅
  {
    const y = FLOOR + 0.03;
    J.counter(b.withId(id++).at(2.35, y, 0.38), 2.9, -0.6, 0.55); blk(2.35, 0.38, 3.0, 0.6);
    J.fridge(b.withId(id++).at(4.35, y, 0.42)); blk(4.35, 0.42, 0.65, 0.6);
    actors.push(actor('objective', '冰箱', [4.35, y, 0.7], 1.5, id - 1));
    J.table(b.withId(id++).at(2.5, y, 2.35), 1.3, 0.85, true, 'wood'); blk(2.5, 2.35, 1.4, 0.95);
    for (const [cx2, cz2, r] of [[1.95, 1.65, 0], [3.05, 1.65, 0], [1.95, 3.05, Math.PI], [3.05, 3.05, Math.PI]] as [number, number, number][]) J.chair(b.withId(id++).at(cx2, y, cz2, r));
    const g = b.withId(id++).at(2.5, y + 0.6, 2.35);
    g.add('cylinder', 0, 0.02, 0, 0.3, 0.04, 0.3, 'paper', { args: [1] });
    g.ball(0, 0.1, 0, 0.1, 0.07, 0.1, 'flower', { noOutline: true });
    lights.push({ pos: [2.5, FLOOR + 1.6, 2.35], color: '#FFE0A8', range: 4, intensity: 1.2, night: true });
  }
  // ---- 卧室
  {
    const y = FLOOR + 0.03;
    J.bed(b.withId(id++).at(-2.7, y, -2.6), 1.4, 1.75, 'roof'); blk(-2.7, -2.6, 1.5, 1.85);
    for (const s of [-1, 1]) { const g = b.withId(id++).at(-2.7 + s * 1.0, y, -3.2); g.box(0, 0, 0, 0.42, 0.42, 0.4, 'wood', { args: [0.1] }); g.cyl(0, 0.42, 0, 0.09, 0.2, 'paper', 0.7); g.add('cylinder', 0, 0.7, 0, 0.26, 0.18, 0.26, 'emissive', { args: [0.6], noOutline: true }); }
    J.shelf(b.withId(id++).at(-HX + 0.32, y, -1.2, Math.PI / 2), 1.1, 1.7, rng, false); blk(-HX + 0.3, -1.2, 0.45, 1.2);
    slab(-3.6, -1.8, y, y + 0.015, -1.4, -0.4, 'flower', id++, { noOutline: true });
    J.pottedPlant(b.withId(id++).at(-0.2, y, -3.25)); blk(-0.2, -3.25, 0.4, 0.4);
  }
  // ---- 浴室 + 书房
  J.bathroom(b.withId(id++).at(1.0, FLOOR + 0.03, -3.15)); blk(1.5, -3.15, 2.2, 0.7);
  {
    const y = FLOOR + 0.03;
    const g = b.withId(id++).at(3.7, y, -3.2);
    J.table(g, 1.2, 0.6, true, 'wood');
    g.box(0, 0.6, -0.1, 0.5, 0.36, 0.04, 'ink', { args: [0.1] });
    g.box(0, 0.64, -0.08, 0.44, 0.28, 0.02, 'emissive', { args: [0], noOutline: true });
    g.box(0, 0.6, 0.1, 0.4, 0.02, 0.14, 'ink', { args: [0], noOutline: true });
    blk(3.7, -3.2, 1.3, 0.7);
    J.chair(b.withId(id++).at(3.7, y, -2.5, Math.PI), 'cloth');
    J.shelf(b.withId(id++).at(HX - 0.32, y, -1.4, -Math.PI / 2), 1.0, 1.5, rng); blk(HX - 0.3, -1.4, 0.45, 1.1);
  }

  // ---- 屋外：篱笆、信箱、花坛、树、泳池、车
  const fy = () => 0;
  items.push(...parts.fence(-7.6, -6.6, 7.6, -6.6, fy, id++), ...parts.fence(-7.6, -6.6, -7.6, 6.6, fy, id++), ...parts.fence(7.6, -6.6, 7.6, 6.6, fy, id++));
  items.push(...parts.fence(-7.6, 6.6, -2.9, 6.6, fy, id++), ...parts.fence(-1.2, 6.6, 1.3, 6.6, fy, id++));
  {
    const g = b.withId(id++).at(-3.3, 0, 7.4);
    g.box(0, 0, 0, 0.08, 0.9, 0.08, 'wood', { args: [0] });
    g.box(0, 0.9, 0, 0.3, 0.22, 0.42, 'accent', { args: [0.4] });
    g.box(0.17, 1.0, 0.08, 0.02, 0.2, 0.08, 'sand', { args: [0], noOutline: true });
  }
  for (const [x0, x1] of [[-4.6, -2.9], [-1.2, 1.4]]) {
    slab(x0, x1, 0, 0.1, HZ + 0.2, HZ + 0.6, 'soil', id++, { noOutline: true });
    for (let x = x0 + 0.15; x < x1; x += 0.32) items.push({ prim: 'sphere', pos: [x, 0.2, HZ + 0.4], scale: [0.22, 0.2, 0.22], role: I.hash2(x, 3) < 0.5 ? 'flower' : 'foliage', id: id - 1, noOutline: true });
  }
  for (const [x, z, s] of [[-6.4, -5.4, 1.9], [6.3, -5.6, 1.6], [-6.5, 4.6, 1.7], [-6.2, -1.2, 1.4], [6.6, 5.6, 1.2], [-9.5, 9.0, 2.0], [10.5, -3, 2.2], [-11, -6, 2.3], [9.8, 6.2, 1.8]] as [number, number, number][]) {
    I.tree(b.withId(id++).at(x, 0, z), s * 1.4, I.hash2(x, z) < 0.3 ? 'cone' : 'round', rng);
    blk(x, z, 0.6, 0.6);
  }
  for (let k = 0; k < 10; k++) items.push(...parts.bush(-7 + k * 1.5, 0, -6.15, 0.45, shape, rng, id++));
  {
    // 泳池（东侧，离镜头近）
    const pid = id++;
    slab(5.3, 7.3, 0, 0.14, -3.4, -3.2, 'paper', pid); slab(5.3, 7.3, 0, 0.14, 0.6, 0.8, 'paper', pid);
    slab(5.3, 5.5, 0, 0.14, -3.2, 0.6, 'paper', pid); slab(7.1, 7.3, 0, 0.14, -3.2, 0.6, 'paper', pid);
    slab(5.5, 7.1, -0.4, 0.02, -3.2, 0.6, 'waterDeep', pid, { noOutline: true });
    slab(5.5, 7.1, 0.02, 0.08, -3.2, 0.6, 'water', pid, { noOutline: true });
    const g = b.withId(id++).at(5.9, 0.12, 1.25);
    g.box(0, 0, 0, 0.6, 0.12, 0.3, 'cloth', { args: [0.2] });
    blk(6.3, -1.3, 2.2, 4.5);
  }
  {
    const g = b.withId(id++).at(2.9, 0.05, 5.5, Math.PI / 2);
    g.box(0, 0.12, 0, 1.6, 0.42, 0.85, 'accent', { args: [0.45] });
    g.box(-0.1, 0.52, 0, 0.9, 0.34, 0.78, 'accent', { args: [0.55] });
    g.box(-0.1, 0.55, 0, 0.92, 0.24, 0.8, 'glass', { args: [0], noOutline: true });
    for (const sx of [-0.52, 0.52]) for (const sz of [-0.42, 0.42]) g.add('cylinder', sx, 0.16, sz, 0.32, 0.12, 0.32, 'ink', { rx: Math.PI / 2 });
    blk(2.9, 5.5, 1.0, 1.7);
  }
  lights.push({ pos: [-2.1, 1.2, HZ + 0.6], color: '#FFC27A', range: 3.5, intensity: 1.1, night: true });

  // ---- 角色：室友（厨房，NPC）、邮递员（门外，NPC）、门口的包裹（拾取物）、厨房地上的蟑螂（敌人）
  const S = 1.45;
  {
    const g = b.withId(id++).at(1.6, FLOOR + 0.03, 1.15, Math.PI * 0.8);
    I.citizen(g, S, 'flower', 'trim');
    actors.push(actor('npc', '室友', [1.6, FLOOR, 1.15], 0.85 * S, g.id)); blk(1.6, 1.15, 0.4, 0.4);
    const p = b.withId(id++).at(-3.9, 0.08, 7.6, -0.4);
    I.citizen(p, S, 'cloth', 'paper');
    p.box(0.22, 0.5 * S, 0.1, 0.14, 0.2, 0.3, 'wood', { args: [0.1] });
    actors.push(actor('npc', '邮递员', [-3.9, 0.08, 7.6], 0.85 * S, p.id));
    const c = b.withId(id++).at(-1.75, 0.06, 4.15, 0.3);
    c.box(0, 0, 0, 0.42, 0.3, 0.34, 'interactive', { args: [0.15] });
    c.box(0, 0.3, 0, 0.44, 0.02, 0.07, 'trim', { args: [0], noOutline: true });
    actors.push(actor('pickup', '包裹', [-1.75, 0.06, 4.15], 0.4, c.id));
    const r = b.withId(id++).at(3.5, FLOOR + 0.03, 1.2, 2.2);
    crawler(r, 'trim', 0.3);
    actors.push(actor('enemy', '蟑螂', [3.5, FLOOR + 0.03, 1.2], 0.25, r.id));
  }

  const start: [number, number, number] = [-2.6, FLOOR + 0.03, 0.75];
  const V = 12.5;
  return {
    items, actors, lights,
    dynamic: [characterAt(v, ...start)],
    playerScale: 1.5,
    ground: {
      heightAt: (x, z) => (Math.abs(x) < HX + 0.1 && Math.abs(z) < HZ + 0.1 ? FLOOR + 0.03 : 0.04),
      inside: (x, z) => {
        if (Math.abs(x) > 7.3 || z < -6.3 || z > 7.9) return false;
        // 墙（切低的也不能跨过去；门洞能走）：靠近墙线 0.22 以内、又不在门洞里就挡住
        const nearX = (zw: number, gaps: [number, number][], x0 = -HX - 0.1, x1 = HX + 0.1) => Math.abs(z - zw) < 0.22 && x > x0 && x < x1 && !gaps.some(([a, c]) => x > a && x < c);
        const nearZ = (xw: number, z0: number, z1: number) => Math.abs(x - xw) < 0.22 && z > z0 && z < z1;
        if (nearX(-HZ, []) || nearX(HZ, [[-2.6, -1.5]]) || nearX(0, [[-1.45, -0.55], [1.0, 1.8], [3.4, 4.2]])) return false;
        if (nearZ(-HX, -HZ - 0.1, HZ + 0.1) || nearZ(HX, -HZ - 0.1, HZ + 0.1) || nearZ(0.4, -HZ, 0) || nearZ(2.6, -HZ, 0)) return false;
        return !blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e);
      },
    },
    bounds: { center: [0, 1, 0.5], radius: 10 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI * 0.35,
    // 内容框：整栋房子（画面宽约 12）在竖屏 / 4:3 也装得下，上下多出来的是草坪和马路
    camera: { ...RIG_CUTAWAY, viewSize: V, target: [0.2, 0.6, 0.6], fit: { w: 12.6 } },
  } satisfies SceneDesc;
});
