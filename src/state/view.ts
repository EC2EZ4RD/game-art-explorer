import { getParam } from '../dims/registry';
import type { Values } from '../dims/types';
import { resetKeys as resetKeysAction } from './actions';
import { layerOfKey, layerTitle, modifiedKeysOf, tabCounts, tabOf, type Origin, type TabLayer } from './layers';
import { useStore, viewKeys, type Preview } from './store';
import { registerKeepMine, registerViewReset } from './viewHooks';

/*
 * 视图状态与给外壳（轨道 B）的接口（轨道 A，docs/workbench-redesign.md §4.3）。
 * B 的 src/ui/stage/slots.ts 用 layerFn(名字) 在 layers.ts / view.ts 里按名字找函数，这里的导出名字与签名照 B 的约定：
 *   layerCounts(st) → { scene, art, ui }          三个层级标签上的数（st 没带 origin 时用 store 当前的；场景另算「界面离开了局内」1 项，整合修复 U#22）
 *   modifiedKeys(layer, st) → string[]             某一层改过的键
 *   viewValues() → Values | null                   叠在 values 上交给引擎的值（知识面板「试一下」的预览）；没有时 null
 *   resetKeys(keys, label)                         一组键回到基线（右栏行 / 组 ↺）
 * 视图键（chk.* 检查工具）本身还在 values 里，所以 viewValues 不用再叠它们。
 * 外壳登记：registerKeepMine(读「保留我的改动」开关)、registerViewReset(名字, 重置视图时跑的函数)。
 */

export { registerKeepMine, registerViewReset };

interface StoreLike { values: Values; origin?: Origin }
const originOf = (st?: StoreLike | null): Origin => st?.origin ?? useStore.getState().origin;
const valuesOf = (st?: StoreLike | null): Values => st?.values ?? useStore.getState().values;

/** 三个层级标签上的数（另带 uiStyle / uiPos / total / screen）：场景 = 场景键的改动 + 界面离开了第一个界面（layers.tabCounts） */
export function layerCounts(st?: StoreLike | null): Record<TabLayer, number> & { uiStyle: number; uiPos: number; total: number; screen: number } {
  return tabCounts(valuesOf(st), originOf(st));
}

/** 某一层改过的键（layer = 'scene' | 'art' | 'ui'） */
export function modifiedKeys(layer: TabLayer, st?: StoreLike | null): string[] {
  const o = originOf(st);
  return modifiedKeysOf(valuesOf(st), o).filter((k) => tabOf(layerOfKey(k, o)) === layer);
}

/** 三个层级标签上的名字（场景 / 配方 / 皮肤） */
export function layerTitles(st?: StoreLike | null): Record<TabLayer, string> {
  const v = valuesOf(st), o = originOf(st);
  return { scene: layerTitle('scene', v, o), art: layerTitle('art', v, o), ui: layerTitle('ui', v, o) };
}

let pvCache: { p: Preview; out: Values } | null = null;
/** 预览：把 set / unset 叠成一张表（unset = 回到默认 / 跟随） */
export function previewValues(p: Preview | null): Values | null {
  if (!p) return null;
  if (pvCache && pvCache.p === p) return pvCache.out;
  const out: Values = {};
  for (const k of p.unset) out[k] = getParam(k)?.default ?? 'auto';
  Object.assign(out, p.set);
  pvCache = { p, out };
  return out;
}

/** 叠在 values 上交给引擎的视图值（B 的 engineFeed 每次喂引擎时调）：现在只有知识面板的预览 */
export function viewValues(): Values | null {
  return previewValues(useStore.getState().preview);
}

/** 一组键回到基线（B 的右栏行 / 组 ↺ 用；只占一步撤销） */
export function resetKeys(keys: string[], label?: string) {
  return resetKeysAction(keys, label);
}

/** 现在开着的检查工具（视图键里不是默认值的） */
export function activeViewKeys(): string[] {
  const v = useStore.getState().values;
  return viewKeys().filter((k) => v[k] !== undefined && v[k] !== getParam(k)?.default);
}
