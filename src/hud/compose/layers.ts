import { bakeFrame, DRAW_LOG, installLineFloor, ORN, paintScale, QUALITY, setFloors, type Rect } from '../paint';
import { EASE, simNow } from '../sim';
import { baseId, SELECTORS } from '../sys/register';
import type { Theme } from '../sys/theme';
import { hudBackdrop, hudSceneTreatment, screenEdges, screenEdgesTop } from './backdrop';
import { drawElements, wantsElements, type DiegeticItem, type Hit } from './hud';
import { drawMenuScreen, wantsMenu } from './menu';
import { frameOccupancy, resetOccupancy } from './occupancy';
import { drawSample, SAMPLE_HUD, type DrawCtx } from './sample';
import { clearMapOpen, drawScreen, isPopupTemplate, overlayBody, overlayTemplate, wantsTemplate } from './screen';
import { touchLayer } from './touch';
import { flushRoles, layerExtent } from '../pixelRoles';
import { ICON_CTX, ICON_STYLE, packIconMap } from '../icons/draw';
import { pack } from '../content';
import { PLACEHOLDER } from '../greybox';
import { mix } from '../material';
import { resolveColor } from '../paint';

/*
 * 一侧 UI 的合成分支（M12a-19 起从 HudSystem 抽出来，快照工具与 HudSystem 共用同一份）：
 *   界面模板（弹出类先画垫底）/ 叠加模板（有主体走构图器，没有只画元素）/ 菜单样本 / 按元素排版的局内 HUD / 四控件样本。
 * 垫底（flow.stacking）：弹出类模板 stack / pushBack 时、任何模板 overHud 时先画局内 HUD——选了品类布局（uip.layout）就画这个布局的元素 HUD，
 *   没选时仍是四控件样本（原来的）；模板的背后处理（rel.dim）把垫底一起压暗。
 * 菜单打开时保留的局内元素（elx.keepOnMenu）：模板画完后，品类布局里打开了这个开关的元素按局内 HUD 的位置再画一遍、不压暗。
 * 每次合成前清空占位表（compose/occupancy.ts），合规层（drawOps）读这一侧最后的表。
 */

/** 当前品类布局的局内元素（模板打开时用来垫底 / 保留）：只认显式选的 uip.layout；没有时 null（垫底退回四控件样本） */
export function hudLayoutElements(th: Theme): string[] | null {
  const sel = th.r.art[SELECTORS.layout];
  if (sel === undefined || sel === 'auto' || sel === 'none') return null;
  const v = th.r.presets.layout?.values['cnt.elements'];
  const list = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').filter(Boolean) : [];
  return list.length ? list : null;
}
/**
 * 布局跟随画面品类（uip.layout = auto）时的局内元素（§8 RC2）：解析出的品类布局写的 cnt.elements；显式选了布局、选了「不套用」、或开着四控件样本（开发 / QA）时 null。
 * 垫底 / 保留那两遍在没有显式布局时用它，不再退回四控件样本
 */
