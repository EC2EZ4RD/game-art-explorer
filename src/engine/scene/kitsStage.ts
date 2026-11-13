import type { Rng } from '../../core/rng';
import { B } from './kits';

/*
 * 舞台·剧场的套件（技术补全 2026-10-23，H 轨道）：
 *   画景（程序贴图：天幕渐变、云、远山、湖、山丘上的城堡，一层随机短笔触模仿刷子画的布景）；
 *   侧幕景片（程序贴图：手绘的树，按剪影抠出来，左右对称成对立在侧台）；
 *   台口（金色线脚、拱、徽饰）、大幕（收在两边、金绳绑住的红丝绒褶）、檐幕（垂花）、台唇的脚灯、观众席的椅背。
 * 只画图形，不写字。
 */

type G = CanvasRenderingContext2D;

/** 简单可复现的随机数（画布绘制里用，结果固定） */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 刷子笔触：一层短的、半透明的斜笔，模仿手绘布景的质感 */
function brushOver(g: G, w: number, h: number, seed: number, n: number, alpha = 0.06) {
  const r = prng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, L = 8 + r() * 26, a = -0.5 + r() * 0.4;
    g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    g.lineWidth = 2 + r() * 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
}

/** 画景：黄昏的天、云、两层远山、湖、山丘上的城堡、前面的草坡 */
export function drawBackdrop(g: G, w: number, h: number) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#24315E'); sky.addColorStop(0.55, '#7E6A9E'); sky.addColorStop(1, '#F2B27A');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const r = prng(11);
  // 月亮 + 光晕
  const mg = g.createRadialGradient(w * 0.72, h * 0.2, 0, w * 0.72, h * 0.2, h * 0.16);
  mg.addColorStop(0, 'rgba(255,248,220,1)'); mg.addColorStop(0.35, 'rgba(255,240,200,0.9)'); mg.addColorStop(0.4, 'rgba(255,230,190,0.25)'); mg.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = mg; g.beginPath(); g.arc(w * 0.72, h * 0.2, h * 0.16, 0, Math.PI * 2); g.fill();
  // 云：一团团的椭圆
  for (let i = 0; i < 9; i++) {
    const cx = r() * w, cy = h * (0.08 + r() * 0.3), cw = w * (0.08 + r() * 0.1);
    for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(${240 + r() * 15},${200 + r() * 40},${210 + r() * 30},${0.18 + r() * 0.12})`; g.beginPath(); g.ellipse(cx + (r() - 0.5) * cw, cy + (r() - 0.5) * h * 0.03, cw * (0.3 + r() * 0.4), h * (0.02 + r() * 0.03), 0, 0, Math.PI * 2); g.fill(); }
  }
  // 远山两层
  const ridge = (y0: number, amp: number, col: string, seed: number) => {
    const rr = prng(seed);
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 24) g.lineTo(x, y0 - amp * (0.4 + 0.6 * Math.abs(Math.sin(x / w * 7 + rr() * 2))) - rr() * amp * 0.3);
    g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
  };
  ridge(h * 0.58, h * 0.16, '#6E6F9C', 3);
  ridge(h * 0.62, h * 0.1, '#4E5A7E', 5);
  // 湖面 + 倒影的横纹
  g.fillStyle = '#3B4F78'; g.fillRect(0, h * 0.62, w, h * 0.1);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,${200 + r() * 40},${160 + r() * 40},${0.12 + r() * 0.2})`; g.fillRect(w * 0.6 + (r() - 0.5) * w * 0.2, h * (0.63 + r() * 0.08), 10 + r() * 50, 2); }
  // 左边山丘 + 城堡
  g.fillStyle = '#35553F';
  g.beginPath(); g.moveTo(0, h * 0.72); g.quadraticCurveTo(w * 0.18, h * 0.38, w * 0.4, h * 0.7); g.lineTo(0, h * 0.75); g.closePath(); g.fill();
  const cx = w * 0.19, base = h * 0.47;
  g.fillStyle = '#2A2E46';
  const tower = (x: number, tw: number, th: number) => { g.fillRect(x - tw / 2, base - th, tw, th); g.beginPath(); g.moveTo(x - tw * 0.65, base - th); g.lineTo(x, base - th - tw * 1.3); g.lineTo(x + tw * 0.65, base - th); g.closePath(); g.fill(); };
  g.fillRect(cx - w * 0.06, base - h * 0.07, w * 0.12, h * 0.07);
  tower(cx - w * 0.06, w * 0.025, h * 0.12); tower(cx + w * 0.06, w * 0.025, h * 0.11); tower(cx, w * 0.035, h * 0.18);
  g.fillStyle = '#FFD27A';
  for (let i = 0; i < 9; i++) g.fillRect(cx - w * 0.055 + r() * w * 0.11, base - h * (0.02 + r() * 0.12), 4, 7);
  // 前面的草坡（两边高、中间低，舞台中央留出地平线）
  g.fillStyle = '#2E4A33';
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.78); g.quadraticCurveTo(w * 0.3, h * 0.7, w * 0.5, h * 0.8); g.quadraticCurveTo(w * 0.75, h * 0.7, w, h * 0.74); g.lineTo(w, h); g.closePath(); g.fill();
  brushOver(g, w, h, 21, 2600, 0.05);
  // 布景布的接缝（两道竖线）与边上的暗角
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w / 3, 0, 2, h); g.fillRect((2 * w) / 3, 0, 2, h);
  const vg = g.createRadialGradient(w / 2, h * 0.5, h * 0.3, w / 2, h * 0.5, w * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

/** 侧幕景片：一棵手绘的树（树干 + 一团团树冠，亮面 / 暗面两色），按剪影抠出来（外面透明） */
export function drawWingTree(seed: number) {
  return (g: G, w: number, h: number) => {
    const r = prng(seed);
    g.clearRect(0, 0, w, h);
    // 树干（从底边偏右长上去，往舞台中央歪）
    g.fillStyle = '#4A3424';
    g.beginPath(); g.moveTo(w * 0.55, h); g.quadraticCurveTo(w * 0.5, h * 0.55, w * 0.72, h * 0.32); g.lineTo(w * 0.82, h * 0.34); g.quadraticCurveTo(w * 0.66, h * 0.6, w * 0.8, h); g.closePath(); g.fill();
    g.fillStyle = '#6B4C34';
    g.beginPath(); g.moveTo(w * 0.6, h); g.quadraticCurveTo(w * 0.56, h * 0.6, w * 0.74, h * 0.36); g.lineTo(w * 0.77, h * 0.37); g.quadraticCurveTo(w * 0.62, h * 0.62, w * 0.68, h); g.closePath(); g.fill();
    // 树冠：暗色一层、亮色一层
    for (const [col, k] of [['#1F3A2A', 1], ['#3E6B3F', 0.75], ['#7FA35A', 0.4]] as [string, number][]) {
      g.fillStyle = col;
      for (let i = 0; i < 14; i++) {
        const x = w * (0.15 + r() * 0.85), y = h * (0.04 + r() * 0.4), rr = w * (0.12 + r() * 0.16) * k;
        g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
      }
    }
    brushOver(g, w, h, seed + 7, 500, 0.08);
    // 外沿压一道暗线（景片的锯切边）
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(20,14,10,0.4)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  };
}

/** 收在台口一侧的大幕：一束束竖褶（上段从台口顶斜收到绑绳处、下段散开落地）+ 金绳；side = −1 左 / 1 右，x = 台口内沿（褶往台口中间铺） */
export function gatheredDrape(b: B, side: number, x: number, top: number, tie: number, rng: Rng) {
  const n = 9;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    // 上段：顶上铺开 2.2 宽，收到绑绳处 0.9 宽
    const xt = x - side * (t * 2.2), xm = x - side * (0.35 + t * 0.9);
    const L1 = Math.hypot(xt - xm, top - tie), a1 = Math.atan2(xm - xt, top - tie);
    b.add('cylinder', (xt + xm) / 2, (top + tie) / 2, -0.05 * k, 0.34, L1, 0.3, 'accent', { rz: a1, args: [0.85] });
    // 下段：绑绳往下散开到地面 1.6 宽
    const xb = x - side * (0.2 + t * 1.6) + (rng() - 0.5) * 0.1;
    const L2 = Math.hypot(xb - xm, tie), a2 = Math.atan2(xm - xb, tie);
    b.add('cylinder', (xm + xb) / 2, tie / 2, -0.05 * k, 0.3, L2, 0.34, 'accent', { rz: -a2 + Math.PI * 0, args: [1.2] });
  }
  // 金绳 + 流苏
  b.add('torus', x - side * 0.85, tie, 0.1, 1.5, 0.5, 0.7, 'trim', { args: [0.12] });
  b.add('cylinder', x - side * 1.5, tie - 0.45, 0.25, 0.16, 0.6, 0.16, 'trim', { args: [0.3] });
}

/** 檐幕：一排垂花（半圆环）+ 下沿流苏，挂在台口顶 y 处，宽 w */
export function valance(b: B, w: number, y: number) {
  b.box(0, y - 0.5, 0, w, 0.9, 0.2, 'accent', { args: [0] });
  const n = Math.round(w / 2.2);
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n);
    b.add('torus', x, y - 0.55, 0.12, w / n * 1.05, w / n * 0.8, 0.3, 'accent', { args: [0.2, Math.PI], rz: Math.PI });
    b.add('cylinder', x, y - 1.05, 0.2, 0.14, 0.4, 0.14, 'trim', { args: [0.4] });
  }
  b.box(0, y - 0.1, 0.12, w, 0.08, 0.06, 'trim', { args: [0], noOutline: true });
}
