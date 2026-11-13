import { withAlpha } from './material';
import { drawBox, measure, resolveColor, wrapLines, type Rect, type TextOpts } from './paint';
import { chosen, drawNumber, lineColor, LH, mutedOf, numberWidth, pickedStr, T, W, type ElCtx } from './elements/core';
import { FONT_STACK } from './sys/theme';

/*
 * 行内富文本（M12b-57，§2 的 drawRich）：内容串里的小标记按语义着色——
 *   {k:词} 关键词、{b:+3} 增益、{d:6} 减益 / 代价、{u:10} 升级后的值、{c1:…}…{c5:…} 类别（第 1–5 类）、[[注释]] 方括号注释、{x:词} 涂黑。
 *   段落按换行分：以「§ 」开头的是引子（小号类别字 + 一道线，hier.kicker）、以「» 」开头的是决断句（居中一行，hier.callout）。
 * 着色由 hier.inlineMap（多选：keyword / buff / debuff / upgraded / category / note / redact）决定：没选的类按正文画（字照写、不着色、不涂黑），
 *   关键词另有原来的单一强调 hier.inline（keyword 强调色 / red 坏色 / bold 加粗 / chip 底牌 / star 前加星）；方括号注释没映射时也照写方括号。
 *   颜色角色：keyword = 强调色、buff = 好色、debuff = 坏色、upgraded = 第二强调色、category = 类别色表（M12b-33 的 e.lineColors，没开时默认色表）、note = 次要字色、redact = 正文色的实心条。
 * hier.redactRatio（0–0.3）：redact 开着时再按比例涂掉长词（确定的，按文字取种子；Control 的删密文件）。
 * 什么都没选时与原来的 T() / wrapLines 逐字一致（标记去掉；没有标记的串画法不变）。
 * Godot：richBBCode() 把标记转成 RichTextLabel 的 BBCode（[color]，涂黑 = [fgcolor]：Godot 4 的前景色块，盖在字上面）。
 */

export type RichKind = 'plain' | 'keyword' | 'buff' | 'debuff' | 'upgraded' | 'category' | 'note' | 'redact';
export interface RichRun { text: string; kind: RichKind; cat?: number }

const TAG: Record<string, RichKind> = { k: 'keyword', b: 'buff', d: 'debuff', u: 'upgraded', x: 'redact' };
const MARK = /\{(k|b|d|u|x|c[1-5]):([^{}]*)\}|\[\[([^\]]*)\]\]/g;
/** 解析标记（方括号注释的文字带上方括号：画出来就是「[简单：成功]」） */
export function parseRich(s: string): RichRun[] {
  const out: RichRun[] = [];
  let i = 0;
  for (const m of s.matchAll(MARK)) {
    if (m.index! > i) out.push({ text: s.slice(i, m.index), kind: 'plain' });
    if (m[3] !== undefined) out.push({ text: `[${m[3]}]`, kind: 'note' });
    else if (m[1].startsWith('c')) out.push({ text: m[2], kind: 'category', cat: Number(m[1].slice(1)) - 1 });
    else out.push({ text: m[2], kind: TAG[m[1]] });
    i = m.index! + m[0].length;
  }
  if (i < s.length) out.push({ text: s.slice(i), kind: 'plain' });
  return out;
}
/** 去掉标记后的字（不画富文本的地方用：列表行的说明、卡面说明、量宽、Godot 的纯文本） */
export const plainText = (s: string) => (s.includes('{') || s.includes('[[') ? parseRich(s).map((r) => r.text).join('') : s);
const strip = (s: string) => s.replace(/^(§|») /, '');
/** 一段（段首「§ 」/「» 」的段落类型） */
const paraKind = (s: string): 'kicker' | 'callout' | 'body' => (s.startsWith('§ ') ? 'kicker' : s.startsWith('» ') ? 'callout' : 'body');

