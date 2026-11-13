import { RIG_TACTICS } from '../../../content/sceneCatalog';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import * as K from '../kits2';
import { actor, mech, vek } from '../kits2d';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf } from '../sceneUtil';
import type { SceneActor, Item, SceneDesc } from '../types';

/*
 * 战棋棋盘 tacticsBoard（docs/workbench-redesign.md §9.1，陷阵之志一类）：
 * 悬空的 8 × 8 棋盘，每格一块（格与格之间留一道缝，网格本身就读得出来）：草地 / 沙地 / 水 / 山 / 建筑 / 树林；
 * 我方机甲（玩家 + 两台友方）、敌方虫群，红色的攻击预警格；镜头正交二等距 30°、方位 45、固定。
 * 格子 { origin, cell, axes, size } 导出给 HUD（SceneDesc.grid → 引擎每帧投到画面上 → WorldView.grid），移动范围按它对齐地面。
 */

const N = 8, C = 1.25;
type T = 'grass' | 'sand' | 'water' | 'mountain' | 'building' | 'forest';

registerSceneBuilder('tacticsBoard', (ctx) => {
  const v = ctx.values, rng = ctx.rng, shape = shapeOf(v);
  const items: Item[] = [];
  const b = new B(items, 3);
  // 格 (i, j) 的中心：i 沿 +x、j 沿 +z，棋盘居中
  const cx = (i: number) => (i - (N - 1) / 2) * C, cz = (j: number) => (j - (N - 1) / 2) * C;
  // ---- 地形：固定的骨架（玩家起点一侧空出来）+ 按种子撒几格
  const map: T[] = new Array(N * N).fill('grass');
  const setT = (i: number, j: number, t: T) => { map[j * N + i] = t; };
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [6, 7], [7, 7], [7, 6]]) setT(i, j, 'water');
  for (const [i, j] of [[5, 1], [2, 6]]) setT(i, j, 'mountain');
  for (const [i, j] of [[3, 3], [4, 2], [6, 4], [1, 4]]) setT(i, j, 'building');
  for (const [i, j] of [[6, 1], [7, 2]]) setT(i, j, 'forest');
  for (let k = 0; k < 7; k++) { const i = Math.floor(rng() * N), j = Math.floor(rng() * N); if (map[j * N + i] === 'grass') setT(i, j, 'sand'); }
  const at = (i: number, j: number): T => map[j * N + i];
  // ---- 棋盘底座：一块厚岩（悬空的岛），格子一块块摆在上面，留 0.05 的缝
  b.withId(2).box(0, -1.9, 0, N * C + 0.3, 1.6, N * C + 0.3, 'rock', { args: [0.04] });
  b.withId(2).add('pyramid', 0, -2.9, 0, N * C * 0.9, 2.2, N * C * 0.9, 'rock', { rx: Math.PI });
  const gap = 0.06;
  let id = 10;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = at(i, j), x = cx(i), z = cz(j);
    const top = t === 'water' ? -0.28 : t === 'mountain' ? 0.08 : 0;
    const role: Role = t === 'water' ? 'water' : t === 'sand' ? 'sand' : t === 'mountain' ? 'rock' : (i + j) % 2 ? 'grass' : 'highland';
    // 每格一个物体编号：格与格之间出边线（网格）；水格不描外壳
    items.push({ prim: 'box', args: [0.08], pos: [x, (top - 0.3) / 2, z], scale: [C - gap, top + 0.3, C - gap], role, id: id++, noOutline: t === 'water' });
    const g = b.withId(id++).at(x, top, z);
    if (t === 'mountain') { g.add('poly', 0, 0.55, 0, C * 0.85, 1.1, C * 0.8, 'rock', { args: [0] }); g.add('pyramid', 0.1, 1.15, 0, C * 0.4, 0.5, C * 0.4, 'snow'); }
    else if (t === 'building') {
      const h = 0.9 + rng() * 0.7;
      g.box(0, 0, 0, C * 0.7, h, C * 0.7, 'structure', { args: [0.05] });
      g.box(0, h, 0, C * 0.74, 0.12, C * 0.74, 'roof', { args: [0.05] });
      for (let k = 0; k < 3; k++) g.box(-C * 0.22 + k * C * 0.22, h * 0.45, C * 0.355, C * 0.12, C * 0.12, 0.02, 'emissive', { noOutline: true });
    } else if (t === 'forest') { items.push(...parts.pineTree(x - 0.2, top, z - 0.15, 0.8, shape, rng, id++), ...parts.pineTree(x + 0.25, top, z + 0.2, 0.65, shape, rng, id++)); }
  }
  // ---- 单位：我方两台友方机甲 + 玩家（参数里的角色），敌方三只虫 + 一只首领；两格攻击预警
  const actors: SceneActor[] = [];
  const unit = (i: number, j: number, f: (g: B) => void, kind: SceneActor['kind'], label: string, h: number, ry = 0) => {
    const g = b.withId(id++).at(cx(i), 0, cz(j), ry);
    f(g);
    actors.push(actor(kind, label, [cx(i), 0, cz(j)], h, g.id));
  };
  // 朝向：+z 是正面；镜头在 (+x, +z) 一侧，方位 π/4 让单位正面朝镜头
  const F = Math.PI / 4;
  unit(2, 2, (g) => mech(g, 'metal', 'cloth'), 'ally', '炮击机甲', 1.25, F);
  // 冲锋机甲站 (5, 5)：原来在 (4, 5)，正挡在玩家 (3, 4) 前面（整合修复 U#3 挪玩家后）
  unit(5, 5, (g) => mech(g, 'metal', 'interactive'), 'ally', '冲锋机甲', 1.25, F);
  unit(5, 3, (g) => vek(g, 'accent'), 'enemy', '萤火虫', 0.7, F + 0.6);
  unit(6, 6, (g) => vek(g, 'accent'), 'enemy', '甲虫', 0.7, F - 0.4);
  unit(3, 6, (g) => vek(g, 'cloth'), 'enemy', '蝎子', 0.7, F + 0.3);
  unit(7, 4, (g) => { vek(g, 'accent'); g.add('pyramid', 0, 0.85, 0.12, 0.3, 0.3, 0.3, 'emissive'); }, 'boss', '虫后', 0.9, F);
  for (const [i, j] of [[4, 3], [6, 5]]) b.withId(id++).box(cx(i), 0.005, cz(j), C * 0.84, 0.03, C * 0.84, 'accent', { args: [0], noOutline: true, flat: true });
  // 要保护的建筑（目标）
  actors.push(actor('objective', '电站', [cx(3), 0, cz(3)], 1.4));
  // 云海：棋盘下方飘的云（静止）
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; items.push(...parts.cloud(2 + rng(), shape, rng, 90 + k).map((it) => ({ ...it, pos: [it.pos[0] + Math.cos(a) * 9, it.pos[1] - 4.5, it.pos[2] + Math.sin(a) * 9] as [number, number, number] }))); }
  K.brazier(b.withId(id++).at(cx(3) + 0.5, 0, cz(3) + 0.45));
  const free = (i: number, j: number) => i >= 0 && j >= 0 && i < N && j < N && (at(i, j) === 'grass' || at(i, j) === 'sand') && !actors.some((a) => Math.abs(a.pos[0] - cx(i)) < 0.1 && Math.abs(a.pos[2] - cz(j)) < 0.1);
  // 玩家站 (3, 4)：离四条边都有 3 格以上，HUD 的移动范围（一次行动 3 格）整个落在棋盘上（整合修复 U#3：原来站 (2, 4)，范围从左上边画出棋盘）
  const start: [number, number, number] = [cx(3), 0, cz(4)];
  const V = 11.5;
  return {
    items, actors,
    dynamic: [characterAt(v, ...start)],
    lights: [{ pos: [cx(3) + 0.5, 1, cz(3) + 0.45], color: '#FF9A3D', range: 4, intensity: 1.4, night: true }],
    ground: {
      heightAt: () => 0,
      inside: (x, z) => free(Math.round(x / C + (N - 1) / 2), Math.round(z / C + (N - 1) / 2)),
    },
    grid: { origin: [cx(0), 0, cz(0)], cell: C, axes: [[1, 0, 0], [0, 0, 1]], size: [N, N] },
    bounds: { center: [0, -0.5, 0], radius: N * C * 0.8 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI / 4,
    // 内容框：整块棋盘（对角约 14.1 宽）在竖屏 / 4:3 下也装得下（审查修复 2）
    camera: { ...RIG_TACTICS, viewSize: V, target: [0, -0.3, 0], fit: { w: 15 } },
  } satisfies SceneDesc;
});
