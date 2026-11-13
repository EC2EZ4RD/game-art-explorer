import { registerKeyValidator, registerParams, registerUiKeyTest } from '../../dims/registry';
import type { CapStatus, OptionDef, ParamDef, ParamKind, PortLevel, Val } from '../../dims/types';
import { SKINS } from '../skins';
import { ELEMENT_OWN, ELX_PARAMS, optionsOf, PRESET, presetsOf, SPEC, SPEC_PARAM, SPEC_PARAMS, type PresetKind, type Raw, type SpecParam } from './spec';

/*
 * 把 UI 参数体系登记进参数注册表（dim = hud，带 ui 元数据）：
 *   - 260 个体系参数（id 与调研 JSON 一致，配方 / 收藏 / 参考卡都用同一套 id）；
 *   - 起点选择器：皮肤（沿用 hud.style）、平台、商业模式、品类布局、界面模板、版式、容器、关键词、节日、无障碍叠加；
 *   - 覆盖键（vis.corner@button）与元素实例键（el.minimap.screenAnchor）不登记，只注册校验函数。
 */

export const toVal = (v: Raw | undefined): Val => (Array.isArray(v) ? v.join(',') : v === null || v === undefined ? '' : v);

const KIND: Record<SpecParam['kind'], ParamKind> = { choice: 'choice', range: 'range', int: 'int', toggle: 'toggle', multi: 'multi', color: 'color', gradient: 'gradient' };
const NEEDS_STATUS: Record<string, CapStatus> = { asset: 'needsAsset', scene: 'partial', sim: 'partial', flow: 'partial' };

function specToDef(p: SpecParam): ParamDef {
  const range = p.range;
  const opts = optionsOf(p);
  const options: OptionDef[] | undefined = opts.length
    ? opts.map((o) => ({
      value: String(o.value),
      label: o.label,
      desc: [o.desc, o.refs?.length ? `参考：${o.refs.join('、')}` : ''].filter(Boolean).join('　'),
      status: o.needs ? NEEDS_STATUS[o.needs] : undefined,
      port: o.godotLevel ? { godotLevel: o.godotLevel as PortLevel } : undefined,
    }))
    : undefined;
  return {
    id: p.id,
    dim: 'hud',
    group: p.group,
    label: p.label,
    kind: KIND[p.kind],
    min: range?.min,
    max: range?.max,
    step: range?.step,
    unit: range?.unit,
    options,
    // 体系参数在 Values 里一律以 'auto'（跟随）起步；参数自己的默认值是解析的第一层（resolve.ts）
    default: 'auto',
    explain: {
      plain: p.plain ?? p.label,
      lookAt: p.lookAt,
      ends: p.ends?.length === 2 ? [p.ends[0], p.ends[1]] : undefined,
      tech: p.impl,
    },
    rebuild: 'none',
    port: p.godot ? { godot: p.godot, godotLevel: p.godotLevel as PortLevel } : undefined,
    status: p.status === 'planned' ? 'todo' : p.status === 'partial' ? 'partial' : undefined,
    ui: {
      group: p.group, scope: p.scope, tab: p.tab, tier: p.tier, cls: p.cls, fallback: p.fallback, when: p.activeWhen,
      overrideAt: p.overrideAt, merge: p.merge, preview: p.preview, random: p.random, randomRange: p.randomRange,
      milestone: p.milestone, needs: p.needs, starter: p.starter, appliesTo: p.appliesTo,
    },
  };
}

/* ---------------- 起点选择器 ---------------- */

/** 皮肤预设 → hud.style 的取值（14 个旧皮肤沿用旧 id，配方 / 收藏不受影响） */
export const skinValueOf = (presetId: string) => {
  const p = presetsOf('skin').find((x) => x.id === presetId);
  return p?.existing ?? presetId.replace(/^skin\./, '');
};
export const SKIN_PRESET_BY_VALUE = new Map(presetsOf('skin').map((p) => [skinValueOf(p.id), p]));

const presetOptions = (kind: PresetKind, lead: OptionDef[] = []): OptionDef[] => [
  ...lead,
  ...presetsOf(kind).map((p) => ({ value: p.id, label: p.label, desc: p.desc })),
];

