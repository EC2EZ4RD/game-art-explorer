/*
 * HUD 的矢量图标集（docs/workbench-redesign.md §8 RC4，轨道 E）：取代 Unicode 符号图标（⚒ ⚡ ♨ ⛨……粗细、风格各不相同，还和资源栏的位图图标混在一屏）。
 * 全部按 24 × 24 的格子手写（程序几何 + SVG 路径字串，没有下载、没有第三方图标），线宽统一 2 格（= 图标边长的 1/12），圆头圆角：
 *   shape  = 闭合的外形（线描时描边、扁平 / 双色 / 剪影时填色）；
 *   detail = 内部的开放笔画（任何画风都描线：扁平 / 剪影时用压暗的同色）；
 *   solid  = 本来就是实心的几何（■ ● ▲ ◆ 这类形状符号）：线描时也填色，保持原来「实心块」的意思。
 * 画法在 draw.ts；符号 → 图标名的对照在 GLYPH_ICON（drawText 遇到单个符号时换成矢量图标，一屏只有一种图标语言）。
 */

export interface IconDef {
  /** 中文名（规格页、开发页显示） */
  label: string;
  /** 闭合外形（可填色） */
  shape?: string;
  /** 内部笔画（只描线） */
  detail?: string;
  /** 实心几何：线描画风下也填色 */
  solid?: boolean;
  /** 空心符号（♡ ☆ 这类「空的」状态）：任何画风都只描线，与实心的那枚分得开 */
  hollow?: boolean;
}

const f = (n: number) => +n.toFixed(2);
/** 正多角星（中心 cx, cy，外径 R、内径 r，points 个角，第一个角朝上） */
function starPath(cx: number, cy: number, R: number, r: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? r : R;
    pts.push(`${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
  }
  return `${pts.join(' ')} Z`;
}
/** 圆（SVG 路径：两段半圆弧） */
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
/** 齿轮外形：teeth 个齿，外径 R、齿根 r，齿宽占比 w */
function gearPath(cx: number, cy: number, R: number, r: number, teeth: number, w = 0.5): string {
  const pts: string[] = [], step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = -Math.PI / 2 + i * step, h = (step * w) / 2;
    for (const [a, rr] of [[a0 - step / 2 + h * 0.35, r], [a0 - h, R], [a0 + h, R], [a0 + step / 2 - h * 0.35, r]] as [number, number][]) pts.push(`${pts.length ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
  }
  return `${pts.join(' ')} Z`;
}
/** 太阳 / 雪花这类放射线：n 条，从 r0 到 r1 */
function rays(cx: number, cy: number, r0: number, r1: number, n: number, off = 0): string {
  let s = '';
  for (let i = 0; i < n; i++) { const a = off + (i * Math.PI * 2) / n; s += `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)} L${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)} `; }
  return s.trim();
}
/** 花：n 片圆瓣（瓣心在 rr 半径上，瓣半径 pr） */
function petals(cx: number, cy: number, rr: number, pr: number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / n; s += `${circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, pr)} `; }
  return s.trim();
}
/** 雪花：三根穿心的线 + 每根两端的小叉 */
function snowflake(): string {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3, c = Math.cos(a), sn = Math.sin(a);
    s += `M${f(12 + c * 9)} ${f(12 + sn * 9)} L${f(12 - c * 9)} ${f(12 - sn * 9)} `;
    for (const d of [1, -1]) {
      const bx = 12 + c * 5.6 * d, by = 12 + sn * 5.6 * d;
      for (const t of [0.6, -0.6]) { const b = a + (d > 0 ? 0 : Math.PI) + t * 1.1; s += `M${f(bx)} ${f(by)} L${f(bx + Math.cos(b) * 3)} ${f(by + Math.sin(b) * 3)} `; }
    }
  }
  return s.trim();
}

const HEART = 'M12 20.5 C7 16.6 3 13.3 3 8.9 C3 6.1 5.1 4 7.7 4 C9.5 4 11 5 12 6.6 C13 5 14.5 4 16.3 4 C18.9 4 21 6.1 21 8.9 C21 13.3 17 16.6 12 20.5 Z';

