import type { Recipe } from '../../content/recipes';
import { OVERLAYS, type OverlayDef } from '../../content/taxonomy';
import { getParam } from '../../dims/registry';
import * as A from '../../state/actions';
import * as L from '../../state/layers';
import { useStore } from '../../state/store';
import { groupOfDim } from '../stage/rightGroups';
import { useShell } from '../stage/shell';

/*
 * 配方图库 / 配方卡的动作（轨道 C）。「套用」的正式实现归轨道 A（src/state/actions.ts 走 layers.ts 的统一合成，§4.1），
 * 这里只是图库自己的语义：再点一次 = 退回下一层、时段四选一、Alt = 保留我的改动、看点跳到参数。
 */

interface OriginLike { recipe?: string | null; via?: string | null; overlays?: string[] }
const originOf = (s: unknown): OriginLike | null => ((s as { origin?: OriginLike }).origin ?? null);

/**
 * 当前配方 id（图库高亮用）：来源里的配方；风格图谱 / 案例 / 复刻借用的配方（via）也算（高亮成虚线，见 viaOf）。
 * 没有来源记录的旧状态用 baseRecipe。
 */
export function currentRecipeOf(s: { baseRecipe: string | null }): string | null {
  const o = originOf(s);
  if (o) return o.recipe && !o.recipe.includes(':') ? o.recipe : o.via ?? null;
  return s.baseRecipe;
}
export const useCurrentRecipe = () => useStore((s) => currentRecipeOf(s));
/** 当前画面是不是「借」这个配方的近似条目（atlas: / case: / rep:）：图库只把它描成虚线，点它 = 套上原配方 */
export const isViaOnly = (s: { origin?: OriginLike }) => { const o = s.origin; return !!o?.recipe && o.recipe.includes(':'); };
export const useViaOnly = () => useStore((s) => isViaOnly(s as never));

/** 「保留我的改动」：左栏开关或按住 Alt */
const keepMine = (alt?: boolean) => !!alt || useShell.getState().keepMine;

/** 首次打开的引导：点过一次配方卡就不再显示（每个浏览器记一次；存不了时只是每次都显示） */
const SEEN = 'gae.gallery.seen';
export function markGallerySeen() {
  if (seenNow) return;
  seenNow = true;
  try { localStorage.setItem(SEEN, '1'); } catch { /* 隐私模式：不记 */ }
  seenCb.forEach((f) => f());
}
let seenNow = false;
export function gallerySeen(): boolean {
  if (seenNow) return true;
  try { return (seenNow = localStorage.getItem(SEEN) === '1'); } catch { return false; }
}
const seenCb = new Set<() => void>();
export const onGallerySeen = (f: () => void) => { seenCb.add(f); return () => { seenCb.delete(f); }; };

/**
 * 点一张配方卡（或变体芯片）。再点一次真正选中的卡（来源里的配方就是它）= 不用配方；
 * 卡片只是被近似条目借用（虚线高亮）时，点它 = 换成这个配方原样，不会把整个画面清掉。
 */
export function pickRecipe(r: Recipe, opts: { alt?: boolean; toggle?: boolean } = {}) {
  const s = useStore.getState();
  markGallerySeen();
  if (opts.toggle !== false && s.origin.recipe === r.id) { dropRecipe(opts); return; }
  A.applyRecipe(r, { keepMine: keepMine(opts.alt) });
}

/** 不用配方：画面键回到默认 ⊕ 场景（保留场景、种子、品类和所有 UI） */
export function dropRecipe(opts: { alt?: boolean } = {}) {
  A.dropRecipe({ keepMine: keepMine(opts.alt) });
}

/**
 * 叠加开关（霓虹雨夜、做旧、VHS、手绘特效、时段）。
 * 时段四选一：打开一个时段时，同一步里关掉别的时段（一步撤销，芯片不会两个都亮）。
 */