const START = (id: string, label: string, plain: string, options: OptionDef[], def: Val, kind: ParamKind = 'choice'): ParamDef => ({
  id, dim: 'hud', group: 'start', label, kind, options, default: def, rebuild: 'none',
  explain: { plain },
  ui: { group: 'start', scope: 'start', tab: 'start', tier: 1, cls: 'resolve', random: true },
});

export const SELECTORS = {
  platform: 'uip.platform', business: 'uip.business', layout: 'uip.layout', screen: 'uip.screen',
  pattern: 'uip.pattern', container: 'uip.container', keyword: 'uip.keyword', theme: 'uip.theme', overlay: 'uip.overlay',
} as const;

const SKIN_OPTIONS: OptionDef[] = [
  { value: 'none', label: '不显示' },
  ...presetsOf('skin').map((p): OptionDef => {
    const legacy = SKINS.find((s) => s.id === p.existing);
    return { value: skinValueOf(p.id), label: p.label, desc: p.desc, prompt: legacy?.prompt, status: legacy ? 'live' : 'partial' };
  }),
];

export const HUD_STYLE_DEF: ParamDef = {
  id: 'hud.style', dim: 'hud', group: '游戏 UI 样本', label: '皮肤', kind: 'choice', default: 'neobrutal', rebuild: 'none',
  options: SKIN_OPTIONS,
  explain: {
    plain: '整套 UI 的形与面：面板形状、边框、阴影、字体、配色骨架。它是 UI 参数体系的"皮肤层"，选中后每一项仍可单独改。',
    lookAt: 'UI 与场景的色彩、线条是否属于同一套语言',
    tech: 'HUD 画在与画布同分辨率的 Canvas2D 上，在后处理最后一步（OUTPUT）合成：截图与 A/B 都带着它；像素化不影响 UI 清晰度；画幅黑边以内排版；毛玻璃用遮罩在合成时换成模糊过的画面',
  },
  port: { godot: 'Theme 资源（StyleBoxFlat 的 border / shadow / corner + 字体 + 颜色常量）', godotLevel: 'builtin' },
  ui: { group: 'start', scope: 'start', tab: 'start', tier: 1, cls: 'resolve', random: true },
};

const SELECTOR_DEFS: ParamDef[] = [
  START(SELECTORS.platform, '平台', '设备、画幅、输入方式与基准字号的起点（之后每项都能单独改）', presetOptions('platform', [{ value: 'auto', label: '跟随（PC）' }]), 'auto'),
  START(SELECTORS.business, '商业模式', '决定运营层：买断制没有红点和礼包，免费手游满屏入口', presetOptions('business', [{ value: 'auto', label: '跟随（买断）' }]), 'auto'),
  START(SELECTORS.layout, '品类布局', '局内 HUD 放哪些信息元素、放在哪；默认跟随"游戏条件"里的品类', presetOptions('layout', [{ value: 'auto', label: '跟随画面的品类' }, { value: 'none', label: '不套用' }]), 'auto'),
  START(SELECTORS.screen, '界面', '看哪一屏：局内 HUD，或登录、背包、商店、结算等界面模板', presetOptions('screen', [{ value: 'auto', label: '局内 HUD' }]), 'auto'),
  START(SELECTORS.pattern, '版式模式', '常用版式：左列表右详情、网格陈列、扇形手牌、径向轮盘、海报', presetOptions('pattern', [{ value: 'none', label: '不套用' }]), 'none'),
  START(SELECTORS.container, '场景容器', '把整屏 UI 做成世界里的东西：书、卷轴、手机、手持终端、书桌、柜台', presetOptions('container', [{ value: 'none', label: '不套用' }]), 'none'),
  START(SELECTORS.keyword, '设计关键词', '材质与母题（原始、奢华、赛博、国潮、水墨……），只改素材槽与装饰', presetOptions('keyword', [{ value: 'auto', label: '跟随皮肤' }, { value: 'none', label: '不用' }]), 'auto'),
  START(SELECTORS.theme, '节日 / 活动', '在皮肤之上换强调色与装饰（春节、圣诞、樱花、万圣节、赛季）', presetOptions('theme', [{ value: 'none', label: '不用' }]), 'none'),
  START(SELECTORS.overlay, '无障碍叠加', '大字、色盲友好、低刺激：不改皮肤，A/B 时可以开关比较', presetOptions('overlay'), '', 'multi'),
];

