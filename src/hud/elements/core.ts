import { contrastRatio, luminance, MATERIAL_BASE, mix, parseColor, rgba, withAlpha } from '../material';
import { drawFrame, type FrameSpec } from '../frame';
import { glyphIconName, ICON_CTX, ICON_STYLE } from '../icons/draw';
import { DRAW_LOG, drawnSize, flooredSize, isHudCanvas, logBoxRect, QUALITY, arrowTip, bakedPaint, boxPath, colorUnder, drawBox, drawFinish, drawPattern, drawText, fadePaint, lightFace, logTarget, logText, measure, ORN, resolveColor, scallopR, stepRise, TEXT_K, vectorAdvance, vectorGlyph, VECTOR_NUMERALS, withSkew, type Rect, type TextOpts } from '../paint';
import { bracketFrame, crownGeom, drawEndcap, endcapReach, endcapShapeOf, flourish, glyph, sprig } from '../ornament';
import { LAYER_RANK, type Resolved, type ScopedView, type Source } from '../sys/resolve';
import { baseId, ELEMENT_ANCHORS } from '../sys/register';
import { afterSkin, ensureContrast, onColorOf, patchTheme, px1080, type RoleName, type Theme } from '../sys/theme';
import type { BoxStyle, ButtonRole, Corner, SkinPalette, SkinTokens } from '../types';
import { bodyOpts, titleOpts } from '../compose/sample';
import { worldNow } from '../world';
import { lumIn, sceneSig } from '../sceneLum';
import { simNow } from '../sim';
import { tapMin } from '../sys/device';
import { drawGlyph, drawPadlock, glyphSetOf, glyphWidth, mouseButtonOf, type GlyphTint } from '../glyphs';
import { CURSOR_KINDS, cursorContextOf, type CursorContext, type CursorInk, type CursorKind } from '../cursors';
import { assetFile, BADGE_ITEM, characterImage, drawAtlasItem, drawAtlasItemFx, drawAtlasItemTinted, drawHSlice, drawImageFitFx, filteredImage, iconSetId, itemName, ribbonCaps, ribbonFile, uiImage, type IconTint } from '../uiAssets';
import { drawGreybox } from '../greybox';
import { PIXROLE, withPixRole } from '../pixelRoles';
import { gaugeDecor, type GaugeExtra } from './gauges';
import { artRef, liveView, pack } from '../content';
import { textFor } from '../content/texts';
import type { ContentPack, HudData, PadButton } from '../content/types';

/*
 * 信息元素的公共部分（docs/ui-hud-plan.md M5a）：绘制上下文、组件画法（面板、数值图形、格子、按钮、徽章、标牌、头像）、样本数据与注册表。
 * 每个元素（src/hud/elements/*.ts）只管"这一种信息怎么画"：先报尺寸（measure），再在排版给的矩形里画（draw）。
 * 组件的形态读 cmp.* 参数，可以按元素覆盖（cmp.gauge@el.vitals）；颜色、字体、盒子样式都来自皮肤 token。
 * 作用域 token（M12a-01）：makeCtx 的主题按元素打补丁（patchTheme，<参数>@el.x）；组件画法（格子、按钮、按键、标牌、头像、徽章、数值条、面板）
 *   各自取 e.part(部件) 的上下文——查 <参数>@<部件> → <参数>@<元素> → 全局，参数清单见 sys/scopable.ts。没有作用域键时就是元素自己的上下文。
 */

export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'center' | 'mr' | 'bl' | 'bc' | 'br';
/** 元素内容的水平对齐（M12a-18）：由锚点所在列推出（左列 left、中列 center、右列 right）；贴边条里按段 */
export type Align = 'left' | 'center' | 'right';
/** 锚点 → 所在列的对齐 */
export const ANCHOR_ALIGN: Record<Anchor, Align> = { tl: 'left', ml: 'left', bl: 'left', tc: 'center', center: 'center', bc: 'center', tr: 'right', mr: 'right', br: 'right' };
/** 挂在世界里的元素（M6 前用屏幕上的近似位置） */
export type Attach = 'none' | 'player' | 'target' | 'poi' | 'held' | 'cursor';

export interface ElCtx {
  id: string;
  /** 盒子画布与文字画布（UI 像素化时分开） */
  g: CanvasRenderingContext2D;
  tx: CanvasRenderingContext2D;
  th: Theme;
  r: Resolved;
  t: SkinTokens;
  pal: SkinPalette;
  /** 版面缩放 × 元素缩放 × 优先级 */
  k: number;
  forms: string[];
  /**
   * 元素按画法拆开画时（M12a-14）这个上下文画的那一种画法（forms = [form]）：元素实例参数先查画法级键 el.<元素>.<画法>.<后缀>（elOf()）；
   * 没拆开（只有一种画法）时 undefined
   */
  form?: string;
  base: TextOpts;
  title: TextOpts;
  name: TextOpts;
  small: TextOpts;
  big: TextOpts;
  text: string;
  accent: string;
  accent2: string;
  /** 语义色（M12a-02，= th.roles：col.good / warn / bad、色盲预设、色彩策略） */
  good: string;
  warn: string;
  bad: string;
  /** 颜色角色（M12a-03）：标题字色（col.heading）、图标字色（col.icon）、次要字色（col.muted）、任务 / 目标色（col.quest）、选中描边（col.focus） */
  heading: string;
  icon: string;
  muted: string;
  quest: string;
  focus: string;
  /**
   * 多行数值 / 多条状态的颜色（M12a-02）：第 i 条用 role 角色色（th.roles，或直接给颜色）；
   * 目标链上写了 col.accent@<目标> 时第 0 条改用作用域强调色、写了 col.accent2@ 时第 1 条改用作用域第二强调色
   */
  fill: (i: number, role: RoleName | string) => string;
  /** 类别 / 流派色表（M12b-33，§2 的 e.lineColors）：col.coding 含 lineId 时 = col.lineColors（没给时一组默认色），否则空（不着色）；取色用 lineColor(e, i) */
  lineColors: string[];
  /** 数值标注：none / current / currentMax / percent / delta */
  valueLabel: string;
  valueLabelPos: string;
  priority: string;
  /**
   * 内容对齐（M12a-18）：按内容排的元素（资源数字、计时、评级字母、按键图例、圆钮……）在拿到的矩形里贴哪一边——由锚点所在列推出（makeCtx 按子项的锚点算，
   * 排位翻转锚点 / 进贴边条时 compose/hud.ts 再改）；矩形比内容宽（elx.stackWidth = match、固定宽的盒子）时才看得出。用 alignX()
   */
  align: Align;
  /** 屏幕尺寸（画幅以内） */
  R: Rect;
  /** 不用世界投影（全部控件展示的格子里用近似位置） */
  noWorld?: boolean;
  /**
   * 显式给的挂点（M12a-15，§2 的 ElCtx.attach）：画法级 el.<元素>.<画法>.attachTo → 元素级 el.<元素>.attachTo（不是 none / auto 时）；没给时 undefined——
   * 画法里写死的默认挂点由调用方补：attachPoint(e, e.attach ?? 默认)，或 attachFor(e)（按 ElementDef.points）
   */
  attach?: Attach;
  /** 钉住的挂点（M12a-15）：某个挂点在这次排版里固定画在给定位置（anchoredCard 的卡外下沿），attachPoint 先查它 */
  pins?: Partial<Record<Attach, { x: number; y: number }>>;
  /** 画在几个点上的世界元素（名牌、攻击顺序编号、小图标气泡）每一块的附加平移（终期审查修复 ㉖：compose/hud.ts 的 2d 逐块推开 / 夹进版面后写；第 0 块 = 整体平移之外不动） */
  ptShift?: [number, number][];
  /** 目标链（M12a-01）：元素自己是 [el.x]，部件是 [部件…, el.x]；cmp()、格子状态 st.*、主题 token 都按它查 <参数>@<目标> */
  scope: readonly string[];
  /** 目标链上的参数视图（= r.scope(scope)） */
  v: ScopedView;
  /** 这个元素画到第几块面板（M12a-06：vis.tilt 按「元素 id + 序号」取确定的倾角；部件与元素共用同一个计数） */
  seq: { n: number };
  /**
   * 元素里的一个部件（slot / button / key / plate / title / name / avatar / badge / bar / panel / node / tooltip / listRow / tab / titleBar / card / minimapFrame……）：
   * 依次查 <参数>@<名字1>、<参数>@<名字2>……→ <参数>@<元素> → 全局。部件里再取部件不叠加（格子里的按钮只查 @button），
   * 这些名字上一个作用域键都没有时返回元素自己的上下文。按（元素上下文, 名字）缓存——元素上下文每帧新建，所以就是每帧缓存。
   */
  part: (...names: string[]) => ElCtx;
}

export interface ElementDef {
  id: string;
  /** 第一个是默认画法 */
  forms: string[];
  anchor: Anchor;
  /** 默认挂点：none = 屏幕叠加 */
  attach?: Attach;
  size: (e: ElCtx) => { w: number; h: number };
  draw: (e: ElCtx, at: Rect) => void;
  /**
   * 多选了几种画法、按画法拆开画时（M12a-14）各画法的默认锚点 / 挂点：画法级键 el.<元素>.<画法>.screenAnchor / attachTo 与元素级键都没给时用它
   * （Boss 条在上中、敌人头顶血条挂目标、评级 / 连击在右上……）；只有一种画法时不用（元素照旧按自己的锚点）
   */
  formDefaults?: Record<string, { anchor?: Anchor; attach?: Attach }>;
  /**
   * 画在世界点上的画法（尺寸报 ≤ 12 的）原来写死的挂点（M12a-15）：画法 → 挂点。attachFor(e) = 显式 elx.attachTo → 这里 → attach → none；
   * 占位表的世界挂点包围盒、屏外 / 遮挡处理按它找点（与画法自己 attachPoint(e, e.attach ?? 默认) 同一个点）
   */
  points?: Record<string, Attach>;
  /** 整块元素挂到世界点上时（elx.attachTo 显式给了，M12a-15）默认放在挂点的哪一边：条形 below、气泡 / 卡片 above（没写 = above） */
  attachSide?: AttachSide;
  /**
   * 画在点上的画法实际画出来的范围（目检修复）：p = 挂点（设计单位），返回包围盒；占位表的世界挂点登记、遮挡推开都用它。
   * 没写 / 返回 null 时用角色的近似包围盒（hud.ts 的 actorBox：左右 24、上 36、下 8）——飘字画在头顶上方 24–80，原来按角色框推开后字仍压在 Boss 条上
   */
  pointBox?: (e: ElCtx, p: { x: number; y: number }) => Rect | null;
  /**
   * 同时画在几个点上的画法（B6 审查修复 ⑥ / ㉒：世界名牌、攻击顺序编号、小图标气泡）除 pointBox 那一块以外画出的其余矩形：hud.ts 跟着同一次推开平移、一起登记进占位表
   * （kind world，原来只登记一块，后画的元素与浮动详情不让开其余几块）
   */
  pointBoxes?: (e: ElCtx, p: { x: number; y: number }) => Rect[];
  /** 画在点上时也让开别的世界标记（名牌类，B6 审查修复 ㉒）：hud.ts 把它排在其余世界标记之后，已登记的世界标记也算障碍（推不开照 elx.occlusion） */
  worldYield?: boolean;
  /**
   * 报点尺寸、实际是整屏叠加的画法（R4 · C3，hi-fi-rush#28：主角级拟声字 el.feedback.sfxSize = hero，画面中下约六成屏宽的星爆）：hud.ts 不按世界挂点推开 / 藏，
   * 垫在其余元素下面画，pointBox 登记成软占位（只有躲玩家的元素才躲软占位，见 compose/occupancy.ts）。没写 = 不是
   */
  overlay?: (e: ElCtx) => boolean;
  /** 内容实际要的宽（M12b-65 ②）：同锚点共用底条（elx.stackDir = rowBar）的格宽按它收；没报时按 size 的宽 */
  fitW?: (e: ElCtx) => number;
  /**
   * 能退回的高（R4 审查修复 ②⑪）：size 报的高是为放下内容「长高」过的（建筑面板写了字段时长到刚好放下）时，不长高时的高（原来的封顶）；
   * hud.ts 排位后量这一列上下两排元素之间的空当，长高后的元素放不下时收回到 max(这个高, 空当)（内容由画法按实际的高截）。没写 / 不小于 size 的高 = 不收
   */
  flexH?: (e: ElCtx) => number;
  /**
   * 成员格（M12b-05 ①，elx.dockSlot）：多成员元素在 at 里的矩形——停靠者写了 dockSlot = N 时停在第 N 格旁边（Octopath 的指令窗挂在当前行动者名牌左侧）。
   * 现在只有 el.party 报（每个队员一格）；没报时 dockSlot 不起作用（停在整个元素旁，Godot 导出同样写 0，B6 审查修复 ④）
   */
  slots?: (e: ElCtx, at: Rect) => Rect[];
  /** 当前成员是第几格（1 起；M12b-63：停靠者选了 elx.dockFollow = active 时停在这一格旁，el.party 的当前行动者） */
  activeSlot?: (e: ElCtx) => number;
  /**
   * 只选了一种画法、没给锚点时这种画法的默认锚点（M12b-15：el.selection = sidePanel 贴 el.selection.edge 那一边的上角）；返回 undefined = 照旧（元素的锚点 / elx.screenAnchor 的兜底）。
   * 只给新画法用（老画法没写它，锚点不变）
   */
  formAnchor?: (r: Resolved, form: string, id: string) => Anchor | undefined;
  /**
   * 内容实际画到的矩形（M12b-15，B4 审查修复 ㉔ 的顺延）：元素两端的卷须（ast.ornamentAnchor = elementEnds）挂在它的两端；没写 = 元素报的矩形（原来的）
   */
  contentBox?: (e: ElCtx, at: Rect) => Rect;
  /**
   * 元素画在自己矩形以外、位置跟画面走的成块小件（画面坐标，B9 审查修复 ⑤ / ㉑：整屏取景框的四角括角、REC、电池、时间码）：hud.ts 排位前把它们当固定障碍放进局部占位表
   * （别的元素挪开），画完登记进帧占位表（decor.reserve:<元素>）。没写 = 没有
   */
  reserve?: (e: ElCtx) => Rect[];
  /**
   * 画在元素矩形外沿以外的成块附件（元素坐标 at 里，B9 审查修复 ⑥：检定的概率卡、城市面板的名牌、命中计算探出的技能格……）：画完登记进帧占位表（decor.extra:<元素>），
   * 后画的合规层 / 浮框躲它。没写 = 没有
   */
  extraRects?: (e: ElCtx, at: Rect) => Rect[];
}
/** 挂到世界点上的整块元素放在挂点哪一边（elx.attachOffset，M12a-15） */
export type AttachSide = 'above' | 'below' | 'left' | 'right' | 'center';

/**
 * 元素注册表：按元素 id 查定义。M12b-04：查的时候去掉实例号（el.party#2 → el.party 的定义），遍历 cnt.elements 的地方（hud.ts、layers.ts、godotLayout.ts、screen.ts）
 * 拿实例 id 照样查得到；画法里的 e.id 是实例 id（参数、作用域、命中框、Godot 节点名都按它），只有找定义 / 比较元素种类时用 baseId
 */
class ElementMap extends Map<string, ElementDef> {
  get(id: string) { return super.get(baseId(id)); }
  has(id: string) { return super.has(baseId(id)); }
}
export const ELEMENTS: Map<string, ElementDef> = new ElementMap();
export const registerElement = (d: ElementDef) => { ELEMENTS.set(d.id, d); ELEMENT_ANCHORS.set(d.id, d.anchor); };
/** 元素自己的参数实际读的键（M12b-04：实例上是 el.<元素>#2.<后缀>，没给时 chosen / pickedStr 当没选；基 id 上与原来的 'el.<元素>.<后缀>' 一样） */
export const ownKey = (e: ElCtx, suffix: string) => `${e.id}.${suffix}`;
/** 元素自己的参数的值（实例没给时回到参数表默认，不继承第一份）：= r.el(e.id, 后缀)，str / num / bool / list 与 Resolved 同口径 */
export const ownVal = (e: ElCtx, suffix: string) => e.r.el(e.id, suffix);
export const ownStr = (e: ElCtx, suffix: string, def = ''): string => { const v = ownVal(e, suffix); return v === undefined || v === null ? def : Array.isArray(v) ? v.join(',') : String(v); };
export const ownNum = (e: ElCtx, suffix: string, def = 0): number => { const v = ownVal(e, suffix), n = typeof v === 'number' ? v : Number(v); return v === undefined || v === null || v === '' || Number.isNaN(n) ? def : n; };
export const ownBool = (e: ElCtx, suffix: string, def = false): boolean => { const v = ownVal(e, suffix); return v === undefined ? def : v === true || v === 'true' || v === 1; };
export const ownList = (e: ElCtx, suffix: string): string[] => { const v = ownVal(e, suffix); return v === undefined || v === null ? [] : Array.isArray(v) ? v.map(String) : String(v).split(',').map((x) => x.trim()).filter(Boolean); };

/**
 * 元素按画法拆成的子项（M12a-14，§2 的 {id, form, anchor, attach}）：form = undefined 表示没拆（只有一种画法）。
 * given（M12a-15）= 显式给的挂点（画法级 attachTo，或元素级 attachTo——拆开画时只作用于没有屏幕默认锚点的画法）；没给 = undefined。
 * 整块元素（尺寸 > 12）只有 given 时才挂到世界点上（不进锚点列）；attach 仍是原来的口径（含 formDefaults / 元素默认挂点，世界挂点类的小元素与导出用）
 */
export interface ElementPart { id: string; form?: string; anchor: Anchor; attach: Attach; given?: Attach }
const ANCHORS = new Set<string>(['tl', 'tc', 'tr', 'ml', 'center', 'mr', 'bl', 'bc', 'br']);
const ATTACHES = new Set<string>(['player', 'target', 'poi', 'held', 'cursor']);
const isAttach = (v: unknown): v is Attach => ATTACHES.has(String(v));
/**
 * 元素的子项（M12a-14）：el.<元素>.form 多选了几种画法时每种一项（原来只画第一种），各自取锚点 / 挂点——
 *   锚点：画法级 el.<元素>.<画法>.screenAnchor → 显式给的元素级 el.<元素>.screenAnchor / elx.screenAnchor → formDefaults → 元素级的兜底值（tl）/ 元素的默认锚点；
 *   挂点：画法级 attachTo → 显式给的元素级 attachTo（不是 none 时）→ formDefaults → 元素的默认挂点。
 *   M12a-15：formDefaults 写了屏幕锚点、没写挂点的画法（评级 / 连击在右上、Boss 条在上中）不吃元素级的 attachTo——
 *   Hi-Fi 的 el.feedback.attachTo = target 只挂拟声字，PERFECT! 与连击留在右上；要挂就写画法级 el.feedback.rating.attachTo。
 * 只有一种画法时是元素自己（与原来的读法一样）。compose/hud.ts 排版、godotLayout.ts 导出共用
 */
export function elementParts(r: Resolved, id: string): ElementPart[] {
  const def = ELEMENTS.get(id);
  if (!def) return [];
  const forms = formsOf(r, id);
  if (forms.length <= 1) {
    const a = String(r.el(id, 'screenAnchor') ?? 'auto'), at = String(r.el(id, 'attachTo') ?? 'none');
    // 新画法自己的默认锚点（ElementDef.formAnchor，M12b-15）：锚点没显式给时才用
    const al = r.src(r.elKey(id, 'screenAnchor'))?.layer, fa = !al || ['default', 'fallback', 'ruleDefault'].includes(al) ? def.formAnchor?.(r, forms[0] ?? def.forms[0], id) : undefined;
    // 画法自己的默认挂点（formDefaults，B6 审查修复 ②：原来只有多选画法时才读，只选了 el.objective = marker / el.turnOrder = numberBadges 的世界标记不登记占位、不推开不藏）
    return [{ id, anchor: (fa ?? (ANCHORS.has(a) ? a : def.anchor)) as Anchor, attach: (at !== 'none' ? at : def.formDefaults?.[forms[0]]?.attach ?? def.attach ?? 'none') as Attach, ...(isAttach(at) ? { given: at } : {}) }];
  }
  // 元素级的值是不是显式给的（elx.screenAnchor 的兜底 tl 不算：没给时让画法的默认位置先上）
  const given = (suffix: string) => { const l = r.src(r.elKey(id, suffix))?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault'; };
  return forms.map((form) => {
    const fd = def.formDefaults?.[form];
    const fa = String(r.get(`${id}.${form}.screenAnchor`) ?? ''), ea = String(r.el(id, 'screenAnchor') ?? '');
    const ft = String(r.get(`${id}.${form}.attachTo`) ?? ''), et = String(r.el(id, 'attachTo') ?? '');
    const anchor = (ANCHORS.has(fa) ? fa : ANCHORS.has(ea) && given('screenAnchor') ? ea : fd?.anchor ?? (ANCHORS.has(ea) ? ea : def.anchor)) as Anchor;
    // 屏幕默认锚点的画法（formDefaults 只写了锚点）：元素级挂点不算数
    const screenForm = !!fd?.anchor && !fd.attach;
    const attach = (isAttach(ft) ? ft : screenForm ? 'none' : isAttach(et) && given('attachTo') ? et : fd?.attach ?? (isAttach(et) ? et : def.attach ?? 'none')) as Attach;
    const giv = isAttach(ft) ? ft : !screenForm && isAttach(et) && given('attachTo') ? et : undefined;
    return { id, form, anchor, attach, ...(giv ? { given: giv } : {}) };
  });
}

/**
 * 画在世界点上的画法（交互提示、头顶血条、飘字、准星……）：按 S(10) 报尺寸，排版不给它们占锚点位。
 * 门槛 = 12 × 元素缩放（至少 12；M12a-15：原来写死 12，版面 / 字号放大到 1.2 倍以上——电视、掌机、大字——时这些画法被当成整块元素排进了锚点列）
 */
export const pointSized = (e: ElCtx, s: { w: number; h: number }) => { const t = 12 * Math.max(1, e.k); return s.w <= t && s.h <= t; };

/** 这个上下文的挂点（M12a-14 / 15）：显式给的 elx.attachTo（ElCtx.attach）优先，否则 def（画法原来写死的挂点） */
export const attachOf = (e: ElCtx, def: Attach): Attach => e.attach ?? def;
/** 这个上下文实际挂的点（M12a-15）：显式 elx.attachTo → 这种画法写死的默认挂点（ElementDef.points）→ 元素默认挂点 → none（屏幕上的近似位置） */
export function attachFor(e: ElCtx): Attach {
  if (e.attach) return e.attach;
  const def = ELEMENTS.get(e.id);
  return def?.points?.[e.forms[0]] ?? def?.attach ?? 'none';
}

/* ---------------- 样本数据 ---------------- */

/** 局内 HUD 的样本：当前内容包（../content，HudSystem 每画一侧前设置）的 hud 字段的视图；原来写死的"雪线旅人"样本在 content/packs/snowline.ts */
export const DATA: HudData = liveView(() => pack().hud);
/**
 * 行动号召（el.cta）的字（M12b-61）：按界面取（textFor('cta')：局内 HUD = 结束回合 / 下一层……、结算 / 本局总结 / 章节卡 / 解锁 / 奖励 / 战报 = 继续、三选一 = 跳过、
 * 邮件 = 一键领取——into-the-breach#34、slay-the-spire#30、xcom2#31），没写时内容包的 hud.cta；el.cta.caption 显式选了时主按钮写它（继续 / 结束回合 / 跳过 / 出发 / 确定 / 再来一局 / 开始）。
 * 圆钮的字（go）照旧是包的 hud.cta.go。p = 内容包（默认当前包；Godot 导出传参数选的示例包）
 */
const CTA_LABEL: Record<string, string> = { continue: '继续', endTurn: '结束回合', skip: '跳过', depart: '出发', confirm: '确定', retry: '再来一局' };
export const ctaText = (r: Resolved, p: ContentPack = pack()): HudData['cta'] => {
  const c = p.hud.cta, t = textFor('cta', r, p), base = t ? { ...c, ...t } : c;
  const lb = r.str('el.cta.caption', 'auto');
  return lb === 'start' ? { ...base, start: c.start } : CTA_LABEL[lb] ? { ...base, start: CTA_LABEL[lb] } : base;
};

/* ---------------- 样本条目数与状态（M12a-10） ---------------- */

/** 样本条目数的上限：与参数表 cnt.itemCount / slotCount / filledCount 的 max 一致（审查修复 A · L11：原来写死 40，世界地图 60 个节点只画 40） */
export const MAX_ITEMS = 60;
/** 条目数（cnt.itemCount，原来是 screen.ts 的 count()）：没给时是兜底 6；zero = true 时预设 / 手动明确给的 0 算数（画空状态），否则 0 当没给 */
export function itemCount(e: ChoiceCtx, def: number, zero = false): number {
  const n = e.r.num('cnt.itemCount', NaN);
  if (zero && n === 0 && itemCountSet(e)) return 0;
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_ITEMS, Math.round(n)) : def;
}
/** cnt.itemCount 是不是显式给的（预设 / 手动，不是默认 / 兜底层） */
export const itemCountSet = (e: ChoiceCtx) => { const l = e.r.src('cnt.itemCount')?.layer; return !!l && l !== 'default' && l !== 'fallback'; };
/** 信息密度对条目数的倍数（cnt.density 0–4 → ×0.5 / 0.75 / 1 / 1.5 / 2）；没显式给密度时 1（画面不变） */
export function densityK(e: ChoiceCtx): number {
  const l = e.r.src('cnt.density')?.layer;
  if (!l || l === 'default' || l === 'fallback') return 1;
  return [0.5, 0.75, 1, 1.5, 2][Math.max(0, Math.min(4, Math.round(e.r.num('cnt.density', 2))))];
}
/**
 * 树 / 星图 / 网格这类「样本有多少画多少」的条目数（M12a-10）：显式给了 cnt.itemCount 就用它；否则 def（原来的个数）× 信息密度倍数。
 * keep = 没显式给条目数时原来实际画的个数（网格原来吃兜底的 6）
 */
export function itemCountOr(e: ChoiceCtx, def: number, keep = def): number {
  if (itemCountSet(e)) return itemCount(e, def);
  const k = densityK(e);
  return k === 1 ? keep : Math.max(1, Math.min(MAX_ITEMS, Math.round(def * k)));
}
/**
 * 样本不够时循环取（M12a-10）：第二轮起名字加编号（「铁矿 2」），nameAt = 名字在条目里的位置；状态（第 5 项起的对象）原样带上
 */
export function sampleItems<T extends readonly unknown[]>(list: readonly T[], n: number, nameAt = 1): T[] {
  return Array.from({ length: n }, (_, i) => {
    const row = list[i % list.length], k = Math.floor(i / list.length);
    if (!k || typeof row[nameAt] !== 'string') return row;
    const c = [...row] as unknown[];
    c[nameAt] = `${row[nameAt]} ${k + 1}`;
    return c as unknown as T;
  });
}

/**
 * 样本状态演示（cnt.stateDemo，M12a-10）：on = 按序号演示锁定 / 冷却 / 新品 / 稀有度（原来的写法）；off = 只画内容包逐条声明的状态；
 * auto = 这份样本逐条声明了状态（或内容包把这类演示关了：hud.abilityStates / menu.itemStates = none）时关，否则开
 */
export function stateDemo(e: ElCtx, declared: boolean, packOff = false): boolean {
  const v = e.r.str('cnt.stateDemo', 'auto');
  return v === 'on' ? true : v === 'off' ? false : !declared && !packOff;
}
/** 这份样本有没有逐条声明状态（条目第 at 项是状态对象） */
export const declaredStates = (rows: readonly (readonly unknown[])[], at: number) => rows.some((x) => !!x[at] && typeof x[at] === 'object');
/** 锁定从第几个开始（cnt.lockedFrom，M12a-10）：数字 = 从这个序号（0 起）起锁；none = 不锁；auto = 演示开着时第 6 个起（原来写死的 LOCKED_FROM = 5），关着时不锁 */
export function lockedFrom(e: ElCtx, demo: boolean): number {
  const v = e.r.get('cnt.lockedFrom');
  if (v === 'none') return Infinity;
  const n = typeof v === 'number' ? v : Number(v);
  return v !== undefined && v !== null && v !== '' && v !== 'auto' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : demo ? 5 : Infinity;
}
/** 稀有度在这个内容包里有没有（ContentPack.noRarity：工厂、农场这类物品不分品质） */
export const packRarity = () => !pack().noRarity;

/* ---------------- 多项排布（M12a-20） ---------------- */

/** arrangeCells 的排法：取值与 elx.arrangement / lay.arrangement 同名 */
export type CellMode = 'row' | 'column' | 'grid' | 'cross' | 'pyramid' | 'ring' | 'zigzag2' | 'fan';
export const CELL_MODES = new Set<string>(['row', 'column', 'grid', 'cross', 'pyramid', 'ring', 'zigzag2', 'fan']);
/**
 * opts：gap 格间距；cols 网格列数（不给时按 rows 或 √n）；rows 网格行数；groups 每组几格、组间多留 0.4 格（row / column / grid 都按序号分组，饥荒 15 + 3）；
 * invert 金字塔倒过来（上 2 下 1 的倒三角）
 */
export interface CellOpts { gap?: number; cols?: number; rows?: number; groups?: number; invert?: boolean }

/**
 * 多项元素的排布（M12a-20）：n 个 cell 大小的格子按 mode 排，返回各格的矩形（左上角从 0, 0 起，调用方平移）、外接框 bbox，
 * 以及扇形每格的旋转角（弧度，fan 才有）。
 *   row / column：一行 / 一列；grid：cols 列（或 rows 行）的网格；cross：上 / 左 / 右 / 下四格、中心留空（第 5 格起排在十字下面一行）；
 *   pyramid：上 1 下 2 下 3……（品字形，invert = 倒三角）；ring：沿圆周、从正上方顺时针；zigzag2：两列交错、第二列下移半格；
 *   fan：基础扇形（叠压、出屏、悬停抬起见 M12b-12）。
 * Godot：对应自定义 Container（CrossContainer / RingContainer / ZigzagContainer 的 _notification(NOTIFICATION_SORT_CHILDREN) 里按同样公式 fit_child_in_rect）
 */
export function arrangeCells(n: number, cell: { w: number; h: number }, mode: CellMode | string, o: CellOpts = {}): { rects: Rect[]; bbox: { w: number; h: number }; rot?: number[] } {
  const gap = o.gap ?? 6, { w, h } = cell, gx = (k: number) => (o.groups && o.groups > 0 ? Math.floor(k / o.groups) * (w + gap) * 0.4 : 0);
  const gy = (k: number) => (o.groups && o.groups > 0 ? Math.floor(k / o.groups) * (h + gap) * 0.4 : 0);
  const rects: Rect[] = [];
  let rot: number[] | undefined;
  switch (mode) {
    case 'column': for (let i = 0; i < n; i++) rects.push({ x: 0, y: i * (h + gap) + gy(i), w, h }); break;
    case 'grid': {
      const cols = Math.max(1, o.cols ?? (o.rows ? Math.ceil(n / Math.max(1, o.rows)) : Math.ceil(Math.sqrt(n))));
      for (let i = 0; i < n; i++) { const c = i % cols, rw = Math.floor(i / cols); rects.push({ x: c * (w + gap) + gx(c), y: rw * (h + gap), w, h }); }
      break;
    }
    case 'cross': {
      // 十字：上、左、右、下（Elden 的快捷装备、Ghost 的四向暗器）；中心那格空着
      const at: [number, number][] = [[1, 0], [0, 1], [2, 1], [1, 2]];
      for (let i = 0; i < Math.min(4, n); i++) rects.push({ x: at[i][0] * (w + gap), y: at[i][1] * (h + gap), w, h });
      for (let i = 4; i < n; i++) rects.push({ x: (i - 4) * (w + gap), y: 3 * (h + gap), w, h });
      break;
    }
    case 'pyramid': {
      const rows: number[] = [];
      for (let k = 1, left = n; left > 0; k++) { rows.push(Math.min(k, left)); left -= k; }
      if (o.invert) rows.reverse();
      const widest = Math.max(...rows);
      let i = 0;
      rows.forEach((cnt, ri) => { const x0 = ((widest - cnt) * (w + gap)) / 2; for (let c = 0; c < cnt; c++, i++) rects.push({ x: x0 + c * (w + gap), y: ri * (h + gap), w, h }); });
      break;
    }
    case 'ring': {
      // 半径按格数：相邻两格不重叠（弦长 ≥ 格子对角线），至少一格半
      const d = Math.hypot(w, h) + gap, R = n > 1 ? Math.max(d / (2 * Math.sin(Math.PI / n)), d * 0.75) : 0;
      for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 - Math.PI / 2; rects.push({ x: R + Math.cos(t) * R, y: R + Math.sin(t) * R, w, h }); }
      break;
    }
    case 'zigzag2': for (let i = 0; i < n; i++) rects.push({ x: (i % 2) * (w + gap), y: Math.floor(i / 2) * (h + gap) + (i % 2 ? (h + gap) / 2 : 0), w, h }); break;
    case 'fan': {
      // 基础扇形：沿一段圆弧摆开，每张转一点，中间那张最高
      rot = [];
      const step = Math.min(0.16, 0.9 / Math.max(1, n - 1)), R = h * 2.2;
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) * step;
        rects.push({ x: R * Math.sin(t) + ((n - 1) / 2) * w * 0.82, y: R * (1 - Math.cos(t)), w, h });
        rot.push(t);
      }
      break;
    }
    default: for (let i = 0; i < n; i++) rects.push({ x: i * (w + gap) + gx(i), y: 0, w, h });
  }
  // 外接框从 0, 0 起（ring / fan 的格子可能落到负坐标：整体平移）
  const x0 = Math.min(0, ...rects.map((q) => q.x)), y0 = Math.min(0, ...rects.map((q) => q.y));
  if (x0 < 0 || y0 < 0) for (const q of rects) { q.x -= x0; q.y -= y0; }
  const bw = rects.length ? Math.max(...rects.map((q) => q.x + q.w)) : 0, bh = rects.length ? Math.max(...rects.map((q) => q.y + q.h)) : 0;
  return { rects, bbox: { w: bw, h: bh }, rot };
}

