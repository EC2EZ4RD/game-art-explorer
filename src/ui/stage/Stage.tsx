import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resolveUi } from '../../hud/sys/resolve';
import { useStore } from '../../state/store';
import { DeckSlot } from './DeckSlot';
import { Frame } from './Frame';
import { aspectOf, DECK_MIN, frameBox, sideDeckFits, SIDE_DECK_MIN, TWO_ROWS_FIT } from './frameMath';
import { useSelectionGuard } from './selectionGuard';
import { railOf, setRail, useMode, useShell } from './shell';
import { StageBar } from './StageBar';
import { useShownValues } from './shownValues';

/*
 * 中栏舞台（轨道 B，docs/workbench-redesign.md §3）：栏条 36 + 画框（严格等于设备比例）+ 画框下方（画面模式配方卡 / UI 模式界面胶片 + 皮肤行）。
 * 画框尺寸只由 CSS 像素决定，引擎的 ResizeObserver 跟着变；模式切换、专注、缩放都不重新挂 WebGL。
 * 设备比例按引擎实际拿到的参数算（values ⊕ 知识面板的预览，B2 审查修复 ③）：预览改了画幅时画框跟着变，HUD 不再自己加黑边。
 * 竖屏设备（宽 / 高 < 1，B2 审查修复 ⑰）：画框下方改成画框右边的一栏，画框用满舞台高度（1440×900 编辑态 371×804，原来 267×579、unitK 0.49）；
 *   右边放不下一栏（< SIDE_DECK_MIN）、专注、放大到 50% / 100% 时照旧。
 * 选中守卫（selectionGuard.ts，B2 审查修复 ⑩）挂在这里：换屏、换场景、选中的元素这一屏没有时取消选中。
 */
export function Stage() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [winH, setWinH] = useState(() => window.innerHeight);
  const mode = useMode();
  const focus = useShell((s) => s.focus);
  const zoom = useShell((s) => s.zoom);
  const deckOneRow = useShell((s) => s.deckOneRow);
  const capturing = useShell((s) => s.capturing);
  const values = useShownValues();
  useSelectionGuard();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    const onWin = () => setWinH(window.innerHeight);
    window.addEventListener('resize', onWin);
    return () => { ro.disconnect(); window.removeEventListener('resize', onWin); };
  }, []);

  // 设备比例（ctx.aspect × ctx.orientation，平台预设也会给）：画框永远等于它
  const { aspect, portrait } = useMemo(() => {
    const r = resolveUi(values);
    const p = r.str('ctx.orientation', 'landscape') === 'portrait';
    return { aspect: aspectOf(r.str('ctx.aspect', '16x9'), p), portrait: p };
  }, [values]);

  // 竖屏：画框下方挪到右边一栏
  const side = !focus && zoom === 'fit' && aspect < 1 && sideDeckFits({ stageW: size.w, stageH: size.h, aspect });

  // 画框下方一行还是两行：用户点过就按用户的；否则窗口矮于 800 时一行——但画框按宽度受限、下方本来就空着时照样给两行
  let oneRow = deckOneRow ?? winH < 800;
  const minFor = (one: boolean) => (focus ? 0 : one ? DECK_MIN.oneRow : DECK_MIN[mode]);
  let box = side
    ? frameBox({ stageW: size.w - SIDE_DECK_MIN, stageH: size.h, aspect, deckMin: 0, zoom })
    : frameBox({ stageW: size.w, stageH: size.h, aspect, deckMin: minFor(oneRow), zoom });
  if (side) oneRow = false;
  else if (deckOneRow === null && oneRow && !focus && box.deckH >= TWO_ROWS_FIT[mode]) {
    oneRow = false;
    box = frameBox({ stageW: size.w, stageH: size.h, aspect, deckMin: minFor(false), zoom });
  }

  // F：专注；[：左栏收起 / 展开（只在没有输入框聚焦时）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      const sh = useShell.getState();
      if (e.key === 'f' || e.key === 'F') { if (!e.shiftKey) sh.set({ focus: !sh.focus }); }
      else if (e.key === '[') { const m = useStore.getState().activeDim === 'hud' ? 'ui' : 'art'; setRail(!railOf(sh, m), m); }
      else if (e.key === 'Escape' && sh.focus && !useStore.getState().hudSel) sh.set({ focus: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className={`stage ${focus ? 'is-focus' : ''} ${side ? 'is-side' : ''}`} ref={ref} data-mode={mode}>
      <StageBar frameW={box.w} frameH={box.h} portrait={portrait} />
      {/* 画框在两种排法里都在同一个位置（stage-row 的第一个孩子）：横竖屏切换不重挂 WebGL */}
      <div className="stage-row" style={{ height: Math.max(40, size.h - 36 - (side ? 0 : box.deckH)) }}>
        <div className="frame-area" style={side ? { width: box.w + 24 } : undefined}>
          <Frame w={box.w} h={box.h} overflow={box.overflow} />
        </div>
        {side && <div className="deck side"><DeckSlot oneRow={false} /></div>}
      </div>
      {!focus && !side && <div className="deck" style={{ height: box.deckH }}><DeckSlot oneRow={oneRow} /></div>}
      {focus && <div className="deck-peek"><div className="deck-peek-inner"><DeckSlot oneRow /></div></div>}
      {capturing && <div className="stage-cover">截图中…</div>}
    </main>
  );
}
