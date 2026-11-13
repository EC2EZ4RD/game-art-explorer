import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';
import type { SceneImage } from './types';

/*
 * 清版街巷（Streets of Rage / River City Girls 一类）的套件（技术补全 2026-10-23，H 轨道）：
 *   临街门脸（底层店面 + 二三层窗户、防火梯、空调外机、卷帘门）、霓虹招牌（程序贴图：深色底板上的发光灯管字母，只用 ASCII）、
 *   涂鸦（程序贴图：喷漆的泡泡字块和描边）、油桶 / 木箱 / 垃圾桶（可打破的道具）、路灯、消防栓、
 *   街头混混（敌人：粗腿、宽肩、莫西干头 / 鸭舌帽 / 墨镜）。
 */

/** 门脸：宽 w、楼层数 floors（每层 2.6），正面朝 +z，底边在 z = 0 */
export function facade(b: B, w: number, floors: number, rng: Rng, wall: Role, opts: { shutter?: boolean; fireEscape?: boolean } = {}) {
  const FH = 2.6, H = floors * FH;
  b.box(0, 0, -0.6, w, H, 1.2, wall, { args: [0] });
  // 砖墙的灰缝：二楼往上一道道细横线（清版游戏最常见的红砖楼）
  if (wall === 'roof' || wall === 'wood') for (let y = FH + 0.15; y < H - 0.1; y += 0.28) b.box(0, y, 0.005, w, 0.03, 0.02, 'ink', { args: [0], noOutline: true });
  // 层间的腰线、顶上的女儿墙
  for (let f = 1; f < floors; f++) b.box(0, f * FH - 0.08, 0.02, w + 0.04, 0.16, 0.1, 'trim', { args: [0] });
  b.box(0, H, -0.55, w + 0.1, 0.35, 1.3, 'trim', { args: [0] });
  // 底层：店面（玻璃 + 门）或卷帘门
  if (opts.shutter) {
    b.box(0, 0, 0.02, w * 0.8, FH * 0.82, 0.06, 'metal', { args: [0] });
    for (let k = 1; k < 12; k++) b.box(0, (k / 12) * FH * 0.82, 0.06, w * 0.8, 0.025, 0.02, 'ink', { args: [0], noOutline: true });
  } else {
    b.box(-w * 0.12, 0.25, 0.02, w * 0.56, FH * 0.62, 0.05, 'glass', { args: [0], noOutline: true });
    b.box(w * 0.3, 0, 0.02, w * 0.2, FH * 0.78, 0.05, 'wood', { args: [0] });
    b.box(w * 0.36, FH * 0.38, 0.06, 0.06, 0.06, 0.04, 'interactive', { args: [0], noOutline: true });
    // 雨棚
    b.add('box', 0, FH * 0.7, 0.4, w * 0.95, 0.06, 0.85, rng() < 0.5 ? 'accent' : 'cloth', { rx: 0.35, args: [0] });
  }
  // 上层窗户（夜里有的亮着）
  for (let f = 1; f < floors; f++) {
    const n = Math.max(1, Math.round(w / 1.6));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) / n) * w;
      b.box(x, f * FH + 0.6, 0.02, 0.95, 1.3, 0.04, rng() < 0.35 ? 'emissive' : 'glass', { args: [0], noOutline: true });
      b.box(x, f * FH + 0.52, 0.08, 1.1, 0.08, 0.14, 'trim', { args: [0] });
      if (rng() < 0.25) b.box(x + 0.25, f * FH + 0.15, 0.25, 0.6, 0.42, 0.45, 'metal', { args: [0.1] }); // 空调外机
    }
  }
  // 防火梯：每层一个平台 + 栏杆 + 斜梯
  if (opts.fireEscape && floors > 1) {
    const fx = (rng() < 0.5 ? -1 : 1) * w * 0.2;
    for (let f = 1; f < floors; f++) {
      b.box(fx, f * FH, 0.55, 1.8, 0.06, 1.0, 'ink', { args: [0] });
      b.box(fx, f * FH + 0.5, 1.03, 1.8, 0.04, 0.04, 'ink', { args: [0], noOutline: true });
      for (const s of [-1, 0, 1]) b.box(fx + s * 0.88, f * FH, 1.03, 0.04, 0.5, 0.04, 'ink', { args: [0], noOutline: true });
      if (f + 1 < floors) b.add('box', fx, f * FH + FH / 2, 0.55, 2.2, 0.05, 0.4, 'ink', { rz: 0.9, args: [0] });
    }
  }
  return H;
}