/**
 * 元素自己的内部排布（M12a-20）：元素级键（el.<元素>.arrangement）或模板 elx.arrangement 显式给了才用新排法；
 * 没给、继承全局 lay.arrangement 时只认 column（原来的读法，其余照旧横排）。legacyColumn = false 的元素（工具栏）原来不读排布，继承值一律当横排
 */
export function ownArrangement(e: ElCtx, legacyColumn = true): string {
  const own = e.r.get(`${e.id}.arrangement`), tpl = e.r.get('elx.arrangement');
  const pick = own !== undefined && own !== 'inherit' && own !== 'auto' ? own : tpl !== undefined && tpl !== 'inherit' && tpl !== 'auto' ? tpl : null;
  if (pick !== null) return String(pick);
  return legacyColumn && String(e.r.el(e.id, 'arrangement') ?? '') === 'column' ? 'column' : 'row';
}

/** 元素的格数（elx.count / el.<元素>.count，M12a-20）：没给时 def（原来写死的格数） */
export function elCount(e: ElCtx, def: number): number {
  const v = e.r.el(e.id, 'count');
  const n = typeof v === 'number' ? v : Number(v);
  return v !== undefined && v !== null && v !== '' && v !== 'auto' && v !== 'inherit' && Number.isFinite(n) && n > 0 ? Math.min(30, Math.round(n)) : def;
}

/* ---------------- 多成员排法（M12b-04 / 18） ---------------- */

/** memberRects 的结果：成员格（相对 0, 0）、外接框、画的顺序、每格相对原格的缩放 */
export interface MemberLayout { rects: Rect[]; bbox: { w: number; h: number }; order: number[]; scale: number[]; stacked: boolean }
/** 贴满屏宽（elx.span = full，M12b-30）：横幅 / 字幕条宽 = 画面宽（选过才算，旧皮肤只认皮肤之后的层） */
export const spanFull = (e: ElCtx) => elChosen(e, 'span') && String(elOf(e, 'span') ?? 'auto') === 'full';
/** 元素实例参数 elx.instanceLayout / activeEmphasis 选过的值（旧皮肤只认皮肤之后的层，elChosen）；没选 = def */
export const memberMode = (e: ElCtx, suffix: 'instanceLayout' | 'activeEmphasis', def: string) => (elChosen(e, suffix) ? String(elOf(e, suffix) ?? def) : def);
/** 露出量（elx.stackReveal，0.1–0.6 × 格长）：没选 0.28（一张卡露出标题行） */
export const stackRevealOf = (e: ElCtx) => { const v = Number(elOf(e, 'stackReveal')); return elChosen(e, 'stackReveal') && Number.isFinite(v) ? Math.max(0.1, Math.min(0.6, v)) : 0.28; };
/**
 * 多成员元素的成员格（M12b-04 / 18，§2）：n 个 cell 大小的成员沿 dir（h 横排 / v 竖排）排，gap = 间距（可为 0；负数 = 交叠，el.party.overlap）；
 *   elx.instanceLayout = stack：错位叠放——每个成员沿排列方向只露出 elx.stackReveal × 格长、另一个方向错开 8% 格宽，后面的压在前面的上面（Cyberpunk 左中三张卡只露标题行）；
 *   elx.activeEmphasis（第 active 个 = 当前行动者）：scale = 当前项 1.2 倍、其余 0.85 倍（横排底对齐、竖排左对齐）；raise = 当前项抬起 12%（横排往上、竖排往外）。
 * emph / mode 给了时不读参数（画法自己的默认，如视频通话格默认放大中间那块）。都没选时 = n 个等大格、gap 间距。order = 画的顺序（交叠时当前项最后画）。
 * Godot：HBox / VBox（separation = gap；负间距 = 自定义 Container 的 _notification 里按同一公式 fit_child_in_rect）
 */
export function memberRects(e: ElCtx, n: number, cell: { w: number; h: number }, dir: 'h' | 'v', gap: number, active = 0, o: { mode?: string; emph?: string; wrap?: number } = {}): MemberLayout {
  const mode = o.mode ?? memberMode(e, 'instanceLayout', 'row'), emph = o.emph ?? memberMode(e, 'activeEmphasis', 'none');
  const stack = mode === 'stack', reveal = stackRevealOf(e);
  const sc = Array.from({ length: n }, (_, i) => (emph === 'scale' ? (i === active ? 1.2 : 0.85) : 1));
  const rects: Rect[] = [];
  const crossMax = Math.max(...sc.map((s) => (dir === 'h' ? cell.h : cell.w) * s));
  // 折行（o.wrap = 沿排列方向最多多长，B6 审查修复 ㉔：八人的状态带一列 608 高、伸出 540 高的画面）：放不下的那一个起另起一列 / 一行，往交叉方向排；没给 = 不折（原来的）
  const wrapL = !stack && o.wrap && o.wrap > 0 ? o.wrap : Infinity, crossGap = Math.max(gap, 4 * e.k);
  let along = 0, line0 = 0;
  for (let i = 0; i < n; i++) {
    const w = cell.w * sc[i], h = cell.h * sc[i];
    if (along > 0 && along + (dir === 'h' ? w : h) > wrapL + 0.5) { along = 0; line0 += crossMax + crossGap; }
    // 叠放：沿排列方向只前进露出的那一截，交叉方向错开 8%
    const cross = stack ? i * (dir === 'h' ? cell.h : cell.w) * 0.08 : 0;
    const lift = emph === 'raise' && i === active ? (dir === 'h' ? cell.h : cell.w) * 0.12 : 0;
    if (dir === 'h') rects.push({ x: along, y: line0 + crossMax - h + cross - lift, w, h });
    else rects.push({ x: line0 + cross + lift, y: along, w, h });
    along += stack ? (dir === 'h' ? w : h) * reveal : (dir === 'h' ? w : h) + gap;
  }
  const x0 = Math.min(0, ...rects.map((q) => q.x)), y0 = Math.min(0, ...rects.map((q) => q.y));
  for (const q of rects) { q.x -= x0; q.y -= y0; }
  const bbox = { w: rects.length ? Math.max(...rects.map((q) => q.x + q.w)) : 0, h: rects.length ? Math.max(...rects.map((q) => q.y + q.h)) : 0 };
  const order = Array.from({ length: n }, (_, i) => i);
  if (!stack && (gap < 0 || emph === 'scale') && active >= 0 && active < n) { order.splice(active, 1); order.push(active); }
  return { rects, bbox, order, scale: sc, stacked: stack };
}

/* ---------------- 骑边小件（M12b-05 ③） ---------------- */

/** 骑边小件的种类（elx.satellites）：小圆钮 / 数字徽章 / 小签 / 拨杆 / 提示条（compose/hud.ts 按它筛掉不认识的值） */
export const SATELLITE_KINDS = ['button', 'badge', 'tab', 'toggle', 'prompt', 'counters'] as const;
/** 小圆钮里的符号（Civ6 下一步球旁的宗教 / 产能、小地图顶上的镜头钮）：取内容包工具栏的符号，没有时这一组 */
const SAT_GLYPHS = ['⚙', '✦', '◆', '☰', '✚', '★'];
/** 一块骑边小件：种类、矩形、第几颗（小圆钮） */
interface SatPart { kind: string; rect: Rect; i: number }
const SAT_CORNERS = ['tl', 'tr', 'bl', 'br'];
/**
 * 骑边小件的几何（B6 审查修复 ⑳：从 satellites 里拆出来，只量位置不画；satelliteReach 与画法共用）。side 的读法按种类：
 *   button = 这条边 / 这个角（没给 = 左边竖排）；badge / tab / toggle = 给了角（tl / tr / bl / br）时挪到那个角，否则各自原来的角（小签左上、徽章与拨杆右上）——
 *   同一个角上有几件时从角往里挨着排（原来徽章与拨杆都钉在右上、叠在一起）；prompt = 给了底边（b / bl / br）时在底边下方，否则顶边上方（给了角时靠那一侧，其余居中）
 */
function satelliteLayout(e: ElCtx, e0: ElCtx, r: Rect, kinds: string[], side0: string, count0: number, over0: number): SatPart[] {
  const k = e.k, over = Math.max(0, Math.min(1, over0)), out: SatPart[] = [];
  if (kinds.includes('button')) {
    const s = Math.max(14 * k, Math.min(30 * k, Math.min(r.w, r.h) * 0.42)), n = Math.max(1, Math.min(6, count0)), gp = 4 * k;
    const side = ['t', 'r', 'b', 'l', 'tl', 'tr', 'bl', 'br'].includes(side0) ? side0 : 'l';
    // 沿边排：t / b 横排、l / r 竖排（在这条边上居中）；角上：沿着那条横边从角往里排
    const horiz = side === 't' || side === 'b' || side.length === 2, span = n * s + (n - 1) * gp;
    const outX = (sgn: number) => sgn * s * (over - 0.5), outY = outX;
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      if (horiz) {
        x = side === 't' || side === 'b' ? r.x + r.w / 2 - span / 2 + i * (s + gp) : side.endsWith('l') ? r.x + i * (s + gp) + s * 0.1 : r.x + r.w - s - i * (s + gp) - s * 0.1;
        y = side.startsWith('t') ? r.y - s / 2 + outY(-1) : r.y + r.h - s / 2 + outY(1);
      } else {
        y = r.y + r.h / 2 - span / 2 + i * (s + gp);
        x = side === 'l' ? r.x - s / 2 + outX(-1) : r.x + r.w - s / 2 + outX(1);
      }
      out.push({ kind: 'button', rect: { x, y, w: s, h: s }, i });
    }
  }
  // 角上的小件：徽章最靠角，拨杆、小签依次往里（各自原来的内缩：徽章贴角、拨杆 / 小签离角 14）
  const corner = SAT_CORNERS.includes(side0) ? side0 : null, last = new Map<string, Rect>();
  for (const kind of ['badge', 'toggle', 'tab']) {
    if (!kinds.includes(kind)) continue;
    const c = corner ?? (kind === 'tab' ? 'tl' : 'tr'), right = c.endsWith('r'), bottom = c.startsWith('b');
    const w = kind === 'badge' ? 22 * k : kind === 'toggle' ? 58 * k : 28 * k, h = kind === 'badge' ? 22 * k : 20 * k;
    // 伸出边外的量：徽章 = 半径 × 出框量（再外移 2），拨杆 / 小签 = 1.1 × 高 × 出框量
    const dy = kind === 'badge' ? w * over * 0.5 + 2 * k : h * over * 1.1, y = bottom ? r.y + r.h - h + dy : r.y - dy;
    const prev = last.get(c);
    const x = prev ? (right ? prev.x - 4 * k - w : prev.x + prev.w + 4 * k)
      : kind === 'badge' ? (right ? r.x + r.w - w * (1 - over * 0.5) - 2 * k : r.x - w * over * 0.5 + 2 * k)
      : right ? r.x + r.w - 14 * k - w : r.x + 14 * k;
    const q = { x, y, w, h };
    last.set(c, q);
    out.push({ kind, rect: q, i: 0 });
  }
  if (kinds.includes('counters')) {
    // 计数小圆徽（M12b-17，frostpunk#4 的病号 / 伤员计数）：底边下方（给了顶边 t / tl / tr 时顶边上方）居中一排，个数 = elx.satelliteCount（1–4，没给 2）
    const n = Math.max(1, Math.min(4, count0)), h = 20 * k, w = 40 * k, gp = 6 * k, span = n * w + (n - 1) * gp, top = side0 === 't' || side0 === 'tl' || side0 === 'tr';
    for (let i = 0; i < n; i++) out.push({ kind: 'counters', rect: { x: r.x + r.w / 2 - span / 2 + i * (w + gp), y: top ? r.y - h * (0.5 + over) : r.y + r.h - h * 0.5 + h * over, w, h }, i });
  }
  if (kinds.includes('prompt')) {
    // 提示条：顶边上方（给了底边时底边下方）一条暗底细框条（按键 + 一句话），宽按字
    const [key, act] = DATA.pickPrompt, h = 22 * k, o = { ...e.small, weight: 700 as const }, kw = keyCapWidth(e0, h - 6 * k, key), tw = W(e, act, o);
    const w = kw + tw + 18 * k, dy = h + (1 - over) * 6 * k + h * over * 0.4, below = side0 === 'b' || side0 === 'bl' || side0 === 'br';
    const x = side0 === 'tl' || side0 === 'bl' ? r.x : side0 === 'tr' || side0 === 'br' ? r.x + r.w - w : r.x + r.w / 2 - w / 2;
    out.push({ kind: 'prompt', rect: { x, y: below ? r.y + r.h + dy - h : r.y - dy, w, h }, i: 0 });
  }
  return out;
}
/**
 * 骑边小件伸出元素框外多少（B6 审查修复 ⑳）：compose/hud.ts 把它算进元素的排位尺寸（四边留白），排位与避让就给伸出去的小件留了地方——
 * 原来小件只在所有元素排完以后才登记，压到旁边的元素、伸出画面。size = 元素自己的尺寸；返回四边的留白（设计单位）
 */
export function satelliteReach(e0: ElCtx, size: { w: number; h: number }, kinds: string[], side: string, count: number, over: number): { l: number; t: number; r: number; b: number } {
  const parts = satelliteLayout(e0.part('keyBadge'), e0, { x: 0, y: 0, w: size.w, h: size.h }, kinds, side, count, over);
  if (!parts.length) return { l: 0, t: 0, r: 0, b: 0 };
  return {
    l: Math.max(0, -Math.min(...parts.map((q) => q.rect.x))), t: Math.max(0, -Math.min(...parts.map((q) => q.rect.y))),
    r: Math.max(0, Math.max(...parts.map((q) => q.rect.x + q.rect.w)) - size.w), b: Math.max(0, Math.max(...parts.map((q) => q.rect.y + q.rect.h)) - size.h),
  };
}
/**
 * 骑边小件（M12b-05 ③，§2 的 elx.satellites）：画在元素外框边上、按 elx.satelliteOverhang（0–1，默认 0.5）伸出框外的小部件，画在元素之上——
 *   button = 一排小圆钮（elx.satelliteCount 颗，默认 2；位置 elx.satelliteSide：没给时左边，竖着排；t / b 横着排；角上挨着角排），
 *   badge = 一枚数字圆徽（右上）、tab = 一枚小签（左上，写元素名的首字）、toggle = 一只 ON 拨杆（右上）——给了角时挪到那个角；prompt = 顶边上方（给了底边时底边下方）一条提示条
 *   （按键 + 一句话，Civ6 的 CHOOSE RESEARCH）。safe = 安全区（B6 审查修复 ⑳：伸出安全区的那一件以元素框为轴翻到对边，还出去就夹进安全区）。
 * 底 = 部件 keyBadge 的面板底、描边 = 饰色（col.ornament）；返回画出的矩形（compose/hud.ts 登记占位）。Godot：宿主的子 Control，负 offset 出框（见迁移说明）
 */
export function satellites(e0: ElCtx, r: Rect, kinds: string[], side0: string, count0: number, over0: number, safe?: Rect): Rect[] {
  const e = e0.part('keyBadge'), g = e.g, k = e.k, c = ornColor(e), face = resolveColor(e.th.surface, e.pal), out: Rect[] = [];
  const box = (q: Rect, round: boolean) => drawBox(g, q, { bg: { solid: face }, border: { width: Math.max(1, 1.5 * k), color: c }, ...(round ? { radiusPct: 50 } : { radius: 3 * k }) }, e.pal);
  const inside = (q: Rect) => !safe || (q.x >= safe.x - 0.5 && q.y >= safe.y - 0.5 && q.x + q.w <= safe.x + safe.w + 0.5 && q.y + q.h <= safe.y + safe.h + 0.5);
  const fit = (q: Rect): Rect => {
    if (!safe || inside(q)) return q;
    // 以元素框为轴翻到对边（只翻伸出去的那一向），翻过去还出去就夹进安全区
    const fx = q.x < safe.x || q.x + q.w > safe.x + safe.w, fy = q.y < safe.y || q.y + q.h > safe.y + safe.h;
    const fl = { ...q, ...(fx ? { x: 2 * r.x + r.w - q.x - q.w } : {}), ...(fy ? { y: 2 * r.y + r.h - q.y - q.h } : {}) };
    if (inside(fl)) return fl;
    return { ...q, x: Math.max(safe.x, Math.min(safe.x + safe.w - q.w, q.x)), y: Math.max(safe.y, Math.min(safe.y + safe.h - q.h, q.y)) };
  };
  const tools = DATA.tools?.length ? DATA.tools.map(([ch]) => ch) : SAT_GLYPHS;
  for (const part of satelliteLayout(e, e0, r, kinds, side0, count0, over0)) {
    const q = fit(part.rect);
    switch (part.kind) {
      case 'button': box(q, true); icon(e, tools[part.i % tools.length], q.x + q.w / 2, q.y + q.h / 2, q.w * 0.5, c); break;
      case 'badge': {
        drawBox(g, q, { bg: { solid: e.accent }, radiusPct: 50, border: { width: Math.max(1, 1.5 * k), color: face } }, e.pal);
        // 数字走 B5 的数字字形（typ.numerals.*，B6 审查修复 ⑨：原来按正文字画）
        const t = String(DATA.charges?.[0] ?? 3), o = { ...onAccent(e, e.small), size: q.w * 0.55, weight: 800 };
        drawNumber(e, t, q.x + q.w / 2 - numberWidth(e, t, o) / 2, q.y, q.h, o);
        break;
      }
      case 'tab': {
        box(q, false);
        const sym = [...(e0.id.startsWith('el.selection') ? DATA.selection.initial : 'i')][0] ?? 'i', so: TextOpts = { ...e.small, size: q.h * 0.6, weight: 800, color: c };
        T(e, sym, q.x + q.w / 2 - W(e, sym, so) / 2, q.y, q.h, so);
        break;
      }
      case 'toggle': {
        box(q, false);
        const h = q.h, px = q.x + 6 * k, py = q.y + h * 0.28, pw = 18 * k, ph = h * 0.44;
        g.save(); g.fillStyle = withAlpha(c, 0.35); g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill();
        g.fillStyle = e.accent; g.beginPath(); g.arc(px + pw - ph / 2, py + ph / 2, ph * 0.42, 0, Math.PI * 2); g.fill(); g.restore();
        T(e, 'ON', px + pw + 5 * k, q.y, h, { ...e.small, size: h * 0.5, weight: 800, color: c });
        break;
      }
      case 'counters': {
        // 一枚圆徽（坏色 / 警告色轮换）+ 右边的数：样本 hud.satCounters（[符号, 数]），没写时 ✚ 3 / ◆ 1
        const list = DATA.satCounters ?? [['✚', 3], ['◆', 1]], [gl, n] = list[part.i % list.length], col = part.i % 2 ? e.warn : e.bad, d = q.h;
        drawBox(g, { x: q.x, y: q.y, w: d, h: d }, { bg: { solid: col }, radiusPct: 50, border: { width: Math.max(1, 1.5 * k), color: face } }, e.pal);
        icon(e, gl, q.x + d / 2, q.y + d / 2, d * 0.55, '#fff');
        const t = String(n), o = { ...e.small, size: d * 0.62, weight: 800, color: e.text };
        drawNumber(e, t, q.x + d + 4 * k, q.y, d, o);
        break;
      }
      case 'prompt': {
        const [key, act] = DATA.pickPrompt, h = q.h, o = { ...e.small, weight: 700 as const }, kw = keyCapWidth(e0, h - 6 * k, key);
        drawBox(g, q, { bg: { solid: withAlpha('#0b0d12', 0.82) }, border: { width: 1, color: c }, radius: 2 * k }, e.pal);
        keyCap(e0, q.x + 6 * k, q.y + 3 * k, h - 6 * k, key, DATA.pickPrompt[2]);
        T(e, act, q.x + 12 * k + kw, q.y, h, { ...o, color: '#fff' });
        break;
      }
    }
    out.push(q);
  }
  return out;
}

/**
 * 元素级的个数（M12b-04 / 18：el.threat.count Boss 条条数、el.party.count 人数、el.selection.count 卡数、el.turnOrder.count 头像数）：只认这个元素（实例）自己的键 <元素>.count，
 * 不吃全局的 elx.count（全局写的是技能栏 / 快捷栏的格数，不该让 Boss 条变成三条）；没给 = def，夹在 1–max
 */
export function ownCount(e: ElCtx, def: number, max: number): number {
  // 画法级键优先（B6 审查修复 ⑦：el.threat.targetRow.count 与 el.threat.bossBar.count 分开写；只写元素级 el.threat.count 时 Boss 条与目标切换行共用）；
  // 旧皮肤只认皮肤之后的层给的（与 elChosen 同口径）
  for (const k of [...(e.form ? [`${e.id}.${e.form}.count`] : []), ownKey(e, 'count')]) {
    const v = e.r.get(k), n = typeof v === 'number' ? v : Number(v);
    if (v === undefined || v === null || v === '' || v === 'auto' || v === 'inherit' || !Number.isFinite(n) || n <= 0) continue;
    if (e.th.legacy && !postSkinKey(e, k)) continue;
    return Math.min(max, Math.round(n));
  }
  return def;
}

/* ---------------- 上下文 ---------------- */

