import { useEffect, useState } from 'react';
import { getParam } from '../../dims/registry';
import { playDemoScript } from '../../hud/flow';
import { fireHud } from '../../hud/sim';
import { useStore, type HudDemo } from '../../state/store';
import { RichText } from './KnowledgeBits';
import {
  carryKeys, demoSideLabels, demoTools, endDemo, keyLabel, recipeName, sceneIndex, setDemoSquint, switchDemoArt, switchDemoScene, valueLabel, withRecipeNames,
} from './principleDemo';
import { useUiKnowledge } from './useUiKnowledge';
import '../hud/principles.css';

/*
 * 视口上的原则对比演示条（G2，docs/t1-tool-knowledge.md）：store.hudDemo 不为空时显示——标题、左 A / 右 B 各是什么、"看哪里"（lookAt，id 换成中文与参数小标签）、
 * 两侧不同的参数（A → B）、只看 A / 对半 / 只看 B、画面配方 / 场景变体的切换、入场动画循环、眯眼与色盲模拟开关、
 * 结束演示（回到演示前 / 只带走关键几项 / 保留 B）。
 * 没有演示、但 UI 左右对比（UI A/B）开着时（图谱的"UI 左右对比"、动效页的 A/B 勾选）显示一条小横条：A 是什么、看哪一侧、关掉对比。
 * AbSplitHandle：视口上 A / B 分界的拖动柄（Viewport.tsx 挂在视距缩放层里，跟画面一起缩放）。
 * 演示条横跨在 A / B 分界上居中：两侧 HUD 被挡住的一样多；收起时只剩一行小胶囊。
 * Viewport.tsx 已经挂好（在 .viewport 里、视距缩放层之外）。
 * 归属：B2。
 */

const POS_KEY = 'gae.demoBanner.pos';
const readPos = (): 'bottom' | 'top' => { try { return localStorage.getItem(POS_KEY) === 'top' ? 'top' : 'bottom'; } catch { return 'bottom'; } };

export function DemoBanner() {
  const demo = useStore((s) => s.hudDemo);
  const ab = useStore((s) => s.hudABOn && !!s.slotA);
  if (demo) return <Banner key={demo.id} demo={demo} />;
  return ab ? <AbStrip /> : null;
}

/** 只看 A / 对半 / 只看 B（store.hudABSplit：分界占视口宽度的比例） */
function SplitButtons() {
  const split = useStore((s) => s.hudABSplit);
  const set = useStore((s) => s.setHudABSplit);
  const btn = (x: number, label: string, tip: string) => (
    <button className={`btn small ${Math.abs(split - x) < 0.01 ? 'on' : ''}`} title={tip} onClick={() => set(x)}>{label}</button>
  );
  return (
    <span className="pr-demo-split">
      {btn(1, '只看 A', '整屏画 A：贴在右边的元素（小地图、资源……）也看得到')}
      {btn(0.5, '对半', '左半 A、右半 B（也可以直接拖画面上的分界）')}
      {btn(0, '只看 B', '整屏画 B：贴在左边的元素（血条、队伍……）也看得到')}
    </span>
  );
}

/** 没有演示时的 UI 左右对比提示条：别处打开了 UI A/B，这里说清楚左边是什么、怎么关 */
function AbStrip() {
  const label = useStore((s) => s.slotA?.label ?? 'A');
  const [min, setMin] = useState(false);
  const off = () => useStore.getState().setHudABOn(false);
  return (
    <div className={`pr-ab-strip ${min ? 'min' : ''}`}>
      <span className="chip blue">UI 左右对比</span>
      {!min && <span className="pr-ab-label" title={`左边（A）：${label}；右边（B）：右栏现在的 UI。之后的"套用"只改右边`}>A：{label.replace(/^A：/, '')} · B：现在的 UI</span>}
      {!min && <SplitButtons />}
      <button className="btn small ghost" title={min ? '展开' : '收起成一个小标签'} onClick={() => setMin(!min)}>{min ? '展开' : '收起'}</button>
      <button className="btn small" title="关掉 UI 左右对比（右边的值保留）" onClick={off}>关掉对比</button>
    </div>
  );
}

/** 视口上的 A / B 分界拖动柄（UI A/B 开着时）；双击回到对半 */
export function AbSplitHandle() {
  const on = useStore((s) => s.hudABOn && !!s.slotA);
  const split = useStore((s) => s.hudABSplit);
  const set = useStore((s) => s.setHudABSplit);
  if (!on) return null;
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.parentElement;
    if (!box) return;
    const move = (ev: PointerEvent) => {
      const r = box.getBoundingClientRect();
      const x = (ev.clientX - r.left) / Math.max(1, r.width);
      // 靠边 3% 以内吸到边上 = 只看一侧
      set(x < 0.03 ? 0 : x > 0.97 ? 1 : x);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div className="pr-ab-handle" style={{ left: `${split * 100}%` }} onPointerDown={onDown} onDoubleClick={() => set(0.5)}
      title="拖动：改 UI A / B 的分界（拖到最左只看 B、最右只看 A）；双击回到对半">
      <span className="pr-ab-grip">A ⇔ B</span>
    </div>
  );
}

