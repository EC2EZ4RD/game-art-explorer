import { getParam } from '../../dims/registry';
import type { Val, Values } from '../../dims/types';
import { wantsElements } from '../../hud/compose/hud';
import { wantsMenu } from '../../hud/compose/menu';
import { baseId, instanceNo, SELECTORS } from '../../hud/sys/register';
import { resolveUi, type Resolved } from '../../hud/sys/resolve';
import { SPEC } from '../../hud/sys/spec';
import type { Theme } from '../../hud/sys/theme';
import * as actions from '../../state/actions';
import { baseValues, isModifiedKey, type Origin } from '../../state/layers';
import { useStore } from '../../state/store';

/*
 * 画布编辑用的元素工具（轨道 B，docs/workbench-redesign.md §6）：名字、锚点九宫格、元素的键、拖动换算。
 * 坐标约定：命中框（engine.hud.hits）是画框里的 CSS 像素；偏移 elx.offsetX / offsetY 是屏宽 / 屏高的百分比（compose/hud.ts 的 M12a-18），
 * 所以拖动换成偏移只要除以画框宽高，跟 unitK 无关；大小 elx.scale 是倍数。
 * 「改过没有」「已隐藏」「还原」都按轨道 A 的来源基线算（state/layers.ts 的 baseValues / isModifiedKey、actions.resetElement；审查修复 2 / 5）：
 * 名作 / 场景套用后基线里本来就有的锚点、元素清单不算改动。
 */

const LABELS = new Map((SPEC.vocab.elements as unknown as { id: string; label: string }[]).map((x) => [x.id, x.label]));

/** 元素的短名（「生命 / 护盾 / 体力」→「生命」，实例带 #2） */
export function elementName(id: string, full = false): string {
  const l = LABELS.get(baseId(id)) ?? baseId(id).replace(/^el\./, '');
  const n = instanceNo(id);
  return (full ? l : l.split(/\s*\/\s*/)[0]) + (n > 1 ? ` #${n}` : '');
}

export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'center' | 'mr' | 'bl' | 'bc' | 'br';
export const ANCHOR_GRID: Anchor[][] = [['tl', 'tc', 'tr'], ['ml', 'center', 'mr'], ['bl', 'bc', 'br']];
export const ANCHORS = new Set<string>(ANCHOR_GRID.flat());
export const ANCHOR_LABEL: Record<Anchor, string> = { tl: '左上', tc: '上中', tr: '右上', ml: '左中', center: '中心', mr: '右中', bl: '左下', bc: '下中', br: '右下' };

/** 锚点在九宫格里的列 / 行（0 / 1 / 2） */
export const colOf = (a: Anchor) => (a.endsWith('l') ? 0 : a.endsWith('r') ? 2 : 1);
export const rowOf = (a: Anchor) => (a.startsWith('t') ? 0 : a.startsWith('b') ? 2 : 1);
export const anchorAt = (col: number, row: number): Anchor => ANCHOR_GRID[row][col];

/** 中心点落在画框的哪一格 */
export function anchorForPoint(x: number, y: number, w: number, h: number): Anchor {
  const c = Math.max(0, Math.min(2, Math.floor((x / w) * 3)));
  const r = Math.max(0, Math.min(2, Math.floor((y / h) * 3)));
  return anchorAt(c, r);
}

/** 元素现在生效的锚点（画法级键优先） */
export function anchorOf(r: Resolved, id: string, form?: string): Anchor {
  const a = String(r.el(id, 'screenAnchor', form) ?? '');
  return (ANCHORS.has(a) ? a : 'tl') as Anchor;
}

/** 写锚点用哪个键：画法级键已经写了值就写它（否则元素级的写了也盖不过它） */
export function anchorKey(r: Resolved, id: string, form?: string): string {
  if (form) {
    const f = `${id}.${form}.screenAnchor`;
    if (ANCHORS.has(String(r.get(f) ?? ''))) return f;
  }
  return `${id}.screenAnchor`;
}

/**
 * 写某个实例参数（offsetX / offsetY / scale / width / height）用哪个键：排版读的是哪个就写哪个——画法级键 el.<元素>.<画法>.<后缀> 写了值时写它，
 * 否则写元素级 el.<元素>.<后缀>（审查修复 7：复刻 elden-ring 的 el.threat.bossBar.offsetY 写着时，原来写元素级键会被盖住、拖了弹回去）
 */
export function keyFor(r: Resolved, id: string, suffix: string, form?: string): string {
  const k = r.elKey(id, suffix, form);
  return k.startsWith(`${id}.`) ? k : `${id}.${suffix}`;
}