/* ---------------- 覆盖键与元素实例键 ---------------- */

/** 覆盖键的组件 / 部件名（<参数>@<名字>）：elements/core.ts 的 e.part(名字) 按这些名字查；M12a-01 加了 key（按键提示）、hudBar（贴边条，M12a-16），M12a-30 加了 mapLabel（地图地名牌） */
const COMPONENTS = ['panel', 'modal', 'button', 'key', 'tab', 'nav2', 'bar', 'hudBar', 'slot', 'tooltip', 'titleBar', 'listRow', 'nameplate', 'dialog', 'minimapFrame', 'icon', 'avatar', 'badge', 'plate', 'card', 'node', 'input', 'title', 'name', 'progress', 'rank', 'stateTag', 'mapLabel', 'body', 'frame', 'core', 'well', 'earTab', 'keyBadge', 'panelArt', 'groupHeader', 'slotGroup'];
const ELX_SUFFIX = new Set(ELX_PARAMS.map((p) => p.id.slice(4)));
const ELEMENT_OWN_IDS = new Set(ELEMENT_OWN.map((p) => p.id));

/**
 * 元素实例 id（M12b-04，§2）：cnt.elements 里同一元素可以写第二 / 第三份 el.<元素>#2、el.<元素>#3（Hades 的两条 Boss 条、StS 顶栏数字 + 脚下血条的 el.vitals#2）。
 * baseId = 去掉实例号的元素 id（找 ElementDef、参数表里元素自己的参数都按它）；instanceNo = 第几份（没写 = 1）。
 * 实例键 el.<元素>#2.<后缀> 没给时回到 elx.* / 参数表默认（不继承第一份：resolve.ts 的 elKey / el），按目标覆盖 <参数>@el.<元素>#2 也只管这一份
 */
export const INSTANCE_MAX = 3;
export const baseId = (id: string): string => { const i = id.indexOf('#'); return i < 0 ? id : id.slice(0, i); };
export const instanceNo = (id: string): number => { const i = id.indexOf('#'); return i < 0 ? 1 : Number(id.slice(i + 1)) || 1; };
/**
 * 元素的默认屏幕锚点（elements/core.ts 的 registerElement 填）：sys/check.ts 的 C-group-split 判断组员分没分在几个锚点用（检查在解析阶段跑，不引元素注册表；
 * 元素模块没加载时是空表，只比显式给的锚点，B6 审查修复 ㉑）
 */
