import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { CASE_MAP } from '../../content/cases';
import { gameScene } from '../../content/gameScenes';
import { RECIPE_MAP, type Recipe } from '../../content/recipes';
import { STYLES } from '../../content/styles.data';
import { cardName, variantsOf } from '../../content/taxonomy';
import type { Values } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { artPrompt, firstClause, type PromptLang } from '../../export/artPrompt';
import * as A from '../../state/actions';
import { useStore } from '../../state/store';
import { pickGameScene } from '../scene/sceneActions';
import { SkinSwatch } from '../scene/SkinSwatches';
import { useShell } from '../stage/shell';
import { flashParam, gallerySeen, goScene, jumpParam, onGallerySeen, pickRecipe } from '../left/galleryActions';
import { DeckPop } from './DeckPop';
import { deckRecipe, familiesReady, familyFor, gamesOf, pairedSkins, prefetchFamilies, promptSkin } from './deckData';
import { atBest, bestTarget, cameraSuggestion, fitGames, gameLabel, IMAGE_NOTE, IMAGE_NOTE_TIP, imageSceneNote, type DeckCtx } from './deckText';
import '../left/gallery.css';
import './deck.css';

/*
 * 画框下方 · 配方卡（轨道 C，docs/workbench-redesign.md §2 F1 §3.1 §5.2 §7，画面模式）。默认可见 ≤100 字：
 *   ① ② ③ 三条看点（悬停 = 右栏对应参数闪一下，点击 = 跳过去）；
 *   像这些游戏（截图只在开发环境；生产构建只写名字，最多 2 款，超字数就少放）；
 *   配套 UI = D 的皮肤色板（点了套上皮肤并打开 👁UI，再点 = 回到场景默认）；
 *   变体 · 相邻 · 建议镜头（场景负责机位、配方的镜头不生效时）· 立绘场景的提示 · 在「X」最好看 ›（换到那个场景）·
 *   📋 复制提示词（▾：中 / 英、预览、体检）· 更多（区别、实现情况；开发者模式加缺口）。浮层挂在 body 上（DeckPop），不会被画框裁掉。
 * 画面来自风格研究库 / 案例近似 / 复刻（来源是 atlas: / case: / rep:）时显示那一条的名字、三个特点和复制提示词。
 * 什么都没套时只显示一行三步引导；第一次点配方卡之前，卡片上方也有一行引导。外壳（轨道 B）通过 slots.ts 挂到画框下方。
 */

const NUM = ['①', '②', '③'];
const FIRST_LINE = '① 点左边的图 · ② 右边微调 · ③ 切到 UI';
/**
 * 两行版大约要的高度：外壳按窗口高度给了一行、但实际留出来的空间放得下两行时，照样放两行（§3.3：1280×720 也能看到像这些游戏 / 配套 UI）。
 * 配套 UI 换成色板（64 高 + 名字）后中间一行约 104px，整张卡约 206–236px（1280×720 外壳给 231）
 */
const FULL_MIN_H = 206;
/** 色板（D 的 SkinSwatch）与游戏截图的宽度（CSS px，含间距）：中间一行按宽度决定放几张截图，不折行 */
const SWATCH_W = 152 + 6, GAME_W = 128 + 6, MID_GAP = 24;

/** 量自己的尺寸（外壳给的空间）：高度决定放一行还是两行，宽度决定中间一行放几张游戏截图 */
function useFitsFull(oneRow: boolean): [RefObject<HTMLDivElement | null>, boolean, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, !oneRow || size.h >= FULL_MIN_H, size.w];
}

/** 第一次点配方卡之前显示的一行引导（≤16 字） */
function useFirstRun(): boolean {
  return !useSyncExternalStore(onGallerySeen, gallerySeen, () => true);
}

export function StyleDeck({ oneRow = false }: { oneRow?: boolean }) {
  const origin = useStore((s) => s.origin);
  const [ref, full, width] = useFitsFull(oneRow);
  const first = useFirstRun();
  // 空闲时预取 UI 家族（复制提示词用它的语法）
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const run = () => { void prefetchFamilies().catch(() => undefined); };
    const t = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 8000 }) : window.setTimeout(run, 3000);
    return () => { if (!w.requestIdleCallback) window.clearTimeout(t); };
  }, []);

  const look = origin.recipe?.includes(':') ? origin.recipe : null;
  const cur = !look && origin.recipe ? RECIPE_MAP.get(origin.recipe) : undefined;
  const card = cur ? deckRecipe(cur.id) : undefined;
  let body;
  if (look) body = <LookDeck ref_={look} via={origin.via} name={origin.names[look]} full={full} />;
  else if (card && cur) body = <RecipeDeck card={card} cur={cur} full={full} first={first} width={width} />;
  else {
    body = (
      <div className="c-deck-guide">
        <span>① 点左边的图</span><span>② 右边微调</span><span>③ 切到 UI 选场景</span>
      </div>
    );
  }
  return (
    <div ref={ref} className={`c-deck ${full ? '' : 'one-row'} ${!look && !card ? 'is-guide' : ''}`}>
      {first && (look || card) && <div className="c-deck-first">{FIRST_LINE}</div>}
      {body}
    </div>
  );
}

