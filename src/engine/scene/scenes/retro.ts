import { RIG_MAZE, RIG_MODE7, RIG_RHYTHM, RIG_ROAD, RIG_SHMUP } from '../../../content/scenes25d/retro';
import type { Role } from '../../../content/roles';
import { B } from '../kits';
import { actor } from '../kits2d';
import * as R from '../kitsRetro';
import { registerSceneBuilder } from '../sceneRegistry';
import type { DynamicGroup, Item, SceneActor, SceneDesc, SceneEmitter } from '../types';

/*
 * 技术补全（2026-10-23）K·伪3D与复古镜头 轨道的场景构建器（元数据与 rig 在 content/scenes25d/retro.ts）。
 * 镜头：SceneRig.chase / eye / steer（Engine.placePov）；路边精灵是公告板动态组（DynamicGroup.billboard，每帧正对镜头）；
 * 地平线的远山 / 云 / 落日是跟着玩家走的一组（anim.follow = [1, 0, 1]），永远一样远、转向时横着滑——伪 3D 的视差带。
 */

const box = (pos: [number, number, number], scale: [number, number, number], role: Role, rot?: [number, number, number], id = 3, extra: Partial<Item> = {}): Item =>
  ({ prim: 'box', args: [0], pos, scale, role, rot, id, flat: true, noOutline: true, ...extra });

/* ============================================================
 * 伪3D·公路 road-pseudo3d（OutRun / Super Hang-On）
 * 路沿 −z 延伸（玩家朝 π），按 4 米一段铺：每段一块路面 + 两条红白交替的路肩 + 隔段一对车道虚线 + 横贯整片地面、一深一浅交替的草带。
 * 弯道 = 横向斜率按平滑的鼓包叠加（路面每段按斜率转），坡 = 高度按鼓包叠加（每段按坡度俯仰）；草带不转向、只俯仰（弯道外侧不会裂出楔形缝）。
 * 左边一条沙滩接海，右边草地；远山、云、落日在地平线视差带里。
 * ============================================================ */

const SEG = 4;
const D0 = -90, D1 = 1240;
const HALF = 6, RUMBLE = 1.15;

/** 平滑鼓包：|t| < 1 时 0.5(1 + cos πt)，外面 0 */
const bump = (t: number) => (Math.abs(t) < 1 ? 0.5 * (1 + Math.cos(Math.PI * t)) : 0);

function roadProfile(rng: () => number) {
  // 开头一段固定（默认构图：起跑线、右弯、坡顶），后面按种子
  const curves: [number, number, number][] = [[175, 0.52, 115], [420, -0.55, 110]];
  const hills: [number, number, number][] = [[150, 11, 85], [330, 6, 70]];
  for (let c = 650; c < D1 + 200; c += 140 + rng() * 120) curves.push([c, (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.35), 80 + rng() * 60]);
  for (let c = 560; c < D1 + 200; c += 120 + rng() * 140) hills.push([c, 2 + rng() * 9, 50 + rng() * 50]);
  const n = Math.ceil((D1 - D0) / SEG) + 1;
  const d = new Float32Array(n), x = new Float32Array(n), y = new Float32Array(n);
  const slopeAt = (q: number) => curves.reduce((s, [c, a, w]) => s + a * bump((q - c) / w), 0);
  for (let i = 0; i < n; i++) {
    d[i] = D0 + i * SEG;
    y[i] = hills.reduce((s, [c, h, w]) => s + h * bump((d[i] - c) / w), 0);
    if (i > 0) x[i] = x[i - 1] + (SEG * (slopeAt(d[i - 1]) + slopeAt(d[i]))) / 2;
  }
  // 让 d = 0 处的路心在 x = 0
  const i0 = Math.round(-D0 / SEG), off = x[i0];
  for (let i = 0; i < n; i++) x[i] -= off;
  const at = (q: number) => {
    const f = Math.max(0, Math.min(n - 1.001, (q - D0) / SEG)), i = Math.floor(f), t = f - i;
    return { x: x[i] + (x[i + 1] - x[i]) * t, y: y[i] + (y[i + 1] - y[i]) * t, s: (x[i + 1] - x[i]) / SEG, p: (y[i + 1] - y[i]) / SEG };
  };
  return { d, x, y, n, at, slopeAt };
}

