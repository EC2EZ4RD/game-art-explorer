import type { SceneImage } from './types';

/*
 * 皮影戏台的程序贴图（技术补全 2026-10-23，H 轨道）：只画图形，不写字（不涉及字体子集）。
 *   幕布：从中间往四边由暖白到橙褐的透光渐变 + 细布纹 + 暗角；景片（亭子、松、远山、如意云、月）直接画在幕布上，
 *     是「半透明的彩色皮子」：压暗的彩色 + 墨色轮廓 + 镂空花纹（镂空处透出幕布的光）；
 *   影人：头、身、裙、臂、兵器分件画，关节处一颗铆钉；部件按关节摆成姿势（每件单独一张贴图四边形，可以各转各的），
 *     镂空花纹用 destination-out 真的挖空——幕布的光从洞里透过来；
 *   签子：从脖子和两只手伸到幕布下沿的细暗线（皮影的「主杆」和「手杆」）。
 * 颜色是「背光透过皮子」的颜色：饱和、偏亮，轮廓压黑。贴图不受场景光（lit = 0），跟色板走的程度由 recolor 控制。
 */

type G = CanvasRenderingContext2D;
type Pt = [number, number];

/** 皮子的几种颜色（背光下） */
export const LEATHER = {
  red: '#C9361F', redLight: '#E8643A', yellow: '#EDB536', green: '#2F8E55', teal: '#2C8A8C', black: '#1A0D06', tan: '#D69A55', pink: '#E07A7A', white: '#F4E2B8',
};

const INK = LEATHER.black;

function path(g: G, pts: Pt[], close = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}

function fillStroke(g: G, fill: string, lw: number) {
  g.fillStyle = fill; g.fill();
  g.strokeStyle = INK; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
}

/** 在当前路径里挖洞（镂空）：f 里画的形状全部透明 */
function cut(g: G, f: () => void) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  f();
  g.restore();
}

/** 一排小圆洞 / 月牙 / 四瓣花：镂空花纹 */
function holeDots(g: G, x0: number, y0: number, x1: number, y1: number, step: number, r: number) {
  cut(g, () => {
    for (let y = y0; y <= y1; y += step) for (let x = x0 + ((Math.round((y - y0) / step) % 2) * step) / 2; x <= x1; x += step) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  });
}
function holeFlower(g: G, x: number, y: number, r: number) {
  cut(g, () => {
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.24, a, 0, Math.PI * 2); g.fill(); }
  });
}
function holeCrescents(g: G, x0: number, x1: number, y: number, r: number) {
  cut(g, () => {
    for (let x = x0; x <= x1; x += r * 2.6) { g.beginPath(); g.arc(x, y, r, Math.PI * 0.1, Math.PI * 0.9); g.arc(x, y - r * 0.3, r * 0.8, Math.PI * 0.85, Math.PI * 0.15, true); g.fill(); }
  });
}
/** 墨线（刻出来的线，皮子上的「阴刻」） */
function line(g: G, pts: Pt[], lw: number, color = INK) {
  path(g, pts, false);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}

/* ======================== 幕布与景片 ======================== */

/** 幕布（宽高比 w:h ≈ 15.6:8.4）：透光渐变 + 布纹 + 暗角；景片画在上面 */
/**
 * 景片的地平线（幕布从上往下的比例，收尾 X）：影人站在这条线上，线下是一条镂空的皮子地面（土坡 + 海水纹）。
 * 原来景片贴着幕布下沿、影人只有幕布高的三分之一，叙事 UI 的对话框一盖就只剩头；现在影人放大、站高，对话框盖住的是地面
 */
export const SCREEN_GROUND = 0.74;

