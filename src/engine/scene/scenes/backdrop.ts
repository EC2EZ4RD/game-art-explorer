import { RIG_FLAT, RIG_TABLE } from '../../../content/sceneCatalog';
import type { Role } from '../../../content/roles';
import { mulberry32 } from '../../../core/rng';
import { B } from '../kits';
import * as K from '../kits2';
import { actor } from '../kits2d';
import { registerSceneBuilder } from '../sceneRegistry';
import type { ActorKind, Item, SceneActor, SceneDesc, SceneImage, SceneRig } from '../types';

/*
 * 立绘背景 backdrop（docs/workbench-redesign.md §9.1）：贴图四边形（SceneImage）铺满画面作背景，前面站立绘——
 * 视觉小说、标题、卡牌战斗、商店、线索墙、书桌。贴图写进场景的颜色 + 法线 / 角色两张输出，所以配方的后处理
 *（媒介滤镜、色板量化、像素化、描边、网点……）照样作用在插画上；插画也跟色板、时段、明暗色阶走一部分（sprites.ts 的 uRecolor，审查修复 1）。
 * 背景按画框比例铺满（cover，审查修复 2），立绘有内容框（fit：手机竖屏时镜头挪到立绘上，不丢主体）。
 * 素材：现有的 5 张 1920×1072 背景（主视觉、水彩风景、书桌、线索墙、柜台）与 4 张立绘（二次元全身、厚涂全身、半身、Q 版）。
 * 另有 backdrop-cards：正俯视的牌桌（Balatro 一类），牌面是程序画的贴图（点数、花色、小丑、牌背、盲注筹码）。
 */

/** 取景高度 */
const V = 10;
const BG_ASPECT = 1920 / 1072;

interface Figure { file: string; x: number; bottom: number; height: number; aspect: number; flip?: boolean; lit?: number; kind: ActorKind; label: string; role?: Role }
interface Spec {
  bg: string;
  figures?: Figure[];
  /** 站在背景前的东西（卡牌战斗的地面、敌人、接触阴影） */
  props?: (b: B, actors: SceneActor[], images: SceneImage[]) => void;
  /** 没有可操控角色时「玩家」的挂点（胸口） */
  player?: [number, number, number];
  /** 内容框（画框比内容窄时镜头挪到这里并放大取景，审查修复 2） */
  fit?: SceneRig['fit'];
}

const CHAR = { anime: 965 / 1400, painterly: 959 / 1400, bust: 942 / 1408, chibi: 797 / 1368 };

/* ---------------- 程序贴图（审查修复 10：卡牌战的地面与接触阴影、牌桌的牌面） ---------------- */

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** 接触阴影：压扁的椭圆，中心深、边缘按抖动淡出 */
function drawShadow(g: CanvasRenderingContext2D, w: number, h: number) {
  const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1, r = Math.hypot(dx, dy);
    const i = (y * w + x) * 4;
    im.data[i] = 24; im.data[i + 1] = 21; im.data[i + 2] = 16;
    im.data[i + 3] = Math.round(255 * 0.6 * (1 - smooth(0.3, 1, r)));
  }
  g.putImageData(im, 0, 0);
}

/**
 * 卡牌战的地面带：画面下方一整条土坡（主角和敌人都站在上面，不再站在湖里）——上沿起伏、按抖动渐隐，
 * 土色斑驳，上沿一排草、几块石头。颜色只是起点：贴图跟色板走（uRecolor），换色板地面也跟着换
 */
