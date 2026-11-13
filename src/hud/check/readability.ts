import type { Values } from '../../dims/types';
import { parseColor } from '../material';
import type { LoggedBox, LoggedFx, LoggedTarget, LoggedText, Rect } from '../paint';
import type { Resolved } from '../sys/resolve';
import { SAFE_INSETS, safeInsets } from '../sys/device';

/*
 * 可读性检查（docs/ui-hud-plan.md M8a）：对 HUD 最近一次绘制的记录（paint.ts 的 DRAW_LOG）和不含 UI 的画面采样做判断。
 *   文字对比度：WCAG 2.x 对比度，文字 vs "它下面的面板（半透明时叠在画面最亮 / 最暗处）"取最差值；正文 ≥ 4.5，大字（≥ 18px 或粗体 ≥ 14px）≥ 3，
 *               有描边 / 投影辅助的字只要求 ≥ 1.5（辅助线本身保证局部对比）；
 *   面板与背景：半透明面板叠上去以后和底下的画面分不开（对比 < 1.25）——雪地上的毛玻璃；
 *   最小字号：按设备（px@1080p：PC / 手机 / 平板 24、掌机 26、电视 26，chk.minText 可改；画面上的字按记录里的画布缩放 unitK 换回 px@1080p 再比，M12a-05）；
 *   屏占比：盒子覆盖的画面比例，局内 HUD 超过 30%（chk.coverage 可改）报警；
 *   约束检查（颜色冗余、色盲配色……）来自解析时的 warnings。
 *   M8b：文字溢出 / 互相压住（配合伪本地化 chk.overflow）、触控尺寸（ix.touchSize，同样是 px@1080p）、安全区（刘海 / 圆角 / 电视过扫描）、特效遮挡（chk.fxOcclusion）。
 * 每条问题附一两个"一键修复"，由界面用 store.patch 执行（可撤销）。
 */

export type Rgb = [number, number, number];

/* ---------------- 对比度（单元测试：scripts/test-readability.ts） ---------------- */

const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
/** WCAG 相对亮度（0~1） */
export const relLum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** WCAG 对比度（1~21） */
export function contrast(a: Rgb, b: Rgb): number {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** 前景（带 alpha）叠在背景上 */
export const over = (fg: Rgb, a: number, bg: Rgb): Rgb => [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
/** 文字要求的最低对比度 */
export const required = (size: number, bold: boolean, aided: boolean) => (aided ? 1.5 : size >= 18 || (bold && size >= 14) ? 3 : 4.5);

/* ---------------- 画面采样 ---------------- */

export interface SceneSample { data: Uint8ClampedArray; w: number; h: number; cssW: number; cssH: number }

/** 矩形下面画面的平均色、最亮、最暗（按相对亮度） */
export function sceneUnder(s: SceneSample, r: Rect): { avg: Rgb; light: Rgb; dark: Rgb } {
  const kx = s.w / s.cssW, ky = s.h / s.cssH;
  const x0 = Math.max(0, Math.floor(r.x * kx)), x1 = Math.min(s.w - 1, Math.ceil((r.x + r.w) * kx));
  const y0 = Math.max(0, Math.floor(r.y * ky)), y1 = Math.min(s.h - 1, Math.ceil((r.y + r.h) * ky));
  let n = 0;
  const sum: Rgb = [0, 0, 0];
  let light: Rgb = [0, 0, 0], dark: Rgb = [255, 255, 255], lmax = -1, lmin = 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * s.w + x) * 4;
    const c: Rgb = [s.data[i], s.data[i + 1], s.data[i + 2]];
    sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]; n++;
    const l = relLum(c);
    if (l > lmax) { lmax = l; light = c; }
    if (l < lmin) { lmin = l; dark = c; }
  }
  const avg: Rgb = n ? [sum[0] / n, sum[1] / n, sum[2] / n] : [128, 128, 128];
  return { avg, light: n ? light : avg, dark: n ? dark : avg };
}

