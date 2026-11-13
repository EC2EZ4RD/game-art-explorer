import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getParam, optionOf } from '../../dims/registry';
import type { Values } from '../../dims/types';
import {
  applyApproach, IS_DEV, LOCAL_REFS, type KApproach, type KGenreChapter, type KPrinciple, type ParamChapterRef, type Rationale, type UiKnowledge,
} from '../../content/uiKnowledge';
import { HUD_STYLE_DEF } from '../../hud/sys/register';
import { useStore } from '../../state/store';
import { adoptPreview, cancelPreview, startPreview, usePreviewing } from './preview';
import { CardChips, CardThumbs, FamilyChip, ParamChip, PrincipleChip } from './KnowledgeBits';
import { paramLabel, paramValueText } from '../hud/knowledgeText';
import { useUiKnowledgeState } from './useUiKnowledge';

/*
 * G1 参数行的"为什么、什么时候用"（docs/t1-tool-knowledge.md 第 7 节 B1）：
 *   WhyBadge  行头的小徽标（原则 3 · 家族 5），知识库没加载完时是灰色的"依据…"占位（不挡控件、不跳版）；
 *   ParamWhy  点开后的整块：做法（取值一致的在前，第一条展开，其余收起）→ 也讲到它的原则 / 品类篇 → 用这个取值的家族 → 例子游戏；
 *   optionWhy 选项提示里追加的一行（"做法 2 条：… · 家族：…"），按知识库缓存——在 optionWhy.ts（T0：本文件只导出组件，Fast Refresh 才能热替换）；
 *   ElementWhy 元素检查器里"各品类怎么画这个元素"（品类篇的 elements 段 + 写了这个元素的做法与家族）。
 * 数据只从 useUiKnowledgeState() 拿（懒加载），所有"套用"走 store.patch，一步可撤销。
 */

/* ---------- 小工具 ---------- */

const COLON = /[：:]/;
/** 原则标题的短头（冒号前；没有冒号或太长时用整句，放不下的由 CSS 省略） */
const shortTitle = (t: string) => { const i = t.search(COLON); return i > 0 && i <= 18 ? t.slice(0, i) : t; };
/** 标题冒号后的那半句（就是原则的一句话结论） */
const restTitle = (t: string) => { const i = t.search(COLON); return i > 0 && i <= 18 ? t.slice(i + 1).trim() : ''; };

/** 一组要写的值 → "参数＝取值" 列表（"套用"按钮旁边写清楚会改什么） */
const describeSet = (set: Values): string[] => Object.entries(set).map(([k, v]) => `${paramLabel(k)}＝${paramValueText(k, v)}`);

/** 品类篇按品类去重（同一品类篇的多个 demo 只列一次） */
const uniqueChapters = (list: ParamChapterRef[]): KGenreChapter[] => [...new Map(list.map((c) => [c.chapter.genre, c.chapter])).values()];

interface WhyCount { principles: number; chapters: number; famMatch: number; famAll: number; approachMatch: number; empty: boolean }
function whyCount(r: Rationale): WhyCount {
  const ps = new Set([...r.approaches.map((a) => a.principle.id), ...r.mentions.map((m) => m.principle.id)]);
  const chapters = uniqueChapters(r.chapters).length;
  const famMatch = r.families.filter((f) => f.match).length;
  return {
    principles: ps.size, chapters, famMatch, famAll: r.families.length, approachMatch: r.approaches.filter((a) => a.match).length,
    empty: !ps.size && !chapters && !r.families.length,
  };
}

/* ---------- 选项提示（分段按钮的 title、下拉框 <option title>）：optionWhy 在 optionWhy.ts ---------- */

/* ---------- 行头徽标 ---------- */