function RecipeDeck({ card, cur, full, first, width }: { card: Recipe; cur: Recipe; full: boolean; first: boolean; width: number }) {
  const bullets = (cur.bullets?.length ? cur.bullets : card.bullets) ?? [];
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const env = String(values['game.scene'] ?? '');
  const cam = useMemo(() => cameraSuggestion(cur, values, origin.rigLock), [cur, values, origin.rigLock]);
  const imgNote = imageSceneNote(env);
  // 这次另外显示的字（首次引导、建议镜头、立绘提示）也算进 ≤100 字（§7）；有它们时先不放「相邻」
  const extra = [...(first ? [FIRST_LINE] : []), ...(cam ? ['建议镜头', cam.label] : []), ...(imgNote ? [IMAGE_NOTE] : [])];
  const ctx: DeckCtx = { scene: env, originScene: origin.scene, has: hasSceneBuilder, extra, noNeighbors: extra.length > 0 };
  const nSkins = pairedSkins(card).length;
  // 中间一行不折行：色板（152 宽）先占，剩下的宽度放得下几张游戏截图就放几张（窄窗口时少放，不把下面一行挤出画框下方）
  const inner = Math.max(0, width - 28);
  const maxShots = nSkins ? Math.max(0, Math.min(3, Math.floor((inner - nSkins * SWATCH_W - MID_GAP) / GAME_W))) : 3;
  return (
    <>
      <div className="c-deck-top">
        <b className="c-deck-name" title={`${card.name}${card.pitch ? `\n${card.pitch}` : ''}`}>{cardName(card)}{cur !== card && <small> · {cardName(cur)}</small>}</b>
        <ol className="c-bullets">
          {bullets.slice(0, 3).map((b, i) => (
            <li key={b.param + i}>
              <button
                title="点一下跳到右栏的这个参数"
                onMouseEnter={() => flashParam(b.param, true)}
                onMouseLeave={() => flashParam(b.param, false)}
                onClick={() => { flashParam(b.param, false); jumpParam(b.param); }}
              ><i>{NUM[i]}</i>{b.text}</button>
            </li>
          ))}
        </ol>
        {!full && <CopyPrompt r={cur} compact />}
      </div>
      {full && (
        <>
          <div className="c-deck-mid">
            <Games card={card} cur={cur} ctx={ctx} maxShots={maxShots} />
            <Skins r={card} />
          </div>
          <div className="c-deck-bot">
            <Variants r={card} cur={cur} />
            {/* 首次引导 / 建议镜头 / 立绘提示占了字数（§7 画框下方 ≤100）：它们在时先不放「相邻」 */}
            {!ctx.noNeighbors && <Neighbors r={card} />}
            {cam && <CameraChip cam={cam} />}
            {imgNote && <span className="c-deck-note" title={IMAGE_NOTE_TIP}>{IMAGE_NOTE}</span>}
            <BestScene r={card} />
            <span className="c-sp" />
            <CopyPrompt r={cur} />
            <More r={cur} card={card} />
          </div>
        </>
      )}
    </>
  );
}

/** 建议镜头（§5.2）：场景负责机位、配方带的镜头不生效时出现；点了 = 普通改动写这几个镜头键（一步撤销） */
function CameraChip({ cam }: { cam: { values: Values; label: string } }) {
  const apply = () => useStore.getState().setMany(cam.values, `镜头：用配方的 ${cam.label}`);
  return (
    <span className="c-deck-inline">
      <span className="c-deck-lab">建议镜头</span>
      <button className="c-chip small" title={`场景定了机位，配方自带的镜头没有用上。\n点一下改成配方的镜头：${cam.label}（可撤销；场景 ↺ 回到场景机位）`} onClick={apply}>{cam.label}</button>
    </span>
  );
}

/* ---------------- 风格研究库 / 案例近似 / 复刻的画面 ---------------- */

