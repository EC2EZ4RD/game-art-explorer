import { RIG_ARENA_TOP, RIG_GREYBOX, RIG_SIDE } from '../../../content/sceneCatalog';
import type { Role } from '../../../content/roles';
import type { Rng } from '../../../core/rng';
import { B, brokenColumn, castleWall, crystalCluster, torch, tower } from '../kits';
import { actor, brute, crawler, flatten, gem, grassTuft, npcFigure, signpost } from '../kits2d';
import * as parts from '../parts';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, shapeOf } from '../sceneUtil';
import type { BuildCtx, Item, SceneActor, SceneDesc, SceneLayer } from '../types';

/*
 * 横版分层场景 sideStage（森林 / 洞窟 / 废墟城堡 / 山水，docs/workbench-redesign.md §9.1）与几何白盒 greybox。
 *
 * 结构：角色所在的平台一层（z ≈ 0，地面每段是整块盒子，不拼瓦片，所以没有接缝描边）+ 身后四个深度带
 * z = −1.6 / −8 / −22 / −45（压扁的图元）+ 零星前景（z = +3）。镜头 rig：平视 0°、透视 35mm（或正交 + 分层视差），只沿 x 跟拍，地面在下三分之一。
 * 每个深度带铺多宽、往下铺多深，按「同一取景下这一带能看到多少」算（远层要铺得更宽、更深，才不会在画面边上露出空白）。
 */

/** 取景高度（世界单位）：角色约占画面高度的九分之一 */
const VIEW = 8;
/** 关卡两端（镜头跟拍时 x 夹在这里面） */
const LEVEL: [number, number] = [-30, 30];
/** 透视版镜头离注视平面的距离（与 Engine.configureCamera 同一个公式：35mm，×1.05） */
const DIST = (VIEW / 2) / (24 / 70) * 1.05;
/** 深度带 z 的缩放（透视下的近大远小） */
const scaleAt = (z: number) => DIST / (DIST - z);
/** 画面偏移（与 RIG_SIDE.frameOffset 一致）：注视点比脚底高 0.27 × 取景，地面落在画面下方约 23% 处（整合修复 U#16：原来 0.17，地面下面露出一大块空板） */
const FRAME_Y = 0.27;
/** 镜头注视点的高度范围（地面 0 ~ 1.6，加画面偏移） */
const CAM_Y: [number, number] = [VIEW * FRAME_Y, 1.6 + VIEW * FRAME_Y];
/**
 * 这一带要铺满的 x 范围、往下要铺到多深：按 21:9 的宽屏、取景拉远到 0.75 倍留够宽度；竖屏时取景按内容框放大到约 2 倍（审查修复 2），往下按 2 倍留够深度
 */
function bandSpan(z: number): { x0: number; x1: number; yBottom: number } {
  const s = scaleAt(z), halfW = (VIEW * 1.4 * 2.4) / 2, halfH = (VIEW * 2.1) / 2;
  return { x0: LEVEL[0] - halfW / s - 2, x1: LEVEL[1] + halfW / s + 2, yBottom: CAM_Y[0] - halfH / s - 2 };
}

type Theme = 'forest' | 'cave' | 'ruins' | 'shanshui';
interface Seg { x0: number; x1: number; h: number }
interface Ledge { x0: number; x1: number; y: number }

interface ThemeSpec {
  /** 地面主体 / 顶面 / 深处（盖边下 1.4 以下）的颜色角色 */
  ground: Role;
  cap: Role | null;
  deep: Role;
  /** 远景四层的角色（近 → 远） */
  bands: [Role, Role, Role, Role];
  ceiling?: boolean;
}
const THEMES: Record<Theme, ThemeSpec> = {
  // 深处用树根色（暗土）：原来是浅灰的岩石色，土层下面像一条空板（整合修复 U#16）
  forest: { ground: 'soil', cap: 'grass', deep: 'trunk', bands: ['foliage', 'foliage2', 'highland', 'rock'] },
  cave: { ground: 'rock', cap: 'stone', deep: 'soil', bands: ['rock', 'stone', 'rock', 'soil'], ceiling: true },
  ruins: { ground: 'stone', cap: 'path', deep: 'rock', bands: ['stone', 'structure', 'structure', 'rock'] },
  shanshui: { ground: 'soil', cap: 'grass', deep: 'trunk', bands: ['foliage2', 'highland', 'highland', 'rock'] },
};

