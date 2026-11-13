// 技术补全（2026-10-23）H·纸艺与剧场 轨道的场景构建器：registerSceneBuilder（元数据在 content/scenes25d/paper.ts）
import * as THREE from 'three';
import { RIG_BRAWL, RIG_PAPER, RIG_PUPPET, RIG_SCROLL, RIG_SILHOUETTE, RIG_STAGE } from '../../../content/scenes25d/paper';
import type { Role } from '../../../content/roles';
import { registerEngineExt } from '../../engineExt';
import { B, cnHall } from '../kits';
import { car } from '../kits2';
import { actor, brute, flatten, npcFigure } from '../kits2d';
import { facade, graffiti, hydrant, neonSign, oilDrum, streetLight, thug, trashCan, woodCrate } from '../kitsBrawl';
import {
  Flat, hangString, paperBush, paperCloud, paperCoin, paperFence, paperFern, paperFlower, paperGoon, paperGrassEdge, paperHero, paperHill,
  paperHouse, paperMountain, paperOpts, paperStand, paperSun, paperTree, paperVillager, placeGroup, type V3,
} from '../kitsPaper';
import { registerSceneBuilder } from '../sceneRegistry';
import { drawScreen, LEATHER, puppetImages, rodImage, SCREEN_GROUND } from '../kitsPuppet';
import { cargoBoat, cityGate, person, rainbowBridge, roundTree, sedan, streetShop, willow } from '../kitsScroll';
import { drawBackdrop, drawWingTree, gatheredDrape, valance } from '../kitsStage';
import { chest } from '../parts';
import { characterAt, heightTextureFrom } from '../sceneUtil';
import type { BuildCtx, Item, SceneActor, SceneDesc, SceneEmitter, SceneImage, SceneLayer } from '../types';

/* ======================== 纸片·剧场（Paper Mario / Tearaway） ======================== */

/*
 * 纸板台上立着一排排有厚度的纸片（z 从前往后）：
 *   前景 z = +2.6：矮草边、花（不挡走道）；台口 z = +3.6：草皮纸的锯齿边搭在纸板台的正面上；
 *   走道 z = 0：主角（双面纸片人）、纸箱台阶、小怪、金币；
 *   近排 z ≈ −1.4：灌木、栅栏、花、路牌；村子 z ≈ −3：纸房子、纸树；
 *   山丘 z ≈ −6 ~ −7：半圆纸片三层错开（每层相隔 0.4–0.5，前一层的影子落在后一层上）；
 *   远山 z ≈ −10；挂在线上的云 z ≈ −8.5、太阳 z ≈ −11.5；天幕 z = −13.5（两层天色 + 一排扇贝边）。
 * 每张纸片微微后仰、扭一点点（rx / ry 随机），受光各不相同——读得出是一张张纸。立着的纸片背后有斜撑、脚前有折出来的粘贴片。
 */
const P_VIEW = 7.5;
const P_LEVEL: [number, number] = [-26, 26];
/** 布景铺多宽：21:9、拉远 0.75 倍时天幕上看到的范围 */
const P_SPAN = 56;

interface Step { x0: number; x1: number; h: number }

registerSceneBuilder('paper-theater', (ctx: BuildCtx): SceneDesc => {
  const rng = ctx.rng, o = paperOpts(ctx.values);
  const items: Item[] = [];
  let id = 10;
  const lean = (k = 1): V3 => [-(0.03 + rng() * 0.08) * k, (rng() - 0.5) * 0.16 * k, 0];
  /** 立一张纸片：卡面原点（脚底中点）放在 (x, 0, z)，微微后仰；h > 0 时背后加斜撑 + 脚前粘贴片 */
  const stand = (f: Flat, x: number, z: number, h: number, w = 0.5, y = 0, k = 1) => {
    items.push(...f.place([x, y, z], lean(k)));
    if (h > 0) paperStand(items, o, f.id, x, z, h, w);
  };

  // ---- 纸板台：顶上一张草皮纸，正面是瓦楞纸板（一道道横纹），草皮纸的锯齿边搭在正面上
  const ZF = 3.0, ZB = -15;
  items.push({ prim: 'box', args: [0], pos: [0, -7.03, (ZF + ZB) / 2], scale: [P_SPAN * 2, 13.94, ZF - ZB], role: 'wood', id: 1, flat: true });
  items.push({ prim: 'box', args: [0], pos: [0, -0.03, (ZF + ZB) / 2 + 0.02], scale: [P_SPAN * 2, 0.06, ZF - ZB + 0.04], role: 'grass', id: 1, flat: true });
  // 走道：一条浅色纸带，两边是一串圆片拼出的扇贝边（剪刀沿着碗口剪的那种边）
  items.push({ prim: 'box', args: [0], pos: [0, 0.006, 0], scale: [P_SPAN * 2, 0.012, 1.5], role: 'path', id: 4, flat: true });
  for (let x = -P_SPAN; x < P_SPAN; x += 0.85) for (const side of [-1, 1]) {
    const r = 0.36 + rng() * 0.12;
    items.push({ prim: 'cylinder', args: [1], pos: [x + rng() * 0.3, 0.006, side * (0.75 - r * 0.45)], scale: [r * 2, 0.012, r * 2], role: 'path', id: 4, flat: true, noOutline: true });
  }
  for (let k = 0; k < 14; k++) items.push({ prim: 'box', args: [0], pos: [0, -0.55 - k * 0.42, ZF + 0.012], scale: [P_SPAN * 2, 0.07, 0.03], role: 'trunk', id: 1, noOutline: true, flat: true });
  for (let x = -P_SPAN; x < P_SPAN; x += 4) items.push(...paperGrassEdge(o, 1, 4.1, 0.32, rng, 'grass').place([x + 2, 0.02, ZF + 0.03], [Math.PI - 0.25, 0, 0]));

  // ---- 走道上的纸箱台阶（自动跳上去）
  const steps: Step[] = [{ x0: 8.6, x1: 10.6, h: 0.8 }, { x0: 15.2, x1: 16.8, h: 0.8 }, { x0: 16.8, x1: 18.2, h: 1.6 }];
  for (const s of steps) {
    const w = s.x1 - s.x0;
    items.push({ prim: 'box', args: [0], pos: [(s.x0 + s.x1) / 2, s.h / 2, -0.1], scale: [w, s.h, 1.3], role: 'wood', id: 3, flat: true });
    items.push({ prim: 'box', args: [0], pos: [(s.x0 + s.x1) / 2, s.h - 0.005, -0.1], scale: [0.32, 0.03, 1.32], role: 'paper', id: 3, noOutline: true, flat: true });
    items.push({ prim: 'box', args: [0], pos: [(s.x0 + s.x1) / 2, s.h * 0.55, 0.56], scale: [0.32, s.h * 0.9, 0.02], role: 'paper', id: 3, noOutline: true, flat: true });
    items.push({ prim: 'wedge', pos: [(s.x0 + s.x1) / 2 - w * 0.28, s.h * 0.5, 0.56], rot: [0, 0, -Math.PI / 2], scale: [0.22, 0.2, 0.02], role: 'trunk', id: 3, noOutline: true, flat: true });
  }
  const heightAt = (x: number) => steps.find((s) => x >= s.x0 && x < s.x1)?.h ?? 0;

  // ---- 前景（z = +2.6）：矮草、花；起点一屏里少放
  for (let x = P_LEVEL[0] - 14; x < P_LEVEL[1] + 14; x += 2.2 + rng() * 2.6) {
    if (Math.abs(x) < 2.5) continue;
    if (rng() < 0.6) stand(paperGrassEdge(o, id++, 0.9 + rng() * 0.8, 0.28 + rng() * 0.18, rng, rng() < 0.5 ? 'grass' : 'foliage'), x, 2.1 + rng() * 0.3, 0, 0.4, 0, 0.5);
    else stand(paperFlower(o, id++, 0.32 + rng() * 0.14, rng() < 0.5 ? 'flower' : 'accent'), x, 2.2, 0, 0.3, 0, 0.5);
  }
  // 卷边的大蕨叶（前景，上半截往镜头这边卷过来）：起点一屏外才有，免得挡住主角
  for (const x of [-15.5, -8.6, 9.8, 19.5, 27]) items.push(...placeGroup(paperFern(o, id++, 1.5 + rng() * 0.6, 0.55 + rng() * 0.3, rng() < 0.5 ? 'foliage' : 'grass'), [x, 0, 2.35], [0, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.2]));

  // ---- 近排（z ≈ −1.4）：灌木、栅栏、花、路牌
  for (let x = -P_SPAN + 2; x < P_SPAN - 2; x += 2.4 + rng() * 2.2) {
    const z = -1.3 - rng() * 0.35, r = rng();
    if (r < 0.45) { const w = 1.2 + rng() * 1.4; stand(paperBush(o, id++, w, rng, rng() < 0.6 ? 'foliage' : 'foliage2'), x, z, 0.5, w * 0.4); }
    else if (r < 0.7) { const w = 1.6 + rng() * 1.2; stand(paperFence(o, id++, w), x, z, 0.45, w * 0.5); }
    else stand(paperFlower(o, id++, 0.5 + rng() * 0.3, rng() < 0.5 ? 'flower' : 'accent'), x, z + 0.4, 0, 0.3);
  }

  // ---- 村子一排（z ≈ −3）：纸房子与纸树交替
  for (let x = -P_SPAN + 3; x < P_SPAN - 3; x += 3.2 + rng() * 2.4) {
    const z = -2.8 - rng() * 0.6;
    if (rng() < 0.38 && Math.abs(x) < 32) {
      const w = 1.6 + rng() * 0.8, h = 1.3 + rng() * 0.8;
      stand(paperHouse(o, id++, w, h, rng() < 0.5 ? 'structure' : 'paper', rng() < 0.6 ? 'roof' : 'accent', rng), x, z, h * 0.7, w * 0.5);
    } else {
      const h = 2.3 + rng() * 1.4, pine = rng() < 0.35;
      stand(paperTree(o, id++, h, pine ? 'pine' : 'round', rng, pine ? 'foliage2' : 'foliage'), x, z, h * 0.5, 0.4);
    }
  }

  // ---- 山丘三层（z ≈ −6、−6.5、−7）：半圆纸片，下半截埋在台面以下
  const hillRoles: Role[] = ['grass', 'foliage', 'foliage2'];
  for (let layer = 0; layer < 3; layer++) {
    const z = -5.8 - layer * 0.5;
    for (let x = -P_SPAN - 2 + rng() * 3; x < P_SPAN + 2; x += 4 + rng() * 4) {
      const r = 2 + layer * 0.9 + rng() * 1.6;
      const role = hillRoles[(layer + Math.floor(rng() * 2)) % 3];
      const pat = rng() < 0.45 ? 'dots' : rng() < 0.5 ? 'stripes' : 'none';
      items.push(...paperHill(o, id++, r, role, layer === 1 ? 'flower' : 'highland', rng, pat).place([x, -0.4, z], lean(0.6)));
    }
  }
  // 彩虹（山丘后面）
  {
    const f = new Flat(o, id++);
    (['accent', 'emissive', 'grass', 'water'] as Role[]).forEach((r, k) => f.arc(0, 0, 5.2 - k * 0.42, 0.44, r, 0, Math.PI));
    items.push(...f.place([10, -0.2, -8.0], [-0.06, 0.05, 0]));
  }
  // ---- 远山（z ≈ −10）
  for (let x = -P_SPAN - 4 + rng() * 4; x < P_SPAN + 4; x += 6 + rng() * 5) {
    const w = 8 + rng() * 6, h = 5 + rng() * 4;
    items.push(...paperMountain(o, id++, w, h, rng() < 0.5 ? 'highland' : 'rock').place([x, -0.2, -10 - rng() * 0.8], lean(0.4)));
  }
  // ---- 吊在线上的云（z ≈ −8.5）与太阳（z = −11.5）
  for (let x = -P_SPAN + rng() * 5; x < P_SPAN; x += 7 + rng() * 6) {
    const y = 4.4 + rng() * 2, z = -8.4 - rng() * 0.6;
    items.push(...paperCloud(o, id, 2.2 + rng() * 1.4, rng).place([x, y, z], lean(0.5)));
    hangString(items, x - 0.6, y + 0.6, z - 0.08, 40, id);
    hangString(items, x + 0.7, y + 0.6, z - 0.08, 40, id++);
  }
  items.push(...paperSun(o, id, 1.3).place([-6, 7.6, -12.9], [0, 0, 0.1]));
  hangString(items, -6, 8.9, -13.0, 40, id++);
  // ---- 天幕（z = −13.5）：下面一层地平线色、上面一层天顶色，交界一排扇贝边
  items.push({ prim: 'box', args: [0], pos: [0, 2.4, -13.5], scale: [P_SPAN * 2.2, 8, 0.1], role: 'skyHorizon', id: 2, flat: true });
  items.push({ prim: 'box', args: [0], pos: [0, 24, -13.6], scale: [P_SPAN * 2.2, 36, 0.1], role: 'skyTop', id: 2, flat: true });
  for (let x = -P_SPAN * 1.1; x < P_SPAN * 1.1; x += 1.6) items.push({ prim: 'cylinder', args: [1], pos: [x, 6.3, -13.47], rot: [Math.PI / 2, 0, 0], scale: [1.7, 0.06, 1.7], role: 'skyHorizon', id: 2, flat: true });

  // ---- 场景角色：村民、小怪 ×2、飞来飞去的纸蝙蝠（吊线）、金币 ×3、终点旗
  const actors: SceneActor[] = [];
  const put = (f: Flat, x: number, z: number, kind: SceneActor['kind'], label: string, h: number, y = heightAt(x)) => {
    stand(f, x, z, h * 0.5, 0.4, y, 0.4);
    actors.push(actor(kind, label, [x, y, z], h, f.id));
  };
  put(paperVillager(o, id++, 1), -4.6, -0.45, 'npc', '村民', 1.05);
  put(paperGoon(o, id++, -1), 4.8, -0.3, 'enemy', '纸片怪', 0.78);
  put(paperGoon(o, id++, -1, 1.15, 'roof'), 13.2, -0.3, 'enemy', '纸片怪', 0.9);
  {
    // 纸蝙蝠：两片三角翅膀 + 圆身子，吊在线上
    const f = new Flat(o, id++, { border: true });
    f.tri(-0.32, 0, 0.6, 0.34, 'ink', { rz: 1.2 }).tri(0.32, 0, 0.6, 0.34, 'ink', { rz: -1.2 }).disc(0, 0, 0.2, 'ink').disc(-0.07, 0.04, 0.04, 'emissive', { lvl: 1, noOutline: true }).disc(0.07, 0.04, 0.04, 'emissive', { lvl: 1, noOutline: true });
    items.push(...f.place([20.5, 2.6, -0.4], [0, 0, 0.12]));
    hangString(items, 20.5, 2.8, -0.45, 40, f.id);
    actors.push(actor('enemy', '纸蝙蝠', [20.5, 2.3, -0.4], 0.6, f.id));
  }
  for (const [x, y] of [[2.6, 1.5], [9.6, 2.3], [17.5, 3.1]] as [number, number][]) {
    const f = paperCoin(o, id++);
    items.push(...f.place([x, y, -0.2], [0, 0.3, 0]));
    actors.push(actor('pickup', '金币', [x, y - 0.25, -0.2], 0.5, f.id));
  }
  {
    // 终点旗：旗杆 + 三角旗 + 底座
    const f = new Flat(o, id++, { border: true });
    f.rect(0, 0, 0.09, 2.6, 'trim').tri(0.38, 2.15, 0.42, 0.7, 'accent', { rz: -Math.PI / 2 }).disc(0, 2.62, 0.09, 'emissive').rect(0, 0, 0.6, 0.2, 'stone');
    stand(f, 23.6, -0.4, 1.4, 0.5);
    actors.push(actor('objective', '终点旗', [23.6, 0, -0.4], 2.7, f.id));
  }

  // ---- 灯：村口两盏纸灯笼（夜里亮）
  const lights: SceneDesc['lights'] = [];
  for (const x of [-7.5, 6.5]) {
    const f = new Flat(o, id++, { border: true });
    f.rect(0, 0, 0.07, 1.5, 'trunk').disc(0, 1.62, 0.2, 'emissive', { sy: 1.2 }).rect(0, 1.83, 0.22, 0.06, 'trim', { lvl: 1 });
    stand(f, x, -1.0, 0.8, 0.3);
    lights.push({ pos: [x, 1.6, -0.7], color: '#FFB25A', range: 5, intensity: 1.6, night: true });
  }

  return {
    items, lights, actors,
    // 自带身体（fixedBody）：纸片人不随 shape.character 重建成三维小人，角色载体精灵也不接管；'keepBob' 保留走路的上下颠（K 拆分后）
    dynamic: [{ kind: 'character', items: paperHero(o), origin: [0, 0, 0], fixedBody: 'keepBob' }],
    ground: { heightAt: (x) => heightAt(x), inside: (x) => x > P_LEVEL[0] + 0.5 && x < P_LEVEL[1] - 0.5 },
    map: { plane: 'xy', x: P_LEVEL, y: [-2, 8], solidAt: (x, y) => y <= heightAt(x) },
    bounds: { center: [0, 2, -5], radius: 34 },
    viewSize: P_VIEW,
    playerStart: [-1.5, 0, 0],
    playerFacing: Math.PI / 2,
    camera: { ...RIG_PAPER, viewSize: P_VIEW, target: [0, P_VIEW * (RIG_PAPER.frameOffset?.[1] ?? 0.25), 0], xRange: P_LEVEL, fit: { w: 7 }, shadowFollow: 18 },
  };
});



