import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  applyApproach, cardName, demoRunnable, demosOf, genreLayoutFill, IS_DEV, LOCAL_REFS, isContentKey, principleOneLiner, toStoreValues, valueMatches, withoutTools,
  type KAntiPattern, type KApproach, type KDemo, type KGenreChapter, type KPrinciple, type KSourceRef, type UiKnowledge,
} from '../../content/uiKnowledge';
import { getParam, isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { manualUiKeys } from '../../hud/sys/apply';
import { useStore } from '../../state/store';
import { startPreview } from './preview';
import { CardChips, CardThumb, CardThumbs, FamilyChip, KnowBackLink, KnowledgeLoading, ParamChip, PrincipleChip, RichText } from './KnowledgeBits';
import { useCloseOnAction } from '../hud/useCloseOnAction';
import { demoChangeNote, demoShortTitle, endDemo, keyLabel, recipeName, startDemo, valueLabel, withRecipeNames } from './principleDemo';
import { useUiKnowledgeState } from './useUiKnowledge';
import '../hud/principles.css';

/*
 * 左栏"UI 原则"（G2，docs/t1-tool-knowledge.md）：9 个领域 → 85 条原则（可搜索）+ 总则 12 条 + 23 个品类篇；
 * 原则页：结论（标题）→ 为什么 → 演示（UI A/B）→ 做法谱系（每个做法：适用、代价、会改哪些参数、例子游戏、"套用"）→ 经验法则、反例、品类、换一种风格、相关原则、文献；
 * 品类篇页：要回答的问题、HUD 组织方式（可套用）、元素、界面惯例、风格倾向、代表作、坑、演示。
 * 数据懒加载（useUiKnowledgeState）；「套用这个做法 / 套用这种组织」是临时预览（§4.3，preview.ts）：学习库收成「预览：X · 采用 · 取消」，
 * 采用后写成普通改动（一步可撤销）；按钮的 title 写明会改什么。对比演示走 principleDemo（学习库会收起，演示在画框上跑）。
 * 归属：B2。演示的动作在 principleDemo.ts，视口演示条在 DemoBanner.tsx。
 */

/* ---------- 跨页签记住的界面状态（切走再回来还在原处） ---------- */
let lastQuery = '';
let listScroll = 0;
let pendingArea: string | null = null;
const foldMem = new Map<string, boolean>();

const open = (id: string | null, how?: 'push' | 'replace') => useStore.getState().openKnowledge('principle', id, how);
const chapterKey = (ch: KGenreChapter) => `G-${ch.genre}`;

export function PrinciplesPanel() {
  const [attempt, setAttempt] = useState(0);
  return <PanelBody key={attempt} onRetry={() => setAttempt((x) => x + 1)} />;
}

function PanelBody({ onRetry }: { onRetry: () => void }) {
  const { k, error } = useUiKnowledgeState();
  const sel = useStore((s) => s.knowSel.principle);
  if (!k) {
    return (
      <div className="pr-panel">
        <KnowledgeLoading error={error} what="UI 原则" />
        {error ? <button className="btn small pr-retry" onClick={onRetry}>重新加载</button> : <ListSkeleton />}
      </div>
    );
  }
  return <div className="pr-panel">{sel ? <PageFrame k={k} id={sel} /> : <PrincipleList k={k} />}</div>;
}

/** 加载中的占位：和列表差不多高，加载完不跳 */
function ListSkeleton() {
  return <div className="pr-skeleton">{Array.from({ length: 9 }, (_, i) => <div key={i} />)}</div>;
}

/* ======================================================================
 * 小件
 * ====================================================================== */

/** 可折叠小节：收起时不渲染内容；展开状态按 id 记住（换一条原则还是同样的展开方式） */
function Fold({ id, title, count, open: init = false, children }: { id: string; title: ReactNode; count?: number; open?: boolean; children: ReactNode }) {
  const [on, setOn] = useState(() => foldMem.get(id) ?? init);
  if (count === 0) return null;
  return (
    <details className="pr-fold" open={on} onToggle={(e) => { const v = e.currentTarget.open; foldMem.set(id, v); setOn(v); }}>
      <summary>{title}{count !== undefined && <span className="pr-count">{count}</span>}</summary>
      {on && <div className="pr-fold-body">{children}</div>}
    </details>
  );
}

/** 选项的中文名（元素、界面类型、内容包这类 id 在正文里出现时换成名字）；正文里 id 的替换用 KnowledgeBits 的 RichText（演示条也用它） */
const optLabel = (param: string, v: string) => getParam(param)?.options?.find((o) => o.value === v)?.label;

/** 反例 / 坑：描述、依据、例子游戏、证据（折叠） */
function AntiItem({ k, x }: { k: UiKnowledge; x: KAntiPattern }) {
  return (
    <div className="pr-anti">
      <p><RichText k={k} text={x.desc} /></p>
      <div className="chips">
        {x.basis && <span className="chip warn">依据：{x.basis}</span>}
        <CardChips k={k} ids={x.examples} max={5} />
      </div>
      {x.reviewEvidence && (
        <details className="pr-more"><summary>证据</summary><p><RichText k={k} text={x.reviewEvidence} /></p></details>
      )}
    </div>
  );
}

/** 一条文献：标题（外链）· 作者 / 年份 · 这条原则从它取了什么 */
function SourceItem({ k, s }: { k: UiKnowledge; s: KSourceRef }) {
  const meta = k.sourceById.get(s.ref);
  const by = [meta?.author, meta?.year].filter(Boolean).join('，');
  return (
    <li>
      {/^https?:\/\//.test(s.url)
        ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
        : <span title={s.url}>{s.title}<span className="term">（本项目文档）</span></span>}
      {by && <span className="term"> · {by}</span>}
      {s.point && <p>{s.point}</p>}
    </li>
  );
}

/* ======================================================================
 * 列表
 * ====================================================================== */

interface SearchRow { id: string; fields: [string, string][] }
interface Hit { id: string; why?: string; rank: number }

/** 搜索索引：标题、问题、做法（名字 / 适用 / 代价 / 参数名）、经验法则、反例、例子游戏名、品类 */
function buildSearch(k: UiKnowledge): SearchRow[] {
  const rows: SearchRow[] = [];
  const low = (f: [string, string][]): [string, string][] => f.map(([l, t]) => [l, t.toLowerCase()]);
  for (const p of k.principles.principles) {
    const f: [string, string][] = [['标题', p.title], ['问题', p.problem]];
    for (const a of p.approaches) f.push([`做法「${a.name}」`, [a.name, a.whenToUse, a.cost, ...Object.keys(a.params ?? {}).map(keyLabel)].join(' ')]);
    f.push(['经验法则', p.rules.join(' ')], ['反例', p.antiPatterns.map((x) => x.desc).join(' ')], ['品类', p.genreNotes.join(' ')]);
    for (const c of new Set([...p.approaches.flatMap((a) => a.examples), ...p.antiPatterns.flatMap((x) => x.examples)])) f.push([`例子「${cardName(k, c)}」`, cardName(k, c)]);
    rows.push({ id: p.id, fields: low(f) });
  }
  for (const g of k.principles.genres) {
    rows.push({ id: chapterKey(g), fields: low([['标题', g.label], ['问题', g.summary], ['子类型', g.subgenres.join(' ')], ['要回答的问题', g.coreQuestions.join(' ')]]) });
  }
  return rows;
}

function runSearch(rows: SearchRow[], q: string): Hit[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out: Hit[] = [];
  for (const r of rows) {
    if (!terms.every((t) => r.fields.some(([, s]) => s.includes(t)))) continue;
    const i = r.fields.findIndex(([, s]) => s.includes(terms[0]));
    out.push({ id: r.id, why: i > 1 ? r.fields[i][0] : undefined, rank: Math.min(i, 2) });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/** 领域里的原则（按 areas[].principles 的顺序，漏掉的补在后面） */
function areaPrinciples(k: UiKnowledge, areaId: string): KPrinciple[] {
  const a = k.areaById.get(areaId);
  const listed = (a?.principles ?? []).map((id) => k.principleById.get(id)).filter((p): p is KPrinciple => !!p);
  return [...listed, ...k.principles.principles.filter((p) => p.area === areaId && !listed.includes(p))];
}

/** 全部原则的浏览顺序（上一条 / 下一条） */
function principleOrder(k: UiKnowledge): string[] {
  return k.principles.areas.flatMap((a) => areaPrinciples(k, a.id).map((p) => p.id));
}

function PrincipleList({ k }: { k: UiKnowledge }) {
  const [q, setQ] = useState(lastQuery);
  const rows = useMemo(() => buildSearch(k), [k]);
  const hits = useMemo(() => runSearch(rows, q), [rows, q]);
  const ref = useRef<HTMLDivElement>(null);

  // 回到列表时恢复滚动位置（或滚到刚才点的领域）；滚动时随手记下
  useLayoutEffect(() => {
    const sc = ref.current?.closest('.scroll');
    if (!sc) return;
    if (pendingArea) { document.getElementById(`pr-area-${pendingArea}`)?.scrollIntoView({ block: 'start' }); pendingArea = null; }
    else sc.scrollTop = listScroll;
    const onScroll = () => { listScroll = sc.scrollTop; };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => sc.removeEventListener('scroll', onScroll);
  }, []);

  const setQuery = (v: string) => { lastQuery = v; setQ(v); };
  return (
    <div ref={ref}>
      <div className="pr-intro">每条原则的标题就是结论。点开看<b>为什么</b>、几种做法<b>各自什么时候用</b>、例子游戏，还能在视口里左右对比演示。</div>
      <div className="kn-search">
        <input className="search" placeholder="搜原则、做法、参数、游戏名（如：血条、对话、Hades）" value={q}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }} />
      </div>
      {q.trim() ? <SearchResults k={k} hits={hits} /> : (
        <>
          <CoreRules k={k} />
          {k.principles.areas.map((a) => {
            const ps = areaPrinciples(k, a.id);
            return (
              <div key={a.id} id={`pr-area-${a.id}`} className="pr-area">
                <Fold id={`area:${a.id}`} title={a.title} count={ps.length}>
                  <p className="pr-area-sum"><RichText k={k} text={a.summary} /></p>
                  {ps.map((p) => <PrincipleItem key={p.id} k={k} p={p} />)}
                </Fold>
              </div>
            );
          })}
          <div className="pr-area">
            <Fold id="chapters" title="品类篇：每个品类的 UI 惯例" count={k.principles.genres.length}>
              {k.principles.genres.map((g) => <ChapterItem key={g.genre} g={g} />)}
            </Fold>
          </div>
        </>
      )}
    </div>
  );
}

function SearchResults({ k, hits }: { k: UiKnowledge; hits: Hit[] }) {
  if (!hits.length) return <p className="kn-empty">没有找到。换个说法试试，比如"小地图""手柄""字幕""Boss"。</p>;
  return (
    <>
      <div className="pr-intro">找到 {hits.length} 条</div>
      {hits.map((h) => {
        const p = k.principleById.get(h.id);
        if (p) return <PrincipleItem key={h.id} k={k} p={p} why={h.why} showArea />;
        const g = k.chapterById.get(h.id);
        return g ? <ChapterItem key={h.id} g={g} why={h.why} /> : null;
      })}
    </>
  );
}

/** 总则 12 条：每条一个折叠，正文 + 用到的原则 + 证据卡 */
function CoreRules({ k }: { k: UiKnowledge }) {
  return (
    <div className="pr-area">
      <Fold id="core" title="总则：先读这几条" count={k.principles.core.length}>
        {k.principles.core.map((c) => (
          <Fold key={c.id} id={`core:${c.id}`} title={<span className="pr-core-title">{c.title}</span>}>
            <p className="pr-core-text"><RichText k={k} text={c.text} /></p>
            <div className="chips">{c.principles.map((id) => <PrincipleChip key={id} k={k} id={id} />)}</div>
            {c.evidence.length > 0 && <div className="chips"><span className="pr-label">例子</span><CardChips k={k} ids={c.evidence} /></div>}
          </Fold>
        ))}
      </Fold>
    </div>
  );
}

function PrincipleItem({ k, p, why, showArea }: { k: UiKnowledge; p: KPrinciple; why?: string; showArea?: boolean }) {
  return (
    <div className="card pr-item" onClick={() => open(p.id)}>
      <h4>{principleOneLiner(p)}</h4>
      <p className="pr-clamp">{p.problem}</p>
      <div className="chips">
        {showArea && <span className="chip">{k.areaById.get(p.area)?.title ?? p.area}</span>}
        <span className="chip">{p.approaches.length} 种做法</span>
        {demoRunnable(p.demo) && <span className="chip ok" title="可以在视口里左右对比着看">可对比演示</span>}
        {p.universal && <span className="chip blue" title="所有品类都适用">通用</span>}
        {why && <span className="chip warn">命中：{why}</span>}
      </div>
    </div>
  );
}

function ChapterItem({ g, why }: { g: KGenreChapter; why?: string }) {
  return (
    <div className="card pr-item" onClick={() => open(chapterKey(g))}>
      <h4>品类篇：{g.label}</h4>
      <p className="pr-clamp">{g.summary}</p>
      <div className="chips">
        <span className="chip">{g.cards} 张参考卡</span>
        {g.demos.length > 0 && <span className="chip ok">{g.demos.length} 个对比演示</span>}
        {why && <span className="chip warn">命中：{why}</span>}
      </div>
    </div>
  );
}

/* ======================================================================
 * 详情页框架：返回、上一条 / 下一条、大窗看
 * ====================================================================== */

function PageFrame({ k, id }: { k: UiKnowledge; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  // 大窗里点了演示 / 套用 / 参数 / 截图：关掉大窗，结果在视口和右栏里
  const closeBig = useCallback(() => setBig(false), []);
  useCloseOnAction(big, closeBig);
  const p = k.principleById.get(id);
  const ch = p ? undefined : k.chapterById.get(id);
  const order = useMemo(() => (ch ? k.principles.genres.map(chapterKey) : principleOrder(k)), [k, ch]);
  const i = order.indexOf(ch ? chapterKey(ch) : id);

  useLayoutEffect(() => { const sc = ref.current?.closest('.scroll'); if (sc) sc.scrollTop = 0; }, [id]);
  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [big]);

  const body = (wide: boolean) => (p ? <PrinciplePage k={k} p={p} wide={wide} /> : ch ? <ChapterPage k={k} ch={ch} wide={wide} /> : <p className="kn-empty">找不到"{id}"这一条（可能是数据更新后改了 id）。</p>);
  return (
    <div ref={ref}>
      <div className="pr-nav">
        <span className="kn-back" onClick={() => open(null)}>← 全部原则</span>
        <span className="pr-nav-sp" />
        {i >= 0 && (
          <>
            <button className="btn small ghost" disabled={i <= 0} title="上一条" onClick={() => open(order[i - 1], 'replace')}>‹</button>
            <span className="pr-nav-pos">{i + 1} / {order.length}</span>
            <button className="btn small ghost" disabled={i >= order.length - 1} title="下一条" onClick={() => open(order[i + 1], 'replace')}>›</button>
          </>
        )}
        {(p || ch) && <button className="btn small ghost" title="在大窗口里看这一页（Esc 关闭；点了演示或套用会自动关掉，好看画面）" onClick={() => setBig(true)}>大窗看</button>}
      </div>
      <KnowBackLink k={k} />
      {body(false)}
      {big && createPortal(
        <div className="dialog-mask" onClick={() => setBig(false)}>
          <div className="dialog pr-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>{p ? 'UI 原则' : '品类篇'}</h3>
              {i >= 0 && <button className="btn small ghost" disabled={i <= 0} onClick={() => open(order[i - 1], 'replace')}>‹ 上一条</button>}
              {i >= 0 && <button className="btn small ghost" disabled={i >= order.length - 1} onClick={() => open(order[i + 1], 'replace')}>下一条 ›</button>}
              <button className="btn ghost" onClick={() => setBig(false)}>关闭</button>
            </div>
            <div className="dialog-body">{body(true)}</div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ======================================================================
 * 演示
 * ====================================================================== */

function DemoList({ k, demos, owner }: { k: UiKnowledge; demos: KDemo[]; owner: string }) {
  const running = useStore((s) => s.hudDemo?.id ?? null);
  if (!demos.length) return null;
  return (
    <div className="pr-demos">
      <div className="kn-sec">对比演示：左半屏 A、右半屏 B，对比着看；结束时回到演示前（演示条上还能保留 B、或只带走关键几项）</div>
      {demos.map((d) => <DemoRow key={d.id} k={k} d={d} owner={owner} running={running === d.id} />)}
    </div>
  );
}

function DemoRow({ k, d, owner, running }: { k: UiKnowledge; d: KDemo; owner: string; running: boolean }) {
  if (!demoRunnable(d)) {
    return (
      <div className="pr-demo note">
        <b>{d.title}</b>
        <p><RichText k={k} text={d.lookAt} /></p>
      </div>
    );
  }
  const keys = d.focusKeys ?? [];
  const missing = Array.isArray(d.notYetRendered) ? (d.notYetRendered as unknown[]).map(String) : [];
  return (
    <div className={`pr-demo ${running ? 'on' : ''}`}>
      <button className={`btn small pr-demo-btn ${running ? 'on' : 'primary'}`} title={running ? '结束对比演示：UI 和画面都回到点演示之前（想保留 B、或只带走关键几项，用视口演示条上的按钮）' : demoChangeNote(d)}
        onClick={() => (running ? endDemo('restore') : startDemo(d, owner))}>{running ? '■ 结束' : '▶ 对比演示'}</button>
      <div className="pr-demo-text">
        <b>{demoShortTitle(d)}</b>
        <span className="pr-kind">{d.derivedFrom ? '只换关键几项' : d.kind === 'spectrum' ? '整套对照' : '单变量'}</span>
        {d.derivedFrom
          ? <p>从上一个对比演示的 A 出发，只换{keys.map(keyLabel).join('、')}——看效果里有多少来自它们。</p>
          : <p><b>看哪里：</b><RichText k={k} text={withRecipeNames(d.lookAt, d.art)} /></p>}
        <div className="chips">
          {!!d.art?.length && <span className="chip" title="演示会换画面配方；演示条上可以切换">画面：{d.art.map(recipeName).join(' / ')}</span>}
          {!!d.scene?.length && <span className="chip" title="演示会换场景；演示条上可以切换">场景：{d.scene.map((s) => s.label).join(' / ')}</span>}
          {d.play === 'enter' && <span className="chip">循环入场动画</span>}
          {missing.length > 0 && <span className="chip warn" title="这些效果探索台还画不出来，对比时会少一部分">还画不出：{missing.map(keyLabel).join('、')}</span>}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
 * 原则页
 * ====================================================================== */

/** 这个做法的参数是不是正好都是当前值 */
const approachInUse = (a: KApproach, v: Values) => {
  const e = Object.entries(a.params ?? {});
  return e.length > 0 && e.every(([key, raw]) => valueMatches(raw, v[key]));
};

function PrinciplePage({ k, p, wide }: { k: UiKnowledge; p: KPrinciple; wide: boolean }) {
  const area = k.areaById.get(p.area);
  const inUse = useStore((s) => p.approaches.map((a) => (approachInUse(a, s.values) ? '1' : '0')).join(''));
  const toArea = () => { foldMem.set(`area:${p.area}`, true); pendingArea = p.area; open(null); };
  const extraFamilies = (p.atlasFamilies ?? []).filter((id) => !p.styleVariants.some((v) => v.family === id));
  const longNotes = p.genreNotes.filter((n) => n.length > 12);
  const shortNotes = p.genreNotes.filter((n) => n.length <= 12);
  return (
    <div className={`pr-page ${wide ? 'wide' : ''}`}>
      <h3 className="pr-title">{p.title}</h3>
      {p.oneLiner && p.oneLiner !== p.title && <p className="pr-lead">{p.oneLiner}</p>}
      <div className="chips">
        {area && <span className="chip link" title="回到列表里的这个领域" onClick={toArea}>{area.title}</span>}
        {p.universal && <span className="chip blue" title="所有品类都适用">通用原则</span>}
      </div>

      <div className="kn-sec">为什么要管这件事</div>
      <p className="pr-text"><RichText k={k} text={p.problem} /></p>

      <DemoList k={k} demos={demosOf(p)} owner={p.id} />

      <Fold id="approaches" title="几种做法，各自什么时候用" count={p.approaches.length} open>
        <div className="pr-approaches">
          {p.approaches.map((a, i) => <ApproachCard key={a.id} k={k} p={p} a={a} using={inUse[i] === '1'} wide={wide} />)}
        </div>
      </Fold>

      <Fold id="rules" title="经验法则" count={p.rules.length} open>
        <ul className="pr-rules">{p.rules.map((r, i) => <li key={i}><RichText k={k} text={r} /></li>)}</ul>
      </Fold>

      <Fold id="anti" title="反例：常见做错的样子" count={p.antiPatterns.length}>
        {p.antiPatterns.map((x) => <AntiItem key={x.id} k={k} x={x} />)}
      </Fold>

      <Fold id="genres" title="哪些品类特别在意" count={p.genres.length + p.genreNotes.length}>
        <div className="chips">
          {p.genres.map((g) => <PrincipleChip key={g} k={k} id={`G-${g}`} label={k.chapterById.get(g)?.label ?? g} />)}
          {shortNotes.map((n) => <span key={n} className="chip">{n}</span>)}
        </div>
        {longNotes.length > 0 && <ul className="pr-rules">{longNotes.map((n, i) => <li key={i}><RichText k={k} text={n} /></li>)}</ul>}
      </Fold>

      <Fold id="variants" title="同一原则，换一种风格怎么做" count={p.styleVariants.length + extraFamilies.length}>
        <div className="pr-variants">
          {p.styleVariants.map((v) => (
            <div key={v.family}><FamilyChip k={k} id={v.family} label={v.name} /> <RichText k={k} text={v.how} /></div>
          ))}
        </div>
        {extraFamilies.length > 0 && (
          <div className="chips"><span className="pr-label">图谱里也相关</span>{extraFamilies.map((id) => <FamilyChip key={id} k={k} id={id} />)}</div>
        )}
      </Fold>

      <Fold id="related" title="相关原则" count={p.related.length} open>
        <div className="chips">{p.related.map((id) => <PrincipleChip key={id} k={k} id={id} />)}</div>
      </Fold>

      <Fold id="sources" title="出处与文献" count={p.sources.length}>
        <ul className="pr-sources">{p.sources.map((s, i) => <SourceItem key={i} k={k} s={s} />)}</ul>
      </Fold>
    </div>
  );
}

function ApproachCard({ k, p, a, using, wide }: { k: UiKnowledge; p: KPrinciple; a: KApproach; using: boolean; wide: boolean }) {
  const params = Object.entries(a.params ?? {});
  const names = params.map(([key]) => keyLabel(key)).join('、');
  const hasContext = Object.keys(p.demo?.base ?? {}).length > 0;
  const apply = (context: boolean) => {
    const pt = applyApproach(p, a, { context, current: useStore.getState().values });
    if (IS_DEV && pt.dropped?.length) console.warn(`[UI 原则] ${a.id} 有存不进 Values 的键：`, pt.dropped);
    startPreview(pt.set, pt.unset, pt.label);
  };
  return (
    <div className={`pr-approach ${using ? 'on' : ''}`}>
      <div className="pr-approach-head">
        <b>{a.name}</b>
        {using && <span className="chip ok" title="右栏的这几项现在正好是这种做法的取值">当前就是</span>}
      </div>
      <div className="pr-approach-meta">
        <span>适用</span><span><RichText k={k} text={a.whenToUse} /></span>
        <span>代价</span><span><RichText k={k} text={a.cost} /></span>
      </div>
      {a.renderNote && <p className="pr-note">探索台画不全：{a.renderNote}</p>}
      {params.length > 0 && (
        <div className="chips"><span className="pr-label">会改</span>{params.map(([key, v]) => <ParamChip key={key} id={key} value={valueLabel(key, v)} />)}</div>
      )}
      {a.examples.length > 0 && (
        <>
          <div className="pr-label pr-label-block">例子游戏</div>
          <CardThumbs k={k} ids={a.examples} max={wide ? 6 : 4} />
        </>
      )}
      {params.length > 0 && (
        <div className="pr-btns">
          <button className="btn small" title={`只改这 ${params.length} 项（${names}），叠在当前 UI 上，这几项会显示为「手动」；先在画框上预览，满意了点「采用」（采用后一步可撤销）`} onClick={() => apply(false)}>套用这个做法</button>
          {hasContext && (
            <button className="btn small ghost" title={`先换成这条原则演示用的题材、界面和元素（内容包、界面类型、元素集合；当前是跟随布局时补上这个题材的品类布局），再改 ${names}；皮肤不变，色盲模拟、视距预览这类检查工具不带；先在画框上预览，满意了点「采用」（采用后一步可撤销）`} onClick={() => apply(true)}>换到演示题材再套用</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
 * 品类篇页
 * ====================================================================== */

function ChapterPage({ k, ch, wide }: { k: UiKnowledge; ch: KGenreChapter; wide: boolean }) {
  const findings = Array.isArray(ch.keyFindings) ? (ch.keyFindings as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const evidence = typeof ch.evidenceNote === 'string' ? ch.evidenceNote : '';
  return (
    <div className={`pr-page ${wide ? 'wide' : ''}`}>
      <h3 className="pr-title">品类篇：{ch.label}</h3>
      <div className="chips">
        <span className="chip">{ch.cards} 张参考卡</span>
        {ch.packs.map((pk) => <span key={pk} className="chip" title="探索台里对应的示例内容包">{optLabel('cnt.pack', pk) ?? pk}</span>)}
      </div>
      <p className="pr-text"><RichText k={k} text={ch.summary} /></p>

      <DemoList k={k} demos={ch.demos ?? []} owner={chapterKey(ch)} />

      <Fold id="g:questions" title="玩家在这个品类里要回答的问题" count={ch.coreQuestions.length} open>
        <ul className="pr-rules">{ch.coreQuestions.map((x, i) => <li key={i}><RichText k={k} text={x} /></li>)}</ul>
      </Fold>
      <Fold id="g:findings" title="要点" count={findings.length} open>
        <ul className="pr-rules">{findings.map((x, i) => <li key={i}><RichText k={k} text={x} /></li>)}</ul>
      </Fold>
      <Fold id="g:org" title="HUD 怎么组织（几种主流做法）" count={ch.hudOrganization.length}>
        {ch.hudOrganization.map((o, i) => <HudOrgCard key={i} k={k} ch={ch} o={o} />)}
      </Fold>
      <Fold id="g:elements" title="关键信息元素" count={ch.elements.length}>
        {ch.elements.map((e) => (
          <div key={e.element} className="pr-anti plain">
            <b>{optLabel('cnt.elements', e.element) ?? e.element}</b>
            {e.forms.length > 0 && <span className="term">　形态：{valueLabel(`${e.element}.form`, e.forms)}</span>}
            {!!e.anchors?.length && <span className="term">　常放：{valueLabel(`${e.element}.screenAnchor`, e.anchors)}</span>}
            <p><RichText k={k} text={e.why} /></p>
          </div>
        ))}
      </Fold>
      <Fold id="g:screens" title="各界面的惯例" count={ch.screens.length}>
        {ch.screens.map((s) => (
          <div key={s.screen} className="pr-anti plain">
            <b>{optLabel('cnt.screen', s.screen) ?? s.screen}</b>
            <p><RichText k={k} text={s.conventions} /></p>
            <div className="chips"><CardChips k={k} ids={s.examples} max={5} /></div>
          </div>
        ))}
      </Fold>
      <Fold id="g:styles" title="常见的 UI 风格" count={ch.styleTendencies.length}>
        <div className="pr-variants">
          {ch.styleTendencies.map((t) => (
            <div key={t.familyId}><FamilyChip k={k} id={t.familyId} label={t.family} /> <span className="term">{t.count} 款</span> <RichText k={k} text={t.why} /></div>
          ))}
        </div>
      </Fold>
      <Fold id="g:exemplars" title="代表作" count={ch.exemplars.length}>
        {ch.exemplars.map((x) => (
          <div key={x.card} className={`pr-ex ${LOCAL_REFS ? '' : 'nothumb'}`}>
            {LOCAL_REFS ? <CardThumb k={k} id={x.card} /> : <b>{cardName(k, x.card)}</b>}
            <p>{x.familyId && <FamilyChip k={k} id={x.familyId} />} {x.evidence && <span className="term">（{x.evidence}）</span>}<RichText k={k} text={x.why} /></p>
          </div>
        ))}
      </Fold>
      <Fold id="g:pitfalls" title="常见的坑" count={ch.pitfalls.length}>
        {ch.pitfalls.map((x) => <AntiItem key={x.id} k={k} x={x} />)}
      </Fold>
      <Fold id="g:related" title="相关原则" count={ch.relatedPrinciples.length + ch.universalPrinciples.length} open>
        <div className="chips">{ch.relatedPrinciples.map((id) => <PrincipleChip key={id} k={k} id={id} />)}</div>
        {ch.universalPrinciples.length > 0 && (
          <div className="chips"><span className="pr-label">所有品类都适用</span>{ch.universalPrinciples.map((id) => <PrincipleChip key={id} k={k} id={id} />)}</div>
        )}
      </Fold>
      <Fold id="g:subgenres" title="子类型" count={ch.subgenres.length}>
        <ul className="pr-rules">{ch.subgenres.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </Fold>
      <Fold id="g:gaps" title="探索台还缺的参数" count={ch.paramGaps.length}>
        <ul className="pr-rules">{ch.paramGaps.map((x, i) => <li key={i}><RichText k={k} text={x.need} /></li>)}</ul>
      </Fold>
      {evidence && <p className="pr-evidence"><b>证据说明：</b>{evidence}</p>}
    </div>
  );
}

/** 品类篇的一种 HUD 组织方式：说明 + 占比 + 例子 + 套用（在这个品类的示例内容里看） */
function HudOrgCard({ k, ch, o }: { k: UiKnowledge; ch: KGenreChapter; o: KGenreChapter['hudOrganization'][number] }) {
  const pack = ch.packs[0];
  const n = Object.keys(o.params ?? {}).length;
  const name = o.pattern.split(/[：:]/)[0];
  const apply = () => {
    const dropped: string[] = [];
    const values = useStore.getState().values;
    const set: Values = { ...(pack && !('cnt.pack' in (o.params ?? {})) ? { 'cnt.pack': pack } : {}), ...withoutTools(toStoreValues(o.params, dropped)) };
    // 换一种组织方式：上一种留下的手动内容 / 版式值（锚点、元素画法……）先回到跟随，免得两种混在一起；界面类型不动（与家族套用的预览情境同口径）
    const unset = manualUiKeys(values, isUiKey).filter((key) => isContentKey(key) && key !== 'cnt.screen' && key !== 'cnt.subtype' && !(key in set));
    // 只给了内容包、布局还是跟随：补上这个题材的品类布局，否则画的是四控件样本，版式参数看不出来
    const after: Values = { ...values };
    for (const key of unset) delete after[key];
    Object.assign(set, genreLayoutFill(set, after));
    if (IS_DEV && dropped.length) console.warn(`[品类篇] ${ch.label} · ${name} 有存不进 Values 的键：`, dropped);
    startPreview(set, unset, `品类篇：${ch.label} · ${name}`);
  };
  return (
    <div className="pr-approach">
      <p className="pr-text"><RichText k={k} text={o.pattern} /></p>
      {o.share && <p className="pr-share">{o.share}</p>}
      <div className="chips"><CardChips k={k} ids={o.examples} max={5} /></div>
      {n > 0 && (
        <div className="pr-btns">
          <button className="btn small" title={`改 ${n} 项版式参数${pack ? `，内容换成「${optLabel('cnt.pack', pack) ?? pack}」` : ''}；之前手动改过的内容 / 版式值回到跟随；先在画框上预览，满意了点「采用」（采用后一步可撤销）`} onClick={apply}>套用这种组织</button>
        </div>
      )}
    </div>
  );
}
