import { useEffect, useRef, useState } from 'react';
import { Engine, type EngineStats } from '../../engine/Engine';
import { isUiKey, isViewKey } from '../../dims/registry';
import { useStore } from '../../state/store';
import { setEngine } from '../engineRef';
import { ReadabilityOverlay } from '../hud/Readability';
import { ArtHudHint } from './ArtHudHint';
import { resetCameraNow, watchCamera } from './camState';
import { EditOverlay } from './EditOverlay';
import { engineValues, markFed, onDraftChange } from './engineFeed';
import { hudHidden, useMode, useShell } from './shell';
import { SLOT } from './slots';
// 视距预览的缩放层（.vp-scale / .vp-dist），原来 Viewport 引入
import '../styles.css';

/*
 * 画框（轨道 B，docs/workbench-redesign.md §3.3 §6）：一个尺寸只由 CSS 决定的稳定 host，引擎挂在里面、不随模式 / 缩放重建。
 * 画框里叠：可读性问题框、UI A/B 分界柄、画布编辑层（UI 模式）、对比分屏（A 截图 / 对照原作）、视距预览缩放、开发者统计。
 * 提示不再压在画框上（栏条状态槽，StageBar.tsx）。
 * 对比（§10「⏸ 冻结 → 对比时自动开启」，审查修复 11）：钉了 A 并开着分屏时自动冻结时间；关掉对比 / 清掉 A 时，若是这里冻结的就解冻。
 * 镜头复位（§4.2，轨道 B2）：双击画框空白处（画布本身，不在元素盒子上）= 轨道 F 的 engine.resetCamera()，回到场景机位；视图状态，不进撤销。
 *   镜头转过没有记在 camState.ts（场景弹窗的「镜头复位」只在转过时出现，B2 审查修复 ⑨）。
 */

const VIEW_DIST: Record<string, { label: string; deg: number }> = {
  phone: { label: '手机 6.1 寸横握，30cm', deg: 26 },
  pc: { label: '24 寸显示器，60cm', deg: 47.7 },
  tv: { label: '55 寸电视，2.5m', deg: 27 },
};

