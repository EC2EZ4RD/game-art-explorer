import { ANCHOR_ALIGN, tiltExtent, withTilt, attachFor, attachPoint, edgeArrow, edgeArrowRect, elementParts, ELEMENTS, makeCtx, ornColor, pointSized, satelliteReach, satellites, SATELLITE_KINDS, type Align, type Anchor, type Attach, type AttachSide, type ElCtx, type ElementPart, anchorsOf, earTab, elementEnds, elementFrame } from '../elements/core';
import { safeInsets, type Insets } from '../sys/device';
import { touchLayer } from './touch';
import '../elements/combat';
import '../elements/info';
import '../elements/meta';
import '../elements/inventory';
import '../elements/broadcast';
import { parseColor, withAlpha } from '../material';
import type { Rect } from '../paint';
import { baseId, SELECTORS } from '../sys/register';
import { SPEC } from '../sys/spec';
import { enterXf, simNow } from '../sim';
import { perspectiveScale, worldNow } from '../world';
import { drawText, DRAW_LOG, paintScale, QUALITY, withSkew, type LoggedText } from '../paint';
import { lumIn, requestSceneLum, sceneSig } from '../sceneLum';
import { afterSkin, px1080, type Theme } from '../sys/theme';
import { SAMPLE_HUD, type DrawCtx } from './sample';
import { frameOccupancy, inflateRect, intersects, Occupancy, overlapArea, type TemplateSub } from './occupancy';
import { drawEdgeBar, edgeBarPlan, hudBarBox, type BarSegment, type BarSide, type EdgePlan } from './edgebar';
import { flourish, microBlock, microBlockSize, microRand, ovhBegin, ovhEnd } from '../ornament';
import { DOCK_SIDES, dockAlignDefault, dockRect, dockOrder, type DockSpec } from './dock';
import { FONT_STACK } from '../sys/theme';

/*
 * 按信息元素排版的局内 HUD（docs/ui-hud-plan.md M5a）：
 *   cnt.elements 里的每个元素：画法（el.<元素>.form / cmp.gauge@el.<元素>）、锚点（el.<元素>.screenAnchor，默认按元素）、
 *   缩放（elx.scale）、优先级（primary 放大、ambient 缩小变淡）、数值标注、显隐（按需显示的画成半透明）；
 *   九个锚点各自成一行「格」（M12a-18：elx.stackDir = column 接在当前格下面、row / rowBar 在右边另起一格；没写时就是原来的一列）：上排往下排、下排往上排、中排整体垂直居中；
 *   安全边距读 lay.safeMargin。挂在世界里的元素（交互提示、敌人血条……）落在投影点上。
 * 组织方式（M12a-16，lay.hudOrg）：edgeBar = 一条边上的元素收进贴边整条、console = 底边整条 + 两端仪表盒、inMargin = 版面收进中间 4:3 / 16:9、两侧边框装 HUD。
 * 避让（M12a-17，占位表 compose/occupancy.ts）：中列与侧列冲突时先横向收缩（在两侧之间的空宽里居中，不够就缩放，下限 0.75），仍放不下才纵向挪，纵向不越过画面中线；
 *   触屏层、贴边条、模板已画区域是固定障碍；世界挂点元素落进元素占的地方时不画；elx.avoidPlayer 的元素在玩家进入时翻到对边。
 * 世界挂点（M12a-15，elx.attachTo）：画在点上的小元素（交互提示、头顶血条、飘字……）读显式的挂点；整块元素（生命条、字幕、造价……）显式给了 attachTo 时
 *   不进锚点列，矩形 = 投影点 + elx.attachOffset（挂点哪一边）+ elx.attachGap，宽可跟角色（elx.attachWidth = actor），夹紧在安全区里；
 *   屏外按 elx.offscreen（clamp / hide / edgeArrow），压到屏幕上的 HUD 时按 elx.occlusion（push 推开 / hide 不画 / none 不管）。
 * 每个元素的外接矩形记下来，参数面板的"点选元素"据此找到点中的是哪个。
 */

/** 命中框：element = 元素 id（参数面板点选落到元素）；form = 按画法拆开画时的那一种画法（M12a-14） */
/**
 * 命中框：element = 元素 id（参数面板点选落到元素）；form = 按画法拆开画时的那一种画法（M12a-14）。
 * 部件命中框（轨道 E 第二阶段，模板 / 菜单的面板、标题、页签、列表行、按钮，约定见 HudSystem.ts 的 PartHit）：kind = 'part'、part = 部件种类、target = 覆盖目标 tpl.<id>、label = 中文名签
 */
export interface Hit { element: string; rect: Rect; form?: string; kind?: 'part'; part?: string; target?: string; label?: string }
/** 叙事内的元素：画在自己的画布上，由引擎挂成世界里的板子（M6） */
export interface DiegeticItem { id: string; canvas: HTMLCanvasElement; cssW: number; cssH: number; attach: string; mode: 'billboard' | 'decal' }

/** drawElements 的附加选项（M12a-19，§2 的 {inTemplate, occupied}） */
export interface ElementsOpts {
  /** 只排这些元素（模板里按锚点空间分的组、弹出模板垫底 / 菜单打开时保留的局内元素）；不给 = cnt.elements */
  ids?: string[];
  /** 模板里的元素：不受 rel.hudVisibility 影响（显隐策略只管局内 HUD），不按 lay.hudOrg 收进贴边条 */
  inTemplate?: boolean;
  /** 模板已经画了的区域（页头 / 主体 / 数据区 / 按钮行）：元素当固定障碍避开（显式 elx.anchorSpace = container 的那一组） */
  occupied?: Rect[];
  /** occupied 每一块是什么（与 occupied 同序：header / buttons / focal……，中期审查修复 ㉛：夹在主体大字与按钮行之间的元素要认得出按钮行） */
  occupiedSub?: (TemplateSub | undefined)[];
  /** 避开 occupied 时不能挪进去的地方（审查修复 A · D15：inherit 锚点空间躲页头时不挪到页签 / 按钮行 / 详情栏上，挪不开就留在原处） */
  blockers?: Rect[];
  /** 钉住的挂点（M12a-15）：这几种挂点这次画在给定位置（lay.container = anchoredCard 时卡片挂的点改成卡外下沿：世界挂点的提示不压卡片） */
  pins?: Partial<Record<Attach, { x: number; y: number }>>;
  /** 不画触屏层（垫底与保留元素那几遍） */
  noTouch?: boolean;
  /** 版面边距（设计单位）：给了就不按 lay.safeMargin 与设备安全区算（页头行、数据区、详情栏这类小区域） */
  margin?: number;
  /**
   * 只画 / 不画这几个元素（审查修复 A · L4）：排位照样按全部 ids 排，画的时候过滤——菜单打开时保留的元素（elx.keepOnMenu）与垫底的局内 HUD
   * 用同一份排位（原来两遍各排各的，都从锚点角起排，时钟压在资源上）。only 时不画贴边条 / 边框底板与共用底条（它们属于垫底那一遍）
   */
  paint?: { only?: string[]; except?: string[] };
  /** 不受 rel.hudVisibility 影响（保留元素那一遍：显隐策略只管局内 HUD） */
  keepVis?: boolean;
  /** 不并进帧占位表（同一份排位第二次画时：垫底那一遍已经登记过） */
  noRegister?: boolean;
  /**
   * 只排不画（M12b-64）：排位与避让照常，返回各元素（不含画在点上的小元素）排好的矩形，不画、不登记占位表——模板先排钉在屏幕上的元素让容器收边（containerYield）、
   * 先排容器里的元素让数据区让位（dataYield）
   */
  layoutOnly?: boolean;
}

/**
 * 局内 HUD 按元素排版吗：显式选了品类布局、手动改过元素集合，或（docs/workbench-redesign.md §8 RC2）布局跟随画面品类（auto）且解析出了元素——
 * 默认 HUD 直接画品类布局，不再画 M1 的四控件回归样本；样本只在开发 / QA 开关（compose/sample.ts 的 SAMPLE_HUD）打开时画
 */
export function wantsElements(th: Theme): boolean {
  const lay = th.r.art[SELECTORS.layout];
  if (lay !== undefined && lay !== 'auto' && lay !== 'none') return true;
  const src = th.r.src('cnt.elements')?.layer;
  if (src === 'user' || src === 'screenOverride' || src === 'screen') return true;
  if (SAMPLE_HUD.on || lay === 'none') return false;
  return !!th.r.presets.layout && th.r.elements().length > 0;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clampTo = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.max(lo, Math.min(hi, v)));
const SIDES = new Set<string>(['above', 'below', 'left', 'right', 'center']);
/** 角色在挂点处的近似包围盒（设计单位 × 版面缩放）：左右 24、上 36、下 8——与占位表里世界挂点小元素的包围盒同一个（M12a-17） */
const actorBox = (p: { x: number; y: number }, s: number): Rect => ({ x: p.x - 24 * s, y: p.y - 36 * s, w: 48 * s, h: 44 * s });
const ROW: Record<Anchor, 'top' | 'mid' | 'bottom'> = { tl: 'top', tc: 'top', tr: 'top', ml: 'mid', center: 'mid', mr: 'mid', bl: 'bottom', bc: 'bottom', br: 'bottom' };
const COL: Record<Anchor, 'left' | 'center' | 'right'> = { tl: 'left', ml: 'left', bl: 'left', tc: 'center', center: 'center', bc: 'center', tr: 'right', mr: 'right', br: 'right' };
/** elx.avoidPlayer 的翻转：上下排互换，中排不翻 */
const FLIP: Partial<Record<Anchor, Anchor>> = { tl: 'bl', bl: 'tl', tc: 'bc', bc: 'tc', tr: 'br', br: 'tr' };
/** 贴边条：每条边收哪些锚点 */
const EDGE_ANCHORS: Record<string, Anchor[]> = { top: ['tl', 'tc', 'tr'], bottom: ['bl', 'bc', 'br'], left: ['tl', 'ml', 'bl'], right: ['tr', 'mr', 'br'] };
/** 中列横向收缩的下限（M12a-17：elx.scale × 0.75）；同时是边框 / 单格贴边条 / 超出版面的锚点组的缩放下限（审查修复 A · D2 / L2 / L3：原来 0.5） */
const MIN_FIT = 0.75;
/** 整组缩到 MIN_FIT 以后单个元素仍比版面大时的再缩下限（终期审查修复 ㉛） */
const FIT_FLOOR = 0.5;
/** 贴边条整条缩放的下限：再小就把低优先级的格退回散排（审查修复 A · D2 / L3） */
const BAR_FIT = 0.85;
/** 必须居中的 Boss 条对称放不下时，条长最短收到原长的这么多（字号与粗细不变；目检修复） */
const BAR_NARROW = 0.5;
/** 玩家投影点外扩的软禁区半边长（设计单位，M12a-17「约 80px」） */
const PLAYER_ZONE = 80;
const PRI: Record<string, number> = { primary: 2, secondary: 1, ambient: 0 };

/**
 * 实际生效的 HUD 组织方式（lay.hudOrg，M12a-16）：scattered / edgeBar / console / inMargin。
 * 旧皮肤只认皮肤之后的层显式选的（品类布局写的 edgeBar / console / inMargin 不算，画面不变）
 */
export function hudOrgOf(th: Theme): string {
  const v = th.r.str('lay.hudOrg', 'scattered');
  if (!['edgeBar', 'console', 'inMargin'].includes(v)) return 'scattered';
  return th.legacy && !afterSkin(th.r, 'lay.hudOrg') ? 'scattered' : v;
}

/**
 * 贴边条的成员（M12a-16，compose/hud.ts 的排位与 export/godotLayout.ts 的导出共用）：edgeBar / console 时每一项归哪条边（不收进条的是 null）、在条里哪一段。
 * 边：lay.hudEdge（多选，角上的锚点归写在前面的那条）；没选 = 元素最多的那条边（同样多时按上、下、左、右）；console = 底边。
 * lay.edgeBarSlots 列出的元素不论锚点都收进第一条边。段：横条按锚点所在列（左 / 中 / 右 → 起 / 中 / 末），竖条按所在排；console 里 priority = primary 的放中段
 */
export function edgeMembership(th: Theme, list: { id: string; anchor: Anchor; priority: string }[]): { org: string; edges: string[]; edge: (string | null)[]; side: BarSide[]; slots: string[] } {
  const org = hudOrgOf(th), r = th.r;
  if (org !== 'edgeBar' && org !== 'console') return { org, edges: [], edge: list.map(() => null), side: list.map(() => 'start'), slots: [] };
  const slots = r.list('lay.edgeBarSlots').filter((x) => x && x !== 'auto');
  let edges = org === 'console' ? ['bottom'] : r.list('lay.hudEdge').filter((x) => x in EDGE_ANCHORS);
  // 不进贴边条的元素（elx.edgeBar = exclude，M12b-65 ③：Civ6 的领袖头像 / 系统钮锚在角上，原来一律被吸进顶栏，顶栏高到两三倍）
  const excluded = (id: string) => String(r.el(id, 'edgeBar') ?? 'auto') === 'exclude';
  if (!edges.length) {
    const cnt = (k: string) => list.filter((it) => !excluded(it.id) && EDGE_ANCHORS[k].includes(it.anchor)).length;
    const best = ['top', 'bottom', 'left', 'right'].reduce((a, b) => (cnt(b) > cnt(a) ? b : a), 'top');
    edges = cnt(best) ? [best] : [];
  }
  const listed = new Set(slots.flatMap((x) => x.split('|')));
  const edge = list.map((it) => (excluded(it.id) ? null : edges.find((ed, ei) => EDGE_ANCHORS[ed].includes(it.anchor) || (ei === 0 && listed.has(it.id))) ?? null));
  const side = list.map((it, i): BarSide => {
    const ed = edge[i];
    if (!ed) return 'start';
    if (org === 'console' && it.priority === 'primary') return 'center';
    const p = ed === 'left' || ed === 'right' ? ROW[it.anchor] : COL[it.anchor];
    return p === 'top' || p === 'left' ? 'start' : p === 'bottom' || p === 'right' ? 'end' : 'center';
  });
  return { org, edges, edge, side, slots };
}

/*
 * 排位的纯几何部分（审查修复 B：从 drawElements 抽出来，export/godotLayout.ts 用同一份导出 Godot 的版面、贴边条与边框，两边不会各算各的）：
 * hudArea = 版面；planEdgeBars / planMargins = 贴边条 / 边框收哪些元素、放在哪、缩多少，版面扣掉多少。输入只有元素的尺寸、锚点与优先级（FlowItem），不画
 */

/** 排位用的元素摘要：id、锚点、尺寸（设计单位，已含版面缩放）、优先级、等宽（elx.stackWidth = match） */
export interface FlowItem { id: string; anchor: Anchor; w: number; h: number; priority: string; match: boolean }
/** 版面：A = 画面去掉安全边距与设备安全区（超宽屏收进中间 16:9）；ins = 设备安全区（给了 margin 时 null）；gap / pad = 元素间距、条内留白 */
export interface HudArea { A: Rect; ins: Insets | null; gap: number; pad: number }
/** 贴边条：edge 边、bar 底板、plan 条内排位、fit 整条缩放、slots = 格（FlowItem 序号，按条里的顺序；"a|b" 一格两项）、members = [段][格][项] */
export interface BarOut { edge: string; vertical: boolean; bar: Rect; plan: EdgePlan; fit: number; divide: 'slots' | 'segments'; slots: number[][]; members: number[][][] }
/** 规划结果：A = 扣掉条 / 边框后的版面；fixed = 收进去的元素（FlowItem 序号 → 矩形、缩放、内容对齐）；out = 该收进去、但放不下退回散排的（FlowItem 序号）；margins = 边框（inMargin）；aspect = 玩法区画幅 */
export interface FlowPlan { A: Rect; fixed: Map<number, { rect: Rect; fit: number; align: Align }>; out: number[]; bars: BarOut[]; margins: Rect[]; aspect?: number }

/** HUD 的版面（drawElements 与 godotLayout.ts 共用）：margin 给了就只用它（模板里的小区域），否则 lay.safeMargin + 设备安全区 */
export function hudArea(th: Theme, R: Rect, org: string, margin?: number): HudArea {
  const r = th.r;
  const m = margin ?? (r.num('lay.safeMargin', 2) / 100) * Math.min(R.w, R.h) + 12;
  // 设备安全区（M8b）：刘海 / 底部横条 / 电视过扫描那几条边再往里收，逐边取较大值
  const ins = margin === undefined ? safeInsets(r) : null;
  const ml = Math.max(m, ins ? ins.l * R.w + 8 : 0), mr = Math.max(m, ins ? ins.r * R.w + 8 : 0);
  const mt = Math.max(m, ins ? ins.t * R.h + 8 : 0), mb = Math.max(m, ins ? ins.b * R.h + 8 : 0);
  let A: Rect = { x: R.x + ml, y: R.y + mt, w: R.w - ml - mr, h: R.h - mt - mb };
  // 超宽屏（ctx.aspect = 21:9，M10）：HUD 收进中间 16:9 区域，眼睛不用扫到两边（inMargin 时并进它的边框：中间 16:9 是玩法区，两侧装 HUD）
  if (org !== 'inMargin' && r.str('ctx.aspect', '16x9') === '21x9' && A.w > A.h * 16 / 9) { const w = A.h * 16 / 9; A = { ...A, x: A.x + (A.w - w) / 2, w }; }
  return { A, ins, gap: 10 * th.scale, pad: 6 * th.scale };
}