/* ======================== 皮影·戏台（中国皮影戏） ======================== */

/*
 * 正交平视、固定机位：木戏台框（红柱、横梁、帷幔、歇山顶、案板）围着一块从背后打亮的幕布。
 * 幕布 = 一张程序贴图（透光渐变、布纹、暗角），景片（亭子、松、山石、如意云、月）画在幕布上——半透明的彩色皮子、镂空透光；
 * 影人 = 分件的贴图四边形（头 / 身 / 裙 / 两臂 / 兵器各一张，按关节摆姿势），镂空处真的是空的，幕布的光从洞里透出来；
 * 三根签子（脖子一根、两手各一根）是幕布上的细暗线，伸到幕布下沿。贴图不受场景光（lit = 0）：背光透射的「自发光」质感，
 * 跟色板走的程度 recolor = 0.35（色板换得出冷暖，皮影的红绿黄还在）。
 */
const SCREEN = { cx: 0, cy: 4.6, w: 15.6, h: 8.4 };
registerSceneBuilder('shadow-puppet', (): SceneDesc => {
  const items: Item[] = [];
  const push = (prim: Item['prim'], pos: V3, scale: V3, role: Role, extra: Partial<Item> = {}) => items.push({ prim, pos, scale, role, id: extra.id ?? 3, args: prim === 'box' ? [0.15] : extra.args, ...extra });
  const top = SCREEN.cy + SCREEN.h / 2, bot = SCREEN.cy - SCREEN.h / 2, half = SCREEN.w / 2;
  // 背后一整面暗墙（任何比例都不露天色）
  push('box', [0, 4, -0.8], [240, 200, 0.2], 'ink', { id: 1, noOutline: true, args: [0] });
  // 柱：红漆柱身 + 石柱础 + 金色柱头
  for (const sx of [-1, 1]) {
    const x = sx * (half + 0.45);
    push('box', [x, (bot - 1.0 + top + 0.9) / 2, 0.3], [0.7, top + 0.9 - (bot - 1.0), 0.55], 'accent', { id: 4 });
    push('box', [x, bot - 0.75, 0.3], [1.0, 0.5, 0.75], 'stone', { id: 4 });
    push('box', [x, top + 0.55, 0.32], [0.95, 0.4, 0.7], 'trim', { id: 4 });
    // 柱上的楹联板（不写字：一条深色板 + 金边）
    push('box', [x, SCREEN.cy, 0.6], [0.42, 5.6, 0.06], 'wood', { id: 4 });
    push('box', [x, SCREEN.cy, 0.58], [0.5, 5.8, 0.04], 'trim', { id: 4, noOutline: true });
  }
  // 横梁 + 斗拱一排 + 歇山顶
  push('box', [0, top + 0.55, 0.36], [SCREEN.w + 2.4, 0.75, 0.7], 'wood', { id: 5 });
  for (let x = -half - 0.6; x <= half + 0.6; x += 0.9) push('box', [x, top + 1.08, 0.4], [0.42, 0.3, 0.5], 'trim', { id: 5 });
  push('box', [0, top + 1.32, 0.32], [SCREEN.w + 2.6, 0.2, 0.8], 'accent', { id: 5 });
  push('roof', [0, top + 2.6, 0.1], [SCREEN.w + 6.5, 2.4, 3.2], 'roof', { id: 6, args: [3, 1.8, 0.35] });
  // 帷幔：一排垂下来的半圆布（遮住幕布上沿）+ 金色流苏线
  for (let x = -half; x <= half + 0.01; x += 1.3) {
    push('cylinder', [x, top + 0.12, 0.66], [1.42, 0.08, 1.0], 'cloth', { id: 7, rot: [Math.PI / 2, 0, 0], args: [1] });
    push('cylinder', [x, top - 0.36, 0.7], [0.12, 0.28, 0.12], 'emissive', { id: 7, args: [0.4], noOutline: true });
  }
  push('box', [0, top + 0.12, 0.64], [SCREEN.w + 0.6, 0.62, 0.06], 'cloth', { id: 7 });
  push('box', [0, top - 0.17, 0.7], [SCREEN.w + 0.6, 0.06, 0.04], 'emissive', { id: 7, noOutline: true });
  // 案板（幕布下沿）+ 台口裙板（红底金框的三块板）+ 台面
  push('box', [0, bot + 0.02, 0.32], [SCREEN.w + 1.8, 0.5, 0.9], 'wood', { id: 8 });
  push('box', [0, bot - 1.15, 0.25], [SCREEN.w + 1.4, 1.9, 0.5], 'accent', { id: 8 });
  for (const x of [-SCREEN.w / 3, 0, SCREEN.w / 3]) { push('box', [x, bot - 1.15, 0.52], [SCREEN.w / 3 - 0.6, 1.4, 0.04], 'trim', { id: 8, noOutline: true }); push('box', [x, bot - 1.15, 0.54], [SCREEN.w / 3 - 0.85, 1.15, 0.04], 'wood', { id: 8, noOutline: true }); }
  push('box', [0, bot - 2.25, 0.6], [SCREEN.w + 4, 0.3, 1.6], 'wood', { id: 8 });
  // 灯笼（挂在梁两头外侧）与两侧垂幡
  const lights: SceneDesc['lights'] = [{ pos: [0, SCREEN.cy, -0.35], color: '#FFC46B', range: 11, intensity: 1.4 }];
  for (const sx of [-1, 1]) {
    const x = sx * (half + 1.55);
    push('cylinder', [x, top - 0.1, 0.5], [0.03, 1.2, 0.03], 'ink', { id: 9, args: [1], noOutline: true });
    push('sphere', [x, top - 1.1, 0.5], [0.9, 1.05, 0.9], 'accent', { id: 9 });
    push('cylinder', [x, top - 0.5, 0.5], [0.5, 0.16, 0.5], 'trim', { id: 9, args: [1] });
    push('cylinder', [x, top - 1.7, 0.5], [0.5, 0.16, 0.5], 'trim', { id: 9, args: [1] });
    push('cylinder', [x, top - 2.1, 0.5], [0.1, 0.6, 0.1], 'emissive', { id: 9, args: [0.2], noOutline: true });
    lights.push({ pos: [x, top - 1.1, 1.2], color: '#FF7A3C', range: 6, intensity: 1.6 });
    const bx = sx * (half + 2.6);
    push('box', [bx, top - 2.2, 0.2], [0.9, 6.2, 0.06], 'cloth', { id: 10 });
    push('box', [bx, top - 5.4, 0.22], [0.9, 0.25, 0.08], 'trim', { id: 10 });
    for (const k of [-0.3, 0, 0.3]) push('cylinder', [bx + k, top - 5.85, 0.22], [0.08, 0.6, 0.08], 'emissive', { id: 10, args: [0.3], noOutline: true });
  }

  // 台下：夯土地 + 几排看戏的人（长凳 + 后脑勺和肩膀的剪影），竖屏时画面下半截不空
  push('box', [0, bot - 13, 6], [240, 20.2, 14], 'trunk', { id: 11, args: [0], noOutline: true });
  for (let row = 0; row < 5; row++) {
    const z = 1.6 + row * 1.2, y = bot - 2.9 + row * 0.12;
    push('box', [0, y, z + 0.3], [SCREEN.w + 6, 0.12, 0.35], 'wood', { id: 12 });
    for (let x = -half - 2 + (row % 2) * 0.4; x <= half + 2; x += 0.85) {
      if (((x * 7.3 + row * 3.1) % 1 + 1) % 1 < 0.25) continue;
      push('sphere', [x, y + 0.75, z], [0.62, 0.55, 0.45], 'ink', { id: 13, noOutline: true });
      push('sphere', [x, y + 1.18, z], [0.3, 0.34, 0.3], 'ink', { id: 13, noOutline: true });
    }
  }
  // 戏台上方：一串串红灯笼（悬链），竖屏时画面上半截也有东西
  for (const [y0, sag] of [[top + 4.2, 0.8], [top + 6.4, 1.1]] as [number, number][]) {
    const P = (t: number): [number, number] => [-half - 3 + t * (SCREEN.w + 6), y0 - sag * 4 * t * (1 - t)];
    for (let k = 0; k <= 10; k++) {
      const [x, y] = P(k / 10);
      push('sphere', [x, y - 0.35, 0.6], [0.42, 0.5, 0.42], 'accent', { id: 14 });
      push('cylinder', [x, y - 0.08, 0.6], [0.2, 0.08, 0.2], 'trim', { id: 14, args: [1] });
      if (k < 10) {
        const [x1, y1] = P((k + 1) / 10), L = Math.hypot(x1 - x, y1 - y);
        push('cylinder', [(x + x1) / 2, (y + y1) / 2, 0.58], [0.03, L, 0.03], 'ink', { id: 14, args: [1], rot: [0, 0, Math.atan2(x - x1, y1 - y)], noOutline: true });
      }
    }
  }
  // ---- 幕布 + 影人 + 签子
  // 幕布从背后打亮（收尾 X）：少跟色板走（0.4 → 0.15，否则被拉成灰褐）、发光 1.5 倍（超出白点，开了辉光的配方泛出暖光）
  const images: SceneImage[] = [{ file: '', canvas: { key: 'puppet:screen:v2', w: 2048, h: Math.round((2048 * SCREEN.h) / SCREEN.w), draw: drawScreen }, pos: [SCREEN.cx, SCREEN.cy, 0], size: [SCREEN.w, SCREEN.h], anchor: 'center', lit: 0, recolor: 0.15, glow: 1.5, cut: 0.01, role: 'paper' }];
  // 影人站在景片的地平线上（SCREEN_GROUND），整体放大 1.35 倍：叙事 UI 的对话框盖住的是下面的皮子地面，影人身子露在外面
  const feet = top - SCREEN.h * SCREEN_GROUND, PS = 1.35;
  const hero = puppetImages({ key: 'hero', robe: LEATHER.red, trim: LEATHER.yellow, face: 'hollow', hat: 'helmet', weapon: 'spear' }, -1.6, feet, 0.03, 1, 0.92 * PS, [0.25, 1.05, -0.45], 0.25);
  const demon = puppetImages({ key: 'demon', robe: LEATHER.teal, trim: LEATHER.red, face: 'solid', faceColor: LEATHER.green, hat: 'horns', weapon: 'mace' }, 3.6, feet, 0.05, -1, 1.0 * PS, [0.5, 1.5, 0.35], 0.25);
  const lady = puppetImages({ key: 'lady', robe: LEATHER.green, trim: LEATHER.pink, face: 'hollow', hat: 'bun', weapon: 'fan' }, -5.4, feet, 0.04, 1, 0.84 * PS, [0.15, 1.9, 0.2], 0.25);
  for (const p of [hero, demon, lady]) {
    // 彩色皮子也是透光的：比幕布弱一点的发光
    for (const im of p.images) im.glow = 1.25;
    images.push(...p.images);
    const rods: [number, number][] = [p.neck, ...p.hands];
    rods.forEach(([rx, ry], k) => images.push(rodImage(rx, ry, rx + (k - 1) * 0.5 + 0.2, bot, 0.07)));
  }
  const actors: SceneActor[] = [
    actor('boss', '妖王', [3.6, feet, 0.05], 4.1 * PS),
    actor('npc', '小姐', [-5.4, feet, 0.04], 3.4 * PS),
    actor('objective', '亭子', [-4.7, feet, 0.02], 3.6),
  ];
  return {
    items, images, lights, actors,
    dynamic: [],
    bounds: { center: [0, 4.6, 0], radius: 13 },
    viewSize: 13,
    playerAnchor: [-1.6, feet, 0.03],
    camera: { ...RIG_PUPPET, viewSize: 13, target: [0, SCREEN.cy + 0.55, 0], fit: { w: 17.6 } },
  };
});

