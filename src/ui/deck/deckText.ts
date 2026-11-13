import { GAME_SCENES, sceneEnv, sceneName, type GameScene } from '../../content/gameScenes';
import { RECIPE_MAP, type Recipe } from '../../content/recipes';
import { isImageScene, sceneMeta } from '../../content/sceneCatalog';
import { cardName, showcaseScene, variantsOf } from '../../content/taxonomy';
import { CAMERA_ANGLES } from '../../dims/camera';
import { activeState, getParam } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { fromArtOptions } from '../../hud/sys/apply';
import { SKIN_PRESET_BY_VALUE } from '../../hud/sys/register';
import { PRESET } from '../../hud/sys/spec';
import { sameVal } from '../../state/layers';
import type { UiGrammar } from '../../export/artPrompt';

/*
 * 配方卡（轨道 C，StyleDeck）的纯数据函数：配套皮肤与短名、默认可见字数、复制提示词用哪个皮肤 / 哪个 UI 家族、
 * 「在 X 最好看 ›」去哪个场景、「建议镜头」芯片、立绘场景的提示。
 * 不引用 cases.ts / uiKnowledge.ts（那两个用了 import.meta.glob），node 脚本（scripts/bake-thumbs.ts）可以直接跑这里的检查。
 */

/* ---------------- 「在 X 最好看 ›」、建议镜头、立绘提示（整合 D→C） ---------------- */

/**
 * 「在 X 最好看 ›」去哪（§0.3：配方从不换场景，用户点了才换）：
 *   展示环境（缩略图拍的那个）正好是某个场景现在用的环境 → 用那个场景（名字是场景名，点了 = D 的 pickGameScene）；
 *   否则（横版·森林、俯视·小镇、白盒这类只在「换环境」里出现的）→ 只换环境，名字用环境名。
 * has = 场景构建器是否注册（engine/scene/sceneRegistry.hasSceneBuilder）；node 脚本不给时按 3D 环境算。
 */
export interface BestTarget { env: string; name: string; scene: GameScene | null }
export function bestTarget(r: Recipe, has?: (id: string) => boolean): BestTarget | null {
  const env = showcaseScene(r, has);
  if (!env || (has && !has(env))) return null;
  const hasEnv = has ?? (() => false);
  const sc = GAME_SCENES.find((s) => !s.replica && !s.example && sceneEnv(s, hasEnv).env === env) ?? null;
  return sc ? { env, name: sceneName(sc, hasEnv), scene: sc } : { env, name: sceneMeta(env).name, scene: null };
}
/** 已经在那里了（链接不再显示）：环境一样，并且是场景目标时来源也是这个场景 */
export const atBest = (t: BestTarget, env: string | undefined, originScene?: string | null) => env === t.env && (!t.scene || originScene === t.scene.id);

/** 立绘场景（背景是一张插画）的一句提示（§7 ≤16 字；原因写在悬停里。收尾 4：F 的插画调色、质感、墨线接上后改的字，13 字与原来一样，配方卡最挤时仍 ≤100） */
export const IMAGE_NOTE = '立绘吃色板、质感、描边和后处理';
export const IMAGE_NOTE_TIP = '立绘场景的背景是一张插画：配方的形体、几何、受光细节看不出变化，色板（调色）、时段、质感（黏土 / 纸 / 木这类起伏）、描边（墨线）和后处理作用在插画上。\n点「在 X 最好看 ›」可以换到能看出全部效果的场景';
export const imageSceneNote = (env: string | undefined) => !!env && isImageScene(env);

/** 建议镜头芯片比较的机位键（镜头行为 camera.mode 不算：缩略图是静帧，看不出跟随 / 环绕） */
const CAM_KEYS = ['camera.projection', 'camera.angle', 'camera.fov', 'camera.azimuth', 'camera.zoom'];
const fmt = (x: unknown) => String(+Number(x).toFixed(2));