/** 平台：起点一段（−6 ~ 7）是平的；两边按种子随机长度、偶尔断开（坑）、高度 0 / 0.8 / 1.6 小步变化 */
function layoutPlatforms(rng: Rng): { segs: Seg[]; ledges: Ledge[] } {
  const segs: Seg[] = [{ x0: -6, x1: 7, h: 0 }];
  const step = (h: number) => Math.max(0, Math.min(1.6, h + [-0.8, 0, 0, 0.8][Math.floor(rng() * 4)]));
  // 往右
  let x = 7, h = 0;
  while (x < LEVEL[1] + 1) {
    if (rng() < 0.35 && x < LEVEL[1] - 6) x += 1.6 + rng() * 1.1;
    h = step(h);
    const len = 4 + rng() * 6;
    segs.push({ x0: x, x1: Math.min(LEVEL[1] + 1, x + len), h });
    x += len;
  }
  // 往左
  x = -6; h = 0;
  while (x > LEVEL[0] - 1) {
    if (rng() < 0.35 && x > LEVEL[0] + 6) x -= 1.6 + rng() * 1.1;
    h = step(h);
    const len = 4 + rng() * 6;
    segs.unshift({ x0: Math.max(LEVEL[0] - 1, x - len), x1: x, h });
    x -= len;
  }
  // 相邻、同高、中间没有坑的段并成一整块（§9.1：地面合并成整块，接缝处不会出描边）
  for (let k = segs.length - 1; k > 0; k--) {
    const a = segs[k - 1], c = segs[k];
    if (Math.abs(a.h - c.h) < 1e-6 && Math.abs(a.x1 - c.x0) < 1e-6) { a.x1 = c.x1; segs.splice(k, 1); }
  }
  const ledges: Ledge[] = [];
  for (const s of segs) {
    if (s.x1 - s.x0 < 6 || (s.x0 < 6 && s.x1 > -6) || rng() < 0.4) continue;
    const w = 2.2 + rng() * 1.8, c = s.x0 + (s.x1 - s.x0) * (0.3 + rng() * 0.4);
    ledges.push({ x0: c - w / 2, x1: c + w / 2, y: s.h + 2.3 + rng() * 0.8 });
  }
  return { segs, ledges };
}

const segAt = (segs: Seg[], x: number) => segs.find((s) => x >= s.x0 && x < s.x1);

/** 一个深度带里横着铺东西：每隔 gap ± 抖动放一个 */
function strew(span: { x0: number; x1: number }, gap: number, rng: Rng, put: (x: number, k: number) => void) {
  let k = 0;
  for (let x = span.x0 + rng() * gap; x < span.x1; x += gap * (0.6 + rng() * 0.8)) put(x, k++);
}

