import { mix, withAlpha } from '../material';
import { colorUnder, drawBox, DRAW_LOG, isHudCanvas, QUALITY, resolveColor, type Rect } from '../paint';
import { drawEndcap, endcapReach, endcapShapeOf } from '../ornament';
import { simNow } from '../sim';
import { anchorsOf, chosenKey, DATA, drawNumber, icon, iconChip, itemIcon, numberWidth, ornColor, pickedStr, scopedSet, SMALL_DIAL, T, W, type ElCtx } from './core';

/*
 * 数值图形（M12b-02 / 03，§2 的 gauges.ts）：core.ts 的 gauge() 拆出来的画法表——每种 cmp.gauge 一个函数，签名 (e, r, v, o: GaugeDrawOpts)，注册在 GAUGES；
 * gaugeDecor() 按 外框 → 画法（底槽 + 填充）→ 附属件 → 端头 的顺序画（M12b-03：cmp.gaugeFrame / gaugeColorBy / gaugeExtra / gaugeCap）。
 * 原有画法（bar / thinBar / segmented / icons / orb / ring / arc / dial / vertical / number / fraction / percent / stars）的调用序列与拆分前逐字一致；
 * 新画法：离散单位族（pips / diamondPips / heartsTyped / lightStrip / textBar / scaleBar / trigram，单位数 cmp.gaugeUnits、单位形 cmp.gaugeUnitShape、方向 cmp.gaugeDir），
 * 仪表族（tachometer 转速表、arcDots 环徽点亮、ecg 心电图、pressureTube 玻璃压力计），以及原来声明了却画成横条的 thermometer / eye / bipolar / track / lightUp（一排点亮的节点）。
 * Godot：离散族 = HBox / VBox of TextureRect 或一个自绘 Control；仪表族 = TextureProgressBar(radial) + 刻度纹理 + Label（m12bB5Notes 的「数值图形」行）
 */

type Ctx = CanvasRenderingContext2D;
/** 调用方给数值图形的额外数据（M12b-02 / 03）：球心图标、样本上限（离散族的单位数）、心的类型（heartsTyped）、可回复段、副读数（转速表下方的车速）、帽头字母、端徽数字、状态行 */
export interface GaugeExtra {
  icon?: string;
  max?: number;
  types?: string[];
  recover?: number;
  sub?: string;
  cap?: string;
  badge?: string;
  status?: [string, string, number?][];
  shield?: number;
}
/** 一种画法拿到的东西：color = 填充色（已按 cmp.gaugeColorBy 换过）、track = 空槽色、label = 环心 / 中心的字、e0 = 元素上下文（参数按元素查）、x = 额外数据 */
export interface GaugeDrawOpts { color: string; track: string; label?: string; e0: ElCtx; x: GaugeExtra }
export type GaugeFn = (e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts) => void;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 新参数按「选过才换」读（chosenKey：目标链 bar → 元素 → 全局；旧皮肤只认皮肤之后的层），没选 def */
const pickNum = (e: ElCtx, k: string, def: number) => { const key = chosenKey(e, k); const n = key ? e.r.num(key, def) : def; return Number.isFinite(n) ? n : def; };
/** 离散单位数（cmp.gaugeUnits，3–20）：选过用它；没选时样本上限（≤ 20 时，ITB 的 3 格血），再没有用这种画法的默认 */
function unitsOf(e: ElCtx, o: GaugeDrawOpts, def: number): number {
  const key = chosenKey(e, 'cmp.gaugeUnits');
  if (key) { const n = Math.round(e.r.num(key, def)); if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(30, n)); }
  const m = o.x.max;
  return m && m >= 2 && m <= 20 && Number.isInteger(m) ? m : def;
}
/** 矩形的长边方向：竖长（高 > 宽）= v，否则 h */
const aspectDir = (r: Rect) => (r.h > r.w ? 'v' : 'h');
/**
 * 单位格的排列方向（cmp.gaugeDir）：h 横排、v 竖排（从下往上）、arc 沿四分之一弧；没选时 def（灯段 / 小格 / 菱形点按矩形高宽自动）。
 * B5 审查修复 ⑨：选的方向放不进矩形（横长的条选 v、竖长的条选 h）时按矩形的长边排——原来照选的排，格子算出负的尺寸，浏览器里 roundRect / ellipse 抛错、整帧 HUD 中断
 */
function dirOf(e: ElCtx, r: Rect, def: string): string {
  const d = pickedStr(e, 'cmp.gaugeDir', def);
  if (d === def) return d;
  return (d === 'v' && r.w > r.h) || (d === 'h' && r.h > r.w) ? aspectDir(r) : d;
}
/** 选了单位参数（单位数 / 单位形 / 方向）：segmented 走单位格（M12b-02）；el.vitals 竖排时也据此保留 segmented（B5 审查修复 ④） */
export const unitParamsChosen = (e: ElCtx) => !!(chosenKey(e, 'cmp.gaugeUnits') || chosenKey(e, 'cmp.gaugeUnitShape') || chosenKey(e, 'cmp.gaugeDir'));
/** 单位格的位置：n 格沿方向排开（gap = 格间距），返回每格的矩形（第 0 格 = 先点亮的那一格）；格子至少 1 × 1（B5 审查修复 ⑨） */
function unitCells(r: Rect, n: number, dir: string, gap: number, square = false): Rect[] {
  const out: Rect[] = [];
  if (dir === 'arc') {
    // 沿四分之一弧（脊柱灯段）：圆心在矩形左下，从底部往右上排
    const R = Math.min(r.w, r.h) * 0.82, cx = r.x + r.w * 0.12, cy = r.y + r.h * 0.92, s = Math.max(2, Math.min((R * Math.PI) / 2 / n - gap, R * 0.3));
    for (let i = 0; i < n; i++) { const t = Math.PI / 2 - (i + 0.5) / n * (Math.PI / 2); out.push({ x: cx + Math.cos(t) * R - s / 2, y: cy - Math.sin(t) * R - s / 2, w: s, h: s }); }
    // 先亮的是底部（第 0 格在弧的下端）
    return out.reverse();
  }
  if (dir === 'v') {
    const ch = Math.max(1, (r.h - gap * (n - 1)) / n), s = square ? Math.min(r.w, ch) : r.w;
    for (let i = 0; i < n; i++) { const y = r.y + r.h - (i + 1) * ch - i * gap; out.push(square ? { x: r.x + (r.w - s) / 2, y: y + (ch - s) / 2, w: s, h: s } : { x: r.x, y, w: r.w, h: ch }); }
    return out;
  }
  const cw = Math.max(1, (r.w - gap * (n - 1)) / n), s = square ? Math.min(r.h, cw) : r.h;
  for (let i = 0; i < n; i++) { const x = r.x + i * (cw + gap); out.push(square ? { x: x + (cw - s) / 2, y: r.y + (r.h - s) / 2, w: s, h: s } : { x, y: r.y, w: cw, h: r.h }); }
  return out;
}
/**
 * 竖长矩形里按竖向画只会横排的画法（字符条 / 比例尺 / 节点轨道 / 双向条 / 点亮节点，B5 审查修复 ④）：把画布转 −90°，在宽高对调的矩形里照横向画——左 → 右 变成 下 → 上。
 * 横长矩形原样画（调用序列不变）
 */
