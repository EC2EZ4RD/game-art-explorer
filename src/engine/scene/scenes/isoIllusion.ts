import { RIG_ILLUSION } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor } from '../kits2d';
import * as I from '../kitsIso';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc } from '../types';

/* ============================================================
 * 等距·错觉塔 iso-illusion（纪念碑谷 / 埃舍尔；技术补全 G，由 scenes/iso.ts 引入）
 *
 * 原理：真等距（俯角 35.264° = atan(1/√2)、方位 45°）的正交镜头沿 (1, 1, 1) 方向看，
 * 一个点挪 t·(1, 1, 1) 在画面上不动（只是离镜头近了 / 远了）。于是：
 *  ① 不可能的桥：矮平台（远、低）伸出一段走道，后半段其实在 4 米外、4 米高的塔顶上（近、高），画面上接成一条平路；
 *  ② 彭罗斯楼梯：16 级台阶一圈每级都往上 0.25 米，平面走位往镜头方向漂 (4, 4)，最后一级在画面上正好接回第一级。
 * 接缝的走向要「从近处走向远处」（−x / −z）或「从远处走向近处」（+x / +z）地选，遮挡关系才和错觉一致
 *（近的那块正好盖住远的那块本来就该被盖住的面）；接缝都落在格子分界上，描边配方的线也落在本来就有的格缝上。
 * 投影会暴露真实位置，所以推荐值关掉投影。
 * ============================================================ */

/** 往镜头方向挪 t（画面上不动） */
const toward = (p: [number, number, number], t: number): [number, number, number] => [p[0] + t, p[1] + t, p[2] + t];