function sideStage(theme: Theme) {
  return (ctx: BuildCtx): SceneDesc => {
    const v = ctx.values, rng = ctx.rng, shape = shapeOf(v), T = THEMES[theme];
    const { segs, ledges } = layoutPlatforms(rng);
    const items: Item[] = [];
    const b = new B(items, 3);
    // ---- 角色所在的一层（z ≈ 0）：每段地面一整块，顶面一条盖边（同一个物体编号，段与段之间没有接缝线）
    const ZB = -1.0, ZF = 0.6, depth = ZF - ZB, zc = (ZF + ZB) / 2, BOTTOM = -10;
    for (const s of segs) {
      const cx = (s.x0 + s.x1) / 2, w = s.x1 - s.x0;
      // 地面：表层（1.4 厚）+ 深处（略缩进一点，颜色更暗），顶上一条盖边；同一个物体编号
      b.withId(3).box(cx, s.h - 1.4, zc, w, 1.4, depth, T.ground, { args: [0.04] });
      b.withId(3).box(cx, BOTTOM, zc - 0.08, w - 0.1, s.h - 1.4 - BOTTOM, depth - 0.1, T.deep, { args: [0.04] });
      if (T.cap) b.withId(3).box(cx, s.h - 0.22, zc + 0.03, w + 0.12, 0.26, depth + 0.06, T.cap, { args: [0.2] });
      // 嵌在土里的石块 / 树根（正面看得到的一点细节）：只放在表层土里（整合修复 U#16：原来往下撒到 2.6 深，落在深处那一截上像浮着的碎方块）
      for (let k = 0; k < Math.floor(w / 2.4); k++) {
        const x = s.x0 + 0.8 + rng() * (w - 1.6), y = s.h - 0.45 - rng() * 0.75;
        b.withId(3).add(theme === 'ruins' ? 'box' : 'poly', x, y, ZF - 0.08, 0.35 + rng() * 0.5, 0.22 + rng() * 0.25, 0.3, theme === 'forest' || theme === 'shanshui' ? (rng() < 0.6 ? 'trunk' : 'stone') : 'stone', { args: [theme === 'ruins' ? 0.1 : 0], rz: rng() * 3 });
      }
    }
    for (const l of ledges) b.withId(4).box((l.x0 + l.x1) / 2, l.y - 0.45, zc, l.x1 - l.x0, 0.45, depth * 0.8, T.cap ?? T.ground, { args: [0.2] });
    if (T.ceiling) {
      // 洞顶：一整块，往下挂钟乳石
      b.withId(5).box(0, 6.3, zc - 0.4, LEVEL[1] - LEVEL[0] + 30, 6, depth + 0.8, 'rock', { args: [0.05] });
      strew({ x0: LEVEL[0] - 8, x1: LEVEL[1] + 8 }, 2.2, rng, (x) => b.withId(5).add('pyramid', x, 6.3 - 0.5, zc, 0.5 + rng() * 0.5, 1.0 + rng() * 1.4, 0.5, 'rock', { rx: Math.PI }));
    }
    const yAt = (x: number) => segAt(segs, x)?.h ?? 0;
    // ---- 平台上的道具（按主题），零星的
    let id = 20;
    const lights: SceneDesc['lights'] = [];
    for (const s of segs) {
      if (s.x1 - s.x0 < 3) continue;
      const x = s.x0 + 1 + rng() * (s.x1 - s.x0 - 2);
      if (x > -2 && x < 2) continue;
      const g = b.withId(id++).at(x, s.h, -0.35);
      if (theme === 'forest' || theme === 'shanshui') { if (rng() < 0.5) items.push(...parts.rock(x, s.h, -0.4, 0.6 + rng() * 0.4, shape, rng, id++)); else items.push(...parts.bush(x, s.h, -0.4, 0.7, shape, rng, id++)); }
      else if (theme === 'cave') { if (rng() < 0.5) crystalCluster(g, rng); else g.add('pyramid', 0, 0.6, 0, 0.6, 1.2 + rng(), 0.5, 'rock'); }
      else if (rng() < 0.5) brokenColumn(g, 1.2 + rng() * 1.6, rng); else g.box(0, 0, 0, 1.1, 0.6, 0.7, 'stone', { rz: (rng() - 0.5) * 0.3 });
    }
    // ---- 场景角色（RC8）：起点左边 NPC、右边小怪与宝箱，远处还有敌人与出口
    const actors: SceneActor[] = [];
    // 落在坑上方的点挪到最近一段地面的中间（种子不同，坑的位置不同）
    const onGround = (x: number) => { if (segAt(segs, x)) return x; const s = segs.slice().sort((a, c) => Math.abs((a.x0 + a.x1) / 2 - x) - Math.abs((c.x0 + c.x1) / 2 - x))[0]; return Math.max(s.x0 + 0.6, Math.min(s.x1 - 0.6, x)); };
    const put = (x0: number, f: (g: B) => void, kind: SceneActor['kind'], label: string, h: number) => {
      const x = onGround(x0), y = yAt(x), g = b.withId(id++).at(x, y, 0);
      f(g);
      actors.push(actor(kind, label, [x, y, 0], h, g.id));
    };
    const npcLabel = { forest: '樵夫', cave: '矿工', ruins: '守卫', shanshui: '渔翁' }[theme];
    put(-3.2, (g) => npcFigure(g, theme === 'ruins' ? 'metal' : 'cloth'), 'npc', npcLabel, 1.25);
    // 废墟：守门巨像就站在起点这一屏的右边（整合修复 U#16：原来在 x = 22，画面里看不到 Boss，Boss 界面的血条挂不到人）；游荡骑士挪到它身后
    const ruins = theme === 'ruins';
    put(ruins ? 9.6 : 5.4, (g) => crawler(g, 'accent'), 'enemy', theme === 'cave' ? '洞穴甲虫' : ruins ? '游荡骑士' : theme === 'shanshui' ? '山魈' : '史莱姆', 0.8);
    put(ruins ? 12.5 : 9.2, (g) => { const x = onGround(ruins ? 12.5 : 9.2); if (theme === 'cave' || theme === 'shanshui') gem(g, 'emissive', 1.3); else g.items.push(...parts.chest(0, 0, 0, 0, g.id).map((it) => ({ ...it, pos: [it.pos[0] + x, it.pos[1] + yAt(x), it.pos[2]] as [number, number, number] }))); }, 'pickup', theme === 'cave' ? '晶石' : theme === 'shanshui' ? '灵芝' : '宝箱', 0.6);
    put(16.5, (g) => crawler(g, 'accent', 1.15), 'enemy', '小怪', 0.9);
    if (ruins) put(4.3, (g) => brute(g, 'accent', 0.95), 'boss', '守门巨像', 2.4);
    else put(-17, (g) => crawler(g, 'accent'), 'enemy', '小怪', 0.8);
    put(LEVEL[1] - 2.5, (g) => signpost(g), 'objective', '出口', 1.6);
    // 灯：NPC 身边一盏（夜里亮）；洞窟 / 废墟多几支火把
    const lamp = (x0: number, night = true) => { const x = onGround(x0), y = yAt(x); torch(b.withId(id++).at(0, y, 0), x, -0.5); lights.push({ pos: [x, y + 1.35, -0.5], color: '#FF9A3D', range: 5.5, intensity: night ? 1.7 : 1.1, night }); };
    lamp(-5.2);
    if (theme === 'cave' || theme === 'ruins') for (const x of [-14, 3, 13, 24]) lamp(x, false);

    // ---- 深度带
    const layers: SceneLayer[] = [];
    const band = (z: number, name: string, fill: (bi: B, span: ReturnType<typeof bandSpan>) => void, k = 0.35) => {
      const li: Item[] = [];
      const span = bandSpan(z);
      fill(new B(li, 100 + layers.length * 10), span);
      layers.push({ z, name, items: flatten(li, z, k) });
    };
    const [r1, r2, r3, r4] = T.bands;
    // 近景 z = −1.6：贴着平台后面的一排（树 / 岩柱 / 柱廊 / 松石），脚下一条地面
    band(-1.6, '近景', (bi, sp) => {
      bi.box((sp.x0 + sp.x1) / 2, sp.yBottom, 0, sp.x1 - sp.x0, 0.35 - sp.yBottom, 1, theme === 'cave' ? 'rock' : theme === 'ruins' ? 'stone' : 'grass', { args: [0.02] });
      strew(sp, theme === 'ruins' ? 3.6 : 3.6, rng, (x, k) => {
        if (theme === 'forest') bi.items.push(...parts.broadleafTree(x, 0.3, 0, 1.5 + rng() * 0.8, shape, rng, 110 + k));
        else if (theme === 'shanshui') bi.items.push(...(rng() < 0.6 ? parts.pineTree(x, 0.3, 0, 1.6 + rng(), shape, rng, 110 + k) : parts.rock(x, 0.3, 0, 1.2 + rng(), shape, rng, 110 + k)));
        else if (theme === 'cave') bi.withId(110 + k).add('poly', x, 1.5, 0, 1.6 + rng(), 3 + rng() * 3, 1.2, r1, { args: [rng() > 0.5 ? 1 : 0] });
        else bi.withId(110 + k).cyl(x, 0.3, 0, 0.35, 4.5 + rng() * 1.5, r1, 0.9);
      });
    });
    // 中景 z = −8
    band(-8, '中景', (bi, sp) => {
      bi.box((sp.x0 + sp.x1) / 2, sp.yBottom, 0, sp.x1 - sp.x0, 1 - sp.yBottom, 1, theme === 'forest' ? 'grass' : r2, { args: [0.02] });
      strew(sp, theme === 'ruins' ? 7 : theme === 'shanshui' ? 7.5 : 3.4, rng, (x, k) => {
        if (theme === 'forest') bi.items.push(...parts.broadleafTree(x, 1, 0, 2.4 + rng() * 1.2, shape, rng, 130 + k));
        // 山水：低缓的山丘，中间留出空当（让后面的峰露出来），丘上一两棵松
        else if (theme === 'shanshui') { bi.withId(130 + k).ball(x, 1, 0, 3.5 + rng() * 2.5, 1.6 + rng() * 1.6, 1.5, r2); if (rng() < 0.6) bi.items.push(...parts.pineTree(x + (rng() - 0.5) * 2, 2.2, 0, 1.4 + rng() * 0.6, shape, rng, 140 + k)); }
        else if (theme === 'cave') bi.withId(130 + k).add('poly', x, 2.5 + rng() * 2, 0, 2.5 + rng() * 2, 6 + rng() * 5, 1.5, r2, { args: [1] });
        else { const g = bi.withId(130 + k).at(x, 1, 0); castleWall(g, 6.5, 3.5 + rng() * 1.5); if (rng() < 0.5) g.box(0, 2.2, 0.3, 0.8, 1.2, 0.1, 'emissive', { noOutline: true }); }
      });
    });
    // 远景 z = −22
    band(-22, '远景', (bi, sp) => {
      bi.box((sp.x0 + sp.x1) / 2, sp.yBottom, 0, sp.x1 - sp.x0, 2 - sp.yBottom, 1, r3, { args: [0.02] });
      // 树线 / 山脚的一整条底（审查修复 7）：中景树冠下面不再露出一条天色——描边和像素化的配方会把每个空当框成一扇扇白「窗」
      if (theme === 'forest') bi.box((sp.x0 + sp.x1) / 2, 1.9, -0.6, sp.x1 - sp.x0, 3.4, 0.6, 'foliage2', { args: [0.02] });
      else if (theme === 'shanshui') bi.box((sp.x0 + sp.x1) / 2, 1.9, -0.6, sp.x1 - sp.x0, 1.6, 0.6, r2, { args: [0.02] });
      else if (theme === 'cave') strew(sp, 5, rng, (x, k) => bi.withId(185 + k).add('pyramid', x, 2.4 + rng() * 1.2, 0.8, 0.35, 0.7 + rng() * 0.5, 0.3, 'emissive', { noOutline: true }));
      strew(sp, theme === 'forest' ? 2.6 : 6, rng, (x, k) => {
        if (theme === 'forest') bi.items.push(...parts.pineTree(x, 2, 0, 3 + rng() * 2, shape, rng, 150 + k).map((it) => ({ ...it, role: it.role === 'trunk' ? it.role : 'foliage2' as Role })));
        else if (theme === 'ruins') { const g = bi.withId(150 + k).at(x, 2, 0); if (rng() < 0.45) tower(g, 1.6 + rng(), 7 + rng() * 6, true); else castleWall(g, 8, 4 + rng() * 2); }
        // 山水：瘦高的峰（一座座立起来，长卷里的主峰）
        else if (theme === 'shanshui') bi.withId(150 + k).ball(x, 2, 0, 2.2 + rng() * 2, 7 + rng() * 7, 2, r3);
        else bi.withId(150 + k).ball(x, 2, 0, 4 + rng() * 3, 5 + rng() * 6, 2, r3);
      });
    });
    // 天边 z = −45：山（洞窟是一整面岩壁），山顶带雪，再挂几朵静止的云
    band(-45, '天边', (bi, sp) => {
      if (theme === 'cave') {
        // 一整面岩壁（原来挂着几颗发光球，透过钟乳石看像一个个桃色的月亮，审查修复 8：晶石的微光挪到远景低处）
        bi.box((sp.x0 + sp.x1) / 2, sp.yBottom, 0, sp.x1 - sp.x0, 60, 1, r4, { args: [0.02] });
        return;
      }
      // 山水：天边是更高更淡的远峰（雾吃掉大半），其余主题是带雪顶的山
      if (theme === 'shanshui') strew(sp, 9, rng, (x, k) => bi.withId(160 + k).ball(x, sp.yBottom + 2, 0, 4 + rng() * 4, 24 + rng() * 16 - sp.yBottom, 2, r4));
      else strew(sp, 11, rng, (x, k) => {
        const h = 10 + rng() * 12, w = 16 + rng() * 14;
        bi.withId(170 + k).add('pyramid', x, sp.yBottom + (h - sp.yBottom) / 2, 0, w, h - sp.yBottom, 2, r4);
        if (theme !== 'ruins') bi.withId(170 + k).add('pyramid', x, h - 2.2, 0.3, w * (4.4 / (h - sp.yBottom)), 4.4, 2, 'snow');
      });
      if (theme === 'ruins') bi.withId(199).ball(LEVEL[1] * 0.6, 16, 0, 2.6, 2.6, 0.5, 'emissive', { noOutline: true });
      strew(sp, 16, rng, (x, k) => bi.items.push(...parts.cloud(2.2 + rng() * 1.5, shape, rng, 190 + k).map((it) => ({ ...it, pos: [it.pos[0] + x, it.pos[1] + 15 + rng() * 6, it.pos[2]] as [number, number, number] }))));
    }, 0.2);
    // 前景 z = +3：画面底边零星的草丛 / 石笋 / 断石——暗（墨色剪影）、少、矮（审查修复 8）：按 s = D / (D − z) 放大后顶端仍低于走道约 0.5，
    // 起点一屏之内不放（原来起点正前方一根 3–5 高的石笋戳过走道，像地上裂了一道）
    band(3, '前景', (bi, sp) => {
      strew({ x0: sp.x0, x1: sp.x1 }, 7, rng, (x, k) => {
        if (Math.abs(x) < 6) return;
        const g = bi.withId(210 + k).at(x, -2.6, 0);
        if (theme === 'cave') { g.add('pyramid', 0, 0.8, 0, 1.4, 1.6 + rng() * 0.5, 0.8, 'ink'); g.add('pyramid', 0.7, 0.55, 0, 0.8, 1.1, 0.6, 'ink'); }
        else if (theme === 'ruins') g.box(0, 0, 0, 1.6, 1.0 + rng() * 0.8, 0.8, 'ink', { rz: (rng() - 0.5) * 0.4 });
        else grassTuft(g, rng, 2.5, 'ink');
      });
    }, 0.5);

    const map = {
      plane: 'xy' as const, x: LEVEL, y: [-4, T.ceiling ? 8 : 12] as [number, number],
      solidAt: (x: number, y: number) => {
        const s = segAt(segs, x);
        if (s && y <= s.h) return true;
        if (ledges.some((l) => x >= l.x0 && x <= l.x1 && y <= l.y && y >= l.y - 0.45)) return true;
        return !!T.ceiling && y >= 5.6;
      },
    };
    return {
      items, layers, lights, actors, map,
      dynamic: [characterAt(v, 0, 0, 0)],
      ground: { heightAt: (x) => yAt(x), inside: (x) => x > LEVEL[0] + 0.5 && x < LEVEL[1] - 0.5 && !!segAt(segs, x) },
      bounds: { center: [0, 2, -6], radius: 34 },
      viewSize: VIEW,
      playerStart: [0, 0, 0],
      playerFacing: Math.PI / 2,
      // 内容框：竖屏时取景放大到至少 7 宽（角色左右各留三格多），不至于只看见角色一条（审查修复 2）
      camera: { ...RIG_SIDE, viewSize: VIEW, target: [0, VIEW * FRAME_Y, 0], xRange: LEVEL, fit: { w: 7 } },
    };
  };
}