registerSceneBuilder('road-pseudo3d', (ctx) => {
  const rng = ctx.rng;
  const P = roadProfile(rng);
  const items: Item[] = [];
  // 海：一整块，压在所有东西下面
  items.push(box([0, -0.9, -1000], [6000, 1, 4200], 'water', undefined, 2));
  for (let i = 0; i < P.n - 1; i++) {
    const dm = P.d[i] + SEG / 2, xm = (P.x[i] + P.x[i + 1]) / 2, ym = (P.y[i] + P.y[i + 1]) / 2;
    const s = (P.x[i + 1] - P.x[i]) / SEG, dy = (P.y[i + 1] - P.y[i]) / SEG;
    const pitch = Math.atan(dy), yaw = -Math.atan(s);
    const len = SEG * Math.sqrt(1 + s * s + dy * dy);
    const nx = 1 / Math.sqrt(1 + s * s), nz = s / Math.sqrt(1 + s * s);
    const z = -dm;
    const band = Math.floor(i / 2) % 2 === 0;
    // 地面横带：不转向、只俯仰（一深一浅交替，横贯整片），左边 14 米外是沙滩、30 米外下到海里
    const gl = SEG * Math.sqrt(1 + dy * dy) + 0.04;
    items.push(box([xm + 250, ym - 1.6, z], [500, 3.2, gl], band ? 'grass' : 'foliage2', [pitch, 0, 0]));
    items.push(box([xm - 7, ym - 1.6, z], [14, 3.2, gl], band ? 'grass' : 'foliage2', [pitch, 0, 0]));
    items.push(box([xm - 22.5, ym - 1.62 - 0.08, z], [17, 3.2, gl], 'sand', [pitch, 0, 0]));
    // 路面（略高于草）、路肩（红白每段交替）、车道虚线（隔段一对）
    const L = len + 0.3;
    items.push(box([xm, ym - 0.13, z], [HALF * 2, 0.3, L], 'path', [pitch, yaw, 0], 4));
    for (const sd of [-1, 1]) {
      const o = sd * (HALF + RUMBLE / 2);
      items.push(box([xm + nx * o, ym - 0.125, z + nz * o], [RUMBLE, 0.3, len + 0.04], i % 2 ? 'accent' : 'paper', [pitch, yaw, 0], 5));
    }
    if (i % 2 === 0) for (const sd of [-1, 1]) {
      const o = sd * (HALF / 3);
      items.push(box([xm + nx * o, ym + 0.035, z + nz * o], [0.26, 0.04, SEG * 0.95], 'paper', [pitch, yaw, 0], 6));
    }
  }
  const at = P.at;
  const ry = (q: number) => Math.PI - Math.atan(at(q).s);
  // 起跑线：路面上两排黑白格 + 龙门架（两根柱子 + 黑白格横幅）
  {
    const q = 26, c = at(q), b = new B(items, 7);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) items.push(box([c.x - HALF + (k + 0.5), c.y + 0.03 + r * 0.001, -q - r * 1.0], [1, 0.04, 1], (k + r) % 2 ? 'ink' : 'paper', [Math.atan(c.p), 0, 0], 7));
    const g = b.at(c.x, c.y, -q);
    for (const sx of [-1, 1]) { g.box(sx * (HALF + 2.2), 0, 0, 0.7, 7.4, 0.7, 'metal', { args: [0.1] }); g.box(sx * (HALF + 2.2), 7.4, 0, 1.1, 0.4, 1.1, 'metal', { args: [0.1] }); }
    g.box(0, 6.0, 0, HALF * 2 + 5.4, 1.8, 0.35, 'paper', { args: [0] });
    for (let r = 0; r < 2; r++) for (let k = 0; k < 18; k++) if ((k + r) % 2) g.box(-(HALF + 2.5) + (k + 0.5) * ((HALF * 2 + 5) / 18), 6.1 + r * 0.8, 0.2, (HALF * 2 + 5) / 18, 0.8, 0.06, 'ink', { args: [0], noOutline: true });
    g.box(0, 5.55, 0.21, HALF * 2 + 5.4, 0.22, 0.05, 'accent', { args: [0], noOutline: true });
  }
  // 检查点（坡后面）
  const cp = 330, cc = at(cp);
  {
    const g = new B(items, 8).at(cc.x, cc.y, -cp);
    for (const sx of [-1, 1]) g.box(sx * (HALF + 2), 0, 0, 0.8, 8, 0.8, 'accent', { args: [0.2] });
    g.box(0, 6.6, 0, HALF * 2 + 5, 1.6, 0.4, 'interactive', { args: [0.1] });
  }

  // 对手车（真 3D，开在车道上）
  const actors: SceneActor[] = [];
  let id = 40;
  const rivals: [number, number, Role][] = [[44, 4, 'interactive'], [78, -4, 'cloth'], [128, 0.4, 'metal'], [196, 4, 'accent']];
  for (const [q, lane, role] of rivals) {
    const c = at(q), n = Math.hypot(1, c.s), lx = c.x + lane / n, z = -q + (lane * c.s) / n;
    R.rivalCar(new B(items, id++).at(lx, c.y + 0.02, z, ry(q)), role);
    actors.push(actor('enemy', '对手车', [lx, c.y, z], 1.3, id - 1));
  }
  actors.push(actor('objective', '检查点', [cc.x, cc.y, -cp], 8));

  // 路边精灵（公告板）：左边沙滩一排棕榈，右边棕榈 / 灌木 / 岩石混排；弯道外侧一串箭头牌；几块广告牌
  const dyn: DynamicGroup[] = [];
  const put = (q: number, side: number, gap: number, f: (b: B) => void) => {
    const c = at(q), n = Math.hypot(1, c.s), o = side * (HALF + RUMBLE + gap);
    dyn.push(R.sprite(R.draw(id++, f), c.x + o / n, c.y, -q + (o * c.s) / n, 0.1));
  };
  for (let q = 6; q < 640; q += 11 + rng() * 9) put(q, -1, 3 + rng() * 7, (b) => R.palmSprite(b, 7 + rng() * 3.5, 0.5 + rng() * 0.6, rng));
  for (let q = 14; q < 640; q += 15 + rng() * 14) {
    const kind = rng();
    put(q, 1, 3 + rng() * 9, (b) => (kind < 0.5 ? R.palmSprite(b, 6.5 + rng() * 3.5, -(0.4 + rng() * 0.6), rng) : kind < 0.78 ? R.bushSprite(b, rng, 1.4 + rng()) : R.rockSprite(b, rng, 1.6 + rng() * 1.4)));
  }
  // 弯道外侧的箭头牌：斜率在变（正在转弯）的地方，外侧（右弯 = 左边）
  for (let q = 60; q < 640; q += 18) {
    const k = (P.slopeAt(q + 6) - P.slopeAt(q - 6)) / 12;
    if (Math.abs(k) < 0.0011) continue;
    const dir = k > 0 ? 1 : -1;
    put(q, -dir, 1.6, (b) => R.chevronSign(b, dir, 1.3));
  }
  for (const [q, side] of [[96, 1], [300, 1], [560, -1]] as [number, number][]) put(q, side, 6, (b) => R.adBoard(b, rng, 1.3));

  // 地平线视差带（跟着玩家走）：右边一排远山（带雪顶）、左边海上一座低岛 + 落日，几朵云
  {
    const far: Item[] = [], b = new B(far, 300);
    const ring = (deg: number, r: number) => { const a = (deg * Math.PI) / 180; return [Math.sin(a) * r, -Math.cos(a) * r, a] as const; };
    // 落日：海面上方，左前方
    // 落日：六块转开 15° 的方片叠成一个 24 边形（低模表示下也是圆的）
    { const [x, z, a] = ring(-26, 470); for (let k = 0; k < 6; k++) b.add('box', x, 18, z, 46, 46, 2, 'emissive', { args: [0], ry: -a, rz: (k * Math.PI) / 12, noOutline: true }); }
    for (let deg = -6; deg < 125; deg += 7 + rng() * 6) {
      const [x, z, a] = ring(deg, 360 + rng() * 40), h = 26 + rng() * 46 + (deg > 20 && deg < 70 ? 20 : 0), w = 50 + rng() * 50;
      b.add('pyramid', x, h / 2 - 6, z, w, h + 12, 6, rng() < 0.5 ? 'rock' : 'highland', { ry: -a });
      if (h > 50) b.add('pyramid', x - Math.sin(a) * 2, h - 8, z + Math.cos(a) * 2, w * (16 / (h + 12)), 16, 6, 'snow', { ry: -a, noOutline: true });
    }
    // 近一层的绿丘（遮住远山脚）
    for (let deg = 10; deg < 125; deg += 9 + rng() * 6) { const [x, z, a] = ring(deg, 300); b.add('sphere', x, -4, z, 60 + rng() * 40, 18 + rng() * 14, 8, 'foliage2', { ry: -a }); }
    // 海上的低岛
    { const [x, z, a] = ring(-52, 380); b.add('sphere', x, -3, z, 120, 22, 8, 'highland', { ry: -a }); }
    for (let k = 0; k < 9; k++) {
      const [x, z, a] = ring(-80 + k * 22 + rng() * 10, 340);
      const cl: Item[] = [];
      R.cloudSprite(new B(cl, 310 + k), rng, 7 + rng() * 6);
      far.push(...cl.map((it) => ({ ...it, pos: [it.pos[0] * Math.cos(a) + x, it.pos[1] + 70 + rng() * 40, it.pos[0] * Math.sin(a) + z] as [number, number, number], rot: [0, -a, 0] as [number, number, number], scale: [it.scale[0], it.scale[1], 3] as [number, number, number] })));
    }
    dyn.push({ kind: 'prop', items: far, origin: [0, 0, 0], anim: { follow: [1, 0, 1] } });
  }

  // 玩家：红色敞篷跑车（车头朝 +z，引擎按朝向 π 转过来）
  const car: Item[] = [];
  R.sportsCar(new B(car, 2), 'character');
  const start = at(-2);
  dyn.unshift({ kind: 'character', items: car, origin: [0, start.y, 2], fixedBody: true });

  const half = HALF + RUMBLE + 3.5;
  const desc: SceneDesc = {
    items, dynamic: dyn, actors, lights: [],
    ground: {
      heightAt: (_x, z) => at(-z).y + 0.02,
      inside: (x, z) => { const q = -z; return q > -60 && q < 1000 && Math.abs(x - at(q).x) < half; },
    },
    bounds: { center: [0, 4, -300], radius: 420 },
    viewSize: 10,
    playerStart: [0, start.y + 0.02, 2],
    playerFacing: Math.PI,
    camera: { ...RIG_ROAD },
  };
  return desc;
});

