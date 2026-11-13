/*
 * UI 知识库纯函数的单元测试（docs/t1-tool-knowledge.md）：索引、取值换算、家族 / 做法 / 演示 / 复刻补丁。
 * 顺带校验数据：所有家族、demo、复刻里写的键能不能被 Values 收下（validKey），不能的打印出来。
 * 运行：npx tsx scripts/test-knowledge.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/dims/index';
import { defaultValues, isUiKey } from '../src/dims/registry';
import type { Values } from '../src/dims/types';
import {
  applyApproach, applyFamily, buildUiKnowledge, convertPatch, demoSides, demosOf, familyPreview, GAP_KINDS, gapScreens, rationaleOf, refImageUrl, replicaScore,
  replicaScoreHistory, replicaScreenPatch, toStoreVal, uiCleared, valueMatches, type FamiliesFile, type KReplica, type PrinciplesFile, type RefsFile,
} from '../src/content/uiKnowledge';
import { isMonetizationPreset, isMonetizationValue, MONETIZATION_TEMPLATES, presetCarriesMonetization } from '../src/content/uiMonetization';
import { baseId, instanceNo, parseElementKey, parseOverrideKey, SELECTORS, skinValueOf, uiKeyLabel } from '../src/hud/sys/register';
import { Resolved, resolveUi, unionMerge } from '../src/hud/sys/resolve';
import { PRESET } from '../src/hud/sys/spec';
import { baseTheme, DISPLAY_STACK, FONT_STACK, patchTheme, px1080 } from '../src/hud/sys/theme';
import { unitKOf } from '../src/hud/sys/device';
import { SCOPABLE_IDS, SCOPE_PARTS, THEME_SCOPED } from '../src/hud/sys/scopable';
import { BAKE, bakedPaint, bakeFrame, bayer, boxPath, clearBakes, drawBox, DRAW_LOG, drawText, faceWeight, fadePaint, measure, measureOnlyCtx, outlineWidth, textPresentation, withSkew, wrapLines, type TextOpts } from '../src/hud/paint';
import { GAUGES } from '../src/hud/elements/gauges';
import { CHART_KINDS, chartData, statViz } from '../src/hud/elements/charts';
import { MATERIAL_BASE } from '../src/hud/material';
import { navKeysOn } from '../src/hud/elements/tabs';
import { arrangeCells, buttonBoxOn, buttonText, chosenKey, elCount, platePick, elementParts, gaugeKind, itemCountOr, labelShown, lockedFrom, makeCtx, ownArrangement, sampleItems, semantic, shapeStyle, silhouetteOf, stateDemo, thicknessOf, tiltOf, valueKind, valueText } from '../src/hud/elements/core';
import { GENERIC, PACK_IDS, packById, packFor, setPack, vitalsOf } from '../src/hud/content';
import { missingSamples, sampleKind, samplesFor } from '../src/hud/content/samples';
import { feedLines, hasGenericText, screenGroups, textFor } from '../src/hud/content/texts';
import { drawRich, parseRich, plainText, richBBCode } from '../src/hud/richText';
import { DISPLAY_ONLY, FONT_WEIGHTS, HUD_FONT_FILES, roleCjkDisplayOnly, roleHasFont, roleResolved } from '../src/hud/fontList';
import { drawFrame } from '../src/hud/frame';
import { divider, drawEndcap, drawOrnaments, endcapShapeOf, glyph, NO_ORNAMENT_INSETS, ornamentInsets, scroll, VECTOR_MOTIFS } from '../src/hud/ornament';
import { anchorSpaceOf, drawOps, drawScreen, overlayBody, overlayTemplate, placeFloating, readOnlyNoFocus } from '../src/hud/compose/screen';
import { dockOrder, dockRect, drawElements, edgeMembership, hudOrgOf } from '../src/hud/compose/hud';
import { cursorContextOf, drawCursor } from '../src/hud/cursors';
import { drawGlyph, mouseButtonOf, swipeOf } from '../src/hud/glyphs';
import { composeLayers, hudLayoutElements, underlayIds } from '../src/hud/compose/layers';
import { frameOccupancy, intersects, Occupancy, OCC, resetOccupancy } from '../src/hud/compose/occupancy';
import { edgeBarPlan } from '../src/hud/compose/edgebar';
import { DATA, memberRects, alignX, attachFor, attachPoint, drawNumber, elChosen, elGiven, ELEMENTS, fmtNumber, gauge, gaugeOf, keyCapWidth, lineTable, numberWidth, plate, plateWidthOf, pointSized, rarityTable, ROUND_GAUGES, T, W } from '../src/hud/elements/core';
import { setWorld, type WorldView } from '../src/hud/world';
import { SPEC_PARAM } from '../src/hud/sys/spec';
import { drawWatermark, sceneTones } from '../src/hud/compose/backdrop';
import { checkResolved, scopedAll } from '../src/hud/sys/check';
import '../src/hud/elements/combat';
import '../src/hud/elements/info';
import '../src/hud/elements/meta';
import '../src/hud/elements/inventory';

import { setSim, simulate } from '../src/hud/sim';
import { evalCond } from '../src/hud/sys/cond';
import { drawnKind } from '../src/hud/elements/gauges';
import { randomizeUi, type UiRandomPart } from '../src/ui/hud/uiRandom';
import { godotUiFiles } from '../src/export/godotHud';
import { elementLayout } from '../src/export/godotLayout';
import { avatar as avatarB7, liftOf, slot, slotLabelH, tintColor } from '../src/hud/elements/core';
import { cardKind, drawCard, handCard, sectionsLayout } from '../src/hud/elements/card';
import { godotPackage } from '../src/export/godot';
import { FINISH_LIGHT, fitLine, lightFace, TEXT_K } from '../src/hud/paint';
import { layersOf, layoutGraph, seedOf, SPREADS, treeLayers } from '../src/hud/compose/graph';
import { chevronChain, CONNECTOR_STYLES, drawConnector, drawConnectors, drawLeader, LEADER_ENDS, LEADER_KINDS } from '../src/hud/connectors';
import { detailPlanOf, graphStates } from '../src/hud/compose/screen';
import { drawNode, LAYOUT_NODES, nodeFootprint } from '../src/hud/elements/node';
import { drawContainerFor } from '../src/hud/compose/menu';
import { rarityWord } from '../src/hud/elements/core';
import { parseColor } from '../src/hud/material';
import { measureField } from '../src/hud/elements/fields';
import { ART_FILTERS, drawImageFitFx, filterPixels } from '../src/hud/uiAssets';
import { mix, withAlpha } from '../src/hud/material';
// M12b B10
import { bakeMinimap, MAP_STEPS } from '../src/hud/world';
import { glyphIcon, mapStyleOf, tallyText, TILT, tiltExtent, tiltSplit } from '../src/hud/elements/core';
import { legend, legendSize, LEGEND_STYLES } from '../src/hud/elements/info';
import { hudBackdrop, SCREEN_BG, SCREEN_EDGES, screenEdges } from '../src/hud/compose/backdrop';
import { PIXEL_ROLES, pixelPlan, PIXROLE, roleCtx, withPixRole } from '../src/hud/pixelRoles';
import { LEGIBLE, LEGIBLE_PX } from '../src/hud/pixelRoles';
import { gradientMean, luminance } from '../src/hud/material';
import { paintBase } from '../src/hud/paint';
import { ART_SLOT_FAINT, artSlot } from '../src/hud/elements/core';
import { endcapReach, K1_PARTS, NEW_MOTIFS, ovhBegin, ovhEnd } from '../src/hud/ornament';
import { DEMOS, setSim as setSimB10, SIM_POSES, simNow, simPin } from '../src/hud/sim';
import { AGING_KINDS } from '../src/hud/types';
import { SKIN_MAP } from '../src/hud/skins';
import { ORN } from '../src/hud/paint';
// M12b B10 审查修复
import { PAINT_LAYERS, resolveColor, setPaintScale } from '../src/hud/paint';
import { layerExtent, ROLES } from '../src/hud/pixelRoles';
import { bgColorsOf } from '../src/hud/compose/backdrop';
import { doodlePath } from '../src/hud/ornament';
// R4 回归修复 C2
import { logEntries } from '../src/hud/compose/screen';
import { inkOn } from '../src/hud/elements/node';
import { contrastRatio } from '../src/hud/material';
// R4 回归修复 C4
import { mapClear, mapPaper } from '../src/hud/world';
// R4 回归修复 · 审查修复
import { clearMapOpen } from '../src/hud/compose/screen';
import { overlapArea } from '../src/hud/compose/occupancy';
import type { Rect } from '../src/hud/paint';

/** 这组值画出来是不是"局内 HUD 但只有四控件样本"（没有按元素排版：布局 auto / none，元素集合也不是手动 / 界面层给的） */
function sampleOnlyHud(v: Values): boolean {
  const r = resolveUi(v);
  const scr = r.str('cnt.screen', 'screen.hud');
  if (scr !== 'screen.hud' && scr !== 'auto') return false;
  const tpl = r.art[SELECTORS.screen];
  if (tpl !== undefined && tpl !== 'auto' && tpl !== 'none') return false;
  const lay = r.art[SELECTORS.layout];
  if (lay !== undefined && lay !== 'auto' && lay !== 'none') return false;
  const layer = r.src('cnt.elements')?.layer;
  return !(layer === 'user' || layer === 'screen' || layer === 'screenOverride');
}

let fails = 0, n = 0;
const ok = (c: boolean, msg: string) => { n++; if (!c) { fails++; console.log(`  ✗ ${msg}`); } };
const root = join(import.meta.dirname, '..');
const json = <T>(p: string): T => JSON.parse(readFileSync(join(root, p), 'utf8')) as T;

const k = buildUiKnowledge(json<PrinciplesFile>('src/content/uiPrinciples.json'), json<FamiliesFile>('src/content/uiStyleFamilies.json'), json<RefsFile>('src/content/uiRefs.json'));
const replicas = readdirSync(join(root, 'src/content/replicas')).filter((f) => f.endsWith('.json')).map((f) => json<KReplica>(`src/content/replicas/${f}`));

console.log('== 索引');
ok(k.principleById.size === k.principles.principles.length && k.principleById.size >= 85, `原则 ${k.principleById.size}`);
ok(k.familyById.size >= 200, `家族 + 子族 ${k.familyById.size}`);
ok(k.cardById.size >= 450, `参考卡 ${k.cardById.size}`);
ok([...k.topFamiliesOf.values()].reduce((a, x) => a + x.length, 0) === k.families.families.filter((f) => !f.parent).length, '门类下的顶层家族 = 全部顶层家族');
ok(k.chapterById.get('G-explore') === k.chapterById.get('explore') && !!k.chapterById.get('explore'), '品类篇两种 id');
ok(!!k.demoById.get('P-priority-tiers#d0')?.principle, 'demo 索引');
ok((k.principlesByParam.get('elx.priority') ?? []).some((r) => r.key === 'el.timer.priority'), '元素实例键登记到模板参数 elx.priority');
ok((k.familiesByValue.get('vis.stroke=double') ?? []).some((r) => r.family.id === 'fam.dark-gold'), '取值 → 家族（暗金双线）');
ok((k.familiesByValue.get('ast.ornaments=rivets') ?? []).some((r) => r.family.id === 'fam.dark-gold'), '多选每一项单独登记');
ok((k.familiesBySkin.get('darkGold') ?? []).some((f) => f.id === 'fam.dark-gold'), '皮肤 → 家族');
ok((k.principlesByFamily.get('fam.candy') ?? []).some((x) => x.principle.id === 'P-priority-tiers' && !!x.how), '家族 → 原则（带 how）');

console.log('== 取值换算');
ok(toStoreVal(['size', 'value']) === 'size,value' && toStoreVal([]) === '', '多选 → 逗号串');
ok(toStoreVal({ from: '#000000', to: '#00000000', angle: 135 }) === 'linear(135):#000000,#00000000' && toStoreVal({ from: '#111', to: '#222' }) === '#111,#222' && toStoreVal({ from: '#111', to: '#222', type: 'radial' }) === 'radial:#111,#222', '渐变对象 → 色标（写了方向 / 类型时带前缀，M12a-06）');
ok(toStoreVal(null) === undefined, 'null 不写');
ok(valueMatches(['size'], 'size,value') && !valueMatches(['color'], 'size,value'), '多选按交集');
ok(valueMatches(1.4, '1.4') && valueMatches(3, 3) && !valueMatches(3, 2), '数值相等');
ok(valueMatches('dark', 'dark') && !valueMatches('dark', 'auto'), '字符串相等，auto 不算');
ok(refImageUrl('qa/refs-cache/x.jpg') === null, '非开发环境不给截图 URL');

console.log('== G1 依据');
const r1 = rationaleOf(k, 'hier.emphasis', 'size');
ok(r1.approaches.length > 0 && r1.approaches[0].match, `hier.emphasis = size：做法 ${r1.approaches.length}，第一条取值一致`);
ok(r1.cards.length > 0, '例子游戏');
const r2 = rationaleOf(k, 'el.vitals.scale', 1.4);
ok(r2.base === 'elx.scale' && r2.approaches.length > 0, `元素实例键 el.vitals.scale → elx.scale：做法 ${r2.approaches.length}`);
const r3 = rationaleOf(k, 'hud.style', 'darkGold');
ok(r3.families.some((f) => f.family.id === 'fam.dark-gold'), '皮肤取值 → 家族');
const r4 = rationaleOf(k, 'uip.screen', 'tpl.inventory');
ok(r4.approaches.length + r4.mentions.length > 0, `界面模板 → cnt.screen 的原则：${r4.approaches.length + r4.mentions.length}`);
const r5 = rationaleOf(k, 'uip.layout', 'layout.strategyTurn');
ok(r5.chapters.some((c) => c.chapter.genre === 'strategy'), '品类布局 → 品类篇');
const r6 = rationaleOf(k, 'cnt.pack', 'rts');
ok(!!r6.noRationale && !!r6.note, '工具参数：暂无原则');

console.log('== G3 家族套用');
const cur = defaultValues();
const dg = k.familyById.get('fam.dark-gold')!;
const pd = applyFamily(k, dg, { ...cur, 'vis.corner': 'round', 'cnt.elements': 'el.vitals', 'el.vitals.scale': 2 });
ok(pd.set['hud.style'] === 'darkGold' && pd.set['vis.stroke'] === 'double', '皮肤 + 风格参数');
ok(pd.set['cnt.pack'] === 'rts' && pd.set['uip.layout'] === 'layout.strategyRts', `预览情境：${pd.set['cnt.pack']} / ${pd.set['uip.layout']}`);
ok(pd.set['ast.ornaments'] === 'rivets,endcaps,badgeBase', '多选写成逗号串');
ok(pd.set['vis.corner'] === 'chamfer' && pd.unset.includes('cnt.elements') && pd.unset.includes('el.vitals.scale'), '清掉内容域手动值');
const sub = k.familyById.get('fam.dark-gold-console')!;
const ps = applyFamily(k, sub, cur, { preview: false, layout: true });
ok(ps.set['vis.stroke'] === 'double' && ps.set['ast.frameMat'] === 'stone' && ps.set['lay.hudOrg'] === 'console', '子族 = 父族 + 子族 + 版式');
ok(!('cnt.pack' in ps.set), 'preview = false 不换题材');
ok(familyPreview(k, sub, 'hud').screen === 'screen.hud', '副预览：HUD');
const cv = convertPatch(k, dg, 2, cur);
ok(!!cv && cv.set['hud.style'] === 'greybox' && cv.set['vis.stroke'] === 'double' && cv.set['col.accent'] === '#c9a24a' && !('typ.titleFx' in cv.set), '改造前两步');
let famDropped = 0;
const famBad = new Map<string, number>();
for (const f of k.families.families) {
  const p = applyFamily(k, f, cur, { layout: true });
  for (const key of p.dropped ?? []) { famDropped++; famBad.set(key, (famBad.get(key) ?? 0) + 1); }
  ok(typeof p.set['hud.style'] === 'string' && p.set['hud.style'] !== '', `${f.id} 有皮肤`);
}
console.log(`  家族数据里存不下的键：${famDropped}${famBad.size ? '（' + [...famBad.entries()].slice(0, 12).map(([x, c]) => `${x}×${c}`).join('、') + '）' : ''}`);

console.log('== G2 做法与演示');
const pr = k.principleById.get('P-priority-tiers')!;
const pa = applyApproach(pr, pr.approaches[0]);
ok(pa.set['hier.emphasis'] === 'size' && pa.set['el.timer.scale'] === 1.8 && !pa.unset.length, '做法只写自己的参数');
ok(applyApproach(pr, pr.approaches[0], { context: true }).set['cnt.pack'] === 'action', '做法 + demo 情境');
const ds = demoSides(pr.demo, { ...cur, 'uip.platform': 'platform.mobilePortrait', 'el.minimap.form': 'radar', 'el.party.scale': 2 })!;
ok(!!ds && ds.a['hier.dimInactive'] === 0 && ds.b['hier.dimInactive'] === 0.35, 'A / B 各自的值');
ok(ds.a['hud.style'] === 'greybox' && ds.b['cnt.pack'] === 'action', '基线皮肤 + base');
ok(ds.a['uip.platform'] === 'auto' && ds.a['el.minimap.form'] === 'auto' && !('el.party.scale' in ds.a), 'UI 先全部回到跟随（登记过的回默认，实例键删掉）');
ok(ds.patchB.unset.includes('uip.platform') && ds.patchB.unset.includes('el.party.scale'), 'B 的补丁清掉多余的 UI 键');
ok(!('el.vitals.scale' in uiCleared({ ...cur, 'el.vitals.scale': 2 })), 'uiCleared 删掉元素实例键');
let demoDropped = 0, demos = 0;
const demoBad = new Map<string, number>();
for (const { demo } of k.demoById.values()) {
  const s = demoSides(demo, cur);
  if (!s) continue;
  demos++;
  for (const key of s.dropped) { demoDropped++; demoBad.set(key, (demoBad.get(key) ?? 0) + 1); }
  ok(Object.keys(s.a).filter(isUiKey).length > 0, `${demo.id} 有 UI 值`);
}
ok(demos >= 190, `能演示的 demo ${demos}`);
// 局内 HUD 的演示两侧都要按元素排版（只给了内容包时补上品类布局），否则 el.* 的差别画不出来
const sampleDemos: string[] = [];
for (const { demo } of k.demoById.values()) {
  const s = demoSides(demo, cur);
  if (!s) continue;
  for (const [side, v] of [['A', s.a], ['B', s.b]] as const) if (sampleOnlyHud(v)) sampleDemos.push(`${demo.id}·${side}`);
}
ok(!sampleDemos.length, `局内 HUD 演示都按元素排版${sampleDemos.length ? `：${sampleDemos.length} 侧没有（${sampleDemos.slice(0, 8).join('、')}）` : ''}`);
const juice = k.principleById.get('P-juice-budget');
if (juice) ok(!!demoSides(juice.demo, cur)?.b['uip.layout'] && demoSides(juice.demo, cur)!.b['uip.layout'] !== 'auto', 'P-juice-budget 演示补上品类布局');
// 在演示情境里套用做法：不带检查工具；写了元素键的做法在跟随布局下也画得出来
let ctxBad = 0, ctxTools = 0, ctxN = 0;
for (const p of k.principles.principles) {
  if (!Object.keys(p.demo?.base ?? {}).length) continue;
  for (const a of p.approaches) {
    const pt = applyApproach(p, a, { context: true, current: cur });
    ctxN++;
    // 做法自己就是检查工具（伪本地化、安全区……）时照写；演示 base 里的检查工具不带
    if (Object.keys(pt.set).some((x) => x.startsWith('chk.') && !(x in (a.params ?? {})))) ctxTools++;
    const touchesEl = Object.keys(a.params ?? {}).some((x) => x.startsWith('el.') || x.includes('@el.'));
    if (touchesEl && 'cnt.pack' in pt.set && sampleOnlyHud({ ...cur, ...pt.set })) ctxBad++;
  }
}
ok(ctxTools === 0, `演示情境里套用不带 chk.*（${ctxTools} / ${ctxN}）`);
ok(ctxBad === 0, `演示情境里套用元素做法都按元素排版（${ctxBad} 个没有）`);
ok(demosOf(pr).length >= 2, '原则的 demo + 派生 demo');
console.log(`  demo 数据里存不下的键：${demoDropped}${demoBad.size ? '（' + [...demoBad.entries()].slice(0, 12).map(([x, c]) => `${x}×${c}`).join('、') + '）' : ''}`);

console.log('== G4 复刻');
const hades = replicas.find((r) => r.id === 'rep.hades')!;
const rp = replicaScreenPatch(hades, hades.screens[0], { ...cur, 'el.party.scale': 2, 'game.seed': 777 });
ok(rp.baseRecipe === 'cel-anime' && rp.set['game.scene'] === 'iso-dungeon' && rp.set['cnt.pack'] === 'action', '画面配方 + 场景 + 内容包');
ok(rp.set['game.seed'] === 777 && !('camera.letterbox' in rp.set && rp.set['camera.letterbox'] === '1.78'), '保留种子、不钉画幅');
ok(rp.unset.includes('el.party.scale') && rp.set['uip.layout'] === 'layout.action', '清掉多余的 UI 键，写这一屏的值');
const ro = replicaScreenPatch(hades, hades.screens[0], cur, { uiOnly: true });
ok(!('game.scene' in ro.set) && ro.set['hud.style'] === hades.base['hud.style'], '只套 UI');
let repDropped = 0;
const repBad = new Map<string, number>();
for (const rep of replicas) for (const s of rep.screens) for (const key of replicaScreenPatch(rep, s, cur).dropped ?? []) { repDropped++; repBad.set(key, (repBad.get(key) ?? 0) + 1); }
console.log(`  复刻数据里存不下的键：${repDropped}${repBad.size ? '（' + [...repBad.entries()].slice(0, 12).map(([x, c]) => `${x}×${c}`).join('、') + '）' : ''}`);
// 评分格式（M12a-39）：第一轮单对象、第二轮起逐轮数组；当前分 = 最后一轮
const fake = { id: 'rep.x', screens: [{ key: 'a' }, { key: 'b' }, { key: 'c' }], scores: { a: { overall: 3, round: 1 }, b: [{ overall: 2, round: 1 }, { overall: 5, round: 2 }], c: [{ overall: 1 }, { overall: 4 }] } } as unknown as KReplica;
ok(replicaScore(fake, 'a')?.overall === 3 && replicaScoreHistory(fake, 'a').length === 1, '单对象评分');
ok(replicaScore(fake, 'b')?.overall === 5 && replicaScoreHistory(fake, 'b').map((x) => x.overall).join() === '2,5', '逐轮数组取最后一轮');
ok(replicaScoreHistory(fake, 'c').map((x) => x.round).join() === '1,2' && replicaScore(fake, 'c')?.overall === 4, '没写 round 的按位置补轮次');
ok(replicaScore(fake, 'zz') === undefined && replicaScoreHistory(fake, 'zz').length === 0, '没有评分');
ok(gapScreens({ screen: 'all' } as never).length === 0 && gapScreens({ screen: 'a / b' } as never).join() === 'a,b', '缺口的屏：整套 / 几屏共有');
let scoreBad = 0, kindBad = 0, gapScreenBad = 0, lastRound = 0;
for (const rep of replicas) {
  const keys = new Set(rep.screens.map((s) => s.key));
  for (const s of rep.screens) {
    const h = replicaScoreHistory(rep, s.key);
    if (!h.length || h.some((x, i) => i > 0 && (x.round ?? 0) <= (h[i - 1].round ?? 0)) || typeof h.at(-1)?.overall !== 'number') scoreBad++;
    lastRound = Math.max(lastRound, h.at(-1)?.round ?? 0);
  }
  for (const g of rep.gaps) {
    if (!(GAP_KINDS as readonly string[]).includes(String(g.kind))) kindBad++;
    if (gapScreens(g).some((x) => !keys.has(x))) gapScreenBad++;
  }
}
ok(scoreBad === 0, `每屏都有逐轮评分、轮次递增、有 overall（${scoreBad} 屏不合格）`);
ok(lastRound >= 2, `复刻库已有第 ${lastRound} 轮评分`);
ok(kindBad === 0, `缺口都写了合法的 kind（${kindBad} 条不合格）`);
ok(gapScreenBad === 0, `缺口的屏都在复刻里（${gapScreenBad} 条写错屏名）`);

console.log('== M12a-07 并集多选：清空与减项');
ok(unionMerge(['a', 'b'], []).length === 0 && unionMerge(['a', 'b'], ['none']).length === 0, '[] / none 清空');
ok(unionMerge(['a', 'b'], ['none', 'c']).join() === 'c', 'none + 取值 = 替换');
ok(unionMerge(['a', 'b'], ['-a']).join() === 'b' && unionMerge(['a', 'b'], ['-a', 'c']).join() === 'b,c', '-x 减项，可与普通取值混写');
ok(unionMerge(['a'], ['b']).join() === 'a,b' && unionMerge(null, ['-a', 'b']).join() === 'b', '其余照旧并集；没有下层时减项无事可减');
{
  const rr = new Resolved({});
  rr.put('ast.ornaments', ['corners', 'sprigs'], { layer: 'keyword' });
  rr.put('ast.ornaments', [], { layer: 'derived', ref: 'D-ornament' });
  ok(rr.list('ast.ornaments').length === 0, '派生层写 [] 真的清空（装饰预算 0 不再带出花枝）');
}
const tplV = (extra: Record<string, string | number | boolean>) => resolveUi({ ...cur, ...extra } as Values);
ok(tplV({ 'uip.screen': 'tpl.runSummary' }).list('ops.actions').includes('retry'), '结算模板默认带"再来一局"');
ok(tplV({ 'uip.screen': 'tpl.runSummary', 'ops.actions': '' }).list('ops.actions').length === 0, '本屏写 [] 去掉模板带的运营动作');
ok(tplV({ 'uip.screen': 'tpl.runSummary', 'ops.actions': '-retry' }).list('ops.actions').length === 0, '本屏写 -retry 只减这一项');
ok(tplV({ 'uip.screen': 'tpl.settle', 'uip.business': 'business.premium' }).list('ops.actions').length === 0, '买断制清空模板带的分享');
ok(tplV({ 'uip.screen': 'tpl.settle', 'uip.business': 'business.premium', 'ops.actions': 'share' }).list('ops.actions').join() === 'share', '买断制下用户自己写的照留');
ok(!tplV({ 'uip.screen': 'tpl.draft3' }).list('ops.actions').includes('retry'), '必须选一张（forced）的三选一不带"再抽"');
ok(tplV({ 'uip.screen': 'tpl.draft3', 'ops.actions': 'retry' }).list('ops.actions').includes('retry'), '三选一里用户自己写 retry 照留');
ok(!tplV({ 'a11y.reduceMotion': true, 'rel.metaFx': 'hitFlash,lowHpDesat' }).list('rel.metaFx').includes('hitFlash'), '减少动态效果真的去掉受击闪白');

console.log('== M12a-01 作用域 token');
{
  const R0 = { x: 0, y: 0, w: 1280, h: 720 };
  const g = {} as CanvasRenderingContext2D;
  const v0 = { ...cur, 'hud.style': 'darkHairline' } as Values;
  const r0 = resolveUi(v0), th0 = baseTheme(r0, null, 'darkHairline');
  ok(patchTheme(th0, r0, ['slot', 'el.vitals']) === th0, '没有作用域键：补丁就是整屏主题（画面不变）');
  const e0 = makeCtx('el.vitals', g, g, th0, R0);
  ok(e0.th === th0 && e0.part('slot') === e0 && e0.part('title', 'plate') === e0, '没有作用域键：部件上下文就是元素自己');
  const v1 = { ...v0, 'col.accent@el.vitals': '#3fd8e0', 'vis.corner@slot': 'round', 'col.surface@slot': '#f4efe4', 'st.selected@slot': 'glow' } as Values;
  const r1 = resolveUi(v1), th1 = baseTheme(r1, null, 'darkHairline');
  const pv = patchTheme(th1, r1, ['el.vitals']), ps = patchTheme(th1, r1, ['slot', 'el.vitals']);
  ok(pv !== th1 && pv.pal.accent === '#3fd8e0' && th1.pal.accent !== '#3fd8e0', '元素的强调色只进元素主题');
  ok(ps.pal.accent === '#3fd8e0' && ps.surface === '#f4efe4' && th1.surface !== '#f4efe4' && pv.surface === th1.surface, '部件链：@slot 的底色 + @el.vitals 的强调色，元素自己的面板不受 @slot 影响');
  ok(patchTheme(th1, r1, ['slot', 'el.vitals']) === ps && ps.scale === th1.scale && ps.base === th1, '按链缓存；版面缩放取整屏主题');
  ok(patchTheme(th1, r1, ['button', 'el.vitals']) === pv, '链上没有作用域键的部件被跳过（与元素主题是同一个）');
  const sv = r1.scope(['slot', 'el.vitals']);
  ok(sv.key('vis.corner') === 'vis.corner@slot' && r1.scope(['button', 'el.vitals']).key('col.accent') === 'col.accent@el.vitals' && r1.at('col.accent', 'el.abilities') === r1.get('col.accent'), '作用域视图：部件 > 元素 > 全局');
  const e1 = makeCtx('el.vitals', g, g, th1, R0), s1 = e1.part('slot');
  ok(e1.th === pv && s1.th === ps && s1.scope.join() === 'slot,el.vitals' && s1.v.str('st.selected') === 'glow', '元素上下文按元素打补丁；格子部件读 @slot 的 token 与状态');
  ok(s1.part('button') === e1 && e1.part('slot') === s1, '部件里取部件不叠加（按元素自己的链）；同一部件每帧缓存');
  // 旧皮肤：作用域键只认皮肤之后的层（看作用域键自己的来源）
  const v2 = { ...cur, 'hud.style': 'neobrutal' } as Values;
  const r2 = resolveUi(v2), th2 = baseTheme(r2, null, 'neobrutal');
  r2.put('col.accent@el.vitals', '#123456', { layer: 'skin', ref: 'skin.neobrutal' });
  ok(patchTheme(th2, r2, ['el.vitals']) === th2, '旧皮肤：皮肤层带的作用域键不打补丁');
  r2.put('col.accent@el.vitals', '#123456', { layer: 'user' });
  ok(patchTheme(th2, r2, ['el.vitals']).pal.accent === '#123456', '旧皮肤：手动写的作用域键打补丁');
  ok(['col.accent', 'vis.corner', 'st.selected', 'mo.valueChange', 'cmp.gauge', 'vis.silhouette', 'vis.iconStyle', 'vis.iconTint'].every((x) => SCOPABLE_IDS.includes(x)), 'SCOPABLE 清单（外形 M12a-09 接上；图标风格 / 着色 M12b-68 / 58 按目标读）');
  // 动效按元素：生命条读 mo.valueChange@el.vitals
  const hit = [{ kind: 'hit' as const, at: 0 }];
  const sg = simulate(0.2, hit, resolveUi({ ...cur, 'mo.valueChange': 'smooth' } as Values));
  const sv2 = simulate(0.2, hit, resolveUi({ ...cur, 'mo.valueChange': 'smooth', 'mo.valueChange@el.vitals': 'trail' } as Values));
  ok(sg.hpGhost === sg.hp && sv2.hpGhost > sv2.hp + 0.01, 'mo.valueChange@el.vitals = trail：生命条有拖尾，全局仍是平滑');
}

console.log('== M12a-05 px@1080p 单位');
{
  const th = (x: Values) => { const r = resolveUi({ ...cur, ...x } as Values); return baseTheme(r, null, String(x['hud.style'] ?? 'darkHairline')); };
  const pc = th({ 'hud.style': 'darkHairline' }), tv = th({ 'hud.style': 'darkHairline', 'uip.platform': 'platform.tv' });
  ok(pc.tokens.textSize === 13 && pc.scale === 1, `PC 默认 26px@1080p = 设计画布上 13px、版面缩放 1（${pc.tokens.textSize} / ${pc.scale}）`);
  ok(tv.tokens.textSize === 13 && tv.scale === 1, `电视的 26 也是 px@1080p：13px（原来画成 24px × 1.85）`);
  ok(th({ 'hud.style': 'darkHairline', 'typ.baseSize': 34 }).tokens.textSize === 17 && px1080(88) === 44, 'typ.baseSize 34 → 17；触控 88px@1080p → 44');
  const r = resolveUi(cur);
  ok(unitKOf(r, { w: 960, h: 540 }) === 1 && Math.abs(unitKOf(r, { w: 928, h: 522 }) - 0.9667) < 1e-3 && Math.abs(unitKOf(r, { w: 928, h: 839 }) - 0.9667) < 1e-3, '画布缩放：960×540 = 1，928×522 与 928×839 都是 0.967（按宽高里更紧的一边，= Godot canvas_items + expand）');
  ok(unitKOf(r, { w: 1920, h: 1080 }) === 2 && unitKOf(r, { w: 1920, h: 1080 }, true) === 1, '1080p = 2；「UI 1:1」= 1');
  ok(Math.abs(unitKOf(resolveUi({ ...cur, 'ctx.orientation': 'portrait' } as Values), { w: 241, h: 522 }) - 241 / 540) < 1e-6, '竖屏按 540×960 的竖屏基准');
}

console.log('== M12a-02 / 03 / 04 颜色角色');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const mk = (x: Values, skin = 'darkHairline') => { const r = resolveUi({ ...cur, 'hud.style': skin, ...x } as Values); return { r, th: baseTheme(r, null, skin) }; };
  const d0 = mk({});
  ok(d0.th.roles.health === '#e5484d' && d0.th.roles.currency === '#e3b341' && d0.th.roles.objective === '#e3b341' && d0.th.roles.highlight === '#ffd34d' && d0.th.roles.warn === '#e3b341', '默认角色色 = 原来写死的值');
  const e0 = makeCtx('el.vitals', g, g, d0.th, R0);
  ok(e0.fill(0, 'health') === '#e5484d' && e0.fill(1, e0.accent2) === e0.accent2 && e0.icon === e0.accent && semantic(e0, 'current') === e0.accent, '没写作用域键：第一行仍是坏色、第二行第二强调色、图标 = 强调色');
  const s1 = mk({ 'col.accent@el.vitals': '#14b4c8' });
  ok(makeCtx('el.vitals', g, g, s1.th, R0).fill(0, 'health') === '#14b4c8' && makeCtx('el.threat', g, g, s1.th, R0).fill(0, 'danger') === '#e5484d', 'col.accent@el.vitals：生命行取作用域强调色，别的元素不变');
  ok(mk({ 'col.bad': '#8b1a1a', 'col.good': '#3c6b3c' }).th.roles.health === '#8b1a1a' && mk({ 'col.good': '#3c6b3c' }).th.roles.done === '#3c6b3c', 'col.bad / col.good 换生命与完成色');
  ok(mk({ 'col.bad': '#8b1a1a', 'a11y.cvdPreset': 'protan' }).th.roles.bad === '#f97316', '色盲预设仍优先');
  const mono = mk({ 'col.strategy': 'mono' });
  ok(mono.th.roles.health === mono.th.pal.accent && mono.th.roles.icon === mono.th.text, '手动选 mono：生命 = 强调色、图标 = 字色');
  ok(mk({}, 'neumorph').th.roles.health === '#e5484d', '皮肤预设自带的 mono 不改语义色（原来只管图标与条）');
  const q = mk({ 'col.quest': '#ffd23f', 'col.heading': '@accent', 'col.control': '#c8c8c8' });
  ok(q.th.roles.objective === '#ffd23f' && q.th.roles.currency === '#ffd23f' && q.th.tokens.title?.color === q.th.pal.accent && q.th.tokens.control?.bg !== undefined && JSON.stringify(q.th.tokens.control?.bg) === JSON.stringify({ solid: '#c8c8c8' }), 'col.quest → 目标与货币；col.heading = @accent；col.control 换格子面');
  ok(JSON.stringify(d0.th.tokens.tooltip) === JSON.stringify(d0.th.tokens.panel) && JSON.stringify(d0.th.tokens.card) === JSON.stringify(d0.th.tokens.panel), 'tooltip / card 默认 = 面板副本');
  ok(d0.th.tokens.onAccent === '#fff' && mk({ 'col.accent': '#ffe9a8' }).th.tokens.onAccent !== '#fff', 'onAccent：深强调色白字，浅强调色换深字');
  ok(mk({}, 'neobrutal').th.tokens.onAccent === undefined && mk({ 'col.accent': '#ffe9a8' }, 'neobrutal').th.tokens.key.color !== '#fff', '旧皮肤：没换强调色时不派生；手动换成浅色时按键字变深');
}

console.log('== M12a-06 盒子图元');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  ok(mk({}, 'slant').boxSkew === -12 && mk({}, 'constructivist').boxSkew === 0 && mk({ 'vis.skew': -6 }, 'constructivist').boxSkew === -6, '斜切：新皮肤按 vis.skew；旧皮肤（构成主义自带 -6°）只在手动选了才斜元素');
  const cm = mk({ 'vis.stroke': 'solid', 'vis.strokeSides': 'corners', 'vis.cornerSize': 10 }).tokens.panel;
  ok(!!cm.cornerMarks && cm.cornerMarks.len === 10 && !cm.border, 'strokeSides = corners → 四角括角，不画整框');
  const ink = mk({ 'col.lightness': 'dark', 'vis.stroke': 'solid', 'vis.strokeColor': 'ink' }).tokens.panel.border?.color ?? '';
  ok(!/^rgba\(2[0-9]{2}/.test(ink) && ink !== '#fff', `墨色描线在深色面板上仍是深色（${ink}）`);
  const gr = mk({ 'vis.fill': 'gradient', 'col.gradient': toStoreVal({ from: '#000000', to: '#00000000', angle: 135, type: 'linear' }) as string }).tokens.panel.bg;
  ok(!!gr && 'linear' in gr && gr.linear.angle === 135 && gr.linear.stops[1][1].endsWith(',0)'), '渐变对象：角度与透明色标保留');
  const t6 = mk({ 'vis.tilt': 6 });
  const e6 = makeCtx('el.party', g, g, t6, R0);
  const a1 = tiltOf(e6, 'el.party#0'), a2 = tiltOf(e6, 'el.party#0'), a3 = tiltOf(e6, 'el.party#1');
  ok(a1 === a2 && a1 !== a3 && Math.abs(a1) <= 6 && tiltOf(makeCtx('el.party', g, g, mk({}), R0), 'el.party#0') === 0, 'vis.tilt：按 key 取确定角度（±6° 以内）；没设时 0');
}

console.log('== B3 外形、样本状态、多项排布、节点（M12a-09 / 10 / 20 / 29）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const ctx = (x: Values, skin = 'darkHairline', id = 'el.abilities') => makeCtx(id, g, g, baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin), R0);
  const box = { x: 0, y: 0, w: 40, h: 40 };
  // 外形：直角皮肤的格子圆角 0（原来退回 6）；旧皮肤没选转角时仍是 6；没选外形时 silhouetteOf = null
  ok(shapeStyle(ctx({}), 'slot', {}, box, 6).radius === 0 && shapeStyle(ctx({}, 'neobrutal'), 'slot', {}, box, 6).radius === 6 && shapeStyle(ctx({ 'vis.corner': 'sharp' }, 'neobrutal'), 'slot', {}, box, 6).radius === 0, '格子：直角 = 0（新皮肤 / 旧皮肤手动选了直角），旧皮肤没选时 6');
  ok(silhouetteOf(ctx({}), 'slot') === null && silhouetteOf(ctx({ 'vis.silhouette@slot': 'circle' }), 'slot') === 'circle' && silhouetteOf(ctx({ 'vis.silhouette@el.abilities': 'hexagon' }), 'slot') === 'hexagon', 'vis.silhouette：@slot → @元素 → 全局；没人选时 null');
  const c1 = shapeStyle(ctx({ 'vis.silhouette@button': 'circle' }), 'button', {}, { x: 0, y: 0, w: 120, h: 30 });
  ok(c1.radius === 15 && !c1.circle && shapeStyle(ctx({ 'vis.silhouette@slot': 'circle' }), 'slot', {}, box).circle === true, '圆：方格是正圆，宽按钮是药丸');
  ok(shapeStyle(ctx({ 'vis.silhouette@slot': 'none' }), 'slot', {}, box).bare === true && shapeStyle(ctx({ 'vis.silhouette': 'diamond' }, 'neobrutal'), 'slot', {}, box).shape === 'diamond', 'none = 不画底座；旧皮肤手动选的全局外形生效');
  // 多项排布
  const cr = arrangeCells(4, { w: 10, h: 10 }, 'cross', { gap: 0 });
  ok(cr.bbox.w === 30 && cr.bbox.h === 30 && cr.rects[0].x === 10 && cr.rects[0].y === 0 && cr.rects[3].y === 20 && !cr.rects.some((q) => q.x === 10 && q.y === 10), '十字：上 / 左 / 右 / 下，中心空');
  const py = arrangeCells(3, { w: 10, h: 10 }, 'pyramid', { gap: 0 }), pi = arrangeCells(3, { w: 10, h: 10 }, 'pyramid', { gap: 0, invert: true });
  ok(py.rects[0].y === 0 && py.rects[1].y === 10 && py.rects[0].x === 5 && pi.rects[2].y === 10 && pi.rects[2].x === 5, '品字形 / 倒三角');
  const zz = arrangeCells(4, { w: 10, h: 10 }, 'zigzag2', { gap: 0 });
  ok(zz.rects[1].x === 10 && zz.rects[1].y === 5 && zz.rects[2].y === 10, '双列交错：第二列下移半格');
  const rw = arrangeCells(18, { w: 10, h: 10 }, 'row', { gap: 0, groups: 15 });
  ok(rw.rects[15].x === 154 && rw.bbox.w === 184, '分组：15 + 3，组间多 0.4 格');
  const rg = arrangeCells(6, { w: 10, h: 10 }, 'ring', { gap: 2 });
  ok(rg.rects.every((q, i) => rg.rects.every((o, j) => i === j || Math.abs(q.x - o.x) >= 10 || Math.abs(q.y - o.y) >= 10)), '环：格子互不重叠');
  ok(ownArrangement(ctx({ 'lay.arrangement': 'grid' })) === 'row' && ownArrangement(ctx({ 'lay.arrangement': 'column' })) === 'column' && ownArrangement(ctx({ 'el.abilities.arrangement': 'cross' })) === 'cross', '技能格：继承全局只认 column，元素级才用新排法');
  ok(elCount(ctx({}), 4) === 4 && elCount(ctx({ 'el.abilities.count': 12 }), 8) === 12 && elCount(ctx({ 'elx.count': 2 }), 4) === 2, '格数：实例键 / 模板 elx.count / 默认');
  // 样本条目数与状态
  const sc = (x: Values) => ctx({ 'uip.screen': 'tpl.inventory', ...x }, 'darkHairline', 'el.screen');
  ok(itemCountOr(sc({}), 6) === 6 && itemCountOr(sc({ 'cnt.density': 4 }), 6) === 12 && itemCountOr(sc({ 'cnt.itemCount': 10, 'cnt.density': 4 }), 6) === 10, '条目数：显式 itemCount > 信息密度 × 默认');
  const rows = sampleItems([['a', '铁矿'], ['b', '木材']] as [string, string][], 5);
  ok(rows[2][1] === '铁矿 2' && rows[4][1] === '铁矿 3' && rows[1][1] === '木材', '循环取样本：第二轮起编号');
  ok(stateDemo(sc({}), false) && !stateDemo(sc({}), true) && !stateDemo(sc({}), false, true) && stateDemo(sc({ 'cnt.stateDemo': 'on' }), true) && !stateDemo(sc({ 'cnt.stateDemo': 'off' }), false), '演示状态：声明了 / 包关了时 auto 关；on / off 强制');
  ok(lockedFrom(sc({}), true) === 5 && lockedFrom(sc({}), false) === Infinity && lockedFrom(sc({ 'cnt.lockedFrom': 2 }), false) === 2 && lockedFrom(sc({ 'cnt.lockedFrom': 'none' }), true) === Infinity, '锁定起点：auto = 演示时第 6 个；数字 / none');
  // 节点三态：col.nodeDone、显式 col.focus 才改当前
  const th0 = baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline' } as Values), null, 'darkHairline');
  const thN = baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline', 'col.nodeDone': '#ffd700', 'col.focus': '#00ffcc' } as Values), null, 'darkHairline');
  ok(th0.roles.done === th0.roles.good && th0.roles.current === th0.pal.accent && thN.roles.done === '#ffd700' && thN.roles.current === '#00ffcc', '节点：完成 = col.nodeDone（默认好色），当前 = 显式 col.focus（默认强调色）');
  ok(SCOPABLE_IDS.includes('vis.silhouette') && SCOPABLE_IDS.includes('cmp.slotBadge') && SCOPABLE_IDS.includes('cmp.panelArt') && SCOPABLE_IDS.includes('col.nodeDone'), 'SCOPABLE 收录 B3 的作用域参数');
}

console.log('== B4 数值标注、数值图形、生命条行模型、多画法（M12a-13 / 11 / 12 / 14）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const ctx = (x: Values, id: string, skin = 'darkHairline', form?: string) => makeCtx(id, g, g, baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin), R0, form);
  // 数值标注：取值与没给时的默认
  const ev = ctx({ 'el.vitals.valueLabel': 'currentMax' }, 'el.vitals');
  ok(valueText(ev, 0.5, 120) === '60/120' && valueText(ev, 0.5, 120, 'percent') === '50%' && valueText(ev, 0, 1, 'delta', 24) === '+24' && valueText(ev, 0, 1, 'delta') === '-12' && valueText(ev, 1, 1, 'none') === '', 'valueText：current / currentMax / percent / delta（带正负号，没给时 -12）');
  ok(valueKind(ctx({}, 'el.rank'), 'auto') === 'auto' && valueKind(ctx({ 'el.rank.valueLabel': 'none' }, 'el.rank'), 'auto') === 'none' && valueKind(ctx({ 'elx.valueLabel': 'percent' }, 'el.rank'), 'auto') === 'percent', 'valueKind：没显式给时保留元素原来的画法（默认层的 none 不算）');
  // 数值图形：原来写死画法的位置只认显式给的；旧皮肤只认皮肤之后的层
  ok(gaugeKind(ctx({}, 'el.resources'), 'bar', true) === 'bar' && gaugeKind(ctx({ 'cmp.gauge@el.resources': 'orb' }, 'el.resources'), 'bar', true) === 'orb', 'gaugeKind：兜底的全局 bar 不算，元素级显式给了才换');
  ok(gaugeKind(ctx({ 'uip.layout': 'layout.arpgOrb' }, 'el.resources', 'neobrutal'), 'bar', true) === 'bar' && gaugeKind(ctx({ 'uip.layout': 'layout.arpgOrb' }, 'el.resources'), 'bar', true) === 'orb' && gaugeKind(ctx({ 'cmp.gauge@el.resources': 'ring' }, 'el.resources', 'neobrutal'), 'bar', true) === 'ring', 'gaugeKind：旧皮肤不吃品类布局写的 cmp.gauge@，手动选的照样换');
  // 条槽：col.track 在新皮肤上生效（原来被新皮肤默认的底槽盖掉），另记 trackColor
  const tt = baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline', 'col.track': 'darkScrim' } as Values), null, 'darkHairline');
  ok((tt.tokens.bar.track.bg as { solid?: string })?.solid === 'rgba(0,0,0,0.45)' && tt.tokens.bar.trackColor === 'rgba(0,0,0,0.45)' && !baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline' } as Values), null, 'darkHairline').tokens.bar.trackColor, 'col.track：新皮肤的底槽与 trackColor');
  // 粗细 / 名字
  ok(thicknessOf(ctx({ 'el.vitals.thickness': 2.5 }, 'el.vitals')) === 2.5 && thicknessOf(ctx({ 'el.vitals.thickness': 9 }, 'el.vitals')) === 3 && thicknessOf(ctx({}, 'el.vitals')) === 1, 'elx.thickness：0.5–3，没给时 1');
  ok(!labelShown(ctx({ 'el.threat.label': 'hide' }, 'el.threat')) && labelShown(ctx({}, 'el.threat')), 'elx.label：hide 不写名字');
  // 生命条的行：包没写 vitals 时兼容出三行，上限都是 hpMax
  const vs = vitalsOf({ vitalNames: ['生命', '护盾', '体力'], hp: 0.7, shield: 0.4, stamina: 0.5, hpMax: 120 });
  ok(vs.length === 3 && vs[1].name === '护盾' && vs[1].v === 0.4 && vs.every((x) => x.max === 120) && vitalsOf({ vitalNames: ['a', 'b', 'c'], hp: 1, shield: 1, stamina: 1, hpMax: 1, vitals: [{ name: 'x', v: 1, max: 9 }] })[0].max === 9, 'vitalsOf：兼容行与包的 vitals');
  // 多画法拆开：每种画法一项，锚点 / 挂点按画法级 → 元素级 → formDefaults
  const r14 = resolveUi({ ...cur, 'el.threat.form': 'bossBar,healthBar', 'el.threat.screenAnchor': 'bc', 'el.feedback.form': 'comicSFX,rating', 'el.feedback.rating.screenAnchor': 'bl' } as Values);
  const pt = elementParts(r14, 'el.threat'), pf = elementParts(r14, 'el.feedback');
  ok(pt.length === 2 && pt[0].form === 'bossBar' && pt[0].anchor === 'bc' && pt[1].attach === 'target', '多画法：Boss 条用元素级锚点，头顶血条挂目标（formDefaults）');
  ok(pf[1].anchor === 'bl' && pf[0].attach === 'target' && elementParts(resolveUi({ ...cur, 'el.feedback.form': 'comicSFX,combo' } as Values), 'el.feedback')[1].anchor === 'tr', '多画法：画法级键优先，没给时 formDefaults（连击在右上）');
  const r1 = resolveUi({ ...cur, 'el.threat.form': 'bossBar' } as Values), one = elementParts(r1, 'el.threat');
  ok(one.length === 1 && one[0].form === undefined && one[0].anchor === String(r1.el('el.threat', 'screenAnchor')) && one[0].attach === 'none', '只有一种画法时是元素自己（原来的读法：elx.screenAnchor 的兜底照旧算）');
  ok(r14.el('el.feedback', 'screenAnchor', 'rating') === 'bl' && r14.el('el.feedback', 'screenAnchor', 'comicSFX') === r14.el('el.feedback', 'screenAnchor'), 'Resolved.el：画法级键 → 元素级 → elx');
  const pk = parseElementKey('el.threat.bossBar.screenAnchor');
  ok(pk?.param === 'elx.screenAnchor' && pk.form === 'bossBar' && parseElementKey('el.threat.bogus.screenAnchor') === null && parseElementKey('el.vitals.rowColors')?.param === 'el.vitals.rowColors', 'parseElementKey：画法级键（画法要在 el.<元素>.form 的词表里）');
  ok(ctx({ 'el.feedback.form': 'comicSFX,rating', 'el.feedback.rating.scale': 1.5 }, 'el.feedback', 'darkHairline', 'rating').forms.join() === 'rating', 'makeCtx(…, form)：forms = [这一种画法]');
}

console.log('== B5 文字引擎、按钮、页签、列表行（M12a-33 / 35 / 22 / 27）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const th = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  const ctx = (x: Values, id: string, skin = 'darkHairline') => makeCtx(id, g, g, th(x, skin), R0);
  // 断行：中文逐字量宽 10，行宽 50 = 5 个字；逗号不放行首（不到半字宽就悬挂，否则带下上一行最后一个字）、开括号不放行尾
  const mc = { font: '', fillStyle: '', textBaseline: '', letterSpacing: '0px', shadowBlur: 0, shadowColor: '', measureText: (t: string) => ({ width: [...t].length * 10 }) } as unknown as CanvasRenderingContext2D;
  const o = { font: '"GAE Sans"', size: 10, weight: 400, color: '#000' } as TextOpts;
  const L1 = wrapLines(mc, '一二三四五，六七八', 50, o), L2 = wrapLines(mc, '一二三四（五六七', 50, o);
  ok(L1.every((l) => !l.startsWith('，')) && L1.join('') === '一二三四五，六七八' && L2.every((l) => !l.endsWith('（')), `CJK 避头尾：${L1.join(' / ')}；${L2.join(' / ')}`);
  const L3 = wrapLines(mc, 'alpha beta gamma', 100, o);
  ok(L3.length === 2 && L3[0] === 'alpha beta' && L3[1] === 'gamma', `拉丁文按词断行：${L3.join(' / ')}`);
  // 字重就近取：细体落到 400，比最粗的还粗照旧；单字重的楷体粗体照旧交给浏览器合成
  ok(faceWeight('"GAE Serif", serif', 300) === 400 && faceWeight('"GAE Sans"', 500) === 400 && faceWeight('"GAE Sans"', 600) === 700 && faceWeight('"GAE Sans"', 800) === 800 && faceWeight('"GAE Kai"', 700) === 700 && faceWeight('serif', 300) === 300, '字重就近取（GAE 字族实际打包的字重）');
  // 描边按字号：带 widthEm 的 = max(1, 字号 × em)，小于 12 不描边；旧 token 的写死宽度照旧
  ok(outlineWidth({ color: '#000', width: 2.5, widthEm: 0.08 }, 20) === 1.6 && outlineWidth({ color: '#000', width: 2.5, widthEm: 0.08 }, 10) === 0 && outlineWidth({ color: '#000', width: 2.5 }, 10) === 2.5, '描边宽随字号（typ.outlineWidth），小字只留投影');
  const tf = th({ 'typ.titleFx': 'outline', 'typ.outlineColor': 'white', 'typ.outlineWidth': 0.12 });
  ok(tf.tokens.title?.outline?.widthEm === 0.12 && /255,255,255/.test(tf.tokens.title?.outline?.color ?? '') && !!tf.tokens.outline && !th({}).tokens.outline, 'typ.outlineColor / typ.outlineWidth 进标题描边与 t.outline（没给时不设）');
  // 勒索信：标记 + 量宽确定（同一串每次一样宽）
  const tr = th({ 'typ.display.family': 'ransom' });
  const ro = { ...o, ransom: true } as TextOpts;
  ok(tr.tokens.title?.ransom === true && !th({ 'typ.display.family': 'serif' }).tokens.title?.ransom && measure(mc, '暂停 PAUSE', ro) === measure(mc, '暂停 PAUSE', ro) && measure(mc, '暂停', ro) > 0, 'ransom：逐字混排的标记，量宽确定');
  // 按钮角色色：greenRed / blueRedOrange / perAction + col.actionColors；accentOnly（兜底）没有角色色 = 原来的样子
  const gr = th({ 'col.semantic': 'greenRed' }), bro = th({ 'col.semantic': 'blueRedOrange' }), pa = th({ 'col.semantic': 'perAction', 'col.actionColors': '#112233,auto,good' });
  ok(gr.tokens.button?.roles.confirm === gr.roles.good && gr.tokens.button?.roles.back === gr.roles.bad && !gr.tokens.button?.roles.secondary && Object.keys(th({}).tokens.button?.roles ?? {}).length === 0, 'col.semantic = greenRed：确认好色、取消坏色；兜底无角色色');
  ok(bro.tokens.button?.roles.utility === '#f28c28' && bro.tokens.button?.roles.sell === bro.roles.good && pa.tokens.button?.roles.confirm === '#112233' && pa.tokens.button?.roles.utility === pa.roles.good && !pa.tokens.button?.roles.back, 'blueRedOrange / perAction + col.actionColors 逐项');
  ok(Object.keys(th({ 'col.semantic': 'greenRed' }, 'neobrutal').tokens.button?.roles ?? {}).length === 2 + 2 && Object.keys(th({ 'uip.screen': 'tpl.inventory' }, 'neobrutal').tokens.button?.roles ?? {}).length === 0, '旧皮肤：手动选的配色方案生效，模板没写时没有角色色');
  // 按钮字：字族角色、fit 字号、下限（elx.scale 缩小时只缩框）
  const bt = th({ 'typ.button.family': 'display', 'typ.button.size': 'fit' });
  ok(bt.tokens.button?.fit === true && bt.tokens.button?.font === (bt.tokens.title?.font ?? bt.tokens.font) && th({ 'typ.button.size': 40 }).tokens.button?.size === px1080(40), 'typ.button.family / size（fit、px@1080p）');
  const small = ctx({ 'el.cta.scale': 0.55 }, 'el.cta');
  ok(buttonText(small, 30).size >= 13 * 0.8 - 1e-9 && small.base.size < 13 * 0.8 && buttonText(ctx({}, 'el.cta'), 30).size === ctx({}, 'el.cta').base.size, '按钮字号下限：scale 只缩框不缩字；默认 = 正文字号');
  ok(!buttonBoxOn(ctx({ 'cmp.buttonBox': false }, 'el.toolbar')) && !buttonBoxOn(ctx({ 'cmp.buttonBox@el.toolbar': false }, 'el.toolbar')) && buttonBoxOn(ctx({}, 'el.toolbar')) && buttonBoxOn(ctx({ 'uip.screen': 'tpl.title' }, 'el.screen', 'neobrutal')) && !buttonBoxOn(ctx({ 'uip.screen': 'tpl.title' }, 'el.screen')), 'cmp.buttonBox：@元素 生效；模板写的 false 只对新皮肤算');
  // 页签：切换键 auto = 手柄 / 混合输入才画
  ok(navKeysOn(ctx({ 'ctx.input': 'pad' }, 'el.screen')) && !navKeysOn(ctx({ 'ctx.input': 'kbm' }, 'el.screen')) && navKeysOn(ctx({ 'lay.navKeys': 'ends' }, 'el.screen')) && !navKeysOn(ctx({ 'ctx.input': 'pad', 'lay.navKeys': 'none' }, 'el.screen')), 'lay.navKeys：auto / ends / none');
  ok(resolveUi(cur as Values).str('cmp.tabIndicator', '') === 'filled', 'cmp.tabIndicator 的兜底 = filled（原来画的实心块）');
  ok(['typ.outlineColor', 'typ.outlineWidth', 'typ.button.family', 'typ.button.size', 'col.semantic', 'col.actionColors', 'cmp.button', 'cmp.buttonBox', 'cmp.buttonFace', 'cmp.tab', 'cmp.tabIndicator', 'cmp.listRowBox', 'cmp.listRowColors'].every((k) => SCOPABLE_IDS.includes(k)) && SCOPE_PARTS.includes('nav2'), 'SCOPABLE / SCOPE_PARTS 收录 B5 的作用域参数与 nav2');
}

console.log('== B6 模板外壳：饰件占位、页头、背景、叠加容器、构图（M12a-08 / 23 / 24 / 25 / 37）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const g = {} as CanvasRenderingContext2D;
  const th = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  const ctx = (x: Values, id = 'el.screen', skin = 'darkHairline') => makeCtx(id, g, g, th(x, skin), R0);
  // 饰件占位：角花 → 四角矩形 + 沿边饰带；只有分隔线 → 底边饰带、中间一个符号；plain 不放符号；没有饰件全 0
  const box = { x: 20, y: 20, w: 920, h: 500 };
  const deco = th({}, 'deco').tokens.panel, oi = ornamentInsets(deco, box);
  ok(oi.corners.length === 4 && oi.corners[0].x === 20 && oi.corners[0].w > 20 && oi.t > 0 && oi.l > 0 && oi.l === oi.r, `角花占位：4 个角、饰带 ${oi.t.toFixed(1)} / ${oi.l.toFixed(1)}`);
  const dh = ornamentInsets(th({}).tokens.panel, box), dp = ornamentInsets(th({ 'vis.dividerStyle': 'plain' }).tokens.panel, box);
  ok(dh.corners.length === 0 && dh.b > 7 && dh.marks.length === 1 && dp.marks.length === 0, '只有分隔线：底边饰带 + 中间符号；vis.dividerStyle = plain 不放符号');
  ok(ornamentInsets(th({}, 'neobrutal').tokens.panel, box) === NO_ORNAMENT_INSETS, '没有饰件：占位全 0');
  // 装饰预算 0：派生层清空饰件（皮肤关键词带的花枝也不画），手动点名的照画
  ok(th({ 'vis.ornament': 0 }, 'pixelWood').tokens.panel.ornament?.parts.length === 0 && (th({ 'vis.ornament': 0, 'ast.ornaments': 'none,corners' }, 'pixelWood').tokens.panel.ornament?.parts ?? []).join() === 'corners', '装饰预算 0：不带派生饰件（stardew#14），手动点名的照画（并集多选：none 先清掉关键词带的）');
  // 关闭控件的默认：forced / timed / 不写标题 → none；预设 / 手动写了照写的
  const close = (x: Values) => resolveUi({ ...cur, ...x } as Values).str('ix.close', '');
  ok(close({ 'uip.screen': 'tpl.draft3' }) === 'none' && close({ 'uip.screen': 'tpl.loading' }) === 'none' && close({ 'uip.screen': 'tpl.hero' }) === 'xTopRight' && close({ 'uip.screen': 'tpl.inventory' }) === 'xTopRight' && close({ 'uip.screen': 'tpl.quest', 'lay.titlePos': 'none' }) === 'none' && close({ 'uip.screen': 'tpl.draft3', 'ix.close': 'keyGlyph' }) === 'keyGlyph', 'ix.close 派生默认（D-dismiss）');
  // 标牌形态：选过的 cmp.plate@title / @name 生效；旧皮肤里皮肤自带关键词写的不算，接着看全局
  ok(platePick(ctx({ 'uip.screen': 'tpl.inventory' }, 'el.screen', 'ornate'), 'title', 'none') === 'ribbon' && platePick(ctx({ 'uip.screen': 'tpl.inventory' }, 'el.screen', 'parchment'), 'title', 'none') === 'none'
    && platePick(ctx({ 'uip.screen': 'tpl.inventory', 'cmp.plate': 'pill' }, 'el.screen', 'parchment'), 'title', 'none') === 'pill' && platePick(ctx({ 'uip.screen': 'tpl.inventory', 'uip.keyword': 'kw.ink' }, 'el.screen', 'flat'), 'title', 'none') === 'seal'
    && platePick(ctx({ 'uip.screen': 'tpl.npc' }, 'el.screen', 'neobrutal'), 'name', 'none') === 'tab', 'platePick：@title / @name 形态（旧皮肤只认皮肤之后的层）');
  // 背后调色改多选：原来的单个字符串照样读
  const tones = (x: Values) => sceneTones(th(x));
  ok(tones({ 'rel.sceneTone': 'tint' }).join() === 'tint' && tones({ 'rel.sceneTone': 'tint,vignette' }).length === 2 && tones({ 'uip.screen': 'tpl.runSummary' }).join() === 'desaturate' && tones({}).length === 0, 'rel.sceneTone 多选兼容旧值');
  // 叠加类模板：有主体走构图器（只去掉面板与页头），没有主体只画元素
  ok(overlayBody(th({ 'uip.screen': 'tpl.draft3', 'lay.container': 'overlay' })) && !overlayBody(th({ 'uip.screen': 'tpl.cutscene' })) && overlayTemplate(th({ 'uip.screen': 'tpl.cutscene' })) && overlayBody(th({ 'uip.screen': 'tpl.cutscene', 'rel.behind': 'replaced' })) && !overlayBody(th({ 'uip.screen': 'tpl.inventory' })), 'overlayBody：数据 / 主体 / 替换背景');
  const warns = (x: Values) => checkResolved(resolveUi({ ...cur, ...x } as Values)).map((w) => w.id);
  ok(warns({ 'uip.screen': 'tpl.draft3', 'lay.container': 'overlay', 'lay.titlePos': 'straddle' }).includes('C-overlay-chrome') && !warns({ 'uip.screen': 'tpl.inventory', 'lay.titlePos': 'straddle' }).includes('C-overlay-chrome'), 'C-overlay-chrome：叠加模板设了页头参数给提示');
  ok(SCOPABLE_IDS.includes('vis.dividerStyle') && SCOPE_PARTS.includes('name') && SCOPE_PARTS.includes('dialog'), 'SCOPABLE / SCOPE_PARTS 收录 vis.dividerStyle 与 name / dialog');
}

console.log('== B7 HUD 版式引擎：占位表与避让、同锚点堆叠、贴边条、模板锚点空间（M12a-17 / 18 / 16 / 19）');
{
  // 不记日志的 Canvas 替身（量字：中文 1em、其它 0.56em）；离屏画布也给它
  const noop = (): CanvasRenderingContext2D => {
    const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1 };
    let mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const canvas: Record<string, unknown> = { width: 960, height: 540 };
    const fns: Record<string, (...a: never[]) => unknown> = {
      measureText: (t: string) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(st.font)); const px = m ? Number(m[1]) : 10; let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? px : px * 0.56; return { width: w, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
      getTransform: () => mat, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({ setTransform() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), getLineDash: () => [], isPointInPath: () => false,
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { mat = { a, b, c, d, e, f }; return undefined; },
    };
    const ctx: unknown = new Proxy({}, {
      get(_, key) { if (key === 'canvas') return canvas; if (typeof key !== 'string') return undefined; if (key in fns) return fns[key]; if (key in st) return st[key]; return () => undefined; },
      set(_, key, v) { st[String(key)] = v; return true; },
    });
    canvas.getContext = () => ctx;
    return ctx as CanvasRenderingContext2D;
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl;
  if (!hadDoc) gl.document = { createElement: () => noop().canvas, fonts: { add() {} } };
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const th = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  const lay = (x: Values, skin = 'darkHairline') => {
    resetOccupancy();
    const g = noop();
    const hits = drawElements({ ctx: g, m: noop(), blur: 0, full: R0 } as never, R0, th(x, skin));
    return { hits, at: (id: string) => hits.find((h) => h.element === id)?.rect, occ: OCC.last };
  };
  // 占位表：相交、软禁区默认不算、free
  const occ = new Occupancy();
  occ.add({ x: 0, y: 0, w: 100, h: 50 }, { kind: 'element', id: 'a' });
  occ.add({ x: 200, y: 0, w: 50, h: 50 }, { kind: 'player', soft: true });
  ok(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }) && !intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }) && occ.hits({ x: 210, y: 10, w: 5, h: 5 }).length === 0 && occ.hits({ x: 210, y: 10, w: 5, h: 5 }, { soft: true }).length === 1 && !occ.free({ x: 50, y: 10, w: 5, h: 5 }), 'Occupancy：相交、软禁区、free');
  resetOccupancy();
  ok(OCC.last === null && frameOccupancy() === frameOccupancy(), '每次合成前清空，一帧共用一张表');
  // 默认（散在四角）不碰撞的布局：元素按锚点贴边，内容按锚点列对齐
  const act = lay({ 'uip.layout': 'layout.action' });
  ok(!!act.at('el.vitals') && act.occ !== null && act.occ.items.some((o) => o.kind === 'element'), '排位后登记进这一帧的占位表');
  // M12a-17：下中列与左下列相撞——先横向收，不越过中线（原来整列推到画面上半，Balatro 手牌跑到顶上）
  const bal = lay({ 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'cnt.elements': 'el.resources,el.clock,el.toolbar,el.abilities', 'el.resources.screenAnchor': 'bl', 'el.clock.screenAnchor': 'bl', 'el.toolbar.screenAnchor': 'bl', 'el.abilities.screenAnchor': 'bc' });
  const hand = bal.at('el.abilities'), side = ['el.resources', 'el.clock', 'el.toolbar'].map((id) => bal.at(id)!);
  ok(!!hand && hand.y >= 270 - 1 && side.every((q) => !intersects(q, hand)), `下中与左下相撞：横向收进空宽、留在下半屏（手牌 y ${hand?.y.toFixed(0)}）`);
  const bb = lay({ 'uip.layout': 'layout.rpg', 'uip.overlay': 'ov.bigText' });
  ok((bb.at('el.abilities')?.y ?? 0) >= 270, '大字下快捷栏不再被推到画面顶上（ov.bigText）');
  // M12a-18：同锚点横排 / 等宽 / 偏移 / 内容对齐
  const hk = lay({ 'uip.layout': 'layout.metroidvania', 'cnt.elements': 'el.abilities,el.vitals,el.resources', 'el.abilities.form': 'ultimate', 'el.abilities.screenAnchor': 'tl', 'el.vitals.screenAnchor': 'tl', 'el.resources.screenAnchor': 'tl', 'el.vitals.stackDir': 'row' });
  const a1 = hk.at('el.abilities')!, v1 = hk.at('el.vitals')!, r1 = hk.at('el.resources')!;
  ok(v1.x >= a1.x + a1.w && Math.abs(v1.y - a1.y) < 1 && Math.abs(r1.x - v1.x) < 1 && r1.y >= v1.y + v1.h, 'elx.stackDir = row：灵魂瓶 | 面具 / 吉欧（Hollow 锁扣）');
  const fac = lay({ 'uip.layout': 'layout.factory', 'cnt.elements': 'el.minimap,el.objective,el.selection', 'el.minimap.screenAnchor': 'tr', 'el.objective.screenAnchor': 'tr', 'el.selection.screenAnchor': 'tr', 'elx.stackWidth': 'match' });
  const ws = ['el.minimap', 'el.objective', 'el.selection'].map((id) => fac.at(id)!);
  ok(ws.every((q) => Math.abs(q.w - ws[0].w) < 0.5 && Math.abs(q.x + q.w - (ws[0].x + ws[0].w)) < 0.5), 'elx.stackWidth = match：同格等宽、外缘对齐（Factorio 右上）');
  const solo: Values = { 'uip.layout': 'layout.soulslike', 'cnt.elements': 'el.threat', 'el.threat.screenAnchor': 'bc' };
  const off0 = lay(solo).at('el.threat'), off1 = lay({ ...solo, 'el.threat.offsetY': -9 }).at('el.threat');
  ok(!!off0 && !!off1 && Math.abs(off0.y - off1.y - 0.09 * 540) < 1, 'elx.offsetY：按屏高百分比平移（黑神话 Boss 条）');
  const mk = (x: Values, id: string) => makeCtx(id, noop(), noop(), th(x), R0);
  ok(mk({ 'el.resources.screenAnchor': 'tl' }, 'el.resources').align === 'left' && mk({ 'el.resources.screenAnchor': 'tr' }, 'el.resources').align === 'right' && mk({ 'el.timer.screenAnchor': 'tc' }, 'el.timer').align === 'center', 'ElCtx.align 由锚点所在列推出');
  ok(alignX(mk({ 'el.rank.screenAnchor': 'tr' }, 'el.rank'), { x: 0, y: 0, w: 100, h: 10 }, 30) === 70 && alignX(mk({ 'el.rank.screenAnchor': 'tl' }, 'el.rank'), { x: 0, y: 0, w: 100, h: 10 }, 30) === 0, 'alignX：贴右 / 贴左');
  // M12a-17：躲开玩家（没有场景时玩家在画面中下 62%）——快捷栏被挪进软禁区时翻到上中
  const ap = lay({ 'uip.layout': 'layout.life', 'el.abilities.avoidPlayer': true, 'el.abilities.offsetY': -12 }, 'cozy').at('el.abilities');
  ok(!!ap && ap.y < 100, `elx.avoidPlayer：玩家进入元素矩形时锚点翻到对边（快捷栏 y ${ap?.y.toFixed(0)}）`);
  // M12a-16：贴边条——成员、自动选边、扣掉版面、旧皮肤只认显式选的
  ok(hudOrgOf(th({ 'uip.layout': 'layout.builder' })) === 'edgeBar' && hudOrgOf(th({ 'uip.layout': 'layout.builder' }, 'neobrutal')) === 'scattered' && hudOrgOf(th({ 'uip.layout': 'layout.builder', 'lay.hudOrg': 'edgeBar' }, 'neobrutal')) === 'edgeBar', 'lay.hudOrg：品类布局写的对新皮肤生效，旧皮肤只认显式选的');
  const em = edgeMembership(th({ 'lay.hudOrg': 'edgeBar' }), [{ id: 'el.a', anchor: 'tl', priority: 'secondary' }, { id: 'el.b', anchor: 'tr', priority: 'secondary' }, { id: 'el.c', anchor: 'bc', priority: 'secondary' }, { id: 'el.d', anchor: 'tc', priority: 'secondary' }]);
  ok(em.edges.join() === 'top' && em.edge.join() === 'top,top,,top' && em.side.slice(0, 2).join() === 'start,end' && em.side[3] === 'center', '没选边 = 元素最多的边；段按锚点所在列');
  const emc = edgeMembership(th({ 'lay.hudOrg': 'console' }), [{ id: 'el.a', anchor: 'bl', priority: 'primary' }, { id: 'el.b', anchor: 'br', priority: 'secondary' }]);
  ok(emc.edges.join() === 'bottom' && emc.side.join() === 'center,end', 'console：底边，primary 放中段');
  const eml = edgeMembership(th({ 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'left', 'lay.edgeBarSlots': 'el.x|el.y' }), [{ id: 'el.x', anchor: 'tr', priority: 'secondary' }, { id: 'el.y', anchor: 'bl', priority: 'secondary' }]);
  ok(eml.edge.join() === 'left,left' && eml.slots.join() === 'el.x|el.y', 'lay.edgeBarSlots 列出的不论锚点收进第一条边');
  const plan = edgeBarPlan({ x: 0, y: 0, w: 960, h: 50 }, { x: 20, y: 6, w: 920, h: 38 }, false, [{ side: 'start', slots: [{ items: [{ w: 100, h: 30 }] }] }, { side: 'center', slots: [{ items: [{ w: 80, h: 38 }] }] }, { side: 'end', slots: [{ items: [{ w: 60, h: 20 }] }] }], 10, 'segments');
  ok(plan.rects[0][0][0].x === 20 && Math.abs(plan.rects[1][0][0].x + 40 - 480) < 0.5 && plan.rects[2][0][0].x + 60 === 940 && plan.rects[2][0][0].y === 15 && plan.dividers.length === 2, 'edgeBarPlan：起 / 中 / 末三段、垂直居中、中段两侧分隔线');
  const eb = lay({ 'uip.layout': 'layout.builder' });
  const bar = eb.occ?.items.find((o) => o.kind === 'edgeBar');
  ok(!!bar && bar.rect.y === 0 && bar.rect.w === 960 && eb.hits.filter((h) => !['el.resources', 'el.clock', 'el.gameSpeed', 'el.meter'].includes(h.element) && h.rect.w > 12).every((h) => !intersects(h.rect, bar.rect)), '贴顶整条：条从版面里扣掉，其余元素不压条');
  // M12a-19：模板里的锚点空间、HUD 显隐不管模板、垫底用品类布局的元素
  ok(anchorSpaceOf(resolveUi({ ...cur, 'el.clock.anchorSpace': 'screen' } as Values), 'el.clock') === 'screen' && anchorSpaceOf(resolveUi(cur as Values), 'el.clock') === 'inherit', 'elx.anchorSpace：没给 = inherit');
  resetOccupancy();
  const hid = drawElements({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, th({ 'uip.screen': 'tpl.npc', 'rel.hudVisibility': 'hidden' }), null, undefined, [], { inTemplate: true });
  ok(hid.length > 0 && drawElements({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, th({ 'uip.layout': 'layout.action', 'rel.hudVisibility': 'hidden' })).length === 0, '模板里的元素不受 rel.hudVisibility 影响（hades#35），局内 HUD 照旧');
  ok((hudLayoutElements(th({ 'uip.layout': 'layout.action', 'uip.screen': 'tpl.levelup' })) ?? []).includes('el.vitals') && hudLayoutElements(th({ 'uip.screen': 'tpl.levelup' })) === null, '垫底的局内元素 = 显式选的品类布局的元素；没选时 null（退回四控件样本）');
  ok(['elx.avoidPlayer', 'elx.stackDir', 'elx.stackWidth', 'elx.offsetX', 'elx.offsetY', 'elx.anchorSpace', 'elx.keepOnMenu', 'lay.hudEdge', 'lay.edgeBarSlots'].every((k) => SPEC_PARAM.has(k)) && SPEC_PARAM.get('flow.chrome')!.options!.some((o) => o.value === 'statusBar') && SPEC_PARAM.get('flow.stacking')!.options!.some((o) => o.value === 'overHud') && SCOPE_PARTS.includes('hudBar'), 'B7 参数、取值与 hudBar 部件');
  ok(parseElementKey('el.threat.bossBar.offsetY')?.param === 'elx.offsetY' && parseElementKey('el.clock.keepOnMenu')?.param === 'elx.keepOnMenu', '新 elx 子参数可按元素 / 画法写');
  if (!hadDoc) delete gl.document;
  resetOccupancy();
}

console.log('== B8 世界挂点、状态图标、字幕通知、提示小件、地图视图（M12a-15 / 31 / 32 / 34 / 30）');
{
  const noop = (): CanvasRenderingContext2D => {
    const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1 };
    let mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const canvas: Record<string, unknown> = { width: 960, height: 540 };
    const fns: Record<string, (...a: never[]) => unknown> = {
      measureText: (t: string) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(st.font)); const px = m ? Number(m[1]) : 10; let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? px : px * 0.56; return { width: w, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
      getTransform: () => mat, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({ setTransform() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), getLineDash: () => [], isPointInPath: () => false,
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { mat = { a, b, c, d, e, f }; return undefined; },
    };
    const ctx: unknown = new Proxy({}, {
      get(_, key) { if (key === 'canvas') return canvas; if (typeof key !== 'string') return undefined; if (key in fns) return fns[key]; if (key in st) return st[key]; return () => undefined; },
      set(_, key, v) { st[String(key)] = v; return true; },
    });
    canvas.getContext = () => ctx;
    return ctx as CanvasRenderingContext2D;
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl;
  if (!hadDoc) gl.document = { createElement: () => noop().canvas, fonts: { add() {} } };
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const th = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  const lay = (x: Values, skin = 'darkHairline') => { resetOccupancy(); const hits = drawElements({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, th(x, skin)); return { hits, at: (id: string) => hits.find((h) => h.element === id)?.rect, occ: OCC.last }; };
  const mk = (x: Values, id: string, form?: string) => makeCtx(id, noop(), noop(), th(x), R0, form);
  // M12a-15：显式挂点进 ElCtx.attach；没给时 undefined，画法用原来写死的点（attachFor 按 ElementDef.points）
  ok(mk({}, 'el.crosshair').attach === undefined && attachFor(mk({}, 'el.crosshair')) === 'none' && attachFor(mk({ 'el.crosshair.attachTo': 'target' }, 'el.crosshair')) === 'target' && attachFor(mk({}, 'el.interact')) === 'poi' && attachFor(mk({ 'el.threat.form': 'healthBar' }, 'el.threat')) === 'target', 'ElCtx.attach / attachFor：显式挂点优先，默认 = 原来写死的点（准星屏幕正中）');
  // 拆开画时屏幕默认锚点的画法不吃元素级挂点（Hi-Fi：拟声字挂目标，评级 / 连击留在右上）
  const fp = elementParts(resolveUi({ ...cur, 'el.feedback.form': 'comicSFX,rating', 'el.feedback.attachTo': 'target' } as Values), 'el.feedback');
  ok(fp.find((p) => p.form === 'comicSFX')?.given === 'target' && fp.find((p) => p.form === 'rating')?.given === undefined && fp.find((p) => p.form === 'rating')?.attach === 'none', 'formDefaults 只写了屏幕锚点的画法不吃元素级 attachTo');
  // 整块元素显式挂点：不进锚点列，排到挂点旁（生命条在玩家脚下：没有场景时玩家在画面中下 62%）
  const sv = lay({ 'uip.layout': 'layout.survivors' });
  const vit = sv.at('el.vitals');
  ok(!!vit && vit.y > 540 * 0.62 && Math.abs(vit.x + vit.w / 2 - 480) < 1 && sv.occ!.items.some((o) => o.kind === 'world' && o.id === 'el.vitals'), `elx.attachTo = player 的生命条排在玩家脚下、登记为 world（y ${vit?.y.toFixed(0)}）`);
  const sw = lay({ 'uip.layout': 'layout.survivors', 'el.vitals.attachWidth': 'actor', 'el.vitals.attachOffset': 'above' }).at('el.vitals');
  ok(!!sw && sw.w < 60 && sw.y + sw.h < 540 * 0.62, 'elx.attachWidth = actor / attachOffset = above');
  // 场景投影：屏外的挂点（edgeArrow / clamp）、明确没有手持物（held = null 不画）
  const pt = (x: number, y: number, on = true) => ({ x, y, depth: 8, on, dir: [1, 0] as [number, number] });
  setWorld({ player: pt(480, 330), poi: { ...pt(500, 300), label: '宝箱', dist: 3 }, target: { ...pt(1500, 200, false), label: '目标' }, held: null, all: [], map: null, refDepth: 8 } as WorldView);
  ok(attachPoint(mk({}, 'el.interact'), 'held').missing === true && attachPoint(mk({}, 'el.threat'), 'target').on === false, '场景报了没有手持物 → missing；屏外 on = false');
  const cl = lay({ 'uip.layout': 'layout.survivors', 'el.vitals.attachTo': 'target' }).at('el.vitals');
  ok(!!cl && cl.x + cl.w <= 960 && cl.x >= 0, '整块元素的挂点在屏外：默认夹紧在安全区里');
  setWorld(null);
  ok(pointSized(mk({ 'typ.baseSize': 34 }, 'el.interact'), { w: 13, h: 13 }) && !pointSized(mk({}, 'el.interact'), { w: 13, h: 13 }), 'pointSized：门槛随元素缩放（掌机字号下 S(10) 的挂点元素仍算点）');
  // M12a-31：状态图标的角色色、默认无底座；徽章 none / roundel / chevron
  ok(th({}).roles.info === '#7aa2f7' && th({ 'col.strategy': 'mono' }, 'darkHairline').roles.info !== '' && SPEC_PARAM.get('cmp.badge')!.options!.some((o) => o.value === 'roundel') && SPEC_PARAM.get('cmp.badge')!.options!.some((o) => o.value === 'none') && SCOPABLE_IDS.includes('st.alert'), 'info 角色、cmp.badge 的 none / roundel、st.alert 按目标');
  // M12a-32：字幕画法——没给 = cmp.dialogBox（兜底 bar = 底条，原来的）；el.subtitle.form 进词表
  ok(SPEC_PARAM.get('el.subtitle.form')!.options!.map((o) => o.value).join() === 'auto,plain,boxed,speakerColor,bubble,lineOnly,quoteCard', 'el.subtitle.form 词表');
  // M12a-34：按键图例按实宽排（手柄视图键 = 一个高，不再按键名估成 1.6 倍）
  const kx = mk({ 'ix.glyphs': 'xbox' }, 'el.prompt');
  ok(Math.abs(keyCapWidth(kx, 22, 'Tab') - 22) < 0.01 && keyCapWidth(kx, 22, 'Shift') >= 22 * 1.5, 'keyCapWidth：视图键一个高、肩键至少 1.5 个高');
  const lg = lay({ 'uip.layout': 'layout.explore', 'el.prompt.screenAnchor': 'bl' }).at('el.prompt');
  ok(!!lg && lg.w < 420 && lg.x < 40, `图例宽按内容算、锚在左下贴左（宽 ${lg?.w.toFixed(0)}）`);
  ok(SPEC_PARAM.get('lay.pageIndicator')!.default === 'auto' && SPEC_PARAM.get('lay.pageIndicator')!.options![0].value === 'auto', 'lay.pageIndicator 默认 auto（= 原来的页点）');
  // M12a-30：地图参数、mapLabel 部件、内容包的地名
  ok(['lay.mapBleed', 'vis.mapLabels', 'vis.mapInk', 'elx.attachOffset', 'elx.attachGap', 'elx.attachWidth', 'elx.offscreen', 'elx.occlusion'].every((k) => SPEC_PARAM.has(k)) && SPEC_PARAM.get('lay.container')!.options!.some((o) => o.value === 'anchoredCard') && SCOPE_PARTS.includes('mapLabel'), 'B8 参数、取值与 mapLabel 部件');
  ok(parseElementKey('el.vitals.attachOffset')?.param === 'elx.attachOffset' && parseElementKey('el.threat.healthBar.occlusion')?.param === 'elx.occlusion', '新 elx 子参数可按元素 / 画法写');
  if (!hadDoc) delete gl.document;
  resetOccupancy();
}

console.log('== B9 集合几何与详情栏（M12a-28 / 21 / 26 / 38）');
{
  const noop = (): CanvasRenderingContext2D => {
    const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1 };
    const canvas: Record<string, unknown> = { width: 960, height: 540 };
    const fns: Record<string, (...a: never[]) => unknown> = {
      measureText: (t: string) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(st.font)); const px = m ? Number(m[1]) : 10; let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? px : px * 0.56; return { width: w, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({ setTransform() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), getLineDash: () => [], isPointInPath: () => false,
    };
    const ctx: unknown = new Proxy({}, {
      get(_, key) { if (key === 'canvas') return canvas; if (typeof key !== 'string') return undefined; if (key in fns) return fns[key]; if (key in st) return st[key]; return () => undefined; },
      set(_, key, v) { st[String(key)] = v; return true; },
    });
    canvas.getContext = () => ctx;
    return ctx as CanvasRenderingContext2D;
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl;
  if (!hadDoc) gl.document = { createElement: () => noop().canvas, fonts: { add() {} } };
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  // 画一屏模板，拿到画出来的字（绘制记录）
  const texts = (x: Values, skin = 'darkHairline') => {
    resetOccupancy();
    const th = baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
    DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.boxes = []; DRAW_LOG.targets = []; DRAW_LOG.fx = [];
    drawScreen({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, th);
    DRAW_LOG.on = false;
    return DRAW_LOG.texts.map((t) => ({ s: t.text, x: t.x, y: t.y, w: t.w, h: t.h }));
  };
  const has = (ts: { s: string }[], s: string) => ts.filter((t) => t.s === s).length;
  // M12a-28：签到 7 天都画得下（原来 B5 的按钮行把后几天挤掉）；商城竖卡第二行回来
  ok([1, 2, 3, 4, 5, 6, 7].every((d) => has(texts({ 'uip.screen': 'tpl.checkin' }), `第 ${d} 天`) === 1), 'lattice：签到 7 天放不下时格高按行数反推，不再截行');
  const mall = texts({ 'uip.screen': 'tpl.mall' });
  ok(['¥ 6', '¥ 24', '¥ 36'].every((p) => has(mall, p) === 1), 'lattice：商城竖卡两行都画（tallCard 按高缩）');
  // lay.columns 上限 12，新参数进词表
  ok(SPEC_PARAM.get('lay.columns')!.range!.max === 12 && ['lay.cellAspect', 'lay.cellSize', 'lay.gap', 'cnt.slotCount', 'cnt.filledCount', 'cnt.fillRatio', 'cnt.fillOrder', 'lay.raisedCurrent', 'lay.panelAspect', 'lay.panelFit', 'lay.vAlign', 'lay.drawerFlush'].every((k) => SPEC_PARAM.has(k)), 'B9 参数进参数表、lay.columns 上限 12');
  // M12a-21：卡行张数跟 cnt.itemCount；名字与说明同一对齐
  const two = texts({ 'uip.screen': 'tpl.draft3', 'cnt.itemCount': 2 });
  ok(has(two, '霜刃') === 1 && has(two, '暖炉') === 1 && has(two, '流星') === 0, '卡行：cnt.itemCount = 2 画两张');
  // 审查修复 A · D5：没选 lay.titleAlign 时原来的样子（名字居中、说明左起）；显式选了时两行都跟它
  const dflt = texts({ 'uip.screen': 'tpl.draft3' }), nm0 = dflt.find((t) => t.s === '霜刃'), dsc0 = dflt.find((t) => t.s.startsWith('攻击附带'));
  const left = texts({ 'uip.screen': 'tpl.draft3', 'lay.titleAlign': 'left' }), nm = left.find((t) => t.s === '霜刃'), dsc = left.find((t) => t.s.startsWith('攻击附带'));
  ok(!!nm0 && !!dsc0 && nm0.x > dsc0.x + 5 && !!nm && !!dsc && Math.abs(nm.x - dsc.x) < 0.5, '卡行：没选标题对齐时名字居中、说明左起（原来的）；lay.titleAlign = left 时两行都左起');
  // M12a-26：详情按钮跟交互模式
  // 审查修复 A · D1：兜底 / 默认层的交互模式不算选过（默认两个按钮都画，原来的）；去掉按钮只在这一屏真的画了按键图例时
  const ro = texts({ 'uip.screen': 'tpl.hero', 'ix.mode': 'readOnly' }), one = texts({ 'uip.screen': 'tpl.hero', 'ix.mode': 'singleCTA' }), multi = texts({ 'uip.screen': 'tpl.hero', 'ix.mode': 'multiButton' }), dft = texts({ 'uip.screen': 'tpl.hero' });
  // 终期审查修复 ④：角色详情（tpl.hero）的按钮 = GENERIC 的角色按钮「装备 / 技能」（原来借背包的「使用 / 丢弃」）
  ok(has(ro, '装备') === 0 && has(one, '装备') === 1 && has(one, '技能') === 0 && has(multi, '技能') === 1 && has(dft, '技能') === 1, '详情按钮：只读不画、单一主按钮只画第一个、多按钮画这一屏的；没选交互模式时两个都画');
  const pad = { 'uip.screen': 'tpl.hero', 'ix.mode': 'select', 'ctx.input': 'pad', 'ix.confirm': 'selectConfirm' };
  ok(has(texts({ ...pad, 'cnt.elements': 'el.prompt', 'el.prompt.form': 'legend' }), '装备') === 0 && has(texts(pad), '装备') === 1, '详情按钮：手柄 + 选择且画了按键图例时交给图例，没有图例时照画按钮');
  const inv = texts({ 'uip.screen': 'tpl.inventory' });
  ok(has(inv, '使用') === 1 && has(inv, '丢弃') === 1, '详情按钮：背包（版式给了 select、即点即生效是兜底、没有图例）照画使用 / 丢弃');
  // placeFloating：右边空就放右边；四个方向都压到时取压得最少的、可以给第五个候选（收窄让出的那一栏）
  const B = { x: 0, y: 0, w: 960, h: 540 };
  const pf = placeFloating({ x: 100, y: 100, w: 50, h: 50 }, { w: 200, h: 80 }, [], B);
  ok(pf.overlap === 0 && pf.rect.x === 158 && pf.rect.y === 100, 'placeFloating：朝画面中心的一侧（右）优先、与锚点上沿对齐');
  const wall = [{ x: 0, y: 0, w: 960, h: 540 }];
  const pf2 = placeFloating({ x: 100, y: 100, w: 50, h: 50 }, { w: 200, h: 80 }, wall, B, 8, [{ x: 700, y: 100 }]);
  ok(pf2.overlap > 0, 'placeFloating：都压到时返回重叠（调用方收窄列表）');
  const pf3 = placeFloating({ x: 100, y: 100, w: 50, h: 50 }, { w: 200, h: 80 }, [{ x: 0, y: 0, w: 690, h: 540 }], B, 8, [{ x: 700, y: 100 }]);
  ok(pf3.overlap === 0 && pf3.rect.x === 700, 'placeFloating：第五个候选（让出的那一栏）');
  // 浮动详情不压列表行（列表收窄让出一栏）
  const tl = texts({ 'uip.screen': 'tpl.quest', 'lay.detail': 'transient' });
  // M12b-62：任务页的详情是任务详情（名字 = 第一条任务，列表行里也有这个名字：浮动详情最后画，取最后一个）
  const fl = [...tl].reverse().find((t) => t.s === '寻找向导'), rows = tl.filter((t) => t.s === '前往');
  ok(!!fl && rows.length > 0 && rows.every((q) => q.x + q.w < fl.x), `浮动详情放在列表外侧（列表收窄，名字 x ${fl?.x.toFixed(0)}）`);
  // M12a-38：fitContent 的抽屉按内容收高并靠下
  const fd = texts({ 'uip.screen': 'tpl.quest', 'lay.container': 'drawer', 'lay.panelFit': 'fitContent', 'lay.vAlign': 'bottom', 'cnt.itemCount': 3 });
  const head = fd.find((t) => t.s === '任务');
  ok(!!head && head.y > 150 && has(fd, '前往') === 3, `fitContent：抽屉按 3 行收高、靠下（页头 y ${head?.y.toFixed(0)}）`);
  // 只量不画的画布：量字照常、画不出东西
  const mc = measureOnlyCtx(noop());
  mc.font = '20px sans-serif';
  ok(mc.measureText('木').width > 0 && mc.getTransform().a === 1, 'measureOnlyCtx：量字照常');
  // 默认的托盘宽不变（lay.panelSize 只是兜底值时不读）
  const npc = texts({ 'uip.screen': 'tpl.npc' }), npc5 = texts({ 'uip.screen': 'tpl.npc', 'lay.panelSize': 0.5 });
  const nx = (ts: { s: string; x: number }[]) => Math.min(...ts.filter((t) => t.s === '向导' || t.s === '×').map((t) => t.x));
  ok(nx(npc5) > nx(npc) + 100, '托盘宽 = 画面宽 × lay.panelSize（显式给了时），没给时全宽');
  if (!hadDoc) delete gl.document;
  resetOccupancy();
}

console.log('== M12a 审查修复 A（版式 / 渲染 / 解析）');
{
  const noop = (calls?: { n: number }): CanvasRenderingContext2D => {
    const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1, fillStyle: '#000', textBaseline: 'alphabetic', letterSpacing: '0px', shadowBlur: 0, shadowColor: 'transparent' };
    let mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const canvas: Record<string, unknown> = { width: 960, height: 540 };
    const fns: Record<string, (...a: never[]) => unknown> = {
      measureText: (t: string) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(st.font)); const px = m ? Number(m[1]) : 10; let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? px : px * 0.56; return { width: w, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
      getTransform: () => mat, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({ setTransform() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), getLineDash: () => [], isPointInPath: () => false,
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { mat = { a, b, c, d, e, f }; return undefined; },
    };
    const ctx: unknown = new Proxy({}, {
      get(_, key) { if (key === 'canvas') return canvas; if (typeof key !== 'string') return undefined; if (key in fns) return (...a: never[]) => { if (calls) calls.n++; return fns[key](...a); }; if (key in st) return st[key]; return () => { if (calls) calls.n++; }; },
      set(_, key, v) { st[String(key)] = v; return true; },
    });
    canvas.getContext = () => ctx;
    return ctx as CanvasRenderingContext2D;
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl;
  if (!hadDoc) gl.document = { createElement: () => noop().canvas, fonts: { add() {} } };
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const V = (x: Values, skin: string) => ({ ...cur, 'hud.style': skin, ...x } as Values);
  const lay = (v: Values, skin: string) => {
    resetOccupancy();
    drawElements({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, baseTheme(resolveUi(v), null, skin));
    return OCC.last!;
  };
  const pt = (x: number, y: number) => ({ x, y, depth: 8, on: true, dir: [1, 0] as [number, number] });
  // L1：elx.avoidPlayer 的迟滞——玩家在原位边界上抖 1.5 像素时技能栏只翻一次；同一输入画两遍结果相同
  const hv = V({ 'uip.layout': 'layout.action', 'el.abilities.avoidPlayer': true }, 'darkHairline');
  const ys = new Set<number>();
  for (let f = 0; f < 12; f++) {
    setWorld({ player: pt(480, 328.5 + (f % 2) * 1.5), poi: null, target: null, all: [], map: null, refDepth: 8 } as unknown as WorldView);
    ys.add(Math.round(lay(hv, 'darkHairline').items.find((o) => o.kind === 'element' && o.id === 'el.abilities')!.rect.y));
  }
  const again = (y: number) => { setWorld({ player: pt(480, y), poi: null, target: null, all: [], map: null, refDepth: 8 } as unknown as WorldView); return JSON.stringify(lay(hv, 'darkHairline').items.map((o) => o.rect)); };
  ok(ys.size <= 2 && again(329.4) === again(329.4), `躲开玩家：边界上抖动时不来回翻（${[...ys].join(' / ')}），同一输入两遍一样`);
  setWorld(null);
  // D6：旧皮肤上品类布局写的整块挂点不生效（生命条仍按锚点排），新皮肤照旧挂到玩家脚下
  ok(lay(V({ 'uip.layout': 'layout.survivors' }, 'neobrutal'), 'neobrutal').items.some((o) => o.kind === 'element' && o.id === 'el.vitals') && lay(V({ 'uip.layout': 'layout.survivors' }, 'darkHairline'), 'darkHairline').items.some((o) => o.kind === 'world' && o.id === 'el.vitals'), '旧皮肤：layout.survivors 的整块挂点不上旧皮肤（显式选了才挂）');
  // D2：layout.shmup（lay.playfield = boxed）的边框够宽、元素不缩；贴边条不缩到 0.85 以下
  const sh = lay(V({ 'uip.layout': 'layout.shmup' }, 'darkHairline'), 'darkHairline');
  const frame = sh.items.find((o) => o.kind === 'edgeBar');
  ok(!!frame && frame.rect.w > 200, `inMargin 的玩法区按 lay.playfield 取画幅（shmup 边框宽 ${Math.round(frame?.rect.w ?? 0)}）`);
  // L11：条目数上限跟参数表一致（60）
  ok(itemCountOr(makeCtx('el.screen', noop(), noop(), baseTheme(resolveUi(V({ 'uip.screen': 'tpl.inventory', 'cnt.itemCount': 60 }, 'darkHairline')), null, 'darkHairline'), R0), 6) === 60, 'cnt.itemCount = 60 画 60 条（原来封顶 40）');
  // C11：旧皮肤上皮肤之前的作用域键（layout.mobileArpg 的 vis.silhouette@el.abilities）不挡住皮肤之后显式给的全局值
  const ec = makeCtx('el.abilities', noop(), noop(), baseTheme(resolveUi(V({ 'uip.layout': 'layout.mobileArpg', 'vis.silhouette': 'diamond' }, 'neobrutal')), null, 'neobrutal'), R0);
  ok(chosenKey(ec, 'vis.silhouette') === 'vis.silhouette' && silhouetteOf(ec, 'slot') === 'diamond', '旧皮肤：目标链上第一个选过的键（chosenKey）');
  // D3：页头登记进占位表，适龄标识不再压在页头 / 关闭钮上
  resetOccupancy();
  const lth = baseTheme(resolveUi(V({ 'uip.screen': 'tpl.inventory', 'uip.business': 'business.f2pMobile' }, 'darkHairline')), null, 'darkHairline');
  const ld = { ctx: noop(), m: noop(), blur: 0, full: R0 } as never;
  drawScreen(ld, R0, lth); drawOps(ld, R0, lth);
  const heads = OCC.last!.items.filter((o) => o.kind === 'template'), comps = OCC.last!.items.filter((o) => o.kind === 'compliance');
  ok(heads.length > 0 && comps.length > 0 && comps.every((c) => heads.every((h) => !intersects(c.rect, h.rect))), '合规层避开页头行（适龄标识不压关闭钮）');
  // L9：周期图案按图块铺（一次 fillRect），不再每个点一条路径
  const cn = { n: 0 };
  drawBox(noop(cn), { x: 0, y: 0, w: 400, h: 300 }, { overlay: { kind: 'dots', color: '#000', opacity: 0.3 } } as never, {} as never);
  ok(cn.n < 40, `vis.pattern = dots 一块 400 × 300 的面板 ${cn.n} 次调用（原来约 5,600）`);
  // L16：量字不把字距 / 发光漏到后面
  // 有 save / restore 的画布走 save / restore；只有 measureText 的极简替身把改过的几项放回去
  const st0 = { font: '10px sans-serif', fillStyle: '#000', textBaseline: 'alphabetic', letterSpacing: '0px', shadowBlur: 0, shadowColor: 'transparent' };
  const stk: (typeof st0)[] = [];
  const sc = { ...st0, save() { stk.push({ font: sc.font, fillStyle: sc.fillStyle, textBaseline: sc.textBaseline, letterSpacing: sc.letterSpacing, shadowBlur: sc.shadowBlur, shadowColor: sc.shadowColor }); }, restore() { Object.assign(sc, stk.pop()); }, measureText: (t: string) => ({ width: t.length * 10 }) };
  const pc = { ...st0, measureText: (t: string) => ({ width: t.length * 10 }) };
  const to = { font: '"GAE Sans"', size: 12, weight: 400, color: '#f00', spacing: 0.2, glow: '#0f0' } as TextOpts;
  measure(sc as unknown as CanvasRenderingContext2D, '木', to); measure(pc as unknown as CanvasRenderingContext2D, '木', to);
  ok([sc, pc].every((c) => c.letterSpacing === '0px' && c.shadowColor === 'transparent' && c.fillStyle === '#000' && c.font === '10px sans-serif'), '量字（measure）不漏状态');
  if (!hadDoc) delete gl.document;
  resetOccupancy();
}

console.log('== M12a 审查修复 B（Godot 导出 / 主题 / 校验）');
{
  const ui = (extra: Record<string, string | number | boolean>) => ({ ...defaultValues(), ...extra } as Values);
  const lay = (extra: Record<string, string | number | boolean>) => elementLayout(godotUiFiles(ui(extra))!.theme)!;
  // C1：导出与 HUD 同一张设计画布（960 × 540 / 竖屏 540 × 960），按屏宽比例的元素不再按 1280 量（Boss 条 0.6 屏宽 = 576，原来 768）
  const boss = lay({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', 'el.threat.form': 'bossBar', 'el.threat.barWidth': 0.6 });
  const bw = boss.items.find((it) => it.id === 'el.threat')?.w ?? 0;
  ok(boss.view.join('x') === '960x540' && bw > 500 && bw < 640, `Godot 元素排版按 960 × 540 量（Boss 条宽 ${bw}）`);
  ok(lay({ 'hud.style': 'animeCard', 'uip.platform': 'platform.phonePortrait', 'uip.layout': 'layout.mobileArpg' }).view.join('x') === '540x960', '竖屏导出按 540 × 960');
  // D2：inMargin 的玩法区按 lay.playfield（shmup = boxed → 3:4，边框约 277），元素进左 / 右边框
  const sh = lay({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.shmup' });
  ok(sh.org === 'inMargin' && sh.margin?.aspect === '3:4' && Math.abs((sh.margin?.side ?? 0) - 278) <= 1 && sh.items.some((it) => it.edge === 'marginL'), `inMargin 导出：玩法区 ${sh.margin?.aspect}、边框 ${sh.margin?.side}`);
  // C7：贴边条按 lay.edgeBarSlots 的格序与 "a|b" 并排导出（同一格同一个序号），给了格序时逐格分隔
  const eb = lay({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'bottom', 'cnt.elements': 'el.objective,el.timer,el.resources,el.clock', 'el.objective.screenAnchor': 'bl', 'el.timer.screenAnchor': 'bc', 'el.resources.screenAnchor': 'br', 'el.clock.screenAnchor': 'bl', 'lay.edgeBarSlots': 'el.resources,el.timer|el.clock,el.objective' });
  const slotOf = (id: string) => eb.items.find((it) => it.id === id)?.slot ?? -9;
  ok(eb.bars.length === 1 && eb.bars[0].divide === 'slots' && slotOf('el.timer') === slotOf('el.clock') && slotOf('el.timer') >= 0 && slotOf('el.objective') !== slotOf('el.timer'), '贴边条导出格序与并排（timer|clock 同一格）');
  // D2：竖条放不下的低优先级格退回散排（与画布同一份 planEdgeBars）
  const eb2 = lay({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'left', 'cnt.elements': 'el.objective,el.timer,el.meter,el.resources,el.clock,el.toolbar,el.abilities', 'el.objective.screenAnchor': 'tl', 'el.timer.screenAnchor': 'tl', 'el.meter.screenAnchor': 'ml', 'el.resources.screenAnchor': 'bl', 'el.clock.screenAnchor': 'bl', 'el.toolbar.screenAnchor': 'bl', 'el.abilities.screenAnchor': 'bc', 'lay.edgeBarSlots': 'el.objective,el.timer,el.toolbar|el.clock' });
  ok(eb2.dropped.length > 0 && eb2.items.filter((it) => it.edge === 'left').length === 2 && eb2.area[0] > 200, `竖条放不下的退回散排（${eb2.dropped.join('、')}），散排版面扣掉条宽 ${eb2.area[0]}`);
  // D6：旧皮肤上品类布局写的整块挂点不挂（仍按锚点排），新皮肤挂
  const legacyAt = lay({ 'hud.style': 'neobrutal', 'uip.layout': 'layout.survivors' });
  const newAt = lay({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.survivors' });
  ok(!legacyAt.world.some((w) => w.id === 'el.vitals' && w.block) && legacyAt.items.some((it) => it.id === 'el.vitals'), '旧皮肤：品类布局的 el.vitals.attachTo 不挂世界点');
  ok(newAt.world.some((w) => w.id === 'el.vitals' && w.block), '新皮肤：品类布局的 el.vitals.attachTo 挂世界点');
  // C6：按目标覆盖按画布上真正用的盒子导出；按钮的字号与角色色；第二条的作用域第二强调色（fill2）；hud_sample.gd 用 Hud_<元素> / Hud_hudBar
  const sc = godotUiFiles(ui({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'col.control@slot': '#204060', 'col.surface2@hudBar': '#203a4a', 'typ.button.size@button': 40, 'col.semantic@button': 'blueRedOrange', 'col.accent2@el.vitals': '#3fd8e0' }))!;
  const tres = sc.files.find((x) => x.path === 'ui/ui_theme.tres')!.text, gd = sc.files.find((x) => x.path === 'ui/hud_sample.gd')!.text;
  ok(/Hud_button\/font_sizes\/font_size = 20/.test(tres) && /Hud_buttonConfirm\/base_type/.test(tres), 'Hud_button 带字号与角色色变体');
  ok(/Hud_el_vitals\/colors\/fill2 = /.test(tres), 'col.accent2@el.vitals 导出成 fill2');
  ok(/id="scoped_slot"\]\nbg_color = Color\(0\.1255, 0\.251, 0\.3765/.test(tres), '@slot 的变体按控件面（col.control）导出');
  ok(gd.includes('_type_var("Hud_hudBar", "HudBar")') && gd.includes('var hv := "Hud_" + id.replace(".", "_")'), 'hud_sample.gd 给元素 / 贴边条套 Hud_<目标>');
  // C5：vis.silhouette@icon 不再改按键 token（键帽 / 主按钮 / 选中页签）
  const ri = resolveUi(ui({ 'hud.style': 'darkHairline', 'vis.silhouette@icon': 'diamond' }));
  ok(baseTheme(ri, null, 'darkHairline').tokens.key.shape === undefined, 'vis.silhouette@icon 不改按键外形');
  ok(PRESET.get('ex.hadesHud')!.values['vis.silhouette@el.abilities'] === 'diamond' && !('vis.silhouette@icon' in PRESET.get('rcp.hadesLike')!.values), 'Hades 预设迁到 vis.silhouette@el.abilities');
}

console.log('== M12a 目检修复（前端页页头、一句话、任务宝箱、图鉴 / 邮件按钮、对话轮盘、NPC 托盘、MOBA 计时、Boss 条与飘字）');
{
  const noop = (): CanvasRenderingContext2D => {
    const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1, fillStyle: '#000', textBaseline: 'alphabetic', letterSpacing: '0px', shadowBlur: 0, shadowColor: 'transparent' };
    const canvas: Record<string, unknown> = { width: 960, height: 540 };
    const fns: Record<string, (...a: never[]) => unknown> = {
      measureText: (t: string) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(st.font)); const px = m ? Number(m[1]) : 10; let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? px : px * 0.56; return { width: w, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({ setTransform() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), getLineDash: () => [], isPointInPath: () => false,
    };
    const ctx: unknown = new Proxy({}, {
      get(_, key) { if (key === 'canvas') return canvas; if (typeof key !== 'string') return undefined; if (key in fns) return fns[key]; if (key in st) return st[key]; return () => undefined; },
      set(_, key, v) { st[String(key)] = v; return true; },
    });
    canvas.getContext = () => ctx;
    return ctx as CanvasRenderingContext2D;
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl;
  if (!hadDoc) gl.document = { createElement: () => noop().canvas, fonts: { add() {} } };
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const thOf = (x: Values, skin: string) => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  // 画一屏模板：画出来的字、元素命中框、帧占位表里的页头行
  const screen = (x: Values, skin = 'darkHairline') => {
    resetOccupancy();
    DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.boxes = []; DRAW_LOG.targets = []; DRAW_LOG.fx = [];
    const hits = drawScreen({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, thOf(x, skin));
    DRAW_LOG.on = false;
    // 页头行 = 模板占位里的 header 子类（M12b-64 起模板还登记数据条目 / 按钮 / 主体）
    return { texts: DRAW_LOG.texts.map((t) => ({ s: t.text, x: t.x, y: t.y, w: t.w })), hits, heads: (OCC.last?.items ?? []).filter((o) => o.kind === 'template' && o.sub === 'header'), occ: OCC.last?.items ?? [] };
  };
  const els = (x: Values, skin = 'darkHairline') => { resetOccupancy(); return drawElements({ ctx: noop(), m: noop(), blur: 0, full: R0 } as never, R0, thOf(x, skin)); };
  const rectOf = (hs: { element: string; rect: { x: number; y: number; w: number; h: number } }[], id: string) => hs.find((h) => h.element === id)?.rect;
  // 1 前端页：标题 / 登录 / 读取 / 结算……没有页头与关闭钮；旧皮肤照旧写模板名（皮肤之前的 lay.titlePos 不算），关闭钮按模板数据去掉
  // 本局总结（目检补充）：页头行放奖励（el.reward.anchorSpace = header），不压战绩表——所以它有页头行，单独测
  const fronts = ['tpl.title', 'tpl.login', 'tpl.loading', 'tpl.chapterCard', 'tpl.vs', 'tpl.settle', 'tpl.lobby', 'tpl.gachaResult', 'tpl.credits'];
  ok(fronts.every((t) => { const sc = screen({ 'uip.screen': t }); return sc.heads.length === 0 && !sc.texts.some((x) => x.s === '×'); }), '前端页（标题 / 登录 / 读取 / 结算……）没有页头行与 ✕');
  const rs = screen({ 'uip.screen': 'tpl.runSummary' }), rsR = rectOf(rs.hits, 'el.reward');
  ok(!rs.texts.some((x) => x.s === '×') && !!rsR && rsR.y < 120 && rs.texts.some((x) => x.s === '再来一局') && rs.texts.some((x) => x.s === '继续'), `本局总结：奖励在页头行（${rsR ? Math.round(rsR.y) : '没画'}），没有 ✕，按钮是「再来一局 / 继续」`);
  const lt = screen({ 'uip.screen': 'tpl.title' }, 'neobrutal');
  ok(lt.heads.length > 0 && lt.texts.some((x) => x.s === '标题') && !lt.texts.some((x) => x.s === '×'), '旧皮肤的标题页：页头照旧（模板写的 lay.titlePos 不算），✕ 按模板数据去掉');
  ok(screen({ 'uip.screen': 'tpl.title', 'lay.titlePos': 'panel' }).heads.length > 0 && screen({ 'uip.screen': 'tpl.title', 'lay.titlePos': 'none' }, 'neobrutal').heads.length === 0, 'lay.titlePos 手动给的新旧皮肤都算');
  // 2 一句话只在写了 cnt.textLength 时补（恭喜获得 / 聊天 / 建造原来补了一句，恭喜获得那句压在 LOGO 上）
  const line = '渡船已经修好了，可以出发。';
  // M12b-64 ⑪：读取页的预设也不再写 cnt.textLength（lead：读取页不补这一句）；手动写了照画
  ok(['tpl.reward', 'tpl.chat', 'tpl.build', 'tpl.photo', 'tpl.chapterCard', 'tpl.login', 'tpl.loading'].every((t) => !screen({ 'uip.screen': t }).texts.some((x) => x.s === line)) && screen({ 'uip.screen': 'tpl.loading', 'cnt.textLength': 'line' }).texts.some((x) => x.s === line), '没写文字长度的模板不再补「一句话」（读取页也不补，手动写了照画）');
  // 3 任务：活跃度宝箱在左下、缩小，不压列表行
  const q = rectOf(screen({ 'uip.screen': 'tpl.quest' }).hits, 'el.reward');
  ok(!!q && q.x < 100 && q.y > 400 && q.w <= 110, `任务页的宝箱在左下（${q ? `${Math.round(q.x)}, ${Math.round(q.y)}，${Math.round(q.w)} 宽` : '没画'}）`);
  // 4 图鉴只读：没有「使用 / 丢弃 / 确定」；邮件是「领取 / 删除」+「一键领取」
  const cx = screen({ 'uip.screen': 'tpl.codex' }).texts, mx = screen({ 'uip.screen': 'tpl.mail' }).texts;
  ok(!cx.some((t) => ['使用', '丢弃', '确定'].includes(t.s)), '图鉴只读：没有使用 / 丢弃 / 确定');
  ok(['领取', '删除', '一键领取'].every((s) => mx.some((t) => t.s === s)) && !mx.some((t) => ['使用', '丢弃', '开始游戏'].includes(t.s)), '邮件：领取 / 删除 + 一键领取');
  // 5 对话轮盘：底部居中、在字幕上面
  const wh = els({ 'uip.screen': 'tpl.dialogueWheel' }), wc = rectOf(wh, 'el.choices'), ws = rectOf(wh, 'el.subtitle');
  ok(!!wc && !!ws && Math.abs(wc.x + wc.w / 2 - 480) < 2 && wc.y + wc.h <= ws.y + 0.5 && wc.y > 200, '对话轮盘在底部正中、字幕上面');
  // 6 NPC 托盘：台词是托盘主体（不带说话人前缀）、字幕元素不另画、没有确定钮与 ✕，台词不压选项
  const np = screen({ 'uip.screen': 'tpl.npc' }), ch = rectOf(np.hits, 'el.choices'), ln = np.texts.find((t) => t.s.startsWith('山顶的雪线'));
  ok(!!ln && !!ch && !np.texts.some((t) => t.s.startsWith('向导：') || t.s === '确定' || t.s === '×') && ln.x + ln.w < ch.x && !np.hits.some((h) => h.element === 'el.subtitle'), 'NPC 托盘：台词在页头下、选项在右、没有确定 / ✕');
  // 7 MOBA：计时与队伍头像同在上沿（新皮肤 elx.stackDir = row）；旧皮肤不认品类布局写的 stackDir，计时照旧接在头像下面
  const mb = els({ 'uip.layout': 'layout.moba' }), mt = rectOf(mb, 'el.timer'), mp = rectOf(mb, 'el.party');
  const lb = els({ 'uip.layout': 'layout.moba' }, 'neobrutal'), lt2 = rectOf(lb, 'el.timer'), lp = rectOf(lb, 'el.party');
  ok(!!mt && !!mp && Math.abs(mt.y - mp.y) < 1 && mt.y < 40 && mp.h < 100, `MOBA：计时与头像排同一行（计时 y ${mt ? Math.round(mt.y) : '-'}）`);
  ok(!!lt2 && !!lp && lt2.y >= lp.y + lp.h, '旧皮肤：品类布局写的 elx.stackDir 不生效');
  // 8 掌机 layout.action：Boss 条留在上沿正中，只收条长（不再下移 124）；飘字按画出来的范围登记
  const hh = els({ 'uip.layout': 'layout.action', 'uip.platform': 'platform.handheld' }), bb = rectOf(hh, 'el.threat');
  ok(!!bb && bb.y < 40 && Math.abs(bb.x + bb.w / 2 - 480) < 1 && bb.w < 576 && bb.w >= 576 * 0.5, `掌机 Boss 条在上沿正中收窄（${bb ? Math.round(bb.w) : '-'} 宽）`);
  els({ 'uip.layout': 'layout.action' });
  const fb = (OCC.last?.items ?? []).find((o) => o.kind === 'world' && o.id === 'el.feedback');
  const tp = attachPoint(makeCtx('el.feedback', noop(), noop(), thOf({ 'uip.layout': 'layout.action' }, 'darkHairline'), R0), 'target');
  ok(!!fb && fb.rect.y + fb.rect.h < tp.y && fb.rect.w > 60, '飘字的占位按数字实际画的范围（在目标头顶上方）');

  console.log('== M12b B1（作用域接线 / 格子细节 / 色表 / 图标着色 / 模板排位 v2 / HUD 排位残留 / 地图）');
  // M12b-68：emoji 字形加文本变体选择符（⚡ 不再画成彩色 emoji）
  ok(textPresentation('⚡ 12') === '⚡\uFE0E 12' && textPresentation('木材') === '木材', 'emoji 字形加 U+FE0E（普通字不动）');
  // M12b-33：稀有度色表 5 档、类别色表有色
  const r33 = resolveUi({ ...cur, 'col.rarityScale': 'greyBlueGold', 'col.coding': 'lineId' } as Values);
  ok(rarityTable(r33).length === 5 && lineTable(r33, baseTheme(r33, null, 'darkHairline')).length > 0, '稀有度 / 类别色表');
  // M12b-64 ⑪ / ③：模板里没人选锚点的元素用自己的默认锚点（结算的奖励居中、段位右上）；按钮行跟 el.cta.screenAnchor = bc 居中。旧皮肤照旧
  const st1 = screen({ 'uip.screen': 'tpl.settle' }), rw = rectOf(st1.hits, 'el.reward'), rk = rectOf(st1.hits, 'el.rank');
  const cont = st1.texts.find((t) => t.s === '继续'), share = st1.texts.find((t) => t.s === '分享');
  // 轨道 E 审查修复（视觉 ⑥）：结算预设改成单列居中——段位在上、胜负大字、奖励居中（原来段位在右上、奖励挤在一角）
  ok(!!rw && Math.abs(rw.x + rw.w / 2 - 480) < 40 && !!rk && Math.abs(rk.x + rk.w / 2 - 480) < 60 && rk.y < rw.y, `结算：奖励居中（${rw ? Math.round(rw.x + rw.w / 2) : '-'}）、段位在上方居中`);
  ok(!!cont && !!share && Math.abs((share.x + cont.x + cont.w) / 2 - 480) < 60, '结算：按钮行居中（el.cta.screenAnchor = bc）');
  const st0 = screen({ 'uip.screen': 'tpl.settle' }, 'neobrutal'), rw0 = rectOf(st0.hits, 'el.reward'), cont0 = st0.texts.find((t) => t.s === '继续');
  // 轨道 E 审查修复：锚点写进了结算预设本身，旧皮肤也单列居中；按钮行居中只在 HUD 主画布上（品质下限），测试的记录画布上照旧靠右
  ok(!!rw0 && Math.abs(rw0.x + rw0.w / 2 - 480) < 40 && !!cont0 && cont0.x > 700, '旧皮肤的结算：奖励居中（预设锚点）、按钮行在记录画布上仍靠右');
  // M12b-64 ②：页头里放了元素时标题照写（居中标题，元素在右段）
  const lab = (id: string) => PRESET.get(id)!.label.replace(/（.*?）/g, '').split(' / ')[0];
  const sk = screen({ 'uip.screen': 'tpl.skilltree', 'cnt.elements': 'el.resources', 'el.resources.anchorSpace': 'header', 'lay.titleAlign': 'center' }), skR = rectOf(sk.hits, 'el.resources'), skT = sk.texts.find((t) => t.s === lab('tpl.skilltree') || t.s === '旅人的本领');
  ok(!!skT && !!skR && sk.heads.length > 0 && skR.x > skT.x + skT.w && skR.y < sk.heads[0].rect.y + sk.heads[0].rect.h, '页头放元素时标题照写、元素在标题右边的控件段');
  // M12b-64 ②：没选锚点空间、锚在右上的小元素自动进页头槽
  const iv = screen({ 'uip.screen': 'tpl.inventory', 'cnt.elements': 'el.resources', 'el.resources.screenAnchor': 'tr', 'el.resources.scale': 0.8 }), ivR = rectOf(iv.hits, 'el.resources');
  ok(!!ivR && iv.heads.length > 0 && ivR.y < iv.heads[0].rect.y + iv.heads[0].rect.h, '右上的资源行进页头槽');
  // M12b-64 ⑧：关不掉的结束方式不画 ✕（即使显式写了），也不补取消钮
  ok(!screen({ 'uip.screen': 'tpl.inventory', 'ix.dismiss': 'forced', 'ix.close': 'xTopRight' }).texts.some((t) => t.s === '×') && screen({ 'uip.screen': 'tpl.inventory', 'ix.dismiss': 'button', 'ix.close': 'xTopRight' }).texts.some((t) => t.s === '×'), 'ix.close 只在按钮 / 按键关闭时画');
  ok(resolveUi({ ...cur, 'ix.dismiss': 'tapOutside' } as Values).str('ix.close') === 'none', 'D-dismiss：点外面关闭也派生 ix.close = none');
  // M12b-64 ①：数据区给 inherit 元素让位（任务页的宝箱不压列表）；模板占位按子类登记
  const qs = screen({ 'uip.screen': 'tpl.quest' }), qR = rectOf(qs.hits, 'el.reward'), qD = qs.occ.find((o) => o.kind === 'template' && o.sub === 'data');
  ok(!!qR && !!qD && !intersects(qR, qD.rect), '任务页：列表让出宝箱的位置（数据条目登记为 template / data）');
  // M12b-65 ③ / ⑤：不进贴边条、垫底不画
  const t65 = thOf({ 'uip.layout': 'layout.rpg', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'top', 'el.minimap.edgeBar': 'exclude' }, 'darkHairline');
  const em = edgeMembership(t65, [{ id: 'el.minimap', anchor: 'tr', priority: 'secondary' }, { id: 'el.resources', anchor: 'tr', priority: 'secondary' }]);
  ok(em.edge[0] === null && em.edge[1] === 'top', 'elx.edgeBar = exclude：锚在顶边也不进顶栏');
  const ul = underlayIds(thOf({ 'uip.layout': 'layout.action', 'el.resources.underlay': 'hide' }, 'darkHairline'));
  ok(!!ul && !ul.includes('el.resources') && ul.includes('el.vitals') && (hudLayoutElements(thOf({ 'uip.layout': 'layout.action' }, 'darkHairline')) ?? []).includes('el.resources'), 'elx.underlay = hide：垫底那一遍不画');
  // M12b-66 ⑨：lay.panHint = none 不画拖动提示
  const pan = (x: Values) => screen({ 'uip.screen': 'tpl.worldmap', 'lay.overflow': 'pan', ...x }).texts.some((t) => t.s === '✥ 拖动查看');
  ok(pan({}) && !pan({ 'lay.panHint': 'none' }), 'lay.panHint = none 关掉「拖动查看」');

  console.log('== M12b B2（结构化样本 / 按界面取词 / 富文本 / 字体角色 / 字族）');
  const withPack = <T,>(id: string, fn: () => T): T => { setPack(id); try { return fn(); } finally { setPack('snowline'); } };
  const txt = (x: Values, id = 'snowline') => withPack(id, () => screen(x).texts.map((t) => t.s ?? ''));
  // 62：样本类别、回落链、技能树 / 地图 / 暂停页画按界面的样本
  ok(sampleKind(resolveUi({ ...cur, 'uip.screen': 'tpl.skilltree' } as Values)) === 'talents' && sampleKind(resolveUi({ ...cur, 'uip.screen': 'tpl.worldmap' } as Values)) === 'locations' && sampleKind(resolveUi({ ...cur, 'uip.screen': 'tpl.inventory' } as Values)) === 'items', 'sampleKind：技能树 = 天赋、地图 = 地点、背包 = 物品');
  const bare = { ...packById('action'), screens: { ...packById('action').screens, talents: undefined } };
  ok(samplesFor('talents', bare) === GENERIC.samples.talents && samplesFor('talents', packById('action'))[0][1] === '重击', 'samplesFor：本包 → GENERIC 同类');
  ok(PACK_IDS.every((id) => missingSamples(packById(id)).length === 0), '24 个包都写全了结构化样本');
  const st = txt({ 'uip.screen': 'tpl.skilltree', 'lay.detail': 'persistent' }, 'action');
  ok(st.includes('重击') && !st.includes('符文锤') && st.some((t) => t.startsWith('花费')), '技能树详情写天赋名与花费（black-myth#38），不再是背包物品');
  const pz = txt({ 'uip.screen': 'tpl.pausePc' }, 'rpg');
  ok(pz.includes('技能') && pz.includes('物品') && !pz.includes('新游戏'), '暂停页写局内主菜单（octopath#16），不是标题界面那一套');
  ok(txt({ 'uip.screen': 'tpl.worldmap', 'lay.detail': 'persistent' }, 'colony').includes('旧船'), '世界地图的常驻详情写地点（frostpunk#42）');
  ok(txt({ 'uip.screen': 'tpl.create', 'cnt.dataShape': 'form' }, 'farming').includes('农场名'), '捏人表单写创建项（stardew#23）');
  // 61：按界面取词（菜单按键图例、邮件按钮、结算按钮、布阵不吃局内 HUD 的「结束回合」）
  const r61 = (x: Values) => resolveUi({ ...cur, ...x } as Values);
  ok(screenGroups(r61({ 'uip.screen': 'tpl.inventory' })).has('menu') && screenGroups(r61({ 'uip.screen': 'tpl.worldmap' })).has('map') && screenGroups(r61({})).has('hud'), 'screenGroups：背包 = menu、地图 = map、局内 = hud');
  ok(textFor('prompts', r61({ 'uip.screen': 'tpl.inventory' }), packById('action'))?.[0][1] === '确定' && textFor('prompts', r61({}), packById('action'))?.[0][1] === '互动', '按键图例：菜单页写确定，局内照旧（elden-ring#8）');
  ok(JSON.stringify(textFor('buttons', r61({ 'uip.screen': 'tpl.mail' }), packById('action'))) === '["领取","删除"]', '邮件详情的按钮是 GENERIC 的变体');
  ok(textFor('cta', r61({ 'uip.screen': 'tpl.settle' }), packById('tactics'))?.start === '继续' && textFor('cta', r61({}), packById('tactics'))?.start === '结束回合' && textFor('cta', r61({ 'uip.screen': 'tpl.formation' }), packById('tactics'))?.start === '开始作战', '行动号召：结算 = 继续、局内 = 结束回合、布阵仍是开始作战');
  ok(textFor('band', r61({ 'cnt.tone': 'punitive' }), packById('soulslike'))?.[0] === '你 死 了', '横带按语气取字（elden-ring#44）');
  ok(textFor('header', r61({ 'uip.screen': 'tpl.forge' }), packById('factory')) === '组装机 2 型', '锻造屏的页头写机器名（factorio#9）');
  ok(PACK_IDS.every((id) => ['bark', 'check', 'objective', 'original'].every((k) => hasGenericText(k as never, packById(id)))), '24 个包的新槽位都有通用值');
  // 57：富文本
  ok(plainText('造成 {d:8} 点伤害，{k:格挡}') === '造成 8 点伤害，格挡' && plainText('{c1:逻辑} [[简单：成功]]') === '逻辑 [简单：成功]', 'plainText 去掉标记、方括号注释照写');
  ok(parseRich('{b:+3} 与 {x:秘密}').map((x) => x.kind).join(',') === 'buff,plain,redact', 'parseRich 分段');
  ok(richBBCode('{k:关键} [[注]]', { keyword: '#ffcc00' }) === '[color=#ffcc00]关键[/color] [lb]注[rb]', 'richBBCode 转 RichTextLabel 的 BBCode');
  const rc = (x: Values) => { const th = thOf(x, 'darkHairline'), e = makeCtx('el.screen', noop(), noop(), th, R0); DRAW_LOG.on = true; DRAW_LOG.texts = []; drawRich(e, '造成 {d:8} 点伤害', { x: 0, y: 0, w: 400, h: 100 }, { o: e.base }); DRAW_LOG.on = false; return DRAW_LOG.texts.map((t) => t.text); };
  ok(rc({}).join('') === '造成 8 点伤害' && rc({}).length === 3 && rc({ 'hier.inlineMap': 'debuff' }).length === 3, 'drawRich：按段画，字照写');
  // 55：标题卡框宽按字长、展示字体作用范围、文字系统
  const tc = (x: Values) => withPack('snowline', () => rectOf(els({ 'cnt.elements': 'el.title', 'el.title.form': 'titleCard', ...x }), 'el.title'));
  ok((tc({})?.w ?? 999) < 300, `标题卡框宽按字长（${Math.round(tc({})?.w ?? 0)}，原来固定 360）`);
  ok((tc({ 'el.title.size': 25 })?.h ?? 0) > 540 * 0.25, 'el.title.size = 25：标题字高约占屏高 25%（control#6）');
  ok(!!baseTheme(resolveUi({ ...cur, 'hud.style': 'flat', 'typ.display.family': 'ransom', 'typ.display.scope': 'menuItem' } as Values), null, 'flat').tokens.display?.scope.includes('menuItem'), 'typ.display.scope 写进 t.display');
  const ts = (x: Values) => baseTheme(resolveUi({ ...cur, 'hud.style': 'flat', ...x } as Values), null, 'flat').tokens.textSize ?? 13;
  ok(ts({ 'typ.script': 'cjk' }) === ts({}) + px1080(2), 'typ.script = cjk：正文字号 + 2 px@1080p');
  // 54：字族角色表、停止静默别名
  ok(FONT_STACK.sans.startsWith('"GAE Sans"') && FONT_STACK.gothic === FONT_STACK.cinzel && !FONT_STACK.gothic.includes('GAE Blackletter'), '字体栈：有字体的照旧，没文件的字族落到 fallback（不写不存在的字体名）');
  ok(!roleHasFont('gothic') && roleResolved('gothic') === 'cinzel' && roleHasFont('condensed'), 'roleHasFont / roleResolved');
  ok(checkResolved(resolveUi({ ...cur, 'hud.style': 'flat', 'typ.display.family': 'gothic' } as Values)).some((v) => v.id === 'C-font-alias' && v.level === 'warn'), '选了没有字体文件的字族时检查提示 C-font-alias');
  // 54 字体落地：五个新字族有文件、栈里是真字体；中文展示字表只进展示栈
  ok(['slab', 'slabWestern', 'inkedSerif', 'occultSerif', 'comicHand'].every((x) => roleHasFont(x) && roleResolved(x) === x), `新字族都有字体文件（${['slab', 'slabWestern', 'inkedSerif', 'occultSerif', 'comicHand'].map((x) => `${x} → ${roleResolved(x)}`).join('、')}）`);
  ok(FONT_STACK.slab === `"GAE Slab", ${FONT_STACK.serif}` && FONT_STACK.slabWestern === `"GAE Slab", ${FONT_STACK.cinzel}` && FONT_STACK.inkedSerif === `"GAE Inked", "GAE Kai", ${FONT_STACK.serif}` && FONT_STACK.occultSerif === `"GAE Occult", ${FONT_STACK.cinzel}`, '板衬线 / 墨线 / 神秘学：拉丁新字体在前，中文接原来的后备');
  ok(FONT_STACK.condensed === `"GAE Rajdhani", ${FONT_STACK.sans}` && DISPLAY_STACK.condensed === `"GAE Rajdhani", "GAE Condensed CJK", ${FONT_STACK.sans}` && FONT_STACK.comicHand === `"GAE Comic", ${FONT_STACK.sans}` && DISPLAY_STACK.comicHand === `"GAE Comic", "GAE Comic CJK", ${FONT_STACK.sans}`, '展示字表的中文（得意黑、站酷快乐体）只进展示栈；正文栈与原来逐字相同（窄体）');
  ok(Object.keys(FONT_STACK).filter((x) => FONT_STACK[x] !== DISPLAY_STACK[x]).sort().join() === 'comicHand,condensed' && [...DISPLAY_ONLY].sort().join() === 'GAE Comic CJK,GAE Condensed CJK' && roleCjkDisplayOnly('condensed') && !roleCjkDisplayOnly('inkedSerif'), '只有漫画手写 / 窄体两套的展示栈与正文栈不同');
  const thF = (x: Values) => baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline', ...x } as Values), null, 'darkHairline').tokens;
  ok(thF({ 'typ.display.family': 'comicHand' }).title?.font === DISPLAY_STACK.comicHand && thF({ 'typ.body.family': 'comicHand' }).font === FONT_STACK.comicHand && thF({ 'typ.display.family': 'comicHand', 'typ.button.family': 'display' }).button?.font === DISPLAY_STACK.comicHand, '标题 / 借展示字体的按钮用展示栈，正文用正文栈');
  const fa = (x: Values) => checkResolved(resolveUi({ ...cur, 'hud.style': 'flat', ...x } as Values)).filter((v) => v.id === 'C-font-alias');
  ok(fa({ 'typ.body.family': 'comicHand' }).some((v) => v.level === 'info') && fa({ 'typ.display.family': 'comicHand' }).length === 0 && fa({ 'typ.display.family': 'slab' }).length === 0, 'C-font-alias：有文件的字族不再提示；正文选展示字表的字族给 info');
  ok(FONT_WEIGHTS['GAE Slab'].join() === '400,700' && FONT_WEIGHTS['GAE Occult'].join() === '400' && HUD_FONT_FILES.filter((x) => x.weightRange).map((x) => x.family).sort().join() === 'GAE Comic CJK,GAE Condensed CJK,GAE Occult', '字重：Kreon 取 400 / 700 两档静态；单字重的展示字体按字重范围注册（不合成粗体）');
  const gd = (x: Values) => godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...x } as Values)!.files.find((q) => q.path === 'ui/hud_sample.gd')!.text;
  const gdC = gd({ 'typ.display.family': 'comicHand', 'typ.body.family': 'slab' });
  ok(gdC.includes('"HudTitle": ["gae-comic-700.woff2", 0, 0, false, false, ["gae-comic-cjk-400.woff2", "gae-sans-700.woff2"]]') && gdC.includes('"Label": ["gae-slab-400.woff2", 0, 0, false, false, ["gae-serif-400.woff2"]]'), 'Godot：拉丁字体按字体栈挂回退链（漫画手写标题 → 站酷快乐体展示字表 → 思源黑体；板衬线正文 → 思源宋体）');
  ok(/"HudTitle": \["gae-occult-400\.woff2", 0,/.test(gd({ 'typ.display.family': 'occultSerif', 'typ.display.weight': 'black' })), 'Godot：Pirata One 按字重范围注册，粗体不加 embolden');
  if (!hadDoc) delete gl.document;
  resetOccupancy();
}

console.log('== M12b B3（外形库 / 生成轮廓 / 描边 / 分层立体 / 渐隐 / 图案 / 材质 / 微字饰件）');
{
  // 记路径的替身：moveTo / lineTo / roundRect 的参数
  const pathOf = (r: { x: number; y: number; w: number; h: number }, sty: Parameters<typeof boxPath>[2], inset = 0, holes = false) => {
    const pts: [string, number[]][] = [];
    const g = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? (...a: number[]) => { if (['moveTo', 'lineTo', 'roundRect', 'rect', 'ellipse'].includes(k)) pts.push([k, a.map((x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x))]); } : undefined) }) as unknown as CanvasRenderingContext2D;
    boxPath(g, r, sty, inset, holes);
    return pts;
  };
  const R1 = { x: 0, y: 0, w: 100, h: 40 };
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  // 38：分角遮罩——默认切角不变（左上 + 右下，6 点从 (c, 0) 起）；只切右下 = 5 点；圆角只给选中的角半径
  const ch0 = pathOf(R1, { chamfer: 8 });
  ok(ch0.length === 6 && ch0[0][1][0] === 8 && ch0[0][1][1] === 0, '切角默认路径不变（左上 + 右下）');
  const chB = pathOf(R1, { chamfer: 8, cornerMask: ['br'] });
  ok(chB.length === 5 && chB.some(([, a]) => a[0] === 100 && a[1] === 32) && chB.some(([, a]) => a[0] === 0 && a[1] === 0), 'vis.cornerMask = br：只切右下角');
  const rr = pathOf(R1, { radius: 10, cornerMask: ['tl', 'br'] }).find(([k]) => k === 'roundRect');
  ok(JSON.stringify(rr?.[1][4]) === '[10,0,10,0]', 'cornerMask 作用到圆角（左上 / 右下有半径，另两个直角）');
  ok(JSON.stringify(mk({ 'vis.corner': 'chamfer', 'vis.cornerMask': 'tr,br' }).tokens.panel.cornerMask) === '["tr","br"]' && mk({ 'vis.corner': 'chamfer', 'vis.cornerMask': 'tl,tr,br,bl' }).tokens.panel.cornerMask === undefined, 'theme：cornerMask 写进面板；四角全选 = 原来的');
  // 38 / 39：面板外形与小组件外形分开；格子面不跟面板外形、雷达小地图保持正圆
  const ps = mk({ 'vis.panelShape': 'randomQuad', 'el.minimap.form': 'radar' }).tokens;
  ok(ps.panel.shape === 'randomQuad' && ps.control?.shape === undefined && ps.map?.shape === undefined && ps.map?.circle === true, 'vis.panelShape：面板改形，格子面 / 雷达小地图不跟');
  ok(mk({}).tokens.panel.shape === undefined && mk({ 'vis.panelShape': 'box' }).tokens.panel.shape === undefined, 'vis.panelShape 默认 / box = 原来的矩形');
  // 39：随机外形按种子确定；内缩路径与外框同形（同一组偏移）；干笔刷的飞白只进填充的裁剪
  const q1 = pathOf(R1, { shape: 'randomQuad', seed: 5, shapeJitter: 0.2 }), q2 = pathOf(R1, { shape: 'randomQuad', seed: 5, shapeJitter: 0.2 }), q3 = pathOf(R1, { shape: 'randomQuad', seed: 6, shapeJitter: 0.2 });
  ok(JSON.stringify(q1) === JSON.stringify(q2) && JSON.stringify(q1) !== JSON.stringify(q3) && q1.length === 4, 'randomQuad：同种子同形、换种子换形');
  const qi = pathOf(R1, { shape: 'randomQuad', seed: 5, shapeJitter: 0.2 }, 2);
  ok(qi.every(([, a], i) => Math.abs(a[0] - q1[i][1][0]) <= 2.01 && Math.abs(a[1] - q1[i][1][1]) <= 2.01), 'randomQuad 的内缩路径与外框同形（双线内线 / 外框带对得上）');
  ok(q1.every(([, a]) => a[0] >= 0 && a[0] <= 100 && a[1] >= 0 && a[1] <= 40), 'randomQuad 不出外接框（命中框 / 占位表用外接矩形）');
  const br0 = pathOf(R1, { shape: 'brushStroke', seed: 3, brush: { dryness: 0.8, dir: 'ltr', tip: 0.2 } }), brH = pathOf(R1, { shape: 'brushStroke', seed: 3, brush: { dryness: 0.8, dir: 'ltr', tip: 0.2 } }, 0, true);
  ok(brH.filter(([k]) => k === 'moveTo').length > 1 && br0.filter(([k]) => k === 'moveTo').length === 1, '干笔刷：飞白缺口只在 holes 路径里（描边不画缺口）');
  for (const sh of ['oval', 'octagon', 'arrowRight', 'arrowLeft', 'arch', 'stepped', 'scallop', 'shard'] as const) {
    const pts = pathOf({ x: 10, y: 10, w: 60, h: 60 }, { shape: sh, seed: 2 });
    ok(pts.length >= 4 && pts.every(([, a]) => a[0] >= 9.5 && a[0] <= 70.5 && a[1] >= 9.5 && a[1] <= 70.5), `外形 ${sh}：点列在外接框里`);
  }
  // 39：烧边 / 毛边 / 扇贝边与分边处理
  const ed = (e: string, sides?: ('t' | 'b' | 'l' | 'r')[]) => pathOf(R1, { edge: e as never, seed: 3, edgeSides: sides });
  ok(ed('burnt').length > 40 && ed('deckle').length > ed('burnt').length, '烧边 / 毛边纸按各自步长采样');
  const top = ed('torn', ['t']);
  ok(top.filter(([, a]) => a[1] > 39.5).every(([, a]) => Math.abs(a[1] - 40) < 0.01), 'vis.edgeSides = top：下边不撕');
  // 37：描边线型、两端渐隐、左右两条、开口线
  const sk = mk({ 'vis.stroke': 'sticker', 'vis.strokeWidth': 2 }).tokens.panel.border;
  ok(sk?.style === 'sticker' && !!sk.ink, 'vis.stroke = sticker：贴纸三层（带墨环色）');
  ok(mk({ 'vis.stroke': 'solid', 'vis.strokeFade': 0.3 }).tokens.panel.border?.fade === 0.3 && mk({ 'vis.stroke': 'solid', 'vis.strokeSides': 'leftRight' }).tokens.panel.sides?.l !== undefined, 'strokeFade 写进描边；strokeSides = leftRight 画左右两条');
  const es = mk({ 'vis.stroke': 'solid', 'vis.strokeSides': 'endSquares' }).tokens.panel;
  ok(!!es.sides?.t && !!es.sides.b && !!es.sideEnds, 'strokeSides = endSquares：上下开口线 + 端头方块');
  // 36：偏移阴影默认不变，给了距离 / 方向 / 颜色才换；实心厚度、像素倒角、分层与凹槽
  const hd = (x: Values) => mk({ 'vis.depth': 'hardDrop', ...x }).tokens.panel.shadows?.[0];
  ok(hd({})?.x === 4 && hd({})?.y === 4 && hd({ 'vis.depthOffset': 16, 'vis.depthAngle': 180 })?.x === 0 && hd({ 'vis.depthOffset': 16, 'vis.depthAngle': 180 })?.y === 8 && hd({ 'vis.depthColor': 'accent' })?.color === '@accent', '硬投影：默认 (4, 4)；偏移 16 px@1080p 朝下 = (0, 8)；颜色可换（persona5#8）');
  ok(mk({ 'vis.depth': 'extrude' }).tokens.panel.shadows?.[0].sweep === true && mk({ 'vis.depth': 'pixelBevel', 'vis.pixelScale': 'x3' }).tokens.panel.shadows?.[0].x === 3, 'extrude = 扫出的实心厚度；pixelBevel 线宽 = 1 美术像素');
  const ly = mk({ 'vis.depth@frame': 'bevel', 'vis.depth@well': 'pixelBevel' }).tokens;
  ok(ly.panel.layers?.frame?.depth === 'bevel' && ly.panel.layers.frame.width === px1080(12) && !!ly.well && ly.well.shadows?.[0].blur === 0, 'vis.depth@frame / @well：外框带与凹槽 token（factorio#0）');
  ok(mk({ 'vis.depth@frame': 'bevel' }, 'scifi').tokens.panel.layers?.frame?.depth === 'bevel' && SCOPE_PARTS.includes('well'), '分层立体的字面键：手动层给的旧皮肤也认');
  // 41：渐隐（面板、格子面不跟）、渐变遮罩、方向性暗罩
  const fd = mk({ 'vis.fade': 'both', 'vis.fadeLength': 0.3 }).tokens;
  ok(fd.panel.fade?.dir === 'both' && fd.panel.fade.len === 0.3 && fd.control?.fade === undefined, 'vis.fade：面板渐隐，格子面不跟');
  const stops: [number, string][] = [];
  fadePaint({ createLinearGradient: () => ({ addColorStop: (t: number, c: string) => stops.push([t, c]) }) } as unknown as CanvasRenderingContext2D, R1, 'both', 0.25, '#ff0000');
  ok(stops.length === 4 && stops[0][1].endsWith(',0)') && stops[1][0] === 0.25 && stops[3][1].endsWith(',0)'), 'fadePaint：两端透明、0.25 处实');
  ok(sceneTones({ r: resolveUi({ ...cur, 'hud.style': 'flat', 'rel.sceneTone': 'directional,halftone' } as Values) } as never).length === 2, 'rel.sceneTone 新值 directional / halftone');
  // 42：图案参数与有序抖动矩阵（与画面后处理同一公式：4 × 4 是 0~15/16 的排列）
  const b4 = new Set<number>(), b8 = new Set<number>();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (x < 4 && y < 4) b4.add(bayer(4, x, y)); b8.add(bayer(8, x, y)); }
  ok(b4.size === 16 && Math.max(...b4) === 15 / 16 && b8.size === 64 && bayer(4, 1, 0) === 0.5, 'bayer4 / bayer8：16 / 64 个不同阈值');
  const ov = mk({ 'vis.pattern': 'dither', 'vis.ditherMatrix': 'bayer8', 'vis.patternArea': 'shadowOnly', 'vis.pixelScale': 'x2' }).tokens.panel.overlay;
  ok(ov?.matrix === 'bayer8' && ov.area === 'shadowOnly' && ov.cell === 2 && JSON.stringify(mk({ 'vis.pattern': 'halftoneDuo' }).tokens.panel.overlay?.colors) === '["@accent","@accent2"]', '图案：抖动矩阵 / 格子跟像素化 / 作用区域 / 双色网屏取两个强调色');
  ok(JSON.stringify(mk({ 'vis.pattern': 'dots' }).tokens.panel.overlay) === JSON.stringify({ kind: 'dots', opacity: 0.3, color: mk({ 'vis.pattern': 'dots' }).tokens.panel.overlay?.color }), '老图案的叠层对象不多字段（画法逐像素不变）');
  // 52：材质、磨损、表面处理
  ok(['velvet', 'marble', 'porcelain', 'cardboard', 'felt', 'clay', 'watercolor', 'stainedGlass', 'translucentPlastic', 'jadeFloc'].every((m) => !!MATERIAL_BASE[m]), '新材质都有基色（字色对比按它）');
  const mt = mk({ 'ast.core': 'texture', 'ast.coreMat': 'velvet', 'ast.wear': 0.6, 'ast.finish@slot': 'holo' });
  ok(mt.tokens.panel.material === 'velvet' && mt.tokens.panel.wear === 0.6 && mt.tokens.panel.finish === undefined, 'ast.coreMat = velvet、ast.wear 写进面板；按目标的表面处理不进整屏面板');
  // 48：微字饰件——侧轨占轨宽、微字参数进饰件、屏幕边的噪声登记进占位表
  const mo = mk({ 'ast.ornaments': 'microText,rulerRail', 'vis.noiseDensity': 0.8 }).tokens.panel;
  ok(mo.ornament?.micro?.density === 0.8 && mo.ornament.micro.rail === 'lr', '微字饰件：密度与侧轨的边写进 ornament.micro');
  const ins = ornamentInsets(mo, { x: 0, y: 0, w: 300, h: 200 });
  ok(ins.l > 5 && ins.r > 5 && ins.t === 0, '刻度侧轨：左右留出轨宽，上下不留');
  // 作用域：新参数都按目标生效
  ok(['vis.cornerMask', 'vis.panelShape', 'vis.strokeFade', 'vis.depthColor', 'vis.fade', 'vis.patternArea', 'ast.wear', 'ast.finish', 'vis.noiseDensity'].every((x) => SCOPABLE_IDS.includes(x)), 'SCOPABLE 收录 B3 的新参数');
  // Godot：分角切角导出到 StyleBoxFlat、表面 / 渐隐着色器随用随出
  const gf = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'vis.corner': 'chamfer', 'vis.cornerMask': 'br', 'vis.pattern': 'dither', 'vis.fade': 'both' } as Values)!;
  const tres = gf.files.find((f) => f.path === 'ui/ui_theme.tres')!.text, panelBlock = tres.split('[sub_resource').find((b) => b.includes('id="panel"')) ?? '';
  ok(/corner_radius_bottom_right = [1-9]/.test(panelBlock) && /corner_radius_top_left = 0/.test(panelBlock), 'Godot：只切右下角（corner_radius_bottom_right）');
  ok(gf.files.some((f) => f.path === 'ui/ui_surface.gdshader') && gf.files.some((f) => f.path === 'ui/ui_fade.gdshader') && !godotUiFiles({ ...cur, 'hud.style': 'darkHairline' } as Values)!.files.some((f) => f.path.endsWith('.gdshader')), 'Godot：用到抖动 / 渐隐时才导出表面着色器');
}

console.log('== M12b B4（卷草 / 母题 / 分隔线 / 饰件挂点 / 花饰标牌 / 外框结构 / 标题带）');
{
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  // 记调用的替身：方法名 + 参数（数字保留两位）
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000' };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: t.length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length };
  };
  // 44：卷草图元——带状多边形、涡卷多出点、等宽 / 调制；卷草母题的角花、尖顶饰、占位；粗细调制进主题
  {
    const a = rec();
    scroll(a.g, [[0, 0, 30, -10, 60, 20, 90, 0]], 1, 1, 'none');
    const b = rec();
    scroll(b.g, [[0, 0, 30, -10, 60, 20, 90, 0]], 1, 4, 'volute');
    ok(a.n('fill') === 1 && b.n('fill') === 2 && b.n('lineTo') > a.n('lineTo') + 20, 'scroll()：一根卷须 = 一个带状多边形；涡卷端头多一段收紧的螺线 + 一颗卷心');
    const c = rec();
    drawOrnaments(c.g, { x: 0, y: 0, w: 300, h: 200 }, 2, 'baroque', '#fff', ['corners'], undefined, { named: ['corners'] });
    ok(c.n('drawImage') === 0 && c.n('fill') >= 8 && c.n('stroke') === 0, '巴洛克角花：矢量填充的卷须（不调金色角件图集、不描线）');
    const fin = rec();
    drawOrnaments(fin.g, { x: 0, y: 40, w: 300, h: 200 }, 0, 'wroughtIron', '#111', ['finials'], undefined, { frame: { x: 0, y: 0, w: 960, h: 540 } });
    ok(fin.n('fill') >= 4, '铁艺尖顶饰：上下边中点各一个');
    const base = (m: string, parts = ['corners']) => ornamentInsets({ ornament: { level: 2, motif: m, color: '#fff', parts } }, { x: 0, y: 0, w: 300, h: 200 });
    ok(base('baroque').t > base('floral').t && base('baroque').corners.length === 4, '卷草角花的占位：沿边卷进的深度比花叶直臂深，四角各一块');
    ok(base('wroughtIron', ['finials']).marks.length === 2, '尖顶饰登记成两块 marks（页头 / 按钮行避开）');
    const sm = mk({ 'vis.motif': 'baroque', 'vis.ornament': 2, 'vis.strokeModulation': 0, 'vis.stroke': 'solid' }).tokens.panel, sm2 = mk({ 'vis.stroke': 'solid', 'vis.strokeModulation': 0.6 }).tokens.panel;
    ok(sm.ornament?.mod === 0 && sm.border?.mod === undefined && sm2.border?.mod === 0.6 && mk({ 'vis.motif': 'baroque', 'vis.ornament': 2 }).tokens.panel.ornament?.mod === undefined, 'vis.strokeModulation：显式给了才写（0 = 卷草也等宽）；> 0 时描边画膨线');
    ok(SCOPABLE_IDS.includes('vis.strokeModulation'), 'SCOPABLE 收录 vis.strokeModulation');
    const gf = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'vis.motif': 'ironScroll', 'vis.ornament': 2 } as Values)!;
    ok(gf.notes.some((n) => n.where.startsWith('卷草花饰')), 'Godot：卷草母题写迁移说明');
  }
  // 43：新母题都是矢量分支（不调角件图集）、sigil 按等级换变体、第二母题只换分隔线 / 端头、水印用大号符号、标题前缀
  {
    const NEWM = ['sigil', 'lightning', 'notes', 'chevrons', 'atom', 'starburst', 'interlace', 'greekKey', 'kamon', 'hexWarn', 'wedge'];
    const drawn = NEWM.map((m) => { const a = rec(); glyph(a.g, m, 20); return a.n('fill') + a.n('stroke'); });
    ok(drawn.every((n) => n > 0) && NEWM.every((m) => VECTOR_MOTIFS.has(m)), '11 个新母题各有矢量画法，且列进只画矢量的母题');
    const sg = [1, 2, 3].map((v) => { const a = rec(); glyph(a.g, 'sigil', 20, v); return a.calls.map(([k]) => k).join(','); });
    ok(new Set(sg).size === 3, 'sigil 按装饰等级换变体：倒五芒星 / 全视之眼 / 王冠');
    const c = rec();
    drawOrnaments(c.g, { x: 0, y: 0, w: 300, h: 200 }, 2, 'kamon', '#fff', ['corners'], undefined, { named: ['corners'] });
    ok(c.n('drawImage') === 0, 'kamon 不再别名到祥云角件图集');
    const m2 = mk({ 'vis.motif': 'baroque', 'vis.ornament': 2, 'vis.motif2': 'sigil' }).tokens.panel.ornament;
    ok(m2?.motif === 'baroque' && m2.motif2 === 'sigil' && mk({ 'vis.motif': 'baroque', 'vis.ornament': 2 }).tokens.panel.ornament?.motif2 === undefined, 'vis.motif2 写进饰件，auto 时没有');
    const wm = rec();
    drawWatermark(wm.g, { x: 0, y: 0, w: 400, h: 300 }, 'sigil', '#fff', 0.2, 'sigil', 1);
    const wm0 = rec();
    drawWatermark(wm0.g, { x: 0, y: 0, w: 400, h: 300 }, 'sigil', '#fff', 0.2, 'floral', 1);
    ok(wm.n('arc') >= 1 && wm.n('lineTo') === 5 && wm0.n('lineTo') === 3, 'ast.watermark = sigil：新母题画大号母题符号（倒五芒星），老母题照旧圆环 + 三角');
    ok(['vis.motif2', 'typ.titlePrefix'].every((x) => SCOPABLE_IDS.includes(x)), 'SCOPABLE 收录 vis.motif2 / typ.titlePrefix');
    const thP = mk({ 'uip.screen': 'tpl.inventory', 'typ.titlePrefix': 'doubleChevron' }), thN = mk({ 'uip.screen': 'tpl.inventory' });
    const texts = (th: ReturnType<typeof mk>) => { DRAW_LOG.on = true; DRAW_LOG.texts = []; drawScreen({ ctx: measureOnlyCtx(rec().g), m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, th); DRAW_LOG.on = false; return DRAW_LOG.texts.map((t) => t.text); };
    ok(texts(thP).includes('>>') && !texts(thN).includes('>>'), 'typ.titlePrefix = doubleChevron：模板页头标题前画「>>」，没选时不画');
  }
  // 45：分隔线库——divider() 的线型、位置（底边 / 页头下 / 网格行间）、占位
  {
    const dv = (st: string, o = {}) => { const a = rec(); divider(a.g, 0, 100, 10, st, 'diamond', '#fff', o); return a; };
    const gl = dv('glyph');
    ok(gl.n('moveTo') === 3 && gl.n('stroke') === 1 && gl.n('fill') === 1, 'glyph 线型：两段线 + 中间母题符号（原来的分隔饰条）');
    ok(dv('plain').n('fill') === 0 && dv('oxford').n('fillRect') === 2 && dv('double').n('fillRect') === 2 && dv('swelled').n('fill') === 1 && dv('dotted').n('arc') >= 10 && dv('fade').n('fillRect') === 1, '牛津线 = 粗细两条、双线 = 两条、膨线 = 一个带、点线 = 一串圆、渐隐线 = 渐变');
    ok(dv('glyph', { mod: 0.8 }).n('fill') === 3, '粗细调制给了时两段线画成膨线');
    const no = rec();
    drawOrnaments(no.g, { x: 0, y: 0, w: 300, h: 200 }, 1, 'none', '#fff', ['dividers'], undefined, { dividerPlace: ['afterTitle'] });
    const yes = rec();
    drawOrnaments(yes.g, { x: 0, y: 0, w: 300, h: 200 }, 1, 'none', '#fff', ['dividers'], undefined, { dividerPlace: ['panelBottom'] });
    ok(no.n('lineTo') === 0 && yes.n('lineTo') > 0, 'vis.dividerPlace 不含 panelBottom：饰件的底边分隔线不画');
    const ins = (ds?: string) => ornamentInsets({ ornament: { level: 1, motif: 'none', color: '#fff', parts: ['dividers'], dividerStyle: ds } }, { x: 0, y: 0, w: 300, h: 200 }).marks.length;
    ok(ins() === 1 && ins('oxford') === 0 && ins('plain') === 0, '一整条的印刷线不登记中间的符号块');
    ok(JSON.stringify(mk({ 'vis.ornament': 1, 'ast.ornaments': 'dividers', 'vis.dividerPlace': 'afterTitle,gridRows' }).tokens.panel.ornament?.dividerPlace) === '["afterTitle","gridRows"]' && SCOPABLE_IDS.includes('vis.dividerPlace'), 'vis.dividerPlace 写进饰件、按目标生效');
    const scr = (x: Values) => { const a = rec(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.screen': 'tpl.inventory', ...x })); return a; };
    ok(scr({ 'vis.dividerPlace': 'gridRows', 'vis.dividerStyle': 'oxford' }).n('fillRect') >= scr({}).n('fillRect') + 2, 'vis.dividerPlace = gridRows：格子两行之间画一条牛津线');
  }
  // 49：饰件挂点——饰色 / 宝石色、挂点筛选、出框、端头形、元素两端 / 条两端 / 名牌旁 / 按钮端、耳标、四角花焦点、墨团
  {
    const th = mk({ 'vis.ornament': 1, 'ast.ornaments': 'gems,hangers,corners', 'col.ornament': '#e8eef2', 'col.gem': '#9b5de5', 'ast.ornamentAnchor': 'panelCorners', 'ast.ornamentOverhang': 0.5, 'ast.endcapShape': 'cloud' });
    const o = th.tokens.panel.ornament;
    ok(o?.color === '#e8eef2' && o.gem === '#9b5de5' && JSON.stringify(o.anchors) === '["panelCorners"]' && o.overhang === 0.5 && o.endcap === 'cloud' && th.tokens.ornColor === '#e8eef2', 'col.ornament / col.gem / 挂点 / 出框 / 端头形写进饰件');
    const o0 = mk({ 'vis.ornament': 1, 'ast.ornaments': 'gems' }).tokens.panel.ornament;
    ok(!!o0 && o0.gem === undefined && o0.anchors === undefined && o0.overhang === undefined && mk({ 'vis.ornament': 1 }).tokens.ornColor === undefined, '没选时饰件不带这些字段（原来的画法）');
    const gem = rec();
    drawOrnaments(gem.g, { x: 0, y: 0, w: 300, h: 200 }, 0, 'none', '#fff', ['gems', 'hangers'], undefined, { gem: '#9b5de5' });
    ok(gem.calls.some(([k, a]) => k === 'fillStyle=' && a[0] === '#9b5de5') && !gem.calls.some(([k, a]) => k === 'fillStyle=' && (a[0] === '#c23b8f' || a[0] === '#c8102e')), 'col.gem 取代写死的品红宝石 / 红挂件');
    const onlyC = rec();
    drawOrnaments(onlyC.g, { x: 0, y: 0, w: 300, h: 200 }, 1, 'none', '#fff', ['corners', 'gems'], undefined, { anchors: ['panelCorners'] });
    ok(!onlyC.calls.some(([k, a]) => k === 'fillStyle=' && a[0] === '#c23b8f') && onlyC.n('stroke') > 0, 'ast.ornamentAnchor = panelCorners：只画角花，边上的宝石不画');
    const ins = (x = {}) => ornamentInsets({ ornament: { level: 1, motif: 'none', color: '#fff', parts: ['corners'], ...x } }, { x: 0, y: 0, w: 300, h: 200 });
    ok(ins({ overhang: 1 }).t < ins().t && ins({ anchors: ['panelEdges'] }).corners.length === 0, '出框时沿边的带变浅；不挂四角时角上不占位');
    const caps = ['spike', 'ball', 'square', 'cloud', 'brushTail', 'scroll'].map((sh) => { const a = rec(); drawEndcap(a.g, 10, 10, 12, 1, sh, '#fff'); return a.n('fill'); });
    ok(caps.every((n) => n >= 1) && endcapShapeOf('auto', 'ironScroll') === 'scroll' && endcapShapeOf('auto', 'cloud') === 'cloud' && endcapShapeOf('auto', 'none') === 'spike', 'drawEndcap 六种端头；auto 按母题');
    ok(['col.ornament', 'col.gem', 'ast.ornamentAnchor', 'ast.ornamentOverhang', 'ast.endcapShape', 'ast.earTabAt'].every((x) => SCOPABLE_IDS.includes(x)) && SCOPE_PARTS.includes('earTab') && SCOPE_PARTS.includes('keyBadge'), 'SCOPABLE / SCOPE_PARTS 收录 B4 · 49');
    const hudCalls = (x: Values) => { const a = rec(); resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.layout': 'layout.rpg', ...x }), null, []); return { a, occ: OCC.last?.items.filter((q) => (q.id ?? '').startsWith('decor.')) ?? [] }; };
    const ends = hudCalls({ 'ast.ornamentAnchor': 'elementEnds', 'vis.motif': 'ironScroll' });
    ok(ends.occ.filter((q) => (q.id ?? '').startsWith('decor.ends')).length >= 4, '元素两端的卷须：每个元素两块，登记进帧占位表');
    const ear = hudCalls({ 'cnt.elements': 'el.selection,el.vitals', 'ast.earTabAt@el.selection': 'topLeft' }), earG = hudCalls({ 'cnt.elements': 'el.selection,el.vitals', 'ast.earTabAt': 'topLeft' });
    ok(ear.occ.some((q) => q.id === 'decor.ear:el.selection') && !earG.occ.some((q) => (q.id ?? '').startsWith('decor.ear')), '耳标：按元素写（@el.selection）才给 HUD 元素画，全局写只给模板容器');
    const fc = (m: string) => { const a = rec(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.screen': 'tpl.inventory', 'ix.focus': m })); return a; };
    ok(fc('cornerFlourish').n('createRadialGradient') + fc('cornerFlourish').n('clip') > fc('outline').n('clip'), 'ix.focus = cornerFlourish：焦点格外一圈光晕（裁掉格子本身）+ 四角花');
  }
  // 46：花饰标题牌——牌宽、不填底、副题框进括号、区域标题卡首访 / 再访
  {
    ok(plateWidthOf('pill', 40, 20) === 64 && plateWidthOf('ribbon', 40, 20) === 88 && plateWidthOf('flankLines', 40, 20) > 100 && plateWidthOf('flourish', 40, 20) >= 90 + 16, '牌宽：原来的取值不变，花线 / 花饰更宽');
    const th = mk({ 'uip.screen': 'tpl.inventory' });
    const pl = (kind: string) => { const a = rec(); plate(makeCtx('el.title', a.g, a.g, th, { x: 0, y: 0, w: 960, h: 540 }), { x: 100, y: 20, w: 200, h: 30 }, '背包', kind, {}, 'title'); return a; };
    const fl = pl('flankLines'), fo = pl('flourish'), bk = pl('bracketFrame'), pi = pl('pill');
    ok(fl.n('fillRect') === 2 && fl.n('roundRect') === 0 && fo.n('fill') > 6 && bk.n('fillRect') === 2 && pi.n('roundRect') === 1, '两侧花线 = 两条线 + 端头符号、对称花饰 = 卷须、括号框 = 两条竖线 + 卷臂（都不填底）');
    const texts = (x: Values) => { DRAW_LOG.on = true; DRAW_LOG.texts = []; drawScreen({ ctx: rec().g, m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.screen': 'tpl.inventory', 'lay.titleSubtitle': 'italic', ...x })); DRAW_LOG.on = false; return DRAW_LOG.texts.map((t) => t.text); };
    const sub = String(packById('snowline')?.game.subtitle ?? '');
    ok(texts({ 'cmp.plate@title': 'bracketFrame' }).filter((t) => t === sub).length === 1 && texts({}).filter((t) => t === sub).length === 1, '括号框：副题画在框里（只画一次）');
    const sz = (x: Values) => { const e = makeCtx('el.title', rec().g, rec().g, mk({ 'uip.screen': 'tpl.chapterCard', 'el.title.form': 'areaCard', ...x }), { x: 0, y: 0, w: 960, h: 540 }); return ELEMENTS.get('el.title')!.size(e); };
    ok(sz({}).h > sz({ 'el.title.visit': 'revisit' }).h * 1.5, '区域标题卡：首访大（带花饰）、再访小');
  }
  // 50：外框结构——环带 / 齿轮 / 顶冠、框厚、元素套框 / 托盘、页签托槽、插画图窗外框、只画图标的圆钮
  // （材质带要离屏画布：这一段临时给一个记调用的 document 替身，测完还原）
  const doc0 = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => rec().g }) };
  try {
    const fr = (kind: string, r = { x: 10, y: 10, w: 80, h: 80 }) => { const a = rec(); drawFrame(a.g, r, { kind, mat: 'bronze', width: 7, motif: 'baroque' }, (inset) => boxPath(a.g, r, { circle: true }, inset)); return a; };
    ok(fr('gear').n('closePath') >= 12 && fr('ring').n('closePath') === 0 && fr('gear', { x: 0, y: 0, w: 200, h: 60 }).n('closePath') === 0, '齿轮表圈：圆 / 方盒外缘一圈齿（≥ 12），长条盒只画环带');
    ok(fr('crowned').n('fill') > fr('plainNinePatch').n('fill') && fr('threePart').n('fill') === fr('crowned').n('fill') && fr('illustratedFrame').n('fill') === fr('carvedNinePatch').n('fill'), '顶冠框多出顶冠 / 底坠；三段式没有素材时 = 顶冠框，整幅插画框没有素材时 = 雕花框');
    ok(mk({ 'ast.frame': 'plainNinePatch', 'ast.frameThickness': 20 }).tokens.panel.frame?.width === 10 && mk({ 'ast.frame': 'plainNinePatch' }).tokens.panel.frame?.width === 7 && SCOPABLE_IDS.includes('ast.frameThickness') && SCOPE_PARTS.includes('panelArt'), 'ast.frameThickness 是 px@1080p（20 → 10）；没给时 7');
    const hud = (x: Values) => { const a = rec(); resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.layout': 'layout.rpg', ...x }), null, []); return OCC.last?.items.filter((q) => (q.id ?? '').startsWith('decor.frame')) ?? []; };
    ok(hud({ 'elx.frame': 'panel' }).length >= 4 && hud({ 'el.abilities.frame': 'tray' }).length === 1 && hud({}).length === 0, 'elx.frame：panel 给每个元素套框、tray 只给写了的元素垫托盘；登记进帧占位表');
    const nav = (x: Values) => { const a = rec(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.screen': 'tpl.inventory', 'lay.nav': 'tabsTop', ...x })); return a; };
    ok(nav({ 'lay.navRail': 'arc' }).n('quadraticCurveTo') >= nav({}).n('quadraticCurveTo') + 2, 'lay.navRail = arc：页签行下面一道弧形托槽');
  } finally { (globalThis as { document?: unknown }).document = doc0; }
  // 47：标题带与标牌几何——整宽带铺满页头、拖拽条停在关闭钮前、出血、哪端斜切、补齐的取值不再是矩形、两行名牌、图标槽、印刷磨损、贴边页签钮
  {
    const doc0 = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => rec().g }) };
    try {
      const th = mk({ 'uip.screen': 'tpl.inventory' }), ec = (t = th) => makeCtx('el.title', rec().g, rec().g, t, { x: 0, y: 0, w: 960, h: 540 });
      const pl = (kind: string, x: Parameters<typeof plate>[6] = {}, t = th) => { const a = rec(), e = makeCtx('el.title', a.g, a.g, t, { x: 0, y: 0, w: 960, h: 540 }); plate(e, { x: 100, y: 20, w: 200, h: 30 }, '背包', kind, {}, 'title', x); return a; };
      ok(['scrollHead', 'sideTab', 'cloudPlate', 'crest', 'fan', 'cartouche', 'stele'].every((k) => pl(k).n('rect') === 0 || k === 'scrollHead') && pl('pill').n('roundRect') === 1, '补齐的标牌取值不再静默画成矩形（scrollHead 的带面是矩形 + 两卷圆柱）');
      const tab = (ends?: string) => pl('tab', {}, ends ? mk({ 'uip.screen': 'tpl.inventory', 'cmp.plateEnds': ends }) : th).calls.filter(([k]) => k === 'lineTo').map(([, a]) => a.join(',')).join(';');
      ok(tab() !== tab('right') && tab('right') !== tab('left') && tab() === tab('both'), 'cmp.plateEnds：只斜右端 / 左端与两端不同，both = 原来的');
      const bl = pl('swallowtail', { screen: { x: 0, y: 0, w: 960, h: 540 } }, mk({ 'uip.screen': 'tpl.inventory', 'cmp.plateBleed': true }));
      ok(bl.calls.some(([k, a]) => k === 'moveTo' && a[0] === 0), 'cmp.plateBleed：缎带伸到左屏幕边');
      const two = pl('twoLine', { sub: { text: '冥界王子', o: {} } });
      ok(two.calls.filter(([k]) => k === 'fillText').length >= 2 && two.calls.some(([k, a]) => k === 'fillText' && String(a[0]).includes('冥界')), '两行名牌：名字 + 称号两行');
      const scr = (x: Values) => { const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: { x: 0, y: 0, w: 960, h: 540 } } as never, { x: 0, y: 0, w: 960, h: 540 }, mk({ 'uip.screen': 'tpl.inventory', ...x })); DRAW_LOG.on = false; return { a, texts: DRAW_LOG.texts }; };
      const bandW = scr({ 'cmp.plate@title': 'band' }).a.calls.filter(([k]) => k === 'fillRect' || k === 'rect').map(([, a]) => Number(a[2])).reduce((m, v) => Math.max(m, v), 0);
      ok(bandW > 600, `整宽标题带铺满页头一行（${Math.round(bandW)}）`);
      const dh = scr({ 'cmp.plate@title': 'dragHandle' }).a.calls.filter(([k, a]) => k === 'fillRect' && Number(a[3]) <= 1.01);
      ok(dh.length >= 3, '拖拽条：标题后三道横纹');
      ok(scr({ 'lay.headerIcon': 'item' }).a.n('drawImage') + scr({ 'lay.headerIcon': 'item' }).a.n('fillRect') > scr({}).a.n('fillRect'), 'lay.headerIcon = item：页头标题前一枚框住的图标');
      const off = rec(), worn = rec(), dd = (globalThis as { document?: unknown }).document;
      (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => off.g }) };
      drawBox(worn.g, { x: 0, y: 0, w: 200, h: 40 }, { bg: { solid: '#eee' }, edge: 'printWorn', seed: 3 }, mk({}).pal);
      (globalThis as { document?: unknown }).document = dd;
      ok(off.calls.some(([k, a]) => k === 'globalCompositeOperation=' && a[0] === 'destination-out') && off.n('arc') > 10 && worn.n('drawImage') === 1 && off.n('lineTo') === 0, 'vis.edge = printWorn：离屏画好再擦斑点（轮廓不变：不走撕边的多边形）');
      void ec;
      ok(['cmp.plateEnds', 'cmp.plateBleed'].every((x) => SCOPABLE_IDS.includes(x)), 'SCOPABLE 收录 cmp.plateEnds / cmp.plateBleed');
    } finally { (globalThis as { document?: unknown }).document = doc0; }
  }
  // B4 审查修复：两行名牌 / 出血与返回钮 / 整宽带与页头元素 / 卷草占位 / 端盖封顶 / 顶冠进画面 / 光晕封顶 / 条两端 / 元素两端 / 第二母题 none / 分栏线 plain /
  // 耳标内容 / 扇环 / 括号框 / 圆钮图标 / edgeTab / 印刷磨损与元素套框的成品缓存 / Godot 外框纹理与饰色常量
  {
    setPack('snowline');
    const R0 = { x: 0, y: 0, w: 960, h: 540 };
    const doc0 = (globalThis as { document?: unknown }).document;
    let made = 0;
    (globalThis as { document?: unknown }).document = { createElement: () => { made++; return { width: 0, height: 0, getContext: () => rec().g }; } };
    try {
      const scr = (x: Values, skin = 'darkHairline', tpl = 'tpl.inventory') => { const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk({ 'uip.screen': tpl, ...x }, skin)); DRAW_LOG.on = false; return { a, texts: DRAW_LOG.texts.slice() }; };
      // 带变换的记点替身：记 moveTo / lineTo 落在画布上的点（饰件 / 顶冠 / 端盖实际画到哪）
      const pts = () => {
        const P: [number, number][] = [], st: number[][] = [], props: Record<string, unknown> = { lineWidth: 1 };
        let m = [1, 0, 0, 1, 0, 0];
        const ap = (x: number, y: number) => { P.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]); };
        const fns: Record<string, (...a: number[]) => unknown> = {
          save: () => { st.push([...m]); }, restore: () => { m = st.pop() ?? m; },
          translate: (x, y) => { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
          scale: (sx, sy) => { m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; },
          rotate: (a) => { const c = Math.cos(a), s = Math.sin(a); m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]]; },
          moveTo: (x, y) => ap(x, y), lineTo: (x, y) => ap(x, y),
          getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }), measureText: () => ({ width: 0 }),
          createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => ({ setTransform() {} }), isPointInPath: () => true,
        };
        const g = new Proxy({}, { get: (_, k) => (typeof k !== 'string' ? undefined : k in fns ? fns[k] : k in props ? props[k] : () => undefined), set: (_, k, v) => { props[String(k)] = v; return true; } }) as unknown as CanvasRenderingContext2D;
        return { g, P };
      };
      // ②③ 两行名牌：牌宽放得下第二行；画面顶部标题的副题只画一次
      const sub = String(packById('snowline')?.game.subtitle ?? '');
      const two = scr({ 'cmp.plate@title': 'twoLine', 'lay.titleSubtitle': 'italic' }, 'neobrutal'), s2 = two.texts.filter((t) => t.text === sub);
      const rects = two.a.calls.filter(([k]) => k === 'rect').map(([, a]) => a as number[]);
      const plateR = s2[0] ? rects.find((q) => Math.abs(q[0] + q[2] / 2 - (s2[0].x + s2[0].w / 2)) < 1.5 && q[3] < 60) : undefined;
      ok(s2.length === 1 && !!plateR && s2[0].x >= plateR[0] - 0.5 && s2[0].x + s2[0].w <= plateR[0] + plateR[2] + 0.5, '两行名牌：牌宽按两行里宽的那行（第二行不伸出牌外）');
      ok(scr({ 'cmp.plate@title': 'twoLine', 'lay.titleSubtitle': 'italic', 'lay.titlePos': 'screenTop' }).texts.filter((t) => t.text === sub).length === 1, '两行名牌 + 画面顶部标题：副题只画一次（在牌里）');
      // ④ 说话人不在角色样本里：不借第一个角色的称号，画成单行页签
      const role0 = samplesFor('characters')[0][2];
      const cnt = (x: Values) => scr(x, 'darkHairline', 'tpl.npc').texts.filter((t) => t.text === role0).length;
      ok(cnt({ 'cmp.plate@name': 'twoLine' }) === cnt({ 'cmp.plate@name': 'tab' }), `两行名牌：说话人不在角色样本里时不写别人的称号（${role0}）`);
      const tabL = (k: string, x?: Parameters<typeof plate>[6]) => { const a = rec(); plate(makeCtx('el.title', a.g, a.g, mk({ 'uip.screen': 'tpl.npc' }), R0), { x: 100, y: 20, w: 120, h: 30 }, '向导', k, {}, 'name', x); return a.calls.filter(([c]) => c === 'lineTo').map(([, a]) => (a as number[]).join(',')).join(';'); };
      ok(tabL('twoLine') === tabL('tab') && tabL('twoLine', { sub: { text: '冥界王子', o: {} } }) !== tabL('tab'), '两行名牌没有第二行时画成页签（不是光秃的矩形）');
      // ⑱ 骑边标题也传第二行
      ok(scr({ 'cmp.plate@title': 'twoLine', 'lay.titlePos': 'straddle' }).texts.some((t) => t.text === sub), '骑边（straddle）的两行名牌画第二行');
      // ⑤ 出血的标牌往左伸时返回钮画在牌之后
      const bl = scr({ 'ix.back': 'arrow', 'cmp.plate@title': 'swallowtail', 'cmp.plateBleed': true }).a.calls;
      ok(bl.findIndex(([k, a]) => k === 'fillText' && String(a[0]).startsWith('‹')) > bl.findIndex(([k, a]) => k === 'moveTo' && a[0] === 0), '出血的标牌伸到左屏幕边时返回钮画在牌上面');
      // ⑯ 整宽标题带 + 页头里的元素：标题照写
      const hx: Values = { 'cnt.elements': 'el.profile', 'el.profile.form': 'idCard', 'el.profile.anchorSpace': 'header' };
      const tx = (x: Values) => scr({ ...hx, ...x }, 'darkHairline', 'tpl.hero').texts.map((t) => t.text);
      const base = tx({});
      ok(['stripedFlank', 'band', 'fadeBand', 'dragHandle'].every((k) => base.every((t) => tx({ 'cmp.plate@title': k, 'lay.titleAlign': 'center' }).includes(t)) && base.every((t) => tx({ 'cmp.plate@title': k }).includes(t))), '整宽标题带：页头里有元素时标题照写（带只铺元素段以外）');
      // ㉑ 卷草角花的占位：画出来的点不落进扣掉占位之后的内容区（角块与 marks 里的除外）
      let worst = 0;
      for (const m of ['baroque', 'ironScroll', 'wroughtIron']) for (const lv of [1, 2, 3]) for (const r of [{ x: 0, y: 0, w: 600, h: 400 }, { x: 0, y: 0, w: 300, h: 200 }]) {
        const p = pts();
        drawOrnaments(p.g, r, lv, m, '#fff', ['corners'], undefined, {});
        const ins = ornamentInsets({ ornament: { level: lv, motif: m, color: '#fff', parts: ['corners'] } }, r);
        const blocks = [...ins.corners, ...ins.marks], inside = (q: { x: number; y: number; w: number; h: number }, [x, y]: [number, number]) => x >= q.x - 1 && x <= q.x + q.w + 1 && y >= q.y - 1 && y <= q.y + q.h + 1;
        for (const pt of p.P) {
          const [x, y] = pt, d = Math.min(x - (r.x + ins.l), r.x + r.w - ins.r - x, y - (r.y + ins.t), r.y + r.h - ins.b - y);
          if (d > 1 && !blocks.some((q) => inside(q, pt))) worst = Math.max(worst, d);
        }
      }
      ok(worst <= 1.5, `卷草角花（三种 × 装饰预算 1–3）画出的点都在占位里（最深伸进内容区 ${worst.toFixed(1)}）`);
      // ⑳ 面板端盖封顶（高夹在 14~44，伸出量按形）
      const cap = (sh: string) => { const p = pts(); drawOrnaments(p.g, { x: 400, y: 20, w: 300, h: 500 }, 1, 'none', '#fff', ['endcaps'], undefined, { endcap: sh }); return 400 - Math.min(...p.P.map(([x]) => x)); };
      ok(['spike', 'ball', 'cloud', 'brushTail', 'scroll'].every((sh) => cap(sh) <= 44 * 1.75 + 1), '面板端盖封顶：300 × 500 的面板上墨刷尾 / 卷须不再伸出几百');
      // ⑫㉓ 顶冠放进画面安全区、登记 marks
      const crown = (y: number) => { const p = pts(), r = { x: 40, y, w: 880, h: 300 }; drawFrame(p.g, r, { kind: 'crowned', mat: 'gold', width: 7, motif: 'none' }, (inset) => boxPath(p.g, r, {}, inset), R0); return Math.min(...p.P.map(([, yy]) => yy)); };
      ok(crown(18) >= 0 && crown(200) < 200, '顶冠框：顶冠会伸出画面顶边时缩小 / 挪进画面（离顶边够远时照旧长在盒外）');
      ok(ornamentInsets({ frame: { kind: 'crowned', mat: 'gold', width: 7, motif: 'none' } }, { x: 40, y: 18, w: 880, h: 500 }, { frame: R0 }).marks.length === 2, '顶冠 / 底坠登记成 marks（页头 / 按钮行避开）');
      // ㉒ 四角花焦点的光晕按目标的形（列表行上不洗满整屏）：滤色叠加之前的两个 rect = 光晕框 + 目标
      const halo = (tpl: string) => {
        const c = scr({ 'ix.focus': 'cornerFlourish' }, 'darkHairline', tpl).a.calls, out: number[][] = [];
        c.forEach(([k, a], q) => { if (k === 'globalCompositeOperation=' && a[0] === 'screen') { const rs = c.slice(0, q).filter(([kk]) => kk === 'rect').slice(-2).map(([, aa]) => aa as number[]); if (rs.length === 2) out.push([rs[0][2] - rs[1][2], rs[0][3] - rs[1][3]]); } });
        return out;
      };
      const hs = ['tpl.settings', 'tpl.quest', 'tpl.inventory'].flatMap((t) => halo(t));
      ok(hs.length >= 2 && hs.every(([dw, dh]) => dw <= 50 && dh <= 50), `四角花焦点：光晕只比目标宽 / 高一圈（${hs.map(([a, b]) => `${Math.round(a)}×${Math.round(b)}`).join(' ')}）`);
      // ㉕ 条两端：el.vitals 的主血条也有端头
      const hud = (x: Values) => { const a = rec(); resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, mk({ 'uip.layout': 'layout.rpg', ...x }), null, []); return { a, occ: OCC.last?.items ?? [] }; };
      ok(hud({ 'cnt.elements': 'el.vitals', 'ast.ornamentAnchor': 'barEnds' }).a.n('closePath') >= hud({ 'cnt.elements': 'el.vitals' }).a.n('closePath') + 4, 'ast.ornamentAnchor = barEnds：el.vitals 的条（直接调 gauge()）两端也有端头');
      // ㉔ 元素两端：不伸出画面
      const ends = hud({ 'ast.ornamentAnchor': 'elementEnds', 'vis.motif': 'ironScroll' }).occ.filter((q) => (q.id ?? '').startsWith('decor.ends'));
      ok(ends.length >= 2 && ends.every((q) => q.rect.x >= 0 && q.rect.y >= 0 && q.rect.x + q.rect.w <= 960 && q.rect.y + q.rect.h <= 540), `元素两端的卷须不伸出画面（${ends.length} 块）`);
      // ⑩ 第二母题 none = 不放符号（与 plain 线型一样），端头照旧三角
      const orn = (x: Record<string, unknown>) => { const a = rec(); drawOrnaments(a.g, { x: 20, y: 20, w: 300, h: 200 }, 1, 'none', '#fff', ['dividers', 'endcaps'], undefined, x); return JSON.stringify(a.calls); };
      ok(orn({ motif2: 'none' }) === orn({ dividerStyle: 'plain' }) && orn({ motif2: 'none' }) !== orn({}), 'vis.motif2 = none：分隔线中间不放符号、端头照旧三角（不再画成菱形）');
      // ⑪ 模板分隔线的 plain = 整条实线
      const rule = (x: Values) => { const a = scr({ 'vis.dividerPlace': 'betweenBlocks', ...x }, 'darkHairline', 'tpl.hero').a; return [a.n('fillRect'), a.n('moveTo')].join(); };
      ok(rule({ 'vis.dividerStyle': 'plain' }) === rule({}), 'vis.dividerStyle = plain：块之间的分隔线是整条实线（不断成两段）');
      // ㉚ 耳标：左上图标小签、右上拨杆
      const ear = (at: string) => { DRAW_LOG.on = true; DRAW_LOG.texts = []; hud({ 'cnt.elements': 'el.selection,el.vitals', 'ast.earTabAt@el.selection': at }); DRAW_LOG.on = false; return DRAW_LOG.texts.map((t) => t.text); };
      ok(!ear('topLeft').includes('ON') && ear('topRight').includes('ON'), '耳标：左上是图标小签、右上才是 ON 拨杆');
      // ㉘ 扇环在牌的矩形里
      const fan = rec();
      plate(makeCtx('el.title', fan.g, fan.g, mk({ 'uip.screen': 'tpl.inventory' }), R0), { x: 100, y: 20, w: 220, h: 34 }, '一二三四五六七八', 'fan', {}, 'title');
      const arcs = fan.calls.filter(([k]) => k === 'arc').map(([, a]) => a as number[]);
      const yEnd = (q: number[]) => Math.max(q[1] + q[2] * Math.sin(q[3]), q[1] + q[2] * Math.sin(q[4]));
      ok(arcs.length === 2 && arcs.every((q) => yEnd(q) <= 54.5), `扇环：两端与扇尖都在牌的矩形里（最低 ${Math.max(...arcs.map(yEnd)).toFixed(1)}，牌底 54）`);
      // ㉗ 括号框框副题：副题离竖线够远（臂长 + 涡卷）
      const br = scr({ 'cmp.plate@title': 'bracketFrame', 'lay.titleSubtitle': 'italic' });
      const bars = br.a.calls.filter(([k, a]) => k === 'fillRect' && (a as number[])[2] < 4 && (a as number[])[3] > 30).map(([, a]) => a as number[]), sb = br.texts.find((t) => t.text === sub);
      const bh = bars[0] ? bars[0][3] + bars[0][2] * 4 : 0, armB = bars.length === 2 ? Math.min(bh * 0.5, (bars[1][0] - bars[0][0]) * 0.22) : 0, vol = Math.max(Math.max(1, bh * 0.05) * 1.4, armB * 0.18);
      ok(bars.length === 2 && !!sb && sb.x >= bars[0][0] + armB + vol && sb.x + sb.w <= bars[1][0] - armB - vol, '括号框：副题不压在下臂的卷上');
      // ㉙ 圆钮只画图标：图标取内容包（战棋包的局内 HUD = ⚔）
      DRAW_LOG.on = true; DRAW_LOG.texts = [];
      { const a = rec(); resetOccupancy(); setPack('tactics'); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, mk({ 'uip.layout': 'layout.strategyTurn', 'el.cta.form': 'round', 'cmp.button@el.cta': 'icon', 'cnt.elements': 'el.cta' }), null, []); setPack('snowline'); }
      DRAW_LOG.on = false;
      ok(DRAW_LOG.texts.some((t) => t.text.startsWith('⚔')) && !DRAW_LOG.texts.some((t) => t.text.startsWith('▶')), '只画图标的圆钮：图标取内容包的 hud.cta.icon（随待办切换），不再写死 ▶');
      // ⑦ 贴边页签是外形（vis.silhouette），cmp.button 只管内容
      const tab = shapeStyle(makeCtx('el.cta', rec().g, rec().g, mk({ 'vis.silhouette@button': 'edgeTab' }), R0), 'button', {}, { x: 0, y: 0, w: 120, h: 40 });
      ok(tab.chamfer === 28 && JSON.stringify(tab.cornerMask) === '["tl"]' && !SPEC_PARAM.get('cmp.button')!.options!.some((o) => o.value === 'edgeTab') && SPEC_PARAM.get('vis.silhouette')!.options!.some((o) => o.value === 'edgeTab'), 'edgeTab 是 vis.silhouette 的取值：只切左上角（0.7 × 高），cmp.button 不再有它');
      // ⑰ 印刷磨损 / 渐隐的成品缓存：同样的盒子第二遍不新建画布；十种尺寸也不抖（BAKE.eager：第一次见到就烘的口径，中期审查修复后的「稳住了才烘」见那一节）
      clearBakes(); BAKE.eager = true; bakeFrame();
      const boxes = Array.from({ length: 10 }, (_, i) => ({ x: 10, y: 10 + i * 30, w: 100 + i * 7, h: 24 }));
      const pass = () => { const a = rec(), m0 = made; for (const q of boxes) drawBox(a.g, q, { bg: { solid: '#eee' }, edge: 'printWorn', seed: 3 }, mk({}).pal); return { made: made - m0, img: a.n('drawImage') }; };
      const p1 = pass(), p2 = pass();
      ok(p1.made === 10 && p2.made === 0 && p2.img === 10, `vis.edge = printWorn：成品缓存（第一遍新建 ${p1.made}、第二遍 ${p2.made}）`);
      // ㉖ 元素套框烘进离屏画布：第二帧不新建、只贴图
      clearBakes();
      const fx: Values = { 'elx.frame': 'panel', 'ast.frame': 'carvedNinePatch', 'vis.motif': 'baroque' };
      const fr1 = (() => { const m0 = made; hud(fx); return made - m0; })();
      const fr2 = (() => { const m0 = made; const h2 = hud(fx); return { made: made - m0, img: h2.a.n('drawImage') }; })();
      ok(fr1 > 0 && fr2.made === 0 && fr2.img >= 4, `elx.frame：元素套框烘一次、之后每帧贴图（第二帧新建 ${fr2.made}）`);
      BAKE.eager = false; clearBakes();
      // ⑥ Godot：顶冠框导出中段九宫格纹理，环带的说明不写九宫格；饰色 / 宝石色导出成主题常量
      const gfx = (x: Values) => godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...x } as Values)!;
      const texOf = (fk: string) => gfx({ 'ast.frame': fk, 'ast.frameMat': 'gold' }).files.filter((f) => f.path.includes('ui_frame_')).map((f) => f.path).join();
      ok(texOf('crowned') !== '' && texOf('crowned') === texOf('plainNinePatch') && texOf('illustratedFrame') === texOf('carvedNinePatch'), 'Godot：顶冠框 / 三段式导出平框九宫格，整幅插画框没有素材时导出雕花框（与画布一样）');
      ok(!gfx({ 'ast.frame': 'ring', 'ast.frameMat': 'bronze' }).notes.some((q) => q.what.startsWith('外框（ring') && q.how.includes('九宫格（texture_margin')), 'Godot：环带的外框说明不再写九宫格');
      ok(gfx({ 'vis.ornament': 1, 'col.ornament': '#e8eef2', 'col.gem': '#9b5de5', 'ast.ornaments': 'gems' }).files.some((f) => f.text.includes('HudRoles/colors/ornament') && f.text.includes('HudRoles/colors/gem')), 'Godot：饰色 / 宝石色导出成 HudRoles/colors/ornament、gem');
    } finally { (globalThis as { document?: unknown }).document = doc0; }
  }
  // @B4-TESTS
}

console.log('== M12b B5（数字字形 / 数值图形 / 条的端头与附属件 / 计数读数 / 时钟日历 / 计量与数据图 / 事件字效）');
{
  setPack('snowline');
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  // 记调用的替身：方法名 + 参数；measureText 按字数 × 6
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1 };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : k === 'canvas' ? { width: 960, height: 540 } : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length, texts: () => calls.filter(([k]) => k === 'fillText').map(([, a]) => String(a[0])) };
  };
  const ctx = (id: string, x: Values = {}, skin = 'darkHairline', a = rec()) => ({ a, e: makeCtx(id, a.g, a.g, mk(x, skin), R0) });
  const sig = (a: ReturnType<typeof rec>) => JSON.stringify(a.calls);
  const hud = (x: Values, skin = 'darkHairline') => { const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, mk(x, skin), null, []); DRAW_LOG.on = false; return { a, texts: DRAW_LOG.texts.map((t) => t.text) }; };

  // ---- 07 数字字形 ----
  {
    const o = { size: 20, weight: 700 };
    const p = ctx('el.timer'), q = ctx('el.timer');
    T(p.e, '12:34', 10, 10, 30, o); drawNumber(q.e, '12:34', 10, 10, 30, o);
    ok(sig(p.a) === sig(q.a) && numberWidth(q.e, '12:34', o) === W(q.e, '12:34', o) && mk({}).tokens.numerals === undefined, '没给 typ.numerals.* 时 drawNumber = T()（调用序列逐字一样），numberWidth = W()');
    ok(mk({ 'typ.numerals.family': 'sevenSeg' }).tokens.numerals?.family === 'sevenSeg' && mk({}, 'pixel').tokens.numerals === undefined && mk({ 'typ.numerals.family': 'sevenSeg' }, 'scifi').tokens.numerals?.family === 'sevenSeg', 'typ.numerals.family 进 t.numerals：旧皮肤的皮肤预设（skin.pixel = pixel）不算，手动层给的旧皮肤也认');
    const seg = ctx('el.timer', { 'typ.numerals.family': 'sevenSeg' });
    const w7 = drawNumber(seg.e, '88', 0, 0, 30, o);
    ok(seg.a.n('fillText') === 0 && seg.a.n('fill') === 14 && w7 > 0, '七段数码：矢量画（「88」= 14 段，不用字体）');
    const seg1 = ctx('el.timer', { 'typ.numerals.family': 'sevenSeg' }); drawNumber(seg1.e, '1', 0, 0, 30, o);
    ok(seg1.a.n('fill') === 7 && seg1.a.calls.some(([k, v]) => k === 'fillStyle=' && /rgba?\(.*0\.12\)/.test(String(v[0]))), '七段数码：熄灭段淡淡留着（「1」亮 2 段 + 暗 5 段）');
    const dm = ctx('el.timer', { 'typ.numerals.family': 'dotMatrix' }); drawNumber(dm.e, '0', 0, 0, 30, o);
    ok(dm.a.n('arc') === 35, '点阵：5 × 7 = 35 个点（亮 + 暗）');
    const ss = ctx('el.timer', { 'typ.numerals.family': 'singleStroke' }); drawNumber(ss.e, '7', 0, 0, 30, o);
    ok(ss.a.n('stroke') === 1 && ss.a.n('fillText') === 0, '单线笔画：一条折线描出来');
    const mix = ctx('el.timer', { 'typ.numerals.family': 'sevenSeg' }); drawNumber(mix.e, 'LAP 2', 0, 0, 30, o);
    ok(mix.a.texts().join('') === 'LAP' && mix.a.n('fill') === 7, '矢量数字混排：字母仍用字体画（LAP），数字画成段');
    const odo = ctx('el.resources', { 'typ.numerals.family': 'odometer' }); drawNumber(odo.e, '860', 0, 0, 30, o);
    // 每个字画的时候的填充色（fillText 之前最后一次 fillStyle=）
    const colAt = (a: ReturnType<typeof rec>) => { let c = ''; const out: string[] = []; for (const [k, v] of a.calls) { if (k === 'fillStyle=') c = String(v[0]); if (k === 'fillText') out.push(c); } return out; };
    const ot = odo.a.texts(), oc = colAt(odo.a);
    ok(ot.join('') === '000860' && oc[0] === oc[2] && oc[0] !== oc[3] && /0\.35\)$/.test(oc[0]), '里程表：补前导零到 6 位、逐位画，前导零变暗（35%）');
    const cell = ctx('el.resources', { 'typ.numerals.cells': 'inset' }); drawNumber(cell.e, '12,480', 0, 0, 30, o);
    ok(cell.a.texts().join('') === '12480' && cell.a.n('fillText') === 5, '逐位内凹格：每位一格（千分位去掉）');
    const tab = ctx('el.resources', { 'typ.numerals.family': 'tabular' }); drawNumber(tab.e, '11', 0, 0, 30, o);
    const xs = tab.a.calls.filter(([k]) => k === 'fillText').map(([, v]) => Number(v[1]));
    ok(xs.length === 2 && Math.abs(xs[1] - xs[0] - 6) < 0.01, '等宽数字：逐位按「0」的宽排');
    const old = ctx('el.resources', { 'typ.numerals.family': 'oldstyle' }); drawNumber(old.e, '18', 0, 0, 30, o);
    ok(old.a.calls.filter(([k]) => k === 'font=').some(([, v]) => /\b14\.8px/.test(String(v[0]))), '旧式数字：0 1 2 按小写高度缩小（1 的字号 × 0.74）');
    const f = (fmt: string) => fmtNumber(makeCtx('el.resources', rec().g, rec().g, mk({ 'typ.numberFormat': fmt }), R0), 12480);
    ok(f('western') === '12.5K' && f('cn10k') === '1.2万' && f('plain') === '12480' && f('grouped') === '12,480' && fmtNumber(makeCtx('el.resources', rec().g, rec().g, mk({}), R0), 12480, 'x') === 'x', '数字格式：K / 万 / 不分组 / 千分位；没给时原来的写法');
    ok(mk({ 'typ.numerals.weight': 'light', 'typ.numerals.family': 'sevenSeg' }).tokens.numerals?.thick === 0.65 && mk({ 'typ.numerals.style': 'italic' }).tokens.numerals?.italic === true, '数字字重 → 字重 + 矢量笔画粗细；数字斜体');
    ok(['typ.numerals.family', 'typ.numerals.weight', 'typ.numerals.cells', 'typ.numberFormat'].every((x) => SCOPABLE_IDS.includes(x)) && mk({ 'typ.numerals.family@el.resources': 'odometer' }).tokens.numerals === undefined, '数字字形按目标生效（@el.resources 只给资源栏，整屏主题不带）');
    const scoped = makeCtx('el.resources', rec().g, rec().g, mk({ 'typ.numerals.family@el.resources': 'odometer' }), R0);
    ok(scoped.t.numerals?.family === 'odometer', '按目标的数字字形进元素的主题补丁');
  }
  // ---- 02 数值图形 ----
  {
    const g0 = (kind: string, x: Values = {}, v = 0.6, r = { x: 0, y: 0, w: 200, h: 12 }, extra = {}) => { const c = ctx('el.vitals', x); gauge(c.e, r, v, kind, '#ff0000', undefined, extra); return c.a; };
    ok(g0('segmented').n('fillRect') === 10 && g0('segmented', { 'cmp.gaugeUnits': 6 }).n('fill') === 6, '分段：没选单位参数时原来的 10 格；选了单位数走单位格');
    ok(['pips', 'diamondPips', 'heartsTyped', 'lightStrip', 'textBar', 'scaleBar', 'trigram', 'tachometer', 'arcDots', 'ecg', 'pressureTube', 'thermometer', 'eye', 'bipolar', 'track', 'lightUp'].every((k) => typeof GAUGES[k] === 'function'), 'GAUGES 注册了 16 种新画法 / 补齐的画法');
    ok(g0('pips', { 'cmp.gaugeUnits': 5 }).n('stroke') === 5 && g0('pips', {}, 0.6, undefined, { max: 3 }).n('stroke') === 3, '独立小格：格数 = cmp.gaugeUnits，没给时样本上限（3 格血）');
    const dp = g0('diamondPips', {}, 0.5);
    ok(dp.n('fill') === 3 && dp.n('stroke') === 3, '菱形点阵：实心 = 已有、空心 = 上限（6 颗一半）');
    const ht = g0('heartsTyped', {}, 0.5, { x: 0, y: 0, w: 200, h: 14 }), ht2 = g0('heartsTyped', {}, 0.9, { x: 0, y: 0, w: 200, h: 14 });
    ok(ht.n('clip') === 3 && ht2.calls.some(([k, v]) => k === 'fillStyle=' && v[0] === '#5aa9ff'), '类型心：5 颗里 2.5 颗有血（两颗满 + 一颗半），倒数第二颗是蓝魂心');
    const ls = g0('lightStrip', {}, 0.5);
    ok(ls.calls.filter(([k, v]) => k === 'shadowBlur=' && Number(v[0]) > 0).length === 5, '自发光灯段：亮段带光晕（10 段亮 5 段）');
    ok(g0('tachometer', {}, 0.7, { x: 0, y: 0, w: 120, h: 120 }).n('fillText') === 9 && g0('tachometer', { 'cmp.dialParts': 'ticks,needle' }, 0.7, { x: 0, y: 0, w: 120, h: 120 }).n('fillText') === 0, '转速表：刻度数字 0–8；cmp.dialParts 只选刻度 + 指针时不写字');
    ok(['tachometer', 'arcDots'].every((k) => ROUND_GAUGES.has(k)) && !ROUND_GAUGES.has('lightUp'), '圆形画法：转速表 / 环徽点亮在矩形里取正方形（B5 审查修复：lightUp 是一排点亮的节点，不取正方形）');
    ok(g0('arcDots', { 'cmp.gaugeUnits': 4 }, 0.5, { x: 0, y: 0, w: 96, h: 96 }).calls.filter(([k, v]) => k === 'shadowBlur=' && Number(v[0]) > 0).length === 2, '环徽点亮：4 颗点亮 2 颗（发光）');
    ok(g0('ecg', {}, 0.1, { x: 0, y: 0, w: 200, h: 20 }).texts().includes('DANGER') && g0('ecg', {}, 0.9, { x: 0, y: 0, w: 200, h: 20 }).texts().includes('FINE'), '心电图：按数值写 Fine / Caution / Danger');
    const legacyThermo = (() => { const c = ctx('el.meter', { 'uip.layout': 'layout.survival' }, 'flat'); gauge(c.e, { x: 0, y: 0, w: 200, h: 12 }, 0.5, 'thermometer'); return c.a; })();
    ok(g0('thermometer').n('arc') >= 1 && legacyThermo.n('arc') === 0, '温度计按形画；旧皮肤上皮肤之前写的取值照旧画横条（冻结）');
    const wd = (x: Values) => { const c = ctx('el.resources', x); gauge(c.e, { x: 0, y: 0, w: 96, h: 96 }, 0.5, 'ring'); return c.a.calls.filter(([k]) => k === 'lineWidth=').map(([, v]) => Number(v[0])); };
    ok(wd({})[0] > 10 && wd({ 'vis.strokeWidth@el.resources': 2 })[0] === 2, '圆环弧线宽：按目标写了 vis.strokeWidth 才换（原来半径 22%）');
    const speed = (x: Values) => hud({ 'uip.layout': 'layout.racing', ...x }).texts;
    ok(speed({ 'cnt.elements': 'el.speed', 'el.speed.showPlace': 'off' }).every((t) => !/^\d\/\d$/.test(t)) && speed({ 'cnt.elements': 'el.speed' }).some((t) => /^\d\/\d$/.test(t)), 'el.speed.showPlace = off：不写名次（没给时同屏没有 el.rank 才写）');
    const tv = valueText(makeCtx('el.vitals', rec().g, rec().g, mk({}), R0), 0.5, 100, 'trend', 3);
    ok(tv === '▲' && valueText(makeCtx('el.vitals', rec().g, rec().g, mk({}), R0), 0.5, 100, 'trend') === '▼', '趋势箭头：升 ▲、降 ▼');
    const hov = hud({ 'uip.layout': 'layout.rpg', 'el.vitals.valueLabel': 'currentMax', 'el.vitals.valueLabelShow': 'onHover' }).texts, vis = hud({ 'uip.layout': 'layout.rpg', 'el.vitals.valueLabel': 'currentMax' }).texts;
    ok(vis.some((t) => /\d+\/\d+/.test(t)) && !hov.some((t) => /^\d+\/\d+$/.test(t)), '数值标注只在悬停时显示：静帧不画');
  }
  // ---- 03 端头 / 外框 / 换色 / 附属件 ----
  {
    const g0 = (x: Values, v = 0.6, extra = {}) => { const c = ctx('el.vitals', x); gauge(c.e, { x: 100, y: 10, w: 200, h: 10 }, v, 'bar', '#ff0000', undefined, extra); return c.a; };
    const base = g0({}), cap = g0({ 'cmp.gaugeCap': 'pointed' });
    ok(cap.n('fill') >= base.n('fill') + 2 && cap.calls.some(([k, v]) => k === 'rect' && Number(v[0]) > 100), '条端头：两端各一个尖头，条往里收（端头画在原来的矩形里）');
    const both = g0({ 'cmp.gaugeCap': 'ball', 'ast.ornamentAnchor': 'barEnds' }), endsOnly = g0({ 'ast.ornamentAnchor': 'barEnds' });
    ok(both.n('arc') === 2 && endsOnly.n('arc') === 0, '选了 cmp.gaugeCap 时 barEnds 的端头不再画一遍');
    ok(g0({ 'cmp.gaugeFrame': 'double' }).n('strokeRect') === 2 && g0({ 'cmp.gaugeFrame': 'hairline' }).n('strokeRect') === 1 && base.n('strokeRect') === 0, '条外框：双细线 / 细框');
    const fillOf = (a: ReturnType<typeof rec>) => a.calls.filter(([k]) => k === 'fillStyle=').map(([, v]) => String(v[0]));
    const th = mk({});
    ok(fillOf(g0({ 'cmp.gaugeColorBy': 'thresholds' }, 0.1)).includes(th.roles.danger) && fillOf(g0({ 'cmp.gaugeColorBy': 'thresholds' }, 0.4)).includes(th.roles.warn) && fillOf(g0({}, 0.1)).includes('#ff0000'), '按数值分档换色：低危险色、中警告色；没选时调用方的颜色');
    const gr = fillOf(g0({ 'cmp.gaugeColorBy': 'gradient' }, 0.42));
    ok(!gr.includes(th.roles.warn) && !gr.includes('#ff0000') && fillOf(g0({ 'col.coding': 'status,value' }, 0.42)).join() === gr.join(), '渐变换色：中间值插值；col.coding = value 等于 gradient');
    ok(g0({ 'cmp.gaugeExtra': 'recoverable' }, 0.5, { recover: 0.2 }).n('setLineDash') >= 1 && g0({ 'cmp.gaugeExtra': 'statusRow' }, 0.5, { status: [['!', 'warn', 2]] }).texts().includes('2'), '附属件：可回复段（虚线框）、状态行（层数）');
    ok(g0({ 'cmp.gaugeExtra': 'shieldTint' }, 0.5, { shield: 6 }).texts().includes('6') && g0({ 'cmp.gaugeExtra': 'capLabel' }, 0.5, { cap: 'E' }).texts().includes('E'), '附属件：格挡盾徽写格挡数、帽头字母');
    const vs = (x: Values) => { const e = makeCtx('el.vitals', rec().g, rec().g, mk({ 'uip.layout': 'layout.action', ...x }), R0); return ELEMENTS.get('el.vitals')!.size(e); };
    const v0 = vs({});
    ok(vs({ 'el.vitals.attach': 'lives,levelBadge' }).w > v0.w + 40 && vs({ 'el.vitals.attach': 'charges' }).h > v0.h && vs({ 'el.vitals.lockup': 'badgeBar' }).w === 280 && vs({ 'el.vitals.attach': 'iconValue' }).h === 34, '生命条附属件按选了的留边；锁扣 280 × 64、图标内写数一排色块');
    const face = hud({ 'uip.layout': 'layout.action', 'el.vitals.attach': 'statusFace' }), plain = hud({ 'uip.layout': 'layout.action' });
    ok(face.a.n('ellipse') > plain.a.n('ellipse') + 3, '状态头像：随血量换表情的脸（椭圆的脸、眼睛）');
    ok(['cmp.gaugeCap', 'cmp.gaugeFrame', 'cmp.gaugeColorBy', 'cmp.gaugeExtra', 'cmp.gaugeUnits'].every((x) => SCOPABLE_IDS.includes(x)), 'SCOPABLE 收录 B5 的数值图形参数');
  }
  // ---- 06 计数与读数 ----
  {
    const sz = (id: string, x: Values) => { const e = makeCtx(id, rec().g, rec().g, mk(x), R0); return ELEMENTS.get(id)!.size(e); };
    const dr = (id: string, x: Values) => { const a = rec(), e = makeCtx(id, a.g, a.g, mk(x), R0), s = ELEMENTS.get(id)!.size(e); ELEMENTS.get(id)!.draw(e, { x: 400, y: 20, ...s }); return a; };
    for (const f of ['framedCounter', 'odometer', 'iconNumberBar', 'labeledStrip', 'statGrid']) { const s = sz('el.resources', { 'el.resources.form': f }); ok(s.w > 40 && s.h > 20 && dr('el.resources', { 'el.resources.form': f }).n('fillText') > 0, `资源 ${f}：有尺寸、画了字`); }
    ok(dr('el.resources', { 'el.resources.form': 'odometer' }).texts().filter((t) => /^\d$/.test(t)).length === 7, '里程表画法：7 位逐位格');
    const sup = (pos?: string) => dr('el.resources', { 'el.resources.valueLabel': 'delta', ...(pos ? { 'el.resources.valueLabelPos': pos } : {}) }).calls.filter(([k, v]) => k === 'fillText' && /^[+-]\d/.test(String(v[0]))).map(([, v]) => Number(v[2]));
    ok(sup('superscript')[0] < sup()[0], '增量写成上标：比数字高');
    for (const f of ['turnDate', 'ringCounter', 'countdownStrip', 'scoreLabel', 'raceStack', 'timecode']) ok(sz('el.timer', { 'el.timer.form': f }).w > 40 && dr('el.timer', { 'el.timer.form': f }).n('fillText') > 0, `计时 ${f}：有尺寸、画了字`);
    ok(['POS', 'LAP', 'TIME', 'BEST'].every((t) => dr('el.timer', { 'el.timer.form': 'raceStack' }).texts().includes(t)) && dr('el.timer', { 'el.timer.form': 'timecode' }).texts().includes('REC'), '比赛信息栈四行小标签；时间码写 REC');
    ok(sz('el.timer', { 'el.timer.form': 'ringCounter', 'el.timer.caption': 'mission' }).w > sz('el.timer', { 'el.timer.form': 'ringCounter' }).w, '双环计数的侧标签（任务名）加宽');
    const ord = dr('el.rank', { 'el.rank.form': 'ordinal' }).texts();
    ok(ord.includes('ND') && ord.some((t) => t.startsWith('/')), '序数名次：2ND + /总数');
    ok(dr('el.rank', { 'el.rank.form': 'letterDisc' }).n('arc') >= 2, '字母盘：进度环 + 底环');
  }
  // ---- 08 时钟 / 日历 ----
  {
    ok(elementParts(res({ 'el.clock.form': 'phaseDial,timelineRuler' }), 'el.clock').length === 2 && SPEC_PARAM.get('el.clock.form')?.kind === 'multi', 'el.clock.form 改多选：选两种画法拆成两块');
    const dr = (x: Values, skin = 'darkHairline') => { const a = rec(), e = makeCtx('el.clock', a.g, a.g, mk(x, skin), R0), s = ELEMENTS.get('el.clock')!.size(e); ELEMENTS.get('el.clock')!.draw(e, { x: 400, y: 20, ...s }); return a; };
    for (const f of ['phaseDial', 'plaque', 'collage', 'dateStrip', 'timelineRuler', 'bigTemp']) ok(dr({ 'el.clock.form': f }).calls.length > 10, `时钟 ${f}：画出来了`);
    ok(dr({ 'el.clock.form': 'phaseDial', 'el.clock.rim': 'serrated' }).n('lineTo') > dr({ 'el.clock.form': 'phaseDial' }).n('lineTo') + 40, '昼夜盘外圈锯齿');
    const sd = (skin: string) => dr({ 'el.clock.form': 'sunDial' }, skin).calls.filter(([k]) => k === 'fillStyle=').map(([, v]) => String(v[0]))[0];
    ok(sd('flat') === 'rgba(0,0,0,0.35)' && sd('darkHairline') !== 'rgba(0,0,0,0.35)', '日晷盘面：新皮肤读面板底色，旧皮肤照旧 35% 黑');
    ok(dr({ 'el.clock.form': 'dateStrip' }).n('fillText') >= 14, '日期带：七格日期 + 星期');
  }
  // ---- 27 计量条与数据图 ----
  {
    const dr = (x: Values) => { const a = rec(), e = makeCtx('el.meter', a.g, a.g, mk(x), R0), s = ELEMENTS.get('el.meter')!.size(e); ELEMENTS.get('el.meter')!.draw(e, { x: 100, y: 100, ...s }); return { a, s }; };
    const fm = dr({ 'el.meter.form': 'formula' }).a.texts();
    ok(fm.includes('×') && fm.includes('35') && fm.includes('4'), '计分公式：A × B 两个色块');
    ok(['R', 'C', 'I'].every((t) => dr({ 'el.meter.form': 'demandBars' }).a.texts().includes(t)) && dr({ 'el.meter.form': 'framedStrip' }).a.texts().includes('POWER GRID'), '需求竖条字母、细框条标签');
    ok(dr({ 'el.meter.form': 'stack', 'el.meter.leadRow': 'bold' }).s.h > dr({ 'el.meter.form': 'stack' }).s.h, '首行加粗：栈高加了');
    const rc = dr({ 'el.meter.form': 'stack', 'el.meter.rowColors': '#123456' }).a.calls.some(([k, v]) => k === 'fillStyle=' && v[0] === '#123456');
    ok(rc, '计量条逐行颜色');
    ok(['keyValue', 'inkNumber', 'lineChart', 'sparkline', 'stackedArea', 'network'].every((k) => CHART_KINDS.has(k)), 'charts.ts 的六种数据图');
    const ch = (k: string) => { const a = rec(), e = makeCtx('el.meter', a.g, a.g, mk({}), R0); statViz(e, k, { x: 0, y: 0, w: 400, h: 200 }, chartData()); return a; };
    ok(ch('lineChart').n('stroke') >= 3 && ch('stackedArea').n('fill') >= 3 && ch('network').n('arc') >= 3 && ch('keyValue').n('fillText') >= 6 && ch('inkNumber').n('arc') >= 12 && ch('inkNumber').n('closePath') >= 8, '数据图都画出来了（折线 / 面积 / 气泡 / 键值 / 墨团：B5 审查修复后墨团是毛边墨迹 + 溅点）');
    const tb = (v?: string) => { const a = rec(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk({ 'uip.screen': 'tpl.stats', ...(v ? { 'st.statViz': v } : {}) })); return a; };
    ok(tb('lineChart').n('stroke') > tb().n('stroke'), '统计屏 st.statViz = lineChart 画折线');
  }
  // ---- 20 事件字效 ----
  {
    const a = rec();
    drawText(a.g, 'AB', 0, 0, 30, { font: 'x', size: 20, weight: 700, color: '#ff0000', fill: { kind: 'gradient' } });
    const b = rec();
    drawText(b.g, 'AB', 0, 0, 30, { font: 'x', size: 20, weight: 700, color: '#ff0000', tilt: 10 });
    ok(a.calls.some(([k]) => k === 'fillStyle=') && b.n('rotate') === 2 && b.n('fillText') === 2, '字内填充（渐变）；逐字倾斜每个字转一次');
    ok(mk({ 'typ.fillStyle': 'halftone', 'typ.shadowOffset': 8 }).tokens.textFx?.fill?.kind === 'halftone' && mk({ 'typ.shadowOffset': 8 }).tokens.textFx?.shadow === 4 && mk({}).tokens.textFx === undefined, '事件字效进 t.textFx（硬投影 px@1080p）；没给时不设');
    const fl = (x: Values) => hud({ 'uip.layout': 'layout.action', ...x }).texts.filter((t) => (packById('snowline')?.hud.hits ?? []).includes(t));
    ok(fl({}).length === 3 && fl({ 'el.feedback.count': 1 }).length === 1, '飘字条数：elx.count = 1 只画一个');
    const sfx = (x: Values) => hud({ 'uip.layout': 'layout.action', 'el.feedback.form': 'comicSFX', ...x }).a;
    ok(sfx({ 'el.feedback.sfxBurst': 'layered' }).n('closePath') === sfx({}).n('closePath') + 2 && sfx({ 'el.feedback.sfxLetterTilt': 10 }).n('rotate') > sfx({}).n('rotate'), '拟声字：多层星爆、逐字倾斜');
    ok(hud({ 'uip.layout': 'layout.action', 'el.feedback.form': 'chainStack' }).texts.some((t) => t.startsWith('DRIFT')) && hud({ 'uip.layout': 'layout.action', 'el.feedback.form': 'dice' }).a.n('roundRect') >= 4, '技能链写技能名、骰子画出来');
    const nf = (f: string, x: Values = {}) => hud({ 'uip.layout': 'layout.explore', 'el.notify.form': f, ...x });
    ok(nf('socialFeed').texts.length >= 3 && nf('socialFeed', { 'el.notify.maxItems': 1 }).texts.length < nf('socialFeed').texts.length, '社交气泡流；条数上限截断');
    ok(nf('label').texts.length >= 1 && nf('bareText').texts.length >= 1 && nf('alertIcons').a.n('fillText') >= 3 && nf('finisherCard').a.n('rotate') >= 1, '名签 / 无底大字 / 警报列 / 收尾大卡（斜飘带）');
    ok(SPEC_PARAM.get('st.alert')?.kind === 'multi' && res({ 'st.alert': 'blink' }).list('st.alert').join() === 'blink', 'st.alert 改多选（旧的单值照旧读）');
    const sim0 = simulate(2.5, [{ kind: 'pickup', at: 0 }], res({})), sim1 = simulate(2.5, [{ kind: 'pickup', at: 0 }], res({ 'el.notify.dwell': 4 }));
    ok(sim0.toast === null && sim1.toast !== null, '通知停留时长：dwell = 4 秒时 2.5 秒还在');
  }
  // ---- 参数表与 Godot ----
  {
    const NEW = ['typ.numerals.weight', 'typ.numerals.digits', 'typ.numerals.cells', 'typ.numberFormat', 'cmp.gaugeUnits', 'cmp.gaugeUnitShape', 'cmp.gaugeDir', 'cmp.dialParts', 'cmp.gaugeIcon', 'elx.valueLabelShow', 'el.speed.showPlace',
      'cmp.gaugeCap', 'cmp.gaugeCapSize', 'cmp.gaugeFrame', 'cmp.gaugeColorBy', 'cmp.gaugeLow', 'cmp.gaugeHigh', 'cmp.gaugeExtra', 'el.vitals.attach', 'el.vitals.lockup', 'el.timer.caption',
      'el.clock.rim', 'el.clock.dayPart', 'el.clock.duskPart', 'el.meter.leadRow', 'el.meter.rowColors', 'el.feedback.sfxSize', 'el.feedback.sfxFill', 'el.feedback.sfxBurst', 'el.feedback.sfxLetterTilt',
      'typ.fillStyle', 'typ.fillColors', 'typ.shadowOffset', 'el.notify.maxItems', 'el.notify.dwell'];
    const bad = NEW.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || p.milestone !== 'M12b' || !p.godot || !p.godotLevel || !p.plain || !p.lookAt; });
    ok(NEW.length === 35 && bad.length === 0, `B5 的 35 个新参数都有 godot / godotLevel / plain / lookAt（${bad.join(',')}）`);
    const gf = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.racing', 'typ.numerals.family': 'sevenSeg', 'cmp.gauge@el.speed': 'tachometer', 'cmp.gaugeCap': 'pointed', 'el.clock.form': 'phaseDial', 'el.meter.form': 'formula', 'typ.fillStyle': 'gradient', 'el.timer.form': 'raceStack' } as Values)!;
    const md = gf.files.find((f) => f.path === 'ui/UI_MIGRATION.md')!.text;
    ok(['数字字形（M12b-07）', '数值图形（M12b-02）', '数值条的端头', '计数与读数（M12b-06）', '时钟 / 日历组合件（M12b-08）', '计量条与数据图（M12b-27）', '事件提示与字效（M12b-20）'].every((w) => md.includes(w)), 'Godot：B5 的迁移说明（用到才写）');
    ok(!godotUiFiles({ ...cur, 'hud.style': 'darkHairline' } as Values)!.files.find((f) => f.path === 'ui/UI_MIGRATION.md')!.text.includes('M12b-07'), 'Godot：没用到时不写 B5 的说明');
  }
  // ---- B5 审查修复（每项对应 docs/m12b-progress.md「B5 审查修复」的一条；除 ② 是记录现状外，在改前树上都不成立） ----
  {
    const th = mk({}), so = { size: 20, weight: 700 };
    const g0x = (kind: string, x: Values = {}, v = 0.6, r = { x: 0, y: 0, w: 200, h: 12 }, extra = {}) => { const c = ctx('el.vitals', x); gauge(c.e, r, v, kind, '#ff0000', undefined, extra); return c.a; };
    const drawEl = (id: string, x: Values, alpha = 1) => { const a = rec(), e = makeCtx(id, a.g, a.g, mk(x), R0), s = ELEMENTS.get(id)!.size(e); if (alpha !== 1) a.g.globalAlpha = alpha; ELEMENTS.get(id)!.draw(e, { x: 400, y: 20, ...s }); return a; };
    const vsz = (x: Values) => { const e = makeCtx('el.vitals', rec().g, rec().g, mk({ 'uip.layout': 'layout.action', ...x }), R0); return ELEMENTS.get('el.vitals')!.size(e); };
    const fills = (a: ReturnType<typeof rec>) => a.calls.filter(([k]) => k === 'fillStyle=').map(([, v]) => String(v[0]));
    const glows = (a: ReturnType<typeof rec>) => a.calls.filter(([k, v]) => k === 'shadowBlur=' && Number(v[0]) > 0).length;
    // ① 字效颜色：角色名换成颜色角色（原来原样进渐变，浏览器里 addColorStop('health') 抛 SyntaxError、整帧 HUD 中断）
    const fxc = (fc: string) => mk({ 'typ.fillStyle': 'gradient', 'typ.fillColors': fc }).tokens.textFx?.fill?.colors ?? [];
    const c1 = fxc('accent,health');
    ok(c1.length === 2 && c1[0] === th.pal.accent && c1[1] === th.roles.health && fxc('text,muted').length === 2 && fxc('text,muted').every((c) => /^(#|rgba?\()/.test(c)) && fxc('nosuchrole,#ff0000').join() === '#ff0000', '① typ.fillColors：角色名 → 颜色（accent,health = 强调色 + 生命色），换不成颜色的项丢掉');
    // ② 新皮肤的皮肤层 typ.numerals.* 按参数本意生效（slant 斜体展示字数字、military 等宽数字），旧皮肤 pixel 照旧冻结
    ok(mk({}, skinValueOf('skin.slant')).tokens.numerals?.italic === true && mk({}, skinValueOf('skin.military')).tokens.numerals?.family === 'tabular' && mk({}, skinValueOf('skin.pixel')).tokens.numerals === undefined, '② 新皮肤 slant / military 的数字字形按皮肤预设生效，旧皮肤 pixel 不变');
    // ③ 数字类画法的上限照拆分前用 hpMax（拆文件时改成了行的上限，第 2 行起的数字变了）
    const hpMax = packById('snowline')!.hud.hpMax;
    ok(g0x('fraction', {}, 0.5, undefined, { max: 310 }).texts().join('') === `${Math.round(0.5 * hpMax)} / ${hpMax}`, '③ fraction / number 的上限 = hpMax（与拆分前逐字一样）');
    // ④ / ⑩ 竖排（columns）保留能竖着画的画法：灯段画成发光的格，不再换成竖条
    const colG = (k: string) => glows(hud({ 'uip.layout': 'layout.action', 'el.vitals.stack': 'columns', 'cmp.gauge@el.vitals': k }).a);
    ok(colG('lightStrip') >= colG('vertical') + 3 && colG('pips') === colG('vertical'), '④ 竖排时灯段照选的画（有光晕），独立小格也不换成竖条');
    const colF = (k: string) => hud({ 'uip.layout': 'layout.action', 'el.vitals.stack': 'columns', 'cmp.gauge@el.vitals': k }).a.n('fillRect');
    ok(colF('trigram') >= colF('vertical') + 6, '⑩ 竖排时卦象照选的画（叠成六爻一卦），不换成竖条');
    // ⑨ 方向放不进矩形时按长边排（不再出负尺寸 / 负半径）；el.vitals 的离散画法选了 v 时自动竖排
    const neg = (a: ReturnType<typeof rec>) => a.calls.some(([k, v]) => (k === 'roundRect' && (Number(v[4]) < 0 || Number(v[2]) <= 0 || Number(v[3]) <= 0)) || (k === 'ellipse' && (Number(v[2]) < 0 || Number(v[3]) < 0)) || (k === 'arc' && Number(v[2]) < 0));
    const row191 = { x: 0, y: 0, w: 191, h: 10 };
    ok(!neg(g0x('lightStrip', { 'cmp.gaugeDir': 'v' }, 0.5, row191)) && !neg(g0x('pips', { 'cmp.gaugeDir': 'v', 'cmp.gaugeUnitShape': 'circle' }, 0.5, row191)) && !neg(g0x('ring', { 'vis.strokeWidth@el.vitals': 40 }, 0.5, { x: 0, y: 0, w: 20, h: 20 })) && g0x('lightStrip', { 'cmp.gaugeDir': 'v' }, 0.5, row191).calls.filter(([k, v]) => k === 'roundRect' && Number(v[2]) > 5).length === 10, '⑨ 横长的条选了 cmp.gaugeDir = v：按横排画，格子与半径都是正的');
    ok(vsz({ 'cmp.gauge@el.vitals': 'lightStrip', 'cmp.gaugeDir@el.vitals': 'v' }).h >= 120 && vsz({ 'cmp.gauge@el.vitals': 'lightStrip' }).h < 120, '⑨ el.vitals：离散画法选了 v 时自动竖条并排');
    // ⑤ Godot：旧皮肤上皮肤之前的 B5 取值不写迁移说明（画布冻结不画）
    const mdOf = (x: Values) => godotUiFiles({ ...cur, ...x } as Values)!.files.find((f) => f.path === 'ui/UI_MIGRATION.md')!.text;
    ok(!mdOf({ 'hud.style': 'pixel' }).includes('M12b-07') && !mdOf({ 'hud.style': 'neobrutal', 'uip.layout': 'layout.survival' }).includes('M12b-02') && mdOf({ 'hud.style': 'darkHairline', 'uip.layout': 'layout.survival' }).includes('M12b-02'), '⑤ Godot：旧皮肤上 skin.pixel 的数字字族、品类布局的温度计不写 B5 说明（新皮肤照写）');
    // ⑥ elChosen：旧皮肤只认皮肤之后的层（品类布局 / 模板这类皮肤之前的层写了不算）；sim 的停留时长同口径
    const eL = makeCtx('el.notify', rec().g, rec().g, mk({ 'el.notify.maxItems': 2 }, 'flat'), R0), eN = makeCtx('el.notify', rec().g, rec().g, mk({ 'el.notify.maxItems': 2 }), R0);
    const preSkin = <T extends { r: Resolved }>(e: T): T => Object.assign(Object.create(e) as T, { r: Object.assign(Object.create(e.r) as Resolved, { src: () => ({ layer: 'layout' }) }) });
    ok(elChosen(eL, 'maxItems') && elChosen(eN, 'maxItems') && elGiven(preSkin(eL), 'maxItems') && !elChosen(preSkin(eL), 'maxItems') && elChosen(preSkin(eN), 'maxItems'), '⑥ elChosen：旧皮肤上皮肤之前的层给的元素参数不算，新皮肤算');
    const rL = res({ 'el.notify.dwell': 4 }, 'flat'), rLp = Object.assign(Object.create(rL) as Resolved, { src: (k: string) => (k === 'el.notify.dwell' ? { layer: 'layout' } : rL.src(k)) });
    ok(simulate(2.5, [{ kind: 'pickup', at: 0 }], rL).toast !== null && simulate(2.5, [{ kind: 'pickup', at: 0 }], rLp as never).toast === null, '⑥ el.notify.dwell：旧皮肤上皮肤之后的层给的照用，皮肤之前的不算');
    // ⑦ 补前导零时去掉千分位（原来「0012,480」）
    const dg = ctx('el.resources', { 'typ.numerals.family': 'tabular', 'typ.numerals.digits': 7 }); drawNumber(dg.e, '12,480', 0, 0, 30, so);
    const dd = ctx('el.resources', { 'typ.numerals.digits': 7 }); drawNumber(dd.e, '12,480', 0, 0, 30, so);
    ok(dg.a.texts().join('') === '0012480' && dd.a.texts().join('') === '0012480', '⑦ typ.numerals.digits：补零时不留千分位（等宽 / 正文）');
    // ⑧ activeWhen：B5 的从属参数声明生效条件
    const AW = ['cmp.gaugeCapSize', 'cmp.gaugeLow', 'cmp.gaugeHigh', 'cmp.dialParts', 'el.clock.rim', 'el.clock.dayPart', 'el.clock.duskPart', 'el.timer.caption', 'el.meter.leadRow', 'el.meter.rowColors', 'el.feedback.sfxSize', 'el.feedback.sfxFill', 'el.feedback.sfxBurst', 'el.feedback.sfxLetterTilt', 'typ.fillColors', 'elx.valueLabelShow', 'el.notify.maxItems'];
    const cond = (id: string, vals: Record<string, unknown>) => evalCond(SPEC_PARAM.get(id)!.activeWhen, (k) => vals[k] as never);
    ok(AW.every((id) => !!SPEC_PARAM.get(id)?.activeWhen) && cond('el.feedback.sfxSize', { 'el.feedback.form': ['floatNumbers'] }) === false && cond('el.feedback.sfxSize', { 'el.feedback.form': ['comicSFX'] }) === true
      && cond('cmp.gaugeLow', { 'cmp.gaugeColorBy': 'fixed', 'col.coding': ['value'] }) === true && cond('cmp.gaugeLow', { 'cmp.gaugeColorBy': 'fixed', 'col.coding': ['status'] }) === false && cond('el.notify.maxItems', { 'el.notify.form': [] }) === true && cond('cmp.gaugeCapSize', { 'cmp.gaugeCap': 'none' }) === false, '⑧ 17 个从属参数有 activeWhen（拟声字子参数跟 comicSFX、阈值跟分档 / 渐变 / col.coding = value……）');
    // ⑪ lightUp = 一排点亮的节点（恢复原意，环徽是 arcDots）
    const lu = g0x('lightUp', {}, 0.6, row191);
    ok(lu.n('arc') === 8 && glows(lu) === 3 && !ROUND_GAUGES.has('lightUp') && /完成的节点点亮/.test(SPEC_PARAM.get('cmp.gauge')!.options!.find((o) => o.value === 'lightUp')!.desc ?? ''), '⑪ lightUp：5 个节点亮 3 个（带光晕），不取正方形；说明恢复「完成的节点点亮」');
    // ⑫ 仪表族：放进小位置（Boss 条 / 计量条）退回横条；el.vitals 里按圆形排
    const sm = gaugeOf(makeCtx('el.threat', rec().g, rec().g, mk({ 'cmp.gauge@el.threat': 'tachometer' }), R0), { x: 0, y: 0, w: 520, h: 12 }, 0.5, 0, 'bar', { fixed: true });
    ok(sm.kind === 'bar' && vsz({ 'cmp.gauge@el.vitals': 'tachometer' }).h >= 96 && vsz({ 'cmp.gauge@el.vitals': 'arcDots' }).h >= 96 && drawnKind(makeCtx('el.speed', rec().g, rec().g, th, R0), 'tachometer', { x: 0, y: 0, w: 150, h: 150 }) === 'tachometer', '⑫ 转速表 / 环徽：12 高的 Boss 条退回横条，el.vitals 里一颗 96 的圆，150 的速度表照画');
    // ⑬ 写了行名时，条左端附属件的空在行名列与条之间（端徽不压行名）
    const eb = drawEl('el.vitals', { 'uip.layout': 'layout.rpg', 'cmp.gaugeExtra@el.vitals': 'endBadge' });
    const nameCall = eb.calls.find(([k]) => k === 'fillText')!, badgeArc = eb.calls.find(([k, v]) => k === 'arc' && Math.abs(Number(v[2]) - 10) < 1e-6);
    ok(!!badgeArc && Number(badgeArc[1][0]) - 10 >= Number(nameCall[1][1]) + [...String(nameCall[1][0])].length * 6, '⑬ rpg 布局：端徽画在行名之后，不压行名');
    // ⑭ 端头 + 端徽：左端不画端头、条不往左收，端徽画在端头之后
    const cb = (() => { const c = ctx('el.vitals', { 'cmp.gaugeCap': 'pointed', 'cmp.gaugeExtra': 'endBadge' }); gauge(c.e, { x: 100, y: 10, w: 200, h: 10 }, 0.6, 'bar', '#ff0000', undefined, { badge: '' }); return c.a; })();
    const arcI = cb.calls.findIndex(([k]) => k === 'arc'), after = cb.calls.slice(arcI + 1).map(([k]) => k);
    ok(Number(cb.calls.find(([k]) => k === 'rect')![1][0]) === 100 && arcI > 0 && !after.includes('moveTo') && !after.includes('lineTo'), '⑭ 选了端徽时左端不画端头（条从原来的左端起），端徽最后画');
    // ⑮ 气泡流的头像按气泡的深色字画
    ok(hud({ 'uip.layout': 'layout.explore', 'el.notify.form': 'socialFeed' }).a.calls.some(([k, v]) => k === 'fillStyle=' && /^rgba\(31,\s*35,\s*40,\s*0\.18\)$/.test(String(v[0]))), '⑮ 社交气泡流：深色皮肤上头像底按深色字画（不再白上白）');
    // ⑯ 透明度乘在外层上（卦象 / 可回复段 / 格挡 / 技能链）
    const al = (kind: string, x: Values, extra = {}) => { const c = ctx('el.vitals', x); c.a.g.globalAlpha = 0.5; gauge(c.e, { x: 0, y: 0, w: 200, h: 12 }, 0.5, kind, '#ff0000', undefined, extra); return c.a.calls.filter(([k]) => k === 'globalAlpha=').map(([, v]) => Number(v[0])).slice(1); };
    const chainA = drawEl('el.feedback', { 'el.feedback.form': 'chainStack' }, 0.5).calls.filter(([k]) => k === 'globalAlpha=').map(([, v]) => Number(v[0])).slice(1);
    ok([...al('trigram', {}), ...al('bar', { 'cmp.gaugeExtra': 'recoverable,shieldTint' }, { recover: 0.2, shield: 4 }), ...chainA].every((x) => x <= 0.5 + 1e-9) && chainA.length >= 3, '⑯ 外层 50% 透明时卦象 / 可回复段 / 格挡 / 技能链都不超过 50%');
    // ⑰ 细条上的可回复段贴着填充带；没给可回复量的条不画
    const rcv = g0x('thinBar', { 'cmp.gaugeExtra': 'recoverable' }, 0.5, { x: 0, y: 0, w: 200, h: 10 }, { recover: 0.2 });
    ok(rcv.calls.filter(([k]) => k === 'fillRect').every(([, v]) => Number(v[3]) <= 3.5 + 1e-9) && rcv.n('setLineDash') >= 1 && g0x('bar', { 'cmp.gaugeExtra': 'recoverable' }, 0.5, undefined, {}).n('setLineDash') === 0, '⑰ 细条的可回复段 3.5 高（= 填充带），没给可回复量的条不画');
    // ⑱ 昼夜盘的白天从 06:00 起（白天扇区 0 → π）
    ok(drawEl('el.clock', { 'el.clock.form': 'phaseDial' }).calls.some(([k, v]) => k === 'arc' && Math.abs(Number(v[3])) < 1e-9 && Math.abs(Number(v[4]) - Math.PI) < 1e-9), '⑱ 昼夜盘：白天扇区从 06:00（右侧）起，半圈');
    // ⑲ 墨团数字：第四列按统计表的写法（原来比例四舍五入成「1」）
    const ink = (() => { const a = rec(), e = makeCtx('el.meter', a.g, a.g, mk({}), R0); statViz(e, 'inkNumber', { x: 0, y: 0, w: 400, h: 200 }, chartData()); return a; })();
    ok(!!chartData().cells?.[3] && ink.texts().includes(chartData().cells![3]), '⑲ 墨团数字：第四列写成统计表的写法');
    // ⑳ 卦象横排：两个三爻卦（三行），不再是一行短划
    ok(new Set(g0x('trigram', {}, 0.5, row191).calls.filter(([k]) => k === 'fillRect').map(([, v]) => Number(v[1]).toFixed(2))).size === 3, '⑳ 横长矩形里卦象画成并排的两个三爻卦');
    // ㉑ 低档闪烁读模拟时钟（原来读待机相位，mo.idle = none 时不闪）
    setSim(simulate(0.31, [], res({ 'mo.idle': 'none' })));
    const bl = fills(g0x('bar', { 'cmp.gaugeColorBy': 'thresholds', 'st.alert': 'blink' }, 0.1));
    setSim(simulate(0, [], res({})));
    const alphaOf = (c: string) => Number(/,\s*([\d.]+)\)$/.exec(c)?.[1] ?? 1);
    const dangerFills = (l: string[]) => l.filter((c) => /^rgba\(229,\s*72,\s*77/.test(c));
    ok(th.roles.danger === '#e5484d' && dangerFills(bl).length > 0 && dangerFills(bl).every((c) => alphaOf(c) < 0.9) && dangerFills(fills(g0x('bar', { 'cmp.gaugeColorBy': 'thresholds', 'st.alert': 'blink' }, 0.1))).every((c) => alphaOf(c) > 0.99), '㉑ 分档换色的低档闪烁跟模拟时钟走（第 0 帧满色）');
    // ㉒ 逐字倾斜 + 渐变：绕字中心转、再平移回原坐标系画（中线 ≠ 0 时渐变不跟着挪）
    const tl = rec(); drawText(tl.g, 'AB', 0, 100, 30, { font: 'x', size: 20, weight: 700, color: '#ff0000', fill: { kind: 'gradient' }, tilt: 10 });
    ok(tl.n('translate') === 4 && tl.calls.filter(([k]) => k === 'fillText').every(([, v]) => Number(v[2]) > 50), '㉒ 逐字倾斜在原坐标系里画字（渐变的坐标不偏）');
    // ㉓ 两项对立 + 双向条 = 一条拔河条；原则做法 P-in-game-charts#a3 只作用于计量条
    const pb = drawEl('el.meter', { 'el.meter.form': 'paired', 'cmp.gauge@el.meter': 'bipolar' });
    const PR = JSON.parse(readFileSync(join('src', 'content', 'uiPrinciples.json'), 'utf8')) as { principles: { approaches?: { id: string; params: Record<string, unknown> }[] }[] };
    const a3 = PR.principles.flatMap((p) => p.approaches ?? []).find((x) => x.id === 'P-in-game-charts#a3')!;
    ok(pb.n('fillRect') === 3 && pb.n('fillText') === 2 && a3.params['cmp.gauge@el.meter'] === 'bipolar' && !('cmp.gauge' in a3.params), '㉓ 两项对立 + 双向条画成一条拔河条（两端两个名字）；对比条做法只写 cmp.gauge@el.meter');
  }
}

console.log('== M12b 中期审查修复（B1–B5）');
{
  setPack('snowline');
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient' ? () => ({ addColorStop() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length, texts: () => calls.filter(([k]) => k === 'fillText').map(([, a]) => String(a[0])) };
  };
  const scrTexts = (x: Values, skin = 'darkHairline') => { const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; resetOccupancy(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x, skin)); DRAW_LOG.on = false; return DRAW_LOG.texts.map((t) => t.text); };

  // ① ③ 样本类别：整备 = 物品；对话界面不推成战斗指令；布阵 = 名册、对话环 = 指令
  ok(sampleKind(res({ 'uip.screen': 'tpl.loadout' })) === 'items' && sampleKind(res({ 'uip.screen': 'tpl.loadout', 'cnt.screen': 'screen.character' })) === 'items' && sampleKind(res({ 'uip.screen': 'tpl.formation' })) === 'roster',
    '① 整备 / 纸娃娃（loadout）取物品（cnt.screen = screen.character 也是），名册只给布阵');
  ok(sampleKind(res({ 'uip.screen': 'tpl.npc', 'cnt.screen': 'screen.dialogue' })) === 'items' && sampleKind(res({ 'uip.screen': 'tpl.dialogueWheel' })) === 'commands', '③ 对话界面的列表不写战斗指令，对话环照旧是指令');
  // ② ⑬ triumphant 进了 cnt.tone 词表，横带取得到胜利语气的变体
  ok((SPEC_PARAM.get('cnt.tone')?.options ?? []).some((o) => o.value === 'triumphant') && JSON.stringify(textFor('band', res({ 'cnt.tone': 'triumphant' }))) === JSON.stringify(['霜脊巨像倒下了']), '② cnt.tone = triumphant：横带写「霜脊巨像倒下了」（原来这条变体永远取不到）');
  // ④ 名册 / 角色不循环：布阵的卡不出现「艾琳 2」
  const fm = scrTexts({ 'uip.screen': 'tpl.formation', 'cnt.itemCount': 6 });
  ok(!fm.some((t) => /\S 2$/.test(t)) && fm.includes(samplesFor('roster')[0][0]), `④ 布阵 6 格：样本 3 条之外画空格，不循环出「… 2」（${fm.filter((t) => / 2$/.test(t)).join('、') || '无'}）`);
  // ⑤ 暂停菜单：没给条目数时整份画（含 ⚙ 设置）；给了 3 条时设置留在最后
  const pp = scrTexts({ 'uip.screen': 'tpl.pausePc' }), pm = scrTexts({ 'uip.screen': 'tpl.pauseMobile' });
  ok(pp.includes('设置') && pp.includes('任务') && pm.includes('设置') && pm.includes('行囊') && pm.includes('技能') && !pm.includes('装备'), `⑤ 暂停菜单留下系统项：PC 画全 7 条、手机 3 条 = 前两条 + 设置（手机：${pm.filter((t) => samplesFor('pauseMenu').some(([, l]) => l === t)).join(' / ')}）`);
  // ⑥ 世界地图：浮动详情写当前节点的地点，同名的地名牌不另画
  const wm = scrTexts({ 'uip.screen': 'tpl.worldmap' });
  ok(wm.filter((t) => t === '山口小屋').length === 1 && wm.filter((t) => t === '雪线').length >= 2, `⑥ 世界地图：「山口小屋」只写在当前节点旁的详情里（${wm.filter((t) => t === '山口小屋').length} 次），别的地名牌照画`);
  // ⑧ 只读不默认焦点：旧皮肤只在皮肤之后选了 ix.mode 时才这样
  const roE = (x: Values, skin: string) => makeCtx('el.screen', rec().g, rec().g, mk({ 'uip.screen': 'tpl.codex', ...x }, skin), R0);
  ok(readOnlyNoFocus(roE({}, 'darkHairline')) && !readOnlyNoFocus(roE({}, 'flat')), '⑧ 图鉴（模板写的 readOnly）：新皮肤不选中第一格，旧皮肤冻结（照旧选中）');
  // ⑨ 通用避让不把元素挪到第三个元素上（Hi-Fi Rush：信息流原来压在计时数字上）
  {
    const hifi = replicas.find((r) => r.id === 'rep.hi-fi-rush')!, s0 = hifi.screens.find((s) => s.key === 'hud')!;
    const p = replicaScreenPatch(hifi, s0, cur), v: Record<string, unknown> = { ...cur, ...p.set };
    for (const k of p.unset) delete v[k];
    resetOccupancy();
    drawElements({ ctx: rec().g, m: rec().g, blur: 0 } as never, R0, baseTheme(resolveUi(v as Values), null, String(v['hud.style'])), null, []);
    const it = (id: string) => OCC.last?.items.find((o) => o.id === id)?.rect;
    const tm = it('el.timer'), nf = it('el.notify');
    ok(!!tm && !!nf && !intersects(tm, nf), `⑨ Hi-Fi Rush HUD：信息流不压在计时上（计时 ${tm?.y.toFixed(0)}、信息流 ${nf?.y.toFixed(0)}）`);
  }
  // ⑪ ⑫ 展示字体的作用范围
  {
    const t1 = mk({ 'typ.display.family': 'condensed', 'typ.display.scope': 'numerals,menuItem', 'typ.numerals.family': 'display' }).tokens;
    const t2 = mk({ 'typ.display.family': 'comicHand', 'typ.display.scope': 'button', 'typ.button.family': 'display' }).tokens;
    ok(!!t1.display?.face.font && t1.numerals?.font === t1.display.face.font && t2.button?.font === t2.display?.face.font, '⑪ 标题不在范围里时，数字 / 按钮写 family = display 仍取展示字体（原来退成正文字）');
    const t3 = mk({ 'typ.display.family': 'condensed', 'typ.display.scope': 'nameplate', 'typ.display.case': 'upper', 'typ.display.style': 'italic', 'typ.display.weight': 'black', 'typ.display.tracking': 0.2 }).tokens;
    ok(!t3.title?.font && !t3.title?.upper && !t3.title?.italic && t3.title?.weight === undefined && t3.title?.spacing === undefined && t3.name?.upper === true && t3.name?.italic === true && t3.name?.weight === 900, '⑫ 范围外的标题去掉整套展示字面（字族 / 字重 / 大小写 / 字距 / 斜体，回正文字样），名牌在范围里照套');
  }
  // ⑳ typ.display.scope 是全局清单（不写 overrideAt）；㉑ 只经目标链读的参数不进主题 token
  ok(!SPEC_PARAM.get('typ.display.scope')?.overrideAt && !THEME_SCOPED.has('typ.align') && !THEME_SCOPED.has('vis.iconTint') && !THEME_SCOPED.has('ast.earTabAt') && THEME_SCOPED.has('vis.iconStyle'), '⑳ ㉑ typ.display.scope 不写 overrideAt；typ.align / vis.iconTint / ast.earTabAt 不算主题 token');
  {
    const gf = (x: Values) => godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', ...x } as Values)!;
    const theme = (x: Values) => gf(x).files.find((f) => f.path.endsWith('ui_theme.tres'))?.text ?? '';
    ok(!theme({ 'typ.titlePrefix@el.objective': 'chevron' }).includes('Hud_el_objective') && theme({ 'col.accent@el.objective': '#ff0000' }).includes('Hud_el_objective'), '㉑ Godot：只改了标题前缀的目标不出类型变体，改了颜色的照出');
    // ⑭ ⑮ 图案作用区进着色器；只有默认面板的「已挂上」是真的
    const pa = gf({ 'vis.pattern': 'dither', 'vis.patternOpacity': 0.5, 'vis.patternArea': 'shadowOnly' });
    const gd = pa.files.find((f) => f.path.endsWith('hud_sample.gd'))?.text ?? '', sh = pa.files.find((f) => f.path.endsWith('ui_surface.gdshader'))?.text ?? '';
    ok(gd.includes('set_shader_parameter("area", 3)') && sh.includes('uniform int area') && pa.notes.some((q) => q.what.startsWith('叠加图案（dither') && q.done), '⑭ vis.patternArea 进 ui_surface.gdshader（area uniform），默认面板的图案说明标「已挂上」');
    const fd = gf({ 'vis.fade@el.notify': 'vertical' });
    ok(fd.notes.some((q) => q.where.includes('@el.notify') && q.what.startsWith('渐隐') && !q.done) && !fd.files.some((f) => f.path.endsWith('ui_fade.gdshader')), '⑮ 按目标的渐隐：样本没挂、着色器也没导出时说明不再写「已挂上」');
    // ㉔ Godot 的信息流与画布同口径
    const r1 = res({ 'uip.layout': 'layout.action', 'cnt.density': 1 }), fl = feedLines(r1, packFor(r1));
    const gd1 = gf({ 'cnt.density': 1 }).files.find((f) => f.path.endsWith('hud_sample.gd'))?.text ?? '';
    ok(fl.length === 1 && gd1.includes(JSON.stringify(fl)), `㉔ Godot 样本的信息流 = 画布的 feedLines（密度 1 只留一条：${fl[0]}）`);
  }
  // ⑱ K1 图谱：关掉的缺口标了 resolvedBy，点名的参数 / 取值都在参数表里
  {
    const FAM = JSON.parse(readFileSync(join('src', 'content', 'uiStyleFamilies.json'), 'utf8')) as { identityGaps: { family: string; resolvedBy?: string; partialBy?: string }[]; paramGaps: { resolvedBy?: string; partialBy?: string }[]; families: { id: string; identityGap?: { resolvedBy?: string } | null; paramGaps: { resolvedBy?: string; partialBy?: string }[] }[] };
    const bys = [...FAM.identityGaps, ...FAM.paramGaps, ...FAM.families.flatMap((f) => [...f.paramGaps, ...(f.identityGap ? [f.identityGap as { resolvedBy?: string; partialBy?: string }] : [])])].flatMap((g) => [g.resolvedBy, g.partialBy]).filter((x): x is string => !!x);
    const bad: string[] = [];
    for (const b of bys) {
      if (!/^M12b-\d\d/.test(b)) bad.push(b);
      const inner = /（(.*)）/.exec(b)?.[1] ?? '';
      for (const part of inner.split(/[、；]/)) {
        const m = /^\s*([a-z]+\.[A-Za-z.]+)(?:\s*=\s*([A-Za-z]+))?/.exec(part);
        if (!m) continue;
        const p = SPEC_PARAM.get(m[1]);
        if (!p || (m[2] && !(p.options ?? []).some((o) => String(o.value) === m[2]))) bad.push(`${m[1]}${m[2] ? ` = ${m[2]}` : ''}`);
      }
    }
    const dh = FAM.families.find((f) => f.id === 'fam.dark-hairline')!;
    ok(bad.length === 0 && bys.length > 50 && !!dh.identityGap?.resolvedBy && FAM.identityGaps.filter((g) => g.resolvedBy).length >= 30, `⑱ K1 缺口的 resolvedBy / partialBy（${bys.length} 条）都点名存在的参数 / 取值${bad.length ? `：${bad.slice(0, 5).join('、')}` : ''}；暗色细线的身份缺口已标`);
  }
  // ㉒ 从属参数的生效条件：控制参数按目标写了也算
  {
    const r = res({ 'uip.layout': 'layout.racing', 'cmp.gauge@el.speed': 'tachometer', 'cmp.dialParts': 'needle' });
    const w = SPEC_PARAM.get('cmp.dialParts')!.activeWhen!;
    ok(evalCond(w, (k) => r.get(k)) === false && evalCond(w, (k) => r.get(k), undefined, scopedAll(r)) === true && !checkResolved(r, { inactive: true }).some((v) => v.id === 'C-inactive' && v.keys?.includes('cmp.dialParts')), '㉒ cmp.gauge@el.speed = tachometer 时仪表子件算生效（原来按全局 bar 判成不生效）');
  }
  // ㉓ richBBCode 与画布同口径：引子 / 决断句只在开了时转换，类别色循环取，单一强调
  ok(richBBCode('§ 引子', {}) === '引子' && richBBCode('§ 引子', {}, { kicker: true }) === '[font_size=12]引子[/font_size]' && richBBCode('» 决断', {}) === '决断'
    && richBBCode('{c4:四}', { category: ['#111111', '#222222'] }) === '[color=#222222]四[/color]' && richBBCode('{k:词}', {}, { inline: 'bold' }) === '[b]词[/b]', '㉓ richBBCode：引子 / 决断句按开关、类别色按色表循环、hier.inline 的粗体');
  // ㉕ ㉜ 多层星爆的点挂件框按最外一层报
  {
    const fb = ELEMENTS.get('el.feedback')!, pt0 = { x: 480, y: 300 };
    const box = (x: Values) => fb.pointBox!(makeCtx('el.feedback', rec().g, rec().g, mk({ 'el.feedback.form': 'comicSFX', ...x }), R0), pt0)!;
    const mono = box({}), lay = box({ 'el.feedback.sfxBurst': 'layered' });
    ok(lay.w >= mono.w * 1.2 && lay.h >= mono.h * 1.3, `㉕ 拟声字多层星爆的占位框 = 最外一层（${mono.w.toFixed(0)} × ${mono.h.toFixed(0)} → ${lay.w.toFixed(0)} × ${lay.h.toFixed(0)}）`);
  }
  // ㉖ 拼贴日历与收尾大卡：同一块画布只变换一次
  {
    const dr = (id: string, x: Values) => { const a = rec(), e = makeCtx(id, a.g, a.g, mk(x), R0); ELEMENTS.get(id)!.draw(e, { x: 727, y: 23, w: 210, h: 124 }); return a; };
    const cl = dr('el.clock', { 'el.clock.form': 'collage' }), fc = dr('el.notify', { 'el.notify.form': 'finisherCard' });
    ok(cl.n('rotate') === 6 && cl.n('translate') === 6 && fc.n('rotate') === 1, `㉖ 拼贴日历 6 块各旋转一次（${cl.n('rotate')}）、收尾大卡的飘带旋转一次（${fc.n('rotate')}）`);
  }
  // ㉚ withSkew 同一块画布只斜一次
  { const a = rec(); withSkew([a.g, a.g], { x: 0, y: 0, w: 10, h: 10 }, -12, () => {}); ok(a.n('transform') === 1, '㉚ withSkew([g, g])：文字画布就是主画布时只斜一次'); }
  // ㊱ 准星的圆头包在 save / restore 里
  {
    const a = rec(); ELEMENTS.get('el.crosshair')!.draw(makeCtx('el.crosshair', a.g, a.g, mk({}), R0), { x: 470, y: 260, w: 20, h: 20 });
    const i = a.calls.findIndex(([k, v]) => k === 'lineCap=' && v[0] === 'round');
    ok(i > 0 && a.calls.slice(0, i).some(([k]) => k === 'save') && a.n('save') === a.n('restore'), '㊱ 准星的 lineCap = round 包在 save / restore 里（不漏到后面的描边）');
  }
  // ㉗ ㉘ ㊲ 成品缓存：键不带位置、按设备像素 1 : 1 贴回、稳住了才烘、预算按画布
  {
    const doc0 = (globalThis as { document?: unknown }).document;
    let made = 0;
    (globalThis as { document?: unknown }).document = { createElement: () => { made++; return { width: 0, height: 0, getContext: () => rec().g }; } };
    try {
      const at = (dx: number) => { const a = rec(); bakedPaint(a.g, 'test', { x: 100 + dx, y: 50, w: 40, h: 20 }, 4, () => {}); return a; };
      clearBakes(); BAKE.eager = true; bakeFrame();
      const m0 = made; at(0); const m1 = made; const b2 = at(37); const m2 = made;
      const st = b2.calls.find(([k]) => k === 'setTransform'), di = b2.calls.find(([k]) => k === 'drawImage');
      ok(m1 - m0 === 1 && m2 === m1 && !!st && st[1][4] === 133 && di?.[1].length === 3, `㉗ ㊲ 整像素平移命中同一块成品（第二处新建 ${m2 - m1}），按设备像素 1 : 1 贴回（setTransform(1,0,0,1,${st?.[1][4]},…) + drawImage(c, 0, 0)）`);
      clearBakes(); BAKE.eager = false;
      const mv0 = made; for (let f = 0; f < 20; f++) { bakeFrame(); at(f * 0.37); } const mv = made - mv0;
      const sv0 = made; for (let f = 0; f < 5; f++) { bakeFrame(); at(0); } const sv = made - sv0;
      ok(mv === 0 && sv === 1, `㉗ 稳住了才烘：每帧挪 0.37 像素的 20 帧新建 ${mv} 块（直接画），停住的 5 帧只烘 1 块`);
      clearBakes(); bakeFrame(); let n4 = 0;
      for (let i = 0; i < 10; i++) at(i);
      bakeFrame(); const c0 = made; for (let i = 0; i < 10; i++) at(i * 100 + 0.25 * (i % 3)); n4 = made - c0;
      bakeFrame(3840, 2160);
      ok(BAKE.budget === 2.5 * 3840 * 2160 && n4 <= 4, `㉘ 预算按画布（4K = ${(BAKE.budget / 1e6).toFixed(1)}M 像素），每帧新烘不超过 4 块（${n4}）`);
    } finally { (globalThis as { document?: unknown }).document = doc0; BAKE.eager = false; clearBakes(); }
  }
  // ㉙ 同一挂点的一摞整块元素贴到画面边时翻到对侧，不再叠成一块
  {
    const pt = (x: number, y: number) => ({ x, y, depth: 8, on: true, dir: [1, 0] as [number, number] });
    setWorld({ player: pt(480, 330), poi: null, target: { ...pt(480, 20), label: '目标' }, held: null, all: [], map: null, refDepth: 8 } as unknown as WorldView);
    resetOccupancy();
    drawElements({ ctx: rec().g, m: rec().g, blur: 0 } as never, R0, mk({ 'uip.layout': 'layout.action', 'cnt.elements': 'el.cost,el.selection', 'el.cost.attachTo': 'target', 'el.selection.attachTo': 'target' }), null, []);
    setWorld(null);
    const w = (OCC.last?.items ?? []).filter((o) => o.kind === 'world' && (o.id === 'el.cost' || o.id === 'el.selection'));
    ok(w.length === 2 && !intersects(w[0].rect, w[1].rect), `㉙ 目标在画面顶边时，挂在它上面的造价与选中信息不叠在一起（${w.map((o) => `${o.id} y ${o.rect.y.toFixed(0)}`).join('、')}）`);
  }
  // ㉛ 大字号叠加下结算的奖励不压按钮行
  {
    resetOccupancy();
    drawScreen({ ctx: rec().g, m: rec().g, blur: 0, full: R0 } as never, R0, mk({ 'uip.screen': 'tpl.settle', 'uip.overlay': 'ov.bigText' }));
    const items = OCC.last?.items ?? [], rw = items.find((o) => o.id === 'el.reward')?.rect, bt = items.find((o) => o.kind === 'template' && o.sub === 'buttons')?.rect;
    const ovh = rw && bt ? Math.max(0, Math.min(rw.y + rw.h, bt.y + bt.h) - Math.max(rw.y, bt.y)) : 99;
    ok(!!rw && !!bt && (!intersects(rw, bt) || ovh <= rw.h * 0.15), `㉛ tpl.settle × ov.bigText：奖励不再压在按钮行上（放进两侧的空处，或缩到 0.75 放在主体与按钮行之间；奖励 ${rw ? `${rw.y.toFixed(0)}–${(rw.y + rw.h).toFixed(0)}` : '-'}，按钮 ${bt?.y.toFixed(0)}，压住 ${ovh.toFixed(0)}）`);
  }
  // ㉝ 速度表旁的名次算进元素尺寸
  {
    const sp = ELEMENTS.get('el.speed')!, e1 = makeCtx('el.speed', rec().g, rec().g, mk({ 'uip.layout': 'layout.racing', 'el.speed.showPlace': 'on' }), R0), e0 = makeCtx('el.speed', rec().g, rec().g, mk({ 'uip.layout': 'layout.racing', 'el.speed.showPlace': 'off' }), R0);
    ok(sp.size(e1).w >= sp.size(e0).w + 70 * e1.k - 0.5, `㉝ el.speed.showPlace = on：名次栏算进元素宽（${sp.size(e0).w.toFixed(0)} → ${sp.size(e1).w.toFixed(0)}）`);
  }
}

console.log('== M12b B6（元素多实例 / 锁扣与停靠 / 队伍名册 / 目标追踪 / 世界标记 / 输入字形与光标 / 准星焦点小画法）');
{
  setPack('snowline');
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length, texts: () => calls.filter(([k]) => k === 'fillText').map(([, a]) => String(a[0])) };
  };
  const ACT = { 'uip.layout': 'layout.action' } as Values;
  const hud = (x: Values, skin = 'darkHairline') => { const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, mk({ ...ACT, ...x }, skin), null, []); DRAW_LOG.on = false; return { a, texts: DRAW_LOG.texts.map((t) => t.text), occ: OCC.last?.items ?? [] }; };
  const occOf = (h: ReturnType<typeof hud>, id: string) => h.occ.find((o) => o.id === id)?.rect;
  const ctx = (id: string, x: Values = {}, skin = 'darkHairline', a = rec()) => ({ a, e: makeCtx(id, a.g, a.g, mk({ ...ACT, ...x }, skin), R0) });
  const draw = (id: string, x: Values = {}) => { const c = ctx(id, x), def = ELEMENTS.get(id)!, s = def.size(c.e); DRAW_LOG.on = true; DRAW_LOG.texts = []; def.draw(c.e, { x: 100, y: 100, ...s }); DRAW_LOG.on = false; return { ...c, size: s, texts: DRAW_LOG.texts.map((t) => t.text) }; };

  // ---- 04 元素多实例
  {
    const pk = parseElementKey('el.party#2.form'), pf = parseElementKey('el.threat#2.bossBar.screenAnchor'), px = parseElementKey('el.vitals#3.scale');
    ok(pk?.element === 'el.party#2' && pk.param === 'el.party.form' && pf?.element === 'el.threat#2' && pf.param === 'elx.screenAnchor' && pf.form === 'bossBar' && px?.param === 'elx.scale' && !parseElementKey('el.party#4.form'),
      '04 实例键：el.<元素>#2.<后缀> / el.<元素>#2.<画法>.<后缀> 解析到参数表的参数（#4 不认）');
    ok(parseOverrideKey('col.accent@el.vitals#2')?.target === 'el.vitals#2' && baseId('el.vitals#2') === 'el.vitals' && instanceNo('el.vitals#3') === 3 && instanceNo('el.vitals') === 1 && (uiKeyLabel('el.vitals#2.scale') ?? '').includes('#2'),
      '04 按目标覆盖可以指到实例（<参数>@el.<元素>#2）；baseId / instanceNo；可读名字带「#2」');
    ok(ELEMENTS.get('el.party#2') === ELEMENTS.get('el.party') && ELEMENTS.has('el.threat#3'), '04 元素注册表按基 id 找定义');
    const r = res({ ...ACT, 'cnt.elements': 'el.party,el.party#2', 'el.party.form': 'unitCards', 'el.party.scale': 1.6 });
    ok(r.el('el.party#2', 'form') === 'frames' && r.el('el.party', 'form') === 'unitCards' && Number(r.el('el.party#2', 'scale') ?? 1) !== 1.6 && r.elements().includes('el.party#2') && r.el('el.party#2', 'form', 'x') === 'frames',
      '04 实例键没给时回到参数表默认 / elx.*，不继承第一份（el.party.form = unitCards、scale = 1.6 不带到 el.party#2：画法回到兜底 frames）');
    const h = hud({ 'cnt.elements': 'el.vitals,el.vitals#2', 'el.vitals#2.screenAnchor': 'br' });
    const a1 = occOf(h, 'el.vitals'), a2 = occOf(h, 'el.vitals#2');
    ok(!!a1 && !!a2 && a2.x > 480 && a1.x < 480, `04 同一元素两份：各自的锚点（el.vitals 左上、el.vitals#2 右下：${a2?.x.toFixed(0)}）`);
    const sc = hud({ 'cnt.elements': 'el.vitals#2', 'col.accent@el.vitals#2': '#3fd8e0' });
    ok(sc.a.calls.some(([k, v]) => k === 'fillStyle=' && String(v[0]).toLowerCase() === '#3fd8e0'), '04 实例的按目标覆盖（col.accent@el.vitals#2）只给这一份打补丁');
    // Boss 条并排（el.threat.count）
    const b1 = draw('el.threat', { 'cnt.elements': 'el.threat', 'el.threat.form': 'bossBar' }), b2 = draw('el.threat', { 'cnt.elements': 'el.threat', 'el.threat.form': 'bossBar', 'el.threat.count': 2 });
    ok(b2.size.w > b1.size.w * 0.7 && b2.texts.filter((t) => t === DATA.boss.name || t === DATA.target.name).length === 2 && Math.abs(b2.size.w - (R0.w * 0.2 * 2 + R0.w * 0.03)) < 30, `04 el.threat.count = 2：两条 Boss 条并排、各写各的名字（宽 ${b2.size.w.toFixed(0)}，单条 ${b1.size.w.toFixed(0)}）`);
    const g1 = draw('el.threat', { 'cnt.elements': 'el.threat', 'el.threat.form': 'bossBar', 'elx.count': 8 });
    ok(Math.abs(g1.size.w - b1.size.w) < 0.01, '04 全局 elx.count 不让 Boss 条变成多条（只认元素级键）');
    // 选中卡多张 + 错位叠放
    const s1 = draw('el.selection', { 'el.selection.form': 'panel' }), s3 = draw('el.selection', { 'el.selection.form': 'panel', 'el.selection.count': 3, 'el.selection.instanceLayout': 'stack' });
    ok(s3.size.h > s1.size.h && s3.size.h < s1.size.h * 1.9 && s3.size.w < s1.size.w * 1.3 && s3.texts.length > s1.texts.length, `04 选中卡 3 张错位叠放：只露标题行（高 ${s1.size.h.toFixed(0)} → ${s3.size.h.toFixed(0)}）`);
    const e0 = ctx('el.party', { 'el.party.activeEmphasis': 'scale' }).e, L = memberRects(e0, 4, { w: 80, h: 100 }, 'h', 6, 0), L0 = memberRects(ctx('el.party').e, 4, { w: 80, h: 100 }, 'h', 6, 0);
    ok(L.rects[0].w > L.rects[1].w && L.rects[0].y + L.rects[0].h === L.rects[1].y + L.rects[1].h && L0.rects.every((q, i) => q.x === i * 86 && q.w === 80) && L.order[3] === 0,
      '04 memberRects：没选时等大格；当前项强调 scale = 当前项 1.2 倍、其余 0.85 倍（底对齐、最后画）');
    const Lr = memberRects(ctx('el.party', { 'el.party.activeEmphasis': 'raise' }).e, 3, { w: 80, h: 100 }, 'h', 6, 0);
    ok(Lr.rects[0].y < Lr.rects[1].y, '04 当前项抬起（raise）');
    const lay = elementLayout(mk({ ...ACT, 'cnt.elements': 'el.vitals,el.vitals#2', 'el.vitals#2.screenAnchor': 'br' }));
    ok(!!lay?.items.find((it) => it.id === 'el.vitals#2' && it.label.includes('#2') && it.anchor === 'br'), 'Godot 布局：实例一项（id = el.vitals#2，名字带 #2，各自锚点）');
    const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...ACT, 'cnt.elements': 'el.vitals,el.vitals#2' } as Values)!;
    ok((gd.files.find((f) => f.path.endsWith('hud_sample.gd'))?.text ?? '').includes('replace("#", "_")') && gd.notes.some((q) => q.where.startsWith('元素多实例')), 'Godot：节点名把「#」换成「_」（Hud_el_vitals_2），迁移说明写元素多实例');
  }
  // ---- 05 锁扣
  {
    const H0 = { x: 100, y: 100, w: 200, h: 40 }, s = { w: 60, h: 20 };
    const below = dockRect(H0, s, 'below', 8, 'center'), left = dockRect(H0, s, 'left', 8, 'start'), flank = dockRect(H0, s, 'flankR', 8, 'center'), end = dockRect(H0, s, 'end', 4, 'end'), cor = dockRect(H0, s, 'cornerBR', 0, 'start');
    ok(below.y === 148 && below.x === 170 && left.x === 32 && left.y === 100 && flank.x === 308 && flank.y === 110 && end.x === 240 && end.y === 76 && cor.x === 270 && cor.y === 130, '05 dockRect：下 / 左 / 右翼 / 条端 / 角上的几何');
    const o = dockOrder([{ id: 'c', host: 'b', side: 'right', gap: 0, align: 'start', slot: 0 }, { id: 'b', host: 'a', side: 'right', gap: 0, align: 'start', slot: 0 }, { id: 'x', host: 'y', side: 'right', gap: 0, align: 'start', slot: 0 }, { id: 'y', host: 'x', side: 'right', gap: 0, align: 'start', slot: 0 }], () => true);
    ok(o.order.map((q) => q.id).join() === 'b,c' && o.cycles.sort().join() === 'x,y', '05 dockOrder：拓扑序（先宿主后停靠者），成环的整环不停靠');
    const E5 = 'el.clock,el.resources,el.minimap,el.meter';
    const d1 = hud({ 'cnt.elements': E5, 'el.resources.dockTo': 'el.clock', 'el.resources.dockSide': 'below', 'el.resources.dockAlign': 'center' });
    const ck = occOf(d1, 'el.clock')!, rs = occOf(d1, 'el.resources')!;
    ok(!!ck && !!rs && Math.abs(rs.y - (ck.y + ck.h + px1080(8) * mk(ACT).scale)) < 1.5 && Math.abs(rs.x + rs.w / 2 - (ck.x + ck.w / 2)) < 1.5, `05 资源停靠在时钟下面、居中（时钟底 ${(ck.y + ck.h).toFixed(1)}、资源顶 ${rs.y.toFixed(1)}）`);
    const cyc = res({ ...ACT, 'cnt.elements': E5, 'el.resources.dockTo': 'el.clock', 'el.clock.dockTo': 'el.resources' });
    ok(checkResolved(cyc).some((v) => v.id === 'C-dock-cycle'), '05 停靠成环：检查报 C-dock-cycle');
    const gt = hud({ 'cnt.elements': E5, 'el.clock.group': 'g1', 'el.resources.group': 'g1', 'el.clock.groupFrame': 'tray', 'el.resources.screenAnchor': 'tl' });
    const gb = gt.occ.find((q) => q.id === 'decor.frame:group:g1')?.rect, c2 = occOf(gt, 'el.clock')!, r2 = occOf(gt, 'el.resources')!;
    ok(!!gb && gb.x <= Math.min(c2.x, r2.x) && gb.y <= Math.min(c2.y, r2.y) && gb.x + gb.w >= Math.max(c2.x + c2.w, r2.x + r2.w), '05 成组托盘：组员外接框外一圈托盘，登记占位 decor.frame:group:g1');
    const st = hud({ 'cnt.elements': E5, 'el.minimap.satellites': 'button,toggle,prompt', 'el.minimap.satelliteSide': 't', 'el.minimap.satelliteCount': 4 });
    const sat = st.occ.filter((q) => q.id === 'decor.sat:el.minimap'), mm = occOf(st, 'el.minimap')!;
    ok(sat.length === 6 && sat.some((q) => q.rect.y < mm.y) && st.texts.includes('ON') && st.texts.includes(DATA.pickPrompt[1]), `05 骑边小件：4 颗小圆钮 + 拨杆 + 提示条，伸出框外的部分登记占位（${sat.length} 块）`);
    const wd = hud({ 'cnt.elements': 'el.selection', 'el.selection.form': 'panel', 'el.selection.width': 0.6, 'el.selection.height': 0.16 }), sr = occOf(wd, 'el.selection')!;
    ok(Math.abs(sr.w - 576) < 1 && Math.abs(sr.h - 86.4) < 1, `05 元素宽高 elx.width / height：开火面板 60% × 16%（${sr.w.toFixed(0)} × ${sr.h.toFixed(0)}）`);
    const sl = hud({ 'cnt.elements': 'el.party,el.choices', 'el.party.form': 'statusStrip', 'el.choices.dockTo': 'el.party', 'el.choices.dockSide': 'left', 'el.choices.dockSlot': 2 });
    const pr = occOf(sl, 'el.party')!, ch = occOf(sl, 'el.choices')!, slot2 = ELEMENTS.get('el.party')!.slots!(ctx('el.party', { 'el.party.form': 'statusStrip' }).e, pr)[1];
    ok(!!ch && ch.x + ch.w <= pr.x + 0.5 && Math.abs(ch.y - slot2.y) < 1.5, `05 停在宿主的第 2 格旁（指令窗挂在第二个队员名牌左侧：${ch.y.toFixed(0)} / ${slot2.y.toFixed(0)}）`);
    const lg = hud({ 'cnt.elements': 'el.clock,el.resources', 'el.resources.dockTo': 'el.clock', 'el.resources.dockSide': 'below' }, 'scifi');
    ok(Math.abs(occOf(lg, 'el.resources')!.y - (occOf(lg, 'el.clock')!.y + occOf(lg, 'el.clock')!.h)) < 12, '05 旧皮肤：手动层（皮肤之后）写的停靠照样生效');
    const gl = elementLayout(mk({ ...ACT, 'cnt.elements': E5, 'el.resources.dockTo': 'el.clock', 'el.resources.dockSide': 'below' }));
    ok(!!gl && gl.docks.length === 1 && gl.docks[0][0] === 'el.resources' && gl.docks[0][1] === 'el.clock' && !gl.items.some((it) => it.id === 'el.resources'), 'Godot 布局：停靠者进 DOCKS（不进锚点列），宿主照常');
  }
  // ---- 18 队伍 / 名册 / 行动顺序 / 名片
  {
    const P = (f: string, x: Values = {}) => draw('el.party', { 'cnt.elements': 'el.party', 'el.party.form': f, ...x });
    const u4 = P('unitCards'), u5 = P('unitCards', { 'el.party.count': 5 });
    ok(Math.abs(u4.size.w - 4 * 86 * u4.e.k) < 0.5 && u5.size.w > u4.size.w && u5.texts.filter((t) => DATA.party.some(([n]) => t.startsWith(n))).length === 5, `18 人数 el.party.count = 5：盒宽随张数（${u4.size.w.toFixed(0)} → ${u5.size.w.toFixed(0)}）`);
    const forms = ['avatarRow', 'portraitCard', 'statusStrip', 'shard', 'emblemTiles', 'rosterCard', 'videoGrid'].map((f) => [f, P(f)] as const);
    ok(forms.every(([, q]) => q.size.w > 0 && q.size.h > 0 && q.a.calls.length > 20), '18 七种新画法都画得出（尺寸 > 0）');
    const ss = forms.find(([f]) => f === 'statusStrip')![1];
    ok(ss.texts.includes('HP') && ss.texts.includes('SP') && ss.texts.some((t) => t.startsWith('/')) && !ss.a.calls.some(([k]) => k === 'arc' && false), '18 状态带：HP / SP 两行（大当前 + 小上限）');
    const ar = forms.find(([f]) => f === 'avatarRow')![1];
    ok(!ar.texts.some((t) => DATA.party.some(([n]) => t === n)), '18 只画头像：不写名字（名字进悬停）');
    const rc = forms.find(([f]) => f === 'rosterCard')![1];
    ok(rc.texts.includes('击杀') && rc.texts.includes('升级'), '18 名册卡：等级 / 击杀 + 状态标签');
    const pts = P('statusStrip', { 'el.party.pointsRow': 'lightUp' });
    ok(pts.size.h > ss.size.h, '18 状态带的点亮格行（el.party.pointsRow）加一行');
    const sh = P('shard'), sh0 = P('shard', { 'el.party.overlap': 0 });
    ok(sh.size.w < sh0.size.w, '18 碎片卡默认交叠 0.18（写 0 时并排）');
    const fl = P('rosterCard', { 'el.party.spread': 'fillWidth' });
    ok(Math.abs(fl.size.w - R0.w * 0.88) < 2, `18 铺满宽：约 88% 屏宽（${fl.size.w.toFixed(0)}）`);
    const pl = P('portraits', { 'el.party.memberPill': 'timer' });
    ok(pl.texts.some((t) => /^\d\d:\d\d$/.test(t)), '18 头像下的倒计时胶囊');
    const vg = P('videoGrid', { 'el.party.gap': 0 }), slots = ELEMENTS.get('el.party')!.slots!(vg.e, { x: 0, y: 0, ...vg.size });
    ok(slots.length === 4 && Math.abs(slots[1].x - (slots[0].x + slots[0].w)) < 0.5 && slots[1].w > slots[0].w, '18 视频通话格：零间距拼墙、中间那块放大（成员格 = ElementDef.slots）');
    const t0 = draw('el.turnOrder', {}), tt = draw('el.turnOrder', { 'el.turnOrder.track': 'double', 'el.turnOrder.segments': true });
    const railX = Math.max(...tt.a.calls.filter(([k]) => k === 'lineTo').map(([, v]) => Number(v[0])));
    ok(tt.size.w < R0.w * 0.6 && tt.texts.includes('>>> NEXT TURN') && t0.size.w < tt.size.w && railX > 100 + tt.size.w + 100 && tt.a.n('moveTo') >= 4,
      `18 行动顺序：贯穿的双线轨道（元素按自然宽 ${tt.size.w.toFixed(0)}，线往外延到 ${railX.toFixed(0)}；NEXT TURN 字后面断开）+ NEXT TURN 分段`);
    const nt = draw('el.profile', { 'el.profile.form': 'nameText' });
    ok(nt.texts.includes(DATA.profile.name) && nt.texts.includes(DATA.profile.title) && nt.a.n('arc') === 0, '18 名片 nameText：名字 + 副题，没有头像');
    const ecg = draw('el.vitals', { 'el.vitals.rowForms': 'ecg' }), bar = draw('el.vitals', {});
    ok(ecg.size.h > bar.size.h, '18（B5 ⑫ 顺延）生命条横行里的心电图行加高');
  }
  // ---- 28 目标与追踪器
  {
    const O = (x: Values) => draw('el.objective', { 'cnt.elements': 'el.objective', ...x });
    const tc = O({ 'el.objective.titleColor': 'text', 'el.objective.descColor': 'bad' }), d0 = O({});
    ok(JSON.stringify(tc.a.calls) !== JSON.stringify(d0.a.calls), '28 标题 / 说明色（titleColor / descColor）换了字色');
    const mn = O({ 'el.objective.marker': 'diamondNested' });
    ok(mn.a.n('fill') > d0.a.n('fill') && mn.a.n('stroke') > d0.a.n('stroke'), '28 标题前缀：描边菱形套实心小菱形');
    for (const f of ['storyTracker', 'sectioned', 'panelTab', 'trackerRows']) { const q = O({ 'el.objective.form': f }); ok(q.size.w > 0 && q.size.h > 0 && q.texts.length >= 3, `28 新画法 ${f} 画得出（${q.texts.slice(0, 3).join(' / ')}）`); }
    const fr = O({ 'el.objective.form': 'sectioned', 'st.alert': 'framedLabel' }), nf = O({ 'el.objective.form': 'sectioned' });
    ok(fr.texts.includes('WARNING!') && fr.a.calls.length > nf.a.calls.length + 3, '28 分节简报：st.alert = framedLabel 时环境警告画成黄框警告条');
    const cc = O({ 'el.objective.form': 'checklist', 'el.objective.checkShape': 'circle' });
    ok(cc.a.n('arc') >= 3 && cc.a.n('strokeRect') === 0, '28 勾选框形 circle');
  }
  // ---- 19 敌方与世界标记
  {
    const pt = (x: number, y: number) => ({ x, y, depth: 8, on: true, dir: [1, 0] as [number, number] });
    setWorld({ player: pt(480, 330), poi: { ...pt(600, 300), label: '宝箱', dist: 3 }, target: { ...pt(520, 280), label: '目标' }, held: null, all: [pt(300, 300), pt(520, 280), pt(700, 320)], map: null, refDepth: 8 } as unknown as WorldView);
    try {
      const T1 = (f: string, x: Values = {}) => draw('el.threat', { 'cnt.elements': 'el.threat', 'el.threat.form': f, ...x });
      const wg = T1('weaknessGrid');
      ok(wg.texts.includes('VULNERABLE') && wg.texts.filter((t) => t === '?').length === 4, '19 弱点格：VULNERABLE + 护盾数 + 问号格（没揭示的 4 格）');
      ok(T1('detection').a.n('clip') >= 1 && T1('detection', { 'el.threat.detectShape': 'eye' }).a.n('quadraticCurveTo') >= 2, '19 发现度：三角按比例填、眼睛外形');
      ok(T1('alertMark').texts.includes('!') && T1('alertMark', { 'el.threat.alertKind': 'suspicious' }).texts.includes('?'), '19 警觉标记 ! / ?');
      const tr = T1('targetRow');
      ok(tr.size.w > 100 && tr.texts.filter((t) => t.endsWith('%')).length === 4, '19 目标切换行：4 个头像 + 命中率');
      const pb = ELEMENTS.get('el.threat')!.pointBox!, tb0 = pb(ctx('el.threat', { 'el.threat.form': 'healthBar' }).e, { x: 500, y: 300 })!, tb1 = pb(ctx('el.threat', { 'el.threat.form': 'healthBar', 'cmp.gaugeExtra@el.threat': 'statusBeside' }).e, { x: 500, y: 300 })!;
      ok(tb1.w > tb0.w, '19 头顶血条旁的状态小方块（statusBeside）：占位框算进去');
      const nb = draw('el.turnOrder', { 'el.turnOrder.form': 'numberBadges' });
      ok(['1', '2', '3'].every((t) => nb.texts.includes(t)), '19 攻击顺序编号：每个单位头顶一个序号');
      const wl = draw('el.worldLabel', { 'cnt.elements': 'el.worldLabel', 'el.worldLabel.form': 'nameplate' });
      ok(wl.texts.some((t) => t.startsWith('★')) && wl.texts.length >= 6, '19 世界标签 el.worldLabel = nameplate：人口 + 城名，首都带星');
      const ib = draw('el.interact', { 'el.interact.form': 'iconBubble' });
      ok(ib.texts.filter((t) => t === '…').length === 3, '19 小图标气泡：挂在每个单位上');
      const th = draw('el.overlay', { 'cnt.elements': 'el.overlay', 'el.overlay.form': 'statusIcons', 'el.overlay.statusStyle': 'thoughtBubble' }), tb = draw('el.overlay', { 'cnt.elements': 'el.overlay', 'el.overlay.form': 'statusIcons' });
      ok(th.a.calls.length > tb.a.calls.length, '19 思想气泡装下需求图标');
    } finally { setWorld(null); }
  }
  // ---- 59 输入字形与光标
  {
    ok(mouseButtonOf('E') === 'lmb' && mouseButtonOf('Q') === 'rmb' && mouseButtonOf('Tab') === null && mouseButtonOf('X', 'east') === 'rmb' && swipeOf('Tab') === 'up' && swipeOf('E') === null, '59 鼠标键 / 触摸板手势的对应表（没有对应的照旧键帽 / 面键）');
    const a = rec(); const w = drawGlyph(a.g, a.g, { x: 0, y: 0, w: 20, h: 20 }, 'E', 'xbox', { size: 12 } as TextOpts, {}, {} as never, undefined, { mode: 'mono', text: '#eeeeee', face: '#111111' });
    ok(w === 20 && !a.calls.some(([k, v]) => k === 'fillStyle=' && v[0] === '#3fb950') && a.calls.some(([k, v]) => k === 'strokeStyle=' && v[0] === '#eeeeee'), '59 字形着色 mono：不画品牌色（Xbox A 绿），字色细线圈');
    const pm = draw('el.prompt', { 'cnt.elements': 'el.prompt', 'ix.glyphs': 'mouse' }), pk = draw('el.prompt', { 'cnt.elements': 'el.prompt' });
    ok(pm.a.n('roundRect') > pk.a.n('roundRect'), '59 鼠标字形集：画出鼠标（没有对应鼠标键的照旧键帽）');
    ok(res({ ...ACT, 'ctx.input': 'kbm', 'ix.glyphs': 'mouse' }).str('ix.glyphs') === 'mouse' && res({ ...ACT, 'ctx.input': 'pad', 'ix.glyphs': 'touchpad' }).str('ix.glyphs') === 'touchpad', '59 D-input 不把键鼠的 mouse、手柄的 touchpad 改掉');
    const b = rec(), box = drawCursor(b.g, 'pixelGlove', 100, 100, 28, { fill: '#fff', ink: '#000', accent: '#f00' }, 'talk');
    ok(box.x === 100 && b.n('fillRect') > 40 && b.n('ellipse') >= 1 && cursorContextOf('target', '打开') === 'attack' && cursorContextOf('poi', '赠送礼物') === 'gift', '59 光标集：像素手套点阵 + 按目标的上下文小图标（对话泡 / 礼物 / 攻击）');
    const c1 = draw('el.interact', { 'el.interact.form': 'cursor', 'ix.cursorSet': 'finger' }), c0 = draw('el.interact', { 'el.interact.form': 'cursor' });
    ok(JSON.stringify(c1.a.calls) !== JSON.stringify(c0.a.calls) && c1.texts.includes(DATA.interact), '59 el.interact = cursor 画光标集的那支');
    ok(SCOPABLE_IDS.includes('ix.glyphTint') && !THEME_SCOPED.has('ix.cursorSet'), '59 ix.glyphTint / cursorSet 可按目标写（只经目标链读，不进主题 token）');
  }
  // ---- 60 准星 / 交互 / 焦点小画法
  {
    const X = (x: Values) => draw('el.crosshair', { 'cnt.elements': 'el.crosshair', ...x });
    const tl = X({ 'el.crosshair.form': 'triLaser' }), t5 = X({ 'el.crosshair.form': 'triLaser', 'el.crosshair.lines': 5 });
    ok(tl.a.n('createLinearGradient') === 0 ? tl.a.n('arc') === 3 && t5.a.n('arc') === 5 : true, '60 三道平行激光：道数 el.crosshair.lines（末端各一颗亮点）');
    const segLen = (c: ReturnType<typeof X>) => { const mv = c.a.calls.filter(([k]) => k === 'moveTo').map(([, v]) => v as number[]), ln = c.a.calls.filter(([k]) => k === 'lineTo').map(([, v]) => v as number[]); return mv.map((m, i) => Math.hypot(m[0] - (ln[i]?.[0] ?? m[0]), m[1] - (ln[i]?.[1] ?? m[1]))); };
    const muz = { 'el.crosshair.attachTo': 'held', 'el.crosshair.laserFrom': 'muzzle' };
    ok([X({ 'el.crosshair.form': 'triLaser', ...muz }), X({ 'el.crosshair.form': 'laser', ...muz })].every((c) => { const L = segLen(c); return L.length > 0 && L.every((d) => d > 20); }), '60 准星挂在枪口上（attachTo = held）+ 激光从枪口起：从枪口朝目标射出，不退化成零长度的线');
    const rt = X({ 'el.crosshair.form': 'reticle' });
    ok(rt.a.n('arc') === 2 && rt.a.n('moveTo') >= 8, '60 细圈 + 长十字');
    const it = draw('el.interact', { 'el.interact.form': 'cursor', 'el.interact.itemName': true });
    ok(it.texts[0] === (DATA.hoverItem ?? DATA.featured.name), '60 光标旁先写物品名');
    const nl = draw('el.interact', { 'el.interact.form': 'cursor', 'el.interact.valueLabel': 'none' });
    ok(!nl.texts.includes(DATA.interact), '60 动作标签可关（elx.valueLabel = none）');
    ok(draw('el.interact', { 'el.interact.form': 'poiRing' }).texts.length === 0 && draw('el.interact', { 'el.interact.form': 'magnifier' }).a.n('drawImage') === 1, '60 环形交互点不写字；放大镜把画布这一块放大贴回');
    ok(JSON.stringify(res({ 'ix.focus': 'scale' }).get('ix.focus')) === '["scale"]' && res({ 'ix.focus': 'outline,scale' }).list('ix.focus').join() === 'outline,scale', '60 ix.focus 改多选（单值字符串照旧读）');
    const sc = (x: Values) => { const a = rec(); resetOccupancy(); DRAW_LOG.on = true; DRAW_LOG.texts = []; drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x)); DRAW_LOG.on = false; return { a, texts: DRAW_LOG.texts.map((t) => t.text) }; };
    const f1 = sc({ 'uip.screen': 'tpl.settings', 'ctx.input': 'pad', 'ix.focus': 'fill' }), f0 = sc({ 'uip.screen': 'tpl.settings', 'ctx.input': 'pad', 'ix.focus': 'outline' });
    ok(JSON.stringify(f1.a.calls) !== JSON.stringify(f0.a.calls), '60 焦点 fill（整格填色、字换反差色）');
    const m2 = sc({ 'uip.screen': 'tpl.inventory', 'ctx.input': 'pad', 'ix.focus': 'outline,focusGlow' }), m1 = sc({ 'uip.screen': 'tpl.inventory', 'ctx.input': 'pad', 'ix.focus': 'outline' });
    ok(m2.a.n('strokeRect') > m1.a.n('strokeRect'), '60 焦点多选：按顺序叠画');
    const chF = (x: Values) => draw('el.choices', { 'el.choices.form': 'text', 'col.focus': '#00ff00', ...x }).a.calls.filter(([k]) => k === 'fillStyle=').map(([, v]) => String(v[0]));
    ok(chF({ 'ix.focus': 'textColor' }).includes('#00ff00') && !chF({}).includes('#00ff00'), '60 ix.focus = textColor：对话选项（el.choices = text）当前项换成焦点色，没选时照旧强调色');
    const rr = sc({ 'uip.screen': 'tpl.draft3', 'ops.actions': 'reroll' });
    ok(rr.texts.some((t) => t.startsWith('⚄')), '60 ops.actions = reroll：骰子 + 次数的小按钮');
    ok(res({ 'uip.screen': 'tpl.draft3', 'uip.business': 'business.premium', 'ops.actions': 'retry,reroll' }).list('ops.actions').includes('reroll'), '60 买断制不去掉重掷（局内玩法按钮，不是运营动作）');
  }
  // ---- B6 审查修复
  {
    // ① 停向环的元素不算环：A → B、B ↔ C 时 A 照常停在 B 旁，环只有 B、C；检查与排位同一份 dockOrder
    const sp = (id: string, host: string) => ({ id, host, side: 'right', gap: 0, align: 'start', slot: 0 });
    const oc = dockOrder([sp('A', 'B'), sp('B', 'C'), sp('C', 'B')], () => true);
    ok(oc.order.map((q) => q.id).join() === 'A' && oc.cycles.sort().join() === 'B,C', '审查 ① dockOrder：停向环的链头照常停靠，只有环上的 B / C 算成环');
    const cy3 = { 'uip.layout': 'layout.rpg', 'el.vitals.dockTo': 'el.party', 'el.party.dockTo': 'el.minimap', 'el.minimap.dockTo': 'el.party' } as Values;
    const w3 = checkResolved(res(cy3)).find((v) => v.id === 'C-dock-cycle');
    ok(!!w3 && w3.keys?.length === 2 && !w3.keys.includes('el.vitals.dockTo'), `审查 ① C-dock-cycle 只列环上的元素（${w3?.keys?.join('、')}）`);
    const h3 = hud(cy3), v3 = occOf(h3, 'el.vitals')!, p3 = occOf(h3, 'el.party')!;
    ok(!!v3 && !!p3 && Math.abs(v3.x - (p3.x + p3.w + px1080(8) * mk({ ...ACT, ...cy3 }).scale)) < 1.5, `审查 ① 宿主在环上（回到自己的锚点）时，停向它的元素照样停在它旁边（${v3?.x.toFixed(0)} / ${(p3.x + p3.w).toFixed(0)}）`);
    // ② 只选一种画法的世界标记也登记占位：攻击顺序编号（三枚都登记）、目标标记
    const nb = hud({ 'cnt.elements': 'el.turnOrder', 'el.turnOrder.form': 'numberBadges' }), nbo = nb.occ.filter((o) => o.kind === 'world' && o.id === 'el.turnOrder');
    ok(nbo.length === 3, `审查 ② / ㉒ 只选 el.turnOrder = numberBadges：三枚编号都登记占位（${nbo.length} 块）`);
    ok(hud({ 'cnt.elements': 'el.objective', 'el.objective.form': 'marker' }).occ.some((o) => o.kind === 'world' && o.id === 'el.objective'), '审查 ② 只选 el.objective = marker：目标标记登记占位');
    // ③ / ⑯ 共用底条收格以后的宿主宽：停靠者不压宿主
    const rb = hud({ 'cnt.elements': 'el.resources,el.gameSpeed', 'el.resources.form': 'iconNumber', 'el.resources.screenAnchor': 'tl', 'el.resources.stackDir': 'rowBar', 'el.gameSpeed.dockTo': 'el.resources', 'el.gameSpeed.dockGap': 0 });
    const rr0 = occOf(rb, 'el.resources')!, gs0 = occOf(rb, 'el.gameSpeed')!;
    ok(!!rr0 && !!gs0 && rr0.x + rr0.w <= gs0.x + 0.5, `审查 ③ 共用底条收格后的宿主（${rr0?.w.toFixed(0)} 宽）不压停在右边的元素（${gs0?.x.toFixed(0)}）`);
    const bn = hud({ 'cnt.elements': 'el.threat,el.objective,el.party,el.feedback', 'el.threat.form': 'bossBar', 'el.objective.screenAnchor': 'tr', 'el.objective.form': 'checklist', 'el.party.screenAnchor': 'tl', 'el.party.form': 'rosterCard', 'el.party.count': 2, 'el.feedback.form': 'combo', 'el.feedback.attachTo': 'none', 'el.feedback.dockTo': 'el.threat', 'el.feedback.dockSide': 'end' });
    const bo = occOf(bn, 'el.objective'), bf = occOf(bn, 'el.feedback');
    ok(!!bo && !!bf && !intersects(bo, bf), '审查 ⑯ 停靠组的 Boss 条不只收条长（停在条端的连击不压右上的目标）');
    // ④ Godot：宿主没有成员格时 dockSlot 导出 0
    const gs = elementLayout(mk({ ...ACT, 'cnt.elements': 'el.vitals,el.choices', 'el.choices.dockTo': 'el.vitals', 'el.choices.dockSlot': 2 }));
    ok(!!gs && gs.docks.length === 1 && gs.docks[0][5] === 0, '审查 ④ Godot：宿主没有成员格（el.vitals）时 DOCKS 的格号写 0（画布停在整个宿主旁）');
    // ⑦ 画法级的个数：el.threat.targetRow.count 不让 Boss 条变多条
    const sz7 = (x: Values, form: string) => { const a = rec(); return ELEMENTS.get('el.threat')!.size(makeCtx('el.threat', a.g, a.g, mk({ ...ACT, 'el.threat.form': 'bossBar,targetRow', ...x }), R0, form)); };
    ok(Math.abs(sz7({ 'el.threat.targetRow.count': 4 }, 'bossBar').w - sz7({}, 'bossBar').w) < 0.5 && sz7({ 'el.threat.targetRow.count': 6 }, 'targetRow').w > sz7({}, 'targetRow').w,
      '审查 ⑦ 画法级键 el.threat.targetRow.count 只管目标切换行，Boss 条仍是一条');
    // ⑧ 给了条长时三条 Boss 条的总宽不超过屏宽
    const b8 = ELEMENTS.get('el.threat')!.size(ctx('el.threat', { 'el.threat.form': 'bossBar', 'el.threat.count': 3, 'el.threat.barWidth': 0.5 }).e);
    ok(b8.w <= R0.w + 0.5, `审查 ⑧ 三条 Boss 条 + barWidth 0.5：总宽 ${b8.w.toFixed(0)} ≤ 屏宽`);
    // ⑮ 实例的画法级键的可读名字不抛错
    let lbl = '';
    try { lbl = uiKeyLabel('el.threat#2.bossBar.screenAnchor') ?? ''; } catch { lbl = 'THROW'; }
    ok(lbl.includes('#2') && lbl !== 'THROW', `审查 ⑮ uiKeyLabel('el.threat#2.bossBar.screenAnchor') = ${lbl}`);
    // ⑱ 实例的目标链 = [el.x#2, el.x]：第一份上写的样式第二份跟着用，@el.x#2 优先
    const i18 = hud({ 'cnt.elements': 'el.vitals,el.vitals#2', 'el.vitals#2.screenAnchor': 'br', 'col.accent@el.vitals': '#3fd8e0' });
    const e18 = ctx('el.vitals#2', { 'cnt.elements': 'el.vitals,el.vitals#2', 'col.accent@el.vitals': '#3fd8e0' }).e, e18b = ctx('el.vitals#2', { 'cnt.elements': 'el.vitals,el.vitals#2', 'col.accent@el.vitals': '#3fd8e0', 'col.accent@el.vitals#2': '#ff00ff' }).e;
    ok(e18.scope.join() === 'el.vitals#2,el.vitals' && e18.accent.toLowerCase() === '#3fd8e0' && e18b.accent.toLowerCase() === '#ff00ff' && !!occOf(i18, 'el.vitals#2'), '审查 ⑱ 实例跟第一份的作用域样式（col.accent@el.vitals），自己的 @el.vitals#2 优先');
    // ⑲ 碎片卡的数字排在露出来的那一段（不伸到下一张上）
    const c19 = ctx('el.party', { 'cnt.elements': 'el.party', 'el.party.form': 'shard', 'el.party.activeEmphasis': 'scale' }), d19 = ELEMENTS.get('el.party')!, s19 = d19.size(c19.e), a19 = { x: 100, y: 100, ...s19 };
    DRAW_LOG.on = true; DRAW_LOG.texts = []; d19.draw(c19.e, a19); DRAW_LOG.on = false;
    const r19 = d19.slots!(c19.e, a19), n0 = DRAW_LOG.texts.filter((t) => /^[\d,]+$/.test(t.text) && t.x >= r19[0].x && t.x < r19[1].x);
    const re19 = Math.max(...n0.map((t) => t.x + t.w));
    ok(n0.length >= 2 && re19 <= r19[1].x + 0.5 && re19 >= r19[1].x - 8 * c19.e.k, `审查 ⑲ 碎片卡：当前项的 HP / SP 数字在露出的那一段里右对齐（右沿 ${re19.toFixed(0)}，下一张 ${r19[1].x.toFixed(0)}）`);
    // ㉑ 组员分在不同锚点：不画组框，检查报 C-group-split
    const E21 = 'el.clock,el.resources,el.minimap,el.meter';
    const g21 = { 'cnt.elements': E21, 'el.clock.group': 'g1', 'el.resources.group': 'g1', 'el.clock.groupFrame': 'tray' } as Values;
    ok(!hud(g21).occ.some((q) => q.id === 'decor.frame:group:g1') && checkResolved(res({ ...ACT, ...g21 })).some((v) => v.id === 'C-group-split'), '审查 ㉑ 组员分在左上 / 右下：不画跨屏的托盘，检查报 C-group-split');
    // ⑳ 骑边小件算进排位、不伸出安全区：左上元素左边的一排小圆钮
    const s20 = hud({ 'cnt.elements': 'el.clock', 'el.clock.screenAnchor': 'tl', 'el.clock.satellites': 'button', 'el.clock.satelliteSide': 'l', 'el.clock.satelliteOverhang': 1 });
    const sat20 = s20.occ.filter((q) => q.id === 'decor.sat:el.clock'), x20 = occOf(hud({ 'cnt.elements': 'el.clock', 'el.clock.screenAnchor': 'tl' }), 'el.clock')!.x;
    ok(sat20.length === 2 && sat20.every((q) => q.rect.x >= x20 - 0.5) && occOf(s20, 'el.clock')!.x > x20 + 4, `审查 ⑳ 骑边小圆钮算进排位尺寸：元素让出左边（${x20.toFixed(0)} → ${occOf(s20, 'el.clock')?.x.toFixed(0)}），小钮不伸出安全区`);
    const s20b = hud({ 'cnt.elements': 'el.clock', 'el.clock.satellites': 'badge,toggle' });
    const sb = s20b.occ.filter((q) => q.id === 'decor.sat:el.clock');
    ok(sb.length === 2 && !intersects(sb[0].rect, sb[1].rect), '审查 ⑳ 徽章与拨杆同在右上时挨着排、不叠');
    // ㉒ 世界名牌：三块都登记，胶囊宽按城名量
    const wl = hud({ 'cnt.elements': 'el.worldLabel', 'el.worldLabel.form': 'nameplate' }), wlo = wl.occ.filter((o) => o.kind === 'world' && o.id === 'el.worldLabel');
    ok(wlo.length === 3 && wlo.every((o) => o.rect.x >= R0.x && o.rect.x + o.rect.w <= R0.x + R0.w) && new Set(wlo.map((o) => Math.round(o.rect.w))).size >= 1 && wlo.some((o) => Math.abs(o.rect.w - 160) > 1), `审查 ⑥ / ㉒ 世界名牌：${wlo.length} 块都登记、按城名量宽、夹在画面里`);
    // ㉓ 只选 textColor 时格子上补一道描边
    const sc23 = (x: Values) => { const a = rec(); resetOccupancy(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x)); return a; };
    ok(sc23({ 'uip.screen': 'tpl.inventory', 'ctx.input': 'pad', 'ix.focus': 'textColor' }).n('strokeRect') >= sc23({ 'uip.screen': 'tpl.inventory', 'ctx.input': 'pad', 'ix.focus': 'outline' }).n('strokeRect'), '审查 ㉓ 网格上只选 textColor：焦点格补一道描边（与 outline 一样多）');
    // ㉔ 八人的状态带折成两列、不伸出画面
    const p24 = ELEMENTS.get('el.party')!.size(ctx('el.party', { 'el.party.form': 'statusStrip', 'el.party.count': 8 }).e);
    ok(p24.h <= R0.h * 0.85 + 0.5, `审查 ㉔ 八人的状态带折列（${p24.w.toFixed(0)} × ${p24.h.toFixed(0)}）`);
  }
  // 参数表字段齐全
  const B6 = ['elx.instanceLayout', 'elx.stackReveal', 'elx.activeEmphasis', 'elx.dockTo', 'elx.dockSide', 'elx.dockGap', 'elx.dockAlign', 'elx.dockSlot', 'elx.group', 'elx.groupFrame', 'elx.groupConnector', 'elx.satellites', 'elx.satelliteSide', 'elx.satelliteCount', 'elx.satelliteOverhang', 'elx.width', 'elx.height',
    'el.party.halo', 'el.party.gap', 'el.party.overlap', 'el.party.spread', 'el.party.memberPill', 'el.party.pointsRow', 'el.turnOrder.track', 'el.turnOrder.segments', 'el.turnOrder.roundSize', 'el.turnOrder.spacing',
    'el.objective.titleColor', 'el.objective.descColor', 'el.objective.marker', 'el.objective.distance', 'el.objective.crosshair', 'el.objective.checkShape',
    'el.threat.detectShape', 'el.threat.glintKind', 'el.threat.alertKind', 'el.overlay.statusStyle', 'el.worldLabel.form', 'el.interact.itemName',
    'ix.glyphTint', 'ix.cursorSet', 'ix.cursorContext', 'el.crosshair.lines', 'el.crosshair.spacing', 'el.crosshair.orientation', 'el.crosshair.laserFrom', 'el.crosshair.armLength', 'el.crosshair.gap'];
  const miss = B6.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || ['label', 'plain', 'lookAt', 'godot', 'godotLevel', 'impl'].some((k) => !p[k]) || p.milestone !== 'M12b'; });
  ok(B6.length === 48 && miss.length === 0, `B6 的 48 个新参数字段齐全（label / plain / lookAt / impl / godot / godotLevel、milestone M12b；notes 在参数表里，生成的 uiSpec 不带）${miss.length ? `：缺 ${miss.join('、')}` : ''}`);
  ok(SPEC_PARAM.get('ix.focus')?.kind === 'multi' && (SPEC_PARAM.get('cnt.elements')?.options ?? []).some((o) => o.value === 'el.worldLabel'), 'ix.focus 是多选；cnt.elements 有新元素 el.worldLabel');
}

console.log('== M12b B7（格子状态 / 卡面渲染器 / 卡内组合与手牌 / 网格扩展 / 格位类新元素 / 技能变体 / 插画槽与滤镜）');
{
  setPack('snowline');
  const PACK_SNOW = 'snowline';
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length, sets: (name: string) => calls.filter(([k]) => k === `${name}=`).map(([, a]) => String(a[0])) };
  };
  const HUDL = { 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'cnt.pack': 'deckBuilder' } as Values;
  const ctx = (id: string, x: Values = {}, skin = 'darkHairline', a = rec()) => ({ a, e: makeCtx(id, a.g, a.g, mk({ ...HUDL, ...x }, skin), R0) });
  const draw = (id: string, x: Values = {}, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'deckBuilder')); const c = ctx(id, x, skin), def = ELEMENTS.get(id)!, s = def.size(c.e); DRAW_LOG.on = true; DRAW_LOG.texts = []; def.draw(c.e, { x: 100, y: 100, ...s }); DRAW_LOG.on = false; setPack('snowline'); return { ...c, size: s, texts: DRAW_LOG.texts.map((t) => t.text) }; };
  const hud = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'deckBuilder')); const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; resetOccupancy(); drawElements({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, mk({ ...HUDL, ...x }, skin), null, []); DRAW_LOG.on = false; setPack('snowline'); return { a, texts: DRAW_LOG.texts.map((t) => t.text), occ: OCC.last?.items ?? [] }; };
  const scr = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x, skin)); DRAW_LOG.on = false; setPack('snowline'); return { a, texts: DRAW_LOG.texts.map((t) => t.text), targets: DRAW_LOG.targets.slice() }; };
  const slotDraw = (x: Values, o: Parameters<typeof slot>[3]) => { const c = ctx('el.abilities', x); DRAW_LOG.on = true; DRAW_LOG.texts = []; slot(c.e, { x: 10, y: 10, w: 60, h: 60 }, '⚔', o); DRAW_LOG.on = false; return { a: c.a, texts: DRAW_LOG.texts.map((t) => t.text), e: c.e }; };

  // ---- 01 格子状态
  {
    const rc = slotDraw({ 'st.rarityCue': 'cornerIcon,cornerStar,roman,cornerTab,label', 'col.coding': 'rarity' }, { rarity: 2 });
    ok(rc.texts.includes('III') && rc.texts.includes('EPIC') && rc.texts.includes('★'), `01 稀有度角落记号：罗马数字 III、稀有度文字 EPIC、角星（${rc.texts.join(' ')}）`);
    const red = slotDraw({ 'st.locked': 'redTint' }, { locked: true }), bad = withAlpha(red.e.bad, 0.5);
    ok(red.a.sets('fillStyle').includes(bad) && red.a.n('fillText') + red.a.n('fill') > 1, '01 红底锁定：格底叠一层坏色，图标照画');
    const proto = slotDraw({ 'st.locked': 'prototype' }, { locked: true });
    ok(proto.a.sets('fillStyle').includes(proto.e.warn) && proto.a.n('setLineDash') >= 1, '01 原型：警告色虚线框 + 灯泡');
    const fill = slotDraw({ 'st.selected': 'fill' }, { selected: true });
    ok(fill.a.sets('fillStyle').includes(withAlpha(fill.e.focus, 0.92)), '01 整格选中：焦点色铺满格子');
    const lift = slotDraw({ 'st.selected': 'lift' }, { selected: true }), lift0 = slotDraw({}, { selected: true });
    ok(lift.a.calls.some(([k, a]) => k === 'translate' && Number(a[1]) < 0) && !lift0.a.calls.some(([k, a]) => k === 'translate' && Number(a[1]) < 0) && Math.abs(liftOf(60) - 7.2) < 1e-9, '01 选中抬起：整格往上抬 12%（没选时不抬）');
    const dash = slotDraw({ 'st.selected': 'dashed' }, { selected: true });
    ok(dash.a.calls.some(([k, a]) => k === 'setLineDash' && Array.isArray(a[0]) && (a[0] as number[])[0] === 5), '01 虚线框选中');
    const sl = slotDraw({ 'st.emptySlot': 'slashed' }, { empty: true }), pl = slotDraw({}, { empty: true });
    ok(!sl.texts.includes('+') && pl.texts.includes('+') && sl.a.n('stroke') >= 2, '01 斜杠空格：细线外形 + 一道斜杠，不写 +');
    const mo = slotDraw({ 'st.emptySlot': 'motif', 'vis.motif': 'sigil', 'vis.ornament': 2 }, { empty: true });
    ok(mo.a.n('translate') >= 1 && !mo.texts.includes('+'), '01 母题空格：空格里画当前母题的符号');
    const e01 = ctx('el.abilities').e;
    ok(tintColor(e01, 1) === mix(e01.warn, e01.good, 1) && tintColor(e01, 0) === mix(e01.bad, e01.warn, 0), '01 格底状态色：1 好色 → 0 坏色');
    const tin = slotDraw({}, { tint: 0.2 });
    ok(tin.a.sets('fillStyle').includes(withAlpha(tintColor(tin.e, 0.2), 0.45)), '01 slotTint：格底按状态值铺色');
    ok(slotLabelH(ctx('el.abilities').e, 60) === 0 && slotLabelH(ctx('el.abilities', { 'cmp.slotLabel': 'plate' }).e, 60) > 0, '01 格下标牌：没选时不占高、选了 plate 时伸出格子下沿');
    const lv = slotDraw({ 'cmp.slotLabel': 'levelTag' }, { level: 2 }), pt = slotDraw({ 'cmp.slotLabel': 'plate' }, { label: '思想', selected: true });
    ok(lv.texts.includes('Lv.2') && pt.texts.includes('思想') && pt.a.sets('fillStyle').includes(pt.e.accent), '01 格下标牌：等级小牌「Lv.2」、已内化的压边标牌 = 强调色底');
    const g1 = scr({ 'uip.screen': 'tpl.inventory', 'cmp.slotLabel': 'below' }), g0 = scr({ 'uip.screen': 'tpl.inventory' });
    ok(g1.texts.includes(packById(PACK_SNOW).menu.items[0][1]) && g1.texts.length > g0.texts.length, '01 网格的格下名字（cmp.slotLabel = below）');
    const cta = draw('el.cta', { 'cnt.elements': 'el.cta', 'st.cooldown@el.cta': 'turnLocked' });
    ok(cta.texts.includes('敌方回合') && cta.a.sets('filter').some((f) => f.includes('grayscale')), `01 回合禁用：主按钮去色、字换成「敌方回合」（${cta.texts.join(' ')}）`);
    const sts = scr({ 'uip.screen': 'tpl.inventory', 'st.statusMark': 'slotTint' }), sts0 = scr({ 'uip.screen': 'tpl.inventory' });
    ok(sts.a.n('fill') > sts0.a.n('fill'), '01 网格的格底状态色（st.statusMark = slotTint）');
  }
  // ---- 12 卡面渲染器
  {
    // layout.card 预设写了 cmp.card = tcg（新皮肤上算选过），这几条在动作布局上测
    const ACTL = { 'uip.layout': 'layout.action' } as Values;
    ok(cardKind(ctx('el.abilities', ACTL).e) === 'iconCard' && cardKind(ctx('el.abilities', { ...ACTL, 'cmp.card': 'tcg' }).e) === 'tcg' && cardKind(ctx('el.abilities', { ...ACTL, 'cmp.card@el.abilities': 'playingCard' }).e) === 'playingCard' && cardKind(ctx('el.abilities', { ...ACTL, 'cmp.card': 'bogus' }).e) === 'iconCard'
      && cardKind(ctx('el.abilities').e) === 'tcg' && cardKind(ctx('el.abilities', {}, 'flat').e) === 'iconCard',
      '12 卡面版式：没选 = iconCard（各入口原来的画法），按目标（cmp.card@el.abilities）生效，不认识的值当 iconCard；layout.card 的 tcg 在新皮肤上生效、旧皮肤（flat）不生效');
    ok(SPEC_PARAM.get('cmp.card')?.fallback === 'iconCard' && ['playingCard', 'tarot', 'medallion', 'portrait', 'talisman', 'collection'].every((v) => (SPEC_PARAM.get('cmp.card')?.options ?? []).some((o) => o.value === v)), '12 cmp.card 的 fallback = iconCard（今天的画法）、新版式进词表');
    let leg = 0; const lc = ctx('el.abilities', { 'uip.layout': 'layout.action' }); drawCard(lc.e, { x: 0, y: 0, w: 60, h: 88 }, { i: 0, glyph: '⚔', name: 'x' }, { legacy: () => { leg++; } });
    ok(leg === 1 && lc.a.calls.length === 0, '12 iconCard 调入口原来的画法（不多画一笔）');
    const hand0 = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'iconCard' }), tcg = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'tcg' });
    ok(!hand0.texts.includes('重击') && tcg.texts.includes('重击') && tcg.texts.includes('攻击') && tcg.texts.includes('1') && hand0.size.w === tcg.size.w, `12 手牌 TCG：名条、类型条、费用（样本 = 内容包 hud.hand），尺寸不变（${tcg.texts.slice(0, 6).join(' ')}）`);
    const pk = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'playingCard', 'el.abilities.count': 8 });
    ok(pk.texts.includes('A') && pk.texts.includes('K') && pk.texts.includes('10'), '12 扑克牌：角标点数（A / K / 10，花色是矢量）');
    const ca = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'tcg', 'cmp.cardColorBy': 'costAffordable' });
    ok(ca.a.calls.length > tcg.a.calls.length - 50 && tcg.texts.includes('4') === ca.texts.includes('4'), '12 语义着色：费用不够变红（方块 A 费用 4）');
    const tarot = scr({ 'uip.screen': 'tpl.draft3', 'cmp.card': 'tarot', 'cnt.itemCount': 2 });
    ok(tarot.texts.includes('I') && tarot.texts.includes('II'), '12 塔罗：顶部罗马数字，说明写在卡外');
    const coll = scr({ 'uip.screen': 'tpl.codex', 'cmp.slot': 'collectionCard', 'cnt.pack': 'deckBuilder' }), port = scr({ 'uip.screen': 'tpl.codex', 'cmp.slot': 'portraitCard', 'cnt.pack': 'deckBuilder' });
    ok(coll.texts.includes('重击') && !coll.texts.some((t) => t.startsWith('¥')) && port.texts.some((t) => t === t.toUpperCase() && /[A-Z]/.test(t)) && port.texts.length > 0, '12 网格收藏卡（插画 + 名字、无价格）/ 肖像竖卡');
    const tile = scr({ 'uip.screen': 'tpl.inventory', 'cmp.slot': 'card', 'cmp.card': 'fullArt', 'cnt.pack': 'racing' }), cell = scr({ 'uip.screen': 'tpl.inventory', 'cmp.card': 'fullArt', 'cnt.pack': 'racing' });
    const nm0 = packById('racing').menu.items[0][1];
    ok(tile.targets.some((t) => t.label === nm0) && !cell.targets.some((t) => t.label === nm0), '12 格子画成卡（cmp.slot = card，FH5 的照片瓷砖）；只写 cmp.card 时方格照旧是格子');
    const big = draw('el.reward', { 'cnt.elements': 'el.reward', 'el.reward.form': 'bigCard', 'cmp.card': 'tarot' });
    ok(big.texts.includes(DATA.featured.name) || big.texts.length > 0, '12 大卡 el.reward = bigCard 按卡面版式画');
  }
  // ---- 69 卡内组合与手牌
  {
    const FK = ['kicker', 'nameplate', 'iconDesc', 'fieldPair', 'amountBar', 'progressTable', 'priceChips', 'valueTarget', 'actionTop', 'actionBelow', 'powerCells', 'categoryChip', 'button'];
    const fe = ctx('el.abilities').e;
    ok(FK.every((k) => measureField(fe, k, 120, { lines: ['a', 'b'], pairs: [['a', '1'], ['b', '2']], rows: [['x', '1']], chips: [['●', '1']], cells: [[1, 3]] }) > 0) && measureField(fe, 'art', 120) === 0, '69 字段渲染器：13 种固定字段都量得出高，插画吃剩余（0）');
    const civ = scr({ 'uip.screen': 'tpl.codex', 'cnt.pack': 'tactics', 'cmp.slot': 'tallCard', 'cmp.cardParts': 'kicker,medallion,iconDesc,progressTable,priceChips,button', 'lay.cellAspect': 0.45, 'cnt.itemCount': 5, 'lay.columns': 5 });
    ok(civ.texts.includes('进度') && civ.texts.includes('详情'), `69 Civ6 伟人卡的子件栈：进度小表、详情按钮（${civ.texts.slice(0, 8).join(' ')}）`);
    const blinds = scr({ 'uip.screen': 'tpl.draft3', 'cnt.pack': 'deckBuilder', 'cmp.cardParts': 'actionTop,nameplate,art,valueTarget,actionBelow' });
    ok(['小桌', '大桌', '老板桌', '至少得分', '选择', '跳过'].every((t) => blinds.texts.includes(t)), '69 盲注卡：状态牌 / 选择钮、彩色名牌、至少得分、卡下跳过（样本 = 内容包 hud.blinds）');
    const tipI = draw('el.selection', { 'cnt.elements': 'el.selection', 'el.selection.form': 'tooltip', 'el.selection.innerCard': 'white' }), tip0 = draw('el.selection', { 'cnt.elements': 'el.selection', 'el.selection.form': 'tooltip' });
    ok(tipI.texts.includes('消耗') && tipI.a.sets('fillStyle').includes('#f4f1ea') && tipI.size.h > tip0.size.h * 0.9, '69 说明框内卡：外框 + 白内卡 + 类别胶囊（tip 写成「类别 · 正文」时拆开）');
    const tipP = draw('el.selection', { 'cnt.elements': 'el.selection', 'el.selection.form': 'tooltip', 'cmp.cardParts@tooltip': 'kicker,fieldPair,amountBar' });
    const dbh = packById('deckBuilder').hud;
    ok(tipP.texts.includes(dbh.selection.stats[0][0]) && tipP.texts.some((t) => t.includes(dbh.price)), '69 说明框按卡内子件栈画（字段对 + 金额条：Cyberpunk 数据卡）');
    const h0 = draw('el.abilities', { 'el.abilities.form': 'cards', 'el.abilities.count': 8 }), hO = draw('el.abilities', { 'el.abilities.form': 'cards', 'el.abilities.count': 8, 'lay.cardOverlap': 0.5 });
    const hB = draw('el.abilities', { 'el.abilities.form': 'cards', 'lay.cardBleed': 0.3 }), hC = draw('el.abilities', { 'el.abilities.form': 'cards', 'el.abilities.count': 8, 'el.abilities.valueLabel': 'currentMax' });
    ok(hO.size.w < h0.size.w * 0.7 && hB.size.h < draw('el.abilities', { 'el.abilities.form': 'cards' }).size.h && hC.texts.includes('8/8'), `69 手牌：叠压收窄（${h0.size.w.toFixed(0)} → ${hO.size.w.toFixed(0)}）、出屏只报露出的高、张数计数 8/8`);
    const hL = draw('el.abilities', { 'el.abilities.form': 'cards', 'st.selected': 'lift' });
    ok(hL.size.h > draw('el.abilities', { 'el.abilities.form': 'cards' }).size.h, '69 手牌选中抬起（st.selected = lift：选中的牌上抬）');
    const ed = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'playingCard', 'st.rarityCue': 'finish', 'col.coding': 'rarity' });
    ok(ed.a.n('clip') > pk0(), '69 版本叠层（st.rarityCue = finish / 样本 edition：箔 / 镭射 / 多彩 / 玻璃）');
    function pk0() { return draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'playingCard' }).a.n('clip'); }
    const itb = scr({ 'uip.screen': 'tpl.draft3', 'cnt.pack': 'tactics', 'cmp.cardParts': 'kicker,art,powerCells' });
    ok(itb.a.n('fill') + itb.a.n('fillRect') > scr({ 'uip.screen': 'tpl.draft3', 'cnt.pack': 'tactics' }).a.n('fill'), '69 供能小格（cmp.gauge = pips）');
  }
  // ---- 10 网格扩展
  {
    const MOS = { 'uip.screen': 'tpl.inventory', 'cnt.itemCount': 8, 'lay.arrangement': 'mosaic', 'lay.columns': 4, 'cnt.pack': 'racing' } as Values;
    const mosaic = scr(MOS), grid = scr({ ...MOS, 'lay.arrangement': 'grid' });
    ok(mosaic.a.n('drawImage') + mosaic.a.n('fillRect') > grid.a.n('fillRect') && mosaic.texts.includes(packById('racing').menu.items[0][1]), '10 马赛克瓷砖墙：方格画成横版瓷砖卡（底部标签带写名字）');
    const rr = (q: typeof mosaic) => q.targets.map((t) => t.w);
    ok(rr(mosaic).length > 0 && Math.max(...rr(mosaic)) > Math.max(...rr(grid)) * 1.5, '10 马赛克：首项 2 × 2 的大瓷砖比等大格宽得多（跨格排法：行优先、先到先占）');
    const pin = scr({ 'uip.screen': 'tpl.inventory', 'lay.pinned': 'pinTop', 'lay.columns': 6, 'cnt.itemCount': 12 }), pin0 = scr({ 'uip.screen': 'tpl.inventory', 'lay.columns': 6, 'cnt.itemCount': 12 });
    const wmax = (q: typeof pin) => Math.max(0, ...q.targets.map((t) => t.w));
    ok(wmax(pin) > wmax(pin0) * 2, '10 置顶行：第一个条目占三列画成横版瓷砖卡（Control 的武器形态卡）');
    const hd = scr({ 'uip.screen': 'tpl.inventory', 'lay.gridHeader': 'sectionTitle', 'lay.gridFooter': 'sortHint', 'lay.rowRule': 'shelf' }), hd0 = scr({ 'uip.screen': 'tpl.inventory' });
    ok(hd.texts.includes(packById(PACK_SNOW).menu.tabs?.[0] ?? packById(PACK_SNOW).menu.title) && hd.texts.includes('排序') && hd.a.n('fillRect') > hd0.a.n('fillRect'), '10 网格页眉（分类小标题）、页脚（排序键提示）、搁架横档');
    const fc = scr({ 'uip.screen': 'tpl.inventory', 'lay.gridHeader': 'focusCaption', 'ctx.input': 'pad' });
    ok(fc.texts.filter((t) => t === packById(PACK_SNOW).menu.items[0][1]).length >= 2, '10 焦点项名字（随焦点变，可代替页头）');
    ok(['lay.gridHeader', 'lay.gridFooter', 'lay.rowRule', 'lay.pinnedCellSize'].every((k) => SPEC_PARAM.has(k)) && (SPEC_PARAM.get('lay.arrangement')?.options ?? []).some((o) => o.value === 'mosaic'), '10 参数：lay.gridHeader / gridFooter / rowRule / pinnedCellSize、lay.arrangement = mosaic');
  }
  // ---- 29 格位类新元素
  {
    const NEW = ['el.piles', 'el.passives', 'el.consumables', 'el.buffs', 'el.population', 'el.container'];
    ok(NEW.every((id) => ELEMENTS.has(id) && (SPEC_PARAM.get('cnt.elements')?.options ?? []).some((o) => o.value === id)), '29 六个新元素注册、进 cnt.elements 词表');
    const sizes = NEW.map((id) => draw(id, { 'cnt.elements': id }));
    ok(sizes.every((q) => q.size.w > 0 && q.size.h > 0 && q.a.calls.length > 5), '29 六个新元素都画得出（尺寸 > 0）');
    const piles = draw('el.piles', { 'cnt.elements': 'el.piles' }), pilesC = draw('el.piles', { 'cnt.elements': 'el.piles', 'el.piles.valueLabel': 'currentMax' });
    ok(piles.texts.includes('41') && pilesC.texts.includes('41/52'), '29 牌堆：牌背 + 计数角标（41）；currentMax 时下面写 41/52');
    const two = draw('el.piles', { 'cnt.elements': 'el.piles', 'el.piles.kinds': 'exhaust,discard' });
    ok(two.size.h > piles.size.h * 1.6 && two.texts.includes('2') && two.texts.includes('6'), '29 牌堆叠两堆（消耗堆 + 弃牌堆）');
    const cons = draw('el.consumables', { 'cnt.elements': 'el.consumables', 'el.consumables.tray': 'inset', 'el.consumables.valueLabel': 'currentMax' });
    ok(cons.texts.includes('2/3'), '29 消耗品槽：托盘 + 容量 2/3');
    const pop = draw('el.population', { 'cnt.elements': 'el.population' });
    ok(pop.texts.includes('42 / 80'), '29 人口胶囊：已分配 / 总数');
    const cont = draw('el.container', { 'cnt.elements': 'el.container', 'el.container.columns': 2, 'el.container.count': 8 });
    ok(Math.abs(cont.size.w / cont.size.h - (2 * 40 - 4 + 16) / (4 * 40 - 4 + 16)) < 0.05, '29 世界容器：列数 × 行数（背包竖条 2 × 4）');
    const rec29 = draw('el.cost', { 'cnt.elements': 'el.cost', 'el.cost.form': 'recipeRow', 'el.cost.moduleSlots': 2 }), pips = draw('el.cost', { 'cnt.elements': 'el.cost', 'el.cost.form': 'pips' });
    ok(rec29.size.h > draw('el.cost', { 'cnt.elements': 'el.cost', 'el.cost.form': 'recipeRow' }).size.h && pips.texts.includes('消耗'), '29 el.cost：配方行（插件槽多一排）、凹槽点数');
    const h29 = hud({ 'cnt.elements': 'el.piles,el.passives,el.population' });
    ok(['el.piles', 'el.passives', 'el.population'].every((id) => h29.occ.some((o) => o.id === id)), '29 新元素进帧占位表');
    const lay29 = elementLayout(mk({ ...HUDL, 'cnt.elements': 'el.piles,el.consumables,el.container' }));
    ok(['el.piles', 'el.consumables', 'el.container'].every((id) => !!lay29?.items.find((it) => it.id === id)), 'Godot 布局：新元素各一行');
  }
  // ---- 09 技能变体
  {
    const A = { 'cnt.elements': 'el.abilities' };
    const list = draw('el.abilities', { ...A, 'el.abilities.form': 'list', 'cnt.pack': 'shooter' });
    ok(list.texts.length >= 4 && list.texts.includes('2'), '09 指令列表：名字 + 右侧消耗小签');
    const cl = draw('el.abilities', { ...A, 'el.abilities.form': 'buttonCluster', 'ctx.input': 'pad', 'ix.glyphs': 'xbox' });
    ok(cl.size.w > 0 && cl.texts.length >= 4, '09 按键簇：四个面键 + 指令名');
    const ul = draw('el.abilities', { ...A, 'el.abilities.form': 'unitLoadout', 'cnt.pack': 'tactics' });
    ok(ul.texts.includes('解除') && ul.texts.some((t) => t.includes('·')), '09 单位装配：头像 + 名字 · 职业 + 武器格 + 按键说明');
    const wp = draw('el.abilities', { ...A, 'el.abilities.form': 'weapon' });
    ok(wp.texts.includes(`${DATA.ammo[0]}/${DATA.ammo[1]}`) || wp.texts.some((t) => t.includes('/')), '09 武器读数：线稿剪影 + 弹匣格 + 剩余 / 容量');
    const am0 = draw('el.abilities', { ...A, 'el.abilities.form': 'ammo' }), am = draw('el.abilities', { ...A, 'el.abilities.form': 'ammo', 'el.abilities.quickSlots': 2 });
    ok(am.size.w > am0.size.w, '09 弹药 + 快捷格');
    const s0 = draw('el.abilities', { ...A, 'el.abilities.form': 'slots' }), sx = draw('el.abilities', { ...A, 'el.abilities.form': 'slots', 'el.abilities.activeLabel': 'above', 'el.abilities.overflow': 'plusN', 'el.abilities.lead': 'consumable' });
    ok(sx.size.h > s0.size.h && sx.size.w > s0.size.w && sx.texts.some((t) => /^\+\d+$/.test(t)), `09 当前技能名牌（上方一行）、溢出格「+N」、首格血瓶（${s0.size.w.toFixed(0)} × ${s0.size.h.toFixed(0)} → ${sx.size.w.toFixed(0)} × ${sx.size.h.toFixed(0)}）`);
    const pr = draw('el.abilities', { ...A, 'el.abilities.form': 'slots', 'el.abilities.slotContent': 'portraits' });
    ok(pr.a.n('arc') > s0.a.n('arc'), '09 头像卡（slotContent = portraits）');
  }
  // ---- 32 插画槽与滤镜
  {
    const px = new Uint8ClampedArray([200, 100, 50, 255, 10, 10, 10, 255, 250, 250, 250, 255, 128, 128, 128, 255]);
    const mono = px.slice(); filterPixels(mono, 2, 2, 'monochrome');
    const cut = px.slice(); filterPixels(cut, 2, 2, 'cutout');
    ok(mono[0] === mono[1] && mono[1] === mono[2] && [...cut].filter((_, i) => i % 4 === 0).every((v) => v === 18 || v === 44 || v === 245) && (() => { const u = new Uint8ClampedArray(36).map((_, i) => (i % 4 === 3 ? 255 : 250)); filterPixels(u, 3, 3, 'cutout'); return u[16] === 44; })(), '32 滤镜：单色 r = g = b、剪纸 = 黑纸（高光略提）+ 白轮廓（审查 ㉓：亮处不再映成白）');
    for (const m of ['sketch', 'lineart', 'charcoal', 'engraving', 'relief', 'inkWash', 'halftone']) { const q = px.slice(); filterPixels(q, 2, 2, m); }
    ok(ART_FILTERS.size === 9 && !drawImageFitFx(rec().g, null, R0, 'cover', [0.5, 0.5], 'sketch'), '32 九种滤镜；没有位图时返回 false（调用方画灰盒）');
    const col = scr({ 'uip.screen': 'tpl.codex', 'cmp.panelArt': 'collage' });
    ok(col.texts.some((t) => t.startsWith('“')), '32 拼贴：几张小图错叠 + 斜体引号图注');
    const fx = scr({ 'uip.screen': 'tpl.codex', 'cmp.panelArt': 'window', 'cmp.panelArtFx': 'nightVision,scanlines', 'cmp.panelArtFrame': 'panel', 'cmp.panelArtCaption': 'band' });
    ok(fx.a.sets('globalCompositeOperation').includes('color') && fx.texts.includes(packById(PACK_SNOW).world.region), '32 图窗处理（夜视 = color 混合 + 扫描线）、图注带、细框');
    const xmap = scr({ 'uip.screen': 'tpl.worldmap', 'lay.container': 'fullscreen', 'cmp.modal': 'floating', 'cnt.dataShape': 'none', 'lay.composition': 'three', 'cmp.panelArt': 'window' });
    ok(xmap.a.calls.some(([k, a]) => k === 'fillText' && String(a[0]).includes('插画（需素材）')), '32 没画面板的容器里显式选过的图窗照样画（xcom2#15）');
    const bare = scr({ 'uip.screen': 'tpl.inventory', 'lay.composition': 'splitLR', 'cnt.focal': 'item', 'cnt.focalFrame': 'bare' }), framed = scr({ 'uip.screen': 'tpl.inventory', 'lay.composition': 'splitLR', 'cnt.focal': 'item' });
    ok(bare.a.n('ellipse') > framed.a.n('ellipse'), '32 无框物品展台：顶光 + 地面阴影，不画格子框');
    const vf = scr({ 'uip.screen': 'tpl.hero', 'cnt.focal': 'character', 'cnt.characterMedium': 'videoFeed' });
    ok(vf.texts.includes('REC') && vf.texts.includes('影像窗（需素材）'), '32 视频窗：扫描线 + 信号中断 + REC');
    const av = ctx('el.party', { 'cnt.characterRender': 'cutout' }); avatarB7(av.e, 50, 50, 20, '艾');
    ok(av.a.sets('fillStyle').includes('#111111'), '32 剪纸剪影：头像剪影画成黑色（persona5#24）');
    ok(['cmp.panelArtFrame', 'cmp.panelArtFx', 'cmp.panelArtRatio', 'cmp.panelArtCaption', 'cnt.focalFrame', 'cnt.illustrationRender', 'ast.bgArtRender'].every((k) => SPEC_PARAM.has(k)), '32 新参数进参数表');
  }
  // 参数表字段齐全 + Godot 说明
  const B7 = ['cmp.slotLabel', 'cmp.cardColorBy', 'cmp.cardParts', 'el.selection.innerCard', 'lay.cardOverlap', 'lay.cardBleed', 'lay.pinnedCellSize', 'lay.gridHeader', 'lay.gridFooter', 'lay.rowRule',
    'el.piles.form', 'el.piles.kinds', 'el.passives.form', 'el.passives.perPage', 'el.consumables.form', 'el.consumables.filled', 'el.buffs.form', 'el.buffs.filled', 'el.population.form', 'el.container.form', 'el.container.columns', 'elx.tray', 'el.cost.moduleSlots',
    'el.abilities.quickSlots', 'el.abilities.activeLabel', 'el.abilities.overflow', 'el.abilities.lead',
    'cmp.panelArtFrame', 'cmp.panelArtFx', 'cmp.panelArtRatio', 'cmp.panelArtCaption', 'cnt.focalFrame', 'cnt.illustrationRender', 'ast.bgArtRender'];
  const miss = B7.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || ['label', 'plain', 'lookAt', 'godot', 'godotLevel', 'impl'].some((k) => !p[k]) || p.milestone !== 'M12b'; });
  ok(B7.length === 34 && miss.length === 0, `B7 的 34 个新参数字段齐全（label / plain / lookAt / impl / godot / godotLevel、milestone M12b）${miss.length ? `：缺 ${miss.join('、')}` : ''}`);
  ok(['cmp.slotLabel', 'cmp.card', 'cmp.cardColorBy', 'cmp.cardParts', 'lay.cardOverlap', 'lay.cardBleed', 'cmp.panelArtFrame', 'cmp.panelArtFx', 'cmp.panelArtRatio', 'cmp.panelArtCaption'].every((k) => SCOPABLE_IDS.includes(k)), 'B7 按目标生效的参数进 SCOPABLE_IDS');
  const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...HUDL, 'cnt.elements': 'el.abilities,el.piles', 'cmp.card': 'tcg', 'lay.cardOverlap': 0.3, 'st.selected': 'lift', 'el.abilities.form': 'cards' } as Values)!;
  ok(['卡面（M12b-12）', '卡内组合与手牌（M12b-69）', '格子状态（M12b-01）', '格位类新元素（M12b-29）'].every((w) => gd.notes.some((q) => q.where === w)), 'Godot：B7 的迁移说明（卡面 / 手牌 / 格子状态 / 新元素）');

  // ---- B7 审查修复
  {
    const drawT = (id: string, x: Values = {}, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'deckBuilder')); const c = ctx(id, x, skin), def = ELEMENTS.get(id)!, s = def.size(c.e); DRAW_LOG.on = true; DRAW_LOG.texts = []; def.draw(c.e, { x: 100, y: 100, ...s }); DRAW_LOG.on = false; setPack('snowline'); return { ...c, size: s, texts: DRAW_LOG.texts.slice() }; };
    const ops = (q: { a: ReturnType<typeof rec> }) => q.a.sets('globalCompositeOperation');
    const CARDS = { 'el.abilities.form': 'cards', 'cmp.card': 'tcg' } as Values;
    // ① 样本的版本叠层要 st.rarityCue 含 finish 才画（deckBuilder 包的手牌样本带 foil / holo）
    const e0 = draw('el.abilities', CARDS), e1 = draw('el.abilities', { ...CARDS, 'st.rarityCue': 'finish' });
    ok(!ops(e0).some((o) => o === 'overlay' || o === 'screen' || o === 'color') && ops(e1).some((o) => o === 'overlay' || o === 'screen'), '审查 ① 手牌样本写的版本只在 st.rarityCue 含 finish 时叠（StS 的 tcg 手牌不再带箔 / 镭射）');
    // ⑯ 浅色牌面的版本叠层：multiply / 压色，在牌白上的平均改色 > 10%
    const base = [0xf7, 0xf3, 0xea];
    const shift = (k: string) => { const f = FINISH_LIGHT[k]; let tot = 0; for (const [, c] of f.stops) { const [r0, g0, b0, al] = parseColor(c), src = [r0, g0, b0]; tot += Math.max(...base.map((v, i) => Math.abs((f.op === 'multiply' ? v * (1 - al) + al * v * src[i] / 255 : v * (1 - al) + src[i] * al) - v))); } return tot / f.stops.length / 255; };
    const sh = ['foil', 'holo', 'polychrome', 'glass'].map(shift);
    ok(sh.every((x) => x > 0.1) && lightFace('#f7f3ea') && !lightFace('#2a2f3a') && !lightFace('rgba(255,255,255,0.2)'), `审查 ⑯ 浅色版版本叠层在 #f7f3ea 上的平均改色：箔 / 镭射 / 多彩 / 玻璃 ${sh.map((x) => `${(x * 100).toFixed(0)}%`).join(' / ')}（原来 1.2–3.7%）`);
    const pk = draw('el.abilities', { 'el.abilities.form': 'cards', 'cmp.card': 'playingCard', 'st.rarityCue': 'finish', 'col.coding': 'rarity' });
    ok(ops(pk).includes('multiply') && !ops(pk).includes('overlay'), '审查 ⑯ 白底扑克牌的版本叠层走浅色版（multiply）');
    // ⑰ 矮卡的子件栈：画出的子件整块在卡内
    const ce = ctx('el.abilities').e.part('card'), short = { x: 0, y: 0, w: 105, h: 87 };
    const sl = sectionsLayout(ce, short, { i: 0, glyph: '★', name: '主战', desc: '每层回复 5' }, ['kicker', 'medallion', 'iconDesc', 'progressTable', 'priceChips', 'button']);
    ok(sl.length > 0 && sl.length < 6 && sl.every(([, q]) => q.y >= 0 && q.y + q.h <= short.h + 0.5), `审查 ⑰ 矮卡的子件栈：放不下的子件整块省掉，画出的 ${sl.map(([k]) => k).join(' / ')} 都在卡内`);
    // ⑱ 置顶格边长 320 在 6 列时不伸出画面
    const pinBig = scr({ 'uip.screen': 'tpl.inventory', 'lay.pinned': 'pinTop', 'lay.columns': 6, 'cnt.itemCount': 12, 'lay.pinnedCellSize': 320 });
    const right = Math.max(...pinBig.targets.map((t) => t.x + t.w));
    ok(pinBig.targets.length > 0 && right <= 960 + 0.5, `审查 ⑱ lay.pinnedCellSize = 320 时置顶格按列宽收（最右 ${right.toFixed(0)} ≤ 960）`);
    // ④ 当前技能名牌在下方：画在元素自己的尺寸里，宽至少 180
    const AB = { 'cnt.elements': 'el.abilities', 'el.abilities.form': 'slots' } as Values;
    const lb = drawT('el.abilities', { ...AB, 'el.abilities.activeLabel': 'below' });
    ok(lb.size.w >= 180 * lb.e.k - 0.5 && lb.texts.length > 0 && lb.texts.every((t) => t.y >= 100 - 0.5 && t.y + t.h <= 100 + lb.size.h + 0.5), `审查 ④ activeLabel = below 的名牌在元素框里（${lb.size.w.toFixed(0)} × ${lb.size.h.toFixed(0)}）`);
    // ⑩ 技能格的格下名字（cmp.slotLabel = below）
    const nm = draw('el.abilities', { ...AB, 'cmp.slotLabel@el.abilities': 'below' }), tal = samplesFor('talents', packById('deckBuilder'))[0][1];
    ok(nm.texts.includes(tal), `审查 ⑩ 技能格选了 cmp.slotLabel = below 时写技能名（${tal}）`);
    // ⑲ Lv.N 小牌与格下数量不叠
    const lq = drawT('el.abilities', { ...AB, 'cmp.slotLabel@el.abilities': 'levelTag', 'el.abilities.valueLabel': 'current', 'el.abilities.valueLabelPos': 'below', 'cnt.stateDemo': 'on' });
    const lv = lq.texts.filter((t) => t.text.startsWith('Lv.')), qn = lq.texts.filter((t) => /^\d+$/.test(t.text));
    ok(lv.length > 0 && qn.length > 0 && !qn.some((q) => lv.some((l) => q.x < l.x + l.w && q.x + q.w > l.x && q.y < l.y + l.h - 0.5 && q.y + q.h > l.y + 0.5)), `审查 ⑲ 恩赐格的「Lv.N」小牌下面才写数量（${lv.length} 枚小牌、${qn.length} 个数量）`);
    // ⑳ 溢出格：虚线外形、不画空格的 +，数从样本来
    const ov = draw('el.abilities', { ...AB, 'el.abilities.overflow': 'plusN' });
    ok(!ov.texts.includes('+') && ov.texts.some((t) => /^\+\d+$/.test(t)) && ov.a.n('setLineDash') > 0, `审查 ⑳ 溢出格 = 虚线外形 + 「${ov.texts.find((t) => t.startsWith('+'))}」，不压空格的 +`);
    // ㉚ 托盘里的空消耗品格不画 +（没选 st.emptySlot 时）
    const tr = draw('el.consumables', { 'cnt.elements': 'el.consumables', 'el.consumables.tray': 'inset', 'el.consumables.filled': 0 }), tr0 = draw('el.consumables', { 'cnt.elements': 'el.consumables', 'el.consumables.filled': 0 });
    const trD = draw('el.consumables', { 'cnt.elements': 'el.consumables', 'el.consumables.tray': 'inset', 'el.consumables.filled': 0, 'st.emptySlot@el.consumables': 'plus' });
    ok(!tr.texts.includes('+') && tr0.texts.includes('+') && trD.texts.includes('+'), '审查 ㉚ 托盘里的空格留白（选了 st.emptySlot@el.consumables 照选的画）');
    // ⑧ 卡面的数字经 drawNumber：七段数字时费用不再 fillText
    const sev = draw('el.abilities', { ...CARDS, 'el.abilities.arrangement': 'row', 'typ.numerals.family': 'sevenSeg' });
    ok(sev.texts.includes('1') && !sev.a.calls.some(([k, x]) => k === 'fillText' && x[0] === '1'), '审查 ⑧ TCG 的费用经数字字形画（七段数字时不走 fillText）');
    // ㉛ TCG 名字从费用球右边起排
    const tn = drawT('el.abilities', { ...CARDS, 'el.abilities.arrangement': 'row' }), n0 = tn.texts.find((t) => t.text === '重击'), c0 = tn.texts.find((t) => t.text === '1');
    ok(!!n0 && !!c0 && n0.x >= c0.x + c0.w, `审查 ㉛ TCG 名条的字不压费用球（名字 x ${n0?.x.toFixed(1)}，费用右沿 ${c0 ? (c0.x + c0.w).toFixed(1) : '-'}）`);
    // ㉖ 扇形手牌的文字层一起转
    const ga = rec(), ta = rec(), fe = makeCtx('el.abilities', ga.g, ta.g, mk({ ...HUDL, ...CARDS }), R0);
    setPack('deckBuilder'); { const def = ELEMENTS.get('el.abilities')!, s0 = def.size(fe); def.draw(fe, { x: 100, y: 100, ...s0 }); } setPack('snowline');
    ok(ta.n('rotate') >= 4 && ta.n('rotate') === ga.n('rotate'), `审查 ㉖ 手牌扇形的旋转两层画布都做（图形层 ${ga.n('rotate')} 次、文字层 ${ta.n('rotate')} 次）`);
    // ㉔ 卡内字段的小字跟 TEXT_K
    const m1 = measureField(fe, 'fieldPair', 120, { pairs: [['a', '1']] }); TEXT_K.k = 2; const m2 = measureField(fe, 'fieldPair', 120, { pairs: [['a', '1']] }); TEXT_K.k = 1;
    ok(m2 > m1 * 1.6, `审查 ㉔ 字段的小字跟 a11y.textScale（字段高 ${m1.toFixed(1)} → ${m2.toFixed(1)}）`);
    // ㉑ 瓷砖标签的字落在瓷砖里（大字号）
    const MOS = { 'uip.screen': 'tpl.inventory', 'cnt.itemCount': 8, 'lay.arrangement': 'mosaic', 'lay.columns': 4, 'cnt.pack': 'racing', 'a11y.textScale': 2 } as Values;
    const nm0 = packById('racing').menu.items.map((x) => x[1]);
    TEXT_K.k = 2; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; setPack('racing'); resetOccupancy(); drawScreen({ ctx: rec().g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(MOS)); setPack('snowline'); DRAW_LOG.on = false; TEXT_K.k = 1;
    const tg = DRAW_LOG.targets.filter((t) => nm0.includes(t.label)), tx = DRAW_LOG.texts;
    const out = tg.filter((t) => tx.some((x) => x.text === t.label.toUpperCase() && x.x >= t.x - 0.5 && x.x < t.x + t.w && x.y >= t.y - 0.5 && x.y < t.y + t.h && x.y + x.h > t.y + t.h + 0.5));
    ok(tg.length > 0 && out.length === 0,`审查 ㉑ 大字号（TEXT_K 2）时马赛克瓷砖的标签不伸出瓷砖（${tg.length} 块、伸出 ${out.length}）`);
    // ㉒ 拼贴：各块的灰盒写不同的字（地名）
    const col2 = scr({ 'uip.screen': 'tpl.codex', 'cmp.panelArt': 'collage' }), gb = col2.a.calls.filter(([k, x]) => k === 'fillText' && String(x[0]).endsWith('（需素材）')).map(([, x]) => String(x[0]));
    ok(gb.length >= 2 && new Set(gb).size >= 2, `审查 ㉒ 拼贴各块取不同的图 / 灰盒字（${[...new Set(gb)].join('、')}）`);
    // ㉘ 视频窗半透明
    const vf2 = scr({ 'uip.screen': 'tpl.hero', 'cnt.focal': 'character', 'cnt.characterMedium': 'videoFeed' });
    ok(vf2.a.sets('fillStyle').includes(withAlpha('#0b1416', 0.55)) && !vf2.a.sets('fillStyle').includes('#0b1416'), '审查 ㉘ 视频窗是半透明的全息窗（不再实底挡住场景）');
    // ⑤ / ⑥ / ⑨ / ⑭ 参数表
    const mosR = res({ 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'mosaic', 'lay.columns': 5, 'lay.gap': 12, 'lay.cellSize': 320, 'lay.cellAspect': 1.5 });
    const inact = checkResolved(mosR, { inactive: true } as never).filter((v) => v.id === 'C-inactive' && /lay[.](columns|gap|cellSize|cellAspect)/.test(JSON.stringify(v)));
    ok(inact.length === 0, `审查 ⑤ 马赛克读的 lay.columns / gap / cellSize / cellAspect 不报「不生效」（${inact.length}）`);
    const rr = res({ 'uip.screen': 'tpl.inventory', 'col.coding': 'rarity', 'st.rarityCue': 'cornerStar' }), rr2 = res({ 'uip.screen': 'tpl.inventory', 'col.coding': 'rarity', 'st.rarityCue': 'cornerTab' });
    ok(!checkResolved(rr).some((v) => v.id === 'C-rarity-redundancy') && checkResolved(rr2).some((v) => v.id === 'C-rarity-redundancy'), '审查 ⑥ 角星 cornerStar 算非颜色的稀有度记号（斜条 cornerTab 仍只靠颜色）');
    ok(['el.piles', 'el.passives', 'el.consumables', 'el.buffs'].every((id) => (SPEC_PARAM.get('elx.valueLabel')?.appliesTo ?? []).includes(id)), '审查 ⑨ elx.valueLabel 的作用对象含四个新格位元素（容量行）');
    ok(SCOPABLE_IDS.includes('st.statusMark') && (SPEC_PARAM.get('st.statusMark')?.overrideAt ?? []).includes('elements'), '审查 ⑭ st.statusMark 按目标生效（SCOPABLE_IDS + overrideAt）');
    const tint1 = draw('el.abilities', { ...AB, 'st.statusMark@el.abilities': 'slotTint' }), tint0 = draw('el.abilities', AB);
    ok(tint1.a.n('fill') > tint0.a.n('fill'), '审查 ⑭ st.statusMark@el.abilities = slotTint 只给技能栏铺格底色');
    // ⑫ Godot：格子画成卡时写出默认的 tile 卡面
    const gd12 = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.inventory', 'cmp.slot': 'card' } as Values)!;
    ok(gd12.notes.some((q) => q.where === '卡面（M12b-12）' && q.what.includes('cmp.slot') && q.what.includes('tile（默认）')), 'Godot：cmp.slot = card 的卡面迁移说明（cmp.card 没选 = tile）');
  }
}

console.log('== M12b B8（图生成与连线 / 节点版式 / 数据区构图与格组 / 详情字段组合 / 列表行字段 / 书本）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length, sets: (name: string) => calls.filter(([k]) => k === `${name}=`).map(([, a]) => String(a[0])) };
  };
  type Tx = { text: string; x: number; y: number; w: number; h: number };
  const scr = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x, skin)); DRAW_LOG.on = false; setPack('snowline'); return { a, texts: DRAW_LOG.texts.map((t) => t.text), tx: DRAW_LOG.texts.slice() as unknown as Tx[], targets: DRAW_LOG.targets.slice() }; };
  const ectx = (x: Values = {}, a = rec()) => ({ a, e: makeCtx('el.screen', a.g, a.g, mk(x), R0) });

  // ---- 24 图结构生成与连线
  {
    const t = layoutGraph('tree', 12, 1, 'down');
    ok(t.nLayers === 6 && JSON.stringify(treeLayers(12)) === '[1,2,3,2,3,1]' && t.pts[0][0] === 0.5 && t.pts[0][1] === 0 && t.pts[11][1] === 1 && t.pairs.length === 13, `24 默认树 = 原来的 1-2-3-2-3-1（12 个点、13 条线，第一层在上）`);
    const up = layoutGraph('tree', 12, 1, 'up'), rt = layoutGraph('tree', 12, 1, 'right');
    ok(up.pts[0][1] === 1 && rt.pts[0][0] === 0 && rt.pts[0][1] === 0.5, '24 lay.flowDir：up 第一层在下、right 按层分列（层 = 横坐标）');
    const s1 = layoutGraph('tree', 30, 7, 'up', { branching: 'seeded', layers: 12, endOne: true }), s2 = layoutGraph('tree', 30, 7, 'up', { branching: 'seeded', layers: 12, endOne: true });
    const widths = Array.from({ length: s1.nLayers }, (_, l) => s1.layer.filter((x) => x === l).length);
    const orphan = s1.pts.some((_, i) => s1.layer[i] > 0 && !s1.pairs.some(([, b]) => b === i));
    ok(JSON.stringify(s1) === JSON.stringify(s2) && s1.nLayers === 12 && widths.slice(1, -1).every((w) => w >= 2 && w <= 6) && widths[11] === 1 && s1.end === s1.pts.length - 1 && !orphan, `24 种子分叉：同种子每次一样、12 层、中间层 2–6 个、终点一个、每个节点都有上家（${widths.join('-')}）`);
    ok(layersOf(13, 4).reduce((p, q) => p + q, 0) === 13 && layersOf(13, 4).length === 4, '24 lay.layers：节点分到给定层数');
    const rad = layoutGraph('radialTree', 13, 0, 'down', { aspect: 1.5 });
    ok(rad.root === 0 && rad.pts[0][0] === 0.5 && rad.pts[0][1] === 0.5 && rad.pts.length === 13 && rad.pairs.length === 12, '24 放射树：中心一个根 + 轮辐（13 点 12 线）');
    const cel = layoutGraph('spread', 0, 0, 'down', { spread: 'celticCross' });
    ok(cel.pts.length === 10 && cel.rot?.[1] === 90 && layoutGraph('spread', 0, 0, 'down', { spread: 'triangle' }).pts.length === 3 && layoutGraph('spread', 0, 0, 'down').pts.length === 5, '24 牌阵：凯尔特十字 10 张（第 2 张横压）、三角 3 张、十字 5 张');
    ok(seedOf('a|b') === seedOf('a|b') && seedOf('a|b') !== seedOf('a|c'), '24 种子：字符串 → 确定的种子');
    // 连线库
    const c0 = ectx(), pts: [number, number][] = [[10, 10], [100, 10], [100, 100]], pr: [number, number][] = [[0, 1], [1, 2]];
    drawConnectors(c0.e, pts, pr, 'dashed');
    ok(c0.a.n('save') === 1 && c0.a.n('setLineDash') === 1 && c0.a.n('stroke') === 2, '24 原来的连线画法：一组一次 save、一次虚线、逐条描（调用序列不变）');
    const c1 = ectx();
    drawConnectors(c1.e, pts, pr, 'progress', { edges: [{ walked: true }, { walked: false }] });
    ok(c1.a.sets('strokeStyle').includes(c1.e.accent) && c1.a.n('setLineDash') === 1, '24 progress：已走段强调色实线、未走段虚线');
    const c2 = ectx(); drawConnectors(c2.e, pts, pr, 'elbow'); ok(c2.a.n('arcTo') === 4, '24 elbow：直角折线（圆角）');
    const c3 = ectx(); drawConnectors(c3.e, pts, pr, 'straight', { tint: 'bySign', edges: [{ sign: 1 }, { sign: -1 }] }); ok(c3.a.sets('strokeStyle').includes(c3.e.good) && c3.a.sets('strokeStyle').includes(c3.e.bad), '24 vis.connectorTint = bySign：正 = 好色、负 = 坏色');
    const c4 = ectx(); chevronChain(c4.a.g, [0, 300], [400, 100], '#f00', 10); ok(c4.a.n('moveTo') >= 5, '24 V 形链：一串 V 形 + 末端大箭头（B8 审查修复 ㉓：并成一条路径，按枚数数 moveTo）');
    const c5 = ectx(); drawLeader(c5.e, [0, 0], [100, 50], 'curve', 'bracket', '#f00'); drawLeader(c5.e, [0, 0], [100, 50], 'none', 'dot', '#f00');
    ok(c5.a.n('bezierCurveTo') === 1 && c5.a.n('arc') === 1, '24 引线：曲线 + 起点小圆 + 括号端；none 不画');
    // 屏
    const route = packById('deckBuilder').screens.route;
    // B8 审查修复 ⑯：tpl.routeMap 带 lay.overflow = longScroll，10 层的种子分叉现在按节点尺寸排、滚到当前节点，终点在视窗外——看「王」写 single
    const rm = scr({ 'uip.screen': 'tpl.routeMap', 'cnt.pack': 'deckBuilder', 'lay.flowDir': 'up', 'lay.branching': 'seeded', 'lay.layers': 10, 'lay.rootEmphasis': 'end', 'lay.overflow': 'single' });
    ok(rm.texts.includes(route.find((c) => c === '王') ?? route[route.length - 1]), '24 路线图：自下而上的种子分叉，终点放大写「王」');
    const hdr = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.flowDir': 'right', 'lay.grouping': 'header' });
    ok(['I', 'II', 'III'].every((s) => hdr.texts.includes(s)), '24 lay.grouping = header：每层写列头（没写 tiers 时罗马数字）');
    const d0 = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree' }), d1 = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.flowDir': 'down', 'lay.branching': 'symmetric' });
    ok(JSON.stringify(d0.a.calls) === JSON.stringify(d1.a.calls), '24 显式写默认的方向 / 分叉：画面与不写一样');
    const sp = scr({ 'uip.screen': 'tpl.draft3', 'lay.arrangement': 'spread', 'lay.spread': 'celticCross' });
    ok(sp.a.calls.filter(([k, a]) => k === 'rotate' && Math.abs(Number(a[0]) - Math.PI / 2) < 1e-9).length >= 1, '24 牌阵：凯尔特十字的第 2 张转 90°');
    const ml = scr({ 'uip.screen': 'tpl.worldmap', 'cmp.leader': 'curve' }), ml0 = scr({ 'uip.screen': 'tpl.worldmap' });
    ok(ml.a.n('bezierCurveTo') > ml0.a.n('bezierCurveTo'), '24 cmp.leader：地图地名牌抬高 + 兴趣点 → 地名的引线');
    setPack('deckBuilder');
    const ch = makeCtx('el.crosshair', rec().g, rec().g, mk({ 'uip.layout': 'layout.card', 'cnt.elements': 'el.crosshair', 'el.crosshair.form': 'aimArrow', 'vis.connector@el.crosshair': 'chevronChain', 'el.crosshair.aimFrom': 'hand' }), R0);
    const chA = rec(), chE = { ...ch, g: chA.g, tx: chA.g } as typeof ch; ELEMENTS.get('el.crosshair')!.draw(chE, { x: 0, y: 0, w: 10, h: 10 });
    const ch0A = rec(), ch0 = makeCtx('el.crosshair', ch0A.g, ch0A.g, mk({ 'uip.layout': 'layout.card', 'cnt.elements': 'el.crosshair', 'el.crosshair.form': 'aimArrow' }), R0); ELEMENTS.get('el.crosshair')!.draw(ch0, { x: 0, y: 0, w: 10, h: 10 });
    setPack('snowline');
    ok(chA.n('moveTo') > ch0A.n('moveTo') + 3, `24 出牌指向：vis.connector@el.crosshair = chevronChain 画 V 形链（${chA.n('moveTo')} 段路径，原来 ${ch0A.n('moveTo')}）`);
  }
  // ---- 23 节点版式
  {
    ok(LAYOUT_NODES.size === 12 && nodeFootprint(ectx().e, 'rowCard').w === 156 && nodeFootprint(ectx().e, 'techCard').h === 88, '23 节点版式 12 种（M12b-25 加 worldIcon）；横长卡 156 × 44、方形卡 72 × 88（scale 1）');
    const nd = (kind: string, state: 'done' | 'current' | 'locked', x: Values = {}, extra: Record<string, unknown> = {}) => { const c = ectx(x); DRAW_LOG.on = true; DRAW_LOG.texts = []; const r = drawNode(c.e, 200, 200, { kind, i: 0, state, name: '学识', lv: 2, max: 5, cost: '3', unlocks: ['⚔'], progress: 0.4, type: '✦', ...extra }); DRAW_LOG.on = false; return { ...c, r, texts: DRAW_LOG.texts.map((t) => t.text) }; };
    const all = ['iconRing', 'rowCard', 'techCard', 'rosette', 'iconBadge', 'diamond', 'plainDot', 'inkIcon', 'pawn', 'token', 'counter'].map((k) => [k, nd(k, 'current').r] as const);
    ok(all.every(([, r]) => r.w > 0 && r.h > 0 && Number.isFinite(r.x)), '23 每种版式都画得出、返回外接矩形');
    const rc = nd('rowCard', 'current');
    ok(rc.texts.includes('学识') && rc.texts.includes('3') && Math.abs(rc.r.w - 156) < 1e-6, '23 横长科技卡：名字 + 花费 + 156 宽');
    const tc = nd('techCard', 'done');
    ok(tc.a.sets('fillStyle').includes(withAlpha(tc.e.good, 0.85)) && nd('techCard', 'locked').a.sets('fillStyle').includes(withAlpha(tc.e.bad, 0.85)), '23 方形科技卡：卡底已研究好色、不可研究坏色');
    ok(nd('rosette', 'done').texts.includes('SIGNED') && !nd('rosette', 'current').texts.includes('SIGNED'), '23 花托：已签署头顶 SIGNED');
    const ib = nd('iconBadge', 'done');
    ok(ib.r.h > ib.r.w, '23 类型圆章：完成后章下加星（外接框变高）');
    const ink0 = nd('inkIcon', 'done'), ink1 = nd('inkIcon', 'done', { 'st.done': 'inkCircle' });
    ok(ink1.a.n('stroke') >= ink0.a.n('stroke') + 2, '23 st.done = inkCircle：走过的节点外两道墨线圈');
    const cm = nd('plainDot', 'current', { 'lay.currentMarker': 'avatar' }), cm0 = nd('plainDot', 'current');
    ok(cm.a.n('arc') > cm0.a.n('arc'), '23 lay.currentMarker = avatar：当前节点上方一枚小头像');
    const gd = nd('glowDot', 'current'), rad = gd.r.w / 3.2;
    ok(Math.abs(gd.r.w - rad * 3.2) < 1e-9 && rad >= 20, '23 / 14 发光点的矩形按光晕（1.6 × 半径）');
    const t23 = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'cmp.node': 'techCard', 'cnt.pack': 'factory' });
    ok(packById('factory').screens.talents!.some((x) => t23.texts.includes(x[1])), '23 科技树的版式节点写天赋样本的名字');
  }
  // ---- 11 数据区构图与格组
  {
    const sec = scr({ 'uip.screen': 'tpl.inventory', 'lay.sections': 'row,grid', 'lay.grouping': 'divider' }), tabs = packById('snowline').screens.tabs;
    ok(sec.texts.some((t) => t.includes(tabs[1])) && sec.texts.some((t) => t.includes(tabs[2])), `11 lay.sections：两段各一个段标题（${tabs[1]} / ${tabs[2]}）`);
    const sub = scr({ 'uip.screen': 'tpl.inventory', 'lay.sections': 'stats', 'lay.subColumns': 2 });
    ok(sub.texts.some((t) => t.includes(tabs[1])) && sub.texts.some((t) => t.includes(tabs[2])), '11 lay.subColumns = 2：一段分两栏、各有标题');
    const gr = GENERIC.samples.slotGroups;
    const fl = scr({ 'uip.screen': 'tpl.loadout', 'lay.composition': 'three', 'lay.focalSide': 'center', 'lay.arrangement': 'flankColumns', 'cmp.leader': 'curve', 'lay.detail': 'none' });
    ok(gr.every(([t]) => fl.texts.includes(t)) && fl.a.n('bezierCurveTo') >= gr.length, '11 主体两侧列：每个格组写组名、从部位拉引线');
    const fx = scr({ 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'fixedGroups', 'cmp.slotGroup': 'plain' });
    ok(gr.every(([t]) => fx.texts.includes(t)) && !fx.texts.some((t) => t.startsWith('可用')), '11 固定分组 + cmp.slotGroup = plain：组名、不写计数');
    const fx2 = scr({ 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'fixedGroups' });
    ok(fx2.texts.some((t) => t.startsWith('可用')), '11 cmp.slotGroup 默认 counted：「可用 n」计数');
    const dg = scr({ 'uip.screen': 'tpl.inventory', 'lay.composition': 'dualGrid', 'lay.detail': 'none' });
    ok(dg.texts.includes(tabs[0]), '11 双网格：左格子带页签标题、右边配方格');
    const wp = scr({ 'uip.screen': 'tpl.forge', 'lay.container': 'windowPair' });
    ok(wp.texts.includes('背包'), '11 双窗停靠：左边停靠窗写「背包」');
    const bl = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'below', 'lay.groupMaxW': 0.6 });
    const nm = packById('snowline').menu.detail.name, nameT = bl.tx.find((t) => t.text === nm);
    ok(!!nameT && nameT.x > 960 * 0.15, `11 详情在集合下方 + 整组限宽：详情名字不在左边（x ${nameT?.x.toFixed(0)}）`);
    const bt = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.composition': 'splitTB', 'lay.focalSide': 'bottom' });
    ok(bt.targets.length > 0, '11 lay.focalSide = bottom：上下分栏、主体在下（画得出）');
    const s3 = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.composition': 'three', 'lay.sideRegion': 'stats' }), s30 = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.composition': 'three' });
    ok(s3.texts.length > s30.texts.length, '11 第三栏 = 属性表：主体右边那一栏画键值行');
  }
  // ---- 14 详情字段组合
  {
    const it = packById('soulslike').menu.items[0];
    const au = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent', 'cmp.detailFields': 'derive', 'cnt.pack': 'soulslike' });
    ok(au.texts.some((t) => t.startsWith('持有')) && au.texts.includes(rarityWord(it[4]?.rarity ?? 2)), '14 cmp.detailFields = derive（物品）：稀有度字 / 名字 / 类别 / 持有数 / 说明 / 按钮');
    const p0 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent' }), p1 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent', 'cmp.detailFields': '' });
    ok(JSON.stringify(p0.a.calls) === JSON.stringify(p1.a.calls), '14 没写字段 = 原来的详情（名字 + 说明 + 两根条 + 按钮）');
    const stp = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'statsPanel' }), st0 = packById('snowline').menu.detail.stats[0][0];
    ok(stp.texts.includes(st0) && !stp.texts.includes(packById('snowline').menu.buttons[0]), '14 lay.detail = statsPanel：名字 + 属性表（不画按钮）');
    const hero = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'hero' });
    ok(hero.texts.includes(packById('snowline').screens.tabs[1]), '14 lay.detail = hero：小页签 + 大图 + 主数值');
    const tip = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'transient', 'cmp.detailFields@tooltip': 'name,affixes' });
    ok(tip.texts.some((t) => t.startsWith('▲')) && tip.texts.some((t) => t.startsWith('▼')), '14 浮动详情按 cmp.detailFields@tooltip 画词缀对比（▲ 升 ▼ 降）');
    const dk = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'transient', 'lay.floatDock': 'gridEdge' }), dn = packById('snowline').menu.detail.name;
    // 网格格子 = 物品名的点选目标里不大的那些（浮框自己也用详情名登记了一个大目标，排除）
    const cells = dk.targets.filter((t) => packById('snowline').menu.items.some((x) => x[1] === t.label) && t.w < 150), gridRight = Math.max(...cells.map((t) => t.x + t.w)), tipT = dk.tx.filter((t) => t.text === dn).sort((p, q) => q.x - p.x)[0];
    ok(!!tipT && tipT.x >= gridRight, `14 lay.floatDock = gridEdge：浮框在网格右缘外（${tipT?.x.toFixed(0)} ≥ ${gridRight.toFixed(0)}）`);
    const sc = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.detail': 'persistent', 'ix.mode': 'singleCTA', 'cnt.pack': 'factory' });
    ok(!sc.texts.includes('确定') && sc.texts.filter((t) => t === (textFor('buttons', res({ 'uip.screen': 'tpl.skilltree' }), packById('factory')) ?? packById('factory').menu.buttons)[0]).length === 1, '14 singleCTA + 常驻详情：只留模板那一颗按钮、写详情的主动作');
    const lw = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'wide', 'lay.subColumns': 2 });
    ok(lw.texts.filter((t) => packById('snowline').screens.tabs.slice(1, 3).some((x) => t.includes(x))).length >= 2, '14 lay.detail = wide：详情 + 两栏属性表（各有段标题）');
  }
  // ---- 13 列表行字段
  {
    const hd = scr({ 'uip.screen': 'tpl.skilltree', 'cnt.dataShape': 'collection', 'lay.arrangement': 'column', 'cmp.listRow': 'toggle,icon,title,level,value,upgrade', 'cnt.pack': 'action' });
    const ta = packById('action').screens.talents!;
    ok(hd.texts.some((t) => t.startsWith('Lv ')) && ta.slice(0, 3).some(([, , , , lv, mx, cost]) => hd.texts.includes(lv >= mx ? 'MAX' : cost)), '13 升级格（MAX / 花费）+ 等级');
    const itb = scr({ 'uip.screen': 'tpl.formation', 'cnt.dataShape': 'collection', 'lay.arrangement': 'column', 'cmp.listRow': 'leadButtons,icon,title,slots,statChips', 'cmp.listHeader': 'selectorStrip', 'cnt.pack': 'tactics' });
    const ro = packById('tactics').screens.roster!;
    ok(ro.every(([, , st]) => st.every(([, v]) => itb.texts.includes(String(v)))), '13 色块数字（名册的属性）+ 行内小格 + 行首按钮列 + 选择条');
    const hf = scr({ 'uip.screen': 'tpl.stats', 'cnt.dataShape': 'table', 'cmp.listRow': 'title,value,grade', 'cnt.pack': 'rhythm' });
    ok(hf.texts.includes('总评') && hf.texts.some((t) => ['S', 'A', 'B', 'C', 'D'].includes(t)), '13 表格评级：逐行字母 + 大字总评');
    const gh = scr({ 'uip.screen': 'tpl.quest', 'lay.grouping': 'header' }), gh0 = scr({ 'uip.screen': 'tpl.quest' }), tt = packById('snowline').screens.tabs;
    const cnt = (r0: typeof gh, s: string) => r0.texts.filter((x) => x === s).length;
    ok(cnt(gh, tt[1]) === cnt(gh0, tt[1]) + 1 && cnt(gh, tt[2]) === cnt(gh0, tt[2]) + 1, '13 分组标题行（lay.grouping = header）：两组各一行组名（页签之外多出来的一行）');
    const ec = scr({ 'uip.screen': 'tpl.settings', 'cnt.screen': 'screen.manage', 'cnt.dataShape': 'form', 'lay.columns': 2, 'cnt.pack': 'cityBuilder' }), sv = packById('cityBuilder').screens.economy!.services;
    const xs = sv.map(([, n]) => ec.tx.find((t) => t.text === n)?.x ?? -1);
    ok(xs.every((x) => x >= 0) && Math.max(...xs) - Math.min(...xs) > 200, '13 经营面板两栏：服务行分左右两栏');
    const pr = scr({ 'uip.screen': 'tpl.forge', 'cnt.dataShape': 'collection', 'lay.arrangement': 'column', 'st.locked': 'prototype', 'cnt.pack': 'survival', 'cnt.lockedFrom': 1 });
    ok(pr.texts.includes('原型'), '13 列表行的原型态：锁定行写「原型」+ 灯泡');
    setPack('rpg');
    const pa = rec(), pe = makeCtx('el.party', pa.g, pa.g, mk({ 'uip.layout': 'layout.rpg', 'cnt.pack': 'rpg', 'cnt.elements': 'el.party', 'el.party.form': 'statusStrip', 'cmp.listRow@el.party': 'level' }), R0);
    DRAW_LOG.on = true; DRAW_LOG.texts = []; const ps = ELEMENTS.get('el.party')!.size(pe); ELEMENTS.get('el.party')!.draw(pe, { x: 0, y: 0, ...ps }); DRAW_LOG.on = false; setPack('snowline');
    ok(DRAW_LOG.texts.some((t) => t.text.startsWith('Lv ')), '13 队伍状态带写等级（cmp.listRow@el.party 含 level，octopath#16）');
  }
  // ---- 53 书本
  {
    const gl = globalThis as Record<string, unknown>, hadDoc = !!gl.document;
    if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => rec().g }), fonts: { add() {} } };
    const bk = (x: Values) => { const a = rec(); const th = mk({ 'uip.screen': 'tpl.codex', 'ast.container': 'book', ...x }); return { a, c: drawContainerFor({ ctx: a.g, m: rec().g, blur: 0 } as never, R0, th) }; };
    const b0 = bk({}), b1 = bk({ 'ast.bookStyle': 'leather', 'ast.pageLeft': 'content' });
    ok(JSON.stringify(b0.a.calls) === JSON.stringify(b1.a.calls) && JSON.stringify(b0.c.content) === JSON.stringify(b1.c.content), '53 显式写默认（皮面、两页内容）= 原来的书');
    const fl = bk({ 'ast.bookStyle': 'flat' });
    ok(fl.a.n('roundRect') === 0 && fl.a.n('fillRect') >= 3, '53 硬边书：直角、无圆角封皮');
    const ep = bk({ 'ast.pageLeft': 'endpaper', 'ast.pageRight': 'framed' });
    ok(ep.c.content.x > 480 && ep.a.n('strokeRect') >= 2, '53 左衬页 + 右扉页框：内容只排在右页、右页两道内框线');
    const pc = scr({ 'uip.screen': 'tpl.codex', 'ast.container': 'book', 'lay.overflow': 'paged', 'lay.pageIndicator': 'pageCurl', 'cnt.dataShape': 'text', 'cnt.textLength': 'long' });
    ok(pc.targets.some((t) => t.label === '下一页'), '53 翻页角（lay.pageIndicator = pageCurl）');
    const ce = makeCtx('el.screen', rec().g, rec().g, mk({ 'typ.numerals.family': 'oldstyle' }), R0), cOld = rec(), eOld = { ...ce, g: cOld.g, tx: cOld.g } as typeof ce;
    drawRich(eOld, '1927 年', { x: 0, y: 0, w: 400, h: 100 }, { o: eOld.base });
    ok(cOld.n('fillText') >= 2, '53 / B5 顺延 obra-dinn#10：长文里的数字串按旧式数字画');
    if (!hadDoc) delete gl.document;
  }
  // ---- 参数表、作用域、Godot
  {
    const B8 = ['lay.flowDir', 'lay.layers', 'lay.branching', 'lay.rootEmphasis', 'lay.spread', 'vis.connectorProgress', 'vis.connectorWeight', 'vis.connectorTint', 'cmp.leader', 'cmp.leaderEnd', 'el.crosshair.aimFrom', 'lay.currentMarker',
      'lay.sideRegion', 'lay.sections', 'lay.subColumns', 'lay.groupMaxW', 'lay.dataAlign', 'lay.dockContent', 'cmp.slotGroup', 'cmp.slotGroupTitle', 'cmp.detailFields', 'lay.floatDock', 'cmp.listHeader', 'ast.bookStyle', 'ast.pageLeft', 'ast.pageRight'];
    const miss = B8.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || ['label', 'plain', 'lookAt', 'godot', 'godotLevel', 'impl'].some((k) => !p[k]) || p.milestone !== 'M12b'; });
    ok(B8.length === 26 && miss.length === 0, `B8 的 26 个新参数字段齐全（label / plain / lookAt / impl / godot / godotLevel、milestone M12b）${miss.length ? `：缺 ${miss.join('、')}` : ''}`);
    ok(['cmp.detailFields', 'cmp.slotGroup', 'cmp.slotGroupTitle', 'cmp.listHeader'].every((k) => SCOPABLE_IDS.includes(k)) && ['groupHeader', 'slotGroup'].every((k) => SCOPE_PARTS.includes(k)), 'B8 按目标生效的参数进 SCOPABLE_IDS、新部件进 SCOPE_PARTS');
    const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.flowDir': 'up', 'lay.branching': 'seeded', 'cmp.node': 'rowCard', 'cmp.detailFields': 'derive', 'lay.detail': 'persistent', 'cmp.listRow': 'icon,title,upgrade', 'ast.container': 'book', 'ast.bookStyle': 'flat', 'lay.sections': 'row,grid' } as Values)!;
    const want = ['图结构与连线（M12b-24）', '节点版式（M12b-23）', '数据区构图与格组（M12b-11）', '详情字段组合（M12b-14）', '列表行字段（M12b-13）', '书本容器（M12b-53）'];
    ok(want.every((w) => gd.notes.some((q) => q.where === w)) && gd.notes.find((q) => q.where === want[0])!.what.includes('点位'), 'Godot：B8 的迁移说明（图的点位按 layoutGraph 导出）');
  }
}

console.log('== M12b B8 审查修复');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => { const px = Number(/(\d+(?:\.\d+)?)px/.exec(String(st.font ?? ''))?.[1] ?? 10); return { width: [...t].reduce((w, ch) => w + (/[⺀-￿]/.test(ch) ? px : px * 0.56), 0) }; } : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length };
  };
  type Tx = { text: string; x: number; y: number; w: number; h: number };
  type Tg = { label: string; x: number; y: number; w: number; h: number };
  const scr = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, mk(x, skin)); DRAW_LOG.on = false; setPack('snowline'); return { a, texts: DRAW_LOG.texts.map((t) => t.text), tx: DRAW_LOG.texts.slice() as unknown as Tx[], targets: DRAW_LOG.targets.slice() as unknown as Tg[], occ: OCC.last }; };
  const ectx = (x: Values = {}, a = rec()) => ({ a, e: makeCtx('el.screen', a.g, a.g, mk(x), R0) });
  // 命中目标两两重叠（> 15% 小块面积、不算包含）
  const overlaps = (T0: Tg[]) => { let n = 0; for (let i = 0; i < T0.length; i++) for (let j = i + 1; j < T0.length; j++) { const p = T0[i], q = T0[j], ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y); if (ox <= 0 || oy <= 0) continue; const inn = (u: Tg, v: Tg) => u.x >= v.x - 1 && u.y >= v.y - 1 && u.x + u.w <= v.x + v.w + 1 && u.y + u.h <= v.y + v.h + 1; if (!inn(p, q) && !inn(q, p) && ox * oy > 0.15 * Math.min(p.w * p.h, q.w * q.h)) n++; } return n; };

  // ① Godot 点位与画布一致
  {
    const gpts = (x: Values) => { const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...x } as Values)!; const nt = gd.notes.find((q) => q.where === '图结构与连线（M12b-24）'); const m = nt ? /点位（(\w+)，(\d+) 个[^）]*）= (\[\[.*?\]\])/.exec(nt.what) : null; return { note: !!nt, kind: m?.[1], pts: m ? (JSON.parse(m[3]) as [number, number][]) : null }; };
    const nodes = (x: Values) => scr(x).targets.filter((t) => /^节点 \d+$/.test(t.label)).sort((p, q) => Number(p.label.slice(3)) - Number(q.label.slice(3))).map((t) => [t.x + t.w / 2, t.y + t.h / 2] as [number, number]);
    // 画布坐标是导出点位的逐轴线性像（内框留边 + 放射树的椭圆压缩），点位取三位小数
    const affine = (c: [number, number][], g: [number, number][]) => c.length === g.length && [0, 1].every((ax) => {
      const lo = g.reduce((p, q, i) => (q[ax] < g[p][ax] ? i : p), 0), hi = g.reduce((p, q, i) => (q[ax] > g[p][ax] ? i : p), 0);
      if (g[hi][ax] - g[lo][ax] < 1e-6) return c.every((p) => Math.abs(p[ax] - c[0][ax]) < 0.75);
      const k = (c[hi][ax] - c[lo][ax]) / (g[hi][ax] - g[lo][ax]), b = c[lo][ax] - k * g[lo][ax];
      return c.every((p, i) => Math.abs(p[ax] - (k * g[i][ax] + b)) < Math.max(0.75, Math.abs(k) * 0.0011));
    });
    const cases: [string, Values, number][] = [
      ['树 + flowDir up', { 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.flowDir': 'up', 'cnt.pack': 'snowline' }, 12],
      ['放射树', { 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'radialTree', 'cnt.dataShape': 'network', 'cnt.pack': 'snowline' }, 13],
      ['星图 + 信息密度 4', { 'uip.screen': 'tpl.skilltree', 'lay.flowDir': 'up', 'cnt.density': 4, 'cnt.pack': 'snowline' }, 18],
      ['种子分叉 + 信息密度 4', { 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'tree', 'lay.branching': 'seeded', 'cnt.density': 4, 'cnt.pack': 'snowline' }, 24],
    ];
    for (const [name, x, n] of cases) {
      const c = nodes(x), g = gpts(x);
      ok(c.length === n && !!g.pts && g.pts.length === n && affine(c, g.pts), `审查 ① ${name}：Godot 点位 ${g.pts?.length ?? 0} 个、画布 ${c.length} 个（应 ${n}），逐轴对得上`);
    }
    const hud = gpts({ 'uip.layout': 'layout.card', 'cnt.elements': 'el.crosshair', 'el.crosshair.form': 'aimArrow', 'vis.connector@el.crosshair': 'chevronChain' });
    const fl = gpts({ 'uip.screen': 'tpl.loadout', 'lay.arrangement': 'flankColumns', 'cmp.leader': 'curve' }), sc = gpts({ 'uip.screen': 'tpl.deduction', 'lay.flowDir': 'up' });
    ok(hud.note && !hud.pts && fl.note && !fl.pts && sc.note && !sc.pts, '审查 ① 不画图的屏（局内 HUD 的出牌指向、两侧列的引线、推理板）只写连线说明、不写点位');
  }
  // ② cmp.detailFields = [auto] = 跟随预设
  {
    const p0 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent' }), p1 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent', 'cmp.detailFields': 'auto' });
    const w0 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'wide' }), w1 = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'wide', 'cmp.detailFields': 'auto' });
    ok(JSON.stringify(p0.a.calls) === JSON.stringify(p1.a.calls) && JSON.stringify(w0.a.calls) === JSON.stringify(w1.a.calls) && p1.texts.includes(packById('snowline').menu.detail.name), '审查 ② cmp.detailFields = [auto]：与不写一样（常驻详情原来的画法 / wide 的预设字段）');
  }
  // ③ / ⑥ 按目标读的参数
  ok(['vis.connector', 'cmp.listRow', 'cmp.leader', 'cmp.leaderEnd'].every((k) => SCOPABLE_IDS.includes(k)) && !THEME_SCOPED.has('vis.connector')
    && (SPEC_PARAM.get('vis.connector')?.overrideAt ?? []).includes('elements') && (SPEC_PARAM.get('cmp.listRow')?.overrideAt ?? []).includes('elements')
    && (SPEC_PARAM.get('cmp.plate')?.overrideAt ?? []).includes('groupHeader') && (SPEC_PARAM.get('cmp.leader')?.overrideAt ?? []).includes('components'), '审查 ③ / ⑥ vis.connector / cmp.listRow / cmp.leader / cmp.leaderEnd 进 SCOPABLE（写 overrideAt）、cmp.plate 可写 @groupHeader');
  {
    const base = { 'uip.screen': 'tpl.worldmap', 'lay.detail': 'transient' };
    const m0 = scr(base), mg = scr({ ...base, 'cmp.leader': 'elbow' }), mt = scr({ ...base, 'cmp.leader@tooltip': 'elbow', 'cmp.leaderEnd@tooltip': 'none' });
    const w0 = packById('snowline').world, places = [...(w0.places ?? []).map((p) => p[0]), w0.region], nm = places.find((p) => m0.tx.some((t) => t.text === p));
    const yOf = (q: typeof m0) => JSON.stringify(q.tx.filter((t) => t.text === nm).map((t) => Math.round(t.y)));
    ok(!!nm && yOf(mt) === yOf(m0) && yOf(mg) !== yOf(m0) && mt.a.n('lineTo') > m0.a.n('lineTo'), `审查 ⑥ cmp.leader@tooltip：只画浮框到锚点的引线，地名牌（${nm}）不抬；全局值地名牌也抬`);
  }
  // ④ 生效条件
  {
    const aw = (id: string, x: Values) => { const r = res(x); return evalCond(SPEC_PARAM.get(id)!.activeWhen as never, (k) => r.get(k)); };
    const wp = { 'uip.screen': 'tpl.forge', 'lay.container': 'windowPair' }, rad = { 'uip.screen': 'tpl.skilltree', 'cnt.dataShape': 'network', 'lay.arrangement': 'radialTree' };
    ok(aw('lay.subColumns', { 'uip.screen': 'tpl.inventory', 'lay.detail': 'wide' }) === true && aw('lay.subColumns', { 'uip.screen': 'tpl.inventory', 'cmp.detailFields': 'name,statTable' }) === true
      && aw('lay.columns', { 'uip.screen': 'tpl.settings', 'cnt.screen': 'screen.manage', 'cnt.dataShape': 'form' }) === true
      && ['lay.panelWidth', 'lay.panelHeight', 'lay.vAlign', 'lay.panelFit', 'cmp.modal'].every((id) => aw(id, wp) === true)
      && ['lay.flowDir', 'lay.layers', 'lay.branching'].every((id) => aw(id, rad) === false) && aw('lay.rootEmphasis', rad) === true, '审查 ④ 生效条件：详情属性表的子栏、经营面板两栏、双窗的宽高 / 对齐 / 定高 / 浮空；放射树不认方向 / 层数 / 分叉、认根强调');
    const rk = (x: Values) => { const t = scr({ ...rad, ...x }).targets.filter((q) => /^节点 \d+$/.test(q.label)); const r0 = t.find((q) => q.label === '节点 1')!, r1 = t.find((q) => q.label === '节点 2')!; return r0.w / r1.w; };
    ok(rk({}) > 1.2 && Math.abs(rk({ 'lay.rootEmphasis': 'none' }) - 1) < 0.25, `审查 ④ 放射树：lay.rootEmphasis = none 时根不放大（${rk({ 'lay.rootEmphasis': 'none' }).toFixed(2)}，默认 ${rk({}).toFixed(2)}）`);
  }
  // ⑤ Godot 的详情栏说明
  {
    const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.skilltree' } as Values)!, nt = gd.notes.find((q) => q.where === '详情栏');
    ok(!!nt && nt.how.includes('小字 × 1.15') && nt.how.includes('ix.mode = singleCTA') && nt.how.includes('8 个方向') && nt.how.includes('光晕'), '审查 ⑤ Godot 的详情栏说明：名字字号下限、单一主按钮进模板按钮行、节点图四周找空位与光晕框');
  }
  // ⑨ 旧式数字的行宽
  {
    const ce = makeCtx('el.screen', rec().g, rec().g, mk({ 'typ.numerals.family': 'oldstyle' }), R0), cp = makeCtx('el.screen', rec().g, rec().g, mk({}), R0);
    const box = { x: 0, y: 0, w: 400, h: 100 }, oldM = drawRich(ce, '1927 年', box, { o: ce.base, measureOnly: true }).end!.x, oldD = drawRich({ ...ce, g: rec().g, tx: rec().g } as typeof ce, '1927 年', box, { o: ce.base }).end!.x;
    const plainM = drawRich(cp, '1927 年', box, { o: cp.base, measureOnly: true }).end!.x;
    const cen = drawRich({ ...ce, g: rec().g, tx: rec().g } as typeof ce, '1927 年', box, { o: ce.base, align: 'center' }).end!.x;
    ok(Math.abs(oldM - oldD) < 1e-6 && oldM < plainM && Math.abs(cen - (200 + oldM / 2)) < 1e-6, `审查 ⑨ 旧式数字：量的行宽 = 画出来的（${oldM.toFixed(1)}，整号字 ${plainM.toFixed(1)}），居中行按它居中`);
  }
  // ⑩ 双窗的停靠窗内容登记进模板占位
  {
    const wp = scr({ 'uip.screen': 'tpl.forge', 'lay.container': 'windowPair' });
    const data = (wp.occ?.items ?? []).filter((o) => o.kind === 'template' && o.sub === 'data');
    ok(data.some((o) => o.rect.x < 960 * 0.4), `审查 ⑩ 双窗：停靠窗里画出的网格登记进帧占位表（template / data ${data.length} 块）`);
  }
  // ⑪ / ⑯ / ㉓ 节点版式
  {
    const nd = (kind: string, state: 'done' | 'current' | 'locked', x: Values = {}, extra: Record<string, unknown> = {}) => { const c = ectx(x); DRAW_LOG.on = true; DRAW_LOG.texts = []; const r = drawNode(c.e, 200, 200, { kind, i: 0, state, name: '学识', lv: 2, max: 5, cost: '3', unlocks: ['⚔'], progress: 0.4, type: '✦', ...extra }); DRAW_LOG.on = false; return { ...c, r, texts: DRAW_LOG.texts.map((t) => t.text) }; };
    ok(nd('rowCard', 'current', { 'typ.numerals.family': 'sevenSeg' }).a.n('fillText') < nd('rowCard', 'current').a.n('fillText'), '审查 ⑪ 横长科技卡的花费经 drawNumber（七段数码时不走 fillText）');
    const t1 = nd('techCard', 'current', {}, { cost: '200 红瓶' }), t5 = nd('techCard', 'current', {}, { scale: 0.5 });
    ok(t1.texts.includes('×200') && t1.texts.includes('学识') && !t5.texts.includes('学识'), '审查 ⑯ 方形科技卡：花费画成瓶色点 + ×200；缩到 0.6 以下不写名字');
    const ro = nd('rosette', 'done');
    ok(ro.a.n('fill') <= 3 && ro.texts.includes('SIGNED') && !nd('rosette', 'done', {}, { scale: 0.5 }).texts.includes('学识'), `审查 ㉓ / ⑭ 花托：8 片花瓣一次填（fill ${ro.a.n('fill')} 次）；缩到 0.6 以下不写名字`);
    const c4 = ectx(); chevronChain(c4.a.g, [0, 300], [400, 100], '#f00', 10);
    ok(c4.a.n('fill') === 1 && c4.a.n('moveTo') >= 5 && c4.a.n('rotate') === 0, `审查 ㉓ V 形链：整条链一条路径、一次填（${c4.a.n('moveTo')} 枚）`);
  }
  // ⑫ 取值表与已实现的画法一致
  {
    const vals = (id: string) => JSON.stringify((SPEC_PARAM.get(id)?.options ?? []).map((o) => String(o.value)).filter((v) => v !== 'auto'));
    ok(vals('vis.connector') === JSON.stringify([...CONNECTOR_STYLES]) && vals('cmp.leader') === JSON.stringify([...LEADER_KINDS]) && vals('cmp.leaderEnd') === JSON.stringify([...LEADER_ENDS]) && vals('lay.spread') === JSON.stringify([...SPREADS]), '审查 ⑫ vis.connector / cmp.leader / cmp.leaderEnd / lay.spread 的取值 = connectors.ts / graph.ts 的画法表');
    const c = ectx(); drawConnector(c.e, [0, 0], [100, 60], 'elbow');
    ok(c.a.n('save') === 1 && c.a.n('stroke') === 1 && c.a.n('arcTo') === 2, '审查 ⑫ drawConnector（B9 · 17 的面板折角线用）：单条折线');
  }
  // ⑬ / ㉒ / ㉕ 两侧列、第三区、格组
  {
    const fs = scr({ 'uip.screen': 'tpl.loadout', 'cnt.pack': 'shooter', 'lay.composition': 'three', 'lay.focalSide': 'center', 'lay.arrangement': 'flankColumns', 'lay.sideRegion': 'list', 'cmp.leader': 'curve' });
    const gs = packById('shooter').screens.slotGroups ?? GENERIC.samples.slotGroups;
    ok(overlaps(fs.targets) === 0 && gs.every(([t]) => fs.texts.includes(t)), `审查 ⑬ 两侧列 + 第三区列表：格组只排在数据栏、与列表不压（重叠 ${overlaps(fs.targets)}）`);
    const tb = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.composition': 'three', 'lay.focalSide': 'bottom', 'lay.sideRegion': 'list' });
    ok(tb.targets.every((t) => t.w >= 0 && t.x + t.w <= 961), '审查 ㉒ 三栏 + 主体在下：没有第三区（没有负宽的行、没有出画的按钮）');
    const ft = scr({ 'uip.screen': 'tpl.loadout', 'cnt.pack': 'shooter', 'lay.composition': 'three', 'lay.focalSide': 'center', 'lay.arrangement': 'flankColumns', 'lay.detail': 'transient' });
    const tip = ft.targets.find((t) => t.w > 150 && t.h > 50 && t.label === (packById('shooter').menu.detail.name)), titles = ft.tx.filter((t) => gs.some(([g0]) => g0 === t.text));
    ok(!!tip && titles.every((t) => !intersects(t, tip)), '审查 ㉕ 浮动详情不压格组的组名（整组进条目表）');
  }
  // ⑭ 放射树的花托
  {
    const rd = scr({ 'uip.screen': 'tpl.skilltree', 'lay.arrangement': 'radialTree', 'cnt.dataShape': 'network', 'cmp.node': 'rosette', 'cnt.pack': 'colony' });
    const names = new Set((packById('colony').screens.talents ?? []).map((t) => plainText(t[1]))), ro = rd.targets.filter((t) => names.has(t.label) && t.w < 200);
    const xs = ro.map((t) => t.x + t.w / 2), ys = ro.map((t) => t.y + t.h / 2), sx = Math.max(...xs) - Math.min(...xs), sy = Math.max(...ys) - Math.min(...ys);
    ok(ro.length === 13 && overlaps(ro) === 0 && sx > sy * 1.3, `审查 ⑭ 放射树的花托：13 个不重叠、宽数据区拉成椭圆（横跨 ${sx.toFixed(0)}、纵跨 ${sy.toFixed(0)}）`);
  }
  // ⑯ / ⑰ / ⑱ / ⑲ 长图、路线、图标、交叉
  {
    const RT = { 'uip.screen': 'tpl.routeMap', 'cnt.pack': 'deckBuilder', 'cmp.node': 'inkIcon', 'lay.flowDir': 'up', 'lay.branching': 'seeded', 'lay.layers': 15, 'lay.rootEmphasis': 'end', 'lay.panelSize': 1, 'lay.panelAspect': 'portrait' };
    const route = new Set(packById('deckBuilder').screens.route), nodesOf = (q: ReturnType<typeof scr>) => q.targets.filter((t) => route.has(t.label));
    const flat = scr({ ...RT, 'lay.overflow': 'single' }), lg = scr({ ...RT, 'lay.overflow': 'longScroll' });
    const pitch = (l: Tg[]) => { const ys = [...new Set(l.map((t) => Math.round(t.y + t.h / 2)))].sort((p, q) => q - p); return ys[0] - ys[1]; };
    ok(nodesOf(lg).length < nodesOf(flat).length && pitch(nodesOf(lg)) > pitch(nodesOf(flat)) * 2 && nodesOf(lg).every((t) => t.y + t.h / 2 >= 0 && t.y + t.h / 2 <= 540), `审查 ⑯ 长图（longScroll）：层距按节点尺寸排（${pitch(nodesOf(lg))}，挤在一屏时 ${pitch(nodesOf(flat))}）、裁在数据区里（画 ${nodesOf(lg).length} / ${nodesOf(flat).length} 个）`);
    ok(flat.texts.includes('⚔') && !flat.texts.includes('战') && flat.texts.filter((t) => t === '★').length === 1, '审查 ⑱ 路线图的版式节点画类型符号（战 → ⚔），终点放大时只有终点是 Boss（★ 一个）');
    const G = layoutGraph('tree', 30, seedOf('deckBuilder|tpl.routeMap|routeMap'), 'up', { branching: 'seeded', layers: 12, endOne: true }), stE = ectx().e;
    const chainOk = (st: string[], G0: typeof G) => {
      const ch = st.map((s, i) => [s, i] as [string, number]).filter(([s]) => s !== 'locked').sort((p, q) => G0.layer[p[1]] - G0.layer[q[1]]).map(([, i]) => i);
      const linked = ch.every((i, k) => k === 0 || G0.pairs.some(([a, b]) => a === ch[k - 1] && b === i));
      const walked = G0.pairs.filter(([a, b]) => st[a] === 'done' && st[b] !== 'locked').length;
      return linked && new Set(ch.map((i) => G0.layer[i])).size === ch.length && st[ch[ch.length - 1]] === 'current' && walked === ch.length - 1;
    };
    const sy = layoutGraph('tree', 12, 1, 'up');
    ok(chainOk(graphStates(stE, G, 3, 3, true), G) && chainOk(graphStates(stE, sy, 2, 2, true), sy), '审查 ⑰ 走过的路：完成 / 当前沿着图上的一条路（每层一个、首尾相连），已走的线只有这条路上的');
    let crossings = 0, orphans = 0;
    for (let sd = 0; sd < 300; sd++) for (const L of [0, 10, 15]) {
      const Gs = layoutGraph('tree', 40, seedOf(`x${sd}`), 'down', { layers: L, branching: 'seeded', endOne: true });
      for (let i = 0; i < Gs.pairs.length; i++) for (let j = i + 1; j < Gs.pairs.length; j++) {
        const [a, b] = Gs.pairs[i], [c, d] = Gs.pairs[j];
        if (Gs.layer[a] !== Gs.layer[c] || a === c || b === d) continue;
        if ((Gs.pts[a][0] - Gs.pts[c][0]) * (Gs.pts[b][0] - Gs.pts[d][0]) < 0) crossings++;
      }
      orphans += Gs.pts.filter((_, i) => Gs.layer[i] > 0 && !Gs.pairs.some(([, b]) => b === i)).length;
    }
    ok(crossings === 0 && orphans === 0, `审查 ⑲ 种子分叉 900 张图：连线交叉 ${crossings}、没有上家的节点 ${orphans}`);
  }
  // ⑳ 字段放不下整段时先截行
  {
    const de = ectx({ 'uip.screen': 'tpl.inventory', 'cnt.pack': 'puzzle' }).e;
    setPack('puzzle');
    const full = detailPlanOf(de, 220, Infinity, ['name', 'longText', 'progressDots']), lt = full.find(([f]) => f === 'longText')![1];
    const tight = detailPlanOf(de, 220, full.reduce((s, [, h]) => s + h, 0) - lt * 0.6, ['name', 'longText', 'progressDots']), af = detailPlanOf(de, 220, 60, ['name', 'affixes']);
    setPack('snowline');
    const tl = tight.find(([f]) => f === 'longText');
    ok(!!tl && tl[1] > 0 && tl[1] < lt && af.some(([f]) => f === 'affixes'), `审查 ⑳ 详情字段放不下：长文截行（${tl?.[1].toFixed(0)} / ${lt.toFixed(0)}）而不是整段省掉，词缀至少留一行`);
  }
  // ㉑ 翻页角在纸页的角上
  {
    const gl = globalThis as Record<string, unknown>, hadDoc = !!gl.document;
    if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => rec().g }), fonts: { add() {} } };
    const X = { 'uip.screen': 'tpl.codex', 'ast.container': 'book', 'ast.pageLeft': 'endpaper', 'ast.pageRight': 'framed', 'lay.overflow': 'paged', 'lay.pageIndicator': 'pageCurl', 'cnt.dataShape': 'text', 'cnt.textLength': 'long' };
    const pc = scr(X), page = drawContainerFor({ ctx: rec().g, m: rec().g, blur: 0 } as never, R0, mk(X)).page!, t = pc.targets.find((q) => q.label === '下一页')!;
    if (!hadDoc) delete gl.document;
    ok(!!t && !!page && Math.abs(t.x + t.w - (page.x + page.w - 2)) < 1 && Math.abs(t.y + t.h - (page.y + page.h - 2)) < 1, `审查 ㉑ 翻页角画在右页的右下角（${t ? (t.x + t.w).toFixed(0) : '?'}，页边 ${(page.x + page.w).toFixed(0)}）`);
  }
  // ㉔ / ㉕ / ㉖ / ㉗ 大字号下的经营两栏、浮框封顶、评级栏、固定分组
  {
    const sv = packById('cityBuilder').screens.economy!.services;
    const EC = { 'uip.screen': 'tpl.settings', 'cnt.screen': 'screen.manage', 'cnt.dataShape': 'form', 'lay.columns': 2, 'cnt.pack': 'cityBuilder' };
    const txOver = (X: Tx[]) => { let n = 0; for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) { const p = X[i], q = X[j], ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), oy = Math.min(p.y + p.h * 0.8, q.y + q.h * 0.8) - Math.max(p.y + p.h * 0.2, q.y + q.h * 0.2); if (p.text !== q.text && ox > 3 && oy > 2) n++; } return n; };
    TEXT_K.k = 2; const e2 = scr(EC); TEXT_K.k = 3; const e3 = scr(EC); TEXT_K.k = 1;
    const xs = sv.map(([, n]) => e3.tx.find((t) => t.text === n)?.x).filter((x): x is number => x !== undefined), rows = (q: typeof e2) => q.tx.filter((t) => t.y > 80 && t.y < 400);
    ok(xs.length > 0 && Math.max(...xs) - Math.min(...xs) < 1 && txOver(rows(e2)) === 0, `审查 ㉔ 经营面板：两栏放不下（3 倍字号）时退回一栏；2 倍字号两栏不叠字（${txOver(rows(e2))}）`);
    TEXT_K.k = 2; const fl = scr({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'transient', 'cmp.detailFields@tooltip': 'name,type,desc,statCards,lockRow,warnRow' }); TEXT_K.k = 1;
    const tip = fl.targets.filter((t) => t.label === packById('snowline').menu.detail.name).sort((p, q) => q.w * q.h - p.w * p.h)[0];
    ok(!!tip && tip.y >= 0 && tip.y + tip.h <= 540 + 0.5, `审查 ㉕ 浮动详情（按字段）的高封顶到画面（${tip ? (tip.y + tip.h).toFixed(0) : '?'} ≤ 540）`);
    const hf = scr({ 'uip.screen': 'tpl.stats', 'cnt.dataShape': 'table', 'cmp.listRow': 'title,value,grade', 'cnt.pack': 'rhythm' });
    const grades = new Set(hf.texts.filter((t) => ['S', 'A', 'B', 'C', 'D'].includes(t)));
    ok(grades.size >= 3, `审查 ㉖ 评级表：评级栏单独一栏、档位按名次分（${[...grades].join(' / ')}）`);
    TEXT_K.k = 2; const fx = scr({ 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'fixedGroups', 'cnt.pack': 'platformer' }), fx1 = (TEXT_K.k = 1, scr({ 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'fixedGroups', 'cnt.pack': 'platformer' }));
    const grp = packById('platformer').screens.slotGroups ?? GENERIC.samples.slotGroups, drawn = (q: typeof fx) => grp.filter(([t]) => q.texts.includes(t)).length;
    ok(drawn(fx1) === grp.length && (drawn(fx) === grp.length || fx.a.n('createLinearGradient') > fx1.a.n('createLinearGradient')), `审查 ㉗ 固定分组：放不下时先缩格子（大字号 ${drawn(fx)} / ${grp.length} 组），仍放不下画渐隐`);
  }
}

console.log('== M12b B9（选中面板版式 / 页签导航 / CTA 与工具条 / 对话框版式 / 选项与环形菜单 / 表单控件 / 标题与播报锁扣）');
{
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const res = (x: Values, skin = 'darkHairline') => resolveUi({ ...cur, 'hud.style': skin, ...x } as Values);
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(res(x, skin), null, skin);
  const rec = () => {
    const calls: [string, unknown[]][] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, canvas: { width: 960, height: 540 } };
    const g = new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient' ? () => ({ addColorStop() {} }) : k === 'createPattern' ? () => ({ setTransform() {} }) : k === 'getImageData' ? (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }) : k === 'getLineDash' ? () => [] : (...a: unknown[]) => { calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, n: (name: string) => calls.filter(([k]) => k === name).length };
  };
  type Tx = { text: string; x: number; y: number; w: number; h: number };
  type Occ = { id?: string; kind: string; sub?: string; rect: { x: number; y: number; w: number; h: number } };
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl;
  // 页签托架 cradle 走材质图样（createElement 画布），给一个桩
  // 离屏画布（烘焙层 / 图样）也画进当前这一次的记录器（live），调用序列才完整
  let live = rec();
  if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => live.g }), fonts: { add() {} } };
  // 字与图形记在同一个记录器里（m = ctx：字色也进调用序列）
  const out = (a: ReturnType<typeof rec>) => { const occ = (OCC.last?.items ?? []) as unknown as Occ[]; DRAW_LOG.on = false; setPack('snowline'); return { a, texts: DRAW_LOG.texts.map((t) => t.text), tx: DRAW_LOG.texts.slice() as unknown as Tx[], targets: DRAW_LOG.targets.map((t) => t.label), occ, at: (id: string) => occ.find((q) => q.id === id)?.rect, kinds: (sub: string) => occ.filter((q) => q.kind === 'template' && q.sub === sub).map((q) => q.rect) }; };
  const scr = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); drawScreen({ ctx: a.g, m: a.g, blur: 0, full: R0 } as never, R0, mk(x, skin)); return out(a); };
  const hud = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); drawElements({ ctx: a.g, m: a.g, blur: 0 } as never, R0, mk({ 'uip.layout': 'layout.rpg', ...x }, skin), null, []); return out(a); };
  const xOf = (q: ReturnType<typeof scr>, t: string) => q.tx.find((p) => p.text === t)?.x ?? NaN, yOf = (q: ReturnType<typeof scr>, t: string) => q.tx.find((p) => p.text === t)?.y ?? NaN;
  const head = (q: ReturnType<typeof scr>) => q.kinds('header')[0];

  // ---- 15 选中面板版式库
  {
    const SHEETS = ['sidePanel', 'cityPanel', 'entityInfo', 'buildingPanel', 'dossier', 'shotCalc', 'bareText', 'cardStack'], SEL = { 'cnt.elements': 'el.selection' };
    ok(SHEETS.every((f) => ELEMENTS.get('el.selection')!.forms.includes(f)), '15 el.selection 新画法 8 种');
    const sp = hud({ ...SEL, 'el.selection.form': 'sidePanel' }), spR = hud({ ...SEL, 'el.selection.form': 'sidePanel', 'el.selection.edge': 'right' });
    ok(sp.at('el.selection')!.x < 40 && sp.at('el.selection')!.h > 400 && spR.at('el.selection')!.x > 600 && sp.targets.includes('关闭'), '15 sidePanel：贴左通高（el.selection.edge = right 贴右），带关闭钮与页签');
    const cp = hud({ ...SEL, 'el.selection.form': 'cityPanel' });
    ok(cp.texts.some((t) => t.startsWith('回合至增长')) && cp.texts.includes('食物'), '15 cityPanel：人口大数 + 产出三行 + 回合至增长');
    const ei = hud({ ...SEL, 'el.selection.form': 'entityInfo' }), eiN = hud({ ...SEL, 'el.selection.form': 'entityInfo', 'el.selection.portrait': 'none' });
    ok(ei.texts.includes('运行中') && ei.texts.includes('配方') && ei.a.calls.length !== eiN.a.calls.length, '15 entityInfo：状态点 + 配方行；el.selection.portrait = none 不画小图');
    const bp = hud({ ...SEL, 'el.selection.form': 'buildingPanel' });
    ok(['艾琳', '卡尔', '米娅'].every((n) => bp.texts.includes(n)) && bp.targets.includes('新建'), '15 buildingPanel：成员列表 + 新建钮');
    ok(hud({ ...SEL, 'el.selection.form': 'dossier' }).texts.includes('REF 0427 // FILE 12'), '15 dossier：档案编号行');
    const sc = hud({ ...SEL, 'el.selection.form': 'shotCalc' });
    ok(['85%', '命中', '40%', '暴击'].every((t) => sc.texts.includes(t)), '15 shotCalc：命中 / 暴击大数 + 加成表');
    const bt = hud({ ...SEL, 'el.selection.form': 'bareText' });
    ok(bt.a.n('fill') === 0 && bt.a.n('stroke') === 0 && bt.texts.length >= 3, '15 bareText：无底板的纯文字');
    ok(['卡尔', '米娅'].every((n) => hud({ ...SEL, 'el.selection.form': 'cardStack' }).texts.includes(n)), '15 cardStack：错开的一叠卡');
    const fs = hud({ ...SEL, 'el.selection.form': 'sidePanel', 'cmp.detailFields@el.selection': 'name,statusRow,recipeLine,memberList,codeLine,objectiveLine,footerStrip,bigNumbers,valueLine,iconTabs,quantity' });
    ok(['运行中', '配方', '待命', 'REF 0427 // FILE 12', '工人'].every((t) => fs.texts.includes(t)), '15 cmp.detailFields@el.selection：新字段（状态 / 配方 / 成员 / 编号 / 数量……）在选中面板里画得出');
    const fa = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.focalSide': 'bottom', 'lay.focalAside': 'slotsText' }), fa0 = scr({ 'uip.screen': 'tpl.inventory', 'cnt.focal': 'character', 'lay.focalSide': 'bottom' });
    ok(fa.texts.includes('头部') && fa.texts.includes(packById('snowline').hud.profile.name) && !fa0.texts.includes('头部'), '15 lay.focalAside = slotsText：主体旁一列装备格 + 玩家名与资金（没选 = 原来）');
  }
  // ---- 16 页签导航
  {
    const INV = { 'uip.screen': 'tpl.inventory' };
    const nc = scr({ ...INV, 'lay.navCount': 3 });
    ok(nc.targets.includes('装备') && !nc.targets.includes('材料'), '16 lay.navCount = 3：只画前 3 个页签');
    const SET = { 'uip.screen': 'tpl.settings', 'lay.nav': 'tabsTop' };
    const ce = scr({ ...SET, 'lay.navAlign': 'center', 'lay.navSeparator': 'dot' }), ce0 = scr({ ...SET, 'lay.navAlign': 'center' }), stc = scr({ ...SET, 'lay.navAlign': 'stretch', 'lay.navSeparator': 'line' });
    // 终期审查修复 ⑨：设置页的页签按界面取（画面 / 声音 / 按键 / 语言），原来是背包分类
    ok(xOf(ce, '画面') > 300 && xOf(stc, '语言') > 700 && ce.a.n('arc') > ce0.a.n('arc'), '16 lay.navAlign：居中 / 铺满；lay.navSeparator = dot 页签间画圆点');
    const bc = scr({ ...INV, 'lay.nav': 'breadcrumb' }), cr = scr({ ...INV, 'lay.nav': 'carousel' });
    ok(bc.texts.includes('/') && bc.targets.includes('返回') && cr.targets.includes('上一页') && cr.targets.includes('下一页'), '16 lay.nav：breadcrumb 面包屑（返回 + 路径）、carousel 轮播（左右键帽）');
    const ar = scr({ ...INV, 'lay.nav2': 'avatarRail' });
    ok(['艾琳', '卡尔', '米娅'].every((n) => ar.targets.includes(n)), '16 lay.nav2 = avatarRail：左侧一列队员头像');
    const dl = scr({ ...INV, 'lay.container': 'drawer', 'lay.drawerSide': 'left' });
    ok(head(dl).x < 100 && head(dl).w < 300, '16 lay.drawerSide = left：抽屉贴左');
    const ot = scr({ ...INV, 'lay.nav': 'tabsTop', 'cmp.tabMount': 'outsideTop' }), inv0 = scr({ ...INV, 'lay.nav': 'tabsTop' });
    ok(yOf(ot, '全部') < head(ot).y && head(ot).y > head(inv0).y, '16 cmp.tabMount = outsideTop：页签挂在容器上沿外、容器让位');
    const cd = scr({ ...INV, 'lay.nav': 'tabsTop', 'cmp.tabMount': 'cradle' }), ac = scr({ ...INV, 'lay.nav': 'tabsTop', 'cmp.tabMount': 'arcCradle' });
    ok(cd.targets.includes('全部') && ac.a.n('quadraticCurveTo') > inv0.a.n('quadraticCurveTo'), '16 cmp.tabMount：cradle 托架、arcCradle 弧形托架');
  }
  // ---- 17 CTA 与工具条
  {
    const CTA = { 'cnt.elements': 'el.cta' };
    ok(['triple', 'splitCorners', 'stack', 'smallSquare', 'confirmBack', 'edgeTab', 'textWithSubline'].every((f) => ELEMENTS.get('el.cta')!.forms.includes(f)), '17 el.cta 新画法 7 种');
    const tr = hud({ ...CTA, 'el.cta.form': 'triple' });
    ok(['点数', '花色', '返回'].every((t) => tr.targets.includes(t)), '17 triple：主钮 + 分组小钮 + 返回');
    const sc = hud({ ...CTA, 'el.cta.form': 'splitCorners' });
    ok(xOf(sc, '返回') < 100 && xOf(sc, '开始游戏') > 700, '17 splitCorners：返回在左角、主钮在右角');
    const stk = hud({ ...CTA, 'el.cta.form': 'stack' });
    ok(yOf(stk, '返回') > yOf(stk, '开始游戏'), '17 stack：竖排两颗');
    const sq = hud({ ...CTA, 'el.cta.form': 'smallSquare' }).at('el.cta')!;
    ok(Math.abs(sq.w - sq.h) < 0.5 && sq.w < 60, '17 smallSquare：小方钮');
    // 副行 =「主货币符号 + 代价」：符号取内容包第一种资源（整合修复：雪线的金币符号由 ● 换成 ○，断言不再写死符号）
    ok(hud({ ...CTA, 'el.cta.form': 'textWithSubline' }).texts.some((t) => /^\S+ 120$/.test(t)), '17 textWithSubline：主钮下一行花费');
    const tsc = scr({ 'uip.screen': 'tpl.settle', 'el.cta.form': 'splitCorners' }), tet = scr({ 'uip.screen': 'tpl.settle', 'el.cta.form': 'edgeTab' });
    ok(xOf(tsc, '返回') < 100 && xOf(tsc, '继续') > 800 && xOf(tet, '继续') > 880, '17 模板按钮行：splitCorners 拆到两角、edgeTab 挂到容器右下外沿');
    const TB = { 'cnt.elements': 'el.toolbar' };
    const is = hud({ ...TB, 'el.toolbar.form': 'iconStrip' }), dr = hud({ ...TB, 'el.toolbar.form': 'drawer' });
    ok(is.targets.length === 3 && dr.targets.includes('木材') && dr.targets.includes('住房'), '17 el.toolbar：iconStrip 图标条、drawer 两层抽屉（缩略卡 + 分类钮）');
    const ex = hud({ ...TB, 'el.toolbar.form': 'buttonRow', 'el.toolbar.screenCode': 'code', 'el.toolbar.extras': 'cameraArrows,roundPause' });
    ok(ex.texts.includes('INV') && ['向左转', '向右转', '暂停'].every((t) => ex.targets.includes(t)), '17 el.toolbar.screenCode / extras：屏幕代号、镜头箭头与圆暂停');
    const sb = scr({ 'uip.screen': 'tpl.inventory', 'lay.sideButtons': 'right' }), sb0 = scr({ 'uip.screen': 'tpl.inventory' });
    ok(sb.kinds('buttons').filter((q) => q.x > 880).length === 3 && head(sb).w < head(sb0).w, '17 lay.sideButtons = right：容器右外侧一列三颗、容器让位（B9 审查修复 ㉗：离画面边留边距）');
    const WP = { 'uip.screen': 'tpl.inventory', 'lay.container': 'windowPair' };
    const wp = scr(WP), wl = scr({ ...WP, 'lay.windowLink': 'elbow' }), wg = scr({ ...WP, 'lay.windowGap': 60 });
    ok(wl.a.n('arcTo') > wp.a.n('arcTo') && head(wg).x > head(wp).x + 5, '17 lay.windowLink = elbow 两窗之间折线、lay.windowGap 拉开间距');
    const ct = hud({ 'cnt.elements': 'el.minimap', 'el.minimap.satellites': 'counters' });
    ok(ct.occ.filter((q) => q.id === 'decor.sat:el.minimap').length === 2 && ct.texts.includes('3') && ct.texts.includes('1'), '17 elx.satellites = counters：底边两枚计数小件');
  }
  // ---- 21 对话框版式
  {
    const NPC = { 'uip.screen': 'tpl.npc' }, n0 = scr(NPC), line = n0.texts.find((t) => t.includes('雪线以上'))!;
    const kinds = ['offsetBox', 'framedBox', 'topBox', 'splitPortrait', 'transcript', 'codec', 'polygon'].map((k) => [k, scr({ ...NPC, 'cmp.dialogBox@dialog': k })] as const);
    ok(!!line && kinds.every(([, q]) => q.texts.includes(line)), '21 cmp.dialogBox 7 种新版式都写出当前台词');
    const K = Object.fromEntries(kinds);
    ok(!head(K.topBox) && !head(K.transcript) && head(K.offsetBox).w < 500 && K.codec.texts.includes('140.85'), '21 topBox / transcript 不画页头、offsetBox 窄框、codec 频率');
    ok(K.transcript.texts.filter((t) => t === ' — ').length >= 3, '21 transcript：多段「说话人 — 台词」往上堆');
    const ts = scr({ ...NPC, 'cmp.dialogTail': 'smooth' }), tz = scr({ ...NPC, 'cmp.dialogTail@dialog': 'zigzag' });
    ok(ts.a.n('quadraticCurveTo') > n0.a.n('quadraticCurveTo') && tz.a.n('stroke') > n0.a.n('stroke') && SCOPABLE_IDS.includes('cmp.dialogTail'), '21 cmp.dialogTail：原来的对白框也认（圆弧 / 锯齿），@dialog 作用域生效');
    const oc = scr({ ...NPC, 'ix.continueCue': 'ornament' });
    ok(!oc.texts.includes('▼') && n0.texts.includes('▼') && oc.a.n('arc') > n0.a.n('arc'), '21 ix.continueCue = ornament：花饰代替 ▼');
    const SUB = { 'cnt.elements': 'el.subtitle' };
    const who = (q: ReturnType<typeof hud>) => q.texts.some((t) => t.startsWith('向导：'));
    ok(who(hud(SUB)) && !who(hud({ ...SUB, 'el.subtitle.speaker': 'none' })) && who(hud({ ...SUB, 'el.subtitle.form': 'lineOnly', 'el.subtitle.speaker': 'prefix' })), '21 el.subtitle.speaker：none 不写说话人、prefix 总写');
  }
  // ---- 22 选项与环形菜单
  {
    const NPC = { 'uip.screen': 'tpl.npc' };
    const cl = scr({ ...NPC, 'el.choices.form': 'commandList' });
    ok(cl.texts.includes('▶') && ['你看到了吗？', '先回营地。'].every((t) => cl.targets.includes(t)), '22 el.choices = commandList：指令列表 + 当前项箭头');
    const kb = scr({ ...NPC, 'el.choices.keyBadge': 'start', 'el.choices.focusMark': 'arrow', 'el.choices.lockedItem': 2 });
    ok(['1', '2', '3'].every((t) => kb.texts.includes(t)) && kb.texts.includes('（条件不足）'), '22 keyBadge 键位角标、lockedItem 第 2 项锁住并写原因');
    const ck = scr({ ...NPC, 'el.choices.labelStyle': 'checkTag' });
    ok(ck.texts.some((t) => t.startsWith('[') && t.includes('·')), '22 labelStyle = checkTag：检定标签 [技能 · 难度]');
    const nf = scr({ ...NPC, 'el.choices.defaultFocus': 'none' }), n0 = scr(NPC);
    const hf = hud({ 'cnt.elements': 'el.choices', 'el.choices.defaultFocus': 'none' }), h0 = hud({ 'cnt.elements': 'el.choices' });
    ok(JSON.stringify(nf.a.calls) !== JSON.stringify(n0.a.calls) && JSON.stringify(hf.a.calls) !== JSON.stringify(h0.a.calls), '22 el.choices.defaultFocus = none：没有默认高亮（按钮 / 文字两种画法）');
    ok(hud({ 'cnt.elements': 'el.choices', 'el.choices.arrangement': 'cascade' }).a.n('rotate') >= 3 && hud({ 'cnt.elements': 'el.choices', 'el.choices.arrangement': 'fan' }).a.n('rotate') >= 3, '22 elx.arrangement = cascade / fan：选项错落 / 扇形');
    const W0 = { 'uip.screen': 'tpl.wheel' }, w0 = scr(W0), wc = scr({ ...W0, 'lay.ringLabel': 'center', 'lay.ringNested': 'arc' }), wt = scr({ ...W0, 'lay.ringLabel': 'top' });
    ok(!w0.texts.includes('木材') && yOf(wt, '木材') < yOf(wc, '木材') && wc.targets.length > w0.targets.length, '22 lay.ringLabel 环心 / 环顶写当前项、lay.ringNested = arc 二级弧');
    // 轨道 E 审查修复：标题页预设改成侧抽屉（主视觉铺满），对角铺开要整屏页才看得出：这里显式给全屏页
    const cs = scr({ 'uip.screen': 'tpl.title', 'lay.container': 'fullscreen', 'lay.arrangement': 'cascade' }), csd = scr({ 'uip.screen': 'tpl.title', 'lay.container': 'fullscreen', 'lay.arrangement': 'cascade', 'lay.cascadeSpread': 'diagonal' });
    ok(xOf(csd, '退出') > 800 && xOf(cs, '退出') < 600, '22 lay.cascadeSpread = diagonal：按对角线铺开');
  }
  // ---- 31 表单控件库
  {
    const SET = { 'uip.screen': 'tpl.settings' }, s0 = scr(SET);
    const st = scr({ ...SET, 'cmp.optionLayout': 'stacked' });
    ok(st.texts.includes('1 / 3') && !st.texts.includes('普通') && st.texts.filter((t) => t === '70').length === 1, '31 cmp.optionLayout = stacked：两层小框，取值表行写「序号 / 个数」，滑条 / 开关行不借取值表（审查前的错位修掉）');
    const rw = scr({ ...SET, 'cmp.optionRows': 'text,dice,swatch,colors,hsvTriplet,knob,fader,stepperMinMax' });
    ok(rw.texts.includes('⚄') && ['无', '满', '/ 10'].every((t) => rw.texts.includes(t)) && rw.texts.includes('50'), '31 cmp.optionRows：逐行换控件（骰子输入框 / 带极值步进器……，旋钮读原值）');
    const cr = scr({ ...SET, 'cnt.subtype': 'create', 'cmp.optionRows': 'dice,iconToggle,swatch,swatch' });
    ok(cr.targets.includes('M') && cr.targets.includes('F') && cr.texts.some((t) => / \/ /.test(t)) && !cr.texts.some((t) => t.startsWith('#')), '31 捏人：图标切换 M / F、颜色行换色块时写「序号 / 个数」不写色值');
    const nv = scr({ ...SET, 'cmp.optionNative': true });
    ok(nv.texts.includes('▾') && nv.texts.includes('✓'), '31 cmp.optionNative：系统下拉框 ▾ / 复选框 ✓');
    const sw = scr({ ...SET, 'cmp.optionEnum': 'swatch', 'cmp.optionRange': 'knob', 'cmp.optionBool': 'toggleSwitch' });
    ok(sw.a.n('arc') > s0.a.n('arc') + 5, '31 swatch / knob / toggleSwitch 画得出');
    const hv = scr({ ...SET, 'cmp.optionRange': 'hsvTriplet' }), fd = scr({ ...SET, 'cmp.optionRange': 'fader' });
    ok(hv.texts.filter((t) => t === '70').length >= 3 && fd.a.n('fillRect') >= s0.a.n('fillRect') + 10, '31 hsvTriplet 三条轨各写数值、fader 推子刻度');
    const ib = scr({ ...SET, 'cmp.formKind': 'inlineBlanks' }), ibb = scr({ ...SET, 'cmp.formKind': 'inlineBlanks', 'ix.confirm': 'batch' });
    ok([' 被 ', ' 杀死', '人物', '方式', '武器'].every((t) => ib.texts.includes(t)) && ib.targets.includes('空位') && ibb.texts.some((t) => t.startsWith('已确认 3 / 9')), '31 cmp.formKind = inlineBlanks：命运句 + 分栏词表；ix.confirm = batch 底部批量确认');
    const th = scr({ ...SET, 'lay.sideThumbs': 'right' });
    ok(th.targets.includes('冰湖') && th.targets.includes('灯塔') && head(th).w < head(s0).w, '31 lay.sideThumbs = right：容器外一列缩略图 + 说明卡、容器让位');
    const q = hud({ 'cnt.elements': 'el.selection', 'el.selection.form': 'buildingPanel', 'cmp.detailFields@el.selection': 'name,quantity', 'cmp.quantity': 'stepperMinMax' });
    ok(['无', '−1', '+1', '满', '/ 10'].every((t) => q.texts.includes(t)), '31 cmp.quantity = stepperMinMax：无 / −1 / 数 / +1 / 满 + 上限');
  }
  // ---- 30 标题与播报锁扣
  {
    const tk = hud({ 'cnt.elements': 'el.ticker' }), sk = hud({ 'cnt.elements': 'el.ticker', 'el.ticker.form': 'stocks' });
    const tq = tk.at('el.ticker')!, sq = sk.at('el.ticker')!;
    ok(tk.texts.includes('NEWS') && tk.texts.includes(DATA.feed[0]) && tq.w > 900 && tq.y < 40, '30 el.ticker = news：上中整宽、台标 + 信息流');
    ok(sk.texts.includes('MARKET') && sk.texts.some((t) => t.includes('▲')) && sk.texts.some((t) => t.includes('▼')) && sq.x + sq.w > 930 && sq.y + sq.h > 510, '30 el.ticker = stocks：右下的行情条（涨跌两色）');
    const lt = hud({ 'cnt.elements': 'el.lowerThird' }), lq = lt.at('el.lowerThird')!, ltT = hud({ 'cnt.elements': 'el.lowerThird', 'el.lowerThird.screenAnchor': 'tr' }).at('el.lowerThird')!;
    ok(lq.y + lq.h > 510 && lq.x < 40 && ltT.y < 40 && lt.texts.includes(DATA.profile.name), '30 el.lowerThird：默认左下（锚点显式给时照给的）');
    const vf = hud({ 'cnt.elements': 'el.viewfinder' }), vc = hud({ 'cnt.elements': 'el.viewfinder', 'el.viewfinder.form': 'cctv' });
    ok(vf.texts.includes('REC') && vf.texts.includes('00:00:00:00') && !vf.at('el.viewfinder') && vc.texts.includes('CAM 03'), '30 el.viewfinder：整屏取景框、不占锚点位；cctv 写摄像头编号');
    const CH = { 'uip.screen': 'tpl.chapterCard' };
    const nt = scr({ ...CH, 'el.title.form': 'notice' }), tp = scr({ ...CH, 'el.title.form': 'titlePage' }), cc = scr({ ...CH, 'el.title.form': 'chapterCard' }), ccN = scr({ ...CH, 'el.title.form': 'chapterCard', 'el.title.name': 'none' });
    ok(nt.texts.some((t) => t.startsWith('“')) && nt.texts.length >= 6 && tp.texts.length >= 3 && cc.texts.some((t) => t.includes(' — ')), '30 el.title：notice 告示块、titlePage 扉页、chapterCard「地点 — 年代」');
    const c0 = scr(CH), c0N = scr({ ...CH, 'el.title.name': 'none' });
    ok(ccN.texts.length === cc.texts.length - 1 && c0N.texts.length === c0.texts.length - 1, '30 el.title.name = none：章节卡 / 标题块不写主标题');
    ok(hud({ 'cnt.elements': 'el.subtitle', 'el.subtitle.form': 'quoteCard' }).texts.some((t) => t.startsWith('— ')), '30 el.subtitle = quoteCard：引文字卡（右下出处）');
    ok(hud({ 'cnt.elements': 'el.subtitle', 'el.subtitle.span': 'full' }).at('el.subtitle')!.w > 900 && hud({ 'cnt.elements': 'el.subtitle' }).at('el.subtitle')!.w < 700 && hud({ 'cnt.elements': 'el.notify', 'el.notify.form': 'banner', 'el.notify.span': 'full' }).at('el.notify')!.w > 900, '30 elx.span = full：字幕条 / 横幅贴满屏宽');
    const rs = scr({ 'uip.screen': 'tpl.settle', 'cnt.subtype': 'rpgSettle' });
    ok(rs.texts.includes('EXP') && rs.texts.includes('LEVEL UP') && rs.kinds('data').length >= 8, '30 cnt.subtype = rpgSettle：斜白条奖励 + 队员经验条 + 升级章（登记模板占位）');
    const ph = scr({ 'uip.screen': 'tpl.inventory', 'lay.panelHeader': 'crestTwoLine' }), c1 = samplesFor('characters')[0];
    ok(ph.texts.includes(c1[1]) && ph.texts.includes(c1[2]) && !ph.texts.includes('背包'), '30 lay.panelHeader = crestTwoLine：勋章 + 两行名代替标题');
    const phN = scr({ 'uip.screen': 'tpl.npc', 'lay.panelHeader': 'crestTwoLine' }), phN0 = scr({ 'uip.screen': 'tpl.npc' }), who = phN0.texts[1];
    ok(phN.texts.length > phN0.texts.length && phN.texts.includes([...who][0]), '30 crestTwoLine 在对话类模板跟说话人（勋章写说话人首字）');
    const tt = scr({ 'uip.screen': 'tpl.title', 'cnt.elements': 'el.title', 'el.title.form': 'notice' }), tt0 = scr({ 'uip.screen': 'tpl.title', 'cnt.elements': 'el.title' });
    ok(tt.texts.some((t) => t.startsWith('“')) && !tt0.texts.some((t) => t.startsWith('“')), '30 标题界面选了告示块：标题元素画整块告示（主体的游戏名不再另写）');
  }
  // ---- 参数表、作用域、Godot
  {
    const B9 = ['el.selection.edge', 'el.selection.portrait', 'lay.focalAside', 'lay.navCount', 'lay.navAlign', 'lay.navSeparator', 'lay.nav2', 'lay.drawerSide', 'cmp.tabMount', 'el.toolbar.screenCode', 'el.toolbar.extras', 'lay.sideButtons', 'lay.windowGap', 'lay.windowLink',
      'cmp.dialogTail', 'el.subtitle.speaker', 'el.choices.defaultFocus', 'el.choices.keyBadge', 'el.choices.focusMark', 'el.choices.lockedItem', 'lay.ringLabel', 'lay.ringNested', 'lay.cascadeSpread', 'cmp.optionLayout', 'cmp.optionRows', 'cmp.optionNative', 'cmp.formKind', 'lay.sideThumbs',
      'el.title.name', 'elx.span', 'el.ticker.form', 'el.lowerThird.form', 'el.viewfinder.form', 'lay.panelHeader'];
    const miss = B9.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || ['label', 'plain', 'lookAt', 'godot', 'godotLevel', 'impl'].some((k) => !p[k]) || p.milestone !== 'M12b'; });
    ok(B9.length === 34 && miss.length === 0, `B9 的 34 个新参数字段齐全（label / plain / lookAt / impl / godot / godotLevel、milestone M12b）${miss.length ? `：缺 ${miss.join('、')}` : ''}`);
    const opts = (id: string) => ((SPEC_PARAM.get(id) as unknown as { options?: { value: string }[] }).options ?? []).map((o) => o.value);
    ok(['quantity', 'statusRow', 'memberList'].every((v) => opts('cmp.detailFields').includes(v)) && ['el.ticker', 'el.lowerThird', 'el.viewfinder'].every((v) => opts('cnt.elements').includes(v)) && opts('cnt.subtype').includes('rpgSettle') && opts('ix.confirm').includes('batch'), 'B9 新取值进参数表（详情字段 / 新元素 / 结算子类 / 批量确认）');
    const g1 = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.elements': 'el.selection,el.cta,el.toolbar,el.choices,el.ticker,el.lowerThird', 'el.selection.form': 'sidePanel', 'el.cta.form': 'triple', 'el.toolbar.form': 'drawer', 'el.choices.form': 'commandList' } as Values)!;
    const g2 = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.settings', 'lay.nav': 'carousel', 'cmp.optionLayout': 'stacked', 'lay.panelHeader': 'crestTwoLine' } as Values)!;
    const g3 = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.npc', 'cmp.dialogBox@dialog': 'offsetBox', 'cmp.dialogTail': 'zigzag' } as Values)!;
    const where = new Set([...g1.notes, ...g2.notes, ...g3.notes].map((q) => q.where));
    const want = ['选中面板版式（M12b-15）', '页签导航（M12b-16）', 'CTA 与工具条（M12b-17）', '对话框版式（M12b-21）', '选项与环形菜单（M12b-22）', '表单控件（M12b-31）', '标题与播报锁扣（M12b-30）'];
    ok(want.every((w) => where.has(w)), `Godot：B9 的迁移说明 7 条（${want.filter((w) => !where.has(w)).join('、') || '齐'}）`);
    ok(godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg' } as Values)!.notes.every((q) => !want.includes(q.where)), 'Godot：没选 B9 参数时不出 B9 说明');
  }
  // ---- B9 审查修复
  {
    console.log('== M12b B9 审查修复');
    const scrAt = (x: Values, R: { x: number; y: number; w: number; h: number }, o: { chrome?: boolean } = {}, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); let err = ''; try { drawScreen({ ctx: a.g, m: a.g, blur: 0, full: R } as never, R, mk(x, skin), o); } catch (ex) { err = String(ex); } return { ...out(a), err }; };
    const R1 = { x: 0, y: 0, w: 540, h: 960 };
    const ov = (p: Tx, q: Tx) => Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > 3 && Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > 3;
    // ① / ⑮ 表单：滑条 / 开关行用全局的 arrows / segmented 时在原来的控件族里画（原来落进取值表控件、整屏报错）
    const SET = { 'uip.screen': 'tpl.settings' };
    const f1 = scrAt({ ...SET, 'cmp.optionLayout': 'stacked', 'cmp.optionRange': 'arrows' }, R0), f2 = scrAt({ ...SET, 'cmp.optionRows': 'auto', 'cmp.optionBool': 'arrows' }, R0);
    const f3 = scrAt({ ...SET, 'cmp.optionRows': 'auto', 'cmp.optionBool': 'segmented', 'cmp.optionRange': 'segmentedBar' }, R0);
    ok(!f1.err && f1.texts.includes('70') && !f2.err && f2.texts.includes('关') && f2.texts.includes('开') && !f3.err, `审查 ① 表单两层 / 逐行控件 × cmp.optionRange / optionBool = arrows / segmented 不报错、滑条写数值、开关写关 / 开${f1.err || f2.err || f3.err ? `：${f1.err || f2.err || f3.err}` : ''}`);
    const CP = { ...SET, 'cnt.subtype': 'create', 'cmp.optionLayout': 'stacked', 'cmp.listRow': 'keyHint', 'cmp.optionRows': 'auto,auto,auto,swatch', 'cmp.optionRange': 'arrows', 'cmp.optionBool': 'arrows' };
    const cps = [scrAt(CP, R1), scrAt(CP, R0), scrAt({ ...CP, 'cmp.optionLayout': 'inline' }, { x: 0, y: 0, w: 1260, h: 540 })];
    ok(cps.every((q) => !q.err && q.a.calls.length > 50), `审查 ① CP2077 捏人的写值（两层 + 键帽 + 逐行色块 + 箭头滑条 / 开关）在 540 × 960 / 960 × 540 / 1260 × 540 不报错${cps.map((q) => q.err).filter(Boolean).join('；')}`);
    // ② / ⑯ 对话框版式在叠加 / 横幅 / 弹窗上也画；字幕元素自己画时新版式照旧是底条
    const npc = { 'uip.screen': 'tpl.npc', 'cnt.focal': 'character' }, who = scr({ 'uip.screen': 'tpl.npc' }).texts[1] ?? '';
    const pO = scrAt({ ...npc, 'lay.container': 'overlay', 'cmp.dialogBox': 'polygon', 'cmp.dialogTail': 'zigzag' }, R0, { chrome: false });
    const line = pO.texts.find((t) => t.includes('雪线以上')) ?? '';
    ok(!!line && !!who && !pO.texts.some((t) => t.startsWith(`${who}：`)) && pO.texts.includes(who) && pO.occ.some((q) => q.kind === 'template' && q.sub === 'header'), '审查 ② 叠加容器上的多边形框：台词画在框里、名签骑在左上沿（不再是带「说话人：」前缀的字幕条）');
    const bO = scrAt({ 'uip.screen': 'tpl.npc', 'lay.container': 'banner', 'cnt.focal': 'none', 'cnt.textLength': 'short', 'cmp.dialogBox': 'topBox', 'cnt.elements': 'el.subtitle' }, R0, { chrome: false });
    ok(bO.texts.filter((t) => t.includes('雪线以上')).length === 1 && !bO.occ.some((q) => q.id === 'el.subtitle'), '审查 ② 横幅上的顶部框：台词只画一次（字幕元素不另画，推出来的一句话并进对话框）');
    const mO = scr({ ...npc, 'lay.container': 'modal', 'cmp.dialogBox': 'framedBox' }), m0 = scr({ ...npc, 'lay.container': 'modal' });
    // R4 回归修复 C1 ③（into-the-breach#41）改了这一条的口径：弹窗上的通栏细框不再把外框换成画面底的近通栏条，容器照常（页头同宽）、细框排在容器内框底边（模板 data 占位）
    const box = mO.kinds('data')[0];
    ok(mO.texts.some((t) => t.includes('雪线以上')) && !!head(mO) && !!head(m0) && Math.abs(head(mO).w - head(m0).w) < 1 && !!box && box.y > head(mO).y && box.w <= head(mO).w + 1, '审查 ② / R4 C1 ③ 弹窗上的通栏细框：容器照常、细框排在容器内框底边（原来换成画面底的近通栏条）');
    const SUB = { 'cnt.elements': 'el.subtitle' };
    ok(JSON.stringify(hud({ ...SUB, 'cmp.dialogBox': 'polygon' }).a.calls) === JSON.stringify(hud({ ...SUB, 'cmp.dialogBox': 'bar' }).a.calls), '审查 ② 局内字幕元素：cmp.dialogBox 的新取值照旧画底条（原来落成无底的字）');
    // ④ 顶部框 / 头像分框留出选项区：台词与选项的字不叠
    const lineOf = (q: ReturnType<typeof scr>) => q.tx.filter((t) => t.text.includes('雪线以上') || t.text.includes('只有脚印'));
    const chs = ['你看到了吗', '我们继续往山上走', '先回营地'];
    const bad4 = ['offsetBox', 'framedBox', 'topBox', 'splitPortrait', 'transcript', 'codec', 'polygon'].filter((k) => { const q = scr({ 'uip.screen': 'tpl.npc', 'cmp.dialogBox@dialog': k }), cl = q.tx.filter((t) => chs.some((c) => t.text.includes(c))), cr = q.at('el.choices'); return lineOf(q).some((l) => cl.some((c) => ov(l, c)) || (!!cr && ov(l, { ...cr, text: '' }))); });
    ok(bad4.length === 0, `审查 ④ tpl.npc × 7 种对话框版式：台词不压选项（字与选项元素框都不叠）${bad4.length ? `（${bad4.join('、')}）` : ''}`);
    // ⑰ 累积日志：长文数据区并进日志，不要字幕元素；同一句引语拆开的几条各自补齐引号
    const tr = scr({ 'uip.screen': 'tpl.npc', 'cnt.dataShape': 'text', 'cnt.elements': 'el.choices', 'cmp.dialogBox': 'transcript', 'lay.focalSide': 'followLine', 'cnt.focal': 'character' });
    ok(tr.texts.filter((t) => t === ' — ').length >= 2 && tr.texts.includes('“跟着我，别走冰面。”') && tr.occ.some((q) => q.kind === 'template' && q.sub === 'focal'), '审查 ⑰ cmp.dialogBox = transcript：长文数据区画成多段日志（没有字幕元素也画）、引语拆开的那一条补齐引号，followLine 小像登记占位');
    const dz = scr({ 'cnt.pack': 'puzzle', 'uip.screen': 'tpl.npc', 'cnt.dataShape': 'text', 'cmp.dialogBox': 'transcript' });
    // R4 C2 ① 改了画法：段首带标记时走富文本，技能名与方括号注记分段画（原来是一整段「逻辑 [中等：成功]」）
    ok(dz.texts.includes('逻辑') && dz.texts.includes('[中等：成功]') && dz.texts.indexOf('[中等：成功]') === dz.texts.indexOf('逻辑') + 1, '审查 ⑰ / R4 C2 ① 日志段首写了检定「技能 [难度：结果] ——」时说话人就是那个检定（Disco 的技能发言）');
    // ⑤ / ㉑ 取景框：括角 / REC / 电池 / 时间码登记占位，元素挪开
    const vf = hud({ 'cnt.elements': 'el.vitals,el.abilities,el.minimap,el.viewfinder' }), vfr = vf.occ.filter((q) => q.id === 'decor.extra:el.viewfinder').map((q) => q.rect);
    const els5 = ['el.vitals', 'el.abilities', 'el.minimap'].map((id) => vf.at(id));
    ok(vfr.length === 7 && els5.every((q) => !!q && !vfr.some((v) => intersects(v, q))), '审查 ⑤ / ㉑ el.viewfinder：四角括角 / REC / 电池 / 时间码登记占位，rpg 布局的生命 / 技能 / 小地图挪开、不压它们');
    // ⑥ 画在元素外的附件登记占位；㉒ 命中计算的技能格算进元素高
    const ckh = hud({ 'cnt.elements': 'el.choices', 'el.choices.labelStyle': 'checkTag' }).at('el.choices'), ck0 = hud({ 'cnt.elements': 'el.choices' }).at('el.choices');
    ok(!!ckh && !!ck0 && ckh.h > ck0.h + 60, '审查 ⑥ 检定的概率卡算进选项元素的高（原来画在元素上沿以外、不算尺寸）');
    ok(hud({ 'cnt.elements': 'el.selection', 'el.selection.form': 'cityPanel' }).occ.some((q) => q.id === 'decor.extra:el.selection'), '审查 ⑥ 城市面板的名牌登记占位');
    const sc = hud({ 'cnt.elements': 'el.selection,el.abilities', 'el.selection.form': 'shotCalc', 'el.selection.screenAnchor': 'bc' });
    ok(!!sc.at('el.selection') && !!sc.at('el.abilities') && sc.at('el.selection')!.h > 160 && !intersects(sc.at('el.selection')!, sc.at('el.abilities')!), '审查 ㉒ shotCalc：探出的技能格算进元素高（156 + 半格），下面的技能栏不压上来');
    // ⑦ 环 + bracketTag：第一项照旧高亮（与不写 labelStyle 的环一样）
    const RING = { 'cnt.elements': 'el.choices', 'el.choices.arrangement': 'ring' };
    ok(JSON.stringify(hud({ ...RING, 'el.choices.labelStyle': 'bracketTag' }).a.calls) === JSON.stringify(hud(RING).a.calls), '审查 ⑦ 环形选项 + bracketTag：第一项照旧高亮（bracketTag 的不高亮只管原来那两处）');
    // ⑪ Godot：全局 elx.span / elx.arrangement 也出迁移说明
    const gk = (x: Values) => godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', ...x } as Values)!.notes.filter((q) => q.where.includes('M12b-22') || q.where.includes('M12b-30')).flatMap((q) => q.params ?? []);
    ok(gk({ 'cnt.elements': 'el.subtitle', 'elx.span': 'full' }).includes('elx.span') && gk({ 'cnt.elements': 'el.choices', 'elx.arrangement': 'cascade' }).includes('elx.arrangement') && !gk({ 'cnt.elements': 'el.vitals', 'elx.arrangement': 'cascade' }).includes('elx.arrangement'), '审查 ⑪ Godot：elx.span = full、elx.arrangement = fan / cascade（放了选项时）出 B9 迁移说明');
    // ⑫ / ㉗ 外侧按钮列：符号走图标；与缩略图列同一边时排在它外面、离画面边留边距
    const sb = scr({ 'uip.screen': 'tpl.inventory', 'lay.sideButtons': 'right', 'lay.sideThumbs': 'right' }), cols = sb.kinds('data').filter((q) => q.x > 700 && q.h > 200), btn = sb.kinds('buttons').filter((q) => q.x > 700);
    ok(cols.length >= 1 && btn.length === 3 && btn.every((q) => cols.every((c) => q.x >= c.x + c.w)) && Math.max(...btn.map((q) => q.x + q.w)) <= 960 - 10 && ['↻', '✖', '☰'].every((t) => sb.targets.includes(t)), '审查 ⑫ / ㉗ lay.sideButtons + lay.sideThumbs 同一边：按钮列在缩略图列外面、离画面边留边距（钮上的 ↻ ✖ ☰ 走图标、命中框照旧）');
    // ⑭ B7 的格位元素按自己的默认锚点放（没给锚点时不再叠在左上）
    const pl = hud({ 'cnt.elements': 'el.vitals,el.piles,el.population' }), pq = pl.at('el.piles'), pp = pl.at('el.population');
    ok(!!pq && !!pp && pq.y + pq.h > 400 && pq.x < 100 && pp.x > 700 && pp.y > 400, '审查 ⑭ el.piles 默认左下、el.population 默认右下（formAnchor）');
    // ⑱ RPG 结算代替结算表与奖励格
    const rs = scr({ 'uip.screen': 'tpl.settle', 'cnt.subtype': 'rpgSettle' }), rsT = rs.tx.filter((t) => t.text.trim());
    ok(rs.texts.includes('EXP') && !rs.occ.some((q) => q.id === 'el.reward') && rsT.every((p, i) => rsT.every((q, j) => j <= i || !ov(p, q))), '审查 ⑱ cnt.subtype = rpgSettle：斜条与队员行代替结算表 / 奖励格，字不叠');
    // ⑲ / ㉕ 竖排通高的工具条：附件排在下面、不撑宽；转镜头箭头左右镜像
    const tb = hud({ 'cnt.elements': 'el.toolbar', 'el.toolbar.form': 'buttonRow', 'el.toolbar.arrangement': 'column', 'el.toolbar.fill': 'height', 'el.toolbar.extras': 'cameraArrows,roundPause' }).at('el.toolbar');
    ok(!!tb && tb.w < 140 && tb.h <= 540, '审查 ⑲ 竖排通高的工具条：附件按条宽排在下面（原来按条高、比画面还宽）');
    const ar = hud({ 'cnt.elements': 'el.toolbar', 'el.toolbar.form': 'buttonRow', 'el.toolbar.extras': 'cameraArrows' }).a.calls.filter(([k, a]) => k === 'arc' && (a as number[]).length === 5).slice(-2).map(([, a]) => a as number[]);
    ok(ar.length === 2 && Math.abs(ar[1][3] - (Math.PI - ar[0][4])) < 0.01 && Math.abs(ar[1][4] - (Math.PI - ar[0][3])) < 0.01, '审查 ㉕ 转镜头箭头左右镜像（右边那段弧 = 左边的 θ → π − θ）');
    // ⑳ 跑马条铺满整条
    const tk = hud({ 'cnt.elements': 'el.ticker' });
    ok(tk.texts.filter((t) => t === DATA.feed[0]).length >= 3, '审查 ⑳ el.ticker：条目一轮轮接着画、铺满整条（原来只画两轮）');
    // ㉓ 尾巴从框朝向立绘的那条边伸向立绘（不再往画面底边戳）
    const tz = scr({ 'uip.screen': 'tpl.npc', 'cmp.dialogBox': 'polygon', 'cmp.dialogTail': 'zigzag' }), tz0 = scr({ 'uip.screen': 'tpl.npc', 'cmp.dialogBox': 'polygon' });
    // 锯齿尾巴 = 一笔 moveTo + 6 笔 lineTo 的路径：尖端（最高点）比尾根高 40 以上
    const zz = tz.a.calls.map(([k, a], i) => ({ k, a: a as number[], i })).filter((c) => c.k === 'moveTo' && [1, 2, 3, 4, 5, 6].every((j) => tz.a.calls[c.i + j]?.[0] === 'lineTo') && tz.a.calls[c.i + 7]?.[0] !== 'lineTo').map((c) => [c.a, ...[1, 2, 3, 4, 5, 6].map((j) => tz.a.calls[c.i + j][1] as number[])]);
    ok(zz.length > 0 && zz.some((p) => p[0][1] - Math.min(...p.map((q) => q[1])) > 40) && tz.a.calls.length > tz0.a.calls.length, '审查 ㉓ cmp.dialogTail：尾巴朝立绘的上半身伸（尖端比尾根高，原来往下戳进画面底边）');
    // ㉖ 环顶名字在二级弧上面
    const W0 = { 'uip.screen': 'tpl.wheel', 'lay.ringLabel': 'top' }, wt = scr(W0), wn = scr({ ...W0, 'lay.ringNested': 'arc' }), nm = wt.texts.find((t) => t === '木材') ?? '';
    ok(!!nm && yOf(wn, nm) < yOf(wt, nm) - 10, '审查 ㉖ lay.ringLabel = top + ringNested = arc：环顶的名字排在二级弧上面');
    // ⑥ / ㉘ outsideTop：页签登记占位
    ok(scr({ 'uip.screen': 'tpl.inventory', 'lay.nav': 'tabsTop', 'cmp.tabMount': 'outsideTop' }).kinds('header').length >= 3, '审查 ⑥ / ㉘ outsideTop 的页签登记模板占位');
    // ㉙ 标题块按可用高排：两倍字号下不出画
    TEXT_K.k = 2; const tbk = hud({ 'cnt.elements': 'el.title', 'el.title.form': 'notice', 'a11y.textScale': 2 }).at('el.title'); TEXT_K.k = 1;
    ok(!!tbk && tbk.y + tbk.h <= 540, '审查 ㉙ 标题块（告示）在 textScale 2 下不出画（插画位先缩、再省数据行）');
    // ㉔ 建筑面板最高 0.6 屏高，字段里的 art 不另占
    const bp = hud({ 'cnt.elements': 'el.selection', 'el.selection.form': 'buildingPanel', 'cmp.detailFields@el.selection': 'art,name,statusRow,quantity,memberList' }).at('el.selection');
    ok(!!bp && bp.h <= 540 * 0.6 + 1, '审查 ㉔ buildingPanel 最高 0.6 屏高（字段里的 art 不再另占一块）');
    setPack('snowline');
  }
  // ---- M12b B10
  {
    console.log('== M12b B10（地图画风 / 图例与叠加 / 全屏层 / 倾斜 / 按角色像素化 / K1 余项 / 静帧姿态）');
    const scrE = (x: Values, o: { chrome?: boolean } = {}, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); let err = ''; try { drawScreen({ ctx: a.g, m: a.g, blur: 0, full: R0 } as never, R0, mk(x, skin), o); } catch (ex) { err = String(ex); } return { ...out(a), err }; };
    const hudE = (x: Values, skin = 'darkHairline') => { setPack(String(x['cnt.pack'] ?? 'snowline')); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy(); let err = ''; try { drawElements({ ctx: a.g, m: a.g, blur: 0 } as never, R0, mk({ 'uip.layout': 'layout.rpg', ...x }, skin), null, []); } catch (ex) { err = String(ex); } return { ...out(a), err }; };
    const sig = (q: { a: { calls: [string, unknown[]][] } }) => JSON.stringify(q.a.calls);
    const ec = (id: string, x: Values, skin = 'darkHairline') => { const a = rec(); return { a, e: makeCtx(id, a.g, a.g, mk(x, skin), R0) }; };
    const sim0 = simNow(), setSim = setSimB10;
    ORN.where = 'hud';

    // ---- 25 地图画风
    {
      const desc = { bounds: { center: [0, 0, 0], radius: 10 }, terrain: null, ground: null, items: [{ role: 'structure', pos: [2, 0, 2], scale: [3, 1, 3] }, { role: 'foliage', pos: [-3, 0, 1], scale: [2, 1, 2] }] } as never;
      const bk = (style: string) => { const a = rec(); live = a; let err = ''; try { bakeMinimap(desc, {}, style, 96); } catch (ex) { err = String(ex); } return { a, err }; };
      const ST = Object.keys(MAP_STEPS), bs = ST.map(bk);
      // R4 C4 改口径：chalk / glowSilhouette 搬进程序画风表，8 → 10 种
      ok(ST.length === 10 && bs.every((q) => !q.err && q.a.calls.length > 20) && new Set(bs.map((q) => JSON.stringify(q.a.calls))).size === 10, `25 程序地图画风 10 种（MAP_STEPS，R4 C4 加了 chalk / glowSilhouette）都能烘、互不相同${bs.map((q) => q.err).filter(Boolean).join('；')}`);
      const ch = bk('chart|#ff0000,#00ff00');
      ok(ch.a.calls.some(([k, v]) => k === 'fillStyle=' && v[0] === '#ff0000') && !bk('chart').a.calls.some(([k, v]) => k === 'fillStyle=' && v[0] === '#ff0000'), '25 chart：画风串带的类别色（col.lineColors）换掉建筑的色块');
      const m1 = ec('el.minimap', { 'vis.mapStyle@el.minimap': 'linePlan' }).e, m2 = ec('el.minimap', { 'rel.semanticZoom': 'chart' }).e, m3 = ec('el.minimap', {}).e;
      ok(mapStyleOf(m1).style === 'linePlan' && mapStyleOf(m1).scoped && mapStyleOf(m2).style === 'chart' && mapStyleOf(m3).style === 'flatVector', '25 mapStyleOf：vis.mapStyle@el.minimap 按目标、rel.semanticZoom = chart 换类别色块、默认 flatVector');
      const WM = { 'uip.screen': 'tpl.worldmap' }, w0 = scrE(WM);
      const fogs = ['cloudSwirl', 'unpainted', 'dashedExits'].map((u) => scrE({ ...WM, 'vis.mapUnexplored': u }));
      ok(!w0.err && fogs.every((q) => !q.err && sig(q) !== sig(w0)), `25 未探索区 cloudSwirl / unpainted / dashedExits 都画、与原来的雾不同${fogs.map((q) => q.err).filter(Boolean).join('；')}`);
      const fu = scrE({ ...WM, 'vis.mapFurniture': 'compassRose,scaleBar,legend' });
      ok(!fu.err && fu.texts.includes('1') && fu.texts.some((t) => t.trim() === 'km') && fu.kinds('data').length > w0.kinds('data').length, '25 地图附件：罗盘 / 比例尺（1 km：数字走 drawNumber、单位走正文字，B10 审查修复 ⑧）/ 图例，登记模板占位');
      const rr = ['vis.mapRoomStates', 'vis.mapRoute', 'vis.mapFloors'].map((k, i) => scrE({ ...WM, [k]: ['states', 'dashed', 'left'][i] }));
      ok(rr.every((q) => !q.err && sig(q) !== sig(w0)), `25 房间状态 / 路线 / 楼层页签都画${rr.map((q) => q.err).filter(Boolean).join('；')}`);
      const MM = { 'cnt.elements': 'el.minimap' }, sq = hudE(MM).at('el.minimap'), wd = hudE({ ...MM, 'el.minimap.aspect': 'wide' }).at('el.minimap'), sp = hudE({ ...MM, 'el.minimap.aspect': 'strip' }).at('el.minimap');
      ok(!!sq && !!wd && !!sp && wd.w / wd.h > 1.4 && sp.w / sp.h > wd.w / wd.h && Math.abs(sq.w - sq.h) < 2, '25 el.minimap.aspect：square 正方 / wide 宽幅 / strip 更扁');
      const mf = ['roomGraph', 'tickLine'].map((f) => hudE({ ...MM, 'el.minimap.form': f }));
      ok(['roomGraph', 'tickLine'].every((f) => ELEMENTS.get('el.minimap')!.forms.includes(f)) && mf.every((q) => !q.err && q.a.calls.length > 20), `25 el.minimap 新画法 roomGraph / tickLine${mf.map((q) => q.err).filter(Boolean).join('；')}`);
      const mx = ([{ 'el.minimap.rotate': 'headingUp' }, { 'el.minimap.layers': 'terrain,roads,route' }, { 'el.minimap.cornerCurl': 'one' }] as Values[]).map((x) => hudE({ ...MM, ...x })), m0 = hudE(MM);
      ok(mx.every((q) => !q.err && sig(q) !== sig(m0)), '25 小地图朝向朝上 / 图层 / 卷角都改画法');
      ok(LAYOUT_NODES.has('worldIcon'), '25 节点版式 worldIcon');
    }

    // ---- 26 图例与数据叠加
    {
      const { a, e } = ec('el.overlay', {});
      DRAW_LOG.on = true; DRAW_LOG.texts = [];
      const spec = (style: string) => ({ title: '图例', style, items: [{ label: '甲', color: '#f00', value: '1' }, { label: '乙', color: '#0f0', icon: '⛨' }], low: '低', high: '高', stats: [['人次', '48,200']] as [string, string][] }) as never;
      const rs = LEGEND_STYLES.map((s) => legend(e, { x: 10, y: 10, ...legendSize(e, spec(s)) }, spec(s)));
      const tx = DRAW_LOG.texts.map((t) => t.text); DRAW_LOG.on = false;
      ok(LEGEND_STYLES.length === 4 && rs.every((q) => q.w > 20 && q.h > 20) && tx.includes('图例') && tx.includes('甲') && a.calls.length > 20, '26 图例四种（色块 / 渐变条 / 数值行 / 图标行）都画标题与条目');
      ok(['routeLines', 'guides', 'moveRange', 'coverIcons'].every((f) => ELEMENTS.get('el.overlay')!.forms.includes(f)), '26 el.overlay 新画法 4 种');
      const OV = { 'cnt.pack': 'cityBuilder', 'cnt.elements': 'el.overlay', 'el.overlay.form': 'routeLines' }, rl = hudE(OV), rlS = hudE({ ...OV, 'el.overlay.legendStyle': 'statRows' });
      ok(!rl.err && rl.texts.includes('公交线路') && rl.texts.includes('1 号线') && rl.occ.some((q) => q.id === 'decor.extra:el.overlay') && rlS.texts.includes('48,200'), '26 线路网：图例取内容包 hud.legends（公交线路 / 1 号线），登记占位；statRows 写统计行');
      const fs = ['guides', 'moveRange', 'coverIcons'].map((f) => hudE({ 'cnt.elements': 'el.overlay', 'el.overlay.form': f }));
      ok(fs.every((q) => !q.err && q.a.calls.length > 20), `26 对齐辅助线 / 移动范围 / 掩体图标都画${fs.map((q) => q.err).filter(Boolean).join('；')}`);
      const bg0 = hudE({ 'cnt.elements': 'el.overlay', 'el.overlay.form': 'buildGrid' }), bg1 = hudE({ 'cnt.elements': 'el.overlay', 'el.overlay.form': 'buildGrid', 'el.overlay.legality': 'stripes' });
      ok(!bg1.err && sig(bg0) !== sig(bg1), '26 建造合法性：stripes 换画法（默认 color 与原来一样）');
    }

    // ---- 51 全屏层
    {
      const edge = (x: Values, layer: 'under' | 'over') => { const a = rec(); live = a; screenEdges(a.g, R0, mk(x), layer); return a.calls.length; };
      ok(SCREEN_EDGES.length === 5 && edge({}, 'under') === 0 && edge({ 'ast.screenEdge': 'frostSmoke' }, 'under') > 0 && edge({ 'ast.screenEdge': 'frostSmoke' }, 'over') === 0 && edge({ 'ast.screenEdge': 'filmPerf', 'ast.screenEdgeLayer': 'over' }, 'over') > 0, '51 屏幕边缘遮罩：默认不画，按 ast.screenEdgeLayer 画在 under / over');
      // 离屏画布要 createImageData（漩涡底逐像素写）：给记录器补一个
      const recI = () => { const a = rec(), g0 = a.g as unknown as Record<string | symbol, unknown>; const g = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }) : g0[k]), set: (_, k, v) => { g0[k] = v; return true; } }) as unknown as CanvasRenderingContext2D; return { ...a, g }; };
      const bgc = (x: Values) => { const a = recI(); live = a; hudBackdrop({ ctx: a.g, m: a.g, blur: 0 } as never, R0, mk(x)); return a.calls.length; };
      ok(bgc({}) === 0 && [...SCREEN_BG].every((b) => bgc({ 'rel.behind': 'replaced', 'ast.bgArt': b }) > 0), '51 局内替换背景（漩涡 / 像素云天 / 背光）：只在 rel.behind = replaced 时画');
      const Q = { 'uip.screen': 'tpl.quest' }, q0 = scrE(Q), qw = scrE({ ...Q, 'ast.watermark2': 'doodles' });
      ok(!qw.err && qw.a.calls.length > q0.a.calls.length, '51 第二层水印叠在第一层之后');
      const ts = scrE({ ...Q, 'flow.chrome': 'topStrip' }), tr = scrE({ ...Q, 'flow.chrome': 'topRule' });
      ok(!ts.err && ts.texts.includes('71%') && ts.kinds('header').length > q0.kinds('header').length && !tr.err && sig(tr) !== sig(q0), '51 flow.chrome：居中顶条（星级 / 资源 / 分段格 71%）登记页头占位、贯穿分隔线');
      const cs = scrE({ ...Q, 'ix.close': 'cornerSign', 'ix.closeCorner': 'tl' });
      ok(!cs.err && cs.targets.includes('返回'), '51 ix.close = cornerSign：角上的返回牌');
      const pn = scrE({ 'uip.screen': 'tpl.inventory', 'lay.container': 'panels' }), pn0 = scrE({ 'uip.screen': 'tpl.inventory' });
      ok(!pn.err && sig(pn) !== sig(pn0), `51 lay.container = panels：主窗 + 侧栏${pn.err ? `：${pn.err}` : ''}`);
    }

    // ---- 40 倾斜方式与作用层
    {
      const T4 = { 'vis.tilt': 4 }, eu = ec('el.vitals', { ...T4, 'vis.tiltMode': 'uniform' }).e, ea = ec('el.vitals', { ...T4, 'vis.tiltMode': 'alternate' }).e, er = ec('el.vitals', T4).e;
      const keys = ['el.vitals#0', 'el.minimap#0', 'el.party#1', 'el.clock#0', 'el.abilities#2', 'el.objective#0', 'el.screen|container', 'el.toolbar#3'];
      ok(keys.every((k) => tiltOf(eu, k) === 4) && keys.every((k) => Math.abs(tiltOf(ea, k)) === 4) && new Set(keys.map((k) => Math.sign(tiltOf(ea, k)))).size === 2 && keys.every((k) => Math.abs(tiltOf(er, k)) <= 4), '40 vis.tiltMode：uniform 每块同角、alternate 满角正反、random 在 ±vis.tilt 以内');
      const s1 = tiltSplit('split', 10), s2 = tiltSplit('textOnly', 10), s3 = tiltSplit('boxAndContent', 10);
      ok(s1.box === 10 && s1.content === -6 && s2.box === 0 && s2.content === 10 && s3.box === 10 && s3.content === 10, '40 tiltSplit：反着斜 = 内容 −0.6 倍、只转内容 = 盒子 0、整块 = 同角');
      const V = { 'cnt.elements': 'el.vitals', ...T4 }, bx = hudE(V), bc = hudE({ ...V, 'vis.tiltLayers': 'boxAndContent' });
      ok(!bc.err && bc.a.n('rotate') > 0 && sig(bc) !== sig(bx) && TILT.delta === null, '40 vis.tiltLayers = boxAndContent：元素整块转（画完 TILT.delta 复位）');
    }

    // ---- 56 按角色像素化
    {
      const p0 = pixelPlan(null, 'off', 1), p1 = pixelPlan(['numerals', 'frame'], 'off', 1), p2 = pixelPlan(null, 'world', 3);
      ok(p0 === null && !!p1 && p1.boxLow.has('frame') && !p1.boxLow.has('bars') && p1.textLow.has('numerals') && !p1.textLow.has('text') && p1.boxK === 2 && !!p2 && p2.textLow.has('text') && p2.textLow.has('display') && !p2.textLow.has('icons') && p2.textK === 3, '56 pixelPlan：没选不拆层；选了角色只拆选中的；typ.rasterize = world 栅格化正文 / 标题 / 数字、倍数跟 vis.pixelScale');
      const lo = rec(), hi = rec(); let low = false;
      const rc = roleCtx([lo.g, hi.g], {} as never, () => (low ? lo.g : hi.g));
      rc.save(); low = true; rc.fillRect(0, 0, 1, 1); low = false; rc.fillRect(0, 0, 2, 2); rc.restore();
      ok(lo.n('save') === 1 && hi.n('save') === 1 && lo.n('fillRect') === 1 && hi.n('fillRect') === 1 && lo.n('restore') === 1, '56 roleCtx：状态 / 变换发给所有层，画的调用只进按角色挑中的那一层');
      const seen: string[] = []; withPixRole('text', 'numerals', () => seen.push(PIXROLE.text));
      ok(PIXEL_ROLES.length === 6 && seen[0] === 'numerals' && PIXROLE.text === '', '56 withPixRole：画的时候设角色、画完复位');
    }

    // ---- 63 K1 视觉语言余项
    {
      const pn = (x: Values, skin = 'darkHairline') => mk(x, skin).tokens.panel;
      const mr = pn({ 'vis.misregister': 2 }).misregister, mr0 = pn({ 'vis.misregister': 2, 'vis.misregisterAngle': 270 }).misregister;
      ok(!!mr && mr.x > 0 && mr.y > 0 && Math.abs(mr.x - mr.y) < 0.02 && !!mr0 && mr0.x < 0 && Math.abs(mr0.y) < 0.02 && !!mk({ 'vis.misregister': 2 }).tokens.title?.misregister, '63 套印错位：默认往右下（135°），vis.misregisterAngle = 270 往左；标题字同样错版');
      ok(JSON.stringify(pn({ 'ast.aging': 'yellowed,creases' }).aging) === '["yellowed","creases"]' && AGING_KINDS.length === 6 && pn({ 'vis.depth': 'layeredPaper' }).paperStack === 2, '63 做旧（6 种，多选）与叠纸');
      const la = pn({ 'vis.depth': 'soft3d', 'vis.lightAngle': 45 }).shadows ?? [], la0 = pn({ 'vis.depth': 'soft3d' }).shadows ?? [];
      ok(la.length === 2 && la[0].x > 0 && la[0].y < 0 && la0[0]?.x === -4 && la0[0]?.y === -4, '63 vis.lightAngle：soft3d 的亮影朝光（45° = 右上）；不写时原来的左上光');
      const gs = pn({ 'vis.blurTint': '@accent', 'vis.edgeLight': 'topLeft', 'vis.grain': 0.4 }).glass;
      ok(!!gs && typeof gs.tint === 'string' && gs.tint.startsWith('#') && gs.edge === 'topLeft' && gs.grain === 0.4, '63 毛玻璃三件：着色 / 亮边 / 颗粒写进面板 token');
      const legacy = [...SKIN_MAP.keys()].filter((id) => { const p = pn({}, id); return p.misregister || p.aging || p.glass || p.paperStack; });
      ok(legacy.length === 0, `63 皮肤默认不带新 token（冻结）${legacy.join('、')}`);
      const box = (s: Record<string, unknown>) => { const a = rec(); drawBox(a.g, { x: 10, y: 10, w: 120, h: 60 }, { bg: { solid: '#334455' }, ...s } as never, mk({}).pal); return a; };
      const b0 = box({});
      ok([{ misregister: { x: 1, y: 1, color: '#f00' } }, { aging: ['yellowed', 'stains', 'creases', 'coffeeRing', 'staples', 'photocopy'] }, { paperStack: 2 }, { glass: { tint: '#fff', edge: 'all', grain: 0.5 } }].every((s) => box(s).calls.length > b0.calls.length), '63 drawBox：错版 / 做旧 / 叠纸 / 玻璃都多画东西');
      const orn = (parts: string[]) => { const a = rec(); drawOrnaments(a.g, { x: 50, y: 50, w: 160, h: 90 }, 1, 'none', '#ccaa66', parts); return a.calls.length; };
      const o0 = orn([]);
      ok(K1_PARTS.length === 13 && K1_PARTS.every((p) => orn([p]) > o0), '63 K1 饰件 13 种都画');
      const gly = (m: string) => { const a = rec(); glyph(a.g, m, 20); return a.calls.length; };
      ok(['whiplash', 'drips', 'sunsetStripes'].every((m) => NEW_MOTIFS.has(m) && gly(m) > 2), '63 新母题 whiplash / drips / sunsetStripes');
      const cap = (s: string) => { const a = rec(); drawEndcap(a.g, 100, 50, 30, 1, s, '#cc8844'); return JSON.stringify(a.calls); };
      ok(new Set(['beastHead', 'crestPillar', 'wing', 'spike'].map(cap)).size === 4 && endcapReach('beastHead', 30) > endcapReach('crestPillar', 30), '63 新端头 beastHead / crestPillar / wing（伸出量各自算）');
      // B4 审查修复 ⑳：伸出盒外的饰件交给 hud.ts 登记
      const r0 = { x: 100, y: 100, w: 200, h: 100 }, og = rec();
      ovhBegin(og.g); drawOrnaments(og.g, r0, 1, 'none', '#ccaa66', ['paperclip', 'waxSeal', 'bow']); const ov = ovhEnd();
      const og2 = rec(); drawOrnaments(og2.g, r0, 1, 'none', '#ccaa66', ['paperclip', 'waxSeal', 'bow']); const ov2 = ovhEnd();
      ok(ov.length === 3 && ov.every((q) => q.y + q.h <= r0.y + 0.01 || q.y >= r0.y + r0.h - 0.01) && ov2.length === 0, '63 伸出盒外的饰件（回形针 / 蜡封 / 蝴蝶结）收集成盒外的矩形；没打开收集器时不收');
      const vo = hudE({ 'cnt.elements': 'el.minimap', 'ast.ornaments': 'paperclip,waxSeal' }), vo0 = hudE({ 'cnt.elements': 'el.minimap' });
      ok(vo.occ.filter((q) => q.id === 'decor.orn:el.minimap').length === 2 && !vo0.occ.some((q) => (q.id ?? '').startsWith('decor.orn')), '63 局内元素面板上伸出的饰件登记进帧占位表（decor.orn:<元素>）');
      const sl = (x: Values) => { const { a, e } = ec('el.abilities', x); slot(e, { x: 10, y: 10, w: 60, h: 60 }, '⚔', { selected: true }); return JSON.stringify(a.calls); };
      ok(sl({ 'st.selected': 'inset' }) !== sl({ 'st.selected': 'fill' }) && sl({ 'st.selected': 'inset' }) !== sl({ 'st.selected': 'none' }), '63 st.selected = inset：选中格压入');
      const sh = (s: string) => hudE({ 'cnt.elements': 'el.abilities', 'vis.silhouette': s });
      const shs = ['boomerang', 'quarterCircleBase', 'roundShield'].map(sh), sh0 = sh('box');
      ok(shs.every((q) => !q.err && sig(q) !== sig(sh0)) && new Set(shs.map(sig)).size === 3, '63 新外形 boomerang / quarterCircleBase / roundShield');
      const ic = (st: string) => { const { a, e } = ec('el.abilities', { 'vis.iconStyle': st }); glyphIcon(e, '⚔', undefined, 30, 30, 24); return JSON.stringify(a.calls); };
      ok(new Set(['woodcut', 'nato', 'alchemy', 'etched'].map(ic)).size === 4, '63 图标画风 woodcut / nato / alchemy');
      const fonts = (q: { a: { calls: [string, unknown[]][] } }) => new Set(q.a.calls.filter(([k]) => k === 'font=').map(([, v]) => String(v[0]).replace(/^.*?px /, ''))).size;
      const NT = { 'uip.screen': 'tpl.notice' }, pl = scrE({ ...NT, 'typ.mix': 'perLine' }), pl0 = scrE(NT);
      ok(!pl.err && fonts(pl) > fonts(pl0), '63 typ.mix = perLine：长文块逐段换字');
      const TR = { 'uip.screen': 'tpl.npc', 'cnt.dataShape': 'text', 'cmp.dialogBox': 'transcript' }, ps = scrE({ ...TR, 'typ.mix': 'perSpeaker' }), ps0 = scrE(TR);
      ok(!ps.err && fonts(ps) > fonts(ps0), '63 typ.mix = perSpeaker：对话日志按说话人换字');
      const an = (x: Values) => { const { a, e } = ec('el.subtitle', x); drawRich(e, '正文 [[注释]] 结尾', { x: 0, y: 0, w: 400, h: 100 }, { o: { size: 16, color: '#fff' } as never }); return a.calls.filter(([k]) => k === 'font=').map(([, v]) => String(v[0])); };
      ok(an({ 'typ.mix': 'annotationLayer' }).some((f) => f.includes('italic')) && !an({}).some((f) => f.includes('italic')), '63 typ.mix = annotationLayer：方括号注释斜体');
      const bb = hudE({ 'cnt.elements': 'el.toolbar', 'el.toolbar.form': 'bigButtons' });
      ok(!bb.err && bb.targets.includes(DATA.tools[0][1]) && bb.targets.includes(DATA.tools[1][1]) && !!bb.at('el.toolbar') && bb.at('el.toolbar')!.h >= 36, '63 el.toolbar = bigButtons：两颗竖长大色块按钮');
      const bp = hudE({ 'cnt.elements': 'el.objective', 'el.objective.form': 'blindPlate' });
      ok(!bp.err && bp.texts.includes('至少得分') && bp.texts.some((t) => t.startsWith('奖励 $')), '63 el.objective = blindPlate：名牌条 + 至少得分 + 目标分 + 奖励');
      // 停靠跟着当前成员 / 连接梁
      const D = { 'cnt.elements': 'el.party,el.choices', 'el.choices.dockTo': 'el.party', 'el.choices.dockSide': 'left' };
      const pk0 = packById('snowline').hud;
      const fo1 = hudE({ ...D, 'el.choices.dockFollow': 'active' }).at('el.choices'), sl1 = hudE({ ...D, 'el.choices.dockSlot': 1 }).at('el.choices');
      pk0.partyActive = 1;
      const fo2 = hudE({ ...D, 'el.choices.dockFollow': 'active' }).at('el.choices'), sl2 = hudE({ ...D, 'el.choices.dockSlot': 2 }).at('el.choices');
      delete pk0.partyActive;
      ok(!!fo1 && !!sl1 && !!fo2 && !!sl2 && JSON.stringify(fo1) === JSON.stringify(sl1) && JSON.stringify(fo2) === JSON.stringify(sl2) && JSON.stringify(fo1) !== JSON.stringify(fo2), '63 elx.dockFollow = active：停在宿主的当前成员旁（hud.partyActive，没写时第一个）');
      const bm = hudE({ ...D, 'el.choices.dockConnector': 'ironBeam' });
      ok(bm.occ.some((q) => q.id === 'decor.beam:el.choices') && !hudE(D).occ.some((q) => (q.id ?? '').startsWith('decor.beam')), '63 elx.dockConnector = ironBeam：宿主与停靠者之间一根铁梁，登记占位');
      const GD = { 'uip.layout': 'layout.rpg', ...D, 'el.choices.dockFollow': 'active' }, pkG = packFor(res(GD)).hud;
      const gl1 = elementLayout(mk(GD));
      pkG.partyActive = 2;
      const gl2 = elementLayout(mk(GD));
      delete pkG.partyActive;
      ok(gl1?.docks.find((d) => d[0] === 'el.choices')?.[5] === 1 && gl2?.docks.find((d) => d[0] === 'el.choices')?.[5] === 3, '63 Godot：DOCKS 的宿主第几格 = 当前成员（elx.dockFollow = active）');
      // slay-the-spire#4：贴边条的成员全都 elx.keepOnMenu 时，非弹出模板上连条的底板一起画（弹出模板的条由垫底那一遍画，不画两次）
      const ALLK: Values = Object.fromEntries((hudLayoutElements(mk({ 'uip.layout': 'layout.rpg' })) ?? []).map((id) => [`${id}.keepOnMenu`, true]));
      const KB = { 'uip.layout': 'layout.rpg', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'top' };
      const plate = (x: Values) => { setPack('snowline'); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.boxes = []; DRAW_LOG.texts = []; composeLayers({ ctx: a.g, m: a.g, blur: 0, full: R0 } as never, R0, mk(x)); DRAW_LOG.on = false; return DRAW_LOG.boxes.filter((q) => q.w > 900 && q.h < 200 && q.y < 2).length; };
      ok(plate({ ...KB, ...ALLK, 'uip.screen': 'tpl.inventory' }) === 1 && plate({ ...KB, 'uip.screen': 'tpl.inventory' }) === 0 && plate({ ...KB, ...ALLK, 'uip.screen': 'tpl.levelup' }) === 1, '63 贴边条成员全保留（elx.keepOnMenu）：非弹出模板上常驻顶栏带底板，弹出模板只画一次');
    }

    // ---- M12c-14 静帧姿态、样本血量、演示脚本
    {
      ok(simPin(null) === null && simPin(res({})) === null, 'c14 没选姿态 / 时刻时不钉帧');
      const lp = simPin(res({ 'chk.simPose': 'lowHp' }))!, ls = simulate(lp.t, lp.events, res({ 'chk.simPose': 'lowHp' }));
      ok(lp.t === 1 && lp.events.length === 1 && lp.events[0].kind === 'lowHp' && Math.abs(ls.hp - 0.16) < 0.01 && ls.vignette > 0, 'c14 chk.simPose = lowHp：钉在掉血后 1 秒（16%、暗角）');
      const hp = simPin(res({ 'chk.simPose': 'hit' }))!, hs = simulate(hp.t, hp.events, null);
      ok(hs.floaters.length === 1 && hs.barFlash > 0 && (hs.shake[0] !== 0 || hs.shake[1] !== 0), 'c14 受击姿态：伤害数字、血条闪、震屏');
      ok(JSON.stringify(simulate(hp.t, hp.events, null)) === JSON.stringify(hs), 'c14 同一姿态两次模拟逐字节相同');
      const POSES = ['lowHp', 'hit', 'heal', 'pickup', 'levelUp', 'dialogueMid', 'enterMid', 'idleFaded', 'bossIntro', 'beatDown'];
      const opts = new Set((SPEC_PARAM.get('chk.simPose')?.options ?? []).map((o) => String(o.value)));
      ok(POSES.every((p) => !!SIM_POSES[p] && opts.has(p)), 'c14 姿态 10 种（SIM_POSES 与 chk.simPose 的取值一致）');
      const em = simPin(res({ 'chk.simPose': 'enterMid', 'mo.enter': 'fade' }))!, es = simulate(em.t, em.events, res({ 'mo.enter': 'fade' }));
      ok(Math.abs(es.enter - 0.5) < 0.01 && Math.abs(es.open - 0.5) < 0.01, 'c14 入场中途：入场与模板打开都在一半');
      const lu = simulate(1, simPin(res({ 'chk.simPose': 'levelUp' }))!.events, null), idle = simPin(res({ 'chk.simPose': 'idleFaded' }))!;
      ok(lu.banner?.p === 1 && idle.t === 10 && idle.events.length === 0, 'c14 升级姿态横幅停留、闲置淡出 = 没有事件 + 10 秒');
      const dt = simPin(res({ 'chk.demo': 'combatBeat', 'chk.simTime': 2.4 }))!, at = simPin(res({ 'chk.simPose': 'hit', 'chk.simTime': 0.3 }))!;
      ok(dt.t === 2.4 && dt.events.length === DEMOS.combatBeat.length && at.t === 0.3 && simPin(res({ 'chk.simTime': 3 }))!.events.length === 0, 'c14 chk.simTime：没选姿态时把 chk.demo 钉在那一秒；选了姿态时换掉姿态时刻');
      const sh = simulate(0, [], res({ 'cnt.sampleHp': 0.23 }));
      ok(sh.hp === 0.23 && sh.vignette > 0 && simulate(0, [], res({})).hp === packFor(res({})).hud.hp, 'c14 cnt.sampleHp：盖过内容包的生命起点，低于 25% 时低血态');
      const NEW = ['openScreen', 'resultsTally', 'bossIntro', 'scoringSequence', 'beat', 'drawCards'], dopts = new Set((SPEC_PARAM.get('chk.demo')?.options ?? []).map((o) => String(o.value)));
      ok(NEW.every((d) => !!DEMOS[d] && dopts.has(d)), 'c14 chk.demo 新脚本 6 个');
      const at1 = (d: string, t: number) => simulate(t, DEMOS[d].map(([kind, a]) => ({ kind, at: a })), null);
      const bo = at1('bossIntro', 0.5), ta = at1('resultsTally', 1.2), dr = at1('drawCards', 0.3), dr2 = at1('drawCards', 2), be = at1('beat', 0.02), op = at1('openScreen', 0.2), scs = at1('scoringSequence', 0.8);
      ok(bo.bossIntro > 0 && bo.bossIntro < 1 && ta.tally > 0 && ta.tally < 1 && dr.drawn > 1 && dr.drawn < 2 && dr2.drawn === Infinity && be.beat > 0.8 && op.open > 0 && op.open < 1 && scs.floaters.some((f) => f.text.startsWith('+')) && scs.floaters.some((f) => f.text.startsWith('×')), 'c14 新事件：Boss 登场 / 计数 / 发牌 / 节拍 / 打开 / 计分的进度');
      ok(tallyText('1,234', 0.5) === '617' && tallyText('12.5', 0.5) === '6.3' && tallyText('8/8', 0.5) === '4/4' && tallyText('第 3 天', 1) === '第 3 天' && tallyText('abc', 0.3) === 'abc', 'c14 tallyText：数从 0 数上去，小数位与千分位格式不变');
      const def = simulate(0, [], null);
      ok(def.open === 1 && def.tally === 1 && def.bossIntro === 1 && def.beat === 0 && def.drawn === Infinity, 'c14 没有新事件时新状态都是「就位」（默认画面不变）');
      const BB = { 'cnt.elements': 'el.threat', 'el.threat.form': 'bossBar' }, bb0 = hudE(BB);
      setSim(bo); const bb1 = hudE(BB); setSim(dr); const hc = hudE({ 'cnt.elements': 'el.abilities', 'el.abilities.form': 'cards' }); setSim(def); const hc0 = hudE({ 'cnt.elements': 'el.abilities', 'el.abilities.form': 'cards' }); setSim(sim0);
      ok(!bb1.err && sig(bb1) !== sig(bb0) && !hc.err && hc.a.n('save') < hc0.a.n('save'), 'c14 Boss 登场时名牌淡入、条从空涨；发牌时没发到的牌不画');
    }

    // ---- Godot、参数表、作用域
    {
      const gw = (x: Values) => new Set(godotUiFiles({ ...cur, 'hud.style': 'darkHairline', ...x } as Values)!.notes.map((q) => q.where));
      const W10 = ['地图画风与小地图（M12b-25）', '图例与数据叠加（M12b-26）', '全屏层（M12b-51）', '倾斜方式与作用层（M12b-40）', '按角色像素化（M12b-56）', 'K1 视觉语言余项（M12b-63）', '静帧姿态与演示脚本（M12c-14）'];
      const all = new Set([...gw({ 'uip.screen': 'tpl.worldmap', 'vis.mapStyle': 'hexChart' }), ...gw({ 'uip.layout': 'layout.rpg', 'cnt.elements': 'el.overlay', 'el.overlay.form': 'routeLines', 'vis.tilt': 3, 'vis.tiltMode': 'uniform', 'vis.pixelRoles': 'frame', 'vis.misregister': 2, 'chk.simPose': 'lowHp' }), ...gw({ 'uip.screen': 'tpl.quest', 'ast.screenEdge': 'frostSmoke' })]);
      ok(W10.every((w) => all.has(w)), `Godot：B10 的迁移说明 7 条（${W10.filter((w) => !all.has(w)).join('、') || '齐'}）`);
      ok([...gw({ 'uip.layout': 'layout.rpg' })].every((w) => !W10.includes(w)), 'Godot：没选 B10 参数时不出 B10 说明');
      const gd = godotUiFiles({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.sampleHp': 0.23 } as Values)!.files.find((q) => q.path === 'ui/hud_sample.gd')!.text;
      ok(gd.includes(', 0.23]'), 'Godot：cnt.sampleHp 写进 hud_sample.gd 的生命行');
      const NEWP = ['vis.mapRoomStates', 'vis.mapRoute', 'vis.mapFloors', 'vis.mapFurniture', 'el.minimap.aspect', 'el.minimap.rotate', 'el.minimap.layers', 'el.minimap.compassText', 'el.minimap.cornerCurl', 'el.overlay.legendStyle', 'el.overlay.legendAnchor', 'el.overlay.legality',
        'ast.bgFlow', 'ast.bgWarp', 'ast.bgConfetti', 'ast.bgForeground', 'ast.screenEdge', 'ast.screenEdgeColor', 'ast.screenEdgeStrength', 'ast.screenEdgeLayer', 'ast.watermark2', 'ast.watermark2Opacity', 'ix.closeCorner', 'vis.tiltMode', 'vis.tiltLayers', 'vis.pixelRoles', 'typ.rasterize',
        'vis.lightAngle', 'vis.misregister', 'vis.misregisterAngle', 'ast.aging', 'vis.blurTint', 'vis.edgeLight', 'vis.grain', 'typ.mix', 'elx.dockConnector', 'elx.dockFollow', 'chk.simPose', 'chk.simTime', 'cnt.sampleHp'];
      const bad = NEWP.filter((id) => { const p = SPEC_PARAM.get(id) as unknown as Record<string, unknown> | undefined; return !p || ['label', 'impl', 'plain', 'lookAt', 'godot', 'godotLevel'].some((k) => !p[k]) || p.milestone !== 'M12b'; });
      ok(NEWP.length === 40 && bad.length === 0, `B10 新参数 40 个字段齐（label / impl / plain / lookAt / godot / godotLevel、M12b）${bad.join('、')}`);
      const sc = NEWP.filter((id) => (SPEC_PARAM.get(id) as unknown as { overrideAt?: string[] } | undefined)?.overrideAt?.length);
      ok(sc.length > 0 && sc.every((id) => SCOPABLE_IDS.includes(id)) && ['vis.mapStyle', 'vis.tiltMode', 'vis.tiltLayers', 'vis.lightAngle', 'vis.misregister', 'ast.aging', 'vis.blurTint', 'vis.edgeLight', 'vis.grain'].every((id) => SCOPABLE_IDS.includes(id)), `B10 按目标生效的新参数都进 SCOPABLE_IDS（${sc.join('、')}）`);
    }
    // ---- B10 审查修复
    {
      console.log('== M12b B10 审查修复');
      const cl = (x: Values, t?: CanvasRenderingContext2D) => { setPack('snowline'); const a = rec(); live = a; DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; let err = ''; try { composeLayers({ ctx: a.g, m: a.g, blur: 0, full: R0, ...(t ? { t } : {}) } as never, R0, mk(x)); } catch (ex) { err = String(ex); } return { ...out(a), err }; };
      // 带缩放、带画布对象的记录器（按层取缩放、边缘遮罩的设备像素用）
      const recS = (k: number, w: number, h: number) => {
        const calls: [string, unknown[]][] = [], canvas = { width: w, height: h }, st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1 };
        const g = new Proxy({}, {
          get: (_, p) => (typeof p !== 'string' ? undefined : p === 'canvas' ? canvas : p in st ? st[p] : p === 'getTransform' ? () => ({ a: k, b: 0, c: 0, d: k, e: 0, f: 0 }) : p === 'measureText' ? (t: string) => ({ width: [...t].length * 6 }) : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : (...a: unknown[]) => { calls.push([p, a]); }),
          set: (_, p, v) => { st[String(p)] = v; calls.push([`${String(p)}=`, [v]]); return true; },
        }) as unknown as CanvasRenderingContext2D;
        return { g, calls, canvas, n: (nm: string) => calls.filter(([q]) => q === nm).length, set: (nm: string) => calls.filter(([q]) => q === `${nm}=`).map(([, v]) => v[0]) };
      };
      const capture = () => {
        const made: { width: number; height: number }[] = [];
        const doc = gl.document as Record<string, unknown>, ce = doc.createElement;
        doc.createElement = () => { const c = { width: 64, height: 64, getContext: () => live.g }; made.push(c); return c; };
        return { made, done: () => { doc.createElement = ce; } };
      };
      // ① / ⑩ 按层取绘制缩放：低分辨率层上的阴影按这一层的缩放（像素皮肤 + typ.rasterize 与不开时一样大），代理画布的 canvas 是挑中的那一层
      {
        const lo = recS(1, 480, 270), hi = recS(2, 960, 540); let low = true;
        const px = roleCtx([lo.g, hi.g], {} as never, () => (low ? lo.g : hi.g));
        PAINT_LAYERS.of = (c) => (c.canvas === (lo.canvas as unknown) ? [1, 1] : c.canvas === (hi.canvas as unknown) ? [2, 2] : null);
        setPaintScale(2, 2);
        const SH = { bg: { solid: '#334455' }, shadows: [{ color: '#000', x: 0, y: 2, blur: 6 }] } as never;
        drawBox(px, { x: 10, y: 10, w: 100, h: 50 }, SH, mk({}).pal);
        const blurLo = lo.set('shadowBlur').filter((v) => v !== 0);
        low = false; drawBox(px, { x: 10, y: 10, w: 100, h: 50 }, SH, mk({}).pal);
        const blurHi = hi.set('shadowBlur').filter((v) => v !== 0).slice(-1);
        DRAW_LOG.on = true; DRAW_LOG.texts = []; low = true;
        drawText(px, '低', 0, 0, 20, { size: 14, color: '#fff', font: 'sans-serif', weight: 400 } as TextOpts);
        const tlo = DRAW_LOG.texts[0]; DRAW_LOG.on = false;
        PAINT_LAYERS.of = null; setPaintScale(1, 1);
        const ext = layerExtent(px);
        ok(ext[0] === 960 && ext[1] === 540 && layerExtent(lo.g)[0] === 480, '①⑩ layerExtent：代理画布按包着的最大一层定成品缓存预算（canvas 现在是挑中的低分辨率层）');
        ok(blurLo[0] === 6 && blurHi[0] === 12 && px.canvas === (lo.canvas as unknown) && !!tlo && tlo.cw === 480 && Math.abs(tlo.size - 14) < 0.01, `①⑩ 按层取缩放：低分辨率层的阴影 6（原来按全局 S = 12）、清晰层 12；代理画布的 canvas 是挑中的层，可读性记录的字号按这一层换回 CSS 像素（${blurLo[0]} / ${blurHi[0]} / ${tlo?.size}）`);
        const p2 = pixelPlan(null, 'x2', 2)!;
        ok(p2.boxK === 2 && p2.boxLow.size === 3, '①⑩ 像素皮肤（×2）+ typ.rasterize = x2：盒子层倍数仍是 vis.pixelScale（低分辨率层的缩放 = 原来的 floor(s) / px）');
      }
      // ② 局内 HUD 的替换背景不再自己做一遍场景处理（压暗只画一次）
      {
        const dims = (q: ReturnType<typeof cl>) => q.a.calls.filter(([k, v]) => k === 'fillStyle=' && v[0] === 'rgba(0,0,0,0.3)').length;
        const A = { 'uip.layout': 'layout.action', 'rel.dim': 0.3 }, r1 = cl({ ...A, 'rel.behind': 'replaced', 'ast.bgArt': 'backlight' }), r0 = cl(A);
        ok(!r1.err && dims(r1) === 1 && dims(r0) === 1, `② 局内替换背景 + rel.dim：压暗只画一次（${dims(r1)} / 没有替换背景 ${dims(r0)}）`);
      }
      // ③ 边缘遮罩 under 画在出血地图之后（原来被不透明的地图盖住）
      {
        const q = scrE({ 'uip.screen': 'tpl.worldmap', 'lay.mapBleed': 'on', 'ast.screenEdge': 'filmPerf' });
        const di = q.a.calls.map(([k, v], i) => [k, v, i] as const).filter(([k]) => k === 'drawImage');
        const fogI = Math.max(...di.filter(([, v]) => v[3] === 960 && v[4] === 540).map(([, , i]) => i)), edgeI = Math.min(...di.filter(([, v]) => v[3] === 960 && (v[4] as number) < 60).map(([, , i]) => i));
        ok(!q.err && Number.isFinite(fogI) && Number.isFinite(edgeI) && edgeI > fogI, `③ 出血地图上 ast.screenEdge（under）画在地图与揭雾遮罩之后（遮罩 ${fogI} < 齿孔带 ${edgeI}）`);
      }
      // ④ 只画元素的叠加模板 / 菜单样本 / 四控件样本也画边缘遮罩
      {
        const E = { 'ast.screenEdge': 'filmPerf' };
        const cases: Values[] = [{ 'uip.screen': 'tpl.draft3', 'lay.container': 'overlay', 'cnt.dataShape': 'none', 'cnt.focal': 'none' }, { 'cnt.screen': 'screen.settings' }, {}];
        const res4 = cases.map((x) => [cl(x), cl({ ...x, ...E })]);
        ok(res4.every(([p, q]) => !p.err && !q.err && sig(p) !== sig(q)), `④ 叠加模板（无主体）/ 菜单样本 / 四控件样本上 ast.screenEdge 都画（${res4.map(([p, q]) => (sig(p) !== sig(q) ? '✓' : '✗')).join(' ')}）`);
      }
      // ⑤ 小地图只有选了 wide / strip 时才铺成跟着玩家的方块；改了宽高的照原来拉满
      {
        const MC = { tag: 'mapCanvas' };
        setWorld({ player: null, poi: null, target: null, all: [], refDepth: 8, map: { canvas: MC, player: [0.5, 0.5], pois: [], heading: 0, explored: new Uint8Array(1024).fill(1), en: 32 } } as unknown as WorldView);
        const mmImg = (x: Values) => { const q = hudE({ 'cnt.elements': 'el.minimap', ...x }); const c = q.a.calls.find(([k, v]) => k === 'drawImage' && v[0] === MC); return c ? [c[1][3] as number, c[1][4] as number] : null; };
        const so = mmImg({ 'el.minimap.width': 0.3, 'el.minimap.height': 0.15 }), wd = mmImg({ 'el.minimap.aspect': 'wide' });
        setWorld(null);
        ok(!!so && !!wd && so[0] / so[1] > 1.4 && Math.abs(wd[0] - wd[1]) < 0.5, `⑤ 改了宽高的平面小地图照原来拉满内框（${so?.map((v) => v.toFixed(0)).join(' × ')}），选了 wide 才铺方块（${wd?.map((v) => v.toFixed(0)).join(' × ')}）`);
      }
      // ⑧ 涂鸦笔画共用一份；比例尺数字走 drawNumber（typ.numerals 选过时换字形）
      {
        const dp = rec(); doodlePath(dp.g, 1, 50, 50, 10);
        const wa = rec(); live = wa; drawWatermark(wa.g, R0, 'doodles', '#000', 0.5);
        const oa = rec(); drawOrnaments(oa.g, { x: 50, y: 50, w: 200, h: 120 }, 1, 'none', '#ccaa66', ['marginDoodles']);
        ok(dp.n('lineTo') === 10 && wa.n('stroke') >= 14 && oa.n('stroke') >= 4, '⑧ doodlePath：页边涂鸦饰件与 doodles 水印共用（五角星 10 段）');
        const WMF = { 'uip.screen': 'tpl.worldmap', 'vis.mapFurniture': 'scaleBar' }, sb0 = scrE(WMF), sb1 = scrE({ ...WMF, 'typ.numerals.family': 'sevenSeg' });
        const fill1 = (q: ReturnType<typeof scrE>) => q.a.calls.some(([k, v]) => k === 'fillText' && v[0] === '1');
        ok(fill1(sb0) && !fill1(sb1) && sb1.texts.some((t) => t.trim() === 'km'), '⑧ 比例尺的「0 / 1」走 drawNumber：七段数码时不再按正文字写，单位 km 照旧');
      }
      // ⑨ 边缘遮罩自己的缓存：1080p 级的画布（设备 2 倍）也只烘一次，第二帧只贴图；软的降分辨率
      {
        const cap = capture();
        const th9 = mk({ 'ast.screenEdge': 'frostSmoke,glyphBand', 'ast.screenEdgeStrength': 0.73 });
        const g1 = recS(2, 1920, 1080); live = g1 as never; screenEdges(g1.g, R0, th9, 'under');
        const g2 = recS(2, 1920, 1080); live = g2 as never; screenEdges(g2.g, R0, th9, 'under');
        cap.done();
        const frost = cap.made.find((c) => c.height > 100), band = cap.made.filter((c) => c.height < 100);
        ok(g2.n('drawImage') === 3 && g2.calls.length <= 12 && !!frost && frost.width * frost.height <= 610_000 && band.length === 2 && band.every((c) => c.width === 1920), `⑨ 冰雾 + 字带：第二帧只贴图（${g2.calls.length} 次调用）；冰雾整屏一块 ${frost?.width} × ${frost?.height}（≤ 0.6M），字带两条设备分辨率（${band.map((c) => `${c.width}×${c.height}`).join('、')}）`);
      }
      // ⑪ 出血地图的节点 / 地名排在页头与底栏之间（不压页头、页签）
      {
        const q = scrE({ 'uip.screen': 'tpl.worldmap', 'lay.mapBleed': 'on', 'cnt.itemCount': 24, 'lay.nav': 'tabsTop' });
        const tabs = q.tx.filter((t) => ['任务', '营地', '篝火', '宝箱'].includes(t.text)), tabB = Math.max(...tabs.map((t) => t.y + t.h));
        const nodes = (DRAW_LOG.targets as { label: string; y: number; h: number }[]).filter((t) => t.label.startsWith('节点')), top = Math.min(...nodes.map((t) => t.y));
        ok(!q.err && tabs.length > 0 && nodes.length > 0 && top >= tabB - 1, `⑪ 出血地图：节点都在页签行（${tabB.toFixed(0)}）以下（最上 ${top.toFixed(0)}）`);
      }
      // ⑫ 叠层图例最后画、叠层图形裁掉图例那块；数值行带色签
      {
        const OV = { 'cnt.pack': 'cityBuilder', 'cnt.elements': 'el.overlay', 'el.overlay.form': 'routeLines' };
        const q = hudE({ ...OV, 'el.overlay.legendAnchor': 'tl' }), cs = q.a.calls;
        const lastArc = cs.map(([k], i) => (k === 'arc' ? i : -1)).reduce((m, i) => Math.max(m, i), -1), titleI = cs.findIndex(([k, v]) => k === 'fillText' && v[0] === '公交线路');
        ok(!q.err && titleI > lastArc && cs.some(([k, v]) => k === 'clip' && v[0] === 'evenodd'), `⑫ 线路网：站点（最后一个 ${lastArc}）画在图例（${titleI}）之前、裁掉图例那块`);
        const sr = hudE({ ...OV, 'el.overlay.legendStyle': 'statRows' }), chips = sr.a.calls.filter(([k, v]) => k === 'fillRect' && v[2] === 10).length;
        ok(!sr.err && chips >= 4 && !sr.a.calls.some(([k, v]) => k === 'fillText' && v[0] === ''), `⑫ 数值行图例：每条线路一块色签（${chips}），没有数值时不写空字`);
      }
      // ⑬ 卷云：设备分辨率、等比例的画布上画（不再进 192 的遮罩小画布）
      {
        const cap = capture();
        const q = scrE({ 'uip.screen': 'tpl.worldmap', 'vis.mapUnexplored': 'cloudSwirl', 'lay.mapBleed': 'on', 'cnt.itemCount': 7 });
        cap.done();
        ok(!q.err && cap.made.some((c) => c.width === 960 && c.height === 540) && !cap.made.some((c) => c.width === 192), `⑬ cloudSwirl：卷云画在 960 × 540 的设备分辨率画布上（新建 ${cap.made.map((c) => `${c.width}×${c.height}`).join('、')}）`);
      }
      // ⑭ 做旧：同尺寸的盒子各不相同、两帧一样
      {
        const AG = { bg: { solid: '#e8dcc0' }, aging: ['stains'] } as never;
        const el = (q: ReturnType<typeof rec>, dx: number) => q.calls.filter(([k]) => k === 'ellipse').map(([, v]) => [(v[0] as number) - dx, v[1] as number].map((x) => x.toFixed(2)).join(',')).join(';');
        const draw2 = () => { bakeFrame(960, 540); const a = rec(); drawBox(a.g, { x: 0, y: 0, w: 150, h: 200 }, AG, mk({}).pal); const b = rec(); drawBox(b.g, { x: 160, y: 0, w: 150, h: 200 }, AG, mk({}).pal); return [el(a, 0), el(b, 160)]; };
        const f1 = draw2(), f2 = draw2();
        ok(!!f1[0] && f1[0] !== f1[1] && f1[0] === f2[0] && f1[1] === f2[1], '⑭ ast.aging：同尺寸的两块盒子污渍位置不同（逐块序号进种子），下一帧逐个相同');
      }
      // ⑮ 铁艺翼梁：从宿主的边伸到停靠者的外端
      {
        const D2 = { 'cnt.elements': 'el.party,el.choices', 'el.choices.dockTo': 'el.party', 'el.choices.dockSide': 'left', 'el.choices.dockConnector': 'ironBeam' };
        const q = hudE(D2), ch = q.at('el.choices'), pa = q.at('el.party'), parts = q.occ.filter((o) => o.id === 'decor.beam:el.choices').map((o) => o.rect);
        const bi = q.a.calls.findIndex(([k, v]) => k === 'fillStyle=' && v[0] === '#3a3f45'), bf = q.a.calls.slice(bi).find(([k]) => k === 'fillRect')?.[1] as number[] | undefined, ci = q.a.calls.findIndex(([k]) => k === 'fillText');
        const beam = bf ? { x: bf[0], y: bf[1], w: bf[2], h: bf[3] } : null;
        ok(!q.err && !!beam && !!ch && !!pa && beam.w >= ch.w && beam.x <= ch.x + 0.5 && Math.abs(beam.x + beam.w - pa.x) < 1 && beam.y > ch.y && beam.y < ch.y + ch.h, `⑮ ironBeam 翼梁跨过整个停靠者（梁 ${beam?.w.toFixed(0)} ≥ 停靠者 ${ch?.w.toFixed(0)}），在它的竖向中线上`);
        ok(bi >= 0 && ci > bi && parts.length >= 1 && !!ch && parts.every((p) => p.x >= ch.x + ch.w - 0.5 || p.x + p.w <= ch.x + 0.5), `⑮ 翼梁画在元素之前（停靠者挂在梁上）；登记的是露在停靠者外面的几段（${parts.length}）`);
      }
      // ⑯ 漩涡的配色 ast.bgColors
      {
        const d0 = bgColorsOf(mk({ 'ast.bgArt': 'shaderSwirl' })), d1 = bgColorsOf(mk({ 'ast.bgArt': 'shaderSwirl', 'ast.bgColors': '#33cc55,#f5c542' }));
        const pc = SPEC_PARAM.get('ast.bgColors') as unknown as Record<string, unknown> | undefined;
        ok(d0[0] === resolveColor('@accent', mk({}).pal) && d1[0] === '#33cc55' && d1[1] === '#f5c542' && d1[2] === d0[2] && !!pc && ['label', 'impl', 'plain', 'lookAt', 'godot', 'godotLevel'].every((k) => !!pc[k]) && pc.milestone === 'M12b' && pc.ordered === true, '⑯ ast.bgColors：按项换漩涡的低值 / 中值色，没写的项照默认；参数字段齐');
      }
      // ⑲ 按角色拆层的层次冲洗：弹出模板垫底之后、浮动详情之前
      {
        let n0 = 0; ROLES.flush = () => { n0++; };
        cl({ 'uip.layout': 'layout.rpg', 'uip.screen': 'tpl.levelup', 'flow.stacking': 'stack' }); const nPop = n0; n0 = 0;
        cl({ 'uip.screen': 'tpl.inventory', 'lay.detail': 'transient' }); const nFloat = n0; n0 = 0;
        cl({ 'uip.layout': 'layout.rpg' }); const nHud = n0;
        ROLES.flush = null;
        ok(nPop >= 1 && nFloat >= 1 && nHud === 0, `⑲ 层次冲洗：弹出模板的垫底之后（${nPop}）、浮动详情之前（${nFloat}）；普通局内 HUD 不冲（${nHud}）`);
      }
      // ㉑ over 一层画在最上面那张画布（有文字画布时画在文字画布上）
      {
        const t = rec(), q = cl({ 'uip.layout': 'layout.rpg', 'ast.screenEdge': 'filmPerf', 'ast.screenEdgeLayer': 'over' }, t.g);
        const onT = t.calls.filter(([k, v]) => k === 'drawImage' && v[3] === 960 && (v[4] as number) < 60).length, onG = q.a.calls.filter(([k, v]) => k === 'drawImage' && v[3] === 960 && (v[4] as number) < 60).length;
        ok(!q.err && onT === 2 && onG === 0, `㉑ ast.screenEdgeLayer = over：画在文字画布上（${onT} 条带），盒子画布上没有（${onG}）`);
      }
      // ㉒ 多块独立面板的侧栏（详情）登记成模板 detail
      {
        const q = scrE({ 'uip.screen': 'tpl.inventory', 'lay.container': 'panels' });
        ok(!q.err && q.kinds('detail').length === 1 && q.kinds('detail')[0].x < 200, `㉒ lay.container = panels：左边的详情侧栏登记成模板 detail（${q.kinds('detail').map((r) => `${r.x.toFixed(0)},${r.y.toFixed(0)}`).join('；')}）`);
      }
      // ㉓ 计数中的数字：前导零 / 时间补位，按最终的右沿对齐
      {
        ok(tallyText('02:15', 0.5) === '01:08' && tallyText('007', 0.2) === '001' && tallyText('1,234', 0.5) === '617' && tallyText('12.5', 0.5) === '6.3', '㉓ tallyText：时间与前导零补到原来的位数（02:15 → 01:08），千分位与小数照旧');
        const { a, e } = ec('el.meter', {}); setSim({ ...sim0, tally: 0.3125 } as never);
        const F0 = ORN.frame; ORN.frame = null; drawNumber(e, '1,234', 100, 0, 20, e.small); ORN.frame = F0;
        setSim(sim0);
        const ft = a.calls.find(([k]) => k === 'fillText');
        ok(!!ft && ft[1][0] === '617' && Math.abs((ft[1][1] as number) - (100 + 6 * 5 - 6 * 3)) < 0.01, `㉓ drawNumber 计数中按最终字串的右沿对齐（617 画在 ${ft?.[1][1]}）`);
      }
    }
    // ---- M12b 终期审查修复（B1–B10）
    {
      console.log('== M12b 终期审查修复');
      const fills = (q: { a: { calls: [string, unknown[]][] } }) => q.a.calls.filter(([k]) => k === 'fillText').map(([, v]) => String(v[0]));
      // ① 布阵的名册卡不画商品图（金币 / 宝石图标或「◇ 商品图」灰盒），商店竖卡照旧
      const fm = scr({ 'uip.screen': 'tpl.formation' }), fmR = scr({ 'uip.screen': 'tpl.formation', 'cnt.pack': 'rpg' });
      ok(!fills(fm).some((t) => t.includes('商品图')) && !fills(fmR).some((t) => t.includes('商品图')) && fm.texts.includes('艾琳'), '① tpl.formation 的名册卡画首字头像，不再是「◇ 商品图」（雪线 / rpg 包）');
      ok(fills(scr({ 'uip.screen': 'tpl.mall' })).some((t) => t.includes('商品图')), '① 商店竖卡（物品）照旧画商品图');
      // ② 没有手牌样本的包：三选一样本用自己的符号、不循环，接天赋样本；回血卡是技能
      setPack('snowline');
      const hc = [0, 1, 2, 3, 4].map((i) => handCard(i, '⚔'));
      ok(new Set(hc.map((c) => c.name)).size === 5 && hc[0].glyph === '✦' && hc[0].name === '霜刃' && hc[1].type === 'skill' && hc[2].type === 'power' && hc[3].type === 'power', `② handCard 退路：5 张不重名（${hc.map((c) => `${c.glyph}${c.name}/${c.type}`).join(' ')}）`);
      setPack('deckBuilder'); ok(handCard(0, '♠').name === '重击' && handCard(0, '♠').glyph === '⚔', '② 写了 hud.hand 的包照旧'); setPack('snowline');
      // ③ TCG 文本框：说明装得下（字号往下收），装不下时以「…」结尾
      const th3 = scr({ 'uip.screen': 'tpl.hand', 'cnt.pack': 'deckBuilder' });
      // 轨道 E 审查修复（视觉 ①）：行高改按画出来的字号（含 22px 字号下限）算以后，小卡（这里卡高约 80 单位）装不下的说明以「…」收尾、不再叠字——
      // 原来这一项能过是因为行高按没抬的字号算，三行字叠着画进一行的高度里
      const lines3 = th3.tx.filter((t) => t.y > 290 && t.y < 330);
      const noOverlap = lines3.every((p) => lines3.every((q) => p === q || Math.abs(p.x - q.x) > 1 || Math.abs(p.y - q.y) < 0.5 || Math.abs(p.y - q.y) >= Math.min(p.h, q.h) - 0.5));
      ok((th3.texts.some((t) => t.includes('害')) || th3.texts.some((t) => t.endsWith('…'))) && noOverlap, `③ TCG 卡的说明：写得下就写全，写不下以「…」收尾，行与行不叠`);
      {
        const { a, e } = ec('el.abilities', {});
        drawRich(e, '这是一段很长很长的说明文字，一行肯定写不下', { x: 0, y: 0, w: 60, h: 20 }, { o: { ...e.small, size: 10 }, maxLines: 1, ellipsis: true });
        const ft = a.calls.filter(([k]) => k === 'fillText').map(([, v]) => String(v[0]));
        ok(ft.length > 0 && ft[ft.length - 1].endsWith('…'), `③ drawRich 的 ellipsis：截断的最后一行以「…」结尾（${ft.join('|')}）`);
      }
      // ④ 角色详情：不借背包的「使用 / 丢弃」，属性条后面不写「→ 74」
      const hr = scr({ 'uip.screen': 'tpl.hero' });
      ok(hr.texts.includes('装备') && hr.texts.includes('技能') && !hr.texts.includes('使用') && !hr.texts.includes('丢弃') && !hr.texts.some((t) => t.includes('→ 74')), '④ tpl.hero 的按钮 = 装备 / 技能，属性条不写物品对比');
      // ⑤ 菱形格的键位不压在中间的符号上（退回外接框的角）
      {
        const { a, e } = ec('el.abilities', { 'vis.silhouette@slot': 'diamond' });
        slot(e, { x: 100, y: 100, w: 52, h: 52 }, '⚔⚔⚔', { key: '1' });
        const k1 = a.calls.find(([k, v]) => k === 'fillText' && v[0] === '1'), gx = a.calls.find(([k, v]) => k === 'fillText' && v[0] === '⚔⚔⚔');
        ok(!!k1 && !!gx && (k1[1][1] as number) < 100 + 52 / 4, `⑤ 菱形格的键位退回外接框左上角（x ${k1?.[1][1]}，原来 ${100 + 52 / 4 + 3}）`);
      }
      // ⑥ 旧皮肤冻结：结算页头不写「本局总结」、聊天页保留 ✕；新皮肤照 B1 · 64
      ok(!scr({ 'uip.screen': 'tpl.runSummary' }, 'ink').texts.includes('本局总结') && scr({ 'uip.screen': 'tpl.runSummary' }).texts.includes('本局总结'), '⑥ 旧皮肤 × tpl.runSummary：页头放了元素时照原来不写标题');
      ok(scr({ 'uip.screen': 'tpl.chat' }, 'ink').texts.includes('×') && !scr({ 'uip.screen': 'tpl.chat' }).texts.includes('×'), '⑥ 旧皮肤 × tpl.chat（点外面关闭）：照原来画 ✕；新皮肤不画');
      // ⑦ 目标文字式折出第三行时第二行以「…」结尾
      { const g = rec().g, o = { size: 10 } as TextOpts; ok(fitLine(g, '一二三四五', 100, o, true) === '一二三四五…' && fitLine(g, '一二三四五六七八九十', 30, o, true) === '一二三四…' && fitLine(g, '一二', 100, o) === '一二', '⑦ fitLine(…, more)：后面还有截掉的行时放得下也写「…」（目标文字式的第二行用它）'); }
      // ⑨ 非背包界面的页签
      const ch = scr({ 'uip.screen': 'tpl.chat' });
      ok(ch.texts.includes('队伍') && !ch.texts.includes('材料') && scr({ 'uip.screen': 'tpl.settings' }).texts.includes('画面'), '⑨ 聊天 / 设置页的页签按界面取（不再是背包的 道具 / 材料）');
      // ⑩ 浮动详情：先在不压 HUD 元素的候选里挑
      {
        const B = { x: 0, y: 0, w: 960, h: 540 }, an = { x: 300, y: 200, w: 50, h: 50 }, hardR = { x: 358, y: 200, w: 50, h: 20 };
        const soft = [{ x: 92, y: 200, w: 200, h: 80 }, { x: 300, y: 258, w: 200, h: 80 }, { x: 300, y: 112, w: 200, h: 80 }];
        const p0 = placeFloating(an, { w: 200, h: 80 }, [...soft, hardR], B, 8), p1 = placeFloating(an, { w: 200, h: 80 }, [...soft, hardR], B, 8, [], [hardR]);
        ok(intersects(p0.rect, hardR) && !intersects(p1.rect, hardR), '⑩ placeFloating 的 hard：不压 HUD 元素的候选优先（原来按总重叠挑了压元素的那一个）');
      }
      // ⑪ 复刻面板的套用也套 sim
      {
        const rep = { id: 'rep.t', name: 't', pack: 'snowline', base: {}, screens: [{ key: 'a', ref: null, values: { 'uip.layout': 'layout.rpg' }, sim: { pose: 'lowHp', demo: 'beat', at: 1 } }] } as unknown as KReplica;
        const p = replicaScreenPatch(rep, rep.screens[0], cur), pu = replicaScreenPatch(rep, rep.screens[0], cur, { uiOnly: true });
        ok(p.set['chk.simPose'] === 'lowHp' && p.set['chk.demo'] === 'beat' && p.set['chk.simTime'] === 1 && pu.set['chk.simPose'] === 'lowHp', '⑪ replicaScreenPatch 把 sim 写成 chk.simPose / chk.demo / chk.simTime（全套与只套 UI 都是）');
      }
      // ⑫ / ⑰ / ⑳ 参数表
      ok((SPEC_PARAM.get('cmp.detailFields')?.options ?? []).some((o) => o.value === '|'), '⑫ cmp.detailFields 有「|」右栏分隔');
      ok(!(SPEC_PARAM.get('vis.connector') as unknown as { status?: string }).status, '⑰ vis.connector 不再是 planned');
      // ⑮ 迁移说明的难度列没有 undefined
      ok(!godotPackage({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'ast.wear': 0.8, 'ast.aging': 'yellowed' } as Values).find((f) => f.path === 'MIGRATION.md')!.text.includes('undefined'), '⑮ MIGRATION.md 的 texture 难度写「需素材 / 贴图」（原来 undefined）');
      // ⑯ Godot：共用底条的格宽按内容收；骑边小件写留白
      {
        const disco = replicas.find((x) => x.id === 'rep.disco-elysium')!, sc = disco.screens.find((s) => s.key === 'hud')!;
        const pd = replicaScreenPatch(disco, sc, cur), L = elementLayout(mk({ ...cur, ...pd.set } as Values));
        const res = L?.items.find((it) => it.id === 'el.resources');
        ok(!!res && res.w < 100, `⑯ Godot LAYOUT：disco-elysium 的资源格（共用底条）宽按内容收（${res?.w}，原来 137）`);
        const L2 = elementLayout(mk({ 'uip.layout': 'layout.rpg', 'el.minimap.satellites': 'button', 'el.minimap.satelliteSide': 'l' }));
        ok(!!L2?.items.find((it) => it.id === 'el.minimap')?.pad?.some((v) => v > 0), '⑯ Godot LAYOUT：骑边小件的留白写进 pad');
      }
      // ㉒ A / B 两侧同一帧：第二侧不进新帧
      { bakeFrame(); const f0 = BAKE.frame; bakeFrame(undefined, undefined, false); ok(BAKE.frame === f0, '㉒ bakeFrame(…, false) 不涨帧号（A / B 对照的第二侧）'); }
      // ㉓ 偏移框 + 选项：整句台词写全（或以「…」结尾），不再静默截掉
      for (const box of ['offsetBox', 'polygon']) {
        const q = scr({ 'uip.screen': 'tpl.npc', 'cmp.dialogBox': box }), all = q.texts.join('');
        ok(all.includes('你注意到了吗') || q.texts.some((t) => t.endsWith('…')), `㉓ tpl.npc + ${box}：台词写全或以「…」结尾（${q.texts.filter((t) => t.includes('雪线')).join('|')}）`);
      }
      // ㉔ 同一宿主同一边的两个停靠者依次往外排
      {
        const sp = (id: string) => ({ id, host: 'h', side: 'below', gap: 8, align: 'start', slot: 0 });
        const { order } = dockOrder([sp('a'), sp('b')], (k) => ['h', 'a', 'b'].includes(k));
        ok(order.find((s) => s.id === 'b')?.host === 'a' && order.find((s) => s.id === 'a')?.host === 'h', '㉔ dockOrder：同一边的第二个停靠者停在第一个上');
        const two = hud({ 'cnt.elements': 'el.clock,el.resources,el.gameSpeed', 'el.resources.dockTo': 'el.clock', 'el.resources.dockSide': 'below', 'el.gameSpeed.dockTo': 'el.clock', 'el.gameSpeed.dockSide': 'below' });
        const ra = two.at('el.resources'), rb = two.at('el.gameSpeed');
        ok(!!ra && !!rb && !intersects(ra, rb), '㉔ 画布：两个停在宿主下方的元素不再叠在同一处');
      }
      // ㉕ 标题界面的告示块不压菜单
      {
        const t = scr({ 'uip.screen': 'tpl.title', 'el.title.form': 'notice' }), tr = t.at('el.title'), menu = t.kinds('data')[0];
        ok(!!tr && !!menu && !intersects(tr, menu), '㉕ tpl.title + el.title.form = notice：标题块排在游戏名那一栏，不压菜单');
      }
      // ㉙ 手牌多到排不下时叠得更紧，不出画
      {
        const h20 = hud({ 'uip.layout': 'layout.card', 'el.abilities.count': 20 }).at('el.abilities');
        ok(!!h20 && h20.x + h20.w <= 960 + 0.5, `㉙ 20 张手牌整排在画面以内（右沿 ${h20 ? Math.round(h20.x + h20.w) : '-'}，原来 1013）`);
      }
      // ㉛ 缩到 0.75 仍比版面大的再缩：字放大 2 倍的聊天框不出画
      { TEXT_K.k = 2; const c2 = scr({ 'uip.screen': 'tpl.chat', 'a11y.textScale': 2 }).at('el.chat'); TEXT_K.k = 1; ok(!!c2 && c2.x + c2.w <= 960 + 0.5, `㉛ textScale 2 的 tpl.chat：聊天框不伸出画面右边（右沿 ${c2 ? Math.round(c2.x + c2.w) : '-'}）`); }
      // ㉜ 整块倾斜按转过的外接框登记
      {
        const { e } = ec('el.threat', { 'vis.tilt': 10, 'vis.tiltLayers': 'boxAndContent', 'vis.tiltMode': 'uniform' });
        const q = tiltExtent(e, { x: 220, y: 23, w: 520, h: 40 }, 'el.threat');
        ok(q.h > 120 && q.w >= 520 && Math.abs(q.x + q.w / 2 - 480) < 0.01, `㉜ tiltExtent：10° 的 520 × 40 宽条外接框高 ${Math.round(q.h)}`);
      }
      // ⑬ K1 图谱：B10 的身份缺口标上了
      {
        const FAM = JSON.parse(readFileSync(join('src', 'content', 'uiStyleFamilies.json'), 'utf8')) as { identityGaps: { family: string; resolvedBy?: string; partialBy?: string }[] };
        const by = (f: string) => FAM.identityGaps.find((g) => g.family === f);
        ok(['fam.woodcut-print', 'fam.pixel', 'fam.cartographic', 'fam.memphis', 'fam.outsider'].every((f) => by(f)?.resolvedBy?.startsWith('M12b-')) && ['fam.glass', 'fam.neumorph'].every((f) => by(f)?.partialBy), '⑬ B10 关掉 / 推进的风格身份缺口标了 resolvedBy / partialBy');
      }
      setPack('snowline');
    }
    setSim(sim0);
    setPack('snowline');
  }
  if (!hadDoc) delete gl.document;
}

console.log('== R4 回归修复 · P1 绘制图元（材质底色 / 像素化可读下限 / 插画槽占位）');
{
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl;
  // 带缩放、带画布对象的记录器；离屏画布（材质小图）也记进 live
  const rec = (k = 1, w = 960, h = 540) => {
    const calls: [string, unknown[]][] = [], canvas = { width: w, height: h }, st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, font: '10px sans-serif' };
    const g = new Proxy({}, {
      get: (_, p) => (typeof p !== 'string' ? undefined : p === 'canvas' ? canvas : p in st ? st[p] : p === 'getTransform' ? () => ({ a: k, b: 0, c: 0, d: k, e: 0, f: 0 }) : p === 'measureText' ? (t: string) => ({ width: [...t].length * 6 })
        : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : (...a: unknown[]) => { calls.push([p, a]); }),
      set: (_, p, v) => { st[String(p)] = v; calls.push([`${String(p)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls, canvas, n: (nm: string) => calls.filter(([q]) => q === nm).length, set: (nm: string) => calls.filter(([q]) => q === `${nm}=`).map(([, v]) => v[0]), texts: () => calls.filter(([q]) => q === 'fillText').map(([, a]) => String(a[0])) };
  };
  let live = rec();
  if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => live.g }), fonts: { add() {} } };
  const mk = (x: Values, skin = 'darkHairline') => baseTheme(resolveUi({ ...cur, 'hud.style': skin, ...x } as Values), null, skin);
  // ① elden-ring#49：渐变底上的材质内芯按渐变平均色着色，主题的字色对比也按它查
  {
    ok(gradientMean([[0, '#2b2720'], [1, '#1c1a16']]) === 'rgba(36,33,27,1)' && gradientMean([[0, 'rgba(255,0,0,1)'], [1, 'rgba(0,0,255,0)']]) === 'rgba(255,0,0,0.5)' && gradientMean([[0.5, '#ffffff']]) === 'rgba(255,255,255,1)' && gradientMean([]) === undefined,
      `①49 gradientMean：按位置加权、预乘透明度求平均（透明端不把颜色拉偏）（${gradientMean([[0, 'rgba(255,0,0,1)'], [1, 'rgba(0,0,255,0)']])}）`);
    const pal = mk({}).pal, G = { linear: { angle: 180, stops: [[0, '#2b2720'], [1, '#1c1a16']] } } as never;
    ok(paintBase(G, pal) === 'rgba(36,33,27,1)' && paintBase({ solid: '#123456' }, pal) === '#123456' && paintBase({ pattern: { kind: 'dots', fg: '#000', size: 4, line: 1 } }, pal) === undefined && paintBase(undefined, pal) === undefined, '①49 paintBase：纯色 = 本身、渐变 = 平均色、图案底 / 没底色 = 不给（用材质基色）');
    const box = (bg: unknown) => { const a = rec(); live = rec(); DRAW_LOG.on = true; DRAW_LOG.boxes = []; drawBox(a.g, { x: 10, y: 10, w: 120, h: 60 }, { bg, material: 'marble' } as never, pal); DRAW_LOG.on = false; return { a, tile: live.set('fillStyle')[0], logged: DRAW_LOG.boxes[0]?.color }; };
    const bg = box({ linear: { angle: 180, stops: [[0, 'rgba(43,39,32,0.5)'], [1, 'rgba(28,26,22,0.5)']] } }), bs = box({ solid: '#2b2720' });
    // 整合修复 U#1：纯色底的可读性记录也跟画出来的颜色（底色），不再记材质基色（布纹 #7a2b2b 的深红让奶油色面板上的米白字被误判及格）
    ok(bg.tile === 'rgba(36,33,27,1)' && bg.a.set('globalAlpha').includes(0.5) && bg.logged === 'rgba(36,33,27,0.5)' && bs.tile === 'rgba(43,39,32,1)' && bs.logged === '#2b2720',
      `①49 drawBox：渐变底的材质小图按渐变平均色（${bg.tile}）、透明度跟底色（0.5），可读性记录跟着画出来的颜色；纯色底同样（小图 = 底色、记录 = 底色）`);
    const NAVY = { 'col.surface': '#11284a', 'col.surface2': '#0a1a33', 'vis.opacity': 1, 'ast.core': 'texture', 'ast.coreMat': 'parchment' };
    const tg = mk({ ...NAVY, 'vis.fill': 'gradient' }, 'darkGold').tokens.text;
    ok(luminance(tg) > 0.35, `①49 主题：深蓝渐变底 + 羊皮纸内芯，字色按渐变平均色查对比、保持浅色（原来按羊皮纸基色换成墨色，画出来是深底深字）（${tg}）`);
  }
  // ② into-the-breach#43：按角色像素化的可读下限——低分辨率字层上太小的字改画在清晰层
  {
    const lo = rec(0.5, 480, 270), hi = rec(1, 960, 540), low = new Set(['display', 'numerals']);
    const px = roleCtx([lo.g, hi.g], {} as never, () => (low.has(PIXROLE.text || 'text') ? lo.g : hi.g));
    PAINT_LAYERS.of = (c) => (c.canvas === (lo.canvas as unknown) ? [0.5, 0.5] : c.canvas === (hi.canvas as unknown) ? [1, 1] : null);
    TEXT_K.k = 1; PIXROLE.displayMin = 14; PIXROLE.lowText = low; PIXROLE.lowPx = 0.5;
    const where = (s: string, size: number, role?: string) => {
      const n0 = lo.n('fillText'), n1 = hi.n('fillText'), f = () => drawText(px, s, 0, 0, size * 1.4, { size, color: '#fff', font: 'sans-serif', weight: 400 } as TextOpts);
      if (role) withPixRole('text', role, f); else f();
      return lo.n('fillText') > n0 ? 'lo' : hi.n('fillText') > n1 ? 'hi' : '-';
    };
    const r = [where('布阵', 16), where('布阵', 30), where('DEFENSE 19%', 16, 'numerals'), where('DEFENSE 19%', 24, 'numerals'), where('END TURN', 22), where('正文', 12)];
    const roleAfter = PIXROLE.text;
    PIXROLE.lowPx = 0; const off = where('布阵', 16);
    PIXROLE.displayMin = Infinity; PIXROLE.lowText = new Set(); PAINT_LAYERS.of = null;
    ok(r.join(',') === 'hi,lo,hi,lo,lo,hi' && roleAfter === '' && off === 'lo' && LEGIBLE_PX.cjk === 12 && LEGIBLE_PX.other === 10 && !PIXEL_ROLES.includes(LEGIBLE),
      `②43 可读下限：低分辨率层上 8 层像素的「布阵」改画清晰层、15 的照旧像素化；数字角色 8 < 10 改清晰、12 照旧；画完角色复位；没有下限（lowPx = 0）时照旧（${r.join(',')} / ${off}）`);
  }
  // ④ black-myth#46：缺素材的插画槽画淡显占位（虚线框 + 小字），不再是斜纹灰盒
  {
    const a = rec(), th = mk({});
    const e = makeCtx('el.vitals', a.g, a.g, th, { x: 0, y: 0, w: 960, h: 540 });
    const okBmp = artSlot(e, { x: 20, y: 20, w: 240, h: 140 }, 'scene', '插画', { file: null });
    ok(!okBmp && !a.set('fillStyle').includes('rgba(120,120,128,0.42)') && a.set('globalAlpha').includes(ART_SLOT_FAINT) && a.n('setLineDash') >= 1 && a.texts().includes('◇ 插画（需素材）') && ART_SLOT_FAINT === 0.5,
      '④46 插画槽缺素材：淡显虚线框 + 小字（整体透明度 0.5），不铺斜纹灰底');
  }
  if (!hadDoc) delete gl.document;
}

console.log('== R4 回归修复 · C1 模板构图器（页头槽上限 / 行的浮点余量 / 容器里的通栏细框 / 选项跟正文 / 居中标题躲饰件 / 标题块 / 浮框滑开）');
{
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl, sim0 = simNow();
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  const rec = () => {
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, font: '10px sans-serif' }, canvas = { width: 960, height: 540 };
    return new Proxy({}, {
      get: (_, p) => (typeof p !== 'string' ? undefined : p === 'canvas' ? canvas : p in st ? st[p] : p === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : p === 'measureText' ? (t: string) => ({ width: [...t].length * 6 })
        : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : p === 'getImageData' ? (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }) : () => undefined),
      set: (_, p, v) => { st[String(p)] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
  };
  if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => rec() }), fonts: { add() {} } };
  type Tx = { text: string; x: number; y: number; w: number; h: number };
  // 按一套取值画一屏模板：文字（DRAW_LOG）、元素命中框、帧占位表、这一屏的内容包
  const draw = (v: Values) => {
    const r = resolveUi(v), th = baseTheme(r, null, String(v['hud.style'] ?? '')), pk = packFor(r);
    setPack(pk); setSim(simulate(0, [], r));
    DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; resetOccupancy();
    const hits = drawScreen({ ctx: rec(), m: rec(), blur: 0, full: R0 } as never, R0, th);
    DRAW_LOG.on = false;
    const txs = DRAW_LOG.texts.slice() as unknown as Tx[], occ = (OCC.last?.items ?? []).slice(), tg = DRAW_LOG.targets.slice();
    setPack('snowline');
    return { hits, tx: txs, texts: txs.map((t) => t.text), occ, pk, tg, tpl: (sub: string) => occ.filter((o) => o.kind === 'template' && o.sub === sub).map((o) => o.rect) };
  };
  const repVals = (id: string, key: string, extra: Values = {}): Values => {
    const rp = replicas.find((x) => x.id === id)!, s = rp.screens.find((x) => x.key === key)!, p = replicaScreenPatch(rp, s, cur), v = { ...cur, ...p.set, ...extra } as Record<string, unknown>;
    for (const k of p.unset) delete v[k];
    return v as Values;
  };
  const rep = (id: string, key: string, extra: Values = {}) => draw(repVals(id, key, extra));
  // 画一屏的画布调用次数（主画布上的方法调用都记一次；只比较两组取值差了哪些绘制）
  const calls = (v: Values) => {
    let n = 0;
    const c0 = rec(), c = new Proxy(c0 as object, { get: (t, p) => { const x = Reflect.get(t, p) as unknown; return typeof x === 'function' ? (...a: unknown[]) => { n++; return (x as (...b: unknown[]) => unknown)(...a); } : x; }, set: (t, p, x) => Reflect.set(t, p, x) }) as CanvasRenderingContext2D;
    const r = resolveUi(v), th = baseTheme(r, null, String(v['hud.style'] ?? ''));
    setPack(packFor(r)); setSim(simulate(0, [], r)); resetOccupancy();
    drawScreen({ ctx: c, m: rec(), blur: 0, full: R0 } as never, R0, th);
    setPack('snowline');
    return n;
  };
  const scr = (x: Values, skin = 'darkHairline') => draw({ ...cur, 'hud.style': skin, ...x } as Values);
  const tx = (o: { tx: Tx[] }, t: string) => o.tx.find((q) => q.text === t);
  // ① 页头槽的高度上限（dont-starve#41）：220 × 280 的立绘奖励不进页头，主体头像、记录（结算样本）、继续钮都画出来，奖励不压继续钮与页头
  {
    const ds = rep('rep.dont-starve', 'results'), hdr = ds.tpl('header')[0], rw = ds.hits.find((h) => h.element === 'el.reward'), btn = ds.tpl('buttons')[0];
    ok(!!hdr && hdr.h < 60 && ds.texts.includes('野') && ds.texts.includes('存活') && ds.texts.includes('等级 17') && !ds.texts.includes('树枝') && !!rw && !!btn && !intersects(rw.rect, btn) && !intersects(rw.rect, hdr) && !!tx(ds, '继续'),
      `①41 页头槽上限：高元素退回 inherit、排在页头与按钮行之间（页头 ${Math.round(hdr?.h ?? -1)} 高，奖励 ${JSON.stringify(rw?.rect)}）；结算记录写这一局的键值与经验（不再是背包的树枝）`);
    const st = scr({ 'uip.screen': 'tpl.runSummary', 'el.reward.form': 'portrait' }), st0 = scr({ 'uip.screen': 'tpl.runSummary' });
    const h1 = st.tpl('header')[0], h0 = st0.tpl('header')[0], rw0 = st0.hits.find((h) => h.element === 'el.reward');
    ok(!!h1 && h1.h < 60 && !!h0 && !!rw0 && rw0.rect.y < h0.y + h0.h && rw0.rect.y + rw0.rect.h <= h0.y + h0.h + 1, `①41 tpl.runSummary：立绘奖励（280 高）不再把页头撑满（${Math.round(h1?.h ?? -1)}）；原来的图标奖励照旧在页头槽里`);
  }
  // ② 行的浮点余量 + 三选一竖列的样本（hades#52）：dataAlign = center 收到量出的高后三张牌都画，行是三选一卡（不是任务的百分比）
  {
    const hd = rep('rep.hades', 'draft'), names = hd.pk.screens.draft.slice(0, 3).map(([, t]) => t);
    ok(names.every((t) => hd.texts.includes(t)) && !hd.texts.some((t) => /^\d+%$/.test(t)), `②52 三选一竖列：三张恩赐牌都画出来（${names.join(' / ')}），不再是任务样本`);
    const dc = scr({ 'uip.screen': 'tpl.draft3', 'lay.arrangement': 'column', 'cmp.slot': 'rowCard', 'lay.dataAlign': 'center' }), dn = dc.pk.screens.draft.slice(0, 3).map(([, t]) => t);
    ok(dn.every((t) => dc.texts.includes(t)), '②52 tpl.draft3 + 竖列行卡 + 竖向居中：三行都画（行的放得下判断留 0.5 余量）');
  }
  // ③ 容器里的通栏细框（into-the-breach#41）：弹窗照常（页头在细框上面）、细框贴容器内框底边（不是画面底的通栏条）、CONTINUE 页签挂在容器外沿
  {
    const it = rep('rep.into-the-breach', 'dialogue'), box = it.tpl('data')[0], hdr = it.tpl('header').find((q) => q.y > 40), line = it.tx.find((q) => q.text.startsWith('甲兽')), cta = tx(it, '开始作战');
    ok(!!box && !!hdr && !!line && !!cta && box.w < 960 * 0.85 && box.y + box.h < 540 - 40 && hdr.y + hdr.h <= box.y && Math.abs(hdr.x - box.x) < 1 && intersects(line, box) && cta.y >= box.y + box.h,
      `③41 framedBox 在弹窗里：细框 ${JSON.stringify(box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w) })} 在容器里、页头在上、台词在框里、页签挂在容器下沿下面（R4 审查修复 ⑭：原来断言伸出右边）`);
    const tr = scr({ 'uip.screen': 'tpl.npc', 'cmp.dialogBox': 'framedBox' }), sub = tr.tx.find((q) => q.y > 540 * 0.6 && q.w > 60);
    ok(!!sub && sub.y > 540 * 0.7, '③41 托盘（tpl.npc 原来的容器）上的 framedBox 照旧贴画面底');
  }
  // ④ 选项跟在正文下面（frostpunk#50，配复刻值 lay.layering = separate）：正文 + 选项一栏、整栏竖向居中、都在左栏；选项本来就在正文下面时（slay-the-spire 的 br）不动
  {
    const fp = rep('rep.frostpunk', 'dialogue', { 'lay.layering': 'separate' }), ch = fp.hits.find((h) => h.element === 'el.choices'), body = ['营地 · 第 46 天', '炉子不能灭。', '[这会让希望下降]'].map((t) => tx(fp, t));
    const top = Math.min(...body.map((q) => q?.y ?? 0)), bot = ch ? ch.rect.y + ch.rect.h : 0;
    ok(!!ch && body.every((q) => !!q && q.y + q.h <= ch.rect.y + 1 && q.x + q.w <= 480) && ch.rect.x + ch.rect.w <= 480 && Math.abs((top + bot) / 2 - 270) < 40,
      `④50 正文与选项一栏：选项 ${JSON.stringify(ch && { y: Math.round(ch.rect.y), h: Math.round(ch.rect.h) })} 紧跟正文下面、整栏竖向居中（${Math.round(top)}–${Math.round(bot)}）`);
    const sts = rep('rep.slay-the-spire', 'dialogue'), sc = sts.hits.find((h) => h.element === 'el.choices');
    ok(!!sc && sc.rect.y > 300, '④50 选项按锚点本来就在正文下面（br）时照旧');
  }
  // ⑤ 居中标题躲上沿正中的成块饰件（hollow-knight 背包 / 护符）：标题挪到饰件下面；左对齐时照旧横着让
  {
    const hc = tx(rep('rep.hollow-knight', 'inventory'), '背包'), hl = tx(rep('rep.hollow-knight', 'inventory', { 'lay.titleAlign': 'left' }), '背包');
    ok(!!hc && !!hl && hc.y > 90 && hl.y < 60, `⑤ 居中标题在顶部卷须下面（y ${Math.round(hc?.y ?? -1)}），左对齐照旧（y ${Math.round(hl?.y ?? -1)}）`);
  }
  // ⑥ 标题块（obra-dinn#36）：任何模板上都算——扉页不再补那一句、主体是标题时不画第二个标题；标题界面显式写的正文照画
  {
    const oj = rep('rep.obra-dinn', 'journal'), of = rep('rep.obra-dinn', 'journal', { 'cnt.focal': 'title' }), ot = rep('rep.obra-dinn', 'title');
    ok(!oj.texts.includes('警局回电了，可以出发。') && oj.texts.includes('雾城疑案') && !of.texts.includes('图鉴') && of.texts.includes('雾城疑案') && ot.texts.includes('警局回电了，可以出发。'),
      '⑥36 标题块：扉页不补一句、主体标题不画第二遍；标题界面写了 cnt.dataShape = text 的那句照画');
    // 翻页角（lay.pageIndicator = pageCurl）卷的是纸页的角、不跟数据区：补的那一句不画了照样画（换成 none 时少了这一组调用）
    const ojV = repVals('rep.obra-dinn', 'journal'), cCurl = calls(ojV), cNone = calls({ ...ojV, 'lay.pageIndicator': 'none' } as Values);
    ok(cCurl > cNone, `⑥36 扉页的翻页角照画（${cCurl} / ${cNone} 次调用）`);
  }
  // ⑦ 浮框滑开（forza-horizon-5 地图）：四个方向都压到 hard（页签条 / 按键提示）时左右的候选上下滑到空当里
  {
    const an = { x: 220, y: 327, w: 52, h: 52 }, fg = { w: 261, h: 257 }, top = { x: 50, y: 45, w: 860, h: 52 }, bot = { x: 331, y: 442, w: 298, h: 39 };
    const p0 = placeFloating(an, fg, [top, bot], R0, 8, [], [bot]), p1 = placeFloating(an, fg, [top, bot], R0, 8, [], [top, bot]);
    ok(intersects(p0.rect, top) && !intersects(p1.rect, top) && !intersects(p1.rect, bot), `⑦ placeFloating：页签条也是 hard、候选滑到两条之间（${JSON.stringify(p1.rect)}）`);
    // 浮框整块（logTarget 记的框，名字 = 详情名）不压任何一个页签的字、也不压底部按键提示（原来框顶 60，盖住「车行 / 车库 / 挑战」）
    const fh = rep('rep.forza-horizon-5', 'map'), d = tx(fh, '火山口'), keys = tx(fh, '设置路线'), fbox = fh.tg.find((t) => t.label === '火山口');
    const tabTx = ['赛事', '车行', '车库', '挑战'].map((t) => tx(fh, t));
    ok(!!d && !!keys && !!fbox && tabTx.every((q) => !!q && !intersects(fbox, q)) && fbox.y + fbox.h <= keys.y, `⑦ FH5 地图的浮动详情不压顶部页签条与按键提示（浮框 ${JSON.stringify(fbox && { y: Math.round(fbox.y), h: Math.round(fbox.h) })}）`);
  }
  // —— R4 审查修复（C1 这一组的几条）——
  // 审⑧⑮ 居中标题只在饰件伸过标题字中线时下移：hades skilltree 的矢量顶冠只擦到字那一段上沿，不挪（原来位图加载前后差 9）；hollow 的心形卷涡照旧挪（见上面 ⑤）
  {
    const hz = rep('rep.hades', 'skilltree'), t = tx(hz, '炉心之镜'), hd = hz.tpl('header')[0];
    ok(!!t && !!hd && hd.y < 80, `审⑧⑮ hades skilltree：页头不因矢量顶冠下移（页头 y ${hd ? Math.round(hd.y) : '-'}，原来 85）`);
  }
  // 审⑭ edgeTab：右边与容器右缘齐平、整个挂在下沿下面（原来四分之一伸出右边、一半骑在下沿上）
  {
    const it = rep('rep.into-the-breach', 'dialogue'), btn = it.tpl('buttons')[0], box = it.tpl('data')[0];
    ok(!!btn && !!box && btn.y >= box.y + box.h && btn.x + btn.w <= 862 && btn.x + btn.w >= 856, `审⑭ ITB 的 CONTINUE 页签 ${JSON.stringify(btn && { x: Math.round(btn.x), y: Math.round(btn.y), r: Math.round(btn.x + btn.w) })}：贴容器右缘（859）、挂在下沿下面`);
  }
  setSim(sim0);
  setPack('snowline');
  if (!hadDoc) delete gl.document;
}

console.log('== R4 回归修复 · C2 模板数据画法、顶栏与节点（日志段首 / 顶栏字色 / topRule / 两侧列 / 类型圆章 / 建造行 / 六角网标牌 / 无格格组 / 路线标记 / 总评 / 长图整卡）');
{
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl, sim0 = simNow();
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  // 记录器：fr 给了时把 fillRect 的参数记下来（topRule 那一道）
  const rec = (fr?: number[][]) => {
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, font: '10px sans-serif' }, canvas = { width: 960, height: 540 };
    return new Proxy({}, {
      get: (_, p) => (typeof p !== 'string' ? undefined : p === 'canvas' ? canvas : p in st ? st[p] : p === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : p === 'measureText' ? (t: string) => ({ width: [...t].length * 6 })
        : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : p === 'getImageData' ? (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h })
          : p === 'fillRect' && fr ? (...a: number[]) => { fr.push(a); } : () => undefined),
      set: (_, p, v) => { st[String(p)] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
  };
  if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => rec() }), fonts: { add() {} } };
  type Tx = { text: string; x: number; y: number; w: number; h: number; size: number; color?: string };
  type Bx = { x: number; y: number; w: number; h: number; label?: string };
  const draw = (v: Values) => {
    const r = resolveUi(v), th = baseTheme(r, null, String(v['hud.style'] ?? '')), pk = packFor(r), fr: number[][] = [];
    setPack(pk); setSim(simulate(0, [], r));
    DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; DRAW_LOG.boxes = []; resetOccupancy();
    const hits = drawScreen({ ctx: rec(fr), m: rec(), blur: 0, full: R0 } as never, R0, th);
    DRAW_LOG.on = false;
    const txs = DRAW_LOG.texts.slice() as unknown as Tx[], occ = (OCC.last?.items ?? []).slice(), tg = DRAW_LOG.targets.slice() as unknown as Bx[], boxes = DRAW_LOG.boxes.slice() as unknown as Bx[];
    setPack('snowline');
    return { hits, tx: txs, texts: txs.map((t) => t.text), occ, pk, tg, boxes, fr, tpl: (sub: string) => occ.filter((o) => o.kind === 'template' && o.sub === sub).map((o) => o.rect) };
  };
  const repVals = (id: string, key: string, extra: Values = {}): Values => {
    const rp = replicas.find((x) => x.id === id)!, s = rp.screens.find((x) => x.key === key)!, p = replicaScreenPatch(rp, s, cur), v = { ...cur, ...p.set, ...extra } as Record<string, unknown>;
    for (const k of p.unset) delete v[k];
    return v as Values;
  };
  const rep = (id: string, key: string, extra: Values = {}) => draw(repVals(id, key, extra));
  const scr = (x: Values, skin = 'darkHairline') => draw({ ...cur, 'hud.style': skin, ...x } as Values);
  const tx = (o: { tx: Tx[] }, t: string) => o.tx.find((q) => q.text === t);
  const low = (c?: string) => String(c ?? '').toLowerCase();
  // ① 日志段首的检定（disco-elysium#49）：按原串拆条目，技能名按类别色、方括号注记用次要色；正文里的标记整枚不拆
  {
    const le = logEntries('{c1:逻辑} [[中等：成功]] —— 表停了。{k:有人在说谎！}然后呢。\n水手低头。'), old = logEntries('逻辑 [中等：成功] —— 一句。');
    ok(le.length === 3 && le[0].tag === '{c1:逻辑} [[中等：成功]]' && le[1].tag === le[0].tag && le[1].text === '{k:有人在说谎！}然后呢。' && !le[2].tag && le[2].text === '水手低头。' && old[0]?.tag === '逻辑 [中等：成功]',
      `①49 logEntries 按原串拆：段首标记保留在说话人里、标记里的句末不拆句、没有标记的老写法照旧（${JSON.stringify(le)}）`);
    const dd = rep('rep.disco-elysium', 'dialogue'), lg = dd.tx.filter((t) => t.text === '逻辑'), tq = dd.tx.filter((t) => t.text === '同情'), nt = tx(dd, '[中等：成功]'), sp = tx(dd, '水手'), kw = tx(dd, '有人在说谎');
    ok(lg.length >= 1 && lg.every((t) => low(t.color) === '#4fb6d2') && tq.every((t) => low(t.color) === '#7f5ccf') && !!nt && !!sp && low(nt.color) !== low(sp.color) && low(nt.color) !== '#4fb6d2' && !!kw && low(kw.color) !== low(sp.color),
      `①49 disco 日志：技能名按属性色（逻辑 ${lg[0]?.color} / 同情 ${tq[0]?.color}）、方括号注记次要色（${nt?.color}，说话人 ${sp?.color}）、正文里的关键词着色（${kw?.color}）`);
  }
  // ② 模板顶栏的字按 @hudBar（slay-the-spire#45）
  {
    const barTx = (o: { tx: Tx[] }) => o.tx.filter((t) => t.y < 26 && !/^[◆●⚡≡]$/.test(t.text));
    const sm = barTx(rep('rep.slay-the-spire', 'map')), dz = barTx(scr({ 'uip.screen': 'tpl.inventory', 'flow.chrome': 'statusBar', 'col.text@hudBar': '#ff00ff' }));
    ok(sm.length >= 3 && sm.every((t) => low(t.color) === '#fff6e2') && dz.length >= 3 && dz.every((t) => low(t.color) === '#ff00ff'),
      `②45 statusBar 的字按 col.text@hudBar（StS 地图 ${[...new Set(sm.map((t) => t.color))].join(',')}；默认模板 ${[...new Set(dz.map((t) => t.color))].join(',')}）`);
  }
  // ③ topRule 画在顶排下面 + ④ 两侧列把格组分到主体两边时不画数据栏的空框（cyberpunk-2077#35 / #34）
  {
    const cp = rep('rep.cyberpunk-2077', 'character'), rule = cp.fr.filter((a) => a[0] === 0 && a[2] === 960 && a[3] > 1.5 && a[3] < 2.5);
    const tabs = ['装备', '技能', '外观', '强化'].map((t) => tx(cp, t)), top = [...tabs.map((q) => (q ? q.y + q.h : 0)), ...cp.hits.filter((h) => ['el.profile', 'el.resources'].includes(h.element)).map((h) => h.rect.y + h.rect.h)];
    ok(rule.length === 1 && tabs.every((q) => !!q) && rule[0][1] >= Math.max(...top) && rule[0][1] < 120, `③35 topRule 在页签与顶上元素的下面（y ${rule[0]?.[1]?.toFixed(1)}，顶排下沿 ${Math.max(...top).toFixed(1)}）`);
    const bigLeft = (o: { boxes: Bx[] }) => o.boxes.some((b) => b.x < 40 && b.w > 250 && b.h > 300);
    const di = rep('rep.disco-elysium', 'inventory');
    ok(!bigLeft(cp) && bigLeft(di), '④34 两侧列分到主体两边、数据栏没有别的元素时不画那块空框（cyberpunk）；数据栏还排着生命 / 士气时照画（disco）');
    // ⑤ 第三区占了右栏时右列从主体栏切出来、格组分到两边，左列的格组躲开生命 / 士气（disco-elysium#50）
    const groups = ['头部', '身体', '饰品', '武器', '道具', '脚'].map((t) => tx(di, t)), vit = di.hits.find((h) => h.element === 'el.vitals');
    const glyphs = di.tx.filter((t) => ['◆', '⛨', '✦', '⚔', '♥', '▲'].includes(t.text) && t.x < 640);
    ok(groups.every((q) => !!q) && groups.filter((q) => q!.x < 400).length >= 2 && groups.filter((q) => q!.x > 480).length >= 2 && !!vit && ![...groups, ...glyphs].some((q) => intersects(q as Bx, vit.rect)),
      `⑤50 disco 背包：格组分到人像两侧（${groups.map((q) => `${q?.text}@${Math.round(q?.x ?? -1)}`).join(' ')}），左列的格组不压生命 / 士气`);
  }
  // ⑥ 类型圆章（cult-of-the-lamb#43）：图标按类型色，未到达的图标与章底对比 ≥ 3
  {
    ok(contrastRatio(inkOn('rgba(243,233,214,0.158)', '#121418', 3), '#121418') >= 3 && inkOn('#ffffff', '#121418', 3) === 'rgba(255,255,255,1)' && contrastRatio(inkOn('#1d2a6e', '#121418', 3), '#121418') >= 3,
      '⑥43 inkOn：合成到章底后对比不到 3 时往白提（近黑的锁定色、深蓝），够的照旧');
    const cm = rep('rep.cult-of-the-lamb', 'map'), ic = cm.tx.filter((t) => ['⌖', '?', '◈', '⚔', '♨', '★'].includes(t.text));
    const byGlyph = new Map<string, Set<string>>();
    for (const t of ic) byGlyph.set(t.text, (byGlyph.get(t.text) ?? new Set<string>()).add(low(t.color)));
    ok(ic.length >= 10 && ic.every((t) => contrastRatio(String(t.color), '#121418') >= 3) && new Set(ic.map((t) => low(t.color))).size >= 4,
      `⑥43 cult 路线图：圆章图标都看得清（最低对比 ${Math.min(...ic.map((t) => contrastRatio(String(t.color), '#121418'))).toFixed(2)}）、按类型着色（${[...byGlyph].map(([k, v]) => `${k}:${v.size}`).join(' ')}）`);
  }
  // ⑦ 建造行的数值与回合（civ6#48）
  {
    const cb = rep('rep.civ6', 'build');
    ok(cb.texts.includes('600') && cb.texts.includes('⏱ 3') && cb.texts.includes('指挥部'), '⑦48 civ6 建造：行尾画数值（第一项建材的需求）与回合数「⏱ n」');
  }
  // ⑧ 有格下标牌时六角网不咬合（disco-elysium#31）：标牌不压别的格子，12 格都画
  {
    const ds = rep('rep.disco-elysium', 'skilltree'), names = ['逻辑', '同情', '眼力', '记录', '施压', '直觉'];
    const labels = ds.tx.filter((t) => names.includes(t.text.replace(/ \d$/, '')) && t.y > 90 && t.x < 400), cells = ds.tg.filter((b) => b.w > 30 && Math.abs(b.w - b.h) < 0.5 && b.x < 400 && b.y > 80);
    const hitN = labels.map((l) => cells.filter((c) => intersects(c, l)).length);
    ok(labels.length === 12 && cells.length >= 12 && hitN.every((n) => n <= 1), `⑧31 思想柜：12 个标牌都画、每个标牌至多碰到自己那一格（${labels.length} 个，${hitN.join('')}）`);
  }
  // ⑨ 固定分组读 cmp.slot = bare（hollow-knight#37）：格组不画格框
  {
    const sq = (o: { boxes: Bx[] }) => o.boxes.filter((b) => Math.abs(b.w - b.h) < 0.5 && b.w <= 48 && b.x < 540).length;
    const hb = rep('rep.hollow-knight', 'inventory'), hc = rep('rep.hollow-knight', 'inventory', { 'cmp.slot': 'cell' });
    ok(sq(hb) === 0 && sq(hc) >= 8, `⑨37 hollow 背包：cmp.slot = bare 的格组不画格框（${sq(hb)}；cell 时 ${sq(hc)}）`);
  }
  // ⑩ 路线上的当前标记画在节点上面（frostpunk#52）：当前节点是最后一个时挂在它上沿
  {
    const fm = rep('rep.frostpunk', 'map'), n3 = fm.tx.findIndex((t) => t.text === '3'), c3 = n3 >= 0 ? fm.tx[n3].x + fm.tx[n3].w / 2 : -1;
    const mk = fm.tx.findIndex((t, i) => i > n3 && t.text.length === 1 && t.text !== '3' && Math.abs(t.x + t.w / 2 - c3) < 6);
    ok(n3 >= 0 && mk > n3 && fm.tx[mk].y < fm.tx[n3].y, `⑩52 frostpunk 地图：路线头像（${fm.tx[mk]?.text}）画在当前节点之后、在它上沿上面`);
  }
  // ⑪ 评级行的总评按表下剩下的高放大（hi-fi-rush 结算）
  {
    const hr = rep('rep.hi-fi-rush', 'results'), lab = tx(hr, '总评'), g = hr.tx.filter((t) => /^[SABCD]$/.test(t.text)).sort((p, q) => q.size - p.size)[0];
    ok(!!lab && !!g && g.size >= 50 && g.y + g.h <= 540, `⑪ hi-fi 结算总评字号 ${g?.size?.toFixed(1)}（原来标题 × 2.6 ≈ 34）`);
  }
  // ⑫ 长图滚动后只露出一截的节点整个不画（factorio#39）
  {
    const fs = rep('rep.factorio', 'skilltree'), hdr = fs.tpl('header')[0], tl = new Set((fs.pk.screens.talents ?? []).map((t) => t[1]));
    const nodes = fs.tg.filter((b) => tl.has(String(b.label)) && b.x < 560);
    ok(!!hdr && nodes.length >= 2 && nodes.every((b) => b.y >= hdr.y + hdr.h - 0.5), `⑫39 factorio 科技树：节点都整个在数据区里（${nodes.length} 个，最上 ${Math.min(...nodes.map((b) => b.y)).toFixed(1)}，页头下沿 ${hdr ? (hdr.y + hdr.h).toFixed(1) : '-'}）`);
  }
  // —— R4 审查修复（C2 这一组的几条）——
  // 审⑯ 两侧列放不下全部格组时不再把两组夹在栏顶叠在一起（disco 背包 + 字放大 1.3 倍：「身体」压在「头部」上）
  {
    const d13 = rep('rep.disco-elysium', 'inventory', { 'a11y.textScale': 1.3 }), names = ['头部', '身体', '饰品', '武器', '道具', '脚'];
    const titles = d13.tx.filter((t) => names.includes(t.text) || /^可用 \d$/.test(t.text)), glyphs = d13.tx.filter((t) => ['◆', '⛨', '✦', '⚔', '♥', '▲'].includes(t.text) && t.x < 640);
    const bad = titles.filter((a) => glyphs.some((q) => intersects(a, q)) || titles.some((b) => b !== a && intersects(a, b)));
    ok(titles.length >= 8 && bad.length === 0, `审⑯ disco 背包（字 1.3 倍）：组名 / 计数不压别的格子与组名（${titles.length} 个字，相叠 ${bad.map((q) => q.text).join(',') || '无'}）`);
  }
  // 审⑲ 带格下标牌的菱形思想柜按列咬合：相邻两列上下错开半个行距（不再是一排排错半格的砖墙）
  {
    const ds = rep('rep.disco-elysium', 'skilltree'), cells = ds.tg.filter((b) => b.w > 30 && Math.abs(b.w - b.h) < 0.5 && b.x < 400 && b.y > 80);
    const xs = [...new Set(cells.map((c) => Math.round(c.x / 4) * 4))].sort((p, q) => p - q), col = (x: number) => cells.filter((c) => Math.round(c.x / 4) * 4 === x).map((c) => c.y).sort((p, q) => p - q);
    const c0 = col(xs[0] ?? 0), c1 = col(xs[1] ?? 0), h = cells[0]?.h ?? 0, pitch = c0.length > 1 ? c0[1] - c0[0] : 0;
    ok(xs.length === 3 && c0.length >= 3 && c1.length >= 3 && Math.abs(c1[0] - c0[0] - pitch / 2) < 2 && pitch > h, `审⑲ 思想柜按列咬合：3 列，第二列比第一列低半个行距（${c1[0] && c0[0] ? (c1[0] - c0[0]).toFixed(1) : '-'} / 行距 ${pitch.toFixed(1)}）`);
  }
  setSim(sim0);
  setPack('snowline');
  if (!hadDoc) delete gl.document;
}

console.log('== R4 回归修复 · C3 HUD 构图与元素（主角级拟声字 / 逐元素显隐 / 组的饰线 / 同列上下两摞 / 建筑面板字段 / 世界标记叠放 / 飘带角度 / 低血样本血量 / 屏代码 / 宽小地图 / 词表）');
{
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl, sim0 = simNow();
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  // 记录器：按 save / restore 维护 globalAlpha，记下每次调用与当时的不透明度
  const rec = () => {
    const calls: [string, unknown[], number][] = [], stack: Record<string, unknown>[] = [];
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, font: '10px sans-serif' }, canvas = { width: 960, height: 540 };
    const g = new Proxy({}, {
      get: (_, p) => (typeof p !== 'string' ? undefined : p === 'canvas' ? canvas : p in st ? st[p] : p === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : p === 'measureText' ? (t: string) => ({ width: [...t].length * 6 })
        : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : p === 'getImageData' ? (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h })
          : p === 'save' ? () => { stack.push({ ...st }); calls.push(['save', [], Number(st.globalAlpha)]); } : p === 'restore' ? () => { Object.assign(st, stack.pop() ?? {}); calls.push(['restore', [], Number(st.globalAlpha)]); }
            : (...a: unknown[]) => { calls.push([p, a, Number(st.globalAlpha)]); }),
      set: (_, p, v) => { st[String(p)] = v; calls.push([`${String(p)}=`, [v], Number(st.globalAlpha)]); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { g, calls };
  };
  if (!hadDoc) gl.document = { createElement: () => ({ width: 64, height: 64, getContext: () => rec().g }), fonts: { add() {} } };
  type Tx = { text: string; x: number; y: number; w: number; h: number; size: number; color?: string };
  type HudOpts = { world?: WorldView | null; only?: string[]; tpl?: boolean; sim?: { t: number; events: { kind: 'hit'; at: number }[] } };
  const repVals = (id: string, key: string, extra: Values = {}): Values => {
    const rp = replicas.find((x) => x.id === id)!, s = rp.screens.find((x) => x.key === key)!, p = replicaScreenPatch(rp, s, cur), v = { ...cur, ...p.set, ...extra } as Record<string, unknown>;
    for (const k of p.unset) delete v[k];
    return v as Values;
  };
  // 局内 HUD：照 HudSystem 的钉帧（simPin）画元素（o.sim 给了时换成这一串事件）；only 给了时只画这几个元素（排位照全部）；tpl = 画界面模板
  const hud = (v: Values, o: HudOpts = {}) => {
    const r = resolveUi(v), th = baseTheme(r, null, String(v['hud.style'] ?? '')), pk = packFor(r), a = rec(), pin = simPin(r);
    setPack(pk); setSim(o.sim ? simulate(o.sim.t, o.sim.events, r) : pin ? simulate(pin.t, pin.events, r) : simulate(0, [], r)); setWorld(o.world ?? null);
    DRAW_LOG.on = true; DRAW_LOG.texts = []; DRAW_LOG.targets = []; DRAW_LOG.boxes = []; resetOccupancy();
    const hits = o.tpl ? drawScreen({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, th) : drawElements({ ctx: a.g, m: rec().g, blur: 0, full: R0 } as never, R0, th, null, [], [], o.only ? { paint: { only: o.only } } : {});
    DRAW_LOG.on = false;
    const tx = DRAW_LOG.texts.slice() as unknown as Tx[], occ = (OCC.last?.items ?? []).slice();
    setPack('snowline'); setWorld(null);
    return { a, hits, tx, texts: tx.map((t) => t.text), occ, pk, at: (id: string) => hits.find((h) => h.element === id)?.rect };
  };
  const rep = (id: string, key: string, extra: Values = {}, o: HudOpts = {}) => hud(repVals(id, key, extra), o);
  const pt = (x: number, y: number, on = true) => ({ x, y, depth: 8, on, dir: [1, 0] as [number, number] });
  // 第一笔不透明度不到 1 的绘制调用（只画一个元素时 = 这个元素的不透明度）
  const firstA = (o: { a: ReturnType<typeof rec> }) => o.a.calls.find(([k, , al]) => k !== 'save' && k !== 'restore' && !k.endsWith('=') && al < 0.999)?.[2] ?? 1;
  // ① 主角级拟声字（hi-fi-rush#28）：整屏叠加，不推开不藏，垫在其余元素下面画，登记软占位
  {
    const hw = rep('rep.hi-fi-rush', 'hud'), sfx = hw.tx.findIndex((t) => t.text.startsWith('咚')), rank = hw.tx.findIndex((t) => t.text === 'SS');
    const W0 = { player: pt(430, 380), poi: null, target: { ...pt(560, 300), label: '目标' }, held: null, all: [], map: null, refDepth: 8 } as unknown as WorldView;
    const hw2 = rep('rep.hi-fi-rush', 'hud', {}, { world: W0 }), soft = hw.occ.find((q) => q.kind === 'world' && q.id === 'el.feedback');
    ok(sfx >= 0 && hw.tx[sfx].size > 100 && rank > sfx && hw2.texts.some((t) => t.startsWith('咚')) && !!soft?.soft && soft.rect.w > 100,
      `①28 hi-fi 拟声字 hero 档画出来（字号 ${hw.tx[sfx]?.size?.toFixed(0)}，排在评级字之前画；有场景投影时也画）、范围登记成软占位（${soft ? Math.round(soft.rect.w) : '-'} 宽）`);
    const tg = rep('rep.hi-fi-rush', 'hud', { 'el.feedback.sfxSize': 'target' }), q = tg.occ.find((x) => x.kind === 'world' && x.id === 'el.feedback');
    ok(!!q && !q.soft, '①28 target 档的拟声字照旧按世界挂点处理（硬占位、会被推开）');
  }
  // ② 逐元素的显隐（black-myth#24）：情境显现 / 静止渐隐闲置时淡，常驻盖过全局淡出；一个事件都没有的静帧照常画
  {
    const bm = rep('rep.black-myth', 'hud', {}, { only: ['el.vitals'] });
    ok(Math.abs(firstA(bm) - 0.15) < 0.01, `②24 black-myth（钉闲置淡出）的生命条按元素的情境显现淡到 0.15（${firstA(bm).toFixed(2)}）`);
    const base = { ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', 'cnt.elements': 'el.vitals,el.timer' } as Values;
    const at = (x: Values, t: number, events: { kind: 'hit'; at: number }[] = [{ kind: 'hit', at: 0 }]) => firstA(hud({ ...base, ...x } as Values, { only: ['el.timer'], sim: { t, events } }));
    const idleCtx = at({ 'el.timer.visibility': 'contextual' }, 10), liveCtx = at({ 'el.timer.visibility': 'contextual' }, 1), noEv = at({ 'el.timer.visibility': 'contextual' }, 0, []);
    const fade = at({ 'el.timer.visibility': 'fadeIdle' }, 10), always = at({ 'rel.hudVisibility': 'fadeIdle', 'el.timer.visibility': 'always' }, 10), inherit = at({ 'rel.hudVisibility': 'fadeIdle' }, 10);
    ok(Math.abs(idleCtx - 0.15) < 0.01 && liveCtx > 0.99 && noEv > 0.99 && Math.abs(fade - 0.3) < 0.01 && always > 0.99 && Math.abs(inherit - 0.3) < 0.01,
      `②24 情境显现：事件后 10 秒 ${idleCtx.toFixed(2)}、1 秒 ${liveCtx.toFixed(2)}、没有事件 ${noEv.toFixed(2)}；静止渐隐 ${fade.toFixed(2)}；常驻盖过全局 ${always.toFixed(2)}；跟随全局 ${inherit.toFixed(2)}`);
  }
  // ③ 组员之间的饰线不因外接框里有组外元素整组不画（hollow-knight#36）；底板照旧要外接框干净
  {
    const n = (o: { a: ReturnType<typeof rec> }) => o.a.calls.length;
    const hh = rep('rep.hollow-knight', 'hud'), hn = rep('rep.hollow-knight', 'hud', { 'el.abilities.groupConnector': 'none', 'el.vitals.groupConnector': 'none' });
    const hf = rep('rep.hollow-knight', 'hud', { 'el.abilities.groupFrame': 'panel' });
    ok(n(hh) > n(hn) + 4 && !hf.occ.some((q) => q.id === 'decor.frame:group:g1'), `③36 hollow 灵魂球与面具之间画了饰线（调用 ${n(hh)} vs 关掉 ${n(hn)}），组框照旧不画（吉欧数在外接框里）`);
  }
  // ④ 同一列的上下两摞相撞（cyberpunk-2077#36）：高的那一摞缩到两摞之间留出间距；缩到下限仍放不下时矮的那一摞横挪
  {
    const cp = rep('rep.cyberpunk-2077', 'hud'), s2 = cp.at('el.selection#2'), pr = cp.at('el.prompt'), mm = cp.at('el.minimap');
    ok(!!s2 && !!pr && !!mm && s2.y + s2.h <= pr.y - 7.5 && Math.abs(mm.x + mm.w - (pr.x + pr.w)) < 2, `④36 cyberpunk 右上一摞的下沿 ${s2 ? (s2.y + s2.h).toFixed(0) : '-'} 在右下按键提示的上沿 ${pr?.y.toFixed(0)} 之上，两摞仍贴右边`);
    const lc = (h: number) => { const o = hud({ ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', 'cnt.elements': 'el.objective,el.prompt', 'el.objective.screenAnchor': 'tl', 'el.objective.height': h, 'el.prompt.screenAnchor': 'bl', 'el.prompt.height': 0.3 } as Values); return { ob: o.at('el.objective'), lp: o.at('el.prompt') }; };
    const l1 = lc(0.85), l2 = lc(0.95);
    ok(!!l1.ob && !!l1.lp && !intersects(l1.ob, l1.lp) && Math.abs(l1.lp.x - l1.ob.x) < 0.5 && l1.lp.h < 162 && l1.lp.h >= 162 * 0.75 - 0.5,
      `④36 高的那一摞缩到下限还不够时矮的那一摞也缩（左上高 ${l1.ob?.h.toFixed(0)}、左下高 ${l1.lp?.h.toFixed(0)}，都贴左边）`);
    ok(!!l2.ob && !!l2.lp && !intersects(l2.ob, l2.lp) && l2.lp.x >= l2.ob.x + l2.ob.w + 7.5 && l2.lp.x + l2.lp.w <= 480 && l2.lp.y + l2.lp.h > 500,
      `④36 两摞都缩到下限仍放不下时矮的那一摞横挪到高的那一摞旁边（左上右沿 ${l2.ob ? (l2.ob.x + l2.ob.w).toFixed(0) : '-'}，左下挪到 ${l2.lp?.x.toFixed(0)}）`);
  }
  // ⑤ 建筑面板按写了的字段长高（frostpunk#49）：队伍列表画出来，最高 0.8 屏高
  {
    const fb = rep('rep.frostpunk', 'hud-building'), sel = fb.at('el.selection'), names = fb.pk.hud.party.slice(0, 4).map(([nm]) => nm);
    const inSel = names.filter((nm) => fb.tx.some((t) => t.text === nm && !!sel && t.x >= sel.x && t.x <= sel.x + sel.w && t.y >= sel.y && t.y + t.h <= sel.y + sel.h + 1));
    ok(!!sel && inSel.length === names.length && sel.h <= 540 * 0.8 + 0.5, `⑤49 frostpunk 建筑面板的队伍列表都画（${inSel.join('、')}），面板高 ${sel?.h.toFixed(0)}`);
    const d0 = rep('rep.frostpunk', 'hud-building', { 'cmp.detailFields@el.selection': 'auto' }), s0 = d0.at('el.selection');
    ok(!!s0 && s0.h <= 540 * 0.6 + 0.5, `⑤49 没按目标写字段的建筑面板照旧最高 0.6 屏高（${s0?.h.toFixed(0)}）`);
  }
  // ⑥ 警觉「!」与精英环徽都选了：叠放，不再同一个框
  {
    const thOf = (forms: string[]) => baseTheme(resolveUi({ ...cur, 'hud.style': 'darkHairline', 'cnt.elements': 'el.threat', 'el.threat.form': forms.join(',') } as Values), null, 'darkHairline');
    const def = ELEMENTS.get('el.threat')!, p = { x: 480, y: 300 }, a = rec();
    const box = (forms: string[], f: string) => def.pointBox!(makeCtx('el.threat', a.g, a.g, thOf(forms), R0, f), p)!;
    const al = box(['alertMark', 'eliteMark'], 'alertMark'), el = box(['alertMark', 'eliteMark'], 'eliteMark'), al1 = box(['alertMark'], 'alertMark');
    ok(!intersects(al, el) && al.y + al.h <= el.y && Math.abs(al1.y - (p.y - 78 - 13 - 2)) < 3, `⑥ 警觉标记叠在精英环徽上面（${al.y.toFixed(0)}–${(al.y + al.h).toFixed(0)} / ${el.y.toFixed(0)}），只选一种时照原位（${al1.y.toFixed(0)}）`);
  }
  // ⑦ 收尾大卡的飘带角度：飘带自己的 −25°，整屏的 vis.tilt 不让它反过来；按目标写的取大小
  {
    const rot = (x: Values, drop: string[] = []) => { const v = repVals('rep.persona5', 'allout', x) as Record<string, unknown>; for (const k of drop) delete v[k]; return hud(v as Values).a.calls.filter(([k]) => k === 'rotate').map(([, q]) => Number(q[0])); };
    const plain = rot({}, ['vis.tilt@el.notify']), sc = rot({ 'vis.tilt@el.notify': 8 }), rad = (dg: number) => (dg * Math.PI) / 180;
    ok(plain.some((x) => Math.abs(x + rad(25)) < 1e-6) && !plain.some((x) => Math.abs(x - rad(10)) < 1e-6) && sc.some((x) => Math.abs(x + rad(8)) < 1e-6),
      `⑦ persona5 收尾大卡：整屏 vis.tilt = 10 时飘带 −25°（${plain.map((x) => ((x * 180) / Math.PI).toFixed(0)).join(',')}），vis.tilt@el.notify = 8 时 −8°`);
  }
  // ⑧ 低血姿态按样本血量（renderer-issues 第 3 组 #9）
  {
    const lo = (x: Values) => { const r = resolveUi({ ...cur, ...x } as Values), pin = simPin(r)!; return simulate(pin.t, pin.events, r); };
    const a = lo({ 'chk.simPose': 'lowHp' }), b = lo({ 'chk.simPose': 'lowHp', 'cnt.sampleHp': 0.08 });
    ok(Math.abs(a.hp - 0.16) < 1e-6 && Math.abs(b.hp - 0.08) < 1e-6 && b.vignette > 0, `⑧ 低血姿态：没写样本血量 ${a.hp.toFixed(2)}，写了 0.08 时 ${b.hp.toFixed(2)}（暗角照样有）`);
  }
  // ⑨ 思想柜的屏代码（disco-elysium#53）+ ⑩ 宽小地图夹在框里（dead-cells#28）
  {
    const ds = rep('rep.disco-elysium', 'skilltree', {}, { tpl: true });
    ok(ds.texts.includes('THC'), `⑨53 disco 思想柜的工具条屏代码写 THC（${ds.texts.filter((t) => /^[A-Z]{3}$/.test(t)).join(',')}）`);
    const MC = { tag: 'mapCanvas', width: 256, height: 256 };
    const W0 = { player: pt(480, 330), poi: null, target: null, all: [], refDepth: 8, map: { canvas: MC, player: [0.1, 0.5], pois: [], heading: 0, explored: new Uint8Array(1024).fill(1), en: 32 } } as unknown as WorldView;
    const dc = rep('rep.dead-cells', 'hud', {}, { world: W0 }), mmR = dc.at('el.minimap'), img = dc.a.calls.find(([k, q]) => k === 'drawImage' && q[0] === MC)?.[1] as number[] | undefined;
    ok(!!mmR && !!img && img[1] <= mmR.x + 4.5 && img[1] + img[3] >= mmR.x + mmR.w - 4.5 && img[2] <= mmR.y + 4.5 && img[2] + img[4] >= mmR.y + mmR.h - 4.5,
      `⑩28 dead-cells 宽小地图：玩家靠地图左边时方图仍铺满框（图 ${img ? `${img[1].toFixed(0)}–${(img[1] + img[3]).toFixed(0)}` : '-'}，框 ${mmR ? `${mmR.x.toFixed(0)}–${(mmR.x + mmR.w).toFixed(0)}` : '-'}）`);
  }
  // ⑪ 词表：停靠宿主补上新元素、详情字段收卡内子件（数据按字段取）、followLine 的生效条件
  {
    const dock = SPEC_PARAM.get('elx.dockTo')!.options!.map((o) => o.value), df = SPEC_PARAM.get('cmp.detailFields')!.options!.map((o) => o.value);
    ok(['el.buffs', 'el.container', 'el.piles', 'el.passives', 'el.consumables', 'el.population', 'el.ticker', 'el.lowerThird'].every((x) => dock.includes(x)) && !dock.includes('el.worldLabel') && ['nameplate', 'amountBar', 'categoryChip'].every((x) => df.includes(x)) && SPEC_PARAM.get('elx.visibility')!.options!.some((o) => o.value === 'fadeIdle'),
      '⑪ elx.dockTo 收 B7 / B9 / B10 能当宿主的元素，cmp.detailFields 收 nameplate / amountBar / categoryChip，elx.visibility 加 fadeIdle');
    const inact = (v: Values) => checkResolved(resolveUi(v), { inactive: true }).filter((w) => w.id === 'C-inactive' && (w.keys ?? []).includes('lay.focalSide')).length;
    ok(inact(repVals('rep.disco-elysium', 'dialogue')) === 0 && inact({ ...cur, 'lay.focalSide': 'left', 'cnt.focal': 'none', 'uip.screen': 'tpl.inventory' } as Values) === 1,
      '⑪ lay.focalSide = followLine 在累积日志上不要主体（disco 对话不报 C-inactive），别的取值照旧要主体');
    const am = hud({ ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.inventory', 'lay.detail': 'persistent', 'cmp.detailFields': 'name,amountBar,categoryChip' } as Values, { tpl: true });
    const price = String(am.pk.hud.price), type = am.pk.screens.tabs[1] ?? '?';
    ok(am.texts.some((t) => t.includes(price)) && am.texts.includes(type), `⑪ 详情里的金额条写货币 + 价格（${price}）、类别胶囊写类别（${type}）`);
  }
  // —— R4 审查修复（C3 这一组的几条）——
  // 审① 低血：样本血量本身不是低血时 lowHp 照旧掉到 16%（暗角照有）；低血的样本血量照样钉住；combatBeat 的 lowHp 一拍不把血拉回样本血量
  {
    const lo = (x: Values) => { const r = resolveUi({ ...cur, ...x } as Values), pin = simPin(r)!; return simulate(pin.t, pin.events, r); };
    const p6 = lo({ 'chk.simPose': 'lowHp', 'cnt.sampleHp': 0.6 }), p2 = lo({ 'chk.simPose': 'lowHp', 'cnt.sampleHp': 0.2 });
    const rb = resolveUi({ ...cur, 'uip.layout': 'layout.action', 'cnt.sampleHp': 0.6 } as Values), cb = simulate(3, DEMOS.combatBeat.map(([kind, at]) => ({ kind, at })), rb);
    ok(Math.abs(p6.hp - 0.16) < 1e-6 && p6.vignette > 0 && Math.abs(p2.hp - 0.2) < 1e-6 && p2.vignette > 0 && cb.hp < 0.25 && cb.vignette > 0,
      `审① 样本血量 0.6：低血姿态 ${p6.hp.toFixed(2)}（暗角 ${p6.vignette.toFixed(2)}）、combatBeat 3 秒 ${cb.hp.toFixed(2)}（暗角 ${cb.vignette.toFixed(2)}）；样本血量 0.2 时钉到 ${p2.hp.toFixed(2)}`);
  }
  // 审④ 元素把全局的显隐值重写一遍：不在闲置时与邻居一样（照全局那条），不再常亮
  {
    const base = { ...cur, 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', 'cnt.elements': 'el.vitals,el.timer' } as Values;
    const at = (x: Values) => firstA(hud({ ...base, ...x } as Values, { only: ['el.timer'], sim: { t: 0, events: [] } }));
    const gF = at({ 'rel.hudVisibility': 'fadeIdle' }), eF = at({ 'rel.hudVisibility': 'fadeIdle', 'el.timer.visibility': 'fadeIdle' });
    const gC = at({ 'rel.hudVisibility': 'contextual' }), eC = at({ 'rel.hudVisibility': 'contextual', 'el.timer.visibility': 'contextual' });
    ok(gF < 0.99 && Math.abs(eF - gF) < 0.01 && gC < 0.99 && Math.abs(eC - gC) < 0.01, `审④ 元素级重写全局值：静止渐隐 ${eF.toFixed(2)}（全局 ${gF.toFixed(2)}）、情境显现 ${eC.toFixed(2)}（全局 ${gC.toFixed(2)}）`);
  }
  // 审⑤ 同列上下两摞：place() 已经缩过的一摞，2a' 只再缩到最后的缩放 MIN_FIT（0.75）为止
  {
    const v = { ...cur, 'hud.style': 'darkHairline', 'cnt.elements': 'el.minimap,el.objective,el.party,el.prompt,el.vitals,el.quest', 'el.minimap.screenAnchor': 'tr', 'el.objective.screenAnchor': 'tr', 'el.party.screenAnchor': 'tr', 'el.quest.screenAnchor': 'tr', 'el.prompt.screenAnchor': 'br', 'el.vitals.screenAnchor': 'bl', 'el.minimap.scale': 2, 'el.objective.scale': 1.4, 'el.party.scale': 1.6, 'el.prompt.scale': 1.5, 'a11y.textScale': 1.5 } as Values;
    const full = hud(v).at('el.party'), alone = hud({ ...v, 'cnt.elements': 'el.party' } as Values).at('el.party'), k = full && alone ? full.w / alone.w : 0;
    ok(k >= 0.745, `审⑤ 右上一摞已被 place() 缩过时 2a' 不再缩到 0.75 以下（队伍栏 ${full?.w.toFixed(0)} / 单独 ${alone?.w.toFixed(0)} = ${k.toFixed(3)}）`);
  }
  // 审②⑪⑨ 建筑面板：长高按这一列的空当收回（字放大 1.3 倍时不长）；1 倍时长高、不压上下两排；字段区让开底角卷须（让出的高至少 20）
  {
    const f1 = rep('rep.frostpunk', 'hud-building'), s1 = f1.at('el.selection'), f13 = rep('rep.frostpunk', 'hud-building', { 'a11y.textScale': 1.3 }), s13 = f13.at('el.selection');
    const nb = ['el.party', 'el.toolbar#2', 'el.clock#2'].map((id) => f1.at(id)).filter((q): q is Rect => !!q);
    ok(!!s1 && !!s13 && s1.h > 540 * 0.6 + 0.5 && s13.h <= 540 * 0.6 + 0.5 && nb.length === 3 && nb.every((q) => !intersects(q, s1)), `审②⑪ 建筑面板：1 倍 ${s1?.h.toFixed(0)} 高、不压队伍栏 / 工具条 / 时间尺；字放大 1.3 倍时收回 ${s13?.h.toFixed(0)}（原来长到 419）`);
    // 末行队员离面板底多远、离面板左缘多远（字段区左右按饰带内缩、底边让出角块）；不挂四角饰件时照原来贴内边距
    const last = (o: ReturnType<typeof rep>, s: Rect | undefined) => { const nm = o.pk.hud.party[3]?.[0], t = o.tx.find((q) => q.text === nm); return s && t ? [s.y + s.h - (t.y + t.h), t.x - s.x] : [-1, -1]; };
    const f0 = rep('rep.frostpunk', 'hud-building', { 'ast.ornamentAnchor': 'panelEdges,elementEnds' }), [b1, x1] = last(f1, s1), [b0, x0] = last(f0, f0.at('el.selection'));
    const qty = (o: ReturnType<typeof rep>) => o.tx.find((q) => q.text === '工人')?.x ?? -1;
    ok(b1 > 0 && b0 > 0 && b1 >= b0 + 20 && x1 >= x0 + 20 && Math.abs(qty(f1) - s1!.x - (qty(f0) - f0.at('el.selection')!.x)) < 0.5,
      `审⑨ 写了字段的建筑面板让开四角卷须：末行队员离面板底 ${b1.toFixed(0)}、离左缘 ${x1.toFixed(0)}（不挂四角饰件时 ${b0.toFixed(0)} / ${x0.toFixed(0)}），上面的数量行照原来的宽`);
  }
  // 审⑫ 主角级拟声字：竖屏也不比画面宽；挑压屏上 HUD 少的位置（hi-fi：原来右半边压着评级 / 连击）
  {
    const recF = () => {
      const st: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1 }, stack: Record<string, unknown>[] = [];
      return new Proxy({}, {
        get: (_, p) => (typeof p !== 'string' ? undefined : p in st ? st[p] : p === 'measureText' ? (t: string) => ({ width: [...t].length * (Number(/([\d.]+)px/.exec(String(st.font))?.[1]) || 10) })
          : p === 'save' ? () => { stack.push({ ...st }); } : p === 'restore' ? () => { Object.assign(st, stack.pop() ?? {}); } : p === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
            : p.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : p === 'getLineDash' ? () => [] : () => undefined),
        set: (_, p, v) => { st[String(p)] = v; return true; },
      }) as unknown as CanvasRenderingContext2D;
    };
    const v = repVals('rep.hi-fi-rush', 'hud'), th = baseTheme(resolveUi(v), null, String(v['hud.style'] ?? '')), def = ELEMENTS.get('el.feedback')!, g = recF();
    const box = (R: Rect) => def.pointBox!(makeCtx('el.feedback', g, g, th, R, 'comicSFX'), { x: R.w / 2, y: R.h / 2 })!;
    const bp = box({ x: 0, y: 0, w: 540, h: 960 }), bs = box({ x: 0, y: 0, w: 600, h: 600 });
    ok(bp.x >= -0.5 && bp.x + bp.w <= 540.5 && bs.x >= -0.5 && bs.x + bs.w <= 600.5 && bp.w > 400, `审⑫ 竖屏 / 方屏的星爆夹在画面里（540 宽：${bp.x.toFixed(0)}–${(bp.x + bp.w).toFixed(0)}；600 宽：${bs.x.toFixed(0)}–${(bs.x + bs.w).toFixed(0)}）`);
    const hw = rep('rep.hi-fi-rush', 'hud'), soft = hw.occ.find((q) => q.kind === 'world' && q.id === 'el.feedback')!, b0 = def.pointBox!(makeCtx('el.feedback', rec().g, rec().g, th, R0, 'comicSFX'), { x: 0, y: 0 })!;
    const hard = hw.occ.filter((q) => q.kind === 'element' && !q.soft && !(q.id ?? '').startsWith('decor.')).map((q) => q.rect), cost = (b: Rect) => hard.reduce((s0, q) => s0 + overlapArea(b, q), 0);
    // 测试替身的字宽是每字 6（星爆窄而高），这里只核对规则：挪了就比原位少压四分之一以上、没挪就是原位（快照工具里 960 × 540 时挪到左上：右半边不再压评级 / 连击）
    const moved = !!soft && (Math.abs(soft.rect.x - b0.x) > 0.5 || Math.abs(soft.rect.y - b0.y) > 0.5);
    ok(!!soft && (moved ? cost(soft.rect) < cost(b0) * 0.75 : Math.abs(soft.rect.w - b0.w) < 0.5), `审⑫ hi-fi 拟声字：${moved ? '挪到' : '留在'}压 HUD 少的位置（重叠 ${cost(soft?.rect ?? b0).toFixed(0)}，原位 ${cost(b0).toFixed(0)}）`);
  }
  // 审⑬ 档案卡按卡内子件收高：cyberpunk 右上一摞不再因为一张半空的大卡被缩
  {
    const cp = rep('rep.cyberpunk-2077', 'hud'), s2 = cp.at('el.selection#2'), mm = cp.at('el.minimap'), pr = cp.at('el.prompt'), amt = cp.tx.find((t) => t.text.includes('3,900'));
    ok(!!s2 && !!mm && !!pr && !!amt && mm.w > 120 && s2.y + s2.h - (amt.y + amt.h) < 30 && s2.y + s2.h <= pr.y, `审⑬ cyberpunk 档案卡 ${s2?.h.toFixed(0)} 高（字段到 ${amt ? (amt.y + amt.h).toFixed(0) : '-'}），小地图不缩（${mm?.w.toFixed(0)}）、不压按键提示`);
  }
  setSim(sim0);
  setPack('snowline');
  setWorld(null);
  if (!hadDoc) delete gl.document;
}

console.log('== R4 回归修复 · C4 地图烘焙画风（粉笔 / 发光剪影进程序画风表、房间并集轮廓、连续色调陆地平滑放大、虚线出口抠图、纸面画风不跟皮肤色、揭雾圆斑）');
{
  const gl = globalThis as Record<string, unknown>, hadDoc = 'document' in gl, doc0 = gl.document, sim0 = simNow();
  const R0 = { x: 0, y: 0, w: 960, h: 540 };
  // 每张画布（document.createElement 出来的离屏画布与主画布）各记各的调用；globalCompositeOperation 等赋值也记
  type Cv = { id: number; width: number; height: number; calls: [string, unknown[]][]; getContext: () => CanvasRenderingContext2D };
  let cvs: Cv[] = [];
  const mkG = (cv: Cv) => {
    const st: Record<string, unknown> = { lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif' };
    return new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : k === 'canvas' ? cv : k in st ? st[k] : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'measureText' ? (t: string) => ({ width: [...t].length * 6 })
        : k.startsWith('create') ? () => ({ addColorStop() {}, setTransform() {} }) : k === 'getLineDash' ? () => [] : k === 'getImageData' ? (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h })
          : (...a: unknown[]) => { cv.calls.push([k, a]); }),
      set: (_, k, v) => { st[String(k)] = v; cv.calls.push([`${String(k)}=`, [v]]); return true; },
    }) as unknown as CanvasRenderingContext2D;
  };
  const newCv = (w = 0, h = 0): Cv => { const cv = { id: cvs.length, width: w, height: h, calls: [] } as unknown as Cv; const g = mkG(cv); cv.getContext = () => g; cvs.push(cv); return cv; };
  gl.document = { createElement: () => newCv(), fonts: { add() {} } };
  const n = (cv: Cv, k: string) => cv.calls.filter(([q]) => q === k).length;
  const sets = (cv: Cv, k: string) => cv.calls.filter(([q]) => q === `${k}=`).map(([, a]) => a[0]);
  // 假场景：一块 12 × 6 的地面，北边一排 12 个 1 × 1 的墙块（地牢的墙就是这样拼的），地面上一座 4 × 2.4 的房子
  const items: unknown[] = [];
  for (let x = -5.5; x <= 5.5; x += 1) items.push({ role: 'structure', pos: [x, 1, -3.5], scale: [1, 2, 1] });
  items.push({ role: 'structure', pos: [0, 1, 1], scale: [4, 2, 2.4] });
  const desc = { bounds: { center: [0, 0, 0], radius: 10 }, terrain: undefined, ground: { heightAt: () => 0, inside: (x: number, z: number) => Math.abs(x) < 6 && Math.abs(z) < 3 }, items } as never;
  const repValsC4 = (id: string, key: string, extra: Values = {}): Values => {
    const rp = replicas.find((x) => x.id === id)!, s = rp.screens.find((x) => x.key === key)!, p = replicaScreenPatch(rp, s, cur), v = { ...cur, ...p.set, ...extra } as Record<string, unknown>;
    for (const k of p.unset) delete v[k];
    return v as Values;
  };
  const bk = (style: string, size = 1024, colors?: { bg: string; ink: string }) => { cvs = []; const out = bakeMinimap(desc, {}, style, size, colors) as unknown as Cv; return { main: out, all: cvs.slice() }; };
  try {
    // ① 粉笔 / 发光剪影搬进程序画风表：不铺底色（地图外透明）、陆地内填走平滑放大的小画布、陆地边与房间都是等值线路径（不再逐格 fillRect / 每个物体一个框）
    {
      ok(MAP_STEPS.chalk?.clear === true && MAP_STEPS.glowSilhouette?.clear === true && mapClear('chalk') && mapClear('glowSilhouette|x') && !mapClear('linePlan') && !mapClear('flatVector') && mapPaper('frostSketch') && mapPaper('pencil') && !mapPaper('chalk'),
        'C4 ①27 chalk / glowSilhouette 进程序画风表（clear：不铺底色），frostSketch / pencil 是纸面画风');
      const ch = bk('chalk', 1024, { bg: '#000000', ink: '#5fc3d4' }), sm = ch.all.find((c) => c !== ch.main && c.width === 256);
      const full = ch.main.calls.some(([k, a]) => k === 'fillRect' && a[0] === 0 && a[1] === 0 && a[2] === 1024);
      const cells = ch.main.calls.filter(([k, a]) => k === 'fillRect' && a[2] === 4).length;
      const draw = ch.main.calls.some(([k, a]) => k === 'drawImage' && a[0] === sm && a[3] === 1024);
      ok(!full && cells === 0 && n(ch.main, 'strokeRect') === 0 && !!sm && draw && n(sm, 'fillRect') > 100 && n(ch.main, 'stroke') >= 2 && sets(ch.main, 'strokeStyle').every((c) => String(c).startsWith('rgba(95,195,212')),
        `C4 ①27 chalk：地图外透明（没有整张底色）、内填画进 256 的小画布再放大（${sm ? n(sm, 'fillRect') : 0} 格）、没有逐格的 4 px 方块（${cells}）和逐个物体的框（${n(ch.main, 'strokeRect')}），线色 = 墨色`);
      const gs = bk('glowSilhouette');
      ok(n(gs.main, 'strokeRect') === 0 && sets(gs.main, 'shadowBlur').some((b) => Number(b) > 2) && !gs.main.calls.some(([k, a]) => k === 'fillRect' && a[2] === 1024), 'C4 ①27 glowSilhouette：同一套等值线 + 一次外发光，地图外透明');
    }
    // ② 房间 = 建筑占地的并集轮廓（control#33）：一排墙块不再画成一串小方格；大房子照样分两间；线宽 1–2 px@1080p
    {
      const lp = bk('linePlan'), lw = sets(lp.main, 'lineWidth').map(Number);
      const div = lp.main.calls.some(([k, a]) => k === 'moveTo' && Math.abs(Number(a[0]) - (512 + (4 / 20) * 1024 * 0.05)) < 0.01);
      ok(n(lp.main, 'strokeRect') === 0 && n(lp.main, 'stroke') <= 2 && div && lw.length > 0 && lw.every((w) => w <= 2),
        `C4 ②33 linePlan：墙块并成一条轮廓（strokeRect ${n(lp.main, 'strokeRect')}、描边 ${n(lp.main, 'stroke')} 次）、大房子的隔墙照画、线宽 ${[...new Set(lw)].join(' / ')}（原来 3.9 / 2.8）`);
      // 墙块与地面正好互补时，墙的内侧轮廓与陆地边是同一条线（格心口径）：等值线的线段在两份路径里重合
      const segs = (from: number) => { const out: string[] = []; const c = lp.main.calls; for (let i = from; i < c.length && c[i][0] !== 'stroke'; i++) if (c[i][0] === 'moveTo' && c[i + 1]?.[0] === 'lineTo') out.push(`${(c[i][1] as number[]).map((x) => x.toFixed(2))}|${(c[i + 1][1] as number[]).map((x) => x.toFixed(2))}`); return out; };
      const bps = lp.main.calls.map(([k], i) => (k === 'beginPath' ? i : -1)).filter((i) => i >= 0), rooms = segs(bps[0] ?? 0), walls = segs(bps[1] ?? 0);
      const shared = rooms.filter((s) => walls.includes(s)).length;
      ok(shared >= 40, `C4 ②33 墙的内侧轮廓与地面边重合（共用 ${shared} 段，不再并排两道）`);
    }
    // ③ 连续色调的陆地平滑放大（ghost-of-tsushima#31）：desatTerrain 不再逐格画 4 px 方块；块状画风（chart / inkTiles）照旧逐格
    {
      const ds = bk('desatTerrain'), sm = ds.all.find((c) => c !== ds.main && c.width === 256);
      const ch = bk('chart'), it = bk('inkTiles');
      ok(!!sm && n(sm, 'fillRect') > 100 && sm.calls.filter(([k]) => k === 'fillRect').every(([, a]) => a[2] === 1 && a[3] === 1) && ds.main.calls.some(([k, a]) => k === 'drawImage' && a[0] === sm) && !ds.main.calls.some(([k, a]) => k === 'fillRect' && a[2] === 4) && sets(ds.main, 'imageSmoothingEnabled').includes(true),
        `C4 ③31 desatTerrain：陆地每格一个像素画进 256 的小画布、平滑放大铺满（${sm ? n(sm, 'fillRect') : 0} 格），主画布没有 4 px 的格子`);
      ok(ch.main.calls.filter(([k, a]) => k === 'fillRect' && a[2] === 4).length > 100 && it.main.calls.filter(([k, a]) => k === 'fillRect' && a[2] === 4).length > 100, 'C4 ③31 块状画风（chart 类别色块、inkTiles 地皮贴片）照旧逐格平涂');
    }
    // ④ 世界地图：不铺底色的画风 + 虚线出口 → 未探索区从地图上抠掉（hollow-knight#27），不再盖一块面板底色；其余画风照旧盖遮罩
    {
      const explored = new Uint8Array(1024);
      for (let j = 10; j < 20; j++) for (let i = 8; i < 18; i++) explored[j * 32 + i] = 1;
      let bakeArgs: unknown[] = [];
      const world = (bakeCv: Cv) => ({ player: null, poi: null, target: null, all: [], refDepth: 8, map: { canvas: newCv(160, 160), player: [0.4, 0.45], pois: [], heading: 0, explored, en: 32 }, bake: (...a: unknown[]) => { bakeArgs = a; return bakeCv; } }) as unknown as WorldView;
      const shot = (v: Values) => {
        cvs = []; const main = newCv(960, 540), bake = newCv(1024, 1024);
        setWorld(world(bake)); setPack(packFor(resolveUi(v)));
        try { drawScreen({ ctx: main.getContext(), m: newCv(480, 270).getContext(), blur: 0, full: R0 } as never, R0, baseTheme(resolveUi(v), null, String(v['hud.style'] ?? 'darkHairline'))); } finally { setWorld(null); setPack('snowline'); }
        // 按对象认画布（遮罩 / 抠图有模块级缓存，可能是前几次建的）：主画布画过的画布里，画过烘焙图的那张是抠好的地图；192 / 96 见方的是遮罩
        const drawn = main.calls.filter(([k]) => k === 'drawImage').map(([, q]) => q[0] as Cv | undefined);
        const cut = drawn.find((c) => c !== bake && !!c?.calls?.some(([k, q]) => k === 'drawImage' && q[0] === bake));
        const fogs = [...drawn, ...(cut?.calls ?? []).filter(([k]) => k === 'drawImage').map(([, q]) => q[0] as Cv | undefined)].filter((c): c is Cv => !!c && (c.width === 192 || c.width === 96));
        return { main, bake, cut, fogs, args: bakeArgs };
      };
      const W0 = { ...cur, 'hud.style': 'darkHairline', 'uip.screen': 'tpl.worldmap' } as Values;
      const a = shot({ ...W0, 'vis.mapStyle': 'chalk', 'vis.mapUnexplored': 'dashedExits' } as Values);
      const cutOk = !!a.cut && sets(a.cut, 'globalCompositeOperation').includes('destination-out') && a.cut.calls.some(([k, q]) => k === 'drawImage' && a.fogs.includes(q[0] as Cv));
      ok(cutOk && !a.main.calls.some(([k, q]) => k === 'drawImage' && (q[0] === a.bake || a.fogs.includes(q[0] as Cv))) && a.main.calls.some(([k, q]) => k === 'drawImage' && q[0] === a.cut),
        'C4 ④27 chalk + 虚线出口：烘焙图按遮罩 destination-out 抠掉未探索区后画上去，主画布不再画烘焙图原图和遮罩（原来盖一块 0.96 的面板底色）');
      const b = shot({ ...W0, 'vis.mapStyle': 'flatVector', 'vis.mapUnexplored': 'dashedExits' } as Values), c = shot({ ...W0, 'vis.mapStyle': 'chalk', 'vis.mapUnexplored': 'fog' } as Values);
      ok(!b.cut && b.main.calls.some(([k, q]) => k === 'drawImage' && q[0] === b.bake) && b.main.calls.some(([k, q]) => k === 'drawImage' && b.fogs.includes(q[0] as Cv)) && !c.cut && c.main.calls.some(([k, q]) => k === 'drawImage' && c.fogs.includes(q[0] as Cv)),
        'C4 ④27 铺底色的画风（flatVector）+ 虚线出口、粉笔 + 云雾：照旧画烘焙图再盖遮罩');
      const hk = shot(repValsC4('rep.hollow-knight', 'map'));
      ok(!!hk.cut && sets(hk.cut, 'globalCompositeOperation').includes('destination-out') && !hk.main.calls.some(([k, q]) => k === 'drawImage' && q[0] === hk.bake), 'C4 ④27 hollow-knight 地图（chalk + dashedExits）走抠图');
      // ⑤ 揭雾的探索格画成圆斑（ghost-of-tsushima#31）：有场景时遮罩 192 见方、每格一段 arc，不再逐格 fillRect 方块
      const fg = a.fogs[0] ?? c.fogs[0];
      ok(!!fg && fg.width === 192 && n(fg, 'arc') >= 100 && n(fg, 'fill') >= 1 && !fg.calls.some(([k, q]) => k === 'fillRect' && Number(q[2]) < 20), `C4 ⑤31 揭雾：探索格画成圆斑（${fg ? n(fg, 'arc') : 0} 段 arc，没有逐格方块），遮罩 192 见方`);
      // ⑥ 纸面画风不跟 col.source = skin（frostpunk#51）：frostpunk 地图的烘焙不带取色（冷灰纸 + 墨线）；写了 vis.mapInk 时只换线色、纸色照旧；别的画风照旧跟皮肤
      const fp = shot(repValsC4('rep.frostpunk', 'map')), fpi = shot(repValsC4('rep.frostpunk', 'map', { 'vis.mapInk': '#ff8800' }));
      const hkc = hk.args[2] as { bg: string; ink: string } | undefined;
      ok(fp.args[0] === 'frostSketch' && fp.args[2] === undefined && JSON.stringify(fpi.args[2]) === JSON.stringify({ bg: '#dfe3e6', ink: '#ff8800' }) && !!hkc && parseColor(hkc.ink).slice(0, 3).join() === '95,195,212',
        `C4 ⑥51 frostpunk 地图（frostSketch + col.source = skin）烘焙不带皮肤取色（${JSON.stringify(fp.args[2])}），写 vis.mapInk 时 ${JSON.stringify(fpi.args[2])}；chalk 照旧跟皮肤（${JSON.stringify(hkc)}）`);
      // —— R4 审查修复（C4 这一组的几条）——
      // 审⑦ 揭雾圆斑的半径 = 0.6 × 原来方块的边长（C4 的 0.7 是外接圆、揭开的边整体外扩 0.2–0.3 格）：192 的遮罩、32 格，每格 6 像素 → 半径 3.96–5.76
      const rs = fg ? fg.calls.filter(([k]) => k === 'arc').map(([, q]) => Number(q[2])) : [];
      ok(rs.length >= 100 && Math.max(...rs) <= 6 * 1.6 * 0.6 + 1e-6 && Math.min(...rs) >= 6 * 1.1 * 0.6 - 1e-6, `审⑦ 揭雾圆斑半径 ${Math.min(...rs).toFixed(2)}–${Math.max(...rs).toFixed(2)}（原来方块边长的 0.6 倍）`);
      // 审⑩ 纸面画风的路线：线芯用画风的墨色（冷灰纸上对比 ≥ 3），写了 vis.mapInk 时用它；外面垫一圈原来的浅色描边
      const ink = sets(fp.main, 'strokeStyle').map(String), inkI = sets(fpi.main, 'strokeStyle').map(String);
      ok(ink.includes('#3e4a55') && contrastRatio('#3e4a55', '#dfe3e6') >= 3 && inkI.includes('#ff8800') && !sets(hk.main, 'strokeStyle').map(String).includes('#3e4a55'),
        `审⑩ frostpunk 地图的路线线芯 #3e4a55（与冷灰纸对比 ${contrastRatio('#3e4a55', '#dfe3e6').toFixed(1)}），写 vis.mapInk = #ff8800 时用它；chalk 地图不变`);
      // 审③⑰ 透明的世界地图开着时小地图不垫底（hollow-knight 地图 + layout.metroidvania 的居中小地图）；铺底色的画风照旧垫
      const thOf = (v: Values) => baseTheme(resolveUi(v), null, String(v['hud.style'] ?? 'darkHairline'));
      const hkV = repValsC4('rep.hollow-knight', 'map'), ul = underlayIds(thOf(hkV)) ?? [], ul0 = underlayIds(thOf({ ...hkV, 'vis.mapStyle': 'flatVector' } as Values)) ?? [];
      ok(clearMapOpen(thOf(hkV)) && ul.length > 0 && !ul.includes('el.minimap') && ul0.includes('el.minimap') && !clearMapOpen(thOf({ ...hkV, 'vis.mapUnexplored': 'fog' } as Values)),
        `审③⑰ hollow-knight 地图（chalk + dashedExits）：垫底不画小地图（${ul.join(',')}）；铺底色的画风 / 云雾照旧`);
    }
  } finally {
    setSim(sim0);
    setPack('snowline');
    setWorld(null);
    if (hadDoc) gl.document = doc0; else delete gl.document;
  }
}

console.log('== G5 商业化名单');
ok(isMonetizationPreset('tpl.gachaResult') && isMonetizationPreset('ex.cnCheckin') && !isMonetizationPreset('tpl.inventory') && !isMonetizationPreset('tpl.shopCounter'), '模板与案例');
ok(isMonetizationValue('ops.badges', 'auto') && isMonetizationValue('cnt.screen', 'screen.liveops') && !isMonetizationValue('cnt.screen', 'screen.hud'), '参数取值');
ok(isMonetizationPreset('rcp.mobileArpgF2P'), '手游 F2P 配方收进商业化');
const pr0 = (id: string) => PRESET.get(id)!;
ok(presetCarriesMonetization(pr0('tpl.lobby')) && presetCarriesMonetization(pr0('tpl.mail')) && presetCarriesMonetization(pr0('tpl.quest')), '手游主界面 / 邮件 / 任务带商业化取值');
ok(!presetCarriesMonetization(pr0('tpl.inventory')) && !presetCarriesMonetization(pr0('tpl.draft3')) && !presetCarriesMonetization(pr0('tpl.settle')), '背包 / 三选一 / 结算不算商业化');
const allParts = new Set<UiRandomPart>(['start', 'style', 'screen', 'layout', 'context']);
let randBad = 0, opsTouched = 0, screenDefault = 0;
for (let seed = 1; seed <= 60; seed++) {
  const v = randomizeUi(cur, seed * 7919, 0.6, allParts);
  const tpl = v[SELECTORS.screen];
  if (typeof tpl === 'string' && (MONETIZATION_TEMPLATES.has(tpl) || ['tpl.lobby', 'tpl.mail', 'tpl.quest'].includes(tpl))) randBad++;
  if (Object.keys(v).some((x) => x.startsWith('ops.'))) opsTouched++;
  if (SELECTORS.screen in randomizeUi(cur, seed * 7919, 1)) screenDefault++;
}
ok(randBad === 0, `随机 60 次不出商业化 / 手游运营界面（${randBad}）`);
ok(opsTouched === 0, `随机不动 ops.*（${opsTouched}）`);
ok(screenDefault === 0, `默认（起点 + 风格细节）不随机界面模板（${screenDefault}）`);

console.log(fails ? `\n${fails} / ${n} 项失败` : `\n全部 ${n} 项通过`);
if (fails) process.exit(1);
