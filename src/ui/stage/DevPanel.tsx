import { useEffect, useRef, useState } from 'react';
import { Coverage } from '../Coverage';
import { useShell } from './shell';
import { renderSpecSheet, specLayouts, type SpecPage } from './specSheet';

/*
 * 开发者面板（轨道 B，§10：覆盖、fps 统计、Godot 等藏进开发者模式）：⋯ → 开发者模式 → 覆盖统计 / 皮肤规格页。
 * fps / 统计在画框右下角（Frame.tsx），Godot 迁移包在导出▾ 和导出对话框里，种子数字在场景弹窗里。
 * 皮肤规格页（§8 RC6，整合 X#11）：38 个皮肤 × 同一套局内组件，画在灰 / 亮 / 暗三种底上，看同一皮肤里各组件的规则一不一致（specSheet.ts）。
 */
export function DevPanel() {
  const panel = useShell((s) => s.devPanel);
  const dev = useShell((s) => s.dev);
  const set = useShell((s) => s.set);
  if (!panel || !dev) return null;
  const title = panel === 'spec' ? '皮肤规格页（开发者）' : '覆盖统计（开发者）';
  return (
    <div className="dialog-mask" onClick={() => set({ devPanel: null })}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="dialog-head">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={() => set({ devPanel: null })}>关闭</button>
        </div>
        <div className="dialog-body">{panel === 'spec' ? <SpecSheet /> : <Coverage />}</div>
      </div>
    </div>
  );
}

/** 规格页：选一个品类布局，按页画（每页 8 个皮肤，边画边显示） */
function SpecSheet() {
  const layouts = specLayouts();
  const [layout, setLayout] = useState(layouts[0]?.id ?? 'layout.rpg');
  const [pages, setPages] = useState<SpecPage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const run = useRef(0);
  useEffect(() => {
    const me = ++run.current;
    setPages([]);
    setBusy('画第 1 页…');
    // 等对话框先画出来再开始（离屏 HUD 是同步画的，一页约几百毫秒）
    const t = window.setTimeout(() => {
      renderSpecSheet(layout, (p, i, n) => {
        if (run.current !== me) return;
        setPages((x) => [...x, p]);
        setBusy(i + 1 < n ? `画第 ${i + 2} / ${n} 页…` : null);
      }, () => run.current === me).catch((e: unknown) => { if (run.current === me) setBusy(`出错：${String(e)}`); });
    }, 60);
    return () => { clearTimeout(t); run.current++; };
  }, [layout]);
  return (
    <div className="spec-sheet">
      <div className="spec-tools">
        <span className="spec-label">品类布局</span>
        <select className="sel" value={layout} onChange={(e) => setLayout(e.target.value)}>
          {layouts.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        {busy && <span className="hint">{busy}</span>}
      </div>
      {pages.map((p, i) => <img key={i} className="spec-page" src={p.url} alt={`第 ${i + 1} 页：${p.skins.join('、')}`} title={p.skins.join('、')} />)}
    </div>
  );
}