function upright(fn: GaugeFn): GaugeFn {
  return (e, r, v, o) => {
    if (!(r.h > r.w * 1.5)) { fn(e, r, v, o); return; }
    const g = e.g;
    g.save(); g.translate(r.x, r.y + r.h); g.rotate(-Math.PI / 2);
    fn(e, { x: 0, y: 0, w: r.h, h: r.w }, v, o);
    g.restore();
  };
}
/** 心形路径（宽 s，中心 cx, cy） */
function heartPath(g: Ctx, cx: number, cy: number, s: number) {
  const w = s, h = s * 0.9, x = cx - w / 2, y = cy - h / 2;
  g.moveTo(cx, y + h * 0.3);
  g.bezierCurveTo(cx, y, x, y, x, y + h * 0.32);
  g.bezierCurveTo(x, y + h * 0.6, cx, y + h * 0.8, cx, y + h);
  g.bezierCurveTo(cx, y + h * 0.8, x + w, y + h * 0.6, x + w, y + h * 0.32);
  g.bezierCurveTo(x + w, y, cx, y, cx, y + h * 0.3);
  g.closePath();
}
/** 单位格的外形（cmp.gaugeUnitShape）：square 方、circle 圆、diamond 菱、heart 心、pip 圆角小格（brush 笔刷段另画：drawBox 的 brushStroke 外形） */
function unitPath(g: Ctx, shape: string, q: Rect) {
  // 半径都夹到 ≥ 0（B5 审查修复 ⑨：负半径在浏览器里抛 RangeError / IndexSizeError）
  const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
  if (shape === 'circle') g.ellipse(cx, cy, Math.max(0, q.w / 2), Math.max(0, q.h / 2), 0, 0, Math.PI * 2);
  else if (shape === 'diamond') { g.moveTo(cx, q.y); g.lineTo(q.x + q.w, cy); g.lineTo(cx, q.y + q.h); g.lineTo(q.x, cy); g.closePath(); }
  else if (shape === 'heart') heartPath(g, cx, cy, Math.max(0, Math.min(q.w, q.h / 0.9)));
  else if (shape === 'pip') g.roundRect(q.x, q.y, q.w, q.h, Math.max(0, Math.min(q.w, q.h) * 0.3));
  else g.rect(q.x, q.y, q.w, q.h);
}
/** 笔刷段（cmp.gaugeUnitShape = brush，ghost-of-tsushima#28）：每段一笔两端飞白的干笔刷（B3 的 brushStroke 外形，种子按段号） */
function brushUnit(e: ElCtx, q: Rect, color: string, i: number) {
  drawBox(e.g, { x: q.x - q.w * 0.06, y: q.y, w: q.w * 1.12, h: q.h }, { bg: { solid: color }, shape: 'brushStroke', seed: 31 + i * 7, brush: { dryness: 0.55, dir: 'ltr', tip: 0.2 } }, e.pal);
}
/** 一排单位格（pips / diamondPips / lightStrip / 选了单位参数的 segmented 共用）：lit 格数 = round(v × n) */
function unitRow(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts, n: number, dir: string, shape: string, style: 'outline' | 'hollow' | 'glow' | 'plain') {
  // 格间距按短边定、但不超过沿排列方向每格长的 45%（B5 审查修复 ⑨：原来横长的条选了 v 时按 191 的宽算间距，格子成了负的；沿弧排时间距大过格长，格子缩成 2 的小点）
  const along = dir === 'v' ? r.h : dir === 'arc' ? (Math.min(r.w, r.h) * 0.82 * Math.PI) / 2 : r.w, cross = dir === 'v' ? r.w : dir === 'arc' ? Math.min(r.w, r.h) : r.h;
  const g = e.g, k = e.k, gap = Math.min(Math.max(1.5, cross * (style === 'plain' ? 0.18 : 0.28)), (along / n) * 0.45), cells = unitCells(r, n, dir, gap, style !== 'plain'), lit = Math.round(clamp01(v) * n);
  cells.forEach((q, i) => {
    const on = i < lit;
    if (shape === 'brush') { brushUnit(e, q, on ? o.color : o.track, i); return; }
    g.save();
    g.beginPath(); unitPath(g, shape, q);
    if (style === 'glow') {
      // 自发光灯段：亮段带光晕 + 中心亮芯，熄灭段只留暗槽（无底板）
      if (on) { g.shadowColor = o.color; g.shadowBlur = Math.max(3, Math.min(q.w, q.h) * 0.9); g.fillStyle = o.color; g.fill(); g.shadowBlur = 0; g.fillStyle = withAlpha(mix(o.color, '#ffffff', 0.55), 0.7); g.beginPath(); unitPath(g, shape, { x: q.x + q.w * 0.25, y: q.y + q.h * 0.25, w: q.w * 0.5, h: q.h * 0.5 }); g.fill(); }
      else { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill(); g.strokeStyle = withAlpha(o.color, 0.28); g.lineWidth = Math.max(1, k); g.stroke(); }
    } else if (style === 'hollow') {
      // 菱形点阵：实心 = 已有、空心 = 上限
      if (on) { g.fillStyle = o.color; g.fill(); } else { g.strokeStyle = o.color; g.lineWidth = Math.max(1, 1.2 * k); g.stroke(); }
    } else {
      g.fillStyle = on ? o.color : o.track; g.fill();
      if (style === 'outline') { g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = Math.max(1, 1.5 * k); g.stroke(); }
    }
    g.restore();
  });
}
/** 心的类型色（heartsTyped）：red = 填充色、blue / soul 魂心、black 黑心、gold 金心、spirit 白心 */
const HEART_TYPES: Record<string, string> = { blue: '#5aa9ff', soul: '#5aa9ff', black: '#2b2730', gold: '#f2c14e', spirit: '#e8eef2' };