/** 行头的依据徽标；k = null（还在加载）时是占位；没有任何依据时不显示（工具参数显示"暂无原则"） */
export function WhyBadge({ k, r, open, onToggle }: { k: UiKnowledge | null; r: Rationale | null; open: boolean; onToggle: () => void }) {
  if (!k) return <span className="kn-badge wait" title="正在加载 UI 知识库（原则、风格家族、例子游戏）…">依据…</span>;
  if (!r) return null;
  const c = whyCount(r);
  const click = () => onToggle();
  if (c.empty) {
    if (!r.note && !r.noRationale) return null;
    return (
      <button type="button" className={`kn-badge none ${open ? 'on' : ''}`} aria-expanded={open} onClick={click} title={r.note ?? '工具参数：不是设计决策，没有对应的设计原则'}>
        暂无原则
      </button>
    );
  }
  const parts: string[] = [];
  if (c.principles) parts.push(`原则 ${c.principles}`);
  else if (c.chapters) parts.push(`品类篇 ${c.chapters}`);
  if (c.famMatch) parts.push(`家族 ${c.famMatch}`);
  else if (!parts.length) parts.push(`家族 ${c.famAll}`);
  const tip = [
    '为什么、什么时候用（点一下展开）',
    r.approaches.length ? `· ${r.approaches.length} 条做法讲到这一项${c.approachMatch ? `，其中 ${c.approachMatch} 条正是当前取值` : ''}` : '',
    r.mentions.length ? `· 另有 ${r.mentions.length} 条原则提到它` : '',
    c.chapters ? `· ${c.chapters} 个品类篇用到它` : '',
    c.famAll ? `· ${c.famMatch ? `${c.famMatch} 个风格家族用当前取值，` : ''}共 ${c.famAll} 个家族调过它` : '',
    r.approaches[0] ? `首条做法：${r.approaches[0].approach.name}` : '',
  ].filter(Boolean).join('\n');
  const hit = c.approachMatch > 0 || c.famMatch > 0;
  return (
    <button type="button" className={`kn-badge ${hit ? 'hit' : ''} ${open ? 'on' : ''}`} aria-expanded={open} onClick={click} title={tip}>
      {parts.join(' · ')}
    </button>
  );
}

/* ---------- 展开的整块 ---------- */

function Meta({ label, warn, children }: { label: string; warn?: boolean; children: ReactNode }) {
  return <div className={`kn-why-meta ${warn ? 'warn' : ''}`}><span>{label}</span><div>{children}</div></div>;
}

/**
 * "套用这个做法"：只写做法自己的参数（叠在当前值上），按钮旁写清楚改哪几项。
 * §4.3：先临时预览（不存、不进撤销），就地出现「采用 / 取消」；采用后写成普通改动（带 •、可以重置）。弹窗关掉时没采用的预览取消。
 */
function ApplyApproach({ p, a }: { p: KPrinciple; a: KApproach }) {
  const kp = useMemo(() => applyApproach(p, a), [p, a]);
  const items = useMemo(() => describeSet(kp.set), [kp]);
  const previewing = usePreviewing(kp.label);
  useEffect(() => () => { if (useStore.getState().preview?.label === kp.label) cancelPreview(); }, [kp.label]);
  if (!items.length) return null;
  const go = () => {
    if (IS_DEV && kp.dropped?.length) console.warn(`做法 ${a.id} 有存不进的键：`, kp.dropped);
    startPreview(kp.set, kp.unset, kp.label);
  };
  return (
    <div className="kn-why-act">
      {previewing ? (
        <>
          <button type="button" className="btn small primary" onClick={adoptPreview} title="写成普通改动（可以重置，一步撤销）">采用</button>
          <button type="button" className="btn small" onClick={cancelPreview} title="回到原来的样子">取消</button>
        </>
      ) : (
        <button type="button" className="btn small" onClick={go} title={`先在画框上预览"${a.name}"，会改：\n${items.join('\n')}\n（满意了点「采用」）`}>套用这个做法</button>
      )}
      <span className="kn-why-change" title={items.join('\n')}>改 {items.length} 项：{items.join('、')}</span>
    </div>
  );
}

type ApproachRef = Rationale['approaches'][number];

