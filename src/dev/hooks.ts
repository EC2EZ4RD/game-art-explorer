/*
 * 开发钩子 window.__gae 的登记函数（T0，docs/workbench-redesign.md §11.0；约定见同目录 README.md）。
 * src/main.tsx 用 import.meta.glob('./dev/*.ts', { eager: true }) 一次性引入本目录所有 .ts，
 * 各轨道把自己的钩子写在 src/dev/<轨道>.ts，不再改 main.tsx。
 *
 * 加载顺序：glob 引入会被提升到 main.tsx 最前面，所以本目录的文件先于 main.tsx 里的老钩子执行。
 *   devHooks()     ——轨道文件用：同名键直接覆盖（热替换后重新登记，用新的）；
 *   devHooksBase() ——main.tsx 的老钩子用：只补还没有的键，轨道文件里同名的新钩子优先。
 * 两个函数只在开发环境有意义；调用方自己包 if (import.meta.env.DEV)，生产构建会把整段删掉。
 */

export type DevHooks = Record<string, unknown>;

function ns(): DevHooks {
  const w = window as unknown as { __gae?: DevHooks };
  if (!w.__gae) w.__gae = {};
  return w.__gae;
}

/** 登记一组钩子到 window.__gae：同名的覆盖。返回整个 __gae 对象 */
export function devHooks(entries: DevHooks): DevHooks {
  return Object.assign(ns(), entries);
}

/** 登记一组「底层」钩子：已有同名键时保留已有的（让轨道文件能替换 main.tsx 里的老钩子） */
export function devHooksBase(entries: DevHooks): DevHooks {
  const o = ns();
  for (const [k, v] of Object.entries(entries)) if (!(k in o)) o[k] = v;
  return o;
}
