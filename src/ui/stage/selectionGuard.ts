import { useEffect } from 'react';
import type { Values } from '../../dims/types';
import { SELECTORS } from '../../hud/sys/register';
import { resolveUi } from '../../hud/sys/resolve';
import type { Origin } from '../../state/layers';
import { useStore } from '../../state/store';
import { onHudDraw } from './hudInfo';
import { modeOf } from './shell';

/*
 * 元素选中的守卫（轨道 B2 审查修复 10）：选中的元素这一屏没有了，就取消选中。
 * 原来换界面（局内 → 装备）、换场景以后 store.hudSel 还留着上一屏的元素：右栏一直是它的检查器（显示 ☐，看起来像被藏了），
 * 本屏元素列表和 UI 面板藏在「‹」后面，Delete / 方向键还在改这个看不见的元素。
 *   - 换界面（uip.screen、来源的界面）、换场景（game.scene、来源的场景）：直接取消选中（任何模式）；
 *   - UI 模式下 HUD 每重画一次核一遍：整屏界面（不按元素排版、但画出了东西）上没有元素可选 → 取消；
 *     按元素排版时，选中的元素既没画出来、也不在这一屏的元素清单里 → 取消（刚从「+ 元素」加进来、还没画到的不算）。
 *   UI A/B 开着时不按「整屏界面」取消（分界拖到只看 A 时当前一侧没画，不等于这一屏没有这个元素）。
 * 挂在舞台上（Stage.tsx，两种模式都在），不依赖编辑层开没开。
 */

/** 「这一屏」是哪一屏：界面选择 + 场景（任一项变了就算换屏） */
export const screenContextOf = (s: { values: Values; origin: Origin }) =>
  `${String(s.values[SELECTORS.screen] ?? 'auto')}|${String(s.values['game.scene'] ?? '')}|${s.origin.scene ?? ''}|${s.origin.screen ?? ''}`;

export function useSelectionGuard() {
  useEffect(() => {
    const unsub = useStore.subscribe((s, p) => {
      if (s.values === p.values && s.origin === p.origin) return;
      if (s.hudSel && screenContextOf(s) !== screenContextOf(p)) s.setHudSel(null);
    });
    const off = onHudDraw((info) => {
      const st = useStore.getState();
      const id = st.hudSel;
      if (!id || modeOf(st.activeDim) !== 'ui' || !info.drawn) return;
      if (!info.usesElements) {
        if (!st.hudABOn) st.setHudSel(null);
        return;
      }
      if (info.hitIds.has(id) || resolveUi(st.values).elements().includes(id)) return;
      st.setHudSel(null);
    });
    return () => { unsub(); off(); };
  }, []);
}