/* ============================================================
 * Mode7·赛场 mode7-track（SNES 超级马力欧赛车 / F-Zero）
 * 一整张平地：闭合的赛道（闭合 Catmull-Rom 曲线按约 3 米一段采样，每段一块路面 + 两条红白路肩 + 外侧一条土路边），
 * 场外草地铺深浅相间的大方格（Mode 7 的贴图地面一眼看得出是平铺的），内场一汪湖；起终点黑白格、加速箭头、一排道具箱、一串金币。
 * 对手卡丁车是公告板精灵（单一朝向）；地平线视差带：一圈小山、远山、城堡、云，跟着玩家走。
 * ============================================================ */

/** 闭合 Catmull-Rom：按弧长大约每 step 米取一个点（点、切向） */
function closedSpline(pts: [number, number][], step: number): { p: [number, number]; t: [number, number] }[] {
  const n = pts.length, dense: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const out: { p: [number, number]; t: [number, number] }[] = [];
  let acc = 0;
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i], b = dense[(i + 1) % dense.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (i === 0 || acc >= step) { out.push({ p: a, t: [(b[0] - a[0]) / (L || 1), (b[1] - a[1]) / (L || 1)] }); acc = 0; }
    acc += L;
  }
  return out;
}

registerSceneBuilder('mode7-track', (ctx) => {
  const rng = ctx.rng;
  const items: Item[] = [];
  const W = 7, CURB = 1.3, DIRT = 2.6, FIELD = 200;
  // 赛道：玩家在 (0, 30) 朝 −z（朝 π）起跑，先一段直道，右转进一组 S 弯，绕回来
  const ctrl: [number, number][] = [[0, 60], [0, -40], [8, -92], [48, -118], [92, -100], [104, -58], [78, -28], [84, 12], [118, 40], [112, 88], [70, 112], [24, 104]];
  const path = closedSpline(ctrl, 3);
  // 场地：一整块草地底 + 外围深浅大方格（离赛道远一点才铺，免得和土路边打架）
  items.push(box([40, -0.5, 0], [FIELD * 2.6, 1, FIELD * 2.6], 'grass', undefined, 2));
  const distTo = (x: number, z: number) => { let m = 1e9; for (const q of path) m = Math.min(m, (q.p[0] - x) ** 2 + (q.p[1] - z) ** 2); return Math.sqrt(m); };
  // 内场的湖（几块圆叠成不规则的一汪，外面一圈沙）
  const lake: [number, number, number][] = [[52, -62, 15], [62, -50, 11], [40, -70, 9]];
  const inLake = (x: number, z: number, pad = 0) => lake.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + pad);
  const T = 10;
  for (let i = -26; i < 26; i++) for (let j = -26; j < 26; j++) {
    if ((i + j) % 2 === 0) continue;
    const x = 40 + (i + 0.5) * T, z = (j + 0.5) * T;
    if (distTo(x, z) < W + CURB + DIRT + 9 || inLake(x, z, 6)) continue;
    items.push(box([x, 0.004, z], [T, 0.02, T], 'foliage2', undefined, 2));
  }
  for (const [cx, cz, r] of lake) {
    items.push({ prim: 'cylinder', args: [1], pos: [cx, 0.012, cz], scale: [(r + 2.4) * 2, 0.02, (r + 2.4) * 2], role: 'sand', id: 9, flat: true, noOutline: true });
    items.push({ prim: 'cylinder', args: [1], pos: [cx, 0.03, cz], scale: [r * 2, 0.02, r * 2], role: 'water', id: 9, flat: true, noOutline: true });
  }
  // 赛道一段段
  path.forEach((q, i) => {
    const nq = path[(i + 1) % path.length];
    const mx = (q.p[0] + nq.p[0]) / 2, mz = (q.p[1] + nq.p[1]) / 2;
    const dx = nq.p[0] - q.p[0], dz = nq.p[1] - q.p[1], L = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz), rx = dz / (L || 1), rz = -dx / (L || 1);
    items.push(box([mx, -0.08, mz], [W * 2, 0.2, L + 0.5], 'path', [0, yaw, 0], 4));
    for (const sd of [-1, 1]) {
      const oC = sd * (W + CURB / 2), oD = sd * (W + CURB + DIRT / 2);
      items.push(box([mx + rx * oC, -0.075, mz + rz * oC], [CURB, 0.2, L + 0.05], i % 2 ? 'accent' : 'paper', [0, yaw, 0], 5));
      items.push(box([mx + rx * oD, -0.09, mz + rz * oD], [DIRT, 0.2, L + 0.6], 'soil', [0, yaw, 0], 6));
    }
  });
  // 起终点：两排黑白格（玩家停在线后面）
  const at = (k: number) => path[((Math.round(k) % path.length) + path.length) % path.length];
  const start = path.reduce((bi, q, i) => (Math.hypot(q.p[0], q.p[1] - 24) < Math.hypot(path[bi].p[0], path[bi].p[1] - 24) ? i : bi), 0);
  {
    const q = at(start), yaw = Math.atan2(q.t[0], q.t[1]), rx = q.t[1], rz = -q.t[0];
    for (let r = 0; r < 2; r++) for (let k = 0; k < 14; k++) {
      const o = -W + (k + 0.5), f = r * 1.0;
      items.push(box([q.p[0] + rx * o + q.t[0] * f, 0.03, q.p[1] + rz * o + q.t[1] * f], [1, 0.04, 1], (k + r) % 2 ? 'ink' : 'paper', [0, yaw, 0], 7));
    }
  }
  // 加速箭头（直道上，两组）、发光
  for (const k of [start + 9, start + 14]) {
    const q = at(k), yaw = Math.atan2(q.t[0], q.t[1]);
    for (const off of [-3.2, 3.2]) {
      const rx = q.t[1], rz = -q.t[0], cx = q.p[0] + rx * off, cz = q.p[1] + rz * off;
      items.push(box([cx, 0.03, cz], [3.2, 0.04, 3.6], 'interactive', [0, yaw, 0], 8));
      for (const s of [-1, 1]) items.push(box([cx + rx * s * 0.62 - q.t[0] * 0.2, 0.06, cz + rz * s * 0.62 - q.t[1] * 0.2], [0.5, 0.04, 1.8], 'emissive', [0, yaw + s * 0.75 + Math.PI, 0], 8));
    }
  }
  const dyn: DynamicGroup[] = [];
  const actors: SceneActor[] = [];
  let id = 40;
  // 一排道具箱（转着、上下浮），一串金币（转着）
  {
    const q = at(start + 26), rx = q.t[1], rz = -q.t[0];
    for (let k = 0; k < 4; k++) {
      const o = -W * 0.75 + (k * W * 1.5) / 3, x = q.p[0] + rx * o, z = q.p[1] + rz * o;
      const it: Item[] = [];
      const b = new B(it, id++);
      b.add('box', 0, 0, 0, 1.6, 1.6, 1.6, 'interactive', { args: [0.25], rx: 0.6, rz: 0.6 });
      b.add('box', 0, 0, 0, 0.6, 0.6, 1.75, 'paper', { args: [0], rx: 0.6, rz: 0.6, noOutline: true });
      dyn.push({ kind: 'prop', items: it, origin: [x, 1.6, z], anim: { spin: 1.6, bob: [0.18, 3] } });
      if (k === 1) actors.push(actor('pickup', '道具箱', [x, 0.8, z], 1.6, id - 1));
    }
    for (let k = 0; k < 7; k++) {
      const qq = at(start + 36 + k * 2), x = qq.p[0] + qq.t[1] * 2.5, z = qq.p[1] - qq.t[0] * 2.5;
      const it: Item[] = [];
      new B(it, id++).add('cylinder', 0, 0, 0, 1.1, 0.18, 1.1, 'emissive', { rx: Math.PI / 2 });
      dyn.push({ kind: 'prop', items: it, origin: [x, 0.9, z], anim: { spin: 3 } });
      if (k === 0) actors.push(actor('pickup', '金币', [x, 0.3, z], 1.1, id - 1));
    }
  }
  // 对手卡丁车：公告板精灵（压扁的一片，永远拿后背对着镜头）
  const rivals: [number, number, Role][] = [[0, -3.2, 'accent'], [1, 3.4, 'interactive'], [4, -0.8, 'cloth'], [8, 3, 'characterAccent'], [14, -3, 'metal'], [23, 1.5, 'trim']];
  for (const [k, off, role] of rivals) {
    const q = at(start + k), x = q.p[0] + q.t[1] * off, z = q.p[1] - q.t[0] * off;
    dyn.push(R.sprite(R.draw(id++, (b) => R.kart(b, role, 'paper')), x, 0, z, 0.15));
    actors.push(actor('enemy', '对手', [x, 0, z], 1.3, id - 1));
  }
  // 场边：绿色水管（真圆柱，四面一样）、灌木精灵
  for (let k = 0; k < path.length; k += 7) {
    const q = path[k], side = k % 14 ? 1 : -1, o = side * (W + CURB + DIRT + 4 + rng() * 6);
    const x = q.p[0] + q.t[1] * o, z = q.p[1] - q.t[0] * o;
    if (inLake(x, z, 3) || distTo(x, z) < W + CURB + DIRT + 2) continue;
    if (rng() < 0.5) {
      const g = new B(items, id++).at(x, 0, z);
      g.cyl(0, 0, 0, 1.15, 2.2, 'foliage', 1, { args: [1] });
      g.cyl(0, 2.2, 0, 1.45, 0.7, 'foliage', 1, { args: [1] });
      g.cyl(0, 2.85, 0, 1.05, 0.08, 'ink', 1, { args: [1], noOutline: true });
    } else dyn.push(R.sprite(R.draw(id++, (b) => R.bushSprite(b, rng, 1.6, 'foliage')), x, 0, z, 0.15));
  }
  actors.push(actor('objective', '终点线', [at(start).p[0], 0, at(start).p[1]], 2));
  // 地平线视差带：一圈圆滚滚的小山 + 远山 + 城堡 + 云（跟着玩家走）
  {
    const far: Item[] = [], b = new B(far, 300);
    const ring = (deg: number, r: number) => { const a = (deg * Math.PI) / 180; return [Math.sin(a) * r, -Math.cos(a) * r, a] as const; };
    for (let deg = 0; deg < 360; deg += 9 + rng() * 7) { const [x, z, a] = ring(deg, 330 + rng() * 30); b.add('pyramid', x, 6, z, 60 + rng() * 50, 34 + rng() * 40, 6, rng() < 0.5 ? 'highland' : 'rock', { ry: -a }); }
    for (let deg = 4; deg < 364; deg += 6 + rng() * 5) { const [x, z, a] = ring(deg, 290); b.add('sphere', x, -2, z, 34 + rng() * 26, 22 + rng() * 18, 6, rng() < 0.5 ? 'foliage' : 'foliage2', { ry: -a }); }
    // 城堡（正前方偏左）
    {
      const [x, z, a] = ring(-18, 280), g = b.at(x, 0, z, -a);
      g.box(0, 0, 0, 34, 22, 6, 'structure', { args: [0] });
      for (const tx of [-17, -6, 6, 17]) { const th = 30 + (Math.abs(tx) < 10 ? 8 : 0); g.cyl(tx, 0, 0, 3.4, th, 'structure', 1, { args: [1] }); g.add('cylinder', tx, th + 4.5, 0, 8.4, 9, 8.4, 'roof', { args: [0] }); }
      g.box(0, 0, 3.2, 7, 10, 0.5, 'ink', { args: [0], noOutline: true });
    }
    for (let k = 0; k < 12; k++) {
      const [x, z, a] = ring(k * 30 + rng() * 14, 300);
      const cl: Item[] = [];
      R.cloudSprite(new B(cl, 330 + k), rng, 6 + rng() * 5);
      far.push(...cl.map((it) => ({ ...it, pos: [it.pos[0] * Math.cos(a) + x, it.pos[1] + 62 + rng() * 34, it.pos[0] * Math.sin(a) + z] as [number, number, number], rot: [0, -a, 0] as [number, number, number], scale: [it.scale[0], it.scale[1], 3] as [number, number, number] })));
    }
    dyn.push({ kind: 'prop', items: far, origin: [0, 0, 0], anim: { follow: [1, 0, 1] } });
  }
  // 玩家卡丁车（真 3D，车头朝 +z）
  const kartItems: Item[] = [];
  R.kart(new B(kartItems, 2), 'character', 'characterAccent');
  const s0 = at(start - 2);
  dyn.unshift({ kind: 'character', items: kartItems, origin: [s0.p[0] + 1.5, 0, s0.p[1]], fixedBody: true });
  const facing = Math.atan2(s0.t[0], s0.t[1]);
  return {
    items, dynamic: dyn, actors, lights: [],
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x - 40) < FIELD - 10 && Math.abs(z) < FIELD - 10 && !inLake(x, z) },
    bounds: { center: [40, 1, 0], radius: 240 },
    viewSize: 10,
    playerStart: [s0.p[0] + 1.5, 0, s0.p[1]],
    playerFacing: facing,
    camera: { ...RIG_MODE7 },
  };
});

