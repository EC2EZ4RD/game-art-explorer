import type { Rect } from './paint';

/*
 * 光标集（M12b-59，§2 的 drawCursor）：鼠标指针 / 导航光标本身是 UI——Stardew 的像素手套箭头、JRPG 的手指 / 三角光标、射击游戏的十字。
 *   ix.cursorSet 选画法：system 系统箭头（原来 el.interact = cursor 画的那支）、glove 卡通手套、pixelGlove 像素手套、triangle 三角、finger 指手、crosshair 细十字；
 *   ix.cursorContext 开着时光标旁挂一个按目标换的小图标：talk 对话泡、gift 礼物、use 手、attack 剑（Stardew 悬停在人 / 物上换成对话泡 / 礼物）。
 * 都是矢量（像素手套是 12 × 14 的点阵），不依赖字体子集；(x, y) = 热点（箭头尖 / 手指尖 / 三角尖 / 十字中心），size = 光标高（设计单位）。
 * 用的地方：el.interact = cursor（elements/combat.ts）、ix.focus = cursor（compose/screen.ts 的 focusDecor）。
 * Godot：每种光标导出一张 PNG，Input.set_custom_mouse_cursor(tex, shape, hotspot)（按目标换 = CURSOR_POINTING_HAND / CURSOR_HELP 等不同 shape），导航光标 = 跟着焦点控件移动的 TextureRect
 */

export type CursorKind = 'system' | 'glove' | 'pixelGlove' | 'triangle' | 'finger' | 'crosshair';
export const CURSOR_KINDS: readonly CursorKind[] = ['system', 'glove', 'pixelGlove', 'triangle', 'finger', 'crosshair'];
export type CursorContext = 'talk' | 'gift' | 'use' | 'attack';
/** 光标的颜色：fill 填色（白 / 焦点色）、ink 描边（深色）、accent 上下文小图标的底色 */
export interface CursorInk { fill: string; ink: string; accent: string; pixel?: boolean }

/** 像素手套（12 × 14）：'#' = 描边、'o' = 填色 */
const PIXEL_GLOVE = [
  '.##.........',
  '#oo#........',
  '#oo#........',
  '#oo###......',
  '#oo#oo##....',
  '#oo#oo#o##..',
  '#oooooo#oo#.',
  '#ooooooooo#.',
  '#oooooooooo#',
  '.#ooooooooo#',
  '.#oooooooo#.',
  '..#ooooooo#.',
  '..#ooooooo#.',
  '..########..',
];

/** 光标画出来的范围（热点在 (x, y)；占位 / 命中框用） */
export function cursorBox(kind: CursorKind, x: number, y: number, size: number): Rect {
  if (kind === 'crosshair') return { x: x - size / 2, y: y - size / 2, w: size, h: size };
  if (kind === 'triangle' || kind === 'finger') return { x: x - size * 1.1, y: y - size * 0.4, w: size * 1.1, h: size * 0.8 };
  return { x, y, w: size * 0.8, h: size };
}

