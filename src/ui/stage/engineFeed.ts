import type { Values } from '../../dims/types';
import { viewValues } from '../../state/view';

/*
 * 交给引擎的参数（轨道 B，docs/workbench-redesign.md §4.3 §6「拖动流畅」）：
 *   engine.apply({ ...values, ...view, ...draft })
 *   - values：store 里的实验参数；
 *   - view：A 的 src/state/view.ts 的 viewValues（知识面板「试一下」的临时预览），没有时为空；
 *   - 画面模式隐藏 HUD（👁UI 关）时盖上 hud.style = none——只影响画面，不进参数、不进撤销；
 *   - draft：画布上拖动 / 缩放元素时的临时值，按 rAF 合成，松手时一次 store.patch 提交。
 * 没有任何叠加时直接用 store 的 values 对象（引用不变，resolveUi 的单槽缓存和面板共用）。
 */

let draft: Values | null = null;
const listeners = new Set<() => void>();

/** 设置 / 清掉临时值（拖动中每次 pointermove 调；引擎在下一帧前合成） */
export function setDraft(d: Values | null) {
  draft = d && Object.keys(d).length ? d : null;
  listeners.forEach((f) => f());
}
export const getDraft = () => draft;
export function onDraftChange(f: () => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

/** 最近一次交给引擎时带的临时值、以及当时 HUD 的绘制序号：编辑层据此判断命中框是不是已经画的是这份临时值 */
let fed: { draft: Values | null; serial: number } = { draft: null, serial: -1 };
export function markFed(serial: number) { fed = { draft, serial }; }
export const getFed = () => fed;

let cache: { v: Values; hide: boolean; d: Values | null; view: Values | null; out: Values } | null = null;

/** 引擎这一帧该用的参数 */
export function engineValues(values: Values, hideHud: boolean): Values {
  let view: Values | null = viewValues();
  if (view && !Object.keys(view).length) view = null;
  if (cache && cache.v === values && cache.hide === hideHud && cache.d === draft && cache.view === view) return cache.out;
  const out = !hideHud && !draft && !view ? values : { ...values, ...(view ?? {}), ...(draft ?? {}), ...(hideHud ? { 'hud.style': 'none' } : {}) };
  cache = { v: values, hide: hideHud, d: draft, view, out };
  return out;
}
