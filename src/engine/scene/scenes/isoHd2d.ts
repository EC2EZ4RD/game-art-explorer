import { RIG_HD2D } from '../../../content/scenes25d/iso';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor, gem } from '../kits2d';
import * as I from '../kitsIso';
import * as J from '../kitsIso2';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt } from '../sceneUtil';
import type { Item, SceneActor, SceneDesc, SceneImage } from '../types';

/* ============================================================
 * HD-2D·小镇 hd2d-town（八方旅人 / 三角战略；技术补全 G，由 scenes/iso.ts 引入）
 * 一条东西向的卵石街：北边一排木筋墙房子（出挑的二层、陡屋顶、花箱、店招），中段一个小广场（水井、两个集市摊、钟楼），
 * 南边是矮石墙、木桶、花坛和树（离镜头最近，移轴会把它们糊掉），房后是树林、山坡和山上的城堡。
 * 人物都是程序画的像素小人（贴图四边形，往后仰到正对镜头）；玩家用场景推荐的像素精灵（HD-2D 细明暗）。
 * 镜头：透视 50mm、俯角 28°、方位 0，沿街跟拍（z 方向基本不动）。推荐值带移轴、辉光、傍晚的暖灯。
 * ============================================================ */

const PITCH = RIG_HD2D.pitch;

