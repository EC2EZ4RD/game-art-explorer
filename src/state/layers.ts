import { gameScene, homeScreen, rigValues, sceneName, sceneValues, START_SCENE_ID } from '../content/gameScenes';
import { RECIPE_MAP } from '../content/recipes';
import { isRigLocked, SCENE_MAP } from '../content/sceneCatalog';
import { FIRST_RUN } from '../content/taxonomy';
import { defaultsCached, getParam, isUiKey, isViewKey, labelOf, optionOf } from '../dims/registry';
import type { Val, Values } from '../dims/types';
import { ownsKey, resolveUi, type Resolved } from '../hud/sys/resolve';
import { HUD_STYLE_DEF, parseElementKey, parseOverrideKey, SELECTORS, SKIN_PRESET_BY_VALUE } from '../hud/sys/register';
import { PRESET, SPEC } from '../hud/sys/spec';

/*
 * 层级与来源（轨道 A，docs/workbench-redesign.md §4.1）。
 *
 * values 仍是一张扁平表（引擎、resolveUi、54 处读取方都不改）。另外记一份「来源」Origin：
 *   当前用的是哪个场景 / 配方 / 叠加 / 皮肤 / 风格词 / 界面，以及每一层套用时算好的值（layers）。
 * 基线 = 同一个合成函数 baseValues(origin)：
 *   默认值 ⊕ 场景层 ⊕ 配方层（只留画面键；场景锁定镜头时去掉镜头键）⊕ 叠加 ⊕ 界面层 ⊕ 皮肤层 ⊕ 风格词层（后四层只留 UI 键）
 * 改动 = values 与基线不同的键（视图键、「我的游戏」键不算）。
 * 每一层的值在套用时就存进 origin，所以算基线不依赖内容模块（复刻、案例、场景表）有没有加载完。
 *
 * 所有「套用」与「重置」都是纯函数 plan*(values, origin, …) → { values, origin, changed }，
 * 由 actions.ts 交给 store 一步提交（一步撤销）。核心是 rebase：换到新来源时，
 *   没改过的键跟着新基线走；改过的键，属于这次要清掉的层就回到新基线，否则保留用户的值。
 * 本文件只放纯函数（node 测试 scripts/test-state.ts 直接用）。
 */

/* ---------------- 类型 ---------------- */

/** 每一层套用时算好的值 */
export interface OriginLayers {
  /** 场景层：品类、环境、种子、镜头、布局、内容包、默认皮肤……（画面键与 UI 键都有，合成时按键分） */
  scene: Values;
  /** 界面层：uip.screen / cnt.screen / cnt.subtype / chk.demo / 钉帧，以及这一屏模板的值 */
  screen: Values;
  /** 画面层：配方（或风格图谱近似、案例近似、复刻的画面部分），只留画面键 */
  look: Values;
  /** 叠加：每个叠加一份（键 = 叠加 id） */
  overlays: Record<string, Values>;
  /** 皮肤层：{ 'hud.style': 值 } */
  skin: Values;
  /** 风格词 / 节日 / 成套（rcp.*、ex.*）写的 UI 值 */
  words: Values;
}

export interface Origin {
  /** 场景 id（D 的 gameScenes；名作 = rep:<id>）；null = 没选场景 */
  scene: string | null;
  /** 画面配方 id；风格图谱 = atlas:<风格 id>；案例近似 = case:<id>；null = 不用配方 */
  recipe: string | null;
  /** recipe 是近似条目（atlas: / case: / rep:）时，它借用的那个配方 id（左栏配方卡按它高亮） */
  via: string | null;
  /** 叠加 id，按套上的先后 */
  overlays: string[];
  /** 皮肤预设 id（skin.*）；null = 用场景默认皮肤 */
  skin: string | null;
  /** 风格词 / 节日 / 成套的预设 id（kw.* / theme.* / rcp.* / ex.*） */
  uiWords: string[];
  /** 当前界面 id（D 的 ScreenEntry；复刻 = 屏的 key） */
  screen: string | null;
  /** 场景的第一个界面：场景 ▾ 回到场景原样时回到它 */
  home: { id: string; values: Values } | null;
  /** 场景锁定镜头（2D 场景）：镜头键归场景层，配方带来的镜头键不生效 */
  rigLock: boolean;
  /** 显示名：id → 名字（场景、配方、皮肤、界面……） */
  names: Record<string, string>;
  layers: OriginLayers;
  /**
   * 去掉某个预设时要放回去的值（审查修复 5、23）：键 = `bundle:<预设 id>` / `nudge:<预设 id>`；
   *   prev = 套用前的值（undefined = 当时没设），wrote = 它写进去的值。去掉时只放回「现在仍等于它写的值」的键（之后又手动改过的不动）。
   *   成套写的「我的游戏」（平台 / 商业模式）、感觉芯片盖掉的手动值都记在这里。不进基线、不算改动。
   */
  stash: Record<string, { prev: Values; wrote: Values }>;
}

/** 键属于哪一层（决定改动记在哪个标签的计数上，§4.1 层归属表） */
export type KeyLayer = 'scene' | 'art' | 'uiStyle' | 'uiPos' | 'view' | 'profile';
/** 顶栏的三个层级标签 */
export type TabLayer = 'scene' | 'art' | 'ui';

export interface Plan {
  values: Values;
  origin: Origin;
  /** 实际变了的键（视图键也算在内） */
  changed: string[];
  label: string;
}

/** 返回 true = 这一键的手动改动在这次操作里清掉 */
export type Drop = (k: string, layer: KeyLayer) => boolean;

/* ---------------- 键的归属 ---------------- */

/** 镜头机位键（场景锁定镜头时归场景层；像素尺寸、景深、黑边、畸变仍归画面） */
export const RIG_KEYS: ReadonlySet<string> = new Set(['camera.projection', 'camera.angle', 'camera.azimuth', 'camera.fov', 'camera.zoom', 'camera.mode']);
/** 界面选择写的键（点界面只改这些） */
export const SCREEN_KEYS: ReadonlySet<string> = new Set(['uip.screen', 'cnt.screen', 'cnt.subtype', 'chk.demo', 'chk.simPose', 'chk.simTime']);
/** 场景层的 UI 键：布局、内容包、界面选择 */
export const SCENE_UI_KEYS: ReadonlySet<string> = new Set(['uip.layout', 'cnt.pack', ...SCREEN_KEYS]);
/** 「我的游戏」：平台、商业模式（不算改动、各层重置都不动、全部重新开始也保留） */
export const PROFILE_KEYS: ReadonlySet<string> = new Set(['uip.platform', 'uip.business']);
/** 元素位置类后缀（el.<id>.<后缀> 与画法级 el.<id>.<画法>.<后缀>） */
const POS_SUFFIX: ReadonlySet<string> = new Set(['screenAnchor', 'offsetX', 'offsetY', 'scale', 'width', 'height', 'visibility']);
const INSTANCE_RE = /#[23]$/;

/** 元素位置键：位置 / 大小 / 显隐、实例 #2 #3 的一切键、cnt.elements */
export function isPositionKey(k: string): boolean {
  if (k === 'cnt.elements') return true;
  const e = parseElementKey(k);
  if (e) return INSTANCE_RE.test(e.element) || POS_SUFFIX.has(e.suffix);
  const o = parseOverrideKey(k);
  return !!o && INSTANCE_RE.test(o.target);
}

/** 键属于哪一层；rigLock 看来源（锁定镜头的场景里镜头键归场景） */
export function layerOfKey(k: string, o?: { rigLock: boolean } | null): KeyLayer {
  if (isViewKey(k)) return 'view';
  if (PROFILE_KEYS.has(k)) return 'profile';
  if (k.startsWith('game.') || SCENE_UI_KEYS.has(k) || (o?.rigLock && RIG_KEYS.has(k))) return 'scene';
  if (!isUiKey(k)) return 'art';
  return isPositionKey(k) ? 'uiPos' : 'uiStyle';
}

export const tabOf = (l: KeyLayer): TabLayer | null => (l === 'scene' ? 'scene' : l === 'art' ? 'art' : l === 'uiStyle' || l === 'uiPos' ? 'ui' : null);

/** 皮肤负责的样式键（ownsKey('skin')，含 <参数>@<目标> 的作用域样式） */
export function skinOwns(k: string): boolean {
  if (ownsKey('skin', k)) return true;
  const i = k.indexOf('@');
  return i > 0 && ownsKey('skin', k.slice(0, i));
}

/** 只留画面键（配方层、叠加层用）：去掉 UI 键、视图键、game.* */
export function artPart(v: Values): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) if (!isUiKey(k) && !isViewKey(k) && !k.startsWith('game.')) out[k] = x;
  return out;
}
/** 只留 UI 键（不含视图键、「我的游戏」键） */
export function uiPart(v: Values): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) if (isUiKey(k) && !isViewKey(k) && !PROFILE_KEYS.has(k)) out[k] = x;
  return out;
}
const omit = (v: Values, f: (k: string) => boolean): Values => {
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) if (!f(k)) out[k] = x;
  return out;
};

