import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CASES, awardBadge, caseGroups, type CaseEntry } from '../../content/cases';
import { NUDGES } from '../../content/nudges';
import { RECIPE_MAP } from '../../content/recipes';
import { SCENES, SCENE_CATEGORIES } from '../../content/sceneCatalog';
import { CAP_LABEL, capabilityOf, effectiveApprox, type CapState, type StyleEntry } from '../../content/styles';
import { MOODS, STYLES } from '../../content/styles.data';
import { GALLERY, REF_ONLY, cardName, refThumbUrl, showcaseScene, thumbUrl, type RefOnlyCard } from '../../content/taxonomy';
import { principleOneLiner, type KFamily, type KPrinciple, type KReplica, type UiKnowledge } from '../../content/uiKnowledge';
import { defaultValues, getParam } from '../../dims/registry';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { applyMood, applyNudge, applyStyle, focusParam } from '../../state/actions';
import { KNOW_TAB, useStore, type KnowKind } from '../../state/store';
import { Coverage } from '../Coverage';
import { goScene, pickRecipe } from '../left/galleryActions';
import { useShell } from '../stage/shell';
import { caseApproxRecipe, caseForName, caseImages, familySwatch, genreZh, groupHue, refShot, replicaImages, replicaZh, STYLE_GROUPS, styleImages, type LearnImg, type LearnTab } from './learnData';
import { cancelPreview } from './preview';
import { PreviewBar } from './PreviewBar';
import { PrinciplesPanel } from './PrinciplesPanel';
import { ReplicaPanel } from './ReplicaPanel';
import { UiAtlasPanel } from './UiAtlasPanel';
import { useReplicas, useUiKnowledgeState } from './useUiKnowledge';
import '../left/gallery.css';
import './learn.css';

/*
 * 📖 学习（轨道 C，docs/workbench-redesign.md §1.1 L3 §10）：覆盖左栏和中栏的大图网格。
 *   风格研究库 227 · 名作案例 361 · UI 原则 85 · UI 风格家族 93 · 复刻对照 26 · 仅参考 8，另有感觉、环境（老左栏页签，保证广度不丢）和覆盖（开发者模式）。
 *   卡片点开在右侧详情栏：风格 / 仅参考用这里的详情；原则、家族、复刻用原来的知识面板（src/ui/learn/*Panel.tsx）显示那一条。
 *   图：只用我们自己渲染的缩略图（卡上标「近似」）；Steam 截图与本地参考截图只在开发环境出现；没有图的画成字牌，不拿别的渲染冒充。
 * 学习库里「做」了什么（套用、载入近似参数、用配方、一键微调、原则演示）：马上关掉学习库，画框露出来，栏条状态槽显示「已套用 X · 撤销」。
 * 知识面板的「试一下 / 套用这个做法 / 套用家族」是临时预览（§4.3）：学习库收成画框下方的一条「预览：X · 采用 · 取消」。
 * 外壳（轨道 B）在 learnOpen 时挂它（slots.ts），onClose 关掉；停在哪一页记在 useShell.learnTab。
 */

const TAB_DEFS: { id: LearnTab; label: string; count?: number; dev?: boolean }[] = [
  { id: 'atlas', label: '风格研究库', count: STYLES.length },
  { id: 'cases', label: '名作案例', count: CASES.length },
  { id: 'uiPrinciples', label: 'UI 原则' },
  { id: 'uiAtlas', label: 'UI 风格家族' },
  { id: 'uiReplicas', label: '复刻对照' },
  { id: 'ref', label: '仅参考', count: REF_ONLY.length },
  { id: 'feel', label: '感觉' },
  // 老左栏的「场景」页（25 个 3D 环境）：D 的场景图库上线后由场景弹窗的「换环境」接管，这里只留一张环境图表
  { id: 'scenes', label: '环境' },
  { id: 'coverage', label: '覆盖', dev: true },
];
const KIND_OF: Partial<Record<LearnTab, KnowKind>> = { uiPrinciples: 'principle', uiAtlas: 'family', uiReplicas: 'replica' };

