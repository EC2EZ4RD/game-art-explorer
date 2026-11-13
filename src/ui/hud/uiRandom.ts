import { hashString, mulberry32, type Rng } from '../../core/rng';
import { uiParams } from '../../dims/registry';
import type { ParamDef, Val, Values } from '../../dims/types';
import { isStyleKey } from '../../content/uiKnowledge';
import { isMonetizationValue, MONETIZATION_PARAM_GROUPS, presetCarriesMonetization } from '../../content/uiMonetization';
import { HUD_STYLE_DEF, SELECTORS, SKIN_PRESET_BY_VALUE } from '../../hud/sys/register';
import { PRESET } from '../../hud/sys/spec';

/*
 * UI 的受约束随机（G5，docs/t1-tool-knowledge.md）：顶栏"🎲 随机探索"面板解锁"游戏 UI"后，在 UI 参数里随机。
 * 探索台原来只随机画面维度（Explore.tsx 的 RANDOM_DIMS 不含 hud），这里新写：
 *   - 只抽 ui.random = true 的体系参数与起点选择器（皮肤用皮肤预设，uip.* 用各自的预设）；
 *   - 分五块，随机面板里可以单独开关：起点（皮肤、关键词、品类布局）/ 风格细节 / 界面（界面模板、版式模式、场景容器：会换整屏）/ 版式与内容 / 平台与情境；
 *     默认只抽起点 + 风格细节——探索风格时不该每点一次就换到登录、选服、邮件这些整屏界面；
 *   - 跳过商业化（src/content/uiMonetization.ts 的 isMonetizationValue）：商业化界面模板、cnt.screen = screen.liveops、商业化子功能、商业化流程演示、
 *     手游抽卡金框皮肤 / 付费档配色 / 抽卡稀有度色阶 / 顶栏货币 / 红点这几个取值，ops.*（运营与商业化）整组不抽；
 *     界面模板 / 版式模式 / 场景容器还要看预设层会带进什么（presetCarriesMonetization：手游主界面带运营入口、顶栏货币与红点，邮件带红点……），带商业化取值的整个预设不抽；
 *     品类布局不按这条筛（卡牌布局的顶栏金币是玩法里的货币）；
 *   - 也不抽：商业模式（它决定运营层：红点、礼包入口）、节日 / 活动（运营活动皮肤）、无障碍叠加与 a11y.*（玩家选项）、chk.*（工具）、
 *     cnt.pack（示例内容包是工具参数）、cnt.elements（信息元素集合由品类布局 / 界面模板给，随机抽 0–2 个会把 HUD 抽空）、颜色与渐变（随机色值几乎都不可读，色彩靠 col.* 的策略类参数变）；
 *   - choice 均匀抽（不抽"跟随"）；range / int 用 ui.randomRange（没有时 min–max），按步长取整；multi 抽 0–2 项；toggle 一半一半；
 *   - 起点选择器有三分之一的机会回到"跟随 / 不套用"（界面 = 局内 HUD），免得每次都套满容器、版式；皮肤总是抽一套具体的；
 *   - amount = 每个参数被改动的概率；一个参数都没抽中时至少改一项，免得点了没反应；
 *   - 同一 seed 结果相同：每个参数用 mulberry32(seed ^ hash(参数 id)) 单独取随机数，开关别的块不影响这一块的结果，以后加参数也不会让旧种子整体错位。
 * 归属：B4。
 */

export type UiRandomPart = 'start' | 'style' | 'screen' | 'layout' | 'context';

export const UI_RANDOM_PARTS: { id: UiRandomPart; label: string; desc: string }[] = [
  { id: 'start', label: '起点', desc: '皮肤、设计关键词、品类布局（各用自己的预设）' },
  { id: 'style', label: '风格细节', desc: '形、线、面、饰、色彩策略、字体、素材槽、组件、状态、动效（叠在皮肤上）' },
  { id: 'screen', label: '界面', desc: '界面模板、版式模式、场景容器（会换整屏：背包、地图、登录、设置……；默认不抽）' },
  { id: 'layout', label: '版式与内容', desc: '结构与版式、层级、内容、信息元素、与世界的关系、交互、流程' },
  { id: 'context', label: '平台与情境', desc: '平台预设与设备、画幅、方向、输入方式（会改整个画幅）' },
];

export const UI_RANDOM_DEFAULT: ReadonlySet<UiRandomPart> = new Set<UiRandomPart>(['start', 'style']);

/** 起点块的选择器（各用自己的预设）；商业模式、节日、无障碍叠加不抽 */
const START_KEYS: ReadonlySet<string> = new Set([HUD_STYLE_DEF.id, SELECTORS.keyword, SELECTORS.layout]);
/** 界面块：会换掉整屏的选择器（单独一块，默认不抽） */
const SCREEN_KEYS: ReadonlySet<string> = new Set([SELECTORS.screen, SELECTORS.pattern, SELECTORS.container]);
const SKIP_KEYS: ReadonlySet<string> = new Set([SELECTORS.business, SELECTORS.theme, SELECTORS.overlay, 'cnt.pack', 'cnt.elements']);
const SKIP_GROUPS: ReadonlySet<string> = new Set(['a11y', 'chk', ...MONETIZATION_PARAM_GROUPS]);
/** 起点选择器回到"跟随 / 不套用"的概率 */
const NEUTRAL_P = 1 / 3;

