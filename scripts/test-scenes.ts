/*
 * 场景注册表与 UI 按场景的不变量测试（轨道 D，docs/workbench-redesign.md §5、§11.1 D 的验收）：
 *   - 注册表：24 个内容包各一个场景 + 借包的 2D / 2.5D 场景（2026-10-23，轨道 Z2）+ 26 个名作（+ 单屏名作），每个基础场景 6–9 个界面、第一个是局内；名字 ≤8 字、界面标签 ≤4 字；数据文件是最新的；
 *   - 2D / 2.5D 环境（等距 / 纸艺剧场 / 伪 3D / 竖版与节奏）：每个都有场景用它；套用时并进环境的 recommended（Mode7 的像素化 3、音轨的 128 BPM、HD-2D 的移轴……），改动 0；
 *   - 套用场景：一步，三层改动都是 0；画风（配方与画面改动）、选过的皮肤保留，元素位置改动清掉；界面停在局内；
 *   - 切界面：只改界面键——皮肤、画面、场景的其余键都不动，改动仍是 0；
 *   - 皮肤行：7 个家族恰好覆盖 38 个皮肤；每个选项「点了之后」的参数（色板画它）= 真的点下去之后的参数，套完 UI 改动 0；
 *   - 「首次打开到 Boss 界面 ≤2 次点击」：首屏条有 Boss 的几个视角，点场景 + 点 Boss 两步，局内 HUD 上出 Boss 名和 Boss 条；
 *   - 场景的镜头归场景：配方带的镜头键不盖掉场景机位（3D 场景也是）；
 *   - 名作：整套套用改动 0、名字是中文；名作里换屏保留皮肤和 UI 改动；「保留我的改动」时不清手动改动；单屏名作的界面卡有界面键；
 *   - 色板取景：在命中框附近、1:1、不出画框，只有字的元素不当取景区。
 * 运行：npx tsx scripts/test-scenes.ts
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import '../src/dims/index';
import { RECIPES } from '../src/content/recipes';
import { readdirSync, readFileSync } from 'node:fs';
import { GAME_SCENES, gameScene, homeScreen, rigValues, sceneForEnv, sceneName, sceneProblems, sceneValues, screensOf, START_SCENE_ID } from '../src/content/gameScenes';
import { SCENES } from '../src/content/sceneCatalog';
import type { KReplica } from '../src/content/uiKnowledge';
import { replicaInput } from '../src/ui/scene/replicaPlan';
import { isUiKey, isViewKey } from '../src/dims/registry';
import type { Values } from '../src/dims/types';
import { resolveUi } from '../src/hud/sys/resolve';
import { presetsOf, PRESET } from '../src/hud/sys/spec';
import { parseOverrideKey, skinValueOf, uiKeyLabel } from '../src/hud/sys/register';
import * as A from '../src/state/actions';
import * as L from '../src/state/layers';
import { useStore } from '../src/state/store';
import { artChoices, familyProblems, planChoice, SKIN_FAMILIES, type SkinChoice } from '../src/ui/scene/skinChoices';
import { cropBox, cropCandidates, pickByDiff, SWATCH_H, SWATCH_W } from '../src/ui/scene/swatchCrop';

let fails = 0, n = 0;
const ok = (c: boolean, msg: string) => { n++; if (!c) { fails++; console.log(`  ✗ ${msg}`); } };
const S = () => useStore.getState();
const counts = () => L.countLayers(S().values, S().origin);
const no2d = () => false;
const isArt = (k: string) => !isUiKey(k) && !isViewKey(k) && !k.startsWith('game.') && !L.RIG_KEYS.has(k);

function fresh() {
  useStore.setState({ values: L.freshValues(), origin: L.freshOrigin(), history: [], future: [], lastCommit: null, preview: null });
}
/** 与 sceneActions.pickGameScene 同一个输入（node 里没有引擎：2D 环境都算没上线）；场景的镜头归场景（rigLock，审查修复 16） */
const sceneInput = (id: string, has: (e: string) => boolean = no2d): L.SceneInput => {
  const sc = gameScene(id)!;
  const home = homeScreen(sc)!;
  return { id: sc.id, name: sc.name, values: sceneValues(sc, has), rigLock: true, home: { id: home.id, name: home.label, values: home.values ?? {} } };
};