/** 油桶（可打破）：桶身 + 两道箍 + 顶盖 */
export function oilDrum(b: B, role: Role = 'accent') {
  b.cyl(0, 0, 0, 0.32, 0.95, role, 1);
  for (const y of [0.3, 0.65]) b.cyl(0, y, 0, 0.335, 0.05, 'metal', 1, { noOutline: true });
  b.cyl(0, 0.95, 0, 0.3, 0.03, 'metal', 1, { noOutline: true });
}
/** 木箱（可打破）：箱子 + 斜撑板 */
export function woodCrate(b: B, s = 0.8) {
  b.box(0, 0, 0, s, s, s, 'wood', { args: [0.1] });
  b.add('box', 0, s / 2, s / 2 + 0.01, s * 1.25, 0.1, 0.03, 'trim', { rz: 0.78, args: [0], noOutline: true });
  b.box(0, s - 0.08, s / 2 + 0.01, s, 0.08, 0.03, 'trim', { args: [0], noOutline: true });
  b.box(0, 0, s / 2 + 0.01, s, 0.08, 0.03, 'trim', { args: [0], noOutline: true });
}
/** 垃圾桶 + 垃圾袋 */
export function trashCan(b: B, rng: Rng) {
  b.cyl(0, 0, 0, 0.28, 0.75, 'metal', 0.92);
  b.ball(0, 0.8, 0, 0.3, 0.07, 0.3, 'metal');
  for (let k = 0; k < 2; k++) b.ball(0.45 + k * 0.3, 0.2, 0.15 - k * 0.2, 0.25, 0.22, 0.22, rng() < 0.5 ? 'ink' : 'stone', { noOutline: true });
}
/** 路灯（夜里亮） */
export function streetLight(b: B) {
  b.cyl(0, 0, 0, 0.07, 4.4, 'metal');
  b.add('box', 0.45, 4.35, 0, 1.0, 0.08, 0.1, 'metal', { args: [0] });
  b.box(0.85, 4.1, 0, 0.42, 0.22, 0.28, 'emissive', { args: [0.2], noOutline: true });
}
/** 消防栓 */
export function hydrant(b: B) {
  b.cyl(0, 0, 0, 0.14, 0.55, 'accent', 1);
  b.ball(0, 0.58, 0, 0.15, 0.12, 0.15, 'accent');
  b.add('cylinder', 0, 0.38, 0, 0.1, 0.36, 0.1, 'accent', { rz: Math.PI / 2 });
}

/**
 * 街头混混（敌人）：粗腿、宽肩、外套敞开，头上莫西干 / 鸭舌帽 / 光头墨镜；面朝 −x（向左看，迎着主角）。高约 1.75 × s
 */
export function thug(b: B, rng: Rng, s = 1, style = 0, jacket: Role = 'accent') {
  const pants: Role = rng() < 0.5 ? 'cloth' : 'ink';
  for (const z of [-0.12, 0.12]) {
    b.add('box', -0.05 * s, 0.42 * s, z * s, 0.22 * s, 0.84 * s, 0.2 * s, pants, { rz: z > 0 ? 0.12 : -0.08, args: [0.2] });
    b.box(-0.1 * s, 0, z * s, 0.34 * s, 0.12 * s, 0.2 * s, 'ink', { args: [0.3] });
  }
  b.box(0, 0.84 * s, 0, 0.5 * s, 0.62 * s, 0.56 * s, jacket, { args: [0.3] });
  b.box(-0.2 * s, 0.88 * s, 0, 0.12 * s, 0.5 * s, 0.3 * s, 'paper', { args: [0.2] }); // 敞开的 T 恤
  for (const z of [-0.36, 0.36]) {
    b.add('box', -0.08 * s, 1.15 * s, z * s, 0.18 * s, 0.56 * s, 0.18 * s, jacket, { rz: 0.5, args: [0.3] });
    b.ball(-0.32 * s, 0.98 * s, z * s, 0.11 * s, 0.11 * s, 0.11 * s, 'skin');
  }
  b.ball(-0.04 * s, 1.6 * s, 0, 0.17 * s, 0.19 * s, 0.17 * s, 'skin');
  if (style === 0) for (let k = 0; k < 4; k++) b.add('pyramid', (0.1 - k * 0.07) * s, 1.82 * s, 0, 0.08 * s, 0.22 * s, 0.06 * s, 'characterAccent', { rz: 0.2 }); // 莫西干
  else if (style === 1) { b.ball(0, 1.72 * s, 0, 0.18 * s, 0.09 * s, 0.18 * s, 'cloth'); b.box(-0.22 * s, 1.68 * s, 0, 0.2 * s, 0.03 * s, 0.24 * s, 'cloth', { args: [0] }); } // 鸭舌帽
  else b.box(-0.16 * s, 1.63 * s, 0, 0.06 * s, 0.06 * s, 0.3 * s, 'ink', { args: [0], noOutline: true }); // 墨镜
}