/** 贴边条（lay.hudOrg = edgeBar / console，M12a-16；缩放下限与退回散排见审查修复 A · D2 / L3）。touch = 触屏摇杆 / 按钮簇（Godot 导出没有，传 []） */
export function planEdgeBars(th: Theme, R: Rect, A0: Rect, flow: FlowItem[], area: HudArea, touch: Rect[]): FlowPlan {
  const org = hudOrgOf(th), { gap, pad, ins } = area;
  let A = { ...A0 };
  const fixed: FlowPlan['fixed'] = new Map(), bars: BarOut[] = [], out: number[] = [];
  // 成员与分段（edgeMembership）
  const em = edgeMembership(th, flow.map((it) => ({ id: it.id, anchor: it.anchor, priority: it.priority })));
  const slotSpec = em.slots;
  const divide = slotSpec.length ? 'slots' : 'segments';
  let edgeR: Rect = { ...R };
  const W = (i: number) => flow[i].w, H = (i: number) => flow[i].h;
  em.edges.forEach((edge, ei) => {
    const vertical = edge === 'left' || edge === 'right';
    const mine = flow.map((_, i) => i).filter((i) => em.edge[i] === edge);
    if (!mine.length) return;
    // 格：列出的按列表顺序（"a|b" 并排一格），其余每个元素一格接在后面
    const slots: number[][] = [];
    if (ei === 0) for (const s of slotSpec) { const grp = mine.filter((i) => s.split('|').includes(flow[i].id)); if (grp.length) slots.push(grp); }
    for (const i of mine) if (!slots.some((s) => s.includes(i))) slots.push([i]);
    const sideOf = (i: number): BarSide => em.side[i];
    const segOf = (s: number[]) => sideOf(s[0]);
    // 竖条避开触屏层（审查修复 A · L3）：摇杆 / 按钮簇压进竖条的那一截不放东西（条在它上面结束）
    let span: Rect = { ...edgeR };
    if (vertical) for (const t of touch) {
      const bx0 = edge === 'left' ? edgeR.x : edgeR.x + edgeR.w - R.w * 0.32;
      if (t.x < bx0 + R.w * 0.32 && bx0 < t.x + t.w && t.y > span.y + 80) span = { ...span, h: Math.min(span.h, t.y - gap - span.y) };
    }
    const availAlong = vertical ? Math.min(A.y + A.h, span.y + span.h - pad) - Math.max(A.y, span.y + pad) : A.w;
    // 条放不下（沿条方向的总长超过版面）时整条一起缩放；缩到 0.85 还放不下，就把优先级最低的格（同级时排在后面的）退回散排，
    // 剩一格时下限 0.75，再放不下这条边就不收（审查修复 A · D2 / L3：原来缩到 0.5，字只剩一半、仍然出画 / 压到别的格）
    const slotAlong = (s: number[]) => (vertical ? Math.max(...s.map(H)) : s.reduce((a, i) => a + W(i), 0) + gap * Math.max(0, s.length - 1));
    const wideOf = (ss: number[][]) => Math.max(...ss.map((s) => s.reduce((a, i) => a + W(i), 0) + gap * Math.max(0, s.length - 1)));
    // 缩放只缩元素、不缩格间距：fit = (可用长 − 间距) ÷ 元素总长（原来连间距一起按比例算，缩小时末段比条长出几个间距）
    const fitOf = (ss: number[][]) => Math.min(1, (availAlong - gap * (Math.max(0, ss.length - 1) + 2)) / Math.max(1, ss.reduce((a, sl) => a + slotAlong(sl), 0)), vertical ? (R.w * 0.32) / Math.max(1, wideOf(ss)) : 1);
    const slotPri = (s: number[]) => Math.max(...s.map((i) => PRI[flow[i].priority] ?? 1));
    while (slots.length > 1 && fitOf(slots) < BAR_FIT) {
      let v = slots.length - 1;
      for (let i = slots.length - 1; i >= 0; i--) if (slotPri(slots[i]) < slotPri(slots[v])) v = i;
      slots.splice(v, 1);
    }
    if (fitOf(slots) < MIN_FIT) { out.push(...mine); return; }
    const inBar = slots.flat();
    out.push(...mine.filter((i) => !inBar.includes(i)));
    const fit = fitOf(slots);
    const maxW = wideOf(slots) * fit;
    const sizeOf = (i: number) => ({ w: vertical && flow[i].match ? maxW : W(i) * fit, h: H(i) * fit });
    // 横条高 = 条里最高的元素 + 上下留白（底座：中段最高的；两端更高的元素各垫一块仪表盒）；竖条宽 = 最宽的一格 + 留白
    const midH = Math.max(0, ...inBar.filter((i) => sideOf(i) === 'center').map(H)) * fit;
    const cross = vertical ? maxW : org === 'console' && midH ? midH : Math.max(...inBar.map(H)) * fit;
    const insE = ins ? (edge === 'top' ? ins.t * R.h : edge === 'bottom' ? ins.b * R.h : edge === 'left' ? ins.l * R.w : ins.r * R.w) : 0;
    const thick = cross + pad * 2 + insE;
    let bar: Rect = edge === 'top' ? { x: edgeR.x, y: edgeR.y, w: edgeR.w, h: thick } : edge === 'bottom' ? { x: edgeR.x, y: edgeR.y + edgeR.h - thick, w: edgeR.w, h: thick }
      : edge === 'left' ? { x: span.x, y: span.y, w: thick, h: span.h } : { x: span.x + span.w - thick, y: span.y, w: thick, h: span.h };
    // 底边条压到触屏层（审查修复 A · L3：摇杆 / 按钮簇原来画在条上）：整条抬到触屏层上面
    if (edge === 'bottom') { const hit = touch.filter((t) => intersects(t, bar, 0)); if (hit.length) { const top = Math.min(...hit.map((t) => t.y)) - gap; if (top - thick > R.y + R.h * 0.4) bar = { ...bar, y: top - thick }; } }
    // 条内放东西的区域：沿条方向取安全区以内，横穿方向去掉留白（与设备安全区那一侧）
    let content: Rect = vertical
      ? { x: bar.x + (edge === 'left' ? insE : 0) + pad, y: Math.max(A.y, bar.y + pad), w: maxW, h: Math.min(A.y + A.h, bar.y + bar.h - pad) - Math.max(A.y, bar.y + pad) }
      : { x: A.x, y: bar.y + (edge === 'top' ? insE : 0) + pad, w: A.w, h: cross };
    // 条长（lay.hudEdgeSpan，M12b-65 ④，into-the-breach#18）：content = 按内容收短、在这条边上居中的一截（ITB 顶栏的居中细框短条）；full = 原来的整条边
    if (th.r.str('lay.hudEdgeSpan', 'full') === 'content') {
      const len = slots.reduce((a, sl) => a + slotAlong(sl), 0) * fit + gap * (Math.max(0, slots.length - 1) + 2);
      if (vertical) { const L = Math.min(content.h, len), y0 = content.y + (content.h - L) / 2; content = { ...content, y: y0, h: L }; bar = { ...bar, y: y0 - pad, h: L + pad * 2 }; }
      else { const L = Math.min(content.w, len), x0 = content.x + (content.w - L) / 2; content = { ...content, x: x0, w: L }; bar = { ...bar, x: x0 - pad, w: L + pad * 2 }; }
    }
    const segs: BarSegment[] = (['start', 'center', 'end'] as BarSide[]).map((side) => ({ side, slots: slots.filter((s) => segOf(s) === side).map((s) => ({ items: s.map(sizeOf) })) }));
    const members = (['start', 'center', 'end'] as BarSide[]).map((side) => slots.filter((s) => segOf(s) === side));
    const plan = edgeBarPlan(bar, content, vertical, segs, gap, divide);
    members.forEach((ss, si) => ss.forEach((s, sj) => s.forEach((i, k) => {
      let rr = plan.rects[si][sj][k];
      // 底座两端：比条高的元素底对齐，垫一块加高的仪表盒（见下）
      if (org === 'console' && si !== 1 && rr.h > cross) rr = { ...rr, y: bar.y + bar.h - insE - pad - rr.h };
      const al: Align = vertical ? 'center' : si === 0 ? 'left' : si === 2 ? 'right' : 'center';
      fixed.set(i, { rect: rr, fit, align: al });
    })));
    if (org === 'console') for (const si of [0, 2]) {
      const rs = members[si].flat().map((i) => fixed.get(i)!.rect);
      if (!rs.length) continue;
      const top = Math.min(...rs.map((q) => q.y)) - pad;
      if (top >= bar.y - 0.5) continue;
      const x0 = Math.min(...rs.map((q) => q.x)) - pad, x1 = Math.max(...rs.map((q) => q.x + q.w)) + pad;
      plan.boxes.push({ x: x0, y: top, w: x1 - x0, h: bar.y + bar.h - top });
    }
    bars.push({ edge, vertical, bar, plan, fit, divide, slots: members.flat(), members });
    // 从版面与剩余的屏幕区里扣掉条（抬起来的底边条：条以下的触屏区也扣掉）
    if (edge === 'top') { const y = bar.y + bar.h + gap; A = { ...A, h: A.y + A.h - Math.max(A.y, y), y: Math.max(A.y, y) }; edgeR = { ...edgeR, y: bar.y + bar.h, h: edgeR.h - bar.h }; }
    else if (edge === 'bottom') { A = { ...A, h: Math.min(A.y + A.h, bar.y - gap) - A.y }; edgeR = { ...edgeR, h: bar.y - edgeR.y }; }
    else if (edge === 'left') { const x = bar.x + bar.w + gap; A = { ...A, w: A.x + A.w - Math.max(A.x, x), x: Math.max(A.x, x) }; edgeR = { ...edgeR, x: bar.x + bar.w, w: edgeR.w - bar.w }; }
    else { A = { ...A, w: Math.min(A.x + A.w, bar.x - gap) - A.x }; edgeR = { ...edgeR, w: edgeR.w - bar.w }; }
  });
  return { A, fixed, out, bars, margins: [] };
}

/**
 * 边框（lay.hudOrg = inMargin，审查修复 A · D2 / L3）：玩法区的画幅按 lay.playfield 取候选——full 及其余 = 4:3（画面比 16:9 更宽时 16:9，原来的）、boxed = 4:3 → 1:1 → 3:4（框住的小窗）、
 * centerColumn = 3:4 → 9:16（居中竖条）；先取第一个让两侧边框不缩就放得下全部元素的，再取都能放下（各自缩放不低于 0.75、每列竖着排得下）的；都放不下时用最窄的那个，
 * 放不下的元素（优先级低的先退）退回散排、排进玩法区（原来固定 4:3、缩到 0.5：layout.shmup 的生命条字只剩 5 像素）。两侧边框装左列 / 右列的元素
 */
export function planMargins(th: Theme, R: Rect, A0: Rect, flow: FlowItem[], area: HudArea): FlowPlan {
  const { gap, pad } = area;
  let A = { ...A0 };
  const pf = th.r.str('lay.playfield', 'full');
  const cands = pf === 'boxed' ? [4 / 3, 1, 3 / 4] : pf === 'centerColumn' ? [3 / 4, 9 / 16] : [R.w / R.h > 16 / 9 + 0.01 ? 16 / 9 : 4 / 3];
  type MPlan = { side: number; aspect: number; at: Map<number, { rect: Rect; fit: number }>; out: number[]; full: boolean };
  const planFor = (target: number): MPlan | null => {
    const side = (R.w - R.h * target) / 2;
    if (side < 40) return null;
    const at = new Map<number, { rect: Rect; fit: number }>(), out: number[] = [];
    for (const col of ['left', 'right'] as const) {
      const mr0: Rect = col === 'left' ? { x: R.x, y: R.y, w: side, h: R.h } : { x: R.x + R.w - side, y: R.y, w: side, h: R.h };
      const inner = { x: mr0.x + pad, y: A.y, w: mr0.w - pad * 2, h: A.h };
      const fitOf = (i: number) => Math.min(1, inner.w / Math.max(1, flow[i].w));
      // 太宽的（缩到 0.75 还放不下）退回散排；再按列高，从优先级最低的（同级时排在后面的）开始退
      let mine = flow.map((_, i) => i).filter((i) => COL[flow[i].anchor] === col);
      for (const i of mine) if (fitOf(i) < MIN_FIT) out.push(i);
      mine = mine.filter((i) => fitOf(i) >= MIN_FIT);
      const colH = (list: number[]) => list.reduce((a, i) => a + flow[i].h * fitOf(i), 0) + gap * Math.max(0, list.length - 1) + gap * 2;
      while (mine.length && colH(mine) > inner.h) {
        let v = mine.length - 1;
        for (let k = mine.length - 1; k >= 0; k--) if ((PRI[flow[mine[k]].priority] ?? 1) < (PRI[flow[mine[v]].priority] ?? 1)) v = k;
        out.push(mine[v]); mine = mine.filter((_, k) => k !== v);
      }
      const stack = (row: 'top' | 'mid' | 'bottom') => { const list = mine.filter((i) => ROW[flow[i].anchor] === row); return { list, h: list.reduce((a, i) => a + flow[i].h * fitOf(i), 0) + gap * Math.max(0, list.length - 1) }; };
      const tp = stack('top'), md = stack('mid'), bt = stack('bottom');
      // 中排原来在整列里居中；压到上 / 下排时改在两者之间的空当里居中
      let yMid = inner.y + (inner.h - md.h) / 2;
      const lo = inner.y + tp.h + (tp.list.length ? gap : 0), hi = inner.y + inner.h - bt.h - (bt.list.length ? gap : 0);
      if (md.list.length && (yMid < lo || yMid + md.h > hi)) yMid = lo + (hi - lo - md.h) / 2;
      for (const [st, y0] of [[tp, inner.y], [md, yMid], [bt, inner.y + inner.h - bt.h]] as const) {
        let y = y0;
        for (const i of st.list) { const f = fitOf(i), w = flow[i].w * f, h = flow[i].h * f; at.set(i, { rect: { x: inner.x + (inner.w - w) / 2, y, w, h }, fit: f }); y += h + gap; }
      }
    }
    return { side, aspect: target, at, out, full: [...at.values()].every((q) => q.fit >= 1) };
  };
  const plans = cands.map(planFor).filter((p): p is MPlan => !!p);
  // 先挑元素都不用缩的，再挑都放得下（≥ 0.75）的，都不行用最窄的
  const pick = plans.find((p) => !p.out.length && p.full) ?? plans.find((p) => !p.out.length) ?? plans[plans.length - 1];
  const fixed: FlowPlan['fixed'] = new Map(), margins: Rect[] = [];
  if (!pick) return { A, fixed, out: [], bars: [], margins };
  const side = pick.side;
  margins.push({ x: R.x, y: R.y, w: side, h: R.h }, { x: R.x + R.w - side, y: R.y, w: side, h: R.h });
  for (const [i, q] of pick.at) fixed.set(i, { ...q, align: 'center' });
  A = { ...A, x: Math.max(A.x, R.x + side + gap), w: Math.min(A.x + A.w, R.x + R.w - side - gap) - Math.max(A.x, R.x + side + gap) };
  return { A, fixed, out: pick.out, bars: [], margins, aspect: pick.aspect };
}

/**
 * 同锚点堆叠 / 偏移 / 躲开玩家（B7 的元素实例参数 elx.stackDir / stackWidth / offsetX / offsetY / avoidPlayer）实际生效的值：旧皮肤只认皮肤之后的层给的
 * （§0 旧皮肤的版式规则；目检修复起品类布局 layout.moba 写了 el.timer.stackDir，品类布局在皮肤之前）。compose/hud.ts 与 export/godotLayout.ts 共用
 */
export function layoutEl(th: Theme, id: string, k: string, form?: string): unknown {
  const r = th.r;
  return th.legacy && !afterSkin(r, r.elKey(id, k, form)) ? undefined : r.el(id, k, form);
}

/* ---- 元素锁扣（M12b-05，§2）：停靠 / 成组 / 骑边 / 宽高的纯几何（godotLayout.ts 共用） ---- */

// 停靠的边 / 默认对齐 / 停靠矩形 / 拓扑序：纯几何与拓扑在 compose/dock.ts（sys/check.ts 的 C-dock-cycle 共用同一份，B6 审查修复 ①）
export { DOCK_SIDES, dockAlignDefault, dockRect, dockOrder, type DockSpec } from './dock';
/** 元素的停靠设定（elx.dockTo / dockSide / dockGap / dockAlign / dockSlot；旧皮肤只认皮肤之后的层，layoutEl）；没停靠 null */
export function dockSpecOf(th: Theme, id: string, form?: string): DockSpec | null {
  const host = String(layoutEl(th, id, 'dockTo', form) ?? 'none');
  if (!host || host === 'none' || host === 'auto') return null;
  const side0 = String(layoutEl(th, id, 'dockSide', form) ?? 'auto'), side = (DOCK_SIDES as readonly string[]).includes(side0) ? side0 : 'right';
  const al0 = String(layoutEl(th, id, 'dockAlign', form) ?? 'auto'), align = ['start', 'center', 'end'].includes(al0) ? al0 : dockAlignDefault(side);
  const gv = Number(layoutEl(th, id, 'dockGap', form)), gap = px1080(Number.isFinite(gv) && gv >= 0 ? gv : 8) * th.scale;
  const sv = Number(layoutEl(th, id, 'dockSlot', form)), slot = Number.isFinite(sv) && sv >= 1 ? Math.round(sv) : 0;
  // 跟着宿主的当前成员（elx.dockFollow = active，M12b-63）与连接梁（elx.dockConnector，M12b-63）：选过才有
  const fo = String(layoutEl(th, id, 'dockFollow', form) ?? 'none') === 'active', lk = String(layoutEl(th, id, 'dockConnector', form) ?? 'none');
  return { id, host, side, gap, align, slot, ...(fo ? { follow: true } : {}), ...(lk === 'ironBeam' || lk === 'line' ? { link: lk } : {}) };
}
/** 骑边小件的设置（elx.satellites / satelliteSide / satelliteCount / satelliteOverhang，M12b-05 ③）：只认 SATELLITE_KINDS 里的种类，没有时 null；旧皮肤走 layoutEl。godotLayout 共用（终期审查修复 ⑯） */
export function satSpecOf(th: Theme, id: string, form?: string): { list: string[]; side: string; count: number; over: number } | null {
  const el = (k: string) => layoutEl(th, id, k, form), satK = el('satellites');
  const list = (Array.isArray(satK) ? satK : String(satK ?? '').split(',')).map((x) => String(x).trim()).filter((x) => (SATELLITE_KINDS as readonly string[]).includes(x));
  if (!list.length) return null;
  const ov = Number(el('satelliteOverhang'));
  return { list, side: String(el('satelliteSide') ?? 'auto'), count: Number(el('satelliteCount') ?? 2) || 2, over: Number.isFinite(ov) ? ov : 0.5 };
}
/** 元素宽高的后处理（elx.width / elx.height，M12b-05 ④，xcom2#1 的宽扁开火面板）：占屏宽 / 屏高的比例，给了就替掉 size() 的那一边（旧皮肤只认皮肤之后的层） */
export function sizeOverride(th: Theme, id: string, R: Rect, s: { w: number; h: number }, form?: string): { w: number; h: number } {
  const f = (k: string) => { const v = Number(layoutEl(th, id, k, form)); return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0; };
  const w = f('width'), h = f('height');
  return w || h ? { w: w ? w * R.w : s.w, h: h ? h * R.h : s.h } : s;
}

/** 元素的屏幕锚点是不是有人选过（元素级 / 模板 elx.screenAnchor 的来源层不是默认 / 兜底 / 默认规则） */
export function anchorGiven(r: Theme['r'], id: string): boolean {
  const l = r.src(r.elKey(id, 'screenAnchor'))?.layer;
  return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault';
}

/**
 * 模板元素排位 v2（M12b-64：默认锚点、页头槽的自动成员、数据区让位）在这一套参数上开不开：新皮肤都开；旧皮肤（§0 冻结）只在皮肤之后的层（复刻 / 手动）
 * 给了元素集合（cnt.elements）时开——旧皮肤 × 模板预设的对照图不变，搭在旧皮肤上的复刻照样修
 */
export const tplLayoutV2 = (th: Theme): boolean => !th.legacy || afterSkin(th.r, 'cnt.elements');

/**
 * 模板里元素的子项（M12b-64 ⑪）：只有一种画法、没人选锚点的元素用 ElementDef 自己的默认锚点（el.reward 居中、el.cta 下中、el.rank 右上……；
 * 原来拿 elx.screenAnchor 的兜底 tl，模板里的元素全挤在左上）。局内 HUD 照旧（品类布局都写了锚点，没写的仍按兜底 tl——评估见进度记录）；
 * 旧皮肤见 tplLayoutV2。screen.ts 的页头槽判断与 godotLayout 的迁移说明同口径
 */
export function templateParts(th: Theme, id: string, parts = elementParts(th.r, id)): ElementPart[] {
  const def = ELEMENTS.get(id);
  if (!tplLayoutV2(th) || !def || parts.length !== 1 || parts[0].form || anchorGiven(th.r, id) || parts[0].anchor === def.anchor) return parts;
  return [{ ...parts[0], anchor: def.anchor }];
}

/** 玩家在屏幕上的点（有投影用投影，没有场景时用画面中下的近似位置；投影不在屏上时 null） */
function playerPoint(e: ElCtx): { x: number; y: number } | null {
  const w = worldNow();
  if (w && !e.noWorld) return w.player && w.player.on !== false ? { x: w.player.x, y: w.player.y } : null;
  return attachPoint(e, 'player');
}

/**
 * 排位的跨帧记忆（审查修复 A · L1 / L5）：躲开玩家的翻转与清空帧数、世界挂点推开的方向与「推不开」的帧数。drawElements 仍是同输入同输出——
 * 记忆按参数对象（Values：同一套参数在每帧是同一个对象，A / B 两侧各一份）分开存，里面按这一遍的画面尺寸、选项与元素 id + 画法取；
 * 换了参数（resolveUi 的输入换了）就是新的一份，同一输入连画两遍结果相同（记忆只在输入在帧间变化时起作用），快照工具每个配置都是新对象。
 * 每份最多 256 项，满了清空（画面尺寸 / 选项变来变去时不涨）
 */
interface Memo { flip?: boolean; clear?: number; since?: number; push?: string; shift?: [number, number]; miss?: number }
const MEMO = new WeakMap<object, Map<string, Memo>>();
function memoFor(values: object, pass: string, readOnly = false): (key: string) => Memo {
  let m = MEMO.get(values);
  if (!m) MEMO.set(values, (m = new Map()));
  const store = m;
  return (key: string) => {
    const k = `${pass}|${key}`;
    let it = store.get(k);
    // 只排不画的那几遍（layoutOnly：模板的让位预排、fitScreen 的测量，中期审查修复 ㉟）读真画那一遍的记忆、写进一份拷贝：
    // 原来一帧里这几遍与真画的一遍共用同一份计数，迟滞（翻回要 6 帧、推不开再画 3 帧）一帧里就走完了
    if (readOnly) return it ? { ...it } : {};
    if (!it) { if (store.size >= 256) store.clear(); store.set(k, (it = {})); }
    return it;
  };
}
/** 叙事内元素的板子画布（B6 审查修复 ㉖）：按参数对象分开存（换了参数就是新的一份，旧的随参数对象回收），每份最多 32 张，满了清空 */
const BOARDS = new WeakMap<object, Map<string, HTMLCanvasElement>>();
function boardCanvas(values: object, key: string, w: number, h: number): HTMLCanvasElement {
  let m = BOARDS.get(values);
  if (!m) BOARDS.set(values, (m = new Map()));
  let cv = m.get(key);
  if (!cv) { if (m.size >= 32) m.clear(); cv = document.createElement('canvas'); cv.width = w; cv.height = h; m.set(key, cv); }
  return cv;
}
/** 翻回原位前原位要空出多少（设计单位，审查修复 A · L1） */
const HYST = 24;
/** 推开时沿用上一帧方向的余量（设计单位，审查修复 A · L5） */
const HYST_PUSH = 8;
/** 逐元素「情境显现」（elx.visibility = contextual）闲置时的不透明度（R4 · C3，black-myth#24：参考截图里这一刻是藏着的；留一点淡影，看得出元素在） */
export const EL_IDLE_CTX = 0.15;

