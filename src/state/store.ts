import { create } from 'zustand';
import { STYLES } from '../content/styles.data';
import { allParams, defaultValues, getParam, isUiKey, isViewKey, labelOf, optionOf, validKey, withoutViewKeys } from '../dims';
import type { DimId, Val, Values } from '../dims/types';
import type { Diag } from '../engine/post/Pipeline';
import type { Issue } from '../hud/check/readability';
import { parseElementKey, parseOverrideKey, uiKeyLabel } from '../hud/sys/register';
import { absorbSelectors, captureLook, captureSkin, diffKeys, emptyOrigin, freshOrigin, freshValues, layerTitle, normalizeOrigin, planSelectorWrite, recipeIdOf, sameOrigin, styleIdOf, withOrigin, withRecipeLook, type Origin, type Plan } from './layers';
import { expand, expandSnap, loadHistory, readLast, readLegacy, readView, readWork, saveHistory, writeView, writeWork, type StoredSnap } from './persist';
import { keepMineDefault } from './viewHooks';

/*
 * 全局状态：当前实验（一组参数值 + 来源 origin）+ 撤销/重做 + A/B 槽 + 视图状态。
 * 轨道 A（docs/workbench-redesign.md §4）：
 *   - values 仍是扁平的；origin 记录来自哪个场景 / 配方 / 皮肤…（layers.ts），改动 = values 与基线的差；
 *   - 视图键（chk.* 检查工具，registry.isViewKey）还在 values 里，但不进撤销、不进工作副本、撤销时不动；
 *   - 工作副本每个标签页一份（sessionStorage），上次会话在 localStorage，撤销记录 50 步进 IndexedDB（persist.ts）；
 *   - 所有写入最后都走 commit()：一次写入 = 一步撤销（同一参数连续拖动合并）。
 * 诊断视图与冻结时间属于"观察方式"，不进入配方。
 */

/**
 * 导出 JSON 的格式版本（C 的 src/export/describe.ts 用）。
 * 2（整合修复 X#19）：导出带来源 origin、values 不含视图键。读 1 版（没有 origin）时的迁移在 restore()：
 *   画面按它记的 baseRecipe 当原样，皮肤 / 环境 / 界面 / 风格词这些直接写的选择键记进来源（absorbSelectors），其余算改动；视图键由 parseRecipe 跳过。
 */
export const SCHEMA_VERSION = 2;

export interface Snapshot {
  values: Values;
  label: string;
  ts: number;
  image?: string;
  /** 这一步时的来源（旧记录 / 演示算出来的 A 槽没有） */
  origin?: Origin;
  /** 兼容旧代码读：撤销记录里顺带记下的画面配方 / 风格起点（= origin 推出来的） */
  baseRecipe?: string | null;
  baseStyle?: string | null;
}

/** 左栏页签：前 7 个是画面模式的；ui* 三个只在 UI 模式出现（docs/t1-tool-knowledge.md） */
export type LeftTab = 'recipes' | 'feel' | 'scenes' | 'map' | 'cases' | 'glossary' | 'coverage' | 'uiPrinciples' | 'uiAtlas' | 'uiReplicas';
export type DialogKind = 'export' | 'check' | null;

/** UI 知识库里能"打开"的条目：原则（P-… 或品类篇 G-…）、风格家族 / 子族（fam.…）、复刻（rep.…） */
export type KnowKind = 'principle' | 'family' | 'replica';
export const KNOW_TAB: Record<KnowKind, LeftTab> = { principle: 'uiPrinciples', family: 'uiAtlas', replica: 'uiReplicas' };

/** 正在进行的原则演示（UI A/B：左 A、右 B）；视口上的演示条读它 */
export interface HudDemo {
  /** demo id（P-…#d0 / G-…#d1） */
  id: string;
  /** 所属的原则 / 品类篇 id（P-… / G-…） */
  owner: string;
  title: string;
  /** 对比时看哪里 */
  lookAt: string;
  kind: string;
  focusKeys: string[];
  /** 可切换的画面配方 id（recipes.ts），按顺序 */
  art: string[];
  /** 可切换的场景变体 */
  scenes: { id: string; label: string; set: Values }[];
  /** enter = 循环播放入场动画 */
  play: string | null;
  /** 单变量版（由另一个 demo 派生）：lookAt 换成原 demo 的，演示条另写"只换了下面这几项" */
  derived?: boolean;
  /** 演示要眯眼看（数据里 chk.squint = true 或"看哪里"提到眯眼）：开始时打开诊断"眯眼"，演示条给开关 */
  squint?: boolean;
  /** 演示用到色盲模拟（chk.cvd，或"看哪里"提到色盲）：演示条给一个色盲模拟下拉框 */
  cvd?: boolean;
}