registerSceneBuilder('sideStage', sideStage('forest'));
registerSceneBuilder('sideStage-cave', sideStage('cave'));
registerSceneBuilder('sideStage-ruins', sideStage('ruins'));
registerSceneBuilder('sideStage-shanshui', sideStage('shanshui'));

/* ======================== 几何白盒 ======================== */

/** 白盒·平台：只用方块、楔形、圆柱、球的横版关卡（Thomas Was Alone 一类）；颜色即信息：结构灰、可交互金、危险强调色 */
registerSceneBuilder('greybox', (ctx) => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const L: [number, number] = [-24, 24], V = 9;
  const segs: Seg[] = [{ x0: -26, x1: -9, h: 0 }, { x0: -7, x1: 6, h: 0 }, { x0: 6, x1: 11, h: 1.2 }, { x0: 13, x1: 19, h: 2.4 }, { x0: 19, x1: 26, h: 0.6 }];
  for (const s of segs) b.withId(3).box((s.x0 + s.x1) / 2, -12, -0.2, s.x1 - s.x0, s.h + 12, 1.6, 'structure', { args: [0] });
  // 坡（楔形）、悬空平台、柱、门
  b.withId(6).add('wedge', 9.5, 0.6, -0.2, 1.6, 1.2, 1.6, 'structure', { ry: Math.PI / 2, rz: 0 });
  for (const [x, y, w] of [[-14, 2.6, 4], [-2, 3, 3], [16, 5, 3]] as [number, number, number][]) b.withId(7).box(x, y, -0.2, w, 0.5, 1.4, 'trim', { args: [0] });
  b.withId(8).cyl(-11, 0, -0.2, 0.5, 4.5, 'metal', 1);
  b.withId(9).box(23, 0.6, -0.2, 1.2, 2.4, 0.4, 'emissive', { args: [0] });
  // 危险区：一排尖刺（锥）
  for (let k = 0; k < 5; k++) b.withId(10).add('pyramid', -8 + k * 0.4, 0.2, -0.2, 0.35, 0.4, 0.35, 'accent');
  const actors: SceneActor[] = [];
  let id = 20;
  const yAt = (x: number) => segAt(segs, x)?.h ?? 0;
  const put = (x: number, f: (g: B) => void, kind: SceneActor['kind'], label: string, h: number) => { const g = b.withId(id++).at(x, yAt(x), 0); f(g); actors.push(actor(kind, label, [x, yAt(x), 0], h, g.id)); };
  put(-3, (g) => g.box(0, 0, 0, 0.6, 1.4, 0.6, 'cloth', { args: [0] }), 'npc', '高个子', 1.4);
  put(4.2, (g) => g.ball(0, 0.45, 0, 0.45, 0.45, 0.45, 'accent'), 'enemy', '红球', 0.9);
  put(8.5, (g) => g.add('poly', 0, 0.5, 0, 0.5, 0.5, 0.5, 'interactive', { args: [0] }), 'pickup', '方块', 0.8);
  put(16, (g) => g.box(0, 0, 0, 0.9, 0.9, 0.9, 'accent', { args: [0] }), 'enemy', '红块', 0.9);
  put(23, () => {}, 'objective', '出口', 2.4);
  // 身后两层大几何（圆、方、三角），给一点纵深。用天色（地平线色）、低对比，只有可玩的方块带色相（审查修复 12：原来用布料 / 饰件色，
  // 配方把它们涂成饱和蓝和纯黑，和平台一样抢眼，像能踩的平台）
  const layers: SceneLayer[] = [];
  for (const [z, n, role] of [[-6, 9, 'skyHorizon'], [-20, 7, 'skyHorizon']] as [number, number, Role][]) {
    const li: Item[] = [], bi = new B(li, 100 + z * -1);
    for (let k = 0; k < n; k++) {
      const x = -40 + (k / (n - 1)) * 80 + (rng() - 0.5) * 6, s = 3 + rng() * 5, y = -2 + rng() * 9, kind = k % 3;
      if (kind === 0) bi.box(x, y - s / 2, 0, s, s, 0.5, role, { args: [0] });
      else if (kind === 1) bi.add('cylinder', x, y, 0, s, 0.5, s, role, { rx: Math.PI / 2, args: [1] });
      else bi.add('wedge', x, y, 0, s, s, 0.5, role);
    }
    layers.push({ z, items: flatten(li, z, 0.6), name: z === -6 ? '中景' : '远景' });
  }
  return {
    items, layers, actors, lights: [],
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: (x) => yAt(x), inside: (x) => x > L[0] && x < L[1] && !!segAt(segs, x) },
    map: { plane: 'xy', x: L, y: [-3, 8], solidAt: (x, y) => { const s = segAt(segs, x); return !!s && y <= s.h; } },
    bounds: { center: [0, 2, -4], radius: 28 }, viewSize: V,
    playerStart: [0, 0, 0], playerFacing: Math.PI / 2,
    camera: { ...RIG_GREYBOX, viewSize: V, target: [0, V * (RIG_GREYBOX.frameOffset?.[1] ?? 0.24), 0], xRange: L, fit: { w: 8 } },
  };
});