/** skip：这次不画的元素（界面模板里已由别处画过、或此刻没有意义的，如空邮箱的附件） */
export function drawElements(d: DrawCtx, R: Rect, th: Theme, highlight?: string | null, diegetic?: DiegeticItem[], skip: string[] = [], opts: ElementsOpts = {}): Hit[] {
  const r = th.r;
  const ids = (opts.ids ?? r.elements()).filter((id) => ELEMENTS.has(id) && !skip.includes(id));
  // 边缘衬底要按画面亮度垫：画完以后（异步、节流）请引擎采一次不带 UI 的画面（sceneLum.ts；网格变了 HudSystem 会再画一次）
  if (QUALITY.on && th.scene && DRAW_LOG.on && !opts.inTemplate) requestSceneLum(sceneSig(th.r.art as Record<string, unknown>));
  // 组织方式（M12a-16）：模板里的元素不收进贴边条
  const org = opts.inTemplate ? 'scattered' : hudOrgOf(th);
  // 版面（安全边距、设备安全区、超宽屏收进 16:9；hudArea，godotLayout.ts 同一份）
  const area = hudArea(th, R, org, opts.margin);
  const gap = area.gap, pad = area.pad;
  let A: Rect = area.A;
  // 触屏操作层（M10）：摇杆与按钮簇占掉左下 / 右下，元素避开；触屏时不画键位图例（没有键盘）
  const touch = opts.noTouch ? null : touchLayer(d.ctx, d.t ?? d.ctx, th, A);
  // 触屏时：键位图例没有意义；技能格由触屏按钮簇代替（不是"底部一排头像"布局时）
  const touchHides = (id: string) => {
    if (!touch) return false;
    const form = String(r.get(`${id}.form`) ?? '').split(',')[0];
    if (baseId(id) === 'el.prompt') return form !== 'contextual';
    if (baseId(id) === 'el.abilities') return touch.cluster !== null && !['cards', 'ammo', 'ultimate'].includes(form);
    return false;
  };
  // 全部控件展示：每个元素一格，缩放进格子，左上角写元素名（多选的画法只画第一种）
  if (r.art[SELECTORS.layout] === 'layout.showcase') return drawShowcase(d, A, ids.filter((id) => !touchHides(id)).map((id) => { const def = ELEMENTS.get(id)!, e = makeCtx(id, d.ctx, d.t ?? d.ctx, th, R); return { id, def, e, size: def.size(e) }; }), highlight);
  // 叙事内的元素不占屏幕位置
  const isDiegetic = (id: string) => String(r.el(id, 'diegesis') ?? r.str('rel.diegesis', 'screen')) === 'diegetic' && !!diegetic;
  // 子项（M12a-14）：多选了几种画法的元素按画法拆开（原来只画第一种），每种画法各自量尺寸、取锚点 / 挂点（elementParts）、排位、绘制
  // ——draw 时上下文的 forms = [这一种]，元素的画法代码不用改；屏幕锚点类进锚点列，世界挂点类（尺寸 ≤ 12）照旧不占位；
  // 整块元素显式给了挂点（wa，M12a-15）也不进锚点列，排到挂点旁边（2e）
  const items = ids.filter((id) => !touchHides(id)).flatMap((id) => {
    const def = ELEMENTS.get(id)!;
    const parts0 = elementParts(r, id), parts = opts.inTemplate ? templateParts(th, id, parts0) : parts0;
    return parts.map((p, pi) => {
      const e = makeCtx(id, d.ctx, d.t ?? d.ctx, th, R, p.form);
      // 模板里换成了元素自己的默认锚点（templateParts）：内容对齐跟新锚点
      if (p !== parts0[pi]) e.align = ANCHOR_ALIGN[p.anchor] ?? 'left';
      if (opts.pins) e.pins = opts.pins;
      const el = (k: string) => layoutEl(th, id, k, p.form);
      const st = String(el('stackDir') ?? 'inherit'), num = (k: string) => { const n = Number(el(k)); return Number.isFinite(n) ? n : 0; };
      // 元素宽高（elx.width / height，M12b-05 ④）：画在点上的小元素不改
      const size0 = def.size(e), pt = pointSized(e, size0), size = pt ? size0 : sizeOverride(th, id, R, size0, p.form);
      // 骑边小件（elx.satellites，M12b-05 ③）：只认 SATELLITE_KINDS 里的种类（B6 审查修复 ⑫）；伸出框外的量在下面算进排位尺寸（⑳）
      const sat = pt ? null : satSpecOf(th, id, p.form);
      return {
        sat,
        id, form: p.form, def, e, anchor: p.anchor, attach: p.attach, size, pt,
        // 锁扣（M12b-05）：停靠到别的元素（dock）、成组（group）——旧皮肤只认皮肤之后的层（layoutEl）
        dock: pt ? null : dockSpecOf(th, id, p.form), group: pt ? '' : String(el('group') ?? 'none'),
        own: size, grp: null as null | { off: { x: number; y: number }; members: { it: unknown; rel: Rect; align: Align }[] }, docked: false,
        // 旧皮肤（审查修复 A · D6）：整块挂世界点只认皮肤之后的层显式给的 attachTo（品类布局写的不算，仍按锚点排——旧皮肤冻结）
        wa: p.given && !pt && !isDiegetic(id) && (!th.legacy || afterSkin(r, r.elKey(id, 'attachTo', p.form))) ? p.given : null,
        // 同锚点堆叠 / 等宽 / 偏移（M12a-18）与躲开玩家（M12a-17）
        stack: st === 'row' || st === 'rowBar' ? st : 'column', match: String(el('stackWidth') ?? 'inherit') === 'match',
        offX: num('offsetX'), offY: num('offsetY'), avoidP: el('avoidPlayer') === true || el('avoidPlayer') === 'true',
      };
    });
  });
  // 同锚点共用底条（stackDir = rowBar，M12b-65 ②，disco-elysium#47）：这一锚点上的元素格宽都按内容收（元素报了 fitW 时取它与原宽里小的；原来一项金额占了一大段空格）
  const rbAnchors = new Set(items.filter((it) => it.stack === 'rowBar').map((it) => it.anchor));
  for (const it of items) if (rbAnchors.has(it.anchor) && it.def.fitW && !it.pt) { const fw = it.def.fitW(it.e); if (fw < it.size.w) it.size = { ...it.size, w: fw }; }
  // 元素自己的尺寸（停靠组拆开时宿主的大小）取收格以后的（B6 审查修复 ③：原来在收格之前记，宿主按原宽画，压到按收过的宽排在旁边的停靠者）
  for (const it of items) it.own = it.size;
  type It = (typeof items)[number];
  // 停靠者实际停在谁旁边（终期审查修复 ㉔：同一边的几个停靠者依次停在前一个上，连接梁 / 连线连实际的那一个）
  const dockedTo = new Map<It, It>();
  // 停靠（M12b-05 ①，§2）：停靠者不占自己的锚点列，排在宿主旁边；宿主按「宿主 + 全部停靠者」的外接框进锚点列 / 贴边条、避让时整组一起挪（整组在占位表里是一个 movable 项），
  //   排完再拆回各自的矩形（splitGroups）。宿主 = cnt.elements 里同 id 的第一个整块子项（画在点上 / 挂世界点 / 叙事内的不能当宿主）；成环的不停靠（sys/check.ts 报 C-dock-cycle）
  {
    const hostOf = (id: string) => items.find((x) => x.id === id && !x.pt && !x.wa && !isDiegetic(x.id));
    const specs = items.filter((it) => it.dock && !it.wa && !isDiegetic(it.id) && !it.pt).map((it) => ({ ...it.dock!, id: `${it.id}|${it.form ?? ''}` }));
    const keyOf = (it: It) => `${it.id}|${it.form ?? ''}`;
    const byKey = new Map(items.map((it) => [keyOf(it), it]));
    // 宿主键：宿主元素的第一个整块子项
    const hostKey = (hid: string) => { const h = hostOf(hid); return h ? keyOf(h) : ''; };
    const { order } = dockOrder(specs.map((s) => ({ ...s, host: hostKey(s.host) || `?${s.host}` })), (k) => byKey.has(k));
    if (order.length) {
      // 每个根宿主一组：宿主在 (0, 0)，停靠者按拓扑序挨着各自的宿主排（宿主的成员格 = ElementDef.slots，dockSlot 给了时停在那一格旁）
      const rel = new Map<It, Rect>(), rootOf = new Map<It, It>(), alOf = new Map<It, Align>(), reach = new Map<It, { l: number; t: number; r: number; b: number }>();
      for (const s of order) {
        const d = byKey.get(s.id)!, h = byKey.get(s.host)!;
        const root = rootOf.get(h) ?? h;
        if (!rel.has(h)) rel.set(h, { x: 0, y: 0, w: h.size.w, h: h.size.h });
        // 跟着当前成员（elx.dockFollow = active）：宿主报的当前成员格（ElementDef.activeSlot）优先于 elx.dockSlot
        const slot = s.follow && h.def.activeSlot ? h.def.activeSlot(h.e) : s.slot;
        // 宿主自己是带骑边小件的停靠者时，rel 里是连留白的外框；成员格按它自己那一块算
        const hr = rel.get(h)!, hm = reach.get(h), hown = hm ? { x: hr.x + hm.l, y: hr.y + hm.t, w: hr.w - hm.l - hm.r, h: hr.h - hm.t - hm.b } : hr;
        const sl = slot && h.def.slots ? h.def.slots(h.e, hown)[slot - 1] : undefined;
        // 停靠者的骑边小件（终期审查修复 ㉘：原来留白只算宿主的，停靠者的小件伸到宿主 / 旁边的停靠者上）：按留白以后的外框停靠，拆组时停靠者 = 留白以内那一块
        const m = d.sat && !d.pt ? satelliteReach(d.e, d.own, d.sat.list, d.sat.side, d.sat.count, d.sat.over) : null;
        const pad = m && (m.l > 0.01 || m.t > 0.01 || m.r > 0.01 || m.b > 0.01) ? m : null;
        rel.set(d, dockRect(sl ?? hr, pad ? { w: d.size.w + pad.l + pad.r, h: d.size.h + pad.t + pad.b } : d.size, s.side, s.gap, s.align));
        if (pad) reach.set(d, pad);
        rootOf.set(d, root); d.docked = true; dockedTo.set(d, h);
        // 停靠者的内容对齐：停在左边的贴右、右边的贴左，上下停靠跟对齐（M12a-18 的 ElCtx.align）
        alOf.set(d, s.side === 'left' || s.side === 'flankL' ? 'right' : s.side === 'right' || s.side === 'flankR' ? 'left' : s.align === 'center' ? 'center' : s.align === 'end' ? 'right' : 'left');
      }
      for (const [it, r0] of rel) {
        if (rootOf.has(it)) continue;
        const members = [...rel].filter(([m]) => m === it || rootOf.get(m) === it);
        const x0 = Math.min(...members.map(([, q]) => q.x)), y0 = Math.min(...members.map(([, q]) => q.y));
        const x1 = Math.max(...members.map(([, q]) => q.x + q.w)), y1 = Math.max(...members.map(([, q]) => q.y + q.h));
        it.grp = { off: { x: r0.x - x0, y: r0.y - y0 }, members: members.filter(([m]) => m !== it).map(([m, q]) => { const p = reach.get(m); return { it: m, rel: p ? { x: q.x - x0 + p.l, y: q.y - y0 + p.t, w: q.w - p.l - p.r, h: q.h - p.t - p.b } : { ...q, x: q.x - x0, y: q.y - y0 }, align: alOf.get(m) ?? 'left' }; }) };
        it.size = { w: x1 - x0, h: y1 - y0 };
      }
    }
  }
  // 骑边小件伸出框外的部分算进排位尺寸（B6 审查修复 ⑳：原来只在全部排完以后登记，排位与避让不给它们留地方——压到旁边的元素、伸出画面）：
  //   元素（停靠组的宿主）四边按 satelliteReach 留白，拆组时宿主 = 留白以内那一块（与停靠组同一套 grp / off，见 2 之后的拆组）
  //   整块倾斜（vis.tiltLayers ≠ box，终期审查修复 ㉜）：转过以后伸出原矩形的量同样算进排位尺寸（夹进版面、邻居避让都按转过的外接框；登记占位按 tiltExtent）
  for (const it of items) {
    if (it.pt || it.docked || it.wa || isDiegetic(it.id)) continue;
    const m = it.sat ? satelliteReach(it.e, it.own, it.sat.list, it.sat.side, it.sat.count, it.sat.over) : { l: 0, t: 0, r: 0, b: 0 };
    const tx = tiltExtent(it.e, { x: 0, y: 0, w: it.own.w, h: it.own.h }, it.id), tw = Math.max(0, -tx.x), tth = Math.max(0, -tx.y);
    if (tw > 0.01 || tth > 0.01) { m.l = Math.max(m.l, tw); m.r = Math.max(m.r, tw); m.t = Math.max(m.t, tth); m.b = Math.max(m.b, tth); }
    if (!(m.l > 0.01 || m.t > 0.01 || m.r > 0.01 || m.b > 0.01)) continue;
    const g0 = it.grp ?? { off: { x: 0, y: 0 }, members: [] };
    const x0 = Math.min(0, g0.off.x - m.l), y0 = Math.min(0, g0.off.y - m.t);
    const x1 = Math.max(it.size.w, g0.off.x + it.own.w + m.r), y1 = Math.max(it.size.h, g0.off.y + it.own.h + m.b);
    it.grp = { off: { x: g0.off.x - x0, y: g0.off.y - y0 }, members: g0.members.map((q) => ({ ...q, rel: { ...q.rel, x: q.rel.x - x0, y: q.rel.y - y0 } })) };
    it.size = { w: x1 - x0, h: y1 - y0 };
  }
  const hits: Hit[] = [];
  // 只画 / 不画这几个元素（opts.paint，审查修复 A · L4）：排位照样按全部元素
  const only = opts.paint?.only ? new Set(opts.paint.only) : null, except = new Set(opts.paint?.except ?? []);
  const painted = (id: string) => (only ? only.has(id) : !except.has(id));
  // 入场（mo.enter）与待机（mo.idle）动画：每个元素按出场顺序错开（M5b）
  const sim = simNow();
  // 跨帧记忆（见 memoFor）：这一遍 = 画面矩形 + 选项 + 元素表
  const memoPass = [R.x, R.y, R.w, R.h].map((v) => Math.round(v)).join(',') + `|${opts.inTemplate ? 't' : ''}${opts.paint?.only ? 'o' : opts.paint?.except ? 'x' : ''}${opts.noTouch ? 'n' : ''}|${ids.join(',')}`;
  const mem = memoFor(r.art as object, memoPass, !!opts.layoutOnly);
  const enterMode = r.str('mo.enter', 'cut'), idleMode = r.str('mo.idle', 'none');
  // HUD 显隐（rel.hudVisibility）：隐藏 = 不画；闲置淡出 / 情境显现 = 3 秒没有事件就变淡（主要信息保留）。模板里的元素不受它影响（M12a-19）
  const hudVis = opts.inTemplate || opts.keepVis ? 'always' : r.str('rel.hudVisibility', 'always');
  if (hudVis === 'hidden') return [];
  // §8 RC3 ③（轨道 E）：全局的闲置淡出只在「真的闲置」时淡到 0.3 / 0.55（有过事件、最近一次已过 3 秒，或钉在闲置淡出姿态）；一个事件都没有的静帧
  // （打开工作台、截图、色板）只淡到小部件的不透明度下限 0.88——原来没有事件也按 0.55 / 0.3 淡，默认 HUD 一打开就是半透明的一层
  const idleNow = Number.isFinite(sim.sinceEvent) || r.str('chk.simPose', 'none') === 'idleFaded';
  const idleK = sim.sinceEvent > 3 && (hudVis === 'fadeIdle' || hudVis === 'contextual') ? (!idleNow && QUALITY.on ? 0.88 : hudVis === 'fadeIdle' ? 0.3 : 0.55) : 1;
  const isSmall = (it: It) => it.pt || isDiegetic(it.id);
  /**
   * 一个元素的闲置淡出系数（R4 · C3，black-myth#24）：逐元素的显隐（elx.visibility）显式写了 常驻 / 情境显现 / 静止渐隐 时盖过全局 rel.hudVisibility——
   * 常驻 = 不淡；静止渐隐 = 闲置时淡到 0.3；情境显现 = 闲置时淡到 EL_IDLE_CTX（屏上成块的元素；画在世界点上的小元素的「情境」是它的挂点，挂点在就照画）；
   * 显式写在元素上的不再受主要信息的 0.85 下限；不在闲置时情境显现 / 静止渐隐照全局那条（R4 审查修复 ④：与全局写成同一个值的元素不会比邻居亮）。没写（跟随全局）/ 按需显示 = 原来的（全局系数，主要信息至少 0.85）。
   * 「闲置」（elIdle）= 有过事件、最近一次已过 3 秒，或钉在闲置淡出姿态（chk.simPose = idleFaded）：一个事件都没有的静帧照常画——复刻里写了情境显现的元素
   * （control 的目标、factorio 的实体信息、dead-space 的弹药……参考截图里都显示着）不因这条变淡；全局 rel.hudVisibility 的淡出照原来（没有事件也淡）。
   * 旧皮肤只认皮肤之后的层（layoutEl，§0；预设里只有 layout.metroidvania 写了 el.minimap.visibility = onDemand，走原来的那条）。模板里的元素与保留元素照旧不淡
   */
  const elIdle = sim.sinceEvent > 3 && (Number.isFinite(sim.sinceEvent) || r.str('chk.simPose', 'none') === 'idleFaded');
  const elIdleK = (it: It, vis: string): number => {
    // 只认元素自己的键（el.x.visibility / 画法级 / 实例键）：没写时 elKey 落到全局 rel.hudVisibility（跟随全局 = 原来的那条）
    const own = opts.inTemplate || opts.keepVis || vis === 'onDemand' || !r.elKey(it.id, 'visibility', it.form).startsWith('el.') ? '' : String(layoutEl(th, it.id, 'visibility', it.form) ?? '');
    const glob = it.e.priority === 'primary' ? Math.max(idleK, 0.85) : idleK;
    if (own === 'always') return 1;
    // 不在闲置时（R4 审查修复 ④）：照全局那条——原来返回 1，元素把全局值（fadeIdle / contextual）重写一遍反而常亮、邻居照旧淡着
    if (own === 'fadeIdle') return elIdle ? 0.3 : glob;
    if (own === 'contextual') return elIdle && !it.pt ? EL_IDLE_CTX : glob;
    return glob;
  };
  // 叙事内的元素按画法拆开时，各画法画进同一块板子（第一项建板子，其余画在它上面）
  const boards = new Map<string, { cg: CanvasRenderingContext2D; small: boolean; cw: number; chh: number }>();
  /**
   * fit = 横向收缩 / 边框里的缩放（画时以矩形左上角为原点缩放）；fixed = 收进了贴边条 / 边框（不参与避让）；anchor = 实际生效的锚点（elx.avoidPlayer 会翻）；
   * world = 挂在世界点上的整块元素（M12a-15，2e 排的）
   */
  interface Placed { it: It; rect: Rect; small: boolean; fit: number; fixed: boolean; anchor: Anchor; world?: boolean }
  const local = new Occupancy();
  for (const ob of [touch?.stick, touch?.cluster]) if (ob) local.add(ob, { kind: 'touch', prio: 3 });
  (opts.occupied ?? []).forEach((ob, i) => local.add(ob, { kind: 'template', prio: 3, ...(opts.occupiedSub?.[i] ? { sub: opts.occupiedSub[i] } : {}) }));
  // 画在元素矩形以外、跟画面走的成块小件（ElementDef.reserve，B9 审查修复 ⑤ / ㉑：取景框的括角 / REC / 电池 / 时间码）：当固定障碍，压到的元素在 2b 挪开；
  // 与局部表的其余项一起并进帧占位表（decor.reserve:<元素>）
  for (const it of items) if (it.def.reserve && !isDiegetic(it.id)) for (const q of it.def.reserve(it.e)) local.add(q, { kind: 'element', id: `decor.reserve:${it.id}`, prio: 3 });

  /* ---- 0 组织方式：贴边条 / 底座 / 边框（M12a-16）——收进去的元素位置固定，从版面里扣掉条的厚度 ---- */
  const fixedPlace = new Map<It, { rect: Rect; fit: number; align?: Align }>();
  const bars: { plan: EdgePlan; host: ElCtx; ids: string[] }[] = [];
  const margins: Rect[] = [];
  // 进贴边条 / 边框的：占位的屏幕元素（与锚点列同一口径；挂在世界点上的整块元素不进，M12a-15）
  const flowAll = items.filter((it) => !isSmall(it) && !it.wa && !it.docked);
  const barHost = () => makeCtx('hudBar', d.ctx, d.t ?? d.ctx, th, R);
  // 规划（planEdgeBars / planMargins：纯几何，godotLayout.ts 用同一份导出 Godot 的贴边条 / 边框，审查修复 B）——收进去的元素位置固定，版面扣掉条 / 边框
  if (org === 'edgeBar' || org === 'console' || org === 'inMargin') {
    const flow = flowAll.map((it): FlowItem => ({ id: it.id, anchor: it.anchor, w: it.size.w, h: it.size.h, priority: it.e.priority, match: it.match }));
    const fp = org === 'inMargin' ? planMargins(th, R, A, flow, area) : planEdgeBars(th, R, A, flow, area, [touch?.stick, touch?.cluster].filter((x): x is Rect => !!x));
    for (const b of fp.bars) {
      bars.push({ plan: b.plan, host: barHost(), ids: b.members.flat(2).map((i) => flowAll[i].id) });
      local.add(b.bar, { kind: 'edgeBar', prio: 3 });
      for (const x of b.plan.boxes) local.add(x, { kind: 'edgeBar', prio: 3 });
    }
    for (const mr0 of fp.margins) { margins.push(mr0); local.add(mr0, { kind: 'edgeBar', prio: 3 }); }
    for (const [i, q] of fp.fixed) fixedPlace.set(flowAll[i], q);
    A = fp.A;
  }

  /* ---- 1 排位：每个锚点一行「格」（elx.stackDir），格里竖着叠；叙事内 / 世界挂点的小元素不占位 ---- */
  const place = (anchorOf: (it: It) => Anchor): Placed[] => {
    const byAnchor = new Map<Anchor, It[]>();
    for (const it of items) { const a = anchorOf(it); byAnchor.set(a, [...(byAnchor.get(a) ?? []), it]); }
    const out: Placed[] = [];
    for (const [anchor, list] of byAnchor) {
      const row = ROW[anchor], col = COL[anchor], rbLine = list.some((it) => it.stack === 'rowBar');
      // 格：row / rowBar 另起一格，column 接在当前格；只有一格时就是原来的一列
      const cells0: It[][] = [];
      for (const it of list) {
        if (fixedPlace.has(it) || isSmall(it) || it.wa || it.docked) continue;
        if (!cells0.length || it.stack !== 'column') cells0.push([it]); else cells0[cells0.length - 1].push(it);
      }
      // 一格比版面高（审查修复 A · L2：左上叠了十几个元素、字放大 2 倍时一直排到画面外）：从放不下的那一项起另起一格，往画面中间排（右列的往左）
      const cells: It[][] = [];
      for (const c of cells0) {
        const parts: It[][] = [];
        let cur: It[] = [], hh = 0;
        for (const it of c) {
          if (cur.length && hh + gap + it.size.h > A.h + 0.5) { parts.push(cur); cur = []; hh = 0; }
          hh += (cur.length ? gap : 0) + it.size.h;
          cur.push(it);
        }
        if (cur.length) parts.push(cur);
        cells.push(...(col === 'right' ? parts.reverse() : parts));
      }
      const cw = cells.map((c) => Math.max(...c.map((it) => it.size.w)));
      const ch = cells.map((c) => c.reduce((s, it) => s + it.size.h, 0) + gap * Math.max(0, c.length - 1));
      // 格排成一行；一行比版面宽到缩到 0.75 也放不下时折成几行（审查修复 A · L2：原来缩到 0.5；折出的行往画面中间排——上排往下、下排往上）
      const lines: number[][] = [];
      { let cur: number[] = [], w = 0; cells.forEach((_, i) => { if (cur.length && w + gap + cw[i] > A.w / MIN_FIT + 0.5) { lines.push(cur); cur = []; w = 0; } w += (cur.length ? gap : 0) + cw[i]; cur.push(i); }); if (cur.length) lines.push(cur); }
      const lw = lines.map((l) => l.reduce((s, i) => s + cw[i], 0) + gap * Math.max(0, l.length - 1)), lh = lines.map((l) => Math.max(0, ...l.map((i) => ch[i])));
      const lineW = Math.max(0, ...lw), lineH = lh.reduce((s, h) => s + h, 0) + gap * Math.max(0, lines.length - 1);
      // 每格的起点（格与格：上排顶对齐、下排底对齐、中排居中；行与行：从锚点那条边往里排）
      const cx: number[] = [], cy: number[] = [];
      const blockY = row === 'top' ? A.y : row === 'bottom' ? A.y + A.h - lineH : A.y + (A.h - lineH) / 2;
      let acc = 0;
      lines.forEach((l, li) => {
        const lx = col === 'left' ? A.x : col === 'right' ? A.x + A.w - lw[li] : A.x + (A.w - lw[li]) / 2;
        // 下排：第一行贴底，后面的行往上；其余从上往下
        const ly = row === 'bottom' ? A.y + A.h - acc - lh[li] : blockY + acc;
        let x = lx;
        // 共用底条的锚点（有 rowBar 的格，M12b-65 ②）：格在行里竖向居中（原来下排贴底：小字沉在格底）
        for (const i of l) { cx[i] = cells.length > 1 ? x : lx; cy[i] = row === 'top' && !rbLine ? ly : row === 'bottom' && !rbLine ? ly + lh[li] - ch[i] : ly + (lh[li] - ch[i]) / 2; x += cw[i] + gap; }
        acc += lh[li] + gap;
      });
      const yAt = cy.slice();
      let ci = 0;
      for (const it of list) {
        if (it.wa || it.docked) continue;
        const fp = fixedPlace.get(it);
        if (fp) { out.push({ it, rect: fp.rect, small: false, fit: fp.fit, fixed: true, anchor }); continue; }
        const small = isSmall(it);
        const k = small ? Math.max(0, ci) : cells.findIndex((c) => c.includes(it));
        if (!small) ci = k;
        const cellW = cells.length ? cw[Math.max(0, k)] ?? 0 : 0;
        const w = !small && it.match ? cellW : it.size.w, h = it.size.h;
        // 单格时与原来一样：每个元素各自按锚点贴边；多格时在自己那一格里按锚点对齐
        const x0 = cells.length > 1 && !small ? (col === 'left' ? cx[k] : col === 'right' ? cx[k] + cellW - w : cx[k] + (cellW - w) / 2)
          : col === 'left' ? A.x : col === 'right' ? A.x + A.w - w : A.x + (A.w - w) / 2;
        const y0 = cells.length ? yAt[Math.max(0, k)] : row === 'top' ? A.y : row === 'bottom' ? A.y + A.h : A.y + A.h / 2;
        out.push({ it, rect: { x: x0, y: y0, w, h }, small, fit: 1, fixed: false, anchor });
        if (!small) yAt[k] += h + gap;
      }
      // 这一组比版面宽 / 高：整组以锚点角为原点缩放（下限 0.75；审查修复 A · L2：原来只缩横排、下限 0.5，竖着超出的不管），仍放不下的在下面夹进版面
      const over = Math.max(lineW / Math.max(1, A.w), lineH / Math.max(1, A.h));
      if (cells.length && over > 1 + 1e-6) {
        const s0 = Math.max(MIN_FIT, 1 / over), ox = col === 'left' ? A.x : col === 'right' ? A.x + A.w : A.x + A.w / 2, oy = row === 'top' ? A.y : row === 'bottom' ? A.y + A.h : A.y + A.h / 2;
        for (const q of out) if (q.anchor === anchor && !q.small && !q.fixed) { q.rect = { x: ox + (q.rect.x - ox) * s0, y: oy + (q.rect.y - oy) * s0, w: q.rect.w * s0, h: q.rect.h * s0 }; q.fit = s0; }
      }
    }
    // 偏移（elx.offsetX / offsetY，屏宽 / 屏高的百分比）：排位后平移，夹紧在版面以内（M12a-18）
    for (const q of out) {
      if (q.fixed || q.small || (!q.it.offX && !q.it.offY)) continue;
      const c = (v: number, lo: number, hi: number) => (hi < lo ? v : Math.max(lo, Math.min(hi, v)));
      q.rect = { ...q.rect, x: c(q.rect.x + (q.it.offX / 100) * R.w, A.x, A.x + A.w - q.rect.w), y: c(q.rect.y + (q.it.offY / 100) * R.h, A.y, A.y + A.h - q.rect.h) };
    }
    // 最后一道（审查修复 A · L2）：缩到下限仍出版面的平移进版面（比版面还大的贴左 / 上边）。
    // 终期审查修复 ㉛：整组缩到 0.75 以后单个元素仍比版面宽 / 高的（模板的锚点空间窄、字放大 2 倍时的聊天框）再缩到放得下（下限 0.5，以左上角为原点，读字号的可读性检查照报），不再贴左伸出画面
    for (const q of out) {
      if (q.fixed || q.small) continue;
      const k = Math.min(A.w / Math.max(1e-6, q.rect.w), A.h / Math.max(1e-6, q.rect.h));
      if (k < 1 - 1e-6 && A.w > 0 && A.h > 0) { const f = Math.max(FIT_FLOOR, q.fit * k), s1 = f / q.fit; q.rect = { ...q.rect, w: q.rect.w * s1, h: q.rect.h * s1 }; q.fit = f; }
      const x = clampTo(q.rect.x, A.x, A.x + A.w - q.rect.w), y = clampTo(q.rect.y, A.y, A.y + A.h - q.rect.h);
      if (Math.abs(x - q.rect.x) > 0.5 || Math.abs(y - q.rect.y) > 0.5) q.rect = { ...q.rect, x, y };
    }
    return out;
  };
  let placed = place((it) => it.anchor);
  // 1b 长高过的元素按这一列的空当收回（ElementDef.flexH，R4 审查修复 ②⑪：写了字段的建筑面板长到刚好放下、最高 0.8 屏高，原来看不见同一列上下两排的元素——
  //    a11y.textScale 1.3 时长到 419 高，压住顶上的时钟与底下的警报栏 / 工具条）：排好以后量它横向范围里上面那些元素的下沿与下面那些元素的上沿（别的锚点的元素、
  //    固定障碍；按中线分上下），长高后的高放不下这条空当时收回到 max(不长高的高, 空当)，整个再排一遍。放得下 / 没有这类元素时什么都不变
  {
    // 排好的一项实际占的几块：停靠组 / 带骑边小件的元素按组内位置拆开（宿主 = 留白以内那一块，与 2 之后的拆组同一套算法），其余就是排的矩形
    const partsOf = (o: Placed): Rect[] => {
      const gr = o.it.grp, s = o.fit, b = o.rect;
      if (!gr) return [b];
      return [{ x: b.x + gr.off.x * s, y: b.y + gr.off.y * s, w: o.it.own.w * s, h: o.it.own.h * s }, ...gr.members.map(({ rel }) => ({ x: b.x + rel.x * s, y: b.y + rel.y * s, w: rel.w * s, h: rel.h * s }))];
    };
    let again = false;
    for (const q of placed) {
      const it = q.it, fh = it.def.flexH?.(it.e);
      if (fh === undefined || q.small || q.fixed || it.wa || it.docked || it.grp?.members.length || !(fh < it.own.h - 0.5)) continue;
      // 宽高被 elx.width / height 改过的不收（报的高不是量出来的那个）
      if (Math.abs(it.def.size(it.e).h - it.own.h) > 0.5) continue;
      const rc = q.rect, mid = rc.y + rc.h / 2, k = q.fit;
      let top = A.y, bot = A.y + A.h;
      const obs = [...placed.filter((o) => o !== q && !o.small && o.anchor !== q.anchor).flatMap(partsOf), ...local.items.filter((o) => !o.soft && o.kind !== 'world').map((o) => o.rect)];
      for (const o of obs) {
        if (Math.min(o.x + o.w, rc.x + rc.w) - Math.max(o.x, rc.x) <= 2) continue;
        if (o.y + o.h / 2 < mid) top = Math.max(top, o.y + o.h + gap); else bot = Math.min(bot, o.y - gap);
      }
      // 骑边小件伸出框外的留白（size − own）也要放进空当
      const h = Math.max(fh, Math.min(it.own.h, (bot - top) / k - (it.size.h - it.own.h)));
      if (h < it.own.h - 0.5) { const dh = it.own.h - h; it.own = { ...it.own, h }; it.size = { ...it.size, h: it.size.h - dh }; again = true; }
    }
    if (again) placed = place((it) => it.anchor);
  }
  // 躲开玩家（elx.avoidPlayer，M12a-17；迟滞见审查修复 A · L1）：玩家投影外扩的软禁区进入元素原位、而翻过去的位置不压玩家时，锚点翻到对边；
  //   翻过去以后：玩家走进翻过去的位置、原位又空出来时马上翻回；否则要等原位外扩 24 仍空着连续 6 帧（或 0.3 秒、至少 2 帧）才翻回——
  //   原来每帧按当帧重判，玩家在边界上抖 1.5 像素时技能栏上下来回跳（59 / 60 帧）。记忆在排位之外（memoAt），同一输入画两遍结果相同
  const avoiders = items.filter((it) => it.avoidP && !fixedPlace.has(it) && !isSmall(it) && !it.wa && !it.docked && FLIP[it.anchor]);
  const pp = items.length ? playerPoint(items[0].e) : null;
  const zone = pp ? { x: pp.x - PLAYER_ZONE, y: pp.y - PLAYER_ZONE, w: PLAYER_ZONE * 2, h: PLAYER_ZONE * 2 } : null;
  if (zone) local.add(zone, { kind: 'player', soft: true, prio: 0 });
  if (avoiders.length) {
    const flipAll = place((it) => (avoiders.includes(it) ? FLIP[it.anchor]! : it.anchor));
    const rectIn = (list: Placed[], it: It) => list.find((p) => p.it === it)?.rect;
    const flip = new Set<It>();
    for (const it of avoiders) {
      const o = rectIn(placed, it), f = rectIn(flipAll, it), m = mem(`flip|${it.id}|${it.form ?? ''}`);
      const hitO = !!(zone && o && intersects(o, zone)), hitF = !!(zone && f && intersects(f, zone));
      if (!m.flip) { if (hitO && !hitF) { m.flip = true; m.clear = 0; } }
      else if (hitF && !hitO) { m.flip = false; m.clear = 0; }
      else if (!zone || !o || !intersects(inflateRect(o, HYST), zone)) {
        m.clear = (m.clear ?? 0) + 1;
        if (m.clear === 1) m.since = sim.t;
        if (m.clear >= 6 || (m.clear >= 2 && sim.t - (m.since ?? sim.t) >= 0.3)) { m.flip = false; m.clear = 0; }
      } else m.clear = 0;
      if (m.flip) flip.add(it);
    }
    if (flip.size === avoiders.length) placed = flipAll;
    else if (flip.size) placed = place((it) => (flip.has(it) ? FLIP[it.anchor]! : it.anchor));
  }

  /* ---- 2 避让（M12a-17）：同一张占位表；挪动不越过画面中线（已经越过的不再往里挪） ---- */
  const midY = A.y + A.h / 2;
  const big = placed.filter((q) => !q.small && !q.fixed);
  /** 纵向挪 dy 后还在不在版面以内、没有（更）越过中线 */
  const okY = (c: Placed, dy: number) => {
    const y = c.rect.y + dy, row = ROW[c.anchor];
    if (y < A.y - 1 || y + c.rect.h > A.y + A.h + 1) return false;
    if (row === 'top' && dy > 0 && y + c.rect.h > Math.max(midY, c.rect.y + c.rect.h) + 0.5) return false;
    if (row === 'bottom' && dy < 0 && y < Math.min(midY, c.rect.y) - 0.5) return false;
    return true;
  };
  // 同一锚点一起挪的那几项：一格（原来的一列）时是挪动方向上的这一项和后面的（byIndex = 按排位顺序取，与原来的通用避让一致；否则按纵坐标）；多格横排时整组一起
  const multi = (a: Anchor) => big.filter((c) => c.anchor === a).some((c, _, arr) => arr.some((o) => o !== c && o.rect.y < c.rect.y + c.rect.h && c.rect.y < o.rect.y + o.rect.h));
  const groupOf = (q: Placed, dy: number, byIndex = false) => {
    const col = big.filter((c) => c.anchor === q.anchor);
    if (multi(q.anchor)) return col;
    const k = col.indexOf(q);
    return byIndex ? col.filter((_, ci) => (dy > 0 ? ci >= k : ci <= k)) : col.filter((c) => (dy < 0 ? c.rect.y <= q.rect.y : c.rect.y >= q.rect.y));
  };
  const scaleAbout = (list: Placed[], s: number, ox: number, oy: number) => {
    for (const q of list) { q.rect = { x: ox + (q.rect.x - ox) * s, y: oy + (q.rect.y - oy) * s, w: q.rect.w * s, h: q.rect.h * s }; q.fit *= s; }
  };
  const bboxOf = (list: Placed[]): Rect => { const x0 = Math.min(...list.map((q) => q.rect.x)), y0 = Math.min(...list.map((q) => q.rect.y)); return { x: x0, y: y0, w: Math.max(...list.map((q) => q.rect.x + q.rect.w)) - x0, h: Math.max(...list.map((q) => q.rect.y + q.rect.h)) - y0 }; };
  /**
   * 中列一组在挡路的侧列元素之间横向收（2a 的横向两步，审查修复 A · L6 抽出来给 2c 用）：sym = 仍在画面正中、按两侧留下的对称空宽缩放（下限 0.75）；
   * 否则 = 在两侧之间的空宽里居中（必要时缩放，同样下限 0.75）。sides = 纵向跨度与这一组相交的侧列元素才算挡路；成功返回 true
   */
  const lanes = (mid: Placed[], side: Placed[]) => {
    const bb = bboxOf(mid), vs = (a: Rect) => a.y < bb.y + bb.h && bb.y < a.y + a.h;
    const lefts = side.filter((q) => COL[q.anchor] === 'left' && vs(q.rect)), rights = side.filter((q) => COL[q.anchor] === 'right' && vs(q.rect));
    const L = lefts.length ? Math.max(...lefts.map((q) => q.rect.x + q.rect.w)) + gap : A.x, Rr = rights.length ? Math.min(...rights.map((q) => q.rect.x)) - gap : A.x + A.w;
    return { bb, L, Rr, free: Rr - L };
  };
  const originY = (bb: Rect, row: string) => (row === 'bottom' ? bb.y + bb.h : row === 'top' ? bb.y : bb.y + bb.h / 2);
  const fitSym = (mid: Placed[], side: Placed[], row: string): boolean => {
    const { bb, L, Rr } = lanes(mid, side), cx0 = A.x + A.w / 2, half = Math.min(cx0 - L, Rr - cx0);
    if (!(half > 0 && bb.w * MIN_FIT <= half * 2 + 0.5)) return false;
    scaleAbout(mid, Math.min(1, (half * 2) / bb.w), bb.x + bb.w / 2, originY(bb, row));
    const b2 = bboxOf(mid), dx = cx0 - (b2.x + b2.w / 2);
    for (const q of mid) q.rect = { ...q.rect, x: q.rect.x + dx };
    return true;
  };
  const fitGap = (mid: Placed[], side: Placed[], row: string): boolean => {
    const { bb, L, free } = lanes(mid, side);
    if (!(free > 0 && bb.w * MIN_FIT <= free + 0.5)) return false;
    if (bb.w > free) scaleAbout(mid, free / bb.w, bb.x + bb.w / 2, originY(bb, row));
    const b2 = bboxOf(mid), dx = L + (free - b2.w) / 2 - b2.x;
    for (const q of mid) q.rect = { ...q.rect, x: q.rect.x + dx };
    return true;
  };
  // 必须居中的（Boss 条，审查修复 A · D11）：对称收不下时先试纵向挪，再在两侧之间居中（原来先居中，电视 / 掌机上 Boss 条偏到右边 115）
  const centred = (q: Placed) => baseId(q.it.id) === 'el.threat' && (q.it.form ?? q.it.e.forms[0]) === 'bossBar';
  /**
   * Boss 条横向收窄（目检修复）：条长收到两侧挡路元素之间的对称空宽（不低于原长 × BAR_NARROW），仍在画面正中、贴着锚点那条边；字号、条粗不变（不是整体缩放）。
   * D11 原来在这里纵向挪到侧列下面：掌机 layout.action 的 Boss 条下移 124 到 y 152，压到目标头顶的飘字（飘字按角色框推开，字本身还压在条上）
   */
  const narrowSym = (q: Placed, side: Placed[]): boolean => {
    const { L, Rr } = lanes([q], side), cx0 = A.x + A.w / 2, w = Math.min(q.rect.w, 2 * Math.min(cx0 - L, Rr - cx0));
    if (!(w > 0 && w >= q.rect.w * BAR_NARROW - 0.5)) return false;
    q.rect = { ...q.rect, x: cx0 - w / 2, w };
    return true;
  };
  // 2a 中列（上中 / 下中）与同一排的左右两列相撞：先横向收——仍在画面正中、按两侧留下的对称空宽缩放（下限 0.75，Boss 条这类居中的元素不跑偏；
  //    Boss 条再不行就只收条长，目检修复）；
  //    对称空宽不够时在两侧之间的空宽里居中（必要时缩放，同样下限 0.75，Balatro 左栏旁的手牌）；仍放不下才纵向挪（不越过中线，越线就停在中线）
  for (const [anchor, row] of [['bc', 'bottom'], ['tc', 'top']] as const) {
    const mid = big.filter((q) => q.anchor === anchor);
    const side = big.filter((q) => ROW[q.anchor] === row && COL[q.anchor] !== 'center');
    if (!mid.length || !side.length) continue;
    if (!side.some((sd) => mid.some((md) => intersects(md.rect, sd.rect, 0)))) continue;
    let bb = bboxOf(mid);
    // 纵向：挪到挡路的侧列元素外面
    const need = () => { const bl = side.filter((sd) => sd.rect.x < bb.x + bb.w && bb.x < sd.rect.x + sd.rect.w); if (!bl.length) return 0; return row === 'bottom' ? bb.y + bb.h - Math.min(...bl.map((q) => q.rect.y)) + gap : Math.max(...bl.map((q) => q.rect.y + q.rect.h)) - bb.y + gap; };
    const room = () => (row === 'bottom' ? Math.max(0, bb.y - Math.max(midY, A.y)) : Math.max(0, Math.min(midY, A.y + A.h) - (bb.y + bb.h)));
    const moveY = (sh: number) => { for (const q of mid) q.rect = { ...q.rect, y: q.rect.y + (row === 'bottom' ? -sh : sh) }; };
    if (fitSym(mid, side, row)) continue;
    // 停靠组的宿主（q.it.grp，B6 审查修复 ⑯）不只收条长：拆组时宿主按 own 宽画、停靠者按组内相对位置放，只收外接框会让停靠者伸到挡路的元素上——整组照下面的纵向挪 / 缩放
    if (mid.length === 1 && centred(mid[0]) && !mid[0].it.grp && narrowSym(mid[0], side)) continue;
    if (mid.some(centred)) { const sh = need(); if (sh > 0 && sh <= room() + 0.5) { moveY(sh); continue; } }
    if (fitGap(mid, side, row)) continue;
    // 纵向：挪不到（会越过中线）就缩到下限、居中，再挪到中线为止，剩下的重叠交给可读性检查
    const { L, free } = lanes(mid, side);
    let shift = need();
    if (shift > room() + 0.5) {
      scaleAbout(mid, MIN_FIT, bb.x + bb.w / 2, row === 'bottom' ? bb.y + bb.h : bb.y);
      bb = bboxOf(mid);
      // 在两侧之间的空宽里居中；空宽比它还窄时不挪出版面（审查修复 A：原来照样按空宽居中，宽的那一块伸出画面右边）
      if (free > 0) { const dx = clampTo(L + (free - bb.w) / 2, A.x, A.x + A.w - bb.w) - bb.x; for (const q of mid) q.rect = { ...q.rect, x: q.rect.x + dx }; bb = bboxOf(mid); }
      shift = Math.min(need(), room());
    }
    if (shift > 0) moveY(shift);
  }
  // 2a' 同一列的上排一摞与下排一摞相撞（R4 · C3，cyberpunk-2077#36：右上的小地图 / 目标 / 档案大卡一直长到 457，右下的按键提示从 398 起）：place() 各锚点各排各的，
  //    2c 不让上排越过中线往下、下排越过中线往上，这种重叠原来留着。按顺序试：①高的那一摞以自己的锚点角为原点缩到两摞之间留一个间距（不低于 MIN_FIT）；
  //    ②高的那一摞缩到下限、矮的那一摞也以自己的锚点角为原点缩到放得下（同样不低于 MIN_FIT）；③两摞都缩到下限仍放不下：原尺寸，矮的那一摞整摞横挪到高的那一摞
  //    朝画面中间那一侧（不出版面、不越过画面竖中线、不压别的元素 / 固定障碍 / blockers；中列没有这一步）；④都不行：两摞都缩到下限，剩下的重叠交给后面的避让与可读性检查。
  //    两摞不相撞时什么都不做（画面不变）
  for (const col of ['left', 'center', 'right'] as const) {
    const topS = big.filter((q) => COL[q.anchor] === col && ROW[q.anchor] === 'top'), botS = big.filter((q) => COL[q.anchor] === col && ROW[q.anchor] === 'bottom');
    if (!topS.length || !botS.length || !topS.some((t) => botS.some((b) => intersects(t.rect, b.rect)))) continue;
    const T = bboxOf(topS), B = bboxOf(botS), tallTop = T.h >= B.h, tall = tallTop ? topS : botS, short = tallTop ? botS : topS;
    const ox = (bb: Rect) => (col === 'left' ? bb.x : col === 'right' ? bb.x + bb.w : bb.x + bb.w / 2);
    const shrinkTop = (s: number) => scaleAbout(topS, s, ox(T), T.y), shrinkBot = (s: number) => scaleAbout(botS, s, ox(B), B.y + B.h);
    // 每摞还能缩到多少（R4 审查修复 ⑤）：下限按最后的缩放量算——place() 排不下时已经缩过的（q.fit < 1）只再缩到 MIN_FIT 为止，原来按当前尺寸再乘 0.75，
    // 已缩到 0.77 的一摞落到 0.66、字低于可读下限；已经在 MIN_FIT 以下的那一摞不再缩（loT / loB = 1）
    const lo = (l: Placed[]) => Math.min(1, MIN_FIT / Math.max(1e-6, Math.min(...l.map((q) => q.fit))));
    const loT = lo(topS), loB = lo(botS), loTall = tallTop ? loT : loB, loShort = tallTop ? loB : loT;
    const s1 = tallTop ? (B.y - gap - T.y) / T.h : (B.y + B.h - (T.y + T.h + gap)) / B.h;
    if (s1 >= loTall - 1e-6) { if (tallTop) shrinkTop(Math.min(1, s1)); else shrinkBot(Math.min(1, s1)); continue; }
    // ② 高的缩到下限以后矮的那一摞要缩到多少
    const s2 = tallTop ? (B.y + B.h - (T.y + T.h * loT + gap)) / B.h : (B.y + B.h - B.h * loB - gap - T.y) / T.h;
    if (s2 >= loShort - 1e-6) { shrinkTop(tallTop ? loT : Math.min(1, s2)); shrinkBot(tallTop ? Math.min(1, s2) : loB); continue; }
    if (col !== 'center') {
      const L = bboxOf(tall), S0 = bboxOf(short), cxm = A.x + A.w / 2;
      const dx = col === 'left' ? L.x + L.w + gap - S0.x : L.x - gap - (S0.x + S0.w);
      const mv = short.map((c) => ({ ...c.rect, x: c.rect.x + dx }));
      const inside = mv.every((m) => m.x >= A.x - 1 && m.x + m.w <= A.x + A.w + 1) && (col === 'left' ? Math.max(...mv.map((m) => m.x + m.w)) <= cxm + 0.5 : Math.min(...mv.map((m) => m.x)) >= cxm - 0.5);
      const free = mv.every((m) => !big.some((o) => !short.includes(o) && intersects(m, o.rect)) && !local.fixed().some((o) => intersects(m, o.rect)) && !(opts.blockers ?? []).some((b) => intersects(m, b)));
      if (inside && free) { short.forEach((c, i) => { c.rect = mv[i]; }); continue; }
    }
    shrinkTop(loT); shrinkBot(loB);
  }
  // 2b 固定障碍（触屏层、贴边条两端的仪表盒、模板已画的区域）：压到的整列按排的方向挪开（顶排往下、其余往上），挪不动就反过来，两边都不行就不挪（留给可读性检查）
  for (const ob of local.fixed()) {
    for (const q of big) {
      if (!intersects(q.rect, ob.rect, 0)) continue;
      const down = ob.rect.y + ob.rect.h + gap - q.rect.y, up = ob.rect.y - gap - (q.rect.y + q.rect.h);
      const tryMove = (dy: number) => {
        const sel = groupOf(q, dy);
        if (!sel.every((c) => okY(c, dy) && !(opts.blockers ?? []).some((b) => intersects({ ...c.rect, y: c.rect.y + dy }, b)))) return false;
        for (const c of sel) c.rect = { ...c.rect, y: c.rect.y + dy };
        return true;
      };
      // 中排元素被模板区域（主体大字、按钮行……）挡住时先往挪得少的一边挪（M12b-64：居中的奖励原来先往上翻到「胜利」上面）；其余照旧
      if (ROW[q.anchor] === 'top') { if (!tryMove(down)) tryMove(up); }
      else if (ROW[q.anchor] === 'mid' && ob.kind === 'template' && Math.abs(down) < Math.abs(up)) { if (!tryMove(down)) tryMove(up); }
      else if (!tryMove(up)) tryMove(down);
    }
  }
  // 2b' 压在模板按钮行上的中排元素（中期审查修复 ㉛）：2b 逐块障碍各挪一次，主体大字（上）与按钮行（下）夹住时两边都挪不开（ov.bigText / 大字号下 tpl.settle 的奖励
  //    压在按钮行上）。只管压着按钮行（occupiedSub = buttons）的：①在按钮行与它上面那块模板区域之间的空带里放——放得下就挪进去，放不下就以中心缩到下限 0.75
  //    （q.fit，与中列收缩同口径）再放；②空带缩到 0.75 也放不下时挪到这一列模板区域的左 / 右两侧（空宽大的一侧先试，必要时同样缩到 0.75）；③两侧也没地方
  //    （模板里元素只在容器里排）时缩到 0.75、在上面那块与按钮行之间居中——两边各压一点，比原来整块压在按钮行上少。①② 落下后不能压别的元素 / 模板区域 / blockers，
  //    ③ 不能压别的元素 / 页头 / blockers；都不行就不动（留给可读性检查）。没压着按钮行的不进这一步，画面不变
  const tplObs = local.fixed().filter((o) => o.kind === 'template'), btnObs = tplObs.filter((o) => o.sub === 'buttons');
  if (btnObs.length) for (const anchor of [...new Set(big.filter((q) => ROW[q.anchor] === 'mid').map((q) => q.anchor))]) {
    const grp = big.filter((c) => c.anchor === anchor);
    const bb0 = bboxOf(grp), cy = bb0.y + bb0.h / 2;
    const btn = btnObs.filter((o) => intersects(bb0, o.rect, 0) && o.rect.y + o.rect.h / 2 > cy);
    if (!btn.length) continue;
    const col = tplObs.filter((o) => o.rect.x < bb0.x + bb0.w && bb0.x < o.rect.x + o.rect.w);
    const save = grp.map((c) => ({ c, rect: c.rect, fit: c.fit }));
    const revert = () => { for (const v of save) { v.c.rect = v.rect; v.c.fit = v.fit; } };
    const othersOk = () => grp.every((c) => !big.some((o) => !grp.includes(o) && intersects(c.rect, o.rect)) && !(opts.blockers ?? []).some((bk) => intersects(c.rect, bk)));
    const clear = () => othersOk() && grp.every((c) => !tplObs.some((o) => intersects(c.rect, o.rect)));
    // 把这一组缩到 s（≤ 1）、外接框挪到 (x, y)
    const put = (s0: number, x: number, y: number) => {
      revert();
      let bb = bboxOf(grp);
      if (s0 < 1) { scaleAbout(grp, s0, bb.x + bb.w / 2, bb.y + bb.h / 2); bb = bboxOf(grp); }
      const dx = x - bb.x, dy = y - bb.y;
      for (const c of grp) c.rect = { ...c.rect, x: c.rect.x + dx, y: c.rect.y + dy };
    };
    const above = col.filter((o) => !btn.includes(o) && o.rect.y + o.rect.h / 2 <= cy);
    const top = Math.max(A.y, ...above.map((o) => o.rect.y + o.rect.h + gap)), bot = Math.min(...btn.map((o) => o.rect.y - gap));
    const band = bot - top;
    // ① 按钮行与上面那块之间的空带
    if (band > 0 && bb0.h * MIN_FIT <= band + 0.5) {
      const s0 = Math.min(1, band / bb0.h), h = bb0.h * s0, w = bb0.w * s0;
      put(s0, bb0.x + (bb0.w - w) / 2, clampTo(bb0.y + (bb0.h - h) / 2, top, bot - h));
      if (clear()) continue;
    }
    // ② 挪到这一列的左 / 右两侧
    const x0 = Math.min(...col.map((o) => o.rect.x)) - gap, x1 = Math.max(...col.map((o) => o.rect.x + o.rect.w)) + gap;
    const sides = [{ l: A.x, r: x0 }, { l: x1, r: A.x + A.w }].filter((q) => q.r - q.l > 0).sort((p, q) => (q.r - q.l) - (p.r - p.l));
    let done = false;
    for (const sd of sides) {
      const s0 = Math.min(1, (sd.r - sd.l) / bb0.w, A.h / bb0.h);
      if (s0 < MIN_FIT - 1e-6) continue;
      const w = bb0.w * s0, h = bb0.h * s0;
      put(s0, sd.l + (sd.r - sd.l - w) / 2, clampTo(cy - h / 2, A.y, A.y + A.h - h));
      if (clear()) { done = true; break; }
    }
    if (done) continue;
    // ③ 缩到 0.75、在上面那块的下沿与按钮行的上沿之间居中（两边各压一点，比原来整块压在按钮行上少）：与按钮行的重叠要变小，不压页头、别的元素与 blockers
    const btnOv = () => grp.reduce((t, c) => t + btn.reduce((u, o) => u + overlapArea(c.rect, o.rect), 0), 0);
    revert();
    const ov0 = btnOv(), y0 = Math.max(A.y, ...above.map((o) => o.rect.y + o.rect.h)), y1 = Math.min(...btn.map((o) => o.rect.y));
    const h = bb0.h * MIN_FIT, w = bb0.w * MIN_FIT;
    put(MIN_FIT, bb0.x + (bb0.w - w) / 2, clampTo(y0 + (y1 - y0 - h) / 2, A.y, A.y + A.h - h));
    if (!(othersOk() && btnOv() < ov0 - 1 && grp.every((c) => !tplObs.some((o) => o.sub === 'header' && intersects(c.rect, o.rect))))) revert();
  }
  // 2c 通用避让（M8b）：字放大 / 翻译变长后元素变大，任意两个不同锚点的元素框重叠时，把其中一个沿离开屏幕边的方向挪开：
  //    挪谁——中间列的 > 优先级低的 > 后排的；往哪——上排往下、下排往上、中排往挪得少的一边；同一锚点里挪动方向上的后续元素一起挪（保持列内顺序）；最多 6 轮。
  //    两边都挪不动、其中一个在中列时（审查修复 A · L6：NPC 对话的字幕压在左上的选项上），中列那一个在纵向跨度相交的侧列元素之间横向收（2a 的两步）
  const prio = (q: Placed) => PRI[String(r.el(q.it.id, 'priority', q.it.form) ?? 'secondary')] ?? 1;
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const p = big[i], q = big[j];
      if (p.anchor === q.anchor || !intersects(p.rect, q.rect)) continue;
      const pc = COL[p.anchor] === 'center', qc = COL[q.anchor] === 'center';
      const first = pc !== qc ? (pc ? p : q) : prio(p) !== prio(q) ? (prio(p) < prio(q) ? p : q) : q;
      // 挪动方案：这一个沿自己的方向挪开另一个；挪出版面 / 越过中线就换另一个挪；都挪不动就保留重叠，交给可读性检查报出来。
      // 中期审查修复 ⑨：挪过去会新压到第三个元素的方案不算「干净」——先按（原来的方案 → 先挪的那个的另一个方向（中排）→ 另一个的两个方向）找干净的；
      // 都不干净时取让这一组与其余元素的总重叠面积减少最多的方案，一个都不减少就不挪（原来照挪，下一轮又挪回来，6 轮后停在第三个元素上：Hi-Fi Rush 的信息流压在计时数字上）
      const plan = (mv: Placed, st: Placed, alt = false) => {
        const row = ROW[mv.anchor];
        const down = st.rect.y + st.rect.h + gap - mv.rect.y, up = mv.rect.y + mv.rect.h + gap - st.rect.y;
        const pref = row === 'top' ? down : row === 'bottom' ? -up : down <= up ? down : -up;
        const dy = alt ? (row === 'mid' ? (pref === down ? -up : down) : NaN) : pref;
        if (!Number.isFinite(dy)) return { sel: [] as Placed[], dy: 0, dx: 0, ok: false, clean: false, net: 0 };
        const sel = groupOf(mv, dy, true);
        const ok = sel.every((c) => okY(c, dy));
        // 干净 = 挪完不新压到别的元素（原来就压着的不算：那一对留给它自己的那一轮）；net = 这一组与组外元素的重叠面积，挪后减挪前
        let clean = ok, net = 0;
        if (ok) for (const c of sel) {
          const m = { ...c.rect, y: c.rect.y + dy };
          for (const o of big) {
            if (sel.includes(o)) continue;
            if (intersects(m, o.rect) && !intersects(c.rect, o.rect)) clean = false;
            net += overlapArea(m, o.rect) - overlapArea(c.rect, o.rect);
          }
        }
        return { sel, dy, dx: 0, ok, clean, net };
      };
      // 横挪（终期审查修复 ㉗）：同一侧列（左 / 右）的上 / 下排与中排两个锚点相撞时，中排那一组整组横着挪到对方的外沿（不出版面、不越过画面竖中线）——
      // 只能竖着挪时，左中的技能栏被一轮轮「干净」的小挪动推到左上队伍卡的正下方（81% 重叠）
      const planX = (mv: Placed, st: Placed) => {
        const col = COL[mv.anchor];
        if (col === 'center' || COL[st.anchor] !== col || ROW[mv.anchor] !== 'mid' || ROW[st.anchor] === 'mid') return null;
        const dx = col === 'left' ? st.rect.x + st.rect.w + gap - mv.rect.x : st.rect.x - gap - (mv.rect.x + mv.rect.w);
        const sel = big.filter((c) => c.anchor === mv.anchor), cxm = A.x + A.w / 2;
        const ok = sel.every((c) => { const x = c.rect.x + dx; return x >= A.x - 1 && x + c.rect.w <= A.x + A.w + 1 && (col === 'left' ? x + c.rect.w <= Math.max(cxm, c.rect.x + c.rect.w) + 0.5 : x >= Math.min(cxm, c.rect.x) - 0.5); });
        let clean = ok, net = 0;
        if (ok) for (const c of sel) {
          const m = { ...c.rect, x: c.rect.x + dx };
          for (const o of big) {
            if (sel.includes(o)) continue;
            if (intersects(m, o.rect) && !intersects(c.rect, o.rect)) clean = false;
            net += overlapArea(m, o.rect) - overlapArea(c.rect, o.rect);
          }
        }
        return { sel, dy: 0, dx, ok, clean, net };
      };
      const other = first === p ? q : p;
      const a1 = plan(first, other);
      const go0 = a1.ok ? a1 : plan(other, first);
      const cands = [go0, a1, plan(first, other, true), plan(other, first), plan(other, first, true), planX(p, q), planX(q, p)].filter((x): x is NonNullable<typeof x> => !!x && x.ok);
      // 干净且不让重叠变大（终期审查修复 ㉗：原来只要不新压到第三个就算干净，挪完与原来就压着的元素重叠更深也照挪）
      const best = cands.find((x) => x.clean && x.net <= 0) ?? cands.filter((x) => x.net < -1).sort((x, y) => x.net - y.net)[0];
      const go = best ?? { ...go0, ok: false };
      if (!go.ok) {
        if (pc !== qc) {
          const md = pc ? p : q, grp = big.filter((c) => c.anchor === md.anchor), sides = big.filter((c) => COL[c.anchor] !== 'center');
          if (fitSym(grp, sides, ROW[md.anchor]) || fitGap(grp, sides, ROW[md.anchor])) moved = true;
        }
        continue;
      }
      for (const c of go.sel) c.rect = { ...c.rect, x: c.rect.x + go.dx, y: c.rect.y + go.dy };
      moved = true;
    }
    if (!moved) break;
  }
  // 停靠组拆回各自的矩形（M12b-05 ①）：宿主排的是整组的外接框（q.rect，缩放 q.fit），宿主 = 框里 (off) 处的原尺寸，停靠者按组内相对位置；停靠者紧跟在宿主后面画
  for (let i = 0; i < placed.length; i++) {
    const q = placed[i], gr = q.it.grp;
    if (!gr || q.small) continue;
    const s = q.fit, box = q.rect, ow = q.it.own;
    q.rect = { x: box.x + gr.off.x * s, y: box.y + gr.off.y * s, w: ow.w * s, h: ow.h * s };
    for (const m of gr.members) (m.it as It).e.align = m.align;
    const add = gr.members.map(({ it, rel }) => ({ it: it as It, rect: { x: box.x + rel.x * s, y: box.y + rel.y * s, w: rel.w * s, h: rel.h * s }, small: false, fit: s, fixed: q.fixed, anchor: q.anchor } as Placed));
    placed.splice(i + 1, 0, ...add);
    i += add.length;
  }
  // 占位表：元素最后的位置（合规层、B8 的世界挂点、B9 的浮动详情都查它）
  // 整块倾斜（vis.tiltLayers ≠ box，M12b-40）的元素按转过以后的外接框登记（终期审查修复 ㉜：原来登记没转的矩形，10° 的宽条两端各伸出四十多）
  for (const q of placed) if (!q.small) local.add(tiltExtent(q.it.e, q.rect, q.it.id), { kind: 'element', id: q.it.id, movable: !q.fixed, prio: prio(q) });
  // 世界挂点（M12a-15）：屏幕上的 HUD 是障碍（贴边条、元素；触屏层与模板区域不算，与 M12a-17 同口径）
  const s = th.scale;
  const obstacles = local.items.filter((o) => !o.soft && o.kind !== 'world' && o.kind !== 'touch' && o.kind !== 'template').map((o) => o.rect);
  const inA = (b: Rect) => b.x >= A.x - 1 && b.y >= A.y - 1 && b.x + b.w <= A.x + A.w + 1 && b.y + b.h <= A.y + A.h + 1;
  /**
   * 推开（elx.occlusion = push）：沿上 / 下 / 左 / 右挪出压到的障碍，取挪得最少、仍在版面里、不再压到任何障碍的那一种；都不行 null（候选 ≤ 4 × 障碍数，每个查一遍障碍）。
   * max = 最多挪多远（画在点上的小元素：包围盒长边的 2 倍——挪得更远就离目标太远、看不出挂的是谁，不如不画）。
   * m = 这个元素的跨帧记忆（审查修复 A · L5）：上一帧推的方向这帧还推得开、而且不比最省的多挪 8 以上，就沿用——原来每帧取当帧最省的，
   * 目标在两种方案的分界上抖 1 像素时提示上 / 右来回换（19 / 20 帧）
   */
  const pushOut = (box: Rect, max = Infinity, m?: Memo, obs: Rect[] = obstacles): [number, number] | null => {
    const hit = obs.filter((o) => intersects(box, o));
    if (!hit.length) { if (m) m.push = undefined; return [0, 0]; }
    const cands: [number, number, string][] = [];
    for (const o of hit) cands.push([0, o.y - gap / 2 - (box.y + box.h), 'up'], [0, o.y + o.h + gap / 2 - box.y, 'down'], [o.x - gap / 2 - (box.x + box.w), 0, 'left'], [o.x + o.w + gap / 2 - box.x, 0, 'right']);
    const cost = (c: [number, number, string]) => Math.abs(c[0]) + Math.abs(c[1]);
    cands.sort((a, b) => cost(a) - cost(b));
    const valid = cands.filter((c) => { if (cost(c) > max) return false; const b = { ...box, x: box.x + c[0], y: box.y + c[1] }; return inA(b) && !obs.some((o) => intersects(b, o)); });
    if (!valid.length) return null;
    let pick = valid[0];
    if (m?.push) { const same = valid.find((c) => c[2] === m.push); if (same && cost(same) <= cost(pick) + HYST_PUSH) pick = same; }
    if (m) m.push = pick[2];
    return [pick[0], pick[1]];
  };
  const wopt = (it: It, k: string) => String(r.el(it.id, k, it.form) ?? 'auto');
  // 2d 画在世界点上的小元素（尺寸 ≤ 12：交互提示、头顶血条、飘字、状态图标……）：点 = attachFor（显式 elx.attachTo → 画法写死的挂点）；
  //    屏外（场景投影 on = false）按显式的 elx.offscreen（clamp 移进安全区 / hide / edgeArrow 画面边缘箭头；没给时照旧画在投影点上）；
  //    包围盒压到屏幕 HUD 时按 elx.occlusion：没给 / push = 推开（推不开就不画：屏幕上的 HUD 优先，M12a-17 原来一律不画）、hide = 不画、none = 照画。
  //    推不开时（审查修复 A · L5）：上一帧还画着的，按上一帧的推法再画 3 帧才藏（原来当帧就藏，目标在画面边上抖时一闪一闪）
  const hiddenWorld = new Set<Placed>();
  // 整屏叠加的点画法（ElementDef.overlay，R4 · C3，hi-fi-rush#28 的主角级拟声字）：不推开、不藏、不看屏外，范围登记成软占位，画的时候垫在其余元素下面
  const overlays = new Set<Placed>();
  const shiftOf = new Map<Placed, [number, number]>(), arrowOf = new Map<Placed, [number, number]>(), arrowRect = new Map<Placed, Rect>();
  // 屏外箭头（审查修复 A · L14）：箭头的方块登记进占位表、作命中框
  const arrow = (q: Placed, dir: [number, number]) => { arrowOf.set(q, dir); const ar = edgeArrowRect(q.it.e, dir); if (ar) { arrowRect.set(q, ar); local.add(ar, { kind: 'world', id: q.it.id, prio: 0 }); } };
  // 名牌类（ElementDef.worldYield，el.worldLabel）排在其余世界标记之后、把它们也当障碍（B6 审查修复 ㉒）；没有这类元素时顺序与原来一样
  for (const q of [...placed.filter((x) => !x.it.def.worldYield), ...placed.filter((x) => x.it.def.worldYield)]) {
    if (!q.small || isDiegetic(q.it.id)) continue;
    // 只管挂点元素（子项的挂点不是 none：显式给的、元素 / 画法的默认挂点；或显式写了 elx.offscreen / occlusion 的）——没有挂点的叠层（只选了热力图的 el.overlay……）照旧不参与
    const at = attachFor(q.it.e);
    if (q.it.def.overlay?.(q.it.e)) {
      const ob = q.it.def.pointBox?.(q.it.e, attachPoint(q.it.e, at === 'none' ? 'target' : at));
      overlays.add(q);
      if (ob) {
        // 挑压屏上 HUD 最少的位置（R4 审查修复 ⑫，hi-fi-rush#28：固定在画面中下时右半边压着击杀信息流、评级与连击）：原位、左右各挪 12% 版面宽、再各上挪 6% 版面高、
        //   正上挪 8% 这几个候选（挪的不比原位更出版面）里取与硬占位（屏上元素、固定障碍）重叠面积最小的——不比原位少四分之一以上就不挪；上一帧挑的那个仍不比最少的多一成就沿用（不来回跳）
        const m = mem(`ovl|${q.it.id}|${q.it.form ?? ''}`), cost = (b: Rect) => obstacles.reduce((s0, o) => s0 + overlapArea(b, o), 0);
        const keepIn = (v: number, p0: number, lo: number, hi: number) => Math.max(Math.min(lo, p0), Math.min(Math.max(hi, p0), v));
        const cands = ([[0, 0], [-0.12, 0], [0.12, 0], [-0.12, -0.06], [0.12, -0.06], [0, -0.08]] as const).map(([u, v]): [number, number, number] => {
          const dx = keepIn(ob.x + u * A.w, ob.x, A.x, A.x + A.w - ob.w) - ob.x, dy = keepIn(ob.y + v * A.h, ob.y, A.y, A.y + A.h - ob.h) - ob.y;
          return [dx, dy, cost({ ...ob, x: ob.x + dx, y: ob.y + dy })];
        });
        const best = cands.reduce((b, c) => (c[2] < b[2] ? c : b), cands[0]);
        let pick = best[2] < cands[0][2] * 0.75 ? best : cands[0];
        const prev = m.shift ? cands.find((c) => Math.abs(c[0] - m.shift![0]) < 0.5 && Math.abs(c[1] - m.shift![1]) < 0.5) : undefined;
        if (prev && prev[2] <= pick[2] * 1.1 + 1) pick = prev;
        m.shift = [pick[0], pick[1]];
        if (pick[0] || pick[1]) shiftOf.set(q, [pick[0], pick[1]]);
        local.add({ ...ob, x: ob.x + pick[0], y: ob.y + pick[1] }, { kind: 'world', id: q.it.id, prio: 0, soft: true });
      }
      continue;
    }
    if (at === 'none' || (q.it.attach === 'none' && wopt(q.it, 'occlusion') === 'auto' && wopt(q.it, 'offscreen') === 'auto')) continue;
    const p = attachPoint(q.it.e, at);
    // 场景明确报了没有手持物（held = null）：挂在它上面的不画
    if (p.missing) { hiddenWorld.add(q); continue; }
    const off = wopt(q.it, 'offscreen'), occ = wopt(q.it, 'occlusion'), m = mem(`push|${q.it.id}|${q.it.form ?? ''}`);
    let dx = 0, dy = 0;
    if (p.on === false) {
      if (off === 'hide') { hiddenWorld.add(q); m.shift = undefined; continue; }
      if (off === 'edgeArrow' && p.dir) { arrow(q, p.dir); m.shift = undefined; continue; }
      if (off === 'clamp') { dx = clampTo(p.x, A.x, A.x + A.w) - p.x; dy = clampTo(p.y, A.y, A.y + A.h) - p.y; }
    }
    // 包围盒：画法报的实际范围（飘字在头顶上方，目检修复），没报时角色的近似框
    const box0 = q.it.def.pointBox?.(q.it.e, p) ?? actorBox(p, s), box = { ...box0, x: box0.x + dx, y: box0.y + dy };
    const obs = q.it.def.worldYield ? [...obstacles, ...local.items.filter((o) => o.kind === 'world' && !o.soft && o.id !== q.it.id).map((o) => o.rect)] : obstacles;
    if (occ !== 'none' && obs.some((o) => intersects(box, o))) {
      const mv = occ === 'hide' ? null : pushOut(box, Math.max(box.w, box.h) * 2, m, obs);
      if (!mv) {
        if (occ === 'hide' || !m.shift || (m.miss ?? 0) >= 3) { hiddenWorld.add(q); m.shift = undefined; m.miss = 0; continue; }
        m.miss = (m.miss ?? 0) + 1;
        dx += m.shift[0]; dy += m.shift[1];
      } else { dx += mv[0]; dy += mv[1]; m.shift = mv; m.miss = 0; }
    } else { m.shift = [0, 0]; m.miss = 0; m.push = undefined; }
    if (dx || dy) shiftOf.set(q, [dx, dy]);
    local.add({ ...box0, x: box0.x + dx, y: box0.y + dy }, { kind: 'world', id: q.it.id, prio: 0 });
    // 同时画在几个点上的（世界名牌、攻击顺序编号、小图标气泡）：其余几块先跟着第一块的平移（B6 审查修复 ⑥ / ㉒），
    // 再各自推开压到的 HUD、夹进版面（终期审查修复 ㉖：原来整组只按第一块推，第一块往左推 66 时第二块推出画面左边）——每块的附加平移交给画法（ElCtx.ptShift）
    const more = q.it.def.pointBoxes?.(q.it.e, p) ?? [], ps: [number, number][] = [[0, 0]];
    more.forEach((b0, bi) => {
      const b = { ...b0, x: b0.x + dx, y: b0.y + dy };
      let ex = 0, ey = 0;
      if (occ !== 'none' && occ !== 'hide' && obs.some((o) => intersects(b, o))) { const mv = pushOut(b, Math.max(b.w, b.h) * 2, mem(`push|${q.it.id}|${q.it.form ?? ''}|${bi + 1}`), obs); if (mv) { ex = mv[0]; ey = mv[1]; } }
      ex = clampTo(b.x + ex, A.x, A.x + A.w - b.w) - b.x; ey = clampTo(b.y + ey, A.y, A.y + A.h - b.h) - b.y;
      ps.push([ex, ey]);
      local.add({ ...b, x: b.x + ex, y: b.y + ey }, { kind: 'world', id: q.it.id, prio: 0 });
    });
    if (ps.some(([x, y]) => Math.abs(x) > 0.01 || Math.abs(y) > 0.01)) q.it.e.ptShift = ps;
  }
  /** 同一挂点、同一侧已排的整块元素的外沿（中期审查修复 ㉙：夹紧以后的矩形；见 2e） */
  const stackEdge = new Map<string, number>();
  const stackAt = new Map<string, number>();
  const OPP: Record<AttachSide, AttachSide> = { above: 'below', below: 'above', left: 'right', right: 'left', center: 'center' };
  // 2e 挂在世界点上的整块元素（显式 elx.attachTo 的生命条、字幕、造价……）：矩形 = 角色包围盒的哪一边（elx.attachOffset，没给时按元素：条形 below、
  //    其余 above）+ 间距（elx.attachGap，px@1080p，默认 16）；宽 = 自己的宽或角色包围盒宽（elx.attachWidth = actor）；夹紧在安全区里。
  //    屏外按 elx.offscreen（没给 / clamp = 夹紧在画面边上、hide、edgeArrow），压到屏幕 HUD 时按 elx.occlusion（没给 / push = 推开，推不开原地画；hide；none）
  for (const it of items) {
    if (!it.wa) continue;
    const p = attachPoint(it.e, it.wa);
    if (p.missing) continue;
    const off = wopt(it, 'offscreen'), occ = wopt(it, 'occlusion');
    const so = wopt(it, 'attachOffset'), side0 = (SIDES.has(so) ? so : it.def.attachSide ?? 'above') as AttachSide;
    const gv = Number(r.el(it.id, 'attachGap', it.form)), gp = px1080(Number.isFinite(gv) && gv >= 0 ? gv : 16) * s;
    const ab = actorBox(p, s);
    const w = wopt(it, 'attachWidth') === 'actor' ? ab.w : it.size.w, h = it.size.h;
    // 同一挂点、同一侧的已有整块元素（M12b-65 ①，dead-space#26：生命板与弹药挂到同一点后叠在一起）：沿这一侧往外贴着前面那块（夹紧以后的）外沿排。
    // 中期审查修复 ㉙：原来按前面几块的长度累加、每块各自夹紧——挂点离画面边不到一摞的高度时整摞夹在边上叠成一块；现在贴着已排那块的外沿，
    // 排到画面外的（不是这一侧的第一块）翻到对侧接着排。居中的（center）照原来累加
    const at0 = (sd: AttachSide): Rect => {
      const sk = `${it.wa}|${sd}`, edge = stackEdge.get(sk), acc = stackAt.get(sk) ?? 0;
      return sd === 'below' ? { x: p.x - w / 2, y: (edge ?? ab.y + ab.h) + gp, w, h }
        : sd === 'left' ? { x: (edge ?? ab.x) - gp - w, y: ab.y + ab.h / 2 - h / 2, w, h }
        : sd === 'right' ? { x: (edge ?? ab.x + ab.w) + gp, y: ab.y + ab.h / 2 - h / 2, w, h }
        : sd === 'center' ? { x: p.x - w / 2, y: ab.y + ab.h / 2 - h / 2 + acc, w, h }
        : { x: p.x - w / 2, y: (edge ?? ab.y) - gp - h, w, h };
    };
    const outside = (q0: Rect) => q0.x < A.x - 0.5 || q0.y < A.y - 0.5 || q0.x + q0.w > A.x + A.w + 0.5 || q0.y + q0.h > A.y + A.h + 0.5;
    let side = side0, rect = at0(side0);
    if (side0 !== 'center' && stackEdge.has(`${it.wa}|${side0}`) && outside(rect)) { const flip = at0(OPP[side0]); if (!outside(flip)) { side = OPP[side0]; rect = flip; } }
    const q: Placed = { it, rect, small: false, fit: 1, fixed: true, anchor: it.anchor, world: true };
    const mark = (q0: Rect) => {
      const sk = `${it.wa}|${side}`;
      if (side === 'center') stackAt.set(sk, (stackAt.get(sk) ?? 0) + h + gp);
      else stackEdge.set(sk, side === 'below' ? q0.y + q0.h : side === 'left' ? q0.x : side === 'right' ? q0.x + q0.w : q0.y);
    };
    if (p.on === false) {
      if (off === 'hide') continue;
      if (off === 'edgeArrow' && p.dir) { arrow(q, p.dir); placed.push(q); continue; }
    }
    rect = { ...rect, x: clampTo(rect.x, A.x, A.x + A.w - w), y: clampTo(rect.y, A.y, A.y + A.h - h) };
    // 推开（中期审查修复 ㉙）：除了屏幕上的 HUD，也躲已经排好的世界挂点——2d 的点挂件（交互提示……）与前面排的整块元素；两样都躲不开时退回只躲屏幕上的 HUD；
    // 不画（hide）只看屏幕上的 HUD（原来的）
    const wObs = [...obstacles, ...local.items.filter((o) => o.kind === 'world' && !o.soft).map((o) => o.rect)];
    if (occ === 'hide' ? obstacles.some((o) => intersects(rect, o)) : occ !== 'none' && wObs.some((o) => intersects(rect, o))) {
      if (occ === 'hide') continue;
      // 躲不开世界挂点时退回只躲屏幕上的 HUD（原来的推法）：屏幕 HUD 优先
      const m0 = mem(`push|${it.id}|${it.form ?? ''}`), mv = pushOut(rect, Infinity, m0, wObs) ?? (obstacles.some((o) => intersects(rect, o)) ? pushOut(rect, Infinity, m0) : null);
      if (mv) rect = { ...rect, x: rect.x + mv[0], y: rect.y + mv[1] };
    }
    mark(rect);
    q.rect = rect;
    // 内容对齐：挂在左边的贴右、右边的贴左，其余居中
    it.e.align = side === 'left' ? 'right' : side === 'right' ? 'left' : 'center';
    local.add(rect, { kind: 'world', id: it.id, prio: 0 });
    placed.push(q);
  }
  // 只排不画（M12b-64）：返回排好的矩形（命中框的格式），不登记、不画
  if (opts.layoutOnly) return placed.filter((q) => !q.small).map((q) => ({ element: q.it.id, rect: q.rect, ...(q.it.form ? { form: q.it.form } : {}) }));
  // 并进帧占位表（同一份排位画第二遍时不再登记，审查修复 A · L4；只画几个元素时只登记画了的）；垫底那一遍按 pushBack 的缩放换算、标成 under（浮动详情不躲它，L15，见 layers.ts）
  // 调用方给的模板区域（opts.occupied）不再登记（M12b-64：模板自己按子类登记页头 / 数据条目 / 按钮 / 主体，整块主体栏登记了会把角上的合规层挤走）
  // 跟画面走的小件（reserve）只是排位用的障碍：实际画在哪由元素画完以后的 extraRects 登记（取景框会让位）
  if (!opts.noRegister) frameOccupancy().items.push(...local.items.filter((o) => o.kind !== 'template' && !(o.id ?? '').startsWith('decor.reserve:') && (only ? !!o.id && only.has(o.id) : true)));

  /* ---- 3 画 ---- */
  // 贴边条 / 底座 / 边框的底板（元素之前；只画保留元素的那一遍不画，底板属于垫底的局内 HUD）
  // 只画保留元素的那一遍（elx.keepOnMenu）：条里的成员全都保留、又没有垫底的局内 HUD 时（非弹出模板，noRegister = 垫底那一遍已画过条）连条的底板一起画——
  // M12b-63 收 slay-the-spire#4：地图 / 选卡 / 事件几屏同一条常驻顶栏（lay.hudOrg = edgeBar + lay.edgeBarSlots + 成员 elx.keepOnMenu）
  for (const b of bars) if (!only || (!opts.noRegister && b.ids.length > 0 && b.ids.every((id) => only.has(id)))) drawEdgeBar(b.host, b.plan);
  if (margins.length && !only) { const h = barHost(); for (const mg of margins) hudBarBox(h, mg); }
  // 同锚点共用底条（elx.stackDir = rowBar）：这一锚点所有元素的外接框垫一块 hudBar
  const shared = new Set(only ? [] : placed.filter((q) => !q.small && !q.fixed && q.it.stack === 'rowBar').map((q) => q.anchor));
  for (const a of shared) {
    const list = placed.filter((q) => q.anchor === a && !q.small && !q.fixed);
    const bb = bboxOf(list);
    hudBarBox(list[0].it.e, { x: bb.x - pad, y: bb.y - pad, w: bb.w + pad * 2, h: bb.h + pad * 2 });
  }
  // 成组底板（elx.group + elx.groupFrame，M12b-05 ②，balatro#7 / stardew#1）：同一组名的元素（排好以后的矩形）外接框外扩一圈留白，调 elementFrame（B4 · 50 的套框，§2）——
  //   tray 画在组员之前（垫底的材质托盘 + 框），panel 画在组员之后（外面一圈框）；组员之间的饰线（elx.groupConnector = flourish）也在组员之后。外接框登记占位 decor.frame:group:<组名>
  const groups0 = new Map<string, Placed[]>();
  for (const q of placed) if (!q.small && !hiddenWorld.has(q) && q.it.group && q.it.group !== 'none' && q.it.group !== 'auto') groups0.set(q.it.group, [...(groups0.get(q.it.group) ?? []), q]);
  const grpSet = (list: Placed[], k: string) => String(list.map((q) => layoutEl(th, q.it.id, k, q.it.form)).find((v) => v !== undefined && v !== 'auto' && v !== 'none') ?? 'none');
  // 外接框外扩留白、夹在安全区里（B6 审查修复 ㉑：原来贴着画面边的组框伸出画面）
  const grpBox = (list: Placed[]): Rect => {
    const b = inflateRect(bboxOf(list), pad), A0 = area.A, x0 = Math.max(b.x, A0.x), y0 = Math.max(b.y, A0.y);
    return { x: x0, y: y0, w: Math.max(0, Math.min(b.x + b.w, A0.x + A0.w) - x0), h: Math.max(0, Math.min(b.y + b.h, A0.y + A0.h) - y0) };
  };
  // 只给「挨在一起」的组画底板 / 饰线（B6 审查修复 ㉑）：组员在同一个锚点（躲开玩家翻过去以后的锚点）、外接框里没有压着组外的元素——
  //   组员分在几个锚点时外接框是一大片空场景（还会框住别的元素、组员一翻转就整屏闪），这时不画框（sys/check.ts 的 C-group-split 提示）
  // 组员之间的饰线 / 连接梁（elx.groupConnector，R4 · C3，hollow-knight#36）只要组员在同一个锚点：外接框里落进了组外的元素（hollow 的吉欧数在灵魂球 + 面具的外接框里）不再整组不画——
  //   饰线只画在相邻两块组员之间的空当，空当本身压到组外元素的那一段不画（connectorOk）；底板（groupFrame）照旧要外接框里没有组外元素
  const groups = new Map<string, Placed[]>(), links = new Map<string, Placed[]>();
  for (const [name, list] of groups0) {
    if (new Set(list.map((q) => q.anchor)).size > 1) continue;
    links.set(name, list);
    const bb = bboxOf(list);
    if (placed.some((o) => !o.small && !hiddenWorld.has(o) && !list.includes(o) && intersects(o.rect, bb))) continue;
    groups.set(name, list);
  }
  const connectorOk = (list: Placed[]) => (q: Rect) => !placed.some((o) => !o.small && !hiddenWorld.has(o) && !list.includes(o) && intersects(o.rect, q));
  if (!only) for (const [name, list] of groups) if (grpSet(list, 'groupFrame') === 'tray') frameOccupancy().add(elementFrame(list[0].it.e, grpBox(list), 'tray'), { kind: 'element', id: `decor.frame:group:${name}`, prio: 0 });
  // 停靠的铁艺翼梁（elx.dockConnector = ironBeam，B10 审查修复 ⑮，frostpunk#0）：从宿主的边一直伸到停靠者的外端、压在停靠者下面（停靠者挂在梁上），画在元素之前；
  // 原来只填两块之间的空当（frostpunk#0 只有 4 × 4.8，比两端的饰钉还小）。line 照旧只连空当、画在元素之后（见下）
  const dockHost = (q: Placed) => { const t = dockedTo.get(q.it); return (t && placed.find((x) => x.it === t && !x.small)) || (placed.find((x) => x.it.id === q.it.dock!.host && !x.small && !x.it.docked) ?? placed.find((x) => x.it.id === q.it.dock!.host && !x.small)); };
  if (!only) for (const q of placed) {
    if (!q.it.docked || q.it.dock?.link !== 'ironBeam' || q.small || hiddenWorld.has(q)) continue;
    const h = dockHost(q);
    if (!h) continue;
    // 登记梁露在停靠者外面的两段（宿主与停靠者之间的空当、外端出头的那一截）；压在停靠者下面的那段已经算在停靠者里
    const bm = dockBeam(q.it.e, h.rect, q.rect, 'ironBeam', true), b = q.rect, hor = bm.h <= bm.w;
    const parts: Rect[] = hor ? [{ ...bm, w: Math.max(0, b.x - bm.x) }, { ...bm, x: b.x + b.w, w: Math.max(0, bm.x + bm.w - b.x - b.w) }] : [{ ...bm, h: Math.max(0, b.y - bm.y) }, { ...bm, y: b.y + b.h, h: Math.max(0, bm.y + bm.h - b.y - b.h) }];
    for (const p of parts) if (p.w > 0.5 && p.h > 0.5) frameOccupancy().add(p, { kind: 'element', id: `decor.beam:${q.it.id}`, prio: 0 });
  }
  let order = 0;
  // 整屏叠加的点画法（overlays，R4 · C3）先画、垫在其余元素下面；没有这类时顺序与原来一样
  for (const q of overlays.size ? [...placed.filter((x) => overlays.has(x)), ...placed.filter((x) => !overlays.has(x))] : placed) {
    const { it, rect } = q;
    if (!painted(it.id)) continue;
    {
      const { w, h } = it.size;
      // 收进贴边条 / 边框的元素按条里的段对齐（M12a-18 的 ElCtx.align）
      const fa = fixedPlace.get(it)?.align;
      if (fa) it.e.align = fa;
      // 放置方式（elx.diegesis，继承 rel.diegesis）：叙事内 → 不画在屏幕上，画到自己的画布交给引擎做成世界里的板子
      if (isDiegetic(it.id) && diegetic) {
        let b = boards.get(it.id);
        if (!b) {
          // 板子按这个元素最大的子项定大小
          const parts = items.filter((x) => x.id === it.id);
          const small = parts.every((x) => x.pt);
          const cw = small ? 240 : Math.max(...parts.map((x) => x.size.w)) + 16, chh = small ? 140 : Math.max(...parts.map((x) => x.size.h)) + 16;
          // 板子画布跨帧复用（B6 审查修复 ㉖：原来每帧每个叙事内元素新建一张画布）：按参数对象（A / B 两侧各一份）+ 这一遍 + 元素 + 尺寸取，清空重画；
          // 引擎只在版本变了时用它重建贴图（engine/diegetic.ts），没变的帧里重画同一张不影响已经上传的贴图
          const cv = boardCanvas(r.art as object, `${memoPass}|${it.id}|${Math.ceil(cw * 2)}x${Math.ceil(chh * 2)}`, Math.ceil(cw * 2), Math.ceil(chh * 2));
          const cg = cv.getContext('2d')!;
          cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, cv.width, cv.height);
          cg.scale(2, 2);
          b = { cg, small, cw, chh };
          boards.set(it.id, b);
          const wr = String(r.el(it.id, 'worldRender') ?? 'billboard');
          diegetic.push({ id: it.id, canvas: cv, cssW: cw, cssH: chh, attach: it.attach, mode: wr === 'decal' ? 'decal' : 'billboard' });
        }
        const e2 = makeCtx(it.id, b.cg, b.cg, th, { x: 0, y: 0, w: b.cw, h: b.chh }, it.form);
        e2.noWorld = true;
        it.def.draw(e2, it.pt ? { x: 0, y: 0, w, h } : { x: 8, y: 8, w, h });
        continue;
      }
      if (hiddenWorld.has(q)) continue;
      // 屏外挂点的边缘箭头（elx.offscreen = edgeArrow，M12a-15）：只画箭头
      const arrowDir = arrowOf.get(q);
      if (arrowDir) { edgeArrow(it.e, arrowDir); const ar = arrowRect.get(q); if (ar) hits.push({ element: it.id, rect: ar, ...(it.form ? { form: it.form } : {}) }); continue; }
      const vis = String(r.el(it.id, 'visibility', it.form) ?? 'always');
      const g = d.ctx;
      // 伸出盒外的饰件（M12b-63 收 B4 审查修复 ⑳）：屏上元素画之前打开收集器（变换基准 = 这一刻的画布变换），画完登记成 decor.orn:<元素>
      if (!it.pt) ovhBegin(g);
      g.save();
      if (it.e.tx !== g) it.e.tx.save();
      // 推开 / 夹紧的世界挂点小元素（M12a-15）：整体平移
      const sh = shiftOf.get(q);
      if (sh) for (const c of it.e.tx !== g ? [g, it.e.tx] : [g]) c.translate(sh[0], sh[1]);
      // 按需显示：画成半透明（截图里看得出它平时不在）；背景信息（ambient）稍淡
      const xf = enterXf(sim, enterMode, order++);
      const fl = idleMode === 'float' ? Math.sin(sim.idle * 2.2 + order) * 2 : 0;
      const alpha = (vis === 'onDemand' ? 0.35 : it.e.priority === 'ambient' ? 0.8 : 1) * Math.max(0, xf.alpha) * elIdleK(it, vis);
      for (const c of it.e.tx !== g ? [g, it.e.tx] : [g]) {
        c.globalAlpha *= alpha;
        if (xf.dx || xf.dy || xf.scale !== 1 || fl) { const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2; c.translate(cx + xf.dx, cy + xf.dy + fl); c.scale(xf.scale, xf.scale); c.translate(-cx, -cy); }
        // 节拍脉冲（M12c-14，chk.demo = beat / chk.simPose = beatDown）：屏上的元素（背景信息 ambient 除外）在重拍上放大 5% 再回落（Hi-Fi Rush 的随拍跳动）；没有节拍事件时 beat = 0（原来的）
        if (sim.beat > 0 && !it.pt && it.e.priority !== 'ambient') { const k = 1 + 0.05 * sim.beat, cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2; c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy); }
      }
      // 元素自己的震动力度（mo.juice@el.x，M12a-01）：整张 UI 已按全局力度平移，这里补上差值（例如血条写 0 就不跟着抖）
      // 按元素的目标链取（实例 el.x#2 没写自己的时跟第一份，B6 审查修复 ⑱）
      const jkK = it.e.v.key('mo.juice'), jk = jkK.includes('@') && !r.bool('a11y.reduceMotion') ? clamp01(r.num(jkK, 0)) - clamp01(r.num('mo.juice', 0.3)) : 0;
      if (jk && (sim.shakeUnit[0] || sim.shakeUnit[1])) for (const c of it.e.tx !== g ? [g, it.e.tx] : [g]) c.translate(sim.shakeUnit[0] * jk, sim.shakeUnit[1] * jk);
      // 世界渲染（elx.worldRender，M6）：挂在世界上的元素按"透视"近大远小、"贴地"压扁、"描边"在挂点下画一圈高亮
      const wr = String(r.el(it.id, 'worldRender', it.form) ?? 'billboard');
      const wv = worldNow();
      if (it.pt && it.attach !== 'none' && wv && wr !== 'billboard' && wr !== 'inherit' && wr !== 'auto') {
        const p = attachPoint(it.e, it.attach);
        const sc = wr === 'perspective' ? perspectiveScale(p.depth ?? wv.refDepth, wv.refDepth) : 1;
        const sq = wr === 'decal' ? 0.45 : 1;
        if (wr === 'outline') { g.save(); g.strokeStyle = it.e.accent; g.lineWidth = 3; g.shadowColor = it.e.accent; g.shadowBlur = 10; g.beginPath(); g.ellipse(p.x, p.y + 14, 34, 13, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
        for (const c of it.e.tx !== g ? [g, it.e.tx] : [g]) { c.translate(p.x, p.y + (wr === 'decal' ? 30 : 0)); c.scale(sc, sc * sq); c.translate(-p.x, -p.y); }
      }
      // 横向收缩 / 边框里的缩放（M12a-17 / 16）：以矩形左上角为原点缩放，元素仍按原尺寸画
      const at: Rect = q.fit !== 1 ? { x: rect.x, y: rect.y, w: rect.w / q.fit, h: rect.h / q.fit } : rect;
      if (q.fit !== 1) for (const c of it.e.tx !== g ? [g, it.e.tx] : [g]) { c.translate(rect.x, rect.y); c.scale(q.fit, q.fit); c.translate(-rect.x, -rect.y); }
      // 斜切（vis.skew，M12a-06）：屏上的元素整块连字一起斜（里面的面板、格子、按钮不再各自斜）；挂在世界点上的小元素不斜
      // HUD 元素套框（elx.frame，M12b-50，stardew#1）：tray = 先垫一块材质托盘再套框（快捷栏、资源行），panel = 画完后在外面套一圈框；旧皮肤只认皮肤之后的层
      const ef = it.pt ? 'none' : String(layoutEl(th, it.id, 'frame', it.form) ?? 'none'), frames: Rect[] = [];
      // 亮场景的边缘衬底（§8 RC3 ②）：记下画这个元素之前绘制记录有多长，画完后按这个元素实际画出来的「没有不透明底的字」垫衬底
      const logN = DRAW_LOG.on ? [DRAW_LOG.texts.length, DRAW_LOG.boxes.length] : null;
      if (ef === 'tray') frames.push(elementFrame(it.e, at, 'tray'));
      if (it.pt) it.def.draw(it.e, at);
      // 整块倾斜（vis.tiltLayers ≠ box，M12b-40，persona5#0）：屏上的元素连字一起按自己的倾角转（只转盒子 = 原来的，不套）
      else withSkew(it.e.tx !== g ? [g, it.e.tx] : [g], at, it.e.th.boxSkew, () => withTilt(it.e, at, it.id, () => it.def.draw(it.e, at)));
      if (ef === 'panel') frames.push(elementFrame(it.e, at, 'panel'));
      // 边缘衬底（docs/workbench-redesign.md §8 RC3 ②，轨道 E；审查修复 ①④）：这个元素里没有底的字，按字底下画面的实际亮度（sceneLum.ts 的网格）判断对比不够的，
      // 邻近的并成一块垫在元素下面（destination-over）；模板里的元素不垫（画在世界点上的交互提示 / 名牌照垫）。UI 像素化时字画在单独的清晰文字层上：衬底画在字所在的那一层
      if (logN && !opts.inTemplate && QUALITY.on && th.scene) { const tl = it.e.tx !== g && DRAW_LOG.texts.slice(logN[0]).some((t) => t.cw === it.e.tx.canvas.width); bareTextScrim(tl ? it.e.tx : g, it.e.th, logN[0], logN[1], tl); }
      // 元素局部的矩形（at 坐标，横向收缩 / 边框缩放 q.fit 之前）→ 画面坐标（以 rect 左上角为原点缩放，与上面的变换一致；B4 审查修复：原来按没缩的 at 登记，fit ≠ 1 时差一截）
      const toScr = (b: Rect): Rect => (q.fit !== 1 ? { x: rect.x + (b.x - rect.x) * q.fit, y: rect.y + (b.y - rect.y) * q.fit, w: b.w * q.fit, h: b.h * q.fit } : b);
      // 元素两端的卷须（ast.ornamentAnchor = elementEnds，M12b-49）：画在元素外面，登记进帧占位表（合规层等后画的东西躲它）。
      // B4 审查修复：会伸出画面（留 2% 短边）、或压在已经登记的别的元素 / 饰件 / 模板块上（重叠超过两成）的那一端不画
      const safeM = Math.max(2, Math.min(R.w, R.h) * 0.02);
      const keepEnd = (b: Rect) => {
        const s0 = toScr(b);
        if (s0.x < R.x + safeM || s0.y < R.y + safeM || s0.x + s0.w > R.x + R.w - safeM || s0.y + s0.h > R.y + R.h - safeM) return false;
        return !frameOccupancy().items.some((o) => o.kind !== 'player' && !o.soft && !o.under && o.id !== it.id && !(o.id ?? '').endsWith(`:${it.id}`) && overlapArea(o.rect, s0) > s0.w * s0.h * 0.2);
      };
      // 挂在内容实际画到的地方（ElementDef.contentBox，M12b-15 / B4 审查修复 ㉔：无底说明块的字比元素报的矩形窄）
      const ends = !it.pt && anchorsOf(it.e).includes('elementEnds') ? elementEnds(it.e, it.def.contentBox?.(it.e, at) ?? at, keepEnd) : [];
      // 骑边耳标（ast.earTabAt，M12b-49，frostpunk#17）：画在元素内容之上，同样登记
      const ear = it.pt ? null : earTab(it.e, at, true);
      // 骑边小件（elx.satellites，M12b-05 ③，civ6#2 / civ6#10 / frostpunk#17）：画在元素内容之上，伸出框外的部分登记占位
      //   伸出安全区的那一件翻到对边 / 夹进安全区（B6 审查修复 ⑳；安全区换到元素的局部坐标：q.fit 是以 rect 左上角为原点的缩放）
      const A0 = area.A, safeL: Rect = q.fit !== 1 ? { x: rect.x + (A0.x - rect.x) / q.fit, y: rect.y + (A0.y - rect.y) / q.fit, w: A0.w / q.fit, h: A0.h / q.fit } : A0;
      const sats = it.sat && !it.pt ? satellites(it.e, at, it.sat.list, it.sat.side, it.sat.count, it.sat.over, safeL) : [];
      if (it.e.tx !== g) it.e.tx.restore();
      g.restore();
      for (const q2 of it.pt ? [] : ovhEnd()) frameOccupancy().add(q2, { kind: 'element', id: `decor.orn:${it.id}`, prio: 0 });
      for (const q2 of ear ? [...ends, ear] : ends) frameOccupancy().add(toScr(q2), { kind: 'element', id: `decor.${q2 === ear ? 'ear' : 'ends'}:${it.id}`, prio: 0 });
      for (const q2 of sats) frameOccupancy().add(toScr(q2), { kind: 'element', id: `decor.sat:${it.id}`, prio: 0 });
      for (const q2 of frames) frameOccupancy().add(toScr(q2), { kind: 'element', id: `decor.frame:${it.id}`, prio: 0 });
      // 画在元素外沿以外的附件（ElementDef.extraRects）：登记进帧占位表（B9 审查修复 ⑥）
      for (const q2 of it.def.extraRects?.(it.e, at) ?? []) frameOccupancy().add(toScr(q2), { kind: 'element', id: `decor.extra:${it.id}`, prio: 0 });
      // 世界挂点的元素：命中框放在挂点附近
      const small = it.pt;
      // 画在世界挂点上的（尺寸报 0 的）元素：命中框取画面中部的世界区域（目标、兴趣点、玩家都在里面）
      // 实际画出来的范围（轨道 E，给 B 的画布编辑：画在世界点上的小元素、占画面 1/5 以上的大框原来报一整块中部 / 整个区域，现在报字与盒子的外接框）
      const drawn = logN && (small || (rect.w * rect.h > (R.w * R.h) / 5 && LOOSE_AREAS.has(baseId(it.id)))) ? drawnBounds(g, logN[0], logN[1]) : null;
      const hit = drawn ?? (small ? { x: R.x + R.w * 0.3, y: R.y + R.h * 0.18, w: R.w * 0.46, h: R.h * 0.56 } : tiltExtent(it.e, rect, it.id));
      hits.push({ element: it.id, rect: hit, ...(it.form ? { form: it.form } : {}) });
    }
  }
  // 成组：panel 外框与组员之间的饰线（见上）；ironBeam（M12b-63）= 组员之间的铁艺连接梁
  if (!only) for (const [name, list] of links) {
    if (groups.has(name) && grpSet(list, 'groupFrame') === 'panel') frameOccupancy().add(elementFrame(list[0].it.e, grpBox(list), 'panel'), { kind: 'element', id: `decor.frame:group:${name}`, prio: 0 });
    const gc = grpSet(list, 'groupConnector'), okR = connectorOk(list);
    if (gc === 'flourish') groupConnectors(list[0].it.e, list.map((q) => q.rect), okR);
    if (gc === 'ironBeam') { const rs = [...list.map((q) => q.rect)].sort((a, b) => a.x - b.x || a.y - b.y); for (let i = 1; i < rs.length; i++) if (okR(gapRect(list[0].it.e.k, rs[i - 1], rs[i]))) frameOccupancy().add(dockBeam(list[0].it.e, rs[i - 1], rs[i], 'ironBeam'), { kind: 'element', id: `decor.beam:group:${name}`, prio: 0 }); }
  }
  // 停靠的连接线（elx.dockConnector = line，M12b-63）：宿主与停靠者相对的两条边之间一道饰色细线，登记占位（ironBeam 在元素之前画，见上）
  if (!only) for (const q of placed) {
    const lk = q.it.docked ? q.it.dock?.link : undefined;
    if (!lk || lk === 'ironBeam' || q.small) continue;
    const h = dockHost(q);
    if (h) frameOccupancy().add(dockBeam(q.it.e, h.rect, q.rect, lk), { kind: 'element', id: `decor.beam:${q.it.id}`, prio: 0 });
  }
  touch?.draw();
  // 屏幕边的数据噪声（vis.noiseEdges，M12b-48，cyberpunk-2077#1）：元素都排好以后，沿屏幕边找空位放几组编号 / 条码小字，放下的登记进帧占位表（合规层等后画的东西躲它）
  if (!only && !opts.inTemplate && noiseEdgesOn(th)) screenNoise(d.ctx, area.A, th);
  // 选中元素的虚线框：拆开画的元素每个子项一个框
  for (const h of highlight ? hits.filter((x) => x.element === highlight) : []) {
    {
      const g = d.ctx;
      g.save();
      g.setLineDash([6, 4]);
      g.strokeStyle = '#3b8cff';
      g.lineWidth = 2;
      g.strokeRect(h.rect.x - 4, h.rect.y - 4, h.rect.w + 8, h.rect.h + 8);
      g.fillStyle = withAlpha('#3b8cff', 0.08);
      g.fillRect(h.rect.x - 4, h.rect.y - 4, h.rect.w + 8, h.rect.h + 8);
      g.restore();
    }
  }
  return hits;
}

