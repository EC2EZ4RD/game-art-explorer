import { luminance, mix, withAlpha } from '../material';
import { drawCursor } from '../cursors';
import { chevronChain } from '../connectors';
import { ensureContrast, onColorOf, px1080 } from '../sys/theme';
import { drawCard, handCard } from './card';
import { SEG_KINDS, ptShiftAt, spanFull, mapStyleOf, ornColor, cursorCtxOf, cursorInk, cursorSetOf, ownBool, ownCount, ownKey, ownList, ownNum, ownStr, alignX, arrangeCells, artSlot, attachFor, attachOf, attachPoint, avatar, badge, button, buttonText, CELL_MODES, chosen, chosenKey, cmp, cmpKey, DATA, declaredStates, dialogScoped, displayFor, drawNumber, drawValue, elChosen, fmtNumber, numberWidth, postSkinKey, scopedEdge, scopedSet, scopedSilhouette, scopedStr, elCount, elementParts, fitW, gauge, gaugeKind, gaugeOf, icon, iconChip, itemIcon, keyCap, labelShown, LH, lineColor, mutedOf, onAccent, ownArrangement, panel, pickedStr, plate, registerElement, ROUND_GAUGES, elOf, shapeStyle, slot, slotLabelH, slotLabelOf, slotTintOn, FRESH_DEMO, liftOf, stateDemo, T, tap, thicknessOf, valueKind, valuePosOf, valueSize, valueStyle, valueText, W, wellBox, type ElCtx, titlePrefix } from './core';
import { glyphLabel, glyphSetOf, type GlyphSet } from '../glyphs';
import type { PadButton, StatusRole } from '../content/types';
import { borderWidths, drawBox, drawPattern, inFx, isHudCanvas, logBoxRect, QUALITY, fadePaint, fitLine, resolveColor, wrapLines, type Rect, type TextOpts } from '../paint';
import { glyph } from '../ornament';
import { drawnKind, unitParamsChosen, type GaugeExtra } from './gauges';
import { simNow } from '../sim';
import { MAP_STYLE, worldNow } from '../world';
import { fill, pack, vitalsOf } from '../content';
import { samplesFor } from '../content/samples';
import { feedLines, textFor, textPick } from '../content/texts';

/*
 * 局内 HUD 的核心元素（M5a 第一批）：生命、资源、技能、小地图、目标、交互、威胁、命中反馈、通知、计时、速度、准星。
 * 每个元素至少两种画法；画法由 el.<元素>.form（或数值图形 cmp.gauge@el.<元素>）选。
 * 样本字与数值读当前内容包（DATA = pack().hud 的视图；章节、事件、世界上的字用 pack()，docs/c1-content-packs.md 6.2）。
 */

const S = (e: ElCtx, n: number) => n * e.k;

/* 生命 / 护盾 / 体力：画法跟着数值图形（条、分段、心形、血球、环、弧、数字） */
registerElement({
  id: 'el.vitals', forms: ['bar', 'segmented', 'icons', 'orb', 'ring', 'arc', 'number', 'fraction'], anchor: 'tl',
  // 挂到角色身上时（elx.attachTo = player，M12a-15）默认在脚下（Slay the Spire、吸血鬼幸存者）
  attachSide: 'below',
  size: (e) => { const V = vitalsAttach(e); if (V.lockup) return lockupSize(e); if (V.iconValue) return iconValueSize(e); const s = vitalsLayout(e).size; return { w: s.w + V.left + V.right, h: s.h + V.top + V.bottom }; },
  draw: (e, a0) => {
    // 生命条附属件与锁扣（M12b-03）：el.vitals.lockup = badgeBar 整个换画法；attach 含 iconValue 时画成图标内写数；其余附属件按留出的边排在条旁
    const V = vitalsAttach(e);
    if (V.lockup) { drawLockup(e, a0); return; }
    if (V.iconValue) { drawIconValues(e, a0); return; }
    const a = V.left || V.top || V.right || V.bottom ? { x: a0.x + V.left, y: a0.y + V.top, w: a0.w - V.left - V.right, h: a0.h - V.top - V.bottom } : a0;
    const L = vitalsLayout(e), sim = simNow(), g = e.g;
    let first: Rect | null = null;
    // 圆形（orb / ring / arc）：一颗（原来的样子），条数 > 1 时按 elx.arrangement 排成几颗（饥荒的胃 / 心 / 脑品字排，M12a-12），每颗按行颜色
    if (L.mode === 'round') {
      L.rows.forEach((row, i) => {
        const c = L.cells[i], r = { x: a.x + c.x, y: a.y + c.y, w: c.w, h: c.h };
        const vt = valueText(e, row.v, row.max, row.vk, trendOf(row)), center = e.valueLabelPos === 'center' || e.valueLabelPos === 'inside';
        gauge(e, r, row.v, row.form, row.color, center ? vt || undefined : undefined, rowExtra(e, row, i, L.rows.length));
        if (!center) drawValue(e, r, vt, e.valueLabelPos, row.vk);
        if (i === 0) first = r;
      });
      vitalsAfter(e, V, a0, a, first);
      return;
    }
    // 竖条并排（el.vitals.stack = columns；cmp.gauge = vertical 时默认，Stardew 的能量条）：行名 / 图标写在条顶，数值按位置
    if (L.mode === 'columns') {
      L.rows.forEach((row, i) => {
        const c = L.cells[i], x = a.x + c.x;
        if (L.labels === 'text') T(e, row.name, x + c.w / 2 - W(e, row.name, e.small) / 2, a.y, L.capH, { ...e.small, color: withAlpha(e.text, 0.85) });
        else if (L.labels === 'icon') iconChip(e, row.icon, x + c.w / 2, a.y + L.capH / 2, S(e, 12), row.color);
        const br = { x: x + (c.w - L.bw) / 2, y: a.y + L.capH + (e.valueLabelPos === 'above' ? L.vh : 0) + L.ch * (1 - row.len), w: L.bw, h: L.ch * row.len };
        gauge(e, br, row.v, row.form, row.color, undefined, rowExtra(e, row, i, L.rows.length));
        scopedEdge(e, br, S(e, 2));
        drawValue(e, br, valueText(e, row.v, row.max, row.vk, trendOf(row)), e.valueLabelPos, row.vk);
        if (i === 0) first = br;
      });
      vitalsAfter(e, V, a0, a, first);
      return;
    }
    // 横排的行：行名列（文字 / 图标 / 不写）+ 条 + 数值标注（M12a-12 / 13）
    L.rows.forEach((row, i) => {
      const y = a.y + S(e, 4) + i * L.rowH + (e.valueLabelPos === 'above' ? L.vh : 0);
      const lh = L.rowH0 - S(e, 6);
      if (L.labels === 'text') T(e, row.name, a.x, y, lh, { ...e.small, color: withAlpha(e.text, 0.85) });
      else if (L.labels === 'icon') iconChip(e, row.icon, a.x + L.lab / 2 - S(e, 3), y + lh / 2, S(e, 14), row.color);
      const bh = ('rowBH' in L && L.rowBH[i]) || S(e, L.kind === 'icons' ? 12 : 10) * L.th;
      // L.pre：行名列与条之间给条左端附属件留的空（B5 审查修复 ⑬）
      const br = { x: a.x + L.lab + L.pre, y: y + lh / 2 - bh / 2, w: (a.w - L.lab - L.pre - L.vw) * row.len, h: bh };
      // 生命条的拖尾 / 闪光 / 低血量脉冲（M5b 模拟）
      if (i === 0 && sim.hpGhost > row.v + 0.002 && (row.form === 'bar' || row.form === 'thinBar' || row.form === 'segmented')) { g.fillStyle = e.th.roles.ghost; g.fillRect(br.x + br.w * row.v, br.y, br.w * (sim.hpGhost - row.v), br.h); }
      gauge(e, br, row.v, row.form, row.color, undefined, rowExtra(e, row, i, L.rows.length));
      if (i === 0 && sim.barFlash > 0) { g.save(); g.globalAlpha = sim.barFlash * 0.7; g.fillStyle = sim.barFlashColor; g.fillRect(br.x, br.y, br.w, br.h); g.restore(); }
      if (i === 0 && sim.lowPulse > 0) { g.save(); g.globalAlpha = 0.2 + sim.lowPulse * 0.4; g.fillStyle = '#ff2d2d'; g.fillRect(br.x, br.y, br.w * row.v, br.h); g.restore(); }
      // 按目标描边（M12b-68，hades#1）：vis.stroke / strokeColor@el.vitals 写了时每一条外面一圈细框（Hades 的金色细双线）
      scopedEdge(e, br, S(e, 2));
      // 数值标注（M12a-13）：inside / center 压条居中（原来不论位置都画在条尾、还越出元素框），end 在条后（宽已算进元素框），above / below 占一行；
      // 逐行的种类 el.vitals.rowLabels（M12b-68，hades#51：第二条神力槽不写数）
      drawValue(e, br, valueText(e, row.v, row.max, row.vk, trendOf(row)), e.valueLabelPos, row.vk, {}, SEG_KINDS.has(row.form));
      if (i === 0) first = br;
    });
    vitalsAfter(e, V, a0, a, first);
  },
});

/** 生命类一行（M12a-12）：名字、当前比例（第一行跟模拟的生命值走）、上限、行名图标、颜色、画法、条长比例（lengthByMax）、数值标注的种类（M12b-68 的 rowLabels） */
interface VitalLine { name: string; v: number; max: number; icon: string; color: string; form: string; len: number; vk: string; types?: string[]; recover?: number; cap?: string; trend?: number }
/** 行名图标的兜底（包的 vitals 没写 icon、或包只有 vitalNames 时） */
const VITAL_ICONS = ['♥', '◆', '✦', '●'];
/** el.vitals.rowIcons 的取值 → 符号（M12b-68，control#32：Control 的血条前是 + 号，不是按行语义写死的心形） */
const ROW_ICONS: Record<string, string> = { heart: '♥', plus: '✚', shield: '⛨', bolt: '⚡', star: '★', diamond: '◆', circle: '●', skull: '☠', sun: '☀', moon: '☾' };
/**
 * 圆形数值图形（一颗 96 的圆）：原来的 orb / ring / arc，加 B5 的转速表 / 环徽（B5 审查修复 ⑫：原来按 10 高的横行排，画成 5 半径的小点）。
 * dial 不加：M12a 起它在生命条里就按行排（K1 家族有全局 cmp.gauge = dial 的），改了会变默认画面
 */
const ROUND_VITALS = new Set(['orb', 'ring', 'arc', 'tachometer', 'arcDots']);
/**
 * 竖条并排（columns）时照选的画的画法（B5 审查修复 ④ / ⑩）：原来只留 vertical / icons / 数字 / 星，其余一律换成 vertical——B5 能竖着画的灯段 / 小格 / 菱形点 / 字符条 / 比例尺 /
 * 玻璃管 / 卦象 / 节点轨道 / 双向条 / 点亮节点也被换掉（dead-space#1 的脊柱灯段画不出来）。bar / thinBar（与没选单位参数的 segmented）照旧换成 vertical；旧皮肤冻结成横条的取值也换
 */
const COLUMN_KINDS = new Set(['vertical', 'icons', 'number', 'fraction', 'percent', 'stars', 'lightStrip', 'pips', 'diamondPips', 'textBar', 'scaleBar', 'thermometer', 'pressureTube', 'trigram', 'track', 'bipolar', 'lightUp']);
/** cmp.gaugeDir 管得着的离散画法：选了 v 时 el.vitals 自动竖排（stack = auto） */
const DIR_KINDS = new Set(['pips', 'diamondPips', 'lightStrip', 'segmented']);
/** 横行里要更高条高的仪表类画法（设计单位，× elx.thickness）：心电图 26、压力计 24、眼睛 / 温度计 22 */
const TALL_ROW: Record<string, number> = { ecg: 26, pressureTube: 24, eye: 22, thermometer: 22 };

/**
 * 生命 / 护盾 / 体力的行（M12a-12）：内容包的 vitals（没写时由 hp / shield / stamina / vitalNames 兼容出三行，上限都是 hpMax——数值标注与原来一样）；
 * 条数 el.vitals.count；第 i 行的画法 el.vitals.rowForms[i]（没给时整组的 cmp.gauge，第二行起 icons 画成横条——原来的写法）；
 * 颜色 el.vitals.rowColors[i]（角色名 accent / accent2 / good / warn / bad / danger / health / text……或 #hex），没给时回落：
 *   第 0 行生命色、第 1 行第二强调色（col.accent@ / col.accent2@el.vitals 经 e.fill 换）、其余好色（原来的颜色）
 */
function vitalLines(e: ElCtx): VitalLine[] {
  const src = vitalsOf(DATA);
  const n = Math.max(1, Math.min(Math.min(4, src.length), ownNum(e, 'count', 2)));
  const kind = cmp(e, 'cmp.gauge', 'bar');
  // 逐行的值保留序号：'auto' / 空 = 这一行用默认（审查修复 A · C2：原来先滤掉 auto 再按行取，["auto","segmented"] 把 segmented 放到了第 0 行）
  const perRow = (k: string) => ownList(e, k).map((x) => (x && x !== 'auto' ? x : undefined));
  const forms = perRow('rowForms'), colors = perRow('rowColors');
  // 逐行图标与逐行数值标注（M12b-68）：同一写法（'auto' / 空 = 这一行默认：图标 = 包里写的，标注 = 整组的 elx.valueLabel）
  const icons = perRow('rowIcons'), labels = perRow('rowLabels');
  const byMax = ownBool(e, 'lengthByMax'), minLen = Math.max(0.05, Math.min(1, ownNum(e, 'lenRange', 0.3)));
  const top = Math.max(...src.slice(0, n).map((x) => x.max || 1));
  const sim = simNow();
  return src.slice(0, n).map((x, i) => {
    const def = i ? (kind === 'icons' ? 'bar' : kind) : kind;
    const c = colors[i];
    const color = c ? vitalColor(e, c) : i === 0 ? e.fill(0, 'health') : i === 1 ? e.fill(1, e.accent2) : e.good;
    const ic = icons[i] ? ROW_ICONS[icons[i]!] : undefined;
    // 类型心 / 可回复段 / 帽头字母 / 趋势（M12b-02 / 03）：包里写了用包的；第一行的趋势跟模拟（受击后 ▼），其余没写 = 不画箭头
    const trend = x.trend ?? (i === 0 && sim.hpGhost > sim.hp + 0.002 ? -1 : undefined);
    return { name: x.name, v: i === 0 ? sim.hp : x.v, max: x.max, icon: ic ?? x.icon ?? VITAL_ICONS[i % VITAL_ICONS.length], color, form: forms[i] ?? def, len: byMax ? Math.max(minLen, (x.max || 1) / top) : 1, vk: labels[i] ?? e.valueLabel, types: x.types, recover: x.recover, cap: x.cap, trend };
  });
}
/** rowColors 的一项：颜色角色名 / accent / accent2 / text，或直接的颜色 */
function vitalColor(e: ElCtx, c: string): string {
  if (c === 'accent') return e.accent;
  if (c === 'accent2') return e.accent2;
  if (c === 'text') return e.text;
  const ro = e.th.roles as unknown as Record<string, unknown>;
  return typeof ro[c] === 'string' ? (ro[c] as string) : c;
}

/**
 * 生命条的排版（M12a-12）：
 *   round：画法是 orb / ring / arc——一颗 96 的圆，条数 > 1 时按元素级 elx.arrangement（row / column / pyramid（倒三角）/ grid / ring……）排；
 *   columns：竖条并排（el.vitals.stack = columns；auto 时 cmp.gauge = vertical 就是它），每条宽 18 × 粗细、高 120，贴右的元素第一条在最右；
 *   rows：横条一行一条（原来的排法）：行名列（el.vitals.labels = text / icon / none，elx.label = hide 等于 none）、条粗 10 × elx.thickness、
 *     条后的数值标注算进宽（原来不论位置都按条尾留宽），条上 / 条下的标注每行多一行字高。条长 el.vitals.lengthByMax：按各行上限的比例（最短 el.vitals.lenRange）
 */
function vitalsLayout(e: ElCtx) {
  const rows = vitalLines(e), th = thicknessOf(e);
  const lv = ownStr(e, 'labels', 'auto'), labels = lv === 'text' || lv === 'icon' || lv === 'none' ? lv : labelShown(e) ? 'text' : 'none';
  // 数值标注占的地方：按最长的「满值」字量（行名列量过之后再量，与原来的量字顺序一样）；逐行种类（rowLabels）不同时取最宽 / 最高的那一行
  const top = Math.max(...rows.map((x) => x.max)), kinds = [...new Set(rows.map((x) => x.vk))];
  const vext = () => {
    const vs = kinds.map((k) => valueSize(e, valueText(e, 1, top, k), e.valueLabelPos, k)), w = Math.max(0, ...vs.map((q) => q.w)), h = Math.max(0, ...vs.map((q) => q.h));
    return { vw: e.valueLabelPos === 'end' ? w : 0, vh: e.valueLabelPos === 'above' || e.valueLabelPos === 'below' ? h : 0 };
  };
  const base = { rows, th, labels, kind: cmp(e, 'cmp.gauge', 'bar'), vw: 0, vh: 0, cells: [] as { x: number; y: number; w: number; h: number }[], lab: 0, pre: 0, rowH: 0, rowH0: 0, capH: 0, bw: 0, ch: 0 };
  // 旧皮肤冻结成横条的新画法按横条排（与 gaugeDecor 同口径）
  const eb = e.part('bar'), drawn = (k: string) => drawnKind(eb, k);
  if (ROUND_VITALS.has(drawn(rows[0].form))) {
    const { vw, vh } = vext();
    const mode0 = ownArrangement(e), mode = CELL_MODES.has(mode0) ? mode0 : 'row';
    const L = arrangeCells(rows.length, { w: S(e, 96), h: S(e, 96) }, mode, { gap: S(e, 8), invert: mode === 'pyramid' });
    for (const r of rows) if (!ROUND_VITALS.has(drawn(r.form))) r.form = rows[0].form;
    return { ...base, mode: 'round' as const, vw, vh, cells: L.rects, size: { w: L.bbox.w + vw, h: L.bbox.h + vh } };
  }
  const st = ownStr(e, 'stack', 'auto');
  // 选了 cmp.gaugeDir = v 的离散画法（灯段 / 小格 / 菱形点 / 单位格）在 stack = auto 时竖排（B5 审查修复 ⑨：原来照横行排，一行 10 高里竖着排 10 格）
  const dirV = pickedStr(eb, 'cmp.gaugeDir', 'auto') === 'v' && DIR_KINDS.has(drawn(rows[0].form)) && (rows[0].form !== 'segmented' || unitParamsChosen(eb));
  if (st === 'columns' || (st !== 'rows' && (rows[0].form === 'vertical' || dirV))) {
    for (const r of rows) { const k = drawn(r.form); if (!COLUMN_KINDS.has(k) && !(k === 'segmented' && unitParamsChosen(eb))) r.form = 'vertical'; }
    const bw = S(e, 18) * th, ch = S(e, 120), capH = labels === 'none' ? 0 : Math.max(S(e, 16), LH(e, e.small)), gap = S(e, 8);
    const names = rows.map((r) => (labels === 'text' ? W(e, r.name, e.small) : 0)), { vw, vh } = vext();
    const ws = names.map((nw) => Math.max(bw, nw) + vw);
    // 贴右边的元素（screenAnchor = tr / mr / br）第一条在最右，其余往左排
    const right = /r$/.test(String(elOf(e, 'screenAnchor') ?? ''));
    const order = right ? ws.map((_, i) => ws.length - 1 - i) : ws.map((_, i) => i);
    const cells = ws.map(() => ({ x: 0, y: 0, w: 0, h: ch }));
    let x = 0;
    for (const i of order) { cells[i] = { x, y: 0, w: ws[i], h: ch }; x += ws[i] + gap; }
    return { ...base, mode: 'columns' as const, vw, vh, cells, bw, ch, capH, size: { w: Math.max(0, x - gap), h: capH + ch + vh } };
  }
  // 行名列 = 最宽的行名 + 8（M8b：翻译变长、字放大时不压到条上）；图标列 = 图标 + 8
  const lab = labels === 'text' ? Math.max(...rows.map((r) => W(e, r.name, e.small))) + S(e, 8) : labels === 'icon' ? S(e, 22) : 0;
  const { vw, vh } = vext();
  // 仪表类画法在横行里要的条高（B5 审查修复 ⑫ 留给 B6 · 18 定的：心电图 / 眼睛 / 压力计 / 温度计原来按 10 高的横条画，挤成一条线）：这些行的条高按 TALL_ROW、行高跟着加高；没有这类行时与原来一样
  const rowBH = rows.map((r) => { const t = TALL_ROW[drawn(r.form)]; return t ? S(e, t) * th : 0; }), tallH = Math.max(0, ...rowBH);
  const rowH0 = Math.max(S(e, 22), LH(e, e.small) + S(e, 6), S(e, 10) * th + S(e, 8), tallH ? tallH + S(e, 8) : 0);
  // 条左端的附属件（端徽 / 盾徽 / 帽头）在写了行名时留在行名列与条之间（B5 审查修复 ⑬：原来留在元素最左、行名之前，附属件按条的起点画、压在行名的最后一个字上）
  const pre = labels !== 'none' ? leftExtrasW(e, false) : 0;
  return { ...base, mode: 'rows' as const, vw, vh, lab, pre, rowBH, rowH: rowH0 + vh, rowH0, size: { w: Math.max(S(e, 220), lab + S(e, 150) + vw) + pre, h: S(e, 14) + (rowH0 + vh) * rows.length } };
}

/* ---------------- 生命条附属件与锁扣（M12b-03） ---------------- */

/** 数值标注 = trend（M12b-02）时的方向（正 ▲ / 负 ▼）：行里写了 trend 用它，否则 ▼（受击）；别的种类不传（数值标注照旧） */
const trendOf = (row: VitalLine) => (row.vk === 'trend' ? row.trend ?? -1 : undefined);
/** 条状态行的默认图标（与 el.overlay 的状态图标同一组样本；层数画在右下） */
const STATUS_ROW: [string, StatusRole, number?][] = [['!', 'warn', 2], ['Z', 'info'], ['♥', 'danger', 3]];
/**
 * 一行生命条给数值图形的额外数据（M12b-02 / 03）：样本上限（离散族的格数）、心的类型、可回复段（第一行没写时 0.15）、帽头字母（行名首字）、
 * 格挡（第一行，包的 hud.block，没写时 6）、端徽数字（第一行 = 等级）、状态行（最后一行，包的 statusIcons）、球心图标。这些只在选了对应参数时才画
 */
function rowExtra(e: ElCtx, row: VitalLine, i: number, n: number): GaugeExtra {
  return {
    max: row.max, types: row.types, icon: row.icon,
    recover: i === 0 ? row.recover ?? 0.15 : row.recover,
    cap: row.cap ?? [...row.name][0],
    ...(i === 0 ? { shield: DATA.block ?? 6, badge: String(DATA.profile.level).replace(/\D/g, '') || undefined } : {}),
    ...(i === n - 1 ? { status: DATA.statusIcons ?? STATUS_ROW } : {}),
  };
}
/** 死亡抗拒「◆ 1/3」占的宽（el.vitals.attach = lives） */
const livesW = (e: ElCtx) => { const [a, b] = DATA.lives ?? [1, 3]; return S(e, 26) + numberWidth(e, `${a}/${b}`, { ...e.small, weight: 700 }); };
/**
 * 生命条附属件与锁扣的设定（M12b-03）：el.vitals.attach（多选：lives 死亡抗拒、charges 弹药圆点、levelBadge 等级方框、iconValue 图标内写数、statusFace 状态头像）、
 * el.vitals.lockup（badgeBar = 圆徽 + 斜切主条 + 副槽共用墨边）、cmp.gaugeExtra@el.vitals 的端徽 / 盾徽 / 帽头 / 状态行——按它们给条旁留边。都没选时边全是 0（排版与原来一样）
 */
/** 条左端的附属件（cmp.gaugeExtra@el.vitals 的端徽 / 盾徽 / 横条帽头）要留的宽（cols = 竖排：帽头在条顶，不占左边） */
function leftExtrasW(e: ElCtx, cols: boolean): number {
  const xk = chosenKey(e.part('bar'), 'cmp.gaugeExtra'), ex = xk ? e.r.list(xk) : [];
  return ex.includes('endBadge') || ex.includes('shieldTint') || (ex.includes('capLabel') && !cols) ? S(e, 22) : 0;
}
function vitalsAttach(e: ElCtx) {
  const ak = chosenKey(e, ownKey(e, 'attach')), att = ak ? e.r.list(ak).filter((x) => x && x !== 'auto' && x !== 'none') : [];
  const lockup = pickedStr(e, ownKey(e, 'lockup'), 'none') === 'badgeBar';
  const xk = chosenKey(e.part('bar'), 'cmp.gaugeExtra'), ex = xk ? e.r.list(xk) : [];
  const L = ex.length ? vitalsLayout(e) : null, cols = ex.includes('capLabel') && L?.mode === 'columns';
  const face = att.includes('statusFace') ? S(e, 48) : 0;
  // 横排且写了行名时，条左端附属件的空留在行名列之后（vitalsLayout 的 pre），这里不再留
  const left = face + (att.includes('levelBadge') ? S(e, 26) : 0) + (L?.mode === 'rows' && L.labels !== 'none' ? 0 : leftExtrasW(e, cols));
  const top = (att.includes('charges') ? S(e, 14) : 0) + (cols ? S(e, 24) : 0);
  const right = att.includes('lives') ? livesW(e) : 0, bottom = ex.includes('statusRow') ? S(e, 20) : 0;
  return { att, lockup, iconValue: att.includes('iconValue'), face, left, top, right, bottom };
}
/** 附属件（画在条之后）：状态头像在左、等级方框在第一条左端、弹药圆点在第一条上方、死亡抗拒在第一条右边 */
function vitalsAfter(e: ElCtx, V: ReturnType<typeof vitalsAttach>, a0: Rect, a: Rect, first: Rect | null) {
  if (!V.att.length) return;
  const f = first ?? { x: a.x, y: a.y, w: a.w, h: S(e, 10) }, cy = f.y + f.h / 2;
  if (V.att.includes('statusFace')) { const s = Math.min(S(e, 44), a0.h); statusFace(e, { x: a0.x, y: a0.y + (a0.h - s) / 2, w: s, h: s }, simNow().hp); }
  if (V.att.includes('levelBadge')) {
    // 等级方框（CP2077：血条左端嵌一个写等级的小方框）
    const s = S(e, 22), q = { x: a.x - S(e, 24), y: cy - s / 2, w: s, h: s };
    drawBox(e.g, q, { bg: { solid: withAlpha('#000', 0.55) }, border: { width: Math.max(1, S(e, 1.5)), color: e.accent }, radius: 0 }, e.pal);
    const lv = String(DATA.profile.level).replace(/\D/g, '') || '1', o = { ...e.small, size: s * 0.55, weight: 800, color: e.accent };
    drawNumber(e, lv, q.x + s / 2 - numberWidth(e, lv, o) / 2, q.y, s, o);
  }
  if (V.att.includes('charges')) {
    // 弹药 / 充能圆点（Hades 血条上方的两颗施法弹药）：有的实心、用掉的空心
    const [have, max] = DATA.charges ?? [2, 3], r = S(e, 4);
    for (let i = 0; i < max; i++) { const x = f.x + r + i * r * 2.8, y = f.y - S(e, 8); e.g.beginPath(); e.g.arc(x, y, r, 0, Math.PI * 2); if (i < have) { e.g.fillStyle = e.accent2; e.g.fill(); } else { e.g.strokeStyle = e.accent2; e.g.lineWidth = Math.max(1, S(e, 1.2)); e.g.stroke(); } }
  }
  if (V.att.includes('lives')) {
    // 死亡抗拒（Hades：红宝石 + 「1 / 3」）：紧跟在第一条的右边
    const [n0, n1] = DATA.lives ?? [1, 3], x = a.x + a.w + S(e, 4), s = `${n0}/${n1}`, o = { ...e.small, weight: 700 };
    iconChip(e, DATA.livesIcon ?? '◆', x + S(e, 9), cy, S(e, 14), e.fill(0, 'danger'));
    drawNumber(e, s, x + S(e, 20), cy - LH(e, o, 1.2) / 2, LH(e, o, 1.2), o);
  }
}
/**
 * 状态头像（el.vitals.attach = statusFace，90 年代 FPS 状态栏的身份件）：程序画的一张脸，随血量换表情——
 * 高于 2/3 平静、1/3 以上皱眉咬牙、更低时挂彩张嘴；刚受击（模拟的拖尾还在）时眼睛瞟向一边。Godot：按血量档切 AnimatedSprite2D 的帧（同一张图集）
 */