console.log('== 注册表');
ok(sceneProblems().length === 0, `注册表自检：${sceneProblems().join('；')}`);
const base = GAME_SCENES.filter((s) => s.group !== '名作');
ok(base.length >= 24 && base.length === new Set(base.map((s) => s.id)).size, `基础场景 ≥24 个、id 不重复（实际 ${base.length}）`);
for (const id of ['sandbox', 'snowline', 'action', 'soulslike', 'platformer', 'shooter', 'shmup', 'rpg', 'tactics', 'rts', 'towerDefense', 'arena', 'cityBuilder', 'colony', 'factory', 'farming', 'deckBuilder', 'puzzle', 'visualNovel', 'rhythm', 'horror', 'survival', 'survivors', 'racing']) {
  ok(gameScene(`gs.${id}`)?.pack === id, `原来的场景 id 不变：gs.${id}（内容包 ${id}）`);
}
ok(GAME_SCENES.filter((s) => s.replica).length === 26, '26 个名作（复刻）');
ok(!!gameScene(START_SCENE_ID), `首屏场景 ${START_SCENE_ID} 存在`);
for (const sc of base) {
  ok(!!PRESET.get(sc.skin), `${sc.name}：默认皮肤 ${sc.skin} 存在`);
  ok(PRESET.get(sc.layout)?.kind === 'layout', `${sc.name}：布局 ${sc.layout} 是品类布局`);
  for (const s of sc.screens) {
    const tpl = s.values?.['uip.screen'];
    if (tpl && tpl !== 'auto') ok(PRESET.get(String(tpl))?.kind === 'screen', `${sc.name} · ${s.label}：模板 ${tpl} 存在`);
  }
}
ok(sceneForEnv('castle')?.id === 'gs.soulslike', '在 X 场景最好看：城堡 → 魂类·城堡');
ok(screensOf(gameScene('gs.rpg')!, { business: 'business.premium' }).every((s) => s.kind !== 'flow'), '买断制不出现 ▶流程');
ok(screensOf(gameScene('gs.rpg')!, { business: 'business.f2pMobile' }).some((s) => s.kind === 'flow'), '免费手游出现 ▶流程');
ok(rigValues({ projection: 'ortho', angle: 'side', azimuth: 0, src: '' })['camera.azimuth'] === 0, '镜头机位换算成 camera.*');
try {
  execFileSync(process.execPath, [join(import.meta.dirname, '../node_modules/tsx/dist/cli.mjs'), join(import.meta.dirname, 'gen-game-scenes.ts'), '--check'], { stdio: 'pipe' });
  ok(true, '');
} catch (e) {
  ok(false, `gameScenes.gen.json 不是最新的或有问题：${String((e as { stdout?: Buffer }).stdout ?? e).trim().split('\n').slice(-3).join(' ')}`);
}

console.log('== 套用场景');
let bad = 0;
for (const sc of base) {
  fresh();
  // 首屏本来就在这个场景（A 的 START_SCENE = 首屏场景）：先换到别的场景，再点回来（不然点它是空操作、没有撤销步）
  if (S().origin.scene === sc.id) { A.applyScene(sceneInput(base.find((x) => x.id !== sc.id)!.id)); useStore.setState({ history: [], future: [] }); }
  A.applyScene(sceneInput(sc.id));
  const c = counts();
  if (c.total) { bad++; if (bad <= 3) console.log(`    ${sc.name}：改动 ${JSON.stringify(c)} ${L.modifiedKeysOf(S().values, S().origin).slice(0, 6).join('、')}`); }
  ok(S().origin.scene === sc.id && S().origin.screen === 'hud', `${sc.name}：来源记下场景、界面停在局内`);
  ok(String(S().values['uip.layout']) === sc.layout && String(S().values['cnt.pack']) === sc.pack, `${sc.name}：布局与内容包`);
  ok(String(S().values['hud.style']) === skinValueOf(sc.skin), `${sc.name}：没选皮肤时用场景的默认皮肤`);
  ok(S().history.length === 1, `${sc.name}：一步撤销`);
}
ok(bad === 0, `套用场景后三层改动都是 0（${bad} 个不是）`);

