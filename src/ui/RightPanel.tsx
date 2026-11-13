import { Activity, useEffect, useMemo, useRef, useState } from 'react';
import { NUDGES } from '../content/nudges';
import { activeState, getParam, paramsOf, str } from '../dims/registry';
import type { ParamDef } from '../dims/types';
import { scenePaletteOf } from '../hud/HudSystem';
import { parseElementKey, parseOverrideKey } from '../hud/sys/register';
import { resolveUi } from '../hud/sys/resolve';
import { buildTheme } from '../hud/sys/theme';
import * as actions from '../state/actions';
import { useStore } from '../state/store';
import { ElementInspector } from './hud/ElementInspector';
import { UiPanel } from './hud/UiPanel';
import { ParamRow } from './ParamRow';
import { openExplain, useExplain } from './stage/explain';
import { changedKeys, layerCounts, layerFullNames, layerNames } from './stage/layerInfo';
import { LayersList } from './stage/LayersList';
import { Pop } from './stage/Pop';
import { ART_GROUPS, commonSet, groupOfDim, groupParams, imageInert, imageInertReason } from './stage/rightGroups';
import { useMode, useShell } from './stage/shell';
import { SLOT } from './stage/slots';

/*
 * 右栏调参台（轨道 B，docs/workbench-redesign.md §7「右栏分组」§3.3）：标题区（选中对象 + ·N + ↺）+ 分组列表。
 *   画面模式：5 组（形体 / 质感 / 色光 / 镜头 / 运动）+ 常用 / 全部 + 搜索；不生效的行收进每组末尾「当前不生效 (N)」；行旁悬停出 ⓘ。
 *     立绘场景（背景是一张插画）里形体 / 几何 / 材质 / 受光细节 / 地貌看不出变化的行也收进去（F 的 IMAGE_SCENE_INERT，整合 X#4；收尾 4 起卡牌战也没有例外——敌人换成了立绘贴图）。
 *   UI 模式：本屏元素列表 + UI 参数面板（轨道 D 负责分组）；选中元素 → 元素检查器。
 * 两种模式的面板都留着（React Activity 隐藏），切模式不丢页签、滚动和展开状态。
 */
export function RightPanel() {
  const mode = useMode();
  return (
    <aside className="right">
      <Activity mode={mode === 'art' ? 'visible' : 'hidden'}><ArtPanel /></Activity>
      <Activity mode={mode === 'ui' ? 'visible' : 'hidden'}><UiSide /></Activity>
    </aside>
  );
}

/* ---------------- 画面模式 ---------------- */