/* ============================================================
 * 第一人称·迷宫 fp-maze（Wolfenstein 3D / 魔眼杀机 / Legend of Grimrock）
 * 3 米一格的格子地牢：墙面是一块块错缝的石块（块与块之间露出暗色的灰缝），地面是方石板，天花板横着木梁；
 * 主走廊尽头一扇铁箍木门，两侧火把；走廊在中段两级台阶上去、天花板升高（扇区式 2.5D：每格自己的地面 / 天花板高度）。
 * 骷髅兵、史莱姆、药水、钥匙、金币都是公告板精灵（单一朝向，不是 8 方向图）。镜头：眼睛高度的第一人称，W / S 前后、A / D 转身。
 * ============================================================ */

const MAZE = [
  '###########',
  '#.........#',
  '#.###D###.#',
  '#.#.....#.#',
  '#.#.#.#.#.#',
  '#...#.#...#',
  '#####.#####',
  '#.....#...#',
  '#.###.#.#.#',
  '#...#...#.#',
  '###.#P#...#',
  '###########',
];
const MC = 3;

registerSceneBuilder('fp-maze', (ctx) => {
  const rng = ctx.rng;
  const H = MAZE.length, Wd = MAZE[0].length;
  const cell = (i: number, j: number) => (j < 0 || j >= H || i < 0 || i >= Wd ? '#' : MAZE[j][i]);
  const open = (i: number, j: number) => { const c = cell(i, j); return c === '.' || c === 'P'; };
  const cx = (i: number) => (i - (Wd - 1) / 2) * MC, cz = (j: number) => (j - (H - 1) / 2) * MC;
  // 扇区：主走廊北段（第 3、4 排）地面抬高 0.6（两级台阶），天花板升到 5.4；其余地面 0、天花板 3.3
  const floorY = (i: number, j: number) => (j <= 3 && j >= 1 && i >= 3 && i <= 7 ? 0.6 : j === 4 && i === 5 ? 0.3 : 0);
  const ceilY = (i: number, j: number) => (j <= 4 && j >= 3 && i >= 3 && i <= 7 ? 5.4 : 3.3);
  const items: Item[] = [];
  // 墙芯：每个墙格一整块暗色的岩（石块之间的灰缝就是它）
  for (let j = 0; j < H; j++) for (let i = 0; i < Wd; i++) if (!open(i, j)) items.push(box([cx(i), 2.5, cz(j)], [MC, 6.2, MC], 'rock', undefined, 2, { noOutline: false }));
  // 地面底（灰缝色）与石板
  items.push(box([0, -0.3, 0], [Wd * MC, 0.6, H * MC], 'rock', undefined, 2));
  let id = 10;
  const lights: SceneDesc['lights'] = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < Wd; i++) {
    if (!open(i, j)) continue;
    const x0 = cx(i), z0 = cz(j), fy = floorY(i, j), cy = ceilY(i, j);
    // 抬高的格子：下面垫一整块
    if (fy > 0) items.push(box([x0, fy / 2 - 0.02, z0], [MC, fy, MC], 'stone', undefined, 4, { noOutline: false }));
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) {
      const tw = MC / 2 - 0.07;
      items.push(box([x0 + (a - 0.5) * (MC / 2), fy + 0.02, z0 + (c - 0.5) * (MC / 2)], [tw, 0.08, tw], rng() < 0.75 ? 'path' : 'stone', [0, (rng() - 0.5) * 0.04, 0], 4));
    }
    // 天花板：一块板 + 一根横梁
    items.push(box([x0, cy + 0.3, z0], [MC, 0.6, MC], 'rock', undefined, 2));
    items.push(box([x0, cy - 0.16, z0], [MC + 0.02, 0.32, 0.36], 'wood', undefined, 5, { noOutline: false }));
    // 四面：邻格是墙就砌一面石块墙（错缝；底下两排偶尔长苔）
    const faces: [number, number, number, number][] = [[0, -1, 0, 1], [0, 1, 0, -1], [-1, 0, 1, 0], [1, 0, -1, 0]];
    for (const [di, dj, nx, nz] of faces) {
      const ni = i + di, nj = j + dj;
      // 邻格是开着的：天花板高低差处在高的一侧补一截墙（台阶的立面就是抬高格子的垫块侧面）
      if (open(ni, nj)) {
        const ncy = ceilY(ni, nj);
        if (ncy < cy) {
          const px = x0 + di * MC * 0.5, pz = z0 + dj * MC * 0.5;
          items.push(box([px, (ncy + cy) / 2, pz], [di ? 0.3 : MC, cy - ncy, dj ? 0.3 : MC], 'stone', undefined, 4, { noOutline: false }));
        }
        continue;
      }
      const door = cell(ni, nj) === 'D';
      const fx = x0 + di * MC * 0.5, fz = z0 + dj * MC * 0.5;
      // 面上的局部坐标：u 沿墙（右手方向），法线朝格子里 (nx, nz)
      const ux = -nz, uz = nx;
      // 门：门板 + 石门框钉在墙面上，四周照样砌石块（门洞那一块不砌）
      if (door) R.dungeonDoor(new B(items, 6).at(fx + nx * 0.1, fy, fz + nz * 0.1, Math.atan2(nx, nz)), 1.7, 2.45);
      let y = fy - 0.04, row = 0;
      while (y < cy - 0.05) {
        const rh = Math.min(cy - y, 0.36 + rng() * 0.12);
        let u = -MC / 2 - (row % 2 ? 0.35 : 0) - rng() * 0.2;
        while (u < MC / 2) {
          const bw = 0.55 + rng() * 0.45, a = Math.max(u, -MC / 2), e = Math.min(u + bw, MC / 2);
          if (e - a > 0.12 && !(door && a < 1.3 && e > -1.3 && y < fy + 2.8)) {
            const mid = (a + e) / 2, dep = 0.08 + rng() * 0.05;
            const role: Role = row < 1 && rng() < 0.07 ? 'foliage2' : rng() < 0.16 ? 'rock' : 'stone';
            items.push(box([fx + ux * mid + nx * dep / 2, y + rh / 2, fz + uz * mid + nz * dep / 2], [di ? dep : e - a - 0.06, rh - 0.06, di ? e - a - 0.06 : dep], role, undefined, 7 + ((row + Math.floor(mid * 3)) % 3), { noOutline: false }));
          }
          u += bw;
        }
        y += rh; row++;
      }
    }
  }
  // 火把：主走廊两侧、门两边（灯一直亮）
  const torchAt = (i: number, j: number, di: number, dj: number) => {
    const fx = cx(i) + di * MC * 0.5, fz = cz(j) + dj * MC * 0.5, fy = floorY(i, j);
    R.wallTorch(new B(items, id++).at(fx - di * 0.08, fy, fz - dj * 0.08, Math.atan2(-di, -dj)));
    lights.push({ pos: [fx - di * 0.6, fy + 2.3, fz - dj * 0.6], color: '#FF9A3D', range: 7, intensity: 1.3 });
    return [fx - di * 0.45, fy + 2.3, fz - dj * 0.45] as [number, number, number];
  };
  const flames = [torchAt(5, 8, -1, 0), torchAt(5, 5, 1, 0), torchAt(4, 3, 0, -1), torchAt(6, 3, 0, -1), torchAt(1, 7, 0, -1), torchAt(9, 9, 1, 0)];
  // 精灵：骷髅兵、史莱姆、药水、钥匙、金币
  const dyn: DynamicGroup[] = [];
  const actors: SceneActor[] = [];
  const put = (i: number, j: number, dx: number, dz: number, f: (bb: B) => void, kind: SceneActor['kind'], label: string, h: number) => {
    const x = cx(i) + dx, z = cz(j) + dz, y = floorY(i, j);
    dyn.push(R.sprite(R.draw(id++, f), x, y, z, 0.12));
    actors.push(actor(kind, label, [x, y, z], h, id - 1));
  };
  put(5, 6, 0.3, 0, (bb) => R.skeletonSprite(bb, 1.05), 'enemy', '骷髅兵', 2.1);
  put(5, 3, -0.4, -0.2, (bb) => R.slimeSprite(bb, 'accent', 1.3), 'enemy', '史莱姆', 1.2);
  put(5, 9, -0.5, -0.4, (bb) => R.potionSprite(bb, 'accent', 1.3), 'pickup', '药水', 0.7);
  put(5, 8, 0.7, 0.6, (bb) => R.keySprite(bb, 1.1), 'pickup', '钥匙', 0.5);
  put(6, 3, 0.4, 0.3, (bb) => R.treasureSprite(bb, 1.6), 'pickup', '金币', 0.5);
  actors.push(actor('objective', '木门', [cx(5), floorY(5, 3), cz(2) + MC / 2], 2.8));
  const start = [cx(5), 0, cz(10) + 0.4] as [number, number, number];
  const inside = (x: number, z: number) => {
    const m = 0.38;
    for (const [ox, oz] of [[-m, -m], [m, -m], [-m, m], [m, m]]) {
      const i = Math.round(x / MC + (Wd - 1) / 2 + ox / MC), j = Math.round(z / MC + (H - 1) / 2 + oz / MC);
      if (!open(i, j)) return false;
    }
    return true;
  };
  const fyAt = (x: number, z: number) => floorY(Math.round(x / MC + (Wd - 1) / 2), Math.round(z / MC + (H - 1) / 2));
  return {
    items, dynamic: [{ kind: 'character', items: [], origin: start, fixedBody: true }, ...dyn], actors, lights,
    emitters: flames.map((p) => ({ kind: 'embers' as const, pos: p, role: 'emissive' as Role, count: 16, speed: 0.5, size: 0.07, range: 1.1 })),
    ground: { heightAt: (x, z) => fyAt(x, z), inside },
    bounds: { center: [0, 2, 0], radius: 22 },
    viewSize: 4,
    playerStart: start,
    playerFacing: Math.PI,
    camera: { ...RIG_MAZE },
  };
});

