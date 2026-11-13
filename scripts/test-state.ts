/*
 * 状态与重置的不变量测试（轨道 A，docs/workbench-redesign.md §4、§11.1 A 的验收）：
 *   - 任何「套用」之后，对应层的改动 = ∅（配方、风格图谱、案例近似、皮肤、风格词 / 成套 / 案例屏、场景、界面、复刻）；
 *   - 换配方不碰 UI 键；换皮肤不碰画面键、不碰元素位置；换场景保留画面改动、皮肤、UI 样式改动，丢掉元素位置；
 *   - 「全部重新开始」与全新状态的差为空；每次重置只占一步撤销；
 *   - 视图键不进撤销、不进存档；收藏 / A 槽恢复精确替换 UI 键集合；跳到历史某一步、撤销 / 重做带着来源走。
 * 运行：npm test（或 npx tsx scripts/test-state.ts）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/dims/index';
import { gameScene, homeScreen, rigValues, sceneValues, START_SCENE_ID } from '../src/content/gameScenes';
import { RECIPES } from '../src/content/recipes';
import { isRigLocked, SCENE_MAP, SCENES } from '../src/content/sceneCatalog';
import { FIRST_RUN } from '../src/content/taxonomy';
import { STYLES } from '../src/content/styles.data';
import type { KReplica } from '../src/content/uiKnowledge';
import { defaultValues, getParam, isUiKey, isViewKey, validKey } from '../src/dims/registry';
import type { Values } from '../src/dims/types';
import { skinValueOf } from '../src/hud/sys/register';
import { resolveUi } from '../src/hud/sys/resolve';
import { presetsOf } from '../src/hud/sys/spec';
import * as A from '../src/state/actions';
import * as L from '../src/state/layers';
import { compact } from '../src/state/persist';
import { SCHEMA_VERSION, useStore } from '../src/state/store';
import { layerCounts } from '../src/state/view';
import { endDemo, startDemo } from '../src/ui/learn/principleDemo';
import { replicaInput as replicaPlanD } from '../src/ui/scene/replicaPlan';

let fails = 0, n = 0;
const ok = (c: boolean, msg: string) => { n++; if (!c) { fails++; console.log(`  ✗ ${msg}`); } };
const S = () => useStore.getState();
const counts = () => L.countLayers(S().values, S().origin);
const mods = () => L.modifiedKeysOf(S().values, S().origin);
/** 两份值里 f 选中的键是否完全一样（规范化比较；动态键「没有」= auto） */
const sameOn = (a: Values, b: Values, f: (k: string) => boolean) => L.diffKeys(a, b).filter(f);
const isPos = (k: string) => L.layerOfKey(k) === 'uiPos';
const isArt = (k: string) => !isUiKey(k) && !isViewKey(k) && !k.startsWith('game.');

/** 回到全新状态（清掉撤销记录） */
function fresh() {
  useStore.setState({ values: L.freshValues(), origin: L.freshOrigin(), history: [], future: [], lastCommit: null, preview: null });
}
/** 没选场景、没用配方的空白状态（基线 = 参数默认值）：测「没选场景时」的规则用（首屏现在有场景了，整合修复 X#3） */
function blank() {
  useStore.setState({ values: { ...defaultValues() }, origin: L.emptyOrigin(), history: [], future: [], lastCommit: null, preview: null });
}

/** 一个「改得很乱」的状态：配方 + 皮肤 + 画面微调 + UI 样式 + 元素位置 + 实例 + 场景改动 + 检查工具 */
function dirty() {
  fresh();
  A.applyRecipe(RECIPES.find((r) => r.id === 'watercolor')!);
  A.applySkin('skin.glass');
  const s = S();
  s.set('shading.steps', 5);
  s.set('lines.outlineWidth', 3.3);
  s.set('vis.corner', 'cut');
  s.set('col.accent', '#ff0000');
  s.set('vis.motif', 'geometric');
  s.set('vis.cornerSize@el.vitals', 12);
  s.set('el.vitals.screenAnchor', 'tr');
  s.set('el.vitals.scale', 1.4);
  s.set('el.threat#2.screenAnchor', 'tl');
  s.set('game.seed', 42);
  s.set('chk.cvd', 'protan');
}

/* ---------------- 基础 ---------------- */

console.log('== 全新状态');
fresh();
ok(counts().total === 0, '全新状态没有改动');
ok(S().origin.recipe === L.START_RECIPE, `首屏配方 = ${L.START_RECIPE}`);
ok(Object.keys(defaultValues()).every((k) => k in S().values), '全新状态包含所有登记参数');

console.log('== dirty 状态的层归属');
dirty();
{
  const c = counts();
  const m = mods();
  ok(c.art === 2, `画面改动 2 项（实际 ${c.art}：${m.filter((k) => L.layerOfKey(k) === 'art').join('、')}）`);
  ok(c.uiStyle === 4, `UI 样式改动 4 项（实际 ${c.uiStyle}：${m.filter((k) => L.layerOfKey(k) === 'uiStyle').join('、')}）`);
  ok(c.uiPos === 2, `元素位置改动按元素数 2 个（生命、威胁 #2；实际 ${c.uiPos}：${m.filter(isPos).join('、')}）`);
  ok(c.scene === 1, `场景改动 1 项（种子，实际 ${c.scene}）`);
  ok(!m.includes('chk.cvd'), '检查工具（视图键）不算改动');
}

/* ---------------- 套用之后改动 = ∅ ---------------- */

console.log('== 配方（全部）：画面改动归零，UI 键、场景键一个不动');
{
  let bad = 0, uiTouched = 0, sceneTouched = 0;
  for (const r of RECIPES) {
    dirty();
    const before = { ...S().values };
    const h = S().history.length;
    A.applyRecipe(r);
    const after = S().values;
    if (counts().art !== 0) { bad++; if (bad <= 3) console.log(`    ${r.id}：画面改动 ${mods().filter((k) => L.layerOfKey(k) === 'art').join('、')}`); }
    if (sameOn(before, after, isUiKey).length) uiTouched++;
    if (sameOn(before, after, (k) => k.startsWith('game.')).length) sceneTouched++;
    ok(S().history.length === h + 1, `${r.id}：一步撤销`);
  }
  ok(bad === 0, `${RECIPES.length} 个配方套用后画面改动都是 0（${bad} 个不是）`);
  ok(uiTouched === 0, `换配方不碰 UI 键（${uiTouched} 个碰了）`);
  ok(sceneTouched === 0, `换配方不碰场景键（${sceneTouched} 个碰了）`);
  let freshBad = 0;
  for (const r of RECIPES) { fresh(); A.applyRecipe(r); if (counts().total) freshBad++; }
  ok(freshBad === 0, `从全新状态套每个配方：改动总数 0（${freshBad} 个不是）`);
}

console.log('== 风格图谱近似（全部）');
{
  let bad = 0, uiTouched = 0;
  for (const st of STYLES) {
    dirty();
    const before = { ...S().values };
    A.applyStyle(st);
    if (counts().art !== 0) bad++;
    if (sameOn(before, S().values, isUiKey).length) uiTouched++;
  }
  ok(bad === 0, `${STYLES.length} 个风格条目套用后画面改动都是 0（${bad} 个不是）`);
  ok(uiTouched === 0, `风格条目不碰 UI 键（${uiTouched} 个碰了）`);
  ok(S().baseStyle === STYLES[STYLES.length - 1].id, 'baseStyle（兼容字段）= 风格条目 id');
}

