import { Activity, useEffect } from 'react';
import { useStore } from '../state/store';
import { setMode, setRail, useMode, useRail, useShell } from './stage/shell';
import { SLOT } from './stage/slots';

/*
 * 左栏（轨道 B 的外壳 + 插槽，docs/workbench-redesign.md §1.1 §3.3 §10 左栏去向表）：
 *   画面模式 → 配方图库（轨道 C 的 StyleGallery）；UI 模式 → 场景图库（轨道 D 的 SceneGallery）。
 *   两个图库自带标题行（名字、🎲 随机、▾ 锁定维度、🔒 保留我的改动、📌 钉住）和底栏；外壳只留贴边的收起把手。
 *   整合修复（IB · X#13）：C / D 上线前的两列卡片过渡版、外壳自己的标题行 / 底栏删掉了（插槽都已交付，走不到）。
 * 宽 288 展开 / 64 图标栏 / 0（专注）。两种模式各记一份开合（审查修复 4 / 17）：画面模式默认展开（首屏 = 配方图库），
 * UI 模式下选了场景收起一次（📌 钉住就不收）；第一次进 UI 模式时如果之前已经选过场景，也直接收起（画框直接是编辑尺寸，审查修复 27）。按 [ 手动收起 / 展开当前模式的。
 * 图标栏的按钮带字（配方 / 场景 / 学习），不只是图标。
 * 原来的知识页签（风格图谱、案例、感觉、UI 原则、UI 风格图谱、复刻库）搬进 📖 学习；覆盖进开发者模式。
 */
export function LeftRail() {
  const mode = useMode();
  const rail = useRail();
  const set = useShell((s) => s.set);
  useCollapseOnScenePick();
  if (rail) {
    return (
      <aside className="left is-rail">
        <button className="rail-btn" onClick={() => setRail(false)} title="展开左栏（[）">»</button>
        <button className={`rail-btn ${mode === 'art' ? 'on' : ''}`} onClick={() => { setMode('art'); set({ leftRail: false }); }} title="配方图库（画面模式）"><span className="rb-ico">🎨</span><span className="rb-txt">配方</span></button>
        <button className={`rail-btn ${mode === 'ui' ? 'on' : ''}`} onClick={() => { setMode('ui'); set({ uiRail: false }); }} title="场景图库（UI 模式）"><span className="rb-ico">🗺</span><span className="rb-txt">场景</span></button>
        <button className="rail-btn" onClick={() => set({ learnOpen: true })} title="学习：风格研究库、名作案例、UI 原则……"><span className="rb-ico">📖</span><span className="rb-txt">学习</span></button>
      </aside>
    );
  }
  const Styles = SLOT.StyleGallery, Scenes = SLOT.SceneGallery;
  return (
    <aside className="left">
      <button className="left-collapse" onClick={() => setRail(true)} title="收起左栏（[）">‹</button>
      <Activity mode={mode === 'art' ? 'visible' : 'hidden'}>
        <div className="scroll left-scroll">{Styles && <Styles />}</div>
      </Activity>
      <Activity mode={mode === 'ui' ? 'visible' : 'hidden'}>
        <div className="scroll left-scroll">{Scenes && <Scenes variant="rail" />}</div>
      </Activity>
    </aside>
  );
}

/**
 * UI 模式的左栏什么时候自动收起（只动 UI 模式那一份，画面模式的配方图库不受影响）：
 *   - UI 模式里换了场景（game.scene / 品类布局 / 内容包变了）：收成图标栏一次，画框放大到编辑尺寸（没钉住时）；
 *   - 这个标签页第一次进 UI 模式（uiRail 还没定）：之前已经选过场景（来源里有场景）就直接收起，没选过就展开场景图库（F2 第 1 步）。
 */
function useCollapseOnScenePick() {
  useEffect(() => {
    const decide = () => {
      const st = useStore.getState(), sh = useShell.getState();
      if (st.activeDim !== 'hud' || sh.uiRail !== null) return;
      sh.set({ uiRail: !sh.leftPinned && !!st.origin.scene });
    };
    decide();
    return useStore.subscribe((st, prev) => {
      if (st.activeDim === 'hud' && prev.activeDim !== 'hud') { decide(); return; }
      if (st.activeDim !== 'hud' || prev.activeDim !== 'hud') return;
      const keys = ['game.scene', 'uip.layout', 'cnt.pack'];
      if (!keys.some((k) => st.values[k] !== prev.values[k])) return;
      const sh = useShell.getState();
      if (!sh.leftPinned && !sh.uiRail) sh.set({ uiRail: true });
    });
  }, []);
}
