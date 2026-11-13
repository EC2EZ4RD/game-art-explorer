import { mix, parseColor, rgba, withAlpha } from '../material';
import { BAKE, boxPath, drawBox, isHudCanvas, logBoxRect, QUALITY, FONT_EPOCH, logTarget, ORN, PSEUDO, resolveColor, TEXT_K, wrapLines, type Rect } from '../paint';
import { drawPadlock } from '../glyphs';
import type { MemberLayout } from './core';
import { ensureContrast, FONT_STACK, onColorOf, px1080 } from '../sys/theme';
import { ptShiftAt, spanFull, gauge, memberMode, memberRects, ownBool, ownCount, ownKey, sampleItems, elChosen, fmtNumber, displayFor, lineColor, alignX, artSlot, attachFor, attachPoint, avatar, badge, button, buttonText, onKey, chosen, chosenKey, cmp, ctaText, iconStyleOf, DATA, declaredStates, dialogScoped, drawNumber, numberWidth, elCount, elementParts, elGiven, elOf, formsOf, pickedStr, scopedSilhouette, shapeOver, postSkinKey, scopedStr, portraitBox, fitW, gaugeOf, icon, itemIcon, keyCap, keyCapWidth, labelShown, LH, mutedOf, onAccent, packRarity, panel, plate, platePick, rarityCues, rarityShown, registerElement, semantic, slot, stateDemo, T, tap, valueKind, valueSize, valueText, W, type Attach, type ElCtx, titlePrefix, ornColor, cmpPicked } from './core';
import { luminance } from '../material';
import { cardKind, cardPartsOf, cardSections, drawCard, rowCard, sectionsHeight, type CardItem } from './card';
import { drawField, SECTIONS, type SectionSeed } from './fields';
import { costPips, pipsSize, recipeRow, recipeSize } from './inventory';
import { drawRich, plainText } from '../richText';
import { divider, flourish, ornamentInsets } from '../ornament';
import { drawPixelGlyph } from '../glyphs';
import type { TextOpts } from '../paint';
import { simNow } from '../sim';
import { gridPoint, worldNow } from '../world';
import { drawInkTitle } from '../uiAssets';
import { artRef, fill, pack } from '../content';
import { samplesFor } from '../content/samples';
import { spokenLine, textFor } from '../content/texts';
import type { PadButton, PartyInfo, StatusRole } from '../content/types';

/*
 * 信息与界面元素（M5a 第二批）：选中面板、队伍、时间天气、地图叠层、按键提示、字幕、主按钮、标题、奖励、价格。
 * 样本字都从当前内容包读（docs/c1-content-packs.md 6.1）：局内样本 DATA.x，游戏名 / 章节 / 菜单标题 pack().game / menu；size 与 draw 量同一个字段。
 */

const S = (e: ElCtx, n: number) => n * e.k;