/** 元素选了哪些画法（el.<元素>.form，多选时按顺序；没给时元素的默认画法） */
export function formsOf(r: Resolved, id: string): string[] {
  const v = r.get(`${id}.form`) ?? r.el(id, 'form');
  const list = (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(String).filter((x) => x && x !== 'auto');
  const def = ELEMENTS.get(id);
  return list.length ? list : def ? [def.forms[0]] : [];
}

/** 元素的作用域目标链（B6 审查修复 ⑱）：实例 el.x#2 → [el.x#2, el.x]（按目标覆盖先看这一份、再看第一份），其余 [id] */
export const scopeChainOf = (id: string): string[] => (id.includes('#') ? [id, baseId(id)] : [id]);
/** form 给了 = 元素按画法拆开画时的这一种画法（M12a-14）：forms = [form]，缩放 / 优先级 / 数值标注先查画法级键 */
export function makeCtx(id: string, g: CanvasRenderingContext2D, tx: CanvasRenderingContext2D, th0: Theme, R: Rect, form?: string): ElCtx {
  const r = th0.r;
  // 元素自己的作用域键（<参数>@el.x）：主题按元素打补丁，没有时就是整屏主题（M12a-01）。
  // 元素实例（el.x#2，B6 审查修复 ⑱）的目标链 = [el.x#2, el.x]：第一份上写的样式（vis.* / ast.* / col.* / typ.* / cmp.* 的 @el.x）第二份跟着用，@el.x#2 再单独改；
  // 元素自己的参数（el.x#2.form / scale / count / 停靠……）照旧不继承第一份（resolve.ts 的 instanceDefault）
  const scope = scopeChainOf(id);
  const th = patchTheme(th0, r, scope);
  const el = (suffix: string) => r.el(id, suffix, form);
  const forms = form ? [form] : formsOf(r, id);
  const priority = String(el('priority') ?? 'secondary');
  const prioK = priority === 'primary' ? 1.15 : priority === 'ambient' ? 0.85 : 1;
  const scale = Number(el('scale') ?? 1);
  const k = th.scale * (Number.isFinite(scale) && scale > 0 ? scale : 1) * prioK;
  // 内容对齐（M12a-18）：这个子项的锚点所在列（没注册的 id，如贴边条的底板上下文，按左）
  const part = ELEMENTS.has(id) ? elementParts(r, id).find((p) => p.form === form) : undefined;
  const e: ElCtx = {
    id, g, tx, r, k, forms, form, ...themed(th, k),
    lineColors: lineTable(r, th),
    valueLabel: String(el('valueLabel') ?? 'none'),
    valueLabelPos: String(el('valueLabelPos') ?? 'end'),
    priority,
    align: part ? ANCHOR_ALIGN[part.anchor] ?? 'left' : 'left',
    // 显式给的挂点（M12a-15）：拆开画时按子项的口径（屏幕默认锚点的画法不吃元素级挂点）
    attach: part ? part.given : isAttach(el('attachTo')) ? (el('attachTo') as Attach) : undefined,
    R,
    scope, v: r.scope(scope), seq: { n: 0 },
    part: (...names) => partOf(e, names),
  };
  return e;
}

/** 上下文里跟主题走的部分（字样式与常用颜色）：makeCtx 与 e.part() 共用 */
function themed(th: Theme, k: number) {
  const t = th.tokens, pal = th.pal;
  const base0 = bodyOpts(t, pal);
  const base = { ...base0, size: base0.size * k };
  const title = { ...titleOpts(t, pal, base0, 'title') };
  title.size *= k;
  const name = { ...titleOpts(t, pal, base0, 'name') };
  name.size *= k;
  return {
    th, t, pal, base, title, name,
    small: { ...base, size: Math.max(9, base.size * 0.82) },
    big: { ...title, size: title.size * 1.8 },
    text: base.color,
    accent: resolveColor('@accent', pal), accent2: resolveColor('@accent2', pal),
    good: th.roles.good, warn: th.roles.warn, bad: th.roles.bad,
    heading: title.color, icon: th.roles.icon, muted: th.roles.muted, quest: th.roles.objective, focus: th.roles.focus,
    fill: (i: number, role: RoleName | string) => fillOf(th, i, role),
  };
}

/** e.fill() 的实现：作用域强调色优先（第 0 / 1 条），否则角色色；role 不是角色名时当颜色用 */
function fillOf(th: Theme, i: number, role: RoleName | string): string {
  const ro = th.roles;
  if (i === 0 && ro.accentAt) return resolveColor('@accent', th.pal);
  if (i === 1 && ro.accent2At) return resolveColor('@accent2', th.pal);
  return role in ro ? (ro[role as RoleName] as string) : role;
}

/**
 * 强调色底上的字（M12a-04）：字色默认 t.onAccent（按强调色亮度派生；旧皮肤没显式换强调色时是白字），按键底给 color = 按键字色。
 * 派生出来的是深色字（亮底）时去掉描边 / 投影 / 发光——亮底上的黑描边会把字糊成一团（与可读性检查同口径）
 */
export function onAccent(e: ElCtx, o: TextOpts, color = resolveColor(e.t.onAccent ?? '#fff', e.pal)): TextOpts {
  return e.t.onAccent && luminance(color) < 0.4 ? { ...o, color, outline: undefined, shadow: undefined, glow: undefined, glowColor: undefined } : { ...o, color };
}
/** 按键底上的字：按键字色（新皮肤 = onAccent），亮底去描边 */
export const onKey = (e: ElCtx, o: TextOpts) => onAccent(e, o, resolveColor(e.t.key.color ?? e.t.text, e.pal));

/** 次要字色（M12a-03）：col.muted 给了就用它；没给时按调用点原来的透明度淡化正文色（画面不变） */
export const mutedOf = (e: ElCtx, a: number) => (e.th.roles.mutedSet ? e.muted : withAlpha(e.text, a));

/** 按语义取色（M12a-02）：done / current / locked / short（节点三态与"不足"）、good / warn / bad，按色彩策略映射（见 sys/theme.ts 的 Roles） */
export const semantic = (e: ElCtx, kind: 'done' | 'current' | 'locked' | 'short' | 'good' | 'warn' | 'bad') => e.th.roles[kind];

const PARTS = new WeakMap<ElCtx, Map<string, ElCtx>>();
/**
 * e.part() 的实现：e 是元素自己的上下文。部件上下文以它为原型（R、noWorld 这类排版后才改的字段仍读元素的），
 * 换掉目标链、参数视图，主题有补丁时再换掉主题与字样式、颜色。
 */
function partOf(e: ElCtx, names: string[]): ElCtx {
  if (names.every((n) => !e.r.scopedParams(n).size)) return e;
  // 部件 > 元素（实例 > 第一份，B6 审查修复 ⑱）
  const chain = [...names, ...scopeChainOf(e.id)];
  const id = chain.join('|');
  let m = PARTS.get(e);
  if (!m) PARTS.set(e, (m = new Map()));
  const hit = m.get(id);
  if (hit) return hit;
  const th = patchTheme(e.th, e.r, chain);
  const p: ElCtx = Object.assign(Object.create(e) as ElCtx, th === e.th ? {} : themed(th, e.k), { scope: chain, v: e.r.scope(chain) });
  m.set(id, p);
  return p;
}

/**
 * 把上下文换到另一张画布上画（M12a-26：浮动详情在 UI 像素化时画在文字层上面）：g = to，取部件时部件也跟着换；同一张画布时原样返回
 */
export function onCanvas(e: ElCtx, to: CanvasRenderingContext2D): ElCtx {
  if (e.g === to) return e;
  return Object.assign(Object.create(e) as ElCtx, { g: to, part: (...names: string[]) => onCanvas(e.part(...names), to) });
}

/** 「选过没有」的判断只读解析结果、主题（旧皮肤）与目标链（B8 审查修复 ①：Godot 导出也按同一套判断算图的输入，传 { r, th, scope: ['el.screen'] }） */
export type ChoiceCtx = Pick<ElCtx, 'r' | 'th' | 'scope'>;
/** 组件参数（按目标链覆盖优先：部件 > 元素 > 全局） */
export const cmp = (e: ElCtx, param: string, def: string) => {
  const v = e.v.get(param);
  return v === undefined || v === null || v === 'auto' ? def : String(v);
};

/* ---------------- 位图素材（M11②，素材与画法见 ../uiAssets.ts） ---------------- */

/** 皮肤之后的层（与 theme.ts 给旧皮肤打补丁的口径一致） */
const POST_SKIN: Source['layer'][] = ['keyword', 'theme', 'screenOverride', 'accent', 'overlay', 'user', 'adapt', 'a11y'];
/**
 * 参数是不是"选过的"（不是默认 / 兜底 / 派生给的）。
 * 旧皮肤只认皮肤之后各层显式给的值（皮肤默认带进来的关键词、派生规则都不算），所以什么都不改时旧皮肤的对照图不变。
 */
export function chosen(e: ChoiceCtx, key: string): boolean {
  const s = e.r.src(key);
  if (!s) return false;
  if (e.th.legacy) return postSkinKey(e, key);
  return s.layer !== 'fallback' && s.layer !== 'default' && s.layer !== 'ruleDefault' && s.layer !== 'derived';
}
/** 皮肤之后的层显式给的（新旧皮肤一样）：皮肤预设自带的值不该触发的新画法用它判断（M12a-04） */
export function postSkinKey(e: ChoiceCtx, key: string): boolean {
  const s = e.r.src(key);
  return !!s && POST_SKIN.includes(s.layer) && !s.viaSkin && LAYER_RANK[s.layer] > LAYER_RANK.skin;
}
/** 组件参数实际生效的键：目标链上第一个存在的 <参数>@<目标>，否则全局（不看来源层；要「选过才换」的地方用 chosenKey） */
export const cmpKey = (e: ElCtx, param: string) => e.v.key(param);
/**
 * 目标链上第一个「选过」的键（审查修复 A · C11）：依次查 <k>@<目标>…、全局 k，取第一个存在且 chosen() 的；都没有时 null。
 * 与 theme.ts 的 admit（patchTheme）、platePick 同口径：旧皮肤上皮肤之前的层写的作用域键（品类布局的 vis.silhouette@el.abilities、cmp.gauge@el.*）不算，
 * 也不再挡住皮肤之后显式给的全局值（原来取第一个存在的作用域键再判断它选没选过）。「选过才换画法」的地方一律用它，值也从这个键读
 */
export function chosenKey(e: ChoiceCtx, k: string): string | null {
  for (const t of e.scope) { const s = `${k}@${t}`; if (e.r.has(s) && chosen(e, s)) return s; }
  return chosen(e, k) ? k : null;
}
/** 选过的值（chosenKey 那个键；auto / 空 = def）；没选过 def */
export const pickedStr = (e: ChoiceCtx, k: string, def: string): string => { const key = chosenKey(e, k); if (!key) return def; const v = e.r.str(key, def); return !v || v === 'auto' ? def : v; };
/** 这个参数在目标链上写了作用域键（<参数>@<部件 / 元素>）且算数（旧皮肤只认皮肤之后的层）：M12a-32 的「只在按目标写了才换」 */
export const scopedSet = (e: ElCtx, param: string) => !!chosenKey(e, param)?.includes('@');
/** 选过的作用域键的值（scopedSet 为真时那个键的值，否则 null） */
export const scopedStr = (e: ElCtx, param: string): string | null => { const k = chosenKey(e, param); return k?.includes('@') ? e.r.str(k, '') : null; };
/** 对白框部件（e.part('dialog')：@dialog → @元素）上写了底与边的作用域键：只有这时字幕底条 / 通知横幅才换成部件面板，否则原来写死的半透明黑（M12a-32，旧皮肤与 dialog token 不同的皮肤画面不变） */
const DIALOG_KEYS = ['col.surface', 'vis.opacity', 'vis.stroke', 'vis.strokeColor', 'vis.strokeWidth', 'vis.fill', 'col.gradient', 'vis.corner'];
export const dialogScoped = (ed: ElCtx) => DIALOG_KEYS.some((k) => scopedSet(ed, k));
/** 用图集素材（ast.iconSet = asset）时的图标集 id；旧皮肤要显式选过才算（派生规则给的不算）。画风按目标取（M12b-58：vis.iconStyle@el.toolbar = painted……） */
export function iconSet(e: ElCtx): string | null {
  const id = iconSetId(e.r, iconStyleOf(e));
  return id && (!e.th.legacy || chosen(e, 'ast.iconSet')) ? id : null;
}
/**
 * 图标画风（vis.iconStyle，M12b-58 起按目标生效）：目标链上选过的作用域键（vis.iconStyle@<部件 / 元素>）优先，否则整屏的（th.iconStyle：旧皮肤只认皮肤之后的层）
 */
export function iconStyleOf(e: ElCtx): string {
  const k = chosenKey(e, 'vis.iconStyle');
  return k?.includes('@') ? e.r.str(k, e.th.iconStyle) : e.th.iconStyle;
}
/**
 * 位图图标的着色（M12b-58，vis.iconTint / vis.iconTintAmount，按目标链读）：none / 没选 = 原图；auto = 皮肤之后的层给了 col.saturation（≠ 1）时按它的倍数调位图饱和度，否则原图；
 * desaturate / darken / mono（col.icon 色）/ accent（强调色）/ duotone（暗部第二强调色 → 亮部图标色）。旧皮肤只认皮肤之后的层。返回 null = 不着色
 */
export function iconTintOf(e: ElCtx): IconTint | null {
  const k = chosenKey(e, 'vis.iconTint'), mode = k ? e.r.str(k, 'auto') : 'auto';
  const ak = chosenKey(e, 'vis.iconTintAmount'), amount = ak ? Math.max(0, Math.min(1, e.r.num(ak, 1))) : 1;
  if (mode === 'none') return null;
  if (mode === 'auto') {
    const sat = e.r.num('col.saturation', 1);
    return sat !== 1 && postSkinKey(e, 'col.saturation') ? { mode: 'saturate', amount: Math.max(0, sat) } : null;
  }
  if (mode === 'desaturate' || mode === 'darken') return { mode, amount };
  if (mode === 'mono') return { mode: 'mono', amount, color: resolveColor(e.icon, e.pal) };
  if (mode === 'accent') return { mode: 'mono', amount, color: e.accent };
  if (mode === 'duotone') return { mode: 'duotone', amount, color: resolveColor(e.icon, e.pal), color2: e.accent2 };
  return null;
}

/**
 * 位图大比例缩小（256px 图集格 → 十几到几十 px 图标、半身像 → 头像）：临时打开平滑并用 high 质量（默认 low 在 Chromium 里不走 mipmap，线稿会闪成噪点），画完还原。
 * UI 像素化时盒子画在关了平滑的低分辨率画布上，同样先平滑缩小（像素感由放大那一步给）。
 */
function smoothDraw(g: CanvasRenderingContext2D, fn: () => boolean): boolean {
  const on = g.imageSmoothingEnabled, q = g.imageSmoothingQuality;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const ok = fn();
  g.imageSmoothingEnabled = on;
  g.imageSmoothingQuality = q;
  return ok;
}

/** 物品图集里的一项画进以 (cx, cy) 为中心、边长 side 的方块；锁定模式：去色 / 压暗 / 剪影 */
function atlasItem(e: ElCtx, nameOrGlyph: string, cx: number, cy: number, side: number, mode = ''): boolean {
  const id = nameOrGlyph ? iconSet(e) : null;
  const item = id ? itemName(nameOrGlyph) : null;
  if (!id || !item) return false;
  const r = { x: cx - side / 2, y: cy - side / 2, w: side, h: side };
  const filter = mode === 'grayscale' ? 'grayscale(1)' : mode === 'silhouette' ? 'brightness(0)' : '';
  const alpha = mode === 'grayscale' ? 0.6 : mode === 'dimmed' ? 0.4 : mode === 'silhouette' ? 0.85 : 1;
  const g = e.g;
  // 着色（M12b-58）：着色后的图集项（缓存）再按锁定模式去色 / 压暗
  const fx = iconTintOf(e);
  // 按角色像素化（M12b-56）：图集图标是 icons 这一层
  const draw0 = () => (fx ? drawAtlasItemFx(g, id, item, r, fx) : drawAtlasItem(g, id, item, r)), draw = PIXROLE.displayMin === Infinity ? draw0 : () => withPixRole('box', 'icons', draw0);
  if (!filter && alpha === 1) return smoothDraw(g, draw);
  g.save();
  if (filter) g.filter = filter;
  g.globalAlpha *= alpha;
  const ok = smoothDraw(g, draw);
  g.restore();
  return ok;
}

/**
 * 程序图标的画风（M12b-58，vis.iconStyle 新取值，选过才换）：etched = 刻线（同色字形下压一道暗线、上提一道亮线，像蚀刻在面板上）；
 * singleChar = 写物品名的第一个字（没有名字时照旧符号）；symbol = 字体里的单字形（就是原来的符号）。其余画风与没图集时照旧 icon()
 */
export function glyphIcon(e: ElCtx, ch: string, name: string | undefined, cx: number, cy: number, size: number, color = e.icon) {
  const st = chosenKey(e, 'vis.iconStyle') ? iconStyleOf(e) : '';
  if (st === 'singleChar' && name) { const o = { ...e.title, size: size * 0.85, color, weight: 800 }, c1 = [...name][0]; T(e, c1, cx - W(e, c1, o) / 2, cy - o.size * 0.75, o.size * 1.5, o); return; }
  if (st === 'etched' || st === 'woodcut') {
    // woodcut（M12b-63，K1 版画）：比蚀刻更重的刀刻——暗线压得更深、偏移更大（专门的木刻图集 → M12c-A4）
    const d = Math.max(1, size * (st === 'woodcut' ? 0.1 : 0.06));
    icon(e, ch, cx + d, cy + d, size, withAlpha('#000', st === 'woodcut' ? 0.75 : 0.55));
    icon(e, ch, cx - d * 0.6, cy - d * 0.6, size, withAlpha('#fff', 0.35));
  }
  // nato（M12b-63，K1 军事战术）：北约兵种框——符号外套一个横长方框；alchemy（神秘学）：符号外套圆 + 内接三角（专门的图集 → M12c-A4）
  if (st === 'nato' || st === 'alchemy') {
    const g = e.g, k = size * 0.62;
    g.save(); g.strokeStyle = color; g.lineWidth = Math.max(1, size * 0.07); g.beginPath();
    if (st === 'nato') g.rect(cx - k * 1.25, cy - k * 0.8, k * 2.5, k * 1.6);
    else { g.arc(cx, cy, k * 1.15, 0, Math.PI * 2); g.moveTo(cx, cy - k * 1.1); g.lineTo(cx + k * 0.95, cy + k * 0.55); g.lineTo(cx - k * 0.95, cy + k * 0.55); g.closePath(); }
    g.stroke(); g.restore();
    icon(e, ch, cx, cy, size * 0.7, color);
    return;
  }
  // 物品名对得上物品图标时，符号画成那样东西（审查修复 E 视觉 ⑦⑧：◆ 木材 → 原木；icons/draw.ts 的 ICON_CTX）
  const i0 = ICON_CTX.item;
  if (name && QUALITY.on) ICON_CTX.item = name;
  ICON_CTX.items++;
  try { icon(e, ch, cx, cy, size, color); } finally { ICON_CTX.item = i0; ICON_CTX.items--; }
}

/** 在「这一项是名叫 name 的东西」的上下文里画（审查修复 E 视觉 ⑦⑧⑬：工具栏 / 建造栏 / 格子的符号按名字换成物品 / 建筑图标；icons/draw.ts 的 ICON_CTX） */
export function asItem<T>(name: string | undefined | null, f: () => T): T {
  if (!QUALITY.on || !name) return f();
  const i0 = ICON_CTX.item;
  ICON_CTX.item = name;
  ICON_CTX.items++;
  try { return f(); } finally { ICON_CTX.item = i0; ICON_CTX.items--; }
}
/** 物品图标：图集素材开着、nameOrGlyph 是物品（中文名或样本符号）时画图集图标（size 与 icon() 的字号同义），返回 false = 没画，调用方照旧 icon() */
export function itemIcon(e: ElCtx, nameOrGlyph: string, cx: number, cy: number, size: number): boolean {
  return atlasItem(e, nameOrGlyph, cx, cy, size * 1.15);
}

/* ---------------- 组件画法 ---------------- */

/**
 * 展示字体用不用（M12b-55，§2 的 displayFor）：typ.display.scope 显式列了这个角色（menuItem 菜单词 / 列表行标题、numerals 大号读数、button 按钮、title、nameplate）时
 * 返回展示字体的 face（字族、字重、勒索信、大小写、字距、斜体），否则空——调用方 { ...字样, ...displayFor(e, 角色) }。没给 typ.display.scope 时一律空（原来的）
 */
export const displayFor = (e: ElCtx, role: 'title' | 'nameplate' | 'menuItem' | 'numerals' | 'button'): Partial<TextOpts> => {
  const d = e.t.display;
  return d && d.scope.includes(role) ? (d.face as Partial<TextOpts>) : {};
};
export const T = (e: ElCtx, s: string, x: number, y: number, lh: number, o: Partial<TextOpts> = {}) => drawText(e.tx, s, x, y, lh, { ...e.base, ...o });
export const W = (e: ElCtx, s: string, o: Partial<TextOpts> = {}) => measure(e.tx, s, { ...e.base, ...o });

/* ---------------- 数字字形（M12b-07，§2 的 drawNumber）：资源 / 计时 / 时钟 / 名次 / 数值图形的数字都经它 ---------------- */

/** 逐字排的数字字族（每位一个固定宽的格，或按字号缩放 / 矢量画）：没有这些、也没有内凹格时只换字面，整串照常画 */
const RUN_NUMERALS = new Set(['tabular', 'odometer', 'oldstyle', 'sevenSeg', 'dotMatrix', 'singleStroke']);
/** 旧式数字（oldstyle）的画布近似：0 1 2 是小写高度、3 4 5 7 9 下伸、6 8 上伸（[字号倍数, 下移（字号的倍数）]）；真的 onum 字形要把 OpenType 特性冻结进子集（fonttools，要下载，见进度记录） */
const OLDSTYLE: Record<string, [number, number]> = { '0': [0.74, 0.09], '1': [0.74, 0.09], '2': [0.74, 0.09], '3': [1, 0.17], '4': [1, 0.17], '5': [1, 0.17], '7': [1, 0.17], '9': [1, 0.17], '6': [1, 0], '8': [1, 0] };
interface NumGlyph { ch: string; x: number; w: number; dim?: boolean; text?: boolean }
/** 数字字形的字样：元素给的字样 + 数字字面（字族 / 字重 / 斜体）；没有 t.numerals 时原样 */
function numeralOpts(e: ElCtx, o: Partial<TextOpts>): TextOpts {
  const n = e.t.numerals, oo: TextOpts = { ...e.base, ...o };
  if (!n) return oo;
  return { ...oo, ...(n.font ? { font: n.font } : {}), ...(n.weight ? { weight: n.weight } : {}), ...(n.italic !== undefined ? { italic: n.italic } : {}) };
}
/** 固定位数（typ.numerals.digits）：纯整数（可带千分位）补前导零到 digits 位（里程表去掉千分位），返回补了几个零 */
function numeralText(n: NonNullable<SkinTokens['numerals']>, s: string): { text: string; lead: number } {
  const want = n.digits ?? (n.family === 'odometer' ? 6 : 0);
  if (!/^[\d,]+$/.test(s)) return { text: s, lead: 0 };
  // 里程表 / 逐位格不写千分位（每位一格）；要补前导零时也去掉千分位（B5 审查修复 ⑦：原来等宽 / 展示 / 正文字族补成「0012,480」）
  const plain = s.replace(/,/g, ''), raw = n.family === 'odometer' || n.cells ? plain : s, digits = plain.length;
  if (!want || digits >= want) return { text: raw, lead: 0 };
  return { text: '0'.repeat(want - digits) + plain, lead: want - digits };
}
/**
 * 数字的逐字排版（drawNumber / numberWidth 共用）：每个字的 x 与宽；数字字族不认识的字（字母、汉字、符号）连成一段按字体量。
 * tabular / odometer / 内凹格 = 每位数字一样宽（字体里「0」的宽，格子再加 0.18 字号的边）；旧式 = 按缩放后的字宽；矢量 = vectorAdvance
 */
function numeralLayout(e: ElCtx, s: string, o: TextOpts): { glyphs: NumGlyph[]; w: number; size: number; cellW: number } {
  const n = e.t.numerals!, fam = n.family ?? '', size = o.fixedSize ? o.size : o.size * TEXT_K.k, cells = !!n.cells;
  const vec = VECTOR_NUMERALS.has(fam), fixed = fam === 'tabular' || fam === 'odometer' || cells;
  const zero = vec ? vectorAdvance('0', size, fam)! : measure(e.tx, '0', o), cellW = cells ? zero + size * 0.18 : zero, gap = cells ? size * 0.08 : 0;
  const glyphs: NumGlyph[] = [];
  let x = 0, run = '';
  const flush = () => { if (!run) return; const w = measure(e.tx, run, o); glyphs.push({ ch: run, x, w, text: true }); x += w; run = ''; };
  for (const ch of s) {
    const digit = ch >= '0' && ch <= '9';
    const vw = vec ? vectorAdvance(ch, size, fam) : null;
    if (vec && vw !== null) { flush(); const w = digit && cells ? cellW : vw; glyphs.push({ ch, x, w }); x += w + (digit && cells ? gap : 0); continue; }
    if (!vec && digit && (fixed || fam === 'oldstyle')) {
      flush();
      const w = fixed ? cellW : measure(e.tx, ch, { ...o, size: o.size * (OLDSTYLE[ch]?.[0] ?? 1) });
      glyphs.push({ ch, x, w }); x += w + gap; continue;
    }
    run += ch;
  }
  flush();
  return { glyphs, w: Math.max(0, x - (cells && glyphs.length && !glyphs[glyphs.length - 1].text ? gap : 0)), size, cellW };
}
/**
 * 画一串数字（M12b-07，§2：之后所有数字经它，不再直接 T()）：s = 已格式化的字（fmtNumber），x / y / lh 与 T() 一样（行顶、行高），o = 元素给的字样。
 * typ.numerals.*（t.numerals）都没给时 = T(e, s, …, o)，画面与调用序列都和原来一样。给了时：字面（display 标题字 / pixel 像素字 / 字重 / 斜体）、
 * 等宽格（tabular）、里程表（odometer：补前导零到 typ.numerals.digits 位、前导零 col.muted 35%）、旧式数字（oldstyle 的画布近似）、七段 / 点阵 / 单线笔画（矢量画，熄灭段淡显）、
 * 每位一个内凹格（typ.numerals.cells = inset，wellBox）。返回宽。Godot：见 export/godotHud.ts 的 m12bB5Notes「数字字形」行
 */
export function drawNumber(e: ElCtx, s: string, x: number, y: number, lh: number, o: Partial<TextOpts> = {}): number {
  // 结算计数（M12c-14，chk.demo = resultsTally / scoringSequence）：sim.tally < 1 时字里的数按进度从 0 数上去，画面越靠下的越晚开始（逐项）；没有计数事件时 tally = 1（原来的）
  const tl = simNow().tally;
  if (tl < 1) {
    const F = ORN.frame, yr = F && F.h > 0 ? Math.max(0, Math.min(1, (y - F.y) / F.h)) : 0, s1 = tallyText(s, Math.max(0, Math.min(1, tl * 1.6 - yr * 0.6)));
    // 数到一半的字按最终那串的右沿对齐（B10 审查修复 ㉓：调用方按最终字宽排位——右对齐的统计列原来数的时候左沿对齐、右沿参差，到点才跳齐）
    if (s1 !== s) { x += numberWidth(e, s, o) - numberWidth(e, s1, o); s = s1; }
  }
  // 按角色像素化（M12b-56）：数字是 numerals 这一层
  return PIXROLE.displayMin === Infinity ? drawNumber0(e, s, x, y, lh, o) : withPixRole('text', 'numerals', () => drawNumber0(e, s, x, y, lh, o));
}
/**
 * 计数中的字（M12c-14）：字里每个数（可带千分位逗号、小数）换成 目标 × p，小数位与千分位格式不变；带前导零的、冒号两边的（时间「02:15」）补零到原来的位数
 * （B10 审查修复 ㉓：原来数到一半成了「1:8」）
 */
export function tallyText(s: string, p: number): string {
  if (p >= 1) return s;
  return s.replace(/\d[\d,]*(?:\.\d+)?/g, (m, off: number, all: string) => {
    const comma = m.includes(','), dec = (m.split('.')[1] ?? '').length, v = Number(m.replace(/,/g, '')) * p;
    const t = v.toFixed(dec);
    if (comma) return Number(t).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const int0 = m.split('.')[0], timeish = all[off - 1] === ':' || all[off + m.length] === ':';
    return int0.length > 1 && (int0.startsWith('0') || timeish) ? t.padStart(t.length + Math.max(0, int0.length - t.split('.')[0].length), '0') : t;
  });
}
function drawNumber0(e: ElCtx, s: string, x: number, y: number, lh: number, o: Partial<TextOpts> = {}): number {
  const n = e.t.numerals;
  if (!n) return T(e, s, x, y, lh, o);
  const oo = numeralOpts(e, o), { text, lead } = numeralText(n, s), fam = n.family ?? '';
  if (!RUN_NUMERALS.has(fam) && !n.cells) return drawText(e.tx, text, x, y, lh, oo);
  const L = numeralLayout(e, text, oo), ty = y + lh / 2, vec = VECTOR_NUMERALS.has(fam);
  const dim = withAlpha(e.th.roles.mutedSet ? e.muted : resolveColor(oo.color, e.pal), 0.35);
  const col = resolveColor(oo.color, e.pal), unlit = vec && fam !== 'singleStroke' ? withAlpha(col, 0.12) : null;
  const ol = oo.outline ? { color: resolveColor(oo.outline.color, e.pal), width: Math.max(1, oo.outline.widthEm ? L.size * oo.outline.widthEm : oo.outline.width) } : undefined;
  let digitI = 0;
  for (const q of L.glyphs) {
    if (q.text) { drawText(e.tx, q.ch, x + q.x, y, lh, oo); continue; }
    const isDigit = q.ch >= '0' && q.ch <= '9', lit = isDigit && digitI++ < lead ? dim : col;
    // 内凹格（typ.numerals.cells = inset）：每位数字垫一格凹槽（B3 的 tokens.well），格高 1.2 字号
    if (n.cells && isDigit) wellBox(e, { x: x + q.x, y: ty - L.size * 0.6, w: L.cellW, h: L.size * 1.2 });
    if (vec) { vectorGlyph(e.tx, q.ch, x + q.x + (q.w - (vectorAdvance(q.ch, L.size, fam) ?? q.w)) / 2, ty, L.size, fam, lit, unlit, n.thick ?? 1, ol); continue; }
    const [k, dy] = fam === 'oldstyle' ? OLDSTYLE[q.ch] ?? [1, 0] : [1, 0];
    const go = { ...oo, color: lit, ...(k !== 1 ? { size: oo.size * k } : {}) };
    const gw = measure(e.tx, q.ch, go);
    drawText(e.tx, q.ch, x + q.x + (q.w - gw) / 2, y + dy * L.size, lh, go);
  }
  if (vec) logText(e.tx, text, x, y, L.w, lh, { ...oo, size: L.size / (oo.fixedSize ? 1 : TEXT_K.k) });
  return L.w;
}
/** drawNumber 会画多宽（不画；没有 t.numerals 时 = W()）：按数字字形量宽的盒子（资源栏、计时、名次）用它 */
export function numberWidth(e: ElCtx, s: string, o: Partial<TextOpts> = {}): number {
  const n = e.t.numerals;
  if (!n) return W(e, s, o);
  const oo = numeralOpts(e, o), { text } = numeralText(n, s);
  if (!RUN_NUMERALS.has(n.family ?? '') && !n.cells) return measure(e.tx, text, oo);
  return numeralLayout(e, text, oo).w;
}
/**
 * 数字格式（typ.numberFormat，M12b-07，doc16 G-number-format）：v = 数值，def = 这个位置原来写的字（没选格式时原样返回）。
 * grouped = 千分位（12,480）、plain = 不分组（12480）、western = 一万起 K / M / B（12.5K）、cn10k = 一万起 万 / 亿（1.2万）
 */
export function fmtNumber(e: ElCtx, v: number, def = v.toLocaleString('en')): string {
  const f = e.t.numerals?.format;
  if (!f || !Number.isFinite(v)) return def;
  const a = Math.abs(v), sign = v < 0 ? '-' : '', one = (x: number) => (Math.round(x * 10) / 10).toString();
  if (f === 'plain') return String(Math.round(v));
  if (f === 'western') return a >= 1e9 ? `${sign}${one(a / 1e9)}B` : a >= 1e6 ? `${sign}${one(a / 1e6)}M` : a >= 1e4 ? `${sign}${one(a / 1e3)}K` : Math.round(v).toLocaleString('en');
  // 亿写成转义（一万万以上才用到，样本里没有：不进字体子集）
  if (f === 'cn10k') return a >= 1e8 ? `${sign}${one(a / 1e8)}\u4ebf` : a >= 1e4 ? `${sign}${one(a / 1e4)}万` : String(Math.round(v));
  return Math.round(v).toLocaleString('en');
}
/** 按键提示（M10）：键盘键帽 / 括号沿用皮肤按键样式；手柄、触屏、文字按 ix.glyphs 画（pad = 包里给这个提示指定的手柄按钮）。返回宽度 */
/**
 * 格子角标小牌的样式（审查修复 ⑨，§8 RC6「皮肤内一致」）：key = 键位，取皮肤的键帽 token（底色、字色、转角、描边；浅色皮肤不再是近黑牌）；
 * qty = 数量，底 = 皮肤字色、字 = 面板底色（与键位牌同一套转角）。底不够实的抬到 0.92，字对底至少 4.5 : 1
 */
export function slotChip(e: ElCtx, kind: 'key' | 'qty'): { color: string; brackets: boolean; box: (h: number) => BoxStyle } {
  const k = e.t.key, face = resolveColor(e.th.surface, e.pal, '#20232a');
  const solidOf = (c: string) => { const [r0, g0, b0, a0] = parseColor(c); return rgba([r0, g0, b0, Math.max(a0, 0.92)]); };
  const kb = k.bg && 'solid' in k.bg ? resolveColor(k.bg.solid, e.pal, '') : '';
  const bg = kind === 'key' && kb && parseColor(kb)[3] > 0.2 ? solidOf(kb) : solidOf(resolveColor(e.text, e.pal, '#111'));
  const fg0 = kind === 'key' ? resolveColor(k.color ?? (kb ? e.text : face), e.pal, '#fff') : face;
  const color = ensureContrast(solidOf(fg0), bg, 4.5);
  const border = k.border && kind === 'key' ? { width: 1, color: resolveColor(k.border.color, e.pal, 'rgba(0,0,0,0.3)') } : { width: 1, color: withAlpha(color, 0.3) };
  const box = (h: number): BoxStyle => ({ bg: { solid: bg }, border, ...(k.step ? { step: 2 } : k.radiusPct !== undefined ? { radiusPct: Math.min(50, k.radiusPct) } : { radius: Math.min(4 * e.k, h / 3) }) });
  return { color, brackets: !!k.brackets, box };
}
export function keyCap(e0: ElCtx, x: number, y: number, h: number, key: string, pad?: PadButton): number {
  const e = e0.part('key');
  const set = glyphSetOf(e.r.str('ix.glyphs', 'keycap'));
  // 鼠标字形集（M12b-59）里没有对应鼠标键的提示照旧画键帽（逐条混用：饥荒「鼠标图标: 动作」与 [Tab] 同一行）
  if (set === 'keycap' || set === 'brackets' || (set === 'mouse' && !mouseButtonOf(key, pad))) {
    const label = set === 'brackets' ? `[${key}]` : key;
    // 键帽宽按 button() 实际用的字量（M12a-35：按钮字族角色 typ.button.family 也作用在键帽上）
    const w = Math.max(h, W(e, label, buttonText(e, h, true)) + h * 0.45);
    button(e0, { x, y, w, h }, label, true, false, 'key');
    return w;
  }
  return drawGlyph(e.g, e.tx, { x, y, w: h, h }, key, set, { ...e.base, weight: 700 }, e.t.key, e.pal, pad, glyphTintOf(e) ?? undefined);
}
/**
 * 按键字形的着色（ix.glyphTint，M12b-59，§2）：mono / text 选过时（旧皮肤只认皮肤之后的层）返回字色与面板底色，否则 null（brand = 原来的品牌色面键）。
 * Godot：字形图集导出成白色、按 modulate 着色；mono = 圆角 StyleBoxFlat（只有边）里放 Label
 */
export function glyphTintOf(e: ElCtx): GlyphTint | null {
  const v = pickedStr(e, 'ix.glyphTint', 'brand');
  return v === 'mono' || v === 'text' ? { mode: v, text: resolveColor(e.text, e.pal), face: resolveColor(e.th.surface, e.pal) } : null;
}
/** 光标集（ix.cursorSet，M12b-59）：选过时返回画法（旧皮肤只认皮肤之后的层），没选 null（调用方画原来的箭头 / 三角） */
export function cursorSetOf(e: ElCtx): CursorKind | null {
  const v = pickedStr(e, 'ix.cursorSet', 'auto');
  return (CURSOR_KINDS as readonly string[]).includes(v) ? (v as CursorKind) : null;
}
/** 光标的颜色：填色 = 焦点色（col.focus 选过）否则白，描边深色，上下文小图标底 = 强调色；vis.pixelScale 开着时像素对齐 */
export const cursorInk = (e: ElCtx, fill = '#ffffff'): CursorInk => ({ fill, ink: 'rgba(16,18,22,0.85)', accent: e.accent, pixel: (e.th.pixel ?? 1) > 1 });
/** 光标上下文（ix.cursorContext 开着时按挂点 / 动作字取，否则 undefined） */
export const cursorCtxOf = (e: ElCtx, attach: string, action: string): CursorContext | undefined => (pickedStr(e, 'ix.cursorContext', 'false') === 'true' ? cursorContextOf(attach, action) : undefined);
/** keyCap 会画多宽（M12a-34，不画）：键帽 = 按钮字的宽 + 0.45 高（至少一个高），手柄 / 触屏 / 文字图标按 glyphs.ts 的 glyphWidth */
export function keyCapWidth(e0: ElCtx, h: number, key: string, pad?: PadButton): number {
  const e = e0.part('key');
  const set = glyphSetOf(e.r.str('ix.glyphs', 'keycap'));
  if (set === 'keycap' || set === 'brackets' || (set === 'mouse' && !mouseButtonOf(key, pad))) return Math.max(h, W(e, set === 'brackets' ? `[${key}]` : key, buttonText(e, h, true)) + h * 0.45);
  return glyphWidth(e.tx, h, key, set, { ...e.base, weight: 700 }, pad);
}
/** 触屏时可点控件的最短边下限（ix.touchSize，px@1080p → 设计单位，M12a-05），不是触屏为 0（M8b） */
export const tap = (e: ElCtx) => px1080(tapMin(e.r));
/**
 * 按内容排的东西在矩形里的起点 x（M12a-18）：w = 内容宽，按 e.align 贴左 / 居中 / 贴右（原来一律按 a.x 或 a.x + a.w 写死起点：
 * 资源行锚在左上时离左边一截、评级字母锚在右上时离右上角一截）
 */
export const alignX = (e: ElCtx, a: Rect, w: number) => (e.align === 'right' ? a.x + a.w - w : e.align === 'center' ? a.x + (a.w - w) / 2 : a.x);
/** 内容宽 w 的子矩形（按 e.align 放在 a 里；a 不比 w 宽时就是 a） */
export const alignedRect = (e: ElCtx, a: Rect, w: number): Rect => (a.w <= w + 0.5 ? a : { ...a, x: alignX(e, a, w), w });
/** 一行字实际占的高度（含文字缩放 a11y.textScale 的绘制层倍数）：按字排版的行距用它，不用写死的 S(…)（M8b） */
// 审查修复（E 视觉 ①）：行高按画出来的字号（文字缩放 + 品质下限，drawnSize）算——原来按没抬的字号，被下限抬大的小字换行时两行叠在一起
export const LH = (e: ElCtx, o: Partial<TextOpts> = {}, k = 1.45) => drawnSize(e.tx, { size: o.size ?? e.base.size, fixedSize: o.fixedSize, font: o.font ?? e.base.font }) * k;
/** 至少 min、并且装得下这些字（+ pad）的宽度：翻译变长 / 字放大时盒子跟着变宽（M8b） */
export const fitW = (e: ElCtx, min: number, parts: [string, Partial<TextOpts>?][], pad = 0) => Math.max(min, ...parts.map(([s, o]) => W(e, s, o ?? {}) + pad));

/**
 * 面板：皮肤面板样式；small = 去掉装饰、阴影与特效（小控件）。元素的面板查 @panel；部件里的面板就是这个部件本身（不再查 @panel）。
 * box = 用哪块角色盒子（M12a-03）：浮动详情 / 悬浮提示用 tooltip、卡面用 card、标题带用 titleBar——默认都是面板的副本
 */
export function panel(e0: ElCtx, r: Rect, small = false, over: Partial<BoxStyle> = {}, box: 'panel' | 'tooltip' | 'card' | 'titleBar' | 'control' = 'panel') {
  const e = e0.scope.length > 1 ? e0 : e0.part('panel');
  const p = (box === 'panel' ? undefined : e.t[box]) ?? e.t.panel;
  // 旋转与斜切（M12a-06）：盒子按 vis.skew 斜切（整块元素已经连字一起斜过时 drawBox 不再斜）、按抖动角 / 调用方给的角度 + vis.tilt 的随手倾角转（只转盒子）；
  // 旧皮肤要皮肤之后显式选了 vis.skew / vis.jitter / vis.tilt 才这样画，否则和原来一样正放（th.boxSkew / boxTurn）
  // 整块倾斜里（vis.tiltLayers ≠ box，M12b-40）：盒子的倾角换成整块给定的那一份（TILT.delta：连内容一起转时 0、只转内容时反向抵消），序号照样往下数
  const tk = tiltOf(e, `${e.id}#${e.seq.n++}`), turn = e.th.boxTurn ? (over.rotate ?? p.rotate ?? 0) + (TILT.delta ?? tk) : 0;
  const xf = { rotate: turn, skewX: e.th.boxSkew };
  const st: BoxStyle = small ? { ...p, shadows: [], ornament: undefined, fx: undefined, frame: undefined, ...over, ...xf } : { ...p, ...over, ...xf };
  // 随机外形（randomQuad / shard / brushStroke，M12b-39）的种子 = 盒子种子 + 元素 id（同一屏不同元素的碎片各不相同，帧间稳定）
  if (st.shape === 'randomQuad' || st.shape === 'shard' || st.shape === 'brushStroke') st.seed = ((st.seed ?? 13) ^ idHash(e.id)) >>> 0;
  drawBox(e.g, r, st, e.pal);
}
/** 元素 id 的哈希（FNV-1a） */
const idHash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/**
 * 凹槽（M12b-36，§2 的 wellBox）：装格子 / 列表的内凹槽（tokens.well：比面板深一档的底 + 上左暗下右亮的内凹线，vis.depth@well 换立体）。
 * lay.grouping = wells 的集合底；B5 · 07 的逐位格、B7 · 10 的搁架、B8 · 11 的格组都调它。Godot：带内边框的 StyleBoxFlat 第二层（HudWell 类型变体）
 */
export function wellBox(e: ElCtx, r: Rect) {
  const w = e.t.well;
  if (w) drawBox(e.g, r, w, e.pal);
}

/**
 * 随手摆放倾角（vis.tilt，M12a-06）：每块盒子按 key（元素 id + 序号 / 条目序号）取 ±vis.tilt 以内的确定角度，同一配方每次一样；
 * 只转盒子，字不跟着转。旧皮肤要皮肤之后显式选了才有
 */
export function tiltOf(e: ElCtx, key: string): number {
  const t = e.v.num('vis.tilt', 0);
  if (!t || !e.th.boxTurn) return 0;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const u = ((h >>> 0) / 4294967295) * 2 - 1;
  // 倾斜方式（vis.tiltMode，M12b-40，K1 G-per-element-random）：random = ±vis.tilt 以内逐块随机（原来的）；uniform = 每块都转 vis.tilt；alternate = 每块转满 ±vis.tilt、方向按种子
  const mode = pickedStr(e, 'vis.tiltMode', 'random');
  return mode === 'uniform' ? t : mode === 'alternate' ? (u < 0 ? -t : t) : u * t;
}

/**
 * 倾斜作用在哪一层（vis.tiltLayers，M12b-40，persona5#0 / #33、K1 构成主义的「装饰层与文字层分开斜」）：box = 只转盒子（原来的）；boxAndContent = 盒子连里面的字 / 格子 / 插画整块一起转；
 * textOnly = 只转内容、盒子正放；split = 盒子与内容反着斜（内容 −0.6 倍）。整块转的时候里面的盒子不再各自随机转（TILT.delta）。旧皮肤只认皮肤之后的层（pickedStr）
 */
export const tiltLayersOf = (e: ElCtx) => pickedStr(e, 'vis.tiltLayers', 'box');
/** 整块倾斜进行中时，里面的盒子用这个倾角（度；null = 不在整块倾斜里，盒子照 tiltOf 各自转） */
export const TILT: { delta: number | null } = { delta: null };
/** 整块倾斜的两个角：盒子（box）与内容（content）；θ = 这块的倾角 */
export function tiltSplit(mode: string, th: number): { box: number; content: number } {
  if (mode === 'textOnly') return { box: 0, content: th };
  if (mode === 'split') return { box: th, content: -0.6 * th };
  return { box: th, content: th };
}
/**
 * 整块倾斜（M12b-40）：vis.tiltLayers ≠ box 时把 draw 里画的东西（两张画布）绕 r 的中心转内容角，里面的盒子按 TILT.delta = 盒子角 − 内容角 转（抵消或叠加）；
 * 已经在一块整块倾斜里（模板容器转了）时不再套；box / 没有倾角时直接画
 */
export function withTilt(e: ElCtx, r: Rect, key: string, draw: () => void) {
  const mode = TILT.delta === null ? tiltLayersOf(e) : 'box', th = mode === 'box' ? 0 : tiltOf(e, key);
  if (!th) { draw(); return; }
  const { box, content } = tiltSplit(mode, th), cs = [...new Set([e.g, e.tx])], cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (const c of cs) { c.save(); c.translate(cx, cy); c.rotate((content * Math.PI) / 180); c.translate(-cx, -cy); }
  TILT.delta = box - content;
  try { draw(); } finally { TILT.delta = null; for (const c of cs) c.restore(); }
}

/**
 * 整块倾斜实际画到的外接框（终期审查修复 ㉜，与 withTilt 同一套判断）：r 绕中心转过内容角（split 时盒子另转盒子角）以后的轴对齐外接框；
 * 不整块倾斜（box / 没有倾角 / 已经在整块倾斜的容器里）时就是 r。compose/hud.ts 按它登记占位与命中框
 */
export function tiltExtent(e: ElCtx, r: Rect, key: string): Rect {
  const mode = TILT.delta === null ? tiltLayersOf(e) : 'box', th = mode === 'box' ? 0 : tiltOf(e, key);
  if (!th) return r;
  const { box, content } = tiltSplit(mode, th), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  let hw = r.w / 2, hh = r.h / 2;
  for (const a of [box, content]) {
    if (!a) continue;
    const c = Math.abs(Math.cos((a * Math.PI) / 180)), s = Math.abs(Math.sin((a * Math.PI) / 180));
    hw = Math.max(hw, (r.w * c + r.h * s) / 2); hh = Math.max(hh, (r.w * s + r.h * c) / 2);
  }
  return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 };
}
/** 画在几个点上的世界元素的第 i 块：加上 compose/hud.ts 给的附加平移（ElCtx.ptShift，终期审查修复 ㉖；没有时原样） */
export const ptShiftAt = (e: ElCtx, i: number, p: { x: number; y: number }): { x: number; y: number } => { const s = e.ptShift?.[i]; return s ? { x: p.x + s[0], y: p.y + s[1] } : p; };