/** 霓虹招牌（ASCII 字母）：深色底板 + 发光灯管字（外发光）+ 一圈灯管框。返回贴图四边形（不受光，夜里也亮） */
export function neonSign(text: string, color: string, pos: [number, number, number], h: number, opts: { vertical?: boolean; frame?: string } = {}): SceneImage {
  const n = text.length, vert = !!opts.vertical;
  const cw = vert ? 160 : Math.max(256, n * 100 + 80), ch = vert ? n * 110 + 70 : 170;
  const draw = (g: CanvasRenderingContext2D, w: number, hh: number) => {
    g.fillStyle = '#120A16'; g.fillRect(0, 0, w, hh);
    g.strokeStyle = '#2A1E30'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, hh - 8);
    const tube = (f: () => void, col: string) => {
      g.save(); g.shadowColor = col; g.shadowBlur = 22; g.strokeStyle = col; g.fillStyle = col; f(); g.restore();
      g.save(); g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.55; g.lineWidth = 2; f(); g.restore();
    };
    if (opts.frame) tube(() => { g.lineWidth = 6; g.strokeRect(18, 18, w - 36, hh - 36); }, opts.frame);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${vert ? 92 : 104}px "Arial Black", Arial, sans-serif`;
    if (vert) for (let i = 0; i < n; i++) tube(() => { g.lineWidth = 7; g.strokeText(text[i], w / 2, 70 + i * 110); }, color);
    else tube(() => { g.lineWidth = 7; g.strokeText(text, w / 2, hh / 2 + 4); }, color);
  };
  const aspect = cw / ch;
  return { file: '', canvas: { key: `brawl:neon:${text}:${color}:${vert ? 'v' : 'h'}:v1`, w: cw, h: ch, draw }, pos, size: [h * aspect, h], anchor: 'center', lit: 0, recolor: 0.25, cut: 0.5, role: 'emissive' };
}

/** 涂鸦（喷在卷帘门 / 墙上）：几个圆胖的色块字母形 + 黑描边 + 白高光 + 滴痕；seed 决定形状 */
export function graffiti(seed: number, pos: [number, number, number], w: number): SceneImage {
  const cols = ['#FF3E8A', '#2FE0C8', '#FFD23F', '#7A5CFF', '#FF7A2F', '#3FA9FF'];
  const draw = (g: CanvasRenderingContext2D, cw: number, ch: number) => {
    let s = seed * 9301 + 49297;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    g.clearRect(0, 0, cw, ch);
    const n = 3 + Math.floor(r() * 3), bw = cw / (n + 0.6);
    const c1 = cols[Math.floor(r() * cols.length)], c2 = cols[Math.floor(r() * cols.length)];
    const blob = (x: number, y: number, rw: number, rh: number) => { g.beginPath(); g.ellipse(x, y, rw, rh, (r() - 0.5) * 0.5, 0, Math.PI * 2); };
    for (const pass of [0, 1, 2]) {
      for (let i = 0; i < n; i++) {
        const x = bw * (0.8 + i), y = ch * (0.5 + (r() - 0.5) * 0.12);
        const rw = bw * (0.55 + r() * 0.15), rh = ch * (0.3 + r() * 0.08);
        if (pass === 0) { blob(x, y, rw + 10, rh + 10); g.fillStyle = '#111'; g.fill(); }
        else if (pass === 1) { const gr = g.createLinearGradient(0, y - rh, 0, y + rh); gr.addColorStop(0, c1); gr.addColorStop(1, c2); blob(x, y, rw, rh); g.fillStyle = gr; g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(x, y, rw * 0.22, rh * 0.35, 0, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(x - rw * 0.35, y - rh * 0.45, rw * 0.18, rh * 0.1, -0.4, 0, Math.PI * 2); g.fill(); g.fillStyle = c2; g.fillRect(x + (r() - 0.5) * rw, y + rh * 0.8, 5, ch * (0.08 + r() * 0.12)); }
      }
    }
    // 一颗星 + 一条箭头
    g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(cw * 0.06, ch * 0.88); g.quadraticCurveTo(cw * 0.5, ch * 1.02, cw * 0.92, ch * 0.82); g.stroke();
    g.strokeStyle = c1; g.lineWidth = 5; g.stroke();
  };
  return { file: '', canvas: { key: `brawl:graffiti:${seed}:v1`, w: 512, h: 220, draw }, pos, size: [w, (w * 220) / 512], anchor: 'center', lit: 0.85, recolor: 0.3, cut: 0.5, role: 'accent' };
}
