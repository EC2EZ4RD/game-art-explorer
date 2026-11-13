import { useEffect, useMemo, useState } from 'react';
import { isImageScene } from '../../content/sceneCatalog';
import { getParam, str } from '../../dims/registry';
import { frameUnitK } from '../../hud/sys/device';
import { uiKeyLabel } from '../../hud/sys/register';
import { resolveUi } from '../../hud/sys/resolve';
import * as actions from '../../state/actions';
import { useStore } from '../../state/store';
import { ReadabilityBadge } from '../hud/Readability';
import { getEngine } from '../engineRef';
import { layerNames } from './layerInfo';
import { MenuHead, MenuItem, MenuSep, Pop } from './Pop';
import { hudHidden, useMode, useShell, type Zoom } from './shell';
import { useShownValues } from './shownValues';
import { SLOT } from './slots';

/*
 * 舞台栏条（轨道 B，§3.3）：左 👁UI / ✎ · ⏸ · 视图▾ · 可读（UI 模式）；中 状态槽（≤14 字 + 撤销，4 秒）+ 对比的 A 徽标；右 预览 N% · 缩放▾ · ⛶。
 * 原来顶部居中压在 HUD 上的提示 toast 改到这里，永不压画框；点一下列出这次改了哪些参数。
 * 视图▾ = 诊断 + 色盲 + 视距 + UI 检查工具（对比度、颜色冗余、最小字号、触控、安全区、文字溢出、特效遮挡；§7 §10「工具组移进视图▾」，审查修复 14）。
 * 「缩略·按F看清」只在 UI 模式（或画面模式开着 👁UI）时用提醒色：只看画风时 HUD 小不要紧（审查修复 26）。
 * 「预览 N%」= 画框上 HUD 真实的 unitK ÷ 2（sys/device.ts 的 frameUnitK，与 HudSystem 同一条路：电影黑边、设备黑边、UI 1:1、竖屏都算进去，轨道 B2）。
 *   按引擎实际拿到的参数算：values ⊕ 知识面板的预览（useShownValues；B2 审查修复 ③：预览改了画幅 / 横竖屏时原来徽标和画框都按 values 算，和 HUD 对不上）。
 * A 徽标放在右组、预览 N% 左边（B2 审查修复 ⑳：原来和状态槽挤在居中的中段，状态 4 秒后消失时 A 徽标往左跳约 80px，× 从指针下面跑开）。
 * ✎ 写成「✎ 编辑」（§3.2；B2 审查修复 ㉔：光一个 ✎ 看不出它管的是「画框上能不能点选 UI」）。
 * 整合修复（IB）：
 *   X#11 视图▾ 加「品质下限」开关（E 的 paint.ts QUALITY.on：字号 / 描边 / 不透明度下限、自动描边、矢量图标；关掉 = 看改进前的样子），记在外壳状态里、刷新不丢；
 *   U#15 立绘场景（背景是一张插画）里换了配方：状态槽多一枚「立绘只吃色板、质感、描边和后处理」（收尾 4：F 的插画调色接上后改的字），免得以为点配方没反应；
 *   X#15 useShownValues 挪到 shownValues.ts（组件文件不导出 hook）。
 */

const DIAGS: [string, string][] = [['none', '正常'], ['gray', '灰度'], ['value', '三级明度'], ['silhouette', '剪影'], ['squint', '眯眼']];
const CVD: [string, string][] = [['off', '关'], ['protan', '红色弱'], ['deutan', '绿色弱'], ['tritan', '蓝黄色弱'], ['achroma', '全色盲']];
const VD: [string, string][] = [['off', '关'], ['phone', '手机'], ['pc', '显示器'], ['tv', '电视']];
const ZOOMS: [Zoom, string][] = [['fit', '适应'], ['half', '50%'], ['full', '100%']];
/** UI 检查工具里的开关（chk.*，视图键：不进配方、不进撤销） */
const CHECKS: [string, string, string][] = [
  ['chk.contrast', '对比度', '文字与底色的对比度不够时标出来'], ['chk.redundancy', '颜色冗余', '只靠颜色区分的信息标出来（色盲看不出）'],
  ['chk.touch', '触控尺寸', '按钮小于手指能点准的尺寸时标出来'], ['chk.safeArea', '安全区', '画出安全区，压到外面的元素标出来'],
  ['chk.fxOcclusion', '特效遮挡', '特效盖住关键信息时标出来'],
];
const OVERFLOW: [string, string][] = [['off', '关'], ['plus30', '+30%'], ['plus50', '+50%']];
const MIN_TEXT: [number | null, string][] = [[null, '按设备'], [20, '20'], [22, '22'], [26, '26'], [28, '28']];
/** 屏占比门槛（chk.coverage，0–100%，E 统一了口径）：没写 = 默认 30% */
const COVERAGE: [number | null, string][] = [[null, '默认'], [20, '20%'], [40, '40%'], [60, '60%']];

