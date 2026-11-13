import { del, set as idbSet } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { DIMS, getParam, withoutViewKeys } from '../dims/registry';
import type { DimId, Val } from '../dims/types';
import { applyWrites } from '../state/actions';
import { countLayers, layerTitle } from '../state/layers';
import { useStore } from '../state/store';
import { getEngine } from './engineRef';
import './state/explore.css';
// 纯函数与数据（扫描取值、随机、收藏类型与读取、混搭）放在 exploreData.ts（T0）：本文件只导出组件，Fast Refresh 才能热替换
import { DISLIKE_TAGS, FAV_PREFIX, LIKE_TAGS, listFavorites, RANDOM_DIMS, randomize, sweepValues, type Favorite } from './exploreData';
import { randomizeUi, uiRandomCandidates, UI_RANDOM_DEFAULT, UI_RANDOM_PARTS, type UiRandomPart } from './hud/uiRandom';

/*
 * 探索工具：单维扫描、受约束随机、收藏与方向板。
 * 扫描与随机都只在确认后才写入实验（可撤销）；收藏保存在本机 IndexedDB。
 * 用到的纯函数与数据在 exploreData.ts。
 * 轨道 A（docs/workbench-redesign.md §2 F1、§4.3）：收藏连同来源（origin）一起存，恢复时精确替换（快照里没有的动态键丢掉），
 * 三个标签的改动数和收藏时一样；名字默认「水彩 · 改 3 项」；方向板是缩略图网格，带「保留 / 下次试」备注。
 */