export const ICONS: Record<string, IconDef> = {
  heart: { label: '心', shape: HEART, solid: true },
  heartO: { label: '空心', shape: HEART, hollow: true },
  star: { label: '星', shape: starPath(12, 12.8, 9.6, 4.2, 5), solid: true },
  starO: { label: '空星', shape: starPath(12, 12.8, 9.6, 4.2, 5), hollow: true },
  bolt: { label: '闪电', shape: 'M13.6 2.5 L5 13.6 H11.2 L10.2 21.5 L19 10.2 H12.8 Z' },
  shield: { label: '盾', shape: 'M12 2.8 L19.5 5.6 V11.2 C19.5 15.8 16.4 19.2 12 21.2 C7.6 19.2 4.5 15.8 4.5 11.2 V5.6 Z', detail: 'M12 7 V17 M8.5 11 H15.5' },
  swords: { label: '双剑', detail: 'M4 4 L14.6 14.6 M12.4 17.6 L17.6 12.4 M15.6 15.6 L19.6 19.6 M20 4 L9.4 14.6 M6.4 12.4 L11.6 17.6 M8.4 15.6 L4.4 19.6 M4 4 H7.2 M4 4 V7.2 M20 4 H16.8 M20 4 V7.2' },
  sword: { label: '剑', detail: 'M18.5 3.5 L9 13 M6.6 10.6 L13.4 17.4 M10.4 14.6 L5.2 19.8 M18.5 3.5 H21 V6 L11.5 15.5', shape: 'M18.5 3.5 H21 V6 L11.5 15.5 L8.5 12.5 Z' },
  spark: { label: '星芒', shape: 'M12 2.5 C12.8 8 16 11.2 21.5 12 C16 12.8 12.8 16 12 21.5 C11.2 16 8 12.8 2.5 12 C8 11.2 11.2 8 12 2.5 Z' },
  sparkle4: { label: '四向星', shape: 'M12 3 L14.3 7.4 H9.7 Z M12 21 L9.7 16.6 H14.3 Z M3 12 L7.4 9.7 V14.3 Z M21 12 L16.6 14.3 V9.7 Z', detail: circle(12, 12, 2.6) },
  diamond: { label: '菱形', shape: 'M12 3 L20.5 12 L12 21 L3.5 12 Z', solid: true },
  diamondO: { label: '空心菱形', shape: 'M12 3 L20.5 12 L12 21 L3.5 12 Z' },
  gem: { label: '宝石', shape: 'M12 3 L20.5 12 L12 21 L3.5 12 Z', detail: 'M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z' },
  crystal: { label: '晶石', shape: 'M7 3.5 H17 L21 9 L12 21 L3 9 Z', detail: 'M3 9 H21 M9 3.5 L8 9 L12 21 L16 9 L15 3.5' },
  square: { label: '方块', shape: 'M5 5 H19 V19 H5 Z', solid: true },
  squareO: { label: '空心方块', shape: 'M5 5 H19 V19 H5 Z' },
  squareIn: { label: '套方', shape: 'M4 4 H20 V20 H4 Z', detail: 'M8.5 8.5 H15.5 V15.5 H8.5 Z' },
  rect: { label: '长条', shape: 'M3.5 7 H20.5 V17 H3.5 Z' },
  dot: { label: '圆点', shape: circle(12, 12, 7.5), solid: true },
  ring: { label: '圆圈', shape: circle(12, 12, 7.5) },
  ringHalf: { label: '半圆', shape: circle(12, 12, 8), detail: 'M12 4 V20' },
  ringQuarter: { label: '四分之一', shape: circle(12, 12, 8), detail: 'M12 4 V12 H20' },
  ringLines: { label: '条纹圆', shape: circle(12, 12, 8), detail: 'M6 9 H18 M4.8 12 H19.2 M6 15 H18' },
  triangle: { label: '三角', shape: 'M12 3.8 L20.8 19.2 H3.2 Z', solid: true },
  triangleO: { label: '空心三角', shape: 'M12 3.8 L20.8 19.2 H3.2 Z' },
  play: { label: '播放', shape: 'M7 4.5 L19.5 12 L7 19.5 Z', solid: true },
  playO: { label: '空心右三角', shape: 'M7 4.5 L19.5 12 L7 19.5 Z' },
  back: { label: '左三角', shape: 'M17 4.5 L4.5 12 L17 19.5 Z', solid: true },
  backO: { label: '空心左三角', shape: 'M17 4.5 L4.5 12 L17 19.5 Z' },
  down: { label: '下三角', shape: 'M4.5 7 H19.5 L12 19.5 Z', solid: true },
  caretRight: { label: '小右箭', shape: 'M9 7 L16 12 L9 17 Z', solid: true },
  caretDown: { label: '小下箭', shape: 'M7 9.5 H17 L12 16 Z', solid: true },
  comet: { label: '火流星', shape: circle(15, 9, 4.6), detail: 'M11.6 12.4 L4 20 M10.8 8.3 L5.5 11 M15.7 13.6 L13 18.8' },
  flame: { label: '火焰', shape: 'M12 21 C7.8 21 5 18.2 5 14.4 C5 10.6 8.2 8.8 8.6 4.8 C10.8 6.2 11.6 8.2 11.6 10 C12.6 8.8 13.4 7.4 13.4 5.4 C16.8 7.6 19 10.8 19 14.4 C19 18.2 16.2 21 12 21 Z', detail: 'M12 21 C10.3 21 9.2 19.7 9.2 18.1 C9.2 16.2 11 15.3 11.4 13.6 C13.6 14.8 14.8 16.4 14.8 18.1 C14.8 19.7 13.7 21 12 21' },
  drop: { label: '水滴', shape: 'M12 3 C15 7.2 18.5 10.6 18.5 14.4 C18.5 18 15.6 21 12 21 C8.4 21 5.5 18 5.5 14.4 C5.5 10.6 9 7.2 12 3 Z', detail: 'M9 14.5 C9 16.4 10.2 17.8 12 18' },
  gear: { label: '齿轮', shape: gearPath(12, 12, 9.6, 7.4, 8, 0.48), detail: circle(12, 12, 3) },
  target: { label: '准星', shape: circle(12, 12, 6.8), detail: 'M12 2.5 V7.5 M12 16.5 V21.5 M2.5 12 H7.5 M16.5 12 H21.5 M12 11.4 V12.6' },
  mail: { label: '信', shape: 'M3.5 6 H20.5 V18 H3.5 Z', detail: 'M3.8 6.6 L12 12.8 L20.2 6.6' },
  steam: { label: '温泉', shape: 'M4 14.5 H20 C20 18.2 16.4 20.5 12 20.5 C7.6 20.5 4 18.2 4 14.5 Z', detail: 'M7.5 11.5 C6 9.8 9 8.2 7.5 6 M12 11.5 C10.5 9.8 13.5 8.2 12 6 M16.5 11.5 C15 9.8 18 8.2 16.5 6' },
  face: { label: '笑脸', shape: circle(12, 12, 8.6), detail: 'M8.4 14.2 C9.8 16.2 14.2 16.2 15.6 14.2 M9.2 9.6 V10.2 M14.8 9.6 V10.2' },
  menu: { label: '菜单', detail: 'M5 7 H19 M5 12 H19 M5 17 H19' },
  moon: { label: '月', shape: 'M15.6 3.6 A8.6 8.6 0 1 0 20.6 15.2 A7 7 0 0 1 15.6 3.6 Z' },
  close: { label: '关闭', detail: 'M6 6 L18 18 M18 6 L6 18' },
  flower: { label: '花', shape: petals(12, 12, 5.2, 3.4, 5), detail: circle(12, 12, 1.9) },
  hammerPick: { label: '锤镐', shape: 'M13 3.4 L20.6 11 L18.2 13.4 L10.6 5.8 Z', detail: 'M14.6 9.4 L4.4 19.6 M19.6 19.6 L8.4 8.4 M3.6 9.4 C5.6 6 8.8 4 12.4 3.8' },
  hammer: { label: '锤', shape: 'M11 3.5 L18 10.5 L15 13.5 L8 6.5 Z', detail: 'M13 8.5 L4 17.5 L6.5 20 L15.5 11' },
  pickaxe: { label: '镐', detail: 'M3.5 9.5 C7.5 4.6 15 3.8 20.5 7 M11.6 5.4 L17.2 20.6' },
  home: { label: '家', shape: 'M4 11 L12 4 L20 11 V20 H4 Z', detail: 'M10 20 V14.5 H14 V20' },
  refresh: { label: '循环', detail: 'M19.2 12.5 A7.2 7.2 0 1 1 16.8 7 M17.6 3.4 V7.6 H13.4' },
  snow: { label: '雪', detail: snowflake() },
  sun: { label: '太阳', shape: circle(12, 12, 4.2), detail: rays(12, 12, 6.8, 9.8, 8) },
  upgrade: { label: '升级', detail: 'M5 4.5 H19 M12 20 V8.6 M7 13.6 L12 8.6 L17 13.6' },
  spade: { label: '黑桃', shape: 'M12 3 C8 7.6 4 10 4 13.6 C4 16 5.8 17.6 8 17.6 C9.4 17.6 10.6 17 11.2 16 L10 21 H14 L12.8 16 C13.4 17 14.6 17.6 16 17.6 C18.2 17.6 20 16 20 13.6 C20 10 16 7.6 12 3 Z' },
  note: { label: '音符', shape: circle(8.6, 17.2, 3.2), detail: 'M11.8 17.2 V4 L18.5 6.6' },
  up: { label: '向上', detail: 'M12 20 V5 M6 11 L12 5 L18 11' },
  downArrow: { label: '向下', detail: 'M12 4 V19 M6 13 L12 19 L18 13' },
  left: { label: '向左', detail: 'M20 12 H5 M11 6 L5 12 L11 18' },
  right: { label: '向右', detail: 'M4 12 H19 M13 6 L19 12 L13 18' },
  dashRight: { label: '虚线箭头', detail: 'M3 12 H6 M9 12 H12 M15 12 H20 M16 8 L20 12 L16 16' },
  copy: { label: '复制', shape: 'M8.5 8.5 H20 V20 H8.5 Z', detail: 'M4 15.5 V4 H15.5' },
  fist: { label: '拳', shape: 'M5.8 9.4 C5.8 8 6.8 7 8.2 7 H17 C18.6 7 19.6 8 19.6 9.6 V14 C19.6 17.6 17 20 13.6 20 H11 C8 20 5.8 17.8 5.8 14.8 Z', detail: 'M9.8 7 V11 M13.4 7 V11 M17 7.2 V11 M5.8 12.4 H10.4' },
  check: { label: '勾', detail: 'M4.5 12.6 L9.6 17.6 L19.5 6.5' },
  cloud: { label: '云', shape: 'M7 18.5 H17.5 C19.7 18.5 21.5 16.7 21.5 14.5 C21.5 12.4 19.9 10.7 17.8 10.5 C17.2 7.3 14.4 5 11.2 5 C8 5 5.4 7.4 5 10.5 C3.3 11.2 2.5 12.7 2.5 14.3 C2.5 16.6 4.5 18.5 7 18.5 Z' },
  flag: { label: '旗', shape: 'M5.6 4 H18.4 L15.4 8.6 L18.4 13.2 H5.6 Z', detail: 'M5.6 21 V3.4' },
  point: { label: '指向', shape: 'M10 12.6 V4.8 C10 3.8 10.8 3 11.8 3 C12.8 3 13.6 3.8 13.6 4.8 V11 H16.6 C18 11 19 12 19 13.4 V16 C19 18.8 16.8 21 14 21 H12.2 C9.6 21 7.6 19.4 6.8 17 L5.6 13.6 C5.3 12.6 6 11.6 7 11.6 C7.7 11.6 8.3 12 8.6 12.6 L10 15.2' },
  phone: { label: '电话', shape: 'M6.6 3.5 H9.5 L11 8 L9 9.5 C10 12 12 14 14.5 15 L16 13 L20.5 14.5 V17.5 C20.5 19 19.3 20.3 17.8 20.2 C10.8 19.6 4.4 13.2 3.8 6.2 C3.7 4.7 5 3.5 6.6 3.5 Z' },
  plus: { label: '十字（治疗）', shape: 'M9.6 3.5 H14.4 V9.6 H20.5 V14.4 H14.4 V20.5 H9.6 V14.4 H3.5 V9.6 H9.6 Z', solid: true },
  minus: { label: '减', detail: 'M5 12 H19' },
  leaf: { label: '叶', shape: 'M5 19 C5 10.2 10.2 4.6 20 4 C19.4 13.8 13.8 19 5 19 Z', detail: 'M5 19 L14.6 9.4' },
  timer: { label: '计时', shape: circle(12, 13.4, 7.6), detail: 'M12 13.4 L15.2 10.2 M9.8 2.6 H14.2 M12 2.6 V5.8' },
  hourglass: { label: '沙漏', shape: 'M6 3.5 H18 C18 8 14.6 10 12 12 C14.6 14 18 16 18 20.5 H6 C6 16 9.4 14 12 12 C9.4 10 6 8 6 3.5 Z', detail: 'M9 18.6 H15' },
  die: { label: '骰子', shape: 'M5.5 4 H18.5 C19.3 4 20 4.7 20 5.5 V18.5 C20 19.3 19.3 20 18.5 20 H5.5 C4.7 20 4 19.3 4 18.5 V5.5 C4 4.7 4.7 4 5.5 4 Z', detail: 'M8.4 8.4 V8.6 M15.6 8.4 V8.6 M12 12 V12.2 M8.4 15.4 V15.6 M15.6 15.4 V15.6' },
  crown: { label: '王冠', shape: 'M3.5 8 L8 12.2 L12 5 L16 12.2 L20.5 8 L18.6 19 H5.4 Z' },
  cup: { label: '杯', shape: 'M5 9 H16 V14 C16 17.3 13.8 19.5 10.5 19.5 C7.2 19.5 5 17.3 5 14 Z', detail: 'M16 10.6 H17.4 C19.1 10.6 20.4 11.9 20.4 13.4 C20.4 14.9 19.1 16 17.4 16 H16 M8.5 3.5 V6.4 M12 3.5 V6.4' },
  skull: { label: '骷髅', shape: 'M12 3 C7.6 3 4.5 6.1 4.5 10.3 C4.5 12.9 5.7 14.9 7.5 16 V19.5 H16.5 V16 C18.3 14.9 19.5 12.9 19.5 10.3 C19.5 6.1 16.4 3 12 3 Z', detail: `${circle(9, 10.6, 1.6)} ${circle(15, 10.6, 1.6)} M10.4 19.5 V17 M13.6 19.5 V17` },
  coin: { label: '金币', shape: circle(12, 12, 8.4), detail: `${circle(12, 12, 5)} M12 9.6 V14.4` },
  potion: { label: '药水', shape: 'M9.6 3.5 H14.4 V8.4 C17.4 9.6 19.4 12.2 19.4 15.2 C19.4 18.6 16.1 21 12 21 C7.9 21 4.6 18.6 4.6 15.2 C4.6 12.2 6.6 9.6 9.6 8.4 Z', detail: 'M8.6 3.5 H15.4 M6 14.4 H18' },
  key: { label: '钥匙', shape: circle(8, 12, 4.4), detail: 'M12.4 12 H21 M18 12 V15.4 M15.2 12 V14.4' },
  lock: { label: '锁', shape: 'M5 10.5 H19 V20.5 H5 Z', detail: 'M8 10.5 V7.5 C8 5.2 9.8 3.5 12 3.5 C14.2 3.5 16 5.2 16 7.5 V10.5 M12 14.4 V16.6' },
  bow: { label: '弓', detail: 'M6 3.5 C14.5 6 18 9.5 20.5 18 M6 3.5 L20.5 18 M3.5 12.6 L13.3 10.7 M3.5 12.6 L5.6 10.2 M3.5 12.6 L6 14.4' },
  book: { label: '书', shape: 'M4 5 C6.6 4.2 9.4 4.4 12 6 C14.6 4.4 17.4 4.2 20 5 V19 C17.4 18.2 14.6 18.4 12 20 C9.4 18.4 6.6 18.2 4 19 Z', detail: 'M12 6 V20' },
  scroll: { label: '卷轴', shape: 'M6.5 4 H18.5 V17 C18.5 18.9 17 20.5 15 20.5 H6 C7.6 20.5 8.8 19.3 8.8 17.7 V6.3 C8.8 5 7.8 4 6.5 4 Z', detail: 'M6.5 4 C5.2 4 4.2 5 4.2 6.3 V8.4 H8.8 M11.6 9 H16 M11.6 12.4 H16' },
  bag: { label: '背包', shape: 'M5.5 9 C5.5 7.9 6.4 7 7.5 7 H16.5 C17.6 7 18.5 7.9 18.5 9 V19 C18.5 20.1 17.6 21 16.5 21 H7.5 C6.4 21 5.5 20.1 5.5 19 Z', detail: 'M9 7 V5.6 C9 4.2 10.3 3 12 3 C13.7 3 15 4.2 15 5.6 V7 M5.5 12.6 H18.5 M10.6 12.6 V15 H13.4 V12.6' },
  map: { label: '地图', shape: 'M3.5 6 L9 4 L15 6 L20.5 4 V18 L15 20 L9 18 L3.5 20 Z', detail: 'M9 4 V18 M15 6 V20' },
  compass: { label: '罗盘', shape: circle(12, 12, 8.8), detail: 'M15.4 8.6 L13.4 13.4 L8.6 15.4 L10.6 10.6 Z' },
  eye: { label: '眼', shape: 'M2.8 12 C5.2 7.4 8.4 5.4 12 5.4 C15.6 5.4 18.8 7.4 21.2 12 C18.8 16.6 15.6 18.6 12 18.6 C8.4 18.6 5.2 16.6 2.8 12 Z', detail: circle(12, 12, 3) },
  bell: { label: '铃', shape: 'M6 16.5 V11 C6 7.6 8.7 5 12 5 C15.3 5 18 7.6 18 11 V16.5 L19.5 18 H4.5 Z', detail: 'M12 3 V5 M10.2 20.6 C10.6 21.3 11.3 21.6 12 21.6 C12.7 21.6 13.4 21.3 13.8 20.6' },
  wrench: { label: '扳手', shape: 'M14.6 3.6 C17.4 3 20.4 5.4 20 8.6 L17.6 7.6 L15.8 8.4 L16 10.4 L18.2 11.6 C16.6 13.4 13.8 13.6 12 12.2 L5.6 18.6 C4.8 19.4 3.6 19.4 2.9 18.6 C2.2 17.9 2.2 16.7 3 16 L9.4 9.6 C8.2 7.6 9.6 4.4 14.6 3.6 Z' },
  tree: { label: '树', shape: 'M12 3 L18.5 11.4 H15.6 L19.6 17 H4.4 L8.4 11.4 H5.5 Z', detail: 'M12 17 V21' },
  chest: { label: '宝箱', shape: 'M4 10 H20 V19.5 H4 Z', detail: 'M4 10 C4 6.8 6.6 4.5 12 4.5 C17.4 4.5 20 6.8 20 10 M10.8 12.4 H13.2 V15.2 H10.8 Z M4 13.8 H10.8 M13.2 13.8 H20' },
  person: { label: '人', shape: circle(12, 7.6, 3.6), detail: 'M5 20.5 C5 16.4 8.1 13.4 12 13.4 C15.9 13.4 19 16.4 19 20.5' },
  helmet: { label: '头盔', shape: 'M4.5 15.5 C4.5 8.6 7.8 4 12 4 C16.2 4 19.5 8.6 19.5 15.5 V19 H14.6 V14 H9.4 V19 H4.5 Z', detail: 'M12 4 V10' },
  // 物品 / 建筑图标（审查修复 E 视觉 ⑦⑧⑬：背包、快捷栏、建造栏原来只有 ◆●▲■ 这类几何替身，同一屏不同物品常是同一个符号）——按物品名（ITEM_ICON）取
  log: { label: '原木', shape: 'M6 7.5 H18 C20.2 7.5 21.5 9.5 21.5 12 C21.5 14.5 20.2 16.5 18 16.5 H6 C3.8 16.5 2.5 14.5 2.5 12 C2.5 9.5 3.8 7.5 6 7.5 Z', detail: 'M6 9.6 C7.3 9.6 8.1 10.7 8.1 12 C8.1 13.3 7.3 14.4 6 14.4 C4.7 14.4 3.9 13.3 3.9 12 C3.9 10.7 4.7 9.6 6 9.6 Z M11 9.8 H16.4 M12.6 14.2 H18.2' },
  ore: { label: '矿石', shape: 'M4 16.5 L6.5 8.5 L11 5 L17 6.5 L20.5 12 L18.5 18.5 L9 19.5 Z', detail: 'M9 10 L11.4 12.4 M14.2 9 L15.2 11.2 M11.6 15.6 L15.4 14.6' },
  rock: { label: '石块', shape: 'M3.5 17 C3.5 12 6.5 8 11 7.5 C15.8 7 20.5 10.5 20.5 15 C20.5 17.5 18.6 19 16 19 H6 C4.6 19 3.5 18.2 3.5 17 Z', detail: 'M8.6 11.4 C10.2 10.4 12 10.2 13.6 10.6' },
  herb: { label: '草药', shape: 'M12 13 C8 13 5.5 10.5 5.5 7 C9.5 7 12 9.5 12 13 Z M12 16.4 C16 16.4 18.5 13.9 18.5 10.4 C14.5 10.4 12 12.9 12 16.4 Z M12 9 C10.6 7.6 10.6 5 12 3.5 C13.4 5 13.4 7.6 12 9 Z', detail: 'M12 21 V8.6' },
  seeds: { label: '种子袋', shape: 'M7 7.5 L5.5 19 C5.5 20 6.3 20.8 7.3 20.8 H16.7 C17.7 20.8 18.5 20 18.5 19 L17 7.5 Z', detail: 'M7 7.5 C8.5 5.8 9.8 4.5 12 3.5 C14.2 4.5 15.5 5.8 17 7.5 M10 13 C10.6 12 11.4 11.6 12 11.6 C12.6 11.6 13.4 12 14 13 C13.4 14 12.6 14.4 12 14.4 C11.4 14.4 10.6 14 10 13 Z M12 14.4 V17' },
  wateringCan: { label: '水壶', shape: 'M4.5 10 H15 V18.5 C15 19.3 14.3 20 13.5 20 H6 C5.2 20 4.5 19.3 4.5 18.5 Z', detail: 'M15 12.4 L20.4 7.6 M19 6.2 L21.8 9 M6.6 10 C6.6 7.2 8.4 5.4 10.8 5.4 C13.2 5.4 15 7.2 15 10' },
  wheat: { label: '麦穗', shape: 'M12 18 C9.4 17.4 8.4 15 9 13 C11 13.8 12.2 15.8 12 18 Z M12 18 C14.6 17.4 15.6 15 15 13 C13 13.8 11.8 15.8 12 18 Z M12 13.6 C9.4 13 8.4 10.6 9 8.6 C11 9.4 12.2 11.4 12 13.6 Z M12 13.6 C14.6 13 15.6 10.6 15 8.6 C13 9.4 11.8 11.4 12 13.6 Z M12 9.2 C9.4 8.6 8.4 6.2 9 4.2 C11 5 12.2 7 12 9.2 Z M12 9.2 C14.6 8.6 15.6 6.2 15 4.2 C13 5 11.8 7 12 9.2 Z M12 7.6 C10.8 6.2 10.8 4 12 2.6 C13.2 4 13.2 6.2 12 7.6 Z', detail: 'M12 21.5 V7' },
  hoe: { label: '锄头', shape: 'M13.6 4.6 L19.4 2.8 L21 7 L16.2 8.6 Z', detail: 'M4.6 20.4 L16.4 6.6' },
  axe: { label: '斧', shape: 'M12.6 4.6 C15.2 3 18.4 3.4 20.6 5.6 L18 10.6 C16.6 9.8 14.6 9.4 12.6 9.8 L11.4 8 Z', detail: 'M5.4 20.6 L15.6 6.4' },
  fish: { label: '鱼', shape: 'M2.8 12 C5.8 7.5 11 6.5 15.4 9 L20.6 6 V18 L15.4 15 C11 17.5 5.8 16.5 2.8 12 Z', detail: 'M7.2 11 V11.3 M11.6 9.4 C12.6 10.8 12.6 13.2 11.6 14.6' },
  meat: { label: '肉', shape: circle(14.4, 9.6, 6.2), detail: 'M10 14 L5.2 18.8 M3.8 17.6 L6.4 20.2 M12.4 8 C13 7 14.2 6.6 15.4 6.8' },
  bread: { label: '面包', shape: 'M4 13 C4 8.6 7.6 6 12 6 C16.4 6 20 8.6 20 13 V17.5 C20 18.3 19.3 19 18.5 19 H5.5 C4.7 19 4 18.3 4 17.5 Z', detail: 'M8.4 9 L9.8 12 M12 8.4 L13.4 11.4 M15.6 9 L17 12' },
  mushroom: { label: '蘑菇', shape: 'M3.5 12 C3.5 7.3 7.3 4 12 4 C16.7 4 20.5 7.3 20.5 12 Z', detail: 'M9.5 12 V18.5 C9.5 19.6 10.4 20.5 11.5 20.5 H12.5 C13.6 20.5 14.5 19.6 14.5 18.5 V12 M8 8.4 V8.6 M14.6 7.4 V7.6' },
  berry: { label: '浆果', shape: `${circle(8.4, 15.2, 4)} ${circle(15.6, 15.2, 4)} ${circle(12, 9.6, 4)}`, detail: 'M12 5.6 L13.6 2.8 M12 5.6 L10 3.2' },
  fruit: { label: '果子', shape: 'M12 7 C9 5.4 4.5 6.5 4.5 11.5 C4.5 16.5 8 20.5 10.5 20.5 C11.2 20.5 11.6 20 12 20 C12.4 20 12.8 20.5 13.5 20.5 C16 20.5 19.5 16.5 19.5 11.5 C19.5 6.5 15 5.4 12 7 Z', detail: 'M12 7 C12 5.2 12.6 3.8 14 3 M8 10.4 C7.6 11.4 7.6 12.6 8 13.6' },
  rope: { label: '绳子', detail: `${circle(12, 11, 7.4)} ${circle(12, 11, 4)} M17.4 16 C18.6 18 19.8 19.4 21 20.2` },
  jar: { label: '罐子', shape: 'M8 4.5 H16 V7 C18.5 8.4 19.5 10.8 19.5 13.5 C19.5 17.6 16.4 20.5 12 20.5 C7.6 20.5 4.5 17.6 4.5 13.5 C4.5 10.8 5.5 8.4 8 7 Z', detail: 'M7.4 4.5 H16.6 M6 12.2 H18' },
  shop: { label: '商店', shape: 'M5 10 H19 V20 H5 Z', detail: 'M4 10 L5.6 4.5 H18.4 L20 10 M8 4.5 L7.2 10 M12 4.5 V10 M16 4.5 L16.8 10 M10 20 V15 H14 V20' },
  factory: { label: '工厂', shape: 'M3.5 20 V10 L8.5 13 V10 L13.5 13 V5 H17.5 V3.5 H20.5 V20 Z', detail: 'M6.4 16.4 H8.6 M11 16.4 H13.2 M15.6 16.4 H17.8' },
  clinic: { label: '医院', shape: 'M4.5 7 H19.5 V20.5 H4.5 Z', detail: 'M12 9.4 V16.6 M8.4 13 H15.6 M9 7 V4 H15 V7' },
  road: { label: '道路', shape: 'M8.4 3.5 H15.6 L20.4 20.5 H3.6 Z', detail: 'M12 5.6 V8.2 M12 10.8 V13.4 M12 16 V19' },
  bulldozer: { label: '拆除', shape: 'M7 7 H13 L15 11 H18.5 V15 H4.5 V11 H7 Z', detail: `M5 18.6 H17 ${circle(6.6, 18.6, 1.6)} ${circle(15.4, 18.6, 1.6)} M18.5 11.6 L21.5 15.2 V18.6` },
};

