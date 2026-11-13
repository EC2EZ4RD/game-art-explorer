import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import {
  applyFamily, baseKeyOf, cardName, cardShotUrl, convertPatch, familyPreview, familySkinId, IS_DEV, LOCAL_REFS, isContentKey, principlesOfFamily, toStoreVal,
  type FamilyApplyOpts, type KFamily, type KPatch, type UiKnowledge,
} from '../../content/uiKnowledge';
import { RECIPE_MAP } from '../../content/recipes';
import { SCENE_MAP, sceneMeta } from '../../content/sceneCatalog';
import { getParam, str as strOf } from '../../dims/registry';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { packById } from '../../hud/content';
import { playDemoScript } from '../../hud/flow';
import { HUD_STYLE_DEF, SELECTORS, skinValueOf } from '../../hud/sys/register';
import { applyRecipe } from '../../state/actions';
import { useStore } from '../../state/store';
import { goScene } from '../left/galleryActions';
import { startPreview } from './preview';
import { CardChips, CardThumbs, FamilyChip, KnowBackLink, KnowledgeLoading, ParamChip, PrincipleChip, RefImage, RefNote } from './KnowledgeBits';
import { useCloseOnAction } from '../hud/useCloseOnAction';
import { endDemo } from './principleDemo';
import { useUiKnowledgeState } from './useUiKnowledge';
import '../hud/atlas.css';

/*
 * 左栏"UI 风格图谱"（G3，docs/t1-tool-knowledge.md）：12 个门类 → 93 个家族 → 109 个子族（可搜索、按题材 / 情绪筛、只看待补参考）；
 * 家族页：一句话、适用 / 避免、套用（皮肤 + 风格参数 + 预览情境）、子族与变体、定义、10 轴语法表、灰盒改造 5 步、美术搭配、
 *   品类 / 题材 / 情绪、代表作（开发环境带缩略图）、失败模式、相关原则、探索台缺口、待补参考。
 * "套用" = applyFamily → store.patch，一步可撤销；预览情境 = 家族的典型题材（内容包 + 品类布局），免得所有家族都画成雪线旅人。
 * 数据懒加载（useUiKnowledgeState）；列表的搜索 / 筛选 / 展开、家族页各小节的开合记在本文件的小 store 里，切页签回来还在。
 * 归属：B3。导出名 UiAtlasPanel 不变（LeftRail 在用）。
 */

/* ---------------- 面板自己的界面状态（不进全局 store，不进存档） ---------------- */

interface AtlasUi {
  q: string;
  setting: string;
  mood: string;
  needsOnly: boolean;
  /** 门类展开（未筛选时） */
  groups: Record<string, boolean>;
  /** 家族的子族列表手动展开 / 收起（筛选条件一变就清空） */
  subs: Record<string, boolean>;
  /** 家族页各小节的开合（跨家族保持：打开过"10 轴语法"，换个家族还是开着） */
  secs: Record<string, boolean>;
  /** 最近一次从图谱套用的家族（列表高亮、家族页显示"已套用"） */
  applied: { id: string; label: string } | null;
  set: (p: Partial<Omit<AtlasUi, 'set'>>) => void;
}
const useAtlas = create<AtlasUi>((set) => ({
  q: '', setting: '', mood: '', needsOnly: false, groups: {}, subs: {}, secs: {}, applied: null,
  set: (p) => set(p),
}));
/** 列表的滚动位置（进家族页再返回时恢复） */
let listScroll = 0;

const SEC_DEFAULT: Record<string, boolean> = {
  subs: true, variants: false, def: true, grammar: false, convert: false, art: true, where: true, ex: true, fail: false, principles: true, gaps: false, refs: true,
};

/* ---------------- 文字与标签 ---------------- */

const STATUS: Record<string, [string, string]> = {
  existing: ['已有', '原来 33 个家族之一，探索台有对应皮肤'],
  missing: ['新家族', '调研新提出的家族：多半还没有专属皮肤，先借用最接近的皮肤'],
  subStyle: ['新子风格', '调研新提出的子风格'],
  regrouped: ['本轮重组', '由已有的卡与子族重新组织出来的家族'],
  underRepresented: ['欠代表', '游戏里有，但卡库里样本很少'],
};
const RELATION: Record<string, [string, string, string]> = {
  sameMedium: ['同一媒介', 'UI 和画面用同一种材料 / 笔触 / 技法', 'ok'],
  neutral: ['中性', 'UI 退后、不模仿画面，只负责清楚', ''],
  contrast: ['刻意对比', '故意用和画面不同的语言，制造张力或"界面感"', 'warn'],
  unified: ['统一调色', '媒介不同，但共用一套调色与明暗', 'blue'],
};
/** 套用时不算"风格参数"的键（皮肤、选择器、预览情境） */
const CTX_KEYS = new Set<string>([HUD_STYLE_DEF.id, SELECTORS.keyword, SELECTORS.theme, SELECTORS.layout, SELECTORS.screen, 'cnt.pack', 'cnt.screen', 'chk.demo']);
const HEX = /^#[0-9a-f]{3,8}$/i;

const optLabel = (id: string, v: unknown): string => {
  if (v === undefined || v === null) return '';
  return getParam(id)?.options?.find((o) => o.value === String(v))?.label ?? String(v);
};
const parentOf = (k: UiKnowledge, f: KFamily) => (f.parent ? k.familyById.get(f.parent) : undefined);
/** 子族名去掉"家族名·"前缀（列在家族下面时用） */
const shortName = (f: KFamily, parent?: KFamily) => (parent && f.name.startsWith(parent.name) ? f.name.slice(parent.name.length).replace(/^[·・\s]+/, '') || f.name : f.name);
/** 定义的第一句（子族没有 oneLiner） */
function firstSentence(s: string | undefined): string {
  if (!s) return '';
  const i = s.search(/[。！？]/);
  if (i > 0 && i < 90) return s.slice(0, i + 1);
  return s.length > 80 ? `${s.slice(0, 78)}…` : s;
}
const leadOf = (f: KFamily) => f.oneLiner ?? firstSentence(f.definition);
const strList = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);