export function autoLayoutElements(th: Theme): string[] | null {
  const sel = th.r.art[SELECTORS.layout];
  if (SAMPLE_HUD.on || (sel !== undefined && sel !== 'auto')) return null;
  const v = th.r.presets.layout?.values['cnt.elements'];
  const list = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').filter(Boolean) : [];
  return list.length ? list : null;
}
/** 部件命中框的中文名（画框上的名签，§6「第二阶段」） */
const PART_LABEL: Record<string, string> = { titleBar: '标题栏', panel: '数据区', card: '主体', tooltip: '详情', button: '按钮', tab: '页签', listRow: '列表行', slot: '格子', modal: '容器' };
/** 模板区域（帧占位表里模板登记的块）→ 部件种类 */
const SUB_PART: Partial<Record<string, string>> = { header: 'titleBar', data: 'panel', detail: 'tooltip', focal: 'card' };
/** 没标部件种类的可点目标按形状猜：宽 ≥ 3 倍高的横条 = 列表行，近方形的小块 = 格子，其余 = 按钮 */
const guessPart = (w: number, h: number) => (w >= h * 3 ? 'listRow' : Math.abs(w - h) <= Math.max(w, h) * 0.2 && w <= 90 ? 'slot' : 'button');
/**
 * 模板 / 菜单的部件命中框（docs/workbench-redesign.md §6「第二阶段」，轨道 E；约定见 HudSystem.ts 的 PartHit）：
 *   模板在帧占位表里登记的区域（页头 / 数据区 / 详情 / 主体）+ 这一屏画的可点目标（按钮、页签、列表行、格子、浮动详情——绘制记录里 targets 从 t0 起的那些）。
 *   element = 部件 id（种类，同种第 2 个起带 #序号），part = 部件种类（COMPONENTS 的名字），target = 覆盖目标 tpl.<模板 id>（cmp.*@tpl.<id>），label = 中文名签。
 *   矩形是设计单位（HudSystem 统一乘 unitK 换成 CSS 像素）。绘制记录关着时（单元测试、快照）返回空表
 */
function partHits(d: DrawCtx, th: Theme, t0: number, o0: number): Hit[] {
  if (!DRAW_LOG.on) return [];
  const k = paintScale(d.ctx) || 1, cw = d.ctx.canvas.width;
  const sel = th.r.presets.screen?.id ?? String(th.r.art[SELECTORS.screen] ?? '');
  const target = sel && sel !== 'auto' && sel !== 'none' ? (sel.startsWith('tpl.') ? sel : `tpl.${sel}`) : undefined;
  const out: Hit[] = [], n: Record<string, number> = {};
  const push = (part: string, rect: Rect, label?: string) => {
    const i = (n[part] = (n[part] ?? 0) + 1);
    out.push({ element: i > 1 ? `${part}#${i}` : part, rect, kind: 'part', part, ...(target ? { target } : {}), label: label ? `${PART_LABEL[part] ?? part} · ${[...label].slice(0, 6).join('')}` : PART_LABEL[part] ?? part });
  };
  for (const it of frameOccupancy().items.slice(o0)) {
    const part = it.kind === 'template' && it.sub ? SUB_PART[it.sub] : undefined;
    if (part && it.rect.w > 4 && it.rect.h > 4) push(part, { ...it.rect });
  }
  for (const t of DRAW_LOG.targets.slice(t0)) {
    if (t.cw !== cw || t.w < 2 || t.h < 2) continue;
    const rect = { x: t.x / k, y: t.y / k, w: t.w / k, h: t.h / k };
    push(t.part ?? guessPart(rect.w, rect.h), rect, t.label);
  }
  return out;
}
const keepOn = (th: Theme, id: string) => { const v = th.r.el(id, 'keepOnMenu'); return v === true || v === 'true'; };
/**
 * 垫底 / 保留那两遍排位用的元素（M12b-65 ① / ⑤）：品类布局的元素，去掉 elx.underlay = hide 的（空洞骑士地图下不再压着居中小地图）与叙事内的板子
 * （elx.diegesis = diegetic：在世界里，不在界面模板背后画成屏幕元素）；显式 elx.keepOnMenu 的都留着（保留那一遍画它）。两遍用同一份，排位一致；全筛掉时是空表（不退回四控件样本）
 */
export function underlayIds(th: Theme): string[] | null {
  const all = hudLayoutElements(th) ?? autoLayoutElements(th);
  if (!all) return null;
  const r = th.r;
  // 透明的世界地图开着时（clearMapOpen，R4 审查修复 ③⑰）小地图不垫底：从抠掉的未探索区透出来压在世界地图中间（hollow-knight 地图 + layout.metroidvania 的居中小地图）
  const noMini = clearMapOpen(th);
  const out = all.filter((id) => keepOn(th, id) || (String(r.el(id, 'underlay') ?? 'auto') !== 'hide' && String(r.el(id, 'diegesis') ?? r.str('rel.diegesis', 'screen')) !== 'diegetic' && !(noMini && baseId(id) === 'el.minimap')));
  return out;
}

