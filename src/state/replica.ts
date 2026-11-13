import { gameScene } from '../content/gameScenes';
import { RECIPE_MAP } from '../content/recipes';
import { isRigLocked, SCENE_MAP } from '../content/sceneCatalog';
import { replicaScreenPatch, type KReplica, type KReplicaScreen } from '../content/uiKnowledge';
import { defaultsCached, isUiKey } from '../dims/registry';
import type { Values } from '../dims/types';
import * as L from './layers';

/*
 * 名作（复刻）套用的唯一合成（轨道 A，整合修复 X#1 / U#2 / U#10）：学习库的复刻面板（C）、场景图库的名作卡与胶片（D）都走这里，
 * 交给 layers.planComposite 一步提交。纯函数，node 测试直接用。
 *   来源：场景 = rep:<id>；画面 = 复刻的配方 + art.values（origin.recipe = rep:<id>，via = 借用的配方）；
 *   场景层 = game.*（环境、种子、品类）+ 镜头机位 + 这款名作各屏共用的 UI（内容包 + base）；
 *   界面层 = 这一屏自己的 UI（界面键 + 这一屏改的部件 + 钉帧）——「重置场景」回到第一屏时它们整层换回去（U#2）；
 *   镜头：rigLock = true，机位键记在场景层（X#1：原来 rigLock = false，在名作里点配方会把复刻的镜头换成配方的）；
 *     环境是 F 的 2D 环境（锁定镜头）时，场景层并进这个环境的 recommended（锁定的镜头键 + 建议的雾 / 光）；
 *   名字：卡片上的中文名（小丑牌 / 手牌，U#10），不是复刻文件里的英文名和屏 key。
 * mode：
 *   full   整套（默认）：画面、环境、UI 一起换；不保留我的改动时清掉全部手动改动；
 *   ui     只套 UI：画面与环境不动（学习库「只套 UI」）；
 *   screen 已经在这款名作里，只换这一屏：皮肤、风格词、UI 样式 / 元素位置改动、画面、环境、镜头都不动，
 *          只有场景层的界面键与界面层跟着新屏走（D 的验收「切界面不改皮肤和画风」）。还没进这款名作时按 full 处理。
 * keepMine：保留我的改动（full：只清场景负责的键；ui：只清场景层的 UI 键）。keepSkin：full / ui 时保留现在选的皮肤与风格词（screen 总是保留）。
 */

export interface ReplicaOpts {
  mode?: 'full' | 'ui' | 'screen';
  keepMine?: boolean;
  keepSkin?: boolean;
  /** 显示名；不给时用场景图库里的中文名 */
  names?: { scene?: string; screen?: string };
}

const pick = (v: Values, f: (k: string) => boolean): Values => Object.fromEntries(Object.entries(v).filter(([k]) => f(k)));

/** 名作在场景图库里的 id（rep:<复刻 id>） */
export const replicaSceneId = (rep: { id: string }) => `rep:${rep.id}`;
/** 名作的中文短名（场景图库卡片上的）；图库里没有时用复刻文件里的名字 */
export const replicaName = (rep: KReplica): string => gameScene(replicaSceneId(rep))?.name ?? rep.name;
/** 名作里一屏的中文名（胶片上的）；图库里没有这一屏时用屏 key */
export const replicaScreenName = (rep: KReplica, key: string): string => gameScene(replicaSceneId(rep))?.screens.find((x) => x.id === key)?.label ?? key;

/** 这款名作各屏共用的 UI 值（内容包 + base）：进场景层 */
function sharedUi(rep: KReplica, values: Values): Values {
  return L.uiPart(replicaScreenPatch(rep, { key: '', ref: null, values: {} }, values, { uiOnly: true }).set);
}

/** 这一屏自己的 UI 值（界面键、这一屏改的部件、钉帧）：进界面层 */
function screenUi(rep: KReplica, s: KReplicaScreen, values: Values, shared: Values): Values {
  const all = L.uiPart(replicaScreenPatch(rep, s, values, { uiOnly: true }).set);
  return pick(all, (k) => L.SCREEN_KEYS.has(k) || !(k in shared) || !L.sameVal(k, all[k], shared[k]));
}