export function StageBar({ frameW, frameH }: { frameW: number; frameH: number; portrait?: boolean }) {
  const mode = useMode();
  const hudInArt = useShell((s) => s.hudInArt);
  const editOn = useShell((s) => s.editOn);
  const zoom = useShell((s) => s.zoom);
  const focus = useShell((s) => s.focus);
  const set = useShell((s) => s.set);
  const frozen = useStore((s) => s.frozen);
  const values = useShownValues();
  const px1 = useStore((s) => s.hudPixel1to1);
  const unitK = useMemo(() => {
    const lbs = str(values, 'camera.letterbox');
    const lb = !lbs || lbs === 'none' ? 0 : Number(lbs) || 0;
    return frameUnitK(resolveUi(values), frameW, frameH, lb, px1);
  }, [values, frameW, frameH, px1]);
  const pct = Math.round((unitK / 2) * 100);
  const warnSmall = pct < 50 && (mode === 'ui' || hudInArt);
  return (
    <div className="stage-bar">
      <div className="sb-left">
        {mode === 'art'
          ? <button className={`btn ghost small ${hudInArt ? 'on' : ''}`} onClick={() => set({ hudInArt: !hudInArt })} title="画面模式下显示 / 隐藏游戏 UI（UI 模式总是显示）">👁UI</button>
          : <button className={`btn ghost small ${editOn ? 'on' : ''}`} aria-pressed={editOn} onClick={() => set({ editOn: !editOn })} title={editOn ? '编辑开着：在画框上直接点选、拖动、缩放 UI 元素。点一下关掉，鼠标全部交给镜头' : '编辑关着：鼠标全部交给镜头。点一下打开，在画框上直接点选、拖动 UI 元素'}>✎ 编辑</button>}
        <button className={`btn ghost small ${frozen ? 'on' : ''}`} onClick={() => useStore.getState().setFrozen(!frozen)} title="冻结时间：比较时排除动画干扰">⏸</button>
        <ViewMenu />
        {mode === 'ui' && <ReadabilityBadge />}
      </div>
      <div className="sb-mid">
        <RestoredSlot />
        <PreviewSlot />
        <StatusSlot />
      </div>
      <div className="sb-right">
        <ABadge />
        <span className={`zoom-badge ${pct < 50 ? 'small' : ''} ${warnSmall ? 'warn' : ''}`} title={`画框 ${frameW}×${frameH}，HUD 按 1080p 的 ${pct}% 显示（unitK ${unitK.toFixed(2)}）${pct < 50 ? '；按 F 专注看清' : ''}`}>{pct < 50 ? '缩略·按F看清' : `预览${pct}%`}</span>
        <Pop label={`${ZOOMS.find((z) => z[0] === zoom)?.[1]}▾`} className="btn ghost small" align="right" title="缩放：适应 / 50%（960×540）/ 100%（1920×1080，按住空格拖动平移）">
          {(close) => ZOOMS.map(([z, l]) => <MenuItem key={z} on={zoom === z} onClick={() => { set({ zoom: z, pan: { x: 0, y: 0 } }); close(); }}>{l}</MenuItem>)}
        </Pop>
        <button className={`btn ghost small ${focus ? 'on' : ''}`} onClick={() => set({ focus: !focus })} title="专注：收起两侧栏和画框下方（F）">⛶</button>
      </div>
    </div>
  );
}