function ApproachItem({ k, a, rowKey, base, byValue, defaultOpen }: { k: UiKnowledge; a: ApproachRef; rowKey: string; base: string; byValue: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const p = a.principle, ap = a.approach;
  const rest = restTitle(p.title);
  const sameKey = a.key === rowKey || a.key === base;
  const tag = byValue && a.match
    ? <span className="chip ok">正是当前取值</span>
    : byValue && sameKey
      ? <span className="kn-why-val">它的取值：{paramValueText(a.key, a.value)}</span>
      : <ParamChip id={a.key} value={a.value} />;
  return (
    <div className={`kn-why-item ${byValue && a.match ? 'match' : ''}`}>
      <div className="kn-why-head"><span className="kn-why-name">{ap.name}</span>{tag}</div>
      <div className="kn-why-from">出自 <PrincipleChip k={k} id={p.id} label={shortTitle(p.title)} />{rest && <span> {rest}</span>}</div>
      <Meta label="适用">{ap.whenToUse}</Meta>
      {open ? (
        <>
          <Meta label="代价">{ap.cost}</Meta>
          {ap.renderNote && <Meta label="注意" warn>探索台画不全：{ap.renderNote}</Meta>}
          {ap.examples.length > 0 && <Meta label="例子"><CardChips k={k} ids={ap.examples} max={5} /></Meta>}
          <ApplyApproach p={p} a={ap} />
        </>
      ) : (
        <button type="button" className="kn-link kn-why-open" onClick={() => setOpen(true)}>代价、例子与套用 ▸</button>
      )}
    </div>
  );
}

const SHOW_APPROACHES = 3;
const MAX_APPROACHES = 12;

function ApproachList({ k, r, byValue }: { k: UiKnowledge; r: Rationale; byValue: boolean }) {
  const [all, setAll] = useState(false);
  const list = r.approaches;
  if (!list.length) return null;
  const shown = list.slice(0, all ? MAX_APPROACHES : SHOW_APPROACHES);
  const am = list.filter((a) => a.match).length;
  return (
    <>
      <div className="kn-sec">做法（{list.length} 条{byValue && am ? `，${am} 条正是当前取值` : ''}）</div>
      {shown.map((a, i) => <ApproachItem key={a.approach.id} k={k} a={a} rowKey={r.key} base={r.base} byValue={byValue} defaultOpen={i === 0} />)}
      {list.length > SHOW_APPROACHES && (
        <button type="button" className="kn-link kn-why-more" onClick={() => setAll(!all)}>
          {all ? `只看前 ${SHOW_APPROACHES} 条` : `更多做法（另 ${Math.min(list.length, MAX_APPROACHES) - SHOW_APPROACHES} 条）`}
        </button>
      )}
      {all && list.length > MAX_APPROACHES && <span className="kn-why-hint">其余 {list.length - MAX_APPROACHES} 条点上面的原则进原则页看</span>}
    </>
  );
}

function MoreChip({ n, open, onClick }: { n: number; open: boolean; onClick: () => void }) {
  return <span className="chip link kn-more" onClick={(e) => { e.stopPropagation(); onClick(); }}>{open ? '收起' : `另 ${n} 个`}</span>;
}

function FamilyLists({ k, r, byValue }: { k: UiKnowledge; r: Rationale; byValue: boolean }) {
  const [moreM, setMoreM] = useState(false);
  const [moreO, setMoreO] = useState(false);
  const fm = byValue ? r.families.filter((f) => f.match) : r.families;
  const fo = byValue ? r.families.filter((f) => !f.match) : [];
  const SHOW_M = 6, SHOW_O = 4;
  const title = !byValue ? '这样画它的风格家族' : r.key === HUD_STYLE_DEF.id ? '用这套皮肤的风格家族' : '用这个取值的风格家族';
  return (
    <>
      {fm.length > 0 && (
        <>
          <div className="kn-sec">{title}（{fm.length}）</div>
          <div className="chips">
            {fm.slice(0, moreM ? 40 : SHOW_M).map((f) => <FamilyChip key={f.family.id} k={k} id={f.family.id} />)}
            {fm.length > SHOW_M && <MoreChip n={Math.min(fm.length, 40) - SHOW_M} open={moreM} onClick={() => setMoreM(!moreM)} />}
          </div>
        </>
      )}
      {fo.length > 0 && (
        <>
          <div className="kn-sec">也调这一项、取值不同的家族（{fo.length}）</div>
          <div className="chips">
            {fo.slice(0, moreO ? 24 : SHOW_O).map((f) => <FamilyChip key={f.family.id} k={k} id={f.family.id} label={`${f.family.name}＝${paramValueText(f.key, f.value)}`} />)}
            {fo.length > SHOW_O && <MoreChip n={Math.min(fo.length, 24) - SHOW_O} open={moreO} onClick={() => setMoreO(!moreO)} />}
          </div>
        </>
      )}
    </>
  );
}

/** 例子游戏：名字小标签；开发环境可以切成缩略图 */
function Cards({ k, ids }: { k: UiKnowledge; ids: string[] }) {
  const [shots, setShots] = useState(false);
  if (!ids.length) return null;
  return (
    <>
      <div className="kn-sec">
        例子游戏（{ids.length}）
        {LOCAL_REFS && <button type="button" className="kn-link" onClick={() => setShots(!shots)}>{shots ? '只看名字' : '看截图'}</button>}
      </div>
      {shots ? <CardThumbs k={k} ids={ids} max={12} /> : <CardChips k={k} ids={ids} max={8} />}
    </>
  );
}

/** 参数行点开后的整块；current = 当前取值的可读写法 */
export function ParamWhy({ k, r, current, onClose }: { k: UiKnowledge; r: Rationale; current?: string; onClose?: () => void }) {
  const chapters = uniqueChapters(r.chapters);
  const c = whyCount(r);
  return (
    <div className="kn-why">
      <div className="kn-why-top">
        <b>为什么 · 什么时候用</b>
        {current && <span className="kn-why-cur" title={current}>当前：{current}</span>}
        <span className="tb-spacer" />
        {onClose && <button type="button" className="kn-link" onClick={onClose}>收起</button>}
      </div>
      {r.note && <p className="kn-why-note">{r.note}</p>}
      {c.empty && !r.note && <p className="kn-why-note">这一项还没有原则或风格家族讲到。</p>}
      <ApproachList k={k} r={r} byValue />
      {(r.mentions.length > 0 || chapters.length > 0) && (
        <>
          <div className="kn-sec">{r.approaches.length ? '也讲到这一项' : '讲到这一项的原则与品类篇'}</div>
          <div className="chips">
            {r.mentions.slice(0, 8).map((m) => <PrincipleChip key={m.principle.id} k={k} id={m.principle.id} label={shortTitle(m.principle.title)} />)}
            {chapters.slice(0, 8).map((ch) => <PrincipleChip key={ch.genre} k={k} id={`G-${ch.genre}`} />)}
          </div>
        </>
      )}
      <FamilyLists k={k} r={r} byValue />
      <Cards k={k} ids={r.cards} />
    </div>
  );
}

/* ---------- 元素检查器：这个元素在各品类里怎么画 ---------- */

interface ElementKnowledge {
  r: Rationale;
  chapters: { chapter: KGenreChapter; forms: string[]; anchors: string[]; why: string }[];
}
const elCache = new WeakMap<UiKnowledge, Map<string, ElementKnowledge>>();

/** 写了这个元素自己的键（el.vitals.* / *@el.vitals）的做法与家族，加品类篇 elements 段里它的画法与理由 */
function elementKnowledge(k: UiKnowledge, el: string): ElementKnowledge {
  let m = elCache.get(k);
  if (!m) { m = new Map(); elCache.set(k, m); }
  const hit = m.get(el);
  if (hit) return hit;
  const mine = (key: string) => key.startsWith(`${el}.`) || key.endsWith(`@${el}`);
  const approaches: Rationale['approaches'] = [];
  for (const p of k.principles.principles) for (const a of p.approaches) {
    const key = Object.keys(a.params ?? {}).find(mine);
    if (key) approaches.push({ principle: p, role: 'approach', approach: a, key, value: a.params[key], match: true });
  }
  const families: Rationale['families'] = [];
  for (const f of k.families.families) {
    const key = Object.keys(f.params ?? {}).find(mine);
    if (key) families.push({ family: f, key, value: f.params[key], match: true });
  }
  const cards: string[] = [];
  const add = (id: string) => { if (cards.length < 12 && !cards.includes(id)) cards.push(id); };
  approaches.forEach((a) => a.approach.examples.forEach(add));
  families.forEach((f) => f.family.exemplars.forEach((e) => add(e.card)));
  const chapters = k.principles.genres.flatMap((chapter) => (chapter.elements ?? []).filter((e) => e.element === el)
    .map((e) => ({ chapter, forms: e.forms ?? [], anchors: e.anchors ?? [], why: e.why })));
  const out: ElementKnowledge = { r: { key: el, base: el, approaches, mentions: [], chapters: [], families, cards }, chapters };
  m.set(el, out);
  return out;
}

/** 画法取值的名字：先查这个元素的 form 参数，再查数值图形（cmp.gauge） */
const formLabel = (el: string, f: string) => {
  for (const id of [`${el}.form`, 'cmp.gauge']) { const p = getParam(id); const o = p && optionOf(p, f); if (o) return o.label; }
  return f;
};
const anchorLabel = (a: string) => { const p = getParam('elx.screenAnchor'); return (p && optionOf(p, a)?.label) ?? a; };

function ChapterElementItem({ k, c, here, defaultOpen, el }: { k: UiKnowledge; c: ElementKnowledge['chapters'][number]; here: boolean; defaultOpen: boolean; el: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`kn-why-item ${here ? 'match' : ''}`}>
      <div className="kn-why-head">
        <PrincipleChip k={k} id={`G-${c.chapter.genre}`} label={c.chapter.label} />
        {here && <span className="chip ok">当前示例的品类</span>}
      </div>
      {c.forms.length > 0 && <Meta label="画法">{c.forms.map((f) => formLabel(el, f)).join('、')}</Meta>}
      {c.anchors.length > 0 && <Meta label="位置">{c.anchors.map(anchorLabel).join('、')}</Meta>}
      {open ? <Meta label="为什么">{c.why}</Meta> : <button type="button" className="kn-link kn-why-open" onClick={() => setOpen(true)}>为什么这样画 ▸</button>}
    </div>
  );
}