/**
 * 组员之间的饰线（elx.groupConnector = flourish，M12b-05 ②，K1 G-ornament-placement）：组员按左上排序，相邻两块之间（左右挨着就在两块之间的空当、上下挨着就在上下的空当）
 * 画一枚对称花饰（ornament.ts 的 flourish：一对卷须 + 中间垂饰，母题 = 面板母题），色 = 饰色；空当太窄（< 6）时花饰压在两块交界处
 */
function groupConnectors(e: ElCtx, rects: Rect[], ok: (gap: Rect) => boolean = () => true) {
  const g = e.g, k = e.k, c = ornColor(e), motif = e.t.panel.ornament?.motif ?? 'none';
  const list = [...rects].sort((a, b) => a.x - b.x || a.y - b.y);
  g.save(); g.fillStyle = c; g.strokeStyle = c;
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    // 两块之间的空当压着组外的元素（R4 · C3）：这一段不画
    if (!ok(gapRect(k, a, b))) continue;
    const sideBySide = b.x >= a.x + a.w - 2 * k;
    // 花饰随组员放大（R4 审查修复 ⑱，hollow-knight#36：原来按空当定长，10 的空当里只有 24 × 10 的一小枚）：长至少是两块里矮的那块的高 × 0.6（上下挨着时按窄的那块的宽），
    // 但伸进两边组员的不超过短的那块的一半（空当 + 0.5 × 沿花饰方向短的那块）；高 = 矮的那块的 0.25（至少 10、至多长的一半）。空当窄时骑在两块的交界上
    const fw = (gapLen: number, cross: number, along: number) => Math.max(24 * k, gapLen * 2.2, Math.min(cross * 0.6, gapLen + along * 0.5)), fh = (w: number, cross: number) => Math.max(10 * k, Math.min(cross * 0.25, w * 0.5));
    if (sideBySide) {
      const x0 = a.x + a.w, x1 = Math.max(x0 + 6 * k, b.x), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h), cy = y1 > y0 ? (y0 + y1) / 2 : (a.y + a.h / 2 + b.y + b.h / 2) / 2;
      const cr = Math.min(a.h, b.h), w = fw(x1 - x0, cr, Math.min(a.w, b.w));
      flourish(g, (x0 + x1) / 2, cy, w, fh(w, cr), motif);
    } else {
      const top = a.y < b.y ? a : b, bot = top === a ? b : a, y0 = top.y + top.h, y1 = Math.max(y0 + 6 * k, bot.y), cx = (Math.max(top.x, bot.x) + Math.min(top.x + top.w, bot.x + bot.w)) / 2;
      const cr = Math.min(a.w, b.w), w = fw(y1 - y0, cr, Math.min(a.h, b.h));
      g.save(); g.translate(cx, (y0 + y1) / 2); g.rotate(Math.PI / 2);
      flourish(g, 0, 0, w, fh(w, cr), motif);
      g.restore();
    }
  }
  g.restore();
}

