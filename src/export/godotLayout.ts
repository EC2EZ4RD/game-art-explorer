import { elementParts, ELEMENTS, makeCtx, pointSized, satelliteReach, type Anchor, type ElCtx } from '../hud/elements/core';
import { baseId, instanceNo } from '../hud/sys/register';
import { dockOrder, dockSpecOf, hudArea, hudOrgOf, layoutEl, planEdgeBars, planMargins, satSpecOf, sizeOverride, wantsElements, type DockSpec, type FlowItem } from '../hud/compose/hud';
import { pack, packFor, setPack, vitalsOf } from '../hud/content';
import type { HudData } from '../hud/content/types';
import type { Rect } from '../hud/paint';
import { SPEC_PARAM } from '../hud/sys/spec';
import { afterSkin, type Theme } from '../hud/sys/theme';

/*
 * 元素排版导出到 Godot（docs/ui-hud-plan.md M9b）：选了品类布局时，迁移包的 hud_sample.gd 不再搭 M1 的四控件样本，
 * 而是按探索台的排版规则搭元素——九个锚点各一列 VBoxContainer（上排往下长、下排往上长、中排居中），元素按优先级与顺序排进去，
 * 每个元素用 Godot 内置控件近似（PanelContainer + Label / ProgressBar / Button / 按键框），主题沿用 ui_theme.tres。
 * 挂在世界上的元素（交互提示、敌人血条、飘字……）与叙事内元素不进列，列在迁移说明里。
 * 元素尺寸按探索台的 size() 算：Node 里没有 Canvas，用按字符估宽的替身（中文 1em、其它 0.56em）。
 * 画面（审查修复 B · C1）：与探索台的 HUD 同一张设计画布——横屏 960 × 540、竖屏 540 × 960（= godot.ts 的 hudDisplay，project.godot 的 canvas_items 拉伸基准）；
 *   size() 已含版面缩放（e.k 含 th.scale），GDScript 里不再乘 SCALE。
 * 版面与组织方式（审查修复 B）：版面 = compose/hud.ts 的 hudArea（安全边距按 min(宽, 高)、设备安全区），贴边条 / 底座 = planEdgeBars（成员、条里的格序与并排、
 *   整条缩放 ≥ 0.85、放不下时低优先级的格退回散排），边框 = planMargins（玩法区画幅按 lay.playfield，放不下的退回散排）——与画布同一份代码，
 *   散排的锚点列放在扣掉条 / 边框后的版面里。
 * M12a-16 / 18：同锚点横排（elx.stackDir = row / rowBar）= 锚点那一行是 HBoxContainer、每格一个 VBoxContainer；等宽（stackWidth = match）= SIZE_FILL；
 * 偏移（offsetX / offsetY，屏宽 / 屏高 %）= 外面套一层不排版的 Control、元素按偏移放。避让（M12a-17）是运行时布局脚本的事，写在迁移说明里。
 * 整块元素挂世界点（M12a-15）与画布同口径：显式给了 attachTo 才挂；旧皮肤只认皮肤之后的层给的（审查修复 A · D6 的旧皮肤规则）。
 * 样本文字来自这份参数的示例内容包（packFor(r)，docs/c1-content-packs.md 6.5）：量尺寸时临时切到这个包，量完换回原来的当前包。
 */

/**
 * stack / match / off：同锚点堆叠、等宽、偏移（M12a-18）；edge = 收进哪条贴边条（top / bottom / left / right）或哪侧边框（marginL / marginR），空串 = 散排；
 * side = 条里哪一段（start / center / end）或边框里哪一段（top / mid / bottom）；slot = 条里第几格（同一格的几项并排，lay.edgeBarSlots 的 "a|b"；不在条里 −1）
 */
/** pad = 骑边小件伸出框外的留白 [左, 上, 右, 下]（设计单位；与画布 compose/hud.ts 的 satelliteReach 同一份，终期审查修复 ⑯ / ㉘），GDScript 外面套一层 MarginContainer */
export interface LayoutItem { anchor: Anchor; id: string; form: string; w: number; h: number; label: string; stack: string; match: boolean; off: [number, number]; edge: string; side: string; slot: number; pad?: [number, number, number, number] }
/** 贴边条：divide = 分隔线画在每格之间（slots，给了 lay.edgeBarSlots）还是只在中段两侧（segments）；segs = 起 / 中 / 末三段有没有元素；fit = 整条缩放 */
export interface LayoutBar { edge: string; divide: 'slots' | 'segments'; segs: [boolean, boolean, boolean]; fit: number }
/**
 * world：挂在世界上 / 叙事内的元素；block = 显式挂到世界点上的整块元素（M12a-15：生命条、字幕……），side = 放在挂点哪一边（elx.attachOffset）。
 * view = 设计画布；area = 散排版面的四边边距 [左, 上, 右, 下]（设计单位，已扣掉贴边条 / 边框）；margin = 边框（inMargin）：每侧宽、玩法区画幅；
 * dropped = 该收进贴边条 / 边框、但放不下退回散排的元素（名字）
 */
export interface LayoutOut {
  items: LayoutItem[]; world: { id: string; label: string; attach: string; block?: boolean; side?: string }[];
  view: [number, number]; area: [number, number, number, number]; gap: number; org: string;
  bars: LayoutBar[]; margin: { side: number; aspect: string } | null; dropped: string[];
  /** 贴边条长度（lay.hudEdgeSpan，M12b-65 ④）：full = 整条边 / content = 按内容收短、居中 */
  span: string;
  /**
   * 停靠（M12b-05 ①）：不进锚点列、排在宿主旁边的元素——[元素, 宿主, 边, 间距, 对齐, 宿主第几格（0 = 整个）, 宽, 高, 画法, 名字]；按拓扑序（宿主在前），成环的不在这里（照常进锚点列）。
   * 画布上宿主按「宿主 + 停靠者」的外接框进锚点列；Godot 里宿主照自己的尺寸进列、停靠者是 root 下的兄弟节点，跟着宿主的 item_rect_changed 放（见迁移说明）
   */
  docks: [string, string, string, number, string, number, number, number, string, string, [number, number, number, number]][];
}