/** 垫底的缩放（flow.stacking = pushBack：缩小后退） */
const PUSH_BACK = 0.94;

/**
 * 垫底：局内 HUD（品类布局的元素；没有布局时四控件样本）；pushBack = 缩小后退。
 * 保留的元素（elx.keepOnMenu）也一起排位、这一遍不画（审查修复 A · L4：两遍用同一份排位，模板之后按同一个位置画保留的那几个）。
 * 这一遍登记进帧占位表的东西标成 under、矩形按 pushBack 的缩放换算（审查修复 A · L15：原来按没缩的位置登记，差到 27；浮动详情不躲压暗了的垫底 HUD）
 */
function underlay(d: DrawCtx, R: Rect, th: Theme, pushBack: boolean) {
  const ctxs = d.t ? [d.ctx, d.t] : [d.ctx];
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  if (pushBack) for (const c of ctxs) { c.save(); c.translate(cx, cy); c.scale(PUSH_BACK, PUSH_BACK); c.translate(-cx, -cy); }
  // 垫底那一遍按元素筛（M12b-65 ① / ⑤）：elx.underlay = hide 的不画；叙事内的板子（elx.diegesis = diegetic）不在界面模板背后画成屏幕元素（dead-space#26：工作台屏的面板背后透出生命板），
  // 显式 elx.keepOnMenu 的照旧由保留元素那一遍画
  const ids = underlayIds(th);
  const occ = frameOccupancy(), n0 = occ.items.length;
  if (ids) drawElements(d, R, th, null, undefined, [], { ids, noTouch: true, paint: { except: ids.filter((id) => keepOn(th, id)) } });
  else if (SAMPLE_HUD.on) drawSample(d, R, th);
  for (const it of occ.items.slice(n0)) {
    it.under = true;
    if (pushBack) it.rect = { x: cx + (it.rect.x - cx) * PUSH_BACK, y: cy + (it.rect.y - cy) * PUSH_BACK, w: it.rect.w * PUSH_BACK, h: it.rect.h * PUSH_BACK };
  }
  if (pushBack) for (const c of ctxs) c.restore();
  // 按角色像素化拆层时（B10 审查修复 ⑲）：垫底这一遍先合成下去，模板的压暗 / 弹窗整体压在它上面（原来整层合成：垫底 HUD 的字压在弹窗面板上、不被压暗）
  flushRoles();
}

/**
 * 菜单打开时保留的局内元素（elx.keepOnMenu）：按局内 HUD 的位置画在模板之上、不受 HUD 显隐影响——与垫底同一份排位（全部元素一起排、只画保留的这几个，
 * 审查修复 A · L4）；垫底那一遍已经登记过占位表，这一遍不再登记（没有垫底时——非弹出模板——登记一次）
 */
function keptElements(d: DrawCtx, R: Rect, th: Theme, underlaid: boolean) {
  const all = underlayIds(th), ids = all?.filter((id) => keepOn(th, id));
  if (all && ids?.length) drawElements(d, R, th, null, undefined, [], { ids: all, keepVis: true, noTouch: true, paint: { only: ids }, noRegister: underlaid });
}

/**
 * 打开界面（M12c-14：chk.demo = openScreen / resultsTally、chk.simPose = enterMid 的 open 事件）：sim.open < 1 时模板整块淡入、
 * 从上往下揭开（裁剪高度 = 画面高 × easeOut(进度)），内容按从上到下的顺序出现；没有打开事件时 open = 1，原样画
 */
function opening<T>(d: DrawCtx, RD: Rect, draw: () => T): T {
  const o = simNow().open;
  if (o >= 1) return draw();
  const ctxs = d.t && d.t !== d.ctx ? [d.ctx, d.t] : [d.ctx], F = d.full ?? RD, h = F.h * EASE.easeOut(o);
  for (const c of ctxs) { c.save(); c.globalAlpha *= Math.min(1, o * 2); c.beginPath(); c.rect(F.x, F.y, F.w, h); c.clip(); }
  try { return draw(); } finally { for (const c of ctxs) c.restore(); }
}