/**
 * 字底下的背景色（轨道 E 改：按层叠算）：从画面开始，按绘制顺序把盖住字中心的盒子一层层叠上去——不透明（≥ 0.98）的盒子把底换成它，
 * 半透明的叠在下面已有的底上（原来只看最上面那一块：半透明的高亮叠在不透明面板上时，按「叠在画面上」算，面板上的字常被误报）；
 * 第一块就带背景虚化的半透明盒子叠在画面平均色上（毛玻璃）。返回可能的底色（画面最亮 / 最暗两种，或已被不透明盒子定下的一种）
 */
type LBox = { r: Rect; c: [number, number, number, number] | null; blur: number };
function bgUnder(boxes: LBox[], tr: Rect, sc: { avg: Rgb; light: Rgb; dark: Rgb }): { bgs: Rgb[]; translucent: boolean } {
  const cx = tr.x + tr.w / 2, cy = tr.y + tr.h / 2;
  let bgs: Rgb[] = [sc.light, sc.dark], scene = true, any = false, top: LBox | null = null;
  for (const b of boxes) {
    if (!b.c || b.c[3] <= 0.02 || cx < b.r.x || cx > b.r.x + b.r.w || cy < b.r.y || cy > b.r.y + b.r.h) continue;
    any = true; top = b;
    const col: Rgb = [b.c[0], b.c[1], b.c[2]];
    if (b.c[3] >= 0.98) { bgs = [col]; scene = false; continue; }
    if (scene && b.blur > 0) bgs = [sc.avg];
    bgs = bgs.map((bg) => over(col, b.c![3], bg));
  }
  return { bgs, translucent: !any || scene || !!(top?.c && top.c[3] < 0.98) };
}

/* ---------------- 问题与修复 ---------------- */

export interface Fix { label: string; set: Values }
export interface Issue { id: string; level: 'error' | 'warn'; title: string; detail: string; rects: Rect[]; fixes: Fix[] }

/** unitK：HUD 画布缩放（设计单位 → CSS 像素，HudSystem 记下）；px@1080p 的阈值 × 0.5 × unitK = CSS 像素。没有时按 1（单元测试） */
interface Log { texts: LoggedText[]; boxes: LoggedBox[]; targets?: LoggedTarget[]; fx?: LoggedFx[]; area?: Rect; unitK?: number }

export { SAFE_INSETS, safeInsets } from '../sys/device';
const inter = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** 各设备的最小字号（px@1080p，M12a-05）：PC / 手机 / 平板 / 掌机 = 原来按 CSS 像素写的 12 / 13 × 2（540 高的画布上门槛不变）；电视按 XAG 的 26px@1080p（原来的 22 是配合电视字号画成两倍大时定的） */
const MIN_TEXT: Record<string, number> = { pc: 24, phone: 24, tablet: 24, tv: 26, handheld: 26 };

/**
 * 文字对比度的合格统计（§8 验收「可读性检查中 ≥95% 的文字及格」）：与 analyzeReadability 第 1 条同一套算法（面板 / 画面最亮最暗处取最差、
 * 有描边 / 投影辅助的字按 1.5、单个符号按 3），返回总数、及格数、最差的几段
 */
/**
 * 整个画在画布外面的字不算（整合修复：工厂·车间挂在世界点上的「!」锚点在画面上沿以外，字落在 y = −77，看不见却按画面采样算成 1.5 : 1）。
 * 部分露在画布里的照算
 */
const offCanvas = (r: Rect, w: number, h: number) => r.x + r.w <= 0 || r.y + r.h <= 0 || r.x >= w || r.y >= h;