console.log('== 2D 环境上线后（锁定镜头）');
{
  const all2d = () => true;
  const sc2 = base.filter((sc) => sc.env2d?.length);
  ok(sc2.length >= 5, `有 2D 环境候选的场景 ${sc2.length} 个`);
  for (const sc of sc2) {
    fresh();
    A.applyRecipe(RECIPES.find((r) => r.id === 'lowpoly-geo')!);
    A.applyScene(sceneInput(sc.id, all2d));
    ok(counts().total === 0, `${sc.name}（2D）：改动 0（${L.modifiedKeysOf(S().values, S().origin).slice(0, 4).join('、')}）`);
    ok(S().origin.rigLock && String(S().values['game.scene']) === sc.env2d![0], `${sc.name}（2D）：环境 ${sc.env2d![0]}、锁定镜头`);
    const cam = sceneValues(sc, all2d);
    ok(['camera.projection', 'camera.angle'].every((k) => S().values[k] === cam[k]), `${sc.name}（2D）：镜头键用场景的，不用配方的`);
  }
}

console.log('== 2D / 2.5D 环境（2026-10-23：等距 / 纸艺剧场 / 伪 3D / 竖版与节奏）');
{
  const all2d = () => true;
  const NEW_CATS = new Set(['等距 2.5D', '纸艺与剧场', '伪 3D', '竖版与节奏']);
  const envs = SCENES.filter((m) => NEW_CATS.has(m.category));
  ok(envs.length === 17, `新环境 17 个（实际 ${envs.length}）`);
  for (const m of envs) {
    const sc = base.find((s) => s.env2d?.[0] === m.id);
    ok(!!sc, `${m.name}：有场景把它当 2D 环境（图库里点得到）`);
    if (!sc) continue;
    ok(/^[^·]+·[^·]+$/.test(sc.name2d ?? sc.name), `${m.name}：场景名是「品类·环境」（${sc.name2d ?? sc.name}）`);
    ok(['等距', '伪3D', '横版', '俯视', '立绘卡牌'].includes(sc.group), `${m.name}：分组 ${sc.group}`);
    ok(!sc.look || RECIPES.some((r) => r.id === sc.look), `${m.name}：建议配方 ${sc.look} 存在`);
    fresh();
    A.applyRecipe(RECIPES.find((r) => r.id === 'watercolor')!);
    A.applyScene(sceneInput(sc.id, all2d));
    const rec = m.recommended ?? {};
    const lit = (k: string) => L.isSceneLightKey(k);
    // 推荐值并进场景层：镜头键、光照键一定是环境的；别的键（像素化、节拍、移轴、雾）配方没写时用环境的
    const look = L.recipeLook('watercolor') ?? {};
    const miss = Object.entries(rec).filter(([k, v]) => (L.RIG_KEYS.has(k) || lit(k) || !(k in look)) && !L.sameVal(k, S().values[k], v)).map(([k]) => k);
    ok(miss.length === 0, `${sc.name}：环境推荐值并进来了（没进来：${miss.join('、')}）`);
    ok(S().origin.rigLock && String(S().values['game.scene']) === m.id && counts().total === 0, `${sc.name}：环境 ${m.id}、锁定镜头、改动 0（${L.modifiedKeysOf(S().values, S().origin).slice(0, 4).join('、')}）`);
  }
  // K 点名的两个非镜头推荐值：Mode7 的像素化 3、音轨的 128 BPM（配方没写这两个键时就是它们）
  for (const [id, k, v] of [['gs.mode7', 'camera.pixelSize', 3], ['gs.rhythmLanes', 'motion.beat', 128]] as const) {
    fresh();
    A.applyRecipe(RECIPES.find((r) => r.id === 'cel-anime')!);
    A.applyScene(sceneInput(id, all2d));
    ok(S().values[k] === v && counts().total === 0, `${id} + 赛璐璐：${k} = ${S().values[k]}（要 ${v}）、改动 0`);
  }
  // 竖版·弹幕当「弹幕」场景的 2D 环境：名字跟着换
  const sh = gameScene('gs.shmup')!;
  ok(sh.env2d?.[0] === 'shmup-vertical' && sceneName(sh, all2d) === '弹幕·竖版' && sceneName(sh, no2d) === sh.name, `弹幕：2D 环境竖版·弹幕，名字「${sceneName(sh, all2d)}」`);
  // 换环境：新环境作为 altEnvs 挂在相关的旧场景上，从旧场景换过去镜头与推荐值跟着走
  ok(gameScene('gs.racing')!.altEnvs.includes('road-pseudo3d') && gameScene('gs.action')!.altEnvs.includes('iso-dungeon') && gameScene('gs.rpg')!.altEnvs.includes('hd2d-town'), '旧场景的换环境里有新环境');
  fresh();
  A.applyScene(sceneInput('gs.racing'));
  A.applyEnv('mode7-track', 'Mode7·赛场');
  ok(S().origin.rigLock && S().values['camera.pixelSize'] === 3 && counts().total === 0, `竞速·山道 → 换环境 Mode7·赛场：锁定镜头、像素化 3、改动 0`);
  A.applyEnv('racetrack', '环形赛道');
  ok(S().values['camera.pixelSize'] !== 3 && counts().total === 0, `再换回环形赛道：Mode7 的推荐值拿走（像素化 ${S().values['camera.pixelSize']}）、改动 0`);
  ok(sceneForEnv('iso-dungeon')?.id === 'gs.isoDungeon' && sceneForEnv('rhythm-lanes')?.id === 'gs.rhythmLanes', '在 X 场景最好看：新环境 → 新场景');
  // 收尾 X：哈迪斯的复刻改指向等距地牢（环境本身就是它），原来的 Boss 竞技场留在换环境里
  ok(gameScene('rep:rep.hades')!.env === 'iso-dungeon' && gameScene('rep:rep.hades')!.altEnvs.includes('arena'), '名作哈迪斯的环境是等距地牢，换环境里留着 Boss 竞技场');
}