/**
 * 「建议镜头」芯片（§5.2「此配方建议 等距 30° · 套用」，D→C）：场景负责机位时（来源 rigLock），配方带的镜头键不生效；
 * 配方写了、与现在不同、写进去以后真的生效（2D 场景的机位由引擎锁死，activeState 会说不生效）的那几个键 → 芯片。
 * 点了 = 普通改动写这几个键（一步撤销；场景 ↺ 能还原）。没有可建议的返回 null。
 */
export function cameraSuggestion(r: Recipe, values: Values, rigLock: boolean): { values: Values; label: string } | null {
  if (!rigLock) return null;
  const want: Values = {};
  for (const k of CAM_KEYS) if (k in r.values && !sameVal(k, r.values[k], values[k])) want[k] = r.values[k];
  if (!Object.keys(want).length) return null;
  const after = { ...values, ...want };
  const live: Values = {};
  for (const [k, v] of Object.entries(want)) { const p = getParam(k); if (p && activeState(p, after) === true) live[k] = v; }
  const parts: string[] = [];
  if ('camera.projection' in live) parts.push(live['camera.projection'] === 'ortho' ? '正交' : '透视');
  if ('camera.angle' in live) parts.push(CAMERA_ANGLES[String(live['camera.angle'])]?.label ?? String(live['camera.angle']));
  if (parts.length < 2 && 'camera.fov' in live) parts.push(`${fmt(live['camera.fov'])}mm`);
  if (!parts.length && 'camera.azimuth' in live) parts.push(`方位 ${fmt(live['camera.azimuth'])}°`);
  if (!parts.length && 'camera.zoom' in live) parts.push(`取景 ×${fmt(live['camera.zoom'])}`);
  return parts.length ? { values: live, label: parts.join(' · ') } : null;
}

/** 默认可见字数的口径（与外壳 B 的 textBudget 一致）：只数汉字和字母 */
export const countChars = (s: string) => (s.match(/[\p{Script=Han}\p{L}]/gu) ?? []).length;
/** 显示宽度：汉字 1，ASCII 约 0.5 */
export const displayWidth = (s: string) => [...s].reduce((n, ch) => n + (/[\x20-\x7e]/.test(ch) ? 0.5 : 1), 0);

/* ---------------- 皮肤 ---------------- */

/** 配方卡芯片上的皮肤短名（人工挑的，保证不在词中间截断；新皮肤没写时按宽度在词边界截） */
const SKIN_SHORT: Record<string, string> = {
  'skin.neobrutal': '新粗野', 'skin.glass': '毛玻璃', 'skin.neumorph': '新拟态', 'skin.flat': '扁平', 'skin.skeuo': '拟物',
  'skin.pixel': '像素位图', 'skin.pixelWood': '像素木框', 'skin.handdrawn': '手绘笔记', 'skin.ink': '国风水墨', 'skin.scifi': '科幻 HUD',
  'skin.holo': '全息', 'skin.jrpg': 'JRPG 窗口', 'skin.parchment': '羊皮纸', 'skin.comic': '漫画框', 'skin.slant': '倾斜动感',
  'skin.terminal': 'CRT 终端', 'skin.y2k': 'Y2K 镀铬', 'skin.swiss': '瑞士几何', 'skin.constructivist': '构成主义', 'skin.deco': '装饰艺术',
  'skin.persona': '异闻拼贴', 'skin.memphis': '孟菲斯', 'skin.mono': '极简单色', 'skin.thinGeo': '细线几何', 'skin.aero': 'Aero 玻璃',
  'skin.synth': '合成波', 'skin.military': '军事战术', 'skin.cozy': '圆润友好', 'skin.wa': '和风', 'skin.gacha': '抽卡金框',
  'skin.ornate': '雕花框', 'skin.filigree': '线描花饰', 'skin.darkHairline': '暗色细线', 'skin.animeCard': '二次元卡', 'skin.candy': '糖果卡通',
  'skin.darkGold': '暗金', 'skin.greybox': '灰盒', 'skin.godotDefault': '朴素默认',
};

