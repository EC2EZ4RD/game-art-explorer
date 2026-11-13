/*
 * 手游商业化界面（商城、奖励、抽卡、签到、首充、通行证、转盘、红包、拍脸图、VIP / 充值……）的统一名单。
 * 用户 2026-10-15："手游的商城、奖励、抽卡这些不用学了"——这些模板与案例保留可用（代码与配方不删），
 * 但在界面模板选择器、案例列表里收进折叠组「商业化（不再扩充）」，随机探索不再抽到它们，也不再为它们写原则 / 复刻（docs/t1-tool-knowledge.md G5）。
 * 小文件、不依赖大数据，启动包里可以直接 import。
 *
 * 取舍：tpl.shopCounter（柜台商店，PC / 主机的商人柜台）是玩法里的交易，不算商业化；tpl.forge（锻造 / 变强）、tpl.lobby（手游主界面）也保留在常规列表。
 */

export const MONETIZATION_LABEL = '商业化（不再扩充）';

/** 界面模板（uip.screen 的 tpl.*） */
export const MONETIZATION_TEMPLATES: ReadonlySet<string> = new Set([
  'tpl.mall', 'tpl.gachaEntry', 'tpl.gachaResult', 'tpl.pass', 'tpl.checkin', 'tpl.firstPay',
  'tpl.wheel', 'tpl.redPacket', 'tpl.popupAd', 'tpl.reward',
]);

/** 真实游戏案例（UI 预设 example） */
export const MONETIZATION_EXAMPLES: ReadonlySet<string> = new Set(['ex.cnGacha', 'ex.cnCheckin']);

/** UI 配方（UI 预设 recipe）：起点层整套是手游商业化（抽卡金框皮肤 + 免费手游商业模式）的 */
export const MONETIZATION_RECIPES: ReadonlySet<string> = new Set(['rcp.mobileArpgF2P']);

/** 流程演示（src/hud/flow.ts 的 FLOWS 键，"动效"页的演示下拉框） */
export const MONETIZATION_FLOWS: ReadonlySet<string> = new Set(['gacha', 'purchase']);

/** 界面类型（cnt.screen）与子功能（cnt.subtype）里的商业化取值：随机探索跳过 */
export const MONETIZATION_SCREEN_TYPES: ReadonlySet<string> = new Set(['screen.liveops']);
export const MONETIZATION_SUBTYPES: ReadonlySet<string> = new Set([
  'mall', 'checkin', 'gacha10', 'topup', 'pass', 'welfare', 'wheel', 'popupAd', 'redPacket', 'reward', 'festival',
]);

/** 参数组：ops = 运营与商业化（随机探索整组跳过；"运营"页签照常可调） */
export const MONETIZATION_PARAM_GROUPS: ReadonlySet<string> = new Set(['ops']);

/**
 * 其它参数里的手游商业化取值（B4 补）：随机探索跳过，控件里照常可选。
 * 手游抽卡金框皮肤、付费档配色、抽卡稀有度色阶（R / SR / SSR）、每屏顶栏货币、红点。
 */
export const MONETIZATION_OPTION_VALUES: Readonly<Record<string, ReadonlySet<string>>> = {
  'hud.style': new Set(['gacha']),
  'col.coding': new Set(['paidTier']),
  'col.rarityScale': new Set(['gacha']),
  'flow.chrome': new Set(['topCurrency']),
  'st.newCue': new Set(['redDot']),
};

/** 这个 UI 预设（界面模板 / 案例 / UI 配方）属于商业化吗 */
export const isMonetizationPreset = (id: string) => MONETIZATION_TEMPLATES.has(id) || MONETIZATION_EXAMPLES.has(id) || MONETIZATION_RECIPES.has(id);

/** 这个参数取值属于商业化吗（随机探索用：界面模板、界面类型、子功能、流程演示、上面那几个取值、ops.* 参数） */
export function isMonetizationValue(key: string, value: unknown): boolean {
  const v = String(value ?? '');
  if (key === 'uip.screen') return MONETIZATION_TEMPLATES.has(v);
  if (key === 'cnt.screen') return MONETIZATION_SCREEN_TYPES.has(v);
  if (key === 'cnt.subtype') return MONETIZATION_SUBTYPES.has(v);
  if (key === 'chk.demo') return MONETIZATION_FLOWS.has(v);
  if (MONETIZATION_OPTION_VALUES[key]?.has(v)) return true;
  return MONETIZATION_PARAM_GROUPS.has(key.split('.')[0]);
}

/**
 * 随机探索里额外跳过的界面模板：本身不在商业化名单里（常规列表照常显示），但画出来是手游运营那一套——
 * tpl.quest 是日常 / 周常 + 底部活跃度宝箱轨道。
 */
export const MONETIZATION_RANDOM_SKIP: ReadonlySet<string> = new Set(['tpl.quest']);
/** 运营组里"运营入口 / 角标 / 海报"这几个才是商业化的；ops.actions（再来一局、分享）、ops.compliance（适龄提示、版号）不算 */
const MONETIZATION_OPS_KEYS: ReadonlySet<string> = new Set(['ops.entries', 'ops.badges', 'ops.poster']);
const isOff = (x: unknown) => x === undefined || x === null || x === '' || x === 'none' || x === 'auto' || x === 0 || x === false || (Array.isArray(x) && !x.length);

/**
 * 一个起点预设（界面模板、版式模式、场景容器……）会不会经由它的预设层带进商业化取值：
 * 商业化名单里的模板 / 案例 / 配方；预设值里有上面的商业化取值（顶栏货币、红点、付费档配色、商业化子功能……）或运营入口 / 角标 / 海报；
 * 起点层写了免费手游 / 广告商业模式或抽卡金框皮肤。随机探索据此跳过（uiRandom.ts），常规列表不受影响。
 */
export function presetCarriesMonetization(p: { id: string; values?: Record<string, unknown>; layers?: Record<string, string> }): boolean {
  if (isMonetizationPreset(p.id) || MONETIZATION_RANDOM_SKIP.has(p.id)) return true;
  for (const [k, x] of Object.entries(p.values ?? {})) {
    if (isOff(x)) continue;
    if (MONETIZATION_PARAM_GROUPS.has(k.split('.')[0])) { if (MONETIZATION_OPS_KEYS.has(k)) return true; continue; }
    const list = Array.isArray(x) ? x : typeof x === 'string' ? x.split(',') : [x];
    if (list.some((v) => isMonetizationValue(k, v))) return true;
  }
  const layers = Object.values(p.layers ?? {});
  return layers.some((x) => x === 'business.f2pMobile' || x === 'business.adSupported' || x === 'skin.gacha');
}