function ArtPanel() {
  const values = useStore((s) => s.values);
  const focus = useStore((s) => s.focus);
  const origin = useStore((s) => s.origin);
  const tier = useShell((s) => s.rightTier);
  const open = useShell((s) => s.openGroups);
  const setShell = useShell((s) => s.set);
  const toggleGroup = useShell((s) => s.toggleGroup);
  const [q, setQ] = useState('');
  const st = { values, origin };
  const changed = useMemo(() => new Set(changedKeys('art', { values, origin })), [values, origin]);
  const names = layerNames(st);
  const n = changed.size;
  const common = commonSet();
  const Reset = SLOT.ResetMenu;

  // 跳到某个参数（左栏 / 提示 / 搜索里点了参数名）：展开它所在的组，滚到那一行
  useEffect(() => {
    const p = focus ? getParam(focus) : undefined;
    if (!p || p.ui) return;
    const g = groupOfDim(p.dim);
    if (g && !useShell.getState().openGroups[g.id]) toggleGroup(g.id, true);
  }, [focus, toggleGroup]);

  const query = q.trim();
  const hits = useMemo(() => {
    if (!query) return [];
    const all = ART_GROUPS.flatMap(groupParams).concat(paramsOf('game'));
    return all.filter((p) => p.label.includes(query) || p.id.includes(query) || p.explain.term?.zh?.includes(query)).slice(0, 60);
  }, [query]);

  return (
    <div className="rp">
      <div className="rp-head">
        <b className="rp-title" title={names.art ? `画面配方：${layerFullNames(st).art || names.art}` : undefined}>画面{names.art ? `·${names.art}` : ''}</b>
        {n > 0 && <span className="lt-count">·{n}</span>}
        <span className="tb-spacer" />
        {n > 0 && <button className="btn ghost small" onClick={() => actions.resetArt()} title={`画面改动全部回到${names.art ? `「${names.art}」` : '默认'}原样（一步撤销）`}>↺{names.art ? `回到${names.art}` : '重置'}</button>}
        {Reset && <Pop label="▾" className="btn ghost small" align="right" title="画面的其他重置">{(close) => <Reset layer="art" onClose={close} />}</Pop>}
      </div>
      <div className="rp-tools">
        <div className="seg tier-seg">
          <button className={tier === 'common' ? 'on' : ''} onClick={() => setShell({ rightTier: 'common' })}>常用</button>
          <button className={tier === 'all' ? 'on' : ''} onClick={() => setShell({ rightTier: 'all' })}>全部</button>
        </div>
        <input className="search rp-search" placeholder="🔍" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索画面参数" />
      </div>
      <RowScroll>
        {query ? (
          <>
            {hits.map((p) => <ParamRow key={p.id} p={p} />)}
            {!hits.length && <p className="hint">没有找到</p>}
          </>
        ) : (
          <>
            <Nudges />
            {ART_GROUPS.map((g) => (
              <ArtGroupBlock key={g.id} id={g.id} label={g.label} params={groupParams(g)} open={!!open[g.id]} tier={tier} changed={changed} common={common} focus={focus} />
            ))}
          </>
        )}
      </RowScroll>
    </div>
  );
}

/** 微调（原来左栏「感觉」页的 16 个一键微调）：收起时只占一行 */
function Nudges() {
  const open = useShell((s) => !!s.openGroups.nudge);
  const toggle = useShell((s) => s.toggleGroup);
  return (
    <div className={`rp-group ${open ? 'open' : ''}`} data-group="nudge">
      <button className="rp-group-head" onClick={() => toggle('nudge')}>
        <span className="caret">{open ? '▾' : '▸'}</span>微调
      </button>
      {open && <div className="chips rp-nudges">{NUDGES.map((x) => <button key={x.id} className="chip link" title={x.hint} onClick={() => actions.applyNudge(x)}>{x.label}</button>)}</div>}
    </div>
  );
}