console.log('== 换场景保留画风与皮肤、清元素位置');
fresh();
A.applyRecipe(RECIPES.find((r) => r.id === 'watercolor')!);
S().set('shading.steps', 5);
A.applySkin('skin.glass');
S().set('vis.corner', 'cut');
S().set('el.vitals.screenAnchor', 'tr');
const artBefore = Object.fromEntries(Object.entries(S().values).filter(([k]) => isArt(k)));
A.applyScene(sceneInput('gs.soulslike'));
ok(S().origin.recipe === 'watercolor' && S().values['shading.steps'] === 5, '配方与画面改动保留');
ok(Object.entries(artBefore).every(([k, v]) => S().values[k] === v), '画面键一个不动');
ok(S().origin.skin === 'skin.glass' && String(S().values['hud.style']) === skinValueOf('skin.glass'), '选过的皮肤保留');
ok(S().values['vis.corner'] === 'cut', 'UI 样式改动保留');
ok(S().values['el.vitals.screenAnchor'] === undefined || !L.isModifiedKey('el.vitals.screenAnchor', S().values, S().origin), '元素位置改动清掉');

console.log('== 切界面只改界面');
for (const sc of base) {
  fresh();
  A.applySkin('skin.parchment');
  A.applyScene(sceneInput(sc.id));
  const before = { ...S().values };
  for (const s of sc.screens.filter((x) => x.kind !== 'flow')) {
    A.applyScreen({ id: s.id, name: s.label, values: s.values ?? {} });
    // 界面自己写的键（Boss 界面补的 Boss 条：cnt.elements、el.threat.form）也算界面的
    const changed = L.diffKeys(before, S().values).filter((k) => !L.SCREEN_KEYS.has(k) && !isViewKey(k) && !(k in (s.values ?? {})));
    ok(changed.length === 0, `${sc.name} · ${s.label}：只改界面键（另外改了 ${changed.slice(0, 4).join('、')}）`);
    ok(counts().total === 0, `${sc.name} · ${s.label}：改动 0（${L.modifiedKeysOf(S().values, S().origin).slice(0, 4).join('、')}）`);
    ok(String(S().values['hud.style']) === skinValueOf('skin.parchment'), `${sc.name} · ${s.label}：皮肤不变`);
  }
}