/* ======================== 卷轴·长街（清明上河图式的界画长卷） ======================== */

/*
 * 斜投影（斜二测）：镜头仍是正交平视，每帧在投影矩阵上乘一个错切——纵深每退 1，画面上往右、往上各挪 OBLIQUE_K（45°、缩短一半），
 * 没有近大远小，没有灭点，地面像界画那样「铺」进画面里；跟拍只沿 x 走，于是整条街从头到尾都是同一个角度（长卷的散点 / 多视点）。
 * 光照、阴影、雾、描边都按真实三维算（错切只在投影上），HUD 的挂点用同一个投影矩阵，所以对得上。
 * 从前到后（z 从大到小，画面上从下到上）：近岸柳树与小路 → 汴河（漕船）、虹桥 → 临河的街（主角、人流、伞摊、柳树）→
 * 临街铺面（一层 / 两层，悬山顶、凉棚、招牌、酒旗）→ 后排的大屋、寺院、树 → 田块、村舍 → 低平的远山退进雾里（平远）。
 */
/** 斜二测的错切：纵深每退 1 个单位，画面右移、上移各 0.354（45° 方向，缩短为 0.5） */
export const OBLIQUE_K = 0.5 * Math.SQRT1_2;
const OBLIQUE = new WeakMap<SceneDesc, [number, number]>();
const _shear = new THREE.Matrix4();
registerEngineExt({
  id: 'paper-oblique',
  onFrame(c) {
    const k = c.desc ? OBLIQUE.get(c.desc) : undefined;
    const cam = c.camera as THREE.OrthographicCamera;
    if (!k || !cam.isOrthographicCamera) return;
    // 每帧从干净的正交投影重算（配置镜头时引擎会重写投影矩阵），再右乘错切：x' = x + kx·z，y' = y + ky·z（z = 世界纵深，镜头平视、方位 0）
    cam.updateProjectionMatrix();
    const D = cam.position.z;
    _shear.set(1, 0, k[0], k[0] * D, 0, 1, k[1], k[1] * D, 0, 0, 1, 0, 0, 0, 0, 1);
    cam.projectionMatrix.multiply(_shear);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  },
});