/* ---------------- 来源 ---------------- */

const EMPTY_LAYERS: OriginLayers = { scene: {}, screen: {}, look: {}, overlays: {}, skin: {}, words: {} };

/** 空来源：基线 = 默认值（旧存档迁移时用：所有非默认值都算改动） */
export function emptyOrigin(): Origin {
  return { scene: null, recipe: null, via: null, overlays: [], skin: null, uiWords: [], screen: null, home: null, rigLock: false, names: {}, layers: { ...EMPTY_LAYERS, overlays: {} }, stash: {} };
}

/**
 * 首屏状态（F0，§2）：画面模式、沙盒·小岛（连同它的默认 UI）、C 挑的首屏配方、HUD 隐藏（HUD 隐藏是 B 的视图状态）。
 * 「全部重新开始」= 回到这里（整合修复 X#3 / U#20：原来 scene 为空，图库没有高亮卡、没有场景镜头 / 布局 / 皮肤）。
 * 出处只有一份：配方 = C 的 FIRST_RUN.recipe（taxonomy.ts），场景 = D 的 START_SCENE_ID（gameScenes.ts）。
 */
export const START_RECIPE: string = FIRST_RUN.recipe;
export const START_SCENE: string | null = START_SCENE_ID;

/** 配方 → 画面层的值（只留画面键；配方里的 hud.style 等 UI 键不跟着走：换配方不碰 UI） */
export function recipeLook(id: string): Values | null {
  const r = RECIPE_MAP.get(id);
  return r ? artPart(r.values) : null;
}

/** 左栏配方卡该高亮哪个配方（= 旧的 store.baseRecipe） */
export const recipeIdOf = (o: Origin): string | null => (o.recipe && !o.recipe.includes(':') ? o.recipe : o.via);
/** 风格图谱条目 id（= 旧的 store.baseStyle） */
export const styleIdOf = (o: Origin): string | null => (o.recipe?.startsWith('atlas:') ? o.recipe.slice(6) : null);

/**
 * 首屏场景的套用输入（与 D 的 sceneActions.pickGameScene 同一个写法：场景的镜头归场景 rigLock、界面停在第一个）。
 * 环境是不是已上线按场景目录判断（node 里也能算；F 的 2D 环境都在目录里）。
 */
export function startSceneInput(): SceneInput | null {
  const sc = START_SCENE ? gameScene(START_SCENE) : undefined;
  if (!sc) return null;
  const has = (id: string) => SCENE_MAP.has(id);
  const home = homeScreen(sc);
  return { id: sc.id, name: sceneName(sc, has), values: sceneValues(sc, has), rigLock: true, home: home ? { id: home.id, name: home.label, values: home.values ?? {} } : null };
}

/** 全新状态的来源：首屏配方 + 首屏场景（沙盒·小岛，界面停在局内） */
export function freshOrigin(): Origin {
  let o = emptyOrigin();
  const look = START_RECIPE ? recipeLook(START_RECIPE) : null;
  if (look && START_RECIPE) {
    o.recipe = START_RECIPE;
    o.layers.look = look;
    o.names[START_RECIPE] = recipeName(START_RECIPE);
  }
  const sc = startSceneInput();
  if (sc) o = withScene(o, sc);
  return o;
}

/** 配方的显示名：卡片上的短名（≤8 字，C 的 Recipe.short），没有时用全名（审查修复 22：图库、画框下、顶栏、撤销列表同一个名字） */
export function recipeName(id: string): string {
  const r = RECIPE_MAP.get(id);
  return r ? r.short ?? r.name : id;
}

/** 全新状态的值（= 打开一个从没用过的标签页看到的） */
export function freshValues(): Values {
  return { ...baseValues(freshOrigin()) };
}

/** 复制一份来源并改几项（来源对象当作不可变：基线按对象身份缓存） */
export function withOrigin(o: Origin, patch: Partial<Omit<Origin, 'layers' | 'names'>>, layers?: Partial<OriginLayers>, names?: Record<string, string | undefined>): Origin {
  const n = { ...o.names };
  if (names) for (const [k, v] of Object.entries(names)) if (v) n[k] = v;
  return { ...o, ...patch, names: n, layers: { ...o.layers, ...layers } };
}

/** 读存档 / 收藏 / 导出里的来源：缺字段补齐，类型不对的丢掉 */
export function normalizeOrigin(raw: unknown): Origin {
  const o = emptyOrigin();
  if (!raw || typeof raw !== 'object') return o;
  const r = raw as Partial<Origin>;
  const str = (x: unknown) => (typeof x === 'string' ? x : null);
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);
  const vals = (x: unknown): Values => (x && typeof x === 'object' && !Array.isArray(x) ? { ...(x as Values) } : {});
  o.scene = str(r.scene);
  o.recipe = str(r.recipe);
  o.via = str(r.via);
  o.overlays = strs(r.overlays);
  o.skin = str(r.skin);
  o.uiWords = strs(r.uiWords);
  o.screen = str(r.screen);
  o.rigLock = r.rigLock === true;
  o.home = r.home && typeof r.home === 'object' && typeof r.home.id === 'string' ? { id: r.home.id, values: vals(r.home.values) } : null;
  o.names = {};
  if (r.names && typeof r.names === 'object') for (const [k, v] of Object.entries(r.names)) if (typeof v === 'string') o.names[k] = v;
  const L = (r.layers ?? {}) as Partial<OriginLayers>;
  o.layers = {
    scene: vals(L.scene), screen: vals(L.screen), look: vals(L.look), skin: vals(L.skin), words: vals(L.words),
    overlays: Object.fromEntries(Object.entries(L.overlays && typeof L.overlays === 'object' ? L.overlays : {}).map(([k, v]) => [k, vals(v)])),
  };
  o.stash = {};
  if (r.stash && typeof r.stash === 'object') {
    for (const [k, v] of Object.entries(r.stash)) if (v && typeof v === 'object') o.stash[k] = { prev: vals((v as { prev?: unknown }).prev), wrote: vals((v as { wrote?: unknown }).wrote) };
  }
  return o;
}