/** 这个参数属于哪一块；null = 不参与随机 */
export function uiRandomPartOf(p: ParamDef): UiRandomPart | null {
  if (!p.ui?.random || SKIP_KEYS.has(p.id) || SKIP_GROUPS.has(p.ui.group) || SKIP_GROUPS.has(p.id.split('.')[0])) return null;
  if (START_KEYS.has(p.id)) return 'start';
  if (SCREEN_KEYS.has(p.id)) return 'screen';
  if (p.id === SELECTORS.platform) return 'context';
  if (p.id.startsWith('uip.')) return null;
  if (p.kind === 'color' || p.kind === 'gradient') return null;
  if (isStyleKey(p.id)) return 'style';
  if (p.ui.group === 'ctx') return 'context';
  return 'layout';
}

/** 这几块一共会在哪些参数里抽（随机面板显示数量用） */
export function uiRandomCandidates(parts: ReadonlySet<UiRandomPart> = UI_RANDOM_DEFAULT): ParamDef[] {
  return uiParams().filter((p) => { const part = uiRandomPartOf(p); return !!part && parts.has(part); });
}

/** 能抽的取值：去掉"跟随"、商业化取值；界面块的选择器再去掉预设层会带进商业化取值的预设 */
const choicesOf = (p: ParamDef): string[] => (p.options ?? []).map((o) => o.value).filter((v) => {
  if (v === 'auto' || isMonetizationValue(p.id, v)) return false;
  if (SCREEN_KEYS.has(p.id)) { const pr = PRESET.get(v); if (pr && presetCarriesMonetization(pr)) return false; }
  return true;
});

const decimals = (step: number) => { const s = String(step); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };

function randomValue(p: ParamDef, rng: Rng): Val | undefined {
  if (p.ui?.scope === 'start') {
    const opts = choicesOf(p).filter((v) => v !== 'none');
    // 皮肤总是抽一套具体的；其余起点有一定机会回到默认（跟随 / 不套用 / 局内 HUD）
    if (p.id !== HUD_STYLE_DEF.id && (rng() < NEUTRAL_P || !opts.length)) return p.default;
    return opts.length ? opts[Math.floor(rng() * opts.length)] : undefined;
  }
  switch (p.kind) {
    case 'choice': {
      const opts = choicesOf(p);
      return opts.length ? opts[Math.floor(rng() * opts.length)] : undefined;
    }
    case 'toggle':
      return rng() < 0.5;
    case 'range':
    case 'int': {
      const [lo, hi] = p.ui?.randomRange ?? [p.min ?? 0, p.max ?? 1];
      const step = p.step ?? (p.kind === 'int' ? 1 : 0.01);
      const x = Math.round((lo + (hi - lo) * rng()) / step) * step;
      const clamped = Math.min(Math.max(x, Math.min(lo, hi)), Math.max(lo, hi));
      return p.kind === 'int' ? Math.round(clamped) : +clamped.toFixed(decimals(step));
    }
    case 'multi': {
      const opts = choicesOf(p);
      const n = Math.min(opts.length, Math.floor(rng() * 3));
      // 部分洗牌取前 n 项（0 项 = 空集）
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (opts.length - i));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return opts.slice(0, n).join(',');
    }
    default:
      return undefined;
  }
}

const rngFor = (seed: number, id: string): Rng => mulberry32((seed ^ hashString(id)) >>> 0);

/**
 * 在 UI 参数里随机：返回要写的键（交给 setMany，与画面随机合成一步撤销）。
 * values 目前只用来保证"至少改了一项"时挑一个和当前不同的值；parts 默认 = 起点 + 风格细节。
 */
export function randomizeUi(values: Values, seed: number, amount: number, parts: ReadonlySet<UiRandomPart> = UI_RANDOM_DEFAULT): Values {
  const out: Values = {};
  const cands = uiRandomCandidates(parts);
  for (const p of cands) {
    const rng = rngFor(seed, p.id);
    if (rng() > amount) continue;
    const v = randomValue(p, rng);
    if (v !== undefined) out[p.id] = v;
  }
  if (!Object.keys(out).length && cands.length) {
    // 一项都没抽中：按种子挑一个参数，取一个和当前不同的值
    const pickRng = rngFor(seed, '#fallback');
    for (let tries = 0; tries < 8; tries++) {
      const p = cands[Math.floor(pickRng() * cands.length)];
      const v = randomValue(p, rngFor(seed + tries + 1, p.id));
      if (v !== undefined && v !== (values[p.id] ?? p.default)) { out[p.id] = v; break; }
    }
  }
  return out;
}

/**
 * 场景图库标题处的 🎲（UI 模式随机皮肤，docs/workbench-redesign.md §10）：在皮肤里随机挑一套，和现在的不同；
 * 跳过商业化取值（与随机探索同一个口径，isMonetizationValue）。返回皮肤预设 id（skin.*）
 */
export function randomSkinId(current: string | null | undefined, seed = Date.now()): string | null {
  const opts = choicesOf(HUD_STYLE_DEF).filter((v) => v !== 'none' && v !== current);
  if (!opts.length) return null;
  const v = opts[Math.floor(rngFor(seed, '#skin')() * opts.length)];
  return SKIN_PRESET_BY_VALUE.get(v)?.id ?? null;
}