/** 参数的取值范围（偏移现在是 ±20%，register.ts 放宽到 ±50% 后自动跟上） */
export function rangeOf(id: string, lo: number, hi: number): [number, number] {
  const p = getParam(id);
  return [typeof p?.min === 'number' ? p.min : lo, typeof p?.max === 'number' ? p.max : hi];
}
/** 拖动写偏移的范围：方案定的 ±50%（§6；排版本身不夹偏移，只按版面夹位置）。register.ts 把参数范围也放宽之前，右栏滑块仍是 ±20 */
export const OFF_RANGE = (): [number, number] => { const [lo, hi] = rangeOf('elx.offsetX', -20, 20); return [Math.min(lo, -50), Math.max(hi, 50)]; };
export const SCALE_RANGE = () => rangeOf('elx.scale', 0.3, 2.5);
/** 边手柄写的宽 / 高（占屏宽 / 屏高的比例，§6：0.05–1；高的下限是参数表的 0.03） */
export const SIZE_RANGE = (axis: 'width' | 'height') => rangeOf(`elx.${axis}`, axis === 'width' ? 0.05 : 0.03, 1);

export const roundTo = (v: number, step: number) => Math.round(v / step) * step;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 这个元素自己的键（元素实例键 + 只对它的覆盖键）；base = true 时连同它的实例 #2 / #3 */
export function keysOfElement(values: Values, id: string, withInstances = false): string[] {
  const ids = withInstances && !id.includes('#') ? [id, `${id}#2`, `${id}#3`] : [id];
  return Object.keys(values).filter((k) => ids.some((e) => k.startsWith(`${e}.`) || k.endsWith(`@${e}`)));
}

/**
 * 元素改过没有（右栏本屏元素列表的 •）：这个元素（不含它的 #2 / #3）的键里有没有与 A 的来源基线不同的（审查修复 5：
 * 原来和参数默认值比，名作套用后基线里写着的锚点 / 大小都被标成改过，而 UI 标签是 ·0）
 */
export function elementModified(values: Values, origin: Origin, id: string): boolean {
  return keysOfElement({ ...values, ...baseValues(origin) }, id).some((k) => isModifiedKey(k, values, origin));
}

/** cnt.elements 的取值拆成清单（auto / 空 = 没有显式清单） */
const listOf = (v: Val | undefined): string[] | null => (v === undefined || v === null || v === 'auto' || v === '' ? null : String(v).split(',').map((x) => x.trim()).filter(Boolean));

/**
 * 基线的元素清单（A 的来源基线：场景 / 名作 / 界面套用时写进来的 cnt.elements；基线跟随布局（auto）时按基线解析出的清单）。
 * 与 actions.resetElement 同一个口径，所以「已隐藏」里点恢复、元素 ↺ 之后清单回到基线、改动数回到 0
 */
export function baselineElements(origin: Origin): string[] {
  const b = baseValues(origin);
  return listOf(b['cnt.elements']) ?? resolveUi(b).elements();
}

/** 「已隐藏 (N)」：基线里有、现在不在屏上的元素。cnt.elements 跟随布局（没有显式清单）时没有隐藏的（审查修复 5：原来按当前布局重新解析，名作故意不放的元素也算成「已隐藏」） */
export function hiddenElements(values: Values, origin: Origin, r: Resolved): string[] {
  if (!listOf(values['cnt.elements'])) return [];
  const active = r.elements();
  return baselineElements(origin).filter((x) => !active.includes(x));
}

/** 元素 ↺（§4.2）：A 的 actions.resetElement（按来源基线还原，一步撤销）。整合修复（IB · X#13）：A 上线前的过渡写法（直接 patch）删了 */
export function resetElementNow(id: string) {
  actions.resetElement(id);
}

/**
 * 显隐（Delete / 👁 / 已隐藏里的恢复 / + 元素）：从 cnt.elements 里拿掉或加回。
 * 加回基线里有的元素时插回它在基线里的位置；改完的清单与基线一样时写回基线本身（跟随布局 = auto），
 * 这样「藏了再恢复」不留改动（审查修复 5）。没给 origin 时按旧写法只改清单。
 */
export function toggleElementPatch(r: Resolved, id: string, show?: boolean, origin: Origin | null = useStore.getState().origin): Values {
  const cur = r.elements();
  const on = cur.includes(id);
  const want = show ?? !on;
  if (want === on) return {};
  if (!want) {
    const next = cur.filter((x) => x !== id);
    return { 'cnt.elements': snapToBase(next, origin) };
  }
  let next = [...cur, id];
  if (origin) {
    const bl = baselineElements(origin);
    const at = bl.indexOf(id);
    if (at >= 0) {
      const before = new Set(bl.slice(0, at));
      let i = 0;
      for (let j = 0; j < cur.length; j++) if (before.has(cur[j])) i = j + 1;
      next = [...cur.slice(0, i), id, ...cur.slice(i)];
    }
  }
  return { 'cnt.elements': snapToBase(next, origin) };
}