/** 原有的十三种画法（拆分前 core.ts gauge() 的 switch，逐字搬来）与新画法 */
export const GAUGES: Record<string, GaugeFn> = {
  segmented: (e, r, v, o) => {
    // 选了单位数 / 单位形 / 方向（M12b-02）时走单位格；没选时原来的 10 格（调用序列不变）
    if (chosenKey(e, 'cmp.gaugeUnits') || chosenKey(e, 'cmp.gaugeUnitShape') || chosenKey(e, 'cmp.gaugeDir')) {
      unitRow(e, r, v, o, unitsOf(e, o, 10), dirOf(e, r, aspectDir(r)), pickedStr(e, 'cmp.gaugeUnitShape', 'square'), 'plain');
      return;
    }
    const g = e.g, n = 10, gap = 2 * e.k, sw = (r.w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) { g.fillStyle = i < Math.round(v * n) ? o.color : o.track; g.fillRect(r.x + i * (sw + gap), r.y, sw, r.h); }
  },
  icons: (e, r, v, o) => {
    const n = 5, s = Math.min(r.h * 1.4, r.w / n);
    // 实心的心按皮肤描一道边（整合修复：B2 ⑮「横版心形用皮肤 token」）：面板描边色，没有描边的皮肤用字色 55%；填色 = 这根条的颜色（生命色），对底下盒子的 3 : 1 下限在 icon() 里
    const edge = QUALITY.on && isHudCanvas(e.g) ? { outline: { color: e.t.panel.border?.color ? resolveColor(e.t.panel.border.color, e.pal) : withAlpha(e.text, 0.55), width: 1 } } : undefined;
    for (let i = 0; i < n; i++) {
      const f = Math.max(0, Math.min(1, v * n - i));
      // 空心的格（§8，轨道 E）：品质下限开着时用字色 55% 画空心（原来是空槽色 18%，亮场景上空心看不见）
      icon(e, f > 0.5 ? '♥' : '♡', r.x + s * (i + 0.5), r.y + r.h / 2, s * 0.9, f > 0 ? o.color : QUALITY.on ? withAlpha(e.text, 0.55) : o.track, f > 0.5 ? edge : undefined);
    }
  },
  orb: (e, r, v, o) => round(e, r, v, o, 'orb'),
  ring: (e, r, v, o) => round(e, r, v, o, 'ring'),
  arc: (e, r, v, o) => round(e, r, v, o, 'arc'),
  dial: (e, r, v, o) => round(e, r, v, o, 'dial'),
  vertical: (e, r, v, o) => {
    const g = e.g;
    g.fillStyle = o.track; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = o.color; g.fillRect(r.x, r.y + r.h * (1 - v), r.w, r.h * v);
  },
  number: (e, r, v, o) => numberKind(e, r, v, o, 'number'),
  fraction: (e, r, v, o) => numberKind(e, r, v, o, 'fraction'),
  percent: (e, r, v, o) => numberKind(e, r, v, o, 'percent'),
  stars: (e, r, v, o) => {
    const n = 5, s = Math.min(r.h * 1.2, r.w / n);
    for (let i = 0; i < n; i++) icon(e, i < Math.round(v * n) ? '★' : '☆', r.x + s * (i + 0.5), r.y + r.h / 2, s * 0.9, i < Math.round(v * n) ? o.color : QUALITY.on ? withAlpha(e.text, 0.55) : o.track);
  },
  thinBar: (e, r, v, o) => {
    const g = e.g;
    // 品质下限（审查修复 E 视觉 ③：原来条高 = 行高 × 0.35、空槽 18% 字色、没有外框，亮场景上像一根发丝）：条高至少 5 设计单位（1080p 10px，盒子本身更矮时按盒子），
    // 没有不透明底时空槽是 45% 的深色、外面一圈 1 设备像素的暗描边（艾尔登式的细条也有暗框）
    const floor = QUALITY.on && isHudCanvas(g);
    const h = floor ? Math.min(r.h, Math.max(5, r.h * 0.35)) : Math.max(2, r.h * 0.35), y = r.y + (r.h - h) / 2;
    const bare = floor && DRAW_LOG.on && colorUnder(g, r.x + r.w / 2, y + h / 2) === null;
    g.fillStyle = bare ? 'rgba(10,12,16,0.45)' : o.track; g.fillRect(r.x, y, r.w, h); g.fillStyle = o.color; g.fillRect(r.x, y, r.w * v, h);
    if (bare) { const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1; g.save(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1 / k; g.strokeRect(r.x - 0.5 / k, y - 0.5 / k, r.w + 1 / k, h + 1 / k); g.restore(); }
  },
  bar: (e, r, v, o) => {
    // bar：皮肤血条（底槽 + 填充）；条高 < 6 时底槽自动去描边（M12a-11：col.trackStroke = auto 时；细条上的描边会占掉大半条，像素皮肤的敌人小条读成两截）
    const g = e.g, tb = e.t.bar;
    const thin = r.h < 6 && (tb.trackStroke ?? 'auto') === 'auto' && (!!tb.track.border || !!tb.track.sides);
    drawBox(g, r, thin ? { ...tb.track, border: undefined, sides: undefined } : tb.track, e.pal);
    g.save();
    g.beginPath(); g.rect(r.x, r.y, r.w * v, r.h); g.clip();
    drawBox(g, r, { ...tb.fill, bg: { solid: o.color } }, e.pal);
    g.restore();
  },

  /* ---- M12b-02 离散单位族 ---- */
  // 独立描边小格（ITB 的单位血格）
  pips: (e, r, v, o) => unitRow(e, r, v, o, unitsOf(e, o, 8), dirOf(e, r, r.h > r.w * 1.5 ? 'v' : 'h'), pickedStr(e, 'cmp.gaugeUnitShape', 'square'), 'outline'),
  // 菱形点阵（Disco：实心 = 已学、空心 = 上限）
  diamondPips: (e, r, v, o) => unitRow(e, r, v, o, unitsOf(e, o, 6), dirOf(e, r, r.h > r.w * 1.5 ? 'v' : 'h'), pickedStr(e, 'cmp.gaugeUnitShape', 'diamond'), 'hollow'),
  // 自发光灯段（Dead Space 的脊柱灯）：熄灭段只留暗槽，方向按矩形高宽（竖长 = 竖排）
  lightStrip: (e, r, v, o) => unitRow(e, r, v, o, unitsOf(e, o, 10), dirOf(e, r, aspectDir(r)), pickedStr(e, 'cmp.gaugeUnitShape', 'pip'), 'glow'),
  // 类型心（Cult：红心 / 蓝魂心 / 黑心，可半颗；颗数 = 单位数 / 样本类型数）
  heartsTyped: (e, r, v, o) => {
    const g = e.g, types = o.x.types?.length ? o.x.types : null, n = chosenKey(e, 'cmp.gaugeUnits') ? unitsOf(e, o, 5) : types?.length ?? 5;
    const s = Math.min(r.h * 1.4, r.w / n), cy = r.y + r.h / 2, lw = Math.max(1, s * 0.07);
    // 没写类型时演示三种：红心在前、倒数第二颗魂心、最后一颗黑心
    const typeOf = (i: number) => types?.[i % types.length] ?? (n >= 4 && i === n - 1 ? 'black' : n >= 3 && i === n - 2 ? 'blue' : 'red');
    for (let i = 0; i < n; i++) {
      const cx = r.x + s * (i + 0.5), f0 = clamp01(v * n - i), f = f0 >= 0.75 ? 1 : f0 >= 0.25 ? 0.5 : 0, c = HEART_TYPES[typeOf(i)] ?? o.color;
      g.save();
      g.beginPath(); heartPath(g, cx, cy, s * 0.86);
      g.fillStyle = o.track; g.fill();
      if (f > 0) { g.save(); g.clip(); g.fillStyle = c; g.fillRect(cx - s / 2, cy - s / 2, f === 1 ? s : s / 2, s); g.restore(); }
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
      g.restore();
    }
  },
  // 等宽字符条 ████░░（矢量画：亮格实心块、暗格三点网纹，不用字体里的方块字）
  // 竖长矩形里从下往上（upright，B5 审查修复 ④）
  textBar: upright((e, r, v, o) => {
    const g = e.g, n = unitsOf(e, o, 10), cw = r.w / n, lit = Math.round(clamp01(v) * n);
    for (let i = 0; i < n; i++) {
      const x = r.x + i * cw;
      if (i < lit) { g.fillStyle = o.color; g.fillRect(x + cw * 0.06, r.y, cw * 0.88, r.h); continue; }
      g.fillStyle = withAlpha(o.color, 0.32);
      const d = Math.max(1, Math.min(cw, r.h) * 0.16);
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) g.fillRect(x + cw * (0.25 + xx * 0.4) - d / 2, r.y + r.h * (0.2 + yy * 0.3) - d / 2, d, d);
    }
  }),
  // 黑白交替的比例尺段（地图比例尺式）：填充部分逐段换色，下方刻度
  scaleBar: upright((e, r, v, o) => {
    const g = e.g, n = unitsOf(e, o, 8), sw = r.w / n, fillW = r.w * clamp01(v), light = mix(o.color, '#ffffff', 0.75);
    g.fillStyle = o.track; g.fillRect(r.x, r.y, r.w, r.h);
    for (let i = 0; i < n; i++) { const x = r.x + i * sw, w = Math.min(sw, Math.max(0, fillW - i * sw)); if (w <= 0) break; g.fillStyle = i % 2 ? light : o.color; g.fillRect(x, r.y, w, r.h); }
    g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = Math.max(1, e.k); g.strokeRect(r.x, r.y, r.w, r.h);
    if (r.h >= 6) { g.beginPath(); for (let i = 0; i <= n; i++) { const x = r.x + i * sw; g.moveTo(x, r.y + r.h); g.lineTo(x, r.y + r.h + Math.max(2, r.h * 0.35)); } g.stroke(); }
  }),
  // 卦象（6 爻，阳爻数 = round(v × 6)，从下往上）：竖长矩形叠成一卦；横长矩形（B5 审查修复 ⑳：原来排成一行短划，读成虚线）画成并排的两个三爻卦
  // （左 = 下卦第 1–3 爻、右 = 上卦第 4–6 爻），卦高约两倍条高、竖直居中在条上，左对齐。阴爻 = 75% 不透明，乘在外层透明度上（审查修复 ⑯）
  trigram: (e, r, v, o) => {
    const g = e.g, yang = Math.round(clamp01(v) * 6), tall = r.h >= r.w * 0.6, a0 = g.globalAlpha;
    g.save();
    g.fillStyle = o.color;
    const yao = (x: number, y: number, w: number, h: number, isYang: boolean) => {
      g.globalAlpha = a0 * (isYang ? 1 : 0.75);
      if (isYang) g.fillRect(x, y, w, h); else { g.fillRect(x, y, w * 0.42, h); g.fillRect(x + w * 0.58, y, w * 0.42, h); }
    };
    if (tall) { const lh = r.h / 11; for (let i = 0; i < 6; i++) yao(r.x, r.y + r.h - (i * 2 + 1) * lh, r.w, lh, i < yang); }
    else {
      const H = Math.max(6 * e.k, Math.min(r.h * 2, r.w * 0.4)), W0 = H * 1.15, lh = H / 5, cy = r.y + r.h / 2;
      for (let t = 0; t < 2; t++) for (let j = 0; j < 3; j++) { const i = t * 3 + j; yao(r.x + t * (W0 + H * 0.35), cy + H / 2 - (j * 2 + 1) * lh, W0, lh, i < yang); }
    }
    g.restore();
  },

  /* ---- M12b-02 仪表族 ---- */
  // 转速表（FH5）：细刻度 + 刻度数字 + 红区 + 指针 + 中心大字（挡位 / 读数）+ 下方副读数（车速）；子件 cmp.dialParts，线宽读 vis.strokeWidth@元素（选过时）
  tachometer: (e, r, v, o) => {
    const g = e.g, rad = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2, a0 = Math.PI * 0.75, span = Math.PI * 1.5;
    const key = chosenKey(e, 'cmp.dialParts'), parts = key ? e.r.list(key).filter((x) => x && x !== 'auto') : ['ticks', 'numbers', 'redline', 'needle', 'centerValue', 'subValue'];
    const lw = strokeW(e, Math.max(1.2, rad * 0.035)), danger = e.th.roles.danger ?? e.bad, red0 = 0.85;
    g.save();
    g.lineCap = 'butt';
    g.strokeStyle = o.track; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, rad * 0.95, a0, a0 + span); g.stroke();
    if (parts.includes('redline')) { g.strokeStyle = danger; g.lineWidth = Math.max(lw * 2, rad * 0.06); g.beginPath(); g.arc(cx, cy, rad * 0.93, a0 + span * red0, a0 + span); g.stroke(); }
    if (parts.includes('ticks')) {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, a = a0 + span * t, major = i % 5 === 0, r1 = rad * 0.9, r2 = rad * (major ? 0.78 : 0.84);
        g.strokeStyle = t >= red0 ? danger : withAlpha(e.text, major ? 0.95 : 0.6); g.lineWidth = major ? lw * 1.4 : lw * 0.8;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
      }
    }
    if (parts.includes('numbers')) {
      const no = { ...e.small, size: Math.max(7, rad * 0.13), weight: 700 };
      for (let i = 0; i <= 8; i++) { const a = a0 + span * (i / 8), s = String(i), tx = cx + Math.cos(a) * rad * 0.64, ty = cy + Math.sin(a) * rad * 0.64; drawNumber(e, s, tx - numberWidth(e, s, no) / 2, ty - no.size * 0.75, no.size * 1.5, { ...no, color: i / 8 >= red0 ? danger : e.text }); }
    }
    if (parts.includes('needle')) {
      const a = a0 + span * clamp01(v);
      g.strokeStyle = o.color; g.lineWidth = Math.max(2, lw * 1.6); g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - Math.cos(a) * rad * 0.12, cy - Math.sin(a) * rad * 0.12); g.lineTo(cx + Math.cos(a) * rad * 0.86, cy + Math.sin(a) * rad * 0.86); g.stroke();
      g.fillStyle = o.color; g.beginPath(); g.arc(cx, cy, Math.max(2, rad * 0.06), 0, Math.PI * 2); g.fill();
    }
    g.restore();
    if (o.label && parts.includes('centerValue')) { const lo = { ...e.title, size: rad * 0.42 }; drawNumber(e, o.label, cx - numberWidth(e, o.label, lo) / 2, cy - lo.size * 0.75, lo.size * 1.5, lo); }
    if (o.x.sub && parts.includes('subValue')) { const so = { ...e.small, size: Math.max(7, rad * 0.16), weight: 700 }; drawNumber(e, o.x.sub, cx - numberWidth(e, o.x.sub, so) / 2, cy + rad * 0.4, so.size * 1.4, so); }
  },
  // 环徽点亮（黑神话的棍势）：墨环 + 中心插画槽（图标 / 剪影）+ 沿右侧弧排的 N 颗发光点（N = cmp.gaugeUnits，默认 4）
  arcDots: (e, r, v, o) => arcDots(e, r, v, o),
  // 点亮节点（lightUp，B5 审查修复 ⑪：恢复原来的「完成的节点点亮」——一排节点、亮的带光晕，单位数 cmp.gaugeUnits；竖长矩形从下往上）；环徽是 arcDots
  lightUp: upright((e, r, v, o) => litNodes(e, r, v, o)),
  // 心电图（生存恐怖：Fine / Caution / Danger）：按阈值换波形与字色，心跳越危险越密
  ecg: (e, r, v, o) => {
    const g = e.g, st = v > 0.6 ? 0 : v > 0.3 ? 1 : 2, c = [e.good, e.warn, e.bad][st], word = ['FINE', 'CAUTION', 'DANGER'][st];
    const text = r.w >= 90 * e.k && r.h >= 8, ww = text ? r.w * 0.62 : r.w, mid = r.y + r.h / 2, amp = r.h * 0.46, beats = 2 + st;
    g.save();
    g.strokeStyle = c; g.lineWidth = Math.max(1, Math.min(2.2 * e.k, r.h * 0.12)); g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = c; g.shadowBlur = 4 * e.k;
    g.beginPath(); g.moveTo(r.x, mid);
    const bw = ww / beats;
    for (let b = 0; b < beats; b++) {
      const x0 = r.x + b * bw, P = [[0.18, 0], [0.26, -0.15], [0.34, 0], [0.42, 0], [0.47, 0.25], [0.53, -1], [0.59, 0.45], [0.64, 0], [0.76, -0.22], [0.88, 0], [1, 0]];
      for (const [t, y] of P) g.lineTo(x0 + t * bw, mid + y * amp);
    }
    g.stroke();
    g.restore();
    if (text) { const to = { ...e.small, size: Math.min(r.h * 1.1, 14 * e.k), weight: 800, color: c }; T(e, word, r.x + ww + 4 * e.k, mid - to.size * 0.7, to.size * 1.4, to); }
  },
  // 玻璃压力计（蒸汽朋克）：玻璃管 + 液面 + 刻度 + 两端黄铜箍；竖长矩形从下往上、横长从左往右
  pressureTube: (e, r, v, o) => tube(e, r, v, o, false),
  // 温度计（Frostpunk / 生存）：底部球泡 + 细管 + 刻度
  thermometer: (e, r, v, o) => tube(e, r, v, o, true),
  // 眼睛 / 发现度（潜行）：杏仁形眼眶，警觉从下往上灌满，中间瞳孔
  eye: (e, r, v, o) => {
    const g = e.g, h = Math.min(r.h, r.w * 0.55), cx = r.x + r.w / 2, cy = r.y + r.h / 2, w = Math.min(r.w, h * 2.2);
    const path = () => { g.beginPath(); g.moveTo(cx - w / 2, cy); g.quadraticCurveTo(cx, cy - h, cx + w / 2, cy); g.quadraticCurveTo(cx, cy + h, cx - w / 2, cy); g.closePath(); };
    g.save();
    path(); g.fillStyle = o.track; g.fill(); g.save(); g.clip();
    g.fillStyle = o.color; g.fillRect(cx - w / 2, cy + h / 2 - h * clamp01(v), w, h * clamp01(v));
    g.restore();
    g.fillStyle = 'rgba(0,0,0,0.85)'; g.beginPath(); g.arc(cx, cy, h * 0.2, 0, Math.PI * 2); g.fill();
    path(); g.strokeStyle = e.text; g.lineWidth = Math.max(1, 1.5 * e.k); g.stroke();
    g.restore();
  },
  // 双向对立条（希望 / 不满、拔河）：0.5 = 中线，往右填好色、往左填第二强调色
  bipolar: upright((e, r, v, o) => {
    const g = e.g, mid = r.x + r.w / 2, p = r.x + r.w * clamp01(v);
    g.fillStyle = o.track; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = v >= 0.5 ? o.color : e.accent2; g.fillRect(Math.min(mid, p), r.y, Math.abs(p - mid), r.h);
    g.fillStyle = e.text; g.fillRect(mid - Math.max(1, e.k), r.y - Math.max(1, r.h * 0.25), Math.max(2, 2 * e.k), r.h + Math.max(2, r.h * 0.5));
  }),
  // 节点轨道 + 里程碑：一条轨道上 N 个节点（单位数，默认 5），走过的点亮，最后一个是菱形里程碑
  track: upright((e, r, v, o) => {
    const g = e.g, n = unitsOf(e, o, 5), cy = r.y + r.h / 2, rr = Math.max(3, r.h * 0.45), x0 = r.x + rr, x1 = r.x + r.w - rr, lh = Math.max(2, r.h * 0.22);
    g.fillStyle = o.track; g.fillRect(x0, cy - lh / 2, x1 - x0, lh);
    g.fillStyle = o.color; g.fillRect(x0, cy - lh / 2, (x1 - x0) * clamp01(v), lh);
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1, x = x0 + (x1 - x0) * t, on = t <= v + 1e-6, last = i === n - 1, s = last ? rr * 1.35 : rr;
      g.beginPath();
      if (last) { g.moveTo(x, cy - s); g.lineTo(x + s, cy); g.lineTo(x, cy + s); g.lineTo(x - s, cy); g.closePath(); } else g.arc(x, cy, s, 0, Math.PI * 2);
      g.fillStyle = on ? o.color : o.track; g.fill(); g.strokeStyle = withAlpha(e.text, 0.85); g.lineWidth = Math.max(1, e.k); g.stroke();
    }
  }),
};
/** 原来的圆形画法（orb / ring / arc / dial）：弧线宽改读 vis.strokeWidth@元素（M12b-02：按目标写了才换，没写时原来的半径 22%）；环心的字（数值标注）经 drawNumber */
function round(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts, kind: string) {
  const g = e.g, rad = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2, color = o.color, track = o.track;
  if (kind === 'orb') {
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fillStyle = withAlpha('#000', 0.45); g.fill(); g.clip();
    g.fillStyle = color; g.fillRect(cx - rad, cy + rad - rad * 2 * v, rad * 2, rad * 2 * v);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(cx - rad * 0.3, cy - rad * 0.45, rad * 0.35, rad * 0.18, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = withAlpha(e.text, 0.6); g.lineWidth = 2 * e.k; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke();
  } else {
    const a0 = kind === 'ring' ? -Math.PI / 2 : Math.PI * 0.75, span = kind === 'ring' ? Math.PI * 2 : Math.PI * 1.5;
    // 弧线的圆头 / 线宽包在 save / restore 里（中期审查修复 ㊱：lineCap = round 原来漏到后面的描边上）
    g.save();
    g.lineCap = 'round'; g.lineWidth = strokeW(e, Math.max(3, rad * 0.22));
    // 线宽按目标加粗到超过半径时半径夹到 ≥ 0（B5 审查修复 ⑨：负半径在浏览器里抛 IndexSizeError）
    const ar = Math.max(0, rad - g.lineWidth / 2);
    g.strokeStyle = track; g.beginPath(); g.arc(cx, cy, ar, a0, a0 + span); g.stroke();
    g.strokeStyle = color; g.beginPath(); g.arc(cx, cy, ar, a0, a0 + span * v); g.stroke();
    if (kind === 'dial') {
      const a = a0 + span * v;
      g.strokeStyle = e.text; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rad * 0.7, cy + Math.sin(a) * rad * 0.7); g.stroke();
    }
    g.restore();
  }
  // 球心图标（cmp.gaugeIcon = icon，dont-starve#5）：调用方给的行图标（图集按名查，查不到画符号），压在液面上
  if (o.x.icon && pickedStr(e, 'cmp.gaugeIcon', 'none') === 'icon' && !o.label) { if (!itemIcon(e, o.x.icon, cx, cy, rad * 0.9)) icon(e, o.x.icon, cx, cy, rad * 0.8, '#fff'); }
  if (o.label) { const w = numberWidth(e, o.label, e.title); drawNumber(e, o.label, cx - w / 2, cy - e.title.size * 0.75, e.title.size * 1.5, e.title); }
}
/** 弧 / 环 / 仪表的线宽：vis.strokeWidth 按目标写了（@bar / @元素，scopedSet）时用它（设计单位 × 元素缩放），否则 def */
function strokeW(e: ElCtx, def: number): number {
  if (!scopedSet(e, 'vis.strokeWidth')) return def;
  const n = e.v.num('vis.strokeWidth', 0);
  return n > 0 ? Math.max(1, n * e.k) : def;
}
/**
 * 数字类画法（number / fraction / percent）：数字经 drawNumber（M12b-07）。上限照拆分前用 DATA.hpMax（B5 审查修复 ③：拆文件时改成了行的上限，
 * 第 2 行起的数字跟着变了；与 valueText 用行上限的不一致是 M12a 以来就有的，留给专门的修复，见进度记录）
 */