console.log('== 案例近似');
{
  // cases.ts 顶层用了 import.meta.glob（node 里跑不了），直接读拆解文件
  const dir = join(process.cwd(), 'src/content/cases');
  const list = readdirSync(dir).filter((f) => /^analysis-\d+\.json$/.test(f))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as { id: string; recipe?: string; approx?: Values }[])
    .filter((c) => c.approx && Object.keys(c.approx).length);
  let bad = 0;
  for (const c of list) {
    dirty();
    A.applyCaseApprox({ id: c.id, name: c.id, recipe: c.recipe ?? null, values: c.approx! });
    if (counts().art !== 0) bad++;
  }
  ok(list.length > 0 && bad === 0, `${list.length} 个案例近似套用后画面改动都是 0（${bad} 个不是）`);
}

console.log('== 皮肤（全部）：只清皮肤负责的样式，画面键、元素位置一个不动');
{
  const skins = presetsOf('skin');
  let bad = 0, artTouched = 0, posTouched = 0, freshBad = 0;
  for (const p of skins) {
    dirty();
    const before = { ...S().values };
    A.applySkin(p.id);
    const after = S().values;
    const left = mods().filter((k) => L.layerOfKey(k) === 'uiStyle' && L.skinOwns(k));
    if (left.length) bad++;
    if (sameOn(before, after, (k) => !isUiKey(k) && !isViewKey(k)).length) artTouched++;
    if (sameOn(before, after, isPos).length) posTouched++;
    fresh(); A.applySkin(p.id); if (counts().total) freshBad++;
  }
  ok(bad === 0, `${skins.length} 个皮肤：皮肤负责的手动样式都清掉了（${bad} 个没清干净）`);
  ok(artTouched === 0, `换皮肤不碰画面键（${artTouched} 个碰了）`);
  ok(posTouched === 0, `换皮肤保留元素位置（${posTouched} 个动了）`);
  ok(freshBad === 0, `从全新状态换每个皮肤：改动总数 0（${freshBad} 个不是）`);
  dirty();
  A.applySkin('skin.flat');
  ok(S().values['vis.motif'] === 'geometric', '皮肤不负责的手动样式（vis.motif）保留');
  ok(S().values['vis.corner'] !== 'cut', '皮肤负责的手动样式（vis.corner）清掉');
  ok(S().values['vis.cornerSize@el.vitals'] === undefined, '皮肤负责的作用域样式（vis.cornerSize@el.vitals）清掉');
  ok(/清 \d+ 项/.test(S().lastChange?.label ?? ''), `栏条写清了几项：${S().lastChange?.label}`);
  A.applySkin('skin.flat', { keepMine: true });
  dirty();
  A.applySkin('skin.flat', { keepMine: true });
  ok(S().values['vis.corner'] === 'cut', '保留我的改动：换皮肤不清手动样式');
}

console.log('== 风格词 / 节日 / 成套 / 案例屏（全部）');
{
  const kinds = ['keyword', 'theme', 'recipe', 'example'] as const;
  for (const kind of kinds) {
    let bad = 0, artTouched = 0;
    const list = presetsOf(kind);
    for (const p of list) {
      fresh();
      const before = { ...S().values };
      A.applyUiPreset(p.id);
      if (counts().total) { bad++; if (bad <= 2) console.log(`    ${p.id}：${mods().slice(0, 6).join('、')}`); }
      if (sameOn(before, S().values, isArt).length) artTouched++;
    }
    ok(bad === 0, `${kind}：${list.length} 个套用后改动总数 0（${bad} 个不是）`);
    ok(artTouched === 0, `${kind}：不碰画面键（${artTouched} 个碰了）`);
  }
  fresh();
  const kw = presetsOf('keyword')[0];
  A.pickUiPreset(kw.id);
  ok(S().values['uip.keyword'] === kw.id, '点风格词：选中');
  A.pickUiPreset(kw.id);
  ok(S().values['uip.keyword'] !== kw.id && counts().total === 0, '再点一次：退回「不用」，没有改动');
  const sk = presetsOf('skin')[3];
  A.pickSkin(sk.id);
  A.pickSkin(sk.id);
  ok(S().origin.skin === null && counts().total === 0, '皮肤再点一次：回到场景默认皮肤');
}

console.log('== 场景（桩：sceneCatalog 的 25 个环境，单双号锁定镜头）');
const sceneStub = (i: number): L.SceneInput => {
  const env = SCENES[i % SCENES.length];
  return {
    id: `scene.${env.id}`, name: env.name, rigLock: i % 2 === 0,
    values: { 'game.scene': env.id, 'game.seed': 100 + i, 'game.genre': 'explore', 'uip.layout': 'layout.explore', 'cnt.pack': 'auto', 'hud.style': 'flat', ...(i % 2 === 0 ? { 'camera.projection': 'ortho', 'camera.angle': 'side', 'camera.azimuth': 0 } : {}) },
    home: { id: 'hud', name: '局内', values: { 'uip.screen': 'auto' } },
  };
};
{
  let bad = 0, artLost = 0, posKept = 0, skinLost = 0, styleLost = 0;
  for (let i = 0; i < SCENES.length; i++) {
    dirty();
    A.applyScene(sceneStub(i));
    const c = counts();
    if (c.scene || c.uiPos) bad++;
    if (S().values['shading.steps'] !== 5) artLost++;
    if (S().origin.skin !== 'skin.glass') skinLost++;
    if (S().values['vis.motif'] !== 'geometric') styleLost++;
    if (mods().some(isPos)) posKept++;
  }
  ok(bad === 0, `${SCENES.length} 个场景：场景改动、元素位置改动都是 0（${bad} 个不是）`);
  ok(artLost === 0, `换场景保留画面改动（${artLost} 个丢了）`);
  ok(skinLost === 0, `换场景保留皮肤（${skinLost} 个丢了）`);
  ok(styleLost === 0, `换场景保留 UI 样式改动（${styleLost} 个丢了）`);
  ok(posKept === 0, `换场景丢掉元素位置改动（${posKept} 个没丢）`);
  fresh();
  A.applyScene(sceneStub(0));
  ok(counts().total === 0, '从全新状态换场景：改动总数 0');
  ok(S().values['camera.angle'] === 'side', '锁定镜头的场景：机位用场景的');
  A.applyRecipe(RECIPES.find((r) => r.values['camera.angle'] && r.values['camera.angle'] !== 'side')!);
  ok(S().values['camera.angle'] === 'side' && counts().total === 0, '锁定镜头时配方带来的机位不生效（也不算改动）');
  A.applyScreen({ id: 'boss', name: 'Boss', values: { 'uip.screen': 'tpl.bossIntro', 'cnt.screen': 'screen.hud' } });
  ok(counts().total === 0 && S().origin.screen === 'boss', '换界面：改动 0');
  A.resetScene();
  ok(S().origin.screen === 'hud' && S().values['uip.screen'] === 'auto', '场景 ▾ 回到场景原样：界面回到局内');
  dirty();
  A.applyEnv('forest');
  ok(S().values['game.scene'] === 'forest' && counts().scene === 1 && S().values['shading.steps'] === 5 && S().origin.skin === 'skin.glass', '只换环境：不算改动（只剩种子），画面、皮肤不动');
}

