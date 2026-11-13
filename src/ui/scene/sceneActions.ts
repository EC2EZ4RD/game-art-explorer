import { bossScreenValues, gameScene, homeScreen, sceneName, sceneValues, type GameScene, type ScreenEntry } from '../../content/gameScenes';
import { loadReplica, refImageUrl, type KReplica, type KReplicaScreen } from '../../content/uiKnowledge';
import { isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { playDemoScript, stopFlow } from '../../hud/flow';
import { scenePaletteOf } from '../../hud/HudSystem';
import { applyPreset } from '../../hud/sys/apply';
import { resolveUi } from '../../hud/sys/resolve';
import { PRESET } from '../../hud/sys/spec';
import * as A from '../../state/actions';
import * as L from '../../state/layers';
import { useStore } from '../../state/store';
import { keepMineDefault } from '../../state/viewHooks';
import { replicaInput, replicaScreenLabel } from './replicaPlan';

/*
 * 场景图库、界面胶片的套用动作（轨道 D，docs/workbench-redesign.md §5.2）。全部走 A 的合成函数（一步撤销、套完三层改动都是 0）：
 *   点场景 → applyScene（场景负责的键 + 元素位置改动清掉；画风、皮肤、UI 样式改动保留），界面停在「局内」；
 *   点界面 → applyScreen（只改界面选择，清掉上一个界面写过的键）；▶流程 = 换到这个界面 + 播一遍流程演示；
 *   名作 → 懒加载复刻文件 → 整套套用（场景 = rep:<id>、画面 = 复刻的配方、UI = 复刻的值）；
 *   名作里换界面 = 只换这一屏（皮肤、风格词、UI 样式改动、画面、环境都不动，§4.2「点界面 — 只改界面选择」）；
 *   单屏名作（ex.*）→ 当成只有一屏的场景：它写的 UI 值记进场景层，环境不换。
 * 名作的两种套用用 A 的 applyComposite 执行 replicaPlan.ts 拼的输入（值与 A.applyReplica 同一套），
 * 区别只在三处（审查修复 1 / 9 / 24）：换屏时保留皮肤与 UI 改动；「保留我的改动」（🔒 / Alt）时不清手动改动；名字用卡片上的中文名。
 * 本文件不放组件（Fast Refresh）。
 */

const st = () => useStore.getState();
const keepOpt = (alt?: boolean) => (alt ? { keepMine: true } : undefined);

/** 名作的复刻文件（懒加载，加载过的同步可取） */
const repCache = new Map<string, KReplica>();
export async function replicaOf(sc: GameScene): Promise<KReplica | null> {
  if (!sc.replica) return null;
  const hit = repCache.get(sc.replica);
  if (hit) return hit;
  const rep = await loadReplica(sc.replica);
  if (rep) repCache.set(sc.replica, rep);
  return rep;
}

/**
 * 「对照原作」参考图跟着界面走（整合修复 U#8）：画框 A 侧正在显示这个名作的原作截图（学习库套用时放上去的）时，
 * 换到有截图的一屏 = 换成这一屏的截图（标签用中文名：「哈迪斯 · 对话」），没有截图的一屏 = 收掉，免得对着错图看；
 * 原来没显示参考图时不主动放（参考截图只在开发服务器上有，放不放由学习库决定）。
 * 离开名作（点别的场景）时收掉它的截图。认标签前缀：中文名（D 的胶片）或复刻文件里的英文名（学习库的复刻面板）。
 */
function ownsRef(label: string | undefined, sc: GameScene | undefined, rep?: KReplica | null): boolean {
  if (!label || !sc?.replica) return false;
  const names = [sc.name, rep?.name ?? repCache.get(sc.replica)?.name].filter((x): x is string => !!x);
  return names.some((n) => label.startsWith(`${n} · `));
}
function syncReplicaRef(sc: GameScene, rep: KReplica, s: KReplicaScreen, prevScene: string | null) {
  const store = st();
  const cur = store.refImage;
  if (!cur) return;
  const mine = ownsRef(cur.label, sc, rep);
  // 显示的是上一个名作的截图（从别的名作直接点进来）：同样换掉 / 收掉
  const prev = prevScene && prevScene !== sc.id ? gameScene(prevScene) : undefined;
  if (!mine && !ownsRef(cur.label, prev)) return;
  const url = refImageUrl(s.ref);
  if (url) store.setRefImage({ url, label: `${sc.name} · ${replicaScreenLabel(sc, s.key)}` });
  else store.setRefImage(null);
}
/** 离开名作：它的截图不再对得上 */
function dropReplicaRef(prevScene: string | null) {
  const store = st();
  const prev = gameScene(prevScene);
  if (store.refImage && ownsRef(store.refImage.label, prev)) store.setRefImage(null);
}

/** 单屏名作（ex.*）的场景输入：案例屏写的 UI 值进场景层（界面键进 home），环境、种子、品类沿用现在的 */
function exampleInput(sc: GameScene): L.SceneInput | null {
  const id = sc.example!;
  const s = st();
  const patch = applyPreset(id, s.values, { isUi: isUiKey, scene: scenePaletteOf(s.values) });
  if (!patch) return null;
  const ui = L.uiPart(patch.set);
  const home: Values = {}, rest: Values = {};
  for (const [k, v] of Object.entries(ui)) (L.SCREEN_KEYS.has(k) ? home : rest)[k] = v;
  const keepGame: Values = {};
  for (const k of ['game.scene', 'game.seed', 'game.genre', 'game.kit']) if (s.values[k] !== undefined) keepGame[k] = s.values[k];
  return { id: sc.id, name: sc.name, values: { ...keepGame, ...rest }, home: { id, name: '这一屏', values: home } };
}

/** 点场景卡（Alt 或 🔒 = 保留我的改动）。名作要加载复刻文件，所以是异步的 */
export async function pickGameScene(sc: GameScene, opts?: { alt?: boolean }) {
  stopFlow();
  const prevScene = st().origin.scene;
  if (sc.replica) {
    const rep = await replicaOf(sc);
    if (rep?.screens?.[0]) {
      const s = st();
      A.applyComposite(replicaInput(s.values, s.origin, sc, rep, rep.screens[0], 'full', !!opts?.alt || keepMineDefault()));
      syncReplicaRef(sc, rep, rep.screens[0], prevScene);
    }
    return;
  }
  dropReplicaRef(prevScene);
  if (sc.example) {
    const inp = exampleInput(sc);
    if (inp) A.applyScene(inp, keepOpt(opts?.alt));
    return;
  }
  const home = homeScreen(sc);
  // 场景的镜头归场景（审查修复 16）：3D 场景也把机位键记成场景负责的（rigLock），配方带的镜头键不再盖掉场景的机位——
  // 原来魂类·城堡（低机位 28mm）配上低多边形（高俯 40mm）就成了鸟瞰。像素尺寸、景深、黑边、畸变仍跟配方。轨道环绕照常（锁轨道只看环境）
  A.applyScene({
    id: sc.id, name: sceneName(sc, hasSceneBuilder), values: sceneValues(sc, hasSceneBuilder), rigLock: true,
    home: home ? { id: home.id, name: home.label, values: home.values ?? {} } : null,
  }, keepOpt(opts?.alt));
}

/** 点界面（胶片卡） */
export async function pickScreen(sc: GameScene | undefined, scr: ScreenEntry) {
  // 先停掉正在播的流程演示（审查修复 8：流程演示的叠加会盖住界面选择，名作这一支原来没停）
  stopFlow();
  if (scr.kind === 'replica' && sc?.replica) {
    const rep = await replicaOf(sc);
    const s = rep?.screens.find((x) => x.key === scr.id);
    if (!rep || !s) return;
    // 已经在这个名作里：只换这一屏；还没进来：整套套用（停在这一屏）
    const cur = st();
    const prevScene = cur.origin.scene;
    A.applyComposite(replicaInput(cur.values, cur.origin, sc, rep, s, cur.origin.scene === sc.id ? 'screen' : 'full', keepMineDefault()));
    syncReplicaRef(sc, rep, s, prevScene);
    return;
  }
  if (sc?.example) {
    // 单屏名作：按当前参数重算这一屏的界面键（与点场景卡同一个算法），审查修复 2
    const home = exampleInput(sc)?.home;
    if (home) A.applyScreen({ id: home.id, name: home.name, values: home.values });
    return;
  }
  // 没选场景时的通用 Boss：按现在的局内 HUD 补 Boss 条
  const values = !sc && scr.id === 'boss' ? genericBoss() : scr.values ?? {};
  A.applyScreen({ id: scr.id, name: scr.label.replace('▶', ''), values });
  if (scr.kind === 'flow' && scr.flow) playDemoScript(scr.flow);
}

/** 没选场景时的 Boss 界面值：现在的局内 HUD（不含界面键）里没有 Boss 条时加上 */
function genericBoss(): Values {
  const s = st();
  const r = resolveUi({ ...s.values, 'uip.screen': 'auto', 'cnt.screen': 'auto', 'cnt.subtype': 'auto' });
  return bossScreenValues(r.elements(), r.list('el.threat.form'));
}

/** 没选场景时的通用界面（过渡：任何状态下胶片都有东西可点） */
export const GENERIC_SCREENS: ScreenEntry[] = [
  ...[['hud', '局内', 'auto'], ['boss', 'Boss', 'auto'], ['title', '标题', 'tpl.title'], ['pause', '暂停', 'tpl.pausePc'], ['inventory', '背包', 'tpl.inventory'],
    ['map', '地图', 'tpl.worldmap'], ['dialogue', '对话', 'tpl.npc'], ['shop', '商店', 'tpl.shopCounter'], ['runSummary', '结算', 'tpl.runSummary'],
  ].map(([id, label, tpl]): ScreenEntry => ({ id, label, kind: tpl === 'auto' ? 'hud' : 'template', values: id === 'boss' ? bossScreenValues(null, null) : { 'uip.screen': tpl } })),
];

/** 「更多界面」里的任意模板（63 个）：当作这个场景的一个临时界面 */
export function pickTemplate(tplId: string) {
  stopFlow();
  const p = PRESET.get(tplId);
  A.applyScreen({ id: tplId, name: p?.label ?? tplId, values: { 'uip.screen': tplId } });
}

/** 当前场景（来源里的） */
export const currentScene = (): GameScene | undefined => gameScene(st().origin.scene);