console.log('== 首次打开到 Boss 界面 ≤2 次点击');
// 首屏条（FirstRunStrip 的 VIEWS）里这一类游戏有 Boss 的视角：横版、等距（2026-10-23）、第三人称、第一人称
for (const id of ['gs.platformer', 'gs.isoDungeon', 'gs.soulslike', 'gs.shooter']) {
  fresh();
  A.applyScene(sceneInput(id));
  const boss = gameScene(id)!.screens.find((s) => s.id === 'boss');
  ok(!!boss, `${id}：有 Boss 界面`);
  if (!boss) continue;
  A.applyScreen({ id: boss.id, name: boss.label, values: boss.values ?? {} });
  const r = resolveUi(S().values);
  ok(S().history.length === 2, `${id}：点场景 + 点 Boss = 2 步`);
  ok(r.str('uip.screen', 'auto') === 'auto' && r.str('chk.simPose', '') === 'bossIntro', `${id}：Boss = 局内 HUD + Boss 登场（不是标题卡模板）`);
  ok(r.elements().includes('el.threat') && r.list('el.threat.form').includes('bossBar'), `${id}：Boss 界面有 Boss 条（${r.elements().join(',')} / ${r.list('el.threat.form').join(',')}）`);
  ok(r.elements().includes('el.vitals'), `${id}：Boss 界面的生命还在`);
  ok(counts().total === 0, `${id} · Boss：改动 0（${L.modifiedKeysOf(S().values, S().origin).slice(0, 4).join('、')}）`);
  // 切回局内：Boss 条补的键回到场景的
  const home = homeScreen(gameScene(id)!)!;
  A.applyScreen({ id: home.id, name: home.label, values: home.values ?? {} });
  ok(counts().total === 0 && ['none', 'auto'].includes(resolveUi(S().values).str('chk.simPose', 'none')) && [undefined, 'auto'].includes(S().values['cnt.elements'] as string | undefined), `${id}：Boss → 局内 改动 0、钉帧姿态清掉`);
}

console.log('== 场景的镜头归场景（配方的镜头键不盖掉场景机位）');
for (const id of ['gs.soulslike', 'gs.shooter']) {
  fresh();
  A.applyRecipe(RECIPES.find((r) => r.id === 'lowpoly-geo')!);
  A.applyScene(sceneInput(id));
  const rig = rigValues(gameScene(id)!.rig);
  ok(Object.entries(rig).every(([k, v]) => S().values[k] === v), `${id} + 低多边形：镜头是场景的（${Object.keys(rig).map((k) => `${k}=${S().values[k]}`).join(' ')}）`);
  ok(counts().total === 0, `${id} + 低多边形：改动 0`);
  // 场景里再换配方：镜头仍是场景的，画面其余的键跟配方
  A.applyRecipe(RECIPES.find((r) => r.id === 'watercolor')!);
  ok(Object.entries(rig).every(([k, v]) => S().values[k] === v) && S().origin.recipe === 'watercolor' && counts().total === 0, `${id}：场景里换配方，镜头不动、改动 0`);
}