/** "第几天"（包的 dayText 填 day）：时钟、天数计数共用 */
const dayText = () => fill(DATA.dayText, { n: DATA.day });
/** 时钟上的时刻 hh:mm（hour 是小时小数）：size 与 draw 量同一串 */
const clockText = () => { const hh = Math.floor(DATA.hour), mm = Math.round((DATA.hour - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
/** 热力图图例高 / 中 / 低的颜色（字在包里） */
const HEAT_COLORS = ['#e5484d', '#e3b341', '#3fb950'];

/**
 * 选中信息的字（M12b-62）：el.selection.subject = target 时悬浮提示 / 面板写目标档案（内容包 screens.dossier：名字 · 等级、派系 · 威胁、可用手段，
 * cyberpunk-2077#28 扫描敌人；原来是物件提示「弹药箱 · 可以补充」），否则内容包的 hud.selection（原来的）
 */
function selOf(e: ElCtx): typeof DATA.selection {
  const sel = DATA.selection;
  if (String(elOf(e, 'subject') ?? 'auto') !== 'target') return sel;
  const [n, lv, th, fac, hacks] = samplesFor('dossier');
  const threat = `危险 ${'◆'.repeat(Math.max(0, Math.min(3, th))) || '—'}`;
  return { ...sel, name: n, full: `${n}  Lv.${lv}`, job: `${fac} · ${threat}`, tag: `${n} · Lv.${lv}`, initial: [...n][0] ?? sel.initial, tip: [`${n}  Lv.${lv}`, `${fac} · ${threat}`, hacks.join(' / ')] };
}

/* 选中信息面板 */
/** 选中信息可以画几张（el.selection.count，M12b-04，cyberpunk-2077#7）：只有整块的面板 / 卡片 / 悬浮提示能多张，1–3 */
const SEL_MULTI = new Set(['panel', 'card', 'tooltip']);
const selCount = (e: ElCtx) => (SEL_MULTI.has(e.forms[0]) ? ownCount(e, 1, 3) : 1);
/** 第 i 张的内容：第一张是原来的样本，后面几张换成队伍样本的名字（同一套字段，Cyberpunk 左中三张错位叠放的数据卡） */
function selAt(e: ElCtx, i: number): typeof DATA.selection {
  const s0 = selOf(e);
  if (!i) return s0;
  const [n] = DATA.party[i % DATA.party.length];
  return { ...s0, name: n, full: n, tag: n, initial: [...n][0] ?? s0.initial, tip: [n, s0.tip[1], s0.tip[2]] };
}
/** 几张选中卡的排法（elx.instanceLayout：row 并排 / stack 错位叠放，见 core.ts memberRects）：一张时 null（原来的画法） */
function selLayout(e: ElCtx, one: { w: number; h: number }) {
  const n = selCount(e);
  return n > 1 ? memberRects(e, n, one, memberMode(e, 'instanceLayout', 'row') === 'stack' ? 'v' : 'h', S(e, 10)) : null;
}
registerElement({
  // 版式库（M12b-15）：sidePanel / cityPanel / entityInfo / buildingPanel / dossier / shotCalc / bareText / cardStack 见下面的 drawSheet
  id: 'el.selection', forms: ['panel', 'card', 'tag', 'tooltip', 'selectRing', 'portraits', 'sidePanel', 'cityPanel', 'entityInfo', 'buildingPanel', 'dossier', 'shotCalc', 'bareText', 'cardStack'], anchor: 'bl',
  points: { tag: 'target', selectRing: 'target' },
  // 贴边侧栏没给锚点时贴 el.selection.edge 那一边的上角（全高）
  formAnchor: (r, f, id) => (f === 'sidePanel' ? (sideEdge({ r }, id) === 'right' ? 'tr' : 'tl') : undefined),
  contentBox: (e, a) => sheetContent(e, a),
  // 城市面板骑在上沿的名牌：伸出元素上沿的那一半（画在元素矩形以外，B9 审查修复 ⑥）登记进帧占位表
  extraRects: (e, a) => { if (e.forms[0] !== 'cityPanel') return []; const q = cityPlate(e, a); return [{ ...q, h: a.y - q.y }]; },
  size: (e) => { if (SHEET_FORMS.has(e.forms[0])) return sheetSize(e, e.forms[0]); const one = selSize(e), L = selLayout(e, one); return L ? L.bbox : one; },
  // 建筑面板长高后放不下这一列的空当时收回到不长高的高（R4 审查修复 ②⑪，见 buildingGeom）
  flexH: (e) => (e.forms[0] === 'buildingPanel' && ownFields(e) ? buildingGeom(e).cap : Infinity),
  draw: (e, a) => {
    if (SHEET_FORMS.has(e.forms[0])) { drawSheet(e, a, e.forms[0]); return; }
    // 一张时不量尺寸（绘制调用序列与原来一样）
    const L = selCount(e) > 1 ? selLayout(e, selSize(e)) : null;
    if (!L) { drawSelection(e, a, selOf(e)); return; }
    for (const i of L.order) { const q = L.rects[i]; drawSelection(e, { x: a.x + q.x, y: a.y + q.y, w: q.w, h: q.h }, selAt(e, i)); }
  },
});
function selSize(e: ElCtx): { w: number; h: number } {
    const sel = selOf(e);
    switch (e.forms[0]) {
      case 'card': {
        // 卡内子件栈（cmp.cardParts@card / @el.selection）按内容定高（R4 审查修复 ⑬，cyberpunk-2077#36「大卡按字段收高」：原来固定 240 高、字段只占上面四成，
        // 右上一摞因为这张空卡与按键提示相撞、整摞被 2a' 缩到 0.85）；没写子件时照旧 240（头像 + 名字 + 属性条）
        const w = fitW(e, S(e, 180), [[sel.name, e.title]], S(e, 24)), parts = cardPartsOf(e, 'card');
        return { w, h: parts.length ? sectionsHeight(e.part('card'), w, selCard(sel), parts, S(e, 90)) : S(e, 240) };
      }
      case 'tag': return { w: S(e, 10), h: S(e, 10) };
      // 悬浮提示按内容收缩（M12a-26：原来至少 220 × 110，Balatro 选卡页的说明框压住上排手牌）：宽 = 最宽的一行 + 留白（至少 120），高 = 上下留白 + 标题行 + 两行小字（与 draw 同一套行高）
      case 'tooltip': {
        // 卡内子件栈（cmp.cardParts@tooltip / @el.selection，M12b-69：Cyberpunk 数据卡的字段对 + 金额条）/ 内嵌白卡（el.selection.innerCard = white，Balatro 说明框）按内容定高
        const parts = cardPartsOf(e, 'tooltip');
        if (parts.length) { const w = Math.max(S(e, 200), fitW(e, S(e, 160), [[sel.tip[0], e.title]], S(e, 40))); return { w, h: sectionsHeight(e.part('tooltip'), w, selCard(sel), parts, S(e, 70)) }; }
        if (innerCardOn(e)) return innerCardGeom(e, sel);
        return { w: fitW(e, S(e, 120), [[sel.tip[0], e.title], [sel.tip[1], e.small], [sel.tip[2], e.small]], S(e, 24)), h: S(e, 12) + Math.max(S(e, 28), LH(e, e.title)) + 2 * Math.max(S(e, 20), LH(e, e.small)) };
      }
      case 'selectRing': return { w: S(e, 10), h: S(e, 10) };
      case 'portraits': return { w: S(e, 300), h: S(e, 70) };
      default: { const h0 = Math.max(S(e, 110), S(e, 16) + LH(e, e.title) + 3 * LH(e, e.small)); return { w: fitW(e, S(e, 360), [[sel.full, e.title], [sel.job, e.small]], S(e, 112)), h: h0 + selArtExtra(e, h0) }; }
    }
}
function drawSelection(e: ElCtx, a: Rect, sel: typeof DATA.selection) {
    const f = e.forms[0], g = e.g, p = attachPoint(e, attachFor(e));
    switch (f) {
      case 'tag': {
        // 世界里的名牌是部件 nameplate（M12b-68：col.surface@nameplate、vis.stroke@nameplate、vis.silhouette@nameplate……）
        const s = sel.tag, w = W(e, s, e.small) + S(e, 16);
        panel(e.part('nameplate'), { x: p.x - w / 2, y: p.y - S(e, 58), w, h: S(e, 22) }, true, { radiusPct: 50 });
        T(e, s, p.x - w / 2 + S(e, 8), p.y - S(e, 58), S(e, 22), e.small);
        return;
      }
      case 'selectRing':
        g.strokeStyle = e.good; g.lineWidth = 2.5; g.beginPath(); g.ellipse(p.x, p.y + S(e, 16), S(e, 26), S(e, 10), 0, 0, Math.PI * 2); g.stroke();
        gaugeOf(e, { x: p.x - S(e, 22), y: p.y - S(e, 44), w: S(e, 44), h: S(e, 5) }, 0.8, 0, 'thinBar', { fixed: true, color: e.good });
        return;
      case 'portraits':
        sel.portraits.forEach((c, i) => avatar(e, a.x + S(e, 26) + i * S(e, 48), a.y + a.h / 2, S(e, 20), c, i < 2 ? e.good : e.accent));
        return;
      case 'card': {
        // 卡片画法是 card 部件（M12a-01）
        const c = e.part('card');
        panel(c, a, false, {}, 'card');
        // 卡内子件栈（cmp.cardParts@card / @el.selection，M12b-69，cyberpunk-2077#9：数据卡的字段对 + 金额条）
        const parts = cardPartsOf(e, 'card');
        if (parts.length) { cardSections(c, a, selCard(sel), parts, S(e, 90)); return; }
        // 卡片的插画槽（cmp.panelArt，M12a-36）：header / window / side 画在头像那块（任务卡的情报图窗），full 整幅底图压暗一半
        const art = cmp(c, 'cmp.panelArt', 'none');
        if (art === 'full') { c.g.save(); c.g.beginPath(); boxPath(c.g, a, c.t.card ?? c.t.panel); c.g.clip(); artSlot(c, a, 'scene', '底图'); c.g.fillStyle = 'rgba(0,0,0,0.5)'; c.g.fillRect(a.x, a.y, a.w, a.h); c.g.restore(); }
        if (art === 'header' || art === 'window' || art === 'side') artSlot(c, { x: a.x + S(e, 10), y: a.y + S(e, 12), w: a.w - S(e, 20), h: S(e, 100) }, art === 'side' ? 'portrait' : 'scene', art === 'side' ? '肖像' : '图窗');
        else avatar(c, a.x + a.w / 2, a.y + S(e, 64), S(e, 44), sel.initial);
        T(c, sel.name, a.x + a.w / 2 - W(c, sel.name, c.title) / 2, a.y + S(e, 116), S(e, 24), c.title);
        const lab = Math.max(...sel.stats.map(([l]) => W(c, l, c.small))) + S(e, 22);
        sel.stats.forEach(([l, v], i) => { T(c, l, a.x + S(e, 14), a.y + S(e, 148 + i * 26), S(e, 18), c.small); gaugeOf(c, { x: a.x + lab, y: a.y + S(e, 154 + i * 26), w: a.w - lab - S(e, 14), h: S(e, 7) }, v, i, 'bar', { fixed: true, role: 'good', value: selValue(c, v) }); });
        return;
      }
      default: {
        const tip = f === 'tooltip';
        // 卡内子件栈 / 内嵌白卡（M12b-69）
        if (tip) { const parts = cardPartsOf(e, 'tooltip'); if (parts.length || innerCardOn(e)) { tooltipCard(e, a, sel, parts); return; } }
        // 悬浮提示画法是 tooltip 部件（M12a-01）
        if (tip) e = e.part('tooltip');
        panel(e, a, tip, {}, tip ? 'tooltip' : 'panel');
        // 面板插画槽（cmp.panelArt@el.selection，M12a-36；面板画法才有）：header 顶部横幅（占面板 28%）、window 标题与状态条之间一条图窗、
        // side 左侧肖像（代替头像）、full 整幅底图压暗 50% 后排内容；没素材时是灰盒
        const art = tip ? 'none' : cmp(e, 'cmp.panelArt', 'none');
        const hh = art === 'header' ? a.h - a.h / (1 + selArtK) : 0;
        if (art === 'full') { e.g.save(); e.g.beginPath(); boxPath(e.g, a, e.t.panel); e.g.clip(); artSlot(e, a, 'scene', '底图'); e.g.fillStyle = 'rgba(0,0,0,0.5)'; e.g.fillRect(a.x, a.y, a.w, a.h); e.g.restore(); }
        if (art === 'header') artSlot(e, { x: a.x + S(e, 6), y: a.y + S(e, 6), w: a.w - S(e, 12), h: hh - S(e, 6) }, 'scene', '头图');
        const c = { ...a, y: a.y + hh, h: a.h - hh };
        if (art === 'side') artSlot(e, { x: c.x + S(e, 12), y: c.y + S(e, 10), w: S(e, 76), h: c.h - S(e, 20) }, 'portrait', '肖像');
        else if (!tip) { avatar(e, c.x + S(e, 50), c.y + c.h / 2, S(e, 36), sel.initial); }
        const x = c.x + (tip ? S(e, 12) : S(e, 100));
        // 行距按字高、标签列按字宽（M8b）
        const th = Math.max(S(e, 28), LH(e, e.title)), sh = Math.max(S(e, 20), LH(e, e.small));
        T(e, tip ? sel.tip[0] : sel.full, x + titlePrefix(e, x, c.y + S(e, 6), th, e.title), c.y + S(e, 6), th, e.title);
        T(e, tip ? sel.tip[1] : sel.job, x, c.y + S(e, 6) + th, sh, e.small);
        const wh = art === 'window' ? S(e, SEL_WINDOW) : 0;
        if (wh) artSlot(e, { x, y: c.y + S(e, 8) + th + sh, w: c.x + c.w - x - S(e, 12), h: wh - S(e, 4) }, 'scene', '图窗');
        // 两条状态的颜色按序号走颜色角色（M12a-02）：第一条好色、第二条货币色（默认黄），名字与比例在包里
        const lab = Math.max(...sel.bars.map(([l]) => W(e, l, e.small))) + S(e, 8);
        // 两条状态读 cmp.gauge@el.selection（M12a-11，原来写死 bar）；数值标注按 elx.valueLabel（M12a-13，默认不标）
        if (!tip) sel.bars.forEach(([l, v], i) => { const y = c.y + S(e, 6) + th + sh * (i + 1) + wh; T(e, l, x, y, sh, e.small); gaugeOf(e, { x: x + lab, y: y + sh / 2 - S(e, 3.5), w: c.x + c.w - x - lab - S(e, 12), h: S(e, 7) }, v, i, 'bar', { fixed: true, role: i ? 'currency' : 'good', value: selValue(e, v) }); });
        else T(e, sel.tip[2], x, c.y + S(e, 6) + th + sh, sh, { ...e.small, color: e.accent });
      }
    }
}

/** 内嵌白卡开没开（el.selection.innerCard = white，M12b-69，元素参数：选过才算） */
const innerCardOn = (e: ElCtx) => elChosen(e, 'innerCard') && String(elOf(e, 'innerCard') ?? 'none') === 'white';
/** 说明框的类别与正文：样本 tip[1] 写成「类别 · 正文」时拆开（类别进胶囊），否则类别取强调的样本名 */
const tipParts = (sel: typeof DATA.selection): [string, string] => { const s = sel.tip[1], k = s.indexOf(' · '); return k > 0 ? [s.slice(0, k), s.slice(k + 3)] : [sel.name, s]; };
/** 选中物当成一张卡（卡内子件的数据：名字、说明、符号取首字） */
const selCard = (sel: typeof DATA.selection): CardItem => ({ i: 0, glyph: sel.initial, name: sel.tip[0], desc: tipParts(sel)[1], sub: tipParts(sel)[0] });
/** 内嵌白卡的几何（M12b-69，balatro#28）：外框留白 + 白卡（名字一行 + 正文最多三行）+ 下方类别胶囊 */
function innerCardGeom(e: ElCtx, sel: typeof DATA.selection) {
  const pad = S(e, 8), [, body] = tipParts(sel), w = fitW(e, S(e, 170), [[sel.tip[0], e.title]], S(e, 40)) + pad * 2;
  const lines = Math.max(1, Math.min(3, wrapLines(e.tx, plainText(body), w - pad * 4, { ...e.base, ...e.small }).length));
  const inner = LH(e, e.title) + lines * LH(e, e.small) + pad * 1.2, chip = LH(e, e.small) * 1.3;
  return { w, h: pad + inner + pad * 0.8 + chip + pad, inner, chip, pad, lines };
}
/** 说明框的卡式画法（M12b-69）：外框（tooltip 部件的深色框）里套卡内子件栈，或一张白色内卡（关键词着色走 B2 的富文本）+ 下方类别胶囊（类别色） */
function tooltipCard(e0: ElCtx, a: Rect, sel: typeof DATA.selection, parts: string[]) {
  const e = e0.part('tooltip');
  panel(e, a, true, {}, 'tooltip');
  if (parts.length) { cardSections(e, a, selCard(sel), parts, S(e, 70)); return; }
  const G = innerCardGeom(e, sel), [cat, body] = tipParts(sel), ink = '#1f2328';
  const q = { x: a.x + G.pad, y: a.y + G.pad, w: a.w - G.pad * 2, h: G.inner };
  drawBox(e.g, q, { bg: { solid: '#f4f1ea' }, radius: S(e, 6) }, e.pal);
  const to = { ...e.title, color: ink, outline: undefined, shadow: undefined };
  T(e, sel.tip[0], q.x + q.w / 2 - W(e, sel.tip[0], to) / 2, q.y + G.pad * 0.4, LH(e, e.title), to);
  drawRich(e, body, { x: q.x + G.pad, y: q.y + G.pad * 0.4 + LH(e, e.title), w: q.w - G.pad * 2, h: G.lines * LH(e, e.small) }, { o: { ...e.small, color: ink, outline: undefined, shadow: undefined }, align: 'center', lh: 1.45, maxLines: 3 });
  drawField(e, 'categoryChip', { x: a.x, y: q.y + q.h + G.pad * 0.8, w: a.w, h: G.chip }, { text: cat, color: lineColor(e, 0) ?? e.accent });
}

/** 选中面板各条的数值标注（M12a-13：elx.valueLabel，默认不标；比例按百分制写） */
const selValue = (e: ElCtx, v: number) => { const kind = valueKind(e); return { text: valueText(e, v, 100, kind), pos: e.valueLabelPos, kind }; };

/** 选中面板的插画槽占多少（M12a-36）：header = 头图占整块面板的 28%（原内容高 × 0.28 / 0.72），window = 一条 46 高的图窗 */
const selArtK = 0.28 / 0.72;
const SEL_WINDOW = 46;
function selArtExtra(e: ElCtx, h0: number): number {
  const art = e.forms[0] === 'panel' ? cmp(e, 'cmp.panelArt', 'none') : 'none';
  return art === 'header' ? h0 * selArtK : art === 'window' ? S(e, SEL_WINDOW) : 0;
}

/* ---------------- 选中面板的版式库（M12b-15） ---------------- */
/**
 * el.selection.form 的新版式：贴边全高侧栏 sidePanel（civ6#14）、城市面板 cityPanel（civ6#15）、实体信息 entityInfo（factorio#19）、建筑面板 buildingPanel（frostpunk#15）、
 * 任务卡 dossier（xcom2#14）、命中计算 shotCalc（xcom2#0 / #2）、无底说明 bareText（slay-the-spire#32）、卡叠 cardStack（cyberpunk-2077#7）。
 * 每块的内容都经 B8 的详情字段组合器拼（fields.ts 的 SECTIONS 挂钩 → screen.ts 的 drawSections）：版式只管外框、头图 / 圆徽 / 铭牌这类骨架，
 * 字段（名字、属性表、状态行、配方、队伍、代号……）按版式的预设；按目标写的 cmp.detailFields@el.selection 换掉预设（全局写的只给模板详情，不进这里）。
 * 样本：内容包 hud.selSheet（content/types.ts 的 SelSheet），不写的按 hud.selection 与地名拼（sheetOf）。Godot：每个版式一个预制场景，同一份 Selection 数据驱动
 */
export const SHEET_FORMS = new Set(['sidePanel', 'cityPanel', 'entityInfo', 'buildingPanel', 'dossier', 'shotCalc', 'bareText', 'cardStack']);
/** 各版式的默认字段（drawSections 的字段名）：sidePanel 的标题条、cityPanel 的圆徽、shotCalc 的铭牌与两端大数字是版式骨架，不算字段 */
export const SHEET_FIELDS: Record<string, string[]> = {
  sidePanel: ['iconTabs', 'statTable'], cityPanel: ['bigNumbers'], entityInfo: ['statusRow', 'recipeLine', 'stats'], buildingPanel: ['name', 'statusRow', 'memberList', 'buttons'],
  dossier: ['codeLine', 'objectiveLine', 'longText', 'footerStrip'], shotCalc: ['statTable'], bareText: ['name', 'valueLine', 'desc'], cardStack: ['type', 'name', 'statTable'],
};
/** 样本（HudData.selSheet，不写的项按 hud.selection / 地名 / 任务给默认值；字都在字表里） */
function sheetOf() {
  const s = DATA.selSheet ?? {}, sel = DATA.selection, p = pack(), place = p.world.places?.[0]?.[0] ?? sel.name;
  return {
    city: { name: s.city?.name ?? place, pop: s.city?.pop ?? '12', growth: s.city?.growth ?? 0.45, growthText: s.city?.growthText ?? '回合至增长 4',
      rows: s.city?.rows ?? ([['人口', '12'], ['食物', '+6'], ['生产', '+9'], ['金币', '+12'], ['科技', '+5'], ['文化', '+3'], ['住房', '8/10'], ['防御', '150'], ['生命', '200']] as [string, string][]) },
    entity: { status: s.entity?.status ?? '运行中', ok: s.entity?.ok ?? true, recipe: s.entity?.recipe ?? ([sel.initial, sel.name] as [string, string]) },
    building: { status: s.building?.status ?? '运行中', ok: s.building?.ok ?? true, members: s.building?.members ?? DATA.party.slice(0, 4).map(([n], i): [string, string] => [n, i ? '待命' : '出发']) },
    mission: { priority: s.mission?.priority ?? '重要', code: s.mission?.code ?? place, objective: s.mission?.objective ?? DATA.objectiveTitle, text: s.mission?.text ?? p.screens.notice, footer: s.mission?.footer ?? 'REF 0427 // FILE 12' },
    shot: { skill: s.shot?.skill ?? '标准射击', hit: s.shot?.hit ?? ([['瞄准', '65'], ['距离', '+10'], ['高处', '+20']] as [string, string][]), crit: s.shot?.crit ?? ([['侧击', '+40'], ['武器', '+10']] as [string, string][]),
      hitPct: s.shot?.hitPct ?? 85, critPct: s.shot?.critPct ?? 40, dmg: s.shot?.dmg ?? '4 - 6', skills: s.shot?.skills ?? ['⚔', '⌖', '✚', '⛨'] },
    bare: { line: s.bare?.line ?? ([[sel.bars[0]?.[0] ?? '生命', '80/80'], [sel.bars[1]?.[0] ?? '金币', '99']] as [string, string][]) },
  };
}
/** 这一版式的字段：按目标写的 cmp.detailFields@el.selection（旧皮肤要皮肤之后的层）→ 版式预设 */
function sheetFields(e: ElCtx, f: string): string[] {
  const k = chosenKey(e, 'cmp.detailFields');
  // 建筑面板 / 档案卡自带头图 / 情报图窗：字段里的 art 不再另占一块（B9 审查修复 ㉔：原来空留一块插画高、把面板撑到 0.8 屏高）
  if (k && k.includes('@')) { const l = e.r.list(k).filter((x) => x && x !== 'auto' && x !== 'none' && !(x === 'art' && (f === 'buildingPanel' || f === 'dossier'))); if (l.length) return l; }
  return SHEET_FIELDS[f] ?? ['name', 'desc'];
}
/** 选中物的字段数据（SectionSeed）：名字 / 说明 / 属性 = hud.selection，按版式换上城市行、状态、队伍、任务、命中明细…… */
function sheetSeed(e: ElCtx, f: string): SectionSeed {
  const sel = selOf(e), sh = sheetOf(), tabs = pack().screens.tabs, ic = pack().screens.tabIcons ?? [];
  const base: SectionSeed = { name: sel.name, desc: sel.tip[1] ?? sel.job, glyph: sel.initial, type: sel.job, stats: sel.bars, table: sel.stats.map(([l, v]): [string, string] => [l, String(Math.round(v * 100))]), buttons: [] };
  switch (f) {
    case 'sidePanel': return { ...base, name: sh.city.name, table: sh.city.rows, iconTabs: tabs.slice(0, 4).map((t, i): [string, string] => [ic[i] ?? [...t][0] ?? '◆', t]) };
    case 'cityPanel': return { ...base, name: sh.city.name, numbers: sh.city.rows.filter(([l]) => l !== '人口').slice(0, 3), xp: [sh.city.growth, sh.city.growthText] };
    case 'entityInfo': return { ...base, status: [sh.entity.status, sh.entity.ok], recipe: sh.entity.recipe };
    case 'buildingPanel': return { ...base, status: [sh.building.status, sh.building.ok], members: sh.building.members, buttons: ['新建'] };
    case 'dossier': return { ...base, name: sh.mission.code, code: sh.mission.code, objective: sh.mission.objective, long: sh.mission.text, footer: sh.mission.footer };
    case 'bareText': return { ...base, line: sh.bare.line, desc: sel.job };
    default: return base;
  }
}
const secDraw = (e: ElCtx, a: Rect, fields: string[], seed: SectionSeed, ink?: string) => { if (a.w > 1 && a.h > 1) SECTIONS.draw?.(e, a, fields, seed, ink); };
const secH = (e: ElCtx, w: number, fields: string[], seed: SectionSeed) => SECTIONS.height?.(e, w, fields, seed) ?? 0;
/** 贴边侧栏贴哪一边（el.selection.edge：left / right，元素参数，选过才算；没选 left） */
export const sideEdge = (e: { r: ElCtx['r'] }, id = 'el.selection') => (String(e.r.el(id, 'edge') ?? 'left') === 'right' ? 'right' : 'left');
/** 实体信息的小图（el.selection.portrait：render 渲染图 / avatar 圆头像 / none；没选 render） */
const sheetPortrait = (e: ElCtx) => { const v = String(elOf(e, 'portrait') ?? 'auto'); return v === 'avatar' || v === 'none' ? v : 'render'; };
/** 卡叠的张数与排法（el.selection.count，没给时 3 张；elx.instanceLayout 没给时错位叠放、只露标题行） */
function stackLayout(e: ElCtx, one: { w: number; h: number }) {
  const n = ownCount(e, 3, 6);
  if (n <= 1) return null;
  const mode = memberMode(e, 'instanceLayout', 'stack');
  return memberRects(e, n, one, mode === 'stack' ? 'v' : 'h', S(e, 10), 0, { mode });
}
/**
 * 建筑面板的几何（sheetSize / flexH 共用）：w 宽、hh 头图最高（0.42 × 宽）、need 字段要的高；cap = 不长高时的高——最高 0.6 屏高（审查修复 ㉔：原来 0.8，贴边的队伍栏 / 资源栏被压住；
 * 放不下时先缩头图、再截字段）。R4 · C3（frostpunk#49）：按目标写了字段（cmp.detailFields@el.selection）时不截写了的字段——头图缩到最小（内框的 25%）仍放不下就长高到刚好放下，
 * 最高 0.8 屏高（原来队伍列表被静默省掉，面板下半截只剩角饰）；没写字段（版式预设）照旧 cap。
 * R4 审查修复 ⑨：长高时面板饰件（ast.ornamentAnchor 含 panelCorners 时的卷须角花）让位也算进去——队伍列表那一截左右按饰带内缩（sheetSplit）、底边让出饰带 / 底角角块伸进内框的高（buildingOrn；原来第 3、4 行队员压在底角卷须上）；
 * R4 审查修复 ②⑪：长高后的高由 hud.ts 按这一列上下两排元素之间的空当收回（ElementDef.flexH = cap）——a11y.textScale 1.3 时原来长到 419 高，压住时钟、警报栏与工具条
 */
function buildingGeom(e: ElCtx): { w: number; h: number; cap: number } {
  const pad = S(e, 12), gap = S(e, 8), seed = sheetSeed(e, 'buildingPanel'), fl = sheetFields(e, 'buildingPanel');
  const w = S(e, 280), hh = w * 0.42, need0 = secH(e, w - pad * 2, fl, seed), cap = Math.min(pad * 2 + hh + gap + need0, e.R.h * 0.6);
  if (!ownFields(e)) return { w, h: cap, cap };
  const fitOf = (need: number, res: number) => Math.min(e.R.h * 0.8, pad * 2 + Math.min((need + gap + res) / 0.75, need + gap + res + hh));
  // 饰件让位按长高后的大小量（面板比宽高时饰件尺寸按宽定，量一次就够）；队伍列表那一截左右让出饰带时按窄的宽重量（sheetSplit）
  const O = buildingOrn(e, { x: 0, y: 0, w, h: Math.max(cap, fitOf(need0, 0)) }), need = sheetSplit(e, w - pad * 2, O.side, fl, seed)?.need ?? need0;
  return { w, h: Math.min(pad * 2 + hh + gap + need + O.bot, Math.max(e.R.h * 0.6, fitOf(need, O.bot))), cap };
}
/**
 * 建筑面板的字段分两截画（R4 审查修复 ⑨）：从队伍列表（memberList，整行的列表：头像在最左、状态字在最右）起的那一截左右按饰带内缩 side，
 * 上面的名字 / 状态 / 数量照原来的宽（步进器这类定宽的行变窄会伸出去）。没有队伍列表或 side = 0 时 null（照原来一整块）；队伍列表是第一个字段时整块内缩（head 为空）
 */
function sheetSplit(e: ElCtx, w: number, side: number, fl: string[], seed: SectionSeed): { head: string[]; tail: string[]; hH: number; gapF: number; need: number } | null {
  const k = side > 0 ? fl.indexOf('memberList') : -1;
  if (k < 0) return null;
  const head = fl.slice(0, k), tail = fl.slice(k), hT = secH(e, w - side * 2, tail, seed);
  if (!head.length) return { head, tail, hH: 0, gapF: 0, need: hT };
  // 两截之间的字段间距：前 k + 1 个字段的总高 − 前 k 个 − 第 k 个
  const hH = secH(e, w, head, seed), gapF = Math.max(0, secH(e, w, fl.slice(0, k + 1), seed) - hH - secH(e, w, [fl[k]], seed));
  return { head, tail, hH, gapF, need: hH + gapF + hT };
}
/** 按目标写了字段（cmp.detailFields@el.selection，旧皮肤要皮肤之后的层——chosenKey）：建筑面板按它长高 */
const ownFields = (e: ElCtx) => !!chosenKey(e, 'cmp.detailFields')?.includes('@');
/**
 * 建筑面板的饰件让位（R4 审查修复 ⑨，只在按目标写了字段时用）：面板样式画在 r 上的饰件占位（ornamentInsets，与 drawOrnaments 同一套几何，模板容器的内框也按它内缩）——
 * side = 左右的饰带（卷须角花沿边伸的竖臂）比内边距多伸进来的；bot = 底边的饰带 / 底角的角块比内边距多伸进来的。没有饰件时都是 0
 */
function buildingOrn(e: ElCtx, r: Rect): { side: number; bot: number } {
  const pe = e.scope.length > 1 ? e : e.part('panel'), pad = S(e, 12), o = ornamentInsets(pe.t.panel, r, { where: ORN.where, frame: ORN.frame });
  const corner = Math.max(0, ...o.corners.filter((q) => q.y + q.h / 2 > r.y + r.h / 2).map((q) => r.y + r.h - q.y));
  return { side: Math.max(0, Math.max(o.l, o.r) - pad), bot: Math.max(0, Math.max(o.b, corner) - pad) };
}
/** 版式的尺寸（size 与 draw 同一套量法） */
function sheetSize(e: ElCtx, f: string): { w: number; h: number } {
  const pad = S(e, 12), seed = sheetSeed(e, f), fl = sheetFields(e, f), th = Math.max(S(e, 30), LH(e, e.title, 1.5));
  switch (f) {
    // 按目标写了字段时（ownFields）字段要的高超过 0.86 屏高就长高，最高 0.95 屏高（§8 字号下限 / 标题层级让行高多了几单位，原来最后一项刚好放下的被截掉，轨道 E）
    case 'sidePanel': { const w = Math.max(S(e, 260), Math.min(S(e, 360), e.R.w * 0.28)), h0 = Math.max(S(e, 240), e.R.h * 0.86); if (!ownFields(e)) return { w, h: h0 }; const bh = Math.max(S(e, 34), LH(e, e.title, 1.6)); return { w, h: Math.min(e.R.h * 0.95, Math.max(h0, bh + S(e, 10) + secH(e, w - pad * 2, fl, seed) + pad + S(e, 2))) }; }
    case 'cityPanel': return { w: S(e, 320), h: S(e, 20) + Math.max(S(e, 96), secH(e, S(e, 180), fl, seed)) + Math.max(S(e, 22), LH(e, e.small, 1.6)) + pad * 2 };
    case 'entityInfo': { const w = fitW(e, S(e, 250), [[seed.name ?? '', e.title]], S(e, 110)); return { w, h: pad * 2 + th * 1.3 + S(e, 6) + secH(e, w - pad * 2, fl, seed) }; }
    // 建筑面板：见 buildingGeom（最高 0.6 屏高；按目标写了字段时长高到放下、连底角角饰让出的高，hud.ts 再按这一列的空当收回）
    case 'buildingPanel': { const G = buildingGeom(e); return { w: G.w, h: G.h }; }
    case 'dossier': { const w = S(e, 300); return { w, h: Math.min(e.R.h * 0.8, pad * 2 + th + w * 0.36 + S(e, 10) + secH(e, w - pad * 2, fl, seed)) }; }
    // 底边技能格一半探出面板：探出的那一半算进元素的高（审查修复 ㉒：原来不算，下面的技能栏排上来压住它）
    case 'shotCalc': return { w: Math.min(e.R.w * 0.66, S(e, 640)), h: S(e, 156) + shotSlot(e) / 2 };
    case 'bareText': { const w = Math.max(S(e, 220), Math.min(S(e, 340), fitW(e, S(e, 220), [[seed.desc ?? '', e.small]], S(e, 8)))); return { w, h: secH(e, w, fl, seed) }; }
    case 'cardStack': { const one = { w: S(e, 230), h: S(e, 140) }, L = stackLayout(e, one); return L ? L.bbox : one; }
    default: return { w: S(e, 300), h: S(e, 160) };
  }
}
/** 无底说明块的内容框（ElementDef.contentBox，B4 审查修复 ㉔ 的顺延：元素两端的卷须挂在字实际画到的地方，不是元素报的矩形） */
function sheetContent(e: ElCtx, a: Rect): Rect {
  if (e.forms[0] !== 'bareText') return a;
  const seed = sheetSeed(e, 'bareText'), w = Math.max(W(e, seed.name ?? '', e.title), W(e, seed.desc ?? '', e.small)) + S(e, 4);
  return { x: a.x, y: a.y, w: Math.min(a.w, w), h: a.h };
}
/** 画一个版式 */
function drawSheet(e: ElCtx, a: Rect, f: string) {
  const g = e.g, pad = S(e, 12), seed = sheetSeed(e, f), fl = sheetFields(e, f), sh = sheetOf();
  const inner = { x: a.x + pad, y: a.y + pad, w: a.w - pad * 2, h: a.h - pad * 2 };
  switch (f) {
    case 'sidePanel': {
      // 贴边全高侧栏：标题条（cmp.plate@titleBar，没选时整宽 band）+ 右端红圆关闭钮 + 托槽图标页签 + 密集「标签 … 数值」行
      panel(e, a, false, {}, 'panel');
      const bh = Math.max(S(e, 34), LH(e, e.title, 1.6)), bar = { x: a.x, y: a.y, w: a.w, h: bh }, cs = bh * 0.62;
      plate(e, { ...bar, w: bar.w - cs - S(e, 10) }, seed.name ?? '', platePick(e, 'titleBar', 'band'), {}, 'titleBar', { align: 'left' });
      const cx = a.x + a.w - cs / 2 - S(e, 6), cy = a.y + bh / 2;
      g.fillStyle = e.bad; g.beginPath(); g.arc(cx, cy, cs / 2, 0, Math.PI * 2); g.fill();
      icon(e, '✕', cx, cy, cs * 0.5, '#fff'); logTarget(g, { x: cx - cs / 2, y: cy - cs / 2, w: cs, h: cs }, '关闭');
      secDraw(e, { x: inner.x, y: a.y + bh + S(e, 10), w: inner.w, h: a.y + a.h - pad - (a.y + bh + S(e, 10)) }, fl, seed);
      return;
    }
    case 'cityPanel': {
      // 城市面板：上沿阵营色名牌（cmp.plate@name，没选时页签）、左边大圆徽（外形 vis.silhouette@avatar / @el.selection，没选时圆）+ 好色增长进度环 + 人口大数字、右边大号数字栏、底部增长条
      panel(e, a, false, {}, 'panel');
      const nh = S(e, 22), name = seed.name ?? '';
      plate(e, cityPlate(e, a), name, platePick(e, 'name', 'tab'), { size: e.small.size }, 'name');
      const bot = Math.max(S(e, 22), LH(e, e.small, 1.6)), body = { x: inner.x, y: a.y + nh / 2 + S(e, 8), w: inner.w, h: a.h - nh / 2 - S(e, 8) - pad - bot - S(e, 6) };
      const d = Math.max(S(e, 40), Math.min(body.h, S(e, 96))), sq = { x: body.x, y: body.y + (body.h - d) / 2, w: d, h: d };
      const sil = scopedSilhouette(e, 'avatar'), lc = lineColor(e, 0) ?? e.accent;
      drawBox(g, sq, { bg: { solid: mix(resolveColor(e.th.surface, e.pal), '#000', 0.35) }, border: { width: Math.max(1.5, S(e, 2)), color: lc }, ...(sil && sil !== 'circle' ? { shape: sil } : { circle: true }) } as never, e.pal);
      gauge(e, { x: sq.x + S(e, 6), y: sq.y + S(e, 6), w: d - S(e, 12), h: d - S(e, 12) }, sh.city.growth, 'ring', e.good);
      const po = { ...e.title, size: e.title.size * 1.5, weight: 900, color: e.text }, pw = numberWidth(e, sh.city.pop, po);
      drawNumber(e, sh.city.pop, sq.x + d / 2 - pw / 2, sq.y + d / 2 - LH(e, po, 1) / 2, LH(e, po, 1), po);
      secDraw(e, { x: sq.x + d + S(e, 16), y: body.y, w: body.x + body.w - (sq.x + d + S(e, 16)), h: body.h }, fl, seed);
      secDraw(e, { x: inner.x, y: a.y + a.h - pad - bot, w: inner.w, h: bot }, ['xpBar'], seed);
      return;
    }
    case 'entityInfo': {
      // 悬停实体信息（不写动作字：动作归 el.interact 的按键提示）：标题行 + 右上小渲染图（el.selection.portrait）+ 状态点行 + 配方行 + 两条数值
      panel(e.part('tooltip'), a, true, {}, 'tooltip');
      const th = Math.max(S(e, 30), LH(e, e.title, 1.5)), pm = sheetPortrait(e), ps = th * 1.3;
      T(e, seed.name ?? '', inner.x + titlePrefix(e, inner.x, inner.y, th, e.title), inner.y, th, e.title);
      if (pm === 'avatar') avatar(e, inner.x + inner.w - ps / 2, inner.y + ps / 2, ps * 0.45, seed.glyph ?? '');
      else if (pm === 'render') artSlot(e, { x: inner.x + inner.w - ps * 1.2, y: inner.y, w: ps * 1.2, h: ps }, 'scene', '小图');
      const y0 = inner.y + (pm === 'none' ? th : ps) + S(e, 6);
      secDraw(e, { x: inner.x, y: y0, w: inner.w, h: inner.y + inner.h - y0 }, fl, seed);
      return;
    }
    case 'buildingPanel': {
      // 建筑面板（近通高）：头图（插画槽）+ 名字 + 运行状态 + 队伍列表 + 新建钮
      panel(e, a, false, {}, 'panel');
      // 头图先让：字段量出来要多高、剩下的给头图（最多 0.42 × 宽、至少内框的 25%）
      // R4 审查修复 ⑨：按目标写了字段时字段区让开面板的饰件（buildingOrn）——队伍列表那一截左右按饰带内缩（卷须角花的竖臂不再压在队员头像 / 状态字上，sheetSplit），
      // 底边让出饰带 / 底角角块伸进来的高，但只让富余的部分（头图缩到最小以后还剩的），写了的字段照旧不省；没写字段时都是 0（原来的画法）
      const O = ownFields(e) ? buildingOrn(e, a) : { side: 0, bot: 0 }, sp = sheetSplit(e, inner.w, O.side, fl, seed);
      const need = sp ? sp.need : secH(e, inner.w, fl, seed), hMin = Math.min(inner.h * 0.25, a.w * 0.42);
      const res = Math.max(0, Math.min(O.bot, inner.h - hMin - S(e, 8) - need));
      const hh = Math.max(hMin, Math.min(a.w * 0.42, inner.h * 0.4, inner.h - S(e, 8) - need - res));
      artSlot(e, { x: inner.x, y: inner.y, w: inner.w, h: hh }, 'scene', '头图', { decor: true });
      const y0 = inner.y + hh + S(e, 8), fh = inner.h - hh - S(e, 8) - res;
      if (!sp) { secDraw(e, { x: inner.x, y: y0, w: inner.w, h: fh }, fl, seed); return; }
      if (sp.head.length) secDraw(e, { x: inner.x, y: y0, w: inner.w, h: Math.min(sp.hH, fh) }, sp.head, seed);
      // 下面那一截连第一个字段（队伍列表）都放不下时整截不画（与一整块排时从后往前省字段同口径：原来这时队伍列表被省掉，不会画出面板）
      const y1 = y0 + (sp.head.length ? sp.hH + sp.gapF : 0), tw = inner.w - O.side * 2, th = y0 + fh - y1;
      if (th >= secH(e, tw, [sp.tail[0]], seed) - 0.5) secDraw(e, { x: inner.x + O.side, y: y1, w: tw, h: th }, sp.tail, seed);
      return;
    }
    case 'dossier': {
      // 任务卡：标题（目标名）+ 右侧重要度小字、横向情报图窗、「> 行动代号」、目标行、段落、底部文字饰条
      panel(e, a, false, {}, 'panel');
      const th = Math.max(S(e, 30), LH(e, e.title, 1.5)), po = { ...e.small, weight: 700, upper: true, color: e.accent }, pw = W(e, sh.mission.priority, po);
      T(e, sh.mission.objective, inner.x + titlePrefix(e, inner.x, inner.y, th, e.title), inner.y, th, { ...e.title });
      T(e, sh.mission.priority, inner.x + inner.w - pw, inner.y, th, po);
      const wh = inner.w * 0.36;
      artSlot(e, { x: inner.x, y: inner.y + th, w: inner.w, h: wh }, 'scene', '情报', { decor: true });
      secDraw(e, { x: inner.x, y: inner.y + th + wh + S(e, 10), w: inner.w, h: inner.h - th - wh - S(e, 10) }, fl, seed);
      return;
    }
    case 'shotCalc': shotCalc(e, a, seed, fl); return;
    case 'bareText': {
      // 无底说明块（写在插画上）：不画面板，字带可读辅助（typ.legibility 没给时一层软投影）
      const sh0 = { color: 'rgba(0,0,0,0.85)', x: 0, y: S(e, 1.5), blur: S(e, 4) }, add = (o: TextOpts): TextOpts => (o.outline || o.shadow ? o : { ...o, shadow: sh0 });
      secDraw({ ...e, base: add(e.base), small: add(e.small), title: add(e.title), name: add(e.name) }, a, fl, seed);
      return;
    }
    case 'cardStack': {
      // 卡叠（Cyberpunk 左中的三张银行卡）：几张错位叠放，后面的只露标题行；每张是卡部件的面板 + 字段（类别小字、名字、数值表）
      const one = { w: S(e, 230), h: S(e, 140) }, L = stackLayout(e, one);
      const card = (q: Rect, i: number) => {
        const c = e.part('card'), sl = selAt(e, i);
        panel(c, q, false, {}, 'card');
        secDraw(c, { x: q.x + pad, y: q.y + pad * 0.7, w: q.w - pad * 2, h: q.h - pad * 1.4 }, fl, { ...seed, name: sl.name, type: sl.job });
      };
      if (!L) { card(a, 0); return; }
      for (const i of L.order) { const q = L.rects[i]; card({ x: a.x + q.x, y: a.y + q.y, w: q.w, h: q.h }, i); }
      return;
    }
  }
}
/**
 * 命中计算（xcom2#0 / #2）：正中技能铭牌（cmp.plate@title，没选时两侧斜纹 stripedFlank）、左右镜像两张加成明细（左命中、右暴击，drawSections 的 statTable）、
 * 两端大号百分比、正中好色伤害区间、底边一排技能格（一半压出面板下沿）
 */
function shotCalc(e: ElCtx, a0: Rect, seed: SectionSeed, fl: string[]) {
  // 面板 = 元素矩形去掉底下探出的半格（技能格一半压在面板下沿上、一半在元素矩形里）
  const sh = sheetOf().shot, pad = S(e, 12), a = { ...a0, h: a0.h - shotSlot(e) / 2 };
  panel(e, a, false, {}, 'panel');
  const bh = Math.max(S(e, 26), LH(e, e.title, 1.4));
  plate(e, { x: a.x + pad, y: a.y + pad * 0.6, w: a.w - pad * 2, h: bh }, sh.skill, platePick(e, 'title', 'stripedFlank'), {}, 'title', { align: 'center' });
  const big = { ...e.title, size: e.title.size * 2.2, weight: 900, color: e.text }, bl = LH(e, big, 1.05), y0 = a.y + pad * 0.6 + bh + S(e, 8), slotS = shotSlot(e);
  const bodyH = Math.max(S(e, 20), a.y + a.h - slotS / 2 - S(e, 6) - y0), mid = a.x + a.w / 2;
  const lo = { ...e.small, weight: 700, upper: true, color: mutedOf(e, 0.7) };
  const hp = `${sh.hitPct}%`, cp = `${sh.critPct}%`, hw = numberWidth(e, hp, big), cw0 = numberWidth(e, cp, big);
  drawNumber(e, hp, a.x + pad, y0, bl, big); T(e, '命中', a.x + pad, y0 + bl, LH(e, lo), lo);
  drawNumber(e, cp, a.x + a.w - pad - cw0, y0, bl, big); T(e, '暴击', a.x + a.w - pad - W(e, '暴击', lo), y0 + bl, LH(e, lo), lo);
  const dm = { ...e.title, size: e.title.size * 1.6, weight: 900, color: e.good }, dw = numberWidth(e, sh.dmg, dm), dl = { ...e.small, color: mutedOf(e, 0.7) };
  // 两张明细排在大数字与正中的伤害区间之间（镜像）
  const half = Math.max(dw, W(e, '伤害', dl)) / 2 + S(e, 14);
  const tl = { x: a.x + pad + hw + S(e, 14), y: y0, w: mid - half - (a.x + pad + hw + S(e, 14)), h: bodyH }, tr = { x: mid + half, y: y0, w: a.x + a.w - pad - cw0 - S(e, 14) - (mid + half), h: bodyH };
  secDraw(e, tl, fl, { ...seed, table: sh.hit });
  secDraw(e, tr, fl, { ...seed, table: sh.crit });
  drawNumber(e, sh.dmg, mid - dw / 2, y0 + S(e, 2), LH(e, dm, 1.1), dm);
  T(e, '伤害', mid - W(e, '伤害', dl) / 2, y0 + S(e, 2) + LH(e, dm, 1.1), LH(e, dl), dl);
  // 底边的技能格：一排压在面板下沿上（一半探出），第一格是当前技能（选中态）
  const n = sh.skills.length, gw = n * slotS + (n - 1) * S(e, 6), sy = a.y + a.h - slotS / 2;
  sh.skills.forEach((s, i) => slot(e, { x: mid - gw / 2 + i * (slotS + S(e, 6)), y: sy, w: slotS, h: slotS }, s, i === 0 ? { selected: true } : {}));
}

/** 命中计算底边技能格的边长 */
const shotSlot = (e: ElCtx) => Math.max(S(e, 30), tap(e) * 0.8);
/** 城市面板骑在上沿的名牌（一半在面板上沿以外） */
function cityPlate(e: ElCtx, a: Rect): Rect {
  const nh = S(e, 22), nw = W(e, sheetSeed(e, 'cityPanel').name ?? '', e.small) + S(e, 28);
  return { x: a.x + S(e, 12), y: a.y - nh / 2, w: nw, h: nh };
}

/* 队伍 / 玩家条 */
/** 队伍人数（el.party.count，M12b-04 / 18，hi-fi-rush#22）：只认元素级键，没给 = 内容包的人数；多于样本时循环取（第二轮名字加编号） */
const partyN = (e: ElCtx) => ownCount(e, DATA.party.length, 8);
const partyRows = (e: ElCtx) => sampleItems(DATA.party, partyN(e), 0);
/** 演示用的名册字段（HudData.partyInfo 没写的成员按序号取） */
const DEMO_LV = [24, 21, 19, 17], DEMO_HPMAX = [1200, 980, 860, 1040], DEMO_SP = [0.62, 0.85, 0.3, 0.7], DEMO_SPMAX = [160, 220, 140, 180], DEMO_BP = [2, 1, 3, 0], DEMO_KILLS = [5, 3, 2, 0];
/** 第 i 个成员的名册字段（M12b-18）：内容包 hud.partyInfo[i] 写了的照用，其余按序号的演示值；hp 的当前值跟样本血量走 */
function memberInfo(i: number, hp: number): Required<Pick<PartyInfo, 'level' | 'hp' | 'sp' | 'bp' | 'rank' | 'kills'>> & PartyInfo {
  const own = DATA.partyInfo?.[i % (DATA.partyInfo?.length || 1)] ?? {}, k = i % 4;
  const hpMax = own.hp?.[1] ?? DEMO_HPMAX[k], spMax = own.sp?.[1] ?? DEMO_SPMAX[k];
  return {
    ...own, level: own.level ?? DEMO_LV[k], hp: own.hp ?? [Math.round(hp * hpMax), hpMax], sp: own.sp ?? [Math.round(DEMO_SP[k] * spMax), spMax],
    bp: own.bp ?? [DEMO_BP[k], 5], rank: own.rank ?? (k % 4) + 1, kills: own.kills ?? DEMO_KILLS[k],
    status: own.status ?? (i === 0 ? '升级' : hp < 0.25 ? '受伤' : ''), timer: own.timer ?? `0${(k % 3) + 1}:${String((k * 17 + 15) % 60).padStart(2, '0')}`,
  };
}
/** 新画法（M12b-18）：只画头像、肖像竖卡、状态带、碎片卡、选角方砖、名册卡、视频通话格 */
const PARTY_NEW = new Set(['avatarRow', 'portraitCard', 'statusStrip', 'shard', 'emblemTiles', 'rosterCard', 'videoGrid']);
/**
 * 队伍成员怎么排（M12b-04 / 18）：方向 = 元素级显式给的 elx.arrangement（row 横排 / column 竖排），没给时按画法（frames / portraits / 状态带竖排，其余横排）；
 * 间距 el.party.gap（px@1080p，可为 0：视频通话墙）、交叠 el.party.overlap（× 格宽的负间距：Persona 的碎片阶梯，碎片卡默认 0.18）、
 * 铺开 el.party.spread（fillWidth = 元素拉宽到约 88% 屏宽、成员均分；perUnit = 每人对准一个世界单位——世界投影的扇出在 M12c-01，现在按 fillWidth 画）、
 * 叠放 / 当前项强调见 memberRects（elx.instanceLayout / activeEmphasis，当前项 = 第一个，视频通话格是中间那块）。
 * custom = 选了这些里的任何一个，或是新画法；旧画法没选时位置照原来的公式算（默认画面逐字不变）
 */
function partyPlan(e: ElCtx) {
  const f = e.forms[0], n = partyN(e), v = partyValue(e);
  // 排列方向只给新画法读（旧画法原来不读 elx.arrangement：layout.colonySim / autobattler 写的 el.party.arrangement = row 照旧不起作用，默认画面不变）
  const arr = PARTY_NEW.has(f) ? e.r.get(ownKey(e, 'arrangement')) ?? (elChosen(e, 'arrangement') ? e.r.get('elx.arrangement') : undefined) : undefined;
  const dir: 'h' | 'v' = arr === 'column' ? 'v' : arr === 'row' ? 'h' : f === 'frames' || f === 'portraits' || f === 'statusStrip' ? 'v' : 'h';
  const gapK = elChosen(e, 'gap') ? Math.max(0, Number(elOf(e, 'gap')) || 0) : NaN, ovK = elChosen(e, 'overlap') ? Math.max(0, Math.min(0.6, Number(elOf(e, 'overlap')) || 0)) : f === 'shard' ? 0.18 : 0;
  const spread = elChosen(e, 'spread') ? String(elOf(e, 'spread') ?? 'anchor') : 'anchor', fillW = spread === 'fillWidth' || spread === 'perUnit';
  const pill = elChosen(e, 'memberPill') && String(elOf(e, 'memberPill') ?? 'none') === 'timer' ? S(e, 18) : 0;
  const custom = PARTY_NEW.has(f) || n !== DATA.party.length || !Number.isNaN(gapK) || ovK > 0 || fillW || !!pill || dir !== (f === 'frames' || f === 'portraits' || f === 'statusStrip' ? 'v' : 'h')
    || memberMode(e, 'instanceLayout', 'row') !== 'row' || memberMode(e, 'activeEmphasis', 'none') !== 'none';
  const rh = Math.max(S(e, 46), LH(e, e.small) + S(e, 22)) + (v.pos === 'below' ? v.h : 0);
  const pts = pointsKind(e);
  // 旧画法没选任何排法参数：不量字、不排格（画的时候用原来的公式，绘制调用序列与原来逐字一样）
  if (!custom) return { f, n, v, dir, custom, rh, L: { rects: [], bbox: { w: 0, h: 0 }, order: [], scale: [], stacked: false } as MemberLayout, active: 0, pill, pts, sb: { w: 0, h: 0, nh: 0, gh: 0, lh: 0 }, tipW: 0, cell: { w: 0, h: 0, gap: 0 } };
  const sb = f === 'statusStrip' ? statusStripMetrics(e, pts) : { w: 0, h: 0, nh: 0, gh: 0, lh: 0 };
  // 每种画法的成员格（不含间距）与默认间距
  const cell: Record<string, [number, number, number]> = {
    frames: [fitW(e, S(e, 190), DATA.party.map(([nm]) => [nm, e.small] as [string, Partial<TextOpts>]), S(e, 60)) + v.w, rh - S(e, 6), S(e, 6)],
    portraits: [S(e, 60) + v.w, S(e, 56) + v.h + pill, 0], portraitRow: [S(e, 70) + v.w, S(e, 80) + v.h + pill, 0], unitCards: [S(e, 80), S(e, 110) + v.h, S(e, 6)], scoreRow: [S(e, 90), S(e, 34), 0],
    avatarRow: [S(e, 40), S(e, 40) + pill, S(e, 6)], portraitCard: [S(e, 64), S(e, 86) + pill, S(e, 8)], statusStrip: [sb.w, sb.h, S(e, 6)], shard: [S(e, 112), S(e, 92), S(e, 4)],
    emblemTiles: [S(e, 74), S(e, 74), S(e, 10)], rosterCard: [S(e, 132), S(e, 108), S(e, 8)], videoGrid: [S(e, 96), S(e, 150), S(e, 4)],
  };
  const [cw0, ch, g0] = cell[f] ?? cell.frames;
  let cw = cw0, gap = Number.isNaN(gapK) ? g0 : px1080(gapK) * e.th.scale;
  if (ovK > 0) gap = -cw * ovK;
  // 铺满宽：成员均分约 88% 屏宽（横排）
  if (fillW && dir === 'h') { const W0 = e.R.w * 0.88; gap = Number.isNaN(gapK) ? g0 : gap; cw = Math.max(cw0, (W0 - gap * (n - 1)) / n); }
  const active = f === 'videoGrid' ? Math.floor((n - 1) / 2) : 0;
  // 一列 / 一行放不下（超过约 85% 屏高 / 95% 屏宽）时折成几列 / 几行（B6 审查修复 ㉔：el.party.count 最多 8 人，高的成员画法原来一直排到画面外）；
  // 折过以后另一个方向也放不下（约 90% 屏宽 / 85% 屏高）时不折——横排的视频墙折成两行反而更高
  const mo = f === 'videoGrid' && !elChosen(e, 'activeEmphasis') ? { emph: 'scale' } : {};
  let L = memberRects(e, n, { w: cw, h: ch }, dir, gap, active, mo);
  const lim = dir === 'v' ? e.R.h * 0.85 : e.R.w * 0.95;
  if ((dir === 'v' ? L.bbox.h : L.bbox.w) > lim + 0.5) {
    const L2 = memberRects(e, n, { w: cw, h: ch }, dir, gap, active, { ...mo, wrap: lim });
    if ((dir === 'v' ? L2.bbox.w : L2.bbox.h) <= (dir === 'v' ? e.R.w * 0.9 : e.R.h * 0.85) + 0.5) L = L2;
  }
  // 选角方砖的说明框（悬停在当前那块旁边）占的宽
  const tipW = f === 'emblemTiles' ? emblemTipW(e) : 0;
  return { f, n, v, dir, custom, rh, L, active, pill, pts, sb, tipW, cell: { w: cw, h: ch, gap } };
}
registerElement({
  id: 'el.party', forms: ['frames', 'portraits', 'portraitRow', 'unitCards', 'scoreRow', 'tag', 'avatarRow', 'portraitCard', 'statusStrip', 'shard', 'emblemTiles', 'rosterCard', 'videoGrid'], anchor: 'ml',
  // 数值标注（elx.valueLabel / valueLabelPos，M12a-13）：各画法的条都能标；条后 / 条上 / 条下的字算进元素框（压条的不占地方）
  size: (e) => {
    const f = e.forms[0];
    if (f === 'tag') return { w: S(e, 10), h: S(e, 10) };
    const P = partyPlan(e), v = P.v;
    if (P.custom) return { w: P.L.bbox.w + P.tipW, h: P.L.bbox.h };
    // 原来的尺寸（人数 = 内容包的 4 人时与原来逐字一样）
    switch (f) {
      case 'portraits': return { w: S(e, 60) + v.w, h: P.n * (S(e, 56) + v.h) };
      case 'portraitRow': return { w: P.n * (S(e, 70) + v.w), h: S(e, 80) + v.h };
      case 'unitCards': return { w: P.n * S(e, 86), h: S(e, 110) + v.h };
      case 'scoreRow': return { w: S(e, 360), h: S(e, 34) };
      default: return { w: fitW(e, S(e, 190), DATA.party.map(([n]) => [n, e.small] as [string, Partial<TextOpts>]), S(e, 60)) + v.w, h: P.n * P.rh };
    }
  },
  // 成员格（停靠用，M12b-05 的 elx.dockSlot：Octopath 的指令窗挂在当前行动者名牌旁）
  slots: (e, at) => { if (e.forms[0] === 'tag') return []; const P = partyPlan(e); return partyRects(e, at, P); },
  // 当前行动者（M12b-63，octopath#13）：内容包 hud.partyActive（0 起），没写时第一个（视频墙是中间那个）
  activeSlot: (e) => { const n = partyN(e); return (DATA.partyActive !== undefined ? Math.max(0, Math.min(n - 1, DATA.partyActive)) : e.forms[0] === 'videoGrid' ? Math.floor((n - 1) / 2) : 0) + 1; },
  draw: (e, a) => {
    const f = e.forms[0];
    // 名牌：挂在世界里的多个单位上（M7：策略 / 建造的单位铭牌）；拉远时按语义缩放只剩图标 / 色块
    const wv = e.noWorld ? null : worldNow();
    if (f === 'tag' && wv) {
      const zoomMode = e.r.str('rel.semanticZoom', 'none');
      const far = wv.refDepth > 26;
      const units = wv.all.filter((q) => q.on).slice(0, 6);
      units.forEach((q, i) => {
        const [n, hp] = DATA.party[i % DATA.party.length];
        const c = hp < 0.25 ? e.bad : i % 3 === 2 ? e.bad : e.good;
        if (far && zoomMode === 'iconize') { e.g.fillStyle = c; e.g.beginPath(); e.g.arc(q.x, q.y - S(e, 12), S(e, 5), 0, Math.PI * 2); e.g.fill(); return; }
        if (far && zoomMode === 'heatmap') { const gr = e.g.createRadialGradient(q.x, q.y, 0, q.x, q.y, S(e, 40)); gr.addColorStop(0, withAlpha(c, 0.45)); gr.addColorStop(1, withAlpha(c, 0)); e.g.fillStyle = gr; e.g.fillRect(q.x - S(e, 40), q.y - S(e, 40), S(e, 80), S(e, 80)); return; }
        const w = W(e, n, e.small) + S(e, 14), y = q.y - S(e, 34);
        panel(e.part('nameplate'), { x: q.x - w / 2, y, w, h: S(e, 18) }, true, { radiusPct: 50 });
        T(e, n, q.x - w / 2 + S(e, 7), y, S(e, 18), e.small);
        gaugeOf(e, { x: q.x - w / 2 + S(e, 4), y: y + S(e, 19), w: w - S(e, 8), h: S(e, 3) }, hp, 0, 'thinBar', { fixed: true, role: c });
      });
      return;
    }
    const P = partyPlan(e), rows = partyRows(e), rects = partyRects(e, a, P);
    // 选角方砖的说明框（emblemTiles）：画在当前那块的右边
    const order = P.custom ? P.L.order : rows.map((_, i) => i);
    for (const i of order) drawMember(e, P, rects[i], rows[i][0], rows[i][1], i);
    // 说明框排在整排方砖的右边、与当前那块顶对齐（size 已经算进它的宽；挨着当前那块画会压住后面的方砖）
    if (f === 'emblemTiles' && rects[P.active]) emblemTip(e, { ...rects[P.active], x: a.x + P.L.bbox.w - rects[P.active].w }, rows[P.active][0], P.active);
  },
});

/** 成员矩形（画面坐标）：custom 时按 memberRects，否则原来各画法的公式 */
function partyRects(e: ElCtx, a: Rect, P: ReturnType<typeof partyPlan>): Rect[] {
  if (P.custom) return P.L.rects.map((q) => ({ x: a.x + q.x, y: a.y + q.y, w: q.w, h: q.h }));
  const v = P.v;
  return Array.from({ length: P.n }, (_, i) => {
    switch (P.f) {
      case 'portraits': return { x: a.x, y: a.y + i * (S(e, 56) + v.h), w: a.w, h: S(e, 56) + v.h };
      case 'portraitRow': return { x: a.x + i * (S(e, 70) + v.w), y: a.y, w: S(e, 70) + v.w, h: a.h };
      case 'unitCards': return { x: a.x + i * S(e, 86), y: a.y, w: S(e, 80), h: a.h };
      case 'scoreRow': return { x: a.x + i * S(e, 90), y: a.y, w: S(e, 90), h: a.h };
      default: return { x: a.x, y: a.y + i * P.rh, w: a.w, h: P.rh - S(e, 6) };
    }
  });
}

/** 队伍条的数值标注（M12a-13）：画哪种、在哪、要多占多少（按最长的"满血"字量） */
function partyValue(e: ElCtx) {
  const kind = valueKind(e), pos = e.valueLabelPos;
  const s = valueSize(e, valueText(e, 1, DATA.hpMax, kind), pos, kind);
  return { kind, pos, w: s.w, h: s.h };
}

/** 状态带的点亮格行（el.party.pointsRow，M12b-18，Octopath 的 BP 宝石）：lightUp / pips / diamondPips，没选不画（auto = none） */
const pointsKind = (e: ElCtx) => { const v = elChosen(e, 'pointsRow') ? String(elOf(e, 'pointsRow') ?? 'none') : 'none'; return v === 'auto' ? 'none' : v; };
/** 状态带的尺寸：名字行 + 点亮格行（选了时）+ HP / SP 两行（小标签 + 大当前 / 小上限 + 细条） */
function statusStripMetrics(e: ElCtx, pts: string) {
  const nh = Math.max(S(e, 20), LH(e, e.title, 1.15)), gh = pts !== 'none' ? S(e, 14) : 0, lh = Math.max(S(e, 24), LH(e, e.big, 0.9) * 0.62 + S(e, 8));
  const w = fitW(e, S(e, 210), DATA.party.map(([n]) => [n, e.title] as [string, Partial<TextOpts>]), S(e, 24));
  return { w, h: S(e, 8) + nh + gh + lh * 2 + S(e, 6), nh, gh, lh };
}

/** 画一个成员（rect = 这个成员的格）：原来的画法照原来的相对位置画，新画法见各分支 */
function drawMember(e: ElCtx, P: ReturnType<typeof partyPlan>, r: Rect, n: string, hp: number, i: number) {
  const v = P.v, names = labelShown(e), g = e.g, c = hp < 0.25 ? e.bad : e.good;
  // 军衔 / 等级章（M12a-31，XCOM 的 V 形章）：cmp.badge 选过（@badge → @el.party → 全局）时队伍卡与条上各画一枚，样本等级按序号 2–5
  const eb = e.part('badge'), rankB = !!chosenKey(eb, 'cmp.badge');
  // 条读 cmp.gauge@el.party（M12a-11，原来写死 bar / thinBar）；颜色 = e.fill(0, 血量色)：col.accent@el.party 时用作用域强调色（Persona 的青色生命条）
  const bar = (q: Rect, hp0: number, def: string, cc: string) => gaugeOf(e, q, hp0, 0, def, { fixed: true, role: cc, value: { text: valueText(e, hp0, DATA.hpMax, v.kind), pos: v.pos, kind: v.kind } });
  const info = memberInfo(i, hp), s = P.custom ? P.L.scale[i] ?? 1 : 1, K = (x: number) => S(e, x) * s;
  const pill = (cx: number, y: number) => { if (!P.pill) return; const t = info.timer!, o = { ...e.small, size: K(11), weight: 700 }, w = numberWidth(e, t, o) + K(12); drawBox(g, { x: cx - w / 2, y, w, h: K(15) }, { bg: { solid: e.accent2 }, radiusPct: 50 }, e.pal); drawNumber(e, t, cx - w / 2 + K(6), y, K(15), onAccent(e, o)); };
  switch (P.f) {
    case 'portraits': { const cy = r.y + S(e, 26); avatar(e, r.x + S(e, 26), cy, S(e, 22), n, c); bar({ x: r.x + S(e, 4), y: cy + S(e, 24) + (v.pos === 'above' ? v.h : 0), w: S(e, 44), h: S(e, 4) }, hp, 'thinBar', c); pill(r.x + S(e, 26), cy + S(e, 30) + v.h); return; }
    case 'portraitRow': { const cx = r.x + S(e, 35); avatar(e, cx, r.y + S(e, 28), S(e, 26), n, c); if (names) T(e, n, cx - W(e, n, e.small) / 2, r.y + S(e, 56), S(e, 18), e.small); bar({ x: cx - S(e, 26), y: r.y + S(e, 74) + (v.pos === 'above' ? v.h : 0), w: S(e, 52), h: S(e, 4) }, hp, 'thinBar', c); pill(cx, r.y + S(e, 80) + v.h); return; }
    case 'unitCards': { panel(e, r, true); avatar(e, r.x + r.w / 2, r.y + S(e, 34), S(e, 24), n, c); if (rankB) badge(e, r.x + S(e, 13), r.y + S(e, 13), S(e, 8), 'crest', String(2 + (i % 4)), { generic: true }); if (names) T(e, n, r.x + r.w / 2 - W(e, n, e.small) / 2, r.y + S(e, 62), S(e, 18), e.small); bar({ x: r.x + S(e, 8), y: r.y + S(e, 88) + (v.pos === 'above' ? v.h : 0), w: r.w - S(e, 16) - v.w, h: S(e, 7) }, hp, 'bar', c); return; }
    case 'scoreRow': T(e, `${n} ${DATA.scores[i % DATA.scores.length]}`, r.x, r.y, r.h, { ...e.base, weight: i ? 400 : 800, color: i ? e.text : e.accent }); return;
    // 名牌（没有场景投影时：玩家与目标头顶各一块，原来的画法）
    case 'tag': { const p = attachPoint(e, i === 0 ? 'player' : 'target'); if (i < 2 && names) { const w = W(e, n, e.small) + S(e, 12); panel(e.part('nameplate'), { x: p.x - w / 2 + (i ? S(e, 50) : -S(e, 60)), y: p.y - S(e, 70), w, h: S(e, 20) }, true, { radiusPct: 50 }); T(e, n, p.x - w / 2 + S(e, 6) + (i ? S(e, 50) : -S(e, 60)), p.y - S(e, 70), S(e, 20), e.small); } return; }
    // 只画小圆头像（M12b-18，civ6#8：领袖排，名字进悬停）：环色 = 类别色（col.coding 含 lineId）否则强调色
    case 'avatarRow': { const rr = Math.min(r.w, r.h - P.pill) / 2 - K(1); avatar(e, r.x + r.w / 2, r.y + rr + K(1), rr, n, lineColor(e, i) ?? (i ? withAlpha(e.text, 0.5) : e.accent)); pill(r.x + r.w / 2, r.y + rr * 2 + K(3)); return; }
    // 肖像竖卡（disco-elysium#11）：方形油画肖像、没有圈 / 名字 / 条；当前那张背后一圈白光环（el.party.halo）
    case 'portraitCard': {
      const pr = { x: r.x, y: r.y, w: r.w, h: r.h - P.pill };
      if (i === P.active && elChosen(e, 'halo') && ownBool(e, 'halo')) { g.save(); const gr = g.createRadialGradient(pr.x + pr.w / 2, pr.y + pr.h * 0.4, pr.w * 0.2, pr.x + pr.w / 2, pr.y + pr.h * 0.4, pr.w * 0.75); gr.addColorStop(0, withAlpha('#ffffff', 0.85)); gr.addColorStop(1, withAlpha('#ffffff', 0)); g.fillStyle = gr; g.fillRect(pr.x - pr.w * 0.3, pr.y - pr.h * 0.2, pr.w * 1.6, pr.h * 1.2); g.restore(); }
      portraitBox(e, pr); pill(r.x + r.w / 2, pr.y + pr.h + K(3)); return;
    }
    // 状态带（octopath#0）：名字行 + 点亮格行（el.party.pointsRow，色 = 第二强调色）+ HP / SP 两行（小标签 + 大当前 / 小上限 + 细条），没有头像；数值写法读 elx.valueLabel = currentMax 之外的也照这个排
    case 'statusStrip': {
      const M = P.sb, x = r.x + K(8), w = r.w - K(16);
      panel(e, r, true);
      T(e, n, x, r.y + K(4), M.nh * s, { ...e.title, size: e.title.size * s, ...displayFor(e, 'nameplate') });
      // 等级（cmp.listRow@el.party 含 level，M12b-13 / B6 顺延的 octopath#16：暂停页队伍行的 Lv）：名字行右侧
      const lk = chosenKey(e, 'cmp.listRow');
      if (lk && e.r.list(lk).includes('level')) { const t = `Lv ${info.level}`, lo = { ...e.small, size: e.small.size * s, weight: 700, color: e.accent2 }; drawNumber(e, t, x + w - numberWidth(e, t, lo), r.y + K(4), M.nh * s, lo); }
      let y = r.y + K(4) + M.nh * s;
      if (P.pts !== 'none') { const [lit, max] = info.bp; gauge(e, { x, y: y + K(2), w: Math.min(w, K(16) * max), h: K(10) }, lit / Math.max(1, max), P.pts, e.fill(1, e.accent2), undefined, { max }); y += M.gh * s; }
      ([['HP', info.hp, 0], ['SP', info.sp, 1]] as [string, [number, number], number][]).forEach(([lab, [cur, max], k]) => {
        const lo = { ...e.small, size: e.small.size * s * 0.9, color: mutedOf(e, 0.7) }, bo = { ...e.big, size: e.big.size * s * 0.62, italic: true }, so = { ...e.small, size: e.small.size * s };
        T(e, lab, x, y, M.lh * s * 0.7, lo);
        const tc = fmtNumber(e, cur), tm = `/${fmtNumber(e, max)}`, mw = numberWidth(e, tm, so), cwd = numberWidth(e, tc, bo);
        drawNumber(e, tm, x + w - mw, y + M.lh * s * 0.18, M.lh * s * 0.6, so);
        drawNumber(e, tc, x + w - mw - K(2) - cwd, y - M.lh * s * 0.08, M.lh * s * 0.78, bo);
        gauge(e, { x, y: y + M.lh * s * 0.78, w, h: Math.max(1.5, K(3)) }, cur / Math.max(1, max), 'thinBar', e.fill(k, k ? e.accent2 : 'health'));
        y += M.lh * s;
      });
      return;
    }
    // 碎片卡（persona5#13）：黑色尖碎片底（vis.silhouette = shard 的不规则外形，种子按成员）+ 白描剪影头像 + HP（第一强调色）/ SP（第二强调色）斜体大数字各配一根同色细斜条，成员交叠略成阶梯
    case 'shard': {
      const q = { ...r, y: r.y + (i % 2) * K(6) };
      drawBox(g, q, { bg: { solid: '#0b0b0d' }, shape: 'shard', seed: 41 + i * 7, border: { width: Math.max(1, K(2)), color: '#ffffff' } }, e.pal);
      outlineHead(g, q.x + q.w * 0.3, q.y + q.h * 0.42, q.h * 0.3, '#ffffff');
      const hpC = e.fill(0, '#3fd8e0'), spC = e.fill(1, '#ff5fa2');
      // 数字只排在这张卡露出来的那一段（B6 审查修复 ⑲：卡与卡交叠 0.18 格宽，原来从卡中间往右写，当前项的数字压到下一张的头像上、其余的被后一张盖掉一位）：
      //   [卡宽 32%，被同一行下一张盖住的地方 − 4] 里右对齐，放不下就缩字；斜条画在同一段下面
      const me = P.L.rects[i], nx = P.L.rects[i + 1];
      const cover = P.dir === 'h' && me && nx && !P.L.stacked && Math.abs(nx.y - me.y) < me.h * 0.5 ? Math.max(0, me.x + me.w - nx.x) : 0;
      const x0 = q.x + q.w * 0.32, x1 = Math.max(x0 + K(12), q.x + q.w - cover - K(4));
      ([[info.hp[0], hpC, 0.36], [info.sp[0], spC, 0.66]] as [number, string, number][]).forEach(([val, col, ty]) => {
        const o0 = { ...e.big, size: K(22), italic: true, weight: 800, color: col, outline: { color: '#000', width: Math.max(1, K(2)) } }, t = fmtNumber(e, val);
        const w0 = numberWidth(e, t, o0), o = w0 > x1 - x0 ? { ...o0, size: o0.size * Math.max(0.5, (x1 - x0) / w0) } : o0, tx = Math.max(x0, x1 - numberWidth(e, t, o));
        drawNumber(e, t, tx, q.y + q.h * ty - K(14), K(26), o);
        g.save(); g.strokeStyle = col; g.lineWidth = Math.max(1.5, K(3)); g.beginPath(); g.moveTo(tx - K(2), q.y + q.h * ty + K(13)); g.lineTo(x1, q.y + q.h * ty + K(7)); g.stroke(); g.restore();
      });
      if (names) T(e, n, q.x + K(6), q.y + q.h - K(18), K(16), { ...e.small, size: K(11), weight: 800, color: '#fff' });
      return;
    }
    // 选角方砖（slay-the-spire#16）：浅青灰倒角方砖 + 线描角色徽记，当前那块金色外发光；未解锁（partyInfo.locked，演示：最后一块）画挂锁
    case 'emblemTiles': {
      const locked = info.locked ?? (i === P.n - 1 && P.n > 2);
      if (i === P.active) { g.save(); g.shadowColor = e.focus; g.shadowBlur = K(14); g.fillStyle = withAlpha(e.focus, 0.35); g.fillRect(r.x - K(2), r.y - K(2), r.w + K(4), r.h + K(4)); g.restore(); }
      drawBox(g, r, { bg: { solid: '#b9c9cc' }, radius: K(4), border: { width: Math.max(1, K(2)), color: i === P.active ? e.focus : '#7d9196' }, shadows: [{ x: 0, y: K(3), blur: 0, color: '#5c6d72' }] }, e.pal);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (locked) { drawPadlock(g, cx, cy, r.h * 0.42, '#4d5a5e', '#b9c9cc'); return; }
      g.save(); g.strokeStyle = '#33403f'; g.lineWidth = Math.max(1.2, K(2)); g.beginPath(); g.arc(cx, cy, r.h * 0.3, 0, Math.PI * 2); g.stroke(); g.restore();
      icon(e, EMBLEMS[i % EMBLEMS.length], cx, cy, r.h * 0.32, '#33403f');
      return;
    }
    // 名册卡（xcom2#30）：V 形军衔章（层数 = partyInfo.rank）+ 名字 + 一两项数值（等级、击杀）+ 状态标签（晋升 / 负伤，st.statusMark = tag 时画成小牌，否则一行彩字）
    case 'rosterCard': {
      panel(e, r, true);
      badge(e, r.x + K(20), r.y + K(22), K(12), 'chevron', '', { tier: info.rank });
      T(e, n, r.x + K(40), r.y + K(10), K(24), { ...e.title, size: K(15), ...displayFor(e, 'nameplate') });
      const lo = { ...e.small, size: K(11), color: mutedOf(e, 0.7) }, no = { ...e.base, size: K(15), weight: 800 };
      T(e, 'LV', r.x + K(12), r.y + K(44), K(18), lo); drawNumber(e, String(info.level), r.x + K(34), r.y + K(42), K(20), no);
      T(e, '击杀', r.x + K(68), r.y + K(44), K(18), lo); drawNumber(e, String(info.kills), r.x + K(68) + W(e, '击杀', lo) + K(4), r.y + K(42), K(20), no);
      if (info.status) {
        const good = info.status === '升级', col = good ? e.good : e.bad, tagMode = pickedStr(e, 'st.statusMark', 'dot') === 'tag';
        if (tagMode) { const tw = W(e, info.status, e.small) + K(12); plate(e, { x: r.x + K(12), y: r.y + r.h - K(30), w: tw, h: K(20) }, info.status, 'pill', { size: K(11), color: col }); }
        else T(e, info.status, r.x + K(12), r.y + r.h - K(28), K(20), { ...e.small, size: K(12), weight: 800, color: col });
      }
      return;
    }
    // 视频通话格（hi-fi-rush#20）：立绘填满 + 底部暗色名条 + 摄像 / 麦克风 / 挂断三枚小图标，卡间距可为 0（el.party.gap）；中间那块放大并加荧光括角
    case 'videoGrid': {
      portraitBox(e, r);
      const sh = K(24), sy = r.y + r.h - sh;
      g.save(); g.fillStyle = 'rgba(8,10,14,0.78)'; g.fillRect(r.x, sy, r.w, sh); g.restore();
      if (names) T(e, n, r.x + K(6), sy, sh, { ...e.small, size: K(11), weight: 700, color: '#fff' });
      callIcons(g, r.x + r.w - K(6), sy + sh / 2, K(5), e.bad);
      if (i === P.active) cornerBrackets(g, r, Math.min(r.w, r.h) * 0.16, e.accent, Math.max(2, K(3)));
      return;
    }
    default: {
      const nh = Math.max(S(e, 46), LH(e, e.small) + S(e, 22)) - S(e, 28), y = r.y;
      panel(e, r, true); avatar(e, r.x + S(e, 20), y + r.h / 2, S(e, 14), n, c);
      if (rankB) badge(e, r.x + S(e, 31), y + r.h / 2 + S(e, 9), S(e, 6), 'crest', String(2 + (i % 4)), { generic: true });
      if (names) T(e, n, r.x + S(e, 40), y + S(e, 2), nh, e.small);
      bar({ x: r.x + S(e, 40), y: y + nh + S(e, 6), w: r.w - S(e, 50) - v.w, h: S(e, 7) }, hp, 'bar', c);
      if (P.pill) pill(r.x + S(e, 20), y + r.h - S(e, 4));
    }
  }
}
/** 选角方砖里的线描徽记（字体子集里有的单字符号） */
const EMBLEMS = ['⚔', '✦', '♥', '◆', '★', '✚'];
/** 选角方砖的说明框宽（深色框：名字 + 职业小字，画在当前那块右边） */
const emblemTipW = (e: ElCtx) => fitW(e, S(e, 120), [[DATA.party[0][0], e.title], [samplesFor('roster')[0]?.[1] ?? '', e.small]], S(e, 22)) + S(e, 10);
function emblemTip(e: ElCtx, r: Rect, n: string, i: number) {
  const role = memberInfo(i, 1).role ?? samplesFor('roster')[i % Math.max(1, samplesFor('roster').length)]?.[1] ?? '';
  const w = emblemTipW(e) - S(e, 10), q = { x: r.x + r.w + S(e, 10), y: r.y, w, h: Math.max(S(e, 52), LH(e, e.title) + LH(e, e.small) + S(e, 10)) };
  drawBox(e.g, q, { bg: { solid: 'rgba(14,18,22,0.92)' }, radius: S(e, 3), border: { width: 1, color: withAlpha('#ffffff', 0.25) } }, e.pal);
  T(e, n, q.x + S(e, 10), q.y + S(e, 4), LH(e, e.title), { ...e.title, color: '#fff' });
  if (role) T(e, role, q.x + S(e, 10), q.y + S(e, 4) + LH(e, e.title), LH(e, e.small), { ...e.small, color: withAlpha('#ffffff', 0.7) });
}
/** 白描剪影头像（碎片卡）：头 + 肩的轮廓线，不填 */
function outlineHead(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.save(); g.strokeStyle = color; g.lineWidth = Math.max(1.2, s * 0.08); g.lineJoin = 'round';
  g.beginPath(); g.ellipse(cx, cy - s * 0.35, s * 0.36, s * 0.44, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx - s * 0.95, cy + s * 0.95); g.quadraticCurveTo(cx - s * 0.8, cy + s * 0.2, cx, cy + s * 0.18); g.quadraticCurveTo(cx + s * 0.8, cy + s * 0.2, cx + s * 0.95, cy + s * 0.95); g.stroke();
  g.restore();
}
/** 视频通话的三枚小图标（从右往左：挂断（红圆）/ 麦克风 / 摄像头），x1 = 最右端 */
function callIcons(g: CanvasRenderingContext2D, x1: number, cy: number, s: number, red: string) {
  g.save();
  g.fillStyle = red; g.beginPath(); g.arc(x1 - s, cy, s, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, s * 0.3); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1 - s * 1.5, cy); g.lineTo(x1 - s * 0.5, cy); g.stroke();
  const mx = x1 - s * 3.4; g.beginPath(); g.roundRect(mx - s * 0.35, cy - s * 0.9, s * 0.7, s * 1.2, s * 0.35); g.stroke(); g.beginPath(); g.moveTo(mx, cy + s * 0.4); g.lineTo(mx, cy + s * 0.9); g.stroke();
  const vx = x1 - s * 6.2; g.strokeRect(vx - s * 0.8, cy - s * 0.55, s * 1.1, s * 1.1); g.beginPath(); g.moveTo(vx + s * 0.3, cy); g.lineTo(vx + s * 0.85, cy - s * 0.45); g.lineTo(vx + s * 0.85, cy + s * 0.45); g.closePath(); g.stroke();
  g.restore();
}
/** 四角括角（视频通话格的焦点、vis.strokeSides = corners 的样子）：len = 每段长 */
export function cornerBrackets(g: CanvasRenderingContext2D, r: Rect, len: number, color: string, lw: number) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'square';
  for (const [x, y, sx, sy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]] as const) { g.beginPath(); g.moveTo(x, y + sy * len); g.lineTo(x, y); g.lineTo(x + sx * len, y); g.stroke(); }
  g.restore();
}