registerSceneBuilder('hd2d-town', (ctx) => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const images: SceneImage[] = [];
  const b = new B(items, 10);
  let id = 60;
  const actors: SceneActor[] = [];
  const lights: SceneDesc['lights'] = [];
  const blocked: [number, number, number, number][] = [];
  const blk = (x: number, z: number, w: number, d: number) => blocked.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  const X0 = -32, X1 = 32, ST0 = -1.6, ST1 = 2.6, PL0 = -7, PLX = 5;

  // ---- 地面：一整块草地 + 卵石街 + 北侧人行道 + 广场
  items.push({ prim: 'box', args: [0], pos: [0, -0.2, -15], scale: [140, 0.4, 90], role: 'grass', id: 2, flat: true, noOutline: true });
  J.cobbles(items, 3, X0, X1, ST0, ST1, 0.5);
  J.cobbles(items, 3, -PLX, PLX, PL0, ST0, 0.5);
  items.push({ prim: 'box', args: [0], pos: [0, 0.05, ST0 - 0.5], scale: [X1 - X0, 0.1, 1.0], role: 'stone', id: 4, flat: true, noOutline: true });

  // ---- 北侧的房子（正面朝街，留几条小巷）；广场段换成广场背后的钟楼和大屋
  const WALLS: Role[] = ['structure', 'paper', 'sand', 'structure'];
  const ROOFS: Role[] = ['roof', 'metal', 'trim', 'roof', 'metal'];
  const SIGNS: [number, Role, string][] = [[-12.5, 'sand', '旅店'], [9.5, 'accent', ''], [-20, 'cloth', '']];
  let x = X0 - 1;
  let k = 0;
  while (x < X1 + 2) {
    const w = 2.6 + I.hash2(k, 1) * 1.1, d = 2.4 + I.hash2(k, 2) * 0.6;
    const cxh = x + w / 2;
    if (cxh > -PLX - 1.2 && cxh < PLX + 1.2) { x = PLX + 0.5; k++; continue; }
    const sign = SIGNS.find(([sx]) => Math.abs(sx - cxh) < w / 2);
    J.timberHouse(b.withId(id++).at(cxh, 0, ST0 - 1.0 - d / 2), w, d, I.hash2(k, 3) < 0.55 ? 2 : 3, I.pick(WALLS, I.hash2(k, 4)), rng, { gable: k % 2 === 0, roof: I.pick(ROOFS, I.hash2(k, 5)), stoneBase: I.hash2(k, 6) < 0.4, sign: sign?.[1] });
    if (sign?.[2]) actors.push(actor('objective', sign[2], [cxh, 0.1, ST0 - 0.9], 2.2));
    x += w + 0.25 + I.hash2(k, 7) * 0.5;
    k++;
  }
  // 广场背后：钟楼（石砌方塔 + 尖顶）两侧各一栋大屋
  {
    const g = b.withId(id++).at(0, 0, PL0 - 2.2);
    g.box(0, 0, 0, 2.6, 6.2, 2.6, 'stone', { args: [0.03] });
    g.box(0, 6.2, 0, 2.9, 0.25, 2.9, 'trim', { args: [0.05] });
    g.add('pyramid', 0, 6.45 + 1.7, 0, 3.0, 3.4, 3.0, 'metal');
    g.ball(0, 6.45 + 3.55, 0, 0.12, 0.12, 0.12, 'sand');
    g.add('cylinder', 0, 5.0, 1.31, 1.1, 0.06, 1.1, 'paper', { rx: Math.PI / 2, args: [1] });
    g.add('torus', 0, 5.0, 1.33, 1.16, 1.16, 0.06, 'trim', { args: [0.08], noOutline: true });
    g.box(0, 5.0, 1.35, 0.06, 0.42, 0.03, 'ink', { noOutline: true, args: [0] }); g.box(0.16, 5.0, 1.35, 0.34, 0.06, 0.03, 'ink', { noOutline: true, args: [0] });
    g.box(0, 0, 1.31, 1.0, 1.7, 0.05, 'wood', { noOutline: true, args: [0] });
    g.add('cylinder', 0, 1.7, 1.31, 1.0, 0.05, 1.0, 'wood', { rx: Math.PI / 2, noOutline: true, args: [1] });
    for (const s of [-1, 1]) J.timberHouse(b.withId(id++).at(s * 3.6, 0, PL0 - 1.9), 3.4, 3.0, 3, s < 0 ? 'paper' : 'sand', rng, { gable: false, roof: s < 0 ? 'roof' : 'trim', stoneBase: true });
  }

  // ---- 广场：水井 + 两个集市摊 + 木箱
  J.well(b.withId(id++).at(0, 0.08, -4.3)); blk(0, -4.3, 1.4, 1.4);
  J.marketStall(b.withId(id++).at(-3.0, 0.08, -3.4), 2.0, 'accent', ['flower', 'sand', 'foliage'], rng); blk(-3.0, -3.4, 2.6, 1.3);
  J.marketStall(b.withId(id++).at(3.0, 0.08, -3.6, 0.15), 1.8, 'cloth', ['foliage', 'soil', 'sand'], rng); blk(3.0, -3.6, 2.4, 1.3);
  J.barrelStack(b.withId(id++).at(4.4, 0.08, -5.6), rng); blk(4.6, -5.6, 1.2, 0.8);
  J.barrelStack(b.withId(id++).at(-8.6, 0.1, ST0 - 0.4), rng); blk(-8.4, ST0 - 0.4, 1.2, 0.8);
  J.barrelStack(b.withId(id++).at(15.2, 0.1, ST0 - 0.4, 0.3), rng); blk(15.4, ST0 - 0.4, 1.2, 0.8);

  // ---- 南侧（离镜头最近的一排，移轴会把它们糊掉）：矮石墙 + 墙头的花，墙后是菜畦、木栅栏、草垛和树
  for (let sx = X0; sx < X1; sx += 6) {
    const len = 4.2 + I.hash2(sx, 1) * 1.2;
    b.withId(5).box(sx + len / 2, 0, ST1 + 0.95, len, 0.5, 0.42, 'stone', { args: [0.08] });
    b.withId(5).box(sx + len / 2, 0.5, ST1 + 0.95, len + 0.06, 0.08, 0.5, 'rock', { args: [0] });
    for (let f = 0; f < 5; f++) b.withId(6).ball(sx + 0.5 + (f * len) / 5, 0.62, ST1 + 0.95, 0.22, 0.16, 0.2, f % 2 ? 'flower' : 'foliage', { noOutline: true });
  }
  for (let sx = X0 + 1; sx < X1; sx += 7.5) {
    // 菜畦：一块翻过的土 + 两行菜
    const gx = sx + I.hash2(sx, 2) * 2;
    b.withId(id++).box(gx, 0, ST1 + 2.6, 3.2, 0.12, 1.6, 'soil', { args: [0] });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) b.withId(id - 1).ball(gx - 1.35 + c * 0.45, 0.2, ST1 + 2.2 + r * 0.75, 0.16, 0.13, 0.16, r ? 'foliage' : 'foliage2', { noOutline: true });
    for (let p = 0; p < 5; p++) b.withId(id).box(gx - 1.8 + p * 0.9, 0, ST1 + 3.6, 0.08, 0.6, 0.08, 'wood', { args: [0] });
    b.withId(id).box(gx, 0.42, ST1 + 3.6, 3.7, 0.07, 0.05, 'wood', { args: [0] });
    id++;
  }
  for (let t = 0; t < 12; t++) {
    const tx = X0 + 3 + t * 5.6 + (I.hash2(t, 3) - 0.5) * 2, tz = ST1 + 3.8 + I.hash2(t, 4) * 2.5;
    I.tree(b.withId(id++).at(tx, 0, tz), 2.4 + I.hash2(t, 5) * 1.2, t % 3 === 1 ? 'cone' : 'round', rng);
  }
  for (const lx of [-21, -14, -7, 0, 7, 14, 21]) {
    J.streetLantern(b.withId(id++).at(lx, 0.06, ST1 + 0.35, Math.PI));
    blk(lx, ST1 + 0.35, 0.4, 0.4);
    if (lights.length < 8) lights.push({ pos: [lx - 0.3, 1.7, ST1 + 0.35], color: '#FFB860', range: 5.5, intensity: 1.6, night: true });
  }
  lights.push({ pos: [0, 1.4, -4.3], color: '#FFB860', range: 5, intensity: 0.9, night: true });

  // ---- 房后：树林、山坡、山上的城堡；更远处的山
  for (let t = 0; t < 40; t++) {
    const tx = -40 + I.hash2(t, 7) * 80, tz = -11 - I.hash2(t, 8) * 12;
    I.tree(b.withId(id++).at(tx, 0, tz), 2.6 + I.hash2(t, 9) * 1.8, I.hash2(t, 10) < 0.45 ? 'cone' : 'round', rng);
  }
  for (const [hx, hz, hr, hh] of [[-16, -30, 16, 7], [12, -34, 20, 9], [-40, -36, 18, 8], [38, -30, 14, 6]] as [number, number, number, number][]) items.push({ prim: 'sphere', pos: [hx, 0, hz], scale: [hr * 2, hh * 2, hr * 1.3], role: 'highland', id: 7 });
  {
    const g = b.withId(id++).at(-16, 6.2, -30);
    g.box(0, 0, 0, 7, 2.6, 4, 'stone', { args: [0.03] });
    for (const [tx, tz, th] of [[-3.4, -1.6, 5.5], [3.4, -1.6, 4.6], [-3.4, 1.8, 4], [3.4, 1.8, 4.8], [0, 0, 7.5]] as [number, number, number][]) {
      g.cyl(tx, 0, tz, tx === 0 ? 1.2 : 0.85, th, 'stone', 1);
      g.add('cylinder', tx, th + 1.1, tz, tx === 0 ? 2.8 : 2.1, 2.2, tx === 0 ? 2.8 : 2.1, 'metal', { args: [0] });
    }
  }
  for (let m = 0; m < 5; m++) items.push({ prim: 'pyramid', pos: [-60 + m * 30, 8, -55 - I.hash2(m, 1) * 8], scale: [36, 18 + I.hash2(m, 2) * 8, 20], role: 'rock', id: 8 });

  // ---- 人物（程序画的像素小人）与道具
  const px = (key: string, p: J.PixelPerson, x: number, z: number, kind: SceneActor['kind'], label: string, flip = false) => {
    images.push(...J.pixelPerson(key, p, [x, 0.08, z], 1.12, PITCH, flip));
    actors.push(actor(kind, label, [x, 0.08, z], 1.12));
    blk(x, z, 0.5, 0.4);
  };
  px('villager', { hair: '#7a4a2a', skin: '#f2c29b', top: '#3f6fb5', bottom: '#2f5a99', dress: true, apron: true, hold: 'basket' }, -5.6, 0.6, 'npc', '村民');
  px('guard', { hair: '#3a2a22', skin: '#e9b48e', top: '#a33a3a', bottom: '#4a4f5a', head: 'helmet', hatColor: '#8e99a6', hold: 'spear' }, 1.9, -5.7, 'npc', '卫兵');
  px('merchant', { hair: '#5a4030', skin: '#f0bf96', top: '#5a7a3a', bottom: '#6b4a2e', head: 'hat', hatColor: '#7a3f2a', apron: true, beard: true }, -3.0, -4.35, 'npc', '商人');
  px('thief', { hair: '#2a2228', skin: '#d9a383', top: '#3b3346', bottom: '#2a2533', head: 'hood', hatColor: '#4a3f5c', hold: 'none', side: true }, 7.2, -0.9, 'enemy', '扒手', true);
  px('elder', { hair: '#cfcac0', skin: '#efc39e', top: '#7a5a8a', bottom: '#5a4068', dress: true, hold: 'staff', beard: true }, -16.5, 1.6, 'npc', '老人');
  images.push(J.pixelCat([4.45, 0.92, -5.4], PITCH, '#4a3a2c'));
  // 红宝箱（八方旅人的宝箱）+ 地上闪光的东西
  {
    const cx = -9.8, cz = ST0 - 0.55;
    const g = b.withId(id++).at(cx, 0.1, cz);
    g.box(0, 0, 0, 0.7, 0.36, 0.46, 'accent', { args: [0.15] });
    g.add('cylinder', 0, 0.38, 0, 0.46, 0.7, 0.46, 'accent', { rz: Math.PI / 2, args: [1] });
    for (const sx of [-0.24, 0.24]) g.box(sx, 0, 0, 0.07, 0.6, 0.48, 'interactive', { noOutline: true, args: [0] });
    g.box(0, 0.26, 0.24, 0.12, 0.14, 0.03, 'interactive', { noOutline: true, args: [0] });
    actors.push(actor('pickup', '宝箱', [cx, 0.1, cz], 0.6, g.id));
    blk(cx, cz, 0.8, 0.6);
    const s = b.withId(id++).at(10.5, 0.08, 1.4);
    gem(s, 'emissive', 0.6);
    actors.push(actor('pickup', '闪光的东西', [10.5, 0.08, 1.4], 0.4, s.id));
  }

  const start: [number, number, number] = [-1.2, 0.08, 0.9];
  const V = 8.5;
  return {
    items, images, actors, lights,
    dynamic: [characterAt(v, ...start)],
    ground: {
      heightAt: () => 0.08,
      inside: (x, z) => {
        const onStreet = x > X0 + 4 && x < X1 - 4 && z > ST0 - 0.7 && z < ST1 + 0.7;
        const onPlaza = x > -PLX + 0.4 && x < PLX - 0.4 && z > PL0 + 0.4 && z <= ST0;
        return (onStreet || onPlaza) && !blocked.some(([a, c, d, e]) => x > a && x < c && z > d && z < e);
      },
    },
    bounds: { center: [0, 1, -2], radius: 20 },
    viewSize: V,
    playerStart: start,
    playerFacing: Math.PI / 2,
    // 沿街跟拍：x 夹在街的两头（远处的房子与树林铺到 ±40），z 方向范围比画面小 → 画面中心钉在北侧街沿（上半是房子、下半是街）
    camera: { ...RIG_HD2D, viewSize: V, frameOffset: [0, 0.06], bounds: [X0 + 2, X1 - 2, -4.2, 0.6] },
  } satisfies SceneDesc;
});