export function Frame({ w, h, overflow }: { w: number; h: number; overflow: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [split, setSplit] = useState(0.5);
  const mode = useMode();
  const editOn = useShell((s) => s.editOn);
  const hudInArt = useShell((s) => s.hudInArt);
  const dev = useShell((s) => s.dev);
  const pan = useShell((s) => s.pan);
  const zoom = useShell((s) => s.zoom);
  const compare = useStore((s) => s.compare);
  const slotA = useStore((s) => s.slotA);
  const refImage = useStore((s) => s.refImage);
  const values = useStore((s) => s.values);
  const hudDemo = useStore((s) => s.hudDemo);
  const aLabel = useShell((s) => s.aLabel);
  const aHud = useShell((s) => s.aHud);
  const qa = useShell((s) => s.qa);

  // 引擎：只挂一次
  useEffect(() => {
    if (!host.current) return;
    let engine: Engine;
    try {
      engine = new Engine(host.current);
    } catch (e) {
      setError(`无法创建 WebGL2 渲染器：${String(e)}`);
      return;
    }
    setEngine(engine);
    const unwatchCam = watchCamera(engine);
    engine.onStats = setStats;
    engine.onError = setError;
    // 交给引擎的参数（values ⊕ 预览 ⊕ 拖动临时值 ⊕ 画面模式藏 HUD）；结果没变（同一个对象）就不重复交
    let fedValues: unknown = null;
    const feed = (force = false) => {
      const st = useStore.getState();
      const v = engineValues(st.values, hudHidden(useShell.getState(), st.activeDim));
      if (v === fedValues && !force) return;
      fedValues = v;
      engine.apply(v);
      markFed(engine.hud.drawSerial);
    };
    const s = useStore.getState();
    feed(true);
    engine.setDiag(s.diag);
    engine.setHudInDiag(s.hudInDiag);
    engine.frozen = s.frozen;
    engine.hud.abSplit = s.hudABSplit;
    engine.hud.pixel1to1 = s.hudPixel1to1;
    // 参数变化同步交给引擎（QA 脚本 setMany 之后马上 renderSync，要求同步）
    const unsub = useStore.subscribe((st, prev) => {
      if (st.values !== prev.values) setError(null);
      // 参数、模式、知识面板的预览……任何一项变了都重新合成；合成结果没变时 feed 自己跳过
      feed();
      if (st.diag !== prev.diag) engine.setDiag(st.diag);
      if (st.hudInDiag !== prev.hudInDiag) engine.setHudInDiag(st.hudInDiag);
      if (st.frozen !== prev.frozen) engine.frozen = st.frozen;
      if (st.hudABOn !== prev.hudABOn || st.slotA !== prev.slotA) engine.hudAB = st.hudABOn && st.slotA ? st.slotA.values : null;
      if (st.hudABSplit !== prev.hudABSplit) engine.hud.abSplit = st.hudABSplit;
      if (st.hudPixel1to1 !== prev.hudPixel1to1) engine.hud.pixel1to1 = st.hudPixel1to1;
    });
    const unsubShell = useShell.subscribe((sh, prev) => {
      if (sh.hudInArt !== prev.hudInArt || sh.qa !== prev.qa) feed();
    });
    // 对比时自动冻结（审查修复 11）：用户自己先冻结了的不管；对比结束时只解开这里冻结的那一次
    let autoFroze = false;
    const unsubFreeze = useStore.subscribe((st, prev) => {
      const on = !!(st.compare && st.slotA), was = !!(prev.compare && prev.slotA);
      if (on === was) return;
      if (on) { if (!st.frozen) { autoFroze = true; st.setFrozen(true); } }
      else { if (autoFroze && useStore.getState().frozen) useStore.getState().setFrozen(false); autoFroze = false; }
    });
    // 拖动中的临时值：按 rAF 合成，一帧最多一次
    let raf = 0;
    const offDraft = onDraftChange(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; feed(); });
    });
    return () => {
      unwatchCam();
      unsub();
      unsubShell();
      unsubFreeze();
      offDraft();
      cancelAnimationFrame(raf);
      engine.dispose();
      setEngine(null);
    };
  }, []);

  // 对比：只有 UI 不同 → 左右两边都是实时画面（UI A/B）；否则 A 边用截图。原则演示自己管 UI A/B，这里不碰。
  // 视图键（chk.* 检查工具等）不算不同：A 槽存的是去掉视图键的快照（审查修复 8：原来一钉 A 就算「只有 UI 不同」，立刻分屏）
  const diffKeys = compare && slotA && slotA.values !== values ? Object.keys({ ...slotA.values, ...values }).filter((k) => !isViewKey(k) && slotA.values[k] !== values[k]) : [];
  const differs = diffKeys.length > 0;
  const onlyUi = differs && diffKeys.every((k) => isUiKey(k));
  useEffect(() => {
    if (hudDemo) return;
    const st = useStore.getState();
    const want = !!(compare && onlyUi);
    if (st.hudABOn !== want) st.setHudABOn(want);
  }, [compare, onlyUi, hudDemo]);

  const onDrag = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el) return;
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setSplit(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  };

  // 视距预览（chk.viewDistance）：画面缩到"在那台设备上看起来多大"
  const VD = VIEW_DIST[String(values['chk.viewDistance'] ?? 'off')];
  const vdK = VD ? VD.deg / 47.7 : 1;
  // A 截图里有没有游戏 UI（钉 A 时记下），和现在这边不一样时标出来（审查修复 29：画面模式钉 A 后再开 👁UI，只有右边有 HUD，看起来像是差别）
  const liveHud = mode === 'ui' || hudInArt || qa;
  const aHudNote = aHud === null || aHud === liveHud ? '' : aHud ? ' · 含 UI' : ' · 不含 UI';
  const shotSide = compare && slotA?.image && differs && !onlyUi ? { src: slotA.image, label: `A：${aLabel || '截图'}${aHudNote}` } : refImage ? { src: refImage.url, label: `原作：${refImage.label}` } : null;
  const hh = stats ? Math.floor(stats.timeOfDay) : 0;
  const mm = stats ? Math.floor((stats.timeOfDay % 1) * 60) : 0;
  const Ab = SLOT.AbSplitHandle;
  return (
    <div className={`frame-wrap ${overflow ? 'is-over' : ''} zoom-${zoom}`}>
      <div className="frame" ref={wrap} style={{ width: w, height: h, transform: overflow ? `translate(${pan.x}px, ${pan.y}px)` : undefined }} data-frame>
        <div className="vp-scale" style={vdK !== 1 ? { transform: `scale(${vdK})` } : undefined}>
          <div ref={host} className="frame-host" onDoubleClick={resetCamera} />
          <ReadabilityOverlay />
          {Ab && <Ab />}
          {mode === 'ui' && editOn && <EditOverlay vdK={vdK} />}
          {mode === 'art' && hudInArt && <ArtHudHint vdK={vdK} />}
        </div>
        {VD && <span className="vp-dist">视距：{VD.label} · {Math.round(vdK * 100)}%</span>}
        {shotSide && (
          <>
            <img className="compare-img" src={shotSide.src} alt="A" style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }} />
            <div className="compare-handle" style={{ left: `${split * 100}%` }} onPointerDown={onDrag} onDoubleClick={() => setSplit(0.5)} title="拖动分割线；双击回到中间" />
            <span className="compare-tag" style={{ left: 8 }}>{shotSide.label}</span>
            <span className="compare-tag" style={{ right: 8 }}>现在</span>
          </>
        )}
        {dev && stats && (
          <div className="vp-stats">
            {stats.fps.toFixed(0)} fps · {(stats.triangles / 1000).toFixed(1)}k 面 · {stats.calls} 次绘制 · 内部 {stats.internal[0]}×{stats.internal[1]}{stats.hudMs !== null && ` · UI ${stats.hudMs.toFixed(1)}ms`} · {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>
      <PanLayer active={overflow} />
    </div>
  );
}

/** 镜头复位：双击画框空白处（元素盒子在编辑层上，双击它们不会冒泡到这里；双击的第一下选中了大框的情况编辑层自己处理） */
function resetCamera(e: React.MouseEvent) {
  if (e.button !== 0) return;
  resetCameraNow();
}

/** 放大时按住空格拖动平移（适应时不出现） */
function PanLayer({ active }: { active: boolean }) {
  const [space, setSpace] = useState(false);
  const on = useRef(active);
  on.current = active;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // 只在放大（画框比舞台大）时接管空格；适应时空格照常（按钮、折叠标题……）
      if (!on.current || e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, button, summary, [contenteditable="true"]')) return;
      setSpace(true);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpace(false); };
    const blur = () => setSpace(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  if (!active || !space) return null;
  const onDown = (e: React.PointerEvent) => {
    const start = { x: e.clientX, y: e.clientY, p: useShell.getState().pan };
    const move = (ev: PointerEvent) => useShell.getState().set({ pan: { x: start.p.x + ev.clientX - start.x, y: start.p.y + ev.clientY - start.y } });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  };
  return <div className="pan-layer" onPointerDown={onDown} title="拖动平移" />;
}