/** 一个套用选项会改什么（按钮旁 / 悬停提示里的说明）；按家族 + 选项缓存 */
const descCache = new WeakMap<KFamily, Map<string, string>>();
function describe(k: UiKnowledge, f: KFamily, opts: FamilyApplyOpts = {}): string {
  const key = JSON.stringify(opts);
  let m = descCache.get(f);
  if (!m) { m = new Map(); descCache.set(f, m); }
  const hit = m.get(key);
  if (hit !== undefined) return hit;
  const { set } = applyFamily(k, f, {}, opts);
  const rest = Object.keys(set).filter((x) => !CTX_KEYS.has(x));
  const nLayout = rest.filter(isContentKey).length;
  const parts = [`皮肤「${optLabel(HUD_STYLE_DEF.id, set[HUD_STYLE_DEF.id])}」+ ${rest.length - nLayout} 项${opts.lite ? 'HUD 减配' : '风格'}参数${nLayout ? ` + ${nLayout} 项版式参数` : ''}`];
  if (set['cnt.pack'] !== undefined) parts.push(`示例游戏「${optLabel('cnt.pack', set['cnt.pack'])}」`);
  if (set[SELECTORS.layout] !== undefined) parts.push(`布局「${optLabel(SELECTORS.layout, set[SELECTORS.layout])}」`);
  if (set['cnt.screen'] !== undefined) parts.push(`界面「${optLabel('cnt.screen', set['cnt.screen'])}」`);
  if (set['chk.demo'] !== undefined) parts.push(`流程演示「${optLabel('chk.demo', set['chk.demo'])}」（套用后播一遍）`);
  const out = parts.join(' · ');
  m.set(key, out);
  return out;
}

/* ---------------- 动作（§4.3：先预览，「采用」后才写成普通改动，一步可撤销） ---------------- */

function run(p: KPatch | null, famId: string) {
  if (!p) return;
  if (IS_DEV && p.dropped?.length) console.warn(`[UI 风格图谱] ${p.label}：${p.dropped.length} 个键存不进 Values，已跳过`, p.dropped);
  startPreview(p.set, p.unset, p.label);
  useAtlas.getState().set({ applied: { id: famId, label: p.label } });
  // 零 HUD / 情境渐显这类家族的 HUD 只在事件里出现：套用时写了流程演示（chk.demo）就播一遍，不然画面上什么都没有
  const demo = p.set['chk.demo'];
  if (typeof demo === 'string') playDemoScript(demo);
}
const applyIt = (k: UiKnowledge, f: KFamily, opts: FamilyApplyOpts = {}) => run(applyFamily(k, f, useStore.getState().values, opts), f.id);
/** UI 左右对比：现在的 UI 存进 A（左半边），右半边只换成这个家族的风格（题材不变，方便比）；正在进行的原则对比演示先正常结束（还回演示前的 A 槽） */
function compareIt(k: UiKnowledge, f: KFamily) {
  if (useStore.getState().hudDemo) endDemo('keep');
  const s = useStore.getState();
  const before = { ...s.values };
  s.setSlotA({ values: before, label: 'A：套用前的 UI', ts: Date.now() });
  run(applyFamily(k, f, before, { preview: false }), f.id);
  s.setHudABSplit(0.5);
  s.setHudABOn(true);
}
const openFamily = (id: string | null) => useStore.getState().openKnowledge('family', id);

/* ======================================================================
 * 面板
 * ====================================================================== */

export function UiAtlasPanel() {
  // 加载失败时换个 key 重新挂载 = 重试（loadUiKnowledge 失败后会清掉缓存）
  const [attempt, setAttempt] = useState(0);
  return <AtlasRoot key={attempt} retry={() => setAttempt((n) => n + 1)} />;
}