function ViewMenu() {
  const diag = useStore((s) => s.diag);
  const hudInDiag = useStore((s) => s.hudInDiag);
  // 视图键没写过时存的是 'auto'（= 关）：按「关」算，不然视图▾ 一直亮着、「关」也不亮
  const offIfAuto = (v: unknown) => { const x = String(v ?? 'off'); return x === 'auto' ? 'off' : x; };
  const cvd = useStore((s) => offIfAuto(s.values['chk.cvd']));
  const vd = useStore((s) => offIfAuto(s.values['chk.viewDistance']));
  const px = useStore((s) => s.hudPixel1to1);
  const dev = useShell((s) => s.dev);
  const floors = useShell((s) => s.qualityFloor);
  const setShell = useShell((s) => s.set);
  const values = useStore((s) => s.values);
  const st = useStore.getState();
  const on = (k: string) => { const v = values[k] ?? getParam(k)?.default; return v === true || v === 'true'; };
  const overflow = offIfAuto(values['chk.overflow']);
  const minText = typeof values['chk.minText'] === 'number' && values['chk.minText'] !== getParam('chk.minText')?.default ? values['chk.minText'] as number : null;
  const cover = typeof values['chk.coverage'] === 'number' && (values['chk.coverage'] as number) > 0 ? values['chk.coverage'] as number : null;
  const checksChanged = CHECKS.some(([k]) => on(k) !== (getParam(k)?.default === true)) || overflow !== 'off';
  const changed = diag !== 'none' || hudInDiag || cvd !== 'off' || vd !== 'off' || px || checksChanged || cover !== null || !floors;
  return (
    <Pop label={`视图${diag !== 'none' ? '·' + (DIAGS.find((d) => d[0] === diag)?.[1] ?? '') : ''}▾`} className={`btn ghost small ${changed ? 'on' : ''}`} title="诊断视图：只用于观察，不进配方">
      {(close) => (
        <div className="view-menu">
          <MenuHead>诊断</MenuHead>
          <div className="seg menu-seg">{DIAGS.map(([v, l]) => <button key={v} className={diag === v ? 'on' : ''} onClick={() => st.setDiag(v as typeof diag)}>{l}</button>)}</div>
          <MenuItem on={hudInDiag} disabled={diag === 'none'} onClick={() => st.setHudInDiag(!hudInDiag)} hint={hudInDiag ? '开' : '关'}>诊断含 UI</MenuItem>
          <MenuHead>色盲模拟</MenuHead>
          <div className="seg menu-seg">{CVD.map(([v, l]) => <button key={v} className={cvd === v ? 'on' : ''} onClick={() => st.set('chk.cvd', v)}>{l}</button>)}</div>
          <MenuHead>视距</MenuHead>
          <div className="seg menu-seg">{VD.map(([v, l]) => <button key={v} className={vd === v ? 'on' : ''} onClick={() => st.set('chk.viewDistance', v)}>{l}</button>)}</div>
          <MenuHead>UI 检查</MenuHead>
          {CHECKS.map(([k, l, tip]) => <MenuItem key={k} on={on(k)} onClick={() => st.set(k, !on(k))} hint={on(k) ? '开' : '关'} title={tip}>{l}</MenuItem>)}
          <div className="menu-row" title="最小字号检查的门槛（px@1080p）：按设备 = PC / 手机 24、掌机 / 电视 26">
            <span className="menu-row-label">最小字号</span>
            <div className="seg menu-seg">{MIN_TEXT.map(([v, l]) => <button key={l} className={minText === v ? 'on' : ''} onClick={() => (v === null ? st.patch({}, ['chk.minText'], '最小字号：按设备') : st.set('chk.minText', v))}>{l}</button>)}</div>
          </div>
          <div className="menu-row" title="屏占比检查的门槛：局内 UI 挡住画面超过这个比例时报警（默认 30%）">
            <span className="menu-row-label">屏占比</span>
            <div className="seg menu-seg">{COVERAGE.map(([v, l]) => <button key={l} className={cover === v ? 'on' : ''} onClick={() => (v === null ? st.patch({}, ['chk.coverage'], '屏占比门槛：默认') : st.set('chk.coverage', v))}>{l}</button>)}</div>
          </div>
          <div className="menu-row" title="文字溢出 / 伪本地化：把界面文字加长，看会不会挤出框">
            <span className="menu-row-label">文字加长</span>
            <div className="seg menu-seg">{OVERFLOW.map(([v, l]) => <button key={v} className={overflow === v ? 'on' : ''} onClick={() => st.set('chk.overflow', v)}>{l}</button>)}</div>
          </div>
          <MenuItem on={floors} onClick={() => setShell({ qualityFloor: !floors })} hint={floors ? '开' : '关'} title="游戏 UI 的品质下限：最小字号、最细描边、面板不透明度、亮场景上的自动描边与衬底、矢量图标。关掉 = 看改进之前的样子（只是查看，不进配方）">品质下限</MenuItem>
          {dev && <MenuItem on={px} onClick={() => st.setHudPixel1to1(!px)} hint={px ? '开' : '关'} title="游戏 UI 按 CSS 像素 1:1 画（对齐像素皮肤时用）">UI 1:1</MenuItem>}
          <MenuSep />
          <MenuItem onClick={() => {
            // A 的 resetView：诊断、检查工具、冻结 + 外壳登记的缩放 / 专注 / 👁UI / 品质下限（不进撤销）
            actions.resetView('view');
            st.setHudPixel1to1(false);
            close();
          }}>重置视图</MenuItem>
        </div>
      )}
    </Pop>
  );
}

