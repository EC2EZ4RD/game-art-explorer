import { stopFlow } from '../../hud/flow';
import { setLastGate } from '../../state/persist';
import { registerKeepMine, registerViewReset } from '../../state/viewHooks';
import { useShell } from '../stage/shell';

/*
 * 把外壳（B 的 shell.ts）接到 A 的动作上（轨道 A）：
 *   「保留我的改动」开关 → 套用函数的默认 keepMine；
 *   重置视图 → 缩放回到适应、专注关、画面模式下隐藏 HUD、平移归零；全部重新开始时再停掉流程演示、
 *     「回画面模式时回到哪一维」也回到首屏的 world（审查修复 13：全部重新开始 = 回到首屏的画面模式）；
 *   上次会话（gae.last.v2）只由用户在用的标签页写：QA / 被 __gae 钩子驱动的标签页不写（审查修复 26）。
 * 只在浏览器里引入（ResetMenu.tsx 引它）；B 以后若在 shell.ts 里自己登记，同名 'shell' 会覆盖这里，删掉本文件即可。
 */

registerKeepMine(() => useShell.getState().keepMine);
registerViewReset('shell', (kind) => {
  useShell.getState().set({ zoom: 'fit', focus: false, hudInArt: false, pan: { x: 0, y: 0 }, ...(kind === 'all' ? { lastArtDim: 'world' as const } : {}) });
  if (kind === 'all') stopFlow();
});
setLastGate(() => !useShell.getState().qa);
