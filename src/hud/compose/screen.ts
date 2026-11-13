import { drawGreybox, PLACEHOLDER } from '../greybox';
import { drawPadlock } from '../glyphs';
import { luminance, MATERIAL_BASE, mix, withAlpha } from '../material';
import { boxPath, colorUnder, drawBox, DRAW_LOG, isHudCanvas, QUALITY, fadePaint, fadeStroke, fitLine, FONT_EPOCH, logTarget, MEASURE_ONLY, measureOnlyCtx, PSEUDO, resolveColor, TEXT_K, wrapLines, type Rect, type TextOpts } from '../paint';
import { divider, flourish, flourishCorners, glyph, inkBlob, NO_ORNAMENT_INSETS, ornamentInsets, type OrnamentInsets } from '../ornament';
import { asItem, drawBulb, mapStyleOf, TILT, tiltLayersOf, tiltSplit, panelArtDraw, renderModeOf, itemIcon, cursorInk, cursorSetOf, artSlot, attachPoint, avatar, badge, displayFor, elementParts, formsOf, button, buttonText, chosen, ornColor, chosenKey, cmp, cmpKey, cmpPicked, ctaText, DATA, declaredStates, ELEMENTS, lineColor, onAccent, tiltOf, wellBox, gauge, icon, itemCount, itemCountOr, itemCountSet, keyCap, keyCapWidth, LH, lockedFrom, makeCtx, MAX_ITEMS, mutedOf, onKey, packRarity, panel, plate, pickedStr, platePick, postSkinKey, gaugeOf, onCanvas, rarityColor, rarityCues, rarityShown, sampleItems, scopedSet, scopedStr, scopedSilhouette, semantic, silhouetteOf, rarityWord, drawNumber, numberWidth, fmtNumber, portraitBox, slot, slotLabelH, slotLabelOf, slotTintOn, FRESH_DEMO, stateDemo, T, tap, W, type ChoiceCtx, type ElCtx, titlePrefix, earTab, plateWidthOf, bracketWidth, BAND_PLATES, ORNATE_PLATES, type PlateExtra } from '../elements/core';
import { PRESET, SPEC_PARAM } from '../sys/spec';
import { baseId, SELECTORS } from '../sys/register';
import { LAYER_RANK } from '../sys/resolve';
import { mapClear, mapPaper, MAP_STYLE, styleBase, worldNow, type MapColors } from '../world';
import { drawCursor } from '../cursors';
import { flowNow } from '../flow';
import { EASE, simNow } from '../sim';
import { afterSkin, ensureContrast, FONT_STACK, onColorOf, px1080, type Theme } from '../sys/theme';
import type { BoxStyle } from '../types';
import type { Attach } from '../elements/core';
import { assetFile, characterImage, drawAtlasItem, drawImageFit, drawImageFitFx, drawInkTitle, iconSetId, mapAsset, uiImagesVersion, uiImage } from '../uiAssets';
import { anchorGiven, drawElements, templateParts, tplLayoutV2, type Hit } from './hud';
import { drawEdgeBar, edgeBarPlan, type BarSegment } from './edgebar';
import { frameOccupancy, intersects, OCC, overlapArea, type TemplateSub } from './occupancy';
import { currentMarker, drawNode, LAYOUT_NODES, nodeFootprint, setCurrentLabel, type NodeSpec, type NodeState } from '../elements/node';
import { navKeysOn, tabColumnW, tabStrip, type TabItem } from '../elements/tabs';
import { CTA_SPLIT, DLG_BOXES, legend, legendSize, type LegendSpec } from '../elements/info';
import { drawContainerFor } from './menu';
import { drawWatermark, hudSceneTreatment, relSet, replacedBackdrop, sceneTreatment, screenEdges, screenEdgesTop } from './backdrop';
import type { DrawCtx } from './sample';
import { artRef, fill, GENERIC, opsText, pack, settingsOf, type ArtKey } from '../content';
import { sampleKind, samplesFor } from '../content/samples';
import { spokenLine, textFor, textPick } from '../content/texts';
import { drawRich, measureRich, plainText } from '../richText';
import { drawField, measureField, SECTIONS, type FieldData, type SectionSeed } from '../elements/fields';
import type { ItemRow, ItemState, RowStatus, SampleKind, SlotGroupRow, TypedSamples } from '../content/types';
import { CHART_KINDS, chartData, statViz } from '../elements/charts';
import { cardBelowH, cardKind, drawCard, handCard, rowCard } from '../elements/card';
import { FLOW_DIRS, graphRng, layoutGraph, radialSquash, seedOf, type FlowDir, type Graph, type GraphKind, type GraphOpts } from './graph';
import { drawConnector, drawConnectors, drawLeader, type EdgeInfo } from '../connectors';
import { flushRoles } from '../pixelRoles';

/*
 * 界面模板构图器（docs/ui-hud-plan.md M9a）：63 个界面模板（tpl.*，调研 JSON 的 screen 预设）不是 63 段画法，
 * 而是同一套正交参数的不同取值——
 *   背后（rel.behind / rel.dim / rel.sceneBlur / rel.sceneTone / ast.bgArt）→ 容器（ast.container 或 lay.container + lay.panelSize + cmp.modal）
 *   → 标题与导航（lay.nav：顶 / 左 / 底 / 右页签、图标宫格、场景热区）→ 分区（lay.composition × cnt.focal × lay.focalSide × lay.layering）
 *   → 主数据（cnt.dataShape × lay.arrangement：集合 / 序列 / 关系网 / 表 / 表单 / 文本 / 空间 / 单值 / 详情）
 *   → 详情（lay.detail）→ 溢出提示（lay.overflow）→ 元素（cnt.elements，按锚点排在容器里）→ 按钮（ix.mode / ix.close）。
 * 条目的状态（st.locked / st.newCue / st.rank / ops.badges / col.coding）和组件形态（cmp.slot / cmp.listRow / cmp.node / cmp.option* / cmp.bindingMap / cmp.input）都读参数。
 * 只画静态骨架（M9a）；流程、揭示演出、运营动作留给 M9b。需要素材的部分画成带字的灰盒；
 * 有位图素材的（M11②：主视觉 / 风景背景、书桌 / 线索墙 / 柜台、立绘、商品图标、空状态、羊皮纸地图、书法标题）换成图，没加载完时仍是灰盒。
 */

/**
 * 走模板构图器的：选了界面模板（uip.screen = tpl.*），或手动设了基础界面的子功能。
 * 容器是"直接叠加 / 横幅"的浮层模板（提示条、战斗大字、过场字幕、引导……）不走这里：它们是局内 HUD 上的元素。
 */
export function wantsTemplate(th: Theme): boolean {
  const r = th.r;
  const sel = r.art[SELECTORS.screen];
  const sub = r.str('cnt.subtype', 'auto');
  const picked = (typeof sel === 'string' && sel.startsWith('tpl.')) || (!!sub && sub !== 'auto');
  if (!picked) return false;
  return !['overlay', 'banner', 'none'].includes(r.str('lay.container', 'modal'));
}

/** 选了界面模板但容器是"直接叠加 / 横幅"（过场字幕、手牌、对话轮盘、提示条……）：只画模板里的元素，不画菜单 */
export function overlayTemplate(th: Theme): boolean {
  const r = th.r;
  const sel = r.art[SELECTORS.screen];
  // 模板可以是显式选的（uip.screen），也可以是只选了界面类型时的默认模板（解析时放进 r.presets.screen）
  const tpl = (typeof sel === 'string' && sel.startsWith('tpl.')) || !!r.presets.screen?.id.startsWith('tpl.');
  return tpl && ['overlay', 'banner', 'none'].includes(r.str('lay.container', 'modal'));
}

/**
 * 叠加 / 横幅 / 无容器的模板有没有主体（M12a-25）：数据结构（cnt.dataShape）、主体（cnt.focal）或替换背景（rel.behind = replaced）任一项给了，
 * 就仍走模板构图器（drawScreen(…, {chrome: false})：只去掉面板和页头）；都没有时照旧只画元素（提示条、字幕、对话轮盘……）。
 * 原来一律只画元素：Dead Cells 的卷轴三选一整屏空白、XCOM 基地格子一格不画、Persona 对话没有立绘、Slay 主菜单没有主视觉
 */
export function overlayBody(th: Theme): boolean {
  if (!overlayTemplate(th)) return false;
  const r = th.r, set = (k: string) => !['none', 'auto', ''].includes(r.str(k, 'none'));
  // 对话类模板选了对话框版式（cmp.dialogBox 的新取值，B9 审查修复 ②）：对话框就是这一屏的内容，也走模板构图器（横幅 / 叠加的对话屏原来只画字幕元素，版式不生效）
  const dlg = dialogueLike(r) && DLG_NEW.has(pickedStr({ r, th, scope: ['dialog', 'el.screen'] }, 'cmp.dialogBox', ''));
  return set('cnt.dataShape') || set('cnt.focal') || r.str('rel.behind', 'live') === 'replaced' || dlg;
}

/** 弹出类模板（子功能是浮层，界面类型仍是局内 HUD）：底下先画 HUD */
export const isPopupTemplate = (th: Theme) => th.r.str('cnt.screen', 'screen.hud') === 'screen.hud';

const SPACES = new Set(['container', 'screen', 'header', 'data', 'detail']);
/** 元素在模板里的锚点空间（elx.anchorSpace，M12a-19）：没给 / inherit = 原来的容器外框（只避开页头行，不避让其余模板内容；审查修复 A · D15） */
export function anchorSpaceOf(r: Theme['r'], id: string): string {
  const v = String(r.el(id, 'anchorSpace') ?? 'inherit');
  return SPACES.has(v) ? v : 'inherit';
}

/** 给容器里的元素让位的数据结构（M12b-64 ① dataYield）：条目式的；地图 / 节点图不让 */
const YIELD_SHAPES = new Set(['collection', 'sequence', 'table', 'form', 'text', 'record']);
/** 左列锚点（页头的左控件段收它们，M12b-64 ②） */
const COL_LEFT = new Set<string>(['tl', 'ml', 'bl']);
/** 不自动进页头槽的元素：标题元素（页头本来就写标题）、行动号召、字幕、选项、读取条、聊天 */
const HDR_SKIP = new Set(['el.title', 'el.cta', 'el.subtitle', 'el.choices', 'el.loading', 'el.chat']);
/**
 * 页头槽的自动成员候选（M12b-64 ②）：没选锚点空间（elx.anchorSpace 的来源层是默认 / 兜底）、只有一种子项、锚在上排（tl / tc / tr，模板默认锚点口径见 templateParts）、
 * 不挂世界点。高度够不够（不比标题行高）、宽度放不放得下由调用方（screenPass / drawHeader）判断
 */
function headerAuto(th: Theme, id: string): boolean {
  const r = th.r;
  if (!ELEMENTS.has(id) || HDR_SKIP.has(baseId(id)) || anchorSpaceOf(r, id) !== 'inherit') return false;
  const l = r.src(r.elKey(id, 'anchorSpace'))?.layer;
  if (l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault') return false;
  const ps = templateParts(th, id);
  return ps.length === 1 && ['tl', 'tc', 'tr'].includes(ps[0].anchor) && !ps[0].given;
}
/** 页头行的标题行高（drawHeader 与页头槽的高度门槛同一个数） */
const headerRowH = (e: ElCtx) => Math.max(e.k * 40, LH(e, e.title, 1.6));

/* ---------------- 样本数据 ---------------- */

/*
 * 界面模板的样本都读当前内容包（../content，HudSystem 每画一侧前 setPack）：任务、绑定、服务器、排行、存档、统计、邮件、成就、路线、公告、
 * 制作人员、三选一、线索、跑马灯、主体大字读 pack().screens；游戏名 / 章节 / 副标题读 pack().game；格子与详情读 pack().menu；
 * 设置页 settingsOf()（包自己的或 GENERIC 的）；暂停 / 标题菜单与终端宫格 GENERIC。原来写死的"雪线旅人"样本在 content/packs/snowline.ts。
 * 运营类（商城、抽卡、签到、通行证、入口簇、顶栏货币、合规）的字不按品类，照旧写在这里。
 */

/** 当前包的位图文件（书法标题 / 主视觉 / 立绘）；这个包没有这张图时 null——调用方画剪影 / 灰盒，不借别的包的图 */
const artFile = (k: ArtKey) => { const ref = artRef(k); return ref ? assetFile(ref.id, ref.file) : null; };

/*
 * 按界面的结构化样本（M12b-62，content/samples.ts）：列表 / 网格 / 环 / 卡行 / 详情按 sampleKind(r) 取这一屏要的那一类，
 * 原来一律是背包物品（menu.items + menu.detail）。items 类（背包、商店……）与原来逐字一致；其余类的条目逐条带一个声明的状态（不再按序号演示锁定 / 新品 / 稀有度：
 * black-myth#44 图鉴格上的红点与星芒），图鉴进度为 0 的条目锁定。
 */

/** 列表 / 网格 / 环 / 卡行共用的一条样本：符号、名字、说明、右侧数值、进度 0~1、状态（结构化样本才有，原来的物品没有） */
interface SampleRow { icon: string; title: string; desc: string; value: string; progress: number; state?: ItemState;
  /** 列表行新字段的数据（M12b-13）：等级 / 上限 / 花费（升级格）、色块数字（[标签, 值]）、行内小格（符号） */
  lv?: number; max?: number; cost?: string; chips?: [string, string][]; slots?: string[];
  /** 行尾的时间字段（cmp.listRow 含 time；R4 C2 ⑦：建造行的回合数「⏱ n」） */
  time?: string }
/** 原料 / 建材的「名 有/要」 */
const haveNeed = (list: [string, number, number][]) => list.map(([n, h, q]) => `${n} ${h}/${q}`).join('　');
/** 这一类结构化样本的条目（M12b-62）；items / 不成列表的类（捏人、经营、任务——任务仍是 screens.quests）返回 null = 调用方用原来的 */
function kindRows(kind: SampleKind): SampleRow[] | null {
  const S0: ItemState = {};
  switch (kind) {
    case 'talents': return samplesFor('talents').map(([g, n, eff, v, lv, mx, cost]) => ({ icon: g, title: n, desc: plainText(eff), value: v, progress: mx ? lv / mx : 0, state: S0, lv, max: mx, cost }));
    case 'codex': return samplesFor('codex').map(([g, n, lore, pr]) => ({ icon: g, title: n, desc: plainText(lore), value: '', progress: pr, state: pr > 0 ? S0 : { locked: true } }));
    case 'roster': return samplesFor('roster').map(([n, cls, st, wp]) => ({ icon: [...n][0] ?? '', title: n, desc: `${cls} · ${wp.join(' / ')}`, value: st.map(([l, v]) => `${l} ${v}`).join('  '), progress: 0, state: S0, chips: st.map(([l, v]): [string, string] => [l, String(v)]), slots: wp.map((_, j) => ['⚔', '✦', '⛨'][j % 3]) }));
    case 'recipes': return samplesFor('recipes').map(([g, n, , inp]) => ({ icon: g, title: n, desc: haveNeed(inp), value: '', progress: Math.min(1, ...inp.map(([, h, q]) => (q ? h / q : 1))), state: S0 }));
    // 建造行（R4 C2 ⑦，civ6#48：原来数值与时间都空，cmp.listRow 的 value / time 什么也不画）：数值 = 第一项建材的需求量（Civ6 生产列表的产能花费），
    // 时间 = 回合数 + 时钟符号（行卡的样本时间 rowTime，与网格里的行卡同口径）
    case 'builds': return samplesFor('builds').map(([g, n, , mat], i) => ({ icon: g, title: n, desc: haveNeed(mat), value: mat[0] ? mat[0][2].toLocaleString('en') : '', time: rowTime(i), progress: Math.min(1, ...mat.map(([, h, q]) => (q ? h / q : 1))), state: S0 }));
    case 'characters': return samplesFor('characters').map(([ini, n, title]) => ({ icon: ini, title: n, desc: title, value: '', progress: 0, state: S0 }));
    case 'commands': return samplesFor('commands').map(([g, n]) => ({ icon: g, title: n, desc: '', value: '', progress: 0, state: S0 }));
    case 'pauseMenu': return samplesFor('pauseMenu').map(([g, n]) => ({ icon: g, title: n, desc: '', value: '', progress: 0, state: S0 }));
    case 'locations': return samplesFor('locations').map(([n, reg, dg]) => ({ icon: '◆', title: n, desc: reg, value: '◆'.repeat(Math.max(0, Math.min(3, dg))), progress: 0, state: S0 }));
    default: return null;
  }
}
/** 卡行的卡（[符号, 名字, 说明]，M12b-62）：名册 / 天赋按 kindRows、角色写引言；其余类 null = 原来的三选一 */
function cardRows(kind: SampleKind): [string, string, string][] | null {
  if (kind === 'roster' || kind === 'talents') return (kindRows(kind) ?? []).map((x) => [x.icon, x.title, x.desc]);
  if (kind === 'characters') return samplesFor('characters').map(([ini, n, , q]) => [ini, n, plainText(q)]);
  return null;
}
/** 网格 / 环用的条目（ItemRow 形状：[符号, 名字, 数量, 图集图标, 状态]）：结构化样本按 kindRows 换算（数量 = 0，状态逐条声明）；items 类原来的物品 */
function gridSource(e: ElCtx): ItemRow[] {
  if (GRID_SOURCE) return GRID_SOURCE.rows;
  const kr = kindRows(sampleKind(e.r));
  return kr ? kr.map((x) => [x.icon, x.title, 0, undefined, x.state]) : pack().menu.items;
}

/** 详情栏的内容（M12b-62）：名字、说明、属性条、附加行（原料 有/要、子目标、特性……，c = 字色）、按钮（给了时代替 detailButtons 的内容包按钮） */
interface DetailLine { s: string; c?: string }
interface DetailSpec { name: string; desc: string; stats: [string, number][]; lines: DetailLine[]; buttons?: string[] }
/** 这一屏的详情写什么（drawDetail / detailNeed / 浮动详情共用）：items = menu.detail（原来的）；结构化样本取这一类的第一条（选中的那条） */
function detailOf(e: ElCtx): DetailSpec {
  const p = pack(), kind = sampleKind(e.r), short = semantic(e, 'short');
  // 结算屏的记录（R4 回归修复 C1 ①，dont-starve#41）：名字 = 统计样本第一行（这一局的人），附加行 = 键值（chartData 的 pairs：存活 / 采集 / 打猎 / 体温），没有说明与属性条——原来按 sampleKind 落到背包物品（树枝 / 耐久 / 重量）
  if (resultsLike(e.r)) return { name: resultsName(), desc: '', stats: [], lines: (chartData().pairs ?? []).map(([l, v]) => ({ s: `${l}　${v}` })) };
  const hn = (list: [string, number, number][]): DetailLine[] => list.map(([n, h, q]) => ({ s: `${n}　${h} / ${q}`, c: h < q ? short : undefined }));
  switch (kind) {
    case 'talents': { const [, n, eff, , lv, mx, cost] = samplesFor('talents')[0]; return { name: n, desc: eff, stats: [[`等级 ${lv}/${mx}`, mx ? lv / mx : 0]], lines: [{ s: `花费 ${cost}`, c: e.accent }] }; }
    case 'codex': { const [, n, lore] = samplesFor('codex')[0]; return { name: n, desc: lore, stats: [], lines: [] }; }
    case 'roster': { const [n, cls, st, wp] = samplesFor('roster')[0]; return { name: n, desc: cls, stats: [], lines: [{ s: st.map(([l, v]) => `${l} ${v}`).join('　') }, ...wp.map((w) => ({ s: `◇ ${w}` }))], buttons: charButtons(e) }; }
    case 'locations': { const [n, reg, dg, desc, qs, act] = mapDetailLoc(e); return { name: n, desc, stats: [], lines: [{ s: `${reg} · 危险 ${'◆'.repeat(Math.max(0, Math.min(3, dg))) || '—'}`, c: dg >= 2 ? short : undefined }, ...qs.map((q) => ({ s: `◇ ${q}`, c: e.quest }))], buttons: [act] }; }
    case 'quests': { const q = p.screens.quests[0], d = samplesFor('questDetail'); return { name: q?.[0] ?? '', desc: d.desc, stats: [], lines: d.steps.map(([s, done]) => ({ s: `${done ? '✓' : '○'} ${s}`, c: done ? e.good : undefined })) }; }
    case 'recipes': { const [, n, desc, inp] = samplesFor('recipes')[0]; return { name: n, desc, stats: [], lines: hn(inp) }; }
    case 'builds': { const [, n, desc, mat] = samplesFor('builds')[0]; return { name: n, desc, stats: [], lines: hn(mat) }; }
    case 'characters': {
      const [, n, title, quote, perks] = samplesFor('characters')[0];
      // 角色详情（tpl.hero）带三条属性（局内选中卡的那三条）；选角 / 阵营（faction，dont-starve#20）不画属性条
      return { name: n, desc: quote, stats: e.r.str('cnt.subtype', '') === 'faction' ? [] : p.hud.selection.stats, lines: [{ s: title, c: e.accent }, ...perks.map((x) => ({ s: `◇ ${x}` }))], buttons: charButtons(e) };
    }
    default: return { ...p.menu.detail, lines: [] };
  }
}

/** 结算屏（cnt.subtype = runSummary 或 cnt.screen = screen.results）：详情 / 记录写这一局的数据（统计样本 + 玩家档案的经验），不写背包物品 */
const resultsLike = (r: ElCtx['r']) => r.str('cnt.subtype', '') === 'runSummary' || r.str('cnt.screen', '') === 'screen.results';
const resultsName = () => { const p = pack(); return String(p.screens.stats.rows[0]?.[0] ?? p.hud.profile.name); };
/** 这一局的经验（经验条字段）：玩家档案的「当前 / 升级」（3,420 / 6,000 → 0.57）与等级；读不出数时 0.62（原来的演示值） */
function resultsXp(): [number, string] {
  const pr = pack().hud.profile, [a, b] = (pr.exp.match(/[\d,.]+/g) ?? []).map((x) => Number(x.replace(/,/g, '')));
  return [a !== undefined && b ? Math.max(0, Math.min(1, a / b)) : 0.62, `等级 ${pr.level}`];
}

/**
 * 角色 / 名册详情的按钮（终期审查修复 ④）：这一屏有专门写的按钮变体（包的 / GENERIC 的，例如选角的「取消 / 随机 / 确定」）时用它；
 * 否则 GENERIC 给角色页的那一组（subtype = hero：装备 / 技能）——不再借内容包背包的「使用 / 丢弃」（rpg 包：装备 / 分解）
 */
function charButtons(e: ElCtx): string[] {
  const pk = textPick('buttons', e.r);
  if (pk && !pk.legacy) return pk.value;
  return GENERIC.texts.buttons?.find((v) => v.when?.subtype === 'hero')?.value ?? [];
}
/** 详情属性条后面的「→ 74 / +12」对比（st.delta）：物品对比当前装备才有；角色 / 名册详情没显式选 st.delta 时不画（终期审查修复 ④） */
const deltaOf = (e: ElCtx): string => (['characters', 'roster'].includes(sampleKind(e.r)) && !chosen(e, 'st.delta') ? 'none' : e.r.str('st.delta', 'none'));

/**
 * 地图屏的详情写哪个地点（中期审查修复 ⑥）：世界地图（cnt.dataShape = spatial）的详情挂在「当前」节点旁边，写这个节点的地名（与 vis.mapLabels = hover 同一条：
 * world.places[当前节点序号 % 地名数]）对应的地点；包里没有这个名字的地点时第一条（原来的）。地点列表（不是地图）仍是第一条（选中的那一行）
 */
function mapDetailLoc(e: ElCtx): TypedSamples['locations'][number] {
  const L = samplesFor('locations');
  if (e.r.str('cnt.dataShape', '') !== 'spatial') return L[0];
  const nm = currentPlace(e);
  return L.find((x) => x[0] === nm) ?? L[0];
}
/** 地图上「当前」节点的地名（world.places[序号 % 地名数]；没有当前节点时第一个节点） */
function currentPlace(e: ElCtx): string {
  const w0 = pack().world, places: [string, number, number][] = w0.places?.length ? w0.places : [[w0.region, 0.24, 0.2]];
  const n = mapNodeUV(e).length;
  let cur = 0;
  for (let i = 0; i < n; i++) if (progressState(e, i, 2) === 'current') { cur = i; break; }
  return places[cur % places.length][0];
}

/* ---------------- 入口 ---------------- */

/**
 * opts.chrome = false（M12a-25，§2）：叠加 / 横幅 / 无容器的模板——不画容器面板与页头、内框不加留白，主体与数据直接铺在场景上；背后只在显式给了 rel.dim / sceneTone 时
 * 处理（与局内 HUD 一样，替换背景照画）；只有主体没有数据时主体按 lay.focalSide 站在画面一侧贴底（半身立绘贴底边）。返回模板里元素的命中框（参数面板点选用）
 */
export function drawScreen(d: DrawCtx, R: Rect, th: Theme, opts: { chrome?: boolean } = {}): Hit[] {
  // lay.panelFit = fitContent（M12a-38）：先量（只量不画的一遍，按内容定容器尺寸），再按量出来的尺寸画
  const fit = fitScreen(d, R, th, opts);
  return screenPass(d, R, th, { ...opts, fit, band: bleedBand(d, R, th, opts, fit) }).hits;
}

/** 一遍构图：measure = 只量不画（fitScreen 用，画布是 measureOnlyCtx，跑到数据区排好就返回版面）；fit = 量出来的容器尺寸 */
interface PassOpts { chrome?: boolean; fit?: { w: number; h: number }; measure?: boolean; band?: Rect }
interface PassLayout { outer: Rect; mainR: Rect | null; detailR: Rect | null; shape: string; e: ElCtx; ink?: string; below?: number }
function screenPass(d: DrawCtx, R: Rect, th: Theme, opts: PassOpts): { hits: Hit[]; layout?: PassLayout } {
  const r = th.r, g = d.ctx, chrome = opts.chrome !== false;
  let hitsOut: Hit[] = [];
  const e = makeCtx('el.screen', g, d.t ?? g, th, R);
  const S = (n: number) => n * e.k;
  // 页头标题（M12b-61 的 headerLabel：区域 / 任务名 / 机器名 > 模板名；说话人在 drawHeader 里优先）
  const label = headerLabel(th);
  const focal0 = r.str('cnt.focal', 'none');
  const layering0 = r.str('lay.layering', 'separate');

  FOCUS_RECT = null; FOCUS_DRAWN = null; CTA_RECT = null; CONFIRM_RECT = null; FIRST_ITEM = null; ITEMS.length = 0; CURRENT_NODE = null; FOG_AT = null; CUE_AT = null; FOCAL_BOX = null;
  const fl = flowNow();
  // 主视觉海报（位图）里已经有主角：再叠一张立绘会出现两个画风不同的主角，所以这时不画立绘主体（M11）
  // 挂在世界点上的小卡片（lay.container = anchoredCard，M12a-15）：背后是照常进行的游戏，和叠加模板一样只在显式给了 rel.dim / sceneTone 时处理
  const anchored = r.str('lay.container', 'modal') === 'anchoredCard';
  // 测量的那几遍（fitScreen）只要版面：只画不影响排位的层（压暗 / 场景处理、水印、立绘、出血地图、揭示演出）跳过（审查修复 A · L7）；替换背景要看画没画主视觉，照跑
  const meas = !!opts.measure, replaced = r.str('rel.behind', 'live') === 'replaced';
  const keyArtShown = (meas ? (replaced ? backdrop(d, R, th) : undefined) : (chrome && !anchored) || replaced ? backdrop(d, R, th) : (hudSceneTreatment(d, R, th), undefined)) === 'keyArt';
  // 水印（ast.watermark，M12a-24：原来只有菜单样本的详情区画）：画在背景之上、容器之下，铺整屏
  const wm = r.str('ast.watermark', 'none');
  if (!meas && wm !== 'none' && wm !== 'auto') drawWatermark(g, R, wm, e.text, r.num('ast.watermarkOpacity', 0.12), e.t.panel.ornament?.motif, e.t.panel.ornament?.level);
  // 第二层水印（ast.watermark2，M12b-51，black-myth#25：压暗古画 + 书法大字两层）：叠在第一层之上，强度 ast.watermark2Opacity（没给时跟第一层）
  const wm2 = r.str('ast.watermark2', 'none');
  if (!meas && wm2 !== 'none' && wm2 !== 'auto') drawWatermark(g, R, wm2, e.text, r.has('ast.watermark2Opacity') && relSet(th, 'ast.watermark2Opacity') ? r.num('ast.watermark2Opacity', 0.12) : r.num('ast.watermarkOpacity', 0.12), e.t.panel.ornament?.motif, e.t.panel.ornament?.level);
  // 对话框版式（cmp.dialogBox 的新取值，M12b-21；B9 审查修复 ② / ⑯）：对话框就是这一屏的容器，主体不装进框里——人物站在框旁（behind，尾巴指向它），
  // 自带头像槽的版式（头像分框 / 通栏细框 / 通讯框）不再画站着的人物，场景类主体铺整屏（backdrop）。没选新版式时 dlgK0 = ''，照原来
  const dlgK0 = DLG_HOW.has(r.str('lay.container', 'modal')) && ['none', 'auto', ''].includes(r.str('ast.container', 'none')) ? dialogBoxOf(e) : '';
  // 通栏细框排在容器里时（dlgInside，R4 回归修复 C1 ③）：场景类主体照常画在容器里（不铺整屏）；人物主体仍由细框的头像槽代替
  const dlgIn0 = dlgK0 === 'framedBox' && dlgInside(r, chrome);
  const dlgFocal = !dlgK0 || focal0 === 'none' || focal0 === 'auto' ? '' : focal0 === 'character' ? (DLG_PORTRAIT.has(dlgK0) ? 'hide' : 'behind') : dlgIn0 ? '' : 'backdrop';
  const focal = (keyArtShown && focal0 === 'character') || dlgFocal === 'hide' ? 'none' : focal0;
  // 叠加模板只有主体、没有数据（M12a-25，Persona 对话的说话人半身）：主体站在画面一侧贴底，与 lay.layering = behind 同一个站位
  const shape00 = r.str('cnt.dataShape', 'none'), soloFocal = !chrome && focal !== 'none' && focal !== 'auto' && (shape00 === 'none' || shape00 === 'auto');
  const layering = dlgFocal === 'behind' || dlgFocal === 'backdrop' ? dlgFocal : soloFocal && layering0 !== 'backdrop' ? 'behind' : layering0;
  // 主体作整屏背景（lay.layering = backdrop）：先画在容器后面
  if (!meas && focal !== 'none' && focal !== 'auto' && layering === 'backdrop') drawFocal(e, R, focal, true);
  // 面板压主体（behind，如 NPC 对话）：立绘站在画面一侧、贴底，先画，对话框盖住下半身（M11）
  if (!meas && focal !== 'none' && focal !== 'auto' && layering === 'behind') drawFocal(e, standRect(R, r.str('lay.focalSide', 'left')), focal, false);

  // 主体与数据的分区（模板没写数据结构时按子功能补：菜单类 → 列表，确认 → 一句话，升级 → 前后对比详情）
  // 一句话只在有人写了 cnt.textLength（模板 / 手动，不是参数默认值 line）、模板本来就没有主体时补（目检修复：原来主视觉海报替掉立绘主体后，登录页在 LOGO 副标题上
  // 补了一句「渡船已经修好了…」；恭喜获得 / 聊天抽屉 / 建造 / 拍照 / 章节卡这些没写文字长度的模板也都补了这一句，恭喜获得那句压在 LOGO 上）
  const sub = r.str('cnt.subtype', '');
  // 对话框版式的台词（B9 审查修复 ② / ⑰）：没写 cnt.dataShape、按文字长度推出来的「一句话」就是台词——由对话框画（横幅 / 叠加的对话屏原来只画字幕元素，没有这段数据）；
  // 累积日志连显式写的长文数据区也并进日志（长文就是日志的来源，原来画的是那段带滚动条的长文，日志从没画出来）
  const shapeD = dataShapeOf(r), shapeSet = !['none', 'auto', ''].includes(r.str('cnt.dataShape', 'none'));
  const dlgLog = !!dlgK0 && shapeD === 'text' && (dlgK0 === 'transcript' || !shapeSet);
  // RPG 战斗结算没写数据结构时按结算表留数据区（rpgSettle 画在数据区里）
  // 标题块画法（el.title = notice / titlePage / chapterCard，M12b-30，obra-dinn#12）显式选过：标题块就是这一页的内容。R4 回归修复 C1 ⑥（obra-dinn#36）：任何模板上都算（原来只在标题界面 / 登录），
  // 主体的标题大字不画、标题块排进主体那一栏；没写数据结构、按 cnt.textLength 补的那一句不再补（原来扉页的插画位压着「警局回电了」）。显式写的 cnt.dataShape 照画
  const blockTitle = r.elements().includes('el.title') && ['notice', 'titlePage', 'chapterCard'].includes(r.str('el.title.form', '')) && chosenKey(e, 'el.title.form') !== null;
  const blockDrop = !dlgLog && sub !== 'rpgSettle' && blockTitle && !shapeSet && shapeD === 'text';
  const shape = dlgLog ? 'none' : sub === 'rpgSettle' && (shapeD === 'none' || shapeD === 'auto') ? 'table' : blockDrop ? 'none' : shapeD;
  // 分区面板（M12a-37）：cmp.modal = perRegion 不画总框、每个分区各一块半透明深底；显式选了 lay.layering = separate 且主体与数据分栏时只给数据那一栏画面板，
  // 主体直接画在背景上（Civ6 外交：领袖站在面板外）。原来两种都是一整块面板把主体也装进去
  const hasFocal0 = focal !== 'none' && focal !== 'auto', hasData0 = shape !== 'none' && shape !== 'auto';
  const perRegion = chrome && r.str('cmp.modal', 'standard') === 'perRegion';
  const lyl = r.src('lay.layering')?.layer;
  // （layering：有容器时 = lay.layering，只有对话框版式会改它——那时主体在框外，不分栏）
  const sepSplit = chrome && !perRegion && layering === 'separate' && !!lyl && !['default', 'fallback', 'ruleDefault', 'derived'].includes(lyl) && hasFocal0 && hasData0;
  // 世界地图出血（lay.mapBleed，M12a-30）：地图铺满整屏先画（不画容器面板），页头 / 页签 / 图例 / 元素都叠在地图上，上下各垫一条 scrim 让字看得清
  const bleed = chrome && shape === 'spatial' && mapBleedOn(r);
  MAP_BLED = bleed; MAP_FULL = bleed ? R : null; MAP_BAND = bleed && !meas ? opts.band ?? null : null;
  if (bleed && !meas) mapBase(e, R, true);
  // 屏幕边缘遮罩（ast.screenEdge，M12b-51）：默认画在背景之上、面板之下（ast.screenEdgeLayer = over 时在最后）。B10 审查修复 ③：排在整屏主体与出血地图之后——
  // 原来在它们之前画，出血地图（不透明的烘焙图 / 灰盒）把整层盖住
  if (!meas) screenEdges(g, d.full ?? R, th, 'under');
  // 元素与锚点空间（elx.anchorSpace，M12a-19）
  const els = r.elements();
  const space0 = (id: string) => anchorSpaceOf(r, id);
  // 钉在屏幕上的元素先排（只排不画，M12b-64 ① containerYield）：抽屉 / 全屏页 / 托盘 / 底部浮层按它们收边
  // （disco-elysium#46：右下的时钟框与工具栏原来压在日志抽屉底部、盖住选项）。地图不收（元素本来就叠在地图上）
  const scrIds = chrome ? els.filter((id) => space0(id) === 'screen' && ELEMENTS.has(id)) : [];
  const yieldTo = scrIds.length && shape !== 'spatial' ? drawElements(d, R, th, undefined, undefined, [], { ids: scrIds, inTemplate: true, layoutOnly: true }).map((h) => h.rect) : [];
  // 模板容器的整块倾斜（vis.tiltLayers ≠ box，M12b-40，persona5#33：P5 的结算 / 总攻击 / 日历是框、字、图整块一起转）：容器面板按整块的盒子角画，
  // 之后到跨界面常驻层之前画的东西（页头、数据、主体、元素……）绕容器中心转内容角；只量不画的那几遍不转
  TILT.delta = null;
  const tiltT = !meas && chrome && tiltLayersOf(e) !== 'box' ? tiltOf(e, 'el.screen|container') : 0, tsp = tiltT ? tiltSplit(tiltLayersOf(e), tiltT) : null;
  if (tsp) TILT.delta = tsp.box;
  const box0 = container(d, e, R, th, chrome, perRegion || sepSplit || bleed, opts.fit, yieldTo);
  const tiltCs = tsp ? [...new Set([g, d.t ?? g])] : [];
  if (tsp) { const o = box0.outer, cx = o.x + o.w / 2, cy = o.y + o.h / 2; for (const c of tiltCs) { c.save(); c.translate(cx, cy); c.rotate((tsp.content * Math.PI) / 180); c.translate(-cx, -cy); } TILT.delta = tsp.box - tsp.content; }
  if (bleed && !meas) bleedScrims(e, R, r.str('lay.titlePos', 'panel') !== 'none', mapStrip(e, d, th, R) > 0);
  let inner = box0.inner;
  // 面板插画槽（cmp.panelArt，M12a-36；只在画了面板的容器里）：full = 整幅底图压暗一半、内容排在上面；header = 内框顶部一条头图（占 28%），页头往下挪；
  // window（页头 / 页签与数据区之间）与 side（详情栏顶部，没有常驻详情时在主体左侧）在下面。没有素材时都是灰盒「插画（需素材）」
  // 面板插画槽按 @panel → 元素 → 全局读（审查修复 A · C10：浮动详情读 @tooltip，这里原来只读全局）
  // 没画面板的容器（浮层 / 全屏浮动）里，显式选过的图窗类取值（window / collage / photomontage / halo，M12b-32，xcom2#15：地图上的图窗原来不画）照样画
  const panelArt = framedPanel(e) ? cmp(e.part('panel'), 'cmp.panelArt', 'none') : unframedArt(e);
  if (panelArt === 'full') { const o = box0.outer; g.save(); g.beginPath(); boxPath(g, o, e.t.panel); g.clip(); artSlot(e, o, 'scene', '底图', { decor: true }); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(o.x, o.y, o.w, o.h); g.restore(); }
  // 头图高（cmp.panelArtRatio 选过时按宽高比，最多内框的六成；没选时 28%）
  if (panelArt === 'header') { const hh = artRatioH(e, inner.w, inner.h * 0.6) ?? inner.h * 0.28; artSlot(e, { ...inner, h: hh }, 'scene', '头图', { decor: true }); inner = { ...inner, y: inner.y + hh + S(8), h: inner.h - hh - S(8) }; }
  // 页头（标题 + 返回 / 关闭，M12a-23 的 drawHeader）：标题与关闭钮避开角饰（M12a-08）
  // 顶部框 / 累积日志 / 头像分框（M12b-21）不画页头：没有名牌 / 说话人写在段首 / 名签压在头像框下
  const hasHead = chrome && !['banner', 'overlay'].includes(r.str('lay.container', 'modal')) && !['topBox', 'transcript', 'splitPortrait'].includes(box0.dlg?.kind ?? '');
  // 页头里的元素先量高，页头行按它长高（M12a-19）
  const sizeOf = (id: string) => ELEMENTS.get(id)!.size(makeCtx(id, g, d.t ?? g, th, R));
  // 页头槽的高度上限（R4 回归修复 C1 ①，dont-starve#41）：放进页头的元素比 max(2 × 标题行高, 内框高 25%) 还高时不进页头、退回 inherit（容器里按锚点排）——
  // 原来页头行按它长高：tpl.runSummary 预设把 el.reward 放进页头，复刻写成 portrait（220 × 280）后页头行占满整块面板，主体区高为负，头像与记录都不画、继续钮压在卡下。几何修复，所有皮肤
  // 放进页头的元素各量一次（与原来 hdrH 的量法同序同次数：没有超高元素时画布调用序列不变）
  const hdrCap = Math.max(headerRowH(e) * 2, inner.h * 0.25);
  const hdrSz = new Map(hasHead ? els.filter((id) => space0(id) === 'header' && ELEMENTS.has(id)).map((id) => [id, sizeOf(id).h] as const) : []);
  const hdrTall = new Set([...hdrSz].filter(([, h]) => h > hdrCap).map(([id]) => id));
  const hdrIds = [...hdrSz.keys()].filter((id) => !hdrTall.has(id));
  const hdrH = hdrIds.length ? Math.max(...hdrIds.map((id) => hdrSz.get(id)!)) + S(8) : 0;
  // 页头槽的自动成员（M12b-64 ②，修审查修复 A · D15 带来的回退）：没选锚点空间、锚在上排（tl / tc / tr）、不比标题行高的元素默认进页头槽，
  // 放不下才照旧排在容器里（dead-space#27：背包的资源行压住标题、工作台的花费落进节点区；into-the-breach#39：结算的星级落进第一行）。旧皮肤见 tplLayoutV2
  const autoIds = hasHead && tplLayoutV2(th) ? els.filter((id) => headerAuto(th, id) && sizeOf(id).h <= headerRowH(e)) : [];
  // 左 / 右控件段要的宽：锚在左列的进左段，其余进右段（同一锚点的几项横着排，间距 8）
  const segW = (ids: string[], left: boolean) => {
    const ws = ids.filter((id) => COL_LEFT.has(templateParts(th, id)[0]?.anchor ?? 'tl') === left).map((id) => sizeOf(id).w);
    return ws.length ? ws.reduce((a, b) => a + b, 0) + S(8) * (ws.length - 1) : 0;
  };
  // 页头放了元素时标题照写、元素占左 / 右控件段（M12b-64 ②，hades#49）是新的版式行为：旧皮肤只在 tplLayoutV2 开着（皮肤之后给了 cnt.elements）或皮肤之后的层给了
  // 这些元素的 anchorSpace 时才这样；否则照原来（页头放了元素就整行不写标题，元素排满返回钮与关闭钮之间那一段）——终期审查修复 ⑥（tpl.runSummary 在 14 个旧皮肤上多写了「本局总结」、奖励右移 80）
  const segOn = tplLayoutV2(th) || hdrIds.some((id) => afterSkin(r, r.elKey(id, 'anchorSpace')));
  const head = hasHead ? drawHeader(e, inner, box0, label, R, hdrH, segOn ? { l: segW(hdrIds, true), r: segW(hdrIds, false), al: segW(autoIds, true), ar: segW(autoIds, false) } : undefined) : null;
  const hdrAuto = new Set(head?.autoOk ? autoIds : []);
  const space = (id: string) => (hdrAuto.has(id) ? 'header' : hdrTall.has(id) ? 'inherit' : space0(id));
  // 页头行登记进帧占位表（审查修复 A · D3）：合规层（适龄标识、版号……）避开标题与关闭钮；浮动详情的 occAvoid 不看 template，元素的避让用自己的局部表，不受影响
  if (head?.rect && !opts.measure) frameOccupancy().add(head.rect, { kind: 'template', prio: 3, sub: 'header' });
  if (head?.sign && !opts.measure) frameOccupancy().add(head.sign, { kind: 'template', prio: 3, sub: 'buttons' });
  // 没有页头行的对话框版式（叠加 / 横幅 / 无容器上的偏移框、多边形框、通栏细框、通讯框，B9 审查修复 ②）：说话人名签骑在框的左上沿（原来的字幕写「说话人：」前缀，进框后名字没了）
  const dlgTag = !head && box0.dlg && !['topBox', 'transcript', 'splitPortrait'].includes(box0.dlg.kind) && dialogueLike(r) && (!hasData0 || dlgLog) ? dialogNameTag(e, box0.dlg.box, meas) : null;
  if (dlgTag && !meas) frameOccupancy().add(dlgTag, { kind: 'template', prio: 3, sub: 'header' });
  // 头像分框的独立头像框 + 压在下沿的名签（画在文字框外，审查修复 ⑥）登记模板占位
  if (box0.dlg?.portrait && !meas) { const p = box0.dlg.portrait; frameOccupancy().add({ x: p.x - S(12), y: p.y, w: p.w + S(24), h: p.h + S(16) }, { kind: 'template', prio: 2, sub: 'focal' }); }
  // 容器外侧的附属按钮列（lay.sideButtons，M12b-17，stardew#34：背包右外侧的垃圾桶 / 整理钮）：贴容器左 / 右缘外一列小方钮，登记模板占位
  if (chrome && !meas) for (const q of sideButtons(e, box0.outer)) frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'buttons' });
  if (chrome && !meas) for (const q of sideThumbs(e, box0.outer)) frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'data' });
  if (box0.ear && !opts.measure) frameOccupancy().add(box0.ear, { kind: 'template', prio: 3, sub: 'ear' });
  let body: Rect = head ? head.body : inner;
  // 没有页头行的模板（M12b-64 ⑨，hades#21 / Frostpunk 对话屏）：正文首行 / 主体大字避开上面两个角花——角花比内框留白深时主体从角花下沿起（让出的高不超过主体的 15%；否则照旧）
  if (!head?.rect && box0.orn.corners.length) {
    const tc = box0.orn.corners.filter((c) => intersects(c, body) && c.y + c.h / 2 < body.y + body.h / 2);
    const ny = tc.length ? Math.max(...tc.map((c) => c.y + c.h)) + S(4) : body.y;
    if (ny > body.y + 0.5 && ny - body.y <= body.h * 0.15) body = { ...body, y: ny, h: body.y + body.h - ny };
  }
  // 底部按钮行（M12a-35）：模板按钮 / 运营动作 / 模板里的行动号召并成一行，先从主体底部扣掉这一行（原来按钮压在数据区最后一行上）。
  // 行动号召只在模板有数据区、或这一行本来就有运营按钮时并进来；没有数据区的弹窗（登录、转盘、拍照……）照旧按元素锚点画
  const opsOn = !fl || fl.s.stage === 'result', ctaIn = els.includes('el.cta');
  const opsBtns = opsOn && r.list('ops.actions').some((k) => k !== 'dontShow');
  // 显式放到别的锚点空间（screen / container / header……）的行动号召不并进按钮行，按它自己的空间和锚点画（M12b-64 ③，into-the-breach#9）
  // 贴边页签钮（el.cta = edgeTab）没有数据区时也进按钮行、挂到容器右下外沿（R4 回归修复 C1 ③，into-the-breach#30 / 41：对话屏的 CONTINUE 原来留在框里按锚点画）
  const ctaHang = ctaIn && formsOf(r, 'el.cta')[0] === 'edgeTab';
  const ctaRow = ctaIn && space('el.cta') === 'inherit' && (shape !== 'none' || opsBtns || ctaHang);
  const row = rowPlan(e, d, th, R, ctaRow ? 'cta' : ctaIn ? 'opsOnly' : 'buttons', opsOn);
  // 整行都挂在容器外沿（只有贴边页签钮）时主体不用让出这一行
  const rowHangOnly = row.items.length > 0 && row.items.every((it) => it.hang);
  if (row.items.length && !rowHangOnly && body.h > row.h * 2) body = { ...body, h: body.h - row.h - S(10) };
  // 容器里的通栏细框（dlgInside，R4 回归修复 C1 ③，into-the-breach#41）：贴内框底边（按钮行之上）的一条，高 = 主体的 30%（至少 84、至多 45%）；主体 / 数据 / 元素排在它上面
  let dlgInBox: Rect | null = null;
  if (box0.dlg?.inside && body.h > S(140)) {
    const h = Math.min(body.h * 0.45, Math.max(S(84), body.h * 0.3));
    dlgInBox = { x: body.x, y: body.y + body.h - h, w: body.w, h };
    box0.dlg.box = dlgInBox;
    body = { ...body, h: body.h - h - S(10) };
  }
  // 揭示演出的背景（M9b：光芒、开箱、闪白，强度 mo.reward）
  if (!meas && fl?.s.stage === 'ceremony') ceremonyFx(e, body);

  // 导航
  const nav = r.str('lay.nav', 'none'), hasFocal = focal !== 'none' && focal !== 'auto';
  const preNav = body;
  body = drawNav(e, body, nav, box0.ink, box0.hotspots, hasFocal, { outer: box0.outer, label });
  // 页签占的条（drawNav 扣掉的那一边，浮动详情要躲它，M12a-26）
  const navRects: Rect[] = [];
  if (body.h > 0) {
    if (body.y > preNav.y + 0.5) navRects.push({ ...preNav, h: body.y - preNav.y });
    if (body.y + body.h < preNav.y + preNav.h - 0.5) navRects.push({ ...preNav, y: body.y + body.h, h: preNav.y + preNav.h - body.y - body.h });
    if (body.x > preNav.x + 0.5) navRects.push({ ...preNav, w: body.x - preNav.x });
    if (body.x + body.w < preNav.x + preNav.w - 0.5) navRects.push({ ...preNav, x: body.x + body.w, w: preNav.x + preNav.w - body.x - body.w });
  }
  // 插画窗 / 侧图（cmp.panelArt = window / side，M12a-36）
  // M12b-32：拼贴 / 照片拼贴放在图窗的位置（高 42%），光环放在侧图的位置；图窗高按 cmp.panelArtRatio（选过时）
  const winArt = panelArt === 'window' || panelArt === 'collage' || panelArt === 'photomontage';
  if (winArt && body.h > S(120)) { const wh = artRatioH(e, body.w, body.h * 0.6) ?? body.h * (panelArt === 'window' ? 0.3 : 0.42); panelArtDraw(e, { ...body, h: wh }, panelArt, 'scene', '插画'); body = { ...body, y: body.y + wh + S(10), h: body.h - wh - S(10) }; }
  const sideInDetail = panelArt === 'side' && DETAIL_COLUMNS.has(r.str('lay.detail', 'none'));
  if ((panelArt === 'side' || panelArt === 'halo') && !sideInDetail && body.w > S(240)) { const sw = body.w * 0.3; panelArtDraw(e, { ...body, w: sw }, panelArt, 'portrait', '侧图'); body = { ...body, x: body.x + sw + S(14), w: body.w - sw - S(14) }; }
  // 陪衬立绘位（cnt.companion = mascot，M12b-64 ④，balatro#35）：容器先在左侧扣出一条（宽 22–30%），立绘站在条里贴底、气泡在它上面；主体与数据只用剩下的宽。
  // 太窄（< 420）时照旧挂在面板左外沿；旧皮肤只认皮肤之后的层选的
  const mascot = r.str('cnt.companion', 'none') === 'mascot';
  let mascotR: Rect | null = null;
  if (mascot && chrome && body.w > S(420) && body.h > S(160) && (!th.legacy || afterSkin(r, 'cnt.companion'))) {
    const sw = Math.max(body.w * 0.22, Math.min(body.w * 0.3, body.h * 0.5));
    mascotR = { ...body, w: sw };
    body = { ...body, x: body.x + sw + S(14), w: body.w - sw - S(14) };
  }
  // RPG 战斗结算（rpgSettle）：主体（「胜利」）叠在数据区上面、横版又够宽时改成主体在左、斜条与队员行在右（B9 审查修复 ⑱：tpl.settle 的数据区原来在主体下面，只放得下一条）
  const sp0 = split(e, body, focal, shape, layering), sp = sub === 'rpgSettle' && sp0.focalR && sp0.dataR && sp0.dataR.y >= sp0.focalR.y + sp0.focalR.h - 1 && body.w > body.h * 1.2
    ? { focalR: { ...body, w: body.w * 0.38 }, dataR: { ...body, x: body.x + body.w * 0.38 + S(16), w: body.w * 0.62 - S(16) } } : sp0, dataR = sp.dataR;
  // 第三区（lay.composition = three + lay.sideRegion，M12b-11，disco-elysium#28）：主体右边那一栏（原来空着）按 sideRegion 画列表 / 详情 / 属性表 / 元素
  // 只在 split() 真的横着分成三栏时才有第三区（B8 审查修复 ㉒：lay.focalSide = top / bottom 时主体占整宽，原来第三区宽 −16，列表画成负宽、按钮出画）；太窄（< 120）也不要
  const fs3 = r.str('lay.focalSide', 'left'), comp3 = r.str('lay.composition', 'splitLR') === 'three' && !!sp.focalR && !!dataR && fs3 !== 'top' && fs3 !== 'bottom';
  const s3x = sp.focalR ? sp.focalR.x + sp.focalR.w + S(16) : 0;
  const side3R: Rect | null = comp3 && sp.focalR && body.x + body.w - s3x >= S(120) ? { x: s3x, y: body.y, w: body.x + body.w - s3x, h: body.h } : null;
  const sideRegion = side3R ? pickedStr(e, 'lay.sideRegion', 'none') : 'none';
  // 主体两侧列（lay.arrangement = flankColumns，M12b-11）：主体左右两边的栏（三栏构图时 = 数据栏 + 第三区）；
  // 第三区给了列表 / 详情 / 属性表 / 元素时右边那栏让给它，格组只排在数据栏里（B8 审查修复 ⑬：原来两样东西画在同一块里，disco-elysium#26 的列表行压在格子上）
  FLANK = null;
  // 第三区占了右边那栏时（R4 C2 ⑤，disco-elysium#50：原来右列为空，格组全挤进左侧数据栏、压住同栏的生命 / 士气）：右列从主体那一栏的右侧切出来
  // （宽 = 主体栏的 42%、至多 150、至少 90，人像收窄、至少留 100），格组照旧分到主体两侧；主体栏太窄切不出来时照原来只排左列
  let flankF: Rect | null = null;
  if (r.str('lay.arrangement', '') === 'flankColumns' && sp.focalR) {
    const f = sp.focalR, lw = f.x - S(16) - body.x, rw = body.x + body.w - (f.x + f.w + S(16)), taken = !!side3R && sideRegion !== 'none';
    const cw = Math.min(f.w * 0.42, S(150)), carve = taken && lw >= S(90) && cw >= S(90) && f.w - cw - S(16) >= S(100);
    if (carve) flankF = { ...f, w: f.w - cw - S(16) };
    FLANK = { focal: flankF ?? f, left: lw > 0 ? { x: body.x, y: f.y, w: lw, h: f.h } : null, right: carve ? { x: f.x + f.w - cw, y: f.y, w: cw, h: f.h } : rw > 0 && !taken ? { x: f.x + f.w + S(16), y: f.y, w: rw, h: f.h } : null };
  }
  // 只有主体、没有数据区的全屏页（M12b-64 ⑤，persona5#34）：显式选了 lay.focalSide = left / right 时主体站在面板那一侧、贴底贴边（与叠加容器的「主体站一侧」同口径），原来占满整栏居中
  const fside = r.str('lay.focalSide', 'left');
  const focalR = sp.focalR && !sp.dataR && chrome && r.str('lay.container', 'modal') === 'fullscreen' && (fside === 'left' || fside === 'right') && chosen(e, 'lay.focalSide') ? sideStand(box0.outer, R, fside) : flankF ?? sp.focalR;
  // 主体标题就是游戏名、模板又放了标题元素（标题界面）：两处会写同一个游戏名——主体照常写（带副标题，不受 HUD 显隐淡出影响），标题元素这次不画；
  // 结算（主体写"胜利"）等主体与标题元素不同字的照旧
  const gameNameFocal = r.str('cnt.screen', '') === 'screen.title' || sub === 'login';
  // 标题块画法（blockTitle，见上）显式选过时反过来：标题元素画整块告示，主体的标题大字这次不画
  const dupTitle = focal === 'title' && !!focalR && gameNameFocal && els.includes('el.title') && !blockTitle;
  // 对话托盘（目检修复，dialogueLine）：托盘 / 底部浮层里的对话类模板、没有数据区、元素里有字幕——台词作为托盘主体画在页头下面，字幕元素不再另画
  const dlgK = box0.dlg?.kind ?? '';
  // 对话框版式（dlgK，B9 审查修复 ② / ⑰）：版式生效的容器上都算对话托盘，台词不要求字幕元素（对话框就是画台词的地方）；累积日志的长文数据区并进日志（dlgLog）
  const dlgTray = dlgK ? dialogueLike(r) && (!hasData0 || dlgLog) : !!head && dialogueLike(r) && ['tray', 'sheet'].includes(r.str('lay.container', 'modal')) && !hasData0 && els.includes('el.subtitle');
  // 标题界面不画标题元素时，其余元素（按键提示）放在游戏名下面那半栏；那一栏放不下（电视、大字号、窄画面）就放到面板底部一条，
  // 并先把菜单列表收到这条以上——都不压菜单、界面名与关闭键
  let titleElR: Rect | null = null;
  if (dupTitle && focalR) {
    const col = { ...focalR, y: focalR.y + focalR.h * 0.55, h: focalR.h * 0.45 };
    const mm = (r.num('lay.safeMargin', 2) / 100) * Math.min(col.w, col.h) + 12;
    const fits = els.filter((id) => id !== 'el.title').every((id) => { const def = ELEMENTS.get(id); return !def || def.size(makeCtx(id, g, d.t ?? g, th, col)).w <= col.w - 2 * mm; });
    if (fits) titleElR = col;
    else {
      const o = box0.outer, sh = Math.min(o.h * 0.3, Math.max(S(70), o.h * 0.2));
      titleElR = { ...o, y: o.y + o.h - sh, h: sh };
      if (dataR) dataR.h = Math.max(0, Math.min(dataR.h, titleElR.y - dataR.y - S(6)));
    }
  }
  // 出框（breakout）只在最后画一次（M12a-37：原来立绘位图没加载完时面板里先画一次、最后又上移加高再画一次，Persona 暂停 / 总攻击、Hades 三选一都是两个头）
  if (focalR && layering !== 'backdrop' && layering !== 'breakout' && !(blockTitle && focal === 'title')) drawFocal(e, focalAside(e, focalR, focal, box0.ink, meas), focal, false);
  // 容器里的通栏细框（R4 回归修复 C1 ③）：主体画完再垫细框（对白框部件的小面板：细边、无饰件），登记模板占位；头像槽与台词在对话托盘那一步画
  if (dlgInBox && !meas) { panel(e.part('dialog'), dlgInBox, true); frameOccupancy().add(dlgInBox, { kind: 'template', prio: 3, sub: 'data' }); }
  // 热区叠在主体插画上（M12a-22）：主体在分栏里、整屏背景或站在一侧
  if (nav === 'hotspots' && hasFocal && !box0.hotspots?.length) { const hr = focalR ?? (layering === 'backdrop' ? R : layering === 'behind' ? standRect(R, r.str('lay.focalSide', 'left')) : null); if (hr) hotspotsOver(e, hr); }
  // 详情分栏（常驻一侧）
  const detail0 = r.str('lay.detail', 'none');
  // 空集合（cnt.itemCount 明确给 0）：只画空状态，不画详情栏与滚动条（M11）
  const emptyList = (shape === 'collection' || (shape === 'sequence' && r.str('lay.arrangement', '') === 'grid')) && count(e, 1, true) === 0;
  const detail = emptyList ? 'none' : detail0;
  let mainR = dataR;
  let detailR: Rect | null = null;
  // 整组限宽（lay.groupMaxW，M12b-11，dont-starve#23）：数据区收到这么宽、水平居中（选过才收）
  const gmk = chosenKey(e, 'lay.groupMaxW'), gmw = gmk ? Math.max(0.2, Math.min(1, e.r.num(gmk, 1))) : 1;
  if (mainR && gmw < 1) mainR = { ...mainR, x: mainR.x + (mainR.w * (1 - gmw)) / 2, w: mainR.w * gmw };
  if (side3R && sideRegion === 'detail') detailR = side3R;
  else if (mainR && detail === 'below' && shape !== 'record') {
    // 详情在集合下方（lay.detail = below，M12b-11 / 14，dont-starve#23）：集合按量出的高、详情按内容高，两块连同详情里的按钮整体在数据区里垂直居中
    const need = measureData(e, mainR, shape, box0.ink), dn = detailNeed(e, mainR, box0.ink), gap = S(12);
    const ch = Math.min(need?.h ?? mainR.h * 0.55, mainR.h * 0.62), dh = Math.min(dn.h, mainR.h - ch - gap), y0 = mainR.y + Math.max(0, (mainR.h - ch - gap - dh) / 2);
    detailR = { x: mainR.x, y: y0 + ch + gap, w: mainR.w, h: Math.max(S(40), dh) };
    mainR = { ...mainR, y: y0, h: ch };
  } else if (mainR && DETAIL_COLUMNS.has(detail) && shape !== 'record' && mainR.w > S(380)) {
    // 常驻详情一栏（persistent，原来的）；M12b-14 的 statsPanel / hero 同宽、wide（详情 + 属性表两栏）宽一半
    const dw = detail === 'wide' ? Math.min(mainR.w * 0.55, S(460)) : Math.min(mainR.w * 0.42, S(300));
    detailR = { x: mainR.x + mainR.w - dw, y: mainR.y, w: dw, h: mainR.h };
    mainR = { ...mainR, w: mainR.w - dw - S(14) };
  }
  // 对话类模板的选项跟在正文下面（R4 回归修复 C1 ④，frostpunk#50）：主体与数据分栏（lay.layering = separate……）、数据是正文（text）、el.choices 没选锚点空间、按锚点落在数据栏里时，
  // 选项排在量出的正文正下方，正文 + 选项是一栏（lay.dataAlign = center 时整栏一起竖向居中，选项的横向位置仍按它的锚点）——原来选项按锚点排在整个容器里（左中），
  // 正文在数据栏里另行居中，两者叠在一起。几何修复，所有皮肤；对话框版式（dlgK）、没分栏（behind / backdrop，数据铺满）时照原来
  let chStack: Rect | null = null;
  if (mainR && sp.focalR && dataR && shape === 'text' && dialogueLike(r) && !dlgK && els.includes('el.choices') && space('el.choices') === 'inherit' && ELEMENTS.has('el.choices')) {
    const cs = ELEMENTS.get('el.choices')!.size(makeCtx('el.choices', g, d.t ?? g, th, R)), o = titleElR ?? box0.outer, an = templateParts(th, 'el.choices')[0]?.anchor ?? 'mr';
    // 选项按锚点会落在哪（横向中心）：左列 / 中列 / 右列
    const cx = COL_LEFT.has(an) ? o.x + S(12) + cs.w / 2 : ['tc', 'center', 'bc'].includes(an) ? o.x + o.w / 2 : o.x + o.w - S(12) - cs.w / 2;
    const need = cx >= dataR.x && cx <= dataR.x + dataR.w ? measureData(e, mainR, shape, box0.ink) : null;
    // 只在原来的排法会叠在一起时才并成一栏：正文块（居中或贴顶）与按锚点竖向排的选项（上 / 中 / 下排）上下相交（slay-the-spire 的 br 选项本来就在正文下面、不动）
    const center = detail !== 'below' && pickedStr(e, 'lay.dataAlign', 'start') === 'center';
    const ty0 = need && center && need.h < mainR.h ? mainR.y + (mainR.h - need.h) / 2 : mainR.y;
    const cy0 = ['tl', 'tc', 'tr'].includes(an) ? o.y + S(12) : ['bl', 'bc', 'br'].includes(an) ? o.y + o.h - S(12) - cs.h : o.y + o.h / 2 - cs.h / 2;
    if (need && cy0 < ty0 + need.h && ty0 < cy0 + cs.h) {
      const gap = S(14), chW = Math.min(cs.w, mainR.w), chH = cs.h * (chW / Math.max(1, cs.w));
      const tH = Math.max(Math.min(need.h, mainR.h - gap - chH), Math.min(need.h, mainR.h * 0.3));
      const y0 = center ? mainR.y + Math.max(0, (mainR.h - tH - gap - chH) / 2) : mainR.y;
      chStack = { x: mainR.x, y: y0 + tH + gap, w: mainR.w, h: Math.max(0, Math.min(chH, mainR.y + mainR.h - (y0 + tH + gap))) };
      mainR = { ...mainR, y: y0, h: tH };
    }
  }
  // 文本列对齐（lay.dataAlign = center，M12b-11，frostpunk#25）：数据按量出的高在数据区里垂直居中（选过才居中）
  if (mainR && !chStack && detail !== 'below' && pickedStr(e, 'lay.dataAlign', 'start') === 'center') {
    const need = measureData(e, mainR, shape, box0.ink);
    if (need && need.h < mainR.h) mainR = { ...mainR, y: mainR.y + (mainR.h - need.h) / 2, h: need.h };
  }
  // 分区面板（见上）：数据栏一块面板（separate 分栏），或数据 / 常驻详情各一块半透明深底（perRegion）。
  // 两侧列把格组分到主体两边时（R4 C2 ④，cyberpunk-2077#34）数据栏那块面板只框住半边格组、看着是一块空框——不画；数据栏那一侧还排着 inherit 元素时照画（那是元素的底，disco 背包的生命 / 士气）
  const sepSkip = sepSplit && !!dataR && flankBoth(e, FLANK) && !els.some((id) => {
    if (space(id) !== 'inherit' || !ELEMENTS.has(id)) return false;
    const an = templateParts(th, id)[0]?.anchor ?? 'tl';
    return dataR.x < FLANK!.focal.x ? COL_LEFT.has(an) : ['tr', 'mr', 'br'].includes(an);
  });
  if (sepSplit && dataR && !sepSkip) panel(e, { x: dataR.x - S(14), y: dataR.y - S(8), w: dataR.w + S(28), h: dataR.h + S(16) }, false, asContainer(e));
  if (perRegion) for (const q of [mainR, detailR]) if (q) panel(e, inflate(q, S(10)), false, regionPlate(e));
  // 分栏线（lay.grouping = divider 显式选了，M12a-37）：主体与数据之间、数据与常驻详情之间各一道 1px 线（色 col.border，没给时面板描边色 / 字色 30%）；两端渐隐见 M12b-37
  // 块之间的分隔线（vis.dividerPlace = betweenBlocks，M12b-45）：同样的两道
  if ((r.str('lay.grouping', '') === 'divider' && chosen(e, 'lay.grouping')) || dividerPlaces(e)?.includes('betweenBlocks')) {
    if (focalR && dataR) dividerLine(e, focalR, dataR);
    if (mainR && detailR) dividerLine(e, mainR, detailR);
  }
  if (detailR) drawDetail(e, detailR, box0.ink, sideInDetail);
  // 第三区的其余内容（列表 / 属性表）：elements 见下面的锚点空间（data 空间换成第三区）
  if (side3R && !meas && sideRegion === 'list') listRows(e, side3R, box0.ink);
  if (side3R && !meas && sideRegion === 'stats') statViz(e, 'keyValue', side3R, chartData(), box0.ink);
  // 地图界面的底栏（M12a-30）：按键图例（锚在下排的 el.prompt legend）/ 平移提示放在地图框外的底栏，不压地图——地图从底下让出这一条（出血时它们压在底部 scrim 上）
  const strip = shape === 'spatial' && !bleed && mainR ? mapStrip(e, d, th, R) : 0;
  if (strip && mainR && mainR.h - strip > S(80)) mainR = { ...mainR, h: mainR.h - strip };
  // 模板里的元素这次不画的（标题界面的标题元素、空集合的奖励、并进按钮行的行动号召、对话托盘的字幕）
  const skip = [...(dupTitle ? ['el.title'] : []), ...(emptyList || sub === 'rpgSettle' ? ['el.reward'] : []), ...(ctaRow ? ['el.cta'] : []), ...(dlgTray ? ['el.subtitle'] : [])];
  // 按钮行先排（M12b-64 ③：对齐按 lay.buttonRowAlign）；rowR = 实际按钮的外接框（inherit 元素按它避让、登记进模板占位，不按整行——整行会把左下的元素顶上去）
  const rowL = row.items.length ? buttonRowLayout(e, inner, row, [...box0.orn.corners, ...box0.orn.marks, ...(head?.avoid ?? [])], rowAlign(e, ctaRow)) : [];
  // 贴边页签钮（edgeTab，M12b-17）：挂到容器右下边的外沿——右边与容器右缘齐平、整个挂在下沿下面（R4 审查修复 ⑭，into-the-breach#30：参考的 CONTINUE 贴着面板右缘、
  // 吊在底边下；原来四分之一伸出右边、一半骑在下沿上）；画面放不下时夹回画面里
  for (const q of rowL) if (q.it.hang) { const o = box0.outer; q.rr = { ...q.rr, x: Math.min(R.x + R.w - q.rr.w - S(2), o.x + o.w - q.rr.w), y: Math.min(R.y + R.h - q.rr.h - S(2), o.y + o.h) }; }
  const rowR = buttonRowBox(rowL), rowStrip: Rect | null = row.items.length && !rowHangOnly ? { x: inner.x, y: inner.y + inner.h - row.h, w: inner.w, h: row.h } : null;
  // 主体实际占的范围（大字主体只占字那一块，见 drawFocal 的 FOCAL_BOX）
  const focalBox = FOCAL_BOX as Rect | null, focalOcc = focalR && layering !== 'backdrop' ? focalBox ?? focalR : null;
  // inherit 锚点空间（M12b-64 ①）：原来的容器外框（标题界面另给的那半栏）；避开页头行（审查修复 A · D15）、底部按钮行（实际按钮）与主体实际画出的范围
  // （元素按 2b 的固定障碍挪开）；挪的时候不进页签条与常驻详情栏。
  // 分栏只给数据那一栏画面板时（sepSplit）：锚在数据栏那一侧的元素排进那块面板（civ6#50：按钮列原来按整个容器排、伸出面板），另一侧的照旧按容器外框
  const sepPanel = sepSplit && dataR && !titleElR && !sepSkip ? { x: dataR.x - S(14), y: dataR.y - S(8), w: dataR.w + S(28), h: dataR.h + S(16) } : null;
  const inhRect = titleElR ?? box0.outer;
  // 每块是什么（页头 / 按钮行 / 主体）一起传下去：元素压着按钮行时 2b' 认得出（中期审查修复 ㉛）
  // 叠加模板上的对话框（外框是整个画面）：其余元素躲开对话框与它的名签（B9 审查修复 ②）
  const dlgOcc = !chrome && box0.dlg ? box0.dlg.box : null;
  const inhPairs = ([[head?.rect, 'header'], [rowR, 'buttons'], [focalOcc, 'focal'], [dlgOcc ?? dlgInBox, 'data'], [dlgOcc ? dlgTag : null, 'header']] as [Rect | null | undefined, TemplateSub][]).filter((x): x is [Rect, TemplateSub] => !!x[0] && x[0].w > 0 && x[0].h > 0);
  const inhOcc = inhPairs.map(([q]) => q);
  const inhOpts: { occupied?: Rect[]; occupiedSub?: TemplateSub[]; blockers?: Rect[] } = inhOcc.length ? { occupied: inhOcc, occupiedSub: inhPairs.map(([, t]) => t), blockers: [...navRects, ...(detailR ? [detailR] : [])] } : {};
  // 顶部框 / 头像分框留出的选项区（B9 审查修复 ④）：选项单独排进那一块，不再锚在整个对话框里
  const dlgCh = box0.dlg?.choices && els.includes('el.choices') && space('el.choices') === 'inherit' && !skip.includes('el.choices') ? box0.dlg.choices : null;
  // 标题界面上标题元素画整块（el.title.form = notice / titlePage / chapterCard，blockTitle，主体游戏名不画）时，标题块排在游戏名原来那一栏（focalR，终期审查修复 ㉕）：
  // 原来按整个容器排，520 × 450 的告示块居中压在菜单上（「继续游戏」压「第三章」）；那一栏放不下时照元素排位缩放。R4 回归修复 C1 ⑥：主体是标题（cnt.focal = title）的任何模板都这样（原来只有标题界面 / 登录）
  const titleBlockR = blockTitle && focal === 'title' && focalR && els.includes('el.title') && space('el.title') === 'inherit' && !skip.includes('el.title') ? focalR : null;
  const inhIds = els.filter((id) => space(id) === 'inherit' && !skip.includes(id) && ELEMENTS.has(id) && !((dlgCh || chStack) && id === 'el.choices') && !(titleBlockR && id === 'el.title'));
  // 标题块自己那一栏不算障碍（主体游戏名不画，focalOcc 是整栏）：只躲页头 / 按钮行
  const tbPairs = inhPairs.filter(([, t]) => t !== 'focal'), titleBlockOpts: typeof inhOpts = tbPairs.length ? { occupied: tbPairs.map(([q]) => q), occupiedSub: tbPairs.map(([, t]) => t) } : {};
  const sepLeft = !!sepPanel && sepPanel.x + sepPanel.w / 2 < box0.outer.x + box0.outer.w / 2;
  const inSep = (id: string) => !!sepPanel && (COL_LEFT.has(templateParts(th, id)[0]?.anchor ?? 'tl') ? sepLeft : !sepLeft && !['tc', 'center', 'bc'].includes(templateParts(th, id)[0]?.anchor ?? 'tl'));
  const inhGroups0: [Rect, string[]][] = sepPanel ? [[sepPanel, inhIds.filter(inSep)], [inhRect, inhIds.filter((id) => !inSep(id))]] : [[inhRect, inhIds]];
  // 页头放不下、退回 inherit 的高元素（hdrTall，R4 回归修复 C1 ①）：排在页头行下沿与底部按钮行上沿之间那一条（比这一条高时按元素排位的缩放下限缩小），
  // 不压页头与按钮行——dont-starve#41 的 220 × 280 立绘卡原来就算不进页头，居中排在整个容器里也会盖住继续钮
  const tallIds = inhIds.filter((id) => hdrTall.has(id));
  const tallTop = head?.rect ? head.rect.y + head.rect.h + S(8) : inhRect.y, tallBot = rowR ? Math.min(inhRect.y + inhRect.h, rowR.y - S(8)) : inhRect.y + inhRect.h;
  const tallR: Rect | null = tallIds.length && tallBot - tallTop > S(40) ? { x: inhRect.x, y: tallTop, w: inhRect.w, h: tallBot - tallTop } : null;
  const inhGroups: [Rect, string[]][] = tallR ? [...inhGroups0.map(([q, ids]): [Rect, string[]] => [q, ids.filter((id) => !hdrTall.has(id))]), [tallR, tallIds]] : inhGroups0;
  // 数据区给 inherit 元素让位（M12b-64 ① dataYield，into-the-breach#39：布阵抽屉里的身份卡压住第三行与「返回」）：先排（只排不画），压进数据区的元素从数据区的一边收掉，
  // 收完宽高不小于原来的一半（居中压在列表中间的大块元素收不掉，照旧交给可读性检查）。旧皮肤见 tplLayoutV2（旧皮肤 × tpl.quest 的宝箱仍压最后一行，见进度记录）。
  // 只有条目式的数据（集合、序列、表格、表单、长文、记录）让；地图与节点图不让：元素（小地图、按键图例、行动号召）本来就叠在图上，图照样铺满
  if (mainR && inhIds.length && YIELD_SHAPES.has(shape) && tplLayoutV2(th)) {
    const rs = inhGroups.flatMap(([rect, ids]) => (ids.length ? drawElements(d, rect, th, undefined, undefined, [], { ids, inTemplate: true, layoutOnly: true, ...inhOpts }) : [])).map((h) => h.rect);
    mainR = yieldRect(mainR, rs, S(8), 0.5);
    // 两侧列的格组不在 mainR 里排（FLANK 的两栏），按组躲开这些元素（R4 C2 ⑤，disco-elysium#50）
    if (FLANK) FLANK.avoid = rs;
  }
  // 测量阶段（fitScreen）：版面排好就返回，不画数据、元素与其后的层
  if (opts.measure) return { hits: [], layout: { outer: box0.outer, mainR, detailR, shape, e, ink: box0.ink, ...(detail === 'below' && dataR ? { below: dataR.h } : {}) } };
  // 浮动详情（lay.detail = transient，M12a-26）：按内容定尺寸；位置在最后一遍（元素也画完之后）按条目 / 节点 / 帧占位表找空位，画在最上层
  let floating: (() => void) | null = null;
  if (mainR) {
    const fg = detail === 'transient' ? floatGeom(e) : null, floatDock = pickedStr(e, 'lay.floatDock', 'auto') === 'gridEdge';
    const fb: Rect = { x: R.x + S(6), y: R.y + S(6), w: R.w - S(12), h: R.h - S(12) };
    // 模板自己的东西也躲：页头行、页签条、底部按钮行
    // 主体（立绘 / 纸娃娃，审查修复 A · D7：tpl.loadout 的浮框原来压在纸娃娃上）也躲
    // 挂在容器外沿的页签（cmp.tabMount = outsideTop / bookmark，B9 审查修复 ⑥ / ㉘ 登记的模板页头块）也躲：原来浮框可以盖在框外那排页签上
    const mountedR = frameOccupancy().items.filter((o) => o.kind === 'template' && o.sub === 'header' && o.rect !== head?.rect).map((o) => o.rect);
    const chromeR = [head?.rect, ...navRects, ...mountedR, rowStrip, focalR].filter((x): x is Rect => !!x && x.w > 0 && x.h > 0);
    // 预排（列表 / 网格才有）：锚点旁边四个候选位置都会压住条目时，列表 / 网格先收窄、让出右边一栏（reservedRight）
    let reserve = 0;
    if (fg) {
      const geo = itemRects(e, mainR, shape);
      if (geo.length) { const fi = fl0() ?? 0, p = placeFloating(geo[Math.min(fi, geo.length - 1)], fg, [...geo, ...chromeR, ...occAvoid()], fb, S(8)); if (p.overlap > 0 && mainR.w - fg.w - S(14) >= S(160)) reserve = fg.w + S(14); }
      // 停在网格右缘外（lay.floatDock = gridEdge，M12b-14，control#30）：集合先让出右边一栏（从网格右缘量），浮框紧挨着网格
      if (floatDock && mainR.w - fg.w - S(14) >= S(160)) reserve = fg.w + S(14);
    }
    // 网格把实际画出来的那块交回来（M12a-34）：滚动条贴着它
    // 翻页箭头（lay.pageIndicator = arrows，M12b-64 ⑥）：数据区两侧先让出箭头的宽，箭头贴着实际画出的集合（网格 / 列表的外接框）
    // 数据区太窄（扣掉给浮动详情让出的一栏以后，让完不到 60% 或不到 160）时不让，箭头照旧画在数据区两侧
    const aw0 = !emptyList && pageArrowsOn(e) ? arrowW(e) : 0, mw = mainR.w - reserve, aw = aw0 && mw - aw0 * 2 >= Math.max(S(160), mw * 0.6) ? aw0 : 0;
    LIST_BOX = null;
    const dA = aw ? { ...mainR, x: mainR.x + aw, w: mainR.w - aw * 2 } : mainR;
    // RPG 战斗结算（cnt.subtype = rpgSettle，M12b-30，persona5#20）：斜白条奖励清单 + 队员头像经验条 + 升级章画在数据区里、代替结算表与奖励格
    // （B9 审查修复 ⑱：原来叠在结算表与奖励格上面画，persona5#20 两套版式压在一起）
    const content = sub === 'rpgSettle' ? rpgSettle(e, dA) : drawData(e, dA, shape, box0.ink, reserve);
    const cbox = content && typeof content === 'object' && 'w' in content ? content : undefined;
    const listBox = LIST_BOX as Rect | null;
    if (!emptyList) drawOverflow(e, mainR, r.str('lay.overflow', 'single'), cbox, strip > 0, aw ? cbox ?? listBox ?? dA : undefined, box0.page ?? box0.outer);
    // 模板占位（M12b-64 ①）：数据条目实际画出的集合（网格 / 列表的外接框）登记进帧占位表；量不出范围的数据结构不登记（整块数据区会把角上的合规层都挤走）
    const dataBox = cbox ?? listBox;
    if (!meas && dataBox) frameOccupancy().add(dataBox, { kind: 'template', prio: 3, sub: 'data' });
    if (fg) {
      const m0 = mainR;
      floating = () => {
        // 锚点：导航焦点 → 第一个条目 → 「当前」节点 → 第一个节点；都没有（表格、长文……）时原来的位置（数据区 45% 处）
        const anchor = FOCUS_RECT ?? FIRST_ITEM ?? CURRENT_NODE ?? ITEMS[0] ?? null;
        // 收窄过时，让出的那一栏（数据区右边、与锚点上沿对齐）是第五个候选
        const lane = reserve > 0 && anchor ? [{ x: m0.x + m0.w - reserve + S(14), y: anchor.y }] : [];
        // 没有锚点时原来的位置（数据区 45% 处），夹在画面以内（审查修复 A · D7：竖屏手机上原来出画 30 px）
        // 停在网格右缘外（lay.floatDock = gridEdge）：x = 实际画出的集合右缘 + 14，顶边对齐焦点格（没有时集合顶），夹在画面以内
        const edge = floatDock && dataBox ? { x: Math.min(fb.x + fb.w - fg.w, dataBox.x + dataBox.w + S(14)), y: Math.max(fb.y, Math.min(fb.y + fb.h - fg.h, anchor?.y ?? dataBox.y)), w: fg.w, h: fg.h } : null;
        // 节点图（关系网 / 层级）：四个方向都压到节点时，再在锚点四周由近到远找一圈空位（M12b-14，frostpunk#35：说明框压在别的节点上）
        // 格组排布（两侧列 / 固定分组，B8 审查修复 ㉕）同样：组名 + 计数也进了条目表，四个方向都压到时往外找
        const grouped = ['flankColumns', 'fixedGroups'].includes(r.str('lay.arrangement', ''));
        const ring = anchor && (shape === 'network' || shape === 'hierarchy' || grouped) ? nodeRing(anchor, fg, S(8), grouped) : [];
        // 不能压的（placeFloating 的 hard）：屏上的 HUD 元素（终期审查修复 ⑩）+ 页签条、挂在容器外沿的页签 / 名签（R4 回归修复 C1 ⑦，forza-horizon-5 地图：浮框原来盖住顶部页签条——
        // 页签与条目同权，四个方向都压到东西时挑了压页签的那个）。页头行不算 hard（只在 avoid 里）：行高带上下留白，压一点留白比压住条目好（B8 审查 ⑬ 的两侧列）
        const hud = occAvoid(), hard = [...hud, ...navRects, ...mountedR];
        const q = edge ?? (anchor ? placeFloating(anchor, fg, [...ITEMS, ...chromeR, ...hud], fb, S(8), [...lane, ...ring], hard).rect
          : { x: Math.max(fb.x, Math.min(fb.x + fb.w - fg.w, m0.x + m0.w * 0.45)), y: Math.max(fb.y, Math.min(fb.y + fb.h - fg.h, m0.y + S(20))), w: fg.w, h: fg.h });
        drawFloatingDetail(e, q, fg, box0.ink);
        // 浮框到它说明的那一项的引线（cmp.leader 选过，M12b-24 / 14：ITB 简报面板到棋盘的折角线）：从锚点中心拉到浮框最近的一边；按 @tooltip → 全局读（审查修复 ⑥）
        const ld = leaderOf(e.part('tooltip'));
        if (ld && anchor) {
          const ax = anchor.x + anchor.w / 2, ay = anchor.y + anchor.h / 2;
          const tx = q.x >= ax ? q.x : q.x + q.w <= ax ? q.x + q.w : Math.max(q.x, Math.min(q.x + q.w, ax)), ty = q.y >= ay ? q.y : q.y + q.h <= ay ? q.y + q.h : Math.max(q.y, Math.min(q.y + q.h, ay));
          drawLeader(e, [ax, ay], [tx, ty], ld.kind, ld.end, e.accent);
        }
      };
    }
  } else if (blockDrop && r.str('lay.overflow', 'single') === 'paged' && r.str('lay.pageIndicator', '') === 'pageCurl' && !(e.th.legacy && !chosen(e, 'lay.pageIndicator'))) {
    // 标题块占页、补的那一句不画时（blockDrop，R4 回归修复 C1 ⑥）：翻页角（lay.overflow = paged + lay.pageIndicator = pageCurl）照画——它卷的是纸页（书的那一页 / 容器外框）的角，
    // 不跟数据区（obra-dinn 日志扉页：原来随补的那一句一起画在右页右下角）；页点 / 页码 / 箭头跟着数据区，没有数据区时照旧不画
    drawOverflow(e, body, 'paged', undefined, false, undefined, box0.page ?? box0.outer);
  }
  // 双窗停靠的停靠窗（lay.container = windowPair，M12b-11）：主窗口的数据画完再画它的内容（焦点 / 第一个条目仍在主窗口）
  // 多块独立面板（lay.container = panels，M12b-51）的第二块默认放详情
  // 停靠窗放详情时（panels 的默认）整块窗口登记成模板 detail（B10 审查修复 ㉒：原来不登记，合规层、运营条目、浮动详情压在侧栏和它的「使用 / 丢弃」上）
  if (box0.dock && !meas) { const dk = pickedStr(e, 'lay.dockContent', r.str('lay.container', 'modal') === 'panels' ? 'detail' : 'inventory'), db = dockWindow(e, box0.dock, dk, box0.ink); if (db) frameOccupancy().add(db, { kind: 'template', prio: 3, sub: dk === 'detail' ? 'detail' : 'data' }); }
  // 按钮行（没有放行动号召元素时按交互模式补模板按钮，M12a-35 起与运营按钮、模板里的行动号召并成一行）；对齐按 lay.buttonRowAlign（M12b-64 ③）
  if (rowL.length) drawButtonRow(rowL);
  // 模板占位（M12b-64 ①）：按钮行（实际按钮）、大字主体（实际的字）、陪衬立绘位登记进帧占位表（合规层避开它们）；常驻详情栏与整栏主体是面板里的整块区域，
  // 登记了会把角上的合规层都挤走，不登记
  if (!meas) {
    const occ = frameOccupancy();
    if (rowR) occ.add(rowR, { kind: 'template', prio: 3, sub: 'buttons' });
    if (focalBox && focalOcc === focalBox) occ.add(focalBox, { kind: 'template', prio: 3, sub: 'focal' });
    if (mascotR) occ.add(mascotR, { kind: 'template', prio: 3, sub: 'companion' });
  }
  // 主体出框（breakout）：最后画，压在面板边上
  if (focal !== 'none' && layering === 'breakout' && focalR) drawFocal(e, { ...focalR, y: focalR.y - S(30), h: focalR.h + S(40) }, focal, false);
  // 标题压在立绘上（lay.titlePos = onFocal，M12a-23）：立绘画完再画名牌
  head?.late?.(focalR, layering);
  // 屏内元素（行动号召、奖励、花费、标题、读取条……）：排在容器里
  if (sub === 'levelup') levelRoll(e, body, box0.ink);
  // 叠加模板（M12a-25）没有托盘面板：幽灵预览按画面下三成当托盘的位置
  if (sub === 'home') ghostPlace(e, R, chrome ? box0.outer : { ...R, y: R.y + R.h * 0.7, h: R.h * 0.3 });
  if (els.length) {
    // 获得演出：元素整体弹出（揭示演出阶段）
    const pop = fl?.s.stage === 'ceremony' ? EASE.overshoot(Math.max(0, Math.min(1, (fl.p - 0.15) / 0.3))) : 1;
    const o = box0.outer, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
    if (pop < 1) for (const c of ctxs) { c.save(); c.globalAlpha *= Math.max(0, Math.min(1, pop)); c.translate(cx, cy); c.scale(Math.max(0.05, pop), Math.max(0.05, pop)); c.translate(-cx, -cy); }
    if (pop > 0) {
      // 按锚点空间分组（elx.anchorSpace，M12a-19）：inherit = 原来的容器外框（分栏面板时那块面板），避开页头行 / 按钮行 / 主体（M12b-64，数据区已经让过位）；
      // container = 容器外框并避开页头 / 主体 / 数据区 / 按钮行；screen = 整个画面（容器已经按它们收过边）；header = 页头行的控件段（标题照写，M12b-64 ②）；
      // data / detail = 数据区 / 详情栏。模板里的元素都不受 rel.hudVisibility 影响
      const group = (sp: string) => els.filter((id) => space(id) === sp && !skip.includes(id));
      const occupied = [head?.rect, focalR, mainR, detailR, rowStrip, mascotR, dlgInBox].filter((x): x is Rect => !!x && x.w > 0 && x.h > 0);
      const padIn = S(6);
      const hits: Hit[] = [];
      const panelsDock = box0.dock && r.str('lay.container', 'modal') === 'panels' ? box0.dock : null;
      // 页头的左 / 右控件段（M12b-64 ②）：锚在左列的进左段（左对齐标题时没有左段，都进右段），其余进右段
      const hdrSeg = head?.slots;
      const hdrSplit = (left: boolean) => group('header').filter((id) => (hdrSeg?.left ? COL_LEFT.has(templateParts(th, id)[0]?.anchor ?? 'tl') === left : !left));
      const spaces: [string, Rect, { occupied?: Rect[]; blockers?: Rect[]; margin?: number }, string[]?][] = [
        ...inhGroups.map(([rect, ids]): [string, Rect, typeof inhOpts, string[]] => ['inherit', rect, inhOpts, ids]),
        ...(dlgCh ? ([['inherit', dlgCh, { margin: 0 }, ['el.choices']]] as [string, Rect, { margin: number }, string[]][]) : []),
        // 跟在正文下面的选项（chStack，R4 回归修复 C1 ④）
        ...(chStack && !skip.includes('el.choices') ? ([['inherit', chStack, { margin: 0 }, ['el.choices']]] as [string, Rect, { margin: number }, string[]][]) : []),
        ...(titleBlockR ? ([['inherit', titleBlockR, titleBlockOpts, ['el.title']]] as [string, Rect, typeof inhOpts, string[]][]) : []),
        ['container', box0.outer, { occupied }],
        ...(hdrSeg ? ([...(hdrSeg.left ? [['header', hdrSeg.left, { margin: S(2) }, hdrSplit(true)]] : []), ['header', hdrSeg.right, { margin: S(2) }, hdrSplit(false)]] as [string, Rect, { margin: number }, string[]][])
          : ([['header', head?.slot ?? box0.outer, head?.slot ? { margin: S(2) } : {}]] as [string, Rect, { margin?: number }][])),
        ['data', side3R && sideRegion === 'elements' ? side3R : mainR ?? box0.outer, mainR ? { margin: padIn } : {}],
        ['detail', detailR ?? mainR ?? box0.outer, detailR ?? mainR ? { margin: padIn } : {}],
        // 叠加模板上的对话框：钉在屏幕上的元素也躲开它（有容器时容器已经按它们收过边）；多块独立面板（lay.container = panels）的侧栏也躲（B10 审查修复 ㉒）
        ['screen', R, dlgOcc || panelsDock ? { occupied: [...(dlgOcc ? [dlgOcc, ...(dlgTag ? [dlgTag] : [])] : []), ...(panelsDock ? [panelsDock] : [])] } : {}],
      ];
      for (const [sp, rect, o, only] of spaces) {
        const ids = only ?? group(sp);
        // 挂点卡片（anchoredCard）：卡片挂的那个世界点钉到卡外下沿——挂在同一点上的情境提示（el.prompt contextual）画在卡片下面，不压卡片
        if (ids.length) hits.push(...drawElements(d, rect, th, undefined, undefined, [], { ids, inTemplate: true, ...o, ...(box0.pin ? { pins: { [box0.pin.a]: { x: box0.pin.x, y: box0.pin.y } } } : {}) }));
      }
      hitsOut = hits;
      const cta = hits.find((h) => h.element === 'el.cta');
      if (cta) CTA_RECT = cta.rect;
    }
    if (pop < 1) for (const c of ctxs) c.restore();
  }
  // 对话托盘的台词（目检修复）：元素（选项）排好以后画，宽度收到托盘里选项的左边；继续箭头跟在行尾
  // 选项区（dlgCh）在台词下面时台词区收到它上面
  // 容器里的通栏细框：台词与头像槽画在细框里（留 10 的内边距）
  const dlgBody = dlgInBox ? inflate(dlgInBox, -S(10)) : dlgCh ? { ...body, h: Math.max(S(20), dlgCh.y - S(6) - body.y) } : body;
  if (dlgTray) CUE_AT = dlgK ? dialogBody(e, dlgK, dlgBody, box0.ink, hitsOut.filter((h) => h.element === 'el.choices').map((h) => h.rect)) : dialogueLine(e, body, box0.ink, hitsOut.filter((h) => h.element === 'el.choices').map((h) => h.rect));
  // 浮动详情的后置一遍（M12a-26）：元素画完再排位置、画在最上层（UI 像素化时画在文字画布上）；按角色拆层时先把下面的内容合成下去（B10 审查修复 ⑲）
  if (floating) { flushRoles(); floating(); }
  // 陪衬角色（cnt.companion = mascot，M12a-36）：弹窗左外沿的立绘 + 对话气泡（cnt.companion = avatar 由字幕元素画说话人小像）
  if (mascotR) companionStrip(e, mascotR); else if (mascot) companionMascot(e, R, box0.outer);
  // 运营动作（ops.actions）：结果页的"再抽 / 分享 / 看广告翻倍 / 今日不再显示"
  if (!fl || fl.s.stage === 'result') opsActions(e, inner);
  // 继续提示与跳过（ix.continueCue / ix.skip）
  continueCue(e, R, inner, fl?.s.stage === 'result');
  skipControl(e, R, fl?.s.stage === 'ceremony');
  // 流程演示：确认弹窗、光标、按下
  if (fl?.s.stage === 'confirm' && fl.s.ask) CONFIRM_RECT = confirmModal(e, R, fl.s.ask);
  if (fl) flowActions(e, fl);
  // 导航焦点（ix.focus，M10）：列表 / 菜单行已经按 ix.focus 画在字底下的那一行不再画（M12a-27）
  if (FOCUS_RECT && FOCUS_RECT !== FOCUS_DRAWN) focusDecor(e, FOCUS_RECT);
  // 引导（ix.guideForce）
  guide(e, R, r.str('ix.guideForce', 'none'));
  // 跨界面常驻层（flow.chrome）
  if (tsp) { for (const c of tiltCs) c.restore(); TILT.delta = null; }
  // 顶排的东西（贴顶页签条 + 模板里的元素，R4 C2 ③）：没有顶栏也没有页头行时 topRule 画在它们下面
  chromeLayer(e, R, r.list('flow.chrome'), head?.rect ?? null, [...navRects, ...hitsOut.map((h) => h.rect)]);
  box0.after?.();
  if (!meas) screenEdgesTop(d, d.full ?? R, th);
  return { hits: hitsOut };
}

/**
 * 模板的数据结构（screenPass 的 shape；B8 审查修复 ① 抽出来，Godot 导出判断「这一屏画不画图」同口径）：cnt.dataShape 显式给了用它；
 * 没写时按子功能补——菜单类 → 列表、升级 → 前后对比详情、写了一句 / 短文且没有主体 → 一句话，其余 none
 */
export function dataShapeOf(r: Theme['r']): string {
  const shape0 = r.str('cnt.dataShape', 'none'), sub = r.str('cnt.subtype', '');
  if (shape0 !== 'none' && shape0 !== 'auto') return shape0;
  const tlL = r.src('cnt.textLength')?.layer, tlSet = !!tlL && tlL !== 'default' && tlL !== 'fallback';
  return sub === 'pause' || sub === 'menu' || r.str('cnt.screen', '') === 'screen.title' ? 'collection'
    : sub === 'levelup' ? 'record'
      : tlSet && ['line', 'short'].includes(r.str('cnt.textLength', 'none')) && r.str('cnt.focal', 'none') === 'none' ? 'text' : 'none';
}

/**
 * 按内容定容器尺寸（lay.panelFit = fitContent，M12a-38）：用只量不画的画布（paint.ts 的 measureOnlyCtx）把构图跑到数据区，量数据要多大（measureData：
 * 列表行、网格 lattice、卡行、表单、长文、记录 / 常驻详情的 contentSize），容器按差值收（宽只收不放、高可收可放，夹在画面以内），最多三遍收敛
 * （分栏按比例分宽时一遍不够）。只对画了面板的弹窗 / 全屏页 / 抽屉 / 托盘 / 底部浮层 / 挂点卡片生效；没有可量的数据结构（关系网、地图……）时不变。
 * Godot：Container 的 size_flags = SHRINK，面板随内容的最小尺寸收放
 */
function fitScreen(d: DrawCtx, R: Rect, th: Theme, opts: { chrome?: boolean }): { w: number; h: number } | undefined {
  const r = th.r;
  if (r.str('lay.panelFit', 'fixed') !== 'fitContent' || opts.chrome === false) return undefined;
  const kind = r.str('ast.container', 'none');
  if (kind && kind !== 'none' && kind !== 'auto') return undefined;
  const ctr = r.str('lay.container', 'modal');
  if (!['modal', 'fullscreen', 'drawer', 'sheet', 'tray', 'anchoredCard'].includes(ctr)) return undefined;
  // 记忆（审查修复 A · L7）：同一套参数（Values 对象）、同一画面、同一字体 / 素材版本、同一流程阶段时量出来的一样，不再每次重画都量三遍
  // （挂点卡片跟世界点走，不记）。每套参数只记最近一次
  const fl = flowNow();
  const key = [R.x, R.y, R.w, R.h, th.unitK ?? 1, FONT_EPOCH.v, uiImagesVersion(), PSEUDO.pct, TEXT_K.k, fl ? `${fl.s.stage}|${fl.s.focus ?? ''}` : '-'].join('|');
  const memo = ctr === 'anchoredCard' ? undefined : FIT_MEMO.get(r.art as object);
  if (memo && memo.key === key) return memo.fit;
  const fit = fitMeasure(d, R, th, opts);
  if (ctr !== 'anchoredCard') FIT_MEMO.set(r.art as object, { key, fit });
  return fit;
}
const FIT_MEMO = new WeakMap<object, { key: string; fit: { w: number; h: number } | undefined }>();
/**
 * 出血地图上节点 / 地名的那一条（B10 审查修复 ⑪）：整屏宽、竖向 = 数据区（页头 / 页签下面）再从底下让出底栏（按键图例 / 平移提示，与不出血的地图同一个让法）。地图与揭雾遮罩铺整屏、
 * 节点按这一条排（节点的 uv 换算到整屏 uv 再进遮罩，两边仍对齐）——M12b-25 把节点挪到整屏坐标后，泊松撒点的 0.1–0.9 带压到了页头、页签、关闭钮和底部图例下面。
 * 数据区要量过才知道（地图本体在页头之前画），所以先跑一遍只量不画的构图（与 fitScreen 同一套记忆：同一套参数、同一画面只量一次）；不是出血地图时 undefined
 */
function bleedBand(d: DrawCtx, R: Rect, th: Theme, opts: { chrome?: boolean }, fit: { w: number; h: number } | undefined): Rect | undefined {
  if (opts.chrome === false || !mapBleedOn(th.r)) return undefined;
  const fl = flowNow();
  const key = [R.x, R.y, R.w, R.h, th.unitK ?? 1, FONT_EPOCH.v, uiImagesVersion(), PSEUDO.pct, TEXT_K.k, fit ? `${fit.w}x${fit.h}` : '-', fl ? `${fl.s.stage}|${fl.s.focus ?? ''}` : '-'].join('|');
  const memo = BAND_MEMO.get(th.r.art as object);
  if (memo && memo.key === key) return memo.band;
  const nc = measureOnlyCtx(d.t ?? d.ctx), nd: DrawCtx = { ctx: nc, t: nc, m: nc, blur: 0, full: d.full };
  const was = DRAW_LOG.on;
  DRAW_LOG.on = false;
  let band: Rect | undefined;
  try {
    const L = screenPass(nd, R, th, { ...opts, fit, measure: true }).layout;
    if (L?.mainR && L.shape === 'spatial') {
      // 底栏与不出血的地图同一个让法：数据区从底下让出底栏那一条（剩下不到 80 时不让）
      const m = L.mainR, strip = mapStrip(L.e, nd, th, R), h = strip && m.h - strip > 80 * L.e.k ? m.h - strip : m.h;
      band = { x: R.x, y: m.y, w: R.w, h };
    }
  } finally { DRAW_LOG.on = was; }
  BAND_MEMO.set(th.r.art as object, { key, band });
  return band;
}
const BAND_MEMO = new WeakMap<object, { key: string; band: Rect | undefined }>();
function fitMeasure(d: DrawCtx, R: Rect, th: Theme, opts: { chrome?: boolean }): { w: number; h: number } | undefined {
  const nc = measureOnlyCtx(d.t ?? d.ctx), nd: DrawCtx = { ctx: nc, t: nc, m: nc, blur: 0, full: d.full };
  const was = DRAW_LOG.on;
  DRAW_LOG.on = false;
  try {
    let fit: { w: number; h: number } | undefined;
    for (let it = 0; it < 3; it++) {
      const L = screenPass(nd, R, th, { ...opts, fit, measure: true }).layout;
      if (!L?.mainR) break;
      const need = measureData(L.e, L.mainR, L.shape, L.ink);
      if (!need) break;
      // 常驻详情栏和数据区并排：高按两者里高的那个
      // 详情在集合下方（lay.detail = below，M12b-11）：高 = 集合 + 间距 + 详情，与整块数据区比
      const nh = L.detailR ? (L.below !== undefined ? need.h + L.e.k * 12 + detailNeed(L.e, L.detailR, L.ink).h : Math.max(need.h, detailNeed(L.e, L.detailR, L.ink).h)) : need.h;
      // 第一遍只按高收放（高放开以后格子 / 卡片可能不用再缩），之后再按宽收（宽只收不放）
      const dw = it === 0 ? 0 : Math.max(0, L.mainR.w - need.w), dh = (L.below ?? L.mainR.h) - nh;
      if (dw < 1 && Math.abs(dh) < 1 && it > 0) break;
      const next = { w: L.outer.w - dw, h: L.outer.h - dh };
      if (fit && Math.abs(fit.w - next.w) < 0.5 && Math.abs(fit.h - next.h) < 0.5) break;
      fit = next;
    }
    return fit;
  } finally { DRAW_LOG.on = was; }
}

/**
 * 数据要多大（M12a-38 的测量阶段，§2 的 contentSize）：与 drawData 同一个分支、同一套几何——列表（listPlan：自然行高 × 行数）、网格（lattice 的 need）、卡行（cardsGeom 的自然卡宽）、
 * 表单（设置行）、长文（折行）、表格、记录页（detailNeed）；没有可量尺寸的数据结构返回 null（容器不按内容收）
 */
/** 双网格选过（M12b-11）：测量 / 预排不按单块网格算 */
const arr0dual = (e: ElCtx) => e.r.str('lay.composition', '') === 'dualGrid' && chosen(e, 'lay.composition');
function measureData(e: ElCtx, a: Rect, shape: string, ink?: string): { w: number; h: number } | null {
  const r = e.r, S = (n: number) => n * e.k, arr = r.str('lay.arrangement', ''), sub = r.str('cnt.subtype', '');
  // 分段数据区（lay.sections）量不出自然高：照数据区
  if (sectionsOf(e)) return null;
  const listNeed = () => {
    const P = listPlan(e, a, ink);
    if (P.n === 0) return null;
    if (!P.full) {
      // 菜单行（竖列）：行高与 menuRows 一样
      const rh = Math.max(S(40), tap(e), LH(e, { ...e.base, weight: 700 }) + S(10));
      return { w: a.w, h: P.n * (rh + S(6)) - S(6) };
    }
    return { w: a.w, h: P.n * P.rh0 + (P.n - 1) * P.gap + P.hdrs.length * P.hdrH + (P.strip ? P.strip.h + 8 * e.k : 0) };
  };
  switch (shape) {
    case 'collection': {
      if (['server', 'mail', 'saveSlot', 'leaderboard'].includes(sub)) return listNeed();
      // 网格（B7 审查修复 ⑪：与 drawData / itemRects 同一套——马赛克也走这里，跨格 / 置顶行经 packOf，页眉 / 页脚先从数据区扣掉、量出来的高再加回）
      if (arr === 'grid' || arr === 'hexGrid' || arr === 'mosaic') {
        const n0 = itemCountSet(e) ? count(e, 12, true) : itemCountOr(e, 6), n1 = gridFill(e, n0).n, deco = gridDeco(e), a1 = deco ? gridBody(e, a, deco) : a;
        const need = lattice(e, a1, { n: n1, kind: r.str('cmp.slot', 'cell'), hex: arr === 'hexGrid', ...packOf(e, n1) }).need;
        return deco ? { w: need.w, h: need.h + (a.h - a1.h) } : need;
      }
      if (['pyramid', 'ring', 'cross', 'fan', 'scatter', 'spread', 'flankColumns', 'fixedGroups'].includes(arr) || (arr0dual(e))) return null;
      if (arr === 'row' && (sub === 'draft3' || r.str('cmp.slot', '') === 'tallCard')) {
        const ec = e.part('card'), G = cardsGeom(ec, a), asp = numParam(r, 'lay.cellAspect'), k = asp !== null && asp > 0 ? 1 / Math.max(0.2, Math.min(5, asp)) : 1.45;
        const w0 = Math.min(asp !== null ? Infinity : S(200), (G.a.w - G.gap * (G.n - 1)) / G.n);
        return { w: G.n * G.w + (G.n - 1) * G.gap + (a.w - G.a.w), h: w0 * k + G.raise + G.sink };
      }
      return listNeed();
    }
    case 'sequence':
      if (arr === 'grid') return lattice(e, a, { n: count(e, 7), kind: r.str('cmp.slot', 'cell'), hex: false, days: true }).need;
      return null;
    case 'form': {
      if (sub === 'naming' || r.str('ix.mode', '') === 'textInput' || sub === 'rebind') return null;
      // 经营表（M12b-62）：服务行 + 细线 + 税率行，行高与 economyForm 一样；捏人表单的行数 = createRows
      if (r.str('cnt.screen', '') === 'screen.manage') { const ec = samplesFor('economy'); return { w: a.w, h: (ec.services.length + ec.taxes.length) * Math.max(S(36), tap(e), LH(e, e.base, 1.7)) + S(10) }; }
      const rh = Math.max(S(40), tap(e), LH(e, e.base, 1.8));
      return { w: a.w, h: (sub === 'create' ? samplesFor('createRows').length : settingsOf().rows.length) * rh };
    }
    case 'text': {
      if (sub === 'credits') return { w: a.w, h: a.h * 0.2 + pack().screens.credits.length * LH(e, e.base, 3.2) };
      const tl = r.str('cnt.textLength', 'short');
      if (tl === 'line' || tl === 'title') return null;
      // 段落之间有分隔线（vis.dividerPlace = betweenBlocks，M12b-45）时逐段量、每条线加 17（与 textBlock 同口径）
      const tx = blockText(e, tl === 'long'), paras = dividerPlaces(e)?.includes('betweenBlocks') ? tx.split('\n').filter((x) => x.trim()) : [];
      const mh = (s0: string) => textRich(e, s0, { x: 0, y: 0, w: a.w - S(16), h: Infinity }, { ...e.base }, true);
      return { w: a.w, h: paras.length > 1 ? paras.reduce((h, p0) => h + mh(p0), S(17) * (paras.length - 1)) : mh(tx) };
    }
    case 'table': return { w: a.w, h: (pack().screens.stats.rows.length + 1) * Math.max(S(36), LH(e, e.base, 1.8)) };
    case 'record': return detailNeed(e, a, ink);
    default: return null;
  }
}

/** 容器画了面板（插画槽只放在面板里）：非浮层、非横幅 / 直接叠加、不是场景容器 */
function framedPanel(e: ElCtx): boolean {
  const r = e.r, kind = r.str('ast.container', 'none');
  if (kind && kind !== 'none' && kind !== 'auto') return false;
  return !['overlay', 'none', 'banner'].includes(r.str('lay.container', 'modal')) && r.str('cmp.modal', 'standard') !== 'floating';
}

/**
 * 吉祥物陪衬（cnt.companion = mascot，M12a-36）：立绘站在弹窗左外沿（左边放不下就压在面板左缘上），旁边一个对话气泡（cmp.dialogBox 的气泡样式），
 * 台词取内容包 screens.companionLine（不写时用引导 NPC 的台词）。立绘没有素材时是灰盒
 */
function companionMascot(e: ElCtx, R: Rect, o: Rect) {
  const S = (n: number) => n * e.k, g = e.g;
  const h = Math.min(o.h * 0.85, R.h * 0.62), w = h * 0.56;
  const x = Math.max(R.x + S(8), o.x - w * 0.62), y = o.y + o.h - h;
  artSlot(e, { x, y, w, h }, 'mascot', '吉祥物立绘');
  const line = pack().screens.companionLine ?? pack().hud.guide.line;
  const bh = Math.max(S(36), LH(e, e.small, 2)), bw = Math.min(R.w * 0.4, W(e, line, e.small) + S(28));
  const bx = Math.min(R.x + R.w - bw - S(8), x + w * 0.55), by = Math.max(R.y + S(8), y - bh * 0.4);
  const dlg: BoxStyle = { ...e.t.panel, ...(e.t.dialog ?? {}), shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 };
  drawBox(g, { x: bx, y: by, w: bw, h: bh }, dlg, e.pal);
  // 气泡尾巴指向立绘头部
  g.fillStyle = resolveColor(dlg.bg && 'solid' in dlg.bg ? dlg.bg.solid : '#fff', e.pal, '#fff');
  g.beginPath(); g.moveTo(bx + S(14), by + bh - 1); g.lineTo(bx + S(30), by + bh - 1); g.lineTo(x + w * 0.5, y + h * 0.12); g.closePath(); g.fill();
  T(e, line, bx + S(14), by, bh, e.small);
}

/**
 * 陪衬立绘位（cnt.companion = mascot，M12b-64 ④，balatro#35）：容器左侧扣出的一条里，上面一个对话气泡（cmp.dialogBox 的气泡样式，按条宽折行、最多 3 行），
 * 下面立绘贴底（插画槽，没有素材时灰盒）；气泡尾巴指向立绘头部。原来立绘挂在面板左外沿、放不下就压在面板左缘和数据上。
 * Godot：HBoxContainer 左边一列 VBox（气泡 PanelContainer + 立绘 TextureRect），数据在右边一列
 */
function companionStrip(e: ElCtx, a: Rect) {
  const S = (n: number) => n * e.k, g = e.g;
  const line = pack().screens.companionLine ?? pack().hud.guide.line;
  const pad = S(10), lh = LH(e, e.small), lines = wrapText(e, line, Math.max(S(40), a.w - pad * 2), e.small).slice(0, 3);
  const bub: Rect = { x: a.x, y: a.y, w: a.w, h: lh * lines.length + pad * 1.2 };
  const top = bub.y + bub.h + S(14), h = Math.max(0, a.y + a.h - top), w = Math.min(a.w, h * 0.56);
  const fig: Rect = { x: a.x + (a.w - w) / 2, y: top, w, h };
  if (h > S(40)) artSlot(e, fig, 'mascot', '吉祥物立绘');
  const dlg: BoxStyle = { ...e.t.panel, ...(e.t.dialog ?? {}), shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 };
  drawBox(g, bub, dlg, e.pal);
  // 气泡尾巴指向立绘头部
  g.fillStyle = resolveColor(dlg.bg && 'solid' in dlg.bg ? dlg.bg.solid : '#fff', e.pal, '#fff');
  const tx = fig.x + fig.w * 0.5;
  g.beginPath(); g.moveTo(tx - S(8), bub.y + bub.h - 1); g.lineTo(tx + S(8), bub.y + bub.h - 1); g.lineTo(tx, top + Math.min(h * 0.08, S(10))); g.closePath(); g.fill();
  lines.forEach((l, i) => T(e, l, a.x + pad, bub.y + pad * 0.6 + i * lh, lh, e.small));
}

/**
 * 饰件避让（M12a-08）：一行（纵向 y0 ~ y1）里从 x 起往右（dir = 1）/ 往左（dir = −1）排的东西，碰到饰件占位（角花、成块饰件）就挪到它外面（留 gap）
 */
function clearOf(rects: Rect[], y0: number, y1: number, x: number, dir: 1 | -1, gap: number): number {
  let v = x;
  for (const q of rects) {
    if (q.y >= y1 || q.y + q.h <= y0) continue;
    if (dir > 0 && q.x <= v + 1 && q.x + q.w + gap > v) v = q.x + q.w + gap;
    if (dir < 0 && q.x + q.w >= v - 1 && q.x - gap < v) v = q.x - gap;
  }
  return v;
}

/** 对话类模板（标题位写说话人名，M12a-23）：子功能是 NPC 对话 / 对话轮盘 / 过场，或界面类型是对话 */
const dialogueLike = (r: ElCtx['r']) => ['npc', 'dialogueWheel', 'cutscene'].includes(r.str('cnt.subtype', '')) || r.str('cnt.screen', '') === 'screen.dialogue';
/** 取值是 auto / 空时用 def */
const optOf = (r: ElCtx['r'], k: string, def: string) => { const v = r.str(k, def); return !v || v === 'auto' ? def : v; };
/** 关不掉的结束方式：不可关闭 / 自动消失 / 点任意处 / 点外面（ix.close 的生效条件只有按钮 / 按键关闭） */
const CLOSE_OFF = new Set(['forced', 'timed', 'tapAnywhere', 'tapOutside']);
/**
 * 实际画的关闭控件（M12b-64 ⑧，cult-of-the-lamb#36）：ix.dismiss 是上面这几种时不画，即使显式写了 ix.close（check 给 C-inactive 提示）；
 * 其余照 ix.close（没给时由派生规则 D-dismiss 推，兜底 xTopRight）
 */
const closeKind = (e: ElCtx) => {
  const r = e.r, dm = r.str('ix.dismiss', '');
  // 旧皮肤（终期审查修复 ⑥）：「点外面关闭不画 ✕」是 B1 · 64 ⑧ 新加的（tpl.chat 的预设写了 tapOutside，14 个旧皮肤的聊天页丢了 ✕）——旧皮肤上 ix.dismiss 要皮肤之后的层给的才算；
  // 否则照原来（B1 之前只看 ix.close）：D-dismiss 因 tapOutside 推出来的 none 不算（原来那条规则没有 tapOutside），不写标题（lay.titlePos = none）推的 none 照旧
  if (e.th.legacy && !afterSkin(r, 'ix.dismiss')) {
    if (dm === 'tapOutside' && r.src('ix.close')?.layer === 'derived' && r.str('lay.titlePos', '') !== 'none') return 'xTopRight';
    return optOf(r, 'ix.close', 'xTopRight');
  }
  return CLOSE_OFF.has(dm) ? 'none' : optOf(r, 'ix.close', 'xTopRight');
};

/** 页头的结果：rect = 容器里的页头行（没有页头行时 null）；body = 扣掉页头之后的主体；avoid = 页头放进内框的东西（innerBR 关闭钮），按钮行避开；late = 主体排好以后再画的部分（标题压在立绘上） */
/** slot = 页头行里返回钮与关闭钮之间放元素的那一段（elx.anchorSpace = header，M12a-19） */
/** slots = 标题照写时页头行的左 / 右控件段（M12b-64 ②：左对齐标题没有左段）；autoOk = 自动进页头的元素放得下 */
interface Header { rect: Rect | null; body: Rect; avoid: Rect[]; late?: (focalR: Rect | null, layering: string) => void; slot?: Rect; slots?: { left: Rect | null; right: Rect }; autoOk?: boolean; /** 角落返回牌（ix.close = cornerSign，M12b-51）的矩形 */ sign?: Rect }
/** 页头里元素要的宽（M12b-64 ②）：l / r = 显式放进页头的元素（左列 / 其余），al / ar = 自动进页头的候选 */
interface HeaderSeg { l: number; r: number; al: number; ar: number }

/**
 * 页头（M12a-23，§2 的 drawHeader）：标题（模板名；对话类模板写说话人名）+ 返回钮（ix.back）+ 关闭控件（ix.close）。
 *   lay.titlePos：panel = 面板内左上（原来的）/ screenTop = 画面顶部居中（下划线 = vis.stroke@title，副题一行）/ straddle = 标牌骑在面板上缘、上移半个牌高 /
 *     onFocal = 标牌压在立绘顶部中央、写角色名 / none = 不写标题（全屏模板不再在左上写模板名）；lay.titleAlign = left / center；lay.titleSubtitle = 标题下一行副题。
 *   标牌形态按 cmp.plate@title（说话人名 @name）→ @plate → 全局，选过才画（platePick）；颜色、字体、描边按作用域（plate()）；
 *   标题字体用作用域的 typ.display.family / typ.titleFx，书法字体或枯笔特效时换楷体、枯笔描边（书法位图只写游戏名，页头永远写字）；
 *   作用域写了标题带的样式（col.surface@titleBar、vis.pattern@titleBar……）时页头行垫一条标题带（t.titleBar，M12a-03 留下的读者）。
 *   关闭控件：xTopRight / keyGlyph / back 在页头行右 / 左，xOutside 挂在面板右上角外，bottomCenter 挂在面板底边正中（Hades 的红圆 ✕），
 *     innerBR 是内框右下角的小 ✕（Stardew 文本框），none 不画；cancelBtn 在底部按钮行。默认值由派生规则给（D-dismiss：forced / timed、lay.titlePos = none → none）。
 *   标题起点与右上的控件避开容器面板的角饰（box0.orn，M12a-08）。Godot：页头 = 顶部 HBoxContainer（Label + 关闭 Button）；straddle = 负 offset 的 Panel
 */
function drawHeader(e: ElCtx, inner: Rect, box0: Box0, label: string, R: Rect, hold = 0, seg?: HeaderSeg): Header {
  const r = e.r, S = (n: number) => n * e.k, g = e.g;
  const focalOn = !['none', 'auto', ''].includes(r.str('cnt.focal', 'none'));
  // 旧皮肤（§0 的版式规则）：皮肤之前的层（界面模板预设，目检修复起 tpl.title / login / loading… 写了 none）给的 lay.titlePos 不算，照旧在面板里写模板名
  // 品质下限（审查修复 E 视觉 ⑥）：模板预设写了不要标题（标题页 / 结算 / 登录…）时旧皮肤也不写——原来标题页左上写着开发用的模板名「标题」
  const presetNone = QUALITY.on && isHudCanvas(g) && r.str('lay.titlePos', '') === 'none';
  const pos0 = e.th.legacy && !afterSkin(r, 'lay.titlePos') && !presetNone ? 'panel' : optOf(r, 'lay.titlePos', 'panel'), pos = pos0 === 'onFocal' && !focalOn ? 'panel' : pos0;
  // 三选一的说话人子区（M12b-21，hades#39）：tpl.draft3 显式写了 cnt.companion = avatar 时页头写「神祇名」+ 一句台词（斜体副题），代替模板标题
  const draftSay = r.str('cnt.subtype', '') === 'draft3' && r.str('cnt.companion', 'none') === 'avatar' && chosen(e, 'cnt.companion');
  const align = optOf(r, 'lay.titleAlign', 'left'), subMode = draftSay ? 'italic' : optOf(r, 'lay.titleSubtitle', 'none'), backK = optOf(r, 'ix.back', 'none');
  const close0 = closeKind(e);
  // ix.back 与 ix.close = back 都是左上返回：只画一个
  const close = close0 === 'back' && backK !== 'none' ? 'none' : close0;
  const avoid = [...box0.orn.corners, ...box0.orn.marks];
  // 标题文字：对话类模板写说话人名（pack().hud.subtitle[0]），标题压在立绘上时写角色名，其余是模板名
  // 单词感叹（cnt.textLength = word，M12b-61）不写说话人名
  const speaker = dialogueLike(r) || draftSay ? spokenLine(r).who || null : pos === 'onFocal' && r.str('cnt.focal', 'none') === 'character' ? DATA.hero.name : null;
  // 面板抬头（lay.panelHeader = crestTwoLine，M12b-30，civ6#31 外交面板）：圆形阵营勋章（外形 vis.silhouette@badge）+ 两行小型大写名（领袖 / 帝国 = 角色样本第一位的名字与称号）；
  // 标牌没另选时画成两行名牌
  // 对话类模板（有说话人）时勋章与两行名跟说话人：名 = 说话人、第二行 = 角色样本里他的称号（外交面板的领袖 / 帝国）
  const crest = pickedStr(e, 'lay.panelHeader', 'title') === 'crestTwoLine', chars = crest ? samplesFor('characters') : [];
  const crestC = !crest ? null : speaker ? chars.find((c) => c[1] === speaker) ?? [[...speaker][0] ?? '', speaker, ''] : chars[0] ?? null;
  const role = speaker ? 'name' : 'title', text = speaker ?? (crestC?.[1] || label);
  const eh = e.part(role, 'titleBar'), ep = e.part(role, 'plate');
  const plateK = crest && !chosenKey(e.part(role, 'plate'), 'cmp.plate') ? 'twoLine' : platePick(e, role, 'none');
  // 书法标题（与 drawFocal 的 inkTitle 同口径；旧皮肤要皮肤之后显式选过）：换楷体，枯笔特效时加枯笔描边
  // 旧皮肤：目标链上第一个选过的键（chosenKey，审查修复 A · C11）
  const famV = e.th.legacy ? pickedStr(eh, 'typ.display.family', '') : eh.v.str('typ.display.family', ''), dryV = e.th.legacy ? pickedStr(eh, 'typ.titleFx', '') : eh.v.str('typ.titleFx', '');
  const fam = famV === 'calligraphy', dry = dryV === 'drybrush';
  const ink = fam || dry;
  const inkO: Partial<TextOpts> = ink ? { font: FONT_STACK.calligraphy, drybrush: dry || undefined } : {};
  const titleH = headerRowH(e);
  const tO: TextOpts = { ...eh.title, size: eh.title.size * 1.35, color: box0.ink ?? eh.title.color, ...inkO };
  const po: TextOpts = { ...ep.title, size: ep.title.size * 1.2, ...inkO };
  const ph = Math.min(titleH, LH(ep, po, 1.9));
  // 括号框把副题框进去时（M12b-46），框宽也要放得下副题：两行里宽的那行 + 两侧括号臂（臂长 = 框高一半）与涡卷的深度（B4 审查修复：原来只多 1.4 牌高，下臂卷进副题的首尾字）；
  // 两行名牌（twoLine）的第二行比名字宽时，牌宽按第二行（B4 审查修复：原来只按名字量，长称号 / 副题伸出牌外、越过面板边）
  const plateW = (k: string) => {
    const tw = W(ep, text, po);
    if (k === 'bracketFrame' && subH > 0) return Math.max(plateWidthOf(k, tw, ph), bracketWidth(Math.max(tw, W(eh, subT, subO)), ph + subH));
    const s2 = k === 'twoLine' ? twoSub() : null;
    return Math.max(plateWidthOf(k, tw, ph), s2 ? W(ep, s2, twoO) + ph * 1.2 : 0);
  };
  // 副题（lay.titleSubtitle）：内容包 screens.titleSub，没写时游戏的英文副标题
  const subT = draftSay ? spokenLine(r).line : pack().screens.titleSub ?? pack().game.subtitle;
  const subO: TextOpts = { ...eh.small, color: withAlpha(tO.color, 0.72), italic: subMode === 'italic' || undefined, upper: subMode === 'caps' || undefined, spacing: subMode === 'caps' ? 0.25 : eh.small.spacing };
  const subH = subMode !== 'none' ? LH(eh, subO) : 0;
  // 副题画在两行名牌里（标题牌的第二行就是副题；人名牌的第二行是称号，副题照旧另起一行）：外面不另画、页头行不为它长高（B4 审查修复）
  const twoIn = plateK === 'twoLine' && role !== 'name';
  // 下划线（vis.stroke@title 写了时）：线色 / 线宽取标题部件主题的面板描边
  const underline = (x: number, y: number, w: number) => {
    const sv = scopedStr(eh, 'vis.stroke');
    if (sv === null || sv === 'none') return;
    const b = eh.t.panel.border ?? eh.t.panel.sides?.b ?? eh.t.panel.sides?.t;
    g.fillStyle = resolveColor(b?.color ?? e.accent, e.pal); g.fillRect(x, y, w, Math.max(1, b?.width ?? 1.5));
  };
  // 整宽标题带（M12b-47：band / fadeBand / dragHandle / stripedFlank）：标题带铺满返回钮之后到关闭钮之前的一行
  const band = BAND_PLATES.has(plateK) && plateK !== 'bleedLabel';
  // 页头图标槽（lay.headerIcon，M12b-47，elden-ring#26 的方形铜框徽记）：标题前一枚徽章（badge）或铜框物品图标（item）；选过才画
  const hiK = crest ? 'crest' : pickedStr(eh, 'lay.headerIcon', 'none'), ih = Math.min(titleH * (crest ? 0.95 : 0.82), S(crest ? 38 : 30)), iw = hiK === 'none' ? 0 : ih + S(8);
  const headIcon = (x: number, y: number, h: number) => {
    if (hiK === 'none') return;
    const cy = y + h / 2;
    if (hiK === 'crest') {
      // 阵营勋章：强调色底 + 浅色描边的圆（vis.silhouette@badge 选了别的外形时按它）+ 首字
      const q = { x, y: cy - ih / 2, w: ih, h: ih }, sil = scopedSilhouette(e, 'badge');
      drawBox(g, q, { bg: { solid: e.accent }, border: { width: Math.max(1.5, S(2)), color: withAlpha('#fff', 0.85) }, ...(sil && sil !== 'circle' ? { shape: sil } : { radiusPct: 50 }) } as BoxStyle, e.pal);
      const ini = crestC?.[0] ?? '', io = { ...onAccent(e, e.title), size: ih * 0.48, weight: 900 }; T(e, ini, q.x + ih / 2 - W(e, ini, io) / 2, q.y, ih, io);
      return;
    }
    if (hiK === 'badge') { badge(e, x + ih / 2, cy, ih / 2, 'medal', '', { generic: true }); return; }
    const q = { x, y: cy - ih / 2, w: ih, h: ih }, mat = pickedStr(e, 'ast.frameMat', 'bronze');
    drawBox(g, q, { bg: { solid: withAlpha('#000', 0.55) }, frame: { kind: 'plainNinePatch', mat, width: Math.max(2, ih * 0.1), motif: 'none' } }, e.pal);
    icon(e, sampleItems(gridSource(e), 1)[0][0], x + ih / 2, cy, ih * 0.55, e.accent);
  };
  // 两行名牌（twoLine）的第二行：人名牌 = 内容包角色样本里同名角色的称号；说话人不在角色样本里时没有第二行（B4 审查修复：原来借第一个角色的称号，
  // 24 个内容包里 14 个的说话人名下写的是别人的身份），plateBody 画成单行页签；标题牌 = 副题
  const twoSub = (): string | null => { if (crestC) return crestC[2] || subT; if (role !== 'name') return subT; return samplesFor('characters').find((c) => c[1] === text)?.[2] || null; };
  // 第二行的字：与 plateBody 的称号行同口径（名字字号的 0.62、粗体）
  const twoO: TextOpts = { ...po, size: po.size * 0.62, weight: 700 };
  const plateX = (): PlateExtra => { const s2 = plateK === 'twoLine' ? twoSub() : null; return { screen: R, align: align === 'center' ? 'center' : 'left', stop: rx, lead: band ? iw : 0, ...(s2 ? { sub: { text: s2, o: {} } } : {}) }; };
  // 整宽标题带的右端（B4 审查修复：页头行里还有元素时只铺到元素段之前，见下面的 seg 分支；没有元素时铺到关闭钮前）
  let bandEnd: number | null = null, bandX: number | null = null;
  // 一段标题（标牌或字）画在 (x, y) 起、高 h 的行里；返回宽
  const titleAt = (x: number, y: number, h: number): number => {
    if (band) { const q = { x, y: y + (h - ph) / 2, w: Math.max(ph * 2, (bandEnd ?? rx - S(6)) - x), h: ph }; plate(e, q, text, plateK, { size: po.size, ...inkO }, role, plateX()); headIcon(q.x + S(4), q.y, q.h); return q.w; }
    headIcon(x, y, h);
    const x1 = x + iw;
    // 括号框（M12b-46）把副题一起框进去：牌高 + 副题行
    if (plateK !== 'none') { const w = plateW(plateK), py = y + (h - ph) / 2, framedSub = plateK === 'bracketFrame' && subH > 0; plate(e, { x: x1, y: py, w, h: ph + (framedSub ? subH : 0) }, text, plateK, { size: po.size, ...inkO }, role, framedSub ? { ...plateX(), sub: { text: subT, o: subO } } : plateX()); return iw + w; }
    // 标题前缀（typ.titlePrefix，M12b-43）：「>」「>>」/ 圆点 / 母题符号，没选时 0
    const pw = titlePrefix(eh, x1, y, h, tO);
    return iw + pw + T(eh, text, x1 + pw, y, h, tO);
  };
  const widthOf = () => (band ? Math.max(ph * 2, rx - S(6) - tx0) : iw + (plateK !== 'none' ? plateW(plateK) : W(eh, text, tO) + titlePrefix(eh, 0, 0, 0, tO, true)));
  // 整宽标题带最少要多宽（页头行里还有元素时按它排段，B4 审查修复）：图标槽 + 字宽 + 1.2 牌高（与 plateWidthOf 的默认口径一样）
  const bandMin = () => iw + Math.max(ph * 2, plateWidthOf(plateK, W(ep, text, po), ph));
  // 页头行：面板内的标题行，或只放控件（返回 / 关闭）的一行
  const rowControls = backK !== 'none' || ['xTopRight', 'back', 'keyGlyph'].includes(close);
  const titleInRow = pos === 'panel';
  // 居中标题压在容器上沿正中的成块饰件上（R4 回归修复 C1 ⑤，hollow-knight 背包 / 护符：顶部的心形卷须盖住「背包」）：左对齐的标题会横着让开（clearOf），居中的没法横着让——
  // 整个页头行挪到饰件下沿以下（挪的距离不超过内框高的 25%，否则照旧）。几何修复，所有皮肤
  // 竖向只看标题字那一段（行中线 ± 0.55 字号，与 clearOf 横向让开同口径）；只有饰件落在这一段里时才量标题宽（量字会改画布状态，没有饰件时调用序列与原来一样）
  const gy0 = inner.y + titleH / 2 - tO.size * 0.55, gy1 = inner.y + titleH / 2 + tO.size * 0.55;
  const rowMarks = titleInRow && align === 'center' ? box0.orn.marks.filter((q) => q.y < gy1 && gy0 < q.y + q.h) : [];
  if (rowMarks.length) {
    const tw = iw + (plateK !== 'none' ? plateW(plateK) : W(eh, text, tO)), cx = inner.x + inner.w / 2;
    // 只在饰件伸过标题字的中线时挪（R4 审查修复 ⑧⑮）：只擦到字那一段上沿的（hades skilltree 的矢量顶冠登记框伸进 5.5，位图顶冠不伸进来）不挪——
    // 原来位图加载前后整个页头与内容差 9，位图一到就跳回去；hollow-knight 的心形卷涡伸过整个标题行照旧挪
    const hit = rowMarks.filter((q) => q.x < cx + tw / 2 && cx - tw / 2 < q.x + q.w && q.y + q.h > (gy0 + gy1) / 2);
    const dy = hit.length ? Math.max(...hit.map((q) => q.y + q.h)) + S(4) - gy0 : 0;
    if (dy > 0.5 && dy <= inner.h * 0.25) inner = { ...inner, y: inner.y + dy, h: inner.h - dy };
  }
  // 页头行里放元素（elx.anchorSpace = header，M12a-19）：行按元素的高长高，标题位不写模板名（元素替掉它）
  const rowH = Math.max(titleInRow ? titleH + (twoIn ? 0 : subH) : rowControls ? titleH : 0, hold);
  const row: Rect = { ...inner, h: rowH };
  // 标题带（M12a-03 的 titleBar 盒子）：作用域写了标题带的样式才垫（col.surface@titleBar、vis.pattern@titleBar……）
  const tb = e.part('titleBar');
  if (titleInRow && tb.th !== e.th) { const o = box0.outer; panel(tb, { x: o.x, y: o.y, w: o.w, h: inner.y + rowH + S(4) - o.y }, true, {}, 'titleBar'); }
  // 左侧：返回钮（ix.back：arrow 方钮 / labeled 带字；ix.close = back 是原来的方钮）
  let tx0 = inner.x;
  const backL = backK === 'labeled' ? '‹ 返回' : '‹';
  // 出血的标牌（cmp.plateBleed 选过 / bleedLabel，M12b-47）伸到最近的屏幕边，往左伸时会盖住返回钮：这时返回钮挪到标题之后画、压在牌上（B4 审查修复，
  // slay-the-spire#31 的燕尾旗 + 出血遇上返回钮）；不出血时绘制顺序与原来一样
  const bleeds = plateK !== 'none' && !ORNATE_PLATES.has(plateK) && (plateK === 'bleedLabel' || cmpPicked(ep, 'cmp.plateBleed', 'false') === 'true');
  let drawBack = () => {};
  if (backK !== 'none' || close === 'back') {
    const s = Math.max(S(28), tap(e)), y = inner.y + (titleH - s) / 2, x = clearOf(avoid, y, y + s, inner.x, 1, S(4));
    const w = backK === 'labeled' ? Math.max(s, W(e, backL, buttonText(e, s)) + S(24)) : s;
    if (bleeds) drawBack = () => button(e, { x, y, w, h: s }, backL, 'back');
    else button(e, { x, y, w, h: s }, backL, 'back');
    tx0 = x + w + S(10);
  }
  // 右侧：关闭控件（先排位置、标题画完再画：居中的标题要知道右边留多少，绘制顺序与原来一样是标题在前）
  const right = (w: number, h: number) => clearOf(avoid, inner.y + (titleH - h) / 2, inner.y + (titleH + h) / 2, inner.x + inner.w, -1, S(4)) - w;
  let rx = inner.x + inner.w;
  const extra: Rect[] = [];
  const hang = (cx: number, cy: number, s: number) => {
    g.fillStyle = e.bad; g.beginPath(); g.arc(cx, cy, s / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke();
    icon(e, '×', cx, cy, s * 0.5, '#fff');
    logTarget(g, { x: cx - s / 2, y: cy - s / 2, w: s, h: s }, '关闭', 'button');
  };
  let drawClose = () => {};
  let sign: Rect | undefined;
  if (close === 'xTopRight') {
    const s = Math.max(S(28), tap(e)), x = (rx = right(s, s));
    drawClose = () => button(e, { x, y: inner.y + (titleH - s) / 2, w: s, h: s }, '×', false);
  } else if (close === 'xOutside') {
    // 挂在面板右上角外；有跨界面顶栏（flow.chrome = statusBar / topCurrency）时挪到顶栏下面、不出画面（M12a-26：Civ6 的红圆 ✕ 原来压在顶栏右端的货币胶囊上）
    const s = Math.max(S(34), tap(e)), o = box0.outer, ct = chromeTop(e);
    const cx = Math.min(o.x + o.w - s * 0.2, R.x + R.w - s / 2 - S(2)), cy = ct ? Math.max(o.y + s * 0.2, R.y + ct + s / 2 + S(2)) : o.y + s * 0.2;
    drawClose = () => hang(cx, cy, s);
  } else if (close === 'bottomCenter') {
    // 挂在面板底边正中（Hades 外框底边的红圆 ✕）
    const s = Math.max(S(34), tap(e)), o = box0.outer;
    drawClose = () => hang(o.x + o.w / 2, o.y + o.h, s);
  } else if (close === 'innerBR') {
    // 内框右下角的小 ✕（Stardew 文本框）：底部按钮行避开它
    const s = Math.max(S(22), tap(e)), q = { x: inner.x + inner.w - s, y: inner.y + inner.h - s, w: s, h: s };
    extra.push(q);
    drawClose = () => button(e, q, '×', false);
  } else if (close === 'keyGlyph') {
    const l = 'Esc 返回', w = W(e, l, e.small) + S(16), x = (rx = right(w, S(22)));
    drawClose = () => plate(e, { x, y: inner.y + (titleH - S(22)) / 2, w, h: S(22) }, l, 'pill', { size: e.small.size });
  } else if (close === 'cornerSign') {
    // 角落的独立返回牌（M12b-51 收 stardew#26：Stardew 捏人页右下角那块向右指的木箭头路牌）：锚在画面的角上（ix.closeCorner，auto = br），
    // 箭头外形朝画面外指（右边角 arrowRight、左边角 arrowLeft），写「返回」；不占页头行，底部按钮行避开它
    const cn = optOf(r, 'ix.closeCorner', 'br'), hh = Math.max(S(34), tap(e)), l = '返回', w = W(e, l, buttonText(e, hh)) + hh * 1.2, mm = S(14);
    const q = { x: cn.endsWith('l') ? R.x + mm : R.x + R.w - w - mm, y: cn.startsWith('t') ? R.y + mm : R.y + R.h - hh - mm, w, h: hh };
    extra.push(q); sign = q;
    drawClose = () => button(e, q, l, false, true, 'button', cn.endsWith('l') ? 'arrowLeft' : 'arrowRight');
  }
  // 页头里的元素（M12b-64 ②，hades#49）：标题照写，元素只占左 / 右控件段（居中标题两侧各一段，左对齐标题右边一段）；
  // 显式放进页头的元素放不下时标题才让位（原来的：页头放了元素就整行不写标题）；自动进页头的候选放不下就不进（autoOk）
  let slots: Header['slots'], autoOk = false, titleOn = titleInRow;
  const segAll = seg ? seg.l + seg.r + seg.al + seg.ar : 0;
  if (seg && titleInRow && segAll > 0) {
    const gp = S(10), cy = inner.y + titleH / 2, x0 = clearOf(avoid, cy - tO.size * 0.55, cy + tO.size * 0.55, tx0, 1, S(4));
    // 整宽标题带按最小宽排段（B4 审查修复，xcom2#2：原来按整行宽量，页头里一有元素就放不下、整条标题连字一起不画）
    const wc = band ? bandMin() : widthOf(), x = align === 'center' ? Math.max(x0, Math.min(rx - gp - wc, inner.x + inner.w / 2 - wc / 2)) : x0;
    const L: Rect = { x: tx0, y: inner.y, w: Math.max(0, x - gp - tx0), h: rowH }, Rt: Rect = { x: x + wc + gp, y: inner.y, w: Math.max(0, rx - gp - (x + wc + gp)), h: rowH };
    const fits = (l: number, rr: number) => (align === 'center' ? l <= L.w + 0.5 && rr <= Rt.w + 0.5 : l + rr + (l && rr ? S(8) : 0) <= Rt.w + 0.5);
    if (seg.l + seg.r > 0 && !fits(seg.l, seg.r)) titleOn = false;
    else {
      slots = { left: align === 'center' ? L : null, right: Rt }; autoOk = fits(seg.l + seg.al, seg.r + seg.ar);
      if (band) {
        // 带只铺元素段以外的空当：左段 / 右段收到元素要的宽（自动进页头的算上），带从左段之后铺到右段之前
        const needL = align === 'center' ? seg.l + (autoOk ? seg.al : 0) : 0, needR = align === 'center' ? seg.r + (autoOk ? seg.ar : 0) : seg.l + seg.r + (autoOk ? seg.al + seg.ar : 0) + (seg.l + (autoOk ? seg.al : 0) && seg.r + (autoOk ? seg.ar : 0) ? S(8) : 0);
        const bx = needL > 0 ? Math.max(x0, tx0 + needL + gp) : x0, be = needR > 0 ? rx - gp - needR - gp : rx - S(6);
        bandEnd = Math.max(bx + wc, be);
        slots = { left: align === 'center' ? { ...L, w: Math.max(0, bx - gp - tx0) } : null, right: { ...Rt, x: bandEnd + gp, w: Math.max(0, rx - gp - (bandEnd + gp)) } };
        bandX = bx;
      }
    }
  } else if (seg && !titleInRow && rowH > 0) autoOk = segAll + S(8) * 3 <= rx - S(10) - tx0;
  // 标题（页头里放了元素、放不下时不写，M12a-19 / M12b-64）
  if (titleOn && (!hold || !!slots)) {
    // 左对齐时先画再拿宽（量字会把发光字的阴影状态留在画布上，原来左对齐的标题不先量）
    const cy = inner.y + titleH / 2, x0 = clearOf(avoid, cy - tO.size * 0.55, cy + tO.size * 0.55, tx0, 1, S(4));
    const wc = align === 'center' && !band ? widthOf() : 0;
    const x = align === 'center' && !band ? Math.max(x0, Math.min(rx - S(10) - wc, inner.x + inner.w / 2 - wc / 2)) : band ? bandX ?? x0 : x0;
    const w = titleAt(x, inner.y, titleH);
    if (plateK === 'none') underline(x + iw, cy + tO.size * 0.62, w - iw);
    if (subH && plateK !== 'bracketFrame' && !twoIn) { const sw = W(eh, subT, subO); T(eh, subT, align === 'center' ? x + w / 2 - sw / 2 : x, inner.y + titleH - S(6), subH, subO); }
    // 标题后的分隔线（vis.dividerPlace = afterTitle，M12b-45）：页头行与主体之间的空当正中，整行宽
    if (dividerPlaces(e)?.includes('afterTitle')) ruleLine(e, inner.x, inner.x + inner.w, inner.y + rowH + S(4) - 0.5);
  }
  drawClose();
  let body: Rect = rowH ? { x: inner.x, y: inner.y + rowH + S(8), w: inner.w, h: inner.h - rowH - S(8) } : inner;
  const pushBelow = (y: number) => { if (body.y < y) body = { ...body, y, h: body.y + body.h - y }; };
  if (pos === 'screenTop') {
    // 画面顶部（安全边以内）居中：标题 + 下划线 + 一行副题；全屏容器的主体排到它下面
    const m = Math.max(S(12), (r.num('lay.safeMargin', 2) / 100) * Math.min(R.w, R.h));
    // 画面顶部默认居中；显式选了 lay.titleAlign = left 才贴左
    const al = r.src('lay.titleAlign')?.layer, left = align === 'left' && !!al && al !== 'default' && al !== 'fallback';
    const w = widthOf(), x = left ? R.x + m : R.x + R.w / 2 - w / 2, y = R.y + m;
    titleAt(x, y, titleH);
    if (plateK === 'none') underline(x, y + titleH / 2 + tO.size * 0.62, w);
    // 副题已经画在牌里的（括号框、两行名牌）不再在下面另画一遍（B4 审查修复：两行名牌原来画两遍）；两行名牌的副题在牌高以内，主体不用再让一行
    if (subH && plateK !== 'bracketFrame' && !twoIn) { const sw = W(eh, subT, subO); T(eh, subT, left ? x : R.x + R.w / 2 - sw / 2, y + titleH - S(4), subH, subO); }
    pushBelow(y + titleH + (twoIn ? 0 : subH) + S(10));
  } else if (pos === 'straddle') {
    // 标牌骑在面板上缘：上移半个牌高（没选标牌形态时用页签）
    const k = plateK !== 'none' ? plateK : 'tab', o = box0.outer, w = plateW(k);
    const x = align === 'center' ? o.x + o.w / 2 - w / 2 : clearOf(avoid, o.y - ph / 2, o.y + ph / 2, inner.x, 1, S(4));
    // 两行名牌的第二行、出血的画面矩形、整宽带的对齐跟页头行一样传（B4 审查修复，hades#31：原来不传，两行名牌退成一个单行矩形）；骑边的牌不带图标槽
    plate(e, { x, y: o.y - ph / 2, w, h: ph }, text, k, { size: po.size, ...inkO }, role, { ...plateX(), lead: 0 });
    if (!rowH) pushBelow(o.y + ph / 2 + S(6));
  }
  drawBack();
  // 标题压在立绘上（onFocal）：主体排好以后画在立绘顶部中央（没选标牌形态时用页签）
  const late = pos === 'onFocal' ? (focalR: Rect | null, layering: string) => {
    const a = focalR ?? (layering === 'behind' ? standRect(R, r.str('lay.focalSide', 'left')) : layering === 'backdrop' ? R : null);
    if (!a) return;
    const k = plateK !== 'none' ? plateK : 'tab', w = plateW(k);
    plate(e, { x: a.x + a.w / 2 - w / 2, y: a.y + S(6), w, h: ph }, text, k, { size: po.size, ...inkO }, role, { ...plateX(), lead: 0 });
  } : undefined;
  return { rect: rowH ? row : null, body, avoid: extra, late, slot: rowH ? { x: tx0, y: inner.y, w: Math.max(0, rx - S(10) - tx0), h: rowH } : undefined, slots: rowH ? slots : undefined, autoOk: rowH > 0 && autoOk, ...(sign ? { sign } : {}) };
}

/**
 * 模板页头写什么（M12b-61，§2 的页头文字优先级：说话人 > 区域 / 任务名 > 模板名）：内容包按界面写的 header 变体（锻造屏 = 机器名、技能树 = 树的名字……，
 * factorio#9 的机器窗原来写「锻造」）→ 世界地图 = 当前区域名（world.region，hollow-knight#35）→ 经营 = 预算表标题 → 模板名。说话人在 drawHeader 里先看
 */
function headerLabel(th: Theme): string {
  const r = th.r, h = textFor('header', r);
  if (h) return h;
  // 战斗大字的页头（persona5#17：原来写模板名「战斗大字提示」）：一句口号（focalTitle 的 callout 变体）
  if (r.str('cnt.subtype', '') === 'callout') { const f = textFor('focalTitle', r); if (f) return f; }
  const k = sampleKind(r);
  if (k === 'locations') return pack().world.region;
  if (k === 'economy') return samplesFor('economy').title;
  return templateLabel(th);
}

function templateLabel(th: Theme): string {
  const sel = th.r.art[SELECTORS.screen];
  const p = typeof sel === 'string' ? PRESET.get(sel) : undefined;
  if (p) return p.label.replace(/（.*?）/g, '').split(' / ')[0];
  const sub = th.r.str('cnt.subtype', '');
  const o = SPEC_PARAM.get('cnt.subtype')?.options?.find((x) => x.value === sub);
  return o?.label.split(' / ')[0] ?? pack().menu.title;
}

/**
 * 位图大比例缩小（立绘 / 主视觉 / 地图 / 书法字 → 卡面、头像、面板）：临时打开平滑并用 high 质量，画完还原（与 elements/core.ts 的 smoothDraw 同口径）。
 * 默认 low 在 Chromium 里不走 mipmap，线稿会闪成噪点；UI 像素化时盒子画布关了平滑，同样先平滑缩小（像素感由放大那一步给）。
 */
function smooth(g: CanvasRenderingContext2D, fn: () => boolean): boolean {
  const on = g.imageSmoothingEnabled, q = g.imageSmoothingQuality;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const ok = fn();
  g.imageSmoothingEnabled = on;
  g.imageSmoothingQuality = q;
  return ok;
}

/* ---------------- 背后 ---------------- */

/**
 * 背后（M12a-24 起由 backdrop.ts 画）：rel.behind = replaced → 替换背景（ast.bgArt 全部取值，铺满整张画布）；实时 / 冻结 → 整屏压暗（rel.dim）+ 背后虚化（rel.sceneBlur，借毛玻璃通道）
 * + 调色（rel.sceneTone，多选）。返回画上去的位图背景（keyArt / sceneArt），其余返回 undefined
 */
function backdrop(d: DrawCtx, R: Rect, th: Theme): string | undefined {
  const r = th.r, behind = r.str('rel.behind', 'live');
  if (behind === 'replaced') return replacedBackdrop(d, R, th, 'template');
  const dim = r.has('rel.dim') ? r.num('rel.dim', 0.3) : behind === 'frozen' ? 0.55 : 0.3;
  sceneTreatment(d, R, th, { dim, blur: r.num('rel.sceneBlur', 0) });
}

/* ---------------- 容器 ---------------- */

/** orn：容器面板的饰件占位（M12a-08，ornamentInsets；没画面板、lay.ornamentInset = none 时全 0）——inner 已按细饰带内缩，页头与按钮行再避开 corners / marks */
/** pin（M12a-15）：挂点卡片挂的世界点钉到哪（卡外下沿），模板里挂在同一点上的元素画在那里 */
interface Box0 { outer: Rect; inner: Rect; ink?: string; after?: () => void; hotspots?: { label: string; rect: Rect }[]; artBg?: boolean; orn: OrnamentInsets; pin?: { a: Attach; x: number; y: number };
  /**
   * 对话框版式（cmp.dialogBox 的新取值，M12b-21）：画了哪一种、对话框本身（box；有容器时 = outer，叠加模板上 outer 是整个画面）、独立头像框（splitPortrait）的矩形、
   * 框里给选项留的区（choices：顶部框 / 头像分框，选项单独排进这一块，B9 审查修复 ④）
   */
  dlg?: { kind: string; box: Rect; portrait?: Rect; choices?: Rect;
    /** 对话框在容器里（dlgInside：通栏细框放在有面板的弹窗 / 窗口里，R4 回归修复 C1 ③）：box 先是外框，screenPass 排好页头与按钮行后换成内框底边那一条 */
    inside?: boolean };
  /** 骑在容器边上的耳标（ast.earTabAt，M12b-49）画出的矩形：drawScreen 登记进帧占位表（kind template，sub ear） */
  ear?: Rect | null;
  /** 双窗停靠的停靠窗（lay.container = windowPair，M12b-11）：面板已画，内容由 screenPass 画 */
  dock?: Rect;
  /** 内容所在的那张纸（场景容器 = 书时装内容的那一页，B8 审查修复 ㉑：翻页角画在它的角上）；没有时翻页角画在容器外框的角上 */
  page?: Rect }

/** 主容器面板：饰件作用范围 = 只画主面板（ast.ornamentScope = templatePanels）时只有它带饰件（M12a-07） */
const asContainer = (e: ElCtx): Partial<BoxStyle> => ({
  ...(e.t.panel.ornament ? { ornament: { ...e.t.panel.ornament, container: true } } : {}),
  // 图案只铺标题带（vis.patternArea = header，M12b-42）：主容器的标题带 = 页头行高 + 上边距
  ...(e.t.panel.overlay?.area === 'header' ? { overlay: { ...e.t.panel.overlay, header: headerRowH(e) + e.k * 16 } } : {}),
});

/** 容器的宽高比（lay.panelAspect，M12a-38）：宽 ÷ 高；auto / fullHeight 不是比例（null） */
const PANEL_ASPECT: Record<string, number> = { square: 1, portrait: 0.62, '4x3': 4 / 3, '3x4': 3 / 4 };
/** 宽高比 a 的框在 box 里能放多大（contain），居中 */
function aspectBox(box: Rect, a: number): Rect {
  const w = Math.min(box.w, box.h * a), h = w / a;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
/**
 * 容器的竖向位置（lay.vAlign，M12a-38）：top / center / bottom 在 [上边距, 下边距] 之间放；auto = def（各容器原来的：弹窗居中、抽屉贴顶、托盘贴底）
 */
function vAlignY(r: Theme['r'], lo: number, hi: number, h: number, def: 'top' | 'center' | 'bottom'): number {
  const v0 = r.str('lay.vAlign', 'auto'), v = v0 === 'top' || v0 === 'center' || v0 === 'bottom' ? v0 : def;
  return v === 'top' ? lo : v === 'bottom' ? hi - h : lo + (hi - lo - h) / 2;
}

/**
 * chrome = false（M12a-25）：叠加 / 横幅 / 无容器的模板不画面板（横幅也不铺暗条）；叠加 / 无容器时外框 = 整个画面（元素与局内 HUD 排法一样），内框只留画面边距、不再加留白。
 * 容器几何（M12a-38）：lay.panelAspect（弹窗 / 全屏页按比例取框：square / portrait / 4x3 / 3x4 放进画面里最大的那个框再按 lay.panelSize 缩，fullHeight = 满高竖栏、宽按 lay.panelSize）、
 * lay.vAlign（竖向位置）、托盘 / 底部浮层的宽 = 画面宽 × lay.panelSize（给了时，不足全屏时水平居中；原来固定全宽、panelSize 只管高）、
 * lay.drawerFlush（抽屉贴右缘、上沿让出 flow.chrome 顶栏、通到底，不留四周边距）；fit = lay.panelFit = fitContent 时测出来的容器尺寸（drawScreen 的测量阶段，见 fitScreen）
 */
function container(d: DrawCtx, e: ElCtx, R: Rect, th: Theme, chrome = true, noPanel = false, fit?: { w: number; h: number }, yieldTo: Rect[] = []): Box0 {
  const r = th.r, S = (n: number) => n * e.k;
  // 场景容器（书、笔记本、手机……）沿用 M3.5 的画法
  const kind = r.str('ast.container', 'none');
  if (kind && kind !== 'none' && kind !== 'auto') {
    const c = drawContainerFor(d, R, th);
    if (c.framed) {
      // 位图容器（书桌、线索墙）：内容区在图里空着的那块，垫一块面板再排内容
      panel(e, c.content, false, asContainer(e));
      const pad = Math.max(S(14), Math.min(c.content.w, c.content.h) * 0.035), orn = containerOrn(e, c.content, R);
      return { outer: c.content, inner: padded(c.content, pad, orn), ink: c.ink, after: c.after, hotspots: c.hotspots, orn, ...(c.page ? { page: c.page } : {}) };
    }
    return { outer: c.content, inner: c.content, ink: c.ink, after: c.after, orn: NO_ORNAMENT_INSETS, ...(c.page ? { page: c.page } : {}) };
  }
  const how = r.str('lay.container', 'modal');
  const ps = r.has('lay.panelSize') ? Math.max(0.1, Math.min(1, r.num('lay.panelSize', 0.6))) : -1;
  // 宽 / 高分设（lay.panelWidth / lay.panelHeight，M12b-64 ⑦，审查修复 A · D13）：没给时 = lay.panelSize（原来宽高共用一个数）
  const pw = sizeOr(r, 'lay.panelWidth', ps), ph = sizeOr(r, 'lay.panelHeight', ps);
  let anchorPin: Box0['pin'];
  let dockR: Rect | null = null;
  const m = Math.max(S(20), Math.min(R.w, R.h) * 0.03);
  const pa = r.str('lay.panelAspect', 'auto'), asp = PANEL_ASPECT[pa];
  const full: Rect = { x: R.x + m, y: R.y + m, w: R.w - m * 2, h: R.h - m * 2 };
  // 测出来的尺寸（fitContent）：夹在 [200 × 100, 画面 − 边距] 里
  const fitW = (w: number, max = full.w) => (fit ? Math.max(Math.min(S(200), max), Math.min(max, fit.w)) : w);
  const fitH = (h: number, max = full.h) => (fit ? Math.max(Math.min(S(100), max), Math.min(max, fit.h)) : h);
  let outer: Rect;
  switch (how) {
    case 'fullscreen': {
      // 全屏页按比例（M12a-38：Obra Dinn 满高近方的纸页、两侧留深色竖条）：画面里最大的那个比例框
      const b = asp ? aspectBox(full, asp) : full, w = fitW(b.w), h = fitH(b.h);
      outer = { x: R.x + (R.w - w) / 2, y: fit || asp ? vAlignY(r, full.y, full.y + full.h, h, 'center') : full.y, w, h };
      break;
    }
    case 'drawer': {
      // 贴边抽屉（lay.drawerFlush，M12a-38）：贴右缘、上沿让出 flow.chrome 顶栏、通到底（Civ6 的生产抽屉）
      const flush = r.bool('lay.drawerFlush'), ct = flush ? chromeTop(e) : 0;
      // 抽屉的高原来总是满高：lay.panelHeight 显式给了才按它
      const w = fitW(R.w * (pw > 0 ? pw * 0.6 : 0.4)), lo = flush ? R.y + ct : R.y + m, hi = flush ? R.y + R.h : R.y + R.h - m, h = fitH(sizeOr(r, 'lay.panelHeight', -1) > 0 ? (hi - lo) * ph : hi - lo, hi - lo);
      // 从左边滑出（lay.drawerSide = left，M12b-16，dont-starve#27：制作弹层从左侧页签列旁向右展开）；没选 = 原来的右边
      const leftD = pickedStr(e, 'lay.drawerSide', 'right') === 'left';
      outer = { x: leftD ? (flush ? R.x : R.x + m) : flush ? R.x + R.w - w : R.x + R.w - w - m, y: vAlignY(r, lo, hi, h, 'top'), w, h };
      break;
    }
    case 'sheet': case 'tray': {
      // 宽 = 画面宽 × lay.panelSize（M12a-38：给了时；不足全屏时水平居中——Stardew 文字框 + 头像框约半屏宽），高仍按 panelSize
      const psl = r.src('lay.panelSize')?.layer, psSet = (ps > 0 && !!psl && psl !== 'default' && psl !== 'fallback') || sizeOr(r, 'lay.panelWidth', -1) > 0;
      const h = fitH(R.h * (ph > 0 ? ph * 0.6 : 0.34)), w = fitW(psSet ? Math.min(R.w - m * 2, R.w * pw) : R.w - m * 2);
      outer = { x: panelX(r, R, m, w), y: vAlignY(r, R.y + m, R.y + R.h - m, h, 'bottom'), w, h };
      break;
    }
    case 'banner': { const h = Math.max(S(90), R.h * (ph > 0 ? ph * 0.4 : 0.16)); outer = { x: R.x, y: R.y + R.h * 0.3, w: R.w, h }; break; }
    case 'windowPair': {
      // 双窗停靠（M12b-11，factorio#32）：两个窗口同高、左右贴靠，整组在画面里居中（宽高按 lay.panelWidth / panelHeight，没给时 0.94 × 0.84）；
      // 主窗口在右（模板的页头 / 数据 / 按钮都在它里面）、停靠窗在左占 38%
      const gw = Math.min(full.w, R.w * (sizeOr(r, 'lay.panelWidth', -1) > 0 ? pw : 0.94)), gh = fitH(Math.min(full.h, R.h * (sizeOr(r, 'lay.panelHeight', -1) > 0 ? ph : 0.84)));
      // 两块窗口之间的间距（lay.windowGap，M12b-17，into-the-breach#9：简报面板与棋盘预览是分开的两块）：没给 = 原来贴靠（10）
      const wg = chosen(e, 'lay.windowGap') ? pxParam(r, 'lay.windowGap') : null;
      const gx = R.x + (R.w - gw) / 2, gy = vAlignY(r, full.y, full.y + full.h, gh, 'center'), dw = gw * 0.38, gp = wg ?? S(10);
      dockR = { x: gx, y: gy, w: dw - gp / 2, h: gh };
      outer = { x: gx + dw + gp / 2, y: gy, w: gw - dw - gp / 2, h: gh };
      break;
    }
    case 'panels': {
      // 多块独立面板（M12b-51 收 into-the-breach#9：ITB 布阵页右下的「自定义小队」与左下的「时间旅行者」是两块各自锚着的面板）：
      // 主窗口（模板的页头 / 数据 / 按钮在它里面）锚在 lay.panelAlign 那一侧（auto = end 右）、竖向 lay.vAlign（auto = bottom），宽高 lay.panelWidth / panelHeight（auto 0.46 × 0.6）；
      // 第二块（停靠窗，内容 lay.dockContent，auto = detail）锚在另一侧、与主窗口底边对齐，宽 0.3、高 = min(主窗口, 0.42 屏高)；放不下（< 120）时只有主窗口
      const left = r.str('lay.panelAlign', 'auto') === 'start';
      const w = Math.min(full.w * 0.62, R.w * (sizeOr(r, 'lay.panelWidth', -1) > 0 ? pw : 0.46)), h = fitH(Math.min(full.h, R.h * (sizeOr(r, 'lay.panelHeight', -1) > 0 ? ph : 0.6)));
      const y = vAlignY(r, full.y, full.y + full.h, h, 'bottom');
      outer = { x: left ? full.x : full.x + full.w - w, y, w, h };
      const dw = Math.min(R.w * 0.3, full.w - w - S(24)), dh = Math.min(h, R.h * 0.42);
      if (dw > S(120)) dockR = { x: left ? full.x + full.w - dw : full.x, y: y + h - dh, w: dw, h: dh };
      break;
    }
    case 'overlay': case 'none': outer = chrome ? { x: R.x + m, y: R.y + m, w: R.w - m * 2, h: R.h - m * 2 } : { ...R }; break;
    case 'anchoredCard': {
      // 挂点卡片（M12a-15，Dead Cells 的拾取卡）：小卡挂在世界点（elx.attachTo，没给时兴趣点 = 掉落物）上方，宽约画面 1/4（lay.panelSize 给了按它），夹紧在画面里
      const at0 = String(r.el('el.screen', 'attachTo') ?? 'none'), at = (['player', 'target', 'poi', 'held', 'cursor'].includes(at0) ? at0 : 'poi') as Attach;
      const p = attachPoint(e, at);
      // fitContent（M12a-38）时卡片按内容定高（B8 留下的：记录比卡片高时截掉）
      const w = Math.min(R.w - m * 2, Math.max(S(240), R.w * (pw > 0 ? pw * 0.6 : 0.26))), h = fitH(Math.min(R.h - m * 2, Math.max(S(150), R.h * (ph > 0 ? ph * 0.7 : 0.36))));
      const x = Math.max(R.x + m, Math.min(R.x + R.w - m - w, p.x - w / 2)), y = Math.max(R.y + m, Math.min(R.y + R.h - m - h, p.y - S(46) - S(8) - h));
      outer = { x, y, w, h };
      anchorPin = { a: at, x: x + w / 2, y: y + h + S(38) };
      break;
    }
    default: {
      const kw = pw > 0 ? pw : 0.62, kh = ph > 0 ? ph : 0.62;
      let w = Math.max(S(300), R.w * (0.28 + kw * 0.6)), h = Math.max(S(170), R.h * (0.22 + kh * 0.62));
      // 宽高比（lay.panelAspect，M12a-38）：画面里最大的那个比例框 × lay.panelSize（0.22 + 0.78 × panelSize，没给时 0.7）；fullHeight = 满高、宽按 panelSize（原来的宽）
      if (pa === 'fullHeight') h = full.h;
      else if (asp) { const b = aspectBox(full, asp), f = ps > 0 ? 0.22 + ps * 0.78 : 0.7; w = b.w * f; h = b.h * f; }
      w = fitW(Math.min(w, full.w)); h = fitH(Math.min(h, full.h));
      outer = { x: panelX(r, R, m, w), y: vAlignY(r, full.y, full.y + full.h, h, 'center'), w, h };
      if (!fit && !asp && pa !== 'fullHeight' && r.str('lay.vAlign', 'auto') === 'auto') outer.y = R.y + (R.h - outer.h) / 2;
    }
  }
  // 对话框版式（cmp.dialogBox 的新取值，M12b-21）：对话类模板按版式定位置与大小。B9 审查修复 ② / ⑯：原来只认托盘 / 底部浮层 / 抽屉，弹窗 / 窗口 / 横幅 / 叠加容器上
  // 新取值什么新东西都不画（字幕元素还丢了底条）；现在除全屏页 / 挂点卡片 / 双窗外的容器都按版式画（叠加模板没有容器面板，对话框自己画一块）。
  // 选项（el.choices 在容器里排）与顶部框 / 头像分框放在一起时，框先按选项的尺寸长高、留出选项区（审查修复 ④：原来框缩小了、选项照旧锚在框里，台词压在选项上）
  // 通栏细框放在有面板的弹窗 / 窗口里（dlgInside，R4 回归修复 C1 ③，into-the-breach#41）：容器照常（面板、插画、标题带、主体都在里面），细框由 screenPass 排在容器内框底边；
  // 原来外框换成贴画面底的通栏条，居中的插画面板与标题带都没了
  const dk0 = DLG_HOW.has(how) ? dialogBoxOf(e) : '', dkIn = dk0 === 'framedBox' && dlgInside(r, chrome);
  const dk = dkIn ? '' : dk0, dlg = dk ? dialogOuter(e, R, m, dk, outer, dialogChoicesSize(d, e, th, R, dk)) : null;
  if (dlg) outer = dlg.outer;
  // 给钉在屏幕上的元素让位（M12b-64 ① containerYield）：抽屉 / 全屏页 / 托盘 / 底部浮层收掉压进来的那一边
  if (yieldTo.length && ['drawer', 'fullscreen', 'tray', 'sheet'].includes(how)) outer = yieldRect(outer, yieldTo, S(8), 0.6);
  // 挂在容器外沿的页签（cmp.tabMount = outsideTop / bookmark，M12b-16）：容器离画面边不够挂一排页签时，从那一边收进来让出位置（选了才收）
  const mnt = chrome ? pickedStr(e, 'cmp.tabMount', 'none') : 'none', nv = r.str('lay.nav', 'none');
  if (mnt === 'outsideTop' && nv === 'tabsTop') { const need = Math.max(S(34), tap(e)) + S(4) - (outer.y - R.y); if (need > 0) outer = { ...outer, y: outer.y + need, h: outer.h - need }; }
  // 容器外侧的缩略图列（lay.sideThumbs，M12b-31）：从那一边让出一列缩略图（+ 说明卡的位置）
  // 容器外侧的附属按钮列（lay.sideButtons，M12b-17）同样从那一边让出一列；两列在同一边时让出两列之和、按钮列排在缩略图列外面，最外一列离画面边留 m
  // （B9 审查修复 ㉗：原来只让出宽的那一列，两列叠在一起，缩略图列贴着画面边）
  const sth = chrome ? pickedStr(e, 'lay.sideThumbs', 'none') : 'none', sbt = chrome ? pickedStr(e, 'lay.sideButtons', 'none') : 'none';
  for (const side of ['left', 'right'] as const) {
    const bw = (sth === side ? sideThumbsW(e) : 0) + (sbt === side ? sideButtonsW(e) : 0);
    if (!bw) continue;
    const need = bw + m - (side === 'right' ? R.x + R.w - outer.x - outer.w : outer.x - R.x);
    if (need > 0) outer = side === 'right' ? { ...outer, w: outer.w - need } : { ...outer, x: outer.x + need, w: outer.w - need };
  }
  if (mnt === 'bookmark' && (nv === 'tabsRight' || nv === 'tabsLeft')) {
    const bw = Math.max(S(30), Math.max(S(40), tap(e)) * 0.8) + S(10);
    if (nv === 'tabsRight') { const need = bw - (R.x + R.w - outer.x - outer.w); if (need > 0) outer = { ...outer, w: outer.w - need }; }
    else { const need = bw - (outer.x - R.x); if (need > 0) outer = { ...outer, x: outer.x + need, w: outer.w - need }; }
  }
  // noPanel（M12a-37）：分区各自画面板（perRegion / separate 分栏），总框不画，与无框浮空一样
  const floating = r.str('cmp.modal', 'standard') === 'floating' || noPanel;
  const framed = chrome && !floating && how !== 'overlay' && how !== 'none' && how !== 'banner';
  // 对话框版式（M12b-21）：顶部羽化框 / 多边形框 / 头像分框……由 dialogPanel 画（尾巴 cmp.dialogTail 也在那里）；叠加 / 横幅 / 无容器（chrome = false 的叠加模板）也画（B9 审查修复 ②）
  if (dlg && !floating) dialogPanel(e, R, outer, dk, dlg.portrait);
  if (chrome && !floating && how !== 'overlay' && how !== 'none' && !dlg) {
    if (how === 'banner') { d.ctx.fillStyle = withAlpha('#000', 0.6); d.ctx.fillRect(outer.x, outer.y, outer.w, outer.h); }
    // 对话类模板的容器面板是对白框部件 dialog（M12a-23：col.surface@dialog……；没有作用域键时就是原来的面板）
    else {
      panel(dialogueLike(r) ? e.part('dialog') : e, outer, false, asContainer(e));
      // 原来的对白框（bar / bubble 一类）也认 cmp.dialogTail（选过才画；没选 = 原来的，不多一次调用）
      if (dialogueLike(r)) dialogTail(e, R, outer, 'bar');
    }
    // 停靠窗的面板（同一套面板，不带容器饰件）
    if (dockR) panel(e, dockR, false);
    // 两块窗口之间的连线（lay.windowLink，M12b-17，into-the-breach#22：简报面板 ↔ 棋盘预览的折角线）：停靠窗右沿中点 → 主窗口左沿中点
    const wl = dockR ? pickedStr(e, 'lay.windowLink', 'none') : 'none';
    if (dockR && (wl === 'line' || wl === 'elbow')) drawConnector(e, [dockR.x + dockR.w, dockR.y + dockR.h * 0.35], [outer.x, outer.y + outer.h * 0.6], wl === 'elbow' ? 'elbow' : 'straight', { color: e.accent, width: Math.max(1.5, S(2)) });
  }
  // 选项区夹进最后的外框（外框在 dialogOuter 之后还可能给钉在屏幕上的元素 / 外挂页签让位）
  const dch = dlg?.choices ? clampRect(dlg.choices, outer) : null;
  const dlgOut = dlg ? { dlg: { kind: dk, box: outer, ...(dlg.portrait ? { portrait: dlg.portrait } : {}), ...(dch && dch.w > 0 && dch.h > 0 ? { choices: dch } : {}) } } : dkIn ? { dlg: { kind: dk0, box: outer, inside: true } } : {};
  if (!chrome && (how === 'overlay' || how === 'none' || dlg)) {
    // 叠加模板（chrome = false）上的对话框版式：内框是对话框的内框（台词画在里面），外框仍是整个画面（其余元素照原来在整屏排，不挤进对话框）
    if (dlg) return { outer: { ...R }, inner: padded(outer, Math.max(S(18), Math.min(outer.w, outer.h) * 0.035), NO_ORNAMENT_INSETS), orn: NO_ORNAMENT_INSETS, ...dlgOut };
    return { outer, inner: { x: R.x + m, y: R.y + m, w: R.w - m * 2, h: R.h - m * 2 }, orn: NO_ORNAMENT_INSETS };
  }
  const pad = how === 'banner' ? S(16) : Math.max(S(18), Math.min(outer.w, outer.h) * 0.035);
  const orn = framed ? containerOrn(e, outer, R) : NO_ORNAMENT_INSETS;
  // 耳标（ast.earTabAt，M12b-49，frostpunk#17）：骑在容器顶边 / 右边上的小签，页头与按钮行避开它（并进饰件占位的 marks）
  const ear = framed ? earTab(e, outer) : null;
  const orn2 = ear ? { ...orn, marks: [...orn.marks, ear] } : orn;
  return { outer, inner: padded(outer, pad, orn2), orn: orn2, ...(anchorPin ? { pin: anchorPin } : {}), ...(ear ? { ear } : {}), ...(dockR ? { dock: dockR } : {}), ...dlgOut };
}

/* ---------------- 对话框版式库（M12b-21） ---------------- */
/**
 * cmp.dialogBox 的新取值（对话类模板放在托盘 / 底部浮层 / 抽屉里时，按 @dialog → 全局读，选过才换；旧皮肤只认皮肤之后的层）：
 *   offsetBox 偏移框（宽 50%、水平位置躲开 lay.focalSide 那一侧的立绘，左端压在立绘右缘上，hades#27）/ framedBox 通栏细框（贴画面底、近通栏 + 左边方形头像槽，into-the-breach#14）/
 *   topBox 顶部框（上方居中、宽 = lay.panelSize（没给 0.5）、近黑羽化底 + 上下对称花线、多行居中、不写名牌，hollow-knight#31）/
 *   splitPortrait 头像分框（文字框 + 等高独立头像框 + 头像框下一条名签，三件一组居中，头像框在 lay.focalSide 那一侧，stardew#16）/
 *   transcript 累积日志（右侧通高一栏：多段「说话人 — 台词」从选项往上堆，说话人走展示字体，disco-elysium#34；lay.focalSide = followLine 时当前说话人的小像贴在栏外、与最新一段同高，#36）/
 *   codec 通讯框（左右两个头像 + 正中频率读数，台词在中间）/ polygon 多边形框（外形 = vis.panelShape@dialog，没选时不规则四边形；没有描边时一道粗正文色描边；名签斜贴左上角，persona5#4）
 */
const DLG_NEW = DLG_BOXES;
/** 对话框版式在哪些容器上画（B9 审查修复 ②：原来只有托盘 / 底部浮层 / 抽屉）：全屏页、挂点卡片、双窗不换版式 */
const DLG_HOW = new Set(['tray', 'sheet', 'drawer', 'modal', 'window', 'banner', 'overlay', 'none']);
/** 自带头像槽的版式：人物主体不另画站姿（头像槽里就是说话人） */
const DLG_PORTRAIT = new Set(['splitPortrait', 'framedBox', 'codec']);
/**
 * 通栏细框（framedBox）排在容器里的条件（R4 回归修复 C1 ③，into-the-breach#41）：有面板的弹窗 / 窗口（cmp.modal 不是 floating / perRegion）——细框贴容器内框底边、容器照常；
 * 叠加 / 横幅 / 无容器 / 托盘 / 底部浮层 / 抽屉照原来贴画面底。Godot：细框 = 面板 VBox 最下面一个 PanelContainer（头像 TextureRect + RichTextLabel）
 */
const dlgInside = (r: Theme['r'], chrome: boolean) => chrome && ['modal', 'window'].includes(r.str('lay.container', 'modal')) && !['floating', 'perRegion'].includes(r.str('cmp.modal', 'standard'));
/** 这一屏的对话框版式（对话类模板才有；没选 / 老取值 = ''） */
function dialogBoxOf(e: ElCtx): string {
  if (!dialogueLike(e.r)) return '';
  const v = pickedStr(e.part('dialog'), 'cmp.dialogBox', '');
  return DLG_NEW.has(v) ? v : '';
}
/** a 夹进 b（相交部分；不相交时宽 / 高为 0） */
const clampRect = (a: Rect, b: Rect): Rect => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y); return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) }; };
/** 顶部框 / 头像分框要给选项留的区（B9 审查修复 ④）：选项（el.choices）排在容器里时它的尺寸；别的版式 / 没有选项 = null */
function dialogChoicesSize(d: DrawCtx, e: ElCtx, th: Theme, R: Rect, dk: string): { w: number; h: number } | null {
  // 偏移框 / 多边形框（终期审查修复 ㉓）：同样给选项单独留一块（台词下面），台词整宽写
  if (dk !== 'topBox' && dk !== 'splitPortrait' && dk !== 'offsetBox' && dk !== 'polygon') return null;
  const r = e.r;
  if (!r.elements().includes('el.choices') || anchorSpaceOf(r, 'el.choices') !== 'inherit' || !ELEMENTS.has('el.choices')) return null;
  return ELEMENTS.get('el.choices')!.size(makeCtx('el.choices', e.g, d.t ?? e.g, th, R));
}
/** 对话框版式的外框（与独立头像框、选项区）：m = 画面边距；ch = 要留的选项区尺寸（dialogChoicesSize） */
function dialogOuter(e: ElCtx, R: Rect, m: number, kind: string, outer: Rect, ch: { w: number; h: number } | null = null): { outer: Rect; portrait?: Rect; choices?: Rect } {
  const S = (n: number) => n * e.k, r = e.r, fs = r.str('lay.focalSide', 'left'), right = fs === 'right';
  const lh = LH(e, { ...e.base, size: e.base.size * 1.15 }, 1.6), head = headerRowH(e);
  // 底部那一排视觉小说控件（ix.skip = vnControls 且不在右上，skipControl 画在画面底边以上 16–40）：贴底的版式让出这一条（B9 审查修复 ②：叠加的 Persona 对话框原来压在「自动 / 快进」上）
  const vnB = r.str('ix.skip', 'none') === 'vnControls' && r.str('ix.skipAnchor', 'tr') !== 'tr' ? S(46) : 0, mb = Math.max(m, vnB);
  switch (kind) {
    case 'offsetBox': case 'polygon': {
      // 高贴两行字 + 页头行（名牌）；水平位置躲开立绘那一侧：立绘在左时从画面 36% 起，在右时到画面 86% 止（hades#27）
      const w = R.w * (kind === 'polygon' ? 0.52 : 0.5), x = right ? R.x + R.w * 0.14 : R.x + R.w * 0.36, h0 = Math.max(S(110), head + lh * 2 + S(28));
      if (!ch) return { outer: { x, y: R.y + R.h - mb - h0, w, h: h0 } };
      // 框里有选项时（终期审查修复 ㉓）：选项排在台词下面单独一块（与顶部框同一套 dlg.choices），台词整宽写在上面、框往上长出选项区——
      // 原来选项挤在半屏宽的框里，台词只剩选项左边 120 宽的一列，三行的台词只画出第一行（后面的行直接丢掉）
      const h = Math.min(R.h - mb - m, h0 + ch.h + S(10)), o = { x, y: R.y + R.h - mb - h, w, h }, cw = Math.min(ch.w, w - S(48));
      return { outer: o, choices: { x: o.x + (w - cw) / 2, y: o.y + h0 - S(12), w: cw, h: Math.min(ch.h, o.y + h - S(16) - (o.y + h0 - S(12))) } };
    }
    case 'framedBox': { const h = Math.max(S(118), R.h * 0.24); return { outer: { x: R.x + S(8), y: R.y + R.h - h - Math.max(S(8), vnB), w: R.w - S(16), h } }; }
    case 'topBox': {
      // 有选项时框往下长出选项区：台词在上、选项居中排在台词下面（Hollow 的对话没有选项时与原来一样高）
      const ps = sizeOr(r, 'lay.panelWidth', sizeOr(r, 'lay.panelSize', 0.5)), w = R.w * ps, h0 = Math.max(S(96), lh * 3 + S(40)), h = Math.min(R.h - m * 2, h0 + (ch ? ch.h + S(10) : 0));
      const o = { x: R.x + (R.w - w) / 2, y: R.y + m, w, h }, cw = ch ? Math.min(ch.w, w - S(48)) : 0;
      return { outer: o, ...(ch ? { choices: { x: o.x + (w - cw) / 2, y: o.y + h0 - S(12), w: cw, h: Math.min(ch.h, o.y + h - S(16) - (o.y + h0 - S(12))) } } : {}) };
    }
    case 'splitPortrait': {
      // 文字框（约半屏宽）+ 等高独立头像框，三件一组居中；头像框在 lay.focalSide 那一侧（没选 = 右，Stardew）。
      // 有选项时文字框往上长出选项区（Stardew 的回答列在问题下面、框里），头像框跟着等高、宽不变
      const h0 = Math.max(S(128), R.h * 0.27), h = Math.min(R.h - m * 2 - S(18), h0 + (ch ? ch.h + S(8) : 0)), pw = h0 * 0.92, gp = S(10), tw = Math.min(R.w * 0.5, R.w - pw - gp - m * 2), x0 = R.x + (R.w - tw - gp - pw) / 2, pl = fs === 'left' && chosen(e, 'lay.focalSide');
      const y = R.y + R.h - Math.max(m + S(18), vnB) - h, tx = pl ? x0 + pw + gp : x0, cw = ch ? Math.min(ch.w, tw - S(36)) : 0;
      const choices = ch ? { x: tx + S(18), y: y + h - S(14) - Math.min(ch.h, h - S(14) - lh * 1.5), w: cw, h: Math.min(ch.h, h - S(14) - lh * 1.5) } : undefined;
      return { outer: { x: tx, y, w: tw, h }, portrait: { x: pl ? x0 : x0 + tw + gp, y, w: pw, h }, ...(choices ? { choices } : {}) };
    }
    case 'transcript': { const w = Math.max(S(300), R.w * 0.34); return { outer: { x: R.x + R.w - w - m, y: R.y + m, w, h: R.h - m - mb } }; }
    case 'codec': { const w = R.w * 0.8, h = Math.max(S(128), R.h * 0.28); return { outer: { x: R.x + (R.w - w) / 2, y: R.y + R.h - mb - h, w, h } }; }
    default: return { outer };
  }
}
/**
 * 画对话框版式的面板（container() 调）：topBox = 近黑上下羽化底 + 上下对称花线（饰色，母题跟 vis.motif）；polygon = 外形面板（+ 粗描边）；splitPortrait = 文字框 + 独立头像框；
 * 其余 = 对白框部件的面板。之后画尾巴（cmp.dialogTail：smooth 圆弧 / zigzag 锯齿闪电 / spike 尖刺，指向 lay.focalSide 那一侧的立绘，topBox / transcript 不画）
 */
function dialogPanel(e0: ElCtx, R: Rect, o: Rect, kind: string, portrait?: Rect) {
  const e = e0.part('dialog'), g = e.g, S = (n: number) => n * e.k, motif = e.t.panel.ornament?.motif ?? 'none';
  if (kind === 'topBox') {
    g.save(); g.fillStyle = fadePaint(g, o, 'vertical', 0.28, 'rgba(6,6,9,0.9)'); g.fillRect(o.x, o.y, o.w, o.h); g.restore();
    const c = ornColor(e), w = Math.min(o.w * 0.62, S(320));
    g.save(); g.fillStyle = c; g.strokeStyle = c;
    for (const y of [o.y + S(10), o.y + o.h - S(10)]) { divider(g, o.x + o.w / 2 - w / 2, o.x + o.w / 2 + w / 2, y, 'glyph', motif !== 'none' ? motif : 'diamond', c); }
    g.restore();
    return;
  }
  if (kind === 'polygon') {
    const shape = e.t.panel.shape ?? 'randomQuad', bd = e.t.panel.border ?? { width: Math.max(2, S(3)), color: e.text };
    panel(e, o, false, { ...asContainer(e0), shape, ...(e.t.panel.shape ? {} : { shapeJitter: 0.07 }), border: bd, radius: undefined, radiusPct: undefined, chamfer: undefined } as Partial<BoxStyle>);
  } else panel(e, o, false, asContainer(e0));
  if (portrait) {
    panel(e, portrait, false, { ornament: undefined });
    portraitBox(e, { x: portrait.x + S(8), y: portrait.y + S(8), w: portrait.w - S(16), h: portrait.h - S(16) });
    // 名签压在头像框下沿（cmp.plate@name，没选时卷轴头 scrollHead；Stardew 的卷轴名签）
    const who = spokenLine(e.r).who, nh = S(24), nw = Math.min(portrait.w + S(24), W(e, who, e.name) + S(40));
    if (who) plate(e, { x: portrait.x + portrait.w / 2 - nw / 2, y: portrait.y + portrait.h - nh * 0.4, w: nw, h: nh }, who, platePick(e, 'name', 'scrollHead'), {}, 'name');
  }
  dialogTail(e, R, o, kind);
}
/** 尾巴（cmp.dialogTail，M12b-21，persona5#11）：从框靠立绘那一侧的下沿伸向立绘（lay.focalSide 的站位；没有立绘时朝下） */
function dialogTail(e: ElCtx, R: Rect, o: Rect, kind: string) {
  const tk = pickedStr(e.part('dialog'), 'cmp.dialogTail', 'none');
  if (tk === 'none' || kind === 'topBox' || kind === 'transcript') return;
  const g = e.g, S = (n: number) => n * e.k, fs = e.r.str('lay.focalSide', 'left'), right = fs === 'right';
  const st = standRect(R, right ? 'right' : 'left'), tx = right ? st.x + st.w * 0.25 : st.x + st.w * 0.75, ty = st.y + st.h * 0.28, w0 = S(26), ins = S(2);
  const fill = e.t.panel.bg && 'solid' in e.t.panel.bg ? resolveColor(e.t.panel.bg.solid, e.pal) : resolveColor(e.th.surface, e.pal);
  // 多边形框没有描边时 dialogPanel 补一道粗正文色描边，尾巴同一道
  const bd = e.t.panel.border ?? (kind === 'polygon' ? { width: Math.max(2, S(3)), color: e.text } : undefined);
  // 尾根落在框朝向立绘的那条边上（B9 审查修复 ㉓：原来总在下沿、尖端至少往下 16，尾巴戳进画面底边、不指向人）：框中心到目标的方向横向占比大取左 / 右边，否则取上 / 下边；
  // 根宽 26、往框里收 2（盖住那一截框边）
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2, side = Math.abs(tx - cx) / Math.max(1, o.w) > Math.abs(ty - cy) / Math.max(1, o.h) ? (tx < cx ? 'l' : 'r') : ty < cy ? 't' : 'b';
  const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  const bx = side === 'l' ? o.x + ins : side === 'r' ? o.x + o.w - ins : cl(tx, o.x + w0, o.x + o.w - w0);
  const by = side === 't' ? o.y + ins : side === 'b' ? o.y + o.h - ins : cl(ty, o.y + w0, o.y + o.h - w0);
  // 方向与长度：朝立绘的上半身伸，停在目标前 30（至少 28、至多 110）；局部坐标 s 沿尾巴（0 = 根、1 = 尖）、q 横向（× 根宽，法线 = 尾巴自己的方向转 90°）
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, len = Math.max(S(28), Math.min(S(110), L - S(30)));
  const P = (s: number, q: number): [number, number] => [bx + ux * s * len - uy * q * w0, by + uy * s * len + ux * q * w0];
  // 锯齿闪电（Persona 的闪电尾）：左轮廓 根 → 六成处 → 往里折 → 尖，右轮廓 尖 → 四成五处往外折 → 回到五成 → 根（横向折幅约 0.45 根宽）；圆弧 smooth、尖刺 spike
  const pts: [number, number][] = tk === 'zigzag' ? [P(0, -0.5), P(0.6, -0.45), P(0.55, -0.05), P(1, -0.1), P(0.45, 0.45), P(0.5, 0.05), P(0, 0.5)] : tk === 'smooth' ? [] : [P(0, -0.35), P(1, 0), P(0, 0.35)];
  g.save(); g.beginPath();
  if (tk === 'smooth') { const [a0, a1] = P(0, -0.5), [c0, c1] = P(0.5, -0.05), [t0, t1] = P(1, 0), [d0, d1] = P(0.5, 0.2), [b0, b1] = P(0, 0.5); g.moveTo(a0, a1); g.quadraticCurveTo(c0, c1, t0, t1); g.quadraticCurveTo(d0, d1, b0, b1); }
  else pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  // 填充自动闭合；描边只描两条轮廓（根那一截不描，尾巴与框连成一体）
  g.fillStyle = fill; g.fill();
  if (bd && bd.width > 0) { g.strokeStyle = resolveColor(bd.color, e.pal); g.lineWidth = bd.width; g.lineJoin = 'miter'; g.stroke(); }
  g.restore();
}
/**
 * 对话框版式的主体（drawScreen 在对话托盘画台词的那一步调）：framedBox = 左边方形头像槽 + 台词；codec = 左右两个头像 + 正中频率读数 + 台词；topBox = 多行居中的台词 + 底部花饰继续提示；
 * transcript = 累积日志；其余 = 原来的台词。返回继续提示的位置
 */
function dialogBody(e: ElCtx, kind: string, a: Rect, ink: string | undefined, avoid: Rect[]): { x: number; y: number } | null {
  const S = (n: number) => n * e.k;
  switch (kind) {
    case 'framedBox': { const s = Math.min(a.h, S(96)); portraitBox(e, { x: a.x, y: a.y, w: s, h: s }); return dialogueLine(e, { ...a, x: a.x + s + S(14), w: a.w - s - S(14) }, ink, avoid, false, true); }
    case 'codec': {
      const s = Math.min(a.h, S(92)), fo = { ...e.small, weight: 700, spacing: 0.15, color: e.accent }, fq = '140.85';
      portraitBox(e, { x: a.x, y: a.y, w: s, h: s }); portraitBox(e, { x: a.x + a.w - s, y: a.y, w: s, h: s });
      drawNumber(e, fq, a.x + a.w / 2 - numberWidth(e, fq, fo) / 2, a.y, LH(e, fo), fo);
      return dialogueLine(e, { x: a.x + s + S(16), y: a.y + LH(e, fo) + S(4), w: a.w - s * 2 - S(32), h: a.h - LH(e, fo) - S(4) }, ink, avoid, false, true);
    }
    case 'topBox': return dialogueLine(e, { ...a, y: a.y + S(12), h: a.h - S(24) }, ink, avoid, true, true);
    case 'transcript': return transcriptLog(e, a, ink, avoid);
    default: return dialogueLine(e, a, ink, avoid, false, true);
  }
}
/**
 * 累积日志（cmp.dialogBox = transcript，M12b-21，disco-elysium#34 / #36，K1 文字小说栏）：内容包长文段（screens.passage）拆成几句，说话人轮流取角色样本、最后一段是当前台词；
 * 每段「说话人（展示字体、粗体全大写）— 台词」，从栏底（选项上面）往上堆满整栏。lay.focalSide = followLine 时当前说话人的小像贴在栏左外侧、与最新一段同高
 */
function transcriptLog(e: ElCtx, a: Rect, ink: string | undefined, avoid: Rect[]): { x: number; y: number } | null {
  const S = (n: number) => n * e.k, ed = e.part('dialog'), o: TextOpts = { ...ed.base, color: ink ?? ed.text };
  const bottom = Math.min(a.y + a.h, ...avoid.filter((q) => q.y > a.y + a.h * 0.3 && q.x < a.x + a.w && a.x < q.x + q.w).map((q) => q.y - S(12)));
  // 长文按原串拆（R4 C2 ①，disco-elysium#49：原来先 plainText 去掉标记，段首「{c1:逻辑} [[中等：成功]] ——」的类别色与方括号注记在拆条目之前就没了，段首整段画成白色粗体）
  const cur = spokenLine(e.r), chars = samplesFor('characters'), src = pack().screens.passage ?? pack().screens.notice;
  // 按句拆成条目（B9 审查修复 ⑰：原来一句引语被拆给两个说话人、引号不成对）：同一句引语拆开的几条是同一个说话人、各自补齐引号；段首写了检定「技能 [难度：结果] ——」的段落，
  // 说话人就是这个检定（Disco 的技能发言），其余按段落 / 句子轮流取角色样本
  const entries: [string, string][] = [...logEntries(src).slice(0, 5).map((x): [string, string] => [x.tag ?? chars[x.turn % chars.length]?.[1] ?? cur.who, x.text]), [cur.who, cur.line]];
  // 按说话人换字（typ.mix = perSpeaker，M12b-63，K1 G-type-mix：羊皮纸 / 哥特科技的「按说话人切换字体」）：每个说话人一种字，按出场顺序轮着取
  const spk = typeMix(e) === 'perSpeaker' ? [...new Set(entries.map(([w]) => w))] : null, oOf = (who: string): TextOpts => (spk ? { ...o, font: MIX_FONTS()[spk.indexOf(who) % 3] } : o);
  const wo0 = { ...displayFor(ed, 'nameplate'), ...o, weight: 800, upper: true, color: ink ?? ed.text }, lh = LH(ed, o, 1.5), gap = S(10);
  // 自下而上：先量每段的高，从 bottom 往上排，放不下的旧段不画
  const hs = entries.map(([who, l]) => drawRich(ed, `${who} — ${l}`, { x: 0, y: 0, w: a.w, h: Infinity }, { o: oOf(who), lh: 1.5, measureOnly: true }).h);
  let y = bottom, end: { x: number; y: number } | null = null, lastY = bottom;
  for (let i = entries.length - 1; i >= 0; i--) {
    y -= hs[i];
    if (y < a.y) break;
    const [who, l] = entries[i], oi = oOf(who), wo = spk ? { ...wo0, font: oi.font } : wo0, wp = plainText(who), ww = W(ed, `${wp} — `, wo), cur0 = i === entries.length - 1;
    // 段首带标记（检定「{c1:技能} [[难度：结果]]」）时走富文本：hier.inlineMap 的 category = 类别色（col.lineColors）、note = 次要字色的方括号注记；没有标记的说话人照原来一次画
    if (wp !== who) drawRich(ed, who, { x: a.x, y, w: a.w, h: Infinity }, { o: wo, lh: 1.5 });
    else T(ed, who, a.x, y, lh, wo);
    T(ed, ' — ', a.x + W(ed, wp, wo), y, lh, { ...oi, color: withAlpha(oi.color, 0.6) });
    const out = drawRich(ed, l, { x: a.x, y, w: a.w, h: Infinity }, { o: cur0 ? oi : { ...oi, color: withAlpha(oi.color, 0.72) }, lh: 1.5, indent: { lines: 1, w: ww } });
    if (cur0) { end = out.end ? { x: out.end.x + S(14), y: out.end.y + lh / 2 } : null; lastY = y; }
    y -= gap;
  }
  // 当前说话人的小像跟着最新一段（lay.focalSide = followLine）：画在栏外，登记模板占位（审查修复 ⑥）
  if (e.r.str('lay.focalSide', 'left') === 'followLine') { const s = S(64), q = { x: a.x - S(18) - s - S(14), y: Math.max(a.y, lastY - S(4)), w: s, h: s * 1.2 }; portraitBox(e, q); frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'focal' }); }
  return end;
}
/** 对话框版式的说话人名签（没有页头行时）：骑在框的左上沿（cmp.plate@name，没选时页签）；返回画出的矩形（meas = 只量） */
function dialogNameTag(e: ElCtx, box: Rect, meas: boolean): Rect | null {
  const who = spokenLine(e.r).who;
  if (!who) return null;
  const S = (n: number) => n * e.k, en = e.part('name'), nh = Math.max(S(24), LH(en, en.name, 1.3)), nw = W(en, who, en.name) + S(28);
  const q = { x: box.x + S(16), y: Math.max(e.R.y + S(2), box.y - nh * 0.55), w: nw, h: nh };
  if (!meas) plate(e, q, who, platePick(e, 'name', 'tab'), {}, 'name');
  return q;
}
/**
 * 累积日志的条目（transcriptLog）：长文按段落（换行）与句末标点（。！？!?）拆开；引号（“” 「」 『』）里拆开的几句是同一个说话人，各自补上引号（不出现半边引号）；
 * 段首是检定「技能 [难度：结果] ——」时这一段的说话人 = 那个检定（tag），段里的几句都归它；其余每句换一个说话人（turn 递增）。
 * 按原串拆（R4 C2 ①）：段首可以带富文本标记（「{c1:逻辑} [[中等：成功]] ——」，tag 保留标记、由 drawRich 着色），正文里的标记（{k:…} 等）整枚当一个字、不从中间拆开
 */
export function logEntries(src: string): { tag?: string; turn: number; text: string }[] {
  const OPEN = '“「『', CLOSE = '”」』', END0 = /[。！？!?]/, END = { test: (t: string) => t.length === 1 && END0.test(t) }, out: { tag?: string; turn: number; text: string }[] = [];
  const TOK = /\{(?:k|b|d|u|x|c[1-5]):[^{}]*\}|\[\[[^\]]*\]\]|[\s\S]/gu;
  let turn = 0;
  for (const para of src.split('\n').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\{c[1-5]:[^{}]{1,8}\}|\S{1,8})\s*(\[\[[^\]]{1,16}\]\]|\[[^\]]{1,16}\])\s*——\s*/u.exec(para), tag = m ? `${m[1]} ${m[2]}` : undefined, cs = (m ? para.slice(m[0].length) : para).match(TOK) ?? [];
    let cur = '', depth = 0, open = '';
    const push = () => { const t = cur.trim(); if (t) out.push({ ...(tag ? { tag } : {}), turn, text: t }); cur = ''; };
    for (let i = 0; i < cs.length; i++) {
      const ch = cs[i], nx = cs[i + 1] ?? '';
      cur += ch;
      if (OPEN.includes(ch)) { depth++; open = ch; continue; }
      if (CLOSE.includes(ch)) { depth = Math.max(0, depth - 1); if (!depth && END.test(cs[i - 1] ?? '')) { push(); if (!tag) turn++; } continue; }
      if (!END.test(ch) || CLOSE.includes(nx)) continue;
      // 引号里的句末：这一条补右引号，下一条以左引号开头（同一个说话人）；引号外：一句一条
      if (depth) { cur += CLOSE[OPEN.indexOf(open)] ?? ''; push(); cur = open; }
      else { push(); if (!tag) turn++; }
    }
    if (depth && cur.trim() && cur !== open) cur += CLOSE[OPEN.indexOf(open)] ?? '';
    if (cur !== open) push();
    cur = ''; turn++;
  }
  return out;
}


/**
 * 容器外侧的附属按钮列（lay.sideButtons = left / right，M12b-17，stardew#34）：一列小方钮贴着容器左 / 右缘外面（从容器底部往上排：整理 ↻、删除 ✖、筛选 ☰），
 * 次要按钮样式；container() 已经让出这一列的位置。返回画出的矩形（调用方登记占位）
 */
function sideButtons(e: ElCtx, outer: Rect): Rect[] {
  const side = pickedStr(e, 'lay.sideButtons', 'none');
  if (side !== 'left' && side !== 'right') return [];
  // 同一边也有缩略图列时排在它外面
  const S = (n: number) => n * e.k, s = Math.max(S(40), tap(e)), out: Rect[] = [], th = pickedStr(e, 'lay.sideThumbs', 'none') === side ? sideThumbsW(e) : 0;
  ['↻', '✖', '☰'].forEach((gl, i) => {
    const q = { x: side === 'right' ? outer.x + outer.w + th + S(8) : outer.x - th - S(8) - s, y: outer.y + outer.h - s - i * (s + S(8)) - S(12), w: s, h: s };
    if (q.y < outer.y) return;
    // 钮上的符号走图标（icon 字族），不当按钮字（B9 审查修复 ⑫：按钮字可能是展示字族，展示字表里没有 ↻ ✖）
    button(e, q, '', false, false); icon(e, gl, q.x + q.w / 2, q.y + q.h / 2, Math.min(S(22), q.h * 0.5), e.icon); logTarget(e.g, q, gl); out.push(q);
  });
  return out;
}
/** 容器外侧两列各占的宽（含离容器的间距）：缩略图列 = 图 + 两边 5 + 离容器 10，按钮列 = 钮 + 离容器 8 */
const sideThumbsW = (e: ElCtx) => Math.max(e.k * 64, tap(e)) + e.k * 20;
const sideButtonsW = (e: ElCtx) => Math.max(e.k * 40, tap(e)) + e.k * 8;
/**
 * 容器外侧的缩略图列（lay.sideThumbs = left / right，M12b-31，stardew#22：捏人页右侧独立木框里的一竖列农场缩略图）：一块面板里竖排缩略图按钮（灰盒，第一个选中），
 * 第一个旁边一张带标题的说明卡（悬停态的静帧）。返回画出的矩形（调用方登记占位）
 */
function sideThumbs(e: ElCtx, outer: Rect): Rect[] {
  const side = pickedStr(e, 'lay.sideThumbs', 'none');
  if (side !== 'left' && side !== 'right') return [];
  const S = (n: number) => n * e.k, s = Math.max(S(64), tap(e)), n = Math.max(1, Math.min(6, Math.floor((outer.h - S(16)) / (s + S(8))))), col = { x: side === 'right' ? outer.x + outer.w + S(10) : outer.x - S(10) - s - S(10), y: outer.y, w: s + S(10), h: n * (s + S(8)) + S(8) };
  panel(e, col, true);
  const names = samplesFor('locations').map((x) => x[0]), out: Rect[] = [col];
  for (let i = 0; i < n; i++) {
    const q = { x: col.x + S(5), y: col.y + S(8) + i * (s + S(8)), w: s, h: s };
    drawGreybox(e.g, q, names[i % Math.max(1, names.length)]?.slice(0, 2) ?? '', { small: true });
    if (i === 0) { e.g.strokeStyle = e.accent; e.g.lineWidth = 2.5; e.g.strokeRect(q.x, q.y, q.w, q.h); }
    logTarget(e.g, q, names[i % Math.max(1, names.length)] ?? '');
  }
  // 第一个的说明卡（朝容器那一侧）
  const nm = names[0] ?? '', cw = S(150), chh = LH(e, e.title) + LH(e, e.small) * 2 + S(12), cq = { x: side === 'right' ? col.x - cw - S(6) : col.x + col.w + S(6), y: col.y + S(8), w: cw, h: chh };
  panel(e.part('tooltip'), cq, true, {}, 'tooltip');
  T(e, nm, cq.x + S(8), cq.y + S(4), LH(e, e.title), e.title);
  const ds = wrapText(e, plainText(samplesFor('locations')[0]?.[3] ?? ''), cw - S(16), e.small).slice(0, 2);
  ds.forEach((l, i) => T(e, l, cq.x + S(8), cq.y + S(4) + LH(e, e.title) + i * LH(e, e.small), LH(e, e.small), e.small));
  out.push(cq);
  return out;
}
/**
 * RPG 战斗结算（cnt.subtype = rpgSettle，M12b-30，persona5#20）：版面右半一列倾斜的白条（经验、金钱、获得物——黑字粗体、逐条错开），
 * 底部一排队员：头像 + 名字 + 经验条，第一位挂「LEVEL UP」章（徽章 = 强调色斜签）。返回画出的矩形（登记模板占位）。字：金钱用主货币名，获得物用物品样本
 */
function rpgSettle(e: ElCtx, a: Rect): Rect | null {
  const S = (n: number) => n * e.k, g = e.g, p = pack(), [r0] = DATA.res, it = p.menu.items, out: Rect[] = [];
  const rows: [string, string][] = [['EXP', '+1,240'], [r0[1], `+${fmtNumber(e, 320, '320')}`], ...it.slice(0, 2).map(([, n]): [string, string] => [n, '×1'])];
  // 斜条从数据区左起一成处开始（数据区宽不到 480 时从左边起），逐条右错
  const x0 = a.x + (a.w >= S(480) ? a.w * 0.1 : S(4)), rh = Math.max(S(34), LH(e, e.base, 1.9)), ctxs = e.tx === g ? [g] : [g, e.tx];
  // 队员行贴数据区底；底部正中的继续提示（ix.continueCue = keyGlyph / tapText / countdown，画在画面底边以上 28–60）横跨这一行时整行抬到它上面
  const cue = e.r.str('ix.continueCue', 'none'), Rs = e.R, cueTop = ['keyGlyph', 'tapText', 'countdown'].includes(cue) && a.x < Rs.x + Rs.w / 2 + S(90) && Rs.x + Rs.w / 2 - S(90) < a.x + a.w ? Rs.y + Rs.h - S(64) : Infinity;
  const party = DATA.party.slice(0, 4), cw = Math.min(S(170), (a.w - S(24)) / Math.max(1, party.length)), ch = S(56), y = Math.min(a.y + a.h - ch - S(6), cueTop - ch - S(4));
  // 斜条排在队员行（连 LEVEL UP 斜签）以上，最多到数据区的六成二
  rows.forEach(([l, v], i) => {
    const q = { x: x0 + i * S(14), y: a.y + S(8) + i * (rh + S(8)), w: a.x + a.w - x0 - i * S(14), h: rh };
    if (q.y + q.h > Math.min(a.y + a.h * 0.62, y - S(16))) return;
    const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
    for (const c0 of ctxs) { c0.save(); c0.translate(cx, cy); c0.rotate(-0.05); c0.translate(-cx, -cy); }
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(q.x + S(10), q.y); g.lineTo(q.x + q.w, q.y); g.lineTo(q.x + q.w - S(10), q.y + q.h); g.lineTo(q.x, q.y + q.h); g.closePath(); g.fill();
    const lo = { ...e.base, weight: 800, color: '#111' }, vo = { ...e.title, weight: 900, color: e.accent };
    T(e, l, q.x + S(18), q.y, q.h, lo);
    drawNumber(e, v, q.x + q.w - S(18) - numberWidth(e, v, vo), q.y, q.h, vo);
    for (const c0 of ctxs) c0.restore();
    out.push(q);
  });
  // 队员行
  party.forEach(([n, hp], i) => {
    const q = { x: a.x + S(8) + i * (cw + S(8)), y, w: cw, h: ch };
    panel(e, q, true);
    avatar(e, q.x + ch * 0.45, q.y + ch / 2, ch * 0.32, n);
    T(e, n, q.x + ch * 0.9, q.y + S(4), LH(e, e.small), { ...e.small, weight: 700 });
    gaugeOf(e, { x: q.x + ch * 0.9, y: q.y + ch - S(16), w: q.w - ch * 0.9 - S(8), h: S(6) }, 0.35 + hp * 0.6, i, 'bar', { fixed: true, color: e.accent });
    if (i === 0) { const t = 'LEVEL UP', o = { ...e.small, weight: 900, color: onColorOf(e.accent2, resolveColor(e.th.surface, e.pal)) }, w = W(e, t, o) + S(14), bq = { x: q.x + q.w - w + S(6), y: q.y - S(12), w, h: S(20) }; drawBox(g, bq, { bg: { solid: e.accent2 }, skewX: -12 } as BoxStyle, e.pal); T(e, t, bq.x + S(7), bq.y, bq.h, o); }
    out.push(q);
  });
  // 每块登记模板占位（kind template / data）；交回外接框（drawOverflow 与数据框登记看它）
  if (!(g as unknown as Record<symbol, unknown>)[MEASURE_ONLY]) for (const q of out) frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'data' });
  if (!out.length) return null;
  const x1 = Math.min(...out.map((q) => q.x)), y1 = Math.min(...out.map((q) => q.y));
  return { x: x1, y: y1, w: Math.max(...out.map((q) => q.x + q.w)) - x1, h: Math.max(...out.map((q) => q.y + q.h)) - y1 };
}
/** lay.panelWidth / lay.panelHeight 这类 0.1–1 的比例：给了（不是 auto）时取它，否则 def（M12b-64 ⑦） */
function sizeOr(r: Theme['r'], k: string, def: number): number {
  if (!r.has(k) || r.str(k, 'auto') === 'auto') return def;
  const v = r.num(k, def);
  return Number.isFinite(v) && v > 0 ? Math.max(0.1, Math.min(1, v)) : def;
}
/**
 * 托盘 / 底部浮层 / 弹窗的水平位置（lay.panelAlign + lay.panelOffset，M12b-64 ⑦）：start / end = 贴左 / 右边距，center = 居中（原来的）；
 * 偏移 = 剩余空间（画面宽 − 两边边距 − 面板宽）的比例（−0.5…0.5），夹在边距以内。Godot：锚点预设 + offset（内置）
 */
function panelX(r: Theme['r'], R: Rect, m: number, w: number): number {
  const al = r.str('lay.panelAlign', 'center'), off = r.has('lay.panelOffset') ? Math.max(-0.5, Math.min(0.5, r.num('lay.panelOffset', 0) || 0)) : 0;
  const c = R.x + (R.w - w) / 2;
  if (al !== 'start' && al !== 'end' && !off) return c;
  const lo = R.x + m, hi = R.x + R.w - m - w;
  if (hi < lo) return c;
  const base = al === 'start' ? lo : al === 'end' ? hi : c;
  return Math.max(lo, Math.min(hi, base + off * (hi - lo)));
}
/**
 * 让位（M12b-64 ①：容器给钉在屏幕上的元素让、数据区给容器里的元素让）：压进 o 的每块矩形从 o 的一边收掉（上 / 下 / 左 / 右里留下面积最大的那种，留 gap），
 * 收完宽高都不小于原来的 min 倍；做不到的那块不收（交给可读性检查）。Godot：HudLayout.gd 按同一张占位表改容器的 offset
 */
function yieldRect(o: Rect, rects: Rect[], gap: number, min: number): Rect {
  let q = { ...o };
  for (const b of rects) {
    if (!intersects(q, b)) continue;
    const c = [
      { ...q, h: b.y - gap - q.y },
      { ...q, y: b.y + b.h + gap, h: q.y + q.h - (b.y + b.h + gap) },
      { ...q, w: b.x - gap - q.x },
      { ...q, x: b.x + b.w + gap, w: q.x + q.w - (b.x + b.w + gap) },
    ].filter((x) => x.w >= o.w * min - 0.5 && x.h >= o.h * min - 0.5);
    if (c.length) q = c.reduce((a, x) => (x.w * x.h > a.w * a.h + 0.5 ? x : a));
  }
  return q;
}

/**
 * 容器面板的饰件占位（M12a-08）：lay.ornamentInset = auto（默认）时按面板实际画的饰件算（ornamentInsets，规则同 drawOrnaments），none = 不算（原来的版式）。
 * 面板样式与 panel() 画的一致（@panel 部件 + 主容器标记）
 */
function containerOrn(e: ElCtx, outer: Rect, R: Rect): OrnamentInsets {
  if (e.r.str('lay.ornamentInset', 'auto') === 'none') return NO_ORNAMENT_INSETS;
  const pe = dialogueLike(e.r) ? e.part('dialog') : e;
  return ornamentInsets({ ...(pe.scope.length > 1 ? pe : pe.part('panel')).t.panel, ...asContainer(e) }, outer, { where: 'screen', frame: R });
}
/** 内框：四边留白 pad（上下 0.8 倍），饰带伸得更深的边按饰带内缩（M12a-08：角花的横竖臂、底边分隔线不再压内容） */
const padded = (o: Rect, pad: number, orn: OrnamentInsets): Rect => {
  const l = Math.max(pad, orn.l), rr = Math.max(pad, orn.r), t = Math.max(pad * 0.8, orn.t), b = Math.max(pad * 0.8, orn.b);
  // 饰带都没超过留白：照原来的式子算（逐位一致）
  if (l === pad && rr === pad && t === pad * 0.8 && b === pad * 0.8) return { x: o.x + pad, y: o.y + pad * 0.8, w: o.w - pad * 2, h: o.h - pad * 1.6 };
  return { x: o.x + l, y: o.y + t, w: o.w - l - rr, h: o.h - t - b };
};


/** 矩形向外扩 k */
const inflate = (q: Rect, k: number): Rect => ({ x: q.x - k, y: q.y - k, w: q.w + k * 2, h: q.h + k * 2 });
/** 两块的外接框（B8 审查修复 ⑬：格组 / 两侧列交回实际画出的范围） */
const unionRect = (p: Rect, q: Rect): Rect => { const x = Math.min(p.x, q.x), y = Math.min(p.y, q.y); return { x, y, w: Math.max(p.x + p.w, q.x + q.w) - x, h: Math.max(p.y + p.h, q.y + q.h) - y }; };
/** 分区底板（cmp.modal = perRegion，M12a-37，XCOM 武器库）：面板样式（转角、描边跟皮肤），底色 = 面板底压暗 35%、72% 不透明 */
const regionPlate = (e: ElCtx): Partial<BoxStyle> => ({ bg: { solid: withAlpha(mix(resolveColor(e.th.surface, e.pal), '#000', 0.35), 0.72) }, shadows: [] });
/** 模板里分隔线的颜色：col.border 按作用域读、旧皮肤只认皮肤之后选的（审查修复 A · C10，与贴边条的 barDividerColor 同口径），没选时面板描边色 / 字色 30% */
function ruleColor(e: ElCtx): string {
  const bc = pickedStr(e, 'col.border', 'auto');
  return bc && bc !== 'auto' ? resolveColor(bc, e.pal) : e.t.panel.border ? resolveColor(e.t.panel.border.color, e.pal) : withAlpha(e.text, 0.3);
}
/** 分隔线的位置（vis.dividerPlace，M12b-45）：选过才有（旧皮肤要皮肤之后的层），没选 null（= 原来的：只有饰件的底边分隔饰条与 lay.grouping = divider 的分栏线） */
function dividerPlaces(e: ElCtx): string[] | null {
  const k = chosenKey(e, 'vis.dividerPlace');
  const l = k ? e.r.list(k).filter((x) => x && x !== 'auto') : [];
  return l.length ? l : null;
}
/**
 * 模板里一条分隔线（M12b-45）：从 (x0, y) 到 (x1, y)，竖线 vert = true 时从 (x0, y0 = y) 往下画 x1 - x0 长。vis.dividerStyle 选过时按线型画（ornament.ts divider()：
 * glyph 取当前母题、第二母题优先），没选时原来的 1px 实线（两端渐隐 vis.strokeFade 选过时渐隐）
 */
function ruleLine(e: ElCtx, x0: number, x1: number, y: number, vert = false, c = ruleColor(e)) {
  const g = e.g, st0 = pickedStr(e, 'vis.dividerStyle', 'auto'), o = e.t.panel.ornament;
  // plain（「无中间符号」）与第二母题 = none 的 glyph：一整条实线（B4 审查修复：原来照饰件分隔饰条画两段 37.5% 的线、中间空 25%，分栏竖线在半高处断开；
  // 空当只在中间放符号时才有意义）
  const st = st0 === 'plain' || (st0 === 'glyph' && o?.motif2 === 'none') ? 'auto' : st0;
  // 两端渐隐（vis.strokeFade 选过，M12b-37，elden-ring#27 的暖灰发丝竖线）：同一条线两端各渐隐这么多比例，没选时原来的实线
  const fk = chosenKey(e, 'vis.strokeFade'), fade = fk ? e.r.num(fk, 0) : 0;
  if (st === 'auto') {
    g.fillStyle = c;
    if (vert) { if (fade > 0) fadeStroke(g, y + 0.5, x0, y + 0.5, x1, c, 1, fade); else g.fillRect(y, x0, 1, x1 - x0); }
    else if (fade > 0) fadeStroke(g, x0, y + 0.5, x1, y + 0.5, c, 1, fade); else g.fillRect(x0, y, x1 - x0, 1);
    return;
  }
  const m = o?.motif && o.motif !== 'none' ? o.motif : 'diamond';
  g.save();
  if (vert) { g.translate(y + 0.5, x0); g.rotate(Math.PI / 2); }
  g.strokeStyle = c; g.fillStyle = c; g.lineWidth = Math.max(1, e.k);
  const [a0, a1, yy] = vert ? [0, x1 - x0, 0] : [x0, x1, y + 0.5];
  divider(g, a0, a1, yy, st, o?.motif2 ?? m, c, { lw: Math.max(1, e.k), size: e.k * 9, level: o?.level ?? 1, fade, mod: o?.mod });
  g.restore();
}
/** 墨团底衬的默认色（col.coding 没开 lineId 时）：Disco 的四色属性——青 / 紫 / 品红 / 黄 */
const INK_BACKING = ['#4fb4c2', '#8a62c4', '#c8467e', '#d6ae3c'];
/** 两个分区之间的分栏线（lay.grouping = divider；vis.dividerPlace = betweenBlocks）：左右分栏画竖线、上下分栏画横线，在两块的空隙正中 */
function dividerLine(e: ElCtx, a: Rect, b: Rect) {
  const lr = Math.abs(a.y - b.y) < 1 && Math.abs(a.h - b.h) < 1;
  if (lr) {
    const [l, rr] = a.x < b.x ? [a, b] : [b, a], x = Math.round((l.x + l.w + rr.x) / 2), y0 = Math.min(a.y, b.y), h = Math.max(a.h, b.h);
    ruleLine(e, y0, y0 + h, x, true);
  } else {
    const [t, bb] = a.y < b.y ? [a, b] : [b, a], y = Math.round((t.y + t.h + bb.y) / 2), x0 = Math.min(a.x, b.x), w = Math.max(a.w, b.w);
    ruleLine(e, x0, x0 + w, y);
  }
}

/* ---------------- 导航 ---------------- */

/**
 * 页签托槽（lay.navRail，M12b-50，§2，civ6#24 的铜色托槽；B9 · 16 的 cmp.tabMount 同源）：straight = 页签行后面一条深色底 + 外框材质边（ast.frameMat，没选时铜）的横托槽；
 * arc = 页签行下面一道往下弯的弧形托槽（横跨页签行；页签居中排布是 B9 · 16 的 lay.navAlign）。选过才画（旧皮肤要皮肤之后的层）
 */
function navRail(e: ElCtx, r: Rect, kind0?: string) {
  const kind = kind0 ?? pickedStr(e, 'lay.navRail', 'none');
  if (kind === 'none') return;
  const g = e.g, S = (n: number) => n * e.k, mat = pickedStr(e, 'ast.frameMat', 'bronze'), base = MATERIAL_BASE[mat] ?? '#b08d57';
  if (kind === 'straight') {
    const q = { x: r.x - S(8), y: r.y - S(5), w: r.w + S(16), h: r.h + S(10) };
    drawBox(g, q, { bg: { solid: mix(base, '#000', 0.6) }, frame: { kind: 'plainNinePatch', mat, width: S(5), motif: 'none' }, radius: S(4) }, e.pal);
    return;
  }
  const cx = r.x + r.w / 2, x0 = r.x, x1 = r.x + r.w, y0 = r.y + r.h * 0.7, sag = r.h * 0.4, th = S(8);
  g.save();
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, y0 + sag * 2, x1, y0); g.lineTo(x1 - th * 0.3, y0 - th); g.quadraticCurveTo(cx, y0 + sag * 2 - th * 2, x0 + th * 0.3, y0 - th); g.closePath();
  g.fillStyle = base; g.fill();
  g.strokeStyle = withAlpha(mix(base, '#000', 0.6), 0.9); g.lineWidth = Math.max(1, e.k); g.stroke();
  g.restore();
}

/* ---- 页签导航扩展（M12b-16）：页签数 / 对齐 / 分隔、托槽与外挂页签、头像栏、面包屑、轮播 ---- */
/**
 * 页签数（lay.navCount，civ6#23：生产 3 枚、伟人 2 枚、外交 5 枚）：没给 = 原来（上下页签取前 4 个、左右全部）；给了 N 时取前 N 个，
 * 不够时从内容包的页签 / 菜单页签里补没出现过的（不循环）。旧皮肤只认皮肤之后的层
 */
function navCountTabs(e: ElCtx, tabs: TabItem[], def: number): TabItem[] {
  const raw = chosen(e, 'lay.navCount') ? e.r.get('lay.navCount') : undefined, v = typeof raw === 'number' ? raw : Number(raw);
  if (!(v > 0)) return def > 0 ? tabs.slice(0, def) : tabs;
  const n = Math.round(Math.min(10, v));
  if (tabs.length >= n) return tabs.slice(0, n);
  const p = pack(), more = [...p.screens.tabs.map((l, i): TabItem => ({ label: l, icon: p.screens.tabIcons?.[i] })), ...p.menu.tabs.map((l, i): TabItem => ({ label: l, icon: p.menu.tabIcons?.[i] }))];
  const out = [...tabs];
  for (const t of more) { if (out.length >= n) break; if (!out.some((q) => q.label === t.label)) out.push(t); }
  return out;
}
/** 页签行的对齐 / 分隔 / 挂法（lay.navAlign / lay.navSeparator / cmp.tabMount）：选过才换，没选 = 原来的 */
const navAlignOf = (e: ElCtx) => { const v = pickedStr(e, 'lay.navAlign', 'start'); return v === 'center' || v === 'stretch' ? v : undefined; };
const navSepOf = (e: ElCtx) => { const v = pickedStr(e, 'lay.navSeparator', 'none'); return v === 'line' || v === 'dot' ? v : undefined; };
const tabMountOf = (e: ElCtx) => pickedStr(e, 'cmp.tabMount', 'none');
/**
 * 挂在容器外沿的页签（cmp.tabMount，M12b-16）：outsideTop = 一排凸出在容器上沿外面的小牌（每张一圈同材质的面板框，选中那张往下压、和框连成一体，stardew#30）；
 * bookmark = 从容器右缘（左页签时左缘）伸出去的一列书签（选中那张伸得长一些）。不占容器里的版面
 */
function mountedTabs(e0: ElCtx, outer: Rect, tabs: TabItem[], mode: 'outsideTop' | 'bookmark', left: boolean, ink?: string) {
  const e = e0.part('tab'), S = (n: number) => n * e.k, g = e.g, tp = tap(e), meas = !!(g as unknown as Record<symbol, unknown>)[MEASURE_ONLY];
  const face: BoxStyle = { ...e.t.panel, shadows: [], ornament: undefined, fx: undefined, rotate: 0, skewX: 0, frame: e.t.panel.frame ? { ...e.t.panel.frame, width: Math.min(e.t.panel.frame.width, S(6)) } : undefined };
  const kind = cmp(e, 'cmp.tab', tabs.some((t) => t.icon) ? 'icon' : 'text'), on: TextOpts = { ...e.base, weight: 700, color: ink ?? e.text }, off: TextOpts = { ...e.base, color: ink ? withAlpha(ink, 0.65) : mutedOf(e, 0.65) };
  const content = (t: TabItem, q: Rect, sel: boolean) => {
    const o = sel ? on : off;
    if ((kind === 'icon' || kind === 'iconText') && t.icon) icon(e, t.icon, q.x + q.w / 2, q.y + q.h / 2, Math.min(q.w, q.h) * 0.5, o.color);
    else T(e, t.label, q.x + q.w / 2 - W(e, t.label, o) / 2, q.y, q.h, o);
    logTarget(g, q, t.label);
  };
  // 挂在容器外的页签登记进帧占位表（模板页头，B9 审查修复 ⑥：原来不登记，后画的合规层 / 浮框会压上来）
  const occ = (q: Rect) => { if (!meas) frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'header' }); };
  if (mode === 'outsideTop') {
    const h = Math.max(S(34), tp), w = Math.max(h, ...tabs.map((t) => ((kind === 'icon' || kind === 'iconText') && t.icon ? h : W(e, t.label, on) + S(24)))), gp = S(4);
    // 容器上沿的框宽（描边 / 外框带）：选中的那张往下压过这一截、与框连成一体（B9 审查修复 ㉘）
    const edge = Math.max(1, e0.t.panel.border?.width ?? 1, e0.t.panel.frame?.width ?? 0), bw = Math.max(1, face.border?.width ?? 1, face.frame?.width ?? 0);
    const clipTo = (q: Rect, y1: number, f: () => void) => { g.save(); g.beginPath(); g.rect(q.x - S(4), q.y - S(4), q.w + S(8), y1 - (q.y - S(4))); g.clip(); f(); g.restore(); };
    let x = outer.x + S(18);
    tabs.forEach((t, i) => {
      if (x + w > outer.x + outer.w - S(18)) return;
      const sel = i === 0, q = { x, y: outer.y - h + (sel ? S(6) : 0), w, h: h - (sel ? S(6) : 0) };
      // 没选中的：画在框的后面（只露出框上沿以上的部分，原来整张画在面板之后、底边压进框里 4）
      if (!sel) clipTo(q, outer.y, () => drawBox(g, q, face, e.pal));
      else {
        // 选中的：底边伸到框里、裁在框宽处（没有自己的底边），里面用容器自己的底再铺一遍（与面板同一块底、同一个图块原点；原来是一块 surface 纯色补丁，木纹面板上露出一块色块）
        clipTo(q, outer.y + edge, () => drawBox(g, { ...q, h: q.h + edge + S(10) }, face, e.pal));
        g.save(); g.beginPath(); g.rect(q.x + bw, q.y + bw, q.w - bw * 2, outer.y + edge + S(1) - (q.y + bw)); g.clip();
        drawBox(g, outer, { ...e0.t.panel, border: undefined, frame: undefined, shadows: [], ornament: undefined, fx: undefined }, e0.pal); g.restore();
      }
      content(t, { ...q, h: Math.min(q.h, h) }, sel);
      occ({ ...q, h: outer.y - q.y });
      x += w + gp;
    });
    return;
  }
  const h = Math.max(S(40), tp), w0 = Math.max(S(30), h * 0.8);
  tabs.forEach((t, i) => {
    const sel = i === 0, w = w0 + (sel ? S(8) : 0), y = outer.y + S(24) + i * (h + S(4));
    if (y + h > outer.y + outer.h - S(12)) return;
    const q = { x: left ? outer.x - w + S(2) : outer.x + outer.w - S(2), y, w, h };
    drawBox(g, q, { ...face, ...(sel ? {} : { bg: { solid: mix(resolveColor(e.th.surface, e.pal), e.text, 0.12) } }) }, e.pal);
    content(t, { ...q, x: q.x + (left ? 0 : S(4)), w: q.w - S(4) }, sel);
    occ(q);
  });
}
/** 托槽贴着页签实际的范围（cmp.tabMount = cradle / arcCradle，与 lay.navRail 同一画法；页签居中时托槽跟着居中，civ6#24） */
function cradleTabs(e0: ElCtx, at: Rect, tabs: TabItem[], o: Parameters<typeof tabStrip>[3], kind: 'straight' | 'arc') {
  const m = tabStrip(e0, at, tabs, { ...o, measure: true });
  if (m.w > 0) navRail(e0, { ...m, x: m.x - e0.k * 6, w: m.w + e0.k * 12 }, kind);
}
/**
 * 左缘头像栏（lay.nav2 = avatarRail，M12b-16，civ6#30：外交屏最左一列已结识领袖的圆头像）：与 lay.nav 并存，一列圆头像（角色样本的首字，第一个选中描强调色圈），版面从左边让出这一列
 */
function avatarRail(e: ElCtx, body: Rect, ink?: string): Rect {
  const S = (n: number) => n * e.k, d = Math.max(S(40), tap(e)), gp = S(8), chars = samplesFor('characters');
  chars.forEach(([ini, name], i) => {
    const cy = body.y + d / 2 + i * (d + gp);
    if (cy + d / 2 > body.y + body.h) return;
    avatar(e, body.x + d / 2, cy, d * 0.42, ini, i === 0 ? e.accent : ink ? withAlpha(ink, 0.35) : mutedOf(e, 0.35));
    logTarget(e.g, { x: body.x, y: cy - d / 2, w: d, h: d }, name);
  });
  return { ...body, x: body.x + d + S(12), w: body.w - d - S(12) };
}
/**
 * 面包屑（lay.nav = breadcrumb，M12b-16，control#8）：左上一行「← + 返回键 + 上级（次要色）/ 当前（正文粗体）」，上级 = 模板名、当前 = 第一个页签；版面从上面让出这一行
 */
function breadcrumb(e: ElCtx, body: Rect, tabs: TabItem[], label: string, ink?: string): Rect {
  const S = (n: number) => n * e.k, h = Math.max(S(28), LH(e, e.base, 1.6)), y = body.y, g = e.g;
  const pad = e.r.str('ctx.input', 'kbm') === 'pad', key = pad ? 'B' : 'Esc', kh = Math.min(h * 0.72, Math.max(S(20), LH(e, e.small, 1.3)));
  const mo = { ...e.base, color: ink ? withAlpha(ink, 0.6) : mutedOf(e, 0.6) }, co = { ...e.base, weight: 700, color: ink ?? e.text };
  let x = body.x;
  T(e, '←', x, y, h, { ...co, color: e.accent }); x += W(e, '←', co) + S(8);
  x += keyCap(e, x, y + (h - kh) / 2, kh, key, pad ? 'east' : undefined) + S(10);
  const cur = tabs[0]?.label ?? label;
  if (label && label !== cur) { T(e, label, x, y, h, mo); x += W(e, label, mo) + S(6); T(e, '/', x, y, h, mo); x += W(e, '/', mo) + S(6); }
  T(e, cur, x, y, h, co);
  logTarget(g, { x: body.x, y, w: x + W(e, cur, co) - body.x, h }, '返回');
  return { ...body, y: body.y + h + S(10), h: body.h - h - S(10) };
}
/**
 * 轮播（lay.nav = carousel，M12b-16，hollow-knight#17）：上面一行左「肩键 + 前一页名」、右「后一页名 + 肩键」，版面两侧正中各一枚翻页箭头（形 = 当前母题有时母题符号、没有时菱形）；
 * 版面从上面让出一行、两边各让出一个箭头宽
 */
function carousel(e: ElCtx, body: Rect, tabs: TabItem[], ink?: string): Rect {
  const S = (n: number) => n * e.k, g = e.g, h = Math.max(S(28), LH(e, e.base, 1.6)), kh = Math.min(h * 0.72, Math.max(S(20), LH(e, e.small, 1.3)));
  const pad = e.r.str('ctx.input', 'kbm') !== 'kbm' || ['xbox', 'playstation', 'nintendo'].includes(e.r.str('ix.glyphs', 'keycap'));
  const [lk, rk] = pad ? ['LT', 'RT'] : ['Q', 'E'], o = { ...e.base, weight: 700, color: ink ?? e.text };
  const prev = tabs[tabs.length - 1]?.label ?? '', next = tabs[1]?.label ?? tabs[0]?.label ?? '';
  let x = body.x;
  x += keyCap(e, x, body.y + (h - kh) / 2, kh, lk, pad ? 'lt' : undefined) + S(8);
  T(e, prev, x, body.y, h, o); logTarget(g, { x: body.x, y: body.y, w: x + W(e, prev, o) - body.x, h }, prev);
  const nw = W(e, next, o), rkw = keyCapWidth(e, kh, rk, pad ? 'rt' : undefined), xr = body.x + body.w - rkw;
  keyCap(e, xr, body.y + (h - kh) / 2, kh, rk, pad ? 'rt' : undefined);
  T(e, next, xr - S(8) - nw, body.y, h, o); logTarget(g, { x: xr - S(8) - nw, y: body.y, w: body.x + body.w - (xr - S(8) - nw), h }, next);
  const b = { ...body, y: body.y + h + S(8), h: body.h - h - S(8) }, aw = S(22), cy = b.y + b.h / 2, motif = e.t.panel.ornament?.motif;
  for (const side of [-1, 1]) {
    const cx = side < 0 ? b.x + aw / 2 : b.x + b.w - aw / 2, s = aw * 0.45;
    g.save(); g.fillStyle = ink ?? e.text; g.strokeStyle = ink ?? e.text; g.lineWidth = Math.max(1.5, S(1.5));
    if (motif && motif !== 'none') { g.translate(cx, cy); glyph(g, motif, s * 1.6); }
    else { g.beginPath(); g.moveTo(cx + side * s, cy); g.lineTo(cx, cy - s); g.lineTo(cx - side * s * 0.4, cy); g.lineTo(cx, cy + s); g.closePath(); g.fill(); }
    g.restore();
    logTarget(g, { x: cx - aw / 2, y: cy - aw / 2, w: aw, h: aw }, side < 0 ? '上一页' : '下一页');
  }
  return { ...b, x: b.x + aw + S(8), w: b.w - (aw + S(8)) * 2 };
}

function drawNav(e0: ElCtx, body: Rect, nav: string, ink?: string, spots?: { label: string; rect: Rect }[], overFocal = false, cx?: { outer: Rect; label: string }): Rect {
  // 头像栏（lay.nav2 = avatarRail，M12b-16）与页签并存：先从左边让出一列
  if (pickedStr(e0, 'lay.nav2', 'none') === 'avatarRail') body = avatarRail(e0, body, ink);
  return drawNav0(e0, body, nav, ink, spots, overFocal, cx);
}
function drawNav0(e0: ElCtx, body: Rect, nav: string, ink?: string, spots?: { label: string; rect: Rect }[], overFocal = false, cx?: { outer: Rect; label: string }): Rect {
  // 页签部件：选中页签的按键样式、页签字按 @tab 查（M12a-01）；一级 / 二级页签由 tabStrip 画（M12a-22，elements/tabs.ts）
  const e = e0.part('tab');
  const S = (n: number) => n * e.k, tp = tap(e);
  // 页签（M12b-61 / 62 的 navTabs）：按界面取（技能树的分支、图鉴的分类、角色页的对象操作……；世界地图 = 地图筛选类别），没专门写时当前包的 5 个；
  // 二级页签（lay.navDepth = 2）用菜单的 3 个分类
  const tabs = navTabs(e0);
  const depth = Math.round(e0.r.num('lay.navDepth', 1)), keys = navKeysOn(e0);
  switch (nav) {
    case 'tabsTop': case 'tabsBottom': {
      const h = Math.max(S(30), tp, LH(e, e.base, 1.7));
      const y = nav === 'tabsTop' ? body.y : body.y + body.h - h;
      // 页签数 / 对齐 / 分隔 / 挂法（M12b-16）：没选时与原来一样（取前 4 个、左起、无分隔、托槽 = lay.navRail 铺满整行）
      const list = navCountTabs(e0, tabs, 4), align = navAlignOf(e0), sep = navSepOf(e0), mount = tabMountOf(e0);
      const o: Parameters<typeof tabStrip>[3] = { dir: 'h', h, ink, keys, ...(align ? { align } : {}), ...(sep ? { sep } : {}) }, at = { x: body.x, y, w: body.w, h };
      if (mount === 'outsideTop' && nav === 'tabsTop' && cx) { mountedTabs(e0, cx.outer, list, 'outsideTop', false, ink); return depth >= 2 ? subTabs(e0, body, false, ink, keys) : body; }
      // 页签托槽（lay.navRail，M12b-50，civ6#24）：页签行后面一条框材质托槽（直 / 居中的弧形）；页签居中 / 铺满时托槽跟着页签实际的范围（B9 · 16）
      if (mount === 'cradle' || mount === 'arcCradle') cradleTabs(e0, at, list, o, mount === 'arcCradle' ? 'arc' : 'straight');
      else if (align && pickedStr(e0, 'lay.navRail', 'none') !== 'none') cradleTabs(e0, at, list, o, pickedStr(e0, 'lay.navRail', 'none') === 'arc' ? 'arc' : 'straight');
      else navRail(e0, at);
      tabStrip(e0, at, list, o);
      const b = nav === 'tabsTop' ? { ...body, y: body.y + h + S(10), h: body.h - h - S(10) } : { ...body, h: body.h - h - S(10) };
      return depth >= 2 ? subTabs(e0, b, nav === 'tabsBottom', ink, keys) : b;
    }
    case 'tabsLeft': case 'tabsRight': {
      const h = Math.max(S(36), tp, LH(e, e.base, 1.9));
      const list = navCountTabs(e0, tabs, 0), sep = navSepOf(e0);
      // 外挂书签（cmp.tabMount = bookmark，M12b-16）：从容器的左 / 右缘伸出去，不占版面
      if (tabMountOf(e0) === 'bookmark' && cx) { mountedTabs(e0, cx.outer, list, 'bookmark', nav === 'tabsLeft', ink); return depth >= 2 ? subTabs(e0, body, false, ink, keys) : body; }
      const w = Math.max(tabColumnW(e0, list, { ink, h }) + S(30), tp);
      const x = nav === 'tabsLeft' ? body.x : body.x + body.w - w;
      tabStrip(e0, { x, y: body.y, w, h: body.h }, list, { dir: 'v', h, w, ink, max: body.h, indent: S(14), ...(sep ? { sep } : {}) });
      const b = nav === 'tabsLeft' ? { ...body, x: body.x + w + S(14), w: body.w - w - S(14) } : { ...body, w: body.w - w - S(14) };
      // 左 + 顶双级（lay.navDepth = 2）：右边的版面顶上再一行二级页签
      return depth >= 2 ? subTabs(e0, b, false, ink, keys) : b;
    }
    case 'breadcrumb': return breadcrumb(e, body, navCountTabs(e0, tabs, 0), cx?.label ?? '', ink);
    case 'carousel': return carousel(e, body, navCountTabs(e0, tabs, 0), ink);
    case 'hub': {
      // 图标宫格（游戏内手机 / 手持终端的主屏）：宫格本身就是内容（所有包共用 GENERIC.hub）
      const items = GENERIC.hub;
      const cols = body.w > S(360) ? 4 : 3, sz = Math.max(tp, Math.min(S(64), (body.w - (cols - 1) * S(16)) / cols));
      items.forEach(([c, l], i) => {
        const x = body.x + (i % cols) * (sz + S(16)), y = body.y + Math.floor(i / cols) * (sz + LH(e, e.small) + S(12));
        if (y + sz > body.y + body.h) return;
        drawBox(e.g, { x, y, w: sz, h: sz }, { ...e.t.key, radius: sz * 0.24 }, e.pal);
        icon(e, c, x + sz / 2, y + sz / 2, sz * 0.42, '#fff');
        T(e, l, x + sz / 2 - W(e, l, e.small) / 2, y + sz + S(2), LH(e, e.small), { ...e.small, color: ink ?? e.text });
        logTarget(e.g, { x, y, w: sz, h: sz }, l);
      });
      return { ...body, h: 0 };
    }
    case 'hotspots': {
      // 有主体插画（cnt.focal）时热区叠在插画上（M12a-22，hotspotsOver）：不占版面、不画框
      if (overFocal && !spots?.length) return body;
      // 场景热区（书桌上的物件就是入口）：几个带名字的热区框；位图书桌给了物件位置时框在物件上（M11）
      const list: [string, Rect][] = spots?.length ? spots.map((q) => [q.label, q.rect])
        : ([['信件', 0.1, 0.2], ['地图', 0.45, 0.15], ['日记', 0.7, 0.45], ['钥匙', 0.25, 0.6]] as [string, number, number][]).map(([l, fx, fy]) => [l, { x: body.x + body.w * fx, y: body.y + body.h * fy, w: S(110), h: S(70) }]);
      list.forEach(([l, r0]) => {
        e.g.save(); e.g.setLineDash([5, 4]); e.g.strokeStyle = withAlpha(e.accent, 0.9); e.g.lineWidth = 2; e.g.strokeRect(r0.x, r0.y, r0.w, r0.h); e.g.restore();
        // 位图书桌的热区框贴着画面边：名字放在框内左下，免得掉出画面
        const ph = S(22), py = spots?.length ? r0.y + r0.h - ph - S(4) : r0.y + r0.h + S(4);
        plate(e, { x: r0.x + (spots?.length ? S(4) : 0), y: py, w: W(e, String(l), e.small) + S(16), h: ph }, String(l), 'pill', { size: e.small.size });
        logTarget(e.g, r0, String(l));
      });
      // 热区来自位图书桌（框在面板外的物件上）时，面板里照常排内容（推理板的线索）；否则热区就是内容
      return spots?.length ? body : { ...body, h: 0 };
    }
    default: return body;
  }
}

/**
 * 二级页签行（lay.navDepth = 2，M12a-22）：一级页签下面（底部页签时在上面）再一行小页签，内容按 cmp.tab@nav2（没写时图标）；两端切换键 Z / C（手柄 LT / RT）。
 * 返回扣掉这一行的版面。Godot：第二个 TabBar（或 TabContainer 嵌套）
 */
/**
 * 模板的一级页签（M12b-61 / 62）：textPick('tabs')——包按界面写的变体（技能树的分支、图鉴的分类、角色页的对象操作 xcom2#27、农场的游戏菜单分区 stardew#31……），
 * 没专门写时包原来的 screens.tabs（+ tabIcons）；世界地图没专门写时 = 地图筛选类别（mapFilters，cyberpunk-2077#31：原来是背包分类）。图标 = TabRow 第 2 项
 */
function navTabs(e: ElCtx): TabItem[] {
  const pk = textPick('tabs', e.r);
  if ((!pk || pk.legacy) && sampleKind(e.r) === 'locations') return samplesFor('mapFilters').map(([g, l]) => ({ label: l, icon: g }));
  return (pk?.value ?? []).map(([l, ic]) => ({ label: l, icon: ic }));
}
function subTabs(e0: ElCtx, b: Rect, above: boolean, ink: string | undefined, keys: boolean): Rect {
  const e = e0.part('nav2');
  const S = (n: number) => n * e.k, h = Math.max(S(26), tap(e), LH(e, e.small, 1.8));
  const y = above ? b.y + b.h - h : b.y;
  const m = pack().menu;
  tabStrip(e0, { x: b.x, y, w: b.w, h }, m.tabs.map((label, i) => ({ label, icon: m.tabIcons?.[i] })), { dir: 'h', h, ink, part: 'nav2', content: 'icon', keys, text: { size: e.small.size } });
  return above ? { ...b, h: b.h - h - S(8) } : { ...b, y: b.y + h + S(8), h: b.h - h - S(8) };
}

/**
 * 叠在主体插画上的场景热区（lay.nav = hotspots 且有 cnt.focal，M12a-22，Obra Dinn 点群像里的人脸跳转）：不占版面、不画框、不挂药丸名牌，
 * 每个热区一个编号小圆，焦点热区（第一个）画高亮圈 + 名字。位置是插画里的相对位置（样本）
 */
function hotspotsOver(e: ElCtx, a: Rect) {
  const g = e.g, S = (n: number) => n * e.k, rad = S(10);
  // 热区标记（lay.hotspotCue，M12b-68，obra-dinn#35）：auto = 原来的编号小圆（半透明黑底白字）+ 第一个热区的发光圈与名牌；none = 平时什么都不画（只登记命中框）；
  // hover = 只画焦点热区的发光圈与名牌；numbered = 只画编号小圆，底 / 字取 col.surface / col.text
  const cue = optOf(e.r, 'lay.hotspotCue', 'auto');
  ([['信件', 0.3, 0.34], ['地图', 0.62, 0.28], ['日记', 0.46, 0.6], ['钥匙', 0.74, 0.66]] as [string, number, number][]).forEach(([l, fx, fy], i) => {
    const cx = a.x + a.w * fx, cy = a.y + a.h * fy;
    if (cue === 'none' || (cue === 'hover' && i > 0)) { logTarget(g, { x: cx - rad * 2, y: cy - rad * 2, w: rad * 4, h: rad * 4 }, l); return; }
    if (i === 0 && cue !== 'numbered') {
      g.save(); g.strokeStyle = e.focus; g.lineWidth = 2; g.shadowColor = e.focus; g.shadowBlur = 8; g.beginPath(); g.arc(cx, cy, rad * 2.4, 0, Math.PI * 2); g.stroke(); g.restore();
      const pw = W(e, l, e.small) + S(16);
      plate(e, { x: cx - pw / 2, y: cy + rad * 2.6, w: pw, h: S(20) }, l, 'pill', { size: e.small.size });
    }
    if (cue === 'hover') { logTarget(g, { x: cx - rad * 2, y: cy - rad * 2, w: rad * 4, h: rad * 4 }, l); return; }
    const num = cue === 'numbered';
    g.fillStyle = num ? withAlpha(resolveColor(e.th.surface, e.pal), 0.85) : 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
    const n = String(i + 1), o = { ...e.small, weight: 700, color: num ? e.text : '#fff' };
    T(e, n, cx - W(e, n, o) / 2, cy - rad, rad * 2, o);
    logTarget(g, { x: cx - rad * 2, y: cy - rad * 2, w: rad * 4, h: rad * 4 }, l);
  });
}

/* ---------------- 分区与主体 ---------------- */

function split(e: ElCtx, body: Rect, focal: string, shape: string, lyr = e.r.str('lay.layering', 'separate')): { focalR: Rect | null; dataR: Rect | null } {
  const S = (n: number) => n * e.k, r = e.r;
  if (body.h <= 0) return { focalR: null, dataR: null };
  const hasFocal = focal !== 'none' && focal !== 'auto' && lyr !== 'backdrop' && lyr !== 'behind';
  const hasData = shape !== 'none' && shape !== 'auto';
  if (!hasFocal) return { focalR: null, dataR: hasData ? body : null };
  if (!hasData) return { focalR: body, dataR: null };
  const comp = r.str('lay.composition', 'splitLR');
  const side = r.str('lay.focalSide', 'left');
  const gap = S(16);
  // 主体在上、同一栏贴左（lay.focalSide = top 且不是上下分栏，M12a-27：Cities 主菜单的 LOGO 在上、按钮竖排在正下方、整组贴左；原来与上下分栏一样铺满整宽，菜单被挤到底部）
  if (side === 'top' && comp !== 'splitTB') {
    const w = Math.min(body.w, Math.max(S(260), body.w * 0.42)), h = body.h * 0.36;
    return { focalR: { x: body.x, y: body.y, w, h }, dataR: { x: body.x, y: body.y + h + gap, w, h: body.h - h - gap } };
  }
  // 主体所占比例（lay.splitRatio，M12a-37）：左右分栏是主体宽占比、上下分栏是主体高占比；没给时原来的 0.42 / 0.46
  const ratio = r.has('lay.splitRatio') && r.str('lay.splitRatio', 'auto') !== 'auto' ? Math.max(0.2, Math.min(0.8, r.num('lay.splitRatio', 0.42))) : 0;
  // 主体在下（lay.focalSide = bottom，M12b-11，stardew#33：背包上半是物品格、下半是装备栏 + 小人）：上下分栏时数据在上、主体在下；其余构图也按上下分栏排
  if (side === 'bottom') {
    const h = body.h * (ratio || 0.46);
    return { focalR: { ...body, y: body.y + body.h - h, h }, dataR: { ...body, h: body.h - h - gap } };
  }
  if (comp === 'splitTB') {
    const h = body.h * (ratio || 0.46);
    return { focalR: { ...body, h }, dataR: { ...body, y: body.y + h + gap, h: body.h - h - gap } };
  }
  if (comp === 'three') {
    const w = body.w / 3;
    return { focalR: { ...body, x: body.x + w, w }, dataR: { ...body, w: w - gap } };
  }
  // 海报化（ops.poster）：主体占比随之变大
  const poster = r.has('ops.poster') ? Math.max(0, Math.min(1, r.num('ops.poster', 0))) : 0;
  const w = body.w * (side === 'center' ? 0.5 : ratio || 0.42 + Math.max(0, poster - 0.4) * 0.35);
  if (side === 'right') return { focalR: { ...body, x: body.x + body.w - w, w }, dataR: { ...body, w: body.w - w - gap } };
  if (side === 'center') return { focalR: { ...body, x: body.x + (body.w - w) / 2, w, h: body.h * 0.6 }, dataR: { ...body, y: body.y + body.h * 0.6 + gap, h: body.h * 0.4 - gap } };
  return { focalR: { ...body, w }, dataR: { ...body, x: body.x + w + gap, w: body.w - w - gap } };
}

const MEDIUM_LABEL: Record<string, string> = { bust: '半身立绘', full: '全身立绘', model3d: '3D 实时模型', liveAction: '真人影像', chibi: 'Q 版小人' };

/**
 * 主体旁的装备格与文字（lay.focalAside = slotsText，M12b-15 顺延的 stardew#33：背包下半 = 装备栏 + 小人 + 农场名与资金）：主体是角色、主体区横长（上下分栏的下半）时，
 * 小人只占中间 40%，左边一列装备格（格组样本 screens.slotGroups 的前四组，空格画部位剪影）、右边一块文字（玩家名 + 主货币）。选过才分；返回小人用的矩形
 */
function focalAside(e: ElCtx, a: Rect, focal: string, ink: string | undefined, meas: boolean): Rect {
  if (focal !== 'character' || pickedStr(e, 'lay.focalAside', 'none') !== 'slotsText' || a.w < a.h * 1.4) return a;
  const S = (n: number) => n * e.k, cw = a.w * 0.3, groups = samplesFor('slotGroups').slice(0, 4), n = groups.length;
  const s = Math.max(S(26), Math.min(S(48), (a.h - S(8) * (n - 1)) / Math.max(1, n))), x0 = a.x + cw - s - S(10);
  groups.forEach(([t, gl, , filled], i) => {
    const q = { x: x0, y: a.y + (a.h - (n * s + (n - 1) * S(8))) / 2 + i * (s + S(8)), w: s, h: s };
    slot(e, q, filled ? gl : '', filled ? {} : { empty: true, emptyMode: 'silhouette' });
    T(e, t, q.x - S(8) - W(e, t, e.small), q.y, q.h, { ...e.small, color: ink ? withAlpha(ink, 0.7) : mutedOf(e, 0.7) });
  });
  const pr = DATA.profile, [r0] = DATA.res, money = `${r0[0]} ${fmtNumber(e, DATA.gold, DATA.gold.toLocaleString('en-US'))}`, tx = a.x + a.w - cw + S(10);
  const no = { ...e.title, color: ink ?? e.title.color }, mo = { ...e.base, weight: 700, color: e.accent }, ty = a.y + a.h / 2 - LH(e, no) / 2 - LH(e, mo) / 2;
  T(e, pr.name, tx, ty, LH(e, no), no);
  drawNumber(e, money, tx, ty + LH(e, no), LH(e, mo), mo);
  if (!meas) for (const q of [{ x: x0 - S(70), y: a.y, w: s + S(70), h: a.h }, { x: tx, y: ty, w: cw - S(10), h: LH(e, no) + LH(e, mo) }]) frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'data' });
  return { x: a.x + cw, y: a.y, w: a.w - cw * 2, h: a.h };
}
function drawFocal(e: ElCtx, a: Rect, focal: string, asBackdrop: boolean) {
  const g = e.g, S = (n: number) => n * e.k;
  const cx = a.x + a.w / 2;
  switch (focal) {
    case 'character': {
      const medium = e.r.str('cnt.characterMedium', 'full');
      if (medium === 'avatar') { avatar(e, cx, a.y + a.h / 2, Math.min(a.w, a.h) * 0.3, pack().hud.profile.initial); return; }
      // 视频窗（cnt.characterMedium = videoFeed，M12b-32，dead-space#22）：说话人的视频画面 + 扫描线 + 信号中断
      if (medium === 'videoFeed') { videoFeed(e, a); return; }
      if (e.r.str('lay.composition', '') === 'diagonalSplit') {
        // VS：两个角色按斜线分屏
        g.save(); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + a.w * 0.58, a.y); g.lineTo(a.x + a.w * 0.42, a.y + a.h); g.lineTo(a.x, a.y + a.h); g.closePath(); g.fillStyle = withAlpha(e.accent, 0.35); g.fill(); g.restore();
        g.save(); g.beginPath(); g.moveTo(a.x + a.w * 0.58, a.y); g.lineTo(a.x + a.w, a.y); g.lineTo(a.x + a.w, a.y + a.h); g.lineTo(a.x + a.w * 0.42, a.y + a.h); g.closePath(); g.fillStyle = withAlpha(e.bad, 0.35); g.fill(); g.restore();
        // 立绘：左边二次元、右边厚涂，各自裁在自己那块斜切里（当前包的立绘）；包里没有或没加载完时是剪影
        const left: [number, number][] = [[a.x, a.y], [a.x + a.w * 0.58, a.y], [a.x + a.w * 0.42, a.y + a.h], [a.x, a.y + a.h]];
        const right: [number, number][] = [[a.x + a.w * 0.58, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x + a.w * 0.42, a.y + a.h]];
        const vfx = renderModeOf(e, 'character');
        if (!vsSide(g, left, artFile('anime'), { ...a, w: a.w * 0.5 }, vfx)) figure(e, { ...a, w: a.w * 0.45 }, e.accent);
        if (!vsSide(g, right, artFile('painterly'), { ...a, x: a.x + a.w * 0.5, w: a.w * 0.5 }, vfx)) figure(e, { ...a, x: a.x + a.w * 0.55, w: a.w * 0.45 }, e.bad);
        const vs = 'VS'; T(e, vs, cx - W(e, vs, { ...e.title, size: S(56) }) / 2, a.y + a.h / 2 - S(40), S(80), { ...e.title, size: S(56), italic: true, color: '#fff', outline: { color: '#000', width: 3 } });
        return;
      }
      // 立绘位图（全身按画风选二次元 / 厚涂，半身、Q 版来自角色表）：完整放进、贴底居中；没有素材或没加载完时是剪影 + 标注
      // 角色画法处理（cnt.characterRender 选过时，M12b-32）：位图离屏处理（素描 / 浮雕 / 铜版 / 剪纸 / 水墨……）；没有位图时剪纸 = 黑剪影白边、其余照原来的剪影
      const cr = renderModeOf(e, 'character');
      if (smooth(g, () => drawImageFitFx(g, characterImage(e.r, medium), a, 'contain', [0.5, 1], cr))) return;
      // 没有立绘时的人形（审查修复 E 视觉 ② / RC7）：皮肤字色与强调色的混色、约 35% 不透明的剪影（原来满强调色的大粉红人形）；剪影 / 示意图取值本来就要人形，照旧实一些
      const solid = medium === 'silhouette' || medium === 'diagram';
      // 整合修复 U#13：正常使用时（HUD 主画布、品质下限开着、不是 QA 占位）缺素材的立绘位不画人形——视觉小说·来信这类立绘场景本身就画着角色，
      // 旁边再站一个半透明的幽灵人形像坏图；位置照旧让出来（露出画面）。剪影 / 示意图 / 剪纸是显式要的人形，照画；QA 下照旧画剪影 + 标牌
      if (!solid && cr !== 'cutout' && QUALITY.on && !PLACEHOLDER.qa && isHudCanvas(g)) return;
      figure(e, a, cr === 'cutout' ? '#111111' : asBackdrop ? withAlpha(e.text, 0.25) : withAlpha(mix(e.text, e.accent, 0.35), solid ? 0.7 : 0.38));
      // 「全身立绘（需素材）」「剪影」这类标牌只在 QA 占位开关打开时写（RC7：原来用 plate() 画、绕过了 PLACEHOLDER.qa）
      if ((PLACEHOLDER.qa || !isHudCanvas(g)) && (MEDIUM_LABEL[medium] || medium === 'silhouette' || medium === 'diagram')) {
        const l = medium === 'silhouette' ? '剪影' : medium === 'diagram' ? '人体示意图' : `${MEDIUM_LABEL[medium]}（需素材）`;
        plate(e, { x: cx - (W(e, l, e.small) + S(20)) / 2, y: a.y + a.h - S(28), w: W(e, l, e.small) + S(20), h: S(22) }, l, 'pill', { size: e.small.size });
      }
      return;
    }
    case 'item': {
      // 无框大图 + 顶光聚光（cnt.focalFrame = bare，M12b-32，black-myth#32）：不画格子框、稀有度竖条与橙色光晕
      if (pickedStr(e, 'cnt.focalFrame', 'framed') === 'bare') { focalBare(e, a); return; }
      const s = Math.min(a.w, a.h) * 0.5;
      const rc = rarityColor(e, 4);
      const gr = g.createRadialGradient(cx, a.y + a.h / 2, s * 0.2, cx, a.y + a.h / 2, s * 1.1);
      gr.addColorStop(0, withAlpha(rc, 0.55)); gr.addColorStop(1, withAlpha(rc, 0)); g.fillStyle = gr; g.fillRect(a.x, a.y, a.w, a.h);
      // 当前包的主打物品（奖励大卡上那件）：符号 + 查图集图标用的物品名
      const ft = pack().hud.featured;
      slot(e, { x: cx - s / 2, y: a.y + a.h / 2 - s / 2, w: s, h: s }, ft.glyph, { rarity: 4, item: ft.item });
      return;
    }
    case 'title': {
      // 标题字：标题 / 登录是游戏名，结算是胜负，本局总结是结局语，章节卡是章节名；其余用模板名（字都取当前包）
      const sub = e.r.str('cnt.subtype', '');
      const p = pack(), name = p.game.name;
      // 其余模板（M12b-61 的 focalTitle）：世界地图写任务 / 区域名（into-the-breach#40）、战斗大字写一句口号（persona5#17）……，没写时模板名
      const l = e.r.str('cnt.screen', '') === 'screen.title' || sub === 'login' ? name : sub === 'settle' || sub === 'rpgSettle' || sub === 'victory' ? p.screens.outcome[0] : sub === 'runSummary' ? p.screens.outcome[1] : sub === 'chapter' ? p.game.chapter.card : textFor('focalTitle', e.r) ?? templateLabelFromCtx(e);
      // 主体标题字是 title 部件（M12a-01）：字色、字体按 @title → 界面 → 全局查
      const et = e.part('title');
      // 游戏名、胜负、结局语是主视觉大字（原来的字号）；任务名、章节名、模板名这类标题跟字号阶梯走（M12a-33：title 层级 × typ.scale，同样封顶；
      // 原来一律按栏高撑到约 60，Into the Breach 的任务名应约 20）
      const hero = l === name || sub === 'settle' || sub === 'rpgSettle' || sub === 'victory' || sub === 'runSummary';
      const step = Math.max(1.1, Math.min(2.2, e.r.num('typ.scale', 1.4)));
      const o = { ...et.title, size: Math.min(S(64), a.h * 0.4, hero ? Infinity : et.title.size * step) };
      // 放不下这一栏就缩字（电视 / 大字号时标题栏只有四成宽）
      const tw0 = W(et, l, o);
      if (tw0 > a.w * 0.92) o.size *= (a.w * 0.92) / tw0;
      // 游戏名 + 书法标题字体 / 枯笔特效：书法标题位图（按标题字色着色，居中）；没加载完时照常写字
      // 书法位图写的是带它的那个包的游戏名（art.title，只有雪线旅人有）：别的包永远写字
      // 旧皮肤（如国风卷轴 ink 自带书法字）要显式选过才算，与 el.title 的 inkTitleOn 一致，旧皮肤对照图不变
      const fam = e.r.str('typ.display.family', '') === 'calligraphy', dry = e.r.str('typ.titleFx', '') === 'drybrush';
      const inkTitle = l === name && !!artRef('title') && (e.th.legacy ? (fam && chosen(e, 'typ.display.family')) || (dry && chosen(e, 'typ.titleFx')) : fam || dry);
      // 游戏名下面一行英文副标题（标题界面不再另画标题元素，副标题由这里给）
      // 主体在上、同一栏贴左（lay.focalSide = top，M12a-27）时标题与副标题贴左，其余居中
      // 显式给了 typ.align（@title，M12b-55）时跟它（center / left；justify 当 left）
      const taK = chosenKey(et, 'typ.align'), ta = taK ? textAlign(e, 'title') : null;
      const left = ta ? ta !== 'center' : e.r.str('lay.focalSide', '') === 'top' && e.r.str('lay.composition', '') !== 'splitTB';
      const ax = (w: number) => (left ? a.x : cx - w / 2);
      // 第二文字系统行（typ.display.secondary = latinCaps，M12b-55，ghost-of-tsushima#12）：英文副标题按主标题字号 × secondaryScale、字距 secondaryTracking、全大写
      const sec = e.th.legacy && !chosen(e, 'typ.display.secondary') ? 'none' : e.r.str('typ.display.secondary', 'none');
      const subT = p.game.subtitle, subO = sec === 'latinCaps' || sec === 'cjkVertical' ? { ...et.small, size: o.size * Math.max(0.2, Math.min(0.6, e.r.num('typ.display.secondaryScale', 0.3))), spacing: Math.max(0, Math.min(1, e.r.num('typ.display.secondaryTracking', 0.4))), upper: true, color: o.color } : { ...et.small, spacing: 0.4, color: o.color };
      const subLine = (y: number) => { if (l === name && W(et, subT, subO) <= a.w) T(et, subT, ax(W(et, subT, subO)), y, LH(et, subO), subO); };
      const ir = { x: a.x + (left ? 0 : a.w * 0.04), y: a.y + a.h * 0.1, w: a.w * 0.92, h: Math.min(a.h * 0.5, S(200)) };
      // 实际画出的范围（M12b-64 ①：模板里的元素按它避让，不按整栏）
      const subH = l === name ? LH(et, subO) + S(4) : 0;
      if (inkTitle && smooth(e.tx, () => drawInkTitle(e.tx, ir, o.color, left ? 'left' : 'center'))) { subLine(ir.y + ir.h + S(4)); FOCAL_BOX = { ...ir, h: ir.h + subH }; return; }
      const wl = W(et, l, o);
      T(et, l, ax(wl), a.y + a.h * 0.3, o.size * 1.4, o);
      subLine(a.y + a.h * 0.3 + o.size * 1.4 + S(4));
      FOCAL_BOX = { x: ax(wl), y: a.y + a.h * 0.3, w: wl, h: o.size * 1.4 + subH };
      return;
    }
    case 'card': {
      const h = a.h * 0.9, w = h * 0.68;
      panel(e.part('card'), { x: cx - w / 2, y: a.y + (a.h - h) / 2, w, h }, true, { radius: 10 });
      // 卡面插画：立绘铺满插画窗（选了全身就用全身，否则半身），裁切保留头部；没加载完时是灰盒
      const art = { x: cx - w / 2 + 10, y: a.y + (a.h - h) / 2 + 10, w: w - 20, h: h * 0.55 };
      const cf = characterImage(e.r, e.r.str('cnt.characterMedium', '') === 'full' ? 'full' : 'bust');
      if (cf && uiImage(cf)) { g.fillStyle = withAlpha(e.accent, 0.16); g.fillRect(art.x, art.y, art.w, art.h); smooth(g, () => drawImageFitFx(g, cf, art, 'cover', [0.5, 0.12], renderModeOf(e, 'character'))); }
      else drawGreybox(g, art, '卡面插画（需素材）', { small: true });
      badge(e, cx - w / 2 + 14, a.y + (a.h - h) / 2 + 14, S(14), 'crystal', '3');
      return;
    }
    case 'data': {
      const s = pack().screens.bigStat; const o = { ...e.title, size: Math.min(S(56), a.h * 0.35) };
      // 放不下这一栏就缩字（与 title 同口径：长分数、窄的竖屏 / 侧栏主体）
      const tw0 = W(e, s, o);
      if (tw0 > a.w * 0.92) o.size *= (a.w * 0.92) / tw0;
      T(e, s, cx - W(e, s, o) / 2, a.y + a.h * 0.3, o.size * 1.4, o);
      return;
    }
    case 'apparatus': case 'scene': default:
      // 场景主体的插画处理（cnt.illustrationRender 选过时，M12b-32，obra-dinn#27）：走插画槽（有主视觉位图时按模式处理，图窗处理 / 图注 / 外框照 cmp.panelArt*）
      // 场景主体的插画外框（cmp.panelArtFrame / ast.frame@panelArt 选过，M12b-21 顺延的 slay-the-spire#41：事件插画外一圈雕花画框）同样走插画槽
      if (focal === 'scene' && (renderModeOf(e, 'scene') !== 'color' || pickedStr(e.part('panelArt'), 'cmp.panelArtFrame', 'none') !== 'none' || scopedSet(e.part('panelArt'), 'ast.frame'))) { artSlot(e, a, 'scene', '场景', { decor: true }); return; }
      drawGreybox(g, a, focal === 'apparatus' ? '装置（需素材）' : focal === 'scene' ? '场景（需素材）' : focal, { radius: 8, labelTop: true });
  }
}

const templateLabelFromCtx = (e: ElCtx) => templateLabel(e.th);

/** 没画面板的容器里，显式选过的图窗类插画槽（M12b-32，xcom2#15）：window / collage / photomontage / halo，否则 none（header / full / side 仍只在有面板时画） */
function unframedArt(e: ElCtx): string {
  const v = pickedStr(e.part('panel'), 'cmp.panelArt', 'none');
  return v === 'window' || v === 'collage' || v === 'photomontage' || v === 'halo' ? v : 'none';
}
/** 图窗按宽高比定高（cmp.panelArtRatio，宽 ÷ 高，选过才算）：返回高（不超过 maxH），没选 null */
function artRatioH(e: ElCtx, w: number, maxH: number): number | null {
  const k = chosenKey(e.part('panelArt'), 'cmp.panelArtRatio'), v = k ? Number(e.r.get(k)) : NaN;
  return Number.isFinite(v) && v > 0 ? Math.min(maxH, w / Math.max(0.3, Math.min(4, v))) : null;
}
/**
 * 视频窗（M12b-32）：半透明的全息窗（B7 审查修复 ㉘：原来实底 #0b1416，挡住后面的场景）+ 说话人画面（半身位图按 cnt.characterRender 处理、0.8 不透明 + 青色 screen 着色，
 * 没有时剪影）+ 扫描线 + 两条信号中断 + 左上 REC；没有位图时底部标「影像窗（需素材）」
 */
const DROPOUT_AT = [0.32, 0.71];
function videoFeed(e: ElCtx, a: Rect) {
  const g = e.g, S = (n: number) => n * e.k, w = Math.min(a.w, a.h * 1.4), r = { x: a.x + (a.w - w) / 2, y: a.y + a.h * 0.08, w, h: Math.min(a.h * 0.84, w / 1.4) };
  g.save(); g.fillStyle = withAlpha('#0b1416', 0.55); g.fillRect(r.x, r.y, r.w, r.h); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
  g.save(); g.globalAlpha *= 0.8;
  const ok = smooth(g, () => drawImageFitFx(g, characterImage(e.r, 'bust'), r, 'cover', [0.5, 0.15], renderModeOf(e, 'character')));
  g.restore();
  if (ok) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = withAlpha('#2ad4c0', 0.28); g.fillRect(r.x, r.y, r.w, r.h); g.restore(); }
  else figure(e, { x: r.x + r.w * 0.25, y: r.y + r.h * 0.1, w: r.w * 0.5, h: r.h * 0.95 }, withAlpha('#7fe0d0', 0.7));
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = r.y; y < r.y + r.h; y += 3) g.fillRect(r.x, y, r.w, 1);
  // 信号中断：两条固定位置（模板画面按键缓存、不随模拟时钟重画，跳动的中断留给 M12c 的动效层，DROPOUT_AT 是它的起点）
  for (const k of DROPOUT_AT) { g.fillStyle = 'rgba(160,255,240,0.28)'; g.fillRect(r.x + r.w * 0.06, r.y + r.h * k, r.w, Math.max(1, r.h * 0.025)); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(r.x, r.y + r.h * k + r.h * 0.025, r.w * 0.45, Math.max(1, r.h * 0.015)); }
  g.restore();
  g.strokeStyle = withAlpha('#7fe0d0', 0.6); g.lineWidth = 1.5; g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = e.bad; g.beginPath(); g.arc(r.x + S(12), r.y + S(12), S(4), 0, Math.PI * 2); g.fill();
  T(e, 'REC', r.x + S(20), r.y + S(4), S(16), { ...e.small, weight: 800, color: '#fff' });
  if (!ok && (PLACEHOLDER.qa || !isHudCanvas(g))) { const l = '影像窗（需素材）'; plate(e, { x: r.x + r.w / 2 - (W(e, l, e.small) + S(20)) / 2, y: r.y + r.h - S(28), w: W(e, l, e.small) + S(20), h: S(22) }, l, 'pill', { size: e.small.size }); }
  FOCAL_BOX = r;
}
/** 无框物品展台（M12b-32）：顶上一束柔和的暖光（与 ast.bgArt = spotlightStage 同一种光色）+ 不带框的大号物品图（图集图标 / 符号） */
function focalBare(e: ElCtx, a: Rect) {
  const g = e.g, cx = a.x + a.w / 2, s = Math.min(a.w, a.h) * 0.62, light = mix(mix(e.accent, '#8a8a8a', 0.55), '#ffe2b0', 0.5);
  const gr = g.createRadialGradient(cx, a.y, s * 0.1, cx, a.y + a.h * 0.35, Math.max(a.w, a.h) * 0.7);
  gr.addColorStop(0, withAlpha(light, 0.45)); gr.addColorStop(1, withAlpha(light, 0)); g.fillStyle = gr; g.fillRect(a.x, a.y, a.w, a.h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, a.y + a.h / 2 + s * 0.48, s * 0.42, s * 0.07, 0, 0, Math.PI * 2); g.fill();
  const ft = pack().hud.featured;
  if (!itemIcon(e, ft.item, cx, a.y + a.h / 2, s)) icon(e, ft.glyph, cx, a.y + a.h / 2, s * 0.8, e.icon);
  FOCAL_BOX = { x: cx - s / 2, y: a.y + a.h / 2 - s / 2, w: s, h: s };
}

/** 面板压主体时立绘站的位置：画面一侧、贴底、约九成高 */
function standRect(R: Rect, side: string): Rect {
  const w = Math.max(R.w * 0.4, Math.min(R.w * 0.5, R.h * 0.62)), h = R.h * 0.92;
  const x = side === 'right' ? R.x + R.w * 0.96 - w : side === 'center' ? R.x + (R.w - w) / 2 : R.x + R.w * 0.04;
  return { x, y: R.y + R.h - h, w, h };
}

/** 只有主体的全屏页主体贴一侧（M12b-64 ⑤）：宽同 standRect，从面板顶部 4% 到面板底边，贴面板左 / 右缘 */
function sideStand(o: Rect, R: Rect, side: string): Rect {
  const w = Math.min(o.w, standRect(R, side).w), y = o.y + o.h * 0.04;
  return { x: side === 'right' ? o.x + o.w - w : o.x, y, w, h: o.y + o.h - y };
}

/** 程序化人物剪影：头 + 肩 + 身体（立绘的占位） */
/**
 * 详情属性旁的变化值（审查修复 E 视觉 ⑦：原来每一行都写死「→ 74」「+12」）：品质下限开着时按这一项的数值写（arrow = 换上以后的值、plus = 增量），
 * 颜色是好色、对面板底至少 4.5 : 1（浅色面板上的亮绿原来只有 2.3 : 1）
 */
function deltaText(delta: string, v: number): string {
  if (!QUALITY.on) return delta === 'plus' ? '+12' : '→ 74';
  const n = Math.round(Math.max(0, Math.min(1, v)) * 100);
  return delta === 'plus' ? `+${Math.max(1, Math.round(n / 8))}` : `→ ${Math.min(100, n + 6)}`;
}
const deltaColor = (e: ElCtx) => (QUALITY.on ? ensureContrast(resolveColor(semantic(e, 'good'), e.pal), resolveColor(e.th.surface, e.pal, '#fff'), 4.5) : semantic(e, 'good'));
function figure(e: ElCtx, a: Rect, color: string) {
  const g = e.g, cx = a.x + a.w / 2, h = Math.min(a.h, a.w * 2.2) * 0.92, top = a.y + (a.h - h) / 2;
  const gr = g.createLinearGradient(0, top, 0, top + h);
  gr.addColorStop(0, withAlpha(color, 0.85)); gr.addColorStop(1, withAlpha(color, 0.25));
  g.save(); g.fillStyle = gr;
  g.beginPath(); g.arc(cx, top + h * 0.12, h * 0.09, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - h * 0.16, top + h * 0.26); g.quadraticCurveTo(cx, top + h * 0.2, cx + h * 0.16, top + h * 0.26);
  g.lineTo(cx + h * 0.2, top + h * 0.62); g.lineTo(cx + h * 0.12, top + h); g.lineTo(cx - h * 0.12, top + h); g.lineTo(cx - h * 0.2, top + h * 0.62); g.closePath(); g.fill();
  g.restore();
}

/** VS 的一边：立绘裁在斜切的那一块里（完整放进、贴底居中）；fx = cnt.characterRender（B7 审查修复 ㉓）；位图没加载完返回 false */
function vsSide(g: CanvasRenderingContext2D, poly: [number, number][], file: string | null, r: Rect, fx = 'color'): boolean {
  if (!file || !uiImage(file)) return false;
  g.save();
  g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  smooth(g, () => drawImageFitFx(g, file, r, 'contain', [0.5, 1], fx));
  g.restore();
  return true;
}

/* ---------------- 主数据 ---------------- */

/** 条目数（cnt.itemCount；M12a-10 起是 core.ts 的 itemCount，树 / 网格 / 星图另按 itemCountOr 跟信息密度） */
const count = itemCount;

/** 空状态（集合 / 列表一个条目都没有）：按界面选插画——背包、邮件、空座位（好友 / 公会 / 排行），其余是放大镜；下面一句说明 */
function emptyState(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k;
  const sel = e.r.art[SELECTORS.screen];
  const key = `${e.r.str('cnt.subtype', '')} ${typeof sel === 'string' ? sel : ''}`;
  const name = /inventory|bag|packGrid/.test(key) ? 'bag' : /mail/.test(key) ? 'mail' : /friends|guild|social|leaderboard/.test(key) ? 'seat' : 'search';
  const o = { ...e.base, color: withAlpha(ink ?? e.text, 0.7) };
  const cap = '这里还什么都没有';
  const s = Math.max(S(48), Math.min(a.w * 0.5, a.h * 0.55, S(180)));
  const ir = { x: a.x + (a.w - s) / 2, y: a.y + Math.max(0, (a.h - s - LH(e, o) - S(10)) / 2), w: s, h: s };
  if (!smooth(e.g, () => drawAtlasItem(e.g, 'ui_empty_states', name, ir))) drawGreybox(e.g, ir, '空状态插画', { small: true, radius: 8 });
  T(e, cap, a.x + a.w / 2 - W(e, cap, o) / 2, ir.y + s + S(10), LH(e, o), o);
}

/** reserve = 右边让出给浮动详情的宽（M12a-26 的 reservedRight，只有列表 / 网格接受） */
function drawData(e: ElCtx, a: Rect, shape: string, ink?: string, reserve = 0) {
  const r = e.r;
  const arr = r.str('lay.arrangement', '');
  const sub = r.str('cnt.subtype', '');
  // 分段数据区（lay.sections，M12b-11）：选过时整块数据区按段画，不再走单一的数据结构
  const secs = sectionsOf(e);
  if (secs && shape !== 'spatial' && shape !== 'network' && shape !== 'hierarchy') return sectionedData(e, a, secs, ink);
  switch (shape) {
    case 'collection':
      // 双网格（lay.composition = dualGrid）、主体两侧列 / 固定分组（lay.arrangement，M12b-11）
      if (r.str('lay.composition', '') === 'dualGrid' && chosen(e, 'lay.composition')) return dualGrid(e, a, ink);
      if (arr === 'flankColumns') return flankColumns(e, a, ink);
      if (arr === 'fixedGroups') return fixedGroups(e, a, ink);
      if (sub === 'server' || sub === 'mail' || sub === 'saveSlot' || sub === 'leaderboard') return listRows(e, a, ink, reserve);
      if (arr === 'grid' || arr === 'hexGrid' || arr === 'mosaic') return gridItems(e, a, arr === 'hexGrid', ink, false, reserve);
      if (arr === 'pyramid') return pyramid(e, a);
      if (arr === 'ring' || arr === 'cross') return ringItems(e, a, arr === 'cross');
      if (arr === 'fan') return fanCards(e, a);
      if (arr === 'spread') return spreadCards(e, a, ink);
      if (arr === 'scatter') return network(e, a, 'scatter');
      if (arr === 'row' && (sub === 'draft3' || r.str('cmp.slot', '') === 'tallCard')) return cardsRow(e, a, ink);
      return listRows(e, a, ink, reserve);
    case 'sequence':
      if (arr === 'grid') return gridItems(e, a, false, ink, true);
      if (arr === 'path' || arr === 'tower') return pathNodes(e, a, arr === 'tower');
      return track(e, a, ink);
    case 'network': case 'hierarchy':
      return network(e, a, arr === 'constellation' || arr === 'scatter' || arr === 'radialTree' ? arr : 'tree');
    case 'table': return table(e, a, ink);
    case 'form': return form(e, a, ink);
    case 'text': return textBlock(e, a, ink);
    case 'spatial': return mapView(e, a, MAP_BLED);
    case 'scalar': {
      const s = '¥ 8.88'; const o = { ...e.title, size: Math.min(e.k * 64, a.h * 0.4), color: '#ffd34d' };
      T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y + a.h * 0.3, o.size * 1.4, o);
      return;
    }
    case 'record': return drawDetail(e, a, ink);
  }
}

/**
 * 列表 / 网格条目的矩形（不画，M12a-26 浮动详情的预排用）：与 drawData 同一个分支、同一套几何（lattice / listPlan）；其余数据结构返回空
 */
function itemRects(e: ElCtx, a: Rect, shape: string): Rect[] {
  const r = e.r, arr = r.str('lay.arrangement', ''), sub = r.str('cnt.subtype', '');
  if (sectionsOf(e) || arr0dual(e)) return [];
  const grid = (shape === 'collection' && (arr === 'grid' || arr === 'hexGrid' || arr === 'mosaic') && !['server', 'mail', 'saveSlot', 'leaderboard'].includes(sub)) || (shape === 'sequence' && arr === 'grid');
  if (grid) {
    const days = shape === 'sequence', n0 = days ? count(e, 7) : itemCountSet(e) ? count(e, 12, true) : itemCountOr(e, 6);
    const g0 = days ? null : gridDeco(e), a1 = g0 ? gridBody(e, a, g0) : a, n1 = days ? n0 : gridFill(e, n0).n;
    return lattice(e, a1, { n: n1, kind: r.str('cmp.slot', 'cell'), hex: arr === 'hexGrid', days, ...(days ? {} : packOf(e, n1)) }).rects;
  }
  const list = shape === 'collection' && (['server', 'mail', 'saveSlot', 'leaderboard'].includes(sub) || !['pyramid', 'ring', 'cross', 'fan', 'scatter', 'spread', 'flankColumns', 'fixedGroups', 'grid', 'hexGrid', 'mosaic'].includes(arr) && !sectionsOf(e) && !(r.str('lay.composition', '') === 'dualGrid' && chosen(e, 'lay.composition'))) && !(arr === 'row' && (sub === 'draft3' || r.str('cmp.slot', '') === 'tallCard'));
  if (!list) return [];
  const P = listPlan(e, a);
  if (!P.full) return [];
  const out: Rect[] = [];
  for (let i = 0; i < P.n; i++) { const y = P.rowY(i); if (y + P.rh > P.a.y + P.a.h + 0.5) break; out.push({ x: P.a.x, y, w: P.a.w, h: P.rh }); }
  return out;
}

/**
 * 条目状态（M12a-10）：逐条声明的（菜单物品第 5 项的 ItemState）优先，渲染只按声明画；没声明时按序号演示（cnt.stateDemo）——
 * 锁定从 cnt.lockedFrom 起（auto = 第 6 个，原来写死的 LOCKED_FROM）、第 2 个是新品、稀有度按序号（第 4 / 9 个史诗、第 3 个稀有）；
 * st.locked / st.newCue 没选（none）时不演示；内容包 menu.itemStates = none 关掉演示、noRarity 不画稀有度
 */
function itemState(e: ElCtx, i: number, st?: ItemState): { locked: boolean; fresh: boolean; rarity?: number } {
  const menu = pack().menu;
  const demo = stateDemo(e, declaredStates(menu.items, 4), menu.itemStates === 'none');
  // 读格子部件的作用域（审查修复 A · C10：st.locked@slot / st.newCue@slot 原来在模板网格里不生效，slot() 自己却认它）；旧皮肤上皮肤之前的作用域键不算（chosenKey）
  const es = e.part('slot'), sv = (k: string) => { const ck = chosenKey(es, k); return ck?.includes('@') ? e.r.str(ck, '') : e.r.str(k, ''); };
  const lk0 = sv('st.locked'), lockOn = lk0 !== '' && lk0 !== 'none';
  const cue = sv('st.newCue') || 'none', cueOn = cue !== 'none' && cue !== '';
  const rarity = !packRarity() ? undefined : st ? st.rarity : demo ? (i % 5 === 3 ? 3 : i % 7 === 2 ? 2 : undefined) : undefined;
  if (st) return { locked: lockOn && !!st.locked, fresh: cueOn && !!st.fresh, rarity };
  const from = lockedFrom(e, demo);
  return { locked: lockOn && i >= from, fresh: demo && cueOn && i === 1, rarity };
}

function opsBadge(e: ElCtx, rr: Rect, i: number) {
  const list = e.r.list('ops.badges');
  if (!list.length || i > 2) return;
  const S = (n: number) => n * e.k;
  const kind = list[i % list.length];
  const L: Record<string, string> = { countdown: '⏱ 2天', discount: '-30%', limit: '限购 1/3', multiplier: '×2', recommend: '热卖', gift: '赠', strike: '¥68', pity: '保底 72' };
  const l = L[kind] ?? kind;
  const w = W(e, l, { ...e.small, weight: 800 }) + S(10);
  e.g.fillStyle = kind === 'discount' || kind === 'recommend' ? e.bad : kind === 'countdown' ? '#e3b341' : e.accent;
  e.g.fillRect(rr.x + rr.w - w, rr.y, w, S(18));
  T(e, l, rr.x + rr.w - w + S(5), rr.y, S(18), { ...e.small, weight: 800, color: '#fff' });
}

/** 成就墙的徽章设计（达成与否与 screens.achievements 的进度一致：前两个达成） */
const ACH_BADGE = ['trophy', 'medal', 'winged', 'laurel', 'crest', 'stamp', 'chevron', 'crystal'];

/** px@1080p 的版式尺寸参数（lay.cellSize / lay.gap，M12a-28）：显式给了数时 = px1080(值) × 界面缩放（a11y.uiScale），与字号分开；没给 / auto 时 null */
function pxParam(r: ElCtx['r'], k: string): number | null {
  const v = r.get(k), n = typeof v === 'number' ? v : Number(v);
  if (v === undefined || v === null || v === '' || v === 'auto' || !Number.isFinite(n)) return null;
  return px1080(Math.max(0, n)) * Math.max(0.5, r.num('a11y.uiScale', 1));
}
/** 显式给了的数值参数（没给 / auto 时 null） */
function numParam(r: ElCtx['r'], k: string): number | null {
  const v = r.get(k), n = typeof v === 'number' ? v : Number(v);
  return v === undefined || v === null || v === '' || v === 'auto' || !Number.isFinite(n) ? null : n;
}

/** 画成卡的格子的选中边（M12b-10 / 12）：st.selected（按 @slot → 全局）= outline / dashed / glow 时沿卡外一圈焦点色，其余不画 */
function cardSelectEdge(e: ElCtx, rr: Rect) {
  const es = e.part('slot'), m = es.v.str('st.selected', 'outline'), g = e.g;
  if (m !== 'outline' && m !== 'dashed' && m !== 'glow' && m !== 'auto') return;
  g.save(); g.strokeStyle = es.focus; g.lineWidth = 2.5; if (m === 'dashed') g.setLineDash([5, 3]); if (m === 'glow') { g.shadowColor = es.focus; g.shadowBlur = 12; }
  g.strokeRect(rr.x - 1, rr.y - 1, rr.w + 2, rr.h + 2); g.restore();
}
/** 网格卡的说明（M12b-12 / 69：卡内子件 iconDesc、TCG 文本框）：结构化样本（图鉴 / 天赋 / 建筑……）的说明，物品没有说明 */
const cardDesc = (r: ElCtx['r'], i: number): string => { const rows = kindRows(sampleKind(r)); return rows?.length ? rows[i % rows.length].desc : ''; };
/** 网格里画成竖卡的格子结构（M12b-12：cmp.slot 的 portraitCard / collectionCard，与 tallCard 一样竖长；card = 按 cmp.card 画卡面、宽高比照方格） */
const CARD_SLOTS = new Set(['portraitCard', 'collectionCard']);
/** lattice 的输入（M12a-28）：n = 格数；kind = cmp.slot（cell / tallCard / rowCard / bare）；hex = 六角网错位；reservedRight = 右边让出给浮动详情的宽（M12a-26）；focus = 焦点格序号（−1 = 没有） */
interface LatticeSpec { n: number; kind: string; hex: boolean; days?: boolean; reservedRight?: number; focus?: number;
  /** 跨格（M12b-10）：每个条目占几列 × 几行；pinned = 前几个条目排成独立的置顶行（lay.pinned = pinTop）；mosaic = 马赛克瓷砖墙（格高按可用高放大） */
  spans?: [number, number][]; pinned?: number; mosaic?: boolean }
/**
 * lattice 的结果：rects = 画得下的各格（超出一页的截掉，shown = 画了几格）；w / h = 格子的宽高（焦点格放大前）；pitchY = 行距；
 * content = 画出来的那块（滚动条贴它，M12a-34）；need = 自然尺寸下（不为放下而缩格）铺下全部行要多大（M12a-38 的 fitContent 测量）
 */
interface LatticeOut { cols: number; rows: number; w: number; h: number; gap: number; pitchY: number; rects: Rect[]; shown: number; content?: Rect; need: { w: number; h: number }; focusScaled: boolean;
  /** 跨格的条目（M12b-10：画成横版瓷砖卡）与马赛克墙 */
  spanned?: boolean[]; mosaic?: boolean }

/**
 * 集合网格的几何（M12a-28，§2 的 lattice(e, a, spec)；原来 gridItems 里写死）：
 *   列数 = lay.columns（上限 12），只在格宽小于下限时减列——下限 = max(触控下限, 40)（竖卡 90），显式给了 cnt.density 时按密度 48 / 44 / 40 / 36 / 32 收（Factorio 的 10 列小格）；
 *   格宽 = min(按列数均分的宽, 边长上限)：上限 = lay.cellSize（px@1080p，与字号分开），没给时原来的 86（竖卡 160）；格高 = 格宽 ÷ 宽高比（lay.cellAspect，没给时方格 1、竖卡 1 / 1.4）；
 *   行数 = ⌈n / 列数⌉，放不下全部行时格高按 (数据区高 − 行间距) ÷ 行数反推、格宽按比例跟着缩（最小到下限）；缩到下限仍放不下才按自然尺寸截到一页（超过一页才分页）——原来第二行放不下就截掉，
 *   Balatro 图鉴 7 列 14 张只画 1 行、B5 的按钮行把签到格的后几天挤掉；
 *   六角网（hex）：行距 = 格高 × 形状系数（vis.silhouette@slot：hexagon 0.75 / diamond 0.5 / circle 0.866，其余 1 = 错位不咬合）+ 间距，奇数行右移半格（含半个间距），
 *   总宽按 (列数 + 0.5) 格算（原来行距固定 0.86 × (格高 + 间距)，方格 / 竖卡压住上一行，半格偏移没算进总宽，最后一列伸进详情栏）；
 *   ix.focus = scale（显式选的）时焦点格放大 1.12、同行左右的格子各外推 6%，行间距加上放大与焦点框的外扩（FH5 的瓷砖）。
 * 格间距 = lay.gap（px@1080p），没给时原来的 8。Godot：GridContainer（columns、h / v_separation）+ 格子 custom_minimum_size；六角网 / 放大焦点要自定义 Container
 */
function lattice(e: ElCtx, a: Rect, spec: LatticeSpec): LatticeOut {
  const S = (n: number) => n * e.k, r = e.r, tp = tap(e), { n, kind, hex } = spec;
  const aw = Math.max(0, a.w - Math.max(0, spec.reservedRight ?? 0));
  const gap = pxParam(r, 'lay.gap') ?? S(8);
  const tall = kind === 'tallCard' || CARD_SLOTS.has(kind);
  // 格宽下限：显式给了信息密度时按密度收（M12a-28）；显式给了更小的格边长时以它为准（不低于触控下限）
  const dl = densityLevel(e), dk = dl < 0 ? 1 : [1.2, 1.1, 1, 0.9, 0.8][dl];
  const cellSize = pxParam(r, 'lay.cellSize');
  const minD = S(tall ? 90 : 40) * dk;
  const minW = Math.max(tp, cellSize !== null ? Math.min(cellSize, minD) : minD);
  const colsWant = Math.max(1, Math.min(12, Math.round(r.num('lay.columns', spec.days ? 4 : 5))));
  // 六角网的行距系数（按格子的外形咬合）；菱形咬合时行距再加半个间距（M12b-67，disco-elysium#31：原来斜边几乎贴在一起，读成一整块菱形阵）
  const sil = hex ? silhouetteOf(e, 'slot') : null;
  // 格下标牌（cmp.slotLabel，M12b-01）选过时行距加上标牌伸出格子下沿的高度（方格才有标牌）
  const labGap = kind === 'tallCard' || kind === 'rowCard' ? 0 : slotLabelH(e, 999);
  // 按列咬合（R4 审查修复 ⑲，disco-elysium#31 的「菱形按 0.5 格高错位」）：菱形 / 六角的格子带格下标牌时，相邻两列上下错开半个行距——标牌挂在自己那一列的格子下面，
  // 旁边那一列的格子正好落在两个标牌之间（参考的思想柜）；列距按整格宽、行距 = 格高 + 标牌 + 间距。C2 ⑧ 之后是一排排错半格的「砖墙」、行与行之间空着一大条。
  // 方格 / 圆这类不按外形咬合的仍照 C2 ⑧（不咬合、奇数行右移半格）；没有标牌时照原来按行咬合
  const colLock = hex && labGap > 0 && (sil === 'diamond' || sil === 'hexagon');
  // 六角网多出半格（含半个间距）：只在有第二行时（按列咬合时不横着错开）
  const half = hex && !colLock && n > 1 ? 0.5 : 0;
  const fitCols = Math.floor((aw + gap - half * (minW + gap)) / (minW + gap));
  const cols = Math.max(1, Math.min(colsWant, fitCols));
  const hx = hex && !colLock && n > cols ? 0.5 : 0;
  const cw = (aw - (cols - 1) * gap - hx * gap) / (cols + hx);
  const aspect0 = numParam(r, 'lay.cellAspect');
  const aspect = aspect0 !== null && aspect0 > 0 ? Math.max(0.2, Math.min(5, aspect0)) : tall ? 1 / 1.4 : 1;
  const rows = Math.ceil(n / cols);
  // 按列咬合时奇数列整列下移半个行距（只有一列 / 一格时不移）
  const colShift = colLock && cols > 1 && n > 1 ? 0.5 : 0;
  // 有格下标牌时不咬合（R4 C2 ⑧，disco-elysium#31：标牌宽 ≥ 0.9 格、挂在格子下沿下面，咬合的下一行错开半格的菱形 / 六角正好压在它上面）：行距按整格高算，
  // 奇数行照旧右移半格（错位还在，只是上下不再嵌进去）
  const fY = hex && !labGap ? (sil === 'hexagon' ? 0.75 : sil === 'diamond' ? 0.5 : sil === 'circle' ? 0.866 : 1) : 1;
  const gapY = (hex && sil === 'diamond' ? gap * 1.5 : gap) + labGap;
  // 焦点放大（ix.focus = scale，显式选的）：M12b-67 起只是画的时候以格心放大、画在邻格上面（gridItems），不再推开同行的格子、不再加行距（forza-horizon-5#26：原来同排瓷砖被推开、两排错位）
  const focusScaled = (spec.focus ?? -1) >= 0 && chosen(e, 'ix.focus') && r.list('ix.focus').includes('scale');
  let w: number, h: number;
  if (kind === 'rowCard') { w = cw; h = Math.max(S(48), tp); }
  else {
    const cap = cellSize ?? S(tall ? 160 : 86);
    const w0 = Math.max(tp, Math.min(cw, cap)), h0 = w0 / aspect;
    // 放不下全部行：格高按行数反推（不低于下限），宽按比例跟着缩
    // 最后一行的格下标牌也要放得下（R4 C2 ⑧：原来反推格高时没扣它，下面的逐行判断按格高 + 标牌算，末行因差一个标牌高被整行截掉）
    // 按列咬合（colShift）时奇数列多下移半个行距：(rows − 1 + 0.5) 个行距 + 格高 + 标牌（fY = 1）
    const hFit = (a.h - labGap - (rows - 1 + colShift) * gapY) / (1 + (rows - 1 + colShift) * fY);
    // 收到下限仍放不下全部行：按自然尺寸截到一页（分页 / 滚动，与列表同口径）
    const hMin = Math.min(h0, Math.max(tp, minW / aspect));
    h = hFit >= h0 || hFit < hMin ? h0 : hFit;
    w = h === h0 ? w0 : h * aspect;
  }
  // 跨格 / 置顶行 / 马赛克（M12b-10）：按 spans 逐个放进列格（行优先，先到先占），置顶行之后另起一行、多留一个间距
  if (spec.spans) { const wN0 = Math.max(tp, Math.min(cw, cellSize ?? S(tall ? 160 : 86))); return packedLattice(e, a, spec, { cols, gap, w, h, aw, tp, cellSize, wN: wN0, hN: wN0 / aspect }); }
  const pitchY = h * fY + gapY;
  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, row = Math.floor(i / cols);
    const x = a.x + c * (w + gap) + (hex && !colLock && row % 2 ? (w + gap) / 2 : 0), y = a.y + row * pitchY + (colShift && c % 2 ? pitchY * colShift : 0);
    if (y + h + labGap > a.y + a.h + 0.5) break;
    rects.push({ x, y, w, h });
  }
  const shown = rects.length;
  const sr = Math.ceil(shown / cols);
  // 画出来的那块：与原来的式子一致（不含焦点放大）
  const content = shown ? { x: a.x, y: a.y, w: Math.min(shown, cols) * (w + gap) - gap + (hex && !colLock && sr > 1 ? (w + gap) / 2 : 0), h: (sr - 1) * pitchY + h + labGap + (colShift && shown > 1 ? pitchY * colShift : 0) } : undefined;
  // fitContent 的测量（M12a-38）：宽 = 这一遍实际的格宽铺满列数（缩过的格子按缩后的宽），高 = 自然格高（不为放下而缩）铺下全部行——容器先按高收放，再按宽收
  const wN = kind === 'rowCard' ? cw : Math.max(tp, Math.min(cw, cellSize ?? S(tall ? 160 : 86))), hN = kind === 'rowCard' ? h : wN / aspect;
  const need = { w: kind === 'rowCard' ? aw : cols * w + (cols - 1) * gap + (hex && !colLock && rows > 1 ? (w + gap) / 2 : 0), h: hN + (rows - 1 + colShift) * (hN * fY + gapY) + labGap };
  return { cols, rows, w, h, gap, pitchY, rects, shown, content, need, focusScaled: focusScaled && kind !== 'rowCard' };
}
/** 焦点放大的矩形（M12b-67）：以格心放大 1.12（ix.focus = scale；只是绘制变换，不参与排位） */
const scaledRect = (q: Rect, k = 1.12): Rect => ({ x: q.x + (q.w * (1 - k)) / 2, y: q.y + (q.h * (1 - k)) / 2, w: q.w * k, h: q.h * k });

/**
 * 网格的格子占用（M12a-28）：cnt.slotCount = 总格数（没给 = 条目数）；已占用 = cnt.filledCount → cnt.fillRatio × 总格数 → 显式的 cnt.itemCount（不超过总格数）→ 全满（原来的样子）；
 * 其余是空格（st.emptySlot 画：+ 号 / 暗坑 / 剪影 / 虚线 / 留白 / 问号 / 不画；空格不画稀有度与数量）。哪几格有东西：cnt.fillOrder = first（默认，从前往后）/ scattered（按确定的哈希穿插，第一格总有东西）
 */
function gridFill(e: ElCtx, n0: number): { n: number; empty: (i: number) => boolean } {
  const r = e.r;
  // 层次（整合修复 U#25：背包模板默认 24 格装 8 件）：格数 / 装填数 / 装填比例比显式给的条目数（cnt.itemCount）低一层时不算——
  // 名作、场景、手动写了「这一屏画 36 格」时，界面模板预设的 24 格不能把它截短（星露谷 36 格、异星工厂 40 格的背包照旧）
  const icL = itemCountSet(e) ? LAYER_RANK[r.src('cnt.itemCount')!.layer] : -Infinity;
  const own = (k: string) => { const l = r.src(k)?.layer; return !l || LAYER_RANK[l] >= icL ? numParam(r, k) : null; };
  const sc = own('cnt.slotCount');
  const n = sc !== null && sc > 0 ? Math.min(MAX_ITEMS, Math.round(sc)) : n0;
  const fc = own('cnt.filledCount'), fr = own('cnt.fillRatio');
  const filled = fc !== null ? Math.max(0, Math.min(n, Math.round(fc))) : fr !== null ? Math.max(0, Math.min(n, Math.round(n * Math.max(0, Math.min(1, fr))))) : sc !== null && itemCountSet(e) ? Math.min(n, itemCount(e, n, true)) : n;
  if (filled >= n) return { n, empty: () => false };
  if (r.str('cnt.fillOrder', 'first') !== 'scattered' || filled === 0) return { n, empty: (i) => i >= filled };
  // 穿插：第 0 格总有东西（选中 / 焦点落在物品上），其余按 FNV 哈希排序取前 filled − 1 个
  const hash = (i: number) => { let x = 2166136261 ^ (i * 2654435761); x = Math.imul(x ^ (x >>> 13), 16777619); return (x >>> 0) / 4294967295; };
  const order = Array.from({ length: n - 1 }, (_, k) => k + 1).sort((p, q) => hash(p) - hash(q));
  const on = new Set<number>([0, ...order.slice(0, filled - 1)]);
  return { n, empty: (i) => !on.has(i) };
}

function gridItems(e: ElCtx, a: Rect, hex: boolean, ink?: string, days = false, reserve = 0) {
  const S = (n: number) => n * e.k, r = e.r;
  // 条目数：显式给了 cnt.itemCount 就是它，否则原来的 6 个 × 信息密度倍数（M12a-10；签到固定按 itemCount）
  const n0 = days ? count(e, 7) : itemCountSet(e) ? count(e, 12, true) : itemCountOr(e, 6);
  if (n0 === 0 && !days && numParam(r, 'cnt.slotCount') === null) return emptyState(e, a, ink);
  // 格子占用（cnt.slotCount + cnt.filledCount / cnt.fillRatio，M12a-28）：签到格不分空格
  const occ = days ? { n: n0, empty: () => false } : gridFill(e, n0);
  const n = occ.n;
  // 图鉴默认不写数量、不画稀有度（M12a-10）：显式选了 cmp.slotBadge / st.rarityCue 才画
  // 结构化样本（M12b-62：图鉴条目、建筑、局内菜单入口、角色……）同样默认不写数量、不画稀有度（elden-ring#38：菜单入口格原来带数量与稀有度侧条）
  const sk = GRID_SOURCE?.kind ?? sampleKind(r), typed = sk !== 'items' && kindRows(sk) !== null;
  const codex = r.str('cnt.screen', '') === 'screen.codex' || r.str('cnt.subtype', '') === 'collection' || typed;
  const qtyOn = !codex || chosen(e, 'cmp.slotBadge'), rarOn = !codex || chosen(e, 'st.rarityCue');
  const kind = r.str('cmp.slot', 'cell');
  // 网格几何（M12a-28 的 lattice）：列数、格子尺寸、六角网行距、焦点放大；焦点格 = 流程演示指定的 / 导航焦点时第一格
  // 只读（ix.mode = readOnly，M12b-67，into-the-breach#37 / Balatro 图鉴）：没有流程指定焦点时不默认焦点 / 选中第一格（旧皮肤见 readOnlyNoFocus）
  const readOnly = readOnlyNoFocus(e);
  const fl = flowNow(), focusI = fl?.s.focus !== undefined ? fl.s.focus : focusActive(e) && !readOnly ? 0 : -1;
  // 网格页眉 / 页脚（M12b-10：lay.gridHeader / gridFooter 选过时先从数据区扣掉一行）、跨格 / 置顶 / 马赛克（packOf）
  const deco = days ? null : gridDeco(e), a0 = a;
  if (deco) a = gridBody(e, a, deco);
  const L = lattice(e, a, { n, kind, hex, days, reservedRight: reserve, focus: focusI, ...(days ? {} : packOf(e, n)) });
  const { w } = L;
  // 凹槽分组（lay.grouping = wells 选过，M12b-36，factorio#0「槽凹」）：整块格子先垫一块内凹槽（tokens.well），格子画在槽里
  if (r.str('lay.grouping', '') === 'wells' && chosen(e, 'lay.grouping') && L.rects.length) {
    const xs = L.rects.map((q) => q.x), ys = L.rects.map((q) => q.y), pad = S(4);
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
    wellBox(e, { x: x0, y: y0, w: Math.max(...L.rects.map((q) => q.x + q.w)) + pad - x0, h: Math.max(...L.rects.map((q) => q.y + q.h)) + pad - y0 });
  }
  // 网格行间的分隔线（vis.dividerPlace = gridRows，M12b-45）：相邻两行之间的空当正中一条，宽 = 整块格子
  if (dividerPlaces(e)?.includes('gridRows') && L.rects.length) {
    const rows = [...new Set(L.rects.map((q) => Math.round(q.y)))].sort((p, q) => p - q), x0 = Math.min(...L.rects.map((q) => q.x)), x1 = Math.max(...L.rects.map((q) => q.x + q.w));
    for (let i = 1; i < rows.length; i++) { const bottom = Math.max(...L.rects.filter((q) => Math.round(q.y) === rows[i - 1]).map((q) => q.y + q.h)); if (rows[i] > bottom) ruleLine(e, x0, x1, Math.round((bottom + rows[i]) / 2)); }
  }
  // 样本不够时循环取，第二轮起名字编号（M12a-10）。名册 / 角色（每包 3 条）不循环（中期审查修复 ④：循环出「艾琳 2」、首字格一排同样的字）：
  // 样本之外的格子画成空格（st.emptySlot），与菜单列表不循环同一口径
  const src = gridSource(e), single = ['roster', 'characters'].includes(sk), surplus = (i: number) => single && i >= src.length;
  const items = sampleItems(src, Math.max(n, 1));
  // 条目登记按序号（第一个条目 / 焦点 / 浮动详情的避让，签到格不登记——原来就是这样）；放大的焦点格登记放大后的矩形（焦点框画在它外面）
  const zoomed = (i: number) => L.focusScaled && i === focusI;
  if (!days) L.rects.forEach((rr, i) => markItem(e, zoomed(i) ? scaledRect(rr) : rr, i));
  // 放大的焦点格最后画（压在相邻格上面）：以格心为原点放大 1.12 的绘制变换，不改排位（M12b-67）
  const order = L.rects.map((_, i) => i);
  if (L.focusScaled && focusI >= 0 && focusI < order.length) { order.splice(focusI, 1); order.push(focusI); }
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  // 网格里的行卡画 cmp.listRow 的右侧字段（M12b-67，civ6#48）：与列表行共用 rowValueTime
  const rowF = r.list('cmp.listRow').filter((x) => x !== 'auto');
  const tintOn = slotTintOn(e), labOn = slotLabelOf(e) !== 'none';
  // 格子画成卡（cmp.slot = card，M12b-12：FH5 的照片瓷砖）：版式按 cmp.card，没选时横版瓷砖 tile
  const cardDef = cardKind(e) === 'iconCard' ? 'tile' : undefined;
  // 墨团底衬（ast.ornaments = inkBacking，M12b-49，disco-elysium#22）：每行最左一格画成属性块——类别色水墨团上压一个超大白数字（不画格框与图标）
  const inkOn = !days && !!e.t.panel.ornament?.parts.includes('inkBacking') && L.rects.length > 0, col0 = inkOn ? Math.min(...L.rects.map((q) => Math.round(q.x))) : NaN;
  const rowsY = inkOn ? [...new Set(L.rects.map((q) => Math.round(q.y)))].sort((p, q) => p - q) : [];
  for (const i of order) {
    const rr = L.rects[i];
    if (inkOn && Math.round(rr.x) === col0 && !occ.empty(i) && !surplus(i)) {
      const row = rowsY.indexOf(Math.round(rr.y)), c = lineColor(e, row) ?? INK_BACKING[row % INK_BACKING.length], s0 = Math.min(rr.w, rr.h);
      inkBlob(e.g, rr.x + rr.w / 2, rr.y + rr.h / 2, s0 * 1.05, c, row + 1);
      const q = items[i][2], num = /^\d+$/.test(String(q)) && Number(q) > 0 && Number(q) < 100 ? String(q) : String(2 + (row % 4));
      const no: TextOpts = { ...e.title, size: s0 * 0.58, weight: 900, color: '#fff', outline: { color: withAlpha('#000', 0.35), width: Math.max(1, s0 * 0.03) } };
      T(e, num, rr.x + rr.w / 2 - W(e, num, no) / 2, rr.y, rr.h, no);
      continue;
    }
    const z = zoomed(i);
    if (z) for (const c of ctxs) { c.save(); c.translate(rr.x + rr.w / 2, rr.y + rr.h / 2); c.scale(1.12, 1.12); c.translate(-(rr.x + rr.w / 2), -(rr.y + rr.h / 2)); }
    try {
    // 空格（M12a-28）：按 st.emptySlot 画，不画稀有度 / 数量；剪影用这格物品的符号
    if (occ.empty(i) || surplus(i)) { slot(e, rr, surplus(i) ? '' : items[i][0], { empty: true }); continue; }
    const st = itemState(e, i, items[i][4]);
    if (days) {
      // 签到：第几天 + 奖励，已签的打勾，第 7 天大奖
      const big = i === 6;
      panel(e, big ? { ...rr, w: w * 1 } : rr, true, { radius: 8 });
      T(e, `第 ${i + 1} 天`, rr.x + S(6), rr.y + S(2), LH(e, e.small), { ...e.small, color: ink ?? e.text });
      icon(e, big ? '✦' : '●', rr.x + rr.w / 2, rr.y + rr.h * 0.58, rr.h * 0.28, big ? rarityColor(e, 4) : '#e3b341');
      if (i < 3) { e.g.fillStyle = withAlpha('#000', 0.35); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); icon(e, '✓', rr.x + rr.w / 2, rr.y + rr.h / 2, rr.h * 0.4, e.good); }
      logTarget(e.g, rr, `第 ${i + 1} 天`);
      continue;
    }
    // 当前包的物品：声明了图集图标的按物品名查图标；没声明的只给符号（雪线旅人按符号猜图标，别的包画符号）
    const [ch0, name, qty, ic, decl] = items[i];
    const item = ic ? name : undefined;
    const rar = rarOn ? st.rarity : undefined, qs = qtyOn ? String(qty) : undefined;
    const xf = revealOf(e, i, n, rr, a);
    if (xf.hidden || xf.back || xf.alpha < 1 || xf.scale !== 1 || xf.sx !== 1 || xf.dx || xf.dy) {
      // 揭示演出里只露史诗以上的稀有度（原来就是这样）
      const hi = rar !== undefined && rar >= 3 ? rar : undefined;
      withReveal(e, rr, xf, () => asItem(name, () => slot(e, rr, ch0, { qty: qs, rarity: hi, item })), hi ?? 1);
      continue;
    }
    // 跨格的格子（M12b-10：置顶行里占三列的武器形态卡、马赛克墙）画成横版瓷砖卡（cmp.card 选过时按它）
    const wide = !!L.spanned?.[i];
    if (kind === 'tallCard' || CARD_SLOTS.has(kind) || kind === 'card' || (kind === 'cell' && (wide || L.mosaic))) {
      // 卡面（M12b-12）：竖卡 tallCard 按 cmp.card 选过的版式画（没选时原来的商店竖卡）；肖像竖卡 portraitCard（Disco 技能）/ 收藏卡 collectionCard（Balatro 收藏页）固定版式；
      // 格子画成卡 cmp.slot = card（FH5 的照片瓷砖：版式按 cmp.card，没选时 tile；不画数量角标）
      const cv = /^\d+$/.test(String(qty)) ? String(qty) : undefined;
      drawCard(e, rr, rowCard(i, ch0, name, cardDesc(r, i), { item, rarity: rar, line: decl?.line ?? i, value: cv }), { ink, kind: kind === 'portraitCard' ? 'portrait' : kind === 'collectionCard' ? 'collection' : kind === 'card' || kind === 'cell' ? cardDef : undefined, small: true, legacy: () => {
      // 竖长卡的卡面（M12a-03 的 card 盒子，默认 = 面板）
      panel(e, rr, true, { radius: 8 }, 'card');
      // 卡被压扁（fitContent / 多行网格按高反推，M12b-67，balatro#34）：名字行与价格行放不下两行时先省价格行，名字贴底、插画按剩余高度收
      // 结构化样本里只有伟人 / 建筑 / 配方 / 图鉴这类「要花钱」的卡写价格行（名册、天赋、菜单入口不写）
      const priced = !typed || ['codex', 'builds', 'recipes', 'characters'].includes(sampleKind(r));
      const lh = LH(e, e.base), py = rr.y + rr.h - lh - S(6), two = priced && rr.y + rr.h * 0.62 + lh <= py;
      const ny = two ? rr.y + rr.h * 0.62 : py, ah = two ? rr.h * 0.58 : Math.max(0, Math.min(rr.h * 0.58, ny - rr.y - S(10)));
      if (ah > 0) {
        const art = { x: rr.x + S(6), y: rr.y + S(6), w: rr.w - S(12), h: ah };
        // 终期审查修复 ①：商品图只给物品（商店竖卡）。结构化样本不画金币 / 宝石图标或「◇ 商品图」灰盒——名册 / 角色卡（布阵）画首字头像（与名册 / 队伍行同一个 avatar），
        // 其余结构化样本（图鉴、建筑……）画这一条自己的符号
        if (!typed) goodsArt(e, art, i);
        else {
          e.g.fillStyle = withAlpha(e.accent, 0.12); e.g.fillRect(art.x, art.y, art.w, art.h);
          const cx = art.x + art.w / 2, cy = art.y + art.h / 2, m = Math.min(art.w, art.h);
          if (sk === 'roster' || sk === 'characters') avatar(e, cx, cy, m * 0.36, name);
          else icon(e, ch0, cx, cy, m * 0.5, ink ?? e.icon);
        }
      }
      T(e, name, rr.x + S(8), ny, lh, { ...e.base, color: ink ?? e.text });
      // 价格前缀（M12b-62，civ6#38）：结构化样本（伟人卡、建筑卡……）写内容包主货币的符号；物品（商店）原来的 ¥
      const price = typed ? `${pack().hud.res[0][0]} ${(i + 1) * 60}` : `¥ ${(i + 1) * 6}`;
      if (two) T(e, price, rr.x + S(8), py, lh, { ...e.base, weight: 800, color: e.accent });
      opsBadge(e, rr, i);
      logTarget(e.g, rr, name);
      } });
      // 画成卡的方格 / 跨格（cmp.slot = card、置顶行、马赛克墙）照格子的选中样子描一圈（st.selected@slot：描边 / 虚线 / 发光；Control 已装配的改造卡是虚线框）
      if ((kind === 'card' || kind === 'cell') && (decl?.selected ?? (!readOnly && i === 0))) cardSelectEdge(e, rr);
    } else if (kind !== 'rowCard' && r.str('cnt.subtype', '') === 'achievement') {
      // 成就墙（M11）：每格一枚徽章（图集开着或 cmp.badge 选过时是徽章素材，否则程序化徽章）。
      // 哪些没达成按样本进度（每 8 个前 2 个达成）；没达成的长什么样跟 st.locked：压暗 / 灰度 / 黑剪影 / 问号 / 锁 / 封印
      const done = i % ACH_BADGE.length < 2;
      // 没达成的样子按格子部件的作用域读（审查修复 A · C10：st.locked@slot / @el.x 原来不认）
      const m0 = scopedStr(e.part('slot'), 'st.locked') ?? r.str('st.locked', 'dimmed');
      const mode = done ? '' : m0 === '' || m0 === 'auto' ? 'dimmed' : m0;
      slot(e, rr, '', { selected: i === 0, fresh: st.fresh });
      const bx = rr.x + rr.w / 2, by = rr.y + rr.h / 2, bs = Math.min(rr.w, rr.h) * 0.34;
      if (mode === 'question' || mode === 'hiddenText') icon(e, '?', bx, by, rr.h * 0.46, withAlpha(e.text, 0.5));
      else {
        e.g.save();
        if (mode === 'dimmed' || mode === 'lock' || mode === 'sealed') { e.g.globalAlpha *= 0.45; e.g.filter = 'grayscale(1)'; }
        else if (mode === 'grayscale') { e.g.globalAlpha *= 0.7; e.g.filter = 'grayscale(1)'; }
        else if (mode === 'silhouette') { e.g.globalAlpha *= 0.85; e.g.filter = 'brightness(0)'; }
        badge(e, bx, by, bs, ACH_BADGE[i % ACH_BADGE.length]);
        e.g.restore();
      }
      // 锁：挂锁（M12a-09，✕ 只留给封印）；旧皮肤没在皮肤之后选 st.locked 时仍是原来的 ✕
      if (mode === 'lock') { if (e.th.legacy && !chosenKey(e.part('slot'), 'st.locked')) icon(e, '✕', rr.x + rr.w - rr.h * 0.2, rr.y + rr.h * 0.22, rr.h * 0.24, withAlpha(e.text, 0.85)); else drawPadlock(e.g, rr.x + rr.w - rr.h * 0.2, rr.y + rr.h * 0.24, rr.h * 0.28, withAlpha(e.text, 0.9)); }
      else if (mode === 'sealed') { e.g.save(); e.g.fillStyle = 'rgba(150,200,255,0.28)'; e.g.fillRect(rr.x, rr.y, rr.w, rr.h); e.g.restore(); }
      opsBadge(e, rr, i);
    } else if (kind === 'rowCard') {
      panel(e, rr, true);
      asItem(name, () => icon(e, ch0, rr.x + S(22), rr.y + rr.h / 2, S(18)));
      T(e, name, rr.x + S(42), rr.y, rr.h, { ...e.base, color: ink ?? e.text });
      if (rowF.length) { const fc = fieldColors(e.part('listRow')); rowValueTime(e, rr, rr.x + rr.w - S(10), rowF, { value: qs ?? '', time: rowTime(i) }, fc, { ...e.small, color: fc[1] ?? mutedOf(e, 0.65) }, fc[2] ?? ink ?? e.text); }
      logTarget(e.g, rr, name);
    } else {
      // 格底状态色（st.statusMark = slotTint，M12b-01）与格下标牌（cmp.slotLabel）：状态值 / 等级取样本声明的，没声明时按序号演示
      // 格子的符号按物品名换成物品图标（审查修复 E 视觉 ⑦：◆ 木材 → 原木）
      asItem(name, () => slot(e, rr, ch0, { qty: qs, locked: st.locked, fresh: st.fresh, selected: decl?.selected ?? (!readOnly && i === 0), rarity: rar, item, empty: decl?.empty, durability: decl?.durability, line: decl?.line ?? i,
        tint: tintOn ? decl?.freshness ?? FRESH_DEMO[i % FRESH_DEMO.length] : undefined, label: labOn ? name : undefined, level: decl?.level ?? 1 + (i % 3) }));
      opsBadge(e, rr, i);
    }
    } finally { if (z) for (const c of ctxs) c.restore(); }
  }
  // 行横档、页眉 / 页脚（M12b-10）：画在格子之后（横档在每行格子下沿之下，不压格子）；画出来的那块把页眉 / 页脚算进去
  if (deco) return gridDecoDraw(e, a0, a, L, deco, items.map((it) => it[1]), focusI, ink);
  // 画出来的那块（M12a-34：滚动条贴它的右缘）
  return L.content;
}

/* ---------------- 网格扩展（M12b-10） ---------------- */

/** 网格的页眉 / 页脚 / 行横档（lay.gridHeader / gridFooter / rowRule，选过才画：旧皮肤只认皮肤之后的层）；都没选时 null */
function gridDeco(e: ElCtx): { head: string; foot: string; rule: string } | null {
  const head = pickedStr(e, 'lay.gridHeader', 'none'), foot = pickedStr(e, 'lay.gridFooter', 'none'), rule = pickedStr(e, 'lay.rowRule', 'none');
  return head === 'none' && foot === 'none' && rule === 'none' ? null : { head, foot, rule };
}
const gridLineH = (e: ElCtx, focus: boolean) => (focus ? LH(e, e.title) : LH(e, e.small)) + 6 * e.k;
/** 扣掉页眉 / 页脚之后格子能用的那块 */
function gridBody(e: ElCtx, a: Rect, d: { head: string; foot: string }): Rect {
  const hh = d.head !== 'none' ? gridLineH(e, d.head === 'focusCaption') : 0, fh = d.foot !== 'none' ? gridLineH(e, d.foot === 'focusCaption') : 0;
  return { ...a, y: a.y + hh, h: Math.max(0, a.h - hh - fh) };
}
/**
 * 画页眉 / 页脚 / 行横档：sectionTitle = 当前分类名（第一个页签，黑神话的 Materials）；focusCaption = 焦点项的名字（随焦点变，Elden 暂停网格上方，可代替页头）；
 * sortHint = 键帽 + 「排序」（黑神话网格下方）；行横档 hairline = 每行下一条细线、shelf = 每行格子下 3–4 的深色横档 + 亮上沿（黑神话的搁架）。返回含页眉页脚的外接框
 */
function gridDecoDraw(e: ElCtx, a0: Rect, a: Rect, L: LatticeOut, d: { head: string; foot: string; rule: string }, names: string[], focusI: number, ink?: string): Rect | undefined {
  const S = (n: number) => n * e.k, g = e.g, c = L.content;
  if (d.rule !== 'none' && L.rects.length) {
    const rows = new Map<number, { x0: number; x1: number; y1: number }>();
    for (const q of L.rects) { const k = Math.round(q.y + q.h), o = rows.get(k); rows.set(k, { x0: Math.min(o?.x0 ?? q.x, q.x), x1: Math.max(o?.x1 ?? q.x + q.w, q.x + q.w), y1: q.y + q.h }); }
    for (const { x0, x1, y1 } of rows.values()) {
      if (d.rule === 'hairline') { g.fillStyle = withAlpha(ink ?? e.text, 0.3); g.fillRect(x0, y1 + L.gap / 2, x1 - x0, 1); }
      else { const t = Math.max(3, S(3.5)); g.fillStyle = withAlpha('#000', 0.55); g.fillRect(x0 - S(4), y1 + S(2), x1 - x0 + S(8), t); g.fillStyle = withAlpha('#fff', 0.18); g.fillRect(x0 - S(4), y1 + S(2), x1 - x0 + S(8), 1); }
    }
  }
  const fi = Math.max(0, Math.min(names.length - 1, focusI)), cap = names[fi] ?? '';
  const label = (mode: string, y: number) => {
    if (mode === 'sectionTitle') { const t = pack().menu.tabs?.[0] ?? pack().menu.title, o = { ...e.small, weight: 700, upper: true, spacing: 0.08, color: mutedOf(e, 0.75) }; T(e, t, a.x, y, gridLineH(e, false), o); }
    else if (mode === 'focusCaption') T(e, plainText(cap), a.x, y, gridLineH(e, true), { ...e.title, color: ink ?? e.title.color });
    else if (mode === 'sortHint') { const h = LH(e, e.small), kw = keyCap(e, a.x, y + S(3), h, 'R'); T(e, '排序', a.x + kw + S(6), y + S(3), h, { ...e.small, color: mutedOf(e, 0.8) }); }
  };
  if (d.head !== 'none') label(d.head, a0.y);
  const fy = c ? c.y + c.h + S(4) : a.y + a.h;
  if (d.foot !== 'none') label(d.foot, Math.min(fy, a0.y + a0.h - gridLineH(e, d.foot === 'focusCaption')));
  if (!c) return c;
  const top = d.head !== 'none' ? a0.y : c.y, bot = d.foot !== 'none' ? Math.min(fy, a0.y + a0.h - gridLineH(e, d.foot === 'focusCaption')) + gridLineH(e, d.foot === 'focusCaption') : c.y + c.h;
  return { x: c.x, y: top, w: c.w, h: bot - top };
}

/**
 * 跨格 / 置顶 / 马赛克的排法（M12b-10）：lay.arrangement = mosaic → 首项 2 × 2 大瓷砖、其余按序号 1 × 1 / 2 × 1（样本 ItemState.span 写了按它）；
 * lay.pinned = pinTop → 前几个条目（样本 ItemState.pinned 写了的；没写时前 min(4, 列数) 个）排成独立的置顶行，第一个占三列（列数 ≥ 6，否则两列 / 一列：Control 的武器形态卡 + 3 个改造槽）。
 * 都不是时 {}（原来的等大格）
 */
function packOf(e: ElCtx, n: number): Partial<LatticeSpec> {
  const r = e.r, mosaic = r.str('lay.arrangement', '') === 'mosaic', pin = pickedStr(e, 'lay.pinned', 'none') === 'pinTop';
  if (!mosaic && !pin) return {};
  const items = gridSource(e), cols = Math.max(1, Math.min(12, Math.round(r.num('lay.columns', mosaic ? 4 : 5))));
  const decl = (i: number) => items[i % Math.max(1, items.length)]?.[4];
  const spans: [number, number][] = [];
  for (let i = 0; i < n; i++) { const sp = decl(i)?.span; spans.push(sp ? [Math.max(1, Math.min(cols, sp[0])), Math.max(1, Math.min(3, sp[1]))] : mosaic ? (i === 0 ? [Math.min(2, cols), 2] : i % 5 === 2 && cols > 1 ? [2, 1] : [1, 1]) : [1, 1]); }
  if (!pin) return { spans, mosaic };
  const declared = items.slice(0, n).map((it, i) => (it[4]?.pinned ? i : -1)).filter((i) => i >= 0);
  const np = declared.length ? declared.length : Math.min(4, cols, n);
  if (!declared.length && !decl(0)?.span) spans[0] = [cols >= 6 ? 3 : cols >= 3 ? 2 : 1, 1];
  return { spans, pinned: np, mosaic };
}
/** 按 spans 排格子（lattice 的跨格分支）：行优先、先到先占；置顶行（前 pinned 个）单独占上面几行，之后另起一行、多留一个间距；马赛克的格高按可用高放大 */
function packedLattice(e: ElCtx, a: Rect, spec: LatticeSpec, base: { cols: number; gap: number; w: number; h: number; aw: number; tp: number; cellSize: number | null; wN: number; hN: number }): LatticeOut {
  const { cols, gap } = base, spans = spec.spans!, n = spec.n, np = Math.min(n, spec.pinned ?? 0);
  // 置顶行的格子尺寸（lay.pinnedCellSize，px@1080p，没给时同下面的网格）
  const pinW = pxParam(e.r, 'lay.pinnedCellSize');
  const grid: boolean[][] = [];
  const free = (r0: number, c0: number, sc: number, sr: number) => { for (let r = r0; r < r0 + sr; r++) for (let c = c0; c < c0 + sc; c++) if (c >= cols || grid[r]?.[c]) return false; return true; };
  const take = (r0: number, c0: number, sc: number, sr: number) => { for (let r = r0; r < r0 + sr; r++) { grid[r] ??= []; for (let c = c0; c < c0 + sc; c++) grid[r][c] = true; } };
  const place: { r: number; c: number; sc: number; sr: number; pinned: boolean }[] = [];
  let startRow = 0;
  for (let i = 0; i < n; i++) {
    if (i === np && np > 0) startRow = grid.length;
    const [sc0, sr] = spans[i] ?? [1, 1], sc = Math.min(cols, sc0);
    let done = false;
    for (let r = startRow; !done && r < startRow + 200; r++) for (let c = 0; c < cols; c++) if (free(r, c, sc, sr)) { take(r, c, sc, sr); place.push({ r, c, sc, sr, pinned: i < np }); done = true; break; }
  }
  const pinRows = np ? Math.max(...place.slice(0, np).map((q) => q.r + q.sr)) : 0;
  const rowsN = grid.length;
  // 格宽：马赛克 = 按列数均分（不封顶，瓷砖墙铺满宽）；否则 = 原来的格宽
  const w = spec.mosaic ? (base.aw - (cols - 1) * gap) / cols : base.w;
  const extra = np && rowsN > pinRows ? gap : 0;
  let h = base.h;
  // 马赛克的格高：按可用高放大，上限 = 格宽 × 1.25；显式给了 lay.cellAspect 时上限 = 格宽 ÷ 宽高比（B7 审查修复 ⑤：参数在马赛克上原来不读、却报「不生效」）
  const asp = numParam(e.r, 'lay.cellAspect');
  if (spec.mosaic) { const fitH = (a.h - (rowsN - 1) * gap - extra) / Math.max(1, rowsN); h = Math.max(base.tp, Math.min(asp !== null && asp > 0 ? w / Math.max(0.2, Math.min(5, asp)) : w * 1.25, fitH)); }
  // 置顶格边长（lay.pinnedCellSize）不超过按列数均分的宽（B7 审查修复 ⑱：原来不看可用宽，320 的置顶格在 6 列时伸出画面、压到浮动详情）
  const pw = pinW !== null ? Math.min(pinW, Math.max(1, (base.aw - (cols - 1) * gap) / cols)) : w, ph = pinW !== null ? pw / Math.max(0.2, w / h) : h;
  const rowY = (r: number) => (r < pinRows ? a.y + r * (ph + gap) : a.y + pinRows * (ph + gap) + extra + (r - pinRows) * (h + gap));
  const rects: Rect[] = [], spanned: boolean[] = [];
  for (const q of place) {
    const cw = q.pinned ? pw : w, chh = q.pinned ? ph : h;
    const rr = { x: a.x + q.c * (cw + gap), y: rowY(q.r), w: q.sc * cw + (q.sc - 1) * gap, h: q.sr * chh + (q.sr - 1) * gap };
    if (rr.y + rr.h > a.y + a.h + 0.5 || rr.x + rr.w > a.x + base.aw + 0.5) break;
    rects.push(rr); spanned.push(q.sc > 1 || q.sr > 1);
  }
  const xs = rects.map((q) => q.x + q.w), ys = rects.map((q) => q.y + q.h);
  const content = rects.length ? { x: a.x, y: a.y, w: Math.max(...xs) - a.x, h: Math.max(...ys) - a.y } : undefined;
  // fitContent 的测量（审查修复 ⑪）：按自然格高量——马赛克 = 格宽 × 1.25（或 ÷ lay.cellAspect），不随这一遍的可用高反推（原来测量与可用高互相收缩，收到触控下限）；等大格 = 不为放下而缩的格高
  const hNat = spec.mosaic ? Math.max(base.tp, asp !== null && asp > 0 ? w / Math.max(0.2, Math.min(5, asp)) : w * 1.25) : base.hN;
  const phNat = pinW !== null ? pw / Math.max(0.2, (spec.mosaic ? w : base.wN) / hNat) : hNat;
  const need = { w: cols * w + (cols - 1) * gap, h: pinRows * (phNat + gap) + extra + Math.max(0, rowsN - pinRows) * (hNat + gap) - gap };
  return { cols, rows: rowsN, w, h, gap, pitchY: h + gap, rects, shown: rects.length, content, need, focusScaled: false, spanned, mosaic: !!spec.mosaic };
}

/**
 * 列表的行规划（M12a-26 / 38：listRows 画之前先算——浮动详情的预排与 fitContent 的测量用同一份）：行数据、条目数、行高（自然 rh0 / 放下全部行的 rh）、行距、字样式。
 * 菜单类（暂停 / 标题，menuLike）与空列表不在这里排（listRows 交给 menuRows / 空状态）
 */
function listPlan(e0: ElCtx, a0: Rect, ink?: string, reserve = 0) {
  // 列表行部件：行面板、行字、菜单行的选中样式按 @listRow 查（M12a-01）；行里的头像 / 按钮 / 格子各按自己的部件查
  const e = e0.part('listRow');
  // 右边让出给浮动详情（M12a-26 的 reservedRight：浮动详情放不下又不能压住列表时，列表收窄）
  const a = reserve > 0 ? { ...a0, w: Math.max(0, a0.w - reserve) } : a0;
  const S = (n: number) => n * e.k, r = e.r;
  const sub = r.str('cnt.subtype', '');
  const fields = r.list('cmp.listRow').filter((x) => x !== 'auto');
  const f = fields.length ? fields : ['icon', 'title', 'desc'];
  // 行内容取当前包（暂停 / 标题菜单所有包共用 GENERIC.mainMenu）；服务器状态、"推荐"、"空存档"这类界面字留在这里
  const scr = pack().screens;
  // 排行的进度条按第一名的分数向上取到下一个整千归一（各包的分数量级不同；雪线旅人 12,840 → 13,000，与原来写死的一样）
  const top = (Math.floor(Math.max(...scr.leaders.map(([, v]) => v)) / 1000) + 1) * 1000;
  // 结构化样本（M12b-62）：技能树 = 天赋、图鉴 = 条目、布阵 = 名册、锻造 = 配方、建造 = 建筑、选角 = 角色、外交 / 对话列表 = 指令……；
  // 暂停（cnt.subtype = pause / 局内菜单）= 包的局内主菜单（octopath#16、persona5#26：原来是标题界面那一套「继续游戏 / 新游戏 / 读取存档」），标题界面仍是 GENERIC.mainMenu
  const kind = sampleKind(r), kr = kind === 'pauseMenu' ? null : kindRows(kind);
  const rows: (Omit<SampleRow, 'state'> & { time: string; state?: ItemState })[] =
    sub === 'leaderboard' ? scr.leaders.map(([n, v]) => ({ icon: n.slice(0, 1), title: n, desc: '', value: v.toLocaleString('en'), progress: v / top, time: '' }))
      : sub === 'server' ? scr.servers.map((s, i) => ({ icon: '●', title: s, desc: i === 5 ? '推荐' : ['流畅', '繁忙', '流畅', '爆满', '流畅'][i] ?? '', value: '', progress: [0.3, 0.8, 0.4, 1, 0.2, 0.1][i], time: '' }))
        : sub === 'saveSlot' ? scr.saves.map(([t, d, tm], i) => ({ icon: String(i + 1), title: t || '空存档', desc: d, value: '', progress: 0, time: tm }))
          : sub === 'mail' ? scr.mail.map(([w, t, tm]) => ({ icon: '✉', title: t, desc: w, value: '', progress: 0, time: tm }))
            : r.str('cnt.screen', '') === 'screen.title' ? GENERIC.mainMenu.map((s) => ({ icon: '', title: s, desc: '', value: '', progress: 0, time: '' }))
              : kind === 'pauseMenu' ? samplesFor('pauseMenu').map(([, s]) => ({ icon: '', title: s, desc: '', value: '', progress: 0, time: '' }))
                : sub === 'achievement' ? scr.achievements.map((s, i) => ({ icon: '★', title: s, desc: '', value: '', progress: [1, 1, 0.6, 0.3, 0.1, 0, 0, 0][i], time: '' }))
                  // 三选一排成竖列 / 行卡（cnt.subtype = draft3 + lay.arrangement = column / cmp.slot = rowCard，R4 回归修复 C1 ②，hades#52）：行是三选一卡的样本（screens.draft：符号 / 名字 / 说明，
                  // 与 cardsRow 同一份），原来落到任务样本（第三行是灰色百分比）；状态逐条声明为空（不按任务演示完成 / 失败）
                  : sub === 'draft3' ? scr.draft.map(([g0, t, d0]) => ({ icon: g0, title: t, desc: plainText(d0), value: '', progress: 0, state: {}, time: '' }))
                    : kr ? kr.map((x) => ({ ...x, time: x.time ?? '' }))
                    : scr.quests.map(([t, d, p]) => ({ icon: '◆', title: t, desc: d, value: `${Math.round(p * 100)}%`, progress: p, time: '' }));
  const menuLike = rows[0].icon === '';
  // 条目数：显式给了 cnt.itemCount 时样本不够就循环取、标题编号（M12a-10：原来截到样本条数，Hades 天赋表给 10 只画 6）；没给时照旧不超过样本条数
  // 暂停 / 标题这类菜单列表不循环（「继续游戏 2」没有意义），照旧截到菜单项数
  // 局内菜单（暂停）没显式给条目数时整份画（中期审查修复 ⑤：兜底的 6 条把包里排在第 7 的「⚙ 设置」截掉了，标题菜单本来就是 6 条）；
  // 显式给了、比样本少时，末尾的系统项（⚙ / ✖：设置、退出、放弃……）留在最后，截掉的是中间的入口（tpl.pauseMobile 的 3 条 = 第一条 + 设置 / 退出）
  const pauseK = kind === 'pauseMenu' && menuLike && r.str('cnt.screen', '') !== 'screen.title';
  const n0 = count(e, rows.length, true), n = itemCountSet(e) && !menuLike ? n0 : pauseK && !itemCountSet(e) ? rows.length : Math.min(rows.length, n0);
  if (pauseK && n > 0 && n < rows.length) {
    const gl = samplesFor('pauseMenu').map(([g0]) => g0);
    let tail = 0;
    while (tail < gl.length && (gl[gl.length - 1 - tail] === '⚙' || gl[gl.length - 1 - tail] === '✖')) tail++;
    const k = Math.min(tail, n - 1);
    if (k > 0) rows.splice(n - k, rows.length - k - (n - k));
  }
  const rowAt = (i: number) => { const x = rows[i % rows.length], k = Math.floor(i / rows.length); return k && x.title ? { ...x, title: `${x.title} ${k + 1}` } : x; };
  if (n === 0 || menuLike) return { full: false as const, e, a, S, r, sub, f, rows, n, menuLike, rowAt, rowY: (i: number) => a.y + i, hdrs: [] as { y: number; title: string }[], strip: null as Rect | null };
  // 行底（M12a-27）：cmp.listRowBox 显式给了就用它；没给时按 cmp.slot——bare = 无底无框（原来 bare 也逐行描框），其余 = 每行一块面板（原来的）；
  // cmp.slot = rowCard = 高卡行（逐行外框、按稀有度着色，Hades 的恩赐牌）
  const slotKind = cmp(e, 'cmp.slot', 'cell'), card = slotKind === 'rowCard';
  const boxV = cmpPicked(e, 'cmp.listRowBox', 'auto'), box = boxV !== 'auto' ? boxV : slotKind === 'bare' ? 'bare' : 'card';
  // 字段颜色（cmp.listRowColors：标题 / 说明 / 数值 / 状态 / 时间，Hades 天赋表的红名绿数）；没给的字段原来的颜色
  const fc = fieldColors(e);
  // 标题字重（M12a-27）：皮肤之后显式给了 typ.body.weight 就用它（原来写死 700，Ghost 的常规字重不生效）；选中行加一级
  const tw = postSkinKey(e, cmpKey(e, 'typ.body.weight')) ? e.base.weight : 700;
  // 展示字体作用到列表行标题（typ.display.scope 含 menuItem，M12b-55，persona5#9）
  const titleO = { ...e.base, weight: tw, color: fc[0] ?? ink ?? e.text, ...displayFor(e, 'menuItem') };
  // 次要行（描述）与锁定的标题用次要字色（M12a-03 的 col.muted；纸面容器仍用墨色淡化）
  const descO = { ...e.small, color: fc[1] ?? (ink ? withAlpha(ink, 0.65) : mutedOf(e, 0.65)) };
  const hasDesc = f.includes('desc') && rows.some((x) => x.desc);
  // 卡行的说明行数跟 cnt.textLength（一句 1、短 2、长 3）
  const descN = card ? ({ line: 1, title: 1, short: 2, long: 3 } as Record<string, number>)[r.str('cnt.textLength', 'short')] ?? 2 : 1;
  const content = LH(e, titleO) + (hasDesc ? LH(e, descO) * descN : 0) + (card && f.includes('value') ? LH(e, e.small) : 0);
  // 行高与行距（M12a-27）：没显式给 cnt.density 时原来的 max(44, 触控下限, 字高 + 10) 与 6；给了时 = 字高 + 正文字号 × 2.2…0.3（密度 0–4），行距 6 × 1.6…0.25；
  // 触控下限（tap）只在触屏时有。卡行 = 至少 64、字高 + 20
  const d = densityLevel(e);
  const rh0 = card ? Math.max(S(64), tap(e), content + S(20)) : d < 0 ? Math.max(S(44), tap(e), content + S(10)) : Math.max(tap(e), content + e.base.size * ROW_PAD[d]);
  const gap = d < 0 || card ? S(6) : S(6) * ROW_GAP[d];
  // 一页放得下就不截（M12a-28，与网格的格高反推同口径）：n 行按自然行高放不下时，行高收到 (数据区高 − 行距) ÷ n，最低 = 字高 + 6（触屏不低于触控下限）；
  // 收到最低仍放不下才按自然行高截到一页（原来一律截：B5 的按钮行把服务器 / 存档列表的最后一行挤掉）
  // 分组标题行（lay.grouping = header 选过，M12b-13，civ6#19）：前一半一组、后一半一组（组名 = 内容包第 2 / 3 个页签），每组前一行标题；
  // 列表上方的选择条（cmp.listHeader = selectorStrip，into-the-breach#11）：一排小头像格。都没选时几何与原来逐字一样
  const hdrOn = pickedStr(e, 'lay.grouping', '') === 'header', hdrH = hdrOn ? LH(e, { ...e.small, weight: 700 }) + S(10) : 0;
  const stripOn = pickedStr(e, 'cmp.listHeader', 'none') === 'selectorStrip', stripH = stripOn ? Math.max(S(34), tap(e) * 0.8) + S(8) : 0;
  const half = Math.ceil(n / 2), grpOf = (i: number) => (i < half ? 0 : 1), nGrp = hdrOn ? (n > 1 ? 2 : 1) : 0;
  const ay = a.y + stripH, ah = a.h - stripH - nGrp * hdrH;
  const rhFit = (ah - (n - 1) * gap) / n, rhMin = Math.max(tap(e), content + S(6));
  const rh = rhFit >= rh0 || rhFit < rhMin ? rh0 : rhFit;
  const rowY = (i: number) => (hdrOn || stripOn ? ay + i * (rh + gap) + (hdrOn ? (grpOf(i) + 1) * hdrH : 0) : a.y + i * (rh + gap));
  const tabs = pack().screens.tabs;
  const hdrs = hdrOn ? Array.from({ length: nGrp }, (_, k) => ({ y: rowY(k ? half : 0) - hdrH, title: tabs[k + 1] ?? tabs[0] })) : [];
  const strip = stripOn ? { x: a.x, y: a.y, w: a.w, h: stripH - S(8) } : null;
  return { full: true as const, e, a, S, r, sub, f, rows, n, menuLike, rowAt, slotKind, card, box, fc, tw, titleO, descO, hasDesc, descN, content, rh0, rh, gap, rowY, hdrs, strip, hdrH };
}

function listRows(e0: ElCtx, a0: Rect, ink?: string, reserve = 0) {
  const P = listPlan(e0, a0, ink, reserve);
  const { e, a, S, r, sub, f, rows, n, rowAt } = P;
  if (n === 0) return emptyState(e, a, ink);
  // 菜单行（暂停 / 标题菜单，M12a-27）：竖列 / 横排方钮 / 对角错落，底框跟 cmp.buttonBox
  if (!P.full) return menuRows(e, a, rows.slice(0, n).map((x) => x.title), ink);
  const { card, box, fc, tw, titleO, descO, hasDesc, descN, rh, gap } = P;
  // 选中行（M12a-27）：可交互（ix.mode ≠ readOnly）或在画导航焦点时才画（原来只读的结算列表也给第一行画强调色描边）；
  // ix.focus 显式选了就按它画在行底下（focusDecor，笔刷底在暗色面板上反色），否则原来的强调色描边
  // 只读的列表不画选中行（M12b-67，into-the-breach#37：原来导航焦点开着时只读结算也给第一行描边）
  const interactive = r.str('ix.mode', 'singleCTA') !== 'readOnly';
  // 选中行（M12b-67，M12a B5 遗留）：流程演示指定的那一行，否则第一行（原来固定第一行）
  const selI = Math.max(0, fl0() ?? 0);
  const focusMode = chosen(e, 'ix.focus') ? r.str('ix.focus', 'outline') : '';
  // 状态（cmp.listRow 含 status，M12a-27）：每行按 st.statusMark 画完成 / 失败 / 进行中 / 未开始；完成的行按 st.done（显式选了才画）
  const statusOn = f.includes('status'), mark = r.str('st.statusMark', 'dot');
  const doneMode = chosen(e, 'st.done') ? r.str('st.done', 'check') : '';
  const rank = r.str('st.rank', 'number');
  // 逐条声明的状态只有任务行有（内容包 quests 的第 4 项）
  // 结构化样本的行（M12b-62）带自己声明的状态，不读任务的状态
  const quests = pack().screens.quests, fromQuests = !['leaderboard', 'server', 'saveSlot', 'mail', 'achievement'].includes(sub) && !rows[0]?.state;
  // 原型态（st.locked = prototype 选过，按 @slot → @listRow → 全局读）：锁定行写「原型」+ 灯泡
  const protoRows = pickedStr(e.part('slot'), 'st.locked', '') === 'prototype';
  // 分组标题行与选择条（M12b-13）
  for (const h of P.hdrs) if (h.y >= a.y - 0.5 && h.y + P.hdrH <= a.y + a.h + 0.5) groupHeader(e, { x: a.x, y: h.y, w: a.w, h: P.hdrH - S(4) }, h.title, false, ink);
  if (P.strip) selectorStrip(e, P.strip);
  for (let i = 0; i < n; i++) {
    const row = rowAt(i), y = P.rowY(i);
    // 放得下的判断留 0.5 的余量（R4 回归修复 C1 ②，hades#52）：lay.dataAlign = center / lay.panelFit = fitContent 把数据区高收到 measureData 量出的高、listPlan 的 rhFit 按区高反推行高，
    // 末行底边比区底多出 1e-14 量级的浮点误差就整行不画（三选一只剩两张牌）。itemRects、菜单行、表格、表单、经营表同一个余量（网格 lattice 原来就有）
    if (y + rh > a.y + a.h + 0.5) break;
    const rr = { x: a.x, y, w: a.w, h: rh };
    const st = itemState(e, i, row.state);
    const state = rowState(row.progress, fromQuests ? quests[i % quests.length]?.[3] : undefined, i, statusOn);
    markItem(e, rr, i);
    const on = interactive && i === selI;
    // 完成态灰化（st.done = grayOut）：整行压暗
    const gray = state === 'done' && doneMode === 'grayOut', ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
    if (gray) for (const c of ctxs) { c.save(); c.globalAlpha *= 0.45; }
    // 行底
    const rarC = card ? rowRarity(e, i) : null;
    if (card) {
      panel(e, rr, false, rarC ? { border: { width: 2, color: rarC } } : on && !focusMode ? { border: { width: 2, color: e.accent } } : {});
      // 外框结构（雕花九宫格）盖住了稀有度描边（M12b-67，hades#37：三块恩赐牌框色统一金色）：在外框里沿再描一道稀有度色细框
      const fr = e.t.panel.frame;
      if (rarC && fr) drawBox(e.g, inflate(rr, -fr.width), { border: { width: 2, color: rarC } }, e.pal);
    }
    else if (box === 'card') panel(e, rr, true, on && !focusMode ? { border: { width: 2, color: e.accent } } : {});
    else if (box === 'zebra') { e.g.fillStyle = withAlpha(ink ?? e.text, i % 2 ? 0.04 : 0.08); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); }
    else if (box === 'plain') { e.g.fillStyle = withAlpha(ink ?? e.text, 0.18); e.g.fillRect(rr.x, rr.y + rr.h + gap / 2 - 0.5, rr.w, 1); }
    // 无底的行（bare / plain / zebra）：选中行垫一层淡强调色
    if (box !== 'card' && !card && on && !focusMode) { e.g.fillStyle = withAlpha(e.accent, 0.14); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); }
    if (statusOn && (mark === 'rowTint' || mark === 'slotTint') && state !== 'todo') { e.g.fillStyle = withAlpha(stateColor(e, state), 0.14); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); }
    // 选中的焦点画法（ix.focus 显式选了）：画在行字底下；笔刷底在暗色面板上用浅色笔刷，这一行的字反成面板色
    const invC = on && focusMode ? focusDecor(e, rr, focusMode) : null;
    if (on && focusMode) FOCUS_DRAWN = rr;
    const tO = invC ? { ...titleO, color: invC } : titleO, dO = invC ? { ...descO, color: invC } : descO;
    // 选中行的标题加一级字重（只在显式给了正文字重时：原来的 700 不变）
    const tOn = on && tw !== 700 ? { ...tO, weight: tw >= 400 ? 700 : 400 } : tO;
    let x = rr.x + S(10);
    if (sub === 'leaderboard') {
      // 名次：奖牌 / 皇冠 / 前三色 / 纯数字
      const c = ['#f5c542', '#c0c7d0', '#c47f3c'][i] ?? withAlpha(ink ?? e.text, 0.6);
      if ((rank === 'medals' || rank === 'podium' || rank === 'crown') && i < 3) badge(e, x + S(14), rr.y + rh / 2, S(12), rank === 'crown' ? 'crystal' : 'medal', String(i + 1));
      else T(e, String(i + 1), x + S(4), rr.y, rh, { ...e.title, color: rank === 'top3Color' ? c : (i < 3 ? c : ink ?? e.text) });
      x += S(36);
    }
    // 行首按钮列 / 形态切换钮（M12b-13：ITB 机甲行的两个编辑钮、Hades 天赋行的镜像钮）
    if (f.includes('leadButtons')) { const s = Math.min((rh - S(12)) / 2, S(22)); ['⚙', '◆'].forEach((gl, j) => { const q = { x, y: rr.y + rh / 2 - s - S(2) + j * (s + S(4)), w: s, h: s }; panel(e, q, true, {}, 'control'); icon(e, gl, q.x + s / 2, q.y + s / 2, s * 0.6, e.icon); }); x += s + S(10); }
    if (f.includes('toggle')) { const s = Math.min(rh - S(14), S(26)), q = { x, y: rr.y + (rh - s) / 2, w: s, h: s }; panel(e, q, true, i === selI ? { border: { width: 2, color: e.accent } } : {}, 'control'); icon(e, '↻', q.x + s / 2, q.y + s / 2, s * 0.62, i === selI ? e.accent : e.icon); x += s + S(10); }
    if (f.includes('icon')) {
      if (sub === 'leaderboard' || sub === 'mail') avatar(e, x + S(16), rr.y + rh / 2, Math.min(S(16), rh * 0.36), row.icon);
      // 焦点行的图标与字一起换成焦点底上的字色（M12b-67，ghost-of-tsushima#29：笔刷底上的白图标看不见）
      else if (card) { const s = Math.min(rh - S(16), S(56)); icon(e, row.icon, x + s / 2, rr.y + rh / 2, s * 0.62, invC ?? rarC ?? (st.locked ? withAlpha(e.text, 0.3) : e.accent)); x += s - S(26); }
      else icon(e, row.icon, x + S(14), rr.y + rh / 2, S(18), invC ?? (st.locked ? withAlpha(e.text, 0.3) : e.accent));
      x += S(40);
    }
    // 完成记号：check = 标题前绿勾
    if (state === 'done' && doneMode === 'check') { icon(e, '✓', x + S(6), rr.y + (hasDesc ? S(4) + LH(e, tOn) / 2 : rh / 2), S(14), e.good); x += S(18); }
    const ty = hasDesc ? rr.y + (card ? S(10) : S(4)) : rr.y;
    const done = state === 'done' && doneMode === 'strike';
    // 类别 / 流派色（M12b-33）：col.coding 含 lineId、标题字色没另给（cmp.listRowColors 第 1 项）时条目名按类别着色
    const lcT = !fc[0] && !invC ? lineColor(e, i) : null;
    const tO2 = st.locked ? { ...tOn, color: ink ? withAlpha(ink, 0.4) : mutedOf(e, 0.4) } : done ? { ...tOn, color: e.good } : lcT ? { ...tOn, color: lcT } : tOn;
    const tW = T(e, row.title, x, ty, hasDesc ? LH(e, titleO) : rh, tO2);
    // 稀有度字母（卡行，st.rarityCue 含 letter）
    if (rarC && e.v.list('st.rarityCue').includes('letter')) { const L = ['N', 'R', 'SR', 'SSR', 'UR'][rowRarityTier(i)]; T(e, L, x + tW + S(8), ty, hasDesc ? LH(e, titleO) : rh, { ...e.small, weight: 900, color: rarC }); }
    // 行内字段（M12b-13）：等级（Lv n）、行内小格（ITB 的武器格）、色块数字（绿底白字的移动 / 生命）——排在标题后面
    {
      let ix = x + tW + S(10);
      const lh0 = hasDesc ? LH(e, titleO) : rh, cy = ty + lh0 / 2;
      if (f.includes('level') && row.lv !== undefined) { const t = `Lv ${row.lv}`, o = { ...e.small, weight: 700, color: fc[2] ?? e.accent }; drawNumber(e, t, ix, ty, lh0, o); ix += numberWidth(e, t, o) + S(10); }
      if (f.includes('slots')) { const s = Math.min(lh0, S(24)); (row.slots ?? ['⚔', '✦']).forEach((gl) => { slot(e, { x: ix, y: cy - s / 2, w: s, h: s }, gl); ix += s + S(4); }); ix += S(6); }
      if (f.includes('statChips')) (row.chips ?? [[row.value ? 'V' : '', row.value || String(i + 2)]]).forEach(([, v]) => { const o = { ...e.small, weight: 800, color: '#ffffff', outline: undefined, shadow: undefined }, h0 = Math.min(lh0, S(22)), w0 = Math.max(h0, numberWidth(e, v, o) + S(10)); drawBox(e.g, { x: ix, y: cy - h0 / 2, w: w0, h: h0 }, { bg: { solid: semantic(e, 'good') }, radius: S(3) }, e.pal); drawNumber(e, v, ix + (w0 - numberWidth(e, v, o)) / 2, cy - h0 / 2, h0, o); ix += w0 + S(4); });
    }
    // 划掉（st.done = strike）：标题中线一道好色细线
    if (done) { e.g.fillStyle = e.good; e.g.fillRect(x, ty + (hasDesc ? LH(e, titleO) : rh) / 2, tW, Math.max(1, tOn.size * 0.08)); }
    if (hasDesc && row.desc) {
      // 说明：卡行按 cnt.textLength 折几行（wrapLines），普通行一行
      const lines = card ? wrapText(e, row.desc, rr.x + rr.w - x - S(14), dO).slice(0, descN) : [row.desc];
      lines.forEach((l, j) => T(e, l, x, ty + LH(e, titleO) + j * LH(e, dO), LH(e, dO), dO));
      if (card && f.includes('value') && row.value) T(e, row.value, x, ty + LH(e, titleO) + lines.length * LH(e, dO), LH(e, e.small), { ...e.small, weight: 800, color: fc[2] ?? e.good });
    }
    let rx = rr.x + rr.w - S(10);
    if (f.includes('action')) { const bl = row.progress >= 1 ? '领取' : '前往'; const bh = Math.max(S(28), Math.min(tap(e), rh - S(8))), bw = Math.max(W(e, bl, buttonText(e, bh)) + S(20), tap(e)); rx -= bw; button(e, { x: rx, y: rr.y + (rh - bh) / 2, w: bw, h: bh }, bl, row.progress >= 1); rx -= S(10); }
    if (f.includes('reward')) { const s = Math.min(rh - S(12), S(36)), [rc, rn] = pack().hud.res[0]; rx -= s; slot(e, { x: rx, y: rr.y + (rh - s) / 2, w: s, h: s }, rc, { qty: '×20', item: rn }); rx -= S(10); }
    // 数值 / 时间（M12b-67：与网格里的行卡共用 rowValueTime）；卡行没有说明行时数值写在右边（civ6#48：原来卡行的数值只画在说明下面，没有说明就丢了），
    // 卡行的任务样本要时间字段时给回合数（⏱ n）
    const valueRight = !card || !(hasDesc && row.desc);
    // 行尾字段（M12b-13）：升级格（Hades：灰色加号方块 + MAX / 紫色花费）、评级字母（Hi-Fi）、滑条（经营面板）、数值块（按语义着色的圆角块，代替数值字）
    if (f.includes('upgrade')) {
      const s = Math.min(rh - S(14), S(26)), maxed = row.lv !== undefined && row.max !== undefined && row.lv >= row.max, t = maxed ? 'MAX' : row.cost ?? '1', o = { ...e.small, weight: 800, color: maxed ? mutedOf(e, 0.6) : e.accent2 }, tw0 = numberWidth(e, t, o);
      rx -= tw0; drawNumber(e, t, rx, rr.y, rh, o); rx -= s + S(6);
      const q = { x: rx, y: rr.y + (rh - s) / 2, w: s, h: s }; e.g.save(); e.g.strokeStyle = maxed ? mutedOf(e, 0.4) : withAlpha(e.text, 0.7); e.g.lineWidth = 1.5; e.g.strokeRect(q.x + 0.5, q.y + 0.5, s - 1, s - 1); e.g.restore(); icon(e, '+', q.x + s / 2, q.y + s / 2, s * 0.7, maxed ? mutedOf(e, 0.5) : e.text); rx -= S(12);
    }
    if (f.includes('grade')) { const gr = gradeOf(row.progress || (1 - i * 0.18)), o = { ...e.title, size: Math.min(rh * 0.7, e.title.size * 1.3), weight: 900, italic: true, color: gradeColor(e, gr) }; rx -= W(e, gr, o); T(e, gr, rx, rr.y, rh, o); rx -= S(12); }
    if (f.includes('slider')) { const sw = Math.min(S(150), (rx - x) * 0.4); if (sw > S(60)) { rx -= sw; rangeCtl(e, { x: rx, y: rr.y + rh * 0.2, w: sw, h: rh * 0.6 }, row.progress || 0.5, e.r.str('cmp.optionRange', 'slider'), ink); rx -= S(10); } }
    if (f.includes('valueBlock') && row.value) { const o = { ...e.small, weight: 800, color: '#ffffff', outline: undefined, shadow: undefined }, h0 = Math.min(rh - S(12), S(24)), w0 = numberWidth(e, row.value, o) + S(14); rx -= w0; drawBox(e.g, { x: rx, y: rr.y + (rh - h0) / 2, w: w0, h: h0 }, { bg: { solid: fc[2] ?? semantic(e, 'good') }, radius: S(4) }, e.pal); drawNumber(e, row.value, rx + S(7), rr.y + (rh - h0) / 2, h0, o); rx -= S(10); }
    // 当前行两侧键帽（cmp.listRow 含 keyHint，CP2077 捏人的 [A][D]）：画在行外两侧
    if (f.includes('keyHint') && i === selI) { const kh = Math.min(rh * 0.6, S(22)); keyCap(e, rr.x - kh - S(6), rr.y + (rh - kh) / 2, kh, 'A'); keyCap(e, rr.x + rr.w + S(6), rr.y + (rh - kh) / 2, kh, 'D'); }
    rx = rowValueTime(e, rr, rx, f.filter((k) => (k !== 'value' || valueRight) && !(k === 'value' && f.includes('valueBlock'))), { value: row.value, time: row.time || (card && fromQuests && f.includes('time') ? rowTime(i) : '') }, fc, dO, fc[2] ?? invC ?? ink ?? e.text);
    if (f.includes('progress') && row.progress > 0 && row.progress < 1) { const pw = Math.min(S(120), rx - x - W(e, row.title, titleO) - S(20)); if (pw > S(30)) { rx -= pw; const ep = e.part('progress'); gauge(ep, { x: rx, y: rr.y + rh / 2 - S(4), w: pw, h: S(8) }, row.progress, progressKind(ep), e.good); } }
    if (statusOn && mark !== 'rowTint' && mark !== 'slotTint') rx = statusMark(e, rr, rx, state, mark, fc[3]);
    // 稀有度文字（st.rarityCue 含 label，M12b-01，hades#38：行右侧写 COMMON / RARE / EPIC…，色 = 稀有度色）
    if (rarC && e.v.list('st.rarityCue').includes('label')) { const t = rarityWord(rowRarityTier(i)), lo = { ...e.small, weight: 800, color: rarC }, lw = W(e, t, lo); rx -= lw; T(e, t, rx, rr.y, rh, lo); rx -= S(12); }
    // 完成的盖章 / 角标（st.done = stamp / tag）
    if (state === 'done' && (doneMode === 'stamp' || doneMode === 'tag')) rx = doneTag(e, rr, rx, doneMode);
    if (st.fresh) { e.g.fillStyle = e.bad; e.g.beginPath(); e.g.arc(rr.x + rr.w - S(6), rr.y + S(6), S(5), 0, Math.PI * 2); e.g.fill(); }
    // 原型（st.locked = prototype，M12b-13，dont-starve#30：要在科学机器旁才能做的配方）：锁定的行、原料不够的配方（进度 < 1）右侧一枚灯泡 +「原型」小牌（行的格子画法见 slot()）
    if (protoRows && (st.locked || row.progress < 1)) { const s = Math.min(rh - S(12), S(18)), t = '原型', o = { ...e.small, weight: 700, color: semantic(e, 'warn') }; rx -= W(e, t, o); T(e, t, rx, rr.y, rh, o); drawBulb(e.g, rx - s * 0.7, rr.y + rh / 2, s, semantic(e, 'warn')); rx -= s * 1.4 + S(8); }
    if (sub === 'saveSlot' && !row.desc) { T(e, '＋ 新建存档', x, rr.y, rh, { ...titleO, color: withAlpha(ink ?? e.text, 0.5) }); }
    if (gray) for (const c of ctxs) c.restore();
    logTarget(e.g, rr, row.title, 'listRow');
    LIST_BOX = { x: a.x, y: a.y, w: a.w, h: y + rh - a.y };
  }
}

/** 评级字母（cmp.listRow 含 grade，M12b-13，hi-fi-rush#25）：0~1 → S / A / B / C / D */
const gradeOf = (v: number) => (v >= 0.85 ? 'S' : v >= 0.7 ? 'A' : v >= 0.5 ? 'B' : v >= 0.3 ? 'C' : 'D');
/** 评级字母的颜色：S = 第二强调色、A = 好色、B = 字色、C / D = 警告 / 坏色 */
const gradeColor = (e: ElCtx, g0: string) => (g0 === 'S' ? e.accent2 : g0 === 'A' ? semantic(e, 'good') : g0 === 'B' ? e.text : g0 === 'C' ? semantic(e, 'warn') : semantic(e, 'bad'));
/** 列表上方的选择条（cmp.listHeader = selectorStrip，into-the-breach#11）：一排小头像格（内容包的角色 / 名册首字），第一个选中 */
function selectorStrip(e: ElCtx, r: Rect) {
  const S = (n: number) => n * e.k, s = Math.min(r.h, S(34)), list = samplesFor('roster').map(([n]) => [...n][0] ?? '?').concat(samplesFor('characters').map(([c]) => c));
  const n = Math.max(1, Math.min(6, Math.floor((r.w + S(6)) / (s + S(6)))));
  for (let i = 0; i < n; i++) { const q = { x: r.x + i * (s + S(6)), y: r.y, w: s, h: s }; slot(e, q, list[i % list.length], { selected: i === 0 }); }
}

/**
 * 行尾的数值与时间字段（M12b-67，civ6#48：列表行与网格里的行卡共用）：value 右对齐粗体（色 = valueColor）、time 用说明字（cmp.listRowColors 第 5 项给了时用它）；
 * 从 rx 往左排，返回新的 rx。Godot：行 HBox 末尾的两个 Label（SIZE_SHRINK_END）
 */
function rowValueTime(e: ElCtx, rr: Rect, rx: number, f: string[], row: { value: string; time: string }, fc: (string | undefined)[], dO: TextOpts, valueColor: string): number {
  const S = (n: number) => n * e.k;
  // 数值走数字字形（M12b-07 的 drawNumber，B7 换：没给 typ.numerals.* 时与 T / W 一样）
  if (f.includes('value') && row.value) { const vo = { ...e.base, weight: 800, color: valueColor }; const vw = numberWidth(e, row.value, vo); rx -= vw; drawNumber(e, row.value, rx, rr.y, rr.h, vo); rx -= S(12); }
  if (f.includes('time') && row.time) { const to = fc[4] ? { ...dO, color: fc[4] } : dO, tw2 = W(e, row.time, to); rx -= tw2; T(e, row.time, rx, rr.y, rr.h, to); rx -= S(12); }
  return rx;
}
/** 行卡的样本时间（M12b-67）：回合数 + 时钟符号（Civ6 生产列表的「5 ⏱」） */
const rowTime = (i: number) => `⏱ ${3 + (i % 5)}`;

/** 列表行进度条的画法（审查修复 A · C9）：只认写在部件上的 cmp.gauge@progress（tpl.quest / factorio 复刻……，旧皮肤只认皮肤之后的层）；全局 cmp.gauge 是局内血条的，不换这里，原来写死 bar */
const progressKind = (ep: ElCtx) => scopedStr(ep, 'cmp.gauge') || 'bar';
/** 行高的密度档（cnt.density 显式给了时 0–4，没给 −1 = 原来的行高） */
function densityLevel(e: ElCtx): number {
  const l = e.r.src('cnt.density')?.layer;
  if (!l || l === 'default' || l === 'fallback') return -1;
  return Math.max(0, Math.min(4, Math.round(e.r.num('cnt.density', 2))));
}
/** 列表行的上下留白（× 正文字号）与行距（× 6），按密度 0–4（M12a-27） */
const ROW_PAD = [2.2, 1.6, 1.1, 0.55, 0.3], ROW_GAP = [1.6, 1.3, 1, 0.5, 0.25];

/** 组件参数「选过才换画法」（旧皮肤只认皮肤之后的层）：没选时 def */

/** 字段颜色（cmp.listRowColors，M12a-27）：依次是标题 / 说明 / 数值 / 状态 / 时间；颜色角色名、accent / accent2 / text 或 #hex，auto 或没写 = 原来的颜色 */
function fieldColors(e: ElCtx): (string | undefined)[] {
  const lk = chosenKey(e, 'cmp.listRowColors');
  if (!lk) return [];
  return e.r.list(lk).map((c) => (!c || c === 'auto' ? undefined : c === 'accent' ? e.accent : c === 'accent2' ? e.accent2 : c === 'text' ? e.text : e.fill(-1, c)));
}

/** 列表行的状态（M12a-27）：内容包逐条声明的优先；没声明时进度满 = 完成；画状态标识时按演示序列轮着给完成 / 失败 / 进行中（Into the Breach 结算的绿勾红叉） */
const STATE_DEMO: RowStatus[] = ['done', 'fail', 'active', 'done', 'todo'];
function rowState(progress: number, declared: RowStatus | undefined, i: number, demo: boolean): RowStatus {
  if (declared) return declared;
  if (progress >= 1) return 'done';
  if (demo) return STATE_DEMO[i % STATE_DEMO.length];
  return progress > 0 ? 'active' : 'todo';
}
/** 状态色：col.coding 含 status（默认）时完成好色、失败坏色、进行中警告色、未开始次要色；皮肤之后显式给了不含 status 的 col.coding 时一律正文色 */
function stateColor(e: ElCtx, s: RowStatus): string {
  if (postSkinKey(e, 'col.coding') && !e.r.list('col.coding').includes('status')) return e.text;
  return s === 'done' ? e.good : s === 'fail' ? e.bad : s === 'active' ? e.warn : mutedOf(e, 0.6);
}
const STATE_LABEL: Record<RowStatus, string> = { done: '已完成', fail: '失败', active: '进行中', todo: '未开始' };
const STATE_GLYPH: Record<RowStatus, string> = { done: '✓', fail: '✕', active: '◐', todo: '○' };
/** 行尾的状态标识（st.statusMark：dot 圆点 / tag 色块角标 / icon 图标 / text 文字），返回新的 rx */
function statusMark(e: ElCtx, rr: Rect, rx: number, s: RowStatus, mark: string, color?: string): number {
  const S = (n: number) => n * e.k, c = color ?? stateColor(e, s), cy = rr.y + rr.h / 2;
  if (mark === 'icon') { rx -= S(18); icon(e, STATE_GLYPH[s], rx + S(9), cy, S(16), c); return rx - S(8); }
  if (mark === 'text') { const o = { ...e.small, weight: 700, color: c }, w = W(e, STATE_LABEL[s], o); rx -= w; T(e, STATE_LABEL[s], rx, rr.y, rr.h, o); return rx - S(10); }
  if (mark === 'tag') {
    const o = { ...e.small, weight: 700 }, w = W(e, STATE_LABEL[s], o) + S(14), h = S(22);
    rx -= w; drawBox(e.g, { x: rx, y: cy - h / 2, w, h }, { bg: { solid: c }, radiusPct: 50 }, e.pal);
    T(e, STATE_LABEL[s], rx + S(7), cy - h / 2, h, { ...o, color: onColorOf(c, resolveColor(e.th.surface, e.pal)) });
    return rx - S(10);
  }
  rx -= S(10); e.g.fillStyle = c; e.g.beginPath(); e.g.arc(rx + S(5), cy, S(5), 0, Math.PI * 2); e.g.fill();
  return rx - S(10);
}
/** 完成的盖章（stamp：外圈虚线圆章写「完成」）/ 角标（tag：小牌「已完成」，标牌按 @stateTag） */
function doneTag(e: ElCtx, rr: Rect, rx: number, mode: string): number {
  const S = (n: number) => n * e.k, cy = rr.y + rr.h / 2, g = e.g;
  if (mode === 'stamp') {
    const rad = Math.min(rr.h * 0.4, S(18)); rx -= rad * 2;
    g.save(); g.strokeStyle = e.bad; g.lineWidth = 1.5; g.setLineDash([3, 2]); g.beginPath(); g.arc(rx + rad, cy, rad, 0, Math.PI * 2); g.stroke(); g.restore();
    const o = { ...e.small, weight: 800, color: e.bad, size: rad * 0.6 }; T(e, '完成', rx + rad - W(e, '完成', o) / 2, cy - rad, rad * 2, o);
    return rx - S(10);
  }
  const w = W(e, '已完成', e.small) + S(14); rx -= w;
  // 标牌按部件 stateTag（审查修复 A · C9：cmp.plate@stateTag 换形、col.surface@stateTag / col.text@stateTag 换色，balatro）；没写时原来的胶囊
  const pk = scopedStr(e.part('stateTag'), 'cmp.plate');
  plate(e, { x: rx, y: cy - S(11), w, h: S(22) }, '已完成', pk || 'pill', { size: e.small.size }, 'stateTag');
  return rx - S(10);
}
/** 卡行的稀有度（M12a-27，Hades 恩赐牌的框色）：col.coding 含 rarity 或显式给了 st.rarityCue 时按样本序号演示（1 / 2 / 3 / 0 / 4），否则不着色 */
const rowRarityTier = (i: number) => [1, 2, 3, 0, 4][i % 5];
function rowRarity(e: ElCtx, i: number): string | null {
  if (!packRarity() || !(e.r.list('col.coding').includes('rarity') || !!chosenKey(e, 'st.rarityCue'))) return null;
  return rarityColor(e, rowRarityTier(i));
}

/**
 * 菜单行（暂停 / 标题菜单，M12a-27）：lay.arrangement = column（原来的竖列：选中行按键块、其余 6% 浅底）/ row（数据区里居中横排的方钮，走 button()）/
 * cascade（对角错落：逐项角度、字号阶梯，选中项垫强调色斜块并放大，Persona 5）。cmp.buttonBox = false 时不垫底（选中只换成强调色字），
 * ix.focus 显式选了时选中行按它画（focusDecor）
 */
function menuRows(e: ElCtx, a: Rect, items: string[], ink?: string) {
  const S = (n: number) => n * e.k, r = e.r;
  // 排布只认显式给的（lay.arrangement 的兜底是 row：原来菜单一律竖列，兜底不能把所有暂停菜单改成横排）
  const arr = chosen(e, 'lay.arrangement') ? r.str('lay.arrangement', 'column') : 'column';
  const boxOn = cmpPicked(e, 'cmp.buttonBox', 'true') !== 'false';
  const focusMode = chosen(e, 'ix.focus') ? r.str('ix.focus', 'outline') : '';
  const titleO = { ...e.base, weight: 700, color: ink ?? e.text, ...displayFor(e, 'menuItem') };
  if (arr === 'row') {
    const h = Math.max(S(56), tap(e), LH(e, titleO, 2.4)), gap = S(12);
    const ws = items.map((l) => Math.max(h * 1.25, W(e, l, buttonText(e, h)) + S(28)));
    let x = a.x + Math.max(0, (a.w - (ws.reduce((p, q) => p + q, 0) + gap * (items.length - 1))) / 2);
    const y = a.y + Math.max(0, (a.h - h) / 2);
    items.forEach((l, i) => { const rr = { x, y, w: ws[i], h }; markItem(e, rr, i); button(e, rr, l, i === 0 ? 'primary' : 'secondary'); x += ws[i] + gap; });
    return;
  }
  if (arr === 'cascade') {
    // 对角错落：从左上往右下，字号逐项小一档，角度 ±vis.tilt（没给时 ±5° 交替），选中项垫强调色斜块、放大 1.15
    // 铺开（lay.cascadeSpread = diagonal，M12b-22，persona5#32）：按数据区的对角线均分步长（横 / 竖步长 = 区域 / 项数），字号阶梯下限 1.6（原来 1.05），选中块留出行距；没选 = 原来的紧凑排法
    const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx], diag = pickedStr(e, 'lay.cascadeSpread', 'compact') === 'diagonal', n0 = Math.max(1, items.length);
    let y = a.y;
    items.forEach((l, i) => {
      const k = (diag ? Math.max(1.6, 2.8 - i * 0.2) : Math.max(1.05, 2.1 - i * 0.22)) * (i === 0 ? 1.15 : 1), o = { ...titleO, size: e.base.size * k, weight: 900 };
      const w = W(e, l, o), h = LH(e, o, 1.25), x = diag ? a.x + S(14) + i * Math.max(0, (a.w - S(28) - w) / Math.max(1, n0 - 1)) * 0.92 : a.x + S(14) + i * Math.min(S(26), a.w * 0.05);
      if (diag) y = a.y + i * Math.max(h, (a.h - h) / Math.max(1, n0 - 1));
      // 放得下的判断留 0.5 余量（R4 回归修复 C1 ②，与 listRows 同口径）：铺开时末项按区高反推、正好贴底，浮点误差不该把它丢掉
      if (y + h > a.y + a.h + 0.5) return;
      const rr = { x: x - S(10), y, w: w + S(20), h };
      const deg = tiltOf(e, `menu#${i}`) || (i % 2 ? 5 : -4), cx = rr.x + rr.w / 2, cy = rr.y + rr.h / 2;
      markItem(e, rr, i);
      for (const c of ctxs) { c.save(); c.translate(cx, cy); c.rotate((deg * Math.PI) / 180); c.translate(-cx, -cy); }
      if (i === 0) {
        e.g.fillStyle = e.accent; e.g.beginPath(); e.g.moveTo(rr.x - S(6), rr.y + rr.h * 0.1); e.g.lineTo(rr.x + rr.w + S(10), rr.y); e.g.lineTo(rr.x + rr.w + S(2), rr.y + rr.h); e.g.lineTo(rr.x - S(12), rr.y + rr.h * 0.92); e.g.closePath(); e.g.fill();
      }
      T(e, l, x, y, h, i === 0 ? onAccent(e, o) : o);
      for (const c of ctxs) c.restore();
      logTarget(e.g, rr, l);
      y += h * 0.92;
    });
    return;
  }
  const rh = Math.max(S(40), tap(e), LH(e, titleO) + S(10));
  items.forEach((l, i) => {
    const y = a.y + i * (rh + S(6));
    if (y + rh > a.y + a.h + 0.5) return;
    const rr = { x: a.x, y, w: Math.min(a.w, S(320)), h: rh };
    LIST_BOX = { x: a.x, y: a.y, w: rr.w, h: y + rh - a.y };
    markItem(e, rr, i);
    const invC = i === 0 && focusMode ? focusDecor(e, rr, focusMode) : null;
    if (i === 0 && focusMode) FOCUS_DRAWN = rr;
    if (boxOn && !(i === 0 && focusMode)) { if (i === 0) drawBox(e.g, rr, e.t.key, e.pal); else { e.g.fillStyle = withAlpha(ink ?? e.text, 0.06); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); } }
    const o = i !== 0 ? titleO : invC ? { ...titleO, color: invC } : boxOn && !focusMode ? onKey(e, titleO) : { ...titleO, color: e.accent };
    T(e, l, rr.x + S(16), rr.y, rr.h, o);
    logTarget(e.g, rr, l);
  });
}

/** 帧占位表里压进 a 的贴边条（lay.hudOrg = edgeBar，M12a-16）让出宽 / 高：条在 a 的左 / 右 / 上 / 下边时把 a 从那一边收进来（留 gap）。卡行用（M12a-21） */
function clearBars(a: Rect, gap: number): Rect {
  let q = { ...a };
  for (const it of OCC.last?.items ?? []) {
    if (it.kind !== 'edgeBar') continue;
    const b = it.rect;
    if (!(b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h)) continue;
    const vertical = b.h >= b.w;
    if (vertical && b.x + b.w / 2 < q.x + q.w / 2) { const x = b.x + b.w + gap; q = { ...q, x, w: q.x + q.w - x }; }
    else if (vertical) q = { ...q, w: b.x - gap - q.x };
    else if (b.y + b.h / 2 < q.y + q.h / 2) { const y = b.y + b.h + gap; q = { ...q, y, h: q.y + q.h - y }; }
    else q = { ...q, h: b.y - gap - q.y };
  }
  return q.w > 0 && q.h > 0 ? q : a;
}

/**
 * 卡行几何（M12a-21；fitContent 的测量也用它，M12a-38）：张数 = 显式的 cnt.itemCount（限 1–5，Cult 的塔罗二选一），没给时原来的 3 张；
 * 卡宽 = min(按张数均分, 按可用高定宽)（竖长比不变，托盘里的卡不再被撑成近方形），没给 lay.cellAspect 时封顶 200（原来的）、比例 1 : 1.45；
 * 显式给了比例时不封顶（Civ6 伟人卡按高撑满）。当前卡抬高（lay.raisedCurrent）/ 其余下沉（hier.dimInactive > 0）时先从可用高里扣掉这一截
 */
function cardsGeom(e: ElCtx, a0: Rect): { n: number; w: number; h: number; gap: number; x0: number; y: number; a: Rect; cur: number; dim: number; raise: number; sink: number; below: number } {
  const S = (n: number) => n * e.k, r = e.r;
  const n = itemCountSet(e) ? Math.max(1, Math.min(5, itemCount(e, 3))) : 3, gap = S(18);
  // 与贴边条共存（M12a-16）：帧占位表里压进数据区的贴边条让出宽度（Balatro 的盲注卡在左侧状态竖栏右边）
  const a = clearBars(a0, S(12));
  const dim = Math.max(0, Math.min(1, r.num('hier.dimInactive', 0)));
  const raise = r.bool('lay.raisedCurrent') ? S(14) : 0, sink = dim > 0 ? S(12) : 0;
  // 塔罗（cmp.card = tarot，M12b-12）：说明写在卡外下方，可用高先扣掉三行说明
  // 卡下的次级动作（cmp.cardParts 含 actionBelow，M12b-69：Balatro 盲注卡下的「跳过 + 标签」）同样先扣掉
  const below = (cardKind(e.part('card')) === 'tarot' ? LH(e, e.small) * 3 + S(8) : 0) + cardBelowH(e, S(140));
  const ah = Math.max(1, a.h - raise - sink - below);
  const asp = numParam(r, 'lay.cellAspect'), k = asp !== null && asp > 0 ? 1 / Math.max(0.2, Math.min(5, asp)) : 1.45;
  const w0 = Math.min(asp !== null ? Infinity : S(200), (a.w - gap * (n - 1)) / n);
  const w = w0 * k > ah ? ah / k : w0, h = w0 * k > ah ? ah : w * k;
  const x0 = a.x + (a.w - (w * n + gap * (n - 1))) / 2, y = a.y + raise + (ah - h) / 2;
  // 当前卡（选中与导航焦点默认落在同一张，M12a-21）：流程演示指定的，否则正中那张（3 张时是第 2 张——原来画稀有度描边的那张）
  const fl = flowNow(), cur = fl?.s.focus !== undefined ? Math.max(0, Math.min(n - 1, fl.s.focus)) : Math.floor((n - 1) / 2);
  return { n, w, h, gap, x0, y, a, cur, dim, raise, sink, below };
}

function cardsRow(e0: ElCtx, a0: Rect, ink?: string) {
  // 卡片部件：卡面面板与卡上的字按 @card 查（M12a-01）
  const e = e0.part('card');
  const S = (n: number) => n * e.k;
  const G = cardsGeom(e, a0), { n, w, h, gap, x0, cur, dim } = G;
  // 稀有度（M12a-21）：只在稀有度该画时上色（皮肤之后显式给了 col.coding 又不含 rarity、或 st.rarityCue 显式清空时不画；与格子 slot() 同口径）——
  // 原来固定画：中间卡稀有度粗框、三个图标蓝 / 紫 / 橙（Into the Breach 写了 mono 也照画）
  const rar = rarityShown(e) && rarityCues(e).length > 0;
  const tier = (i: number) => [2, 3, 4, 1, 3][i % 5];
  // 卡内名字与说明统一对齐（M12a-21）：显式选了 lay.titleAlign 时两行都跟它；没选（兜底 left 不算，审查修复 A · D5）时原来的样子：名字居中、说明左起
  const ta = chosen(e, 'lay.titleAlign') ? optOf(e.r, 'lay.titleAlign', 'left') : null;
  const center = ta === 'center', nameCenter = ta === null || center;
  const interactive = e.r.str('ix.mode', 'singleCTA') !== 'readOnly';
  // 卡面（M12b-62）：整备 = 名册（into-the-breach#33：机甲名 + 职业 · 武器）、选角 = 角色（名字 + 称号）、技能 = 天赋；其余原来的三选一
  const draft = sampleItems(cardRows(sampleKind(e.r)) ?? pack().screens.draft, n);
  const rects = draft.map((_, i) => ({ x: x0 + i * (w + gap), y: G.y + (i === cur ? -G.raise : G.sink), w, h }));
  // 导航焦点落在当前卡（原来焦点在第 1 张、稀有度描边在第 2 张，两处分开）
  if (fl0() === undefined && focusActive(e) && !FOCUS_RECT && rects[cur]) FOCUS_RECT = rects[cur];
  draft.forEach(([c, name, desc], i) => {
    const rr = rects[i];
    const xf = revealOf(e, i, n, rr, a0);
    if (xf.hidden) return;
    markItem(e, rr, i);
    const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
    const moved = xf.alpha < 1 || xf.scale !== 1 || xf.dx || xf.dy;
    if (moved) for (const c of ctxs) { c.save(); c.globalAlpha *= xf.alpha; c.translate(rr.x + w / 2 + xf.dx, rr.y + h / 2 + xf.dy); c.scale(xf.scale, xf.scale); c.translate(-(rr.x + w / 2), -(rr.y + h / 2)); }
    // 非当前卡压暗（hier.dimInactive，M12a-21：原来只进了解析表、卡行不读）
    const dimmed = dim > 0 && i !== cur, dimK = 1 - dim * 0.7;
    // 终期审查修复 ㉚：不再给整张卡开 CSS filter（B7 的卡面一张 40–90 次绘制，每次都过一遍滤镜层；Balatro 盲注屏每帧 182 次）——卡画完后在卡的外形里铺一层黑（不透明度 = 1 − 亮度，
    // 与 brightness() 对不透明像素等价），只铺在最上面那张画布（有单独的字画布时铺在字画布上：下面的盒子与上面的字一起压暗）
    // 当前卡的边：稀有度色（原来第 2 张的那道粗框）；不画稀有度时可交互的界面用焦点色描边。类别 / 流派色（M12b-33，dead-cells#2：卷轴三选一按流派着红 / 紫 / 绿）优先：每张卡的外框与图标都用它
    const lc = lineColor(e, i);
    const edge = lc ?? (i === cur ? (rar ? rarityColor(e, tier(i)) : interactive ? e.focus : null) : null);
    // 卡面（M12b-12）：cmp.card（@card → 全局）选过时按版式画（Cult 的塔罗、StS 的 TCG、Balatro 的收藏卡……），没选时原来的「面板 + 图标 + 名字 + 三行说明」
    const dO = { ...e.small, color: ink ?? e.text };
    drawCard(e, rr, rowCard(i, c, name, desc, { rarity: rar ? tier(i) : undefined, line: i, current: i === cur }), { ink, legacy: () => {
      panel(e, rr, false, edge ? { border: { width: lc && i !== cur ? 2 : 3, color: edge } } : {}, 'card');
      icon(e, c, rr.x + w / 2, rr.y + h * 0.3, w * 0.28, lc ?? (rar ? rarityColor(e, tier(i)) : e.icon));
      const nO = { ...e.title, color: ink ?? e.title.color };
      T(e, name, nameCenter ? rr.x + w / 2 - W(e, name, nO) / 2 : rr.x + S(12), rr.y + h * 0.52, LH(e, e.title), nO);
      const lines = wrapText(e, plainText(desc), w - S(24), e.small);
      lines.slice(0, 3).forEach((l, j) => T(e, l, center ? rr.x + w / 2 - W(e, l, dO) / 2 : rr.x + S(12), rr.y + h * 0.52 + LH(e, e.title) + j * LH(e, e.small), LH(e, e.small), dO));
      logTarget(e.g, rr, name);
    } });
    if (dimmed) { const top = e.tx, sty = e.t.card ?? e.t.panel; top.save(); top.beginPath(); boxPath(top, rr, sty); top.clip(); top.fillStyle = `rgba(0,0,0,${(1 - dimK).toFixed(3)})`; top.fillRect(rr.x, rr.y, rr.w, rr.h); top.restore(); }
    // 塔罗的说明写在卡外下方（cult-of-the-lamb#32：卡里只有罗马数字、插画与名牌）；cardsGeom 已给它留了三行（压暗的卡下面这几行字仍用 brightness 滤镜，只有几次绘制）
    if (dimmed && G.below > 0 && cardKind(e) === 'tarot') for (const c of ctxs) { c.save(); c.filter = `brightness(${dimK.toFixed(3)})`; }
    if (G.below > 0 && cardKind(e) === 'tarot') wrapText(e, plainText(desc), w, e.small).slice(0, 3).forEach((l, j) => T(e, l, rr.x + w / 2 - W(e, l, dO) / 2, rr.y + h + S(6) + j * LH(e, e.small), LH(e, e.small), dO));
    if (dimmed && G.below > 0 && cardKind(e) === 'tarot') for (const c of ctxs) c.restore();
    if (moved) for (const c of ctxs) c.restore();
  });
}
/** 流程演示指定的焦点序号（没有流程 / 没指定时 undefined） */
const fl0 = () => flowNow()?.s.focus;

/**
 * 牌阵（lay.arrangement = spread，M12b-24，fam.occult-tarot 的 G-arrangement）：lay.spread = cross 十字 5 张 / celticCross 凯尔特十字 10 张（第 2 张横压在第 1 张上、
 * 右侧一列 4 张自下而上）/ triangle 三角 3 张；位置来自 graph.ts 的 layoutGraph('spread')。卡面走 drawCard：cmp.card 选过按它，没选时塔罗版式（说明不写，牌阵里的牌只露名字）
 */
function spreadCards(e0: ElCtx, a: Rect, ink?: string) {
  const e = e0.part('card'), S = (n: number) => n * e.k;
  const G = layoutGraph('spread', 0, 0, 'down', { spread: pickedStr(e, 'lay.spread', 'cross') }), { cols, rows } = G.grid ?? { cols: 3, rows: 3 };
  const gap = S(10), cw = (a.w - gap * (cols - 1)) / cols, ch = (a.h - gap * (rows - 1)) / rows;
  const h = Math.max(1, Math.min(ch, cw * 1.45)), w = h / 1.45;
  const kind = chosenKey(e, 'cmp.card') ? cardKind(e) : 'tarot';
  const rows0 = sampleItems(cardRows(sampleKind(e.r)) ?? pack().screens.draft, G.pts.length);
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  G.pts.forEach(([u, v], i) => {
    const cx = a.x + a.w * u, cy = a.y + a.h * v, rot = G.rot?.[i] ?? 0, [c, name, desc] = rows0[i];
    const rr = { x: cx - w / 2, y: cy - h / 2, w, h };
    if (rot) for (const g of ctxs) { g.save(); g.translate(cx, cy); g.rotate((rot * Math.PI) / 180); g.translate(-cx, -cy); }
    drawCard(e, rr, rowCard(i, c, name, desc, { current: i === 0 }), { kind, ink, small: true, legacy: () => { panel(e, rr, true, {}, 'card'); icon(e, c, cx, rr.y + h * 0.4, w * 0.35); const o = { ...e.small, color: ink ?? e.text }; T(e, name, cx - W(e, name, o) / 2, rr.y + h * 0.7, LH(e, o), o); } });
    if (rot) for (const g of ctxs) g.restore();
    markItem(e, rot ? { x: cx - h / 2, y: cy - w / 2, w: h, h: w } : rr, i, i === 0);
  });
}

/* ---------------- 数据区构图与分组格位（M12b-11） ---------------- */

/** 网格换一份样本画（M12b-11：双网格的第二块 / 双窗停靠的背包窗）：gridItems 在 fn 里读这份行与类别，画完复原 */
let GRID_SOURCE: { rows: ItemRow[]; kind: SampleKind } | null = null;
function withGridSource<T>(rows: ItemRow[], kind: SampleKind, fn: () => T): T {
  const prev = GRID_SOURCE;
  GRID_SOURCE = { rows, kind };
  try { return fn(); } finally { GRID_SOURCE = prev; }
}
/** 主体两侧列（lay.arrangement = flankColumns）用的主体矩形与两侧可用的栏：screenPass 在分栏之后设，drawData 读（没有主体时 null，按数据区中间三分之一当身体） */
let FLANK: { focal: Rect; left: Rect | null; right: Rect | null;
  /** 同栏里排着的 inherit 元素（screenPass 的 dataYield 那一遍量出的框，R4 C2 ⑤）：格组竖向躲开它们 */
  avoid?: Rect[] } | null = null;
/** 两侧列真的把格组分到了主体两边（左右两栏都够 90 宽，与 flankColumns 的 useL / useR 同口径） */
const flankBoth = (e: ElCtx, fk: typeof FLANK) => !!fk && !!fk.left && !!fk.right && fk.left.w >= e.k * 90 && fk.right.w >= e.k * 90;

/** 段落（lay.sections，有序多选，M12b-11）：选过才分段（旧皮肤只认皮肤之后的层），没选 null */
function sectionsOf(e: ChoiceCtx): string[] | null {
  const k = chosenKey(e, 'lay.sections');
  const l = k ? e.r.list(k).filter((x) => SECTION_KINDS.has(x)) : [];
  return l.length ? l : null;
}
const SECTION_KINDS = new Set(['grid', 'row', 'list', 'stats', 'text', 'slotGroups']);
/** 段内子栏数（lay.subColumns 1–3；选过才分） */
function subColumnsOf(e: ElCtx): number {
  const k = chosenKey(e, 'lay.subColumns'), v = k ? Math.round(e.r.num(k, 1)) : 1;
  return Number.isFinite(v) ? Math.max(1, Math.min(3, v)) : 1;
}
/** 第 i 段 / 子栏的标题：内容包的 screens.sections，没写时页签（跳过第一个「全部」）；标题前缀 = 页签图标（Elden 的段标题线稿图标） */
function sectionTitle(i: number): string {
  const s = pack().screens, t = s.sections?.[i] ?? s.tabs[(i + 1) % s.tabs.length] ?? s.tabs[0];
  const ic = s.sections ? undefined : s.tabIcons?.[(i + 1) % s.tabs.length];
  return ic ? `${ic} ${t}` : t;
}

/**
 * 分段数据区（lay.sections，M12b-11：hollow-knight#21 的「已装备行 + 凹槽 / 分隔线 / 网格」、elden-ring#25 的嵌套小表）：数据区按段纵向切开，每段一个小标题（groupHeader）
 * + 一种内容：grid 网格 / row 一行格子 / list 列表 / stats 键值表 / text 长文 / slotGroups 固定分组的格组；row 与 stats 按内容高，其余平分剩下的高。
 * 段与段之间按 lay.grouping：divider = 一道分隔线（ruleLine，认 vis.dividerStyle / strokeFade）、tonalInset = 段底垫一块深一档的凹槽、card = 每段一块面板、其余留白。
 * lay.subColumns = 2 / 3 时每段再横着分成几栏，各有自己的标题（Elden 中栏的「攻击力 | 防御减伤」）
 */
function sectionedData(e: ElCtx, a: Rect, list: string[], ink?: string) {
  const S = (n: number) => n * e.k, gap = S(12);
  const tH = LH(e, { ...e.small, weight: 700 }) + S(8);
  const grp = chosen(e, 'lay.grouping') ? e.r.str('lay.grouping', '') : '';
  const cols = subColumnsOf(e);
  const rowH = Math.max(S(44), tap(e)) + tH;
  const kvRows = (chartData().pairs?.length ?? 4);
  const statH = tH + Math.ceil(kvRows / cols) * Math.max(S(30), LH(e, e.base, 1.5)) + S(4);
  const fixedH = (k: string) => (k === 'row' ? rowH : k === 'stats' ? statH : 0);
  const flex = list.filter((k) => !fixedH(k)).length;
  const used = list.reduce((s, k) => s + fixedH(k), 0) + gap * (list.length - 1);
  const flexH = flex ? Math.max(S(40), (a.h - used) / flex) : 0;
  let y = a.y, ti = 0;
  list.forEach((kind, si) => {
    const h = Math.min(a.y + a.h - y, fixedH(kind) || flexH);
    if (h <= S(10)) return;
    const sr = { x: a.x, y, w: a.w, h };
    if (grp === 'card') panel(e, sr, true);
    else if (grp === 'tonalInset') wellBox(e, sr);
    const pad = grp === 'card' || grp === 'tonalInset' ? S(8) : 0;
    const inner = { x: sr.x + pad, y: sr.y + pad, w: sr.w - pad * 2, h: sr.h - pad * 2 };
    const cw = (inner.w - gap * (cols - 1)) / cols;
    for (let c = 0; c < cols; c++) {
      const cr = { x: inner.x + c * (cw + gap), y: inner.y, w: cw, h: inner.h };
      groupHeader(e, { ...cr, h: tH - S(4) }, sectionTitle(ti++), false, ink);
      sectionBody(e, { x: cr.x, y: cr.y + tH, w: cr.w, h: cr.h - tH }, kind, ink, c, cols);
    }
    y += h + gap;
    if (si < list.length - 1 && grp === 'divider' && y - gap / 2 < a.y + a.h) ruleLine(e, a.x, a.x + a.w, Math.round(y - gap / 2));
  });
}

/** 一段的内容（sectionedData）：c / n = 第几个子栏 / 共几栏（stats 按栏切键值行） */
function sectionBody(e: ElCtx, b: Rect, kind: string, ink: string | undefined, c: number, n: number) {
  const S = (x: number) => x * e.k;
  if (b.h <= S(8) || b.w <= S(20)) return;
  switch (kind) {
    case 'grid': gridItems(e, b, false, ink); return;
    case 'list': listRows(e, b, ink); return;
    case 'text': textBlock(e, b, ink); return;
    case 'slotGroups': fixedGroups(e, b, ink); return;
    case 'stats': { const d = chartData(), pairs = d.pairs ?? [], per = Math.ceil(pairs.length / n); statViz(e, 'keyValue', b, { ...d, pairs: pairs.slice(c * per, (c + 1) * per) }, ink); return; }
    case 'row': {
      // 一行格子（已装备的护符行）：格边 = 段高，个数 = 放得下的（最多 cnt.itemCount / 6），样本 = 这一屏的条目
      const s = Math.min(b.h, Math.max(S(36), tap(e))), gp = S(8), n0 = Math.max(1, Math.min(itemCountOr(e, 6), Math.floor((b.w + gp) / (s + gp))));
      const src = sampleItems(gridSource(e), n0);
      for (let i = 0; i < n0; i++) { const rr = { x: b.x + i * (s + gp), y: b.y, w: s, h: s }; const [ch, name, , ic] = src[i]; slot(e, rr, ch, { item: ic ? name : undefined, empty: i >= Math.ceil(n0 * 0.6) }); markItem(e, rr, i, false); }
      return;
    }
  }
}

/** 格组（cmp.slotGroup，M12b-11）：内容包的 screens.slotGroups（[组名, 部位符号, 格数, 已装, 部位?]），没写时 GENERIC 的一份 */
const slotGroupsOf = () => samplesFor('slotGroups');
/** 格组标题的位置（cmp.slotGroupTitle：outside 格子外侧 / above 格子上方 / none 不写；没选时 above） */
const slotGroupTitleOf = (e: ElCtx, def = 'above') => pickedStr(e, 'cmp.slotGroupTitle', def);
/**
 * 一个格组（cmp.slotGroup = titled，cyberpunk-2077#13）：组名（强调色、大写小字）+ 计数徽章（「可用 n」+ 方徽章，次要色 / 第二强调色）+ N 格横排；
 * 空格画部位剪影（st.emptySlot = silhouette，符号 = 组的部位符号）。align = right 时整组右对齐到 x（主体左侧的那一列），标题 outside 时写在格子外侧。
 * 返回整组的外接框与格子中最靠主体那一侧的中点（引线的终点）
 */
function slotGroupBlock(e0: ElCtx, x: number, y: number, maxW: number, grp: SlotGroupRow, align: 'left' | 'right', titleMode: string, measure = false, cap = e0.k * 40): { box: Rect; tip: [number, number] } {
  const e = e0.part('slotGroup'), S = (n: number) => n * e.k, [title, glyph, n, filled] = grp;
  const tO = { ...e.small, weight: 800, color: e.accent, upper: true }, bO = { ...e.small, size: e.small.size * 0.8, color: e.accent2 };
  // 计数徽章（cmp.slotGroup = counted，默认）：「可用 n」+ 一枚方徽章；plain = 只写组名
  const counted = pickedStr(e, 'cmp.slotGroup', 'counted') !== 'plain', badge = counted ? `可用 ${Math.max(0, n - filled)}` : '';
  // 格边：至多 cap（默认 40；固定分组排不下时调用方给小一点的，审查修复 ㉗），至少 28 与触控下限取小
  const s = Math.max(Math.min(cap, (maxW - S(8) * (n - 1)) / Math.max(1, n)), Math.min(S(28), tap(e))), gp = S(6);
  const slotsW = n * s + (n - 1) * gp, tw = titleMode === 'none' ? 0 : Math.max(W(e, title, tO), W(e, badge, bO) + S(16));
  const outside = titleMode === 'outside';
  const w = outside ? slotsW + S(10) + tw : Math.max(slotsW, tw), th = titleMode === 'above' ? LH(e, tO) + (counted ? LH(e, bO) : 0) + S(2) : 0;
  const h = th + s;
  const bx = align === 'right' ? x - w : x;
  const box = { x: bx, y, w, h };
  // 格子贴主体那一侧（左列 = 右边，右列 = 左边）；outside 时标题在外侧
  const sx = align === 'right' ? bx + w - slotsW : bx, sy = y + th;
  const tip: [number, number] = [align === 'right' ? sx + slotsW : sx, sy + s / 2];
  if (measure) return { box, tip };
  if (titleMode !== 'none') {
    const tx = outside ? (align === 'right' ? sx - S(10) - tw : sx + slotsW + S(10)) : align === 'right' ? bx + w - W(e, title, tO) : bx;
    const ty = outside ? sy + (s - LH(e, tO) - LH(e, bO)) / 2 : y;
    const txR = (str: string, o: Partial<TextOpts>) => (align === 'right' ? tx + tw - W(e, str, o) : tx);
    T(e, title, outside ? txR(title, tO) : tx, ty, LH(e, tO), tO);
    // 计数徽章：小字 + 一枚方徽章写数字
    const by = ty + LH(e, tO), bw = W(e, badge, bO), bxx = outside ? txR(badge, bO) - (align === 'right' ? S(14) : 0) : align === 'right' ? bx + w - bw - S(14) : bx;
    if (counted) { T(e, badge, bxx, by, LH(e, bO), bO); e.g.save(); e.g.strokeStyle = e.accent2; e.g.lineWidth = 1; e.g.strokeRect(bxx + bw + S(3), by + S(3), S(10), S(10)); e.g.restore(); }
  }
  // 无格（cmp.slot = bare 选过，R4 C2 ⑨，hollow-knight#37：固定分组的图标原来仍套细灰方框）：图标直接放在底上、空槽只画淡剪影
  const bare = pickedStr(e0, 'cmp.slot', 'cell') === 'bare';
  for (let i = 0; i < n; i++) {
    const rr = { x: sx + i * (s + gp), y: sy, w: s, h: s };
    slot(e, rr, glyph, i < filled ? (bare ? { bare } : {}) : { empty: true, emptyMode: 'silhouette', ...(bare ? { bare } : {}) });
    markItem(e0, rr, i, false);
  }
  // 整组（组名 + 计数 + 格子）也进条目表（B8 审查修复 ㉕：浮动详情原来只躲格子、压在组名上）；格子先进，条目表第一项仍是第一格
  ITEMS.push(box);
  return { box, tip };
}

/** 身体部位点（flankColumns 的引线起点，主体矩形里的相对位置；side = 这一组在主体左 / 右哪一列，四肢点跟着偏） */
const BODY_PTS: Record<string, [number, number]> = { head: [0.5, 0.1], eyes: [0.5, 0.14], torso: [0.5, 0.36], core: [0.5, 0.48], back: [0.5, 0.3], arms: [0.3, 0.4], hands: [0.24, 0.56], legs: [0.42, 0.78] };
const bodyPoint = (part: string | undefined, side: -1 | 1, i: number): [number, number] => {
  const p = BODY_PTS[part ?? ''] ?? [0.5, 0.18 + ((i * 0.13) % 0.7)];
  return [p[0] === 0.5 ? 0.5 : 0.5 + side * (0.5 - p[0]), p[1]];
};

/**
 * 主体两侧列（lay.arrangement = flankColumns，M12b-11，cyberpunk-2077#12 / disco-elysium#26）：格组分到主体左右两列（前一半左、后一半右），
 * 左列右对齐、右列左对齐，每组的纵向位置对齐它挂的身体部位（screens.slotGroups 的部位 → BODY_PTS），挤了往下推、出底往上收；
 * cmp.leader 选过时从部位点拉一条引线到组的格子（M12b-24 的 drawLeader，强调色）。主体两侧没地方时退回整块数据区（中间三分之一当身体）
 */
function flankColumns(e: ElCtx, a: Rect, ink?: string): Rect | undefined {
  const S = (n: number) => n * e.k, groups = slotGroupsOf();
  const fk = FLANK;
  const body = fk?.focal ?? { x: a.x + a.w / 3, y: a.y, w: a.w / 3, h: a.h };
  const L = fk ? fk.left : { x: a.x, y: a.y, w: a.w / 3 - S(16), h: a.h }, Rr = fk ? fk.right : { x: a.x + (a.w * 2) / 3 + S(16), y: a.y, w: a.w / 3 - S(16), h: a.h };
  if (!fk) figure(e, { x: body.x + body.w * 0.2, y: body.y, w: body.w * 0.6, h: body.h }, withAlpha(e.text, 0.25));
  const cols: { r: Rect; side: -1 | 1; gs: [SlotGroupRow, number][] }[] = [];
  const half = Math.ceil(groups.length / 2);
  const useL = !!L && L.w >= S(90), useR = !!Rr && Rr.w >= S(90);
  if (useL) cols.push({ r: L!, side: -1, gs: [] });
  if (useR) cols.push({ r: Rr!, side: 1, gs: [] });
  if (!cols.length) return undefined;
  const tm = slotGroupTitleOf(e, 'outside'), ld = leaderOf(e.part('slotGroup'));
  // 只剩一栏（另一边没地方 / 让给了第三区）、一栏竖着排不下、这一栏又够并排两列时，分成并排的两列（B8 审查修复 ⑬）
  if (cols.length === 1 && groups.length > 1) {
    const c0 = cols[0], hw = (c0.r.w - S(16)) / 2, al = c0.side < 0 ? 'right' : 'left';
    const need = groups.reduce((sum, gr) => sum + slotGroupBlock(e, 0, 0, c0.r.w, gr, al, tm, true).box.h + S(10), -S(10));
    if (need > c0.r.h && hw >= S(90) && groups.every((gr) => slotGroupBlock(e, 0, 0, hw, gr, al, tm, true).box.w <= hw + 0.5)) {
      cols.length = 0;
      cols.push({ r: { ...c0.r, w: hw }, side: c0.side, gs: [] }, { r: { ...c0.r, x: c0.r.x + hw + S(16), w: hw }, side: c0.side, gs: [] });
    }
  }
  groups.forEach((gr, i) => { const c = cols.length === 1 ? cols[0] : i < half ? cols[0] : cols[1]; c.gs.push([gr, i]); });
  // 实际画出的格组的外接框交回去（drawOverflow / 模板占位登记看它，审查修复 ⑬）
  let box: Rect | undefined;
  for (const c of cols) {
    const right = c.side < 0, x = right ? c.r.x + c.r.w : c.r.x;
    // 同栏的 inherit 元素（R4 C2 ⑤，disco-elysium#50：左栏的生命 / 士气压在「身体」「饰品」两组上）：横向与这一组相交的元素，组竖着让开（往下推到元素下沿以下；
    // 出底往上收时收到元素上沿以上）。没有元素时与原来逐字一样
    const obs = (fk?.avoid ?? []).filter((o) => o.w > 0 && o.h > 0 && o.y < c.r.y + c.r.h && c.r.y < o.y + o.h);
    // 一遍排位（cap = 格边上限，slotGroupBlock 的默认 40；compact = 不对齐身体部位、从栏顶依次往下排）：先量高、按部位排序，再按部位的纵向位置放、挤了往下推，出底往上收
    const plan = (cap?: number, compact = false) => {
      const items = c.gs.map(([gr, i]) => { const m = slotGroupBlock(e, x, 0, c.r.w, gr, right ? 'right' : 'left', tm, true, cap).box; return { gr, i, pt: bodyPoint(gr[4], c.side, i), h: m.h, bx: m.x, bw: m.w }; })
        .sort((p, q) => p.pt[1] - q.pt[1]);
      const hitOf = (it: (typeof items)[number], yy: number) => obs.find((o) => o.x < it.bx + it.bw && it.bx < o.x + o.w && yy < o.y + o.h + S(6) && o.y - S(6) < yy + it.h);
      let y = c.r.y;
      const ys = items.map((it) => {
        const want = compact ? c.r.y : body.y + body.h * it.pt[1] - it.h / 2;
        let yy = Math.max(y, want);
        for (let k = 0, o = hitOf(it, yy); o && k <= obs.length; k++, o = hitOf(it, yy)) yy = o.y + o.h + S(6);
        y = yy + it.h + S(10); return yy;
      });
      const down = ys.slice(), over = y - S(10) - (c.r.y + c.r.h);
      if (over > 0) for (let j = ys.length - 1, lim = c.r.y + c.r.h; j >= 0; j--) {
        ys[j] = Math.min(ys[j], lim - items[j].h);
        for (let k = 0, o = hitOf(items[j], ys[j]); o && k <= obs.length; k++, o = hitOf(items[j], ys[j])) ys[j] = o.y - S(6) - items[j].h;
        lim = ys[j] - S(10);
      }
      // 放得下 = 按栏顶夹住（画的时候 max(栏顶, y)）以后相邻两组不相叠
      const fit = items.every((it, j) => j === 0 || Math.max(c.r.y, ys[j - 1]) + items[j - 1].h <= Math.max(c.r.y, ys[j]) + 0.5);
      return { items, ys, down, cap, fit };
    };
    // 往上收时收到栏顶以上、夹回栏顶后叠在一起（这一栏放不下全部格组，R4 审查修复 ⑯：disco 背包 + a11y.textScale 1.3 时「身体」压在「头部」上）：格子缩到 34、再到 28 重排
    // （与固定分组同一套），再不行就不对齐身体部位、从栏顶依次往下排；仍放不下时不往上收（按往下推的位置画，伸出栏底的那几组不画、栏底画渐隐——与固定分组同口径），
    // 不再叠在一起。放得下的栏（不叠）与原来一样
    let P = plan();
    for (const cap of [S(34), S(28)]) if (!P.fit) P = plan(cap);
    if (!P.fit) P = plan(S(28), true);
    const { items } = P, ys = P.fit ? P.ys : P.down;
    let dropped = false;
    items.forEach((it, j) => {
      if (!P.fit && ys[j] + it.h > c.r.y + c.r.h + 0.5) { dropped = true; return; }
      const q = slotGroupBlock(e, x, Math.max(c.r.y, ys[j]), c.r.w, it.gr, right ? 'right' : 'left', tm, false, P.cap);
      if (ld) drawLeader(e, [body.x + body.w * it.pt[0], body.y + body.h * it.pt[1]], [q.tip[0] + (right ? S(4) : -S(4)), q.tip[1]], ld.kind, ld.end, e.accent);
      box = box ? unionRect(box, q.box) : q.box;
    });
    if (dropped && e.r.str('lay.overflow', 'single') !== 'longScroll') edgeFade(e, c.r, 'bottom');
  }
  void ink;
  return box;
}

/**
 * 固定分组（lay.arrangement = fixedGroups，M12b-11，hollow-knight#26 / black-myth#35）：按 screens.slotGroups 的组固定位次排——每组一个小标题（groupHeader）+ 自己的一排格子，
 * 组与组从左往右、排满换行；空槽画部位剪影。没有格框时写 cmp.slot = bare（图标直接放在底上）
 */
function fixedGroups(e: ElCtx, a: Rect, ink?: string): Rect | undefined {
  const S = (n: number) => n * e.k, groups = slotGroupsOf(), gap = S(18);
  const tm = slotGroupTitleOf(e, 'above');
  // 先按满尺寸排；有组放不下时格子缩到 34、再到 28（触控下限）重排，仍放不下的组不画、数据区底边画渐隐（B8 审查修复 ㉗：原来一声不响地少画一半组）
  const pack0 = (cap: number) => {
    let x = a.x, y = a.y, rowH = 0, dropped = 0;
    const at: [SlotGroupRow, number, number][] = [];
    for (const gr of groups) {
      const m = slotGroupBlock(e, 0, 0, a.w, gr, 'left', tm, true, cap).box;
      if (x > a.x && x + m.w > a.x + a.w) { x = a.x; y += rowH + gap; rowH = 0; }
      if (y + m.h > a.y + a.h + 0.5) { dropped++; continue; }
      at.push([gr, x, y]); x += m.w + gap; rowH = Math.max(rowH, m.h);
    }
    return { at, dropped, cap };
  };
  let P = pack0(S(40));
  for (const cap of [S(34), S(28)]) if (P.dropped) P = pack0(cap);
  let box: Rect | undefined;
  for (const [gr, x, y] of P.at) { const q = slotGroupBlock(e, x, y, a.w, gr, 'left', tm, false, P.cap).box; box = box ? unionRect(box, q) : q; }
  if (P.dropped && e.r.str('lay.overflow', 'single') !== 'longScroll') edgeFade(e, a, 'bottom');
  void ink;
  return box;
}

/**
 * 双网格（lay.composition = dualGrid，M12b-11，factorio#24）：数据区左右各一块网格、各带一行页签——左 = 这一屏的条目（背包），右 = 配方（制作区，
 * 页签 = 内容包的页签图标；原料不够的配方算锁定，按 st.locked 画——Factorio 写 redTint = 整格红底）。两块都走 gridItems（几何、焦点、格子状态照旧）
 */
function dualGrid(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k, gap = S(16), w = (a.w - gap) / 2, tabH = Math.max(S(28), tap(e) * 0.8);
  const L = { x: a.x, y: a.y, w, h: a.h }, Rr = { x: a.x + w + gap, y: a.y, w, h: a.h };
  const sc = pack().screens, icons = sc.tabIcons ?? sc.tabs.map((t) => t.slice(0, 1));
  // 右边一行大图标页签（第一个选中）
  const tw = Math.min(S(56), (Rr.w - S(6) * 3) / 4);
  for (let i = 0; i < 4; i++) { const tr = { x: Rr.x + i * (tw + S(6)), y: Rr.y, w: tw, h: tabH }; panel(e, tr, true, i === 0 ? { border: { width: 2, color: e.accent } } : {}, 'control'); icon(e, icons[i % icons.length] ?? '◆', tr.x + tw / 2, tr.y + tabH / 2, tabH * 0.55, i === 0 ? e.accent : e.icon); }
  groupHeader(e, { x: L.x, y: L.y, w: L.w, h: tabH }, sc.tabs[0] ?? '', false, ink);
  gridItems(e, { x: L.x, y: L.y + tabH + S(8), w: L.w, h: L.h - tabH - S(8) }, false, ink);
  const rec = samplesFor('recipes');
  const rows: ItemRow[] = rec.map(([g0, name, , inp]) => [g0, name, 0, undefined, { locked: inp.some(([, h, q]) => h < q) }]);
  const body = { x: Rr.x, y: Rr.y + tabH + S(8), w: Rr.w, h: Rr.h - tabH - S(8) };
  withGridSource(rows, 'recipes', () => gridItems(e, body, false, ink));
}

/**
 * 双窗停靠（lay.container = windowPair，M12b-11，factorio#32、G-window-system 的最小形态）：主窗口右、停靠窗口左，同高贴靠（不做拖动）；
 * 停靠窗内容 lay.dockContent：inventory = 背包网格（物品样本）/ list = 列表 / detail = 详情；窗口顶上一条标题（拖拽条画法跟 cmp.plate@titleBar）
 */
function dockWindow(e: ElCtx, r: Rect, kind: string, ink?: string): Rect | null {
  const S = (n: number) => n * e.k, th = Math.max(S(30), LH(e, e.title) + S(8));
  const label = kind === 'detail' ? '详情' : kind === 'list' ? (pack().screens.tabs[1] ?? pack().screens.tabs[0]) : '背包';
  groupHeader(e, { x: r.x + S(14), y: r.y + S(8), w: r.w - S(28), h: th - S(8) }, label, false, ink);
  const b = { x: r.x + S(14), y: r.y + th + S(6), w: r.w - S(28), h: r.h - th - S(20) };
  // 详情：交回整块停靠窗（标题条 + 详情 + 里面的按钮，B10 审查修复 ㉒）
  if (kind === 'detail') { drawDetail(e, b, ink); return r; }
  // 实际画出的列表 / 网格的外接框交回去（B8 审查修复 ⑩：screenPass 登记进模板占位，合规层与 inherit 元素不压停靠窗的格子）
  if (kind === 'list') { const prev = LIST_BOX; LIST_BOX = null; listRows(e, b, ink); const q = LIST_BOX as Rect | null; LIST_BOX = prev; return q; }
  const c = withGridSource(pack().menu.items, 'items', () => gridItems(e, b, false, ink));
  return c && typeof c === 'object' && 'w' in c ? c : null;
}

function pyramid(e: ElCtx, a: Rect) {
  // 十连结果：上 5 下 5（或按 cnt.itemCount），金卡在中间
  const S = (n: number) => n * e.k;
  const n = count(e, 10), rows = n > 6 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
  const gap = S(10);
  const w = Math.min(S(96), (a.w - gap * (rows[0] - 1)) / rows[0]), h = Math.min(w * 1.45, (a.h - gap) / rows.length - gap);
  let k = 0;
  rows.forEach((cnt, ri) => {
    const x0 = a.x + (a.w - (w * cnt + gap * (cnt - 1))) / 2;
    for (let i = 0; i < cnt; i++, k++) {
      const tier = k === 2 ? 4 : k === 6 ? 3 : k % 3 === 0 ? 2 : 1;
      const rr = { x: x0 + i * (w + gap), y: a.y + ri * (h + gap), w, h };
      markItem(e, rr, k, false);
      const xf = revealOf(e, k, n, rr, a);
      if (xf.hidden || xf.back) { withReveal(e, rr, xf, () => undefined, tier); continue; }
      const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
      const moved = xf.alpha < 1 || xf.scale !== 1 || xf.sx !== 1 || xf.dx || xf.dy;
      if (moved) for (const c of ctxs) { c.save(); c.globalAlpha *= xf.alpha; c.translate(rr.x + w / 2 + xf.dx, rr.y + h / 2 + xf.dy); c.scale(xf.scale * Math.max(0.02, Math.abs(xf.sx)), xf.scale); c.translate(-(rr.x + w / 2), -(rr.y + h / 2)); }
      panel(e, rr, true, { radius: 6, border: { width: 2, color: rarityColor(e, tier) } });
      if (tier >= 3) { const gr = e.g.createRadialGradient(rr.x + w / 2, rr.y + h / 2, 2, rr.x + w / 2, rr.y + h / 2, w); gr.addColorStop(0, withAlpha(rarityColor(e, tier), 0.5)); gr.addColorStop(1, withAlpha(rarityColor(e, tier), 0)); e.g.fillStyle = gr; e.g.fillRect(rr.x, rr.y, w, h); }
      // 卡面：高稀有度（SSR 以上）半身立绘铺满，其余 Q 版小人完整放进；没加载完时是剪影
      const art = { x: rr.x + 4, y: rr.y + 4, w: w - 8, h: h * 0.75 };
      const hi = tier >= 3;
      if (!smooth(e.g, () => drawImageFitFx(e.g, characterImage(e.r, hi ? 'bust' : 'chibi'), art, hi ? 'cover' : 'contain', hi ? [0.5, 0.1] : [0.5, 1], renderModeOf(e, 'character')))) figure(e, art, rarityColor(e, tier));
      const L = ['N', 'R', 'SR', 'SSR', 'UR'][tier];
      T(e, L, rr.x + S(4), rr.y + h - LH(e, e.small) - S(2), LH(e, e.small), { ...e.small, weight: 900, color: rarityColor(e, tier) });
      if (moved) for (const c of ctxs) c.restore();
    }
  });
}

function ringItems(e: ElCtx, a: Rect, cross: boolean) {
  const S = (n: number) => n * e.k;
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2, R0 = Math.min(a.w, a.h) * 0.36;
  const n = cross ? 4 : count(e, 6);
  e.g.strokeStyle = withAlpha(e.text, 0.2); e.g.lineWidth = 2; e.g.beginPath(); e.g.arc(cx, cy, R0, 0, Math.PI * 2); e.g.stroke();
  // 环心的中心物件：cnt.focal = none 时留空（M12a-37：Cult 的对话轮盘环心是世界里的信徒，原来盖了一块灰盒）
  const fc = e.r.str('cnt.focal', 'none');
  const centre = fc !== 'none' && fc !== 'auto' ? { x: cx - R0 * 0.45, y: cy - R0 * 0.45, w: R0 * 0.9, h: R0 * 0.9 } : null;
  if (centre) drawGreybox(e.g, centre, '中心物件', { small: true, radius: R0 });
  const s = Math.max(tap(e), Math.min(S(60), R0 * 0.55));
  // 环上的项（M12b-62）：指令环 = 指令（cult-of-the-lamb#26：原来是背包的矿石 / 木材 / 药瓶）、锻造环 = 配方、技能环 = 天赋；纸娃娃（装备）仍是物品
  const rk = sampleKind(e.r), items = ['commands', 'recipes', 'talents', 'pauseMenu'].includes(rk) ? gridSource(e) : pack().menu.items;
  // 环心名 / 二级弧（lay.ringLabel / ringNested，M12b-22）选过时当前项（第一格）放大 1.15 倍（cult-of-the-lamb#25，B9 审查修复 ㉖）
  const rl = pickedStr(e, 'lay.ringLabel', 'none'), rn = pickedStr(e, 'lay.ringNested', 'none'), big = rl === 'center' || rl === 'top' || rn === 'arc';
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2, si = big && i === 0 ? s * 1.15 : s;
    const x = cx + Math.cos(t) * R0 - si / 2, y = cy + Math.sin(t) * R0 - si / 2;
    // 图标规则同 gridItems：声明了图集图标的按物品名查，没声明的只给符号
    const [ch, name, , ic] = items[i % items.length];
    slot(e, { x, y, w: si, h: si }, ch, { empty: i >= n - 2, item: ic ? name : undefined });
    // 登记条目（审查修复 A · D7）：浮动详情（tpl.loadout）锚到第一格、避开纸娃娃周围的格子
    markItem(e, { x, y, w: si, h: si }, i, false);
  }
  // 环心物件也躲（排在格子后面：锚点仍是第一格）
  if (centre) ITEMS.push(centre);
  // 当前项的名字与说明（lay.ringLabel，M12b-22，cult-of-the-lamb#25）：center = 环心（环心有物件时写在物件下面）、top = 环的正上方；二级弧（lay.ringNested = arc，#28）：当前项外侧再展开一段小格
  // 说明行：环上条目自带说明（物品 / 配方……）时用它，没有时取这一类样本的说明（kindRows 的 desc）
  const [, name, desc] = items[0] ?? ['', '', ''], kd = kindRows(rk)?.[0]?.desc ?? '';
  // 二级弧的位置（当前项外侧，半径 R1、格 s2）：环顶的名字要排在它上面（审查修复 ㉖：原来名字落在二级弧的格子里）
  const R1 = R0 + s * 1.15, s2 = s * 0.72;
  if (rl === 'center' || rl === 'top') {
    const no = { ...e.title, color: e.text }, so = { ...e.small, color: mutedOf(e, 0.75) }, d0 = typeof desc === 'string' && desc ? plainText(desc) : kd, dl = d0 ? wrapText(e, d0, R0 * 1.4, e.small).slice(0, 2) : [];
    const top = rn === 'arc' ? cy - R1 - s2 / 2 : cy - R0 - (big ? s * 1.15 : s) / 2;
    const blockH = LH(e, no) + dl.length * LH(e, so), y0 = rl === 'top' ? top - S(10) - blockH : centre ? centre.y + centre.h + S(4) : cy - blockH / 2;
    T(e, String(name), cx - W(e, String(name), no) / 2, y0, LH(e, no), no);
    dl.forEach((l, i) => T(e, l, cx - W(e, l, so) / 2, y0 + LH(e, no) + i * LH(e, so), LH(e, so), so));
  }
  if (rn === 'arc') {
    // 二级弧的格子 = 当前项的下一级选项（审查修复 ㉖：原来取环上后面几项，二级环重复了兄弟项）：环上是指令 / 配方 / 天赋这类时取物品（「赠礼 → 送哪件」），环上是物品时取指令
    const sub = items === pack().menu.items ? (kindRows('commands') ?? []).map((x) => x.icon) : pack().menu.items.map(([g]) => g);
    const t0 = -Math.PI / 2, m2 = 3;
    for (let j = 0; j < m2; j++) {
      const t = t0 + (j - (m2 - 1) / 2) * (s2 * 1.25 / R1), x = cx + Math.cos(t) * R1 - s2 / 2, y = cy + Math.sin(t) * R1 - s2 / 2;
      const ch2 = sub[j % Math.max(1, sub.length)] ?? '';
      slot(e, { x, y, w: s2, h: s2 }, ch2, j === 0 ? { selected: true } : {});
    }
  }
}

function fanCards(e: ElCtx, a: Rect) {
  const S = (n: number) => n * e.k;
  const n = count(e, 5), h = Math.min(a.h * 0.9, S(170)), w = h * 0.68;
  const cx = a.x + a.w / 2, base = a.y + a.h;
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) * 0.16;
    e.g.save(); e.g.translate(cx, base + h * 1.6); e.g.rotate(t); e.g.translate(-cx, -(base + h * 1.6));
    const rr = { x: cx - w / 2, y: base - h - (i === 2 ? S(18) : 0), w, h };
    // 卡面（M12b-12）：cmp.card 选过时按版式画（样本 = 内容包的手牌），没选时原来的「面板 + 灰盒插画 + 序号徽章」
    drawCard(e, rr, handCard(i, ''), { small: true, legacy: () => {
      panel(e, rr, true, { radius: 8 });
      drawGreybox(e.g, { x: rr.x + 6, y: rr.y + 6, w: w - 12, h: h * 0.5 }, '', { small: true });
      badge(e, rr.x + S(12), rr.y + S(12), S(11), 'crystal', String(i + 1));
    } });
    e.g.restore();
    markItem(e, rr, i, false);
    logTarget(e.g, { x: rr.x, y: rr.y, w, h }, `牌 ${i + 1}`);
  }
}

function track(e: ElCtx, a: Rect, ink?: string) {
  // 通行证：免费 / 付费两条轨道，节点等级 + 奖励，当前进度
  const S = (n: number) => n * e.k;
  const n = count(e, 8);
  const paid = e.r.list('col.coding').includes('paidTier') || e.r.str('cnt.subtype', '') === 'pass';
  const lanes = paid ? 2 : 1;
  const s = Math.max(tap(e), Math.min(S(64), (a.w - S(60)) / n - S(10)));
  const y0 = a.y + S(30);
  e.g.fillStyle = withAlpha(e.text, 0.15); e.g.fillRect(a.x, y0 - S(16), a.w, S(6));
  e.g.fillStyle = e.accent; e.g.fillRect(a.x, y0 - S(16), a.w * 0.38, S(6));
  for (let i = 0; i < n; i++) {
    const x = a.x + S(10) + i * (s + S(10));
    if (x + s > a.x + a.w) break;
    T(e, String(i + 1), x + s / 2 - W(e, String(i + 1), e.small) / 2, y0 - S(34), S(16), { ...e.small, color: ink ?? e.text });
    for (let l = 0; l < lanes; l++) {
      const rr = { x, y: y0 + l * (s + S(12)), w: s, h: s };
      slot(e, rr, l ? '✦' : '●', { qty: l ? '' : `×${(i + 1) * 10}`, locked: l === 1 && i >= 1, rarity: l ? 3 : undefined });
      if (i < 3) { e.g.fillStyle = withAlpha('#000', 0.3); e.g.fillRect(rr.x, rr.y, rr.w, rr.h); icon(e, '✓', rr.x + s / 2, rr.y + s / 2, s * 0.4, e.good); }
    }
  }
  if (paid) { T(e, '免费', a.x, y0 + s / 2 - S(9), S(18), { ...e.small, color: ink ?? e.text }); }
}

function pathNodes(e: ElCtx, a: Rect, tower: boolean) {
  const S = (n: number) => n * e.k;
  const n = count(e, tower ? 7 : 9);
  const node = e.r.str('cmp.node', 'circleNumber');
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push(tower ? [a.x + a.w / 2 + Math.sin(i * 1.3) * a.w * 0.1, a.y + a.h - S(30) - t * (a.h - S(60))] : [a.x + S(30) + t * (a.w - S(60)), a.y + a.h / 2 + Math.sin(i * 1.1) * a.h * 0.3]);
  }
  const states = pts.map((_, i) => progressState(e, i, 3));
  connector(e, pts, undefined, states);
  const fit = nodeFit(e, node, pts, false), sc = fit !== 1 ? { scale: fit } : {};
  pts.forEach(([x, y], i) => nodeAt(e, x, y, { kind: node, i, state: states[i], ...sc, ...nodeData(e, i, node) }));
}

/**
 * 样本进度（M12a-29）：cnt.progress 显式给了时前 N 个完成、第 N + 1 个是当前；没给时用这个画法原来的样子（def = 完成几个，current = 当前是第几个，
 * 默认紧跟在完成的后面；星图原来是前 3 完成、第 5 个当前）
 */
function progressState(e: ChoiceCtx, i: number, def: number, current = def): NodeState {
  const v = e.r.get('cnt.progress'), n = typeof v === 'number' ? v : Number(v);
  const set = v !== undefined && v !== null && v !== '' && v !== 'auto' && Number.isFinite(n);
  const done = set ? Math.max(0, Math.round(n)) : def, cur = set ? done : current;
  return i < done ? 'done' : i === cur ? 'current' : 'locked';
}

/**
 * 节点之间的连线（vis.connector，画法在 ../connectors.ts）：原来的七种逐字照旧；elbow / chevronChain / orbit / progress 与逐条的已走 / 线宽 / 正负色（M12b-24）。
 * 已走（progress）= 两端完成、或完成 → 当前；vis.connectorProgress 选了数值时按连线顺序前这么多比例算已走。线宽按值 / 正负色的样本值按两端序号取（确定的）
 */
function connector(e: ElCtx, pts: [number, number][], pairs?: [number, number][], states?: NodeState[], center?: [number, number]) {
  const kind = e.r.str('vis.connector', 'straight');
  const list = pairs ?? pts.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  const pk = chosenKey(e, 'vis.connectorProgress'), pv = pk ? e.r.num(pk, NaN) : NaN, walkN = Number.isFinite(pv) ? Math.round(Math.max(0, Math.min(1, pv)) * list.length) : -1;
  const edges: EdgeInfo[] = list.map(([i, j], n) => ({ walked: walkN >= 0 ? n < walkN : !!states && states[i] === 'done' && states[j] !== 'locked', value: ((i * 7 + j * 13) % 10) / 9, sign: (i * 5 + j * 3) % 10 < 3 ? -1 : 1 }));
  drawConnectors(e, pts, list, kind, { edges, weight: pickedStr(e, 'vis.connectorWeight', 'fixed'), tint: pickedStr(e, 'vis.connectorTint', 'fixed'), center, k: e.k });
}

/**
 * 图的方向 / 层数 / 分叉 / 强调（M12b-24）：选过才换（旧皮肤只认皮肤之后的层）；都没选时 = 原来的树（自上而下、按条目数分层、对称、不放大）
 */
function graphOpts(e: ChoiceCtx) {
  const fd = pickedStr(e, 'lay.flowDir', 'down');
  const dir: FlowDir = (FLOW_DIRS as readonly string[]).includes(fd) ? (fd as FlowDir) : 'down';
  const lk = chosenKey(e, 'lay.layers'), L0 = lk ? Math.round(e.r.num(lk, 0)) : 0, layers = Number.isFinite(L0) && L0 > 0 ? Math.min(30, L0) : 0;
  const branching = pickedStr(e, 'lay.branching', 'symmetric') === 'seeded' ? ('seeded' as const) : ('symmetric' as const);
  const emph = pickedStr(e, 'lay.rootEmphasis', 'none');
  return { dir, layers, branching, emph, custom: dir !== 'down' || layers > 0 || branching === 'seeded' || emph !== 'none' };
}
/** 种子（M12b-24 的种子分叉）：内容包 + 模板 + 子功能（同一屏每帧一样，换包换一张图） */
const graphSeedOf = (r: Theme['r'], packId: string) => seedOf(`${packId}|${r.str('uip.screen', '')}|${r.str('cnt.subtype', '')}`);

/** 一张图的生成输入（B8 审查修复 ①）：画布 network / spreadCards 与 Godot 导出的点位同一份 */
export interface GraphPlan { kind: GraphKind; n: number; seed: number; dir: FlowDir; opts: GraphOpts; emph: string; custom: boolean }
/**
 * 这种图的输入：节点数 = itemCountOr（cnt.itemCount 显式给了用它，否则默认 × 信息密度：树 12、放射树 13、星图 9）；种子 = 内容包 + 模板 + 子功能（星图 / 牌阵固定 0）；
 * 树按 graphOpts（方向 / 层数 / 分叉 / 强调）；放射树写宽高比 1 的点位（画布按内框宽高比乘 radialSquash），根放大除非 lay.rootEmphasis = none（审查修复 ④）
 */
function graphPlanFor(e: ChoiceCtx, kind: GraphKind, packId = pack().id): GraphPlan {
  if (kind === 'spread') return { kind, n: 0, seed: 0, dir: 'down', opts: { spread: pickedStr(e, 'lay.spread', 'cross') }, emph: 'none', custom: false };
  if (kind === 'constellation') return { kind, n: itemCountOr(e, 9), seed: 0, dir: 'down', opts: {}, emph: 'none', custom: false };
  if (kind === 'radialTree') return { kind, n: itemCountOr(e, 13), seed: graphSeedOf(e.r, packId), dir: 'down', opts: { aspect: 1 }, emph: pickedStr(e, 'lay.rootEmphasis', 'root') === 'none' ? 'none' : 'root', custom: true };
  const go = graphOpts(e);
  return { kind, n: itemCountOr(e, 12), seed: graphSeedOf(e.r, packId), dir: go.dir, opts: { layers: go.layers, branching: go.branching, endOne: go.emph === 'end' }, emph: go.emph, custom: go.custom };
}
/**
 * 这一屏画的图（B8 审查修复 ①：Godot 导出只在真的画图的屏写点位）：与 drawData 同一个分派——数据形状 network / hierarchy 的 tree / constellation / radialTree
 * （推理板 scatter 是固定位置的线索卡，不是生成的图）、集合的 spread 牌阵（分段 / 双网格 / 列表类子功能先接走的不算）；其余 null。e = 屏幕上下文（{ r, th, scope: ['el.screen'] } 也行）
 */
export function graphPlanOf(e: ChoiceCtx, packId = pack().id): GraphPlan | null {
  const r = e.r, shape = dataShapeOf(r), arr = r.str('lay.arrangement', ''), sub = r.str('cnt.subtype', '');
  if (shape === 'network' || shape === 'hierarchy') return arr === 'scatter' ? null : graphPlanFor(e, arr === 'constellation' || arr === 'radialTree' ? arr : 'tree', packId);
  if (shape !== 'collection' || arr !== 'spread' || sectionsOf(e) || (r.str('lay.composition', '') === 'dualGrid' && chosen(e, 'lay.composition')) || ['server', 'mail', 'saveSlot', 'leaderboard'].includes(sub)) return null;
  return graphPlanFor(e, 'spread', packId);
}
/** 按输入生成图（相对坐标；放射树是宽高比 1 的点位） */
export const graphOf = (P: GraphPlan): Graph => layoutGraph(P.kind, P.n, P.seed, P.dir, P.opts);

/** 罗马数字（层的列头 / 行头没有内容包的 tiers 时用；只用 ASCII，不加字） */
const roman = (n0: number) => { let n = n0, s = ''; for (const [v, c] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as [number, string][]) while (n >= v) { s += c; n -= v; } return s; };
/** 第 i 层的列头（lay.grouping = header）：内容包的 screens.tiers（Civ6 的时代），没写时罗马数字 */
const tierLabel = (i: number) => pack().screens.tiers?.[i] ?? roman(i + 1);
/** 分组标题（lay.grouping = header，M12b-24 的层列头与 M12b-13 的列表分组行共用）：cmp.plate@groupHeader 选过时画成那种标牌，否则小号粗体字 + 一道分隔线 */
function groupHeader(e0: ElCtx, r: Rect, label: string, center = false, ink?: string) {
  const e = e0.part('groupHeader'), S = (n: number) => n * e.k;
  const kind = platePick(e, 'groupHeader', '');
  if (kind) { const w = Math.min(r.w, plateWidthOf(kind, W(e, label, e.small), r.h)); plate(e, { x: center ? r.x + (r.w - w) / 2 : r.x, y: r.y, w, h: r.h }, label, kind, { ...e.small, weight: 700 }, 'groupHeader'); return; }
  const o = { ...e.small, weight: 700, color: ink ?? e.muted }, w = W(e, label, o);
  const x = center ? r.x + (r.w - w) / 2 : r.x;
  T(e, label, x, r.y + (r.h - LH(e, o)) / 2, LH(e, o), o);
  if (center) ruleLine(e, r.x + r.w * 0.15, r.x + r.w * 0.85, Math.round(r.y + r.h - S(1)));
  else if (x + w + S(8) < r.x + r.w) ruleLine(e, x + w + S(8), r.x + r.w, Math.round(r.y + r.h / 2));
}

/**
 * 节点状态（M12a-29 的样本进度）。按序号（progressState：前 N 个完成、下一个当前）是原来的规则；B8 审查修复 ⑰：路线图（cnt.subtype = routeMap）改了版式、
 * 或连线画成已走 / 未走（vis.connector = progress）时按图走一条路——从根（没有根时第一层里按种子挑一个）出发，每一步按种子挑一个下家，前 N 步完成、
 * 下一步当前，其余锁定；已走的线只有这条路上的（原来按序号，分叉的树里「走过的」是兄弟节点：两条岔路都实线、当前站在没走的那条上）
 */
export function graphStates(e: ChoiceCtx, G: Graph, def: number, cur0: number, path: boolean): NodeState[] {
  if (!path || !G.pairs.length) return G.pts.map((_, i) => progressState(e, i, def, cur0));
  const v = e.r.get('cnt.progress'), n0 = typeof v === 'number' ? v : Number(v);
  const set = v !== undefined && v !== null && v !== '' && v !== 'auto' && Number.isFinite(n0), done = set ? Math.max(0, Math.round(n0)) : def;
  const rnd = graphRng(G.pts.length * 131 + G.pairs.length);
  const pick = <T,>(xs: T[]): T | undefined => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))] : undefined);
  const hasIn = new Set(G.pairs.map(([, b]) => b));
  const starts = G.root >= 0 ? [G.root] : G.pts.map((_, i) => i).filter((i) => !hasIn.has(i));
  const chain: number[] = [];
  let at = pick(starts.length ? starts : [0]);
  while (at !== undefined && chain.length <= done && !chain.includes(at)) { chain.push(at); const here: number = at; at = pick(G.pairs.filter(([a, b]) => a === here && !chain.includes(b)).map(([, b]) => b)); }
  const out: NodeState[] = G.pts.map(() => 'locked');
  chain.forEach((i, k) => { out[i] = k < done ? 'done' : 'current'; });
  return out;
}

/**
 * 路线图节点的类型图标（B8 审查修复 ⑱，slay-the-spire#17 / cult-of-the-lamb#38）：版式节点（墨色剪影、类型圆章……）画包里的路线单字时换成按含义的矢量符号——
 * 战斗 ⚔、精英 ⛨、事件 ?、商店 ◈、休息 ♨、宝箱 ▣、终点 / Boss ★……（都是内容包里已有的符号，不加字）；表里没有的字照旧写字。原来的画法（编号圆 / 图标格）不受影响
 */
const ROUTE_ICON: Record<string, string> = {
  战: '⚔', 狼: '⚔', 敌: '⚔', 虫: '⚔', 精: '⛨', 塔: '⛨', 漂: '⚡', 赛: '⚑', 关: '⚑', 演: '♪', 录: '♪',
  '?': '?', 问: '?', 查: '?', 寻: '⌖', 选: '?', 证: '✉', 对: '✉', 会: '☺', 想: '☁',
  店: '◈', 商: '◈', 市: '◈', 宝: '▣',
  火: '♨', 营: '♨', 烬: '♨', 安: '♨', 修: '⚒', 药: '♥', 补: '♥', 回: '♥', 祝: '✦', 炉: '♨', 灯: '☀', 家: '⌂', 住: '⌂', 房: '⌂',
  王: '★', 熊: '★', 船: '★', 都: '★', 节: '★', 院: '★', 案: '★', 终: '★',
  矿: '⛏', 林: '✿', 农: '✿', 水: '❄', 河: '❄', 电: '⚡', 工: '⚙', 铁: '⚒', 计: '⏱', 日: '☀',
};
const routeIcon = (label: string) => ROUTE_ICON[label] ?? label;

/** 放射树 / 树的节点外接尺寸（scale = 1）：版式节点按 nodeFootprint，原来的画法按 graphFit 的直径（S(40) 与触控下限取大） */
const footOf = (e: ElCtx, node: string) => (LAYOUT_NODES.has(node) ? nodeFootprint(e, node) : { w: Math.max(e.k * 40, tap(e)), h: Math.max(e.k * 40, tap(e)) });

function network(e: ElCtx, a: Rect, mode: string) {
  const S = (n: number) => n * e.k;
  const node = e.r.str('cmp.node', 'circleNumber');
  if (mode === 'scatter') {
    // 推理板：散落的线索卡 + 红绳（卡上的字是当前包的 6 条线索，位置留在这里）
    const clues = pack().screens.clues;
    const cards = ([[0.1, 0.15], [0.45, 0.1], [0.75, 0.3], [0.2, 0.6], [0.55, 0.62], [0.8, 0.7]] as [number, number][]).map(([fx, fy], i): [number, number, string] => [fx, fy, clues[i % clues.length]]);
    const pts = cards.map(([fx, fy]) => [a.x + a.w * fx + S(50), a.y + a.h * fy + S(30)] as [number, number]);
    connector(e, pts, [[0, 1], [1, 2], [0, 3], [3, 4], [4, 1], [4, 5]]);
    cards.forEach(([fx, fy, l], i) => {
      const rr = { x: a.x + a.w * fx, y: a.y + a.h * fy, w: Math.max(S(100), W(e, l, e.base) + S(20)), h: Math.max(S(60), tap(e)) };
      panel(e, rr, true, { rotate: (i % 3 - 1) * 3, bg: { solid: '#f6efd8' }, border: { width: 0, color: '#000' } });
      T(e, l, rr.x + S(10), rr.y + S(8), LH(e, e.base), { ...e.base, color: '#3a2e12' });
      e.g.fillStyle = '#c0392b'; e.g.beginPath(); e.g.arc(rr.x + rr.w / 2, rr.y + S(4), S(5), 0, Math.PI * 2); e.g.fill();
      logTarget(e.g, rr, l);
    });
    return;
  }
  // 已走 / 未走的连线（vis.connector = progress）按图上的一条路算状态（审查修复 ⑰）
  const walkPath = e.r.str('vis.connector', '') === 'progress';
  if (mode === 'constellation') {
    // 星图：9 个点是原来的固定位置；条目数（cnt.itemCount / 信息密度，M12a-29）不是 9 时按向日葵式螺旋撒点，每个点连向离它最近的前一个点
    const G = graphOf(graphPlanFor(e, 'constellation'));
    const kind0 = node === 'circleNumber' ? 'glowDot' : node, [mx, my] = LAYOUT_NODES.has(kind0) ? nodeMargin(e, kind0) : [0, 0];
    const pts = G.pts.map(([fx, fy]) => (mx ? [a.x + mx + (a.w - mx * 2) * fx, a.y + my + (a.h - my * 2) * fy] : [a.x + a.w * fx, a.y + a.h * fy]) as [number, number]);
    const states = graphStates(e, G, 3, 4, walkPath);
    connector(e, pts, G.pairs, states, [a.x + a.w / 2, a.y + a.h / 2]);
    const kind = node === 'circleNumber' ? 'glowDot' : node, fit = nodeFit(e, kind, pts, false), sc = fit !== 1 ? { scale: fit } : {};
    pts.forEach(([x, y], i) => nodeAt(e, x, y, { kind, i, state: states[i], ...sc, ...nodeData(e, i, kind) }));
    return;
  }
  if (mode === 'radialTree') {
    // 放射树（M12b-24，frostpunk#31）：中心一个根（放大 1.5 倍，Frostpunk 法典的盾徽）+ 3–8 根轮辐，节点数 = cnt.itemCount / 信息密度（默认 13）。
    // B8 审查修复 ⑭：宽数据区拉成椭圆（radialSquash）；版式节点先按满尺寸留边量一遍缩放，再按缩过的尺寸留边重排（原来按满尺寸留边、又缩到 0.4，留的边白占）；
    // 根 = 1.5 × 环上节点的缩放、且不压到第一圈（原来至少 1.2，环上节点缩到 0.4 时根是它们的 3 倍、盖住第一圈）
    const P = graphPlanFor(e, 'radialTree'), G = graphOf(P), f = footOf(e, node);
    const place = (mx: number, my: number) => {
      const g0 = { x: a.x + mx, y: a.y + my, w: Math.max(1, a.w - mx * 2), h: Math.max(1, a.h - my * 2) }, [sx, sy] = radialSquash(g0.w / g0.h);
      return { g0, pts: G.pts.map(([u, v]) => [g0.x + g0.w * (0.5 + (u - 0.5) * sx), g0.y + g0.h * (0.5 + (v - 0.5) * sy)] as [number, number]) };
    };
    let L = place(...nodeMargin(e, node)), fit = nodeFit(e, node, L.pts.slice(1), true);
    if (LAYOUT_NODES.has(node) && fit < 1) { L = place(...nodeMargin(e, node, fit)); fit = nodeFit(e, node, L.pts.slice(1), true); }
    const { g0, pts } = L, [cx, cy] = pts[G.root] ?? [g0.x + g0.w / 2, g0.y + g0.h / 2];
    const rootCap = Math.min(...pts.map(([x, y], i) => (i === G.root ? Infinity : 2 * 0.92 * Math.max(Math.abs(x - cx) / f.w, Math.abs(y - cy) / f.h) - fit)));
    const rootK = P.emph === 'none' ? fit : Math.max(fit, Math.min(1.5 * fit, rootCap));
    const states = graphStates(e, G, 4, 4, walkPath);
    connector(e, pts, G.pairs, states, [g0.x + g0.w / 2, g0.y + g0.h / 2]);
    pts.forEach(([x, y], i) => nodeAt(e, x, y, { kind: node, i, state: states[i], scale: i === G.root ? rootK : fit, ...nodeData(e, i, node) }));
    return;
  }
  // 树：一层一层往下（路线图 / 技能树 / 层级），按条目数分层生成（M12a-10：原来固定 6 层 12 个，cnt.itemCount / 信息密度不起作用）。
  // M12b-24：lay.flowDir（往上长 / 按层分列）、lay.layers（层数）、lay.branching = seeded（每层 2–6 个交错分叉合流）、lay.rootEmphasis（根 / 终点放大）——都没选时与原来逐字一样
  const sub = e.r.str('cnt.subtype', '');
  const P = graphPlanFor(e, 'tree'), G = graphOf(P), go = { dir: P.dir, emph: P.emph, custom: P.custom };
  // 层的列头 / 行头（lay.grouping = header 选过，civ6#43 的时代列）：按层分列时在上面让一条，自上 / 下而上时在左边让一列
  const cols = go.dir === 'right' || go.dir === 'left', hdr = pickedStr(e, 'lay.grouping', '') === 'header';
  const labels = hdr ? Array.from({ length: G.nLayers }, (_, i) => tierLabel(i)) : [];
  const hb = hdr && cols ? LH(e, e.small) + S(10) : 0, lw = hdr && !cols ? Math.max(...labels.map((t) => W(e, t, { ...e.small, weight: 700 }))) + S(14) : 0;
  const g0 = hdr ? { x: a.x + lw, y: a.y + hb, w: a.w - lw, h: a.h - hb } : a;
  // 版式节点（卡片 / 花托）四边留出半个节点（M12b-23：横长卡原来伸出数据区）；原来的画法照旧留 26
  const [mx, my] = nodeMargin(e, node);
  let pts = G.pts.map(([u, v]) => [g0.x + mx + (g0.w - (mx === S(26) ? S(52) : mx * 2)) * u, g0.y + my + v * (g0.h - (my === S(26) ? S(52) : my * 2))] as [number, number]);
  const route = pack().screens.route;
  // 路线图也走 drawNode（M12a-29：原来自画「圆 + 包里单字」、不读 cmp.node，已走 / 当前写死在前三个）：包里的单字作编号圆的字，
  // 进度 = cnt.progress，没给时包的 screens.routeProgress，默认前 2 个完成、第 3 个当前；改了版式的路线图 / 已走连线按图上的一条路（审查修复 ⑰）
  const routeDone = pack().screens.routeProgress ?? 2;
  const def = sub === 'routeMap' ? routeDone : 3;
  const states = graphStates(e, G, def, def, walkPath || (sub === 'routeMap' && go.custom));
  // 节点：改了版式（层数 / 分叉 / 方向 / 强调）时按最挤的间距缩小，根 / 终点放大（lay.rootEmphasis；路线图的终点写包里的「王」）
  let fit = nodeFit(e, node, pts, go.custom);
  // 长图（B8 审查修复 ⑯，slay-the-spire#19 的 15 层、factorio#36 的 40 张卡）：lay.overflow = longScroll / pan、并且节点要缩到 0.75 以下或（改了版式时）层与层之间空不到 16 时，
  // 层距按节点外接尺寸的 2.2 倍排、图顺着生长方向伸出数据区（裁在数据区里、滚到当前节点看得见的位置，看不见的那一侧画渐隐），节点不再挤到 0.4。
  // 默认的路线图 / 技能树（没改版式、节点不缩）照旧排满数据区
  const ov = e.r.str('lay.overflow', 'single'), f = footOf(e, node), flowLen = cols ? g0.w - mx * 2 : g0.h - my * 2;
  const pitch = 2.2 * (cols ? f.w : f.h), need = pitch * (G.nLayers - 1);
  let view: { clip: Rect; before: boolean; after: boolean } | null = null;
  const dense = go.custom && G.nLayers > 1 && flowLen / (G.nLayers - 1) - (cols ? f.w : f.h) < S(16);
  if ((ov === 'longScroll' || ov === 'pan') && G.nLayers > 1 && (fit < 0.75 || dense) && need > flowLen + 0.5) {
    const tOf = (i: number) => (G.layer[i] / (G.nLayers - 1)) * need, ci = states.indexOf('current'), tc = ci >= 0 ? tOf(ci) : 0;
    // 从起点那头开始看，当前节点走过视窗的六成才往前滚
    const w0 = Math.max(0, Math.min(need - flowLen, tc - flowLen * 0.6));
    pts = pts.map(([x, y], i) => {
      const t = tOf(i) - w0;
      return cols ? [go.dir === 'left' ? g0.x + g0.w - mx - t : g0.x + mx + t, y] : [x, go.dir === 'up' ? g0.y + g0.h - my - t : g0.y + my + t];
    });
    fit = nodeFit(e, node, pts, go.custom);
    view = { clip: g0, before: w0 > 0.5, after: w0 + flowLen < need - 0.5 };
  }
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  if (view) for (const c of ctxs) { c.save(); c.beginPath(); c.rect(a.x, a.y, a.w, a.h); c.clip(); }
  connector(e, pts, G.pairs, states);
  // 层头（画完节点后进条目表：浮动详情不压列头）
  const hdrRects: Rect[] = [];
  if (hdr) labels.forEach((t, li) => {
    const xs = pts.filter((_, i) => G.layer[i] === li);
    if (!xs.length) return;
    const mx = xs.reduce((s, p) => s + p[0], 0) / xs.length, my = xs.reduce((s, p) => s + p[1], 0) / xs.length;
    const span = cols ? (view ? pitch : (g0.w - S(52)) / Math.max(1, G.nLayers - 1)) : 0;
    const hr = cols ? { x: mx - Math.max(S(40), span * 0.45), y: a.y + S(2), w: Math.max(S(80), span * 0.9), h: hb - S(4) } : { x: a.x + S(4), y: my - LH(e, e.small) / 2, w: lw - S(8), h: LH(e, e.small) };
    // 长图：只写整块在数据区里的列头（伸出数据区的那几层不写，节点也不画）
    if (view && !(hr.x >= a.x - 0.5 && hr.x + hr.w <= a.x + a.w + 0.5 && hr.y >= a.y - 0.5 && hr.y + hr.h <= a.y + a.h + 0.5)) return;
    if (cols) groupHeader(e, hr, t, true);
    else T(e, t, hr.x, hr.y, hr.h, { ...e.small, weight: 700, color: e.muted });
    hdrRects.push(hr);
  });
  const big = go.emph === 'end' ? G.end : go.emph === 'root' ? G.root : -1;
  const boss = route.find((c) => c === '王') ?? route[route.length - 1];
  // 终点放大时其余节点只轮流取非终点的字（审查修复 ⑱：原来按序号循环 9 个字，15 层的图中间也冒出「王」）
  const plain = go.emph === 'end' ? route.filter((c) => c !== boss) : route, rl = plain.length ? plain : route;
  // 长图：中心在数据区外的节点不画、不登记（连线照画，裁在数据区里）。R4 C2 ⑫（factorio#39：滚到当前节点时最上面那层科技卡被视窗上沿裁掉一半）：
  // 顺着生长方向只露出一截的节点（外接尺寸 × 缩放伸出数据区）也整个不画，那一侧照旧画渐隐
  // 半尺寸：版式节点按外接尺寸（nodeFootprint），原来的画法按画出来的半径（drawNode：当前 20、其余 16，触控下限的一半取大）
  const inView = (x: number, y: number, sc: number, st: NodeState) => {
    if (!view) return true;
    if (!(x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h)) return false;
    const r0 = Math.max(S(st === 'current' ? 20 : 16), tap(e) / 2), hw = LAYOUT_NODES.has(node) ? (f.w * sc) / 2 : r0 * sc, hh = LAYOUT_NODES.has(node) ? (f.h * sc) / 2 : r0 * sc;
    return cols ? x - hw >= a.x - 0.5 && x + hw <= a.x + a.w + 0.5 : y - hh >= a.y - 0.5 && y + hh <= a.y + a.h + 0.5;
  };
  pts.forEach(([x, y], i) => {
    const sc = i === big ? Math.max(1.7 * fit, 1.2) : fit;
    if (!inView(x, y, sc, states[i])) return;
    const extra = sc !== 1 ? { scale: sc } : {};
    if (sub === 'routeMap') { const label = i === big && go.emph === 'end' ? boss : rl[i % rl.length]; nodeAt(e, x, y, { kind: node, i, state: states[i], label, ...extra, ...nodeData(e, i, node, 'route', label) }); }
    else nodeAt(e, x, y, { kind: node, i, state: states[i], ...extra, ...nodeData(e, i, node) });
  });
  if (view) {
    for (const c of ctxs) c.restore();
    // 看不见的那一侧（生长方向的前方 / 后方）画渐隐：数据区的底边已由 drawOverflow 的 longScroll 画过
    const sideOf = (startSide: boolean): 'top' | 'bottom' | 'left' | 'right' => (cols ? ((go.dir === 'left') === startSide ? 'right' : 'left') : (go.dir === 'up') === startSide ? 'bottom' : 'top');
    for (const [on, s] of [[view.before, sideOf(true)], [view.after, sideOf(false)]] as [boolean, 'top' | 'bottom' | 'left' | 'right'][]) if (on && !(s === 'bottom' && ov === 'longScroll')) edgeFade(e, a, s);
  }
  ITEMS.push(...hdrRects);
}

/** 节点按最挤的两点间距缩小（M12b-24：种子分叉 / 层数多时节点不叠在一起）：最近两点距离 × 0.85 ÷ 节点直径（S(40) 与触控下限取大），夹在 0.45–1 */
function graphFit(e: ElCtx, pts: [number, number][]): number {
  let md = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) md = Math.min(md, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  if (!Number.isFinite(md)) return 1;
  return Math.max(0.45, Math.min(1, (md * 0.85) / Math.max(1, e.k * 40, tap(e))));
}

/**
 * 节点的样本数据（M12b-23）：版式节点（LAYOUT_NODES：iconRing / rowCard / techCard / rosette / iconBadge……）取内容包的天赋样本（talents：符号、名字、当前级 / 上限、花费，
 * 后两条的符号当解锁图标，进度按序号演示），col.coding 含 lineId 时按序号取类别色；路线图（route）不写名字、符号 = 路线单字按含义换的矢量符号（审查修复 ⑱，routeIcon）；
 * 地图（map）的符号 = 地图筛选的类别图标。原来的画法返回空对象（drawNode 的调用逐字不变）
 */
function nodeData(e: ElCtx, i: number, kind: string, where: 'tree' | 'route' | 'map' = 'tree', label?: string): Partial<NodeSpec> {
  if (!LAYOUT_NODES.has(kind)) return {};
  const t = samplesFor('talents'), row = t[i % t.length], lc = where === 'map' ? null : lineColor(e, i);
  const base: Partial<NodeSpec> = { name: plainText(row[1]), lv: row[4], max: row[5], cost: row[6], unlocks: [t[(i + 1) % t.length][0], t[(i + 2) % t.length][0]], progress: ((i * 3) % 5) / 5, ...(lc ? { color: lc } : {}) };
  // 类型序号（R4 C2 ⑥，cult-of-the-lamb#43）：路线图 = 这个单字的符号在包里路线符号表（去重）里的位置——同一类节点同一个类别色（原来按节点序号轮流着色，
  // 两个战斗节点不同色）；地图 = 筛选类别。类型圆章的图标按它取色
  if (where === 'route') {
    const rt = [...new Set(pack().screens.route.map(routeIcon))], ti = label ? Math.max(0, rt.indexOf(routeIcon(label))) : i, tl = lineColor(e, ti);
    const { color: _c, ...b0 } = base;
    return { ...b0, ...(tl ? { color: tl } : {}), ti, name: undefined, ...(label ? { type: routeIcon(label) } : {}) };
  }
  if (where === 'map') { const mf = samplesFor('mapFilters'); return { ...base, name: undefined, type: mf[i % mf.length][0], ti: i % mf.length }; }
  return { ...base, type: row[0] };
}
/** 版式节点按外接尺寸收缩到互不相压（M12b-23）：两两之间 max(|dx| ÷ 宽, |dy| ÷ 高) 的最小值 × 0.92，夹在 0.4–1 */
function boxFit(pts: [number, number][], f: { w: number; h: number }): number {
  let k = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) k = Math.min(k, Math.max(Math.abs(pts[i][0] - pts[j][0]) / f.w, Math.abs(pts[i][1] - pts[j][1]) / f.h));
  return Number.isFinite(k) ? Math.max(0.4, Math.min(1, k * 0.92)) : 1;
}
/** 图在数据区里四边留的边（M12b-23）：版式节点 = 半个外接尺寸（按缩放 k，审查修复 ⑭）+ 4（至少 26），原来的画法 26 */
function nodeMargin(e: ElCtx, kind: string, k = 1): [number, number] {
  const S = (n: number) => n * e.k;
  if (!LAYOUT_NODES.has(kind)) return [S(26), S(26)];
  const f = nodeFootprint(e, kind);
  return [Math.max(S(26), (f.w * k) / 2 + S(4)), Math.max(S(26), (f.h * k) / 2 + S(4))];
}
/** 节点的缩放：版式节点按外接尺寸收缩（boxFit），原来的画法在改了版式时按最挤间距缩（graphFit），否则 1 */
const nodeFit = (e: ElCtx, node: string, pts: [number, number][], custom: boolean) => (LAYOUT_NODES.has(node) ? boxFit(pts, nodeFootprint(e, node)) : custom ? graphFit(e, pts) : 1);
setCurrentLabel(() => samplesFor('characters')[0]?.[0] ?? '我');

function table(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k;
  const viz = e.r.str('st.statViz', 'table');
  // 数据图（M12b-27，elements/charts.ts）：键值行 / 墨团数字 / 折线 / 迷你走势 / 堆叠面积 / 网络气泡，数据取统计屏的样本
  if (CHART_KINDS.has(viz)) { statViz(e, viz, a, chartData(), ink); return; }
  const stats = pack().screens.stats, head = stats.head;
  // 第四列：默认是满值 30,000 的数量（伤害、产量……），包写了 unit: 'pct' 时是百分比（完成度、命中率……）
  const col4 = (v: number) => (stats.unit === 'pct' ? `${Math.round(v * 100)}%` : `${Math.round(v * 30000).toLocaleString('en')}`);
  const nameW = Math.max(...stats.rows.map(([n]) => W(e, n, e.base))) + S(48);
  // 按类别分行 + 评级字母（cmp.listRow 含 grade，M12b-13，hi-fi-rush#25）：不画头像，最右一栏评级字母，表下一个大字总评。
  // 评级栏单独占一栏（B8 审查修复 ㉖：原来字母压在第 4 栏的数字上）；字母按这一行在表里的名次分档（S / A / B / C……，样本值都高时原来全是 S）
  const lk = chosenKey(e, 'cmp.listRow'), grade = !!lk && e.r.list(lk).includes('grade');
  const colW = (a.w - nameW) / (head.length + (viz === 'inlineBar' ? 1 : 0) + (grade ? 1 : 0));
  const rh = Math.max(S(36), LH(e, e.base, 1.8));
  const hO = { ...e.small, weight: 700, color: withAlpha(ink ?? e.text, 0.7) };
  head.forEach((h, i) => T(e, h, a.x + nameW + i * colW, a.y, rh, hO));
  const teams = e.r.list('col.coding').includes('team');
  const rankOf = (i: number) => stats.rows.filter((x, j) => x[4] > stats.rows[i][4] || (x[4] === stats.rows[i][4] && j < i)).length;
  const GRADES = ['S', 'A', 'B', 'C', 'D'], rowGrade = (i: number) => GRADES[Math.min(GRADES.length - 1, rankOf(i))];
  stats.rows.forEach(([n, k, dth, as, dmg], i) => {
    const y = a.y + rh * (i + 1);
    if (y + rh > a.y + a.h + 0.5) return;
    e.g.fillStyle = teams ? withAlpha(i < 2 ? '#3b82f6' : '#f97316', 0.14) : withAlpha(ink ?? e.text, i % 2 ? 0.04 : 0.08); e.g.fillRect(a.x, y, a.w, rh - S(2));
    // 评级字母在评级栏里，第 4 栏的数字伸进来时挪到数字后面（数字字形量宽），最右不过表的右缘
    if (grade) { const gr = rowGrade(i), o = { ...e.title, size: Math.min(rh * 0.75, e.title.size * 1.3, colW * 0.9), weight: 900, italic: true, color: gradeColor(e, gr) }, gw = W(e, gr, o); const after = a.x + nameW + 3 * colW + numberWidth(e, col4(dmg), { ...e.base }) + S(6); T(e, gr, Math.min(a.x + a.w - gw - S(2), Math.max(a.x + a.w - gw - S(8), after)), y, rh, o); }
    else avatar(e, a.x + S(18), y + rh / 2, Math.min(S(13), rh * 0.36), n);
    T(e, n, a.x + S(38), y, rh, { ...e.base, color: ink ?? e.text });
    // 表里的数字走数字字形（M12b-07 的 drawNumber，B7 换：没给 typ.numerals.* 时与 T 一样）
    [k, dth, as].forEach((v, j) => drawNumber(e, String(v), a.x + nameW + j * colW, y, rh, { ...e.base, weight: 700, color: ink ?? e.text }));
    const x3 = a.x + nameW + 3 * colW;
    if (viz === 'inlineBar' || viz === 'versusBar') gauge(e, { x: x3, y: y + rh / 2 - S(5), w: colW * (viz === 'inlineBar' ? 1.8 : 0.9), h: S(10) }, dmg, 'bar', teams && i >= 2 ? '#f97316' : e.accent);
    else if (viz === 'bigNumber') drawNumber(e, col4(dmg), x3, y, rh, { ...e.title, color: ink ?? e.title.color });
    else drawNumber(e, col4(dmg), x3, y, rh, { ...e.base, color: ink ?? e.text });
  });
  // 总评（评级行时）：表下右侧一个大字，按各行的平均
  if (grade) {
    // 总评 = 各行档位的平均（四舍五入到最近的一档）
    const y = a.y + rh * (stats.rows.length + 1) + S(8), avg = stats.rows.reduce((s, _x, i) => s + GRADES.indexOf(rowGrade(i)), 0) / Math.max(1, stats.rows.length), gr = GRADES[Math.round(avg)] ?? 'B';
    // 字号按表下剩下的高放大（R4 C2 ⑪，hi-fi-rush 结算：原来固定标题 × 2.6，约 34，比行里的字母大不了多少，看不出是收尾的大字总评）：
    // 剩下的高（行高 1.1）能放多大放多大，夹在标题的 2.6–6 倍、字宽不过表宽的 35%（评级行只在 cmp.listRow 显式选了 grade 时才有，默认画面不变）
    const room = a.y + a.h - y, kFit = room / (1.1 * (TEXT_K.k || 1) * Math.max(1, e.title.size)), o0 = { ...e.title, weight: 900, italic: true };
    const kW = (a.w * 0.35) / Math.max(1, W(e, gr, { ...o0, size: e.title.size }));
    const o = { ...o0, size: e.title.size * Math.max(2.6, Math.min(6, kFit, kW)), color: gradeColor(e, gr) }, lh = LH(e, o, 1.1);
    if (y + lh <= a.y + a.h + 0.5) { const lab = '总评', lo = { ...e.small, weight: 700, color: mutedOf(e, 0.7) }, gw = W(e, gr, o); T(e, gr, a.x + a.w - gw - S(8), y, lh, o); T(e, lab, a.x + a.w - gw - S(16) - W(e, lab, lo), y + lh - LH(e, lo) - S(6), LH(e, lo), lo); }
  }
}

function form(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k, r = e.r;
  const sub = r.str('cnt.subtype', '');
  const labelO = { ...e.base, color: ink ?? e.text };
  if (sub === 'naming' || r.str('ix.mode', '') === 'textInput') {
    const kind = r.str('cmp.input', 'boxed');
    const ir = { x: a.x + a.w * 0.1, y: a.y + a.h * 0.35, w: a.w * 0.8, h: Math.max(S(44), tap(e)) };
    if (kind === 'underline') { e.g.fillStyle = ink ?? e.text; e.g.fillRect(ir.x, ir.y + ir.h - 2, ir.w, 2); }
    else drawBox(e.g, ir, { bg: { solid: kind === 'darkInset' ? 'rgba(0,0,0,0.45)' : '#fff' }, radius: kind === 'roundWhite' ? ir.h / 2 : 6, border: kind === 'boxed' ? { width: 2, color: withAlpha(e.text, 0.5) } : undefined }, e.pal);
    // 起名框的默认值是当前包的玩家名（不是游戏名；雪线旅人的玩家名恰好也是"雪线旅人"）
    const nm = pack().hud.profile.name;
    T(e, nm, ir.x + S(16), ir.y, ir.h, { ...e.base, size: e.base.size * 1.2, color: kind === 'darkInset' ? '#fff' : '#222' });
    e.g.fillStyle = e.accent; e.g.fillRect(ir.x + S(16) + W(e, nm, { ...e.base, size: e.base.size * 1.2 }) + 3, ir.y + ir.h * 0.25, 2, ir.h * 0.5);
    const dice = Math.max(S(36), tap(e)); button(e, { x: ir.x + ir.w + S(8), y: ir.y + (ir.h - dice) / 2, w: dice, h: dice }, '⚄', false);
    logTarget(e.g, ir, '输入框');
    return;
  }
  if (sub === 'rebind') return rebind(e, a, ink);
  // 句内多空位填空（cmp.formKind = inlineBlanks，M12b-31，obra-dinn#28 / #30）
  if (pickedStr(e, 'cmp.formKind', 'rows') === 'inlineBlanks') return inlineBlanks(e, a, ink);
  // 创建角色 / 捏人（M12b-62，cyberpunk-2077#20、stardew#23：原来是设置页的音量 / 字幕行）、经营（cnt.screen = screen.manage，cities-skylines#17）
  if (sub === 'create') return createForm(e, a, ink);
  if (r.str('cnt.screen', '') === 'screen.manage') return economyForm(e, a, ink);
  // 两层排法（cmp.optionLayout = stacked）或逐行控件（cmp.optionRows）选过时走 formRows（M12b-31）
  if (optionLayoutOf(e) === 'stacked' || optionRowsOf(e).length) return formRows(e, a, settingsOf().rows.map(([l, kind, v], i): FormRow => ({ label: l, kind: kind === 'bool' ? 'switch' : kind === 'enum' ? 'arrows' : 'slider', v, ...(kind === 'enum' ? { vals: settingsOf().enums[i === 4 ? 0 : 1] } : {}) })), ink);
  // 设置页：包自己的或 GENERIC 的；第 5 行的枚举用取值表 0，其余枚举行用取值表 1
  const st = settingsOf(), rows = st.rows;
  const rh = Math.max(S(40), tap(e), LH(e, labelO, 1.8));
  const lw = Math.max(...rows.map(([l]) => W(e, l, labelO))) + S(24);
  const cx = a.x + lw, cw = Math.min(a.w - lw, S(300));
  rows.forEach(([l, kind, v], i) => {
    const y = a.y + i * rh;
    if (y + rh > a.y + a.h + 0.5) return;
    if (i === 0) { e.g.fillStyle = withAlpha(e.accent, 0.12); e.g.fillRect(a.x - S(6), y, a.w + S(12), rh); }
    markItem(e, { x: a.x - S(6), y, w: Math.min(a.w + S(12), lw + cw + S(18)), h: rh }, i);
    T(e, l, a.x, y, rh, labelO);
    const cr = { x: cx, y: y + rh * 0.18, w: cw, h: rh * 0.64 };
    if (kind === 'bool') boolCtl(e, cr, v > 0, r.str('cmp.optionBool', 'switch'));
    else if (kind === 'enum') enumCtl(e, cr, st.enums[i === 4 ? 0 : 1], v, r.str('cmp.optionEnum', 'arrows'), ink);
    else rangeCtl(e, cr, v, r.str('cmp.optionRange', 'slider'), ink);
    logTarget(e.g, { x: cx, y, w: cw, h: rh }, l, 'listRow');
  });
}

/**
 * 创建角色 / 捏人的表单（M12b-62，内容包 screens.createRows）：与设置页同一套行几何（标签列按最宽的标签、控件列至多 300、首行垫强调色淡底），
 * 每行按 CreateRow 的种类画控件——text 输入框（值写在框里）、arrows 左右切换（cmp.optionEnum）、color 一排色块（选中的描强调色框）、toggle 开关（cmp.optionBool）、slider 滑条（cmp.optionRange）。
 * Godot：VBox 里每行一个 HBox（Label + LineEdit / OptionButton / ColorPickerButton 一排 / CheckButton / HSlider）
 */
function createForm(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k, r = e.r, rows = samplesFor('createRows');
  // 两层排法 / 逐行控件（M12b-31）选过时走 formRows：捏人页的行按种类换成控件（文字 = 输入框、左右 = 箭头、颜色 = 色块、开关、滑条）
  if (optionLayoutOf(e) === 'stacked' || optionRowsOf(e).length) return formRows(e, a, rows.map((row): FormRow => row[0] === 'text' ? { label: row[1], kind: 'text', v: 0, text: row[2] } : row[0] === 'arrows' ? { label: row[1], kind: 'arrows', v: row[3], vals: row[2] } : row[0] === 'color' ? { label: row[1], kind: 'colors', v: row[3], vals: row[2] } : row[0] === 'toggle' ? { label: row[1], kind: 'switch', v: row[2] ? 1 : 0 } : { label: row[1], kind: 'slider', v: row[2] }), ink);
  const labelO = { ...e.base, color: ink ?? e.text };
  const rh = Math.max(S(40), tap(e), LH(e, labelO, 1.8));
  const lw = Math.max(...rows.map((x) => W(e, x[1], labelO))) + S(24);
  const cx = a.x + lw, cw = Math.min(a.w - lw, S(300));
  rows.forEach((row, i) => {
    const y = a.y + i * rh;
    if (y + rh > a.y + a.h + 0.5) return;
    if (i === 0) { e.g.fillStyle = withAlpha(e.accent, 0.12); e.g.fillRect(a.x - S(6), y, a.w + S(12), rh); }
    markItem(e, { x: a.x - S(6), y, w: Math.min(a.w + S(12), lw + cw + S(18)), h: rh }, i);
    T(e, row[1], a.x, y, rh, labelO);
    const cr = { x: cx, y: y + rh * 0.18, w: cw, h: rh * 0.64 };
    switch (row[0]) {
      case 'text': {
        drawBox(e.g, cr, { bg: { solid: withAlpha(e.text, 0.08) }, border: { width: 1, color: withAlpha(e.text, 0.4) }, radius: 4 }, e.pal);
        T(e, row[2], cr.x + S(10), cr.y, cr.h, labelO);
        break;
      }
      case 'arrows': enumCtl(e, cr, row[2], row[3], r.str('cmp.optionEnum', 'arrows'), ink); break;
      case 'color': {
        const sw = Math.min(cr.h, (cr.w - S(6) * (row[2].length - 1)) / Math.max(1, row[2].length));
        row[2].forEach((c, j) => {
          const q = { x: cr.x + j * (sw + S(6)), y: cr.y + (cr.h - sw) / 2, w: sw, h: sw };
          drawBox(e.g, q, { bg: { solid: c }, radius: 3, border: { width: j === row[3] ? 2.5 : 1, color: j === row[3] ? e.accent : withAlpha(e.text, 0.35) } }, e.pal);
        });
        break;
      }
      case 'toggle': boolCtl(e, cr, row[2], r.str('cmp.optionBool', 'switch')); break;
      case 'slider': rangeCtl(e, cr, row[2], r.str('cmp.optionRange', 'slider'), ink); break;
    }
    logTarget(e.g, { x: cx, y, w: cw, h: rh }, row[1], 'listRow');
  });
}

/**
 * 经营 / 预算表（M12b-62，cnt.screen = screen.manage，内容包 screens.economy）：服务行 = 图标 + 名字 + 日间 / 夜间两根比例条 + 维护费（右对齐，坏色），
 * 一道细线后是税率行（组名 + 滑条 + 百分比）。行几何与设置页相同；B8 · 13 的经营面板（drawRows 的滑条字段、按列）在它上面扩。
 * Godot：VBox（HBox：TextureRect + Label + 两个 HSlider + Label）+ HSeparator + 税率 HBox
 */
function economyForm(e: ElCtx, a0: Rect, ink?: string) {
  const S = (n: number) => n * e.k, ec = samplesFor('economy');
  // 预算两栏（M12b-13，cities-skylines#16：lay.columns 选过 ≥ 2 时服务行分到左右两栏，税率仍在左栏下面）；cmp.listRow 含 slider 时日 / 夜两根是可拖的滑条（cmp.optionRange）
  const ck = chosenKey(e, 'lay.columns'), cols0 = ck ? Math.max(1, Math.min(2, Math.round(e.r.num(ck, 1)))) : 1;
  const lk = chosenKey(e.part('listRow'), 'cmp.listRow'), sliders = !!lk && e.r.list(lk).includes('slider');
  const labelO = { ...e.base, color: ink ?? e.text }, smallO = { ...e.small, color: ink ? withAlpha(ink, 0.7) : mutedOf(e, 0.7) };
  const rh = Math.max(S(36), tap(e), LH(e, labelO, 1.7));
  const names = [...ec.services.map((x) => x[1]), ...ec.taxes.map((x) => x[0])];
  const lw = Math.max(...names.map((n) => W(e, n, labelO))) + S(44);
  const fee = (v: number) => `-${v.toLocaleString('en')}`;
  const fw = Math.max(...ec.services.map((x) => W(e, fee(x[4]), { ...labelO, weight: 700 }))) + S(10);
  // 两栏放不下（每栏的日 / 夜两根条不到 60 宽）时退回一栏（B8 审查修复 ㉔：原来半宽的栏照用一栏的名字宽与费用宽，大字号时字、条与费用叠在一起）
  const cols = cols0 > 1 && ((a0.w - S(24)) / 2 - lw - fw - S(24)) / 2 < S(60) ? 1 : cols0;
  const half = cols > 1 ? Math.ceil(ec.services.length / 2) : ec.services.length, cw = cols > 1 ? (a0.w - S(24)) / 2 : a0.w;
  const colRect = (c: number): Rect => ({ x: a0.x + c * (cw + S(24)), y: a0.y, w: cw, h: a0.h });
  let a = colRect(0);
  const bw = Math.max(S(40), (a.w - lw - fw - S(24)) / 2);
  let y = a.y;
  ec.services.forEach(([g, n, day, night, up], i) => {
    if (cols > 1 && i === half) { if (i) ruleLine(e, a.y, a.y + y - a.y, Math.round(a.x + a.w + S(12)), true); a = colRect(1); y = a.y; }
    if (y + rh > a.y + a.h + 0.5) return;
    markItem(e, { x: a.x, y, w: a.w, h: rh }, i);
    icon(e, g, a.x + S(12), y + rh / 2, S(16), e.icon);
    T(e, n, a.x + S(30), y, rh, labelO);
    [day, night].forEach((v, j) => {
      const bx = a.x + lw + j * (bw + S(12));
      T(e, j ? '夜' : '日', bx, y, rh * 0.5, smallO);
      if (sliders) rangeCtl(e, { x: bx + S(16), y: y + rh * 0.08, w: bw - S(16), h: rh * 0.5 }, v, e.r.str('cmp.optionRange', 'slider'), ink);
      else gaugeOf(e, { x: bx + S(16), y: y + rh * 0.25 - S(3), w: bw - S(16), h: S(6) }, v, j, 'bar', { fixed: true, color: j ? e.accent2 : e.accent });
      T(e, `${Math.round(v * 100)}%`, bx + S(16), y + rh * 0.45, rh * 0.5, smallO);
    });
    const f = fee(up), fo = { ...labelO, weight: 700, color: semantic(e, 'bad') };
    T(e, f, a.x + a.w - W(e, f, fo), y, rh, fo);
    y += rh;
  });
  // 税率接在左栏的服务行下面（两栏时）
  if (cols > 1) { a = colRect(0); y = a.y + half * rh; }
  if (y + S(10) < a.y + a.h) { e.g.fillStyle = withAlpha(ink ?? e.text, 0.2); e.g.fillRect(a.x, y + S(4), a.w, 1); y += S(10); }
  ec.taxes.forEach(([n, v], i) => {
    if (y + rh > a.y + a.h + 0.5) return;
    markItem(e, { x: a.x, y, w: a.w, h: rh }, ec.services.length + i);
    T(e, n, a.x + S(30), y, rh, labelO);
    rangeCtl(e, { x: a.x + lw, y: y + rh * 0.18, w: Math.min(a.w - lw, S(300)), h: rh * 0.64 }, v, e.r.str('cmp.optionRange', 'slider'), ink);
    y += rh;
  });
}

function boolCtl(e: ElCtx, a: Rect, on: boolean, kind: string) {
  const g = e.g, S = (n: number) => n * e.k;
  // 浏览器原生外观（cmp.optionNative，M12b-31，K1 网页原生控件）：系统复选框
  if (nativeOn(e)) { const s = Math.min(a.h, S(16)), q = { x: a.x, y: a.y + (a.h - s) / 2, w: s, h: s }; drawBox(g, q, { bg: { solid: on ? '#0b57d0' : '#ffffff' }, border: { width: 1, color: on ? '#0b57d0' : '#767676' }, radius: 2 }, e.pal); if (on) icon(e, '✓', q.x + s / 2, q.y + s / 2, s * 0.8, '#fff'); return; }
  // 实体拨动开关（toggleSwitch，M12b-31，K1 卡带未来主义）：金属底座 + 一根拨杆（开 = 往右上倒，带强调色指示灯）
  if (kind === 'toggleSwitch') {
    const w = a.h * 1.6, q = { x: a.x, y: a.y, w, h: a.h }, cx = q.x + w / 2, cy = q.y + a.h / 2;
    drawBox(g, q, { bg: { solid: '#3a3d42' }, border: { width: 1, color: '#15171a' }, radius: S(3) }, e.pal);
    g.save(); g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(cx, cy, a.h * 0.22, 0, Math.PI * 2); g.fill();
    const ang = on ? -Math.PI / 4 : (-Math.PI * 3) / 4, L = a.h * 0.55;
    g.strokeStyle = '#d8dce0'; g.lineWidth = Math.max(2, a.h * 0.16); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * L, cy + Math.sin(ang) * L); g.stroke();
    g.fillStyle = on ? e.accent : '#55585c'; g.beginPath(); g.arc(q.x + w + S(8), cy, a.h * 0.16, 0, Math.PI * 2); g.fill(); g.restore();
    return;
  }
  if (kind === 'checkbox') { const s = a.h; drawBox(g, { x: a.x, y: a.y, w: s, h: s }, { bg: { solid: on ? e.accent : 'rgba(0,0,0,0)' }, border: { width: 2, color: on ? e.accent : withAlpha(e.text, 0.5) }, radius: 4 }, e.pal); if (on) icon(e, '✓', a.x + s / 2, a.y + s / 2, s * 0.7, '#fff'); return; }
  if (kind === 'segmented' || kind === 'arrows') return enumCtl(e, a, ['关', '开'], on ? 1 : 0, kind, undefined);
  const w = a.h * 1.9;
  drawBox(g, { x: a.x, y: a.y, w, h: a.h }, { bg: { solid: on ? e.accent : withAlpha(e.text, 0.25) }, radiusPct: 50 }, e.pal);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(on ? a.x + w - a.h / 2 : a.x + a.h / 2, a.y + a.h / 2, a.h / 2 - S(3), 0, Math.PI * 2); g.fill();
}

function enumCtl(e: ElCtx, a: Rect, vals: string[], cur: number, kind: string, ink?: string) {
  const g = e.g, S = (n: number) => n * e.k;
  const o = { ...e.base, color: ink ?? e.text };
  // 浏览器原生外观（cmp.optionNative）：系统下拉框（白底灰边 + ▾）
  if (nativeOn(e)) { drawBox(g, a, { bg: { solid: '#ffffff' }, border: { width: 1, color: '#767676' }, radius: 3 }, e.pal); const no = { ...o, font: 'system-ui, sans-serif', color: '#111' }; T(e, vals[cur] ?? '', a.x + S(8), a.y, a.h, no); T(e, '▾', a.x + a.w - S(16), a.y, a.h, no); return; }
  switch (kind) {
    case 'swatch': {
      // 色块预览（M12b-31，cyberpunk-2077#19）：◁ 值 ▷ 后面一块当前颜色的色块（取值是颜色时用它，否则按序号取强调色 / 第二强调色……）
      const sw = a.h * 0.9, pal = [e.accent, e.accent2, e.good, e.warn, e.bad], col = /^#|^rgb/.test(vals[cur] ?? '') ? vals[cur] : pal[cur % pal.length];
      // 取值是颜色串时箭头中间写「序号 / 个数」（不把 #rrggbb 写出来）
      enumCtl(e, { ...a, w: a.w - sw - S(8) }, vals.map((v, i) => (/^#|^rgb/.test(v) ? `${i + 1} / ${vals.length}` : v)), cur, 'arrows', ink);
      drawBox(g, { x: a.x + a.w - sw, y: a.y + (a.h - sw) / 2, w: sw, h: sw }, { bg: { solid: col }, border: { width: 1, color: withAlpha(e.text, 0.5) }, radius: 2 }, e.pal);
      return;
    }
    case 'segmented': {
      let x = a.x;
      vals.forEach((v, i) => { const w = W(e, v, o) + S(20); drawBox(g, { x, y: a.y, w, h: a.h }, i === cur ? e.t.key : { bg: { solid: withAlpha(e.text, 0.08) } }, e.pal); T(e, v, x + S(10), a.y, a.h, i === cur ? onKey(e, { ...o, weight: 700 }) : o); x += w + S(2); });
      return;
    }
    case 'dropdown': drawBox(g, a, { bg: { solid: withAlpha(e.text, 0.08) }, border: { width: 1, color: withAlpha(e.text, 0.35) }, radius: 4 }, e.pal); T(e, vals[cur] ?? vals[0] ?? '', a.x + S(10), a.y, a.h, o); T(e, '▾', a.x + a.w - S(20), a.y, a.h, o); return;
    case 'radio': {
      let x = a.x;
      vals.forEach((v, i) => { g.strokeStyle = withAlpha(e.text, 0.6); g.lineWidth = 1.5; g.beginPath(); g.arc(x + a.h * 0.3, a.y + a.h / 2, a.h * 0.28, 0, Math.PI * 2); g.stroke(); if (i === cur) { g.fillStyle = e.accent; g.beginPath(); g.arc(x + a.h * 0.3, a.y + a.h / 2, a.h * 0.16, 0, Math.PI * 2); g.fill(); } T(e, v, x + a.h * 0.7, a.y, a.h, o); x += a.h * 0.7 + W(e, v, o) + S(14); });
      return;
    }
    case 'thumbnails': vals.forEach((v, i) => { const s = a.h * 1.5; const rr = { x: a.x + i * (s + S(6)), y: a.y - a.h * 0.25, w: s, h: a.h * 1.5 }; drawGreybox(g, rr, v.slice(0, 2), { small: true }); if (i === cur) { g.strokeStyle = e.accent; g.lineWidth = 2.5; g.strokeRect(rr.x, rr.y, rr.w, rr.h); } }); return;
    default: {
      // ◁ 值 ▷（序号超出取值表时取第一项，B9 审查修复 ①：原来写 undefined、整屏报错）
      const v = vals[cur] ?? vals[0] ?? '';
      T(e, '◁', a.x, a.y, a.h, { ...o, color: e.accent }); T(e, v, a.x + a.w / 2 - W(e, v, o) / 2, a.y, a.h, o); T(e, '▷', a.x + a.w - W(e, '▷', o), a.y, a.h, { ...o, color: e.accent });
    }
  }
}

function rangeCtl(e: ElCtx, a: Rect, v: number, kind: string, ink?: string) {
  const g = e.g, S = (n: number) => n * e.k;
  const o = { ...e.base, color: ink ?? e.text };
  // 浏览器原生外观（cmp.optionNative）：灰轨蓝钮的系统滑条
  if (nativeOn(e)) { const ty = a.y + a.h / 2, w = a.w - S(44); g.fillStyle = '#c4c7c5'; g.fillRect(a.x, ty - 2, w, 4); g.fillStyle = '#0b57d0'; g.fillRect(a.x, ty - 2, w * v, 4); g.beginPath(); g.arc(a.x + w * v, ty, S(7), 0, Math.PI * 2); g.fill(); T(e, String(Math.round(v * 100)), a.x + a.w - S(34), a.y, a.h, { ...o, font: 'system-ui, sans-serif' }); return; }
  if (kind === 'hsvTriplet') { hsvTriplet(e, a, v, ink); return; }
  if (kind === 'knob') {
    // 实体旋钮（K1 卡带未来主义）：圆钮 + 刻度弧 + 指示线（-135° → +135°）+ 右边的读数
    const d = Math.min(a.h * 1.3, S(44)), cx = a.x + d / 2, cy = a.y + a.h / 2, ang = (-225 + v * 270) * (Math.PI / 180);
    g.save(); g.strokeStyle = withAlpha(e.text, 0.35); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, d * 0.5, (-225 * Math.PI) / 180, (45 * Math.PI) / 180); g.stroke();
    g.strokeStyle = e.accent; g.beginPath(); g.arc(cx, cy, d * 0.5, (-225 * Math.PI) / 180, ang); g.stroke();
    g.fillStyle = '#2b2e33'; g.beginPath(); g.arc(cx, cy, d * 0.38, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e9eaec'; g.lineWidth = Math.max(2, d * 0.07); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * d * 0.32, cy + Math.sin(ang) * d * 0.32); g.stroke(); g.restore();
    drawNumber(e, String(Math.round(v * 100)), a.x + d + S(10), a.y, a.h, o);
    return;
  }
  if (kind === 'fader') {
    // 推子（调音台）：一道细槽 + 刻度 + 方形推子帽
    const w = a.w - S(44), ty = a.y + a.h / 2;
    g.fillStyle = withAlpha(e.text, 0.5); g.fillRect(a.x, ty - 1, w, 2);
    for (let i = 0; i <= 10; i++) g.fillRect(a.x + (w * i) / 10, ty + a.h * 0.22, 1, i % 5 ? a.h * 0.12 : a.h * 0.22);
    drawBox(g, { x: a.x + w * v - S(6), y: a.y + a.h * 0.08, w: S(12), h: a.h * 0.84 }, { bg: { solid: '#d0d3d7' }, border: { width: 1, color: '#202226' }, radius: 2 }, e.pal);
    g.fillStyle = '#202226'; g.fillRect(a.x + w * v - S(5), ty - 0.5, S(10), 1);
    drawNumber(e, String(Math.round(v * 100)), a.x + a.w - S(34), a.y, a.h, o);
    return;
  }
  if (kind === 'segmentedBar') { gauge(e, { x: a.x, y: a.y + a.h * 0.3, w: a.w - S(40), h: a.h * 0.4 }, v, 'segmented', e.accent); T(e, String(Math.round(v * 10)), a.x + a.w - S(30), a.y, a.h, o); return; }
  if (kind === 'stepper' || kind === 'arrows') { const s = String(Math.round(v * 100)); const bw = a.h; button(e, { x: a.x, y: a.y, w: bw, h: a.h }, '−', false); T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y, a.h, o); button(e, { x: a.x + a.w - bw, y: a.y, w: bw, h: a.h }, '＋', false); return; }
  const ty = a.y + a.h / 2;
  g.fillStyle = withAlpha(e.text, 0.2); g.fillRect(a.x, ty - S(2), a.w - S(44), S(4));
  g.fillStyle = e.accent; g.fillRect(a.x, ty - S(2), (a.w - S(44)) * v, S(4));
  g.beginPath(); g.arc(a.x + (a.w - S(44)) * v, ty, Math.max(S(8), a.h * 0.3), 0, Math.PI * 2); g.fill();
  T(e, String(Math.round(v * 100)), a.x + a.w - S(34), a.y, a.h, o);
}

/* ---------------- 表单控件库（M12b-31） ---------------- */
/**
 * 一行表单（formRows）：kind = text 输入框 / arrows / segmented / dropdown / swatch / colors 一排色块 / slider / hsvTriplet / knob / fader / stepper / switch / toggleSwitch / checkbox / iconToggle / dice 输入框 + 骰子。
 * fam = 没被逐行换掉的行按原来的控件族画（range = 滑条行走 rangeCtl、bool = 开关行走 boolCtl，kind 是 cmp.optionRange / optionBool 的取值——arrows / segmented 这些同名取值在这两族里另有画法，
 * B9 审查修复 ①：原来按 kind 名分派，滑条 / 开关行落进取值表控件、借不到取值表时整屏报错）；逐行换掉的行没有 fam，按 kind 分派
 */
interface FormRow { label: string; kind: string; v: number; vals?: string[]; text?: string; fam?: 'range' | 'bool' }
/** 两层排法（cmp.optionLayout：stacked = 每项一块独立的小框，上层「名称 …… 数值」、下层控件；inline = 原来的单行），选过才算 */
const optionLayoutOf = (e: ElCtx) => pickedStr(e, 'cmp.optionLayout', 'inline');
/** 逐行控件（cmp.optionRows，有序多选：第 i 项换掉第 i 行的控件，auto = 这一行照原来） */
const optionRowsOf = (e: ElCtx): string[] => { const k = chosenKey(e, 'cmp.optionRows'); return k ? e.r.list(k) : []; };
/** 浏览器原生外观（cmp.optionNative = true，K1 网页原生控件 / 后台面板），选过才算 */
const nativeOn = (e: ElCtx) => pickedStr(e, 'cmp.optionNative', 'false') === 'true';
/**
 * 表单行（M12b-31，cyberpunk-2077#18 / stardew#22）：逐行控件（cmp.optionRows 的第 i 项换掉第 i 行的控件种类，cmp.optionEnum / Range / Bool 照旧管没换的行）；
 * 两层排法（cmp.optionLayout = stacked）：每项一块切角小框（面板的控件面），上层「名称 …… 数值」、下层控件，当前行（第一行）两侧挂键帽（cmp.listRow 含 keyHint 时，Cyberpunk 的 [A] [D]）
 */
function formRows(e: ElCtx, a: Rect, rows0: FormRow[], ink?: string) {
  const S = (n: number) => n * e.k, r = e.r, ov = optionRowsOf(e), stacked = optionLayoutOf(e) === 'stacked', labelO = { ...e.base, color: ink ?? e.text };
  // 逐行换成取值表类控件（箭头 / 分段 / 下拉 / 色块）而这一行原来没有取值表（滑条 / 开关 / 输入框）时：借设置页的取值表 1，值按 0–1 落到表里的序号
  const ENUMISH = ['arrows', 'segmented', 'dropdown', 'swatch'], fallbackVals = settingsOf().enums[1] ?? ['—'];
  const swap = (row: FormRow, kind: string): FormRow => (ENUMISH.includes(kind) && !row.vals ? { ...row, kind, vals: fallbackVals, v: Math.round(Math.max(0, Math.min(1, row.v)) * (fallbackVals.length - 1)) } : { ...row, kind });
  // 没换掉的行：取值表行 / 滑条行 / 开关行各按自己的全局控件参数、在自己的控件族里画（与 form() 的单行排法同一套：rangeCtl / boolCtl 认 arrows / segmented / stepper）
  const rows = rows0.map((row, i): FormRow => (ov[i] && ov[i] !== 'auto' ? swap(row, ov[i]) : row.kind === 'arrows' ? { ...row, kind: r.str('cmp.optionEnum', 'arrows') } : row.kind === 'slider' ? { ...row, kind: r.str('cmp.optionRange', 'slider'), fam: 'range' } : row.kind === 'switch' ? { ...row, kind: r.str('cmp.optionBool', 'switch'), fam: 'bool' } : row));
  const lineH = Math.max(S(40), tap(e), LH(e, labelO, 1.8)), rh = (row: FormRow) => (stacked ? lineH * 0.75 + (row.kind === 'hsvTriplet' ? lineH * 1.6 : lineH * 0.8) + S(10) : row.kind === 'hsvTriplet' ? lineH * 1.8 : lineH);
  const lw = stacked ? 0 : Math.max(...rows.map((x) => W(e, x.label, labelO))) + S(24), keys = r.list('cmp.listRow').includes('keyHint');
  let y = a.y;
  rows.forEach((row, i) => {
    const h = rh(row);
    if (y + h > a.y + a.h + 0.5) return;
    const box = { x: a.x, y, w: Math.min(a.w, stacked ? S(420) : a.w), h: h - (stacked ? S(6) : 0) };
    if (stacked) drawBox(e.g, box, { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, chamfer: S(8), cornerMask: ['br'], border: { width: i === 0 ? 1.5 : 1, color: i === 0 ? e.accent : withAlpha(e.text, 0.35) } } as BoxStyle, e.pal);
    else if (i === 0) { e.g.fillStyle = withAlpha(e.accent, 0.12); e.g.fillRect(a.x - S(6), y, a.w + S(12), h); }
    markItem(e, box, i);
    const lo = stacked ? { ...labelO, weight: 700, upper: true, spacing: 0.06 } : labelO;
    T(e, row.label, a.x + (stacked ? S(10) : 0), y, stacked ? lineH * 0.75 : h, lo);
    // 两层的上层右边：有取值表的行（箭头 / 色块 / 下拉……）在上层右边写「序号 / 个数」（Cyberpunk 捏人的 3 / 8）；滑条类控件自己在右边写数值、开关 / 输入框不写，免得同一个数写两遍
    if (stacked && row.vals?.length && row.kind !== 'colors') { const vt = `${Math.round(row.v) + 1} / ${row.vals.length}`, vo = { ...labelO, weight: 700 }; T(e, vt, box.x + box.w - S(10) - W(e, vt, vo), y, lineH * 0.75, vo); }
    const cr = stacked ? { x: a.x + S(10) + (keys && i === 0 ? S(30) : 0), y: y + lineH * 0.75, w: box.w - S(20) - (keys && i === 0 ? S(60) : 0), h: h - lineH * 0.75 - S(14) } : { x: a.x + lw, y: y + h * 0.18, w: Math.min(a.w - lw, S(300)), h: h * 0.64 };
    if (stacked && keys && i === 0) { const kh = Math.min(cr.h, S(22)); keyCap(e, a.x + S(10), cr.y + (cr.h - kh) / 2, kh, 'A'); keyCap(e, box.x + box.w - S(10) - keyCapWidth(e, kh, 'D'), cr.y + (cr.h - kh) / 2, kh, 'D'); }
    // 控件一栏太窄（大字号 / 加长文字时名称占满了行宽，B9 审查修复 ⑮：原来照画、框宽为负）时这一行只写名称
    if (cr.w >= cr.h + S(8)) formCtl(e, cr, row, ink);
    logTarget(e.g, box, row.label, 'listRow');
    y += h;
  });
}
/** 一行的控件（formRows） */
function formCtl(e: ElCtx, cr: Rect, row: FormRow, ink?: string) {
  const S = (n: number) => n * e.k, g = e.g, o = { ...e.base, color: ink ?? e.text };
  // 没被逐行换掉的滑条 / 开关行：在原来的控件族里画（kind = cmp.optionRange / optionBool 的取值，arrows / segmented 也在族里）
  if (row.fam === 'range') { rangeCtl(e, cr, Math.max(0, Math.min(1, row.v)), row.kind, ink); return; }
  if (row.fam === 'bool') { boolCtl(e, cr, row.v > 0.5, row.kind); return; }
  switch (row.kind) {
    case 'text': case 'dice': {
      // 骰子钮放得下才画（窄栏时只画输入框）
      const w = row.kind === 'dice' && cr.w >= cr.h * 2 + S(8) ? cr.w - cr.h - S(8) : cr.w;
      drawBox(g, { ...cr, w }, { bg: { solid: withAlpha(e.text, 0.08) }, border: { width: 1, color: withAlpha(e.text, 0.4) }, radius: 4 }, e.pal);
      T(e, row.text ?? pack().hud.profile.name, cr.x + S(10), cr.y, cr.h, o);
      if (row.kind === 'dice' && w < cr.w) button(e, { x: cr.x + w + S(8), y: cr.y, w: cr.h, h: cr.h }, '⚄', false);
      return;
    }
    case 'colors': {
      const vals = row.vals ?? [], sw = Math.min(cr.h, (cr.w - S(6) * (vals.length - 1)) / Math.max(1, vals.length));
      vals.forEach((c, j) => drawBox(g, { x: cr.x + j * (sw + S(6)), y: cr.y + (cr.h - sw) / 2, w: sw, h: sw }, { bg: { solid: c }, radius: 3, border: { width: j === row.v ? 2.5 : 1, color: j === row.v ? e.accent : withAlpha(e.text, 0.35) } }, e.pal));
      return;
    }
    case 'iconToggle': {
      // 图标切换（Stardew 的性别钮）：两颗图标钮，当前那颗是主按钮
      const s = cr.h; ['M', 'F'].forEach((t, j) => button(e, { x: cr.x + j * (s + S(8)), y: cr.y, w: s, h: s }, t, j === (row.v > 0.5 ? 1 : 0)));
      return;
    }
    case 'stepper': case 'stepperMinMax': quantityCtl(e, cr, Math.round(row.v * 10), 10, row.kind); return;
    case 'switch': case 'toggleSwitch': case 'checkbox': boolCtl(e, cr, row.v > 0.5, row.kind); return;
    // 取值表（颜色 / 箭头项）换成滑条类时，值 = 当前序号在表里的位置（0–1）
    case 'slider': case 'hsvTriplet': case 'knob': case 'fader': case 'segmentedBar': rangeCtl(e, cr, row.vals?.length ? Math.min(1, row.v / Math.max(1, row.vals.length - 1)) : Math.max(0, Math.min(1, row.v)), row.kind, ink); return;
    default: enumCtl(e, cr, row.vals ?? ['—'], Math.round(row.v) || 0, row.kind, ink);
  }
}
/**
 * 色相三联滑条（cmp.optionRange = hsvTriplet，M12b-31，stardew#21）：色相彩虹轨 + 饱和度轨 + 明度轨三条（轨本身是渐变）、各一枚圆钮，右侧竖排三个数值。
 * v = 当前颜色的色相（0–1），饱和 / 明度按演示值 0.7 / 0.85
 */
function hsvTriplet(e: ElCtx, a: Rect, v: number, ink?: string) {
  const S = (n: number) => n * e.k, g = e.g, vals = [v, 0.7, 0.85], th = (a.h - S(8)) / 3, w = a.w - S(44), o = { ...e.small, color: ink ?? e.text };
  const hue = (h: number, s = 1, l = 0.5) => `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  vals.forEach((val, i) => {
    const y = a.y + i * (th + S(4)), q = { x: a.x, y: y + th * 0.25, w, h: th * 0.5 }, gr = g.createLinearGradient(q.x, 0, q.x + q.w, 0);
    if (i === 0) for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, hue(k / 6));
    else if (i === 1) { gr.addColorStop(0, hue(v, 0)); gr.addColorStop(1, hue(v, 1)); }
    else { gr.addColorStop(0, '#000000'); gr.addColorStop(1, hue(v, 0.7)); }
    g.save(); g.fillStyle = gr; g.fillRect(q.x, q.y, q.w, q.h); g.restore();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#202226'; g.lineWidth = 1.5; g.beginPath(); g.arc(q.x + q.w * val, q.y + q.h / 2, th * 0.38, 0, Math.PI * 2); g.fill(); g.stroke();
    drawNumber(e, String(Math.round(val * 100)), a.x + a.w - S(34), y, th, o);
  });
}
/**
 * 数量控件（cmp.quantity，M12b-31）：stepperMinMax = 「无 / −1 / 数 / +1 / 满」五段方钮（Frostpunk 工人分配）+ 右边灰字的「/ 上限」；stepper = − 数 ＋；其余 = 滑条
 */
function quantityCtl(e: ElCtx, a: Rect, n: number, max: number, kind: string) {
  const S = (k: number) => k * e.k, o = { ...e.base, weight: 700, color: e.text }, b = a.h;
  if (kind === 'stepperMinMax') {
    const labels = ['无', '−1', String(n), '+1', '满'], ws = labels.map((l, i) => (i === 2 ? Math.max(b * 1.3, W(e, l, o) + S(14)) : Math.max(b, W(e, l, buttonText(e, b)) + S(12))));
    let x = a.x;
    labels.forEach((l, i) => { const q = { x, y: a.y, w: ws[i], h: b }; if (i === 2) { drawBox(e.g, q, { bg: { solid: withAlpha(e.text, 0.1) }, border: { width: 1, color: withAlpha(e.text, 0.4) } }, e.pal); drawNumber(e, l, q.x + q.w / 2 - numberWidth(e, l, o) / 2, q.y, q.h, o); } else button(e, q, l, false); x += ws[i] + S(3); });
    const mo = { ...e.small, color: mutedOf(e, 0.6) }; T(e, `/ ${max}`, x + S(6), a.y, b, mo);
    return;
  }
  if (kind === 'stepper') { button(e, { x: a.x, y: a.y, w: b, h: b }, '−', false); const t = String(n); drawNumber(e, t, a.x + b + S(10), a.y, b, o); button(e, { x: a.x + b + S(20) + numberWidth(e, t, o), y: a.y, w: b, h: b }, '＋', false); return; }
  rangeCtl(e, a, n / Math.max(1, max), 'slider');
}
/**
 * 句内多空位填空（cmp.formKind = inlineBlanks，M12b-31，obra-dinn#28）：几行命运句「____ 被 ____ 用 ____ 杀死」，空位是下划线（填过的写强调色的词），
 * 第一行第一个空位下面弹出按组分栏的词表（人物 / 方式 / 武器）。ix.confirm = batch（#30）：每满 3 行一起确认——已确认的行压暗、行首打勾，底部写「已确认 3 / 9 · 每 3 人一起确认」
 */
function inlineBlanks(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k, g = e.g, o = { ...e.base, size: e.base.size * 1.1, color: ink ?? e.text }, lh = LH(e, o, 2), names = samplesFor('characters').map((x) => x[1]);
  const ways = ['刺伤', '落水', '火枪'], weapons = ['长剑', '刀', '绳子'], batch = e.r.str('ix.confirm', '') === 'batch' && chosen(e, 'ix.confirm');
  const fills: (string | null)[][] = [[names[0] ?? '', names[1] ?? '', weapons[0]], [null, null, null], [names[2] ?? '', null, weapons[1]]];
  const bw = S(96), parts = ['', ' 被 ', ' 用 ', ' 杀死'];
  let firstBlank: Rect | null = null;
  fills.forEach((row, i) => {
    const y = a.y + i * lh, done = batch && i === 0, ro = done ? { ...o, color: withAlpha(o.color, 0.55) } : o;
    if (y + lh > a.y + a.h + 0.5) return;
    let x = a.x;
    if (batch) { T(e, done ? '✓' : `${i + 1}`, x, y, lh, { ...ro, color: done ? e.good : ro.color }); x += S(22); }
    for (let k = 0; k < 3; k++) {
      if (parts[k]) { T(e, parts[k], x, y, lh, ro); x += W(e, parts[k], ro); }
      const v = row[k], q = { x, y: y + lh * 0.15, w: bw, h: lh * 0.7 };
      g.fillStyle = ro.color; g.fillRect(q.x, q.y + q.h, q.w, Math.max(1, S(1.5)));
      if (v) T(e, v, q.x + q.w / 2 - W(e, v, ro) / 2, y, lh, { ...ro, weight: 700, color: done ? ro.color : e.accent });
      if (!firstBlank && !v) firstBlank = q;
      logTarget(g, q, v ?? '空位');
      x += bw;
    }
    T(e, parts[3], x, y, lh, ro);
  });
  // 弹出的分类词表（按组分栏）
  const fb = firstBlank as Rect | null;
  if (fb) {
    const cols: [string, string[]][] = [['人物', names.slice(0, 3)], ['方式', ways], ['武器', weapons]], cw = S(90), ch = LH(e, e.small, 1.6), q = { x: fb.x, y: fb.y + fb.h + S(6), w: cw * 3 + S(16), h: ch * 4 + S(14) };
    if (q.y + q.h <= a.y + a.h + S(40)) {
      panel(e.part('tooltip'), q, true, {}, 'tooltip');
      cols.forEach(([t, ws], j) => { const x = q.x + S(8) + j * cw, ho = { ...e.small, weight: 700, color: e.accent }; T(e, t, x, q.y + S(6), ch, ho); ws.forEach((w0, k) => T(e, w0, x, q.y + S(6) + (k + 1) * ch, ch, { ...e.small, color: e.text })); });
      frameOccupancy().add(q, { kind: 'template', prio: 2, sub: 'data' });
    }
  }
  if (batch) { const fo = { ...e.small, color: mutedOf(e, 0.7) }, t = '已确认 3 / 9 · 每 3 人一起确认'; T(e, t, a.x, a.y + a.h - LH(e, fo), LH(e, fo), fo); }
}

function rebind(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k;
  const kind = e.r.str('cmp.bindingMap', 'list');
  const pad = e.r.str('ctx.input', 'kbm') === 'pad' || kind === 'pad';
  const o = { ...e.base, color: ink ?? e.text };
  const listW = kind === 'list' ? a.w : a.w * 0.5;
  const rh = Math.max(S(36), tap(e), LH(e, o, 1.7));
  pack().screens.binds.forEach(([act, key, btn], i) => {
    const y = a.y + i * rh;
    if (y + rh > a.y + a.h + 0.5) return;
    if (i === 2) { e.g.fillStyle = withAlpha(e.accent, 0.14); e.g.fillRect(a.x, y, listW, rh); }
    markItem(e, { x: a.x, y, w: listW, h: rh }, i);
    T(e, act, a.x + S(8), y, rh, o);
    const k = pad ? btn : key, kw = Math.max(S(32), W(e, k, buttonText(e, rh - S(10))) + S(16));
    button(e, { x: a.x + listW - kw - S(8), y: y + S(5), w: kw, h: rh - S(10) }, i === 2 ? '…' : k, i !== 2);
  });
  if (kind === 'list') return;
  // 设备示意图 + 引线
  const dr = { x: a.x + listW + S(20), y: a.y + S(10), w: a.w - listW - S(20), h: Math.min(a.h - S(20), (a.w - listW) * 0.7) };
  const g = e.g;
  g.save(); g.strokeStyle = withAlpha(e.text, 0.6); g.lineWidth = 2;
  if (pad) { g.beginPath(); g.roundRect(dr.x + dr.w * 0.1, dr.y + dr.h * 0.3, dr.w * 0.8, dr.h * 0.45, dr.h * 0.2); g.stroke(); }
  else if (kind === 'mouse') { g.beginPath(); g.roundRect(dr.x + dr.w * 0.35, dr.y + dr.h * 0.1, dr.w * 0.3, dr.h * 0.8, dr.w * 0.15); g.stroke(); }
  else for (let row = 0; row < 4; row++) for (let c = 0; c < 10; c++) g.strokeRect(dr.x + c * dr.w / 10 + 2, dr.y + dr.h * 0.2 + row * dr.h * 0.18, dr.w / 10 - 4, dr.h * 0.16);
  g.strokeStyle = e.accent; g.setLineDash([4, 3]);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(a.x + listW, a.y + i * rh + rh / 2); g.lineTo(dr.x + dr.w * (0.2 + i * 0.2), dr.y + dr.h * 0.5); g.stroke(); }
  g.restore();
}

function textBlock(e: ElCtx, a: Rect, ink?: string) {
  const S = (n: number) => n * e.k;
  const sub = e.r.str('cnt.subtype', '');
  const o = { ...e.base, color: ink ?? e.text };
  const scr = pack().screens;
  // 块之间的分隔线（vis.dividerPlace = betweenBlocks，M12b-45）：制作人员的每组之间、正文的段落之间
  const between = !!dividerPlaces(e)?.includes('betweenBlocks');
  if (sub === 'credits') {
    scr.credits.forEach(([role, who], i) => {
      const y = a.y + a.h * 0.2 + i * LH(e, o, 3.2);
      if (between && i > 0) { const gy = y - (LH(e, o, 3.2) - LH(e, e.small) - LH(e, e.title)) / 2; ruleLine(e, a.x + a.w * 0.32, a.x + a.w * 0.68, gy); }
      T(e, role, a.x + a.w / 2 - W(e, role, { ...e.small, color: withAlpha(ink ?? e.text, 0.6) }) / 2, y, LH(e, e.small), { ...e.small, color: withAlpha(ink ?? e.text, 0.6) });
      T(e, who, a.x + a.w / 2 - W(e, who, { ...e.title, color: ink ?? e.title.color }) / 2, y + LH(e, e.small), LH(e, e.title), { ...e.title, color: ink ?? e.title.color });
    });
    return;
  }
  const tl = e.r.str('cnt.textLength', 'short');
  if (tl === 'line' || tl === 'title') {
    // 一句话（确认弹窗、提示）：居中
    const s = sub === 'confirm' ? scr.confirm : scr.line;
    const o2 = { ...o, size: o.size * 1.1 };
    T(e, s, a.x + a.w / 2 - W(e, s, o2) / 2, a.y + a.h * 0.3, LH(e, o2, 1.6), o2);
    return;
  }
  // 正文（M12b-57）：对话类模板写包的对话 / 事件正文（screens.passage，没写时公告），其余公告；富文本标记按 hier.inlineMap 着色（drawRich），
  // 对齐按 typ.align（M12b-55），首字下沉按 typ.dropCap
  const text = blockText(e, tl === 'long');
  // 字体混排（typ.mix = perLine，M12b-63，K1 反设计 / 外行美学 G-type-mix）：逐段（只有一段时逐句）轮着换衬线 / 黑体 / 楷体
  if (typeMix(e) === 'perLine') {
    const segs = text.includes('\n') ? text.split('\n').filter((x) => x.trim()) : text.split(/(?<=[。！？!?])/).filter((x) => x.trim());
    let y = a.y;
    segs.forEach((p0, i) => { y += textRich(e, p0, { x: a.x, y, w: a.w - S(16), h: Math.max(0, a.y + a.h - y) }, { ...o, font: MIX_FONTS()[i % 3] }); });
    return;
  }
  const paras = between ? text.split('\n').filter((x) => x.trim()) : [];
  if (paras.length > 1) {
    // 段落之间各一条分隔线（上下各留 8）
    let y = a.y;
    paras.forEach((p0, i) => {
      if (i) { ruleLine(e, a.x, a.x + a.w - S(16), y + S(8)); y += S(17); }
      y += textRich(e, p0, { x: a.x, y, w: a.w - S(16), h: Math.max(0, a.y + a.h - y) }, o);
    });
    return;
  }
  textRich(e, text, { x: a.x, y: a.y, w: a.w - S(16), h: a.h }, o);
}
/** 字体混排（typ.mix，M12b-63）：选过才有（旧皮肤只认皮肤之后的层） */
export const typeMix = (e: ChoiceCtx) => pickedStr(e, 'typ.mix', 'none');
/** 混排轮着用的三种字：衬线 / 黑体 / 墨线衬线（中文是楷体） */
const MIX_FONTS = () => [FONT_STACK.serif, FONT_STACK.sans, FONT_STACK.inkedSerif];
/** 长文块的字（textBlock 与 fitContent 的测量共用）：对话类模板 = screens.passage（没写时公告），其余公告；long = 两遍 */
function blockText(e: ElCtx, long: boolean): string {
  const scr = pack().screens, src = dialogueLike(e.r) ? scr.passage ?? scr.notice : scr.notice;
  return long ? (src === scr.notice ? scr.notice + scr.notice : `${src}\n${src}`) : src;
}
/**
 * 长文块按富文本画（M12b-57）+ 对齐（typ.align，M12b-55）+ 首字下沉（typ.dropCap：raised = 首行放大 1.8 倍的首字、drop = 占两行的大首字、illuminated = drop + 强调色方底）。
 * 都没设、串里没有标记时与原来的 wrapLines + T() 逐字一致。返回用掉的高
 */
function textRich(e: ElCtx, text: string, a: Rect, o: TextOpts, measureOnly = false): number {
  const align = textAlign(e, 'body');
  const dc = e.th.legacy && !chosen(e, 'typ.dropCap') ? 'none' : e.r.str('typ.dropCap', 'none');
  const first = [...text][0] ?? '', body0 = text.startsWith('§ ') || text.startsWith('» ');
  if (dc === 'none' || dc === 'auto' || !first || body0 || first === '{' || first === '[') return drawRich(e, text, a, { o, align, lh: 1.7, measureOnly }).h;
  const lh = LH(e, o, 1.7), drop = dc !== 'raised', lines = drop ? 2 : 1;
  const co: TextOpts = { ...o, size: drop ? lh * 1.7 : o.size * 1.8, weight: 800, color: dc === 'illuminated' ? onColorOf(e.accent, resolveColor(e.th.surface, e.pal)) : e.accent };
  const cw = W(e, first, co) + e.k * (dc === 'illuminated' ? 12 : 6);
  if (!measureOnly) {
    if (dc === 'illuminated') { e.g.fillStyle = e.accent; e.g.fillRect(a.x, a.y + 2, cw - e.k * 4, lh * 2 - 4); }
    T(e, first, a.x + (dc === 'illuminated' ? e.k * 4 : 0), a.y + (drop ? 0 : lh - LH(e, co, 1.2)), drop ? lh * 2 : LH(e, co, 1.2), co);
  }
  return drawRich(e, [...text].slice(1).join(''), a, { o, align, lh: 1.7, indent: { lines, w: cw }, measureOnly }).h;
}
/** 文字对齐（typ.align，M12b-55；可 @title / @body）：left / center / justify；没给 = 左对齐（原来的） */
function textAlign(e: ElCtx, part: 'body' | 'title'): 'left' | 'center' | 'justify' {
  const ep = e.part(part), v = e.th.legacy && !chosen(ep, 'typ.align') ? 'left' : ep.v.str('typ.align', 'left');
  return v === 'center' || v === 'justify' ? v : 'left';
}

/**
 * 对话托盘的台词（目检修复）：对话类模板放在托盘 / 底部浮层里、没有数据结构、元素里有字幕时，托盘主体就是这句台词——说话人写在页头（drawHeader），
 * 这里在页头下面左起写台词（不带「说话人：」前缀），字比正文大一档、用面板（对白框部件 dialog）的字色，按 mo.textReveal 的逐字显现截断；
 * 字幕元素不再另画（原来字幕作为元素锚在托盘底边正中，与「确定」钮抢一行，被避让挤到钮边并缩到 0.81）。
 * avoid = 托盘里别的元素（选项）：台词宽度收到它们左边。返回最后一行的行尾（继续箭头画在那里）
 */
function dialogueLine(e: ElCtx, a0: Rect, ink: string | undefined, avoid: Rect[], center = false, fit = false): { x: number; y: number } | null {
  const S = (n: number) => n * e.k, ed = e.part('dialog');
  const o: TextOpts = { ...ed.base, size: ed.base.size * 1.15, color: ink ?? ed.text };
  const lh = LH(ed, o, 1.6);
  // 对话框版式（fit，B9 审查修复 ④）：选项与台词区按矩形相交判断（原来只认从左端 80 以外开始、与头两行相交的选项）；收到选项左边不到 140 宽时，
  // 台词改写在选项上面那一条（放得下一行时），都不行才照原来收到选项左边。原来的托盘照旧
  const hit = fit ? avoid.filter((q) => q.x < a0.x + a0.w && a0.x < q.x + q.w && q.y < a0.y + a0.h && a0.y < q.y + q.h) : [];
  const band = hit.length ? Math.min(...hit.map((q) => q.y)) - S(6) - a0.y : 0, leftW = hit.length ? Math.min(...hit.map((q) => q.x)) - S(14) - a0.x - S(24) : 0;
  let a = hit.length && leftW < S(140) && band >= lh ? { ...a0, h: band } : a0, above = a !== a0;
  // 台词区：与选项在纵向上相交时收到选项左边，右边再给继续箭头留一格
  const right = above ? a.x + a.w : fit ? Math.min(a.x + a.w, ...hit.map((q) => q.x - S(14))) : Math.min(a.x + a.w, ...avoid.filter((q) => q.x > a.x + S(80) && q.y < a.y + lh * 2 && a.y < q.y + q.h).map((q) => q.x - S(14)));
  let w = Math.max(S(120), right - a.x - S(24));
  const line = spokenLine(e.r).line, rv = simNow().reveal, rich = center || plainText(line) !== line;
  // 终期审查修复 ㉓：选项旁边那一列装不下整句时，选项上面那一条整宽装得下就写在那一条（原来要「放得下一行」且列宽不到 140 才换）；
  // 都装不下时最后一行以「…」结尾（drawRich 的 ellipsis / fitLine），继续箭头跟在画出来的行尾——原来多出的行直接丢掉、箭头跟在半句后面
  const linesAt = (ww: number) => (rich ? measureRich(ed, line, ww, { o, lh: 1.6, align: center ? 'center' : 'left' }).lines : wrapText(e, line, ww, o).length);
  if (fit && hit.length && !above && linesAt(w) * lh > a.h + 1) {
    const fw = Math.max(S(120), a0.w - S(24));
    if (band >= lh && linesAt(fw) * lh <= band + 1) { a = { ...a0, h: band }; above = true; w = fw; }
  }
  // 居中的台词（topBox）：选项压在右边、台词收到左边时在收出来的那一块里居中
  const cw = center && hit.length && !above ? Math.min(a.w, w + S(24)) : a.w;
  // 带富文本标记的台词（M12b-21 / B2 顺延：打字机逐字显现也作用到富文本）：drawRich 按 reveal 只画前几个字，折行照整段算；
  // 居中（topBox）同样走它。纯文字、不居中时照原来逐行 T()（调用序列不变）
  if (rich) {
    const n = [...plainText(line)].length, out = drawRich(ed, line, { x: a.x, y: a.y, w: center ? cw : w, h: a.h }, { o, lh: 1.6, align: center ? 'center' : 'left', ...(rv < 1 ? { reveal: Math.floor(n * rv) } : {}), ...(fit ? { ellipsis: true } : {}) });
    return out.end ? { x: center ? a.x + cw / 2 : out.end.x + S(14), y: center ? a.y + a.h - S(4) : out.end.y + lh / 2 } : null;
  }
  const shown = rv < 1 ? [...line].slice(0, Math.floor([...line].length * rv)).join('') : line;
  const lines = wrapText(e, line, w, o);
  // 对话框版式（fit）里装不下的：最后能画的那一行以「…」结尾（终期审查修复 ㉓）；原来的托盘照旧
  const fitN = Math.floor((a.h + 1) / lh);
  if (fit && fitN >= 1 && lines.length > fitN) lines[fitN - 1] = fitLine(ed.tx, lines[fitN - 1], w, o, true);
  let left = [...shown].length, end: { x: number; y: number } | null = null;
  lines.forEach((l, i) => {
    const y = a.y + i * lh;
    if (y + lh > a.y + a.h + 1 || left <= 0) return;
    const part = [...l].slice(0, left).join('');
    left -= [...l].length;
    T(ed, part, a.x, y, lh, o);
    end = { x: a.x + W(ed, part, o) + S(14), y: y + lh / 2 };
  });
  return end;
}
/** 继续箭头（ix.continueCue = blinkArrow）的位置：对话托盘画了台词时在台词行尾，否则内框右下角（每遍构图清空） */
let CUE_AT: { x: number; y: number } | null = null;

/** 这一屏的地图已经出血铺满整屏（drawScreen 先画了地图本体，drawData 的地图只画节点与地名） */
let MAP_BLED = false;
/** 出血地图铺满的那块（整屏 R）：揭雾遮罩铺在它上面（M12b-25） */
let MAP_FULL: Rect | null = null;
/** 出血地图上节点 / 地名排的那一条（bleedBand，B10 审查修复 ⑪）；没有时按整屏 */
let MAP_BAND: Rect | null = null;
/** 节点 uv（按 MAP_BAND 排）→ 遮罩 uv（按 MAP_FULL 铺）：不是出血地图、或没有那一条时原样 */
function bandUV(u: number, v: number): [number, number] {
  const B = MAP_BAND, F = MAP_FULL;
  return B && F && F.w > 0 && F.h > 0 ? [(B.x + u * B.w - F.x) / F.w, (B.y + v * B.h - F.y) / F.h] : [u, v];
}
/** 没有场景时的三块已探索区（玩家附近 + 前两个节点附近，按节点 uv 写）换到遮罩 uv */
const fogBlobs = (): [number, number, number, number][] => FOG_BLOBS.map(([u, v, rr, seed]) => [...bandUV(u, v), rr, seed]);
/** 这一屏画的未探索遮罩（mapBase 记下：遮罩铺的矩形、画法、撕边、探索格），地名据此不写在遮住的地方（审查修复 A · D14）；每遍构图清空 */
let FOG_AT: { a: Rect; torn: boolean; map: { explored: Uint8Array; en: number } | null; trail: FogTrail | null } | null = null;
/** 揭雾的足迹（M12b-66 ①）：已访问 / 当前节点的 uv、节点之间已走的路线（uv 线段）、半径（占地图短边的比例） */
interface FogTrail { pts: [number, number][]; segs: [number, number, number, number][]; r: number }
/** 点到线段的距离（uv） */
const segDist = (u: number, v: number, [x0, y0, x1, y1]: [number, number, number, number]) => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((u - x0) * dx + (v - y0) * dy) / L)) : 0;
  return Math.hypot(u - x0 - t * dx, v - y0 - t * dy);
};
/** 屏幕点 (x, y) 在不在未探索遮罩下面（与 fogCanvas 同一套形状：场景的探索格 / 没有场景时的三块已探索区，再加已访问节点与路线，M12b-66） */
function fogged(x: number, y: number): boolean {
  const f = FOG_AT;
  if (!f || f.a.w <= 0 || f.a.h <= 0) return false;
  const u = (x - f.a.x) / f.a.w, v = (y - f.a.y) / f.a.h;
  if (u < 0 || v < 0 || u > 1 || v > 1) return false;
  if (f.trail) {
    const { pts, segs, r } = f.trail;
    if (pts.some(([pu, pv]) => Math.hypot(u - pu, v - pv) < r) || segs.some((s) => segDist(u, v, s) < r * 0.45)) return false;
  }
  if (f.map) {
    const n = f.map.en, i = Math.floor(u * n), j = Math.floor(v * n);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < n && jj < n && f.map.explored[jj * n + ii]) return false; }
    return true;
  }
  for (const [cu, cv, rr, seed] of fogBlobs()) {
    const du = u - cu, dv = v - cv, th = Math.atan2(dv, du);
    const q = rr * (1 + 0.16 * Math.sin(5 * th + seed) + 0.08 * Math.sin(11 * th + seed * 2) + (f.torn ? 0.07 * Math.sin(29 * th + seed) : 0));
    if (Math.hypot(du, dv) < q) return false;
  }
  return true;
}
/** 没有场景时的三块已探索区（u, v, 半径, 噪声种子） */
const FOG_BLOBS: [number, number, number, number][] = [[0.32, 0.5, 0.3, 1], [0.2, 0.3, 0.12, 2], [0.35, 0.62, 0.12, 3]];
/** 世界地图出血（lay.mapBleed，M12a-30）：on / off；auto = cmp.modal = floating 且 lay.container = fullscreen（Elden / FH5 / Ghost 的整屏地图）时开 */
function mapBleedOn(r: Theme['r']): boolean {
  const v = r.str('lay.mapBleed', 'auto');
  if (v === 'on') return true;
  if (v === 'off') return false;
  return r.str('cmp.modal', 'standard') === 'floating' && r.str('lay.container', 'modal') === 'fullscreen';
}

/**
 * 地图界面底栏的高（M12a-30）：模板里有锚在下排的按键图例（el.prompt legend，锚点空间 inherit）时 = 图例高 + 14；只有平移提示（显式 lay.overflow = pan、分页指示不是 none）时 = 一行小字；都没有 0
 */
function mapStrip(e: ElCtx, d: DrawCtx, th: Theme, R: Rect): number {
  const r = e.r, S = (n: number) => n * e.k;
  if (r.elements().includes('el.prompt') && formsOf(r, 'el.prompt').includes('legend') && anchorSpaceOf(r, 'el.prompt') === 'inherit') {
    const p = elementParts(r, 'el.prompt').find((q) => (q.form ?? 'legend') === 'legend');
    if (p && ['bl', 'bc', 'br'].includes(p.anchor)) return ELEMENTS.get('el.prompt')!.size(makeCtx('el.prompt', d.ctx, d.t ?? d.ctx, th, R, p.form)).h + S(14);
  }
  if (r.str('lay.overflow', '') === 'pan' && postSkinKey(e, 'lay.overflow') && r.str('lay.pageIndicator', '') !== 'none' && r.str('lay.panHint', 'auto') !== 'none') return LH(e, e.small) + S(8);
  return 0;
}

/** 出血地图上的 scrim（M12a-30）：顶上一条（有页头时）、底下一条（有图例 / 平移提示时），从半透明深色渐隐到透明；字的可读辅助（typ.legibility）照常 */
function bleedScrims(e: ElCtx, R: Rect, top: boolean, bottom: boolean) {
  const g = e.g, S = (n: number) => n * e.k;
  for (const [on, y0, y1] of [[top, R.y, R.y + S(84)], [bottom, R.y + R.h, R.y + R.h - S(64)]] as [boolean, number, number][]) {
    if (!on) continue;
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(R.x, Math.min(y0, y1), R.w, Math.abs(y1 - y0));
  }
}

/**
 * 地图的取色（M12a-30）：col.source = skin（皮肤之后的层 / 新皮肤的值）或给了 vis.mapInk 时 → 底色 = col.surface、墨色 = vis.mapInk 或 col.accent2；否则 undefined（画风写死的色表）。
 * 纸面画风（frostSketch / pencil，R4 C4，frostpunk#51）：纸色是画风本身，col.source = skin 不换（原来换成面板底色 + 第二强调色——frostpunk 的近黑底上画红排线）；
 * 给了 vis.mapInk 时只换线色，纸色照旧
 */
function mapColors(e: ElCtx, style: string): MapColors | undefined {
  const r = e.r, ink = r.str('vis.mapInk', 'auto');
  const inkOn = !!ink && ink !== 'auto';
  if (mapPaper(style)) return inkOn ? { bg: MAP_STYLE[styleBase(style)].bg, ink: resolveColor(ink, e.pal) } : undefined;
  const skin = r.str('col.source', 'scene') === 'skin' && (!e.th.legacy || chosen(e, 'col.source'));
  if (!skin && !inkOn) return undefined;
  return { bg: resolveColor(e.th.surface, e.pal), ink: inkOn ? resolveColor(ink, e.pal) : e.accent2 };
}

/**
 * 打开的是透明的世界地图（R4 审查修复 ③⑰，hollow-knight#27）：数据是地图（spatial）、不铺底色的画风（chalk / glowSilhouette，world.ts mapClear）+ 未探索区虚线出口
 * （vis.mapUnexplored = dashedExits）——mapBase 把未探索区从地图上抠掉（R4 C4），垫底的局内 HUD 从地图窗里透出来。这时垫底那一遍不画小地图（layers.ts underlayIds）：
 * 世界地图开着时小地图本来就是重复的，原来要复刻写 el.minimap.underlay = hide 才不压在地图中间。只看全局的 vis.mapStyle（模板的地图读的就是它；按目标写给小地图的不算）
 */
export function clearMapOpen(th: Theme): boolean {
  const r = th.r;
  if (!(wantsTemplate(th) || overlayBody(th)) || dataShapeOf(r) !== 'spatial' || r.str('vis.mapUnexplored', 'fog') !== 'dashedExits') return false;
  return mapClear(r.str('rel.semanticZoom', 'none') === 'chart' ? 'chart' : r.str('vis.mapStyle', 'auto'));
}

/**
 * 地图本体（M12a-30）：手绘底图（vis.mapStyle = painted / parchment 的位图）→ 场景按需烘焙（worldNow().bake：按 a 的尺寸 × 设备像素比、上限 1024，画风 + 取色，缓存）
 * → 160 的小地图烘焙图 → 灰盒；再盖未探索遮罩。full = 出血（铺满整屏，不裁剪）；否则按皮肤面板外形裁剪（mapClip）
 */
function mapBase(e: ElCtx, a: Rect, full: boolean) {
  const g = e.g, r = e.r, w = worldNow(), map = w?.map;
  g.save();
  if (!full) { g.beginPath(); mapClip(e, a); g.clip(); }
  // 画风（M12b-25 mapStyleOf：rel.semanticZoom = chart 时切类别色块；chart / hexChart 的画风串带类别色）；原来的取值调用逐字不变
  const ms = mapStyleOf(e), style0 = ms.style === 'chart' && r.str('rel.semanticZoom', 'none') === 'chart' ? 'chart' : r.str('vis.mapStyle', 'auto');
  const painted = smooth(g, () => drawImageFit(g, mapAsset(style0), a, 'cover'));
  const un = r.str('vis.mapUnexplored', 'fog');
  let cut: MapCut | null = null;
  if (!painted) {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    // 尺寸按 128 取整（拖动窗口时不每一帧都重烘一张）
    const px = Math.max(256, Math.min(1024, Math.ceil((Math.max(a.w, a.h) * (e.th.unitK || 1) * dpr) / 128) * 128));
    const cv = w?.bake ? w.bake(ms.key, px, mapColors(e, ms.key)) : map?.canvas;
    if (cv) {
      const s = Math.max(a.w, a.h), x = a.x + (a.w - s) / 2, y = a.y + (a.h - s) / 2;
      // 不铺底色的画风（chalk / glowSilhouette）+ 虚线出口（R4 C4，hollow-knight#27）：未探索区从地图上抠掉、露出地图下面的东西（浮动弹窗时是压暗的场景），
      // 不再盖一块面板底色——原来 col.surface 是黑色时整块地图区成了不透明的黑矩形，只剩走过的一小块
      if (un === 'dashedExits' && mapClear(ms.key)) cut = { cv, x, y, s };
      else { g.imageSmoothingEnabled = true; g.drawImage(cv, x, y, s, s); }
    } else drawGreybox(g, a, '世界地图（场景烘焙）', { opaque: true });
  }
  fogMask(e, a, un, painted, cut);
  g.restore();
}

/** 要按未探索遮罩抠掉的地图（烘焙图与它铺的正方形） */
interface MapCut { cv: HTMLCanvasElement; x: number; y: number; s: number }
/** 抠好的地图（最多 2 张，A / B 两侧）：键 = 烘焙图 + 遮罩画布（按对象编号）+ 遮罩在烘焙图上的位置 + 撕边 */
const CUTS = new Map<string, HTMLCanvasElement>();
const CUT_ID = new WeakMap<HTMLCanvasElement, number>();
let cutN = 0;
/**
 * 按未探索遮罩抠地图（R4 C4）：烘焙图拷进一张同尺寸的画布，遮罩（不透明 = 未探索）按 destination-out 擦掉，只剩走过的地方。
 * 只在烘焙图 / 遮罩 / 位置变了时重做；只量不画 / 没有 document 时 null（这一遍什么都不画）
 */
function cutMap(g: CanvasRenderingContext2D, m: MapCut, fog: HTMLCanvasElement, a: Rect, torn: boolean): HTMLCanvasElement | null {
  if ((g as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || typeof document === 'undefined') return null;
  const id = (c: HTMLCanvasElement) => { let n = CUT_ID.get(c); if (n === undefined) { n = ++cutN; CUT_ID.set(c, n); } return n; };
  const W = m.cv.width, H = m.cv.height, k = W / Math.max(1e-6, m.s), fx = (a.x - m.x) * k, fy = (a.y - m.y) * k, fw = a.w * k, fh = a.h * k;
  const key = `${id(m.cv)}|${id(fog)}|${fx.toFixed(1)},${fy.toFixed(1)},${fw.toFixed(1)},${fh.toFixed(1)}|${torn ? 1 : 0}`, hit = CUTS.get(key);
  if (hit) return hit;
  let old: HTMLCanvasElement | undefined;
  if (CUTS.size >= 2) { const k0 = CUTS.keys().next().value!; old = CUTS.get(k0); CUTS.delete(k0); }
  const cv = old ?? document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
  c.drawImage(m.cv, 0, 0);
  c.globalCompositeOperation = 'destination-out'; c.imageSmoothingEnabled = !torn;
  c.drawImage(fog, fx, fy, fw, fh);
  c.globalCompositeOperation = 'source-over';
  // 遮罩框以外（地图的正方形比地图窗多出来的两条，本来就被 mapClip 裁掉）一并擦掉：遮罩边缘那一行只擦了一部分，裁剪边落在小数上时会露一条细线
  const x0 = Math.max(0, Math.ceil(fx)), y0 = Math.max(0, Math.ceil(fy)), x1 = Math.min(W, Math.floor(fx + fw)), y1 = Math.min(H, Math.floor(fy + fh));
  c.clearRect(0, 0, W, y0); c.clearRect(0, y1, W, H - y1); c.clearRect(0, y0, x0, y1 - y0); c.clearRect(x1, y0, W - x1, y1 - y0);
  CUTS.set(key, cv);
  return cv;
}

/**
 * 未探索遮罩（vis.mapUnexplored，M12a-30）：遮罩 = 已探索的地方（场景的探索格：玩家走过的路，每格按哈希抖一点大小与位置；没有场景时用玩家附近一大块 + 地图节点附近几小块，
 * 边缘按确定的噪声起伏）以外的部分。dark = 纯黑、fog = 云雾（手绘底图上用纸色）、blank = 纸面留白、outlineOnly = 面板色薄罩；遮罩外不再露底图。
 * vis.edge = torn 时边缘不平滑（撕边）。原来是右侧 45% 一条线性渐变，左右两缘露出底图
 */
function fogMask(e: ElCtx, a: Rect, un: string, painted: boolean, cut: MapCut | null = null) {
  if (un === 'reveal') return;
  const g = e.g;
  // 雾色（col.fog，M12b-66 ①）：auto = 原来的（纯黑 / 云雾 / 纸面 / 面板色薄罩）；给了颜色时用它（frostpunk#46：雾与羊皮纸同色）
  const fogV = e.r.str('col.fog', 'auto'), fogC = fogV && fogV !== 'auto' && (!e.th.legacy || chosen(e, 'col.fog')) ? resolveColor(fogV, e.pal) : null;
  // M12b-25 的三个新取值：cloudSwirl = 卷云纹（雾色上盖一层卷云母题，ghost-of-tsushima#3）；dashedExits = 未探索区盖成地图底色（出口画成虚线短桩，见 mapView）；
  // unpainted = 未上色的底稿（地图本体照画，遮罩下面去色、压成灰调，elden-ring#34）
  const color = fogC ?? (un === 'dark' ? '#000' : un === 'blank' ? '#efe6cf' : un === 'outlineOnly' ? withAlpha(resolveColor(e.th.surface, e.pal), 0.6) : un === 'dashedExits' ? withAlpha(resolveColor(e.th.surface, e.pal), 0.96)
    : un === 'cloudSwirl' ? (painted ? 'rgba(222,212,186,0.97)' : 'rgba(198,198,192,0.96)') : un === 'unpainted' ? '#b9b1a0' : painted ? 'rgba(226,212,178,0.93)' : 'rgba(225,230,238,0.92)');
  const torn = e.v.str('vis.edge', '') === 'torn';
  const map = e.noWorld ? null : worldNow()?.map;
  const trail = fogTrail(e);
  // （遮罩画布先取好再 save：没选新取值时调用序列与原来逐字一样）。抠地图时取不透明的一张（整块擦干净）
  const cv = fogCanvas(cut ? '#000' : color, torn, map ?? null, trail), gray = un === 'unpainted' ? fogCanvas('#808080', torn, map ?? null, trail) : null;
  FOG_AT = { a, torn, map: map ?? null, trail };
  // 抠地图（R4 C4，见 mapBase）：遮罩不画，用它的形状把地图的未探索区擦掉再画地图
  if (cut) {
    const m = cutMap(g, cut, cv, a, torn);
    if (m) { g.save(); g.imageSmoothingEnabled = true; g.drawImage(m, cut.x, cut.y, cut.s, cut.s); g.restore(); }
    return;
  }
  g.save();
  g.imageSmoothingEnabled = !torn;
  if (gray) {
    // 底稿：遮罩形状先按「饱和度」合成一层中灰（下面的颜色去饱和），再正片叠底一层暖灰（压暗成未上色的底稿）
    g.globalCompositeOperation = 'saturation'; g.drawImage(gray, a.x, a.y, a.w, a.h);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha *= 0.85;
  }
  // 卷云纹（B10 审查修复 ⑬）：遮罩的软边照旧用低分辨率小画布，卷云按设备分辨率、等比例画在它上面（swirlFog）——原来画进 192 的遮罩画布再拉伸到地图，螺线糊成横向压扁的一团
  const sw = un === 'cloudSwirl' ? swirlFog(g, a, cv, color, torn) : null;
  g.drawImage(sw ?? cv, a.x, a.y, a.w, a.h);
  g.restore();
}

/** 卷云遮罩的设备分辨率画布（最多 2 张，复用最旧的）：键 = 遮罩画布（按对象编号）+ 尺寸 + 颜色 + 撕边 */
const SWF = new Map<string, HTMLCanvasElement>();
const SWF_ID = new WeakMap<HTMLCanvasElement, number>();
let swfN = 0;
/**
 * 卷云遮罩（vis.mapUnexplored = cloudSwirl）：一张设备像素的画布（上限 2.2M 像素，超了等比例降），先把低分辨率遮罩平滑放大铺满（软边），再用 source-atop 把卷云画在遮罩上
 * （只落在遮罩不透明的地方）。只在遮罩 / 尺寸变了时重画；只量不画 / 没有 document 时 null（退回只画遮罩）
 */
function swirlFog(g: CanvasRenderingContext2D, a: Rect, mask: HTMLCanvasElement, color: string, torn: boolean): HTMLCanvasElement | null {
  if ((g as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || typeof document === 'undefined') return null;
  const m = g.getTransform(), sc = Math.max(0.25, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1);
  const W0 = a.w * sc, H0 = a.h * sc, f = Math.min(1, Math.sqrt(2_200_000 / Math.max(1, W0 * H0)));
  const W = Math.max(1, Math.min(4096, Math.round(W0 * f))), H = Math.max(1, Math.min(4096, Math.round(H0 * f)));
  let id = SWF_ID.get(mask);
  if (id === undefined) { id = ++swfN; SWF_ID.set(mask, id); }
  const key = `${id}|${W}x${H}|${color}|${torn ? 1 : 0}`, hit = SWF.get(key);
  if (hit) return hit;
  let old: HTMLCanvasElement | undefined;
  if (SWF.size >= 2) { const k0 = SWF.keys().next().value!; old = SWF.get(k0); SWF.delete(k0); }
  const cv = old ?? document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
  c.imageSmoothingEnabled = !torn; c.drawImage(mask, 0, 0, W, H);
  c.globalCompositeOperation = 'source-atop';
  swirls(c, W, H, color.startsWith('rgba') ? `rgb(${color.slice(5).split(',').slice(0, 3).join(',')})` : color);
  c.globalCompositeOperation = 'source-over';
  SWF.set(key, cv);
  return cv;
}

/**
 * 卷云纹（vis.mapUnexplored = cloudSwirl）：W × H 的设备像素画布上按等距网格错开撒卷云（格距 = 短边 / 4.5，每格一朵，不随画幅压扁）——一道亮色的阿基米德螺线 + 一道暗一点的影线，
 * 种子固定（每帧一样）
 */
function swirls(c: CanvasRenderingContext2D, W: number, H: number, color: string) {
  const hash = (i: number) => { let x = (i + 7) * 2654435761; x ^= x >>> 13; x = Math.imul(x, 1274126177); return ((x >>> 0) % 1000) / 1000; };
  const step = Math.min(W, H) / 4.5, lw = Math.max(1.5, step / 26), cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // 影线一条路径、亮线一条路径（两次描边画完整屏）
  for (const [off, col, w] of [[lw * 0.9, mix(color, '#000', 0.22), lw * 1.1], [0, mix(color, '#fff', 0.55), lw]] as [number, string, number][]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * 97 + i, cx = (i + (j % 2) * 0.5 + (hash(k) - 0.5) * 0.4) * step, cy = (j + (hash(k + 50) - 0.5) * 0.4) * step, r = step * (0.32 + 0.14 * hash(k + 99)), dir = hash(k + 3) > 0.5 ? 1 : -1;
      for (let t = 0; t <= 36; t++) { const a = (t / 36) * Math.PI * 3.2 * dir, rr = r * (1 - t / 44); const x = cx + Math.cos(a) * rr + off, y = cy + Math.sin(a) * rr * 0.8 + off; if (t) c.lineTo(x, y); else c.moveTo(x, y); }
    }
    c.stroke();
  }
  c.restore();
}

/**
 * 遮罩的 96 × 96 小画布（审查修复 A · L8）：按（颜色、撕边、探索格的内容 / 没有场景）缓存，只在这些变了时重画——原来每帧新建一张画布、填最多 1024 块。
 * 探索格是引擎原地改的 Uint8Array（同一个对象），所以按内容算一个哈希（1024 次加法，比重画便宜得多）；最多留 4 张（A / B 两侧 × 换画风）
 */
const FOG = new Map<string, HTMLCanvasElement>();
function fogCanvas(color: string, torn: boolean, map: { explored: Uint8Array; en: number } | null, trail: FogTrail | null = null): HTMLCanvasElement {
  let h = 0;
  if (map) { for (let i = 0; i < map.explored.length; i++) if (map.explored[i]) h = (Math.imul(h, 31) + i + 1) | 0; }
  const key = `${color}|${torn ? 1 : 0}|${map ? `${map.en}:${map.explored.length}:${h}` : `-${MAP_BAND && MAP_FULL ? `:${fogBlobs().map((b) => `${b[0].toFixed(3)},${b[1].toFixed(3)}`).join(';')}` : ''}`}|${trail ? `${trail.r}:${trail.pts.map((p) => p.map((x) => x.toFixed(3)).join(',')).join(';')}` : '-'}`;
  const hit = FOG.get(key);
  if (hit) { FOG.delete(key); FOG.set(key, hit); return hit; }
  // （卷云纹不再画进这张小画布：按设备分辨率画在上面，见 swirlFog）
  // 有场景（探索格）时 192 见方（R4 C4：圆斑要几个像素才圆，放大到整屏后边缘的软过渡也窄一半）；没有场景时照原来 96
  const M = map ? 192 : 96;
  const cv = document.createElement('canvas'); cv.width = cv.height = M;
  const c = cv.getContext('2d')!;
  c.fillStyle = color; c.fillRect(0, 0, M, M);
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  const hash = (i: number) => { let x = (i + 1) * 2654435761; x ^= x >>> 13; x = Math.imul(x, 1274126177); return ((x >>> 0) % 1000) / 1000; };
  if (map) {
    // 场景的探索格（32 × 32，玩家走过的格子一圈）：每格一块圆斑，按哈希放大 / 错开一点，放大到遮罩时双线性插值得到不规则的软边。
    // R4 C4（ghost-of-tsushima#31）：原来每格一个方块，放大到整屏后揭开的边一格一格成台阶；圆斑的并集边是圆滑的起伏，一条路径一次填。
    // R4 审查修复 ⑦：半径 = 0.6 × 原来方块的边长（C4 取 0.7 ≈ 方块的外接圆，每块大 54%、揭开的边整体往外扩 0.2–0.3 格）——按 32 × 32 探索格在 192 的遮罩上量：
    //   0.6 时一片 6 格半径的探索区揭开的面积是方块的 1.02 倍、2 格宽的走廊 1.045 倍（边只外扩约 0.05 格），全探索区里漏掉的小孔 126 像素（原来的方块 277、0.7 是 0、内切圆 0.5 是 1558）
    const n = map.en, k = M / n;
    c.beginPath();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (map.explored[j * n + i]) {
      const q = hash(j * n + i), rr = k * (1.1 + 0.5 * q) * 0.6, x = (i + 0.5) * k + (q - 0.5) * k * 0.6, y = (j + 0.5) * k + (hash(i * 7 + j) - 0.5) * k * 0.6;
      c.moveTo(x + rr, y); c.arc(x, y, rr, 0, Math.PI * 2);
    }
    c.fill();
  } else {
    // 没有场景：玩家附近一大块 + 前两个地图节点附近（走过的地方）
    for (const [u, v, rr, seed] of fogBlobs()) {
      c.beginPath();
      for (let t = 0; t <= 48; t++) { const th = (t / 48) * Math.PI * 2, q = rr * (1 + 0.16 * Math.sin(5 * th + seed) + 0.08 * Math.sin(11 * th + seed * 2) + (torn ? 0.07 * Math.sin(29 * th + seed) : 0)); c.lineTo((u + Math.cos(th) * q) * M, (v + Math.sin(th) * q) * M); }
      c.closePath(); c.fill();
    }
  }
  // 已访问 / 当前节点与已走路线（M12b-66 ①，frostpunk#46、ghost-of-tsushima#30：原来只揭开当前位置附近一小块，走过的节点和路线埋在雾里）：
  // 每个节点一块（半径 vis.mapRevealRadius，边缘同样按噪声起伏），节点之间沿路线一条宽 0.9 × 半径的带
  if (trail) {
    trail.pts.forEach(([u, v], k) => {
      c.beginPath();
      for (let t = 0; t <= 40; t++) { const th = (t / 40) * Math.PI * 2, q = trail.r * (1 + 0.14 * Math.sin(5 * th + k + 7) + (torn ? 0.07 * Math.sin(29 * th + k) : 0)); c.lineTo((u + Math.cos(th) * q) * M, (v + Math.sin(th) * q) * M); }
      c.closePath(); c.fill();
    });
    c.lineCap = 'round'; c.lineWidth = trail.r * 0.9 * M; c.strokeStyle = '#000';
    for (const [x0, y0, x1, y1] of trail.segs) { c.beginPath(); c.moveTo(x0 * M, y0 * M); c.lineTo(x1 * M, y1 * M); c.stroke(); }
  }
  if (FOG.size >= 4) FOG.delete(FOG.keys().next().value!);
  FOG.set(key, cv);
  return cv;
}

/** 地图节点的 uv（mapView 与揭雾共用）：没给 cnt.itemCount 时原来的三个位置，给了按泊松盘 */
function mapNodeUV(e: ElCtx): [number, number][] {
  const n = itemCountOr(e, 3), legacy = !itemCountSet(e) && n === 3;
  return legacy ? MAP_NODES3 : poissonPoints(n);
}
/**
 * 揭雾的足迹（M12b-66 ①）：已访问（完成）与当前节点（cnt.progress，没给时前两个完成、第三个当前）、按序号相邻的已访问节点之间的路线；
 * 半径 vis.mapRevealRadius（0.05–0.4，没给时 0.12 = 原来没有场景时节点附近那两小块）。旧皮肤只在皮肤之后选了 vis.mapUnexplored / mapRevealRadius 时才有（对照图不变）
 */
function fogTrail(e: ElCtx): FogTrail | null {
  if (e.th.legacy && !chosen(e, 'vis.mapUnexplored') && !chosen(e, 'vis.mapRevealRadius')) return null;
  const rv = e.r.str('vis.mapRevealRadius', 'auto'), rn = Number(rv), r = rv !== 'auto' && Number.isFinite(rn) ? Math.max(0.05, Math.min(0.4, rn)) : 0.12;
  // 节点 uv 换到遮罩 uv（出血地图上节点排在 MAP_BAND 那一条里、遮罩铺整屏，B10 审查修复 ⑪）
  const uv = mapNodeUV(e).map(([u, v]) => bandUV(u, v)), vis = uv.map((_, i) => progressState(e, i, 2) !== 'locked');
  const pts = uv.filter((_, i) => vis[i]);
  const segs: [number, number, number, number][] = [];
  for (let i = 0; i + 1 < uv.length; i++) if (vis[i] && vis[i + 1]) segs.push([uv[i][0], uv[i][1], uv[i + 1][0], uv[i + 1][1]]);
  return pts.length ? { pts, segs, r } : null;
}

/**
 * 地图节点的固定撒点（M12a-30）：确定种子的泊松盘（最小间距 ≈ 0.75 × √(面积 / n)，试 40n 次），坐标 0~1。
 * 审查修复 A · L12：在固定的参考框（16:10）里撒一次、按 n 缓存（n ≤ MAX_ITEMS，缓存天然有界），映射进地图矩形——原来按画幅比例撒、键带比例，
 * 拖动窗口 / 换容器时画幅差 0.01 节点就全部换位置，缓存也不清
 */
const POISSON = new Map<number, [number, number][]>();
const POISSON_ASPECT = 1.6;
function poissonPoints(n: number): [number, number][] {
  const hit = POISSON.get(n);
  if (hit) return hit;
  let s = 0x9e3779b9 ^ n;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const W0 = POISSON_ASPECT, area = W0 * 0.8 * 0.8, dmin = 0.75 * Math.sqrt(area / Math.max(1, n));
  const pts: [number, number][] = [];
  for (let tries = 0; pts.length < n && tries < n * 40; tries++) {
    const x = 0.1 * W0 + rnd() * 0.8 * W0, y = 0.1 + rnd() * 0.8;
    if (pts.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 >= dmin * dmin) || tries > n * 30) pts.push([x, y]);
  }
  const out = pts.map(([x, y]) => [x / W0, y] as [number, number]);
  POISSON.set(n, out);
  return out;
}

/** 原来写死的三个节点位置（没给 cnt.itemCount 时保留，默认画面不变） */
const MAP_NODES3: [number, number][] = [[0.2, 0.3], [0.35, 0.62], [0.5, 0.4]];

/**
 * 世界地图（cnt.dataShape = spatial）。M12a-30：地图本体见 mapBase（出血时已经在 drawScreen 里铺满整屏，这里只画节点与地名）；
 * 节点数 = cnt.itemCount（没给时原来的 3 个、原来的位置；给了按泊松盘撒点），走 drawNode，col.coding 含 lineId 时按类型轮流着色（强调 / 第二强调 / 好 / 警告色）；
 * rel.semanticZoom = iconize / heatmap 时挨得太近的节点聚成一个簇标记 + 数字。地名 vis.mapLabels：plate = 小标牌（cmp.plate@mapLabel，没选 = 胶囊）、
 * onMap = 标题字体直接写在地形上 + 阴影、hover = 只给当前节点标、none = 不标；地名取内容包 world.places（带 uv，world.region 是第一个），原来左上写死一枚地名胶囊
 */
function mapView(e: ElCtx, a0: Rect, bled = false) {
  const S = (n: number) => n * e.k, r = e.r;
  if (!bled) mapBase(e, a0, false);
  // 出血地图的坐标（B1 · 66 顺延、M12b-25 做）：地图与揭雾遮罩铺在整屏——原来节点排在数据区，与遮罩的 uv 对不上；B10 审查修复 ⑪：节点 / 地名 / 路线排在
  // 整屏宽、页头与底栏之间的那一条（MAP_BAND），遮罩按同一换算揭开（整屏排时撒点压到了页头、页签和底部图例下面）
  const a = bled && MAP_FULL ? MAP_BAND ?? MAP_FULL : a0;
  const node = r.str('cmp.node', 'pin');
  const uv = mapNodeUV(e);
  const lineId = r.list('col.coding').includes('lineId') && (!e.th.legacy || postSkinKey(e, 'col.coding'));
  const typeColors = [e.accent, e.accent2, e.good, e.warn];
  const pts = uv.map(([u, v], i) => ({ x: a.x + a.w * u, y: a.y + a.h * v, i }));
  // 房间状态色（vis.mapRoomStates，M12b-25，fam.survival-horror：生化危机式地图）：走过的房间清空 = 蓝、还有东西 = 红（每三个走过的里一个），没去过 = 锁定色
  const rooms = pickedStr(e, 'vis.mapRoomStates', 'none') === 'states';
  // 路线（vis.mapRoute，M12b-25，frostpunk#41）：按序号把节点连成路线——走过的一段实线、当前到下一个虚线；lay.currentMarker = avatar 时头像挂在这段路线的中点上（侦察队沿路线走）
  const route = pickedStr(e, 'vis.mapRoute', 'none'), mk = route !== 'none' ? pickedStr(e.part('node'), 'lay.currentMarker', 'none') : 'none';
  // 路线上的标记在节点画完之后再画（R4 C2 ⑩，frostpunk#52：当前节点是路线最后一个时标记挂在它中心、被随后画的当前节点整个盖住）
  const routeMark = route !== 'none' ? mapRoute(e, pts, route, mk) : null;
  const nodeBox = new Map<number, Rect>();
  // 聚簇（rel.semanticZoom = iconize / heatmap）：两点距离小于节点直径 1.1 倍的并成一簇（贪心，n 小时 O(n²)）
  const zoom = r.str('rel.semanticZoom', 'none'), rad = Math.max(S(16), tap(e) / 2);
  const groups: (typeof pts)[] = [];
  if ((zoom === 'iconize' || zoom === 'heatmap') && pts.length > 1) {
    const used = new Set<number>();
    for (const p of pts) { if (used.has(p.i)) continue; const gr = pts.filter((q) => !used.has(q.i) && Math.hypot(q.x - p.x, q.y - p.y) < rad * 2.2); gr.forEach((q) => used.add(q.i)); groups.push(gr); }
  } else for (const p of pts) groups.push([p]);
  for (const gr of groups) {
    if (gr.length > 1) { const cx = gr.reduce((s, q) => s + q.x, 0) / gr.length, cy = gr.reduce((s, q) => s + q.y, 0) / gr.length; clusterMark(e, cx, cy, gr.length, rad); ITEMS.push({ x: cx - rad * 1.1, y: cy - rad * 1.1, w: rad * 2.2, h: rad * 2.2 }); continue; }
    const p = gr[0];
    // 未探索区里的节点（M12b-66 ①，dont-starve#39、elden-ring#48）：揭雾足迹开着时，遮罩下面的节点不画（vis.mapUnexplored = outlineOnly 时淡画）
    // （M12b-25：出血地图的节点也按整屏排了，与遮罩对得上，一样藏）
    const hidden = !!FOG_AT?.trail && fogged(p.x, p.y), un = r.str('vis.mapUnexplored', 'fog');
    if (hidden && un !== 'outlineOnly') continue;
    if (hidden) { e.g.save(); e.g.globalAlpha *= 0.35; }
    const st = progressState(e, p.i, 2), room = rooms && st === 'done' ? { color: p.i % 3 === 1 ? '#d64545' : '#4a90d9' } : {};
    nodeBox.set(p.i, nodeAt(e, p.x, p.y, { kind: node, i: p.i, state: st, ...(lineId ? { color: typeColors[p.i % typeColors.length] } : {}), ...room, ...nodeData(e, p.i % typeColors.length, node, 'map'), ...(mk !== 'none' ? { noMarker: true } : {}) }));
    if (hidden) e.g.restore();
  }
  routeMark?.(nodeBox);
  // 未探索的出口（vis.mapUnexplored = dashedExits，M12b-25，hollow-knight#28）：走过的节点朝没去过的相邻节点伸出一截虚线短桩（四成长）
  if (r.str('vis.mapUnexplored', 'fog') === 'dashedExits' && FOG_AT?.trail) dashedExits(e, pts);
  mapLabels(e, a, pts);
  // 地图部件（M12b-25）：楼层列表（vis.mapFloors，control#12）、罗盘玫瑰 / 比例尺 / 图例（vis.mapFurniture，K1 制图学）——排在数据区里（出血时页头之下）
  mapFloors(e, a0);
  mapFurniture(e, a0);
}

/**
 * 地图上的路线（vis.mapRoute）：按序号连节点，走过的（两端都不是锁定）实线、当前 → 下一个虚线；mk = lay.currentMarker 时标记挂在当前 → 下一个的中点。
 * 返回画标记的一步（调用方画完节点再调，标记压在节点上面；当前节点后面没有下一个时挂在当前节点外接框的上沿，与节点自己的标记同位）；没有标记时 null
 */
function mapRoute(e: ElCtx, pts: { x: number; y: number; i: number }[], kind: string, mk: string): ((boxes: Map<number, Rect>) => void) | null {
  const g = e.g, S = (n: number) => n * e.k, lw = Math.max(1.5, S(2));
  // 纸面画风（frostSketch / pencil，R4 审查修复 ⑩，frostpunk#52）：纸是浅色的（C4 之后不跟皮肤），浅色字色的路线在冷灰纸上对比约 1.1、看不见——
  // 线芯换成画风的墨色（vis.mapInk 写了用它），外面垫一圈原来的浅色描边（压在雾上那段照样看得见）；其余画风照原来一道字色
  const ms = mapStyleOf(e), ink0 = e.r.str('vis.mapInk', 'auto');
  const core = mapPaper(ms.key) ? (ink0 && ink0 !== 'auto' ? resolveColor(ink0, e.pal) : MAP_STYLE[styleBase(ms.key)].ink) : null;
  g.save(); g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = lw; g.lineCap = 'round';
  let cur = -1;
  for (let k = 0; k + 1 < pts.length; k++) {
    const s0 = progressState(e, pts[k].i, 2), s1 = progressState(e, pts[k + 1].i, 2);
    if (s0 === 'locked') break;
    if (s0 === 'current') cur = k;
    g.setLineDash(s1 === 'locked' || kind === 'dashed' ? [S(6), S(5)] : []);
    if (core) { g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = lw + S(2); }
    g.beginPath(); g.moveTo(pts[k].x, pts[k].y); g.lineTo(pts[k + 1].x, pts[k + 1].y); g.stroke();
    if (core) { g.strokeStyle = core; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[k].x, pts[k].y); g.lineTo(pts[k + 1].x, pts[k + 1].y); g.stroke(); }
    if (s1 === 'locked') break;
  }
  g.setLineDash([]); g.restore();
  if (cur < 0) cur = pts.findIndex((p) => progressState(e, p.i, 2) === 'current');
  if (cur < 0 || mk === 'none') return null;
  const p = pts[cur], q = pts[cur + 1], rr = Math.max(S(9), tap(e) * 0.3);
  return (boxes) => {
    const nb = q ? null : boxes.get(p.i), x = q ? (p.x + q.x) / 2 : p.x, top = q ? (p.y + q.y) / 2 - rr * 0.2 : nb ? nb.y : p.y - rr * 0.2;
    currentMarker(e.part('node'), x, top, rr, mk);
    ITEMS.push({ x: x - rr, y: top - rr * 2.4, w: rr * 2, h: rr * 2.6 });
  };
}

/** 未探索的出口虚线（dashedExits）：每个看得见的节点朝序号相邻、在遮罩下面的节点伸一截虚线 */
function dashedExits(e: ElCtx, pts: { x: number; y: number; i: number }[]) {
  const g = e.g, S = (n: number) => n * e.k;
  g.save(); g.strokeStyle = withAlpha(e.text, 0.75); g.lineWidth = Math.max(1, S(1.8)); g.setLineDash([S(4), S(3)]);
  pts.forEach((p, k) => {
    if (fogged(p.x, p.y)) return;
    for (const q of [pts[k - 1], pts[k + 1]]) {
      if (!q || !fogged(q.x, q.y)) continue;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (q.x - p.x) * 0.4, p.y + (q.y - p.y) * 0.4); g.stroke();
    }
  });
  g.setLineDash([]); g.restore();
}

/** 楼层列表（vis.mapFloors = left / top，control#12）：样本 world.floors（没写时 B2 / B1 / 1F / 2F / 3F），当前层（world.floor，没写时 1F）白、其余灰，登记模板占位 */
function mapFloors(e: ElCtx, a: Rect) {
  const side = pickedStr(e, 'vis.mapFloors', 'none');
  if (side !== 'left' && side !== 'top') return;
  const S = (n: number) => n * e.k, w0 = pack().world, floors = w0.floors?.length ? w0.floors : ['3F', '2F', '1F', 'B1', 'B2'], cur = w0.floor ?? floors.indexOf('1F');
  const o = { ...e.small, weight: 800 }, lh = Math.max(S(22), LH(e, o)), cw = Math.max(...floors.map((f) => W(e, f, o))) + S(14);
  const x0 = a.x + S(10), y0 = a.y + S(10);
  floors.forEach((f, k) => {
    const x = side === 'left' ? x0 : x0 + k * (cw + S(4)), y = side === 'left' ? y0 + k * lh : y0, on = k === cur;
    if (on) { e.g.save(); e.g.fillStyle = e.text; e.g.fillRect(x, y + lh * 0.2, S(3), lh * 0.6); e.g.restore(); }
    T(e, f, x + S(8), y, lh, { ...o, color: on ? e.text : withAlpha(e.text, 0.4) });
  });
  const box = side === 'left' ? { x: x0, y: y0, w: cw, h: lh * floors.length } : { x: x0, y: y0, w: floors.length * (cw + S(4)), h: lh };
  frameOccupancy().add(box, { kind: 'template', prio: 2, sub: 'data' });
}

/**
 * 地图部件（vis.mapFurniture，M12b-25，K1 制图学 / 古海图的身份件）：compassRose 罗盘玫瑰（八芒、明暗两半，北写 N）在右上；scaleBar 黑白分段比例尺 + 「0 / 1 km」在左下；
 * legend 图例（M12b-26 的 legend 组件：地图节点的类型图标 + 名称，样本 mapFilters）在右下。色 = 饰色（col.ornament → 描边 → 字色）；都登记模板占位
 */
function mapFurniture(e: ElCtx, a: Rect) {
  const fu = chosenKey(e, 'vis.mapFurniture') ? r0List(e, 'vis.mapFurniture') : [];
  if (!fu.length) return;
  const g = e.g, S = (n: number) => n * e.k, ink = ornColor(e);
  if (fu.includes('compassRose')) {
    const R0 = Math.max(S(22), Math.min(a.w, a.h) * 0.07), cx = a.x + a.w - R0 - S(18), cy = a.y + R0 + S(26);
    g.save(); g.lineWidth = Math.max(1, S(1));
    for (let k = 0; k < 8; k++) {
      const t = -Math.PI / 2 + (k * Math.PI) / 4, L = k % 2 ? R0 * 0.62 : R0, w = R0 * (k % 2 ? 0.14 : 0.2);
      const tip = [cx + Math.cos(t) * L, cy + Math.sin(t) * L], l = [cx + Math.cos(t - Math.PI / 2) * w, cy + Math.sin(t - Math.PI / 2) * w], rr = [cx + Math.cos(t + Math.PI / 2) * w, cy + Math.sin(t + Math.PI / 2) * w];
      for (const [side, fillC] of [[l, ink], [rr, withAlpha(mix(ink, '#fff', 0.7), 0.95)]] as [number[], string][]) { g.fillStyle = fillC; g.beginPath(); g.moveTo(cx, cy); g.lineTo(side[0], side[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fill(); }
      g.strokeStyle = ink; g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(tip[0], tip[1]); g.lineTo(rr[0], rr[1]); g.stroke();
    }
    g.strokeStyle = withAlpha(ink, 0.7); g.beginPath(); g.arc(cx, cy, R0 * 0.78, 0, Math.PI * 2); g.stroke();
    g.restore();
    const no = { ...e.small, weight: 800, color: ink }, nw = W(e, 'N', no);
    T(e, 'N', cx - nw / 2, cy - R0 - LH(e, no), LH(e, no), no);
    frameOccupancy().add({ x: cx - R0, y: cy - R0 - LH(e, no), w: R0 * 2, h: R0 * 2 + LH(e, no) }, { kind: 'template', prio: 2, sub: 'data' });
  }
  if (fu.includes('scaleBar')) {
    const seg = Math.max(S(18), a.w * 0.035), h = Math.max(S(5), S(6)), x = a.x + S(18), y = a.y + a.h - S(30);
    g.save(); g.strokeStyle = ink; g.lineWidth = Math.max(1, S(1));
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? withAlpha(mix(ink, '#fff', 0.85), 0.95) : ink; g.fillRect(x + k * seg, y, seg, h); }
    g.strokeRect(x, y, seg * 4, h); g.restore();
    const so = { ...e.small, size: e.small.size * 0.9, color: ink };
    // 刻度数字走数字字形（B10 审查修复 ⑧：typ.numerals 选过时与其余模板数字一样换字形），单位 km 照旧写正文字
    drawNumber(e, '0', x - numberWidth(e, '0', so) / 2, y + h + S(1), LH(e, so), so);
    const n1 = '1', unit = ' km', w1 = numberWidth(e, n1, so), x1 = x + seg * 4 - (w1 + W(e, unit, so)) / 2;
    drawNumber(e, n1, x1, y + h + S(1), LH(e, so), so); T(e, unit, x1 + w1, y + h + S(1), LH(e, so), so);
    frameOccupancy().add({ x: x - S(4), y, w: seg * 4 + S(24), h: h + LH(e, so) + S(2) }, { kind: 'template', prio: 2, sub: 'data' });
  }
  if (fu.includes('legend')) {
    const mf = samplesFor('mapFilters');
    const items = mf.slice(0, 4).map((f, k) => ({ icon: f[0], label: plainText(f[1] ?? ''), color: [e.accent, e.accent2, e.good, e.warn][k % 4] }));
    const spec: LegendSpec = { title: pack().world.region ?? '', style: 'iconList', items };
    const sz = legendSize(e, spec), at = { x: a.x + a.w - sz.w - S(14), y: a.y + a.h - sz.h - S(14), w: sz.w, h: sz.h };
    frameOccupancy().add(legend(e, at, spec), { kind: 'template', prio: 2, sub: 'data' });
  }
}
/** 多选参数的取值（去掉 auto / none） */
const r0List = (e: ElCtx, k: string) => e.r.list(k).filter((x) => x && x !== 'auto' && x !== 'none');

/** 地图上的簇标记（M12a-30）：强调色圆 + 白圈 + 里面写成员数 */
function clusterMark(e: ElCtx, x: number, y: number, n: number, rad: number) {
  const g = e.g, rr = rad * 1.1;
  g.save(); g.fillStyle = e.accent; g.strokeStyle = withAlpha('#fff', 0.85); g.lineWidth = Math.max(1.5, rr * 0.12);
  g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
  const s = String(n), o = onAccent(e, { ...e.small, weight: 800, size: rr * 0.9 });
  T(e, s, x - W(e, s, o) / 2, y - rr, rr * 2, o);
  // 簇也是可点的目标（审查修复 A · L13：原来聚成簇的节点不进触控目标检查）
  logTarget(g, { x: x - rr, y: y - rr, w: rr * 2, h: rr * 2 }, `簇 ${n}`);
}

/** 地图的地名（vis.mapLabels，M12a-30）：见 mapView */
function mapLabels(e: ElCtx, a: Rect, pts: { x: number; y: number; i: number }[]) {
  const S = (n: number) => n * e.k, r = e.r;
  const mode0 = r.str('vis.mapLabels', 'auto'), mode = mode0 === 'auto' || !mode0 ? 'plate' : mode0;
  if (mode === 'none') return;
  const w0 = pack().world;
  const places: [string, number, number][] = w0.places?.length ? w0.places : [[w0.region, 0.24, 0.2]];
  const list: [string, number, number][] = mode === 'hover'
    ? (() => { const cur = pts.find((p) => progressState(e, p.i, 2) === 'current') ?? pts[0]; return cur ? [[places[cur.i % places.length][0], (cur.x - a.x) / a.w, (cur.y - a.y - S(34)) / a.h]] : []; })()
    : places;
  const el = e.part('mapLabel');
  // 浮动详情（lay.detail = transient）挂在当前节点旁、写着当前地点的名字时，这个地名的牌不再另画在别处（中期审查修复 ⑥：雪线包的「山口小屋」一块牌在另一个节点上、详情里又是「山口小屋」）
  const inDetail = r.str('lay.detail', 'none') === 'transient' ? mapDetailLoc(e)[0] : null;
  // 引线（cmp.leader 选过，M12b-24 的「兴趣点 → 标签」）：地名牌抬到点的上方 34，点与牌之间画一道引线；按 @mapLabel → 全局读（审查修复 ⑥：只要浮框引线时写 cmp.leader@tooltip）
  const ld = leaderOf(el);
  for (const [name, u, v] of list) {
    if (name === inDetail) continue;
    const px0 = a.x + a.w * u, py0 = a.y + a.h * v, cx = px0, cy = ld ? py0 - S(34) : py0;
    // 遮罩下面的地名不写（审查修复 A · D14：没去过的地方原来照样压一块地名牌在雾上）；只给当前节点标（hover）时照写
    if (mode !== 'hover' && fogged(px0, py0)) continue;
    if (mode === 'onMap') {
      const tc = scopedText(el) ?? '#f4efe2', o = { ...e.title, size: e.title.size * 0.85, color: tc, shadow: { color: 'rgba(0,0,0,0.75)', x: 0, y: 1, blur: 4 } };
      const tw = W(e, name, o); T(e, name, cx - tw / 2, cy - LH(e, o) / 2, LH(e, o), o);
      if (ld) drawLeader(e, [px0, py0], [cx, cy + LH(e, o) / 2], ld.kind, ld.end, e.accent);
      continue;
    }
    const w = W(e, name, e.small) + S(20), h = S(22);
    const x = Math.max(a.x + S(4), Math.min(a.x + a.w - w - S(4), cx - w / 2)), y = Math.max(a.y + S(4), Math.min(a.y + a.h - h - S(4), cy - h / 2));
    const pk = platePick(e, 'mapLabel', 'pill');
    // 牌匾（plaque，M12b-66 ⑦，stardew#42）：地名牌是实底小牌——底 = col.surface@mapLabel → col.surface，框跟面板（ast.frame 是九宫格素材时套同一圈框），字用面板字色；
    // 原来是透明底 + 强调色细框
    if (pk === 'plaque') {
      const pr = { x: x - S(4), y: y - S(3), w: w + S(8), h: h + S(6) };
      panel(el, pr, true);
      const to = { ...el.small, size: e.small.size * 1.1, weight: 700, color: el.text };
      T(el, name, pr.x + pr.w / 2 - W(el, name, to) / 2, pr.y, pr.h, to);
      if (ld) drawLeader(e, [px0, py0], [pr.x + pr.w / 2, pr.y + pr.h], ld.kind, ld.end, e.accent);
      continue;
    }
    plate(e, { x, y, w, h }, name, pk, { size: e.small.size }, 'mapLabel');
    if (ld) drawLeader(e, [px0, py0], [x + w / 2, y + h], ld.kind, ld.end, e.accent);
  }
}

/**
 * 引线（cmp.leader / cmp.leaderEnd，M12b-24，G-leader-dataviz）：选过才画（旧皮肤要皮肤之后的层），没选 null。
 * 三处各按自己的部件读（审查修复 ⑥）：浮动详情 → 锚点 @tooltip、地名牌 → 兴趣点 @mapLabel、格组 → 身体部位 @slotGroup；全局值三处都画
 */
function leaderOf(e: ElCtx): { kind: string; end: string } | null {
  const kind = pickedStr(e, 'cmp.leader', 'none');
  return kind === 'none' ? null : { kind, end: pickedStr(e, 'cmp.leaderEnd', 'dot') };
}
/** 部件上按目标写了字色（col.text@mapLabel……）时的颜色 */
const scopedText = (e: ElCtx) => { const v = scopedStr(e, 'col.text'); return v !== null ? resolveColor(v || '#fff', e.pal) : null; };

/**
 * 地图窗的裁剪外形（M12a-09）：跟皮肤面板的转角——直角 = 方角（原来写死 8px 圆角）、切角、像素台阶；圆角封顶 8（大地图上不变成大圆角）。
 * 旧皮肤没在皮肤之后显式选转角时仍是原来的 8px 圆角（对照图不变）
 */
function mapClip(e: ElCtx, a: Rect) {
  const g = e.g, p = e.t.panel;
  const kept = !e.th.legacy || !!chosenKey(e, 'vis.corner') || !!chosenKey(e, 'vis.cornerSize');
  if (kept && (p.chamfer || p.step)) { boxPath(g, a, { chamfer: p.chamfer, step: p.step }); return; }
  const rad = !kept ? 8 : Math.min(8, p.radiusPct !== undefined ? Math.min(40, (Math.min(a.w, a.h) * p.radiusPct) / 100) : typeof p.radius === 'number' ? p.radius : 0);
  if (rad > 0) g.roundRect(a.x, a.y, a.w, a.h, rad); else g.rect(a.x, a.y, a.w, a.h);
}

/**
 * 详情栏的按钮（M12a-26）：按交互模式与输入设备——ix.mode = readOnly（图鉴、结算）→ 不画；singleCTA → 只画第一个；select 且即点即生效（ix.confirm = instant）
 * 或手柄（ctx.input = pad）且这一屏画了按键图例（el.prompt legend）→ 不画；其余 → 内容包的 menu.buttons（原来不管什么界面都画「使用 / 丢弃」）。
 * ix.mode 只认显式给的（模板 / 版式 / 手动……），默认与兜底层的不算
 */
function detailButtons(e: ElCtx, spec?: DetailSpec): string[] {
  // 结构化样本自己带的按钮（M12b-62：地点的「派遣 / 前往」）优先，否则内容包的 menu.buttons
  // 按界面取（M12b-61 的 textFor('buttons')：锻造 = 制作 / 安装零件、技能树 = 学习 / 开始研究、建造 = 建造、邮件 = 领取 / 删除、图鉴不画按钮……），没写时内容包的 menu.buttons
  const r = e.r, buttons = spec?.buttons ?? textFor('buttons', r) ?? pack().menu.buttons;
  // 审查修复 A · D1：默认 / 派生 / 兜底层给的交互模式不算选过（ix.mode 的兜底 singleCTA、ix.confirm 的兜底 instant 原来把背包的「使用 / 丢弃」都去掉了）
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && !['default', 'fallback', 'ruleDefault', 'derived'].includes(l); };
  const mode = set('ix.mode') ? r.str('ix.mode', '') : '';
  if (mode === 'readOnly') return [];
  // 邮件的详情是一封信（附件）：领取 / 删除（目检修复；M12b-61 起是 GENERIC 的 buttons 变体）
  // 单一主按钮（M12b-14，factorio#38）：模板底部按钮行已经有这一颗（没有放行动号召元素时）——详情栏不再画，主动作的字交给模板那颗（buttonLabels）
  if (mode === 'singleCTA') return singleCtaInRow(e) ? [] : buttons.slice(0, 1);
  // 即点即生效 / 手柄时按钮交给底部按键图例：只有这一屏真的画了图例（el.prompt legend，触屏不画图例）才去掉按钮
  const legend = r.elements().includes('el.prompt') && formsOf(r, 'el.prompt').includes('legend') && r.str('ctx.input', 'kbm') !== 'touch';
  if (mode === 'select' && legend && (r.str('ix.confirm', 'instant') === 'instant' || r.str('ctx.input', 'kbm') === 'pad')) return [];
  return buttons;
}
/**
 * 详情栏的名字（M12a-26）：标题层级，字号 = max(标题字号, 正文 × typ.scale)（typ.scale 没给时 1.4）——原来只加粗不放大，黑神话 / Elden 的物品名比说明还小。
 * 旧皮肤只在皮肤之后显式选了 typ.scale 时才放大（皮肤自带的字号阶梯不动）
 */
function detailNameO(e: ElCtx, ink?: string): TextOpts {
  const k = e.th.legacy && !chosen(e, 'typ.scale') ? 0 : Math.max(1, e.r.num('typ.scale', 1.4));
  // 物品名按类别 / 流派着色（M12b-33，dead-cells#2 的拾取卡）：col.coding 含 lineId 时取第一件样本的类别色
  // 名字至少比说明字（小字）大一级（M12b-14，elden-ring#29：正文字号小时小字有下限、反而比正文大，名字 = 正文 × 1.2 仍比说明小；旧皮肤没选 typ.scale 时照旧）
  return { ...e.title, size: Math.max(e.title.size, e.base.size * k, k ? e.small.size * 1.15 : 0), color: lineColor(e, pack().menu.items[0]?.[4]?.line ?? 0) ?? ink ?? e.title.color };
}
/** 名字下的细线（M12a-26）：作用域写了 vis.stroke@title / vis.strokeSides@title 才画，线色 / 线宽取标题部件主题的描边（与页头下划线同口径）；返回占的高 */
function titleRule(e: ElCtx, x: number, y: number, w: number): number {
  const et = e.part('title');
  if (!(scopedSet(et, 'vis.stroke') || scopedSet(et, 'vis.strokeSides')) || (scopedStr(et, 'vis.stroke') ?? et.v.str('vis.stroke', 'solid')) === 'none') return 0;
  const b = et.t.panel.border ?? et.t.panel.sides?.b ?? et.t.panel.sides?.t;
  const lw = Math.max(1, b?.width ?? 1);
  e.g.fillStyle = resolveColor(b?.color ?? e.accent, e.pal); e.g.fillRect(x, y, w, lw);
  return lw + e.k * 3;
}

/**
 * 常驻详情栏 / 记录页（lay.detail = persistent、cnt.dataShape = record）：名字（标题层级 + 可选细线）→ 说明（最多 4 行）→ 属性条（gaugeOf，显式给了 cmp.gauge 才换画法；
 * st.delta 走好色）→ 按钮行（detailButtons）。按钮行永远贴详情栏底部并先从可用高里扣掉，栏太矮时先截说明行、再截属性条（M12a-26：原来说明照画 4 行、按钮放不下就不画）。
 * art = 顶部肖像 / 插画位（cmp.panelArt = side，M12a-36）
 */
function drawDetail(e: ElCtx, p: Rect, ink?: string, art = false) {
  const S = (n: number) => n * e.k;
  // 字段组合器（M12b-14）：cmp.detailFields 选过 / lay.detail 的新版式时按字段画；没选时下面原来的画法（逐字不变）
  const fl = detailFieldsOf(e);
  if (fl) { drawSections(e, p, art && !fl.includes('art') ? ['art', ...fl] : fl, detailData(e), ink); return; }
  const nameO = detailNameO(e, ink), so = { ...e.small, color: ink ?? e.text };
  // 详情写的是这一屏样本里选中的那条（M12b-62 的 detailOf：背包 = menu.items 第一个，原来的；技能 / 地点 / 任务 / 配方 / 建筑 / 角色……按 sampleKind）
  const detail = detailOf(e), btns = detailButtons(e, detail);
  const bh = Math.max(S(32), tap(e)), rowH = btns.length ? bh + S(8) : 0, bottom = p.y + p.h - rowH;
  let y = p.y;
  // 详情栏顶部的肖像 / 插画位（cmp.panelArt = side，M12a-36：Hades 图鉴详情区的插画）
  if (art) { const ah = Math.min(p.h * 0.35, p.w * 0.8); artSlot(e, { x: p.x, y, w: p.w, h: ah }, 'portrait', '插画', { decor: true }); y += ah + S(8); }
  T(e, detail.name, p.x, y, LH(e, nameO), nameO); y += LH(e, nameO);
  y += titleRule(e, p.x, y + S(1), p.w) + S(4);
  const nameBottom = y;
  const statH = S(8) + detail.stats.length * (LH(e, e.small) + S(6));
  // 附加行（M12b-62：原料 有 / 要、子目标、特性、区域与危险度……）跟在说明后面，属性条之前；放不下时先截说明、再截附加行
  const extraH = detail.lines.length * LH(e, e.small);
  const lines = wrapText(e, plainText(detail.desc), p.w, so).slice(0, 4);
  // 先截说明行：说明 + 附加行 + 属性条要放在按钮行以上；说明按富文本画（M12b-57：关键词 / 增益 / 减益 / 注释按 hier.inlineMap 着色），行高与原来一样
  const nl = Math.max(0, Math.min(lines.length, Math.floor((bottom - y - statH - extraH) / LH(e, e.small) + 1e-6)));
  if (nl > 0) y += drawRich(e, detail.desc, { x: p.x, y, w: p.w, h: Infinity }, { o: so, lh: 1.45, maxLines: nl }).h;
  if (detail.lines.length) {
    y += S(4);
    for (const l of detail.lines) { if (y + LH(e, e.small) > bottom + 0.5) break; T(e, l.s, p.x, y, LH(e, e.small), l.c ? { ...so, color: l.c } : so); y += LH(e, e.small); }
  }
  y += S(8);
  const delta = deltaOf(e);
  detail.stats.forEach(([l, v], i) => {
    if (y + LH(e, e.small) > bottom + 0.5) return;
    const lw = W(e, l, e.small) + S(10);
    T(e, l, p.x, y, LH(e, e.small), so);
    // 属性条走 gaugeOf（M12a-26 / 11：原来写死 bar，显式给了 cmp.gauge 才换画法）
    // 栏太窄时（第三区的详情栏，B8 留下的 de28）属性条宽为负：不画条，只写名字（原来画负宽的条）
    const bw = p.w - lw - (delta !== 'none' ? S(50) : 0);
    if (bw > S(4)) gaugeOf(e, { x: p.x + lw, y: y + LH(e, e.small) / 2 - S(4), w: bw, h: S(8) }, v, i, 'bar', { fixed: true, color: e.accent });
    if (delta === 'arrow' || delta === 'plus') T(e, deltaText(delta, v), p.x + p.w - S(46), y, LH(e, e.small), { ...e.small, weight: 700, color: deltaColor(e) });
    y += LH(e, e.small) + S(6);
  });
  // 按钮行贴详情栏底部（第一个是主按钮）
  const by = p.y + p.h - bh;
  let bx = p.x;
  if (btns.length && by >= nameBottom) for (const l of btns) { const bw = Math.max(W(e, l, buttonText(e, bh)) + S(28), tap(e)); button(e, { x: bx, y: by, w: bw, h: bh }, l, l === btns[0]); bx += bw + S(8); }
}
/** 详情栏的内容要多高（M12a-38 的 fitContent 测量；与 drawDetail 同一套行高）：名字 + 至多 4 行说明 + 附加行 + 属性条 + 按钮行 */
function detailNeed(e: ElCtx, a: Rect, ink?: string): { w: number; h: number } {
  // 字段组合器（M12b-14）：与 drawSections 同一套量法（fitContent 量得对）
  const fl = detailFieldsOf(e);
  if (fl) return { w: a.w, h: sectionsH(e, a.w, fl, detailData(e), ink) };
  const S = (n: number) => n * e.k, nameO = detailNameO(e, ink), so = { ...e.small, color: ink ?? e.text };
  const detail = detailOf(e), btns = detailButtons(e, detail);
  const lines = Math.min(4, wrapText(e, plainText(detail.desc), a.w, so).length);
  const extra = detail.lines.length ? S(4) + detail.lines.length * LH(e, e.small) : 0;
  const h = LH(e, nameO) + S(4) + lines * LH(e, e.small) + extra + S(8) + detail.stats.length * (LH(e, e.small) + S(6)) + (btns.length ? Math.max(S(32), tap(e)) + S(8) : 0);
  return { w: a.w, h };
}

/* ---------------- 详情栏字段组合器（M12b-14，§2 的 drawSections） ---------------- */

/** 详情的数据（detailOf 的名字 / 说明 / 属性 / 附加行 / 按钮，再加字段组合器要的：符号、稀有度、类别、持有数、长文、属性表、词缀、主数值、成本、解锁、进度……；都从这一屏的样本取） */
interface DetailData extends DetailSpec, Omit<SectionSeed, keyof DetailSpec | 'glyph' | 'type' | 'long' | 'table' | 'main' | 'tabs' | 'progress' | 'xp'> {
  glyph: string; rarity: number; type: string; held?: string; long: string; table: [string, string][]; affixes: [string, number][];
  main: [string, string]; cost: [string, string][]; time: string; unlocks: string[]; progress: number; lock: string; warn: string; tabs: string[]; xp: [number, string];
}
/** 详情数据（M12b-14）：detailOf 之外的字段按样本类别取（物品 = menu.items 第一件；天赋 / 图鉴 / 配方……= 这一类的第一条），数值字都是 ASCII 或字表里已有的字 */
function detailData(e: ElCtx): DetailData {
  const p = pack(), kind = sampleKind(e.r), d = detailOf(e), it = p.menu.items[0], t = samplesFor('talents'), cx = samplesFor('codex'), rc = samplesFor('recipes')[0];
  const glyph = kind === 'talents' ? t[0][0] : kind === 'codex' ? cx[0][0] : kind === 'recipes' ? rc[0] : kind === 'characters' ? samplesFor('characters')[0][0] : it?.[0] ?? '◆';
  const stats = [...d.stats, ...p.hud.selection.stats.filter(([l]) => !d.stats.some(([m]) => m === l))];
  // 结算屏（R4 回归修复 C1 ①）：属性表 = 这一局的键值（chartData 的 pairs），经验条 = 玩家档案的经验（见 resultsLike）
  const res = resultsLike(e.r);
  const table: [string, string][] = res ? (chartData().pairs ?? []).map(([l, v]): [string, string] => [l, v]) : kind === 'talents' ? [['等级', `${t[0][4]}/${t[0][5]}`], ['花费', t[0][6]], ...stats.map(([l, v]): [string, string] => [l, String(Math.round(v * 100))])] : stats.map(([l, v]) => [l, String(Math.round(v * 100))]);
  const long = kind === 'codex' ? cx[0][2] : p.screens.passage ?? p.screens.notice;
  const prog = kind === 'codex' ? cx[0][3] : kind === 'talents' ? (t[0][5] ? t[0][4] / t[0][5] : 0) : 0.6;
  return {
    ...d, glyph, rarity: it?.[4]?.rarity ?? 2, type: p.screens.tabs[1] ?? '', held: kind === 'items' && it ? `持有 ×${it[2]}` : undefined, long, table,
    affixes: t.slice(0, 3).map(([, , eff], i): [string, number] => [plainText(eff), i === 2 ? -1 : 1]),
    main: res && table[0] ? table[0] : stats[0] ? [stats[0][0], String(Math.round(stats[0][1] * 100))] : ['', '0'],
    cost: rc[3].map(([n, , q]): [string, string] => [[...n][0] ?? '◆', `×${q}`]), time: '⏱ 30', unlocks: t.slice(1, 5).map((x) => x[0]), progress: prog,
    lock: '升级后解锁', warn: '材料不足', tabs: p.screens.tabs.slice(1, 3), xp: res ? resultsXp() : [0.62, `等级 ${t[0][4] + 1}`],
    // B9 · 15 的字段（选中面板的版式也经 drawSections 拼）在模板详情里的默认数据：状态 / 配方 / 队伍 / 代号 / 目标 / 饰条 / 大数字 / 数值行 / 图标页签
    status: ['运行中', true], recipe: [glyph, d.name], members: DATA.party.slice(0, 4).map(([n]): [string, string] => [n, '待命']),
    code: d.name, objective: d.name, footer: 'REF 0427 // FILE 12', numbers: table.slice(0, 3), line: table.slice(0, 2),
    iconTabs: p.screens.tabs.slice(0, 4).map((x, i): [string, string] => [p.screens.tabIcons?.[i] ?? '◆', x]),
  };
}
/** 字段组合的预设（lay.detail 的新版式：选了版式、没写 cmp.detailFields 时用）；「|」= 换到右边一栏（wide 的详情 + 属性表两栏） */
const DETAIL_PRESETS: Record<string, string[]> = { statsPanel: ['name', 'statTable'], hero: ['tabs', 'art', 'name', 'mainValue', 'desc', 'buttons'], wide: ['name', 'desc', 'stats', 'buttons', '|', 'statTable'] };
/** 常驻详情的版式（lay.detail）里要切出一栏的那几种 */
const DETAIL_COLUMNS = new Set(['persistent', 'statsPanel', 'hero', 'wide']);
/**
 * 详情字段（cmp.detailFields，有序多选，M12b-14）：选过时按它（含 derive = 按数据形状派生）；没选时 lay.detail 的新版式（statsPanel / hero / wide）给预设；都没有 null = 原来的画法。
 * 部件 = 调用方给的上下文（常驻详情 = 屏幕，浮动详情 = @tooltip）
 */
function detailFieldsOf(e: ElCtx): string[] | null {
  // auto（跟随预设）/ none 先去掉再看有没有字段（B8 审查修复 ②：原来 ['auto'] 当成显式的空字段表，详情什么都不画）
  const k = chosenKey(e, 'cmp.detailFields');
  const l = k ? e.r.list(k).filter((x) => x && x !== 'none' && x !== 'auto') : [];
  if (l.length) return l.flatMap((x) => (x === 'derive' ? deriveFields(e) : [x]));
  const mode = pickedStr(e, 'lay.detail', '');
  return DETAIL_PRESETS[mode] ?? null;
}
/** 按数据形状派生字段（cmp.detailFields 含 derive）：图鉴 = 插画 / 名字 / 长文 / 进度点；长文 = 名字 / 长文；层级 / 关系网 = 名字 / 说明 / 成本 / 解锁 / 按钮；记录 = 名字 / 说明 / 属性条 / 按钮；其余（物品）= 稀有度 / 名字 / 下划线 / 类别 / 持有 / 说明 / 按钮 */
function deriveFields(e: ElCtx): string[] {
  const r = e.r, shape = r.str('cnt.dataShape', ''), codex = r.str('cnt.screen', '') === 'screen.codex' || r.str('cnt.subtype', '') === 'collection';
  if (codex) return ['art', 'name', 'longText', 'progressDots'];
  if (shape === 'text' && r.str('cnt.textLength', '') === 'long') return ['name', 'longText'];
  if (shape === 'hierarchy' || shape === 'network') return ['name', 'desc', 'cost', 'unlocks', 'buttons'];
  if (shape === 'record') return ['name', 'desc', 'stats', 'buttons'];
  return ['rarityLabel', 'name', 'nameRule', 'type', 'held', 'desc', 'buttons'];
}
/** 卡内子件的字段（fields.ts）在详情里也能用：数据按 DetailData 转 */
const CARD_FIELD_IN_DETAIL = new Set(['kicker', 'nameplate', 'iconDesc', 'fieldPair', 'amountBar', 'progressTable', 'priceChips', 'categoryChip']);
function fieldDataOfDetail(e: ElCtx, d: DetailData, kind = ''): FieldData {
  // 名牌写名字、类别胶囊写类别、金额条写货币 + 价格（坏色底，与卡面 fieldDataOf 同口径）——R4 · C3 把这三种收进 cmp.detailFields 的取值表，原来都拿说明当字
  if (kind === 'nameplate' || kind === 'categoryChip') return { text: kind === 'nameplate' ? d.name : d.type, color: lineColor(e, 0) ?? e.accent };
  if (kind === 'amountBar') return { text: `${DATA.res[0]?.[0] ?? ''} ${DATA.price}`.trim(), color: e.bad };
  return { lines: [d.type, d.name], text: d.desc, glyph: d.glyph, pairs: d.table.slice(0, 4), title: d.type, rows: d.table.slice(0, 3), chips: d.cost, color: e.accent };
}
/** 一个字段在宽 w 里要多高（drawSections 与 detailNeed / floatGeom 同口径；字跟 TEXT_K 一起长——B7 审查修复 ㉔ 留下的：详情字段的几何随字号长，卡与网格的几何不动） */
function fieldH(e: ElCtx, f: string, w: number, d: DetailData, ink?: string, avail = Infinity): number {
  const S = (n: number) => n * e.k, so = { ...e.small, color: ink ?? e.text }, ls = LH(e, e.small);
  switch (f) {
    case 'rarityLabel': case 'type': case 'held': return ls;
    case 'name': return LH(e, detailNameO(e, ink)) + S(2);
    case 'nameRule': return S(5);
    case 'desc': return Math.min(4, wrapText(e, plainText(d.desc), w, so).length) * ls;
    case 'longText': return Math.min(avail, measureRich(e, d.long, w, { o: so, lh: 1.45 }).h);
    case 'stats': return S(4) + d.stats.length * (ls + S(6));
    case 'statTable': { const n = subColumnsOf(e), rows = Math.ceil(d.table.length / n); return (n > 1 ? LH(e, { ...e.small, weight: 700 }) + S(6) : 0) + rows * LH(e, e.base, 1.4); }
    case 'statCards': return Math.min(4, d.table.length) * (LH(e, e.base, 1.9) + S(6));
    case 'affixes': return d.affixes.length * LH(e, e.small, 1.6);
    case 'mainValue': return ls + LH(e, { ...e.title, size: e.title.size * 1.8 }, 1.2) + S(8);
    case 'cost': case 'unlocks': return LH(e, e.base, 1.5);
    case 'art': return Math.min(w * 0.62, avail * 0.42);
    case 'progressDots': return S(14);
    case 'lockRow': case 'warnRow': return LH(e, e.small, 1.3);
    case 'tabs': return ls + S(10);
    case 'xpBar': return ls + S(12);
    case 'buttons': return detailButtons(e, d).length ? Math.max(S(32), tap(e)) : 0;
    // B9 · 15（选中面板的版式）：状态行 / 配方行 / 代号 / 目标 / 饰条 / 数值行一行；队伍列表按人数；大数字栏按行数；图标页签一行胶囊
    case 'statusRow': case 'codeLine': case 'footerStrip': return LH(e, e.small, 1.4);
    case 'recipeLine': case 'objectiveLine': case 'valueLine': return LH(e, e.base, 1.45);
    case 'memberList': return (d.members?.length ?? 0) * LH(e, e.base, 1.6);
    case 'bigNumbers': return (d.numbers?.length ?? 0) * LH(e, { ...e.title, size: e.title.size * 1.3 }, 1.15);
    case 'iconTabs': return d.iconTabs?.length ? Math.max(S(30), LH(e, e.small, 1.9)) + S(8) : 0;
    case 'quantity': return Math.max(S(30), tap(e) * 0.8);
    default: return CARD_FIELD_IN_DETAIL.has(f) ? measureField(e, f, w, fieldDataOfDetail(e, d, f)) : 0;
  }
}
const FIELD_GAP = (e: ElCtx) => 6 * e.k;
/**
 * 字段排位（M12b-14，与 B7 的 sectionsLayout 同口径）：先量每个字段的高，放不下时先省插画、再从后往前省其余字段（名字与按钮留着）；按钮贴底。
 * 返回每个要画的字段与它的 y（相对栏顶）和总高
 */
function sectionsPlan(e: ElCtx, w: number, h: number, fields: string[], d: DetailData, ink?: string): { f: string; y: number; h: number }[] {
  const gap = FIELD_GAP(e), body = fields.filter((f) => f !== 'buttons'), btn = fields.includes('buttons') ? fieldH(e, 'buttons', w, d, ink) : 0;
  let keep = [...body];
  // 每个字段的整高与最矮能画成的高（B8 审查修复 ⑳：说明 / 长文至少 1 行、词缀至少 1 行，放不下整段时先截行而不是整个省掉——drawDetailField 本来就按格高截行）
  const full = new Map(body.map((f) => [f, fieldH(e, f, w, d, ink, h)] as [string, number]));
  const minOf = (f: string) => { const fh = full.get(f) ?? 0; return f === 'desc' || f === 'longText' ? Math.min(fh, LH(e, e.small)) : f === 'affixes' ? Math.min(fh, LH(e, e.small, 1.6)) : fh; };
  // 总高 = 各字段 + 字段间距；有按钮时按钮前也留一个间距
  const total = (l: string[], hOf: (f: string) => number) => l.reduce((s, f) => s + hOf(f) + gap, 0) + (btn ? btn : l.length ? -gap : 0);
  const fullH = (f: string) => full.get(f) ?? 0;
  if (total(keep, fullH) > h + 0.5 && keep.includes('art')) keep = keep.filter((f) => f !== 'art');
  while (keep.length > 1 && total(keep, minOf) > h + 0.5) { const j = [...keep].reverse().findIndex((f) => f !== 'name'); if (j < 0) break; keep.splice(keep.length - 1 - j, 1); }
  // 放得下最矮的之后，剩下的高按顺序还给能截行的字段（直到它们的整高）
  let spare = Number.isFinite(h) ? h - total(keep, minOf) : Infinity;
  const hs = keep.map((f) => { const lo = minOf(f), hi = fullH(f), give = Math.max(0, Math.min(hi - lo, spare)); spare -= give; return lo + give; });
  let y = 0;
  const out = keep.map((f, i) => { const fh = f === 'longText' || f === 'art' ? Math.min(hs[i], fieldH(e, f, w, d, ink, h - y - btn)) : hs[i]; const o = { f, y, h: fh }; y += fh + gap; return o; });
  if (btn) out.push({ f: 'buttons', y: Number.isFinite(h) ? Math.max(y, h - btn) : y, h: btn });
  return out;
}
/** 字段排位的测试口（B8 审查修复 ⑳）：宽 w、高 h 里这一屏的详情数据排得下哪些字段、各多高 */
export const detailPlanOf = (e: ElCtx, w: number, h: number, fields: string[]) => sectionsPlan(e, w, h, fields, detailData(e)).map(({ f, h: fh }) => [f, fh] as [string, number]);
/** 字段组合的总高（detailNeed / floatGeom 用；「|」两栏时取高的那栏） */
function sectionsH(e: ElCtx, w: number, fields: string[], d: DetailData, ink?: string): number {
  const cols = splitCols(fields);
  return Math.max(...cols.map((c) => { const pl = sectionsPlan(e, cols.length > 1 ? (w - e.k * 14) / 2 : w, Infinity, c, d, ink); const last = pl[pl.length - 1]; return last ? last.y + last.h : 0; }));
}
const splitCols = (fields: string[]): string[][] => { const i = fields.indexOf('|'); return i < 0 ? [fields] : [fields.slice(0, i), fields.slice(i + 1)].filter((c) => c.length); };

/**
 * 详情栏字段组合器（M12b-14，§2 的 drawSections(e, a, fields, data)）：按 fields 的顺序从上往下画（sectionsPlan 先定放得下的），按钮贴底；「|」之后的字段画在右边一栏。
 * 字段：rarityLabel 稀有度字（稀有度色）/ name 名字（标题层级）/ nameRule 名下细线（vis.stroke@title，没写时分隔线色）/ type 类别 / held 持有数 / desc 说明（富文本 4 行）/
 * longText 分段长文（富文本，配 lay.overflow = longScroll）/ stats 属性条（原来的）/ statTable 左名右值的属性表（st.statViz 是 charts.ts 的取值时按它画；lay.subColumns 分栏、每栏带段标题）/
 * statCards 虚线框属性卡堆 / affixes 词缀 + 逐行升降箭头（st.delta）/ mainValue 大号主数值方块 / cost 成本胶囊 + 时间 / unlocks 解锁图标行 / art 插画位 / progressDots 解锁进度点 /
 * lockRow 锁 + 解锁条件 / warnRow 警示行 / tabs 小页签 / xpBar 经验条 / buttons 按钮行；卡内子件（fields.ts 的 kicker / fieldPair / priceChips……）也能写进来
 */
function drawSections(e: ElCtx, a: Rect, fields: string[], d: DetailData, ink?: string) {
  const cols = splitCols(fields), gap = e.k * 14;
  const cw = cols.length > 1 ? (a.w - gap) / 2 : a.w;
  cols.forEach((c, ci) => {
    const x = a.x + ci * (cw + gap);
    if (ci > 0) ruleLine(e, a.y, a.y + a.h, Math.round(x - gap / 2), true);
    for (const { f, y, h } of sectionsPlan(e, cw, a.h, c, d, ink)) drawDetailField(e, f, { x, y: a.y + y, w: cw, h }, d, ink);
  });
}
// 局内元素（el.selection 的新版式，M12b-15）经 fields.ts 的挂钩调同一套字段组合器：seed 换掉这一块的数据，其余照模板的 detailData
SECTIONS.draw = (e, a, fields, seed, ink) => drawSections(e, a, fields, { ...detailData(e), ...seed } as DetailData, ink);
SECTIONS.height = (e, w, fields, seed, ink) => sectionsH(e, w, fields, { ...detailData(e), ...seed } as DetailData, ink);
/** 画一个详情字段（drawSections） */
function drawDetailField(e: ElCtx, f: string, r: Rect, d: DetailData, ink?: string) {
  const S = (n: number) => n * e.k, g = e.g, so = { ...e.small, color: ink ?? e.text }, ls = LH(e, e.small), muted = ink ? withAlpha(ink, 0.65) : mutedOf(e, 0.65);
  switch (f) {
    case 'rarityLabel': { const o = { ...e.small, weight: 800, upper: true, spacing: 0.12, color: rarityColor(e, d.rarity) }; T(e, rarityWord(d.rarity), r.x, r.y, ls, o); return; }
    case 'name': { const o = detailNameO(e, ink); T(e, d.name, r.x, r.y, LH(e, o), o); return; }
    case 'nameRule': { if (!titleRule(e, r.x, r.y + S(1), r.w)) ruleLine(e, r.x, r.x + r.w, Math.round(r.y + S(1))); return; }
    case 'type': T(e, d.type, r.x, r.y, ls, { ...so, color: muted }); return;
    case 'held': if (d.held) drawNumber(e, d.held, r.x, r.y, ls, { ...so, color: muted }); return;
    case 'desc': { const n = Math.max(0, Math.floor(r.h / ls + 1e-6)); if (n) drawRich(e, d.desc, { x: r.x, y: r.y, w: r.w, h: Infinity }, { o: so, lh: 1.45, maxLines: n }); return; }
    case 'longText': drawRich(e, d.long, { x: r.x, y: r.y, w: r.w, h: r.h }, { o: so, lh: 1.45, maxLines: Math.max(1, Math.floor(r.h / ls + 1e-6)) }); return;
    case 'stats': {
      let y = r.y + S(4);
      const delta = deltaOf(e);
      d.stats.forEach(([l, v], i) => {
        const lw = W(e, l, e.small) + S(10);
        T(e, l, r.x, y, ls, so);
        const bw = r.w - lw - (delta !== 'none' ? S(50) : 0);
        if (bw > S(4)) gaugeOf(e, { x: r.x + lw, y: y + ls / 2 - S(4), w: bw, h: S(8) }, v, i, 'bar', { fixed: true, color: e.accent });
        if (delta === 'arrow' || delta === 'plus') T(e, deltaText(delta, v), r.x + r.w - S(46), y, ls, { ...e.small, weight: 700, color: deltaColor(e) });
        y += ls + S(6);
      });
      return;
    }
    case 'statTable': {
      // st.statViz 是 charts.ts 的取值（keyValue / inkNumber……，Disco 的墨团属性块）时按它画；否则左名右值的细表（Elden 的嵌套小表），lay.subColumns 分栏
      const viz = pickedStr(e, 'st.statViz', '');
      if (CHART_KINDS.has(viz)) { const cd = chartData(); statViz(e, viz, r, { ...cd, pairs: d.table.map(([l, v]) => [l, v]) }, ink); return; }
      const n = subColumnsOf(e), per = Math.ceil(d.table.length / n), gp = S(12), cw = (r.w - gp * (n - 1)) / n, rh = LH(e, e.base, 1.4), th = n > 1 ? LH(e, { ...e.small, weight: 700 }) + S(6) : 0;
      for (let c = 0; c < n; c++) {
        const x = r.x + c * (cw + gp);
        if (n > 1) groupHeader(e, { x, y: r.y, w: cw, h: th - S(4) }, sectionTitle(c), false, ink);
        d.table.slice(c * per, (c + 1) * per).forEach(([l, v], i) => {
          const y = r.y + th + i * rh, vo = { ...e.base, weight: 700, color: ink ?? e.text };
          T(e, l, x, y, rh, { ...e.base, color: muted });
          drawNumber(e, v, x + cw - numberWidth(e, v, vo), y, rh, vo);
          if (i) ruleLine(e, x, x + cw, Math.round(y));
        });
      }
      return;
    }
    case 'statCards': {
      // 虚线框属性卡（Control 的改造卡）：名左、值右（第二强调色）、右上一枚灰色稀有度字
      const ch = LH(e, e.base, 1.9);
      d.table.slice(0, 4).forEach(([l, v], i) => {
        const q = { x: r.x, y: r.y + i * (ch + S(6)), w: r.w, h: ch };
        if (q.y + q.h > r.y + r.h + 0.5) return;
        g.save(); g.strokeStyle = withAlpha(ink ?? e.text, 0.55); g.lineWidth = 1; g.setLineDash([4, 3]); g.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, q.h - 1); g.restore();
        T(e, l, q.x + S(8), q.y, q.h, { ...e.base, color: ink ?? e.text });
        // 稀有度字在右上、数值在右下（不叠）
        const rw = rarityWord(Math.min(4, i)), ro = { ...e.small, size: e.small.size * 0.75, color: muted }; T(e, rw, q.x + q.w - W(e, rw, ro) - S(6), q.y + S(1), LH(e, ro), ro);
        const vo = { ...e.base, weight: 700, color: e.accent2 }; drawNumber(e, v, q.x + q.w - S(8) - numberWidth(e, v, vo), q.y + q.h - LH(e, vo) - S(1), LH(e, vo), vo);
      });
      return;
    }
    case 'affixes': {
      // 词缀 + 与当前装备逐项对比（Dead Cells 拾取卡：绿升红降）：行尾 ▲ / ▼ + 数字（st.delta = plus 时写 +N / −N）
      // 行数按格高截（审查修复 ⑳：放不下时少写几行，不是整段省掉）
      const plus = e.r.str('st.delta', 'arrow') === 'plus', rh = LH(e, e.small, 1.6);
      d.affixes.slice(0, Math.max(1, Math.floor(r.h / rh + 1e-6))).forEach(([s, sign], i) => {
        const y = r.y + i * rh, c = sign >= 0 ? semantic(e, 'good') : semantic(e, 'bad');
        T(e, `· ${s}`, r.x, y, rh, so);
        const mk = plus ? `${sign >= 0 ? '+' : '−'}${4 + i * 3}` : `${sign >= 0 ? '▲' : '▼'} ${4 + i * 3}`, mo = { ...e.small, weight: 700, color: c };
        drawNumber(e, mk, r.x + r.w - numberWidth(e, mk, mo), y, rh, mo);
      });
      return;
    }
    case 'mainValue': {
      // 主数值方块（Dead Cells 的 DPS 大数、Disco 的 TOTAL）：小标签 + 强调色细框里的大号数字
      const big = { ...e.title, size: e.title.size * 1.8, weight: 900, color: ink ?? e.text }, bh = LH(e, big, 1.2), v = d.main[1], vw = numberWidth(e, v, big);
      T(e, d.main[0], r.x, r.y, ls, { ...so, color: muted });
      g.save(); g.strokeStyle = e.accent; g.lineWidth = 1.5; g.strokeRect(r.x + 0.5, r.y + ls + 0.5, vw + S(16), bh + S(4)); g.restore();
      drawNumber(e, v, r.x + S(8), r.y + ls + S(2), bh, big);
      return;
    }
    case 'cost': {
      // 成本行（Factorio 科技详情：科技包 × 数 + 时间）：几枚胶囊 + 时间
      const h = LH(e, e.base, 1.5), o = { ...e.small, weight: 700, color: ink ?? e.text };
      let x = r.x;
      for (const [gl, v] of [...d.cost, ['', d.time] as [string, string]]) {
        const w0 = (gl ? h : S(6)) + numberWidth(e, v, o) + S(8), q = { x, y: r.y + S(2), w: w0, h: h - S(4) };
        if (q.x + q.w > r.x + r.w) break;
        drawBox(g, q, { bg: { solid: withAlpha(e.text, 0.1) }, radiusPct: 50 }, e.pal);
        if (gl) icon(e, gl, q.x + h * 0.45, q.y + q.h / 2, q.h * 0.6, e.accent);
        drawNumber(e, v, q.x + (gl ? h * 0.85 : S(6)), q.y, q.h, o);
        x += w0 + S(6);
      }
      return;
    }
    case 'unlocks': {
      // 解锁图标行（Factorio：解锁的配方图标）：「解锁」小字 + 一排小图标格
      const lab = '解锁', lo = { ...so, color: muted }, s = LH(e, e.base, 1.3), x0 = r.x + W(e, lab, lo) + S(8);
      T(e, lab, r.x, r.y, r.h, lo);
      d.unlocks.forEach((u, i) => { const q = { x: x0 + i * (s + S(4)), y: r.y + (r.h - s) / 2, w: s, h: s }; if (q.x + q.w <= r.x + r.w) slot(e, q, u); });
      return;
    }
    case 'art': artSlot(e, r, 'portrait', '插画', { decor: true }); return;
    case 'progressDots': {
      // 解锁进度点（Hades / 黑神话图鉴的传记解锁进度）：5 个点，按进度点亮
      const n = 5, lit = Math.round(d.progress * n), rr = S(4);
      for (let i = 0; i < n; i++) { g.fillStyle = i < lit ? e.accent : withAlpha(ink ?? e.text, 0.25); g.beginPath(); g.arc(r.x + rr + i * rr * 3, r.y + r.h / 2, rr, 0, Math.PI * 2); g.fill(); }
      return;
    }
    case 'lockRow': { drawPadlock(g, r.x + ls * 0.45, r.y + r.h / 2, ls * 0.8, muted); T(e, d.lock, r.x + ls * 1.1, r.y, r.h, { ...so, color: muted }); return; }
    case 'warnRow': {
      // 警示行：坏色三角（矢量，不加字）+ 「!」+ 坏色字
      const o = { ...so, weight: 700, color: semantic(e, 'bad') }, s = ls * 0.8, cy = r.y + r.h / 2;
      g.fillStyle = o.color; g.beginPath(); g.moveTo(r.x + s / 2, cy - s / 2); g.lineTo(r.x + s, cy + s / 2); g.lineTo(r.x, cy + s / 2); g.closePath(); g.fill();
      T(e, '!', r.x + s / 2 - W(e, '!', { ...o, size: o.size * 0.7, color: '#fff' }) / 2, cy - s * 0.35, s, { ...o, size: o.size * 0.7, color: '#fff' });
      T(e, d.warn, r.x + s + ls * 0.3, r.y, r.h, o);
      return;
    }
    case 'tabs': {
      // 小页签（Disco hero 版的 OVERVIEW / INFO）：第一个选中（强调色下划线）
      let x = r.x;
      d.tabs.forEach((t, i) => { const o = { ...e.small, weight: i ? 400 : 700, color: i ? muted : ink ?? e.text }, w0 = W(e, t, o); T(e, t, x, r.y, ls, o); if (!i) { g.fillStyle = e.accent; g.fillRect(x, r.y + ls + S(2), w0, S(2)); } x += w0 + S(16); });
      return;
    }
    case 'xpBar': {
      // 经验条（饥荒单人结算）：「等级 N」+ 一根条（gaugeOf，cmp.gauge 选过换画法）
      const lw = W(e, d.xp[1], so) + S(10);
      T(e, d.xp[1], r.x, r.y, ls, so);
      if (r.w - lw > S(4)) gaugeOf(e, { x: r.x + lw, y: r.y + ls / 2 - S(4), w: r.w - lw, h: S(8) }, d.xp[0], 0, 'bar', { fixed: true, color: e.accent });
      return;
    }
    case 'buttons': {
      const btns = detailButtons(e, d), bh = Math.max(S(32), tap(e));
      let bx = r.x;
      for (const l of btns) { const bw = Math.max(W(e, l, buttonText(e, bh)) + S(28), tap(e)); if (bx + bw > r.x + r.w + 0.5) break; button(e, { x: bx, y: r.y, w: bw, h: bh }, l, l === btns[0]); bx += bw + S(8); }
      return;
    }
    case 'statusRow': {
      // 状态行（Factorio 实体信息的绿点 Working、Frostpunk 建筑面板的运行状态）：正常 = 好色圆点，否则坏色
      const [st, okv] = d.status ?? ['运行中', true], c = semantic(e, okv ? 'good' : 'bad'), rr = ls * 0.22;
      g.fillStyle = c; g.beginPath(); g.arc(r.x + rr + S(1), r.y + r.h / 2, rr, 0, Math.PI * 2); g.fill();
      T(e, st, r.x + rr * 2 + S(6), r.y, r.h, { ...so, weight: 700, color: c });
      return;
    }
    case 'recipeLine': {
      // 配方行：「配方」小字 + 图标格 + 名字
      const [gl, nm] = d.recipe ?? [d.glyph, d.name], lab = '配方', lo = { ...so, color: muted }, s = r.h * 0.82, x0 = r.x + W(e, lab, lo) + S(8);
      T(e, lab, r.x, r.y, r.h, lo);
      slot(e, { x: x0, y: r.y + (r.h - s) / 2, w: s, h: s }, gl);
      T(e, nm, x0 + s + S(6), r.y, r.h, { ...e.base, color: ink ?? e.text });
      return;
    }
    case 'memberList': {
      // 队伍列表（Frostpunk 侦察队）：小头像 + 名字 + 右侧状态字，行间细线
      const rh = LH(e, e.base, 1.6);
      (d.members ?? []).forEach(([n, st], i) => {
        const y = r.y + i * rh;
        if (y + rh > r.y + r.h + 0.5) return;
        if (i) ruleLine(e, r.x, r.x + r.w, Math.round(y));
        avatar(e, r.x + rh * 0.4, y + rh / 2, rh * 0.34, n);
        T(e, n, r.x + rh * 0.9, y, rh, { ...e.base, color: ink ?? e.text });
        const so2 = { ...so, color: muted }; T(e, st, r.x + r.w - W(e, st, so2), y, rh, so2);
      });
      return;
    }
    case 'codeLine': { const o = { ...e.small, weight: 700, spacing: 0.08, color: e.accent }; T(e, `> ${d.code ?? d.name}`, r.x, r.y, r.h, o); return; }
    case 'objectiveLine': {
      // 目标行：任务色菱形 + 一行
      const s = r.h * 0.34, cx = r.x + s, cy = r.y + r.h / 2;
      g.fillStyle = e.quest; g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath(); g.fill();
      T(e, d.objective ?? d.name, r.x + s * 2 + S(8), r.y, r.h, { ...e.base, color: ink ?? e.text });
      return;
    }
    case 'footerStrip': {
      // 底部文字饰条（XCOM 任务卡）：两侧细线中间一串等宽小字
      const s0 = d.footer ?? '', o = { ...e.small, size: e.small.size * 0.85, spacing: 0.2, color: muted }, tw = W(e, s0, o), cy = Math.round(r.y + r.h / 2);
      T(e, s0, r.x + r.w / 2 - tw / 2, r.y, r.h, o);
      ruleLine(e, r.x, r.x + r.w / 2 - tw / 2 - S(8), cy); ruleLine(e, r.x + r.w / 2 + tw / 2 + S(8), r.x + r.w, cy);
      return;
    }
    case 'bigNumbers': {
      // 大号数字栏（Civ6 城市面板）：大号数字靠左、小型大写标签右对齐，一行一个
      const big = { ...e.title, size: e.title.size * 1.3, weight: 800, color: ink ?? e.text }, rh = LH(e, big, 1.15), lo = { ...e.small, upper: true, spacing: 0.12, color: muted };
      (d.numbers ?? []).forEach(([l, v], i) => {
        const y = r.y + i * rh;
        if (y + rh > r.y + r.h + 0.5) return;
        drawNumber(e, v, r.x, y, rh, big);
        T(e, l, r.x + r.w - W(e, l, lo), y, rh, lo);
      });
      return;
    }
    case 'valueLine': {
      // 一行数值（StS 角色说明的「生命 80/80 · 金币 99」）：标签次要色、值粗体
      let x = r.x;
      (d.line ?? []).forEach(([l, v], i) => {
        const lo = { ...e.base, color: muted }, vo = { ...e.base, weight: 700, color: i ? e.accent : semantic(e, 'bad') };
        if (i) { T(e, '·', x, r.y, r.h, lo); x += W(e, '· ', lo); }
        T(e, l, x, r.y, r.h, lo); x += W(e, l, lo) + S(6);
        x += drawNumber(e, v, x, r.y, r.h, vo) + S(10);
      });
      return;
    }
    case 'iconTabs': {
      // 托槽里的图标胶囊页签（Civ6 城市详情）：一条框材质托槽 + 一排圆角胶囊，第一个选中（按键块），其余控件面
      const tabs = d.iconTabs ?? [], h = r.h - S(8), gp = S(6), w0 = h * 1.5, mat = pickedStr(e, 'ast.frameMat', 'bronze'), base = MATERIAL_BASE[mat] ?? '#b08d57';
      const tw = tabs.length * w0 + (tabs.length - 1) * gp, q = { x: r.x, y: r.y, w: Math.min(r.w, tw + S(12)), h: r.h };
      drawBox(g, q, { bg: { solid: mix(base, '#000', 0.6) }, border: { width: Math.max(1, S(1.5)), color: base }, radius: S(4) }, e.pal);
      tabs.forEach(([gl, l], i) => {
        const t0 = { x: r.x + S(6) + i * (w0 + gp), y: r.y + S(4), w: w0, h };
        if (t0.x + t0.w > r.x + r.w) return;
        drawBox(g, t0, i ? { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, radiusPct: 50 } : { ...e.t.key, radiusPct: 50 }, e.pal);
        icon(e, gl, t0.x + t0.w / 2, t0.y + t0.h / 2, h * 0.55, i ? e.text : onKey(e, e.base).color);
        logTarget(g, t0, l);
      });
      return;
    }
    case 'quantity': {
      // 数量控件（M12b-31，frostpunk#19：建筑面板的工人分配）：标签 + cmp.quantity 的控件（stepperMinMax = 无 / −1 / 数 / +1 / 满）
      const [lab, n, max] = d.quantity ?? ['工人', 3, 10], lo = { ...so, color: muted }, lw = W(e, lab, lo) + S(10);
      T(e, lab, r.x, r.y, r.h, lo);
      quantityCtl(e, { x: r.x + lw, y: r.y, w: r.w - lw, h: r.h }, n, max, e.r.str('cmp.quantity', 'slider'));
      return;
    }
    default: if (CARD_FIELD_IN_DETAIL.has(f)) drawField(e, f, r, fieldDataOfDetail(e, d, f));
  }
}

/**
 * 浮动详情（lay.detail = transient，M12a-26）的尺寸：按内容——宽 = clamp(200, 名字 / 说明的宽 + 留白, 300)，说明折成至多 2 行，高 = 留白 + 可选头图 + 名字 + 说明
 * （原来固定 240 × 150、画在数据区 45% 处）；头图 = cmp.panelArt = header（写在 @tooltip 上，或容器没画面板时的全局值；M12a-36 的插画槽）。
 * 结构化样本的附加行（M12b-62：配方的原料 有 / 要，dont-starve#29）至多 2 行跟在说明后面
 */
function floatGeom(e0: ElCtx): { w: number; h: number; lines: string[]; extra: DetailLine[]; ah: number; fields?: string[] } {
  const e = e0.part('tooltip'), S = (n: number) => n * e.k;
  // 浮动详情也能按字段组合（M12b-14：cmp.detailFields@tooltip 或全局选过）：宽 260（夹在画面以内），高按字段量
  const tf = detailFieldsOf(e);
  // 高封顶到画面（减去四边 6，审查修复 ㉕：原来按字段整高量，大字号时伸出画面底、placeFloating 只能夹）；封顶后 drawSections 按这个高截行 / 省字段
  if (tf) { const w = Math.min(S(260), e0.R.w * 0.45); return { w, h: Math.min(e0.R.h - S(12), S(20) + sectionsH(e, w - S(24), tf, detailData(e0))), lines: [], extra: [], ah: 0, fields: tf }; }
  const detail = detailOf(e0), extra = detail.lines.slice(0, 2);
  const desc = plainText(detail.desc), nw = W(e, detail.name, e.title), dw = W(e, desc, e.small);
  const cw = Math.max(nw, Math.min(dw, S(276)), ...extra.map((l) => W(e, l.s, e.small)));
  let w = Math.max(S(200), Math.min(S(300), cw + S(24)));
  // 说明要折两行时两行折得一样长（审查修复 A · D8：原来按 276 折，第二行常常只剩两个字「舷。」）：宽 ≈ 说明宽的一半 + 留白，夹在 200–300，不窄于名字
  if (dw > w - S(24)) {
    const half = Math.max(S(200), Math.min(S(300), Math.max(nw, dw / 2 + S(12), ...extra.map((l) => W(e, l.s, e.small))) + S(24)));
    if (half < w && wrapText(e, desc, half - S(24), e.small).length <= 2) w = half;
  }
  const lines = desc ? wrapText(e, desc, w - S(24), e.small).slice(0, 2) : [];
  const art = (scopedStr(e, 'cmp.panelArt') ?? (!framedPanel(e0) ? cmp(e, 'cmp.panelArt', 'none') : 'none')) === 'header';
  const ah = art ? Math.round((w - S(24)) * 0.45) + S(8) : 0;
  return { w, h: S(10) + ah + LH(e, e.title) + S(4) + (lines.length + extra.length) * LH(e, e.small) + S(10), lines, extra, ah };
}
/** 画浮动详情（后置一遍，M12a-26）：完整的 tooltip 部件面板（带外框与投影，原来去掉了），UI 像素化时画在文字画布上（格子里的数量 / 星级不再透上来） */
function drawFloatingDetail(e0: ElCtx, q: Rect, G: { lines: string[]; extra: DetailLine[]; ah: number; fields?: string[] }, ink?: string) {
  const e = onCanvas(e0.part('tooltip'), e0.tx), S = (n: number) => n * e.k;
  const detail = detailOf(e0);
  panel(e, q, false, {}, 'tooltip');
  if (G.fields) { drawSections(e, { x: q.x + S(12), y: q.y + S(10), w: q.w - S(24), h: q.h - S(20) }, G.fields, detailData(e0), ink); logTarget(e.g, q, detail.name, 'tooltip'); return; }
  const x = q.x + S(12), w = q.w - S(24);
  let y = q.y + S(10);
  if (G.ah) { artSlot(e, { x, y, w, h: G.ah - S(8) }, 'scene', '头图'); y += G.ah; }
  const nameO = { ...e.title, color: ink ?? e.title.color };
  T(e, detail.name, x, y, LH(e, nameO), nameO); y += LH(e, nameO) + S(4);
  // 说明按富文本画（M12b-57），折行与量尺寸时同一套（至多 2 行）
  if (G.lines.length) y += drawRich(e, detail.desc, { x, y, w, h: Infinity }, { o: { ...e.small, color: ink ?? e.text }, lh: 1.45, maxLines: G.lines.length }).h;
  for (const l of G.extra) { T(e, l.s, x, y, LH(e, e.small), { ...e.small, color: l.c ?? ink ?? e.text }); y += LH(e, e.small); }
  logTarget(e.g, q, detail.name, 'tooltip');
}

/**
 * 浮动框的位置（M12a-26，§2 的 placeFloating）：候选 = 锚点右 / 左 / 下 / 上（朝 bounds 中心的那一侧优先，上下对齐锚点的上沿 / 左沿并夹在 bounds 里），
 * 取第一个整块在 bounds 里且不压 avoid 的；都压到时取压得最少的（overlap > 0，调用方可以让列表收窄再排）。Godot：同一算法的定位脚本（PopupPanel.position）
 */
export function placeFloating(anchor: Rect, size: { w: number; h: number }, avoid: Rect[], bounds: Rect, gap = 8, extra: { x: number; y: number }[] = [], hard: Rect[] = []): { rect: Rect; overlap: number } {
  const cx = anchor.x + anchor.w / 2, cy = anchor.y + anchor.h / 2, bx = bounds.x + bounds.w / 2, by = bounds.y + bounds.h / 2;
  const clampX = (x: number) => Math.max(bounds.x, Math.min(bounds.x + bounds.w - size.w, x));
  const clampY = (y: number) => Math.max(bounds.y, Math.min(bounds.y + bounds.h - size.h, y));
  const right = { x: anchor.x + anchor.w + gap, y: clampY(anchor.y) }, left = { x: anchor.x - gap - size.w, y: clampY(anchor.y) };
  const below = { x: clampX(anchor.x), y: anchor.y + anchor.h + gap }, above = { x: clampX(anchor.x), y: anchor.y - gap - size.h };
  // extra = 调用方另给的候选（列表 / 网格收窄后让出的那一栏），排在四个方向之后
  const cands = [...(cx <= bx ? [right, left] : [left, right]), ...(cy <= by ? [below, above] : [above, below]), ...extra.map((p) => ({ x: clampX(p.x), y: clampY(p.y) }))].map((p) => ({ ...p, w: size.w, h: size.h }));
  const inside = (q: Rect) => q.x >= bounds.x - 0.5 && q.y >= bounds.y - 0.5 && q.x + q.w <= bounds.x + bounds.w + 0.5 && q.y + q.h <= bounds.y + bounds.h + 0.5;
  const cost = (q: Rect) => avoid.reduce((s, a) => s + overlapArea(q, a), 0);
  // hard = 不能压的（终期审查修复 ⑩：屏上的 HUD 元素——FH5 地图的浮框原来与 60 个节点同权，挑了压住整条按键提示栏的位置）：先只在不压它们的候选里挑重叠最少的，
  // 每个候选都压到时再按原来的总重叠挑
  const hit = (q: Rect) => hard.some((a) => overlapArea(q, a) > 0);
  // 一组候选里挑：第一个整块在 bounds 里、不压 avoid 的；没有时压得最少的（strict = 跳过压到 hard 的）
  const scan = (list: Rect[], strict: boolean): { q: Rect; o: number } | null => {
    let b: Rect | null = null, bo = Infinity;
    for (const q of list) {
      if (!inside(q) || (strict && hit(q))) continue;
      const o = cost(q);
      if (o <= 0) return { q, o: 0 };
      if (o < bo) { bo = o; b = q; }
    }
    return b ? { q: b, o: bo } : null;
  };
  // 四个方向的候选都压到 hard 时（R4 回归修复 C1 ⑦）：左右的候选上下滑、上下的候选左右滑到挡路的 hard 块外面（夹在 bounds 里），离原位近的先试，仍只挑不压 hard 的；
  // 原来直接退回按总重叠挑（forza-horizon-5 地图：上面压页签条、右边压按键提示栏时，挑中压页签条的那个）。四个方向有不压 hard 的候选时与原来一样
  const slide = (): Rect[] => {
    const out: (Rect & { d: number })[] = [];
    const add = (x: number, y: number, o: { x: number; y: number }) => out.push({ x, y, w: size.w, h: size.h, d: Math.abs(x - o.x) + Math.abs(y - o.y) });
    for (const p of [right, left]) for (const a of hard) if (a.x < p.x + size.w && p.x < a.x + a.w) { add(p.x, clampY(a.y + a.h + gap), p); add(p.x, clampY(a.y - gap - size.h), p); }
    for (const p of [below, above]) for (const a of hard) if (a.y < p.y + size.h && p.y < a.y + a.h) { add(clampX(a.x + a.w + gap), p.y, p); add(clampX(a.x - gap - size.w), p.y, p); }
    return out.sort((p, q) => p.d - q.d).map((q) => ({ x: q.x, y: q.y, w: q.w, h: q.h }));
  };
  const got = (hard.length ? scan(cands, true) ?? scan(slide(), true) : null) ?? scan(cands, false);
  // 挑中的位置仍压到 avoid、调用方又要了外圈候选（extra：格组 / 节点图，轨道 E，§8 字号下限后浮框变宽、原来刚好放得下的空位放不下时）：把各候选沿压到的那几块左右 / 上下滑开（夹在 bounds 里），
  // 离原位近的先试，取第一个整块在 bounds 里、不压 avoid（也不压 hard）的；一个都没有时照原来的结果
  if (got && got.o > 0 && !hard.length && extra.length) {
    const out: (Rect & { d: number })[] = [];
    for (const p of cands) for (const a of avoid) {
      if (overlapArea(p, a) <= 0) continue;
      for (const [x, y] of [[a.x - gap - size.w, p.y], [a.x + a.w + gap, p.y], [p.x, a.y - gap - size.h], [p.x, a.y + a.h + gap]] as [number, number][]) {
        const q = { x: clampX(x), y: clampY(y), w: size.w, h: size.h };
        out.push({ ...q, d: Math.abs(q.x - p.x) + Math.abs(q.y - p.y) });
      }
    }
    const free = out.sort((p, q) => p.d - q.d).find((q) => inside(q) && cost(q) <= 0 && !hit(q));
    if (free) return { rect: { x: free.x, y: free.y, w: free.w, h: free.h }, overlap: 0 };
  }
  if (got) return { rect: got.q, overlap: got.o };
  const q0 = cands[0], best = { ...q0, x: clampX(q0.x), y: clampY(q0.y) };
  return { rect: best, overlap: cost(best) };
}
/** 锚点四周的候选位置（M12b-14）：8 个方向 × 3 圈（1 / 1.6 / 2.4 倍的「半个锚点 + gap + 半个框」；far = 再加 3.4 倍一圈——B8 审查修复 ㉕：格组排满一栏时往更外面找，节点图照旧 3 圈），由近到远；placeFloating 在四个正方向之后试 */
function nodeRing(a: Rect, f: { w: number; h: number }, gap: number, far = false): { x: number; y: number }[] {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2, out: { x: number; y: number; d: number }[] = [];
  for (const k of far ? [1, 1.6, 2.4, 3.4] : [1, 1.6, 2.4]) for (let j = 0; j < 8; j++) {
    const t = (j * Math.PI) / 4, dx = Math.cos(t) * (a.w / 2 + gap + f.w / 2) * k, dy = Math.sin(t) * (a.h / 2 + gap + f.h / 2) * k;
    out.push({ x: cx + dx - f.w / 2, y: cy + dy - f.h / 2, d: Math.hypot(dx, dy) });
  }
  return out.sort((p, q) => p.d - q.d).map(({ x, y }) => ({ x, y }));
}
/** 帧占位表里浮动详情要躲的：屏上元素、贴边条、触屏层、世界挂点（M12a-26 / B8：kind world） */
const occAvoid = (): Rect[] => (OCC.last?.items ?? []).filter((it) => !it.soft && !it.under && ['element', 'edgeBar', 'touch', 'world'].includes(it.kind)).map((it) => it.rect);

/**
 * 溢出提示（lay.overflow）。M12a-34：滚动条贴在被滚动的内容（content：网格画出来的那块，没有时整个数据区）右缘 / 底缘外 4，兼作网格与详情的分隔线
 * （原来贴数据区，网格没铺满时竖线跑到画面最右）；分页按 lay.pageIndicator 画——dots 底部页点（原来的，没设时就是它）、arrows 数据区两侧垂直居中的左右箭头
 * （vis.motif 选了母题时画花饰箭头）、numbers「1 / 3」、none 不画
 */
function drawOverflow(e: ElCtx, a: Rect, mode: string, content?: Rect, below = false, arrowsAt?: Rect, page?: Rect) {
  const g = e.g, S = (n: number) => n * e.k, c = content ?? a;
  switch (mode) {
    // 滚动条的位置跟内容（贴它的右缘 / 底缘），长度跟可视区（数据区）
    case 'scrollV': g.fillStyle = withAlpha(e.text, 0.15); g.fillRect(c.x + c.w + S(4), a.y, S(4), a.h); g.fillStyle = withAlpha(e.text, 0.5); g.fillRect(c.x + c.w + S(4), a.y, S(4), a.h * 0.35); return;
    case 'scrollH': g.fillStyle = withAlpha(e.text, 0.15); g.fillRect(a.x, c.y + c.h + S(4), a.w, S(4)); g.fillStyle = withAlpha(e.text, 0.5); g.fillRect(a.x, c.y + c.h + S(4), a.w * 0.3, S(4)); return;
    case 'paged': {
      // 分页指示（M12a-34：原来不读它、总画四个页点）：默认 auto = 页点（原来的画法），模板 / 复刻写了才换；旧皮肤只认皮肤之后的层选的（审查修复 A · D6：tpl.hero 的箭头不上旧皮肤）
      const v = e.r.str('lay.pageIndicator', 'auto'), ind = !v || v === 'auto' || (e.th.legacy && !chosen(e, 'lay.pageIndicator')) ? 'dots' : v;
      if (ind === 'none') return;
      if (ind === 'numbers') { const s = '1 / 3', o = { ...e.small, weight: 700, color: withAlpha(e.text, 0.8) }; T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y + a.h + S(2), LH(e, o), o); return; }
      // 箭头贴着实际画出的集合（M12b-64 ⑥，arrowsAt；数据区已经让出箭头的宽）
      if (ind === 'arrows') { pageArrows(e, arrowsAt ?? a, !!arrowsAt); return; }
      // 翻页角（M12b-53，obra-dinn#22；B9 · 16 的页签翻页角同一画法）：纸页（书的那一页 / 容器外框）右下角往里 2 卷起一角（B8 审查修复 ㉑：原来卷在数据区的角上，
      // Obra 日志的数据栏在右页中间，卷角浮在正文上、离页边 200）；没给纸页时照旧数据区
      if (ind === 'pageCurl') { pageCurl(e, page ? { x: page.x, y: page.y, w: page.w - 2, h: page.h - 2 } : a); return; }
      for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? e.accent : withAlpha(e.text, 0.3); g.beginPath(); g.arc(a.x + a.w / 2 + (i - 1.5) * S(14), a.y + a.h + S(10), S(4), 0, Math.PI * 2); g.fill(); }
      return;
    }
    // 下面还有内容的渐隐（edgeFade 的底边）
    case 'longScroll': edgeFade(e, a, 'bottom'); return;
    // 平移提示：只在皮肤之后的层显式选了 lay.overflow = pan 时画（M12a-29：模板 / 版式带出来的可拖动大画布不再自动加「拖动查看」；细化见 M12a-34）
    // 平移提示（M12a-29 / 34）：只在皮肤之后的层显式选了 lay.overflow = pan 时画；lay.pageIndicator = none 时不画；模板里有按键图例（el.prompt legend）时并进图例（info.ts 的 legendItems），这里不另画
    case 'pan': {
      // lay.panHint = none（M12b-66 ⑨，ghost-of-tsushima#21、elden-ring#37）也不画
      if (!postSkinKey(e, 'lay.overflow') || e.r.str('lay.pageIndicator', '') === 'none' || e.r.str('lay.panHint', 'auto') === 'none') return;
      if (e.r.elements().includes('el.prompt') && formsOf(e.r, 'el.prompt').includes('legend')) return;
      // 地图界面（M12a-30）：画在地图框外的底栏里（below），不压地图
      T(e, '✥ 拖动查看', a.x + a.w - W(e, '✥ 拖动查看', e.small) - S(6), below ? a.y + a.h + S(4) : a.y + a.h - LH(e, e.small) - S(4), LH(e, e.small), { ...e.small, color: withAlpha(e.text, 0.7) }); return;
    }
  }
}

/**
 * 还有内容的那一边的渐隐（lay.overflow = longScroll 的底边；B8 审查修复 ⑯：长图伸出数据区时顺着生长方向的两端也画）：内芯是材质（ast.core = texture）时渐隐成材质色压暗 10%，
 * 不再在纸面上铺一条深灰页脚带（M12a-06）；宽 40（设计单位）
 */
function edgeFade(e: ElCtx, a: Rect, side: 'top' | 'bottom' | 'left' | 'right') {
  const g = e.g, s = e.k * 40, mat = e.t.panel.material, mc = mat ? MATERIAL_BASE[mat] : undefined, end = mc ? mix(mc, '#000', 0.1) : '';
  const [x0, y0, x1, y1] = side === 'bottom' ? [0, a.y + a.h - s, 0, a.y + a.h] : side === 'top' ? [0, a.y + s, 0, a.y] : side === 'left' ? [a.x + s, 0, a.x, 0] : [a.x + a.w - s, 0, a.x + a.w, 0];
  const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, end ? withAlpha(end, 0) : 'rgba(0,0,0,0)'); gr.addColorStop(1, end ? withAlpha(end, 0.9) : 'rgba(0,0,0,0.35)'); g.fillStyle = gr;
  if (side === 'bottom') g.fillRect(a.x, a.y + a.h - s, a.w, s);
  else if (side === 'top') g.fillRect(a.x, a.y, a.w, s);
  else if (side === 'left') g.fillRect(a.x, a.y, s, a.h);
  else g.fillRect(a.x + a.w - s, a.y, s, a.h);
}

/**
 * 分页箭头（lay.pageIndicator = arrows，M12a-34：饥荒头像两侧的花饰箭头、XCOM 切换士兵）：数据区左右两侧外缘、垂直居中的一对三角；
 * 选了母题（vis.motif，皮肤之后的层 / 新皮肤的值）时箭头尾巴加两道卷须，是花饰箭头
 */
function pageArrows(e: ElCtx, a: Rect, hug = false) {
  const g = e.g, S = (n: number) => n * e.k, s = S(10), cy = a.y + a.h / 2;
  const motif = e.r.str('vis.motif', 'none'), fancy = motif !== 'none' && motif !== 'auto' && (!e.th.legacy || chosen(e, 'vis.motif'));
  const col = withAlpha(e.text, 0.85);
  // 贴着集合（M12b-64 ⑥）：箭头连同卷须整个在集合外面（离集合 4），不压条目
  const out = hug ? s * 1.1 + (fancy ? s * 1.5 : 0) + S(4) - S(6) : 0;
  for (const dir of [-1, 1]) {
    const tip = dir < 0 ? a.x - S(6) - out : a.x + a.w + S(6) + out, back = tip - dir * s * 1.1;
    g.save();
    g.fillStyle = col; g.strokeStyle = withAlpha('#000', 0.35); g.lineWidth = 1;
    g.beginPath(); g.moveTo(tip, cy); g.lineTo(back, cy - s); g.lineTo(back, cy + s); g.closePath(); g.fill(); g.stroke();
    if (fancy) {
      g.strokeStyle = col; g.lineWidth = Math.max(1, S(1.5)); g.lineCap = 'round';
      for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(back, cy + sy * s * 0.45); g.quadraticCurveTo(back - dir * s * 0.9, cy + sy * s * 1.2, back - dir * s * 1.5, cy + sy * s * 0.5); g.stroke(); }
    }
    g.restore();
    logTarget(g, { x: Math.min(tip, back) - S(4), y: cy - s - S(4), w: s * 1.1 + S(8), h: s * 2 + S(8) }, dir < 0 ? '上一页' : '下一页');
  }
}

/**
 * 翻页角（lay.pageIndicator = pageCurl，M12b-53）：右下角一块卷起的三角（下面露出的角压暗 + 卷起的那片取页色提亮 + 一道软投影），边长 26（设计单位）；
 * 登记点选（「下一页」）。Godot：页角 TextureRect（卷角纹理）
 */
function pageCurl(e: ElCtx, a: Rect) {
  const g = e.g, s = e.k * 26, x1 = a.x + a.w, y1 = a.y + a.h, paper = resolveColor(e.th.surface, e.pal);
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(x1 - s, y1); g.lineTo(x1, y1); g.lineTo(x1, y1 - s); g.closePath(); g.fill();
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = s * 0.3; g.shadowOffsetX = -s * 0.08; g.shadowOffsetY = -s * 0.08;
  g.fillStyle = mix(paper, '#ffffff', 0.18); g.beginPath(); g.moveTo(x1 - s, y1); g.lineTo(x1, y1 - s); g.lineTo(x1 - s * 0.82, y1 - s * 0.82); g.closePath(); g.fill();
  g.shadowColor = 'rgba(0,0,0,0)'; g.strokeStyle = withAlpha(e.text, 0.45); g.lineWidth = 1; g.stroke();
  g.restore();
  logTarget(g, { x: x1 - s, y: y1 - s, w: s, h: s }, '下一页');
}

/** 分页指示画箭头（M12b-64 ⑥）：lay.overflow = paged 且 lay.pageIndicator = arrows（旧皮肤只认皮肤之后选的，与 drawOverflow 同口径） */
function pageArrowsOn(e: ElCtx): boolean {
  if (e.r.str('lay.overflow', 'single') !== 'paged' || e.r.str('lay.pageIndicator', 'auto') !== 'arrows') return false;
  return !(e.th.legacy && !chosen(e, 'lay.pageIndicator'));
}
/** 翻页箭头连同卷须要的宽（数据区两侧各让这么多） */
const arrowW = (e: ElCtx) => e.k * 32;

/** 模板按钮（ix.mode / ix.confirm / ix.close = cancelBtn 补出来的）：多按钮 = 取消 + 确定，单一主按钮 = 确定，选中 + 确认 = 确认选择，长按 = 长按确认 */
/** 单一主按钮交给模板按钮行（M12b-14）：显式选了 ix.mode = singleCTA、这一屏没放行动号召元素、有常驻详情栏 / 记录页时，按钮行那一颗写详情的主动作，详情栏不画按钮 */
function singleCtaInRow(e: ElCtx): boolean {
  const r = e.r, l = r.src('ix.mode')?.layer;
  if (!l || ['default', 'fallback', 'ruleDefault', 'derived'].includes(l) || r.str('ix.mode', '') !== 'singleCTA' || r.elements().includes('el.cta')) return false;
  return DETAIL_COLUMNS.has(r.str('lay.detail', 'none')) || r.str('cnt.dataShape', '') === 'record';
}
function buttonLabels(e: ElCtx): string[] {
  const mode = e.r.str('ix.mode', 'readOnly'), confirm = e.r.str('ix.confirm', 'instant');
  // 单一主按钮并进按钮行（M12b-14）：写详情的主动作（按界面取，没写时「确定」）
  if (singleCtaInRow(e)) { const b = detailOf(e).buttons?.[0] ?? (textFor('buttons', e.r) ?? pack().menu.buttons)[0] ?? '确定'; return closeKind(e) === 'cancelBtn' ? ['取消', b] : [b]; }
  // 关不掉的结束方式（forced / timed / tapAnywhere / tapOutside）不补取消钮（M12b-64 ⑧，closeKind）
  const cancel = closeKind(e) === 'cancelBtn';
  const labels0 = mode === 'multiButton' ? ['取消', '确定'] : mode === 'singleCTA' ? ['确定'] : mode === 'select' && confirm === 'selectConfirm' ? ['确认选择'] : confirm === 'hold' ? ['长按确认'] : [];
  return cancel && !labels0.includes('取消') ? ['取消', ...labels0] : labels0;
}

/** 按钮行的一项：宽、画法（给它在行里的矩形）、是不是流程演示要点的主按钮 */
interface RowItem { w: number; h: number; draw: (r: Rect) => void; cta?: boolean; back?: boolean; hang?: boolean }
/**
 * 模板底部的按钮行（M12a-35）：模板按钮（取消 = back、确定 / 确认选择 / 长按确认 = confirm 角色）、运营动作（ops.actions）、模板里的 el.cta 并成一行，
 * 贴内框底边右对齐（左起：运营动作 → 模板按钮 → 行动号召），行高 = 最高的一项。drawScreen 先按 rowPlan 从主体底部扣掉这一行，数据区不再被按钮压住
 * （原来按钮直接画在内框底部、el.cta 按锚点画在容器底边中间、运营按钮挂在面板右下，都会压住列表 / 表格的最后一行）
 */
function rowPlan(e: ElCtx, d: DrawCtx, th: Theme, R: Rect, what: 'cta' | 'buttons' | 'opsOnly', opsOn: boolean): { h: number; items: RowItem[] } {
  const S = (n: number) => n * e.k, r = e.r;
  const items: RowItem[] = [];
  // 运营动作（「今日不再显示」是左下角的勾选字，不进按钮行）
  if (opsOn) {
    // retry：抽卡结果页是「再抽 10 次」，其余（本局总结 / 失败页）是「再来一局」
    // reroll（M12b-60，hades#41）：一颗小骰子 + 剩余次数的小按钮（不是抽卡的「再抽 N 次」大按钮），次要按钮样式
    const L: Record<string, string> = { retry: /gacha/i.test(r.str('cnt.subtype', '')) ? '再抽 10 次' : '再来一局', share: '分享', adDouble: '▶ 看广告翻倍', reroll: `⚄ ×${DATA.rerolls ?? 3}` };
    const bh = Math.max(S(38), tap(e));
    for (const k of r.list('ops.actions')) {
      if (k === 'dontShow') continue;
      const l = L[k] ?? k;
      items.push({ w: Math.max(W(e, l, buttonText(e, bh)) + S(k === 'reroll' ? 18 : 32), tap(e)), h: bh, draw: (rr) => button(e, rr, l, k === 'retry' || k === 'adDouble') });
    }
  }
  if (what === 'buttons') {
    const confirm = r.str('ix.confirm', 'instant'), labels = buttonLabels(e);
    const bh = Math.max(S(36), tap(e));
    labels.forEach((l, i) => {
      const last = i === labels.length - 1, role = l === '取消' ? 'back' : 'confirm';
      items.push({ w: Math.max(W(e, l, buttonText(e, bh)) + S(36), tap(e), S(96)), h: bh, cta: last, back: role === 'back', draw: (rr) => {
        button(e, rr, l, role);
        if (confirm === 'hold' && last) { e.g.fillStyle = withAlpha('#fff', 0.35); e.g.fillRect(rr.x, rr.y + rr.h - S(4), rr.w * 0.4, S(4)); }
      } });
    });
  } else if (what === 'cta') {
    // 模板里的行动号召（el.cta）：按元素自己的画法画在按钮行最右；宽按文字算（wide 原来至少 300 宽，在模板里成了压住表格的大按钮）
    const def = ELEMENTS.get('el.cta')!, ce = makeCtx('el.cta', d.ctx, d.t ?? d.ctx, th, R), sz = def.size(ce), f = ce.forms[0];
    const bt = buttonText(ce.part('button'), sz.h), { start, back } = ctaText(r);
    if (CTA_SPLIT.has(f)) {
      // 分角双钮 / 箭头钮对（M12b-17）：拆成返回（back，按钮行 split 时在左端）与主钮两颗；箭头钮对的外形 = 左 / 右箭头
      const bh = Math.max(S(36), tap(e)), arrow = f === 'confirmBack', bt2 = buttonText(ce.part('button'), bh);
      const bw = (l: string) => Math.max(W(ce, l, bt2) + S(36) + (arrow ? bh * 0.4 : 0), tap(e), S(96));
      items.push({ w: bw(back), h: bh, back: true, draw: (rr) => button(ce, rr, back, 'back', true, 'button', arrow ? 'arrowLeft' : undefined) });
      items.push({ w: bw(start), h: bh, cta: true, draw: (rr) => button(ce, rr, start, 'confirm', true, 'button', arrow ? 'arrowRight' : undefined) });
    } else {
      const w = f === 'wide' ? Math.max(tap(ce), W(ce, start, bt) + 56 * ce.k) : f === 'dual' ? Math.max(sz.h * 3, (W(ce, back, bt) + W(ce, start, bt)) * 1.3 + 80 * ce.k) : f === 'shutter' ? W(ce, start, { ...ce.title, size: 20 * ce.k }) + 64 * ce.k : sz.w;
      // 贴边页签钮（edgeTab，M12b-17，into-the-breach#30）：drawScreen 排完按钮行后挂到容器右下边的外沿
      items.push({ w, h: sz.h, cta: true, ...(f === 'edgeTab' ? { hang: true } : {}), draw: (rr) => def.draw(ce, rr) });
    }
  }
  return { h: items.length ? Math.max(...items.map((x) => x.h)) : 0, items };
}
/**
 * 按钮行的对齐（lay.buttonRowAlign，M12b-64 ③）：start / center / end / split（返回 / 取消在左、其余在右）；auto = 行里并进了模板的行动号召、
 * el.cta.screenAnchor 显式给了时跟它所在的列（bc → 居中，slay-the-spire#44；bl → 靠左，disco-elysium#46），否则原来的右对齐。
 * 旧皮肤：皮肤之前的层给的 el.cta.screenAnchor（tpl.settle 的 bc）不算。Godot：HBoxContainer.alignment（split = 两个 HBox 中间一个 expand 的空 Control）
 */
function rowAlign(e: ElCtx, ctaRow: boolean): RowAlign {
  const v = e.r.str('lay.buttonRowAlign', 'auto');
  if (v === 'start' || v === 'center' || v === 'end' || v === 'split') return v;
  // 分角双钮 / 箭头钮对（M12b-17）：返回在左端、主钮在右端
  if (ctaRow && CTA_SPLIT.has(formsOf(e.r, 'el.cta')[0] ?? '')) return 'split';
  // 品质下限（审查修复 E 视觉 ⑥）：模板预设写的锚点在旧皮肤上也算（结算的继续钮居中），只在 HUD 主画布上
  if (!ctaRow || !anchorGiven(e.r, 'el.cta') || (e.th.legacy && !afterSkin(e.r, e.r.elKey('el.cta', 'screenAnchor')) && !(QUALITY.on && isHudCanvas(e.g)))) return 'end';
  const a = String(e.r.el('el.cta', 'screenAnchor') ?? 'br');
  return COL_LEFT.has(a) ? 'start' : ['tc', 'center', 'bc'].includes(a) ? 'center' : 'end';
}
type RowAlign = 'start' | 'center' | 'end' | 'split';
/**
 * 按钮行里每一项的矩形（画的顺序）：avoid = 容器面板的饰件占位（M12a-08）——按钮行从右下角花的左边起排（靠左时从左下角花的右边起）。
 * 模板占位与 inherit 元素的避让用实际按钮的外接框（buttonRowBox），不用整行（M12b-64）
 */
function buttonRowLayout(e: ElCtx, a: Rect, row: { h: number; items: RowItem[] }, avoid: Rect[] = [], align: RowAlign = 'end'): { it: RowItem; rr: Rect }[] {
  const S = (n: number) => n * e.k;
  const y0 = a.y + a.h - row.h, xr = clearOf(avoid, y0, a.y + a.h, a.x + a.w, -1, S(6));
  const out: { it: RowItem; rr: Rect }[] = [];
  // 一行按钮等高（审查修复 E 视觉 ⑥：结算的「分享」比「继续」矮一截）：品质下限开着、画在 HUD 主画布上时每颗都取行高
  const eq = QUALITY.on && isHudCanvas(e.g);
  const put = (it: RowItem, x: number) => out.push({ it, rr: { x, y: eq ? y0 : y0 + (row.h - it.h) / 2, w: it.w, h: eq ? row.h : it.h } });
  if (align === 'end') {
    let x = xr;
    for (const it of [...row.items].reverse()) {
      x -= it.w;
      put(it, x);
      x -= S(10);
    }
    return out;
  }
  const xl = clearOf(avoid, y0, a.y + a.h, a.x, 1, S(6)), gap = S(10);
  const span = (list: RowItem[]) => list.reduce((t, it) => t + it.w, 0) + gap * Math.max(0, list.length - 1);
  const run = (list: RowItem[], x0: number) => { let x = x0; for (const it of list) { put(it, x); x += it.w + gap; } };
  if (align === 'split') {
    const L = row.items.filter((it) => it.back), Rr = row.items.filter((it) => !it.back);
    run(L, xl);
    run(Rr, Math.max(xl + span(L) + (L.length ? gap : 0), xr - span(Rr)));
    return out;
  }
  const w = span(row.items);
  run(row.items, align === 'start' ? xl : Math.max(xl, Math.min(xr - w, a.x + a.w / 2 - w / 2)));
  return out;
}
/** 按钮行实际按钮的外接框（没有按钮时 null） */
function buttonRowBox(L: { rr: Rect }[]): Rect | null {
  if (!L.length) return null;
  const x0 = Math.min(...L.map((q) => q.rr.x)), y0 = Math.min(...L.map((q) => q.rr.y));
  return { x: x0, y: y0, w: Math.max(...L.map((q) => q.rr.x + q.rr.w)) - x0, h: Math.max(...L.map((q) => q.rr.y + q.rr.h)) - y0 };
}
function drawButtonRow(L: { it: RowItem; rr: Rect }[]) {
  for (const { it, rr } of L) { it.draw(rr); if (it.cta) CTA_RECT = rr; }
}

/** 多行文字断行：paint.ts 的 wrapLines（M12a-33：CJK 避头尾、拉丁按词；原来逐字断、逗号句号会排到行首） */
const wrapText = (e: ElCtx, s: string, w: number, o: Partial<TextOpts>): string[] => wrapLines(e.tx, s, w, { ...e.base, ...o });


/* ---------------- 流程演示（M9b） ---------------- */

let FOCUS_RECT: Rect | null = null;
/** 列表 / 菜单行在行底下已经画过焦点的那一行（M12a-27）：最后的焦点层不再重画 */
let FOCUS_DRAWN: Rect | null = null;
let CTA_RECT: Rect | null = null;
let CONFIRM_RECT: Rect | null = null;
let FIRST_ITEM: Rect | null = null;
/** 这一屏画出来的条目（列表行、网格格、地图 / 树 / 路径的节点，M12a-26）：浮动详情的避让表；CURRENT_NODE = 「当前」那个节点（没有条目焦点时浮动详情锚在它旁边） */
const ITEMS: Rect[] = [];
/** 主体实际画出的范围（M12b-64 ①：大字主体只占字那一块；其余主体整栏），screenPass 每遍复位 */
let FOCAL_BOX: Rect | null = null;
/** 列表实际画出的外接框（M12b-64 ⑥：翻页箭头贴着它），drawData 之前复位 */
let LIST_BOX: Rect | null = null;
let CURRENT_NODE: Rect | null = null;
/** 画节点并登记（drawNode 返回节点的矩形，M12a-26：network / pathNodes / mapView 的节点进浮动详情的避让表） */
function nodeAt(e: ElCtx, x: number, y: number, spec: Parameters<typeof drawNode>[3]): Rect {
  const q = drawNode(e, x, y, spec);
  ITEMS.push(q);
  if (spec.state === 'current' && !CURRENT_NODE) CURRENT_NODE = q;
  return q;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** 条目登记：第一个条目（引导的后备目标）、流程演示高亮的条目 */
/**
 * 只读的列表 / 网格不默认焦点、不选中第一格（M12b-67）。旧皮肤冻结：只在皮肤之后的层选了 ix.mode 时才这样（中期审查修复 ⑧：模板预设写的 readOnly——图鉴、
 * 制作人员、公告、读取、对阵、过场、章节卡——原来让 14 个旧皮肤的第一格丢了选中标记）
 */
export function readOnlyNoFocus(e: ElCtx): boolean {
  return e.r.str('ix.mode', '') === 'readOnly' && (!e.th.legacy || !!chosenKey(e, 'ix.mode'));
}
function markItem(e: ElCtx, rr: Rect, i: number, focus = true) {
  ITEMS.push(rr);
  // focus = false：只进条目表（浮动详情的避让表，锚点退到 ITEMS[0]），不接第一个条目与导航焦点（环 / 十字原来没有焦点框、引导也不指它，审查修复 A · D7）
  if (!focus) return;
  if (!FIRST_ITEM) FIRST_ITEM = rr;
  const fl = flowNow();
  // 焦点：流程演示指定的条目；手柄 / 键盘导航时（或手动设了 ix.focus）默认第一个条目——只读的列表 / 网格不默认（M12b-67，into-the-breach#37、Balatro 图鉴）
  const want = fl?.s.focus !== undefined ? fl.s.focus : focusActive(e) && !readOnlyNoFocus(e) ? 0 : -1;
  if (want !== i || FOCUS_RECT) return;
  FOCUS_RECT = rr;
}

/** 导航焦点是否要画：手柄 / 混合输入，或手动设了 ix.focus */
function focusActive(e: ElCtx): boolean {
  const input = e.r.str('ctx.input', 'kbm');
  const layer = e.r.src('ix.focus')?.layer;
  return input === 'pad' || input === 'hybrid' || (!!layer && layer !== 'fallback' && layer !== 'default');
}

/**
 * 焦点画法（ix.focus，M10；§2 的 focusDecor(e, rect, mode)）：描边 / 反色 / 放大浮起 / 光标手指 / 发光 / 侧边条 / 笔刷底。mode 不给时读 ix.focus。
 * 颜色 = 焦点色（col.focus，auto = 强调色，M12a-27 起读它）；笔刷底（brushSwash）在暗色面板上用正片叠底看不见，改成正常混合的浅色笔刷（面板字色），
 * 这时返回面板底色——调用方把这一行的字（与图标，M12b-67）换成它（Ghost of Tsushima：黑底上一笔白色笔刷带 + 深色字）；笔刷带收在行矩形以内（M12b-67：原来左右伸出列表栏）。
 * bar（M12b-67，cities-skylines#22）：行底下没有不透明的盒子（直接压在场景上）时焦点带不透明（0.85）、返回焦点色上的反差字色；压在面板上照旧 18% 淡带。返回 null = 字色不变
 */
function focusDecor(e: ElCtx, rr: Rect, mode0?: string): string | null {
  // 多选（M12b-60，§2：ix.focus 改多选，outline + scale = FH5 的放大 + 描边）：按选的顺序一种一种画，字色取最后一个改字色的
  const fl = flowNow();
  const modes0 = (mode0 ?? e.r.str('ix.focus', 'outline')).split(',').map((x) => x.trim()).filter((x) => x && x !== 'auto');
  const modes1 = !mode0 && fl && !focusActive(e) ? ['focusGlow'] : modes0.length ? modes0 : ['outline'];
  // 只选了只换字色的模式（textColor）时，最后一层（格子、卡、节点这些没有行字可换色的目标）补一道描边（B6 审查修复 ㉓：原来什么都不画，手柄停在哪一格看不出来）；
  // 列表 / 菜单行已经在字底下换过字色，不走最后一层（FOCUS_DRAWN），对话选项不走 focusDecor
  const modes = mode0 === undefined && modes1.every((m) => m === 'textColor') ? [...modes1, 'outline'] : modes1;
  let inv: string | null = null;
  for (const m of modes) { const c = focusOne(e, rr, m, mode0 !== undefined); if (c) inv = c; }
  return inv;
}
/** 画一种焦点（focusDecor 的一项）：row = 画在行字底下（调用方给了 mode）；返回这一行的字要换成的颜色（null = 不换） */
function focusOne(e: ElCtx, rr: Rect, mode: string, row: boolean): string | null {
  const g = e.g, S = (n: number) => n * e.k;
  const mode0 = row ? mode : undefined;
  const fc = e.focus;
  const dark = luminance(resolveColor(e.th.surface, e.pal)) < 0.35;
  let inverted: string | null = null;
  // bar 的底：画在行字底下时（调用方给了 mode）先看行底下有没有不透明的盒子（没有 = 压在场景上）；最后一层的焦点框压在字上，照旧淡带
  const bare = mode0 !== undefined && mode === 'bar' && !e.th.legacy && !colorUnder(g, rr.x + rr.w / 2, rr.y + rr.h / 2, 0.3);
  g.save();
  switch (mode) {
    case 'invert':
      g.globalCompositeOperation = 'difference'; g.fillStyle = '#ffffff'; g.fillRect(rr.x, rr.y, rr.w, rr.h);
      break;
    case 'scale':
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
      g.strokeStyle = fc; g.lineWidth = 3; g.strokeRect(rr.x - 6, rr.y - 6, rr.w + 12, rr.h + 12);
      break;
    case 'cursor': {
      const x = rr.x - S(8), y = rr.y + rr.h / 2;
      // 光标集（ix.cursorSet，M12b-59，fam.jrpg 的手指 / 三角光标）选过时画那支光标：三角 / 指手的尖指着这一项左沿，手套 / 箭头 / 十字落在这一项上
      const kind = cursorSetOf(e);
      if (kind) { const pointy = kind === 'triangle' || kind === 'finger'; drawCursor(g, kind, pointy ? x : rr.x + rr.w * 0.72, pointy ? y : rr.y + rr.h * 0.42, S(pointy ? 22 : 20), cursorInk(e, fc)); break; }
      g.fillStyle = fc; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - S(16), y - S(10)); g.lineTo(x - S(16), y + S(10)); g.closePath(); g.fill(); g.stroke();
      break;
    }
    // 整格填色（M12b-60，factorio#6）：整块填焦点色、图标不反色——画在行字底下时实心填、字换成焦点色上的反差色；最后一层（格子已经画完）时按面板明暗用正片叠底 / 滤色混进格子，图标照样看得见
    case 'fill': {
      if (row) { g.fillStyle = withAlpha(fc, 0.92); g.fillRect(rr.x, rr.y, rr.w, rr.h); inverted = onColorOf(fc, resolveColor(e.th.surface, e.pal)); break; }
      g.globalCompositeOperation = dark ? 'screen' : 'multiply'; g.fillStyle = withAlpha(fc, 0.85); g.fillRect(rr.x, rr.y, rr.w, rr.h);
      g.globalCompositeOperation = 'source-over'; g.strokeStyle = fc; g.lineWidth = Math.max(1.5, S(2)); g.strokeRect(rr.x, rr.y, rr.w, rr.h);
      break;
    }
    // 只换字色（M12b-60，disco-elysium#37）：不画底、不描边，这一行的字换成焦点色（最后一层上没有字可换：什么都不画）
    case 'textColor':
      if (row) inverted = fc;
      break;
    case 'focusGlow':
      g.shadowColor = fc; g.shadowBlur = 14; g.strokeStyle = fc; g.lineWidth = 3;
      g.strokeRect(rr.x - 3, rr.y - 3, rr.w + 6, rr.h + 6);
      break;
    case 'bar':
      g.fillStyle = withAlpha(fc, bare ? 0.85 : 0.18); g.fillRect(rr.x, rr.y, rr.w, rr.h);
      g.fillStyle = fc; g.fillRect(rr.x - S(8), rr.y, S(5), rr.h);
      if (bare) inverted = onColorOf(fc, resolveColor(e.th.surface, e.pal));
      break;
    case 'cornerFlourish': {
      // 四角花焦点（M12b-49，hollow-knight#16）：目标背后一团焦点色的淡光晕（滤色叠加）+ 四角各一片小角花（当前母题，没有时花叶）
      // 光晕按目标自己的形：椭圆，两个半轴 = 目标半宽 / 半高 + 外扩（外扩 = 那条边的 25%，夹在 8~24）——B4 审查修复：原来是半径 0.75 × 长边的方块光晕，
      // 长条的列表行 / 存档行上一层 1158 × 1158 的焦点色洗满整屏
      const cx = rr.x + rr.w / 2, cy = rr.y + rr.h / 2, ext = (d: number) => Math.min(S(24), Math.max(S(8), d * 0.25)), ax = rr.w / 2 + ext(rr.w), ay = rr.h / 2 + ext(rr.h);
      // 光晕只画在目标外面（evenodd 裁掉格子本身）：看起来在格子背后，不把格子里的图标洗白
      g.save(); g.beginPath(); g.rect(cx - ax, cy - ay, ax * 2, ay * 2); g.rect(rr.x, rr.y, rr.w, rr.h); g.clip('evenodd');
      g.translate(cx, cy); g.scale(ax, ay);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, withAlpha(fc, 0.38)); gr.addColorStop(1, withAlpha(fc, 0));
      g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
      flourishCorners(g, rr, Math.max(6 * e.k, Math.min(18 * e.k, Math.min(rr.w, rr.h) * 0.3)), e.t.panel.ornament?.motif ?? 'none', fc);
      break;
    }
    case 'brushSwash': {
      // 暗色面板：正常混合、浅色笔刷（字色）；亮色面板照旧正片叠底的焦点色。笔锋收在行内（左右各留 2，M12b-67）
      if (dark) { g.fillStyle = withAlpha(e.text, 0.92); inverted = resolveColor(e.th.surface, e.pal); } else { g.globalCompositeOperation = 'multiply'; g.fillStyle = withAlpha(fc, 0.55); }
      const x0 = rr.x + S(2), x1 = rr.x + rr.w - S(2);
      // 选过干笔刷参数（vis.brushDryness / brushDir / brushTip，M12b-39）时笔刷带用同一个干笔刷外形（两端收尖、尾部飞白）；没选时原来的两段曲线
      const bp = e.t.panel.brush;
      if (bp) { drawBox(g, { x: x0, y: rr.y + rr.h * 0.1, w: x1 - x0, h: rr.h * 0.8 }, { bg: { solid: String(g.fillStyle) }, shape: 'brushStroke', brush: bp, seed: 29 }, e.pal); break; }
      g.beginPath(); g.moveTo(x0, rr.y + rr.h * 0.7);
      g.quadraticCurveTo(rr.x + rr.w * 0.3, rr.y + rr.h * 0.15, x1, rr.y + rr.h * 0.35);
      g.lineTo(x1 - S(6), rr.y + rr.h * 0.85);
      g.quadraticCurveTo(rr.x + rr.w * 0.4, rr.y + rr.h * 1.05, x0, rr.y + rr.h * 0.7); g.fill();
      break;
    }
    default:
      g.strokeStyle = fc; g.lineWidth = 3; g.strokeRect(rr.x - 3, rr.y - 3, rr.w + 6, rr.h + 6);
  }
  g.restore();
  return inverted;
}

interface RevealXf { hidden: boolean; back: boolean; alpha: number; dx: number; dy: number; scale: number; sx: number }
const SHOWN: RevealXf = { hidden: false, back: false, alpha: 1, dx: 0, dy: 0, scale: 1, sx: 1 };

function revealMode(e: ElCtx): string {
  const m = e.r.str('mo.reveal', 'flyIn');
  return !m || m === 'auto' ? 'flyIn' : m;
}

/** 条目 i（共 n 个）在揭示演出 / 入场阶段的状态（mo.reveal） */
function revealOf(e: ElCtx, i: number, n: number, rr: Rect, area: Rect): RevealXf {
  const fl = flowNow();
  if (!fl || (fl.s.stage !== 'ceremony' && fl.s.stage !== 'entry')) return SHOWN;
  // 入场阶段只有"选择型"的集合（三选一）做飞入；抽卡入口之类不动
  if (fl.s.stage === 'entry' && e.r.str('cnt.subtype', '') !== 'draft3') return SHOWN;
  const p = fl.p, mode = fl.s.stage === 'entry' ? 'flyIn' : revealMode(e);
  const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
  const fly = (start: number, dur: number, spin = false): RevealXf => {
    const k = clamp01((p - start) / dur);
    if (k <= 0) return { ...SHOWN, hidden: true };
    const q = EASE.easeOut(k);
    return { ...SHOWN, alpha: k, dx: (cx - (rr.x + rr.w / 2)) * (1 - q), dy: (cy - (rr.y + rr.h / 2)) * (1 - q) + (fl.s.stage === 'entry' ? (1 - q) * 90 : 0), scale: 0.35 + 0.65 * (spin ? EASE.overshoot(k) : q) };
  };
  const step = 0.6 / Math.max(1, n);
  switch (mode) {
    case 'direct': case 'capture': return p > 0.15 ? SHOWN : { ...SHOWN, hidden: true };
    case 'chest': return p < 0.42 ? { ...SHOWN, hidden: true } : fly(0.42 + i * (0.45 / Math.max(1, n)), 0.18);
    case 'flip': {
      const s0 = 0.12 + i * step, k = clamp01((p - s0) / 0.14);
      if (k <= 0) return { ...SHOWN, back: true };
      return k < 0.5 ? { ...SHOWN, back: true, sx: Math.cos(k * Math.PI) } : { ...SHOWN, sx: -Math.cos(k * Math.PI) };
    }
    case 'unfold': { const edge = area.x + area.w * EASE.easeOut(clamp01(p * 1.25)); return rr.x + rr.w / 2 < edge ? SHOWN : { ...SHOWN, hidden: true }; }
    case 'spin': return fly(0.1 + i * step, 0.25, true);
    default: return fly(0.1 + i * step, 0.2);
  }
}

function withReveal(e: ElCtx, rr: Rect, xf: RevealXf, draw: () => void, tier: number) {
  if (xf.hidden) return;
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  const cx = rr.x + rr.w / 2, cy = rr.y + rr.h / 2;
  for (const c of ctxs) { c.save(); c.globalAlpha *= xf.alpha; c.translate(cx + xf.dx, cy + xf.dy); c.scale(xf.scale * Math.max(0.02, Math.abs(xf.sx)), xf.scale); c.translate(-cx, -cy); }
  if (xf.back) cardBack(e, rr, tier); else draw();
  for (const c of ctxs) c.restore();
}

/** 卡背；先预告稀有度（mo.revealTease）时，高稀有度的卡背发出稀有度颜色的光 */
function cardBack(e: ElCtx, rr: Rect, tier: number) {
  const g = e.g;
  if (e.r.bool('mo.revealTease') && tier >= 3) {
    const c = rarityColor(e, tier);
    const gr = g.createRadialGradient(rr.x + rr.w / 2, rr.y + rr.h / 2, 2, rr.x + rr.w / 2, rr.y + rr.h / 2, Math.max(rr.w, rr.h) * 0.9);
    gr.addColorStop(0, withAlpha(c, 0.7)); gr.addColorStop(1, withAlpha(c, 0));
    g.fillStyle = gr; g.fillRect(rr.x - rr.w * 0.4, rr.y - rr.h * 0.4, rr.w * 1.8, rr.h * 1.8);
  }
  panel(e, rr, true, { radius: 6, bg: { solid: mix(e.accent, '#000', 0.55) }, border: { width: 2, color: withAlpha('#fff', 0.5) } });
  icon(e, '✦', rr.x + rr.w / 2, rr.y + rr.h / 2, Math.min(rr.w, rr.h) * 0.3, withAlpha('#fff', 0.75));
}

/** 奖励演出强度（mo.reward 0–3） */
const rewardLevel = (e: ElCtx) => { const v = e.r.num('mo.reward', 1); return Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : 1; };

/** 揭示演出的背景：转动的光芒、开箱、粒子、闪白 */
function ceremonyFx(e: ElCtx, a: Rect) {
  const fl = flowNow();
  if (!fl) return;
  const g = e.g, k = rewardLevel(e), p = fl.p, t = fl.t;
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2, R0 = Math.hypot(a.w, a.h) * 0.6;
  const c = rarityColor(e, 4);
  const mode = revealMode(e);
  const burst = mode === 'chest' ? 0.42 : 0.12;
  if (k > 0 && p > burst) {
    g.save(); g.translate(cx, cy); g.rotate(t * 0.4);
    const n = 10 + 6 * k;
    for (let i = 0; i < n; i++) {
      g.rotate((Math.PI * 2) / n);
      g.fillStyle = withAlpha(c, 0.05 + 0.04 * k);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(R0, -R0 * 0.06); g.lineTo(R0, R0 * 0.06); g.closePath(); g.fill();
    }
    g.restore();
    // 粒子：从中心向外
    for (let i = 0; i < k * 12; i++) {
      const ang = (i * 2.399) % (Math.PI * 2), q = clamp01((p - burst) * 1.6 + (i % 5) * 0.04);
      g.fillStyle = withAlpha(i % 3 ? '#fff' : c, 1 - q);
      g.beginPath(); g.arc(cx + Math.cos(ang) * q * R0 * 0.7, cy + Math.sin(ang) * q * R0 * 0.5, 2 + (i % 3), 0, Math.PI * 2); g.fill();
    }
  }
  if (mode === 'chest' && p < 0.5) {
    // 宝箱：抖动越来越厉害，到点炸开
    const s = Math.min(a.w, a.h) * 0.32, amp = p < 0.42 ? Math.sin(t * 60) * 6 * (p / 0.42) : 0;
    const bx = cx - s / 2 + amp, by = cy - s * 0.35;
    if (p < 0.42) {
      g.fillStyle = '#7a4a22'; g.fillRect(bx, by + s * 0.25, s, s * 0.45);
      g.fillStyle = '#9a6030'; g.fillRect(bx - 4, by, s + 8, s * 0.3);
      g.fillStyle = '#e3b341'; g.fillRect(bx + s * 0.44, by + s * 0.18, s * 0.12, s * 0.2);
      g.fillStyle = withAlpha(c, 0.6 * (p / 0.42)); g.fillRect(bx, by + s * 0.27, s, 3);
    }
  }
  // 闪白
  const fl0 = k * 0.22 * clamp01(1 - Math.abs(p - burst) / 0.06);
  if (fl0 > 0.01) { g.fillStyle = `rgba(255,255,255,${fl0.toFixed(3)})`; g.fillRect(a.x - a.w, a.y - a.h, a.w * 3, a.h * 3); }
}

/** 升级：等级数字滚动 + 弹一下 */
function levelRoll(e: ElCtx, a: Rect, ink?: string) {
  const fl = flowNow();
  const S = (n: number) => n * e.k;
  const p = fl?.s.stage === 'ceremony' ? fl.p : 1;
  const lv = p < 0.55 ? 7 : 8;
  const pop = p < 0.55 ? 1 : 1 + 0.35 * (1 - EASE.easeOut(clamp01((p - 0.55) / 0.25)));
  const o = { ...e.title, size: S(44) * pop, color: lv === 8 ? '#ffd34d' : ink ?? e.title.color, outline: { color: 'rgba(0,0,0,0.5)', width: 2 } };
  const s = `Lv.${lv}`;
  T(e, s, a.x + a.w / 2 - W(e, s, o) / 2, a.y - S(70), o.size * 1.4, o);
}

/** 建造：幽灵预览 + ✓ / ✕（ix.confirm = ghost） */
function ghostPlace(e: ElCtx, R: Rect, tray: Rect) {
  const fl = flowNow();
  const stage = fl?.s.stage ?? 'main';
  if (stage === 'entry') return;
  const S = (n: number) => n * e.k, g = e.g;
  const cx = R.x + R.w * 0.5, cy = Math.min(tray.y - S(90), R.y + R.h * 0.42), s = S(60);
  const ok = true;
  g.save();
  g.fillStyle = withAlpha(ok ? e.good : e.bad, 0.35); g.strokeStyle = ok ? e.good : e.bad; g.lineWidth = 2; g.setLineDash([6, 4]);
  g.beginPath(); g.moveTo(cx, cy - s * 0.5); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s * 0.5); g.lineTo(cx - s, cy); g.closePath(); g.fill(); g.stroke();
  g.setLineDash([]);
  g.fillStyle = withAlpha(ok ? e.good : e.bad, 0.22); g.fillRect(cx - s * 0.6, cy - s * 1.3, s * 1.2, s * 1.1); g.strokeRect(cx - s * 0.6, cy - s * 1.3, s * 1.2, s * 1.1);
  g.restore();
  const b = Math.max(S(36), tap(e));
  const okR = { x: cx + s + S(10), y: cy - b, w: b, h: b }, noR = { x: cx + s + S(10), y: cy + S(6), w: b, h: b };
  g.fillStyle = e.good; g.beginPath(); g.arc(okR.x + b / 2, okR.y + b / 2, b / 2, 0, Math.PI * 2); g.fill(); icon(e, '✓', okR.x + b / 2, okR.y + b / 2, b * 0.5, '#fff');
  g.fillStyle = e.bad; g.beginPath(); g.arc(noR.x + b / 2, noR.y + b / 2, b / 2, 0, Math.PI * 2); g.fill(); icon(e, '✕', noR.x + b / 2, noR.y + b / 2, b * 0.45, '#fff');
  logTarget(g, okR, '确认放置'); logTarget(g, noR, '取消');
  CONFIRM_RECT = okR;
}

/** 二次确认弹窗（ix.confirm）：双按钮 / 长按；即点即生效与"选中 + 确认"不弹窗 */
function confirmModal(e: ElCtx, R: Rect, ask: string): Rect | null {
  // 流程里写了确认提示、模板又没定确认机制时，按二次确认弹窗画
  const layer = e.r.src('ix.confirm')?.layer;
  const mode = layer === 'fallback' || layer === 'default' || !layer ? 'double' : e.r.str('ix.confirm', 'double');
  if (mode === 'instant' || mode === 'selectConfirm' || mode === 'ghost') return CONFIRM_RECT;
  const fl = flowNow();
  const S = (n: number) => n * e.k, g = e.g;
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(R.x, R.y, R.w, R.h);
  const w = Math.max(S(360), W(e, ask, e.base) + S(64)), bh = Math.max(S(40), tap(e)), h = S(90) + LH(e, e.base) + bh;
  const m = { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h };
  const pop = fl ? EASE.overshoot(clamp01(fl.t / 0.25)) : 1;
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  for (const c of ctxs) { c.save(); c.translate(m.x + w / 2, m.y + h / 2); c.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop); c.translate(-(m.x + w / 2), -(m.y + h / 2)); }
  panel(e, m);
  T(e, '确认', m.x + S(20), m.y + S(12), LH(e, e.title), e.title);
  T(e, ask, m.x + S(20), m.y + S(18) + LH(e, e.title), LH(e, e.base), e.base);
  let ok: Rect;
  if (mode === 'hold') {
    const bw = Math.max(S(160), W(e, '长按确认', buttonText(e, bh)) + S(40));
    ok = { x: m.x + (w - bw) / 2, y: m.y + h - bh - S(16), w: bw, h: bh };
    button(e, ok, '长按确认', 'confirm');
    // 按住的进度环
    const prog = fl ? clamp01((fl.p - 0.3) / 0.6) : 0;
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(ok.x + S(20), ok.y + bh / 2, S(9), -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g.stroke();
  } else {
    const bw = Math.max(S(110), tap(e));
    button(e, { x: m.x + w / 2 - bw - S(8), y: m.y + h - bh - S(16), w: bw, h: bh }, '取消', 'back');
    ok = { x: m.x + w / 2 + S(8), y: m.y + h - bh - S(16), w: bw, h: bh };
    button(e, ok, '确定', 'confirm');
  }
  for (const c of ctxs) c.restore();
  return ok;
}

/** 演示动作：光标移到目标、结尾时按下（涟漪 + 压暗） */
function flowActions(e: ElCtx, fl: NonNullable<ReturnType<typeof flowNow>>) {
  const target = (fl.s.stage === 'confirm' ? CONFIRM_RECT : null) ?? (fl.s.focus !== undefined ? FOCUS_RECT : null) ?? CTA_RECT ?? CONFIRM_RECT;
  if (!target) return;
  const g = e.g, S = (n: number) => n * e.k;
  const tx = target.x + target.w * 0.6, ty = target.y + target.h * 0.6;
  if (fl.s.press && fl.p > 0.55) {
    const q = clamp01((fl.p - 0.55) / 0.45);
    g.fillStyle = `rgba(0,0,0,${(0.25 * (1 - q)).toFixed(3)})`; g.fillRect(target.x, target.y, target.w, target.h);
    g.strokeStyle = withAlpha('#fff', 1 - q); g.lineWidth = 3;
    g.beginPath(); g.arc(tx, ty, S(8) + q * S(40), 0, Math.PI * 2); g.stroke();
  }
  if (fl.s.cursor || fl.s.press) {
    const k = fl.s.cursor ? EASE.easeOut(clamp01(fl.p / 0.55)) : 1;
    const x = tx + (1 - k) * S(140), y = ty + (1 - k) * S(100);
    const s = S(22) * (fl.s.press && fl.p > 0.55 && fl.p < 0.7 ? 0.88 : 1);
    g.save(); g.translate(x, y);
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s); g.lineTo(s * 0.28, s * 0.74); g.lineTo(s * 0.5, s * 1.1); g.lineTo(s * 0.64, s * 1.02); g.lineTo(s * 0.44, s * 0.68); g.lineTo(s * 0.78, s * 0.66); g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
}

/** 继续提示（ix.continueCue）：点击任意处继续 / 闪烁小三角 / 按键图标 / 倒计时 */
function continueCue(e: ElCtx, R: Rect, inner: Rect, force: boolean) {
  const r = e.r;
  let cue = r.str('ix.continueCue', 'none');
  if ((cue === 'auto' || cue === 'none') && force) cue = 'tapText';
  if (cue === 'auto' || cue === 'none' || !cue) return;
  const fl = flowNow(), t = fl ? fl.t : 0;
  const S = (n: number) => n * e.k, g = e.g;
  // 闪烁只在流程演示里（M12b-68，frostpunk#45）：静帧（没有流程）按满不透明画——原来相位 0 时只有 45%，浅色插画上的「E 继续」几乎看不见；旧皮肤照旧
  const blink = fl || e.th.legacy ? 0.45 + 0.55 * Math.abs(Math.sin(t * 3)) : 1;
  const ctxs = e.tx === e.g ? [e.g] : [e.g, e.tx];
  // 底部正中的提示（继续字 / 按键 / 倒计时，占画面底边以上 28–60）压到模板里的行动号召（el.cta）时整体挪到它上面（目检修复：登录页的「点击任意处继续」
  // 压在锚在底部正中的「开始游戏」底边上——原来主视觉加载后行动号召被挤进右下的按钮行，看不出来）
  const by = R.y + R.h - S(60), bh = S(32), hw = S(70), cta = CTA_RECT;
  const dy = cue !== 'blinkArrow' && cta && cta.y < by + bh && by < cta.y + cta.h && cta.x < R.x + R.w / 2 + hw && R.x + R.w / 2 - hw < cta.x + cta.w ? cta.y - S(6) - (by + bh) : 0;
  // 字色（M12a-04）：显式选了 col.text 就用它；否则看提示底下已经画了什么——亮的不透明底（浅色背景板、亮面板）用墨色字 + 浅描边，
  // 其余（场景、暗底、位图背景）照旧白字 + 深描边。旧皮肤不变
  const under = e.th.legacy ? null : colorUnder(e.g, R.x + R.w / 2, R.y + R.h - S(44) + dy);
  const lightUnder = !!under && luminance(under) > 0.6;
  const ink = !e.th.legacy && postSkinKey(e, e.v.key('col.text')) ? e.text : lightUnder ? '#1f2328' : '#fff';
  const halo = { color: luminance(ink) < 0.4 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', width: 1.5 };
  for (const c of ctxs) { c.save(); c.globalAlpha *= blink; }
  switch (cue) {
    // 对话托盘画了台词时跟在台词行尾（目检修复：原来在内框右下角，托盘右侧的选项压在上面），否则内框右下角
    case 'blinkArrow': { const at = CUE_AT ?? { x: inner.x + inner.w - S(18), y: inner.y + inner.h - S(14) }; icon(e, '▼', at.x, at.y + Math.sin(t * 5) * S(3), S(14), e.accent); break; }
    // 花饰（M12b-21，hollow-knight#31）：台词下方正中一枚小花饰（母题跟 vis.motif，饰色）
    case 'ornament': { const at = CUE_AT ?? { x: inner.x + inner.w / 2, y: inner.y + inner.h - S(12) }, cc = ornColor(dialogueLike(e.r) ? e.part('dialog') : e); g.save(); g.fillStyle = cc; g.strokeStyle = cc; flourish(g, at.x, at.y, S(54), S(12), e.t.panel.ornament?.motif ?? 'none'); g.restore(); break; }
    case 'keyGlyph': {
      // 键帽跟字色（M12b-68，frostpunk#45）：字是深色（浅底，或显式给了深色 col.text）时键帽画成字色实底 + 反差字，不再是固定的按键盒子
      const y = R.y + R.h - S(60) + dy, kx = R.x + R.w / 2 - S(40), kh = S(26);
      let kw: number;
      if (luminance(ink) < 0.4 && ['keycap', 'brackets'].includes(r.str('ix.glyphs', 'keycap'))) {
        const ko = { ...e.base, weight: 700, color: onColorOf(ink, resolveColor(e.th.surface, e.pal)) };
        kw = Math.max(kh, W(e, 'E', ko) + kh * 0.45);
        drawBox(g, { x: kx, y, w: kw, h: kh }, { bg: { solid: ink }, radius: kh * 0.18 }, e.pal);
        T(e, 'E', kx + kw / 2 - W(e, 'E', ko) / 2, y, kh, ko);
      } else kw = keyCap(e, kx, y, kh, 'E');
      T(e, '继续', kx + kw + S(8), y, kh, { ...e.base, color: ink, outline: halo });
      break;
    }
    case 'countdown': {
      const left = Math.max(0, 3 - Math.floor(t)); const s = `${left} 秒后自动继续`;
      g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(R.x + R.w / 2 - W(e, s, e.small) / 2 - S(16), R.y + R.h - S(46) + dy, S(9), -Math.PI / 2, -Math.PI / 2 + ((t % 1) * Math.PI * 2)); g.stroke();
      T(e, s, R.x + R.w / 2 - W(e, s, e.small) / 2, R.y + R.h - S(58) + dy, S(24), { ...e.small, color: ink, outline: halo });
      break;
    }
    default: { const s = '点击任意处继续'; const o = { ...e.base, color: ink, outline: halo }; T(e, s, R.x + R.w / 2 - W(e, s, o) / 2, R.y + R.h - S(56) + dy, S(28), o); }
  }
  for (const c of ctxs) c.restore();
}

/** 跳过 / 快进（ix.skip，位置 ix.skipAnchor） */
function skipControl(e: ElCtx, R: Rect, ceremony: boolean) {
  let mode = e.r.str('ix.skip', 'none');
  if ((mode === 'auto' || mode === 'none') && ceremony) mode = 'button';
  if (mode === 'none' || mode === 'auto' || !mode) return;
  const S = (n: number) => n * e.k;
  const anchor = e.r.str('ix.skipAnchor', 'tr');
  const fl = flowNow();
  if (mode === 'vnControls') {
    const items = ['自动', '快进', '记录', '存档'];
    let x = R.x + R.w - S(16);
    const y = anchor === 'tr' ? R.y + S(14) : R.y + R.h - S(40);
    for (const l of [...items].reverse()) { const w = W(e, l, e.small) + S(16); x -= w; plate(e, { x, y, w, h: S(24) }, l, 'pill', { size: e.small.size }); logTarget(e.g, { x, y, w, h: S(24) }, l); x -= S(6); }
    return;
  }
  const l = mode === 'hold' ? '长按跳过' : '跳过 ▸▸';
  const w = Math.max(W(e, l, { ...e.small, weight: 700 }) + S(24), tap(e)), h = Math.max(S(28), Math.min(tap(e), S(44)));
  const x = anchor === 'bl' ? R.x + S(16) : R.x + R.w - w - S(16);
  const y = anchor === 'tr' ? R.y + S(16) : R.y + R.h - h - S(16);
  drawBox(e.g, { x, y, w, h }, { bg: { solid: 'rgba(0,0,0,0.45)' }, radiusPct: 50, border: { width: 1, color: 'rgba(255,255,255,0.5)' } }, e.pal);
  T(e, l, x + S(12), y, h, { ...e.small, weight: 700, color: '#fff' });
  if (mode === 'hold' && fl) { const q = clamp01(fl.p * 1.2); e.g.strokeStyle = '#fff'; e.g.lineWidth = 2.5; e.g.beginPath(); e.g.arc(x + w - S(12), y + h / 2, S(7), -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); e.g.stroke(); }
  logTarget(e.g, { x, y, w, h }, l);
}

/** 运营动作（ops.actions）里的「今日不再显示」：内框左下角的勾选字；其余运营按钮并进底部按钮行（rowPlan，M12a-35） */
function opsActions(e: ElCtx, inner: Rect) {
  if (!e.r.list('ops.actions').includes('dontShow')) return;
  const S = (n: number) => n * e.k;
  const l = '今日不再显示', bh = Math.max(S(38), tap(e));
  const w = W(e, `☐ ${l}`, e.small); T(e, `☐ ${l}`, inner.x, inner.y + inner.h - bh, bh, { ...e.small, color: withAlpha(e.text, 0.7) }); logTarget(e.g, { x: inner.x, y: inner.y + inner.h - bh, w, h: bh }, l);
}

/** 引导（ix.guideForce）：软提示 = 手指 + 气泡；强制 = 压暗全屏、只露出目标 */
function guide(e: ElCtx, R: Rect, force: string) {
  if (force === 'none' || force === 'auto' || !force) return;
  const target = CTA_RECT ?? FOCUS_RECT ?? FIRST_ITEM;
  if (!target) return;
  const g = e.g, S = (n: number) => n * e.k;
  const pad = S(8), hole = { x: target.x - pad, y: target.y - pad, w: target.w + pad * 2, h: target.h + pad * 2 };
  if (force === 'forced') {
    g.save(); g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.roundRect(hole.x, hole.y, hole.w, hole.h, S(10)); g.fillStyle = 'rgba(0,0,0,0.62)'; g.fill('evenodd'); g.restore();
  }
  g.save(); g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.setLineDash(force === 'soft' ? [6, 4] : []); g.beginPath(); g.roundRect(hole.x, hole.y, hole.w, hole.h, S(10)); g.stroke(); g.restore();
  const tip = force === 'forced' ? '点这里继续' : '试试这个', w = W(e, tip, e.base) + S(28), h = S(34);
  const bx = Math.min(R.x + R.w - w - S(10), Math.max(R.x + S(10), hole.x + hole.w / 2 - w / 2)), by = hole.y - h - S(14) > R.y ? hole.y - h - S(14) : hole.y + hole.h + S(14);
  panel(e, { x: bx, y: by, w, h }, true, { radiusPct: 50, bg: { solid: '#fffbe6' }, border: { width: 2, color: '#ffd34d' } });
  T(e, tip, bx + S(14), by, h, { ...e.base, color: '#3a2e12' });
  icon(e, '☝', hole.x + hole.w * 0.7, hole.y + hole.h + S(16), S(26), '#fff');
}

/** 顶栏三项货币的样本（topCurrency 的胶囊与 statusBar 的字段共用） */
const CHROME_CURRENCY: [string, string, string][] = [['◆', '1,600', '#7aa2f7'], ['●', '12,840', '#e3b341'], ['⚡', '86/120', '#5ef08a']];

/**
 * PC 式状态条（flow.chrome = statusBar，M12a-16）：贴顶一条细深条（部件 hudBar），左段资源数字（没有「+」购买钮）、右段回合 / 时间 / 菜单，
 * 与 lay.hudOrg = edgeBar 用同一种画法（compose/edgebar.ts 的 edgeBarPlan / drawEdgeBar）。返回条的矩形
 */
function statusBar(e: ElCtx, R: Rect): Rect {
  // 条上的字按部件 hudBar 取（R4 C2 ②，slay-the-spire#45：原来用整屏的字样，col.text@hudBar 只换了底板、字仍是正文色——地图屏深棕字压深青条）；没有 @hudBar 的键时 part 就是 e 本身
  const eb = e.part('hudBar'), sm = barSmall(eb), S = (n: number) => n * e.k, h = S(30), o = { ...sm, weight: 700 };
  const bar: Rect = { x: R.x, y: R.y, w: R.w, h }, content: Rect = { x: R.x + S(12), y: R.y, w: R.w - S(24), h };
  const field = (ch: string, n: string, c: string) => ({ w: S(18) + W(eb, n, o), h, draw: (q: Rect) => { icon(eb, ch, q.x + S(7), q.y + q.h / 2, S(13), c); T(eb, n, q.x + S(17), q.y, q.h, o); } });
  const word = (t: string, oo = sm) => ({ w: W(eb, t, oo), h, draw: (q: Rect) => { T(eb, t, q.x, q.y, q.h, oo); } });
  const segs: BarSegment[] = [
    { side: 'start', slots: CHROME_CURRENCY.map(([ch, n, c]) => ({ items: [field(ch, n, c)] })) },
    { side: 'end', slots: [{ items: [word(fill(DATA.turnText, { n: DATA.turn }), o)] }, { items: [word(DATA.timer)] }, { items: [word('≡', { ...o, size: o.size * 1.3 })] }] },
  ];
  drawEdgeBar(e, edgeBarPlan(bar, content, false, segs, S(14), 'slots'), segs);
  return bar;
}

/**
 * 模板顶栏上的小字（R4 C2 ②）：部件 hudBar 的小字；按目标写了 col.text@hudBar（选过）时字色就是它——部件主题里的字色会被「材质内芯与字色对比 < 3 换墨色」按面板的材质基色
 * （羊皮纸）翻回深色（slay-the-spire 地图屏写了 #fff6e2 仍画成 #2a2018），而顶栏的底是 col.surface2 的实心底，不是那块羊皮纸
 */
function barSmall(eb: ElCtx): TextOpts {
  const v = scopedStr(eb, 'col.text');
  return v && v !== 'auto' ? { ...eb.small, color: resolveColor(v, eb.pal) } : eb.small;
}

/** 跨界面顶栏（flow.chrome = statusBar / topCurrency）占画面顶部多高（M12a-26 / 38：xOutside 关闭钮与贴边抽屉 lay.drawerFlush 让出它）；没有顶栏时 0 */
const chromeTop = (e: ElCtx) => { const l = e.r.list('flow.chrome'); return l.includes('statusBar') || l.includes('topCurrency') ? 30 * e.k : l.includes('topStrip') ? 36 * e.k : 0; };

/**
 * 居中细框短条（flow.chrome = topStrip，M12b-51 收 into-the-breach#18：岛屿地图 / 对话过场的顶栏）：贴顶居中一条细线框的分隔条，字段之间 1px 竖线——
 * 星级（★ × 3）、两项资源数（顶栏货币样本的前两项）、一排分段格（亮 5 / 7，B5 的 pips）+ 百分比、回合；宽按字段，登记模板占位 header。返回条的矩形
 */
function topStrip(e0: ElCtx, R: Rect): Rect {
  // 条上的字、细框与竖线按部件 hudBar 取（R4 C2 ②，与 statusBar 同口径；没有 @hudBar 的键时就是 e0）
  const e = e0.part('hudBar'), S = (n: number) => n * e.k, g = e.g, h = S(28), o = { ...barSmall(e), weight: 700 }, gap = S(14);
  const cells: [number, (x: number) => void][] = [];
  const stars = 3;
  cells.push([stars * S(14), (x) => { for (let i = 0; i < stars; i++) icon(e, '★', x + S(7) + i * S(14), R.y + S(4) + h / 2, S(12), e.accent); }]);
  for (const [ch, n, c] of CHROME_CURRENCY.slice(0, 2)) { const w = S(18) + numberWidth(e, n, o); cells.push([w, (x) => { icon(e, ch, x + S(7), R.y + S(4) + h / 2, S(12), c); drawNumber(e, n, x + S(17), R.y + S(4), h, o); }]); }
  const pw = S(70), pct = '71%';
  cells.push([pw + S(6) + numberWidth(e, pct, o), (x) => { gauge(e0.part('bar'), { x, y: R.y + S(4) + h * 0.32, w: pw, h: h * 0.36 }, 5 / 7, 'pips', e.good, undefined, { max: 7 }); drawNumber(e, pct, x + pw + S(6), R.y + S(4), h, o); }]);
  const turn = fill(DATA.turnText, { n: DATA.turn });
  cells.push([W(e, turn, o), (x) => { T(e, turn, x, R.y + S(4), h, o); }]);
  const total = cells.reduce((a, [w]) => a + w, 0) + gap * 2 * (cells.length - 1) + S(24), bar = { x: R.x + (R.w - total) / 2, y: R.y + S(4), w: total, h };
  g.save(); g.fillStyle = withAlpha('#000', 0.55); g.fillRect(bar.x, bar.y, bar.w, bar.h); g.strokeStyle = withAlpha(e.text, 0.7); g.lineWidth = Math.max(1, S(1)); g.strokeRect(bar.x + 0.5, bar.y + 0.5, bar.w - 1, bar.h - 1); g.restore();
  let x = bar.x + S(12);
  cells.forEach(([w, draw], i) => {
    draw(x); x += w;
    if (i < cells.length - 1) { g.save(); g.fillStyle = withAlpha(e.text, 0.45); g.fillRect(x + gap - S(0.5), bar.y + S(5), Math.max(1, S(1)), bar.h - S(10)); g.restore(); x += gap * 2; }
  });
  frameOccupancy().add(bar, { kind: 'template', prio: 3, sub: 'header' });
  return bar;
}

/** 跨界面常驻层（flow.chrome）：顶栏货币、PC 式状态条、聊天跑马灯、返回 + 主页；M12b-51 加居中细框短条 topStrip 与贯穿顶栏的分隔线 topRule */
function chromeLayer(e: ElCtx, R: Rect, list: string[], head: Rect | null = null, top: Rect[] = []) {
  if (!list.length) return;
  const S = (n: number) => n * e.k, g = e.g;
  // 状态条（M12a-16）与手游式货币胶囊二选一：都选了时画状态条
  if (list.includes('statusBar')) statusBar(e, R);
  if (list.includes('topStrip') && !list.includes('statusBar') && !list.includes('topCurrency')) topStrip(e, R);
  // 贯穿顶栏的分隔线（topRule，M12b-51 收 cyberpunk-2077#16 的红色细线）：有顶栏时贴顶栏下沿，没有时在模板页头行下沿，强调色 2px、两端渐隐。
  // 都没有时（R4 C2 ③，cyberpunk-2077#35：原来固定离顶 56，正好穿过居中页签与右上金额的字）：画在顶排那一行（页签条、顶上开头的模板元素——上沿在 56 以上、不高于 90 的）
  // 的外接框下沿 + 4；顶排没有东西时照旧离顶 56
  if (list.includes('topRule')) {
    const band = top.filter((q) => q.w > 0 && q.h > 0 && q.h <= S(90) && q.y < R.y + S(56) && q.y + q.h > R.y);
    const ct = chromeTop(e), y = ct ? R.y + ct : head ? head.y + head.h + S(4) : band.length ? Math.max(...band.map((q) => q.y + q.h)) + S(4) : R.y + S(56);
    g.save(); g.fillStyle = fadePaint(g, { x: R.x, y, w: R.w, h: 2 }, 'both', 0.08, e.accent); g.fillRect(R.x, y, R.w, Math.max(1.5, S(2))); g.restore();
  }
  if (list.includes('topCurrency') && !list.includes('statusBar')) {
    const h = S(30);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(R.x, R.y, R.w, h);
    let x = R.x + R.w - S(10);
    for (const [ch, n, c] of CHROME_CURRENCY) {
      const w = W(e, n, { ...e.small, weight: 700 }) + S(44);
      x -= w;
      drawBox(g, { x, y: R.y + S(4), w, h: h - S(8) }, { bg: { solid: 'rgba(0,0,0,0.35)' }, radiusPct: 50 }, e.pal);
      icon(e, ch, x + S(12), R.y + h / 2, S(13), c);
      T(e, n, x + S(24), R.y, h, { ...e.small, weight: 700, color: '#fff' });
      icon(e, '+', x + w - S(10), R.y + h / 2, S(12), '#fff');
      x -= S(8);
    }
  }
  if (list.includes('backHome')) {
    const s = Math.max(S(30), tap(e));
    button(e, { x: R.x + S(10), y: R.y + S(36), w: s, h: s }, '‹', 'back');
    button(e, { x: R.x + S(16) + s, y: R.y + S(36), w: s, h: s }, '⌂', false);
  }
  if (list.includes('chatTicker')) {
    const s = pack().screens.ticker, h = S(24);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(R.x + S(10), R.y + R.h - h - S(8), Math.min(R.w * 0.45, W(e, s, e.small) + S(20)), h);
    T(e, s, R.x + S(20), R.y + R.h - h - S(8), h, { ...e.small, color: '#fff' });
  }
}

const GOODS = ['coin', 'gem', 'potion', 'crystal', 'key', 'scroll'];

/** 商品图（ops.tierArt）：堆越来越高 / 容器升级 / 同图放大；未设置时是图标集位图（没加载完是带字的灰盒） */
function goodsArt(e: ElCtx, a: Rect, i: number) {
  const kind = e.r.str('ops.tierArt', 'none');
  const g = e.g, tier = i % 4;
  if (kind === 'none' || kind === 'auto' || !kind) {
    // 商品图：图标集位图（选了图标素材就跟它走 3D / 手绘，否则手绘），按格子轮换；没加载完时是灰盒
    const set = iconSetId(e.r) ?? 'ui_icons_painted';
    const f = assetFile(set, 'atlas');
    if (f && uiImage(f)) {
      g.fillStyle = withAlpha(e.accent, 0.12); g.fillRect(a.x, a.y, a.w, a.h);
      const p = Math.min(a.w, a.h) * 0.1;
      smooth(g, () => drawAtlasItem(g, set, GOODS[i % GOODS.length], { x: a.x + p, y: a.y + p, w: a.w - p * 2, h: a.h - p * 2 }));
    } else drawGreybox(g, a, '商品图', { small: true });
    return;
  }
  g.fillStyle = withAlpha(e.accent, 0.12); g.fillRect(a.x, a.y, a.w, a.h);
  const cx = a.x + a.w / 2, by = a.y + a.h * 0.82;
  if (kind === 'stackGrow') {
    const n = [3, 6, 10, 15][tier], r0 = Math.min(a.w, a.h) * 0.09;
    for (let k = 0; k < n; k++) { const row = Math.floor(Math.sqrt(k * 2)), x = cx + ((k % (row + 2)) - (row + 1) / 2) * r0 * 1.7, y = by - row * r0 * 1.1; g.fillStyle = '#e3b341'; g.beginPath(); g.ellipse(x, y, r0, r0 * 0.55, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#9a7428'; g.lineWidth = 1; g.stroke(); }
  } else if (kind === 'containerUpgrade') {
    icon(e, ['◔', '▣', '⧈', '♛'][tier] ?? '▣', cx, a.y + a.h / 2, Math.min(a.w, a.h) * (0.35 + tier * 0.06), rarityColor(e, tier + 1));
  } else {
    icon(e, '●', cx, a.y + a.h / 2, Math.min(a.w, a.h) * (0.25 + tier * 0.1), '#e3b341');
  }
}

/* ---------------- 运营层（M9b） ---------------- */

/**
 * 合规层的一块（版本号、适龄标识、版权行、水印）放在哪（M12a-17）：这一帧的占位表（compose/occupancy.ts 的 OCC.last，按元素排版时才有）里没有东西压着就原位；
 * 有就先往画面里挪（下边的往上、上边的往下，挪到挡路的元素外面，不越过中线），再按远近换到别的角（同一排另一边 → 同一边另一排 → 对角，换过去的角同样可以往里挪；居中的只上移）；页头行也在表里（模板）；
 * 都不行留在原处（交给可读性检查）。放下后登记进表
 */
function compliancePlace(R: Rect, r0: Rect, corner: 'tl' | 'tr' | 'bl' | 'br' | 'bc', gap: number): Rect {
  const occ = OCC.last;
  if (!occ) return r0;
  const skip = (it: { kind: string }) => it.kind === 'compliance' || it.kind === 'world';
  const done = (q: Rect) => { occ.add(q, { kind: 'compliance', prio: 3 }); return q; };
  if (occ.free(r0, { skip })) return done(r0);
  const midY = R.y + R.h / 2;
  // 在某个角上先往里挪：挡路的东西外面（下边的往上、上边的往下），不越过中线；放得下返回位置，否则 null
  const inward = (q0: Rect, bottom: boolean): Rect | null => {
    let q = q0;
    for (let i = 0; i < 6; i++) {
      const hs = occ.hits(q, { skip });
      if (!hs.length) return q;
      const y = bottom ? Math.min(...hs.map((h) => h.rect.y)) - gap - q.h : Math.max(...hs.map((h) => h.rect.y + h.rect.h)) + gap;
      if (bottom ? y < midY : y + q.h > midY) return null;
      q = { ...q, y };
    }
    return null;
  };
  const own = inward(r0, corner[0] === 'b');
  if (own) return done(own);
  if (corner === 'bc') return done(r0);
  // 再换角：原位的边距对称搬到别的角；换过去的角同样先试原位、再往里挪（审查修复 A · D3：页头登记进表以后，右上角挪到页头下面就空着）
  const bottom = corner[0] === 'b';
  const dx = corner[1] === 'l' ? r0.x - R.x : R.x + R.w - (r0.x + r0.w), dy = bottom ? R.y + R.h - (r0.y + r0.h) : r0.y - R.y;
  const at = (c: string): Rect => ({ ...r0, x: c[1] === 'l' ? R.x + dx : R.x + R.w - dx - r0.w, y: c[0] === 'b' ? R.y + R.h - dy - r0.h : R.y + dy });
  const order = [`${corner[0]}${corner[1] === 'l' ? 'r' : 'l'}`, `${bottom ? 't' : 'b'}${corner[1]}`, `${bottom ? 't' : 'b'}${corner[1] === 'l' ? 'r' : 'l'}`];
  for (const c of order) { const z = inward(at(c), c[0] === 'b'); if (z) return done(z); }
  return done(r0);
}

/** 运营入口簇（ops.entries，局内 HUD 与主界面）与合规 / 品牌层（ops.compliance，任何界面） */
export function drawOps(d: DrawCtx, R: Rect, th: Theme) {
  const r = th.r;
  const entries = r.str('ops.entries', 'none');
  const comp = r.list('ops.compliance');
  const screen = r.str('cnt.screen', 'screen.hud');
  const showEntries = entries !== 'none' && entries !== 'auto' && !!entries && (screen === 'screen.hud' || screen === 'screen.lobby');
  if (!showEntries && !comp.length) return;
  const e = makeCtx('el.ops', d.ctx, d.t ?? d.ctx, th, R);
  const S = (n: number) => n * e.k, g = e.g;
  if (showEntries) {
    const icons: [string, string][] = [['✦', '活动'], ['◆', '商城'], ['✉', '邮件'], ['☆', '签到'], ['♛', '通行证']];
    switch (entries) {
      case 'sideIcons': {
        const s = Math.max(S(44), tap(e)), x = R.x + R.w - s - S(14);
        icons.forEach(([c, l], i) => {
          const y = R.y + R.h * 0.22 + i * (s + LH(e, e.small) + S(4));
          drawBox(g, { x, y, w: s, h: s }, { bg: { solid: withAlpha(e.accent, 0.9) }, radiusPct: 50, border: { width: 2, color: '#fff' } }, e.pal);
          icon(e, c, x + s / 2, y + s / 2, s * 0.42, '#fff');
          T(e, l, x + s / 2 - W(e, l, e.small) / 2, y + s, LH(e, e.small), { ...e.small, color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } });
          if (i < 2) { g.fillStyle = e.bad; g.beginPath(); g.arc(x + s - S(4), y + S(4), S(5), 0, Math.PI * 2); g.fill(); }
          logTarget(g, { x, y, w: s, h: s }, l);
        });
        break;
      }
      case 'topBanner': {
        const w = Math.min(S(420), R.w * 0.5), h = S(64), x = R.x + (R.w - w) / 2, y = R.y + S(44);
        drawBox(g, { x, y, w, h }, { bg: { linear: { angle: 90, stops: [[0, e.accent], [1, mix(e.accent, '#000', 0.4)]] } }, radius: 10 }, e.pal);
        T(e, opsText().eventTitle, x + S(16), y + S(6), LH(e, e.title), { ...e.title, color: '#fff' });
        T(e, '剩余 2 天 14:33', x + S(16), y + S(10) + LH(e, e.title) * 0.9, LH(e, e.small), { ...e.small, color: '#fff' });
        for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(x + w / 2 + (i - 1.5) * S(12), y + h + S(8), S(3), 0, Math.PI * 2); g.fill(); }
        logTarget(g, { x, y, w, h }, '活动横幅');
        break;
      }
      case 'floating': {
        const s = Math.max(S(58), tap(e)), x = R.x + R.w - s - S(20), y = R.y + R.h * 0.42 + Math.sin(e.th.r.num('mo.juice', 0.3) * 3) * S(3);
        g.fillStyle = withAlpha('#ffd34d', 0.35); g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.65, 0, Math.PI * 2); g.fill();
        icon(e, '◈', x + s / 2, y + s / 2, s * 0.7, '#fff');
        plate(e, { x: x - S(6), y: y + s, w: s + S(12), h: S(20) }, '02:14:33', 'pill', { size: e.small.size });
        logTarget(g, { x, y, w: s, h: s }, '礼包');
        break;
      }
      case 'bannerStack': {
        const w = Math.min(S(220), R.w * 0.28), h = S(52);
        ['首充双倍', '七日签到', '赛季通行证'].forEach((l, i) => {
          const y = R.y + R.h * 0.22 + i * (h + S(8));
          drawBox(g, { x: R.x + S(14), y, w, h }, { bg: { solid: withAlpha(['#e5484d', '#e3b341', '#7a5af8'][i], 0.9) }, radius: 8 }, e.pal);
          T(e, l, R.x + S(26), y, h, { ...e.title, color: '#fff' });
          logTarget(g, { x: R.x + S(14), y, w, h }, l);
        });
        break;
      }
    }
  }
  if (comp.length) {
    const tiny = { ...e.small, size: Math.max(10, e.small.size * 0.85), color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.2 } };
    // 合规层避让（M12a-17）：与这一帧占位表里的元素重叠时，先往里挪（下边的上移、上边的下移，不越过中线），再换到最近的空角；都不行留在原处
    const place = (r0: Rect, corner: 'tl' | 'tr' | 'bl' | 'br' | 'bc'): Rect => compliancePlace(R, r0, corner, S(4));
    if (comp.includes('ageRating')) {
      const s = S(46), q = place({ x: R.x + S(14), y: R.y + S(14), w: s, h: s * 1.2 }, 'tl'), x = q.x, y = q.y;
      drawBox(g, { x, y, w: s, h: s * 1.2 }, { bg: { solid: '#2f9e44' }, radius: 4, border: { width: 2, color: '#fff' } }, e.pal);
      T(e, '12+', x + s / 2 - W(e, '12+', { ...e.title, color: '#fff' }) / 2, y, s * 0.8, { ...e.title, color: '#fff' });
      T(e, '适龄提示', x + s / 2 - W(e, '适龄提示', { ...tiny, size: S(8) }) / 2, y + s * 0.78, s * 0.4, { ...tiny, size: S(8), outline: undefined });
    }
    // 版权 / 健康忠告两行：底边居中，作为一块整体上移
    const lines = [...(comp.includes('legal') ? ['© 2026 示例工作室 · 保留所有权利'] : []), ...(comp.includes('license') ? ['健康游戏忠告：抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。'] : [])];
    if (lines.length) {
      const lh = LH(e, tiny), bw = Math.max(...lines.map((l) => W(e, l, tiny))), bh = lh * lines.length;
      const q = place({ x: R.x + R.w / 2 - bw / 2, y: R.y + R.h - S(8) - bh, w: bw, h: bh }, 'bc');
      let by = q.y + q.h;
      for (const l of lines) { by -= lh; T(e, l, R.x + R.w / 2 - W(e, l, tiny) / 2, by, lh, tiny); }
    }
    if (comp.includes('version')) { const w = W(e, 'v1.2.0', tiny), lh = LH(e, tiny), q = place({ x: R.x + R.w - w - S(10), y: R.y + R.h - lh - S(6), w, h: lh }, 'br'); T(e, 'v1.2.0', q.x, q.y, lh, tiny); }
    if (comp.includes('watermark')) { const o = { ...e.title, size: S(18), color: 'rgba(255,255,255,0.35)', outline: undefined }, s = pack().game.name, w = W(e, s, o), q = place({ x: R.x + R.w - w - S(14), y: R.y + S(12), w, h: LH(e, o) }, 'tr'); T(e, s, q.x, q.y, LH(e, o), o); }
    if (comp.includes('reviews')) {
      const scores = [['9/10', '某某游戏'], ['5/5', '某某周刊'], ['92', '综合评分']];
      scores.forEach(([n, src], i) => {
        const x = R.x + R.w / 2 + (i - 1) * S(110), y = R.y + R.h * 0.72;
        icon(e, '❦', x - S(34), y + S(14), S(22), '#e3b341'); icon(e, '❦', x + S(34), y + S(14), S(22), '#e3b341');
        T(e, n, x - W(e, n, { ...e.title, color: '#fff' }) / 2, y, S(26), { ...e.title, color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } });
        T(e, src, x - W(e, src, tiny) / 2, y + S(24), LH(e, tiny), tiny);
      });
    }
  }
}