function statusFace(e: ElCtx, q: Rect, hp: number) {
  const g = e.g, cx = q.x + q.w / 2, cy = q.y + q.h / 2, R = q.w * 0.38, tier = hp > 0.66 ? 0 : hp > 0.33 ? 1 : 2, look = simNow().hpGhost > hp + 0.002 ? -R * 0.12 : 0;
  panel(e, q, true);
  g.save();
  g.fillStyle = '#d9a477'; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = Math.max(1, S(e, 1.2));
  g.beginPath(); g.ellipse(cx, cy + R * 0.08, R * 0.85, R, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // 头发
  g.fillStyle = '#5a3a22'; g.beginPath(); g.ellipse(cx, cy - R * 0.62, R * 0.86, R * 0.42, 0, Math.PI, Math.PI * 2); g.fill();
  // 眉眼：表情越差眉毛越往中间压
  g.strokeStyle = '#2a1a10'; g.lineWidth = Math.max(1, R * 0.1); g.lineCap = 'round';
  const brow = [0, R * 0.1, R * 0.18][tier];
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + s * R * 0.55, cy - R * 0.3); g.lineTo(cx + s * R * 0.15, cy - R * 0.3 + brow); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + s * R * 0.35, cy - R * 0.08, R * 0.16, R * 0.11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(cx + s * R * 0.35 + look, cy - R * 0.08, R * 0.07, 0, Math.PI * 2); g.fill();
  }
  // 嘴：平静 = 微笑、皱眉 = 咬牙一条线、挂彩 = 张嘴
  g.beginPath();
  if (tier === 0) { g.arc(cx, cy + R * 0.3, R * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  else if (tier === 1) { g.moveTo(cx - R * 0.3, cy + R * 0.45); g.lineTo(cx + R * 0.3, cy + R * 0.45); g.stroke(); }
  else { g.fillStyle = '#5a1010'; g.ellipse(cx, cy + R * 0.48, R * 0.24, R * 0.16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b3121a'; for (const [dx, dy, rr] of [[-0.5, -0.5, 0.12], [0.45, 0.2, 0.09], [-0.2, 0.75, 0.08]] as const) { g.beginPath(); g.arc(cx + dx * R, cy + dy * R, rr * R, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}
/** 锁扣（el.vitals.lockup = badgeBar）的尺寸：一块圆徽 + 斜切主条 + 副槽 */
const lockupSize = (e: ElCtx) => ({ w: S(e, 280), h: S(e, 64) });
/**
 * 锁扣（el.vitals.lockup = badgeBar，hi-fi-rush#0：吉他剪影血条）：左端圆徽（母题符号 / 第一行图标）、斜切的主条（第一行，斜向分段）、贴在主条下沿的副槽（第二行），
 * 三块共用一圈粗墨边（先把三块的外形都描一遍粗墨线，再各自填色）。Godot：一个自绘 Control（_draw 三个多边形 + 两层描边），或九宫格纹理 + 两个 TextureProgressBar
 */
function drawLockup(e: ElCtx, a: Rect) {
  const g = e.g, rows = vitalLines(e), R = a.h * 0.46, cx = a.x + R + S(e, 2), cy = a.y + a.h / 2;
  const x0 = cx + R * 0.55, x1 = a.x + a.w - S(e, 4), mh = a.h * 0.32, my = cy - mh * 0.85, sl = mh * 0.7;
  const sy = my + mh + S(e, 2), sh = a.h * 0.13, sx1 = x0 + (x1 - x0) * 0.72;
  const para = (l: number, t: number, r: number, h: number, s: number) => { g.beginPath(); g.moveTo(l + s, t); g.lineTo(r, t); g.lineTo(r - s, t + h); g.lineTo(l, t + h); g.closePath(); };
  const ink = '#111', lw = Math.max(2, S(e, 5));
  g.save();
  // 共用墨边：三块外形先描粗墨线（圆徽最后再描一次盖在条的端头上）
  g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = lw;
  para(x0 - R * 0.3, my, x1, mh, sl); g.stroke();
  para(x0 - R * 0.2, sy, sx1, sh, sh * 0.7); g.stroke();
  // 主条：底槽 + 第一行的填充，斜向分段
  const track = withAlpha('#000', 0.55);
  para(x0 - R * 0.3, my, x1, mh, sl); g.fillStyle = track; g.fill();
  g.save(); para(x0 - R * 0.3, my, x1, mh, sl); g.clip();
  const v0 = Math.max(0, Math.min(1, rows[0]?.v ?? 0.7)), fx = x0 - R * 0.3 + (x1 - x0 + R * 0.3) * v0;
  g.fillStyle = rows[0]?.color ?? e.good; g.fillRect(x0 - R * 0.3, my, fx - x0 + R * 0.3, mh);
  g.strokeStyle = withAlpha(ink, 0.45); g.lineWidth = Math.max(1, S(e, 2));
  for (let x = x0; x < x1 + sl; x += S(e, 14)) { g.beginPath(); g.moveTo(x + sl, my); g.lineTo(x, my + mh); g.stroke(); }
  g.restore();
  // 副槽：第二行
  para(x0 - R * 0.2, sy, sx1, sh, sh * 0.7); g.fillStyle = track; g.fill();
  g.save(); para(x0 - R * 0.2, sy, sx1, sh, sh * 0.7); g.clip();
  const v1 = Math.max(0, Math.min(1, rows[1]?.v ?? 0.5)); g.fillStyle = rows[1]?.color ?? e.accent2; g.fillRect(x0 - R * 0.2, sy, (sx1 - x0 + R * 0.2) * v1, sh);
  g.restore();
  // 圆徽：强调色底 + 粗墨圈 + 母题符号（没有母题时第一行的图标）
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = e.accent; g.fill(); g.strokeStyle = ink; g.lineWidth = lw; g.stroke();
  const motif = e.t.panel.ornament?.motif ?? e.r.str('vis.motif', 'none');
  if (motif && motif !== 'none' && motif !== 'auto') { g.save(); g.translate(cx, cy); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, R * 0.08); glyph(g, motif, R * 1.1); g.restore(); }
  else icon(e, rows[0]?.icon ?? '⚡', cx, cy, R * 1.1, '#fff');
  g.restore();
}
/** 图标内写数（el.vitals.attach = iconValue，disco-elysium#13）的尺寸：每行一块 34 的色块，横排 */
const iconValueSize = (e: ElCtx) => { const n = vitalLines(e).length; return { w: n * S(e, 34) + (n - 1) * S(e, 6), h: S(e, 34) }; };
/** 图标内写数：每行一块行色的圆角色块，块里淡淡一个行图标、正中写当前值（Disco 的生命橙十字 / 士气青脑形） */
function drawIconValues(e: ElCtx, a: Rect) {
  vitalLines(e).forEach((row, i) => {
    const s = S(e, 34), q = { x: a.x + i * (s + S(e, 6)), y: a.y + (a.h - s) / 2, w: s, h: s };
    drawBox(e.g, q, { bg: { solid: row.color }, border: { width: Math.max(1, S(e, 1.5)), color: 'rgba(0,0,0,0.7)' }, radius: S(e, 5) }, e.pal);
    icon(e, row.icon, q.x + s / 2, q.y + s / 2, s * 0.8, withAlpha('#fff', 0.3));
    const n = String(Math.round(row.v * row.max)), o = { ...e.title, size: s * 0.46, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } };
    drawNumber(e, n, q.x + s / 2 - numberWidth(e, n, o) / 2, q.y, s, o);
  });
}

/* 资源 / 货币 */
registerElement({
  id: 'el.resources', forms: ['iconNumber', 'pills', 'bigNumber', 'gauge', 'framedCounter', 'odometer', 'iconNumberBar', 'labeledStrip', 'statGrid'], anchor: 'tr',
  size: (e) => {
    const f = e.forms[0];
    if (RES_NEW.has(f)) return resNewSize(e, f);
    if (f === 'bigNumber') { const d = resDelta(e, 0); return { w: Math.max(S(e, 170), d ? S(e, 36) + numberWidth(e, fmtNumber(e, DATA.gold), { ...e.big, size: S(e, 30), ...displayFor(e, 'numerals') }) + S(e, 6) + W(e, d, valueStyle(e, d, 'end', 'delta')) + S(e, 6) : 0), h: S(e, 46) }; }
    if (f === 'gauge') { const G = resGauge(e); return G.round ? G.bbox : { w: S(e, 180), h: S(e, 30) + S(e, 10) * G.th }; }
    // 项数多了 / 带增量时按量出来的宽排（原来固定 250 宽；三项不带增量时仍是 250，不用量）
    if (elCount(e, 3) === 3 && valueKind(e) !== 'delta') return { w: S(e, 250), h: S(e, 30) };
    return { w: Math.max(S(e, 250), resItems(e).reduce((s, it) => s + resItemW(e, it), 0)), h: S(e, 30) };
  },
  // 数字 + 符号的实际宽（M12b-65 ②：共用底条里一项金额不再占 250 宽）；大数字 / 计量照旧
  fitW: (e) => (e.forms[0] === 'iconNumber' || e.forms[0] === 'pills' ? resItems(e).reduce((s, it) => s + resItemW(e, it), 0) + S(e, 4) : Infinity),
  draw: (e, a) => {
    const f = e.forms[0];
    if (RES_NEW.has(f)) { drawResNew(e, a, f); return; }
    const [r0, , r2] = DATA.res;
    const gold = e.fill(0, 'currency');
    // 主货币的数字色（M12b-68，balatro#3）：col.accent@el.resources 选过时用作用域强调色（Balatro 的金色 $），否则原来的字色
    const numC = scopedSet(e, 'col.accent') ? e.accent : undefined;
    if (f === 'bigNumber') {
      const bo = { ...e.big, size: S(e, 30), ...(numC ? { color: numC } : {}), ...displayFor(e, 'numerals') }, n = fmtNumber(e, DATA.gold);
      // 增量（elx.valueLabel = delta，M12a-13）：大数字后面一个小号的 +n / -n
      const d = resDelta(e, 0), dO = d ? valueStyle(e, d, 'end', 'delta') : null;
      // 内容按锚点对齐（M12a-18）：锚在右边时整组贴右缘（原来总从盒子左缘起，右上角留一截）
      const nw = numberWidth(e, n, bo), cw = S(e, 36) + nw + (d && dO ? S(e, 6) + W(e, d, dO) : 0), x0 = e.align === 'left' ? a.x : alignX(e, a, Math.min(a.w, cw));
      if (!itemIcon(e, r0[1], x0 + S(e, 16), a.y + a.h / 2, S(e, 26))) iconChip(e, r0[0], x0 + S(e, 16), a.y + a.h / 2, S(e, 26), gold);
      drawNumber(e, n, x0 + S(e, 36), a.y, a.h, bo);
      if (d && dO) T(e, d, x0 + S(e, 36) + nw + S(e, 6), a.y - (supOf(e) ? a.h * 0.28 : 0), a.h, supOf(e) ? { ...dO, size: dO.size * 0.78 } : dO);
      // 按目标描边（M12b-68，black-myth#0）：vis.stroke / strokeSides@el.resources 写了时沿数字画框 / 下划线（黑神话货币下的一道细线、Elden 卢恩数的细框盒）
      scopedEdge(e, { x: x0, y: a.y, w: Math.min(a.w, cw), h: a.h });
      return;
    }
    if (f === 'gauge') {
      // 数值图形读 cmp.gauge@el.resources（M12a-11，原来写死横条）：orb / ring / arc 是一颗约 96 的圆（StS 的能量球，数值写在球心），
      // elx.count > 1 时按 elx.arrangement 排成几颗（ring = 环形排）；横条类是原来的「物品名 + 条 + x / y」
      const G = resGauge(e), v = DATA.wood / DATA.resGoal;
      if (G.round) {
        const vk = valueKind(e, 'currentMax'), pos = valuePosOf(e, 'center');
        G.cells.forEach((c, i) => { const vi = RES_FILL[i % RES_FILL.length] ?? v; gaugeOf(e, { x: a.x + c.x, y: a.y + c.y, w: c.w, h: c.h }, i ? vi : v, i, 'bar', { fixed: true, role: i ? e.icon : 'good', value: { text: valueText(e, i ? vi : v, DATA.resGoal, vk), pos, kind: vk } }); });
        return;
      }
      if (labelShown(e)) T(e, r2[1], a.x, a.y, S(e, 16), e.small);
      const br = { x: a.x, y: a.y + S(e, 20), w: a.w, h: S(e, 10) * G.th };
      // 数值标注：没显式给时是原来右上角的「x / y」，给了按 elx.valueLabel / Pos（M12a-13）
      const vk = valueKind(e, 'auto');
      gaugeOf(e, br, v, 0, 'bar', { fixed: true, role: 'good', value: vk === 'auto' ? undefined : { text: valueText(e, v, DATA.resGoal, vk), pos: e.valueLabelPos, kind: vk } });
      if (vk === 'auto') { const s = `${DATA.wood} / ${DATA.resGoal}`; drawNumber(e, s, a.x + a.w - numberWidth(e, s, e.small), a.y, S(e, 16), e.small); }
      return;
    }
    // 内容按锚点对齐（M12a-18）：锚在右边从右缘往左排（原来的），左边从左缘起、中间居中（原来一律贴右缘：锚在左上时离左边一截，dead-cells#20）
    const items = resItems(e), total = items.reduce((s0, it) => s0 + resItemW(e, it), 0);
    let x = e.align === 'right' ? a.x + a.w : alignX(e, a, Math.min(a.w, total)) + Math.min(a.w, total);
    const x1 = x;
    for (const [it, i] of items.map((q, k) => [q, k] as const).reverse()) {
      const [ch, n, item, c, d, nc] = it;
      const w = resItemW(e, it);
      x -= w;
      if (f === 'pills') panel(e, { x, y: a.y, w: w - S(e, 4), h: a.h }, true, { radiusPct: 50 });
      if (!itemIcon(e, item, x + S(e, 12), a.y + a.h / 2, S(e, 15))) iconChip(e, ch, x + S(e, 12), a.y + a.h / 2, S(e, 15), c);
      drawNumber(e, n, x + S(e, 23), a.y, a.h, { ...e.base, weight: 700, ...(numC && i % 3 === 0 && !nc ? { color: numC } : {}), ...(nc ? { color: nc } : {}) });
      if (d) { const dO = valueStyle(e, d, 'end', 'delta'); T(e, d, x + S(e, 23) + numberWidth(e, n, { ...e.base, weight: 700 }) + S(e, 4), a.y - (supOf(e) ? a.h * 0.28 : 0), a.h, supOf(e) ? { ...dO, size: dO.size * 0.78 } : dO); }
    }
    if (f !== 'pills') scopedEdge(e, { x, y: a.y, w: x1 - x, h: a.h });
  },
});

/** 增量写成上标（elx.valueLabelPos = superscript，M12b-06，civ6#6 的 15⁺⁵·²）：显式给了才算 */
const supOf = (e: ElCtx) => valuePosOf(e, 'end') === 'superscript';

/* ---------------- 资源栏的新画法（M12b-06） ---------------- */

/** 新画法：细框计数盒 / 里程表 / 图标 + 数字 + 容量细条 / 暗底通栏标签 / 统计格 */
const RES_NEW = new Set(['framedCounter', 'odometer', 'iconNumberBar', 'labeledStrip', 'statGrid']);
/** 各项资源的容量比例（iconNumberBar 的细条；包的 hud.resCap，没写时这一组） */
const RES_CAP = [0.62, 0.35, 0.8, 0.5, 0.7];
/** 主货币大数字的字样（framedCounter）：同 bigNumber 小一号 */
const resBigO = (e: ElCtx, color?: string): Partial<TextOpts> => ({ ...e.big, size: S(e, 24), ...(color ? { color } : {}), ...displayFor(e, 'numerals') });
/**
 * 里程表画法用的上下文（M12b-06，stardew#2）：数字字形强制成里程表（逐位等宽 + 补前导零 + 每位一个内凹格），已经选了矢量数字（七段 / 点阵 / 单线）时保留它；
 * 位数没给时 7 位。字色 = col.accent@el.resources（选过）或强调色
 */
function odoCtx(e: ElCtx): ElCtx {
  const n = e.t.numerals ?? {}, fam = n.family && ['sevenSeg', 'dotMatrix', 'singleStroke'].includes(n.family) ? n.family : 'odometer';
  return Object.assign(Object.create(e) as ElCtx, { t: { ...e.t, numerals: { ...n, family: fam, cells: true, digits: n.digits ?? 7 } } });
}
const odoO = (e: ElCtx): Partial<TextOpts> => ({ ...e.title, size: S(e, 22), weight: 700, color: e.accent });
/** 暗底通栏的一项：[标签, 数字, 颜色] */
const stripItems = (e: ElCtx) => resItems(e).map(([, n, item, c]) => [item, n, c] as const);
const stripLabelO = (e: ElCtx): Partial<TextOpts> => ({ ...e.small, size: Math.max(9, e.small.size * 0.9), color: mutedOf(e, 0.7), upper: true, spacing: 0.06 });
/** 统计格的列数：两项以内一行，多了两列（Balatro 的 Hands / Discards、Ante / Round） */
const gridCols = (n: number) => (n <= 2 ? n : 2);
function resNewSize(e: ElCtx, f: string): { w: number; h: number } {
  switch (f) {
    case 'framedCounter': { const n = fmtNumber(e, DATA.gold); return { w: Math.max(S(e, 150), S(e, 44) + numberWidth(e, n, resBigO(e)) + S(e, 16)), h: S(e, 40) }; }
    case 'odometer': { const E = odoCtx(e); return { w: S(e, 46) + numberWidth(E, String(DATA.gold), odoO(e)) + S(e, 12), h: S(e, 44) }; }
    case 'iconNumberBar': return { w: resItems(e).reduce((s, it) => s + resItemW(e, it) + S(e, 8), 0), h: S(e, 38) };
    case 'labeledStrip': return { w: stripItems(e).reduce((s, [l, n]) => s + W(e, l, stripLabelO(e)) + numberWidth(e, n, { ...e.base, weight: 700 }) + S(e, 26), S(e, 12)), h: S(e, 30) };
    default: { const n = resItems(e).length, c = gridCols(n); return { w: c * S(e, 84) + (c - 1) * S(e, 6), h: Math.ceil(n / c) * S(e, 56) - S(e, 6) }; }
  }
}
function drawResNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g, items = resItems(e), [r0] = DATA.res, numC = scopedSet(e, 'col.accent') ? e.accent : undefined;
  if (f === 'framedCounter') {
    // 细双线框盒（Elden 的卢恩计数）：左图标、右对齐数字；框色 = 按目标写的描边，否则正文色 70%
    const ec = e.t.edge?.border?.color ? resolveColor(e.t.edge.border.color, e.pal) : withAlpha(e.text, 0.7), lw = Math.max(1, S(e, 1));
    g.save(); g.fillStyle = withAlpha('#000', 0.35); g.fillRect(a.x, a.y, a.w, a.h); g.strokeStyle = ec; g.lineWidth = lw;
    g.strokeRect(a.x + lw / 2, a.y + lw / 2, a.w - lw, a.h - lw); g.strokeRect(a.x + S(e, 3), a.y + S(e, 3), a.w - S(e, 6), a.h - S(e, 6)); g.restore();
    if (!itemIcon(e, r0[1], a.x + S(e, 22), a.y + a.h / 2, S(e, 22))) iconChip(e, r0[0], a.x + S(e, 22), a.y + a.h / 2, S(e, 20), e.fill(0, 'currency'));
    const n = fmtNumber(e, DATA.gold), o = resBigO(e, numC);
    drawNumber(e, n, a.x + a.w - S(e, 10) - numberWidth(e, n, o), a.y, a.h, o);
    return;
  }
  if (f === 'odometer') {
    // 里程表（Stardew 的金币）：面板底 + 左端货币符号 + 逐位内凹格里的数字（前导零变暗）
    panel(e, a, true);
    const cy = a.y + a.h / 2, sym = DATA.currencyMark ?? r0[0];
    if (!itemIcon(e, r0[1], a.x + S(e, 22), cy, S(e, 22))) T(e, sym, a.x + S(e, 22) - W(e, sym, { ...e.title, size: S(e, 20) }) / 2, a.y, a.h, { ...e.title, size: S(e, 20), color: e.fill(0, 'currency') });
    const E = odoCtx(e), o = odoO(e), s = String(DATA.gold);
    drawNumber(E, s, a.x + a.w - S(e, 10) - numberWidth(E, s, o), a.y, a.h, o);
    return;
  }
  if (f === 'iconNumberBar') {
    // 图标 + 数字 + 下方极细容量条（Frostpunk 的资源）：容量比例取包的 hud.resCap
    let x = a.x;
    items.forEach((it, i) => {
      const [ch, n, item, c, , nc] = it, w = resItemW(e, it), cy = a.y + S(e, 15);
      if (!itemIcon(e, item, x + S(e, 12), cy, S(e, 16))) iconChip(e, ch, x + S(e, 12), cy, S(e, 15), c);
      drawNumber(e, n, x + S(e, 23), a.y, S(e, 30), { ...e.base, weight: 700, ...(numC && i === 0 && !nc ? { color: numC } : {}), ...(nc ? { color: nc } : {}) });
      const cap = (DATA.resCap ?? RES_CAP)[i % (DATA.resCap ?? RES_CAP).length], by = a.y + S(e, 31), bw = w - S(e, 4);
      g.fillStyle = withAlpha(e.text, 0.2); g.fillRect(x, by, bw, Math.max(1.5, S(e, 2)));
      g.fillStyle = c; g.fillRect(x, by, bw * Math.max(0, Math.min(1, cap)), Math.max(1.5, S(e, 2)));
      x += w + S(e, 8);
    });
    return;
  }
  if (f === 'labeledStrip') {
    // 暗底通栏（XCOM 的资源栏）：通栏暗底 + 下沿一道强调色细线，每项「标签 数值」
    g.fillStyle = withAlpha('#000', 0.62); g.fillRect(a.x, a.y, a.w, a.h);
    g.fillStyle = e.accent; g.fillRect(a.x, a.y + a.h - Math.max(1, S(e, 1.5)), a.w, Math.max(1, S(e, 1.5)));
    let x = a.x + S(e, 10);
    for (const [l, n, c] of stripItems(e)) {
      const lo = stripLabelO(e), lw = T(e, l, x, a.y, a.h, lo);
      x += lw + S(e, 6);
      x += drawNumber(e, n, x, a.y, a.h, { ...e.base, weight: 700, color: c === e.icon ? e.text : c }) + S(e, 20);
    }
    return;
  }
  // statGrid：小标题在上、彩色大数字在深色内嵌格里（Balatro 的 Hands / Discards / Ante，结算统计行），格色 = 类别色（col.coding = lineId）或项的颜色
  const n = items.length, cols = gridCols(n), cw = (a.w - (cols - 1) * S(e, 6)) / cols;
  items.forEach(([, num, item, c], i) => {
    const x = a.x + (i % cols) * (cw + S(e, 6)), y = a.y + Math.floor(i / cols) * S(e, 56), to = { ...e.small, size: Math.max(9, e.small.size * 0.9), weight: 700 };
    T(e, item, x + cw / 2 - W(e, item, to) / 2, y, S(e, 16), to);
    const box = { x, y: y + S(e, 17), w: cw, h: S(e, 32) };
    if (e.t.well) wellBox(e, box); else drawBox(g, box, { bg: { solid: withAlpha('#000', 0.55) }, radius: S(e, 6) }, e.pal);
    const col = lineColor(e, i) ?? (i === 0 ? e.fill(0, 'currency') : c === e.icon ? e.accent : c), no = { ...e.title, size: S(e, 20), weight: 800, color: col };
    drawNumber(e, num, box.x + box.w / 2 - numberWidth(e, num, no) / 2, box.y, box.h, no);
  });
}

/** 资源圆形计量多于一颗时，第 2 颗起的充满度（样本） */
const RES_FILL = [0, 0.6, 0.35, 0.8];
/**
 * 资源条形态的排版（M12a-11）：画法是不是圆（orb / ring / arc / dial，取 cmp.gauge@el.resources，原来写死横条）、粗细倍数（elx.thickness）；
 * 圆形时颗数 elx.count（默认 1）按元素级 elx.arrangement 排（row / column / ring / pyramid……），每颗约 96
 */
function resGauge(e: ElCtx) {
  const kind = gaugeKind(e, 'bar', true), round = ROUND_GAUGES.has(kind), th = thicknessOf(e);
  if (!round) return { round, th, cells: [] as { x: number; y: number; w: number; h: number }[], bbox: { w: 0, h: 0 } };
  const mode0 = ownArrangement(e, false), mode = CELL_MODES.has(mode0) ? mode0 : 'row';
  const L = arrangeCells(elCount(e, 1), { w: S(e, 96), h: S(e, 96) }, mode, { gap: S(e, 8), invert: mode === 'pyramid' });
  return { round, th, cells: L.rects, bbox: L.bbox };
}

/** 样本里每项资源的变化量（elx.valueLabel = delta 时画；包没写 resDelta 时用这一组：每回合 / 每周收入，第三项是支出） */
const RES_DELTA = [24, 3, -2];
/** 第 i 项资源的增量字（只在 elx.valueLabel = delta 时有） */
function resDelta(e: ElCtx, i: number): string {
  if (valueKind(e) !== 'delta') return '';
  const list = DATA.resDelta?.length ? DATA.resDelta : RES_DELTA;
  return valueText(e, 0, 1, 'delta', list[i % list.length]);
}
/**
 * 资源栏的项：[符号, 数量, 物品名, 符号颜色, 增量字]。res[0] 是主货币，用货币色（M12a-02 的 currency 角色，默认金色；col.accent@el.resources 时用作用域强调色），
 * 其余资源的符号用图标色（M12a-03 的 col.icon，auto = 强调色）；图集素材开着时按物品名画图标。
 * 项数 elx.count（M12a-13，没给时是包里的三项；多于三项时循环取，数量照抄）
 */
/**
 * 资源栏的项（续）：第 4 项起取内容包的 hud.resExtra（M12b-62，civ6#49：4X 的科技 / 文化 / 信仰…… 各带颜色与每回合增量，符号与数字都按它着色）；
 * elx.count 超过样本时截断、不再循环前三项（原来第 4、5 项是金币 / 晶体的重复）。第 6 项 = 数字颜色（没有时原来的字色）
 */
type ResItem = [glyph: string, num: string, item: string, color: string, delta: string, numColor?: string];
function resItems(e: ElCtx): ResItem[] {
  const [r0, r1, r2] = DATA.res;
  const wood = DATA.wood + simNow().resources;
  const base: [string, string, string][] = [[r0[0], fmtNumber(e, DATA.gold), r0[1]], [r1[0], fmtNumber(e, DATA.gems, String(DATA.gems)), r1[1]], [r2[0], fmtNumber(e, wood, String(wood)), r2[1]]];
  const extra = DATA.resExtra ?? [];
  const n = elCount(e, base.length);
  // 包没写 resExtra 时照旧循环前三项（GENERIC 之外的包都写了）
  if (!extra.length) return Array.from({ length: n }, (_, i) => { const [ch, num, item] = base[i % base.length]; return [ch, num, item, i % base.length === 0 ? e.fill(0, 'currency') : e.icon, resDelta(e, i)]; });
  const all: ResItem[] = [
    ...base.map(([ch, num, item], i): ResItem => [ch, num, item, i === 0 ? e.fill(0, 'currency') : e.icon, resDelta(e, i)]),
    ...extra.map(([g, name, v, d, c]): ResItem => [g, fmtNumber(e, v), name, c, valueKind(e) === 'delta' ? valueText(e, 0, 1, 'delta', d) : '', c]),
  ];
  return all.slice(0, Math.min(n, all.length));
}
/** 一项资源占的宽：数字 + 30（符号与间隔），带增量时再加增量字宽 */
const resItemW = (e: ElCtx, it: ResItem) => numberWidth(e, it[1], { ...e.base, weight: 700 }) + S(e, 30) + (it[4] ? W(e, it[4], valueStyle(e, it[4], 'end', 'delta')) + S(e, 4) : 0);

/* 技能 / 冷却 / 弹药 / 手牌 */
registerElement({
  id: 'el.abilities', forms: ['slots', 'hotbar', 'cards', 'ammo', 'ultimate', 'list', 'buttonCluster', 'unitLoadout', 'weapon'], anchor: 'bc',
  size: (e) => {
    const f = e.forms[0];
    // 技能元素的新变体（M12b-09）：指令列表 / 按键簇 / 单位装配 / 武器读数；弹药带快捷格（el.abilities.quickSlots）
    if (f === 'list' || f === 'buttonCluster' || f === 'unitLoadout' || f === 'weapon') return variantSize(e, f);
    if (f === 'ammo') return { w: S(e, 150) + quickW(e), h: S(e, 56) };
    if (f === 'ultimate') return { w: S(e, 90), h: S(e, 90) };
    if (f === 'cards') { const H = handGeom(e); return { w: H.w, h: H.h }; }
    return abilityLayout(e).size;
  },
  draw: (e, a) => {
    const f = e.forms[0];
    if (f === 'list' || f === 'buttonCluster' || f === 'unitLoadout' || f === 'weapon') { variantDraw(e, a, f); return; }
    if (f === 'ammo') {
      quickSlots(e, a);
      T(e, String(DATA.ammo[0]), a.x, a.y, a.h, { ...e.big, size: S(e, 40) });
      const w = W(e, String(DATA.ammo[0]), { ...e.big, size: S(e, 40) });
      T(e, `/ ${DATA.ammo[1]}`, a.x + w + S(e, 6), a.y + S(e, 10), a.h, { ...e.base, color: mutedOf(e, 0.7) });
      for (let i = 0; i < 12; i++) { e.g.fillStyle = i < 9 ? e.accent : withAlpha(e.text, 0.25); e.g.fillRect(a.x + i * S(e, 7), a.y + a.h - S(e, 6), S(e, 4), S(e, 6)); }
      return;
    }
    if (f === 'ultimate') {
      // 大招 / 第二资源球（M12a-11）：画法读 cmp.gauge@el.abilities（原来写死进度环；orb = Hollow 的灵魂液面球）；
      // 环心的百分比跟 elx.valueLabel（没给时 percent），显式给了 none 时百分比和符号都不画
      const [uch, v] = DATA.ultimate, vk = valueKind(e, 'percent');
      gaugeOf(e, a, v, 0, 'ring', { fixed: true, color: e.accent, value: { text: valueText(e, v, 100, vk), pos: valuePosOf(e, 'center'), kind: vk } });
      if (vk !== 'none') icon(e, uch, a.x + a.w / 2, a.y + a.h * 0.78, S(e, 14), e.text);
      return;
    }
    if (f === 'cards') {
      // 手牌：张数 elx.count（默认 技能 4 + 1）；元素级显式横排（el.abilities.arrangement = row）时摆平不转，其余是原来的小扇形（M12a-20）
      const n = elCount(e, DATA.abilities.length + 1), flat = e.r.get(`${e.id}.arrangement`) === 'row';
      const glyphs = [...DATA.abilities.map(([ch]) => ch), DATA.handExtra];
      const H = handGeom(e);
      // 发牌（M12c-14，chk.demo = drawCards）：sim.drawn 张已在手（小数 = 正在飞进来的那张），没发到的不画；没有发牌事件时 Infinity（原来的）
      const drawn = simNow().drawn;
      for (let i = 0; i < n; i++) {
        const dk = drawn - i;
        if (dk <= 0) continue;
        const ch = glyphs[i % glyphs.length], mid = (n - 1) / 2;
        // 叠压（lay.cardOverlap，M12b-69）：相邻牌错开卡宽的 (1 − 叠压比)；没选时原来的 66 间距。选中抬起（st.selected = lift）：选中的牌往上抬，没抬的往下让出抬起的那截
        const lifted = H.lift > 0 && handSelected(i), y0 = a.y + H.top + (H.lift > 0 && !lifted ? H.lift : 0);
        // 每张的转角 / 下沉（H.rot / H.droop，终期审查修复 ㉙：原来固定 0.06 rad、4，20 张时两端转 0.57 rad、沉 38，画到元素框和画面下沿外面）
        const cw = S(e, 60), ch2 = S(e, 88), x = a.x + i * H.step + (dk < 1 ? (1 - dk) ** 2 * S(e, 220) : 0), rot = flat ? 0 : (i - mid) * H.rot;
        // 扇形的平移 / 旋转两层画布一起做（B7 审查修复 ㉖：原来只转图形层，像素皮肤的文字层 e.tx 上牌名 / 费用 / 说明不转、不下沉，飘在牌外）
        const fanCtx = e.tx === e.g ? [e.g] : [e.g, e.tx];
        for (const c of fanCtx) { c.save(); c.translate(x + cw / 2, y0 + ch2 / 2 + (flat ? 0 : Math.abs(i - mid) * H.droop)); c.rotate(rot); c.translate(-(x + cw / 2), -(y0 + ch2 / 2)); if (dk < 1) c.globalAlpha *= dk; }
        if (lifted) { e.g.fillStyle = 'rgba(0,0,0,0.3)'; e.g.beginPath(); e.g.ellipse(x + cw / 2, y0 + ch2 + H.lift * 0.6, cw * 0.44, Math.max(2, ch2 * 0.05), 0, 0, Math.PI * 2); e.g.fill(); }
        // 卡面（M12b-12）：cmp.card@el.abilities / @card 选过时按版式画（TCG、扑克、塔罗……，样本 = 内容包的手牌 hud.hand），没选时原来的「面板 + 中央符号 + 序号」
        const cr = { x, y: y0, w: cw, h: ch2 };
        drawCard(e, cr, handCard(i, ch), { small: true, legacy: () => {
          panel(e, cr, true, { radius: 6 });
          icon(e, ch, x + cw / 2, y0 + ch2 * 0.42, S(e, 24));
          T(e, String(i + 1), x + S(e, 5), y0 + S(e, 2), S(e, 16), { ...e.small, weight: 800, color: e.accent });
        } });
        for (const c of fanCtx) c.restore();
      }
      // 张数计数（elx.valueLabel = currentMax，M12b-69，balatro#10：牌排下方「8/8」）
      // 出屏的手牌（lay.cardBleed）计数写在牌排上方，否则写在下方
      if (H.count) { const t = `${n}/${Math.max(n, 8)}`, o = { ...e.small, weight: 800 }; drawNumber(e, t, a.x + H.w / 2 - numberWidth(e, t, o) / 2, H.top ? a.y : a.y + H.h - H.count, H.count, o); }
      return;
    }
    const L0 = abilityLayout(e), xa = abilityExtras(e), L = L0, a0 = a;
    // 当前主动技能名牌（el.abilities.activeLabel，M12b-09）：名牌占 abilityLayout 留的那一行（size 里的 28）——above 时在最上面、整栏往下让，below 时在最下面
    // （B7 审查修复 ④：原来 below 画在整块尺寸之下，贴底锚点时出画面；宽 180 也没算进尺寸）
    if (xa.label) activeLabel(e, { x: a.x, y: xa.label === 'above' ? a.y : a.y + L0.size.h - S(e, 28) + S(e, 4), w: L0.size.w, h: S(e, 24) });
    if (xa.label === 'above') a = { ...a, y: a.y + S(e, 28) };
    // 状态：技能格逐条声明的（AbilityRow 第 3 项）优先；没声明时按序号演示（cnt.stateDemo；内容包 hud.abilityStates = none 关掉，M12a-10）
    const demo = stateDemo(e, declaredStates(DATA.abilities, 2), DATA.abilityStates === 'none');
    const len = DATA.abilities.length, sim = simNow();
    const durMode = String(e.r.el(e.id, 'durability') ?? 'none');
    // 格子里装物品（el.abilities.slotContent = items，M12b-62：Elden 的盾 / 剑 / 法术 / 道具四格、饥荒的背包物品栏）：取内容包的 hud.quickItems，
    // 声明了图集图标的按物品名画图标，数量 > 1 时写数量，耐久按 elx.durability 与物品自己的状态；不演示冷却 / 锁定 / 新品
    const qi = String(elOf(e, 'slotContent') ?? 'auto') === 'items' && DATA.quickItems?.length ? DATA.quickItems : null;
    // 格底状态色（st.statusMark = slotTint，M12b-01，dont-starve#12：易腐物品的新鲜度）
    const tintOn = slotTintOn(e);
    // 格下标牌写名字（cmp.slotLabel = below / plate）时的技能名：天赋样本（talents）的名字
    const names = slotLabelOf(e) === 'below' || slotLabelOf(e) === 'plate' ? samplesFor('talents').map((t) => t[1]).filter(Boolean) : [];
    L.cells.forEach((c, i) => {
      const r = { x: a.x + c.x, y: a.y + c.y, w: c.w, h: L.sz };
      if (qi) {
        const [g, name, q, ic, st] = qi[i % qi.length];
        slot(e, r, g, {
          key: L.key === 'corner' ? L.label(i) : undefined, qty: q > 1 ? String(q) : undefined, selected: st?.selected ?? i === 0, locked: !!st?.locked, empty: !!st?.empty,
          item: ic ? name : '', durability: durMode === 'none' ? undefined : st?.durability, line: st?.line ?? i,
          tint: tintOn ? st?.freshness ?? FRESH_DEMO[i % FRESH_DEMO.length] : undefined, label: name, level: st?.level ?? 1 + (i % 3),
        });
        if (L.key === 'below') { const kw = keyWidth(e, L.label(i), L.pad(i), L.kh); keyCap(e, r.x + r.w / 2 - kw / 2, r.y + L.sz + L.lab + L.kgap, L.kh, L.label(i), L.pad(i)); }
        return;
      }
      // 首格消耗品（el.abilities.lead = consumable，M12b-09，dead-cells#9）：瓶形图标 + 剩余次数点；溢出格（overflow = plusN，hades#2）见下面
      if (i === 0 && xa.lead) { leadFlask(e, r); return; }
      // 头像卡（slotContent = portraits，M12b-09，hi-fi-rush#14）：倾斜的小方头像卡（面板读 vis.tilt@el.abilities、描边 col.border@el.abilities）
      if (xa.portraits) { portraitSlot(e, r, i); return; }
      const [ch, cd0] = DATA.abilities[i % len], st = i < len ? DATA.abilities[i][2] : undefined;
      // 技能 1 的冷却由模拟驱动（冷却事件），其余保持样本值（演示关着时用声明的 cd）。
      // 整合修复 U#17：物品快捷栏（form = hotbar）里放的是工具 / 物品（与内容包快捷物品同一个符号：沙盒的剑 / 镐 / 火把、魂类的圣瓶 / 咒术）——物品没有技能冷却，不演示
      const itemBar = QUALITY.on && f === 'hotbar' && !!DATA.quickItems?.some((x) => x[0] === ch);
      const cdS = demo ? (itemBar ? 0 : cd0) : st?.cd ?? 0;
      const cd = i === 0 && sim.cd0 > 0 ? sim.cd0 : cdS;
      // 数量：快捷栏前 4 格的演示数量；elx.valueLabel = current / currentMax 时技能格也写剩余数量（Ghost 的暗器，M12a-20），valueLabelPos = below 时写在格下
      const q = st?.qty ?? (demo ? 3 + (i % 4) : undefined);
      const vq = q !== undefined && (e.valueLabel === 'current' || e.valueLabel === 'currentMax') ? (e.valueLabel === 'current' ? String(q) : `${q}/${q + 2}`) : undefined;
      const qty = vq ?? (demo && f === 'hotbar' && i < 4 ? String(3 + i) : !demo && f === 'hotbar' && st?.qty !== undefined ? String(st.qty) : undefined);
      const qBelow = !!vq && e.valueLabelPos === 'below' && L.key !== 'below';
      // 格下标牌的字（cmp.slotLabel = below / plate，B7 审查修复 ⑩：原来技能格不传名字，选了 below / plate 只留了高、什么都不写）：技能名取天赋样本（按序号循环）
      const skillName = names.length ? names[i % names.length] : undefined;
      // 前 4 格是技能（item 给空串：图集素材开着时也画技能符号，不按符号猜成物品），后面的是物品格。
      // 物品格（审查修复 E 视觉 ⑧：原来第 5 格起全是同一个 hotbarItem 符号）：品质下限开着时按快捷物品 / 菜单物品轮着取，带名字（按名字画物品图标）
      const qf = i >= 4 && QUALITY.on ? (DATA.quickItems?.length ? DATA.quickItems : pack().menu.items)[(i - 4) % Math.max(1, (DATA.quickItems?.length ? DATA.quickItems : pack().menu.items).length)] : undefined;
      slot(e, r, i >= 4 ? qf?.[0] ?? DATA.hotbarItem : ch, {
        cd, key: L.key === 'corner' ? L.label(i) : undefined, qty: qBelow ? undefined : qty, selected: st?.selected ?? i === 0,
        locked: demo ? i === 4 || i === 5 : !!st?.locked, empty: demo ? i >= 6 : !!st?.empty, fresh: demo ? i === 2 : !!st?.fresh,
        item: i >= 4 ? undefined : '', durability: durMode === 'none' ? undefined : st?.durability ?? (demo ? DURABILITY[i % DURABILITY.length] : undefined),
        line: st?.line ?? i, tint: tintOn ? st?.freshness ?? FRESH_DEMO[i % FRESH_DEMO.length] : undefined, level: st?.level ?? 1 + (i % 3), label: qf?.[1] ?? skillName,
      });
      // 格下数量排在格下标牌之下（B7 审查修复 ⑲：与键帽同一个偏移 L.lab；原来写在格子下沿，Hades 的「Lv.N」小牌上压着数量数字）
      if (qBelow && qty) { const o = { ...e.small, weight: 700 }; T(e, qty, r.x + r.w / 2 - W(e, qty, o) / 2, r.y + L.sz + L.lab, L.kh + L.kgap, o); }
      // 格下键帽（elx.keyHint = below）：键盘画数字键帽，手柄按 ix.glyphs 画方向键 / 肩键 / 面键
      if (L.key === 'below') { const kw = keyWidth(e, L.label(i), L.pad(i), L.kh); keyCap(e, r.x + r.w / 2 - kw / 2, r.y + L.sz + L.lab + L.kgap, L.kh, L.label(i), L.pad(i)); }
    });
    // 溢出格（el.abilities.overflow = plusN）：末格后面一格同外形虚线描边（强制 dashed、不画空格符号，B7 审查修复 ⑳：原来走 st.emptySlot 的 + 号压在字下）写「+N」，
    // N = 样本里没画出来的技能数（至少 1，原来写死 8），经 fmtNumber / drawNumber
    if (xa.overflow && L.cells.length) {
      const c = L.cells[L.cells.length - 1], gap = S(e, 6), r = L.vert ? { x: a.x + c.x, y: a.y + c.y + c.h + gap, w: c.w, h: L.sz } : { x: a.x + c.x + c.w + gap, y: a.y + c.y, w: c.w, h: L.sz };
      slot(e, r, '', { empty: true, emptyMode: 'dashed' });
      const t = `+${fmtNumber(e, Math.max(1, DATA.abilities.length - L.cells.length))}`, o = { ...e.base, weight: 800 };
      drawNumber(e, t, r.x + r.w / 2 - numberWidth(e, t, o) / 2, r.y, r.h, o);
    }
    // 翻页（el.abilities.pages > 1）：栏下一排页点，第一页亮；按没下让的整块算（名牌在下面时页点在名牌之上，审查修复 ④）
    const dotY = a0.y + L.size.h - S(e, 4) - (xa.label === 'below' ? S(e, 28) : 0);
    if (L.pages > 1) for (let p = 0; p < L.pages; p++) { e.g.fillStyle = p === 0 ? e.accent : withAlpha(e.text, 0.35); e.g.beginPath(); e.g.arc(a.x + L.size.w / 2 + (p - (L.pages - 1) / 2) * S(e, 10), dotY, S(e, 2.5), 0, Math.PI * 2); e.g.fill(); }
  },
});

/**
 * 手牌的几何（M12b-69）：叠压 lay.cardOverlap（0–0.6，相邻牌盖住的比例）、下缘出屏 lay.cardBleed（0–0.4：元素只报露出来的那截高，牌往下画出元素框，
 * 贴底锚点时伸出画面——StS 的大手牌）、选中抬起 st.selected = lift（选中的牌上抬 12% 卡高，元素多报这一截）、张数计数 elx.valueLabel = currentMax（牌排下方一行）。
 * 都没选时 = 原来的 66 间距、96 高
 */
function handGeom(e: ElCtx) {
  const n = elCount(e, DATA.abilities.length + 1), cw = S(e, 60), ch = S(e, 88);
  const ov = pickedNum(e, 'lay.cardOverlap', 0, 0.6), bleed = pickedNum(e, 'lay.cardBleed', 0, 0.4) ?? 0;
  const lift = e.part('card').v.str('st.selected', '') === 'lift' ? liftOf(ch) : 0, count = valueKind(e) === 'currentMax' ? LH(e, e.small) : 0;
  // 张数多到排不下画面宽时叠得更紧（终期审查修复 ㉙：原来 20 张 990 宽、30 张 1485 宽，版面只能缩到 0.75，右端伸出画面）——间距收到整排 ≤ 画面宽 − 两边安全边（真实卡牌游戏的大手牌也是这样叠）
  const step0 = ov !== null ? cw * (1 - ov) : S(e, 66), tail = ov !== null ? 0 : S(e, 6);
  const avail = e.R.w - 2 * ((e.r.num('lay.safeMargin', 2) / 100) * Math.min(e.R.w, e.R.h) + S(e, 8));
  const step = n > 1 && step0 * (n - 1) + cw + tail > avail ? Math.max(cw * 0.15, (avail - cw - tail) / (n - 1)) : step0;
  // 扇形：每张转 min(0.06, 0.5 / n) rad、下沉按同一比例收（8 张以内与原来一样）；两端那张转过的角与下沉比 8 张（不收角的最多张数）多出来的部分算进高（8 张以内是 0，与原来一样）
  const flat = e.r.get(`${e.id}.arrangement`) === 'row', rotS = flat ? 0 : Math.min(0.06, 0.5 / Math.max(1, n)), droop = flat ? 0 : S(e, 4) * (rotS / 0.06);
  const ext = (k: number, a: number) => k * droop + (cw / 2) * Math.sin(k * a) + (ch / 2) * (1 - Math.cos(k * a));
  const more = flat ? 0 : Math.max(0, ext((n - 1) / 2, rotS) - ext(Math.min((n - 1) / 2, 3.5), 0.06));
  const custom = ov !== null || bleed > 0 || lift > 0 || count > 0;
  if (!custom) return { n, step, lift, count, top: 0, w: step === step0 ? S(e, 330 + (n - 5) * 66) : step * (n - 1) + cw + tail, h: S(e, 96) + more, rot: rotS, droop };
  return { n, step, lift, count, top: bleed > 0 ? count : 0, w: step * (n - 1) + cw + tail, h: lift + ch * (1 - bleed) + S(e, 8) * (1 - bleed) + count + more, rot: rotS, droop };
}
/** 手牌里哪几张是选中的（抬起）：手牌样本 hud.abilities 逐条声明的 selected，没声明时演示第 2、4 张 */
const handSelected = (i: number) => { const st = DATA.abilities[i % DATA.abilities.length]?.[2]; return st?.selected !== undefined ? !!st.selected : i === 1 || i === 3; };
/** 选过的数值参数（按目标链，旧皮肤只认皮肤之后的层），夹到 [lo, hi]；没选 null */
function pickedNum(e: ElCtx, k: string, lo: number, hi: number): number | null {
  const key = chosenKey(e, k);
  if (!key) return null;
  const v = Number(e.r.get(key));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
}

/* ---------------- 技能元素的变体（M12b-09） ---------------- */

/** 技能栏的附加件（选过才有）：当前技能名牌 activeLabel（above / below）、溢出格 overflow（plusN）、首格消耗品 lead（consumable）、头像卡 slotContent = portraits */
function abilityExtras(e: ElCtx) {
  const pick = (k: string, def: string) => (elChosen(e, k) ? String(elOf(e, k) ?? def) : def);
  const label = pick('activeLabel', 'none');
  return { label: label === 'above' || label === 'below' ? label : '', overflow: pick('overflow', 'none') === 'plusN', lead: pick('lead', 'none') === 'consumable', portraits: pick('slotContent', 'auto') === 'portraits' };
}
/** 当前主动技能名牌（Elden 十字快捷栏上方的战技名）：左细竖线 + 小图标 + 技能名 + 右侧单向渐隐暗底（B3 的 fadePaint） */
function activeLabel(e: ElCtx, r: Rect) {
  const g = e.g, [gl] = DATA.abilities[0] ?? ['✦'], name = DATA.activeSkill ?? samplesFor('talents')[0]?.[1] ?? '';
  fadePaint(g, r, 'right', 0.6, withAlpha('#000', 0.6));
  g.fillStyle = withAlpha(e.text, 0.85); g.fillRect(r.x, r.y + S(e, 3), Math.max(1, S(e, 1.5)), r.h - S(e, 6));
  icon(e, gl, r.x + S(e, 14), r.y + r.h / 2, S(e, 14), e.accent);
  T(e, name, r.x + S(e, 26), r.y, r.h, { ...e.base, color: e.text });
}
/** 首格消耗品（Dead Cells 的血瓶）：格子 + 瓶形 + 下面一排剩余次数点（2 / 3 亮） */
function leadFlask(e: ElCtx, r: Rect) {
  slot(e, r, '', {});
  const g = e.g, cx = r.x + r.w / 2, cy = r.y + r.h * 0.44, s = r.h * 0.5, c = e.bad;
  g.save(); g.fillStyle = c; g.beginPath(); g.arc(cx, cy + s * 0.12, s * 0.34, 0, Math.PI * 2); g.fill(); g.fillRect(cx - s * 0.1, cy - s * 0.42, s * 0.2, s * 0.3);
  g.fillStyle = '#d8c9a0'; g.fillRect(cx - s * 0.14, cy - s * 0.5, s * 0.28, s * 0.1); g.restore();
  for (let i = 0; i < 3; i++) { g.fillStyle = i < 2 ? e.text : withAlpha(e.text, 0.25); g.beginPath(); g.arc(cx + (i - 1) * r.w * 0.2, r.y + r.h * 0.86, Math.max(1.5, r.h * 0.05), 0, Math.PI * 2); g.fill(); }
}
/** 头像卡（Hi-Fi 的伙伴援护）：面板（vis.tilt@el.abilities 倾斜、描边跟 @el.abilities）+ 头像首字 + 冷却罩 */
function portraitSlot(e: ElCtx, r: Rect, i: number) {
  const [n] = DATA.party[i % DATA.party.length];
  panel(e, r, true);
  avatar(e, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.38, n);
  if (i === 1) { e.g.fillStyle = 'rgba(0,0,0,0.5)'; e.g.fillRect(r.x, r.y + r.h * 0.4, r.w, r.h * 0.6); }
}
/** 弹药的附属快捷格（el.abilities.quickSlots，0–3，CP2077 的手雷 / 治疗针）：贴在弹药数右侧，带数量 */
const quickN = (e: ElCtx) => (elChosen(e, 'quickSlots') ? Math.max(0, Math.min(3, Math.round(Number(elOf(e, 'quickSlots')) || 0))) : 0);
const quickW = (e: ElCtx) => quickN(e) * S(e, 46);
function quickSlots(e: ElCtx, a: Rect) {
  const items = DATA.quickItems ?? pack().menu.items;
  for (let i = 0; i < quickN(e); i++) { const [g, name, q, ic] = items[i % items.length], c = S(e, 40); slot(e, { x: a.x + S(e, 150) + i * S(e, 46), y: a.y + (a.h - c) / 2, w: c, h: c }, g, { qty: String(Math.max(1, q)), item: ic ? name : undefined, line: i }); }
}
/** 新变体的尺寸 */
function variantSize(e: ElCtx, f: string): { w: number; h: number } {
  const rows = listRows(e);
  if (f === 'list') return { w: fitW(e, S(e, 200), rows.map(([, n]) => [n, e.base] as [string, Partial<TextOpts>]), S(e, 90)), h: rows.length * S(e, 30) };
  if (f === 'buttonCluster') return { w: S(e, 300), h: S(e, 170) };
  if (f === 'unitLoadout') return { w: S(e, 330), h: S(e, 96) };
  return { w: S(e, 260), h: S(e, 80) };
}
/** 指令列表的行：[符号, 名字, 消耗]（指令样本 screens.commands，消耗按序号演示 2 / 4 / 6……） */
const listRows = (e: ElCtx): [string, string, string][] => samplesFor('commands').slice(0, Math.max(1, ownCount(e, 4, 8))).map(([g, n], i) => [g, n, String((i + 1) * 2)] as [string, string, string]);
function variantDraw(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  if (f === 'list') {
    // 指令列表（CP2077 的快速破解）：每行 图标 + 名字 + 右侧消耗小签；当前行（第一行）整行强调色底、反差字；说明框 = el.selection = tooltip 停靠在旁边（elx.dockTo）
    listRows(e).forEach(([gl, n, c], i) => {
      const r = { x: a.x, y: a.y + i * S(e, 30), w: a.w, h: S(e, 28) }, on = i === 0;
      panel(e, r, true, on ? { bg: { solid: e.accent } } : {});
      const to = on ? onAccent(e, { ...e.base }) : { ...e.base };
      icon(e, gl, r.x + S(e, 14), r.y + r.h / 2, S(e, 14), to.color);
      T(e, n, r.x + S(e, 28), r.y, r.h, to);
      const co = { ...e.small, weight: 800, color: on ? to.color : e.accent }, cw = numberWidth(e, c, co) + S(e, 18);
      drawBox(g, { x: r.x + r.w - cw - S(e, 6), y: r.y + S(e, 5), w: cw, h: r.h - S(e, 10) }, { border: { width: 1, color: co.color }, radius: S(e, 3) }, e.pal);
      drawNumber(e, c, r.x + r.w - cw - S(e, 6) + S(e, 9), r.y, r.h, co);
    });
    return;
  }
  if (f === 'buttonCluster') {
    // 按键簇（P5 的指令）：手柄四个面键排成菱形，每个键旁一条斜体指令名；当前项（上）放大、强调色。挂在角色身边 = el.abilities.attachTo = player
    const cmds = samplesFor('commands'), pads: PadButton[] = ['north', 'west', 'east', 'south'], cx = a.x + a.w / 2, cy = a.y + a.h / 2, d = S(e, 46);
    const pos = [[0, -1], [-1, 0], [1, 0], [0, 1]];
    pads.forEach((pb, i) => {
      const on = i === 0, k = on ? 1.25 : 1, h = S(e, 26) * k, x = cx + pos[i][0] * d * 1.5 - h / 2, y = cy + pos[i][1] * d - h / 2;
      const [, n] = cmds[i % cmds.length], kw = keyCap(e, x, y, h, String(i + 1), pb);
      // 指令名用正文字族（加粗斜体、标题字号）：指令样本的字不全在展示字表里
      const o = { ...e.base, size: e.title.size * k, weight: 800, italic: true, color: on ? e.accent : e.text };
      T(e, n, pos[i][0] < 0 ? x - W(e, n, o) - S(e, 6) : x + kw + S(e, 6), y, h, o);
    });
    return;
  }
  if (f === 'unitLoadout') {
    // 单位装配（ITB 左下）：方形头像（外形读 vis.silhouette@avatar）+ 名字小标签 + 血格（cmp.gauge = pips）+ 2–3 个武器格 + 一行按键说明
    const ro = samplesFor('roster')[0] ?? ['?', '', [], []], [name, cls, , weapons] = ro, ph = a.h - S(e, 4);
    panel(e, a, true);
    avatar(e, a.x + S(e, 6) + ph / 2 - S(e, 2), a.y + a.h / 2, ph / 2 - S(e, 6), name);
    const x0 = a.x + ph + S(e, 8);
    T(e, `${name} · ${cls}`, x0, a.y + S(e, 4), S(e, 20), { ...e.small, weight: 800 });
    gauge(e.part('bar'), { x: x0, y: a.y + S(e, 26), w: S(e, 90), h: S(e, 10) }, 0.6, 'pips', e.good, undefined, { max: 5 });
    const ws = weapons.length ? weapons : ['⚔'];
    ws.slice(0, 3).forEach((wn, i) => slot(e, { x: x0 + i * S(e, 44), y: a.y + S(e, 42), w: S(e, 38), h: S(e, 38) }, wn.slice(0, 1), { item: wn, selected: i === 0 }));
    const kx = x0 + Math.min(3, ws.length) * S(e, 44) + S(e, 4), kw = keyCap(e, kx, a.y + S(e, 52), S(e, 18), '0');
    T(e, '解除', kx + kw + S(e, 4), a.y + S(e, 52), S(e, 18), { ...e.small, color: mutedOf(e, 0.75) });
    return;
  }
  // 武器读数（XCOM 右下）：武器线稿剪影（程序画的步枪）+ 横向弹匣格（cmp.gauge@el.abilities 选过时按它，否则 pips：格数 = 弹匣容量）+ 剩余 / 容量
  const [cur, max] = DATA.ammo, cap = Math.max(2, Math.min(12, max)), sil = { x: a.x, y: a.y, w: a.w * 0.62, h: a.h * 0.55 };
  g.save(); g.strokeStyle = e.text; g.lineWidth = Math.max(1, S(e, 1.6)); g.lineJoin = 'round';
  const X = (u: number) => sil.x + u * sil.w, Y = (v: number) => sil.y + v * sil.h;
  g.beginPath(); g.moveTo(X(0.02), Y(0.45)); g.lineTo(X(0.7), Y(0.38)); g.lineTo(X(1), Y(0.4)); g.lineTo(X(1), Y(0.52)); g.lineTo(X(0.7), Y(0.55)); g.lineTo(X(0.52), Y(0.62)); g.lineTo(X(0.5), Y(0.95)); g.lineTo(X(0.42), Y(0.95)); g.lineTo(X(0.4), Y(0.62)); g.lineTo(X(0.18), Y(0.62)); g.lineTo(X(0.12), Y(0.85)); g.lineTo(X(0.02), Y(0.85)); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(X(0.3), Y(0.38)); g.lineTo(X(0.36), Y(0.2)); g.lineTo(X(0.56), Y(0.2)); g.lineTo(X(0.6), Y(0.38)); g.stroke(); g.restore();
  const kind = pickedStr(e.part('bar'), 'cmp.gauge', 'pips');
  gauge(e.part('bar'), { x: a.x, y: a.y + a.h * 0.68, w: a.w * 0.8, h: a.h * 0.22 }, Math.min(1, cur / Math.max(1, max)), kind, '#ffffff', undefined, { max: cap });
  const t = `${cur}/${max}`, o = { ...e.title, weight: 800 };
  drawNumber(e, t, a.x + a.w - numberWidth(e, t, o), a.y, a.h * 0.55, o);
}

/** 演示的耐久（elx.durability 开着、样本没声明时） */
const DURABILITY = [1, 0.72, 0.45, 0.18, 0.9, 0.6];
/** 非十字排布时格子对应的手柄键（肩键、扳机、面键）；十字对应十字键上 / 左 / 右 / 下 */
const PAD_CELLS: PadButton[] = ['lb', 'rb', 'lt', 'rt', 'west', 'north', 'east', 'south'];
const PAD_CROSS: PadButton[] = ['up', 'left', 'right', 'down'];

/**
 * 技能格 / 快捷栏的排版（M12a-20）：格数 elx.count（slots 默认 4、hotbar 8）、排法 elx.arrangement（row / column / grid / cross / pyramid / ring / zigzag2，
 * 只有元素级显式给了才用新排法，继承全局时只认 column——原来的读法）、行数 el.abilities.rows、分组 el.abilities.groups（每组几格，组间多留 0.4 格）、
 * 翻页 el.abilities.pages；十字排布时 cmp.slot@el.abilities = tallCard 用竖长格。键位角标 elx.keyHint：auto = 键鼠画数字、手柄写键名（都在格角）、触屏不画；below = 格下键帽
 */
function abilityLayout(e: ElCtx) {
  const f = e.forms[0], n = elCount(e, f === 'hotbar' ? 8 : 4);
  const sz = Math.max(S(e, f === 'hotbar' ? 40 : 52), tap(e)), gap = S(e, 6);
  const mode0 = ownArrangement(e), rows = Math.max(1, Math.min(3, Math.round(ownNum(e, 'rows', 1))));
  const mode = !CELL_MODES.has(mode0) ? 'row' : mode0 === 'row' && rows > 1 ? 'grid' : mode0;
  const sp = e.part('slot'), tall = cmpKey(sp, 'cmp.slot').includes('@') && cmp(sp, 'cmp.slot', 'cell') === 'tallCard';
  const key = keyHintOf(e);
  const kh = Math.max(S(e, 16), sz * 0.34), kgap = S(e, 4);
  const qBelow = e.valueLabelPos === 'below' && (e.valueLabel === 'current' || e.valueLabel === 'currentMax');
  const h0 = tall ? sz * 1.4 : sz;
  // 格下标牌（cmp.slotLabel@el.abilities，M12b-01：Hades 恩赐下的「Lv.2」小牌）选过时格下多留它伸出来的高度，键帽排在标牌下面
  const lab = slotLabelH(e, h0);
  const extra = (key === 'below' || qBelow ? kh + kgap : 0) + lab;
  const groups = Math.max(0, Math.round(ownNum(e, 'groups', 0)));
  const L = arrangeCells(n, { w: sz, h: h0 + extra }, mode, { gap, rows: mode === 'grid' && rows > 1 ? rows : undefined, groups: groups > 0 && groups < n ? groups : undefined, invert: mode === 'pyramid' });
  const pages = Math.max(1, Math.min(9, Math.round(ownNum(e, 'pages', 1))));
  // 原来的尺寸：横排高多留 4（选中色条），竖列不留；溢出格多一格宽、名牌多一行高（M12b-09）
  const xa = abilityExtras(e);
  const vert = mode === 'column', ov = xa.overflow ? sz + gap : 0;
  // 名牌（activeLabel）至少 180 宽：算进元素宽（B7 审查修复 ④：原来只画不报，窄的竖列技能栏上名牌伸出占位）
  const size = { w: Math.max(L.bbox.w + (vert ? 0 : ov), xa.label ? S(e, 180) : 0), h: L.bbox.h + (mode === 'row' ? S(e, 4) : 0) + (pages > 1 ? S(e, 12) : 0) + (xa.label ? S(e, 28) : 0) + (vert ? ov : 0) };
  const set = e.r.str('ix.glyphs', 'keycap'), input = e.r.str('ctx.input', 'kbm');
  const padSet = (set === 'xbox' || set === 'playstation' || set === 'nintendo' ? set : 'xbox') as GlyphSet;
  const pad = (i: number): PadButton | undefined => (input === 'pad' ? (mode === 'cross' && i < 4 ? PAD_CROSS[i] : PAD_CELLS[i % PAD_CELLS.length]) : undefined);
  const label = (i: number) => { const p = pad(i); return p ? glyphLabel(padSet, String(i + 1), p) : String(i + 1); };
  return { n, sz: h0, cells: L.rects, size, key, kh, kgap, pages, pad, label, lab, vert };
}

/** 键位角标怎么画（elx.keyHint，M12a-20）：corner / below / none 显式；auto = 触屏不画，其余画在格角（原来的画法；手柄时写键名） */
function keyHintOf(e: ElCtx): 'corner' | 'below' | 'none' {
  const v = String(e.r.el(e.id, 'keyHint') ?? 'auto');
  if (v === 'corner' || v === 'below' || v === 'none') return v;
  return e.r.str('ctx.input', 'kbm') === 'touch' ? 'none' : 'corner';
}

/** keyCap() 会画多宽（居中摆放用；与 keyCap / drawGlyph 的尺寸规则一致） */
function keyWidth(e: ElCtx, label: string, pad: PadButton | undefined, h: number): number {
  const set = glyphSetOf(e.r.str('ix.glyphs', 'keycap'));
  if (set === 'keycap' || set === 'brackets') return Math.max(h, W(e.part('key'), set === 'brackets' ? `[${label}]` : label, buttonText(e.part('key'), h, true)) + h * 0.45);
  if (set === 'text') return W(e, `按 ${label}`, { ...e.base, weight: 700 });
  return pad && /^(lb|rb|lt|rt)$/.test(pad) && set !== 'touch' ? h * 1.5 : h;
}

/* 小地图 / 罗盘 */
/** 小地图的画幅（el.minimap.aspect，M12b-25，dead-cells#18）：square = 原来的 132 方块；wide = 16 : 9；strip = 2 : 1（只作用于平面图） */
const MM_ASPECT: Record<string, [number, number]> = { square: [132, 132], wide: [176, 99], strip: [196, 98] };
const mmAspect = (e: ElCtx) => (e.forms[0] === 'plan' && elChosen(e, 'aspect') ? MM_ASPECT[ownStr(e, 'aspect', 'square')] ?? MM_ASPECT.square : MM_ASPECT.square);
/**
 * 小地图的图层（el.minimap.layers，M12b-25，forza-horizon-5#9）：terrain 烘焙地形 / roads 暗底 + 道路线 / route 导航亮带 + 下一检查点 / pois 兴趣点；
 * 没选时 = terrain + pois（原来的）。没有 terrain 时底是半透明暗色（FH5 的暗色圆底）
 */
const mmLayers = (e: ElCtx): Set<string> => new Set(elChosen(e, 'layers') ? ownList(e, 'layers').filter((x) => x && x !== 'auto') : ['terrain', 'pois']);
/** 车头朝上（el.minimap.rotate = headingUp，M12b-25，forza-horizon-5#8）：地图绕玩家转，箭头总朝上；北朝上 = 原来的 */
const mmHeadingUp = (e: ElCtx) => elChosen(e, 'rotate') && ownStr(e, 'rotate', 'northUp') === 'headingUp';
/** 没有场景时演示用的朝向（只在车头朝上时用：让地图转起来看得出） */
const DEMO_HEADING = 0.5;
/** 程序道路（uv 折线，没有场景道路图时；贴地路线带见 M12c-03） */
const MM_ROADS: [number, number][][] = [[[0.04, 0.62], [0.3, 0.56], [0.5, 0.52], [0.72, 0.44], [0.97, 0.38]], [[0.46, 0.02], [0.5, 0.3], [0.5, 0.52], [0.55, 0.8], [0.6, 0.98]], [[0.18, 0.96], [0.3, 0.76], [0.5, 0.52]], [[0.72, 0.44], [0.78, 0.18], [0.92, 0.06]]];
/** 罗盘的方位字（el.minimap.compassText）：north = 只写 N（Elden 的刻度线）、letters = N · NE · E…、localized = 北 · 东北 · 东…（罗盘条原来的）；auto = 刻度线 north、其余 localized */
const COMPASS = { letters: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], localized: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] };
const compassTextOf = (e: ElCtx) => { const v = elChosen(e, 'compassText') ? ownStr(e, 'compassText', 'auto') : 'auto'; return v === 'auto' ? (e.forms[0] === 'tickLine' ? 'north' : 'localized') : v; };
/**
 * 房间图小地图（el.minimap = roomGraph，M12b-25，cult-of-the-lamb#9）：本层房间 = 白色描边小方块 + 相邻房间的连线，当前房间实心高亮、特殊房间画图标（★ 头目 / ◈ 商店 / ▣ 宝物），无底；
 * 样本 hud.rooms（[列, 行, 种类]，种类 current / boss / shop / item / 空），没写时七个房间的一层
 */
