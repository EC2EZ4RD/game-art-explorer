/// <reference types="vite/client" />
import { defaultValues, getParam, isUiKey, validKey } from '../dims/registry';
import type { Val, Values } from '../dims/types';
import { GENRE_PACK, LAYOUT_PACK } from '../hud/content';
import { manualUiKeys, type Patch } from '../hud/sys/apply';
import { HUD_STYLE_DEF, SELECTORS, skinValueOf } from '../hud/sys/register';
import { paramOfKey } from '../hud/sys/resolve';
import { PRESET } from '../hud/sys/spec';
import { RECIPE_MAP } from './recipes';

/*
 * UI 知识库（docs/t1-tool-knowledge.md）：类型、懒加载、纯索引与"套用"补丁。
 *   数据：uiPrinciples.json（K2 设计原则 85 条 + 23 个品类篇 + 204 条文献）、uiStyleFamilies.json（K1 风格图谱：12 门类 / 93 家族 / 109 子族）、
 *         uiRefs.json（452 张参考卡）、replicas/*.json（R5 复刻库，一款游戏一份，以后会有几百份）。
 *   懒加载：四份数据都很大（合计约 5 MB），一律走 import.meta.glob 的懒加载，不进启动包；
 *           用 glob 而不是 import('./x.json') 还有一个好处：TypeScript 不去推断几 MB JSON 的类型（类型在下面手写）。
 *   纯函数：索引与补丁都不依赖 React / store，数据当参数传进来，可以在 tsx 里单测（scripts/test-knowledge.ts）。
 *   补丁（KPatch）交给 store.patch(set, unset, label) 执行，一步可撤销；值已经换成 Values 的存法（多选 = 逗号串，渐变 = 逗号色标）。
 *   参考截图（qa/refs-cache/**）只在本地开发服务器上显示：refImageUrl 在生产构建里返回 null，界面改显示 REF_DEV_ONLY_NOTE。
 */

/* ======================================================================
 * 数据类型（字段名与 JSON 一致；只写界面会用到的字段，其余用索引签名兜住）
 * ====================================================================== */

/** JSON 里的参数向量：值是调研词表的原始写法（多选是数组） */
export type RawParams = Record<string, unknown>;

/* ---------- K2 设计原则（uiPrinciples.json） ---------- */

export interface KArea { id: string; title: string; summary: string; principles: string[] }
export interface KCoreRule { id: string; title: string; text: string; principles: string[]; evidence: string[] }
export interface KApproach {
  /** P-…#a1 */
  id: string;
  name: string;
  params: RawParams;
  whenToUse: string;
  cost: string;
  /** 参考卡 id（steam:… / gameui:… / iig:…），不一定都在 uiRefs.json 里 */
  examples: string[];
  /** 探索台画不全时的说明 */
  renderNote?: string;
}
export interface KAntiPattern { id: string; desc: string; examples: string[]; reviewEvidence?: string; basis?: string }
export interface KSourceRef { title: string; url: string; point: string; ref: string }
export interface KStyleVariant { family: string; name: string; group: string; skin?: string | null; how: string; atlas?: string }
export interface KSceneVariant { id: string; label: string; set: RawParams }
export interface KDemo {
  /** P-…#d0 / G-…#d1 */
  id: string;
  title: string;
  /** isolate 单变量 / spectrum 整套对照 / note 只有文字（没有 base/a/b） */
  kind: 'isolate' | 'spectrum' | 'note' | string;
  lookAt: string;
  focusKeys?: string[];
  /** 固定基线皮肤（皮肤预设 id，skin.greybox …） */
  skin?: string | null;
  base?: RawParams;
  a?: RawParams;
  b?: RawParams;
  /** 画面配方 id（recipes.ts），按顺序切换 */
  art?: string[] | null;
  /** 场景 + 美术参数，按顺序切换 */
  scene?: KSceneVariant[] | null;
  /** enter = 循环播放入场 */
  play?: string | null;
  normalizeNotes?: string[];
  derivedFrom?: string;
  notYetRendered?: unknown;
}
export interface KPrinciple {
  id: string;
  area: string;
  title: string;
  /** JSON 目前没有这个字段，用 principleOneLiner() 取 */
  oneLiner?: string;
  problem: string;
  approaches: KApproach[];
  rules: string[];
  antiPatterns: KAntiPattern[];
  /** 品类篇的 genre 键（action / strategy / mobile …） */
  genres: string[];
  genreNotes: string[];
  styleVariants: KStyleVariant[];
  atlasFamilies?: string[];
  sources: KSourceRef[];
  demo: KDemo;
  extraDemos?: KDemo[];
  related: string[];
  mergedFrom: string[];
  sourceTopics: string[];
  universal?: boolean;
}
export interface KGenreChapter {
  /** 品类键（explore / action / … / mmo）；品类篇自己的 id 写作 G-<genre> */
  genre: string;
  label: string;
  packs: string[];
  cards: number;
  summary: string;
  subgenres: string[];
  coreQuestions: string[];
  hudOrganization: { pattern: string; params: RawParams; share?: string; examples: string[] }[];
  elements: { element: string; forms: string[]; anchors?: string[]; why: string }[];
  screens: { screen: string; conventions: string; examples: string[] }[];
  styleTendencies: { familyId: string; family: string; group: string; count: number; why: string; cards: string[] }[];
  exemplars: { card: string; why: string; familyId?: string; evidence?: string }[];
  pitfalls: KAntiPattern[];
  demos: KDemo[];
  contentPack?: unknown;
  paramGaps: { need: string }[];
  relatedPrinciples: string[];
  universalPrinciples: string[];
  evidenceNote?: string;
  keyFindings?: unknown;
  [extra: string]: unknown;
}
export interface KSource {
  id: string;
  title: string;
  author?: string;
  year?: number | string;
  url: string;
  type: string;
  topics: string[];
  ideas: string[];
  games?: unknown[];
  citedBy: string[];
  verified?: unknown;
  note?: string;
}
export interface KParamIndexEntry { principle?: string; genre?: string; ref: string; role: 'approach' | 'demo' | 'rule' | 'genreDemo' | 'rationale' | string }
export interface KParamRationale { note: string; noRationale?: boolean; principles?: string[] }
export interface KFamilyIndexRow { familyId: string; name: string; group: string; groupName: string; skin: string | null; cardCount: number; needsRefs: boolean; topPrinciples: string[]; allPrinciples: string[] }
export interface PrinciplesFile {
  version: number;
  generated: string;
  note: string;
  areas: KArea[];
  core: KCoreRule[];
  principles: KPrinciple[];
  genres: KGenreChapter[];
  styleFamilies: KFamilyIndexRow[];
  paramIndex: Record<string, KParamIndexEntry[]>;
  paramRationale: Record<string, KParamRationale>;
  paramGaps: { id: string; need: string; proposal: string; from?: string[] }[];
  sources: KSource[];
  [extra: string]: unknown;
}

/* ---------- K1 风格图谱（uiStyleFamilies.json） ---------- */

