import type { Resolved } from '../sys/resolve';
import { GENERIC } from './generic';
import { pack } from './index';
import type { ContentPack, TabRow, TextSlot, TextSlots, TextVariant, TextWhen } from './types';

/*
 * 按界面 / 子功能 / 阶段 / 语气取的示例文字（M12b-61，§2 的 textFor）：内容包的字原来一包一套、不分界面——菜单页的按键图例写局内动作、
 * 结算屏的主按钮写「开始作战」、对话名牌写模板名、死亡横幅写章节名……现在每个槽位是一组变体 {when, value}：
 *   候选 = 包的变体 → 包原来的字段（没有条件的那一条，LEGACY）→ GENERIC 的变体；条件全对上的里面取最具体的（子功能 3、界面类型 2、阶段 / 语气 / 界面组 1，
 *   菜单 / 局内这两个泛组 0.5），一样具体时按候选顺序（包在 GENERIC 前）。
 * 界面组（when.group）由 screenGroups 按 cnt.screen / cnt.subtype / ctx.timeModel 推：一屏可以同时属于几个组（锻造 = menu + craft）。
 * Godot：导出成 CSV / tr() 词条，键名 = <界面组>.<子功能>.<槽位>（迁移说明见 godotHud.ts 的 m12bB2Notes「示例文字（M12b-61）」行）。
 */

/** 界面类型 → 界面组 */
const SCREEN_GROUP: Record<string, string[]> = {
  'screen.hud': ['hud'], 'screen.map': ['map'], 'screen.dialogue': ['dialogue'], 'screen.codex': ['reading', 'codex', 'menu'], 'screen.journal': ['menu'],
  'screen.skilltree': ['menu', 'skill'], 'screen.craft': ['menu', 'craft'], 'screen.build': ['menu', 'build'], 'screen.inventory': ['menu'], 'screen.character': ['menu'],
  'screen.pause': ['menu'], 'screen.settings': ['menu'], 'screen.save': ['menu'], 'screen.shop': ['menu'], 'screen.manage': ['menu'], 'screen.loading': ['reading'],
  'screen.results': ['menu'], 'screen.title': ['menu'], 'screen.frontend': ['menu'], 'screen.cards': ['menu'], 'screen.levelselect': ['map'],
};
/** 子功能 → 界面组（比界面类型优先：局内 HUD 上弹出的锻造 / 对话也按它们自己的组） */
const SUB_GROUP: Record<string, string[]> = {
  worldmap: ['map'], routeMap: ['map'], stage: ['map'], npc: ['dialogue'], dialogueWheel: ['dialogue'], cutscene: ['dialogue'],
  forge: ['menu', 'craft'], home: ['menu', 'build'], skill: ['menu', 'skill'], collection: ['reading', 'codex', 'menu'], notice: ['reading'], credits: ['reading'],
  combat: ['battle'], bag: ['menu'], hero: ['menu'], loadout: ['menu'], quest: ['menu'], pause: ['menu'], menu: ['menu'], settings: ['menu'], create: ['menu'], faction: ['menu'],
};

/**
 * 信息流的几行（画布 el.notify 的 feedOf 与 Godot 样本共用，中期审查修复 ㉔：Godot 原来写包的原始 hud.feed）：按界面取的 feed 变体 → 包的 hud.feed；
 * 显式给了 cnt.density ≤ 1 时只留一条（M12b-61）；maxN = el.notify.maxItems 选过时的条数（M12b-20，选没选过由调用方按旧皮肤口径判断）
 */
export function feedLines(r: Resolved, p: ContentPack = pack(), maxN?: number): string[] {
  const list = textFor('feed', r, p) ?? p.hud.feed, l = r.src('cnt.density')?.layer;
  const set = !!l && l !== 'default' && l !== 'fallback';
  const cut = set && r.num('cnt.density', 2) <= 1 ? list.slice(0, 1) : list;
  const n = maxN === undefined ? NaN : Math.round(maxN);
  return Number.isFinite(n) && n >= 1 ? cut.slice(0, n) : cut;
}

/** 界面组的全部名字（check-content 核对变体的 when.group 用：不在这里的组永远对不上） */
export const SCREEN_GROUP_NAMES: readonly string[] = [...new Set([...Object.values(SCREEN_GROUP).flat(), ...Object.values(SUB_GROUP).flat(), 'hud', 'battle', 'menu'])];

/**
 * 这一屏属于哪些界面组（M12b-61）：子功能的组 + 界面类型的组；局内 HUD 回合制（ctx.timeModel = turn）时加 battle；什么都没对上 = hud。
 * 选了表里没有的子功能（布阵、结算、商店……）时它是一屏模板：算 menu，不算界面类型默认的 hud（布阵的主按钮是「开始作战」，不是局内的「结束回合」）
 */