/**
 * 合成一侧的 UI（HudSystem 的 compose 与快照工具共用）：返回参数面板点选用的命中框、这一侧是不是按元素排版。
 * 调用方负责：模拟状态、内容包、伪本地化、震屏 / 转场的变换、ORN.frame；之后画模拟特效与运营层（drawOps）
 */
export function composeLayers(d: DrawCtx, RD: Rect, th: Theme, highlight: string | null = null, diegetic: DiegeticItem[] = [], opts: { newFrame?: boolean } = {}): { hits: Hit[]; usesElements: boolean } {
  resetOccupancy();
  // 线宽下限（§8 P0）：这一侧的画布细于 1 个设备像素的描线抬到 1 个设备像素
  installLineFloor(d.ctx); installLineFloor(d.t);
  // 下限豁免（审查修复）：皮肤之后显式给了的字号 / 淡字色 / 可读辅助 / 描边宽照它画（theme.ts 的 floors）
  setFloors(th.floors);
  // 这一侧的图标画风（§8 RC4：一屏一种图标语言；元素按目标写的画风由 core.ts 的 icon() 临时改）
  ICON_STYLE.v = th.iconStyle;
  // 内容包的「符号 → 物品图标」对照（审查修复 E 视觉 ⑦⑧⑬：建造栏的 ≡ 画成道路、⚙ 画成工厂……）
  { const p = pack(), sc = p.screens as unknown as Record<string, unknown>, h = p.hud as unknown as Record<string, unknown>;
    const lists = [h.tools, h.quickItems, h.resExtra, h.res, p.menu.items, sc.builds, sc.mapFilters, sc.commands].filter(Array.isArray) as unknown[][];
    // 技能符号不换（✦ 是雪线的技能，同一个符号在物品清单里又是水晶）——除非技能本身就是快捷物品（农场的农具 / 水罐 / 砍刀）
    const qi = new Set(((h.quickItems ?? []) as unknown[][]).map((x) => String(x[0])));
    const reserved = new Set(((h.abilities ?? []) as unknown[][]).map((x) => String(x[0])).filter((g) => !qi.has(g)));
    ICON_CTX.pack = QUALITY.on ? packIconMap(p.id, lists, reserved) : null; ICON_CTX.item = null; ICON_CTX.items = 0; }
  // 占位剪影的着色（§8 RC7）：皮肤面板底压暗一档 → 强调色与面板底的混色
  { const sf = resolveColor(th.surface, th.pal, '#3a4250'); PLACEHOLDER.tint = [mix(sf, '#000000', 0.3), mix(resolveColor('@accent', th.pal, '#7b8798'), sf, 0.55)]; }
  // 成品缓存的新一帧（中期审查修复 ㉘：这一帧用过的不淘汰、每帧新烘有上限、预算按画布大小）。
  // opts.newFrame = false：调用方已经为这一帧调过 bakeFrame（HudSystem 的 A / B 两侧同一帧，终期审查修复 ㉒）；快照工具 / 测试照旧每次一帧
  bakeFrame(...layerExtent(d.ctx), opts.newFrame !== false);
  ORN.where = 'hud';
  const stacking = th.r.str('flow.stacking', 'stack');
  // 界面模板（M9a）：弹出类（升级、确认、恭喜获得……）先画局内 HUD 当背景（flow.stacking：替换 = 不画、后退 = 缩小、overHud = 非弹出模板也垫）
  if (wantsTemplate(th)) {
    const under = (isPopupTemplate(th) && stacking !== 'replace' && stacking !== 'overHud') || stacking === 'overHud';
    if (under) underlay(d, RD, th, stacking === 'pushBack');
    ORN.where = 'screen';
    const t0 = DRAW_LOG.targets.length, o0 = frameOccupancy().items.length;
    opening(d, RD, () => drawScreen(d, RD, th));
    const parts = partHits(d, th, t0, o0);
    ORN.where = 'hud';
    keptElements(d, RD, th, under && !!(hudLayoutElements(th) ?? autoLayoutElements(th)));
    return { hits: parts, usesElements: false };
  }
  // 叠加 / 横幅 / 无容器的模板（M12a-25）：有主体（数据、主体插画或替换背景）时仍走模板构图器，只去掉面板和页头；没有主体时只画元素（先做显式给了的场景处理）。
  // 垫底只认显式的 overHud（这类浮层原来不垫局内 HUD）
  if (overlayBody(th)) {
    if (stacking === 'overHud') underlay(d, RD, th, false);
    ORN.where = 'screen';
    const t0 = DRAW_LOG.targets.length, o0 = frameOccupancy().items.length;
    const hits = [...opening(d, RD, () => drawScreen(d, RD, th, { chrome: false })), ...partHits(d, th, t0, o0)];
    ORN.where = 'hud';
    keptElements(d, RD, th, stacking === 'overHud' && !!(hudLayoutElements(th) ?? autoLayoutElements(th)));
    return { hits, usesElements: true };
  }
  // 屏幕边缘遮罩（ast.screenEdge，B10 审查修复 ④）：只画元素的叠加模板、菜单样本、四控件样本也画（原来只有模板 / 有主体的叠加 / 元素 HUD 画，这三条分支里写了没反应）
  if (overlayTemplate(th)) {
    if (stacking === 'overHud') underlay(d, RD, th, false);
    hudSceneTreatment(d, RD, th); screenEdges(d.ctx, d.full ?? RD, th, 'under');
    const hits = drawElements(d, RD, th, highlight, diegetic, [], { inTemplate: true });
    keptElements(d, RD, th, stacking === 'overHud' && !!(hudLayoutElements(th) ?? autoLayoutElements(th)));
    screenEdgesTop(d, d.full ?? RD, th);
    return { hits, usesElements: true };
  }
  if (wantsMenu(th)) { ORN.where = 'screen'; const t0 = DRAW_LOG.targets.length, o0 = frameOccupancy().items.length; opening(d, RD, () => drawMenuScreen(d, RD, th)); ORN.where = 'hud'; return { hits: partHits(d, th, t0, o0), usesElements: false }; }
  // 局内 HUD 的场景处理（M12a-24）：rel.dim / rel.sceneTone 显式设置时先在元素下面压暗 / 着色，默认不画
  // 全屏层（M12b-51）：程序画的替换背景（漩涡底 / 像素云天 / 背光，rel.behind = replaced 时）铺在最底、屏幕边缘遮罩按 ast.screenEdgeLayer 画在元素下面或上面
  if (wantsElements(th)) {
    hudBackdrop(d, d.full ?? RD, th); hudSceneTreatment(d, RD, th); screenEdges(d.ctx, d.full ?? RD, th, 'under');
    const hits = drawElements(d, RD, th, highlight, diegetic);
    screenEdgesTop(d, d.full ?? RD, th);
    return { hits, usesElements: true };
  }
  // 四控件样本（局内 HUD、没选品类布局）：程序画的替换背景与边缘遮罩也画（B10 审查修复 ④；场景处理照旧不做，原来的）。
  // §8 RC2：样本只在开发 / QA 开关打开时画；关着时走到这里 = 「不套用」布局且没有元素，只画背景、边缘与触屏层
  hudBackdrop(d, d.full ?? RD, th); screenEdges(d.ctx, d.full ?? RD, th, 'under');
  if (SAMPLE_HUD.on) drawSample(d, RD, th);
  touchLayer(d.ctx, d.t ?? d.ctx, th, { x: RD.x + 12, y: RD.y + 12, w: RD.w - 24, h: RD.h - 24 })?.draw();
  screenEdgesTop(d, d.full ?? RD, th);
  return { hits: [], usesElements: false };
}
