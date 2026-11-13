import { useState } from 'react';
import { getParam, isUiKey, str } from '../../dims/registry';
import { uiKeyLabel } from '../../hud/sys/register';
import { DEMOS, EASE, HUD_SIM, clearHud, fireHud, type SimKind } from '../../hud/sim';
import { FLOWS, flowTotal, playDemoScript, stopFlow } from '../../hud/flow';
import { MONETIZATION_FLOWS, MONETIZATION_LABEL } from '../../content/uiMonetization';
import type { Resolved } from '../../hud/sys/resolve';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';

/*
 * "动效"页顶部的模拟控制（docs/ui-hud-plan.md M5b）：触发事件、重放演示、慢放、逐帧条带、缓动曲线；顶栏「对比」分出 UI 左右对比时列出 A 与现在不同的 UI 参数。
 * 所有动画都是 HUD 时钟的纯函数：冻结画面时时钟也停，同步截图逐字节相同。
 * 轨道 D（docs/workbench-redesign.md §10「MotionBar → 界面胶片的 ▶，以及 UI 动效组」）：在 UI 面板「动效」组的最上面；
 *   界面胶片的 ▶流程卡也调同一个 playDemoScript。演示下拉写 chk.demo（A 的 store 把它并进当前界面，不记成场景改动）。
 * 原来这里有自己的「UI A/B」勾选（审查修复 13）：§0.3 全局只有一个「对比」和一个 A 徽标，UI 左右分屏由外壳按「只有 UI 不同」自动开关，这里不再另设开关。
 */

const EVENTS: [SimKind, string][] = [['hit', '受击'], ['heal', '回血'], ['pickup', '拾取'], ['levelUp', '升级'], ['cooldown', '冷却'], ['lowHp', '低血量'], ['dialog', '对话逐字'], ['enter', '入场']];
const DEMO_LABEL: Record<string, string> = { combatBeat: '战斗节拍', levelUp: '升级（流程）', dialogue: '对话（流程）', login: '登录（流程）', gacha: '抽卡（流程）', build: '建造（流程）', purchase: '购买（流程）', draft: '三选一（流程）' };
/** 播放一段流程演示：有流程脚本的（M9b）按界面串起来播，否则只放事件（M5b）；实现在 hud/flow（演示条、图谱也用）。不导出（T0）：本文件只导出组件，Fast Refresh 才能热替换，别处直接用 hud/flow 的 playDemoScript */
const playDemo = playDemoScript;