function drawGround(g: CanvasRenderingContext2D, w: number, h: number) {
  const rng = mulberry32(31);
  // 上沿：缓坡起伏（贴图上方 16% 处），画面里看得到的只有上沿往下约 15% 的一段，笔触都放在这一段里
  const edge = (x: number) => h * 0.16 + Math.sin(x * 0.006 + 0.7) * h * 0.018 + Math.sin(x * 0.023 + 1.3) * h * 0.007 + Math.sin(x * 0.09) * h * 0.002;
  const im = g.createImageData(w, h);
  const top = hex('#8F8463'), mid = hex('#62583F'), low = hex('#3A3326');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = edge(x), t = Math.max(0, (y - e) / (h * 0.16));
    const a = smooth(e - 3, e + h * 0.012, y);
    const c = t < 0.5 ? top.map((v, k) => v + (mid[k] - v) * (t / 0.5)) : mid.map((v, k) => v + (low[k] - v) * Math.min(1, (t - 0.5) / 0.8));
    const m = 0.92 + 0.08 * Math.sin(x * 0.031 + Math.sin(y * 0.07) * 2.2) * Math.sin(y * 0.11 + x * 0.004);
    const i = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, c[k] * m));
    im.data[i + 3] = Math.round(255 * a);
  }
  g.putImageData(im, 0, 0);
  // 横向的笔触：亮土、暗土、苔色，越往下越暗越稀
  const band = (u: number) => h * 0.16 + u * h * 0.15;
  for (let k = 0; k < 700; k++) {
    const x = rng() * w, u = Math.pow(rng(), 1.6), y = Math.max(edge(x) + 4, band(u)), len = 30 + rng() * 120, th = 2 + rng() * 5;
    g.fillStyle = ['rgba(176,160,118,0.55)', 'rgba(92,80,56,0.55)', 'rgba(118,122,72,0.5)', 'rgba(70,60,44,0.5)', 'rgba(150,136,98,0.45)'][Math.floor(rng() * 5)];
    g.beginPath(); g.ellipse(x, y, len / 2, th / 2, (rng() - 0.5) * 0.08, 0, Math.PI * 2); g.fill();
  }
  // 石头（看得到的那一段里）：上亮下暗，底下一道暗影
  for (let k = 0; k < 26; k++) {
    const x = rng() * w, y = edge(x) + h * (0.012 + rng() * 0.1), rx = 7 + rng() * 22, ry = rx * (0.45 + rng() * 0.2);
    g.fillStyle = 'rgba(40,34,24,0.6)'; g.beginPath(); g.ellipse(x + rx * 0.15, y + ry * 0.55, rx * 1.05, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5A5546'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#A29C86'; g.beginPath(); g.ellipse(x - rx * 0.18, y - ry * 0.32, rx * 0.62, ry * 0.42, 0, 0, Math.PI * 2); g.fill();
  }
  // 草：沿上沿一簇簇的短草（每簇 4–8 笔，矮、略弯）
  g.lineCap = 'round';
  for (let k = 0; k < 220; k++) {
    const cx = rng() * w, n = 4 + Math.floor(rng() * 5), col = ['#4C6630', '#5F7A36', '#728C44', '#3B5228'][Math.floor(rng() * 4)];
    for (let q = 0; q < n; q++) {
      const x = cx + (rng() - 0.5) * 14, e = edge(x) + 3 + rng() * 6, len = h * (0.008 + rng() * 0.016), lean = (rng() - 0.5) * len * 0.9;
      g.strokeStyle = col; g.lineWidth = 1.2 + rng() * 1.4;
      g.beginPath(); g.moveTo(x, e); g.quadraticCurveTo(x + lean * 0.2, e - len * 0.6, x + lean, e - len); g.stroke();
    }
  }
}

/** 圆角矩形路径 */
function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

type Suit = 'S' | 'H' | 'D' | 'C';
/** 花色（图形画，不用字体里的符号）：s = 高度 */
function suitShape(g: CanvasRenderingContext2D, suit: Suit, cx: number, cy: number, s: number) {
  g.beginPath();
  if (suit === 'H') {
    g.moveTo(cx, cy + s * 0.42);
    g.bezierCurveTo(cx - s * 0.62, cy - s * 0.02, cx - s * 0.36, cy - s * 0.6, cx, cy - s * 0.2);
    g.bezierCurveTo(cx + s * 0.36, cy - s * 0.6, cx + s * 0.62, cy - s * 0.02, cx, cy + s * 0.42);
  } else if (suit === 'D') {
    g.moveTo(cx, cy - s * 0.5); g.lineTo(cx + s * 0.36, cy); g.lineTo(cx, cy + s * 0.5); g.lineTo(cx - s * 0.36, cy); g.closePath();
  } else if (suit === 'S') {
    g.moveTo(cx, cy - s * 0.48);
    g.bezierCurveTo(cx - s * 0.62, cy - s * 0.02, cx - s * 0.4, cy + s * 0.46, cx - s * 0.02, cy + s * 0.18);
    g.lineTo(cx - s * 0.16, cy + s * 0.5); g.lineTo(cx + s * 0.16, cy + s * 0.5); g.lineTo(cx + s * 0.02, cy + s * 0.18);
    g.bezierCurveTo(cx + s * 0.4, cy + s * 0.46, cx + s * 0.62, cy - s * 0.02, cx, cy - s * 0.48);
  } else {
    const r = s * 0.2;
    g.moveTo(cx + r, cy - s * 0.24); g.arc(cx, cy - s * 0.24, r, 0, Math.PI * 2);
    g.moveTo(cx - s * 0.2 + r, cy + s * 0.06); g.arc(cx - s * 0.2, cy + s * 0.06, r, 0, Math.PI * 2);
    g.moveTo(cx + s * 0.2 + r, cy + s * 0.06); g.arc(cx + s * 0.2, cy + s * 0.06, r, 0, Math.PI * 2);
    g.moveTo(cx - s * 0.05, cy); g.lineTo(cx - s * 0.16, cy + s * 0.5); g.lineTo(cx + s * 0.16, cy + s * 0.5); g.lineTo(cx + s * 0.05, cy);
  }
  g.fill();
}

const RED = '#C8283A', BLACK = '#22232E', CARD = '#F5F0E4';
const SERIF = 'Georgia, "Times New Roman", serif';

