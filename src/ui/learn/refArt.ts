/*
 * 「仅参考」卡的代表图（轨道 C，整合 U#23）：做不出来的 8 种风格，用 Canvas 2D 自己画一张示意插画（不下载、不用截图、不用我们的近似渲染）。
 * 只在开发钩子 __gae.gallery.bakeRef() 里动态加载，烘焙成 public/thumbs/ref/<卡 id>.webp（640×360）；生产包里没有这份代码。
 * 像素类先在低分辨率上逐格画（8 位 64×36、16 位 128×72、精细像素 160×90），再最近邻放大，保证格子是真的方块。
 * 画的是「这种风格长什么样」的示意，不临摹任何游戏的角色或画面。
 */

type G = CanvasRenderingContext2D;
export const REF_W = 640, REF_H = 360;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

/** 确定的伪随机（每张图的颗粒、星星都固定） */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------------- 像素工具 ---------------- */

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const px = (g: G, x: number, y: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function sprite(g: G, x: number, y: number, rows: string[], pal: Record<string, string>) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) px(g, x + i, y + j, pal[ch]); }));
}
/** 一列颜色带的竖直渐变（相邻两带之间用 Bayer 抖动过渡，像素画的标准做法） */
function ditherBands(g: G, x0: number, y0: number, w: number, h: number, colors: string[]) {
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(t)), f = t - i;
    for (let x = 0; x < w; x++) px(g, x0 + x, y0 + y, f > bayer(x0 + x, y0 + y) ? colors[i + 1] : colors[i]);
  }
}
function disc(g: G, cx: number, cy: number, r: number, c: string) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, c);
}
/** 低分辨率 → 640×360（最近邻） */
function upscale(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, REF_W, REF_H);
  return c;
}

/* ---------------- 1. 8 位像素：4 色一组的精灵、8×8 的砖块、夜色关卡 ---------------- */

function draw8bit(): HTMLCanvasElement {
  const W = 64, H = 36;
  const [c, g] = makeCanvas(W, H);
  const r = rng(8);
  rect(g, 0, 0, W, H, '#1c1c58');
  for (let i = 0; i < 26; i++) px(g, Math.floor(r() * W), Math.floor(r() * 15), r() < 0.7 ? '#fcfcfc' : '#a4b8fc');
  disc(g, 53, 7, 4, '#fce0a8');
  px(g, 52, 6, '#e4b888'); px(g, 54, 9, '#e4b888'); px(g, 55, 6, '#e4b888');
  for (let x = 0; x < W; x++) {
    const far = Math.round(17 + 3 * Math.sin(x * 0.21) + 2 * Math.sin(x * 0.07 + 1));
    for (let y = far; y < 28; y++) px(g, x, y, '#44287c');
    const near = Math.round(22 + 2.5 * Math.sin(x * 0.16 + 2) + 1.5 * Math.sin(x * 0.4));
    for (let y = near; y < 28; y++) px(g, x, y, '#68389c');
    px(g, x, near, '#9c5cc4');
  }
  // 地面：一层亮边 + 错缝砖块
  rect(g, 0, 28, W, 8, '#a84418');
  rect(g, 0, 28, W, 1, '#fc9838');
  for (let y = 29; y < H; y++) {
    if ((y - 29) % 3 === 2) { rect(g, 0, y, W, 1, '#4c1408'); continue; }
    const off = Math.floor((y - 29) / 3) % 2 ? 2 : 0;
    for (let x = off; x < W; x += 4) px(g, x, y, '#4c1408');
  }
  // 浮空砖块 + 金币
  for (const bx of [24, 29, 34]) {
    rect(g, bx, 15, 5, 5, '#c86418'); rect(g, bx, 15, 5, 1, '#fca044'); rect(g, bx, 15, 1, 5, '#fca044');
    px(g, bx + 2, 17, '#fce0a8');
  }
  for (const [cx, cy] of [[26, 11], [31, 10], [36, 11], [46, 20]]) { rect(g, cx, cy, 2, 3, '#fcd848'); px(g, cx, cy, '#fcfcfc'); }
  // 主角（7×9）
  sprite(g, 11, 19, [
    '..KKK..',
    '.KBBBK.',
    '.KSSSK.',
    '.KSKSK.',
    '..KKK..',
    '.KBBBK.',
    'KSBYBSK',
    '.KBBBK.',
    '.KK.KK.',
  ], { K: '#000000', B: '#3c74fc', S: '#fcc4a0', Y: '#fcd848' });
  // 史莱姆
  sprite(g, 44, 24, ['..GGG..', '.GGGGG.', 'GGWGWGG', 'GGGGGGG'], { G: '#38b838', W: '#fcfcfc' });
  // 火把
  rect(g, 58, 21, 1, 7, '#7c4c2c');
  sprite(g, 57, 18, ['.R.', 'RYR', '.R.'], { R: '#f84838', Y: '#fcd848' });
  return upscale(c);
}

/* ---------------- 2. 16 位像素：抖动渐变的天空、多层视差、带描边的精灵 ---------------- */