const ROOMS_DEFAULT: [number, number, string][] = [[0, 1, ''], [1, 1, ''], [2, 1, 'current'], [2, 0, 'item'], [3, 1, ''], [2, 2, 'shop'], [4, 1, 'boss'], [3, 2, '']];
function roomGraph(e: ElCtx, a: Rect) {
  const g = e.g, rooms = DATA.rooms?.length ? DATA.rooms : ROOMS_DEFAULT;
  const cols = Math.max(...rooms.map((q) => q[0])) + 1, rows = Math.max(...rooms.map((q) => q[1])) + 1, step = Math.min(a.w / cols, a.h / rows), sz = step * 0.62;
  const ox = a.x + (a.w - step * cols) / 2 + step / 2, oy = a.y + (a.h - step * rows) / 2 + step / 2, ink = e.text;
  const at = (q: [number, number, string]) => [ox + q[0] * step, oy + q[1] * step];
  g.save(); g.strokeStyle = withAlpha(ink, 0.75); g.lineWidth = Math.max(1.5, S(e, 2));
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    if (Math.abs(rooms[i][0] - rooms[j][0]) + Math.abs(rooms[i][1] - rooms[j][1]) !== 1) continue;
    const [x0, y0] = at(rooms[i]), [x1, y1] = at(rooms[j]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  for (const q of rooms) {
    const [x, y] = at(q), r = { x: x - sz / 2, y: y - sz / 2, w: sz, h: sz };
    g.fillStyle = q[2] === 'current' ? ink : withAlpha('#000', 0.55); g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = ink; g.lineWidth = Math.max(1.5, S(e, 2)); g.strokeRect(r.x, r.y, r.w, r.h);
  }
  g.restore();
  for (const q of rooms) { const s = q[2] === 'boss' ? '★' : q[2] === 'shop' ? '◈' : q[2] === 'item' ? '▣' : ''; if (s) { const [x, y] = at(q); icon(e, s, x, y, sz * 0.62, q[2] === 'boss' ? e.bad : e.accent); } }
}
/**
 * 刻度罗盘线（el.minimap = tickLine，M12b-25，elden-ring#17）：一条细横线 + 每 15° 一道刻度（正方位长刻度）+ 方位字（el.minimap.compassText，默认只写 N）+ 中心小菱形，无底；
 * 朝向跟场景（没有场景时 0），纵向位置用 elx.offsetY
 */
function tickLine(e: ElCtx, a: Rect) {
  const g = e.g, w = worldNow()?.map, hd = e.noWorld || !w ? 0 : w.heading, cy = a.y + a.h * 0.62, span = Math.PI, ink = e.text, mode = compassTextOf(e);
  g.save(); g.strokeStyle = withAlpha(ink, 0.85); g.lineWidth = Math.max(1, S(e, 1.2));
  g.beginPath(); g.moveTo(a.x, cy); g.lineTo(a.x + a.w, cy); g.stroke();
  const deg0 = (hd * 180) / Math.PI;
  for (let d = Math.ceil((deg0 - 90) / 15) * 15; d <= deg0 + 90; d += 15) {
    const x = a.x + a.w / 2 + (((d - deg0) * Math.PI) / 180 / span) * a.w, major = ((d % 90) + 90) % 90 === 0;
    g.beginPath(); g.moveTo(x, cy - (major ? S(e, 7) : S(e, 4))); g.lineTo(x, cy); g.stroke();
    if (!major) continue;
    const k = ((((d / 45) % 8) + 8) % 8);
    const t = mode === 'north' ? (k === 0 ? 'N' : '') : mode === 'letters' ? COMPASS.letters[k] : COMPASS.localized[k];
    if (t) { const o = { ...e.small, weight: 700 }; T(e, t, x - W(e, t, o) / 2, a.y, cy - S(e, 8) - a.y, o); }
  }
  g.fillStyle = e.accent; const m = S(e, 4.5), mx = a.x + a.w / 2;
  g.beginPath(); g.moveTo(mx, cy - m); g.lineTo(mx + m, cy); g.lineTo(mx, cy + m); g.lineTo(mx - m, cy); g.closePath(); g.fill();
  g.restore();
}
/** 卷角（el.minimap.cornerCurl，M12b-25，civ6#10：羊皮纸小地图的卷角）：在面板的角上画一块翻起的纸角（亮暗两色三角 + 一道影） */
function curlCorner(e: ElCtx, a: Rect, corner: 'tl' | 'tr' | 'bl' | 'br') {
  const g = e.g, c = Math.min(a.w, a.h) * 0.16, sx = corner.endsWith('l') ? 1 : -1, sy = corner.startsWith('t') ? 1 : -1;
  const x = corner.endsWith('l') ? a.x : a.x + a.w, y = corner.startsWith('t') ? a.y : a.y + a.h, paper = resolveColor(e.th.surface, e.pal);
  g.save();
  g.fillStyle = withAlpha('#000', 0.28); g.beginPath(); g.moveTo(x + sx * c * 1.08, y); g.lineTo(x, y + sy * c * 1.08); g.lineTo(x + sx * c * 0.5, y + sy * c * 0.55); g.closePath(); g.fill();
  const gr = g.createLinearGradient(x, y, x + sx * c, y + sy * c); gr.addColorStop(0, mix(paper, '#000', 0.35)); gr.addColorStop(1, mix(paper, '#fff', 0.35));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x + sx * c, y); g.lineTo(x, y + sy * c); g.lineTo(x + sx * c * 0.62, y + sy * c * 0.62); g.closePath(); g.fill();
  g.strokeStyle = withAlpha(ornColor(e), 0.8); g.lineWidth = Math.max(1, S(e, 1.2)); g.stroke();
  g.restore();
}
const CURL_CORNERS: Record<string, ('tl' | 'tr' | 'bl' | 'br')[]> = { one: ['br'], two: ['tl', 'br'], all: ['tl', 'tr', 'bl', 'br'] };
registerElement({
  id: 'el.minimap', forms: ['plan', 'radar', 'compassBar', 'compassArc', 'roomGraph', 'tickLine'], anchor: 'tr',
  size: (e) => {
    const f = e.forms[0];
    if (f === 'compassBar') return { w: S(e, 360), h: S(e, 34) };
    if (f === 'compassArc') return { w: S(e, 260), h: S(e, 60) };
    if (f === 'tickLine') return { w: S(e, 300), h: S(e, 30) };
    if (f === 'roomGraph') return { w: S(e, 132), h: S(e, 100) };
    const [w, h] = mmAspect(e);
    return { w: S(e, w), h: S(e, h) };
  },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    if (f === 'roomGraph') { roomGraph(e, a); return; }
    if (f === 'tickLine') { tickLine(e, a); return; }
    if (f === 'compassBar' || f === 'compassArc') {
      // 小地图 / 罗盘的框是 minimapFrame 部件（M12a-01）
      if (f === 'compassBar') panel(e.part('minimapFrame'), a, true, { radiusPct: 50 });
      // 方位字（el.minimap.compassText，M12b-25）：没选时原来的「北 · 东北 · 东 · 东南 · 南」
      const ct = compassTextOf(e), names = ct === 'letters' ? COMPASS.letters : COMPASS.localized;
      const marks = ct === 'localized' && !elChosen(e, 'compassText') ? ['北', '·', '东北', '·', '东', '·', '东南', '·', '南'] : [names[0], '·', names[1], '·', names[2], '·', names[3], '·', names[4]];
      marks.forEach((m, i) => {
        const t = i / (marks.length - 1);
        const x = a.x + S(e, 18) + t * (a.w - S(e, 36));
        const y = f === 'compassArc' ? a.y + a.h * 0.25 + Math.pow(t - 0.5, 2) * a.h * 1.4 : a.y;
        const o = m.length > 1 ? { ...e.small, weight: 700 } : e.small;
        T(e, m, x - W(e, m, o) / 2, y, S(e, f === 'compassArc' ? 18 : 34), o);
      });
      g.fillStyle = e.accent; g.beginPath(); const mx = a.x + a.w * 0.62; g.moveTo(mx, a.y + a.h - 2); g.lineTo(mx - 5, a.y + a.h + 5); g.lineTo(mx + 5, a.y + a.h + 5); g.fill();
      return;
    }
    const lay = mmLayers(e), layersSet = elChosen(e, 'layers'), up = mmHeadingUp(e);
    panel(e.part('minimapFrame'), a, false, f === 'radar' ? { circle: true } : {});
    g.save();
    g.beginPath();
    if (f === 'radar') g.arc(a.x + a.w / 2, a.y + a.h / 2, a.w / 2 - 4, 0, Math.PI * 2); else g.rect(a.x + 4, a.y + 4, a.w - 8, a.h - 8);
    g.clip();
    const w = e.noWorld ? null : worldNow(), map = w?.map;
    // 没有地形层时：半透明暗底（FH5）
    if (layersSet && !lay.has('terrain')) { g.fillStyle = 'rgba(10,12,16,0.55)'; g.fillRect(a.x, a.y, a.w, a.h); }
    if (map) {
      // 烘焙的小地图（M6）：平面图整张放进框里；雷达以玩家为中心放大 2 倍；没走过的地方压暗
      const inner = { x: a.x + 4, y: a.y + 4, w: a.w - 8, h: a.h - 8 };
      const zoom = f === 'radar' ? 2 : 1;
      // 非方形画幅（el.minimap.aspect 选了 wide / strip）的平面图：按长边铺成方块、跟着玩家（不压扁）。B10 审查修复 ⑤：只认选过的画幅——
      // 别的原因不方的平面图（elx.width / height 改了尺寸）照原来把烘焙图拉满内框
      const sq = f === 'plan' && elChosen(e, 'aspect') && ownStr(e, 'aspect', 'square') !== 'square' && Math.abs(a.w - a.h) > 1, side = sq ? Math.max(inner.w, inner.h) : 0;
      const mw = sq ? side : inner.w * zoom, mh = sq ? side : inner.h * zoom;
      // 跟着玩家的那张方图夹在框里（R4 · C3，dead-cells#28：原来按玩家居中，玩家靠地图左边时方图整块偏到框右边、框左边四成空着）：长边方向铺满、短边方向跟玩家走到地图边为止
      const clampIn = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const ox = f === 'radar' ? inner.x + inner.w / 2 - map.player[0] * inner.w * zoom : sq ? clampIn(inner.x + inner.w / 2 - map.player[0] * side, inner.x + inner.w - side, inner.x) : inner.x;
      const oy = f === 'radar' ? inner.y + inner.h / 2 - map.player[1] * inner.h * zoom : sq ? clampIn(inner.y + inner.h / 2 - map.player[1] * side, inner.y + inner.h - side, inner.y) : inner.y;
      const px = ox + map.player[0] * mw, py = oy + map.player[1] * mh;
      // 车头朝上：地图绕玩家转（箭头之后不转）
      if (up) { g.translate(px, py); g.rotate(map.heading); g.translate(-px, -py); }
      // 内芯的不透明度（M12b-68，dead-cells#1）：vis.opacity@el.minimap / @minimapFrame 写了时烘焙图与未探索罩按它淡（下限 0.3；原来只有外框半透明、内芯照旧不透明）
      const sop = chosenKey(e.part('minimapFrame'), 'vis.opacity'), ia = sop?.includes('@') ? Math.max(0.3, Math.min(1, e.r.num(sop, 1))) : 1;
      const a0 = g.globalAlpha;
      if (ia < 1) g.globalAlpha = a0 * ia;
      if (lay.has('terrain')) {
        // 小地图单独选的画风（vis.mapStyle@el.minimap，M12b-25）：按需烘一张 256 的（引擎的 bake 缓存），否则引擎烘好的那张
        const ms = mapStyleOf(e), cv = (ms.scoped || e.r.str('rel.semanticZoom', 'none') === 'chart') && w?.bake ? w.bake(ms.key, 256) : map.canvas;
        g.imageSmoothingEnabled = true;
        g.drawImage(cv, ox, oy, mw, mh);
        const n = map.en, cw = mw / n, chh = mh / n;
        g.fillStyle = 'rgba(0,0,0,0.45)';
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!map.explored[j * n + i]) g.fillRect(ox + i * cw, oy + j * chh, cw + 0.5, chh + 0.5);
      }
      if (ia < 1) g.globalAlpha = a0;
      if (lay.has('roads')) mmRoads(e, ox, oy, mw, mh);
      if (lay.has('route')) mmRoute(e, [px, py], map.pois[0] ? [ox + map.pois[0].uv[0] * mw, oy + map.pois[0].uv[1] * mh] : [ox + 0.92 * mw, oy + 0.06 * mh]);
      if (lay.has('pois')) for (const q of map.pois) { g.fillStyle = q.kind === 'interact' ? '#e3b341' : q.kind === 'light' ? e.accent2 : e.bad; g.beginPath(); g.arc(ox + q.uv[0] * mw, oy + q.uv[1] * mh, S(e, 3), 0, Math.PI * 2); g.fill(); }
      g.restore();
      g.save(); g.translate(px, py); if (!up) g.rotate(-map.heading);
      g.fillStyle = e.accent; g.strokeStyle = '#000'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, -S(e, 7)); g.lineTo(S(e, 5), S(e, 5)); g.lineTo(0, S(e, 2)); g.lineTo(-S(e, 5), S(e, 5)); g.closePath(); g.fill(); g.stroke();
      g.restore();
      if (up) mmNorth(e, a, map.heading);
      mmCurl(e, a);
      return;
    }
    // 没有场景时的平面图（M12a-30，civ6#11）：显式选了地图画风（vis.mapStyle，旧皮肤要皮肤之后的层）时铺画风的底色、网格用画风的墨色，
    // 羊皮纸 / 绘本再铺三块彩色领土；没选时原来的面板 + 淡网格（大地图与小地图读同一个参数）
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    if (up) { g.translate(cx, cy); g.rotate(DEMO_HEADING); g.translate(-cx, -cy); }
    const ms = e.r.str('vis.mapStyle', 'auto'), msOn = ms !== 'auto' && (!e.th.legacy || chosen(e, 'vis.mapStyle'));
    // 小地图单独选的画风 / 拉远切类别色块（M12b-25）也铺它的底色
    const mss = mapStyleOf(e), own = mss.scoped || e.r.str('rel.semanticZoom', 'none') === 'chart', ms1 = own ? mss.style : ms;
    const sty = lay.has('terrain') ? (msOn || own ? MAP_STYLE[ms1] ?? (ms1 === 'painted' ? MAP_STYLE.parchment : undefined) : undefined) : undefined;
    if (sty) {
      g.fillStyle = sty.bg; g.fillRect(a.x, a.y, a.w, a.h);
      if (ms1 === 'parchment' || ms1 === 'painted') for (const [u, v, rr, c] of [[0.3, 0.35, 0.28, e.accent], [0.68, 0.32, 0.24, e.accent2], [0.52, 0.72, 0.26, e.good]] as [number, number, number, string][]) { g.fillStyle = withAlpha(c, 0.32); g.beginPath(); g.ellipse(a.x + a.w * u, a.y + a.h * v, a.w * rr, a.h * rr * 0.8, 0.4, 0, Math.PI * 2); g.fill(); }
    }
    if (lay.has('terrain')) {
      g.strokeStyle = withAlpha(sty ? sty.ink : e.text, 0.18); g.lineWidth = 1;
      if (f === 'radar') { for (const k of [0.3, 0.6, 0.9]) { g.beginPath(); g.arc(a.x + a.w / 2, a.y + a.h / 2, (a.w / 2) * k, 0, Math.PI * 2); g.stroke(); } }
      else { for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(a.x + (a.w * i) / 5, a.y); g.lineTo(a.x + (a.w * i) / 5, a.y + a.h); g.moveTo(a.x, a.y + (a.h * i) / 5); g.lineTo(a.x + a.w, a.y + (a.h * i) / 5); g.stroke(); } }
    }
    if (lay.has('roads')) mmRoads(e, a.x, a.y, a.w, a.h);
    if (lay.has('route')) mmRoute(e, [cx, cy], [a.x + a.w * 0.72, a.y + a.h * 0.4]);
    // 兴趣点
    if (lay.has('pois')) for (const [dx, dy, c] of [[0.28, 0.3, e.accent2], [0.72, 0.4, e.bad], [0.6, 0.76, '#e3b341']] as [number, number, string][]) { g.fillStyle = c; g.beginPath(); g.arc(a.x + a.w * dx, a.y + a.h * dy, S(e, 3.5), 0, Math.PI * 2); g.fill(); }
    g.restore();
    // 玩家箭头
    g.fillStyle = e.accent; g.beginPath(); g.moveTo(cx, cy - S(e, 7)); g.lineTo(cx + S(e, 5), cy + S(e, 5)); g.lineTo(cx, cy + S(e, 2)); g.lineTo(cx - S(e, 5), cy + S(e, 5)); g.closePath(); g.fill();
    if (up) mmNorth(e, a, DEMO_HEADING);
    mmCurl(e, a);
  },
});
/** 道路层：程序道路（uv 折线）画成白线（暗底上）；ox / oy / mw / mh = 地图在画面上的位置与大小 */
function mmRoads(e: ElCtx, ox: number, oy: number, mw: number, mh: number) {
  const g = e.g;
  g.save(); g.strokeStyle = withAlpha('#ffffff', 0.85); g.lineWidth = Math.max(1.5, S(e, 2.2)); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const rd of MM_ROADS) { g.beginPath(); rd.forEach(([u, v], i) => (i ? g.lineTo(ox + u * mw, oy + v * mh) : g.moveTo(ox + u * mw, oy + v * mh))); g.stroke(); }
  g.restore();
}
/** 导航亮带：玩家 → 先横后竖折一次 → 下一检查点（强调色粗带 + 检查点圈） */
function mmRoute(e: ElCtx, p: [number, number], q: [number, number]) {
  const g = e.g;
  g.save(); g.strokeStyle = withAlpha(e.accent, 0.85); g.lineWidth = Math.max(3, S(e, 4.5)); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
  g.fillStyle = e.accent; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, S(e, 1.8)); g.beginPath(); g.arc(q[0], q[1], S(e, 5), 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
/** 车头朝上时框边上的北标：地图转了 heading，北在框边 −heading 的方向（沿内切圆，雷达与平面图同一个半径） */
function mmNorth(e: ElCtx, a: Rect, heading: number) {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2, rr = Math.min(a.w, a.h) / 2 - S(e, 9), t = -Math.PI / 2 + heading, o = { ...e.small, weight: 800, color: e.accent };
  T(e, 'N', cx + Math.cos(t) * rr - W(e, 'N', o) / 2, cy + Math.sin(t) * rr - LH(e, o) / 2, LH(e, o), o);
}
/** 卷角（el.minimap.cornerCurl）：选过才画 */
function mmCurl(e: ElCtx, a: Rect) {
  if (!elChosen(e, 'cornerCurl')) return;
  for (const c of CURL_CORNERS[ownStr(e, 'cornerCurl', 'none')] ?? []) curlCorner(e, a, c);
}

/* 目标 / 路点 */
registerElement({
  id: 'el.objective', forms: ['text', 'checklist', 'marker', 'edgeArrow', 'note', 'storyTracker', 'sectioned', 'panelTab', 'trackerRows', 'blindPlate'], anchor: 'tr',
  formDefaults: { marker: { attach: 'target' } },
  // 世界标记的挂点（M12a-15：elx.attachTo 显式给了就挂它——Detroit 线索挂兴趣点；屏外时沿画面边的箭头指向同一个点）
  points: { marker: 'target', edgeArrow: 'target' },
  size: (e) => {
    const f = e.forms[0];
    if (f === 'marker' || f === 'edgeArrow') return { w: S(e, 10), h: S(e, 10) };
    // 剧情条 / 分节简报 / 页签清单 / 追踪行（M12b-28）
    if (OBJ_NEW.has(f)) return objNewSize(e, f);
    // 宽度装得下最长的一行（M8b），行距按字高；text 画法（M12b-61）= 任务名 + 一句折成至多两行的说明（objText）；标题前缀标记（el.objective.marker）另占 16
    const lines = f === 'text' ? objText(e).lines : DATA.objective;
    const indent = f === 'checklist' ? S(e, 20) : f === 'note' ? S(e, 20) : 0;
    const rowH = Math.max(S(e, 24), LH(e, e.base));
    return { w: fitW(e, S(e, 230), lines.map((l) => [l, e.base] as [string, Partial<TextOpts>]), indent + S(e, 8)), h: S(e, 22) + rowH * lines.length + S(e, 8) + (objProgress(e) ? S(e, OBJ_BAR) : 0) };
  },
  pointBox: (e, p) => (e.forms[0] === 'marker' ? { x: p.x - S(e, 12), y: p.y - S(e, 76), w: S(e, 24), h: S(e, 54) } : null),
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    const wt = e.noWorld || !worldNow() || (f !== 'marker' && f !== 'edgeArrow') ? null : attachPoint(e, attachFor(e));
    // 目标标记与标题：目标色（M12a-02 的 objective 角色，默认金色；col.accent@el.objective 时用作用域强调色）；el.objective.titleColor（M12b-28）选过时换成那个颜色角色 / 颜色
    const oc = objColor(e, 'titleColor', e.fill(0, 'objective'));
    if (OBJ_NEW.has(f)) { drawObjNew(e, a, f, oc); return; }
    if ((f === 'marker' || f === 'edgeArrow') && wt && wt.on === false && wt.dir) {
      // 目标在屏幕外：画面边缘的箭头指向它（M6）
      const R = e.R, m = S(e, 26);
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      const kx = wt.dir[0] !== 0 ? (R.w / 2 - m) / Math.abs(wt.dir[0]) : Infinity, ky = wt.dir[1] !== 0 ? (R.h / 2 - m) / Math.abs(wt.dir[1]) : Infinity;
      const k = Math.min(kx, ky);
      const x = cx + wt.dir[0] * k, y = cy + wt.dir[1] * k, ang = Math.atan2(wt.dir[1], wt.dir[0]);
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = oc; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(S(e, 14), 0); g.lineTo(-S(e, 8), -S(e, 11)); g.lineTo(-S(e, 3), 0); g.lineTo(-S(e, 8), S(e, 11)); g.closePath(); g.fill(); g.stroke();
      g.restore();
      return;
    }
    if (f === 'marker') {
      const p = attachPoint(e, attachFor(e));
      // 贯穿目标的长十字细线（el.objective.crosshair，M12b-28，xcom2#17）：先画，标记压在上面
      if (elChosen(e, 'crosshair') && ownBool(e, 'crosshair')) { const L = Math.min(e.R.w, e.R.h) * 0.22, cy = p.y - S(e, 56); g.save(); g.strokeStyle = withAlpha(e.bad, 0.85); g.lineWidth = Math.max(1, S(e, 1)); g.beginPath(); g.moveTo(p.x - L, cy); g.lineTo(p.x + L, cy); g.moveTo(p.x, cy - L); g.lineTo(p.x, cy + L); g.stroke(); g.restore(); }
      // 标记读外形（vis.silhouette@el.objective，M12b-28：XCOM 的六角图钉）与颜色（col.accent@el.objective / titleColor）；没选外形时原来的菱形
      const sil = scopedSilhouette(e, 'marker');
      if (sil) { const r = { x: p.x - S(e, 11), y: p.y - S(e, 67), w: S(e, 22), h: S(e, 22) }, sty = shapeStyle(e, 'marker', { bg: { solid: oc }, border: { width: Math.max(1, S(e, 2)), color: '#ffffff' } }, r); if (!sty.bare) drawBox(g, r, sty, e.pal); g.save(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(p.x - S(e, 4), p.y - S(e, 45)); g.lineTo(p.x + S(e, 4), p.y - S(e, 45)); g.lineTo(p.x, p.y - S(e, 38)); g.closePath(); g.fill(); g.restore(); }
      else { g.fillStyle = oc; g.beginPath(); g.moveTo(p.x, p.y - S(e, 40)); g.lineTo(p.x + S(e, 9), p.y - S(e, 56)); g.lineTo(p.x, p.y - S(e, 72)); g.lineTo(p.x - S(e, 9), p.y - S(e, 56)); g.closePath(); g.fill(); }
      // 距离字（el.objective.distance = false 时不写）
      if (!(elChosen(e, 'distance') && !ownBool(e, 'distance', true))) { const d = pack().world.distance; T(e, d, p.x - W(e, d, e.small) / 2, p.y - S(e, 40), S(e, 18), { ...e.small, weight: 700, outline: { color: 'rgba(0,0,0,0.7)', width: 1 } }); }
      return;
    }
    if (f === 'edgeArrow') {
      const x = e.R.x + e.R.w - S(e, 28), y = e.R.y + e.R.h * 0.45;
      g.fillStyle = oc; g.beginPath(); g.moveTo(x + S(e, 18), y); g.lineTo(x, y - S(e, 12)); g.lineTo(x, y + S(e, 12)); g.closePath(); g.fill();
      return;
    }
    if (f === 'note') panel(e, a, true, { rotate: -1.2, bg: { solid: '#f6e7a8' }, border: { width: 0, color: '#000' } });
    // 说明行的字色（el.objective.descColor，M12b-28，cyberpunk-2077#0：任务名正文色、目标行任务黄）：没选时原来的正文色
    const color = f === 'note' ? '#3a2e12' : objColor(e, 'descColor', e.text);
    // 进度条 + 前置图标位（M12a-11）：cmp.gauge@el.objective 显式给了时，标题前画一个目标图标、标题下画一条细进度条（Factorio 的研究进度）
    const prog = objProgress(e), ix = prog ? S(e, 18) : 0, tx = a.x + (f === 'note' ? S(e, 10) : 0);
    if (prog) icon(e, DATA.objectiveIcon ?? '◆', tx + S(e, 7), a.y + S(e, 11), S(e, 12), oc);
    // 标题前缀（typ.titlePrefix，M12b-43：XCOM 的「> 行动代号」），没选时 0
    const oto = { ...e.title, color: f === 'note' ? '#3a2e12' : oc, size: S(e, 12) };
    // 标题前缀标记（el.objective.marker，M12b-28，control#14：描边菱形套实心小菱形）：选过时画在标题前，再接 typ.titlePrefix
    const mk = objMarker(e, tx + ix, a.y + S(e, 2), S(e, 18), oto.color), opw = titlePrefix(e, tx + ix + mk, a.y + S(e, 2), S(e, 18), oto);
    T(e, f === 'text' ? objText(e).title : DATA.objectiveTitle, tx + ix + mk + opw, a.y + S(e, 2), S(e, 18), oto);
    if (prog) gaugeOf(e, { x: tx + ix, y: a.y + S(e, 22), w: a.x + a.w - tx - ix - S(e, 4), h: S(e, 4) }, DATA.objectiveProgress ?? 0.6, 0, 'thinBar', { role: 'objective' });
    const lines = f === 'text' ? objText(e).lines : DATA.objective;
    const rowH = Math.max(S(e, 24), LH(e, e.base));
    // 清单里完成的那条（第一条）按 st.done 画（M12a-27，显式选了才画：strike = 划线 + 好色字、grayOut = 压暗、tag / stamp = 行尾小牌；原来只有框里的勾）
    const doneMode = f === 'checklist' && chosen(e, 'st.done') ? e.r.str('st.done', 'check') : '';
    lines.forEach((l, i) => {
      const y = a.y + S(e, 22) + (prog ? S(e, OBJ_BAR) : 0) + i * rowH;
      const dn = i === 0 ? doneMode : '';
      if (dn === 'grayOut') { g.save(); g.globalAlpha *= 0.45; if (e.tx !== g) { e.tx.save(); e.tx.globalAlpha *= 0.45; } }
      // 勾选框形（el.objective.checkShape = circle，M12b-28，frostpunk#8）：圆框；没选时原来的方框
      if (f === 'checklist') { g.strokeStyle = color; g.lineWidth = 1.5; if (pickedStr(e, ownKey(e, 'checkShape'), 'square') === 'circle') { g.beginPath(); g.arc(a.x + S(e, 6), y + S(e, 11), S(e, 6), 0, Math.PI * 2); g.stroke(); } else g.strokeRect(a.x, y + S(e, 5), S(e, 12), S(e, 12)); if (i === 0) T(e, '✓', a.x + S(e, 1), y, S(e, 22), { ...e.small, color: checkInk(e, color), weight: 800 }); }
      const lx = a.x + (f === 'checklist' ? S(e, 20) : f === 'note' ? S(e, 10) : 0);
      const lw = T(e, l, lx, y, S(e, 22), { ...e.base, color: dn === 'strike' ? e.good : color, ...(f === 'text' ? { outline: { color: 'rgba(0,0,0,0.55)', width: 1 } } : {}) });
      if (dn === 'strike') { g.fillStyle = e.good; g.fillRect(lx, y + S(e, 11), lw, Math.max(1, e.base.size * 0.08)); }
      if (dn === 'tag' || dn === 'stamp') { const t = '已完成', tw = W(e, t, e.small) + S(e, 12); plate(e, { x: lx + lw + S(e, 6), y: y + S(e, 2), w: tw, h: S(e, 18) }, t, 'pill', { size: e.small.size * 0.9 }); }
      if (dn === 'grayOut') { g.restore(); if (e.tx !== g) e.tx.restore(); }
    });
  },
});

/**
 * 目标的 text 画法写什么（M12b-61，control#15）：标题 = 任务名、说明 = 一句能折两行的长句（内容包 texts.objective，按 230 宽折、至多两行）；
 * 包没写时原来的「目标分类字 + 第一条目标」
 */
function objText(e: ElCtx): { title: string; lines: string[] } {
  const o = textFor('objective', e.r);
  if (!o) return { title: DATA.objectiveTitle, lines: DATA.objective.slice(0, 1) };
  // 折出来超过两行时第二行以「…」结尾（终期审查修复 ⑦：原来直接丢掉第三行，factorio 的目标写成半句）
  const all = wrapLines(e.tx, o[1], S(e, 230), { ...e.base }), lines = all.slice(0, 2);
  if (all.length > 2) lines[1] = fitLine(e.tx, lines[1], S(e, 230), { ...e.base }, true);
  return { title: o[0], lines };
}

/** 目标进度条那一行多占的高（细条 4 + 上下空） */
const OBJ_BAR = 10;
/** 目标要不要画进度条（M12a-11）：cmp.gauge@el.objective 显式给了（全局的 cmp.gauge 不算——那是整套 UI 的条形，不是"这个目标有进度"） */
const objProgress = (e: ElCtx) => { const k = cmpKey(e, 'cmp.gauge'); return k !== 'cmp.gauge' && chosen(e, k); };

/* ---- M12b-28 目标与追踪器 ---- */
/** 新画法：剧情条、分节简报、页签清单面板、研究 / 市政追踪行 */
const OBJ_NEW = new Set(['storyTracker', 'sectioned', 'panelTab', 'trackerRows', 'blindPlate']);
/**
 * 目标的标题 / 说明色（el.objective.titleColor / descColor，M12b-28，cyberpunk-2077#0、control#14）：颜色角色名（objective / quest 任务色、text 正文、heading 标题、accent / accent2、
 * good / warn / bad / danger / muted）或直接的颜色；没选时 def（标题 = 目标色，说明 = 正文色）。旧皮肤只认皮肤之后的层
 */
function objColor(e: ElCtx, k: 'titleColor' | 'descColor', def: string): string {
  const v = pickedStr(e, ownKey(e, k), 'auto');
  if (v === 'auto') return def;
  if (v === 'text') return e.text;
  if (v === 'heading') return e.heading;
  if (v === 'accent') return e.accent;
  if (v === 'accent2') return e.accent2;
  if (v === 'quest' || v === 'objective') return e.quest;
  const ro = e.th.roles as unknown as Record<string, unknown>;
  return typeof ro[v] === 'string' ? (ro[v] as string) : /^(#|rgb|hsl)/.test(v) ? v : def;
}
/**
 * 标题前缀标记（el.objective.marker，M12b-28）：diamond 实心菱形、diamondNested 描边菱形套实心小菱形（Control）、dot 圆点、shape = vis.silhouette@el.objective 的外形小章；
 * 画在 (x, 行顶 y) 的行高 h 里、色 = 标题色，返回占的宽（没选 0）
 */
function objMarker(e: ElCtx, x: number, y: number, h: number, color: string): number {
  const m = pickedStr(e, ownKey(e, 'marker'), 'none');
  if (m === 'none') return 0;
  const g = e.g, s = h * 0.36, cx = x + s, cy = y + h / 2;
  const dia = (r: number) => { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); };
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, s * 0.22);
  if (m === 'diamond') { dia(s); g.fill(); }
  else if (m === 'diamondNested') { dia(s); g.stroke(); dia(s * 0.42); g.fill(); }
  else if (m === 'dot') { g.beginPath(); g.arc(cx, cy, s * 0.6, 0, Math.PI * 2); g.fill(); }
  else { const r = { x: cx - s, y: cy - s, w: s * 2, h: s * 2 }, sty = shapeStyle(e, 'marker', { bg: { solid: color } }, r); g.restore(); if (!sty.bare) drawBox(g, r, sty, e.pal); return s * 2 + S(e, 6); }
  g.restore();
  return s * 2 + S(e, 6);
}
/** 剧情条的数据（hud.storyTracker；没写时：倒计时 5、标题 = 目标标题、两条子目标、第一条完成） */
const storyOf = () => DATA.storyTracker ?? { count: '5', title: DATA.objectiveTitle, lean: '✦', subs: DATA.objective.slice(0, 2).map((t, i) => [t, i === 0] as [string, boolean]) };
/** 分节简报的数据（hud.objectiveSections / objectiveWarn；没写时：主目标一节 + BONUS OBJECTIVES 一节 + 警告） */
const sectionsOf = () => DATA.objectiveSections ?? [{ title: DATA.objectiveTitle, rows: [[DATA.objectiveIcon ?? '◆', DATA.objective[0]] as [string, string]] }, { title: 'BONUS OBJECTIVES', rows: DATA.objective.slice(1, 3).map((l) => ['★', l] as [string, string]) }];
const warnOf = () => DATA.objectiveWarn ?? ['WARNING!', '环境警告'];
/** 追踪行的数据（hud.tracker；没写时：标题 = 目标标题，研究 / 市政两行） */
const trackerOf = () => DATA.tracker ?? { title: DATA.objectiveTitle, rows: [['✦', DATA.objective[0], 0.62, 4, '◆'], ['★', DATA.objective[1] ?? DATA.objective[0], 0.35, 7, '✚']] as [string, string, number, number, string][] };
function objNewSize(e: ElCtx, f: string): { w: number; h: number } {
  const rh = Math.max(S(e, 22), LH(e, e.small) + S(e, 4)), th = Math.max(S(e, 22), LH(e, e.title));
  // 盲注名牌（M12b-63 收 balatro#7）：彩色名牌条 + 筹码圆 + 「至少得分」+ 目标分 + 奖励
  if (f === 'blindPlate') { const b = blindOf(); return { w: fitW(e, S(e, 220), [[b[0], e.title], [`${fmtNumber(e, b[1], b[1].toLocaleString('en-US'))}`, { ...e.title, size: e.title.size * 1.3 }]], S(e, 70)), h: th + S(e, 8) + rh * 2 + S(e, 10) }; }
  if (f === 'storyTracker') { const st = storyOf(); return { w: fitW(e, S(e, 300), [[st.title.toUpperCase(), { ...e.title, size: S(e, 15) }], ...st.subs.map(([t]) => [t, e.small] as [string, Partial<TextOpts>])], S(e, 96)), h: S(e, 56) + rh * Math.max(1, st.subs.length) + S(e, 6) }; }
  if (f === 'sectioned') { const secs = sectionsOf(), [wt, wl] = warnOf(); const lines = secs.flatMap((sc) => sc.rows.map(([, t]) => [t, e.small] as [string, Partial<TextOpts>])); return { w: fitW(e, S(e, 280), [...lines, [wl, e.base], ...secs.map((sc) => [sc.title, e.title] as [string, Partial<TextOpts>]), [wt, e.small]], S(e, 40)), h: secs.reduce((h, sc) => h + th + S(e, 6) + rh * sc.rows.length, 0) + th + S(e, 34) + S(e, 8) }; }
  if (f === 'panelTab') return { w: fitW(e, S(e, 240), DATA.objective.map((l) => [l, e.base] as [string, Partial<TextOpts>]), S(e, 40)), h: S(e, 24) + S(e, 14) + rh * DATA.objective.length + S(e, 8) };
  const tr = trackerOf();
  return { w: fitW(e, S(e, 260), [[tr.title, e.title], ...tr.rows.map(([, n]) => [n, e.base] as [string, Partial<TextOpts>])], S(e, 110)), h: th + S(e, 8) + (S(e, 34)) * tr.rows.length + S(e, 4) };
}
/** 盲注名牌的数据：内容包 hud.blinds 的第一条（[名字, 目标分, 奖励, 颜色]），没写时目标名 + 300 + 3 + 强调色 */
const blindOf = (): [string, number, number, string] => DATA.blinds?.[0] ?? [DATA.objectiveTitle ?? '目标', 300, 3, ''];
/** 画新画法（M12b-28） */
function drawObjNew(e: ElCtx, a: Rect, f: string, oc: string) {
  const g = e.g, rh = Math.max(S(e, 22), LH(e, e.small) + S(e, 4)), th = Math.max(S(e, 22), LH(e, e.title)), desc = objColor(e, 'descColor', e.text);
  if (f === 'blindPlate') {
    // 名牌条（盲注的颜色）+ 下面一块深底：左边筹码圆（同色描边），右边「至少得分」小字 + 红色目标分（drawNumber）+ 奖励（$ 个数）
    const [name, target, reward, col0] = blindOf(), bc = col0.startsWith('#') ? col0 : e.accent;
    panel(e, { x: a.x, y: a.y, w: a.w, h: th + S(e, 4) }, true, { bg: { solid: bc }, radius: S(e, 6) });
    const no = { ...e.title, weight: 800, color: '#ffffff' }; T(e, name, a.x + a.w / 2 - W(e, name, no) / 2, a.y + S(e, 2), th, no);
    const body = { x: a.x, y: a.y + th + S(e, 8), w: a.w, h: a.h - th - S(e, 8) };
    panel(e, body, true, { bg: { solid: withAlpha('#000', 0.45) }, radius: S(e, 6) });
    const cr = Math.min(body.h * 0.36, S(e, 22)), cx = body.x + S(e, 10) + cr, cy = body.y + body.h / 2;
    g.save(); g.fillStyle = mix(bc, '#000', 0.35); g.strokeStyle = bc; g.lineWidth = Math.max(2, cr * 0.18); g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill(); g.stroke();
    g.setLineDash([cr * 0.35, cr * 0.25]); g.strokeStyle = withAlpha('#fff', 0.7); g.lineWidth = Math.max(1, cr * 0.1); g.beginPath(); g.arc(cx, cy, cr * 0.72, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.restore();
    const tx = cx + cr + S(e, 10), lo = { ...e.small, color: mutedOf(e, 0.75) };
    T(e, '至少得分', tx, body.y + S(e, 4), rh, lo);
    const big = { ...e.title, size: e.title.size * 1.3, weight: 900, color: e.bad }, ts = fmtNumber(e, target, target.toLocaleString('en-US'));
    drawNumber(e, ts, tx, body.y + S(e, 4) + rh, LH(e, big, 1.1), big);
    const rw = `奖励 ${'$'.repeat(Math.max(1, Math.min(6, reward)))}`; T(e, rw, body.x + body.w - W(e, rw, { ...e.small, color: e.warn }) - S(e, 8), body.y + body.h - rh - S(e, 2), rh, { ...e.small, color: e.warn });
    return;
  }
  const doneMode = chosen(e, 'st.done') ? e.r.str('st.done', 'check') : '';
  const circle = pickedStr(e, ownKey(e, 'checkShape'), f === 'storyTracker' ? 'circle' : 'square') === 'circle';
  // 一行勾选：框（圆 / 方）+ 完成的勾 + 文字（完成态按 st.done：strike 划线好色、grayOut 压暗）
  const check = (x: number, y: number, t: string, done: boolean) => {
    const bs = S(e, 11), cy = y + rh / 2;
    g.save(); g.strokeStyle = desc; g.lineWidth = 1.5;
    if (circle) { g.beginPath(); g.arc(x + bs / 2, cy, bs / 2, 0, Math.PI * 2); g.stroke(); } else g.strokeRect(x, cy - bs / 2, bs, bs);
    g.restore();
    if (done) T(e, '✓', x + S(e, 1), y, rh, { ...e.small, color: checkInk(e, desc), weight: 800 });
    const dn = done ? doneMode : '';
    const tw = T(e, t, x + bs + S(e, 6), y, rh, { ...e.small, color: dn === 'strike' ? e.good : desc, ...(dn === 'grayOut' ? { color: withAlpha(desc, 0.45) } : {}) });
    if (dn === 'strike') { g.fillStyle = e.good; g.fillRect(x + bs + S(e, 6), cy, tw, Math.max(1, e.small.size * 0.08)); }
  };
  if (f === 'storyTracker') {
    // 剧情条（frostpunk#8）：圆章里写倒计时（外圈一道 ring 进度，cmp.gauge = ring 的画法）+ 全大写衬线标题 + 右端倾向小徽章，下面一行圆形勾选的子目标
    const st = storyOf(), R0 = S(e, 22), cx = a.x + R0 + S(e, 2), cy = a.y + S(e, 26);
    g.save(); g.fillStyle = e.fill(0, 'danger'); g.beginPath(); g.arc(cx, cy, R0, 0, Math.PI * 2); g.fill(); g.restore();
    gauge(e, { x: cx - R0 - S(e, 3), y: cy - R0 - S(e, 3), w: (R0 + S(e, 3)) * 2, h: (R0 + S(e, 3)) * 2 }, 0.7, 'ring', withAlpha('#ffffff', 0.85));
    const co = { ...e.big, size: S(e, 22), weight: 800, color: '#fff' };
    drawNumber(e, st.count, cx - numberWidth(e, st.count, co) / 2, cy - S(e, 15), S(e, 30), co);
    const to = { ...e.title, size: S(e, 15), color: oc, ...displayFor(e, 'title') }, t = st.title.toUpperCase();
    T(e, t, a.x + R0 * 2 + S(e, 12), cy - S(e, 13), S(e, 26), to);
    if (st.lean) { const lx = a.x + a.w - S(e, 14), ly = cy; badge(e, lx, ly, S(e, 10), 'roundel', ''); icon(e, st.lean, lx, ly, S(e, 11), onColorOf(e.accent, '#000')); }
    st.subs.forEach(([tx, done], i) => check(a.x + R0 * 2 + S(e, 12), a.y + S(e, 54) + i * rh, tx, done));
    return;
  }
  if (f === 'sectioned') {
    // 分节简报（into-the-breach#17）：每节 = 小标题 + 细线 + 图标行；最后「WARNING!」分隔 + 环境警告（st.alert 含 framedLabel 时黄框警告条）
    panel(e, a, true);
    let y = a.y + S(e, 6);
    const x = a.x + S(e, 10), w = a.w - S(e, 20);
    for (const sc of sectionsOf()) {
      T(e, sc.title, x, y, th, { ...e.title, size: S(e, 13), color: oc });
      y += th; g.save(); g.fillStyle = withAlpha(e.text, 0.35); g.fillRect(x, y + S(e, 1), w, Math.max(1, S(e, 1))); g.restore(); y += S(e, 6);
      for (const [ic, t] of sc.rows) { icon(e, ic, x + S(e, 7), y + rh / 2, S(e, 12), oc); T(e, t, x + S(e, 20), y, rh, { ...e.small, color: desc }); y += rh; }
    }
    const [wt, wl] = warnOf(), framed = (chosenKey(e, 'st.alert') ? e.r.list(chosenKey(e, 'st.alert')!) : []).includes('framedLabel');
    T(e, wt, x, y, th, { ...e.small, weight: 800, color: e.warn });
    y += th;
    if (framed) { const q = { x, y, w, h: S(e, 28) }; drawBox(g, q, { bg: { solid: withAlpha(e.warn, 0.12) }, border: { width: Math.max(1, S(e, 2)), color: e.warn }, radius: S(e, 2) }, e.pal); T(e, wl, q.x + S(e, 10), q.y, q.h, { ...e.base, weight: 800, color: e.warn }); }
    else T(e, wl, x, y, S(e, 28), { ...e.base, color: e.warn });
    return;
  }
  if (f === 'panelTab') {
    // 页签清单面板（into-the-breach#23）：细框面板 + 顶边一枚页签标题（cmp.plate = tab 的样子）+ 清单
    const tabH = S(e, 24), box = { x: a.x, y: a.y + tabH, w: a.w, h: a.h - tabH };
    panel(e, box, true);
    const tt = DATA.objectiveTitle, tw = W(e, tt, e.small) + S(e, 24);
    plate(e, { x: a.x + S(e, 8), y: a.y + S(e, 2), w: tw, h: tabH }, tt, 'tab', { ...e.small, weight: 700 });
    DATA.objective.forEach((l, i) => check(box.x + S(e, 10), box.y + S(e, 8) + i * rh, l, i === 0));
    return;
  }
  // 研究 / 市政追踪行（civ6#17）：标题条（band 标牌）+ 每行 = 圆形进度环图标 + 名字 + 解锁小图标 + 剩几回合；行色 = 类别色表（col.coding 含 lineId），没有时强调色 / 第二强调色
  const tr = trackerOf();
  plate(e, { x: a.x, y: a.y, w: a.w, h: th }, tr.title, 'band', { ...e.title, size: S(e, 13) });
  tr.rows.forEach(([ic, nm, pr, turns, un], i) => {
    const y = a.y + th + S(e, 8) + i * S(e, 34), col = lineColor(e, i) ?? (i ? e.accent2 : e.accent), R0 = S(e, 14), cx = a.x + R0 + S(e, 2), cy = y + S(e, 15);
    g.save(); g.fillStyle = withAlpha(col, 0.25); g.beginPath(); g.arc(cx, cy, R0, 0, Math.PI * 2); g.fill(); g.restore();
    gauge(e, { x: cx - R0, y: cy - R0, w: R0 * 2, h: R0 * 2 }, pr, 'ring', col);
    icon(e, ic, cx, cy, S(e, 13), col);
    T(e, nm, a.x + R0 * 2 + S(e, 10), y + S(e, 2), S(e, 26), { ...e.base, color: desc });
    const ts = String(turns), to = { ...e.small, weight: 800 }, tw = numberWidth(e, ts, to);
    drawNumber(e, ts, a.x + a.w - tw - S(e, 4), y + S(e, 4), S(e, 22), to);
    icon(e, un, a.x + a.w - tw - S(e, 18), y + S(e, 15), S(e, 11), col);
  });
}

/* 交互提示（世界挂点：兴趣点） */
registerElement({
  id: 'el.interact', forms: ['keyPrompt', 'bracket', 'bubble', 'cursor', 'iconBubble', 'poiRing', 'magnifier'], anchor: 'center', attach: 'poi',
  // 画在兴趣点上：不占锚点列
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  // 小图标气泡画在几个点上（B6 审查修复 ⑥ / ㉒）：第一颗报 pointBox，其余的跟着登记；其余画法照旧按角色框
  pointBox: (e, p) => (e.forms[0] === 'iconBubble' ? bubbleBox(e, bubblePoints(e, p)[0]) : null),
  pointBoxes: (e, p) => (e.forms[0] === 'iconBubble' ? bubblePoints(e, p).slice(1).map((q) => bubbleBox(e, q)) : []),
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    // 挂点读 elx.attachTo（M12a-15：held = 手持物、cursor = 光标；没给时兴趣点）
    const p = attachPoint(e, attachFor(e));
    const act = DATA.interact, key = DATA.interactKey;
    // 只有图标的小气泡（M12b-19，octopath#19）：白色小圆气泡里一个「…」，可同时挂在几个兴趣点上（场景投影的单位；没有场景时只有这一个点）
    if (f === 'iconBubble') { for (const q of bubblePoints(e, p)) iconBubble(e, q.x, q.y - S(e, 56), '…'); return; }
    if (f === 'poiRing' || f === 'magnifier') { interactMark(e, f, p); return; }
    if (f === 'cursor') {
      // 光标集（ix.cursorSet，M12b-59，stardew#10）选过时画那支光标（ix.cursorContext 开着时旁边挂按目标换的小图标），否则原来的箭头
      const kind = cursorSetOf(e);
      if (kind) drawCursor(g, kind, p.x, p.y, S(e, 20), cursorInk(e), cursorCtxOf(e, attachFor(e), act));
      else { g.fillStyle = e.text; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y + S(e, 18)); g.lineTo(p.x + S(e, 5), p.y + S(e, 13)); g.lineTo(p.x + S(e, 12), p.y + S(e, 13)); g.closePath(); g.fill(); g.stroke(); }
      const ol = { color: 'rgba(0,0,0,0.6)', width: 1 };
      // 物品名行（el.interact.itemName，M12b-60，dont-starve#16）：动作那行之上写悬停的物品名（标题字）
      let ty = p.y + S(e, 6);
      if (elChosen(e, 'itemName') && ownBool(e, 'itemName')) { const nm = DATA.hoverItem ?? DATA.featured.name; T(e, nm, p.x + S(e, 16), ty, S(e, 22), { ...e.title, size: S(e, 14), outline: ol }); ty += S(e, 22); }
      // 动作标签（elx.valueLabel = none 时不写，obra-dinn#25）；鼠标字形集（ix.glyphs = mouse）时写成「鼠标键图形: 动作」
      if (valueKind(e, 'auto') !== 'none') {
        let x = p.x + S(e, 16);
        if (e.r.str('ix.glyphs', 'keycap') === 'mouse') { x += keyCap(e, x, ty + S(e, 1), S(e, 18), key, DATA.interactPad) + S(e, 2); T(e, ':', x, ty, S(e, 20), { ...e.small, outline: ol }); x += W(e, ': ', e.small); }
        T(e, act, x, ty, S(e, 20), { ...e.small, outline: ol });
      }
      return;
    }
    if (f === 'bracket') {
      const s = S(e, 26);
      g.strokeStyle = e.accent; g.lineWidth = 2.5;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(p.x + sx * s, p.y + sy * (s - 8)); g.lineTo(p.x + sx * s, p.y + sy * s); g.lineTo(p.x + sx * (s - 8), p.y + sy * s); g.stroke(); }
      // 框下的「[E] 动作」（M12a-13）：el.interact.valueLabel 显式给了 none 时只画括号（Factorio，动作字归 keyPrompt）
      const l = `[${key}] ${act}`;
      if (valueKind(e, 'auto') !== 'none') T(e, l, p.x - W(e, l) / 2, p.y + s + S(e, 4), S(e, 20), { ...e.base, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } });
      return;
    }
    const w = W(e, act) + S(e, 52), h = S(e, 32);
    const r = { x: p.x - w / 2, y: p.y - h - (f === 'bubble' ? S(e, 14) : 0), w, h };
    panel(e, r, true, f === 'bubble' ? { radiusPct: 50 } : {});
    if (f === 'bubble') { g.fillStyle = e.accent; g.beginPath(); g.moveTo(p.x - 6, r.y + h); g.lineTo(p.x + 6, r.y + h); g.lineTo(p.x, r.y + h + S(e, 10)); g.fill(); }
    const kw = keyCap(e, r.x + S(e, 6), r.y + S(e, 5), S(e, 22), key, DATA.interactPad);
    T(e, act, r.x + S(e, 14) + kw, r.y, h);
  },
});