registerSceneBuilder('iso-illusion', (ctx) => {
  const v = ctx.values;
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 60;
  const actors: SceneActor[] = [];
  const blocked: [number, number, number, number][] = [];
  const blk = (x0: number, x1: number, z0: number, z1: number) => blocked.push([x0, x1, z0, z1]);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, role: Role, oid: number, extra: Partial<Item> = {}) =>
    items.push({ prim: 'box', args: [0.04], pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], scale: [x1 - x0, y1 - y0, z1 - z0], role, id: oid, ...extra });

  // ---- 底座：悬空的浅色石台（顶面 y = 0，14 × 14），一圈收边，底下两级倒台阶（浮岛）
  const BH = 7;
  box(-BH, BH, -1.0, 0, -BH, BH, 'stone', 2, { args: [0], flat: true });
  box(-BH - 0.3, BH + 0.3, -1.3, -0.9, -BH - 0.3, BH + 0.3, 'paper', 3, { args: [0] });
  box(-BH + 1.2, BH - 1.2, -2.6, -1.3, -BH + 1.2, BH - 1.2, 'structure', 3, { args: [0] });
  box(-BH + 3, BH - 3, -3.8, -2.6, -BH + 3, BH - 3, 'stone', 3, { args: [0] });
  items.push({ prim: 'pyramid', pos: [0, -4.6, 0], rot: [Math.PI, Math.PI / 4, 0], scale: [4.4, 1.6, 4.4], role: 'structure', id: 3 });
  // 底座上的地砖缝（格子感）
  for (let k = -BH + 1; k < BH; k += 1) {
    box(k - 0.015, k + 0.015, 0, 0.012, -BH, BH, 'paper', 4, { args: [0], noOutline: true, flat: true });
    box(-BH, BH, 0, 0.012, k - 0.015, k + 0.015, 'paper', 4, { args: [0], noOutline: true, flat: true });
  }
  // 水池（前右）：一圈池沿 + 水面
  box(1.6, 6.6, 0, 0.3, 2.6, 6.6, 'paper', 5, { args: [0] });
  box(1.9, 6.3, 0.3, 0.32, 2.9, 6.3, 'water', 5, { args: [0], noOutline: true, flat: true });
  blk(1.4, 6.8, 2.4, 6.8);

  // ---- 矮平台 A（后左，顶面 y = 4）：墙身 + 顶上一圈收边 + 看得见的两面各两道拱门浮雕 + 正面一段台阶
  const A: [number, number, number, number] = [-6.8, -3.8, -6.8, -3.8];
  const ATOP = 4;
  box(A[0], A[1], 0, ATOP - 0.25, A[2], A[3], 'structure', 6);
  box(A[0] - 0.12, A[1] + 0.12, ATOP - 0.25, ATOP, A[2] - 0.12, A[3] + 0.12, 'paper', 6, { args: [0] });
  for (const u of [0.28, 0.72]) {
    I.archRelief(b.withId(id++).at(A[0] + (A[1] - A[0]) * u, 0, A[3] + 0.01), 0.9, 1.8, 'accent');
    I.archRelief(b.withId(id++).at(A[1] + 0.01, 1.6, A[2] + (A[3] - A[2]) * u, Math.PI / 2), 0.8, 1.5, 'roof');
  }
  for (let k = 0; k < 8; k++) box(A[0] + 0.2, A[0] + 1.2, 0, ATOP - 0.25 - k * 0.47, A[3] + k * 0.42, A[3] + (k + 1) * 0.42, k % 2 ? 'paper' : 'structure', 6, { args: [0] });
  blk(A[0], A[1], A[2], A[3] + 3.5);

  // ---- ① 不可能的桥：A 顶面往 +x 伸出 2 块（远、低，y = 4），画面上接下去的 2 块其实挪了 t = 3（近、高，y = 7），
  //      再接塔 B 的顶面（同样挪 3）。从远走向近（+x），近的那块正好盖住远的那块的端面
  const T = 3, WZ = (A[2] + A[3]) / 2;
  const tile = (p: [number, number, number], oid: number) => {
    box(p[0] - 0.5, p[0] + 0.5, p[1] - 0.45, p[1], p[2] - 0.7, p[2] + 0.7, 'paper', oid, { args: [0] });
    for (const s2 of [-1, 1]) box(p[0] - 0.5, p[0] + 0.5, p[1], p[1] + 0.2, p[2] + s2 * 0.7 - 0.08, p[2] + s2 * 0.7 + 0.08, 'structure', oid, { args: [0] });
  };
  const bridgeId = id++;
  for (let k = 0; k < 2; k++) tile([A[1] + 0.5 + k, ATOP, WZ], bridgeId);
  for (let k = 2; k < 4; k++) tile(toward([A[1] + 0.5 + k, ATOP, WZ], T), bridgeId);
  // 塔 B：顶面 = 「A 顶面再往 +x 4 格、宽 3 格」挪 3；塔身一直落到底座上——看上去比 A 高一大截，顶面却和 A 平接
  const bc = toward([A[1] + 4 + 1.5, ATOP, WZ], T);
  const Bx0 = bc[0] - 1.5, Bx1 = bc[0] + 1.5, Bz0 = bc[2] - 1.5, Bz1 = bc[2] + 1.5, BTOP = bc[1];
  box(Bx0 + 0.25, Bx1 - 0.25, 0, BTOP - 0.25, Bz0 + 0.25, Bz1 - 0.25, 'structure', 7);
  box(Bx0, Bx1, BTOP - 0.25, BTOP, Bz0, Bz1, 'paper', 7, { args: [0] });
  for (let y = 1.0; y < BTOP - 1.5; y += 2.0) {
    I.archRelief(b.withId(id++).at((Bx0 + Bx1) / 2, y, Bz1 - 0.24), 0.55, 1.1, 'glass');
    I.archRelief(b.withId(id++).at(Bx1 - 0.24, y, (Bz0 + Bz1) / 2, Math.PI / 2), 0.55, 1.1, 'glass');
  }
  blk(Bx0 + 0.15, Bx1 - 0.15, Bz0 + 0.15, Bz1 - 0.15);
  // 塔顶的神龛（目标）：拱门 + 发光的门洞 + 小圆顶
  {
    const g = b.withId(id++).at(bc[0] + 0.4, BTOP, bc[2] - 0.2);
    g.box(0, 0, -0.6, 1.5, 1.8, 0.5, 'structure', { args: [0.04] });
    g.box(0, 0, -0.33, 0.66, 1.1, 0.04, 'emissive', { noOutline: true, args: [0] });
    g.add('cylinder', 0, 1.1, -0.33, 0.66, 0.04, 0.66, 'emissive', { rx: Math.PI / 2, args: [1], noOutline: true, flat: true });
    g.ball(0, 1.95, -0.6, 0.58, 0.52, 0.4, 'roof');
    g.add('pyramid', 0, 2.6, -0.6, 0.16, 0.46, 0.16, 'sand');
    actors.push(actor('objective', '神龛', [bc[0] + 0.4, BTOP, bc[2] - 0.5], 2.3, g.id));
  }
  // 远的那段走道上：一块发光的几何碎片（拾取物）
  {
    const p: [number, number, number] = [A[1] + 1.0, ATOP, WZ];
    const g = b.withId(id++).at(...p);
    g.add('pyramid', 0, 0.42, 0, 0.32, 0.32, 0.32, 'interactive', { ry: Math.PI / 4 });
    g.add('pyramid', 0, 0.17, 0, 0.32, 0.17, 0.32, 'interactive', { rx: Math.PI, ry: Math.PI / 4 });
    actors.push(actor('pickup', '几何碎片', p, 0.65, g.id));
  }

  // ---- ② 彭罗斯楼梯（前左，悬空）：14 块，每块 1 × 1.2 × 1（顶上一片浅色台面），第 k 块顶面 = 1.6 + 4k/14；
  //      平面走位：−x 1、+z 5、+x 6、−z 1，接缝那步 −x（从近走向远）。平面漂移 (4, 4) = 总升高 4，所以绕一圈在画面上正好接回第一级
  {
    const moves: [number, number][] = [[-1, 0], ...Array(5).fill([0, 1]), ...Array(6).fill([1, 0]), [0, -1]];
    const N = 14, rise = 4 / N;
    let x = -4.5, z = 1.0;
    const pid = id++;
    for (let k = 0; k < N; k++) {
      const top = 1.6 + rise * k;
      box(x - 0.5, x + 0.5, top - 1.2, top - 0.1, z - 0.5, z + 0.5, k % 2 ? 'structure' : 'stone', pid, { args: [0] });
      box(x - 0.5, x + 0.5, top - 0.1, top, z - 0.5, z + 0.5, 'paper', pid, { args: [0] });
      blk(x - 0.55, x + 0.55, z - 0.55, z + 0.55);
      if (k < N - 1) { x += moves[k][0]; z += moves[k][1]; }
    }
    // 第一级上的小旗（「起点」记号）+ 最低几级下面的细柱
    b.withId(id++).box(-4.5, 1.6, 1.0, 0.05, 1.1, 0.05, 'trim', { args: [0] }).box(-4.35, 2.4, 1.0, 0.3, 0.24, 0.03, 'accent', { args: [0], noOutline: true });
    for (const [px, pz] of [[-5.5, 1.0], [-5.5, 3.0]]) box(px - 0.12, px + 0.12, 0, 1.0, pz - 0.12, pz + 0.12, 'structure', id++, { args: [0] });
  }

  // ---- 底座右沿的拱廊：三道拱
  for (let k = 0; k < 3; k++) {
    const z = 0.6 + k * 2.1;
    I.archFrame(b.withId(id++).at(6.4, 0, z - 4.2, Math.PI / 2), 1.8, 2.4, 'structure');
    blk(5.9, 6.9, z - 5.4, z - 3.0);
  }

  // ---- 角色：图腾（NPC，黄色石柱 + 一对眼睛）、乌鸦人（敌人），天上几块浮着的小方块
  {
    const x = -1.8, z = -1.6;
    const g = b.withId(id++).at(x, 0, z, Math.PI / 4);
    g.box(0, 0, 0, 0.7, 1.7, 0.7, 'sand', { args: [0.1] });
    g.box(0, 1.7, 0, 0.85, 0.12, 0.85, 'trim', { args: [0] });
    for (const s2 of [-1, 1]) g.box(s2 * 0.16, 1.15, 0.36, 0.13, 0.16, 0.03, 'ink', { noOutline: true, args: [0] });
    actors.push(actor('npc', '图腾', [x, 0, z], 1.8, g.id));
    blk(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
  }
  {
    const x = 1.2, z = 1.0;
    const g = b.withId(id++).at(x, 0, z, Math.PI * 0.85);
    g.add('cylinder', 0, 0.4, 0, 0.5, 0.8, 0.5, 'ink', { args: [0.55] });
    g.ball(0, 0.92, 0, 0.2, 0.2, 0.2, 'ink');
    g.add('pyramid', 0, 0.92, 0.26, 0.1, 0.24, 0.1, 'sand', { rx: Math.PI / 2 });
    for (const s2 of [-1, 1]) g.ball(s2 * 0.08, 0.98, 0.15, 0.035, 0.035, 0.02, 'paper', { noOutline: true });
    actors.push(actor('enemy', '乌鸦人', [x, 0, z], 1.15, g.id));
    blk(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
  }
  for (const [x, y, z, s2] of [[-10, 7, 2, 0.7], [9, 9, -7, 0.55]] as [number, number, number, number][]) {
    box(x - s2 / 2, x + s2 / 2, y - s2 / 2, y + s2 / 2, z - s2 / 2, z + s2 / 2, I.pick(['structure', 'paper', 'roof'] as Role[], I.hash2(x, z)), id++, { args: [0] });
  }

  const start: [number, number, number] = [-0.4, 0, 3.2];
  const V = 18;
  return {
    items, actors,
    dynamic: [characterAt(v, ...start)],
    lights: [{ pos: [bc[0] + 0.4, BTOP + 1, bc[2] - 0.5], color: '#FFE2A8', range: 5, intensity: 1.2, night: true }],
    ground: {
      heightAt: () => 0,
      inside: (x, z) => Math.abs(x) < BH - 0.4 && Math.abs(z) < BH - 0.4 && !blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e),
    },
    bounds: { center: [0, 2, 0], radius: 12 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI / 4,
    camera: { ...RIG_ILLUSION, viewSize: V, target: [0, 0.4, 0] },
  } satisfies SceneDesc;
});