/** 「色:翠绿、天空蓝；天空:积云」→ 三个短特点（每个 ≤12 字，只在小句边界截） */
function traits(text: string | undefined, extra: string[] = []): string[] {
  const parts = (text ?? '').split(/[；;。]/).map((x) => x.replace(/^[^:：]{1,6}[:：]/, '').trim()).filter(Boolean);
  const out = [...parts, ...extra].map((x) => firstClause(x, 12)).filter(Boolean);
  return [...new Set(out)].slice(0, 3);
}

interface LookInfo { kind: 'atlas' | 'case' | 'rep'; id: string; name: string; tag: string; summary?: string; traits: string[] }
function lookInfo(ref: string, nameHint?: string): LookInfo {
  const kind = ref.slice(0, ref.indexOf(':')) as LookInfo['kind'];
  const id = ref.slice(ref.indexOf(':') + 1);
  if (kind === 'atlas') {
    const st = STYLES.find((s) => s.id === id);
    return { kind, id, name: st?.name ?? nameHint ?? id, tag: st ? `风格研究库 ${st.code}` : '风格研究库', summary: st?.definition, traits: traits(st?.mechanisms, st?.moods ?? []) };
  }
  if (kind === 'case') {
    const c = CASE_MAP.get(id);
    return { kind, id, name: c ? gameLabel(c.name, c.nameZh) : nameHint ?? id, tag: '名作近似', summary: c?.artFeature, traits: traits((c?.analysis?.transferable ?? []).join('；'), c?.artFeature ? [c.artFeature] : []) };
  }
  // 复刻：名字用场景图库卡片上的中文名（哈迪斯），不用复刻文件里的英文名（整合 U#10）
  return { kind: 'rep', id, name: gameScene(`rep:${id}`)?.name ?? nameHint ?? id.replace(/^rep\./, ''), tag: '名作复刻', traits: [] };
}

