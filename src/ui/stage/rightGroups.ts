import { RECIPES } from '../../content/recipes';
import { IMAGE_SCENE_INERT, isImageScene } from '../../content/sceneCatalog';
import { paramsOf, str } from '../../dims/registry';
import type { DimId, ParamDef, Values } from '../../dims/types';

/*
 * 右栏画面模式的 5 组（轨道 B，docs/workbench-redesign.md §7「右栏分组」）：14 个维度收成
 *   形体：地貌 · 几何 · 形状　质感：材质 · 明暗 · 线条 · 画面媒介　色光：色彩 · 灯光　镜头：镜头 · 环境　运动
 * 游戏条件挪到场景弹窗（顶栏场景标签）。
 * 「常用」= 配方 firstTry 里出现过的参数（按出现次数排，约 30 行）；「全部」= 全部画面参数（含原来收在"更多参数"里的）。
 */

export interface ArtGroup { id: string; label: string; dims: DimId[] }

export const ART_GROUPS: ArtGroup[] = [
  { id: 'form', label: '形体', dims: ['world', 'geometry', 'shape'] },
  { id: 'texture', label: '质感', dims: ['material', 'shading', 'lines', 'surface'] },
  { id: 'colorLight', label: '色光', dims: ['color', 'lighting'] },
  { id: 'lens', label: '镜头', dims: ['camera', 'atmosphere'] },
  { id: 'motion', label: '运动', dims: ['motion'] },
];

export const groupOfDim = (d: DimId): ArtGroup | undefined => ART_GROUPS.find((g) => g.dims.includes(d));

/** 常用：配方「先调」里出现的次数 */
const FREQ = (() => {
  const m = new Map<string, number>();
  for (const r of RECIPES) for (const id of r.firstTry) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
})();

let commonCache: Set<string> | null = null;
/** 常用参数的集合（最多 32 个；按配方里的出现次数，同次数按维度顺序） */
export function commonSet(): Set<string> {
  if (commonCache) return commonCache;
  const all = ART_GROUPS.flatMap((g) => g.dims.flatMap((d) => paramsOf(d)));
  const ranked = all.filter((p) => FREQ.has(p.id)).sort((a, b) => (FREQ.get(b.id) ?? 0) - (FREQ.get(a.id) ?? 0)).slice(0, 32);
  commonCache = new Set(ranked.map((p) => p.id));
  return commonCache;
}

/** 一组的参数（按维度顺序，维度内按登记顺序） */
export const groupParams = (g: ArtGroup): ParamDef[] => g.dims.flatMap((d) => paramsOf(d));

/**
 * 立绘场景（背景是一张插画、前面站立绘，F 的 isImageScene）里看不出变化的画面参数（F 的 IMAGE_SCENE_INERT：形体、几何、材质、受光细节、地貌……）：
 * 右栏把它们收进每组末尾的「当前不生效 (N)」（整合 X#4）。表照 F 收窄后的原样读（质感、描边在插画上生效）；
 * 卡牌战的两只敌人现在也是立绘贴图（整合 IF U#16c），所以没有例外了（收尾 4）。
 * 返回 true = 这一行在当前场景里不生效
 */
export function imageInert(id: string, values: Values): boolean {
  return isImageScene(str(values, 'game.scene')) && IMAGE_SCENE_INERT.prefixes.some((x) => id.startsWith(x));
}
/** 「当前不生效」里有立绘场景收进来的行时的一句原因（≤16 字，悬停 / 展开后显示）；没有时 null */
export const imageInertReason = (ids: string[], values: Values): string | null => (ids.some((id) => imageInert(id, values)) ? IMAGE_SCENE_INERT.reason : null);