/**
 * 交互点的小画法（M12b-60）：poiRing = 可交互物上一圈小圆环 + 中心点、不写字（disco-elysium#19，色 = 好色 / col.accent@el.interact）；
 * magnifier = 放大镜光标（obra-dinn#25）：镜片里把画布上这一块放大 2 倍贴回（只放大 UI 画布上已经画出的东西：模板的插画 / 面板；3D 场景不在这张画布上），外圈 + 斜柄
 */
function interactMark(e: ElCtx, f: string, p: { x: number; y: number }) {
  const g = e.g;
  if (f === 'poiRing') {
    const c = e.fill(0, 'good'), r = S(e, 10);
    g.save(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = Math.max(2, S(e, 3.5)); g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = c; g.lineWidth = Math.max(1.5, S(e, 2)); g.stroke();
    g.fillStyle = c; g.beginPath(); g.arc(p.x, p.y, S(e, 2.5), 0, Math.PI * 2); g.fill(); g.restore();
    return;
  }
  const r = S(e, 34), m = g.getTransform(), src = g.canvas as HTMLCanvasElement | undefined;
  g.save();
  g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.clip();
  // 放大：源 = 镜心周围半径 r / 2 的那块（设备像素），贴回整个镜片
  if (src && typeof (src as { width?: number }).width === 'number') g.drawImage(src, m.a * (p.x - r / 2) + m.e, m.d * (p.y - r / 2) + m.f, m.a * r, m.d * r, p.x - r, p.y - r, r * 2, r * 2);
  const gl = g.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, 0, p.x, p.y, r);
  gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  g.restore();
  g.save(); g.strokeStyle = '#1a1a1a'; g.lineWidth = Math.max(3, S(e, 5)); g.lineCap = 'round';
  g.beginPath(); g.moveTo(p.x + r * 0.72, p.y + r * 0.72); g.lineTo(p.x + r * 1.35, p.y + r * 1.35); g.stroke();
  g.lineWidth = Math.max(2, S(e, 3)); g.strokeStyle = e.text; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke(); g.restore();
}

