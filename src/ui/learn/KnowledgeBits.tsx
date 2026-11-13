import { Fragment, useState, type ReactNode } from 'react';
import { getParam } from '../../dims/registry';
import { cardName, cardShotUrl, LOCAL_REFS, peekReplicas, REF_DEV_ONLY_NOTE, refImageUrl, type UiKnowledge } from '../../content/uiKnowledge';
import { uiKeyLabel } from '../../hud/sys/register';
import { useStore, type KnowEntry } from '../../state/store';
// 参数名 / 取值的文字函数放在 knowledgeText.ts、大窗的 useCloseOnAction 放在 useCloseOnAction.ts（T0）：本文件只导出组件，Fast Refresh 才能热替换
import { paramLabel, paramValueText } from '../hud/knowledgeText';
import '../hud/knowledge.css';

/*
 * UI 知识库的共用小件（docs/t1-tool-knowledge.md）：参考截图、卡片缩略图、原则 / 家族 / 参数小标签、加载提示。
 * 原则面板、风格图谱、复刻库、参数行都用这里的组件，保证同一个东西到处长得一样、点了去同一个地方。
 * 归属：B1（G1 构建者）可以改内部实现与样式，导出的组件名与 props 不改（其他构建者已经在用）。
 * 截图只在开发服务器上显示（refImageUrl），生产构建显示 REF_DEV_ONLY_NOTE。
 */

/* ---------- 参数的可读名字与取值：paramLabel / paramValueText 在 knowledgeText.ts ---------- */

/** 知识库加载中 / 失败 */
export function KnowledgeLoading({ error, what = 'UI 知识库' }: { error?: string | null; what?: string }) {
  return <p className="hint kn-loading">{error ? `${what}加载失败：${error}` : `正在加载${what}…`}</p>;
}

/** 生产构建里代替参考截图的说明 */
export function RefNote({ inline }: { inline?: boolean }) {
  return <span className={`kn-note ${inline ? 'inline' : ''}`}>{REF_DEV_ONLY_NOTE}</span>;
}

/** 一张本地参考截图（qa/refs-cache/… 的相对路径）；生产构建显示说明 */
export function RefImage({ path, alt, className, onClick }: { path: string | null | undefined; alt: string; className?: string; onClick?: () => void }) {
  const url = refImageUrl(path);
  if (!path) return <span className="kn-note">没有参考截图</span>;
  if (!url) return <RefNote />;
  return <img className={`kn-ref ${className ?? ''}`} src={url} alt={alt} loading="lazy" onClick={onClick} title={onClick ? `${alt}（点一下放到视口右下角对照）` : alt} />;
}

/** 参考卡缩略图 + 名字（第一张截图）；点击默认把截图设为视口右下角的对照图 */
export function CardThumb({ k, id, shot = 0, onClick }: { k: UiKnowledge; id: string; shot?: number; onClick?: () => void }) {
  const url = cardShotUrl(k, id, shot);
  const name = cardName(k, id);
  const setRef = useStore((s) => s.setRefImage);
  const click = onClick ?? (url ? () => setRef({ url, label: name }) : undefined);
  const note = k.cardById.get(id)?.note;
  return (
    <figure className={`kn-thumb ${click ? 'can' : ''}`} title={`${name}${note ? `\n${note}` : ''}${url && !onClick ? '\n点一下放到视口右下角对照' : ''}`} onClick={click && ((e) => { e.stopPropagation(); click(); })}>
      {url ? <img src={url} alt={name} loading="lazy" /> : <div className="kn-thumb-none">{k.cardById.has(id) ? REF_DEV_ONLY_NOTE : '参考库外'}</div>}
      <figcaption>{name}</figcaption>
    </figure>
  );
}

/** 一排参考卡缩略图（开发环境）；生产构建只列名字 */
export function CardThumbs({ k, ids, max = 6 }: { k: UiKnowledge; ids: string[]; max?: number }) {
  const [all, setAll] = useState(false);
  if (!ids.length) return null;
  if (!LOCAL_REFS) return <CardChips k={k} ids={ids} max={max} />;
  const list = all ? ids : ids.slice(0, max);
  return (
    <div className="kn-thumbs">
      {list.map((id) => <CardThumb key={id} k={k} id={id} />)}
      {ids.length > max && <span className="chip link kn-more" onClick={(e) => { e.stopPropagation(); setAll(!all); }}>{all ? '收起' : `另 ${ids.length - max} 款`}</span>}
    </div>
  );
}