function numberKind(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts, kind: string) {
  const max = DATA.hpMax;
  const s = kind === 'percent' ? `${Math.round(v * 100)}%` : kind === 'fraction' ? `${Math.round(v * max)} / ${max}` : String(Math.round(v * max));
  drawNumber(e, s, r.x, r.y, r.h, { ...e.title, color: o.color, size: r.h * 0.8 });
}
/** 环徽点亮（arcDots）：墨环 + 中心插画（行图标或程序剪影）+ 沿弧发光点 */
function arcDots(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts) {
  const g = e.g, rad = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2 - rad * 0.12, cy = r.y + r.h / 2, dr = rad * 0.7, n = unitsOf(e, o, 4), lit = Math.round(clamp01(v) * n);
  g.save();
  // 墨环：深色实心盘 + 两道错开的粗墨圈（毛边感）
  g.fillStyle = 'rgba(10,10,12,0.78)'; g.beginPath(); g.arc(cx, cy, dr, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(20,18,16,0.9)'; g.lineWidth = Math.max(2, rad * 0.1); g.beginPath(); g.arc(cx, cy, dr * 0.98, -0.3, Math.PI * 1.7); g.stroke();
  g.strokeStyle = withAlpha(e.text, 0.35); g.lineWidth = Math.max(1, rad * 0.025); g.beginPath(); g.arc(cx + rad * 0.02, cy - rad * 0.01, dr * 0.9, 0.4, Math.PI * 1.9); g.stroke();
  g.restore();
  // 中心插画槽：行图标（图集 / 符号）；没有时一个持棍的人物剪影
  if (o.x.icon && (itemIcon(e, o.x.icon, cx, cy, dr * 1.1) || (icon(e, o.x.icon, cx, cy, dr * 0.9, e.text), true))) { /* 画了图标 */ }
  else {
    g.save(); g.fillStyle = mix(e.text, '#ffffff', 0.4); g.strokeStyle = g.fillStyle; g.lineCap = 'round';
    const u = dr * 0.12;
    g.beginPath(); g.arc(cx - u * 0.4, cy - u * 3.2, u * 1.05, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - u * 1.6, cy - u * 1.8); g.lineTo(cx + u * 1.2, cy - u * 1.8); g.lineTo(cx + u * 1.9, cy + u * 1.6); g.lineTo(cx - u * 2.2, cy + u * 1.6); g.closePath(); g.fill();
    g.lineWidth = u * 0.7; g.beginPath(); g.moveTo(cx - u * 4.2, cy + u * 3.6); g.lineTo(cx + u * 4.2, cy - u * 3.8); g.stroke();
    g.lineWidth = u * 0.9; g.beginPath(); g.moveTo(cx - u * 1.2, cy + u * 1.6); g.lineTo(cx - u * 2, cy + u * 4.4); g.moveTo(cx + u * 1.2, cy + u * 1.6); g.lineTo(cx + u * 2.2, cy + u * 4.4); g.stroke();
    g.restore();
  }
  // 沿右侧弧的发光点（-55° ~ +55°，从下往上点亮）
  const pr = Math.max(2, rad * 0.085);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5, a = (55 - t * 110) * (Math.PI / 180), px = cx + Math.cos(a) * rad * 0.98, py = cy + Math.sin(a) * rad * 0.98, on = i < lit;
    g.save();
    g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2);
    if (on) { g.shadowColor = o.color; g.shadowBlur = pr * 2.5; g.fillStyle = o.color; g.fill(); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(px, py, pr * 0.45, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill(); g.strokeStyle = withAlpha(o.color, 0.45); g.lineWidth = Math.max(1, e.k); g.stroke(); }
    g.restore();
  }
  if (o.label) { const lo = { ...e.title, size: rad * 0.32 }; drawNumber(e, o.label, cx - numberWidth(e, o.label, lo) / 2, cy + dr * 0.55, lo.size * 1.4, lo); }
}
/**
 * 点亮节点（lightUp，B5 审查修复 ⑪）：一条细轨上 N 个圆节点（N = cmp.gaugeUnits，没给时样本上限 ≤ 20 的整数，再没有 5），前 round(v × N) 个点亮——
 * 亮的 = 填充色 + 光晕 + 亮芯，暗的 = 暗槽 + 淡边。条的矩形里横排（Hades 镜子的升级点、Dead Space 的脊柱灯行）；竖长矩形经 upright 从下往上
 */
