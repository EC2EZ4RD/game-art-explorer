import type { Resolved } from '../sys/resolve';
import { GENERIC } from './generic';
import { pack } from './index';
import type { ContentPack, SampleKind, TypedSamples } from './types';

/*
 * 按界面的结构化样本（M12b-62，§2 的 samplesFor）：模板里的集合与详情原来一律取背包物品（menu.items + 两根属性条 + 「使用 / 丢弃」），
 * 技能树、图鉴、名册、地点、任务、指令、局内菜单、捏人、配方、建造、经营、角色都画成背包。现在按这一屏要的类别取：
 *   sampleKind(r)：cnt.subtype → cnt.screen 推出类别（对不上的 = items，原来的物品）；
 *   samplesFor(kind, p)：本包 screens 里的同类 → GENERIC.samples 的同类（24 个包都写全了，GENERIC 是新包 / 漏写时的回落；check-content 逐包核对）。
 * 新画法取样本一律经这两个函数（B7 的卡、B8 的节点 / 详情 / 列表、B9 的选中面板 / 表单、B6 的名册 / 追踪）。
 * Godot：样本导出成 JSON Resource（集合名 = 这里的 kind），模板场景按集合名取（迁移说明见 godotHud.ts 的 m12bB2Notes「示例内容（M12b-62）」行）。
 */

/**
 * 子功能 → 样本类别（模板的 cnt.subtype）。整备 / 纸娃娃（loadout，「角色剪影周围一圈装备槽」）= 物品（中期审查修复 ①：B2 记成名册，装备槽与详情里画成了队员）——
 * 明确写成 items，不落到界面类型（cnt.screen = screen.character 会推成角色）；名册只给布阵（formation），整备界面画机兵 / 队员的复刻写 cnt.subtype = formation
 */
const SUB_KIND: Record<string, SampleKind> = {
  skill: 'talents', collection: 'codex', formation: 'roster', loadout: 'items', worldmap: 'locations', quest: 'quests', dialogueWheel: 'commands',
  pause: 'pauseMenu', menu: 'pauseMenu', create: 'createRows', forge: 'recipes', home: 'builds', faction: 'characters', hero: 'characters',
};
/**
 * 界面类型 → 样本类别（cnt.screen；子功能没对上时看它）。对话界面（screen.dialogue）不映射（中期审查修复 ③：B2 映射成战斗指令，NPC / 外交屏的选项列表写成「攻击 / 移动 / 防守」）——
 * 列表回落到原来的物品 / 选项；指令只给对话环（子功能 dialogueWheel）
 */
const SCREEN_KIND: Record<string, SampleKind> = {
  'screen.skilltree': 'talents', 'screen.codex': 'codex', 'screen.map': 'locations', 'screen.journal': 'quests', 'screen.pause': 'pauseMenu',
  'screen.craft': 'recipes', 'screen.build': 'builds', 'screen.character': 'characters', 'screen.manage': 'economy',
};

/** 这一屏要哪一类样本（M12b-62）：子功能优先、再看界面类型；都没对上时 items（背包物品） */
export function sampleKind(r: Resolved): SampleKind {
  return SUB_KIND[r.str('cnt.subtype', '')] ?? SCREEN_KIND[r.str('cnt.screen', '')] ?? 'items';
}

/** 集合名 → 结构化样本（本包 → GENERIC 同类）；p 默认当前包 */
export function samplesFor<K extends keyof TypedSamples>(kind: K, p: ContentPack = pack()): TypedSamples[K] {
  const own = p.screens[kind] as TypedSamples[K] | undefined;
  return own && (!Array.isArray(own) || own.length) ? own : GENERIC.samples[kind];
}

/** 包里缺了哪些结构化样本（check-content 用：24 个包要写全） */
export const SAMPLE_KEYS: (keyof TypedSamples)[] = ['talents', 'codex', 'roster', 'locations', 'mapFilters', 'questDetail', 'commands', 'pauseMenu', 'createRows', 'recipes', 'builds', 'dossier', 'economy', 'characters'];
export const missingSamples = (p: ContentPack): string[] => SAMPLE_KEYS.filter((k) => { const v = p.screens[k]; return v === undefined || (Array.isArray(v) && !v.length); });