/* 时间 / 天气 / 日历 */
registerElement({
  id: 'el.clock', forms: ['clock', 'sunDial', 'calendar', 'weather', 'dayCounter', 'phaseDial', 'plaque', 'collage', 'dateStrip', 'timelineRuler', 'bigTemp'], anchor: 'tr',
  size: (e) => {
    const f = e.forms[0];
    if (CLOCK_NEW.has(f)) return clockNewSize(e, f);
    if (f === 'calendar') return { w: fitW(e, S(e, 120), [[DATA.calendar[1], e.small], [DATA.calendar[0], { ...e.small, size: S(e, 12) }]], S(e, 24)), h: S(e, 110) };
    if (f === 'sunDial') return { w: S(e, 120), h: S(e, 70) };
    if (f === 'weather') return { w: fitW(e, S(e, 170), [[`${DATA.weather}　${DATA.temp}`, e.base]], S(e, 54)), h: Math.max(S(e, 44), LH(e, e.base, 1.8)) };
    if (f === 'dayCounter') return { w: Math.max(S(e, 170), numberWidth(e, dayText(), { ...e.title, size: S(e, 24) }) + S(e, 4)), h: Math.max(S(e, 44), LH(e, { size: S(e, 24) }, 1.4)) };
    // 时钟：时间 + 天数，按字宽排（M8b）
    return { w: Math.max(S(e, 170), S(e, 34) + numberWidth(e, clockText(), { ...e.title, size: S(e, 20) }) + W(e, dayText(), e.small)), h: Math.max(S(e, 44), LH(e, { size: S(e, 20) }, 1.6)) };
  },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    if (CLOCK_NEW.has(f)) { drawClockNew(e, a, f); return; }
    switch (f) {
      case 'sunDial': {
        const cx = a.x + a.w / 2, cy = a.y + a.h;
        if (QUALITY.on && isHudCanvas(g)) { sunDialSkin(e, a); return; }
        // 底色（M12b-08，dont-starve#6 / cult-of-the-lamb#17）：新皮肤读面板底色 + 面板描边（原来固定 35% 黑，暗世界上看不见）；旧皮肤照旧
        g.fillStyle = e.th.legacy ? withAlpha('#000', 0.35) : panelFace(e); g.beginPath(); g.arc(cx, cy, a.h - 4, Math.PI, 0); g.fill();
        if (!e.th.legacy && e.t.panel.border?.width) { g.strokeStyle = resolveColor(e.t.panel.border.color, e.pal); g.lineWidth = Math.max(1, e.t.panel.border.width); g.stroke(); }
        const t = Math.PI + ((DATA.hour - 6) / 12) * Math.PI;
        g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(cx + Math.cos(t) * (a.h - 14), cy + Math.sin(t) * (a.h - 14), S(e, 8), 0, Math.PI * 2); g.fill();
        return;
      }
      case 'calendar':
        panel(e, a, true, clockShape(e, a));
        plate(e, { x: a.x, y: a.y, w: a.w, h: S(e, 26) }, DATA.calendar[0], 'rect', { size: S(e, 12) });
        drawNumber(e, String(DATA.day), a.x + a.w / 2 - numberWidth(e, String(DATA.day), e.big) / 2, a.y + S(e, 30), S(e, 50), e.big);
        T(e, DATA.calendar[1], a.x + a.w / 2 - W(e, DATA.calendar[1], e.small) / 2, a.y + S(e, 82), S(e, 20), e.small);
        return;
      case 'weather':
        panel(e, a, true, clockShape(e, a, { radiusPct: 50 }));
        // 天气符号与天气字取同一条（M12a-10：包的 weatherIcon，没写时是原来的太阳）
        icon(e, DATA.weatherIcon ?? '☀', a.x + S(e, 22), a.y + a.h / 2, S(e, 20), '#ffd34d');
        T(e, `${DATA.weather}　${DATA.temp}`, a.x + S(e, 42), a.y, a.h, e.base);
        return;
      case 'dayCounter':
        drawNumber(e, dayText(), a.x, a.y, a.h, { ...e.title, size: S(e, 24), outline: { color: 'rgba(0,0,0,0.55)', width: 1.5 } });
        return;
      default: {
        panel(e, a, true, clockShape(e, a));
        const tw = drawNumber(e, clockText(), a.x + S(e, 12), a.y, a.h, { ...e.title, size: S(e, 20) });
        T(e, dayText(), a.x + S(e, 22) + tw, a.y, a.h, e.small);
      }
    }
  },
});