/** 只量字宽的 Canvas 替身 */
function measureStub(w: number, h: number): CanvasRenderingContext2D {
  let font = '13px sans-serif';
  const stub = {
    get font() { return font; },
    set font(v: string) { font = v; },
    measureText(s: string) {
      const m = /(\d+(?:\.\d+)?)px/.exec(font);
      const px = m ? Number(m[1]) : 13;
      let w = 0;
      for (const ch of s) w += /[⺀-￿]/.test(ch) ? px : px * 0.56;
      return { width: w } as TextMetrics;
    },
    save() {}, restore() {}, fillText() {}, strokeText() {}, translate() {}, scale() {}, rotate() {}, transform() {},
    getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    canvas: { width: w, height: h },
  };
  return stub as unknown as CanvasRenderingContext2D;
}

const ELEMENT_LABEL = new Map((SPEC_PARAM.get('cnt.elements')?.options ?? []).map((o) => [String(o.value), o.label.split(' / ')[0]]));
const ROW_ORDER: Anchor[] = ['tl', 'tc', 'tr', 'ml', 'center', 'mr', 'bl', 'bc', 'br'];
const SIDES = ['start', 'center', 'end'] as const;
const ASPECTS: [number, string][] = [[16 / 9, '16:9'], [4 / 3, '4:3'], [1, '1:1'], [3 / 4, '3:4'], [9 / 16, '9:16']];

/** HUD 的设计画布（设计单位）：横屏 960 × 540、竖屏 540 × 960（与 godot.ts 的 hudDisplay、sys/device.ts 的 unitKOf 同一个基准） */
export function hudDesignRect(th: Theme): Rect {
  const portrait = th.r.str('ctx.orientation', 'landscape') === 'portrait';
  return { x: 0, y: 0, w: portrait ? 540 : 960, h: portrait ? 960 : 540 };
}

export function elementLayout(th: Theme): LayoutOut | null {
  if (!wantsElements(th)) return null;
  // 元素的 size() 读当前包（DATA / pack()）：导出不在 HudSystem 里画，按这份参数选包，量完换回去（不打扰画布那一侧）
  const prev = pack();
  setPack(packFor(th.r));
  try {
    return measureLayout(th);
  } finally {
    setPack(prev);
  }
}