/** 知识面板的"返回上一条"：从一条原则 / 家族 / 复刻点进另一条时，记下来的那一条 */
export interface KnowEntry { kind: KnowKind; id: string }

/** setMany 的替换范围：false = 叠加；true / 'art' = 画面整套换（保留 UI 键）；'ui' = UI 键集合整套换（保留画面）；'all' = 全部精确替换 */
export type ReplaceScope = boolean | 'art' | 'ui' | 'all';

/** 知识面板「试一下」的临时预览（§4.3）：叠在 values 上给引擎看，不存、不进撤销；采用后才写成普通改动 */
export interface Preview { set: Values; unset: string[]; label: string }

/** 打开页面时恢复了什么（栏条「已恢复上次：水彩 · 3 小时前 · 新实验」） */
export interface Restored { from: 'last' | 'legacy'; label: string; ts: number }

interface State {
  values: Values;
  /** 来源（layers.ts）：基线 = baseValues(origin)，改动 = values 与基线的差 */
  origin: Origin;
  history: Snapshot[];
  future: Snapshot[];
  lastCommit: { id: string; t: number } | null;
  activeDim: DimId;
  focus: string | null;
  leftTab: LeftTab;
  diag: Diag;
  /** 诊断视图是否也作用于游戏 UI 样本 */
  hudInDiag: boolean;
  /** 游戏 UI 按 CSS 像素 1:1 画（不随画面缩放，M12a-05）：只是查看开关，不进配方 */
  hudPixel1to1: boolean;
  setHudPixel1to1: (b: boolean) => void;
  /** UI 参数面板：选中的信息元素 */
  hudSel: string | null;
  /** 可读性检查（M8a）：问题列表、弹出面板、悬停的那一条 */
  readIssues: Issue[];
  readOpen: boolean;
  readHover: number | null;
  /** UI A/B（M5b）：左半边用 A 的参数画 UI */
  hudABOn: boolean;
  /** UI A/B 的分界（占视口宽度的比例，0 = 只看 B、1 = 只看 A、0.5 = 对半） */
  hudABSplit: number;
  setHudABSplit: (x: number) => void;
  frozen: boolean;
  slotA: Snapshot | null;
  compare: boolean;
  showAdvanced: boolean;
  lastChange: { label: string; ids: string[] } | null;
  /** 兼容旧代码：= recipeIdOf(origin)、styleIdOf(origin)（只读；写用 setBaseRecipe / setBaseStyle 或 actions.ts 的套用函数） */
  baseRecipe: string | null;
  baseStyle: string | null;
  refImage: { url: string; label: string } | null;
  caseId: string | null;
  sweepId: string | null;
  panel: 'random' | 'favorite' | 'board' | null;
  /** 知识面板的临时预览 */
  preview: Preview | null;
  /** 打开页面时恢复了上次会话 / 旧存档（栏条提示 6 秒，点「新实验」= 全部重新开始） */
  restored: Restored | null;
  dismissRestored: () => void;
  setSweep: (id: string | null) => void;
  setPanel: (p: 'random' | 'favorite' | 'board' | null) => void;
  dialog: DialogKind;
  setRefImage: (r: { url: string; label: string } | null) => void;
  setCaseId: (id: string | null) => void;
  /**
   * 兼容旧调用（先 setMany 整套换画面、再 setBaseRecipe）：把当前画面值记成这个配方的「原样」，画面改动归零。
   * 新代码用 actions.ts 的 applyRecipe / applyStyle / applyLook。
   */
  setBaseStyle: (id: string | null) => void;
  setDialog: (d: DialogKind) => void;
  setBaseRecipe: (id: string | null) => void;
  set: (id: string, v: Val) => void;
  setMany: (vals: Values, label: string, replace?: ReplaceScope) => void;
  /** 删掉这些键（UI 的覆盖键、元素实例键回到"跟随"） */
  unset: (ids: string[], label: string) => void;
  /** 一步完成"清掉一些键 + 写一些键"（UI 配方：先回跟随再套值），只占一条撤销记录 */
  patch: (set: Values, unset: string[], label: string) => void;
  /** 执行一个套用 / 重置方案（layers.ts 的 plan*）：值和来源一起换，只占一条撤销记录 */
  applyPlan: (p: Pick<Plan, 'values' | 'origin' | 'label'> & { changed?: string[] }) => void;
  /** 恢复一份存档（收藏、A 槽、导入）：scope = 'all' 精确替换（快照里没有的动态键丢掉） */
  restore: (x: { values: Values; origin?: unknown; baseRecipe?: string | null; baseStyle?: string | null }, label: string, scope?: 'art' | 'ui' | 'all') => void;
  undo: () => void;
  redo: () => void;
  /** 跳到撤销记录里的某一步（history 的下标；= 撤销 history.length - i 次） */
  jumpTo: (i: number) => void;
  setPreview: (p: Preview | null) => void;
  /** 采用预览：写成普通改动（一步撤销） */
  adoptPreview: () => void;
  setDim: (d: DimId) => void;
  setFocus: (id: string | null) => void;
  setLeftTab: (t: LeftTab) => void;
  setDiag: (d: Diag) => void;
  setHudInDiag: (b: boolean) => void;
  setHudSel: (id: string | null) => void;
  setReadIssues: (x: Issue[]) => void;
  setReadOpen: (b: boolean) => void;
  setReadHover: (i: number | null) => void;
  setHudABOn: (b: boolean) => void;
  /** UI 模式的左栏页签（与画面模式的 leftTab 分开记，切模式各自回到上次的页） */
  uiLeftTab: LeftTab;
  setUiLeftTab: (t: LeftTab) => void;
  /** 知识面板里选中的条目（null = 列表） */
  knowSel: Record<KnowKind, string | null>;
  /**
   * 打开原则 / 家族 / 复刻：切到 UI 模式、切左栏页签、选中条目（id = null 回到列表）。
   * how = push（默认）：左栏正停在另一条上时把它记进返回栈；replace：不记（上一条 / 下一条翻页）
   */
  openKnowledge: (kind: KnowKind, id: string | null, how?: 'push' | 'replace') => void;
  /** 返回栈（最近的在最后）；回到列表时清空 */
  knowStack: KnowEntry[];
  /** 回到返回栈顶的那一条 */
  knowBack: () => void;
  /** 请求 UI 参数面板跳到某个参数（UiPanel 监听：切页签、元素键选中元素、滚到那一行） */
  uiJump: { id: string; t: number } | null;
  jumpUiParam: (id: string) => void;
  /** 正在进行的原则演示 */
  hudDemo: HudDemo | null;
  setHudDemo: (d: HudDemo | null) => void;
  /** 直接写 A 槽（演示用：A 不是"当前参数的快照"，而是算出来的一组值） */
  setSlotA: (s: Snapshot | null) => void;
  setFrozen: (f: boolean) => void;
  saveA: (image?: string) => void;
  setCompare: (c: boolean) => void;
  swapToA: () => void;
  setShowAdvanced: (b: boolean) => void;
}