function litNodes(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts) {
  const g = e.g, n = unitsOf(e, o, 5), lit = Math.round(clamp01(v) * n), cy = r.y + r.h / 2;
  const rr = Math.max(1.5, Math.min(r.h * 0.5, (r.w / n) * 0.32)), x0 = r.x + rr, x1 = r.x + r.w - rr, step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  g.save();
  g.fillStyle = o.track; g.fillRect(x0, cy - Math.max(0.5, r.h * 0.09), Math.max(0, x1 - x0), Math.max(1, r.h * 0.18));
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? x0 + i * step : r.x + r.w / 2, on = i < lit;
    g.beginPath(); g.arc(x, cy, rr, 0, Math.PI * 2);
    if (on) { g.shadowColor = o.color; g.shadowBlur = rr * 1.6; g.fillStyle = o.color; g.fill(); g.shadowBlur = 0; g.fillStyle = withAlpha(mix(o.color, '#ffffff', 0.6), 0.85); g.beginPath(); g.arc(x, cy, rr * 0.42, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(); g.strokeStyle = withAlpha(o.color, 0.4); g.lineWidth = Math.max(1, e.k * 0.8); g.stroke(); }
  }
  g.restore();
}
/** 玻璃管（压力计 / 温度计）：bulb = 温度计的底部球泡 */
function tube(e: ElCtx, r: Rect, v: number, o: GaugeDrawOpts, bulb: boolean) {
  const g = e.g, vert = r.h >= r.w, T0 = vert ? r.w : r.h, th = bulb ? T0 * 0.5 : T0 * 0.8, br = bulb ? T0 * 0.5 : 0;
  // 管身矩形（温度计的球泡在下端 / 左端）
  const q: Rect = vert ? { x: r.x + (r.w - th) / 2, y: r.y, w: th, h: r.h - br * 1.6 } : { x: r.x + br * 1.6, y: r.y + (r.h - th) / 2, w: r.w - br * 1.6, h: th };
  const f = clamp01(v);
  g.save();
  g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, th / 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  g.save(); g.clip();
  g.fillStyle = o.color;
  if (vert) g.fillRect(q.x, q.y + q.h * (1 - f), q.w, q.h * f + th); else g.fillRect(q.x - th, q.y, q.w * f + th, q.h);
  // 液面亮线 + 玻璃高光
  g.fillStyle = 'rgba(255,255,255,0.45)';
  if (vert) g.fillRect(q.x, q.y + q.h * (1 - f), q.w, Math.max(1, e.k)); else g.fillRect(q.x + q.w * f - Math.max(1, e.k), q.y, Math.max(1, e.k), q.h);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  if (vert) g.fillRect(q.x + q.w * 0.18, q.y + th * 0.4, q.w * 0.16, q.h - th * 0.8); else g.fillRect(q.x + th * 0.4, q.y + q.h * 0.18, q.w - th * 0.8, q.h * 0.16);
  g.restore();
  g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, th / 2); g.strokeStyle = withAlpha(e.text, 0.7); g.lineWidth = Math.max(1, e.k); g.stroke();
  if (bulb) { const bx = vert ? r.x + r.w / 2 : r.x + br, by = vert ? r.y + r.h - br : r.y + r.h / 2; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fillStyle = o.color; g.fill(); g.strokeStyle = withAlpha(e.text, 0.7); g.stroke(); }
  else {
    // 黄铜箍（两端）
    g.fillStyle = '#b08d57'; g.strokeStyle = '#5a4424'; g.lineWidth = Math.max(1, e.k * 0.8);
    const cap = Math.max(2, th * 0.35);
    if (vert) for (const y of [q.y - cap * 0.4, q.y + q.h - cap * 0.6]) { g.fillRect(q.x - th * 0.15, y, q.w + th * 0.3, cap); g.strokeRect(q.x - th * 0.15, y, q.w + th * 0.3, cap); }
    else for (const x of [q.x - cap * 0.4, q.x + q.w - cap * 0.6]) { g.fillRect(x, q.y - th * 0.15, cap, q.h + th * 0.3); g.strokeRect(x, q.y - th * 0.15, cap, q.h + th * 0.3); }
  }
  // 刻度（5 道，管身一侧）
  g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = Math.max(1, e.k * 0.8); g.beginPath();
  for (let i = 1; i <= 5; i++) { const t = i / 6; if (vert) { const y = q.y + q.h * t, x = q.x + q.w + 1.5 * e.k; g.moveTo(x, y); g.lineTo(x + (i % 2 ? 2 : 4) * e.k, y); } else { const x = q.x + q.w * t, y = q.y + q.h + 1.5 * e.k; g.moveTo(x, y); g.lineTo(x, y + (i % 2 ? 2 : 4) * e.k); } }
  g.stroke();
  g.restore();
}

