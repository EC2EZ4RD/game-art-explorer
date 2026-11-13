import { useStore } from '../../state/store';
import { adoptPreview, cancelPreview } from './preview';
import './learn.css';

/*
 * 预览条（轨道 C，§4.3）：「预览：原则 #23 · 采用 · 取消」。
 * 学习库在预览时收成这一条（LearnOverlay 的 peek 状态，画框露出来）；外壳（B）也可以把它挂到栏条状态槽
 * （slots.ts 找 '../learn/PreviewBar.tsx' 的 PreviewBar，props { compact: true }）。
 * 采用 = 写成普通改动（带 •、可以重置、一步撤销）；取消 = 回到原样（学习库里会展开回去）。
 */
export function PreviewBar({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) {
  const p = useStore((s) => s.preview);
  if (!p) return null;
  const label = p.label.length > 24 ? `${p.label.slice(0, 24)}…` : p.label;
  return (
    <div className={`c-preview ${compact ? 'compact' : ''}`} role="status">
      <span className="c-preview-tag">预览</span>
      <span className="c-preview-label" title={p.label}>{label}</span>
      <button className="c-btn primary" onClick={adoptPreview} title="写成普通改动（可以重置，一步撤销）">采用</button>
      <button className="c-btn" onClick={cancelPreview} title="不要了，回到原来的样子">取消</button>
      {onClose && <button className="c-ico" onClick={() => { cancelPreview(); onClose(); }} title="取消预览并关掉学习库">✕</button>}
    </div>
  );
}