/** 符号图标：默认用图标色（M12a-03 的 col.icon；auto = 强调色，与原来一样） */
export function icon(e: ElCtx, ch: string, cx: number, cy: number, size: number, color = e.icon, extra?: Partial<TextOpts>) {
  // 压在盒子上的符号图标（§8 RC4，轨道 E）：与盒子底色对比 < 3 时把图标色沿明暗方向调到 3 : 1。
  // 直接压在画面上的不垫底盘（生命心、资源符号这类本来就是裸图标的，复刻要它们裸着）——元素 HUD 会在它们后面垫衬底（compose/hud.ts）；技能 / 状态图标走 iconChip 的默认底盘
  if (QUALITY.on && DRAW_LOG.on && isHudCanvas(e.g) && glyphIconName(ch)) {
    const under = colorUnder(e.g, cx, cy);
    // 整合修复（D 的场景门槛：魂类 ◆ 1.1、RPG ✓ 1.4）：底下没有够实的盒子时按画面亮度判断，压不住就垫一枚自己的小底章、图标色对底章取
    const chip = under === null || parseColor(under)[3] < 0.85 ? bareIconChip(e, cx, cy, size, color, under) : null;
    if (chip) color = chip;
    else if (under !== null) color = ensureContrast(resolveColor(color, e.pal), setAlphaOne(under), 3);
  }
  const o = { ...e.base, size, color, ...(extra ?? {}) };
  const w = W(e, ch, o);
  // 矢量图标的画风按元素的作用域画风（vis.iconStyle@el.x，§8 RC4；paint.ts 的 drawText 遇到图标符号时读 ICON_STYLE）
  const st0 = ICON_STYLE.v, st = iconStyleOf(e);
  ICON_STYLE.v = st;
  try {
    // 按角色像素化（M12b-56）：符号图标是 icons 这一层
    if (PIXROLE.displayMin === Infinity) T(e, ch, cx - w / 2, cy - size * 0.75, size * 1.5, o);
    else withPixRole('text', 'icons', () => T(e, ch, cx - w / 2, cy - size * 0.75, size * 1.5, o));
  } finally { ICON_STYLE.v = st0; }
}

/**
 * 行首 / 条前图标（部件 icon，M12b-68，cult-of-the-lamb#4）：vis.silhouette@icon 选过（旧皮肤只认皮肤之后的层）时先画一枚底章——外形 = 它（circle 圆章、diamond……），
 * 底 = icon 部件主题的面板底（col.surface@icon 可换），边 = 面板描边（没有时字色细边）——再把符号缩到章里；没选时就是 icon()（原来的裸符号）。
 * 生命条的行图标、计量条的条前图标、资源栏的符号走它。Godot：图标 TextureRect 外包一个 Panel（Hud_icon 类型变体的 StyleBoxFlat，圆章 = 全圆角）
 */
export function iconChip(e0: ElCtx, ch: string, cx: number, cy: number, size: number, color = e0.icon, status = false) {
  const e = e0.part('icon');
  if (!chosenKey(e, 'vis.silhouette')?.startsWith('vis.silhouette@icon')) {
    // 默认底盘（docs/workbench-redesign.md §8 RC4，轨道 E）：只给状态图标（增益 / 减益 / 警报，iconChip 的 status = true）——没选外形、又直接压在画面上时垫一枚圆章；
    // 生命行 / 计量条 / 资源的行首符号照原来裸着（复刻要它们裸着，亮场景上由元素 HUD 的衬底兜住）
    if (status && QUALITY.on && DRAW_LOG.on && isHudCanvas(e0.g) && colorUnder(e0.g, cx, cy) === null) { chipUnder(e0, cx, cy, size, color); icon(e0, ch, cx, cy, size * 0.78, color); return; }
    icon(e0, ch, cx, cy, size, color);
    return;
  }
  const s = size * 0.8, r = { x: cx - s, y: cy - s, w: s * 2, h: s * 2 }, p = e.t.panel;
  const sty = shapeStyle(e0, 'icon', { bg: p.bg ?? { solid: e.th.surface }, border: p.border ?? { width: Math.max(1, size * 0.1), color: e.text } }, r);
  if (!sty.bare) drawBox(e.g, r, sty, e.pal);
  icon(e, ch, cx, cy, size * 0.82, color);
}

/** 颜色去掉透明度（底色对比按实色算） */
const setAlphaOne = (c: string) => { const x = parseColor(c); return rgba([x[0], x[1], x[2], 1]); };
/** 相对亮度 L 的灰（sRGB 编码），画面亮度网格只有亮度时拿它当底色比对比 */
const grayOf = (L: number) => { const c = L <= 0.0031308 ? 12.92 * L : 1.055 * L ** (1 / 2.4) - 0.055, v = Math.round(Math.max(0, Math.min(1, c)) * 255); return rgba([v, v, v, 1]); };
/**
 * 裸图标的小底章（整合修复，§8「图形 ≥ 3 : 1」；D 的场景质量门槛：魂类·城堡的资源 ◆ 蓝压在蓝海上 1.1、RPG·庭院任务勾 ✓ 浅绿压在浅色衬底上 1.4）：
 * 图标底下没有够实（≥ 0.85）的盒子时，按画面亮度网格（sceneLum.ts，半透明盒子按叠在画面上算）看最亮 / 最暗两处的对比，不到 3 : 1 就在图标后面垫一枚圆章——
 * 底 = 皮肤面板底（面板太透明时按图标明暗取深 / 浅中性色）、92% 不透明，图标色对它推到 3.3 : 1，进绘制记录（边缘衬底与可读性检查都把它当这枚图标的底）。
 * 返回调过的图标色；够得上、没有画面网格（离屏、单元测试）、皮肤之后显式给了 typ.legibility / vis.opacity（th.floors.scrim = false）、画布有旋转时 null（照原来画）
 */
function bareIconChip(e: ElCtx, cx: number, cy: number, size: number, color: string, under: string | null): string | null {
  if (e.th.floors && !e.th.floors.scrim) return null;
  const g = e.g, m = g.getTransform();
  if (m.b || m.c || !m.a || !m.d) return null;
  const rr = size * 0.62, x = m.a * (cx - rr) + m.e, y = m.d * (cy - rr) + m.f;
  const s = lumIn(x, y, m.a * rr * 2, m.d * rr * 2, g.canvas.width, g.canvas.height, sceneSig(e.th.r.art as Record<string, unknown>));
  if (!s) return null;
  const ua = under ? parseColor(under)[3] : 0, uc = under ? setAlphaOne(under) : '#000';
  const c = resolveColor(color, e.pal);
  const worst = Math.min(...[s.min, s.max].map((L) => contrastRatio(c, ua > 0 ? mix(grayOf(L), uc, ua) : grayOf(L))));
  if (worst >= 3) return null;
  const sf = resolveColor(e.th.surface, e.pal, '#222'), face = parseColor(sf)[3] >= 0.5 ? setAlphaOne(sf) : luminance(c) > 0.4 ? '#14161b' : '#f4f2ec';
  g.save(); g.fillStyle = withAlpha(face, 0.92); g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill(); g.restore();
  logBoxRect(g, { x: cx - rr * 0.72, y: cy - rr * 0.72, w: rr * 1.44, h: rr * 1.44 }, withAlpha(face, 0.92));
  return ensureContrast(c, face, 3.3);
}
/** 默认底盘（§8 RC4）：深色圆章（半径 0.7 × 图标边长）+ 一圈 55% 的同色细边，记进绘制记录（图标按它算对比、不再叠第二个底盘） */
function chipUnder(e: ElCtx, cx: number, cy: number, size: number, color: string) {
  // 暗色图标（浅色皮肤的墨色图标）垫浅色圆章
  const rr = size * 0.7, g = e.g, c = resolveColor(color, e.pal), bg = luminance(c) < 0.3 ? 'rgba(248,246,240,0.9)' : 'rgba(14,16,20,0.86)';
  g.save(); g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
  g.strokeStyle = withAlpha(c, 0.55); g.lineWidth = Math.max(1, size * 0.08); g.stroke(); g.restore();
  logBoxRect(g, { x: cx - rr * 0.8, y: cy - rr * 0.8, w: rr * 1.6, h: rr * 1.6 }, bg);
}

/** 描边参数（M12b-68）：按目标描边、格子补边看它们选没选过 */
const STROKE_KEYS = ['vis.stroke', 'vis.strokeColor', 'vis.strokeWidth', 'vis.strokeSides'];
/** 描边参数在这个上下文的目标链上按目标写过（作用域键选过，旧皮肤只认皮肤之后的层），并且线型不是 none */
const strokeScoped = (e: ElCtx) => STROKE_KEYS.some((k) => scopedSet(e, k)) && e.v.str('vis.stroke', 'solid') !== 'none';
/**
 * 按目标描边（M12b-68 ②，black-myth#0、hades#1）：目标链上写了描边的作用域键（vis.stroke / strokeColor / strokeWidth / strokeSides@<部件 / 元素>，旧皮肤只认皮肤之后的层）、
 * 线型不是 none 时，沿 r（外扩 out）画这个上下文主题的那圈边——整框、单边（strokeSides = bottom 是货币下的一道下划线）、四角括角、双线；只描边不铺底。
 * 没有自己面板的画法用它：资源数字（iconNumber / bigNumber）的框 / 下划线、生命条每一条外面的细框（Hades 的金色双线）。返回画没画
 */
export function scopedEdge(e: ElCtx, r: Rect, out = 0): boolean {
  if (!strokeScoped(e)) return false;
  const p = e.t.panel, ed = e.t.edge ?? { border: p.border, sides: p.sides, cornerMarks: p.cornerMarks };
  if (!ed.border && !ed.sides && !ed.cornerMarks) return false;
  drawBox(e.g, { x: r.x - out, y: r.y - out, w: r.w + out * 2, h: r.h + out * 2 }, { radius: p.radius, radiusPct: p.radiusPct, chamfer: p.chamfer, step: p.step, ...ed }, e.pal);
  return true;
}

/** 画成圆的数值图形（取正方形子区域）。lightUp 不在里面（B5 审查修复 ⑪：它是一排点亮的节点，画在条的矩形里；环徽是 arcDots） */
export const ROUND_GAUGES = new Set(['orb', 'ring', 'arc', 'dial', 'tachometer', 'arcDots']);
/**
 * 仪表族（转速表 / 环徽）要的最小正方形边（设计单位，B5 审查修复 ⑫）：放进比它小的位置（Boss 条 12 高、计量条 8 高、生命条行）时退回横条——
 * 原来在条高的小方块里画成一个点（41 道刻度 / 一个剪影挤在 12 × 12 里）
 */
export const DIAL_MIN = 32;
export const SMALL_DIAL = (kind: string, r: Rect, k: number) => (kind === 'tachometer' || kind === 'arcDots') && Math.min(r.w, r.h) < DIAL_MIN * k;

/**
 * 元素里一个数值图形用哪种画法（M12a-11）：cmp.gauge（@元素 → 全局，经 cmp()）；def = 这个位置原来的画法。
 * fixed = 这个位置原来写死 def、不读 cmp.gauge（资源条、队伍条、选中面板的条、敌人头顶条……）：显式给了才换——
 *   兜底层的全局 bar 不算，旧皮肤只认皮肤之后的层（品类布局写的 cmp.gauge@el.x 不让旧皮肤的对照图漂）。原来就读 cmp.gauge 的位置照旧（fixed = false）
 */
export function gaugeKind(e: ElCtx, def: string, fixed = false): string {
  if (fixed) return pickedStr(e, 'cmp.gauge', def);
  return cmp(e, 'cmp.gauge', def);
}

export interface GaugeOpts {
  /** 颜色角色（e.fill 的第二个参数，默认好色）；color 直接给颜色时不走 e.fill */
  role?: RoleName | string;
  color?: string;
  /** 原来写死画法的位置（见 gaugeKind） */
  fixed?: boolean;
  /** 数值标注：字、位置、取值种类（圆形图形压在中心时写进环心，与原来 gauge() 的 label 一样用标题字） */
  value?: { text: string; pos: string; kind: string };
  /** 给数值图形的额外数据（M12b-02 / 03：样本上限、状态行、端徽……，见 gauges.ts 的 GaugeExtra） */
  x?: GaugeExtra;
}
/**
 * 元素里的数值图形（M12a-11，§2 的 gaugeOf）：画法 = gaugeKind(e, def, fixed)；颜色 = e.fill(idx, 角色)（第 0 / 1 条遇到 col.accent@ / col.accent2@ 时用作用域强调色）；
 * orb / ring / arc / dial 在 rect 里取居中的正方形；数值标注走 drawValue（圆形压中心时写在环心）。返回实际的画法与图形矩形
 * Godot：ProgressBar / TextureProgressBar（radial 填充模式 = orb / ring / arc），颜色取 HudRoles 的颜色常量
 */
export function gaugeOf(e: ElCtx, rect: Rect, v: number, idx: number, def: string, o: GaugeOpts = {}): { kind: string; rect: Rect } {
  const kind0 = gaugeKind(e, def, o.fixed), kind = SMALL_DIAL(kind0, rect, e.k) ? 'bar' : kind0;
  const color = o.color ?? e.fill(idx, o.role ?? 'good');
  const s = Math.min(rect.w, rect.h);
  const r = ROUND_GAUGES.has(kind) ? { x: rect.x + (rect.w - s) / 2, y: rect.y + (rect.h - s) / 2, w: s, h: s } : rect;
  const val = o.value;
  const inCenter = !!val?.text && ROUND_GAUGES.has(kind) && (val.pos === 'center' || val.pos === 'inside');
  // 条的两端饰件（ast.ornamentAnchor = barEnds）在 gauge() 里画（B4 审查修复：原来只挂在 gaugeOf 上，el.vitals 的主血条 / 经验条 / 速度条直接调 gauge()，最显眼的条反而没有）
  gauge(e, r, v, kind, color, inCenter ? val!.text : undefined, o.x);
  if (val?.text && !inCenter) drawValue(e, r, val.text, val.pos, val.kind, {}, SEG_KINDS.has(kind));
  return { kind, rect: r };
}

/** 饰色（col.ornament 选过，M12b-49）：选过用它，否则面板饰件的颜色，再没有时面板描边色 / 字色——端头、花枝、花饰标牌、角花焦点、耳标用 */
export function ornColor(e: ElCtx): string {
  const c = e.t.ornColor ?? e.t.panel.ornament?.color ?? e.t.panel.border?.color;
  return c ? resolveColor(c, e.pal) : e.text;
}
/**
 * 元素两端的卷须（ast.ornamentAnchor = elementEnds，M12b-49，frostpunk#13：组件两端伸出的铸铁卷须）：元素外接框左右两端各一个端头（形 = ast.endcapShape，
 * auto 按母题、默认卷须），高 = 元素高的 0.6（10~36）；返回画了的那几块的矩形（compose/hud.ts 登记占位）。
 * B4 审查修复：比端头高 2.5 倍还高的元素（队伍列表、目标、通知堆）端头挂在第一行（上沿往下半个端头）而不是整块的竖向正中；
 * keep（调用方给）说这一端能不能画——会伸出画面、或压在已经登记的别的元素 / 饰件上的那一端不画（贴边元素原来有一端三成截在画面外、密集 HUD 里压着邻居）；
 * 端头烘进离屏画布再贴（每帧不重建卷须路径）
 */
export function elementEnds(e: ElCtx, r: Rect, keep: (q: Rect) => boolean = () => true): Rect[] {
  const h = Math.max(10 * e.k, Math.min(36 * e.k, r.h * 0.6)), sh = endcapShapeOf(pickedStr(e, 'ast.endcapShape', 'auto'), e.t.panel.ornament?.motif ?? 'none', 'scroll'), c = ornColor(e), L = endcapReach(sh, h);
  const cy = r.h > h * 2.5 ? r.y + h * 0.5 + 2 * e.k : r.y + r.h / 2;
  const out: Rect[] = [];
  for (const side of [-1, 1]) {
    const x = side < 0 ? r.x - 2 * e.k : r.x + r.w + 2 * e.k, q = { x: side < 0 ? x - L : x, y: cy - h / 2, w: L, h };
    if (!keep(q)) continue;
    bakedPaint(e.g, `ee|${sh}|${h.toFixed(2)}|${side}|${c}`, q, h * 0.35 + 2, (g) => drawEndcap(g, x, cy, h, side, sh, c));
    out.push(q);
  }
  return out;
}
/** 饰件挂点（ast.ornamentAnchor，M12b-49）：选过的列表（按 @部件 → @元素 → 全局，旧皮肤只认皮肤之后的层），没选空表（= 原来的：只画面板四角与边上） */
export function anchorsOf(e: ElCtx): string[] {
  const k = chosenKey(e, 'ast.ornamentAnchor');
  return k ? e.r.list(k).filter((x) => x && x !== 'auto') : [];
}
/**
 * 耳标（ast.earTabAt，M12b-49，frostpunk#17 的建筑面板）：骑在面板边上、一半露在框外的小标签。每个位置有自己的内容（B4 审查修复：原来左上 / 右上都画拨杆，
 * frostpunk#17 左上要的是图标小签）——topLeft = 顶边左段一枚图标小签（选中面板 = 单位的头像首字，其余 = 「i」），topRight = 顶边右段一枚带拨杆（ON）的小签，
 * right = 右边中段一颗带 × 的小方钮。底 = 面板底色、描边 = 饰色。返回画出的矩形（调用方登记占位；没选 null）
 */
export function earTab(e0: ElCtx, r: Rect, scopedOnly = false): Rect | null {
  // scopedOnly（HUD 元素）：只认按目标写的键（ast.earTabAt@el.x）——全局写的只给模板容器，不然每个元素都长一枚耳标
  if (scopedOnly && !scopedSet(e0, 'ast.earTabAt')) return null;
  const at = pickedStr(e0, 'ast.earTabAt', 'none');
  if (at === 'none') return null;
  // 部件 earTab（col.surface@earTab、col.ornament@earTab……按目标）
  const e = e0.part('earTab'), g = e.g, k = e.k, c = ornColor(e), face = resolveColor(e.th.surface, e.pal);
  const box = (q: Rect) => drawBox(g, q, { bg: { solid: face }, border: { width: Math.max(1, 1.5 * k), color: c }, radius: 3 * k }, e.pal);
  if (at === 'right') {
    const s = 22 * k, q = { x: r.x + r.w - s * 0.45, y: r.y + r.h * 0.5 - s / 2, w: s, h: s };
    box(q); icon(e, '×', q.x + s / 2, q.y + s / 2, s * 0.55, c);
    return q;
  }
  if (at === 'topLeft') {
    // 图标小签：圆角小签里一枚图标（选中面板写单位的首字，别的元素 / 模板容器写「i」），字色 = 饰色
    const h = 20 * k, w = 28 * k, q = { x: r.x + 14 * k, y: r.y - h * 0.55, w, h };
    box(q);
    const sym = e0.id === 'el.selection' ? DATA.selection.initial : 'i', so: TextOpts = { ...e.small, size: h * 0.6, weight: 800, color: c }, sw = W(e, sym, so);
    T(e, sym, q.x + w / 2 - sw / 2, q.y, h, so);
    return q;
  }
  const w = 58 * k, h = 20 * k, q = { x: r.x + r.w - 14 * k - w, y: r.y - h * 0.55, w, h };
  box(q);
  // 拨杆：一颗胶囊里的圆钮（开 = 靠右、强调色）+ ON 字
  const px = q.x + 6 * k, py = q.y + h * 0.28, pw = 18 * k, ph = h * 0.44;
  g.save(); g.fillStyle = withAlpha(c, 0.35); g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill();
  g.fillStyle = e.accent; g.beginPath(); g.arc(px + pw - ph / 2, py + ph / 2, ph * 0.42, 0, Math.PI * 2); g.fill(); g.restore();
  T(e, 'ON', px + pw + 5 * k, q.y, h, { ...e.small, size: h * 0.5, weight: 800, color: c });
  return q;
}

/**
 * 数值图形（cmp.gauge）：画法表与外框 / 端头 / 附属件在 elements/gauges.ts（M12b-02 / 03，§2 的 GAUGES 与 gaugeDecor）；条的底槽 / 填充 token 与底槽字色取 @bar 部件。
 * x = 额外数据（球心图标、样本上限、心的类型、可回复段、副读数、帽头字母、端徽、状态行），不给时与拆分前的 gauge() 一样
 */
export function gauge(e0: ElCtx, r: Rect, v: number, kind: string, color = e0.good, label?: string, x: GaugeExtra = {}) {
  // 按角色像素化（M12b-56）：数值条是 bars 这一层（条上的数字仍按 numerals）
  if (PIXROLE.displayMin === Infinity) gaugeDecor(e0, r, v, kind, color, label, x, (k) => ROUND_GAUGES.has(k));
  else withPixRole('box', 'bars', () => gaugeDecor(e0, r, v, kind, color, label, x, (k) => ROUND_GAUGES.has(k)));
}

/* ---------------- 数值标注（M12a-13） ---------------- */

/** 有分段线的数值画法（压在上面的数字要垫底，§8 RC6） */
export const SEG_KINDS = new Set(['segmented', 'pips', 'diamondPips', 'lightStrip']);

/** 元素实例参数（elOf 的查法：画法级 → 元素级 → 模板 elx.*）：拆开画的画法查自己的键 */
export const elOf = (e: ElCtx, suffix: string) => e.r.el(e.id, suffix, e.form);
/**
 * 元素实例参数是不是显式给的（品类布局 / 模板 / 复刻 / 手动……；默认与兜底层不算）：没给时各元素保留原来的画法——
 * 例如 elx.valueLabel 的默认是 none，可 el.rank 的旁注、el.interact 的动作字原来是画的，只有显式写 none 才去掉
 */
export function elGiven(e: ElCtx, suffix: string): boolean {
  const s = e.r.src(e.r.elKey(e.id, suffix, e.form));
  return !!s && s.layer !== 'default' && s.layer !== 'fallback' && s.layer !== 'ruleDefault';
}
/**
 * 新的元素实例参数「选过」（B5 审查修复 ⑥，M12a §0）：显式给了（elGiven），且旧皮肤只认皮肤之后的层（与 chosenKey / pickedStr 同口径）——
 * 品类布局 / 模板这类皮肤之前的预设写了也不让旧皮肤的画面变。M12b 起新加的「给了才换画法」的元素参数一律用它
 */
export const elChosen = (e: ElCtx, suffix: string): boolean => elGiven(e, suffix) && (!e.th.legacy || postSkinKey(e, e.r.elKey(e.id, suffix, e.form)));
/** 元素里的名字 / 行名写不写（elx.label，M12a-12）：hide = 不写（生命条的行名、Boss 名、队伍名字、资源条的物品名、计量条的名字） */
export const labelShown = (e: ElCtx) => String(elOf(e, 'label') ?? 'show') !== 'hide';
/** 数值图形的粗细倍数（elx.thickness，M12a-12：0.5–3，与 elx.scale 独立；没给时 1 = 原来的粗细） */
export function thicknessOf(e: ElCtx): number {
  const n = Number(elOf(e, 'thickness'));
  return Number.isFinite(n) && n > 0 ? Math.max(0.5, Math.min(3, n)) : 1;
}
/** 数值标注画哪种（elx.valueLabel）：显式给了用它，没给时 def（这个元素原来画的，多数是 none） */
export const valueKind = (e: ElCtx, def = 'none') => (elGiven(e, 'valueLabel') ? e.valueLabel : def);
/** 数值标注的位置（elx.valueLabelPos）：显式给了用它，没给时 def（这个元素原来的位置） */
export const valuePosOf = (e: ElCtx, def: string) => (elGiven(e, 'valueLabelPos') ? e.valueLabelPos : def);

/**
 * 数值标注的字（elx.valueLabel）：none / current（v × max）/ currentMax（"当前/上限"）/ percent / delta（变化量，带正负号；delta 没给时是样本的 -12）。
 * kind 默认读元素的 valueLabel
 */
export function valueText(e: ElCtx, v: number, max = DATA.hpMax, kind = e.valueLabel, delta = -12): string {
  switch (kind) {
    case 'current': return String(Math.round(v * max));
    case 'currentMax': return `${Math.round(v * max)}/${max}`;
    case 'percent': return `${Math.round(v * 100)}%`;
    case 'delta': return delta > 0 ? `+${delta}` : delta < 0 ? `-${Math.abs(delta)}` : '±0';
    // 趋势箭头（M12b-02，dont-starve#5）：升 ▲、降 ▼（delta 的正负；没给时样本 -12 = 降）
    case 'trend': return delta > 0 ? '▲' : delta < 0 ? '▼' : '';
    default: return '';
  }
}

/** 数值标注的字宽：数字经数字字形量（M12b-07，numberWidth；没给 typ.numerals.* 时 = W）；名字标注（label）与趋势箭头按字量 */
const valueW = (e: ElCtx, text: string, s: TextOpts, kind: string) => (kind === 'label' || kind === 'trend' ? W(e, text, s) : numberWidth(e, text, s));
/** 数值标注与条之间的空（设计单位，乘元素缩放） */
const VALUE_GAP = 6;
/**
 * 数值标注的字样：小号粗体（原来 el.vitals 的写法）；delta 再小一号，正值好色、负值坏色（色彩策略 mono 时两者都是强调色的明度阶，见 th.roles）；
 * 压在条上（inside / center）时字没有可读辅助就按 typ.legibility 加一圈描边（显式选了 none 不加）
 */