/** 小图标气泡挂在哪几个点上：场景投影的单位（最多 4 个），没有场景时只有挂点这一个 */
function bubblePoints(e: ElCtx, p: { x: number; y: number }): { x: number; y: number }[] {
  const wv = e.noWorld ? null : worldNow(), pts = wv?.all.filter((q) => q.on).slice(0, 4).map((q) => ({ x: q.x, y: q.y })) ?? [];
  // 每块的附加平移（ptShiftAt，终期审查修复 ㉖）
  return (pts.length ? pts : [p]).map((q, i) => ptShiftAt(e, i, q));
}
/** 一颗小图标气泡画出的范围（圆心在点上方 56、半径 13，尾巴圆点往下到 1.74 倍半径） */
const bubbleBox = (e: ElCtx, q: { x: number; y: number }): Rect => { const r = S(e, 13), cy = q.y - S(e, 56); return { x: q.x - r, y: cy - r, w: r * 2, h: r * 2.74 }; };
/** 世界里的小图标气泡（el.interact = iconBubble）：白色圆气泡 + 两颗小尾巴圆点，中间一个符号（深色） */
export function iconBubble(e: ElCtx, cx: number, cy: number, ch: string, r0 = 13) {
  const g = e.g, r = S(e, r0);
  g.save(); g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(1, S(e, 1));
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(cx + r * 0.35, cy + r * 1.25, r * 0.22, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + r * 0.6, cy + r * 1.62, r * 0.12, 0, Math.PI * 2); g.fill();
  g.restore();
  const o = { ...e.base, size: r * 1.1, weight: 900, color: '#1f2328' };
  T(e, ch, cx - W(e, ch, o) / 2, cy - r * 0.95, r * 1.6, o);
}

/* 敌人血条 / Boss 条 / 目标框 / 意图 / 预警 */
registerElement({
  id: 'el.threat', forms: ['bossBar', 'healthBar', 'targetFrame', 'intent', 'telegraph', 'lockOn', 'edgeDir', 'hitChance', 'weaknessGrid', 'detection', 'glint', 'alertMark', 'eliteMark', 'targetRow'], anchor: 'tc',
  // 多选画法拆开画时（M12a-14）：Boss 条在上中，头顶血条 / 意图 / 预警 / 锁定 / 命中率挂目标（Hades、Elden：底中 Boss 条 + 小怪头顶小条）
  // M12b-19：弱点格 / 发现度 / 闪光 / 警觉 / 精英挂目标；目标切换行（整块）在下中
  formDefaults: { bossBar: { anchor: 'tc' }, healthBar: { attach: 'target' }, intent: { attach: 'target' }, telegraph: { attach: 'target' }, lockOn: { attach: 'target' }, hitChance: { attach: 'target' }, weaknessGrid: { attach: 'target' }, detection: { attach: 'target' }, glint: { attach: 'target' }, alertMark: { attach: 'target' }, eliteMark: { attach: 'target' }, targetRow: { anchor: 'bc' } },
  points: { healthBar: 'target', intent: 'target', telegraph: 'target', lockOn: 'target', hitChance: 'target', weaknessGrid: 'target', detection: 'target', glint: 'target', alertMark: 'target', eliteMark: 'target' },
  attachSide: 'above',
  // 头顶血条 / 锁定画出来的范围（M12b-65 ⑧）：条在挂点上方 46；锁定再加准星圈（原来按角色框登记，推开后条仍压在 Boss 条上）
  pointBox: (e, p) => {
    const f = e.forms[0];
    if (MARKS.has(f)) return markBox(e, f, p);
    if (f !== 'healthBar' && f !== 'lockOn') return null;
    const bar = { x: p.x - S(e, 30), y: p.y - S(e, 46), w: S(e, 60) + statusBesideW(e), h: S(e, 6) * thicknessOf(e) };
    if (f === 'healthBar') return bar;
    const rr = S(e, 28), y0 = Math.min(bar.y, p.y - S(e, 12) - rr);
    return { x: p.x - rr, y: y0, w: rr * 2, h: p.y - S(e, 12) + rr - y0 };
  },
  size: (e) => {
    const f = e.forms[0];
    // 高 = 原来的「22 + 名字行」（名字行这里按 18 起算，与原来一样），条加粗 / 条上下的数值标注另加
    if (f === 'bossBar') { const B = bossMetrics(e, true); return { w: B.w * B.n + B.gap * (B.n - 1), h: S(e, 22) + Math.max(S(e, 18), LH(e, e.title, 1.2)) + (B.bh - S(e, 12)) + B.vh }; }
    if (f === 'targetFrame') return { w: fitW(e, S(e, 210), [[`${DATA.target.name}  Lv.${DATA.target.level}`, { ...e.base, weight: 700 }]], S(e, 62)), h: Math.max(S(e, 52), S(e, 30) + LH(e, e.base)) };
    if (f === 'targetRow') { const n = ownCount(e, 4, 6); return { w: n * S(e, 56) - S(e, 8), h: S(e, 50) + LH(e, e.small) }; }
    return { w: S(e, 10), h: S(e, 10) };
  },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g, p = attachPoint(e, attachFor(e));
    // 敌人 / 危险色（M12a-02 的 danger 角色，默认坏色；col.accent@el.threat 时用作用域强调色）
    const dc = e.fill(0, 'danger');
    // 数值标注（M12a-13）：Boss 条 / 目标框 / 头顶血条都按 elx.valueLabel / Pos 标（默认不标）
    const vk = valueKind(e), val = (v: number) => ({ text: valueText(e, v, DATA.hpMax, vk), pos: e.valueLabelPos, kind: vk });
    switch (f) {
      case 'bossBar': {
        // Boss 名（M12a-11）：el.threat.nameAlign = left 时左对齐在条左端上方（黑神话 / Elden），默认居中；elx.label = hide 不写名字；名字用标题字（typ.display）
        // 几条 Boss 条并排（el.threat.count = elx.count，M12b-04，hades#7）：每条一个 Boss（内容包 hud.bosses，没写时 Boss + 当前目标），名字在各自条的上方；只有一条时与原来一样
        const B = bossMetrics(e), list = bossList(B.n), bw = B.n > 1 ? (a.w - B.gap * (B.n - 1)) / B.n : a.w;
        // Boss 登场（M12c-14，chk.demo = bossIntro / chk.simPose = bossIntro）：名牌先淡入（前 1/3），条再从空涨到当前血量；没有登场事件时 bi = 1（原来的）
        const bi = simNow().bossIntro, nameA = Math.min(1, bi * 3), barK = Math.max(0, Math.min(1, (bi - 0.3) / 0.7)), cs = e.tx === g ? [g] : [g, e.tx];
        list.forEach(([n, hp0], i) => {
          const x = a.x + i * (bw + B.gap), hp = bi < 1 ? hp0 * barK : hp0;
          if (labelShown(e) && nameA > 0) {
            if (bi < 1) for (const c of cs) { c.save(); c.globalAlpha *= nameA; }
            T(e, n, B.align === 'left' ? x : x + bw / 2 - W(e, n, e.title) / 2, a.y, B.nh, e.title);
            if (bi < 1) for (const c of cs) c.restore();
          }
          // 条读 cmp.gauge@el.threat；条长 el.threat.barWidth（占屏宽比例，给了时不随 elx.scale 缩），粗细 elx.thickness
          gaugeOf(e, { x, y: a.y + B.nh + S(e, 2) + (e.valueLabelPos === 'above' ? B.vh : 0), w: bw - B.vw, h: B.bh }, hp, 0, 'bar', { color: dc, value: val(hp), x: { status: DATA.statusIcons ?? STATUS_ROW, recover: 0.08, badge: '' } });
        });
        return;
      }
      case 'targetFrame':
        panel(e, a, true);
        avatar(e, a.x + S(e, 26), a.y + a.h / 2, S(e, 18), DATA.target.name, dc);
        { const nh = Math.max(S(e, 18), LH(e, e.base, 1.2)); if (labelShown(e)) T(e, `${DATA.target.name}  Lv.${DATA.target.level}`, a.x + S(e, 52), a.y + S(e, 6), nh, { ...e.base, weight: 700 });
        gaugeOf(e, { x: a.x + S(e, 52), y: a.y + S(e, 12) + nh, w: a.w - S(e, 62), h: S(e, 8) }, DATA.target.hp, 0, 'bar', { fixed: true, color: dc, value: val(DATA.target.hp) }); }
        return;
      case 'healthBar': case 'lockOn': {
        // 头顶血条读 cmp.gauge@el.threat（M12a-11，原来写死横条：XCOM 的分段格）
        // 状态图标贴在头顶血条旁 / 下（cmp.gaugeExtra@el.threat = statusBeside / statusRow，M12b-19，into-the-breach#26）：给数值图形状态表，没选附属件时不画
        gaugeOf(e, { x: p.x - S(e, 30), y: p.y - S(e, 46), w: S(e, 60), h: S(e, 6) * thicknessOf(e) }, DATA.target.hp, 0, 'bar', { fixed: true, color: dc, value: val(DATA.target.hp), x: { status: DATA.statusIcons ?? STATUS_ROW } });
        // 锁定标记（M12b-68 的 el.threat.lockStyle，elden-ring#47）：reticle = 原来的危险色准星圈 + 十字刻度；dot = 目标身上一颗小实心点（焦点色 col.focus，深色细边）
        if (f === 'lockOn' && String(elOf(e, 'lockStyle') ?? 'reticle') === 'dot') { g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(p.x, p.y - S(e, 12), S(e, 4.5), 0, Math.PI * 2); g.fill(); g.fillStyle = e.focus; g.beginPath(); g.arc(p.x, p.y - S(e, 12), S(e, 3), 0, Math.PI * 2); g.fill(); }
        else if (f === 'lockOn') { g.strokeStyle = dc; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y - S(e, 12), S(e, 22), 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 4; i++) { const t = (i * Math.PI) / 2; g.beginPath(); g.moveTo(p.x + Math.cos(t) * S(e, 16), p.y - S(e, 12) + Math.sin(t) * S(e, 16)); g.lineTo(p.x + Math.cos(t) * S(e, 28), p.y - S(e, 12) + Math.sin(t) * S(e, 28)); g.stroke(); } }
        return;
      }
      case 'intent': {
        badge(e, p.x, p.y - S(e, 60), S(e, 13), 'crest', '');
        icon(e, DATA.intent[0], p.x, p.y - S(e, 62), S(e, 14), '#fff');
        const io = { ...e.title, color: dc, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } };
        // 意图数字自己的小暗牌（整合修复：D 的场景门槛「卡牌·牌桌」的「9×2」危险红直接压在牌桌上 1.2 : 1）：品质下限开着、画在 HUD 主画布上时垫一块 85% 暗牌，字色对它至少 3 : 1
        if (QUALITY.on && isHudCanvas(g)) {
          const tw = W(e, DATA.intent[1], io), q = { x: p.x + S(e, 12), y: p.y - S(e, 71), w: tw + S(e, 8), h: S(e, 18) };
          g.save(); g.fillStyle = 'rgba(14,14,18,0.85)'; g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, S(e, 4)); g.fill(); g.restore();
          logBoxRect(g, q, 'rgba(14,14,18,0.85)');
          T(e, DATA.intent[1], q.x + S(e, 4), q.y - S(e, 1), S(e, 20), { ...io, color: ensureContrast(resolveColor(dc, e.pal), '#0e0e12', 3.3) });
          return;
        }
        T(e, DATA.intent[1], p.x + S(e, 16), p.y - S(e, 72), S(e, 20), io);
        return;
      }
      case 'telegraph':
        g.fillStyle = withAlpha(dc, 0.25); g.strokeStyle = dc; g.lineWidth = 2;
        g.beginPath(); g.ellipse(p.x, p.y + S(e, 30), S(e, 90), S(e, 36), 0, 0, Math.PI * 2); g.fill(); g.stroke();
        return;
      case 'edgeDir': {
        const x = e.R.x + S(e, 14), y = e.R.y + e.R.h * 0.5;
        g.fillStyle = withAlpha(dc, 0.85); g.beginPath(); g.moveTo(x, y); g.lineTo(x + S(e, 16), y - S(e, 14)); g.lineTo(x + S(e, 16), y + S(e, 14)); g.closePath(); g.fill();
        return;
      }
      case 'hitChance': {
        const s = DATA.hitChance; T(e, s, p.x - W(e, s, e.title) / 2, p.y - S(e, 66), S(e, 22), { ...e.title, color: '#fff', outline: { color: 'rgba(0,0,0,0.7)', width: 1.5 } });
        return;
      }
      case 'targetRow': drawTargetRow(e, a, dc); return;
      default: if (MARKS.has(f)) drawMark(e, f, p, dc);
    }
  },
});

