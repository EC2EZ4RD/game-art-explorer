import { drawBox, drawText, measure, resolveColor, type Rect, type TextOpts } from './paint';
import type { BoxStyle, SkinPalette } from './types';
import type { PadButton } from './content/types';

/*
 * 按键提示图标集（ix.glyphs，docs/ui-hud-plan.md M10）：同一个动作在不同输入方式下画成不同的图标——
 *   键盘键帽 / 括号文字（旧皮肤原样，由调用方画）、Xbox（彩色圆钮 A 绿 B 红 X 蓝 Y 黄）、PlayStation（✕ ○ □ △ 形状色）、
 *   Nintendo（深色圆钮、A B 位置与 Xbox 相反）、触屏（点按手势圈）、文字（"按 E"）。
 * 动作 → 按钮的对应按常见默认键位：交互 = 南键、攻击 = 西键、技能 = 北键 / 右肩键、背包 = 视图键。
 * PAD 只认常用的几个键盘键；内容包的按键提示可以直接指定手柄按钮（content/types.ts 的 PadButton，按 PAD_BUTTON 换成各套的字），指定了就不查 PAD。
 */

export type GlyphSet = 'keycap' | 'brackets' | 'xbox' | 'playstation' | 'nintendo' | 'touch' | 'text' | 'mouse' | 'touchpad';
/**
 * 字形着色（ix.glyphTint，M12b-59，control#13 / elden-ring#7）：brand = 品牌色面键（原来的：Xbox A 绿 B 红……）；mono = 字色描边圈 + 字色字母（单色细线圈）；
 * text = 字色实心圆 + 面板底色字母。text = 字色、face = 面板底色（调用方解析好的颜色）
 */
export interface GlyphTint { mode: 'mono' | 'text'; text: string; face: string }
/** 鼠标按键（ix.glyphs = mouse，M12b-59，dont-starve#16）：左键 / 右键 / 中键 / 滚轮 */
export type MouseButton = 'lmb' | 'rmb' | 'mmb' | 'wheel';
/** 键盘键 → 鼠标键（交互 / 确认 = 左键，取消 / 次要 = 右键）；不在表里的键在鼠标字形集里照旧画键帽（逐条混用） */
const MOUSE: Record<string, MouseButton> = { E: 'lmb', F: 'lmb', Space: 'lmb', Q: 'rmb', R: 'rmb', Shift: 'mmb' };
const MOUSE_PAD: Partial<Record<PadButton, MouseButton>> = { south: 'lmb', west: 'lmb', east: 'rmb', north: 'rmb', ls: 'mmb', rs: 'mmb', up: 'wheel', down: 'wheel' };
/** 这个提示在鼠标字形集里画哪个键（null = 没有对应的鼠标键，画键帽） */
export const mouseButtonOf = (key: string, pad?: PadButton): MouseButton | null => (pad && MOUSE_PAD[pad]) ?? MOUSE[key] ?? null;
/** 触摸板手势（ix.glyphs = touchpad，M12b-59，ghost-of-tsushima#27）：上 / 下 / 左 / 右滑；不在表里的提示照旧画 Xbox 面键 */
export type Swipe = 'up' | 'down' | 'left' | 'right';
const SWIPE: Record<string, Swipe> = { Tab: 'up', Esc: 'down' };
const SWIPE_PAD: Partial<Record<PadButton, Swipe>> = { up: 'up', down: 'down', left: 'left', right: 'right', view: 'up', menu: 'down' };
export const swipeOf = (key: string, pad?: PadButton): Swipe | null => (pad && SWIPE_PAD[pad]) ?? SWIPE[key] ?? null;