/** 画一支光标（热点 (x, y)）：返回画出的范围。context 给了时右下挂一个小图标 */
export function drawCursor(g: CanvasRenderingContext2D, kind: CursorKind, x0: number, y0: number, size: number, ink: CursorInk, context?: CursorContext): Rect {
  // 像素对齐（vis.pixelScale 开着时）：热点落在整数像素上
  const x = ink.pixel ? Math.round(x0) : x0, y = ink.pixel ? Math.round(y0) : y0, s = size;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = ink.fill; g.strokeStyle = ink.ink; g.lineWidth = Math.max(1, s * 0.07);
  switch (kind) {
    case 'pixelGlove': {
      const c = Math.max(1, ink.pixel ? Math.round(s / 14) : s / 14);
      PIXEL_GLOVE.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; g.fillStyle = ch === '#' ? ink.ink : ink.fill; g.fillRect(x + (i - 1) * c, y + j * c, c, c); } });
      break;
    }
    case 'glove': {
      // 卡通手套：伸出的食指朝左上，手掌圆润、袖口一道横线
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + s * 0.14, y - s * 0.02, x + s * 0.2, y + s * 0.1);
      g.lineTo(x + s * 0.26, y + s * 0.36);
      g.quadraticCurveTo(x + s * 0.5, y + s * 0.28, x + s * 0.72, y + s * 0.42);
      g.quadraticCurveTo(x + s * 0.84, y + s * 0.62, x + s * 0.7, y + s * 0.86);
      g.lineTo(x + s * 0.3, y + s * 0.9);
      g.quadraticCurveTo(x + s * 0.08, y + s * 0.7, x + s * 0.04, y + s * 0.4);
      g.lineTo(x - s * 0.04, y + s * 0.12);
      g.quadraticCurveTo(x - s * 0.06, y + s * 0.01, x, y);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x + s * 0.3, y + s * 0.78); g.lineTo(x + s * 0.68, y + s * 0.74); g.stroke();
      g.beginPath(); g.moveTo(x + s * 0.4, y + s * 0.33); g.lineTo(x + s * 0.44, y + s * 0.5); g.moveTo(x + s * 0.56, y + s * 0.34); g.lineTo(x + s * 0.6, y + s * 0.52); g.stroke();
      break;
    }
    case 'finger': {
      // 指手（JRPG）：手指尖在热点，手朝右指向菜单项（热点在右端）
      g.beginPath();
      g.moveTo(x, y - s * 0.06);
      g.lineTo(x - s * 0.45, y - s * 0.1);
      g.quadraticCurveTo(x - s * 0.6, y - s * 0.32, x - s * 0.82, y - s * 0.28);
      g.quadraticCurveTo(x - s * 1.08, y - s * 0.2, x - s * 1.08, y + s * 0.06);
      g.quadraticCurveTo(x - s * 1.06, y + s * 0.34, x - s * 0.78, y + s * 0.36);
      g.lineTo(x - s * 0.42, y + s * 0.34);
      g.quadraticCurveTo(x - s * 0.36, y + s * 0.16, x - s * 0.42, y + s * 0.08);
      g.lineTo(x, y + s * 0.08);
      g.quadraticCurveTo(x + s * 0.06, y + s * 0.01, x, y - s * 0.06);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - s * 0.62, y + s * 0.12); g.lineTo(x - s * 0.44, y + s * 0.12); g.moveTo(x - s * 0.64, y + s * 0.24); g.lineTo(x - s * 0.46, y + s * 0.24); g.stroke();
      break;
    }
    case 'triangle':
      // 三角光标（JRPG 菜单）：尖朝右，尖在热点
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * 0.9, y - s * 0.38); g.lineTo(x - s * 0.72, y); g.lineTo(x - s * 0.9, y + s * 0.38); g.closePath(); g.fill(); g.stroke();
      break;
    case 'crosshair': {
      const r = s / 2, gp = s * 0.14;
      g.lineWidth = Math.max(1, s * 0.09) + 2; g.strokeStyle = ink.ink;
      const lines = () => { g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - gp, y); g.moveTo(x + gp, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y - gp); g.moveTo(x, y + gp); g.lineTo(x, y + r); };
      lines(); g.stroke(); g.lineWidth = Math.max(1, s * 0.09); g.strokeStyle = ink.fill; lines(); g.stroke();
      break;
    }
    default:
      // 系统箭头（原来 el.interact = cursor 的那支）
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s); g.lineTo(x + s * 0.28, y + s * 0.72); g.lineTo(x + s * 0.66, y + s * 0.72); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
  const box = cursorBox(kind, x, y, s);
  if (context) cursorContext(g, context, box.x + box.w * 0.85, box.y + box.h * 0.85, s * 0.46, ink);
  return box;
}

/** 光标旁的上下文小图标（ix.cursorContext）：圆底（上下文色）+ 白色矢量符号 */
function cursorContext(g: CanvasRenderingContext2D, kind: CursorContext, cx: number, cy: number, r: number, ink: CursorInk) {
  g.save();
  g.fillStyle = ink.accent; g.strokeStyle = ink.ink; g.lineWidth = Math.max(1, r * 0.12);
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, r * 0.16);
  const k = r * 0.55;
  if (kind === 'talk') { g.beginPath(); g.ellipse(cx, cy - k * 0.1, k, k * 0.7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx - k * 0.5, cy + k * 0.4); g.lineTo(cx - k * 0.8, cy + k * 0.95); g.lineTo(cx - k * 0.05, cy + k * 0.55); g.closePath(); g.fill(); }
  else if (kind === 'gift') { g.fillRect(cx - k * 0.8, cy - k * 0.3, k * 1.6, k * 1.1); g.fillRect(cx - k * 0.9, cy - k * 0.62, k * 1.8, k * 0.4); g.fillStyle = ink.accent; g.fillRect(cx - k * 0.12, cy - k * 0.62, k * 0.24, k * 1.42); }
  else if (kind === 'attack') { g.beginPath(); g.moveTo(cx - k * 0.8, cy + k * 0.8); g.lineTo(cx + k * 0.75, cy - k * 0.75); g.moveTo(cx - k * 0.3, cy + k * 0.05); g.lineTo(cx + k * 0.05, cy + k * 0.4); g.stroke(); }
  else { g.beginPath(); g.arc(cx, cy, k * 0.7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, k * 0.22, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** 按目标换的光标上下文（ix.cursorContext 开着时）：挂点是目标（敌人）→ attack；动作字里有说 / 聊 / 问 / 话 → talk；有送 / 赠 / 礼 → gift；其余 use */
export function cursorContextOf(attach: string, action: string): CursorContext {
  if (attach === 'target') return 'attack';
  if (/[说聊问话]/.test(action)) return 'talk';
  if (/[送赠礼]/.test(action)) return 'gift';
  return 'use';
}