console.log('== UI 感觉芯片：选中的再点一次 = 去掉');
{
  const nudges = presetsOf('nudge');
  let bad = 0;
  for (const p of nudges) {
    fresh();
    A.pickNudge(p.id);
    const st1 = A.nudgeState(p.id);
    if (!st1.on) { bad++; continue; }
    A.pickNudge(p.id);
    if (counts().total !== 0) bad++;
  }
  ok(bad === 0, `${nudges.length} 个感觉芯片：点了显示选中，再点回到原样（${bad} 个不对）`);
}

console.log('== 复刻 / 名作（全部 json，每份前两屏）');
{
  const dir = join(process.cwd(), 'src/content/replicas');
  const reps = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as KReplica);
  let bad = 0, uiOnlyBad = 0, artMoved = 0, total = 0;
  for (const rep of reps) {
    for (const scr of rep.screens.slice(0, 2)) {
      total++;
      dirty();
      A.applyReplica(rep, scr);
      if (counts().total) { bad++; if (bad <= 3) console.log(`    ${rep.id}/${scr.key}：${mods().slice(0, 6).join('、')}`); }
      dirty();
      const before = { ...S().values };
      A.applyReplica(rep, scr, { uiOnly: true });
      if (counts().ui || counts().scene !== 1) { uiOnlyBad++; if (uiOnlyBad <= 3) console.log(`    只套 UI ${rep.id}/${scr.key}：${mods().slice(0, 6).join('、')}`); }
      if (sameOn(before, S().values, (k) => !isUiKey(k) && !isViewKey(k)).length) artMoved++;
    }
  }
  ok(bad === 0, `${reps.length} 份复刻 ${total} 屏：套用后改动总数 0（${bad} 屏不是）`);
  ok(uiOnlyBad === 0, `只套 UI：UI 改动 0，场景只剩原来的种子改动（${uiOnlyBad} 屏不是）`);
  ok(artMoved === 0, `只套 UI：画面键一个不动（${artMoved} 屏动了）`);
}

/* ---------------- 重置 ---------------- */

console.log('== 每种重置：清对应的层、只占一步撤销');
{
  const step = (label: string, f: () => void, check: () => boolean) => {
    dirty();
    const h = S().history.length;
    f();
    ok(S().history.length === h + 1, `${label}：一步撤销`);
    ok(check(), `${label}：结果对`);
  };
  step('画面 ↺', A.resetArt, () => { const c = counts(); return c.art === 0 && c.uiStyle === 4 && c.uiPos === 2 && c.scene === 1 && S().origin.recipe === 'watercolor'; });
  step('不用配方', A.dropRecipe, () => counts().art === 0 && S().origin.recipe === null && S().values['shading.steps'] === defaultValues()['shading.steps']);
  step('清样式改动', A.resetUiStyle, () => { const c = counts(); return c.uiStyle === 0 && c.uiPos === 2 && c.art === 2 && S().origin.skin === 'skin.glass'; });
  step('还原元素位置', A.resetUiPos, () => { const c = counts(); return c.uiPos === 0 && c.uiStyle === 4 && S().values['el.threat#2.screenAnchor'] === undefined; });
  step('回到场景默认 UI', A.resetUiToScene, () => { const c = counts(); return c.ui === 0 && c.art === 2 && S().origin.skin === null && S().values['hud.style'] === L.freshValues()['hud.style'] && !Object.keys(S().values).some((k) => isUiKey(k) && !validKeyRegistered(k)); });
  step('场景 ↺', A.resetScene, () => { const c = counts(); return c.scene === 0 && c.art === 2 && c.ui === 6; });
  step('元素 ↺', () => A.resetElement('el.vitals'), () => !mods().some((k) => k.startsWith('el.vitals.') || k.endsWith('@el.vitals')) && S().values['el.threat#2.screenAnchor'] === 'tl' && S().values['vis.cornerSize@el.vitals'] === undefined);
  step('行 ↺', () => A.resetKey('shading.steps'), () => counts().art === 1 && S().values['shading.steps'] === L.baseValueOf('shading.steps', S().origin));
  step('组 ↺', () => A.resetKeys(['shading.steps', 'lines.outlineWidth', 'world.mesh']), () => counts().art === 0);
  // 没改动时重置不推空撤销
  fresh();
  A.resetArt();
  ok(S().history.length === 0, '没有改动时重置不推空撤销');
}
/** 登记过的参数（不是动态的元素实例键 / 覆盖键） */
function validKeyRegistered(k: string) { return validKey(k) && k in defaultValues(); }

console.log('== 全部重新开始 = 全新状态');
{
  dirty();
  const h = S().history.length;
  const before = counts();
  A.resetAll();
  const want = L.freshValues();
  const diff = L.diffKeys(S().values, want);
  ok(diff.length === 0, `与全新状态的差为空（差 ${diff.length} 项：${diff.slice(0, 5).join('、')}）`);
  ok(JSON.stringify(S().origin) === JSON.stringify(L.freshOrigin()), '来源 = 全新来源');
  ok(S().history.length === h + 1, '一步撤销');
  ok(S().values['chk.cvd'] === defaultValues()['chk.cvd'], '检查工具（视图键）一起复位');
  S().undo();
  ok(JSON.stringify(counts()) === JSON.stringify(before) && S().origin.skin === 'skin.glass', `撤销回到重置前（改动 ${counts().total}，皮肤 ${S().origin.skin}）`);
  // 「我的游戏」保留
  fresh();
  S().set('uip.platform', 'platform.phoneLandscape');
  ok(counts().total === 0, '「我的游戏」（平台）不算改动');
  A.resetAll();
  ok(S().values['uip.platform'] === 'platform.phoneLandscape', '全部重新开始保留「我的游戏」');
}

/* ---------------- 视图键、撤销、恢复 ---------------- */

console.log('== 视图键不进撤销、不进存档');
{
  fresh();
  S().set('chk.cvd', 'deutan');
  ok(S().history.length === 0, '开检查工具不推撤销');
  S().set('shading.steps', 6);
  S().set('chk.cvd', 'tritan');
  S().undo();
  ok(S().values['chk.cvd'] === 'tritan' && S().values['shading.steps'] !== 6, '撤销不动检查工具，只撤参数');
  ok(!('chk.cvd' in compact(S().values)), '工作副本不存检查工具');
  ok(!Object.keys(S().history[0]?.values ?? S().future[0].values).some(isViewKey), '撤销记录里没有视图键');
}

console.log('== 撤销 / 重做 / 跳到某一步带着来源走');
{
  fresh();
  A.applyRecipe(RECIPES[3]);
  A.applySkin('skin.flat');
  S().set('shading.steps', 7);
  const o2 = S().history[2].origin;
  S().jumpTo(1);
  ok(S().origin.recipe === RECIPES[3].id && S().origin.skin === null && counts().total === 0, '跳到第 1 步：只有配方');
  ok(S().future.length === 2, '后面两步进了重做');
  S().redo();
  ok(S().origin.skin === 'skin.flat' && S().origin === o2, '重做：皮肤回来，来源对象就是那一步记的');
  S().redo();
  ok(counts().art === 1, '再重做：画面改动 1 项');
  S().undo(); S().undo(); S().undo();
  ok(S().origin.recipe === L.START_RECIPE, '撤销到底：回到首屏配方');
}