/* ============================================================
 * 竖版·弹幕 shmup-vertical（东方 / 雷电 / 斑鸠）
 * 正交正俯视、固定机位：画面正中一条竖长的游戏区（11 × 14），两边（竖屏时上下）是深色的界面侧板（分数、残机由 UI 画）。
 * 游戏区下面三层往下卷（程序动画 + 两份首尾相接循环）：海面浪花最慢、岛屿（沙滩、草地、树、跑道、地面炮台）中速、云最快——俯视的视差。
 * 自机（真 3D，机头朝上）、敌机编队（转着的圆盘）、中头目；弹幕是场景发射器（GPU 点粒子）：头目的螺旋 + 一圈圈环形弹、
 * 编队朝自机的扇形米粒弹、自机往上的两串子弹。W A S D 在游戏区里平移（不转向）。
 * ============================================================ */

const PW = 11, PH = 14;

/** 一段岛屿带（长 L，以原点为中心）：几座岛（沙滩边 + 草地 + 树 + 跑道 / 房子 + 地面炮台），按种子摆 */
function islandStrip(rng: () => number, L: number, id0: number): Item[] {
  const it: Item[] = [];
  const b = new B(it, id0);
  let z = -L / 2 + 2;
  while (z < L / 2 - 3) {
    const x = (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 3.5), w = 3 + rng() * 4, d = 4 + rng() * 5;
    // 岛：沙滩边（大一圈的扁圆）+ 草地 + 几团林子
    for (let k = 0; k < 3; k++) {
      const ox = (rng() - 0.5) * w * 0.6, oz = (rng() - 0.5) * d * 0.5, rw = w * (0.55 + rng() * 0.4), rd = d * (0.45 + rng() * 0.35);
      it.push({ prim: 'cylinder', args: [1], pos: [x + ox, 0, z + oz], scale: [rw + 0.9, 0.2, rd + 0.9], role: 'sand', id: id0, flat: true, noOutline: true });
      it.push({ prim: 'cylinder', args: [1], pos: [x + ox, 0.12, z + oz], scale: [rw, 0.2, rd], role: 'grass', id: id0, flat: true, noOutline: true });
    }
    for (let k = 0; k < 7; k++) b.add('sphere', x + (rng() - 0.5) * w * 0.8, 0.35, z + (rng() - 0.5) * d * 0.6, 0.7 + rng() * 0.5, 0.5, 0.7 + rng() * 0.5, rng() < 0.5 ? 'foliage' : 'foliage2');
    if (rng() < 0.6) {
      // 跑道 / 公路 + 房子 + 地面炮台（雷电式的地面目标）
      b.box(x, 0.2, z, 0.7, 0.05, d * 0.8, 'path', { args: [0], noOutline: true });
      b.box(x + 0.9, 0.2, z - d * 0.15, 0.9, 0.5, 0.7, 'structure', { args: [0.1] });
      b.add('cylinder', x - 0.9, 0.35, z + d * 0.15, 0.7, 0.3, 0.7, 'metal', {});
      b.add('cylinder', x - 0.9, 0.55, z + d * 0.15, 0.42, 0.2, 0.42, 'accent', {});
      b.box(x - 0.9, 0.6, z + d * 0.15 - 0.4, 0.12, 0.1, 0.6, 'metal', { args: [0] });
    }
    z += d + 2 + rng() * 4;
  }
  return it;
}