/* ---------------- 单维扫描（取值见 exploreData.ts 的 sweepValues） ---------------- */
export function SweepDialog() {
  const sweepId = useStore((s) => s.sweepId);
  const setSweep = useStore((s) => s.setSweep);
  const setVal = useStore((s) => s.set);
  const [cells, setCells] = useState<{ v: Val; label: string; url: string }[]>([]);
  const p = sweepId ? getParam(sweepId) : undefined;
  useEffect(() => {
    if (!p) return;
    const eng = getEngine();
    if (!eng) return;
    const base = useStore.getState().values;
    const out: { v: Val; label: string; url: string }[] = [];
    for (const v of sweepValues(p, base)) {
      eng.apply({ ...base, [p.id]: v });
      const label = p.kind === 'choice' ? p.options?.find((o) => o.value === v)?.label ?? String(v) : p.kind === 'toggle' ? (v ? '开' : '关') : `${v}${p.unit ?? ''}`;
      out.push({ v, label, url: eng.renderSync(2) });
    }
    eng.apply(base);
    setCells(out);
  }, [p]);
  if (!p) return null;
  return (
    <div className="dialog-mask" onClick={() => setSweep(null)}>
      <div className="dialog" style={{ width: 'min(1280px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>单维扫描：{p.label}</h3>
          <span className="term">其他条件全部固定，只改这一项。点一格就采用它。</span>
          <button className="btn ghost" onClick={() => setSweep(null)}>关闭</button>
        </div>
        <div className="dialog-body sweep-grid">
          {cells.length === 0 && <p className="hint">渲染中…</p>}
          {cells.map((c) => (
            <figure key={String(c.v)} onClick={() => { setVal(p.id, c.v); setSweep(null); }}>
              <img src={c.url} alt={c.label} />
              <figcaption>{c.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 受约束随机（RANDOM_DIMS / randomize 见 exploreData.ts） ---------------- */
/**
 * 随机面板的锁按模式（画面 / UI）分开记在模块里：面板每次打开都是新挂载，不记的话锁会回到默认。
 * 画面模式默认：锁住世界、镜头、几何，游戏 UI 锁住；UI 模式默认：画面维度全部锁住，只随机游戏 UI（起点 + 风格细节）——
 * 在 UI 模式下点"随机一次"应该换 UI，而不是换画面。
 */
interface RandomMem { locked: Set<DimId>; uiLocked: boolean; uiParts: Set<UiRandomPart>; amount: number }
const randomMem: Partial<Record<'art' | 'ui', RandomMem>> = {};
const randomDefaults = (ui: boolean): RandomMem => ({
  locked: new Set<DimId>(ui ? RANDOM_DIMS : ['world', 'camera', 'geometry']),
  uiLocked: !ui,
  uiParts: new Set(UI_RANDOM_DEFAULT),
  amount: 0.35,
});

export function RandomPanel({ onClose }: { onClose: () => void }) {
  const mode = useStore((s) => (s.activeDim === 'hud' ? 'ui' : 'art'));
  const [init] = useState(() => randomMem[mode] ?? randomDefaults(mode === 'ui'));
  const [locked, setLockedRaw] = useState<Set<DimId>>(init.locked);
  const [amount, setAmountRaw] = useState(init.amount);
  // 游戏 UI：画面模式默认锁住、UI 模式默认解锁（G5：UI 随机见 hud/uiRandom.ts，跳过商业化界面与运营参数）；解锁后再选随机 UI 的哪几块
  const [uiLocked, setUiLockedRaw] = useState(init.uiLocked);
  const [uiParts, setUiPartsRaw] = useState<Set<UiRandomPart>>(init.uiParts);
  const remember = (p: Partial<RandomMem>) => { randomMem[mode] = { locked, uiLocked, uiParts, amount, ...p }; };
  const setLocked = (x: Set<DimId>) => { setLockedRaw(x); remember({ locked: x }); };
  const setAmount = (x: number) => { setAmountRaw(x); remember({ amount: x }); };
  const setUiLocked = (x: boolean) => { setUiLockedRaw(x); remember({ uiLocked: x }); };
  const setUiParts = (x: Set<UiRandomPart>) => { setUiPartsRaw(x); remember({ uiParts: x }); };
  const uiOn = !uiLocked && uiParts.size > 0;
  // 一步撤销；随机到的皮肤 / 风格词 / 界面走套用（记进来源、清皮肤负责的手动样式），其余是普通改动（整合修复 X#6）
  const roll = () => {
    const seed = Math.floor(Math.random() * 1e9);
    const v = useStore.getState().values;
    const artLocked = RANDOM_DIMS.every((d) => locked.has(d)) ? ['全部画面维度'] : [...locked].map((d) => DIMS.find((x) => x.id === d)?.label);
    const lockedNames = [...artLocked, ...(uiOn ? [] : ['游戏 UI'])];
    const uiNames = uiOn ? `；UI：${UI_RANDOM_PARTS.filter((x) => uiParts.has(x.id)).map((x) => x.label).join('、')}` : '';
    applyWrites({ ...randomize(v, locked, seed, amount), ...(uiOn ? randomizeUi(v, seed, amount, uiParts) : {}) }, `随机探索 #${seed}（锁定：${lockedNames.join('、') || '无'}${uiNames}）`);
  };
  const toggleUiPart = (id: UiRandomPart) => { const n = new Set(uiParts); if (n.has(id)) n.delete(id); else n.add(id); setUiParts(n); };
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(620px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>受约束的随机探索</h3>
          <button className="btn primary" onClick={roll}>随机一次</button>
          <button className="btn ghost" onClick={onClose}>关闭</button>
        </div>
        <div className="dialog-body">
          <p className="hint" style={{ margin: '0 0 8px' }}>
            锁住不想变的维度，只在其余维度里随机。每次随机都可以撤销，标签里记录了种子。
            {mode === 'ui' ? '现在是 UI 模式：默认锁住全部画面维度，只随机游戏 UI。' : ''}
          </p>
          <div className="chips">
            {RANDOM_DIMS.map((d) => {
              const on = locked.has(d);
              return (
                <span key={d} className={`chip link ${on ? 'blue' : ''}`} onClick={() => { const n = new Set(locked); if (on) n.delete(d); else n.add(d); setLocked(n); }}>
                  {on ? '🔒' : '🎲'} {DIMS.find((x) => x.id === d)?.label}
                </span>
              );
            })}
            <span className={`chip link ${uiLocked ? 'blue' : ''}`} onClick={() => setUiLocked(!uiLocked)} title="游戏 UI 的参数与起点（不含商业化界面与运营参数）">
              {uiLocked ? '🔒' : '🎲'} 游戏 UI
            </span>
          </div>
          {!uiLocked && (
            <>
              <p className="hint" style={{ margin: '10px 0 0' }}>游戏 UI 随机哪几块（在 {uiRandomCandidates(uiParts).length} 个参数里抽）：</p>
              <div className="chips">
                {UI_RANDOM_PARTS.map((x) => {
                  const on = uiParts.has(x.id);
                  return (
                    <span key={x.id} className={`chip link ${on ? '' : 'blue'}`} title={x.desc} onClick={() => toggleUiPart(x.id)}>
                      {on ? '🎲' : '🔒'} {x.label}
                    </span>
                  );
                })}
              </div>
              <p className="hint" style={{ margin: '4px 0 0' }}>
                {uiParts.size ? '不会抽到：商城、抽卡、签到等商业化界面，运营参数，商业模式与节日活动，无障碍与工具参数。' : '每一块都锁住了：这次不随机 UI。'}
              </p>
            </>
          )}
          <label className="hint" style={{ display: 'block', margin: '12px 0 0' }}>变化幅度（每个参数被改动的概率）：{Math.round(amount * 100)}%</label>
          <input type="range" min={0.05} max={1} step={0.05} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- 收藏与方向板（LIKE_TAGS / Favorite / listFavorites 见 exploreData.ts） ---------------- */
/**
 * 收藏的默认名：写出改了的是哪一层（审查修复 24）——
 *   只改了画面 / 什么都没改：「水彩 · 改 3 项」「水彩 · 原样」；
 *   UI 或场景也有改动 / 选了皮肤：「水彩 + 毛玻璃 · 改 3 项」（再带上场景名，最多三段）。
 */
function autoName(): string {
  const s = useStore.getState();
  const c = countLayers(s.values, s.origin);
  const parts = [layerTitle('art', s.values, s.origin)];
  if (c.ui || s.origin.skin || s.origin.uiWords.length) parts.push(layerTitle('ui', s.values, s.origin));
  if (c.scene || s.origin.scene) parts.push(layerTitle('scene', s.values, s.origin));
  return `${parts.filter(Boolean).join(' + ')} · ${c.total ? `改 ${c.total} 项` : '原样'}`;
}

/** 把当前状态存成一条收藏（缩略图 + 自动名字）；返回存下的那条，存不了时 null */
async function saveFavorite(extra?: Partial<Favorite>): Promise<Favorite | null> {
  const s = useStore.getState();
  let image: string | undefined;
  try { image = getEngine()?.renderSync(1); } catch { image = undefined; }
  const fav: Favorite = { id: `${Date.now()}`, ts: Date.now(), name: autoName(), values: withoutViewKeys(s.values), image, likes: [], dislikes: [], keep: '', tryNext: '', origin: s.origin, ...extra };
  try {
    await idbSet(FAV_PREFIX + fav.id, fav);
    return fav;
  } catch {
    return null;
  }
}

/**
 * ☆ 一下就收藏（§2 F1.4，审查修复 24）：马上存（缩略图 + 自动名字），右上角浮一张小卡「已收藏 · 加备注」，4 秒后自己消失；
 * 点「加备注」才打开完整的收藏表单（喜欢哪里 / 保留 / 下次试），改的是刚存的那一条。小卡不压画框（在右栏上方）。
 */
export function QuickFavorite({ onClose }: { onClose: () => void }) {
  const [fav, setFav] = useState<Favorite | null | undefined>(undefined);
  const [edit, setEdit] = useState(false);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    let live = true;
    saveFavorite().then((f) => { if (live) setFav(f); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (fav === undefined || edit || hold) return;
    const t = setTimeout(onClose, fav ? 4000 : 6000);
    return () => clearTimeout(t);
  }, [fav, edit, hold, onClose]);
  if (edit && fav) return <FavoriteDialog onClose={onClose} existing={fav} />;
  return (
    <div className="fav-toast" role="status" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      {fav === undefined ? <span>收藏中…</span>
        : fav ? (
          <>
            {fav.image && <img src={fav.image} alt="" />}
            <span className="fav-toast-text" title={fav.name}>已收藏 · {fav.name}</span>
            <button className="btn small" onClick={() => setEdit(true)} title="喜欢哪里、想保留什么、下次试什么">加备注</button>
          </>
        ) : <span>浏览器不让存（隐私模式？）。可以用「导出 → 参数 JSON」</span>}
      <button className="btn small ghost" onClick={onClose} aria-label="关闭">×</button>
    </div>
  );
}

/** 收藏表单（加备注）：existing = 改已经存下的那一条（同一个 id 覆盖）；不给 = 新存一条 */
export function FavoriteDialog({ onClose, existing }: { onClose: () => void; existing?: Favorite }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const [img, setImg] = useState<string | undefined>(existing?.image);
  const [name, setName] = useState(() => existing?.name ?? autoName());
  const [likes, setLikes] = useState<string[]>(existing?.likes ?? []);
  const [dislikes, setDislikes] = useState<string[]>(existing?.dislikes ?? []);
  const [keep, setKeep] = useState(existing?.keep ?? '');
  const [tryNext, setTryNext] = useState(existing?.tryNext ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (existing) return;
    const eng = getEngine();
    if (eng) setImg(eng.renderSync(1));
  }, [existing]);
  const toggle = (arr: string[], set: (x: string[]) => void, t: string) => set(arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]);
  const save = async () => {
    const fav: Favorite = existing
      ? { ...existing, name: name.trim() || existing.name, likes, dislikes, keep, tryNext }
      : { id: `${Date.now()}`, ts: Date.now(), name: name.trim() || autoName(), values: withoutViewKeys(values), image: img, likes, dislikes, keep, tryNext, origin };
    try {
      await idbSet(FAV_PREFIX + fav.id, fav);
      setSaved(true);
      setTimeout(onClose, 600);
    } catch {
      alert('浏览器不允许本地存储（隐私模式？），请改用"导出 → 可复现配方 JSON"保存。');
    }
  };
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(760px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>{existing ? '收藏的备注' : '收藏这次实验'}</h3>
          <button className="btn primary" onClick={save} disabled={saved}>{saved ? '已保存' : '保存'}</button>
          <button className="btn ghost" onClick={onClose}>{existing ? '不改' : '取消'}</button>
        </div>
        <div className="dialog-body fav-form">
          {img && <img src={img} alt="" />}
          <div>
            <input className="search" placeholder="起个名字" value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
            <p className="hint" style={{ margin: '8px 0 2px' }}>喜欢哪里？</p>
            <div className="chips">{LIKE_TAGS.map((t) => <span key={t} className={`chip link ${likes.includes(t) ? 'ok' : ''}`} onClick={() => toggle(likes, setLikes, t)}>{t}</span>)}</div>
            <p className="hint" style={{ margin: '8px 0 2px' }}>不喜欢哪里？</p>
            <div className="chips">{DISLIKE_TAGS.map((t) => <span key={t} className={`chip link ${dislikes.includes(t) ? 'warn' : ''}`} onClick={() => toggle(dislikes, setDislikes, t)}>{t}</span>)}</div>
            <textarea style={{ minHeight: 60, marginTop: 8 }} placeholder="想保留的因素（例如：阴影色、圆润树冠）" value={keep} onChange={(e) => setKeep(e.target.value)} />
            <textarea style={{ minHeight: 60, marginTop: 6 }} placeholder="下次只想改变的因素（例如：只换线条）" value={tryNext} onChange={(e) => setTryNext(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DirectionBoard({ onClose }: { onClose: () => void }) {
  const [favs, setFavs] = useState<Favorite[] | null>(null);
  const restore = useStore((s) => s.restore);
  useEffect(() => { listFavorites().then(setFavs); }, []);
  const tally = (key: 'likes' | 'dislikes') => {
    const m = new Map<string, number>();
    for (const f of favs ?? []) for (const t of f[key]) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const exportAll = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(favs, null, 2)], { type: 'application/json' }));
    a.download = 'direction-board.json';
    a.click();
  };
  // 恢复：精确替换（收藏里没有的动态键丢掉），来源一起回来；一步撤销
  const open = (f: Favorite) => { restore(f, `恢复收藏：${f.name}`, 'all'); onClose(); };
  const likes = tally('likes'), dislikes = tally('dislikes');
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(1200px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>方向板（{favs?.length ?? 0}）</h3>
          <button className="btn" onClick={exportAll} disabled={!favs?.length}>导出全部</button>
          <button className="btn ghost" onClick={onClose}>关闭</button>
        </div>
        <div className="dialog-body">
          {(likes.length > 0 || dislikes.length > 0) && (
            <div className="chips" style={{ marginBottom: 10 }}>
              {likes.map(([t, n]) => <span key={t} className="chip ok">♥ {t} ×{n}</span>)}
              {dislikes.map(([t, n]) => <span key={t} className="chip warn">✕ {t} ×{n}</span>)}
            </div>
          )}
          <div className="fav-board">
            {favs?.map((f) => (
              <figure key={f.id} className="fav-tile">
                <button className="fav-thumb" onClick={() => open(f)} title="恢复这一条（可撤销）">
                  {f.image ? <img src={f.image} alt={f.name} /> : <span className="fav-noimg">无图</span>}
                </button>
                <figcaption>
                  <b title={f.name}>{f.name}</b>
                  {f.keep && <span className="fav-note" title={f.keep}>保留：{f.keep}</span>}
                  {f.tryNext && <span className="fav-note" title={f.tryNext}>下次试：{f.tryNext}</span>}
                  {(f.likes.length > 0 || f.dislikes.length > 0) && (
                    <span className="fav-tags" title={[...f.likes.map((t) => `喜欢${t}`), ...f.dislikes.map((t) => `不喜欢${t}`)].join('、')}>
                      {f.likes.map((t) => <i key={t} className="ok">{t}</i>)}{f.dislikes.map((t) => <i key={t} className="warn">{t}</i>)}
                    </span>
                  )}
                </figcaption>
                <button className="fav-del" title="删除这条收藏" aria-label="删除" onClick={async () => { await del(FAV_PREFIX + f.id); setFavs((favs ?? []).filter((x) => x.id !== f.id)); }}>×</button>
              </figure>
            ))}
          </div>
          {favs?.length === 0 && <p className="hint">还没有收藏。点 ☆ 收藏当前画面。</p>}
        </div>
      </div>
    </div>
  );
}

/* 混搭（recipeDimValues）与 liveCount 见 exploreData.ts */