const S_VIEW = 18;
const S_LEVEL: [number, number] = [-36, 44];
registerSceneBuilder('scroll-street', (ctx: BuildCtx): SceneDesc => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const X0 = -70, X1 = 90;
  const RIVER: [number, number] = [2.4, 9.2];
  // ---- 地面：绢色的底（整片），河道挖下去，河两岸石砌驳岸；临河的街是一条略深的土路
  b.withId(1).box((X0 + X1) / 2, -2, -27, X1 - X0, 2, 50, 'paper', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, -2, RIVER[1] + 6, X1 - X0, 2, 12, 'paper', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, -2.6, (RIVER[0] + RIVER[1]) / 2, X1 - X0, 1.2, RIVER[1] - RIVER[0] + 0.2, 'waterDeep', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, -1.4, RIVER[0] - 0.18, X1 - X0, 1.4, 0.36, 'stone', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, 0, -0.1, X1 - X0, 0.015, 4.2, 'path', { args: [0], flat: true });
  // 近岸：一条小路、芦苇
  b.withId(1).box((X0 + X1) / 2, 0, RIVER[1] + 2.2, X1 - X0, 0.015, 0.9, 'path', { args: [0], flat: true });
  for (let x = X0; x < X1; x += 1.5 + rng() * 2) for (let k = 0; k < 4; k++) b.withId(2).add('cylinder', x + rng() * 0.6, 0.25, RIVER[1] + 0.25 + rng() * 0.4, 0.04, 0.5 + rng() * 0.4, 0.04, 'foliage2', { rz: (rng() - 0.5) * 0.5, args: [0], sway: 1, noOutline: true });

  // ---- 后面的田块（浅绿 / 黄的长方块，田埂是地面色的缝）与远山
  for (let z = -16; z > -40; z -= 3 + rng() * 2) {
    for (let x = X0 + rng() * 6; x < X1 + 20; x += 5 + rng() * 6) {
      if (rng() < 0.35) continue;
      const w = 3.5 + rng() * 5, d = 1.8 + rng() * 1.6, role: Role = rng() < 0.6 ? 'grass' : rng() < 0.5 ? 'highland' : 'sand';
      b.withId(4).box(x, 0, z, w, 0.02, d, role, { args: [0], flat: true, noOutline: true });
      // 垄沟：几道细细的深色线，读得出是耕过的田
      for (let k = 1; k < 4; k++) b.withId(4).box(x, 0.02, z - d / 2 + (k / 4) * d, w * 0.96, 0.012, 0.06, role === 'grass' ? 'foliage2' : 'soil', { args: [0], flat: true, noOutline: true });
    }
  }
  for (let x = X0 - 10; x < X1 + 40; x += 9 + rng() * 10) {
    const z = -30 - rng() * 8;
    b.withId(5).ball(x, 0, z, 6 + rng() * 6, 1.4 + rng() * 1.6, 2.5 + rng() * 2, rng() < 0.5 ? 'highland' : 'rock');
  }

  // ---- 临街铺面（正面在 z = −1.8）
  let id = 20;
  const shopBack: number[] = [];
  for (let x = S_LEVEL[0] + 3.5; x < X1 - 6;) {
    const w = 2.6 + rng() * 1.6, d = 2.6 + rng() * 0.6, h = 1.7 + rng() * 0.4;
    const g = b.withId(id++).at(x + w / 2, 0, -1.8 - d / 2);
    streetShop(g, w, d, h, rng, rng() < 0.35, rng() < 0.7 ? 'paper' : 'emissive');
    shopBack.push(x + w / 2);
    x += w + 0.4 + (rng() < 0.25 ? 1.2 + rng() : 0);
  }
  // 后排：大屋 / 院墙 / 寺院（z ≈ −7 ~ −11），中间夹树
  for (let x = S_LEVEL[0] + 2; x < X1;) {
    const r = rng();
    if (r < 0.3) { const w = 4 + rng() * 2; cnHall(b.withId(id++).at(x + w / 2, 0, -8.2 - rng()), w, 2.6, 1.8, rng() < 0.5 ? 0 : 3, 0.7, 0.2); x += w + 2.2; }
    else if (r < 0.6) { const w = 3 + rng() * 1.5; streetShop(b.withId(id++).at(x + w / 2, 0, -7.4 - rng() * 1.5), w, 2.6, 1.6, rng, rng() < 0.4); x += w + 1; }
    else { const g = b.withId(id++).at(x + 1, 0, -6.5 - rng() * 3); if (rng() < 0.5) willow(g, 3.2 + rng(), rng); else roundTree(g, 3 + rng() * 1.5, rng); x += 2.2; }
  }
  // 再往后：零散的村舍屋顶与树林（越远越稀，雾吃掉）
  for (let k = 0; k < 70; k++) {
    const x = X0 + rng() * (X1 - X0 + 30), z = -12 - rng() * 22;
    const g = b.withId(id++).at(x, 0, z);
    if (rng() < 0.35) streetShop(g, 2 + rng() * 1.5, 2, 1.3, rng, false);
    else if (rng() < 0.5) willow(g, 2.6 + rng() * 1.4, rng);
    else roundTree(g, 2.4 + rng() * 1.6, rng);
  }
  // 寺院：一进院落（院墙 + 山门 + 大殿），在起点后面一点
  {
    const g = b.withId(id++).at(4, 0, -11.5);
    cnHall(g, 6.5, 3.4, 2.3, 3, 0.9, 0.26);
    for (const s of [-1, 1]) g.box(s * 5, 0, 2.6, 0.3, 1.4, 6, 'structure', { args: [0] });
    g.box(0, 0, 5.6, 10.3, 1.4, 0.3, 'structure', { args: [0] });
    g.add('roof', 0, 1.6, 5.6, 10.6, 0.36, 0.9, 'roof', { args: [1, 1.2, 0] });
  }

  // ---- 城门（关卡左端，目标）
  cityGate(b.withId(id++).at(S_LEVEL[0] - 1.5, 0, 0), 2.3, -14, [-1.7, 1.9], 3.4, 3);

  // ---- 汴河：漕船、虹桥；临河一排柳树、伞摊
  const boats: [number, number, number][] = [[-22, 5.2, 7], [-6, 6.8, 6], [21, 4.6, 7.5], [33, 7.0, 6]];
  for (const [x, z, len] of boats) cargoBoat(b.withId(id++).at(x, -0.55, z), len, rng);
  const BX = 9.5, deckAt = rainbowBridge(items, id++, BX, 1.9, RIVER[1] + 0.5, 3.4, 1.6);
  for (let x = X0 + 2; x < X1; x += 5 + rng() * 4) {
    if (Math.abs(x - BX) < 3) continue;
    willow(b.withId(id++).at(x, 0, 2.05 + rng() * 0.2), 3.4 + rng() * 1.2, rng);
  }
  for (let x = X0 + 4; x < X1; x += 7 + rng() * 6) {
    if (Math.abs(x - BX) < 4 || Math.abs(x) < 2) continue;
    const g = b.withId(id++).at(x, 0, 1.45);
    // 伞摊：大伞（圆锥）+ 伞柄 + 摊桌
    g.cyl(0, 0, 0, 0.04, 1.9, 'wood');
    g.add('cylinder', 0, 1.95, 0, 1.9, 0.38, 1.9, rng() < 0.5 ? 'paper' : 'cloth', { args: [0.04] });
    g.box(0.1, 0, -0.1, 1.1, 0.55, 0.55, 'wood', { args: [0] });
    for (let k = 0; k < 3; k++) g.ball(-0.3 + k * 0.3, 0.62, -0.1, 0.1, 0.08, 0.1, rng() < 0.5 ? 'accent' : 'flower', { noOutline: true });
  }
  // 近岸的柳树
  for (let x = X0 + 1; x < X1; x += 6 + rng() * 6) willow(b.withId(id++).at(x, 0, RIVER[1] + 1 + rng() * 2.5), 3.6 + rng() * 1.4, rng);

  // ---- 人流：街上、桥上、近岸小路
  const actors: SceneActor[] = [];
  const crowd = (x: number, z: number, y = 0, pose = 0, label?: string, kind: SceneActor['kind'] = 'npc') => {
    const g = b.withId(id++).at(x, y, z, rng() < 0.5 ? 0 : Math.PI);
    person(g, rng, 0.85, pose);
    if (label) actors.push(actor(kind, label, [x, y, z], pose === 2 ? 1.4 : 0.95, g.id));
  };
  for (let x = S_LEVEL[0] + 1; x < X1 - 4; x += 0.7 + rng() * 1.3) {
    if (Math.abs(x) < 1.6) continue;
    const z = rng() < 0.5 ? -1.2 + rng() * 0.6 : 0.55 + rng() * 0.9;
    const r = rng();
    if (r < 0.1) sedan(b.withId(id++).at(x, 0, z), rng, 0.85);
    else crowd(x, z, 0, r < 0.25 ? 1 : r < 0.35 ? 2 : r < 0.42 ? 3 : 0);
  }
  for (let k = 0; k < 9; k++) { const z = 2.4 + k * 0.85; crowd(BX - 0.9 + rng() * 1.8, z, deckAt(z), rng() < 0.3 ? 1 : 0); }
  for (let x = X0 + 3; x < X1; x += 3 + rng() * 5) crowd(x, RIVER[1] + 2.2 + (rng() - 0.5) * 0.4, 0, rng() < 0.3 ? 1 : rng() < 0.2 ? 2 : 0);
  // 有名字的几个（HUD 的名牌、交互提示挂在他们身上）
  crowd(-3.4, -0.9, 0, 0, '说书人');
  crowd(3.2, 0.9, 0, 1, '挑夫');
  crowd(7.6, -1.0, 0, 0, '茶博士');
  crowd(-9.5, 0.8, 0, 2, '骑驴的客商');
  crowd(5.4, 0.7, 0, 0, '扒手', 'enemy');
  actors.push(actor('npc', '船夫', [boats[1][0], 0, boats[1][1]], 1.2));
  actors.push(actor('objective', '城门', [S_LEVEL[0] - 1.5, 0, 0], 5.2));
  {
    const g = b.withId(id++).at(1.8, 0, -0.3);
    g.add('torus', 0, 0.2, 0, 0.36, 0.36, 0.36, 'emissive', { args: [0.22] });
    g.box(0, 0, 0, 0.06, 0.42, 0.06, 'accent', { args: [0] });
    actors.push(actor('pickup', '一串铜钱', [1.8, 0, -0.3], 0.5, g.id));
  }
  // 夜里铺子门口的灯笼
  const lights: SceneDesc['lights'] = [];
  for (let k = 0; k < shopBack.length; k += 3) lights.push({ pos: [shopBack[k], 1.6, -1.2], color: '#FFB060', range: 4.5, intensity: 1.3, night: true });

  const desc: SceneDesc = {
    items, lights, actors,
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: () => 0, inside: (x, z) => x > S_LEVEL[0] + 0.5 && x < S_LEVEL[1] - 0.5 && Math.abs(z) < 1.8 },
    water: { level: -0.35, shape: 'square', size: 260, center: [10, 0], heightTexture: heightTextureFrom(130, (_x, z) => (z > RIVER[0] && z < RIVER[1] ? -1.4 : 0), 128), heightHalf: 130 },
    bounds: { center: [4, 1, -6], radius: 40 },
    viewSize: S_VIEW,
    playerStart: [0, 0, 0],
    playerFacing: Math.PI / 2,
    playerScale: 0.95,
    camera: { ...RIG_SCROLL, viewSize: S_VIEW, target: [0, S_VIEW * (RIG_SCROLL.frameOffset?.[1] ?? 0.26), 0], xRange: S_LEVEL, fit: { w: 10 }, fogSpan: 46, shadowFollow: 26 },
  };
  OBLIQUE.set(desc, [-OBLIQUE_K, -OBLIQUE_K]);
  return desc;
});