/** 按显示宽度截短，只在词边界截（ASCII 单词、空格、标点处），不切半个词 */
export function shortLabel(label: string, maxWidth = 5): string {
  const t = label.replace(/（.*?）|\(.*?\)/g, '').split(/[／/]/)[0].trim();
  if (displayWidth(t) <= maxWidth) return t;
  // 切成「一个汉字」或「一整个 ASCII 词」的块
  const parts = t.match(/[A-Za-z0-9.+-]+|\s+|[^\sA-Za-z0-9.+-]/g) ?? [];
  let out = '';
  for (const p of parts) {
    if (displayWidth(out + p) > maxWidth) break;
    out += p;
  }
  return out.trim() || t;
}

/** 皮肤的短名（芯片用，显示宽度 ≤5，整词） */
export const skinShort = (id: string) => SKIN_SHORT[id] ?? shortLabel(PRESET.get(id)?.label ?? id.replace(/^skin\./, ''));

/**
 * 配套 UI 皮肤（最多 3 个）：uiSpec「跟随画面」的同媒介 / 中性两个方案，再补配方自己写的 uiSkins。
 * 「刻意对比」那个方案不放进来（非美术用户会把它当成推荐搭配；D 的皮肤行里另有）。
 */
export function pairedSkins(r: Recipe): string[] {
  const art = (id: string) => fromArtOptions(id).filter((o) => o.harmony !== 'contrast').map((o) => o.skin);
  const ids = [...art(r.id), ...(r.uiSkins ?? [])];
  if (!ids.length && r.parent) ids.push(...art(r.parent), ...(RECIPE_MAP.get(r.parent)?.uiSkins ?? []));
  return [...new Set(ids)].filter((id) => PRESET.has(id)).slice(0, 3);
}

/** hud.style 的值 → 皮肤预设 id */
export const skinIdOfValue = (v: string): string | null => {
  if (!v || v === 'none' || v === 'auto') return null;
  if (PRESET.get(v)?.kind === 'skin') return v;
  return SKIN_PRESET_BY_VALUE.get(v)?.id ?? (PRESET.get(`skin.${v}`)?.kind === 'skin' ? `skin.${v}` : null);
};

interface OriginSkinLike { skin?: string | null; layers?: { scene?: Values } }
/**
 * 复制提示词写哪个皮肤（§7）：用户选的皮肤（来源里的）→ 场景给的或手动改过的 hud.style → 配方的第一个配套皮肤 → 现在画的皮肤。
 * hud.style 只是注册表默认值（新粗野）时不算用户选的。
 */
export function promptSkin(r: Recipe | undefined, values: Values, origin?: OriginSkinLike | null): string | null {
  if (origin?.skin && PRESET.get(origin.skin)?.kind === 'skin') return origin.skin;
  const v = String(values['hud.style'] ?? '');
  const fromScene = origin?.layers?.scene && 'hud.style' in origin.layers.scene;
  if (v && v !== 'auto' && v !== 'none' && (fromScene || v !== getParam('hud.style')?.default)) {
    const id = skinIdOfValue(v);
    if (id) return id;
  }
  // 配方没有配套皮肤时用现在画的那个（提示词里写的皮肤和家族语法必须是同一个，不能一边写 A 一边配 B 的语法）
  return (r ? pairedSkins(r)[0] : undefined) ?? skinIdOfValue(v);
}

/** UI 风格家族的最小形状（uiStyleFamilies.json 的一条） */
export interface FamilyLike { id: string; name: string; parent: string | null; skin?: string | null; grammar?: Record<string, string>; artPairing?: { recipeId: string; relation: string }[] }

/**
 * 提示词【UI】一段用哪个家族的语法：必须和写出来的皮肤是同一套 UI。
 *   给了皮肤 → 皮肤同名的顶层家族（没有时任何 skin 相同的家族）；再不行用配方 uiFamilies 里没绑皮肤的；都没有就不写语法。
 *   没给皮肤 → 配方写的 uiFamilies → artPairing 里标「同一媒介」的。
 */
