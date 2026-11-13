import { useMemo } from 'react';
import type { Values } from '../../dims/types';
import { viewValues } from '../../state/view';
import { useStore } from '../../state/store';

/*
 * 画框 / 栏条该按哪份参数算设备比例和 HUD 大小：引擎拿到的那份（values ⊕ A 的 viewValues = 知识面板的预览；B2 审查修复 ③）。
 * 拖动的临时值只动元素键、画面模式藏 HUD 只盖 hud.style，都不影响画幅和 unitK，这里不叠。没有预览时就是 store 的 values（同一个对象）。
 * 整合修复（IB · X#15）：原来写在 StageBar.tsx 里，组件文件导出 hook 会让 Fast Refresh 判不了边界（改栏条就整页刷新），挪到这个 .ts。
 */
export function useShownValues(): Values {
  const values = useStore((s) => s.values);
  const preview = useStore((s) => s.preview);
  return useMemo(() => {
    void preview;
    const v = viewValues();
    return v && Object.keys(v).length ? { ...values, ...v } : values;
  }, [values, preview]);
}