console.log('== 恢复（收藏 / A 槽 / 导入）精确替换');
{
  dirty();
  const saved = { values: { ...S().values }, origin: S().origin };
  const savedCounts = counts();
  fresh();
  S().set('el.minimap.screenAnchor', 'bl');
  S().set('vis.corner@el.minimap', 'round');
  S().restore(saved, '恢复收藏', 'all');
  ok(S().values['el.minimap.screenAnchor'] === undefined && S().values['vis.corner@el.minimap'] === undefined, '快照里没有的动态键丢掉');
  ok(JSON.stringify(counts()) === JSON.stringify(savedCounts), '三个标签的改动数和收藏时一样');
  // 旧收藏（没有来源，只有 baseRecipe）：画面按配方当原样
  fresh();
  A.applyRecipe(RECIPES.find((r) => r.id === 'ink-landscape')!);
  const legacy = { values: { ...S().values }, baseRecipe: 'ink-landscape' };
  fresh();
  S().restore(legacy, '恢复旧收藏', 'all');
  ok(S().baseRecipe === 'ink-landscape' && counts().art === 0, '旧收藏：画面按它记的配方当原样');
  // A 槽 ⇄
  dirty();
  S().saveA();
  const aCounts = counts();
  fresh();
  S().set('el.minimap.screenAnchor', 'bl');
  S().swapToA();
  ok(JSON.stringify(counts()) === JSON.stringify(aCounts) && S().values['el.minimap.screenAnchor'] === undefined, '⇄ 换成 A：精确替换，来源一起换');
  ok(S().slotA?.values['el.minimap.screenAnchor'] === 'bl', '⇄ 之后 A 槽是换之前的状态');
}

console.log('== 保留我的改动 / 再点取消 / 旧调用兼容');
{
  dirty();
  A.applyRecipe(RECIPES.find((r) => r.id === 'gouache')!, { keepMine: true });
  ok(S().values['shading.steps'] === 5, '保留我的改动：换配方保留画面微调');
  A.pickRecipe(RECIPES.find((r) => r.id === 'gouache')!);
  ok(S().origin.recipe === null, '再点一次已选中的配方：不用配方');
  // 旧写法：setMany 整套换 + setBaseRecipe
  fresh();
  const r = RECIPES.find((x) => x.id === 'pixel3d')!;
  S().setMany({ ...r.values, 'game.scene': S().values['game.scene'] }, '旧写法', true);
  S().setBaseRecipe(r.id);
  ok(counts().art === 0 && S().baseRecipe === 'pixel3d', '旧写法（setMany + setBaseRecipe）：画面改动归零');
  // 感觉微调、混搭写入算普通改动
  fresh();
  S().setMany({ 'shading.steps': 2, 'color.saturation': 0.2 }, '感觉：更平');
  ok(counts().art === 2, '感觉微调算普通改动');
}

/* ---------------- 审查修复（docs/redesign/track-A.md「审查修复」） ---------------- */

console.log('== 审查修复 1 / 6：元素 ↺ 把 cnt.elements 放回跟随布局，删掉实例');
{
  const baseList = () => String(resolveUi(L.baseValues(S().origin)).get('cnt.elements') ?? '').split(',').filter(Boolean);
  blank();
  const bl = baseList();
  ok(bl.includes('el.minimap') && String(S().values['cnt.elements'] ?? 'auto') === 'auto', `空白状态：cnt.elements 跟随布局（解析出 ${bl.length} 个元素）`);
  // 隐藏小地图（Delete / 👁）再 ↺
  S().set('cnt.elements', bl.filter((x) => x !== 'el.minimap').join(','));
  ok(counts().ui === 1, '隐藏一个元素：UI ·1');
  A.resetElement('el.minimap');
  ok(String(S().values['cnt.elements'] ?? 'auto') === 'auto' && counts().total === 0, `元素 ↺ 后 cnt.elements 回到 auto、没有改动（${S().values['cnt.elements']}，${JSON.stringify(counts())}）`);
  // 隐藏第一个元素：↺ 后画的先后不变（空白状态与首屏的沙盒·小岛各试一次）
  for (const start of [blank, fresh]) {
    start();
    const list = baseList();
    S().set('cnt.elements', list.slice(1).join(','));
    A.resetElement(list[0]);
    ok(String(S().values['cnt.elements'] ?? 'auto') === 'auto' && counts().total === 0, `隐藏第一个元素再 ↺：回到 auto（不排到最后；${start.name}）`);
  }
  // 显式清单（场景给了清单）里隐藏一个、再 ↺：插回原来的位置
  fresh();
  const explicit = ['el.vitals', 'el.minimap', 'el.objective'];
  A.applyScene({ id: 'scene.test', name: '测试', values: { 'game.scene': 'forest', 'cnt.elements': explicit.join(',') } });
  S().set('cnt.elements', 'el.vitals,el.objective');
  A.resetElement('el.minimap');
  ok(S().values['cnt.elements'] === explicit.join(',') && counts().total === 0, `显式清单：插回原位（${S().values['cnt.elements']}）`);
  // 实例 #2：元素 ↺ 一起删掉
  blank();
  S().set('cnt.elements', [...bl, 'el.vitals#2'].join(','));
  S().set('el.vitals#2.screenAnchor', 'tr');
  S().set('el.vitals.scale', 1.3);
  A.resetElement('el.vitals');
  ok(String(S().values['cnt.elements'] ?? 'auto') === 'auto' && S().values['el.vitals#2.screenAnchor'] === undefined && counts().total === 0, `元素 ↺ 删掉实例 #2（${S().values['cnt.elements']}，${JSON.stringify(counts())}）`);
}

console.log('== 审查修复 2：setBaseRecipe（兼容写法）不把手动微调吞进「原样」');
{
  fresh();
  const wc = RECIPES.find((r) => r.id === 'watercolor')!, ink = RECIPES.find((r) => r.id === 'ink-landscape')!;
  A.applyRecipe(wc);
  S().set('shading.steps', 5);
  S().set('lines.outlineWidth', 3.3);
  ok(counts().art === 2, '水彩 + 两项微调：画面 ·2');
  const prev = { ...S().values };
  // 原则演示开始：换成水墨（patch + setBaseRecipe）……结束：值放回去 + setBaseRecipe(原配方)
  S().patch(L.artPart(ink.values), [], '演示'); S().setBaseRecipe('ink-landscape');
  S().patch(prev, [], '结束演示'); S().setBaseRecipe('watercolor');
  ok(S().values['shading.steps'] === 5 && counts().art === 2, `演示结束：值回来了，微调仍算改动（画面 ·${counts().art}）`);
  A.resetArt();
  ok(S().values['shading.steps'] === L.baseValueOf('shading.steps', S().origin) && counts().art === 0, '重置画面能撤掉它们');
  ok(S().origin.layers.look['shading.steps'] === L.recipeLook('watercolor')!['shading.steps'], '画面层 = 配方本身');
}