console.log('== 皮肤行');
ok(familyProblems().length === 0, `7 个家族覆盖 38 个皮肤：${familyProblems().join('；')}`);
ok(SKIN_FAMILIES.length === 7, '7 个家族');
fresh();
A.applyRecipe(RECIPES.find((r) => r.id === 'watercolor')!);
A.applyScene(sceneInput('gs.rpg'));
S().set('vis.corner', 'cut');
const choices: SkinChoice[] = [{ kind: 'default' }, ...artChoices(S().origin), ...presetsOf('skin').map((p) => ({ kind: 'skin', id: p.id }) as SkinChoice),
  ...presetsOf('keyword').slice(0, 3).map((p) => ({ kind: 'preset', id: p.id }) as SkinChoice), ...presetsOf('theme').slice(0, 2).map((p) => ({ kind: 'preset', id: p.id }) as SkinChoice)];
ok(artChoices(S().origin).length > 0, '水彩有「配套当前画面」');
let mismatch = 0;
const snap = { values: S().values, origin: S().origin };
for (const c of choices) {
  useStore.setState({ values: snap.values, origin: snap.origin });
  const planned = planChoice(snap.values, snap.origin, c);
  if (c.kind === 'default') A.applySkin(null);
  else if (c.kind === 'skin') A.applySkin(c.id);
  else if (c.kind === 'art') A.applySkinFromArt({ harmony: c.harmony, skin: c.id, label: c.label });
  else A.applyUiPreset(c.id);
  const real = S().values;
  const diff = planned ? L.diffKeys(planned as Values, real) : ['(null)'];
  if (diff.length) { mismatch++; if (mismatch <= 3) console.log(`    ${JSON.stringify(c)}：${diff.slice(0, 5).join('、')}`); }
}
ok(mismatch === 0, `色板画的参数 = 点下去之后的参数（${mismatch} 个不一样）`);

console.log('== 名作');
{
  const dir = join(import.meta.dirname, '../src/content/replicas');
  const reps = new Map(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => { const r = JSON.parse(readFileSync(join(dir, f), 'utf8')) as KReplica; return [r.id, r] as const; }));
  const repScenes = GAME_SCENES.filter((s) => s.replica);
  let fullBad = 0, skinLost = 0, styleLost = 0, artMoved = 0, zh = 0, screenBad = 0, keepBad = 0;
  for (const sc of repScenes) {
    const rep = reps.get(sc.replica!)!;
    // 整套：改动 0，名字是卡片上的中文名
    fresh();
    A.applyComposite(replicaInput(S().values, S().origin, sc, rep, rep.screens[0], 'full'));
    if (counts().total) { fullBad++; if (fullBad <= 2) console.log(`    ${sc.name}：${L.modifiedKeysOf(S().values, S().origin).slice(0, 5).join('、')}`); }
    if (L.layerTitle('scene', S().values, S().origin) === sc.name) zh++;
    // 名作里换皮肤、改一个样式，再换屏：皮肤、样式改动、画面都不动
    A.applySkin('skin.parchment');
    S().set('vis.corner', 'cut');
    const art = Object.fromEntries(Object.entries(S().values).filter(([k]) => isArt(k)));
    for (const scr of rep.screens.slice(1, 3)) {
      A.applyComposite(replicaInput(S().values, S().origin, sc, rep, scr, 'screen'));
      if (S().origin.skin !== 'skin.parchment' || String(S().values['hud.style']) !== skinValueOf('skin.parchment')) skinLost++;
      if (S().values['vis.corner'] !== 'cut') styleLost++;
      if (Object.entries(art).some(([k, v]) => S().values[k] !== v)) artMoved++;
      if (S().origin.screen !== scr.key || S().origin.scene !== sc.id) screenBad++;
    }
    // 保留我的改动：从别的场景点进名作，手动改的画面 / UI 样式都还在
    fresh();
    S().set('shading.steps', 5);
    S().set('vis.corner', 'cut');
    A.applyComposite(replicaInput(S().values, S().origin, sc, rep, rep.screens[0], 'full', true));
    if (S().values['shading.steps'] !== 5 || S().values['vis.corner'] !== 'cut' || S().origin.scene !== sc.id) keepBad++;
  }
  ok(fullBad === 0, `${repScenes.length} 个名作：整套套用后改动 0（${fullBad} 个不是）`);
  ok(zh === repScenes.length, `名作的场景名用卡片上的中文名（${zh} / ${repScenes.length}）`);
  ok(skinLost === 0, `名作里换屏：皮肤不变（${skinLost} 次变了）`);
  ok(styleLost === 0, `名作里换屏：UI 样式改动保留（${styleLost} 次丢了）`);
  ok(artMoved === 0, `名作里换屏：画面键一个不动（${artMoved} 次动了）`);
  ok(screenBad === 0, `名作里换屏：来源记下这一屏（${screenBad} 次不对）`);
  ok(keepBad === 0, `保留我的改动：点名作不清手动改动（${keepBad} 个清了）`);
  // 单屏名作：胶片上的界面卡有界面键（原来是空的，点了 = 退回局内）
  const ex = GAME_SCENES.filter((s) => s.example);
  ok(ex.every((s) => s.screens.length === 1 && Object.keys(s.screens[0].values ?? {}).some((k) => L.SCREEN_KEYS.has(k))), `单屏名作 ${ex.length} 个：界面卡写了界面键`);
}

