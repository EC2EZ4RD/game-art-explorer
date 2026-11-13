import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RECIPE_MAP } from '../../content/recipes';
import { SCENE_MAP } from '../../content/sceneCatalog';
import {
  GAP_KIND_LABEL, gapScreens, IS_DEV, LOCAL_REFS, REF_DEV_ONLY_NOTE, refImageUrl, replicaIds, replicaScore, replicaScoreHistory, replicaScreenPatch,
  type KGapKind, type KReplica, type KReplicaGap, type KReplicaScore, type KReplicaScreen, type UiKnowledge,
} from '../../content/uiKnowledge';
import { getParam } from '../../dims/registry';
import { PRESET } from '../../hud/sys/spec';
import { applyReplica } from '../../state/actions';
import { replicaSceneId } from '../../state/replica';
import { useStore } from '../../state/store';
import { useShell } from '../stage/shell';
import { CardThumb, FamilyChip, KnowBackLink, KnowledgeLoading, RefImage, RefNote } from './KnowledgeBits';
import { genreZh, replicaZh } from './learnData';
import { endDemo } from './principleDemo';
import { useReplicas, useUiKnowledgeState } from './useUiKnowledge';
import '../hud/replicas.css';

/*
 * 左栏"复刻库"（G4，docs/t1-tool-knowledge.md；数据格式见 docs/ui-replicas.md）：
 *   列表：按品类 / 家族 / 名字分组 + 搜索；每条是名字、要点（两行）、品类、风格家族、屏数、平均"像不像"分、高严重度缺口数。
 *   复刻页：要点、品类 / 家族 / 示例内容 / 画面 / 评分；逐屏一张卡——"套用（画面 + UI）"与"只套 UI"
 *     （replicaScreenPatch：与 __gae.replicaShots 同一套叠法，不钉 16:9、保留种子；一步可撤销）、参考截图（只在开发环境，点一下放到视口右下角对照）、
 *     逐轮整体分（R1 → R2）与当前轮的六项评分（scores 是单对象或逐轮数组，replicaScoreHistory）、这一屏的缺口（带缺口类型，几屏共有的挂到每一屏）与历轮对照差异；
 *     最后是整套共有的缺口与修订记录。
 * 复刻文件会增长到几百份：列表按组折叠（超过 60 条时默认收起），搜索时全部展开。
 * 复刻库单独加载：列表一到就显示，不等 5 MB 的原则 + 图谱；知识库到了以后品类名、家族名、参考卡名再补上（之前显示 id）。
 * 归属：B4。
 */

/* ---------------- 小工具（纯函数） ---------------- */

type GroupBy = 'genre' | 'family' | 'name';
const GROUP_BY: [GroupBy, string][] = [['genre', '品类'], ['family', '家族'], ['name', '名字']];
/** 列表状态记在模块里：列表 ↔ 复刻页来回、切页签回来都还在 */
const memo = { q: '', by: 'genre' as GroupBy, scroll: 0 };

/** 屏 key 的中文名（复合 key 逐段翻：hud-lowhp → 局内 HUD · 低血量）；没收录的原样显示 */
const KEY_LABEL: Record<string, string> = {
  hud: '局内 HUD', lowhp: '低血量', boss: 'Boss 战', base: '基地', world: '世界', combat: '战斗', building: '选中建筑', battle: '战斗', command: '选指令',
  field: '野外', scan: '扫描', hand: '手牌', draft: '三选一', codex: '图鉴', blinds: '关卡选择', results: '结算', inventory: '背包', character: '角色',
  skilltree: '技能树', infoview: '信息视图', economy: '经济', title: '标题', city: '城市', build: '建造', diplomacy: '外交', greatpeople: '伟人',
  wonder: '奇观', map: '地图', chapter: '章节卡', cards: '卡牌', dialogue: '对话', create: '创建角色', craft: '制作', check: '检定', journal: '日志',
  pause: '暂停', callout: '大字提示', research: '研究', squad: '小队', deduction: '推理', allout: '总攻', calendar: '日历', frontend: '前台',
  settings: '设置', loading: '读取', cutscene: '过场', save: '存档', shop: '商店', tutorial: '教学', menu: '菜单',
};
const screenTitle = (key: string) => key.split('-').map((x) => KEY_LABEL[x] ?? x).join(' · ');