export function valueStyle(e: ElCtx, text: string, pos: string, kind: string, o: Partial<TextOpts> = {}): TextOpts {
  let s: TextOpts = { ...e.small, weight: 700, ...o };
  if (kind === 'delta') s = { ...s, size: s.size * 0.9, color: o.color ?? (text.startsWith('+') ? e.good : text.startsWith('-') ? e.bad : s.color) };
  if (kind === 'trend') s = { ...s, size: s.size * 0.8, color: o.color ?? (text === '▲' ? e.good : e.bad) };
  const legKey = cmpKey(e, 'typ.legibility');
  const noAid = chosen(e, legKey) && e.v.str('typ.legibility', '') === 'none';
  if ((pos === 'inside' || pos === 'center') && !s.outline && !s.shadow && !s.glowColor && !s.glow && !noAid) {
    s = { ...s, outline: { color: luminance(resolveColor(s.color, e.pal)) < 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)', width: 1.5 } };
  }
  return s;
}
/**
 * 数值标注要多占的地方（size() 里算进元素框）：end = 条后的字宽 + 前后各一个空；above / below = 一行字高；inside / center 压在条上不占
 */
export function valueSize(e: ElCtx, text: string, pos = e.valueLabelPos, kind = e.valueLabel): { w: number; h: number } {
  if (!text) return { w: 0, h: 0 };
  const s = valueStyle(e, text, pos, kind);
  if (pos === 'end') return { w: valueW(e, text, s, kind) + 2 * VALUE_GAP * e.k, h: 0 };
  if (pos === 'above' || pos === 'below') return { w: 0, h: LH(e, s, 1.2) + 2 * e.k };
  return { w: 0, h: 0 };
}
/**
 * 画数值标注（M12a-13）：bar = 数值图形的矩形；pos = inside / center（压条居中，按 typ.legibility 描边）、end（条后）、
 * above / below（条上 / 条下：横条贴右端，方形的球 / 环 / 格居中）。返回字的矩形（没有字时 null）。
 * Godot：数值 Label 作为条的子节点，位置 = anchors preset（inside / center = PRESET_CENTER，end = 右侧外，above / below = 顶 / 底外）
 */
export function drawValue(e: ElCtx, bar: Rect, text: string, pos = e.valueLabelPos, kind = e.valueLabel, o: Partial<TextOpts> = {}, segs = false): Rect | null {
  if (!text) return null;
  // 只在悬停时显示（elx.valueLabelShow = onHover，M12b-02，dont-starve#5）：静帧不画（位置照旧留着，悬停出现时版面不跳）；Godot = mouse_entered / exited 切 Label.visible
  if (kind !== 'label' && elChosen(e, 'valueLabelShow') && String(elOf(e, 'valueLabelShow')) === 'onHover') return null;
  const s = valueStyle(e, text, pos, kind, o);
  // 条后的字从条尾往右排，不用先量字宽
  const w = pos === 'end' ? 0 : valueW(e, text, s, kind), lh = LH(e, s, 1.2), wide = bar.w > bar.h * 2.5;
  const ax = wide ? bar.x + bar.w - w : bar.x + bar.w / 2 - w / 2;
  const at = pos === 'end' ? { x: bar.x + bar.w + VALUE_GAP * e.k, y: bar.y + bar.h / 2 - lh / 2 }
    : pos === 'above' ? { x: ax, y: bar.y - 2 * e.k - lh }
    : pos === 'below' ? { x: ax, y: bar.y + bar.h + 2 * e.k }
    : { x: bar.x + bar.w / 2 - w / 2, y: bar.y + bar.h / 2 - lh / 2 };
  // 分段条上压着的数字（§8 RC6，轨道 E）：先垫一块圆角小底，分段线不再从数字中间穿过
  if (segs && QUALITY.on && (pos === 'inside' || pos === 'center')) {
    // 小底与字反差：暗字垫亮底、亮字垫暗底
    const px = 4 * e.k, ch = Math.min(lh, Math.max(bar.h + 4 * e.k, s.size * 1.15)), dk = luminance(resolveColor(s.color, e.pal)) < 0.4;
    drawBox(e.g, { x: at.x - px, y: at.y + lh / 2 - ch / 2, w: w + px * 2, h: ch }, { bg: { solid: dk ? 'rgba(248,246,240,0.92)' : 'rgba(12,12,16,0.82)' }, radiusPct: 50 }, e.pal);
  }
  return { ...at, w: kind === 'label' || kind === 'trend' ? T(e, text, at.x, at.y, lh, s) : drawNumber(e, text, at.x, at.y, lh, s), h: lh };
}

/* ---------------- 小组件外形（M12a-09） ---------------- */

/** vis.silhouette 的取值：box = 跟转角（vis.corner），none = 不画底座，其余是多边形外形（paint.ts 的 shapePoints） */
export type Silhouette = 'box' | 'none' | 'circle' | 'diamond' | 'hexagon' | 'shield' | 'shieldTail' | 'ribbon' | 'trapezoid'
  | 'oval' | 'octagon' | 'arrowRight' | 'arrowLeft' | 'arch' | 'stepped' | 'scallop' | 'randomQuad' | 'shard' | 'brushStroke' | 'edgeTab' | 'boomerang' | 'quarterCircleBase' | 'roundShield';
/** M12b-38 / 39 加：椭圆、八角、箭头端、拱顶、阶梯顶、扇贝、随机四边形、碎片、干笔刷（都在 paint.ts 的 shapePoints 生成点列） */
/** edgeTab（M12b-47，B4 审查修复从 cmp.button 挪来）= 左上整条斜切的贴边页签：不是多边形点列，shapeStyle 把它换成只切左上角的大切角 */
const SILHOUETTES = new Set<string>(['box', 'none', 'circle', 'diamond', 'hexagon', 'shield', 'shieldTail', 'ribbon', 'trapezoid', 'oval', 'octagon', 'arrowRight', 'arrowLeft', 'arch', 'stepped', 'scallop', 'randomQuad', 'shard', 'brushStroke', 'edgeTab', 'boomerang', 'quarterCircleBase', 'roundShield']);

/**
 * 小组件的外形选择（vis.silhouette）：查 @<部件> → @<元素> → 全局；没人选（默认 / 兜底层）时返回 null——各组件保留原来的外形
 * （格子跟转角、头像是圆、主按钮跟按键 token）。旧皮肤只认皮肤之后显式选的（chosen()）
 */
export function silhouetteOf(e0: ElCtx, part: string): Silhouette | null {
  const e = e0.part(part);
  const key = chosenKey(e, 'vis.silhouette');
  if (!key) return null;
  const v = e.r.str(key, 'box');
  return SILHOUETTES.has(v) ? (v as Silhouette) : null;
}
/**
 * 只认作用域键的外形（M12b-68 ④）：<部件 / 元素> 上写了 vis.silhouette@…（选过）才返回，全局的 vis.silhouette 不算——计时、时钟、段位章这些
 * 原来外形固定（圆章 / 面板）的盒子只在按目标写了外形时才换（xcom2#32 回合章双同心细环、hi-fi-rush#7 评级圆盘）
 */
export function scopedSilhouette(e0: ElCtx, part: string): Silhouette | null {
  return chosenKey(e0.part(part), 'vis.silhouette')?.includes('@') ? silhouetteOf(e0, part) : null;
}

/**
 * 外形的内切矩形（M12b-67，§2 的 innerRect）：格子角标、数量、键位、稀有度侧条 / 星 / 字母、头像首字都排进它，不再按方框的角落写（disco-elysium#48 菱形思想槽的数量落在形外、
 * octopath#23 菱形头像的首字溢出名牌）。circle = 椭圆的内接矩形（÷√2）；diamond = 中间 1/2 × 1/2；hexagon = 左右各收 0.28 × 短边（与 paint.ts 的 shapePoints 同一个 k）；
 * shield / shieldTail = 上部 70% / 82% 高、左右各收一成 / 半成；ribbon / trapezoid = 左右收斜边；box / none / 没有外形 = 原矩形。B3 的新外形（M12b-38）要在这里补分支。
 * Godot：角标 = 内切区 MarginContainer 里的锚点预设
 */
export function innerRect(shape: string | null | undefined, r: Rect): Rect {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  switch (shape) {
    case 'circle': { const w = r.w / Math.SQRT2, h = r.h / Math.SQRT2; return { x: cx - w / 2, y: cy - h / 2, w, h }; }
    case 'diamond': return { x: cx - r.w / 4, y: cy - r.h / 4, w: r.w / 2, h: r.h / 2 };
    case 'hexagon': { const k = Math.min(r.w, r.h) * 0.28; return { x: r.x + k, y: r.y, w: r.w - 2 * k, h: r.h }; }
    case 'shield': return { x: r.x + r.w * 0.1, y: r.y, w: r.w * 0.8, h: r.h * 0.7 };
    case 'shieldTail': return { x: r.x + r.w * 0.05, y: r.y, w: r.w * 0.9, h: r.h * 0.82 };
    case 'ribbon': { const k = Math.min(r.h * 0.45, r.w * 0.2); return { x: r.x + k, y: r.y, w: r.w - 2 * k, h: r.h }; }
    case 'trapezoid': { const k = Math.min(r.w * 0.12, r.h * 0.5); return { x: r.x + k, y: r.y, w: r.w - 2 * k, h: r.h }; }
    // M12b-38 / 39 的新外形（几何与 paint.ts 的 shapePoints 同一组常数）
    case 'oval': { const rx = r.w <= r.h * 1.15 && r.h <= r.w * 1.15 ? r.w * 0.4 : r.w / 2, w = (rx * 2) / Math.SQRT2, h = r.h / Math.SQRT2; return { x: cx - w / 2, y: cy - h / 2, w, h }; }
    case 'octagon': { const k = Math.min(r.w, r.h) * 0.293 * 0.5; return { x: r.x + k, y: r.y + k, w: r.w - 2 * k, h: r.h - 2 * k }; }
    case 'arrowRight': { const t = arrowTip(r.w, r.h); return { x: r.x, y: r.y, w: r.w - t * 0.6, h: r.h }; }
    case 'arrowLeft': { const t = arrowTip(r.w, r.h); return { x: r.x + t * 0.6, y: r.y, w: r.w - t * 0.6, h: r.h }; }
    case 'arch': { const ry = Math.min(r.w / 2, r.h * 0.6) * 0.35; return { x: r.x + r.w * 0.05, y: r.y + ry, w: r.w * 0.9, h: r.h - ry }; }
    // M12b-63：回旋镖（上下沿起伏 ≈ 0.22 高）、四分之一圆底座（右下大圆角）、圆盾（正圆，同 circle）
    case 'boomerang': return { x: r.x + r.w * 0.08, y: r.y + r.h * 0.4, w: r.w * 0.84, h: r.h * 0.42 };
    case 'quarterCircleBase': { const q = Math.min(r.w, r.h) * 0.85 * 0.3; return { x: r.x, y: r.y, w: r.w - q, h: r.h - q }; }
    case 'roundShield': { const d = Math.min(r.w, r.h) * 0.7071; return { x: r.x + (r.w - d) / 2, y: r.y + (r.h - d) / 2, w: d, h: d }; }
    case 'stepped': { const s1 = stepRise(r.w, r.h) * 2; return { x: r.x, y: r.y + s1, w: r.w, h: r.h - s1 }; }
    case 'scallop': { const k = scallopR(r.w, r.h); return { x: r.x + k, y: r.y + k, w: r.w - 2 * k, h: r.h - 2 * k }; }
    case 'randomQuad': { const k = Math.min(r.w, r.h) * 0.08; return { x: r.x + k, y: r.y + k, w: r.w - 2 * k, h: r.h - 2 * k }; }
    case 'shard': return { x: r.x + r.w * 0.22, y: r.y + r.h * 0.22, w: r.w * 0.56, h: r.h * 0.56 };
    case 'brushStroke': return { x: r.x + r.w * 0.08, y: r.y + r.h * 0.12, w: r.w * 0.8, h: r.h * 0.76 };
    default: return r;
  }
}
/** 盒子样式实际的外形名（innerRect 用）：正圆 / 多边形外形；药丸（宽按钮的 circle）与普通圆角框算方框 */
const shapeName = (s: BoxStyle) => (s.circle ? 'circle' : s.shape && s.shape !== 'box' ? s.shape : null);

/**
 * 小组件外形（M12a-09）：base = 这个部件的盒子（格子 / 次按钮用控件盒子、主按钮用按键盒子、头像用面板的转角……），按作用域的 vis.silhouette 换外形：
 *   box / 没选 = 跟转角（vis.corner@<部件> 经主题补丁已在 base 上）；oldRadius 给了时（格子 6、地图窗 8）base 没有任何圆角就补成：
 *     直角 0（原来 slot() 见面板没有圆角就退回 6px，直角皮肤的格子全成了小圆角）；旧皮肤没在皮肤之后显式选转角时仍是 oldRadius（对照图不变）；
 *   circle / diamond / hexagon / shield / shieldTail / ribbon / trapezoid = 多边形外形；r 给了且宽高比 > 1.25 的 circle 画成两端半圆的药丸（宽按钮）；
 *     只描单边的描边换成整圈（非方形画不出单边），四角括角去掉；
 *   none = 不画底座（返回 bare = true），选中框 / 冷却罩 / 稀有度描边仍沿方框。
 * 冷却罩、选中框、稀有度描边、内凹边都沿返回的外形（boxPath）画，所以同一外形贯穿整个格子。
 */
export function shapeStyle(e0: ElCtx, part: string, base: BoxStyle, r?: Rect, oldRadius?: number, force?: Silhouette): BoxStyle & { bare?: boolean } {
  // force（M12b-17）：调用方指定外形（CTA 的箭头钮对 confirmBack、贴边页签钮 edgeTab），不读 vis.silhouette
  const sil = force ?? silhouetteOf(e0, part);
  if (!sil || sil === 'box' || sil === 'none') {
    const round = base.radius !== undefined || base.radiusPct !== undefined || base.chamfer || base.step || base.circle || (base.shape && base.shape !== 'box');
    const out: BoxStyle & { bare?: boolean } = round || oldRadius === undefined ? { ...base } : { ...base, radius: cornerKept(e0.part(part)) ? 0 : oldRadius };
    if (sil === 'none') out.bare = true;
    return out;
  }
  // 贴边页签（edgeTab）：左上角整条斜切（切角 = 0.7 × 短边，只切这一个角），描边 / 单边照旧
  if (sil === 'edgeTab') return { ...base, shape: undefined, radius: undefined, radiusPct: undefined, step: undefined, circle: undefined, chamfer: (r ? Math.min(r.w, r.h) : 24) * 0.7, cornerMask: ['tl'] as Corner[] };
  const side = base.sides ? base.sides.t ?? base.sides.l ?? base.sides.b ?? base.sides.r : undefined;
  const out: BoxStyle = { ...base, radius: undefined, radiusPct: undefined, chamfer: undefined, step: undefined, circle: undefined, sides: undefined, cornerMarks: undefined, border: base.border ?? side };
  // 圆：宽按钮画成药丸；边缘干净时用正圆（ellipse），撕边 / 抖动时走多边形（跟面板一样被扰动）
  const rough = (base.edge && base.edge !== 'clean') || (base.jitter ?? 0) > 0.001;
  if (sil === 'circle' && r && (r.w > r.h * 1.25 || r.h > r.w * 1.25)) { out.shape = undefined; out.radius = Math.min(r.w, r.h) / 2; }
  else if (sil === 'circle' && !rough) { out.shape = undefined; out.circle = true; }
  else out.shape = sil;
  return out;
}

/**
 * 外形覆盖（M12a-09）：只含外形相关字段，给 panel(…, over) 这类「盒子由别处给、只换外形」的地方用；没选 / box 时是 {}（面板原样），
 * none 时 bare = true（调用方不画底座）
 */
export function shapeOver(e0: ElCtx, part: string, r?: Rect, base: BoxStyle = e0.t.panel): Partial<BoxStyle> & { bare?: boolean } {
  const sil = silhouetteOf(e0, part);
  if (!sil || sil === 'box') return {};
  if (sil === 'none') return { bare: true };
  const s = shapeStyle(e0, part, base, r);
  // 贴边页签（edgeTab）是只切左上角的切角：带上切角与角掩码
  if (sil === 'edgeTab') return { shape: undefined, radius: undefined, radiusPct: undefined, chamfer: s.chamfer, cornerMask: s.cornerMask, step: undefined, circle: undefined, sides: undefined, cornerMarks: undefined };
  return { shape: s.shape, radius: s.radius, radiusPct: undefined, chamfer: undefined, step: undefined, circle: s.circle, sides: undefined, cornerMarks: undefined };
}

/** 转角是不是显式定了（新皮肤总是；旧皮肤要皮肤之后选过 vis.corner / vis.cornerSize）：定了时「没有圆角」就是直角 */
const cornerKept = (e: ElCtx) => !e.th.legacy || !!chosenKey(e, 'vis.corner') || !!chosenKey(e, 'vis.cornerSize');

/**
 * 内凹边（M12a-09）：上左暗、下右亮各一道（宽 = 1 美术像素 × UI 像素化倍数），沿外形画在盒子里面（内阴影的画法）。
 * 格子与所在面板同底、自己又没有描边时（同色同纹就看不见格子），或显式选了 vis.depth = bevel / innerShadow 时画
 */
function insetEdge(g: CanvasRenderingContext2D, r: Rect, sty: BoxStyle, w: number, pal: SkinPalette) {
  drawBox(g, r, { ...sty, bg: undefined, border: undefined, sides: undefined, cornerMarks: undefined, ring: undefined, ornament: undefined, fx: undefined, frame: undefined, material: undefined, overlay: undefined, gloss: undefined,
    shadows: [{ color: 'rgba(0,0,0,0.32)', x: w, y: w, blur: 0, inset: true }, { color: 'rgba(255,255,255,0.4)', x: -w, y: -w, blur: 0, inset: true }] }, pal);
}

/** 盒子看得见的边（描边、单边、括角、外圈、外框） */
const hasEdge = (s: BoxStyle) => (!!s.border && s.border.width > 0) || !!s.sides || !!s.cornerMarks || !!s.ring || !!s.frame;
/** 盒子的底色（纯色或材质底色；渐变 / 图案返回 null） */
const faceColor = (s: BoxStyle, pal: SkinPalette) => (s.material ? MATERIAL_BASE[s.material] ?? null : s.bg && 'solid' in s.bg ? resolveColor(s.bg.solid, pal) : null);
/** 颜色去掉透明度（对比度按不透明的底算） */
const setOpaque = (c: string) => { const x = parseColor(c); return rgba([x[0], x[1], x[2], 1]); };

/**
 * 稀有度画不画（M12a-09）：皮肤之后的层（手动、复刻、关键词……）显式给了 col.coding 又不含 rarity 时不画——除非同样显式给了不为空的 st.rarityCue。
 * 模板 / 品类布局写的 col.coding 不算（它们并进全局默认的 status，本来就从不含 rarity，算了会让所有格子丢掉稀有度）
 */
export function rarityShown(e: ElCtx): boolean {
  if (!postSkinKey(e, 'col.coding') || e.r.list('col.coding').includes('rarity')) return true;
  const k = cmpKey(e, 'st.rarityCue');
  return postSkinKey(e, k) && e.r.list(k).some((x) => x !== 'auto' && x !== 'none');
}

/** 稀有度用哪几种记号（st.rarityCue，按 @部件 → @元素 → 全局，与 slot() 同口径）：没人给 = 默认的边框色；显式清空（[] / ["none"]，M12a-07）= 空列表（M12a-21 的卡行、大卡共用） */
export function rarityCues(e: ElCtx): string[] {
  const cues = e.v.list('st.rarityCue').filter((x) => x !== 'auto' && x !== 'none');
  const l = e.v.src('st.rarityCue')?.layer;
  return cues.length || (l && l !== 'default' && l !== 'fallback') ? cues : ['border'];
}

/** 格子的耐久标注（M12a-20 的 elx.durability）：bottomPct = 底边居中的百分比字，bar = 底边细条（好 / 警告 / 坏三档色） */
function durabilityMark(e: ElCtx, r: Rect, v: number, o: TextOpts) {
  const mode = String(e.r.el(e.id, 'durability') ?? 'none');
  if (mode === 'bottomPct') { const s = `${Math.round(v * 100)}%`; T(e, s, r.x + r.w / 2 - W(e, s, o) / 2, r.y + r.h - o.size * 1.4, o.size * 1.3, o); }
  else if (mode === 'bar') {
    const h = Math.max(2, r.h * 0.07), y = r.y + r.h - h - Math.max(1, r.h * 0.05), x = r.x + r.w * 0.12, w = r.w * 0.76;
    e.g.fillStyle = withAlpha('#000', 0.45); e.g.fillRect(x, y, w, h);
    e.g.fillStyle = v < 0.25 ? e.bad : v < 0.5 ? e.warn : e.good; e.g.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
  }
}

/** 格子：冷却 / 锁定 / 选中 / 新获得 / 空格按状态编码参数（st.*）画，同一屏的通道撞车由 check.ts 检查 */
/**
 * 稀有度色阶表（col.rarityScale，0 普通 … 4 最高）：diablo / gacha / metal 是原来的三张；M12b-33 加 greyBlueGold（StS 的灰 / 蓝 / 金：0 普通、1–2 罕见、3–4 稀有）、
 * quality（Stardew 的品质：普通 / 银 / 金 / 铱紫）
 */
export const RARITY_SCALES: Record<string, string[]> = {
  diablo: ['#9aa0a6', '#3fb950', '#3b82f6', '#a855f7', '#f59e0b'],
  gacha: ['#7aa2f7', '#7aa2f7', '#a855f7', '#f5c542', '#ff6ad5'],
  metal: ['#8d8d8d', '#b87333', '#c0c7d0', '#e3b341', '#f5f0d0'],
  greyBlueGold: ['#8f969c', '#4a90d9', '#4a90d9', '#e2b13c', '#e2b13c'],
  quality: ['#9aa0a6', '#c7ced6', '#e8b830', '#b04fd8', '#b04fd8'],
};
/** 稀有度档位对应的表面处理（st.rarityCue = finish，M12b-52，与 ast.finish 同一套画法） */
const RARITY_FINISH = ['none', 'foil', 'holo', 'polychrome', 'glass'];
/** 稀有度色阶（M12b-33，§2 的 rarityColor 的表）：custom = col.rarityColors 的有序表（3–6 色，第 t 档取第 t 项、超出取最后一项；Hades 的白 / 蓝 / 紫 / 红 / 橙 / 绿），其余查 RARITY_SCALES */
export function rarityTable(r: Resolved): string[] {
  const scale = r.str('col.rarityScale', 'diablo');
  if (scale === 'custom') { const c = r.list('col.rarityColors').filter((x) => x && x !== 'auto'); if (c.length) return c; }
  return RARITY_SCALES[scale] ?? RARITY_SCALES.diablo;
}
/** 稀有度色阶（col.rarityScale / col.rarityColors）：0 普通 … 4 最高（custom 可到 5：Hades 的二神合力）；之后的条目都从这里取色，不另建表 */
export function rarityColor(e: ElCtx, tier: number): string {
  const list = rarityTable(e.r);
  return tableColor(e.th, list[Math.max(0, Math.min(list.length - 1, tier))]);
}
/** 色表里的一项：角色名（accent / accent2 / text / good / bad / warn）换成主题里的颜色，其余原样（#hex） */
export function tableColor(th: Theme, c: string): string {
  if (c === 'accent' || c === 'accent2') return resolveColor(`@${c}`, th.pal);
  if (c === 'text') return resolveColor(th.text, th.pal);
  return c === 'good' || c === 'bad' || c === 'warn' ? th.roles[c] : c;
}

/** 类别 / 流派色的默认表（col.lineColors 没给时）：红 / 紫 / 绿 / 蓝 / 金（Dead Cells 的暴虐 / 战术 / 生存在前三） */
const LINE_DEFAULT = ['#e5484d', '#a855f7', '#3fb950', '#3b82f6', '#e3b341'];
/** 类别 / 流派色表（M12b-33）：col.coding 含 lineId（旧皮肤要皮肤之后的层给的）时 = col.lineColors（没给时默认表），否则空 */
export function lineTable(r: Resolved, th: Theme): string[] {
  if (!r.list('col.coding').includes('lineId') || (th.legacy && !afterSkin(r, 'col.coding'))) return [];
  const c = r.list('col.lineColors').filter((x) => x && x !== 'auto');
  return c.length ? c.map((x) => tableColor(th, x)) : LINE_DEFAULT;
}
/** 地图画风表的取值（M12b-25，world.ts MAP_STEPS）：这些画风的类别色 / 阵营色可以经画风串带进烘焙 */
const MAP_CATS = new Set(['chart', 'hexChart']);
/**
 * 实际用的地图画风（M12b-25）：vis.mapStyle 按目标链读（vis.mapStyle@el.minimap 选过时小地图单独一种画风，scoped = true）；
 * rel.semanticZoom = chart（拉远切成类别色块地图，factorio#23）时换成 chart，小地图同色；auto = flatVector。
 * key = 烘焙用的画风串：chart / hexChart 在 col.coding 含 lineId 时带上类别色表（`chart|#a,#b`，B1 · 33 的 e.lineColors，不另建色表）
 */
export function mapStyleOf(e: ElCtx): { style: string; key: string; scoped: boolean } {
  const sk = chosenKey(e, 'vis.mapStyle'), scoped = !!sk?.includes('@');
  const v0 = scoped ? e.r.str(sk!, 'auto') : e.r.str('vis.mapStyle', 'auto');
  const style = e.r.str('rel.semanticZoom', 'none') === 'chart' ? 'chart' : !v0 || v0 === 'auto' ? 'flatVector' : v0;
  return { style, key: MAP_CATS.has(style) && e.lineColors.length ? `${style}|${e.lineColors.join(',')}` : style, scoped };
}
/** 第 i 类的颜色（M12b-33，§2）：lineId 没开时 null（调用方照原来的画法）；i 超出表长时轮着取 */
export const lineColor = (e: ElCtx, i: number | undefined): string | null => {
  const n = e.lineColors.length;
  return n && i !== undefined ? e.lineColors[((i % n) + n) % n] : null;
};

/**
 * opts.item：格子里物品的中文名（图集素材按它取图标）；不给时按符号猜，给空串 = 不是物品（技能），只画符号。
 * durability（M12a-20）：耐久 0~1，按元素的 elx.durability 画底边百分比 / 细条；键位角标不画就不给 key（格下键帽由调用方画）
 */
export type SlotOpts = { qty?: string; cd?: number; key?: string; selected?: boolean; locked?: boolean; fresh?: boolean; empty?: boolean; rarity?: number; item?: string; durability?: number;
  /** 类别 / 流派序号（M12b-33）：col.coding 含 lineId 时格底叠 25% 类别色、描 2px 类别色边（稀有度记号照常画在上面） */
  line?: number;
  /** 格底状态值 0~1（M12b-01，st.statusMark = slotTint：饥荒的新鲜度 1 绿 → 0.5 黄 → 0 红）；不给 = 不着色 */
  tint?: number;
  /** 格下标牌的字与等级（M12b-01，cmp.slotLabel：below / plate 写名字、levelTag 写「Lv.等级」） */
  label?: string; level?: number;
  /** 空格的画法由调用方定（B7 审查修复 ⑳ / ㉚：溢出格固定 dashed、托盘里没选 st.emptySlot 时 blank），不给时按 st.emptySlot */
  emptyMode?: string;
  /** 不画格底与格框（R4 C2 ⑨，cmp.slot = bare 的格组：图标直接放在底上）；选中 / 焦点 / 稀有度等记号照旧沿方框画 */
  bare?: boolean };
/** 选中抬起的高度（M12b-01，st.selected = lift；卡牌 M12b-12 / 69 复用）：格高 / 卡高的 12%，至少 3 */
export const liftOf = (h: number) => Math.max(3, h * 0.12);
/**
 * 格下标牌（M12b-01，cmp.slotLabel，按 @slot → @元素 → 全局，选过才画）：none 不画；below = 格子正下方一行小字；plate = 压在格子下沿的小牌
 * （Disco 思想柜：已内化 = 强调色底、研究中 = 米白底、锁定 / 空格淡）；levelTag = 格下正中挂一枚「Lv.N」小牌（Hades 恩赐）。返回标牌占格子下沿以下多高（排版预留用）
 */
export function slotLabelOf(e0: ElCtx): string { return pickedStr(e0.part('slot'), 'cmp.slotLabel', 'none'); }
export function slotLabelH(e0: ElCtx, h: number): number {
  const m = slotLabelOf(e0);
  if (m === 'none') return 0;
  const fs = Math.min(e0.small.size, Math.max(8, h * 0.24));
  return m === 'below' ? fs * 1.5 + 2 : m === 'plate' ? fs * 1.55 * 0.82 : fs * 1.4 + 2;
}
export function slot(e0: ElCtx, r: Rect, ch: string, opts: SlotOpts = {}) {
  // 格子连同里面的图标、角标一起按 vis.skew 斜切（M12a-06；在已经斜过的元素里不再斜）
  const e = e0.part('slot');
  // 选中抬起（st.selected = lift，M12b-01）：整格往上抬 12%、底下一块软投影（Balatro 选中的牌、抬起的格子）
  const lift = opts.selected && !opts.empty && e.v.str('st.selected', '') === 'lift' ? liftOf(r.h) : 0;
  if (!lift) { withSkew([e.g, e.tx], r, e.th.boxSkew, () => slotBody(e0, r, ch, opts)); return; }
  const g = e.g, ctxs = e.tx === g ? [g] : [g, e.tx];
  g.save(); g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h, r.w * 0.44, Math.max(2, r.h * 0.07), 0, 0, Math.PI * 2); g.fill(); g.restore();
  for (const c of ctxs) { c.save(); c.translate(0, -lift); }
  try { withSkew([e.g, e.tx], r, e.th.boxSkew, () => slotBody(e0, r, ch, opts)); } finally { for (const c of ctxs) c.restore(); }
}
/** 格底状态色的演示值（M12b-01，st.statusMark = slotTint 选过、样本没声明 freshness 时）：新鲜 → 快坏 → 腐烂 */
export const FRESH_DEMO = [1, 0.78, 0.52, 0.3, 0.1, 0.9];
/** 格底按状态着色开没开（st.statusMark = slotTint，按 @slot → @元素 → 全局，选过才算） */
export const slotTintOn = (e: ElCtx) => pickedStr(e.part('slot'), 'st.statusMark', '') === 'slotTint';
/** 格底状态色（M12b-01 的 slotTint）：1 = 好色、0.5 = 警告色、0 = 坏色，中间线性混合 */
export function tintColor(e: ElCtx, v: number): string {
  const t = Math.max(0, Math.min(1, v));
  return t >= 0.5 ? mix(e.warn, e.good, (t - 0.5) * 2) : mix(e.bad, e.warn, t * 2);
}
/** 稀有度的档位字（M12b-01：st.rarityCue = roman 罗马数字、label 稀有度文字——只用 ASCII，不进中文字体子集） */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const RARITY_WORD = ['COMMON', 'RARE', 'EPIC', 'HEROIC', 'LEGENDARY', 'DUO'];
export const rarityWord = (tier: number) => RARITY_WORD[Math.max(0, Math.min(RARITY_WORD.length - 1, tier))];
export const romanOf = (n: number) => ROMAN[Math.max(0, Math.min(ROMAN.length - 1, n))];
/** 灯泡记号（M12b-01，st.locked = prototype：饥荒「原型」——要在附近的工作台解锁） */
export function drawBulb(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, s * 0.09);
  g.beginPath(); g.arc(cx, cy - s * 0.12, s * 0.32, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(cx + s * 0.13, cy + s * 0.28); g.lineTo(cx - s * 0.13, cy + s * 0.28); g.closePath(); g.fill();
  g.fillRect(cx - s * 0.13, cy + s * 0.32, s * 0.26, s * 0.08); g.fillRect(cx - s * 0.1, cy + s * 0.44, s * 0.2, s * 0.06);
  g.restore();
}
function slotBody(e0: ElCtx, r: Rect, ch: string, opts: SlotOpts) {
  // 格子部件（M12a-01）：外形 / 颜色 token 与格子状态 st.* 都按 @slot → @元素 → 全局查
  const e = e0.part('slot');
  // 状态取值；none（M12a-09）= 这个状态在这里不画
  const st = (k: string, def: string) => { const v = e.v.str(k, def); return v === 'auto' ? def : v; };
  const g = e.g;
  const lockMode0 = opts.locked ? st('st.locked', 'lock') : '';
  const lockMode = lockMode0 === 'none' ? '' : lockMode0;
  const emptyMode = opts.empty ? opts.emptyMode ?? st('st.emptySlot', 'plus') : '';
  // 选中的样子（M12b-01 起 fill / brighten 要在图标之前铺底，所以先取出来）
  const selMode0 = opts.selected && !opts.empty ? st('st.selected', 'outline') : '';
  const selMode = selMode0 === 'none' ? '' : selMode0;
  if (emptyMode === 'hidden') return;
  logTarget(g, r, ch, 'slot');
  // 格子的外形（M12a-09 的 shapeStyle）：vis.silhouette@slot / @元素（圆坑、菱形思想槽、六角……），box / 没选时跟皮肤面板的转角走（直角 = 0，旧皮肤没选转角时仍是原来的 6px）；
  // 冷却罩、选中框、稀有度描边、内凹边都沿这个外形；面用控件盒子（M12a-03 的 col.control，默认 = 面板）
  const cp = e.t.control ?? e.t.panel;
  // 外框结构（ast.frame 九宫格）删掉了面板描边、格子又不画外框（M12b-68，hades#1：恩赐格没有金边）：按目标（@slot / @元素）写了描边参数时按 t.edge 补回描边参数算出的那圈边
  // （只认作用域键：全局的描边是给面板的，外框皮肤上的格子原来就没有描边，不跟着变）
  const fe = cp.frame && !hasEdge({ ...cp, frame: undefined }) && e.t.edge && strokeScoped(e) ? e.t.edge : null;
  const sty0 = shapeStyle(e0, 'slot', { ...cp, ...(fe ?? {}), shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0, radius: typeof cp.radius === 'number' ? Math.min(cp.radius, 8) : cp.radius }, r, 6);
  const sty = opts.bare ? { ...sty0, bare: true } : sty0;
  const outline = () => { g.beginPath(); boxPath(g, r, sty); };
  // 内凹边：格子与底下的面板同底（对比 < 1.15）、自己又没有描边时会看不见（新皮肤），或显式选了 vis.depth = bevel / innerShadow（旧皮肤要皮肤之后选的）
  const depth = e.v.str('vis.depth', ''), depthKey = cmpKey(e, 'vis.depth');
  const under = !e.th.legacy && !sty.bare && !hasEdge(sty) ? colorUnder(g, r.x + r.w / 2, r.y + r.h / 2) : null, face = under ? faceColor(sty, e.pal) : null;
  const inset = !sty.bare && emptyMode !== 'dashed' && emptyMode !== 'blank' && emptyMode !== 'slashed'
    && (((depth === 'bevel' || depth === 'innerShadow') && (!e.th.legacy || chosen(e, depthKey))) || (!!under && !!face && contrastRatio(setOpaque(face), setOpaque(under)) < 1.15));
  if (emptyMode === 'dashed') { g.save(); g.setLineDash([4, 3]); g.strokeStyle = withAlpha(e.text, 0.45); g.lineWidth = 1.5; outline(); g.stroke(); g.restore(); }
  // 斜杠空格（M12b-01，black-myth#20：未装备的第 4 格 = 细线外形 + 一道斜杠，不铺底）
  else if (emptyMode === 'slashed') {
    g.save(); g.strokeStyle = withAlpha(e.text, 0.42); g.lineWidth = 1; outline(); g.stroke(); outline(); g.clip();
    g.beginPath(); g.moveTo(r.x + r.w * 0.18, r.y + r.h * 0.82); g.lineTo(r.x + r.w * 0.82, r.y + r.h * 0.18); g.lineWidth = 1.5; g.stroke(); g.restore();
  }
  else if (emptyMode !== 'blank' && !sty.bare) drawBox(g, r, emptyMode === 'pit' ? { ...sty, bg: { solid: withAlpha('#000', 0.35) } } : sty, e.pal);
  // 凹槽立体（vis.depth@well，M12b-36）选过时内凹边按凹槽 token 画（像素倒角 / 平……），否则原来的内凹边
  if (inset && e.t.well && chosenKey(e, 'vis.depth@well')) drawBox(g, r, { ...sty, bg: undefined, border: undefined, sides: undefined, cornerMarks: undefined, ring: undefined, ornament: undefined, fx: undefined, frame: undefined, material: undefined, overlay: undefined, gloss: undefined, finish: undefined, wear: undefined, shadows: e.t.well.shadows }, e.pal);
  else if (inset) insetEdge(g, r, sty, Math.max(1, e.th.pixel), e.pal);
  if (opts.empty) {
    const glyphs: Record<string, string> = { plus: '+', question: '?', silhouette: ch };
    // 空格的记号（审查修复 · 实测：35% 的「+」在深色格子上只有 2.95 : 1，差一点到图形的 3 : 1）：品质下限开着时 44%（淡字抬升从 45% 起算，不碰），仍明显比有物品的格子淡
    if (glyphs[emptyMode]) icon(e, glyphs[emptyMode], r.x + r.w / 2, r.y + r.h / 2, r.h * 0.42, withAlpha(e.text, QUALITY.on && isHudCanvas(g) ? 0.44 : 0.35));
    // 母题空格（M12b-01，cult-of-the-lamb#0：空状态里画当前母题的符号——五芒星 / 眼 / 王冠……；没有母题时菱形）
    if (emptyMode === 'motif') {
      const m = e.t.panel.ornament?.motif, d = Math.min(r.w, r.h) * 0.46;
      g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.fillStyle = withAlpha(ornColor(e), 0.45); g.strokeStyle = withAlpha(ornColor(e), 0.45); g.lineWidth = Math.max(1, d * 0.08);
      glyph(g, !m || m === 'none' ? 'diamond' : m, d, e.t.panel.ornament?.level ?? 1); g.restore();
    }
    // 空格不画格下标牌（B7 审查修复 ⑩：这里原来调 slotLabel，它见 opts.empty 直接返回，是一句空调用）
    return;
  }
  // 整格选中 / 提亮（M12b-01：st.selected = fill —— Disco 已装备的格子整格填橙、饥荒选中的头像整格金黄；brighten —— Elden 聚焦格底色提亮成暖米）
  if (selMode === 'fill') { g.save(); outline(); g.fillStyle = withAlpha(e.focus, 0.92); g.fill(); g.restore(); }
  else if (selMode === 'brighten') { g.save(); outline(); g.fillStyle = withAlpha(mix(e.focus, '#fff', 0.55), 0.3); g.fill(); g.restore(); }
  // 压入（M12b-63，K1 新拟态：选中 = 内凹）：格子里左上一道暗、右下一道亮的内阴影，像按下去
  else if (selMode === 'inset') {
    g.save(); outline(); g.clip();
    const gr = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); gr.addColorStop(0, 'rgba(0,0,0,0.32)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.06)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.3)');
    g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h); g.restore();
  }
  // 格底状态色（M12b-01，st.statusMark = slotTint：饥荒新鲜度 绿 → 黄 → 红）
  if (opts.tint !== undefined) { g.save(); outline(); g.fillStyle = withAlpha(tintColor(e, opts.tint), 0.45); g.fill(); g.restore(); }
  // 红底锁定（M12b-01，st.locked = redTint：Factorio 不可研究的科技 = 条件不满足）：图标照画在红底上
  if (lockMode === 'redTint') { g.save(); outline(); g.fillStyle = withAlpha(e.bad, 0.5); g.fill(); g.restore(); }
  // 类别 / 流派色（M12b-33，dead-cells#2）：col.coding 含 lineId 时格底叠一层类别色、描类别色边
  const lc = lineColor(e, opts.line);
  if (lc && !opts.empty) { g.save(); outline(); g.clip(); g.fillStyle = withAlpha(lc, 0.25); g.fillRect(r.x, r.y, r.w, r.h); g.restore(); g.save(); g.strokeStyle = lc; g.lineWidth = 2; outline(); g.stroke(); g.restore(); }
  // 稀有度（st.rarityCue 可多选：边框色、底色、星级、光效色、框形状、字母、侧边色条）；皮肤之后的层显式给了 col.coding 又不含 rarity 时不画（M12a-09）
  // 角标排进外形的内切区（M12b-67）：方框时就是格子本身（原来的位置）
  const ib = innerRect(shapeName(sty), r);
  if (opts.rarity !== undefined && !opts.empty && rarityShown(e)) {
    const rc = rarityColor(e, opts.rarity);
    // 没人给时默认画边框色；显式清空（["none"] / []，M12a-07）就一种都不画
    const cues = e.v.list('st.rarityCue').filter((x) => x !== 'auto');
    const cueLayer = e.v.src('st.rarityCue')?.layer;
    const list = cues.length || (cueLayer && cueLayer !== 'default' && cueLayer !== 'fallback') ? cues : ['border'];
    // 侧条与星级的位置（st.rarityPos，M12a-09）：auto = 侧条贴左、星级在底边（原来的画法）
    const pos = st('st.rarityPos', 'auto');
    g.save();
    if (list.includes('bg')) { g.globalAlpha = 0.35; outline(); g.fillStyle = rc; g.fill(); g.globalAlpha = 1; }
    if (list.includes('rarityGlow')) { g.shadowColor = rc; g.shadowBlur = 10 + opts.rarity * 3; }
    if (list.includes('border') || list.includes('rarityGlow')) { g.strokeStyle = rc; g.lineWidth = 2.5; outline(); g.stroke(); }
    g.shadowBlur = 0;
    if (list.includes('frameShape')) {
      // 越稀有角越多：普通方、稀有切角、史诗菱角、传说星角
      g.fillStyle = rc;
      const k2 = Math.max(4, r.h * 0.18);
      const corners: [number, number, number, number][] = [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x + r.w, r.y + r.h, -1, -1], [r.x, r.y + r.h, 1, -1]];
      for (const [x, y, sx, sy] of corners.slice(0, opts.rarity >= 3 ? 4 : opts.rarity >= 1 ? 2 : 0)) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * k2, y); g.lineTo(x, y + sy * k2); g.closePath(); g.fill(); }
    }
    if (list.includes('strip')) {
      g.fillStyle = rc;
      const t = Math.max(3, (pos === 'top' || pos === 'bottom' ? r.h : r.w) * 0.06);
      if (pos === 'top' || pos === 'bottom') { g.save(); outline(); g.clip(); g.fillRect(r.x, pos === 'top' ? r.y : r.y + r.h - t, r.w, t); g.restore(); }
      else g.fillRect(ib.x, ib.y, Math.max(3, r.w * 0.06), ib.h);
    }
    g.restore();
    if (list.includes('stars')) for (let i = 0; i <= opts.rarity; i++) icon(e, '★', ib.x + ib.w * 0.2 + i * ib.w * 0.15, pos === 'top' ? ib.y + r.h * 0.12 : ib.y + ib.h - r.h * 0.1, r.h * 0.16, rc);
    if (list.includes('letter')) { const L = ['N', 'R', 'SR', 'SSR', 'UR'][opts.rarity]; T(e, L, ib.x + 3, ib.y + 1, r.h * 0.26, { ...e.small, size: r.h * 0.2, weight: 900, color: rc, outline: { color: 'rgba(0,0,0,0.6)', width: 1 } }); }
    // 表面处理（st.rarityCue = finish，M12b-52）：档位 → 版本（普通无、罕见箔、稀有镭射、史诗多彩、传说玻璃 + 多彩），叠在格面上、沿外形裁剪
    if (list.includes('finish') && opts.rarity > 0) { g.save(); outline(); g.clip(); drawFinish(g, r, RARITY_FINISH[Math.min(opts.rarity, RARITY_FINISH.length - 1)], outline, lightFace(faceColor(sty, e.pal))); g.restore(); }
    rarityMarks(e, r, ib, list, opts.rarity, rc, outline, opts.line);
  }
  // 锁定的新画法（M12a-09）：lock = 整格压暗到 0.45 + 挂锁，✕ 只留给 sealed；旧皮肤没在皮肤之后显式选 st.locked 时仍是原来的右上 ✕（对照图不变）
  const oldLock = e.th.legacy && !chosenKey(e, 'st.locked');
  // 冷却（st.cooldown）：none 不画；desat（M12a-09）= 图标本身去色压暗（grayscale + brightness 0.7），不再铺一块灰底
  const cdMode0 = opts.cd ? st('st.cooldown', 'radialWipe') : '';
  const cdMode = cdMode0 === 'none' ? '' : cdMode0;
  // 回合禁用（M12b-01，st.cooldown = turnLocked：StS 敌方回合整块去色）：与 desat 同样去色，再压一层暗
  const turnLocked = cdMode === 'turnLocked';
  const desat = (cdMode === 'desat' && !(e.th.legacy && !chosenKey(e, 'st.cooldown'))) || turnLocked;
  // 图标：锁定的按模式压暗 / 去色 / 剪影；图集素材开着时画物品图标（格子的 72%），没加载完 / 不是物品时画符号
  // 整格选中填色时图标取强调色底上的字色（M12b-01）；原型锁定时图标淡一半
  const iconColor = lockMode === 'grayscale' || lockMode === 'dimmed' ? withAlpha(e.text, 0.35) : lockMode === 'silhouette' ? '#111' : lockMode === 'prototype' ? withAlpha(e.icon, 0.5)
    : selMode === 'fill' ? resolveColor(e.t.onAccent ?? '#fff', e.pal) : e.icon;
  // 图标那几段字在绘制记录里的范围（冷却秒数居中压在图标上时，被盖住的图标不算可读性检查的字，见下）
  const iconLog0 = DRAW_LOG.texts.length;
  let iconLog1 = iconLog0;
  if (lockMode !== 'question' && lockMode !== 'sealed' && lockMode !== 'hiddenText') {
    const ctxs = e.tx === g ? [g] : [g, e.tx];
    if (desat) for (const c of ctxs) { c.save(); c.filter = 'grayscale(1) brightness(0.7)'; }
    if (!atlasItem(e, opts.item ?? ch, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.72, lockMode)) {
      // 格子的物品名（item，没有时格下标牌的名字 label）：对得上物品图标时符号画成那样东西（审查修复 E 视觉 ⑦⑧）
      const i0 = ICON_CTX.item;
      if (QUALITY.on && (opts.item || opts.label)) ICON_CTX.item = opts.item || opts.label || null;
      ICON_CTX.items++;
      try { glyphIcon(e, ch, opts.item, r.x + r.w / 2, r.y + r.h / 2, r.h * 0.46, iconColor); } finally { ICON_CTX.item = i0; ICON_CTX.items--; }
    }
    if (desat) for (const c of ctxs) c.restore();
    iconLog1 = DRAW_LOG.texts.length;
  }
  if (lockMode === 'lock' && !oldLock) {
    g.save(); outline(); g.clip(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(r.x, r.y, r.w, r.h); g.restore();
    drawPadlock(g, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.4, withAlpha(e.text, 0.92));
  }
  if ((lockMode === 'lock' && oldLock) || lockMode === 'sealed') icon(e, '✕', r.x + r.w - r.h * 0.22, r.y + r.h * 0.24, r.h * 0.26, withAlpha(e.text, 0.85));
  if (lockMode === 'sealed') { g.save(); outline(); g.clip(); g.strokeStyle = e.bad; g.lineWidth = 2; g.beginPath(); g.moveTo(r.x + 4, r.y + 4); g.lineTo(r.x + r.w - 4, r.y + r.h - 4); g.moveTo(r.x + r.w - 4, r.y + 4); g.lineTo(r.x + 4, r.y + r.h - 4); g.stroke(); g.restore(); }
  if (lockMode === 'question' || lockMode === 'hiddenText') icon(e, '?', r.x + r.w / 2, r.y + r.h / 2, r.h * 0.46, withAlpha(e.text, 0.5));
  // 原型（M12b-01，dont-starve#30）：警告色虚线框 + 右上一枚灯泡
  if (lockMode === 'prototype') {
    g.save(); g.setLineDash([4, 3]); g.strokeStyle = e.warn; g.lineWidth = 1.5; outline(); g.stroke(); g.restore();
    drawBulb(g, ib.x + ib.w - r.h * 0.16, ib.y + r.h * 0.18, r.h * 0.3, e.warn);
  }
  if (turnLocked) { g.save(); outline(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); g.restore(); }
  if (cdMode && !desat) {
    const mode = cdMode;
    // 淡扫掠（整合修复 U#17：原来 55% 黑的大扇形 + 格高 42% 的大数字盖住图标，快捷栏像一排坏图标）：品质下限开着、画在 HUD 主画布上时罩子 24% 黑，图标透得出来
    const subtle = QUALITY.on && isHudCanvas(g), wipeC = subtle ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.55)';
    g.save(); outline(); g.clip();
    if (mode === 'radialWipe') {
      g.fillStyle = wipeC; g.beginPath(); g.moveTo(r.x + r.w / 2, r.y + r.h / 2);
      g.arc(r.x + r.w / 2, r.y + r.h / 2, r.w, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (opts.cd ?? 0)); g.closePath(); g.fill();
      // 扫掠的前沿一道细亮线：看得出是「正在转回来的冷却」，不是缺了一角的图标
      if (subtle) { const a1 = -Math.PI / 2 + Math.PI * 2 * (opts.cd ?? 0), cx = r.x + r.w / 2, cy = r.y + r.h / 2; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, r.h * 0.03); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a1) * r.w, cy + Math.sin(a1) * r.w); g.stroke(); }
    } else if (mode === 'fillUp') { g.fillStyle = wipeC; g.fillRect(r.x, r.y, r.w, r.h * (opts.cd ?? 0)); }
    else { g.fillStyle = mode === 'desat' ? 'rgba(128,128,128,0.6)' : 'rgba(0,0,0,0.5)'; g.fillRect(r.x, r.y, r.w, r.h); }
    g.restore();
    // 冷却秒数（§8 RC6，轨道 E）：扇形 / 自下而上的冷却罩也写剩余秒数（原来只有 dimNumber 写，扇形罩看着像一块灰色缺角）
    if (mode === 'dimNumber' || (QUALITY.on && (mode === 'radialWipe' || mode === 'fillUp'))) {
      const n = String(Math.ceil((opts.cd ?? 0) * 8)), no = { ...e.title, color: '#fff', outline: { color: 'rgba(0,0,0,0.8)', width: 1.5 } };
      // 遮罩进绘制记录（审查修复 ⑪：dimNumber 的整格压暗没登记，白字按浅格算只有 1.1 : 1）
      if (mode === 'dimNumber') logBoxRect(g, r, 'rgba(0,0,0,0.5)');
      // 扇形 / 自下而上的冷却（审查修复 E 视觉 ⑭：原来秒数写在格子底边的黑圆牌上、像没做完）：秒数白字 + 深色描边居中压在图标上。
      // 整合修复 U#17：小数字（格高 28%，不小于固定尺寸小字的下限；原来 42%，比图标还大），底下的暗晕也收小、变淡
      if (QUALITY.on && mode !== 'dimNumber' && isHudCanvas(g)) {
        const so = { ...e.title, weight: 800, color: '#fff', size: Math.max(e.small.size, Math.min(e.title.size, r.h * 0.28)), fixedSize: true, outline: { color: 'rgba(0,0,0,0.85)', width: 2, widthEm: 0.14 }, noHalo: true };
        // 数字底下一小团柔和的暗晕（扫掠罩一半亮一半暗，字压在分界上也读得出），进绘制记录
        { const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rr = Math.min(r.w, r.h) * 0.24, gr = g.createRadialGradient(cx, cy, rr * 0.3, cx, cy, rr); gr.addColorStop(0, 'rgba(0,0,0,0.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); outline(); g.clip(); g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); g.restore(); logBoxRect(g, { x: cx - rr * 0.6, y: cy - rr * 0.6, w: rr * 1.2, h: rr * 1.2 }, 'rgba(0,0,0,0.32)'); }
        // 冷却中的图标被秒数盖住（有意压暗、不可用）：从绘制记录里拿掉，可读性检查只查秒数本身
        if (DRAW_LOG.on && iconLog1 > iconLog0) DRAW_LOG.texts.splice(iconLog0, iconLog1 - iconLog0);
        T(e, n, r.x + r.w / 2 - W(e, n, so) / 2, r.y, r.h, so);
      } else T(e, n, r.x + r.w / 2 - W(e, n, no) / 2, r.y, r.h, no);
    }
  }
  // 角标小牌（§8 RC6）：品质下限开着、画在 HUD 主画布上时画成小牌；皮肤之后显式选了角标的画法 / 位置（cmp.slotBadge / slotBadgePos）时照原来的细字（审查修复 ⑨）
  const chipsOn = QUALITY.on && isHudCanvas(g) && !postSkinKey(e, 'cmp.slotBadge') && !postSkinKey(e, 'cmp.slotBadgePos');
  // 角标小字贴在固定大小的格子上：不随文字缩放，最大到格子高的 26%，免得键位和数量撞在一起
  // 角标字：控件字色（col.controlText）给了就用它，否则正文色（键位再淡一点）
  const cText = e.t.controlText ? resolveColor(e.t.controlText, e.pal) : e.text;
  const badgeO = { ...e.small, size: Math.min(e.small.size, r.h * 0.26), fixedSize: true, ...(e.t.controlText ? { color: cText } : {}) };
  // 数量角标（cmp.slotBadge / slotBadgePos，M12a-09）：auto = 给了就画在右下（原来的画法）；qtyOver1 = 只画大于 1 的；none = 不画；位置右下 / 左上 / 底边居中。
  // 数量在左上时键位挪到右上
  const qtyMode = cmp(e, 'cmp.slotBadge', 'qty'), qtyPos = cmp(e, 'cmp.slotBadgePos', 'br');
  // 锁定的格子不写数量（M12b-67，cult-of-the-lamb#42：没解锁的建筑不该有持有数）；旧皮肤画原来的 ✕ 锁时照旧写
  const lockedQty = !!lockMode && !(lockMode === 'lock' && oldLock);
  const qty = opts.qty && qtyMode !== 'none' && !lockedQty && !(qtyMode === 'qtyOver1' && !(Number(opts.qty.replace(/[^\d.]/g, '')) > 1)) ? opts.qty : '';
  // 角标排进内切区会不会压到中间的符号（终期审查修复 ⑤）：菱形的内切区就是格子中间那一半、正好是符号的位置（Hades 技能格的键位 1–4 压在符号上）——
  // 压到了就退回格子外接框的角（B1 · 67 之前的位置）；符号框 = 字宽 × 字号（glyphIcon 的 0.46 格高）
  // （只在内切区不是格子本身时才量符号宽：方框的格子调用序列不变）
  const gs = r.h * 0.46;
  const hitsGlyph = (x: number, y: number, w: number, h: number) => {
    const gw = ch && !opts.empty ? W(e, ch, { ...e.base, size: gs }) : 0;
    return gw > 0 && x < r.x + r.w / 2 + gw / 2 && x + w > r.x + r.w / 2 - gw / 2 && y < r.y + r.h / 2 + gs / 2 && y + h > r.y + r.h / 2 - gs / 2;
  };
  if (qty) {
    // 数量走数字字形（M12b-07 的 drawNumber / numberWidth，B7 换：没给 typ.numerals.* 时与 T / W 一样）
    const w = numberWidth(e, qty, badgeO);
    const qAt = (b: Rect) => ({ x: qtyPos === 'tl' ? b.x + 3 * e.k : qtyPos === 'bottom' ? b.x + b.w / 2 - w / 2 : b.x + b.w - w - 3 * e.k, y: qtyPos === 'tl' ? b.y + 1 : b.y + b.h - badgeO.size * 1.4 });
    let qp = qAt(ib);
    if (ib !== r && hitsGlyph(qp.x, qp.y, w, badgeO.size * 1.3)) qp = qAt(r);
    if (chipsOn) {
      // 数量小牌（§8 RC6，轨道 E；审查修复 ⑨：按皮肤取色）：格内角上的小圆角牌——底 = 皮肤字色、字 = 面板底色（浅色皮肤是墨色牌、深色皮肤是浅色牌），转角跟键帽
      const cs = slotChip(e, 'qty'), qo = { ...badgeO, weight: 800, color: cs.color }, qh = Math.max(flooredSize(qo) * 1.25, 14 * e.k), qw = Math.max(qh, numberWidth(e, qty, qo) + 6 * e.k);
      const qx = qtyPos === 'tl' ? r.x + 1.5 * e.k : r.x + r.w - qw - 1.5 * e.k, qy = qtyPos === 'tl' ? r.y + 1.5 * e.k : r.y + r.h - qh - 1.5 * e.k;
      drawBox(g, { x: qx, y: qy, w: qw, h: qh }, cs.box(qh), e.pal);
      drawNumber(e, qty, qx + qw / 2 - numberWidth(e, qty, qo) / 2, qy, qh, qo);
    } else drawNumber(e, qty, qp.x, qp.y, badgeO.size * 1.3, badgeO);
  }
  // 耐久（M12a-20 的 elx.durability：bottomPct = 底边百分比字，bar = 底边细条）
  if (opts.durability !== undefined) durabilityMark(e, r, opts.durability, badgeO);
  if (opts.key && chipsOn) {
    // 键位小牌（§8 RC6，轨道 E；审查修复 ⑨：按皮肤的键帽 token 取色——底 / 字 / 转角，ix.glyphs = brackets 时写成 [1]）：压在格子左上角，
    // 不再细字挤在格子边框里；数量在左上时挪到右上。牌在格子框以内（元素的命中框 / 占位不变）
    const cs = slotChip(e, 'key'), key = cs.brackets ? `[${opts.key}]` : opts.key, ko = { ...badgeO, weight: 800, color: cs.color }, kh = Math.max(flooredSize(ko) * 1.25, 14 * e.k), kw = Math.max(kh, W(e, key, ko) + 6 * e.k);
    const kx = qty && qtyPos === 'tl' ? r.x + r.w - kw - 1.5 * e.k : r.x + 1.5 * e.k, ky = r.y + 1.5 * e.k;
    drawBox(g, { x: kx, y: ky, w: kw, h: kh }, cs.box(kh), e.pal);
    T(e, key, kx + kw / 2 - W(e, key, ko) / 2, ky, kh, ko);
  } else if (opts.key) {
    const key = opts.key, kAt = (b: Rect) => ({ x: qty && qtyPos === 'tl' ? b.x + b.w - W(e, key, badgeO) - 3 * e.k : b.x + 3 * e.k, y: b.y + 1 });
    let kp = kAt(ib);
    if (ib !== r && hitsGlyph(kp.x, kp.y, W(e, key, badgeO), badgeO.size * 1.3)) kp = kAt(r);
    T(e, opts.key, kp.x, kp.y, badgeO.size * 1.3, { ...badgeO, color: withAlpha(cText, 0.8) });
  }
  if (opts.selected && st('st.selected', 'outline') !== 'none') {
    // 选中描边用焦点色（col.focus，auto = 强调色，M12a-03）
    const mode = st('st.selected', 'outline'), fc = e.focus;
    if (mode === 'glow') { g.save(); g.shadowColor = fc; g.shadowBlur = 12; g.strokeStyle = fc; g.lineWidth = 2.5; outline(); g.stroke(); g.restore(); }
    else if (mode === 'bar') { g.fillStyle = fc; g.fillRect(r.x, r.y + r.h + 2, r.w, 3); }
    // 勾在左上、「NEW」在右上（审查修复 E 视觉 ⑦：原来勾在右上、NEW 在左上，相邻两格的两个角标撞在一起）；格子有键位小牌时勾仍在右上
    else if (mode === 'check' || mode === 'badge') badge(e, chipsOn && !opts.key ? r.x + 4 : r.x + r.w - 4, r.y + 4, Math.max(6, r.h * 0.14), 'crystal', mode === 'check' ? '✓' : '');
    // M12b-01：fill / lift 不再描边（底色 / 抬起已经说明了）；brighten = 提亮 + 1px 细框；dashed = 焦点色虚线框（Control 的已装配改造卡）
    else if (mode === 'fill' || mode === 'lift' || mode === 'inset') { /* 铺底 / 抬起 / 压入在前面画过了 */ }
    else if (mode === 'brighten') { g.save(); g.strokeStyle = fc; g.lineWidth = 1; outline(); g.stroke(); g.restore(); }
    else if (mode === 'dashed') { g.save(); g.setLineDash([5, 3]); g.strokeStyle = fc; g.lineWidth = 2; outline(); g.stroke(); g.restore(); }
    else { g.save(); g.strokeStyle = fc; g.lineWidth = 2.5; outline(); g.stroke(); g.restore(); }
  }
  if (opts.fresh) {
    const mode = st('st.newCue', 'redDot');
    if (mode === 'redDot' || mode === 'glowPulse') { g.fillStyle = e.bad; g.beginPath(); g.arc(r.x + r.w - 3, r.y + 3, Math.max(3, r.h * 0.08), 0, Math.PI * 2); g.fill(); }
    else if (mode === 'newTag') plate(e, { x: chipsOn ? r.x + r.w * 0.42 + 2 : r.x - 2, y: r.y - 6, w: r.w * 0.6, h: Math.max(10, r.h * 0.22) }, 'NEW', 'rect', { size: Math.max(8, r.h * 0.16) });
    else if (mode === 'count') badge(e, r.x + r.w - 3, r.y + 3, Math.max(6, r.h * 0.13), 'medal', '2');
  }
  slotLabel(e0, r, opts);
}

