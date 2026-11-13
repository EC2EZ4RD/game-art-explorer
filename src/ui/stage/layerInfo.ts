import { envOverride, gameScene } from '../../content/gameScenes';
import { sceneMeta } from '../../content/sceneCatalog';
import type { Values } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { HUD_STYLE_DEF, SKIN_PRESET_BY_VALUE } from '../../hud/sys/register';
import type { Origin } from '../../state/layers';
import { layerCounts as countsOf, layerTitles, modifiedKeys } from '../../state/view';
import { skinShort } from '../deck/deckText';

/*
 * 三个层级标签（场景 / 画面 / UI）的名字和改动数（轨道 B 的顶栏、右栏标题用）。
 * 改动数、层归属、标签上的名字都是轨道 A 的（src/state/layers.ts：来源记录 + 统一合成 + 差值，§4.1；state/view.ts 的 layerCounts / modifiedKeys / layerTitles）。
 * 这里只做显示：名字截短、皮肤用 C 的整词短名，场景换过环境时写出现在的环境（整合 X#10，D 的 envOverride）。
 * 整合修复（IB · X#13）：A 上线前的过渡算法（artBaseStub / layerOfKey / 过渡版名字）删掉了。
 */

export type Layer = 'scene' | 'art' | 'ui';

interface StoreLike { values: Values; origin: Origin }

/** 某一层改过的键 */
export function changedKeys(layer: Layer, s: StoreLike): string[] {
  return modifiedKeys(layer, s);
}

let countCache: { v: Values; o: Origin; out: Record<Layer, number> } | null = null;
/** 三层的改动数（按 values / origin 引用缓存） */
export function layerCounts(s: StoreLike): Record<Layer, number> {
  if (countCache && countCache.v === s.values && countCache.o === s.origin) return countCache.out;
  const c = countsOf(s);
  const out = { scene: c.scene, art: c.art, ui: c.ui };
  countCache = { v: s.values, o: s.origin, out };
  return out;
}

/** 名字缩到 n 个字：配方名常带「灵感原样：低模微缩沙盒」这种前缀，取冒号后面那段 */
export function shortName(name: string, n = 6): string {
  const tail = name.split(/[：:]/).pop() ?? name;
  const t = tail.replace(/[（(].*?[）)]/g, '').trim() || name;
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 皮肤的预设 id（来源里记的皮肤，没有时按 hud.style 的取值找） */
function skinIdOf(s: StoreLike): string | undefined {
  return s.origin.skin ?? SKIN_PRESET_BY_VALUE.get(String(s.values[HUD_STYLE_DEF.id] ?? ''))?.id;
}

/**
 * 场景换过环境（场景弹窗「换环境」、配方卡「在 X 最好看」、⌘K 的「环境」）：现在的环境 id 与它的名字；没换过时 null（整合 X#10）。
 * 环境名取最后一段（「横版·洞穴」→「洞穴」，「城堡与城下町」→「城堡」），标签上写成「品类·环境」，全名写进悬停提示
 */
export function envSwap(s: StoreLike): { id: string; name: string; short: string } | null {
  const sc = gameScene(s.origin.scene);
  const id = envOverride(sc, String(s.values['game.scene'] ?? ''), hasSceneBuilder);
  if (!id) return null;
  const name = sceneMeta(id).name;
  const short = (name.split('·').pop() ?? name).replace(/与.*$/, '') || name;
  return { id, name, short };
}

/** 场景名带上换过的环境：「魂类·城堡」+ 雪村冻湖 →「魂类·雪村冻湖」；名作（名字里没有「·」）→「艾尔登法环·雪村冻湖」 */
function sceneWithEnv(sceneName: string, s: StoreLike): string {
  const e = envSwap(s);
  if (!e) return sceneName;
  return `${sceneName.split('·')[0] || sceneName}·${e.short}`;
}

/**
 * 三个标签上的名字：场景 / 配方最多 8 个字，皮肤用 C 的整词短名 skinShort（「科幻 HUD」，不在词中间截；B2 审查修复 ㉑）。
 * 再窄的时候由顶栏的 CSS 按宽度加省略号（1366 以下），全名放悬停提示（layerFullNames）
 */
export function layerNames(s: StoreLike): Record<Layer, string> {
  const t = layerTitles(s);
  const sk = skinIdOf(s);
  const skin = String(s.values[HUD_STYLE_DEF.id] ?? HUD_STYLE_DEF.default);
  return {
    scene: shortName(sceneWithEnv(t.scene ?? '', s), 8),
    art: shortName(t.art ?? '', 8),
    ui: skin === 'none' ? '不显示' : sk ? skinShort(sk) : shortName(t.ui ?? '', 8),
  };
}

/** 三个标签的全名（悬停提示用）；场景换过环境时写「魂类·城堡（环境：雪村冻湖）」 */
export function layerFullNames(s: StoreLike): Record<Layer, string> {
  const t = layerTitles(s);
  const e = envSwap(s);
  return { scene: e ? `${t.scene ?? ''}（环境：${e.name}）` : t.scene ?? '', art: t.art ?? '', ui: t.ui ?? '' };
}