const labelOf = (id: string) => getParam(id)?.label ?? uiKeyLabel(id) ?? id;

/** 状态槽：最近一次改动的名字（≤14 字）+ 撤销，4 秒后淡出；点名字列出改了哪些参数 */
function StatusSlot() {
  const last = useStore((s) => s.lastChange);
  const canUndo = useStore((s) => s.history.length > 0);
  const [shown, setShown] = useState(false);
  const [list, setList] = useState(false);
  const imgHint = useImageSceneHint();
  useEffect(() => {
    if (!last) return;
    setShown(true);
    // 立绘场景的提示多留 2 秒（要读完）
    const t = setTimeout(() => setShown(false), imgHint === last ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [last, imgHint]);
  if (!last || (!shown && !list)) return <span className="status-slot" />;
  const text = last.label.length > 14 ? `${last.label.slice(0, 14)}…` : last.label;
  return (
    <span className="status-slot on">
      <Pop label={text} className="status-text" title={last.label} open={list} onOpenChange={setList}>
        {(close) => (
          <div className="status-list">
            <MenuHead>{last.label}{last.ids.length ? `（${last.ids.length} 项）` : ''}</MenuHead>
            <div className="chips">
              {last.ids.slice(0, 40).map((id) => (
                <button key={id} className="chip blue link" onClick={() => { if (getParam(id) && !getParam(id)?.ui) actions.focusParam(id); else useStore.getState().jumpUiParam(id); close(); }}>{labelOf(id)}</button>
              ))}
              {last.ids.length > 40 && <span className="chip">等 {last.ids.length} 项</span>}
            </div>
          </div>
        )}
      </Pop>
      {imgHint === last && <span className="status-hint" title="立绘场景的背景是一张插画：配方只改它的色板、时段、质感、描边和后处理，形体、几何、明暗细节看不出变化。换到 3D 或横版场景能看到整套配方">立绘只吃色板、质感、描边和后处理</span>}
      {canUndo && !last.label.startsWith('撤销') && <button className="btn ghost small" onClick={() => useStore.getState().undo()} title="撤销（Ctrl+Z）">撤销</button>}
    </span>
  );
}

/**
 * 立绘场景（F 的 isImageScene：背景是一张插画）里换了配方（来源的配方变了，不是「不用配方」）：记下这一次的 lastChange，状态槽据此多一枚提示（整合 U#15）。
 * 返回最近一次该带提示的 lastChange 对象（和当前的 lastChange 同一个时才显示）
 */
function useImageSceneHint() {
  const [hint, setHint] = useState<unknown>(null);
  useEffect(() => useStore.subscribe((s, p) => {
    if (s.lastChange === p.lastChange) return;
    const recipe = s.origin.recipe;
    if (recipe && recipe !== p.origin.recipe && isImageScene(String(s.values['game.scene'] ?? ''))) setHint(s.lastChange);
  }), []);
  return hint;
}

/**
 * 知识面板「试一下」的预览（A 的 store.preview）：栏条上一条「预览：X · 采用 · 取消」（§4.3，C 的 PreviewBar，轨道 B2 挂上）。
 * 学习库开着时它自己收成画框下方的一条，这里不重复；ⓘ 弹窗关掉以后预览还在时，只有这里能采用 / 取消
 */
function PreviewSlot() {
  const learnOpen = useShell((s) => s.learnOpen);
  const P = SLOT.PreviewBar;
  if (!P || learnOpen) return null;
  return <P compact />;
}

/** 把当前状态（含一帧截图）钉为 A */
async function repinA() {
  const eng = getEngine();
  const aHud = !hudHidden(useShell.getState(), useStore.getState().activeDim);
  const img = eng ? await eng.capture() : undefined;
  useStore.getState().saveA(img);
  const s = useStore.getState();
  const n = layerNames(s);
  useShell.getState().set({ aLabel: n.art || n.ui || '当前', aHud });
}

/** 新开标签页恢复了上次的实验（A 的 store.restored）：显示 6 秒「已恢复上次：水彩 · 3 小时前 · 新实验」 */
function RestoredSlot() {
  const restored = useStore((s) => (s as unknown as { restored?: { label: string; ts: number } | null }).restored ?? null);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (!restored) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 6000);
    return () => clearTimeout(t);
  }, [restored]);
  if (!restored || !shown) return null;
  const mins = Math.max(0, Math.round((Date.now() - restored.ts) / 60000));
  const ago = mins < 1 ? '刚才' : mins < 60 ? `${mins} 分钟前` : mins < 60 * 24 ? `${Math.round(mins / 60)} 小时前` : `${Math.round(mins / 1440)} 天前`;
  const dismiss = () => (useStore.getState() as unknown as { dismissRestored?: () => void }).dismissRestored?.();
  return (
    <span className="restored">
      <span className="restored-text">已恢复上次{restored.label ? `：${restored.label.slice(0, 8)}` : ''} · {ago}</span>
      <button className="btn ghost small" onClick={() => { actions.newExperiment(); dismiss(); }} title="回到首屏状态（可撤销）">新实验</button>
    </span>
  );
}