/** 牌的底：投影 + 白底 + 细边（贴图四周留出投影的位置） */
function cardBase(g: CanvasRenderingContext2D, w: number, h: number, fill: string, edge = '#2B2B33') {
  const m = w * 0.06;
  // 硬投影（Balatro 的牌也是硬边投影）：实色、不抖动，像素化的配方里也是干净的一块
  g.fillStyle = 'rgba(12,22,18,0.8)'; rrect(g, m + w * 0.03, m + w * 0.04, w - m * 2, h - m * 2, w * 0.07); g.fill();
  g.fillStyle = fill; rrect(g, m, m, w - m * 2, h - m * 2, w * 0.07); g.fill();
  g.strokeStyle = edge; g.lineWidth = w * 0.012; g.stroke();
  return m;
}

/** 牌面：左上 / 右下角点数 + 小花色，中间大花色（J / Q / K 是带框的大字母） */
function drawFace(rank: string, suit: Suit) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const m = cardBase(g, w, h, CARD);
    const col = suit === 'H' || suit === 'D' ? RED : BLACK;
    g.fillStyle = col;
    const corner = (flip: boolean) => {
      g.save();
      if (flip) { g.translate(w, h); g.rotate(Math.PI); }
      g.font = `bold ${Math.round(w * 0.2)}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(rank, m + w * 0.13, m + w * 0.23);
      suitShape(g, suit, m + w * 0.13, m + w * 0.34, w * 0.12);
      g.restore();
    };
    corner(false); corner(true);
    if (rank === 'J' || rank === 'Q' || rank === 'K') {
      g.strokeStyle = col; g.lineWidth = w * 0.012;
      rrect(g, w * 0.26, h * 0.2, w * 0.48, h * 0.6, w * 0.04); g.stroke();
      g.font = `bold ${Math.round(w * 0.34)}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(rank, w / 2, h * 0.43);
      suitShape(g, suit, w / 2, h * 0.64, w * 0.2);
    } else suitShape(g, suit, w / 2, h / 2, w * 0.42);
  };
}

/** 牌背：红底 + 白边 + 菱格 */
function drawBack(g: CanvasRenderingContext2D, w: number, h: number) {
  const m = cardBase(g, w, h, '#F2EADB');
  g.save(); rrect(g, m + w * 0.05, m + w * 0.05, w - (m + w * 0.05) * 2, h - (m + w * 0.05) * 2, w * 0.04); g.clip();
  g.fillStyle = '#B33A3A'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,230,200,0.55)'; g.lineWidth = w * 0.015;
  for (let k = -h; k < w + h; k += w * 0.12) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
  g.restore();
}

/** 小丑牌：渐变底 + 金边 + 小丑头像（三角帽、铃铛、笑脸） */
function drawJoker(hue: [string, string]) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const m = cardBase(g, w, h, hue[0], '#C9A13B');
    const gr = g.createLinearGradient(0, m, 0, h - m);
    gr.addColorStop(0, hue[0]); gr.addColorStop(1, hue[1]);
    g.fillStyle = gr; rrect(g, m + w * 0.04, m + w * 0.04, w - (m + w * 0.04) * 2, h - (m + w * 0.04) * 2, w * 0.05); g.fill();
    g.strokeStyle = '#E8C454'; g.lineWidth = w * 0.02; g.stroke();
    const cx = w / 2, cy = h * 0.56, r = w * 0.2;
    // 帽子三个角
    const tips: [number, number, string][] = [[cx - r * 1.5, cy - r * 1.9, '#D83A3A'], [cx, cy - r * 2.3, '#F2C230'], [cx + r * 1.5, cy - r * 1.9, '#5A3FC0']];
    for (const [tx, ty, c] of tips) {
      g.fillStyle = c; g.beginPath(); g.moveTo(cx - r * 0.9, cy - r * 0.55); g.quadraticCurveTo((cx + tx) / 2, cy - r * 1.6, tx, ty); g.quadraticCurveTo((cx + tx) / 2 + r * 0.3, cy - r * 1.0, cx + r * 0.9, cy - r * 0.55); g.closePath(); g.fill();
      g.fillStyle = '#F7E27A'; g.beginPath(); g.arc(tx, ty, r * 0.2, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#F3D9B8'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1E1B2E';
    g.beginPath(); g.arc(cx - r * 0.38, cy - r * 0.15, r * 0.12, 0, Math.PI * 2); g.arc(cx + r * 0.38, cy - r * 0.15, r * 0.12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1E1B2E'; g.lineWidth = w * 0.02; g.beginPath(); g.arc(cx, cy + r * 0.1, r * 0.5, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#E04848'; g.beginPath(); g.arc(cx, cy + r * 0.05, r * 0.12, 0, Math.PI * 2); g.fill();
    // 领口的尖角
    g.fillStyle = '#F2EADB';
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * r * 0.45 - r * 0.22, cy + r * 0.95); g.lineTo(cx + k * r * 0.45, cy + r * 1.45); g.lineTo(cx + k * r * 0.45 + r * 0.22, cy + r * 0.95); g.fill(); }
  };
}