/* ---- M12b-19 敌方与世界标记（先单目标：画在当前目标的挂点上；每个敌人一份等 M12c-01 的演员列表） ---- */
const MARKS = new Set(['weaknessGrid', 'detection', 'glint', 'alertMark', 'eliteMark']);
/** 贴在头顶血条右侧的状态小方块占的宽（cmp.gaugeExtra@el.threat 含 statusBeside 时；pointBox 用） */
function statusBesideW(e: ElCtx): number {
  const k = chosenKey(e.part('bar'), 'cmp.gaugeExtra');
  if (!k || !e.r.list(k).includes('statusBeside')) return 0;
  const n = Math.min(4, (DATA.statusIcons ?? STATUS_ROW).length), s = Math.max(10 * e.k, Math.min(16 * e.k, S(e, 6) * thicknessOf(e) * 1.8));
  return n * (s + 2 * e.k) + 3 * e.k;
}
/** 弱点格的数据（hud.weakness，没写时护盾 4、六格里揭示两格） */
const weakOf = () => DATA.weakness ?? { shield: 4, slots: ['⚔', null, null, '✦', null, null] };
/** 每种标记画出来的范围（占位表的世界挂点 / 推开都用它） */
function markBox(e: ElCtx, f: string, p: { x: number; y: number }): Rect {
  if (f === 'weaknessGrid') { const n = weakOf().slots.length, c = S(e, 16), w = S(e, 30) + n * (c + S(e, 3)); return { x: p.x - w / 2, y: p.y + S(e, 6), w, h: c + S(e, 16) }; }
  if (f === 'glint') return { x: p.x + S(e, 6), y: p.y - S(e, 48), w: S(e, 28), h: S(e, 28) };
  const s = f === 'eliteMark' ? S(e, 15) : S(e, 13);
  // 警觉「!」与精英环徽都选了、挂在同一个点上（R4 · C3，renderer-issues 第 2 组 #1：原来同一个框，两枚叠在一起）：精英环徽留在原位，「!」叠在它上面（间距 4）
  const up = f === 'alertMark' && marksStacked(e) ? (S(e, 15) + S(e, 2)) * 2 + S(e, 4) : 0;
  return { x: p.x - s - S(e, 2), y: p.y - S(e, 78) - s - up, w: (s + S(e, 2)) * 2, h: (s + S(e, 2)) * 2 };
}
/** 这个元素的警觉标记与精英环徽是不是都选了、挂同一个点（按画法拆开后各自的挂点：elementParts） */
function marksStacked(e: ElCtx): boolean {
  const parts = elementParts(e.r, e.id), a = parts.find((q) => q.form === 'alertMark'), b = parts.find((q) => q.form === 'eliteMark');
  return !!a && !!b && a.attach === b.attach;
}
/** 发现度的比例（模拟里没有潜行状态：静帧 0.62） */
const DETECT = 0.62;
/**
 * 画一种世界标记（M12b-19）：
 *   weaknessGrid（octopath#5）= 目标脚下一行：「VULNERABLE」小字 + 蓝色盾牌写护盾数 + 一排弱点格（没揭示的画问号格 = st.locked 的 question，揭示的画武器 / 元素图标）；
 *   detection（cyberpunk-2077#24、ghost-of-tsushima#11）= 头顶发现度：外形 el.threat.detectShape（triangle 三角 / diamond 菱形 / eye 眼），从下往上按比例填，色阶 字色 → 警告色 → 危险色；
 *   glint（ghost-of-tsushima#11）= 武器上的四芒闪光：el.threat.glintKind = unblockable 危险色、parryable 信息色；
 *   alertMark（dead-cells#7）= 头顶「!」（el.threat.alertKind = suspicious 时「?」），st.alert 含 blink 时闪；eliteMark = 头顶一枚橙色环徽（环 + 星）
 */
function drawMark(e: ElCtx, f: string, p: { x: number; y: number }, dc: string) {
  const g = e.g, b = markBox(e, f, p);
  if (f === 'weaknessGrid') {
    const W0 = weakOf(), c = S(e, 16), y = b.y + S(e, 14), info = e.th.roles.info;
    T(e, 'VULNERABLE', b.x, b.y, S(e, 12), { ...e.small, size: S(e, 9), weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1 } });
    // 护盾：蓝盾 + 白数字
    const sx = b.x + S(e, 12), sy = y + c / 2;
    g.save(); g.beginPath(); g.moveTo(sx - S(e, 10), sy - S(e, 9)); g.lineTo(sx + S(e, 10), sy - S(e, 9)); g.lineTo(sx + S(e, 10), sy); g.quadraticCurveTo(sx + S(e, 8), sy + S(e, 8), sx, sy + S(e, 11)); g.quadraticCurveTo(sx - S(e, 8), sy + S(e, 8), sx - S(e, 10), sy); g.closePath();
    g.fillStyle = info; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = Math.max(1, S(e, 1)); g.stroke(); g.restore();
    const sn = String(W0.shield), so = { ...e.small, size: S(e, 11), weight: 900, color: '#fff' };
    drawNumber(e, sn, sx - numberWidth(e, sn, so) / 2, sy - S(e, 8), S(e, 16), so);
    W0.slots.forEach((ic, i) => {
      const q = { x: b.x + S(e, 28) + i * (c + S(e, 3)), y, w: c, h: c };
      drawBox(g, q, { bg: { solid: ic ? '#f2f2f2' : 'rgba(10,12,16,0.85)' }, border: { width: Math.max(1, S(e, 1)), color: ic ? '#1a1a1a' : withAlpha('#ffffff', 0.7) }, radius: S(e, 2) }, e.pal);
      if (ic) icon(e, ic, q.x + c / 2, q.y + c / 2, c * 0.62, '#1a1a1a');
      else T(e, '?', q.x + c / 2 - W(e, '?', { ...e.small, size: c * 0.7, weight: 900 }) / 2, q.y, c, { ...e.small, size: c * 0.7, weight: 900, color: '#ffffff' });
    });
    return;
  }
  if (f === 'glint') {
    const kind = pickedStr(e, ownKey(e, 'glintKind'), 'unblockable'), col = kind === 'parryable' ? e.th.roles.info : dc, cx = b.x + b.w / 2, cy = b.y + b.h / 2, L = b.w / 2;
    g.save(); g.shadowColor = col; g.shadowBlur = S(e, 10); g.fillStyle = withAlpha(col, 0.95);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const t = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? L * 0.18 : L; g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); }
    g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, L * 0.16, 0, Math.PI * 2); g.fill(); g.restore();
    return;
  }
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, s = b.w / 2 - S(e, 2);
  if (f === 'detection') {
    const shp = pickedStr(e, ownKey(e, 'detectShape'), 'triangle'), v = DETECT;
    const col = v < 0.5 ? mix(e.text, e.warn, v * 2) : mix(e.warn, dc, (v - 0.5) * 2);
    const path = () => {
      g.beginPath();
      if (shp === 'diamond') { g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.75, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.75, cy); }
      else if (shp === 'eye') { g.moveTo(cx - s, cy); g.quadraticCurveTo(cx, cy - s * 1.2, cx + s, cy); g.quadraticCurveTo(cx, cy + s * 1.2, cx - s, cy); }
      else { g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.8); g.lineTo(cx - s, cy + s * 0.8); }
      g.closePath();
    };
    g.save(); path(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill(); g.clip(); g.fillStyle = col; g.fillRect(cx - s, cy + s - 2 * s * v, s * 2, 2 * s * v); g.restore();
    g.save(); path(); g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.2, S(e, 1.6)); g.stroke(); g.restore();
    if (shp === 'eye') { g.save(); g.fillStyle = v > 0.5 ? dc : '#ffffff'; g.beginPath(); g.arc(cx, cy, s * 0.28, 0, Math.PI * 2); g.fill(); g.restore(); }
    return;
  }
  if (f === 'alertMark') {
    const blinkOff = e.v.list('st.alert').includes('blink') && Math.floor(simNow().t * 4) % 2 === 1;
    if (blinkOff) return;
    const ch = pickedStr(e, ownKey(e, 'alertKind'), 'alert') === 'suspicious' ? '?' : '!', o = { ...e.title, size: s * 2, weight: 900, color: e.warn, outline: { color: 'rgba(0,0,0,0.85)', width: Math.max(1.5, S(e, 2)) } };
    T(e, ch, cx - W(e, ch, o) / 2, cy - s * 1.4, s * 2.8, o);
    return;
  }
  // 精英环徽：橙色环 + 中心星
  const oc = mix(e.warn, dc, 0.45);
  g.save(); g.strokeStyle = oc; g.lineWidth = Math.max(2, S(e, 3)); g.beginPath(); g.arc(cx, cy, s, 0, Math.PI * 2); g.stroke(); g.fillStyle = withAlpha(oc, 0.25); g.fill(); g.restore();
  icon(e, '★', cx, cy, s * 1.1, oc);
}
/**
 * 目标切换行（el.threat = targetRow，M12b-19，xcom2#4）：一排敌人小头像（个数 el.threat.count，1–6，默认 4），每个下面小字命中率；当前目标（第一个）黄色高亮框。
 * 头像是敌方剪影（危险色环），命中率 = 包的 hitChance 递减
 */
function drawTargetRow(e: ElCtx, a: Rect, dc: string) {
  const n = ownCount(e, 4, 6), g = e.g, hit = Number.parseInt(DATA.hitChance, 10) || 72;
  for (let i = 0; i < n; i++) {
    const x = a.x + i * S(e, 56), cx = x + S(e, 24), cy = a.y + S(e, 24);
    if (i === 0) { g.save(); g.strokeStyle = e.warn; g.lineWidth = Math.max(2, S(e, 2.5)); g.strokeRect(x, a.y, S(e, 48), S(e, 48)); g.restore(); }
    avatar(e, cx, cy, S(e, 19), DATA.target.name, i === 0 ? e.warn : dc);
    const t = `${Math.max(5, hit - i * 13)}%`, o = { ...e.small, weight: 800, color: i === 0 ? e.warn : e.text };
    drawNumber(e, t, cx - numberWidth(e, t, o) / 2, a.y + S(e, 50), LH(e, e.small), o);
  }
}

/**
 * Boss 条的尺寸（M12a-11）：名字行高 nh；条长 = el.threat.barWidth × 屏宽（给了时不随 elx.scale 缩，scale 只管粗细与字号），
 * 没给时原来的「520 与屏宽 60% 取小、至少装下名字」；条粗 12 × elx.thickness；条后 / 条上下的数值标注另占 vw / vh
 */
function bossMetrics(e: ElCtx, withW = false) {
  const nh = Math.max(S(e, 20), LH(e, e.title, 1.2)), bw = Number(elOf(e, 'barWidth'));
  // 并排几条（el.threat.count，M12b-04，1–3）：没给时 1 条（原来的）；多条时每条默认约 20% 屏宽、条间 3%
  const n = ownCount(e, 1, 3), gap = n > 1 ? e.R.w * 0.03 : 0;
  // 宽只在 size() 里要（画的时候用排好的矩形，不再量名字）；多条时这是每一条的宽
  const nameW = () => (n > 1 ? Math.max(...bossList(n).map(([nm]) => W(e, nm, e.title))) : W(e, DATA.boss.name, e.title));
  // 给了条长时每条最多 (1 − 条间 × (n − 1)) / n 屏宽（B6 审查修复 ⑧：原来封顶 1 / n、再加条间，三条时总宽 1.06 屏宽）
  const w = !withW ? 0 : Number.isFinite(bw) && bw > 0 ? Math.min((1 - 0.03 * (n - 1)) / n, bw) * e.R.w : n > 1 ? Math.max(e.R.w * 0.2, nameW() + S(e, 20)) : Math.max(Math.min(S(e, 520), e.R.w * 0.6), nameW() + S(e, 20));
  const vs = valueSize(e, valueText(e, 1, DATA.hpMax, valueKind(e)));
  return { nh, w, n, gap, bh: S(e, 12) * thicknessOf(e), vw: vs.w, vh: vs.h, align: String(elOf(e, 'nameAlign') ?? 'center') };
}
/**
 * 并排的 Boss（M12b-04）：内容包写了 hud.bosses（[名字, 血量]，并排的那几个）时每条依次取它（B6 审查修复 ⑧：原来第一条总是 hud.boss、bosses[0] 画不出来）；
 * 没写时 Boss → 当前目标 → Boss（血量 0.4）。只有一条时照旧 hud.boss
 */
const bossList = (n: number): [string, number][] => {
  const own = n > 1 && DATA.bosses?.length ? DATA.bosses : [[DATA.boss.name, DATA.boss.hp], [DATA.target.name, DATA.target.hp], [DATA.boss.name, 0.4]] as [string, number][];
  return Array.from({ length: n }, (_, i) => own[i % own.length] as [string, number]);
};

/* 命中反馈：飘字 / 拟声字 / 连击 / 评级 */
/** 三个飘字相对挂点的位置与大小（[dx, dy, 字号倍数]，设计单位；第一个是暴击，画大、画金色）：draw 与 pointBox 共用 */
const FLOATS: [number, number, number][] = [[0, 0, 1.4], [38, 18, 1], [-34, 26, 0.9]];
registerElement({
  id: 'el.feedback', forms: ['floatNumbers', 'comicSFX', 'combo', 'rating', 'comboBadge', 'hitMarker', 'chainStack', 'dice'], anchor: 'mr', attach: 'target',
  // 多选画法拆开画时（M12a-14）：飘字 / 拟声字挂目标，评级 / 连击在右上（Hi-Fi Rush：拟声字挂击中点，PERFECT! 与连击在右上）；技能链在上中、骰子在下中（M12b-20）
  formDefaults: { floatNumbers: { attach: 'target' }, comicSFX: { attach: 'target' }, rating: { anchor: 'tr' }, combo: { anchor: 'tr' }, comboBadge: { anchor: 'tr' }, chainStack: { anchor: 'tc' }, dice: { anchor: 'bc' } },
  // 命中标记画在屏幕正中（准星处），显式给了 attachTo 才挂到点上（M12a-15）
  points: { floatNumbers: 'target', comicSFX: 'target', hitMarker: 'none' },
  // 主角级拟声字（sfxSize = hero，R4 · C3，hi-fi-rush#28）是整屏叠加：不挂目标、不推开不藏（原来约六成屏宽的星爆压到 HUD、推不开就整个不画），垫在其余元素下面
  overlay: (e) => e.forms[0] === 'comicSFX' && elStr(e, 'sfxSize', 'target') === 'hero',
  size: (e) => (e.forms[0] === 'combo' || e.forms[0] === 'rating' || e.forms[0] === 'comboBadge' ? { w: S(e, 160), h: S(e, 80) } : e.forms[0] === 'chainStack' ? chainSize(e) : e.forms[0] === 'dice' ? diceSize(e) : { w: S(e, 10), h: S(e, 10) }),
  // 飘字画出来的范围（目检修复）：三个数字在挂点上方 24–80、左右 −34 ~ +38 再加字宽；占位表登记与遮挡推开按它（原来按角色框，推开后数字仍压在 Boss 条上）
  pointBox: (e, p) => {
    // 拟声字（M12b-65 ⑧）：挂点右上的爆炸框（与 draw 同一个中心与半径，夹在画面里）
    // 中期审查修复 ㉕ ㉜：报实际画出的范围——多层星爆最外一层是 1.25 rx × 1.35 ry，再算上转角与描边（原来报单层的 2 rx × 2 ry，小了 25–35%）
    if (e.forms[0] === 'comicSFX') { const G = sfxGeom(e, p), x = sfxExtent(G, sfxCustom(e) && elStr(e, 'sfxBurst', 'mono') === 'layered'); return { x: G.cx - x.hx, y: G.cy - x.hy, w: x.hx * 2, h: x.hy * 2 }; }
    if (e.forms[0] !== 'floatNumbers') return null;
    const FL = floatsOf(e), xs = FL.map(([dx, , sc], i) => { const x = p.x + S(e, dx); return [x, x + numberWidth(e, DATA.hits[i] ?? '', { ...e.title, size: S(e, 18 * sc) })]; });
    const x0 = Math.min(...xs.map((q) => q[0])), x1 = Math.max(...xs.map((q) => q[1])), y0 = p.y - S(e, 80), y1 = p.y - S(e, 80 - Math.max(...FL.map((q) => q[1]))) + S(e, 30 * Math.max(1, FL[0][2] / 1.4));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g, p = attachPoint(e, attachFor(e));
    // 飘字 / 连击 / 评级的描边：显式给了 typ.outlineColor / typ.outlineWidth（M12a-33，Hi-Fi Rush 的深字白描边）就按它（宽随字号），否则原来的 2px 深色
    const out = e.t.outline ? { color: resolveColor(e.t.outline.color, e.pal), width: 2, widthEm: e.t.outline.widthEm } : { color: 'rgba(0,0,0,0.75)', width: 2 };
    if (f === 'floatNumbers') {
      // 三个飘字的位置 / 大小 / 颜色按序号（第一个是暴击，画大、画金色），字读 DATA.hits；条数 elx.count（M12b-20：1 = 一个超大数字，octopath#7），字效 typ.fillStyle / shadowOffset
      // 飘字是特效字（§8，轨道 E：记成 fx，可读性检查不把它当 HUD 正文算对比）
      inFx(() => floatsOf(e).forEach(([dx, dy, sc], i) => drawNumber(e, DATA.hits[i], p.x + S(e, dx), p.y - S(e, 80 - dy), S(e, 30 * Math.max(1, sc / 1.4)), evFx(e, { ...e.title, size: S(e, 18 * sc), color: i === 0 ? e.fill(0, 'highlight') : '#fff', outline: out }))));
      return;
    }
    if (f === 'chainStack') { drawChain(e, a, out); return; }
    if (f === 'dice') { drawDice(e, a); return; }
    // 拟声字的子参数（M12b-20，hi-fi-rush#4）：尺寸档 / 字内填充 / 星爆配色 / 逐字倾斜，任意一个选过就按新画法（没选时原来的黄星爆 + 红字）
    if (f === 'comicSFX' && sfxCustom(e)) { drawSfx(e, attachPoint(e, attachOf(e, 'target'))); return; }
    if (f === 'comicSFX') {
      // 拟声字（M12a-14）：挂点读 elx.attachTo（画法级 el.feedback.comicSFX.attachTo 优先，没给时目标），爆炸框夹紧在画面里（原来写死目标 + 右上偏移，会被顶出画面）
      const q = attachPoint(e, attachOf(e, 'target')), hw = S(e, 66), hh = S(e, 40), R = e.R;
      const cx = Math.max(R.x + hw, Math.min(R.x + R.w - hw, q.x + S(e, 30))), cy = Math.max(R.y + hh, Math.min(R.y + R.h - hh, q.y - S(e, 70)));
      g.save(); g.translate(cx, cy); g.rotate(-0.18);
      g.fillStyle = '#ffd34d'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2, rr = i % 2 ? S(e, 30) : S(e, 46); g.lineTo(Math.cos(t) * rr * 1.4, Math.sin(t) * rr * 0.8); }
      g.closePath(); g.fill(); g.stroke();
      T(e, DATA.sfx, -W(e, DATA.sfx, { ...e.title, size: S(e, 24) }) / 2, -S(e, 18), S(e, 36), { ...e.title, size: S(e, 24), color: '#e5484d', outline: { color: '#111', width: 2 } });
      g.restore();
      return;
    }
    if (f === 'hitMarker') {
      const c = p;
      g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(c.x + sx * S(e, 6), c.y + sy * S(e, 6)); g.lineTo(c.x + sx * S(e, 14), c.y + sy * S(e, 14)); g.stroke(); }
      return;
    }
    if (f === 'rating') {
      // 评级字按界面取（M12b-61，octopath#22：回合制战斗是弱点评价 WEAK · BREAK，不是节奏游戏的 S / PERFECT）
      const [rb, rs] = textFor('rating', e.r) ?? DATA.rating;
      T(e, rb, a.x, a.y, S(e, 70), evFx(e, { ...e.title, size: S(e, 56), color: e.fill(0, 'highlight'), italic: true, outline: out }));
      T(e, rs, a.x + S(e, 52), a.y + S(e, 30), S(e, 22), { ...e.title, size: S(e, 14), italic: true, color: '#fff', outline: out });
      return;
    }
    if (f === 'comboBadge') badge(e, a.x + S(e, 30), a.y + S(e, 34), S(e, 26), 'medal', '');
    drawNumber(e, DATA.combo[0], a.x + (f === 'comboBadge' ? S(e, 14) : 0), a.y, S(e, 64), evFx(e, { ...e.title, size: S(e, 44), color: f === 'comboBadge' ? '#fff' : e.fill(0, 'highlight'), italic: true, outline: out }));
    T(e, DATA.combo[1], a.x + S(e, f === 'comboBadge' ? 64 : 62), a.y + S(e, 24), S(e, 24), { ...e.title, size: S(e, 16), italic: true, outline: out });
  },
});

/* ---------------- 事件字效与新事件画法（M12b-20） ---------------- */

/** 事件字效（typ.fillStyle / fillColors / shadowOffset，t.textFx）合进大字的字样：字内填充 + 硬投影；没给时原样 */
function evFx(e: ElCtx, o: Partial<TextOpts>): Partial<TextOpts> {
  const fx = e.t.textFx;
  if (!fx) return o;
  return { ...o, ...(fx.fill ? { fill: fx.fill } : {}), ...(fx.shadow ? { shadow: { color: 'rgba(0,0,0,0.85)', x: fx.shadow, y: fx.shadow, blur: 0 } } : {}) };
}
/** 元素的字串参数（elOf，选过才算、否则 def；旧皮肤只认皮肤之后的层——B5 审查修复 ⑥，M12a §0） */
const elStr = (e: ElCtx, k: string, def: string) => (elChosen(e, k) ? String(elOf(e, k) ?? def) : def);
/** 飘字的几个（elx.count / el.feedback.count：1–3，没给 3 = 原来的）：只有一个时画成超大（字号 × 1.6，octopath#7 的单个大伤害数字） */
function floatsOf(e: ElCtx): [number, number, number][] {
  const n = Math.max(1, Math.min(3, elCount(e, 3)));
  return n === 1 ? [[0, -10, 1.4 * 1.6]] : FLOATS.slice(0, n);
}
/** 拟声字选了任何子参数（尺寸档 / 填充 / 星爆 / 逐字倾斜）：走新画法 */
const sfxCustom = (e: ElCtx) => ['sfxSize', 'sfxFill', 'sfxBurst', 'sfxLetterTilt'].some((k) => elChosen(e, k));
/**
 * 拟声字的几何（M12b-20，hi-fi-rush#4 / #5）：target = 挂点右上（原来的，夹紧在画面里）；hero = 画面中下，字宽约 60% 屏宽（字号按字量反算，上限 30% 屏高），星爆按字宽撑开。
 * 挂点读 elx.attachTo（hero 不看挂点）
 */
function sfxGeom(e: ElCtx, p: { x: number; y: number }) {
  const R = e.R, hero = elStr(e, 'sfxSize', 'target') === 'hero', s = DATA.sfx;
  if (!hero) { const hw = S(e, 66), hh = S(e, 40); return { cx: Math.max(R.x + hw, Math.min(R.x + R.w - hw, p.x + S(e, 30))), cy: Math.max(R.y + hh, Math.min(R.y + R.h - hh, p.y - S(e, 70))), rx: S(e, 46) * 1.4, ry: S(e, 46) * 0.8, size: S(e, 24), hero }; }
  const unit = W(e, s, { ...e.title, size: 100 }) / 100, size = Math.max(S(e, 24), Math.min(R.h * 0.3, (R.w * 0.6) / Math.max(0.5, unit))), tw = unit * size;
  const G = { cx: R.x + R.w / 2, cy: R.y + R.h * 0.6, rx: tw * 0.62 + S(e, 20), ry: size * 0.95, size, hero };
  // 星爆画出来的外接框夹在画面里（R4 审查修复 ⑫）：字宽占 0.6 屏宽时 rx = 0.62 × 字宽 + 20、layered 再 × 1.25，竖屏 / 方屏按宽定字号时星爆比画面还宽
  // （540 × 960 下 982 宽、两边都伸出去）——整组（字号、两个半径）按比例缩到放得下；横屏放得下时不变
  const x = sfxExtent(G, sfxCustom(e) && elStr(e, 'sfxBurst', 'mono') === 'layered'), k =Math.min(1, (R.w / 2) / x.hx, Math.min(G.cy - R.y, R.y + R.h - G.cy) / x.hy);
  return k >= 1 ? G : { ...G, rx: G.rx * k, ry: G.ry * k, size: G.size * k };
}
/** 星爆的几层（[rx 倍数, ry 倍数, 转角, 颜色角色, 线宽]）：drawSfx 与 pointBox 共用（mono 一层黄 = 原来的画法） */
type SfxGeom = ReturnType<typeof sfxGeom>;
const sfxLayers = (G: SfxGeom, layered: boolean): [number, number, number, 'accent2' | 'accent' | 'focus' | 'yellow', number][] => (layered
  ? [[1.25, 1.35, 0.12, 'accent2', Math.max(3, G.size * 0.06)], [1.08, 1.15, -0.25, 'accent', Math.max(3, G.size * 0.06)], [0.9, 0.95, -0.05, 'focus', Math.max(3, G.size * 0.05)]]
  : [[1, 1, -0.18, 'yellow', 3]]);