/** 清单与基线完全一样时返回基线本身的取值（auto 或基线里写的那串），否则返回这串 */
function snapToBase(next: string[], origin: Origin | null): Val {
  if (!origin) return next.join(',');
  const b = baseValues(origin)['cnt.elements'];
  const bl = baselineElements(origin);
  return next.length === bl.length && next.every((x, i) => x === bl[i]) ? (b ?? 'auto') : next.join(',');
}

/**
 * 现在画的是不是「示例 HUD」（审查修复 16）：局内 HUD、没选品类布局、没手动给元素清单时，HUD 画 M1 的四控件回归样本（compose/layers.ts 的 drawSample），
 * 没有命中框，画布上什么也点不到。E 的 RC2（auto 布局画品类布局）上线后只在开发 / QA 打开样本（SAMPLE_HUD.on）时才会是 true。
 * 只在有品类布局可换时算（「改成可拖动的 UI」只走 A 的合成函数；整合修复 IB · X#13：没有布局时直接写 cnt.elements 的过渡写法删了）
 */
export function isSampleHud(r: Resolved): boolean {
  if (String(r.art['hud.style'] ?? '') === 'none' || !r.presets.layout?.id) return false;
  const sel = r.art[SELECTORS.screen];
  if (typeof sel === 'string' && sel.startsWith('tpl.')) return false;
  if (r.str('cnt.subtype', 'auto') !== 'auto') return false;
  const th = { r } as unknown as Theme;
  return !wantsMenu(th) && !wantsElements(th);
}

/**
 * 「▣ 改成可拖动的 UI」：把示例 HUD 换成这个品类的布局（auto 时解析出的那一个），一步撤销。
 * 布局记进场景层（A 的 applyComposite：等于场景本来就该画的布局，不算手动改动；全部重新开始 / 换场景照常换掉）
 */
export function makeHudEditable(r: Resolved) {
  const lay = r.presets.layout?.id;
  if (!lay) return;
  const st = useStore.getState();
  actions.applyComposite({ label: '改成可拖动的 UI', layers: { scene: { ...st.origin.layers.scene, [SELECTORS.layout]: lay } }, drop: (k) => k === SELECTORS.layout });
}

/** 复制一份（⧉ / Ctrl+D）：下一个空着的实例号；没有了返回 null */
export function nextInstance(r: Resolved, id: string): string | null {
  const base = baseId(id), cur = r.elements();
  return [2, 3].map((n) => `${base}#${n}`).find((x) => !cur.includes(x)) ?? null;
}

/** 数值写回：拖动的偏移按 0.5 步、大小按 0.05 步 */
export const offVal = (v: number): Val => +clamp(roundTo(v, 0.5), ...OFF_RANGE()).toFixed(1);
/**
 * 方向键微调的偏移：按 0.01% 取整（审查修复 3：1 个设计单位 = 屏宽的 0.104% / 屏高的 0.185%，按 0.5 步取整会被吃掉，单按方向键不动）。
 * 参数本身接受任意数（store 不按步长夹）
 */
export const offFine = (v: number): Val => +clamp(roundTo(v, 0.01), ...OFF_RANGE()).toFixed(2);
export const scaleVal = (v: number): Val => +clamp(roundTo(v, 0.05), ...SCALE_RANGE()).toFixed(2);
/**
 * 角手柄拖出来的大小（整合 U#21）：平时按 0.05 一档，离 ×1 / ×1.5 / ×2 / ×2.5（0.5 的整倍）不到一档时吸到它上面（T5「放大 1.5 倍」不用拖得刚好）；
 * 按住 Shift 微调：0.01 一档、不吸附
 */
export function scaleDrag(v: number, fine: boolean): number {
  const [lo, hi] = SCALE_RANGE();
  if (fine) return +clamp(roundTo(v, 0.01), lo, hi).toFixed(2);
  const nice = roundTo(v, 0.5);
  return +clamp(Math.abs(v - nice) <= 0.05 + 1e-9 ? nice : roundTo(v, 0.05), lo, hi).toFixed(2);
}
/** 大小的读数：快捷条、拖动时的实时读数都写成「×1.50」（与检查器的两位小数一致） */
export const scaleText = (v: number) => `×${v.toFixed(2)}`;
export const sizeVal = (v: number, axis: 'width' | 'height'): Val => +clamp(roundTo(v, 0.01), ...SIZE_RANGE(axis)).toFixed(2);