const SHOW_CHAPTERS = 3;

/** 元素检查器顶部：各品类里怎么画这个元素（当前示例内容包的品类排第一、默认展开） */
export function ElementWhy({ el, label, pack }: { el: string; label: string; pack: string }) {
  const { k } = useUiKnowledgeState();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const data = useMemo(() => (k ? elementKnowledge(k, el) : null), [k, el]);
  if (!k) return <div className="kn-el-why"><span className="kn-badge wait">依据…</span></div>;
  if (!data || (!data.chapters.length && !data.r.approaches.length && !data.r.families.length)) return null;
  const sorted = [...data.chapters].sort((a, b) => Number(b.chapter.packs.includes(pack)) - Number(a.chapter.packs.includes(pack)));
  const nHere = sorted.filter((c) => c.chapter.packs.includes(pack)).length;
  const shown = all ? sorted : sorted.slice(0, Math.max(SHOW_CHAPTERS, nHere));
  const parts = [
    data.chapters.length ? `品类篇 ${data.chapters.length}` : '',
    data.r.approaches.length ? `做法 ${data.r.approaches.length}` : '',
    data.r.families.length ? `家族 ${data.r.families.length}` : '',
  ].filter(Boolean);
  return (
    <div className="kn-el-why">
      <button type="button" className={`kn-badge hit ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)} title={`各品类里怎么画「${label}」、哪些原则与风格家族讲到它（点一下${open ? '收起' : '展开'}）`}>
        怎么画它 · {parts.join(' · ')}
      </button>
      {open && (
        <div className="kn-why">
          <div className="kn-why-top">
            <b>各品类里怎么画「{label}」</b>
            <span className="tb-spacer" />
            <button type="button" className="kn-link" onClick={() => setOpen(false)}>收起</button>
          </div>
          {shown.map((c, i) => <ChapterElementItem key={c.chapter.genre} k={k} c={c} el={el} here={c.chapter.packs.includes(pack)} defaultOpen={i === 0} />)}
          {sorted.length > shown.length && <button type="button" className="kn-link kn-why-more" onClick={() => setAll(true)}>更多品类（另 {sorted.length - shown.length} 个）</button>}
          {all && sorted.length > SHOW_CHAPTERS && <button type="button" className="kn-link kn-why-more" onClick={() => setAll(false)}>收起品类</button>}
          <ApproachList k={k} r={data.r} byValue={false} />
          <FamilyLists k={k} r={data.r} byValue={false} />
          <Cards k={k} ids={data.r.cards} />
        </div>
      )}
    </div>
  );
}