/* ======================== 清版·街巷（Streets of Rage / River City Girls） ======================== */

/*
 * 俯角 20°、透视 35mm，沿街跟拍：地面是一条可以上下走的街（纵深 −2.6 ~ +2.4，角色能往里、往外走），
 * 镜头的纵深固定（跟拍只动 x），后面一排门脸（店面 / 卷帘门 / 防火梯 / 空调外机 / 亮着的窗）贴着人行道，霓虹招牌发光，
 * 卷帘门上有涂鸦；门脸后面是夜里的城市天际线（亮窗、水塔、月亮）；前景人行道上路灯、消防栓、垃圾桶。
 * 可以打破的油桶 / 木箱放在街上（HUD 记成拾取物），混混一个个站在街上，街尾一个大块头。
 */
const BR_VIEW = 8;
const BR_LEVEL: [number, number] = [-28, 40];
const LANE: [number, number] = [-2.6, 2.4];
registerSceneBuilder('beatemup-street', (ctx: BuildCtx): SceneDesc => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const X0 = -60, X1 = 75, WALL = -3.4;
  // ---- 地面：柏油路（街）、两边人行道 + 路缘，路中间的虚线、井盖
  b.withId(1).box((X0 + X1) / 2, -0.4, 0, X1 - X0, 0.4, 30, 'stone', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, 0, (WALL + LANE[0]) / 2 - 0.1, X1 - X0, 0.012, LANE[0] - WALL + 0.2, 'path', { args: [0], flat: true });
  b.withId(1).box((X0 + X1) / 2, 0, LANE[1] + 0.9, X1 - X0, 0.012, 1.8, 'path', { args: [0], flat: true });
  for (const z of [LANE[0] + 0.05, LANE[1] - 0.05, LANE[1] + 1.8]) b.withId(1).box((X0 + X1) / 2, 0, z, X1 - X0, 0.03, 0.12, 'trim', { args: [0], flat: true, noOutline: true });
  for (let x = X0; x < X1; x += 3) b.withId(1).box(x, 0, -0.1, 1.4, 0.016, 0.12, 'paper', { args: [0], flat: true, noOutline: true });
  for (let x = X0 + 5; x < X1; x += 11 + rng() * 6) b.withId(1).add('cylinder', x, 0.01, (rng() - 0.5) * 3, 0.9, 0.02, 0.9, 'metal', { args: [1], flat: true, noOutline: true });
  // 水洼（深色的扁片）
  for (let k = 0; k < 8; k++) b.withId(1).add('cylinder', X0 + 10 + rng() * (X1 - X0 - 20), 0.008, (rng() - 0.5) * 4, 1.2 + rng(), 0.012, 0.6 + rng() * 0.5, 'waterDeep', { args: [1], flat: true, noOutline: true });
  // 街对面（画面最下面）：一条路缘 + 远一点的路面，不让地面在竖屏时露边
  b.withId(1).box((X0 + X1) / 2, -0.2, 15, X1 - X0, 0.2, 22, 'stone', { args: [0], flat: true });
  for (let x = X0; x < X1; x += 3) b.withId(1).box(x, 0, 9.5, 1.4, 0.016, 0.12, 'paper', { args: [0], flat: true, noOutline: true });

  // ---- 门脸一排（正面在 z = WALL）
  let id = 20;
  const images: SceneImage[] = [];
  const NEON: [string, string][] = [['BAR', '#FF3EA5'], ['HOTEL', '#3EE0FF'], ['24H', '#FFE14D'], ['PAWN', '#7CFF6B'], ['NOODLE', '#FF8A3D'], ['CLUB', '#B26BFF'], ['ARCADE', '#3EE0FF'], ['LIVE', '#FF3E5E']];
  const walls: Role[] = ['roof', 'wood', 'stone', 'roof', 'structure', 'rock'];
  let ni = 0, gi = 0;
  for (let x = X0; x < X1;) {
    const w = 4 + rng() * 3, floors = rng() < 0.65 ? 2 : 3, shutter = rng() < 0.3;
    const g = b.withId(id++).at(x + w / 2, 0, WALL);
    const H = facade(g, w, floors, rng, walls[Math.floor(rng() * walls.length)], { shutter, fireEscape: rng() < 0.45 });
    // 霓虹：横招牌挂在一楼门头上，竖招牌挂在二楼一侧
    if (!shutter && rng() < 0.8) { const [t, c] = NEON[ni++ % NEON.length]; images.push(neonSign(t, c, [x + w / 2 - w * 0.12, 2.25, WALL + 0.12], 0.62, { frame: rng() < 0.5 ? c : undefined })); }
    if (floors > 2 && rng() < 0.6) { const [t, c] = NEON[ni++ % NEON.length]; images.push(neonSign(t.slice(0, 4), c, [x + w / 2 + (rng() < 0.5 ? -1 : 1) * (w / 2 - 0.45), 2.6 + 2.2, WALL + 0.16], 2.3, { vertical: true })); }
    if (shutter) images.push(graffiti(gi++ * 7 + 3, [x + w / 2, 1.05, WALL + 0.1], w * 0.72));
    else if (rng() < 0.35) images.push(graffiti(gi++ * 7 + 5, [x + w / 2 + w * 0.32, 0.55, WALL + 0.04], 1.3));
    // 楼顶：水塔或广告牌
    if (rng() < 0.3) { const r = g.at(w * 0.2, H + 0.35, -0.6); r.cyl(0, 0.8, 0, 0.55, 1.2, 'wood'); r.add('cylinder', 0, 2.2, 0, 1.2, 0.5, 1.2, 'wood', { args: [0] }); for (const s of [-1, 1]) r.cyl(s * 0.4, 0, 0, 0.04, 0.8, 'metal'); }
    x += w;
    // 偶尔一条暗巷
    if (rng() < 0.25) { b.withId(id++).box(x + 0.7, 0, WALL - 3, 1.4, 6, 0.2, 'ink', { args: [0] }); x += 1.4; }
  }
  // ---- 天际线：三层楼块（越远越暗越矮），亮窗、月亮
  for (const [z, hmin, hmax, role] of [[-14, 7, 13, 'structure'], [-26, 10, 20, 'stone'], [-42, 14, 28, 'rock']] as [number, number, number, Role][]) {
    for (let x = X0 - 20; x < X1 + 30;) {
      const w = 3 + rng() * 5, h = hmin + rng() * (hmax - hmin);
      const g = b.withId(id++).at(x + w / 2, 0, z);
      g.box(0, 0, 0, w, h, 3, role, { args: [0] });
      for (let k = 0; k < Math.round(w * h * 0.08); k++) g.box((rng() - 0.5) * (w - 0.6), 1 + rng() * (h - 2), 1.52, 0.35, 0.45, 0.04, 'emissive', { args: [0], noOutline: true });
      if (rng() < 0.25) g.cyl(0, h, 0, 0.06, 2 + rng() * 2, 'metal');
      x += w + rng() * 1.5;
    }
  }
  b.withId(id++).ball(18, 26, -60, 2.2, 2.2, 0.5, 'emissive', { noOutline: true });

  // ---- 前景：路灯、消防栓、垃圾桶、一辆停着的车
  const lights: SceneDesc['lights'] = [];
  for (let x = X0 + 4; x < X1; x += 9 + rng() * 3) {
    streetLight(b.withId(id++).at(x, 0, LANE[1] + 1.5));
    lights.push({ pos: [x + 0.85, 4, LANE[1] + 1.3], color: '#FFC77A', range: 9, intensity: 1.6, night: true });
  }
  for (let x = X0 + 8; x < X1; x += 13 + rng() * 6) hydrant(b.withId(id++).at(x, 0, LANE[1] + 1.2));
  for (let x = X0 + 2; x < X1; x += 7 + rng() * 6) trashCan(b.withId(id++).at(x, 0, WALL + 0.6), rng);
  car(b.withId(id++).at(22, 0, LANE[1] + 3.6), 'cloth');
  // 霓虹下面的彩色补光（不分昼夜）
  images.forEach((im, k) => { if (im.role === 'emissive' && k % 2 === 0) lights.push({ pos: [im.pos[0], im.pos[1], WALL + 1.6], color: '#FF5FB0', range: 5, intensity: 0.9 }); });

  // ---- 可以打破的油桶 / 木箱（HUD 记成拾取物：里面有回血的吃的）、混混、大块头
  const actors: SceneActor[] = [];
  const breakables: [number, number, 'drum' | 'crate'][] = [[4.2, -1.8, 'drum'], [6.4, -2.0, 'crate'], [15.5, 1.6, 'drum'], [23.5, -1.9, 'crate'], [29.5, -1.6, 'drum'], [-8, -1.9, 'crate']];
  for (const [x, z, k] of breakables) {
    const g = b.withId(id++).at(x, 0, z, rng() * 0.5);
    if (k === 'drum') oilDrum(g, rng() < 0.5 ? 'accent' : 'metal'); else { woodCrate(g); if (rng() < 0.5) woodCrate(g.at(0.1, 0.8, 0, 0.3), 0.6); }
    actors.push(actor('pickup', k === 'drum' ? '油桶（可打破）' : '木箱（可打破）', [x, 0, z], 1, g.id));
  }
  const thugs: [number, number, number][] = [[5.6, 0.6, 0], [8.4, -1.2, 1], [12.6, 1.3, 2], [17.5, -0.6, 0], [24.5, 0.8, 1]];
  thugs.forEach(([x, z, st], k) => {
    const g = b.withId(id++).at(x, 0, z, (rng() - 0.5) * 0.5);
    thug(g, rng, 1, st, k % 2 ? 'cloth' : 'accent');
    actors.push(actor('enemy', ['莫西干', '鸭舌帽', '墨镜'][st], [x, 0, z], 1.85, g.id));
  });
  {
    const g = b.withId(id++).at(34, 0, -0.2, Math.PI / 2);
    brute(g, 'accent', 1.05);
    actors.push(actor('boss', '帮派老大', [34, 0, -0.2], 2.6, g.id));
  }
  { const g = b.withId(id++).at(-5.5, 0, WALL + 0.5); npcFigure(g, 'cloth', 'trim'); actors.push(actor('npc', '店主', [-5.5, 0, WALL + 0.5], 1.3, g.id)); }

  return {
    items, images, lights, actors,
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: () => 0, inside: (x, z) => x > BR_LEVEL[0] && x < BR_LEVEL[1] && z > LANE[0] && z < LANE[1] },
    bounds: { center: [6, 3, -6], radius: 40 },
    viewSize: BR_VIEW,
    playerStart: [0, 0, 0.2],
    playerFacing: Math.PI / 2,
    playerScale: 1.6,
    // 跟拍只动 x：纵深的范围比画面小，注视点的 z 固定在范围中间；中线落在墙后（z ≈ −10），于是画面中心在门脸 2 米高处，下沿刚好是前面的路缘
    camera: { ...RIG_BRAWL, viewSize: BR_VIEW, bounds: [BR_LEVEL[0] - 4, BR_LEVEL[1] + 4, -10.3, -9.9], fit: { w: 8 }, shadowFollow: 20 },
  };
});

