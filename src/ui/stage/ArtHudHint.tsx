import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';
import { elementName } from './elements';
import { setMode } from './shell';

/*
 * 画面模式下（👁UI 开着时）HUD 不能点选（§6）：鼠标停在某个元素上时只给一圈虚线和一个「到 UI 编辑 ›」小签，
 * 点小签才切到 UI 模式并选中它——画框上的点击本身从不切模式。不接管指针，镜头照常转。
 */
export function ArtHudHint({ vdK }: { vdK: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hit, setHit] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = ref.current, eng = getEngine();
      if (!el || !eng || e.buttons) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / vdK, y = (e.clientY - r.top) / vdK;
      if (x < 0 || y < 0 || x > r.width / vdK || y > r.height / vdK) { setHit(null); return; }
      const h = [...eng.hud.hits].reverse().find((q) => x >= q.rect.x && x <= q.rect.x + q.rect.w && y >= q.rect.y && y <= q.rect.y + q.rect.h && q.rect.w * q.rect.h < 0.2 * (r.width / vdK) * (r.height / vdK));
      setHit((cur) => (h ? (cur?.id === h.element && cur.x === h.rect.x && cur.y === h.rect.y ? cur : { id: h.element, ...h.rect }) : null));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [vdK]);
  return (
    <div className="edit-layer" ref={ref}>
      {hit && (
        <>
          <div className="art-hover" style={{ left: hit.x, top: hit.y, width: hit.w, height: hit.h }} />
          <button className="art-hint" style={{ left: hit.x + 2, top: hit.y + 2 }} onClick={() => { setMode('ui'); useStore.getState().setHudSel(hit.id); }}>
            {elementName(hit.id)} · 到 UI 编辑 ›
          </button>
        </>
      )}
    </div>
  );
}