registerSceneBuilder('shmup-vertical', (ctx) => {
  const rng = ctx.rng;
  const items: Item[] = [];
  const L = 28;
  // 海（不动的底）
  items.push(box([0, -8, 0], [PW + 2, 0.4, PH + 4], 'waterDeep', undefined, 2));
  // 界面侧板：一整块深色板中间挖出游戏区（左右上下四块，任何画框比例都盖得住），边上一圈金属框
  const PY = 4;
  for (const s of [-1, 1]) {
    items.push(box([s * (PW / 2 + 20), PY, 0], [40, 0.4, 120], 'ink', undefined, 2));
    items.push(box([0, PY, s * (PH / 2 + 20)], [PW + 0.2, 0.4, 40], 'ink', undefined, 2));
    items.push(box([s * (PW / 2 + 0.12), PY + 0.05, 0], [0.24, 0.42, PH + 0.48], 'metal', undefined, 3, { noOutline: false }));
    items.push(box([0, PY + 0.05, s * (PH / 2 + 0.12)], [PW + 0.48, 0.42, 0.24], 'metal', undefined, 3, { noOutline: false }));
    // 侧板上的几个内嵌框（分数、残机、炸弹这些 UI 叠在上面）：细细的一圈边，不抢游戏区
    for (const [z0, h] of [[-PH / 2 + 0.6, 3.2], [-PH / 2 + 4.4, 2.2], [-PH / 2 + 7.2, 2.2], [PH / 2 - 3.6, 3.0]] as [number, number][]) {
      const xc = s * (PW / 2 + 3.4), wq = 4.6;
      for (const dz of [0, h]) items.push(box([xc, PY + 0.22, z0 + dz], [wq, 0.04, 0.07], 'trim', undefined, 4));
      for (const dx of [-wq / 2, wq / 2]) items.push(box([xc + dx, PY + 0.22, z0 + h / 2], [0.07, 0.04, h], 'trim', undefined, 4));
    }
  }
  const dyn: DynamicGroup[] = [];
  const wrap = { axis: 2 as const, lo: -L, hi: L };
  // 三层往下卷：浪花（慢）、岛（中）、云（快）
  for (const z0 of [0, -L]) {
    const caps: Item[] = [];
    for (let k = 0; k < 26; k++) caps.push({ prim: 'sphere', pos: [(rng() - 0.5) * (PW + 1), 0, (rng() - 0.5) * L], scale: [0.5 + rng() * 0.9, 0.05, 0.12 + rng() * 0.1], role: 'water', id: 5, noOutline: true, flat: true });
    dyn.push({ kind: 'prop', items: caps, origin: [0, -7.6, z0], anim: { v: [0, 0, 0.7], wrap } });
    dyn.push({ kind: 'prop', items: islandStrip(rng, L, 30 + (z0 ? 1 : 0)), origin: [0, -6, z0], anim: { v: [0, 0, 1.3], wrap } });
    const cl: Item[] = [];
    for (let k = 0; k < 2; k++) { const cb: Item[] = []; R.cloudSprite(new B(cb, 60), rng, 0.24 + rng() * 0.12); const cx = (rng() - 0.5) * PW, cz = (rng() - 0.5) * L; cl.push(...cb.map((q) => ({ ...q, pos: [q.pos[0] + cx, q.pos[2] * 0.3, q.pos[1] * 1.4 + cz] as [number, number, number], scale: [q.scale[0], 0.4, q.scale[1] * 1.3] as [number, number, number] }))); }
    dyn.push({ kind: 'prop', items: cl, origin: [0, -1.2, z0], anim: { v: [0, 0, 2.6], wrap } });
  }
  // 敌机：上方一个 V 字编队（转着）、左边一列；中头目在正上方
  const actors: SceneActor[] = [];
  let id = 80;
  const boss: [number, number, number] = [0, 0.4, -4.4];
  {
    const it: Item[] = [], g = new B(it, id++);
    g.add('cylinder', 0, 0, 0, 3.6, 0.5, 2.4, 'structure', { args: [0.75] });
    g.add('cylinder', 0, 0.35, 0, 2.2, 0.4, 1.6, 'accent', { args: [0.6] });
    for (const sx of [-1, 1]) { g.box(sx * 2.2, -0.1, 0.1, 1.6, 0.25, 1.2, 'metal', { args: [0.2] }); g.add('cylinder', sx * 2.6, 0.1, 0.7, 0.3, 0.9, 0.3, 'metal', { rx: Math.PI / 2 }); }
    g.ball(0, 0.65, 0.1, 0.5, 0.3, 0.5, 'emissive', { noOutline: true });
    dyn.push({ kind: 'prop', items: it, origin: boss });
    actors.push(actor('boss', '中头目', [boss[0], 0, boss[2]], 1, id - 1));
  }
  const drones: [number, number][] = [[-3.2, -1.6], [-2.2, -2.4], [3.2, -1.6], [2.2, -2.4], [-4.2, 1.2], [-4.2, 2.6], [4, 0.6]];
  for (const [x, z] of drones) {
    const it: Item[] = [];
    R.drone(new B(it, id++), 'accent', 0.62);
    dyn.push({ kind: 'prop', items: it, origin: [x, 0.3, z], anim: { spin: 2.4 } });
    actors.push(actor('enemy', '小飞机', [x, 0, z], 0.6, id - 1));
  }
  // 道具（P 字块，转着）
  for (const [x, z] of [[1.8, 2.2], [-1.2, 0.4]] as [number, number][]) {
    const it: Item[] = [], g = new B(it, id++);
    g.box(0, -0.2, 0, 0.55, 0.4, 0.55, 'interactive', { args: [0.2] });
    g.box(0, 0.02, 0, 0.3, 0.05, 0.3, 'paper', { args: [0], noOutline: true });
    dyn.push({ kind: 'prop', items: it, origin: [x, 0.4, z], anim: { spin: 2 } });
    actors.push(actor('pickup', '火力', [x, 0, z], 0.5, id - 1));
  }
  // 自机：机头朝 −z（画面上方），不随移动转向（strafe：平移）
  const ship: Item[] = [];
  R.fighter(new B(ship, 2), 'character', 'characterAccent', 0.62);
  const start: [number, number, number] = [0, 0.5, PH / 2 - 2.6];
  dyn.unshift({ kind: 'character', items: ship, origin: start, fixedBody: true, strafe: true });
  const emitters: SceneEmitter[] = [
    // 头目：六条螺旋臂 + 一圈圈环形弹
    { kind: 'spiral', pos: [boss[0], 1.2, boss[2]], role: 'accent', count: 6, rings: 30, period: 0.1, speed: 3.4, spin: 1.3, size: 0.34, range: 15 },
    { kind: 'ring', pos: [boss[0], 1.25, boss[2]], role: 'interactive', count: 28, rings: 5, period: 0.85, speed: 2.4, spin: 0.35, size: 0.42, range: 15, shape: 'orb' },
    // 编队：朝自机的扇形米粒弹
    { kind: 'fan', pos: [-2.7, 1.15, -2], role: 'emissive', count: 5, rings: 6, period: 0.42, speed: 4.2, dir: Math.atan2(start[0] + 2.7, start[2] + 2), spread: 0.9, spin: 0.6, size: 0.3, range: 13, shape: 'rice' },
    { kind: 'fan', pos: [2.7, 1.15, -2], role: 'emissive', count: 5, rings: 6, period: 0.42, speed: 4.2, dir: Math.atan2(start[0] - 2.7, start[2] + 2), spread: 0.9, spin: 0.6, size: 0.3, range: 13, shape: 'rice' },
    // 自机：往上的两串子弹（跟着自机走）
    { kind: 'stream', pos: [0, 0.75, -0.7], role: 'characterAccent', count: 2, rings: 12, period: 0.06, speed: 20, dir: Math.PI, spread: 0.42, size: 0.26, range: 15, follow: true, shape: 'rice' },
    // 刚打爆的一架：一团闪光
    { kind: 'sparkle', pos: [3.6, 1.0, -0.4], role: 'emissive', count: 14, speed: 1, size: 0.3, range: 1.4 },
  ];
  return {
    items, dynamic: dyn, actors, lights: [], emitters,
    ground: { heightAt: () => start[1], inside: (x, z) => Math.abs(x) < PW / 2 - 0.7 && Math.abs(z) < PH / 2 - 0.8 },
    bounds: { center: [0, 0, 0], radius: 12 },
    viewSize: PH + 0.6,
    playerStart: start,
    playerFacing: 0,
    camera: { ...RIG_SHMUP, viewSize: PH + 0.6, target: [0, 0, 0], fit: { w: PW + 0.6 } },
  };
});

