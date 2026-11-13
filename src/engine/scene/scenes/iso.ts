import { RIG_ISO_CITY } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor } from '../kits2d';
import * as I from '../kitsIso';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
// 其余场景各一个文件（同一轨道），引入即注册
import './isoDungeon';
import './isoHd2d';
import './isoVillage';
import './isoIllusion';
import './isoCutaway';
import { characterAt, heightTextureFrom, shapeOf } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc } from '../types';

/*
 * 技术补全（2026-10-23）G·等距与 2.5D 轨道的场景构建器（元数据与 rig 在 content/scenes25d/iso.ts）。
 * 每个场景：锁定的镜头（rig）、场景角色（actors：玩家以外的 NPC / 敌人 / 拾取物 / 目标，HUD 挂点用）、颜色角色（换色板就换色）。
 */

/* ============================================================
 * 等距·小城 iso-city（模拟城市 2000 / Townscaper）
 * 12 × 12 格（每格 2 米）的悬空方块地：两条东西向马路 + 一条南北向马路，一条运河南北穿过（两座桥），
 * 九个街区：写字楼（后角，往天上长，填住菱形上方的空）、商店、运河边的窄高彩色房子、中央公园、前面的住宅；
 * 侧面切开看得到草皮 / 土层 / 碎石带 / 岩层，底下挂着岩块，四周是云。正交 2:1 二等角、方位 45、固定机位。
 * ============================================================ */

type Zone = 'office' | 'com' | 'canal' | 'park' | 'res';
const CITY_N = 12, CITY_C = 2;