/**
 * 符号 → 图标名：内容包、元素、模板里当图标用的 Unicode 符号（drawText 遇到「整段就是这一个符号」时换成矢量图标）。
 * 不收：· • 这类分隔点（是排版符号，不是图标）
 */
export const GLYPH_ICON: Record<string, string> = {
  '♥': 'heart', '♡': 'heartO', '★': 'star', '☆': 'starO', '⚡': 'bolt', '⛨': 'shield', '⚔': 'swords', '✦': 'spark', '✥': 'sparkle4',
  '◆': 'diamond', '◇': 'diamondO', '◈': 'gem', '■': 'square', '□': 'squareO', '▣': 'squareIn', '⧈': 'squareIn', '▭': 'rect',
  '●': 'dot', '○': 'ring', '◐': 'ringHalf', '◔': 'ringQuarter', '◍': 'ringLines', '▲': 'triangle', '△': 'triangleO',
  '▶': 'play', '▷': 'playO', '◀': 'back', '◁': 'backO', '▼': 'down', '▸': 'caretRight', '▾': 'caretDown',
  '☄': 'comet', '⚙': 'gear', '⌖': 'target', '✉': 'mail', '♨': 'steam', '☺': 'face', '☰': 'menu', '≡': 'menu', '☾': 'moon',
  '✖': 'close', '✕': 'close', '×': 'close', '✿': 'flower', '⚒': 'hammerPick', '⛏': 'pickaxe', '⌂': 'home', '↻': 'refresh', '❄': 'snow', '☀': 'sun',
  '⤒': 'upgrade', '♠': 'spade', '♪': 'note', '↑': 'up', '↓': 'downArrow', '←': 'left', '→': 'right', '⇢': 'dashRight', '⧉': 'copy',
  '✊': 'fist', '✓': 'check', '☁': 'cloud', '⚑': 'flag', '☝': 'point', '☏': 'phone', '✚': 'plus', '−': 'minus', '❦': 'leaf', '⏱': 'timer',
  '⌛': 'hourglass', '⚄': 'die', '♛': 'crown', '☕': 'cup', '☠': 'skull',
};

