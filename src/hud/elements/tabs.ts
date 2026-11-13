import { mix, withAlpha } from '../material';
import { boxPath, drawBox, logTarget, resolveColor, type Rect, type TextOpts } from '../paint';
import type { BoxStyle } from '../types';
import type { PadButton } from '../content/types';
import { avatar, cmp, icon, keyCap, keyCapWidth, LH, mutedOf, onKey, shapeStyle, silhouetteOf, T, tap, W, type ElCtx } from './core';

/*
 * 页签条（M12a-22，§2 的 tabStrip）：模板的分区导航（compose/screen.ts drawNav：上 / 下 / 左 / 右页签、二级页签行）与工具栏的类别页签
 * （elements/meta.ts el.toolbar = categoryTabs）共用。原来 drawNav 只画文字页签、选中项固定画按键块，类别页签五个都是强调色梯形牌、没有选中之分。
 *   内容 cmp.tab（按部件查：一级 @tab，二级 @nav2）：text / icon（内容包 screens.tabIcons，缺时用页签名的首字）/ iconText / avatar（圆头像 + 首字）；
 *   外形 vis.silhouette@tab（circle = 圆图标页签……，按键 token 经作用域主题重算）、vis.edge@tab（brush 时下划线画成一笔笔触）；
 *   选中指示 cmp.tabIndicator：filled（原来的按键块，字色 onAccent）/ underline / raised / weight / colorOnly / sunken——未选页签只有 filled 才垫 6% 浅底。
 * Godot：TabBar（或 HBox / VBox 里的 Button + ButtonGroup）+ 主题的 tab_selected / tab_unselected / tab_hovered StyleBox；图标 = TabBar.set_tab_icon
 */

export interface TabItem { label: string; icon?: string }
export interface TabOpts {
  /** 横排（h）/ 竖排（v） */
  dir: 'h' | 'v';
  /** 选中第几个 */
  sel?: number;
  /** 纸面容器的墨色（有就用它当字色） */
  ink?: string;
  /** 按哪个部件查作用域键：一级页签 tab，二级页签 nav2 */
  part?: string;
  /** 这个部件上没写 cmp.tab 时的内容（二级页签默认 icon） */
  content?: string;
  /** 横排：页签高；竖排：页签高（每格） */
  h: number;
  /** 竖排：页签宽；横排：固定每个页签的宽（不给时按字量） */
  w?: number;
  gap?: number;
  /** 字样覆盖（类别页签的小字） */
  text?: Partial<TextOpts>;
  /** 竖排时字的缩进（不给且 center 时居中） */
  indent?: number;
  /** 竖排时字居中（类别页签） */
  center?: boolean;
  /** 最多占这么宽 / 高（放不下的页签不画） */
  max?: number;
  /** 没选外形时的默认外形（类别页签原来是梯形牌） */
  shape?: BoxStyle['shape'];
  /** 未选页签的底：faint = 6% 浅底（模板页签原来的）；surface2 = 第二面色（类别页签） */
  offFill?: 'faint' | 'surface2';
  /** 两端画切换键（Q / E，手柄 LB / RB） */
  keys?: boolean;
  /**
   * 横排的对齐（lay.navAlign，M12b-16）：start = 从 at.x 起排（原来的）；center = 整行在 at 里居中；stretch = 每个页签等宽、整行铺满 at.w（black-myth#6、civ6#24）
   */
  align?: 'start' | 'center' | 'stretch';
  /** 页签之间的分隔（lay.navSeparator，M12b-16）：line = 一道竖细线（半个页签高），dot = 一颗小圆点；没给 = 不画（原来的） */
  sep?: 'line' | 'dot';
  /** 只量不画（M12b-16：托槽 / 外挂页签要先知道整行的范围） */
  measure?: boolean;
}

/** 选中指示的取值（cmp.tabIndicator） */
const INDICATORS = new Set(['filled', 'underline', 'raised', 'weight', 'colorOnly', 'sunken']);

/** 页签两端的切换键：手柄 LB / RB（二级页签 LT / RT），触屏不画，其余 Q / E（二级 Z / C） */
function switchKeys(e: ElCtx, level: number): [string, string, PadButton?, PadButton?] | null {
  const input = e.r.str('ctx.input', 'kbm'), set = e.r.str('ix.glyphs', 'keycap');
  if (input === 'touch' || set === 'touch') return null;
  const pad = input === 'pad' || ['xbox', 'playstation', 'nintendo'].includes(set);
  return level >= 2 ? (pad ? ['LT', 'RT', 'lt', 'rt'] : ['Z', 'C']) : pad ? ['LB', 'RB', 'lb', 'rb'] : ['Q', 'E'];
}