/** 内存里留多少步撤销（IndexedDB 只存最近 50 步） */
const HISTORY_MEM = 100;

/* ---------------- 读存档 ---------------- */

interface Initial { values: Values; origin: Origin; restored: Restored | null; fromSession: boolean }

function loadInitial(): Initial {
  // 存档里直接写的环境 / 界面 / 皮肤 / 风格词（老的选择控件只会 set 一个键）记进来源，不算手动改动（审查修复 17）
  const fix = (values: Values, origin: Origin) => ({ values, origin: absorbSelectors(values, origin) });
  const w = readWork();
  if (w) return { ...fix(expand(w.values), normalizeOrigin(w.origin)), restored: null, fromSession: true };
  const l = readLast();
  if (l) {
    const x = fix(expand(l.values), normalizeOrigin(l.origin));
    // 栏条「已恢复上次：水彩 · 3 小时前」写画面的名字，不写最后一步的标签（审查修复 12、26）
    return { ...x, restored: { from: 'last', label: layerTitle('art', x.values, x.origin), ts: l.ts }, fromSession: false };
  }
  const legacy = readLegacy();
  if (legacy) {
    // 旧存档：没有来源，按空来源处理（所有非默认值都算改动），栏条提示「新实验」
    const v = expand(legacy);
    if (diffKeys(v, defaultValues()).length) return { ...fix(v, emptyOrigin()), restored: { from: 'legacy', label: '旧版本的实验', ts: Date.now() }, fromSession: false };
  }
  return { values: freshValues(), origin: freshOrigin(), restored: null, fromSession: false };
}

