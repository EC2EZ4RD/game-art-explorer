import { useEffect } from 'react';
import { KNOW_TAB, useStore, type KnowKind } from '../../state/store';
import { useShell } from './shell';
import { SLOT } from './slots';

/*
 * 📖 学习层的外壳（轨道 B）：learnOpen 时挂轨道 C 的 LearnOverlay（src/ui/learn/LearnOverlay.tsx，覆盖左栏和中栏的大图网格），Esc 关掉。
 * 知识面板里点了别的原则 / 家族 / 复刻（store.openKnowledge）时自动打开到对应的页。
 * 整合修复（IB · X#13 / X#15）：C 上线前的过渡版（LearnFallback：原样搬过来的风格图谱 / 案例 / 感觉 / 场景页）删掉了——C 的学习库已经有这些页
 * （风格研究库、名作案例、感觉、环境、UI 原则、UI 风格家族、复刻对照、仅参考，开发者模式另有覆盖）；原来导出的 LEARN_TABS 只有过渡版自己用，跟着删掉。
 */
export function LearnLayer() {
  const open = useShell((s) => s.learnOpen);
  const set = useShell((s) => s.set);
  // 知识面板跳转：openKnowledge 改了 uiLeftTab / knowSel → 打开学习层到那一页
  useEffect(() => useStore.subscribe((st, prev) => {
    if (st.knowSel === prev.knowSel && st.uiLeftTab === prev.uiLeftTab) return;
    const kind = (Object.keys(KNOW_TAB) as KnowKind[]).find((k) => KNOW_TAB[k] === st.uiLeftTab);
    if (kind && (st.knowSel[kind] !== prev.knowSel[kind] || st.uiLeftTab !== prev.uiLeftTab)) useShell.getState().set({ learnOpen: true, learnTab: st.uiLeftTab });
  }), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input,textarea,select,.dialog')) set({ learnOpen: false }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, set]);
  const Overlay = SLOT.LearnOverlay;
  if (!open || !Overlay) return null;
  return <Overlay onClose={() => set({ learnOpen: false })} />;
}