export function toggleOverlay(o: OverlayDef) {
  const s = useStore.getState();
  const on = isOverlayOn(o, s);
  const ov = (x: OverlayDef) => ({ id: x.id, name: x.short, values: x.values });
  if (on || o.group !== 'time') { A.toggleOverlay(ov(o), !on); return; }
  let p: L.Plan = { values: s.values, origin: s.origin, changed: [], label: '' };
  for (const other of OVERLAYS) {
    if (other.group === 'time' && other.id !== o.id && p.origin.overlays.includes(other.id)) p = L.planOverlay(p.values, p.origin, ov(other), false);
  }
  p = L.planOverlay(p.values, p.origin, ov(o), true);
  s.applyPlan({ values: p.values, origin: p.origin, label: p.label, changed: L.diffKeys(s.values, p.values) });
}
export function isOverlayOn(o: OverlayDef, s: { values: unknown; origin?: unknown }): boolean {
  return !!originOf(s)?.overlays?.includes(o.id);
}

/** 套上皮肤（配方卡的「配套 UI」），并在画面模式下打开 👁UI。已选中的再点一次 = 回到场景默认皮肤 */
export function pickSkin(skinPresetId: string, opts: { alt?: boolean } = {}) {
  const wasOn = A.isSkinOn(skinPresetId) && !!useStore.getState().origin.skin;
  A.pickSkin(skinPresetId, { keepMine: keepMine(opts.alt) });
  if (!wasOn) useShell.getState().set({ hudInArt: true });
}

/** 换到展示场景（「在 X 场景最好看 ›」、学习库的场景按钮）：只换环境，记进来源（不算改动），画风和 UI 不动 */
export function goScene(sceneId: string, name?: string) {
  A.applyEnv(sceneId, name);
}

/* ---------------- 看点 → 右栏参数 ---------------- */

const rowOf = (id: string) => document.getElementById(`param-${id}`);

/** 参数所在的右栏分组标题（行还没渲染时闪它）：B 的 .rp-group[data-group] 优先，没有时按组名找 */
function groupHeadOf(id: string): HTMLElement | null {
  const p = getParam(id);
  const g = p ? groupOfDim(p.dim) : undefined;
  if (!g) return null;
  const tagged = document.querySelector<HTMLElement>(`[data-group="${g.id}"] .rp-group-head, .rp-group-head[data-group="${g.id}"]`);
  if (tagged) return tagged;
  return [...document.querySelectorAll<HTMLElement>('.rp-group-head')].find((el) => (el.textContent ?? '').replace(/^[▸▾]\s*/, '').startsWith(g.label)) ?? null;
}

let jumpToken = 0;
/**
 * 跳到参数（看点点击）：A 的 focusParam 切维度、设 focus；右栏的组在下一次渲染才展开，
 * 所以这里一直等到那一行真的出现（最多约 1.5 秒），再把它滚到中间、闪一下。
 * 用定时器而不是 requestAnimationFrame 轮询：后台标签页、被遮住的窗口里 rAF 不跑；滚动也不用 smooth（同理）。
 */
export function jumpParam(id: string) {
  A.focusParam(id);
  const token = ++jumpToken;
  let n = 0;
  const tryScroll = () => {
    if (token !== jumpToken) return;
    const el = rowOf(id);
    if (el && el.offsetParent) {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('c-param-flash');
      window.setTimeout(() => el.classList.remove('c-param-flash'), 1400);
      return;
    }
    if (++n < 30) window.setTimeout(tryScroll, 50);
  };
  window.setTimeout(tryScroll, 30);
}

/** 右栏对应的参数行闪一下（看点悬停）；那一行没显示（组收着 / 在「更多」里）时闪它所在的组标题。on = false 时取消 */
export function flashParam(id: string, on: boolean) {
  const el = rowOf(id) ?? groupHeadOf(id);
  if (!el) return;
  el.classList.toggle('c-param-flash', on);
}