/**
 * 相邻两块组员（按左上排序后的 a、b）之间饰线所在的空当（R4 · C3）：左右挨着 = 两块之间、竖向取两块的重叠段中线 ± 5；上下挨着 = 上下之间、横向取重叠段中线 ± 5。
 * 与 groupConnectors / dockBeam 判断左右还是上下的口径一致；空当不到 6 时按 6 算（花饰压在交界处）
 */
function gapRect(k: number, a: Rect, b: Rect): Rect {
  if (b.x >= a.x + a.w - 2 * k) {
    const x0 = a.x + a.w, x1 = Math.max(x0 + 6 * k, b.x), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h), cy = y1 > y0 ? (y0 + y1) / 2 : (a.y + a.h / 2 + b.y + b.h / 2) / 2;
    return { x: x0, y: cy - 5 * k, w: x1 - x0, h: 10 * k };
  }
  const top = a.y < b.y ? a : b, bot = top === a ? b : a, y0 = top.y + top.h, y1 = Math.max(y0 + 6 * k, bot.y), cx = (Math.max(top.x, bot.x) + Math.min(top.x + top.w, bot.x + bot.w)) / 2;
  return { x: cx - 5 * k, y: y0, w: 10 * k, h: y1 - y0 };
}

/**
 * 连接梁（M12b-63：elx.dockConnector / elx.groupConnector = ironBeam，frostpunk#0）：a、b 两块之间（左右并排时横梁、上下时竖梁）——
 * ironBeam = 铁艺梁：深铁色实心带（厚 6）+ 上下两道亮边 + 每 14 一颗铆钉、两端压一枚饰色小圆；line = 一道饰色细线。返回梁占的矩形。
 * span（停靠的翼梁，B10 审查修复 ⑮）：a = 宿主、b = 停靠者，梁从宿主的边伸到停靠者的外端再出头 4，横梁在停靠者的竖向中线上（竖梁在横向中线上）
 */
