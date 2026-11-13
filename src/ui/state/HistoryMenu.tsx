import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import './state.css';

/*
 * ↶▾ 带标签的历史列表（轨道 A，docs/workbench-redesign.md §4.2「规则」）。只是菜单面板：按钮和浮层由外壳给。
 *   最上面是还能重做的几步（灰色），然后「当前」，再往下是更早的步骤，最底下是「最初」。
 *   点一步 = 回到做完那一步时的样子（可以再重做回来）。最多列 20 步。
 */

const MAX = 20;

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return '刚才';
  if (s < 3600) return `${Math.round(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.round(s / 3600)} 小时前`;
  return `${Math.round(s / 86400)} 天前`;
}

export function HistoryMenu({ onClose }: { onClose?: () => void }) {
  const history = useStore((s) => s.history);
  const future = useStore((s) => s.future);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const done = (f: () => void) => () => { f(); onClose?.(); };
  const n = history.length;
  // 重做：future[0] 是下一步；列出最多 5 步，越远的越靠上
  const redo = future.slice(0, 5).map((f, i) => ({ f, i })).reverse();
  // 撤销：history[j].label 是第 j 步做了什么；做完第 j 步的状态 = history[j + 1]（最后一步 = 现在）
  const past = history.map((h, j) => ({ h, j })).slice(-(MAX - redo.length - 1)).reverse();
  if (!n && !future.length) return <div className="st-menu st-hist"><div className="st-empty">还没有操作</div></div>;
  return (
    <div className="st-menu st-hist" role="menu" aria-label="最近的操作">
      {redo.map(({ f, i }) => (
        <button key={`f${f.ts}-${i}`} className="st-item st-future" role="menuitem" title="重做到这一步" onClick={done(() => { const st = useStore.getState(); for (let k = 0; k <= i; k++) st.redo(); })}>
          <span className="st-label">↷ {f.label}</span>
          <span className="st-dim">可重做</span>
        </button>
      ))}
      {past.map(({ h, j }) => {
        const cur = j === n - 1;
        return (
          <button key={`h${h.ts}-${j}`} className={`st-item ${cur ? 'st-now' : ''}`} role="menuitem" disabled={cur} title={cur ? '现在的样子' : '回到做完这一步时'} onClick={done(() => useStore.getState().jumpTo(j + 1))}>
            <span className="st-label">{h.label || '（未命名）'}</span>
            <span className="st-dim">{cur ? '当前' : ago(h.ts, now)}</span>
          </button>
        );
      })}
      {n > 0 && (
        <button className="st-item" role="menuitem" title="回到这一串操作之前" onClick={done(() => useStore.getState().jumpTo(0))}>
          <span className="st-label">最初</span>
          <span className="st-dim">{n > past.length ? `更早 ${n - past.length} 步` : ''}</span>
        </button>
      )}
    </div>
  );
}