/**
 * 稀有度的角落记号（M12b-01，st.rarityCue 的新取值）：cornerIcon = 左下角一枚品质小徽（圆角方块 + 白菱，Factorio 2.0）、cornerStar = 左下角一颗星（普通档不画，银 / 金 / 铱紫，Stardew）、
 * roman = 右上细罗马数字（Control 的 I / II）、cornerTab = 右上角一道斜条（色 = 类别色（col.coding 含 lineId）或稀有度色，Hades 的神祇斜条）、label = 底边稀有度文字（COMMON / RARE…，Hades）
 */
function rarityMarks(e: ElCtx, r: Rect, ib: Rect, list: string[], tier: number, rc: string, outline: () => void, line?: number) {
  const g = e.g, s = Math.max(6, Math.min(r.w, r.h));
  if (list.includes('cornerTab')) {
    const c = lineColor(e, line) ?? rc, d = s * 0.34;
    g.save(); outline(); g.clip(); g.fillStyle = c; g.beginPath(); g.moveTo(r.x + r.w - d, r.y); g.lineTo(r.x + r.w - d * 0.55, r.y); g.lineTo(r.x + r.w, r.y + d * 0.45); g.lineTo(r.x + r.w, r.y + d); g.closePath(); g.fill(); g.restore();
  }
  if (list.includes('cornerIcon')) {
    const d = s * 0.24, x = ib.x + 2, y = ib.y + ib.h - d - 2;
    g.save(); g.fillStyle = rc; g.beginPath(); g.roundRect(x, y, d, d, d * 0.22); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + d / 2, y + d * 0.2); g.lineTo(x + d * 0.8, y + d / 2); g.lineTo(x + d / 2, y + d * 0.8); g.lineTo(x + d * 0.2, y + d / 2); g.closePath(); g.fill(); g.restore();
  }
  if (list.includes('cornerStar') && tier > 0) icon(e, '★', ib.x + s * 0.14, ib.y + ib.h - s * 0.14, s * 0.24, rc);
  if (list.includes('roman')) { const t = romanOf(tier), o: TextOpts = { ...e.small, size: Math.max(7, s * 0.2), weight: 300, fixedSize: true, color: rc }; T(e, t, ib.x + ib.w - W(e, t, o) - 3, ib.y + 1, o.size * 1.3, o); }
  if (list.includes('label')) {
    const t = rarityWord(tier), o: TextOpts = { ...e.small, size: Math.max(6, Math.min(e.small.size, s * 0.15)), weight: 800, fixedSize: true, color: rc }, h = o.size * 1.5;
    g.save(); outline(); g.clip(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(r.x, r.y + r.h - h, r.w, h); g.restore();
    T(e, t, r.x + r.w / 2 - W(e, t, o) / 2, r.y + r.h - h, h, o);
  }
}

/** 格下标牌（M12b-01，见 slotLabelOf）：画在格子下沿；空格不画 */
function slotLabel(e0: ElCtx, r: Rect, opts: SlotOpts) {
  const mode = slotLabelOf(e0);
  if (mode === 'none' || opts.empty) return;
  const e = e0.part('slot'), g = e.g, fs = Math.min(e.small.size, Math.max(8, r.h * 0.24));
  if (mode === 'levelTag') {
    const t = `Lv.${opts.level ?? 1}`, o: TextOpts = { ...e.small, size: fs, weight: 800, fixedSize: true, color: '#fff' }, w = W(e, t, o) + fs * 0.8, h = fs * 1.4;
    const x = r.x + r.w / 2 - w / 2, y = r.y + r.h + 2;
    g.save(); g.fillStyle = withAlpha('#000', 0.72); g.beginPath(); g.roundRect(x, y, w, h, h * 0.3); g.fill(); g.strokeStyle = withAlpha(e.focus, 0.8); g.lineWidth = 1; g.stroke(); g.restore();
    T(e, t, x + fs * 0.4, y, h, o);
    return;
  }
  const label = opts.label ?? '';
  if (!label) return;
  if (mode === 'below') { const o: TextOpts = { ...e.small, size: fs, fixedSize: true, color: opts.locked ? withAlpha(e.text, 0.45) : e.text }; T(e, label, r.x + r.w / 2 - W(e, label, o) / 2, r.y + r.h + 2, fs * 1.5, o); return; }
  // plate：已内化（选中）= 强调色底、研究中 = 米白底、锁定 = 暗底淡字；压住格子下沿（标牌高的 18%）
  const surf = resolveColor(e.th.surface, e.pal), bg = opts.selected ? e.accent : opts.locked ? withAlpha(mix(surf, '#000', 0.3), 0.9) : mix(surf, '#efe6d2', 0.85);
  const o: TextOpts = { ...e.small, size: fs, weight: 700, fixedSize: true, color: opts.locked ? withAlpha(e.text, 0.5) : onColorOf(bg, surf), outline: undefined, shadow: undefined };
  const h = fs * 1.55, w = Math.max(r.w * 0.9, W(e, label, o) + fs), x = r.x + r.w / 2 - w / 2, y = r.y + r.h - h * 0.18;
  g.save(); g.fillStyle = bg; g.fillRect(x, y, w, h); g.restore();
  T(e, label, x + w / 2 - W(e, label, o) / 2, y, h, o);
}

/* ---------------- 按钮（M12a-35） ---------------- */

/** 次按钮的角色（其余是主按钮：强调色底 / 按键盒子） */
const SECONDARY_ROLES = new Set<ButtonRole>(['secondary', 'back']);
/** 图标按钮（cmp.button = icon / iconText）没有自己的图标时按角色取一个符号 */
const ROLE_GLYPH: Record<ButtonRole, string> = { primary: '▶', confirm: '✓', back: '‹', danger: '✕', utility: '⚙', sell: '¥', secondary: '•' };
/** 按钮字本身就是符号（‹ × ⚄ Ⅱ 2× …）：图标按钮直接画它，不再配角色符号 */
const symbolic = (s: string) => [...s].length <= 2 && !/[A-Za-z一-鿿]/.test(s);

/** 组件参数「选过才换画法」的读法（旧皮肤只认皮肤之后的层，与 chosen() 同口径）：没选时 def（原来的画法） */
export const cmpPicked = (e: ElCtx, param: string, def: string) => pickedStr(e, param, def);
/** 按钮画不画底框（cmp.buttonBox，按 @部件 → @元素 → 全局；工具栏、菜单行同一条规则）：显式关掉才不画 */
export const buttonBoxOn = (e0: ElCtx, part = 'button') => cmpPicked(e0.part(part), 'cmp.buttonBox', 'true') !== 'false';

/**
 * 按钮字（M12a-35）：字族角色 t.button（typ.button.family：display 标题字 / numerals 数字字体，没给时正文粗体，原来的）；字号 = 显式 typ.button.size、
 * fit 时按钮高 × 0.42，否则正文字号（原来的）；下限 = 基准字号 × 0.8 × 版面缩放（按钮随 elx.scale 缩小时只缩框、字不再跟着缩到看不清）。
 * key = 按键提示的键帽：只换字族，字号照旧（键帽宽按字量）
 */
export function buttonText(e: ElCtx, h: number, key = false): TextOpts {
  const tb = e.t.button;
  // 展示字体作用到按钮（typ.display.scope 含 button，M12b-55）：没给 typ.button.family 时按钮字用展示字体
  const df = tb?.font ? {} : displayFor(e, 'button');
  const o: TextOpts = tb?.font ? { ...e.base, font: tb.font, weight: tb.weight ?? 700, ransom: tb.ransom } : { ...e.base, weight: 700, ...df };
  if (key) return o;
  const size = tb?.size !== undefined ? tb.size : tb?.fit ? h * 0.42 : o.size;
  return { ...o, size: Math.max((e.t.textSize ?? 13) * 0.8 * e.th.scale, size) };
}

/**
 * 按钮。role（M12a-35）：true / false = 原来的主 / 次按钮，或动作角色（confirm / back / danger / utility / sell……）——角色决定主次和角色色（t.button.roles：col.semantic 的配色方案、
 * col.actionColors 逐个指定；没有角色色时主按钮 = 按键盒子、次按钮 = 控件盒子，原来的样子）。外观按作用域（@部件 → @元素 → 全局）：
 *   cmp.buttonBox = false：不画底框，只画字 / 图标（角色色字，主按钮没有角色色时强调色字）；cmp.buttonFace：filled（原来的实心）/ outline（控件面 + 角色色框 + 角色色字）/ link（无框下划线字）；
 *   cmp.button：text（原来的）/ icon（只画图标：符号字本身或角色符号）/ iconText（图标 + 字）；外形 vis.silhouette（M12a-09，主次同形）；字 = buttonText。
 * tap = false：只是按键图例（键盘 / 手柄的键帽），不是能点的按钮，不进触控尺寸检查；part = 按哪个部件查作用域键（按键提示是 key：只换字族，其余照旧）。
 * Godot：Button + 类型变体 HudButton<角色>（StyleBoxFlat 的 bg_color = 角色色，outline = draw_center false + border，link = LinkButton，无底框 = Button.flat）
 */
export function button(e0: ElCtx, r: Rect, label: string, role: boolean | ButtonRole = true, tap = true, part = 'button', shape?: Silhouette) {
  const e = e0.part(part);
  const rl: ButtonRole = role === true ? 'primary' : role === false ? 'secondary' : role;
  const primary = !SECONDARY_ROLES.has(rl), key = part === 'key';
  // 按钮连字一起按 vis.skew 斜切（M12a-06；在已经斜过的元素里不再斜）
  withSkew([e.g, e.tx], r, e.th.boxSkew, () => {
    const roleC = key ? undefined : e.t.button?.roles[rl];
    // 主次差距 hier.cta = fillOutline（M12b-68 ⑩）：皮肤之后的层选了它时，次按钮没选 cmp.buttonFace 就画空心（实心主钮 + 空心次钮）
    const outlineSec = !primary && !key && postSkinKey(e, 'hier.cta') && e.r.str('hier.cta', '') === 'fillOutline';
    const face = key ? 'filled' : cmpPicked(e, 'cmp.buttonFace', outlineSec ? 'outline' : 'filled'), boxOn = key || buttonBoxOn(e0, part);
    // 次按钮用控件盒子与控件字色（M12a-03 的 col.control / col.controlText，默认 = 面板与正文色）；有角色色时用按键盒子换底色；outline = 控件面 + 角色色框
    const ctl: BoxStyle = { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 };
    const lineC = roleC ?? (primary ? e.accent : e.text);
    const base: BoxStyle = face === 'outline' ? { ...ctl, sides: undefined, cornerMarks: undefined, border: { width: Math.max(1.5, ctl.border?.width ?? 0), color: lineC } }
      : roleC ? { ...e.t.key, bg: { solid: roleC } } : primary ? e.t.key : ctl;
    // 主次按钮同一外形（M12a-09）：vis.silhouette@<部件> → @元素 → 全局；none = 只画字。
    // 箭头端（M12b-38，factorio#5）：返回 / 取消（back）是确认钮的镜像——选了 arrowRight 时返回钮自动画成 arrowLeft（反过来也一样）
    // 贴边页签钮（vis.silhouette@button / @el.cta = edgeTab，M12b-47，into-the-breach#30）也在 shapeStyle 里：外形归 vis.silhouette，cmp.button 只管里面放什么（B4 审查修复）
    const sty1 = shapeStyle(e0, part, base, r, undefined, shape);
    const sty = rl === 'back' && (sty1.shape === 'arrowRight' || sty1.shape === 'arrowLeft') ? { ...sty1, shape: sty1.shape === 'arrowRight' ? 'arrowLeft' as const : 'arrowRight' as const } : sty1;
    const bare = sty.bare || !boxOn || face === 'link';
    if (!bare) drawBox(e.g, r, sty, e.pal);
    if (tap) logTarget(e.g, r, label, 'button');
    const t0 = buttonText(e, r.h, key);
    const ctlText = e.t.controlText ? resolveColor(e.t.controlText, e.pal) : e.text;
    const o = bare || face === 'outline' ? { ...t0, color: roleC ?? (primary ? e.accent : ctlText) }
      : roleC ? onAccent(e, t0, onColorOf(roleC, resolveColor(e.th.surface, e.pal))) : primary ? onKey(e, t0) : { ...t0, color: ctlText };
    // 内容（cmp.button）：图标 = 符号字本身或角色符号
    const content = key ? 'text' : cmpPicked(e, 'cmp.button', 'text'), sym = symbolic(label);
    const glyph = sym ? label : ROLE_GLYPH[rl];
    if (content === 'icon' || (content === 'iconText' && sym)) { icon(e, glyph, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * 0.46, o.size * 1.3), o.color); return; }
    const gs = content === 'iconText' ? o.size * 1.1 : 0, gap = gs ? o.size * 0.4 : 0;
    const w = W(e, label, o), x = r.x + r.w / 2 - (w + gs + gap) / 2;
    if (gs) icon(e, glyph, x + gs / 2, r.y + r.h / 2, gs, o.color);
    T(e, label, x + gs + gap, r.y, r.h, o);
    // 下划线字（cmp.buttonFace = link）
    if (face === 'link') { e.g.fillStyle = o.color; e.g.fillRect(x + gs + gap, r.y + r.h / 2 + o.size * 0.62, w, Math.max(1, o.size * 0.08)); }
  });
  // 按钮端的键帽徽章（ast.ornamentAnchor = buttonEnd，M12b-49）：主按钮 / 确认钮的右端骑一颗键帽（E）
  // 骑在右上角（一半探出按钮）：并排的按钮之间空隙小，压在右端中段会盖住邻钮
  if (primary && !key && anchorsOf(e).includes('buttonEnd')) { const kb = e.part('keyBadge'), kh = Math.max(12 * e.k, r.h * 0.5), kw = keyCapWidth(kb, kh, 'E'); keyCap(kb, r.x + r.w - kw * 0.7, r.y - kh * 0.45, kh, 'E'); }
}

