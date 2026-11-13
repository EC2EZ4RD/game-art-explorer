import type { Val, Values } from '../../dims/types';
import { asList } from './cond';
import { HUD_STYLE_DEF, SELECTORS, skinValueOf } from './register';
import { isMulti, paramOfKey, resolveUi } from './resolve';
import { PRESET, SPEC, type NudgeOp, type Raw, type SpecPreset } from './spec';

/*
 * 把 UI 预设套到当前状态上（纯函数：返回要写的键与要清掉的键，由界面交给 store 执行，可撤销）。
 *   起点类（皮肤 / 关键词 / 节日 / 平台 / 商业 / 品类 / 界面 / 版式 / 容器）：只换选择器，其余参数照旧跟随；
 *   微调（nudge）：在当前解析值上做相对运算（加减、取上下限、并集、按画面明暗取反），结果写成手动值；
 *   UI 配方（recipe）与案例（example）：先把手动改过的 UI 参数清回跟随，再套起点层与配方自己的值；
 *   跟随当前画面：按画面配方给的三个方案（同一媒介 / 中性 / 刻意对比）换皮肤并设 rel.harmony。
 */

export interface Patch { set: Values; unset: string[]; label: string }

const SELECTOR_OF: Partial<Record<SpecPreset['kind'], string>> = {
  skin: HUD_STYLE_DEF.id, keyword: SELECTORS.keyword, theme: SELECTORS.theme, platform: SELECTORS.platform, business: SELECTORS.business,
  layout: SELECTORS.layout, screen: SELECTORS.screen, pattern: SELECTORS.pattern, container: SELECTORS.container,
};

const toVal = (v: Raw | undefined): Val => (Array.isArray(v) ? v.join(',') : v === null || v === undefined ? '' : (v as Val));

/** 当前所有手动改过的 UI 键（选择器除外） */
export function manualUiKeys(v: Values, isUi: (k: string) => boolean): string[] {
  return Object.keys(v).filter((k) => isUi(k) && !k.startsWith('uip.') && k !== HUD_STYLE_DEF.id && k !== 'hud.useSceneColors' && v[k] !== 'auto');
}

/** 场景偏亮还是偏暗（色板的天空与纸色） */
function sceneIsBright(scene: { sky: string; paper: string } | null): boolean {
  if (!scene) return true;
  const lum = (h: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
    if (!m) return 0.5;
    const n = parseInt(m[1], 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
  return (lum(scene.sky) + lum(scene.paper)) / 2 > 0.5;
}

function nudgeValue(key: string, op: NudgeOp, cur: Raw | undefined, scene: { sky: string; paper: string } | null): Raw | undefined {
  const p = paramOfKey(key);
  const clamp = (n: number) => Math.min(p?.range?.max ?? Infinity, Math.max(p?.range?.min ?? -Infinity, n));
  const n = Number(cur ?? p?.fallback ?? p?.range?.min ?? 0);
  switch (op.op) {
    case 'set': return op.v ?? undefined;
    case 'add': return clamp((Number.isNaN(n) ? 0 : n) + Number(op.v));
    case 'mul': return clamp((Number.isNaN(n) ? 1 : n) * Number(op.v));
    case 'min': return Number.isNaN(n) ? op.v ?? undefined : Math.min(n, Number(op.v));
    case 'max': return Number.isNaN(n) ? op.v ?? undefined : Math.max(n, Number(op.v));
    case 'union': return [...new Set([...asList(cur ?? null), ...asList(op.v ?? null)])];
    case 'invertScene': return sceneIsBright(scene) ? 'dark' : 'light';
    default: return undefined;
  }
}

export function applyPreset(id: string, v: Values, opts: { isUi: (k: string) => boolean; scene?: { sky: string; paper: string } | null }): Patch | null {
  const pr = PRESET.get(id);
  if (!pr) return null;
  const sel = SELECTOR_OF[pr.kind];
  if (sel) return { set: { [sel]: pr.kind === 'skin' ? skinValueOf(pr.id) : pr.id }, unset: [], label: `UI ${pr.label}` };
  if (pr.kind === 'overlay') {
    const cur = asList(String(v[SELECTORS.overlay] ?? ''));
    const next = cur.includes(pr.id) ? cur.filter((x) => x !== pr.id) : [...cur, pr.id];
    return { set: { [SELECTORS.overlay]: next.join(',') }, unset: [], label: `UI ${pr.label}` };
  }
  if (pr.kind === 'nudge') {
    const r = resolveUi(v);
    const set: Values = {};
    for (const [k, op] of Object.entries(pr.values)) {
      const x = nudgeValue(k, op as NudgeOp, r.get(k), opts.scene ?? null);
      if (x !== undefined) set[k] = isMulti(k) ? toVal(asList(x)) : toVal(x);
    }
    return { set, unset: [], label: `UI ${pr.label}` };
  }
  if (pr.kind === 'recipe' || pr.kind === 'example') {
    const set: Values = {};
    // 配方：起点层整套换掉（没写的层回到默认）
    if (pr.kind === 'recipe') {
      for (const [kind, sel2] of Object.entries(SELECTOR_OF)) {
        if (!sel2) continue;
        const layer = pr.layers?.[kind];
        if (sel2 === HUD_STYLE_DEF.id) { if (layer) set[sel2] = skinValueOf(layer); continue; }
        set[sel2] = layer ?? (sel2 === SELECTORS.pattern || sel2 === SELECTORS.container || sel2 === SELECTORS.theme ? 'none' : 'auto');
      }
    }
    for (const [k, x] of Object.entries(pr.values)) set[k] = toVal(x as Raw);
    const unset = manualUiKeys(v, opts.isUi).filter((k) => !(k in set));
    return { set, unset, label: `UI ${pr.kind === 'recipe' ? '配方' : '案例'}：${pr.label}` };
  }
  return null;
}

/** 画面配方 → 三个 UI 方案（docs/survey/09 第 9 节"跟随当前画面"） */
export function fromArtOptions(recipeId: string | null): { harmony: 'sameMedium' | 'neutral' | 'contrast'; label: string; skin: string }[] {
  const m = recipeId ? SPEC.fromArt?.recipes?.find((x) => x.id === recipeId) : undefined;
  if (!m) return [];
  return [
    { harmony: 'sameMedium', label: '同一媒介', skin: m.sameMedium },
    { harmony: 'neutral', label: '中性', skin: m.neutral },
    { harmony: 'contrast', label: '刻意对比', skin: m.contrast },
  ];
}

export function applyFromArt(opt: { harmony: string; skin: string }): Patch {
  return { set: { [HUD_STYLE_DEF.id]: skinValueOf(opt.skin), 'rel.harmony': opt.harmony }, unset: [], label: `UI 跟随画面：${PRESET.get(opt.skin)?.label ?? opt.skin}` };
}