export function pickFamily(all: FamilyLike[], r: Recipe | undefined, skin: string | null): (UiGrammar & { id: string; skin: string | null }) | null {
  const byId = (id: string) => all.find((f) => f.id === id);
  let pick: FamilyLike | undefined;
  if (skin) {
    pick = all.find((f) => f.parent === null && f.skin === skin) ?? all.find((f) => f.skin === skin)
      ?? r?.uiFamilies?.map(byId).find((f) => f && !f.skin);
  } else if (r) {
    pick = r.uiFamilies?.map(byId).find(Boolean)
      ?? all.find((f) => f.artPairing?.some((a) => a.recipeId === (r.parent ?? r.id) && a.relation === 'sameMedium'));
  }
  return pick ? { id: pick.id, name: pick.name, grammar: pick.grammar ?? {}, skin: pick.skin ?? null } : null;
}

/* ---------------- 默认可见字数（§7：画框下方 ≤100） ---------------- */

export interface DeckGame { id: string; name: string; img: string | null; inLib: boolean }

/** 案例名 → 芯片上的名字：中文名（去掉括号里的英文）在 8 字以内就用中文，否则用原名 */
export function gameLabel(name: string, nameZh?: string | null): string {
  const zh = nameZh?.replace(/[（(].*?[）)]/g, '').trim();
  return zh && [...zh].length <= 8 ? zh : name;
}

/**
 * 配方卡的上下文：scene = 现在的环境（game.scene）、originScene = 来源里的场景、has = 场景构建器；
 * extra = 这次另外显示的字（首次引导、建议镜头、立绘提示）；noNeighbors = 不放「相邻」（有 extra 时让出字数）
 */
export interface DeckCtx { scene?: string; originScene?: string | null; has?: (id: string) => boolean; extra?: string[]; noNeighbors?: boolean }

/** 配方卡默认可见的文字（StyleDeck 两行版照着这个顺序显示）；games = 要以名字显示的游戏（有截图的不算字） */
export function deckTexts(card: Recipe, cur: Recipe, games: DeckGame[], opts: DeckCtx = {}): string[] {
  const out: string[] = [cardName(card)];
  if (cur !== card) out.push(cardName(cur));
  out.push(...((cur.bullets?.length ? cur.bullets : card.bullets) ?? []).slice(0, 3).map((b) => b.text));
  if (games.length) out.push('像这些游戏', ...games.filter((g) => !g.img).map((g) => g.name));
  const sk = pairedSkins(card);
  if (sk.length) out.push('配套 UI', ...sk.map(skinShort));
  const vs = variantsOf(card.id).filter((v) => !v.subtle || v === cur);
  if (vs.length) out.push('变体', ...vs.map(cardName));
  const ns = opts.noNeighbors ? [] : (card.neighbors ?? []).map((id) => RECIPE_MAP.get(id)).filter((x): x is Recipe => !!x).slice(0, 3);
  if (ns.length) out.push('相邻', ...ns.map(cardName));
  const best = bestTarget(card, opts.has);
  if (best && !atBest(best, opts.scene, opts.originScene)) out.push(`在「${best.name}」最好看`);
  out.push(...(opts.extra ?? []));
  out.push('复制提示词', '更多');
  return out;
}

export const DECK_BUDGET = 100;

/**
 * 「像这些游戏」显示哪几款：有截图（开发环境）的最多 3 款，截图不算字；
 * 只能显示名字时（生产构建）最多 2 款，而且整张配方卡超过 100 字就从后往前去掉。
 */
export function fitGames(card: Recipe, cur: Recipe, games: DeckGame[], opts: DeckCtx = {}): DeckGame[] {
  const withImg = games.some((g) => g.img);
  let shown = withImg ? games.slice(0, 3) : games.slice(0, 2);
  while (shown.length && countChars(deckTexts(card, cur, shown, opts).join(' ')) > DECK_BUDGET) shown = shown.slice(0, -1);
  return shown;
}