function AtlasRoot({ retry }: { retry: () => void }) {
  const { k, error } = useUiKnowledgeState();
  const sel = useStore((s) => s.knowSel.family);
  const rootRef = useRef<HTMLDivElement>(null);
  const f = k && sel ? k.familyById.get(sel) : undefined;

  // 进家族页滚到顶；回列表恢复原来的位置（滚动容器是左栏的 .scroll，各页签共用）
  useLayoutEffect(() => {
    const el = rootRef.current?.closest('.scroll');
    if (!(el instanceof HTMLElement) || !k) return;
    if (f) { el.scrollTop = 0; return; }
    el.scrollTop = listScroll;
    const onScroll = () => { listScroll = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [f, k]);

  if (!k) {
    return (
      <div className="at-panel" ref={rootRef}>
        <KnowledgeLoading error={error} what="UI 风格图谱" />
        {error && <div className="at-pad"><button className="btn small" onClick={retry}>重试</button></div>}
      </div>
    );
  }
  return (
    <div className="at-panel" ref={rootRef}>
      {f ? <FamilyPage k={k} f={f} /> : <AtlasList k={k} missing={sel} />}
    </div>
  );
}

/* ======================================================================
 * 列表：门类 → 家族 → 子族
 * ====================================================================== */

interface Row { f: KFamily; subs: KFamily[] }

function AtlasList({ k, missing }: { k: UiKnowledge; missing: string | null }) {
  const q = useAtlas((s) => s.q);
  const setting = useAtlas((s) => s.setting);
  const mood = useAtlas((s) => s.mood);
  const needsOnly = useAtlas((s) => s.needsOnly);
  const openGroups = useAtlas((s) => s.groups);
  const setUi = useAtlas((s) => s.set);
  const fams = k.families.families;

  const textOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fams) {
      const group = f.parent ? undefined : k.groupById.get(f.group)?.name;
      m.set(f.id, [f.id, f.name, group, f.oneLiner, f.definition, ...(f.settings ?? []), ...(f.moods ?? []), ...f.exemplars.map((e) => e.name), ...strList(f.alsoKnownAs)]
        .filter(Boolean).join('\n').toLowerCase());
    }
    return m;
  }, [k, fams]);

  const active = !!q.trim() || !!setting || !!mood || needsOnly;
  const rows = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const setIds = setting ? new Set(k.families.settingIndex[setting] ?? []) : null;
    const moodIds = mood ? new Set(k.families.moodIndex[mood] ?? []) : null;
    const top = (f: KFamily) => f.parent ?? f.id;
    const passes = (f: KFamily) => (!terms.length || terms.every((t) => textOf.get(f.id)?.includes(t)))
      && (!setIds || setIds.has(top(f))) && (!moodIds || moodIds.has(top(f))) && (!needsOnly || f.needsRefs);
    // 子族继承家族的题材 / 情绪：只按题材 / 情绪筛时不逐个展开子族
    const specific = terms.length > 0 || needsOnly;
    const out = new Map<string, Row[]>();
    for (const g of k.families.groups) {
      const list: Row[] = [];
      for (const f of k.topFamiliesOf.get(g.id) ?? []) {
        const subs = specific ? (k.childrenOf.get(f.id) ?? []).filter(passes) : [];
        if (passes(f) || subs.length) list.push({ f, subs });
      }
      out.set(g.id, list);
    }
    return out;
  }, [k, textOf, q, setting, mood, needsOnly]);

  const nFam = [...rows.values()].reduce((a, r) => a + r.length, 0);
  const nSub = [...rows.values()].reduce((a, r) => a + r.reduce((b, x) => b + x.subs.length, 0), 0);
  const nNeeds = fams.filter((f) => f.needsRefs && !f.parent).length;
  const nNeedsSub = fams.filter((f) => f.needsRefs && f.parent).length;
  const allOpen = k.families.groups.every((g) => openGroups[g.id]);
  const filter = (p: Partial<Pick<AtlasUi, 'q' | 'setting' | 'mood' | 'needsOnly'>>) => setUi({ ...p, subs: {} });

  return (
    <>
      <div className="hint">
        {k.families.groups.length} 个门类 · {fams.filter((f) => !f.parent).length} 个家族 · {fams.filter((f) => f.parent).length} 个子族。
        每个家族先看一句话；点开看什么时候用、怎么失败、怎么从灰盒改过来。「套用」换皮肤和风格参数，并换到它的典型题材。
      </div>
      {missing && <p className="kn-empty">图谱里没有「{missing}」，先看看列表。</p>}
      <CurrentSkin k={k} />
      <div className="at-filters">
        <input className="search" placeholder="搜索：风格名、题材、情绪、代表作…" value={q} onChange={(e) => filter({ q: e.target.value })} />
        <div className="at-row">
          <select className="sel" value={setting} onChange={(e) => filter({ setting: e.target.value })} title="按题材筛：这种题材常用哪些 UI 风格">
            <option value="">题材：全部</option>
            {Object.entries(k.families.settingIndex).map(([s, ids]) => <option key={s} value={s}>{s}（{ids.length}）</option>)}
          </select>
          <select className="sel" value={mood} onChange={(e) => filter({ mood: e.target.value })} title="按情绪筛：想要这种感觉时可以用哪些 UI 风格">
            <option value="">情绪：全部</option>
            {Object.entries(k.families.moodIndex).map(([s, ids]) => <option key={s} value={s}>{s}（{ids.length}）</option>)}
          </select>
        </div>
        <div className="chips">
          <span className={`chip link ${needsOnly ? 'warn' : ''}`} onClick={() => filter({ needsOnly: !needsOnly })}
            title={`卡库里几乎没有截图、结论多半按定义推断：${nNeeds} 个家族、${nNeedsSub} 个子族`}>
            只看待补参考
          </span>
          {active
            ? <span className="chip link blue" onClick={() => filter({ q: '', setting: '', mood: '', needsOnly: false })}>清除筛选</span>
            : <span className="chip link" onClick={() => setUi({ groups: Object.fromEntries(k.families.groups.map((g) => [g.id, !allOpen])) })}>{allOpen ? '全部收起' : '全部展开'}</span>}
          {active && <span className="at-count">找到 {nFam} 个家族{nSub ? ` · ${nSub} 个子族` : ''}</span>}
        </div>
      </div>
      {active && nFam === 0 && <p className="kn-empty">没有符合的家族。换个词，或清除筛选。</p>}
      {k.families.groups.map((g) => {
        const list = rows.get(g.id) ?? [];
        if (active && !list.length) return null;
        const open = active || !!openGroups[g.id];
        const toggle = () => { if (!active) setUi({ groups: { ...openGroups, [g.id]: !open } }); };
        return (
          <div key={g.id} className={`at-group ${open ? 'open' : ''}`}>
            <div className="at-group-head" onClick={toggle} title={active ? undefined : open ? '收起' : '展开这个门类'}>
              <div className="at-group-line">
                {!active && <span className="at-caret">{open ? '▾' : '▸'}</span>}
                <b>{g.name}</b>
                <span className="at-count">{list.length} 族 · {g.cardCount} 张卡</span>
              </div>
              <p className={open ? '' : 'at-clamp'}>{g.description}</p>
            </div>
            {open && list.map((r) => <FamItem key={r.f.id} k={k} f={r.f} autoSubs={r.subs} />)}
          </div>
        );
      })}
    </>
  );
}

/** 当前皮肤属于哪些家族（把右栏的选择和图谱连起来） */
function CurrentSkin({ k }: { k: UiKnowledge }) {
  const skin = useStore((s) => s.values[HUD_STYLE_DEF.id]);
  const list = (k.familiesBySkin.get(String(skin)) ?? []).filter((f) => !f.parent);
  if (!list.length) return null;
  return (
    <div className="at-cur">
      <span>当前皮肤「{optLabel(HUD_STYLE_DEF.id, skin)}」属于</span>
      {list.slice(0, 4).map((f) => <FamilyChip key={f.id} k={k} id={f.id} />)}
      {list.length > 4 && <span className="chip">等 {list.length} 个</span>}
    </div>
  );
}

function CountChips({ f }: { f: KFamily }) {
  return (
    <>
      {f.needsRefs && <span className="chip warn at-needs" title="卡库里几乎看不到这种 UI，结论多半按定义推断">待补参考</span>}
      {f.kind === 'visibilityStrategy' && <span className="chip blue" title="管 HUD 什么时候出现，不管长什么样：可以叠在任何视觉家族上">显隐策略</span>}
      {f.cardCount > 0
        ? <span className="chip" title={`主归属卡 ${f.cardCount} 张，其中看得见 UI 的 ${f.seenCardCount} 张`}>{f.cardCount} 张卡</span>
        : <span className="chip" title="卡库里没有主归属卡">{Number(f.crossCount) > 0 ? `0 张 · 跨族证据 ${String(f.crossCount)}` : '暂无卡'}</span>}
    </>
  );
}