/** 盲注筹码：红盘 + 白色缺口环 + 中心圆 */
function drawBlind(g: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2, r = w * 0.44;
  g.fillStyle = 'rgba(12,22,18,0.8)'; g.beginPath(); g.arc(cx + w * 0.025, cy + w * 0.035, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#B8323C'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#F4EEE2'; g.lineWidth = r * 0.16;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.arc(cx, cy, r * 0.82, a + 0.12, a + Math.PI / 4 - 0.12); g.stroke(); }
  g.fillStyle = '#7E1E28'; g.beginPath(); g.arc(cx, cy, r * 0.56, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#F4EEE2'; g.beginPath(); g.arc(cx, cy, r * 0.22, 0, Math.PI * 2); g.fill();
}

/* ---------------- 卡牌战的敌人立绘（整合修复 U#16：原来是图元搭的史莱姆和岩石巨人，站在彩绘背景前像白模；改成程序画的手绘立绘，和主角立绘同一种贴图） ---------------- */

/** 手绘质感：在当前裁剪区里撒一层短笔触（几种颜色、低不透明度），角度大致顺着 ang */
function daubs(g: CanvasRenderingContext2D, rng: () => number, box: [number, number, number, number], n: number, cols: string[], len: [number, number], th: [number, number], ang = 0) {
  const [x0, y0, w, h] = box;
  for (let k = 0; k < n; k++) {
    const x = x0 + rng() * w, y = y0 + rng() * h, l = len[0] + rng() * (len[1] - len[0]), t = th[0] + rng() * (th[1] - th[0]);
    g.fillStyle = cols[Math.floor(rng() * cols.length)];
    g.beginPath(); g.ellipse(x, y, l / 2, t / 2, ang + (rng() - 0.5) * 0.7, 0, Math.PI * 2); g.fill();
  }
}

/** 史莱姆立绘：半透明的水滴身子（左上受光、右侧轮廓光、底部透光）、头顶一个卷尖、怒眉大眼和张开的小嘴，深色描边 */
function drawSlime(g: CanvasRenderingContext2D, w: number, h: number) {
  const rng = mulberry32(57);
  const cx = w * 0.5, base = h * 0.93, top = h * 0.24, hw = w * 0.42;
  const body = () => {
    g.beginPath();
    g.moveTo(cx - hw, base);
    g.bezierCurveTo(cx - hw * 1.08, base - h * 0.3, cx - hw * 0.72, top + h * 0.1, cx - hw * 0.2, top + h * 0.05);
    // 头顶的卷尖
    g.bezierCurveTo(cx - hw * 0.06, top - h * 0.01, cx - hw * 0.02, top - h * 0.15, cx + hw * 0.17, top - h * 0.16);
    g.bezierCurveTo(cx + hw * 0.07, top - h * 0.06, cx + hw * 0.1, top + h * 0.04, cx + hw * 0.3, top + h * 0.08);
    g.bezierCurveTo(cx + hw * 0.8, top + h * 0.16, cx + hw * 1.1, base - h * 0.32, cx + hw, base);
    g.bezierCurveTo(cx + hw * 0.55, base + h * 0.045, cx - hw * 0.55, base + h * 0.045, cx - hw, base);
    g.closePath();
  };
  const box: [number, number, number, number] = [cx - hw * 1.1, top - h * 0.18, hw * 2.2, base - top + h * 0.25];
  const gr = g.createRadialGradient(cx - hw * 0.38, top + h * 0.22, h * 0.04, cx - hw * 0.1, top + h * 0.35, hw * 1.45);
  gr.addColorStop(0, '#A8EEE4'); gr.addColorStop(0.4, '#49B3BD'); gr.addColorStop(1, '#1A4A6B');
  body(); g.fillStyle = gr; g.fill();
  g.save(); body(); g.clip();
  // 底部透光（水滴里透出来的亮）、底边一道暗
  const sss = g.createRadialGradient(cx + hw * 0.1, base - h * 0.06, 0, cx + hw * 0.1, base - h * 0.06, hw * 0.75);
  sss.addColorStop(0, 'rgba(150,240,225,0.5)'); sss.addColorStop(1, 'rgba(150,240,225,0)');
  g.fillStyle = sss; g.fillRect(box[0], box[1], box[2], box[3]);
  const sh = g.createLinearGradient(0, base - h * 0.1, 0, base + h * 0.04);
  sh.addColorStop(0, 'rgba(10,30,55,0)'); sh.addColorStop(1, 'rgba(10,30,55,0.45)');
  g.fillStyle = sh; g.fillRect(box[0], box[1], box[2], box[3]);
  daubs(g, rng, box, 140, ['rgba(200,255,245,0.16)', 'rgba(18,64,96,0.16)', 'rgba(90,190,200,0.2)'], [18, 60], [5, 12], -0.35);
  // 右侧轮廓光：把轮廓往左挪一点再描，留在身子里的是贴着右边的一条亮边
  g.translate(-w * 0.025, h * 0.01); body(); g.lineWidth = w * 0.05; g.strokeStyle = 'rgba(190,250,255,0.32)'; g.stroke();
  g.restore();
  // 高光：一大片柔光 + 一个硬亮点
  g.fillStyle = 'rgba(255,255,255,0.42)'; g.beginPath(); g.ellipse(cx - hw * 0.42, top + h * 0.26, hw * 0.2, h * 0.075, -0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.ellipse(cx - hw * 0.5, top + h * 0.22, hw * 0.06, h * 0.025, -0.6, 0, Math.PI * 2); g.fill();
  body(); g.lineWidth = w * 0.016; g.strokeStyle = '#0F2A40'; g.lineJoin = 'round'; g.stroke();
  // 眼睛：白底、深瞳（看向左边的主角）、亮点；怒眉
  const ey = h * 0.56, er = [w * 0.068, h * 0.088] as const;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * hw * 0.3;
    g.fillStyle = '#F4FBFA'; g.beginPath(); g.ellipse(ex, ey, er[0], er[1], 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = w * 0.009; g.strokeStyle = '#0F2A40'; g.stroke();
    g.fillStyle = '#0B1A26'; g.beginPath(); g.ellipse(ex - er[0] * 0.3, ey + er[1] * 0.14, er[0] * 0.56, er[1] * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex - er[0] * 0.45, ey - er[1] * 0.12, er[0] * 0.18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#0F2A40'; g.lineWidth = w * 0.022; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex + sx * er[0] * 1.05, ey - er[1] * 1.5); g.lineTo(ex - sx * er[0] * 0.85, ey - er[1] * 1.0); g.stroke();
  }
  // 嘴：张开的小嘴 + 舌头
  const mx = cx - hw * 0.05, my = h * 0.75;
  g.fillStyle = '#0B1A26'; g.beginPath(); g.ellipse(mx, my, w * 0.055, h * 0.04, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#E2687A'; g.beginPath(); g.ellipse(mx + w * 0.008, my + h * 0.018, w * 0.03, h * 0.016, 0, 0, Math.PI * 2); g.fill();
}

/** 一块岩石（不规则多边形）：左上受光的渐变、左上一块亮面、几道裂缝、手绘笔触、深色描边 */
function rockChunk(g: CanvasRenderingContext2D, rng: () => number, cx: number, cy: number, rx: number, ry: number, tone = 0) {
  const n = 9, pts: [number, number][] = [];
  const a0 = rng() * Math.PI * 2;
  for (let k = 0; k < n; k++) { const a = a0 + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.35, r = 0.84 + rng() * 0.2; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const lift = (hex: string) => { const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); const f = 1 + tone; return `rgb(${Math.min(255, r * f) | 0},${Math.min(255, gg * f) | 0},${Math.min(255, b * f) | 0})`; };
  const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.7, cy + ry);
  gr.addColorStop(0, lift('#B5AC98')); gr.addColorStop(0.5, lift('#7E7566')); gr.addColorStop(1, lift('#433D35'));
  path(); g.fillStyle = gr; g.fill();
  g.save(); path(); g.clip();
  // 左上的亮面：中心偏左上的点连到左上方那几个顶点
  const up = pts.filter(([x, y]) => x - cx < rx * 0.25 && y - cy < ry * 0.1).sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  if (up.length >= 2) {
    g.fillStyle = 'rgba(255,246,222,0.2)';
    g.beginPath(); g.moveTo(cx - rx * 0.12, cy - ry * 0.08); for (const [x, y] of up) g.lineTo(x, y); g.closePath(); g.fill();
  }
  daubs(g, rng, [cx - rx, cy - ry, rx * 2, ry * 2], Math.round((rx * ry) / 260), ['rgba(230,220,200,0.14)', 'rgba(40,34,28,0.18)', 'rgba(120,112,96,0.2)'], [rx * 0.15, rx * 0.5], [3, 8], 0.4);
  g.strokeStyle = 'rgba(30,26,22,0.6)'; g.lineWidth = Math.max(2, rx * 0.025); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const [sx, sy] = pts[Math.floor(rng() * n)], t = 0.35 + rng() * 0.3;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (cx - sx) * t + (rng() - 0.5) * rx * 0.3, sy + (cy - sy) * t + (rng() - 0.5) * ry * 0.3); g.stroke();
  }
  g.restore();
  path(); g.lineWidth = Math.max(3, rx * 0.045); g.strokeStyle = '#211D19'; g.lineJoin = 'round'; g.stroke();
}

/** 苔藓：一簇深浅两色的小团 */
function moss(g: CanvasRenderingContext2D, rng: () => number, cx: number, cy: number, r: number) {
  for (let k = 0; k < 14; k++) {
    const x = cx + (rng() - 0.5) * r * 2, y = cy + (rng() - 0.5) * r * 0.7, s = r * (0.2 + rng() * 0.3);
    g.fillStyle = rng() < 0.5 ? '#5E8233' : '#7FA243'; g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(30,48,18,0.35)'; g.beginPath(); g.ellipse(x + s * 0.2, y + s * 0.3, s * 0.6, s * 0.3, 0, 0, Math.PI * 2); g.fill();
  }
}

/** 发光：外圈柔光 + 亮芯 */
function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, core: [number, number]) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, 'rgba(255,190,80,0.75)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFF1B8'; g.beginPath(); g.ellipse(x, y, core[0], core[1], 0, 0, Math.PI * 2); g.fill();
}