export function textContrastStats(log: Log, scene: SceneSample | null, cssW: number, cssH: number, _r?: Resolved): { n: number; pass: number; worst: string[] } {
  const toCss = <T extends { x: number; y: number; w: number; h: number; cw: number }>(o: T): Rect => { const k = cssW / o.cw; return { x: o.x * k, y: o.y * k, w: o.w * k, h: o.h * k }; };
  const boxes = log.boxes.map((b) => ({ ...b, r: toCss(b), c: b.color ? parseColor(b.color) : null }));
  let n = 0, pass = 0;
  const bad: [number, string][] = [];
  for (const t of log.texts) {
    if (t.fx) continue;
    const tr = toCss(t);
    if (offCanvas(tr, cssW, cssH)) continue;
    n++;
    const sc = scene ? sceneUnder(scene, tr) : { avg: [128, 128, 128] as Rgb, light: [128, 128, 128] as Rgb, dark: [128, 128, 128] as Rgb };
    const { bgs } = bgUnder(boxes, tr, sc);
    const tc = parseColor(t.color);
    const ratio = Math.min(...bgs.map((bg) => contrast(over([tc[0], tc[1], tc[2]], tc[3], bg), bg)));
    const need = /^[^\p{L}\p{N}]$/u.test(t.text.trim()) ? Math.min(3, required(t.size, t.bold, t.aided)) : required(t.size, t.bold, t.aided);
    if (ratio >= need) pass++; else bad.push([ratio, `「${t.text}」${ratio.toFixed(1)}`]);
  }
  return { n, pass, worst: bad.sort((a, b) => a[0] - b[0]).slice(0, 4).map((x) => x[1]) };
}

