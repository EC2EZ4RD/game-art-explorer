import { mix, withAlpha } from '../material';
import { drawBox, TEXT_K, wrapLines, type Rect, type TextOpts } from '../paint';
import { onColorOf } from '../sys/theme';
import { drawRich, plainText } from '../richText';
import { button, drawNumber, gauge, icon, LH, numberWidth, T, W, type ElCtx } from './core';

/*
 * 字段渲染器（M12b-69，§2 的 drawField(e, kind, rect, data) → Rect / measureField()）：卡内子件（card.ts 的 cardSections）与之后的详情字段组合器
 * （B8 · 14 的 drawSections）、列表行字段（B8 · 13）共用这一套，不另写。每种字段：measureField 报宽 w 时要多高，drawField 在给的矩形里画、返回实际画出的矩形。
 * 字都用内容包里已有的字（字体子集）；颜色走颜色角色（强调色 / 好坏色 / 类别色 / 稀有度色由调用方算好放进 data）。
 * Godot：每种字段一个小场景（VBox / HBox + Label / TextureRect / Button / ProgressBar），卡 = VBox 按序实例化
 */

/** 字段的数据（各种字段只用其中几项） */
export interface FieldData {
  /** kicker 的几行 / iconDesc 的说明 / button 的字 / amountBar 的金额 / nameplate 的名字 / categoryChip 的类别 */
  lines?: string[];
  text?: string;
  /** fieldPair：[小标签, 大值] 一对或几对（两对并排） */
  pairs?: [string, string][];
  /** progressTable：标题 + 几行 [名字, 数值] */
  title?: string;
  rows?: [string, string][];
  /** priceChips：[符号, 数值] 几枚胶囊 */
  chips?: [string, string][];
  /** valueTarget：目标数字与它的小标签、奖励（$$$ 一类的符号串） */
  target?: string; targetLabel?: string; reward?: string;
  /** powerCells：每行 [亮几格, 共几格]（ITB 的供能小格） */
  cells?: [number, number][];
  /** iconDesc 的图标 / 符号 */
  glyph?: string;
  /** 主色（类别胶囊 / 名牌 / 金额条 / 动作钮的底色，调用方按类别色 / 强调色算好） */
  color?: string;
  /** actionTop：true = 选择按钮（当前项），false = 状态牌（即将 / 已跳过） */
  active?: boolean;
}

/** 字段种类（cmp.cardParts 的取值，加上 art / medallion 两个占剩余高的） */
export const FIELD_KINDS = ['kicker', 'nameplate', 'art', 'medallion', 'iconDesc', 'fieldPair', 'amountBar', 'progressTable', 'priceChips', 'valueTarget', 'actionTop', 'actionBelow', 'powerCells', 'categoryChip', 'button'] as const;
/** 吃剩余高度的字段（插画 / 圆龛）：固定字段按内容量完以后平分剩下的 */
export const FLEX_FIELDS = new Set(['art', 'medallion']);

/** 字段的小字：按字段宽收（宽的 9%，不超过小字、不小于 7），再乘 TEXT_K（B7 审查修复 ㉔：原来 fixedSize 不跟 a11y.textScale，放大字号时卡缩小、字反而变小） */
const sm = (e: ElCtx, w: number): TextOpts => ({ ...e.small, size: Math.max(7, Math.min(e.small.size, w * 0.09)) * TEXT_K.k, fixedSize: true });
const pad = (e: ElCtx) => 4 * e.k;

/** 字段在宽 w 里要多高（不画） */
export function measureField(e: ElCtx, kind: string, w: number, d: FieldData = {}): number {
  const s = sm(e, w), lh = LH(e, s, 1.3), p = pad(e);
  switch (kind) {
    case 'kicker': return (d.lines?.length ?? 1) * lh + p;
    case 'nameplate': return lh * 1.5 + p;
    case 'iconDesc': return Math.min(3, Math.max(1, wrapLines(e.tx, plainText(d.text ?? ''), w - lh * 1.4 - p * 2, { ...e.base, ...s }).length)) * lh + p;
    case 'fieldPair': return Math.ceil((d.pairs?.length ?? 1) / 2) * (lh + LH(e, { ...s, size: s.size * 1.5 }, 1.2)) + p;
    case 'amountBar': return lh * 1.6 + p;
    case 'progressTable': return lh * (1 + (d.rows?.length ?? 1)) + p * 2;
    case 'priceChips': return lh * 1.4 + p;
    case 'valueTarget': return lh + LH(e, { ...s, size: s.size * 1.6 }, 1.15) + p;
    case 'actionTop': return lh * 1.6 + p;
    case 'actionBelow': return lh * 1.6 + p;
    case 'powerCells': return (d.cells?.length ?? 1) * lh * 0.9 + p;
    case 'categoryChip': return lh * 1.3 + p;
    case 'button': return Math.max(lh * 1.6, 18 * e.k) + p;
    default: return 0;
  }
}