/** 这一屏开了哪些着色（hier.inlineMap；旧皮肤只认皮肤之后的层选的）与关键词的单一强调（hier.inline） */
function richStyle(e: ElCtx) {
  const r = e.r;
  const map = new Set(e.th.legacy && !chosen(e, 'hier.inlineMap') ? [] : r.list('hier.inlineMap').filter((x) => x !== 'auto' && x !== 'none'));
  const il0 = e.th.legacy && !chosen(e, 'hier.inline') ? 'none' : r.str('hier.inline', 'none'), inline = il0 === 'auto' ? 'none' : il0;
  const ratio = map.has('redact') ? Math.max(0, Math.min(0.3, r.num('hier.redactRatio', 0))) : 0;
  return { map, inline, ratio, annot: pickedStr(e, 'typ.mix', 'none') === 'annotationLayer' };
}
type Style = ReturnType<typeof richStyle>;

/** 一段字的颜色 / 字重 / 是否涂黑 */
function runLook(e: ElCtx, st: Style, run: RichRun, o: TextOpts): { o: TextOpts; bar?: string; chip?: string; star?: boolean } {
  const m = st.map;
  switch (run.kind) {
    case 'keyword':
      if (m.has('keyword')) return { o: { ...o, color: e.accent } };
      if (st.inline === 'keyword') return { o: { ...o, color: e.accent } };
      if (st.inline === 'red') return { o: { ...o, color: e.bad } };
      if (st.inline === 'bold') return { o: { ...o, weight: 800 } };
      if (st.inline === 'chip') return { o: { ...o, weight: 700 }, chip: withAlpha(e.accent, 0.28) };
      if (st.inline === 'star') return { o: { ...o, color: e.accent }, star: true };
      return { o };
    case 'buff': return { o: m.has('buff') ? { ...o, color: e.good } : o };
    case 'debuff': return { o: m.has('debuff') ? { ...o, color: e.bad } : o };
    case 'upgraded': return { o: m.has('upgraded') ? { ...o, color: e.accent2 } : o };
    case 'category': return { o: m.has('category') ? { ...o, color: lineColor(e, run.cat ?? 0) ?? CAT_DEFAULT[(run.cat ?? 0) % CAT_DEFAULT.length] } : o };
    // 注释层（typ.mix = annotationLayer，M12b-63，K1 G-type-mix）：方括号注释换成手写感的墨线衬线（中文楷体）斜体、第二强调色，像批注
    case 'note': return st.annot ? { o: { ...o, font: FONT_STACK.inkedSerif, italic: true, color: e.accent2 } } : { o: m.has('note') ? { ...o, color: mutedOf(e, 0.6) } : o };
    case 'redact': return m.has('redact') ? { o, bar: resolveColor(o.color ?? e.text, e.pal) } : { o };
    default: return { o };
  }
}
/** 类别色（col.coding 没开 lineId、类别色表为空时）：Disco 的智力 / 心理 / 体能 / 运动四色 + 一色 */
export const CAT_DEFAULT = ['#5ab4e6', '#b48ce6', '#e6505a', '#e6c85a', '#7fd1b9'];

/** 按比例自动涂黑的长词（hier.redactRatio）：拉丁 ≥ 4 字母的词、中文按两字一组；种子 = 字本身（每帧稳定） */
function autoRedact(runs: RichRun[], ratio: number): RichRun[] {
  if (ratio <= 0) return runs;
  const out: RichRun[] = [];
  let n = 0;
  for (const r of runs) {
    if (r.kind !== 'plain') { out.push(r); continue; }
    for (const m of r.text.matchAll(/[A-Za-z]{4,}|[一-鿿]{2}|[^A-Za-z一-鿿]+|./gu)) {
      const t = m[0], h = hash(`${t}#${n++}`);
      out.push({ text: t, kind: /^([A-Za-z]{4,}|[一-鿿]{2})$/u.test(t) && h < ratio ? 'redact' : 'plain' });
    }
  }
  return out;
}
const hash = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

/** 把一段的字按 wrapLines 折好的行切回成每行的字段（wrapLines 只在行首行尾去空白，按字依次对上） */
function splitRuns(runs: RichRun[], lines: string[]): RichRun[][] {
  const flat: { ch: string; i: number }[] = [];
  runs.forEach((r, i) => { for (const ch of r.text) flat.push({ ch, i }); });
  const out: RichRun[][] = [];
  let p = 0;
  for (const l of lines) {
    const row: RichRun[] = [];
    for (const ch of l) {
      while (p < flat.length && flat[p].ch !== ch) p++;
      if (p >= flat.length) break;
      const ri = flat[p].i, last = row[row.length - 1];
      if (last && (last as RichRun & { _i?: number })._i === ri) last.text += ch;
      else row.push(Object.assign({ ...runs[ri], text: ch }, { _i: ri }));
      p++;
    }
    out.push(row);
  }
  return out;
}