/**
 * 物品名 → 图标名（审查修复 E 视觉 ⑦⑧⑬）：内容包里的物品 / 建筑 / 工具多数只写了几何符号（◆ 木材、● 石块、✿ 小麦……），按名字换成有意义的图标。
 * 名字按「包含」匹配（「小麦种子」先配「种子」）：顺序 = 优先级，更具体的写在前面
 */
export const ITEM_ICON: [string, string][] = [
  ['种子', 'seeds'], ['水壶', 'wateringCan'], ['水罐', 'wateringCan'], ['锄', 'hoe'], ['农具', 'hoe'], ['砍刀', 'axe'], ['斧', 'axe'], ['镐', 'pickaxe'], ['锤', 'hammer'],
  ['木材', 'log'], ['原木', 'log'], ['木料', 'log'], ['铁矿', 'ore'], ['矿石', 'ore'], ['铜矿', 'ore'], ['金矿', 'ore'], ['石块', 'rock'], ['石头', 'rock'], ['建材', 'rock'],
  // 整合修复 U#25（沙盒背包原来是一排 ■ ▲ ◆ 几何块）：圆石 / 铁块、武器与常用道具也按名字配图标
  ['圆石', 'rock'], ['碎石', 'rock'], ['铁块', 'ore'], ['铁锭', 'ore'], ['金块', 'ore'], ['火把', 'flame'], ['地图', 'map'], ['宝箱', 'chest'], ['箱子', 'chest'],
  ['剑', 'sword'], ['盾', 'shield'], ['弓', 'bow'], ['头盔', 'helmet'],
  ['草药', 'herb'], ['药草', 'herb'], ['灵草', 'herb'], ['小麦', 'wheat'], ['鱼', 'fish'], ['肉', 'meat'], ['面包', 'bread'], ['蘑菇', 'mushroom'],
  ['浆果', 'berry'], ['野莓', 'berry'], ['果子', 'fruit'], ['苹果', 'fruit'], ['绳', 'rope'], ['陶罐', 'jar'], ['花蜜', 'drop'], ['松脂', 'drop'], ['蜂蜜', 'drop'],
  ['药水', 'potion'], ['药剂', 'potion'], ['水晶', 'crystal'], ['宝石', 'gem'], ['金币', 'coin'], ['钥匙', 'key'], ['卷轴', 'scroll'], ['野花', 'flower'],
  ['住房', 'home'], ['房屋', 'home'], ['商业', 'shop'], ['商店', 'shop'], ['工业', 'factory'], ['工厂', 'factory'], ['道路', 'road'], ['修路', 'road'], ['交通', 'road'],
  ['电力', 'bolt'], ['电厂', 'bolt'], ['服务', 'clinic'], ['医院', 'clinic'], ['绿地', 'tree'], ['公园', 'tree'], ['拆除', 'bulldozer'],
];
/** 物品名对应的图标（没有对应时 null） */
export function itemIconName(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [k, v] of ITEM_ICON) if (name.includes(k)) return v;
  return null;
}

/** 图标名清单（规格页、开发页） */
export const ICON_NAMES = Object.keys(ICONS);