/** 在矩形里画一个字段，返回实际画出的矩形（art / medallion 由 card.ts 画，这里不管） */
export function drawField(e: ElCtx, kind: string, r: Rect, d: FieldData = {}): Rect {
  const g = e.g, s = sm(e, r.w), lh = LH(e, s, 1.3), p = pad(e), ink = e.text, acc = d.color ?? e.accent;
  const surf = e.th.surface;
  switch (kind) {
    case 'kicker': {
      // 小型大写多行（Civ6 伟人卡顶部：职业 / 人名 / 时代），中间那行（人名）加粗、用标题色
      (d.lines ?? []).forEach((l, i) => { const o = i === 1 ? { ...s, weight: 800, color: e.heading } : { ...s, upper: true, spacing: 0.14, color: e.muted }; T(e, l, r.x + r.w / 2 - W(e, l, o) / 2, r.y + i * lh, lh, o); });
      return { ...r, h: (d.lines?.length ?? 1) * lh };
    }
    case 'nameplate': {
      // 彩色名牌（Balatro 盲注卡的「小盲注 / 大盲注 / Boss 名」）：整宽实底 + 反差字
      const h = lh * 1.5, q = { x: r.x, y: r.y, w: r.w, h };
      drawBox(g, q, { bg: { solid: acc }, radius: h * 0.22 }, e.pal);
      const t = d.text ?? '', o = { ...s, size: s.size * 1.1, weight: 800, color: onColorOf(acc, surf), outline: undefined, shadow: undefined };
      T(e, t, q.x + q.w / 2 - W(e, t, o) / 2, q.y, h, o);
      return q;
    }
    case 'iconDesc': {
      // 图标 + 效果说明（富文本，关键词着色）
      icon(e, d.glyph ?? '✦', r.x + lh * 0.6, r.y + lh * 0.55, lh * 0.9, acc);
      const out = drawRich(e, d.text ?? '', { x: r.x + lh * 1.4, y: r.y, w: r.w - lh * 1.4, h: lh * 3 }, { o: { ...s, color: ink }, lh: 1.3, maxLines: 3 });
      return { ...r, h: Math.max(lh, out.h) };
    }
    case 'fieldPair': {
      // 小标签 + 大值（Cyberpunk 数据卡：BANK / ACCOUNT NUMBER 小字在上，值在下）：两对并排
      const big = { ...s, size: s.size * 1.5, weight: 800, color: ink }, bh = LH(e, big, 1.2), cw = r.w / 2;
      (d.pairs ?? []).forEach(([l, v], i) => { const x = r.x + (i % 2) * cw, y = r.y + Math.floor(i / 2) * (lh + bh); T(e, l, x, y, lh, { ...s, upper: true, spacing: 0.08, color: e.muted }); drawNumber(e, v, x, y + lh, bh, big); });
      return { ...r, h: Math.ceil((d.pairs?.length ?? 1) / 2) * (lh + bh) };
    }
    case 'amountBar': {
      // 底部实底金额条（Cyberpunk 的亮红条）：右下角切角（B3 的 cornerMask）
      const h = lh * 1.6, q = { x: r.x, y: r.y, w: r.w, h };
      drawBox(g, q, { bg: { solid: acc }, chamfer: h * 0.45, cornerMask: ['br'] }, e.pal);
      const t = d.text ?? '', o = { ...s, size: s.size * 1.15, weight: 900, color: onColorOf(acc, surf), outline: undefined, shadow: undefined };
      T(e, t, q.x + q.w - W(e, t, o) - p * 2, q.y, h, o);
      return q;
    }
    case 'progressTable': {
      // 带缺角细框的小表（Civ6 伟人卡的「招募进度」：标题 + 玩家行 + 进度数）+ 右侧细滚动条
      const h = lh * (1 + (d.rows?.length ?? 1)) + p, q = { x: r.x, y: r.y, w: r.w, h };
      drawBox(g, q, { border: { width: 1, color: withAlpha(ink, 0.45) }, chamfer: lh * 0.5, cornerMask: ['tl'] }, e.pal);
      if (d.title) T(e, d.title, q.x + p * 2, q.y + p * 0.5, lh, { ...s, upper: true, spacing: 0.1, color: e.muted });
      (d.rows ?? []).forEach(([n, v], i) => { const y = q.y + p * 0.5 + lh * (i + 1); T(e, n, q.x + p * 2, y, lh, { ...s, color: ink }); const vo = { ...s, weight: 700, color: ink }; drawNumber(e, v, q.x + q.w - p * 3 - numberWidth(e, v, vo), y, lh, vo); });
      g.fillStyle = withAlpha(ink, 0.25); g.fillRect(q.x + q.w - p * 1.2, q.y + p, Math.max(1, p * 0.4), q.h - p * 2);
      g.fillStyle = withAlpha(ink, 0.7); g.fillRect(q.x + q.w - p * 1.2, q.y + p, Math.max(1, p * 0.4), (q.h - p * 2) * 0.4);
      return q;
    }
    case 'priceChips': {
      // 价格胶囊（Civ6 伟人卡：金币 / 信仰两枚）：并排居中
      const chips = d.chips ?? [], h = lh * 1.4, o = { ...s, weight: 700, color: ink };
      const ws = chips.map(([, v]) => numberWidth(e, v, o) + h + p * 2), tot = ws.reduce((a, b) => a + b, 0) + p * (chips.length - 1);
      let x = r.x + (r.w - tot) / 2;
      chips.forEach(([gl, v], i) => { const q = { x, y: r.y, w: ws[i], h }; drawBox(g, q, { bg: { solid: withAlpha(mix(acc, '#000', 0.4), 0.85) }, radiusPct: 50 }, e.pal); icon(e, gl, q.x + h * 0.55, q.y + h / 2, h * 0.6, mix(acc, '#fff', 0.4)); drawNumber(e, v, q.x + h, q.y, h, o); x += ws[i] + p; });
      return { x: r.x + (r.w - tot) / 2, y: r.y, w: tot, h };
    }
    case 'valueTarget': {
      // 目标数字 + 奖励（Balatro 盲注卡：「至少得分」小字、红色大数字、$$$）
      const big = { ...s, size: s.size * 1.6, weight: 900, color: e.bad }, bh = LH(e, big, 1.15), tl = d.targetLabel ?? '';
      T(e, tl, r.x + r.w / 2 - W(e, tl, s) / 2, r.y, lh, { ...s, color: e.muted });
      const t = d.target ?? '', tw = numberWidth(e, t, big); drawNumber(e, t, r.x + r.w / 2 - tw / 2, r.y + lh, bh, big);
      if (d.reward) { const ro = { ...s, weight: 900, color: '#f2c14e' }; T(e, d.reward, r.x + r.w - W(e, d.reward, ro) - p, r.y, lh, ro); }
      return { ...r, h: lh + bh };
    }
    case 'actionTop': case 'actionBelow': {
      // 卡顶按钮（选择）/ 状态牌（即将 / 已跳过）；卡下的次级动作（跳过 + 标签）
      const h = lh * 1.6, q = { x: r.x + r.w * 0.08, y: r.y, w: r.w * 0.84, h };
      if (kind === 'actionTop' && d.active === false) { drawBox(g, q, { bg: { solid: withAlpha(ink, 0.12) }, radius: h * 0.25 }, e.pal); const t = d.text ?? ''; T(e, t, q.x + q.w / 2 - W(e, t, s) / 2, q.y, h, { ...s, color: e.muted }); return q; }
      button(e, q, d.text ?? '', kind === 'actionTop' ? 'confirm' : 'secondary', false);
      if (kind === 'actionBelow' && d.glyph) icon(e, d.glyph, q.x + q.w - h * 0.5, q.y + h / 2, h * 0.6, acc);
      return q;
    }
    case 'powerCells': {
      // 供能小格（ITB 整备栏每件武器下一排：灰 = 未供能、亮 = 已供能）= B5 的 cmp.gauge = pips（单位数 = 每行的格数）；色 = data.color（没给时强调色，B7 审查修复 ⑬：原来写死橙色）
      (d.cells ?? []).forEach(([lit, tot], i) => { const y = r.y + i * lh * 0.9, cw = Math.min(r.w, tot * lh * 0.9); gauge(e, { x: r.x + (r.w - cw) / 2, y: y + lh * 0.12, w: cw, h: lh * 0.62 }, tot ? lit / tot : 0, 'pips', acc, undefined, { max: tot }); });
      return { ...r, h: (d.cells?.length ?? 1) * lh * 0.9 };
    }
    case 'categoryChip': {
      // 类别胶囊（Balatro 说明框下方：塔罗紫 / 星球蓝 / 幻灵青；色 = 类别色）
      const t = d.text ?? '', o = { ...s, weight: 800, color: onColorOf(acc, surf), outline: undefined, shadow: undefined }, h = lh * 1.3, w = W(e, t, o) + h, q = { x: r.x + r.w / 2 - w / 2, y: r.y, w, h };
      drawBox(g, q, { bg: { solid: acc }, radiusPct: 50 }, e.pal);
      T(e, t, q.x + h / 2, q.y, h, o);
      return q;
    }
    case 'button': { const h = Math.max(lh * 1.6, 18 * e.k), q = { x: r.x, y: r.y, w: r.w, h }; button(e, q, d.text ?? '', 'secondary', false); return q; }
    default: return { ...r, h: 0 };
  }
}

