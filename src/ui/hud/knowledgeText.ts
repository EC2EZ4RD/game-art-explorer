import { getParam, optionOf } from '../../dims/registry';
import { baseKeyOf } from '../../content/uiKnowledge';
import { uiKeyLabel } from '../../hud/sys/register';

/*
 * 参数的可读名字与取值（参数小标签、参数行的"依据"、"套用会改什么"共用）。
 * T0（docs/workbench-redesign.md §11.0）：原来写在 KnowledgeBits.tsx 里，组件文件导出非组件会让 Fast Refresh 退回整页刷新，所以挪到这里。
 */

/** 参数名：登记过的参数用 label，覆盖键 / 元素实例键用"元素 · 参数"的拼法 */
export const paramLabel = (id: string): string => getParam(id)?.label ?? uiKeyLabel(id) ?? id;

/** 一个取值的可读写法：选项取 label（覆盖键 / 元素实例键按它的模板参数查）、多选用顿号连、开关写开 / 关、数字带单位 */
export function paramValueText(id: string, value: unknown): string {
  const p = getParam(id) ?? getParam(baseKeyOf(id));
  const one = (x: unknown): string => {
    const s = String(x);
    if (p) { const o = optionOf(p, s); if (o) return o.label; }
    if (typeof x === 'boolean' || ((s === 'true' || s === 'false') && p?.kind === 'toggle')) return s === 'true' ? '开' : '关';
    const n = Number(x);
    if (typeof x === 'number' || (s !== '' && !Number.isNaN(n) && (p?.kind === 'range' || p?.kind === 'int'))) return `${Number.isInteger(n) ? n : +n.toFixed(2)}${p?.unit ?? ''}`;
    return s === 'auto' ? '跟随' : s;
  };
  if (Array.isArray(value)) return value.length ? value.map(one).join('、') : '无';
  if (p?.kind === 'multi' && typeof value === 'string') return value ? value.split(',').map(one).join('、') : '无';
  return one(value);
}
