import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';
import { hash2 } from './kitsIso';
import type { SceneImage } from './types';

/*
 * 技术补全 G 的套件（二）：HD-2D 小镇（木筋墙房子、集市摊、石板路、街灯）与程序画的像素小人（贴图四边形）。
 * 像素小人：12 × 20 的格子按参数拼出 Q 版小人（头发、帽子、衣服、手里的东西），自动描一圈深色外框、右半边压暗一档，
 * 每个像素画成 8 × 8 的块（贴图是线性过滤，大块才不糊）；画布只画图形，不写字。
 */

/* ======================== 木筋墙房子（HD-2D 小镇） ======================== */

/**
 * 木筋墙房子（半木结构）：一层石砌（或抹灰），二层起抹灰墙 + 深色木梁（横梁、立柱、斜撑），二层往外挑一点（出挑），
 * 陡的人字屋顶（两片屋面板 + 山墙三角），窗（夜里有的亮）+ 百叶 + 花箱，拱门，烟囱。正面朝 +z（街）。
 * gable = true：山墙朝街（屋脊沿 z）；false：檐口朝街（屋脊沿 x）
 */
export function timberHouse(b: B, w: number, d: number, floors: number, wall: Role, rng: Rng, opts: { gable?: boolean; roof?: Role; stoneBase?: boolean; sign?: Role } = {}) {
  const fh = 1.15, base = 0.12, jut = 0.16;
  const roof = opts.roof ?? 'roof';
  // 一层
  b.box(0, 0, 0, w, base, d, 'stone', { args: [0.05] });
  b.box(0, base, 0, w, fh, d, opts.stoneBase ? 'stone' : wall, { args: [0.03] });
  // 二层起（出挑）
  let y = base + fh;
  const W = w + jut * 2, D = d + jut;
  for (let f = 1; f < floors; f++) {
    b.box(0, y, jut / 2, W, 0.1, D, 'trim', { args: [0.05] });
    b.box(0, y + 0.1, jut / 2, W - 0.04, fh - 0.1, D - 0.04, wall, { args: [0.02] });
    // 木梁：立柱（前面 + 两侧看得见的半边）、腰梁、斜撑
    const zf = jut / 2 + D / 2 + 0.01;
    const n = Math.max(2, Math.round(W / 0.75));
    for (let k = 0; k <= n; k++) {
      const x = -W / 2 + (k / n) * W;
      b.box(x, y + 0.1, zf, 0.09, fh - 0.1, 0.05, 'trim', { noOutline: true, args: [0] });
    }
    b.box(0, y + fh * 0.48, zf, W, 0.08, 0.05, 'trim', { noOutline: true, args: [0] });
    for (let k = 0; k < n; k++) {
      if ((k + f) % 2) continue;
      const x = -W / 2 + ((k + 0.5) / n) * W, s = k % 4 < 2 ? 1 : -1;
      b.add('box', x, y + 0.1 + fh * 0.24, zf, 0.07, Math.hypot(W / n, fh * 0.46), 0.04, 'trim', { rz: s * Math.atan2(W / n, fh * 0.46), noOutline: true, args: [0] });
    }
    for (const sx of [-1, 1]) {
      const xf = sx * (W / 2 + 0.01);
      b.box(xf, y + 0.1, jut / 2, 0.05, fh - 0.1, 0.09, 'trim', { noOutline: true, args: [0] });
      b.box(xf, y + fh * 0.48, jut / 2, 0.05, 0.08, D, 'trim', { noOutline: true, args: [0] });
      b.box(xf, y + 0.1, jut / 2 - D / 2 + 0.05, 0.05, fh - 0.1, 0.09, 'trim', { noOutline: true, args: [0] });
    }
    // 二层的窗：两扇，带百叶和花箱
    for (const u of [-0.25, 0.25]) {
      const x = u * W, lit = rng() < 0.45;
      b.box(x, y + 0.38, zf + 0.01, 0.36, 0.42, 0.04, lit ? 'emissive' : 'glass', { noOutline: true, args: [0] });
      for (const s of [-1, 1]) b.box(x + s * 0.27, y + 0.36, zf + 0.03, 0.16, 0.46, 0.03, 'wood', { noOutline: true, args: [0] });
      if (rng() < 0.7) { b.box(x, y + 0.3, zf + 0.08, 0.44, 0.1, 0.14, 'wood', { noOutline: true, args: [0] }); for (let k = 0; k < 4; k++) b.ball(x - 0.15 + k * 0.1, y + 0.42, zf + 0.1, 0.06, 0.06, 0.06, k % 2 ? 'flower' : 'foliage', { noOutline: true, args: [0] }); }
    }
    y += fh;
  }
  // 一层：拱门 + 一扇窗（或店面）
  const zf1 = d / 2 + 0.01;
  b.box(-w * 0.22, base, zf1, 0.56, 0.78, 0.05, 'wood', { noOutline: true, args: [0] });
  b.add('cylinder', -w * 0.22, base + 0.78, zf1, 0.56, 0.05, 0.56, 'wood', { rx: Math.PI / 2, noOutline: true, args: [1] });
  b.box(-w * 0.22, base, zf1 + 0.01, 0.66, 0.06, 0.08, 'stone', { noOutline: true, args: [0] });
  const lit1 = rng() < 0.6;
  b.box(w * 0.22, base + 0.38, zf1, 0.5, 0.42, 0.04, lit1 ? 'emissive' : 'glass', { noOutline: true, args: [0] });
  b.box(w * 0.22, base + 0.34, zf1 + 0.02, 0.6, 0.06, 0.1, 'stone', { noOutline: true, args: [0] });
  // 屋顶：两片屋面板（带出檐）+ 山墙三角（墙色）+ 屋脊
  const top = y, zc = jut / 2;
  const gable = !!opts.gable;
  const span = gable ? W : D, len = (gable ? D : W) + 0.36;
  // 山墙朝街的屋顶陡一些（尖山墙是木筋房的标志），檐口朝街的缓一些（太陡时整片屋面正对镜头，像一块红板）
  const rh = span * (gable ? 0.6 : 0.42);
  const slope = Math.atan2(rh, span / 2), plank = Math.hypot(rh, span / 2) + 0.22;
  if (gable) {
    // 屋脊沿 z：山墙朝街，山墙上一根中柱
    b.add('wedge', 0, top + rh / 2, zc, W - 0.04, rh, D - 0.06, wall);
    for (const s of [-1, 1]) b.add('box', (s * span) / 4, top + rh / 2, zc, plank, 0.1, len, roof, { rz: -s * slope });
    b.box(0, top, zc + D / 2 - 0.02, 0.08, rh * 0.85, 0.05, 'trim', { noOutline: true, args: [0] });
  } else {
    // 屋脊沿 x：檐口朝街
    b.add('wedge', 0, top + rh / 2, zc, D - 0.06, rh, W - 0.04, wall, { ry: Math.PI / 2 });
    for (const s of [-1, 1]) b.add('box', 0, top + rh / 2, zc + (s * span) / 4, len, 0.1, plank, roof, { rx: s * slope });
    // 朝街那片屋面上的瓦垄（几道深一点的横线，屋面不再是一整块平板）
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      b.add('box', 0, top + rh * (1 - t) + 0.06, zc + (span / 2) * t, len, 0.04, 0.06, 'trim', { rx: slope, noOutline: true, args: [0] });
    }
  }
  b.box(0, top + rh - 0.04, zc, gable ? 0.14 : len, 0.12, gable ? len : 0.14, 'trim', { noOutline: true, args: [0] });
  // 烟囱
  b.box(W * 0.28, top + rh * 0.35, zc - D * 0.15, 0.3, rh * 0.85, 0.3, 'stone', { args: [0.08] });
  // 挂在墙上的店招（铁架 + 牌子）
  if (opts.sign) {
    b.box(w / 2 - 0.1, base + 1.0, zf1 + 0.3, 0.05, 0.05, 0.6, 'metal', { noOutline: true, args: [0] });
    b.box(w / 2 - 0.1, base + 0.62, zf1 + 0.42, 0.05, 0.36, 0.36, opts.sign, { args: [0.15] });
  }
}

