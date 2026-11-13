/**
 * vite.config.ts 注入：本地参考截图目录是否存在（它们不入库）。
 * 克隆下来的仓库没有这些目录，开发服务器也按"没有截图"显示，不出现破图。
 * 生产构建一律是 false；tsx 单测里没有定义（typeof 判断后当作 false）。
 */
declare const __GAE_LOCAL_REFS__: {
  /** public/cases/：Steam 商店截图（scripts/cases/） */
  cases: boolean;
  /** qa/refs-cache/：UI 参考卡截图（scripts/refs/） */
  refs: boolean;
  /** qa/replicas/：复刻库的整帧渲染（开发时由 src/main.tsx 的 QA 钩子生成） */
  replicas: boolean;
};