function draw16bit(): HTMLCanvasElement {
  const W = 128, H = 72;
  const [c, g] = makeCanvas(W, H);
  ditherBands(g, 0, 0, W, 44, ['#1848b8', '#2868d8', '#4890e8', '#70b0f0', '#a0d0f8', '#d0ecf8']);
  // 云
  const cloud = (cx: number, cy: number, s: number) => {
    for (const [dx, dy, rr] of [[0, 0, 4], [5, -2, 5], [11, 0, 4], [7, 2, 4]]) disc(g, cx + dx * s, cy + dy * s, Math.round(rr * s), '#f8f8f8');
    for (let x = -4 * s; x < 15 * s; x++) px(g, cx + x, cy + 4 * s, '#b8d8f0');
  };
  cloud(14, 10, 1); cloud(74, 6, 1); cloud(104, 16, 0.7);
  // 远山（雪顶）
  const mount = (x0: number, peak: number, w: number, col: string, snow: string) => {
    for (let x = 0; x < w; x++) {
      const h = Math.round(peak + Math.abs(x - w / 2) * 0.9);
      for (let y = h; y < 46; y++) px(g, x0 + x, y, col);
      if (h < peak + 4) px(g, x0 + x, h, snow);
    }
  };
  mount(-6, 20, 44, '#6878c0', '#e8f0f8'); mount(28, 16, 52, '#5868b0', '#e8f0f8'); mount(76, 22, 46, '#6878c0', '#e8f0f8');
  // 中景草丘（两层）
  for (let x = 0; x < W; x++) {
    const h = Math.round(38 + 3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1));
    for (let y = h; y < 56; y++) px(g, x, y, (y - h) < 2 ? '#78d058' : '#3c9c4c');
    if ((x + h) % 7 === 0) px(g, x, h + 3, '#2c7c3c');
  }
  // 湖面
  for (let y = 50; y < 56; y++) for (let x = 70; x < W; x++) px(g, x, y, y % 2 ? '#3070d0' : '#3878d8');
  for (const [sx, sy] of [[80, 51], [96, 53], [112, 52], [88, 54]]) { rect(g, sx, sy, 3, 1, '#f8f8f8'); }
  // 前景地面：草边 + 土层的石块
  for (let x = 0; x < W; x++) {
    const top = Math.round(56 + (x > 70 ? 1 : 0) + Math.sin(x * 0.5) * 0.6);
    px(g, x, top, '#a8f070'); px(g, x, top + 1, '#68d838'); px(g, x, top + 2, (x % 3) ? '#38a028' : '#68d838');
    for (let y = top + 3; y < H; y++) px(g, x, y, ((x * 7 + y * 13) % 11 === 0) ? '#8c5028' : ((x * 5 + y * 3) % 13 === 0 ? '#d89058' : '#b0703c'));
  }
  // 棕榈树
  for (let i = 0; i < 18; i++) { const x = 104 + Math.round(Math.sin(i * 0.15) * 2); rect(g, x, 38 + i, 3, 1, i % 3 ? '#a8783c' : '#7c5020'); }
  for (const [dx, dy] of [[-9, 2], [-6, -1], [0, -3], [6, -1], [9, 2], [-3, 1], [3, 1]]) {
    const steps = 8;
    for (let s = 0; s < steps; s++) {
      const x = 105 + Math.round((dx * s) / steps * 1.3), y = 37 + Math.round((dy * s) / steps + (s * s) / 14);
      px(g, x, y, s < 4 ? '#60d050' : '#30a030'); px(g, x, y + 1, '#208020');
    }
  }
  // 主角（12×16，带黑描边、围巾）
  sprite(g, 30, 41, [
    '....KKKK....',
    '...KHHHHK...',
    '..KHHHHHHK..',
    '..KHSSSSHK..',
    '..KSKSSKSK..',
    '..KSSSSSSK..',
    '...KRRRRK...',
    '..KRRBBBBK..',
    '.KSKBBBBKSK.',
    '.KSKBBBBKSK.',
    '..KKBYYBKK..',
    '...KBBBBK...',
    '...KBKKBK...',
    '...KBK.KBK..',
    '..KDDK.KDDK.',
    '..KKKK.KKKK.',
  ], { K: '#101018', H: '#5c3c8c', S: '#f8c8a0', R: '#20b8a8', B: '#7048c0', Y: '#f8d048', D: '#383050' });
  // 宝石
  for (const [gx, gy] of [[52, 46], [60, 43], [68, 46]]) sprite(g, gx, gy, ['.P.', 'PWP', '.P.'], { P: '#f83878', W: '#fcd0e0' });
  return upscale(c);
}

/* ---------------- 3. 精细像素：高分辨率像素画的夜景、抖动光晕、点亮的窗 ---------------- */

