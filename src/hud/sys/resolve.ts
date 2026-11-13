import type { Values } from '../../dims/types';
import { asList } from './cond';
import { applyRules } from './derive';
import { parseElementKey, parseOverrideKey, SELECTORS, SKIN_PRESET_BY_VALUE } from './register';
import { PRESET, presetsOf, SPEC_PARAM, SPEC_PARAMS, type PresetKind, type Raw, type SpecPreset } from './spec';

/*
 * 分层解析（docs/survey/09-ui-param-system.md 1.3 节）：
 *   参数默认值 → 平台 → 商业模式 → 品类布局 → 版式 → 容器 → 界面模板 → 皮肤 → 关键词 → 节日
 *   → 界面模板对皮肤键的本屏覆盖 → 模板 accent（只补空）→ 无障碍叠加 → 用户手动值 → 这一屏的手动值（<参数>@tpl.<当前界面>）
 *   → 默认类派生（只补"还是默认值"的键）→ 适配类派生（只有手动值挡得住）→ 纯派生与蕴含 → 无障碍规则 → 兜底
 * 每个值都带来源（层 + 预设 / 规则 id），参数行据此显示"跟随 · 皮肤：毛玻璃""派生：D-outline""手动"。
 * 引擎、HUD 绘制、描述导出一律读解析结果，不直接读 Values（'auto' 不能被当成 0）。
 */

export type Layer =
  | 'default' | 'ruleDefault' | 'platform' | 'business' | 'layout' | 'pattern' | 'container' | 'screen'
  | 'skin' | 'keyword' | 'theme' | 'screenOverride' | 'accent' | 'overlay' | 'user' | 'adapt' | 'derived' | 'a11y' | 'fallback';

export const LAYER_RANK: Record<Layer, number> = {
  fallback: -1, default: 0, ruleDefault: 1, platform: 2, business: 3, layout: 4, pattern: 5, container: 6, screen: 7,
  skin: 8, keyword: 9, theme: 10, screenOverride: 11, accent: 12, overlay: 13, user: 14, adapt: 15, derived: 16, a11y: 17,
};

export const LAYER_LABEL: Record<Layer, string> = {
  fallback: '兜底', default: '默认', ruleDefault: '派生', platform: '平台', business: '商业模式', layout: '品类布局', pattern: '版式',
  container: '容器', screen: '界面模板', skin: '皮肤', keyword: '关键词', theme: '节日', screenOverride: '界面模板', accent: '模板补色',
  overlay: '无障碍叠加', user: '手动', adapt: '适配', derived: '派生', a11y: '无障碍',
};

export interface Source {
  layer: Layer;
  /** 预设 id 或规则 id */
  ref?: string;
  /** 由皮肤默认带进来的关键词（旧皮肤的像素一致性要区分它） */
  viaSkin?: boolean;
}