/** 对比的 A 徽标：A：水彩 × ；菜单：换成 A、重新钉 A、清除 A */
function ABadge() {
  const slotA = useStore((s) => s.slotA);
  const compare = useStore((s) => s.compare);
  const refImage = useStore((s) => s.refImage);
  const aLabel = useShell((s) => s.aLabel);
  const hudDemo = useStore((s) => s.hudDemo);
  if (hudDemo) return null;
  const st = useStore.getState();
  return (
    <>
      {slotA && (
        <span className={`a-badge ${compare ? 'on' : ''}`}>
          <Pop label={`A：${aLabel || '当前'}`} className="a-main" title="对比的 A">
            {(close) => (
              <>
                <MenuItem on={compare} onClick={() => { st.setCompare(!compare); close(); }} hint={compare ? '开' : '关'}>分屏对比</MenuItem>
                <MenuItem onClick={() => { st.swapToA(); close(); }}>换成 A</MenuItem>
                <MenuItem onClick={() => { void repinA(); close(); }}>把现在钉为 A</MenuItem>
                <MenuItem onClick={() => { st.setSlotA(null); st.setCompare(false); close(); }}>清除 A</MenuItem>
              </>
            )}
          </Pop>
          <button className="a-x" onClick={() => { st.setSlotA(null); st.setCompare(false); }} title="清除 A">×</button>
        </span>
      )}
      {refImage && (
        <span className="a-badge on">
          <span className="a-main" title={refImage.label}>原作</span>
          <button className="a-x" onClick={() => st.setRefImage(null)} title="关掉对照原作">×</button>
        </span>
      )}
    </>
  );
}