/** 岩石巨人立绘（Boss）：一块块岩石拼成的大块头——粗腿、巨拳、宽肩、陷在肩里的头，发光的眼缝与胸口裂纹，肩上长苔藓 */
function drawGolem(g: CanvasRenderingContext2D, w: number, h: number) {
  const rng = mulberry32(83);
  const cx = w * 0.5, k = w / 640;
  const R = (x: number, y: number, rx: number, ry: number, tone = 0) => rockChunk(g, rng, cx + x * k, y * k, rx * k, ry * k, tone);
  // 腿
  R(-108, 652, 74, 96, -0.08); R(108, 652, 76, 96, -0.1);
  // 上臂（在身子后面）
  R(-236, 430, 70, 134, -0.05); R(236, 424, 72, 136, -0.12);
  // 身子
  R(0, 420, 212, 196, 0.02);
  // 胸口的裂纹（发光）
  const crack: [number, number][] = [[-46, 330], [-18, 372], [-40, 410], [6, 452], [-10, 490], [30, 530]];
  const line = () => { g.beginPath(); crack.forEach(([x, y], i) => (i ? g.lineTo(cx + x * k, y * k) : g.moveTo(cx + x * k, y * k))); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  line(); g.strokeStyle = 'rgba(255,150,40,0.35)'; g.lineWidth = 26 * k; g.stroke();
  line(); g.strokeStyle = '#FFB547'; g.lineWidth = 9 * k; g.stroke();
  line(); g.strokeStyle = '#FFF0B0'; g.lineWidth = 3.5 * k; g.stroke();
  // 拳头（盖在腿前面）
  R(-228, 582, 86, 78, 0.04); R(228, 576, 88, 80, -0.04);
  // 肩
  R(-190, 268, 100, 82, 0.1); R(188, 262, 104, 84, 0.06);
  // 头
  R(0, 196, 98, 84, 0.08);
  // 眼缝与嘴缝
  for (const sx of [-1, 1]) glow(g, cx + sx * 34 * k, 190 * k, 34 * k, [16 * k, 6 * k]);
  g.strokeStyle = '#211D19'; g.lineWidth = 6 * k;
  g.beginPath(); g.moveTo(cx - 34 * k, 236 * k); g.lineTo(cx - 10 * k, 230 * k); g.lineTo(cx + 12 * k, 238 * k); g.lineTo(cx + 34 * k, 232 * k); g.stroke();
  // 苔藓：两肩、头顶
  moss(g, rng, cx - 196 * k, 214 * k, 58 * k); moss(g, rng, cx + 182 * k, 206 * k, 64 * k); moss(g, rng, cx - 10 * k, 124 * k, 40 * k);
}

const tex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): SceneImage['canvas'] => ({ key, w, h, draw });