function EaseCurve({ name }: { name: string }) {
  const f = EASE[name] ?? EASE.easeOut;
  const pts = Array.from({ length: 41 }, (_, i) => { const x = i / 40; return `${4 + x * 112},${56 - f(x) * 44}`; }).join(' ');
  return (
    <svg width="120" height="64" className="ease-curve" aria-label={`缓动曲线 ${name}`}>
      <rect x="4" y="12" width="112" height="44" fill="none" stroke="currentColor" strokeOpacity="0.15" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

export function MotionBar({ r }: { r: Resolved }) {
  const values = useStore((s) => s.values);
  const slotA = useStore((s) => s.slotA);
  const ab = useStore((s) => s.hudABOn);
  const set = useStore((s) => s.set);
  const [speed, setSpeed] = useState(HUD_SIM.scale);
  const [strip, setStrip] = useState<string | null>(null);
  const demo = str(values, 'chk.demo') && str(values, 'chk.demo') !== 'none' ? str(values, 'chk.demo') : 'combatBeat';

  const makeStrip = async () => {
    const eng = getEngine();
    if (!eng) return;
    // 逐帧条带：从 0 秒起等间隔 24 帧（流程按总时长均分，事件演示每 0.2 秒）
    playDemo(demo);
    const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
    const n = 24, dt = FLOWS[demo] ? flowTotal(demo) / (n - 1) : 0.2, W = 240;
    void DEMOS;
    let cv: HTMLCanvasElement | null = null;
    for (let i = 0; i < n; i++) {
      HUD_SIM.resetTo = i * dt;
      const im = await load(eng.renderSync(1));
      const H = Math.round((W * im.height) / im.width);
      if (!cv) { cv = document.createElement('canvas'); cv.width = 6 * W; cv.height = Math.ceil(n / 6) * (H + 18); const g0 = cv.getContext('2d')!; g0.fillStyle = '#222'; g0.fillRect(0, 0, cv.width, cv.height); }
      const g = cv.getContext('2d')!;
      const x = (i % 6) * W, y = Math.floor(i / 6) * (H + 18);
      g.drawImage(im, x, y + 18, W, H);
      g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${(i * dt).toFixed(1)}s`, x + 4, y + 13);
    }
    if (cv) setStrip(cv.toDataURL('image/png'));
  };

  const diff = slotA ? Object.keys({ ...slotA.values, ...values }).filter((k) => isUiKey(k) && slotA.values[k] !== values[k] && !(slotA.values[k] === undefined && values[k] === 'auto') && !(values[k] === undefined && slotA.values[k] === 'auto')) : [];
  return (
    <div className="motion-bar">
      <div className="group-title" title="画面上立刻播放；动画只看 HUD 时钟（冻结时也停）">触发事件</div>
      <div className="chips ui-chips">
        {EVENTS.map(([k, l]) => <button key={k} className="chip link" onClick={() => fireHud(k)}>{l}</button>)}
        <button className="chip link" onClick={() => { clearHud(); stopFlow(); }} title="清掉已触发的事件与正在播的流程，回到初始状态">↺ 复位</button>
      </div>
      <div className="ui-tools">
        <select className="sel" value={demo} onChange={(e) => set('chk.demo', e.target.value)} title="流程演示：一串排好时间的事件（有的会按界面串起来播）；和左栏 UI 原则的「对比演示」不是一回事">
          {Object.keys(DEMOS).filter((d) => !MONETIZATION_FLOWS.has(d)).map((d) => <option key={d} value={d}>{DEMO_LABEL[d] ?? d}</option>)}
          {/* 商业化流程（抽卡、购买）保留可播，收在最后（G5） */}
          <optgroup label={MONETIZATION_LABEL}>
            {Object.keys(DEMOS).filter((d) => MONETIZATION_FLOWS.has(d)).map((d) => <option key={d} value={d}>{DEMO_LABEL[d] ?? d}</option>)}
          </optgroup>
        </select>
        <button className="btn small" onClick={() => playDemo(demo)}>▶ 重放</button>
        {[1, 0.5, 0.25].map((x) => <button key={x} className={`btn small ${speed === x ? 'on' : ''}`} onClick={() => { HUD_SIM.scale = x; setSpeed(x); }}>{x}×</button>)}
        <button className="btn small ghost" onClick={makeStrip} title="把这段演示每 0.2 秒截一帧排成条带">逐帧条带</button>
      </div>
      <div className="ui-tools">
        <EaseCurve name={r.str('mo.easing', 'easeOut') === 'auto' ? 'easeOut' : r.str('mo.easing', 'easeOut')} />
        <span className="hint" style={{ padding: 0 }} title="缓动 · 时长 · 力度">{getParam('mo.easing')?.options?.find((o) => o.value === r.str('mo.easing', 'easeOut'))?.label ?? r.str('mo.easing', 'easeOut')} · {r.num('mo.duration', 0.25)}s · {r.num('mo.juice', 0.3)}</span>
      </div>
      {ab && slotA && (
        <div className="ui-diff" title="顶栏「对比」：左边 A、右边现在，同一个时钟，动画同步">
          {diff.length ? <>A 与现在不同的 UI 参数（{diff.length}）：{diff.slice(0, 12).map((k) => <span key={k} className="chip">{getParam(k)?.label ?? uiKeyLabel(k) ?? k}</span>)}{diff.length > 12 ? '…' : ''}</> : 'A 与现在的 UI 参数完全相同'}
        </div>
      )}
      {strip && (
        <div className="dialog-mask" onClick={() => setStrip(null)}>
          <div className="dialog" style={{ width: 'min(1500px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head"><h3>逐帧条带：{DEMO_LABEL[demo] ?? demo}</h3><button className="btn ghost" onClick={() => setStrip(null)}>关闭</button></div>
            <div className="dialog-body"><img src={strip} alt="逐帧条带" style={{ width: '100%' }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