console.log('== 审查修复 3 / 5：成套不换场景的布局与界面；「我的游戏」去掉成套时放回');
{
  const rcps = presetsOf('recipe');
  let layoutMoved = 0, screenMoved = 0, dirtyAfter = 0, profileLeft = 0;
  for (const p of rcps) {
    fresh();
    A.applyScene({ id: 'scene.souls', name: '魂类', values: { 'game.scene': 'castle', 'uip.layout': 'layout.action' }, home: { id: 'hud', name: '局内', values: { 'uip.screen': 'auto' } } });
    A.applyScreen({ id: 'inv', name: '背包', values: { 'uip.screen': 'tpl.inventory' } });
    S().set('uip.platform', 'platform.pc');
    S().set('uip.business', 'business.liveService');
    A.applyUiPreset(p.id);
    if (S().values['uip.layout'] !== 'layout.action') layoutMoved++;
    if (S().values['uip.screen'] !== 'tpl.inventory' || S().origin.screen !== 'inv') screenMoved++;
    if (counts().total) dirtyAfter++;
    A.pickUiPreset(p.id);
    if (S().values['uip.platform'] !== 'platform.pc' || S().values['uip.business'] !== 'business.liveService') { profileLeft++; if (profileLeft <= 2) console.log(`    ${p.id}：${S().values['uip.platform']} / ${S().values['uip.business']}`); }
  }
  ok(layoutMoved === 0, `${rcps.length} 套成套：选了场景时不换布局（${layoutMoved} 套换了）`);
  ok(screenMoved === 0, `成套不把正在看的界面换回局内（${screenMoved} 套换了）`);
  ok(dirtyAfter === 0, `成套套完改动 0（${dirtyAfter} 套不是）`);
  ok(profileLeft === 0, `再点一次去掉成套：平台 / 商业模式放回原样（${profileLeft} 套没放回）`);
  // 没选场景时照旧接成套写明的布局
  blank();
  A.applyUiPreset('rcp.hadesLike');
  ok(S().values['uip.layout'] === 'layout.action' && counts().total === 0, '没选场景：成套写明的布局照接');
  // 套完成套后自己又改了平台：去掉成套时不动
  S().set('uip.platform', 'platform.tv');
  A.pickUiPreset('rcp.hadesLike');
  ok(S().values['uip.platform'] === 'platform.tv', '套完又手动改的平台：去掉成套时保留');
  // 回到场景默认 UI 也放回
  fresh();
  S().set('uip.platform', 'platform.tablet');
  A.applyUiPreset('rcp.noHud');
  A.resetUiToScene();
  ok(S().values['uip.platform'] === 'platform.tablet' && JSON.stringify(S().origin.stash) === '{}', '回到场景默认 UI：成套改的平台放回');
}

console.log('== 审查修复 4：有改动时重置项可点（来源离开默认也算）');
{
  fresh();
  A.applySkin('skin.glass');
  S().setMany({ 'hud.style': 'neobrutal' }, '旧控件直接写');
  ok(counts().ui === 1 && L.uiPicked(S().origin), 'UI ·1 且来源有皮肤：「回到场景默认 UI」可点');
  const h = S().history.length;
  A.resetUiToScene();
  ok(counts().ui === 0 && S().history.length === h + 1 && !L.uiPicked(S().origin), '点了：UI 改动清零，一步撤销');
  fresh();
  A.applyScene(sceneStub(1));
  A.applyScreen({ id: 'boss', name: 'Boss', values: { 'uip.screen': 'tpl.bossIntro' } });
  S().setMany({ 'uip.screen': 'auto' }, '旧控件直接写');
  ok(counts().scene === 1 && L.screenPicked(S().origin), '场景 ·1：「回到场景原样」可点');
  A.resetScene();
  ok(counts().scene === 0 && !L.screenPicked(S().origin), '点了：场景改动清零，界面回到局内');
}

console.log('== 审查修复 7：成套之后换皮肤，新皮肤不被成套的颜色盖住');
{
  let bad = 0;
  for (const p of presetsOf('recipe')) {
    for (const sk of ['skin.neobrutal', 'skin.glass']) {
      fresh(); A.applyUiPreset(p.id); A.applySkin(sk);
      const a = { ...S().values };
      const wordsSkin = Object.keys(S().origin.layers.words).filter(L.skinOwns);
      fresh(); A.applySkin(sk);
      const diff = L.diffKeys(a, S().values).filter((k) => L.skinOwns(k));
      if (diff.length || wordsSkin.length) { bad++; if (bad <= 2) console.log(`    ${p.id} → ${sk}：${diff.slice(0, 4).join('、')}`); }
    }
  }
  ok(bad === 0, `成套之后换皮肤：皮肤负责的键与「全新 + 同一皮肤」一样（${bad} 个不一样）`);
}

console.log('== 审查修复 9：没换任何东西的套用不推空撤销');
{
  fresh();
  A.applySkin(null); A.applySkin(null);
  ok(S().history.length === 0, '全新状态点两次「默认」皮肤：0 步');
  A.applyScreen({ id: 'boss', name: 'Boss', values: { 'uip.screen': 'tpl.bossIntro' } });
  A.applyScreen({ id: 'boss', name: 'Boss', values: { 'uip.screen': 'tpl.bossIntro' } });
  ok(S().history.length === 1, '同一个界面点两次：1 步');
  fresh();
  A.resetAll();
  A.resetUiToScene();
  A.resetScene();
  ok(S().history.length === 0, '全新状态上的全部重新开始 / 回到场景默认 UI / 回到场景原样：0 步');
}

console.log('== 审查修复 11 / 22：标签上的名字');
{
  fresh();
  S().set('hud.style', 'none');
  ok(L.layerTitle('ui', S().values, S().origin) === '不显示', `HUD 不显示：UI 标签写「不显示」（${L.layerTitle('ui', S().values, S().origin)}）`);
  let long = 0;
  for (const r of RECIPES) {
    fresh();
    const p = A.applyRecipe(r);
    const main = p.label.replace(/（清 \d+ 项）$/, '');
    if (main.length > 14 || main.split('：').length > 2) { long++; if (long <= 2) console.log(`    ${main}`); }
  }
  ok(long === 0, `换配方的标签（不算「清 N 项」）≤14 字、只有一个冒号（${long} 个超了）`);
  fresh();
  A.applyRecipe(RECIPES.find((r) => r.id === 'inspiration-raw')!);
  ok(L.layerTitle('art', S().values, S().origin) === L.recipeName('inspiration-raw'), '画面标签用卡片短名');
}