/** 集市摊：木桌 + 四根柱 + 条纹斜篷 + 一桌货（果子 / 菜 / 罐子）+ 两只筐 */
export function marketStall(b: B, w: number, stripe: Role, goods: Role[], rng: Rng) {
  const d = 1.0;
  b.box(0, 0, 0, w, 0.72, d, 'wood', { args: [0.06] });
  b.box(0, 0.72, 0, w + 0.08, 0.06, d + 0.08, 'trim', { args: [0.04] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 0.07, sz < 0 ? 1.9 : 1.6, 0.07, 'trim');
  const n = Math.max(4, Math.round(w / 0.25));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 - 0.1 + ((k + 0.5) / n) * (w + 0.2);
    b.add('box', x, 1.75, 0.05, (w + 0.2) / n, 0.04, d + 0.5, k % 2 ? 'paper' : stripe, { rx: 0.28, noOutline: true, args: [0] });
  }
  for (let k = 0; k < Math.round(w / 0.16); k++) {
    const x = -w / 2 + 0.12 + k * 0.16, z = -0.25 + (k % 3) * 0.22;
    b.ball(x, 0.86, z, 0.075, 0.07, 0.075, goods[k % goods.length], { noOutline: true, args: [0] });
  }
  for (const sx of [-1, 1]) { b.cyl(sx * (w / 2 + 0.3), 0, 0.35, 0.22, 0.3, 'wood', 1.1); for (let k = 0; k < 4; k++) b.ball(sx * (w / 2 + 0.3) + (rng() - 0.5) * 0.2, 0.34, 0.35 + (rng() - 0.5) * 0.2, 0.08, 0.07, 0.08, goods[(k + 1) % goods.length], { noOutline: true, args: [0] }); }
}