/* ============================================================
 * 节奏·音轨 rhythm-lanes（吉他英雄 / DJMAX / osu!mania）
 * 透视固定机位、低头看一条往远处收拢的五轨音轨（宽 6、长 60）：深色板面、轨道分隔线、两边发光的边轨；
 * 判定线在近处（五个彩色判定圈 + 一条白杠）；音符（彩色圆宝石，部分带长按尾巴）和每拍一条的品格横杠往判定线流（程序动画，两份首尾相接循环，
 * 速度 = 每拍 3.75 米 × 128 BPM，beatSync 让它跟着 motion.beat 改）。音轨两边一排排光柱，尽头是舞台（背板、大圆环灯、桁架、音箱、乐手剪影），两侧观众的脑袋一起一伏。
 * ============================================================ */

const LANES = 5, LW = 1.2, TRACK = 60, BEAT = 3.75;
const NOTE_SPEED = (BEAT * 128) / 60;
/** 取景（决定镜头离判定线多远）：镜头高约 4、在判定线后约 4.9，判定线落在画面下方约 14% 处、音轨尽头在上方约 18% */
const RHYTHM_VIEW = 10.9;

registerSceneBuilder('rhythm-lanes', (ctx) => {
  const rng = ctx.rng;
  const items: Item[] = [];
  const W = LANES * LW, laneX = (k: number) => (k - (LANES - 1) / 2) * LW;
  const laneRole: Role[] = ['foliage', 'accent', 'interactive', 'water', 'flower'];
  // 地：一整片暗色舞台地面；音轨板面、分隔线、边轨
  items.push(box([0, -0.6, -40], [400, 0.4, 400], 'ink', undefined, 2));
  items.push(box([0, -0.1, -TRACK / 2 + 1], [W + 0.4, 0.2, TRACK + 2], 'ink', undefined, 3));
  for (let k = 1; k < LANES; k++) items.push(box([laneX(k) - LW / 2, 0.01, -TRACK / 2 + 1], [0.05, 0.02, TRACK + 2], 'metal', undefined, 4));
  for (const s of [-1, 1]) {
    items.push(box([s * (W / 2 + 0.12), 0.04, -TRACK / 2 + 1], [0.16, 0.12, TRACK + 2], 'emissive', undefined, 5));
    items.push(box([s * (W / 2 + 0.55), -0.05, -TRACK / 2 + 1], [0.7, 0.14, TRACK + 2], 'metal', undefined, 5));
  }
  // 判定线：白杠 + 五个彩色判定圈（中间暗芯）
  items.push(box([0, 0.03, 0], [W + 0.3, 0.05, 0.14], 'paper', undefined, 6));
  for (let k = 0; k < LANES; k++) {
    items.push({ prim: 'torus', args: [0.16], pos: [laneX(k), 0.06, 0], rot: [Math.PI / 2, 0, 0], scale: [0.95, 0.95, 0.95], role: laneRole[k], id: 7 });
    items.push({ prim: 'cylinder', args: [1], pos: [laneX(k), 0.04, 0], scale: [0.62, 0.04, 0.62], role: 'ink', id: 7, noOutline: true });
  }
  const dyn: DynamicGroup[] = [];
  const wrap = { axis: 2 as const, lo: -TRACK, hi: TRACK };
  // 谱面：两份（各 60 米），每份按拍子撒音符（偶尔和弦、偶尔长按），往判定线流
  for (const z0 of [0, -TRACK]) {
    const notes: Item[] = [], frets: Item[] = [];
    for (let z = -BEAT; z > -TRACK; z -= BEAT) frets.push(box([0, 0.025, z], [W, 0.03, 0.06], 'trim', undefined, 8));
    for (let z = -BEAT * 0.5; z > -TRACK + 1; z -= BEAT * 0.5) {
      if (rng() < 0.35) continue;
      const a = Math.floor(rng() * LANES);
      const lanes = rng() < 0.18 && a < LANES - 1 ? [a, Math.min(LANES - 1, a + 1 + Math.floor(rng() * 2))] : [a];
      for (const k of lanes) {
        if (k >= LANES) continue;
        const x = laneX(k), star = rng() < 0.08, role: Role = star ? 'paper' : laneRole[k];
        notes.push({ prim: 'cylinder', args: [1], pos: [x, 0.12, z], scale: [0.82, 0.2, 0.82], role, id: 9 + k, noOutline: false });
        notes.push({ prim: 'cylinder', args: [1], pos: [x, 0.24, z], scale: [0.4, 0.06, 0.4], role: star ? 'emissive' : 'paper', id: 9 + k, noOutline: true });
        if (rng() < 0.12) notes.push(box([x, 0.08, z - BEAT * 0.75], [0.16, 0.06, BEAT * 1.5], role, undefined, 9 + k));
      }
    }
    // beatSync：速度按 128 BPM 写，引擎乘 motion.beat / 128（配方改了节拍，音符跟着改速，和灯光的闪踩在同一拍上）
    dyn.push({ kind: 'prop', items: frets, origin: [0, 0, z0], anim: { v: [0, 0, NOTE_SPEED], wrap, beatSync: true } });
    dyn.push({ kind: 'prop', items: notes, origin: [0, 0, z0], anim: { v: [0, 0, NOTE_SPEED], wrap, beatSync: true } });
  }
  // 光柱：音轨两边一排（发光柱 + 底座 + 顶上一圈），颜色轮换
  const pillar: Role[] = ['emissive', 'accent', 'interactive'];
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
    const z = -3 - k * 8, x = s * (W / 2 + 2.2 + k * 0.15);
    items.push({ prim: 'cylinder', args: [1], pos: [x, 0.25, z], scale: [0.9, 0.5, 0.9], role: 'metal', id: 20 + k });
    items.push({ prim: 'cylinder', args: [1], pos: [x, 5, z], scale: [0.32, 9, 0.32], role: pillar[k % 3], id: 20 + k, noOutline: true });
    items.push({ prim: 'torus', args: [0.25], pos: [x, 9.6, z], rot: [Math.PI / 2, 0, 0], scale: [0.9, 0.9, 0.9], role: 'metal', id: 20 + k });
  }
  // 舞台：台子、背板、大圆环灯、桁架、音箱、乐手剪影
  {
    const g = new B(items, 40).at(0, 0, -TRACK - 8);
    g.box(0, -0.6, 2, 34, 1.4, 10, 'wood', { args: [0] });
    g.box(0, 0, -3.5, 60, 26, 1, 'structure', { args: [0] });
    g.add('torus', 0, 12, -2.8, 13, 13, 13, 'emissive', { args: [0.07], rx: Math.PI / 2 });
    g.add('torus', 0, 12, -2.7, 8.4, 8.4, 8.4, 'accent', { args: [0.08], rx: Math.PI / 2 });
    g.box(0, 22, 0, 40, 0.8, 0.8, 'metal', { args: [0] });
    for (const sx of [-1, 1]) {
      g.box(sx * 20, 0, 0, 0.8, 23, 0.8, 'metal', { args: [0] });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        g.box(sx * (12.5 + c * 2.6), 0.8 + r * 2.6, 3, 2.4, 2.4, 2, 'ink', { args: [0.05] });
        g.add('cylinder', sx * (12.5 + c * 2.6), 2 + r * 2.6, 4.02, 1.4, 0.1, 1.4, 'metal', { rx: Math.PI / 2 });
      }
      // 桁架上的聚光灯头
      for (let k = 0; k < 4; k++) g.add('cylinder', sx * (3 + k * 4), 21.2, 0.6, 0.8, 1.2, 0.8, 'metal', { rx: 0.5, args: [0.6] });
    }
  }
  const actors: SceneActor[] = [];
  let id = 60;
  for (const [x, role] of [[-6, 'cloth'], [0, 'characterAccent'], [6, 'trim']] as [number, Role][]) {
    const g = new B(items, id++).at(x, 0.1, -TRACK - 5.5);
    g.add('cylinder', 0, 1.1, 0, 1.2, 2.2, 0.9, role, { args: [0.7] });
    g.ball(0, 2.6, 0, 0.45, 0.5, 0.45, 'skin');
    g.box(0.5, 1.4, 0.5, 1.6, 0.35, 0.2, 'wood', { args: [0.3], rz: 0.5 });
    actors.push(actor('npc', ['贝斯手', '主唱', '吉他手'][actors.length], [x, 0.1, -TRACK - 5.5], 3.1, id - 1));
  }
  // 观众：音轨两侧一片片脑袋和举起的手，一起一伏（几组相位错开）
  for (const s of [-1, 1]) for (let grp = 0; grp < 6; grp++) {
    const it: Item[] = [];
    const g = new B(it, 70 + grp);
    for (let k = 0; k < 9; k++) {
      const x = s * (W / 2 + 3.6 + rng() * 6), z = -2 - grp * 6 - rng() * 6;
      g.ball(x, 1.55, z, 0.32, 0.36, 0.32, 'ink');
      g.add('cylinder', x, 0.7, z, 0.75, 1.5, 0.6, 'ink', { args: [0.7] });
      if (rng() < 0.45) g.add('cylinder', x + (rng() - 0.5) * 0.4, 2.1, z, 0.14, 1.1, 0.14, 'ink', { rz: (rng() - 0.5) * 0.6 });
    }
    dyn.push({ kind: 'prop', items: it, origin: [0, 0, 0], anim: { bob: [0.18, 7 + grp * 0.9] } });
  }
  actors.push(actor('objective', '判定线', [0, 0, 0], 0.4));
  actors.push(actor('pickup', '音符', [laneX(2), 0, -BEAT * 2], 0.3));
  return {
    items, dynamic: dyn, actors, lights: [],
    emitters: [
      { kind: 'sparkle', pos: [laneX(1), 0.5, 0], role: 'emissive', count: 16, speed: 1, size: 0.22, range: 1.1 },
      { kind: 'embers', pos: [laneX(1), 0.2, 0], role: 'accent', count: 18, speed: 1.8, size: 0.12, range: 1.6 },
      { kind: 'sparkle', pos: [laneX(3), 0.5, 0], role: 'interactive', count: 12, speed: 1, size: 0.2, range: 0.9 },
    ],
    bounds: { center: [0, 2, -30], radius: 45 },
    viewSize: RHYTHM_VIEW,
    playerAnchor: [0, 0, 0],
    camera: { ...RIG_RHYTHM, viewSize: RHYTHM_VIEW, target: [0, 0, -5.9], fit: { w: 9 } },
  };
});