console.log('== 色板取景');
{
  const hits = [{ element: 'el.vitals', rect: { x: 20, y: 500, w: 220, h: 34 } }, { element: 'el.abilities', rect: { x: 400, y: 520, w: 200, h: 40 } }];
  const texts = [{ x: 30, y: 505, w: 40, h: 16, size: 12, cw: 1031 }, { x: 410, y: 530, w: 30, h: 14, size: 12, cw: 1031 }];
  const boxes = [{ x: 20, y: 500, w: 220, h: 34, color: '#202020', cw: 1031 }];
  const b = cropBox(1031, 580, hits, texts, boxes);
  ok(b.w === SWATCH_W && b.h === SWATCH_H, `1:1 取景（${b.w}×${b.h}）`);
  ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1031 && b.y + b.h <= 580, '不出画框');
  ok(b.y + b.h > 500 && b.y < 534 && b.x < 240, '落在生命一带');
  const t = cropBox(1031, 580, [], [{ x: 400, y: 100, w: 200, h: 40, size: 28, cw: 1031 }], []);
  ok(t.x <= 500 && t.x + t.w >= 500 && t.y <= 120 && t.y + t.h >= 120, '没有命中框（界面模板）时取字一带');
  // 只有字的元素（目标）不当取景区：队伍卡（带面板）优先（审查修复 19：战棋原来取到「胜利条件」几行字）
  const hits2 = [{ element: 'el.objective', rect: { x: 820, y: 60, w: 190, h: 80 } }, { element: 'el.party', rect: { x: 20, y: 420, w: 300, h: 140 } }];
  const texts2 = [{ x: 830, y: 70, w: 120, h: 16, size: 12, cw: 1031 }, { x: 830, y: 92, w: 150, h: 16, size: 12, cw: 1031 }, { x: 830, y: 114, w: 140, h: 16, size: 12, cw: 1031 }, { x: 40, y: 440, w: 50, h: 14, size: 12, cw: 1031 }];
  const boxes2 = [{ x: 30, y: 430, w: 120, h: 56, color: '#1a2230', cw: 1031 }, { x: 160, y: 430, w: 120, h: 56, color: '#1a2230', cw: 1031 }, { x: 40, y: 462, w: 90, h: 8, color: '#40c060', cw: 1031 }];
  const p2 = cropBox(1031, 580, hits2, texts2, boxes2);
  ok(p2.y > 380 && p2.x < 330, `有面板的元素优先于只有字的目标（取到 ${Math.round(p2.x)},${Math.round(p2.y)}）`);
  // 按皮肤间差别挑（整合修复 U#5）：各皮肤一样的生命心（面板分高、差别 0）输给差别大的快捷栏；候选放宽到所有带面板的元素
  const hits3 = [{ element: 'el.vitals', rect: { x: 20, y: 20, w: 200, h: 30 } }, { element: 'el.hotbar', rect: { x: 400, y: 500, w: 240, h: 56 } }];
  const texts3 = [{ x: 24, y: 24, w: 20, h: 20, size: 14, cw: 1031 }, { x: 50, y: 24, w: 20, h: 20, size: 14, cw: 1031 }, { x: 76, y: 24, w: 20, h: 20, size: 14, cw: 1031 }];
  const boxes3 = [{ x: 400, y: 500, w: 56, h: 56, color: '#202020', cw: 1031 }, { x: 460, y: 500, w: 56, h: 56, color: '#202020', cw: 1031 }];
  const wide = cropCandidates(1031, 580, hits3, texts3, boxes3, true);
  ok(cropBox(1031, 580, hits3, texts3, boxes3).w === SWATCH_W, 'cropBox 仍取面板分最高的一块');
  ok(wide.some((c) => c.box.y > 400) && wide.some((c) => c.box.y < 100), '放宽后的候选同时有上面的生命和下面的快捷栏');
  const picked = pickByDiff(wide, (b) => (b.y > 400 ? 0.2 : 0));
  ok(!!picked && picked.y > 400, `生命心各皮肤一样（差别 0）→ 取快捷栏（取到 ${picked ? Math.round(picked.y) : '无'}）`);
  ok(pickByDiff(wide, () => 0.001) === null, '整屏几乎没有差别时不按差别挑（退回 cropBox）');
}