function drawDensePixel(): HTMLCanvasElement {
  const W = 160, H = 90;
  const [c, g] = makeCanvas(W, H);
  const r = rng(16);
  ditherBands(g, 0, 0, W, 70, ['#0e0824', '#1a0f34', '#2c1644', '#47204e', '#6c3054', '#94485a']);
  for (let i = 0; i < 70; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 40); px(g, x, y, r() < 0.25 ? '#fff4d8' : '#8c7cb0'); }
  // 月亮 + 抖动光晕
  const mx = 116, my = 24;
  for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > 11 && d < 26 && (26 - d) / 15 * 0.55 > bayer(mx + x, my + y)) px(g, mx + x, my + y, '#5a3466');
  }
  disc(g, mx, my, 10, '#f2e8cc');
  for (const [cx, cy, cr] of [[-3, -2, 2], [3, 3, 3], [4, -4, 1], [-4, 4, 1]]) disc(g, mx + cx, my + cy, cr, '#d6c8a4');
  // 远处的城（尖塔剪影）
  let x = 0;
  while (x < W) {
    const w = 4 + Math.floor(r() * 8), top = 46 + Math.floor(r() * 14);
    rect(g, x, top, w, 70 - top, '#2a1638');
    if (r() < 0.45) { const sx = x + Math.floor(w / 2); for (let k = 0; k < 9; k++) rect(g, sx - Math.floor((9 - k) / 4), top - 9 + k, 1 + 2 * Math.floor((9 - k) / 4), 1, '#2a1638'); }
    x += w;
  }
  // 中景的大教堂：拱窗点灯
  const cath = (x0: number, w: number, top: number) => {
    rect(g, x0, top, w, 80 - top, '#170c22');
    for (let k = 0; k < 14; k++) rect(g, x0 + w / 2 - Math.floor(k / 3), top - 14 + k, 1 + 2 * Math.floor(k / 3), 1, '#170c22');
    for (let wy = top + 4; wy < 74; wy += 7) for (let wx = x0 + 2; wx < x0 + w - 2; wx += 4) if (r() < 0.55) { rect(g, wx, wy, 2, 3, '#f8b860'); px(g, wx, wy, '#ffe2a0'); }
  };
  cath(8, 20, 50); cath(56, 14, 56); cath(86, 24, 46);
  // 雾带
  for (let y = 64; y < 78; y++) for (let xx = 0; xx < W; xx++) { const t = 1 - Math.abs(y - 71) / 7; if (t * 0.6 > bayer(xx, y)) px(g, xx, y, '#5c3c68'); }
  // 前景悬崖（月光描出的亮边）
  for (let xx = 0; xx < W; xx++) {
    const top = xx < 74 ? Math.round(74 - Math.sin(xx * 0.05) * 4 + (xx > 60 ? (xx - 60) * 0.6 : 0)) : 90;
    if (top >= 90) continue;
    for (let y = top; y < H; y++) px(g, xx, y, '#0a0610');
    px(g, xx, top, '#8c5a7a');
    if (xx % 5 === 0) px(g, xx, top + 1, '#4a2c48');
  }
  // 提灯的人（斗篷剪影 + 暖光抖动光圈）
  const fx = 40, fy = 63;
  for (let y = -16; y <= 16; y++) for (let xx = -16; xx <= 16; xx++) {
    const d = Math.sqrt(xx * xx + y * y);
    if (d < 16 && (1 - d / 16) * 0.7 > bayer(fx + 5 + xx, fy + 6 + y)) px(g, fx + 5 + xx, fy + 6 + y, d < 7 ? '#c8783c' : '#6c3c3c');
  }
  sprite(g, fx - 3, fy - 2, [
    '..KKK...',
    '.KKKKK..',
    '.KKFKK..',
    '.KKKKK..',
    'KKKKKKK.',
    'KKKKKKKL',
    'KKKKKKKL',
    'KKKKKK..',
    'KKKKKK..',
    'KKKKKKK.',
  ], { K: '#06040a', F: '#d8b8a0', L: '#ffd27a' });
  px(g, fx + 5, fy + 2, '#fff2c0'); px(g, fx + 5, fy + 3, '#ffd27a');
  // 萤火
  for (let i = 0; i < 14; i++) px(g, 20 + Math.floor(r() * 60), 56 + Math.floor(r() * 18), r() < 0.5 ? '#ffe8a0' : '#c8a060');
  // 右前景枯树
  const branch = (x0: number, y0: number, ang: number, len: number, d: number) => {
    let bx = x0, by = y0;
    for (let i = 0; i < len; i++) { bx += Math.cos(ang); by -= Math.sin(ang); rect(g, Math.round(bx), Math.round(by), d > 0 ? 2 : 1, 1, '#05030a'); }
    if (d > 0) { branch(bx, by, ang + 0.5, len * 0.6, d - 1); branch(bx, by, ang - 0.45, len * 0.65, d - 1); }
  };
  rect(g, 146, 60, 3, 30, '#05030a');
  branch(147, 61, Math.PI / 2 + 0.2, 12, 3);
  return upscale(c);
}

/* ---------------- 矢量工具 ---------------- */

function grain(g: G, seed: number, n: number, color: string, alpha: number) {
  const r = rng(seed);
  g.save(); g.globalAlpha = alpha; g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(r() * REF_W, r() * REF_H, 1 + r() * 1.5, 1 + r() * 1.5);
  g.restore();
}
function vignette(g: G, inner: number, outer: number, color: string, alpha = 1) {
  const v = g.createRadialGradient(REF_W / 2, REF_H / 2, inner, REF_W / 2, REF_H / 2, outer);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, color);
  g.save(); g.globalAlpha = alpha; g.fillStyle = v; g.fillRect(0, 0, REF_W, REF_H); g.restore();
}
function ellipse(g: G, x: number, y: number, rx: number, ry: number, fill?: string, stroke?: string, lw = 4, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function curve(g: G, pts: number[], color: string, lw: number) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  if (pts.length === 8) g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
  else if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  else for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}

/* ---------------- 4. 橡皮管动画：1930 年代的面条胳膊、馅饼眼、白手套、胶片颗粒 ---------------- */