/* ======================== 剪影·逆光（LIMBO / INSIDE / 逆光的 Ori） ======================== */

/*
 * 平视横版，太阳压得很低、就在画面正后方（逆光）：近处的地面、树干、藤、蜘蛛全是墨色剪影（迎着镜头的一面只吃到一点环境光，几乎纯黑），
 * 中景、远景同样是墨色，但一层层退进发亮的雾里——越远越淡，只剩明度差；配方开着体积光时，光束从树干之间漏下来。
 * 结构同横版：角色一层（z ≈ 0）+ 深度带 z = −1.6 / −8 / −22 / −45 + 前景 z = +3（正交 / 像素化时分层视差）。萤火虫是粒子发射器。
 */
const SL_VIEW = 8;
const SL_LEVEL: [number, number] = [-30, 30];
const SL_DIST = (SL_VIEW / 2) / (24 / 70) * 1.05;
registerSceneBuilder('silhouette-forest', (ctx: BuildCtx): SceneDesc => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const FRAME_Y = RIG_SILHOUETTE.frameOffset?.[1] ?? 0.24;
  /** 深度带铺多宽、往下铺多深（21:9、拉远 0.75 倍；竖屏取景放大约 2 倍） */
  const span = (z: number) => { const s = SL_DIST / (SL_DIST - z), hw = (SL_VIEW * 1.4 * 2.4) / 2, hh = (SL_VIEW * 2.2) / 2; return { x0: SL_LEVEL[0] - hw / s - 3, x1: SL_LEVEL[1] + hw / s + 3, yb: SL_VIEW * FRAME_Y - hh / s - 2 }; };
  // ---- 地面：一段段缓坡（高 0 / 0.6 / 1.2），中间一个坑；地表是起伏的小土包 + 一排细草叶
  interface Seg { x0: number; x1: number; h: number }
  const segs: Seg[] = [{ x0: -32, x1: -14, h: 0.6 }, { x0: -14, x1: 9, h: 0 }, { x0: 11.2, x1: 20, h: 0 }, { x0: 20, x1: 32, h: 0.6 }];
  const segAt = (x: number) => segs.find((s) => x >= s.x0 && x < s.x1);
  const yAt = (x: number) => segAt(x)?.h ?? -3;
  for (const s of segs) {
    b.withId(1).box((s.x0 + s.x1) / 2, -12, -0.2, s.x1 - s.x0, 12 + s.h, 1.6, 'ink', { args: [0] });
    for (let x = s.x0 + 0.3; x < s.x1 - 0.2; x += 0.5 + rng() * 0.8) b.withId(1).ball(x, s.h - 0.05, 0.1 + rng() * 0.4, 0.4 + rng() * 0.5, 0.12 + rng() * 0.12, 0.35, 'ink');
    for (let x = s.x0 + 0.1; x < s.x1 - 0.1; x += 0.08 + rng() * 0.14) {
      const h = 0.12 + rng() * rng() * 0.55;
      b.withId(1).add('cylinder', x, s.h + h / 2 - 0.02, 0.45 + rng() * 0.2, 0.045, h, 0.045, 'ink', { args: [0], rz: (rng() - 0.5) * 0.7, sway: 0.7, noOutline: true });
    }
  }
  // 坑底：一排尖桩（剪影里一眼读得出的危险）
  b.withId(1).box(10.1, -3.2, -0.2, 2.4, 1.6, 1.5, 'ink', { args: [0] });
  for (let x = 9.15; x < 11.1; x += 0.24) b.withId(1).add('pyramid', x, -1.25, 0.1, 0.16, 0.7 + rng() * 0.3, 0.16, 'ink');

  // ---- 角色一层的道具：木箱、捕兽夹、垂下来的绳子、大蜘蛛（Boss）、出口
  const actors: SceneActor[] = [];
  let id = 20;
  {
    const g = b.withId(id++).at(4.2, 0, 0);
    g.box(0, 0, 0, 1.2, 1.1, 1.0, 'ink', { args: [0.05] });
    actors.push(actor('objective', '木箱', [4.2, 0, 0], 1.1, g.id));
  }
  {
    // 捕兽夹：两片半圆夹口 + 一排齿
    const g = b.withId(id++).at(7.2, 0, 0.1);
    g.add('torus', 0, 0.02, 0, 0.9, 0.9, 0.9, 'ink', { args: [0.08, Math.PI], rx: -0.4 });
    g.add('torus', 0, 0.02, 0, 0.9, 0.9, 0.9, 'ink', { args: [0.08, Math.PI], rx: 0.4, ry: Math.PI });
    for (let k = 0; k < 7; k++) g.add('pyramid', -0.36 + k * 0.12, 0.33, 0.12, 0.06, 0.14, 0.06, 'ink');
    actors.push(actor('enemy', '捕兽夹', [7.2, 0, 0.1], 0.5, g.id));
  }
  // 吊绳：从画面外的树枝垂下来
  b.withId(id++).cyl(13.6, 1.4, -0.1, 0.035, 12, 'ink', 1, { sway: 0.4 });
  {
    // 大蜘蛛：躯干两段 + 八条两节的长腿（剪影里最吓人的形状）
    const sx = 16.5, g = b.withId(id++).at(sx, 0, -0.5);
    // 头胸部在前（朝左，迎着主角）、腹部在后；八条腿：上节从身子斜着往上顶到膝盖（比身子高），下节扎到地上
    g.ball(-0.75, 2.2, 0, 0.75, 0.62, 0.62, 'ink');
    g.ball(0.75, 2.5, 0, 1.3, 1.1, 1.0, 'ink');
    g.ball(-1.45, 2.05, 0.1, 0.2, 0.32, 0.12, 'ink');
    for (let k = 0; k < 8; k++) {
      const side = k < 4 ? -1 : 1, i = k % 4, ax = -0.95 + i * 0.32, z = (i - 1.5) * 0.3;
      const kx = ax + side * (1.3 + i * 0.25), ky = 4.3 + ((i + 1) % 2) * 0.6, fx = ax + side * (2.5 + i * 0.4);
      const seg = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => { const L = Math.hypot(x1 - x0, y1 - y0); g.add('cylinder', (x0 + x1) / 2, (y0 + y1) / 2, z, r0, L, r0, 'ink', { rz: Math.atan2(x0 - x1, y1 - y0), args: [r1 / r0] }); };
      seg(ax, 2.2, kx, ky, 0.26, 0.17);
      g.ball(kx, ky, z, 0.11, 0.11, 0.11, 'ink');
      seg(fx, 0, kx, ky, 0.06, 0.16);
    }
    actors.push(actor('boss', '大蜘蛛', [sx, 0, -0.5], 4.2, g.id));
  }
  {
    const g = b.withId(id++).at(26.5, 0.6, 0);
    g.cyl(0, 0, 0, 0.05, 1.6, 'ink');
    g.box(0.25, 1.1, 0, 0.6, 0.28, 0.05, 'ink', { args: [0] });
    actors.push(actor('objective', '出口', [26.5, 0.6, 0], 1.6, g.id));
  }
  {
    // 远处站着的女孩（剪影）
    const g = b.withId(id++).at(-9.5, 0, -0.4);
    g.add('cylinder', 0, 0.35, 0, 0.42, 0.7, 0.32, 'ink', { args: [0.55] });
    g.ball(0, 0.88, 0, 0.18, 0.2, 0.18, 'ink');
    g.box(-0.12, 0.7, 0, 0.1, 0.32, 0.12, 'ink', { args: [0.4] });
    actors.push(actor('npc', '女孩', [-9.5, 0, -0.4], 1.1, g.id));
  }

  // ---- 深度带
  const layers: SceneLayer[] = [];
  const band = (z: number, name: string, k: number, fill: (bi: B, sp: ReturnType<typeof span>) => void) => {
    const li: Item[] = [];
    fill(new B(li, 100 + layers.length * 10), span(z));
    layers.push({ z, name, items: flatten(li, z, k) });
  };
  /** 一棵剪影树：笔直的树干（顶出画面）+ 几根斜伸的枯枝 + 偶尔垂下的藤 */
  const trunk = (bi: B, x: number, y0: number, h: number, r: number, k: number) => {
    const lean = (rng() - 0.5) * 0.08;
    bi.withId(110 + k).add('cylinder', x, y0 + h / 2, 0, r * 2, h, r * 2, 'ink', { rz: lean, args: [0.75] });
    for (let i = 0; i < 3; i++) {
      const y = y0 + h * (0.25 + rng() * 0.5), s = rng() < 0.5 ? -1 : 1, L = 1 + rng() * 2.2;
      bi.withId(110 + k).add('cylinder', x + s * L * 0.45, y + L * 0.3, 0, r * 0.5, L, r * 0.5, 'ink', { rz: -s * (0.9 + rng() * 0.4), args: [0.3] });
    }
    if (rng() < 0.4) bi.withId(110 + k).cyl(x + (rng() - 0.5) * 1.5, y0 + h * 0.35, 0, 0.025, h * 0.4, 'ink', 1, { sway: 0.5 });
  };
  band(-1.6, '近景', 0.35, (bi, sp) => {
    bi.box((sp.x0 + sp.x1) / 2, sp.yb, 0, sp.x1 - sp.x0, -0.2 - sp.yb, 1, 'ink', { args: [0] });
    strew({ x0: sp.x0, x1: sp.x1 }, 6, rng, (x, k) => trunk(bi, x, -0.2, 14 + rng() * 6, 0.22 + rng() * 0.2, k));
  });
  band(-8, '中景', 0.3, (bi, sp) => {
    bi.box((sp.x0 + sp.x1) / 2, sp.yb, 0, sp.x1 - sp.x0, -0.9 - sp.yb, 1, 'ink', { args: [0] });
    strew({ x0: sp.x0, x1: sp.x1 }, 4.2, rng, (x, k) => { trunk(bi, x, -0.9, 18 + rng() * 6, 0.3 + rng() * 0.25, 30 + k); if (rng() < 0.4) bi.withId(170 + k).ball(x + 1, -0.6, 0, 1.6 + rng(), 0.9 + rng() * 0.6, 1, 'ink'); });
  });
  band(-22, '远景', 0.25, (bi, sp) => {
    bi.box((sp.x0 + sp.x1) / 2, sp.yb, 0, sp.x1 - sp.x0, -2.6 - sp.yb, 1, 'ink', { args: [0] });
    strew({ x0: sp.x0, x1: sp.x1 }, 3.2, rng, (x, k) => trunk(bi, x, -2.6, 26 + rng() * 8, 0.35 + rng() * 0.3, 70 + k));
  });
  band(-45, '天边', 0.2, (bi, sp) => {
    bi.box((sp.x0 + sp.x1) / 2, sp.yb, 0, sp.x1 - sp.x0, -4 - sp.yb, 1, 'ink', { args: [0] });
    strew({ x0: sp.x0, x1: sp.x1 }, 3, rng, (x, k) => bi.withId(190 + k).ball(x, -4, 0, 3 + rng() * 3, 3 + rng() * 4, 1, 'ink'));
  });
  // 前景 z = +3：大片的墨色草叶、蕨、偶尔一根粗树干从画面边上穿过；起点一屏里不放高的
  band(3, '前景', 0.5, (bi, sp) => {
    strew({ x0: sp.x0, x1: sp.x1 }, 4.5, rng, (x, k) => {
      const g = bi.withId(210 + k).at(x, -1.4, 0);
      if (Math.abs(x) > 9 && rng() < 0.25) g.add('cylinder', 0, 8, 0, 1.3, 20, 1.3, 'ink', { args: [0.85], rz: (rng() - 0.5) * 0.1 });
      else for (let i = 0; i < 9; i++) { const h = (Math.abs(x) < 6 ? 0.8 : 1.6) * (0.5 + rng()); g.add('cylinder', (rng() - 0.5) * 1.6, h / 2, 0, 0.09, h, 0.09, 'ink', { args: [0], rz: (rng() - 0.5) * 0.9, sway: 0.8, noOutline: true }); }
    });
  });

  // 萤火虫：几团闪烁的光点
  const emitters: SceneEmitter[] = [[-6, 1.4], [3, 2.2], [12, 1.2], [22, 2.0]].map(([x, y]) => ({ kind: 'sparkle', pos: [x, y, -0.8], role: 'emissive', count: 10, speed: 0.4, size: 0.07, range: 2.2, period: 1.6 }));
  return {
    items, layers, actors, emitters, lights: [],
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: (x) => yAt(x), inside: (x) => x > SL_LEVEL[0] + 0.5 && x < SL_LEVEL[1] - 0.5 && !!segAt(x) },
    map: { plane: 'xy', x: SL_LEVEL, y: [-3, 8], solidAt: (x, y) => { const s = segAt(x); return !!s && y <= s.h; } },
    bounds: { center: [0, 2, -6], radius: 34 },
    viewSize: SL_VIEW,
    playerStart: [0, 0, 0],
    playerFacing: Math.PI / 2,
    camera: { ...RIG_SILHOUETTE, viewSize: SL_VIEW, target: [0, SL_VIEW * FRAME_Y, 0], xRange: SL_LEVEL, fit: { w: 7 }, shadowFollow: 16 },
  };
});