/**
 * 半圆日晷的皮肤画法（整合修复：B2 ⑮ 的「生存昼夜表盘」——原来是一块纯色半圆 + 一颗写死的黄点，浅色皮肤上黄点几乎看不见）。
 * 品质下限开着、画在 HUD 主画布上时：盘面 = 皮肤面板底（不透明度下限 0.75，旧皮肤也用面板，不再是 35% 黑）、外缘 = 面板描边（没有时字色 50%，线宽 ≥ 1.5 单位）；
 * 地平线一条字色细线，6 / 9 / 12 / 15 / 18 点五道刻度，走过的白天那段弧用强调色；太阳 = 高亮色，对盘面至少 3 : 1，外圈一道字色细边；天黑（18 点以后、6 点以前）画月牙压在地平线下沿
 */
function sunDialSkin(e: ElCtx, a: Rect) {
  const g = e.g, cx = a.x + a.w / 2, cy = a.y + a.h - S(e, 2), R = Math.min(a.h - S(e, 4), a.w / 2 - S(e, 2));
  const face = panelFace(e), solidFace = rgba([...parseColor(face).slice(0, 3), 1] as [number, number, number, number]);
  const ink = ensureContrast(resolveColor(e.text, e.pal), solidFace, 4.5), b = e.t.panel.border;
  g.save();
  g.fillStyle = face; g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.closePath(); g.fill();
  logBoxRect(g, { x: cx - R, y: cy - R, w: R * 2, h: R }, face);
  g.strokeStyle = b?.width ? resolveColor(b.color, e.pal) : withAlpha(ink, 0.5); g.lineWidth = Math.max(1.5, b?.width ?? 0); g.stroke();
  // 刻度与走过的白天
  const h = Math.max(6, Math.min(18, DATA.hour)), ang = (hr: number) => Math.PI + ((hr - 6) / 12) * Math.PI, rt = R - S(e, 7);
  g.strokeStyle = withAlpha(resolveColor(e.accent, e.pal), 0.85); g.lineWidth = Math.max(2, S(e, 3)); g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, rt, Math.PI, ang(h)); g.stroke();
  g.strokeStyle = withAlpha(ink, 0.6); g.lineWidth = Math.max(1, S(e, 1.2));
  for (const hr of [6, 9, 12, 15, 18]) { const t = ang(hr), r0 = R - S(e, hr === 12 ? 4 : 3), r1 = R - S(e, hr === 12 ? 12 : 9); g.beginPath(); g.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0); g.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1); g.stroke(); }
  g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
  // 太阳 / 月亮
  const night = DATA.hour < 6 || DATA.hour > 18, t = ang(h), sr = Math.max(S(e, 6), R * 0.13), rs = R - S(e, 16);
  const sx = cx + Math.cos(t) * rs, sy = cy + Math.sin(t) * rs;
  const sun = ensureContrast(resolveColor(night ? mix(resolveColor(e.th.roles.info, e.pal), '#ffffff', 0.4) : resolveColor(e.th.roles.highlight, e.pal), e.pal), solidFace, 3);
  g.fillStyle = sun; g.strokeStyle = withAlpha(ink, 0.7); g.lineWidth = Math.max(1, S(e, 1.2));
  g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill(); g.stroke();
  if (night) { g.fillStyle = solidFace; g.beginPath(); g.arc(sx + sr * 0.45, sy - sr * 0.3, sr * 0.85, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/* ---------------- 时钟 / 日历组合件（M12b-08） ---------------- */

const CLOCK_NEW = new Set(['phaseDial', 'plaque', 'collage', 'dateStrip', 'timelineRuler', 'bigTemp']);
/** 面板的实心底色（渐变取第一个色标；没有底时 35% 黑）：日晷 / 昼夜盘的盘面；面板很透明时（无底皮肤）不透明度至少 0.75，盘面在暗世界上看得见 */
function panelFace(e: ElCtx): string {
  const bg = e.t.panel.bg;
  const c = bg && 'solid' in bg ? resolveColor(bg.solid, e.pal) : bg && 'linear' in bg && bg.linear.stops.length ? resolveColor(bg.linear.stops[0][1], e.pal) : null;
  if (!c) return withAlpha('#000', 0.35);
  const [r, g, b, a] = parseColor(c);
  return a >= 0.75 ? c : rgba([r, g, b, 0.75]);
}
/** 星期的写法（包的 hud.weekdays，7 个，从周日起；没写时 日 一 二 三 四 五 六） */
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const weekdays = () => DATA.weekdays ?? WEEK;
/** 今天是星期几（样本：day 对 7 取余） */
const todayW = () => DATA.day % 7;
/** 七天的天气（样本循环：晴 / 多云 / 晴 / 雪……，第 3 天是今天的天气） */
const weekWeather = () => { const w = DATA.weatherIcon ?? '☀'; return ['☀', '☁', '☀', w, '☁', '❄', '☀']; };
/** 昼夜分段比例（el.clock.dayPart / duskPart，夜 = 其余） */
function phaseParts(e: ElCtx): [number, number, number] {
  const k1 = chosenKey(e, ownKey(e, 'dayPart')), k2 = chosenKey(e, ownKey(e, 'duskPart'));
  const d = Math.max(0.05, Math.min(0.9, k1 ? e.r.num(k1, 0.5) : 0.5)), u = Math.max(0, Math.min(0.95 - d, k2 ? e.r.num(k2, 0.2) : 0.2));
  return [d, u, Math.max(0.05, 1 - d - u)];
}
const rimOf = (e: ElCtx) => pickedStr(e, ownKey(e, 'rim'), 'plain');
/** 昼夜盘的白天从几点起（与 plaque 日晷的 6 点日出同一口径） */
const DAWN = 6;
/** 温度透镜的字样：大号细体 */
const tempO = (e: ElCtx, s: number): Partial<TextOpts> => ({ ...e.title, size: s, weight: 300 });
function clockNewSize(e: ElCtx, f: string): { w: number; h: number } {
  switch (f) {
    case 'phaseDial': return { w: S(e, 112), h: S(e, 112) };
    case 'plaque': return { w: S(e, 252), h: S(e, 88) };
    case 'collage': return { w: S(e, 210), h: S(e, 124) };
    case 'dateStrip': return { w: 7 * S(e, 44) + 6 * S(e, 4) + S(e, 12), h: S(e, 72) };
    case 'timelineRuler': return { w: S(e, 300), h: S(e, 52) };
    default: return { w: Math.max(S(e, 124), numberWidth(e, DATA.temp, tempO(e, S(e, 34))) + S(e, 24)), h: S(e, 124) };
  }
}
function drawClockNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  if (f === 'phaseDial') {
    // 昼夜分段盘（饥荒）：实底整圆按 白天 / 黄昏 / 夜 三色扇区（强调色 / 第二强调色 / 面板第二底色），指针按时刻，外圈 el.clock.rim（plain / serrated 锯齿 / rays 光芒），中心描边写「第 N 天」
    const s = Math.min(a.w, a.h), cx = a.x + a.w / 2, cy = a.y + a.h / 2, R = s / 2 - S(e, 6), rim = rimOf(e), [d, u] = phaseParts(e);
    // 扇区从黎明（06:00）起排（B5 审查修复 ⑱：原来从 00:00 起，白天成了 0–12 点，傍晚 5 点的指针落在夜里、凌晨 3 点落在白天）；指针一天 24 小时一圈、0 点在顶
    const cols = [e.accent, e.accent2, mix(resolveColor(e.th.surface || '#1d2433', e.pal), '#0b1030', 0.6)], top = -Math.PI / 2, start = top + (DAWN / 24) * Math.PI * 2;
    g.save();
    if (rim !== 'plain') {
      // 外圈：锯齿（瓶盖边）或光芒
      g.fillStyle = ornColor(e); g.beginPath();
      const n = rim === 'rays' ? 16 : 28;
      for (let i = 0; i < n * 2; i++) { const t = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? R + S(e, rim === 'rays' ? 3 : 2) : R + S(e, rim === 'rays' ? 9 : 6); g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
      g.closePath(); g.fill();
    }
    let t0 = start;
    [d, u, 1 - d - u].forEach((p, i) => { const t1 = t0 + p * Math.PI * 2; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, t0, t1); g.closePath(); g.fill(); t0 = t1; });
    g.strokeStyle = withAlpha('#000', 0.6); g.lineWidth = Math.max(1, S(e, 1.5)); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    // 指针：一天 24 小时一圈，0 点在顶
    const ta = top + (DATA.hour / 24) * Math.PI * 2;
    g.strokeStyle = e.text; g.lineWidth = Math.max(2, S(e, 3)); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ta) * R * 0.92, cy + Math.sin(ta) * R * 0.92); g.stroke();
    g.restore();
    const dt = dayText(), o = { ...e.title, size: R * 0.32, outline: { color: 'rgba(0,0,0,0.75)', width: 2 } };
    drawNumber(e, dt, cx - numberWidth(e, dt, o) / 2, cy - o.size * 0.7, o.size * 1.4, o);
    return;
  }
  if (f === 'plaque') {
    // 复合挂牌（Stardew 右上）：一块元素面板（跟 ast.frame）里左边日晷小盘 + 右上星期日期牌与天气 / 季节小图标 + 右下时间牌
    panel(e, a, true);
    const p = S(e, 8), dr = (a.h - p * 2) / 2, dcx = a.x + p + dr, dcy = a.y + a.h / 2;
    g.save();
    g.fillStyle = withAlpha('#000', 0.25); g.beginPath(); g.arc(dcx, dcy, dr, 0, Math.PI * 2); g.fill();
    g.fillStyle = e.accent; g.beginPath(); g.arc(dcx, dcy, dr, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = withAlpha(e.text, 0.7); g.lineWidth = Math.max(1, S(e, 1.2)); g.beginPath(); g.arc(dcx, dcy, dr, 0, Math.PI * 2); g.stroke();
    const ta = Math.PI + ((DATA.hour - 6) / 12) * Math.PI;
    g.strokeStyle = e.text; g.lineWidth = Math.max(1.5, S(e, 2)); g.lineCap = 'round'; g.beginPath(); g.moveTo(dcx, dcy); g.lineTo(dcx + Math.cos(ta) * dr * 0.85, dcy + Math.sin(ta) * dr * 0.85); g.stroke();
    g.restore();
    const x0 = dcx + dr + p, rw = a.x + a.w - p - x0, top = { x: x0, y: a.y + p, w: rw, h: (a.h - p * 3) / 2 }, bot = { x: x0, y: top.y + top.h + p, w: rw, h: top.h };
    for (const q of [top, bot]) wellLike(e, q);
    const wd = `周${weekdays()[todayW()]}  ${DATA.day}`, so = { ...e.base, weight: 700 };
    drawNumber(e, wd, top.x + S(e, 6), top.y, top.h, so);
    icon(e, DATA.weatherIcon ?? '☀', top.x + top.w - S(e, 26), top.y + top.h / 2, top.h * 0.7, '#ffd34d');
    icon(e, '✿', top.x + top.w - S(e, 10), top.y + top.h / 2, top.h * 0.6, e.good);
    const ct = clockText(), co = { ...e.title, size: bot.h * 0.62 };
    drawNumber(e, ct, bot.x + bot.w / 2 - numberWidth(e, ct, co) / 2, bot.y, bot.h, co);
    return;
  }
  if (f === 'collage') {
    // 无底拼贴日历（Persona 5）：超大描边的月 / 日数字各自按种子小角度旋转错位，星期黑字压白条，时段一块斜白条，天气图标垫白色星芒
    const turn = (key: string, max: number) => { let h = 2166136261; for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((((h >>> 0) / 4294967295) * 2 - 1) * max * Math.PI) / 180; };
    const tilt = Math.max(4, e.v.num('vis.tilt', 0) || 8), big = { ...e.title, size: S(e, 54), weight: 900, color: '#fff', outline: { color: '#111', width: 4 } };
    const m = String(DATA.month ?? 4), d = String(DATA.day);
    // 每块各自平移 + 旋转：文字画布与主画布是同一个时只变换一次（中期审查修复 ㉖：原来同一个上下文平移 / 旋转两遍，位置与倾角都翻倍，右上锚点时整块画到屏外）
    const cs = e.tx === g ? [g] : [g, e.tx];
    const piece = (key: string, x: number, y: number, fn: () => void) => { const r = turn(key, tilt); for (const c of cs) { c.save(); c.translate(x, y); c.rotate(r); } try { fn(); } finally { for (const c of cs) c.restore(); } };
    piece('m', a.x + S(e, 24), a.y + S(e, 40), () => drawNumber(e, m, -numberWidth(e, m, big) / 2, -S(e, 36), S(e, 72), big));
    piece('/', a.x + S(e, 54), a.y + S(e, 50), () => { g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = S(e, 2); g.beginPath(); g.moveTo(-S(e, 4), S(e, 22)); g.lineTo(S(e, 10), -S(e, 22)); g.lineTo(S(e, 16), -S(e, 22)); g.lineTo(S(e, 2), S(e, 22)); g.closePath(); g.fill(); g.stroke(); });
    piece('d', a.x + S(e, 100), a.y + S(e, 54), () => drawNumber(e, d, -numberWidth(e, d, { ...big, size: S(e, 64) }) / 2, -S(e, 40), S(e, 80), { ...big, size: S(e, 64) }));
    const wd = weekdays()[todayW()], wo = { ...e.title, size: S(e, 18), weight: 900, color: '#111' };
    piece('w', a.x + S(e, 160), a.y + S(e, 34), () => { const w = W(e, wd, wo) + S(e, 14); g.fillStyle = '#fff'; g.fillRect(-w / 2, -S(e, 13), w, S(e, 26)); T(e, wd, -w / 2 + S(e, 7), -S(e, 13), S(e, 26), wo); });
    const per = DATA.period ?? 'AFTER SCHOOL', po = { ...e.small, weight: 900, color: '#111', spacing: 0.05 };
    piece('p', a.x + S(e, 120), a.y + S(e, 106), () => { const w = W(e, per, po) + S(e, 18); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-w / 2 + S(e, 6), -S(e, 10)); g.lineTo(w / 2 + S(e, 6), -S(e, 10)); g.lineTo(w / 2 - S(e, 6), S(e, 10)); g.lineTo(-w / 2 - S(e, 6), S(e, 10)); g.closePath(); g.fill(); T(e, per, -w / 2 + S(e, 9), -S(e, 10), S(e, 20), po); });
    piece('sun', a.x + a.w - S(e, 24), a.y + S(e, 84), () => {
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2, r = i % 2 ? S(e, 13) : S(e, 22); g.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      g.closePath(); g.fill(); icon(e, DATA.weatherIcon ?? '☀', 0, 0, S(e, 20), '#111');
    });
    return;
  }
  if (f === 'dateStrip') {
    // 横向日期带（Persona 5 的日期过渡）：七格（描边日期 + 星期 + 天气），当天放大、已过的划掉（st.done 的划线）
    const cw = S(e, 44), gap = S(e, 4), t = 3;
    for (let i = 0; i < 7; i++) {
      const today = i === t, w = today ? cw * 1.25 : cw, x = a.x + S(e, 6) + i * (cw + gap) - (i > t ? 0 : 0) - (today ? cw * 0.125 : 0), h = today ? a.h : a.h * 0.82, y = a.y + (a.h - h) / 2;
      drawBox(g, { x, y, w, h }, { bg: { solid: today ? e.accent : withAlpha('#000', 0.55) }, border: { width: Math.max(1, S(e, 1.5)), color: today ? '#fff' : withAlpha('#fff', 0.5) }, skewX: -8 }, e.pal);
      const dn = String(DATA.day - t + i), no = { ...e.title, size: today ? S(e, 24) : S(e, 18), weight: 900, color: '#fff', outline: { color: '#111', width: 2 } };
      drawNumber(e, dn, x + w / 2 - numberWidth(e, dn, no) / 2, y + S(e, 2), h * 0.5, no);
      const wd = weekdays()[(todayW() - t + i + 7) % 7], wo = { ...e.small, size: S(e, 11), weight: 700, color: '#fff' };
      T(e, wd, x + w / 2 - W(e, wd, wo) / 2, y + h * 0.48, h * 0.22, wo);
      icon(e, weekWeather()[i], x + w / 2, y + h * 0.84, h * 0.2, '#fff');
      if (i < t) { g.save(); g.strokeStyle = e.fill(0, 'danger'); g.lineWidth = Math.max(2, S(e, 3)); g.beginPath(); g.moveTo(x + S(e, 4), y + h - S(e, 6)); g.lineTo(x + w - S(e, 4), y + S(e, 6)); g.stroke(); g.restore(); }
    }
    return;
  }
  if (f === 'timelineRuler') {
    // 时间尺（Frostpunk）：天数刻度 + 当前日三角标 + 预报标记（包的 hud.forecast：哪几天有寒潮，画成危险色雪花）；左边「DAY N」
    const x0 = a.x + S(e, 8), x1 = a.x + a.w - S(e, 8), y = a.y + a.h * 0.55, days = 12, step = (x1 - x0) / days, d0 = DATA.day - 2;
    g.save();
    g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = Math.max(1, S(e, 1.2)); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y);
    for (let i = 0; i <= days; i++) { const x = x0 + i * step; g.moveTo(x, y); g.lineTo(x, y - (i % 5 === 0 ? S(e, 8) : S(e, 4))); }
    g.stroke();
    const cx = x0 + 2 * step;
    g.fillStyle = e.accent; g.beginPath(); g.moveTo(cx, y + S(e, 2)); g.lineTo(cx - S(e, 6), y + S(e, 11)); g.lineTo(cx + S(e, 6), y + S(e, 11)); g.closePath(); g.fill();
    g.restore();
    const lo = { ...e.small, size: S(e, 10), color: mutedOf(e, 0.8) };
    for (let i = 0; i <= days; i += 2) { const s = String(d0 + i); drawNumber(e, s, x0 + i * step - numberWidth(e, s, lo) / 2, y + S(e, 12), S(e, 14), lo); }
    for (const fd of DATA.forecast ?? [DATA.day + 4, DATA.day + 7]) { const i = fd - d0; if (i < 0 || i > days) continue; icon(e, '❄', x0 + i * step, y - S(e, 16), S(e, 14), e.fill(0, 'danger')); }
    const dt = `DAY ${DATA.day}`;
    drawNumber(e, dt, x0, a.y, S(e, 16), { ...e.small, weight: 800 });
    return;
  }
  // bigTemp：圆形霜玻璃透镜 + 大号细体温度（Frostpunk 顶部中央），不写天气字
  const s = Math.min(a.w, a.h), cx = a.x + a.w / 2, cy = a.y + a.h / 2, R = s / 2 - S(e, 3);
  g.save();
  const gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  gr.addColorStop(0, 'rgba(235,245,255,0.55)'); gr.addColorStop(0.7, 'rgba(170,200,225,0.35)'); gr.addColorStop(1, 'rgba(90,120,150,0.55)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ornColor(e); g.lineWidth = Math.max(2, S(e, 3)); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1, S(e, 1.2)); g.beginPath(); g.arc(cx, cy, R * 0.86, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
  g.restore();
  const o = tempO(e, Math.min(S(e, 34), R * 0.7)), tw = numberWidth(e, DATA.temp, o);
  drawNumber(e, DATA.temp, cx - tw / 2, cy - o.size! * 0.75, o.size! * 1.5, { ...o, outline: { color: 'rgba(0,0,0,0.45)', width: 1.5 } });
}
/** 挂牌里的小牌底（日期牌 / 时间牌）：凹槽（tokens.well），没有时半透明暗底 */
function wellLike(e: ElCtx, q: Rect) {
  if (e.t.well) drawBox(e.g, q, e.t.well, e.pal); else drawBox(e.g, q, { bg: { solid: withAlpha('#000', 0.3) }, radius: S(e, 3) }, e.pal);
}

/** 时钟盒子的外形（M12b-68 ④）：vis.silhouette@el.clock / @panel 按目标写了时换（Frostpunk 的圆形透镜），否则 def（原来的面板 / 药丸） */
const clockShape = (e: ElCtx, a: { x: number; y: number; w: number; h: number }, def: Parameters<typeof panel>[3] = {}) => (scopedSilhouette(e, 'panel') ? shapeOver(e, 'panel', a) : def);

