import { useEffect } from 'react';
import { str } from '../../dims/registry';
import { analyzeReadability } from '../../hud/check/readability';
import { replayHud } from '../../hud/sim';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';

/*
 * 舞台栏条的"可读"按钮（docs/ui-hud-plan.md M8a；轨道 B 从顶栏挪到栏条，只在 UI 模式出现）：参数停下 0.7 秒后重新检查（取一帧不含 UI 的画面 + 最近一次 UI 绘制记录），
 * 显示问题数；点开列出问题、一键修复（可撤销）、色盲模拟；问题所在位置在画面上用红框标出（ReadabilityOverlay）。
 */

const CVD: [string, string][] = [['off', '色盲模拟：关'], ['protan', '红色弱'], ['deutan', '绿色弱'], ['tritan', '蓝黄色弱'], ['achroma', '全色盲']];

export function ReadabilityBadge() {
  const values = useStore((s) => s.values);
  const issues = useStore((s) => s.readIssues);
  const open = useStore((s) => s.readOpen);
  const setOpen = useStore((s) => s.setReadOpen);
  const setIssues = useStore((s) => s.setReadIssues);
  const setHover = useStore((s) => s.setReadHover);
  const patch = useStore((s) => s.patch);
  const set = useStore((s) => s.set);
  const hudOn = str(values, 'hud.style') !== 'none';

  // 参数或 UI 绘制变了、并且停下 0.7 秒以后重算（场景重建、素材加载完成后 UI 会重画，也会触发）
  useEffect(() => {
    if (!hudOn) { setIssues([]); return; }
    let doneValues: unknown = null, doneSerial = -1, seenValues: unknown = null, seenSerial = -1, changedAt = performance.now();
    const tick = () => {
      const eng = getEngine();
      if (!eng) return;
      const v = useStore.getState().values, serial = eng.hud.drawSerial;
      if (v !== seenValues || serial !== seenSerial) { seenValues = v; seenSerial = serial; changedAt = performance.now(); return; }
      if ((v === doneValues && serial === doneSerial) || performance.now() - changedAt < 700) return;
      const scene = eng.sampleScene(192);
      const r = eng.hud.resolved;
      if (!scene || !r) return;
      setIssues(analyzeReadability(eng.hud.drawLog, scene, scene.cssW, scene.cssH, r));
      doneValues = v;
      doneSerial = eng.hud.drawSerial;
      seenSerial = doneSerial;
    };
    const id = setInterval(tick, 350);
    return () => clearInterval(id);
  }, [hudOn, setIssues]);
  void values;

  if (!hudOn) return null;
  // 「预览太小」说的是画框大小、不是 UI 本身（E 的请求）：照样列在弹窗里，不算进徽标的数
  const counted = issues.filter((i) => i.id !== 'previewSmall');
  const errors = counted.filter((i) => i.level === 'error').length;
  return (
    <div className="read-wrap">
      <button className={`btn ghost small ${counted.length ? (errors ? 'read-err' : 'read-warn') : 'read-ok'} ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title="游戏 UI 可读性检查：文字对比度、面板与背景、最小字号、屏占比、色盲配色、文字溢出、触控尺寸、安全区、特效遮挡">
        可读{counted.length ? `⚠${counted.length}` : '✓'}
      </button>
      {open && (
        <div className="read-pop">
          <div className="read-head">
            <b>可读性检查</b>
            <select className="sel" value={(str(values, 'chk.cvd') || 'off').replace(/^auto$/, 'off')} onChange={(e) => set('chk.cvd', e.target.value)} title="整屏（含 UI）按色觉缺陷模拟，Machado 2009">
              {CVD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {values['chk.fxOcclusion'] === true && <button className="btn small" onClick={() => replayHud('combatBeat')} title="放一遍战斗演示（受击、飘字、升级横幅……），演示结束后检查特效有没有压住 HUD 的字">▶ 战斗演示</button>}
            <button className="btn small ghost" onClick={() => setOpen(false)}>×</button>
          </div>
          {!issues.length && <p className="hint">没有发现问题。换个场景或时间（雪地、夜晚、逆光）再看看；顶栏"诊断"里的"眯眼"可以看层级。</p>}
          {issues.map((it, i) => (
            <div key={`${it.id}-${i}`} className={`read-item ${it.level}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="read-title">{it.level === 'error' ? '✖' : '⚠'} {it.title}</div>
              {it.detail && <div className="read-detail">{it.detail}</div>}
              {it.fixes.length > 0 && (
                <div className="read-fixes">
                  {it.fixes.map((f) => <button key={f.label} className="btn small" onClick={() => patch(f.set, [], `可读性修复：${f.label}`)}>{f.label}</button>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 画面上的问题框（可读性面板打开时；悬停某条问题时只标那一条） */
export function ReadabilityOverlay() {
  const open = useStore((s) => s.readOpen);
  const issues = useStore((s) => s.readIssues);
  const hover = useStore((s) => s.readHover);
  if (!open) return null;
  const list = hover !== null && issues[hover] ? [issues[hover]] : issues;
  return (
    <div className="read-overlay">
      {list.flatMap((it, i) => it.rects.slice(0, 40).map((r, j) => (
        <div key={`${i}-${j}`} className={`read-box ${it.level}`} style={{ left: r.x - 3, top: r.y - 3, width: r.w + 6, height: r.h + 6 }} />
      )))}
    </div>
  );
}