/** 拆分前就有画法的取值（M12a 及以前） */
const ORIGINAL_KINDS = new Set(['bar', 'thinBar', 'segmented', 'icons', 'orb', 'ring', 'arc', 'dial', 'vertical', 'number', 'fraction', 'percent', 'stars', 'none']);
/** 能加两端饰件的横条画法（barEnds / cmp.gaugeCap）：不是数字 / 星 / 图标 / 竖条 / 圆形 / 仪表 */
const NOT_BAR = new Set(['icons', 'number', 'fraction', 'percent', 'stars', 'vertical', 'heartsTyped', 'tachometer', 'arcDots', 'ecg', 'eye', 'thermometer', 'pressureTube', 'trigram']);
export const BAR_LIKE = { has: (k: string, round: (k: string) => boolean) => !round(k) && !NOT_BAR.has(k) };

/**
 * 数值图形的总入口（§2 的 gaugeDecor，core.ts 的 gauge() 调它）：外框 → 画法（底槽 + 填充）→ 附属件 → 端头。e0 = 元素上下文，底槽 / 填充 token 与空槽色取 @bar 部件。
 * 什么新参数都没选时 = 拆分前的 gauge()：画法本身 + B4 的条两端饰件（ast.ornamentAnchor = barEnds）
 */
/**
 * 这一处实际按哪种画法画（gaugeDecor 与 el.vitals 的竖排共用）：旧皮肤冻结（M12a §0）——拆分前没有画法的取值（新画法与原来画成横条的 thermometer / eye / bipolar / track / lightUp）
 * 只在皮肤之后的层选了 cmp.gauge 才按形画，皮肤之前的预设（品类布局写的 cmp.gauge@el.meter = thermometer）在旧皮肤上照旧画横条；
 * 转速表 / 环徽放进比 DIAL_MIN 小的位置时退回横条（B5 审查修复 ⑫）
 */
export function drawnKind(e0: ElCtx, kind0: string, r?: Rect): string {
  if (e0.th.legacy && !ORIGINAL_KINDS.has(kind0) && !chosenKey(e0, 'cmp.gauge')) return 'bar';
  return r && SMALL_DIAL(kind0, r, e0.k) ? 'bar' : kind0;
}
export function gaugeDecor(e0: ElCtx, r0: Rect, v0: number, kind0: string, color0: string, label: string | undefined, x: GaugeExtra, round: (k: string) => boolean) {
  const kind = drawnKind(e0, kind0, r0);
  let e = e0.part('bar');
  const g = e.g;
  // 空槽（M12a-11）：col.track 给了就用它（按目标重算，@bar / @元素），否则原来的正文色 18%
  let track = e.t.bar.trackColor ? resolveColor(e.t.bar.trackColor, e.pal) : withAlpha(e.text, 0.18);
  // 底槽（docs/workbench-redesign.md §8 RC3 / RC6，轨道 E）：横条类数值图形没有外框、底下又没有不透明的面板时，先垫一条深色底槽（四周外扩），
  // 填充色对底槽 ≥ 3:1、亮场景上也看得出条在哪；Boss 条的底槽更实、外面一道细边，空槽换成底槽上的暗色（不再是白条）
  const boss = e0.id === 'el.threat' && e0.forms[0] === 'bossBar';
  // 「底下有没有不透明的面板」要看绘制记录：只在记录开着（HudSystem 画的时候）判断，记录关着（单元测试、离屏小图）时不垫
  if (QUALITY.on && DRAW_LOG.on && BAR_LIKE.has(kind, round) && r0.w > r0.h * 2 && !TROUGHLESS.has(kind) && pickedStr(e, 'cmp.gaugeFrame', 'none') === 'none' && colorUnder(g, r0.x + r0.w / 2, r0.y + r0.h / 2) === null) {
    trough(e0, e, r0, boss);
    if (boss) {
      track = 'rgba(255,255,255,0.1)';
      const tb = e.t.bar;
      e = Object.assign(Object.create(e) as ElCtx, { t: { ...e.t, bar: { ...tb, track: { ...tb.track, bg: { solid: 'rgba(28,28,34,0.95)' }, border: undefined, sides: undefined } } } });
    }
  }
  const v = Math.max(0, Math.min(1, v0));
  const barLike = BAR_LIKE.has(kind, round) && r0.w > r0.h * 2;
  const color = valueColor(e, v, color0);
  // 端头（cmp.gaugeCap，M12b-03）：选了时横条两端各一个，条按端头伸出量往里收（端头画在原来的矩形里）。
  // 左端被附属件占着（端徽 / 盾徽 / 横条帽头）时左端不画端头、也不往里收（B5 审查修复 ⑭：原来端头最后画、压在端徽上；black-myth#12 的祥云只要右端收尾）
  const leftX = barLike && leftExtra(e, x), cap = barLike ? capOf(e0, e, r0) : null;
  const L = cap && !leftX ? cap.L : 0, R = cap ? cap.L : 0;
  const r = cap ? { ...r0, x: r0.x + L, w: Math.max(4, r0.w - L - R) } : r0;
  gaugeFrame(e, r, kind, round);
  (GAUGES[kind] ?? GAUGES.bar)(e, r, v, { color, track, label, e0, x });
  if (cap) { if (!leftX) drawEndcap(g, r.x, r.y + r.h / 2, cap.h, -1, cap.shape, cap.color); drawEndcap(g, r.x + r.w, r.y + r.h / 2, cap.h, 1, cap.shape, cap.color); }
  // 条的两端饰件（ast.ornamentAnchor = barEnds，M12b-49）：横条（bar / thinBar / segmented……）两端各一个端头（形 = ast.endcapShape，auto 按母题、默认尖角），色 = 饰色；
  // 挂点按元素查。选了 cmp.gaugeCap 时上面已经画过（不画两遍）；左端被附属件占着时同样只画右端
  else if (barLike && anchorsOf(e0).includes('barEnds')) {
    const sh = endcapShapeOf(pickedStr(e0, 'ast.endcapShape', 'auto'), e0.t.panel.ornament?.motif ?? 'none'), h = Math.max(r.h * 1.6, 8 * e0.k), c = ornColor(e0);
    if (!leftX) drawEndcap(g, r.x, r.y + r.h / 2, h, -1, sh, c);
    drawEndcap(g, r.x + r.w, r.y + r.h / 2, h, 1, sh, c);
  }
  // 附属件在端头之后画（盖在端头上，B5 审查修复 ⑭）
  gaugeExtras(e0, e, r, v, kind, color, x, barLike);
}

