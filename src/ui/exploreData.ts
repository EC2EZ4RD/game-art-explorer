import { get, keys } from 'idb-keyval';
import { activeState, paramsOf } from '../dims/registry';
import type { DimId, ParamDef, Val, Values } from '../dims/types';
import { mulberry32 } from '../core/rng';

/*
 * 探索工具的纯函数与数据（单维扫描的取值、受约束随机、收藏的类型与读取、混搭）。
 * T0（docs/workbench-redesign.md §11.0）：原来写在 Explore.tsx 里，组件文件导出非组件会让 Fast Refresh 退回整页刷新，所以挪到这里。
 * 对话框组件（SweepDialog / RandomPanel / FavoriteDialog / DirectionBoard）仍在 Explore.tsx。
 */

/* ---------------- 单维扫描 ---------------- */
export function sweepValues(p: ParamDef, values: Values): Val[] {
  if (p.kind === 'choice') return (p.options ?? []).filter((o) => !o.disabledWhen?.(values)).map((o) => o.value).slice(0, 12);
  if (p.kind === 'toggle') return [false, true];
  if (p.kind === 'range' || p.kind === 'int') {
    const n = 6, lo = p.min ?? 0, hi = p.max ?? 1;
    return Array.from({ length: n }, (_, i) => {
      const x = lo + ((hi - lo) * i) / (n - 1);
      return p.kind === 'int' ? Math.round(x) : +x.toFixed(3);
    }).filter((x, i, a) => a.indexOf(x) === i);
  }
  return [];
}

/* ---------------- 受约束随机 ---------------- */
export const RANDOM_DIMS: DimId[] = ['world', 'geometry', 'shape', 'material', 'shading', 'lines', 'surface', 'color', 'lighting', 'camera', 'atmosphere', 'motion'];

export function randomize(values: Values, locked: Set<DimId>, seed: number, amount: number): Values {
  const rng = mulberry32(seed);
  const out: Values = {};
  for (const d of RANDOM_DIMS) {
    if (locked.has(d)) continue;
    for (const p of paramsOf(d)) {
      if (p.advanced || rng() > amount) continue;
      if (p.kind === 'choice') {
        const opts = (p.options ?? []).filter((o) => !o.disabledWhen?.(values));
        if (opts.length) out[p.id] = opts[Math.floor(rng() * opts.length)].value;
      } else if (p.kind === 'toggle') out[p.id] = rng() > 0.5;
      else if (p.kind === 'range' || p.kind === 'int') {
        const lo = p.min ?? 0, hi = p.max ?? 1;
        const x = lo + (hi - lo) * rng();
        out[p.id] = p.kind === 'int' ? Math.round(x) : +x.toFixed(3);
      }
    }
  }
  return out;
}

/* ---------------- 收藏与方向板 ---------------- */
export const LIKE_TAGS = ['轮廓', '形状', '材质', '用色', '光线', '线条', '媒介', '空间', '镜头', '运动'];
export const DISLIKE_TAGS = ['过密', '太空', '太暗', '太亮', '过硬', '过软', '主体不清楚', '颜色脏', '线条乱', '闪烁'];

export interface Favorite {
  id: string;
  ts: number;
  name: string;
  values: Values;
  image?: string;
  likes: string[];
  dislikes: string[];
  keep: string;
  tryNext: string;
  /** 旧收藏才有（新收藏的配方 / 风格在 origin 里） */
  baseRecipe?: string | null;
  baseStyle?: string | null;
  /** 来源（轨道 A，src/state/layers.ts 的 Origin）：恢复时三个标签的改动数和收藏时一样 */
  origin?: unknown;
}

/** 收藏在 IndexedDB 里的键前缀 */
export const FAV_PREFIX = 'gae.fav.';

export async function listFavorites(): Promise<Favorite[]> {
  try {
    const ks = (await keys()).filter((k) => String(k).startsWith(FAV_PREFIX));
    const items = await Promise.all(ks.map((k) => get<Favorite>(k)));
    return items.filter((x): x is Favorite => !!x).sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

/* ---------------- 混搭 ---------------- */
/** 只取某个配方的部分维度（混搭） */
export function recipeDimValues(recipeValues: Values, dims: DimId[], base: Values): Values {
  const out: Values = {};
  for (const d of dims) for (const p of paramsOf(d)) out[p.id] = recipeValues[p.id] ?? p.default;
  void base;
  return out;
}

export const liveCount = (d: DimId, v: Values) => paramsOf(d).filter((p) => activeState(p, v) === true).length;
