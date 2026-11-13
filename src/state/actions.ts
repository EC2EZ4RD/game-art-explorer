import type { Nudge } from '../content/nudges';
import { RECIPE_MAP, type Recipe } from '../content/recipes';
import { effectiveApprox, type MoodEntry, type StyleEntry } from '../content/styles';
import type { KReplica, KReplicaScreen } from '../content/uiKnowledge';
import { getParam, isUiKey } from '../dims/registry';
import type { Values } from '../dims/types';
import { applyPreset } from '../hud/sys/apply';
import { SELECTORS, SKIN_PRESET_BY_VALUE, skinValueOf } from '../hud/sys/register';
import { resolveUi } from '../hud/sys/resolve';
import { PRESET } from '../hud/sys/spec';
import * as L from './layers';
import { replicaInput, replicaSceneId, type ReplicaOpts } from './replica';
import { useStore, viewKeys } from './store';
import { keepMineDefault, runViewResets } from './viewHooks';

/*
 * 套用与重置（轨道 A，docs/workbench-redesign.md §4）。
 * 所有「套用」走同一个合成函数（layers.ts 的 plan* → rebase）：applyRecipe / applyStyle / 案例近似 / 复刻 / 套用场景 / 套用皮肤……
 * 每个动作 = 一次 store.applyPlan = 一步撤销；栏条（lastChange）显示「换配方：水彩（清 3 项）」「已重置 UI（清 23 项）」。
 * keepMine（「保留我的改动」，也可按住 Alt 点）：调用方没给时读外壳的开关（viewHooks.registerKeepMine）。
 */

const st = () => useStore.getState();
const run = (p: L.Plan): L.Plan => {
  st().applyPlan(p);
  return p;
};
const keep = (o?: L.PickOpts) => o?.keepMine ?? keepMineDefault();

/* ---------------- 画面 ---------------- */

/** 套用配方：画面改动整体替换，场景（环境、种子、品类）与所有 UI 不动（配方里的 UI 键不跟着走） */
export function applyRecipe(r: Recipe, opts?: L.PickOpts) {
  const s = st();
  return run(L.planLook(s.values, s.origin, { ref: r.id, name: L.recipeName(r.id), values: r.values }, { keepMine: keep(opts) }));
}

/** 点配方卡：已选中的再点一次 = 不用配方（退回下一层） */
export function pickRecipe(r: Recipe, opts?: L.PickOpts) {
  return st().origin.recipe === r.id ? dropRecipe(opts) : applyRecipe(r, opts);
}

/** 通用的「换画面」：ref = 配方 id / atlas:<风格 id> / case:<id>；via = 它借用的配方 */
export function applyLook(look: { ref: string | null; via?: string | null; name?: string; values: Values }, opts?: L.PickOpts & { label?: string }) {
  const s = st();
  return run(L.planLook(s.values, s.origin, look, { keepMine: keep(opts), label: opts?.label }));
}

/** 画面 ▾ 不用配方：配方和叠加都清空 */
export function dropRecipe(opts?: L.PickOpts) {
  const s = st();
  return run(L.planNoLook(s.values, s.origin, { keepMine: keep(opts) }));
}

/** 叠加开关（霓虹雨夜、做旧……）：on 不给 = 切换 */
export function toggleOverlay(ov: { id: string; name?: string; values: Values }, on?: boolean) {
  const s = st();
  return run(L.planOverlay(s.values, s.origin, ov, on));
}

/** 风格图谱条目：有对应配方时以配方为底，再叠加近似参数（含已补上能力带来的参数） */
export function applyStyle(sty: StyleEntry, opts?: L.PickOpts) {
  const base = sty.recipe ? RECIPE_MAP.get(sty.recipe)?.values ?? {} : {};
  return applyLook({ ref: `atlas:${sty.id}`, via: sty.recipe ?? null, name: sty.name, values: { ...base, ...effectiveApprox(sty) } }, { ...opts, label: `风格：${sty.name}` });
}