/** 存进 gae.view.v1 的 store 字段（每个标签页一份） */
const VIEW_FIELDS = ['diag', 'hudInDiag', 'hudPixel1to1', 'frozen', 'activeDim', 'leftTab', 'uiLeftTab', 'showAdvanced', 'hudSel', 'slotA', 'refImage'] as const;
type ViewField = (typeof VIEW_FIELDS)[number];

let viewKeyList: string[] | null = null;
/** 登记过的视图键（chk.* 检查工具） */
export const viewKeys = (): string[] => (viewKeyList ??= allParams().map((p) => p.id).filter(isViewKey));

const init = loadInitial();
// 不是从本标签页的工作副本来的（上次会话 / 旧存档 / 全新）：马上记一份工作副本，刷新时就不再当成「新打开」（上次会话不动）
if (!init.fromSession) writeWork(init.values, init.origin, undefined, { last: false });
const savedView = readView();
{
  // 视图键（检查工具）按本标签页上次的样子放回去
  const chk = savedView?.chk;
  if (chk && typeof chk === 'object') for (const [k, x] of Object.entries(chk as Values)) if (isViewKey(k) && validKey(k)) init.values[k] = x;
}
const viewInit: Partial<Pick<State, ViewField>> = {};
if (savedView) for (const k of VIEW_FIELDS) if (k in savedView && savedView[k] !== undefined) (viewInit as Record<string, unknown>)[k] = savedView[k];

/* ---------------- 工具 ---------------- */

const derived = (o: Origin) => ({ baseRecipe: recipeIdOf(o), baseStyle: styleIdOf(o) });
const snap = (values: Values, label: string, origin: Origin): Snapshot => ({ values: withoutViewKeys(values), label, ts: Date.now(), origin, ...derived(origin) });
/** 撤销 / 重做回到一条记录：视图键保持现在的样子 */
const withView = (target: Values, cur: Values): Values => {
  const out = { ...target };
  for (const k of Object.keys(out)) if (isViewKey(k)) delete out[k];
  for (const k of viewKeys()) if (cur[k] !== undefined) out[k] = cur[k];
  return out;
};
/** 旧记录（没有 origin）回到它时：按它记的 baseRecipe 把画面记成原样 */
const originOfSnap = (x: Snapshot, cur: Origin): Origin => x.origin ?? (x.baseRecipe !== undefined ? captureLook(x.values, cur, x.baseRecipe ?? null) : cur);
const labelOfKey = (id: string) => getParam(id)?.label ?? uiKeyLabel(id) ?? id;
/** 一步改动的标签：「转角：直角」「暗部深度：0.62」（审查修复 21；值的部分最多 10 字） */
function stepLabel(id: string, v: Val): string {
  const def = getParam(id) ?? getParam(parseElementKey(id)?.param ?? '') ?? getParam(parseOverrideKey(id)?.param ?? '');
  let text: string;
  if (def?.kind === 'multi' && typeof v === 'string') text = v.split(',').filter(Boolean).map((x) => optionOf(def, x)?.label ?? x).join('、') || '无';
  else if (getParam(id)) text = labelOf(id, { [id]: v });
  else if (typeof v === 'number') text = `${+v.toFixed(2)}${def?.unit ?? ''}`;
  else text = (def ? optionOf(def, v)?.label : undefined) ?? String(v);
  if (text === 'auto') text = '跟随';
  if (text.length > 10) text = `${text.slice(0, 10)}…`;
  return `${labelOfKey(id)}：${text}`;
}
const toStored = (x: Snapshot): StoredSnap => ({ values: x.values, origin: x.origin, label: x.label, ts: x.ts });