/** 白盒·竞技场：正俯视的几何竞技场（双摇杆射击一类）：围墙、障碍块、四面涌来的几何敌人和散落的宝石 */
registerSceneBuilder('greybox-arena', (ctx) => {
  const v = ctx.values, rng = ctx.rng;
  const items: Item[] = [];
  const b = new B(items, 3);
  const H = 13;
  // 场外：一整块暗色地面（任何比例、拉远都不露天色）
  b.withId(2).box(0, -0.9, 0, 160, 0.2, 160, 'ink', { args: [0], noOutline: true, flat: true });
  b.withId(3).box(0, -0.3, 0, H * 2, 0.3, H * 2, 'structure', { args: [0], flat: true });
  for (let k = -H; k <= H; k += 2) { b.withId(4).box(k, 0, 0, 0.05, 0.02, H * 2, 'trim', { args: [0], noOutline: true, flat: true }); b.withId(4).box(0, 0, k, H * 2, 0.02, 0.05, 'trim', { args: [0], noOutline: true, flat: true }); }
  for (const s of [-1, 1]) { b.withId(5).box(s * (H + 0.4), 0, 0, 0.8, 1, H * 2 + 1.6, 'metal', { args: [0] }); b.withId(5).box(0, 0, s * (H + 0.4), H * 2 + 1.6, 1, 0.8, 'metal', { args: [0] }); }
  for (let k = 0; k < 7; k++) { const a = rng() * Math.PI * 2, r = 4 + rng() * 6; b.withId(6 + k).box(Math.cos(a) * r, 0, Math.sin(a) * r, 1 + rng() * 1.5, 0.8, 1 + rng() * 1.5, 'trim', { args: [0], ry: rng() }); }
  const actors: SceneActor[] = [];
  let id = 20;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + rng() * 0.2, r = 7.5 + rng() * 4, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const g = b.withId(id++).at(x, 0, z, rng() * 3);
    if (k % 3 === 0) g.add('pyramid', 0, 0.45, 0, 0.8, 0.9, 0.8, 'accent'); else if (k % 3 === 1) g.box(0, 0, 0, 0.7, 0.7, 0.7, 'cloth', { args: [0] }); else g.ball(0, 0.4, 0, 0.4, 0.4, 0.4, 'accent');
    if (k < 6) actors.push(actor('enemy', ['三角', '方块', '圆球'][k % 3], [x, 0, z], 0.9, g.id));
  }
  for (let k = 0; k < 10; k++) { const x = (rng() - 0.5) * 18, z = (rng() - 0.5) * 18; const g = b.withId(id++).at(x, 0, z); gem(g, 'emissive', 0.8); if (k < 3) actors.push(actor('pickup', '宝石', [x, 0, z], 0.5, g.id)); }
  return {
    items, actors, lights: [],
    dynamic: [characterAt(v, 0, 0, 0)],
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x) < H - 0.6 && Math.abs(z) < H - 0.6 },
    bounds: { center: [0, 0.5, 0], radius: H * 1.3 }, viewSize: 16,
    playerStart: [0, 0, 0],
    // 正俯视下角色原来只剩约 8 像素、比敌人还小：放大 2.2 倍（审查修复 12）；跟拍夹在围墙以内（审查修复 4）
    playerScale: 2.2,
    camera: { ...RIG_ARENA_TOP, viewSize: 16, bounds: [-H - 1, H + 1, -H - 1, H + 1] },
  };
});