console.log('== 审查修复 16 / 17：直接写「选择」键（老控件）也走套用');
{
  // 皮肤：清皮肤负责的手动样式、记进来源、不算改动；「清样式改动」不丢皮肤
  fresh();
  S().set('vis.corner', 'cut');
  S().set('vis.strokeWidth', 4);
  S().set('vis.motif', 'geometric');
  const glass = presetsOf('skin').find((p) => p.id === 'skin.glass')!;
  S().set('hud.style', skinValueOf(glass.id));
  const m = mods();
  ok(S().origin.skin === 'skin.glass' && !m.includes('hud.style') && !m.includes('vis.corner') && !m.includes('vis.strokeWidth'), `store.set(hud.style)：皮肤记进来源，皮肤负责的手动样式清掉（剩 ${m.join('、')}）`);
  ok(m.includes('vis.motif'), '皮肤不负责的手动样式保留');
  A.resetUiStyle();
  ok(S().values['hud.style'] === skinValueOf(glass.id), '清样式改动：皮肤不丢');
  S().set('hud.style', String(L.freshValues()['hud.style']));
  ok(S().origin.skin === null && counts().ui === 0, '写回场景的默认皮肤 = 回到场景默认皮肤');
  // 环境：不算改动，重置场景不换回去
  fresh();
  S().set('game.scene', 'forest');
  ok(counts().scene === 0 && S().history[S().history.length - 1]?.label === '换环境：' + (getParam('game.scene')?.options?.find((o) => o.value === 'forest')?.label ?? 'forest'), `换环境：不算改动（标签 ${S().history[S().history.length - 1]?.label}）`);
  S().set('game.seed', 7);
  A.resetScene();
  ok(S().values['game.scene'] === 'forest' && counts().scene === 0, '重置场景：环境保留，种子回去');
  // 界面：只改界面选择，不算改动；回到场景原样 = 回到局内
  fresh();
  S().set('uip.screen', 'tpl.bossIntro');
  ok(counts().total === 0 && S().origin.screen === 'tpl.bossIntro' && L.screenPicked(S().origin), '胶片点 Boss：不算改动，来源记下界面');
  S().set('uip.screen', 'auto');
  ok(counts().total === 0 && !L.screenPicked(S().origin), '点回局内：界面选择回到默认');
  S().set('uip.screen', 'tpl.inventory');
  A.resetScene();
  ok(S().values['uip.screen'] === 'auto', '回到场景原样：界面回到局内');
  // 风格词 / 节日下拉
  fresh();
  const kw = presetsOf('keyword')[1];
  S().set('uip.keyword', kw.id);
  ok(counts().total === 0 && S().origin.uiWords.includes(kw.id), '下拉选风格词：记进来源');
  S().set('uip.keyword', 'none');
  ok(counts().total === 0 && !S().origin.uiWords.includes(kw.id), '下拉选「不用」：也不算改动');
  // 读存档时把旧的直接写记进来源
  fresh();
  const v = { ...S().values, 'game.scene': 'forest', 'hud.style': skinValueOf('skin.glass'), 'uip.screen': 'tpl.inventory' };
  const o = L.absorbSelectors(v, S().origin);
  ok(L.countLayers(v, o).total === 0 && o.skin === 'skin.glass', '读存档：环境 / 皮肤 / 界面的直接写不再算改动');
}

console.log('== 审查修复 19：元素位置按元素数');
{
  fresh();
  S().patch({ 'el.vitals.screenAnchor': 'tl', 'el.vitals.offsetX': 3, 'el.vitals.offsetY': 2, 'el.vitals.scale': 1.5 }, [], '拖动 生命');
  ok(counts().ui === 1 && counts().uiPos === 1, `拖一次 + 缩放：UI ·1（${JSON.stringify(counts())}）`);
}

console.log('== 审查修复 20：UI 行 ↺ 的提示写出基线的实际取值');
{
  fresh();
  S().set('vis.corner', 'cut');
  const hint = L.resetHint('vis.corner', S().origin, S().values);
  ok(!hint.endsWith('跟随') && hint.includes('皮肤·'), `提示：${hint}`);
}

console.log('== 审查修复 21：撤销列表的标签带值');
{
  fresh();
  S().set('vis.corner', 'cut');
  const lab = S().history[S().history.length - 1].label;
  ok(lab.startsWith('转角') && lab.includes('：') && lab.length <= 20, `标签：${lab}`);
}

console.log('== 审查修复 23：感觉芯片去掉时放回之前的手动值');
{
  fresh();
  S().set('vis.strokeWidth', 4);
  A.pickNudge('ui.cleaner');
  ok(A.nudgeState('ui.cleaner').on && S().values['vis.strokeWidth'] !== 4, '套上「更干净」：描边被它改了');
  A.pickNudge('ui.cleaner');
  ok(S().values['vis.strokeWidth'] === 4 && !A.nudgeState('ui.cleaner').on, `再点去掉：描边放回 4（${S().values['vis.strokeWidth']}）`);
  ok(counts().ui === 1, `只剩那一项手动改动（UI ·${counts().ui}）`);
}

/* ---------------- 整合修复（docs/redesign/track-A.md「整合修复（IA）」） ---------------- */

const REPS: KReplica[] = readdirSync(join(process.cwd(), 'src/content/replicas')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(process.cwd(), 'src/content/replicas', f), 'utf8')) as KReplica);
const rigOfValues = (v: Values) => Object.fromEntries([...L.RIG_KEYS].map((k) => [k, v[k]]));
const sceneIn = (id: string, has: (e: string) => boolean = () => false): L.SceneInput => {
  const sc = gameScene(id)!;
  const home = homeScreen(sc)!;
  return { id: sc.id, name: sc.name, values: sceneValues(sc, has), rigLock: true, home: { id: home.id, name: home.label, values: home.values ?? {} } };
};

console.log('== X#3 / U#20：首屏 = 沙盒·小岛 + C 挑的首屏配方');
{
  fresh();
  const o = S().origin;
  const sc = gameScene(START_SCENE_ID)!;
  ok(L.START_RECIPE === FIRST_RUN.recipe && o.recipe === FIRST_RUN.recipe, `首屏配方 = C 的 FIRST_RUN.recipe（${o.recipe}）`);
  ok(o.scene === START_SCENE_ID && o.screen === homeScreen(sc)!.id && o.rigLock, `首屏场景 = ${START_SCENE_ID}，界面停在第一个，镜头归场景`);
  ok(S().values['hud.style'] === skinValueOf(sc.skin) && S().values['uip.layout'] === sc.layout && S().values['camera.angle'] === sc.rig.angle, '首屏用场景的默认皮肤、布局与机位');
  ok(L.layerTitle('scene', S().values, o) === sc.name, `场景标签写场景名（${L.layerTitle('scene', S().values, o)}）`);
  dirty();
  A.applyScene(sceneIn('gs.soulslike'));
  A.resetAll();
  ok(S().origin.scene === START_SCENE_ID && counts().total === 0 && L.diffKeys(S().values, L.freshValues()).length === 0, '别的场景里全部重新开始：回到沙盒·小岛');
  // 在首屏上点一次沙盒·小岛的卡：什么都没变，不推空撤销
  fresh();
  A.applyScene(sceneIn(START_SCENE_ID));
  ok(S().history.length === 0, '首屏上再点沙盒·小岛：0 步');
}