function measureLayout(th: Theme): LayoutOut {
  const r = th.r;
  const R = hudDesignRect(th);
  const ctx = measureStub(R.w, R.h);
  const items: LayoutItem[] = [];
  const flow: FlowItem[] = [];
  const world: LayoutOut['world'] = [];
  // 停靠（M12b-05）：先收集，排完锚点列再按拓扑序列出（与 compose/hud.ts 同一个 dockOrder：宿主不在场 / 成环的照常进锚点列）
  const dockable: { spec: DockSpec; row: LayoutItem; flow: FlowItem }[] = [], rowKey = new Map<LayoutItem, string>();
  // 元素的测量上下文（M12b-63：停靠者跟着宿主的当前成员（elx.dockFollow = active）时，用宿主的上下文问它当前是第几格）
  const ctxOf = new Map<string, ElCtx>();
  // 每一行的测量上下文与排位项（共用底条收格、骑边小件留白用，终期审查修复 ⑯）
  const rowCtx = new Map<LayoutItem, ElCtx>(), rowFlow = new Map<LayoutItem, FlowItem>(), rowForm = new Map<LayoutItem, string | undefined>();
  for (const id of r.elements()) {
    const def = ELEMENTS.get(id);
    if (!def) continue;
    // 多选了几种画法的元素按画法拆成子项（M12a-14，与 compose/hud.ts 同一套 elementParts）：每种画法一个子场景，各自锚点 / 挂点
    const parts = elementParts(r, id);
    for (const p of parts) {
      const e = makeCtx(id, ctx, ctx, th, R, p.form);
      if (!ctxOf.has(id)) ctxOf.set(id, e);
      const size0 = def.size(e), size = pointSized(e, size0) ? size0 : sizeOverride(th, id, R, size0, p.form);
      const anchor = (ROW_ORDER.includes(p.anchor) ? p.anchor : def.anchor) as Anchor;
      // 只有一种画法时挂点读法与原来一样（attachTo 没给时取元素默认）
      const attach = p.form ? p.attach : String(r.el(id, 'attachTo') ?? def.attach ?? 'none');
      const diegetic = String(r.el(id, 'diegesis') ?? r.str('rel.diegesis', 'screen')) === 'diegetic';
      // 元素实例（M12b-04）：名字带「#2」，节点名 / 类型变体按实例 id（Hud_el_party_2），近似控件按基 id 选
      const label = (ELEMENT_LABEL.get(baseId(id)) ?? id) + (instanceNo(id) > 1 ? ` #${instanceNo(id)}` : '') + (p.form && parts.length > 1 ? ` · ${p.form}` : '');
      // 画在点上的小元素与叙事内元素进挂点表；整块元素只有显式给了 elx.attachTo（p.given，M12a-15）才挂到世界点上，否则照常进锚点列——
      // 旧皮肤只认皮肤之后的层给的 attachTo（与 compose/hud.ts 的 wa 同口径，审查修复 A · D6）
      const pt = pointSized(e, size);
      const wa = !!p.given && !pt && !diegetic && (!th.legacy || afterSkin(r, r.elKey(id, 'attachTo', p.form)));
      if (pt || diegetic || wa) {
        const so = String(r.el(id, 'attachOffset', p.form) ?? 'auto');
        world.push({ id, label, attach: diegetic ? 'diegetic' : pt ? attach : p.given!, ...(!pt && !diegetic ? { block: true, side: ['above', 'below', 'left', 'right', 'center'].includes(so) ? so : def.attachSide ?? 'above' } : {}) });
        continue;
      }
      // 同锚点堆叠 / 偏移：旧皮肤只认皮肤之后的层给的（与 compose/hud.ts 同一个 layoutEl，目检修复）
      const el = (k: string) => layoutEl(th, id, k, p.form), num = (k: string) => { const n = Number(el(k)); return Number.isFinite(n) ? n : 0; };
      const st = String(el('stackDir') ?? 'inherit');
      const match = String(el('stackWidth') ?? '') === 'match';
      const row: LayoutItem = { anchor, id, form: e.forms[0] ?? '', w: Math.round(size.w), h: Math.round(size.h), label, stack: st === 'row' || st === 'rowBar' ? st : 'column', match, off: [num('offsetX'), num('offsetY')], edge: '', side: '', slot: -1 };
      const fl: FlowItem = { id, anchor, w: size.w, h: size.h, priority: e.priority, match };
      const ds = dockSpecOf(th, id, p.form);
      rowKey.set(row, `${id}|${p.form ?? ''}`); rowCtx.set(row, e); rowFlow.set(row, fl); rowForm.set(row, p.form);
      if (ds) { dockable.push({ spec: { ...ds, id: `${id}|${p.form ?? ''}` }, row, flow: fl }); continue; }
      items.push(row);
      flow.push(fl);
    }
  }
  // 同锚点共用底条（elx.stackDir = rowBar，M12b-65 ②）：这一锚点上的元素格宽按内容收（元素报了 fitW 时取它与原宽里小的）——与 compose/hud.ts 同一步（终期审查修复 ⑯：
  // 原来 Godot 照 size() 的宽，disco-elysium#47 的金额格在 hud_sample.gd 里仍是 137 宽的一段空格）
  const allRows = [...items, ...dockable.map((x) => x.row)];
  const rbA = new Set(allRows.filter((x) => x.stack === 'rowBar').map((x) => x.anchor));
  for (const row of allRows) {
    const e = rowCtx.get(row), def = ELEMENTS.get(row.id);
    if (!e || !def?.fitW || !rbA.has(row.anchor)) continue;
    const fw = def.fitW(e), fl = rowFlow.get(row);
    if (fw < (fl?.w ?? row.w)) { row.w = Math.round(fw); if (fl) fl.w = fw; }
  }
  // 骑边小件（elx.satellites）伸出框外的留白（终期审查修复 ⑯ / ㉘）：画布按 satelliteReach 把排位尺寸撑大、邻居让开；这里写成 pad，GDScript 外面套 MarginContainer 留同样的地方
  for (const row of allRows) {
    const e = rowCtx.get(row), sat = e ? satSpecOf(th, row.id, rowForm.get(row)) : null;
    if (!e || !sat) continue;
    const m = satelliteReach(e, { w: rowFlow.get(row)?.w ?? row.w, h: rowFlow.get(row)?.h ?? row.h }, sat.list, sat.side, sat.count, sat.over);
    if (m.l > 0.01 || m.t > 0.01 || m.r > 0.01 || m.b > 0.01) row.pad = [m.l, m.t, m.r, m.b].map((v) => Math.round(v)) as [number, number, number, number];
  }
  // 宿主 = 已进锚点列的元素（第一个子项）；成环 / 宿主不在场的停靠者照常进锚点列
  const hostRow = (hid: string) => items.find((x) => x.id === hid) ?? dockable.find((x) => x.row.id === hid)?.row;
  const hostKey = (hid: string) => { const it = hostRow(hid); return it ? rowKey.get(it) ?? '' : ''; };
  const keyed = new Map(dockable.map((x) => [x.spec.id, x]));
  const present = (k: string) => items.some((x) => rowKey.get(x) === k) || keyed.has(k);
  const { order } = dockOrder(dockable.map((x) => ({ ...x.spec, host: hostKey(x.spec.host) || `?${x.spec.host}` })), present);
  const docked = new Set(order.map((o) => o.id));
  for (const x of dockable) if (!docked.has(x.spec.id)) { items.push(x.row); flow.push(x.flow); }
  // 宿主第几格（elx.dockSlot）只在宿主报了成员格（ElementDef.slots，现在只有 el.party）时算数，其余停在整个宿主旁——与画布一致（B6 审查修复 ④：原来照写 slot，
  // GDScript 取宿主容器的第 N 个子节点，el.vitals 取到第 N 行、别的元素取到标题 Label）
  // 跟着当前成员（elx.dockFollow = active，M12b-63）：写宿主报的当前成员格（ElementDef.activeSlot，与画布同一个），优先于 elx.dockSlot
  const docks: LayoutOut['docks'] = order.map((o) => {
    const x = keyed.get(o.id)!, hid = o.host.split('|')[0], hd = ELEMENTS.get(hid), he = ctxOf.get(hid);
    const slot = o.follow && hd?.activeSlot && he ? hd.activeSlot(he) : o.slot;
    return [x.row.id, hid, o.side, Math.round(o.gap), o.align, hd?.slots ? slot : 0, x.row.w, x.row.h, x.row.form, x.row.label, x.row.pad ?? [0, 0, 0, 0]];
  });
  // 组织方式（M12a-16）：与画布同一份规划（compose/hud.ts 的 planEdgeBars / planMargins）；Godot 包里没有触屏层，触屏的障碍不算
  const org = hudOrgOf(th);
  const area = hudArea(th, R, org);
  let A = area.A;
  const bars: LayoutBar[] = [];
  let margin: LayoutOut['margin'] = null;
  let dropped: number[] = [];
  // 收进条 / 边框的元素按条里的顺序排在 LAYOUT 末尾（GDScript 按行序往格里加）
  const tail: LayoutItem[] = [];
  if (org === 'edgeBar' || org === 'console') {
    const fp = planEdgeBars(th, R, A, flow, area, []);
    for (const b of fp.bars) {
      bars.push({ edge: b.edge, divide: b.divide, segs: b.members.map((m) => m.length > 0) as [boolean, boolean, boolean], fit: +b.fit.toFixed(3) });
      let n = 0;
      b.members.forEach((ss, si) => ss.forEach((s) => {
        for (const i of s) {
          // 条里的尺寸 = 缩放后的（整条缩放 fit；竖条等宽的项取条宽）
          const q = fp.fixed.get(i)!;
          Object.assign(items[i], { edge: b.edge, side: SIDES[si], slot: n, w: Math.round(q.rect.w), h: Math.round(q.rect.h) });
          tail.push(items[i]);
        }
        n++;
      }));
    }
    A = fp.A;
    dropped = fp.out;
  } else if (org === 'inMargin') {
    const fp = planMargins(th, R, A, flow, area);
    if (fp.margins.length) {
      // 边框里：左 / 右按矩形在哪一侧，上 / 中 / 下按锚点所在排；同一侧从上到下
      const inM = [...fp.fixed.entries()].sort((a, b) => a[1].rect.y - b[1].rect.y);
      for (const [i, q] of inM) {
        const a = items[i].anchor;
        Object.assign(items[i], { edge: q.rect.x < R.x + R.w / 2 ? 'marginL' : 'marginR', side: a[0] === 't' ? 'top' : a[0] === 'b' ? 'bottom' : 'mid', w: Math.round(q.rect.w), h: Math.round(q.rect.h) });
        tail.push(items[i]);
      }
      const ar = fp.aspect ?? 4 / 3;
      margin = { side: Math.round(fp.margins[0].w), aspect: ASPECTS.find(([v]) => Math.abs(v - ar) < 1e-6)?.[1] ?? ar.toFixed(2) };
    }
    A = fp.A;
    dropped = fp.out;
  }
  const area4 = [A.x - R.x, A.y - R.y, R.x + R.w - (A.x + A.w), R.y + R.h - (A.y + A.h)].map((v) => Math.round(v)) as LayoutOut['area'];
  return { items: [...items.filter((it) => !it.edge), ...tail], world, view: [R.w, R.h], area: area4, gap: Math.round(area.gap), org, bars, margin, dropped: dropped.map((i) => items[i].label), span: r.str('lay.hudEdgeSpan', 'full') === 'content' ? 'content' : 'full', docks };
}