function drawRubberHose(): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  const K = '#111', P = '#efe2c0';
  g.fillStyle = P; g.fillRect(0, 0, REF_W, REF_H);
  // 远山与地面
  g.beginPath(); g.moveTo(0, 262); g.bezierCurveTo(90, 190, 170, 196, 250, 250); g.bezierCurveTo(330, 200, 450, 170, 560, 240); g.lineTo(640, 230); g.lineTo(640, 270); g.lineTo(0, 270); g.closePath();
  g.fillStyle = '#ddcfa8'; g.fill(); g.strokeStyle = K; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#d2c196'; g.fillRect(0, 270, REF_W, 90);
  curve(g, [0, 270, 640, 270], K, 5);
  for (let i = 0; i < 9; i++) curve(g, [40 + i * 70, 300 + (i % 2) * 18, 70 + i * 70, 300 + (i % 2) * 18], K, 3);
  // 笑脸太阳
  const sx = 104, sy = 86;
  g.save(); g.translate(sx, sy);
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(-8, -46); g.lineTo(0, -66); g.lineTo(8, -46); g.closePath(); g.fillStyle = P; g.fill(); g.strokeStyle = K; g.lineWidth = 3; g.stroke(); }
  g.restore();
  ellipse(g, sx, sy, 42, 42, P, K, 4);
  ellipse(g, sx - 13, sy - 8, 5, 9, K); ellipse(g, sx + 13, sy - 8, 5, 9, K);
  g.beginPath(); g.arc(sx, sy + 4, 22, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = K; g.lineWidth = 4; g.stroke();
  // 云
  for (const [cx, cy] of [[470, 70], [560, 110]]) {
    g.beginPath();
    for (const [dx, dy, rr] of [[-34, 6, 20], [-12, -8, 26], [16, -6, 24], [36, 8, 18]]) g.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2);
    g.fillStyle = '#f7efd8'; g.fill();
  }
  for (const [cx, cy] of [[470, 70], [560, 110]]) {
    g.beginPath(); g.moveTo(cx - 54, cy + 14);
    g.bezierCurveTo(cx - 60, cy - 14, cx - 30, cy - 34, cx - 12, cy - 30); g.bezierCurveTo(cx, cy - 46, cx + 34, cy - 40, cx + 36, cy - 14);
    g.bezierCurveTo(cx + 60, cy - 12, cx + 60, cy + 20, cx + 40, cy + 24); g.closePath(); g.strokeStyle = K; g.lineWidth = 4; g.stroke();
  }
  // 角色：面条腿 + 大鞋
  const cx = 332;
  curve(g, [cx - 14, 214, cx - 30, 240, cx - 52, 250, cx - 58, 262], K, 13);
  curve(g, [cx + 14, 214, cx + 22, 236, cx + 40, 246, cx + 58, 258], K, 13);
  ellipse(g, cx - 72, 264, 30, 13, K); ellipse(g, cx - 80, 259, 9, 4, '#f4f4f4');
  ellipse(g, cx + 70, 262, 30, 13, K, undefined, 0, -0.12); ellipse(g, cx + 64, 256, 9, 4, '#f4f4f4');
  // 身体（梨形，黑）+ 浅色肚皮 + 条纹背带裤
  g.beginPath(); g.moveTo(cx - 40, 170); g.bezierCurveTo(cx - 52, 230, cx + 52, 230, cx + 40, 170); g.bezierCurveTo(cx + 34, 140, cx - 34, 140, cx - 40, 170); g.fillStyle = K; g.fill();
  ellipse(g, cx, 184, 20, 22, '#f3dcb8', K, 3);
  g.save();
  g.beginPath(); g.moveTo(cx - 46, 200); g.bezierCurveTo(cx - 48, 228, cx + 48, 228, cx + 46, 200); g.closePath(); g.clip();
  g.fillStyle = '#f6f1e2'; g.fillRect(cx - 50, 196, 100, 40);
  g.fillStyle = K; for (let x = cx - 50; x < cx + 50; x += 12) g.fillRect(x, 196, 6, 40);
  g.restore();
  g.beginPath(); g.moveTo(cx - 46, 200); g.bezierCurveTo(cx - 48, 228, cx + 48, 228, cx + 46, 200); g.closePath(); g.strokeStyle = K; g.lineWidth = 4; g.stroke();
  curve(g, [cx - 30, 202, cx - 22, 162], K, 5); curve(g, [cx + 30, 202, cx + 22, 162], K, 5);
  // 胳膊：一只挥手、一只叉腰（白手套）
  curve(g, [cx + 34, 164, cx + 80, 150, cx + 70, 104, cx + 104, 88], K, 11);
  curve(g, [cx - 34, 166, cx - 82, 170, cx - 86, 204, cx - 50, 200], K, 11);
  const glove = (x: number, y: number, rot: number) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    ellipse(g, 0, 0, 20, 17, '#fbfbf6', K, 4);
    for (const dx of [-7, 0, 7]) curve(g, [dx, -15, dx, -4], K, 2.5);
    g.beginPath(); g.roundRect(-14, 12, 28, 10, 4); g.fillStyle = '#fbfbf6'; g.fill(); g.strokeStyle = K; g.lineWidth = 3.5; g.stroke();
    g.restore();
  };
  glove(cx + 110, 78, 0.5); glove(cx - 46, 198, -1.6);
  for (const [a, b, c2, d] of [[cx + 132, 52, cx + 146, 40], [cx + 140, 74, cx + 158, 70], [cx + 120, 40, cx + 126, 24]]) curve(g, [a, b, c2, d], K, 3.5);
  // 领结
  g.beginPath(); g.moveTo(cx, 156); g.lineTo(cx - 20, 146); g.lineTo(cx - 20, 168); g.closePath(); g.moveTo(cx, 156); g.lineTo(cx + 20, 146); g.lineTo(cx + 20, 168); g.closePath();
  g.fillStyle = '#c0392b'; g.fill(); g.strokeStyle = K; g.lineWidth = 3; g.stroke(); ellipse(g, cx, 156, 5, 5, '#c0392b', K, 3);
  // 头：浅色圆脸（黑描边）+ 馅饼眼 + 大笑 + 高礼帽（帽子歪着）
  ellipse(g, cx, 110, 46, 42, '#f3dcb8', K, 5);
  for (const ex of [cx - 15, cx + 15]) {
    ellipse(g, ex, 102, 11, 17, '#fbfbf6', K, 3);
    g.beginPath(); g.moveTo(ex + 1, 108); g.arc(ex + 1, 108, 7, -0.55 * Math.PI, 1.25 * Math.PI); g.closePath(); g.fillStyle = K; g.fill();
  }
  ellipse(g, cx, 124, 7, 5, '#c0392b', K, 2.5);
  g.beginPath(); g.moveTo(cx - 28, 130); g.bezierCurveTo(cx - 16, 152, cx + 16, 152, cx + 28, 130); g.bezierCurveTo(cx + 10, 138, cx - 10, 138, cx - 28, 130); g.fillStyle = '#7a1f1a'; g.fill(); g.strokeStyle = K; g.lineWidth = 4; g.stroke();
  g.save(); g.translate(cx + 6, 70); g.rotate(0.18);
  ellipse(g, 0, 0, 46, 8, K);
  g.beginPath(); g.rect(-24, -54, 48, 54); g.fillStyle = K; g.fill();
  curve(g, [-24, -10, 24, -10], '#c0392b', 6);
  g.restore();
  // 跳动的线
  for (const [x1, y1, x2, y2] of [[cx - 92, 120, cx - 74, 120], [cx - 96, 138, cx - 76, 140], [cx - 92, 156, cx - 74, 160]]) curve(g, [x1, y1, x2, y2], K, 3.5);
  // 胶片：颗粒、划痕、暗角、圆角片框
  grain(g, 41, 5200, '#2a2016', 0.22);
  grain(g, 43, 900, '#ffffff', 0.25);
  const r = rng(5);
  g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#3a2e20'; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const x = r() * REF_W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, REF_H); g.stroke(); }
  g.restore();
  vignette(g, 150, 380, 'rgba(40,24,8,0.75)');
  g.save(); g.strokeStyle = '#0b0b0b'; g.lineWidth = 26; g.beginPath(); g.roundRect(0, 0, REF_W, REF_H, 46); g.stroke(); g.restore();
  return c;
}