registerSceneBuilder('iso-city', (ctx) => {
  const v = ctx.values, rng = ctx.rng, shape = shapeOf(v);
  const N = CITY_N, C = CITY_C, half = (N * C) / 2;
  const cx = (i: number) => -half + (i + 0.5) * C, cz = cx;
  const ROAD_ROWS = [3, 8], ROAD_COL = 4, CANAL = 8;
  const isRoad = (i: number, j: number) => ROAD_ROWS.includes(j) || i === ROAD_COL;
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 40;
  const actors: SceneActor[] = [];
  const blocked: [number, number, number, number][] = [];
  const block = (x: number, z: number, w: number, d: number) => blocked.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);

  // ---- 底座：运河两边各一块（顶面 0），运河底下一截（顶面 −1，表层是深水色的河床）；同一编号，地层之间不出线
  const cx0 = -half + CANAL * C, cx1 = cx0 + C;
  I.dioramaBlock(items, 2, -half, cx0, -half, half, 0);
  I.dioramaBlock(items, 2, cx1, half, -half, half, 0);
  I.dioramaBlock(items, 2, cx0, cx1, -half, half, -1.0, { turf: 0.14, turfRole: 'waterDeep' });
  I.islandUnderside(items, 2, -half, half, -half, half, -2.7, rng, 11);
  // 河岸石墙（运河两侧，略高出地面当路缘）
  for (const x of [cx0 + 0.09, cx1 - 0.09]) items.push({ prim: 'box', args: [0], pos: [x, -0.44, 0], scale: [0.18, 1.12, N * C], role: 'stone', id: 3, flat: true });
  // 运河前端的剖面：看得到一截水（模拟城市 2000 的地图边）
  items.push({ prim: 'box', args: [0], pos: [(cx0 + cx1) / 2, -0.68, half - 0.03], scale: [C - 0.36, 0.62, 0.06], role: 'water', id: 4, noOutline: true, flat: true });

  // ---- 马路：东西向两条、南北向一条（运河上是桥）；路面 + 中线虚线 + 路口斑马线
  const ROADY = 0.03;
  const roadSlab = (x: number, z: number, w: number, d: number) => items.push({ prim: 'box', args: [0], pos: [x, ROADY / 2, z], scale: [w, ROADY, d], role: 'metal', id: 5, noOutline: true, flat: true });
  for (const j of ROAD_ROWS) {
    roadSlab((-half + cx0) / 2, cz(j), cx0 + half, C);
    roadSlab((cx1 + half) / 2, cz(j), half - cx1, C);
  }
  for (const [j0, j1] of [[0, 3], [4, 8], [9, 12]]) roadSlab(cx(ROAD_COL), (-half + j0 * C + -half + j1 * C) / 2, C, (j1 - j0) * C);
  const dash = (x: number, z: number, along: 'x' | 'z') => b.withId(6).box(x, ROADY, z, along === 'x' ? 0.45 : 0.06, 0.012, along === 'x' ? 0.06 : 0.45, 'paper', { noOutline: true, flat: true, args: [0] });
  for (const j of ROAD_ROWS) for (let i = 0; i < N; i++) if (i !== ROAD_COL && i !== CANAL) for (const k of [-0.5, 0.5]) dash(cx(i) + k * 0.9, cz(j), 'x');
  for (let j = 0; j < N; j++) if (!ROAD_ROWS.includes(j)) for (const k of [-0.5, 0.5]) dash(cx(ROAD_COL), cz(j) + k * 0.9, 'z');
  // 斑马线：路口四边
  for (const j of ROAD_ROWS) for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      b.withId(6).box(cx(ROAD_COL) + s * (C / 2 + 0.25), ROADY, cz(j) - 0.7 + k * 0.35, 0.4, 0.012, 0.16, 'paper', { noOutline: true, flat: true, args: [0] });
      b.withId(6).box(cx(ROAD_COL) - 0.7 + k * 0.35, ROADY, cz(j) + s * (C / 2 + 0.25), 0.16, 0.012, 0.4, 'paper', { noOutline: true, flat: true, args: [0] });
    }
  }
  // 桥：运河上的两座（石拱桥身 + 栏杆），路面接着马路
  for (const j of ROAD_ROWS) {
    const z = cz(j);
    b.withId(7).box((cx0 + cx1) / 2, -0.32, z, C, 0.32, C - 0.1, 'stone', { args: [0.03] });
    b.withId(5).box((cx0 + cx1) / 2, 0, z, C, ROADY, C - 0.3, 'metal', { noOutline: true, flat: true, args: [0] });
    for (const s of [-1, 1]) {
      b.withId(7).box((cx0 + cx1) / 2, 0, z + s * (C / 2 - 0.1), C + 0.1, 0.22, 0.12, 'stone', { args: [0.1] });
      for (const x of [cx0 + 0.05, cx1 - 0.05]) b.withId(7).box(x, 0, z + s * (C / 2 - 0.1), 0.18, 0.32, 0.18, 'stone', { args: [0.1] });
    }
  }

  // ---- 街区：人行道（路缘高 0.08）+ 区内（商业 / 写字楼整块铺地，住宅与公园是草地）
  const ZONES: [number, number, number, number, Zone][] = [
    [0, 3, 0, 2, 'office'], [5, 7, 0, 2, 'com'], [9, 11, 0, 2, 'canal'],
    [0, 3, 4, 7, 'com'], [5, 7, 4, 7, 'park'], [9, 11, 4, 7, 'canal'],
    [0, 3, 9, 11, 'res'], [5, 7, 9, 11, 'res'], [9, 11, 9, 11, 'res'],
  ];
  const SW = 0.34, CURB = 0.08;
  const zoneAt = (x: number, z: number) => ZONES.find(([i0, i1, j0, j1]) => x >= -half + i0 * C && x <= -half + (i1 + 1) * C && z >= -half + j0 * C && z <= -half + (j1 + 1) * C);
  const lights: SceneDesc['lights'] = [];
  for (const [i0, i1, j0, j1, zone] of ZONES) {
    const x0 = -half + i0 * C, x1 = -half + (i1 + 1) * C, z0 = -half + j0 * C, z1 = -half + (j1 + 1) * C;
    // 贴着运河 / 底座边的那一侧不留人行道（运河边是河岸石墙，底座边是草皮）
    const ex0 = x0 + (i0 === 0 ? 0 : 0), ex1 = x1, ez0 = z0, ez1 = z1;
    const bid = id++;
    if (zone === 'office' || zone === 'com') {
      items.push({ prim: 'box', args: [0], pos: [(ex0 + ex1) / 2, CURB / 2, (ez0 + ez1) / 2], scale: [ex1 - ex0, CURB, ez1 - ez0], role: 'stone', id: bid, noOutline: true, flat: true });
    } else {
      const ring = (x: number, z: number, w: number, d: number) => items.push({ prim: 'box', args: [0], pos: [x, CURB / 2, z], scale: [w, CURB, d], role: 'stone', id: bid, noOutline: true, flat: true });
      ring((x0 + x1) / 2, z0 + SW / 2, x1 - x0, SW); ring((x0 + x1) / 2, z1 - SW / 2, x1 - x0, SW);
      ring(x0 + SW / 2, (z0 + z1) / 2, SW, z1 - z0 - SW * 2); ring(x1 - SW / 2, (z0 + z1) / 2, SW, z1 - z0 - SW * 2);
    }
  }
  const yAt = (x: number, z: number) => {
    const zz = zoneAt(x, z);
    if (!zz) return ROADY;
    const [i0, i1, j0, j1, zone] = zz;
    if (zone === 'office' || zone === 'com') return CURB;
    const x0 = -half + i0 * C, x1 = -half + (i1 + 1) * C, z0 = -half + j0 * C, z1 = -half + (j1 + 1) * C;
    return x - x0 < SW || x1 - x < SW || z - z0 < SW || z1 - z < SW ? CURB : 0;
  };

  // ---- 建筑与绿化（每格一块地）
  const L = (i: number, j: number) => b.withId(id++).at(cx(i), yAt(cx(i), cz(j)), cz(j));
  const doorToward = (i: number, j: number): '+x' | '+z' | '-x' | '-z' => {
    // 门朝最近的马路（看不见的两面也行，门那一面单独开）
    const dRow = Math.min(...ROAD_ROWS.map((r) => Math.abs(r - j))), dCol = Math.abs(ROAD_COL - i);
    if (dRow <= dCol) return ROAD_ROWS.some((r) => r === j + dRow) ? '+z' : '-z';
    return ROAD_COL > i ? '+x' : '-x';
  };
  let fireDone = false;
  for (const [i0, i1, j0, j1, zone] of ZONES) {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const h = I.hash2(i, j), h2 = I.hash2(i, j, 1), h3 = I.hash2(i, j, 2);
      const x = cx(i), z = cz(j);
      if (zone === 'office' && (i + j) % 2 === 1) {
        // 写字楼之间夹着矮一点的砖楼（屋顶有一小块绿地）：高楼不挤成一整堵玻璃墙
        I.shop(L(i, j), 1.5, 1.4, 2, I.pick(['roof', 'sand', 'stone'] as Role[], h2), 'foliage2', i % 2 ? '+z' : '+x');
        b.withId(id - 1).box(cx(i) - 0.2, CURB + 2.14, cz(j) - 0.2, 0.7, 0.08, 0.6, 'grass', { args: [0] });
        block(x, z, 1.6, 1.5);
      } else if (zone === 'office') {
        // 后角的写字楼：越靠后越高（往画面上方长）
        const back = (3 - i + 2 - j) / 5;
        const hh = 1.8 + back * 2.6 + h * 0.8;
        I.tower(L(i, j), 1.45, 1.45, hh, I.pick(['structure', 'stone', 'paper', 'metal'] as Role[], h2), rng);
        block(x, z, 1.6, 1.6);
      } else if (zone === 'com') {
        if (zone === 'com' && i === 6 && j === 1) {
          I.construction(L(i, j), 1.6, 1.6);
          actors.push(actor('objective', '工地', [x, CURB, z], 1.2));
          block(x, z, 1.7, 1.7);
          continue;
        }
        if (h3 < 0.3 && i0 === 0) { I.tower(L(i, j), 1.4, 1.4, 1.8 + h * 1.4, I.pick(['stone', 'structure'] as Role[], h2), rng); block(x, z, 1.5, 1.5); continue; }
        const front = j === j1 || ROAD_ROWS.includes(j + 1) ? '+z' : '+x';
        I.shop(L(i, j), 1.5, 1.35, h < 0.5 ? 1 : 2, I.pick(I.WALLS, h2), I.pick(['accent', 'cloth', 'roof', 'foliage2'] as Role[], h3), front);
        block(x, z, 1.6, 1.45);
        // 着火的那一家（敌人 = 灾害）
        if (!fireDone && i === 2 && j === 6) {
          fireDone = true;
          const top = (h < 0.5 ? 1 : 2) * 0.9 + 0.34 + CURB;
          I.fire(b.withId(id++).at(x - 0.1, top, z), 0.9);
          actors.push(actor('enemy', '火灾', [x - 0.1, top, z], 1.0));
        }
      } else if (zone === 'canal') {
        // 运河边的窄高彩色房子（Townscaper）：每格两栋，挤在一起，屋顶很陡
        for (const k of [-0.5, 0.5]) {
          const hk = I.hash2(i, j, 5 + k);
          const g = b.withId(id++).at(x - 0.25, CURB, z + k * 0.95);
          I.house(g, 1.2, 0.9, hk < 0.4 ? 2 : 3, I.pick(['paper', 'sand', 'structure', 'wood', 'stone', 'paper'] as Role[], I.hash2(i, j, 7 + k)), I.pick(['roof', 'roof', 'trim', 'metal'] as Role[], I.hash2(i, j, 9 + k)), '-x', false, rng, 1.5);
        }
        block(x - 0.25, z, 1.3, 1.95);
        if (h < 0.5) I.tree(b.withId(id++).at(x + 0.6, CURB, z + 0.6 - h), 0.9, 'round', rng);
      } else if (zone === 'res') {
        const door = doorToward(i, j);
        const w = 1.1 + h * 0.35, d = 1.0 + h2 * 0.3;
        const ox = (h3 - 0.5) * 0.3, oz = (h - 0.5) * 0.3;
        I.house(b.withId(id++).at(x + ox, 0, z + oz), w, d, h2 < 0.65 ? 1 : 2, I.pick(I.WALLS, h3), I.pick(I.ROOFS, h2), door, h < 0.5, rng);
        block(x + ox, z + oz, w + 0.1, d + 0.1);
        // 院子：一棵树 / 灌木 + 小路
        const tx = x + (ox > 0 ? -0.68 : 0.68), tz = z + (oz > 0 ? -0.66 : 0.66);
        if (h3 > 0.25) { I.tree(b.withId(id++).at(tx, 0, tz), 0.85 + h * 0.35, h2 < 0.3 ? 'cone' : 'round', rng); block(tx, tz, 0.4, 0.4); }
        else items.push(...parts.bush(tx, 0, tz, 0.35, shape, rng, id++));
      } else if (zone === 'park') {
        // 公园在下面统一摆
      }
    }
  }

  // ---- 中央公园（i 5–7、j 4–7）：十字小路 + 喷泉 + 树 + 长椅 + 花坛
  {
    const x0 = -half + 5 * C + SW, x1 = -half + 8 * C - SW, z0 = -half + 4 * C + SW, z1 = -half + 8 * C - SW;
    const pxc = (x0 + x1) / 2, pzc = (z0 + z1) / 2;
    const pid = id++;
    items.push({ prim: 'box', args: [0], pos: [pxc, 0.01, pzc], scale: [x1 - x0, 0.02, 0.7], role: 'path', id: pid, noOutline: true, flat: true });
    items.push({ prim: 'box', args: [0], pos: [pxc, 0.01, pzc], scale: [0.7, 0.02, z1 - z0], role: 'path', id: pid, noOutline: true, flat: true });
    const f = b.withId(id++).at(pxc, 0, pzc);
    f.cyl(0, 0, 0, 0.95, 0.26, 'stone', 1);
    f.add('cylinder', 0, 0.22, 0, 1.62, 0.04, 1.62, 'water', { args: [1], noOutline: true });
    f.cyl(0, 0.2, 0, 0.14, 0.6, 'stone', 0.7);
    f.ball(0, 0.92, 0, 0.16, 0.22, 0.16, 'water', { noOutline: true, args: [0] });
    block(pxc, pzc, 2.1, 2.1);
    const trees: [number, number][] = [[x0 + 0.6, z0 + 0.6], [x0 + 1.6, z0 + 0.5], [x1 - 0.6, z0 + 0.7], [x0 + 0.5, z1 - 0.7], [x1 - 0.7, z1 - 0.6], [x1 - 0.5, z0 + 1.9], [x0 + 0.6, pzc - 1.3], [x1 - 1.6, z1 - 0.5], [x0 + 1.7, z1 - 0.5], [x1 - 0.6, pzc + 1.4]];
    trees.forEach(([tx, tz], k) => { I.tree(b.withId(id++).at(tx, 0, tz), 1.0 + I.hash2(k, 3) * 0.45, k % 3 === 2 ? 'cone' : 'round', rng); block(tx, tz, 0.5, 0.5); });
    for (const [bx, bz, r] of [[pxc - 1.6, pzc + 0.62, 0], [pxc + 1.6, pzc - 0.62, Math.PI], [pxc + 0.62, pzc + 1.7, -Math.PI / 2]] as [number, number, number][]) I.bench(b.withId(id++).at(bx, 0, bz, r));
    for (const [fx, fz] of [[pxc - 1.4, pzc - 1.5], [pxc + 1.3, pzc + 1.6]]) items.push(...parts.flowers(fx, 0, fz, 0.7, shape, rng, id++));
  }

  // ---- 底座边缘一圈树（Townscaper 的地块边）+ 运河里的船
  for (let k = 0; k < 7; k++) {
    const t = I.hash2(k, 11);
    const tx = -half + 0.55 + t * 0.3, tz = -half + 2 + k * 3.1;
    if (!isRoad(0, Math.floor((tz + half) / C))) I.tree(b.withId(id++).at(tx + 0.2, 0, tz), 0.8, 'cone', rng);
  }
  I.rowboat(b.withId(id++).at((cx0 + cx1) / 2 - 0.2, -0.38, cz(6) + 0.4, 0.06));
  I.rowboat(b.withId(id++).at((cx0 + cx1) / 2 + 0.25, -0.38, cz(10) - 0.2, -0.1), 0.9);

  // ---- 行道树：东西向两条马路两侧的人行道上，每格一棵（绿色的节奏，像素化后也读得出街道）
  for (const j of ROAD_ROWS) for (const s2 of [-1, 1]) for (let i = 0; i < N; i++) {
    if (i === ROAD_COL || i === CANAL || I.hash2(i, j, s2) < 0.3) continue;
    const tx = cx(i) + 0.55, tz = cz(j) + s2 * (C / 2 + 0.2);
    if (blocked.some(([a, c, d, e]) => tx > a - 0.2 && tx < c + 0.2 && tz > d - 0.2 && tz < e + 0.2)) continue;
    I.tree(b.withId(id++).at(tx, CURB, tz), 0.75, 'round', rng);
  }
  // ---- 路灯（夜里亮，最多 8 盏点光）
  for (const [lx, lz, r] of [[cx(ROAD_COL) - 1.2, cz(3) - 1.2, Math.PI], [cx(ROAD_COL) + 1.2, cz(8) + 1.2, 0], [cx(6) + 1, cz(3) + 1.2, 0], [cx(10), cz(8) - 1.2, Math.PI], [cx(1), cz(8) + 1.2, 0], [cx(10), cz(3) + 1.2, 0]] as [number, number, number][]) {
    I.lamp(b.withId(id++).at(lx, CURB, lz, r));
    if (lights.length < 8) lights.push({ pos: [lx, 1.4, lz], color: '#FFB347', range: 4, intensity: 1.3, night: true });
  }

  // ---- 车与人（角色：市民是 NPC；一辆出租车停在路边）
  const CARS: [number, number, number, Role][] = [[cx(1), cz(3) + 0.5, 0, 'accent'], [cx(6) + 0.3, cz(3) - 0.5, Math.PI, 'cloth'], [cx(10) - 0.4, cz(8) + 0.5, 0, 'paper'], [cx(ROAD_COL) - 0.5, cz(6), Math.PI / 2, 'roof'], [cx(ROAD_COL) + 0.5, cz(10) + 0.2, -Math.PI / 2, 'sand']];
  for (const [x, z, r, role] of CARS) {
    const g = b.withId(id++).at(x, ROADY, z, r);
    // 车缩到路的比例（K.car 是 1.8 长）：手写一个小一号的
    g.box(0, 0.1, 0, 1.15, 0.3, 0.62, role, { args: [0.45] });
    g.box(-0.08, 0.38, 0, 0.62, 0.24, 0.55, role, { args: [0.55] });
    g.box(-0.08, 0.4, 0, 0.64, 0.17, 0.57, 'glass', { noOutline: true, args: [0] });
    for (const sx of [-0.36, 0.36]) for (const sz of [-0.3, 0.3]) g.add('cylinder', sx, 0.12, sz, 0.24, 0.1, 0.24, 'ink', { rx: Math.PI / 2 });
  }
  const taxi = CARS[4];
  actors.push(actor('npc', '出租车', [taxi[0], ROADY, taxi[1]], 0.6));
  const people: [number, number, Role, string][] = [[cx(6) - 0.4, cz(5) + 0.1, 'cloth', '市民'], [cx(1) + 0.9, cz(8) - 1.2, 'accent', '路人'], [cx(10) + 0.9, cz(5), 'flower', '游客']];
  for (const [x, z, shirt, label] of people) {
    const g = b.withId(id++).at(x, yAt(x, z), z, I.hash2(x, z) * 6);
    I.citizen(g, 0.95, shirt);
    actors.push(actor('npc', label, [x, yAt(x, z), z], 0.8, g.id));
  }
  // 拾取物：人行道上的包裹
  {
    const x = cx(5) - 0.6, z = cz(7) + 0.75;
    const g = b.withId(id++).at(x, CURB, z, 0.4);
    g.box(0, 0, 0, 0.36, 0.28, 0.3, 'interactive', { args: [0.15] });
    g.box(0, 0.28, 0, 0.38, 0.02, 0.06, 'trim', { noOutline: true, args: [0] });
    actors.push(actor('pickup', '包裹', [x, CURB, z], 0.4, g.id));
  }

  // ---- 底座下方的云海（静止）
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3, r = 15 + I.hash2(k, 21) * 3;
    items.push(...parts.cloud(3 + I.hash2(k, 22) * 1.5, shape, rng, 90 + k).map((it) => ({ ...it, pos: [it.pos[0] + Math.cos(a) * r, it.pos[1] - 6.5 + I.hash2(k, 23) * 2, it.pos[2] + Math.sin(a) * r] as [number, number, number] })));
  }

  // 玩家：公园前的人行道
  const start: [number, number, number] = [cx(6) + 0.5, CURB, cz(7) + 0.8];
  const water = {
    level: -0.36, shape: 'square' as const, size: N * C, center: [0, 0] as [number, number],
    heightTexture: heightTextureFrom(half, (x) => (x > cx0 && x < cx1 ? -1.0 : 0.4), 96), heightHalf: half,
  };
  const V = 24.5;
  return {
    items, actors, lights, water,
    dynamic: [characterAt(v, ...start)],
    ground: {
      heightAt: (x, z) => yAt(x, z),
      inside: (x, z) => {
        if (Math.abs(x) > half - 0.3 || Math.abs(z) > half - 0.3) return false;
        // 运河：只有桥上能过
        if (x > cx0 - 0.05 && x < cx1 + 0.05 && !ROAD_ROWS.some((j) => Math.abs(z - cz(j)) < C / 2 - 0.25)) return false;
        return !blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e);
      },
    },
    bounds: { center: [0, 0, 0], radius: half * 1.5 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI * 0.25,
    camera: { ...RIG_ISO_CITY, viewSize: V, target: [0, 0.7, 0] },
  } satisfies SceneDesc;
});