/** 最近从图谱套用、而且皮肤还没被换掉的家族（列表里高亮它） */
function useLiveApplied(k: UiKnowledge): string | null {
  const id = useAtlas((s) => s.applied?.id ?? null);
  const skin = useStore((s) => s.values[HUD_STYLE_DEF.id]);
  const f = id ? k.familyById.get(id) : undefined;
  return f && skinValueOf(familySkinId(f, k.familyById)) === String(skin) ? f.id : null;
}

function FamItem({ k, f, autoSubs }: { k: UiKnowledge; f: KFamily; autoSubs: KFamily[] }) {
  const manual = useAtlas((s) => s.subs[f.id]);
  const applied = useLiveApplied(k);
  const children = k.childrenOf.get(f.id) ?? [];
  const expanded = manual ?? autoSubs.length > 0;
  const shown = !expanded ? [] : manual ? children : autoSubs;
  const toggleSubs = () => { const s = useAtlas.getState(); s.set({ subs: { ...s.subs, [f.id]: !expanded } }); };
  return (
    <div className={`card at-fam ${applied === f.id ? 'on' : ''}`} onClick={() => openFamily(f.id)}>
      <div className="at-fam-head">
        <h4>{f.name}</h4>
        <button className="btn small" title={`套用「${f.name}」：${describe(k, f)}（可撤销）`} onClick={(e) => { e.stopPropagation(); applyIt(k, f); }}>套用</button>
      </div>
      <p>{leadOf(f)}</p>
      <div className="chips">
        <CountChips f={f} />
        {children.length > 0 && (
          <span className="chip link" onClick={(e) => { e.stopPropagation(); toggleSubs(); }} title={expanded ? '收起子族' : '展开子族'}>
            子族 {children.length} {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>
      {shown.length > 0 && (
        <div className="at-subs" onClick={(e) => e.stopPropagation()}>
          {shown.map((s) => <SubItem key={s.id} k={k} f={s} parent={f} />)}
        </div>
      )}
    </div>
  );
}

function SubItem({ k, f, parent }: { k: UiKnowledge; f: KFamily; parent?: KFamily }) {
  const applied = useLiveApplied(k);
  return (
    <div className={`at-sub ${applied === f.id ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); openFamily(f.id); }}>
      <div className="at-sub-head">
        <b>{shortName(f, parent)}</b>
        {f.needsRefs && <span className="chip warn at-needs">待补参考</span>}
        <button className="btn small ghost" title={`套用「${f.name}」：${describe(k, f)}（可撤销）`} onClick={(e) => { e.stopPropagation(); applyIt(k, f); }}>套用</button>
      </div>
      <p>{leadOf(f)}</p>
    </div>
  );
}

/* ======================================================================
 * 家族页
 * ====================================================================== */

function FamilyPage({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const [big, setBig] = useState(false);
  const parent = parentOf(k, f);
  const group = k.groupById.get(f.group);
  return (
    <div className="at-page">
      <div className="at-crumbs">
        <span className="kn-back" onClick={() => openFamily(null)}>← 图谱</span>
        <KnowBackLink k={k} />
        <span className="at-crumb" title={group?.description}>{group?.name ?? f.group}</span>
        {parent && <><span className="at-crumb">›</span><span className="chip link" onClick={() => openFamily(parent.id)}>{parent.name}</span></>}
        <span className="at-grow" />
        <button className="btn small ghost" onClick={() => setBig(true)} title="在大窗口里看这一页（两栏排版；点了套用会自动关掉，好看画面）">大窗看</button>
      </div>
      <div className="kn-detail">
        <FamilyBody k={k} f={f} />
      </div>
      {big && <BigView k={k} f={f} onClose={() => setBig(false)} />}
    </div>
  );
}

function BigView({ k, f, onClose }: { k: UiKnowledge; f: KFamily; onClose: () => void }) {
  // 大窗盖住了视口：里面点了套用 / 参数 / 截图就关掉，结果才看得见
  const close = useCallback(() => onClose(), [onClose]);
  useCloseOnAction(true, close);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog at-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>UI 风格图谱 · {f.name}</h3>
          <button className="btn small" onClick={onClose}>关闭</button>
        </div>
        <div className="dialog-body"><FamilyBody k={k} f={f} wide /></div>
      </div>
    </div>
  );
}

function FamilyBody({ k, f, wide }: { k: UiKnowledge; f: KFamily; wide?: boolean }) {
  const parent = parentOf(k, f);
  const children = k.childrenOf.get(f.id) ?? [];
  const siblings = parent ? (k.childrenOf.get(parent.id) ?? []).filter((x) => x.id !== f.id) : [];
  const principles = principlesOfFamily(k, f);
  return (
    <div className={`at-body ${wide ? 'wide' : ''}`}>
      <div className="at-top">
        <Head k={k} f={f} />
        <When k={k} f={f} />
        <ApplyBlock k={k} f={f} />
      </div>
      <div className="at-secs">
        {children.length > 0 && (
          <Sec id="subs" title="子族" count={children.length}>
            {children.map((s) => <SubItem key={s.id} k={k} f={s} parent={f} />)}
          </Sec>
        )}
        {parent && (
          <Sec id="subs" title="同一家族" count={siblings.length + 1}>
            <SubItem k={k} f={parent} />
            {siblings.map((s) => <SubItem key={s.id} k={k} f={s} parent={parent} />)}
          </Sec>
        )}
        {f.variants.length > 0 && <Sec id="variants" title="变体" count={f.variants.length}><Variants k={k} f={f} /></Sec>}
        <Sec id="def" title="定义与辨认"><Definition k={k} f={f} /></Sec>
        <Sec id="grammar" title="10 轴视觉语法"><Grammar k={k} f={f} /></Sec>
        <Sec id="convert" title="从灰盒一步步改过来"><ConvertSteps k={k} f={f} /></Sec>
        {f.artPairing.length > 0 && <Sec id="art" title="和画面怎么搭" count={f.artPairing.length}><ArtPairings f={f} /></Sec>}
        <Sec id="where" title="品类、题材与情绪"><Where k={k} f={f} /></Sec>
        {(f.exemplars.length > 0 || f.cards.length > 0) && <Sec id="ex" title="代表作" count={f.exemplars.length}><Exemplars k={k} f={f} /></Sec>}
        {f.failureModes.length > 0 && <Sec id="fail" title="容易失败的地方" count={f.failureModes.length}><Failures k={k} f={f} /></Sec>}
        {principles.length > 0 && <Sec id="principles" title="相关原则" count={principles.length}><Principles k={k} f={f} /></Sec>}
        {(f.skinGap || f.paramGaps.length > 0 || f.identityGap) && <Sec id="gaps" title="探索台还画不出的"><Gaps k={k} f={f} /></Sec>}
        {f.needsRefs && <Sec id="refs" title="待补参考"><RefsWanted f={f} /></Sec>}
      </div>
    </div>
  );
}

/** 可折叠的小节；开合跨家族记住 */
function Sec({ id, title, count, children }: { id: string; title: string; count?: number; children: ReactNode }) {
  const open = useAtlas((s) => s.secs[id] ?? SEC_DEFAULT[id] ?? true);
  const toggle = () => { const s = useAtlas.getState(); s.set({ secs: { ...s.secs, [id]: !open } }); };
  return (
    <section className={`at-sec ${open ? 'open' : ''}`}>
      <button className="at-sec-head" onClick={toggle} aria-expanded={open}>
        <span className="at-caret">{open ? '▾' : '▸'}</span>
        {title}
        {count !== undefined && <span className="at-count">{count}</span>}
      </button>
      {open && <div className="at-sec-body">{children}</div>}
    </section>
  );
}

function Head({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const [status, statusWhy] = STATUS[f.status] ?? [f.status, ''];
  const skinId = familySkinId(f, k.familyById);
  const skin = optLabel(HUD_STYLE_DEF.id, skinValueOf(skinId));
  const ownSkin = !!(f.skin ?? parentOf(k, f)?.skin);
  return (
    <>
      <h3 className="at-title">{f.name}</h3>
      <p className="at-lead">{leadOf(f)}</p>
      <div className="chips">
        <span className={`chip ${ownSkin ? 'ok' : 'warn'}`} title={ownSkin ? '探索台已有这套皮肤' : `还没有专属皮肤，套用时先借用最接近的「${skin}」`}>
          {ownSkin ? '皮肤' : '借用皮肤'}：{skin}
        </span>
        <CountChips f={f} />
        {f.describedCardCount > 0 && <span className="chip" title="商店截图里看不到 UI，按这款游戏已知的界面描述归类的卡">据描述 {f.describedCardCount} 张</span>}
        <span className="chip" title={statusWhy}>{status}</span>
        <span className="chip" title="这种风格在游戏里确实存在、能和相邻家族分开的把握">存在性：{f.confidence}</span>
        <span className={`chip ${f.evidenceConfidence === '低' ? 'warn' : ''}`} title="参考卡里看得见这种 UI 的程度">证据：{f.evidenceConfidence}</span>
        {f.grammarBasis === '推断' && <span className="chip warn" title="10 轴语法是按定义推断的，没有在参考截图里逐条核对">语法未经卡片验证</span>}
      </div>
    </>
  );
}

function When({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const parent = parentOf(k, f);
  const use = f.whenToUse ?? parent?.whenToUse;
  const avoid = f.avoidWhen ?? parent?.avoidWhen;
  if (!use && !avoid) return null;
  return (
    <div className="at-when">
      {use && <p><b className="at-ok">适用</b>{use}</p>}
      {avoid && <p><b className="at-warn">避免</b>{avoid}</p>}
      {!f.whenToUse && parent && <p className="at-dim">（沿用家族「{parent.name}」的说法）</p>}
    </div>
  );
}

/* ---------------- 套用 ---------------- */

function ApplyBlock({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const parent = parentOf(k, f);
  const applied = useAtlas((s) => s.applied);
  const lastLabel = useStore((s) => s.lastChange?.label);
  const previewLabel = useStore((s) => s.preview?.label);
  const ab = useStore((s) => s.hudABOn);
  const hud = familyPreview(k, f, 'hud');
  const dwell = familyPreview(k, f, 'dwell');
  const ctxParams = { ...(parent?.context?.params ?? {}), ...(f.context?.params ?? {}) };
  const hasLayout = Object.keys(ctxParams).length > 0;
  const lite = f.hudLite ?? parent?.hudLite;
  const dwellShort = dwell.screen ? optLabel('cnt.screen', dwell.screen).split(/\s*\/\s*/)[0] : '';
  const just = applied?.id === f.id && applied.label === lastLabel;
  const previewing = applied?.id === f.id && applied.label === previewLabel;
  const main = familyPreview(k, f);
  const hasDemo = !!main.demo && main.demo !== 'none' && main.demo !== 'auto';
  return (
    <div className="at-apply">
      <button className="btn primary at-apply-main" onClick={() => applyIt(k, f)} title="换皮肤与风格参数，并换到这个家族的典型题材；你手动改过的风格、内容与版式值会回到跟随（当前界面类型不动）">
        套用（在它的典型题材里看）
      </button>
      <div className="at-ctx">会换：{describe(k, f)}</div>
      {(sceneOfPack(main.pack) || hasDemo) && (
        <div className="at-apply-row">
          <SceneButton pack={main.pack} />
          {hasDemo && (
            <button className="btn small ghost" onClick={() => playDemoScript(main.demo!)} title="这个家族的 HUD 只在事件里出现：从头播放它的流程演示（chk.demo）">▶ 播放流程演示</button>
          )}
        </div>
      )}
      <div className="at-apply-row">
        <button className="btn small" onClick={() => applyIt(k, f, { preview: false })} title={`只换${describe(k, f, { preview: false })}；示例游戏、版式、当前界面都不动`}>只换风格</button>
        {hud.screen === 'screen.hud' && <button className="btn small" onClick={() => applyIt(k, f, { screen: 'hud' })} title={`套用并切到局内 HUD：${describe(k, f, { screen: 'hud' })}`}>看局内 HUD</button>}
        {dwell.screen && dwell.screen !== hud.screen && (
          <button className="btn small" onClick={() => applyIt(k, f, { screen: 'dwell' })} title={`套用并切到停留型界面：${describe(k, f, { screen: 'dwell' })}`}>看「{dwellShort}」界面</button>
        )}
        {hasLayout && (
          <button className="btn small" onClick={() => applyIt(k, f, { layout: true })} title={`再写 ${Object.keys(ctxParams).length} 项家族建议的版式（分栏、元素摆法……）：${describe(k, f, { layout: true })}`}>同时套版式</button>
        )}
        {lite && <button className="btn small" onClick={() => applyIt(k, f, { lite: true })} title={`HUD 减配：${lite.note}`}>HUD 减配版</button>}
        <button className="btn small ghost" onClick={() => compareIt(k, f)}
          title={`${ab ? '把现在右边的 UI 存进左半边（A）' : '左半边（A）保留现在的 UI'}，右半边只换成这个家族的风格（题材不变，方便比）；会覆盖 A 槽。和顶栏的「A|B 对比」（截图对照）不是一回事；视口底部的小横条可以关掉它`}>
          UI 左右对比（A/B）
        </button>
        {ab && <button className="btn small on" onClick={() => useStore.getState().setHudABOn(false)} title="关掉 UI 左右对比（右边的值保留）">关掉 UI 左右对比</button>}
      </div>
      {lite && <p className="at-dim">HUD 减配：{lite.note}{lite.channels.length > 0 && `（保留：${lite.channels.join('、')}）`}</p>}
      <p className={`at-note ${just ? 'done' : ''}`}>
        {previewing ? '预览中：在画框下方点「采用」或「取消」。' : just ? '已采用 · Ctrl+Z 撤销' : '套用先在画框上预览，点「采用」才算数（一步，可以撤销）。'}
        家族的参数在右栏显示为「手动」：之后单独换皮肤盖不过它们（起点页会提示，一键回到跟随）。
        {ab && ' UI 左右对比开着：套用只改右半边（B）。'}
      </p>
    </div>
  );
}

/** 同时换建议场景：示例游戏（内容包）建议的 3D 场景（与右栏内容页 PackBar 的"建议场景（套用）"同一写法，可撤销） */
const sceneOfPack = (pack: string): string | null => { const sc = packById(pack).scene; return SCENE_MAP.has(sc) && hasSceneBuilder(sc) ? sc : null; };
function SceneButton({ pack }: { pack: string }) {
  const scene = useStore((s) => strOf(s.values, 'game.scene'));
  const p = packById(pack);
  if (!sceneOfPack(pack)) return null;
  const here = scene === p.scene;
  const name = sceneMeta(p.scene).name;
  return (
    <button className="btn small ghost" disabled={here} onClick={() => goScene(p.scene, name)}
      title={here ? '画面已经是这个场景' : `把画面场景换成示例游戏「${p.game.name}」建议的"${name}"：只换环境，画风和 UI 不动（不算改动，可撤销）`}>
      同时换建议场景（{name}）
    </button>
  );
}

function Variants({ k, f }: { k: UiKnowledge; f: KFamily }) {
  return (
    <>
      {f.variants.map((v) => {
        const n = Object.keys(v.params ?? {}).length;
        return (
          <div key={v.id} className="at-variant">
            <div className="at-variant-head">
              <b>{v.name}</b>
              {n > 0 && <button className="btn small" onClick={() => applyIt(k, f, { variant: v.id })} title={`套用「${f.name}」，再叠上这个变体的 ${n} 项差异（可撤销）`}>套用变体</button>}
            </div>
            <p>{v.diff}</p>
            {v.kindNote && <p className="at-dim">{v.kindNote}</p>}
            {v.cards.length > 0 && <CardChips k={k} ids={v.cards} max={6} />}
          </div>
        );
      })}
    </>
  );
}

/* ---------------- 定义与语法 ---------------- */

function Definition({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const aka = strList(f.alsoKnownAs);
  const nearest = str(f.nearest);
  const culture = str(f.culturalSource);
  return (
    <>
      <p>{f.definition}</p>
      {f.distinctFrom && <p><b>别和这些混：</b>{f.distinctFrom}</p>}
      {aka.length > 0 && <p><b>又叫：</b>{aka.join('、')}</p>}
      {nearest && <p><b>最接近的已有风格：</b>{nearest}</p>}
      {culture && <p><b>文化来源与注意：</b>{culture}</p>}
      {f.parent && !f.oneLiner && <p className="at-dim">子族只写和家族「{parentOf(k, f)?.name}」不同的地方；套用时先套家族、再叠子族。</p>}
    </>
  );
}

interface ParamItem { key: string; value: unknown; inherit: boolean }

function Grammar({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const parent = parentOf(k, f);
  const byAxis = useMemo(() => {
    const axisOf = new Map<string, string>();
    for (const a of k.families.axes) for (const p of a.params) axisOf.set(p, a.id);
    const own = f.params ?? {};
    const items: ParamItem[] = [
      ...Object.entries(own).map(([key, value]) => ({ key, value, inherit: false })),
      ...Object.entries(parent?.params ?? {}).filter(([key]) => !(key in own)).map(([key, value]) => ({ key, value, inherit: true })),
    ];
    const m = new Map<string, ParamItem[]>();
    for (const x of items) {
      const ax = axisOf.get(baseKeyOf(x.key)) ?? axisOf.get(x.key.split('@')[0]) ?? 'other';
      const list = m.get(ax);
      if (list) list.push(x); else m.set(ax, [x]);
    }
    return m;
  }, [k, f, parent]);
  const other = byAxis.get('other');
  return (
    <div className="at-grammar">
      {k.families.axes.map((a) => (
        <div key={a.id} className="at-ax">
          <div className="at-ax-name" title={a.question}>{a.name}</div>
          <div className="at-ax-body">
            <p>{f.grammar?.[a.grammarKey] || '—'}</p>
            <ParamList list={byAxis.get(a.id)} />
          </div>
        </div>
      ))}
      {other && (
        <div className="at-ax">
          <div className="at-ax-name" title="组件、状态、交互、层级、与画面的关系……">其他</div>
          <div className="at-ax-body"><ParamList list={other} /></div>
        </div>
      )}
      <p className="at-dim">悬停轴名看它问的问题；点参数跳到右栏去调。{parent && `浅色的参数来自家族「${parent.name}」，这个子族没改。`}</p>
    </div>
  );
}

function ParamList({ list }: { list?: ParamItem[] }) {
  if (!list?.length) return null;
  return (
    <div className="chips">
      {list.map(({ key, value, inherit }) => {
        const v = Array.isArray(value) ? value : toStoreVal(value);
        const color = typeof v === 'string' && HEX.test(v) ? v : null;
        return (
          <span key={key} className={`at-param ${inherit ? 'at-inherit' : ''}`}>
            {color && <i className="at-swatch" style={{ background: color }} />}
            <ParamChip id={key} value={v} />
          </span>
        );
      })}
    </div>
  );
}

function ConvertSteps({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const parent = parentOf(k, f);
  const own = !!f.convertParams?.length;
  const texts = (f.convert?.length ? f.convert : parent?.convert) ?? [];
  const runnable = !!convertPatch(k, f, 0, {});
  if (!texts.length && !runnable) return <p className="at-dim">这个家族没有分步改造数据。</p>;
  const go = (step: number) => run(convertPatch(k, f, step, useStore.getState().values), f.id);
  return (
    <>
      <p className="at-dim">
        从中性的灰盒出发，按"形与线 → 面与色 → 字 → 材质与饰件 → 图标与动效"一步步加，看清每一步给风格添了什么。只改风格，不换题材。
        {!own && parent && ` 子族没有自己的步骤，用家族「${parent.name}」的。`}
      </p>
      <ol className="at-convert">
        {runnable && (
          <li>
            <button className="btn small" onClick={() => go(0)} title="皮肤换成灰盒，手动改过的风格参数回到跟随">0 · 灰盒</button>
            <span>中性基线：先看清结构</span>
          </li>
        )}
        {texts.map((t, i) => {
          const cut = t.indexOf('：');
          const head = cut > 0 ? t.slice(0, cut) : `第 ${i + 1} 步`;
          const body = cut > 0 ? t.slice(cut + 1) : t;
          return (
            <li key={i}>
              {runnable
                ? <button className="btn small" onClick={() => go(i + 1)} title={`从灰盒开始，累加前 ${i + 1} 步的参数（可撤销）`}>到第 {i + 1} 步</button>
                : <span className="chip">第 {i + 1} 步</span>}
              <span><b>{head}</b><small>{body}</small></span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/* ---------------- 搭配、品类、代表作 ---------------- */

function ArtPairings({ f }: { f: KFamily }) {
  return (
    <>
      {f.artPairing.map((a, i) => {
        const r = a.recipeId ? RECIPE_MAP.get(a.recipeId) : undefined;
        const [rel, relWhy, cls] = RELATION[a.relation] ?? [a.relation, '', ''];
        return (
          <div key={i} className="at-pairing">
            <div className="at-pairing-head"><span className={`chip ${cls}`} title={relWhy}>{rel}</span><b>{a.artStyle}</b></div>
            <p>{a.why}</p>
            {r && (
              <button className="btn small" onClick={() => applyRecipe(r)} title={`整套画面换成配方「${r.name}」（保留场景、种子与品类；UI 不变，可撤销）`}>
                画面换成「{r.name}」
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

function Where({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const parent = parentOf(k, f);
  const genres = [...(f.genres?.length ? f.genres : parent?.genres ?? [])].sort((a, b) => b.count - a.count);
  const settings = f.settings ?? parent?.settings ?? [];
  const moods = f.moods ?? parent?.moods ?? [];
  const screens = Object.entries(f.screenCounts ?? {}).sort((a, b) => b[1] - a[1]);
  const pick = (p: Partial<Pick<AtlasUi, 'setting' | 'mood'>>) => {
    useAtlas.getState().set({ q: '', setting: '', mood: '', needsOnly: false, subs: {}, ...p });
    listScroll = 0;
    openFamily(null);
  };
  return (
    <>
      {genres.length > 0 && (
        <div className="at-genres">
          {genres.map((g) => {
            const ch = k.chapterById.get(g.genre);
            const label = `${ch?.label ?? g.genre}${g.count ? ` · ${g.count}` : ''}`;
            return (
              <div key={g.genre} className="at-genre">
                {ch ? <PrincipleChip k={k} id={`G-${g.genre}`} label={label} /> : <span className="chip">{label}</span>}
                <span>{g.why}</span>
              </div>
            );
          })}
          <p className="at-dim">{genres.some((g) => g.count) ? '数字是这个家族在该品类的参考卡数；' : '还没有参考卡，品类按定义推断；'}点品类看那一品类的 UI 惯例（UI 原则 · 品类篇）。</p>
        </div>
      )}
      {settings.length > 0 && (
        <div className="chips">
          <span className="at-label">题材</span>
          {settings.map((s) => <span key={s} className="chip link" onClick={() => pick({ setting: s })} title="看同题材的其他 UI 风格">{s}</span>)}
        </div>
      )}
      {moods.length > 0 && (
        <div className="chips">
          <span className="at-label">情绪</span>
          {moods.map((m) => <span key={m} className="chip link" onClick={() => pick({ mood: m })} title="看能营造这种情绪的其他 UI 风格">{m}</span>)}
        </div>
      )}
      {screens.length > 0 && (
        <div className="chips">
          <span className="at-label">截图里</span>
          {screens.slice(0, 8).map(([s, n]) => <span key={s} className="chip" title="参考卡截图里出现这种界面的次数">{optLabel('cnt.screen', s)} {n}</span>)}
        </div>
      )}
    </>
  );
}

function Exemplars({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const setRef = useStore((s) => s.setRefImage);
  return (
    <>
      {!LOCAL_REFS && <p><RefNote /></p>}
      {f.exemplars.map((e) => {
        const name = e.name || cardName(k, e.card);
        const shot = k.cardById.get(e.card)?.shots?.[0];
        const url = cardShotUrl(k, e.card);
        return (
          <div key={e.card} className={`at-ex ${LOCAL_REFS ? 'thumb' : ''}`}>
            {LOCAL_REFS && (
              <div className="at-ex-img">
                {shot
                  ? <RefImage path={shot} alt={name} onClick={url ? () => setRef({ url, label: name }) : undefined} />
                  : <span className="kn-note">{k.cardById.has(e.card) ? '没有截图' : '参考库外'}</span>}
              </div>
            )}
            <div className="at-ex-text">
              <b>{name}</b>
              {e.evidence === 'described' && <span className="chip warn" title="商店截图里看不到 UI，按这款游戏已知的界面描述归类">据已知描述</span>}
              {e.cross && <span className="chip" title="这张卡主归属在别的家族，这里当旁证">跨族证据</span>}
              <p>{e.why}</p>
              {e.cross && e.homeFamily && <div className="chips"><span className="at-label">主归属</span><FamilyChip k={k} id={e.homeFamily} /></div>}
            </div>
          </div>
        );
      })}
      {f.cards.length > 0 && (
        <details className="at-more">
          <summary>全部主归属卡（{f.cards.length}）</summary>
          <CardThumbs k={k} ids={f.cards} max={40} />
        </details>
      )}
      {LOCAL_REFS && <p className="at-dim">点截图放到视口右下角对照。</p>}
    </>
  );
}

/* ---------------- 失败、原则、缺口 ---------------- */

function Failures({ k, f }: { k: UiKnowledge; f: KFamily }) {
  return (
    <>
      {f.failureModes.map((m) => (
        <div key={m.id} className="at-fail">
          <p>{m.desc}</p>
          <div className="chips">
            <span className="chip" title="这条结论的依据：评测 / 截图 / 据已知描述 / 推断">依据：{m.basis}</span>
            <CardChips k={k} ids={m.evidence} max={5} />
          </div>
          {m.background && <p className="at-dim">{m.background}</p>}
          {m.note && <p className="at-dim">{m.note}</p>}
        </div>
      ))}
    </>
  );
}

function Principles({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const [all, setAll] = useState(false);
  // 图谱自己点名的"最相关的几条"排最前，其余保持原顺序
  const list = useMemo(() => {
    const top = f.relatedPrinciples ?? parentOf(k, f)?.relatedPrinciples ?? [];
    const rank = (id: string) => { const i = top.indexOf(id); return i < 0 ? top.length : i; };
    return principlesOfFamily(k, f).map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.principle.id) - rank(b.x.principle.id) || a.i - b.i).map(({ x }) => x);
  }, [k, f]);
  const shown = all ? list : list.slice(0, 8);
  return (
    <>
      {shown.map(({ principle, how }) => (
        <div key={principle.id} className="at-pr">
          <PrincipleChip k={k} id={principle.id} />
          {how && <p>{how}</p>}
        </div>
      ))}
      {list.length > shown.length && <span className="chip link" onClick={() => setAll(true)}>再看 {list.length - shown.length} 条</span>}
    </>
  );
}

interface GapRow { id: string; gap: string; target?: string }

function Gaps({ k, f }: { k: UiKnowledge; f: KFamily }) {
  const gapById = useMemo(() => {
    const raw = k.families.paramGaps;
    const rows = Array.isArray(raw) ? (raw as GapRow[]) : [];
    return new Map(rows.map((g) => [g.id, g]));
  }, [k]);
  const gapChip = (ref: string) => {
    const g = gapById.get(ref);
    return <span className="chip" title={g ? `${g.gap}${g.target ? `\n→ ${g.target}` : ''}` : ref}>{ref}</span>;
  };
  // 已经能画的缺口（resolvedBy）挪到最后的「已能画」一栏，能画一部分的（partialBy）留在原处、注明做到哪（中期审查修复 ⑱：原来 B1–B5 关掉的缺口照样列成「画不出」）
  const ig = f.identityGap, open = f.paramGaps.filter((g) => !g.resolvedBy), done = f.paramGaps.filter((g) => g.resolvedBy);
  const how = (by: string, part = false) => <span className="at-dim">（{part ? '部分能画：' : '已能画：'}{by}）</span>;
  return (
    <>
      <p className="at-dim">探索台现在画不出、或画不准的地方；画面上看着不像时，多半是这里缺。</p>
      {ig && !ig.resolvedBy && <p><b>少了就认不出：</b>{ig.element} {gapChip(ig.ref)}{ig.partialBy && how(ig.partialBy, true)}</p>}
      {f.skinGap && <p><b>皮肤还差：</b>{f.skinGap}</p>}
      {open.length > 0 && (
        <ul className="at-gaps">
          {open.map((g, i) => <li key={i}>{g.text} {gapChip(g.ref)}{g.partialBy && how(g.partialBy, true)}</li>)}
        </ul>
      )}
      {(ig?.resolvedBy || done.length > 0) && (
        <>
          <p><b>已能画（M12b）：</b></p>
          <ul className="at-gaps at-done">
            {ig?.resolvedBy && <li>{ig.element} {gapChip(ig.ref)}{how(ig.resolvedBy)}</li>}
            {done.map((g, i) => <li key={i}>{g.text} {gapChip(g.ref)}{how(g.resolvedBy!)}</li>)}
          </ul>
        </>
      )}
    </>
  );
}

function RefsWanted({ f }: { f: KFamily }) {
  const list = f.refsWanted ?? [];
  return (
    <>
      <p className="at-needs">卡库里几乎看不到这种 UI，上面的语法和参数多半按定义推断，套出来的样子仅供参考。</p>
      {list.length > 0 && (
        <ul className="at-gaps">
          {list.map((r, i) => (
            <li key={i}>
              <b>{r.name}</b>
              {r.appid ? <> <a href={`https://store.steampowered.com/app/${r.appid}/`} target="_blank" rel="noreferrer">Steam</a></> : null}
              {r.why && `：${r.why}`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