/* ---------------- 立绘背景 ---------------- */

const SPECS: Record<string, Spec> = {
  // 视觉小说 · 来信：水彩风景 + 右侧二次元立绘（膝盖以下出画）；竖屏时镜头挪到立绘上
  backdrop: { bg: 'ui_scene_watercolor.jpg', figures: [{ file: 'ui_char_anime.png', x: 4.3, bottom: -8.6, height: 13.2, aspect: CHAR.anime, kind: 'npc', label: '来信人', role: 'character' }], fit: { w: 6.5, cx: 4.3 } },
  // 标题：主视觉海报
  'backdrop-title': { bg: 'ui_keyart.jpg' },
  // 卡牌战斗：画面下方一条土坡（地面带），左边主角（厚涂立绘）、右边史莱姆与岩石巨人都站在上面，脚下有接触阴影（审查修复 10）
  'backdrop-battle': {
    bg: 'ui_scene_watercolor.jpg',
    figures: [{ file: 'ui_char_painterly.png', x: -4.6, bottom: -3.55, height: 5.4, aspect: CHAR.painterly, kind: 'ally', label: '主角', role: 'character' }],
    player: [-4.6, -1.15, 0],
    fit: { w: 14, cx: 0.6 },
    props: (_b, actors, images) => {
      // 地面带：贴图高 16（竖屏放大取景时下面也盖得住），土坡的上沿在贴图上方 16% 处，落在 y ≈ -2.55
      const GH = 16, GTOP = -2.55;
      images.push({ file: '', canvas: tex('battle-ground-2', 2048, 768, drawGround), pos: [0, GTOP + GH * 0.16 - GH, -2], size: [44, GH], anchor: 'bottom', lit: 0, role: 'paper', cut: 0.02, dither: true });
      // 接触阴影都放在地面带和立绘之间（z = −1.6），只露出脚下的一圈
      const shadow = (x: number, y: number, w: number) => images.push({ file: '', canvas: tex('contact-shadow-2', 256, 64, drawShadow), pos: [x, y - w * 0.1, -1.6], size: [w, w * 0.25], anchor: 'bottom', lit: 0, role: 'paper', cut: 0.04, dither: true, recolor: 0.3 });
      // 敌人：手绘立绘贴图（整合修复 U#16），和主角立绘一样跟色板 / 时段 / 后处理走，不再吃形体 / 材质
      const enemy = (key: string, cw: number, ch: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, x: number, height: number) =>
        images.push({ file: '', canvas: tex(key, cw, ch, draw), pos: [x, -3.62, -0.6], size: [(height * cw) / ch, height], anchor: 'bottom', lit: 0, role: 'character', cut: 0.5 });
      shadow(-4.5, -3.55, 3.6);
      enemy('enemy-slime-1', 512, 420, drawSlime, 2.2, 1.95);
      shadow(2.2, -3.55, 2.4);
      actors.push(actor('enemy', '史莱姆', [2.2, -3.55, -0.6], 1.6));
      enemy('enemy-golem-1', 640, 760, drawGolem, 5.9, 3.5);
      shadow(5.9, -3.55, 3.4);
      actors.push(actor('boss', '岩石巨人', [5.9, -3.55, -0.6], 3.2));
    },
  },
  // 商店：柜台与货架 + 左侧 Q 版店主
  'backdrop-shop': { bg: 'ui_counter.jpg', figures: [{ file: 'ui_char_bust_chibi_chibi.png', x: -6.4, bottom: -4.6, height: 5.2, aspect: CHAR.chibi, kind: 'npc', label: '店主', role: 'character' }], fit: { w: 5, cx: -5.6 } },
  // 线索墙：软木墙 + 左侧半身侦探
  'backdrop-clue': { bg: 'ui_clue_wall.jpg', figures: [{ file: 'ui_char_bust_chibi_bust.png', x: -6.3, bottom: -5.4, height: 8.2, aspect: CHAR.bust, kind: 'npc', label: '侦探', role: 'character' }], fit: { w: 5.6, cx: -6.3 } },
  // 书桌：俯视的旧书桌，中间留空放界面
  'backdrop-desk': { bg: 'ui_desk.jpg' },
};

