import { RECIPE_MAP } from '../../content/recipes';
import { isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { applyPreset, fromArtOptions } from '../../hud/sys/apply';
import { SELECTORS, skinValueOf } from '../../hud/sys/register';
import { PRESET, presetsOf } from '../../hud/sys/spec';
import * as A from '../../state/actions';
import * as L from '../../state/layers';
import { useStore } from '../../state/store';
import { isMonetizationPreset } from '../../content/uiMonetization';
import { keepPreset } from '../hud/monetizationData';
import { pairedSkins, skinShort } from '../deck/deckText';

/*
 * 皮肤行的选项（轨道 D，docs/workbench-redesign.md §5.3）：
 *   默认（场景自带的皮肤）→ 配套当前画面（同一媒介 / 中性 + 配方写的配套皮肤，≤3 个）→ 7 个家族的 38 个皮肤 →
 *   收起的「风格词 18 / 节日 5 / 成套 15」。
 * 每个选项都能算出「点了之后的参数」（用 A 的同一个合成函数 plan*，色板就画它），点击走 A 的套用动作（一步撤销、套完不算改动）。
 * 本文件不放组件（Fast Refresh）。
 */

/** 7 个家族（§5.3）。一个皮肤只归一个家族；UI 风格图谱的 12 个组有重叠，这里按皮肤的主要气质人工归一次 */
export const SKIN_FAMILIES: { id: string; label: string; skins: string[] }[] = [
  { id: 'dark', label: '暗色科幻', skins: ['skin.scifi', 'skin.holo', 'skin.military', 'skin.slant', 'skin.terminal', 'skin.synth'] },
  { id: 'flat', label: '明亮扁平', skins: ['skin.flat', 'skin.glass', 'skin.aero', 'skin.swiss', 'skin.mono', 'skin.thinGeo', 'skin.neumorph', 'skin.y2k'] },
  { id: 'paper', label: '手绘纸本', skins: ['skin.handdrawn', 'skin.parchment', 'skin.ink', 'skin.wa', 'skin.comic'] },
  { id: 'pixel', label: '像素', skins: ['skin.pixel', 'skin.pixelWood'] },
  { id: 'ornate', label: '古典华丽', skins: ['skin.darkGold', 'skin.ornate', 'skin.filigree', 'skin.darkHairline', 'skin.jrpg', 'skin.deco', 'skin.skeuo'] },
  { id: 'toon', label: '卡通潮流', skins: ['skin.cozy', 'skin.candy', 'skin.animeCard', 'skin.gacha', 'skin.persona', 'skin.memphis', 'skin.neobrutal', 'skin.constructivist'] },
  { id: 'neutral', label: '中性', skins: ['skin.greybox', 'skin.godotDefault'] },
];

/** 自检：38 个皮肤都归了家族、不重复、id 都在 */
export function familyProblems(): string[] {
  const out: string[] = [];
  const all = presetsOf('skin').map((p) => p.id);
  const seen = new Map<string, string>();
  for (const f of SKIN_FAMILIES) for (const s of f.skins) {
    if (!PRESET.has(s)) out.push(`家族「${f.label}」里的 ${s} 不存在`);
    if (seen.has(s)) out.push(`${s} 同时在「${seen.get(s)}」和「${f.label}」`);
    seen.set(s, f.label);
  }
  for (const s of all) if (!seen.has(s)) out.push(`皮肤 ${s} 没归家族`);
  return out;
}

export type SkinChoice =
  | { kind: 'default' }
  | { kind: 'skin'; id: string }
  | { kind: 'art'; id: string; harmony: string; label: string }
  | { kind: 'preset'; id: string };

export const choiceKey = (c: SkinChoice): string => (c.kind === 'default' ? 'default' : c.kind === 'art' ? `art:${c.harmony}:${c.id}` : c.id);

/** 色板下面的短名（≤5 字） */
export function choiceLabel(c: SkinChoice, short: (id: string) => string): string {
  if (c.kind === 'default') return '默认';
  return short(c.id);
}

/** 悬停提示（≤30 字的一句：皮肤名 + 说明的第一小句） */
export function choiceTip(c: SkinChoice): string {
  if (c.kind === 'default') return '场景自带的皮肤';
  const p = PRESET.get(c.id);
  const head = c.kind === 'art' ? `配套当前画面 · ${c.label} · ` : '';
  const desc = (p?.desc ?? '').split(/[。；;\n]/)[0];
  return `${head}${p?.label ?? c.id}${desc ? `\n${desc.length > 30 ? `${desc.slice(0, 29)}…` : desc}` : ''}`;
}

/** 配套当前画面（同一媒介、中性、配方写的配套皮肤），≤3 个，不含「刻意对比」 */
export function artChoices(origin: L.Origin): SkinChoice[] {
  const rid = L.recipeIdOf(origin);
  const r = rid ? RECIPE_MAP.get(rid) : undefined;
  if (!r) return [];
  const opts = fromArtOptions(r.id).filter((o) => o.harmony !== 'contrast');
  const ids = pairedSkins(r);
  return ids.map((id): SkinChoice => {
    const o = opts.find((x) => x.skin === id);
    return o ? { kind: 'art', id, harmony: o.harmony, label: o.label } : { kind: 'skin', id };
  });
}

/** 收起的三组：风格词 / 节日 / 成套（商业化的成套收在最后，keepPreset） */
export const WORD_GROUPS: { id: 'keyword' | 'theme' | 'recipe'; label: string }[] = [
  { id: 'keyword', label: '风格词' }, { id: 'theme', label: '节日' }, { id: 'recipe', label: '成套' },
];
export const wordPresets = (kind: 'keyword' | 'theme' | 'recipe') => presetsOf(kind).filter((p) => kind !== 'recipe' || keepPreset(p));
/** 成套 · 商业化：商业化的成套 + 商业化的案例屏（十连结果、七日签到；审查修复 5：原来只在已停用的 UiPresets 里能点到） */
export const moneyBundles = () => [...presetsOf('recipe').filter((p) => !keepPreset(p)), ...presetsOf('example').filter((p) => isMonetizationPreset(p.id))];

/** 预设名里的英文游戏名换成中文（芯片上显示；审查修复 24：成套的名字原来是「Hollow Knight 式线描花饰」） */
const ZH_GAME: [RegExp, string][] = [
  [/Celeste \/ Dead Cells/g, '蔚蓝 / 死亡细胞'], [/Night Call \/ Disco Elysium/g, '夜班电话 / 极乐迪斯科'], [/Control \/ Dead Space/g, '控制 / 死亡空间'],
  [/Hollow Knight/g, '空洞骑士'], [/Slay the Spire 2/g, '杀戮尖塔 2'], [/Slay the Spire/g, '杀戮尖塔'], [/Into the Breach/g, '陷阵之志'], [/Mini Metro/g, '迷你地铁'],
  [/Vampire Survivors/g, '吸血鬼幸存者'], [/Stardew Valley/g, '星露谷物语'], [/Stardew/g, '星露谷'], [/RimWorld/g, '环世界'], [/Hades/g, '哈迪斯'],
  [/Animal Crossing/g, '动物森友会'], [/Frostpunk/g, '冰汽时代'], [/Night Call/g, '夜班电话'], [/Detroit/g, '底特律'], [/Carcassonne/g, '卡卡颂'],
  [/Roguelite/g, '肉鸽'], [/ARPG/g, '动作 RPG'], [/F2P/g, '免费'],
];
export function zhPresetLabel(label: string): string {
  let s = label.replace(/（.*?）/g, '');
  for (const [re, zh] of ZH_GAME) s = s.replace(re, zh);
  // 中文名后面的「 式」去掉空格
  return s.replace(/([\u3400-\u9fff]) 式/g, '$1式').trim();
}

const skinRef = (id: string, extra?: Values, name?: string) => ({ id, value: skinValueOf(id), name: name ?? PRESET.get(id)?.label ?? id, extra });

/**
 * 点了这个选项之后的参数（纯函数，色板画它）：与 A 的套用动作同一个合成函数，不提交。
 * keepMine 按外壳开关传进来（「保留我的改动」开着时色板也保留手动样式，看到的和点下去一样）
 */
export function planChoice(values: Values, origin: L.Origin, c: SkinChoice, keepMine = false): Values | null {
  if (c.kind === 'default') return L.planSkin(values, origin, null, { keepMine }).values;
  if (c.kind === 'skin') return L.planSkin(values, origin, skinRef(c.id), { keepMine }).values;
  if (c.kind === 'art') return L.planSkin(values, origin, skinRef(c.id, { 'rel.harmony': c.harmony }), { keepMine }).values;
  const pr = PRESET.get(c.id);
  if (!pr) return null;
  if (pr.kind === 'keyword' || pr.kind === 'theme') return L.planWord(values, origin, pr.kind, pr.kind === 'keyword' ? SELECTORS.keyword : SELECTORS.theme, { id: pr.id, name: pr.label }).values;
  if (pr.kind === 'recipe') {
    const patch = applyPreset(pr.id, values, { isUi: isUiKey, scene: null });
    return patch ? L.planBundle(values, origin, { id: pr.id, kind: 'recipe', name: pr.label, set: patch.set }, { keepMine }).values : null;
  }
  return null;
}

/** 这个选项现在是不是选中的 */
export function isChoiceOn(c: SkinChoice, values: Values, origin: L.Origin): boolean {
  if (c.kind === 'default') return !origin.skin && !L.isModifiedKey('hud.style', values, origin);
  if (c.kind === 'skin') return A.isSkinOn(c.id);
  if (c.kind === 'art') return A.isSkinOn(c.id) && String(values['rel.harmony'] ?? '') === c.harmony;
  return A.isUiPresetOn(c.id);
}

/** 点选项：走 A 的套用（再点已选中的 = 退回下一层：皮肤 → 场景默认；风格词 / 节日 / 成套 → 去掉） */
export function pickChoice(c: SkinChoice, opts?: { keepMine?: boolean; scene?: { sky: string; paper: string } | null }) {
  const o = opts?.keepMine ? { keepMine: true } : undefined;
  if (c.kind === 'default') return A.applySkin(null, o);
  // 名字记皮肤自己的短名（色板下面写的那个）：「配套」只是排在前面的理由，不进名字（审查修复 25：原来记成「同一媒介 · 扁平 / Material」）。
  // 再点已选中的 = 回到场景默认（与 A.pickSkin 同一个判断）
  if (c.kind === 'skin') return A.isSkinOn(c.id) && useStore.getState().origin.skin ? A.applySkin(null, o) : A.applySkin(c.id, { ...o, name: skinShort(c.id) });
  if (c.kind === 'art') return A.isSkinOn(c.id) ? A.applySkin(null, o) : A.applySkin(c.id, { ...o, extra: { 'rel.harmony': c.harmony }, name: skinShort(c.id) });
  return A.pickUiPreset(c.id, { ...o, scene: opts?.scene ?? null });
}