/** 例子游戏的名字小标签（悬停看卡片笔记；开发环境有截图的点一下放到视口右下角对照） */
export function CardChips({ k, ids, max = 8 }: { k: UiKnowledge; ids: string[]; max?: number }) {
  const setRef = useStore((s) => s.setRefImage);
  const [all, setAll] = useState(false);
  if (!ids.length) return null;
  const list = all ? ids : ids.slice(0, max);
  return (
    <span className="kn-cards">
      {list.map((id) => {
        const name = cardName(k, id);
        const url = cardShotUrl(k, id);
        const note = k.cardById.get(id)?.note;
        return (
          <span
            key={id} className={`chip ${url ? 'link' : ''}`} title={`${note ?? id}${url ? '\n点一下在视口右下角看截图' : ''}`}
            onClick={url ? (e) => { e.stopPropagation(); setRef({ url, label: name }); } : undefined}
          >{name}</span>
        );
      })}
      {ids.length > max && <span className="chip link kn-more" onClick={(e) => { e.stopPropagation(); setAll(!all); }}>{all ? '收起' : `另 ${ids.length - max} 款`}</span>}
    </span>
  );
}

/** 原则小标签：点了打开原则页（左栏"UI 原则"） */
export function PrincipleChip({ k, id, label }: { k: UiKnowledge; id: string; label?: string }) {
  const open = useStore((s) => s.openKnowledge);
  const p = k.principleById.get(id);
  const ch = p ? undefined : k.chapterById.get(id);
  const text = label ?? p?.title ?? (ch ? `品类篇：${ch.label}` : id);
  const tip = p ? `${p.title}\n${p.problem}\n（点一下打开原则页）` : ch ? `品类篇：${ch.label}\n${ch.summary}\n（点一下打开品类篇）` : id;
  return <span className="chip blue link kn-chip-principle" title={tip} onClick={(e) => { e.stopPropagation(); open('principle', id); }}>{text}</span>;
}

/**
 * 风格家族小标签：点了打开图谱里的家族页（左栏"UI 风格图谱"）。
 * needsRefs 的名字后面只加一个空心小圆点（悬停看"待补参考"的说明）——约一半家族都待补参考，300px 的栏里不能每个都拖一串字；
 * 完整的"待补参考"标签只在图谱列表与家族页上。
 */
export function FamilyChip({ k, id, label }: { k: UiKnowledge; id: string; label?: string }) {
  const open = useStore((s) => s.openKnowledge);
  const f = k.familyById.get(id);
  if (!f) return <span className="chip">{label ?? id}</span>;
  const tip = `${f.name}\n${f.oneLiner ?? f.definition}${f.needsRefs ? '\n○ 待补参考：卡库里几乎看不到这种 UI，结论多半按定义推断' : ''}\n（点一下打开风格图谱）`;
  return (
    <span className="chip link kn-chip-family" title={tip} onClick={(e) => { e.stopPropagation(); open('family', id); }}>
      {label ?? f.name}{f.needsRefs && <i className="kn-needs-mark" aria-label="待补参考">○</i>}
    </span>
  );
}

/** UI 参数小标签：点了让右栏 UI 面板跳到这个参数（覆盖键 / 元素实例键也行） */
export function ParamChip({ id, value }: { id: string; value?: unknown }) {
  const jump = useStore((s) => s.jumpUiParam);
  const label = paramLabel(id);
  const v = value === undefined ? '' : `＝${paramValueText(id, value)}`;
  return <span className="chip link kn-chip-param" title={`${label}${v}\n${id}（点一下在右栏找到这一项）`} onClick={(e) => { e.stopPropagation(); jump(id); }}>{label}{v}</span>;
}

/* ---------- 正文：id 换成人看得懂的（原则面板、视口演示条共用） ---------- */

const optLabel = (param: string, v: string) => getParam(param)?.options?.find((o) => o.value === v)?.label;
const isParamKey = (t: string) => !!getParam(t) || !!uiKeyLabel(t);