/** 画面层：配方 + art.values（+ 这一屏写的画面键）里写明的、或和默认值不同的画面键；镜头机位键不进（在场景层） */
function replicaLook(rep: KReplica, s: KReplicaScreen, full: Values): Values {
  const d = defaultsCached();
  const recipe = rep.art?.recipe ? RECIPE_MAP.get(rep.art.recipe) : undefined;
  const explicit = new Set([...Object.keys(recipe?.values ?? {}), ...Object.keys(rep.art?.values ?? {}), ...Object.keys(s.values ?? {})]);
  return pick(L.artPart(full), (k) => !L.RIG_KEYS.has(k) && (explicit.has(k) || !L.sameVal(k, full[k], d[k])));
}

/** 场景层的镜头：2D 环境 = 它锁定的镜头（recommended，连同建议的雾 / 光）；3D 环境 = 复刻自己的机位（配方 + art.values 算出来的） */
function replicaRig(env: string, full: Values): Values {
  if (isRigLocked(env)) return { ...(SCENE_MAP.get(env)?.recommended ?? {}) };
  return pick(full, (k) => L.RIG_KEYS.has(k));
}

/** 名作一屏的套用输入（交给 layers.planComposite / actions.applyComposite） */
export function replicaInput(values: Values, o: L.Origin, rep: KReplica, screen: KReplicaScreen, opts: ReplicaOpts = {}): L.CompositeInput {
  const sceneId = replicaSceneId(rep);
  const mode = opts.mode === 'screen' && o.scene !== sceneId ? 'full' : opts.mode ?? 'full';
  const sceneName = opts.names?.scene ?? replicaName(rep);
  const scrName = opts.names?.screen ?? replicaScreenName(rep, screen.key);
  const uiSet = replicaScreenPatch(rep, screen, values, { uiOnly: true }).set;
  const shared = sharedUi(rep, values);
  const scr = screenUi(rep, screen, values, shared);
  const direct = pick(uiSet, (k) => L.PROFILE_KEYS.has(k));
  const first = rep.screens?.[0];
  const home = first ? { id: first.key, values: first === screen ? scr : screenUi(rep, first, values, shared) } : null;
  const names: Record<string, string> = { [sceneId]: sceneName, [screen.key]: scrName, ...(home && home.id !== screen.key ? { [home.id]: replicaScreenName(rep, home.id) } : {}) };
  if (mode === 'screen') {
    const keepArt = pick(o.layers.scene, (k) => !isUiKey(k));
    return {
      label: `界面：${scrName}`,
      ids: { screen: screen.key },
      layers: { scene: { ...keepArt, ...shared }, screen: scr, words: pick(o.layers.words, (k) => !L.SCREEN_KEYS.has(k)) },
      names,
      // 只清场景层的 UI 键与界面键；皮肤、风格词、UI 样式 / 位置改动、game.*、镜头都保留
      drop: (k, l) => l === 'scene' && (isUiKey(k) || L.SCREEN_KEYS.has(k)),
      direct,
    };
  }
  const skinIds = opts.keepSkin ? {} : { skin: null, uiWords: [] as string[] };
  const skinLayers = opts.keepSkin ? { words: pick(o.layers.words, (k) => !L.SCENE_UI_KEYS.has(k)) } : { skin: {}, words: {} };
  if (mode === 'ui') {
    const keepArt = pick(o.layers.scene, (k) => !isUiKey(k));
    return {
      label: `名作 UI：${sceneName} · ${scrName}`,
      ids: { scene: sceneId, screen: screen.key, home, ...skinIds },
      layers: { scene: { ...keepArt, ...shared }, screen: scr, ...skinLayers },
      names,
      drop: opts.keepMine ? (k, l) => l === 'scene' && isUiKey(k) : (k, l) => l === 'uiStyle' || l === 'uiPos' || (l === 'scene' && isUiKey(k)),
      direct,
    };
  }
  const full = replicaScreenPatch(rep, screen, values).set;
  const env = String(full['game.scene'] ?? values['game.scene'] ?? '');
  const game = pick(full, (k) => k.startsWith('game.'));
  const recipe = rep.art?.recipe && RECIPE_MAP.has(rep.art.recipe) ? rep.art.recipe : null;
  return {
    label: first === screen ? `换场景：${sceneName}` : `换场景：${sceneName} · ${scrName}`,
    ids: { scene: sceneId, screen: screen.key, home, rigLock: true, recipe: sceneId, via: recipe, overlays: [], ...skinIds },
    layers: { scene: { ...game, ...shared, ...replicaRig(env, full) }, screen: scr, look: replicaLook(rep, screen, full), overlays: {}, ...skinLayers },
    names,
    drop: opts.keepMine ? (_k, l) => l === 'scene' : 'all',
    direct: pick(full, (k) => L.PROFILE_KEYS.has(k)),
  };
}