export function LearnOverlay({ onClose }: { onClose: () => void }) {
  const raw = useShell((s) => s.learnTab) as LearnTab;
  const dev = useShell((s) => s.dev);
  const tab: LearnTab = TAB_DEFS.some((t) => t.id === raw) ? raw : 'atlas';
  const [q, setQ] = useState('');
  const { k } = useUiKnowledgeState();
  const reps = useReplicas().list;
  const peek = useStore((s) => !!s.preview);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 学习库里做了一次改动（套用 / 载入 / 一键微调 / 采用预览……）或开始了原则演示：关掉学习库，让人看见画框和栏条的「已套用 · 撤销」
  useEffect(() => useStore.subscribe((st, prev) => {
    if ((st.lastChange && st.lastChange !== prev.lastChange) || (st.hudDemo && !prev.hudDemo)) closeRef.current();
  }), []);
  // 关掉学习库时还有没采用的预览：取消（采用 / 取消按钮跟着学习库一起没了，不能留一份看不见开关的预览）
  useEffect(() => () => { if (useStore.getState().preview) cancelPreview(); }, []);

  const counts: Partial<Record<LearnTab, number>> = {
    uiPrinciples: k?.principles.principles.length,
    uiAtlas: k ? k.families.families.filter((f) => f.parent === null).length : undefined,
    uiReplicas: reps?.length,
  };
  const goto = (t: LearnTab) => {
    useShell.getState().set({ learnTab: t });
    setQ('');
    // 知识面板按 uiLeftTab 判断自己是不是正打开着
    const kind = KIND_OF[t];
    if (kind) useStore.getState().setUiLeftTab(KNOW_TAB[kind]);
  };
  return (
    <div className={`learn-layer c-learn ${peek ? 'c-learn-peek' : ''}`} role="dialog" aria-label={peek ? '学习（预览中）' : '学习'}>
      {peek && <PreviewBar onClose={onClose} />}
      <div className="c-learn-main" hidden={peek}>
        <div className="c-learn-head">
          <b>📖 学习</b>
          <div className="c-learn-tabs">
            {TAB_DEFS.filter((t) => !t.dev || dev).map((t) => {
              const n = t.count ?? counts[t.id];
              return <button key={t.id} className={`c-learn-tab ${tab === t.id ? 'on' : ''}`} onClick={() => goto(t.id)}>{t.label}{n !== undefined && <small>{n}</small>}</button>;
            })}
          </div>
          <span className="c-sp" />
          {!['feel', 'coverage'].includes(tab) && <input className="c-learn-q" placeholder="搜索…" value={q} onChange={(e) => setQ(e.target.value)} />}
          <button className="c-ico" onClick={onClose} title="关闭（Esc）">✕</button>
        </div>
        <div className="c-learn-body">
          {tab === 'atlas' && <AtlasTab q={q} />}
          {tab === 'cases' && <CasesTab q={q} />}
          {tab === 'uiPrinciples' && <PrinciplesTab k={k} q={q} />}
          {tab === 'uiAtlas' && <FamiliesTab k={k} q={q} />}
          {tab === 'uiReplicas' && <ReplicasTab list={reps} q={q} />}
          {tab === 'ref' && <RefTab q={q} />}
          {tab === 'feel' && <div className="c-learn-col"><FeelTab /></div>}
          {tab === 'scenes' && <EnvTab q={q} />}
          {tab === 'coverage' && <div className="c-learn-col"><Coverage /></div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 通用：大图卡、按顺序试图、详情栏 ---------------- */

/**
 * 按顺序试几张图，全部失败时显示字牌；我们自己的渲染图角上标「近似」（示意插画标「示意」）。
 * 图还没到时先显示字牌（低质量占位，整合 U#19：原来是 3–5 秒的空白），到了再盖上去。
 */
function Img({ imgs, alt, ph }: { imgs: LearnImg[]; alt: string; ph?: ReactNode }) {
  const head = imgs.map((x) => x.src).join('|');
  const [st, setSt] = useState({ head, i: 0, loaded: false });
  // 详情栏换了一条（同一个组件、另一组图）：从第一张重新试
  if (st.head !== head) setSt({ head, i: 0, loaded: false });
  const { i, loaded } = st.head === head ? st : { i: 0, loaded: false };
  const setI = (n: number) => setSt({ head, i: n, loaded: false });
  const setLoaded = (v: boolean) => setSt((s) => (s.head === head ? { ...s, loaded: v } : s));
  if (i >= imgs.length) return <div className="c-learn-ph">{ph ?? alt}</div>;
  const im = imgs[i];
  const tag = im.tag ?? (im.ours ? '近似' : null);
  return (
    <>
      {!loaded && <div className="c-learn-ph c-learn-under" aria-hidden>{ph ?? null}</div>}
      <img key={im.src} src={im.src} alt={alt} loading="lazy" draggable={false} className={loaded ? '' : 'c-learn-pending'}
        onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setI(i + 1); }} />
      {loaded && tag && <span className="c-learn-approx" title={im.tag ? '我们自己画的示意图，不是这个风格的原作' : '我们用探索台参数凑出来的近似效果，不是这个风格本身'}>{tag}</span>}
    </>
  );
}

function Card({ img, title, sub, badge, on, onClick }: { img: ReactNode; title: ReactNode; sub?: ReactNode; badge?: ReactNode; on?: boolean; onClick: () => void }) {
  return (
    <button className={`c-lcard ${on ? 'on' : ''}`} onClick={onClick}>
      <div className="c-lcard-img">{img}{badge && <span className="c-lcard-badge">{badge}</span>}</div>
      <div className="c-lcard-title">{title}</div>
      {sub && <div className="c-lcard-sub">{sub}</div>}
    </button>
  );
}

function Split({ detail, onCloseDetail, children }: { detail: ReactNode | null; onCloseDetail: () => void; children: ReactNode }) {
  return (
    <div className={`c-learn-split ${detail ? 'has-detail' : ''}`}>
      <div className="c-learn-gridwrap">{children}</div>
      {detail && (
        <aside className="c-learn-detail">
          <button className="c-ico c-learn-x" onClick={onCloseDetail} title="收起">✕</button>
          {detail}
        </aside>
      )}
    </div>
  );
}

const match = (q: string, ...xs: (string | undefined | null)[]) => !q || xs.join(' ').toLowerCase().includes(q.trim().toLowerCase());
/** 字牌的底色（按分组散列的色相） */
const tileStyle = (key: string): CSSProperties => ({ ['--h' as string]: String(groupHue(key)) });

/* ---------------- 风格研究库 ---------------- */

const CAP_DOT: Record<CapState, string> = { live: '●', partial: '◐', needsAsset: '◐', reference: '○', todo: '○' };

/** 风格研究库的字牌（没有渲染图、或渲染和前面某条几乎一样时） */
const StyleTile = ({ s }: { s: StyleEntry }) => <div className="c-learn-tile" style={tileStyle(s.group)}><span>{s.code}</span><b>{s.name}</b></div>;

function AtlasTab({ q }: { q: string }) {
  const [group, setGroup] = useState<string>('all');
  const [cap, setCap] = useState<CapState | 'all'>('all');
  const [sel, setSel] = useState<string | null>(useStore.getState().baseStyle);
  const caps = useMemo(() => {
    const d = defaultValues();
    return new Map(STYLES.map((s) => [s.id, capabilityOf(s, d)]));
  }, []);
  const list = STYLES.filter((s) => (group === 'all' || s.group === group) && (cap === 'all' || caps.get(s.id)?.state === cap)
    && match(q, s.name, s.nameEn, s.group, s.definition, s.representatives.map((r) => r.name).join(' '), (s.moods ?? []).join(' ')));
  const cur = sel ? STYLES.find((s) => s.id === sel) : undefined;
  return (
    <Split detail={cur ? <StyleDetail s={cur} /> : null} onCloseDetail={() => setSel(null)}>
      <div className="c-learn-filters">
        <button className={`c-chip small ${group === 'all' ? 'on' : ''}`} onClick={() => setGroup('all')}>全部</button>
        {STYLE_GROUPS.map((g) => <button key={g} className={`c-chip small ${group === g ? 'on' : ''}`} onClick={() => setGroup(group === g ? 'all' : g)}>{g}</button>)}
        <span className="c-learn-fsep" />
        {(['live', 'partial', 'needsAsset', 'reference', 'todo'] as CapState[]).map((c) => (
          <button key={c} className={`c-chip small ${cap === c ? 'on' : ''}`} onClick={() => setCap(cap === c ? 'all' : c)}>{CAP_DOT[c]} {CAP_LABEL[c]}</button>
        ))}
        <span className="c-learn-n">{list.length}</span>
      </div>
      <div className="c-learn-grid">
        {list.map((s) => {
          const c = caps.get(s.id)!;
          return (
            <Card key={s.id} on={sel === s.id} onClick={() => setSel(s.id)}
              img={<Img imgs={styleImages(s)} alt={s.name} ph={<StyleTile s={s} />} />}
              title={<><i className={`c-dot ${c.state === 'live' ? 'live' : c.state === 'reference' || c.state === 'todo' ? 'ref' : 'partial'}`}>{CAP_DOT[c.state]}</i>{s.name}</>}
              sub={s.nameEn ?? s.group} />
          );
        })}
      </div>
    </Split>
  );
}

function StyleDetail({ s }: { s: StyleEntry }) {
  const c = useMemo(() => capabilityOf(s, defaultValues()), [s]);
  const setCase = useStore((x) => x.setCaseId);
  const ap = effectiveApprox(s);
  // 场景键（game.*）不跟着画面走：缺口由某个场景补上时（技术补全：伪 3D 公路、错觉塔、卷轴长街……）另给一个「换到场景」
  const n = Object.keys(ap).filter((k) => !k.startsWith('game.')).length;
  const scn = typeof ap['game.scene'] === 'string' ? SCENES.find((x) => x.id === ap['game.scene']) : undefined;
  const r = s.recipe ? RECIPE_MAP.get(s.recipe) : undefined;
  return (
    <div className="c-learn-dbody">
      <div className="c-learn-dimg"><Img imgs={styleImages(s)} alt={s.name} ph={<StyleTile s={s} />} /></div>
      <h3>{s.code} {s.name}{s.nameEn && <small> {s.nameEn}</small>}</h3>
      <p>{s.definition}</p>
      <p><b>关键机制</b>{s.mechanisms}</p>
      <p><b>区别</b>{s.differs}</p>
      {s.representatives.length > 0 && (
        <div className="c-learn-chips"><b>代表作</b>
          {s.representatives.map((x) => {
            const hit = caseForName(x.name);
            return hit ? <button key={x.name} className="c-chip small" onClick={() => setCase(hit.id)}>{x.name}</button> : <span key={x.name} className="c-chip small dim">{x.name}</span>;
          })}
        </div>
      )}
      <p className="c-learn-state"><b>能力</b>{CAP_LABEL[c.state]}{c.reasons.length > 0 && <span className="warn"> · 缺：{c.reasons.slice(0, 4).join('；')}</span>}</p>
      {c.resolved.length > 0 && <p className="ok">已补上：{c.resolved.join('、')}</p>}
      <div className="c-learn-actions">
        {n > 0 ? <button className="c-btn primary" title="套到画框上（学习库会收起，可撤销）" onClick={() => applyStyle(s)}>载入近似参数（{n} 项）</button> : <span className="c-chip small dim">还没有可执行的参数组合</span>}
        {r && <button className="c-btn" title="套到画框上（学习库会收起，可撤销）" onClick={() => pickRecipe(r, { toggle: false })}>用配方「{cardName(r)}」</button>}
        {scn && <button className="c-btn" title="这一风格的缺口由这个场景补上：换过去看（画面不动，可撤销）" onClick={() => goScene(scn.id, scn.name)}>换到场景「{scn.name}」</button>}
      </div>
    </div>
  );
}

/* ---------------- 名作案例 ---------------- */

/**
 * 名作案例的字牌（生产构建没有截图时）：游戏名 + 分组色 + 奖项；角上一张很小的「近似：配方名」。
 * 不拿配方缩略图当卡片大图——那是我们在农场 / 小岛上的近似渲染，放在真实游戏名下面会误导。
 */
function CaseTile({ c, title }: { c: CaseEntry; title: string }) {
  const ap = caseApproxRecipe(c);
  return (
    <div className="c-learn-tile case" style={tileStyle(c.group)}>
      <span>{c.groupTitle}</span>
      <b>{title}</b>
      {ap && <span className="c-learn-inset" title={`探索台里最接近的配方：${ap.name}（近似，不是原作）`}><img src={thumbUrl(ap.id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><em>近似：{ap.name}</em></span>}
    </div>
  );
}

function CasesTab({ q }: { q: string }) {
  const [group, setGroup] = useState('all');
  const [award, setAward] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const setCase = useStore((s) => s.setCaseId);
  const groups = useMemo(caseGroups, []);
  const list = CASES.filter((c: CaseEntry) => (group === 'all' || c.group === group || (c.alsoInGroups ?? []).includes(group))
    && (!award || !!c.evidence?.awards?.length) && (!analyzed || !!c.analysis)
    && match(q, c.name, c.nameZh, c.artFeature, (c.developers ?? []).join(' '), (c.steamTags ?? []).join(' ')));
  return (
    <div className="c-learn-gridwrap">
      <div className="c-learn-filters">
        <select className="c-learn-sel" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">全部分组（{CASES.length}）</option>
          {groups.map(([g, x]) => <option key={g} value={g}>{g} · {x.title}（{x.count}）</option>)}
        </select>
        <button className={`c-chip small ${award ? 'on' : ''}`} onClick={() => setAward(!award)}>有美术奖项</button>
        <button className={`c-chip small ${analyzed ? 'on' : ''}`} onClick={() => setAnalyzed(!analyzed)}>有视觉拆解</button>
        <span className="c-learn-n">{list.length}</span>
      </div>
      <div className="c-learn-grid">
        {list.slice(0, 240).map((c) => {
          const badge = awardBadge(c);
          const title = c.nameZh && c.nameZh !== c.name && c.nameZh.length <= 10 ? c.nameZh : c.name;
          return (
            <Card key={c.id} onClick={() => setCase(c.id)}
              img={<Img imgs={caseImages(c)} alt={c.name} ph={<CaseTile c={c} title={title} />} />}
              badge={badge ? '🏆' : undefined}
              title={title}
              sub={c.groupTitle} />
          );
        })}
      </div>
      {list.length > 240 && <p className="c-learn-more">还有 {list.length - 240} 款，用搜索或分组缩小范围</p>}
    </div>
  );
}

/* ---------------- UI 原则 / 风格家族 / 复刻（详情用原来的知识面板） ---------------- */

/** 选中一条知识（原则 / 家族 / 复刻）：只改选中，不切模式（store.openKnowledge 会切到 UI 模式） */
function selectKnow(kind: KnowKind, id: string | null) {
  const s = useStore.getState();
  useStore.setState({ knowSel: { ...s.knowSel, [kind]: id }, uiLeftTab: KNOW_TAB[kind] });
}

function Loading({ what }: { what: string }) {
  return <div className="c-learn-loading">正在加载{what}…</div>;
}


function PrinciplesTab({ k, q }: { k: UiKnowledge | null; q: string }) {
  const sel = useStore((s) => s.knowSel.principle);
  const [area, setArea] = useState('all');
  if (!k) return <Loading what="UI 原则" />;
  const areaOf = new Map<string, string>();
  for (const a of k.principles.areas) for (const p of a.principles) areaOf.set(p, a.id);
  const list = k.principles.principles.filter((p: KPrinciple) => (area === 'all' || areaOf.get(p.id) === area) && match(q, p.id, p.title, p.problem, principleOneLiner(p)));
  return (
    <Split detail={sel ? <div className="c-learn-panel"><PrinciplesPanel /></div> : null} onCloseDetail={() => selectKnow('principle', null)}>
      <div className="c-learn-filters">
        <button className={`c-chip small ${area === 'all' ? 'on' : ''}`} onClick={() => setArea('all')}>全部</button>
        {k.principles.areas.map((a) => <button key={a.id} className={`c-chip small ${area === a.id ? 'on' : ''}`} title={a.summary} onClick={() => setArea(area === a.id ? 'all' : a.id)}>{a.title}</button>)}
        <span className="c-learn-n">{list.length}</span>
      </div>
      <div className="c-learn-grid">
        {list.map((p) => {
          const ai = k.principles.areas.findIndex((x) => x.id === areaOf.get(p.id));
          const a = k.principles.areas[ai];
          // 每个领域一个色相，均匀分在色环上
          const hue = Math.round(((ai < 0 ? 0 : ai) * 360) / Math.max(1, k.principles.areas.length) + 200) % 360;
          const lead = (p.problem ?? '').split(/[。；]/)[0];
          return (
            <Card key={p.id} on={sel === p.id} onClick={() => selectKnow('principle', p.id)}
              img={<div className="c-learn-ptile" style={{ background: `linear-gradient(135deg, hsl(${hue} 42% 44%), hsl(${(hue + 35) % 360} 38% 26%))` }}><span>{a?.title ?? ''}</span><b>{lead.length > 4 ? lead : principleOneLiner(p)}</b></div>}
              title={p.title} sub={p.id} />
          );
        })}
      </div>
    </Split>
  );
}

function FamiliesTab({ k, q }: { k: UiKnowledge | null; q: string }) {
  const sel = useStore((s) => s.knowSel.family);
  const [group, setGroup] = useState('all');
  if (!k) return <Loading what="UI 风格家族" />;
  const top = k.families.families.filter((f: KFamily) => f.parent === null && (group === 'all' || f.group === group) && match(q, f.name, f.oneLiner, f.definition));
  return (
    <Split detail={sel ? <div className="c-learn-panel"><UiAtlasPanel /></div> : null} onCloseDetail={() => selectKnow('family', null)}>
      <div className="c-learn-filters">
        <button className={`c-chip small ${group === 'all' ? 'on' : ''}`} onClick={() => setGroup('all')}>全部</button>
        {k.families.groups.map((g) => <button key={g.id} className={`c-chip small ${group === g.id ? 'on' : ''}`} title={g.description} onClick={() => setGroup(group === g.id ? 'all' : g.id)}>{g.name}</button>)}
        <span className="c-learn-n">{top.length}</span>
      </div>
      <div className="c-learn-grid">
        {top.map((f) => {
          const sw = familySwatch(f);
          const subs = k.childrenOf.get(f.id)?.length ?? 0;
          return (
            <Card key={f.id} on={sel === f.id} onClick={() => selectKnow('family', f.id)}
              img={(
                <div className="c-learn-fam" style={{ background: sw.dark ? '#2a2c33' : '#d9d4c8' }}>
                  <div className="c-learn-fampanel" style={{ background: sw.bg, color: sw.text, borderRadius: sw.radius, border: sw.border }}>
                    <span className="t">{f.name}</span>
                    <span className="bar"><i style={{ background: sw.accent }} /></span>
                    <span className="btn" style={{ background: sw.accent, borderRadius: Math.min(sw.radius, 10) }} />
                  </div>
                </div>
              )}
              title={f.name} sub={`${f.oneLiner ?? ''}${subs ? ` · ${subs} 个子族` : ''}`} />
          );
        })}
      </div>
    </Split>
  );
}

function ReplicasTab({ list, q }: { list: KReplica[] | null; q: string }) {
  const sel = useStore((s) => s.knowSel.replica);
  if (!list) return <Loading what="复刻库" />;
  // 名字、品类都用中文（场景图库卡片上的名字：哈迪斯、小丑牌；整合 U#10）；英文名留在悬停和搜索里
  const shown = list.filter((r) => match(q, r.name, replicaZh(r), r.genre, genreZh(r.genre), r.family));
  return (
    <Split detail={sel ? <div className="c-learn-panel"><ReplicaPanel /></div> : null} onCloseDetail={() => selectKnow('replica', null)}>
      <div className="c-learn-filters"><span className="c-learn-hint">名作的整套界面复刻：点开看每一屏，可以一键套用</span><span className="c-learn-n">{shown.length}</span></div>
      <div className="c-learn-grid">
        {shown.map((r) => {
          const zh = replicaZh(r);
          return (
            <Card key={r.id} on={sel === r.id} onClick={() => selectKnow('replica', r.id)}
              img={<Img imgs={replicaImages(r)} alt={zh} ph={<div className="c-learn-tile" style={tileStyle(r.genre)}><span>{genreZh(r.genre)}</span><b>{zh}</b></div>} />}
              title={<span title={r.name}>{zh}</span>} sub={`${r.screens.length} 屏 · ${genreZh(r.genre)}`} />
          );
        })}
      </div>
    </Split>
  );
}

/* ---------------- 仅参考 ---------------- */

/**
 * 仅参考卡的图：自己画的示意插画（public/thumbs/ref，整合 U#23；角上标「示意」）。做不出来的风格不放我们的近似渲染（会让人以为就长这样）；
 * 示意图没有时退回分类花纹 + 名字。开发环境的代表作截图放在详情栏里
 */
function RefTile({ c }: { c: RefOnlyCard }) {
  return (
    <Img imgs={[{ src: refThumbUrl(c.id), ours: false, tag: '示意' }]} alt={c.name}
      ph={<div className={`c-thumb none cat-${c.category} c-learn-refimg`}><b>{c.name}</b><em>仅参考</em></div>} />
  );
}

function RefTab({ q }: { q: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const list = REF_ONLY.filter((c) => match(q, c.name, c.why));
  const cur = REF_ONLY.find((c) => c.id === sel);
  return (
    <Split detail={cur ? <RefDetail c={cur} /> : null} onCloseDetail={() => setSel(null)}>
      <div className="c-learn-filters"><span className="c-learn-hint">这些风格靠手绘素材，实时渲染做不出来；只能看参考，或者从最接近的配方出发</span></div>
      <div className="c-learn-grid">
        {list.map((c) => (
          <Card key={c.id} on={sel === c.id} onClick={() => setSel(c.id)} img={<RefTile c={c} />}
            title={<><i className="c-dot ref">○</i>{c.name}</>} sub={c.why} />
        ))}
      </div>
    </Split>
  );
}

function RefDetail({ c }: { c: RefOnlyCard }) {
  const setCase = useStore((s) => s.setCaseId);
  const st = c.atlas ? STYLES.find((s) => s.id === c.atlas) : undefined;
  const shot = refShot(c);
  return (
    <div className="c-learn-dbody">
      <div className="c-learn-dimg"><RefTile c={c} /></div>
      <h3>{c.name} <small>仅参考</small></h3>
      <p>{c.why}。</p>
      {shot && <figure className="c-learn-shot"><img src={shot} alt={`${c.name} 代表作截图`} loading="lazy" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} /><figcaption>代表作截图（只在开发环境）</figcaption></figure>}
      {st && <p><b>风格研究库</b>{st.code} {st.name}：{st.definition}</p>}
      <div className="c-learn-chips"><b>代表作</b>
        {c.games.map((g) => {
          const hit = CASES.find((x) => x.id === g) ?? caseForName(g);
          return hit ? <button key={g} className="c-chip small" onClick={() => setCase(hit.id)}>{hit.name}</button> : <span key={g} className="c-chip small dim">{g}</span>;
        })}
      </div>
      <div className="c-learn-near"><b>从最接近的配方出发</b>
        <div className="c-learn-grid mini">
          {c.nearest.map((id) => {
            const r = RECIPE_MAP.get(id);
            return r ? <Card key={id} onClick={() => pickRecipe(r, { toggle: false })} img={<Img imgs={[{ src: thumbUrl(id), ours: false }]} alt={r.name} />} title={cardName(r)} /> : null;
          })}
        </div>
      </div>
      {st && Object.keys(effectiveApprox(st)).length > 0 && <div className="c-learn-actions"><button className="c-btn" title="套到画框上（学习库会收起，可撤销）" onClick={() => applyStyle(st)}>载入风格研究库的近似参数</button></div>}
    </div>
  );
}

/* ---------------- 感觉（16 个一键微调 + 36 种情绪）、环境（老左栏页签） ---------------- */

function FeelTab() {
  const last = useStore((s) => s.lastChange);
  const [picked, setPicked] = useState<string[]>([]);
  const moods = MOODS.filter((m) => picked.includes(m.id));
  return (
    <>
      <h4 className="c-learn-h">一键微调</h4>
      <div className="c-learn-nudges">
        {NUDGES.map((n) => <button key={n.id} className="c-btn" title={`${n.hint}\n对应术语：${n.terms.join('、')}\n（学习库会收起，可撤销）`} onClick={() => applyNudge(n)}>{n.label}</button>)}
      </div>
      {last && last.ids.length > 0 && (
        <div className="c-learn-chips"><b>刚才改了</b>{last.ids.slice(0, 10).map((id) => <button key={id} className="c-chip small" onClick={() => focusParam(id)}>{getParam(id)?.label ?? id}</button>)}</div>
      )}
      <h4 className="c-learn-h">情绪与氛围（{MOODS.length}）</h4>
      <div className="c-learn-chips">
        {MOODS.map((m) => <button key={m.id} className={`c-chip small ${picked.includes(m.id) ? 'on' : ''}`} onClick={() => setPicked(picked.includes(m.id) ? picked.filter((x) => x !== m.id) : [...picked, m.id])}>{m.name}</button>)}
      </div>
      {moods.map((m) => (
        <div key={m.id} className="c-learn-mood">
          <b>{m.name}</b>
          <p>{m.factors.join('；')}</p>
          <div className="c-learn-chips">
            {m.approx && Object.keys(m.approx).length > 0 && <button className="c-btn" onClick={() => applyMood(m)}>在当前画面上推向「{m.name}」</button>}
            {(m.recipes ?? []).map((id) => RECIPE_MAP.get(id)).filter(Boolean).map((r) => <button key={r!.id} className="c-chip small" onClick={() => pickRecipe(r!, { toggle: false })}>{cardName(r!)}</button>)}
          </div>
        </div>
      ))}
    </>
  );
}

/** 环境的图：图库里展示场景就是它的那张配方缩略图（同一个环境，画风是那张配方的）；2D 展示场景（有构建器时）也算 */
function envThumbs(): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of GALLERY) { const sc = showcaseScene(r, hasSceneBuilder); if (sc && !m.has(sc)) m.set(sc, r.id); }
  return m;
}

/**
 * 环境（25 个 3D 环境 + F 轨道的 2D 环境）：图片网格，点一下只换环境（记进场景层，不算改动），画风和 UI 不动。
 * 「应用场景推荐」退役（§10：场景镜头接管）。D 的场景图库上线后这一页可以删掉。
 */
function EnvTab({ q }: { q: string }) {
  const cur = useStore((s) => String(s.values['game.scene'] ?? ''));
  const ENV_THUMB = useMemo(envThumbs, []);
  const order = new Map<string, number>(SCENE_CATEGORIES.map(([c], i) => [c, i]));
  const list = SCENES.filter((s) => hasSceneBuilder(s.id) && match(q, s.name, s.desc, s.category)).sort((a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99));
  return (
    <div className="c-learn-gridwrap">
      <div className="c-learn-filters"><span className="c-learn-hint">只换环境：画风、UI 都不动（可撤销）</span><span className="c-learn-n">{list.length}</span></div>
      <div className="c-learn-grid">
        {list.map((s) => {
          const rid = ENV_THUMB.get(s.id);
          const rname = rid ? cardName(RECIPE_MAP.get(rid)!) : '';
          return (
            <Card key={s.id} on={cur === s.id} onClick={() => goScene(s.id, s.name)}
              img={rid
                ? <div className="c-learn-envimg" title={`${s.desc}
（图里的画风：${rname}）`}><img src={thumbUrl(rid)} alt={s.name} loading="lazy" /></div>
                : <div className="c-learn-tile" style={tileStyle(s.category)} title={s.desc}><span>{s.category}</span><b>{s.name}</b></div>}
              title={s.name} sub={s.category} />
          );
        })}
      </div>
    </div>
  );
}