/** 括号里的参考卡 id（整段去掉）· 单独的参考卡 id · 参数 id（含覆盖键 / 元素实例键）/ 元素、界面、家族 id */
const TOKEN = /([（(]\s*(?:steam|gameui|iig):[\w-]+(?:\s*[、,，;；/]\s*(?:steam|gameui|iig):[\w-]+)*\s*[）)])|((?:steam|gameui|iig):[\w-]+)|(\b[a-z]{2,6}\.[A-Za-z]\w*(?:\.[A-Za-z]\w*)*(?:@[a-z]+(?:\.[A-Za-z]\w*)*)?)/g;

/**
 * 正文：参数 id 换成可点的参数小标签，元素 / 界面 id 换成中文名，参考卡 id 换成游戏名，括号里的卡 id 去掉（前面已经写了游戏名）；
 * 图谱里有的家族 id（fam.holo……）换成家族小标签。k 还没加载完时卡与家族保持原样，参数与元素 / 界面照换（不靠知识库）。
 */
export function RichText({ k, text }: { k: UiKnowledge | null; text: string | undefined }) {
  if (!text) return null;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at < last) continue; // 已经被前一个（加长的家族 id）吃掉
    let node: ReactNode | undefined;
    let len = m[0].length;
    if (m[1]) node = k ? null : undefined; // 括号里的卡 id：整段去掉（没有知识库时留着，免得前文没写名字）
    else if (m[2]) node = k ? <span className="pr-cardref" title={m[2]}>{cardName(k, m[2])}</span> : undefined;
    else if (m[3]) {
      const t = m[3];
      // 家族 id 带连字符（fam.dark-gold）：TOKEN 只匹配到连字符前，这里往后补全
      const fam = k && t.startsWith('fam.') ? /^fam\.[\w-]+/.exec(text.slice(at))?.[0] : undefined;
      if (k && fam && k.familyById.has(fam)) { node = <FamilyChip k={k} id={fam} />; len = fam.length; }
      else if (isParamKey(t)) node = <ParamChip id={t} />;
      else { const l = optLabel('cnt.elements', t) ?? optLabel('cnt.screen', t); if (l) node = <span className="pr-term" title={t}>{l}</span>; }
    }
    if (node === undefined) continue;
    out.push(text.slice(last, at));
    if (node) out.push(node);
    last = at + len;
  }
  out.push(text.slice(last));
  return <>{out.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</>;
}

/* ---------- 返回上一条（原则 / 家族 / 复刻之间点来点去时） ---------- */

/** 返回栈里一条的名字：原则标题 / 品类篇 / 家族名 / 复刻名 */
function entryTitle(k: UiKnowledge | null, e: KnowEntry): string {
  if (e.kind === 'principle') {
    const p = k?.principleById.get(e.id);
    if (p) return p.title;
    const ch = k?.chapterById.get(e.id);
    return ch ? `品类篇：${ch.label}` : e.id;
  }
  if (e.kind === 'family') return k?.familyById.get(e.id)?.name ?? e.id;
  return peekReplicas()?.find((r) => r.id === e.id)?.name ?? e.id;
}

/** "← 返回「上一条」"：从一条原则 / 家族 / 复刻点进来时显示（store.knowStack），点了回到那一条（可以跨页签）；放在"← 全部原则"这类列表链接旁边 */
export function KnowBackLink({ k }: { k: UiKnowledge | null }) {
  const top = useStore((s) => s.knowStack[s.knowStack.length - 1]);
  const back = useStore((s) => s.knowBack);
  if (!top) return null;
  const t = entryTitle(k, top);
  const short = t.length > 14 ? `${t.slice(0, 13)}…` : t;
  const where = top.kind === 'principle' ? 'UI 原则' : top.kind === 'family' ? 'UI 风格图谱' : '复刻库';
  return <span className="kn-back kn-back-prev" title={`回到${where}里的「${t}」`} onClick={back}>← 返回「{short}」</span>;
}

/* ---------- 大窗：点了会改画面的按钮就关掉，让视口露出来：useCloseOnAction 在 useCloseOnAction.ts ---------- */
