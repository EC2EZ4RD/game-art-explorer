import type { Engine } from '../engine/Engine';

/*
 * 当前挂载的渲染引擎（T0，docs/workbench-redesign.md §11.0）。
 * 原来 getEngine 写在 Viewport.tsx 里：组件文件导出非组件，Fast Refresh 判不了边界，改 Viewport 就整页刷新。
 * 现在单独放一个 .ts：舞台的画框（src/ui/stage/Frame.tsx，轨道 B 把 Viewport 拆进了 src/ui/stage/*）挂载时 setEngine(engine)、卸载时 setEngine(null)，
 * 其他地方只读 getEngine()。改 Frame.tsx 热替换时引擎会随组件重建，这里的引用跟着换，不会留下已释放的旧实例。
 * （整合 IB · X#14：只剩转发的 Viewport.tsx 已删。）
 */

let engineRef: Engine | null = null;

/** 当前的引擎；画框还没挂上或已卸载时是 null */
export const getEngine = (): Engine | null => engineRef;

/** 只给画框（Frame.tsx）用：挂载时登记，卸载时清掉 */
export const setEngine = (engine: Engine | null): void => {
  engineRef = engine;
};