function dockBeam(e: ElCtx, a: Rect, b: Rect, kind: string, span = false): Rect {
  const g = e.g, k = e.k, side = b.x >= a.x + a.w - 2 * k || a.x >= b.x + b.w - 2 * k, c = ornColor(e);
  const [l, r] = a.x <= b.x ? [a, b] : [b, a], [t, d] = a.y <= b.y ? [a, b] : [b, a];
  const q = span
    ? side
      ? (() => { const cy = b.y + b.h / 2, x0 = b.x >= a.x ? a.x + a.w : b.x - 4 * k, x1 = b.x >= a.x ? b.x + b.w + 4 * k : a.x; return { x: x0, y: cy - 3 * k, w: Math.max(2 * k, x1 - x0), h: 6 * k }; })()
      : (() => { const cx = b.x + b.w / 2, y0 = b.y >= a.y ? a.y + a.h : b.y - 4 * k, y1 = b.y >= a.y ? b.y + b.h + 4 * k : a.y; return { x: cx - 3 * k, y: y0, w: 6 * k, h: Math.max(2 * k, y1 - y0) }; })()
    : side
      ? (() => { const y0 = Math.max(l.y, r.y), y1 = Math.min(l.y + l.h, r.y + r.h), cy = y1 > y0 ? (y0 + y1) / 2 : (l.y + l.h / 2 + r.y + r.h / 2) / 2; return { x: l.x + l.w, y: cy - 3 * k, w: Math.max(2 * k, r.x - l.x - l.w), h: 6 * k }; })()
      : (() => { const x0 = Math.max(t.x, d.x), x1 = Math.min(t.x + t.w, d.x + d.w), cx = x1 > x0 ? (x0 + x1) / 2 : (t.x + t.w / 2 + d.x + d.w / 2) / 2; return { x: cx - 3 * k, y: t.y + t.h, w: 6 * k, h: Math.max(2 * k, d.y - t.y - t.h) }; })();
  g.save();
  if (kind === 'line') { g.strokeStyle = c; g.lineWidth = Math.max(1, 1.5 * k); g.beginPath(); if (side) { g.moveTo(q.x, q.y + q.h / 2); g.lineTo(q.x + q.w, q.y + q.h / 2); } else { g.moveTo(q.x + q.w / 2, q.y); g.lineTo(q.x + q.w / 2, q.y + q.h); } g.stroke(); g.restore(); return q; }
  g.fillStyle = '#3a3f45'; g.fillRect(q.x, q.y, q.w, q.h);
  g.fillStyle = withAlpha('#ffffff', 0.28); if (side) g.fillRect(q.x, q.y, q.w, Math.max(1, k)); else g.fillRect(q.x, q.y, Math.max(1, k), q.h);
  g.fillStyle = withAlpha('#000000', 0.45); if (side) g.fillRect(q.x, q.y + q.h - Math.max(1, k), q.w, Math.max(1, k)); else g.fillRect(q.x + q.w - Math.max(1, k), q.y, Math.max(1, k), q.h);
  g.fillStyle = '#9aa0a6';
  const L = side ? q.w : q.h;
  for (let s = 7 * k; s < L - 4 * k; s += 14 * k) { g.beginPath(); g.arc(side ? q.x + s : q.x + q.w / 2, side ? q.y + q.h / 2 : q.y + s, 1.4 * k, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = c;
  for (const [x, y] of side ? [[q.x, q.y + q.h / 2], [q.x + q.w, q.y + q.h / 2]] : [[q.x + q.w / 2, q.y], [q.x + q.w / 2, q.y + q.h]]) { g.beginPath(); g.arc(x, y, 3.2 * k, 0, Math.PI * 2); g.fill(); }
  g.restore();
  return q;
}

/** 屏幕边数据噪声开没开（vis.noiseEdges 选过：新皮肤非默认层、旧皮肤皮肤之后的层） */
function noiseEdgesOn(th: Theme): boolean {
  const v = th.r.str('vis.noiseEdges', 'false'), l = th.r.src('vis.noiseEdges')?.layer;
  if (v !== 'true' || !l || l === 'default' || l === 'fallback') return false;
  return !th.legacy || afterSkin(th.r, 'vis.noiseEdges');
}
/**
 * 屏幕边的数据噪声块：候选位置沿四边（左上 / 左中 / 左下 / 右上 / 右中 / 右下 / 上中 / 下中），按密度取前 3~8 个，压到已登记的元素就跳过；
 * 字色 col.muted、窄体固定小字，与面板角上的 microText 同一个画法（ornament.ts 的 microBlock）
 */
function screenNoise(g: CanvasRenderingContext2D, A: Rect, th: Theme) {
  const occ = frameOccupancy(), dens = Math.max(0, Math.min(1, th.r.num('vis.noiseDensity', 0.5)));
  const micro = th.tokens.panel.ornament?.micro ?? { density: dens, color: th.roles.muted, font: FONT_STACK.condensed, rail: 'lr' };
  const lines = 3 + Math.round(dens * 2), sz = microBlockSize(lines), m = 6;
  const cand: [number, number, boolean, boolean][] = [
    [A.x + m, A.y + A.h * 0.3, false, false], [A.x + A.w - m, A.y + A.h * 0.62, true, false], [A.x + m, A.y + A.h - m, false, true], [A.x + A.w - m, A.y + m, true, false],
    [A.x + A.w - m, A.y + A.h - m, true, true], [A.x + m, A.y + m, false, false], [A.x + A.w * 0.5 - sz.w / 2, A.y + m, false, false], [A.x + A.w * 0.5 + sz.w / 2, A.y + A.h - m, true, true],
  ];
  const n = 3 + Math.round(dens * 5), R = microRand(Math.round(A.w) * 7 + Math.round(A.h));
  let put = 0;
  for (const [x, y, right, bottom] of cand) {
    if (put >= n) break;
    const rect: Rect = { x: right ? x - sz.w : x, y: bottom ? y - sz.h : y, w: sz.w, h: sz.h };
    if (!occ.free(inflateRect(rect, 2))) continue;
    microBlock(g, x, y, right, bottom, lines, micro, R);
    occ.add(rect, { kind: 'element', id: 'decor.microText', prio: 0 });
    put++;
  }
}

/**
 * 场景偏亮（§8 RC3 ②）：HUD 拿不到画面采样，按场景色板的天空顶色 / 纸色（地面基色）的相对亮度估：天空 > 0.25 或地面 > 0.4 算亮。品质下限关掉时永远 false
 */
export function sceneBright(th: Theme): boolean {
  if (!QUALITY.on || !th.scene) return false;
  const L = (c: string | undefined) => (c ? relLumOf(c) : 0);
  return L(th.scene.sky) > 0.25 || L(th.scene.paper) > 0.4;
}
function relLumOf(c: string): number {
  const [r, g, b] = parseColor(c), lin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/**
 * 边缘衬底（§8 RC3 ②，审查修复 ①④）：绘制记录里从 n0 / b0 起（= 这个元素画的）没有底的字（设备像素）——
 *   · 按每段字底下画面的实际亮度判断要不要垫（sceneLum.ts 的画面亮度网格；没有网格时按色板估的 sceneBright）：字对画面最差处的对比够了（正文 4.5、
 *     大字 / 有描边辅助的 3、单个图标 3）就不垫——暗场景上的白字、亮场景上的墨字都不再垫一块胶囊；
 *   · 要垫的字按邻近合并成块（一个元素通常一块，不再每段字一个疙瘩），块的转角跟皮肤面板（圆角皮肤圆、直角 / 切角皮肤小圆角、像素 / 阶梯皮肤方角不羽化）；
 *   · 深 / 浅按合成以后的对比度挑（衬底叠在画面上再和字比，取最差字更好的那个），透明度取够用的最小值（0.45–0.8）。
 * 画在已经画好的东西下面（destination-over），记进绘制记录（插在这个元素自己的盒子前面）。显式给了 typ.legibility / vis.opacity（皮肤之后）时不垫（th.floors.scrim）
 */
function bareTextScrim(g: CanvasRenderingContext2D, th: Theme, n0: number, b0: number, onTextLayer = false) {
  if (th.floors && !th.floors.scrim) return;
  const cw = g.canvas.width, ch = g.canvas.height;
  const texts = DRAW_LOG.texts.slice(n0).filter((t) => !t.fx && t.cw === cw), boxes = DRAW_LOG.boxes.slice(b0);
  // 有底：字中心落在这个元素自己画的、不透明度 ≥ 0.45 的盒子上（芯片、面板、横幅上的字不再另垫）。盒子与字可能记在不同大小的画布上（UI 像素化），按画布宽换算
  // 字中心底下这个元素自己画的最上面一块盒子（不透明度 > 0.02）：≥ 0.98 是实底（不垫），半透明的按「盒子叠在画面上」算底色（半透明芯片上的字照样可能看不清）
  const boxUnder = (t: { x: number; y: number; w: number; h: number; cw: number }) => { const cx = t.x + t.w / 2, cy = t.y + t.h / 2; let top: (typeof boxes)[number] | null = null; for (const b of boxes) { const k = t.cw / (b.cw || t.cw); if (b.color && alphaOf(b.color) > 0.02 && cx >= b.x * k && cx <= (b.x + b.w) * k && cy >= b.y * k && cy <= (b.y + b.h) * k) top = b; } return top; };
  const bright = sceneBright(th), sig = sceneSig(th.r.art as Record<string, unknown>);
  const isIcon = (t: { text: string }) => /^[^\p{L}\p{N}]$/u.test(t.text.trim());
  const need = (t: LoggedText) => (isIcon(t) || t.aided || t.size >= 18 || (t.bold && t.size >= 14) ? 3 : 4.5);
  const con = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  // 字（带透明度，叠在底上）的亮度：按 sRGB 线性近似混合
  const fgOn = (t: LoggedText, bgL: number) => { const [r, gg, b, a] = parseColor(t.color); const L = relLumOf(`rgb(${r},${gg},${b})`); return L * a + bgL * (1 - a); };
  type Item = { t: LoggedText; lo: number; hi: number };
  const items: Item[] = [], others: Item[] = [];
  for (const t of texts) {
    const ub = boxUnder(t), ua = ub?.color ? alphaOf(ub.color) : 0;
    if (ua >= 0.98) continue;
    const s = lumIn(t.x, t.y, t.w, t.h, cw, ch, sig);
    // 没有画面网格：亮场景按 0.35–0.85、暗场景按 0.01–0.12 估
    const lo0 = s ? s.min : bright ? 0.35 : 0.01, hi0 = s ? s.max : bright ? 0.85 : 0.12;
    // 半透明的盒子叠在画面上（按亮度近似混合）
    const bl = ub?.color && ua > 0 ? relLumOf(ub.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)')) : 0;
    const lo = ua > 0 ? bl * ua + lo0 * (1 - ua) : lo0, hi = ua > 0 ? bl * ua + hi0 * (1 - ua) : hi0;
    const worst = Math.min(con(fgOn(t, lo), lo), con(fgOn(t, hi), hi));
    // 留一成余量：压线的字（3.0 : 1 左右）按要垫算（网格与检查同为 192 宽，但采样时刻不同）
    (worst < need(t) * 1.1 ? items : others).push({ t, lo, hi });
  }
  if (!items.length) return;
  const k = paintScale(g), p = 5 * k;
  // 邻近合并：外扩 p 以后相交的并成一块（同一元素的几行字 / 图标 + 数字成一块），块太空（面积 > 字面积 4 倍）时不并
  type Blk = { x0: number; y0: number; x1: number; y1: number; area: number; list: Item[] };
  let blks: Blk[] = items.map((it) => ({ x0: it.t.x - p, y0: it.t.y - p * 0.5, x1: it.t.x + it.t.w + p, y1: it.t.y + it.t.h + p * 0.5, area: it.t.w * it.t.h, list: [it] }));
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < blks.length; i++) for (let j = i + 1; j < blks.length; j++) {
      const a = blks[i], b = blks[j];
      if (a.x0 - p > b.x1 || b.x0 - p > a.x1 || a.y0 - p > b.y1 || b.y0 - p > a.y1) continue;
      const u = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
      if ((u.x1 - u.x0) * (u.y1 - u.y0) > (a.area + b.area) * 4 + p * p * 16) continue;
      blks[i] = { ...u, area: a.area + b.area, list: [...a.list, ...b.list] }; blks.splice(j, 1); merged = true; break outer;
    }
  }
  // 半压在衬底上的别的字并进来（整合修复：D 的场景门槛「RPG·庭院」——任务标题与勾要垫、同一行的「击败狼妖」自己够得上，衬底只盖住它的头两个字，
  // 看着像字冒出了底，可读性检查也报「文字冒出盒子」）：和块相交的、这个元素里没有实底的字整段收进块里（一起参与挑深浅），收到不再变为止
  for (let grown = true; grown;) {
    grown = false;
    for (const b of blks) for (let i = others.length - 1; i >= 0; i--) {
      const t = others[i].t;
      if (t.x > b.x1 || t.x + t.w < b.x0 || t.y > b.y1 || t.y + t.h < b.y0) continue;
      b.x0 = Math.min(b.x0, t.x - p); b.y0 = Math.min(b.y0, t.y - p * 0.5); b.x1 = Math.max(b.x1, t.x + t.w + p); b.y1 = Math.max(b.y1, t.y + t.h + p * 0.5);
      b.area += t.w * t.h; b.list.push(others[i]); others.splice(i, 1); grown = true;
    }
  }
  // 转角跟皮肤面板：像素 / 阶梯皮肤方角不羽化；圆角皮肤 = 块高的一半以内；其余小圆角
  const pnl = th.tokens.panel, square = th.pixel > 1 || !!pnl.step, round = pnl.radiusPct !== undefined || (typeof pnl.radius === 'number' ? pnl.radius : Array.isArray(pnl.radius) ? 8 : 0) >= 8;
  const DARK = '8,10,14', LIGHT = '250,248,242';
  const scrimL = (rgb: string) => (rgb === DARK ? 0.003 : 0.94);
  const out: { b: Blk; rgb: string; a: number }[] = [];
  for (const b of blks) {
    // 每种底、每档透明度：合成以后（衬底叠在画面最亮 / 最暗处）最差的那段字的对比度；取够用的最小透明度，两种都不够时取最差字更好的
    let best: { rgb: string; a: number; score: number } | null = null;
    for (const rgb of [DARK, LIGHT]) for (const a of [0.45, 0.55, 0.65, 0.8]) {
      const score = Math.min(...b.list.map(({ t, lo, hi }) => Math.min(...[lo, hi].map((L) => { const bg = scrimL(rgb) * a + L * (1 - a); return con(fgOn(t, bg), bg) / need(t); }))));
      if (!best || (score >= 1 && (best.score < 1 || a < best.a)) || (best.score < 1 && score > best.score)) best = { rgb, a, score };
      if (score >= 1) break;
    }
    out.push({ b, rgb: best!.rgb, a: best!.a });
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-over';
  g.globalAlpha = 1;
  for (const { b, rgb, a } of out) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0, rad = square ? 0 : round ? Math.min(h / 2, p * 2.4) : Math.min(h / 2, 2 * k);
    const layer = (q: number, al: number) => { g.fillStyle = `rgba(${rgb},${al})`; g.beginPath(); if (rad > 0) g.roundRect(b.x0 - q, b.y0 - q, w + q * 2, h + q * 2, rad + q); else g.rect(b.x0 - q, b.y0 - q, w + q * 2, h + q * 2); g.fill(); };
    // 中心合成不透明度 = a（外两圈羽化各 8%）；像素皮肤不羽化
    if (square) layer(0, a);
    else { layer(0, +(1 - (1 - a) / (0.92 * 0.92)).toFixed(3)); layer(p * 0.6, 0.08); layer(p * 1.2, 0.08); }
  }
  g.restore();
  // 衬底画在这个元素下面：记录插在这个元素自己的盒子前面（可读性检查取最上面那块盒子当字的底）；UI 像素化时衬底画在文字层（叠在盒子层上面），排在最后
  DRAW_LOG.boxes.splice(onTextLayer ? DRAW_LOG.boxes.length : b0, 0, ...out.map(({ b, rgb, a }) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0, color: `rgba(${rgb},${a})`, blur: 0, cw })));
}
const alphaOf = (c: string) => parseColor(c)[3];
/** 报整块区域、实际只画一小块的元素（通知区、交互提示、飘字、字幕）：大框时命中框改报画出来的范围 */
const LOOSE_AREAS = new Set(['el.notify', 'el.interact', 'el.feedback', 'el.subtitle', 'el.prompt']);
/** 绘制记录里从 n0 / b0 起（= 刚画的这个元素）的字与盒子的外接框，按画布当前的变换换回设计单位（外扩 2）；什么都没画时 null */
function drawnBounds(g: CanvasRenderingContext2D, n0: number, b0: number): Rect | null {
  const cw = g.canvas.width, items = [...DRAW_LOG.texts.slice(n0), ...DRAW_LOG.boxes.slice(b0)].filter((q) => q.cw === cw && q.w > 0 && q.h > 0);
  if (!items.length || typeof g.getTransform !== 'function') return null;
  const m = g.getTransform();
  if (!m.a || !m.d) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of items) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x + q.w); y1 = Math.max(y1, q.y + q.h); }
  return { x: (x0 - m.e) / m.a - 2, y: (y0 - m.f) / m.d - 2, w: (x1 - x0) / m.a + 4, h: (y1 - y0) / m.d + 4 };
}