function Banner({ demo }: { demo: HudDemo }) {
  const ab = useStore((s) => s.hudABOn);
  const hasA = useStore((s) => !!s.slotA);
  const values = useStore((s) => s.values);
  const openKnowledge = useStore((s) => s.openKnowledge);
  const k = useUiKnowledge();
  const [min, setMin] = useState(false);
  const [pos, setPos] = useState(readPos);
  const [loop, setLoop] = useState(true);
  const derived = !!demo.derived || (demo.kind === 'isolate' && /→\s*只切换/.test(demo.title));
  const sides = demoSideLabels(demo.title, derived);
  const title = demo.title.replace(/\s*→\s*只切换.*$/, '');
  const carry = carryKeys(demo);
  const tools = demoTools(values);

  // 入场动画循环（play = enter）：A / B 同一个时钟，两边一起播
  useEffect(() => {
    if (demo.play !== 'enter' || !ab || !loop) return;
    fireHud('enter');
    const t = setInterval(() => fireHud('enter'), 2500);
    return () => clearInterval(t);
  }, [demo.play, ab, loop]);

  const flipPos = () => {
    const p = pos === 'top' ? 'bottom' : 'top';
    setPos(p);
    try { localStorage.setItem(POS_KEY, p); } catch { /* 隐私模式 */ }
  };

  if (min) {
    return (
      <div className={`pr-demo-banner ${pos} min`}>
        <div className="pr-demo-head">
          <span className="chip blue">对比演示</span>
          <b title={demo.title}>{title}</b>
          <button className="btn small ghost" title="展开演示说明" onClick={() => setMin(false)}>展开</button>
          <button className="btn small ghost" title="结束对比演示：UI 和画面都回到点演示之前（这一步也能撤销）" onClick={() => endDemo('restore')}>■</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pr-demo-banner ${pos}`}>
      <div className="pr-demo-head">
        <span className="chip blue">对比演示</span>
        <b title={demo.title}>{title}</b>
        <button className="btn small ghost" title={pos === 'top' ? '挪到下面' : '挪到上面'} onClick={flipPos}>{pos === 'top' ? '↓' : '↑'}</button>
        <button className="btn small ghost" title="收起成一行，少挡画面" onClick={() => setMin(true)}>收起</button>
      </div>
      {ab && hasA ? (
        <>
          <div className="pr-demo-sides">
            <span><b>左 A</b>{sides.a}</span>
            <span><b>右 B</b>{sides.b}</span>
          </div>
          <div className="pr-demo-steps"><span className="pr-demo-step-label">看哪一侧</span><SplitButtons /></div>
        </>
      ) : (
        <div className="pr-demo-off">
          左右对比已关闭。
          {hasA && <button className="btn small" onClick={() => useStore.getState().setHudABOn(true)}>重新打开左右对比</button>}
        </div>
      )}
      {demo.lookAt && (
        <p className="pr-demo-look">
          <b>看哪里：</b><RichText k={k} text={withRecipeNames(demo.lookAt, demo.art)} />
          {derived && <span className="pr-demo-derived">这一版是单变量版：从 A 出发，只换了下面这几项，其余同 A——看上面说的效果里有多少来自它们。</span>}
        </p>
      )}
      <FocusDiff demo={demo} />
      {tools.length > 0 && (
        <p className="pr-demo-tools" title="这些是看效果用的检查工具，不是 UI 的一部分；结束演示（哪一种都行）时关掉">
          演示开着：{tools.map(([key, v]) => `${keyLabel(key)}${typeof v === 'boolean' ? '' : `（${valueLabel(key, v)}）`}`).join('、')} · 结束时关掉
        </p>
      )}
      <DemoSwitches demo={demo} loop={loop} setLoop={setLoop} />
      <div className="pr-demo-actions">
        <button className="btn small primary" title="关掉左右对比，UI 和画面都回到点演示之前（这一步也能撤销）" onClick={() => endDemo('restore')}>结束：回到演示前</button>
        {carry.length > 0 && (
          <button className="btn small" title={`回到演示前你自己的 UI，只把这 ${carry.length} 项换成 B 的值：${carry.map(keyLabel).join('、')}（一步，可撤销）`} onClick={() => endDemo('carry')}>
            回到演示前，只带走这 {carry.length} 项
          </button>
        )}
        <button className="btn small ghost" title={`关掉左右对比，右栏保留 B 侧的整套 UI（灰盒皮肤 + 演示的题材与元素）${tools.length ? '；演示开着的检查工具关掉' : ''}；Ctrl+Z 可以撤回`} onClick={() => endDemo('keep')}>
          保留 B{tools.length ? '（检查工具关掉）' : ''}
        </button>
        <button className="btn small ghost" title="在左栏打开这条原则" onClick={() => openKnowledge('principle', demo.owner)}>看原则</button>
      </div>
    </div>
  );
}

/** 两侧不同的参数：参数名 + A 的值 → B 的值（点参数名跳到右栏那一行） */
function FocusDiff({ demo }: { demo: HudDemo }) {
  const a = useStore((s) => s.slotA?.values);
  const b = useStore((s) => s.values);
  const jump = useStore((s) => s.jumpUiParam);
  if (!demo.focusKeys.length) return null;
  return (
    <div className="pr-demo-keys">
      {demo.focusKeys.map((k) => (
        <span key={k} className="pr-demo-key" title={`${k}（点一下在右栏打开）`} onClick={() => jump(k)}>
          <span className="pr-demo-key-name">{keyLabel(k)}</span>
          {a && <span className="pr-demo-key-val">{valueLabel(k, a[k])} → {valueLabel(k, b[k])}</span>}
        </span>
      ))}
    </div>
  );
}

/** 色盲模拟的选项（chk.cvd） */
const cvdOptions = () => (getParam('chk.cvd')?.options ?? []).filter((o) => o.value !== 'auto');

/** 画面配方 / 场景变体切换、入场循环、重放流程演示、眯眼、色盲模拟 */
function DemoSwitches({ demo, loop, setLoop }: { demo: HudDemo; loop: boolean; setLoop: (b: boolean) => void }) {
  const baseRecipe = useStore((s) => s.baseRecipe);
  const sceneAt = useStore((s) => sceneIndex(demo.scenes, s.values));
  const script = useStore((s) => String(s.values['chk.demo'] ?? ''));
  const squintOn = useStore((s) => s.diag === 'squint');
  const cvd = useStore((s) => String(s.values['chk.cvd'] ?? 'off'));
  const hasScript = !!script && !['auto', 'none'].includes(script);
  const showSquint = !!demo.squint || squintOn;
  const showCvd = !!demo.cvd || (cvd !== 'off' && cvd !== 'auto');
  if (demo.art.length < 2 && demo.scenes.length < 2 && demo.play !== 'enter' && !hasScript && !showSquint && !showCvd) return null;
  return (
    <div className="pr-demo-steps">
      {demo.art.length > 1 && (
        <span className="pr-demo-step">
          <span className="pr-demo-step-label">换画面</span>
          {demo.art.map((id) => (
            <button key={id} className={`btn small ${baseRecipe === id ? 'on' : ''}`} title={`画面换成「${recipeName(id)}」，UI 两侧不变`} onClick={() => switchDemoArt(id)}>{recipeName(id)}</button>
          ))}
        </span>
      )}
      {demo.scenes.length > 1 && (
        <span className="pr-demo-step">
          <span className="pr-demo-step-label">换场景</span>
          {demo.scenes.map((s, i) => (
            <button key={i} className={`btn small ${sceneAt === i ? 'on' : ''}`} title={`场景换成「${s.label}」，UI 两侧不变`} onClick={() => switchDemoScene(i)}>{s.label}</button>
          ))}
        </span>
      )}
      {demo.play === 'enter' && (
        <span className="pr-demo-step">
          <button className={`btn small ${loop ? 'on' : ''}`} title="每 2.5 秒让两侧一起重播一次入场动画" onClick={() => setLoop(!loop)}>{loop ? '⏸ 停止循环入场' : '▶ 循环入场'}</button>
          {!loop && <button className="btn small" onClick={() => fireHud('enter')}>播一次</button>}
        </span>
      )}
      {hasScript && (
        <span className="pr-demo-step">
          <button className="btn small" title="从头播放这个演示用的流程演示（chk.demo）；A、B 两侧一起播" onClick={() => playDemoScript(script)}>▶ 重放流程演示</button>
        </span>
      )}
      {showSquint && (
        <span className="pr-demo-step">
          <button className={`btn small ${squintOn ? 'on' : ''}`} title="眯眼看：整屏（含 UI）模糊 + 半去色，只剩最显眼的几处——看层级对不对（顶栏诊断视图「眯眼」+「含 UI」）"
            onClick={() => setDemoSquint(!squintOn)}>眯眼看：{squintOn ? '开' : '关'}</button>
        </span>
      )}
      {showCvd && (
        <span className="pr-demo-step">
          <span className="pr-demo-step-label">色盲模拟</span>
          <select className="sel" value={cvd === 'auto' ? 'off' : cvd} title="整屏（含 UI）按色觉缺陷模拟（chk.cvd）；结束演示时关掉" onChange={(e) => useStore.getState().set('chk.cvd', e.target.value)}>
            {cvdOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </span>
      )}
    </div>
  );
}