/** 这一屏用的是什么：界面模板 / 局内 HUD 的品类布局 / 界面类型 */
function screenKind(rep: KReplica, s: KReplicaScreen): string | undefined {
  const v = { ...(rep.base ?? {}), ...(s.values ?? {}) };
  const tpl = PRESET.get(String(v['uip.screen'] ?? ''));
  if (tpl && tpl.kind === 'screen') return `界面模板：${tpl.label}`;
  const lay = PRESET.get(String(v['uip.layout'] ?? ''));
  if (lay && lay.kind === 'layout') return `局内 HUD · ${lay.label}`;
  const cs = v['cnt.screen'];
  return typeof cs === 'string' ? getParam('cnt.screen')?.options?.find((o) => o.value === cs)?.label : undefined;
}

const optionLabel = (param: string, value: string | undefined) => (value ? getParam(param)?.options?.find((o) => o.value === value)?.label ?? value : undefined);
const packLabel = (rep: KReplica) => optionLabel('cnt.pack', rep.pack) ?? '跟随品类';
/** 品类名：知识库到了用品类篇的标题，没到时用中文短名（不再显示 card / action 这样的 id，整合 U#10） */
const genreLabel = (k: UiKnowledge | null, g: string) => k?.chapterById.get(g)?.label ?? genreZh(g);
const familyName = (k: UiKnowledge | null, id: string) => k?.familyById.get(id)?.name ?? (id.startsWith('fam.') ? `${id.slice(4)}（图谱未收录）` : id);

/** 画面侧会换成什么（"套用（画面 + UI）"的说明） */
function artText(rep: KReplica): string {
  const r = rep.art?.recipe ? RECIPE_MAP.get(rep.art.recipe) : undefined;
  const scene = rep.art?.scene ? SCENE_MAP.get(rep.art.scene)?.name ?? rep.art.scene : undefined;
  const n = Object.keys(rep.art?.values ?? {}).length;
  return [r ? `配方「${r.name}」` : '默认画面', scene ? `场景「${scene}」` : '', n ? `另调 ${n} 项` : ''].filter(Boolean).join(' · ');
}

const screensOf = (rep: KReplica) => rep.screens ?? [];
const gapsOf = (rep: KReplica) => rep.gaps ?? [];

