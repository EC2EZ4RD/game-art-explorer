import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';
import type { ActorKind, Item, SceneActor } from './types';

/*
 * 2D 场景的套件（docs/workbench-redesign.md §9.1，F 轨道）：
 *   人物与敌人的简单剪影（侧面、俯视都读得出）、拾取物、路标；
 *   flatten：把一组图元沿 z 压扁并搬到某个深度带（横版的远景是「压扁的图元」，不是贴图）。
 * 都是带颜色角色的图元，换配方（光滑 / 低模 / 体素、色板、描边）照常生效。
 */

/** 把一组图元压扁到 z = band 的薄片里：z 方向缩到 k 倍、位置按 (z − 原点) × k 搬过去 */
export function flatten(items: Item[], band: number, k = 0.3, z0 = 0): Item[] {
  return items.map((it) => ({ ...it, pos: [it.pos[0], it.pos[1], band + (it.pos[2] - z0) * k], scale: [it.scale[0], it.scale[1], Math.max(0.02, it.scale[2] * k)] }));
}

/** 村民 / 商人：长袍 + 头 + 帽，高约 1 */
export function npcFigure(b: B, robe: Role = 'cloth', hat: Role = 'trim') {
  b.add('cylinder', 0, 0.38, 0, 0.62, 0.76, 0.5, robe, { args: [0.55] });
  b.ball(0, 0.9, 0, 0.19, 0.2, 0.19, 'skin');
  b.add('cylinder', 0, 1.1, 0, 0.5, 0.07, 0.5, hat, { args: [1] });
  b.add('cylinder', 0, 1.2, 0, 0.24, 0.2, 0.24, hat, { args: [0.7] });
  b.ball(-0.07, 0.92, 0.17, 0.035, 0.045, 0.02, 'ink', { noOutline: true });
  b.ball(0.07, 0.92, 0.17, 0.035, 0.045, 0.02, 'ink', { noOutline: true });
}

/** 小怪：圆身子 + 发光眼 + 短腿（高约 0.7） */
export function crawler(b: B, body: Role = 'accent', s = 1) {
  b.ball(0, 0.38 * s, 0, 0.42 * s, 0.32 * s, 0.34 * s, body);
  b.add('pyramid', -0.16 * s, 0.68 * s, 0, 0.12 * s, 0.22 * s, 0.1 * s, body, { rz: 0.3 });
  b.add('pyramid', 0.16 * s, 0.68 * s, 0, 0.12 * s, 0.22 * s, 0.1 * s, body, { rz: -0.3 });
  b.ball(-0.12 * s, 0.44 * s, 0.28 * s, 0.07 * s, 0.08 * s, 0.05 * s, 'emissive', { noOutline: true });
  b.ball(0.12 * s, 0.44 * s, 0.28 * s, 0.07 * s, 0.08 * s, 0.05 * s, 'emissive', { noOutline: true });
  for (const x of [-0.26, -0.09, 0.09, 0.26]) b.add('cylinder', x * s, 0.08 * s, 0, 0.07 * s, 0.18 * s, 0.07 * s, 'ink', { args: [0.6] });
}

/** 大块头（Boss）：宽肩 + 角 + 发光胸口（高约 2.4 × s） */
export function brute(b: B, body: Role = 'accent', s = 1) {
  b.add('cylinder', -0.35 * s, 0.4 * s, 0, 0.36 * s, 0.8 * s, 0.36 * s, 'ink', { args: [0.8] });
  b.add('cylinder', 0.35 * s, 0.4 * s, 0, 0.36 * s, 0.8 * s, 0.36 * s, 'ink', { args: [0.8] });
  b.ball(0, 1.35 * s, 0, 0.8 * s, 0.7 * s, 0.55 * s, body);
  b.ball(0, 2.0 * s, 0.05 * s, 0.34 * s, 0.32 * s, 0.32 * s, body);
  b.add('pyramid', -0.3 * s, 2.35 * s, 0, 0.16 * s, 0.42 * s, 0.14 * s, 'trim', { rz: 0.5 });
  b.add('pyramid', 0.3 * s, 2.35 * s, 0, 0.16 * s, 0.42 * s, 0.14 * s, 'trim', { rz: -0.5 });
  b.ball(0, 1.4 * s, 0.42 * s, 0.18 * s, 0.18 * s, 0.08 * s, 'emissive', { noOutline: true });
  b.ball(-0.12 * s, 2.05 * s, 0.3 * s, 0.06 * s, 0.05 * s, 0.03 * s, 'emissive', { noOutline: true });
  b.ball(0.12 * s, 2.05 * s, 0.3 * s, 0.06 * s, 0.05 * s, 0.03 * s, 'emissive', { noOutline: true });
  b.add('cylinder', -0.85 * s, 1.2 * s, 0, 0.28 * s, 1.1 * s, 0.28 * s, body, { rz: 0.35, args: [0.7] });
  b.add('cylinder', 0.85 * s, 1.2 * s, 0, 0.28 * s, 1.1 * s, 0.28 * s, body, { rz: -0.35, args: [0.7] });
}