export interface KAxis { id: string; name: string; question: string; grammarKey: string; params: string[] }
export interface KGroup { id: string; name: string; description: string; families: string[]; cardCount: number; seenCardCount: number; crossCount: number }
export interface KExemplar { card: string; name: string; why: string; evidence?: string; cross?: boolean; homeFamily?: string; note?: string }
export interface KArtPairing { artStyle: string; artStyleId: string; artStyleCode: string; relation: 'sameMedium' | 'neutral' | 'contrast' | string; why: string; recipeId?: string }
export interface KFailure { id: string; desc: string; evidence: string[]; basis: string; categories?: string[]; reviewEvidence?: { card: string; name: string; category: string; count: number }[]; note?: string; background?: string }
export interface KFamilyVariant { id: string; name: string; diff: string; cards: string[]; params: RawParams; paramsBasis?: string; context?: unknown; kind?: string; kindNote?: string }
export interface KPreview { params?: RawParams; hud?: { params: RawParams }; dwell?: { params: RawParams } }
export interface KFamily {
  /** fam.… */
  id: string;
  name: string;
  /** 家族有，子族没有 */
  oneLiner?: string;
  /** null = 家族；否则是子族，parent 指向家族 */
  parent: string | null;
  group: string;
  /** visual / visibilityStrategy（零 HUD、情境渐显：可以叠在任何视觉家族上） */
  kind?: string;
  /** 皮肤预设 id（skin.…）；null 时用 baseSkin */
  skin: string | null;
  baseSkin: string;
  status: string;
  priority?: string;
  confidence: string;
  evidenceConfidence: string;
  grammarBasis: string;
  definition: string;
  whenToUse?: string;
  avoidWhen?: string;
  distinctFrom?: string;
  settings?: string[];
  moods?: string[];
  relatedPrinciples?: string[];
  /** 10 轴语法：键 = axes[].grammarKey（shape / line / surface / color / type / material / ornament / icon / motion / layout） */
  grammar: Record<string, string>;
  /** 风格键（皮肤 + 关键词能拥有的键，加组件 / 状态 / 显隐键）；子族只写和父族不同的 */
  params: RawParams;
  /** 情境与版式的建议值（ctx / cnt / lay / flow / el 实例键）——只在"同时套用版式"时写 */
  context?: { params: RawParams };
  /** 预先合成的结果（皮肤 + 关键词 → 父族 → 子族）；只读参考，套用走 params */
  effectiveParams: RawParams;
  hudLite?: { channels: string[]; note: string; params: RawParams };
  /** 灰盒 → 本家族的 5 步（文字） */
  convert?: string[] | null;
  convertParams?: { step: number; params: RawParams }[];
  convertBasis?: string;
  preview: KPreview;
  artPairing: KArtPairing[];
  genres: { genre: string; count: number; why: string; subgenre?: string }[];
  genreCounts: Record<string, number>;
  screenCounts: Record<string, number>;
  exemplars: KExemplar[];
  variants: KFamilyVariant[];
  failureModes: KFailure[];
  skinGap: string;
  /** resolvedBy / partialBy（中期审查修复 ⑱）：已经能画 / 能画一部分的缺口——「M12b-xx（参数 = 取值、…）」，与复刻缺口同一写法 */
  paramGaps: { text: string; ref: string; alsoRefs?: string[]; resolvedBy?: string; partialBy?: string }[];
  identityGap?: { ref: string; element: string; resolvedBy?: string; partialBy?: string } | null;
  cardCount: number;
  seenCardCount: number;
  describedCardCount: number;
  noCards: boolean;
  /** true = 待补参考 */
  needsRefs: boolean;
  cards: string[];
  refsWanted?: { name: string; appid: number | null; why: string; from?: string; appidChecked?: boolean }[] | null;
  [extra: string]: unknown;
}
export interface KAssignment { family: string; evidence: 'seen' | 'described' | string; excluded?: string; excludedWhy?: string; subgenre?: string; menuFamily?: string; menuBasis?: string }
export interface FamiliesFile {
  version: number;
  generated: string;
  source: string;
  notes: string[];
  counts: Record<string, number>;
  axes: KAxis[];
  groups: KGroup[];
  families: KFamily[];
  /** 卡 id → 主归属（唯一真相；uiRefs.json 的 card.family 是旧分类） */
  assignments: Record<string, KAssignment>;
  legacyFamilyMap: Record<string, string[]>;
  genreTendencies: Record<string, { familyId: string; count: number; why: string }[]>;
  principleIndex: Record<string, string[]>;
  settingIndex: Record<string, string[]>;
  moodIndex: Record<string, string[]>;
  [extra: string]: unknown;
}

/* ---------- 参考卡（uiRefs.json） ---------- */

export interface KCard {
  /** steam:368230 / gameui:6750 / iig:world-of-warcraft */
  id: string;
  name: string;
  batch: string;
  genre: string;
  evidence: string;
  appid: number | null;
  links: Record<string, string>;
  /** 旧分类名；新家族看 FamiliesFile.assignments */
  family: string;
  screens: string[];
  params: RawParams;
  note: string;
  /** 本地截图（项目根目录下的相对路径，qa/refs-cache/…）——只在开发服务器上能看 */
  shots: string[];
  [extra: string]: unknown;
}
export interface RefsFile { source: string; cards: KCard[] }

/* ---------- R5 复刻库（replicas/*.json，docs/ui-replicas.md） ---------- */

/** 复刻每屏的静帧钉法（M12c-14，docs/ui-replicas.md）：pose = chk.simPose；demo + at = 把 chk.demo 的演示钉在第 at 秒（chk.simTime） */
export interface KReplicaSim { pose?: string; demo?: string; at?: number }
export interface KReplicaScreen { key: string; ref: string | null; values: RawParams; sim?: KReplicaSim }
/**
 * 复刻屏的钉帧参数（终期审查修复 ⑪：原来只在 main.tsx 里，复刻面板的套用（replicaScreenPatch）不套 sim）：sim 写成 chk.simPose / chk.demo / chk.simTime；
 * at 给了时换掉 sim.at（replicaStrip 逐帧钉）；没写 sim 时什么都不加
 */
export const replicaSimValues = (sim: KReplicaSim | undefined, at?: number): Values => ({
  ...(sim?.pose ? { 'chk.simPose': sim.pose } : {}),
  ...(sim?.demo ? { 'chk.demo': sim.demo } : {}),
  ...(at !== undefined ? { 'chk.simTime': at } : sim?.at !== undefined ? { 'chk.simTime': sim.at } : {}),
});
/**
 * 缺口的类型（第二轮起每条都写，docs/ui-replicas.md）：渲染 bug / 版式引擎 / 缺参数 / 缺取值 / 新画法 / 复合件 / 内容 / 素材 / 世界空间 / 动效。
 * scripts/refs/check-param-vectors.py 用同一张表校验。
 */