/** 铁艺街灯：灯柱 + 弯臂 + 四面玻璃的灯笼（发光） */
export function streetLantern(b: B, h = 2.2) {
  b.box(0, 0, 0, 0.22, 0.16, 0.22, 'stone', { args: [0.1] });
  b.cyl(0, 0.16, 0, 0.045, h - 0.16, 'metal');
  b.add('torus', 0.16, h - 0.1, 0, 0.32, 0.32, 0.05, 'metal', { args: [0.12], noOutline: true });
  b.box(0.3, h - 0.62, 0, 0.24, 0.32, 0.24, 'emissive', { noOutline: true, args: [0] });
  b.add('pyramid', 0.3, h - 0.22, 0, 0.32, 0.16, 0.32, 'metal');
  b.box(0.3, h - 0.66, 0, 0.28, 0.05, 0.28, 'metal', { noOutline: true, args: [0] });
}

/** 石砌水井：井圈 + 两根柱 + 小屋顶 + 辘轳 */
export function well(b: B) {
  b.cyl(0, 0, 0, 0.62, 0.62, 'stone', 1);
  b.add('cylinder', 0, 0.6, 0, 1.0, 0.04, 1.0, 'waterDeep', { args: [1], noOutline: true });
  for (const s of [-1, 1]) b.box(s * 0.52, 0.6, 0, 0.1, 1.1, 0.1, 'wood');
  b.add('wedge', 0, 1.95, 0, 1.0, 0.5, 1.5, 'roof', { ry: Math.PI / 2 });
  b.add('cylinder', 0, 1.42, 0, 0.12, 1.0, 0.12, 'wood', { rz: Math.PI / 2 });
  b.box(0, 0.95, 0, 0.18, 0.2, 0.18, 'wood');
}

/** 木桶 / 木箱堆（街边的杂物） */
export function barrelStack(b: B, rng: Rng) {
  b.cyl(0, 0, 0, 0.26, 0.62, 'wood', 0.9);
  b.add('torus', 0, 0.16, 0, 0.54, 0.54, 0.04, 'metal', { rx: Math.PI / 2, args: [0.06], noOutline: true });
  b.add('torus', 0, 0.48, 0, 0.52, 0.52, 0.04, 'metal', { rx: Math.PI / 2, args: [0.06], noOutline: true });
  b.box(0.55, 0, 0.1, 0.48, 0.42, 0.42, 'wood', { args: [0.08], ry: rng() * 0.4 });
  if (rng() < 0.6) b.box(0.52, 0.42, 0.08, 0.36, 0.32, 0.36, 'wood', { args: [0.08], ry: rng() });
}

/* ======================== 程序画的像素小人 ======================== */

export interface PixelPerson {
  hair: string; skin: string; top: string; bottom: string;
  /** 下装：裙子（下摆张开）/ 裤子 */
  dress?: boolean;
  /** 头上：帽子 / 头盔 / 兜帽 / 没有 */
  head?: 'hat' | 'helmet' | 'hood' | 'none';
  hatColor?: string;
  /** 手里：长矛 / 篮子 / 拐杖 / 没有 */
  hold?: 'spear' | 'basket' | 'staff' | 'none';
  apron?: boolean;
  beard?: boolean;
  /** 侧身朝右（只是把脸画到一边） */
  side?: boolean;
}

const GW = 12, GH = 20;