function LookDeck({ ref_, via, name, full }: { ref_: string; via: string | null; name?: string; full: boolean }) {
  const info = lookInfo(ref_, name);
  const base = via ? RECIPE_MAP.get(via) : undefined;
  const open = () => {
    if (info.kind === 'case') { useStore.getState().setCaseId(info.id); return; }
    if (info.kind === 'rep') {
      const s = useStore.getState();
      useStore.setState({ knowSel: { ...s.knowSel, replica: info.id } });
      useShell.getState().set({ learnOpen: true, learnTab: 'uiReplicas' });
      return;
    }
    useShell.getState().set({ learnOpen: true, learnTab: 'atlas' });
  };
  return (
    <>
      <div className="c-deck-top">
        <b className="c-deck-name" title={info.summary ?? info.name}>{info.name}<small> · {info.tag}</small></b>
        {info.traits.length > 0 && (
          <ol className="c-bullets is-text">
            {info.traits.map((t, i) => <li key={t}><span><i>{NUM[i]}</i>{t}</span></li>)}
          </ol>
        )}
        {!full && <CopyPrompt r={base} name={info.name} summary={info.summary} compact />}
      </div>
      {full && (
        <>
          {base && pairedSkins(base).length > 0 && <div className="c-deck-mid"><Skins r={base} /></div>}
          <div className="c-deck-bot">
            {base && <button className="c-link" title={`换成配方「${base.name}」原样（可撤销）`} onClick={(e) => pickRecipe(base, { alt: e.altKey, toggle: false })}>基于「{cardName(base)}」›</button>}
            <button className="c-link" title="在学习库里看这一条的说明" onClick={open}>{info.kind === 'case' ? '看拆解 ›' : '在学习里看 ›'}</button>
            <span className="c-sp" />
            <CopyPrompt r={base} name={info.name} summary={info.summary} />
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- 配方卡的各段 ---------------- */

function Games({ card, cur, ctx, maxShots }: { card: Recipe; cur: Recipe; ctx: DeckCtx; maxShots: number }) {
  // 有截图的（开发环境）按宽度少放几张；只有名字的照字数算（fitGames）
  const games = fitGames(card, cur, gamesOf(card), ctx).filter((g, i) => !g.img || i < maxShots);
  const setRef = useStore((s) => s.setRefImage);
  const setCase = useStore((s) => s.setCaseId);
  if (!games.length) return null;
  return (
    <div className="c-deck-sec">
      <span className="c-deck-lab">像这些游戏</span>
      <div className="c-games">
        {games.map((g) => (
          g.img ? (
            <button key={g.id} className="c-game" title={`${g.name}\n点一下：放到对照参考图\n右键：看这款的拆解`} onClick={() => setRef({ url: g.img!, label: g.name })} onContextMenu={(e) => { e.preventDefault(); setCase(g.id); }}>
              <img src={g.img} alt={g.name} loading="lazy" />
            </button>
          ) : (
            <button key={g.id} className="c-chip small" title={g.inLib ? `${g.name}：看这款的拆解` : `${g.name}（案例库里还没有这款）`} onClick={() => g.inLib && setCase(g.id)}>{g.name}</button>
          )
        ))}
      </div>
    </div>
  );
}

/**
 * 配套 UI：D 的皮肤色板（当前画面上这一块 UI 换成这个皮肤的样子，1:1；悬停看整帧）。
 * 点色板 = 换皮肤（与皮肤行同一个动作；再点 = 回到场景默认，按住 Alt = 保留我的改动）；真的换上了就打开 👁UI（画面模式下 HUD 默认藏着）
 */
function Skins({ r }: { r: Recipe }) {
  const skins = pairedSkins(r);
  if (!skins.length) return null;
  const showUi = (id: string) => () => {
    if (A.isSkinOn(id) && useStore.getState().origin.skin) useShell.getState().set({ hudInArt: true });
  };
  return (
    <div className="c-deck-sec">
      <span className="c-deck-lab">配套 UI</span>
      <div className="c-skins">{skins.map((id) => <span key={id} className="c-swatch" onClick={showUi(id)}><SkinSwatch skin={id} /></span>)}</div>
    </div>
  );
}

/** 变体芯片：远看看不出变化的（subtle）不放芯片，收进「更多」 */
function Variants({ r, cur }: { r: Recipe; cur: Recipe }) {
  const vs = variantsOf(r.id).filter((v) => !v.subtle || cur.id === v.id);
  if (!vs.length) return null;
  return (
    <span className="c-deck-inline">
      <span className="c-deck-lab">变体</span>
      {vs.map((v) => (
        <button key={v.id} className={`c-chip small ${cur.id === v.id ? 'on' : ''}`} title={`${v.name}\n${v.pitch ?? firstClause(v.summary, 30)}${cur.id === v.id ? '\n再点一次：回到原配方' : ''}`} onClick={(e) => (cur.id === v.id ? pickRecipe(r, { alt: e.altKey, toggle: false }) : pickRecipe(v, { alt: e.altKey, toggle: false }))}>{cardName(v)}</button>
      ))}
    </span>
  );
}

function Neighbors({ r }: { r: Recipe }) {
  const ns = (r.neighbors ?? []).map((id) => RECIPE_MAP.get(id)).filter((x): x is Recipe => !!x).slice(0, 3);
  if (!ns.length) return null;
  return (
    <span className="c-deck-inline">
      <span className="c-deck-lab">相邻</span>
      {ns.map((n) => <button key={n.id} className="c-chip small" title={n.pitch ?? n.name} onClick={(e) => pickRecipe(n, { alt: e.altKey, toggle: false })}>{cardName(n)}</button>)}
    </span>
  );
}

/**
 * 在「X」最好看 ›（§0.3：配方从不换场景，用户点了才换）。缩略图拍的环境是某个场景现在用的环境 → 换到那个场景（D 的 pickGameScene：
 * 环境、机位、布局、内容包、默认皮肤，画风不变；按住 Alt = 保留我的改动）；否则只换环境（横版·森林、俯视·小镇、白盒这些只在「换环境」里有）
 */
function BestScene({ r }: { r: Recipe }) {
  const env = useStore((s) => String(s.values['game.scene'] ?? ''));
  const originScene = useStore((s) => s.origin.scene);
  const t = bestTarget(r, hasSceneBuilder);
  if (!t || atBest(t, env, originScene)) return null;
  const sc = t.scene;
  return (
    <button className="c-link"
      title={sc ? `换到场景「${t.name}」：环境、镜头和这类游戏的默认 UI 跟着换，画风不变（可撤销）\n按住 Alt：保留我的改动` : '只换环境，画风和 UI 不变（可撤销）'}
      onClick={(e) => (sc ? void pickGameScene(sc, { alt: e.altKey }) : goScene(t.env, t.name))}>在「{t.name}」最好看 ›</button>
  );
}

/** 复制用的提示词：皮肤先定（用户选的 → 场景 / 手动的 → 配套的第一个），UI 家族语法跟着这个皮肤走 */
function makePrompt(values: Values, origin: Parameters<typeof promptSkin>[2], l: PromptLang, r: Recipe | undefined, name?: string, summary?: string) {
  const skin = promptSkin(r, values, origin);
  return artPrompt({ values, recipeId: r && !name ? r.id : null, skin, family: familyFor(r, skin), lang: l, name, summary });
}

/** 📋 复制提示词：一点就复制（中文），▾ 里切英文、预览、看体检 */
function CopyPrompt({ r, compact = false, name, summary }: { r?: Recipe; compact?: boolean; name?: string; summary?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<PromptLang>('zh');
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const make = (l: PromptLang) => makePrompt(values, origin, l, r, name, summary);
  const copy = async (l: PromptLang) => {
    const p = make(l);
    try {
      await navigator.clipboard.writeText(p.text);
      setMsg(`已复制 ${p.chars} 字${p.check.warnings.length ? ` · 体检 ${p.check.warnings.length} 条提醒` : ''}`);
    } catch {
      setOpen(true);
      setMsg('浏览器不让写剪贴板，请在下面手动复制');
    }
    window.setTimeout(() => setMsg(null), 3500);
  };
  const p = open ? make(lang) : null;
  const anchor = useRef<HTMLSpanElement>(null);
  // 浮层挂到 body 上、按按钮位置固定定位（整合 U#6：原来在 overflow:hidden 的画框下方区域里向上弹，表头藏在画框后面）
  return (
    <span className="c-copy" ref={anchor}>
      <button className="c-btn" title={`复制这套画面的美术提示词（约 250 字，只写生效的参数）${familiesReady() ? '' : '\nUI 家族资料还在加载，先只写皮肤'}`} onClick={() => copy(lang)}>📋 {compact ? '复制' : '复制提示词'}</button>
      <button className={`c-btn caret ${open ? 'on' : ''}`} title="中 / 英、预览、体检" aria-expanded={open} onClick={() => { setOpen(!open); void prefetchFamilies().catch(() => undefined); }}>▾</button>
      <DeckPop anchor={anchor} open={!!msg && !open} passive className="c-copy-msg">{msg}</DeckPop>
      <DeckPop anchor={anchor} open={open && !!p} onClose={() => setOpen(false)} className="c-copy-pop">
        {p && (
          <>
            <div className="c-copy-head">
              <button className={`c-chip small ${lang === 'zh' ? 'on' : ''}`} onClick={() => setLang('zh')}>中文</button>
              <button className={`c-chip small ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>English</button>
              <span className="c-sp" />
              <span className="c-copy-n">{p.chars} 字</span>
              <button className="c-btn" onClick={() => copy(lang)}>复制</button>
              <button className="c-link" onClick={() => setOpen(false)}>收起</button>
            </div>
            {msg && <div className="c-copy-note">{msg}</div>}
            <textarea readOnly value={p.text} rows={7} onFocus={(e) => e.currentTarget.select()} />
            <div className="c-copy-check">
              {p.check.warnings.length ? p.check.warnings.map((w) => <div key={w} className="warn">体检：{w}</div>) : <div className="ok">体检：没有发现技术误区</div>}
            </div>
          </>
        )}
      </DeckPop>
    </span>
  );
}

/** 更多：区别、实现情况、远看不明显的细节变体；开发者模式再显示缺口 */
function More({ r, card }: { r: Recipe; card: Recipe }) {
  const [open, setOpen] = useState(false);
  const dev = useShell((s) => s.dev);
  const btn = useRef<HTMLButtonElement>(null);
  const subtle = variantsOf(card.id).filter((v) => v.subtle && v.id !== r.id);
  return (
    <span className="c-more">
      <button ref={btn} className={`c-btn ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>更多</button>
      <DeckPop anchor={btn} open={open} onClose={() => setOpen(false)} className="c-more-pop">
        <p><b>看哪里</b>{r.lookAt}</p>
        <p><b>区别</b>{r.differs}</p>
        <p><b>已实现</b>{r.implemented.join('、')}</p>
        {dev && r.missing.length > 0 && <p className="warn"><b>缺 {r.missing.length} 项</b>{r.missing.join('；')}</p>}
        {r.refs.length > 0 && <p><b>参考</b>{r.refs.join('、')}</p>}
        {subtle.length > 0 && (
          <p><b>细节变体</b>{subtle.map((v) => <button key={v.id} className="c-chip small" title={`${v.name}：只改表面细节，远看不明显，要靠近看`} onClick={(e) => pickRecipe(v, { alt: e.altKey, toggle: false })}>{cardName(v)}</button>)}<span className="c-more-dim">（远看不明显）</span></p>
        )}
        <button className="c-link" onClick={() => setOpen(false)}>收起</button>
      </DeckPop>
    </span>
  );
}