/** 元素近似用到的样本字段（示例内容包的 hud） */
export type LayoutSample = Pick<HudData, 'hp' | 'shield' | 'stamina' | 'hpMax' | 'vitals' | 'vitalNames' | 'res' | 'gold' | 'gems' | 'wood' | 'objectiveTitle' | 'objective' | 'feed' | 'party' | 'prompts' | 'subtitle' | 'cta'>;

/** hud_sample.gd 的 _build：按锚点成列，元素用内置控件近似；样本字一律 JSON.stringify（包里的字可能带引号、反斜杠） */
export function layoutGd(L: LayoutOut, sample: LayoutSample): string {
  const q = (s: string) => JSON.stringify(s);
  const data = L.items.map((it) => `\t[${q(it.anchor)}, ${q(it.id)}, ${q(it.form)}, ${it.w}, ${it.h}, ${q(it.label)}, ${q(it.stack)}, ${it.match}, ${it.off[0]}, ${it.off[1]}, ${q(it.edge)}, ${q(it.side)}, ${it.slot}, [${(it.pad ?? [0, 0, 0, 0]).join(', ')}]],`).join('\n');
  const bars = L.bars.map((b) => `${q(b.edge)}: [${q(b.divide)}, ${b.segs.join(', ')}]`).join(', ');
  // 生命类各行 [名, 比例]（M12a-12 的行模型：包的 vitals，没写时兼容出生命 / 护盾 / 体力三行）；资源栏三项 [符号, 数量]（数量写法同探索台的 el.resources）
  const vitals = vitalsOf(sample).map((x) => `[${q(x.name)}, ${x.v}]`).join(', ');
  const res = [sample.gold.toLocaleString('en'), String(sample.gems), String(sample.wood)].map((n, i) => `[${q(sample.res[i][0])}, ${q(n)}]`).join(', ');
  return `
## 元素排版（M9b）：[锚点, 元素, 画法, 宽, 高, 名字, 堆叠, 等宽, 横偏移 %, 纵偏移 %, 贴边条 / 边框, 段, 格, 骑边小件留白 [左, 上, 右, 下]]（宽高是设计单位，已含版面缩放）；
## 九个锚点各一行（HBox），行里每格一列（VBox：上排往下、下排往上、中排居中；elx.stackDir = row 另起一格），都放在散排版面 AREA 里；
## 收进贴边条的元素按条里的格排进那条边的三段（lay.edgeBarSlots 的顺序，"a|b" = 同一格并排；M12a-16 / 18），收进边框的放进左 / 右边框的上 / 中 / 下三段（lay.hudOrg = inMargin）
const LAYOUT := [
${data}
]
## 停靠（M12b-05）：[元素, 宿主, 边, 间距, 对齐, 宿主第几格（0 = 整个）, 宽, 高, 画法, 名字, 骑边小件留白]——不进锚点列，跟着宿主放（_dock_place）
const DOCKS := [
${(L.docks ?? []).map((d) => `\t[${q(d[0])}, ${q(d[1])}, ${q(d[2])}, ${d[3]}, ${q(d[4])}, ${d[5]}, ${d[6]}, ${d[7]}, ${q(d[8])}, ${q(d[9])}, [${d[10].join(', ')}]],`).join('\n')}
]
## 散排版面：[左, 上, 右, 下] 边距（设计单位：安全边距 + 设备安全区，已扣掉贴边条 / 边框——与探索台 compose/hud.ts 的 hudArea / planEdgeBars / planMargins 同一份）
const AREA := [${L.area.join(', ')}]
const GAP := ${L.gap}
## 贴边条：边 → [分隔线（slots = 每格之间 / segments = 只在中段两侧）, 起段有元素, 中段有元素, 末段有元素]
const BARS := {${bars}}
## 边框（lay.hudOrg = inMargin）：每侧宽（设计单位，0 = 不用边框）${L.margin ? `；玩法区 ${L.margin.aspect}` : ''}
const MARGIN_SIDE := ${L.margin?.side ?? 0}
const PRESETS := {
\t"tl": Control.PRESET_TOP_LEFT, "tc": Control.PRESET_CENTER_TOP, "tr": Control.PRESET_TOP_RIGHT,
\t"ml": Control.PRESET_CENTER_LEFT, "center": Control.PRESET_CENTER, "mr": Control.PRESET_CENTER_RIGHT,
\t"bl": Control.PRESET_BOTTOM_LEFT, "bc": Control.PRESET_CENTER_BOTTOM, "br": Control.PRESET_BOTTOM_RIGHT,
}
var _built := 0

const BAR_PRESETS := {"top": Control.PRESET_TOP_WIDE, "bottom": Control.PRESET_BOTTOM_WIDE, "left": Control.PRESET_LEFT_WIDE, "right": Control.PRESET_RIGHT_WIDE, "marginL": Control.PRESET_LEFT_WIDE, "marginR": Control.PRESET_RIGHT_WIDE}
## 贴边条长度（lay.hudEdgeSpan，M12b-65 ④）：content = 条按内容的最小尺寸收短、在这条边的中点居中
const BAR_SPAN := "${L.span}"
const BAR_CENTER := {"top": Control.PRESET_CENTER_TOP, "bottom": Control.PRESET_CENTER_BOTTOM, "left": Control.PRESET_CENTER_LEFT, "right": Control.PRESET_CENTER_RIGHT}

func _build(root: Control) -> void:
\tvar view := root.get_viewport_rect().size
\t# 贴边条 / 边框先放（画在元素下面）：条里没有元素的边不放
\tvar bars := {}
\tvar holders := {}
\tfor edge in BARS:
\t\tbars[edge] = _edge_bar(root, edge, holders)
\tif MARGIN_SIDE > 0:
\t\tfor side in ["marginL", "marginR"]:
\t\t\tbars[side] = _margin(root, side, holders)
\t# 散排的版面：铺满后按 AREA 往里收
\tvar area := Control.new()
\tarea.mouse_filter = Control.MOUSE_FILTER_IGNORE
\troot.add_child(area)
\tarea.set_anchors_preset(Control.PRESET_FULL_RECT)
\tarea.offset_left = AREA[0]
\tarea.offset_top = AREA[1]
\tarea.offset_right = -AREA[2]
\tarea.offset_bottom = -AREA[3]
\tvar columns := {}
\t# 已建的元素（停靠的宿主按 id 找第一个）
\tvar built := {}
\t# 同锚点共用底条（elx.stackDir = rowBar）：这一锚点的整行外面包一层 HudBar 面板
\tvar shared := {}
\tfor row in LAYOUT:
\t\tif row[6] == "rowBar" and row[10] == "":
\t\t\tshared[row[0]] = true
\tfor row in LAYOUT:
\t\tvar anchor: String = row[0]
\t\tvar el: Control = _element(row[1], row[2], Vector2(row[3], row[4]), row[5])
\t\tif not built.has(row[1]):
\t\t\tbuilt[row[1]] = el
\t\tif row[8] != 0 or row[9] != 0:
\t\t\tel = _offset(el, Vector2(row[8], row[9]) * view / 100.0)
\t\tel = _pad(el, row[13])
\t\tif row[10] != "":
\t\t\tvar seg: BoxContainer = bars[row[10]][row[11]]
\t\t\tif row[12] >= 0:
\t\t\t\t_slot(seg, row[10], row[12]).add_child(el)
\t\t\telse:
\t\t\t\tel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
\t\t\t\tseg.add_child(el)
\t\t\t_built += 1
\t\t\tcontinue
\t\tif not columns.has(anchor):
\t\t\tvar nl := HBoxContainer.new()
\t\t\tnl.add_theme_constant_override("separation", GAP)
\t\t\tif shared.has(anchor):
\t\t\t\tvar sb := PanelContainer.new()
\t\t\t\tsb.theme_type_variation = _type_var("Hud_hudBar", "HudBar")
\t\t\t\tsb.add_child(nl)
\t\t\t\tarea.add_child(sb)
\t\t\t\tholders[anchor] = sb
\t\t\telse:
\t\t\t\tarea.add_child(nl)
\t\t\t\tholders[anchor] = nl
\t\t\tcolumns[anchor] = nl
\t\tvar line: HBoxContainer = columns[anchor]
\t\tif line.get_child_count() == 0 or row[6] != "column":
\t\t\tvar nc := VBoxContainer.new()
\t\t\tnc.add_theme_constant_override("separation", GAP)
\t\t\t# 一行里的格：上排顶对齐、下排底对齐、中排居中（与探索台 place() 同口径）
\t\t\tif anchor.begins_with("b"):
\t\t\t\tnc.alignment = BoxContainer.ALIGNMENT_END
\t\t\telif not anchor.begins_with("t"):
\t\t\t\tnc.alignment = BoxContainer.ALIGNMENT_CENTER
\t\t\tline.add_child(nc)
\t\tvar cell: VBoxContainer = line.get_child(line.get_child_count() - 1)
\t\t# 格里每个元素按锚点对齐、保持自己的宽（与探索台的 ANCHOR_ALIGN 同口径；等宽 = 撑满格宽）
\t\tif row[7]:
\t\t\tel.size_flags_horizontal = Control.SIZE_FILL
\t\telif anchor in ["tr", "mr", "br"]:
\t\t\tel.size_flags_horizontal = Control.SIZE_SHRINK_END
\t\telif anchor in ["tc", "bc", "center"]:
\t\t\tel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
\t\telse:
\t\t\tel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
\t\tcell.add_child(el)
\t\t_built += 1
\t# 停靠者（M12b-05）：root 下的兄弟节点，宿主每次挪动 / 变大都跟着重放（停靠者的停靠者在后面，宿主已经建好）
\tfor d in DOCKS:
\t\tvar host: Control = built.get(d[1])
\t\tif host == null:
\t\t\tcontinue
\t\tvar dk: Control = _pad(_element(d[0], d[8], Vector2(d[6], d[7]), d[9]), d[10])
\t\troot.add_child(dk)
\t\tif not built.has(d[0]):
\t\t\tbuilt[d[0]] = dk
\t\t_built += 1
\t\thost.item_rect_changed.connect(_dock_place.bind(dk, host, d[2], float(d[3]), d[4], int(d[5])))
\t\t_dock_place.call_deferred(dk, host, d[2], float(d[3]), d[4], int(d[5]))
\t# 摆位：内容都加完以后按最小尺寸贴到锚点 / 边上（下 / 右的往回长）
\tfor key in holders:
\t\tvar col: Control = holders[key]
\t\tcol.reset_size()
\t\tvar short_bar: bool = BAR_SPAN == "content" and BAR_CENTER.has(key)
\t\tvar preset: int = BAR_CENTER[key] if short_bar else (BAR_PRESETS[key] if BAR_PRESETS.has(key) else PRESETS[key])
\t\tcol.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE)
\t\tif short_bar:
\t\t\tif key in ["top", "bottom"]:
\t\t\t\tcol.grow_horizontal = Control.GROW_DIRECTION_BOTH
\t\t\telse:
\t\t\t\tcol.grow_vertical = Control.GROW_DIRECTION_BOTH
\t\tif key in ["tr", "mr", "br", "right", "marginR"]:
\t\t\tcol.grow_horizontal = Control.GROW_DIRECTION_BEGIN
\t\telif key in ["tc", "bc", "center"]:
\t\t\tcol.grow_horizontal = Control.GROW_DIRECTION_BOTH
\t\tif key.begins_with("b"):
\t\t\tcol.grow_vertical = Control.GROW_DIRECTION_BEGIN
\t\telif key in ["ml", "mr", "center"]:
\t\t\tcol.grow_vertical = Control.GROW_DIRECTION_BOTH

## 停靠的位置（M12b-05，与探索台 compose/hud.ts 的 dockRect 同一组式子）：宿主矩形（第 slot 个子节点，0 = 整个）旁边，side = 边、gap = 间距、align = 对齐
func _dock_place(el: Control, host: Control, side: String, gap: float, align: String, slot: int) -> void:
\tvar h := host.get_global_rect()
\tif slot > 0:
\t\tvar box := host.get_child(0) if host.get_child_count() > 0 else null
\t\tif box != null and box.get_child_count() >= slot:
\t\t\th = (box.get_child(slot - 1) as Control).get_global_rect()
\tvar s := el.get_combined_minimum_size()
\tvar ax := h.position.x
\tvar ay := h.position.y
\tif align == "center":
\t\tax = h.position.x + (h.size.x - s.x) / 2.0
\t\tay = h.position.y + (h.size.y - s.y) / 2.0
\telif align == "end":
\t\tax = h.end.x - s.x
\t\tay = h.end.y - s.y
\tvar p := Vector2(h.end.x + gap, ay)
\tmatch side:
\t\t"left", "flankL":
\t\t\tp = Vector2(h.position.x - gap - s.x, ay)
\t\t"below":
\t\t\tp = Vector2(ax, h.end.y + gap)
\t\t"above", "end":
\t\t\tp = Vector2(ax, h.position.y - gap - s.y)
\t\t"cornerTL":
\t\t\tp = h.position - s / 2.0
\t\t"cornerTR":
\t\t\tp = Vector2(h.end.x, h.position.y) - s / 2.0
\t\t"cornerBL":
\t\t\tp = Vector2(h.position.x, h.end.y) - s / 2.0
\t\t"cornerBR":
\t\t\tp = h.end - s / 2.0
\tel.global_position = p

## 骑边小件留白（elx.satellites，M12b-05 ③；终期审查修复 ⑯ / ㉘）：四边按探索台 satelliteReach 的量（设计单位）套一层 MarginContainer，骑边的小件挂在留白里，邻居 / 停靠者不压它；没有留白时原样返回
func _pad(el: Control, p: Array) -> Control:
\tif p[0] == 0 and p[1] == 0 and p[2] == 0 and p[3] == 0:
\t\treturn el
\tvar m := MarginContainer.new()
\tm.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tm.add_theme_constant_override("margin_left", int(p[0]))
\tm.add_theme_constant_override("margin_top", int(p[1]))
\tm.add_theme_constant_override("margin_right", int(p[2]))
\tm.add_theme_constant_override("margin_bottom", int(p[3]))
\tm.add_child(el)
\treturn m

## 类型变体：主题里有按目标覆盖的 Hud_<目标>（审查修复 B · C6）就用它，否则用默认的
func _type_var(scoped: String, fallback: String) -> String:
\treturn scoped if THEME.has_stylebox("panel", scoped) else fallback

func _sep(vertical: bool) -> Separator:
\tif vertical:
\t\treturn HSeparator.new()
\treturn VSeparator.new()

## 偏移（elx.offsetX / offsetY，M12a-18）：外面套一层不排版的 Control 占位，元素按偏移放在里面
func _offset(el: Control, off: Vector2) -> Control:
\tvar w := Control.new()
\tw.custom_minimum_size = el.custom_minimum_size
\tw.add_child(el)
\tel.position = off
\treturn w

## 贴边条（lay.hudOrg = edgeBar / console，M12a-16）：锚到边的 PanelContainer（HudBar 类型变体，有 @hudBar 覆盖时 Hud_hudBar）+ 起 / 中 / 末三段；
## 分隔线与探索台 edgeBarPlan 一致：segments = 中段两侧各一条，slots = 每格之间（_slot 里加），没有中段时起 / 末两段之间一条
func _edge_bar(root: Control, edge: String, holders: Dictionary) -> Dictionary:
\tvar info: Array = BARS[edge]
\tvar vertical := edge == "left" or edge == "right"
\tvar bar := PanelContainer.new()
\tbar.name = "Bar_" + edge
\tbar.theme_type_variation = _type_var("Hud_hudBar", "HudBar")
\tbar.mouse_filter = Control.MOUSE_FILTER_IGNORE
\troot.add_child(bar)
\tholders[edge] = bar
\tvar box: BoxContainer = _box(vertical)
\tbox.add_theme_constant_override("separation", GAP)
\tbar.add_child(box)
\tvar segs := {}
\tfor side in ["start", "center", "end"]:
\t\tif (side == "center" and info[1] and info[2]) or (side == "end" and info[2] and info[3]):
\t\t\tbox.add_child(_sep(vertical))
\t\tvar seg: BoxContainer = _box(vertical)
\t\tseg.add_theme_constant_override("separation", GAP)
\t\tif vertical:
\t\t\tseg.size_flags_vertical = Control.SIZE_EXPAND_FILL
\t\telse:
\t\t\tseg.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\t\tif side == "center":
\t\t\tseg.alignment = BoxContainer.ALIGNMENT_CENTER
\t\telif side == "end":
\t\t\tseg.alignment = BoxContainer.ALIGNMENT_END
\t\tbox.add_child(seg)
\t\tsegs[side] = seg
\tif info[0] == "slots" and info[1] and info[3] and not info[2]:
\t\tsegs["center"].add_child(_sep(vertical))
\treturn segs

## 贴边条里的一格（同一格的几项并排，lay.edgeBarSlots 的 "a|b"）；按格分隔（slots）时格与格之间放一条分隔线
func _slot(seg: BoxContainer, edge: String, idx: int) -> HBoxContainer:
\tvar key := "Slot%d" % idx
\tif seg.has_node(key):
\t\treturn seg.get_node(key) as HBoxContainer
\tvar vertical := edge == "left" or edge == "right"
\tif BARS[edge][0] == "slots" and seg.get_child_count() > 0:
\t\tseg.add_child(_sep(vertical))
\tvar s := HBoxContainer.new()
\ts.name = key
\ts.add_theme_constant_override("separation", GAP)
\tif vertical:
\t\ts.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
\telse:
\t\ts.size_flags_vertical = Control.SIZE_SHRINK_CENTER
\tseg.add_child(s)
\treturn s

## 边框（lay.hudOrg = inMargin，玩法区两侧）：全高的 PanelContainer（HudBar），宽 MARGIN_SIDE，里面上 / 中 / 下三段
func _margin(root: Control, which: String, holders: Dictionary) -> Dictionary:
\tvar fr := PanelContainer.new()
\tfr.theme_type_variation = _type_var("Hud_hudBar", "HudBar")
\tfr.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tfr.custom_minimum_size = Vector2(MARGIN_SIDE, 0)
\troot.add_child(fr)
\tfr.name = which
\tholders[which] = fr
\tvar box := VBoxContainer.new()
\tbox.add_theme_constant_override("separation", GAP)
\tfr.add_child(box)
\tvar segs := {}
\tfor side in ["top", "mid", "bottom"]:
\t\tvar seg := VBoxContainer.new()
\t\tseg.add_theme_constant_override("separation", GAP)
\t\tseg.size_flags_vertical = Control.SIZE_EXPAND_FILL
\t\tif side == "mid":
\t\t\tseg.alignment = BoxContainer.ALIGNMENT_CENTER
\t\telif side == "bottom":
\t\t\tseg.alignment = BoxContainer.ALIGNMENT_END
\t\tbox.add_child(seg)
\t\tsegs[side] = seg
\treturn segs

func _box(vertical: bool) -> BoxContainer:
\tif vertical:
\t\treturn VBoxContainer.new()
\treturn HBoxContainer.new()

func _bar(v: float) -> ProgressBar:
\tvar b := ProgressBar.new()
\tb.value = v * 100
\tb.show_percentage = false
\tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tb.custom_minimum_size = Vector2(60, 8) * SCALE
\treturn b

func _key(t: String) -> PanelContainer:
\tvar k := PanelContainer.new()
\tk.theme_type_variation = "HudKey"
\tk.custom_minimum_size = Vector2(22, 22) * SCALE
\tvar l := _label(t, "HudKeyLabel")
\tl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tk.add_child(l)
\treturn k

## 每个元素用内置控件近似；没有专门近似的元素画成"名字 + 面板"。size = 探索台 size() 的设计单位（已含版面缩放）。
## 元素有按目标的覆盖（col.surface@el.x……，审查修复 B · C6）时面板用主题里的 Hud_<元素> 变体、正文字用 Hud_<元素>Label
func _element(id: String, form: String, size: Vector2, title: String) -> Control:
\tvar p := PanelContainer.new()
\tp.custom_minimum_size = size
\tp.name = id.replace(".", "_").replace("#", "_")
\tvar hv := "Hud_" + id.replace(".", "_").replace("#", "_")
\t# 元素实例（el.x#2）没有自己的变体时用第一份的（与画布的目标链 [el.x#2, el.x] 一致，B6 审查修复 ⑱）
\tif not THEME.has_stylebox("panel", hv) and id.contains("#"):
\t\thv = "Hud_" + id.get_slice("#", 0).replace(".", "_")
\tvar scoped := THEME.has_stylebox("panel", hv)
\tif scoped:
\t\tp.theme_type_variation = hv
\tvar lv: String = hv + "Label" if THEME.has_color("font_color", hv + "Label") else "Label"
\tvar box := VBoxContainer.new()
\tbox.add_theme_constant_override("separation", 4)
\tp.add_child(box)
\tmatch id.get_slice("#", 0):
\t\t"el.vitals":
\t\t\tfor row in [${vitals}].slice(0, max(1, int(size.y / (26 * SCALE)))):
\t\t\t\tvar h := HBoxContainer.new()
\t\t\t\th.add_child(_label(row[0], lv))
\t\t\t\th.add_child(_bar(row[1]))
\t\t\t\tbox.add_child(h)
\t\t"el.resources":
\t\t\tvar h := HBoxContainer.new()
\t\t\th.add_theme_constant_override("separation", 10)
\t\t\tfor pair in [${res}]:
\t\t\t\th.add_child(_label(pair[0], "HudIcon"))
\t\t\t\th.add_child(_label(pair[1], "HudName"))
\t\t\tbox.add_child(h)
\t\t"el.abilities", "el.toolbar":
\t\t\tvar h := HBoxContainer.new()
\t\t\tfor i in range(maxi(1, int(size.x / (58 * SCALE)))):
\t\t\t\th.add_child(_key(str(i + 1)))
\t\t\tbox.add_child(h)
\t\t"el.minimap":
\t\t\t# 小地图框（有 @el.minimap 覆盖时 Hud_el_minimap 已按小地图框的样式导出）
\t\t\tif not scoped:
\t\t\t\tp.theme_type_variation = "HudMinimap"
\t\t\tvar dot := Panel.new()
\t\t\tdot.theme_type_variation = "HudDot"
\t\t\tdot.custom_minimum_size = Vector2(8, 8) * SCALE
\t\t\tdot.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
\t\t\tdot.size_flags_vertical = Control.SIZE_SHRINK_CENTER | Control.SIZE_EXPAND
\t\t\tbox.add_child(dot)
\t\t"el.objective":
\t\t\tbox.add_child(_label(${q(sample.objectiveTitle)}, "HudTitle"))
\t\t\tfor line in ${JSON.stringify(sample.objective)}:
\t\t\t\tbox.add_child(_label(line, lv))
\t\t"el.notify":
\t\t\tfor line in ${JSON.stringify(sample.feed)}:
\t\t\t\tbox.add_child(_label(line, lv))
\t\t"el.party":
\t\t\tfor m in ${JSON.stringify(sample.party)}:
\t\t\t\tvar h := HBoxContainer.new()
\t\t\t\th.add_child(_label(m[0], "HudName"))
\t\t\t\th.add_child(_bar(m[1]))
\t\t\t\tbox.add_child(h)
\t\t"el.prompt":
\t\t\tvar h := HBoxContainer.new()
\t\t\th.add_theme_constant_override("separation", 6)
\t\t\tfor pair in ${JSON.stringify(sample.prompts)}:
\t\t\t\th.add_child(_key(pair[0]))
\t\t\t\th.add_child(_label(pair[1], lv))
\t\t\tbox.add_child(h)
\t\t"el.subtitle":
\t\t\t# 对白框（有 @el.subtitle 覆盖时 Hud_el_subtitle 已按对白框的样式导出）
\t\t\tif not scoped:
\t\t\t\tp.theme_type_variation = "HudDialog"
\t\t\tbox.add_child(_label(${q(`${sample.subtitle[0] ? `${sample.subtitle[0]}：` : ''}${sample.subtitle[1]}`)}, lv))
\t\t"el.cta":
\t\t\tvar b := Button.new()
\t\t\t# 按钮的按目标覆盖（typ.button.size@button、col.*@button……）导出成 Hud_button（审查修复 B · C6）
\t\t\tif THEME.has_stylebox("normal", "Hud_button"):
\t\t\t\tb.theme_type_variation = "Hud_button"
\t\t\tb.text = ${q(sample.cta.start)}
\t\t\tb.custom_minimum_size = size
\t\t\treturn b
\t\t_:
\t\t\tbox.add_child(_label(title, "HudTitle"))
\t\t\tvar f := _label(form, lv)
\t\t\tf.modulate.a = 0.6
\t\t\tbox.add_child(f)
\treturn p
`;
}