/** 不垫底槽的横条画法：自发光灯段 / 细条（它们的样子就是没有底板）、刻度字条 */
const TROUGHLESS = new Set(['lightStrip', 'thinBar', 'textBar', 'scaleBar']);
/**
 * 数值条的底槽（§8，轨道 E）：条外扩 max(1.5, 条高 × 0.22)（至多 4，乘元素缩放）的一块深色圆角槽；跟底槽 token 的转角（药丸条 = 药丸槽）。
 * boss = Boss 条：不透明度 0.85 + 一道细边（饰色，没有饰件 / 描边色时 35% 白）
 */
function trough(e0: ElCtx, e: ElCtx, r: Rect, boss: boolean) {
  const k = e0.k, pad = Math.max(1.5 * k, Math.min(4 * k, r.h * 0.22)), q = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
  const pill = e.t.bar.track.radiusPct !== undefined && e.t.bar.track.radiusPct >= 40;
  const rim = boss ? (e0.t.panel.ornament?.color || e0.t.panel.border?.color ? ornColor(e0) : 'rgba(255,255,255,0.35)') : undefined;
  drawBox(e.g, q, { bg: { solid: boss ? 'rgba(10,10,14,0.85)' : 'rgba(10,12,16,0.58)' }, ...(pill ? { radiusPct: 50 } : { radius: Math.min(3 * k, pad + 1) }), ...(rim ? { border: { width: 1.5 * k, color: rim } } : {}) }, e.pal);
}

/* ---------------- M12b-03：按数值换色、外框、端头、附属件 ---------------- */

/**
 * 按数值换色（cmp.gaugeColorBy，M12b-03）：fixed = 调用方给的颜色（原来的）；thresholds = 低于 cmp.gaugeLow 危险色、低于 cmp.gaugeHigh 警告色、其余好色
 * （Cult 信仰值、Dead Space 青 → 黄 → 红）；gradient = 在 坏 → 警告 → 好 之间按数值插值（Stardew 能量条）。col.coding 含 value 时等于 gradient（别名）
 */
function valueColor(e: ElCtx, v: number, color: string): string {
  let by = pickedStr(e, 'cmp.gaugeColorBy', 'fixed');
  if (by === 'fixed' && e.r.list('col.coding').includes('value') && (!e.th.legacy || chosenKey(e, 'col.coding'))) by = 'gradient';
  if (by === 'fixed') return color;
  const lo = clamp01(pickNum(e, 'cmp.gaugeLow', 0.25)), hi = Math.max(lo, clamp01(pickNum(e, 'cmp.gaugeHigh', 0.6))), ro = e.th.roles;
  const bad = ro.danger ?? e.bad, warn = e.warn, good = e.good;
  if (by === 'thresholds') {
    if (v >= lo) return v < hi ? warn : good;
    // 最低档叠 st.alert = blink（Dead Space 低血时整条红并闪）：按待机相位明暗变化，静帧（相位 0）= 满色
    // 相位读模拟时钟（B5 审查修复 ㉑：原来读待机相位，mo.idle = none（默认）时永远是 0、不闪；与警报图标列 / 状态图标同一个时钟，第 0 帧满色）
    const blink = chosenKey(e, 'st.alert') && e.r.list(chosenKey(e, 'st.alert')!).includes('blink');
    return blink ? withAlpha(bad, 0.55 + 0.45 * Math.abs(Math.cos(simNow().t * 5))) : bad;
  }
  // gradient：lo 以下纯坏色、hi 以上纯好色，中间两段线性插值
  if (v <= lo) return bad;
  if (v >= hi) return good;
  const mid = (lo + hi) / 2;
  return v < mid ? mix(bad, warn, (v - lo) / Math.max(1e-6, mid - lo)) : mix(warn, good, (v - mid) / Math.max(1e-6, hi - mid));
}
/**
 * 端头（cmp.gaugeCap，M12b-03）：none / pointed 尖角 / ball 圆珠 / square 方块 / motif（按 vis.motif：祥云 → 云头、水墨 → 墨刷尾、卷草 → 卷须……）；
 * 大小 cmp.gaugeCapSize（条高的倍数，默认 1.6）；色 = 饰色（col.ornament → 饰件色 → 描边色）。画法 = B4 的 drawEndcap。没选（auto）时 null
 */
function capOf(e0: ElCtx, e: ElCtx, r: Rect): { shape: string; h: number; L: number; color: string } | null {
  const c = pickedStr(e, 'cmp.gaugeCap', 'none');
  if (c === 'none') return null;
  const shape = c === 'pointed' ? 'spike' : c === 'ball' ? 'ball' : c === 'square' ? 'square' : endcapShapeOf(pickedStr(e0, 'ast.endcapShape', 'auto'), e0.t.panel.ornament?.motif ?? e0.th.r.str('vis.motif', 'none'), 'spike');
  const h = Math.max(6 * e0.k, r.h * Math.max(0.5, Math.min(4, pickNum(e, 'cmp.gaugeCapSize', 1.6))));
  return { shape, h, L: Math.min(r.w * 0.2, endcapReach(shape, h) * 0.9), color: ornColor(e0) };
}
/**
 * 外框（cmp.gaugeFrame，M12b-03）：none / hairline 一圈细线 / double 两道细线（Hades 的青铜细框）/ plate 深色底板（Cult Boss 条的深色外框）。
 * 色：按目标写了描边（vis.stroke@el.x / @bar → t.edge）用它的颜色，否则饰色选过用饰色，再否则近黑；线宽 = 描边宽（选过）或 1
 */
function gaugeFrame(e: ElCtx, r: Rect, kind: string, round: (k: string) => boolean) {
  const f = pickedStr(e, 'cmp.gaugeFrame', 'none');
  if (f === 'none') return;
  const g = e.g, k = e.k, edge = e.t.edge?.border, oc = chosenKey(e, 'col.ornament') ? ornColor(e) : null;
  const c = edge?.color ? resolveColor(edge.color, e.pal) : oc ?? 'rgba(10,10,12,0.85)', lw = Math.max(1, (edge?.width ?? 1) * k);
  g.save();
  if (round(kind)) {
    const rad = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (f === 'plate') { g.fillStyle = 'rgba(10,10,12,0.85)'; g.beginPath(); g.arc(cx, cy, rad + 3 * k, 0, Math.PI * 2); g.fill(); }
    else { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, rad + 2 * k, 0, Math.PI * 2); g.stroke(); if (f === 'double') { g.beginPath(); g.arc(cx, cy, rad + 5 * k, 0, Math.PI * 2); g.stroke(); } }
  } else if (f === 'plate') { g.fillStyle = 'rgba(10,10,12,0.85)'; g.fillRect(r.x - 3 * k, r.y - 3 * k, r.w + 6 * k, r.h + 6 * k); }
  else {
    g.strokeStyle = c; g.lineWidth = lw;
    const o1 = 1.5 * k + lw / 2; g.strokeRect(r.x - o1, r.y - o1, r.w + o1 * 2, r.h + o1 * 2);
    if (f === 'double') { const o2 = o1 + 2.5 * k + lw; g.strokeStyle = withAlpha(c, 0.7); g.strokeRect(r.x - o2, r.y - o2, r.w + o2 * 2, r.h + o2 * 2); }
  }
  g.restore();
}
/**
 * 附属件（cmp.gaugeExtra 多选，M12b-03）：recoverable = 可回复段（受击掉的那截先换成第二填充色，样本 vitals[i].recover，随时间衰减）；
 * shieldTint = 有护盾时整条换第二强调色 + 左端盾徽数字（StS 的格挡）；capLabel = 竖条顶 / 横条左端的帽头字母（Stardew 的 E / H）；
 * endBadge = 左端圆徽 + 数字；statusRow = 条下一行带层数的小图标（el.vitals / el.threat 共用）
 */