export interface RichOpts {
  /** 正文字样 */
  o: TextOpts;
  /** 对齐（M12b-55 的 typ.align）：left / center / right / justify（两端对齐：最后一行左对齐） */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** 行高倍数（LH 的 k；默认 1.7） */
  lh?: number;
  /** 最多画几行（超出截掉） */
  maxLines?: number;
  /** 首几行左边让出的宽（首字下沉，typ.dropCap） */
  indent?: { lines: number; w: number };
  /** 只量不画 */
  measureOnly?: boolean;
  /** 逐字显现（M12b-21，mo.textReveal = typewriter）：只画前这么多个字（按去掉标记后的字数），折行与量高照整段算——字一个个出来时行不跳 */
  reveal?: number;
  /** 截断时写省略号（终期审查修复 ③ / ㉓）：因为 maxLines 或高度停下、后面还有字时，最后画的那一行收到放得下「…」为止并以「…」结尾（没给时照原来直接截掉） */
  ellipsis?: boolean;
}
export interface RichOut { lines: number; h: number; end: { x: number; y: number } | null }

/**
 * 画一段富文本（M12b-57，§2）：s 可以有换行（段落）；rect.x / y / w 是排字的范围（h 只截行），返回画了几行、用掉的高、最后一行的行尾。
 * 引子段（§）画小号次要色 + 一道细线（hier.kicker = smallCapsRule，没开时当正文）；决断句（»）居中、强调色、正文 1.1 倍（hier.callout = centredLine）
 */