console.log('== X#1 / U#10：名作的镜头归场景，点配方不换镜头；学习库与图库同一套合成，名字用中文');
{
  const raw = RECIPES.find((r) => r.id === 'inspiration-raw')!;
  let rigBad = 0, moved = 0, same = 0, zh = 0, twoD = 0, twoDOk = 0;
  for (const rep of REPS) {
    const sc = gameScene(`rep:${rep.id}`)!;
    fresh();
    A.applyReplica(rep, rep.screens[0]);
    const o = S().origin;
    if (!o.rigLock || Object.keys(o.layers.look).some((k) => L.RIG_KEYS.has(k)) || !L.RIG_KEYS.has(Object.keys(o.layers.scene).find((k) => L.RIG_KEYS.has(k)) ?? '')) rigBad++;
    if (S().history[S().history.length - 1]?.label === `换场景：${sc.name}` && L.layerTitle('scene', S().values, o) === sc.name) zh++;
    const env = String(S().values['game.scene']);
    if (isRigLocked(env)) {
      twoD++;
      const rec = SCENE_MAP.get(env)?.recommended ?? {};
      if (Object.entries(rec).filter(([k]) => L.RIG_KEYS.has(k)).every(([k, v]) => S().values[k] === v)) twoDOk++;
    }
    const cam = rigOfValues(S().values);
    A.applyRecipe(raw);
    if (L.diffKeys(cam, rigOfValues(S().values)).length || counts().total) { moved++; if (moved <= 2) console.log(`    ${rep.id}：${L.diffKeys(cam, rigOfValues(S().values)).join('、')}`); }
    // 图库（D 的 replicaPlan）与学习库（A 的 applyReplica）：同一套值与来源
    fresh();
    A.applyComposite(replicaPlanD(S().values, S().origin, sc, rep, rep.screens[1] ?? rep.screens[0], 'full'));
    const vD = { ...S().values }, oD = S().origin;
    fresh();
    A.applyReplica(rep, rep.screens[1] ?? rep.screens[0]);
    if (!L.diffKeys(vD, S().values).length && L.sameOrigin(oD, S().origin)) same++;
  }
  ok(rigBad === 0, `${REPS.length} 份复刻：rigLock、机位键在场景层不在画面层（${rigBad} 份不是）`);
  ok(moved === 0, `名作里点配方：镜头不动、改动 0（${moved} 份动了）`);
  ok(same === REPS.length, `图库与学习库两个入口：值与来源完全一样（${same} / ${REPS.length}）`);
  ok(zh === REPS.length, `撤销标签与场景标签用中文名（${zh} / ${REPS.length}）`);
  ok(twoD > 0 && twoDOk === twoD, `2D 环境的名作用环境锁定的镜头（${twoDOk} / ${twoD}）`);
  const er = REPS.find((r) => r.id === 'rep.elden-ring')!;
  fresh();
  A.applyReplica(er, er.screens[0]);
  const erCam = rigOfValues(S().values);
  A.applyRecipe(raw);
  ok(!L.diffKeys(erCam, rigOfValues(S().values)).length, `艾尔登法环 + 灵感原样：镜头还是复刻的（${S().values['camera.angle']} / ${S().values['camera.projection']} / ${S().values['camera.fov']}）`);
}

console.log('== U#2：名作里换到别的屏再「重置场景」= 回到第一屏');
{
  let bad = 0, dirtyAfter = 0, total = 0;
  for (const rep of REPS) {
    if (rep.screens.length < 3) continue;
    total++;
    fresh();
    A.applyReplica(rep, rep.screens[0]);
    const first = { ...S().values };
    A.applyReplica(rep, rep.screens[2], { mode: 'screen' });
    if (counts().total) dirtyAfter++;
    A.resetScene();
    const d = L.diffKeys(first, S().values).filter((k) => !isViewKey(k));
    if (d.length || L.screenPicked(S().origin)) { bad++; if (bad <= 2) console.log(`    ${rep.id}：${d.slice(0, 5).join('、')}`); }
  }
  ok(dirtyAfter === 0, `名作里换屏：改动 0（${dirtyAfter} 份不是）`);
  ok(bad === 0, `${total} 份名作：换屏后重置场景，值与第一屏完全一样（${bad} 份留了上一屏的键）`);
  const bal = REPS.find((r) => r.id === 'rep.balatro')!;
  const draft = bal.screens.find((s) => s.key === 'draft')!;
  fresh();
  A.applyReplica(bal, bal.screens[0]);
  const first = { ...S().values };
  A.applyReplica(bal, draft, { mode: 'screen' });
  const moved = L.diffKeys(first, S().values).length;
  A.resetScene();
  ok(moved > 10 && L.diffKeys(first, S().values).filter((k) => !isViewKey(k)).length === 0, `小丑牌 三选一（${moved} 个键）→ 重置场景：回到局内`);
}

console.log('== X#2：换环境按目标环境重写镜头');
{
  const pf = gameScene('gs.platformer')!;
  fresh();
  A.applyScene(sceneIn('gs.platformer', () => true));
  ok(S().origin.rigLock && S().values['camera.angle'] === 'side' && String(S().values['game.scene']) === pf.env2d![0], '横版·洞穴（2D）：侧视、锁定');
  A.applyEnv('mountain');
  ok(!S().origin.rigLock && S().values['camera.angle'] !== 'side' && counts().total === 0, `2D → 别的 3D 环境：镜头键清掉、不再锁定、改动 0（${S().values['camera.angle']}）`);
  ok(S().values['atmosphere.fog'] !== 'layers', '2D 环境建议的分层雾一起拿走');
  const other = RECIPES.find((r) => r.values['camera.angle'] && r.values['camera.angle'] !== S().values['camera.angle'])!;
  A.applyRecipe(other);
  ok(S().values['camera.angle'] === other.values['camera.angle'] && counts().total === 0, `之后配方能改镜头（${other.id} → ${S().values['camera.angle']}）`);
  A.applyEnv('sideStage-ruins');
  ok(S().origin.rigLock && S().values['camera.angle'] === 'side' && counts().total === 0, '3D → 2D：用 2D 环境锁定的镜头、改动 0');
  A.applyEnv(pf.env);
  const own = rigValues(pf.rig);
  ok(S().origin.rigLock && Object.entries(own).every(([k, v]) => S().values[k] === v) && counts().total === 0, `2D → 场景自己的 3D 环境（${pf.env}）：用场景的机位`);
  fresh();
  const cam0 = rigOfValues(S().values);
  A.applyEnv('forest');
  ok(!L.diffKeys(cam0, rigOfValues(S().values)).length && S().origin.rigLock && counts().total === 0, '3D 之间换环境：镜头不动');
  // store.set('game.scene')（老控件、⌘K）同一个入口
  fresh();
  A.applyScene(sceneIn('gs.platformer', () => true));
  S().set('game.scene', 'forest');
  ok(!S().origin.rigLock && S().values['camera.angle'] !== 'side' && counts().total === 0, 'store.set(game.scene) 也重写镜头');
}

console.log('== U#22：标签上的数与重置的提示写清楚');
{
  fresh();
  const inv = gameScene(START_SCENE_ID)!.screens.find((s) => s.id === 'inventory')!;
  A.applyScreen({ id: inv.id, name: inv.label, values: inv.values ?? {} });
  ok(counts().total === 0 && L.tabCounts(S().values, S().origin).scene === 1 && layerCounts().scene === 1, '换界面：改动 0，但场景标签 ·1（可以回到局内）');
  const p = A.resetScene();
  ok(p.label.includes('回到局内') && layerCounts().scene === 0, `重置场景：${p.label}`);
  fresh();
  A.applySkin('skin.glass');
  S().patch({ 'el.vitals.screenAnchor': 'tl', 'el.vitals.offsetX': 3, 'el.vitals.offsetY': 2 }, [], '拖动 生命');
  S().set('vis.motif', 'geometric');
  const q = A.resetUiToScene();
  ok(q.label === '已重置 UI（皮肤 + 1 项样式 + 1 个元素）', `重置 UI：${q.label}`);
}