/** 左端被附属件占着（B5 审查修复 ⑭）：选了端徽 / 盾徽 / 横条帽头字母、且这一条有它的数据 */
function leftExtra(e: ElCtx, x: GaugeExtra): boolean {
  const key = chosenKey(e, 'cmp.gaugeExtra');
  if (!key) return false;
  const ex = e.r.list(key);
  return (ex.includes('endBadge') && x.badge !== undefined) || (ex.includes('shieldTint') && (x.shield ?? 0) > 0) || (ex.includes('capLabel') && !!x.cap);
}
/** 条实际填充的那一带（B5 审查修复 ⑰）：细条（thinBar）只画矩形中间 35% 高（至少 2），附属件贴着它画；其余画法 = 整个矩形 */
const fillBand = (kind: string, r: Rect): Rect => { if (kind !== 'thinBar') return r; const h = Math.max(2, r.h * 0.35); return { x: r.x, y: r.y + (r.h - h) / 2, w: r.w, h }; };
function gaugeExtras(e0: ElCtx, e: ElCtx, r0: Rect, v: number, kind: string, color: string, x: GaugeExtra, barLike: boolean) {
  const key = chosenKey(e, 'cmp.gaugeExtra');
  if (!key) return;
  const ex = e.r.list(key).filter((q) => q && q !== 'auto' && q !== 'none'), g = e.g, k = e.k;
  if (!ex.length) return;
  const vert = kind === 'vertical' || r0.h > r0.w * 1.5, r = fillBand(kind, r0);
  if (ex.includes('recoverable') && (barLike || vert)) {
    // 可回复段：从当前值往后（竖条往上）一截，第二填充色斜纹；衰减：每 2 秒少一半（静帧 = 样本量）。
    // 只画给了可回复量的条（B5 审查修复 ⑰：原来没给的行也按 0.15 画，法力 / 体力行都多了一截；el.vitals 第一行没写时仍是 0.15）
    const rec = Math.max(0, Math.min(1 - v, (x.recover ?? 0) * Math.pow(0.5, simNow().sinceEvent === Infinity ? 0 : simNow().sinceEvent / 2)));
    if (rec > 0.001) {
      // 透明度乘在外层上（B5 审查修复 ⑯：原来直接赋值，按需显示 / 入场淡入时这一截照样满不透明）
      const a0 = g.globalAlpha;
      g.save(); g.globalAlpha = a0 * 0.85; g.fillStyle = mix(color, '#ffffff', 0.5);
      if (vert) g.fillRect(r.x, r.y + r.h * (1 - v - rec), r.w, r.h * rec); else g.fillRect(r.x + r.w * v, r.y, r.w * rec, r.h);
      g.globalAlpha = a0; g.strokeStyle = withAlpha(color, 0.9); g.lineWidth = Math.max(1, k * 0.8); g.setLineDash([2 * k, 2 * k]);
      if (vert) g.strokeRect(r.x, r.y + r.h * (1 - v - rec), r.w, r.h * rec); else g.strokeRect(r.x + r.w * v, r.y, r.w * rec, r.h);
      g.restore();
    }
  }
  if (ex.includes('shieldTint') && (x.shield ?? 0) > 0) {
    // 格挡：整条（细条 = 填充带）罩一层第二强调色，左端一枚盾徽写格挡数
    g.save(); g.globalAlpha *= 0.55; g.fillStyle = e.accent2; g.fillRect(r.x, r.y, r.w * (barLike ? Math.max(v, 0.02) : 1), r.h); g.restore();
    const s = Math.max(r0.h * 1.9, 14 * k), cx = r0.x, cy = r0.y + r0.h / 2;
    g.save(); g.beginPath(); g.moveTo(cx - s * 0.4, cy - s * 0.42); g.lineTo(cx + s * 0.4, cy - s * 0.42); g.lineTo(cx + s * 0.4, cy); g.quadraticCurveTo(cx + s * 0.35, cy + s * 0.35, cx, cy + s * 0.5); g.quadraticCurveTo(cx - s * 0.35, cy + s * 0.35, cx - s * 0.4, cy); g.closePath();
    g.fillStyle = e.accent2; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = Math.max(1, k); g.stroke(); g.restore();
    const n = String(x.shield), no = { ...e.small, size: s * 0.5, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.7)', width: 1 } };
    drawNumber(e, n, cx - numberWidth(e, n, no) / 2, cy - s * 0.4, s * 0.8, no);
  }
  if (ex.includes('capLabel') && x.cap) {
    // 帽头：竖条顶上 / 横条左端一个小方块里写字母（E / H）
    const s = Math.max(12 * k, Math.min(vert ? r0.w * 1.6 : r0.h * 1.6, 22 * k)), q = vert ? { x: r0.x + r0.w / 2 - s / 2, y: r0.y - s - 2 * k, w: s, h: s } : { x: r0.x - s - 3 * k, y: r0.y + r0.h / 2 - s / 2, w: s, h: s };
    drawBox(g, q, { bg: { solid: mix(color, '#000000', 0.35) }, border: { width: Math.max(1, k), color: 'rgba(0,0,0,0.85)' }, radius: 2 * k }, e.pal);
    const co = { ...e.small, size: s * 0.7, weight: 800, color: '#fff' };
    T(e, x.cap, q.x + s / 2 - W(e, x.cap, co) / 2, q.y, s, co);
  }
  if (ex.includes('endBadge') && x.badge !== undefined) {
    // 左端圆徽 + 数字（等级 / 层数；空字 = 只画徽，黑神话 Boss 条左端的小圆徽）
    const s = Math.max(r0.h * 2, 16 * k), cx = r0.x - s * 0.15, cy = r0.y + r0.h / 2;
    g.save(); g.beginPath(); g.arc(cx, cy, s / 2, 0, Math.PI * 2); g.fillStyle = mix(color, '#000000', 0.45); g.fill(); g.strokeStyle = ornColor(e0); g.lineWidth = Math.max(1, 1.5 * k); g.stroke(); g.restore();
    const bo = { ...e.small, size: s * 0.5, weight: 800, color: '#fff' };
    if (x.badge) drawNumber(e, x.badge, cx - numberWidth(e, x.badge, bo) / 2, cy - s / 2, s, bo);
  }
  if (ex.includes('statusBeside') && x.status?.length) {
    // 贴在条右侧的一排小方图标（M12b-19，into-the-breach#26：头顶血格旁的护盾 / 着火 / 酸液小方块）：方块底 = 角色色压暗、白符号、层数写在右下
    const s = Math.max(10 * k, Math.min(16 * k, r0.h * 1.8)), y = r0.y + r0.h / 2 - s / 2;
    x.status.slice(0, 4).forEach(([ch, role, n], i) => {
      const c = role === 'danger' ? (e.th.roles.danger ?? e.bad) : role === 'warn' ? e.warn : role === 'buff' ? e.good : e.accent, q = { x: r0.x + r0.w + 3 * k + i * (s + 2 * k), y, w: s, h: s };
      drawBox(g, q, { bg: { solid: mix(c, '#000000', 0.25) }, border: { width: Math.max(1, k), color: 'rgba(0,0,0,0.85)' }, radius: 1.5 * k }, e.pal);
      iconChip(e, ch, q.x + s / 2, q.y + s / 2, s * 0.62, '#ffffff');
      if (n) { const no = { ...e.small, size: s * 0.5, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1 } }, ns = String(n); drawNumber(e, ns, q.x + s * 0.55, q.y + s * 0.45, s * 0.6, no); }
    });
  }
  if (ex.includes('statusRow') && x.status?.length) {
    // 条下一行小图标（带层数）：增益 / 减益
    const s = Math.max(10 * k, Math.min(16 * k, r0.h * 1.4)), y = r0.y + r0.h + 3 * k;
    x.status.slice(0, 6).forEach(([ch, role, n], i) => {
      const cx = r0.x + s / 2 + i * (s + 3 * k), c = role === 'danger' ? (e.th.roles.danger ?? e.bad) : role === 'warn' ? e.warn : role === 'buff' ? e.good : e.accent;
      iconChip(e, ch, cx, y + s / 2, s * 0.8, c, true);
      if (n) { const no = { ...e.small, size: s * 0.5, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1 } }, ns = String(n); drawNumber(e, ns, cx + s * 0.1, y + s * 0.35, s * 0.7, no); }
    });
  }
}