export function drawRich(e: ElCtx, s: string, a: Rect, opts: RichOpts): RichOut {
  const st = richStyle(e), k = opts.lh ?? 1.7;
  const kickerOn = (e.th.legacy && !chosen(e, 'hier.kicker') ? 'none' : e.r.str('hier.kicker', 'none')) === 'smallCapsRule';
  const calloutOn = (e.th.legacy && !chosen(e, 'hier.callout') ? 'none' : e.r.str('hier.callout', 'none')) === 'centredLine';
  let y = a.y, n = 0, end: RichOut['end'] = null, budget = opts.reveal ?? Infinity;
  const lhOf = (o: TextOpts) => LH(e, o, k);
  const oldNum = e.t.numerals?.family === 'oldstyle';
  // 一段字的宽：旧式数字时数字串按数字字形量（0 / 1 / 2 是 0.74 倍小写高度，B8 审查修复 ⑨：原来按整号字量，居中 / 右对齐 / 两端对齐的行和行尾位置都偏右）
  const isDigit = (ch: string) => ch >= '0' && ch <= '9';
  const runW = (t: string, o: TextOpts) => (oldNum && /\d/.test(t) ? t.split(/(\d+)/).reduce((w, part) => w + (!part ? 0 : isDigit(part[0]) ? numberWidth(e, part, o) : measure(e.tx, part, o)), 0) : measure(e.tx, t, o));
  const paras = s.split('\n');
  for (let pi = 0; pi < paras.length; pi++) {
    const para = paras[pi], kind = paraKind(para), body = strip(para);
    let o = opts.o, align = opts.align ?? 'left';
    if (kind === 'kicker' && kickerOn) o = { ...o, size: o.size * 0.82, color: mutedOf(e, 0.7), upper: true, spacing: 0.12 };
    if (kind === 'callout' && calloutOn) { o = { ...o, size: o.size * 1.1, weight: 700, color: e.accent }; align = 'center'; }
    const lh = lhOf(o);
    const runs = autoRedact(parseRich(body), st.ratio);
    const plain = runs.map((r) => r.text).join('');
    // 首字下沉让出的宽只作用于第一段的前几行：先按让出后的宽折，折出来的行数够了再按整宽折剩下的
    const ind = n === 0 && opts.indent ? opts.indent : null;
    let lines: string[];
    if (ind) {
      const narrow = wrapLines(e.tx, plain, Math.max(10, a.w - ind.w), o);
      const head = narrow.slice(0, ind.lines), rest = plain.slice(head.join('').length).replace(/^\s+/, '');
      lines = [...head, ...(rest ? wrapLines(e.tx, rest, a.w, o) : [])];
    } else lines = wrapLines(e.tx, plain, a.w, o);
    const rows = splitRuns(runs, lines);
    for (let li = 0; li < rows.length; li++) {
      if (opts.maxLines !== undefined && n >= opts.maxLines) return { lines: n, h: y - a.y, end };
      if (y + lh > a.y + a.h + 0.5) return { lines: n, h: y - a.y, end };
      let row = rows[li];
      const x0 = a.x + (ind && n < ind.lines ? ind.w : 0), wAvail = a.w - (x0 - a.x);
      // 省略号（opts.ellipsis）：这是最后能画的一行（下一行超 maxLines 或超高）且后面还有字时，行尾收到放得下「…」
      const lastFit = (opts.maxLines !== undefined && n + 1 >= opts.maxLines) || y + 2 * lh > a.y + a.h + 0.5;
      const more = li < rows.length - 1 || paras.slice(pi + 1).some((q) => strip(q).trim() !== '');
      const cutRow = !!opts.ellipsis && !opts.measureOnly && lastFit && more && row.length > 0;
      if (cutRow) row = ellipsisRow(e, st, row, o, wAvail, runW);
      const looks = row.map((r) => runLook(e, st, r, o));
      const widths = row.map((r, i) => (looks[i].star ? W(e, '★', looks[i].o) : 0) + runW(r.text, looks[i].o));
      const total = widths.reduce((p, q) => p + q, 0);
      const just = align === 'justify' && li < rows.length - 1 && row.length > 0 && !cutRow;
      const gaps = just ? [...row.map((r) => r.text).join('')].length - 1 : 0, extra = just && gaps > 0 ? Math.max(0, (wAvail - total) / gaps) : 0;
      let x = align === 'center' ? x0 + (wAvail - total) / 2 : align === 'right' ? x0 + wAvail - total : x0;
      if (!opts.measureOnly && budget <= 0) return { lines: n, h: y - a.y, end };
      if (!opts.measureOnly) row.forEach((r0, i) => {
        // 逐字显现：这一段只画剩下的字数（截掉的那一截不画，位置照整段排）
        if (budget <= 0) return;
        const cs = [...r0.text], r = budget < cs.length ? { ...r0, text: cs.slice(0, budget).join('') } : r0;
        budget -= cs.length;
        const lk = looks[i];
        if (lk.star) { T(e, '★', x, y, lh, lk.o); x += W(e, '★', lk.o); }
        if (lk.bar) { e.g.fillStyle = lk.bar; e.g.fillRect(x, y + lh * 0.5 - lk.o.size * 0.55, widths[i], lk.o.size * 1.1); x += widths[i]; return; }
        if (lk.chip) drawBox(e.g, { x: x - 2, y: y + lh * 0.5 - lk.o.size * 0.7, w: widths[i] + 4, h: lk.o.size * 1.4 }, { bg: { solid: lk.chip }, radius: 3 }, e.pal);
        if (just && extra > 0) { for (const ch of r.text) { if (oldNum && isDigit(ch)) { drawNumber(e, ch, x, y, lh, lk.o); x += numberWidth(e, ch, lk.o) + extra; } else { T(e, ch, x, y, lh, lk.o); x += measure(e.tx, ch, lk.o) + extra; } } return; }
        // 旧式数字（typ.numerals.family = oldstyle，M12b-07 / B8 顺延的 obra-dinn#10）：长文里的数字串也按数字字形画（高低错落），其余字照旧
        if (oldNum && /\d/.test(r.text)) { for (const part of r.text.split(/(\d+)/)) if (part) x += /^\d/.test(part) ? drawNumber(e, part, x, y, lh, lk.o) : T(e, part, x, y, lh, lk.o); return; }
        x += T(e, r.text, x, y, lh, lk.o);
      });
      else x += total;
      end = { x, y };
      y += lh; n++;
    }
    if (kind === 'kicker' && kickerOn && !opts.measureOnly) { e.g.fillStyle = withAlpha(resolveColor(o.color ?? e.text, e.pal), 0.5); e.g.fillRect(a.x, y - lh * 0.15, a.w, 1); }
  }
  return { lines: n, h: y - a.y, end };
}
/** 截断行（drawRich 的 ellipsis）：从行尾一个字一个字去掉，直到连「…」一起放得下 w；「…」接在最后一段字上（同一字样） */
function ellipsisRow(e: ElCtx, st: Style, row: RichRun[], o: TextOpts, w: number, runW: (t: string, o: TextOpts) => number): RichRun[] {
  const width = (rr: RichRun[]) => rr.reduce((sum, r) => { const lk = runLook(e, st, r, o); return sum + (lk.star ? W(e, '★', lk.o) : 0) + runW(r.text, lk.o); }, 0);
  const cut = row.map((r) => ({ ...r }));
  const ew = measure(e.tx, '…', runLook(e, st, cut[cut.length - 1], o).o);
  while (cut.length && width(cut) + ew > w) {
    const last = cut[cut.length - 1], cs = [...last.text];
    cs.pop();
    if (cs.length) last.text = cs.join(''); else cut.pop();
  }
  if (!cut.length) return [{ ...row[0], text: '…' }];
  const last = cut[cut.length - 1];
  last.text = `${last.text.replace(/\s+$/, '')}…`;
  return cut;
}
/** 量一段富文本要多高（与 drawRich 同一套折行，不画） */
export const measureRich = (e: ElCtx, s: string, w: number, opts: RichOpts): RichOut => drawRich(e, s, { x: 0, y: 0, w, h: Infinity }, { ...opts, measureOnly: true });