function ArtGroupBlock({ id, label, params, open, tier, changed, common, focus }: { id: string; label: string; params: ParamDef[]; open: boolean; tier: 'common' | 'all'; changed: Set<string>; common: Set<string>; focus: string | null }) {
  const values = useStore((s) => s.values);
  const toggle = useShell((s) => s.toggleGroup);
  const mine = params.filter((p) => changed.has(p.id));
  const shown = tier === 'all' ? params : params.filter((p) => common.has(p.id) || changed.has(p.id) || p.id === focus);
  const live: ParamDef[] = [], off: ParamDef[] = [];
  // 不生效 = 参数自己的生效条件不满足，或者立绘场景里看不出变化（imageInert）；改过的、正在跳到的行照旧放在上面
  for (const p of shown) ((activeState(p, values) === true && !imageInert(p.id, values)) || changed.has(p.id) || p.id === focus ? live : off).push(p);
  const offWhy = imageInertReason(off.map((p) => p.id), values);
  const hidden = params.length - shown.length;
  // 「全部」时按维度分小节
  let lastDim = '';
  // data-group：配方卡看点悬停时这一行没显示，轨道 C 的 galleryActions 按它找到组标题来闪
  return (
    <div className={`rp-group ${open ? 'open' : ''}`} data-group={id}>
      <div className="rp-group-row">
        <button className="rp-group-head" onClick={() => toggle(id)} aria-expanded={open}>
          <span className="caret">{open ? '▾' : '▸'}</span>{label}
          {mine.length > 0 && <span className="lt-count">·{mine.length}</span>}
        </button>
        {mine.length > 0 && <button className="btn ghost small" onClick={() => actions.resetKeys(mine.map((p) => p.id), `重置${label}`)} title={`这一组的 ${mine.length} 项改动回到基线`}>↺</button>}
      </div>
      {open && (
        <div className="rp-group-body">
          {live.map((p) => {
            const head = tier === 'all' && p.dim !== lastDim ? (lastDim = p.dim, <div key={`d-${p.dim}`} className="rp-dim">{DIM_LABEL[p.dim]}</div>) : null;
            return [head, <ParamRow key={p.id} p={p} />];
          })}
          {off.length > 0 && (
            <details className="rp-off">
              <summary title={offWhy ?? undefined}>当前不生效（{off.length}）</summary>
              {offWhy && <p className="hint rp-off-why">{offWhy}</p>}
              {off.map((p) => <ParamRow key={p.id} p={p} />)}
            </details>
          )}
          {tier === 'common' && hidden > 0 && <button className="btn ghost small rp-more" onClick={() => useShell.getState().set({ rightTier: 'all' })}>更多（{hidden}）</button>}
        </div>
      )}
    </div>
  );
}

const DIM_LABEL: Record<string, string> = { world: '地貌', geometry: '几何', shape: '形状', material: '材质', shading: '明暗', lines: '线条', surface: '画面媒介', color: '色彩', lighting: '灯光', camera: '镜头', atmosphere: '环境', motion: '运动', game: '游戏条件' };

/** 参数列表的滚动区：悬停哪一行，就在行右上角出一个 ⓘ（说明弹窗） */
function RowScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ id: string; top: number } | null>(null);
  const openId = useExplain((s) => s.id);
  const onOver = (e: React.MouseEvent) => {
    const row = (e.target as HTMLElement).closest?.('.row[id^="param-"]') as HTMLElement | null;
    const box = ref.current;
    if (!row || !box) return;
    const id = row.id.slice(6);
    const p = getParam(id);
    if (!p || p.ui) return;
    const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (hover?.id !== id || hover.top !== top) setHover({ id, top });
  };
  return (
    <div className="scroll rp-scroll" ref={ref} onMouseOver={onOver} onMouseLeave={() => setHover(null)}>
      <div className="rp-rows">
        {children}
        {hover && (
          <button className={`row-info ${openId === hover.id ? 'on' : ''}`} style={{ top: hover.top + 4 }} onClick={(e) => openExplain(hover.id, e.currentTarget)} title="这一项是什么、怎么用" aria-label="说明">ⓘ</button>
        )}
      </div>
    </div>
  );
}

/* ---------------- UI 模式 ---------------- */

/** UiSide 处理过的参数跳转（store.uiJump.t）：面板藏起又露出来时不重跳 */
let sideJumpT = 0;
/** 跳转键指向的元素（el.<元素>.<后缀>、<参数>@el.<元素>）；不是元素键时 undefined */
const jumpElement = (id: string): string | undefined => {
  const t = parseElementKey(id)?.element ?? parseOverrideKey(id)?.target;
  return t?.startsWith('el.') ? t : undefined;
};

/**
 * 参数跳转（知识面板「参数@元素」芯片、状态槽改动列表、⌘K：store.jumpUiParam）在 UI 模式右栏的处理（审查修复 1）。
 * 选中元素时 UiPanel 藏在 <Activity hidden> 里，React 会拆掉它的 effect：它自己的跳转处理会被打断、取消选中后又重跳一次（选中了就回不去列表）。所以：
 *   - 跳到元素键：这里选中元素、滚到检查器里那一行并闪一下，再把 uiJump 清掉（UiPanel 露出来时不会再处理这一次）；
 *   - 跳到别的 UI 键而现在选着元素：先取消选中，UiPanel 露出来后由它自己的 effect 接手（切页签、展开、滚动、闪）。
 */
