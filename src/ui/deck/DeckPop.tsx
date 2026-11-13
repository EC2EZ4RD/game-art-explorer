import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/*
 * 画框下方配方卡（轨道 C，StyleDeck）的浮层：挂到 body 上、按锚点固定定位（整合 U#6）。
 * 外壳的 .deck 是 overflow:hidden，浮层放在里面会被画框或下方区域裁掉（「复制提示词 ▾」的表头曾藏在画框后面）。
 * 上方放得下就向上弹，否则向下；左右夹在视口内（留 8px），高度超出可见空间时自己滚动。
 * 点外面（锚点和浮层之外）/ Esc 收起；窗口尺寸变化、滚动时跟着锚点重新摆。本文件只导出组件（Fast Refresh）。
 */

const GAP = 6, EDGE = 8;

interface Place { left: number; top: number; maxH: number }

/** 按锚点和浮层尺寸算位置：优先向上（放不下且下方更宽裕时向下），水平方向右对齐锚点并夹在视口内 */
function place(a: DOMRect, w: number, h: number, prefer: 'up' | 'down'): Place {
  const vw = window.innerWidth, vh = window.innerHeight;
  const above = a.top - GAP - EDGE, below = vh - a.bottom - GAP - EDGE;
  const up = prefer === 'up' ? (h <= above || above >= below) : !(h <= below || below >= above);
  const maxH = Math.max(120, up ? above : below);
  const hh = Math.min(h, maxH);
  const top = up ? a.top - GAP - hh : a.bottom + GAP;
  const left = Math.max(EDGE, Math.min(vw - EDGE - w, a.right - w));
  return { left, top, maxH };
}

/**
 * 锚在某个元素上的浮层。open 由调用方管（「复制」失败时要自己打开预览）；onClose 在点外面 / Esc 时调用。
 * passive = 只是提示（不接管指针、不响应点外面），给「已复制 266 字」这类短提示用。
 */
export function DeckPop({ anchor, open, onClose, className = '', prefer = 'up', passive = false, children }: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose?: () => void;
  className?: string;
  prefer?: 'up' | 'down';
  passive?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Place | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 先在屏外量尺寸，再摆到锚点旁边（内容变了也重摆：中英切换后字数不同）
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const relayout = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      setPos(place(a, p.offsetWidth, p.scrollHeight, prefer));
    };
    relayout();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(relayout) : null;
    if (panel.current) ro?.observe(panel.current);
    window.addEventListener('resize', relayout);
    window.addEventListener('scroll', relayout, true);
    return () => { ro?.disconnect(); window.removeEventListener('resize', relayout); window.removeEventListener('scroll', relayout, true); };
  }, [open, anchor, prefer]);

  useEffect(() => {
    if (!open || passive) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) closeRef.current?.();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current?.(); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); };
  }, [open, passive, anchor]);

  if (!open) return null;
  const style: CSSProperties = pos
    ? { left: pos.left, top: pos.top, maxHeight: pos.maxH }
    : { left: -9999, top: -9999, visibility: 'hidden' };
  return createPortal(
    <div ref={panel} className={`c-fixed-pop ${passive ? 'passive' : ''} ${className}`} style={style} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  );
}