export const useStore = create<State>((set, get) => {
  /**
   * 唯一的提交口：换值（和来源），推一步撤销，写存档。
   *   视图键的变化不推撤销、不写工作副本；
   *   mergeKey：同一参数 900ms 内的连续写入合并成一步撤销（拖滑块）；
   *   only：调用方确定只有这些键变了（省掉整表比较）。
   */
  const commit = (next: Values, label: string, o: { origin?: Origin; ids?: string[]; mergeKey?: string; only?: string[]; toast?: string } = {}): boolean => {
    const s = get();
    // 来源按结构比（审查修复 9）：套用算出一个新对象、内容却没变（再点「默认」皮肤、再点同一个界面）时当作没变，不推空撤销
    let origin = o.origin ?? s.origin;
    if (origin !== s.origin && sameOrigin(origin, s.origin)) origin = s.origin;
    const changed = o.only ?? diffKeys(s.values, next);
    const content = origin !== s.origin || changed.some((k) => !isViewKey(k));
    if (!content && !changed.length) return false;
    const now = Date.now();
    let { history, future, lastCommit } = s;
    if (content) {
      const merge = !!o.mergeKey && !!s.lastCommit && s.lastCommit.id === o.mergeKey && now - s.lastCommit.t < 900;
      if (!merge) history = [...s.history.slice(-(HISTORY_MEM - 1)), snap(s.values, label, s.origin)];
      // 合并的连续拖动：撤销列表里这一步的标签跟着最后的值走（「转角：直角」）
      else if (history.length) history = [...history.slice(0, -1), { ...history[history.length - 1], label }];
      future = [];
      lastCommit = o.mergeKey ? { id: o.mergeKey, t: now } : null;
    }
    // 来源变了但值没变时也换一个新对象：按 values 引用做缓存的地方（层级计数）跟着重算
    const values = next === s.values ? { ...next } : next;
    set({ values, origin, ...derived(origin), history, future, lastCommit, lastChange: { label: o.toast ?? label, ids: o.ids ?? changed } });
    if (content) {
      writeWork(values, origin, label);
      saveHistory(history.map(toStored), future.map(toStored));
    }
    return true;
  };

  /** 只换来源（兼容的 setBaseRecipe / setBaseStyle）：不推撤销，值换一个新对象 */
  const setOrigin = (origin: Origin) => {
    const s = get();
    if (sameOrigin(origin, s.origin)) return;
    const values = { ...s.values };
    set({ origin, values, ...derived(origin) });
    writeWork(values, origin);
  };

  const replaceBase = (s: State, scope: Exclude<ReplaceScope, false>): Values => {
    const d = defaultValues();
    if (scope === true || scope === 'art') {
      // 整套替换画面（画面配方）时保留游戏 UI 的值：UI 有自己的配方与预设，换画面不该把它清掉
      for (const [k, v] of Object.entries(s.values)) if (isUiKey(k)) d[k] = v;
      return d;
    }
    if (scope === 'ui') {
      // UI 键集合整套换：画面照旧，UI 键回到默认（动态键丢掉），视图键照旧
      for (const [k, v] of Object.entries(s.values)) if (!isUiKey(k) || isViewKey(k)) d[k] = v;
      return d;
    }
    for (const k of viewKeys()) if (s.values[k] !== undefined) d[k] = s.values[k];
    return d;
  };

  return {
    values: init.values,
    origin: init.origin,
    ...derived(init.origin),
    history: [],
    future: [],
    lastCommit: null,
    activeDim: 'world',
    focus: null,
    leftTab: 'recipes',
    diag: 'none',
    hudInDiag: false,
    hudPixel1to1: false,
    hudSel: null,
    readIssues: [],
    readOpen: false,
    readHover: null,
    hudABOn: false,
    hudABSplit: 0.5,
    setHudABSplit: (x) => set({ hudABSplit: Math.min(1, Math.max(0, x)) }),
    frozen: false,
    slotA: null,
    compare: false,
    showAdvanced: false,
    lastChange: null,
    refImage: null,
    caseId: null,
    sweepId: null,
    panel: null,
    preview: null,
    restored: init.restored,
    dismissRestored: () => set({ restored: null }),
    setSweep: (id) => set({ sweepId: id }),
    setPanel: (p) => set({ panel: p }),
    setRefImage: (r) => set({ refImage: r }),
    setCaseId: (id) => set({ caseId: id }),
    setBaseStyle: (id) => {
      const s = get();
      if (id) {
        const st = STYLES.find((x) => x.id === id);
        setOrigin(withOrigin(s.origin, { recipe: `atlas:${id}`, via: st?.recipe ?? s.origin.via }, undefined, { [`atlas:${id}`]: st?.name }));
      } else if (s.origin.recipe?.startsWith('atlas:')) setOrigin(withOrigin(s.origin, { recipe: s.origin.via }));
    },
    dialog: null,
    setDialog: (d) => set({ dialog: d }),
    setBaseRecipe: (id) => {
      const s = get();
      // 已知配方：画面层 = 配方本身（审查修复 2：不把当时还在的手动微调吞进「原样」，•↺ 和「重置画面」照样能撤掉它们）；
      // 没有配方 / 认不出的 id：才把当前画面值记成原样
      setOrigin((id ? withRecipeLook(s.origin, id) : null) ?? captureLook(s.values, s.origin, id));
    },

    set: (id, v) => {
      const s = get();
      if (s.values[id] === v) return;
      // 「选择」键（环境、皮肤、风格词、界面）走同一个合成函数里的套用，不记成手动改动（审查修复 16、17）
      const p = planSelectorWrite(s.values, s.origin, id, v, { keepMine: keepMineDefault() });
      if (p) {
        const values: Values = {};
        for (const [k, x] of Object.entries(p.values)) if (validKey(k)) values[k] = x;
        commit(values, p.label, { origin: p.origin, ids: p.changed, mergeKey: id });
        return;
      }
      commit({ ...s.values, [id]: v }, stepLabel(id, v), { mergeKey: id, ids: [id], only: [id] });
    },

    setMany: (vals, label, replace = false) => {
      const s = get();
      const values = replace ? replaceBase(s, replace) : { ...s.values };
      const ids: string[] = [];
      for (const [k, v] of Object.entries(vals)) {
        if (!validKey(k)) continue;
        if (values[k] !== v) ids.push(k);
        values[k] = v;
      }
      if (replace) for (const k of Object.keys(values)) if (s.values[k] !== values[k] && !ids.includes(k)) ids.push(k);
      if (replace) for (const k of Object.keys(s.values)) if (!(k in values) && !ids.includes(k)) ids.push(k);
      // 值没变时不再推一步空撤销（旧版会推：撤销列表里出现「什么都没改」的步骤）
      commit(values, label, { ids });
    },

    unset: (ids, label) => {
      const s = get();
      const hit = ids.filter((k) => k in s.values);
      if (!hit.length) return;
      const values = { ...s.values };
      for (const k of hit) {
        const p = getParam(k);
        if (p) values[k] = p.default;
        else delete values[k];
      }
      commit(values, label, { ids: hit });
    },

    patch: (setVals, unsetIds, label) => {
      const s = get();
      const values = { ...s.values };
      const ids: string[] = [];
      for (const k of unsetIds) {
        if (!(k in values)) continue;
        const p = getParam(k);
        if (p) values[k] = p.default;
        else delete values[k];
        ids.push(k);
      }
      for (const [k, v] of Object.entries(setVals)) {
        if (!validKey(k)) continue;
        if (values[k] !== v && !ids.includes(k)) ids.push(k);
        values[k] = v;
      }
      if (!ids.length) return;
      commit(values, label, { ids });
    },

    applyPlan: (p) => {
      const s = get();
      const values: Values = {};
      for (const [k, v] of Object.entries(p.values)) if (validKey(k)) values[k] = v;
      commit(values, p.label, { origin: p.origin, ids: p.changed ?? diffKeys(s.values, values) });
    },

    restore: (x, label, scope = 'all') => {
      const s = get();
      const values = replaceBase(s, scope);
      for (const [k, v] of Object.entries(x.values)) {
        if (!validKey(k) || isViewKey(k)) continue;
        if (scope === 'ui' && !isUiKey(k)) continue;
        if (scope === 'art' && isUiKey(k)) continue;
        values[k] = v;
      }
      let origin: Origin;
      if (x.origin) {
        const o = normalizeOrigin(x.origin);
        origin = scope === 'all' ? o
          : scope === 'art' ? withOrigin(s.origin, { recipe: o.recipe, via: o.via, overlays: o.overlays }, { look: o.layers.look, overlays: o.layers.overlays }, o.names)
            : withOrigin(s.origin, { skin: o.skin, uiWords: o.uiWords }, { skin: o.layers.skin, words: o.layers.words }, o.names);
      } else {
        // 旧收藏 / 演示 A 槽 / 1 版导出（SCHEMA_VERSION 迁移）：没有来源。画面按它记的配方当原样，皮肤记成来源，
        // 整套恢复时再把直接写的环境 / 界面 / 风格词记进来源（absorbSelectors：不算手动改动），其余 UI 键算改动
        const base = scope === 'all' ? emptyOrigin() : s.origin;
        origin = scope === 'ui' ? captureSkin(values, base) : scope === 'art' ? captureLook(values, base, x.baseRecipe ?? null) : captureSkin(values, captureLook(values, base, x.baseRecipe ?? null));
        if (x.baseStyle) origin = withOrigin(origin, { recipe: `atlas:${x.baseStyle}`, via: x.baseRecipe ?? null }, undefined, { [`atlas:${x.baseStyle}`]: STYLES.find((y) => y.id === x.baseStyle)?.name });
        if (scope === 'all') origin = absorbSelectors(values, origin);
      }
      commit(values, label, { origin });
    },

    undo: () => {
      const s = get();
      const prev = s.history[s.history.length - 1];
      if (!prev) return;
      const values = withView(prev.values, s.values);
      const origin = originOfSnap(prev, s.origin);
      const history = s.history.slice(0, -1);
      const future = [snap(s.values, prev.label, s.origin), ...s.future];
      set({ values, origin, ...derived(origin), history, future, lastCommit: null, lastChange: { label: `撤销：${prev.label}`, ids: [] } });
      writeWork(values, origin);
      saveHistory(history.map(toStored), future.map(toStored));
    },

    redo: () => {
      const s = get();
      const nxt = s.future[0];
      if (!nxt) return;
      const values = withView(nxt.values, s.values);
      const origin = originOfSnap(nxt, s.origin);
      const history = [...s.history, snap(s.values, nxt.label, s.origin)];
      const future = s.future.slice(1);
      set({ values, origin, ...derived(origin), future, history, lastCommit: null, lastChange: { label: `重做：${nxt.label}`, ids: [] } });
      writeWork(values, origin);
      saveHistory(history.map(toStored), future.map(toStored));
    },

    jumpTo: (i) => {
      const s = get();
      if (i < 0 || i >= s.history.length) return;
      // 栈 = [history…, 现在]；跳到第 i 个：它之后的每一步都进重做（标签跟着那一步走）
      const stack: Snapshot[] = [...s.history, snap(s.values, '', s.origin)];
      const target = stack[i];
      const future: Snapshot[] = [];
      for (let j = i; j < s.history.length; j++) future.push({ ...stack[j + 1], label: s.history[j].label });
      const values = withView(target.values, s.values);
      const origin = originOfSnap(target, s.origin);
      const history = s.history.slice(0, i);
      set({ values, origin, ...derived(origin), history, future: [...future, ...s.future], lastCommit: null, lastChange: { label: `回到：${s.history[i].label} 之前`, ids: [] } });
      writeWork(values, origin);
      saveHistory(history.map(toStored), [...future, ...s.future].map(toStored));
    },

    setPreview: (p) => set({ preview: p }),
    adoptPreview: () => {
      const p = get().preview;
      if (!p) return;
      set({ preview: null });
      get().patch(p.set, p.unset, p.label);
    },

    setDim: (d) => set({ activeDim: d }),
    setFocus: (id) => set({ focus: id }),
    setLeftTab: (t) => set({ leftTab: t }),
    setDiag: (d) => set({ diag: d }),
    setHudInDiag: (b) => set({ hudInDiag: b }),
    setHudPixel1to1: (b) => set({ hudPixel1to1: b }),
    setHudSel: (id) => set({ hudSel: id }),
    setReadIssues: (x) => set({ readIssues: x }),
    setReadOpen: (b) => set({ readOpen: b }),
    setReadHover: (i) => set({ readHover: i }),
    setHudABOn: (b) => set({ hudABOn: b }),
    uiLeftTab: 'uiPrinciples',
    setUiLeftTab: (t) => set({ uiLeftTab: t }),
    knowSel: { principle: null, family: null, replica: null },
    openKnowledge: (kind, id, how = 'push') => {
      const s = get();
      const cur = currentKnow(s);
      // 返回栈：回到列表时清空；从一条点进另一条时记下原来那一条（翻页、重复点同一条不记）
      let knowStack = s.knowStack;
      if (id === null) knowStack = [];
      else if (how === 'push' && cur && !(cur.kind === kind && cur.id === id)) knowStack = [...s.knowStack.slice(-29), cur];
      set({
        ...(s.activeDim === 'hud' ? {} : { activeDim: 'hud' as DimId }),
        uiLeftTab: KNOW_TAB[kind],
        knowSel: { ...s.knowSel, [kind]: id },
        knowStack,
      });
    },
    knowStack: [],
    knowBack: () => {
      const s = get();
      const top = s.knowStack[s.knowStack.length - 1];
      if (!top) return;
      set({
        ...(s.activeDim === 'hud' ? {} : { activeDim: 'hud' as DimId }),
        uiLeftTab: KNOW_TAB[top.kind],
        knowSel: { ...s.knowSel, [top.kind]: top.id },
        knowStack: s.knowStack.slice(0, -1),
      });
    },
    uiJump: null,
    jumpUiParam: (id) => set({ focus: id, uiJump: { id, t: Date.now() }, ...(get().activeDim === 'hud' ? {} : { activeDim: 'hud' as DimId }) }),
    hudDemo: null,
    setHudDemo: (d) => set({ hudDemo: d }),
    setSlotA: (a) => set({ slotA: a }),
    setFrozen: (f) => set({ frozen: f }),
    saveA: (image) => { const s = get(); set({ slotA: { ...snap(s.values, 'A', s.origin), image } }); },
    setCompare: (c) => set({ compare: c }),
    swapToA: () => {
      const s = get();
      const a = s.slotA;
      if (!a) return;
      const cur = snap(s.values, 'A', s.origin);
      get().restore(a, '换成 A', 'all');
      set({ slotA: { ...cur, image: undefined } });
    },
    setShowAdvanced: (b) => set({ showAdvanced: b }),
    ...viewInit,
  };
});