/* 地图叠层（世界上的信息层，M6 前画成屏幕上的近似） */
/** M12b-26 的叠层新画法：贴路线路网、吸附辅助线、移动范围、掩体图标 */
registerElement({
  id: 'el.overlay', forms: ['gridHighlight', 'heatmap', 'arrows', 'statusIcons', 'buildGrid', 'rangeRing', 'holo', 'routeLines', 'guides', 'moveRange', 'coverIcons'], anchor: 'center',
  points: { gridHighlight: 'target', heatmap: 'target', arrows: 'target', statusIcons: 'target', buildGrid: 'target', rangeRing: 'target', holo: 'target', routeLines: 'target', guides: 'target', moveRange: 'player', coverIcons: 'player' },
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  // 状态图标那一行画出来的范围（M12b-65 ⑧，与 statusIcons 同一套几何）；其余画法照旧按角色框
  pointBox: (e, p) => (e.forms[0] === 'statusIcons' ? statusRow(e, p, attachFor(e)).box : null),
  // 图例组件（M12b-26）：锚在屏幕上的一块，排位前当固定障碍（别的元素挪开）、画完登记（只给第一个带图例的画法算一次）
  reserve: (e) => (ovLegendHere(e) ? [ovLegendRect(e)] : []),
  extraRects: (e) => (ovLegendHere(e) ? [ovLegendRect(e)] : []),
  draw: (e) => {
    // 图例开着时（B10 审查修复 ⑫）：叠层图形裁掉图例卡那一块、图例最后画——原来先画图例，线路、站点、热斑压在卡上（每个画法都裁：多选画法时别的画法也不压它）
    const g = e.g, R = e.R, lg = ovLegendOn(e) ? ovLegendRect(e) : null, cs = e.tx !== g ? [g, e.tx] : [g];
    if (lg) for (const c of cs) { c.save(); c.beginPath(); c.rect(R.x - R.w, R.y - R.h, R.w * 3, R.h * 3); c.rect(lg.x, lg.y, lg.w, lg.h); c.clip('evenodd'); }
    try { overlayDraw(e); } finally { if (lg) for (const c of cs) c.restore(); }
    if (ovLegendHere(e)) legend(e, lg ?? ovLegendRect(e), ovLegendSpec(e));
  },
});
/** el.overlay 一个画法的叠层图形（图例另画，见上） */
function overlayDraw(e: ElCtx) {
  const f = e.forms[0], g = e.g, p = attachPoint(e, attachFor(e)), R = e.R;
  switch (f) {
    case 'heatmap':
      // 图例（M7：信息叠层要配图例）；选了图例样式 / 锚点（M12b-26）时换成 legend 组件（上面画过了）
      if (!ovLegendOn(e)) {
        const lx = R.x + R.w - S(e, 170), ly = R.y + R.h - S(e, 96);
        panel(e, { x: lx, y: ly, w: S(e, 150), h: S(e, 80) }, true);
        T(e, DATA.heat.title, lx + S(e, 10), ly + S(e, 4), S(e, 20), { ...e.small, weight: 700 });
        DATA.heat.levels.forEach((l, i) => { const c = HEAT_COLORS[i]; g.fillStyle = c; g.fillRect(lx + S(e, 10), ly + S(e, 28 + i * 16), S(e, 22), S(e, 10)); T(e, l, lx + S(e, 38), ly + S(e, 24 + i * 16), S(e, 16), e.small); });
      }
      for (const [dx, dy, rr, c] of [[0, 0, 120, '#e5484d'], [-160, 60, 90, '#e3b341'], [140, 90, 70, '#3fb950']] as [number, number, number, string][]) {
        const gr = g.createRadialGradient(p.x + dx, p.y + dy, 0, p.x + dx, p.y + dy, S(e, rr));
        gr.addColorStop(0, withAlpha(c, 0.45)); gr.addColorStop(1, withAlpha(c, 0)); g.fillStyle = gr; g.fillRect(p.x + dx - S(e, rr), p.y + dy - S(e, rr), S(e, rr * 2), S(e, rr * 2));
      }
      return;
    case 'arrows':
      g.strokeStyle = withAlpha(e.accent, 0.85); g.lineWidth = S(e, 3);
      for (let i = 0; i < 4; i++) { const x = R.x + R.w * (0.35 + i * 0.08), y = R.y + R.h * (0.55 - i * 0.03); g.beginPath(); g.moveTo(x, y); g.lineTo(x + S(e, 40), y - S(e, 10)); g.stroke(); g.beginPath(); g.moveTo(x + S(e, 40), y - S(e, 10)); g.lineTo(x + S(e, 30), y - S(e, 18)); g.lineTo(x + S(e, 32), y - S(e, 4)); g.closePath(); g.fillStyle = g.strokeStyle; g.fill(); }
      return;
    case 'statusIcons': statusIcons(e, p, attachFor(e)); return;
    case 'buildGrid': case 'gridHighlight': {
      const cs = S(e, 34);
      // 放置合法性（el.overlay.legality，M12b-26，doc16 G-build-legality）：color = 原来的绿 / 红填色；stripes = 不合法的格画红斜纹；icon = 格心画 ✓ / ✕；选了时不合法格旁写原因
      const leg = f === 'buildGrid' && elChosen(e, 'legality') ? String(e.r.el(e.id, 'legality', e.form) ?? 'color') : '';
      g.strokeStyle = withAlpha(f === 'buildGrid' ? '#7aa2f7' : '#fff', 0.45); g.lineWidth = 1;
      // 场景导出了战棋格子时按它画（与棋盘地面对齐，F 轨道）；没有时原来的 2 : 1 菱形。棋盘外的格子不画（整合修复 U#3：原来从棋盘边上画进天空）
      const P = isoCell(e, p, cs);
      const bad: [number, number] = P(2, 1), ok0: [number, number] = P(1, 0);
      for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) {
        if (!onBoard(e, i, j)) continue;
        const [x, y] = P(i, j), c0 = P(i - 0.5, j - 0.5), c1 = P(i + 0.5, j - 0.5), c2 = P(i + 0.5, j + 0.5), c3 = P(i - 0.5, j + 0.5);
        g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.closePath();
        if (f === 'gridHighlight' && Math.abs(i) + Math.abs(j) <= 2) { g.fillStyle = withAlpha(e.accent2, 0.3); g.fill(); }
        if (f === 'buildGrid' && i === 1 && j === 0 && leg !== 'icon') { g.fillStyle = withAlpha(e.good, 0.4); g.fill(); }
        if (f === 'buildGrid' && i === 2 && j === 1) {
          if (leg === 'stripes') { g.save(); g.clip(); g.strokeStyle = withAlpha(e.bad, 0.8); g.lineWidth = Math.max(1.5, S(e, 2)); for (let t = -cs; t <= cs; t += S(e, 6)) { g.beginPath(); g.moveTo(x - cs + t, y + cs * 0.5); g.lineTo(x + t, y - cs * 0.5); g.stroke(); } g.restore(); }
          else if (leg !== 'icon') { g.fillStyle = withAlpha(e.bad, 0.4); g.fill(); }
        }
        g.stroke();
      }
      if (leg === 'icon') { icon(e, '✓', ok0[0], ok0[1], cs * 0.5, e.good); icon(e, '✕', bad[0], bad[1], cs * 0.5, e.bad); }
      if (leg) {
        // 原因（内容包 hud.legends.buildGrid 的第二条，没写时「已占用」）：贴在不合法格右边的小牌
        const why = DATA.legends?.buildGrid?.items?.[1]?.[0] ?? '已占用', o = { ...e.small, weight: 700, color: '#fff' }, tw = W(e, why, o) + S(e, 12), th = S(e, 20);
        const q = { x: bad[0] + cs * 0.95, y: bad[1] - th / 2, w: tw, h: th };
        g.save(); g.fillStyle = withAlpha(e.bad, 0.85); g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, S(e, 4)); g.fill(); g.restore();
        T(e, why, q.x + S(e, 6), q.y, q.h, o);
      }
      return;
    }
    case 'rangeRing':
      g.strokeStyle = withAlpha(e.accent, 0.8); g.setLineDash([6, 5]); g.lineWidth = 2;
      g.beginPath(); g.ellipse(p.x, p.y + S(e, 20), S(e, 150), S(e, 60), 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      return;
    case 'holo':
      g.strokeStyle = withAlpha('#5ff', 0.6); g.lineWidth = 1;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(p.x, p.y, S(e, 40 + i * 24), S(e, 14 + i * 9), 0, 0, Math.PI * 2); g.stroke(); }
      return;
    case 'routeLines': routeLines(e, p); return;
    case 'guides': snapGuides(e, p); return;
    case 'moveRange': moveRange(e, p); return;
    case 'coverIcons': coverIcons(e, p); return;
  }
}

/** 线路网的默认颜色（col.coding 没开 lineId 时）：红 / 蓝 / 绿 / 金 / 紫 */
const ROUTE_DEFAULT = ['#e5484d', '#3b82f6', '#3fb950', '#e3b341', '#a855f7'];
/** 第 i 条线路的颜色：B1 · 33 的类别色表（col.coding 含 lineId）→ 默认五色 */
const routeColor = (e: ElCtx, i: number) => lineColor(e, i) ?? ROUTE_DEFAULT[i % ROUTE_DEFAULT.length];
/**
 * 贴路线路网（el.overlay = routeLines，M12b-26，cities-skylines#1）：N 条线（elx.count / el.overlay.count，默认 4，最多 6）各一个身份色，
 * 都从画面边上进来、在挂点附近共走一段主干（主干上并排、按线宽错开），再各自出去；站点 = 白芯深色圈的小圆点（端点、进出主干处与主干中段）。
 * 先在屏幕空间画折线（M12c-03 接入场景道路图后贴路）。种子固定，每帧一样
 */