/* ---------------- 5. 哥特线描：冷色分层的尖拱、细白线描与排线、提灯的小人 ---------------- */

function drawGothicLine(): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  const bg = g.createLinearGradient(0, 0, 0, REF_H);
  bg.addColorStop(0, '#2a3b4f'); bg.addColorStop(0.55, '#16212e'); bg.addColorStop(1, '#070b10');
  g.fillStyle = bg; g.fillRect(0, 0, REF_W, REF_H);
  // 斜照的光束
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [x, w] of [[180, 70], [300, 40], [430, 90]]) {
    const lg = g.createLinearGradient(x, 0, x - 120, REF_H);
    lg.addColorStop(0, 'rgba(170,205,235,0.16)'); lg.addColorStop(1, 'rgba(170,205,235,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 160, REF_H); g.lineTo(x - 160, REF_H); g.closePath(); g.fill();
  }
  g.restore();
  const r = rng(77);
  /** 一个尖拱（填色 + 细线描 + 竖排线） */
  const arch = (x: number, base: number, w: number, h: number, fill: string, line: string, lw: number, hatch: boolean) => {
    g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - h);
    g.quadraticCurveTo(x, base - h - w * 0.8, x + w / 2, base - h - w * 1.05);
    g.quadraticCurveTo(x + w, base - h - w * 0.8, x + w, base - h); g.lineTo(x + w, base); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = lw; g.stroke();
    if (hatch) {
      g.save(); g.clip(); g.globalAlpha = 0.35; g.strokeStyle = line; g.lineWidth = 0.8;
      for (let k = x + 3; k < x + w; k += 5) { g.beginPath(); g.moveTo(k, base - h - w); g.lineTo(k + (r() - 0.5) * 2, base); g.stroke(); }
      g.restore();
    }
  };
  // 远景：一排细高的尖窗
  for (let i = 0; i < 9; i++) arch(20 + i * 70, 300, 36, 150 + (i % 3) * 30, '#1f2c3b', 'rgba(150,180,205,0.55)', 1.2, false);
  // 中景：左右两座大拱门 + 尖塔
  arch(-40, 360, 170, 140, '#0f1720', '#a9c0d4', 1.6, true);
  arch(500, 360, 180, 120, '#0f1720', '#a9c0d4', 1.6, true);
  for (const [x, h] of [[150, 230], [470, 260]]) {
    g.beginPath(); g.moveTo(x - 14, 360); g.lineTo(x - 14, 360 - h); g.lineTo(x, 360 - h - 70); g.lineTo(x + 14, 360 - h); g.lineTo(x + 14, 360); g.closePath();
    g.fillStyle = '#0c131b'; g.fill(); g.strokeStyle = '#a9c0d4'; g.lineWidth = 1.4; g.stroke();
    for (let y = 360 - h + 20; y < 350; y += 26) { g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.stroke(); }
  }
  // 地面 + 带刺的藤
  g.beginPath(); g.moveTo(0, 312); g.bezierCurveTo(160, 296, 300, 322, 640, 300); g.lineTo(640, 360); g.lineTo(0, 360); g.closePath(); g.fillStyle = '#04070a'; g.fill();
  g.strokeStyle = '#cfdbe6'; g.lineWidth = 1.2; g.stroke();
  const vine = (pts: number[]) => {
    curve(g, pts, '#04070a', 5);
    curve(g, pts, '#8ea4b8', 1);
    for (let t = 0.05; t < 1; t += 0.07) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = pts;
      const mt = 1 - t;
      const x = mt ** 3 * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t ** 3 * x3;
      const y = mt ** 3 * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t ** 3 * y3;
      const s = t * 37 % 2 > 1 ? 1 : -1;
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 2 * s, y - 9 * s); g.lineTo(x + 3, y); g.closePath(); g.fillStyle = '#04070a'; g.fill(); g.strokeStyle = '#8ea4b8'; g.lineWidth = 0.8; g.stroke();
    }
  };
  vine([10, 330, 80, 250, 120, 360, 200, 300]);
  vine([640, 320, 580, 250, 540, 350, 470, 300]);
  // 小人：兜帽斗篷（细白描边）+ 苍白的脸 + 提灯
  const fx = 322, fy = 300;
  const glow = g.createRadialGradient(fx + 30, fy - 34, 2, fx + 30, fy - 34, 70);
  glow.addColorStop(0, 'rgba(150,225,255,0.55)'); glow.addColorStop(1, 'rgba(150,225,255,0)');
  g.fillStyle = glow; g.fillRect(fx - 60, fy - 110, 180, 150);
  g.beginPath(); g.moveTo(fx, fy - 74); g.bezierCurveTo(fx - 22, fy - 72, fx - 24, fy - 46, fx - 18, fy - 36);
  g.bezierCurveTo(fx - 30, fy - 10, fx - 32, fy - 2, fx - 26, fy + 4); g.lineTo(fx + 26, fy + 4);
  g.bezierCurveTo(fx + 32, fy - 2, fx + 30, fy - 10, fx + 18, fy - 36); g.bezierCurveTo(fx + 24, fy - 46, fx + 22, fy - 72, fx, fy - 74); g.closePath();
  g.fillStyle = '#05080c'; g.fill(); g.strokeStyle = '#dfe9f2'; g.lineWidth = 1.6; g.stroke();
  ellipse(g, fx, fy - 50, 9, 11, '#e6eef5');
  ellipse(g, fx - 3.5, fy - 51, 2, 3, '#05080c'); ellipse(g, fx + 3.5, fy - 51, 2, 3, '#05080c');
  curve(g, [fx + 16, fy - 30, fx + 30, fy - 40], '#dfe9f2', 1.4);
  g.beginPath(); g.roundRect(fx + 24, fy - 42, 12, 15, 3); g.fillStyle = '#bfefff'; g.fill(); g.strokeStyle = '#dfe9f2'; g.lineWidth = 1.2; g.stroke();
  // 漂浮的光点
  for (let i = 0; i < 40; i++) { const rr = 0.8 + r() * 1.8; ellipse(g, r() * REF_W, 40 + r() * 260, rr, rr, `rgba(220,235,245,${0.25 + r() * 0.5})`); }
  vignette(g, 160, 420, 'rgba(0,0,0,0.7)');
  return c;
}