console.log('== 逐界面的部件覆盖（整合修复 X#8）');
{
  // <参数>@tpl.<id>：登记校验认它；只在这一屏是当前界面时生效、盖过全局手动值；别的界面不生效；界面 ↺ 清掉
  ok(!!parseOverrideKey('cmp.slot@tpl.inventory') && !!parseOverrideKey('vis.corner@tpl.npc'), '覆盖键认 tpl.<id> 目标');
  ok(!parseOverrideKey('vis.corner@tpl.') && !parseOverrideKey('vis.corner@tplx'), '不认残缺的目标');
  const lab = uiKeyLabel('vis.corner@tpl.inventory') ?? '';
  ok(lab.includes('只在') && !lab.includes('tpl.'), `可读名不露模板 id（${lab}）`);
  const corner = (v: Values) => resolveUi(v).str('vis.corner');
  const inv: Values = { 'uip.screen': 'tpl.inventory', 'vis.corner': 'sharp', 'vis.corner@tpl.inventory': 'chamfer' };
  const other: Values = { ...inv, 'uip.screen': 'tpl.npc' };
  ok(corner(inv) === 'chamfer', `当前界面的覆盖生效（${corner(inv)}）`);
  ok(resolveUi(inv).src('vis.corner')?.layer === 'user', '来源记成手动');
  ok(corner(other) === 'sharp', `别的界面不生效（${corner(other)}）`);
  ok(!resolveUi(inv).keys().some((k) => k.includes('@tpl.')), '解析结果里不留 tpl 目标的键（主题作用域、导出看不到）');
  fresh();
  S().patch({ 'uip.screen': 'tpl.inventory', 'cmp.slot@tpl.inventory': 'card' }, [], '测试');
  ok(L.isModifiedKey('cmp.slot@tpl.inventory', S().values, S().origin), '部件覆盖算 UI 改动');
  A.resetScreenParts('tpl.inventory');
  ok(S().values['cmp.slot@tpl.inventory'] === undefined, '界面 ↺ 清掉这一屏的部件覆盖');
  fresh();
}

console.log(`\n场景测试：${n - fails} / ${n} 通过${fails ? `，${fails} 项失败` : ''}`);
process.exit(fails ? 1 : 0);
