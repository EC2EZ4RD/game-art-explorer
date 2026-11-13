import type { Cond, Raw } from './spec';

/*
 * 数据式条件（docs/survey/09-ui-param-system.md 1.4 节）：
 * {p, in:[…]} | {p, notIn:[…]} | {p, has:x} | {p, hasAny:[…]} | {p, empty:true} | {p, gt|lt|eq:n} | {all} | {any} | {not}
 * p 以 @ 开头指同一元素的模板参数（ctx.element 给出元素 id）。值是 auto / 未定时结果为"未知"（undefined），未知不算违例。
 */

export type Getter = (key: string) => Raw | undefined;
/**
 * 一个控制参数的全部取值（中期审查修复 ㉒）：按目标写的参数（cmp.gauge@el.speed = tachometer、vis.pattern@slot = dither）的从属参数，
 * 条件按「全局值或任何一个 <参数>@<目标> 满足」算——原来只看全局值，全局是 bar / none 时把真的会生效的从属参数判成不生效。没有作用域键时 undefined（只看 get）
 */
export type AllGetter = (key: string) => (Raw | undefined)[] | undefined;

const asList = (v: Raw | undefined): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? (v === '' ? [] : v.split(',')) : v === undefined || v === null ? [] : [String(v)]);
const unknown = (v: Raw | undefined) => v === undefined || v === null || v === 'auto';

/** true / false / undefined（未知） */
export function evalCond(c: Cond | null | undefined, get: Getter, element?: string, all?: AllGetter): boolean | undefined {
  if (!c) return undefined;
  if (c.all) {
    let unk = false;
    for (const x of c.all) {
      const r = evalCond(x, get, element, all);
      if (r === false) return false;
      if (r === undefined) unk = true;
    }
    return unk ? undefined : true;
  }
  if (c.any) {
    let unk = false;
    for (const x of c.any) {
      const r = evalCond(x, get, element, all);
      if (r === true) return true;
      if (r === undefined) unk = true;
    }
    return unk ? undefined : false;
  }
  if (c.not) {
    const r = evalCond(c.not, get, element, all);
    return r === undefined ? undefined : !r;
  }
  if (!c.p) return true;
  const key = c.p.startsWith('@') ? (element ? `${element}.${c.p.slice(1)}` : c.p.slice(1)) : c.p;
  // 有按目标的取值时逐个算：有一个成立就成立，全都不成立才不成立，其余未知
  const vs = all?.(key);
  if (vs && vs.length > 1) {
    let unk = false;
    for (const v of vs) { const r = leaf(c, v); if (r === true) return true; if (r === undefined) unk = true; }
    return unk ? undefined : false;
  }
  return leaf(c, get(key));
}
/** 叶子条件对一个取值 */
function leaf(c: Cond, v: Raw | undefined): boolean | undefined {
  if (c.empty !== undefined) {
    if (unknown(v)) return undefined;
    return (asList(v).length === 0) === c.empty;
  }
  if (unknown(v)) return undefined;
  if (c.in) return c.in.map(String).includes(String(v)) || (Array.isArray(v) && v.some((x) => c.in!.map(String).includes(String(x))));
  if (c.notIn) return !c.notIn.map(String).includes(String(v));
  if (c.has !== undefined) return asList(v).includes(String(c.has));
  if (c.hasAny) return asList(v).some((x) => c.hasAny!.map(String).includes(x));
  const n = Number(v);
  if (c.gt !== undefined) return n > c.gt;
  if (c.lt !== undefined) return n < c.lt;
  if (c.eq !== undefined) return typeof c.eq === 'number' ? n === c.eq : String(v) === String(c.eq);
  return true;
}

/** 条件的白话说明（参数行"不生效：…"） */
export function condText(c: Cond, label: (id: string) => string, opt: (id: string, v: Raw) => string): string {
  if (c.all) return c.all.map((x) => condText(x, label, opt)).join(' 且 ');
  if (c.any) return c.any.map((x) => condText(x, label, opt)).join(' 或 ');
  if (c.not) return `不满足（${condText(c.not, label, opt)}）`;
  if (!c.p) return '';
  const name = label(c.p.replace(/^@/, 'elx.'));
  const list = (xs: Raw[]) => xs.map((x) => opt(c.p!.replace(/^@/, 'elx.'), x)).join(' / ');
  if (c.in) return `${name} = ${list(c.in)}`;
  if (c.notIn) return `${name} ≠ ${list(c.notIn)}`;
  if (c.has !== undefined) return `${name} 含 ${opt(c.p, c.has)}`;
  if (c.hasAny) return `${name} 含 ${list(c.hasAny)} 之一`;
  if (c.empty !== undefined) return c.empty ? `${name} 为空` : `${name} 不为空`;
  if (c.gt !== undefined) return `${name} > ${c.gt}`;
  if (c.lt !== undefined) return `${name} < ${c.lt}`;
  if (c.eq !== undefined) return `${name} = ${opt(c.p, c.eq as Raw)}`;
  return name;
}

export { asList };