export function drawScreen(g: G, w: number, h: number) {
  const rg = g.createRadialGradient(w * 0.5, h * 0.52, h * 0.08, w * 0.5, h * 0.55, w * 0.62);
  rg.addColorStop(0, '#FFF3CC');
  rg.addColorStop(0.45, '#FBD58A');
  rg.addColorStop(0.8, '#E59A45');
  rg.addColorStop(1, '#A85A22');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  // 布纹：细横竖线
  g.globalAlpha = 0.05; g.strokeStyle = '#6B3A12'; g.lineWidth = 1;
  for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
  for (let x = 0; x < w; x += 3) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
  g.globalAlpha = 1;
  const s = h / 8.4; // 每世界单位多少像素
  // 远山：两层，淡（离幕布远一点的皮子影子更淡、边更软）
  g.save();
  g.filter = 'blur(2px)';
  g.globalAlpha = 0.35;
  path(g, [[0, h], [0, h * 0.72], [w * 0.12, h * 0.6], [w * 0.22, h * 0.7], [w * 0.36, h * 0.56], [w * 0.5, h * 0.7], [w * 0.62, h * 0.6], [w * 0.78, h * 0.68], [w * 0.9, h * 0.58], [w, h * 0.66], [w, h]]);
  g.fillStyle = '#7A4A1E'; g.fill();
  g.restore();
  // 月亮（右上）：一圈墨边，月面镂空透亮
  g.save();
  g.beginPath(); g.arc(w * 0.8, h * 0.2, s * 0.75, 0, Math.PI * 2); g.fillStyle = '#FFF8E0'; g.fill(); g.strokeStyle = 'rgba(26,13,6,0.55)'; g.lineWidth = s * 0.06; g.stroke();
  g.restore();
  // 如意云（左上、右上）
  ruyiCloud(g, w * 0.16, h * 0.17, s * 1.1);
  ruyiCloud(g, w * 0.62, h * 0.12, s * 0.8);
  // 地面：一条镂空的皮子土坡（影人站在它的上沿），下半截是海水纹（江崖海水）
  groundBand(g, w, h, h * SCREEN_GROUND, s);
  // 亭子（左）、松（右）、山石（右下）：都立在地平线上
  pavilionSil(g, w * 0.2, h * SCREEN_GROUND + s * 0.05, s);
  pineSil(g, w * 0.86, h * SCREEN_GROUND + s * 0.05, s);
  rocksSil(g, w * 0.62, h * SCREEN_GROUND + s * 0.2, s);
  // 暗角
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  vg.addColorStop(0, 'rgba(60,20,0,0)');
  vg.addColorStop(1, 'rgba(60,20,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

/** 皮子地面：上沿微微起伏的土坡（赭色皮子 + 墨边、两排镂空圆点），下面一条海水纹带（青绿皮子，镂空的浪弧） */
function groundBand(g: G, w: number, h: number, top: number, s: number) {
  g.save();
  const pts: Pt[] = [[0, h], [0, top + s * 0.12]];
  for (let k = 1; k <= 24; k++) { const x = (k / 24) * w; pts.push([x, top + Math.sin(k * 1.7) * s * 0.06 + (k % 5 === 2 ? -s * 0.08 : 0)]); }
  pts.push([w, h]);
  path(g, pts);
  g.globalAlpha = 0.9;
  fillStroke(g, '#9A5424', s * 0.05);
  g.globalAlpha = 1;
  holeDots(g, s * 0.3, top + s * 0.35, w - s * 0.3, top + s * 0.6, s * 0.34, s * 0.06);
  // 海水纹：一条青绿带，一排排半圆浪弧镂空
  const wy = top + s * 0.95;
  g.beginPath(); g.rect(0, wy, w, h - wy);
  g.globalAlpha = 0.85;
  fillStroke(g, LEATHER.teal, s * 0.05);
  g.globalAlpha = 1;
  cut(g, () => {
    const r = s * 0.28;
    for (let row = 0; row < 4; row++) {
      const y = wy + r * 1.1 + row * r * 1.25;
      if (y > h + r) break;
      for (let x = (row % 2) * r; x < w + r; x += r * 2.2) {
        g.beginPath(); g.arc(x, y, r, Math.PI, Math.PI * 2); g.arc(x, y, r * 0.62, Math.PI * 2, Math.PI, true); g.closePath(); g.fill();
      }
    }
  });
  g.restore();
}

/** 如意云：三个卷头 + 一条云尾，青绿皮子，镂空卷心 */
function ruyiCloud(g: G, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.arc(-s * 0.45, 0, s * 0.32, Math.PI * 0.5, Math.PI * 2.2);
  g.arc(0, -s * 0.18, s * 0.36, Math.PI * 1.0, Math.PI * 2.1);
  g.arc(s * 0.48, 0, s * 0.3, Math.PI * 1.2, Math.PI * 2.5);
  g.quadraticCurveTo(s * 0.9, s * 0.35, s * 1.5, s * 0.2);
  g.quadraticCurveTo(s * 0.8, s * 0.55, -s * 0.2, s * 0.32);
  g.closePath();
  g.globalAlpha = 0.85;
  fillStroke(g, LEATHER.teal, s * 0.05);
  g.globalAlpha = 1;
  cut(g, () => {
    for (const [cx, cy, r] of [[-s * 0.45, 0, s * 0.13], [0, -s * 0.18, s * 0.15], [s * 0.48, 0, s * 0.12]] as [number, number, number][]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 1.6); g.lineTo(cx, cy); g.fill(); }
  });
  g.restore();
}

/** 亭子剪影：台基、两根柱、栏杆（冰裂格镂空）、重檐翘角顶 */
function pavilionSil(g: G, x: number, base: number, s: number) {
  g.save();
  g.translate(x, base);
  const W = s * 3.2, H = s * 2.0;
  // 台基
  path(g, [[-W * 0.62, 0], [W * 0.62, 0], [W * 0.56, -s * 0.35], [-W * 0.56, -s * 0.35]]);
  fillStroke(g, '#8E4A1C', s * 0.05);
  holeDots(g, -W * 0.5, -s * 0.24, W * 0.5, -s * 0.12, s * 0.24, s * 0.05);
  // 柱
  for (const cx of [-W * 0.4, W * 0.4]) { g.fillStyle = LEATHER.red; g.fillRect(cx - s * 0.08, -s * 0.35 - H, s * 0.16, H); g.strokeStyle = INK; g.lineWidth = s * 0.04; g.strokeRect(cx - s * 0.08, -s * 0.35 - H, s * 0.16, H); }
  // 栏杆：一条横带，镂空菱格
  g.fillStyle = '#B5582A'; g.fillRect(-W * 0.45, -s * 0.95, W * 0.9, s * 0.5); g.strokeStyle = INK; g.lineWidth = s * 0.04; g.strokeRect(-W * 0.45, -s * 0.95, W * 0.9, s * 0.5);
  cut(g, () => { for (let k = -5; k <= 5; k++) { const cx = k * W * 0.08; path(g, [[cx, -s * 0.9], [cx + s * 0.1, -s * 0.7], [cx, -s * 0.5], [cx - s * 0.1, -s * 0.7]]); g.fill(); } });
  // 下檐
  const roof = (y: number, rw: number, rh: number, col: string) => {
    g.beginPath();
    g.moveTo(-rw * 0.62, y + rh * 0.05);
    g.quadraticCurveTo(-rw * 0.45, y + rh * 0.35, -rw * 0.3, y - rh * 0.55);
    g.lineTo(rw * 0.3, y - rh * 0.55);
    g.quadraticCurveTo(rw * 0.45, y + rh * 0.35, rw * 0.62, y + rh * 0.05);
    g.quadraticCurveTo(rw * 0.3, y + rh * 0.2, 0, y + rh * 0.18);
    g.quadraticCurveTo(-rw * 0.3, y + rh * 0.2, -rw * 0.62, y + rh * 0.05);
    g.closePath();
    fillStroke(g, col, s * 0.05);
    holeCrescents(g, -rw * 0.3, rw * 0.3, y - rh * 0.05, s * 0.07);
  };
  roof(-s * 0.35 - H, W * 1.15, s * 0.9, LEATHER.green);
  // 上层：小一圈 + 宝顶
  g.fillStyle = LEATHER.red; g.fillRect(-W * 0.22, -s * 0.35 - H - s * 1.2, W * 0.44, s * 0.6); g.strokeStyle = INK; g.strokeRect(-W * 0.22, -s * 0.35 - H - s * 1.2, W * 0.44, s * 0.6);
  holeFlower(g, 0, -s * 0.35 - H - s * 0.9, s * 0.22);
  roof(-s * 0.35 - H - s * 1.25, W * 0.75, s * 0.8, LEATHER.green);
  g.beginPath(); g.arc(0, -s * 0.35 - H - s * 2.0, s * 0.14, 0, Math.PI * 2); fillStroke(g, LEATHER.yellow, s * 0.04);
  g.restore();
}

/** 松：歪斜的树干 + 一团团扇形针叶（镂空放射线） */
function pineSil(g: G, x: number, base: number, s: number) {
  g.save();
  g.translate(x, base);
  g.beginPath();
  g.moveTo(-s * 0.25, 0); g.quadraticCurveTo(-s * 0.1, -s * 2, s * 0.4, -s * 3.4); g.lineTo(s * 0.62, -s * 3.3); g.quadraticCurveTo(s * 0.2, -s * 1.9, s * 0.25, 0); g.closePath();
  fillStroke(g, '#7A3E14', s * 0.05);
  line(g, [[-s * 0.05, -s * 0.5], [s * 0.05, -s * 1.2], [s * 0.2, -s * 2.0]], s * 0.03, 'rgba(26,13,6,0.7)');
  const tufts: [number, number, number][] = [[s * 0.5, -s * 3.6, 1.1], [-s * 0.6, -s * 2.8, 0.95], [s * 1.2, -s * 2.6, 0.9], [-s * 0.3, -s * 3.9, 0.8], [s * 1.4, -s * 3.6, 0.75]];
  for (const [tx, ty, k] of tufts) {
    const r = s * 0.75 * k;
    g.beginPath(); g.moveTo(tx - r, ty + r * 0.15); g.quadraticCurveTo(tx, ty - r * 0.9, tx + r, ty + r * 0.15); g.quadraticCurveTo(tx, ty + r * 0.4, tx - r, ty + r * 0.15); g.closePath();
    fillStroke(g, LEATHER.green, s * 0.04);
    cut(g, () => { for (let a = -0.9; a <= 0.9; a += 0.3) { g.beginPath(); g.moveTo(tx, ty + r * 0.2); g.lineTo(tx + Math.sin(a) * r * 0.85, ty + r * 0.2 - Math.cos(a) * r * 0.55); g.lineWidth = s * 0.035; g.strokeStyle = '#000'; g.stroke(); } });
  }
  g.restore();
}

/** 山石：几块叠起的石头，刻纹 + 圆洞 */
function rocksSil(g: G, x: number, base: number, s: number) {
  g.save();
  g.translate(x, base);
  const rock = (pts: Pt[], col: string) => { path(g, pts.map(([a, b]) => [a * s, b * s] as Pt)); fillStroke(g, col, s * 0.05); };
  rock([[-1.6, 0], [-1.4, -0.9], [-0.7, -1.3], [0.1, -0.9], [0.3, 0]], '#5E6E3A');
  rock([[-0.2, 0], [0.1, -1.4], [0.8, -1.9], [1.5, -1.2], [1.6, 0]], '#4F5F7A');
  holeDots(g, -1.2 * s, -0.7 * s, -0.2 * s, -0.3 * s, s * 0.22, s * 0.05);
  line(g, [[0.4 * s, -0.4 * s], [0.8 * s, -1.2 * s], [1.2 * s, -0.8 * s]], s * 0.035);
  g.restore();
}

/* ======================== 影人 ======================== */

export interface PuppetSpec {
  key: string;
  robe: string;
  trim: string;
  face: 'hollow' | 'solid';
  faceColor?: string;
  hat: 'helmet' | 'horns' | 'bun';
  weapon: 'spear' | 'mace' | 'fan';
}

const PX = 128; // 每世界单位的像素

/** 头（侧面朝右）：空脸（只刻一条侧脸轮廓线，脸是透亮的）/ 实脸（涂满颜色）；盔 + 翎子 / 角 + 火发 / 发髻 + 簪花 */
function drawHead(sp: PuppetSpec) {
  return (g: G, w: number, h: number) => {
    const s = PX;
    g.translate(w * 0.6, h * 0.68);
    // 脸 + 后脑
    g.beginPath();
    g.moveTo(-s * 0.32, -s * 0.05);
    g.quadraticCurveTo(-s * 0.36, -s * 0.42, 0, -s * 0.46);
    g.quadraticCurveTo(s * 0.28, -s * 0.44, s * 0.3, -s * 0.2); // 额头
    g.lineTo(s * 0.4, -s * 0.06); // 鼻尖
    g.lineTo(s * 0.3, 0.0);
    g.quadraticCurveTo(s * 0.34, s * 0.08, s * 0.28, s * 0.12); // 嘴
    g.quadraticCurveTo(s * 0.3, s * 0.24, s * 0.12, s * 0.28); // 下巴
    g.quadraticCurveTo(-s * 0.18, s * 0.3, -s * 0.32, -s * 0.05);
    g.closePath();
    if (sp.face === 'solid') fillStroke(g, sp.faceColor ?? LEATHER.green, s * 0.035);
    else { fillStroke(g, LEATHER.white, s * 0.035); cut(g, () => { g.beginPath(); g.moveTo(s * 0.22, -s * 0.38); g.quadraticCurveTo(s * 0.34, -s * 0.12, s * 0.2, s * 0.2); g.quadraticCurveTo(-s * 0.1, s * 0.26, -s * 0.12, -s * 0.05); g.quadraticCurveTo(-s * 0.1, -s * 0.36, s * 0.22, -s * 0.38); g.fill(); }); }
    // 凤眼、眉
    line(g, [[s * 0.05, -s * 0.16], [s * 0.2, -s * 0.2], [s * 0.26, -s * 0.15]], s * 0.03);
    line(g, [[s * 0.02, -s * 0.26], [s * 0.25, -s * 0.31]], s * 0.035);
    if (sp.face === 'solid') { g.fillStyle = LEATHER.yellow; g.beginPath(); g.arc(s * 0.17, -s * 0.17, s * 0.05, 0, Math.PI * 2); g.fill(); line(g, [[s * 0.22, s * 0.12], [s * 0.26, s * 0.22]], s * 0.03, LEATHER.white); }
    if (sp.hat === 'helmet') {
      // 盔：一块半圆 + 前沿 + 镂空圆点，两根长翎子往后弯
      g.beginPath(); g.moveTo(-s * 0.4, -s * 0.12); g.quadraticCurveTo(-s * 0.4, -s * 0.66, s * 0.04, -s * 0.68); g.quadraticCurveTo(s * 0.34, -s * 0.66, s * 0.32, -s * 0.36); g.lineTo(-s * 0.1, -s * 0.36); g.lineTo(-s * 0.3, -s * 0.05); g.closePath();
      fillStroke(g, sp.robe, s * 0.035);
      holeDots(g, -s * 0.28, -s * 0.58, s * 0.2, -s * 0.44, s * 0.11, s * 0.025);
      g.beginPath(); g.arc(s * 0.02, -s * 0.72, s * 0.08, 0, Math.PI * 2); fillStroke(g, sp.trim, s * 0.03);
      for (const k of [0, 1]) {
        g.beginPath(); g.moveTo(-s * 0.02, -s * 0.74); g.bezierCurveTo(-s * 0.5, -s * (1.4 + k * 0.1), -s * (1.0 + k * 0.2), -s * 0.6, -s * (1.1 + k * 0.25), -s * (0.15 - k * 0.1));
        g.strokeStyle = INK; g.lineWidth = s * 0.05; g.lineCap = 'round'; g.stroke();
        g.strokeStyle = sp.trim; g.lineWidth = s * 0.025; g.stroke();
      }
    } else if (sp.hat === 'horns') {
      // 火焰发 + 双角
      g.beginPath(); g.moveTo(-s * 0.36, -s * 0.05); for (let k = 0; k <= 6; k++) { const a = Math.PI * (0.95 + k * 0.1); g.lineTo(Math.cos(a) * s * 0.62, -s * 0.18 + Math.sin(a) * s * 0.5); g.lineTo(Math.cos(a + 0.05) * s * 0.4, -s * 0.18 + Math.sin(a + 0.05) * s * 0.34); } g.lineTo(s * 0.1, -s * 0.44); g.closePath();
      fillStroke(g, LEATHER.red, s * 0.035);
      for (const dx of [-0.1, 0.12]) { g.beginPath(); g.moveTo(s * (dx - 0.06), -s * 0.44); g.quadraticCurveTo(s * (dx + 0.02), -s * 0.8, s * (dx + 0.14), -s * 0.86); g.quadraticCurveTo(s * (dx + 0.06), -s * 0.66, s * (dx + 0.06), -s * 0.44); g.closePath(); fillStroke(g, LEATHER.yellow, s * 0.03); }
    } else {
      // 发髻 + 簪花
      g.beginPath(); g.ellipse(-s * 0.18, -s * 0.48, s * 0.24, s * 0.16, -0.4, 0, Math.PI * 2); fillStroke(g, INK, s * 0.03);
      g.beginPath(); g.arc(-s * 0.02, -s * 0.58, s * 0.09, 0, Math.PI * 2); fillStroke(g, LEATHER.pink, s * 0.025);
      holeFlower(g, -s * 0.02, -s * 0.58, s * 0.1);
      line(g, [[-s * 0.42, -s * 0.36], [-s * 0.5, s * 0.2]], s * 0.04);
    }
    // 领口（脖子接身子的地方）+ 关节铆钉
    g.beginPath(); g.moveTo(-s * 0.12, s * 0.26); g.lineTo(s * 0.14, s * 0.26); g.lineTo(s * 0.08, s * 0.4); g.lineTo(-s * 0.08, s * 0.4); g.closePath(); fillStroke(g, sp.trim, s * 0.03);
    g.beginPath(); g.arc(0, s * 0.33, s * 0.035, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  };
}

/** 身子：上宽下窄的梯形，领口 + 腰带 + 甲片（一排排月牙镂空）或团花 */
function drawTorso(sp: PuppetSpec) {
  return (g: G, w: number, h: number) => {
    const s = PX;
    g.translate(w / 2, h / 2);
    path(g, [[-s * 0.42, -s * 0.62], [s * 0.4, -s * 0.62], [s * 0.34, s * 0.62], [-s * 0.36, s * 0.62]]);
    fillStroke(g, sp.robe, s * 0.04);
    // 护心镜 / 团花
    g.beginPath(); g.arc(s * 0.05, -s * 0.18, s * 0.17, 0, Math.PI * 2); fillStroke(g, sp.trim, s * 0.03);
    holeFlower(g, s * 0.05, -s * 0.18, s * 0.16);
    for (let k = 0; k < 3; k++) holeCrescents(g, -s * 0.26, s * 0.3, s * (0.08 + k * 0.13), s * 0.055);
    // 腰带
    g.fillStyle = sp.trim; g.fillRect(-s * 0.38, s * 0.46, s * 0.74, s * 0.12); g.strokeStyle = INK; g.lineWidth = s * 0.03; g.strokeRect(-s * 0.38, s * 0.46, s * 0.74, s * 0.12);
    // 肩上的铆钉（手臂挂在这里）、腰上的铆钉（裙子挂在这里）
    for (const [x, y] of [[0, -s * 0.5], [0, s * 0.52]] as Pt[]) { g.beginPath(); g.arc(x, y, s * 0.035, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
  };
}

/** 裙 + 靴：外摆的长袍下摆，前片有一列团花镂空，底下一双翘头靴 */
function drawSkirt(sp: PuppetSpec) {
  return (g: G, w: number, h: number) => {
    const s = PX;
    g.translate(w / 2, 0);
    const H = h - s * 0.22;
    g.beginPath(); g.moveTo(-s * 0.34, s * 0.04); g.lineTo(s * 0.32, s * 0.04); g.quadraticCurveTo(s * 0.5, H * 0.6, s * 0.62, H); g.lineTo(-s * 0.58, H); g.quadraticCurveTo(-s * 0.48, H * 0.6, -s * 0.34, s * 0.04); g.closePath();
    fillStroke(g, sp.robe, s * 0.04);
    // 前片
    path(g, [[-s * 0.06, s * 0.08], [s * 0.2, s * 0.08], [s * 0.26, H * 0.92], [-s * 0.12, H * 0.92]]);
    fillStroke(g, sp.trim, s * 0.03);
    for (let k = 0; k < 4; k++) holeFlower(g, s * 0.07, s * 0.28 + k * (H * 0.2), s * 0.12);
    // 下摆的一排波纹镂空
    holeCrescents(g, -s * 0.48, s * 0.5, H * 0.88, s * 0.06);
    // 靴
    for (const dx of [-0.26, 0.2]) { g.beginPath(); g.moveTo(s * (dx - 0.12), H - s * 0.02); g.lineTo(s * (dx + 0.08), H - s * 0.02); g.quadraticCurveTo(s * (dx + 0.3), H + s * 0.06, s * (dx + 0.28), H + s * 0.18); g.lineTo(s * (dx - 0.12), H + s * 0.2); g.closePath(); fillStroke(g, INK, s * 0.02); }
    g.beginPath(); g.arc(0, s * 0.1, s * 0.035, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  };
}

/** 手臂：宽袖 + 袖口（顶端是肩关节，底端是手） */
function drawArm(sp: PuppetSpec) {
  return (g: G, w: number, h: number) => {
    const s = PX;
    g.translate(w / 2, 0);
    g.beginPath(); g.moveTo(-s * 0.12, s * 0.04); g.lineTo(s * 0.12, s * 0.04); g.quadraticCurveTo(s * 0.22, h * 0.5, s * 0.2, h - s * 0.3); g.lineTo(-s * 0.2, h - s * 0.24); g.quadraticCurveTo(-s * 0.18, h * 0.5, -s * 0.12, s * 0.04); g.closePath();
    fillStroke(g, sp.robe, s * 0.035);
    holeDots(g, -s * 0.08, h * 0.25, s * 0.1, h * 0.6, s * 0.1, s * 0.022);
    g.fillStyle = sp.trim; g.fillRect(-s * 0.21, h - s * 0.34, s * 0.42, s * 0.1); g.strokeStyle = INK; g.lineWidth = s * 0.025; g.strokeRect(-s * 0.21, h - s * 0.34, s * 0.42, s * 0.1);
    // 手（握拳）
    g.beginPath(); g.ellipse(0, h - s * 0.14, s * 0.1, s * 0.12, 0, 0, Math.PI * 2); fillStroke(g, sp.face === 'solid' ? (sp.faceColor ?? LEATHER.green) : LEATHER.white, s * 0.025);
    g.beginPath(); g.arc(0, s * 0.08, s * 0.035, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  };
}

/** 兵器：长枪（枪缨）/ 狼牙棒 / 团扇 */
function drawWeapon(sp: PuppetSpec) {
  return (g: G, w: number, h: number) => {
    const s = PX;
    g.translate(w / 2, 0);
    if (sp.weapon === 'fan') {
      line(g, [[0, h * 0.45], [0, h]], s * 0.05);
      g.beginPath(); g.ellipse(0, h * 0.25, w * 0.42, h * 0.24, 0, 0, Math.PI * 2); fillStroke(g, LEATHER.pink, s * 0.035);
      holeFlower(g, 0, h * 0.25, w * 0.32);
      return;
    }
    line(g, [[0, s * 0.3], [0, h]], s * 0.06);
    if (sp.weapon === 'spear') {
      path(g, [[0, 0], [s * 0.1, s * 0.3], [0, s * 0.42], [-s * 0.1, s * 0.3]]); fillStroke(g, LEATHER.white, s * 0.03);
      g.beginPath(); g.moveTo(-s * 0.04, s * 0.45); g.quadraticCurveTo(-s * 0.22, s * 0.7, -s * 0.1, s * 0.85); g.quadraticCurveTo(0, s * 0.62, s * 0.04, s * 0.45); g.closePath(); fillStroke(g, LEATHER.red, s * 0.025);
    } else {
      g.beginPath(); g.ellipse(0, s * 0.3, s * 0.18, s * 0.3, 0, 0, Math.PI * 2); fillStroke(g, LEATHER.yellow, s * 0.035);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; path(g, [[Math.cos(a) * s * 0.16, s * 0.3 + Math.sin(a) * s * 0.27], [Math.cos(a) * s * 0.3, s * 0.3 + Math.sin(a) * s * 0.42], [Math.cos(a + 0.3) * s * 0.17, s * 0.3 + Math.sin(a + 0.3) * s * 0.28]]); fillStroke(g, INK, s * 0.01); }
      holeDots(g, -s * 0.08, s * 0.16, s * 0.08, s * 0.44, s * 0.12, s * 0.03);
    }
  };
}

/** 签子（细暗线，画成一张窄长贴图） */
function drawRod(g: G, w: number, h: number) {
  const lg = g.createLinearGradient(0, 0, w, 0);
  lg.addColorStop(0, 'rgba(60,28,8,0)');
  lg.addColorStop(0.5, 'rgba(60,28,8,0.9)');
  lg.addColorStop(1, 'rgba(60,28,8,0)');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
}

/**
 * 摆一个影人：脚底中点 (x, y)，朝向 dir（1 朝右 / −1 朝左，整组水平翻转），身高约 3.9 × s。
 * pose = [后臂, 前臂, 兵器] 的角度（弧度；手臂 0 = 垂直向下、正 = 往前抬；兵器 0 = 竖直、负 = 枪尖往前倒）。
 * 每个部件按「关节点」摆：部件贴图里关节在 (ox, oy)（0~1，y 向下），世界里关节在 (jx, jy)，绕关节转 rot。
 * 返回贴图四边形，以及头顶 / 脖子 / 两只手的位置（挂签子、记角色）
 */
export function puppetImages(sp: PuppetSpec, x: number, y: number, z: number, dir: 1 | -1, s = 1, pose: [number, number, number] = [0.3, 1.0, -0.5], recolor = 0.35): { images: SceneImage[]; head: [number, number]; hands: [number, number][]; neck: [number, number] } {
  const imgs: SceneImage[] = [];
  const P = (lx: number, ly: number): [number, number] => [x + lx * dir * s, y + ly * s];
  const part = (name: string, draw: (g: G, w: number, h: number) => void, w: number, h: number, ox: number, oy: number, jx: number, jy: number, rot = 0, dz = 0) => {
    const r = rot * dir, c = Math.cos(r), sn = Math.sin(r);
    const dx = (0.5 - ox) * w * dir * s, dy = (oy - 0.5) * h * s;
    const [px, py] = P(jx, jy);
    imgs.push({
      file: '', canvas: { key: `puppet:${sp.key}:${name}:v2`, w: w * PX, h: h * PX, draw },
      pos: [px + c * dx - sn * dy, py + sn * dx + c * dy, z + dz], size: [w * s, h * s], anchor: 'center', flipX: dir < 0, rot: [0, 0, r], lit: 0, recolor, cut: 0.5, role: 'character',
    });
  };
  const L = 1.25, shoulder: [number, number] = [0.04, 2.62];
  /** 手：肩 + R(a)·(0, −(L − 0.15)) */
  const hand = (a: number): [number, number] => [shoulder[0] + Math.sin(a) * (L - 0.15), shoulder[1] - Math.cos(a) * (L - 0.15)];
  const hb = hand(pose[0]), hf = hand(pose[1]);
  const armO = 0.08 / L;
  part('armB', drawArm(sp), 0.5, L, 0.5, armO, shoulder[0], shoulder[1], pose[0], -0.004);
  part('skirt', drawSkirt(sp), 1.4, 1.96, 0.5, 0.1 / 1.96, 0.02, 1.86);
  part('torso', drawTorso(sp), 0.95, 1.3, 0.5, 0.5, 0, 2.3, 0, 0.002);
  part('head', drawHead(sp), 2.2, 1.8, 0.6, 0.68, 0.0, 3.25, 0, 0.004);
  const fan = sp.weapon === 'fan', wl = fan ? 0.9 : 2.9;
  part('weapon', drawWeapon(sp), fan ? 0.75 : 0.45, wl, 0.5, fan ? 0.85 : 0.62, hf[0], hf[1], pose[2], 0.006);
  part('armF', drawArm(sp), 0.5, L, 0.5, armO, shoulder[0], shoulder[1], pose[1], 0.008);
  return { images: imgs, head: P(0.02, 4.05), hands: [P(hb[0], hb[1]), P(hf[0], hf[1])], neck: P(0.02, 2.95) };
}

/** 一根签子：从 (x0, y0) 到 (x1, y1)（世界单位），画成窄长贴图四边形 */
export function rodImage(x0: number, y0: number, x1: number, y1: number, z: number): SceneImage {
  const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(x1 - x0, -(y1 - y0));
  return { file: '', canvas: { key: 'puppet:rod:v2', w: 8, h: 64, draw: drawRod }, pos: [(x0 + x1) / 2, (y0 + y1) / 2, z], size: [0.05, len], anchor: 'center', rot: [0, 0, a], lit: 0, recolor: 0.2, cut: 0.35, role: 'ink', dither: true };
}