/* ---------------- 6. 手抄本：羊皮纸、描金首字母、红蓝边框与藤蔓、手写行、页边小画 ---------------- */

function drawManuscript(): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  const r = rng(1250);
  g.fillStyle = '#ecdcb6'; g.fillRect(0, 0, REF_W, REF_H);
  for (let i = 0; i < 26; i++) {
    const x = r() * REF_W, y = r() * REF_H, rr = 30 + r() * 90;
    const b = g.createRadialGradient(x, y, 0, x, y, rr);
    b.addColorStop(0, 'rgba(196,164,112,0.18)'); b.addColorStop(1, 'rgba(196,164,112,0)');
    g.fillStyle = b; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  vignette(g, 170, 400, 'rgba(120,80,30,0.55)');
  const GOLD = '#c9a227', RED = '#a3241c', BLUE = '#26408f', INK = '#2b1d14';
  // 边框：红、蓝两道 + 角上的金点
  g.strokeStyle = RED; g.lineWidth = 4; g.strokeRect(20, 18, 600, 324);
  g.strokeStyle = BLUE; g.lineWidth = 2; g.strokeRect(28, 26, 584, 308);
  for (const [x, y] of [[20, 18], [620, 18], [20, 342], [620, 342]]) { ellipse(g, x, y, 9, 9, GOLD, RED, 2); ellipse(g, x, y, 3, 3, RED); }
  // 左边的藤蔓
  curve(g, [44, 330, 30, 260, 58, 220, 40, 150], '#3a6a30', 3);
  curve(g, [40, 150, 26, 100, 56, 70, 44, 36], '#3a6a30', 3);
  for (let i = 0; i < 9; i++) {
    const y = 60 + i * 30, x = 42 + Math.sin(i * 1.3) * 10;
    ellipse(g, x + (i % 2 ? 12 : -12), y, 9, 4.5, i % 3 === 0 ? RED : '#4f8a3c', INK, 1, i % 2 ? -0.6 : 0.6);
    if (i % 2) ellipse(g, x, y + 12, 3.2, 3.2, GOLD);
  }
  // 描金首字母（蓝底、金框、红字、白点花饰）
  const ix = 70, iy = 44, is = 150;
  g.fillStyle = GOLD; g.fillRect(ix - 6, iy - 6, is + 12, is + 12);
  g.fillStyle = BLUE; g.fillRect(ix, iy, is, is);
  g.save(); g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let y = iy + 10; y < iy + is; y += 18) for (let x = ix + 10 + ((y / 18) % 2) * 9; x < ix + is; x += 18) { g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.font = 'bold italic 132px Georgia, "Times New Roman", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = GOLD; g.strokeText('A', ix + is / 2, iy + is / 2 + 8);
  g.fillStyle = RED; g.fillText('A', ix + is / 2, iy + is / 2 + 8);
  // 手写行：一组组带衬线的竖笔画（像哥特体的 minim），少数词是红字
  const line = (x0: number, x1: number, y: number) => {
    let x = x0;
    while (x < x1 - 12) {
      const n = 2 + Math.floor(r() * 6);
      const col = r() < 0.08 ? RED : INK;
      for (let k = 0; k < n && x < x1; k++) {
        const tall = r() < 0.12;
        g.fillStyle = col;
        g.fillRect(x, y - (tall ? 15 : 10), 2.6, tall ? 15 : 10);
        g.fillRect(x - 0.8, y - (tall ? 15 : 10), 4, 1.6);
        g.fillRect(x + 0.6, y - 1.4, 3.4, 1.6);
        x += 4.6;
      }
      x += 9;
    }
  };
  for (let y = 66; y < 200; y += 22) line(240, 600, y);
  for (let y = 222; y < 330; y += 22) line(70, y > 280 ? 500 : 600, y);
  // 页边小画：拿长矛的蜗牛
  const sx = 556, sy = 316;
  g.save();
  g.beginPath(); g.moveTo(sx - 34, sy); g.bezierCurveTo(sx - 30, sy - 10, sx + 20, sy - 8, sx + 30, sy - 18); g.lineTo(sx + 36, sy - 30);
  g.moveTo(sx + 30, sy - 18); g.lineTo(sx + 42, sy - 24);
  g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.moveTo(sx - 34, sy); g.lineTo(sx + 26, sy); g.bezierCurveTo(sx + 30, sy - 8, sx + 24, sy - 14, sx + 18, sy - 12); g.lineTo(sx - 30, sy - 6); g.closePath();
  g.fillStyle = '#d9b58a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); for (let t = 0; t < Math.PI * 5; t += 0.2) { const rr = 18 - t * 1.1; const x = sx - 6 + Math.cos(t) * rr, y = sy - 22 + Math.sin(t) * rr; if (t === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke();
  curve(g, [sx - 60, sy - 50, sx - 10, sy - 6], INK, 1.6);
  g.beginPath(); g.moveTo(sx - 60, sy - 50); g.lineTo(sx - 64, sy - 40); g.lineTo(sx - 52, sy - 46); g.closePath(); g.fillStyle = GOLD; g.fill();
  g.restore();
  return c;
}

/* ---------------- 7. 古典拼贴：旧油画底、剪下来的天空 / 柱子 / 胸像 / 红布，白纸边与投影 ---------------- */