/**
 * 标记转成 Godot RichTextLabel 的 BBCode（M12b-57）：colors = 各类的颜色（没给的类不着色，与画布同口径）；涂黑 = [fgcolor=色]…[/fgcolor]（Godot 4 内置：在字上面画一块不透明色块）；
 * 方括号注释照写方括号，段首的 § / » 去掉（引子 = [font_size]，决断句 = [center]）
 */
export function richBBCode(s: string, colors: Partial<Record<Exclude<RichKind, 'category'>, string>> & { category?: string[] }, opts: RichBBOpts = {}): string {
  const cats = colors.category ?? [], nc = cats.length;
  return s.split('\n').map((para) => {
    const kind = paraKind(para);
    const body = parseRich(strip(para)).map((r) => {
      const t = r.text.replace(/\[/g, '[lb]').replace(/(?<!\[lb)\]/g, '[rb]');
      if (r.kind === 'redact' && colors.redact) return `[fgcolor=${colors.redact}]${t}[/fgcolor]`;
      // 类别色按色表循环取（中期审查修复 ㉓：与画布的 lineColor 同口径，色表只有 2 色时 c3–c5 也着色）
      const c = r.kind === 'category' ? (nc ? cats[(((r.cat ?? 0) % nc) + nc) % nc] : undefined) : r.kind === 'plain' ? undefined : colors[r.kind];
      if (c) return `[color=${c}]${t}[/color]`;
      // 单一强调（hier.inline，关键词没进 hier.inlineMap 时）：keyword / star = 强调色、red = 坏色、bold / chip = 粗体（与 runLook 同口径）
      if (r.kind === 'keyword' && opts.inline && opts.inline !== 'none') {
        const ic = opts.inline === 'red' ? opts.bad : opts.inline === 'keyword' || opts.inline === 'star' ? opts.accent : undefined;
        return ic ? `[color=${ic}]${t}[/color]` : opts.inline === 'bold' || opts.inline === 'chip' ? `[b]${t}[/b]` : t;
      }
      return t;
    }).join('');
    // 引子 / 决断句只在画布也这样画时转换（hier.kicker = smallCapsRule、hier.callout = centredLine；没开时当正文，与 drawRich 同口径）
    if (kind === 'callout' && opts.callout) return `[center][b]${opts.accent ? `[color=${opts.accent}]${body}[/color]` : body}[/b][/center]`;
    if (kind === 'kicker' && opts.kicker) return `[font_size=12]${body}[/font_size]`;
    return body;
  }).join('\n');
}
/** richBBCode 的开关（中期审查修复 ㉓，与画布的 drawRich / richStyle 同一套判断，调用方按旧皮肤口径给）：kicker / callout 开没开、单一强调的画法与颜色 */
export interface RichBBOpts { kicker?: boolean; callout?: boolean; inline?: string; accent?: string; bad?: string }