/**
 * 页签行两端要不要画切换键（lay.navKeys）：auto = 手柄 / 混合输入时画（主机界面的 LB / RB 惯例；键鼠不画，原来的样子）；ends = 总是画；none = 不画
 */
export function navKeysOn(e: ElCtx): boolean {
  const v = e.r.str('lay.navKeys', 'auto');
  if (v === 'none') return false;
  if (v === 'ends') return true;
  const input = e.r.str('ctx.input', 'kbm');
  return input === 'pad' || input === 'hybrid';
}

/** 一个页签的内容宽（不含左右空） */
function contentW(e: ElCtx, t: TabItem, kind: string, o: TextOpts, h: number): number {
  // 没有图标的 icon / iconText 页签按文字量（M12b-61，与 tabStrip 的退回同口径）
  const k = !t.icon && (kind === 'icon' || kind === 'iconText') ? 'text' : kind;
  if (k === 'icon' || k === 'avatar') return h * 0.62;
  return W(e, t.label, o) + (k === 'iconText' ? o.size * 1.5 : 0);
}

/** 页签的部件上下文、内容、选中指示与选中 / 未选的字样（tabStrip 与 tabColumnW 共用） */
function tabStyle(e0: ElCtx, o: Pick<TabOpts, 'part' | 'content' | 'ink' | 'text'>) {
  const part = o.part ?? 'tab';
  const e = e0.part(part);
  // 内容：这个部件上写了 cmp.tab 就用它，否则一级页签读全局（兜底 text），二级页签默认图标
  const own = e.v.key('cmp.tab') !== 'cmp.tab';
  const kind = o.content && !own ? o.content : cmp(e, 'cmp.tab', 'text');
  const ind0 = cmp(e, 'cmp.tabIndicator', 'filled'), ind = INDICATORS.has(ind0) ? ind0 : 'filled';
  const base: TextOpts = { ...e.base, ...(o.text ?? {}) };
  const offO: TextOpts = { ...base, weight: 400, color: o.ink ? withAlpha(o.ink, 0.65) : mutedOf(e, 0.65) };
  const onO: TextOpts = ind === 'filled' ? onKey(e, { ...base, weight: 700 }) : ind === 'colorOnly' ? { ...base, weight: 400, color: e.accent } : { ...base, weight: 700, color: o.ink ?? e.text };
  return { part, e, kind, ind, onO, offO };
}

/** 竖排页签的宽（不含左右空）：最宽的那个页签内容（选中的按选中字样量，与 tabStrip 同一套字样） */
export function tabColumnW(e0: ElCtx, tabs: TabItem[], o: Pick<TabOpts, 'part' | 'content' | 'ink' | 'text' | 'sel' | 'h'>): number {
  const { e, kind, onO, offO } = tabStyle(e0, o);
  return Math.max(...tabs.map((t, i) => contentW(e, t, kind, i === (o.sel ?? 0) ? onO : offO, o.h)));
}

/**
 * 画一行 / 一列页签，返回用掉的矩形（调用方从版面里扣掉）。at = 起点与可用范围（横排从 at.x 往右排，竖排从 at.y 往下排）
 */