/** 机甲（战棋我方单位）：方身 + 炮管 + 两条腿（高约 1.2） */
export function mech(b: B, hull: Role = 'metal', mark: Role = 'cloth') {
  for (const x of [-0.22, 0.22]) b.box(x, 0, 0, 0.2, 0.45, 0.3, 'ink', { args: [0.2] });
  b.box(0, 0.42, 0, 0.78, 0.5, 0.62, hull, { args: [0.25] });
  b.box(0, 0.42, 0.32, 0.5, 0.18, 0.04, mark, { noOutline: true });
  b.box(0, 0.92, -0.04, 0.42, 0.28, 0.42, hull, { args: [0.3] });
  b.box(0.06, 1.0, 0.18, 0.24, 0.08, 0.06, 'emissive', { noOutline: true });
  b.add('cylinder', 0.5, 0.78, 0.15, 0.12, 0.7, 0.12, 'metal', { rx: Math.PI / 2 });
}

/** 虫（战棋敌方）：分节的身子 + 六条腿 + 一对大颚 */
export function vek(b: B, body: Role = 'accent') {
  b.ball(0, 0.35, -0.3, 0.32, 0.26, 0.36, body);
  b.ball(0, 0.4, 0.12, 0.28, 0.26, 0.26, body);
  b.ball(0, 0.42, 0.42, 0.2, 0.18, 0.18, 'ink');
  for (const s of [-1, 1]) {
    b.add('pyramid', s * 0.12, 0.38, 0.62, 0.06, 0.26, 0.06, 'trim', { rx: Math.PI / 2, rz: s * 0.4 });
    for (const z of [-0.3, 0, 0.25]) b.add('cylinder', s * 0.34, 0.16, z, 0.05, 0.42, 0.05, 'ink', { rz: s * 0.9 });
  }
  b.ball(-0.08, 0.5, 0.56, 0.04, 0.04, 0.03, 'emissive', { noOutline: true });
  b.ball(0.08, 0.5, 0.56, 0.04, 0.04, 0.03, 'emissive', { noOutline: true });
}

/** 拾取物（经验宝石 / 金币）：发光的多面体，浮在地面上 */
export function gem(b: B, role: Role = 'emissive', s = 1) {
  b.add('pyramid', 0, 0.42 * s, 0, 0.22 * s, 0.28 * s, 0.22 * s, role);
  b.add('pyramid', 0, 0.2 * s, 0, 0.22 * s, 0.16 * s, 0.22 * s, role, { rx: Math.PI });
}

/** 路标 / 关卡出口（目标点） */
export function signpost(b: B) {
  b.cyl(0, 0, 0, 0.06, 1.5, 'wood');
  b.box(0.18, 1.0, 0, 0.7, 0.3, 0.06, 'wood', { args: [0.1] });
  b.box(0.18, 1.08, 0.04, 0.5, 0.08, 0.02, 'paper', { noOutline: true });
  b.ball(0, 1.58, 0, 0.1, 0.1, 0.1, 'interactive');
}

/** 草丛（一簇细锥），前景剪影、俯视草地都用 */
export function grassTuft(b: B, rng: Rng, s = 1, role: Role = 'foliage') {
  const n = 4 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const x = (rng() - 0.5) * 0.5 * s, h = (0.35 + rng() * 0.45) * s;
    b.add('cylinder', x, h / 2, (rng() - 0.5) * 0.2 * s, 0.07 * s, h, 0.07 * s, role, { args: [0], rz: (rng() - 0.5) * 0.6, sway: 0.8, noOutline: true });
  }
}

/** 记下一个场景角色（HUD 的世界挂点优先用它们）：pos 是脚底，height 是身高 */
export const actor = (kind: ActorKind, label: string, pos: [number, number, number], height: number, id?: number): SceneActor => ({ kind, label, pos, height, id });