console.log('== X#6：随机探索的「选择」键走套用');
{
  fresh();
  S().set('vis.corner', 'cut');
  const kw = presetsOf('keyword')[2];
  const h = S().history.length;
  A.applyWrites({ 'hud.style': skinValueOf('skin.glass'), 'uip.keyword': kw.id, 'vis.strokeWidth': 3.5, 'shading.steps': 4 }, '随机探索 #1');
  const m = mods();
  ok(S().history.length === h + 1, '一步撤销');
  ok(S().origin.skin === 'skin.glass' && !m.includes('hud.style') && S().origin.uiWords.includes(kw.id) && !m.includes('uip.keyword'), '随机到的皮肤、风格词记进来源（不算改动）');
  ok(!m.includes('vis.corner'), '皮肤负责的手动样式清掉');
  ok(m.includes('vis.strokeWidth') && m.includes('shading.steps'), '随机到的普通参数算改动');
}

console.log('== X#19：导出格式 2 版；读 1 版（没有来源）时迁移');
{
  ok(SCHEMA_VERSION === 2, `SCHEMA_VERSION = ${SCHEMA_VERSION}`);
  const wc = RECIPES.find((r) => r.id === 'watercolor')!;
  const v1: Values = { ...defaultValues(), ...L.artPart(wc.values), 'game.scene': 'forest', 'hud.style': skinValueOf('skin.glass'), 'uip.screen': 'tpl.inventory' };
  fresh();
  S().restore({ values: v1, baseRecipe: 'watercolor' }, '导入 1 版', 'all');
  const c = counts();
  ok(c.total === 0 && S().origin.skin === 'skin.glass' && S().baseRecipe === 'watercolor' && S().values['game.scene'] === 'forest', `1 版导入：环境 / 皮肤 / 界面记进来源，不算改动（${JSON.stringify(c)}）`);
}

console.log('== X#5：原则演示结束时来源原样放回');
{
  const hades = REPS.find((r) => r.id === 'rep.hades')!;
  fresh();
  A.applyReplica(hades, hades.screens[0]);
  S().set('vis.corner', 'cut');
  const o0 = S().origin, c0 = counts();
  const demo = (b: Record<string, unknown>, focus: string[]) => ({ id: 'P-t#d0', title: 'A vs B', kind: 'isolate', lookAt: '', base: {}, a: { 'vis.corner': 'round' }, b, art: ['ink-landscape'], focusKeys: focus });
  ok(startDemo(demo({ 'vis.corner': 'chamfer' }, ['vis.corner']), 'P-t') && S().origin.recipe === 'ink-landscape', '演示开始：画面换成演示的配方');
  endDemo('restore');
  ok(L.sameOrigin(S().origin, o0) && JSON.stringify(counts()) === JSON.stringify(c0) && S().values['vis.corner'] === 'cut', `回到演示前：来源、改动数、手动改动都和演示前一样（${S().origin.recipe}，${JSON.stringify(counts())}）`);
  startDemo(demo({ 'vis.strokeWidth': 3.5 }, ['vis.strokeWidth']), 'P-t');
  endDemo('carry');
  ok(L.sameOrigin(S().origin, o0) && S().values['vis.strokeWidth'] === 3.5 && counts().ui === c0.ui + 1, `只带走关键几项：来源仍是名作，带走的算一项 UI 改动（${JSON.stringify(counts())}）`);
}

console.log('== F→A：锁定镜头时配方的镜头建议');
{
  fresh();
  const sc = gameScene(START_SCENE_ID)!;
  const r = RECIPES.find((x) => x.values['camera.angle'] && x.values['camera.angle'] !== sc.rig.angle)!;
  A.applyRecipe(r);
  ok(S().values['camera.angle'] === sc.rig.angle && L.recipeRigValue('camera.angle', S().values, S().origin) === r.values['camera.angle'], `场景机位 ${sc.rig.angle}，配方建议 ${String(r.values['camera.angle'])}`);
  S().set('camera.angle', r.values['camera.angle']!);
  ok(counts().scene === 1 && L.recipeRigValue('camera.angle', S().values, S().origin) === undefined, '点「配方」芯片 = 套用：记成一项场景改动，芯片消失');
  A.resetScene();
  ok(S().values['camera.angle'] === sc.rig.angle && counts().total === 0, '重置场景：回到场景机位');
}

console.log('== 收尾 10：2D 光照的合成顺序（锁定镜头时场景定的光照压在配方上面）');
{
  const ruins = SCENE_MAP.get('sideStage-ruins')!.recommended!;
  const glow = RECIPES.find((r) => r.id === 'glow-pixel')!;
  fresh();
  A.applyEnv('sideStage-ruins');
  A.applyRecipe(glow);
  ok(glow.values['lighting.time'] === 20 && S().values['lighting.time'] === ruins['lighting.time'] && counts().total === 0, `横版·废墟 + 辉光像素：时段用场景的 ${String(ruins['lighting.time'])}（配方写 20），改动 0`);
  ok(L.recipeRigValue('lighting.time', S().values, S().origin) === 20, '时段行给「配方 20」芯片');
  ok(S().values['camera.pixelSize'] === glow.values['camera.pixelSize'], '别的画面键照旧跟配方（像素尺寸）');
  S().set('lighting.time', 20);
  ok(counts().art === 1 && L.recipeRigValue('lighting.time', S().values, S().origin) === undefined, '用户改成 20：算一项画面改动，芯片消失');
  A.resetArt();
  ok(S().values['lighting.time'] === ruins['lighting.time'] && counts().total === 0, '画面 ↺：回到场景定的时段');
  A.applyEnv('forest');
  ok(!S().origin.rigLock && S().values['lighting.time'] === 20 && counts().total === 0, '离开 2D 环境（不再锁定）：配方的 20 点回来');
}

console.log('== 收尾 1：这一屏的部件覆盖（<参数>@tpl.<id>）');
{
  fresh();
  const k = 'cmp.buttonFace@tpl.inventory';
  A.applyWrites({ [k]: 'outline' }, '背包 · 按钮面：描边');
  ok(validKey(k) && S().values[k] === 'outline' && counts().ui === 1 && S().history.length === 1, '写入：一步撤销、算一项 UI 改动');
  ok(resolveUi({ ...S().values, 'uip.screen': 'tpl.inventory' }).get('cmp.buttonFace') === 'outline' && resolveUi({ ...S().values, 'uip.screen': 'tpl.worldmap' }).get('cmp.buttonFace') !== 'outline', '只在背包生效');
  A.resetKeys([k], '背包 · 按钮面：跟随');
  ok(S().values[k] === undefined && counts().total === 0, '「跟随」= 回到原样');
  A.applyWrites({ [k]: 'link' }, 'x');
  A.resetScreenParts('tpl.inventory');
  ok(S().values[k] === undefined && counts().total === 0 && !/tpl\./.test(S().history.at(-1)?.label ?? ''), `界面 ↺：清掉、标签不露模板 id（${S().history.at(-1)?.label}）`);
}

console.log(`\n${n - fails}/${n} 通过`);
if (fails) process.exit(1);