/** 一个深度带里横着铺东西：每隔 gap ± 抖动放一个 */
function strew(sp: { x0: number; x1: number }, gap: number, rng: () => number, put: (x: number, k: number) => void) {
  let k = 0;
  for (let x = sp.x0 + rng() * gap; x < sp.x1; x += gap * (0.6 + rng() * 0.8)) put(x, k++);
}

/* ======================== 舞台·剧场（镜框式舞台） ======================== */

/*
 * 观众席里略高一点的固定机位（俯角 10°、50mm）：金色线脚的台口 + 拱 + 徽饰，红丝绒大幕收在两边、金绳绑着，顶上一排垂花檐幕；
 * 舞台上是木地板，三对手绘的树景片（侧幕）一层层往里，最里面是一整幅画景（黄昏、湖、城堡）；台唇一排脚灯（点光，从下往上打亮演员），
 * 头顶两排吊灯（点光），台口两侧是两层包厢；画面下沿是前几排观众的椅背和后脑勺的剪影。
 * 现有灯光就搭得出「舞台式布光」：推荐时段放到夜里，太阳暗下去，台上只剩脚灯和吊灯；聚光灯光锥另由 M 轨道加。
 */
const ST = { w: 14, h: 7.4, zf: 0.6, back: -8, apron: 2.4 };
registerSceneBuilder('stage-theater', (ctx: BuildCtx): SceneDesc => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const hw = ST.w / 2;
  // ---- 观众厅：地面（往后一排排升高）、台口墙（开一个台口）、天花
  b.withId(1).box(0, -3, 70, 160, 2, 150, 'wood', { args: [0], flat: true });
  // 台口墙用深色木（剧场里除了台上都是暗的）
  b.withId(2).box(-(hw + 15), -4, ST.zf, 30, 40, 0.6, 'wood', { args: [0] });
  b.withId(2).box(hw + 15, -4, ST.zf, 30, 40, 0.6, 'wood', { args: [0] });
  b.withId(2).box(0, ST.h, ST.zf, 80, 30, 0.6, 'wood', { args: [0] });
  // ---- 台口：金色壁柱 + 柱头 + 拱形线脚 + 徽饰
  for (const s of [-1, 1]) {
    b.withId(3).box(s * (hw + 0.35), -0.6, ST.zf + 0.4, 0.7, ST.h + 0.6, 0.3, 'trim', { args: [0.1] });
    b.withId(3).box(s * (hw + 0.35), ST.h - 0.3, ST.zf + 0.5, 1.0, 0.5, 0.4, 'trim', { args: [0.2] });
    b.withId(3).box(s * (hw + 0.35), -0.6, ST.zf + 0.55, 1.0, 0.5, 0.4, 'trim', { args: [0.2] });
    // 壁柱上的凹槽（三道竖线）
    for (const dx of [-0.18, 0, 0.18]) b.withId(3).box(s * (hw + 0.35) + dx, 0.0, ST.zf + 0.56, 0.05, ST.h - 0.6, 0.04, 'wood', { args: [0], noOutline: true });
  }
  // 台口上方的横楣：两道金线脚夹一条深色饰带，饰带上一排圆形浮雕
  b.withId(3).box(0, ST.h + 0.75, ST.zf + 0.42, ST.w + 1.4, 0.3, 0.3, 'trim', { args: [0.1] });
  b.withId(3).box(0, ST.h + 0.4, ST.zf + 0.36, ST.w + 1.2, 0.36, 0.2, 'wood', { args: [0] });
  for (let x = -hw + 0.6; x <= hw - 0.5; x += 1.2) if (Math.abs(x) > 1.2) b.withId(3).ball(x, ST.h + 0.58, ST.zf + 0.48, 0.13, 0.13, 0.06, 'trim', { noOutline: true });
  b.withId(3).box(0, ST.h + 0.2, ST.zf + 0.45, ST.w + 1.4, 0.35, 0.3, 'trim', { args: [0.1] });
  b.withId(3).ball(0, ST.h + 1.25, ST.zf + 0.55, 0.95, 0.75, 0.3, 'trim');
  b.withId(3).ball(0, ST.h + 1.25, ST.zf + 0.75, 0.45, 0.38, 0.15, 'emissive', { noOutline: true });
  // ---- 檐幕、大幕、侧台的黑幕（遮住侧台）
  valance(b.withId(4).at(0, 0, ST.zf - 0.2), ST.w + 0.4, ST.h + 0.05);
  gatheredDrape(b.withId(5).at(0, 0, ST.zf - 0.35), -1, -hw, ST.h, 2.6, rng);
  gatheredDrape(b.withId(5).at(0, 0, ST.zf - 0.35), 1, hw, ST.h, 2.6, rng);
  for (const s of [-1, 1]) b.withId(6).box(s * (hw + 3.2), 0, -4.6, 2.4, 12, 6.8, 'ink', { args: [0] });
  // 顶上几道沿幕（遮住吊杆）
  for (const z of [-1.8, -4.2]) b.withId(6).box(0, ST.h - 0.9 + (z < -3 ? 0.4 : 0), z, ST.w + 2, 1.4, 0.08, 'ink', { args: [0] });
  // ---- 舞台：木地板（一条条板缝）、台唇（往前凸一块，前面是暗红的台裙）、脚灯
  b.withId(7).box(0, -1.2, (ST.back + ST.apron) / 2, ST.w + 6, 1.2, ST.apron - ST.back, 'wood', { args: [0], flat: true });
  for (let x = -hw - 2.5; x <= hw + 2.5; x += 0.55) b.withId(7).box(x, 0, (ST.back + ST.apron) / 2, 0.03, 0.006, ST.apron - ST.back, 'trunk', { args: [0], flat: true, noOutline: true });
  b.withId(7).box(0, -1.25, ST.apron + 0.05, ST.w + 6, 1.25, 0.1, 'accent', { args: [0] });
  b.withId(7).box(0, -0.06, ST.apron + 0.08, ST.w + 6.1, 0.08, 0.16, 'trim', { args: [0] });
  const lights: SceneDesc['lights'] = [];
  for (let x = -hw + 0.6; x <= hw - 0.5; x += 0.7) {
    b.withId(8).box(x, 0, ST.apron - 0.15, 0.4, 0.14, 0.18, 'metal', { args: [0.3] });
    b.withId(8).ball(x, 0.1, ST.apron - 0.22, 0.13, 0.08, 0.06, 'emissive', { noOutline: true });
  }
  for (const x of [-4.5, 0, 4.5]) lights.push({ pos: [x, 0.35, ST.apron - 0.4], color: '#FFC98A', range: 8, intensity: 1.7 });
  // 头顶吊灯：一暖一冷（引擎最多 8 盏点光：脚灯 3 + 吊灯 2 + 下层包厢 2 + 观众席后方 1；收尾 X 前是 10 盏，右侧包厢的两盏被丢掉，左右不对称）
  for (const [x, z, c, r] of [[0, -1.6, '#FFD9A0', 12], [0, -4.6, '#A9C4FF', 11]] as [number, number, string, number][]) lights.push({ pos: [x, ST.h - 0.6, z], color: c, range: r, intensity: 1.4 });
  // ---- 侧幕景片（三对手绘的树）+ 画景
  const images: SceneImage[] = [];
  [-1.4, -3.6, -5.8].forEach((z, k) => {
    for (const s of [-1, 1]) images.push({ file: '', canvas: { key: `stage:wing:${k}:v1`, w: 400, h: 900, draw: drawWingTree(31 + k * 13) }, pos: [s * (hw - 0.9 - k * 0.15), 0, z], size: [3.4, 7.6], anchor: 'bottom', flipX: s > 0, lit: 0.2, recolor: 0.3, cut: 0.5, role: 'foliage' });
  });
  images.push({ file: '', canvas: { key: 'stage:backdrop:v1', w: 2048, h: 1000, draw: drawBackdrop }, pos: [0, -0.6, ST.back + 0.3], size: [22, 10.7], anchor: 'bottom', lit: 0.15, recolor: 0.3, cut: 0.01, role: 'skyHorizon' });
  // 吊在线上的纸月亮（舞台道具）
  b.withId(9).add('torus', 3.4, 5.6, -4.8, 1.3, 1.3, 0.4, 'emissive', { args: [0.24, Math.PI * 1.25], rz: -1.8 });
  for (const dx of [-0.2, 0.3]) b.withId(9).cyl(3.4 + dx, 6.1, -4.82, 0.012, 6, 'ink', 1, { noOutline: true });
  // ---- 台上的人：主角（玩家，在台中央）、反派（大块头，舞台右侧）、小道具宝箱（台左）
  const actors: SceneActor[] = [];
  {
    const g = b.withId(10).at(3.6, 0, -2.6, -Math.PI / 2.6);
    brute(g, 'accent', 0.8);
    actors.push(actor('boss', '魔王（反派）', [3.6, 0, -2.6], 1.8, g.id));
  }
  {
    const g = b.withId(11).at(-4.4, 0, -3.4, 0.4);
    npcFigure(g, 'cloth', 'trim');
    actors.push(actor('npc', '公主', [-4.4, 0, -3.4], 1.25, g.id));
  }
  {
    const g = b.withId(12).at(-2.6, 0, -0.6);
    for (const it of chest(0, 0, 0, 0.3, g.id)) items.push({ ...it, pos: [it.pos[0] - 2.6, it.pos[1], it.pos[2] - 0.6] });
    actors.push(actor('pickup', '宝箱（道具）', [-2.6, 0, -0.6], 0.6, g.id));
  }
  // ---- 两侧包厢（两层，金栏杆 + 红帘 + 壁灯）
  for (const s of [-1, 1]) for (const [y, k] of [[1.6, 0], [4.6, 1]] as [number, number][]) {
    const x = s * (hw + 3.6), g = b.withId(13 + k).at(x, y, ST.zf + 1.2);
    g.box(0, 0, 0, 3.2, 1.0, 1.4, 'accent', { args: [0.1] });
    g.box(0, 0.95, 0.72, 3.3, 0.12, 0.12, 'trim', { args: [0] });
    for (let i = 0; i < 9; i++) g.box(-1.5 + i * 0.375, 0.25, 0.72, 0.06, 0.7, 0.06, 'trim', { args: [0], noOutline: true });
    g.box(0, 1.1, -0.6, 3.0, 1.9, 0.05, 'ink', { args: [0] });
    for (const dx of [-1.25, 1.25]) g.add('cylinder', dx, 1.95, 0.2, 0.5, 1.9, 0.3, 'accent', { args: [0.6] });
    g.ball(s * -1.75, 1.7, 0.4, 0.15, 0.2, 0.15, 'emissive', { noOutline: true });
    if (k === 0) lights.push({ pos: [x + s * -1.75, y + 1.7, ST.zf + 1.8], color: '#FFB46B', range: 3.5, intensity: 1.0 });
  }
  // ---- 观众席：一排排椅背（红丝绒）+ 零星的后脑勺剪影；乐池栏杆。竖屏时镜头退得远，画面下半截全是观众席（收尾 X：原来 9 排，竖屏下方露出空地板）
  b.withId(15).box(0, -0.3, ST.apron + 1.2, ST.w + 6, 0.5, 0.12, 'wood', { args: [0] });
  // 前 9 排按原来的坡度（每排高 0.3）；后面的坡度放缓到 0.1：竖屏时镜头退到很远，坡度比视线陡的话后一排会把前面几排整个挡住，只剩最后一排的椅背和它的一堵背墙
  for (let row = 0; row < 32; row++) {
    const z = ST.apron + 2.6 + row * 1.1, y0 = -0.6 + Math.min(row, 8) * 0.3 + Math.max(0, row - 8) * 0.1, near = row < 9;
    b.withId(16).box(0, -3, z, 60, y0 + 3, 1.1, 'wood', { args: [0], flat: true });
    // 中间一条过道（竖屏时正好落在画面中线）；远处几排用直角盒子（看不出圆角，省三角形）
    for (let x = -14 + (row % 2) * 0.35; x <= 14; x += 0.7) {
      if (Math.abs(x) < 0.5) continue;
      b.withId(17).box(x, y0, z + 0.3, 0.6, 1.05, 0.14, 'cloth', { args: [near ? 0.4 : 0] });
      if (rng() < (near ? 0.45 : 0.35)) b.withId(18).ball(x + (rng() - 0.5) * 0.1, y0 + 1.25, z - 0.05, 0.17, 0.21, 0.17, rng() < 0.7 ? 'ink' : 'trunk');
    }
    // 过道：红地毯台阶 + 每排两盏小灯（暗场里一串亮点，竖屏时画面下半截的观众席有节奏，不是一片黑）
    b.withId(16).box(0, y0, z, 0.9, 0.02, 1.1, 'accent', { args: [0], flat: true, noOutline: true });
    // （灯装在过道两边的椅背顶上：观众席往后升得比视线陡，贴地的灯会被后一排挡住）
    // 只装在后排（16:9 的画面里只看得到前 9 排，那里不加，原来的构图不变）
    if (!near) for (const sx of [-1, 1]) b.withId(16).ball(sx * 0.5, y0 + 1.12, z + 0.3, 0.06, 0.05, 0.05, 'emissive', { noOutline: true });
  }
  // 观众席后方（放映室 / 楼座栏杆的灯）一盏暖色弱光：从背后照亮一排排椅背和后脑勺，竖屏时画面下半截读得出是观众席；16:9 的镜头在它前面，几乎照不到
  lights.push({ pos: [0, 9, ST.apron + 32], color: '#FFB98A', range: 24, intensity: 0.9 });
  // ---- 台口上方的墙（竖屏 / 4:3 时露出来；16:9 在画面外）：金线脚分出的藻井格、格心金花，正中一盏水晶吊灯
  {
    const g = b.withId(19);
    const x0 = -hw - 3, x1 = hw + 3, nx = 6, cw = (x1 - x0) / nx;
    for (let r = 0; r < 5; r++) {
      const y = ST.h + 2.3 + r * 1.8;
      g.box(0, y, ST.zf + 0.32, x1 - x0, 0.16, 0.2, 'trim', { args: [0] });
      for (let i = 0; i <= nx; i++) g.box(x0 + i * cw, y, ST.zf + 0.32, 0.16, 1.8, 0.2, 'trim', { args: [0], noOutline: true });
      for (let i = 0; i < nx; i++) {
        const cx = x0 + (i + 0.5) * cw, cy = y + 0.9;
        g.box(cx, cy - 0.62, ST.zf + 0.31, cw - 0.5, 1.24, 0.06, 'accent', { args: [0], noOutline: true });
        g.ball(cx, cy, ST.zf + 0.42, 0.26, 0.26, 0.08, 'trim', { noOutline: true });
      }
    }
    // 吊灯：一根吊链、两圈金环、一圈亮灯泡（发光，开了辉光的配方会泛光）
    const cz = ST.zf + 4.5, cy = ST.h + 3.6;
    g.cyl(0, cy + 0.6, cz, 0.03, 9, 'metal', 1, { noOutline: true });
    for (const [ry, rr] of [[0, 1.5], [0.7, 1.0]] as [number, number][]) {
      g.add('torus', 0, cy + ry, cz, rr, rr, rr, 'trim', { args: [0.06], rx: Math.PI / 2 });
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.ball(Math.cos(a) * rr, cy + ry + 0.14, cz + Math.sin(a) * rr, 0.09, 0.13, 0.09, 'emissive', { noOutline: true }); }
    }
    g.ball(0, cy - 0.35, cz, 0.35, 0.5, 0.35, 'emissive', { noOutline: true });
  }
  return {
    items, images, lights, actors,
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x) < hw - 1.2 && z > ST.back + 2.2 && z < ST.apron - 0.4 },
    bounds: { center: [0, 3, -2], radius: 16 },
    viewSize: 11.5,
    playerStart: [0, 0, -1.2],
    playerFacing: 0,
    playerScale: 1.45,
    // 内容框 11（公主 −4.4 到魔王 3.6 两边各留一点）：原来 15，竖屏时舞台缩成中间一条
    camera: { ...RIG_STAGE, viewSize: 11.5, target: [0, 2.6, -1.5], fit: { w: 11 } },
  };
});