function routeLines(e: ElCtx, p: { x: number; y: number }) {
  const g = e.g, R = e.R, n = Math.max(1, Math.min(6, elCount(e, 4))), lw = Math.max(3, S(e, 5));
  const t0 = { x: p.x - R.w * 0.16, y: p.y + R.h * 0.02 }, t1 = { x: p.x + R.w * 0.16, y: p.y - R.h * 0.04 };
  const dx = t1.x - t0.x, dy = t1.y - t0.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const ENDS: [number, number, number, number][] = [[0.04, 0.18, 0.96, 0.82], [0.1, 0.92, 0.9, 0.08], [0.02, 0.55, 0.98, 0.4], [0.3, 0.02, 0.72, 0.98], [0.06, 0.75, 0.94, 0.62], [0.5, 0.97, 0.6, 0.03]];
  const stations: [number, number][] = [];
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * lw * 1.3, a = { x: t0.x + nx * off, y: t0.y + ny * off }, b = { x: t1.x + nx * off, y: t1.y + ny * off };
    const [u0, v0, u1, v1] = ENDS[i % ENDS.length], s = { x: R.x + R.w * u0, y: R.y + R.h * v0 }, t = { x: R.x + R.w * u1, y: R.y + R.h * v1 };
    // 进主干前折一下（地铁图式的折角）：先走到主干端点外侧一点，再斜进主干
    const k0 = { x: a.x - R.w * 0.06, y: s.y + (a.y - s.y) * 0.7 }, k1 = { x: b.x + R.w * 0.06, y: t.y + (b.y - t.y) * 0.7 };
    const path = () => { g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(k0.x, k0.y); g.lineTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(k1.x, k1.y); g.lineTo(t.x, t.y); };
    g.strokeStyle = withAlpha('#000', 0.35); g.lineWidth = lw + 2; path(); g.stroke();
    g.strokeStyle = routeColor(e, i); g.lineWidth = lw; path(); g.stroke();
    stations.push([s.x, s.y], [t.x, t.y], [k0.x, k0.y], [k1.x, k1.y]);
  }
  stations.push([t0.x, t0.y], [(t0.x + t1.x) / 2, (t0.y + t1.y) / 2], [t1.x, t1.y]);
  for (const [x, y] of stations) { g.fillStyle = '#fff'; g.strokeStyle = '#1b1f24'; g.lineWidth = Math.max(1.5, S(e, 2)); g.beginPath(); g.arc(x, y, lw * 0.75, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}

/**
 * 吸附辅助线（el.overlay = guides，M12b-26，cities-skylines#15：修路）：已有的一条路（浅色粗线）、正在画的那段（第二强调色，起点 → 挂点 / 光标）
 * + 过光标的平行 / 垂直虚线参考线（长出画面）+ 起点的角度弧与读数（°）+ 路段长度读数（m），读数是深底强调色小牌
 */
function snapGuides(e: ElCtx, p: { x: number; y: number }) {
  const g = e.g, R = e.R, a0 = { x: p.x - R.w * 0.18, y: p.y + R.h * 0.1 }, ang = Math.atan2(p.y - a0.y, p.x - a0.x), Lx = Math.max(R.w, R.h);
  g.save(); g.lineCap = 'round';
  g.strokeStyle = withAlpha('#d8dde3', 0.55); g.lineWidth = S(e, 7); g.beginPath(); g.moveTo(R.x, a0.y); g.lineTo(R.x + R.w, a0.y + R.h * 0.04); g.stroke();
  g.strokeStyle = withAlpha(e.accent2, 0.9); g.lineWidth = S(e, 7); g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(p.x, p.y); g.stroke();
  g.setLineDash([S(e, 6), S(e, 5)]); g.lineWidth = Math.max(1, S(e, 1.4)); g.strokeStyle = withAlpha('#fff', 0.7);
  for (const t of [ang, ang + Math.PI / 2]) { g.beginPath(); g.moveTo(p.x - Math.cos(t) * Lx, p.y - Math.sin(t) * Lx); g.lineTo(p.x + Math.cos(t) * Lx, p.y + Math.sin(t) * Lx); g.stroke(); }
  g.setLineDash([]);
  g.strokeStyle = e.accent; g.lineWidth = Math.max(1.5, S(e, 2)); g.beginPath(); g.arc(a0.x, a0.y, S(e, 26), Math.min(0, ang), Math.max(0, ang)); g.stroke();
  g.restore();
  const len = Math.round(Math.hypot(p.x - a0.x, p.y - a0.y) / S(e, 4)), deg = Math.round(Math.abs((ang * 180) / Math.PI));
  const tag = (s: string, x: number, y: number) => {
    const o = { ...e.small, weight: 800 }, tw = numberWidth(e, s, o) + S(e, 12), th = S(e, 20);
    g.save(); g.fillStyle = withAlpha('#000', 0.65); g.beginPath(); g.roundRect(x - tw / 2, y - th / 2, tw, th, S(e, 4)); g.fill(); g.restore();
    drawNumber(e, s, x - tw / 2 + S(e, 6), y - th / 2, th, { ...o, color: e.accent });
  };
  tag(`${deg}°`, a0.x + S(e, 44), a0.y - S(e, 18));
  tag(`${len} m`, (a0.x + p.x) / 2 + S(e, 10), (a0.y + p.y) / 2 + S(e, 22));
}

/**
 * 格 (i, j) 的画面点（相对挂点那一格；i / j 可以是小数，格角 = ±0.5）：场景导出了战棋格子（worldNow().grid，F 轨道）时按它算——格子和棋盘地面对齐、
 * 以玩家脚下那一格为中心；没有格子（自由视角的 3D 场景、元素展示格、导出）时照原来的 2 : 1 等距菱形（格宽 cs）
 */
function isoCell(e: ElCtx, p: { x: number; y: number }, cs: number): (i: number, j: number) => [number, number] {
  const gr = sceneGrid(e);
  if (gr) return (i, j) => gridPoint(gr, i, j);
  const W0 = cs * 0.9, H0 = cs * 0.45;
  return (i, j) => [p.x + (i - j) * W0, p.y + (i + j) * H0];
}
/** 场景导出的战棋格子（自由视角的 3D 场景、元素展示格、导出时没有） */
const sceneGrid = (e: ElCtx) => (e.noWorld ? null : worldNow()?.grid ?? null);
/** 格 (i, j)（相对挂点那一格）在棋盘上吗；没有格子时都算 */
function onBoard(e: ElCtx, i: number, j: number): boolean {
  const gr = sceneGrid(e);
  if (!gr) return true;
  const a = gr.at[0] + i, b = gr.at[1] + j;
  return a >= 0 && b >= 0 && a < gr.size[0] && b < gr.size[1];
}
/**
 * 有格子时把画布裁到棋盘的四条边以内（整合修复 U#3：移动范围 / 冲刺范围在棋盘边上不再画进天空和云海），返回还原函数；没有格子时什么都不做
 */
function clipToBoard(e: ElCtx): () => void {
  const gr = sceneGrid(e);
  if (!gr) return () => {};
  const g = e.g, i0 = -gr.at[0] - 0.5, i1 = gr.size[0] - gr.at[0] - 0.5, j0 = -gr.at[1] - 0.5, j1 = gr.size[1] - gr.at[1] - 0.5;
  const q = [gridPoint(gr, i0, j0), gridPoint(gr, i1, j0), gridPoint(gr, i1, j1), gridPoint(gr, i0, j1)];
  g.save();
  g.beginPath(); q.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.clip();
  return () => g.restore();
}
/** 等距格（与 gridHighlight 同一套 2 : 1 菱形）里离挂点曼哈顿步数 ≤ k 的格子并成的大菱形，沿格子边走成锯齿轮廓 */
function isoRing(e: ElCtx, p: { x: number; y: number }, k: number, cs: number) {
  const g = e.g;
  const P = isoCell(e, p, cs);
  // 格 (i, j) 的四角是 (i ± 0.5, j ± 0.5)；|i| + |j| ≤ k 的格子外轮廓：沿 j 从小到大走上半边、再从大到小走下半边
  const pts: [number, number][] = [];
  for (let j = -k; j <= k; j++) { const m = k - Math.abs(j); pts.push(P(m + 0.5, j - 0.5), P(m + 0.5, j + 0.5)); }
  for (let j = k; j >= -k; j--) { const m = k - Math.abs(j); pts.push(P(-m - 0.5, j + 0.5), P(-m - 0.5, j - 0.5)); }
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
/**
 * 移动范围（el.overlay = moveRange，M12b-26，xcom2#9）：挂点（默认玩家）四周两层可达边界——内层一次行动（蓝，实线 + 淡填）、外层冲刺（警告色，虚线）；
 * 路径线（白，挂点 → 落点，沿格子折一次）+ 落点圈
 */
function moveRange(e: ElCtx, p: { x: number; y: number }) {
  const g = e.g, cs = S(e, 34), inner = '#4aa3ff', outer = e.warn;
  const unclip = clipToBoard(e);
  g.save();
  isoRing(e, p, 3, cs); g.fillStyle = withAlpha(inner, 0.12); g.fill(); g.strokeStyle = withAlpha(inner, 0.95); g.lineWidth = Math.max(2, S(e, 2.5)); g.stroke();
  isoRing(e, p, 5, cs); g.setLineDash([S(e, 7), S(e, 5)]); g.strokeStyle = withAlpha(outer, 0.95); g.stroke(); g.setLineDash([]);
  // 路径线：起点 → 沿 i 走两格 → 沿 j 走一格（格子中心）；落点圈 = 那一格的内切椭圆（按格子两条轴的长度）
  const P = isoCell(e, p, cs), [ox, oy] = P(0, 0), [mx, my] = P(2, 0), [ex, ey] = P(2, 1);
  const [ux, uy] = P(2.5, 1), [vx, vy] = P(2, 1.5), rx = Math.max(Math.abs(ux - ex), Math.abs(vx - ex)) * 0.9, ry = Math.max(Math.abs(uy - ey), Math.abs(vy - ey)) * 0.9;
  g.strokeStyle = withAlpha('#fff', 0.9); g.lineWidth = Math.max(2, S(e, 2.5)); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(ox, oy); g.lineTo(mx, my); g.lineTo(ex, ey); g.stroke();
  g.beginPath(); g.ellipse(ex, ey, Math.max(4, rx), Math.max(2, ry), 0, 0, Math.PI * 2); g.stroke();
  g.restore();
  unclip();
}

/** 盾形图标（满 = 实心、半 = 左半实心右半描边），掩体用 */
function shieldIcon(e: ElCtx, x: number, y: number, s: number, full: boolean, color: string) {
  const g = e.g;
  const path = () => { g.beginPath(); g.moveTo(x, y - s * 0.55); g.lineTo(x + s * 0.45, y - s * 0.38); g.lineTo(x + s * 0.4, y + s * 0.12); g.quadraticCurveTo(x + s * 0.25, y + s * 0.42, x, y + s * 0.58); g.quadraticCurveTo(x - s * 0.25, y + s * 0.42, x - s * 0.4, y + s * 0.12); g.lineTo(x - s * 0.45, y - s * 0.38); g.closePath(); };
  g.save();
  g.fillStyle = withAlpha('#000', 0.45); path(); g.fill();
  if (full) { g.fillStyle = color; path(); g.fill(); }
  else { path(); g.save(); g.clip(); g.fillStyle = color; g.fillRect(x - s, y - s, s, s * 2); g.restore(); }
  g.strokeStyle = color; g.lineWidth = Math.max(1.5, s * 0.08); path(); g.stroke();
  g.restore();
}
/** 掩体图标（el.overlay = coverIcons，M12b-26，xcom2#9）：挂点四周几格地面上的满盾 / 半盾（蓝），与移动范围同一套等距格 */
function coverIcons(e: ElCtx, p: { x: number; y: number }) {
  const cs = S(e, 34), s = Math.max(S(e, 18), cs * 0.62), c = '#4aa3ff', P = isoCell(e, p, cs);
  for (const [i, j, full] of [[2, -1, true], [-1, 2, false], [3, 1, true], [-2, -1, false], [0, 3, true]] as [number, number, boolean][]) { if (!onBoard(e, i, j)) continue; const [x, y] = P(i, j); shieldIcon(e, x, y - s * 0.4, s, full, c); }
}

/* ---------------- 图例组件（M12b-26，§2 的 legend：叠层、地图共用） ---------------- */

export interface LegendItem { icon?: string; label: string; color?: string; value?: string }
export interface LegendSpec { title: string; style: 'swatches' | 'gradientBar' | 'statRows' | 'iconList'; items: LegendItem[]; low?: string; high?: string; stats?: [string, string][] }
export const LEGEND_STYLES = ['swatches', 'gradientBar', 'statRows', 'iconList'];
/** 图例条目的颜色：色板角色名（good / bad / warn / accent……）或 #hex / rgb() */
function legendColor(e: ElCtx, c?: string): string {
  if (!c) return e.accent;
  if (c.startsWith('#') || c.startsWith('rgb')) return c;
  const ro = e.th.roles as unknown as Record<string, unknown>;
  return typeof ro[c] === 'string' ? (ro[c] as string) : resolveColor(`@${c}`, e.pal);
}
/** 图例的尺寸（按内容：标题、每行字宽、渐变条的最小宽） */
export function legendSize(e: ElCtx, s: LegendSpec): { w: number; h: number } {
  const pad = S(e, 10), to = { ...e.small, weight: 700 }, rh = Math.max(S(e, 18), LH(e, e.small)), th = s.title ? LH(e, to) : 0;
  // 数值行的条目带颜色时名字前垫一块色签（B10 审查修复 ⑫：线路网的数值行原来没有色签，看不出哪条是哪条）
  const lw = (it: LegendItem) => W(e, it.label, e.small) + (s.style === 'statRows' ? numberWidth(e, it.value ?? '', e.small) + S(e, 16) + (it.color ? S(e, 16) : 0) : S(e, 30));
  const rows = (s.style === 'gradientBar' ? 2 : s.items.length) + (s.stats?.length ?? 0);
  const statW = (s.stats ?? []).map(([a, b]) => W(e, a, e.small) + numberWidth(e, b, e.small) + S(e, 16));
  const w = Math.max(s.title ? W(e, s.title, to) : 0, s.style === 'gradientBar' ? S(e, 130) : 0, ...(s.style === 'gradientBar' ? [] : s.items.map(lw)), ...statW) + pad * 2;
  return { w, h: pad * 0.6 + th + rows * rh + pad * 0.6 };
}
/**
 * 图例（M12b-26）：一块面板（材质跟面板 / ast.coreMat：羊皮纸皮肤上就是羊皮纸图例卡）里写标题，再按样式排条目——swatches 色块 + 名字、gradientBar 渐变条 + 低 / 高两端字（+ 统计行）、
 * statRows 名字 …… 数值、iconList 类型色图标 + 名字（StS 地图的图例卡）。宽按内容；返回画出的矩形
 */
export function legend(e: ElCtx, at: Rect, s: LegendSpec): Rect {
  const g = e.g, pad = S(e, 10), to = { ...e.small, weight: 700 }, rh = Math.max(S(e, 18), LH(e, e.small));
  panel(e, at, true);
  let y = at.y + pad * 0.6;
  if (s.title) { T(e, s.title, at.x + pad, y, LH(e, to), to); y += LH(e, to); }
  if (s.style === 'gradientBar') {
    const bar = { x: at.x + pad, y: y + rh * 0.3, w: at.w - pad * 2, h: rh * 0.45 }, gr = g.createLinearGradient(bar.x, 0, bar.x + bar.w, 0);
    const cs = s.items.length ? s.items : [{ label: '', color: 'good' }, { label: '', color: 'bad' }];
    // 渐变从低到高：条目按「高 → 低」写（heat 三档的口径），反过来铺
    [...cs].reverse().forEach((it, i) => gr.addColorStop(cs.length > 1 ? i / (cs.length - 1) : 0, legendColor(e, it.color)));
    g.fillStyle = gr; g.fillRect(bar.x, bar.y, bar.w, bar.h);
    y += rh;
    if (s.low) T(e, s.low, bar.x, y, rh, e.small);
    if (s.high) T(e, s.high, bar.x + bar.w - W(e, s.high, e.small), y, rh, e.small);
    y += rh;
  } else for (const it of s.items) {
    const c = legendColor(e, it.color);
    if (s.style === 'statRows') {
      const chip = it.color ? S(e, 16) : 0, v = it.value ?? '';
      if (chip) { g.fillStyle = c; g.fillRect(at.x + pad, y + rh * 0.25, S(e, 10), rh * 0.5); }
      T(e, it.label, at.x + pad + chip, y, rh, e.small);
      if (v) drawNumber(e, v, at.x + at.w - pad - numberWidth(e, v, e.small), y, rh, e.small);
    }
    else if (s.style === 'iconList') { icon(e, it.icon ?? '●', at.x + pad + S(e, 8), y + rh / 2, S(e, 13), c); T(e, it.label, at.x + pad + S(e, 22), y, rh, e.small); }
    else { g.fillStyle = c; g.fillRect(at.x + pad, y + rh * 0.25, S(e, 22), rh * 0.5); T(e, it.label, at.x + pad + S(e, 28), y, rh, e.small); }
    y += rh;
  }
  for (const [a, b] of s.stats ?? []) { T(e, a, at.x + pad, y, rh, { ...e.small, color: mutedOf(e, 0.75) }); drawNumber(e, b, at.x + at.w - pad - numberWidth(e, b, e.small), y, rh, e.small); y += rh; }
  return at;
}

/** 叠层图例用不用组件（M12b-26）：选了 el.overlay.legendStyle / legendAnchor，或画了贴路线路网（线路要标颜色）；没选时热力图照旧画原来右下的三档小面板 */
const ovLegendOn = (e: ElCtx) => elChosen(e, 'legendStyle') || elChosen(e, 'legendAnchor') || formsOf(e.r, e.id).includes('routeLines');
/** 画法里有图例数据的（热力图、线路网、掩体、移动范围、建造网格） */
const OV_LEGEND = ['heatmap', 'routeLines', 'coverIcons', 'moveRange', 'buildGrid'];
/** 这一个画法（多选时按画法拆开画）负责画图例：组件开着、是第一个有图例数据的画法 */
const ovLegendHere = (e: ElCtx) => ovLegendOn(e) && (e.form ?? e.forms[0]) === formsOf(e.r, e.id).find((f) => OV_LEGEND.includes(f));
/**
 * 叠层图例的内容（M12b-26，cities-skylines#5：图例跟着叠层的数据走）：按 el.overlay 选的画法逐个取内容包的 hud.legends[画法]（没写时通用的：
 * 热力图 = heat 三档、线路网 = 每条线路的名字 + 身份色、掩体 = 满 / 半、移动范围 = 一次行动 / 冲刺、建造网格 = 可放置 / 已占用），多个画法合成一块（标题取第一个）；
 * 样式 el.overlay.legendStyle（没选时掩体是图标列，其余色块）
 */
function ovLegendSpec(e: ElCtx): LegendSpec {
  const forms = formsOf(e.r, e.id).filter((f) => OV_LEGEND.includes(f)), L = DATA.legends ?? {};
  const n = Math.max(1, Math.min(6, elCount(e, 4)));
  const gen: Record<string, { title: string; items: LegendItem[]; low?: string; high?: string; stats?: [string, string][] }> = {
    heatmap: { title: DATA.heat.title, items: DATA.heat.levels.map((l, i) => ({ label: l, color: HEAT_COLORS[i] })), low: DATA.heat.levels[2], high: DATA.heat.levels[0] },
    routeLines: { title: '公交线路', items: Array.from({ length: n }, (_, i) => ({ label: `${i + 1} 号线`, color: routeColor(e, i) })) },
    coverIcons: { title: '防护', items: [{ label: '满', icon: '⛨', color: '#4aa3ff' }, { label: '半', icon: '⛨', color: '#8fc4f5' }] },
    moveRange: { title: '移动', items: [{ label: '一次行动', color: '#4aa3ff' }, { label: '冲刺', color: e.warn }] },
    buildGrid: { title: '建造', items: [{ label: '可放置', color: 'good' }, { label: '已占用', color: 'bad' }] },
  };
  const parts = forms.map((f) => {
    const d = L[f];
    return d ? { title: d.title, items: d.items.map(([label, color, value], i) => ({ label, color: color ?? (f === 'routeLines' ? routeColor(e, i) : HEAT_COLORS[i % 3]), value })), low: d.low, high: d.high, stats: d.stats } : gen[f];
  });
  const st0 = elChosen(e, 'legendStyle') ? String(e.r.el(e.id, 'legendStyle') ?? 'swatches') : forms[0] === 'coverIcons' ? 'iconList' : 'swatches';
  const style = (LEGEND_STYLES.includes(st0) ? st0 : 'swatches') as LegendSpec['style'];
  return { title: parts[0]?.title ?? '', style, items: parts.flatMap((q) => q.items), low: parts.find((q) => q.low)?.low, high: parts.find((q) => q.high)?.high, stats: parts.flatMap((q) => q.stats ?? []) };
}
/** 叠层图例的位置（el.overlay.legendAnchor：auto = br，与原来的热力图图例同位；离屏幕边 20 × 16） */
/** 图例矩形的记忆（B10 审查修复 ⑫：多选画法时每个画法都要裁掉图例那一块，不再各量一遍）：同一帧（BAKE.frame）、同一份参数、画面、缩放、内容包、字号时直接用（每帧量一次，帧间调用序列不变） */
let OV_LG: { r: unknown; key: string; rect: Rect } | null = null;
function ovLegendRect(e: ElCtx): Rect {
  const R0 = e.R, key = `${BAKE.frame}|${e.id}|${R0.x},${R0.y},${R0.w},${R0.h}|${e.k}|${TEXT_K.k}|${PSEUDO.pct}|${FONT_EPOCH.v}|${e.th.unitK ?? 1}`;
  if (OV_LG && OV_LG.r === e.r && OV_LG.key === key && OV_LG.rect && OV_PACK === pack()) return OV_LG.rect;
  const rect = ovLegendRect0(e);
  OV_LG = { r: e.r, key, rect }; OV_PACK = pack();
  return rect;
}
let OV_PACK: unknown = null;
function ovLegendRect0(e: ElCtx): Rect {
  const s = legendSize(e, ovLegendSpec(e)), R = e.R, an = elChosen(e, 'legendAnchor') ? String(e.r.el(e.id, 'legendAnchor') ?? 'br') : 'br';
  const mx = S(e, 20), my = S(e, 16);
  const x = an.endsWith('l') ? R.x + mx : an.endsWith('c') || an === 'center' ? R.x + (R.w - s.w) / 2 : R.x + R.w - s.w - mx;
  const y = an.startsWith('t') ? R.y + my : an.startsWith('m') || an === 'center' ? R.y + (R.h - s.h) / 2 : R.y + R.h - s.h - my;
  return { x, y, w: s.w, h: s.h };
}

/** 状态图标的默认表（M12a-31：原来每个图标都画成写死的晶体徽章 + 白字，自带的颜色被丢掉）；内容包可写 hud.statusIcons */
const STATUS_ICONS: [string, StatusRole, number?][] = [['!', 'warn'], ['Z', 'info'], ['♥', 'danger']];
/**
 * 目标头顶血条的上沿（M12a-31）：el.threat 的 healthBar / lockOn 画法挂在同一个点上时（挂点相同）返回它的 y（与 combat.ts 的头顶血条同一个式子：挂点上方 46 × 威胁元素的缩放），否则 null
 */
function threatBarTop(e: ElCtx, at: Attach, p: { y: number }): number | null {
  const r = e.r;
  if (!r.elements().includes('el.threat')) return null;
  const forms = formsOf(r, 'el.threat');
  const part = elementParts(r, 'el.threat').find((q) => ['healthBar', 'lockOn'].includes(q.form ?? forms[0]));
  if (!part || (part.given ?? 'target') !== at) return null;
  const sc = Number(r.el('el.threat', 'scale', part.form) ?? 1), pr = String(r.el('el.threat', 'priority', part.form) ?? 'secondary');
  const k = e.th.scale * (Number.isFinite(sc) && sc > 0 ? sc : 1) * (pr === 'primary' ? 1.15 : pr === 'ambient' ? 0.85 : 1);
  return p.y - 46 * k;
}
/**
 * 世界状态图标（el.overlay = statusIcons，M12a-31）：挂点头顶横排一小行（间距 3），同一个点上有头顶血条（el.threat healthBar）时贴在血条上方
 * （原来按写死的偏移散在挂点四周，有一枚悬在空中）。颜色按角色（warn 警告色 / danger 危险色 / info 信息色 / buff 好色）。
 * 底座 = 选过的 cmp.badge（@badge → @el.overlay → 全局；没选 = none：无框，符号直接画成角色色 + 一圈描边）：roundel = 角色色圆章 + 白符号（外形 vis.silhouette@el.overlay），
 * medal / crest / crystal 是原来的徽章形（角色色底）；vis.iconStyle = pixel 时符号画成像素点阵；st.alert = blink 时 danger 类按模拟时钟闪烁（每秒两次，相位 0 时亮）。
 * 第 3 项层数 > 1 时右下角写小数字（opts.stack 的预留）
 */
/** 状态图标一行的几何（statusIcons 与 pointBox 共用）：图标表、格边长、间距、行中心 y、起点 x、外接框 */
function statusRow(e: ElCtx, p: { x: number; y: number }, at: Attach) {
  // 个数（M12b-68，dead-cells#27）：elx.count / el.overlay.count（1–3，没给时全部）；种类按内容包的 hud.statusIcons 依次取
  const list0 = DATA.statusIcons ?? STATUS_ICONS, list = list0.slice(0, Math.max(1, Math.min(list0.length, elCount(e, list0.length))));
  const c = S(e, 22), gap = S(e, 3), n = list.length, total = n * c + Math.max(0, n - 1) * gap;
  const yc = (threatBarTop(e, at, p) ?? p.y - S(e, 46)) - gap - c / 2, x0 = p.x - total / 2;
  return { list, c, gap, yc, x0, box: { x: x0, y: yc - c / 2, w: total, h: c } };
}
function statusIcons(e: ElCtx, p: { x: number; y: number }, at: Attach) {
  const { list, c, gap, yc, x0, box } = statusRow(e, p, at);
  // 思想气泡（el.overlay.statusStyle = thoughtBubble，M12b-19，cult-of-the-lamb#16）：一朵白色云形气泡装下这一行需求图标，下面两颗小尾巴圆点（信徒头顶的饿 / 病 / 想要什么）
  const thought = pickedStr(e, ownKey(e, 'statusStyle'), 'badge') === 'thoughtBubble';
  if (thought) {
    const g = e.g, pad = S(e, 6), q = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    drawBox(g, q, { bg: { solid: '#ffffff' }, shape: 'scallop', border: { width: Math.max(1, S(e, 1.2)), color: 'rgba(0,0,0,0.35)' } }, e.pal);
    g.save(); g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(1, S(e, 1));
    for (const [dx, dy, rr] of [[-0.12, 0.25, 4], [-0.2, 0.62, 2.5]] as const) { g.beginPath(); g.arc(p.x + q.w * dx, q.y + q.h + S(e, 4) + q.h * dy * 0.5, S(e, rr), 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.restore();
  }
  const eb = e.part('badge'), base = pickedStr(eb, 'cmp.badge', 'none');
  const pix = iconStyleOf(e) === 'pixel' && (!e.th.legacy || chosen(e, 'vis.iconStyle'));
  const blinkOff = e.v.list('st.alert').includes('blink') && Math.floor(simNow().t * 4) % 2 === 1;
  const noAid = pickedStr(e, 'typ.legibility', '') === 'none';
  const surf = resolveColor(e.th.surface, e.pal);
  list.forEach(([ch, role, stack], i) => {
    if (blinkOff && role === 'danger') return;
    const cx = x0 + c / 2 + i * (c + gap);
    const col = role === 'buff' ? e.good : role === 'warn' ? e.warn : role === 'info' ? e.th.roles.info : e.th.roles.danger;
    if (base !== 'none' && !thought) badge(e, cx, yc, c / 2, base === 'roundel' ? 'roundel' : 'crystal', '', { generic: true, color: col });
    const gc = base === 'none' ? col : onColorOf(col, surf);
    const halo = luminance(resolveColor(gc, e.pal)) < 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
    if (!(pix && drawPixelGlyph(e.g, ch, cx, yc, S(e, 12), gc, base === 'none' && !noAid ? halo : undefined))) {
      let o: TextOpts = { ...e.base, size: S(e, base === 'none' ? 15 : 12), weight: 800, color: gc };
      if (base === 'none' && !o.outline && !o.shadow && !o.glowColor && !noAid) o = { ...o, outline: { color: halo, width: 1.5 } };
      const w = W(e, ch, o);
      T(e, ch, cx - w / 2, yc - o.size * 0.75, o.size * 1.5, o);
    }
    // 层数（右下角小数字）：像素图标风格时用像素字体（M12b-19，dead-cells#8：像素数字 + 描边）
    if (stack && stack > 1) { const so = { ...e.small, size: S(e, 9), weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1.5 }, ...(pix ? { font: FONT_STACK.pixel, size: S(e, 11) } : {}) }, s = String(stack); T(e, s, cx + c / 2 - W(e, s, so), yc + c / 2 - S(e, 9), S(e, 12), so); }
  });
}

/* 世界标签（M12b-19，§2 的 el.worldLabel） */
/** 世界标签的点：场景投影的单位（最多 4 个），没有场景时兴趣点 + 两个近似位置 */
function labelPoints(e: ElCtx): { x: number; y: number }[] {
  const wv = e.noWorld ? null : worldNow(), all = wv?.all.filter((q) => q.on) ?? [];
  if (all.length) return all.slice(0, 4).map((q) => ({ x: q.x, y: q.y }));
  const p = attachPoint(e, attachFor(e));
  return [p, { x: p.x - S(e, 150), y: p.y + S(e, 40) }, { x: p.x + S(e, 160), y: p.y + S(e, 26) }];
}
/** 世界标签的数据（hud.worldLabels：[人口, 名字, 首都?]；没写时内容包的地名，演示人口 12 / 7 / 5 / 3，第一座是首都） */
const worldLabelsOf = (): [number, string, boolean?][] => DATA.worldLabels ?? (pack().world.places?.length ? pack().world.places!.map(([n]) => n) : [pack().world.region]).slice(0, 4).map((n, i) => [[12, 7, 5, 3][i % 4], n, i === 0] as [number, string, boolean]);
/**
 * 世界标签（el.worldLabel，M12b-19，civ6#9 / factorio#13）：挂在世界点上的名牌，先画在现有的几个点上（每座城一份的扇出等 M12c-01 的演员列表）——
 *   nameplate = 胶囊：左端人口数字（深色圆）+ 小型大写城名 + 首都星，底色 = 阵营色（col.coding 含 lineId 时类别色表，否则强调色）；
 *   banner = 竖幡：横杆 + 布幅，名字竖排（typ.direction 是竖排时，否则横排挂牌）；
 *   altIcons = 每个实体上叠一个内容图标（深色小方块 + 工具栏的符号，Factorio 的 Alt 模式；按住 Alt 整体切换 = M12c-15 的条件显隐）。
 * Godot：Label3D / Sprite3D 广告牌，或 SubViewport 贴图的 Control（见迁移说明）
 */
/**
 * 一块世界标签的几何（B6 审查修复 ⑥ / ㉒：draw 与 pointBox / pointBoxes 共用）：p = 单位点；nameplate 的胶囊宽按量出的城名（原来登记写死 160），
 * 竖幡 = 横杆 + 布幅 + 尾尖的外接框；整块夹在画面内 8 里（没有场景时的两个近似位置会伸出画面左边）——q = 画的点（夹过的），box = 画出的范围
 */
function labelGeom(e: ElCtx, f: string, p0: { x: number; y: number }, i: number, list: [number, string, boolean?][], vertical: boolean) {
  const [pop, name, cap] = list.length ? list[i % list.length] : [0, '', false];
  const col = lineColor(e, i) ?? (i === 0 ? e.accent : e.accent2);
  const tools = DATA.tools.length ? DATA.tools : [['⚙', '']];
  let box: Rect, extra: { label: string; no: TextOpts; o: TextOpts; w: number; h: number; star: string } = { label: '', no: e.small, o: e.small, w: 0, h: 0, star: '' };
  if (f === 'altIcons') box = { x: p0.x - S(e, 11), y: p0.y - S(e, 44), w: S(e, 22), h: S(e, 22) };
  else if (f === 'banner') {
    const bw = S(e, 34), top = p0.y - S(e, 140), chars = [...name], o = { ...e.title, size: S(e, 14), color: onColorOf(col, '#000'), ...displayFor(e, 'nameplate') };
    const h = vertical ? Math.max(S(e, 60), chars.length * S(e, 18) + S(e, 18)) : S(e, 30), w = vertical ? bw : Math.max(bw, W(e, name, o) + S(e, 16));
    const x0 = Math.min(p0.x - w / 2, p0.x - bw * 0.7), x1 = Math.max(p0.x + w / 2, p0.x + bw * 0.7);
    box = { x: x0, y: top - S(e, 2), w: x1 - x0, h: S(e, 2) + S(e, 2) + h + S(e, 10) };
    extra = { ...extra, o, w, h };
  } else {
    const no = { ...e.small, size: S(e, 11), weight: 700, letterSpacing: 0.6, color: onColorOf(col, '#000') }, label = name.toUpperCase(), star = cap ? '★ ' : '';
    const tw = W(e, star + label, no), h = S(e, 22), w = tw + S(e, 40);
    box = { x: p0.x - w / 2, y: p0.y - S(e, 56), w, h };
    extra = { ...extra, label, no, w, h, star };
  }
  const R = e.R, m = S(e, 8), dx = clampTo(box.x, R.x + m, R.x + R.w - m - box.w) - box.x, dy = clampTo(box.y, R.y + m, R.y + R.h - m - box.h) - box.y;
  return { q: { x: p0.x + dx, y: p0.y + dy }, box: { ...box, x: box.x + dx, y: box.y + dy }, pop, name, cap, col, icon: tools[i % tools.length][0], ...extra };
}
const clampTo = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.max(lo, Math.min(hi, v)));
const labelVertical = (e: ElCtx) => /vertical|tb/i.test(e.r.str('typ.direction', 'horizontal'));
const labelGeoms = (e: ElCtx) => { const list = worldLabelsOf(), v = labelVertical(e), f = e.forms[0]; return labelPoints(e).map((p, i) => labelGeom(e, f, ptShiftAt(e, i, p), i, list, v)); };
registerElement({
  id: 'el.worldLabel', forms: ['nameplate', 'banner', 'altIcons'], anchor: 'center', attach: 'poi',
  points: { nameplate: 'poi', banner: 'poi', altIcons: 'poi' },
  // 名牌类：画在点上时把已经登记的世界标记（交互提示、头顶血条……）也当障碍，排在它们之后推开（B6 审查修复 ㉒：默认挂兴趣点，第一块原来压在 el.interact 上）
  worldYield: true,
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  // 第一块报 pointBox（推开 / 藏按它），其余几块跟着登记（B6 审查修复 ⑥ / ㉒）
  pointBox: (e) => labelGeoms(e)[0]?.box ?? null,
  pointBoxes: (e) => labelGeoms(e).slice(1).map((q) => q.box),
  draw: (e) => {
    const f = e.forms[0], g = e.g, vertical = labelVertical(e);
    for (const L of labelGeoms(e)) {
      const p = L.q, col = L.col;
      if (f === 'altIcons') {
        const q = L.box;
        drawBox(g, q, { bg: { solid: 'rgba(20,22,26,0.82)' }, border: { width: Math.max(1, S(e, 1)), color: withAlpha('#ffffff', 0.5) }, radius: S(e, 3) }, e.pal);
        icon(e, L.icon, q.x + q.w / 2, q.y + q.h / 2, S(e, 13), '#ffffff');
        continue;
      }
      if (f === 'banner') {
        const bw = S(e, 34), top = p.y - S(e, 140), chars = [...L.name], o = L.o, h = L.h, w = L.w;
        g.save(); g.strokeStyle = '#3a2a1a'; g.lineWidth = Math.max(2, S(e, 3)); g.beginPath(); g.moveTo(p.x - bw * 0.7, top); g.lineTo(p.x + bw * 0.7, top); g.stroke(); g.restore();
        const q = { x: p.x - w / 2, y: top + S(e, 2), w, h };
        drawBox(g, q, { bg: { solid: col }, border: { width: Math.max(1, S(e, 1.2)), color: 'rgba(0,0,0,0.5)' } }, e.pal);
        g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(q.x, q.y + q.h); g.lineTo(q.x + q.w / 2, q.y + q.h + S(e, 10)); g.lineTo(q.x + q.w, q.y + q.h); g.closePath(); g.fill(); g.restore();
        if (vertical) chars.forEach((ch, k) => T(e, ch, p.x - W(e, ch, o) / 2, q.y + S(e, 8) + k * S(e, 18), S(e, 18), o));
        else T(e, L.name, q.x + (q.w - W(e, L.name, o)) / 2, q.y, q.h, o);
        continue;
      }
      // 名牌胶囊：左端人口圆 + 城名 + 首都星
      const q = L.box, h = L.h;
      drawBox(g, q, { bg: { solid: col }, radiusPct: 50, border: { width: Math.max(1, S(e, 1)), color: 'rgba(0,0,0,0.45)' } }, e.pal);
      g.save(); g.fillStyle = 'rgba(14,16,20,0.85)'; g.beginPath(); g.arc(q.x + h / 2, q.y + h / 2, h / 2 - S(e, 1.5), 0, Math.PI * 2); g.fill(); g.restore();
      const ps = String(L.pop), po = { ...e.small, size: S(e, 11), weight: 800, color: '#ffffff' };
      drawNumber(e, ps, q.x + h / 2 - numberWidth(e, ps, po) / 2, q.y, h, po);
      T(e, L.star + L.label, q.x + h + S(e, 6), q.y, h, L.no);
    }
  },
});

/* 按键提示 */
registerElement({
  id: 'el.prompt', forms: ['legend', 'list', 'contextual', 'touchButtons', 'hotkeyBadge'], anchor: 'br',
  points: { contextual: 'poi' },
  // 图例宽按实际画出来的宽算（M12a-34：原来固定 420、键宽按键名估，锚在左下时整条漂到画面约 20% 处，触摸板键 / 视图键后面空出一大段）
  size: (e) => (e.forms[0] === 'list' ? { w: S(e, 150), h: S(e, 4 * 28) } : e.forms[0] === 'touchButtons' ? { w: Math.max(S(e, 200), tap(e) * 2.6), h: Math.max(S(e, 170), tap(e) * 2.3) } : e.forms[0] === 'hotkeyBadge' || e.forms[0] === 'contextual' ? { w: S(e, 10), h: S(e, 10) } : { w: legendItems(e).total, h: S(e, 30) }),
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    // 键帽宽度按 button() 实际用的字（正文粗体）量（M8b：原来按小字量，字放大后"Tab"冒出键帽）
    // 按键图标按 ix.glyphs（M10：键帽 / Xbox / PS / Nintendo / 触屏 / 文字）
    // 包给提示指定了手柄按钮（第三项）时手柄图标画它；肩键 / 扳机是长条，按按钮判断宽度，没指定时按键盘键判断（原样）
    const kh = Math.max(S(e, 22), LH(e, e.base, 1.3));
    const keyBox = (x: number, y: number, k: string, pad?: PadButton) => keyCap(e, x, y, kh, k, pad);
    switch (f) {
      case 'list':
        promptsOf(e).forEach(([k, l, pad], i) => { const w = keyBox(a.x, a.y + i * S(e, 28), k, pad); T(e, l, a.x + w + S(e, 8), a.y + i * S(e, 28), S(e, 22), e.small); });
        return;
      case 'contextual': {
        const [key, act, pad] = DATA.pickPrompt;
        const p = attachPoint(e, attachFor(e)); const w = keyBox(p.x - S(e, 40), p.y - S(e, 30), key, pad); T(e, act, p.x - S(e, 40) + w + S(e, 6), p.y - S(e, 30), S(e, 22), { ...e.small, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } });
        return;
      }
      case 'touchButtons': {
        // 右下的触屏大按钮 + 左下虚拟摇杆
        // 触屏按钮按 ix.touchSize 放大（小按钮直径也不低于它）
        const big = Math.max(S(e, 64), tap(e) * 1.25), sm = Math.max(big * 0.34, tap(e) / 2);
        g.fillStyle = withAlpha('#000', 0.3); g.strokeStyle = withAlpha('#fff', 0.7); g.lineWidth = 2;
        // 三个按钮的符号（主动作、技能、切换）在包里
        const [g0, g1, g2] = DATA.touchGlyphs;
        const btns: [number, number, number, string][] = [[a.x + a.w - big / 2, a.y + a.h - big / 2, big / 2, g0], [a.x + a.w - big - sm * 1.3, a.y + a.h - big * 0.4, sm, g1], [a.x + a.w - big * 0.85, a.y + a.h - big - sm * 1.3, sm, g2]];
        for (const [x, y, rr, ch] of btns) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.stroke(); icon(e, ch, x, y, rr * 0.9, '#fff'); logTarget(g, { x: x - rr, y: y - rr, w: rr * 2, h: rr * 2 }, ch); }
        const jx = e.R.x + S(e, 110), jy = e.R.y + e.R.h - S(e, 110);
        g.beginPath(); g.arc(jx, jy, S(e, 62), 0, Math.PI * 2); g.fill(); g.stroke();
        logTarget(g, { x: jx - S(e, 62), y: jy - S(e, 62), w: S(e, 124), h: S(e, 124) }, '摇杆');
        g.fillStyle = withAlpha('#fff', 0.6); g.beginPath(); g.arc(jx + S(e, 14), jy - S(e, 10), S(e, 26), 0, Math.PI * 2); g.fill();
        return;
      }
      case 'hotkeyBadge': return;
      default: {
        // 图例按锚点对齐（M12a-18）：锚在右边从右缘往左排（原来的），左边从左缘起、中间居中；每段的键宽 = keyCap 实际画的宽（M12a-34）
        const L = legendItems(e), total = L.total;
        let x = e.align === 'right' ? a.x + a.w : alignX(e, a, Math.min(a.w, total)) + Math.min(a.w, total);
        for (const it of [...L.items].reverse()) {
          x -= it.lw; T(e, it.l, x, a.y + S(e, 4), S(e, 22), e.small);
          x -= S(e, 6); x -= it.kw;
          // 平移提示并进图例（M12a-34）：符号直接写，不画键帽
          if (it.k === PAN_KEY) T(e, it.k, x, a.y + S(e, 4), S(e, 22), { ...e.small, color: withAlpha(e.text, 0.85) }); else keyBox(x, a.y + S(e, 4), it.k, it.pad);
          x -= S(e, 16);
        }
      }
    }
  },
});

/**
 * 按键图例的内容（M12b-61，textFor('prompts')）：按界面组取——菜单页写确定 / 返回 / 切换、地图写设置路线 / 选择 / 远近、对话写继续 / 自动 / 记录、
 * 回合制战斗写确认 / 返回 / 加成……（black-myth#10、elden-ring#8、control#28、forza-horizon-5#16、persona5#26、octopath#14）；局内 HUD 仍是内容包的 hud.prompts
 */
const promptsOf = (e: ElCtx) => {
  const all = textFor('prompts', e.r) ?? DATA.prompts;
  if (!QUALITY.on || !isHudCanvas(e.g)) return all;
  // 每屏自己的按键提示（审查修复 E 视觉 ⑥）：菜单组的通用图例（确定 / 返回 / 切换 / 排序）在没有页签、没有可排序列表的屏上只留用得上的——
  // 标题页只留「确定」（没有可返回的地方），暂停 / 结算留「确定 / 返回」；右上角已经画了「ESC 返回」的屏不再在图例里重复返回
  const scr = e.r.str('cnt.screen', ''), sub = e.r.str('cnt.subtype', '');
  const keep = scr === 'screen.title' ? ['south'] : sub === 'pause' || sub === 'settle' ? ['south', 'east'] : null;
  const closeChip = e.r.str('ix.close', '') === 'keyGlyph';
  const out = all.filter(([, , pad]) => (!keep || keep.includes(String(pad))) && !(closeChip && pad === 'east'));
  return out.length ? out : all;
};

/** 平移提示（lay.overflow = pan）并进按键图例时那一项的符号 */
const PAN_KEY = '✥';
/**
 * 按键图例的各段（M12a-34）：键宽 = keyCap 实际画的宽（keyCapWidth）、字宽、总宽（段间 16、键与字间 6）。
 * 显式选了 lay.overflow = pan 且图例在画面上时，「✥ 拖动查看」并成图例的最后一项（模板的平移提示不再另画在右下）
 */
function legendItems(e: ElCtx): { items: { k: string; l: string; pad?: PadButton; kw: number; lw: number }[]; total: number } {
  const kh = Math.max(S(e, 22), LH(e, e.base, 1.3));
  const items = promptsOf(e).map(([k, l, pad]) => ({ k, l, pad, kw: keyCapWidth(e, kh, k, pad), lw: W(e, l, e.small) }));
  if (panInLegend(e)) items.push({ k: PAN_KEY, l: '拖动查看', pad: undefined, kw: W(e, PAN_KEY, e.small), lw: W(e, '拖动查看', e.small) });
  return { items, total: items.reduce((s, it) => s + it.kw + S(e, 6) + it.lw, 0) + S(e, 16) * Math.max(0, items.length - 1) };
}
/** 平移提示要不要并进图例：皮肤之后的层显式选了 lay.overflow = pan、lay.pageIndicator 没被设成 none、而且在模板里（M12a-34） */
export const panInLegend = (e: ElCtx) => e.r.str('lay.overflow', '') === 'pan' && postSkinKey(e, 'lay.overflow') && e.r.str('lay.pageIndicator', '') !== 'none' && e.r.str('cnt.screen', 'screen.hud') !== 'screen.hud';

/* 字幕 */
const SUB_FORMS = new Set(['plain', 'boxed', 'speakerColor', 'bubble', 'lineOnly', 'quoteCard']);
/**
 * 字幕实际的画法（M12a-32）：显式给的 el.subtitle.form → cmp.dialogBox（bar = boxed、bubble = bubble；cmp.dialogBox 的兜底就是 bar，所以什么都不设时仍是原来的底条）→ plain
 */
function subtitleForm(e: ElCtx): string {
  if (elGiven(e, 'form') && SUB_FORMS.has(e.forms[0])) return e.forms[0];
  const db = cmp(e, 'cmp.dialogBox', '');
  // 对话框版式（M12b-21 的新取值）只在对话类模板的容器上画；字幕元素自己画时照旧是底条（B9 审查修复 ② / ⑯：原来落到 plain，选了新版式反而丢了底条）
  return db === 'bar' || DLG_BOXES.has(db) ? 'boxed' : db === 'bubble' ? 'bubble' : SUB_FORMS.has(e.forms[0]) ? e.forms[0] : 'plain';
}
/** cmp.dialogBox 的对话框版式取值（M12b-21；screen.ts 的 DLG_NEW 就是它） */
export const DLG_BOXES = new Set(['offsetBox', 'framedBox', 'topBox', 'splitPortrait', 'transcript', 'codec', 'polygon']);
/**
 * 字幕的字（M12a-32）：字号 16，字色 = col.text@el.subtitle / @dialog（显式给了）→ 无底的画法再看皮肤之后的层给的全局 col.text（Obra Dinn 两色调色板的青白字）→ 白（原来写死）；
 * 底条 / 气泡换成部件面板时默认用面板字色。无底画法的描边：typ.legibility 显式给了（作用域或皮肤之后的层）就按它（none = 不描边），否则原来的 2px 深色（字色深时换浅色）
 */