function drawOldMaster(): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  const r = rng(1520);
  const bg = g.createRadialGradient(330, 160, 40, 330, 180, 420);
  bg.addColorStop(0, '#6a4524'); bg.addColorStop(1, '#1b1109');
  g.fillStyle = bg; g.fillRect(0, 0, REF_W, REF_H);
  // 龟裂纹
  g.save(); g.strokeStyle = 'rgba(10,6,2,0.4)'; g.lineWidth = 0.7;
  for (let i = 0; i < 90; i++) { let x = r() * REF_W, y = r() * REF_H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  g.restore();
  /** 撕下来的不规则多边形 */
  const torn = (cx: number, cy: number, w: number, h: number, seed: number): [number, number][] => {
    const q = rng(seed), pts: [number, number][] = [];
    const edge = (x0: number, y0: number, x1: number, y1: number) => { for (let t = 0; t < 1; t += 0.08) pts.push([x0 + (x1 - x0) * t + (q() - 0.5) * 6, y0 + (y1 - y0) * t + (q() - 0.5) * 6]); };
    edge(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2); edge(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    edge(cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2); edge(cx - w / 2, cy + h / 2, cx - w / 2, cy - h / 2);
    return pts;
  };
  const piece = (pts: [number, number][], rot: number, cx: number, cy: number, paint: () => void) => {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.translate(-cx, -cy);
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 14; g.shadowOffsetX = 5; g.shadowOffsetY = 7; g.fillStyle = '#f2ece0'; g.fill(); g.restore();
    g.lineWidth = 9; g.strokeStyle = '#f2ece0'; g.lineJoin = 'round'; g.stroke();
    g.clip(); paint(); g.restore();
  };
  // 天空一块
  piece(torn(185, 120, 290, 170, 1), -0.07, 185, 120, () => {
    const s = g.createLinearGradient(0, 30, 0, 210); s.addColorStop(0, '#5f8fc4'); s.addColorStop(1, '#e3e6df');
    g.fillStyle = s; g.fillRect(20, 20, 340, 210);
    for (let i = 0; i < 14; i++) { const x = 70 + r() * 230, y = 100 + r() * 70, rr = 16 + r() * 26; const cl = g.createRadialGradient(x, y, 0, x, y, rr); cl.addColorStop(0, 'rgba(255,250,240,0.95)'); cl.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = cl; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  });
  // 一根爱奥尼柱
  piece(torn(470, 190, 110, 290, 2), 0.06, 470, 190, () => {
    const m = g.createLinearGradient(420, 0, 520, 0); m.addColorStop(0, '#b9b09e'); m.addColorStop(0.45, '#f1ebdc'); m.addColorStop(1, '#a39a88');
    g.fillStyle = m; g.fillRect(400, 30, 140, 330);
    g.strokeStyle = 'rgba(90,80,64,0.55)'; g.lineWidth = 1.4;
    for (let x = 436; x <= 504; x += 9) { g.beginPath(); g.moveTo(x, 92); g.lineTo(x, 340); g.stroke(); }
    g.fillStyle = '#e6dfcf'; g.fillRect(420, 70, 100, 20); g.strokeRect(420, 70, 100, 20);
    for (const sx of [426, 514]) { g.beginPath(); for (let t = 0; t < Math.PI * 4; t += 0.2) { const rr = 13 - t; const x = sx + Math.cos(t) * rr, y = 84 + Math.sin(t) * rr; if (t === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  });
  // 胸像侧影
  piece(torn(300, 236, 170, 190, 3), -0.03, 300, 236, () => {
    g.fillStyle = '#3b2a1a'; g.fillRect(200, 130, 220, 220);
    const m = g.createLinearGradient(240, 150, 360, 330); m.addColorStop(0, '#f3eee3'); m.addColorStop(1, '#a9a091');
    g.beginPath(); g.moveTo(262, 330); g.bezierCurveTo(250, 300, 262, 282, 272, 272); g.bezierCurveTo(258, 258, 256, 236, 262, 214);
    g.bezierCurveTo(262, 186, 290, 160, 318, 164); g.bezierCurveTo(342, 168, 352, 190, 350, 206); g.lineTo(362, 226); g.lineTo(352, 230);
    g.bezierCurveTo(354, 240, 350, 246, 346, 248); g.bezierCurveTo(350, 256, 340, 266, 330, 266); g.bezierCurveTo(328, 282, 340, 300, 366, 330); g.closePath();
    g.fillStyle = m; g.fill(); g.strokeStyle = 'rgba(70,60,48,0.6)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#7d8a5a';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(276 + i * 10, 182 - Math.sin(i * 0.5) * 8, 8, 3.5, -0.6 + i * 0.12, 0, Math.PI * 2); g.fill(); }
  });
  // 红布
  piece(torn(120, 286, 200, 110, 4), 0.1, 120, 286, () => {
    g.fillStyle = '#8e1f1a'; g.fillRect(0, 210, 260, 160);
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 34;
      const fold = g.createLinearGradient(x - 14, 0, x + 14, 0);
      fold.addColorStop(0, 'rgba(60,8,6,0.6)'); fold.addColorStop(0.5, 'rgba(210,80,64,0.55)'); fold.addColorStop(1, 'rgba(60,8,6,0.6)');
      g.fillStyle = fold; g.beginPath(); g.moveTo(x - 14, 220); g.bezierCurveTo(x + 10, 260, x - 20, 300, x + 6, 350); g.lineTo(x + 24, 350); g.bezierCurveTo(x, 300, x + 28, 260, x + 6, 220); g.closePath(); g.fill();
    }
  });
  // 刻版画的金色圆盘（排线放射）
  piece(torn(580, 70, 90, 90, 5), 0.2, 580, 70, () => {
    g.fillStyle = '#e9dcc0'; g.fillRect(520, 10, 120, 120);
    g.strokeStyle = 'rgba(80,60,30,0.75)'; g.lineWidth = 1;
    for (let a = 0; a < Math.PI * 2; a += 0.12) { g.beginPath(); g.moveTo(580 + Math.cos(a) * 14, 70 + Math.sin(a) * 14); g.lineTo(580 + Math.cos(a) * 44, 70 + Math.sin(a) * 44); g.stroke(); }
    ellipse(g, 580, 70, 14, 14, '#c9a227', 'rgba(80,60,30,0.8)', 1.5);
  });
  grain(g, 9, 2400, '#000000', 0.12);
  vignette(g, 200, 420, 'rgba(10,5,0,0.6)');
  return c;
}

/* ---------------- 8. 黑绘陶：赤陶底上的黑色剪影、刻出来的细线、回纹与光芒带 ---------------- */

function drawBlackFigure(): HTMLCanvasElement {
  const [c, g] = makeCanvas(REF_W, REF_H);
  const K = '#17100c', T = '#c96a34';
  const bg = g.createRadialGradient(320, 170, 30, 320, 180, 420);
  bg.addColorStop(0, '#dc8448'); bg.addColorStop(1, '#a24c24');
  g.fillStyle = bg; g.fillRect(0, 0, REF_W, REF_H);
  // 上：回纹带
  const band = (y0: number, y1: number) => { g.fillStyle = K; g.fillRect(0, y0, REF_W, 4); g.fillRect(0, y1 - 4, REF_W, 4); };
  band(22, 70);
  g.strokeStyle = K; g.lineWidth = 6; g.lineCap = 'square'; g.lineJoin = 'miter';
  for (let x = 6; x < REF_W; x += 44) {
    g.beginPath();
    g.moveTo(x, 62); g.lineTo(x, 32); g.lineTo(x + 32, 32); g.lineTo(x + 32, 54); g.lineTo(x + 12, 54); g.lineTo(x + 12, 42); g.lineTo(x + 22, 42);
    g.moveTo(x, 62); g.lineTo(x + 44, 62);
    g.stroke();
  }
  // 下：光芒带（向上的黑三角）
  band(290, 338);
  for (let x = 0; x < REF_W; x += 26) { g.beginPath(); g.moveTo(x, 334); g.lineTo(x + 13, 296); g.lineTo(x + 26, 334); g.closePath(); g.fillStyle = K; g.fill(); }
  /** 一个持盾持矛的武士（dir = 1 朝右，-1 朝左），刻线用赤陶色 */
  const warrior = (x: number, dir: 1 | -1) => {
    g.save(); g.translate(x, 0); g.scale(dir, 1);
    // 矛
    g.strokeStyle = K; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-60, 250); g.lineTo(96, 104); g.stroke();
    g.beginPath(); g.moveTo(96, 104); g.lineTo(90, 118); g.lineTo(108, 94); g.lineTo(84, 104); g.closePath(); g.fillStyle = K; g.fill();
    // 腿（弓步）
    g.fillStyle = K;
    g.beginPath(); g.moveTo(-14, 196); g.lineTo(-40, 238); g.lineTo(-48, 276); g.lineTo(-30, 278); g.lineTo(-26, 244); g.lineTo(0, 206); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(4, 200); g.lineTo(30, 236); g.lineTo(28, 276); g.lineTo(48, 278); g.lineTo(42, 238); g.lineTo(18, 196); g.closePath(); g.fill();
    // 躯干、头、盔冠
    g.beginPath(); g.moveTo(-18, 202); g.lineTo(-22, 146); g.quadraticCurveTo(0, 130, 22, 146); g.lineTo(18, 202); g.closePath(); g.fill();
    ellipse(g, 2, 122, 16, 18, K);
    g.beginPath(); g.moveTo(-14, 112); g.quadraticCurveTo(-6, 76, 34, 84); g.quadraticCurveTo(10, 92, 4, 108); g.closePath(); g.fill();
    // 圆盾
    ellipse(g, 30, 168, 44, 44, K);
    // 刻线（赤陶色细线）
    g.strokeStyle = T; g.lineWidth = 1.6;
    ellipse(g, 30, 168, 37, 37, undefined, T, 1.6);
    g.beginPath(); for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { g.moveTo(30, 168); g.lineTo(30 + Math.cos(a) * 18, 168 + Math.sin(a) * 18); } g.stroke();
    ellipse(g, 30, 168, 6, 6, undefined, T, 1.6);
    g.beginPath(); g.moveTo(6, 118); g.lineTo(16, 118); g.moveTo(-8, 128); g.quadraticCurveTo(0, 134, 12, 128); g.stroke();
    g.beginPath(); g.arc(-34, 244, 5, 0, Math.PI * 1.6); g.moveTo(40, 242); g.arc(36, 242, 4, 0, Math.PI * 1.6); g.stroke();
    g.beginPath(); g.moveTo(-18, 196); g.lineTo(18, 196); g.stroke();
    g.restore();
  };
  warrior(212, 1); warrior(430, -1);
  // 填空的小玫瑰纹
  for (const [x, y] of [[321, 130], [104, 120], [540, 120], [321, 250]]) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) ellipse(g, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.5, 3.5, K);
    ellipse(g, x, y, 3, 3, K);
  }
  // 陶面的光与磨损
  const sheen = g.createLinearGradient(0, 0, REF_W, 0);
  sheen.addColorStop(0, 'rgba(0,0,0,0.25)'); sheen.addColorStop(0.45, 'rgba(255,220,180,0.12)'); sheen.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = sheen; g.fillRect(0, 0, REF_W, REF_H);
  grain(g, 21, 1800, '#3a1a08', 0.18);
  return c;
}

/** 卡 id → 画法（taxonomy.ts 的 REF_ONLY） */
const DRAW: Record<string, () => HTMLCanvasElement> = {
  'ref.8bit': draw8bit,
  'ref.16bit': draw16bit,
  'ref.densePixel': drawDensePixel,
  'ref.rubberHose': drawRubberHose,
  'ref.gothicLine': drawGothicLine,
  'ref.manuscript': drawManuscript,
  'ref.oldMaster': drawOldMaster,
  'ref.blackFigure': drawBlackFigure,
};
export const REF_ART_IDS = Object.keys(DRAW);

/** 画一张仅参考卡的代表图（640×360）；没有画法时 null */
export function drawRefArt(id: string): HTMLCanvasElement | null {
  const f = DRAW[id];
  return f ? f() : null;
}
