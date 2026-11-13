/*
 * UI 起点页的「常用十项」（T0，docs/workbench-redesign.md §11.0）：原来写在 UiPanel.tsx 里，
 * 组件文件导出非组件会让 Fast Refresh 退回整页刷新，所以挪到这里。新方案里它们进 UI「常用」组（§5.4）。
 */

/** 起点页的十个旋钮（docs/survey/09-ui-param-system.md 第 7 节） */
export const STARTER_KNOBS = [
  'cnt.density', 'vis.corner', 'vis.stroke', 'vis.strokeWidth', 'vis.depth', 'vis.ornament',
  'col.lightness', 'col.accent', 'typ.body.family', 'typ.display.family', 'mo.juice',
];