/** 每类预设能写的参数（C-owners）；* 结尾是前缀通配，el.* = 元素实例键与 @el 覆盖键 */
const OWNERS: Record<PresetKind, string[]> = {
  platform: ['ctx.orientation', 'ctx.aspect', 'ctx.device', 'ctx.input', 'typ.baseSize', 'ix.touchSize', 'lay.safeMargin', 'ix.glyphs'],
  business: ['ops.*', 'st.newCue', 'flow.chrome', 'flow.navPersistent'],
  layout: ['cnt.screen', 'cnt.subtype', 'cnt.elements', 'cnt.focal', 'cnt.characterMedium', 'lay.container', 'lay.hudOrg', 'lay.playfield', 'ctx.timeModel', 'ctx.turnTimer', 'ctx.players', 'rel.hudVisibility', 'rel.semanticZoom', 'rel.worldRender', 'col.coding', 'col.teams', 'cmp.card', 'cmp.dialogBox', 'cmp.gauge', 'ix.skip', 'ix.skipAnchor', 'hier.dimInactive', 'mo.textReveal', 'flow.chrome', 'el.*'],
  pattern: ['lay.*', 'cnt.dataShape', 'cnt.focal', 'ops.poster', 'cmp.slot', 'ix.mode'],
  container: ['ast.container', 'ast.containerSurface', 'mo.transition', 'lay.nav', 'lay.detail', 'lay.container', 'lay.overflow', 'cmp.slot'],
  screen: ['cnt.*', 'lay.*', 'hier.*', 'rel.behind', 'rel.dim', 'rel.sceneBlur', 'rel.sceneTone', 'rel.vignette', 'rel.hudVisibility', 'rel.diegesis', 'ix.mode', 'ix.confirm', 'ix.dismiss', 'ix.close', 'ix.back', 'ix.continueCue', 'ix.skip', 'ix.skipAnchor', 'ix.guideForce', 'flow.entry', 'flow.stacking', 'flow.depth', 'flow.chrome', 'mo.reveal', 'mo.revealTease', 'mo.reward', 'mo.textReveal', 'mo.enter', 'mo.transition', 'st.*', 'cmp.*', 'ops.*', 'col.coding', 'col.semantic', 'typ.numbering', 'ast.container', 'ast.containerSurface', 'ast.bgArt', 'ast.bgMat', 'ast.bgMatAngle', 'ast.watermark', 'ast.watermarkOpacity', 'vis.mapStyle', 'vis.mapUnexplored', 'el.*'],
  skin: ['vis.corner', 'vis.cornerSize', 'vis.edge', 'vis.silhouette', 'vis.skew', 'vis.tilt', 'vis.jitter', 'vis.opacity', 'vis.fill', 'vis.pattern', 'vis.patternOpacity', 'vis.blur', 'vis.stroke', 'vis.strokeWidth', 'vis.strokeColor', 'vis.strokeSides', 'vis.strokeGlow', 'vis.depth', 'vis.gloss', 'vis.iconStyle', 'vis.pixelScale', 'col.lightness', 'col.surface', 'col.surface2', 'col.text', 'col.accent', 'col.accent2', 'col.focus', 'col.nodeDone', 'col.good', 'col.warn', 'col.bad', 'col.heading', 'col.icon', 'col.muted', 'col.quest', 'col.control', 'col.controlText', 'col.track', 'col.trackStroke', 'col.border', 'col.gradient', 'col.strategy', 'col.semantic', 'col.saturation', 'typ.body.*', 'typ.display.*', 'typ.numerals.*', 'typ.legibility', 'typ.scale', 'mo.enter', 'mo.duration', 'mo.easing', 'mo.textReveal', 'mo.idle', 'mo.juice', 'mo.frameRate', 'ix.press', 'ix.focus', 'vis.silhouette@*', 'vis.*@*'],
  keyword: ['ast.core', 'ast.coreMat', 'ast.frame', 'ast.frameMat', 'ast.ornaments', 'ast.fx', 'ast.watermark', 'ast.watermarkOpacity', 'ast.bgArt', 'ast.bgMat', 'ast.bgMatAngle', 'vis.motif', 'vis.ornament', 'vis.pattern', 'vis.patternOpacity', 'vis.edge', 'vis.mapStyle', 'typ.display.family', 'typ.titleFx', 'typ.direction', 'cmp.plate', 'cmp.plate@*', 'col.accent', 'col.accent2'],
  theme: ['col.accent', 'col.accent2', 'vis.motif', 'ast.fx', 'ast.ornaments'],
  nudge: ['vis.*', 'col.*', 'typ.*', 'mo.*', 'ast.*', 'rel.hudVisibility', 'rel.harmony', 'rel.diegesis', 'rel.sceneTone', 'rel.vignette', 'cnt.density', 'hier.dimInactive', 'ix.press', 'ix.focus', 'el.*'],
  overlay: ['a11y.*', 'chk.*', 'typ.baseSize', 'col.teams', 'st.rarityCue', 'mo.juice', 'vis.opacity', 'typ.legibility'],
  example: ['*'],
  recipe: ['*'],
};

