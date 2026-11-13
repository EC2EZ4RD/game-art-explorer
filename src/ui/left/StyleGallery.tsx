import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent, type MouseEvent as RMouseEvent } from 'react';
import { RECIPE_MAP, type Recipe } from '../../content/recipes';
import { STYLES } from '../../content/styles.data';
import {
  CATEGORIES, GALLERY, MOOD_LIST, OVERLAYS, REALTIME_DOT, REALTIME_LABEL, REF_ONLY, cardName, is2dLive, realtimeOf, recipesForMood, refThumbUrl, thumbUrl, type OverlayDef, type Realtime,
} from '../../content/taxonomy';
import { DIMS } from '../../dims/registry';
import type { DimId } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { useStore } from '../../state/store';
import { recipeDimValues } from '../exploreData';
import { useShell } from '../stage/shell';
import { preloadLearnImages } from '../learn/learnData';
import { useGalleryUi } from './galleryState';
import { isOverlayOn, pickRecipe, toggleOverlay, useCurrentRecipe, useViaOnly } from './galleryActions';
import './gallery.css';

/*
 * 左栏 · 配方图库（轨道 C，docs/workbench-redesign.md §1.3 §2 F1 §3.1 §7）。
 *   图片卡（16:9 缩略图 + ≤8 字名字，必要时「局部」「2D」角标），点一下就套用；再点一次已选中的卡 = 不用配方。
 *   画面来自风格研究库 / 案例 / 复刻时，它借用的配方卡描虚线（点它 = 换成这个配方原样）。
 *   标题处：🎲 随机换一个配方，▾ 打开「随机探索」（锁定部分维度再随机，§10）；🔒 保留我的改动。
 *   ↑ / ↓（← / →）切到相邻的卡并套用；右键 = 混搭（只取它的某一维）；悬停 = 一句话卖点。
 *   底部：叠加一行（可配任何配方）+「更多风格 227 ›」进学习库。按住 Alt 点 = 保留我的改动（或打开标题处的开关）。
 * 外壳（轨道 B）通过 src/ui/stage/slots.ts 挂到画面模式的左栏。
 */

const MIX_DIMS: DimId[] = ['shape', 'geometry', 'material', 'shading', 'lines', 'surface', 'color', 'lighting', 'camera', 'atmosphere'];