function backdrop(id: string) {
  const spec = SPECS[id];
  return (): SceneDesc => {
    const items: Item[] = [];
    const actors: SceneActor[] = [];
    const h = V, w = h * BG_ASPECT;
    // 背景：铺满画面（cover：19.5:9、竖屏、4:3 都不露天色）
    const images: SceneImage[] = [{ file: spec.bg, pos: [0, 0, -6], size: [w, h], anchor: 'center', lit: 0, role: 'paper', cut: 0.01, cover: true }];
    spec.props?.(new B(items, 50), actors, images);
    for (const f of spec.figures ?? []) {
      // 抠图立绘：去品红边（审查修复 6）
      images.push({ file: f.file, pos: [f.x, f.bottom, -1], size: [f.height * f.aspect, f.height], anchor: 'bottom', lit: f.lit ?? 0, role: f.role ?? 'character', cut: 0.5, flipX: f.flip, despill: true });
      // 挂点：立绘的上胸口（头顶血条 / 名牌放在头上方会出画，放胸口附近）
      actors.push(actor(f.kind, f.label, [f.x, f.bottom, -1], Math.min(f.height * 0.82, V / 2 - f.bottom - 0.6)));
    }
    return {
      items, images, actors,
      dynamic: [],
      lights: [],
      ground: { heightAt: () => 0, inside: () => false },
      bounds: { center: [0, 0, -3], radius: 10 },
      viewSize: V,
      playerAnchor: spec.player,
      // 背景在注视点后 6 个单位：雾的跨度放得很大，背景插画不被雾吃掉
      camera: { ...RIG_FLAT, viewSize: V, target: [0, 0, 0], fogSpan: 400, fit: spec.fit },
    };
  };
}

for (const id of Object.keys(SPECS)) registerSceneBuilder(id, backdrop(id));

/* ---------------- 平面·牌桌 ---------------- */

/** 牌（平躺在桌上的贴图）：牌面尺寸 1.29 × 1.8，rz = 在桌面内的转角 */
const CARD_W = 1.29, CARD_H = 1.8;
function card(images: SceneImage[], c: SceneImage['canvas'], x: number, y: number, z: number, rz = 0, s = 1) {
  images.push({ file: '', canvas: c, pos: [x, y, z], size: [CARD_W * s * 1.14, CARD_H * s * 1.1], anchor: 'center', rot: [-Math.PI / 2, 0, rz], lit: 0, role: 'paper', cut: 0.5, recolor: 0.4 });
}