/** 星爆画出来的半宽 / 半高（中期审查修复 ㉕ ㉜）：每层按转过的椭圆外接框 + 半个线宽，取最大 */
function sfxExtent(G: SfxGeom, layered: boolean): { hx: number; hy: number } {
  let hx = 0, hy = 0;
  for (const [kx, ky, rot, , lw] of sfxLayers(G, layered)) {
    const a = G.rx * kx, b = G.ry * ky, c = Math.cos(rot), s = Math.sin(rot);
    hx = Math.max(hx, Math.hypot(a * c, b * s) + lw / 2); hy = Math.max(hy, Math.hypot(a * s, b * c) + lw / 2);
  }
  return { hx, hy };
}
/** 拟声字（子参数版）：星爆（mono 黄色一层 / layered 三层撞色：第二强调色 → 强调色 → 焦点色，层层错开转角）+ 字（填充 sfxFill、逐字倾斜 sfxLetterTilt、粗墨边） */
function drawSfx(e: ElCtx, p: { x: number; y: number }) {
  const g = e.g, G = sfxGeom(e, p), layered = elStr(e, 'sfxBurst', 'mono') === 'layered', fillK = elStr(e, 'sfxFill', 'solid'), tilt = Number(elStr(e, 'sfxLetterTilt', '0')) || 0;
  const burst = (rx: number, ry: number, rot: number, c: string, lw: number) => {
    g.save(); g.translate(G.cx, G.cy); g.rotate(rot); g.fillStyle = c; g.strokeStyle = '#111'; g.lineWidth = lw; g.beginPath();
    for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.65 : 1; g.lineTo(Math.cos(t) * rx * rr, Math.sin(t) * ry * rr); }
    g.closePath(); g.fill(); g.stroke(); g.restore();
  };
  const colorOf = (k: string) => (k === 'accent2' ? e.accent2 : k === 'accent' ? e.accent : k === 'focus' ? e.focus : '#ffd34d');
  for (const [kx, ky, rot, c, lw] of sfxLayers(G, layered)) burst(G.rx * kx, G.ry * ky, rot, colorOf(c), lw);
  const base = { ...e.title, size: G.size, weight: 900, color: '#e5484d', outline: { color: '#111', width: Math.max(2, G.size * 0.08) } };
  const fill: Partial<TextOpts> = fillK === 'gradient' ? { fill: { kind: 'gradient', colors: ['#e5484d', '#ffd34d'] } } : fillK === 'halftone' ? { fill: { kind: 'halftone', colors: ['#e5484d', '#ff9fb0'] } } : fillK === 'metal' ? { metal: true } : {};
  const o = evFx(e, { ...base, ...fill, ...(tilt ? { tilt } : {}) });
  const tw = W(e, DATA.sfx, o);
  e.tx.save(); e.tx.translate(G.cx, G.cy); e.tx.rotate(G.hero ? -0.08 : -0.18);
  T(e, DATA.sfx, -tw / 2, -G.size * 0.75, G.size * 1.5, o);
  e.tx.restore();
}
/** 技能链的样本（包的 hud.chain：[技能名, 分]…、总分、倍率），没写时 DRIFT / NEAR MISS / AIR */
const chainOf = () => DATA.chain ?? { items: [['DRIFT', 1200], ['NEAR MISS', 350], ['AIR', 800]] as [string, number][], total: 2350, mult: 'x3' };
const chainSize = (e: ElCtx) => ({ w: S(e, 230), h: S(e, 22) * chainOf().items.length + S(e, 48) });
/** 技能链（FH5）：技能名逐条往上叠（越早越淡）+ 一行 总分 × 倍率，干净直立字，按锚点对齐 */
function drawChain(e: ElCtx, a: Rect, out: TextOpts['outline']) {
  const C = chainOf(), rh = S(e, 22), io = { ...e.base, weight: 700, outline: out }, n = C.items.length;
  C.items.forEach(([nm, pts], i) => {
    const y = a.y + (n - 1 - i) * rh, s = `${nm}  +${fmtNumber(e, pts)}`, w = numberWidth(e, s, io), x = e.align === 'right' ? a.x + a.w - w : e.align === 'center' ? a.x + (a.w - w) / 2 : a.x;
    // 越早越淡：乘在外层透明度上（B5 审查修复 ⑯：原来直接赋值，按需显示 / 淡入时照样满不透明）
    e.tx.save(); e.tx.globalAlpha *= 0.45 + 0.55 * ((i + 1) / n); drawNumber(e, s, x, y, rh, io); e.tx.restore();
  });
  const to = evFx(e, { ...e.title, size: S(e, 30), weight: 900, outline: out }), mo = { ...to, size: S(e, 22), color: e.accent }, t = fmtNumber(e, C.total);
  const tw = numberWidth(e, t, to) + S(e, 10) + numberWidth(e, C.mult, mo), x0 = e.align === 'right' ? a.x + a.w - tw : e.align === 'center' ? a.x + (a.w - tw) / 2 : a.x, y0 = a.y + n * rh + S(e, 4);
  const w0 = drawNumber(e, t, x0, y0, S(e, 44), to);
  drawNumber(e, C.mult, x0 + w0 + S(e, 10), y0 + S(e, 6), S(e, 40), mo);
}
/** 骰子的点数（包的 hud.dice），没写时 4、6 */
const diceOf = () => DATA.dice ?? [4, 6];
const diceSize = (e: ElCtx) => { const n = diceOf().length; return { w: n * S(e, 52) + (n - 1) * S(e, 12), h: S(e, 56) }; };
/** 检定骰子（Disco 画面中下的两枚白骰）：白色圆角方块 + 黑点（按点数的标准排布），略微错开的转角 */
function drawDice(e: ElCtx, a: Rect) {
  const g = e.g, s = S(e, 48), PIPS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  diceOf().forEach((v, i) => {
    const cx = a.x + s / 2 + S(e, 2) + i * (s + S(e, 12)), cy = a.y + a.h / 2, rot = (i % 2 ? 1 : -1) * 0.12;
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(-s / 2 + S(e, 3), -s / 2 + S(e, 4), s, s, s * 0.18); g.fill();
    g.fillStyle = '#f4f1ea'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(1, S(e, 1.2)); g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.18); g.fill(); g.stroke();
    g.fillStyle = '#111'; for (const [px, py] of PIPS[Math.max(1, Math.min(6, Math.round(v)))]) { g.beginPath(); g.arc(px * s * 0.26, py * s * 0.26, s * 0.08, 0, Math.PI * 2); g.fill(); }
    g.restore();
  });
}

/**
 * 横带 / 横幅底的渐隐（vis.fade / vis.fadeLength，M12b-41）：目标链上选过（@el.notify → 全局；旧皮肤只认皮肤之后的层）时按方向用带透明度的渐变，否则原来的实色
 */
function bandFade(e: ElCtx, a: { x: number; y: number; w: number; h: number }, color: string): string | CanvasGradient {
  const k = chosenKey(e, 'vis.fade'), dir = k ? e.r.str(k, 'none') : 'none';
  if (dir === 'none' || dir === 'auto') return color;
  const lk = chosenKey(e, 'vis.fadeLength');
  return fadePaint(e.g, a, dir, lk ? e.r.num(lk, 0.25) : 0.25, color);
}

/* 通知 / 大字提示 */
registerElement({
  id: 'el.notify', forms: ['feed', 'banner', 'band', 'toast', 'pickupText', 'emblem', 'cutIn', 'modalCard', 'bareText', 'socialFeed', 'alertIcons', 'label', 'finisherCard'], anchor: 'ml',
  points: { pickupText: 'player' },
  // 多选画法拆开画时（M12b-20）：气泡流在上中（Cities 的 Chirper）、警报图标列在右下（Factorio）、收尾大卡在正中
  formDefaults: { socialFeed: { anchor: 'tc' }, alertIcons: { anchor: 'br' }, finisherCard: { anchor: 'center' }, bareText: { anchor: 'tc' } },
  size: (e) => {
    if (NOTIFY_NEW.has(e.forms[0])) return notifyNewSize(e, e.forms[0]);
    switch (e.forms[0]) {
      // 贴满屏宽（elx.span = full，M12b-30，civ6#39 的上下字卡带）：宽 = 画面宽，没选时原来的封顶宽
      case 'banner': { const [bt, src] = bannerText(e), h = Math.max(S(e, 54), LH(e, { size: S(e, 20) }, 2)) + (src ? LH(e, e.small) : 0); if (spanFull(e)) return { w: e.R.w, h }; return { w: Math.max(Math.min(S(e, 460), e.R.w * 0.6), W(e, bt, { ...e.title, size: S(e, 20) }) + S(e, 40), src ? W(e, src, e.small) + S(e, 40) : 0), h }; }
      case 'band': return { w: e.R.w, h: S(e, 64) };
      case 'toast': return { w: fitW(e, S(e, 260), [[toastText(e), { ...e.base, weight: 700 }]], S(e, 52)), h: Math.max(S(e, 44), LH(e, e.base, 1.9)) };
      case 'emblem': return { w: S(e, 200), h: S(e, 120) };
      case 'cutIn': return { w: Math.min(S(e, 520), e.R.w * 0.7), h: S(e, 110) };
      case 'modalCard': return { w: fitW(e, S(e, 300), [[DATA.levelUp[1], e.small]], S(e, 32)), h: Math.max(S(e, 150), S(e, 100) + tap(e)) };
      default: { const fd = feedOf(e); return { w: fitW(e, S(e, 220), fd.map((l) => [l, e.small] as [string, Partial<TextOpts>]), S(e, 10) + feedPad(e)), h: fd.length * Math.max(S(e, 28), LH(e, e.small) + S(e, 8)) }; }
    }
  },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    if (NOTIFY_NEW.has(f)) { drawNotifyNew(e, a, f); return; }
    switch (f) {
      case 'banner': {
        // 横幅的底（M12a-32）：对白框部件（@dialog / @el.notify）写了底与边时画部件面板（Persona 技能名横幅的实心黑底 + 描边），否则原来的 55% 黑 + 上下两道强调色细线；
        // 字色 col.text@el.notify / @dialog（显式给了），否则白（面板时面板字色）
        const ed = e.part('dialog'), boxP = dialogScoped(ed);
        // 品质下限（审查修复 E 视觉 ⑤ / B2 ⑯）：没按目标写底时画皮肤的小面板（表面色、描边、圆角、材质、字色；不透明度下限在主题里）——原来永远是 55% 黑 + 两道强调色线，
        // 羊皮纸 / 漫画 / 温馨皮肤上也是一块黑条，新粗野主义上还和字后面的小牌叠成两层。显式写了渐隐（vis.fade@el.notify）的照原来的黑带
        const skinBox = !boxP && QUALITY.on && isHudCanvas(g) && !scopedSet(e, 'vis.fade');
        if (boxP || skinBox) panel(ed, a, true);
        else { g.fillStyle = bandFade(e, a, withAlpha('#000', 0.55)); g.fillRect(a.x, a.y, a.w, a.h); logBoxRect(g, a, 'rgba(0,0,0,0.55)'); g.fillStyle = e.accent; g.fillRect(a.x, a.y, a.w, S(e, 2)); g.fillRect(a.x, a.y + a.h - S(e, 2), a.w, S(e, 2)); }
        const stc = scopedStr(ed, 'col.text'), tc = notifyTone(e) ?? (stc ? resolveColor(stc || '#fff', ed.pal) : boxP || skinBox ? ed.text : '#fff');
        // 横幅的字（M12b-61，civ6#41）：按语气取的大字 + 一行出处（奇观落成的引语），没写时内容包的发现新区域
        const [s, src] = bannerText(e), sh = src ? LH(e, e.small) : 0;
        T(e, s, a.x + a.w / 2 - W(e, s, { ...e.title, size: S(e, 20) }) / 2, a.y, a.h - sh, { ...e.title, size: S(e, 20), color: tc, ...(e.title.glowColor && tc !== '#fff' ? { glowColor: tc } : {}) });
        if (src) { const so = { ...e.small, color: withAlpha(tc, 0.75), italic: true }; T(e, src, a.x + a.w / 2 - W(e, src, so) / 2, a.y + a.h - sh - S(e, 6), sh, so); }
        return;
      }
      case 'band': {
        // 章节横带（M12a-32，elden-ring#42）：底色读 col.surface@el.notify（显式给了；默认仍是强调色 85%），字色读 col.text@el.notify（没给时强调色底 onAccent、换了底色按底色反差），
        // 标题发光（typ.titleFx = titleGlow）的光色跟字色走（原来取强调色：强调色压成近黑后光就看不见了）
        const surf = scopedSet(e, 'col.surface') ? resolveColor(e.th.surface, e.pal) : null, bg = surf ?? e.accent;
        // 羽化（vis.fade@el.notify = vertical，M12b-41，elden-ring#43 的 YOU DIED 横带上下羽化；选过才换）：横带底按渐隐方向用带透明度的渐变填
        g.fillStyle = bandFade(e, a, withAlpha(bg, 0.85)); g.fillRect(a.x, a.y, a.w, a.h);
        const stS = scopedStr(e, 'col.text'), tcS = notifyTone(e) ?? (stS !== null ? resolveColor(stS || '#fff', e.pal) : null);
        const to = tcS ? { ...e.title, color: tcS, outline: undefined } : surf ? { ...e.title, color: onColorOf(bg, resolveColor(e.th.surface, e.pal)) } : onAccent(e, e.title);
        const fx = (tcS || surf) && to.glowColor ? { glowColor: to.color } : {};
        // 横带的大字按语气取（M12b-61，elden-ring#44：punitive = 死亡提示、triumphant = 击败强敌），没写时章节横幅（原来的）
        const s = (textFor('band', e.r) ?? [pack().game.chapter.band])[0]; T(e, s, a.x + a.w / 2 - W(e, s, { ...e.title, size: S(e, 26) }) / 2, a.y, a.h, { ...to, ...fx, size: S(e, 26), spacing: 0.3 });
        return;
      }
      case 'toast': {
        // 结果着色（M12a-32，disco-elysium#39）：col.coding 含 resultTone 时（旧皮肤要皮肤之后的层给的）胶囊按结果取色——成功好色、失败坏色（包的 hud.toastResult，默认成功）
        const tone = e.r.list('col.coding').includes('resultTone') && (!e.th.legacy || postSkinKey(e, 'col.coding'));
        if (!tone) {
          panel(e, a, true, { radiusPct: 30 });
          icon(e, '✦', a.x + S(e, 20), a.y + a.h / 2, S(e, 16));
          T(e, toastText(e), a.x + S(e, 36), a.y, a.h, { ...e.base, weight: 700 });
          return;
        }
        const ok = DATA.toastResult !== 'fail', rc = ok ? e.good : e.bad, on = onColorOf(rc, resolveColor(e.th.surface, e.pal));
        panel(e, a, true, { radiusPct: 30, bg: { solid: withAlpha(rc, 0.92) }, border: { width: Math.max(1, S(e, 1.5)), color: rc } });
        icon(e, ok ? '✓' : '✕', a.x + S(e, 20), a.y + a.h / 2, S(e, 16), on);
        T(e, toastText(e), a.x + S(e, 36), a.y, a.h, { ...e.base, weight: 700, color: on, outline: undefined, shadow: undefined });
        return;
      }
      case 'pickupText': {
        const p = attachPoint(e, attachFor(e));
        T(e, pack().events.pickup, p.x + S(e, 20), p.y - S(e, 60), S(e, 22), { ...e.title, color: e.good, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } });
        return;
      }
      case 'emblem':
        badge(e, a.x + a.w / 2, a.y + S(e, 44), S(e, 34), 'crest', '');
        T(e, DATA.emblem, a.x + a.w / 2 - W(e, DATA.emblem, e.title) / 2, a.y + S(e, 88), S(e, 24), e.title);
        return;
      case 'cutIn': {
        g.save(); g.beginPath(); g.moveTo(a.x + S(e, 40), a.y); g.lineTo(a.x + a.w, a.y); g.lineTo(a.x + a.w - S(e, 40), a.y + a.h); g.lineTo(a.x, a.y + a.h); g.closePath();
        g.fillStyle = withAlpha('#111', 0.85); g.fill(); g.clip();
        avatar(e, a.x + S(e, 90), a.y + a.h * 0.6, a.h * 0.55, DATA.hero.initial, e.accent);
        g.restore();
        T(e, DATA.cutIn, a.x + S(e, 170), a.y, a.h, { ...e.title, size: S(e, 30), italic: true, color: '#fff' });
        return;
      }
      case 'modalCard':
        panel(e, a);
        T(e, DATA.levelUp[0], a.x + S(e, 16), a.y + S(e, 10), S(e, 30), { ...e.title, size: S(e, 22) });
        T(e, DATA.levelUp[1], a.x + S(e, 16), a.y + S(e, 50), S(e, 22), e.small);
        { const bh = Math.max(S(e, 28), tap(e)), bw = Math.max(S(e, 80), tap(e), W(e, '确定', buttonText(e, bh)) + S(e, 24)); button(e, { x: a.x + a.w - bw - S(e, 16), y: a.y + a.h - bh - S(e, 12), w: bw, h: bh }, '确定'); }
        return;
      default: {
        // 信息流（M12a-32，hi-fi-rush#12）：行底的不透明度读 vis.opacity@el.notify（显式给了；0 = 无底，字改成描边字），默认原来的 45% 黑胶囊；
        // 字色 col.text@el.notify（显式给了，否则白），首行高亮色（col.accent@el.notify 时作用域强调色）
        const sop = chosenKey(e, 'vis.opacity'), op = sop?.includes('@') ? Math.max(0, Math.min(1, e.r.num(sop, 0.45))) : 0.45;
        const stc = scopedStr(e, 'col.text');
        // 品质下限（审查修复 E 视觉 ⑤）：没按目标写透明度 / 字色时每行画皮肤的小面板（表面色、描边、圆角、字色），首行高亮色对面板底至少 4.5 : 1；
        // 原来永远是 45% 黑胶囊 + 白字（浅色皮肤上一串黑胶囊）
        const skinRows = QUALITY.on && isHudCanvas(g) && !sop?.includes('@') && stc === null;
        const face = resolveColor(e.th.surface, e.pal, '#222');
        const tc = stc !== null ? resolveColor(stc || '#fff', e.pal) : skinRows ? e.text : '#fff';
        const pad = skinRows ? feedPad(e) : S(e, 10);
        feedOf(e).forEach((l, i) => {
          const rh = Math.max(S(e, 28), LH(e, e.small) + S(e, 8)), w = W(e, l, e.small) + S(e, 10) + pad, y = a.y + i * rh;
          const c = i ? tc : skinRows ? ensureContrast(resolveColor(e.fill(0, 'highlight'), e.pal), face, 4.5) : e.fill(0, 'highlight');
          if (skinRows) { panel(e, { x: a.x, y, w, h: rh - S(e, 4) }, true); T(e, l, a.x + pad, y, rh - S(e, 4), { ...e.small, color: c }); return; }
          // 黑胶囊不带面板的材质内芯（§8，轨道 E：像素木框这类皮肤的纸 / 木内芯按 45% 叠上来，白字压在浅纸纹上只有 1.2 : 1）
          if (op > 0.01) panel(e, { x: a.x, y, w, h: rh - S(e, 4) }, true, { bg: { solid: withAlpha('#000', op) }, border: undefined, sides: undefined, ...(QUALITY.on ? { material: undefined, frame: undefined } : {}) });
          const halo = luminance(resolveColor(c, e.pal)) < 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
          T(e, l, a.x + S(e, 10), y, rh - S(e, 4), { ...e.small, color: c, ...(op <= 0.01 ? { outline: { color: halo, width: 2 } } : {}) });
        });
      }
    }
  },
});

/**
 * 横幅的字（M12b-61）：按语气写了 band 变体（cnt.tone = narrative 的落成宣告 + 引语出处、punitive / triumphant……）时用它 [大字, 出处]，否则内容包的发现新区域（原来的）
 */
function bannerText(e: ElCtx): [string, string?] {
  const pk = textPick('band', e.r);
  return pk && !pk.legacy && pk.score > 0 ? pk.value : [DATA.discover];
}
/** 结果提示条的字（M12b-61，disco-elysium#40）：cnt.stage = result 时写检定结果（texts.check：成功 / 失败按 hud.toastResult），否则成就文案（原来的） */
function toastText(e: ElCtx): string {
  const c = e.r.str('cnt.stage', '') === 'result' ? textFor('check', e.r) : undefined;
  return c ? c[DATA.toastResult === 'fail' ? 1 : 0] : DATA.achievement;
}
/**
 * 勾选框里的勾（整合修复：D 的场景门槛「RPG·庭院」任务清单的 ✓ 浅绿压在浅色衬底上 1.4 : 1）：好色，但跟这一行字的明暗走——字是深色（底按浅的算）时把勾压深到对浅底 3 : 1，
 * 字是浅色时提亮到对深底 3 : 1；勾和同一行的字因此落在同一块衬底上都看得清。品质下限关掉、或不在 HUD 主画布上时照原来的好色
 */
function checkInk(e: ElCtx, lineColor: string): string {
  if (!QUALITY.on || !isHudCanvas(e.g)) return e.good;
  const bg = luminance(resolveColor(lineColor, e.pal)) < 0.4 ? '#f4f2ec' : '#14161b';
  return ensureContrast(resolveColor(e.good, e.pal), bg, 3);
}
/**
 * 信息流每行字左边留多少（整合修复 U#14）：皮肤面板的边框 / 侧边条（构成主义左边 14 单位的红条）占掉的宽 + 8，至少原来的 10——
 * 原来字固定在左边 10 单位，每行首字压在红条上。只在画皮肤小面板时（品质下限开着、HUD 主画布）算；量尺寸时按同一个口径，行宽跟着加
 */
function feedPad(e: ElCtx): number {
  if (!QUALITY.on || !isHudCanvas(e.g)) return S(e, 10);
  return Math.max(S(e, 10), borderWidths((e.scope.length > 1 ? e : e.part('panel')).t.panel).l + S(e, 8));
}
/** 信息流的行（M12b-61，hi-fi-rush#13）：按界面取（textFor('feed')）；显式给了 cnt.density ≤ 1 时只留第一行 */
function feedOf(e: ElCtx): string[] {
  return feedLines(e.r, pack(), elChosen(e, 'maxItems') ? Number(elOf(e, 'maxItems')) : undefined);
}
/** 条数上限（el.notify.maxItems，M12b-20，doc16 G-notify-cap）：选过才截（信息流、气泡流、警报列；旧皮肤只认皮肤之后的层） */
function maxItems<T>(e: ElCtx, list: T[]): T[] {
  if (!elChosen(e, 'maxItems')) return list;
  const n = Math.round(Number(elOf(e, 'maxItems')));
  return Number.isFinite(n) && n >= 1 ? list.slice(0, n) : list;
}

/* ---------------- 通知的新画法（M12b-20） ---------------- */

const NOTIFY_NEW = new Set(['bareText', 'socialFeed', 'alertIcons', 'label', 'finisherCard']);
/** 无底大字的字（按语气取的横带字，没写时发现新区域） */
const bareTextOf = (e: ElCtx) => (textFor('band', e.r) ?? [DATA.discover])[0];
const bareO = (e: ElCtx): Partial<TextOpts> => evFx(e, { ...e.title, size: S(e, 34), weight: 900, color: '#fff', shadow: { color: 'rgba(0,0,0,0.85)', x: 3, y: 3, blur: 0 } });
/** 气泡流的行（[说话人, 一句话]，取包的聊天样本）；条数上限 el.notify.maxItems */
const socialOf = (e: ElCtx) => maxItems(e, DATA.chat.slice());
/** 警报图标列（[符号, 角色, 层数?]，取包的状态图标样本） */
const alertsOf = (e: ElCtx) => maxItems(e, (DATA.statusIcons ?? STATUS_ROW).slice());
/** 名签的字（包的 hud.skillName，没写时切入特写的台词） */
const labelOf = () => DATA.skillName ?? DATA.cutIn;
/** 收尾大卡的口号（按语气取的横带字，没写时切入台词） */
const sloganOf = (e: ElCtx) => (textFor('band', e.r) ?? [DATA.cutIn])[0];
/** 吉祥物入口（cnt.companion = mascot 显式给了时气泡流上方一颗圆钮；旧皮肤只认皮肤之后的层，与 screen.ts 的陪衬立绘同口径） */
const mascotOn = (e: ElCtx) => { const l = e.r.src('cnt.companion')?.layer; return !!l && l !== 'default' && l !== 'fallback' && e.r.str('cnt.companion', '') === 'mascot' && (!e.th.legacy || postSkinKey(e, 'cnt.companion')); };
/** 换字色的上下文（浅色底上的小件：头像底 / 剪影 / 首字都读 e.text）：部件也跟着换 */
function inkOn(e: ElCtx, ink: string): ElCtx {
  return Object.assign(Object.create(e) as ElCtx, { text: ink, part: (...names: string[]) => inkOn(e.part(...names), ink) });
}
function notifyNewSize(e: ElCtx, f: string): { w: number; h: number } {
  switch (f) {
    case 'bareText': return { w: W(e, bareTextOf(e), bareO(e)) + S(e, 16), h: S(e, 60) };
    case 'socialFeed': return { w: S(e, 300), h: socialOf(e).length * S(e, 50) + (mascotOn(e) ? S(e, 40) : 0) };
    case 'alertIcons': return { w: S(e, 32), h: alertsOf(e).length * S(e, 36) };
    case 'label': return { w: W(e, labelOf(), { ...e.base, weight: 700 }) + S(e, 22), h: Math.max(S(e, 28), LH(e, e.base, 1.6)) };
    default: return { w: e.R.w * 0.92, h: e.R.h * 0.86 };
  }
}
function drawNotifyNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  if (f === 'bareText') {
    // 无底大字（Balatro 的 Boss 规则）：超大白字 + 硬投影（typ.shadowOffset 给了用它），字号随元素缩放
    const s = bareTextOf(e), o = bareO(e);
    T(e, s, e.align === 'right' ? a.x + a.w - W(e, s, o) : e.align === 'center' ? a.x + (a.w - W(e, s, o)) / 2 : a.x, a.y, a.h, o);
    return;
  }
  if (f === 'socialFeed') {
    // 社交气泡流（Cities 的 Chirper）：浅色气泡、圆头像 + 名字 + 一句话；cnt.companion = mascot 时上方一颗吉祥物圆钮
    let y = a.y;
    if (mascotOn(e)) { const r = S(e, 16), cx = a.x + a.w / 2; g.fillStyle = '#4aa8ff'; g.beginPath(); g.arc(cx, y + r + S(e, 2), r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, S(e, 2)); g.stroke(); icon(e, '♪', cx, y + r + S(e, 2), r * 1.1, '#fff'); y += S(e, 40); }
    for (const [who, line] of socialOf(e)) {
      const q = { x: a.x, y, w: a.w, h: S(e, 44) };
      drawBox(g, q, { bg: { solid: 'rgba(255,255,255,0.94)' }, radius: S(e, 10), shadows: [{ color: 'rgba(0,0,0,0.25)', x: 0, y: S(e, 2), blur: S(e, 4) }] }, e.pal);
      // 头像按气泡的深色字画（B5 审查修复 ⑮：原来用主题字色，深色皮肤上近白的底 / 剪影 / 首字压在白气泡上看不见）
      avatar(inkOn(e, '#1f2328'), q.x + S(e, 22), q.y + q.h / 2, S(e, 14), who);
      const no = { ...e.small, weight: 800, color: '#1f2328' }, lo = { ...e.small, color: '#3a3f47' };
      T(e, who, q.x + S(e, 44), q.y + S(e, 4), S(e, 18), no);
      T(e, line, q.x + S(e, 44), q.y + S(e, 21), S(e, 18), lo);
      y += S(e, 50);
    }
    return;
  }
  if (f === 'alertIcons') {
    // 警报图标列（Factorio 右下）：竖排小方块，边与符号按角色色；st.alert 含 blink 时危险类按模拟时钟闪（相位 0 亮）
    const blink = e.v.list('st.alert').includes('blink') && Math.floor(simNow().t * 4) % 2 === 1;
    alertsOf(e).forEach(([ch, role, n], i) => {
      const s = S(e, 30), q = { x: a.x + (a.w - s) / 2, y: a.y + i * S(e, 36), w: s, h: s }, c = role === 'danger' ? e.fill(0, 'danger') : role === 'warn' ? e.warn : role === 'buff' ? e.good : e.accent;
      if (blink && role === 'danger') return;
      drawBox(g, q, { bg: { solid: withAlpha('#000', 0.6) }, border: { width: Math.max(1, S(e, 1.5)), color: c }, radius: S(e, 4) }, e.pal);
      icon(e, ch, q.x + s / 2, q.y + s / 2, s * 0.6, c);
      if (n) { const ns = String(n), no = { ...e.small, size: s * 0.38, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1 } }; drawNumber(e, ns, q.x + s - numberWidth(e, ns, no) - S(e, 2), q.y + s * 0.55, s * 0.45, no); }
    });
    return;
  }
  if (f === 'label') {
    // 贴字宽的名签（Octopath 的技能名提示）：深色小框 + 细亮边，只写字
    drawBox(g, a, { bg: { solid: withAlpha('#000', 0.75) }, border: { width: Math.max(1, S(e, 1)), color: withAlpha('#fff', 0.85) } }, e.pal);
    T(e, labelOf(), a.x + S(e, 11), a.y, a.h, { ...e.base, weight: 700, color: '#fff' });
    return;
  }
  // finisherCard：收尾大卡（Persona 总攻击）——整屏插画槽（位图是 M12c-A2）+ 网点 + 按母题的主题边框 + 斜飘带口号（cmp.plate@title，没选时 ribbon；角度 vis.tilt，没给时 −25°）
  g.save(); g.fillStyle = withAlpha(e.accent, 0.92); g.fillRect(a.x, a.y, a.w, a.h); g.restore();
  const inner = { x: a.x + S(e, 18), y: a.y + S(e, 18), w: a.w - S(e, 36), h: a.h - S(e, 36) };
  artSlot(e, inner, 'portrait');
  drawPattern(g, inner, { kind: 'dots', opacity: 0.22, color: '#000000' }, e.pal);
  // 主题边框：一圈白粗边 + 内细线，四角放当前母题的符号
  g.save(); g.strokeStyle = '#fff'; g.lineWidth = S(e, 6); g.strokeRect(inner.x, inner.y, inner.w, inner.h); g.strokeStyle = '#111'; g.lineWidth = S(e, 2); g.strokeRect(inner.x + S(e, 8), inner.y + S(e, 8), inner.w - S(e, 16), inner.h - S(e, 16));
  const motif = e.t.panel.ornament?.motif ?? e.r.str('vis.motif', 'none');
  if (motif && motif !== 'none' && motif !== 'auto') for (const [x, y] of [[inner.x, inner.y], [inner.x + inner.w, inner.y], [inner.x, inner.y + inner.h], [inner.x + inner.w, inner.y + inner.h]]) { g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = S(e, 2); glyph(g, motif, S(e, 34), 2); g.restore(); }
  g.restore();
  const slogan = sloganOf(e), kind = pickedStr(e.part('title'), 'cmp.plate', 'ribbon'), to = evFx(e, { ...e.title, size: S(e, 30), weight: 900 });
  // 飘带角度（R4 · C3）：飘带自己的 −25°（往右上斜）；按目标写了 vis.tilt@el.notify 时取它的大小、方向不变。原来直接拿 vis.tilt（取值 0–10，正数）当角度，
  // 整屏写了倾斜的屏（persona5 allout 的 vis.tilt = 10）飘带反过来往右下斜
  const tsc = Math.abs(Number(scopedStr(e, 'vis.tilt') ?? 0)) || 0;
  const rw = Math.min(a.w * 0.8, W(e, slogan, to) + S(e, 120)), rh = S(e, 56), cx = a.x + a.w * 0.5, cy = a.y + a.h * 0.78, tilt = -(tsc || 25) * (Math.PI / 180);
  // 文字画布与主画布是同一个时只变换一次（中期审查修复 ㉖：原来同一个上下文平移 / 旋转两遍，飘带落到 (959, 770) 一带的屏外）
  const cs = e.tx === g ? [g] : [g, e.tx];
  for (const c of cs) { c.save(); c.translate(cx, cy); c.rotate(tilt); }
  try { plate(e, { x: -rw / 2, y: -rh / 2, w: rw, h: rh }, slogan, kind, to, 'title'); } finally { for (const c of cs) c.restore(); }
}