/** 左栏现在打开着哪一条知识（UI 模式、知识页签、选中了条目） */
function currentKnow(s: { activeDim: DimId; uiLeftTab: LeftTab; knowSel: Record<KnowKind, string | null> }): KnowEntry | null {
  if (s.activeDim !== 'hud') return null;
  const kind = (Object.keys(KNOW_TAB) as KnowKind[]).find((x) => KNOW_TAB[x] === s.uiLeftTab);
  const id = kind ? s.knowSel[kind] : null;
  return kind && id ? { kind, id } : null;
}

/* ---------------- 视图状态写回 sessionStorage ---------------- */

function viewSnapshot(s: State): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of VIEW_FIELDS) o[k] = s[k];
  const chk: Values = {};
  for (const k of viewKeys()) if (s.values[k] !== undefined && s.values[k] !== getParam(k)?.default) chk[k] = s.values[k];
  o.chk = chk;
  return o;
}
useStore.subscribe((s, p) => {
  if (VIEW_FIELDS.some((k) => s[k] !== p[k]) || (s.values !== p.values && viewKeys().some((k) => s.values[k] !== p.values[k]))) writeView(viewSnapshot(s));
});

/* ---------------- 刷新后接上撤销记录（IndexedDB，异步） ---------------- */

if (init.fromSession) {
  loadHistory().then((h) => {
    if (!h) return;
    const s = useStore.getState();
    const toSnap = (x: StoredSnap): Snapshot => {
      const e = expandSnap(x);
      const origin = e.origin ? normalizeOrigin(e.origin) : undefined;
      return { values: e.values, label: e.label, ts: e.ts, origin, ...(origin ? derived(origin) : {}) };
    };
    const history = [...h.history.map(toSnap), ...s.history].slice(-HISTORY_MEM);
    const future = s.history.length ? s.future : h.future.map(toSnap);
    useStore.setState({ history, future });
  });
}
