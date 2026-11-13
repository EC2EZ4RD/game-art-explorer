import { useMemo, type ReactNode } from 'react';
import { dropRecipe, resetAll, resetArt, resetScene, resetUiPos, resetUiStyle, resetUiToScene } from '../../state/actions';
import { layerTitle, screenPicked, tabCounts, uiPicked, type TabLayer } from '../../state/layers';
import { useStore } from '../../state/store';
import './shellBridge';
import './state.css';

/*
 * 重置菜单（轨道 A，docs/workbench-redesign.md §4.2）。只是菜单面板：按钮和浮层由外壳（B 的 TopBar / Pop）给。
 *   layer = 'all'（顶栏 重置▾）：重置画面 / 重置 UI / 重置场景 / 全部重新开始；
 *   layer = 'art' | 'ui' | 'scene'（层级标签的 ↺▾）：这一层的几种重置。
 * 数字 = 用户自己的改动数，与层级标签上的 ·N 一致（审查修复 19：元素位置按元素数，拖一次 = 1；场景另算「界面离开了局内」1 项，整合修复 U#22）；
 *   「不用配方」「全部重新开始」这类整层换掉的不写数字（写了也只是「会动几个参数」，和用户做了几件事对不上）。
 * 可点的条件 = 这一层有改动，或这一层的来源离开了默认（选了皮肤 / 风格词 / 成套、换了界面）：
 *   有改动时永不置灰、永不出现「(0)」（审查修复 4）。没东西可清的项灰掉，右边写「无改动」（审查修复 27）。每项 = 一步撤销，点完关菜单。
 */

const short = (s: string, n = 10) => (s.length > n ? `${s.slice(0, n)}…` : s);

function Item({ children, n, on, onClick, title, strong, sub }: { children: ReactNode; n?: number; on: boolean; onClick: () => void; title?: string; strong?: boolean; sub?: boolean }) {
  return (
    <button className={`st-item ${strong ? 'st-strong' : ''} ${sub ? 'st-sub' : ''}`} role="menuitem" disabled={!on} title={title} onClick={onClick}>
      <span className="st-label">{children}</span>
      {on ? (n ? <span className="st-n">{n}</span> : null) : <span className="st-dim">无改动</span>}
    </button>
  );
}

export function ResetMenu({ layer = 'all', onClose }: { layer?: TabLayer | 'all'; onClose?: () => void }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const info = useMemo(() => {
    const c = tabCounts(values, origin);
    const hasLook = !!origin.recipe || Object.keys(origin.layers.look).length > 0 || origin.overlays.length > 0;
    return {
      c,
      hasLook,
      uiOn: c.ui > 0 || uiPicked(origin),
      sceneOn: c.scene > 0 || screenPicked(origin),
      art: short(layerTitle('art', values, origin)),
      ui: short(layerTitle('ui', values, origin)),
      sceneName: short(layerTitle('scene', values, origin)),
    };
  }, [values, origin]);
  const act = (f: () => unknown) => () => { f(); onClose?.(); };
  const { c } = info;

  if (layer === 'art') {
    return (
      <div className="st-menu" role="menu" aria-label="重置画面">
        <div className="st-head">画面 · <b>{info.art}</b></div>
        <Item n={c.art} on={c.art > 0} onClick={act(resetArt)} strong title="画面微调全部回到配方原样（配方、场景、UI 不动）">{info.hasLook ? `回到「${info.art}」原样` : '撤掉画面微调'}</Item>
        {info.hasLook && <Item on onClick={act(dropRecipe)} title="配方和叠加都去掉：画面回到场景默认（画面微调一起清掉）">不用配方</Item>}
      </div>
    );
  }
  if (layer === 'ui') {
    return (
      <div className="st-menu" role="menu" aria-label="重置 UI">
        <div className="st-head">UI · <b>{info.ui}</b></div>
        <Item n={c.uiStyle} on={c.uiStyle > 0} onClick={act(resetUiStyle)} title="颜色、圆角、字体等手动改动回到皮肤的样子（皮肤、元素位置不动）">清样式改动</Item>
        <Item n={c.uiPos} on={c.uiPos > 0} onClick={act(resetUiPos)} title="元素的位置、大小、显隐、复制出来的第二份回到原样（样式、皮肤不动）">还原元素位置</Item>
        <Item n={c.ui} on={info.uiOn} onClick={act(resetUiToScene)} strong title="皮肤、风格词和所有 UI 改动一起清掉，回到场景自带的 UI">回到场景默认 UI</Item>
      </div>
    );
  }
  if (layer === 'scene') {
    return (
      <div className="st-menu" role="menu" aria-label="重置场景">
        <div className="st-head">场景 · <b>{info.sceneName}</b></div>
        <Item n={c.scene} on={info.sceneOn} onClick={act(resetScene)} strong title="种子、镜头、布局、内容包回到场景原样，界面回到第一个（环境、画面、皮肤不动）">回到场景原样</Item>
      </div>
    );
  }
  return (
    <div className="st-menu" role="menu" aria-label="重置">
      <Item n={c.art} on={c.art > 0} onClick={act(resetArt)} title={`画面微调回到「${info.art}」原样`}>重置画面</Item>
      <Item n={c.ui} on={info.uiOn} onClick={act(resetUiToScene)} title="回到场景默认 UI：皮肤、风格词、UI 改动都清掉">重置 UI</Item>
      <Item n={c.scene} on={info.sceneOn} onClick={act(resetScene)} title="种子、镜头、布局、界面回到场景原样">重置场景</Item>
      <div className="st-sep" />
      <Item on onClick={act(resetAll)} strong title="回到第一次打开时的样子（画面模式），视图（缩放、诊断、A 槽…）也复位；收藏、方向板、我的游戏保留。可以撤销">全部重新开始</Item>
    </div>
  );
}

/** 顶栏用的完整按钮（按钮 + 浮层）：外壳没有自己的弹出菜单时可以直接挂这个 */
export function ResetButton({ layer = 'all', label = '重置▾' }: { layer?: TabLayer | 'all'; label?: ReactNode }) {
  return (
    <details className="st-dd">
      <summary className="btn ghost">{label}</summary>
      <div className="st-dd-pop">
        <ResetMenu layer={layer} onClose={() => document.querySelectorAll('details.st-dd[open]').forEach((d) => d.removeAttribute('open'))} />
      </div>
    </details>
  );
}