export const GAP_KINDS = ['renderBug', 'layoutEngine', 'missingParam', 'missingOption', 'newDrawing', 'composite', 'content', 'asset', 'worldSpace', 'motion'] as const;
export type KGapKind = (typeof GAP_KINDS)[number];
export const GAP_KIND_LABEL: Record<KGapKind, string> = {
  renderBug: '渲染 bug', layoutEngine: '版式引擎', missingParam: '缺参数', missingOption: '缺取值', newDrawing: '新画法',
  composite: '复合件', content: '内容', asset: '素材', worldSpace: '世界空间', motion: '动效',
};
/** screen：一屏的 key；整套共有的写 all（旧写法 global / * 同义）；几屏共有的写 "a / b / c" */
export interface KReplicaGap { screen: string; what: string; severity: 'high' | 'medium' | 'low' | string; proposal: string; kind?: KGapKind | string }
export interface KReplicaScore { layout?: number; elements?: number; palette?: number; type?: number; shape?: number; density?: number; overall?: number; round?: number }
export interface KReplica {
  /** rep.<英文短名> */
  id: string;
  name: string;
  card: string;
  genre: string;
  /** 风格家族 id（fam.…）；图谱还没有时是中文家族名 */
  family: string;
  pack?: string;
  art?: { recipe?: string; scene?: string; values?: RawParams } | null;
  base: RawParams;
  screens: KReplicaScreen[];
  gaps: KReplicaGap[];
  /** 屏 key → 评分（0–10，只评 UI 层）：第一轮是单个对象，第二轮起是逐轮数组 [第 1 轮, 第 2 轮, …]（最后一项是当前分） */
  scores?: Record<string, KReplicaScore | KReplicaScore[]> | null;
  notes?: string;
  /** 每轮对照之后改了什么（一条一句） */
  revisions?: string[];
  /** 第 N 轮对照时和参考的差异：屏 key → 差异列表（round1Diffs、round2Diffs……） */
  round1Diffs?: Record<string, string[]>;
  round2Diffs?: Record<string, string[]>;
  [extra: string]: unknown;
}

/* ======================================================================
 * 懒加载
 * ====================================================================== */

/** 开发服务器（import.meta.env.DEV）；tsx 单测里 import.meta.env 不存在 = 否 */
export const IS_DEV = !!import.meta.env?.DEV;
const LOCAL = typeof __GAE_LOCAL_REFS__ === 'undefined' ? null : __GAE_LOCAL_REFS__;
/** 能显示 UI 参考卡截图：开发服务器上，且本地抓过截图（qa/refs-cache，不入库） */
export const LOCAL_REFS = IS_DEV && !!LOCAL?.refs;
/** 能显示复刻库的整帧渲染（qa/replicas，不入库） */
export const LOCAL_REPLICA_SHOTS = IS_DEV && !!LOCAL?.replicas;
export const REF_DEV_ONLY_NOTE = '参考截图不随项目发布，本地抓取后在开发环境显示';

const firstOf = <T>(mods: Record<string, () => Promise<T>>, what: string): Promise<T> => {
  const f = Object.values(mods)[0];
  return f ? f() : Promise.reject(new Error(`找不到 ${what}`));
};

let pPrinciples: Promise<PrinciplesFile> | null = null;
let pFamilies: Promise<FamiliesFile> | null = null;
let pRefs: Promise<RefsFile> | null = null;
/* import.meta.glob 写在函数里：Vite 照样静态展开；tsx 单测不调用加载器就不会执行到它 */
export const loadPrinciples = () => (pPrinciples ??= firstOf(import.meta.glob<PrinciplesFile>('./uiPrinciples.json', { import: 'default' }), 'uiPrinciples.json'));
export const loadFamilies = () => (pFamilies ??= firstOf(import.meta.glob<FamiliesFile>('./uiStyleFamilies.json', { import: 'default' }), 'uiStyleFamilies.json'));
export const loadRefs = () => (pRefs ??= firstOf(import.meta.glob<RefsFile>('./uiRefs.json', { import: 'default' }), 'uiRefs.json'));

let knowledge: UiKnowledge | null = null;
let pKnowledge: Promise<UiKnowledge> | null = null;
/** 原则 + 图谱 + 参考卡，连同全部索引（只建一次） */
export function loadUiKnowledge(): Promise<UiKnowledge> {
  pKnowledge ??= Promise.all([loadPrinciples(), loadFamilies(), loadRefs()]).then(([p, f, r]) => (knowledge = buildUiKnowledge(p, f, r)));
  // 失败后允许重试
  pKnowledge.catch(() => { pKnowledge = null; pPrinciples = null; pFamilies = null; pRefs = null; });
  return pKnowledge;
}
/** 已经加载好就同步返回，否则 null（不触发加载） */
export const peekUiKnowledge = () => knowledge;

type ReplicaLoader = () => Promise<KReplica>;
const idFromPath = (p: string) => p.replace(/^.*\/([^/]+)\.json$/, '$1');
let replicaLoaders: Map<string, ReplicaLoader> | null = null;
/** 复刻 id → 懒加载函数（glob 只展开一次；几百份时按 id 直接查，不再逐个扫路径） */
const replicaMods = (): Map<string, ReplicaLoader> =>
  (replicaLoaders ??= new Map(Object.entries(import.meta.glob<KReplica>('./replicas/*.json', { import: 'default' })).map(([p, f]) => [idFromPath(p), f])));
/** 复刻库里有哪些 id（只看文件名，不加载内容） */
export const replicaIds = (): string[] => [...replicaMods().keys()].sort();
const replicaCache = new Map<string, Promise<KReplica>>();
export function loadReplica(id: string): Promise<KReplica | null> {
  const load = replicaMods().get(id);
  if (!load) return Promise.resolve(null);
  let pr = replicaCache.get(id);
  if (!pr) { pr = load(); replicaCache.set(id, pr); pr.catch(() => replicaCache.delete(id)); }
  return pr;
}
/** 一份复刻文件能不能用（坏文件跳过，不让整个列表报错） */
const isReplica = (x: unknown): x is KReplica => !!x && typeof x === 'object' && typeof (x as KReplica).id === 'string' && Array.isArray((x as KReplica).screens);
const replicaName = (r: KReplica) => (typeof r.name === 'string' && r.name ? r.name : r.id);
let replicasAll: KReplica[] | null = null;
let pReplicas: Promise<KReplica[]> | null = null;
/**
 * 全部复刻（并行加载，按名字排序）。几百份时每份一个小块；真到上千份再加生成的索引文件。
 * 一份加载失败或格式不对只跳过它（开发环境打印出来），不让整个复刻库报错。
 */
export function loadReplicas(): Promise<KReplica[]> {
  pReplicas ??= Promise.allSettled(replicaIds().map(loadReplica)).then((rs) => {
    const ids = replicaIds();
    const ok: KReplica[] = [];
    rs.forEach((r, i) => {
      if (r.status === 'fulfilled' && isReplica(r.value)) ok.push(r.value);
      else if (IS_DEV) console.warn(`[复刻库] ${ids[i]} 没加载上，已跳过：`, r.status === 'rejected' ? r.reason : '文件格式不对（缺 id 或 screens）');
    });
    return (replicasAll = ok.sort((a, b) => replicaName(a).localeCompare(replicaName(b))));
  });
  pReplicas.catch(() => { pReplicas = null; });
  return pReplicas;
}
export const peekReplicas = () => replicasAll;

/* ======================================================================
 * 值的换算
 * ====================================================================== */