const matchOwner = (pat: string, key: string) => {
  if (pat === '*') return true;
  if (pat === 'el.*') return key.startsWith('el.') || /@el\.[a-zA-Z]+(#[23])?$/.test(key);
  if (pat.endsWith('@*')) return key.includes('@') && (pat === 'vis.*@*' ? key.startsWith('vis.') : key.startsWith(pat.slice(0, -2) + '@'));
  if (pat.endsWith('.*')) return key.startsWith(pat.slice(0, -1)) && !key.includes('@');
  return key === pat;
};
export const ownsKey = (kind: PresetKind, key: string) => OWNERS[kind].some((p) => matchOwner(p, key));

/** 键对应的参数定义（覆盖键、元素实例键都映射到它们的模板参数） */
export function paramOfKey(key: string) {
  const direct = SPEC_PARAM.get(key);
  if (direct) return direct;
  const o = parseOverrideKey(key);
  if (o) return SPEC_PARAM.get(o.param);
  const e = parseElementKey(key);
  if (e) return SPEC_PARAM.get(e.param);
  return undefined;
}

const isMulti = (key: string) => paramOfKey(key)?.kind === 'multi';
/** 元素实例参数写 inherit（或模板参数也没给）时继承的全局参数 */
const EL_INHERIT: Record<string, string> = { diegesis: 'rel.diegesis', worldRender: 'rel.worldRender', arrangement: 'lay.arrangement', visibility: 'rel.hudVisibility' };
const NONE: ReadonlySet<string> = new Set();

/**
 * 并集合并（merge = union）的多选写一层（M12a-07）：
 *   [] 或含 'none' → 先清空下层带来的并集（['none'] = 清空，['none', 'a'] = 只留 a）；
 *   '-x' → 从并集里减掉 x（下层给了才有东西可减）；其余取值照旧并进去。prev = 下层的值（没有 / 只补默认时 null）。
 */
export function unionMerge(prev: string[] | null, list: string[]): string[] {
  const clear = list.length === 0 || list.includes('none');
  const sub = new Set(list.filter((x) => x.length > 1 && x.startsWith('-')).map((x) => x.slice(1)));
  const add = list.filter((x) => x !== 'none' && !(x.length > 1 && x.startsWith('-')));
  return [...new Set([...(clear ? [] : prev ?? []), ...add])].filter((x) => !sub.has(x));
}

/** 把 Values 里的字符串还原成解析用的值（多选拆成数组，数值字符串转数字；并集多选的 'none' / '-x' 原样保留，put 时解释） */
export function fromStored(key: string, v: unknown): Raw | undefined {
  if (v === undefined || v === null || v === 'auto') return undefined;
  const p = paramOfKey(key);
  if (p?.kind === 'multi') return asList(v as Raw);
  if ((p?.kind === 'int' || p?.kind === 'range') && typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) return Number(v);
  if (p?.kind === 'toggle' && typeof v === 'string') return v === 'true';
  return v as Raw;
}

/**
 * 按目标的只读视图（M12a-01）：targets = 目标链（部件在前、元素在后，如 ['slot', 'el.abilities']），
 * 每个键依次查 <k>@<目标1>、<k>@<目标2>……都没有时回到全局 <k>。作用域值整个替换全局值（多选也不与全局求并集）。
 */
export interface ScopedView {
  readonly targets: readonly string[];
  /** 实际生效的键（第一个存在的 <k>@<目标>，否则 k） */
  key(k: string): string;
  has(k: string): boolean;
  get(k: string): Raw | undefined;
  src(k: string): Source | undefined;
  str(k: string, def?: string): string;
  num(k: string, def?: number): number;
  bool(k: string, def?: boolean): boolean;
  list(k: string): string[];
}

export class Resolved {
  private m = new Map<string, { v: Raw; src: Source }>();
  /** 作用域键的索引：目标 → 写了 <参数>@<目标> 的参数（scopedParams() 用；put / delete 后作废） */
  private idx: Map<string, Set<string>> | null = null;
  private views = new Map<string, ScopedView>();
  constructor(readonly art: Values) {}

  /** 写一个值；fill = 只在还没有值（或只是默认值）时写。并集多选按 unionMerge：[] / 'none' 清空、'-x' 减项、其余并集 */
  put(key: string, v: Raw | undefined, src: Source, fill = false) {
    if (v === undefined || v === 'auto') return;
    const cur = this.m.get(key);
    if (fill && cur && cur.src.layer !== 'default' && cur.src.layer !== 'fallback') return;
    const p = paramOfKey(key);
    let val: Raw = v;
    if (p?.kind === 'multi') {
      const list = asList(v);
      val = p.merge === 'union' ? unionMerge(cur && !fill ? asList(cur.v) : null, list) : list;
    }
    this.m.set(key, { v: val, src });
    this.idx = null;
  }

  has(key: string) { return this.m.has(key); }
  /** 解析后的值；未定（谁都没给、也没有兜底）时 undefined */
  get(key: string): Raw | undefined { return this.m.get(key)?.v; }
  src(key: string): Source | undefined { return this.m.get(key)?.src; }
  keys() { return [...this.m.keys()]; }
  delete(key: string) { this.m.delete(key); this.idx = null; }

  str(key: string, def = ''): string { const v = this.get(key); return v === undefined || v === null ? def : Array.isArray(v) ? v.join(',') : String(v); }
  num(key: string, def = 0): number { const v = this.get(key); const n = typeof v === 'number' ? v : Number(v); return v === undefined || v === null || v === '' || Number.isNaN(n) ? def : n; }
  bool(key: string, def = false): boolean { const v = this.get(key); return v === undefined ? def : v === true || v === 'true' || v === 1; }
  list(key: string): string[] { return asList(this.get(key) ?? null); }

  /** 按组件 / 元素覆盖：<参数>@<目标>，没有覆盖时回到全局值（= scope([target]).get(param)） */
  at(param: string, target: string): Raw | undefined {
    return this.scope([target]).get(param);
  }
  /** 目标链上的只读视图（见 ScopedView）；同一条链复用同一个视图 */
  scope(targets: readonly string[]): ScopedView {
    const id = targets.join('|');
    const hit = this.views.get(id);
    if (hit) return hit;
    const key = (k: string) => { for (const t of targets) { const s = `${k}@${t}`; if (this.m.has(s)) return s; } return k; };
    const v: ScopedView = {
      targets, key,
      has: (k) => this.has(key(k)),
      get: (k) => this.get(key(k)),
      src: (k) => this.src(key(k)),
      str: (k, def = '') => this.str(key(k), def),
      num: (k, def = 0) => this.num(key(k), def),
      bool: (k, def = false) => this.bool(key(k), def),
      list: (k) => this.list(key(k)),
    };
    this.views.set(id, v);
    return v;
  }
  /** 写了 <参数>@<target> 的参数（没有时是空集）：主题 / 部件据此判断要不要按目标重算 */
  scopedParams(target: string): ReadonlySet<string> {
    if (!this.idx) {
      const idx = new Map<string, Set<string>>();
      for (const k of this.m.keys()) {
        const o = k.includes('@') ? parseOverrideKey(k) : null;
        if (o) idx.set(o.target, (idx.get(o.target) ?? new Set()).add(o.param));
      }
      this.idx = idx;
    }
    return this.idx.get(target) ?? NONE;
  }
  /**
   * 元素实例：el.<元素>.<后缀>；没给时用模板参数 elx.<后缀>；inherit 映射到对应的全局参数。
   * form = 元素按画法拆开画时的这一种画法（M12a-14）：先查画法级键 el.<元素>.<画法>.<后缀>
   */
  el(element: string, suffix: string, form?: string): Raw | undefined {
    const k = this.elKey(element, suffix, form);
    // 元素实例（M12b-04）自己的参数没给：回到参数表的默认（不继承第一份——第一份的值可能来自品类布局）
    if (!this.m.has(k) && element.includes('#')) return instanceDefault(k);
    return this.get(k);
  }
  /**
   * el() 实际读的键（看来源层用：显式给的还是默认 / 兜底的，M12a-13）。
   * 元素实例 el.<元素>#2（M12b-04）：实例键没给时，元素自己的参数返回实例键本身（没有值 = 没给，el() 取参数表默认），elx.* 后缀回到模板参数
   */
  elKey(element: string, suffix: string, form?: string): string {
    if (form) {
      const f = `${element}.${form}.${suffix}`;
      if (this.m.has(f) && this.get(f) !== 'inherit') return f;
    }
    const k = `${element}.${suffix}`;
    if (this.m.has(k) && this.get(k) !== 'inherit') return k;
    if (SPEC_PARAM.get(k)) return k;
    const hash = element.indexOf('#');
    if (hash > 0 && SPEC_PARAM.get(`${element.slice(0, hash)}.${suffix}`)) return k;
    const x = `elx.${suffix}`, g = this.get(x);
    if ((g === 'inherit' || g === undefined) && EL_INHERIT[suffix]) return EL_INHERIT[suffix];
    return x;
  }
  /** 当前元素集合 */
  elements(): string[] { return this.list('cnt.elements'); }

  skin?: SpecPreset;
  /** 被选中的各类预设（界面上显示"当前起点"） */
  presets: Partial<Record<PresetKind, SpecPreset>> = {};
  /** 违反的检查型约束 */
  warnings: { id: string; why: string; level: string }[] = [];
}

/** 元素实例键（el.<元素>#2.<后缀>）没给时的值：参数表里这个元素参数的默认 → 兜底（与解析第 1 / 10 层同口径：auto = 没有值） */
function instanceDefault(k: string): Raw | undefined {
  const p = paramOfKey(k);
  if (!p) return undefined;
  const d = fromStored(p.id, p.default as Raw);
  return d !== undefined ? d : p.fallback !== undefined && p.fallback !== null ? fromStored(p.id, p.fallback as Raw) : undefined;
}

/** 每种界面类型的默认模板（只选了 cnt.screen、没选 uip.screen 时用）；商业化界面不给默认 */
const DEFAULT_TEMPLATE: Record<string, string> = {
  'screen.title': 'tpl.title', 'screen.pause': 'tpl.pausePc', 'screen.settings': 'tpl.settings', 'screen.inventory': 'tpl.inventory', 'screen.character': 'tpl.hero',
  'screen.skilltree': 'tpl.skilltree', 'screen.map': 'tpl.worldmap', 'screen.journal': 'tpl.quest', 'screen.dialogue': 'tpl.npc', 'screen.craft': 'tpl.forge',
  'screen.build': 'tpl.build', 'screen.results': 'tpl.settle', 'screen.loading': 'tpl.loading', 'screen.tutorial': 'tpl.guide', 'screen.codex': 'tpl.codex',
  'screen.save': 'tpl.saveSlot', 'screen.lobby': 'tpl.lobby', 'screen.frontend': 'tpl.title', 'screen.match': 'tpl.formation', 'screen.social': 'tpl.chat',
  'screen.rank': 'tpl.leaderboard', 'screen.levelselect': 'tpl.levelPath', 'screen.cards': 'tpl.hand',
};

const presetFor = (kind: PresetKind, sel: unknown): SpecPreset | undefined => {
  if (!sel || sel === 'none' || sel === 'auto') return undefined;
  const p = PRESET.get(String(sel));
  return p?.kind === kind ? p : undefined;
};

/** 品类布局：auto = 跟随画面的品类（每个品类取第一个对应的布局） */
function layoutFor(v: Values): SpecPreset | undefined {
  const sel = v[SELECTORS.layout];
  if (sel === 'none') return undefined;
  if (sel && sel !== 'auto') return presetFor('layout', sel);
  const genre = String(v['game.genre'] ?? 'explore');
  return presetsOf('layout').find((p) => (Array.isArray(p.genre) ? p.genre.includes(genre) : p.genre === genre));
}

function applyPreset(r: Resolved, p: SpecPreset | undefined, kind: PresetKind, layer: Layer, filter?: (k: string) => boolean, extra?: Partial<Source>) {
  if (!p) return;
  for (const [k, v] of Object.entries(p.values)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) continue; // 相对微调（nudge）不在这里
    if (!ownsKey(kind, k)) continue;
    if (filter && !filter(k)) continue;
    r.put(k, v as Raw, { layer, ref: p.id, ...extra });
  }
}

