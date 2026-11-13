import type { ComponentType } from 'react';

/*
 * 外壳的插槽（轨道 B，docs/workbench-redesign.md §11.0：共享挂载点由 B 挂，其他轨道只交付组件和函数）。
 * 用 import.meta.glob 按路径"找得到才用"：文件不存在时 glob 返回空表，构建照常通过；文件一出现，Vite 会让本模块失效重载，插槽自动换成真的组件。
 * 整合修复（IB · X#13 / X#14）：各槽都已交付，外壳的过渡版删了（找不到时什么也不挂）；C 把知识面板搬进 src/ui/learn/ 以后留下的旧路径转发桩
 * （src/ui/hud/{DemoBanner,PrinciplesPanel,ReplicaPanel,UiAtlasPanel}.tsx、src/ui/{StyleAtlas,CaseLibrary}.tsx）删掉，这里只找新路径；
 * 只有过渡版学习层用过的 StyleAtlas / CaseLibrary / PrinciplesPanel / UiAtlasPanel / ReplicaPanel 槽也去掉（C 的学习库自己 import 它们）。
 */

const MODS = import.meta.glob([
  // A：重置菜单、历史列表
  '../state/ResetMenu.tsx', '../state/HistoryMenu.tsx',
  // C：配方图库、配方卡、学习库（以及要搬进 learn/ 的老面板）
  '../left/StyleGallery.tsx', '../deck/StyleDeck.tsx', '../learn/LearnOverlay.tsx', '../learn/PreviewBar.tsx',
  '../learn/DemoBanner.tsx', '../learn/CaseLibrary.tsx', '../learn/ParamWhy.tsx',
  // D：场景图库、界面胶片、皮肤色板、首屏条
  '../scene/SceneGallery.tsx', '../scene/Filmstrip.tsx', '../scene/SkinSwatches.tsx', '../scene/FirstRunStrip.tsx',
], { eager: true }) as Record<string, Record<string, unknown>>;

/** 按路径顺序找第一个有这个导出的模块 */
function pick<T>(paths: string[], name: string): T | undefined {
  for (const p of paths) {
    const m = MODS[p];
    if (m && m[name] !== undefined) return m[name] as T;
  }
  return undefined;
}

type AnyComp = ComponentType<any>;

/** 插槽里能放的组件（找不到 = undefined，调用方什么也不挂） */
export const SLOT = {
  /** A：顶栏「重置▾」与层级标签的 ↺▾ 菜单。期望 props：{ layer?: 'art' | 'ui' | 'scene' | 'all'; onClose?: () => void } */
  ResetMenu: pick<AnyComp>(['../state/ResetMenu.tsx'], 'ResetMenu'),
  /** A：↶▾ 带标签的历史列表。期望 props：{ onClose?: () => void } */
  HistoryMenu: pick<AnyComp>(['../state/HistoryMenu.tsx'], 'HistoryMenu'),
  /** C：画面模式的左栏（配方图库） */
  StyleGallery: pick<AnyComp>(['../left/StyleGallery.tsx'], 'StyleGallery'),
  /** C：画面模式的画框下方（配方卡）。期望 props：{ oneRow?: boolean } */
  StyleDeck: pick<AnyComp>(['../deck/StyleDeck.tsx'], 'StyleDeck'),
  /** C：📖 学习。期望 props：{ onClose: () => void } */
  LearnOverlay: pick<AnyComp>(['../learn/LearnOverlay.tsx'], 'LearnOverlay'),
  /** C：知识面板「试一下」的预览条（§4.3「栏条显示 预览：X · 采用 · 取消」）。期望 props：{ compact?: boolean } */
  PreviewBar: pick<AnyComp>(['../learn/PreviewBar.tsx'], 'PreviewBar'),
  /** D：UI 模式的左栏（场景图库）；顶栏场景标签的弹窗也用它，props：{ variant?: 'rail' | 'popover'; onPicked?: () => void } */
  SceneGallery: pick<AnyComp>(['../scene/SceneGallery.tsx'], 'SceneGallery'),
  /** D：UI 模式画框下方的界面胶片。期望 props：{ oneRow?: boolean } */
  Filmstrip: pick<AnyComp>(['../scene/Filmstrip.tsx'], 'Filmstrip'),
  /** D：UI 模式画框下方的皮肤色板行 */
  SkinSwatches: pick<AnyComp>(['../scene/SkinSwatches.tsx'], 'SkinSwatches'),
  /** D：首屏「你的游戏更像哪种？」条（画面模式画框下方，最上面） */
  FirstRunStrip: pick<AnyComp>(['../scene/FirstRunStrip.tsx'], 'FirstRunStrip'),
  // ---- C 的知识面板（src/ui/learn/） ----
  /** 原则演示的提示条（画框下方）与 A / B 分界柄（画框里） */
  DemoBanner: pick<AnyComp>(['../learn/DemoBanner.tsx'], 'DemoBanner'),
  AbSplitHandle: pick<AnyComp>(['../learn/DemoBanner.tsx'], 'AbSplitHandle'),
  /** 案例详情弹窗（App 根部） */
  CaseDialog: pick<AnyComp>(['../learn/CaseLibrary.tsx'], 'CaseDialog'),
  /** 元素检查器「更多」里的依据 */
  ElementWhy: pick<AnyComp>(['../learn/ParamWhy.tsx'], 'ElementWhy'),
};

// 不自接受热更新：glob 命中新文件时要让引用方（组件）重新取 SLOT
