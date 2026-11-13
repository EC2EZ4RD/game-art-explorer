import { isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { useStore } from '../../state/store';
import { useShell } from '../stage/shell';

/*
 * 知识面板「试一下 / 套用这个做法 / 套用家族」的临时预览（轨道 C，docs/workbench-redesign.md §4.3）。
 * 用轨道 A 的 store.preview：预览值叠在 values 上交给引擎（B 的 engineFeed），不存、不进撤销；
 * 「采用」= adoptPreview()（写成普通改动，带 •、可以重置、一步撤销）；「取消」= setPreview(null)。
 * 采用 / 取消的按钮：学习库里由 LearnOverlay 收成画框下方的一条（PreviewBar）；右栏的 ⓘ 弹窗里就地显示。
 */

export function startPreview(set: Values, unset: string[], label: string) {
  useStore.getState().setPreview({ set, unset, label });
  // 预览的是 UI：画面模式下 HUD 默认藏着（👁UI 关），不打开就什么也看不到
  if ([...Object.keys(set), ...unset].some(isUiKey)) useShell.getState().set({ hudInArt: true });
}
export const adoptPreview = () => useStore.getState().adoptPreview();
export const cancelPreview = () => useStore.getState().setPreview(null);
/** 现在的预览是不是这一个（按名字认） */
export const usePreviewing = (label?: string | null) => useStore((s) => !!s.preview && (label == null || s.preview.label === label));