export function tabStrip(e0: ElCtx, at: Rect, tabs: TabItem[], o: TabOpts): Rect {
  const { part, e, kind, ind, onO: on0, offO } = tabStyle(e0, o);
  const S = (n: number) => n * e.k, tp = tap(e), g = e.g;
  const sel = o.sel ?? 0, gap = o.gap ?? S(4), h = o.h;
  const onO = () => on0;
  // 外形：选了 vis.silhouette@tab 就跟它（按键 token 本身也按作用域换了外形）；没选时调用方给的默认外形
  const sil = silhouetteOf(e0, part);
  const shaped = (s: BoxStyle, r: Rect): BoxStyle => (sil ? shapeStyle(e0, part, s, r) : o.shape ? { ...s, shape: o.shape, radius: undefined, radiusPct: undefined, chamfer: undefined, step: undefined, circle: undefined } : s);
  const ctl: BoxStyle = { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 };
  let x = at.x, y = at.y;
  const ms = !!o.measure;
  // 两端的切换键（横排）
  const keys = o.keys && o.dir === 'h' ? switchKeys(e, part === 'nav2' ? 2 : 1) : null, kh = Math.min(h * 0.72, Math.max(S(20), LH(e, e.small, 1.3)));
  // 换页键的宽只在要先量整行（居中 / 铺满 / 只量）时量（默认的调用序列与原来一样）
  const align = o.dir === 'h' ? o.align ?? 'start' : 'start';
  const kw = keys && (align !== 'start' || ms) ? [keyCapWidth(e, kh, keys[0], keys[2]), keyCapWidth(e, kh, keys[1], keys[3])] : [0, 0];
  // 每个页签的宽（横排先量：居中 / 铺满要先知道整行多宽，M12b-16）
  const tw0 = (t: TabItem, i: number) => (o.dir === 'v' ? (o.w ?? at.w) : o.w ?? Math.max(contentW(e, t, kind, i === sel ? onO() : offO, h) + S(24), tp, (kind === 'icon' && t.icon) || kind === 'avatar' ? h : 0));
  // 默认（start）照原来在循环里逐个量（量字的调用顺序不变）
  let ws: number[] | null = null;
  if (align !== 'start') {
    ws = tabs.map(tw0);
    const kspan = keys ? kw[0] + kw[1] + S(16) : 0, n = tabs.length;
    if (align === 'stretch' && n) { const each = (at.w - kspan - gap * (n - 1)) / n; ws = ws.map((w) => Math.max(w, each)); }
    const span = ws.reduce((a, b) => a + b, 0) + gap * Math.max(0, n - 1) + kspan;
    if (align === 'center' && span < at.w) x += (at.w - span) / 2;
  }
  if (keys) x += (ms ? kw[0] : keyCap(e, x, y + (h - kh) / 2, kh, keys[0], keys[2])) + S(8);
  const rects: Rect[] = [];
  tabs.forEach((t, i) => {
    const on = i === sel, to = on ? onO() : offO;
    const w = ws ? ws[i] : tw0(t, i);
    const tr = { x, y, w, h };
    if (o.max !== undefined && (o.dir === 'v' ? tr.y + h > at.y + o.max : tr.x + w > at.x + o.max)) return;
    // 分隔（lay.navSeparator）：前一个页签与这一个之间正中一道竖线 / 一颗点
    const prev = rects[rects.length - 1];
    if (prev && o.sep && !ms) {
      const c = o.ink ? withAlpha(o.ink, 0.45) : mutedOf(e, 0.45);
      if (o.dir === 'h') { const sx = Math.round((prev.x + prev.w + tr.x) / 2); g.fillStyle = c; if (o.sep === 'dot') { g.beginPath(); g.arc(sx, y + h / 2, Math.max(1.5, S(2)), 0, Math.PI * 2); g.fill(); } else g.fillRect(sx - 0.5, y + h * 0.25, 1, h * 0.5); }
      else { const sy = Math.round((prev.y + prev.h + tr.y) / 2); g.fillStyle = c; if (o.sep === 'dot') { g.beginPath(); g.arc(tr.x + tr.w / 2, sy, Math.max(1.5, S(2)), 0, Math.PI * 2); g.fill(); } else g.fillRect(tr.x + tr.w * 0.2, sy - 0.5, tr.w * 0.6, 1); }
    }
    rects.push(tr);
    if (ms) { if (o.dir === 'v') y += h + gap; else x += w + gap; return; }
    // 底与选中指示
    if (on) {
      if (ind === 'filled') drawBox(g, tr, shaped(e.t.key, tr), e.pal);
      else if (ind === 'raised') drawBox(g, { ...tr, y: tr.y - S(3), h: tr.h + S(3) }, shaped({ ...ctl, shadows: [{ color: 'rgba(0,0,0,0.3)', x: 0, y: 2, blur: 6 }] }, tr), e.pal);
      else if (ind === 'sunken') drawBox(g, { ...tr, h: tr.h + S(4) }, shaped({ ...e.t.panel, shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 }, tr), e.pal);
      else if (ind === 'underline') underline(e, tr, o.dir);
    } else if (ind === 'filled') {
      // 第二面色：面板底色往字色挪 12%（任何皮肤上都比面板深一档 / 浅一档）
      if (o.offFill === 'surface2') drawBox(g, tr, shaped({ bg: { solid: mix(resolveColor(e.th.surface, e.pal), e.text, 0.12) } }, tr), e.pal);
      else if (!sil && !o.shape) { g.fillStyle = withAlpha(o.ink ?? e.text, 0.06); g.fillRect(tr.x, tr.y, tr.w, tr.h); }
      else { g.save(); g.beginPath(); boxPath(g, tr, shaped({}, tr)); g.fillStyle = withAlpha(o.ink ?? e.text, 0.06); g.fill(); g.restore(); }
    } else if (ind === 'sunken') {
      drawBox(g, { ...tr, y: tr.y + S(2), h: tr.h - S(2) }, shaped(ctl, tr), e.pal);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(tr.x, tr.y + S(2), tr.w, tr.h - S(2));
    }
    // 内容：图标 = 页签自己带的符号（内容包的 tabIcons / 按界面的 TabRow / 工具的符号，M12b-61）；没有图标时 icon 画法退回文字、iconText 只写字
    // （factorio#37：原来退回页签名的首字，读起来像被截断的「全 / 矿 / 部 / 建」）
    const glyph = t.icon ?? '';
    const cy = tr.y + tr.h / 2, isz = Math.min(h * 0.5, to.size * 1.3);
    const kd = !glyph && (kind === 'icon' || kind === 'iconText') ? 'text' : kind;
    if (kd === 'icon') icon(e, glyph, tr.x + tr.w / 2, cy, isz, to.color);
    else if (kd === 'avatar') avatar(e, tr.x + tr.w / 2, cy, Math.min(tr.w, tr.h) * 0.38, t.label, on ? e.accent : withAlpha(e.text, 0.4));
    else {
      const gs = kd === 'iconText' ? to.size * 1.1 : 0, gp = gs ? to.size * 0.4 : 0, tw = W(e, t.label, to);
      const tx0 = o.dir === 'v' && !o.center ? tr.x + (o.indent ?? S(14)) : tr.x + (tr.w - tw - gs - gp) / 2;
      if (gs) icon(e, glyph, tx0 + gs / 2, cy, gs, to.color);
      T(e, t.label, tx0 + gs + gp, tr.y, tr.h, to);
    }
    logTarget(g, tr, t.label, 'tab');
    if (o.dir === 'v') y += h + gap; else x += w + gap;
  });
  if (keys && rects.length) { const last = rects[rects.length - 1]; x = last.x + last.w + S(8); x += ms ? kw[1] : keyCap(e, x, y + (h - kh) / 2, kh, keys[1], keys[3]); }
  if (!rects.length) return { x: at.x, y: at.y, w: 0, h: 0 };
  const x1 = Math.max(x - (keys ? 0 : gap), ...rects.map((q) => q.x + q.w)), y1 = Math.max(...rects.map((q) => q.y + q.h));
  // 居中 / 铺满时返回实际画出的范围（左沿 = 第一个页签或换页键）；start 时与原来一样从 at.x 起
  const x0 = align === 'start' ? at.x : Math.min(rects[0].x - (keys ? kw[0] + S(8) : 0), at.x + at.w);
  return { x: x0, y: at.y, w: x1 - x0, h: y1 - at.y };
}

/** 选中页签的下划线：2.5 粗的强调色短线；vis.edge@tab = brush 时画成两头尖的一笔笔触（Ghost of Tsushima） */
function underline(e: ElCtx, tr: Rect, dir: 'h' | 'v') {
  const g = e.g, S = (n: number) => n * e.k, lw = Math.max(2, S(2.5));
  const x0 = tr.x + (dir === 'v' ? S(8) : S(10)), x1 = tr.x + tr.w - S(10), y = tr.y + tr.h - lw - S(1);
  g.save();
  g.fillStyle = e.accent;
  if (e.t.panel.edge === 'brush') {
    // 一笔：中段粗、两头尖，略带弧度
    const th = lw * 1.8, mid = (x0 + x1) / 2;
    g.beginPath(); g.moveTo(x0 - S(4), y + th * 0.4);
    g.quadraticCurveTo(mid, y - th * 0.9, x1 + S(6), y);
    g.quadraticCurveTo(mid, y + th * 0.9, x0 - S(4), y + th * 0.4);
    g.closePath(); g.fill();
  } else g.fillRect(x0, y, x1 - x0, lw);
  g.restore();
}