/** 案例近似（CaseLibrary「载入这款的近似参数」）：values = 缺口提示值 + 拆解给的近似参数；recipe = 它借用的配方 */
export function applyCaseApprox(c: { id: string; name: string; recipe?: string | null; values: Values }, opts?: L.PickOpts) {
  const base = c.recipe ? RECIPE_MAP.get(c.recipe)?.values ?? {} : {};
  return applyLook({ ref: `case:${c.id}`, via: c.recipe ?? null, name: c.name, values: { ...base, ...c.values } }, { ...opts, label: `案例近似：${c.name}` });
}

/** 感觉微调：写成普通改动（带 •，可以重置） */
export function applyNudge(n: Nudge) {
  const s = st();
  s.setMany(n.apply(s.values), `感觉：${n.label}`);
}

export function applyMood(m: MoodEntry) {
  st().setMany(m.approx ?? {}, `情绪：${m.name}`);
}

/** 跳到某个参数：切换到它的维度并高亮 */
export function focusParam(id: string) {
  const p = getParam(id);
  if (!p) return;
  const s = st();
  s.setDim(p.dim);
  s.setFocus(id);
  requestAnimationFrame(() => document.getElementById(`param-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
}

/* ---------------- UI ---------------- */

/** 皮肤预设 id（skin.*）或 hud.style 的值 → 皮肤 */
function skinOf(idOrValue: string): { id: string | null; value: string; name: string } {
  const pr = PRESET.get(idOrValue)?.kind === 'skin' ? PRESET.get(idOrValue) : SKIN_PRESET_BY_VALUE.get(idOrValue);
  if (pr) return { id: pr.id, value: skinValueOf(pr.id), name: pr.label };
  return { id: null, value: idOrValue, name: idOrValue === 'none' ? '不显示' : idOrValue };
}

/**
 * 换皮肤：只清皮肤负责的手动样式（含 *@el 样式），保留元素位置和内容。null = 回到场景默认皮肤。
 * extra：跟着皮肤一起进皮肤层的值（「配套当前画面」的 rel.harmony）
 */
export function applySkin(idOrValue: string | null, opts?: L.PickOpts & { extra?: Values; name?: string }) {
  const s = st();
  const sk = idOrValue ? { ...skinOf(idOrValue), extra: opts?.extra, ...(opts?.name ? { name: opts.name } : {}) } : null;
  return run(L.planSkin(s.values, s.origin, sk, { keepMine: keep(opts) }));
}

/** 当前皮肤是不是它（来源里记的皮肤，或手动选的 hud.style） */
export function isSkinOn(idOrValue: string): boolean {
  const s = st();
  const sk = skinOf(idOrValue);
  return sk.id ? s.origin.skin === sk.id && String(s.values['hud.style']) === sk.value : String(s.values['hud.style']) === sk.value && !s.origin.skin;
}

/** 点皮肤色板：已选中的再点一次 = 回到场景默认皮肤 */
export function pickSkin(idOrValue: string, opts?: L.PickOpts) {
  return isSkinOn(idOrValue) && st().origin.skin ? applySkin(null, opts) : applySkin(idOrValue, opts);
}

/** 「配套当前画面」的三个方案（apply.ts 的 fromArtOptions）：换皮肤 + rel.harmony，都记在皮肤层 */
export function applySkinFromArt(opt: { harmony: string; skin: string; label?: string }, opts?: L.PickOpts) {
  const sk = skinOf(opt.skin);
  return applySkin(opt.skin, { ...opts, extra: { 'rel.harmony': opt.harmony }, name: opt.label ? `${opt.label} · ${sk.name}` : sk.name });
}

const WORD_SELECTOR: Record<string, string> = { keyword: SELECTORS.keyword, theme: SELECTORS.theme };

/**
 * 套一个 UI 预设（spec 的 presets）：
 *   皮肤 → applySkin；风格词 / 节日 → 换选择器（记进来源）；成套 / 案例屏 → planBundle（记进来源）；
 *   界面模板 → applyScreen；其余（平台、商业模式、品类布局、版式、容器、感觉微调、无障碍叠加）→ 普通改动。
 * scene：感觉微调「按画面明暗取反」要用的场景色板（HudSystem.scenePaletteOf）
 */
export function applyUiPreset(id: string, opts?: L.PickOpts & { scene?: { sky: string; paper: string } | null }) {
  const pr = PRESET.get(id);
  if (!pr) return null;
  const s = st();
  if (pr.kind === 'skin') return applySkin(id, opts);
  if (pr.kind === 'keyword' || pr.kind === 'theme') return run(L.planWord(s.values, s.origin, pr.kind, WORD_SELECTOR[pr.kind], { id, name: pr.label }));
  if (pr.kind === 'screen') return applyScreen({ id, name: pr.label, values: { [SELECTORS.screen]: id } });
  const patch = applyPreset(id, s.values, { isUi: isUiKey, scene: opts?.scene ?? null });
  if (!patch) return null;
  if (pr.kind === 'recipe' || pr.kind === 'example') return run(L.planBundle(s.values, s.origin, { id, kind: pr.kind, name: pr.label, set: patch.set }, { keepMine: keep(opts) }));
  // 感觉芯片：写成普通改动；盖掉的手动值记进来源，去掉芯片时放回（审查修复 23）
  if (pr.kind === 'nudge' && !patch.unset.length) return run(L.planNudge(s.values, s.origin, { id, name: pr.label, set: patch.set }));
  s.patch(patch.set, patch.unset, patch.label);
  return null;
}

/** 这个预设现在算不算「选中」（皮肤 / 风格词 / 节日 / 成套 / 案例屏） */
export function isUiPresetOn(id: string): boolean {
  const pr = PRESET.get(id);
  if (!pr) return false;
  const s = st();
  if (pr.kind === 'skin') return isSkinOn(id);
  if (pr.kind === 'keyword' || pr.kind === 'theme') return String(s.values[WORD_SELECTOR[pr.kind]]) === id;
  if (pr.kind === 'recipe' || pr.kind === 'example') return s.origin.uiWords.includes(id);
  return false;
}

/** 点 UI 预设芯片：已选中的再点一次 = 退回下一层（皮肤 → 场景默认；风格词 / 节日 → 不用；成套 / 案例屏 → 去掉它） */
export function pickUiPreset(id: string, opts?: L.PickOpts & { scene?: { sky: string; paper: string } | null }) {
  const pr = PRESET.get(id);
  if (!pr || !isUiPresetOn(id)) return applyUiPreset(id, opts);
  const s = st();
  if (pr.kind === 'skin') return applySkin(null, opts);
  if (pr.kind === 'keyword' || pr.kind === 'theme') return run(L.planWord(s.values, s.origin, pr.kind, WORD_SELECTOR[pr.kind], null));
  if (pr.kind === 'recipe' || pr.kind === 'example') {
    // 去掉成套：风格词层只留风格词 / 节日；它写过的键回到下一层；它改过的「我的游戏」放回去
    return run(L.planDropBundle(s.values, s.origin, id, `去掉${pr.kind === 'recipe' ? '成套' : '案例屏'}：${pr.label}`));
  }
  return applyUiPreset(id, opts);
}

/**
 * UI 感觉微调（11 个 nudge 预设）是否「选中」：它在基线上算出来的值，现在都原样在（§4.2「感觉芯片」）。
 * 返回它写的键（选中时再点一次就把这些键回到基线）
 */
export function nudgeState(id: string, scene?: { sky: string; paper: string } | null): { on: boolean; keys: string[] } {
  const pr = PRESET.get(id);
  if (!pr || pr.kind !== 'nudge') return { on: false, keys: [] };
  const s = st();
  // 在基线上算一次就缓存（按来源对象；resolveUi 只有单槽缓存，别每次渲染都算）
  let m = nudgeCache.get(s.origin);
  if (!m) nudgeCache.set(s.origin, (m = new Map()));
  const ck = `${id}|${scene?.sky ?? ''}|${scene?.paper ?? ''}`;
  if (!m.has(ck)) m.set(ck, applyPreset(id, L.baseValues(s.origin), { isUi: isUiKey, scene: scene ?? null })?.set ?? null);
  const set = m.get(ck);
  const keys = set ? Object.keys(set) : [];
  const on = !!set && keys.length > 0 && keys.every((k) => L.isModifiedKey(k, s.values, s.origin) && L.sameVal(k, s.values[k], set[k]));
  return { on, keys };
}
const nudgeCache = new WeakMap<L.Origin, Map<string, Values | null>>();

/** 点感觉芯片：没选中 = 在当前值上微调（普通改动）；选中了再点 = 它写的键回到基线 */
export function pickNudge(id: string, opts?: { scene?: { sky: string; paper: string } | null }) {
  const ns = nudgeState(id, opts?.scene);
  if (ns.on) { const s = st(); return run(L.planNudgeOff(s.values, s.origin, id, ns.keys, PRESET.get(id)?.label)); }
  return applyUiPreset(id, { scene: opts?.scene });
}

/* ---------------- 场景与界面（D 的场景图库、界面胶片调用） ---------------- */

/** 换场景（§4.2 末表）：场景负责的键 + 元素位置改动清掉；配方、画面改动、皮肤、UI 样式改动保留 */
export function applyScene(sc: L.SceneInput, opts?: L.PickOpts) {
  const s = st();
  return run(L.planScene(s.values, s.origin, sc, { keepMine: keep(opts) }));
}

/** 只换环境（配方卡的「在 X 场景最好看 ›」、场景的「换环境」）：环境记进场景层，画面、UI 不动；name 不给时用环境表里的名字 */
export function applyEnv(envId: string, name?: string) {
  const s = st();
  return run(L.planEnv(s.values, s.origin, { id: envId, name: name ?? getParam('game.scene')?.options?.find((o) => o.value === envId)?.label }));
}

/** 换界面：只改界面选择，清掉上一个界面写过的键 */
export function applyScreen(scr: { id: string; name?: string; values: Values }) {
  const s = st();
  return run(L.planScreen(s.values, s.origin, scr));
}

/** 一次写好几个键、一步撤销（随机探索）：皮肤 / 风格词 / 环境 / 界面这些「选择」键走套用，其余是普通改动（layers.planWrites，X#6） */
export function applyWrites(vals: Values, label: string, opts?: L.PickOpts) {
  const s = st();
  return run(L.planWrites(s.values, s.origin, vals, label, { keepMine: keep(opts) }));
}

/** 通用的整套套用（跨层），见 layers.ts 的 CompositeInput */
export function applyComposite(c: L.CompositeInput) {
  const s = st();
  return run(L.planComposite(s.values, s.origin, c));
}

/**
 * 复刻 / 名作的一屏：学习库复刻面板（C）、场景图库名作卡与胶片（D）共用这一个合成（state/replica.ts 的 replicaInput，整合修复 X#1）。
 * 场景 = rep:<id>、界面 = 这一屏、画面 = 配方 + art.values；镜头归场景（rigLock）；名字用中文短名。套完三个标签的改动数都是 0。
 * opts.mode：'full'（默认）/ 'ui'（只套 UI，画面与环境不动；旧写法 uiOnly: true 同义）/ 'screen'（已在这款名作里，只换这一屏）；
 * keepMine 不给时读外壳的「保留我的改动」；keepSkin：保留现在的皮肤 / 风格词；names：显示名（默认场景图库里的中文名）。
 */
export function applyReplica(rep: KReplica, screen: KReplicaScreen, opts: ReplicaOpts & { uiOnly?: boolean } = {}) {
  const s = st();
  const mode = opts.mode ?? (opts.uiOnly ? 'ui' : 'full');
  return run(L.planComposite(s.values, s.origin, replicaInput(s.values, s.origin, rep, screen, { ...opts, mode, keepMine: keep(opts) })));
}

/** 这一屏是不是正在用的那一屏（学习库复刻面板的「已套用」：看来源，不看撤销标签） */
export function isReplicaOn(rep: { id: string }, screenKey: string): boolean {
  const o = st().origin;
  return o.scene === replicaSceneId(rep) && o.screen === screenKey;
}

/* ---------------- 重置（§4.2） ---------------- */

/** 一个键回到基线（参数行 •↺、双击标签） */
export function resetKey(k: string) {
  const s = st();
  return run(L.planResetKeys(s.values, s.origin, [k]));
}

/** 一组键回到基线（分组 ↺ 等）；只动改过的 */
export function resetKeys(keys: string[], label?: string) {
  const s = st();
  return run(L.planResetKeys(s.values, s.origin, keys, label));
}

/** 画面 ▾ 回到「配方」原样（画面标签的 ↺） */
export function resetArt() {
  const s = st();
  return run(L.planResetArt(s.values, s.origin));
}

/** UI ▾ 清样式改动 */
export function resetUiStyle() {
  const s = st();
  return run(L.planResetUiStyle(s.values, s.origin));
}

/** UI ▾ 还原元素位置 */
export function resetUiPos() {
  const s = st();
  return run(L.planResetUiPos(s.values, s.origin));
}

/** UI ▾ 回到场景默认 UI（顶栏「重置 UI」） */
export function resetUiToScene() {
  const s = st();
  return run(L.planResetUiToScene(s.values, s.origin));
}

/** 场景 ▾ 回到场景原样 */
export function resetScene() {
  const s = st();
  return run(L.planResetScene(s.values, s.origin));
}

/** 层级标签的完整重置：画面 = 回到配方原样；UI = 回到场景默认 UI；场景 = 回到场景原样 */
export function resetLayer(layer: L.TabLayer) {
  return layer === 'art' ? resetArt() : layer === 'ui' ? resetUiToScene() : resetScene();
}

const listOf = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v !== '' && v !== 'auto' ? v.split(',') : []);

/** 元素 ↺：这个元素（含实例）的位置 / 样式键回到基线，删掉实例 #2 #3，cnt.elements 里的去留回到基线 */
export function resetElement(id: string) {
  const s = st();
  const b = L.baseValues(s.origin);
  // cnt.elements 跟随布局（auto）时，基线清单看解析结果（审查修复 1：清单回到与它一样时 cnt.elements 回到 auto）
  const baseList = String(b['cnt.elements'] ?? 'auto') === 'auto' ? listOf(resolveUi(b).get('cnt.elements')) : undefined;
  return run(L.planResetElement(s.values, s.origin, id, baseList));
}

/** 界面 ↺：这一屏的部件覆盖（cmp.*@tpl.<id>）回到基线 */
export function resetScreenParts(tplId: string) {
  const s = st();
  return run(L.planResetScreenParts(s.values, s.origin, tplId));
}

/**
 * 重置视图（不进撤销）：kind = 'view'（视图▾ → 重置视图）：诊断、检查工具、冻结，以及外壳登记的缩放 / 设备 / 专注 / 👁UI；
 * 'all'（全部重新开始时一起）：再加上 A 槽、对比、参考图、选中、原则演示、预览。
 */
export function resetView(kind: 'view' | 'all' = 'view') {
  const s = st();
  const tools = viewKeys().filter((k) => s.values[k] !== getParam(k)?.default);
  if (tools.length) s.unset(tools, '重置视图');
  useStore.setState({
    diag: 'none', hudInDiag: false, frozen: false, readOpen: false, readHover: null,
    ...(kind === 'all' ? {
      compare: false, slotA: null, refImage: null, hudSel: null, hudABOn: false, hudDemo: null, preview: null,
      // 回到首屏（F0）：画面模式、配方页签；知识面板回到列表（审查修复 13）
      activeDim: 'world' as const, leftTab: 'recipes' as const, uiLeftTab: 'uiPrinciples' as const, focus: null,
      knowSel: { principle: null, family: null, replica: null }, knowStack: [], uiJump: null,
    } : {}),
  });
  runViewResets(kind);
}

/** 顶栏 重置▾ → 全部重新开始：回到首屏状态 + 视图状态复位（收藏、方向板、我的游戏、图库筛选保留）；一步撤销 */
export function resetAll() {
  const s = st();
  const p = run(L.planResetAll(s.values));
  resetView('all');
  st().dismissRestored();
  return p;
}

/** 栏条「新实验」：同全部重新开始 */
export const newExperiment = resetAll;

/* ---------------- 读（给面板用的小工具） ---------------- */

/** 三个标签的改动数 */
export const currentCounts = () => { const s = st(); return L.countLayers(s.values, s.origin); };
