import { create } from 'zustand';

/*
 * ⓘ 弹窗的状态（轨道 B，§7：ExplainCard 删掉，改成参数行旁的 ⓘ 弹窗；也修掉「第一次聚焦后悬停就失效」）。
 * 任何参数行（A 的 ParamRow / UiParamRow 以后自己加 ⓘ 时也一样）调 openExplain(id, 按钮元素) 打开，再点一次或点外面关掉。
 */

interface ExplainState {
  id: string | null;
  /** 弹窗贴着的位置（视口坐标）：按钮的左边、上边、下边 */
  at: { x: number; top: number; bottom: number } | null;
  close: () => void;
}

export const useExplain = create<ExplainState>((set) => ({
  id: null,
  at: null,
  close: () => set({ id: null, at: null }),
}));

/** 打开某个参数的说明；同一个再点一次就关 */
export function openExplain(id: string, anchor?: Element | null) {
  const s = useExplain.getState();
  if (s.id === id) { s.close(); return; }
  const r = anchor?.getBoundingClientRect();
  // 弹窗放在右栏外面（左边），不盖住参数行本身
  const panel = anchor?.closest('.right')?.getBoundingClientRect();
  useExplain.setState({ id, at: r ? { x: panel ? panel.left : r.left, top: r.top, bottom: r.bottom } : null });
}