export function analyzeReadability(log: Log, scene: SceneSample | null, cssW: number, cssH: number, r: Resolved): Issue[] {
  const issues: Issue[] = [];
  // px@1080p ↔ CSS 像素：设计单位 = px@1080p × 0.5，CSS 像素 = 设计单位 × unitK
  const uk = log.unitK ?? 1;
  const to1080 = (css: number) => (css * 2) / uk;
  const toCss = <T extends { x: number; y: number; w: number; h: number; cw: number }>(o: T): Rect => { const k = cssW / o.cw; return { x: o.x * k, y: o.y * k, w: o.w * k, h: o.h * k }; };
  const boxes = log.boxes.map((b) => ({ ...b, r: toCss(b), c: b.color ? parseColor(b.color) : null }));
  const lightness = r.str('col.lightness', 'light');

  // 1 文字对比度
  const bad: { rect: Rect; text: string; ratio: number; need: number; translucent: boolean }[] = [];
  for (const t of log.texts) {
    // 特效字（飘字、横幅这类一闪而过、自带描边的字，fx）不算——与 textContrastStats（§8 验收的及格率）同一口径（D 的场景质量门槛按它报，审查修复）
    if (t.fx) continue;
    const tr = toCss(t);
    if (offCanvas(tr, cssW, cssH)) continue;
    const sc = scene ? sceneUnder(scene, tr) : { avg: [128, 128, 128] as Rgb, light: [128, 128, 128] as Rgb, dark: [128, 128, 128] as Rgb };
    // 半透明面板：毛玻璃按平均色，否则取画面最亮、最暗两处；多层盒子按绘制顺序叠（bgUnder）
    const { bgs, translucent } = bgUnder(boxes, tr, sc);
    const tc = parseColor(t.color);
    const ratio = Math.min(...bgs.map((bg) => contrast(over([tc[0], tc[1], tc[2]], tc[3], bg), bg)));
    // 单个符号（◆ ● ♥ 这类图标字）按 WCAG 1.4.11 非文字图形算，3:1 即可
    const need = /^[^\p{L}\p{N}]$/u.test(t.text.trim()) ? Math.min(3, required(t.size, t.bold, t.aided)) : required(t.size, t.bold, t.aided);
    if (ratio < need) bad.push({ rect: tr, text: t.text, ratio, need, translucent });
  }
  if (bad.length) {
    const worst = [...bad].sort((a, b) => a.ratio - b.ratio);
    const fixes: Fix[] = [{ label: '文字加描边', set: { 'typ.legibility': 'outline' } }];
    if (bad.some((b) => b.translucent)) fixes.push({ label: '面板改成不透明', set: { 'vis.opacity': 0.94, 'vis.blur': 0 } });
    fixes.push({ label: lightness === 'dark' ? '换浅色面板' : '换深色面板', set: { 'col.lightness': lightness === 'dark' ? 'light' : 'dark' } });
    issues.push({
      id: 'contrast', level: worst[0].ratio < 3 ? 'error' : 'warn',
      title: `文字对比度不足 ${bad.length} 处`,
      detail: worst.slice(0, 3).map((b) => `「${b.text}」${b.ratio.toFixed(1)}:1（需 ${b.need}）`).join('、'),
      rects: bad.map((b) => b.rect), fixes,
    });
  }

  // 2 面板和背景分不开（只看较大的半透明盒子）
  if (scene) {
    const weak: Rect[] = [];
    for (const b of boxes) {
      if (!b.c || b.c[3] >= 0.98 || b.c[3] < 0.05 || b.r.w * b.r.h < 2500) continue;
      const sc = sceneUnder(scene, b.r);
      const panel = over([b.c[0], b.c[1], b.c[2]], b.c[3], sc.avg);
      if (contrast(panel, sc.avg) < 1.25) weak.push(b.r);
    }
    if (weak.length) issues.push({
      id: 'panel', level: 'warn', title: `面板和背景分不开 ${weak.length} 处`,
      detail: '半透明 / 毛玻璃面板叠上去以后，和底下的画面亮度几乎一样（对比 < 1.25:1）',
      rects: weak,
      fixes: [{ label: '面板改成不透明', set: { 'vis.opacity': 0.94, 'vis.blur': 0 } }, { label: '加实线描边', set: { 'vis.stroke': 'solid', 'vis.strokeWidth': 2 } }, { label: lightness === 'dark' ? '换浅色面板' : '换深色面板', set: { 'col.lightness': lightness === 'dark' ? 'light' : 'dark' } }],
    });
  }

  // 3 最小字号
  const device = r.str('ctx.device', 'pc');
  // 审查修复 ③：门槛与品质下限同一套字号阶梯（§8 RC5「说明 20 / 标签 22（硬下限）/ 正文 24–26」）——设备的门槛是正文字号，标签按它减 2（PC 22 = 字号下限），
  // 贴在固定尺寸图形上的小字（格子角标、键位、徽章数）再减 1（21 = QUALITY.fixedMin）；原来一律按 24 查，被下限抬过的标签永远报「太小」。
  // 手动写了 chk.minText 时按它查所有字（照旧）
  const explicitMin = r.has('chk.minText') && r.src('chk.minText')?.layer !== 'default' && r.src('chk.minText')?.layer !== 'fallback';
  const minT = explicitMin ? r.num('chk.minText', 24) : MIN_TEXT[device] ?? 24;
  const minOf = (t: LoggedText) => (explicitMin ? minT : minT - 2 - (t.fixed ? 1 : 0));
  const small = log.texts.map((t) => ({ t, r: toCss(t), s: to1080(t.size) })).filter(({ t, s }) => s < minOf(t) - 0.02);
  if (small.length) {
    const minSize = Math.min(...small.map(({ s }) => s));
    // 修法真能放大小字：基准字号在现在的基础上 + 4（原来的「正文放大到 26」就是默认值，点了没变化）；已经很大时改文字缩放
    const curBase = r.num('typ.baseSize', 26), ts = r.num('a11y.textScale', 1);
    const fixes: Fix[] = curBase < 40 ? [{ label: `字号放大到 ${curBase + 4}px@1080p`, set: { 'typ.baseSize': curBase + 4 } }] : [];
    fixes.push({ label: `文字缩放 ${Math.round((ts + 0.15) * 100)}%`, set: { 'a11y.textScale': +(ts + 0.15).toFixed(2) } });
    issues.push({
      id: 'minText', level: minSize < minT - 6 ? 'error' : 'warn',
      title: `字太小 ${small.length} 处（最小 ${minSize.toFixed(1)}px@1080p，${device === 'tv' ? '电视' : device === 'phone' ? '手机' : device === 'handheld' ? '掌机' : 'PC'} ${explicitMin ? `至少 ${minT}` : `标签至少 ${minT - 2}`}px@1080p）`,
      detail: small.slice(0, 3).map(({ t, s }) => `「${t.text}」${s.toFixed(1)}px@1080p`).join('、'),
      rects: small.map((x) => x.r),
      fixes,
    });
  }

  // 4 屏占比（局内 HUD）
  if (r.str('cnt.screen', 'screen.hud') === 'screen.hud') {
    const GX = 64, GY = 36, grid = new Uint8Array(GX * GY);
    for (const b of boxes) {
      if (!b.c || b.c[3] < 0.15) continue;
      const x0 = Math.max(0, Math.floor((b.r.x / cssW) * GX)), x1 = Math.min(GX - 1, Math.floor(((b.r.x + b.r.w) / cssW) * GX));
      const y0 = Math.max(0, Math.floor((b.r.y / cssH) * GY)), y1 = Math.min(GY - 1, Math.floor(((b.r.y + b.r.h) / cssH) * GY));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * GX + x] = 1;
    }
    const cov = grid.reduce((s, v) => s + v, 0) / (GX * GY);
    // 门槛口径（轨道 E 统一）：参数表的 chk.coverage 是 0–100（%）；手动写了 > 0 的值才当门槛（≤ 1 的老写法按比例读），0 / 没写 = 默认 30%
    const cv = r.src('chk.coverage')?.layer === 'user' ? r.num('chk.coverage', 0) : 0;
    const limit = cv > 1 ? Math.min(1, cv / 100) : cv > 0 ? cv : 0.3;
    if (cov > limit) issues.push({
      id: 'coverage', level: cov > limit * 1.5 ? 'error' : 'warn', title: `UI 挡住了 ${Math.round(cov * 100)}% 的画面（上限 ${Math.round(limit * 100)}%）`,
      detail: '局内 HUD 盒子覆盖的画面比例', rects: [],
      fixes: [{ label: '信息密度降一档', set: { 'cnt.density': Math.max(0, r.num('cnt.density', 2) - 1) } }, { label: 'HUD 用到才显示', set: { 'rel.hudVisibility': 'contextual' } }],
    });
  }

  const texts = log.texts.filter((t) => !t.fx).map((t) => ({ t, r: toCss(t) }));
  const area: Rect = log.area ?? { x: 0, y: 0, w: cssW, h: cssH };

  // 6 文字溢出（M8b）：字从它所在的盒子里冒出去；伪本地化（chk.overflow）把字加长后最容易看出来
  {
    const over: { rect: Rect; text: string }[] = [];
    for (const { t, r: tr } of texts) {
      const px = tr.x + Math.min(4, tr.w / 3), py = tr.y + tr.h / 2;
      let best: Rect | null = null;
      for (const b of boxes) {
        const br = b.r;
        if (br.w > area.w * 0.9 || br.h < tr.h * 0.7) continue;
        if (px < br.x || px > br.x + br.w || py < br.y || py > br.y + br.h) continue;
        if (!best || br.w * br.h < best.w * best.h) best = br;
      }
      if (best && (tr.x + tr.w > best.x + best.w + 2 || tr.x < best.x - 2)) over.push({ rect: tr, text: t.text });
    }
    // 两段字互相压住（字号相近）
    const clash: Rect[] = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const ratio = a.t.size / b.t.size;
      if (ratio > 1.6 || ratio < 1 / 1.6) continue;
      if (inter(a.r, b.r) > 0.25 * Math.min(a.r.w * a.r.h, b.r.w * b.r.h)) clash.push(a.r, b.r);
    }
    const pseudoOn = r.str('chk.overflow', 'off') !== 'off';
    if (over.length) issues.push({
      id: 'overflow', level: 'error', title: `文字冒出盒子 ${over.length} 处${pseudoOn ? '（伪本地化加长后）' : ''}`,
      detail: over.slice(0, 3).map((o) => `「${o.text}」`).join('、') + ' —— 盒子宽度写死了，翻译变长或放大字号后装不下',
      rects: over.map((o) => o.rect),
      fixes: [{ label: '信息密度降一档', set: { 'cnt.density': Math.max(0, r.num('cnt.density', 2) - 1) } }, ...(pseudoOn ? [{ label: '关掉伪本地化', set: { 'chk.overflow': 'off' } }] : [])],
    });
    if (clash.length) issues.push({
      id: 'textClash', level: 'warn', title: `文字互相压住 ${clash.length / 2} 处`,
      detail: '两段字号相近的文字重叠（常见于加长的名字压到右对齐的数量 / 数值）', rects: clash, fixes: [],
    });
  }

  // 7 触控尺寸（M8b）：触屏输入或打开 chk.touch 时，能点的目标最短边要 ≥ ix.touchSize（px@1080p，按画布缩放换成 CSS 像素比，M12a-05）
  if (r.bool('chk.touch') || r.str('ctx.input', 'kbm') === 'touch') {
    const need = r.num('ix.touchSize', 88), needCss = need * 0.5 * uk;
    const small = (log.targets ?? []).map((t) => ({ t, r: toCss(t) })).filter((x) => Math.min(x.r.w, x.r.h) < needCss - 0.5);
    if (small.length) {
      const minSide = Math.max(1, Math.min(...small.map((x) => Math.min(x.r.w, x.r.h))));
      const k = Math.min(2, Math.ceil((needCss / minSide) * r.num('a11y.uiScale', 1) * 20) / 20);
      issues.push({
        id: 'touch', level: 'error', title: `触控目标太小 ${small.length} 个（要 ≥ ${need}px@1080p）`,
        detail: small.slice(0, 4).map((x) => `${x.t.label || '按钮'} ${Math.round(to1080(Math.min(x.r.w, x.r.h)))}px@1080p`).join('、'),
        rects: small.map((x) => x.r),
        fixes: [{ label: `UI 整体放大到 ${k} 倍`, set: { 'a11y.uiScale': k } }],
      });
    }
  }

  // 7b 单手可达（M10）：竖屏单手握持时，大按钮（主操作）落在屏幕上 1/3 就够不到
  if (r.str('ix.thumbZone', '') === 'oneHand') {
    const needCss = r.num('ix.touchSize', 88) * 0.5 * uk;
    const far = (log.targets ?? []).map((t) => ({ t, r: toCss(t) })).filter((x) => Math.min(x.r.w, x.r.h) >= needCss * 0.9 && x.r.y + x.r.h / 2 < area.y + area.h / 3);
    if (far.length) issues.push({
      id: 'thumbReach', level: 'warn', title: `单手够不到的大按钮 ${far.length} 个（在屏幕上 1/3）`,
      detail: far.slice(0, 4).map((x) => x.t.label || '按钮').join('、') + ' —— 竖屏单手握持时拇指只够得到下半屏，主操作放到下 1/3',
      rects: far.map((x) => x.r), fixes: [],
    });
  }

  // 8 安全区（M8b）：手机刘海 / 圆角 / 底部横条、电视过扫描会切掉的边上不能有 UI
  const ins = safeInsets(r) ?? (r.bool('chk.safeArea') ? SAFE_INSETS.phoneLandscape : null);
  if (ins && (r.bool('chk.safeArea') || r.str('ctx.device', 'pc') !== 'pc')) {
    const zones: Rect[] = [
      { x: area.x, y: area.y, w: area.w * ins.l, h: area.h },
      { x: area.x + area.w * (1 - ins.r), y: area.y, w: area.w * ins.r, h: area.h },
      { x: area.x, y: area.y, w: area.w, h: area.h * ins.t },
      { x: area.x, y: area.y + area.h * (1 - ins.b), w: area.w, h: area.h * ins.b },
    ].filter((z) => z.w > 0 && z.h > 0);
    const cand: Rect[] = [
      ...boxes.filter((b) => b.c && b.c[3] > 0.05 && !(b.r.w > area.w * 0.9 && b.r.h > area.h * 0.9)).map((b) => b.r),
      ...texts.map((x) => x.r),
    ];
    const out = cand.filter((c) => zones.some((z) => inter(c, z) > 4));
    if (out.length) {
      // 安全边距按短边的百分比算：横向的切边要换算到短边
      const short = Math.min(area.w, area.h);
      const needPx = Math.max(ins.l * area.w, ins.r * area.w, ins.t * area.h, ins.b * area.h);
      const need = Math.min(12, Math.ceil(((needPx - 12) / short) * 100 * 2) / 2 + 0.5);
      issues.push({
        id: 'safeArea', level: 'error', title: `${out.length} 处 UI 伸进了安全区外`,
        detail: `${r.str('ctx.device', 'pc') === 'tv' ? '电视过扫描（四边各 5%）' : '手机刘海 / 圆角 / 底部横条'}会切掉这些地方`,
        rects: [...zones, ...out],
        fixes: [{ label: `安全边距加到 ${need}%`, set: { 'lay.safeMargin': need } }],
      });
    }
  }

  // 9 特效遮挡（M8b）：飘字、横幅、提示、速度线、故障、面板前景特效压住了 HUD 的字
  if (r.bool('chk.fxOcclusion') && log.fx?.length) {
    const fx = log.fx.map((f) => ({ f, r: toCss(f) }));
    const hit = texts.filter((x) => fx.some((q) => inter(q.r, x.r) > 0.3 * x.r.w * x.r.h));
    if (hit.length) {
      const kinds = [...new Set(fx.filter((q) => hit.some((x) => inter(q.r, x.r) > 0)).map((q) => q.f.kind))];
      const fixes: Fix[] = [{ label: '文字加描边', set: { 'typ.legibility': 'outline' } }];
      if (kinds.some((k) => k === 'speedLines' || k === 'glitch')) fixes.push({ label: '关掉整屏速度线 / 故障', set: { 'rel.metaFx': r.list('rel.metaFx').filter((x) => x !== 'speedLines' && x !== 'glitch').join(',') } });
      if (kinds.some((k) => !['floater', 'banner', 'toast', 'speedLines', 'glitch'].includes(k))) fixes.push({ label: '去掉面板前景特效', set: { 'ast.fx': '' } });
      if (kinds.some((k) => k === 'floater' || k === 'banner')) fixes.push({ label: '减少动效（低刺激）', set: { 'a11y.reduceMotion': true } });
      issues.push({
        id: 'fxOcclusion', level: 'warn', title: `特效压住了 ${hit.length} 处 HUD 文字`,
        detail: `压字的特效：${kinds.join('、')}`, rects: hit.map((x) => x.r), fixes,
      });
    }
  }

  // 10 预览太小（§8 RC1，轨道 E）：画框里的 HUD 画布缩放 unitK < 0.9（设计画布 960 × 540 被缩到不足 0.9 倍，1080p 下 22px 的字只剩 10 CSS 像素左右）——
  // 不是 UI 本身的问题：提示放大画框（编辑 / 专注 / 100%）再看字号与细线
  if (log.unitK !== undefined && log.unitK < 0.9 && log.texts.length) issues.push({
    id: 'previewSmall', level: 'warn', title: `预览太小（${Math.round(log.unitK * 50)}%，字和细线看着比实际小）`,
    detail: '画框只有 1080p 的一半不到：按 F 专注、或缩放到 50% / 100% 再判断字号与线条', rects: [], fixes: [],
  });

  // 5 约束检查的提示（颜色冗余、色盲配色……）
  for (const w of r.warnings) issues.push({ id: w.id, level: w.level === 'error' ? 'error' : 'warn', title: w.why.replace(/（R\d.*?）$/, ''), detail: w.id, rects: [], fixes: w.id === 'C-teams-cvd' ? [{ label: '阵营色改成橙 / 蓝', set: { 'col.teams': 'orangeBlue' } }] : [] });
  return issues;
}