export function screenGroups(r: Resolved): Set<string> {
  const sub = r.str('cnt.subtype', ''), sg = SUB_GROUP[sub], scr = r.str('cnt.screen', '');
  const tplSub = !sg && !!sub && sub !== 'auto' && sub !== 'combat' && scr === 'screen.hud';
  const out = new Set<string>([...(sg ?? (tplSub ? ['menu'] : [])), ...(tplSub ? [] : SCREEN_GROUP[scr] ?? [])]);
  if (out.has('hud') && r.str('ctx.timeModel', '') === 'turn') out.add('battle');
  // 表里没有的界面类型（大厅、运营、对局、社交……）也是一屏菜单，不吃局内 HUD 的字
  if (!out.size) out.add(scr === 'screen.hud' && !tplSub ? 'hud' : 'menu');
  return out;
}

const W_KEY: Record<keyof TextWhen, number> = { subtype: 3, screen: 2, stage: 1, tone: 1, group: 1 };
const any = (v: string | string[] | undefined, x: string) => (Array.isArray(v) ? v.includes(x) : v === x);
/** 变体的条件对不对得上、有多具体（对不上 = −1；没有条件 = 0） */
function score(w: TextWhen | undefined, r: Resolved, groups: Set<string>): number {
  if (!w) return 0;
  let s = 0;
  for (const k of Object.keys(w) as (keyof TextWhen)[]) {
    const v = w[k];
    if (v === undefined) continue;
    if (k === 'group') {
      const hit = (Array.isArray(v) ? v : [v]).filter((g) => groups.has(g));
      if (!hit.length) return -1;
      s += hit.some((g) => g !== 'menu' && g !== 'hud') ? W_KEY.group : 0.5;
      continue;
    }
    const cur = r.str(k === 'screen' ? 'cnt.screen' : k === 'subtype' ? 'cnt.subtype' : k === 'stage' ? 'cnt.stage' : 'cnt.tone', '');
    if (!any(v, cur)) return -1;
    s += W_KEY[k];
  }
  return s;
}

/** 包原来的字段（槽位没写变体时的那一条，没有条件）：没有对应字段的槽位 undefined */
function legacy<K extends TextSlot>(slot: K, p: ContentPack): TextSlots[K] | undefined {
  const h = p.hud;
  const v: Partial<TextSlots> = {
    prompts: h.prompts, buttons: p.menu.buttons, cta: { start: h.cta.start, back: h.cta.back }, feed: h.feed, rating: h.rating,
    tabs: p.screens.tabs.map((l, i): TabRow => [l, p.screens.tabIcons?.[i]]), band: [p.game.chapter.band],
  };
  return v[slot] as TextSlots[K] | undefined;
}

/** 挑中的那一条：值、具体程度、是不是包原来的字段（legacy：调用方据此判断「没人给这一屏专门写」，例如世界地图的页签回落到地图筛选类别） */
export interface TextPick<T> { value: T; score: number; legacy: boolean }
/** 某个槽位在这一屏取哪一条（M12b-61，带出处）：见文件头 */
export function textPick<K extends TextSlot>(slot: K, r: Resolved | null, p: ContentPack = pack()): TextPick<TextSlots[K]> | undefined {
  const groups = r ? screenGroups(r) : new Set<string>();
  const own = (p.texts?.[slot] ?? []) as TextVariant<TextSlots[K]>[];
  const gen = (GENERIC.texts[slot] ?? []) as TextVariant<TextSlots[K]>[];
  const old = legacy(slot, p);
  const oldV: TextVariant<TextSlots[K]> | null = old !== undefined ? { value: old } : null;
  const cands: TextVariant<TextSlots[K]>[] = [...own, ...(oldV ? [oldV] : []), ...gen];
  let best: TextVariant<TextSlots[K]> | undefined, bs = -1;
  for (const c of cands) {
    const s = r ? score(c.when, r, groups) : c.when ? -1 : 0;
    if (s > bs) { bs = s; best = c; }
  }
  return best ? { value: best.value, score: bs, legacy: best === oldV } : undefined;
}
/** 某个槽位在这一屏取哪一条（M12b-61）：见文件头。r 为 null 时只看没有条件的（包的通用变体 → 包原来的字段 → GENERIC 的通用变体） */
export const textFor = <K extends TextSlot>(slot: K, r: Resolved | null, p: ContentPack = pack()): TextSlots[K] | undefined => textPick(slot, r, p)?.value;

/** 包在某个槽位有没有不带条件的通用值（check-content：新槽位每包至少一条；有原来字段的槽位算有） */
export const hasGenericText = (slot: TextSlot, p: ContentPack) => legacy(slot, p) !== undefined || !!p.texts?.[slot]?.some((v) => !v.when);

/**
 * 说出来的那句台词（M12b-61，字幕 / 对话托盘 / 对话页头共用）：cnt.textLength = word 时是单词感叹（bark，不写说话人，hi-fi-rush#19）；
 * el.subtitle.untranslated 开着时是外语原文（original 的第 1 项，obra-dinn#34）；否则内容包的 hud.subtitle
 */
export function spokenLine(r: Resolved, p: ContentPack = pack()): { who: string; line: string } {
  const [who, line] = p.hud.subtitle;
  if (r.str('cnt.textLength', '') === 'word') return { who: '', line: textFor('bark', r, p) ?? line };
  const orig = r.bool('el.subtitle.untranslated') ? textFor('original', r, p)?.[0] : undefined;
  return { who, line: orig ?? line };
}
