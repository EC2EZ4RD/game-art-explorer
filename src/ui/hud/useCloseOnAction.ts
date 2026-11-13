import { useEffect } from 'react';
import { useStore } from '../../state/store';

/*
 * 大窗：点了会改画面的按钮就关掉，让视口露出来。
 * T0（docs/workbench-redesign.md §11.0）：原来写在 KnowledgeBits.tsx 里，组件文件导出 hook 会让 Fast Refresh 退回整页刷新，所以挪到这里。
 */

/**
 * 大窗（dialog-mask）盖住了整个视口与右栏：里面点了套用 / 演示 / 参数跳转 / 截图对照之后，结果都在被盖住的地方，
 * 所以这些动作一发生就关掉大窗（store 的 lastChange / hudDemo / uiJump / refImage / hudABOn 变了）。
 */
export function useCloseOnAction(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    return useStore.subscribe((s, p) => {
      if (s.lastChange !== p.lastChange || s.hudDemo !== p.hudDemo || s.uiJump !== p.uiJump || s.refImage !== p.refImage || s.hudABOn !== p.hudABOn) close();
    });
  }, [open, close]);
}
