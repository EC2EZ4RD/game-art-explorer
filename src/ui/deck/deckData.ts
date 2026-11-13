import { CASE_MAP, caseImage } from '../../content/cases';
import { RECIPE_MAP, type Recipe } from '../../content/recipes';
import { loadFamilies, type FamiliesFile } from '../../content/uiKnowledge';
import type { UiGrammar } from '../../export/artPrompt';
import { gameLabel, pickFamily, type DeckGame, type FamilyLike } from './deckText';

export { pairedSkins, promptSkin, skinShort } from './deckText';

/*
 * 配方卡（轨道 C，StyleDeck）的数据函数：像这些游戏、配套 UI 家族的语法（懒加载）。纯数据部分在 deckText.ts（node 能跑）。
 * UI 风格家族在 uiStyleFamilies.json（约 2 MB，懒加载）：配方卡挂上后空闲时预取，复制提示词时有就用、没有就只写皮肤的一句话。
 */

/** 配方卡讲的是哪一张卡：变体 / 叠加讲父配方（没有父配方时讲它自己） */
export const deckRecipe = (id: string | null): Recipe | undefined => {
  const r = id ? RECIPE_MAP.get(id) : undefined;
  if (!r) return undefined;
  return r.kind === 'variant' && r.parent ? RECIPE_MAP.get(r.parent) ?? r : r;
};

/** 像这些游戏：案例库里有的给截图（只在开发环境）；没有的只给名字 */
export function gamesOf(r: Recipe): DeckGame[] {
  const ids = r.games?.length ? r.games : [];
  return ids.map((id) => {
    const c = CASE_MAP.get(id);
    if (!c) return { id, name: id, img: null, inLib: false };
    const img = caseImage(c);
    return { id, name: gameLabel(c.name, c.nameZh), img: img ? (img.startsWith('http') ? img : `./${img.replace(/^\/+/, '')}`) : null, inLib: true };
  });
}

/* ---------------- UI 家族（懒加载） ---------------- */

let fam: FamiliesFile | null = null;
let famP: Promise<FamiliesFile> | null = null;
export function prefetchFamilies(): Promise<FamiliesFile> {
  famP ??= loadFamilies().then((f) => (fam = f));
  return famP;
}
export const familiesReady = () => !!fam;

/** 提示词【UI】一段的家族语法：和写出来的皮肤是同一套（deckText.pickFamily） */
export function familyFor(r: Recipe | undefined, skin: string | null): UiGrammar | null {
  if (!fam) return null;
  return pickFamily(fam.families as unknown as FamilyLike[], r, skin);
}