/**
 * 解析结果的缓存：按 Values 对象身份，留最近几份（轨道 D，docs/workbench-redesign.md §5.3）。
 * 原来只有一槽：皮肤色板在离屏画 38 个皮肤、面板按基线算一次……都会把画框正在用的那份挤掉，下一帧主画面要整份重解析。
 * 同一个对象仍只解析一次；解析结果在别处只读，多留几份不改变语义。
 */
const CACHE_SLOTS = 6;
/** 画幅是 16:10 的平台 */
const PLATFORM_16X10: ReadonlySet<string> = new Set(['platform.handheld', 'platform.tablet']);
const cache: { v: Values; r: Resolved }[] = [];

/** 解析整套 UI（同一个 Values 对象只解析一次） */
export function resolveUi(v: Values): Resolved {
  const i = cache.findIndex((c) => c.v === v);
  if (i >= 0) {
    const hit = cache[i];
    // 命中的挪到最前（最近用过）
    if (i > 0) { cache.splice(i, 1); cache.unshift(hit); }
    return hit.r;
  }
  const r = new Resolved(v);

  // 1 参数默认值
  for (const p of SPEC_PARAMS) r.put(p.id, p.default as Raw, { layer: 'default' });

  // 3 平台 → 商业模式 → 品类布局 → 版式 → 容器 → 界面模板
  const platform = presetFor('platform', v[SELECTORS.platform]);
  const business = presetFor('business', v[SELECTORS.business]);
  const layout = layoutFor(v);
  // 只选了界面类型（cnt.screen）、没选界面模板：用这类界面的默认模板起步（否则会落到 M3.5 的通用菜单样本——永远是一屏背包）
  const screenType = v['cnt.screen'];
  const screen = presetFor('screen', v[SELECTORS.screen])
    ?? (typeof screenType === 'string' && screenType !== 'screen.hud' && DEFAULT_TEMPLATE[screenType] ? PRESET.get(DEFAULT_TEMPLATE[screenType]) : undefined);
  const pattern = presetFor('pattern', v[SELECTORS.pattern]) ?? (screen?.pattern ? PRESET.get(screen.pattern) : undefined);
  const container = presetFor('container', v[SELECTORS.container]) ?? (screen?.container ? PRESET.get(screen.container) : undefined);
  Object.assign(r.presets, { platform, business, layout, screen, pattern, container });
  applyPreset(r, platform, 'platform', 'platform');
  // 掌机（Steam Deck 一类）与平板的画幅是 16:10（B 的审查修复 ⑰：画框与 HUD 都认 16x10，见 device.ts 的 ASPECT_RATIO）；
  // 参数表的平台预设还写着 16x9，这里按平台补上（E 把预设改成 16x10 之后这一句不起作用，留着也不冲突）
  if (platform && PLATFORM_16X10.has(platform.id)) r.put('ctx.aspect', '16x10', { layer: 'platform', ref: platform.id });
  applyPreset(r, business, 'business', 'business');
  // 选了非 HUD 的界面模板时，品类布局只提供元素实例的默认画法，不决定界面类型与元素集合
  applyPreset(r, layout, 'layout', 'layout', screen ? (k) => k.startsWith('el.') || k.startsWith('cmp.') || k.startsWith('col.') || k.startsWith('ctx.') : undefined);
  applyPreset(r, pattern, 'pattern', 'pattern');
  applyPreset(r, container, 'container', 'container');
  applyPreset(r, screen, 'screen', 'screen', (k) => !ownsKey('skin', k));

  // 4 皮肤 → 关键词 → 节日
  const skin = SKIN_PRESET_BY_VALUE.get(String(v['hud.style'] ?? ''));
  r.skin = skin;
  r.presets.skin = skin;
  applyPreset(r, skin, 'skin', 'skin');
  const kwSel = v[SELECTORS.keyword];
  if (kwSel !== 'none') {
    const explicit = presetFor('keyword', kwSel);
    const kw = explicit ?? (skin?.keyword ? PRESET.get(skin.keyword) : undefined);
    r.presets.keyword = kw;
    if (kw) applyPreset(r, kw, 'keyword', 'keyword', undefined, { viaSkin: !explicit });
    else if (skin?.keywordDefaults) for (const [k, x] of Object.entries(skin.keywordDefaults)) r.put(k, x, { layer: 'keyword', ref: skin.id, viaSkin: true });
  }
  const theme = presetFor('theme', v[SELECTORS.theme]);
  r.presets.theme = theme;
  applyPreset(r, theme, 'theme', 'theme');

  // 5 界面模板写到皮肤也拥有的键：作为本屏覆盖；accent 只补空
  if (screen) {
    for (const [k, x] of Object.entries(screen.values)) if (ownsKey('skin', k) && ownsKey('screen', k)) r.put(k, x as Raw, { layer: 'screenOverride', ref: screen.id });
    if (screen.accent) for (const [k, x] of Object.entries(screen.accent)) r.put(k, x, { layer: 'accent', ref: screen.id }, true);
  }

  // 6 无障碍叠加 → 用户手动值
  for (const id of asList((v[SELECTORS.overlay] as Raw) ?? '')) {
    const ov = presetFor('overlay', id);
    applyPreset(r, ov, 'overlay', 'overlay');
  }
  const manual = new Set<string>();
  for (const [k, x] of Object.entries(v)) {
    if (k.startsWith('uip.') || k.startsWith('hud.')) continue;
    // 逐界面的覆盖不按自己的键进解析结果（下面按当前界面并到参数本身上；别的消费方——主题作用域、导出——看不到 tpl 目标）
    if (k.includes('@tpl.')) continue;
    if (!paramOfKey(k)) continue;
    const val = fromStored(k, x);
    if (val === undefined) continue;
    r.put(k, val, { layer: 'user' });
    manual.add(k);
  }
  // 逐界面的部件覆盖（整合修复 X#8：cmp.*@tpl.<id> 这类）：<参数>@tpl.<当前界面模板> 在这一屏当手动值、盖过全局的手动值；别的界面写的不生效。
  // 画框上部件的覆盖目标就是 tpl.<id>（compose/layers.ts 的 partHits），界面 ↺（A 的 resetScreenParts）按同一个后缀清
  const tplId = screen?.id;
  if (tplId) {
    const suffix = `@${tplId}`;
    for (const [k, x] of Object.entries(v)) {
      if (!k.endsWith(suffix)) continue;
      const o = parseOverrideKey(k);
      if (!o || o.target !== tplId) continue;
      const val = fromStored(o.param, x);
      if (val === undefined) continue;
      r.put(o.param, val, { layer: 'user', ref: tplId });
      manual.add(o.param);
    }
  }

  // 7–9 派生规则（默认类只补默认值、适配类只被手动值挡住、纯派生、无障碍）
  applyRules(r, v, manual);

  // 10 兜底：还没有值的参数用 fallback
  for (const p of SPEC_PARAMS) if (!r.has(p.id) && p.fallback !== undefined && p.fallback !== null) r.put(p.id, p.fallback as Raw, { layer: 'fallback' });

  cache.unshift({ v, r });
  if (cache.length > CACHE_SLOTS) cache.length = CACHE_SLOTS;
  return r;
}

/** 来源的白话（参数行的徽标） */
export function sourceText(s: Source | undefined): string {
  if (!s) return '未定';
  const name = s.ref ? (PRESET.get(s.ref)?.label ?? s.ref) : '';
  if (s.layer === 'user') return '手动';
  if (s.layer === 'default' || s.layer === 'fallback') return LAYER_LABEL[s.layer];
  if (s.layer === 'ruleDefault' || s.layer === 'adapt' || s.layer === 'derived' || s.layer === 'a11y') return `${LAYER_LABEL[s.layer]}：${s.ref ?? ''}`;
  return `${LAYER_LABEL[s.layer]}：${name}${s.viaSkin ? '（皮肤默认）' : ''}`;
}

export { isMulti };
