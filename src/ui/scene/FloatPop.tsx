import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/*
 * 画框下方用的弹出层（轨道 D）：画框下方那一栏是 overflow:hidden（外壳 B 的 .deck），往上弹的浮层放在里面会被裁掉，
 * 所以浮层挂到 body 上、按按钮的位置固定定位（默认向上弹）。点外面 / Esc / close() 收起。样式与外壳的 Pop 一致。
 */
export function FloatPop({ label, title, className = 'btn small ghost', align = 'right', width, children }: {
  label: ReactNode;
  title?: string;
  className?: string;
  align?: 'left' | 'right';
  /** 浮层宽度（CSS px；不给 = 按内容） */
  width?: number;
  children: (close: () => void) => ReactNode;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = !!rect;
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) setRect(null);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setRect(null); };
    // 窗口尺寸变了：按按钮的新位置重新摆（不关）
    const move = () => { if (btn.current) setRect(btn.current.getBoundingClientRect()); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', move);
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); window.removeEventListener('resize', move); };
  }, [open]);
  const close = () => setRect(null);
  const style: React.CSSProperties | undefined = rect ? {
    position: 'fixed', zIndex: 300,
    bottom: window.innerHeight - rect.top + 6,
    maxHeight: Math.max(160, Math.min(rect.top - 16, window.innerHeight * 0.72)),
    ...(align === 'right' ? { right: Math.max(8, window.innerWidth - rect.right) } : { left: Math.max(8, rect.left) }),
    ...(width ? { width: Math.min(width, window.innerWidth - 16) } : {}),
  } : undefined;
  return (
    <>
      <button ref={btn} className={`${className} ${open ? 'on' : ''}`} title={title} aria-expanded={open} onClick={(e) => setRect(open ? null : e.currentTarget.getBoundingClientRect())}>{label}</button>
      {rect && createPortal(<div ref={panel} className="fp-panel" role="menu" style={style}>{children(close)}</div>, document.body)}
    </>
  );
}