function subtitleStyle(e: ElCtx, f: string, panelText?: string): TextOpts {
  const ed = e.part('dialog');
  const sct = scopedStr(ed, 'col.text'), scoped = sct !== null ? resolveColor(sct || '#fff', ed.pal) : null;
  const bare = f === 'plain' || f === 'speakerColor' || f === 'lineOnly';
  const color = scoped ?? panelText ?? (bare && postSkinKey(e, 'col.text') ? e.text : '#fff');
  const lk = chosenKey(e, 'typ.legibility'), legSet = !!lk && (lk.includes('@') || postSkinKey(e, lk)), legNone = legSet && e.r.str(lk!, '') === 'none';
  const halo = luminance(resolveColor(color, e.pal)) < 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
  const o: TextOpts = { ...e.base, size: S(e, 16), color };
  if (!bare) return { ...o, outline: undefined };
  if (legNone) return { ...o, outline: undefined, shadow: undefined, glowColor: undefined };
  if (legSet && (o.outline || o.shadow || o.glowColor)) return o;
  return { ...o, outline: { color: halo, width: 2 } };
}
/**
 * 字幕的台词（lineOnly 不写说话人前缀，M12a-32）与逐字显现。M12b-61：cnt.textLength = word 时台词是内容包的单词感叹（textFor('bark')，hi-fi-rush#19 的「Whoa...」），
 * 不写说话人；el.subtitle.untranslated 开着时写外语原文（textFor('original') 的第 1 项，obra-dinn#34：语言本身是线索）
 */
function subtitleText(e: ElCtx, f: string): { who: string; line: string; full: string; shown: string } {
  const { who, line } = spokenLine(e.r);
  // 说话人前缀与底条拆开（el.subtitle.speaker，M12b-21，hollow-knight#34）：prefix = 总写「说话人：」（lineOnly 也写）、none = 不写（boxed 照样有底条）；没选 = 原来（lineOnly 不写，其余写）
  const sp = elChosen(e, 'speaker') ? String(elOf(e, 'speaker') ?? 'auto') : 'auto';
  const bare = !who || (sp === 'none' ? true : sp === 'prefix' ? false : f === 'lineOnly');
  const full = bare ? line : `${who}：${line}`, pre = bare ? 0 : who.length + 1;
  const rv = simNow().reveal;
  return { who, line, full, shown: rv < 1 ? full.slice(0, Math.max(pre, Math.floor([...full].length * rv))) : full };
}
/** 挂在说话人身上的字幕与气泡（M12a-15 / 32）：宽按台词（最宽 0.5 屏且不超过 420），超出折行；气泡下面留出尾巴 */
function subtitleBlock(e: ElCtx, f: string) {
  const o = subtitleStyle(e, f), { full } = subtitleText(e, f);
  const padX = f === 'bubble' || f === 'boxed' ? S(e, 12) : S(e, 4), padY = S(e, 8), tail = f === 'bubble' ? S(e, 10) : 0;
  const maxW = Math.max(S(e, 120), Math.min(S(e, 420), e.R.w * 0.5));
  const lines = wrapLines(e.tx, full, maxW - padX * 2, o);
  const lh = LH(e, o, 1.4), tw = Math.max(...lines.map((l) => W(e, l, o)));
  return { lines, lh, padX, padY, tail, w: tw + padX * 2, h: lines.length * lh + padY * 2 + tail };
}
registerElement({
  id: 'el.subtitle', forms: ['plain', 'boxed', 'speakerColor', 'bubble', 'lineOnly', 'quoteCard'], anchor: 'bc',
  // 挂在说话人身上时（elx.attachTo，M12a-15）默认在头顶
  attachSide: 'above',
  // 说话人小像（cnt.companion = avatar，M12a-36）：字幕旁一张方形头像，元素加高到装得下它；气泡 / 挂在世界点上的字幕按台词定宽（M12a-32）
  size: (e) => {
    const f = subtitleForm(e);
    if (f === 'bubble' || e.attach) { const b = subtitleBlock(e, f); return { w: b.w, h: b.h }; }
    // 引文字卡（quoteCard，M12b-30，civ6#40）
    if (f === 'quoteCard') return quoteCardSize(e);
    // 贴满屏宽（elx.span = full，M12b-30，civ6#39）
    return { w: spanFull(e) ? e.R.w : Math.min(S(e, 620), e.R.w * 0.8), h: e.r.str('cnt.companion', 'none') === 'avatar' ? S(e, 64) : S(e, 40) };
  },
  draw: (e, a) => {
    const f = subtitleForm(e), ed = e.part('dialog'), boxP = (f === 'boxed' && dialogScoped(ed)) || f === 'bubble';
    if (f === 'quoteCard') { drawQuoteCard(e, a); return; }
    const t = subtitleText(e, f);
    // 气泡 / 挂在世界点上：按台词折行的一块（气泡带尾巴，尾巴指向挂点，没挂时朝下）
    if (f === 'bubble' || e.attach) {
      const b = subtitleBlock(e, f), body = { ...a, h: a.h - b.tail };
      if (f === 'bubble') {
        const st = { ...ed.t.panel, ...(ed.t.dialog ?? {}), radiusPct: 30 };
        drawBox(e.g, body, st, ed.pal);
        const p = e.attach ? attachPoint(e, e.attach) : null, cx = a.x + a.w / 2, tipX = p ? Math.max(a.x + S(e, 14), Math.min(a.x + a.w - S(e, 14), p.x)) : cx;
        const bg = st.bg && 'solid' in st.bg ? resolveColor(st.bg.solid, ed.pal) : resolveColor(ed.th.surface, ed.pal);
        e.g.fillStyle = bg; e.g.beginPath(); e.g.moveTo(cx - S(e, 8), body.y + body.h - 1); e.g.lineTo(cx + S(e, 8), body.y + body.h - 1); e.g.lineTo(tipX, body.y + body.h + b.tail); e.g.closePath(); e.g.fill();
      } else if (f === 'boxed') { if (boxP) panel(ed, body, true); else { e.g.fillStyle = 'rgba(0,0,0,0.6)'; e.g.fillRect(body.x, body.y, body.w, body.h); logBoxRect(e.g, body, 'rgba(0,0,0,0.6)'); } }
      const o = subtitleStyle(e, f, boxP ? ed.text : undefined);
      let shown = t.shown.length;
      b.lines.forEach((l, i) => {
        const part = l.slice(0, Math.max(0, shown)); shown -= l.length;
        if (!part) return;
        const y = body.y + b.padY + i * b.lh, lw = W(e, l, o), x = body.x + (body.w - lw) / 2;
        if (f === 'speakerColor' && t.who && i === 0 && part.startsWith(`${t.who}：`)) { const nw = W(e, `${t.who}：`, o); T(e, `${t.who}：`, x, y, b.lh, { ...o, color: e.accent }); T(e, part.slice(t.who.length + 1), x + nw, y, b.lh, o); }
        else T(e, part, x, y, b.lh, o);
      });
      return;
    }
    const o = subtitleStyle(e, f, boxP ? ed.text : undefined);
    const s = t.shown, w = W(e, s, o);
    // 头像在字幕的左边（lay.focalSide = right 时右边），头像 + 字整体居中
    const pv = e.r.str('cnt.companion', 'none') === 'avatar', ps = pv ? a.h - S(e, 8) : 0, pg = pv ? S(e, 10) : 0, right = e.r.str('lay.focalSide', 'left') === 'right';
    const x0 = a.x + a.w / 2 - (w + ps + pg) / 2, tx = pv && !right ? x0 + ps + pg : x0;
    // 字幕底条（boxed）：对白框部件 dialog / @el.subtitle 上写了底与边（col.surface / vis.opacity / vis.stroke……，M12a-32）时画部件面板（Persona 的实心黑底 + 白描边），
    // 否则原来的 60% 黑底条
    // 对白条的立体（M12b-21 顺延的 persona5#8：背后错位垫一块红 / 白）：@dialog 上选过 vis.depth / vis.depthColor 时按大面板画（带投影），原来小面板一律不带阴影
    if (f === 'boxed') { const br = { x: x0 - S(e, 10), y: a.y + S(e, 4), w: w + ps + pg + S(e, 20), h: a.h - S(e, 8) }; if (boxP) panel(ed, br, !(scopedStr(ed, 'vis.depth') || scopedStr(ed, 'vis.depthColor'))); else { e.g.fillStyle = 'rgba(0,0,0,0.6)'; e.g.fillRect(br.x, br.y, br.w, br.h); logBoxRect(e.g, br, 'rgba(0,0,0,0.6)'); } }
    if (pv) portraitBox(e, { x: right ? x0 + w + pg : x0, y: a.y + S(e, 4), w: ps, h: ps - S(e, 0) });
    // 说话人着色（speakerColor）：名字 = 字幕的强调色（col.accent@el.subtitle），台词 = 上面的字色（col.text@el.subtitle，Cyberpunk 红橙名字 + 浅青台词）
    if (f === 'speakerColor' && t.who) { const ww = W(e, `${t.who}：`, o); T(e, `${t.who}：`, tx, a.y, a.h, { ...o, color: e.accent }); T(e, s.slice(t.who.length + 1), tx + ww, a.y, a.h, o); return; }
    T(e, s, tx, a.y, a.h, o);
  },
});

/* 主按钮（行动号召） */
registerElement({
  // 新画法（M12b-17）：triple / splitCorners / stack / smallSquare / confirmBack / edgeTab / textWithSubline 见 ctaNewSize / drawCtaNew
  id: 'el.cta', forms: ['wide', 'round', 'dual', 'shutter', 'triple', 'splitCorners', 'stack', 'smallSquare', 'confirmBack', 'edgeTab', 'textWithSubline'], anchor: 'bc',
  size: (e) => {
    if (CTA_NEW.has(e.forms[0])) return ctaNewSize(e, e.forms[0]);
    const { start, back } = ctaText(e.r);
    return e.forms[0] === 'round' ? { w: Math.max(S(e, 96), tap(e)), h: Math.max(S(e, 96), tap(e)) } : e.forms[0] === 'dual' ? { w: fitW(e, S(e, 360), [[`${back}${start}`, { ...e.base, weight: 700 }]], S(e, 80)), h: Math.max(S(e, 52), tap(e)) } : { w: fitW(e, S(e, 300), [[start, { ...e.base, weight: 700 }]], S(e, 40)), h: Math.max(S(e, 56), tap(e)) };
  },
  draw: (e, a) => {
    // 回合禁用（st.cooldown@el.cta = turnLocked，M12b-01，slay-the-spire#27）：非本方回合整块去色压暗，字换成内容包的 hud.turnWait（没写时「敌方回合」）
    const turn = pickedStr(e.part('button'), 'st.cooldown', '') === 'turnLocked';
    if (!turn) { ctaDraw(e, a, ctaText(e.r)); return; }
    const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx], wait = DATA.turnWait ?? '敌方回合', t = ctaText(e.r);
    for (const c of ctxs) { c.save(); c.filter = 'grayscale(1) brightness(0.72)'; }
    try { ctaDraw(e, a, { ...t, start: wait, go: wait }); } finally { for (const c of ctxs) c.restore(); }
  },
});

/** el.cta 的画法本体（M12b-01 起抽出来：回合禁用时换字、整块去色再画一遍） */
function ctaDraw(e: ElCtx, a: Rect, labels: ReturnType<typeof ctaText>) {
    const f = e.forms[0], g = e.g, { start, back, go } = labels;
    if (CTA_NEW.has(f)) { drawCtaNew(e, a, f, labels); return; }
    // 动作角色色（M12a-35）：开始 / 下一步是确认类（col.semantic = greenRed 时绿……，col.semantic@el.cta / col.actionColors 可单独给），没有时强调色（原来的）
    const eb = e.part('button'), roleC = eb.t.button?.roles.confirm, fillC = roleC ?? e.accent;
    if (f === 'round') {
      // 大圆钮（M12a-35）：ast.frame / ast.frameMat@el.cta（或 @button）写了时画一圈环形外框（frameMat 的材质带），vis.gloss@el.cta 写了时画裁成圆的玻璃高光；
      // 都没写时是原来的平涂圆 + 白圈（全局的外框 / 光泽不套到这颗钮上）。齿轮表圈等新外框见 M12b-50
      const scoped = (k: string) => eb.v.key(k).includes('@');
      const frame = scoped('ast.frame') || scoped('ast.frameMat') ? eb.t.panel.frame : undefined, gloss = scoped('vis.gloss') ? eb.t.panel.gloss : undefined;
      // 圆钮在拿到的矩形里按锚点对齐（M12a-18：矩形比圆宽时——同锚点等宽——圆贴锚点那一边，不拉成椭圆）
      const s = Math.min(a.w, a.h), c = { x: a.w > a.h ? alignX(e, a, s) : a.x, y: a.y + (a.h - s) / 2, w: s, h: s };
      if (frame || gloss) drawBox(g, c, { bg: { solid: fillC }, circle: true, frame, gloss, border: frame ? undefined : { width: 3, color: withAlpha('#fff', 0.7) } }, e.pal);
      else {
        g.fillStyle = fillC; g.beginPath(); g.arc(c.x + c.w / 2, c.y + c.h / 2, s / 2, 0, Math.PI * 2); g.fill(); g.strokeStyle = withAlpha('#fff', 0.7); g.lineWidth = 3; g.stroke();
        // 圆钮进绘制记录（按内切方块；B2 审查 ⑭：原来没登记，钮上的字被当成「没有底的字」，衬底在圆后面垫了一块上下伸出去的圆角方块）
        logBoxRect(g, { x: c.x + s * 0.15, y: c.y + s * 0.15, w: s * 0.7, h: s * 0.7 }, fillC);
      }
      logTarget(g, c, go);
      const to = roleC ? onAccent(e, e.title, onColorOf(roleC, resolveColor(e.th.surface, e.pal))) : { ...e.title, color: '#fff' };
      // 只画图标（cmp.button@el.cta = icon，M12b-50，civ6#1：玻璃球里只有随待办切换的图标、不写字）：图标取内容包的 hud.cta.icon（按界面的变体写，
      // 战棋包的局内 HUD = ⚔ 待下令；B4 审查修复：原来写死 ▶），没写时 ▶。Godot 侧是同一个字段换 TextureRect
      if (cmpPicked(eb, 'cmp.button', 'text') === 'icon') { icon(e, labels.icon ?? '▶', c.x + c.w / 2, c.y + c.h / 2, s * 0.36, to.color); return; }
      T(e, go, c.x + c.w / 2 - W(e, go, to) / 2, a.y, a.h, to);
      return;
    }
    if (f === 'dual') { button(e, { x: a.x, y: a.y, w: a.w * 0.38, h: a.h }, back, 'back'); button(e, { x: a.x + a.w * 0.42, y: a.y, w: a.w * 0.58, h: a.h }, start, 'confirm'); return; }
    if (f === 'shutter') {
      g.save(); g.beginPath(); g.moveTo(a.x + S(e, 18), a.y); g.lineTo(a.x + a.w, a.y); g.lineTo(a.x + a.w - S(e, 18), a.y + a.h); g.lineTo(a.x, a.y + a.h); g.closePath(); g.fillStyle = fillC; g.fill();
      g.clip(); g.fillStyle = withAlpha('#fff', 0.18); for (let x = a.x; x < a.x + a.w; x += S(e, 14)) g.fillRect(x, a.y, S(e, 5), a.h); g.restore();
      const so = { ...e.title, size: S(e, 20), italic: true }, to = roleC ? onAccent(e, so, onColorOf(roleC, resolveColor(e.th.surface, e.pal))) : { ...so, color: '#fff' };
      T(e, start, a.x + a.w / 2 - W(e, start, to) / 2, a.y, a.h, to);
      return;
    }
    button(e, a, start, 'confirm');
}

/* ---------------- 行动号召的新画法（M12b-17） ---------------- */
/**
 * el.cta.form 的新画法：triple 三联钮（主 / 中间工具组内嵌两颗小钮 / 危险色副钮，balatro#17）、splitCorners 分角双钮（返回在左端、出发在右端，slay-the-spire#15）、
 * stack 竖排钮组（暗底小面板里两条同宽按钮 + 底部小字，xcom2#18）、smallSquare 小方钮（OK，stardew#26）、confirmBack 箭头钮对（返回 = 左箭头在左端、确认 = 右箭头在右端，factorio#5）、
 * edgeTab 贴边页签钮（左上整条斜切；在模板按钮行里挂到容器右下边外沿，into-the-breach#30）、textWithSubline 带副行的按钮（第二行小字写代价，civ6#32）。
 * 字：主 = 内容包的 hud.cta.start、副 = back、副行 = hud.cta.sub（没写时主货币 × 120）、中间工具组 = hud.cta.group（没写时 排序 / 点数 / 花色）、竖排钮组的小字 = hud.cta.note
 */
export const CTA_NEW = new Set(['triple', 'splitCorners', 'stack', 'smallSquare', 'confirmBack', 'edgeTab', 'textWithSubline']);
/** 在模板按钮行里要拆成两颗、分到两端的画法（screen.ts rowPlan：按钮行按 split 对齐） */
export const CTA_SPLIT = new Set(['splitCorners', 'confirmBack']);
const ctaGroup = (l: ReturnType<typeof ctaText>): [string, string, string] => l.group ?? ['排序', '点数', '花色'];
const ctaSub = (l: ReturnType<typeof ctaText>) => l.sub ?? `${DATA.res[0][0]} 120`;
function ctaNewSize(e: ElCtx, f: string): { w: number; h: number } {
  const l = ctaText(e.r), bo = { ...e.base, weight: 700 }, bh = Math.max(S(e, 48), tap(e)), tw = (s: string) => W(e, s, bo) + S(e, 40);
  switch (f) {
    case 'triple': { const [g0, g1, g2] = ctaGroup(l); return { w: tw(l.start) + Math.max(tw(g0), W(e, g1, e.small) + W(e, g2, e.small) + S(e, 44)) + tw(l.back) + S(e, 20), h: Math.max(S(e, 64), tap(e) + S(e, 12)) }; }
    case 'splitCorners': case 'confirmBack': return { w: Math.max(tw(l.back) + tw(l.start) + S(e, 60), e.R.w * 0.86), h: bh };
    case 'stack': { const w = Math.max(S(e, 200), tw(l.start), tw(l.back)) + S(e, 20); return { w, h: bh * 2 + S(e, 8) + S(e, 20) + (l.note ? LH(e, e.small) : 0) }; }
    case 'smallSquare': { const s = Math.max(S(e, 44), tap(e)); return { w: s, h: s }; }
    case 'edgeTab': return { w: tw(l.start) + S(e, 24), h: Math.max(S(e, 42), tap(e)) };
    case 'textWithSubline': return { w: Math.max(S(e, 220), tw(l.start), W(e, ctaSub(l), e.small) + S(e, 40)), h: Math.max(S(e, 56), tap(e), LH(e, bo, 1.3) + LH(e, e.small, 1.2) + S(e, 8)) };
    default: return { w: S(e, 240), h: bh };
  }
}
function drawCtaNew(e: ElCtx, a: Rect, f: string, l: ReturnType<typeof ctaText>) {
  const bh = Math.min(a.h, Math.max(S(e, 48), tap(e))), cy = a.y + a.h / 2, bo = { ...e.base, weight: 700 }, tw = (s: string) => W(e, s, bo) + S(e, 40);
  switch (f) {
    case 'triple': {
      // 左主钮（确认色）、中间工具组（面板里一行组名 + 两颗小钮）、右副钮（危险色）
      const [g0, g1, g2] = ctaGroup(l), w0 = tw(l.start), w2 = tw(l.back), gw = a.w - w0 - w2 - S(e, 20), y = cy - bh / 2;
      button(e, { x: a.x, y, w: w0, h: bh }, l.start, 'confirm');
      const gr = { x: a.x + w0 + S(e, 10), y: a.y, w: gw, h: a.h };
      panel(e.part('button'), gr, true, {}, 'control');
      const lo = { ...e.small, weight: 700, color: e.text };
      T(e, g0, gr.x + gr.w / 2 - W(e, g0, lo) / 2, gr.y + S(e, 2), LH(e, lo), lo);
      const sh = Math.max(S(e, 22), a.h - LH(e, lo) - S(e, 8)), sw = (gr.w - S(e, 18)) / 2, sy = gr.y + gr.h - sh - S(e, 4);
      button(e, { x: gr.x + S(e, 6), y: sy, w: sw, h: sh }, g1, 'utility');
      button(e, { x: gr.x + S(e, 12) + sw, y: sy, w: sw, h: sh }, g2, 'utility');
      button(e, { x: a.x + a.w - w2, y, w: w2, h: bh }, l.back, 'danger');
      return;
    }
    case 'splitCorners': case 'confirmBack': {
      // 返回在左端、出发 / 确认在右端（confirmBack = 左箭头 / 右箭头外形）
      const arrow = f === 'confirmBack', y = cy - bh / 2;
      button(e, { x: a.x, y, w: tw(l.back) + (arrow ? bh * 0.4 : 0), h: bh }, l.back, 'back', true, 'button', arrow ? 'arrowLeft' : undefined);
      const w1 = tw(l.start) + (arrow ? bh * 0.4 : 0);
      button(e, { x: a.x + a.w - w1, y, w: w1, h: bh }, l.start, 'confirm', true, 'button', arrow ? 'arrowRight' : undefined);
      return;
    }
    case 'stack': {
      // 暗底小面板（描边 = 危险色细框）里竖排两条同宽按钮（主在上、副在下）+ 底部小字
      drawBox(e.g, a, { bg: { solid: withAlpha('#08090c', 0.82) }, border: { width: Math.max(1, S(e, 1.5)), color: e.bad }, radius: S(e, 3) }, e.pal);
      const p = S(e, 10), w = a.w - p * 2;
      button(e, { x: a.x + p, y: a.y + p, w, h: bh }, l.start, 'confirm');
      button(e, { x: a.x + p, y: a.y + p + bh + S(e, 8), w, h: bh }, l.back, 'back');
      if (l.note) { const no = { ...e.small, color: mutedOf(e, 0.7) }; T(e, l.note, a.x + a.w / 2 - W(e, l.note, no) / 2, a.y + a.h - p * 0.5 - LH(e, no), LH(e, no), no); }
      return;
    }
    case 'smallSquare': button(e, a, 'OK', 'confirm'); return;
    case 'edgeTab': button(e, a, l.start, 'confirm', true, 'button', 'edgeTab'); return;
    case 'textWithSubline': {
      // 带副行：上一行主字、下一行小字写代价（危险色）
      button(e, a, '', 'confirm');
      const bt = buttonText(e.part('button'), a.h * 0.62), so = { ...e.small, weight: 700, color: e.bad }, th = LH(e, bt, 1.2), sh = LH(e, so, 1.1), y0 = a.y + (a.h - th - sh) / 2, sub = ctaSub(l);
      T(e, l.start, a.x + a.w / 2 - W(e, l.start, bt) / 2, y0, th, { ...bt, color: onKey(e, bt).color });
      drawNumber(e, sub, a.x + a.w / 2 - numberWidth(e, sub, so) / 2, y0 + th, sh, so);
      return;
    }
  }
}

/**
 * 书法标题素材用不用：标题字体选书法（typ.display.family = calligraphy）、标题特效选干笔（typ.titleFx = drybrush），
 * 或新皮肤是国风水墨 / 关键词是水墨、国潮。旧皮肤只认皮肤之后显式选过的字体 / 特效（旧水墨皮肤默认带的关键词不算）。
 * 素材本身由调用方另查：书法字写的是"雪线旅人"，只有带 art.title 的包（artRef('title')）才用它，别的包照常写字。
 */
function inkTitleOn(e: ElCtx): boolean {
  const r = e.r;
  const fam = r.str('typ.display.family', '') === 'calligraphy', dry = r.str('typ.titleFx', '') === 'drybrush';
  if (e.th.legacy) return (fam && chosen(e, 'typ.display.family')) || (dry && chosen(e, 'typ.titleFx'));
  const kw = r.presets.keyword?.id;
  return fam || dry || r.skin?.id === 'skin.ink' || kw === 'kw.ink' || kw === 'kw.guochao';
}

/* 标题 */
/** 标题字（M12b-55）的显式参数：el.title.size（屏高的百分比，绝对字号，不随 elx.scale）、el.title.fit（width = 撑满可用宽）、el.title.bleed（0–0.3：再放大、出画面的部分裁掉） */
function titleParams(e: ElCtx) {
  const sz = Number(elOf(e, 'size')), b = Number(elOf(e, 'bleed'));
  return { size: Number.isFinite(sz) && sz > 0 ? Math.max(2, Math.min(30, sz)) : null, fit: String(elOf(e, 'fit') ?? 'none') === 'width', bleed: Number.isFinite(b) ? Math.max(0, Math.min(0.3, b)) : 0 };
}
/**
 * 标题大字的字样（M12b-55）：def = 这个画法原来的字号；el.title.size 给了 → 屏高 × 百分比；fit = width → 按 target 宽缩放到正好撑满；bleed → 再乘 (1 + bleed)（出画面的那截由 draw 裁掉）。
 * 都没给时原来的字号（Control 的巨型标题原来最多到屏高 17%、只横跨 12%–61%，control#6）
 */
function titleBig(e: ElCtx, s: string, base: TextOpts, def: number, target: number): TextOpts {
  const P = titleParams(e);
  let size = P.size !== null ? (P.size / 100) * e.R.h : def;
  if (P.fit) { const w = W(e, s, { ...base, size }); if (w > 0) size *= target / w; }
  return { ...base, size: size * (1 + P.bleed) };
}
/** 标题卡的两行（M12b-55）：序号行保持小字、标题按 titleBig；框宽按字长（原来固定 360 × 缩放：短章节名框里空一大截、长的冒出框），fit 时横贯画面 */
/** 标题卡的两行字：Boss 登场（cnt.subtype = bossIntro，D 审查 15）写「首领」+ 内容包的 Boss 名，其余写章节序号 + 章节名 */
function titleCardText(e: ElCtx): [string, string] {
  const game = pack().game;
  return e.r.str('cnt.subtype', '') === 'bossIntro' ? ['首领', pack().hud.boss.name] : [game.chapter.index, game.chapter.title];
}
function titleCardGeom(e: ElCtx) {
  const P = titleParams(e), [idx, ttl] = titleCardText(e);
  const to = titleBig(e, ttl, { ...e.title }, S(e, 26), e.R.w * 0.92 - S(e, 36));
  const tw = W(e, ttl, to), iw = W(e, idx, e.small);
  const lh = Math.max(S(e, 36), to.size * 1.38);
  const w = Math.min(e.R.w, Math.max(S(e, 120), tw, iw) + S(e, 36));
  return { to, tw, lh, w: P.fit ? Math.min(e.R.w, e.R.w * 0.92) : w, h: S(e, 26) + lh + S(e, 8) };
}
/** 竖排的中文标题（M12b-55：typ.direction = verticalTitle，或 typ.display.secondary = cjkVertical）：只作用于含中文的字 */
const CJK_RE = /[\u3400-\u9fff]/;
function titleVertical(e: ElCtx, s: string): boolean {
  if (!CJK_RE.test(s)) return false;
  const dir = e.th.legacy && !chosen(e, 'typ.direction') ? 'horizontal' : e.r.str('typ.direction', 'horizontal');
  return dir === 'verticalTitle' || secondaryOf(e).kind === 'cjkVertical';
}
/** 第二文字系统行（M12b-55，typ.display.secondary）：latinCaps = 英文副标题按主标题字号 × secondaryScale、字距 secondaryTracking（Ghost 的宽字距大写衬线）；cjkVertical = 主标题竖排 + 英文在旁边 */
function secondaryOf(e: ElCtx): { kind: string; scale: number; tracking: number } {
  const k = e.th.legacy && !chosen(e, 'typ.display.secondary') ? 'none' : e.r.str('typ.display.secondary', 'none');
  return { kind: k === 'auto' ? 'none' : k, scale: Math.max(0.2, Math.min(0.6, e.r.num('typ.display.secondaryScale', 0.3))), tracking: Math.max(0, Math.min(1, e.r.num('typ.display.secondaryTracking', 0.4))) };
}
/**
 * 区域标题卡（el.title.form = areaCard，M12b-46，hollow-knight#32）：上一行字距拉开的小字（章节序号）+ 大号区域名（标题字，跟 typ.display.case）+ 下方一条对称花饰（饰色）；
 * el.title.visit = revisit 时是再访的小号（不画花饰、字号 18，常配 el.title.screenAnchor 放角落）。返回各行的字样与几何（size 与 draw 共用）
 */