/**
 * 详情字段组合器的挂钩（M12b-15）：模板的 drawSections / sectionsH 在 compose/screen.ts（字段要 detailButtons / ruleLine / groupHeader 这些模板侧的东西），
 * 局内元素（el.selection 的新版式：贴边侧栏、城市面板、实体信息、建筑面板、任务卡、命中计算、无底说明、卡叠）经这里调同一套——screen.ts 载入时注册，
 * 元素不直接 import screen.ts（compose/hud.ts → elements → screen.ts → hud.ts 会成环）。seed = 这一块要换掉的详情数据（名字、属性表、状态行……），
 * 其余字段照模板的 detailData 补；没注册（只载入了元素、没载入模板构图器）时 draw 什么都不画、height 返回 0
 */
export interface SectionSeed {
  name?: string; desc?: string; glyph?: string; type?: string; long?: string; buttons?: string[];
  stats?: [string, number][]; table?: [string, string][]; main?: [string, string]; tabs?: string[]; progress?: number; xp?: [number, string];
  /** 状态行 [字, 正常?]（statusRow：绿点 / 红点 + 字） */
  status?: [string, boolean];
  /** 配方行 [符号, 名字]（recipeLine） */
  recipe?: [string, string];
  /** 队伍列表 [名字, 状态字]（memberList：小头像 + 名字 + 右侧状态） */
  members?: [string, string][];
  /** 行动代号（codeLine：「> 代号」）、目标行（objectiveLine：菱形图标 + 一行）、底部饰条（footerStrip：等宽小字 + 两侧细线） */
  code?: string; objective?: string; footer?: string;
  /** 大号数字栏 [标签, 数]（bigNumbers：右对齐小型大写标签 + 大数字）、一行数值 [标签, 值]（valueLine：生命 80/80 · 金币 99） */
  numbers?: [string, string][]; line?: [string, string][];
  /** 图标页签 [符号, 名字]（iconTabs：托槽里一排图标胶囊，第一个选中） */
  iconTabs?: [string, string][];
  /** 数量控件 [标签, 当前, 上限]（quantity：cmp.quantity 的画法，M12b-31） */
  quantity?: [string, number, number];
}
export const SECTIONS: {
  draw: ((e: ElCtx, a: Rect, fields: string[], seed: SectionSeed, ink?: string) => void) | null;
  height: ((e: ElCtx, w: number, fields: string[], seed: SectionSeed, ink?: string) => number) | null;
} = { draw: null, height: null };