/** 面板的转角字段（头像、地图窗这类只借外形、不借底色的地方用） */
export const cornerOf = (p: BoxStyle): BoxStyle => ({ radius: p.radius, radiusPct: p.radiusPct, chamfer: p.chamfer, step: p.step, edge: p.edge, jitter: p.jitter, seed: p.seed });

/** 头像占位（剪影 + 名字首字，默认是圆，外形见下）；图集素材开着、当前包有半身立绘时里面画它的脸（敌人仍是剪影：包里的立绘只有主角一张） */
export function avatar(e0: ElCtx, cx: number, cy: number, rad: number, label: string, ring0?: string) {
  const e = e0.part('avatar');
  const ring = ring0 ?? e.accent;
  const g = e.g;
  // 外形（M12a-09）：没人选 vis.silhouette@avatar / @元素 / 全局时是圆（原来的画法）；选了就按选的外形裁剪与描外圈——
  // box = 跟转角（方形像素头像，直角时是正方形）、diamond / shield / hexagon……；none = 不画底与外圈
  const sil = silhouetteOf(e0, 'avatar');
  const box = { x: cx - rad, y: cy - rad, w: rad * 2, h: rad * 2 };
  const sty = sil && sil !== 'circle' ? shapeStyle(e0, 'avatar', cornerOf(e.t.panel), box, 0) : null;
  const path = () => { g.beginPath(); if (sty) boxPath(g, box, sty); else g.arc(cx, cy, rad, 0, Math.PI * 2); };
  g.save();
  // 包里的半身立绘只画主角那一张（审查修复 E 视觉 ⑨：原来队伍四个人画同一张脸、又只在图集图标开着时才画）
  const hero = DATA.hero, pr = pack().hud.profile;
  const own = !!label && [hero.initial, hero.name, pr.initial, pr.name].includes(label);
  const cut = renderModeOf(e0, 'character') === 'cutout';
  // 没有立绘时（审查修复 E 视觉 ⑨，「默认头像」）：按名字在皮肤的强调色 / 字色之间取一个色调的渐变圆章 + 居中的首字（不再是灰剪影 + 压在圈上的小字；建筑、载具、动物也不再画成人）。
  // 剪纸画法与没写名字的照旧画剪影
  const mono = !cut && !!label.trim() && QUALITY.on && isHudCanvas(g);
  const hue = mono ? [...label].reduce((x, ch) => (x * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4 : 0;
  const tone = mono ? mix(ring, hue === 0 ? e.text : hue === 1 ? resolveColor(e.th.surface, e.pal, e.text) : hue === 2 ? '#000000' : e.accent, [0.35, 0.5, 0.45, 0.25][hue]) : '';
  path();
  if (!sty?.bare) {
    if (mono) { const gr = g.createLinearGradient(cx, cy - rad, cx, cy + rad); gr.addColorStop(0, mix(tone, '#ffffff', 0.18)); gr.addColorStop(1, mix(tone, '#000000', 0.25)); g.fillStyle = gr; }
    else g.fillStyle = withAlpha(e.text, 0.18);
    g.fill();
  }
  g.clip();
  const art = label !== DATA.target.name && own && bustFace(e, cx, cy, rad, renderModeOf(e0, 'character'));
  if (!art && !mono) {
    // 黑白剪纸剪影（cnt.characterRender = cutout，M12b-32，persona5#24：队伍头像是面具角色的黑剪影）
    g.fillStyle = cut ? '#111111' : withAlpha(e.text, 0.45);
    g.beginPath(); g.arc(cx, cy - rad * 0.15, rad * 0.38, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx, cy + rad * 0.75, rad * 0.7, rad * 0.5, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // 外圈宽：作用域里写了 vis.strokeWidth（@avatar / @元素）就用它（0 = 不描），否则原来的 max(1.5, 半径 9%)
  const swKey = cmpKey(e, 'vis.strokeWidth');
  const ringW = swKey.includes('@') && chosen(e, swKey) ? e.v.num('vis.strokeWidth', 1) : Math.max(1.5, rad * 0.09);
  if (!sty?.bare && ringW > 0) { g.strokeStyle = ring; g.lineWidth = ringW; path(); g.stroke(); }
  // 圆章（没有立绘、有名字）：首字居中、按圆章大小写、字色取圆章上对比高的白 / 深
  if (!art && mono) {
    const [dr, dg, db] = parseColor(tone), disc = rgba([dr, dg, db, 1]);
    // 圆章进绘制记录（可读性检查与自动描边才知道首字底下有它）：按内切方块记
    if (!sty?.bare) logBoxRect(g, { x: cx - rad * 0.7, y: cy - rad * 0.7, w: rad * 1.4, h: rad * 1.4 }, disc);
    const fc = contrastRatio('#ffffff', disc) >= contrastRatio('#1f2328', disc) ? '#ffffff' : '#1f2328';
    const sn0 = sty ? shapeName(sty) : null, ib0 = sn0 ? innerRect(sn0, box) : null, hh = ib0 ? ib0.h : rad * 2;
    const om = { ...e.small, weight: 800, color: fc, size: Math.max(e.small.size, Math.min(hh * 0.5, rad * 0.95)), noHalo: true }, ch = label.slice(0, 1), lh = om.size * 1.25, wm = W(e, ch, om);
    T(e, ch, cx - wm / 2, (ib0 ? ib0.y + ib0.h / 2 : cy) - lh / 2, lh, om);
    return;
  }
  // 首字压在立绘上时加一圈描边
  const o = art ? { ...e.small, weight: 700, color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } } : { ...e.small, weight: 700, color: e.text };
  // 非圆外形（M12b-67，octopath#23）：首字排进外形的内切区（居中、字号不超过内切区高），不再按圆头像的下沿写（菱形时落在形外、伸出名牌）
  const sn = sty ? shapeName(sty) : null, ib = sn ? innerRect(sn, box) : null;
  if (ib) { const oi = { ...o, size: Math.min(o.size, ib.h * 0.7) }, lh = oi.size * 1.3, wi = W(e, label.slice(0, 1), oi); T(e, label.slice(0, 1), cx - wi / 2, ib.y + ib.h - lh, lh, oi); return; }
  const w = W(e, label.slice(0, 1), o);
  T(e, label.slice(0, 1), cx - w / 2, cy + rad * 0.35, e.small.size * 1.3, o);
}

/**
 * 当前包的半身立绘（artRef('bust')，雪线旅人是 ui_char_bust_chibi.bust）按脸裁一块方形画进圆（调用方已裁成圆）：脸在源图约 (0.46, 0.29) 处，取短边 0.74 倍的方块。
 * fx = cnt.characterRender（B7 审查修复 ㉓：原来位图头像直接 drawImage，剪纸 / 水墨 / 素描都不生效）：不是 color 时画 filteredImage 处理过的图（裁法按比例换算）。
 * 包没有这张图时返回 false（画剪影），不借别的包的人物。
 */
function bustFace(e: ElCtx, cx: number, cy: number, rad: number, fx = 'color'): boolean {
  const ref = artRef('bust');
  const file = ref ? assetFile(ref.id, ref.file) : null;
  const img = file ? uiImage(file) : null;
  if (!img || !file) return false;
  const cv = fx && fx !== 'color' ? filteredImage(file, fx, rad * 2 * devScale(e.g)) : null;
  const src: CanvasImageSource = cv ?? img, W0 = cv ? cv.width : img.naturalWidth, H0 = cv ? cv.height : img.naturalHeight, side = Math.min(W0, H0) * 0.74;
  const sx = Math.max(0, Math.min(W0 - side, W0 * 0.46 - side / 2)), sy = Math.max(0, Math.min(H0 - side, H0 * 0.29 - side / 2));
  return smoothDraw(e.g, () => { e.g.drawImage(src, sx, sy, side, side, cx - rad, cy - rad, rad * 2, rad * 2); return true; });
}
/** 画布当前变换的缩放（设计单位 → 设备像素；滤镜按目标尺寸取分辨率用） */
const devScale = (g: CanvasRenderingContext2D) => { const t = g.getTransform?.(); return t ? Math.max(1e-3, Math.hypot(t.a, t.b)) : 1; };

/* ---------------- 插画槽（M12a-36） ---------------- */

/** 插画槽的图源：scene = 当前包的主视觉（art.keyArt）；portrait = 半身立绘；mascot = Q 版立绘（没有时半身） */
export type ArtKind = 'scene' | 'portrait' | 'mascot';
/** 插画槽用哪张位图（当前包没有这张时 null：画灰盒，不借别的包的图） */
export function artFileOf(e: ElCtx, kind: ArtKind): string | null {
  if (kind === 'scene') { const ref = artRef('keyArt'); return ref ? assetFile(ref.id, ref.file) : null; }
  return (kind === 'mascot' ? characterImage(e.r, 'chibi') : null) ?? characterImage(e.r, 'bust');
}

/** 缺素材插画槽的淡显强度（虚线框与小字的整体透明度；水印占位按 ast.watermarkOpacity，插画槽是内容位，取一半强度：看得出是插画位、不抢内容） */
export const ART_SLOT_FAINT = 0.5;
/**
 * 插画槽（M12a-36，cmp.panelArt / cnt.companion 的画法；compose/screen.ts 与 elements/info.ts 共用）：有素材时 cover 铺满槽（立绘保留头部），
 * 没有或没加载完时画淡显占位「label（需素材）」（R4 回归修复 black-myth#46：原来是斜纹灰盒，深色界面上是全屏最亮的一块；现在与缺素材的水印同口径——
 * 只描一圈淡虚线框 + 小字，强度 ART_SLOT_FAINT）。槽的外框、拼贴、光环、图窗处理（夜视 / 撕裂 / 扫描线）见 M12b-32。返回画上去的是不是位图
 */
export function artSlot(e: ElCtx, r: Rect, kind: ArtKind, label = '插画', o: { decor?: boolean; anchor?: [number, number]; file?: string | null } = {}): boolean {
  // o.file：调用方指定的图源（拼贴的各块取不同的图，B7 审查修复 ㉒）；o.anchor：cover 裁切保留哪一块（拼贴每块取图的不同位置）
  const file = o.file !== undefined ? o.file : artFileOf(e, kind);
  // 插画处理（M12b-32）：场景 / 面板插画读 cnt.illustrationRender、立绘读 cnt.characterRender（选过才处理，color = 原样）；位图离屏处理按「图 + 模式」缓存（uiAssets.ts filteredImage）
  const fx = renderModeOf(e, kind === 'scene' ? 'scene' : 'character');
  const ok = !!(file && uiImage(file) && smoothDraw(e.g, () => drawImageFitFx(e.g, file, r, 'cover', o.anchor ?? (kind === 'scene' ? [0.5, 0.5] : [0.5, 0.12]), fx)));
  if (!ok) drawGreybox(e.g, r, `${label}（需素材）`, { faint: ART_SLOT_FAINT });
  // 图窗处理 / 图注带 / 外框（cmp.panelArtFx / panelArtCaption / panelArtFrame，M12b-32）：只给面板插画槽（cmp.panelArt）的图窗
  if (o.decor) artDecor(e, r);
  // 图窗外框（M12b-50，slay-the-spire#41 的雕花画框）：作用域写了 ast.frame@panelArt（旧皮肤要皮肤之后的层）时，图窗外面套一圈外框（ast.frameMat@panelArt 的材质）
  const ep = e.part('panelArt');
  if (chosenKey(ep, 'ast.frame') === 'ast.frame@panelArt' && ep.t.panel.frame) { const w = ep.t.panel.frame.width, q = { x: r.x - w, y: r.y - w, w: r.w + w * 2, h: r.h + w * 2 }; drawFrame(e.g, q, ep.t.panel.frame, (inset) => boxPath(e.g, q, {}, inset), ORN.frame); }
  return ok;
}

/** 插画处理模式（M12b-32）：character = cnt.characterRender、scene = cnt.illustrationRender；选过才用（旧皮肤只认皮肤之后的层），没选 / color = 原样 */
export const renderModeOf = (e: ElCtx, kind: 'character' | 'scene') => pickedStr(e, kind === 'character' ? 'cnt.characterRender' : 'cnt.illustrationRender', 'color');
/** 面板插画槽的部件参数（按 @panelArt → @元素 → 全局、选过才算） */
const artList = (e: ElCtx, k: string): string[] => { const ep = e.part('panelArt'), key = chosenKey(ep, k); return key ? e.r.list(key).filter((x) => x && x !== 'auto' && x !== 'none') : []; };
/**
 * 图窗的处理与外框（M12b-32）：cmp.panelArtFx（多选：nightVision 夜视绿 / tear 横向撕裂 / scanlines 扫描线 / duotone 双色 / desat 去色 / halftone 网点 / sepia 旧照片）叠在图上；
 * cmp.panelArtCaption = band → 底部暗渐变图注带（图注 = 区域名）；cmp.panelArtFrame = panel 细框 / ornate 雕花框（ast.frame@panelArt 写了时按它，否则金色雕花九宫格）
 */
export function artDecor(e: ElCtx, r: Rect) {
  const g = e.g, fx = artList(e, 'cmp.panelArtFx');
  if (fx.length) {
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    for (const f of fx) {
      if (f === 'desat' || f === 'duotone' || f === 'sepia' || f === 'nightVision') { g.globalCompositeOperation = f === 'desat' ? 'saturation' : 'color'; g.fillStyle = f === 'desat' ? '#808080' : f === 'sepia' ? '#704214' : f === 'nightVision' ? '#2bd45a' : e.accent; g.globalAlpha = f === 'desat' ? 1 : 0.75; g.fillRect(r.x, r.y, r.w, r.h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      if (f === 'nightVision') { g.fillStyle = 'rgba(20,90,40,0.25)'; g.fillRect(r.x, r.y, r.w, r.h); }
      if (f === 'scanlines' || f === 'nightVision') { g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = r.y; y < r.y + r.h; y += 3) g.fillRect(r.x, y, r.w, 1); }
      if (f === 'tear') { for (let k = 0; k < 4; k++) { const y = r.y + r.h * ((k * 0.27 + 0.13) % 1), bh = Math.max(1, r.h * (0.015 + (k % 2) * 0.02)); g.fillStyle = k % 2 ? 'rgba(255,40,140,0.35)' : 'rgba(40,230,255,0.35)'; g.fillRect(r.x + r.w * 0.04 * (k % 3), y, r.w, bh); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(r.x, y + bh, r.w * (0.3 + 0.2 * k), Math.max(1, bh * 0.6)); } }
      if (f === 'halftone') drawPattern(g, r, { kind: 'halftone', opacity: 0.35, color: '#000000' }, e.pal);
    }
    g.restore();
  }
  if (pickedStr(e.part('panelArt'), 'cmp.panelArtCaption', 'none') === 'band') {
    const h = Math.min(r.h * 0.3, LH(e, e.small) * 1.8), gr = g.createLinearGradient(0, r.y + r.h - h, 0, r.y + r.h);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)'); g.fillStyle = gr; g.fillRect(r.x, r.y + r.h - h, r.w, h);
    const t = pack().world.region, o: TextOpts = { ...e.small, italic: true, color: '#fff', outline: undefined, shadow: undefined };
    T(e, t, r.x + 8 * e.k, r.y + r.h - h, h, o);
  }
  const fr = pickedStr(e.part('panelArt'), 'cmp.panelArtFrame', 'none');
  if (fr === 'panel') drawBox(g, r, { border: { width: Math.max(1.5, 2 * e.k), color: e.t.panel.border?.color ?? withAlpha(e.text, 0.6) } }, e.pal);
  else if (fr === 'ornate') {
    const ep = e.part('panelArt'), f: FrameSpec = ep.t.panel.frame && chosenKey(ep, 'ast.frame') ? ep.t.panel.frame : { kind: 'carvedNinePatch', mat: pickedStr(ep, 'ast.frameMat', 'gold'), width: Math.max(6, 9 * e.k), motif: e.t.panel.ornament?.motif ?? 'none' };
    const w = f.width, q = { x: r.x - w, y: r.y - w, w: r.w + w * 2, h: r.h + w * 2 };
    drawFrame(g, q, f, (inset) => boxPath(g, q, {}, inset), ORN.frame);
  }
}
/**
 * 面板插画槽的画法（cmp.panelArt 的取值，M12b-32）：collage = 2–4 张场景小图错叠（白边相片 + 斜体引号图注，typ.display：Obra Dinn 图鉴）；
 * halo = 人物背后一圈光环 / 装饰圆盘（立绘贴底）；photomontage = 黑白照片剪影拼贴（每块不规则四边形、去色）；其余（header / window / side / full）= 一块图窗（artSlot）
 */
export function panelArtDraw(e: ElCtx, r: Rect, variant: string, kind: ArtKind, label: string) {
  const g = e.g;
  if (variant === 'collage' || variant === 'photomontage') {
    const n = Math.max(2, Math.min(4, Math.round(r.w / Math.max(1, r.h) * 1.3))), places = pack().world.places ?? [];
    // 每块各取一处画面（B7 审查修复 ㉒：原来每块同宽同高、同一张主视觉同一个居中裁法，有位图时是同一幅图的 n 份）：
    // 图源轮着取主视觉 / 半身立绘 / 主视觉（包里有的才用），cover 的保留位置沿横向扫、上下错开；块的宽高比也错开（宽 / 高交替）
    const srcs = [artFileOf(e, 'scene'), characterImage(e.r, 'bust'), artFileOf(e, 'scene')];
    for (let i = 0; i < n; i++) {
      const tall = i % 2 === 1, w = r.w / n * (tall ? 1.15 : 1.4), h = r.h * (tall ? 0.84 : 0.7);
      const x = r.x + i * (r.w - w) / Math.max(1, n - 1), y = r.y + (i % 2 ? r.h * 0.14 : r.h * 0.02), ang = ((i % 3) - 1) * 0.06;
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(ang); g.translate(-(x + w / 2), -(y + h / 2));
      if (e.tx !== g) { e.tx.save(); e.tx.translate(x + w / 2, y + h / 2); e.tx.rotate(ang); e.tx.translate(-(x + w / 2), -(y + h / 2)); }
      const q = { x, y, w, h };
      if (variant === 'collage') { g.fillStyle = '#f4f1ea'; g.fillRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6); }
      g.save(); g.beginPath();
      if (variant === 'photomontage') { const j = Math.min(w, h) * 0.06; g.moveTo(q.x + j, q.y); g.lineTo(q.x + q.w, q.y + j * 0.5); g.lineTo(q.x + q.w - j * 0.6, q.y + q.h); g.lineTo(q.x, q.y + q.h - j); g.closePath(); } else g.rect(q.x, q.y, q.w, q.h);
      const src = srcs[i % srcs.length] ?? srcs[0], person = !!src && src === srcs[1];
      // 没有位图时各块的灰盒也写不同的字（地名；人物块写原来的标签）
      g.clip(); artSlot(e, q, person ? 'portrait' : 'scene', person ? label : places[i % Math.max(1, places.length)]?.[0] ?? label, { file: src ?? null, anchor: [(i + 0.5) / n, 0.3 + 0.4 * (i % 2)] });
      if (variant === 'photomontage') { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(q.x, q.y, q.w, q.h); g.globalCompositeOperation = 'source-over'; }
      g.restore();
      if (variant === 'collage') { const cap = `“${places[i % Math.max(1, places.length)]?.[0] ?? label}”`, o: TextOpts = { ...displayFor(e, 'title'), ...e.small, italic: true, color: '#1f2328', outline: undefined, shadow: undefined }; T(e, cap, q.x + 6 * e.k, q.y + q.h - LH(e, o) - 4 * e.k, LH(e, o), o); }
      if (e.tx !== g) e.tx.restore();
      g.restore();
    }
    artDecor(e, r);
    return;
  }
  if (variant === 'halo') {
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.42, rad = Math.min(r.w, r.h) * 0.42, gr = g.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    gr.addColorStop(0, withAlpha(mix(e.accent, '#fff', 0.6), 0.85)); gr.addColorStop(0.7, withAlpha(e.accent, 0.35)); gr.addColorStop(1, withAlpha(e.accent, 0));
    g.save(); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
    g.strokeStyle = withAlpha(ornColor(e), 0.8); g.lineWidth = Math.max(1, 1.5 * e.k); g.beginPath(); g.arc(cx, cy, rad * 0.8, 0, Math.PI * 2); g.stroke(); g.restore();
    const file = artFileOf(e, 'portrait'), fx = renderModeOf(e, 'character');
    if (!(file && uiImage(file) && smoothDraw(g, () => drawImageFitFx(g, file, r, 'contain', [0.5, 1], fx)))) { g.fillStyle = withAlpha(e.text, 0.55); g.beginPath(); g.arc(cx, cy - rad * 0.1, rad * 0.32, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(cx, r.y + r.h, rad * 0.62, rad * 0.55, 0, Math.PI, Math.PI * 2); g.fill(); }
    artDecor(e, r);
    return;
  }
  artSlot(e, r, kind, label, { decor: true });
}

/**
 * HUD 元素与托盘的套框（§2 的 elementFrame(e, rect, kind)，M12b-50，stardew#1；B6 的 elx.groupFrame 也调它）：外框 = 元素主题的 ast.frame
 * （没有时平框）、材质 ast.frameMat（没选时木）、框厚 ast.frameThickness。panel = 元素外面套一圈框（画在元素之后、不压内容）；
 * tray = 元素底下垫一块材质托盘再套框（画在元素之前，快捷栏 / 资源行的一整条木托盘）。返回框占的外接矩形
 */
export function elementFrame(e: ElCtx, r: Rect, kind: 'panel' | 'tray'): Rect {
  const f0 = e.t.panel.frame, mat = f0?.mat ?? pickedStr(e, 'ast.frameMat', 'wood');
  const f: FrameSpec = f0 ? { ...f0 } : { kind: 'plainNinePatch', mat, width: 7, motif: e.t.panel.ornament?.motif ?? 'none' };
  const pad = kind === 'tray' ? 4 * e.k : 0, w = f.width, q = { x: r.x - pad - w, y: r.y - pad - w, w: r.w + (pad + w) * 2, h: r.h + (pad + w) * 2 };
  if (kind === 'tray') { const base = MATERIAL_BASE[mat] ?? '#8a6a44'; drawBox(e.g, q, { bg: { solid: mix(base, '#000', 0.25) }, material: mat, radius: 3 * e.k }, e.pal); }
  // 外框烘进离屏画布再贴（B4 审查修复：HUD 每帧重画，雕花框 + 卷草母题一个元素上百枚压印、rpg 布局 1080p 每帧 1.1 万次调用；元素矩形很少变，命中率高）。
  // 顶冠框的顶冠 / 底坠放进画面安全区（crownGeom），返回的外接矩形把它们也算进去（登记 decor.frame 占位）
  const fr = ORN.frame, crown = f.kind === 'crowned' || f.kind === 'threePart' ? crownGeom(q, fr).rects : [];
  const bb = crown.reduce((a, c) => { const x0 = Math.min(a.x, c.x), y0 = Math.min(a.y, c.y); return { x: x0, y: y0, w: Math.max(a.x + a.w, c.x + c.w) - x0, h: Math.max(a.y + a.h, c.y + c.h) - y0 }; }, q);
  // 键不带位置（中期审查修复 ㉗：烘焙缓存按尺寸与设备相位取）；顶冠 / 底坠夹进安全区后相对外框的位置会随元素位置变，写进键
  const crownK = crown.map((c) => [c.x - q.x, c.y - q.y, c.w, c.h].map((v) => v.toFixed(2)).join(',')).join(';');
  const key = `ef|${kind}|${f.kind}|${f.mat}|${f.width}|${f.motif}|${q.w.toFixed(2)}x${q.h.toFixed(2)}|${e.k}|${fr ? `${fr.x},${fr.y},${fr.w},${fr.h}` : '-'}|${crownK}`;
  bakedPaint(e.g, key, bb, Math.max(20, w * 1.2), (g) => drawFrame(g, q, f, (inset) => boxPath(g, q, kind === 'tray' ? { radius: 3 * e.k } : {}, inset), fr));
  return bb;
}

/**
 * 说话人小像（M12a-36 的 cnt.companion = avatar）：方形头像框（外形读 vis.silhouette@avatar，没选时跟面板转角的方框），
 * 里面是当前包的半身立绘（没有时画剪影），细框描边。与 avatar() 的区别：默认是方的、按矩形摆
 */
export function portraitBox(e0: ElCtx, r: Rect) {
  const e = e0.part('avatar');
  const g = e.g;
  const sty = shapeStyle(e0, 'avatar', cornerOf(e.t.panel), r, 0);
  const path = () => { g.beginPath(); boxPath(g, r, sty); };
  g.save();
  path(); g.fillStyle = withAlpha(e.text, 0.18); g.fill(); g.clip();
  const file = artFileOf(e, 'portrait');
  // 立绘读 cnt.characterRender（B7 审查修复 ㉓：原来直接 drawImageFit，选了剪纸 / 水墨也画原图）
  if (!(file && uiImage(file) && smoothDraw(g, () => drawImageFitFx(g, file, r, 'cover', [0.5, 0.12], renderModeOf(e0, 'character'))))) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = Math.min(r.w, r.h) / 2;
    g.fillStyle = withAlpha(e.text, 0.45);
    g.beginPath(); g.arc(cx, cy - rad * 0.15, rad * 0.38, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx, cy + rad * 0.75, rad * 0.7, rad * 0.5, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  if (!sty.bare) { g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = 1.5; path(); g.stroke(); }
}

/**
 * 标题前缀（typ.titlePrefix，M12b-43，xcom2#36 的「> 行动代号」）：chevron = 「>」、doubleChevron = 「>>」（字，强调色）、bullet = 实心圆点、
 * motif = 当前母题的符号（没有母题时菱形）；选过才画（旧皮肤要皮肤之后的层，按 @部件 → @元素 → 全局查）。在 (x, y) 起、行高 h 里画，返回占的宽（含后面的间隙）；
 * measure = 只量不画。模板页头、任务目标标题、选中面板的名字调用；Godot = Label 文字前缀或 HBox 里的 TextureRect
 */
export function titlePrefix(e: ElCtx, x: number, y: number, h: number, o: Partial<TextOpts>, measure = false): number {
  const kind = pickedStr(e, 'typ.titlePrefix', 'none');
  if (kind === 'none') return 0;
  const size = o.size ?? e.title.size, gap = size * 0.35;
  if (kind === 'chevron' || kind === 'doubleChevron') {
    const s = kind === 'chevron' ? '>' : '>>', to = { ...o, color: e.accent }, w = W(e, s, to);
    if (!measure) T(e, s, x, y, h, to);
    return w + gap;
  }
  const d = kind === 'bullet' ? size * 0.42 : size * 0.9;
  if (!measure) {
    const g = e.g, cx = x + d / 2, cy = y + h / 2;
    g.save();
    g.fillStyle = e.accent; g.strokeStyle = e.accent; g.lineWidth = Math.max(1, d * 0.1);
    if (kind === 'bullet') { g.beginPath(); g.arc(cx, cy, d / 2, 0, Math.PI * 2); g.fill(); }
    else { const m = e.t.panel.ornament?.motif; g.translate(cx, cy); glyph(g, !m || m === 'none' ? 'diamond' : m, d, e.t.panel.ornament?.level ?? 1); }
    g.restore();
  }
  return d + gap;
}

/**
 * 标牌（cmp.plate）：页签 / 药丸 / 缎带 / 斜带 / 燕尾 / 牌匾 / 印章。role = 标牌的角色（title 标题牌、name 人名牌）：颜色、字体 token 查 @<角色> → @plate → 元素 → 全局；
 * 形态（kind）由调用方给（M12a-23 起页头 / 标题元素的调用方按 cmp.plate@title / @name 选，见 platePick）。
 * 颜色（M12a-23）：作用域里写了 col.surface@<角色 / plate>（旧皮肤要皮肤之后的层）就用它当底色（缎带不再用位图），col.text@… 当字色（没写时按底色自动反差），
 * vis.stroke / strokeColor / strokeWidth@… 写了就沿标牌描边；都没写时是原来的强调色底 + onAccent 字
 */
export function plate(e0: ElCtx, r: Rect, label: string, kind: string, o: Partial<TextOpts> = {}, role?: string, x: PlateExtra = {}) {
  // 标牌连字一起按 vis.skew 斜切（M12a-06；在已经斜过的元素里不再斜）
  const e = role ? e0.part(role, 'plate') : e0.part('plate');
  // 贴屏幕边出血（cmp.plateBleed 选过 / bleedLabel，M12b-47）：牌伸到最近的屏幕边、那一端平切；没给画面矩形时不出血
  const bl = x.screen && (kind === 'bleedLabel' || cmpPicked(e, 'cmp.plateBleed', 'false') === 'true') ? bleedOf(r, x.screen) : null;
  withSkew([e.g, e.tx], r, e.th.boxSkew, () => (ORNATE_PLATES.has(kind) ? ornatePlate(e, r, label, kind, o, x.sub) : BAND_PLATES.has(kind) ? bandPlate(e, r, label, kind, o, x, bl) : plateBody(e0, e, bl?.rect ?? r, label, kind, o, role, bl, x.sub)));
  // 名牌旁的花枝（ast.ornamentAnchor = plateSide，M12b-49，hades#32 的红色月桂）：标题 / 人名牌左侧一枝，色 = 选过的第二强调色，否则饰色
  if (role && role !== 'stateTag' && anchorsOf(e).includes('plateSide')) sprig(e.g, r.x - 2 * e.k, r.y + r.h / 2, r.h * 0.8, -1, chosenKey(e, 'col.accent2') ? resolveColor('@accent2', e.pal) : ornColor(e));
}
/** 标牌里的第二行（M12b-46：bracketFrame 把副题一起框进去；M12b-47：twoLine 的称号行） */
export interface PlateSub { text: string; o: Partial<TextOpts> }
/**
 * plate() 的附加项（M12b-46 / 47）：sub = 第二行；align = 整宽标题带里标题的对齐（lay.titleAlign）；screen = 画面矩形（出血到屏幕边用）；
 * stop = 拖拽条的横纹停在哪个 x（页头右边的关闭钮左沿，关闭钮成为条的一部分）；lead = 标题带左端让出的宽（页头图标槽 lay.headerIcon）
 */
export interface PlateExtra { sub?: PlateSub; align?: 'left' | 'center'; screen?: Rect; stop?: number; lead?: number }
/** 整宽一类的标牌（M12b-47）：调用方给整条标题带的矩形（页头 = 返回钮之后到关闭钮之前），标题在带里按 align 排 */
export const BAND_PLATES = new Set(['band', 'fadeBand', 'dragHandle', 'stripedFlank', 'bleedLabel']);
/** 出血：牌离哪条屏幕边近就伸到那条边（side = l / r），返回伸长后的矩形与原来的内端 */
function bleedOf(r: Rect, S0: Rect): { rect: Rect; side: 'l' | 'r'; inner: number } {
  const left = r.x - S0.x <= S0.x + S0.w - (r.x + r.w);
  return left ? { rect: { ...r, x: S0.x, w: r.x + r.w - S0.x }, side: 'l', inner: r.x + r.w } : { rect: { ...r, w: S0.x + S0.w - r.x }, side: 'r', inner: r.x };
}
/**
 * 整宽标题带（M12b-47，K1 G-plate-lib / G-window-system）：
 *   band = 整条强调色带（作用域写了 col.surface 用它，写了 col.gradient 用面板的渐变），标题按 align（civ6#18 的生产青绿带）；
 *   fadeBand = 从左往右渐隐的暗带（col.surface 选过用它），标题用标题色（elden-ring#26）；
 *   dragHandle = 标题（粗体）+ 后面三道 1px 横纹一直铺到关闭钮前（关闭钮成为条的一部分，factorio#2）；
 *   stripedFlank = 居中的强调色名牌 + 两侧斜纹带（xcom2#2）；
 *   bleedLabel = 伸到最近屏幕边的白纸标签（底 = col.surface@plate，没写时近白；字 = col.text@plate，没写时近黑粗体全大写），字从里端起排；
 *     vis.edge@plate（或 @title）= printWorn 时带印刷磨损（disco-elysium#2）。
 * 字的颜色：作用域写了 col.text 用它；否则按底色自动反差（band）/ 标题色（fadeBand、dragHandle）
 */
function bandPlate(e: ElCtx, r: Rect, label: string, kind: string, o: Partial<TextOpts>, x: PlateExtra, bl: ReturnType<typeof bleedOf> | null) {
  const g = e.g, k = e.k, surface = resolveColor(e.th.surface, e.pal), surf = plateScoped(e, 'col.surface') ? surface : null;
  const ink = plateScoped(e, 'col.text') ? resolveColor(e.v.str('col.text', '@ink'), e.pal) : null, lead = x.lead ?? 0;
  const pad = r.h * 0.5, R0 = bl?.rect ?? r;
  if (kind === 'band' || kind === 'bleedLabel') {
    const fill = surf ?? (kind === 'band' ? resolveColor(e.accent, e.pal) : '#ecebe6');
    const bg = kind === 'band' && plateScoped(e, 'col.gradient') && e.t.panel.bg ? e.t.panel.bg : { solid: fill };
    drawBox(g, R0, { bg, ...(e.t.panel.edge === 'printWorn' ? { edge: 'printWorn' as const, seed: 23 } : {}) }, e.pal);
    const to: TextOpts = kind === 'band' ? { ...e.title, color: ink ?? onColorOf(fill, surface), ...o } : { ...e.title, color: ink ?? '#141414', weight: 800, upper: true, ...o };
    const tw = W(e, label, to);
    // 出血标签：字从里端起排（左出血 = 原来的右沿往左留白；右出血 = 原来的左沿往右留白），整宽带按 align
    const tx = bl ? (bl.side === 'l' ? bl.inner - pad - tw : bl.inner + pad) : x.align === 'center' ? R0.x + lead + (R0.w - lead) / 2 - tw / 2 : R0.x + lead + pad;
    T(e, label, tx, R0.y, R0.h, to);
    return;
  }
  if (kind === 'fadeBand') {
    g.save(); g.fillStyle = fadePaint(g, R0, 'right', 0.6, surf ?? 'rgba(10,10,12,0.72)'); g.fillRect(R0.x, R0.y, R0.w, R0.h); g.restore();
    const to: TextOpts = { ...e.title, color: ink ?? e.title.color ?? e.text, ...o }, tw = W(e, label, to);
    T(e, label, x.align === 'center' ? R0.x + lead + (R0.w - lead) / 2 - tw / 2 : R0.x + lead + pad, R0.y, R0.h, to);
    return;
  }
  if (kind === 'dragHandle') {
    const to: TextOpts = { ...e.title, color: ink ?? e.title.color ?? e.text, weight: 800, ...o }, tw = W(e, label, to), tx = R0.x + lead + pad * 0.4;
    T(e, label, tx, R0.y, R0.h, to);
    const x0 = tx + tw + pad * 0.6, x1 = Math.min(R0.x + R0.w, x.stop ?? R0.x + R0.w) - 4 * k;
    if (x1 > x0) { g.save(); g.fillStyle = withAlpha(to.color, 0.35); for (const f of [0.38, 0.5, 0.62]) g.fillRect(x0, Math.round(R0.y + R0.h * f), x1 - x0, Math.max(1, k)); g.restore(); }
    return;
  }
  // stripedFlank：中间名牌 + 两侧斜纹
  const to: TextOpts = { ...onAccent(e, e.title), ...(ink ? { color: ink } : {}), ...o }, tw = W(e, label, to), pw = tw + R0.h * 1.2;
  // 居中时名牌在正中、两侧各一段斜纹；左对齐时名牌左边留一小段斜纹（1.6 牌高），其余在右边
  const px = x.align === 'center' || !x.align ? R0.x + R0.w / 2 - pw / 2 : R0.x + lead + R0.h * 1.6, fill = surf ?? resolveColor(e.accent, e.pal);
  for (const q of [{ x: R0.x + lead, y: R0.y + R0.h * 0.2, w: px - 4 * k - R0.x - lead, h: R0.h * 0.6 }, { x: px + pw + 4 * k, y: R0.y + R0.h * 0.2, w: R0.x + R0.w - (px + pw + 4 * k), h: R0.h * 0.6 }]) if (q.w > 2) drawPattern(g, q, { kind: 'diagStripes', opacity: 0.55, color: fill }, e.pal);
  g.save(); g.fillStyle = fill; g.fillRect(px, R0.y, pw, R0.h); g.restore();
  T(e, label, px + pw / 2 - tw / 2, R0.y, R0.h, to);
}
/** 饰线类标牌（M12b-46）：不填底，字用标题色，饰线用饰色 */
export const ORNATE_PLATES = new Set(['flourish', 'flankLines', 'bracketFrame']);
/**
 * 标牌要多宽（M12b-46 抽出，页头 / 骑边 / 立绘上的标题共用）：tw = 字宽、ph = 牌高。缎带 / 燕尾两端各留 1.2 牌高、对称花饰 = 字宽 × 1.7、
 * 两侧花线 = 字宽 + 两边各 max(1.6 牌高, 0.45 字宽)、括号框 = 字宽 + 1.4 牌高，其余字宽 + 1.2 牌高（原来的）
 */
export function plateWidthOf(kind: string, tw: number, ph: number): number {
  switch (kind) {
    case 'ribbon': case 'swallowtail': return tw + ph * 2.4;
    case 'flourish': return Math.max(tw * 1.7, ph * 4.5) + ph * 0.8;
    case 'flankLines': return tw + 2 * Math.max(ph * 1.6, tw * 0.45);
    case 'bracketFrame': return tw + ph * 1.4;
    default: return tw + ph * 1.2;
  }
}
/**
 * 框住两行（标题 + 副题）的括号框要多宽（B4 审查修复，frostpunk#33）：两行里宽的那行 tw，两侧各留「臂长 + 两倍涡卷半径 + 留白」——bracketFrame() 的上下臂从竖线往里伸
 * min(框高 × 0.5, 框宽 × 0.22) 再卷一圈（涡卷半径 max(1.4 线宽, 0.18 臂长)），按臂长的上限（框高一半）留，臂尖卷不进字里；h = 框高（牌高 + 副题行）
 */
export function bracketWidth(tw: number, h: number): number {
  const arm = h * 0.5, lw = Math.max(1, h * 0.05), vol = Math.max(lw * 1.4, arm * 0.18);
  return tw + 2 * (arm + vol * 2 + h * 0.08);
}
/**
 * 饰线类标牌（M12b-46，K1 G-plate-lib）：flourish = 标题坐在一对镜像卷须上、中间垂一枚小饰（hollow-knight#10）；flankLines = 标题左右两条细线、外端一枚母题符号
 * （没有母题时菱点，octopath#21）；bracketFrame = 开口括号框住标题（与副题：sub），臂尖卷成涡卷（frostpunk#33）。字色 = 作用域写的 col.text（@title / @plate……），
 * 否则标题色；饰线 = 饰色（col.ornament → 饰件色 → 描边色 → 字色）；母题 = 当前饰件的母题
 */
function ornatePlate(e: ElCtx, r: Rect, label: string, kind: string, o: Partial<TextOpts>, sub?: PlateSub) {
  const g = e.g, c = ornColor(e), motif = e.t.panel.ornament?.motif ?? 'none';
  const to: TextOpts = { ...e.title, color: plateScoped(e, 'col.text') ? resolveColor(e.v.str('col.text', '@ink'), e.pal) : e.title.color ?? e.text, ...o };
  const tw = W(e, label, to), cx = r.x + r.w / 2, lw = Math.max(1, r.h * 0.05);
  g.save();
  g.fillStyle = c; g.strokeStyle = c; g.lineWidth = lw;
  if (kind === 'flankLines') {
    const cy = r.y + r.h / 2, gs = Math.max(4, r.h * 0.34), gap = r.h * 0.3, m = motif === 'none' || !motif ? 'diamond' : motif;
    for (const k of [-1, 1]) {
      const x0 = k < 0 ? r.x + gs : cx + tw / 2 + gap, x1 = k < 0 ? cx - tw / 2 - gap : r.x + r.w - gs;
      if (x1 > x0) g.fillRect(x0, cy - lw / 2, x1 - x0, lw);
      g.save(); g.translate(k < 0 ? r.x + gs / 2 : r.x + r.w - gs / 2, cy); glyph(g, m, gs, 1); g.restore();
    }
  } else if (kind === 'flourish') flourish(g, cx, r.y + r.h * 0.62, r.w, r.h * 0.7, motif === 'none' ? '' : motif);
  else bracketFrame(g, { x: r.x + lw, y: r.y + lw, w: r.w - lw * 2, h: r.h - lw * 2 }, lw, motif);
  g.restore();
  // 括号框的副题：标题占上 62%，副题在下面（都居中）
  if (kind === 'bracketFrame' && sub) {
    const h1 = r.h * 0.62, so: TextOpts = { ...e.small, color: withAlpha(to.color, 0.75), ...sub.o }, sw = W(e, sub.text, so);
    T(e, label, cx - tw / 2, r.y + lw, h1, to);
    T(e, sub.text, cx - sw / 2, r.y + h1, r.h - h1 - lw, so);
    return;
  }
  T(e, label, cx - tw / 2, kind === 'flourish' ? r.y - r.h * 0.12 : r.y, r.h, to);
}

/** 标牌部件上作用域写了这个参数（<k>@<角色 / plate / 元素>，旧皮肤只认皮肤之后的层）：只有这时标牌才换底色 / 字色 / 描边，否则原来的画法 */
const plateScoped = (e: ElCtx, k: string) => scopedSet(e, k);
function plateBody(e0: ElCtx, e: ElCtx, r: Rect, label: string, kind0: string, o: Partial<TextOpts>, role?: string, bl?: ReturnType<typeof bleedOf> | null, sub?: PlateSub) {
  // 两行名牌没有第二行（说话人不在角色样本里、调用方没给称号）时画成单行的页签（名牌原来的形，B4 审查修复：原来落进 default 画成一个光秃的矩形）
  const kind = kind0 === 'twoLine' && !sub ? 'tab' : kind0;
  const surf = plateScoped(e, 'col.surface') ? resolveColor(e.th.surface, e.pal) : null;
  // 哪端斜切 / 开叉（cmp.plateEnds，M12b-47：into-the-breach#8 只斜右端、slay-the-spire#31 只开内端）：选过才换；出血那一端一定平切
  const ends0 = cmpPicked(e, 'cmp.plateEnds', 'both'), ends = bl ? (bl.side === 'l' ? (ends0 === 'left' || ends0 === 'none' ? 'none' : 'right') : ends0 === 'right' || ends0 === 'none' ? 'none' : 'left') : ends0;
  if (!surf && ends === 'both' && (kind === 'ribbon' || kind === 'swallowtail') && ribbonPlate(e, r, label, o, role ? e : e0)) return;
  const g = e.g;
  g.save();
  g.beginPath();
  const { x, y, w, h } = r, n = h * 0.45, L = ends === 'both' || ends === 'left', Rt = ends === 'both' || ends === 'right';
  switch (kind) {
    case 'pill': g.roundRect(x, y, w, h, h / 2); break;
    case 'ribbon': case 'swallowtail':
      g.moveTo(x, y); g.lineTo(x + w, y); if (Rt) g.lineTo(x + w - n, y + h / 2); g.lineTo(x + w, y + h); g.lineTo(x, y + h); if (L) g.lineTo(x + n, y + h / 2); g.closePath(); break;
    case 'slashBand': g.moveTo(L ? x + n : x, y); g.lineTo(x + w, y); g.lineTo(Rt ? x + w - n : x + w, y + h); g.lineTo(x, y + h); g.closePath(); break;
    case 'tab': g.moveTo(x, y + h); g.lineTo(L ? x + n * 0.6 : x, y); g.lineTo(Rt ? x + w - n * 0.6 : x + w, y); g.lineTo(x + w, y + h); g.closePath(); break;
    // M12b-47：补齐原来静默画成矩形的取值，外加古代文明的名字环 / 石碑
    case 'scrollHead': g.rect(x + h * 0.2, y + h * 0.08, w - h * 0.4, h * 0.84); break;
    case 'sideTab': g.moveTo(x + n * 0.8, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + n * 0.8, y + h); g.lineTo(x, y + h / 2); g.closePath(); break;
    case 'cloudPlate': boxPath(g, r, { shape: 'scallop', shapeSize: 22 }); break;
    case 'crest': boxPath(g, r, { shape: 'shield' }); break;
    case 'stele': boxPath(g, r, { shape: 'arch' }); break;
    case 'cartouche': g.roundRect(x, y, w, h, h / 2); break;
    // 扇环（B4 审查修复）：弧度按牌宽取——两端只下沉 0.22 牌高（原来固定半角 0.55 rad，牌越宽两端垂得越深：8 个字的标题字角伸出扇面、扇尖垂到牌下 0.85 牌高）；
    // 内弧半径让扇尖正好落在牌的下沿，整片扇面在牌的矩形里（占位不用另算）
    case 'fan': { const a = w / 2, sg = h * 0.22, R = (a * a + sg * sg) / (2 * sg), th = Math.asin(Math.min(1, a / R)), cx = x + a, cy = y + R, t = (R * (h - sg)) / (R - sg); g.arc(cx, cy, R, -Math.PI / 2 - th, -Math.PI / 2 + th); g.arc(cx, cy, Math.max(0, R - t), -Math.PI / 2 + th, -Math.PI / 2 - th, true); g.closePath(); break; }
    default: g.rect(x, y, w, h);
  }
  const fill = surf ?? (kind === 'plaque' ? withAlpha(e.text, 0.12) : e.accent);
  // 两端渐隐（vis.fade@plate / @name / @<元素>，M12b-41，octopath#1 的宝蓝名牌）：标牌底按渐隐方向用带透明度的渐变填（字不渐隐）；选过才换
  const fk = chosenKey(e, 'vis.fade'), fdir = fk ? e.r.str(fk, 'none') : 'none';
  if (fdir !== 'none' && fdir !== 'auto') { const lk = chosenKey(e, 'vis.fadeLength'); g.fillStyle = fadePaint(g, r, fdir, lk ? e.r.num(lk, 0.25) : 0.25, resolveColor(fill, e.pal)); }
  else g.fillStyle = fill;
  g.fill();
  // 标牌底进绘制记录（§8，轨道 E）：牌上的字按牌的底色算对比（原来没记，牌上的白字按下面的面板算成 1.2 : 1）；渐隐的牌不记
  if (fdir === 'none' || fdir === 'auto') logBoxRect(g, { x: x + (kind === 'tab' ? n * 0.3 : 0), y, w: w - (kind === 'tab' ? n * 0.6 : 0), h }, resolveColor(fill, e.pal));
  if (kind === 'plaque' && !plateScoped(e, 'vis.stroke') && !plateScoped(e, 'vis.strokeColor')) { g.strokeStyle = e.accent; g.lineWidth = 1.5; g.stroke(); }
  // 描边（vis.stroke@name / @plate……，Hades 名牌的金边）：线色 / 线宽取部件主题的面板描边
  if ((plateScoped(e, 'vis.stroke') || plateScoped(e, 'vis.strokeColor') || plateScoped(e, 'vis.strokeWidth')) && e.v.str('vis.stroke', 'solid') !== 'none') {
    const b = e.t.panel.border ?? e.t.panel.sides?.b ?? e.t.panel.sides?.t;
    g.strokeStyle = resolveColor(b?.color ?? e.accent, e.pal); g.lineWidth = Math.max(1, b?.width ?? 1.5); g.stroke();
  }
  // 卷轴头（scrollHead）：两端各一卷带明暗的圆柱；名字环（cartouche）：里面再压一圈细环 + 右端一道竖杠
  if (kind === 'scrollHead') for (const cx of [x + h * 0.2, x + w - h * 0.2]) { const gr = g.createLinearGradient(cx - h * 0.2, 0, cx + h * 0.2, 0), c0 = resolveColor(fill, e.pal); gr.addColorStop(0, mix(c0, '#000', 0.35)); gr.addColorStop(0.45, mix(c0, '#fff', 0.25)); gr.addColorStop(1, mix(c0, '#000', 0.45)); g.fillStyle = gr; g.beginPath(); g.roundRect(cx - h * 0.2, y, h * 0.4, h, h * 0.18); g.fill(); }
  if (kind === 'cartouche') { const k = Math.max(2, h * 0.12), lc = surf ? onColorOf(fill, resolveColor(e.th.surface, e.pal)) : resolveColor(e.t.onAccent ?? '#fff', e.pal); g.strokeStyle = lc; g.lineWidth = Math.max(1, h * 0.05); g.beginPath(); g.roundRect(x + k, y + k, w - k * 2, h - k * 2, (h - k * 2) / 2); g.stroke(); g.fillStyle = lc; g.fillRect(x + w - k * 1.6, y + h * 0.18, Math.max(1, h * 0.07), h * 0.64); }
  // 印章（seal）：方章里再压一圈细框（朱文印的边）
  if (kind === 'seal') { const k = Math.max(2, h * 0.1); g.strokeStyle = surf ? onColorOf(fill, resolveColor(e.th.surface, e.pal)) : resolveColor(e.t.onAccent ?? '#fff', e.pal); g.lineWidth = Math.max(1, h * 0.05); g.strokeRect(x + k, y + k, w - k * 2, h - k * 2); }
  g.restore();
  // 牌匾是浅底描边，字用正文色；其余形态是强调色底，字用 onAccent（M12a-04）；作用域给了字色就用它（取写的值：部件主题按材质内芯改过的字色不算），
  // 换了底色没给字色时按底色自动反差
  const to = plateScoped(e, 'col.text') ? { ...e.title, color: resolveColor(e.v.str('col.text', '@ink'), e.pal), ...o } : surf ? { ...e.title, color: onColorOf(fill, resolveColor(e.th.surface, e.pal)), ...o } : kind === 'plaque' ? { ...e.title, color: e.text, ...o } : { ...onAccent(e, e.title), ...o };
  // 两行名牌（twoLine，M12b-47，hades#31）：上面名字、下面一行小的称号（选过 col.accent2 时用它，否则字色 75%）
  if (kind === 'twoLine' && sub) {
    const h1 = h * 0.6, so: TextOpts = { ...to, size: to.size * 0.62, weight: 700, color: chosenKey(e, 'col.accent2') ? resolveColor('@accent2', e.pal) : withAlpha(to.color, 0.75), ...sub.o };
    const tw1 = W(e, label, to), sw = W(e, sub.text, so);
    T(e, label, x + w / 2 - tw1 / 2, y, h1, to);
    T(e, sub.text, x + w / 2 - sw / 2, y + h1 - h * 0.06, h - h1, so);
    return;
  }
  const tw = W(e, label, to);
  // 出血的牌：字从里端起排（看得见的那一端往里留 0.6 牌高），不跟着伸到屏幕边的矩形居中
  const tx = bl ? (bl.side === 'l' ? bl.inner - h * 0.6 - tw : bl.inner + h * 0.6) : x + w / 2 - tw / 2;
  T(e, label, bl ? Math.max(x + h * 0.3, Math.min(tx, x + w - h * 0.3 - tw)) : tx, y, h, to);
}

/**
 * 标牌形态（M12a-23）：cmp.plate 按 @<角色> → @plate → @元素 → 全局查，选过（旧皮肤只认皮肤之后的层）才算；没选时 def（调用方原来的形态）。
 * 关键词 / 模板写的 cmp.plate@title（kw.ornate、kw.questBook、tpl.reward 的缎带，kw.ink、kw.guochao 的印章）与 cmp.plate@name（tpl.npc 的页签、skin.cozy 的胶囊）由此生效
 */
export function platePick(e0: ElCtx, role: string, def: string): string {
  // 沿目标链找第一个选过的键（旧皮肤里皮肤自带关键词写的 cmp.plate@title 不算，接着看后面的键与全局，与 patchTheme 的口径一样）
  for (const t of [role, 'plate', ...e0.scope]) { const k = `cmp.plate@${t}`; if (e0.r.has(k) && chosen(e0, k)) return String(e0.r.get(k)); }
  return chosen(e0, 'cmp.plate') ? e0.r.str('cmp.plate', def) : def;
}

const RIBBONS = ['red', 'blue', 'gold'];
/**
 * 缎带素材（ui_ribbons，按强调色选红 / 蓝 / 金）：图集素材开着，或 cmp.plate 选过缎带 / 燕尾旗时用；
 * 字压在中段平直的带面上（带面在源图高度的 1.5%~75%）。没加载完返回 false。
 */
function ribbonPlate(e: ElCtx, r: Rect, label: string, o: Partial<TextOpts>, ek = e): boolean {
  const k0 = cmpKey(ek, 'cmp.plate'), v = cmp(ek, 'cmp.plate', '');
  if (!iconSet(ek) && !(chosen(ek, k0) && (v === 'ribbon' || v === 'swallowtail'))) return false;
  const file = ribbonFile(e.accent);
  const name = RIBBONS.find((n) => assetFile('ui_ribbons', n) === file) ?? 'red';
  const [capL, capR] = ribbonCaps(name) ?? [58, 58];
  if (!smoothDraw(e.g, () => drawHSlice(e.g, file, r, capL, capR))) return false;
  const img = uiImage(file!)!;
  const k = r.h / img.naturalHeight, l = Math.min(capL * k, r.w / 2), rr = Math.min(capR * k, r.w / 2);
  const to = { ...e.title, color: '#fff', outline: { color: 'rgba(0,0,0,0.45)', width: 1.5 }, ...o };
  const tw = W(e, label, to);
  T(e, label, r.x + l + (r.w - l - rr) / 2 - tw / 2, r.y + r.h * 0.015, r.h * 0.74, to);
  return true;
}

/** 徽章素材里跟着 cmp.badge 换的通用形（奖章、纹章）；晶体是格子 / 状态上的小角标，固定不换（除非调用方说这一枚是通用徽章：BadgeOpts.generic） */
const GENERIC_BADGE = new Set(['medal', 'crest']);
/** 只有矢量画法、不走图集的徽章设计（M12a-31）：none = 无底座、roundel = 扁平圆章、chevron = 线稿军衔章 */
const VECTOR_BADGE = new Set(['none', 'roundel', 'chevron']);

/**
 * badge() 的选项（M12a-31）：generic = 这一枚是元素的「等级 / 状态徽章」（等级条、头像等级角标、状态图标、队伍军衔章），选过的 cmp.badge 不论调用方给的形都换成选的设计
 * （原来只换奖章 / 纹章，晶体角标写死）；color = 底座色（状态图标按角色色）；tier = 军衔章的杠数（1–5，没给时从 label 的数字取，再没有 3）
 */
export interface BadgeOpts { generic?: boolean; color?: string; tier?: number;
  /** 只认这几种选过的 cmp.badge（M12b-68，xcom2#37：回合计时的徽章只认 none / roundel，base 的 cmp.badge = chevron 不该把它画成军衔章）；选了别的当没选 */
  only?: string[] }

/**
 * 徽章（cmp.badge）：奖章 / 盾徽 / 星形 / 晶体；none / roundel / chevron 是程序画法（M12a-31）。
 * 图集素材开着或 cmp.badge 选过时画徽章图集（边长 2s，晶体按强调色着色；vis.iconStyle = flat 时不走图集、画程序徽章），字压在上面。
 * 圆章的外形读作用域 vis.silhouette（@badge → @元素 → 全局，没人选是圆）
 */
export function badge(e0: ElCtx, cx: number, cy: number, s0: number, kind: string, label = '', o: BadgeOpts = {}) {
  // 徽章最小尺寸（§8 RC6，轨道 E）：半径至少 6.5 单位（直径 26px@1080p），角标里的字才放得下
  const s = QUALITY.on ? Math.max(s0, 6.5) : s0;
  const e = e0.part('badge');
  const ck = !!chosenKey(e, 'cmp.badge'), pv = ck ? pickedStr(e, 'cmp.badge', kind) : kind;
  const picked = ck && (!o.only || o.only.includes(pv));
  const design = (o.generic || o.only) && picked ? pv : kind;
  if (!VECTOR_BADGE.has(design) && badgeArt(e, cx, cy, s, kind, o.generic, o.only)) {
    if (label) { const lo = { ...e.small, weight: 800, color: '#fff', size: s * 0.8, outline: { color: 'rgba(0,0,0,0.6)', width: Math.max(1, s * 0.1) } }; const w = W(e, label, lo); T(e, label, cx - w / 2, cy - s * 0.6, s * 1.2, lo); }
    return;
  }
  const g = e.g, fill = o.color ?? e.accent;
  if (design === 'chevron') { chevronBadge(e, cx, cy, s, o.tier ?? (Number.parseInt(label, 10) || 3)); return; }
  if (design === 'none') {
    // 无底座：只画字（底座色当字色，按可读辅助加一圈描边）
    if (label) { const lo = { ...e.small, weight: 800, size: s * 0.9, color: fill, outline: { color: luminance(resolveColor(fill, e.pal)) < 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)', width: Math.max(1, s * 0.12) } }; const w = W(e, label, lo); T(e, label, cx - w / 2, cy - s * 0.65, s * 1.3, lo); }
    return;
  }
  g.save();
  g.fillStyle = fill; g.strokeStyle = withAlpha('#000', 0.35); g.lineWidth = 1.5;
  g.beginPath();
  if (design === 'roundel') {
    // 扁平圆章：角色色实心底（外形没人选时是圆）+ 一圈压暗的细边
    const sil = silhouetteOf(e, 'badge'), rr = { x: cx - s, y: cy - s, w: 2 * s, h: 2 * s };
    if (sil && sil !== 'circle') { g.restore(); drawBox(g, rr, { ...shapeStyle(e, 'badge', { bg: { solid: fill }, border: { width: Math.max(1, s * 0.1), color: mix(fill, '#000', 0.35) } }, rr) }, e.pal); }
    else { g.arc(cx, cy, s, 0, Math.PI * 2); g.fill(); g.strokeStyle = mix(fill, '#000', 0.35); g.lineWidth = Math.max(1, s * 0.1); g.stroke(); g.restore(); logBoxRect(g, { x: cx - s * 0.7, y: cy - s * 0.7, w: s * 1.4, h: s * 1.4 }, resolveColor(fill, e.pal)); }
    if (label) { const lo = { ...e.small, weight: 800, size: s * 1.05, color: onColorOf(fill, resolveColor(e.th.surface, e.pal)) }; const w = W(e, label, lo); T(e, label, cx - w / 2, cy - s * 0.75, s * 1.5, lo); }
    return;
  }
  if (design === 'crest') { g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy - s); g.lineTo(cx + s, cy + s * 0.2); g.lineTo(cx, cy + s * 1.1); g.lineTo(cx - s, cy + s * 0.2); g.closePath(); }
  else if (design === 'crystal') { g.moveTo(cx, cy - s * 1.1); g.lineTo(cx + s * 0.8, cy); g.lineTo(cx, cy + s * 1.1); g.lineTo(cx - s * 0.8, cy); g.closePath(); }
  else { g.save(); g.translate(cx, cy); glyph(g, 'stars', s * 2.2); g.restore(); g.beginPath(); g.arc(cx, cy, s * 0.72, 0, Math.PI * 2); }
  g.fill(); g.stroke();
  g.restore();
  // 徽章底进绘制记录（§8，轨道 E）：章上的字 / 勾按章的底色算对比
  logBoxRect(g, { x: cx - s * 0.6, y: cy - s * 0.6, w: s * 1.2, h: s * 1.2 }, resolveColor(fill, e.pal));
  if (label) { const lo = o.color ? { ...e.small, weight: 800, size: s * 0.8, color: onColorOf(fill, resolveColor(e.th.surface, e.pal)) } : onAccent(e, { ...e.small, weight: 800, size: s * 0.8 }); const w = W(e, label, lo); T(e, label, cx - w / 2, cy - s * 0.6, s * 1.2, lo); }
}

/**
 * 军衔章（cmp.badge = chevron，M12a-31，XCOM）：程序线稿——tier 道 V 形杠从上往下叠，tier ≥ 4 时上面加一颗星；线色 = 图标色（col.icon），描一圈深色细边
 */
function chevronBadge(e: ElCtx, cx: number, cy: number, s: number, tier: number) {
  const g = e.g, n = Math.max(1, Math.min(5, Math.round(tier))), c = e.icon;
  const step = s * 0.42, top = cy - (Math.min(n, 3) - 1) * step / 2 - s * 0.15 + (n >= 4 ? s * 0.25 : 0);
  g.save();
  g.lineCap = 'square'; g.lineJoin = 'miter';
  for (const [col, lw] of [['rgba(0,0,0,0.55)', s * 0.34], [c, s * 0.2]] as const) {
    g.strokeStyle = col; g.lineWidth = Math.max(1, lw);
    for (let i = 0; i < Math.min(n, 3); i++) { const y = top + i * step; g.beginPath(); g.moveTo(cx - s * 0.85, y); g.lineTo(cx, y + s * 0.45); g.lineTo(cx + s * 0.85, y); g.stroke(); }
  }
  g.restore();
  if (n >= 4) icon(e, '★', cx, top - s * 0.45, s * 0.7, c);
  if (n >= 5) { icon(e, '★', cx - s * 0.6, top - s * 0.3, s * 0.5, c); icon(e, '★', cx + s * 0.6, top - s * 0.3, s * 0.5, c); }
}

/**
 * 徽章图集（ui_badges）：cmp.badge 选过时通用形（generic 时任何形）换成选的设计；vis.iconStyle = flat 时不走图集（画程序徽章，M12a-31）；
 * 晶体按强调色着色（M12a-31：原来固定画紫色星晶，在别的配色上很跳）。没加载完 / 没开返回 false
 */
function badgeArt(e: ElCtx, cx: number, cy: number, s: number, kind: string, generic = false, only?: string[]): boolean {
  const ck = !!chosenKey(e, 'cmp.badge'), v0 = ck ? pickedStr(e, 'cmp.badge', '') : '';
  const picked = ck && (!only || only.includes(v0));
  if (!picked && !iconSet(e)) return false;
  if (iconStyleOf(e) === 'flat' && (!e.th.legacy || chosen(e, 'vis.iconStyle'))) return false;
  const v = picked ? v0 : '';
  const k = v && (generic || GENERIC_BADGE.has(kind)) ? v : kind;
  const r = { x: cx - s, y: cy - s, w: 2 * s, h: 2 * s };
  const fx = k === 'crystal' ? null : iconTintOf(e);
  return smoothDraw(e.g, () => (k === 'crystal' ? drawAtlasItemTinted(e.g, 'ui_badges', BADGE_ITEM[k], r, e.accent) : fx ? drawAtlasItemFx(e.g, 'ui_badges', BADGE_ITEM[k] ?? 'base', r, fx) : drawAtlasItem(e.g, 'ui_badges', BADGE_ITEM[k] ?? 'base', r)));
}

/**
 * 世界挂点：有投影（M6）时用兴趣点 / 玩家的真实屏幕位置，没有时（全部控件展示、没有场景）用画面上的近似位置。
 * M12a-15：钉住的挂点（e.pins，anchoredCard 的卡外下沿）先用；held = 场景报的手持物（worldNow().held；场景明确报了「没有手持物」= null 时 missing，
 *   元素不画；场景不管手持物（undefined，引擎现在不建模手持物）时照旧用玩家的点）；cursor = 模拟指针（待机相位上缓慢漂移，相位 0 时就是原来的近似点）。
 * dir：屏幕外时从画面中心指向它的方向（elx.offscreen = edgeArrow 用）
 */
export function attachPoint(e: ElCtx, a: Attach): { x: number; y: number; depth?: number; on?: boolean; dir?: [number, number]; missing?: boolean } {
  const pin = e.pins?.[a];
  if (pin) return { x: pin.x, y: pin.y };
  const w = e.noWorld ? null : worldNow();
  if (w) {
    if (a === 'held' && w.held === null) return { x: 0, y: 0, on: false, missing: true };
    // 场景里没有目标（F 轨道：world.target = null，不再拿灯 / NPC 顶替）：挂在目标上的元素不画（原来飘在画面上一个估的位置）
    if (a === 'target' && w.target === null) return { x: 0, y: 0, on: false, missing: true };
    const p = a === 'target' ? w.target : a === 'poi' ? w.poi : a === 'player' ? w.player : a === 'held' ? w.held ?? w.player : null;
    if (p) return { x: p.x, y: p.y, depth: p.depth, on: p.on, dir: p.dir };
  }
  const R = e.R;
  switch (a) {
    case 'target': return { x: R.x + R.w * 0.64, y: R.y + R.h * 0.42 };
    case 'poi': return { x: R.x + R.w * 0.5, y: R.y + R.h * 0.56 };
    case 'player': case 'held': return { x: R.x + R.w * 0.5, y: R.y + R.h * 0.62 };
    case 'cursor': { const t = simNow().idle; return { x: R.x + R.w * (0.58 + 0.04 * Math.sin(t * 0.7)), y: R.y + R.h * (0.5 + 0.03 * Math.sin(t * 1.1)) }; }
    default: return { x: R.x + R.w / 2, y: R.y + R.h / 2 };
  }
}

/** 屏外箭头的中心（画面边缘内收 26 × e.k，朝 dir）；dir 是零向量时 null */
export function edgeArrowAt(e: ElCtx, dir: [number, number]): { x: number; y: number } | null {
  const R = e.R, m = 26 * e.k;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const kx = dir[0] !== 0 ? (R.w / 2 - m) / Math.abs(dir[0]) : Infinity, ky = dir[1] !== 0 ? (R.h / 2 - m) / Math.abs(dir[1]) : Infinity;
  const k = Math.min(kx, ky);
  return Number.isFinite(k) ? { x: cx + dir[0] * k, y: cy + dir[1] * k } : null;
}
/** 屏外箭头占的方块（审查修复 A · L14：命中框与占位表用） */
export function edgeArrowRect(e: ElCtx, dir: [number, number]): Rect | null {
  const p = edgeArrowAt(e, dir), h = 14 * e.k;
  return p ? { x: p.x - h, y: p.y - h, w: h * 2, h: h * 2 } : null;
}
/**
 * 屏外挂点的边缘箭头（elx.offscreen = edgeArrow，M12a-15）：画面边缘一枚指向它的三角（与 el.objective 的屏外箭头同一种画法），色 = 元素强调色
 */
export function edgeArrow(e: ElCtx, dir: [number, number], color = e.accent) {
  const p = edgeArrowAt(e, dir), g = e.g;
  if (!p) return;
  g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(dir[1], dir[0]));
  g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(14 * e.k, 0); g.lineTo(-8 * e.k, -11 * e.k); g.lineTo(-3 * e.k, 0); g.lineTo(-8 * e.k, 11 * e.k); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