/** 一个原始值 → Values 的存法；返回 undefined = 存不了（null、未知结构） */
export function toStoreVal(x: unknown): Val | undefined {
  if (x === null || x === undefined) return undefined;
  if (Array.isArray(x)) return x.map(String).join(',');
  if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') return x;
  if (typeof x === 'object') {
    // 渐变（复刻里写成 {from, to, angle, type}）：存成「色1,色2」；写了方向或类型时前面带上「linear(角度):」/「radial:」（theme.ts 的 gradientPaint 解析，M12a-06）
    const o = x as Record<string, unknown>;
    const stops = Array.isArray(o.stops) ? o.stops.map((s) => (Array.isArray(s) ? String(s[s.length - 1]) : String(s))).join(',')
      : typeof o.from === 'string' && typeof o.to === 'string' ? `${o.from},${o.to}` : '';
    if (stops) {
      const head = o.type === 'radial' ? 'radial:' : typeof o.angle === 'number' || o.type === 'linear' ? `linear(${typeof o.angle === 'number' ? o.angle : 180}):` : '';
      return head + stops;
    }
  }
  return undefined;
}

/** 原始参数向量 → Values（只留 validKey 认得的键；丢掉的键名写进 dropped，开发时可以打印出来查数据） */
export function toStoreValues(raw: RawParams | null | undefined, dropped?: string[]): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(raw ?? {})) {
    const v = toStoreVal(x);
    if (v === undefined || !validKey(k)) { dropped?.push(k); continue; }
    out[k] = v;
  }
  return out;
}

/** 把一组值里的 UI 键全部清回跟随（与 store.unset 同一口径：登记过的参数回默认，覆盖键 / 元素实例键删掉） */
export function uiCleared(v: Values): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) {
    if (!isUiKey(k)) { out[k] = x; continue; }
    const p = getParam(k);
    if (p) out[k] = p.default;
  }
  return out;
}

/** 画面取 artFrom 的、UI 取 uiFrom 的（演示途中换了画面配方 / 场景，A 侧要跟着换画面） */
export function rebaseUi(uiFrom: Values, artFrom: Values): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(artFrom)) if (!isUiKey(k)) out[k] = x;
  for (const [k, x] of Object.entries(uiFrom)) if (isUiKey(k)) out[k] = x;
  return out;
}

/** 覆盖键 / 元素实例键 → 它的模板参数 id（el.vitals.scale → elx.scale，cmp.gauge@el.vitals → cmp.gauge）；本身是参数就原样返回 */
export const baseKeyOf = (key: string): string => paramOfKey(key)?.id ?? key.split('@')[0];

/** 原始值和当前值是不是"同一个取值"（多选：有交集；数值：相等） */
export function valueMatches(raw: unknown, cur: unknown): boolean {
  if (cur === undefined || cur === null || cur === '' || cur === 'auto') return false;
  const curList = Array.isArray(cur) ? cur.map(String) : String(cur).split(',');
  if (Array.isArray(raw)) return raw.some((x) => curList.includes(String(x)));
  const a = Number(raw), b = Number(cur);
  if (typeof raw === 'number' || (raw !== '' && !Number.isNaN(a) && !Number.isNaN(b) && typeof raw !== 'boolean')) return Math.abs(a - b) < 1e-6;
  return String(raw) === String(cur);
}

/** KPatch = store.patch 的参数，外加可选的画面配方（复刻）与丢掉的键 */
export interface KPatch extends Patch {
  /** 复刻套了整套画面配方时：调用方接着 setBaseRecipe(id)、setBaseStyle(null)（与 applyRecipe 一致） */
  baseRecipe?: string | null;
  dropped?: string[];
}

/* ======================================================================
 * 索引
 * ====================================================================== */

/** 参数 → 原则：approach = 做法谱系里用到（带具体取值）；demo / rule / rationale = 只是被点名 */
export interface ParamPrincipleRef { principle: KPrinciple; role: 'approach' | 'demo' | 'rule' | 'rationale'; approach?: KApproach; key: string; value?: unknown }
/** 参数 → 品类篇的 demo */
export interface ParamChapterRef { chapter: KGenreChapter; ref: string }
/** 参数（或 参数=取值）→ 风格家族；key 是家族里写的原键（可能带 @ 或元素前缀） */
export interface FamilyValueRef { family: KFamily; key: string; value: unknown }
/** 家族 → 原则：how = 原则 styleVariants 里写的"这个家族里怎么做" */
export interface FamilyPrincipleRef { principle: KPrinciple; how?: string }

export interface UiKnowledge {
  principles: PrinciplesFile;
  families: FamiliesFile;
  refs: RefsFile;
  principleById: Map<string, KPrinciple>;
  areaById: Map<string, KArea>;
  /** 品类篇：键 = genre（action）与 G-<genre>（G-action）两种写法 */
  chapterById: Map<string, KGenreChapter>;
  /** 原则与品类篇的所有 demo（demo + extraDemos + 品类篇 demos）：demo id → 所属 */
  demoById: Map<string, { demo: KDemo; principle?: KPrinciple; chapter?: KGenreChapter }>;
  approachById: Map<string, { principle: KPrinciple; approach: KApproach }>;
  sourceById: Map<string, KSource>;
  familyById: Map<string, KFamily>;
  groupById: Map<string, KGroup>;
  /** 家族 id → 子族（按 JSON 顺序） */
  childrenOf: Map<string, KFamily[]>;
  /** 门类 → 顶层家族（按 groups[].families 的顺序） */
  topFamiliesOf: Map<string, KFamily[]>;
  cardById: Map<string, KCard>;
  /** 卡 id → 名字（参考卡 + 家族 exemplars 里写过的名字；不在参考库里的卡也能显示名字） */
  cardNames: Map<string, string>;
  principlesByParam: Map<string, ParamPrincipleRef[]>;
  chaptersByParam: Map<string, ParamChapterRef[]>;
  /** "参数=取值" → 家族（多选按每一项分别登记；参数既按原键也按模板参数登记） */
  familiesByValue: Map<string, FamilyValueRef[]>;
  /** 参数 → 写了它的家族 */
  familiesByParam: Map<string, FamilyValueRef[]>;
  /** hud.style 的取值 → 用这套皮肤的家族 / 子族 */
  familiesBySkin: Map<string, KFamily[]>;
  principlesByFamily: Map<string, FamilyPrincipleRef[]>;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };

/** 建全部索引（纯函数；数据当参数传入，单测直接喂 JSON） */
export function buildUiKnowledge(principles: PrinciplesFile, families: FamiliesFile, refs: RefsFile): UiKnowledge {
  const principleById = new Map(principles.principles.map((p) => [p.id, p]));
  const areaById = new Map(principles.areas.map((a) => [a.id, a]));
  const chapterById = new Map<string, KGenreChapter>();
  for (const g of principles.genres) { chapterById.set(g.genre, g); chapterById.set(`G-${g.genre}`, g); }
  const demoById: UiKnowledge['demoById'] = new Map();
  const approachById: UiKnowledge['approachById'] = new Map();
  for (const p of principles.principles) {
    for (const d of [p.demo, ...(p.extraDemos ?? [])]) if (d) demoById.set(d.id, { demo: d, principle: p });
    for (const a of p.approaches) approachById.set(a.id, { principle: p, approach: a });
  }
  for (const g of principles.genres) for (const d of g.demos ?? []) demoById.set(d.id, { demo: d, chapter: g });
  const sourceById = new Map(principles.sources.map((s) => [s.id, s]));

  const familyById = new Map(families.families.map((f) => [f.id, f]));
  const groupById = new Map(families.groups.map((g) => [g.id, g]));
  const childrenOf = new Map<string, KFamily[]>();
  for (const f of families.families) if (f.parent) push(childrenOf, f.parent, f);
  const topFamiliesOf = new Map<string, KFamily[]>();
  for (const g of families.groups) topFamiliesOf.set(g.id, g.families.map((id) => familyById.get(id)).filter((x): x is KFamily => !!x));
  // 门类列表里漏掉的顶层家族（以防数据不一致）补在末尾
  for (const f of families.families) if (!f.parent && !(topFamiliesOf.get(f.group) ?? []).includes(f)) push(topFamiliesOf, f.group, f);

  const cardById = new Map(refs.cards.map((c) => [c.id, c]));
  const cardNames = new Map<string, string>();
  for (const f of families.families) for (const e of f.exemplars) if (e.name) cardNames.set(e.card, e.name);
  for (const c of refs.cards) cardNames.set(c.id, c.name);

  // 参数 → 原则：做法谱系逐键登记（原键 + 模板参数），其余角色取 JSON 的 paramIndex
  const principlesByParam = new Map<string, ParamPrincipleRef[]>();
  const seen = new Set<string>();
  const add = (k: string, ref: ParamPrincipleRef) => {
    const sig = `${k}|${ref.principle.id}|${ref.approach?.id ?? ref.role}|${ref.key}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    push(principlesByParam, k, ref);
  };
  for (const p of principles.principles) {
    for (const a of p.approaches) {
      for (const [key, value] of Object.entries(a.params ?? {})) {
        const ref: ParamPrincipleRef = { principle: p, role: 'approach', approach: a, key, value };
        add(key, ref);
        const base = baseKeyOf(key);
        if (base !== key) add(base, ref);
      }
    }
  }
  const chaptersByParam = new Map<string, ParamChapterRef[]>();
  for (const [key, list] of Object.entries(principles.paramIndex ?? {})) {
    for (const e of list) {
      if (e.role === 'genreDemo' && e.genre) {
        const ch = chapterById.get(e.genre);
        if (ch && !(chaptersByParam.get(key) ?? []).some((x) => x.ref === e.ref)) push(chaptersByParam, key, { chapter: ch, ref: e.ref });
        continue;
      }
      if (e.role === 'approach' || !e.principle) continue;
      const p = principleById.get(e.principle);
      if (p && (e.role === 'demo' || e.role === 'rule' || e.role === 'rationale')) add(key, { principle: p, role: e.role, key });
    }
  }
  for (const [key, r] of Object.entries(principles.paramRationale ?? {})) {
    for (const id of r.principles ?? []) { const p = principleById.get(id); if (p) add(key, { principle: p, role: 'rationale', key }); }
  }

  // 参数 / 取值 → 家族（只登记家族自己写的 params：子族只列它改过的键，免得每个子族都重复父族）
  const familiesByValue = new Map<string, FamilyValueRef[]>();
  const familiesByParam = new Map<string, FamilyValueRef[]>();
  const familiesBySkin = new Map<string, KFamily[]>();
  for (const f of families.families) {
    for (const [key, value] of Object.entries(f.params ?? {})) {
      const ref: FamilyValueRef = { family: f, key, value };
      const base = baseKeyOf(key);
      const keys = base !== key ? [key, base] : [key];
      const vals = Array.isArray(value) ? value.map(String) : toStoreVal(value) !== undefined ? [String(toStoreVal(value))] : [];
      for (const k of keys) {
        push(familiesByParam, k, ref);
        for (const v of vals) push(familiesByValue, `${k}=${v}`, ref);
      }
    }
    const skin = skinValueOf(familySkinId(f, familyById));
    push(familiesBySkin, skin, f);
    push(familiesByValue, `${HUD_STYLE_DEF.id}=${skin}`, { family: f, key: HUD_STYLE_DEF.id, value: skin });
  }

  // 家族 → 原则：图谱自己的 relatedPrinciples + 原则的 styleVariants（带 how）+ 原则文件的 styleFamilies 索引
  const principlesByFamily = new Map<string, FamilyPrincipleRef[]>();
  const addFP = (fam: string, p: KPrinciple | undefined, how?: string) => {
    if (!p) return;
    const list = principlesByFamily.get(fam);
    const hit = list?.find((x) => x.principle === p);
    if (hit) { if (how && !hit.how) hit.how = how; return; }
    push(principlesByFamily, fam, { principle: p, how });
  };
  for (const p of principles.principles) for (const v of p.styleVariants ?? []) addFP(v.family, p, v.how);
  for (const f of families.families) for (const id of f.relatedPrinciples ?? []) addFP(f.id, principleById.get(id));
  for (const row of principles.styleFamilies ?? []) for (const id of row.topPrinciples ?? []) addFP(row.familyId, principleById.get(id));

  return {
    principles, families, refs, principleById, areaById, chapterById, demoById, approachById, sourceById,
    familyById, groupById, childrenOf, topFamiliesOf, cardById, cardNames,
    principlesByParam, chaptersByParam, familiesByValue, familiesByParam, familiesBySkin, principlesByFamily,
  };
}

/* ======================================================================
 * 查询小工具
 * ====================================================================== */

/** 原则的一句话：JSON 没有 oneLiner 时用标题（标题本身就是一句话结论） */
export const principleOneLiner = (p: KPrinciple) => p.oneLiner ?? p.title;
/** 原则的全部 demo（主 demo + 由它派生的单变量版） */
export const demosOf = (p: KPrinciple): KDemo[] => [p.demo, ...(p.extraDemos ?? [])].filter(Boolean);
/** demo 能不能在探索台上演示（note 只有文字） */
export const demoRunnable = (d: KDemo | null | undefined) => !!d && d.kind !== 'note' && !!d.a && !!d.b;

/** 卡名（参考库没有的卡退回 id） */
export const cardName = (k: UiKnowledge, id: string) => k.cardNames.get(id) ?? id;
/** 卡的第 i 张本地截图 URL（开发环境才有） */
export const cardShotUrl = (k: UiKnowledge, id: string, i = 0) => refImageUrl(k.cardById.get(id)?.shots?.[i]);
/** 卡的新家族（assignments 是唯一真相） */
export const cardFamily = (k: UiKnowledge, id: string) => { const a = k.families.assignments[id]; return a ? k.familyById.get(a.family) : undefined; };

/**
 * 本地参考截图的 URL：只在开发服务器上返回（Vite 从项目根目录直接服务 /qa/…），生产构建返回 null → 界面显示 REF_DEV_ONLY_NOTE。
 * 截图不复制进 public/ 也不进包；外链一律不显示。
 */
export function refImageUrl(path: string | null | undefined): string | null {
  if (!path || !LOCAL_REFS || /^[a-z]+:/i.test(path)) return null;
  return '/' + path.replace(/\\/g, '/').replace(/^\.?\/+/, '').split('/').map(encodeURIComponent).join('/');
}

/** 家族用哪套皮肤（预设 id）：自己的 → 父族的 → baseSkin */
export function familySkinId(f: KFamily, familyById: Map<string, KFamily>): string {
  const parent = f.parent ? familyById.get(f.parent) : undefined;
  return f.skin ?? parent?.skin ?? f.baseSkin ?? parent?.baseSkin ?? 'skin.greybox';
}

/** 家族最常见的品类（genres 按卡数）；子族没有时看父族 */
export function topGenre(k: UiKnowledge, f: KFamily): string | undefined {
  const g = [...(f.genres ?? [])].sort((a, b) => b.count - a.count)[0]?.genre;
  if (g) return g;
  const parent = f.parent ? k.familyById.get(f.parent) : undefined;
  return parent ? topGenre(k, parent) : undefined;
}

/** 内容包 → 第一个用它的品类布局（LAYOUT_PACK 反查） */
export const PACK_LAYOUT: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [layout, pack] of Object.entries(LAYOUT_PACK)) if (!(pack in m)) m[pack] = layout;
  return m;
})();

/** 图谱 / 原则里的品类键（17 + 6 个）→ 内容包；GENRE_PACK 没有的几个手写 */
const EXTRA_GENRE_PACK: Record<string, string> = { mobile: 'action', fighting: 'arena', rhythm: 'rhythm', sports: 'arena', mobaBr: 'arena', vehicleSim: 'racing', mmo: 'rpg' };
export const packOfGenre = (genre: string | undefined): string | undefined => (genre ? GENRE_PACK[genre] ?? EXTRA_GENRE_PACK[genre] : undefined);

/** 家族的预览情境：哪一款示例游戏（cnt.pack）、哪个品类布局、哪一屏（cnt.screen）、零 HUD 族要播的演示（chk.demo） */
export interface FamilyPreview { pack: string; layout: string; screen?: string; demo?: string }
export function familyPreview(k: UiKnowledge, f: KFamily, which: 'main' | 'hud' | 'dwell' = 'main'): FamilyPreview {
  const parent = f.parent ? k.familyById.get(f.parent) : undefined;
  const pv = f.preview?.params ? f.preview : parent?.preview ?? f.preview;
  const params = (which === 'main' ? pv?.params : pv?.[which]?.params ?? pv?.params) ?? {};
  const pack = String(params['cnt.pack'] ?? packOfGenre(topGenre(k, f)) ?? 'snowline');
  return {
    pack,
    layout: PACK_LAYOUT[pack] ?? 'auto',
    screen: typeof params['cnt.screen'] === 'string' ? params['cnt.screen'] : undefined,
    demo: typeof params['chk.demo'] === 'string' ? params['chk.demo'] : undefined,
  };
}

/** 家族的相关原则（带"这个家族里怎么做"） */
export const principlesOfFamily = (k: UiKnowledge, f: KFamily): FamilyPrincipleRef[] => k.principlesByFamily.get(f.id) ?? (f.parent ? k.principlesByFamily.get(f.parent) ?? [] : []);

/* ---------- G1：一个参数 / 取值的"为什么、什么时候用" ---------- */

export interface Rationale {
  key: string;
  /** 模板参数 id（覆盖键 / 元素实例键时与 key 不同） */
  base: string;
  /** 做法谱系里用到它的做法：取值和当前一致的排前面，原键排在模板参数前面 */
  approaches: (ParamPrincipleRef & { approach: KApproach; match: boolean })[];
  /** 只在 demo / 经验法则 / 理由里点名的原则（不和上面重复） */
  mentions: ParamPrincipleRef[];
  /** 用到它的品类篇 demo */
  chapters: ParamChapterRef[];
  /** 写了这个参数的家族：取值一致的排前面 */
  families: (FamilyValueRef & { match: boolean })[];
  /** 没有原则覆盖的参数补的一句理由；noRationale = 工具参数（显示"暂无原则"） */
  note?: string;
  noRationale?: boolean;
  /** 例子游戏（取值一致的做法的 examples + 取值一致的家族的 exemplars，去重，最多 12 张） */
  cards: string[];
}

/** 选择器取值 → 等价的体系参数取值（界面模板 tpl.inventory → cnt.screen = screen.inventory、cnt.subtype = bag） */
function selectorAliases(key: string, value: unknown): [string, unknown][] {
  if (key !== SELECTORS.screen) return [];
  const pr = PRESET.get(String(value ?? ''));
  if (!pr || pr.kind !== 'screen') return [];
  const out: [string, unknown][] = [];
  for (const k of ['cnt.screen', 'cnt.subtype']) if (pr.values[k] !== undefined) out.push([k, pr.values[k]]);
  return out;
}

/** 品类布局（uip.layout）→ 对应的品类篇（布局预设的 genre 字段） */
function layoutChapters(k: UiKnowledge, value: unknown): ParamChapterRef[] {
  const pr = PRESET.get(String(value ?? ''));
  if (!pr || pr.kind !== 'layout') return [];
  const genres = Array.isArray(pr.genre) ? pr.genre : pr.genre ? [pr.genre] : [];
  return genres.map((g) => k.chapterById.get(g)).filter((c): c is KGenreChapter => !!c).map((chapter) => ({ chapter, ref: `G-${chapter.genre}` }));
}

/** 一个参数（可以是覆盖键 / 元素实例键 / 选择器）在当前取值下的全部依据 */
export function rationaleOf(k: UiKnowledge, key: string, value?: unknown): Rationale {
  const base = baseKeyOf(key);
  const keys: [string, unknown][] = [[key, value], ...(base !== key ? [[base, value] as [string, unknown]] : []), ...selectorAliases(key, value)];
  const approaches: Rationale['approaches'] = [];
  const mentions: ParamPrincipleRef[] = [];
  const families: Rationale['families'] = [];
  const chapters: ParamChapterRef[] = [];
  const seenA = new Set<string>(), seenP = new Set<string>(), seenF = new Set<string>(), seenC = new Set<string>();
  for (const [kk, vv] of keys) {
    for (const ref of k.principlesByParam.get(kk) ?? []) {
      if (ref.approach) {
        if (seenA.has(ref.approach.id)) continue;
        seenA.add(ref.approach.id);
        seenP.add(ref.principle.id);
        approaches.push({ ...ref, approach: ref.approach, match: valueMatches(ref.value, vv) });
      } else if (!seenP.has(ref.principle.id)) { seenP.add(ref.principle.id); mentions.push(ref); }
    }
    for (const ref of k.familiesByParam.get(kk) ?? []) {
      if (seenF.has(ref.family.id)) continue;
      seenF.add(ref.family.id);
      families.push({ ...ref, match: valueMatches(ref.value, vv) });
    }
    for (const c of k.chaptersByParam.get(kk) ?? []) if (!seenC.has(c.ref)) { seenC.add(c.ref); chapters.push(c); }
  }
  if (key === SELECTORS.layout) for (const c of layoutChapters(k, value)) if (!seenC.has(c.ref)) { seenC.add(c.ref); chapters.push(c); }
  // 皮肤：按皮肤找家族
  if (key === HUD_STYLE_DEF.id && value !== undefined) {
    for (const f of k.familiesBySkin.get(String(value)) ?? []) if (!seenF.has(f.id)) { seenF.add(f.id); families.push({ family: f, key, value, match: true }); }
  }
  // 提到某个原则的做法后，它的"只是点名"条目就不再单列
  const ments = mentions.filter((m) => !approaches.some((a) => a.principle === m.principle));
  approaches.sort((a, b) => Number(b.match) - Number(a.match));
  families.sort((a, b) => Number(b.match) - Number(a.match));
  const r = k.principles.paramRationale?.[base] ?? k.principles.paramRationale?.[key];
  const cards: string[] = [];
  const addCard = (id: string) => { if (cards.length < 12 && !cards.includes(id)) cards.push(id); };
  for (const a of approaches) if (a.match) a.approach.examples.forEach(addCard);
  for (const f of families) if (f.match) f.family.exemplars.forEach((e) => addCard(e.card));
  return { key, base, approaches, mentions: ments, chapters, families, note: r?.note, noRationale: r?.noRationale, cards };
}

/* ======================================================================
 * 套用（返回 KPatch，交给 store.patch；都不读写 store）
 * ====================================================================== */

/** 风格域的键：家族套用时会先清掉这些手动值（视觉、色彩、字体、素材槽、组件、状态、动效，加显隐与美术关系） */
export function isStyleKey(k: string): boolean {
  const base = k.split('@')[0];
  const g = base.split('.')[0];
  return ['vis', 'col', 'typ', 'ast', 'cmp', 'st', 'mo'].includes(g) || ['rel.hudVisibility', 'rel.harmony', 'ix.press', 'ix.focus'].includes(base);
}
/** 内容 / 版式域的键（预览情境换题材时清掉；界面类型另算） */
export const isContentKey = (k: string) => { const g = k.split('@')[0].split('.')[0]; return ['cnt', 'lay', 'hier', 'el', 'elx'].includes(g); };

export interface FamilyApplyOpts {
  /** 同时换成它的典型题材：内容包（preview 的 cnt.pack，没有时按最常见品类）+ 对应的品类布局；默认 true */
  preview?: boolean;
  /** 看哪一屏：keep = 不动当前界面；main / hud / dwell = 主预览 / 局内 HUD / 停留型界面；默认 keep */
  screen?: 'keep' | 'main' | 'hud' | 'dwell';
  /** 同时套用家族建议的版式（context.params：lay.hudOrg、元素画法……）；默认 false */
  layout?: boolean;
  /** HUD 减配版（hudLite.params 代替 params） */
  lite?: boolean;
  /** 再叠一个变体（variants[].id） */
  variant?: string;
}

/**
 * 套用一个风格家族：皮肤（hud.style）+ 父族 params + 子族 params（+ 变体）；关键词回到跟随皮肤、节日清掉；
 * 先把风格域的手动值清回跟随（换家族不残留上一个家族的饰件、描边……）。
 * 预览情境（默认开）：cnt.pack + uip.layout 换成家族的典型题材，内容 / 版式域的手动值一并清掉，免得所有家族都画成雪线旅人；
 * 家族 params 自己写了 cnt.pack / uip.layout 时不覆盖。不改平台、商业模式、无障碍叠加。
 */
export function applyFamily(k: UiKnowledge, f: KFamily, current: Values, opts: FamilyApplyOpts = {}): KPatch {
  const { preview = true, screen = 'keep', layout = false, lite = false } = opts;
  const parent = f.parent ? k.familyById.get(f.parent) : undefined;
  const dropped: string[] = [];
  const set: Values = {
    [HUD_STYLE_DEF.id]: skinValueOf(familySkinId(f, k.familyById)),
    [SELECTORS.keyword]: 'auto',
    [SELECTORS.theme]: 'none',
  };
  if (lite && (f.hudLite?.params || parent?.hudLite?.params)) Object.assign(set, toStoreValues(f.hudLite?.params ?? parent?.hudLite?.params, dropped));
  else Object.assign(set, toStoreValues(parent?.params, dropped), toStoreValues(f.params, dropped));
  const variant = opts.variant ? [...(f.variants ?? []), ...(parent?.variants ?? [])].find((v) => v.id === opts.variant) : undefined;
  if (variant) Object.assign(set, toStoreValues(variant.params, dropped));
  if (layout) Object.assign(set, toStoreValues(parent?.context?.params, dropped), toStoreValues(f.context?.params, dropped));
  if (preview) {
    const pv = familyPreview(k, f, screen === 'keep' ? 'main' : screen);
    if (!('cnt.pack' in set)) set['cnt.pack'] = pv.pack;
    if (!(SELECTORS.layout in set)) set[SELECTORS.layout] = pv.layout;
    if (screen !== 'keep' && pv.screen) { set['cnt.screen'] = pv.screen; set[SELECTORS.screen] = 'auto'; }
    if (pv.demo) set['chk.demo'] = pv.demo;
  }
  const unset = manualUiKeys(current, isUiKey).filter((key) => !(key in set) && (isStyleKey(key)
    || (preview && isContentKey(key) && (screen !== 'keep' || (key !== 'cnt.screen' && key !== 'cnt.subtype')))));
  const label = `UI 风格家族：${parent ? `${parent.name} · ` : ''}${f.name.replace(parent ? `${parent.name}·` : '', '')}${variant ? `（${variant.name}）` : ''}${lite ? '（HUD 减配）' : ''}`;
  return { set, unset, label, dropped };
}

/** 灰盒 → 家族的改造步骤：step = 0 只有灰盒，1–5 累加 convertParams 前 step 步；没有分步数据时返回 null */
export function convertPatch(k: UiKnowledge, f: KFamily, step: number, current: Values): KPatch | null {
  const steps = f.convertParams ?? (f.parent ? k.familyById.get(f.parent)?.convertParams : undefined);
  if (!steps?.length) return null;
  const dropped: string[] = [];
  const set: Values = { [HUD_STYLE_DEF.id]: skinValueOf('skin.greybox'), [SELECTORS.keyword]: 'auto', [SELECTORS.theme]: 'none' };
  for (const s of [...steps].sort((a, b) => a.step - b.step)) if (s.step <= step) Object.assign(set, toStoreValues(s.params, dropped));
  const unset = manualUiKeys(current, isUiKey).filter((key) => !(key in set) && isStyleKey(key));
  return { set, unset, label: `UI 改造：灰盒 → ${f.name}（第 ${step}/${steps.length} 步）`, dropped };
}

/** 检查工具键（chk.*：色盲模拟、视距预览、触控 / 安全区叠加……）：演示里用来"看"，不该当成 UI 的一部分带走 */
export const isToolKey = (k: string) => k.startsWith('chk.');
/** 去掉检查工具键 */
export function withoutTools(v: Values): Values {
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) if (!isToolKey(k)) out[k] = x;
  return out;
}

/**
 * 补品类布局：局内 HUD 只有按元素排版（uip.layout 不是 auto / none，或 cnt.elements 是手动值）才画得出品类 HUD，
 * 否则画的是 M1 四控件样本，el.* / *@el.* 的改动在画面上看不出来。
 * set 写了内容包、没写品类布局，叠到 current 上之后仍是局内 HUD（cnt.screen 跟随 / 局内、没选界面模板）、
 * 布局仍是 auto / none、元素集合仍是跟随（没写，或写的就是 auto）时，补上这个内容包的品类布局（PACK_LAYOUT，与家族预览同口径）；不需要补时返回 {}。
 */
export function genreLayoutFill(set: Values, current: Values = {}): Values {
  if (SELECTORS.layout in set) return {};
  const pack = set['cnt.pack'];
  if (typeof pack !== 'string' || pack === 'auto') return {};
  const v: Values = { ...current, ...set };
  const lay = v[SELECTORS.layout];
  if (lay !== undefined && lay !== 'auto' && lay !== 'none') return {};
  const els = v['cnt.elements'];
  if (els !== undefined && els !== 'auto') return {};
  const scr = v['cnt.screen'];
  if (scr !== undefined && scr !== 'auto' && scr !== 'screen.hud') return {};
  const tpl = v[SELECTORS.screen];
  if (tpl !== undefined && tpl !== 'auto' && tpl !== 'none') return {};
  const layout = PACK_LAYOUT[pack];
  return layout ? { [SELECTORS.layout]: layout } : {};
}

/**
 * 套用原则的一种做法：只写做法自己的参数（叠在当前值上，不清别的）。
 * context = true 时先垫上主 demo 的 base（内容包、界面类型、元素集合……；检查工具 chk.* 不带），让做法在它被验证过的情境里画出来；不换皮肤。
 *   这时 base 只给了内容包、而当前是跟随布局时，补上这个包的品类布局（genreLayoutFill），不然 el.* 的改动画不出来；current = 套用前的值。
 */
export function applyApproach(p: KPrinciple, a: KApproach, opts: { context?: boolean; current?: Values } = {}): KPatch {
  const dropped: string[] = [];
  const set: Values = { ...(opts.context ? withoutTools(toStoreValues(p.demo?.base, dropped)) : {}), ...toStoreValues(a.params, dropped) };
  if (opts.context) Object.assign(set, genreLayoutFill(set, opts.current ?? {}));
  return { set, unset: [], label: `UI 原则做法：${a.name}`, dropped };
}

/** demo 两侧的完整取值：a / b 都 = 当前画面 + UI 全部回到跟随 + 基线皮肤 + base + 各自一侧 */
export interface DemoSides {
  a: Values;
  b: Values;
  /** 把当前状态变成 b 的补丁（一步可撤销）；a 交给 store.setSlotA，再 setHudABOn(true) */
  patchB: KPatch;
  dropped: string[];
}
export function demoSides(demo: KDemo, current: Values): DemoSides | null {
  if (!demoRunnable(demo)) return null;
  const dropped: string[] = [];
  const common: Values = { [HUD_STYLE_DEF.id]: skinValueOf(demo.skin ?? 'skin.greybox'), ...toStoreValues(demo.base, dropped) };
  const va = toStoreValues(demo.a, dropped), vb = toStoreValues(demo.b, dropped);
  const clean = uiCleared(current);
  // 只给了内容包、没给布局的局内 HUD 演示：补上这个包的品类布局，才画品类 HUD（否则是四控件样本，el.* 的差别看不出来）。
  // 有一侧需要就两侧一起补（同一个包时放进共同部分，两侧的版式只差演示要比的那几项；例如 A 元素跟随布局、B 只留三个元素）
  const fa = genreLayoutFill({ ...common, ...va }, clean), fb = genreLayoutFill({ ...common, ...vb }, clean);
  const packOf = (side: Values) => side['cnt.pack'] ?? common['cnt.pack'];
  let sideA: Values = {}, sideB: Values = {};
  if (!(SELECTORS.layout in va) && !(SELECTORS.layout in vb) && packOf(va) === packOf(vb)) Object.assign(common, fa, fb);
  else { sideA = fa; sideB = fb; }
  const ua: Values = { ...common, ...sideA, ...va };
  const ub: Values = { ...common, ...sideB, ...vb };
  const unset = Object.keys(current).filter((key) => isUiKey(key) && !(key in ub));
  return { a: { ...clean, ...ua }, b: { ...clean, ...ub }, patchB: { set: ub, unset, label: `UI 演示：${demo.title}`, dropped }, dropped };
}

/** demo 的场景变体 → 要写的画面值 */
export const sceneVariantValues = (s: KSceneVariant): Values => ({ 'game.scene': s.id, ...toStoreValues(s.set) });

/** 复刻某一屏的套用选项：uiOnly = 只套 UI（内容包 + base + 这一屏），画面保持当前 */
export interface ReplicaApplyOpts { uiOnly?: boolean }

/**
 * 复刻的一屏：与 __gae.replicaShots（src/main.tsx）同一套叠法，只是不钉 16:9 画幅、保留当前种子：
 *   默认值 →（art.recipe 有就套整套画面配方，保留场景 / 种子 / 品类）→ art.values 与 art.scene → cnt.pack = pack → base → 这一屏的 values；
 *   UI 键先全部清回跟随。返回的 set 是整套值，unset 是当前有、整套里没有的键（覆盖键 / 元素实例键）。
 */
export function replicaScreenPatch(rep: KReplica, screen: KReplicaScreen, current: Values, opts: ReplicaApplyOpts = {}): KPatch {
  const dropped: string[] = [];
  // 这一屏的 values 之后套钉帧（sim，与 main.tsx 的 applyReplicaScreen 同一个顺序）
  const ui: Values = { 'cnt.pack': rep.pack ?? 'auto', ...toStoreValues(rep.base, dropped), ...toStoreValues(screen.values, dropped), ...replicaSimValues(screen.sim) };
  const label = `复刻：${rep.name} · ${screen.key}`;
  if (opts.uiOnly) {
    const unset = Object.keys(current).filter((key) => isUiKey(key) && !(key in ui));
    return { set: ui, unset, label, dropped };
  }
  const recipe = rep.art?.recipe ? RECIPE_MAP.get(rep.art.recipe) : undefined;
  const full: Values = defaultValues();
  if (recipe) Object.assign(full, toStoreValues(recipe.values), { 'game.scene': current['game.scene'], 'game.genre': current['game.genre'] });
  full['game.seed'] = current['game.seed'] ?? full['game.seed'];
  Object.assign(full, toStoreValues(rep.art?.values, dropped));
  if (rep.art?.scene) full['game.scene'] = rep.art.scene;
  Object.assign(full, ui);
  const unset = Object.keys(current).filter((key) => !(key in full));
  return { set: full, unset, label, baseRecipe: recipe?.id ?? null, dropped };
}

/**
 * 复刻一屏的逐轮评分（scores 是单对象或数组，docs/ui-replicas.md）：按轮次排好；没写 round 的按位置补（第 i 项 = 第 i + 1 轮）。没有评分时 []
 */
export function replicaScoreHistory(rep: KReplica, screenKey: string): KReplicaScore[] {
  const v = rep.scores?.[screenKey];
  if (!v || typeof v !== 'object') return [];
  const list = (Array.isArray(v) ? v : [v]).filter((x): x is KReplicaScore => !!x && typeof x === 'object');
  return list.map((x, i) => (typeof x.round === 'number' ? x : { ...x, round: i + 1 })).sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
}
/** 复刻一屏的当前评分 = 最后一轮（没有评分时 undefined） */
export const replicaScore = (rep: KReplica, screenKey: string): KReplicaScore | undefined => replicaScoreHistory(rep, screenKey).at(-1);
/** 缺口落在哪些屏：一屏 key、"a / b / c" 拆开；整套共有（all / global / *）返回 [] */
export function gapScreens(g: KReplicaGap): string[] {
  const s = String(g.screen ?? '').trim();
  if (!s || s === 'all' || s === 'global' || s === '*') return [];
  return s.split(/\s*\/\s*/).filter(Boolean);
}
