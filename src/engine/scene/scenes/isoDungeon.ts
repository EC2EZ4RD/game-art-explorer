import { RIG_ISO_DUNGEON } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor, brute, npcFigure } from '../kits2d';
import * as I from '../kitsIso';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc } from '../types';

/* ============================================================
 * 等距·地牢 iso-dungeon（Hades / Diablo / Bastion；技术补全 G，由 scenes/iso.ts 引入）
 * 悬在黑暗里的三间石室：起点间（商人、恩赐）—— 窄桥（尖刺陷阱）—— 大厅（石柱、中间的地面纹样、游魂 ×3 + 精英守卫、出口门）
 * —— 走廊 —— 宝物间（宝箱、陶罐）。离镜头远的两面（−x、−z）是高墙（壁柱、壁龛、垂旗、火盆），
 * 离镜头近的两面（+x、+z）切成矮墙（剖面），看得见室内；正交 38°、方位 45°，镜头跟着角色在地面上走。
 * ============================================================ */

type Rect = [number, number, number, number];

registerSceneBuilder('iso-dungeon', (ctx) => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 10);
  let id = 60;
  const actors: SceneActor[] = [];
  const lights: SceneDesc['lights'] = [];
  const blocked: Rect[] = [];
  const blk = (x: number, z: number, r: number) => blocked.push([x - r, x + r, z - r, z + r]);
  // ---- 地面：三间石室 + 桥 + 走廊（同一套石板，各自一个编号）
  const A: Rect = [-12, -4, -1, 7], BR: Rect = [-4, 0, 2, 4], H: Rect = [0, 11, -3, 8], CO: Rect = [6, 8, -6, -3], T: Rect = [3, 10, -11, -6];
  const walk: Rect[] = [A, BR, H, CO, T];
  const hx = (H[0] + H[1]) / 2, hz = (H[2] + H[3]) / 2;
  const flagRoom = (r: Rect, rid: number, pat: (i: number, j: number) => Role | null, found = 2.8) => I.flagstones(items, rid, r[0], r[1], r[2], r[3], 1, pat, found);
  flagRoom(A, 20, () => null);
  flagRoom(BR, 22, () => null, 1.2);
  flagRoom(CO, 24, () => null, 1.6);
  flagRoom(T, 26, (i, j) => (Math.abs(i - 3) + Math.abs(j - 2) <= 1 ? 'trim' : null));
  flagRoom(H, 28, () => null);
  // 大厅中间的圆徽（Hades 地面的金色镶嵌）
  I.floorSeal(b.withId(id++).at(hx, 0, hz), 3.1, 'trim', 'accent');
  // 深渊：很远的下面一整片墨色（Hades 的虚空），几点暗红的余烬
  items.push({ prim: 'box', args: [0], pos: [0, -9, 0], scale: [240, 0.2, 240], role: 'ink', id: 1, noOutline: true, flat: true });
  for (let k = 0; k < 14; k++) {
    const x = (I.hash2(k, 1) - 0.5) * 50, z = (I.hash2(k, 2) - 0.5) * 50;
    if (walk.some(([a, c, d, e]) => x > a - 3 && x < c + 3 && z > d - 3 && z < e + 3)) continue;
    items.push({ prim: 'sphere', pos: [x, -8.8, z], scale: [0.5 + I.hash2(k, 3), 0.1, 0.5 + I.hash2(k, 4)], role: 'accent', id: 9, noOutline: true, args: [0] });
  }

  // ---- 墙：后墙（−x、−z 两面）高，前墙（+x、+z）切成矮墙；留出门洞
  const wallX = (x0: number, x1: number, z: number, tall: boolean, banner?: Role) => { if (x1 - x0 > 0.3) I.dungeonWall(b.withId(id++).at((x0 + x1) / 2, 0, z), x1 - x0, tall, rng, { banner }); };
  const wallZ = (z0: number, z1: number, x: number, tall: boolean, banner?: Role) => { if (z1 - z0 > 0.3) I.dungeonWall(b.withId(id++).at(x, 0, (z0 + z1) / 2, Math.PI / 2), z1 - z0, tall, rng, { banner }); };
  // 起点间
  wallX(A[0] - 0.5, A[1] + 0.5, A[2] - 0.25, true, 'cloth');
  wallZ(A[2], A[3] + 0.5, A[0] - 0.25, true, 'cloth');
  wallX(A[0] - 0.5, A[1] + 0.5, A[3] + 0.25, false);
  wallZ(A[2] - 0.5, BR[2], A[1] + 0.25, false); wallZ(BR[3], A[3], A[1] + 0.25, false);
  // 大厅：北墙留出口门（x 1.6–3.4）与走廊口（x 6–8）；西墙留桥口（z 2–4）
  const DOORX = 2.5;
  wallX(H[0] - 0.5, DOORX - 1.3, H[2] - 0.25, true, 'accent');
  wallX(DOORX + 1.3, CO[0], H[2] - 0.25, true, 'accent');
  wallX(CO[1], H[1] + 0.5, H[2] - 0.25, true, 'accent');
  wallZ(H[2], BR[2], H[0] - 0.25, true, 'accent'); wallZ(BR[3], H[3] + 0.5, H[0] - 0.25, true, 'accent');
  wallX(H[0] - 0.5, H[1] + 0.5, H[3] + 0.25, false);
  wallZ(H[2] - 0.5, H[3], H[1] + 0.25, false);
  // 走廊：西墙高、东墙矮
  wallZ(CO[2] - 0.5, CO[3] - 0.5, CO[0] - 0.25, true);
  wallZ(CO[2], CO[3] - 0.5, CO[1] + 0.25, false);
  // 宝物间
  wallX(T[0] - 0.5, T[1] + 0.5, T[2] - 0.25, true, 'roof');
  wallZ(T[2], T[3] + 0.5, T[0] - 0.25, true, 'roof');
  wallZ(T[2] - 0.5, T[3] + 0.5, T[1] + 0.25, false);
  wallX(T[0] - 0.5, CO[0], T[3] + 0.25, false); wallX(CO[1], T[1] + 0.5, T[3] + 0.25, false);
  // 桥两边的矮栏
  for (const z of [BR[2] - 0.12, BR[3] + 0.12]) b.withId(id++).box((BR[0] + BR[1]) / 2, 0.08, z, BR[1] - BR[0], 0.3, 0.16, 'stone', { args: [0.1] });

  // ---- 出口门（目标）：大厅北墙上，门楣悬着奖励的圆徽
  I.rewardDoor(b.withId(id++).at(DOORX, 0.08, H[2] - 0.35), 1.8, 2.6, 'interactive');
  actors.push(actor('objective', '出口', [DOORX, 0.08, H[2] + 0.3], 2.6));

  // ---- 石柱：大厅后排两根整柱、前排两根断柱（前排高了会挡住大厅）
  for (const [x, z, br] of [[H[0] + 2, H[2] + 1.6, false], [H[1] - 1.8, H[2] + 1.6, false], [H[0] + 1.4, H[3] - 1.4, true]] as [number, number, boolean][]) {
    I.pillar(b.withId(id++).at(x, 0.08, z), 3.0, br);
    blk(x, z, 0.55);
  }
  // 前排只留碎石（高了会挡住大厅）
  for (let k = 0; k < 4; k++) b.withId(id).add('poly', H[1] - 1.6 + I.hash2(k, 1) * 0.9, 0.2, H[3] - 1.4 + I.hash2(k, 2) * 0.6, 0.35 + I.hash2(k, 3) * 0.3, 0.25, 0.3 + I.hash2(k, 4) * 0.3, 'structure', { args: [1], ry: k });
  id++;
  // ---- 火盆（夜里的光：最多 8 盏）
  const braz = (x: number, z: number) => { I.brazierIso(b.withId(id++).at(x, 0.08, z)); blk(x, z, 0.4); if (lights.length < 8) lights.push({ pos: [x, 1.4, z], color: '#FF8A3D', range: 6.5, intensity: 1.8 }); };
  braz(A[0] + 1, A[2] + 1); braz(A[1] - 1.2, A[2] + 1);
  braz(H[0] + 1, H[2] + 1); braz(DOORX + 1.9, H[2] + 0.9); braz(H[1] - 1, H[2] + 1); braz(H[1] - 1.1, H[3] - 1.1);
  braz(T[0] + 1, T[2] + 1); braz(T[1] - 1, T[2] + 1);

  // ---- 陷阱：桥上一排尖刺（中间那块刺伸出来），大厅里两块（一块伸出、一块缩着）
  for (let k = 0; k < 3; k++) I.spikeTrap(b.withId(id++).at(BR[0] + 0.7 + k * 1.3, 0.08, (BR[2] + BR[3]) / 2), 1.1, k === 1);
  I.spikeTrap(b.withId(id++).at(H[1] - 3, 0.08, H[3] - 2), 1.0, true);
  I.spikeTrap(b.withId(id++).at(H[1] - 4.1, 0.08, H[3] - 2), 1.0, false);

  // ---- 敌人：游魂 ×3 + 精英守卫（Boss），站在大厅里朝着桥口
  const face = (x: number, z: number) => Math.atan2(BR[1] - x, (BR[2] + BR[3]) / 2 - z);
  for (const [x, z, label] of [[hx - 1.6, hz + 1.8, '游魂'], [hx + 2.2, hz - 1.2, '游魂'], [hx + 3, hz + 2.6, '游魂']] as [number, number, string][]) {
    const g = b.withId(id++).at(x, 0.08, z, face(x, z));
    I.wretch(g, 'accent');
    actors.push(actor('enemy', label, [x, 0.08, z], 1.25, g.id));
  }
  {
    const x = hx + 0.6, z = H[2] + 2.6;
    const g = b.withId(id++).at(x, 0.08, z, face(x, z));
    brute(g, 'accent', 0.62);
    g.add('box', 0.62, 1.0, 0.2, 0.1, 1.4, 0.16, 'metal', { rz: -0.3 });
    actors.push(actor('boss', '精英守卫', [x, 0.08, z], 1.6, g.id));
    blk(x, z, 0.7);
  }
  // ---- 起点间：商人（NPC）+ 恩赐（拾取物，发光的球悬在石台上）+ 陶罐
  {
    const nx = A[0] + 1.8, nz = A[2] + 2.6;
    const g = b.withId(id++).at(nx, 0.08, nz, Math.PI * 0.4);
    npcFigure(g, 'trim', 'ink');
    g.cyl(0.5, 0, 0.1, 0.03, 1.3, 'wood');
    g.box(0.5, 1.22, 0.1, 0.16, 0.2, 0.16, 'emissive', { noOutline: true, args: [0] });
    actors.push(actor('npc', '商人', [nx, 0.08, nz], 1.3, g.id));
    blk(nx, nz, 0.5);
    const px = A[0] + 2.2, pz = A[3] - 2;
    const p = b.withId(id++).at(px, 0.08, pz);
    p.cyl(0, 0, 0, 0.4, 0.7, 'stone', 0.8);
    p.ball(0, 1.05, 0, 0.24, 0.24, 0.24, 'interactive');
    p.ball(0, 1.05, 0, 0.13, 0.13, 0.13, 'emissive', { noOutline: true, args: [0] });
    actors.push(actor('pickup', '恩赐', [px, 0.08, pz], 1.3, p.id));
    blk(px, pz, 0.45);
    for (const [x, z] of [[A[0] + 0.7, A[3] - 0.7], [A[0] + 1.3, A[3] - 0.6], [A[1] - 0.8, A[2] + 2.2]]) { I.urn(b.withId(id++).at(x, 0.08, z), 0.9 + I.hash2(x, z) * 0.3); blk(x, z, 0.3); }
  }
  // ---- 宝物间：宝箱 + 一堆金币 + 陶罐
  {
    const x = (T[0] + T[1]) / 2, z = T[2] + 2.2;
    const cid = id++;
    items.push(...parts.chest(x, 0.08, z, 0, cid));
    actors.push(actor('pickup', '宝箱', [x, 0.08, z], 0.6, cid));
    blk(x, z, 0.5);
    for (let k = 0; k < 6; k++) b.withId(id).add('cylinder', x + 0.7 + I.hash2(k, 5) * 0.5, 0.1 + k * 0.035, z + 0.3 - I.hash2(k, 6) * 0.4, 0.26, 0.03, 0.26, 'interactive', { noOutline: k < 5 });
    id++;
    for (const [ux, uz] of [[T[0] + 0.7, T[3] - 0.7], [T[1] - 0.7, T[2] + 0.8], [T[1] - 1.3, T[2] + 0.7]]) { I.urn(b.withId(id++).at(ux, 0.08, uz), 1 + I.hash2(ux, uz) * 0.3, 'wood'); blk(ux, uz, 0.3); }
  }

  const start: [number, number, number] = [A[1] - 1.8, 0.08, 3.0];
  const V = 13;
  return {
    items, actors, lights,
    dynamic: [characterAt(v, ...start)],
    ground: {
      heightAt: () => 0.08,
      inside: (x, z) => walk.some(([a, c, d, e]) => x > a + 0.3 && x < c - 0.3 && z > d + 0.3 && z < e - 0.3) && !blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e),
    },
    bounds: { center: [0, 0, -1], radius: 16 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI / 2,
    // 跟拍不夹地面范围：方位 45° 时引擎按 x / z 轴夹的范围会把镜头钉死；石室外本来就是设计好的深渊
    camera: { ...RIG_ISO_DUNGEON, viewSize: V },
  } satisfies SceneDesc;
});
