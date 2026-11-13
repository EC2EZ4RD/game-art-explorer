import { create } from 'zustand';

/*
 * UI 面板（UiPanel）停在哪一组 / 哪一小节、「更多参数」开没开（轨道 D，docs/workbench-redesign.md §7「UiPanel 的状态提到 store」）。
 * 切模式、选中元素（外壳把面板藏起来）、热更新都不丢；每个标签页一份（sessionStorage），刷新也还在。本文件不放组件（Fast Refresh）。
 */

export type UiGroup = 'common' | 'look' | 'content' | 'motion' | 'more';
export type UiMoreSub = 'components' | 'world' | 'player' | 'ops' | 'tools';

/** 5 组（§7 右栏分组：常用 / 外观 / 内容 / 动效 / 更多） */
export const UI_GROUPS: { id: UiGroup; label: string; tip: string }[] = [
  { id: 'common', label: '常用', tip: '感觉微调 + 常用十项' },
  { id: 'look', label: '外观', tip: '形、线、面、饰、色彩、字体、素材槽' },
  { id: 'content', label: '内容', tip: '这一屏显示什么、怎么排、信息元素、版式' },
  { id: 'motion', label: '动效', tip: '动效与演出、交互、流程' },
  { id: 'more', label: '更多', tip: '组件 · 世界 · 无障碍 · 运营 · 工具' },
];
export const UI_MORE_SUBS: { id: UiMoreSub; label: string; tip?: string }[] = [
  { id: 'components', label: '组件' },
  { id: 'world', label: '世界', tip: '情境与载体、与世界的关系' },
  { id: 'player', label: '无障碍', tip: '玩家选项与无障碍叠加' },
  { id: 'ops', label: '运营', tip: '运营与商业化：参数照常可调，不再扩充' },
  { id: 'tools', label: '工具', tip: '检查与展示工具（常用的几项也在栏条的 视图▾ 里）' },
];

/** 参数表的页签（ui.tab）→ 新的组 / 小节 */
export function groupOfTab(tab: string | undefined): { group: UiGroup; sub?: UiMoreSub } {
  switch (tab) {
    case 'look': return { group: 'look' };
    case 'content': case 'elements': return { group: 'content' };
    case 'motion': return { group: 'motion' };
    case 'components': return { group: 'more', sub: 'components' };
    case 'world': return { group: 'more', sub: 'world' };
    case 'player': return { group: 'more', sub: 'player' };
    case 'ops': return { group: 'more', sub: 'ops' };
    case 'tools': return { group: 'more', sub: 'tools' };
    default: return { group: 'common' };
  }
}

interface PanelState {
  group: UiGroup;
  sub: UiMoreSub;
  /** 各组的「更多参数」（tier 3）开着没有 */
  more: Partial<Record<UiGroup, boolean>>;
  onlyChanged: boolean;
  godotOnly: boolean;
  set: (p: Partial<Omit<PanelState, 'set'>>) => void;
}

const KEY = 'gae.uiPanel.v1';
function load(): Partial<PanelState> {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Partial<PanelState>; } catch { return {}; }
}

export const useUiPanel = create<PanelState>((set, get) => ({
  group: 'common', sub: 'components', more: {}, onlyChanged: false, godotOnly: false,
  ...load(),
  set: (p) => {
    set(p);
    const { group, sub, more, onlyChanged, godotOnly } = get();
    try { sessionStorage.setItem(KEY, JSON.stringify({ group, sub, more, onlyChanged, godotOnly })); } catch { /* 存不了就只留在内存 */ }
  },
}));
