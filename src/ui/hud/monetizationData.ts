import type { ParamDef } from '../../dims/types';
import { isMonetizationPreset, MONETIZATION_TEMPLATES } from '../../content/uiMonetization';
import { PRESET, type SpecPreset } from '../../hud/sys/spec';

/*
 * 商业化界面折叠用到的两个纯函数（T0，docs/workbench-redesign.md §11.0）：原来写在 Monetization.tsx 里，
 * 组件文件导出非组件会让 Fast Refresh 退回整页刷新，所以挪到这里。
 *   screenOptions()：UiPanel 起点页"界面"选择器的选项（按商业模式排序，去掉商业化模板）；
 *   keepPreset()：成套的过滤（商业化的成套 + 案例屏收进皮肤行「成套 · 商业化」，D 的 skinChoices.moneyBundles）。
 * 收尾 9：折叠组组件 Monetization.tsx 已删（没人引用；它列的商业化界面在胶片「+更多 › 运营」、成套 / 案例在「成套 · 商业化」、商业化参数在 UiPanel「更多 › 运营」都点得到）。
 */

const AUD_ORDER: Record<string, string[]> = { premium: ['premium', 'both', 'f2p'], f2p: ['f2p', 'both', 'premium'] };
const AUD_TAG: Record<string, string> = { premium: '（PC / 主机）', f2p: '（手游）', both: '' };

/**
 * 界面模板选择器的选项：按商业模式排序（M9a）——买断 / 赛季制先列 PC / 主机与通用模板，免费手游 / 广告先列手游模板；
 * 商业化模板（商城、抽卡、签到……）移出下拉框，收进下面的折叠组。current = 当前选中的模板：正是商业化模板时留着它（标"商业化"），免得控件显示成原始 id。
 */
export function screenOptions(p: ParamDef, business: string, current: string): ParamDef {
  const mobileFirst = business === 'business.f2pMobile' || business === 'business.adSupported';
  const order = AUD_ORDER[mobileFirst ? 'f2p' : 'premium'];
  const aud = (v: unknown) => PRESET.get(String(v))?.audience ?? 'both';
  const opts = [...(p.options ?? [])]
    .filter((o) => !MONETIZATION_TEMPLATES.has(o.value) || o.value === current)
    .map((o, i) => ({ o, i }))
    .sort((x, y) => (x.o.value === 'auto' ? -1 : y.o.value === 'auto' ? 1 : order.indexOf(aud(x.o.value)) - order.indexOf(aud(y.o.value)) || x.i - y.i))
    .map(({ o }) => (o.value === 'auto' ? o : { ...o, label: o.label + (MONETIZATION_TEMPLATES.has(o.value) ? '（商业化）' : AUD_TAG[aud(o.value)] ?? '') }));
  return { ...p, options: opts };
}

/** 预设列表（案例 chips）里要不要直接显示这一项（false = 收进折叠组） */
export const keepPreset = (p: SpecPreset): boolean => !isMonetizationPreset(p.id);
