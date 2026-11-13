import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/*
 * 外壳的弹出菜单（轨道 B）：一个按钮 + 一块浮层。点外面、按 Esc、或菜单项调用 close() 时收起。
 * 浮层贴着按钮放（默认左对齐、向下），align = 'right' 时右对齐（顶栏右侧的菜单不出屏）。
 * portal：浮层挂到 body 上、按按钮的位置固定定位——按钮在会裁切的容器里时用（画框下方 .deck 是 overflow: hidden，
 *   一行时行尾「皮肤▾」往上弹的浮层原来被裁得只剩 13px，D 审查 26 / B2 审查修复）。
 */
export function Pop({ label, title, className = 'btn ghost', align = 'left', up = false, portal = false, children, open: openProp, onOpenChange, disabled }: {
  label: ReactNode;
  title?: string;
  className?: string;
  align?: 'left' | 'right';
  up?: boolean;
  portal?: boolean;
  /** 菜单内容；函数形式拿到 close */
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  disabled?: boolean;
}) {
  const [own, setOwn] = useState(false);
  const open = openProp ?? own;
  const setOpen = (o: boolean) => { if (openProp === undefined) setOwn(o); onOpenChange?.(o); };
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      // 浮层里又弹出来、挂在 body 上的浮层（D 的 FloatPop、别的 portal 浮层）算在里面：点它们不收起这一层
      if ((t as Element).closest?.('.fp-panel, .pop-portal')) return;
      if (ref.current && !ref.current.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); };
    // setOpen 每次渲染都新建：只跟着 open 重挂监听
  }, [open]);
  // portal：按按钮现在的位置摆浮层（窗口尺寸变了跟着挪）
  useLayoutEffect(() => {
    if (!open || !portal) { setPos(null); return; }
    const place = () => {
      const b = ref.current?.getBoundingClientRect();
      if (!b) return;
      const W = window.innerWidth, H = window.innerHeight;
      setPos({
        position: 'fixed',
        ...(align === 'right' ? { left: 'auto', right: Math.max(4, W - b.right) } : { left: Math.max(4, b.left), right: 'auto' }),
        ...(up ? { top: 'auto', bottom: Math.max(4, H - b.top + 4), maxHeight: Math.max(120, b.top - 12) } : { top: b.bottom + 4, bottom: 'auto', maxHeight: Math.max(120, H - b.bottom - 12) }),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, portal, align, up]);
  const close = () => setOpen(false);
  const body = open && (!portal || pos) ? (
    <div ref={popRef} className={`pop ${align === 'right' ? 'pop-right' : ''} ${up ? 'pop-up' : ''} ${portal ? 'pop-portal' : ''}`} style={portal ? pos ?? undefined : undefined} role="menu">
      {typeof children === 'function' ? children(close) : children}
    </div>
  ) : null;
  return (
    <div className="pop-wrap" ref={ref}>
      <button className={`${className} ${open ? 'on' : ''}`} title={title} onClick={() => setOpen(!open)} disabled={disabled} aria-expanded={open}>{label}</button>
      {portal && body ? createPortal(body, document.body) : body}
    </div>
  );
}

/** 菜单里的一项 */
export function MenuItem({ children, onClick, disabled, on, hint, title }: { children: ReactNode; onClick?: () => void; disabled?: boolean; on?: boolean; hint?: ReactNode; title?: string }) {
  return (
    <button className={`menu-item ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} role="menuitem" title={title}>
      <span className="mi-label">{children}</span>
      {hint !== undefined && <span className="mi-hint">{hint}</span>}
    </button>
  );
}

export function MenuSep() {
  return <div className="menu-sep" />;
}

export function MenuHead({ children }: { children: ReactNode }) {
  return <div className="menu-head">{children}</div>;
}