/** 稳定的序列化（键排序）：比较两个来源是否「一样」用 */
function canon(x: unknown): string {
  if (x === null || typeof x !== 'object') return JSON.stringify(x) ?? 'undefined';
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`;
  const o = x as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
}

/**
 * 两个来源在结构上一样（审查修复 9）：套用没换来源时（再点「默认」皮肤、再点同一个界面、全新状态上的全部重新开始）
 * 不推一步空撤销。名字表也算在内（名字变了 = 标签上的字变了）。
 */
export function sameOrigin(a: Origin, b: Origin): boolean {
  return a === b || canon(a) === canon(b);
}

/* ---------------- 合成与差值 ---------------- */

const baseCache = new WeakMap<Origin, Values>();

/**
 * 场景锁定镜头时压在配方上面的光照键（收尾 10，2D 光照的合成顺序）：2D 环境的 recommended 里写的时段、灯笼、环境光、投影
 * （横版·废墟 17.3 点的夕照、横版·洞穴 22 点 + 灯笼、立绘不投影）是场景为看得清选的，配方带的时段（辉光像素 20 点）不盖它；
 * 用户自己改了照旧算手动改动、盖过它；叠加（霓虹雨夜这类「加时段」）是用户另点的，仍压在上面。雾、天空、后处理照旧跟配方。
 */
export const isSceneLightKey = (k: string) => k.startsWith('lighting.') || k === 'shading.ambient';
/** 这个光照键现在由场景决定（锁定镜头、场景层写了它） */
export const sceneLightWins = (k: string, o: Origin) => o.rigLock && isSceneLightKey(k) && o.layers.scene[k] !== undefined;

/**
 * 基线（同一个合成函数，§4.1）。返回的对象是缓存的，调用方不要改它。
 * 默认值 ⊕ 场景层 ⊕ 配方层 ⊕（锁定镜头时）场景层的光照键 ⊕ 叠加（画面键；锁定镜头时去掉镜头键）⊕ 界面层 ⊕ 皮肤层 ⊕ 风格词层（UI 键）
 */
export function baseValues(o: Origin): Values {
  const hit = baseCache.get(o);
  if (hit) return hit;
  const b: Values = { ...defaultsCached() };
  const L = o.layers;
  for (const [k, v] of Object.entries(L.scene)) if (!isViewKey(k) && !PROFILE_KEYS.has(k)) b[k] = v;
  const artOk = (k: string) => layerOfKey(k, o) === 'art';
  for (const [k, v] of Object.entries(L.look)) if (artOk(k)) b[k] = v;
  if (o.rigLock) for (const [k, v] of Object.entries(L.scene)) if (isSceneLightKey(k) && artOk(k)) b[k] = v;
  for (const id of o.overlays) for (const [k, v] of Object.entries(L.overlays[id] ?? {})) if (artOk(k)) b[k] = v;
  for (const src of [L.screen, L.skin, L.words]) for (const [k, v] of Object.entries(src)) if (isUiKey(k) && !isViewKey(k) && !PROFILE_KEYS.has(k)) b[k] = v;
  baseCache.set(o, b);
  return b;
}

/** 比较用的规范形式：没有值 = 参数默认值（不登记的动态键 = auto，即"不设"）；数字去掉浮点尾巴 */
export function normVal(k: string, v: Val | undefined): string {
  let x: Val | undefined = v;
  if (x === undefined || x === null) x = getParam(k)?.default ?? 'auto';
  if (typeof x === 'number') return String(+x.toFixed(6));
  return String(x);
}
export const sameVal = (k: string, a: Val | undefined, b: Val | undefined) => normVal(k, a) === normVal(k, b);

/** 这个键在基线里的值（不设的动态键返回 undefined） */
export function baseValueOf(k: string, o: Origin): Val | undefined {
  return baseValues(o)[k];
}

/** 这一键改没改过（视图键、「我的游戏」永远是 false） */
export function isModifiedKey(k: string, values: Values, o: Origin): boolean {
  const l = layerOfKey(k, o);
  if (l === 'view' || l === 'profile') return false;
  return !sameVal(k, values[k], baseValues(o)[k]);
}

const modCache = new WeakMap<Values, { o: Origin; keys: string[] }>();

/** 所有改动过的键（缓存：同一对 values / origin 只算一次） */
export function modifiedKeysOf(values: Values, o: Origin): string[] {
  const c = modCache.get(values);
  if (c && c.o === o) return c.keys;
  const b = baseValues(o);
  const out: string[] = [];
  const check = (k: string) => {
    const l = layerOfKey(k, o);
    if (l === 'view' || l === 'profile') return;
    if (!sameVal(k, values[k], b[k])) out.push(k);
  };
  for (const k of Object.keys(values)) check(k);
  for (const k of Object.keys(b)) if (!(k in values)) check(k);
  modCache.set(values, { o, keys: out });
  return out;
}

export interface LayerCounts { scene: number; art: number; ui: number; uiStyle: number; uiPos: number; total: number }

/**
 * 元素位置改动按「哪个元素」数（审查修复 19）：拖一次生命条写 anchor + offsetX/Y（+ scale）是一件事，记 1；
 * 实例 #2 #3 各算一个元素；cnt.elements（显隐 / 加减元素）整体算 1。
 */
export function positionGroupOf(k: string): string {
  if (k === 'cnt.elements') return k;
  const e = parseElementKey(k);
  if (e) return e.element;
  const o = parseOverrideKey(k);
  return o ? o.target : k;
}

/** 三个层级标签的改动数（UI = 样式（按键）+ 元素位置（按元素）） */
export function countLayers(values: Values, o: Origin): LayerCounts {
  const n: LayerCounts = { scene: 0, art: 0, ui: 0, uiStyle: 0, uiPos: 0, total: 0 };
  const pos = new Set<string>();
  for (const k of modifiedKeysOf(values, o)) {
    const l = layerOfKey(k, o);
    if (l === 'scene') n.scene++;
    else if (l === 'art') n.art++;
    else if (l === 'uiStyle') n.uiStyle++;
    else if (l === 'uiPos') pos.add(positionGroupOf(k));
  }
  n.uiPos = pos.size;
  n.ui = n.uiStyle + n.uiPos;
  n.total = n.scene + n.art + n.ui;
  return n;
}

/** UI 层的来源有没有偏离场景默认（选了皮肤 / 风格词 / 成套）：「回到场景默认 UI」此时可点，哪怕没有一项手动改动（审查修复 4） */
export const uiPicked = (o: Origin): boolean => !!o.skin || o.uiWords.length > 0 || Object.keys(o.layers.skin).length > 0 || Object.keys(o.layers.words).length > 0;

/** 界面选择有没有离开场景的第一个界面（没选场景时 = 选过任何界面）：「回到场景原样」此时可点（审查修复 4） */
export function screenPicked(o: Origin): boolean {
  if (o.home) return o.screen !== o.home.id || canon(o.layers.screen) !== canon(o.home.values);
  return o.screen !== null || Object.keys(o.layers.screen).length > 0;
}

/**
 * 三个层级标签上显示的数（整合修复 U#22，§4.1「场景 = … + 界面选择」）：场景 = 场景键的改动 + 界面离开了第一个界面（算 1）；
 * 画面、UI 同 countLayers。换界面本身不是手动改动（countLayers、「套用后改动 = ∅」不变），只是标签上看得出「这里可以回到局内」。
 */
export function tabCounts(values: Values, o: Origin): LayerCounts & { screen: number } {
  const c = countLayers(values, o);
  const screen = screenPicked(o) ? 1 : 0;
  return { ...c, scene: c.scene + screen, total: c.total + screen, screen };
}

/** 某一层的改动键 */
export const modifiedIn = (values: Values, o: Origin, f: (l: KeyLayer, k: string) => boolean) => modifiedKeysOf(values, o).filter((k) => f(layerOfKey(k, o), k));

/** 两组值里实际不同的键 */
export function diffKeys(a: Values, b: Values): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!sameVal(k, a[k], b[k])) out.push(k);
  return out;
}

const isDynamic = (k: string) => !getParam(k);

/**
 * 换来源（所有「套用」的核心）：
 *   没改过的键跟着新基线走；改过的键，drop 说要清的回到新基线，其余保留用户的值。
 *   视图键、「我的游戏」键原样保留。
 */
export function rebase(values: Values, o0: Origin, o1: Origin, drop: Drop): { values: Values; changed: string[] } {
  const b0 = baseValues(o0), b1 = baseValues(o1);
  const out: Values = {};
  for (const k of new Set([...Object.keys(values), ...Object.keys(b0), ...Object.keys(b1)])) {
    const l0 = layerOfKey(k, o0), l1 = layerOfKey(k, o1);
    if (l1 === 'view' || l1 === 'profile') { if (values[k] !== undefined) out[k] = values[k]; continue; }
    const cur = values[k];
    const keep = !sameVal(k, cur, b0[k]) && !drop(k, l0) && !drop(k, l1);
    const v = keep ? cur : b1[k];
    if (v === undefined || (v === 'auto' && isDynamic(k))) continue;
    out[k] = v;
  }
  return { values: out, changed: diffKeys(values, out) };
}

/** 一组键回到基线（行 ↺、组 ↺、层重置都用它） */
export function resetKeysTo(values: Values, o: Origin, keys: Iterable<string>): { values: Values; changed: string[] } {
  const b = baseValues(o);
  const out: Values = { ...values };
  for (const k of keys) {
    const v = b[k];
    if (v === undefined || (v === 'auto' && isDynamic(k))) delete out[k];
    else out[k] = v;
  }
  return { values: out, changed: diffKeys(values, out) };
}

/* ---------------- 显示名 ---------------- */

/** 来源里某个 id 的显示名（配方一律用卡片短名，存档里记的旧全名不算数） */
export function nameOf(o: Origin, id: string | null): string {
  if (!id) return '';
  if (RECIPE_MAP.has(id)) return recipeName(id);
  if (o.names[id]) return o.names[id];
  const p = PRESET.get(id);
  if (p) return p.label;
  return id.replace(/^(atlas|case|rep):/, '');
}

/** 三个层级标签上的名字：场景（没选场景时 = 环境名）/ 画面（配方名，不用配方时「无配方」）/ UI（皮肤名；不是皮肤预设的取值用选项名，如「不显示」） */
export function layerTitle(layer: TabLayer, values: Values, o: Origin): string {
  if (layer === 'scene') return o.scene ? nameOf(o, o.scene) : labelOf('game.scene', values);
  if (layer === 'art') return o.recipe ? nameOf(o, o.recipe) : Object.keys(o.layers.look).length ? '自定' : '无配方';
  const skin = SKIN_PRESET_BY_VALUE.get(String(values['hud.style'] ?? ''));
  return o.skin ? nameOf(o, o.skin) : skin?.label ?? (labelOf('hud.style', values) || String(values['hud.style'] ?? ''));
}

/** 基线解析出来的 UI 值（按来源对象缓存：resolveUi 自己只有单槽缓存，别和面板的解析互相挤掉） */
const baseResolved = new WeakMap<Origin, Resolved>();
function resolvedBase(o: Origin): Resolved {
  let r = baseResolved.get(o);
  if (!r) baseResolved.set(o, (r = resolveUi(baseValues(o))));
  return r;
}

/** 一个 UI 取值的显示文字：选项名 / 数字 / 原样（多选按「、」连起来） */
function uiValueText(k: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  // 动态键（el.vitals.scale、vis.corner@el.vitals）按它的模板参数取词表
  const def = getParam(k) ?? getParam(parseElementKey(k)?.param ?? '') ?? getParam(parseOverrideKey(k)?.param ?? '');
  const one = (x: unknown): string => {
    if (typeof x === 'number') { const o = def ? optionOf(def, x) : undefined; return o?.label ?? `${+x.toFixed(2)}${def?.unit ?? ''}`; }
    return (def ? optionOf(def, x as Val)?.label : undefined) ?? String(x);
  };
  return Array.isArray(v) ? (v.length ? v.map(one).join('、') : '无') : one(v);
}

/**
 * 行 ↺ 的悬停提示：「回到 画面·水彩：0.6」「回到 皮肤·新粗野主义：圆角」（审查修复 20）。
 * UI 键的基线多半是「跟随」：这里按基线解析一遍，写出跟随到的实际取值；解析不出时才写「跟随」。
 */
export function resetHint(k: string, o: Origin, values: Values): string {
  const l = layerOfKey(k, o);
  const b = baseValues(o)[k];
  const where = l === 'scene' || sceneLightWins(k, o) ? `场景·${layerTitle('scene', values, o)}` : l === 'art' ? (o.recipe ? `画面·${nameOf(o, o.recipe)}` : '画面默认') : l === 'uiPos' ? '原位' : `皮肤·${layerTitle('ui', baseValues(o), o)}`;
  const p = getParam(k);
  let text: string;
  if (b === undefined || (b === 'auto' && (isDynamic(k) || p?.ui))) {
    let shown = '';
    try {
      const r = resolvedBase(o);
      const e = parseElementKey(k), ov = parseOverrideKey(k);
      const v = e ? r.el(e.element, e.suffix, e.form) : ov ? r.at(ov.param, ov.target) : r.get(k);
      shown = uiValueText(k, v);
    } catch { /* 解析不了：写「跟随」 */ }
    text = shown && shown !== 'auto' ? shown : '跟随';
  } else text = p ? labelOf(k, { [k]: b }) : String(b);
  return `回到 ${where}：${text}`;
}

/* ---------------- 套用（选择时的语义，§4.2 末表） ---------------- */

const none: Drop = () => false;
const mk = (values: Values, o0: Origin, o1: Origin, drop: Drop, label: string, direct?: Values): Plan => {
  const r = rebase(values, o0, o1, drop);
  if (direct) for (const [k, v] of Object.entries(direct)) r.values[k] = v;
  return { values: r.values, origin: o1, changed: direct ? diffKeys(values, r.values) : r.changed, label };
};
const cleared = (p: Plan, o: Origin, values: Values, layerTest: (l: KeyLayer) => boolean) =>
  // 被清掉的手动改动数（「已清 N 项 · 撤销」）
  modifiedKeysOf(values, o).filter((k) => layerTest(layerOfKey(k, o)) && !(isModifiedKey(k, p.values, p.origin) && sameVal(k, p.values[k], values[k]))).length;
const withCleared = (p: Plan, n: number): Plan => (n > 0 ? { ...p, label: `${p.label}（清 ${n} 项）` } : p);

export interface PickOpts { keepMine?: boolean }

/**
 * 换画面（配方 / 风格图谱 / 案例近似……）：画面改动整体替换（keepMine 时保留），场景与所有 UI 不动。
 * ref = null 且 look 为空 = 不用配方。
 */
export function planLook(values: Values, o: Origin, look: { ref: string | null; via?: string | null; name?: string; values: Values }, opts: PickOpts & { label?: string } = {}): Plan {
  const o1 = withOrigin(o, { recipe: look.ref, via: look.via ?? null }, { look: artPart(look.values) }, look.ref ? { [look.ref]: look.name } : undefined);
  const drop: Drop = opts.keepMine ? none : (_k, l) => l === 'art';
  const label = opts.label ?? (look.ref ? `换配方：${look.name ?? nameOf(o1, look.ref)}` : '不用配方');
  const p = mk(values, o, o1, drop, label);
  return opts.keepMine ? p : withCleared(p, cleared(p, o, values, (l) => l === 'art'));
}

/** 不用配方：配方和叠加都清空，画面键 = 默认 ⊕ 场景 */
export function planNoLook(values: Values, o: Origin, opts: PickOpts = {}): Plan {
  const o1 = withOrigin(o, { recipe: null, via: null, overlays: [] }, { look: {}, overlays: {} });
  const p = mk(values, o, o1, opts.keepMine ? none : (_k, l) => l === 'art', '不用配方');
  return opts.keepMine ? p : withCleared(p, cleared(p, o, values, (l) => l === 'art'));
}

/** 叠加开关（霓虹雨夜、做旧、VHS……可配任何配方）：只接管叠加自己的键 */
export function planOverlay(values: Values, o: Origin, ov: { id: string; name?: string; values: Values }, on?: boolean): Plan {
  const has = o.overlays.includes(ov.id);
  const want = on ?? !has;
  const vals = artPart(ov.values);
  const overlays = { ...o.layers.overlays };
  if (want) overlays[ov.id] = vals; else delete overlays[ov.id];
  const o1 = withOrigin(o, { overlays: want ? [...o.overlays.filter((x) => x !== ov.id), ov.id] : o.overlays.filter((x) => x !== ov.id) }, { overlays }, { [ov.id]: ov.name });
  return mk(values, o, o1, (k) => k in vals, `${want ? '叠加' : '去掉叠加'}：${ov.name ?? nameOf(o1, ov.id)}`);
}

/** 皮肤 id ↔ hud.style 的值 */
export const skinIdOfValue = (v: string): string | null => SKIN_PRESET_BY_VALUE.get(v)?.id ?? null;

/**
 * 换皮肤：只清皮肤负责的手动样式（含 *@el 样式），保留元素位置和内容（keepMine 时只换皮肤）。
 * skin = null：回到场景默认皮肤。
 */
export function planSkin(values: Values, o: Origin, skin: { id: string | null; value: string; name?: string; extra?: Values } | null, opts: PickOpts = {}): Plan {
  // extra：跟着皮肤一起记进皮肤层的值（「配套当前画面」的 rel.harmony）
  const extra = skin?.extra ? uiPart(skin.extra) : {};
  // 成套（rcp.*）写在风格词层里的皮肤负责的样式（颜色、可读性……）也一起让给新皮肤：风格词层合成在皮肤层之后，不让的话新皮肤被它盖住一半（审查修复 7）
  const words = omit(o.layers.words, (k) => k === 'hud.style' || (!opts.keepMine && skinOwns(k)));
  const o1 = withOrigin(o, { skin: skin?.id ?? null }, { skin: skin ? { 'hud.style': skin.value, ...extra } : {}, words }, skin?.id ? { [skin.id]: skin.name } : undefined);
  const mine = (k: string) => k === 'hud.style' || k in extra || k in o.layers.skin;
  const drop: Drop = opts.keepMine ? (k) => mine(k) : (k, l) => mine(k) || (l === 'uiStyle' && skinOwns(k));
  const label = skin ? `换皮肤：${skin.name || nameOf(o1, skin.id) || skin.value}` : '皮肤回到场景默认';
  const p = mk(values, o, o1, drop, label);
  return withCleared(p, cleared(p, o, values, (l) => l === 'uiStyle'));
}

/** 风格词 / 节日（只换选择器；同类的旧词换掉）。preset = null + kind：去掉这一类 */
export function planWord(values: Values, o: Origin, kind: 'keyword' | 'theme', selector: string, preset: { id: string; name?: string } | null): Plan {
  const sameKind = (id: string) => PRESET.get(id)?.kind === kind;
  const uiWords = [...o.uiWords.filter((x) => !sameKind(x)), ...(preset ? [preset.id] : [])];
  const words = { ...o.layers.words };
  if (preset) words[selector] = preset.id; else delete words[selector];
  const o1 = withOrigin(o, { uiWords }, { words }, preset ? { [preset.id]: preset.name } : undefined);
  const label = preset ? `${kind === 'keyword' ? '风格词' : '节日'}：${preset.name ?? nameOf(o1, preset.id)}` : `${kind === 'keyword' ? '风格词' : '节日'}：不用`;
  return mk(values, o, o1, (k) => k === selector, label);
}

/** 预设的层（spec 的 layers：platform / business / layout / screen…）→ 它写的选择器键 */
const SELECTOR_OF_KIND: Record<string, string> = {
  skin: HUD_STYLE_DEF.id, keyword: SELECTORS.keyword, theme: SELECTORS.theme, platform: SELECTORS.platform, business: SELECTORS.business,
  layout: SELECTORS.layout, screen: SELECTORS.screen, pattern: SELECTORS.pattern, container: SELECTORS.container,
};

/** 预设自己写明的键（layers 里给了的层 + values）：没写明的层 applyPreset 会补成 auto / none，那些不算这个预设「要」的 */
function explicitKeysOf(id: string): Set<string> {
  const pr = PRESET.get(id);
  const out = new Set<string>(Object.keys(pr?.values ?? {}));
  for (const [kind, layer] of Object.entries(pr?.layers ?? {})) if (layer && SELECTOR_OF_KIND[kind]) out.add(SELECTOR_OF_KIND[kind]);
  return out;
}

/** 来源里当前那一套成套 / 案例屏的 id（风格词层里同时最多一套） */
const bundleOf = (o: Origin): string | null => o.uiWords.find((x) => { const k = PRESET.get(x)?.kind; return k === 'recipe' || k === 'example'; }) ?? null;

/** 放回暂存的值：只放「现在仍等于它写的值」的键（之后又手动改过的不动）；undefined = 当时没设 */
function putBack(values: Values, st: { prev: Values; wrote: Values } | undefined, keys?: Iterable<string>): Values {
  const out: Values = { ...values };
  if (!st) return out;
  const only = keys ? new Set(keys) : null;
  for (const k of Object.keys(st.wrote)) {
    if (only && !only.has(k)) continue;
    if (!sameVal(k, values[k], st.wrote[k])) continue;
    const pv = st.prev[k];
    if (pv === undefined) { const p = getParam(k); if (p) out[k] = p.default; else delete out[k]; } else out[k] = pv;
  }
  return out;
}

/**
 * 成套（rcp.* UI 配方）与案例屏（ex.*）：set = 预设算出的整套值（apply.ts 的 applyPreset）。
 * hud.style 进皮肤层，其余进风格词层。成套：先把手动 UI 改动清回基线（与旧行为一致）；案例屏保留已选的风格词 / 节日。
 * 审查修复 3：布局、内容包归场景（§4.1）：选了场景时不接成套给的；没选场景时只接成套写明的。
 *   界面选择只接写明的（成套没写界面时 applyPreset 补的 auto 不该把正在看的 Boss / 背包换回局内）。
 * 审查修复 5：「我的游戏」（平台 / 商业模式）只写成套写明的，套用前的值记进 stash，去掉成套时放回。
 */
export function planBundle(values: Values, o: Origin, preset: { id: string; kind: 'recipe' | 'example'; name?: string; set: Values }, opts: PickOpts = {}): Plan {
  const explicit = explicitKeysOf(preset.id);
  const set = omit(uiPart(preset.set), (k) => {
    if (SCREEN_KEYS.has(k)) return !explicit.has(k);
    if (SCENE_UI_KEYS.has(k)) return !!o.scene || !explicit.has(k);
    return false;
  });
  const skinVal = typeof preset.set['hud.style'] === 'string' ? (preset.set['hud.style'] as string) : null;
  delete set['hud.style'];
  const direct: Values = {};
  for (const k of PROFILE_KEYS) if (k in preset.set && explicit.has(k)) direct[k] = preset.set[k];
  // 暂存「我的游戏」：上一套成套暂存的是更早（用户自己）的值，接着沿用
  const prevB = bundleOf(o);
  const older = prevB ? o.stash[`bundle:${prevB}`] : undefined;
  const stash = { ...o.stash };
  if (prevB) delete stash[`bundle:${prevB}`];
  const prev: Values = {}, wrote: Values = {};
  for (const [k, v] of Object.entries(direct)) {
    if (older && k in older.wrote && sameVal(k, values[k], older.wrote[k])) prev[k] = older.prev[k];
    else prev[k] = values[k];
    wrote[k] = v;
  }
  if (older) for (const k of Object.keys(older.wrote)) if (!(k in direct) && sameVal(k, values[k], older.wrote[k])) { prev[k] = older.prev[k]; wrote[k] = values[k]; }
  if (Object.keys(wrote).length) stash[`bundle:${preset.id}`] = { prev, wrote };
  const keepWords = preset.kind === 'example' ? o.uiWords.filter((x) => { const k = PRESET.get(x)?.kind; return k === 'keyword' || k === 'theme'; }) : [];
  const keptWordVals = preset.kind === 'example' ? Object.fromEntries(Object.entries(o.layers.words).filter(([k]) => k === 'uip.keyword' || k === 'uip.theme')) : {};
  const o1 = withOrigin(
    o,
    { uiWords: [...keepWords, preset.id], stash, ...(skinVal ? { skin: skinIdOfValue(skinVal) } : {}) },
    { words: { ...keptWordVals, ...set }, ...(skinVal ? { skin: { 'hud.style': skinVal } } : {}) },
    { [preset.id]: preset.name },
  );
  const drop: Drop = opts.keepMine ? (k) => k in set || k === 'hud.style' : (k, l) => l === 'uiStyle' || l === 'uiPos';
  const p = mk(values, o, o1, drop, `${preset.kind === 'recipe' ? 'UI 成套' : 'UI 案例'}：${preset.name ?? nameOf(o1, preset.id)}`, Object.keys(direct).length ? direct : undefined);
  return withCleared(p, cleared(p, o, values, (l) => l === 'uiStyle' || l === 'uiPos'));
}

/**
 * 去掉成套 / 案例屏（再点一次已选中的芯片）：风格词层只留风格词 / 节日；它写过的键回到下一层；
 * 它改过的「我的游戏」放回套用前的样子（审查修复 5）。
 */
export function planDropBundle(values: Values, o: Origin, id: string, label: string): Plan {
  const words: Values = {};
  for (const k of [SELECTORS.keyword, SELECTORS.theme]) if (k in o.layers.words && o.uiWords.some((w) => PRESET.get(w)?.kind === (k === SELECTORS.keyword ? 'keyword' : 'theme'))) words[k] = o.layers.words[k];
  const gone = new Set(Object.keys(o.layers.words).filter((k) => !(k in words)));
  const stash = { ...o.stash };
  delete stash[`bundle:${id}`];
  const o1 = withOrigin(o, { uiWords: o.uiWords.filter((x) => x !== id), stash }, { words });
  const r = rebase(values, o, o1, (k) => gone.has(k));
  const out = putBack(r.values, o.stash[`bundle:${id}`]);
  return { values: out, origin: o1, changed: diffKeys(values, out), label };
}

export interface SceneInput {
  id: string;
  name?: string;
  /** 场景写的值：game.*、镜头键、uip.layout、cnt.pack、默认皮肤 hud.style、风格词…… */
  values: Values;
  /** 2D 场景锁定镜头 */
  rigLock?: boolean;
  /** 第一个界面（局内） */
  home?: { id: string; name?: string; values: Values } | null;
}

/** 来源换成这个场景（planScene 与首屏 freshOrigin 共用）：场景层、界面层换成场景的，风格词层里属于场景的键（布局、内容包、界面）交给场景 */
function withScene(o: Origin, sc: SceneInput): Origin {
  const home = sc.home ?? null;
  return withOrigin(
    o,
    { scene: sc.id, rigLock: !!sc.rigLock, screen: home?.id ?? null, home: home ? { id: home.id, values: uiPart(home.values) } : null },
    { scene: omit(sc.values, (k) => isViewKey(k) || PROFILE_KEYS.has(k)), screen: home ? uiPart(home.values) : {}, words: omit(o.layers.words, (k) => SCENE_UI_KEYS.has(k)) },
    { [sc.id]: sc.name, ...(home ? { [home.id]: home.name } : {}) },
  );
}

/**
 * 场景层换环境（整合修复 X#2：原来换环境只改 game.scene，从横版·洞穴换到山地后镜头还是侧视 0°、rigLock 还锁着，配方改不了镜头）：
 *   2D 目标（F 的锁定镜头环境）：镜头键换成它的 recommended（连同建议的雾 / 光），锁定镜头；
 *   2D → 3D：旧 2D 环境给的推荐值（镜头 + 雾 / 光，场景层里还是原样的）拿走；有 rig3d（场景自己在 3D 环境里的机位）就用它并锁定，
 *     否则镜头键清掉、不再锁定（配方的镜头键重新生效）；
 *   3D → 3D：镜头不动（场景的机位跟场景走，不跟环境）。
 * rewritten = 这次重写过的键：套用时这些键的手动改动一起清掉（跟着新环境走）。rigLock 不给 = 不变。
 */
export function envSceneLayer(scene: Values, prevEnv: string, nextEnv: string, rig3d: Values | null): { scene: Values; rigLock?: boolean; rewritten: Set<string> } {
  const out: Values = { ...scene, 'game.scene': nextEnv };
  const rewritten = new Set<string>(['game.scene']);
  if (prevEnv === nextEnv) return { scene: out, rewritten };
  const del = (k: string) => { delete out[k]; rewritten.add(k); };
  const prevLocked = !!prevEnv && isRigLocked(prevEnv), nextLocked = isRigLocked(nextEnv);
  if (prevLocked) for (const [k, v] of Object.entries(SCENE_MAP.get(prevEnv)?.recommended ?? {})) if (k in out && sameVal(k, out[k], v)) del(k);
  if (nextLocked) {
    for (const k of RIG_KEYS) del(k);
    for (const [k, v] of Object.entries(SCENE_MAP.get(nextEnv)?.recommended ?? {})) { out[k] = v; rewritten.add(k); }
    return { scene: out, rigLock: true, rewritten };
  }
  if (!prevLocked) return { scene: out, rewritten };
  for (const k of RIG_KEYS) del(k);
  if (rig3d) {
    for (const [k, v] of Object.entries(rig3d)) if (RIG_KEYS.has(k)) { out[k] = v; rewritten.add(k); }
    return { scene: out, rigLock: true, rewritten };
  }
  return { scene: out, rigLock: false, rewritten };
}

/**
 * 换场景：场景负责的键 + 元素位置改动清掉；配方、画面改动、皮肤、UI 样式改动保留（§4.2 末表）。
 * 风格词层里属于场景的键（布局、内容包、界面）交给新场景。keepMine 时只换场景负责的键。
 */
export function planScene(values: Values, o: Origin, sc: SceneInput, opts: PickOpts = {}): Plan {
  const o1 = withScene(o, sc);
  const drop: Drop = opts.keepMine ? (_k, l) => l === 'scene' : (_k, l) => l === 'scene' || l === 'uiPos';
  const p = mk(values, o, o1, drop, `换场景：${sc.name ?? sc.id}`);
  return opts.keepMine ? p : withCleared(p, cleared(p, o, values, (l) => l === 'uiPos'));
}

/**
 * 只换环境（场景的「换环境」、配方卡的「在 X 场景最好看 ›」、⌘K、学习库「环境」页）：环境记进场景层（不算改动），画面、UI 不动。
 * 镜头按目标环境重写（envSceneLayer，X#2）：进 2D 环境用它锁定的镜头；从 2D 回到 3D 时，回到场景自己的 3D 环境用场景的机位，
 * 别的 3D 环境清掉镜头键、不再锁定；3D 之间换镜头不动。换环境不改种子（布局随环境变，风格不变）
 */
export function planEnv(values: Values, o: Origin, env: { id: string; name?: string }): Plan {
  const prevEnv = String(o.layers.scene['game.scene'] ?? values['game.scene'] ?? '');
  const sc = gameScene(o.scene);
  const own3d = sc && sc.env === env.id && !isRigLocked(env.id) ? rigValues(sc.rig) : null;
  const r = envSceneLayer(o.layers.scene, prevEnv, env.id, own3d);
  const o1 = withOrigin(o, r.rigLock === undefined ? {} : { rigLock: r.rigLock }, { scene: r.scene });
  return mk(values, o, o1, (k) => r.rewritten.has(k), `换环境：${env.name ?? env.id}`);
}

/** 换界面（局内 / Boss / 背包……）：只改界面选择，清掉上一个界面写过的键 */
export function planScreen(values: Values, o: Origin, scr: { id: string; name?: string; values: Values }): Plan {
  const o1 = withOrigin(o, { screen: scr.id }, { screen: uiPart(scr.values), words: omit(o.layers.words, (k) => SCREEN_KEYS.has(k)) }, { [scr.id]: scr.name });
  return mk(values, o, o1, (k) => SCREEN_KEYS.has(k), `界面：${scr.name ?? scr.id}`);
}

export interface CompositeInput {
  label: string;
  /** 新来源（没写的沿用当前） */
  ids?: Partial<Omit<Origin, 'layers' | 'names'>>;
  layers?: Partial<OriginLayers>;
  names?: Record<string, string | undefined>;
  /** 清哪些层的手动改动：'all' = 全部、'art' = 画面、'ui' = UI 样式 + 位置、'none' = 都保留；也可以给函数 */
  drop: Drop | 'all' | 'art' | 'ui' | 'none';
  /** 直接写、不进基线的值（「我的游戏」） */
  direct?: Values;
}

/** 通用的整套套用（复刻 / 名作、案例近似等跨层的套用）：所有套用走同一个 rebase */
export function planComposite(values: Values, o: Origin, c: CompositeInput): Plan {
  const o1 = withOrigin(o, c.ids ?? {}, c.layers, c.names);
  const drop: Drop = typeof c.drop === 'function' ? c.drop
    : c.drop === 'all' ? () => true
      : c.drop === 'art' ? (_k, l) => l === 'art'
        : c.drop === 'ui' ? (_k, l) => l === 'uiStyle' || l === 'uiPos'
          : none;
  return mk(values, o, o1, drop, c.label, c.direct);
}

/* ---------------- 重置（§4.2 表） ---------------- */

const plan = (values: Values, o: Origin, r: { values: Values; changed: string[] }, label: string): Plan => ({ values: r.values, origin: o, changed: r.changed, label });
const doneLabel = (what: string, n: number) => (n > 0 ? `已重置${what}（清 ${n} 项）` : `已重置${what}`);

/** 一组键回到基线（行 ↺ / 组 ↺） */
export function planResetKeys(values: Values, o: Origin, keys: string[], label?: string): Plan {
  const r = resetKeysTo(values, o, keys.filter((k) => isModifiedKey(k, values, o)));
  return plan(values, o, r, label ?? (r.changed.length === 1 ? `回到原样：${getParam(r.changed[0])?.label ?? r.changed[0]}` : doneLabel('', r.changed.length)));
}

/** 画面 ▾ 回到「配方」原样：画面改动全部回到基线（配方、场景、UI 不动） */
export function planResetArt(values: Values, o: Origin): Plan {
  const r = resetKeysTo(values, o, modifiedIn(values, o, (l) => l === 'art'));
  return plan(values, o, r, doneLabel('画面', r.changed.length));
}

/** UI ▾ 清样式改动：所有 UI 样式改动（含 *@el、感觉、知识面板写入）回到基线；皮肤、元素位置、场景不动 */
export function planResetUiStyle(values: Values, o: Origin): Plan {
  const r = resetKeysTo(values, o, modifiedIn(values, o, (l) => l === 'uiStyle'));
  return plan(values, o, r, doneLabel(' UI 样式', r.changed.length));
}

/** UI ▾ 还原元素位置：位置 / 大小 / 显隐、实例 #2 #3、cnt.elements 回到基线 */
export function planResetUiPos(values: Values, o: Origin): Plan {
  const r = resetKeysTo(values, o, modifiedIn(values, o, (l) => l === 'uiPos'));
  const n = countLayers(values, o).uiPos;
  return plan(values, o, r, n ? `已还原元素位置（${n} 个元素）` : '已还原元素位置');
}

/**
 * 「已重置 UI（…）」括号里写清了什么（整合修复 U#22：原来清掉皮肤 + 一个元素的 3 个键只写「清 1 项」）：
 * 皮肤 / 风格词 / 成套（来源离开了场景默认）、N 项样式（按键数）、M 个元素（拖一次 + 缩放算一个元素）
 */
function uiDoneLabel(values: Values, o: Origin): string {
  const c = countLayers(values, o);
  const parts: string[] = [];
  if (uiPicked(o)) parts.push(o.skin || Object.keys(o.layers.skin).length ? '皮肤' : '风格词');
  if (c.uiStyle) parts.push(`${c.uiStyle} 项样式`);
  if (c.uiPos) parts.push(`${c.uiPos} 个元素`);
  return parts.length ? `已重置 UI（${parts.join(' + ')}）` : '已重置 UI';
}

/**
 * UI ▾ 回到场景默认 UI：皮肤、风格词清空，所有 UI 键回到场景给的选择器（没选场景 = 首屏默认）。
 * 成套改过的「我的游戏」放回套用前的样子；感觉芯片的暂存一起清掉（它们写的键都回到基线了）。
 */
export function planResetUiToScene(values: Values, o: Origin): Plan {
  const b = bundleOf(o);
  const o1 = withOrigin(o, { skin: null, uiWords: [], stash: {} }, { skin: {}, words: {} });
  const r = rebase(values, o, o1, (_k, l) => l === 'uiStyle' || l === 'uiPos');
  const out = b ? putBack(r.values, o.stash[`bundle:${b}`]) : r.values;
  const changed = diffKeys(values, out);
  return { values: out, origin: o1, changed, label: uiDoneLabel(values, o) };
}

/**
 * 场景 ▾ 回到场景原样：场景负责的键回到场景值，界面层整层回到第一个界面（局内；没选场景时 = 不选界面）。
 * 界面层写的键（名作一屏自己的部件、Boss 补的 Boss 条……）没被手动改过的都跟着回到局内（整合修复 U#2：名作「三选一」重置场景后
 *   原来留着那一屏的 78 个键——那是因为名作的这些键记在了场景层，见 state/replica.ts，现在记在界面层）。
 */
export function planResetScene(values: Values, o: Origin): Plan {
  const o1 = o.home ? withOrigin(o, { screen: o.home.id }, { screen: o.home.values }) : withOrigin(o, { screen: null }, { screen: {} });
  const r = rebase(values, o, o1, (_k, l) => l === 'scene');
  const n = countLayers(values, o).scene;
  const parts = [...(n ? [`清 ${n} 项`] : []), ...(screenPicked(o) ? [`回到${o.home ? nameOf(o, o.home.id) || '局内' : '局内'}`] : [])];
  return { values: r.values, origin: o1, changed: r.changed, label: parts.length ? `已重置场景（${parts.join(' · ')}）` : '已重置场景' };
}

/** 画面 ▾ 不用配方（重置用的说法） */
export const planDropRecipe = (values: Values, o: Origin) => planNoLook(values, o);

/** 全部重新开始：回到首屏状态（视图键回默认）；「我的游戏」保留 */
export function planResetAll(values: Values): Plan {
  const o1 = freshOrigin();
  const out = { ...baseValues(o1) };
  for (const k of PROFILE_KEYS) if (values[k] !== undefined) out[k] = values[k];
  return { values: out, origin: o1, changed: diffKeys(values, out), label: '全部重新开始' };
}

/** 一个元素（或它的实例）的所有键 */
export function elementKeys(values: Values, id: string): string[] {
  const base = id.replace(/#\d$/, '');
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const own = new RegExp(`^${esc}(#[23])?\\.`), scoped = new RegExp(`@${esc}(#[23])?$`);
  return Object.keys(values).filter((k) => own.test(k) || scoped.test(k));
}

const listOf = (v: Val | undefined): string[] => (v === undefined || v === 'auto' ? [] : String(v) === '' ? [] : String(v).split(','));

/**
 * 元素 ↺（§4.2）：这个元素（含实例 #2 #3）的位置 / 样式 / 实例键全部回到基线；cnt.elements 里删掉它的实例，它自己的去留回到基线。
 * baseList：基线的元素清单（cnt.elements 跟随布局 = auto 时由调用方按解析结果给，见 actions.resetElement）。
 * 审查修复 1：清单回到与基线一样时 cnt.elements 回到基线本身（跟随布局 = auto），不留一份显式清单；
 *   加回来的元素按基线里的位置插回去（画的先后不变）。审查修复 6：实例 #2 #3 从清单里删掉。
 */
export function planResetElement(values: Values, o: Origin, id: string, baseList?: string[]): Plan {
  const keys = elementKeys({ ...values, ...baseValues(o) }, id).filter((k) => isModifiedKey(k, values, o));
  const r = resetKeysTo(values, o, keys);
  const el = id.replace(/#\d$/, '');
  if (isModifiedKey('cnt.elements', values, o)) {
    const b = baseValues(o)['cnt.elements'];
    const bl = baseList ?? listOf(b);
    const cur = listOf(r.values['cnt.elements']).filter((x) => x.replace(/#\d$/, '') !== el);
    let next = cur;
    if (bl.includes(el)) {
      // 插回基线里的位置：排在基线里它前面那些元素的后面
      const at = bl.indexOf(el);
      const before = new Set(bl.slice(0, at));
      let i = 0;
      for (let j = 0; j < cur.length; j++) if (before.has(cur[j])) i = j + 1;
      next = [...cur.slice(0, i), el, ...cur.slice(i)];
    }
    const sameAsBase = next.length === bl.length && next.every((x, i) => x === bl[i]);
    if (sameAsBase) {
      if (b === undefined || (b === 'auto' && isDynamic('cnt.elements'))) delete r.values['cnt.elements'];
      else r.values['cnt.elements'] = b;
    } else r.values['cnt.elements'] = next.join(',');
    r.changed = diffKeys(values, r.values);
  }
  return plan(values, o, r, `还原元素：${elementLabel(el)}`);
}

/** 界面 ↺：这一屏的部件覆盖（cmp.*@tpl.<id>）回到基线 */
export function planResetScreenParts(values: Values, o: Origin, tplId: string): Plan {
  const suffix = `@${tplId.startsWith('tpl.') ? tplId : `tpl.${tplId}`}`;
  const keys = Object.keys({ ...values, ...baseValues(o) }).filter((k) => k.endsWith(suffix) && isModifiedKey(k, values, o));
  const tpl = suffix.slice(1), name = (PRESET.get(tpl)?.label ?? '这一屏').replace(/（.*?）/g, '');
  return plan(values, o, resetKeysTo(values, o, keys), `还原界面：${name}`);
}

/* ---------------- 感觉芯片（审查修复 23） ---------------- */

/**
 * 套一个 UI 感觉芯片：写成普通改动（带 •，可以重置）。它盖掉的手动值记进 stash，去掉芯片时放回去。
 */
export function planNudge(values: Values, o: Origin, n: { id: string; name?: string; set: Values }): Plan {
  const prev: Values = {}, wrote: Values = {};
  for (const [k, v] of Object.entries(n.set)) {
    if (sameVal(k, values[k], v)) continue;
    wrote[k] = v;
    if (isModifiedKey(k, values, o)) prev[k] = values[k];
  }
  const out: Values = { ...values, ...n.set };
  const key = `nudge:${n.id}`;
  let o1 = o;
  if (Object.keys(prev).length) o1 = withOrigin(o, { stash: { ...o.stash, [key]: { prev, wrote } } });
  else if (o.stash[key]) { const stash = { ...o.stash }; delete stash[key]; o1 = withOrigin(o, { stash }); }
  return { values: out, origin: o1, changed: diffKeys(values, out), label: `UI 感觉：${n.name ?? nameOf(o, n.id)}` };
}

/** 去掉感觉芯片：它写的键回到基线；套用前就手动改过的键放回用户的值（之后又改过的不动） */
export function planNudgeOff(values: Values, o: Origin, id: string, keys: string[], name?: string): Plan {
  const key = `nudge:${id}`;
  const st = o.stash[key];
  const out = resetKeysTo(values, o, keys.filter((k) => isModifiedKey(k, values, o))).values;
  let kept = 0;
  if (st) {
    for (const k of keys) {
      // 只放回「现在仍等于芯片写的值」的键（套完芯片又手动改过的，按现在的值回到基线）
      if (!(k in st.prev) || !sameVal(k, values[k], st.wrote[k])) continue;
      const pv = st.prev[k];
      if (pv === undefined) delete out[k]; else out[k] = pv;
      kept++;
    }
  }
  let o1 = o;
  if (st) { const stash = { ...o.stash }; delete stash[key]; o1 = withOrigin(o, { stash }); }
  return { values: out, origin: o1, changed: diffKeys(values, out), label: `去掉感觉：${name ?? nameOf(o, id)}${kept ? `（放回 ${kept} 项）` : ''}` };
}

/* ---------------- 直接写选择器（审查修复 16、17） ---------------- */

/** 元素的中文名（「生命」），找不到时用 id */
const EL_LABEL = new Map(((SPEC as unknown as { vocab?: { elements?: { id: string; label: string }[] } }).vocab?.elements ?? []).map((x) => [x.id, x.label]));
export const elementLabel = (id: string): string => EL_LABEL.get(id.replace(/#\d$/, '')) ?? id;

/** 界面选择里「跟着这一屏」的细节键：直接写时并进当前界面（不换界面） */
const SCREEN_DETAIL_KEYS: ReadonlySet<string> = new Set(['cnt.subtype', 'chk.demo', 'chk.simPose', 'chk.simTime']);
/** 选择器的取值 → 显示名 */
const optLabel = (k: string, v: Val) => { const p = getParam(k); return (p ? optionOf(p, v)?.label : undefined) ?? PRESET.get(String(v))?.label ?? String(v); };

/**
 * 直接写一个「选择」键（store.set 走这里）：老的、别的轨道的选择控件（左栏 / 顶栏场景弹窗 / ⌘K 的场景、画框下的界面胶片与皮肤行过渡版、
 * 右栏的皮肤 / 风格词下拉）都只会 set 一个键。这里把它们换成同一个合成函数里的套用，免得记成「手动改动」：
 *   game.scene → 只换环境（planEnv：记进场景层，「重置场景」不再把环境换回去）；
 *   hud.style → 换皮肤（planSkin：清皮肤负责的手动样式；取值 = 场景默认皮肤 → 回到场景默认；「不显示」只换皮肤、不清样式）；
 *   uip.keyword / uip.theme → 风格词 / 节日（planWord）；
 *   uip.screen / cnt.screen → 换界面（planScreen；回到第一个界面时记成它）；cnt.subtype / chk.demo / 钉帧 → 并进当前界面。
 * 其余键返回 null（照常算改动）。
 */
export function planSelectorWrite(values: Values, o: Origin, k: string, v: Val, opts: PickOpts = {}): Plan | null {
  if (k === 'game.scene') return planEnv(values, o, { id: String(v), name: optLabel(k, v) });
  if (k === HUD_STYLE_DEF.id) {
    const val = String(v);
    const sceneSkin = baseValues(withOrigin(o, { skin: null }, { skin: {} }))[k];
    if (sameVal(k, val, sceneSkin)) return o.skin || Object.keys(o.layers.skin).length ? planSkin(values, o, null, opts) : null;
    const pr = SKIN_PRESET_BY_VALUE.get(val);
    return planSkin(values, o, { id: pr?.id ?? null, value: val, name: pr?.label ?? optLabel(k, v) }, val === 'none' ? { keepMine: true } : opts);
  }
  if (k === SELECTORS.keyword || k === SELECTORS.theme) {
    const kind = k === SELECTORS.keyword ? 'keyword' : 'theme';
    const pr = PRESET.get(String(v));
    if (pr && pr.kind === kind) return planWord(values, o, kind, k, { id: pr.id, name: pr.label });
    const o0 = withOrigin(o, { uiWords: o.uiWords.filter((x) => PRESET.get(x)?.kind !== kind) }, { words: omit(o.layers.words, (x) => x === k) });
    if (sameVal(k, v, baseValues(o0)[k])) return planWord(values, o, kind, k, null);
    // 「不用」（none）这类不是预设的取值：也记进风格词层（不算手动改动）
    const o1 = withOrigin(o0, {}, { words: { ...o0.layers.words, [k]: v } });
    return mk(values, o, o1, (x) => x === k, `${kind === 'keyword' ? '风格词' : '节日'}：${optLabel(k, v)}`);
  }
  if (k === SELECTORS.screen || k === 'cnt.screen') {
    const home = o.home;
    if (home && k in home.values && sameVal(k, v, home.values[k])) return planScreen(values, o, { id: home.id, name: nameOf(o, home.id), values: home.values });
    const name = k === SELECTORS.screen && String(v) === 'auto' ? '局内' : optLabel(k, v);
    const noScreen = withOrigin(o, { screen: null }, { screen: {}, words: omit(o.layers.words, (x) => SCREEN_KEYS.has(x)) });
    if (!home && sameVal(k, v, baseValues(noScreen)[k])) return mk(values, o, noScreen, (x) => SCREEN_KEYS.has(x), `界面：${name}`);
    return planScreen(values, o, { id: String(v), name, values: { [k]: v } });
  }
  if (SCREEN_DETAIL_KEYS.has(k)) {
    const o1 = withOrigin(o, {}, { screen: { ...o.layers.screen, [k]: v }, words: omit(o.layers.words, (x) => x === k) });
    return mk(values, o, o1, (x) => x === k, `${getParam(k)?.label ?? k}：${optLabel(k, v)}`);
  }
  return null;
}

/** planSelectorWrite 认的键，按这个先后套（先换环境 / 皮肤，再风格词、界面）：planWrites 用 */
const SELECTOR_ORDER = ['game.scene', HUD_STYLE_DEF.id, SELECTORS.keyword, SELECTORS.theme, SELECTORS.screen, 'cnt.screen', ...SCREEN_DETAIL_KEYS];

/**
 * 一次写好几个键、合成一步（整合修复 X#6：随机探索原来用 setMany 直接写 hud.style / uip.keyword，随机到的皮肤被记成「样式改动」，
 * 来源里的皮肤不变、皮肤自带的样式也不清）：「选择」键走 planSelectorWrite（与 store.set 同一个入口），其余写成普通改动
 * （选择键先套，普通键后写：随机出来的样式叠在新皮肤上）。
 */
export function planWrites(values: Values, o: Origin, vals: Values, label: string, opts: PickOpts = {}): Plan {
  let v = values, org = o;
  const rest: Values = { ...vals };
  for (const k of SELECTOR_ORDER) {
    if (!(k in rest)) continue;
    const p = planSelectorWrite(v, org, k, rest[k], opts);
    if (!p) continue;
    v = p.values; org = p.origin;
    delete rest[k];
  }
  const out: Values = { ...v, ...rest };
  return { values: out, origin: org, changed: diffKeys(values, out), label };
}

/**
 * 场景锁定镜头时，配方给这个镜头键的值（和现在用的不同时；整合修复 F→A，§5.2「此配方建议 等距 30° · 套用」）：
 * 参数行据此显示一枚「配方建议」芯片。名作的镜头记在场景层（state/replica.ts），配方层里没有镜头键，所以名作里不出现。
 */
export function recipeRigValue(k: string, values: Values, o: Origin): Val | undefined {
  // 场景定的光照（收尾 10）也给芯片：配方写的时段被场景盖住时，一下就能换回配方的
  if (!o.rigLock || !(RIG_KEYS.has(k) || sceneLightWins(k, o))) return undefined;
  const v = o.layers.look[k];
  return v !== undefined && !sameVal(k, v, values[k]) ? v : undefined;
}

/**
 * 读存档时把「选择」键的差记进来源（审查修复 17：以前左栏 / 胶片 / 皮肤行直接写的环境、界面、皮肤被记成了手动改动，
 * 「重置场景」会把环境换回去）。只动来源，值不变。
 */
export function absorbSelectors(values: Values, o: Origin): Origin {
  let o1 = o;
  if (isModifiedKey('game.scene', values, o1)) o1 = withOrigin(o1, {}, { scene: { ...o1.layers.scene, 'game.scene': values['game.scene'] } });
  const hs = HUD_STYLE_DEF.id;
  if (isModifiedKey(hs, values, o1)) { const v = String(values[hs]); o1 = withOrigin(o1, { skin: skinIdOfValue(v) }, { skin: { ...o1.layers.skin, [hs]: v } }); }
  for (const k of SCREEN_KEYS) {
    if (!isModifiedKey(k, values, o1) || values[k] === undefined) continue;
    o1 = withOrigin(o1, k === SELECTORS.screen && !o1.screen ? { screen: String(values[k]) } : {}, { screen: { ...o1.layers.screen, [k]: values[k] }, words: omit(o1.layers.words, (x) => x === k) });
  }
  for (const k of [SELECTORS.keyword, SELECTORS.theme]) {
    if (!isModifiedKey(k, values, o1) || values[k] === undefined) continue;
    const kind = k === SELECTORS.keyword ? 'keyword' : 'theme';
    const pr = PRESET.get(String(values[k]));
    o1 = withOrigin(o1, pr?.kind === kind ? { uiWords: [...o1.uiWords.filter((x) => PRESET.get(x)?.kind !== kind), pr.id] } : {}, { words: { ...o1.layers.words, [k]: values[k] } });
  }
  return o1;
}

/** 把这个配方的真实取值记成画面层（兼容的 setBaseRecipe：已知配方用配方本身，不把当时的手动微调吞进基线，审查修复 2） */
export function withRecipeLook(o: Origin, id: string): Origin | null {
  const look = recipeLook(id);
  if (!look) return null;
  return withOrigin(o, { recipe: id, via: null, overlays: [] }, { look, overlays: {} }, { [id]: recipeName(id) });
}

/** 把当前的画面值当成「配方原样」（兼容旧调用：先 setMany 整套换，再 setBaseRecipe；只用于没有配方 / 认不出的配方） */
export function captureLook(values: Values, o: Origin, ref: string | null, name?: string, via?: string | null): Origin {
  const sceneArt = withOrigin(o, { recipe: null, overlays: [] }, { look: {}, overlays: {} });
  const b = baseValues(sceneArt);
  const look: Values = {};
  for (const [k, v] of Object.entries(values)) if (layerOfKey(k, o) === 'art' && !sameVal(k, v, b[k])) look[k] = v;
  return withOrigin(o, { recipe: ref, via: via ?? null, overlays: [] }, { look, overlays: {} }, ref ? { [ref]: name } : undefined);
}

/** 只看 UI 的状态：恢复旧收藏（没有来源）时，把皮肤记成来源，其余 UI 键算改动 */
export function captureSkin(values: Values, o: Origin): Origin {
  const v = String(values['hud.style'] ?? '');
  const id = skinIdOfValue(v);
  return withOrigin(o, { skin: id }, { skin: v ? { 'hud.style': v } : {} });
}