/**
 * 横带 / 横幅的事件结果色（M12b-33，elden-ring#45）：col.coding 含 resultTone（旧皮肤要皮肤之后的层给的）时按内容包的 notifyTone 取字色——good 好色、bad 坏色、neutral 高亮色；
 * 没开时 null（原来的字色：作用域 col.text 或白）
 */
function notifyTone(e: ElCtx): string | null {
  if (!e.r.list('col.coding').includes('resultTone') || (e.th.legacy && !postSkinKey(e, 'col.coding'))) return null;
  const t = DATA.notifyTone ?? (DATA.toastResult === 'fail' ? 'bad' : 'neutral');
  return t === 'good' ? e.good : t === 'bad' ? e.bad : e.fill(0, 'highlight');
}

/* 计时 / 分数 / 回合 */
const timerNumO = (e: ElCtx): TextOpts => ({ ...e.big, size: S(e, 32), outline: { color: 'rgba(0,0,0,0.55)', width: 1.5 }, ...displayFor(e, 'numerals') });
registerElement({
  id: 'el.timer', forms: ['number', 'badge', 'turnBanner', 'scorePill', 'smallText', 'gauge', 'turnDate', 'ringCounter', 'countdownStrip', 'scoreLabel', 'raceStack', 'timecode'], anchor: 'tc',
  formDefaults: { turnBanner: { anchor: 'tc' } },
  size: (e) => {
    const f = e.forms[0];
    if (TIMER_NEW.has(f)) return timerNewSize(e, f);
    // 波次条的数值标注（M12a-13）：条后 / 条下的字算进元素框
    if (f === 'gauge') { const v = valueSize(e, valueText(e, 1, 10, valueKind(e))); return { w: S(e, 200) + v.w, h: S(e, 30) + v.h }; }
    // 大号计时数字的盒宽按实际字宽算（M12a-18：原来固定 150，锚在左右时数字离角一截、窄容器里与同排元素相撞，hi-fi-rush#26）
    if (f === 'number') return { w: numberWidth(e, DATA.timer, timerNumO(e)) + S(e, 16), h: S(e, 46) };
    return f === 'turnBanner' ? { w: S(e, 260), h: S(e, 46) } : f === 'smallText' ? { w: S(e, 120), h: S(e, 22) } : { w: S(e, 150), h: S(e, 46) };
  },
  draw: (e, a) => {
    const f = e.forms[0];
    if (TIMER_NEW.has(f)) { drawTimerNew(e, a, f); return; }
    if (f === 'turnBanner') { e.g.fillStyle = e.accent; e.g.fillRect(a.x, a.y, a.w, a.h); const s = fill(DATA.turnText, { n: DATA.turn }); T(e, s, a.x + a.w / 2 - W(e, s, e.title) / 2, a.y, a.h, onAccent(e, e.title)); return; }
    if (f === 'gauge') {
      const vk = valueKind(e), vt = valueText(e, 0.7, 10, vk), vs = valueSize(e, valueText(e, 1, 10, vk));
      T(e, fill(DATA.waveText, { wave: DATA.wave }), a.x, a.y, S(e, 14), e.small);
      const br = { x: a.x, y: a.y + S(e, 18) + (e.valueLabelPos === 'above' ? vs.h : 0), w: a.w - vs.w, h: S(e, 8) };
      gauge(e, br, 0.7, 'segmented', e.accent);
      drawValue(e, br, vt, e.valueLabelPos, vk);
      return;
    }
    // 按内容排的画法按锚点对齐（M12a-18：原来 smallText / badge 总从左缘起、number 总居中）
    if (f === 'smallText') { const s0 = `⏱ ${DATA.timer}`; drawNumber(e, s0, e.align === 'left' ? a.x : alignX(e, a, numberWidth(e, s0, e.small)), a.y, a.h, e.small); return; }
    if (f === 'badge') {
      const bo = { ...e.big, size: S(e, 26) }, x0 = e.align === 'left' ? a.x : alignX(e, a, S(e, 48) + numberWidth(e, DATA.timer, bo));
      // 回合章（M12b-68，xcom2#32 / #37）：按目标写了外形（vis.silhouette@el.timer）或描边（vis.stroke@el.timer = double……）时画成这个外形的盒子 + 回合数（XCOM 的双同心细环）；
      // 否则原来的奖章，通用 cmp.badge 只认 none / roundel（base 的 cmp.badge = chevron 不再把回合章画成军衔章）
      if (!timerRing(e, x0 + S(e, 22), a.y + a.h / 2, S(e, 20), String(DATA.turn))) badge(e, x0 + S(e, 22), a.y + a.h / 2, S(e, 18), 'medal', String(DATA.turn), { only: ['none', 'roundel'] });
      drawNumber(e, DATA.timer, x0 + S(e, 48), a.y, a.h, bo);
      return;
    }
    if (f === 'scorePill') { panel(e, a, true, { radiusPct: 50 }); const s = fmtNumber(e, DATA.score); drawNumber(e, s, a.x + a.w / 2 - numberWidth(e, s, e.title) / 2, a.y, a.h, e.title); return; }
    const o = timerNumO(e), tw = numberWidth(e, DATA.timer, o);
    drawNumber(e, DATA.timer, e.align === 'center' ? a.x + a.w / 2 - tw / 2 : alignX(e, a, tw), a.y, a.h, o);
  },
});

/* ---------------- 计时与比赛信息栈的新画法（M12b-06）+ 时间码（镜头屏显） ---------------- */

const TIMER_NEW = new Set(['turnDate', 'ringCounter', 'countdownStrip', 'scoreLabel', 'raceStack', 'timecode']);
/** 时钟 hh:mm（与 el.clock 同一个时刻） */
const hhmm = () => { const hh = Math.floor(DATA.hour), mm = Math.round((DATA.hour - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
/** turnDate 的三段：回合 / 纪年 / 时钟 */
const turnDateParts = () => [fill(DATA.turnText, { n: DATA.turn }), DATA.date ?? '2400 BC', hhmm()];
/** 比赛信息栈的行：[标签, 值]——名次 / 圈 / 时间 / 最佳圈（标签用 ASCII 小字） */
const raceRows = (): [string, string][] => [['POS', `${DATA.place[0]}/${DATA.place[1]}`], ['LAP', `${DATA.lap[0]}/${DATA.lap[1]}`], ['TIME', DATA.timer], ['BEST', DATA.bestLap ?? '1:12.40']];
/** 镜头时间码（HH:MM:SS:FF）：由计时与回合拼出（静帧固定） */
const timecodeText = () => { const [m, s] = DATA.timer.split(':'); return `00:${(m ?? '00').padStart(2, '0')}:${(s ?? '00').padStart(2, '0')}:${String(DATA.turn % 24).padStart(2, '0')}`; };
const countdownText = () => fill(DATA.countdownText ?? '{n} 回合后胜利', { n: DATA.countdown ?? 3 });
/** ringCounter 的侧标签（el.timer.caption = mission：任务名 + 斜纹副题） */
const captionOn = (e: ElCtx) => elChosen(e, 'caption') && String(elOf(e, 'caption') ?? 'none') === 'mission';
function timerNewSize(e: ElCtx, f: string): { w: number; h: number } {
  switch (f) {
    case 'turnDate': return { w: turnDateParts().reduce((s, p) => s + numberWidth(e, p, { ...e.base, weight: 700 }) + S(e, 22), S(e, 6)), h: S(e, 34) };
    case 'ringCounter': return { w: S(e, 64) + (captionOn(e) ? Math.max(W(e, DATA.objectiveTitle, { ...e.title, size: S(e, 16) }), S(e, 120)) + S(e, 14) : 0), h: S(e, 64) };
    case 'countdownStrip': { const t = countdownText(); return { w: numberWidth(e, t, { ...e.base, weight: 700 }) + S(e, 60), h: S(e, 38) }; }
    case 'scoreLabel': return { w: Math.max(S(e, 120), numberWidth(e, fmtNumber(e, DATA.score), { ...e.big, size: S(e, 34), italic: true }) + S(e, 8)), h: S(e, 60) };
    case 'raceStack': return { w: S(e, 46) + Math.max(...raceRows().map(([, v], i) => numberWidth(e, v, raceO(e, i)))) + S(e, 6), h: raceRows().reduce((s, _, i) => s + LH(e, raceO(e, i), 1.05), 0) };
    default: return { w: S(e, 46) + numberWidth(e, timecodeText(), { ...e.base, weight: 700 }) + S(e, 30), h: S(e, 26) };
  }
}
/** 比赛信息栈每行的字样：第一行（名次）大号斜体，其余常规 */
const raceO = (e: ElCtx, i: number): Partial<TextOpts> => (i === 0 ? { ...e.big, size: S(e, 32), italic: true } : { ...e.title, size: S(e, 17) });
function drawTimerNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  if (f === 'turnDate') {
    // 回合 + 纪年 + 时钟（Civ6 右上）：一条暗底，三段之间细竖线
    panel(e, a, true);
    let x = a.x + S(e, 10);
    turnDateParts().forEach((p, i) => {
      if (i) { g.fillStyle = withAlpha(e.text, 0.35); g.fillRect(x - S(e, 11), a.y + a.h * 0.25, Math.max(1, S(e, 1)), a.h * 0.5); }
      x += drawNumber(e, p, x, a.y, a.h, { ...e.base, weight: 700, ...(i === 1 ? { color: mutedOf(e, 0.8) } : {}) }) + S(e, 22);
    });
    return;
  }
  if (f === 'ringCounter') {
    // 双同心细环 + 中心大数字（XCOM 的回合计数）；el.timer.caption = mission 时左边任务名 + 斜纹副题
    const s = Math.min(a.h, S(e, 64)), capW = captionOn(e) ? a.w - s - S(e, 14) : 0, cx = a.x + capW + (capW ? S(e, 14) : 0) + s / 2, cy = a.y + a.h / 2, c = e.accent;
    g.save(); g.strokeStyle = c; g.lineWidth = Math.max(1, S(e, 1.6));
    g.beginPath(); g.arc(cx, cy, s / 2 - S(e, 1), 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.4, 0, Math.PI * 2); g.stroke(); g.restore();
    const t = String(DATA.turn), o = { ...e.big, size: s * 0.42, color: c };
    drawNumber(e, t, cx - numberWidth(e, t, o) / 2, cy - s * 0.35, s * 0.7, o);
    if (capW) {
      const to = { ...e.title, size: S(e, 16) };
      T(e, DATA.objectiveTitle, a.x, a.y + S(e, 8), S(e, 22), to);
      // 斜纹副题：一条斜纹短带（B4 stripedFlank 的同一种斜纹）+ 一行小字
      const sy = a.y + S(e, 34), sw = Math.min(capW, S(e, 120));
      g.save(); g.beginPath(); g.rect(a.x, sy, sw, S(e, 14)); g.clip(); g.strokeStyle = withAlpha(c, 0.55); g.lineWidth = Math.max(1, S(e, 2));
      for (let x = a.x - S(e, 14); x < a.x + sw; x += S(e, 6)) { g.beginPath(); g.moveTo(x, sy + S(e, 14)); g.lineTo(x + S(e, 14), sy); g.stroke(); }
      g.restore();
      const so = { ...e.small, size: Math.max(9, e.small.size * 0.9), weight: 700, upper: true };
      T(e, DATA.objective[1] ?? '', a.x + S(e, 4), sy, S(e, 14), { ...so, color: e.text, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } });
    }
    return;
  }
  if (f === 'countdownStrip') {
    // 细框暗条 + 文字 + 放大的回合数（ITB 的 Victory in 3 turns）
    g.fillStyle = withAlpha('#000', 0.6); g.fillRect(a.x, a.y, a.w, a.h);
    g.strokeStyle = withAlpha(e.text, 0.7); g.lineWidth = Math.max(1, S(e, 1)); g.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1);
    const t = countdownText(), n = String(DATA.countdown ?? 3), at = t.indexOf(n), o = { ...e.base, weight: 700 }, big = { ...e.title, size: S(e, 26), color: e.accent };
    if (at < 0) { drawNumber(e, t, a.x + S(e, 12), a.y, a.h, o); return; }
    let x = a.x + S(e, 12);
    x += T(e, t.slice(0, at), x, a.y, a.h, o);
    x += drawNumber(e, n, x, a.y - S(e, 2), a.h, big);
    T(e, t.slice(at + n.length), x, a.y, a.h, o);
    return;
  }
  if (f === 'scoreLabel') {
    // 小标签在上 + 斜体大分数（Hi-Fi 的 SCORE），无底
    const lo = { ...e.small, weight: 800, spacing: 0.15, color: mutedOf(e, 0.85), outline: { color: 'rgba(0,0,0,0.6)', width: 1 } }, lab = DATA.scoreLabel ?? 'SCORE';
    const no = { ...e.big, size: S(e, 34), italic: true, outline: { color: 'rgba(0,0,0,0.65)', width: 1.5 } }, n = fmtNumber(e, DATA.score), nw = numberWidth(e, n, no);
    const x0 = e.align === 'right' ? a.x + a.w - nw : e.align === 'center' ? a.x + (a.w - nw) / 2 : a.x;
    T(e, lab, e.align === 'right' ? a.x + a.w - W(e, lab, lo) : e.align === 'center' ? a.x + (a.w - W(e, lab, lo)) / 2 : a.x, a.y, S(e, 16), lo);
    drawNumber(e, n, x0, a.y + S(e, 14), S(e, 46), no);
    return;
  }
  if (f === 'raceStack') {
    // 比赛信息栈（FH5 左上）：名次 / 圈 / 时间 / 最佳圈按行，统一小标签在左、值左对齐
    let y = a.y;
    raceRows().forEach(([l, v], i) => {
      const o = raceO(e, i), lh = LH(e, o, 1.05), lo = { ...e.small, size: Math.max(8, e.small.size * 0.8), weight: 800, color: mutedOf(e, 0.75), spacing: 0.1 };
      T(e, l, a.x, y, lh, lo);
      drawNumber(e, v, a.x + S(e, 46), y, lh, o);
      y += lh;
    });
    return;
  }
  // timecode：REC 红点 + HH:MM:SS:FF + 电池格（镜头屏显：取景器 / 摄像机 / 监控）；红点按模拟时钟每秒闪一次（静帧亮）
  // REC 每秒闪一次：读模拟时钟（B5 审查修复 ㉑：原来读待机相位，mo.idle = none 时永远亮着），第 0 帧亮
  const cy = a.y + a.h / 2, on = Math.floor(simNow().t * 2) % 2 === 0;
  if (on) { g.fillStyle = '#e5484d'; g.beginPath(); g.arc(a.x + S(e, 7), cy, S(e, 5), 0, Math.PI * 2); g.fill(); }
  const ro = { ...e.small, weight: 800, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } };
  T(e, 'REC', a.x + S(e, 16), a.y, a.h, ro);
  const tx = a.x + S(e, 46), tw = drawNumber(e, timecodeText(), tx, a.y, a.h, { ...e.base, weight: 700, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } });
  // 电池：外框 + 三格电量 + 正极小头
  const bx = tx + tw + S(e, 8), bw = S(e, 18), bh = S(e, 10);
  g.save(); g.strokeStyle = e.text; g.lineWidth = Math.max(1, S(e, 1.2)); g.strokeRect(bx, cy - bh / 2, bw, bh); g.fillStyle = e.text; g.fillRect(bx + bw, cy - bh * 0.25, S(e, 2), bh * 0.5);
  for (let i = 0; i < 3; i++) g.fillRect(bx + S(e, 2) + i * (bw - S(e, 4)) / 3, cy - bh / 2 + S(e, 2), (bw - S(e, 4)) / 3 - S(e, 1), bh - S(e, 4));
  g.restore();
}

/**
 * 回合章的作用域盒子（M12b-68 ④）：vis.silhouette@el.timer（或 @rank）写了外形、或按目标写了描边时，以 (cx, cy) 为心、半径 s 画这个外形的盒子
 * （底 = 元素主题的面板底，边 = 描边参数那一圈：double 是两道同心细环），里面写回合数；都没写时返回 false（调用方画原来的奖章）
 */
function timerRing(e: ElCtx, cx: number, cy: number, s: number, label: string): boolean {
  const sil = scopedSilhouette(e, 'rank'), ek = e.part('rank'), sk = ['vis.stroke', 'vis.strokeColor', 'vis.strokeWidth'].some((k) => scopedSet(ek, k));
  if (!sil && !sk) return false;
  const r = { x: cx - s, y: cy - s, w: s * 2, h: s * 2 }, p = ek.t.panel, ed = ek.t.edge ?? { border: p.border, sides: p.sides, cornerMarks: p.cornerMarks };
  const sty = shapeStyle(e, 'rank', { bg: p.bg, ...ed, shadows: [], radiusPct: sil ? undefined : 50 }, r);
  if (!sty.bare) drawBox(e.g, r, sty, e.pal);
  const o = { ...e.title, size: s * 0.95, color: ek.text };
  drawNumber(e, label, cx - numberWidth(e, label, o) / 2, cy - s * 0.7, s * 1.4, o);
  return true;
}

/* 速度 / 名次 */
/** 名次（M12a-13）：同屏有 el.rank 时不再写一遍（原来不论哪种画法都在仪表旁重复一个斜体名次）；el.speed.showPlace（M12b-02）= on / off 显式开关，auto = 原来的 */
const speedPlaceOn = (e: ElCtx) => { const sp = pickedStr(e, ownKey(e, 'showPlace'), 'auto'); return sp === 'on' ? true : sp === 'off' ? false : !e.r.elements().includes('el.rank'); };
const placeText = () => `${DATA.place[0]}/${DATA.place[1]}`;
/** 仪表画法旁的名次栏宽（中期审查修复 ㉝：名次原来画在元素矩形左边 70 之外，不登记、左侧锚点时画出屏）：栏宽 = max(70, 字宽 + 8)，算进元素尺寸，仪表画在右边 150 里 */
const placeCol = (e: ElCtx) => (speedPlaceOn(e) ? Math.max(S(e, 70), numberWidth(e, placeText(), { ...e.big, size: S(e, 34), italic: true }) + S(e, 8)) : 0);
registerElement({
  id: 'el.speed', forms: ['dial', 'number', 'bar'], anchor: 'br',
  size: (e) => (DIAL_SPEED.has(cmp(e, 'cmp.gauge', 'dial')) ? { w: S(e, 150) + placeCol(e), h: S(e, 150) } : { w: S(e, 200), h: S(e, 70) }),
  draw: (e, a0) => {
    const kind = cmp(e, 'cmp.gauge', 'dial');
    const place = placeText(), lap = fill(DATA.lapText, { a: DATA.lap[0], b: DATA.lap[1] }), unit = DATA.speedUnit;
    const showPlace = speedPlaceOn(e);
    // 仪表画法：名次栏在左（元素矩形里），仪表在右边那块（右锚点时位置与原来一样）
    const pc = DIAL_SPEED.has(kind) ? placeCol(e) : 0, a = pc ? { ...a0, x: a0.x + pc, w: a0.w - pc } : a0;
    // 速度数字跟 elx.valueLabel（没给时 = current，原来的写法；none 不写数字）
    const vk = valueKind(e, 'current'), sv = vk === 'current' ? String(DATA.speed) : valueText(e, DATA.speed / 300, 300, vk);
    // 转速表（M12b-02，forza-horizon-5#0）：指针 = 转速（包的 hud.rpm）、中心大字 = 挡位、下方 = 车速 + 单位；名次照上面的规则
    if (kind === 'tachometer') {
      gauge(e, a, DATA.rpm ?? 0.72, 'tachometer', e.accent, DATA.gear ?? '4', { sub: sv ? `${sv} ${unit}` : undefined });
      if (showPlace) drawNumber(e, place, a.x - pc, a.y, S(e, 40), { ...e.big, size: S(e, 34), italic: true });
      return;
    }
    if (kind === 'dial') {
      gauge(e, a, DATA.speed / 300, 'dial', e.accent);
      // 品质下限（审查修复 E 视觉 ⑫：原来车速数字压在表盘中心、指针从字上扫过）：数字排在轴心下方（表盘下半的空处），单位跟在数字下面
      if (sv && QUALITY.on) { const no = { ...e.big, size: S(e, 26) }; drawNumber(e, sv, a.x + a.w / 2 - numberWidth(e, sv, no) / 2, a.y + a.h * 0.57, S(e, 32), no); T(e, unit, a.x + a.w / 2 - W(e, unit, e.small) / 2, a.y + a.h * 0.57 + S(e, 30), S(e, 16), e.small); }
      else if (sv) { drawNumber(e, sv, a.x + a.w / 2 - numberWidth(e, sv, e.big) / 2, a.y + a.h * 0.42, S(e, 40), { ...e.big, size: S(e, 30) }); T(e, unit, a.x + a.w / 2 - W(e, unit, e.small) / 2, a.y + a.h * 0.68, S(e, 16), e.small); }
      if (showPlace) drawNumber(e, place, a.x - pc, a.y, S(e, 40), { ...e.big, size: S(e, 34), italic: true });
      return;
    }
    if (showPlace) drawNumber(e, place, a.x, a.y, S(e, 44), { ...e.big, size: S(e, 36), italic: true });
    T(e, lap, a.x + S(e, 74), a.y + S(e, 4), S(e, 18), e.small);
    if (kind === 'bar') { const br = { x: a.x + S(e, 74), y: a.y + S(e, 30), w: a.w - S(e, 74), h: S(e, 10) }; gauge(e, br, DATA.speed / 300, 'segmented', e.accent); if (vk !== 'current') drawValue(e, br, sv, e.valueLabelPos, vk); }
    else if (sv) drawNumber(e, `${sv} ${unit}`, a.x + S(e, 74), a.y + S(e, 22), S(e, 24), { ...e.title });
  },
});

/**
 * 激光的起点（el.crosshair.laserFrom，M12b-60）：screen = 原来的（准星左下 160 / 120 处）、muzzle = 手持物 / 枪口（挂点 held；场景没给时按 screen）、
 * offscreen = 画面底边外（准星正下方，像从镜头外射来）
 */
function laserOrigin(e: ElCtx, c: { x: number; y: number }): { x: number; y: number } {
  const v = pickedStr(e, ownKey(e, 'laserFrom'), 'screen');
  if (v === 'muzzle') { const h = attachPoint(e, 'held'); if (!h.missing && h.on !== false) return h; }
  if (v === 'offscreen') return { x: c.x + S(e, 40), y: e.R.y + e.R.h + S(e, 20) };
  return { x: c.x - S(e, 160), y: c.y + S(e, 120) };
}

/**
 * 激光的起止点：一般 = 起点（laserOrigin）→ 准星点。准星自己挂在枪口上（elx.attachTo = held 且 laserFrom = muzzle，Dead Space 复刻）时两点重合，
 * 改成从枪口（准星点）射向目标（目标不在画面上时射向画面中心），flipped = true
 */
function laserAim(e: ElCtx, c: { x: number; y: number }, o: { x: number; y: number }): { from: { x: number; y: number }; to: { x: number; y: number }; flipped: boolean } {
  if (Math.hypot(c.x - o.x, c.y - o.y) >= S(e, 4)) return { from: o, to: c, flipped: false };
  const t = attachPoint(e, 'target'), ok = !t.missing && t.on !== false && Math.hypot(t.x - c.x, t.y - c.y) >= S(e, 4);
  const to = ok ? { x: t.x, y: t.y } : { x: e.R.x + e.R.w / 2, y: e.R.y + e.R.h / 2 };
  return { from: { x: c.x, y: c.y }, to: Math.hypot(to.x - c.x, to.y - c.y) < 1 ? { x: c.x + S(e, 160), y: c.y } : to, flipped: true };
}

/** 速度表的仪表画法（方形 150 × 150）：dial 原来的、tachometer 转速表（M12b-02） */
const DIAL_SPEED = new Set(['dial', 'tachometer']);

/* 准星 / 瞄准 */
registerElement({
  id: 'el.crosshair', forms: ['cross', 'dot', 'dynamic', 'ring', 'laser', 'groundRing', 'aimArrow', 'triLaser', 'reticle'], anchor: 'center',
  // 挂点（M12a-15）：准星默认在屏幕正中，elx.attachTo = target 时套在目标身上（XCOM），held = 从手持物打出的激光（Dead Space）；脚下圈 / 瞄准箭头原来写死的点不变
  points: { groundRing: 'target', aimArrow: 'player' },
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  draw: (e) => {
    const f = e.forms[0], g = e.g, c = attachPoint(e, attachFor(e));
    // 双色准星：白芯 + 深色描边，任何背景上都看得见。线宽不随 elx.scale 变粗（M12a-15，xcom2#5：放大的准星圈仍是细线）：
    // 白芯 = vis.strokeWidth@el.crosshair（显式给了时，至少 1）或 2 × 版面缩放，深色描边再宽 2
    const lk = e.th.scale * (e.priority === 'primary' ? 1.15 : e.priority === 'ambient' ? 0.85 : 1);
    const swk = e.v.key('vis.strokeWidth'), inner = swk.includes('@') && chosen(e, swk) ? Math.max(1, e.v.num('vis.strokeWidth', 2)) : 2 * lk;
    // 圆头描边包在 save / restore 里（中期审查修复 ㊱：lineCap = round 原来漏到后面画的分隔线 / 刻度上，线端各长出半个线宽）
    const stroke = (fn: () => void) => { g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = inner + 2 * lk; fn(); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = inner; fn(); g.stroke(); g.restore(); };
    const gap = f === 'dynamic' ? S(e, 10) : S(e, 5), len = S(e, 8);
    switch (f) {
      case 'dot': g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(c.x, c.y, S(e, 4), 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c.x, c.y, S(e, 2.5), 0, Math.PI * 2); g.fill(); return;
      case 'ring': stroke(() => { g.beginPath(); g.arc(c.x, c.y, S(e, 14), 0, Math.PI * 2); }); return;
      case 'laser': { const lc = e.fill(0, 'danger'), L = laserAim(e, c, laserOrigin(e, c)); g.strokeStyle = withAlpha(lc, 0.8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(L.from.x, L.from.y); g.lineTo(L.to.x, L.to.y); g.stroke(); g.fillStyle = lc; g.beginPath(); g.arc(L.to.x, L.to.y, S(e, 3), 0, Math.PI * 2); g.fill(); return; }
      // 三道平行激光（M12b-60，dead-space#9）：自枪口（el.crosshair.laserFrom）射出 el.crosshair.lines 道（默认 3）平行短激光，间距 el.crosshair.spacing（px@1080p），
      //   el.crosshair.orientation = h 时几道横向排开、v 时竖向排开；末端各一颗亮点
      case 'triLaser': {
        const lc = e.fill(0, 'danger'), o = laserOrigin(e, c), n = Math.max(2, Math.min(5, Math.round(ownNum(e, 'lines', 3)))), sp = px1080(ownNum(e, 'spacing', 10)) * e.th.scale;
        const vert = pickedStr(e, ownKey(e, 'orientation'), 'h') === 'v', len = Math.min(e.R.w, e.R.h) * 0.16;
        // 准星自己挂在枪口上时（laserAim）几道线从枪口起、朝目标射出 len（原来退化成零长度，只剩三颗亮点）
        const L = laserAim(e, c, o), dx = L.to.x - L.from.x, dy = L.to.y - L.from.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        const ax = L.flipped ? L.from.x + ux * len : c.x, ay = L.flipped ? L.from.y + uy * len : c.y;
        g.save(); g.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * sp, ex = ax + (vert ? 0 : off), ey = ay + (vert ? off : 0), sx = ex - ux * len, sy = ey - uy * len;
          const gr = g.createLinearGradient(sx, sy, ex, ey); gr.addColorStop(0, withAlpha(lc, 0)); gr.addColorStop(1, withAlpha(lc, 0.95));
          g.strokeStyle = gr; g.lineWidth = Math.max(1.2, S(e, 1.6)); g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
          g.fillStyle = mix(lc, '#ffffff', 0.4); g.beginPath(); g.arc(ex, ey, S(e, 2.2), 0, Math.PI * 2); g.fill();
        }
        g.restore();
        return;
      }
      // 细圈 + 长十字（M12b-60，xcom2#6）：圈半径 14、十字臂长 el.crosshair.armLength × 短边（默认 0.22，伸出圈外很远）、中心缺口 el.crosshair.gap（px@1080p）；线宽同上（vis.strokeWidth@el.crosshair）
      case 'reticle': {
        const arm = Math.min(e.R.w, e.R.h) * Math.max(0.05, Math.min(0.6, ownNum(e, 'armLength', 0.22))), gp = px1080(ownNum(e, 'gap', 8)) * e.th.scale, rr = S(e, 14);
        stroke(() => { g.beginPath(); g.arc(c.x, c.y, rr, 0, Math.PI * 2); });
        stroke(() => { g.beginPath(); g.moveTo(c.x - arm, c.y); g.lineTo(c.x - gp, c.y); g.moveTo(c.x + gp, c.y); g.lineTo(c.x + arm, c.y); g.moveTo(c.x, c.y - arm); g.lineTo(c.x, c.y - gp); g.moveTo(c.x, c.y + gp); g.lineTo(c.x, c.y + arm); });
        return;
      }
      case 'groundRing': { const p = c; stroke(() => { g.beginPath(); g.ellipse(p.x, p.y + S(e, 20), S(e, 30), S(e, 12), 0, 0, Math.PI * 2); }); return; }
      // 出牌指向的 V 形链（M12b-24，slay-the-spire#13）：vis.connector@el.crosshair = chevronChain 选过时，从起点（el.crosshair.aimFrom：player = 角色、hand = 手牌区正中）
      //   沿一道上拱的弧线排一串危险色 V 形、末端一枚大箭头指向目标（attachPoint target）；没选时原来的短白线 + 小箭头
      case 'aimArrow': if (pickedStr(e, 'vis.connector', '') === 'chevronChain') {
        const from = (elChosen(e, 'aimFrom') ? ownStr(e, 'aimFrom', 'player') : 'player') === 'hand' ? { x: e.R.x + e.R.w / 2, y: e.R.y + e.R.h * 0.84 } : c, to = attachPoint(e, 'target');
        chevronChain(g, [from.x, from.y], [to.x, to.y], e.fill(0, 'danger'), S(e, 11));
        return;
      } else { const p = c; g.fillStyle = withAlpha(e.accent, 0.8); g.beginPath(); g.moveTo(p.x + S(e, 70), p.y - S(e, 30)); g.lineTo(p.x + S(e, 40), p.y - S(e, 40)); g.lineTo(p.x + S(e, 48), p.y - S(e, 22)); g.closePath(); g.fill(); stroke(() => { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + S(e, 50), p.y - S(e, 28)); }); return; }
      default:
        stroke(() => { g.beginPath(); g.moveTo(c.x - gap - len, c.y); g.lineTo(c.x - gap, c.y); g.moveTo(c.x + gap, c.y); g.lineTo(c.x + gap + len, c.y); g.moveTo(c.x, c.y - gap - len); g.lineTo(c.x, c.y - gap); g.moveTo(c.x, c.y + gap); g.lineTo(c.x, c.y + gap + len); });
    }
  },
});