function areaCardGeom(e: ElCtx) {
  const game = pack().game, area = pack().world.region, small = String(elOf(e, 'visit') ?? 'first') === 'revisit';
  const ko: TextOpts = { ...e.small, spacing: 0.3 }, kh = LH(e, ko);
  const to = small ? { ...e.title, size: S(e, 18) } : titleBig(e, area, { ...e.title }, S(e, 40), e.R.w * 0.8);
  const th = to.size * 1.3, fh = small ? 0 : Math.max(S(e, 22), to.size * 0.55), tw = W(e, area, to);
  return { game, area, ko, kh, to, th, fh, tw, small, w: Math.min(e.R.w, Math.max(tw * (small ? 1 : 1.7), W(e, game.chapter.index, ko)) + S(e, small ? 10 : 20)), h: kh + th + fh + S(e, small ? 2 : 6) };
}
registerElement({
  id: 'el.title', forms: ['header', 'logo', 'titleCard', 'artTitle', 'areaCard', 'notice', 'titlePage', 'chapterCard'], anchor: 'tc',
  size: (e) => {
    const f = e.forms[0];
    if (f === 'notice' || f === 'titlePage' || f === 'chapterCard') return titleBlockSize(e, titleLinesOf(e, f), Math.min(e.R.w * 0.7, S(e, 520)));
    if (f === 'titleCard') { const G = titleCardGeom(e); return { w: G.w, h: G.h }; }
    if (f === 'areaCard') { const G = areaCardGeom(e); return { w: G.w, h: G.h }; }
    if (f === 'logo' || f === 'artTitle') {
      const P = titleParams(e), sec = secondaryOf(e), s = pack().game.name;
      if (P.size === null && !P.fit && !P.bleed && sec.kind === 'none' && !titleVertical(e, s)) return { w: S(e, 420), h: S(e, 110) };
      const o = titleBig(e, s, { ...e.title }, S(e, f === 'artTitle' ? 64 : 52), e.R.w * 0.9);
      if (titleVertical(e, s)) { const n = [...s].length; return { w: Math.min(e.R.w, o.size * 1.2 + (sec.kind !== 'none' ? W(e, pack().game.subtitle, { ...e.small, size: o.size * sec.scale, spacing: sec.tracking }) + S(e, 16) : 0)), h: Math.min(e.R.h, n * o.size * 1.08 + S(e, 8)) }; }
      const sh = sec.kind === 'latinCaps' ? o.size * sec.scale * 1.6 : S(e, 26);
      return { w: Math.min(e.R.w, Math.max(S(e, 420), W(e, s, o) + S(e, 20))), h: o.size * 1.6 + sh };
    }
    return { w: S(e, 300), h: S(e, 44) };
  },
  draw: (e, a) => {
    const f = e.forms[0], game = pack().game;
    if (f === 'notice' || f === 'titlePage' || f === 'chapterCard') { titleBlock(e, a, titleLinesOf(e, f)); return; }
    // 标题牌：颜色与字体按 @title → @plate → 元素 → 全局查（M12a-01）；形态：选过的 cmp.plate@title 优先（M12a-23，platePick），否则按元素读 cmp.plate（原来的）
    if (f === 'header') { plate(e, a, pack().menu.header, platePick(e, 'title', cmp(e, 'cmp.plate', 'ribbon')), { size: S(e, 20), spacing: 0.3 }, 'title'); return; }
    if (f === 'areaCard') {
      const G = areaCardGeom(e), cx = a.x + a.w / 2, kw = W(e, G.game.chapter.index, G.ko);
      T(e, G.game.chapter.index, cx - kw / 2, a.y, G.kh, G.ko);
      if (titleNameOn(e)) T(e, G.area, cx - G.tw / 2, a.y + G.kh, G.th, G.to);
      if (G.fh) { const g = e.g, c = ornColor(e), m = e.t.panel.ornament?.motif ?? 'none'; g.save(); g.fillStyle = c; g.strokeStyle = c; flourish(g, cx, a.y + G.kh + G.th + G.fh * 0.45, Math.min(a.w, G.tw * 1.7), G.fh, m === 'none' ? '' : m); g.restore(); }
      return;
    }
    if (f === 'titleCard') {
      const G = titleCardGeom(e), P = titleParams(e), [idx, ttl] = titleCardText(e);
      panel(e, a); T(e, idx, a.x + S(e, 18), a.y + S(e, 6), S(e, 20), e.small);
      // 出血（el.title.bleed）：大字超出画面的部分裁掉
      e.tx.save(); if (P.bleed > 0) { e.tx.beginPath(); e.tx.rect(e.R.x, e.R.y, e.R.w, e.R.h); e.tx.clip(); }
      if (titleNameOn(e)) T(e, ttl, a.x + S(e, 18), a.y + S(e, 26), G.lh, G.to);
      e.tx.restore();
      return;
    }
    const P = titleParams(e), sec = secondaryOf(e), s = game.name;
    const plain = P.size === null && !P.fit && !P.bleed && sec.kind === 'none' && !titleVertical(e, s);
    const o0 = { ...e.title, size: S(e, f === 'artTitle' ? 64 : 52), spacing: 0.08, metal: f === 'artTitle', outline: { color: 'rgba(0,0,0,0.6)', width: 3 }, shadow: { color: 'rgba(0,0,0,0.5)', x: 0, y: 4, blur: 6 } };
    const o = plain ? o0 : titleBig(e, s, o0, o0.size, e.R.w * 0.9);
    const sub = game.subtitle, subO = sec.kind !== 'none' ? { ...e.small, size: o.size * sec.scale, spacing: sec.tracking, color: '#fff', upper: true } : { ...e.small, spacing: 0.4, color: '#fff' };
    // 竖排中文标题（M12b-55，ghost-of-tsushima#12）：一列逐字往下，英文副标题（第二文字系统）竖向居中排在右边
    if (titleVertical(e, s)) {
      const ch = [...s], step = o.size * 1.08;
      ch.forEach((c, i) => T(e, c, a.x, a.y + i * step, step, o));
      if (sec.kind !== 'none') { const y = a.y + (ch.length * step) / 2 - LH(e, subO) / 2; T(e, sub, a.x + o.size * 1.2 + S(e, 16), y, LH(e, subO), subO); }
      return;
    }
    // 书法标题：按标题色着色的墨字（带投影），只在当前包有书法字素材时用；没加载完时照旧画字
    let ink = false;
    if (!!artRef('title') && inkTitleOn(e)) {
      const tx = e.tx;
      tx.save(); tx.shadowColor = 'rgba(0,0,0,0.5)'; tx.shadowOffsetY = S(e, 3); tx.shadowBlur = S(e, 6);
      // 1600px 的书法字要缩小 3.5~7 倍：开平滑并用 high 质量，免得笔画边缘锯齿（save/restore 会还原）
      tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high';
      ink = drawInkTitle(tx, { x: a.x, y: a.y, w: a.w, h: a.h * (f === 'artTitle' ? 0.78 : 0.74) }, o.color, 'center');
      tx.restore();
    }
    if (plain) {
      if (!ink) T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y, a.h * 0.78, o);
      T(e, sub, a.x + a.w / 2 - W(e, sub, subO) / 2, a.y + a.h * 0.74, S(e, 20), subO);
      return;
    }
    const lh = o.size * 1.6;
    e.tx.save(); if (P.bleed > 0) { e.tx.beginPath(); e.tx.rect(e.R.x, e.R.y, e.R.w, e.R.h); e.tx.clip(); }
    if (!ink) T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y, lh, o);
    e.tx.restore();
    T(e, sub, a.x + a.w / 2 - W(e, sub, subO) / 2, a.y + lh - S(e, 4), LH(e, subO, 1.3), subO);
  },
});

/* ---------------- 标题与播报锁扣（M12b-30） ---------------- */
/** 主标题写不写（el.title.name = none：章节卡 / 区域卡 / 标题块只留引子与小字，persona5#17 的日期过渡卡没有标题），选过才算 */
const titleNameOn = (e: ElCtx) => !(elChosen(e, 'name') && String(elOf(e, 'name') ?? 'show') === 'none');
/** 标题块的一行（titleBlock）：角色决定字号 / 字样（kicker 小字宽字距、title 大字、subtitle 斜体、quote 宽字距小型大写、data 居中正文、source 小字次要色）；divider = 一道分隔线、art = 插画位 */
export interface TitleLine { role: string; text?: string }
/** 标题块的行（内容包 hud.titleLines，没写时按版式拼：notice = 告示 / 扉页式（Obra 的报纸告示）、titlePage = 书的扉页、chapterCard = 「地点 — 年代」章节戳 + 章节名） */
function titleLinesOf(e: ElCtx, f: string): TitleLine[] {
  const p = pack(), g = p.game, place = p.world.places?.[0]?.[0] ?? g.name, year = DATA.year ?? '1807';
  if (DATA.titleLines?.length && f !== 'chapterCard') return DATA.titleLines.map(([role, text]) => ({ role, text }));
  const lines: TitleLine[] = f === 'chapterCard'
    ? [{ role: 'kicker', text: `${place} — ${year}` }, { role: 'title', text: g.chapter.title }, { role: 'source', text: g.chapter.index }]
    : f === 'titlePage'
      ? [{ role: 'title', text: g.name }, { role: 'art' }, { role: 'subtitle', text: g.subtitle }, { role: 'source', text: year }]
      : [{ role: 'kicker', text: g.chapter.index }, { role: 'title', text: g.name }, { role: 'quote', text: g.subtitle }, { role: 'divider' }, { role: 'art' }, { role: 'data', text: `“${place}”` },
        ...plainText(p.screens.notice).split(/(?<=[。！？])/).map((x) => x.trim()).filter(Boolean).slice(0, 2).map((text) => ({ role: 'data', text })), { role: 'divider' }, { role: 'source', text: year }];
  return titleNameOn(e) ? lines : lines.filter((l) => l.role !== 'title');
}
const titleLineO = (e: ElCtx, role: string): TextOpts => {
  switch (role) {
    case 'kicker': return { ...e.small, weight: 700, upper: true, spacing: 0.3, color: e.accent };
    case 'title': return { ...e.title, size: e.title.size * 2, italic: true, weight: 700, color: e.title.color ?? e.text };
    case 'subtitle': return { ...e.base, italic: true, color: e.text };
    case 'quote': return { ...e.small, upper: true, spacing: 0.35, weight: 700, color: e.text };
    case 'source': return { ...e.small, color: mutedOf(e, 0.7) };
    default: return { ...e.base, color: e.text };
  }
};
/** 一行的高（折行后）：art = 宽的 0.4、divider = 14 */
const titleLineH = (e: ElCtx, l: TitleLine, w: number) => (l.role === 'art' ? w * 0.4 : l.role === 'divider' ? S(e, 14) : wrapLines(e.tx, l.text ?? '', w, titleLineO(e, l.role)).length * LH(e, titleLineO(e, l.role), 1.35));
/**
 * 标题块的排法（size 与 draw 同一份，B9 审查修复 ㉙）：先算字行的高，插画位拿剩下的高（最多宽的 0.4，可用高 = 画面高 − 两边安全边距）；插画位不到 24 时不画；
 * 还放不下就从后往前去掉居中数据行（data）。原来插画位总是宽的 0.4，大字号 / 加长文字时底下的出处 / 年份落到画面外
 */
function titlePlan(e: ElCtx, lines0: TitleLine[], w: number): { lines: TitleLine[]; art: number; h: number; hs: Map<TitleLine, number> } {
  const avail = e.R.h - 2 * ((e.r.num('lay.safeMargin', 2) / 100) * Math.min(e.R.w, e.R.h) + 12), gap = S(e, 6);
  // 每行的高只量一遍（画的时候照用，折行量字不重复）
  const hs = new Map(lines0.map((l) => [l, l.role === 'art' ? 0 : titleLineH(e, l, w)] as [TitleLine, number]));
  let lines = lines0;
  for (;;) {
    const arts = lines.filter((l) => l.role === 'art').length, textH = lines.reduce((s, l) => s + (l.role === 'art' ? 0 : hs.get(l)! + gap), 0);
    const art0 = arts ? Math.max(0, Math.min(w * 0.4, (avail - textH) / arts - gap)) : 0, art = art0 >= S(e, 24) ? art0 : 0;
    if (arts && !art) { lines = lines.filter((l) => l.role !== 'art'); continue; }
    const h = textH + arts * (art + gap), di = lines.map((l) => l.role).lastIndexOf('data');
    if (h <= avail || di < 0) return { lines, art, h, hs };
    lines = lines.filter((_, i) => i !== di);
  }
}
function titleBlockSize(e: ElCtx, lines: TitleLine[], w: number): { w: number; h: number } {
  const ww = Math.min(w, Math.max(S(e, 240), ...lines.map((l) => (l.text ? W(e, l.text, titleLineO(e, l.role)) + S(e, 16) : 0))));
  return { w: ww, h: titlePlan(e, lines, ww).h };
}
/**
 * 多级标题块（§3 的 titleBlock(e, r, lines)，M12b-30，obra-dinn#12 / #15 / #11）：每行按角色定字样、居中，行间可插分隔线（vis.dividerStyle 选过时按它，牛津线 / 膨线……；没选时一道细线）
 * 与插画位（插画槽：cmp.panelArt 的图窗处理与外框照常，没素材时灰盒「插画（需素材）」）。告示 / 扉页 / 章节卡共用。Godot：VBox of Label（LabelSettings 按角色）+ HSeparator + TextureRect
 */
export function titleBlock(e: ElCtx, a: Rect, lines0: TitleLine[]) {
  const g = e.g, cx = a.x + a.w / 2, dv = pickedStr(e, 'vis.dividerStyle', 'plain'), motif = e.t.panel.ornament?.motif ?? 'none', P = titlePlan(e, lines0, a.w);
  let y = a.y;
  for (const l of P.lines) {
    const h = l.role === 'art' ? P.art : P.hs.get(l) ?? 0;
    if (l.role === 'divider') {
      const c = withAlpha(e.text, 0.6), w = a.w * 0.6;
      g.save(); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 1;
      if (dv && dv !== 'plain' && dv !== 'auto') divider(g, cx - w / 2, cx + w / 2, y + h / 2, dv, motif, c); else { g.fillRect(cx - w / 2, Math.round(y + h / 2), w, 1); }
      g.restore();
    } else if (l.role === 'art') artSlot(e, { x: a.x + a.w * 0.15, y, w: a.w * 0.7, h }, 'scene', '插画', { decor: true });
    else {
      const o = titleLineO(e, l.role), ls = wrapLines(e.tx, l.text ?? '', a.w, o), lh = LH(e, o, 1.35);
      ls.forEach((t, i) => T(e, t, cx - W(e, t, o) / 2, y + i * lh, lh, o));
    }
    y += h + S(e, 6);
  }
}
/** 引文字卡（el.subtitle.form = quoteCard，M12b-30，civ6#40）：上一行小型大写名称、左边一枚圆图标、深色引文框（引文 + 出处）；样本 hud.quote，没写时地名 + 当前台词 + 说话人 */
function quoteData(e: ElCtx) {
  const q = DATA.quote, sl = spokenLine(e.r), p = pack();
  return { name: q?.name ?? p.world.places?.[0]?.[0] ?? p.game.name, glyph: q?.glyph ?? '✦', text: q?.text ?? sl.line, source: q?.source ?? `— ${sl.who || p.game.name}` };
}
function quoteCardSize(e: ElCtx): { w: number; h: number } {
  const q = quoteData(e), w = Math.min(e.R.w * 0.72, S(e, 560)), io = { ...e.base, italic: true }, lines = wrapLines(e.tx, q.text, w - S(e, 100), io).length;
  return { w, h: LH(e, e.small, 1.6) + S(e, 8) + Math.max(S(e, 64), lines * LH(e, io, 1.45) + LH(e, e.small, 1.4) + S(e, 18)) };
}
function drawQuoteCard(e: ElCtx, a: Rect) {
  const q = quoteData(e), g = e.g, no = { ...e.small, weight: 700, upper: true, spacing: 0.2, color: e.text }, nh = LH(e, e.small, 1.6), io = { ...e.base, italic: true, color: '#f2efe6' };
  T(e, q.name, a.x + a.w / 2 - W(e, q.name, no) / 2, a.y, nh, no);
  const bx = { x: a.x + S(e, 44), y: a.y + nh + S(e, 8), w: a.w - S(e, 44), h: a.h - nh - S(e, 8) }, d = Math.min(S(e, 72), bx.h);
  drawBox(g, bx, { bg: { solid: withAlpha('#0d1016', 0.88) }, border: { width: 1, color: withAlpha(e.accent, 0.6) }, radius: S(e, 4) }, e.pal);
  drawBox(g, { x: a.x, y: bx.y + (bx.h - d) / 2, w: d, h: d }, { bg: { solid: e.accent }, radiusPct: 50, border: { width: Math.max(1.5, S(e, 2)), color: '#f2efe6' } }, e.pal);
  icon(e, q.glyph, a.x + d / 2, bx.y + bx.h / 2, d * 0.45, '#fff');
  const lines = wrapLines(e.tx, q.text, bx.w - d * 0.6 - S(e, 28), io), lh = LH(e, io, 1.45);
  lines.forEach((t, i) => T(e, t, bx.x + d * 0.6 + S(e, 12), bx.y + S(e, 8) + i * lh, lh, io));
  const so = { ...e.small, color: withAlpha('#f2efe6', 0.7) }; T(e, q.source, bx.x + bx.w - S(e, 12) - W(e, q.source, so), bx.y + bx.h - LH(e, so, 1.4) - S(e, 4), LH(e, so, 1.4), so);
  logTarget(g, bx, q.name);
}

/* 奖励 */
registerElement({
  id: 'el.reward', forms: ['icons', 'single', 'cards', 'bigCard', 'chest', 'portrait'], anchor: 'center',
  size: (e) => (e.forms[0] === 'cards' ? { w: S(e, 3 * 130), h: S(e, 170) } : e.forms[0] === 'bigCard' || e.forms[0] === 'portrait' ? { w: S(e, 220), h: S(e, 280) } : e.forms[0] === 'chest' ? { w: S(e, 200), h: S(e, 170) } : e.forms[0] === 'single' ? { w: S(e, 160), h: S(e, 170) } : { w: S(e, 3 * 70), h: S(e, 84) }),
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    switch (f) {
      case 'cards':
        // 卡面（M12b-12）：cmp.card@el.reward / @card 选过时按版式画，没选时原来的「面板 + 图标 + 名字 + 数量」
        DATA.reward.forEach(([ch, n, q, , st], i) => { const r = { x: a.x + i * S(e, 130), y: a.y, w: S(e, 120), h: a.h };
          drawCard(e, r, rowCard(i, ch, n, `×${q}`, { item: n, rarity: st?.rarity ?? [1, 3, 4][i % 3], line: st?.line ?? i, value: String(q) }), { legacy: () => { panel(e, r, false); if (!itemIcon(e, n, r.x + r.w / 2, r.y + S(e, 60), S(e, 40))) icon(e, ch, r.x + r.w / 2, r.y + S(e, 60), S(e, 40)); T(e, n, r.x + r.w / 2 - W(e, n, e.title) / 2, r.y + S(e, 100), S(e, 24), e.title); T(e, `×${q}`, r.x + r.w / 2 - W(e, `×${q}`) / 2, r.y + S(e, 128), S(e, 22)); } }); });
        return;
      case 'chest': {
        const cx = a.x + a.w / 2, cy = a.y + a.h * 0.6;
        const gr = g.createRadialGradient(cx, cy, 4, cx, cy, a.w * 0.6); gr.addColorStop(0, 'rgba(255,220,120,0.7)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(a.x - 40, a.y - 40, a.w + 80, a.h + 80);
        g.fillStyle = '#7a4a1f'; g.fillRect(cx - S(e, 50), cy - S(e, 10), S(e, 100), S(e, 56)); g.fillStyle = '#a8692c'; g.fillRect(cx - S(e, 54), cy - S(e, 40), S(e, 108), S(e, 34));
        g.fillStyle = '#e3b341'; g.fillRect(cx - S(e, 8), cy - S(e, 14), S(e, 16), S(e, 22));
        return;
      }
      case 'bigCard': case 'portrait': {
        // 立绘奖励是角色（hero），大卡是物品（featured：图标按 item 查，显示 name）
        const { hero, featured: it } = DATA;
        // 大卡的卡面（M12b-12）：cmp.card 选过时按版式画（Balatro 的塔罗牌：tarot），没选时原来的「面板 + 大图标 + 星级 + 名条」
        if (f === 'bigCard' && cardKind(e) !== 'iconCard') { drawCard(e, a, rowCard(0, it.glyph, it.name, '', { item: it.item, rarity: 4 }), { legacy: () => undefined }); return; }
        panel(e, a);
        // 下一个解锁角色的剪影（st.locked@el.reward = silhouette，M12b-32，dont-starve#31：死亡结算旁边的下一角色）：整块头像压成黑剪影
        if (f === 'portrait') { const sil = scopedStr(e, 'st.locked') === 'silhouette'; if (sil) { g.save(); g.filter = 'brightness(0)'; } avatar(e, a.x + a.w / 2, a.y + a.h * 0.4, a.w * 0.34, hero.initial); if (sil) g.restore(); }
        else if (!itemIcon(e, it.item, a.x + a.w / 2, a.y + a.h * 0.38, S(e, 80))) icon(e, it.glyph, a.x + a.w / 2, a.y + a.h * 0.38, S(e, 80));
        // 星级（M12a-21）：st.rarityCue 显式给了时只在含 stars 时画（Balatro 的塔罗牌写 [] 关掉），没给时照旧 5 颗；稀有度不该画时（rarityShown）不画
        const cl = e.v.src('st.rarityCue')?.layer, cueGiven = !!cl && cl !== 'default' && cl !== 'fallback';
        if (rarityShown(e) && (!cueGiven || rarityCues(e).includes('stars'))) for (let i = 0; i < 5; i++) icon(e, '★', a.x + a.w / 2 + (i - 2) * S(e, 22), a.y + a.h * 0.74, S(e, 18), '#ffd34d');
        const name = f === 'portrait' ? hero.name : it.name;
        // 名字画在牌内底部的名条里（M12a-21：一条压暗的底，原来字直接压在牌面上）
        const ny = a.y + a.h * 0.8, nh = S(e, 30);
        e.g.fillStyle = withAlpha('#000', 0.28); e.g.fillRect(a.x + S(e, 8), ny, a.w - S(e, 16), nh);
        T(e, name, a.x + a.w / 2 - W(e, name, e.title) / 2, ny, nh, e.title);
        return;
      }
      case 'single': {
        const it = DATA.featured, s = `${it.name} ×1`;
        slot(e, { x: a.x + S(e, 30), y: a.y, w: S(e, 100), h: S(e, 100) }, it.glyph, { item: it.item });
        T(e, s, a.x + a.w / 2 - W(e, s, e.title) / 2, a.y + S(e, 110), S(e, 28), e.title);
        return;
      }
      default: {
        // 稀有度：逐条声明的优先，没声明时按序号演示 1 / 3 / 4（M12a-10；内容包 noRarity 时不画）
        const demo = rewardDemo(e);
        DATA.reward.forEach(([ch, n, q, , st], i) => slot(e, { x: a.x + i * S(e, 70), y: a.y, w: S(e, 62), h: S(e, 62) }, ch, { qty: `×${q}`, rarity: !packRarity() ? undefined : st ? st.rarity : demo ? [1, 3, 4][i] : undefined, item: n, locked: st?.locked, line: st?.line ?? i }));
      }
    }
  },
});

/** 奖励样本的状态演示（M12a-10）：奖励条目逐条声明了状态、或内容包关了物品演示（menu.itemStates = none）时关 */
const rewardDemo = (e: ElCtx) => stateDemo(e, declaredStates(DATA.reward, 4), pack().menu.itemStates === 'none');

/* 价格 / 消耗 */
registerElement({
  id: 'el.cost', forms: ['inButton', 'tag', 'iconNumber', 'bigNumber', 'haveNeed', 'freeTag', 'slots', 'bidTable', 'recipeRow', 'pips'], anchor: 'br',
  // 挂到光标上时（Cities 修路的造价读数，M12a-15）默认在光标右边
  attachSide: 'right',
  size: (e) => (e.forms[0] === 'recipeRow' ? recipeSize(e) : e.forms[0] === 'pips' ? pipsSize(e) : e.forms[0] === 'bidTable' ? { w: S(e, 240), h: S(e, 110) } : e.forms[0] === 'slots' ? { w: S(e, 200), h: S(e, 60) } : e.forms[0] === 'bigNumber' ? { w: S(e, 180), h: S(e, 50) } : e.forms[0] === 'inButton' ? { w: S(e, 200), h: S(e, 48) } : { w: S(e, 160), h: S(e, 32) }),
  draw: (e, a) => {
    const f = e.forms[0], price = DATA.price;
    // 主货币（资源栏第一项 res[0]）：图集素材开着时画它的图标，否则画符号（货币色，M12a-02，默认金色）
    const [coinGlyph, coinName] = DATA.res[0];
    const gold = e.fill(0, 'currency');
    const coin = (x: number, y: number, s: number) => { if (!itemIcon(e, coinName, x, y, s)) icon(e, coinGlyph, x, y, s, gold); };
    switch (f) {
      case 'inButton': button(e, a, ''); coin(a.x + S(e, 30), a.y + a.h / 2, S(e, 18)); T(e, `${DATA.buy}　${price}`, a.x + S(e, 46), a.y, a.h, { ...e.base, weight: 800, color: '#fff' }); return;
      case 'tag': panel(e, a, true, { radiusPct: 50 }); coin(a.x + S(e, 16), a.y + a.h / 2, S(e, 14)); T(e, price, a.x + S(e, 30), a.y, a.h, { ...e.base, weight: 700 }); return;
      case 'bigNumber': coin(a.x + S(e, 18), a.y + a.h / 2, S(e, 28)); T(e, price, a.x + S(e, 40), a.y, a.h, { ...e.big, size: S(e, 30) }); return;
      case 'haveNeed': {
        const [have, need] = DATA.cost[0]; const ok = have >= need;
        coin(a.x + S(e, 12), a.y + a.h / 2, S(e, 14)); T(e, `${have.toLocaleString('en')}`, a.x + S(e, 26), a.y, a.h, { ...e.base, weight: 700, color: semantic(e, ok ? 'good' : 'short') }); T(e, ` / ${need.toLocaleString('en')}`, a.x + S(e, 26) + W(e, have.toLocaleString('en'), { ...e.base, weight: 700 }), a.y, a.h, e.base); return;
      }
      case 'freeTag': plate(e, a, '限时免费', 'slashBand', { size: S(e, 14) }); return;
      // 第 3 格锁定是演示状态（M12a-10）：声明了状态 / 包关了演示时只按声明画
      case 'slots': { const demo = rewardDemo(e); DATA.reward.forEach(([ch, n, q, , st], i) => slot(e, { x: a.x + i * S(e, 64), y: a.y, w: S(e, 56), h: S(e, 56) }, ch, { qty: `${q}/${q + 2}`, locked: st ? st.locked : demo && i === 2, item: n })); return; }
      // 配方行 / 凹槽点数（M12b-29，elements/inventory.ts）
      case 'recipeRow': recipeRow(e, a); return;
      case 'pips': costPips(e, a); return;
      case 'bidTable':
        panel(e, a, true);
        DATA.bids.forEach(([n, v], i) => { T(e, n, a.x + S(e, 12), a.y + S(e, 10 + i * 30), S(e, 26), { ...e.base, weight: i ? 400 : 800 }); T(e, v, a.x + a.w - S(e, 12) - W(e, v), a.y + S(e, 10 + i * 30), S(e, 26), { ...e.base, color: i ? e.text : e.accent }); });
        return;
      default: coin(a.x + S(e, 10), a.y + a.h / 2, S(e, 14)); T(e, price, a.x + S(e, 24), a.y, a.h, { ...e.base, weight: 700 });
    }
  },
});