export const ELEMENT_ANCHORS = new Map<string, string>();
/** 元素 id 或实例 id（el.party、el.party#2 / #3） */
export const ELEMENT_ID_RE = /^el\.[a-zA-Z]+(#[23])?$/;

/**
 * el.<元素>.<后缀>：后缀是 elx.* 模板参数，或元素自己的参数（el.minimap.form）。
 * 画法级键 el.<元素>.<画法>.<后缀>（M12a-14，el.threat.bossBar.screenAnchor）：画法要在 el.<元素>.form 的词表里，后缀同上；form 字段带回这种画法。
 * 实例键（M12b-04）el.<元素>#2.<后缀> / el.<元素>#2.<画法>.<后缀>：element = 实例 id，param 照旧是参数表里的（元素自己的参数按基 id 找）
 */
export function parseElementKey(k: string): { element: string; suffix: string; param: string; form?: string } | null {
  const m3 = /^el\.([a-zA-Z]+)(#[23])?\.([a-zA-Z0-9]+)\.(\w+)$/.exec(k);
  if (m3) {
    const base = `el.${m3[1]}`, element = base + (m3[2] ?? '');
    const fp = SPEC_PARAM.get(`${base}.form`);
    if (!fp || !optionsOf(fp).some((o) => String(o.value) === m3[3])) return null;
    const own = `${base}.${m3[4]}`;
    if (ELEMENT_OWN_IDS.has(own)) return { element, suffix: m3[4], param: own, form: m3[3] };
    if (ELX_SUFFIX.has(m3[4])) return { element, suffix: m3[4], param: `elx.${m3[4]}`, form: m3[3] };
    return null;
  }
  const m = /^el\.([a-zA-Z]+)(#[23])?\.(\w+)$/.exec(k);
  if (!m) return null;
  const base = `el.${m[1]}`, element = base + (m[2] ?? ''), own = `${base}.${m[3]}`;
  if (ELEMENT_OWN_IDS.has(own)) return { element, suffix: m[3], param: own };
  if (ELX_SUFFIX.has(m[3])) return { element, suffix: m[3], param: `elx.${m[3]}` };
  return null;
}

/** 界面模板目标（tpl.<模板 id>）：逐界面的部件覆盖 <参数>@tpl.<id>，只在这一屏是当前界面时生效（resolve.ts 的「本屏手动」，整合修复 X#8） */
export const SCREEN_TARGET_RE = /^tpl\.\w+$/;

/** <参数>@<目标>：目标是组件、角色或信息元素（M12b-04 起也可以是元素实例 el.<元素>#2），或界面模板 tpl.<id>（这一屏的部件覆盖） */
export function parseOverrideKey(k: string): { param: string; target: string } | null {
  const i = k.indexOf('@');
  if (i < 0) return null;
  const param = k.slice(0, i), target = k.slice(i + 1);
  if (!SPEC_PARAM.has(param)) return null;
  if (COMPONENTS.includes(target) || ELEMENT_ID_RE.test(target) || SCREEN_TARGET_RE.test(target)) return { param, target };
  return null;
}

/** 覆盖键与元素实例键的可读名字（"生命 / 护盾 / 体力 · 数值标注"、"数值图形 @ 生命 / 护盾 / 体力"；实例键带「#2」） */
export function uiKeyLabel(k: string): string | undefined {
  const elLabel = (id: string) => (SPEC_ELEMENTS.get(baseId(id)) ?? baseId(id)) + (instanceNo(id) > 1 ? ` #${instanceNo(id)}` : '');
  const e = parseElementKey(k);
  // 画法名按基元素的 form 参数找（B6 审查修复 ⑮：实例的画法级键 el.threat#2.bossBar.screenAnchor 原来拿 el.threat#2.form 去查、查不到就抛错，React 面板整块崩）
  const fp = e && SPEC_PARAM.get(`${baseId(e.element)}.form`);
  if (e) return `${elLabel(e.element)}${e.form ? ` · ${(fp ? optionsOf(fp).find((o) => String(o.value) === e.form)?.label : undefined) ?? e.form}` : ''} · ${SPEC_PARAM.get(e.param)?.label ?? e.suffix}`;
  const o = parseOverrideKey(k);
  // 逐界面的覆盖写成「参数 · 只在 背包」（不露模板 id）
  if (o && SCREEN_TARGET_RE.test(o.target)) return `${SPEC_PARAM.get(o.param)?.label ?? o.param} · 只在 ${(PRESET.get(o.target)?.label ?? '这一屏').replace(/（.*?）/g, '')}`;
  if (o) return `${SPEC_PARAM.get(o.param)?.label ?? o.param} @ ${o.target.startsWith('el.') ? elLabel(o.target) : o.target}`;
  return undefined;
}
const SPEC_ELEMENTS = new Map((SPEC.vocab.elements as unknown as { id: string; label: string }[]).map((x) => [x.id, x.label]));

export const isUiDynamicKey = (k: string) => !!parseElementKey(k) || !!parseOverrideKey(k);

let done = false;
export function registerUiSystem() {
  if (done) return;
  done = true;
  registerParams([HUD_STYLE_DEF, ...SELECTOR_DEFS, ...SPEC_PARAMS.map(specToDef)]);
  registerKeyValidator(isUiDynamicKey);
  registerUiKeyTest(isUiDynamicKey);
}
