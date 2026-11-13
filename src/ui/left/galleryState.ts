import { create } from 'zustand';
import type { RecipeCategory } from '../../content/recipes';
import type { Realtime } from '../../content/taxonomy';

/*
 * 配方图库自己的视图状态（轨道 C）：分类、感觉、2D、可实现度、搜索词。
 * 只是"怎么看"，不进参数、不进撤销；每个标签页一份（sessionStorage gae.gallery.v1），切模式 / 重新挂载不丢。
 * 「全部重新开始」也不清它（§4.2：保留图库筛选）。
 */

export interface GalleryUi {
  cat: RecipeCategory | 'all';
  mood: string | null;
  only2d: boolean;
  realtime: Realtime | null;
  q: string;
  searchOpen: boolean;
  set: (p: Partial<Omit<GalleryUi, 'set'>>) => void;
}

const KEY = 'gae.gallery.v1';
const PERSIST = ['cat', 'mood', 'only2d', 'realtime', 'q', 'searchOpen'] as const;

function load(): Partial<GalleryUi> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(PERSIST.filter((k) => k in o).map((k) => [k, o[k]])) as Partial<GalleryUi>;
  } catch {
    return {};
  }
}

export const useGalleryUi = create<GalleryUi>((set, get) => ({
  cat: 'all',
  mood: null,
  only2d: false,
  realtime: null,
  q: '',
  searchOpen: false,
  ...load(),
  set: (p) => {
    set(p);
    try {
      const s = get();
      sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, s[k]]))));
    } catch { /* 隐私模式等：只是记不住筛选 */ }
  },
}));
