import { registerUiSystem } from '../hud/sys/register';
import { registerParams } from './registry';
import type { ParamDef } from './types';

/*
 * 被研究游戏的 UI 样本（不是探索工具自己的界面）。
 * 2026-10-14 起由 UI 参数体系接管（docs/survey/09-ui-param-system.md）：
 * register.ts 登记皮肤（hud.style，id 不变）、起点选择器和 260 个体系参数；这里只剩旧的"取色自色板"开关。
 */

const defs: ParamDef[] = [
  {
    id: 'hud.useSceneColors', dim: 'hud', group: '游戏 UI 样本', label: 'UI 取色自色板', kind: 'toggle', default: true, rebuild: 'none',
    explain: { plain: 'UI 的强调色、底色取自当前场景色板，检查两者是否协调。等同于"UI 取色来源 = 取自场景色板"（col.source 跟随时生效）。' },
    ui: { group: 'start', scope: 'start', tab: 'start', tier: 2, cls: 'resolve', random: false },
  },
];

registerUiSystem();
registerParams(defs);