function useSideJump(box: React.RefObject<HTMLDivElement | null>, setJumpKey: (j: { key: string; el: string } | null) => void) {
  useEffect(() => {
    const run = (j: { id: string; t: number } | null) => {
      if (!j || j.t <= sideJumpT) return;
      const st = useStore.getState();
      const el = jumpElement(j.id);
      if (el) {
        sideJumpT = j.t;
        setJumpKey({ key: j.id, el });
        if (st.hudSel !== el) st.setHudSel(el);
        queueMicrotask(() => { if (useStore.getState().uiJump?.t === j.t) useStore.setState({ uiJump: null }); });
        flashRow(box, j.id);
      } else if (st.hudSel) {
        sideJumpT = j.t;
        st.setHudSel(null);
      }
    };
    run(useStore.getState().uiJump);
    return useStore.subscribe((s, p) => { if (s.uiJump !== p.uiJump) run(s.uiJump); });
  }, [box, setJumpKey]);
}

/** 等检查器画出来，滚到那一行（在「更多」里的先展开）并闪一下；找不到这一行时滚到检查器顶上 */
function flashRow(box: React.RefObject<HTMLDivElement | null>, id: string, tries = 0) {
  window.setTimeout(() => {
    const root = box.current;
    if (!root) return;
    const row = root.querySelector<HTMLElement>(`[id="param-${CSS.escape(id)}"]`);
    if (!row) {
      if (tries < 3) return flashRow(box, id, tries + 1);
      root.querySelector('.ui-el')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    const d = row.closest('details');
    if (d && !d.open) d.open = true;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('kn-flash');
    void row.offsetWidth;
    row.classList.add('kn-flash');
    window.setTimeout(() => row.classList.remove('kn-flash'), 1600);
  }, 80);
}

function UiSide() {
  const values = useStore((s) => s.values);
  const sel = useStore((s) => s.hudSel);
  const origin = useStore((s) => s.origin);
  const box = useRef<HTMLDivElement>(null);
  const [jump, setJump] = useState<{ key: string; el: string } | null>(null);
  useSideJump(box, setJump);
  // 跳转标出来的那一行只管这一次：选中从这个元素换走（含取消选中）就清掉，之后再选中它不再标着旧的那一行
  const prevSel = useRef(sel);
  useEffect(() => {
    if (prevSel.current === sel) return;
    if (jump && prevSel.current === jump.el) setJump(null);
    prevSel.current = sel;
  }, [sel, jump]);
  const r = useMemo(() => resolveUi(values), [values]);
  const th = useMemo(() => buildTheme(r, scenePaletteOf(values), str(values, 'hud.style')), [r, values]);
  const st = { values, origin };
  const n = layerCounts(st).ui;
  const names = layerNames(st);
  const Reset = SLOT.ResetMenu;
  return (
    <div className="rp">
      <div className="rp-head">
        <b className="rp-title" title={`UI 皮肤：${layerFullNames(st).ui || names.ui}`}>UI·{names.ui}</b>
        {n > 0 && <span className="lt-count">·{n}</span>}
        <span className="tb-spacer" />
        {Reset && <Pop label="↺▾" className="btn ghost small" align="right" title="UI 的重置">{(close) => <Reset layer="ui" onClose={close} />}</Pop>}
      </div>
      <div className="scroll rp-scroll" ref={box}>
        {sel ? <ElementInspector r={r} pal={th.pal} th={th} jumpKey={jump && jump.el === sel ? jump.key : null} /> : <LayersList r={r} />}
        <Activity mode={sel ? 'hidden' : 'visible'}><UiPanel /></Activity>
      </div>
    </div>
  );
}