/** 平面·牌桌：正俯视的毡面牌桌（Balatro 一类）——下方手牌区（牌由 UI 画）、中间出牌区、上方小丑牌位、右下牌堆、左下弃牌堆、左上盲注筹码；桌子外面是暗色地板（任何比例都不露天色） */
registerSceneBuilder('backdrop-cards', (ctx) => {
  const rng = ctx.rng;
  const items: Item[] = [];
  const images: SceneImage[] = [];
  const b = new B(items, 3);
  const W = 22, D = 13;
  b.withId(1).box(0, -1.6, 0, 160, 0.2, 160, 'ink', { args: [0], noOutline: true, flat: true });
  b.withId(2).box(0, -0.6, 0, W + 2, 0.5, D + 2, 'wood', { args: [0.1] });
  // 毡面用深一点的针叶绿（牌桌的绿，不是草地的嫩绿）
  b.withId(3).box(0, -0.1, 0, W, 0.1, D, 'foliage2', { args: [0.02], noOutline: true, flat: true });
  // 出牌区、小丑牌位的框（细边）
  const frame = (x: number, z: number, w: number, d: number, role: Role) => {
    for (const [fx, fz, fw, fd] of [[x, z - d / 2, w, 0.06], [x, z + d / 2, w, 0.06], [x - w / 2, z, 0.06, d], [x + w / 2, z, 0.06, d]] as [number, number, number, number][]) b.withId(4).box(fx, 0, fz, fw, 0.02, fd, role, { args: [0], noOutline: true, flat: true });
  };
  frame(0, -0.6, 10.4, 3.2, 'trim');
  frame(-1.2, -4.3, 7.4, 2.9, 'trim');
  // 手牌区：只画一圈框，不摆牌（整合修复 U#12：手牌由 UI 画——场景默认 UI 的技能卡、Balatro 复刻的手牌；原来桌上还有一副 3D 扇形手牌，和 UI 的手牌叠成两副）
  frame(0, 4.75, 11.6, 2.9, 'trim');
  // 弃牌堆（左下，和右下的牌堆对称）：三张翻开的牌随手叠着
  const discard: [string, Suit, number, number, number][] = [['9', 'H', -8.55, 3.55, 0.32], ['3', 'C', -8.3, 3.75, -0.18], ['Q', 'S', -8.45, 3.6, 0.06]];
  discard.forEach(([r, s, x, z, rz], k) => card(images, tex(`card2-${r}${s}`, 256, 352, drawFace(r, s)), x, 0.05 + k * 0.04, z, rz));
  // 出牌区（4 张）
  const played: [string, Suit][] = [['K', 'S'], ['K', 'D'], ['8', 'C'], ['8', 'H']];
  played.forEach(([r, s], k) => card(images, tex(`card2-${r}${s}`, 256, 352, drawFace(r, s)), -2.9 + k * 1.95, 0.05, -0.6, (rng() - 0.5) * 0.08));
  // 小丑牌位（3 张）
  const jokers: [string, string][] = [['#5B3FA8', '#2C8A8A'], ['#B8483A', '#E0A030'], ['#2F6FB0', '#7A3FA8']];
  jokers.forEach((hue, k) => card(images, tex(`joker2-${k}`, 256, 352, drawJoker(hue)), -3.6 + k * 1.75, 0.05, -4.3));
  // 牌堆（右下）：几张牌背错开叠成一摞
  for (let k = 0; k < 6; k++) card(images, tex('card2-back', 256, 352, drawBack), 8.4 + k * 0.025, 0.05 + k * 0.04, 3.7 - k * 0.025);
  b.withId(5).box(8.47, 0, 3.63, CARD_W * 0.95, 0.22, CARD_H * 0.95, 'paper', { args: [0.05] });
  // 盲注筹码（左上）
  images.push({ file: '', canvas: tex('blind2-chip', 256, 256, drawBlind), pos: [-8.4, 0.06, -4.2], size: [2.5, 2.5], anchor: 'center', rot: [-Math.PI / 2, 0, 0], lit: 0, role: 'paper', cut: 0.5, recolor: 0.4 });
  // 筹码
  for (let k = 0; k < 4; k++) K.coinStack(b.withId(80 + k).at(-8.8 + (k % 2) * 0.8, 0, 1.0 + Math.floor(k / 2) * 0.8), 3 + Math.floor(rng() * 6));
  const actors: SceneActor[] = [actor('boss', '盲注', [-8.4, 0, -4.2], 0.3), actor('objective', '出牌区', [0, 0, -0.6], 0.3)];
  const V2 = 13;
  return {
    items, actors, images,
    dynamic: [],
    lights: [{ pos: [0, 5, 0], color: '#FFE2B0', range: 18, intensity: 0.8 }],
    ground: { heightAt: () => 0, inside: () => false },
    bounds: { center: [0, 0, 0], radius: 12 },
    viewSize: V2,
    playerAnchor: [0, 0.3, 3.6],
    camera: { ...RIG_TABLE, viewSize: V2, target: [0, 0, 0], fit: { w: 13 } },
  };
});