const PAD: Record<'xbox' | 'playstation' | 'nintendo', Record<string, string>> = {
  xbox: { E: 'A', F: 'X', Q: 'Y', R: 'B', Tab: '⧉', Esc: '≡', Space: 'A', Shift: 'LB', '1': 'LB', '2': 'RB', '3': 'LT', '4': 'RT' },
  playstation: { E: '✕', F: '□', Q: '△', R: '○', Tab: '▭', Esc: '≡', Space: '✕', Shift: 'L1', '1': 'L1', '2': 'R1', '3': 'L2', '4': 'R2' },
  nintendo: { E: 'B', F: 'Y', Q: 'X', R: 'A', Tab: '−', Esc: '+', Space: 'B', Shift: 'L', '1': 'L', '2': 'R', '3': 'ZL', '4': 'ZR' },
};
/** 手柄按钮 → 各套图标里的字（面键按各家的位置：Nintendo 的南键是 B、东键是 A） */
const PAD_BUTTON: Record<'xbox' | 'playstation' | 'nintendo', Record<PadButton, string>> = {
  xbox: { south: 'A', east: 'B', west: 'X', north: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', view: '⧉', menu: '≡', ls: 'LS', rs: 'RS', up: '↑', down: '↓', left: '←', right: '→' },
  playstation: { south: '✕', east: '○', west: '□', north: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', view: '▭', menu: '≡', ls: 'L3', rs: 'R3', up: '↑', down: '↓', left: '←', right: '→' },
  nintendo: { south: 'B', east: 'A', west: 'Y', north: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', view: '−', menu: '+', ls: 'LS', rs: 'RS', up: '↑', down: '↓', left: '←', right: '→' },
};
const FACE_COLOR: Record<string, string> = {
  'xbox:A': '#3fb950', 'xbox:B': '#e5484d', 'xbox:X': '#3b82f6', 'xbox:Y': '#e3b341',
  'playstation:✕': '#7aa2f7', 'playstation:○': '#ff6b81', 'playstation:□': '#e48fd0', 'playstation:△': '#4fd1a5',
};

/**
 * 挂锁字形（M12a-09：st.locked = lock 画它，✕ 只留给 sealed 的「不可用」）：锁梁 + 锁身 + 锁孔，以 (cx, cy) 为中心、高 s。
 * 画布线条画，不依赖字体（字体子集里没有 🔒）；hole = 锁孔颜色（锁身底色上挖的孔）
 */
export function drawPadlock(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, hole = 'rgba(0,0,0,0.55)') {
  const bw = s * 0.72, bh = s * 0.5, by = cy - s * 0.5 + s * 0.46;
  g.save();
  g.strokeStyle = color; g.lineWidth = Math.max(1.2, s * 0.12); g.lineCap = 'round';
  g.beginPath(); g.arc(cx, by, s * 0.22, Math.PI, 0); g.lineTo(cx + s * 0.22, by + s * 0.04); g.moveTo(cx - s * 0.22, by); g.lineTo(cx - s * 0.22, by + s * 0.04); g.stroke();
  g.fillStyle = color; g.beginPath(); g.roundRect(cx - bw / 2, by, bw, bh, Math.max(1, s * 0.08)); g.fill();
  g.fillStyle = hole; g.beginPath(); g.arc(cx, by + bh * 0.42, Math.max(0.8, s * 0.07), 0, Math.PI * 2); g.fill();
  g.fillRect(cx - Math.max(0.5, s * 0.03), by + bh * 0.42, Math.max(1, s * 0.06), bh * 0.32);
  g.restore();
}

export function glyphSetOf(v: string): GlyphSet {
  return (['keycap', 'brackets', 'xbox', 'playstation', 'nintendo', 'touch', 'text', 'mouse', 'touchpad'] as const).find((x) => x === v) ?? 'keycap';
}

/** 这个键在这套图标里的显示名（键盘类原样）；pad = 包里指定的手柄按钮（手柄类优先用它） */
export const glyphLabel = (set: GlyphSet, key: string, pad?: PadButton) => (set === 'xbox' || set === 'playstation' || set === 'nintendo' ? (pad ? PAD_BUTTON[set][pad] : PAD[set][key] ?? key) : key);

/** drawGlyph 会画多宽（M12a-34：按键图例按实宽排，不再按键名估）：与 drawGlyph 同一个式子，不画 */
export function glyphWidth(tx: CanvasRenderingContext2D, h: number, key: string, set0: GlyphSet, o: TextOpts, pad?: PadButton): number {
  if (set0 === 'text') return measure(tx, `按 ${key}`, { ...o, weight: 700 });
  if (set0 === 'touch') return h;
  if (set0 === 'mouse') return h * 0.66;
  if (set0 === 'touchpad' && swipeOf(key, pad)) return h * 1.4;
  const set = set0 === 'touchpad' ? 'xbox' : set0;
  const label = glyphLabel(set, key, pad);
  if (!/^(L|R|LB|RB|LT|RT|L1|R1|L2|R2|ZL|ZR)$/.test(label)) return h;
  const lw = measure(tx, label, { ...o, weight: 800, size: h * (label.length > 1 ? 0.42 : 0.56), outline: undefined, shadow: undefined, glowColor: undefined, glow: undefined });
  return Math.max(h * 1.5, lw + h * 0.5);
}

/** 画一个手柄 / 触屏 / 文字按键提示，返回宽度。键盘键帽与括号文字不归这里画（调用方沿用皮肤的按键样式）；pad 见 glyphLabel */
export function drawGlyph(g: CanvasRenderingContext2D, tx: CanvasRenderingContext2D, r: Rect, key: string, set0: GlyphSet, o: TextOpts, keyStyle: BoxStyle, pal: SkinPalette, pad?: PadButton, tint?: GlyphTint): number {
  const h = r.h, cx0 = r.x + h / 2, cy = r.y + h / 2;
  const hi = resolveColor('@accent', pal, '#4c8dff');
  if (set0 === 'mouse') return drawMouse(g, r, mouseButtonOf(key, pad) ?? 'lmb', hi, tint);
  const sw = set0 === 'touchpad' ? swipeOf(key, pad) : null;
  if (sw) return drawSwipe(g, r, sw, hi, tint);
  const set: GlyphSet = set0 === 'touchpad' ? 'xbox' : set0;
  if (set === 'text') {
    const s = `按 ${key}`;
    drawText(tx, s, r.x, r.y, h, { ...o, weight: 700 });
    return measure(tx, s, { ...o, weight: 700 });
  }
  if (set === 'touch') {
    // 点按手势：实心点 + 两圈涟漪
    g.save();
    g.strokeStyle = resolveColor(keyStyle.bg && 'solid' in keyStyle.bg ? keyStyle.bg.solid : '@accent', pal, '#4c8dff');
    g.lineWidth = Math.max(1.5, h * 0.08);
    for (const k of [0.46, 0.32]) { g.globalAlpha = k === 0.46 ? 0.45 : 0.9; g.beginPath(); g.arc(cx0, cy, h * k, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(cx0, cy, h * 0.14, 0, Math.PI * 2); g.fill();
    g.restore();
    return h;
  }
  const label = glyphLabel(set, key, pad);
  const shoulder = /^(L|R|LB|RB|LT|RT|L1|R1|L2|R2|ZL|ZR)$/.test(label);
  const meta = /^[⧉≡▭−+]$/.test(label);
  const lo = { ...o, weight: 800, size: h * (label.length > 1 ? 0.42 : 0.56), color: '#fff', outline: undefined, shadow: undefined, glowColor: undefined, glow: undefined };
  const lw = measure(tx, label, lo);
  const w = shoulder ? Math.max(h * 1.5, lw + h * 0.5) : h;
  g.save();
  // 单色 / 跟随字色（ix.glyphTint）：面键、肩键都换成字色的细线圈 / 实心圆，字母跟着换（不再按品牌色）
  if (tint) {
    if (shoulder) drawBox(g, { x: r.x, y: r.y + h * 0.1, w, h: h * 0.8 }, tint.mode === 'text' ? { bg: { solid: tint.text }, radius: h * 0.3 } : { radius: h * 0.3, border: { width: Math.max(1, h * 0.07), color: tint.text } }, pal);
    else { g.beginPath(); g.arc(cx0, cy, h * 0.46, 0, Math.PI * 2); if (tint.mode === 'text') { g.fillStyle = tint.text; g.fill(); } else { g.strokeStyle = tint.text; g.lineWidth = Math.max(1, h * 0.07); g.stroke(); } }
    g.restore();
    drawText(tx, label, r.x + w / 2 - lw / 2, r.y, h, { ...lo, color: tint.mode === 'text' ? tint.face : tint.text });
    return w;
  }
  if (shoulder) {
    // 肩键 / 扳机：圆角长条
    drawBox(g, { x: r.x, y: r.y + h * 0.1, w, h: h * 0.8 }, { bg: { solid: '#2b2f38' }, radius: h * 0.3, border: { width: 1, color: 'rgba(255,255,255,0.35)' } }, pal);
  } else {
    const face = FACE_COLOR[`${set}:${label}`];
    g.fillStyle = set === 'playstation' || meta ? '#2b2f38' : face ?? '#2b2f38';
    g.beginPath(); g.arc(cx0, cy, h * 0.48, 0, Math.PI * 2); g.fill();
    g.strokeStyle = set === 'playstation' && face ? face : 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, h * 0.06); g.stroke();
  }
  g.restore();
  const color = set === 'playstation' ? FACE_COLOR[`${set}:${label}`] ?? '#fff' : '#fff';
  drawText(tx, label, r.x + w / 2 - lw / 2, r.y, h, { ...lo, color });
  return w;
}

/** 鼠标字形（M12b-59）：机身 + 左右键分缝 + 滚轮，要按的那一键填强调色；着色（ix.glyphTint）时机身按字色描线。返回宽 */
function drawMouse(g: CanvasRenderingContext2D, r: Rect, btn: MouseButton, hi: string, tint?: GlyphTint): number {
  const h = r.h, w = h * 0.62, x = r.x + h * 0.02, y = r.y + h * 0.04, bh = h * 0.92, ink = tint ? tint.text : 'rgba(255,255,255,0.75)', body = tint ? (tint.mode === 'text' ? tint.text : 'rgba(0,0,0,0)') : '#2b2f38';
  const lw = Math.max(1, h * 0.06), split = y + bh * 0.42;
  g.save();
  g.beginPath(); g.roundRect(x, y, w, bh, w * 0.48); g.fillStyle = body; g.fill();
  // 按的那一键：左 / 右半边上半截（中键 / 滚轮 = 中间一小条）
  g.save(); g.beginPath(); g.roundRect(x, y, w, bh, w * 0.48); g.clip(); g.fillStyle = hi;
  if (btn === 'lmb') g.fillRect(x, y, w / 2, split - y); else if (btn === 'rmb') g.fillRect(x + w / 2, y, w / 2, split - y);
  g.restore();
  g.strokeStyle = ink; g.lineWidth = lw;
  g.beginPath(); g.roundRect(x, y, w, bh, w * 0.48); g.stroke();
  g.beginPath(); g.moveTo(x, split); g.lineTo(x + w, split); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, split); g.stroke();
  const wh = bh * 0.2, wy = y + bh * 0.12;
  g.beginPath(); g.roundRect(x + w / 2 - w * 0.09, wy, w * 0.18, wh, w * 0.09); g.fillStyle = btn === 'mmb' || btn === 'wheel' ? hi : tint?.mode === 'text' ? tint.face : '#14161b'; g.fill(); g.stroke();
  g.restore();
  return h * 0.66;
}
/** 触摸板滑动字形（M12b-59）：圆角板 + 滑动箭头 + 起点的手指圆点。返回宽 */
function drawSwipe(g: CanvasRenderingContext2D, r: Rect, dir: Swipe, hi: string, tint?: GlyphTint): number {
  const h = r.h, w = h * 1.36, x = r.x + h * 0.02, y = r.y + h * 0.12, ph = h * 0.76, ink = tint ? tint.text : 'rgba(255,255,255,0.75)';
  g.save();
  g.beginPath(); g.roundRect(x, y, w, ph, h * 0.16); g.fillStyle = tint ? (tint.mode === 'text' ? tint.text : 'rgba(0,0,0,0)') : '#2b2f38'; g.fill();
  g.strokeStyle = ink; g.lineWidth = Math.max(1, h * 0.06); g.stroke();
  const cx = x + w / 2, cy = y + ph / 2, L = (dir === 'up' || dir === 'down' ? ph : w) * 0.32;
  const [dx, dy] = dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : dir === 'left' ? [-1, 0] : [1, 0];
  const x0 = cx - dx * L, y0 = cy - dy * L, x1 = cx + dx * L, y1 = cy + dy * L;
  g.strokeStyle = hi; g.fillStyle = hi; g.lineWidth = Math.max(1.5, h * 0.08); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const a = h * 0.14; g.beginPath(); g.moveTo(x1 + dx * a, y1 + dy * a); g.lineTo(x1 - dy * a - dx * a * 0.2, y1 + dx * a - dy * a * 0.2); g.lineTo(x1 + dy * a - dx * a * 0.2, y1 - dx * a - dy * a * 0.2); g.closePath(); g.fill();
  g.beginPath(); g.arc(x0, y0, h * 0.09, 0, Math.PI * 2); g.fill();
  g.restore();
  return w + h * 0.04;
}

/**
 * 像素字形集（M12a-31：vis.iconStyle = pixel 时状态图标用它，Dead Cells 的无框像素小图标）：7 × 7 点阵，'#' = 亮格。
 * 画布方块画，不依赖字体；没有这个字的点阵时 drawPixelGlyph 返回 false，调用方照常写字
 */
const PIXEL_GLYPHS: Record<string, string[]> = {
  '!': ['..##...', '..##...', '..##...', '..##...', '..##...', '.......', '..##...'],
  Z: ['#######', '.....##', '....##.', '...##..', '..##...', '.##....', '#######'],
  '♥': ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  '⚡': ['....##.', '...##..', '..##...', '.######', '...##..', '..##...', '.##....'],
  '?': ['.#####.', '##...##', '.....##', '...###.', '...##..', '.......', '...##..'],
  '+': ['.......', '...#...', '...#...', '#######', '...#...', '...#...', '.......'],
  '×': ['##...##', '.##.##.', '..###..', '...#...', '..###..', '.##.##.', '##...##'],
  '✦': ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
  '▲': ['...#...', '..###..', '..###..', '.#####.', '.#####.', '#######', '.......'],
  '●': ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
};
/** 以 (cx, cy) 为中心画一个边长 size 的像素字形；outline 给了时先画一圈 1 格宽的描边（四邻外扩）。没有点阵返回 false */
export function drawPixelGlyph(g: CanvasRenderingContext2D, ch: string, cx: number, cy: number, size: number, color: string, outline?: string): boolean {
  const rows = PIXEL_GLYPHS[ch];
  if (!rows) return false;
  const c = size / 7, x0 = cx - size / 2, y0 = cy - size / 2;
  g.save();
  if (outline) {
    g.fillStyle = outline;
    rows.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === '#') g.fillRect(x0 + (i - 1) * c, y0 + (j - 1) * c, c * 3, c * 3); });
  }
  g.fillStyle = color;
  rows.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === '#') g.fillRect(x0 + i * c, y0 + j * c, c, c); });
  g.restore();
  return true;
}