export function StyleGallery() {
  const ui = useGalleryUi();
  const cur = useCurrentRecipe();
  const viaOnly = useViaOnly();
  const curParent = cur ? RECIPE_MAP.get(cur)?.parent ?? null : null;
  const keepMine = useShell((s) => s.keepMine);
  const [moodOpen, setMoodOpen] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const moodIds = ui.mood ? recipesForMood(ui.mood) : null;
    const q = ui.q.trim().toLowerCase();
    return GALLERY.filter((r) => {
      if (ui.cat !== 'all' && r.category !== ui.cat) return false;
      if (ui.only2d && !is2dLive(r, hasSceneBuilder)) return false;
      if (ui.realtime && ui.realtime !== 'ref' && realtimeOf(r) !== ui.realtime) return false;
      if (ui.realtime === 'ref') return false;
      if (moodIds && !moodIds.has(r.id)) return false;
      if (q && !`${r.name}${r.short ?? ''}${r.nameEn ?? ''}${r.family}${r.tags.join('')}${r.refs.join('')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ui.cat, ui.only2d, ui.realtime, ui.mood, ui.q]);

  const refs = useMemo(() => REF_ONLY.filter((c) => (ui.cat === 'all' || c.category === ui.cat) && !ui.only2d && !ui.mood && (!ui.realtime || ui.realtime === 'ref')), [ui.cat, ui.only2d, ui.mood, ui.realtime]);
  const showRefs = ui.realtime === 'ref';

  // 空闲时预取学习库首屏的小图（复刻卡、风格研究库前几张、仅参考的示意图），打开学习库时不再白一片（整合 U#19）
  useEffect(() => { preloadLearnImages(); }, []);

  // 选中的卡滚进视野（套用来自别处时，比如 ↑ / ↓、随机、撤销）
  useEffect(() => {
    const el = cur ? gridRef.current?.querySelector<HTMLElement>(`[data-rid="${curParent ?? cur}"]`) : null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cur, curParent]);

  const onCardKey = (e: RKeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = list[i + step];
    if (!next) return;
    pickRecipe(next, { alt: e.altKey, toggle: false });
    gridRef.current?.querySelector<HTMLElement>(`[data-rid="${next.id}"]`)?.focus();
  };
  const onCardMenu = (e: RMouseEvent, r: Recipe) => {
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).closest('.c-gal')!.getBoundingClientRect();
    setMenu({ id: r.id, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const random = () => {
    const pool = list.filter((r) => r.id !== cur);
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (r) pickRecipe(r, { toggle: false });
  };
  const openLearn = (tab: string) => useShell.getState().set({ learnOpen: true, learnTab: tab });
  const moodName = ui.mood ? MOOD_LIST.find((m) => m.id === ui.mood)?.name : null;
  // 2D 场景（F 轨道）上线前没有真正的 2D 卡：筛选芯片先不出现
  const any2d = useMemo(() => GALLERY.some((r) => is2dLive(r, hasSceneBuilder)), []);

  return (
    <div className="c-gal" onClick={() => { setMenu(null); }}>
      <div className="c-gal-head">
        <b>配方</b>
        <span className="c-gal-sp" />
        <button className="c-ico" title="随机换一个配方（在当前筛选里挑）" onClick={random}>🎲</button>
        <button className="c-ico c-ico-caret" title="随机探索：锁定部分维度，其余维度随机（小面板）" onClick={() => useStore.getState().setPanel('random')}>▾</button>
        <button className={`c-ico ${ui.searchOpen ? 'on' : ''}`} title="搜索配方" onClick={() => ui.set({ searchOpen: !ui.searchOpen, q: ui.searchOpen ? '' : ui.q })}>🔍</button>
        <button
          className={`c-ico c-keep ${keepMine ? 'on' : ''}`}
          aria-pressed={keepMine}
          title={`保留我的改动：${keepMine ? '开' : '关'}\n开着时换配方不清掉右栏的手动微调（也可以按住 Alt 点卡片）`}
          onClick={() => useShell.getState().set({ keepMine: !keepMine })}
        >🔒</button>
      </div>
      {ui.searchOpen && (
        <div className="c-gal-search">
          <input autoFocus placeholder="名字、游戏、标签…" value={ui.q} onChange={(e) => ui.set({ q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') ui.set({ q: '', searchOpen: false }); }} />
        </div>
      )}
      <div className="c-gal-chips">
        <button className={`c-chip ${ui.cat === 'all' ? 'on' : ''}`} onClick={() => ui.set({ cat: 'all' })}>全部</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`c-chip ${ui.cat === c.id ? 'on' : ''}`} title={c.name} onClick={() => ui.set({ cat: ui.cat === c.id ? 'all' : c.id })}>{c.short}</button>
        ))}
        <button className={`c-chip ${ui.mood || ui.realtime ? 'on' : ''}`} title="按感觉、可实现度筛选" onClick={(e) => { e.stopPropagation(); setMoodOpen(!moodOpen); }}>
          {moodName ?? (ui.realtime ? REALTIME_LABEL[ui.realtime] : '感觉')}▾
        </button>
        {(any2d || ui.only2d) && <button className={`c-chip ${ui.only2d ? 'on' : ''}`} title="只看 2D 画面（横版、俯视、平面）" onClick={() => ui.set({ only2d: !ui.only2d })}>2D</button>}
      </div>
      {moodOpen && <MoodPop onClose={() => setMoodOpen(false)} />}

      <div className="c-gal-scroll">
        {showRefs ? (
          <RefGrid cards={refs} onOpen={() => openLearn('ref')} />
        ) : (
          <div className="c-gal-grid" ref={gridRef}>
            {list.map((r, i) => {
              const showHead = ui.cat === 'all' && !ui.q && !ui.mood && !ui.only2d && !ui.realtime && (i === 0 || list[i - 1].category !== r.category);
              const rt = realtimeOf(r);
              const hit = cur === r.id || curParent === r.id;
              const on = hit && !viaOnly;
              const via = hit && viaOnly;
              const flat2d = is2dLive(r, hasSceneBuilder);
              return [
                showHead && <div key={`h-${r.category}`} className="c-gal-sec">{CATEGORIES.find((c) => c.id === r.category)?.name}</div>,
                <button
                  key={r.id}
                  data-rid={r.id}
                  className={`c-card ${on ? 'on' : ''} ${via ? 'via' : ''}`}
                  title={`${r.name}${r.pitch ? `\n${r.pitch}` : ''}${rt === 'partial' ? '\n局部：主要看点只做出了一部分' : ''}${on && cur === r.id ? '\n再点一次 = 不用配方' : ''}${via ? '\n现在的画面借用了它：点一下换成它原样' : ''}\n右键：只取它的某一维（混搭）`}
                  onClick={(e) => pickRecipe(r, { alt: e.altKey })}
                  onKeyDown={(e) => onCardKey(e, i)}
                  onContextMenu={(e) => onCardMenu(e, r)}
                >
                  <Thumb id={r.id} />
                  {(flat2d || rt === 'partial') && <span className="c-badges">{rt === 'partial' && <span className="c-badge">局部</span>}{flat2d && <span className="c-badge">2D</span>}</span>}
                  <span className="c-card-name">{cardName(r)}</span>
                </button>,
              ];
            })}
            {!list.length && <div className="c-gal-empty">没有符合的配方</div>}
          </div>
        )}
        <div className="c-gal-more">
          <button className="c-link" onClick={() => openLearn('atlas')} title="风格研究库：调研整理的全部风格，可以载入近似参数">更多风格 {STYLES.length} ›</button>
          <button className="c-link" onClick={() => (showRefs ? ui.set({ realtime: null }) : ui.set({ realtime: 'ref' }))} title="做不出来、只能看参考的风格">{showRefs ? '‹ 回到配方' : `仅参考 ${REF_ONLY.length} ›`}</button>
        </div>
      </div>

      <div className="c-gal-foot">
        <div className="c-gal-ov">
          <span className="c-gal-lab">叠加</span>
          <OverlayChips group="fx" />
        </div>
        <div className="c-gal-ov" title="时段四选一：点另一个会换掉现在的">
          <span className="c-gal-lab">时段</span>
          <OverlayChips group="time" />
        </div>
      </div>

      {menu && <MixMenu id={menu.id} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </div>
  );
}

/** 缩略图：没烘焙出来时显示分类色块（不报错） */
function Thumb({ id }: { id: string }) {
  const [bad, setBad] = useState(false);
  const r = RECIPE_MAP.get(id);
  if (bad) return <span className={`c-thumb none cat-${r?.category ?? 'form'}`} />;
  return <img className="c-thumb" src={thumbUrl(id)} alt="" loading="lazy" draggable={false} onError={() => setBad(true)} />;
}

function OverlayChips({ group }: { group: OverlayDef['group'] }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const state = { values, origin };
  return (
    <>
      {OVERLAYS.filter((o) => o.group === group).map((o) => (
        <span key={o.id} className="c-ov-wrap">
          <button
            className={`c-chip small ${isOverlayOn(o, state) ? 'on' : ''}`}
            title={`${o.short}：叠到当前配方上${o.recipe ? '（右键看它的完整配方）' : ''}，再点一次去掉${group === 'time' ? '；时段只能选一个' : ''}`}
            onClick={() => toggleOverlay(o)}
            onContextMenu={(e) => { if (!o.recipe) return; e.preventDefault(); const r = RECIPE_MAP.get(o.recipe); if (r) pickRecipe(r, { toggle: false }); }}
          >{o.chip}</button>
        </span>
      ))}
    </>
  );
}

/** 感觉▾：36 个情绪词 + 可实现度 */
function MoodPop({ onClose }: { onClose: () => void }) {
  const ui = useGalleryUi();
  const pick = (p: Parameters<typeof ui.set>[0]) => { ui.set(p); onClose(); };
  return (
    <div className="c-pop" onClick={(e) => e.stopPropagation()}>
      <div className="c-pop-row">
        <span className="c-gal-lab">可实现度</span>
        {(['live', 'partial', 'ref'] as Realtime[]).map((k) => (
          <button key={k} className={`c-chip small ${ui.realtime === k ? 'on' : ''}`} onClick={() => pick({ realtime: ui.realtime === k ? null : k })}>{REALTIME_DOT[k]} {REALTIME_LABEL[k]}</button>
        ))}
      </div>
      <div className="c-pop-moods">
        <button className={`c-chip small ${!ui.mood ? 'on' : ''}`} onClick={() => pick({ mood: null })}>不限</button>
        {MOOD_LIST.map((m) => (
          <button key={m.id} className={`c-chip small ${ui.mood === m.id ? 'on' : ''}`} onClick={() => pick({ mood: ui.mood === m.id ? null : m.id })}>{m.name}</button>
        ))}
      </div>
      <button className="c-link c-pop-close" onClick={onClose}>收起</button>
    </div>
  );
}

/**
 * 仅参考的卡：做不出来的风格，所以不放我们的近似渲染（那会让人以为「就长这样」）。
 * 图是我们自己画的示意插画（public/thumbs/ref，整合 U#23），名字压在图上、角上「仅参考」；示意图没有时退回分类花纹。点了进学习库。
 */
function RefGrid({ cards, onOpen }: { cards: typeof REF_ONLY; onOpen: () => void }) {
  return (
    <div className="c-gal-grid">
      {cards.map((c) => (
        <button key={c.id} className="c-card ref" title={`${c.name}：仅参考（图是示意）\n${c.why}\n最接近：${c.nearest.map((n) => cardName(RECIPE_MAP.get(n)!)).join('、')}`} onClick={onOpen}>
          <RefThumb id={c.id} category={c.category} />
          <span className="c-badges"><span className="c-badge">仅参考</span></span>
          <span className="c-card-name">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

function RefThumb({ id, category }: { id: string; category: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span className={`c-thumb none cat-${category}`} />;
  return <img className="c-thumb" src={refThumbUrl(id)} alt="" loading="lazy" draggable={false} onError={() => setBad(true)} />;
}

/** 右键：只取这个配方的某一维叠到当前实验上 */
function MixMenu({ id, x, y, onClose }: { id: string; x: number; y: number; onClose: () => void }) {
  const r = RECIPE_MAP.get(id);
  if (!r) return null;
  const mix = (d: DimId) => {
    const s = useStore.getState();
    const label = DIMS.find((x2) => x2.id === d)?.label ?? d;
    s.setMany(recipeDimValues(r.values, [d], s.values), `混搭：取「${r.name}」的${label}`);
    onClose();
  };
  return (
    <div className="c-menu" style={{ left: Math.min(x, 150), top: y }} onClick={(e) => e.stopPropagation()}>
      <div className="c-menu-title">只取「{cardName(r)}」的</div>
      <div className="c-menu-grid">
        {MIX_DIMS.map((d) => <button key={d} className="c-chip small" onClick={() => mix(d)}>{DIMS.find((x2) => x2.id === d)?.label ?? d}</button>)}
      </div>
    </div>
  );
}