/** 各屏 overall 的平均（没有评分时 undefined）；round 给了时取那一轮的分（那一轮没评的屏不计） */
function avgOverall(rep: KReplica, round?: number): number | undefined {
  const pick = (key: string) => (round === undefined ? replicaScore(rep, key) : replicaScoreHistory(rep, key).find((x) => x.round === round));
  const xs = screensOf(rep).map((s) => pick(s.key)?.overall).filter((x): x is number => typeof x === 'number');
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : undefined;
}
const latestRound = (rep: KReplica) => Math.max(0, ...screensOf(rep).map((s) => replicaScore(rep, s.key)?.round ?? 0));
/** 上一轮的各屏平均（只有一轮时 undefined）：列表与复刻页显示"第 1 轮 → 第 2 轮" */
const prevAvg = (rep: KReplica) => { const n = latestRound(rep); return n > 1 ? avgOverall(rep, n - 1) : undefined; };
const signed = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(Math.round(d * 10) / 10)}`;
const countSev = (gaps: KReplicaGap[], sev: string) => gaps.filter((g) => g.severity === sev).length;

/** 历轮对照差异（round1Diffs、round2Diffs……）：[轮次, 屏 key → 差异] */
function roundDiffs(rep: KReplica): [number, Record<string, unknown>][] {
  const out: [number, Record<string, unknown>][] = [];
  for (const [key, v] of Object.entries(rep)) {
    const m = /^round(\d+)Diffs$/.exec(key);
    if (m && v && typeof v === 'object' && !Array.isArray(v)) out.push([Number(m[1]), v as Record<string, unknown>]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
const diffsOf = (d: Record<string, unknown>, key: string): string[] => (Array.isArray(d[key]) ? (d[key] as unknown[]).map(String) : []);

/** 搜索用的全文：名字、要点、品类、家族（含父族）、示例内容、参考卡名、屏名 */
function haystack(k: UiKnowledge | null, rep: KReplica): string {
  const f = k?.familyById.get(rep.family);
  const parent = f?.parent ? k?.familyById.get(f.parent) : undefined;
  return [replicaZh(rep), rep.name, rep.id, rep.notes, genreLabel(k, rep.genre), rep.genre, familyName(k, rep.family), parent?.name, packLabel(rep),
    k?.cardNames.get(rep.card), ...screensOf(rep).map((s) => `${s.key} ${screenTitle(s.key)}`)].filter(Boolean).join(' ').toLowerCase();
}

/* ---------------- 套用 ---------------- */


/**
 * 套用一屏：走轨道 A 的统一合成（applyReplica：场景 = rep:<id>、界面 = 这一屏、画面 = 配方 + art.values，按层记进来源），
 * 套完三个标签的改动数都是 0；「UI ▾ 清样式改动」/ 顶栏「重置 UI」不会把刚套的复刻当成手动改动清掉（§4.1）。
 */
function applyScreen(rep: KReplica, s: KReplicaScreen, uiOnly: boolean) {
  // 正在进行原则演示（UI A/B）时先正常结束（还回演示前的 A 槽与 A/B 开关、关掉演示用的检查工具）：复刻整套换掉了 UI，左边的 A 已经不是演示的对照
  if (useStore.getState().hudDemo) endDemo('keep');
  if (IS_DEV) {
    const p = replicaScreenPatch(rep, s, useStore.getState().values, { uiOnly });
    if (p.dropped?.length) console.warn(`复刻 ${rep.id} · ${s.key}：这些键存不进参数，已跳过`, p.dropped);
  }
  applyReplica(rep, s, { uiOnly });
  const st = useStore.getState();
  // 开发环境：参考截图放到视口右下角对照；这一屏没有截图时，收掉同一款游戏上一屏的截图，免得对错图
  // 标签用中文名（与 D 的胶片同一个前缀：「哈迪斯 · 对话」，换屏时 D 认这个前缀跟着换图）；英文名的旧标签也认
  const url = refImageUrl(s.ref);
  const zh = replicaZh(rep);
  if (url) st.setRefImage({ url, label: `${zh} · ${screenTitle(s.key)}` });
  else if ([zh, rep.name].some((n) => st.refImage?.label.startsWith(`${n} · `))) st.setRefImage(null);
}

/* ---------------- 面板 ---------------- */

export function ReplicaPanel() {
  const { list, error } = useReplicas();
  // 家族名、品类名、参考卡名来自知识库：不等它，先用 id 显示，加载完自动换成名字；它加载失败时照样能用
  const { k } = useUiKnowledgeState();
  const sel = useStore((s) => s.knowSel.replica);
  if (!list) return <KnowledgeLoading error={error} what={`复刻库（${replicaIds().length} 款）`} />;
  if (sel) {
    const rep = list.find((r) => r.id === sel);
    return rep ? <ReplicaPage key={rep.id} rep={rep} k={k} /> : <Missing id={sel} />;
  }
  return <ReplicaList list={list} k={k} />;
}

function BackLink({ k }: { k?: UiKnowledge | null }) {
  const open = useStore((s) => s.openKnowledge);
  return (
    <>
      <span className="kn-back" onClick={() => open('replica', null)}>← 复刻库</span>
      <KnowBackLink k={k ?? null} />
    </>
  );
}

function Missing({ id }: { id: string }) {
  return (
    <div className="rp-panel">
      <BackLink />
      <p className="kn-empty">复刻库里没有 {id}（文件可能改了名或被删了）。</p>
    </div>
  );
}

/** 让左栏的滚动容器记住 / 回到某个位置 */
function useScrollTo(get: () => number, save?: (top: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const sc = ref.current?.closest('.scroll');
    if (!(sc instanceof HTMLElement)) return;
    sc.scrollTop = get();
    if (!save) return;
    const on = () => save(sc.scrollTop);
    sc.addEventListener('scroll', on, { passive: true });
    return () => sc.removeEventListener('scroll', on);
  }, []); // 只在挂上时定位一次
  return ref;
}

/* ---------------- 列表 ---------------- */

interface Group { key: string; title: string; sub?: string; items: KReplica[] }

function groupReplicas(k: UiKnowledge | null, list: KReplica[], by: GroupBy): Group[] {
  if (by === 'name') return [{ key: 'all', title: '', items: list }];
  const m = new Map<string, KReplica[]>();
  for (const r of list) {
    const key = by === 'genre' ? r.genre : r.family;
    const a = m.get(key);
    if (a) a.push(r); else m.set(key, [r]);
  }
  const orderOf = (i: number | undefined) => (i === undefined || i < 0 ? 999 : i);
  const genreOrder = (g: string) => orderOf(k?.principles.genres.findIndex((c) => c.genre === g));
  const famGroup = (id: string) => { const f = k?.familyById.get(id); return orderOf(f ? k?.families.groups.findIndex((g) => g.id === f.group) : undefined); };
  const groups = [...m.entries()].map(([key, items]): Group & { order: number } => {
    if (by === 'genre') return { key, title: genreLabel(k, key), items, order: genreOrder(key) };
    const f = k?.familyById.get(key);
    return { key, title: familyName(k, key), sub: f ? k?.groupById.get(f.group)?.name : undefined, items, order: famGroup(key) };
  });
  return groups.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function ReplicaList({ list, k }: { list: KReplica[]; k: UiKnowledge | null }) {
  const [q, setQ] = useState(memo.q);
  const [by, setBy] = useState<GroupBy>(memo.by);
  const ref = useScrollTo(() => memo.scroll, (top) => { memo.scroll = top; });
  const hay = useMemo(() => new Map(list.map((r) => [r.id, haystack(k, r)])), [list, k]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length ? list.filter((r) => words.every((w) => hay.get(r.id)?.includes(w))) : list;
  const groups = groupReplicas(k, shown, by);
  const openAll = words.length > 0 || shown.length <= 60;
  const nScreens = list.reduce((n, r) => n + screensOf(r).length, 0);
  return (
    <div className="rp-panel" ref={ref}>
      <p className="hint">
        用探索台的参数逐屏"写出"好游戏的 UI：{list.length} 款、{nScreens} 屏。点开一款，每一屏都能一键套用；套不出来的地方记成"缺口"。
        {LOCAL_REFS ? '参考截图在复刻页里，点一下放到视口右下角对照。' : `${REF_DEV_ONLY_NOTE}。`}
      </p>
      <div className="kn-search rp-tools">
        <input className="search" placeholder="搜索：游戏名、品类、风格家族、要点…" value={q} onChange={(e) => { setQ(e.target.value); memo.q = e.target.value; }} />
        <div className="seg">
          <span className="rp-seg-label">分组</span>
          {GROUP_BY.map(([id, label]) => (
            <button key={id} className={by === id ? 'on' : ''} onClick={() => { setBy(id); memo.by = id; }}>{label}</button>
          ))}
          {words.length > 0 && <span className="rp-seg-label rp-hits">找到 {shown.length} 款</span>}
        </div>
      </div>
      {!shown.length && <p className="kn-empty">没有匹配"{q}"的复刻。</p>}
      {groups.map((g) => (by === 'name'
        ? g.items.map((r) => <ReplicaItem key={r.id} rep={r} k={k} by={by} />)
        : (
          <details key={`${by}:${g.key}`} className="rp-group" open={openAll}>
            <summary className="group-title">{g.title}<span className="rp-count"> · {g.items.length}</span>{g.sub && <span className="rp-count">（{g.sub}）</span>}</summary>
            {g.items.map((r) => <ReplicaItem key={r.id} rep={r} k={k} by={by} />)}
          </details>
        )))}
    </div>
  );
}

function ReplicaItem({ rep, k, by }: { rep: KReplica; k: UiKnowledge | null; by: GroupBy }) {
  const open = useStore((s) => s.openKnowledge);
  const avg = avgOverall(rep);
  const prev = prevAvg(rep);
  const high = countSev(gapsOf(rep), 'high');
  return (
    <div className="card rp-item" onClick={() => open('replica', rep.id)}>
      <h4 title={rep.name}>{replicaZh(rep)}</h4>
      {rep.notes && <p className="rp-oneliner">{rep.notes}</p>}
      <div className="chips">
        {by !== 'genre' && <span className="chip">{genreLabel(k, rep.genre)}</span>}
        {by !== 'family' && <FamilyLink k={k} id={rep.family} />}
        <span className="chip">{screensOf(rep).length} 屏</span>
        {avg !== undefined && (
          <span className={`chip ${avg >= 6 ? 'ok' : ''}`} title={`各屏「整体像不像」的平均（0–10，只看 UI 层）${prev !== undefined ? `；上一轮 ${prev}` : ''}`}>
            像不像 {avg}/10{prev !== undefined && avg !== prev ? `（${signed(avg - prev)}）` : ''}
          </span>
        )}
        {high > 0 && <span className="chip warn" title="参数体系还表达不了、对观感影响大的地方">高缺口 {high}</span>}
      </div>
    </div>
  );
}

/** 风格家族小标签：图谱里有的点了去家族页；图谱还没收录的显示成普通标签 */
function FamilyLink({ k, id }: { k: UiKnowledge | null; id: string }) {
  if (k?.familyById.has(id)) return <FamilyChip k={k} id={id} />;
  return <span className="chip" title="UI 风格图谱里还没有这个家族">{familyName(k, id)}</span>;
}

/* ---------------- 复刻页 ---------------- */

function ReplicaPage({ rep, k }: { rep: KReplica; k: UiKnowledge | null }) {
  const ref = useScrollTo(() => 0);
  const avg = avgOverall(rep);
  const round = latestRound(rep);
  const prev = prevAvg(rep);
  const gaps = gapsOf(rep);
  const keys = new Set(screensOf(rep).map((s) => s.key));
  // 几屏共有的缺口（"a / b"）挂到每一屏；整套共有的（all / global / *）和写错屏名的放在最后
  const shared = gaps.filter((g) => !gapScreens(g).some((x) => keys.has(x)));
  const diffs = roundDiffs(rep);
  return (
    <div className="rp-panel" ref={ref}>
      <BackLink k={k} />
      <div className="kn-detail rp-page">
        <h3 className="rp-title">{replicaZh(rep)}{replicaZh(rep) !== rep.name && <small className="rp-en"> {rep.name}</small>}</h3>
        {rep.notes && <ClampText text={rep.notes} lines={4} />}
        <div className="kn-kv">
          <span>品类</span><span>{genreLabel(k, rep.genre)}</span>
          <span>风格家族</span><span><FamilyLink k={k} id={rep.family} /></span>
          <span>示例内容</span><span title="画面上的文字和数据用这款示例游戏的（cnt.pack），不写真实游戏的文字">{packLabel(rep)}</span>
          <span>画面</span><span>{artText(rep)}</span>
          {avg !== undefined && <><span>像不像</span><span><Overall v={avg} /> 各屏平均{round ? ` · 第 ${round} 轮评分` : ''}{prev !== undefined ? `（第 ${round - 1} 轮 ${prev}，${signed(avg - prev)}）` : ''}</span></>}
          <span>缺口</span><span>{gaps.length ? `${gaps.length} 条（高 ${countSev(gaps, 'high')} · 中 ${countSev(gaps, 'medium')} · 低 ${countSev(gaps, 'low')}）` : '无'}</span>
        </div>
        {k && rep.card && (
          <div className="rp-cardrow">
            <CardThumb k={k} id={rep.card} />
            <span>参考卡{k.cardById.get(rep.card)?.shots?.length ? `（${k.cardById.get(rep.card)!.shots.length} 张截图）` : ''}{LOCAL_REFS ? '：点缩略图放到视口右下角对照' : ''}</span>
          </div>
        )}

        <div className="kn-sec">逐屏套用（{screensOf(rep).length} 屏）</div>
        <p className="rp-explain">
          「套用（画面 + UI）」连画面一起换成上面写的画面；「只套 UI」保留现在的画面。
          两种都会先把 UI 全部回到跟随再套这一屏，一步完成，可以撤销。
        </p>
        {screensOf(rep).map((s) => (
          <ScreenCard key={s.key} rep={rep} s={s} gaps={gaps.filter((g) => gapScreens(g).includes(s.key))} diffs={diffs.map(([n, d]) => [n, diffsOf(d, s.key)] as [number, string[]]).filter(([, d]) => d.length > 0)} />
        ))}

        {shared.length > 0 && (
          <>
            <div className="kn-sec">整套共有的缺口（{shared.length}）</div>
            <GapList gaps={shared} showScreen />
          </>
        )}
        {(rep.revisions?.length ?? 0) > 0 && (
          <details className="rp-more">
            <summary>修订记录（{rep.revisions!.length} 条：每轮对照之后改了什么）</summary>
            <ol className="kn-steps">{rep.revisions!.map((x, i) => <li key={i}>{x}</li>)}</ol>
          </details>
        )}
        <p className="rp-foot">评分 0–10，只比较 UI 层（布局、元素、配色、字体、形状、密度、整体），不比较世界美术。缺口是参数体系表达不了的地方，会交给后续的参数扩充。</p>
      </div>
    </div>
  );
}

/** 长文本：默认收成几行，点"展开全文"看全部 */
function ClampText({ text, lines }: { text: string; lines: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > lines * 22;
  const clamp = long && !open;
  return (
    <div className="rp-notes-wrap">
      <p className={`rp-notes ${clamp ? 'clamp' : ''}`} style={clamp ? { WebkitLineClamp: lines } : undefined}>{text}</p>
      {long && <span className="rp-toggle" onClick={() => setOpen(!open)}>{open ? '收起' : '展开全文'}</span>}
    </div>
  );
}

function ScreenCard({ rep, s, gaps, diffs }: { rep: KReplica; s: KReplicaScreen; gaps: KReplicaGap[]; diffs: [number, string[]][] }) {
  const dev = useShell((st) => st.dev);
  // 「当前」：来源停在这个名作的这一屏（不按撤销记录的标签认——标签的写法归 A / D，会变）；与 A 的 isReplicaOn 同一个判断，写成订阅的形式
  const applied = useStore((st) => st.origin.scene === replicaSceneId(rep) && st.origin.screen === s.key);
  const hist = replicaScoreHistory(rep, s.key);
  const score = hist.at(-1);
  const prev = hist.length > 1 ? hist[hist.length - 2] : undefined;
  const kind = screenKind(rep, s);
  const nBase = Object.keys(rep.base ?? {}).length, nScreen = Object.keys(s.values ?? {}).length;
  const ui = `UI：先全部回到跟随，再套示例内容「${packLabel(rep)}」+ 整套取值 ${nBase} 项 + 这一屏 ${nScreen} 项`;
  const refTip = refImageUrl(s.ref) ? '；同时把参考截图放到视口右下角' : '';
  const high = countSev(gaps, 'high');
  return (
    <div className={`rp-screen ${applied ? 'on' : ''}`}>
      <div className="rp-screen-head">
        <b>{screenTitle(s.key)}</b>
        {/* 屏的英文 key 只在开发者模式显示（整合 U#18 的口径：内部 id 不进平时的界面） */}
        {dev && <span className="term">{s.key}</span>}
        {score?.overall !== undefined && <Overall v={score.overall} />}
      </div>
      {kind && <div className="rp-kind">{kind}</div>}
      {hist.length > 1 && <ScoreHistory hist={hist} />}
      <RefShot rep={rep} s={s} />
      {score && <Scores score={score} prev={prev} />}
      <div className="rp-actions">
        <button className="btn small primary" title={`画面：${artText(rep)}；${ui}${refTip}。一步，可撤销`} onClick={() => applyScreen(rep, s, false)}>套用（画面 + UI）</button>
        <button className="btn small" title={`画面不动；${ui}${refTip}。一步，可撤销`} onClick={() => applyScreen(rep, s, true)}>只套 UI</button>
        {applied && <span className="chip ok">当前</span>}
      </div>
      {gaps.length > 0 && (
        <details className="rp-more">
          <summary>这一屏的缺口 {gaps.length}{high ? `（高 ${high}）` : ''}</summary>
          <GapList gaps={gaps} />
        </details>
      )}
      {diffs.map(([n, d]) => (
        <details key={n} className="rp-more">
          <summary>第 {n} 轮对照时和参考的差异 {d.length}</summary>
          <ul className="rp-diffs">{d.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </details>
      ))}
    </div>
  );
}

/** 这一屏的参考截图：开发环境显示（点一下放到视口右下角）；生产构建显示说明；没有参考图时说明是凭记忆编码 */
function RefShot({ rep, s }: { rep: KReplica; s: KReplicaScreen }) {
  const setRef = useStore((st) => st.setRefImage);
  if (!s.ref) return <div className="rp-noref">凭记忆编码，没有参考图</div>;
  const url = refImageUrl(s.ref);
  if (!url) return <div className="rp-noref"><RefNote inline /></div>;
  const label = `${replicaZh(rep)} · ${screenTitle(s.key)}`;
  return (
    <figure className="rp-shot" title="点一下放到视口右下角对照">
      <RefImage path={s.ref} alt={`参考：${label}`} className="rp-ref" onClick={() => setRef({ url, label })} />
      <figcaption>参考截图 · 点一下放到视口右下角对照</figcaption>
    </figure>
  );
}

const SCORE_ITEMS: [keyof KReplicaScore, string, string][] = [
  ['layout', '布局', '各信息元素的位置、分区、留白、对齐'],
  ['elements', '元素', '元素的画法（条 / 圈 / 格 / 图标 / 列表 / 卡片……）与数量'],
  ['palette', '配色', 'UI 的配色：底、字、强调色、明暗'],
  ['type', '字体', '字体类别、字号层级、大小写、描边'],
  ['shape', '形状', '面板形状、边框、外框材质、饰件、图标风格'],
  ['density', '密度', '信息密度与层级（一眼先看到什么）'],
];

/** 当前轮的六项评分；prev = 上一轮（悬停提示里写变化） */
function Scores({ score, prev }: { score: KReplicaScore; prev?: KReplicaScore }) {
  const items = SCORE_ITEMS.filter(([key]) => typeof score[key] === 'number');
  if (!items.length) return null;
  return (
    <div className="rp-scores" title={score.round ? `第 ${score.round} 轮评分（0–10，只看 UI 层）` : '评分 0–10，只看 UI 层'}>
      {items.map(([key, label, tip]) => {
        const v = score[key] as number;
        const p = prev?.[key];
        const d = typeof p === 'number' ? v - p : 0;
        return (
          <span key={key} className="rp-score" title={`${label}：${tip}${typeof p === 'number' ? `（第 ${prev!.round} 轮 ${p} → ${v}）` : ''}`}>
            <span>{label}</span>
            <span className="rp-bar"><i style={{ width: `${Math.max(0, Math.min(10, v)) * 10}%` }} /></span>
            <b className={d > 0 ? 'up' : d < 0 ? 'down' : ''}>{v}</b>
          </span>
        );
      })}
    </div>
  );
}

/** 逐轮的整体分：R1 3 → R2 4（+1） */
function ScoreHistory({ hist }: { hist: KReplicaScore[] }) {
  const xs = hist.filter((x) => typeof x.overall === 'number');
  if (xs.length < 2) return null;
  const d = (xs.at(-1)!.overall as number) - (xs[0].overall as number);
  return (
    <div className="rp-history" title="每一轮对照之后的「整体像不像」（0–10）">
      {xs.map((x, i) => <span key={i}>{i > 0 && <span className="rp-arrow">→</span>}R{x.round} <b>{x.overall}</b></span>)}
      {d !== 0 && <span className={`rp-delta ${d > 0 ? 'up' : 'down'}`}>{signed(d)}</span>}
    </div>
  );
}

/** "整体像不像"分：≥ 6 绿、≤ 3 橙 */
function Overall({ v }: { v: number }) {
  return <span className={`rp-overall ${v >= 6 ? 'good' : v <= 3 ? 'low' : ''}`} title="整体像不像这款游戏的 UI（0–10，只看 UI 层，不看世界美术）">{v}<small>/10</small></span>;
}

const SEV_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };

function GapList({ gaps, showScreen }: { gaps: KReplicaGap[]; showScreen?: boolean }) {
  return (
    <ul className="rp-gaps">
      {gaps.map((g, i) => (
        <li key={i} className={`rp-sev-${g.severity}`}>
          <span className="rp-sev" title="严重度：对观感的影响">{SEV_LABEL[g.severity] ?? g.severity}</span>
          {g.kind && <span className="rp-gkind" title="缺口类型（docs/ui-replicas.md）">{GAP_KIND_LABEL[g.kind as KGapKind] ?? g.kind}</span>}
          {showScreen && g.screen && <span className="rp-gap-screen">{gapScreens(g).length ? gapScreens(g).map(screenTitle).join(' / ') : '整套'}：</span>}
          {g.what}
          {g.proposal && <div className="rp-proposal">建议：{g.proposal}</div>}
        </li>
      ))}
    </ul>
  );
}