/** 把一个像素小人画成 12 × 20 的颜色格（null = 透明），带外框和右侧压暗 */
export function personGrid(p: PixelPerson): (string | null)[][] {
  const G: (string | null)[][] = Array.from({ length: GH }, () => new Array<string | null>(GW).fill(null));
  const put = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < GW && y < GH) G[y][x] = c; };
  const rect = (x: number, y: number, w: number, h: number, c: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c); };
  const dark = '#241a1c';
  // 腿 / 裙
  if (p.dress) { rect(3, 13, 6, 2, p.bottom); rect(2, 15, 8, 2, p.bottom); }
  else { rect(3, 13, 6, 2, p.bottom); rect(3, 15, 2, 2, p.bottom); rect(7, 15, 2, 2, p.bottom); }
  rect(3, 17, 2, 1, '#4a3428'); rect(7, 17, 2, 1, '#4a3428');
  // 身子 + 手臂 + 手
  rect(3, 8, 6, 5, p.top);
  rect(2, 9, 1, 3, p.top); rect(9, 9, 1, 3, p.top);
  put(2, 12, p.skin); put(9, 12, p.skin);
  if (p.apron) { rect(4, 9, 4, 6, '#efe6d2'); rect(4, 8, 1, 1, '#efe6d2'); rect(7, 8, 1, 1, '#efe6d2'); }
  rect(4, 12, 4, 1, '#5a3a2a');
  // 头：脸 + 头发
  rect(3, 2, 6, 6, p.skin);
  rect(2, 3, 8, 4, p.skin);
  rect(3, 1, 6, 2, p.hair); rect(2, 2, 8, 2, p.hair); rect(2, 4, 1, 3, p.hair); rect(9, 4, 1, 2, p.hair);
  if (p.side) { put(7, 5, dark); put(8, 5, p.skin); rect(2, 4, 2, 4, p.hair); }
  else { put(4, 5, dark); put(7, 5, dark); put(5, 6, '#d9967a'); }
  if (p.beard) { rect(3, 6, 6, 2, p.hair); rect(4, 8, 4, 1, p.hair); put(5, 6, p.skin); put(6, 6, p.skin); }
  const hc = p.hatColor ?? '#6b3f2a';
  if (p.head === 'hat') { rect(1, 2, 10, 1, hc); rect(3, 0, 6, 2, hc); rect(3, 1, 6, 1, '#c9a24a'); }
  else if (p.head === 'helmet') { rect(2, 0, 8, 3, hc); rect(2, 3, 8, 1, '#5d6773'); put(5, 0, '#e8edf2'); put(6, 0, '#e8edf2'); rect(2, 4, 1, 2, hc); rect(9, 4, 1, 2, hc); }
  else if (p.head === 'hood') { rect(2, 0, 8, 3, hc); rect(1, 3, 2, 6, hc); rect(9, 3, 2, 6, hc); rect(3, 3, 6, 1, hc); }
  // 手里的东西
  if (p.hold === 'spear') { for (let y = 0; y < 18; y++) put(10, y, y < 2 ? '#e8edf2' : '#8a5a33'); put(10, 2, '#5d6773'); }
  else if (p.hold === 'staff') { for (let y = 3; y < 18; y++) put(10, y, '#8a5a33'); put(10, 2, '#c9a24a'); }
  else if (p.hold === 'basket') { rect(9, 11, 3, 2, '#b07a45'); put(10, 10, '#b07a45'); put(9, 10, '#e2483d'); put(11, 11, '#7bd148'); }
  // 右半边压暗一档（光从左上来）
  const shade = (c: string) => {
    const n = parseInt(c.slice(1), 16), k = 0.78;
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('')}`;
  };
  for (let y = 0; y < GH; y++) for (let x = 7; x < GW; x++) { const c = G[y][x]; if (c && c !== dark) G[y][x] = shade(c); }
  // 外框：透明格只要上下左右挨着实心格就描成深色
  const out = G.map((r) => r.slice());
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (G[y][x]) continue;
    if ((y > 0 && G[y - 1][x]) || (y < GH - 1 && G[y + 1][x]) || (x > 0 && G[y][x - 1]) || (x < GW - 1 && G[y][x + 1])) out[y][x] = dark;
  }
  return out;
}

/** 颜色格 → 画布（每格 k × k 像素） */
export function drawGrid(grid: (string | null)[][], k = 8) {
  return (g: CanvasRenderingContext2D) => {
    g.clearRect(0, 0, grid[0].length * k, grid.length * k);
    grid.forEach((row, y) => row.forEach((c, x) => { if (c) { g.fillStyle = c; g.fillRect(x * k, y * k, k, k); } }));
  };
}

/**
 * 立在场景里的像素小人（贴图四边形，底边中点在脚下）：pitch = 镜头俯角（度），往后仰同样的角度正对镜头；
 * 高 h 米（20 格高 → 每格 h / 20）；flip = 朝左。另外返回一片抖动透明的椭圆影子（贴地）
 */
export function pixelPerson(key: string, p: PixelPerson, pos: [number, number, number], h: number, pitch: number, flip = false): SceneImage[] {
  const grid = personGrid(p);
  const w = (h * GW) / GH;
  const tilt = -(pitch * Math.PI) / 180;
  return [
    {
      file: '', canvas: { key: `iso-shadow`, w: 64, h: 32, draw: (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(20,12,16,0.55)'; g.beginPath(); g.ellipse(W / 2, H / 2, W / 2 - 1, H / 2 - 1, 0, 0, Math.PI * 2); g.fill(); } },
      pos: [pos[0], pos[1] + 0.015, pos[2]], size: [w * 1.05, w * 0.5], anchor: 'center', rot: [-Math.PI / 2, 0, 0], dither: true, cut: 0.2, recolor: 0, role: 'ink',
    },
    {
      file: '', canvas: { key: `iso-px-${key}`, w: GW * 8, h: GH * 8, draw: drawGrid(grid, 8) },
      pos, size: [w, h], anchor: 'bottom', rot: [tilt, 0, 0], flipX: flip, lit: 0.55, cut: 0.5, recolor: 0.35, role: 'character',
    },
  ];
}

/** 一只像素猫（10 × 7 格）：趴在地上 / 台阶上 */
export function pixelCat(pos: [number, number, number], pitch: number, color = '#3a3036'): SceneImage {
  const C = color, E = '#e8c34a', D = '#241a1c';
  const rows = [
    '.c...c....',
    '.cc.cc....',
    '.cEcEc...c',
    '.cccccc..c',
    '..ccccccc.',
    '..ccccccc.',
    '..c.c.c.c.',
  ];
  const grid = rows.map((r) => [...r].map((ch) => (ch === 'c' ? C : ch === 'E' ? E : null)));
  // 外框
  const out = grid.map((r) => r.slice());
  grid.forEach((r, y) => r.forEach((c, x) => { if (!c && ((grid[y - 1]?.[x]) || (grid[y + 1]?.[x]) || r[x - 1] || r[x + 1])) out[y][x] = D; }));
  const h = 0.36;
  return { file: '', canvas: { key: `iso-cat-${color}`, w: 80, h: 56, draw: drawGrid(out, 8) }, pos, size: [(h * 10) / 7, h], anchor: 'bottom', rot: [-(pitch * Math.PI) / 180, 0, 0], lit: 0.55, cut: 0.5, recolor: 0.35, role: 'character' };
}

/** 卵石路面：一层底色 + 撒一层不规则的扁石（同一个编号，石缝靠高差出线） */
export function cobbles(items: import('./types').Item[], id: number, x0: number, x1: number, z0: number, z1: number, step = 0.42) {
  items.push({ prim: 'box', args: [0], pos: [(x0 + x1) / 2, 0.02, (z0 + z1) / 2], scale: [x1 - x0, 0.04, z1 - z0], role: 'path', id, flat: true, noOutline: true });
  for (let z = z0 + step / 2; z < z1; z += step) {
    const row = Math.round((z - z0) / step);
    for (let x = x0 + step / 2 + (row % 2) * step * 0.5; x < x1; x += step) {
      const h = hash2(x * 3.1, z * 7.7);
      if (h < 0.08) continue;
      items.push({ prim: 'box', args: [0], pos: [x + (h - 0.5) * 0.06, 0.05, z + (hash2(z, x) - 0.5) * 0.06], rot: [0, (h - 0.5) * 0.5, 0], scale: [step * 0.86, 0.05, step * 0.8], role: h < 0.3 ? 'rock' : 'stone', id, flat: true, noOutline: true });
    }
  }
}

/* ======================== 斜俯视村落（塞尔达 众神的三角力量 / Eastward） ======================== */

/**
 * 村舍（正面朝 +z）：矮墙身 + 檐口朝前的人字屋顶（屋面上几道瓦垄）+ 门 + 两扇窗 + 烟囱 + 门前石阶。
 * 3/4 俯视里屋顶占了房子的一大半：屋顶颜色就是这栋房子的记号
 */
export function cottage(b: B, w: number, d: number, wall: Role, roof: Role) {
  const h = 1.25;
  b.box(0, 0, 0, w, 0.16, d, 'stone', { args: [0] });
  b.box(0, 0.16, 0, w - 0.1, h, d - 0.1, wall, { args: [0.04] });
  // 门 + 门楣 + 石阶
  b.box(0, 0.16, d / 2 - 0.03, 0.5, 0.78, 0.06, 'wood', { args: [0] });
  b.box(0, 0.94, d / 2 - 0.02, 0.62, 0.08, 0.08, 'trim', { args: [0] });
  b.box(0, 0, d / 2 + 0.18, 0.7, 0.1, 0.3, 'stone', { args: [0] });
  for (const s of [-1, 1]) {
    b.box(s * w * 0.3, 0.55, d / 2 - 0.03, 0.36, 0.34, 0.05, 'glass', { noOutline: true, args: [0] });
    b.box(s * w * 0.3, 0.5, d / 2 + 0.01, 0.44, 0.06, 0.1, 'wood', { noOutline: true, args: [0] });
  }
  // 屋顶：屋脊沿 x，前后两片（前片正对镜头），山墙三角是墙色
  const span = d + 0.1, rh = span * 0.48, top = 0.16 + h;
  const slope = Math.atan2(rh, span / 2), plank = Math.hypot(rh, span / 2) + 0.3, len = w + 0.4;
  b.add('wedge', 0, top + rh / 2, 0, d - 0.12, rh, w - 0.12, wall, { ry: Math.PI / 2 });
  for (const s of [-1, 1]) b.add('box', 0, top + rh / 2, (s * span) / 4, len, 0.12, plank, roof, { rx: s * slope });
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    b.add('box', 0, top + rh * (1 - t) + 0.07, (span / 2) * t, len, 0.04, 0.07, 'trim', { rx: slope, noOutline: true, args: [0] });
  }
  b.box(0, top + rh - 0.05, 0, len, 0.14, 0.16, roof, { args: [0] });
  b.box(w * 0.28, top + rh * 0.3, -d * 0.15, 0.32, rh * 0.95, 0.32, 'stone', { args: [0.08] });
}

/** 灌木丛（能砍的那种）：几团圆叶子，偶尔点几朵花 */
export function shrub(b: B, s: number, rng: Rng, flower = false) {
  b.ball(0, 0.32 * s, 0, 0.42 * s, 0.34 * s, 0.38 * s, 'foliage', { sway: 0.15 });
  b.ball(-0.22 * s, 0.26 * s, 0.1 * s, 0.26 * s, 0.24 * s, 0.26 * s, 'foliage', { sway: 0.15 });
  b.ball(0.24 * s, 0.24 * s, 0.08 * s, 0.24 * s, 0.22 * s, 0.24 * s, 'foliage', { sway: 0.15 });
  if (flower) for (let k = 0; k < 3; k++) b.ball((rng() - 0.5) * 0.5 * s, 0.55 * s, (rng() - 0.2) * 0.3 * s, 0.06 * s, 0.06 * s, 0.06 * s, 'flower', { noOutline: true });
}

/** 巡逻兵（敌人）：绿色铠甲 + 头盔 + 长矛 + 盾，高约 1.2 */
export function soldier(b: B) {
  for (const x of [-0.13, 0.13]) b.box(x, 0, 0, 0.16, 0.42, 0.2, 'characterAccent', { args: [0.2] });
  b.box(0, 0.4, 0, 0.56, 0.48, 0.36, 'foliage2', { args: [0.25] });
  b.box(0, 0.86, 0, 0.42, 0.36, 0.38, 'skin', { args: [0.3] });
  b.box(0, 1.0, -0.02, 0.5, 0.3, 0.46, 'foliage2', { args: [0.3] });
  b.add('pyramid', 0, 1.3, -0.02, 0.36, 0.24, 0.36, 'metal');
  b.box(-0.1, 0.94, 0.19, 0.06, 0.08, 0.02, 'ink', { noOutline: true, args: [0] }); b.box(0.1, 0.94, 0.19, 0.06, 0.08, 0.02, 'ink', { noOutline: true, args: [0] });
  b.cyl(0.38, 0, 0.12, 0.03, 1.7, 'wood');
  b.add('pyramid', 0.38, 1.82, 0.12, 0.1, 0.24, 0.1, 'metal');
  b.box(-0.36, 0.38, 0.12, 0.08, 0.5, 0.4, 'accent', { args: [0.3] });
}

/** 章鱼怪（河边的敌人）：圆身子 + 前伸的吻管 + 四条短腿 + 眼睛 */
export function octorok(b: B) {
  b.ball(0, 0.42, 0, 0.36, 0.34, 0.36, 'accent');
  b.add('cylinder', 0, 0.38, 0.38, 0.22, 0.26, 0.22, 'accent', { rx: Math.PI / 2, args: [1.2] });
  b.add('cylinder', 0, 0.38, 0.52, 0.16, 0.04, 0.16, 'ink', { rx: Math.PI / 2, args: [1], noOutline: true });
  for (const [x, z] of [[-0.24, 0.16], [0.24, 0.16], [-0.24, -0.18], [0.24, -0.18]]) b.add('cylinder', x, 0.1, z, 0.12, 0.22, 0.12, 'accent', { args: [0.7] });
  for (const x of [-0.14, 0.14]) { b.ball(x, 0.56, 0.28, 0.09, 0.1, 0.06, 'paper', { noOutline: true }); b.ball(x, 0.56, 0.32, 0.045, 0.06, 0.03, 'ink', { noOutline: true }); }
}

/* ======================== 剖面屋（模拟人生 / 吹抜屋台）：家具 ======================== */
// 比例：1 单位 ≈ 1.25 米（场景里玩家放大到约 1.35 高）。都朝 +z 摆（靠墙的那面在 −z）

/** 沙发：底座 + 坐垫 + 靠背 + 两边扶手 */
export function sofa(b: B, len: number, role: Role) {
  b.box(0, 0.06, 0, len, 0.3, 0.75, role, { args: [0.2] });
  for (let k = 0; k < Math.max(2, Math.round(len / 0.6)); k++) {
    const n = Math.max(2, Math.round(len / 0.6)), w = (len - 0.3) / n;
    b.box(-len / 2 + 0.15 + (k + 0.5) * w, 0.36, 0.05, w - 0.04, 0.12, 0.6, role, { args: [0.4] });
  }
  b.box(0, 0.36, -0.3, len, 0.42, 0.18, role, { args: [0.35] });
  for (const s of [-1, 1]) b.box(s * (len / 2 - 0.08), 0.06, 0, 0.16, 0.52, 0.75, role, { args: [0.35] });
}

/** 矮桌 / 餐桌（tall = true）：桌面 + 四条腿 */
export function table(b: B, w: number, d: number, tall: boolean, top: Role = 'wood') {
  const h = tall ? 0.6 : 0.3;
  b.box(0, h - 0.05, 0, w, 0.05, d, top, { args: [0.15] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), 0.05, h - 0.05, 0.05, 'trim', { args: [0] });
}

/** 椅子：座 + 靠背 + 四条腿（朝 +z） */
export function chair(b: B, role: Role = 'wood') {
  b.box(0, 0.34, 0, 0.36, 0.05, 0.36, role, { args: [0.15] });
  b.box(0, 0.39, -0.16, 0.36, 0.42, 0.05, role, { args: [0.15] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.15, 0, sz * 0.15, 0.04, 0.34, 0.04, 'trim', { args: [0] });
}

/** 床：床架 + 床垫 + 被子（颜色）+ 两个枕头 + 床头板（靠 −z） */
export function bed(b: B, w: number, l: number, blanket: Role) {
  b.box(0, 0.06, 0, w, 0.22, l, 'wood', { args: [0.1] });
  b.box(0, 0.28, 0, w - 0.06, 0.14, l - 0.06, 'paper', { args: [0.3] });
  b.box(0, 0.36, l * 0.12, w - 0.02, 0.1, l * 0.72, blanket, { args: [0.3] });
  for (const s of [-1, 1]) b.box(s * w * 0.24, 0.42, -l / 2 + 0.24, w * 0.4, 0.1, 0.28, 'paper', { args: [0.5] });
  b.box(0, 0, -l / 2 + 0.04, w + 0.04, 0.72, 0.08, 'wood', { args: [0.15] });
}

/** 书架 / 柜子（靠 −z 墙）：外框 + 几层隔板 + 一排彩色的书 */
export function shelf(b: B, w: number, h: number, rng: Rng, books = true) {
  b.box(0, 0, 0, w, h, 0.36, 'wood', { args: [0.05] });
  const n = Math.max(2, Math.round(h / 0.42));
  for (let k = 0; k < n; k++) {
    const y = 0.08 + (k * (h - 0.12)) / n;
    b.box(0, y, 0.12, w - 0.08, 0.03, 0.2, 'trim', { args: [0], noOutline: true });
    if (!books) continue;
    let x = -w / 2 + 0.08;
    while (x < w / 2 - 0.12) {
      const bw = 0.05 + rng() * 0.05, bh = 0.18 + rng() * 0.12;
      b.box(x + bw / 2, y + 0.03, 0.14, bw, bh, 0.16, (['accent', 'cloth', 'paper', 'foliage2', 'roof'] as Role[])[Math.floor(rng() * 5)], { args: [0], noOutline: true });
      x += bw + 0.01;
    }
  }
}

/** 厨房一排橱柜（沿 x，靠 −z 墙）：柜体 + 台面 + 水槽 / 灶台 + 吊柜 */
export function counter(b: B, len: number, sinkAt: number, stoveAt: number) {
  b.box(0, 0, 0, len, 0.68, 0.5, 'paper', { args: [0.05] });
  b.box(0, 0.68, 0.01, len + 0.04, 0.05, 0.54, 'stone', { args: [0] });
  for (let x = -len / 2 + 0.3; x < len / 2; x += 0.5) b.box(x, 0.3, 0.255, 0.02, 0.28, 0.02, 'metal', { args: [0], noOutline: true });
  b.box(sinkAt, 0.69, 0.02, 0.42, 0.05, 0.32, 'metal', { args: [0], noOutline: true });
  b.box(sinkAt, 0.73, -0.18, 0.04, 0.2, 0.04, 'metal', { args: [0] });
  for (const [dx, dz] of [[-0.11, -0.08], [0.11, -0.08], [-0.11, 0.1], [0.11, 0.1]]) b.add('cylinder', stoveAt + dx, 0.735, dz, 0.15, 0.012, 0.15, 'ink', { args: [1], noOutline: true });
  b.box(0, 1.3, -0.12, len, 0.42, 0.28, 'paper', { args: [0.05] });
}

/** 冰箱（交互物：拉开就是目标点） */
export function fridge(b: B) {
  b.box(0, 0, 0, 0.6, 1.5, 0.55, 'paper', { args: [0.15] });
  b.box(0, 1.0, 0.28, 0.58, 0.02, 0.02, 'metal', { args: [0], noOutline: true });
  b.box(0.22, 0.6, 0.29, 0.03, 0.3, 0.03, 'metal', { args: [0] });
  b.box(0.22, 1.12, 0.29, 0.03, 0.2, 0.03, 'metal', { args: [0] });
}

/** 浴缸（带一池水）、马桶、洗手台 + 镜子 */
export function bathroom(b: B) {
  b.box(0, 0, 0, 1.3, 0.45, 0.62, 'paper', { args: [0.3] });
  b.box(0, 0.36, 0.02, 1.1, 0.06, 0.46, 'water', { args: [0], noOutline: true });
  const t = b.at(1.15, 0, -0.05);
  t.box(0, 0, 0, 0.32, 0.32, 0.42, 'paper', { args: [0.4] });
  t.box(0, 0.32, -0.16, 0.34, 0.3, 0.14, 'paper', { args: [0.3] });
  const s = b.at(1.8, 0, -0.08);
  s.box(0, 0, 0, 0.45, 0.6, 0.35, 'wood', { args: [0.1] });
  s.box(0, 0.6, 0, 0.47, 0.06, 0.37, 'paper', { args: [0.2] });
  s.box(0, 0.95, -0.17, 0.4, 0.5, 0.03, 'glass', { args: [0], noOutline: true });
}

/** 电视柜 + 电视（屏幕发光）、落地灯、盆栽 */
export function tvSet(b: B) {
  b.box(0, 0, 0, 1.2, 0.36, 0.38, 'wood', { args: [0.1] });
  b.box(0, 0.36, -0.04, 0.9, 0.52, 0.06, 'ink', { args: [0.1] });
  b.box(0, 0.4, -0.005, 0.82, 0.44, 0.02, 'emissive', { args: [0], noOutline: true });
}
export function floorLamp(b: B) {
  b.cyl(0, 0, 0, 0.12, 0.04, 'metal', 1);
  b.cyl(0, 0.04, 0, 0.02, 1.2, 'metal');
  b.add('cylinder', 0, 1.3, 0, 0.36, 0.26, 0.36, 'emissive', { args: [0.7], noOutline: true });
}
export function pottedPlant(b: B, s = 1) {
  b.cyl(0, 0, 0, 0.14 * s, 0.26 * s, 'soil', 0.8);
  b.ball(0, 0.46 * s, 0, 0.24 * s, 0.26 * s, 0.24 * s, 'foliage');
  b.ball(0.1 * s, 0.6 * s, 0.04 * s, 0.14 * s, 0.16 * s, 0.14 * s, 'foliage');
}