const EL_LABEL = new Map((SPEC.vocab.elements as unknown as { id: string; label: string }[]).map((x) => [x.id, x.label]));

function drawShowcase(d: DrawCtx, A: Rect, items: { id: string; def: { draw: (e: never, r: Rect) => void }; e: ReturnType<typeof makeCtx>; size: { w: number; h: number } }[], highlight?: string | null): Hit[] {
  const cols = Math.max(3, Math.round(Math.sqrt(items.length * (A.w / A.h)))), rows = Math.ceil(items.length / cols);
  const cw = A.w / cols, ch = A.h / rows, cap = 16;
  const hits: Hit[] = [];
  items.forEach((it, i) => {
    const cell: Rect = { x: A.x + (i % cols) * cw, y: A.y + Math.floor(i / cols) * ch, w: cw, h: ch };
    const g = d.ctx, tx = it.e.tx;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(cell.x + 2, cell.y + 2, cell.w - 4, cell.h - 4);
    g.restore();
    drawText(tx, (EL_LABEL.get(baseId(it.id)) ?? it.id) + (it.id.includes('#') ? ` ${it.id.slice(it.id.indexOf('#'))}` : ''), cell.x + 6, cell.y + 2, cap, { font: it.e.base.font, size: 11, weight: 700, color: '#fff' });
    // 元素在格子里的坐标系：世界挂点也落在格子里
    const inner: Rect = { x: 0, y: 0, w: cell.w - 8, h: cell.h - cap - 6 };
    const small = pointSized(it.e, it.size);
    const s = small ? Math.min(1, inner.w / 360, inner.h / 220) : Math.min(1, inner.w / it.size.w, inner.h / it.size.h);
    const R2: Rect = { x: 0, y: 0, w: inner.w / s, h: inner.h / s };
    it.e.R = R2;
    it.e.noWorld = true;
    const at: Rect = small ? { x: 0, y: 0, w: it.size.w, h: it.size.h } : { x: (R2.w - it.size.w) / 2, y: (R2.h - it.size.h) / 2, ...it.size };
    for (const c of tx === g ? [g] : [g, tx]) { c.save(); c.beginPath(); c.rect(cell.x + 2, cell.y + cap, cell.w - 4, cell.h - cap - 2); c.clip(); c.translate(cell.x + 4, cell.y + cap + 2); c.scale(s, s); }
    (it.def.draw as (e: typeof it.e, r: Rect) => void)(it.e, at);
    for (const c of tx === g ? [g] : [tx, g]) c.restore();
    hits.push({ element: it.id, rect: cell });
    if (highlight === it.id) { g.save(); g.strokeStyle = '#3b8cff'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(cell.x + 2, cell.y + 2, cell.w - 4, cell.h - 4); g.restore(); }
  });
  return hits;
}
