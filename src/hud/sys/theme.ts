import { SKIN_MAP, DEFAULT_SKIN_PALETTE, SKIN_ACCENTS } from '../skins';
import { contrastRatio, gradientMean, MATERIAL_BASE, mix, parseColor, rgba, withAlpha, luminance } from '../material';
import { AGING_KINDS, type BoxStyle, type ButtonRole, type Corner, type NumeralFace, type Paint, type Shadow, type Silhouette, type SkinPalette, type SkinTokens, type TextStyle } from '../types';
import { LAYER_RANK, type Resolved, type ScopedView, type Source } from './resolve';
import { THEME_SCOPED } from './scopable';
import { DISPLAY_ONLY, FONT_ROLES, HAVE_FAMILY } from '../fontList';
import { QUALITY } from '../paint';

/*
 * 解析结果 → 可绘制的皮肤 token（docs/survey/09-ui-param-system.md 6.6 节"SkinTokens 字段 → 参数"）。
 * 两条路：
 *   旧的 14 个皮肤：以手调过的 token 为底，只把"皮肤之后的层"（显式关键词、节日、本屏覆盖、手动、适配、无障碍）改过的键打上去，
 *     所以什么都不改时与 M1 的对照图逐像素一致；
 *   新皮肤：完全由参数生成。
 * 按目标的 token（M12a-01）：baseTheme 是整屏的一套；patchTheme(base, r, 目标链) 在目标链上有 <参数>@<目标>（scopable.ts 的主题类参数）时，
 *   用同一套派生规则（面板明度、描边、立体、材质换字色……）把这些键换成作用域值再算一遍，版面缩放仍取外层主题；没有作用域键时原样返回 base。
 */

const SYS = '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif';
const SANS = `"GAE Sans", ${SYS}`;

/**
 * 一个字体角色的字体栈（M12b-54，fontList.ts 的 FONT_ROLES）：角色自己的字族有文件就放在最前（中文字族紧跟拉丁字族），后面接 fallback 角色的栈，最后是系统字体（base）。
 * 没有文件的字族不写进栈（原来几种字族静默写成别的字体名，现在明确落到 fallback，并由 C-font-alias 报出来）；已有字体的那几个角色的栈与原来逐字一致。
 * display = 展示字体栈：只收展示用字的中文字族（fontList.ts 的 DISPLAY_ONLY：站酷快乐体、得意黑）只进这一套——正文栈不放它，正文的中文照旧落到 fallback
 */
const BASE_STACK: Record<string, string> = { sys: SYS, serif: '"Songti SC", SimSun, serif', kai: '"STKaiti", KaiTi, serif' };
function roleStack(role: string, depth = 0, display = false): string {
  const f = FONT_ROLES[role];
  if (!f || depth > 6) return SANS;
  const own = [f.family, f.cjk].filter((x): x is string => !!x && HAVE_FAMILY.has(x) && (display || !DISPLAY_ONLY.has(x))).map((x) => `"${x}"`);
  const rest = f.base ? BASE_STACK[f.base] : f.fallback ? roleStack(f.fallback, depth + 1, display) : SYS;
  return own.length ? `${own.join(', ')}, ${rest}` : rest;
}
/** 字体角色 → 正文字体栈（自托管 GAE 字体在前，见 src/hud/fontList.ts 的 FONT_ROLES） */
export const FONT_STACK: Record<string, string> = Object.fromEntries(Object.keys(FONT_ROLES).map((k) => [k, roleStack(k)]));
/** 字体角色 → 展示字体栈（typ.display.family 用；只有 condensed / comicHand 这类中文是展示字表的角色与 FONT_STACK 不同） */
export const DISPLAY_STACK: Record<string, string> = Object.fromEntries(Object.keys(FONT_ROLES).map((k) => [k, roleStack(k, 0, true)]));
const WEIGHT: Record<string, number> = { light: 300, regular: 400, bold: 700, black: 900 };
/** 数字字重（typ.numerals.weight，M12b-07）：字体字重（GAE 字族多数只有 400 / 700，细体按就近档画，见 paint.ts faceWeight）与矢量数字的笔画粗细倍数 */
const NUM_WEIGHT: Record<string, number> = { light: 300, regular: 400, medium: 500, bold: 700, black: 900 };
const NUM_THICK: Record<string, number> = { light: 0.65, regular: 1, medium: 1.15, bold: 1.35, black: 1.7 };

export interface Theme {
  tokens: SkinTokens;
  pal: SkinPalette;
  /** 以旧皮肤为底 */
  legacy: boolean;
  /** 信息密度 0~4 */
  density: number;
  iconStyle: string;
  /** UI 像素化倍数（1 = 清晰矢量） */
  pixel: number;
  /** 版面缩放：正文字号（设计单位）相对 13 的倍数（字号由参数给时才 ≠ 1：typ.baseSize 是 px@1080p，26 → 13 → 1）；不含画布缩放 unitK */
  scale: number;
  /**
   * 画布缩放（M12a-05）：设计单位（960 × 540 画布，= 1080p 的一半）→ CSS 像素，= sys/device.ts 的 unitKOf（Godot canvas_items 拉伸）。
   * HudSystem 在 buildTheme 之后注入，并把整张 HUD 画布按它缩放——绘制代码一律用设计单位，只有换回 CSS 像素（命中框、可读性检查）时才乘它；
   * 不经 HudSystem（导出、面板）时为 1；patchTheme 继承整屏主题的值
   */
  unitK: number;
  /** 文字相对版面的额外放大（a11y.textScale，绘制层统一乘） */
  textK: number;
  /** 解析结果（控件绘制会继续读组件 / 元素参数） */
  r: Resolved;
  surface: string;
  text: string;
  /** 场景色板与皮肤 id（patchTheme 重算时用） */
  scene: SkinPalette | null;
  skinId: string;
  /**
   * 盒子的斜切 / 旋转（M12a-06）：boxSkew = 元素、模板、按钮、格子、标牌按多少度斜切（vis.skew；旧皮肤只在皮肤之后显式选了才斜，皮肤 token 里的 skewX 仍只给四控件样本用）；
   * boxTurn = 盒子能不能转（vis.jitter 的抖动角、vis.tilt 的随手倾角；旧皮肤要皮肤之后显式选了）
   */
  boxSkew: number;
  boxTurn: boolean;
  /** 语义色与颜色角色（M12a-02）：元素里原来写死的好 / 警告 / 坏、生命、危险、货币、目标、高亮等颜色，按参数与色彩策略派生；patchTheme 按目标重算 */
  roles: Roles;
  /**
   * 品质下限的豁免（审查修复，§8 的下限是默认的兜底，不是覆盖）：皮肤之后的层（手动、复刻、用户选的关键词 / 节日 / 本屏覆盖……）显式给了的值照它画。
   * textK = 字号下限倍数（显式的小基准字号 / 文字缩放 / UI 缩放按比例降）；fade / halo / stroke = paint.ts 的淡字抬升、自动反差描边、盒子描边下限；
   * scrim = 元素 HUD 的边缘衬底（显式给了 typ.legibility 或 vis.opacity 时不垫）。compose/layers.ts 合成前写进 paint.ts 的 FLOOR
   */
  floors: { textK: number; fade: boolean; halo: boolean; stroke: boolean; scrim: boolean };
  /** 按目标打过补丁的主题：外层（整屏）主题与生效的目标链（只含真有作用域键的目标）；整屏主题没有这两项 */
  base?: Theme;
  scope?: readonly string[];
}

/**
 * 颜色角色（M12a-02）。默认值 = 改造前各调用点写死的颜色，所以什么都不设时画面不变：
 *   good / warn / bad：好（色板 good）/ 警告（#e3b341）/ 坏（#e5484d），col.good / warn / bad 可改，色盲预设（a11y.cvdPreset）优先；
 *   health / danger：生命条 / 敌人与危险（= bad）；currency：主货币（#e3b341）；objective：目标标题与标记（#e3b341）；highlight：评级、暴击、提示首行、引导框（#ffd34d）；
 *   done / current / locked / short：节点三态与"不足"（好色 / 强调色 / 字色 35% / 坏色；M12a-29：完成可由 col.nodeDone 指定，当前在显式给了 col.focus 时用焦点色）；ghost：生命条掉血拖尾（75% 白）。
 * 骨架色彩策略只在皮肤之后的层显式选了时才改语义色（皮肤预设自带的 col.strategy 仍只管图标与条的填充，原来就是这样）：
 *   mono → 全部映射到强调色的明度阶（完成 / 好 / 坏 = 强调色，当前 / 警告 / 高亮 = 提亮 35%，锁定 = 强调色 35%）；
 *   duotone → 只改节点三态与不足（完成 = accent、当前 / 不足 = accent2），生命与好坏色不动；
 * accentAt / accent2At：目标链上有算数的 col.accent@ / col.accent2@ 时为真，e.fill() 的第 0 / 1 条据此取作用域强调色。
 * M12a-03 的颜色角色参数：icon（图标字，col.icon；auto = 强调色，显式选了 mono 时 = 字色）、muted（次要字，col.muted；auto = 字色 60%）、
 *   focus（选中描边，col.focus；auto = 强调色）；col.quest 给了时 objective 与 currency 都换成它（auto = 原来的金色）。
 */
export interface Roles {
  good: string; warn: string; bad: string;
  health: string; danger: string; currency: string; objective: string; highlight: string;
  /** 信息色（M12a-31：状态图标的 info 类，默认 #7aa2f7 蓝；mono 时强调色提亮） */
  info: string;
  done: string; current: string; locked: string; short: string; ghost: string;
  icon: string; muted: string; focus: string;
  /** col.muted 显式给了（没给时各调用点保留原来各自的透明度） */
  mutedSet: boolean;
  accentAt: boolean; accent2At: boolean;
}
export type RoleName = Exclude<keyof Roles, 'accentAt' | 'accent2At' | 'mutedSet'>;
/** 颜色参数的取值：#hex / rgba，或色板引用 @accent / @accent2 / @text（字色）/ @heading …（M12a-03） */
const refColor = (c: string, pal: SkinPalette, text: string) => (c === '@text' ? text : c.startsWith('@') ? pal[c.slice(1) as keyof SkinPalette] ?? text : c);

/** 色盲预设下的「坏」色（和 derive 里换过的好色成对：蓝 / 橙、青 / 玫红） */
export const CVD_BAD: Record<string, string> = { protan: '#f97316', deutan: '#f97316', tritan: '#e11d48' };

const POST: Source['layer'][] = ['keyword', 'theme', 'screenOverride', 'accent', 'overlay', 'user', 'adapt', 'a11y'];
/** 旧皮肤上哪些键要打补丁：皮肤之后的层给的值（皮肤默认带进来的关键词不算） */
const postSkin = (s: Source | undefined) => !!s && POST.includes(s.layer) && !s.viaSkin && LAYER_RANK[s.layer] > LAYER_RANK.skin;

/** 这个键是不是皮肤之后的层显式给的（M12a-06：书本容器取色这类没有元素上下文的地方用；元素里用 core.ts 的 postSkinKey） */
export const afterSkin = (r: Resolved, key: string) => postSkin(r.src(key));

/** 派生读参数的接口：整屏主题直接读解析结果，按目标的补丁读 scopedReader（scoped(k) = 这个参数取的是不是作用域键） */
type Reader = Pick<ScopedView, 'has' | 'get' | 'src' | 'str' | 'num' | 'list'> & { scoped?: (k: string) => boolean };

/** 作用域键算不算数：新皮肤有就算；旧皮肤和全局键一样，只认皮肤之后的层给的（看这个作用域键自己的来源） */
const admit = (r: Resolved, legacy: boolean, key: string) => r.has(key) && (!legacy || postSkin(r.src(key)));

/** 目标链上的读法：主题类参数（THEME_SCOPED）依次查 <k>@<目标>，算数的第一个生效；其余参数与没有作用域键时读全局 */
function scopedReader(r: Resolved, legacy: boolean, chain: readonly string[]): Reader {
  const key = (k: string) => {
    if (!THEME_SCOPED.has(k)) return k;
    for (const t of chain) { const s = `${k}@${t}`; if (admit(r, legacy, s)) return s; }
    return k;
  };
  return {
    has: (k) => r.has(key(k)), get: (k) => r.get(key(k)), src: (k) => r.src(key(k)),
    str: (k, def) => r.str(key(k), def), num: (k, def) => r.num(key(k), def), list: (k) => r.list(key(k)),
    scoped: (k) => key(k) !== k,
  };
}

/** 目标 t 上有没有算数的主题类作用域键 */
const themeKeysAt = (r: Resolved, legacy: boolean, t: string) => [...r.scopedParams(t)].some((p) => THEME_SCOPED.has(p) && admit(r, legacy, `${p}@${t}`));

/** 整屏的主题（buildTheme 是它的旧名，godotHud / godotLayout / HudSystem 照旧调用） */
export function baseTheme(r: Resolved, scene: SkinPalette | null, skinId: string): Theme {
  return derive(r, r, scene, skinId);
}
export const buildTheme = baseTheme;

/** 补丁缓存：整屏主题 → 目标链 → 补过的主题（整屏主题每次重画都是新对象，所以按帧自然作废） */
const PATCHED = new WeakMap<Theme, Map<string, Theme>>();

/**
 * 按目标链（部件在前、元素在后，如 ['slot', 'el.abilities']）给主题打补丁：链上只留真有主题类作用域键的目标，一个都没有时原样返回整屏主题。
 * 补过的主题共用整屏主题的版面缩放、文字缩放、密度、像素化与图标风格。
 */
export function patchTheme(base: Theme, r: Resolved, targets: readonly string[]): Theme {
  const root = base.base ?? base;
  const chain = targets.filter((t) => themeKeysAt(r, root.legacy, t));
  if (!chain.length) return root;
  const id = chain.join('|');
  let m = PATCHED.get(root);
  if (!m) PATCHED.set(root, (m = new Map()));
  const hit = m.get(id);
  if (hit) return hit;
  const th = derive(r, scopedReader(r, root.legacy, chain), root.scene, root.skinId);
  const out: Theme = { ...th, scale: root.scale, unitK: root.unitK, textK: root.textK, density: root.density, pixel: root.pixel, iconStyle: root.iconStyle, base: root, scope: chain };
  m.set(id, out);
  return out;
}

function scenePalette(useScene: boolean, scene: SkinPalette | null): SkinPalette {
  return useScene && scene ? { ...scene } : { ...DEFAULT_SKIN_PALETTE };
}

/** 把颜色的不透明度设成 a（不是乘：毛玻璃 0.18 的底调到 0.94 就是 0.94） */
const setAlpha = (c: string, a: number) => { const x = parseColor(c); return rgba([x[0], x[1], x[2], a]); };

/** 字色（色板引用解析过的）：事件字效的颜色列表里写 @text 时用 */
const inkOrText = (t: SkinTokens, pal: SkinPalette) => (t.text.startsWith('@') ? pal[t.text.slice(1) as keyof SkinPalette] ?? '#fff' : t.text);
/** '@角色' → 色板颜色 */
const resolveColorIn = (c: string, pal: SkinPalette) => (c.startsWith('@') ? pal[c.slice(1) as keyof SkinPalette] ?? '#000' : c);

const isHex = (c: unknown): c is string => typeof c === 'string' && (c.startsWith('#') || c.startsWith('rgb'));

function saturate(c: string, k: number): string {
  if (k === 1) return c;
  const [r, g, b, a] = parseColor(c);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (x: number) => Math.max(0, Math.min(255, l + (x - l) * k));
  return rgba([f(r), f(g), f(b), a]);
}

/** 从参数生成新皮肤的底（新皮肤没有手调 token 时的起点） */
function baseTokens(): SkinTokens {
  return {
    font: SANS,
    text: '@ink',
    panel: {},
    bar: { height: 12, track: { bg: { solid: 'rgba(0,0,0,0.15)' } }, fill: { bg: { solid: '@good' } } },
    key: {},
    icon: '@accent',
  };
}

function derive(r: Resolved, q: Reader, scene: SkinPalette | null, skinId: string): Theme {
  const legacySkin = SKIN_MAP.get(skinId);
  const legacy = !!legacySkin;
  // 旧皮肤只吃皮肤之后的层；例外：显式选了平台（uip.platform）时的基准字号（电视 / 手机要换字号，M10）
  const ok = (k: string) => q.has(k) && (!legacy || postSkin(q.src(k)) || (k === 'typ.baseSize' && q.src(k)?.layer === 'platform'));
  const val = (k: string) => (ok(k) ? q.get(k) : undefined);
  const str = (k: string) => { const x = val(k); return x === undefined || x === null ? undefined : String(x); };
  const num = (k: string) => { const x = val(k); return x === undefined || x === null || x === '' ? undefined : Number(x); };
  // 显式给了（不是默认 / 兜底层的值）：只在「给了才换画法」的新参数上用（M12a-33 起）
  const given = (k: string) => { const l = q.src(k)?.layer; return ok(k) && !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault'; };

  // 色板
  const pal = scenePalette(q.str('col.source', 'scene') === 'scene', scene);
  // 皮肤自己的一对强调色（§8 RC6，轨道 E；skins.ts 的 SKIN_ACCENTS）：没显式要「跟随画面」时盖掉场景色板 / 全局粉红的强调色
  const pair = QUALITY.on ? SKIN_ACCENTS[skinId] : undefined;
  const followArt = q.src('col.source')?.layer === 'user' && q.str('col.source', 'scene') === 'scene' || ['sameMedium', 'unified'].includes(q.str('rel.harmony', ''));
  if (pair && !followArt) { pal.accent = pair[0]; pal.accent2 = pair[1]; }
  const acc = q.get('col.accent'), acc2 = q.get('col.accent2');
  if (isHex(acc) && (!legacy || postSkin(q.src('col.accent')))) pal.accent = acc;
  if (isHex(acc2) && (!legacy || postSkin(q.src('col.accent2')))) pal.accent2 = acc2;
  // 色盲预设（a11y.cvdPreset，玩家选项）：好 / 坏两色换成该类色盲分得开的一对（坏色见 CVD_BAD，在下面的颜色角色里用）
  const cvd = q.str('a11y.cvdPreset', 'off');
  if (cvd === 'protan' || cvd === 'deutan') pal.good = '#3b82f6';
  else if (cvd === 'tritan') pal.good = '#14b8a6';
  const satK = num('col.saturation');
  if (satK !== undefined && satK !== 1) for (const k of Object.keys(pal) as (keyof SkinPalette)[]) { const c = pal[k]; if (c) pal[k] = saturate(c, satK); }

  const t: SkinTokens = structuredClone(legacySkin?.tokens ?? baseTokens());
  const panel: BoxStyle = t.panel;

  /* ---- 面板明度与颜色 ---- */
  const lightness = str('col.lightness');
  let surface = '', text = '';
  if (lightness || !legacy) {
    const L = lightness ?? q.str('col.lightness', 'light');
    if (L === 'dark') { surface = mix(pal.ink, '#000', 0.25); text = mix(pal.paper, '#fff', 0.4); }
    else if (L === 'mid') { surface = mix(pal.paper, pal.ink, 0.5); text = '#fff'; }
    else { surface = mix(pal.paper, '#fff', 0.35); text = pal.ink; }
  }
  const surfC = str('col.surface');
  if (surfC && surfC !== 'auto') surface = surfC;
  const textC = str('col.text');
  if (textC && textC !== 'auto') text = textC;
  if (text) t.text = text;

  const opacity = num('vis.opacity');
  const fill = str('vis.fill');
  const surface2 = str('col.surface2') ?? (surface ? mix(surface, lightness === 'dark' ? '#fff' : '#000', 0.12) : '');
  if (surface || opacity !== undefined || fill) {
    const base = surface || (panel.bg && 'solid' in panel.bg && !panel.bg.solid.startsWith('@') ? panel.bg.solid : surface || mix(pal.paper, '#fff', 0.35));
    const a = opacity ?? (legacy ? 1 : q.num('vis.opacity', 1));
    const grad = val('col.gradient');
    let bg: Paint;
    if ((fill ?? q.str('vis.fill', 'solid')) === 'gradient') {
      const go = gradientPaint(grad, pal, a);
      const gs = typeof grad === 'string' ? grad : '';
      const stops = gs.includes(',') ? gs.split(',') : [base, surface2 || mix(base, '#000', 0.2)];
      bg = go ?? { linear: { angle: 180, stops: stops.map((c, i) => [i / Math.max(1, stops.length - 1), setAlpha(c.trim(), a)] as [number, string]) } };
    } else bg = { solid: setAlpha(base, a) };
    if (surface || !legacy || opacity !== undefined || fill) {
      panel.bg = bg;
      // 旧皮肤的小地图 / 对话框各有自己的底色覆盖：面板换了底，它们跟着换（否则深色面板旁边留一块浅色地图）
      if (legacy && t.map?.bg) t.map = { ...t.map, bg };
      if (legacy && t.dialog?.bg) t.dialog = { ...t.dialog, bg };
      // 面板变得够不透明以后，原来的字色（比如毛玻璃的白字）可能和新底色撞上：对比 < 3 就换成墨色 / 米白
      if (a >= 0.75 && !text) {
        const pc = resolveColorIn(base, pal), tc = resolveColorIn(t.text, pal);
        if (contrastRatio(tc, pc) < 3) {
          const nt = luminance(pc) > 0.35 ? '#1f2328' : '#f4f2ec';
          t.text = nt;
          if (t.title?.color) t.title = { ...t.title, color: nt };
          if (t.name?.color) t.name = { ...t.name, color: nt };
          t.textGlow = undefined;
        }
      }
    }
  }

  /* ---- 形状 ---- */
  const corner = str('vis.corner');
  const cornerSize = num('vis.cornerSize');
  if (corner || cornerSize !== undefined) {
    const c = corner ?? q.str('vis.corner', 'sharp');
    const size = cornerSize ?? q.num('vis.cornerSize', 12);
    delete panel.radius; delete panel.chamfer; delete panel.step; delete panel.radiusPct;
    if (c === 'round') panel.radiusPct = size;
    // 切角按 px 画：转角大小是短边的百分比，按典型面板短边（约 80px）折算，至少 6px 才看得出是切角
    else if (c === 'chamfer') panel.chamfer = Math.max(6, size * 1.2);
    else if (c === 'step') panel.step = 3;
  }
  // 分角遮罩（vis.cornerMask，M12b-38，cyberpunk-2077#4 / into-the-breach#21）：只切 / 只圆这几个角；四角全选或没选 = 原来的
  if (ok('vis.cornerMask')) { const cm = q.list('vis.cornerMask').filter((c): c is Corner => ['tl', 'tr', 'br', 'bl'].includes(c)); panel.cornerMask = cm.length && cm.length < 4 ? cm : undefined; }
  // 外形尺寸（M12b-38）：皮肤之后的层显式给了 vis.cornerSize 时箭头尖深 / 扇贝半径 / 阶梯高也按它（皮肤自带的圆角大小不算——那是给面板圆角的）
  if (cornerSize !== undefined && Number.isFinite(cornerSize) && postSkin(q.src('vis.cornerSize'))) panel.shapeSize = cornerSize;
  // 面板外形（vis.panelShape，M12b-38 / 39）：面板、模板容器、浮框、卡面的外轮廓（小组件的外形仍是 vis.silhouette）；box / auto = 按转角画（原来的）
  const pShape = str('vis.panelShape');
  if (pShape) { panel.shape = pShape === 'box' || pShape === 'auto' ? undefined : (pShape as Silhouette); if (panel.shape && panel.seed === undefined) panel.seed = 13; }
  // 生成轮廓的子参数（M12b-39）：随机外形的抖动幅度、干笔刷的飞白 / 笔向 / 笔锋、边缘处理作用的边
  const sj = num('vis.shapeJitter');
  if (sj !== undefined && Number.isFinite(sj)) panel.shapeJitter = sj;
  // 干笔刷参数只在显式给了时写进面板（兜底值不算）：ix.focus = brushSwash 看它决定要不要改用干笔刷外形
  if (given('vis.brushDryness') || given('vis.brushDir') || given('vis.brushTip')) panel.brush = { dryness: q.num('vis.brushDryness', 0.4), dir: q.str('vis.brushDir', 'ltr') === 'rtl' ? 'rtl' : 'ltr', tip: q.num('vis.brushTip', 0.12) };
  const eSides = str('vis.edgeSides');
  if (eSides) panel.edgeSides = eSides === 'top' ? ['t'] : eSides === 'bottom' ? ['b'] : eSides === 'left' ? ['l'] : eSides === 'right' ? ['r'] : undefined;
  const skew = num('vis.skew');
  if (skew !== undefined) panel.skewX = skew;
  const jitter = num('vis.jitter');
  if (jitter !== undefined) { panel.jitter = jitter; panel.rotate = jitter ? jitter * 1.2 : panel.rotate; panel.seed = 7; }
  const edge = str('vis.edge');
  if (edge) { panel.edge = edge as BoxStyle['edge']; panel.seed = panel.seed ?? 11; }
  const blur = num('vis.blur');
  if (blur !== undefined) panel.backdropBlur = blur || undefined;

  /* ---- 描边 ---- */
  const stroke = str('vis.stroke');
  const sw = num('vis.strokeWidth'), sc = str('vis.strokeColor'), sides = str('vis.strokeSides'), glow = num('vis.strokeGlow'), sFade = num('vis.strokeFade');
  if (stroke || sw !== undefined || sc || sides || glow !== undefined || sFade !== undefined) {
    const kind = stroke ?? q.str('vis.stroke', legacy ? 'solid' : 'none');
    const width = sw ?? (panel.border?.width ?? q.num('vis.strokeWidth', 1));
    // 墨色描线永远是深色（M12a-06：深色面板上原来解析成近白，饥荒的黑墨撕边画成白线）；亮描线走 highlightEdge
    const inkish = lightness === 'dark' ? mix(pal.ink, '#000', 0.3) : '#111';
    const colorKey = sc ?? q.str('vis.strokeColor', 'ink');
    const custom = str('col.border');
    const color = colorKey === 'accent' ? '@accent' : colorKey === 'accent2' ? '@accent2' : colorKey === 'highlightEdge' ? 'rgba(255,255,255,0.65)'
      : colorKey === 'metal' ? '#c9a24a' : colorKey === 'darker' ? mix(surface || pal.paper, '#000', 0.45) : colorKey === 'custom' && custom ? custom : panel.border?.color && !sc ? panel.border.color : inkish;
    delete panel.border; delete panel.sides; delete panel.cornerMarks; delete panel.sideEnds;
    if (kind !== 'none') {
      // 线型（M12b-37 加 sticker / inline / stitched / pencil）；贴纸的内外墨环 = col.border（描边色本身不是 custom 时）或墨色
      const style = (['double', 'dashed', 'sticker', 'inline', 'stitched', 'pencil'].includes(kind) ? kind : 'solid') as NonNullable<NonNullable<BoxStyle['border']>['style']>;
      const ink = kind === 'sticker' ? (custom && colorKey !== 'custom' ? custom : lightness === 'dark' ? '#000' : '#111') : undefined;
      const fade = sFade !== undefined && sFade > 0 ? Math.min(0.5, sFade) : undefined;
      const b = { width, color, style, glow: glow ?? q.num('vis.strokeGlow', 0), ...(ink ? { ink } : {}), ...(fade ? { fade } : {}) };
      const sd = sides ?? q.str('vis.strokeSides', 'all');
      // corners = 取景框式的四角括角（M12a-06，原来和 all 一样画整框）：臂长 = vis.cornerSize（没给时 12）
      if (sd === 'corners') panel.cornerMarks = { len: cornerSize ?? 12, width: Math.max(1, width), color };
      else if (sd === 'all') panel.border = b;
      // leftRight = 左右两条竖线（栏线 / 刻度导轨的底，M12b-37）；endSquares = 上下两条开口线 + 线端小方块（二次元白卡）
      else if (sd === 'endSquares') { panel.sides = { t: b, b }; panel.sideEnds = { inset: 0.04, square: Math.max(2.5, width * 2.5) }; }
      else panel.sides = sd === 'left' ? { l: b } : sd === 'right' ? { r: b } : sd === 'bottom' ? { b } : sd === 'leftRight' ? { l: b, r: b } : { t: b, b };
    }
    // 另存一份描边（M12b-68）：下面的外框结构（ast.frame）会删掉面板描边，格子 / 按目标描边仍按描边参数画
    t.edge = { border: panel.border, sides: panel.sides, cornerMarks: panel.cornerMarks };
    // 数值条底槽的描边跟着面板描边走（M12a-06）：底槽本来有描边、又显式给了宽度 / 颜色时换成同样的
    if ((sw !== undefined || sc) && t.bar.track.border) t.bar = { ...t.bar, track: { ...t.bar.track, border: { ...t.bar.track.border, width: sw ?? t.bar.track.border.width, color: sc ? color : t.bar.track.border.color } } };
  }
  // 粗细调制（vis.strokeModulation，M12b-44）：显式给了才写进现有的描边（方框四边 / 分边画成两端细、中段胖的膨线；旧皮肤自带的描边也认皮肤之后的层给的值）
  const sMod = num('vis.strokeModulation');
  if (sMod !== undefined && Number.isFinite(sMod) && sMod > 0) {
    const m = Math.min(1, sMod), withMod = (sd: BoxStyle['sides']) => (sd ? (Object.fromEntries(Object.entries(sd).map(([k, b]) => [k, b ? { ...b, mod: m } : b])) as BoxStyle['sides']) : sd);
    if (panel.border) panel.border = { ...panel.border, mod: m };
    panel.sides = withMod(panel.sides);
    if (t.edge) t.edge = { ...t.edge, border: t.edge.border ? { ...t.edge.border, mod: m } : undefined, sides: withMod(t.edge.sides) };
  }

  /* ---- 立体与光泽 ---- */
  const depth = str('vis.depth');
  // 1 美术像素（像素倒角、凹槽线宽跟 vis.pixelScale）
  const pxk = q.str('vis.pixelScale', 'off'), artPx = !ok('vis.pixelScale') && legacy ? 1 : pxk === 'x2' || pxk === 'world' ? 2 : pxk === 'x3' ? 3 : pxk === 'x4' ? 4 : 1;
  // 偏移阴影的距离 / 方向 / 颜色（M12b-36，persona5#8 的红白垫块、neobrutal 可调硬投影）：没给时各立体的原来画法
  const dOff = num('vis.depthOffset'), dAng = num('vis.depthAngle'), dColK = str('vis.depthColor');
  const dSet = dOff !== undefined || dAng !== undefined || (!!dColK && dColK !== 'auto');
  if (depth || (dSet && !legacy)) {
    const kind = depth ?? q.str('vis.depth', 'flat');
    const ink = lightness === 'dark' ? '#000' : '#111';
    const face = resolveColorIn(surface || (panel.bg && 'solid' in panel.bg ? panel.bg.solid : '') || pal.paper, pal);
    const dCol = !dColK || dColK === 'auto' ? undefined : dColK === 'ink' ? ink : dColK === 'accent' ? '@accent' : dColK === 'accent2' ? '@accent2' : dColK === 'surface2' ? (surface2 || mix(face, '#000', 0.2))
      : dColK === 'darker' ? mix(setAlpha(face, 1), '#000', 0.4) : dColK === 'custom' ? str('col.border') ?? ink : refColor(dColK, pal, ink);
    // 方向向量按主轴归一（135° = (d, d)，与原来硬投影的 (4, 4) 同义；180° = 正下）；没给偏移与方向时用原来的写死值
    const fixed = dOff === undefined && dAng === undefined;
    const vec = (defAng: number): [number, number] => { const D = dOff !== undefined ? px1080(dOff) : 4, a = ((dAng ?? defAng) * Math.PI) / 180, vx = Math.sin(a), vy = -Math.cos(a), m = Math.max(Math.abs(vx), Math.abs(vy)) || 1; return [Math.round(((D * vx) / m) * 100) / 100, Math.round(((D * vy) / m) * 100) / 100]; };
    const [hx, hy] = fixed ? [4, 4] : vec(135), [sx0, sy0] = fixed ? [0, 4] : vec(180);
    const p = artPx;
    const sh: Record<string, Shadow[]> = {
      flat: [],
      softDrop: [{ color: dCol ? withAlpha(resolveColorIn(dCol, pal), 0.35) : 'rgba(0,0,0,0.22)', x: sx0, y: sy0, blur: 14 }],
      hardDrop: [{ color: dCol ?? ink, x: hx, y: hy, blur: 0 }],
      innerShadow: [{ color: 'rgba(0,0,0,0.35)', x: 0, y: 2, blur: 6, inset: true }],
      bevel: [{ color: 'rgba(255,255,255,0.55)', x: 0, y: 1.5, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.35)', x: 0, y: -1.5, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.3)', x: 0, y: 2, blur: 3 }],
      soft3d: [{ color: 'rgba(255,255,255,0.7)', x: -4, y: -4, blur: 10 }, { color: 'rgba(0,0,0,0.25)', x: 5, y: 5, blur: 12 }],
      // M12b-36：实心厚度（只向偏移方向、无模糊、色比面深；candy 按钮的底部厚度）与像素倒角（上左亮、下右暗各 1 美术像素，pixelWood）
      extrude: [{ color: dCol ?? mix(setAlpha(face, 1), '#000', 0.35), x: sx0, y: sy0, blur: 0, sweep: true }],
      pixelBevel: [{ color: 'rgba(255,255,255,0.5)', x: p, y: p, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.45)', x: -p, y: -p, blur: 0, inset: true }],
    };
    // 叠纸（M12b-63，vis.depth = layeredPaper）：后面垫两张错开的纸 + 一层软投影
    if (kind === 'layeredPaper') { sh.layeredPaper = [{ color: 'rgba(0,0,0,0.22)', x: 0, y: 3, blur: 8 }]; panel.paperStack = 2; }
    // 光源方向（vis.lightAngle，M12b-63，K1 新拟态 G-depth-neumorph）：soft3d 的亮影朝光、暗影背光，bevel / 内阴影的亮暗边跟着转（像素倒角不转：像素皮肤的光固定左上）；没给时原来的左上光
    const la = given('vis.lightAngle') ? num('vis.lightAngle') : undefined;
    if (la !== undefined && Number.isFinite(la)) {
      const a = (la * Math.PI) / 180, lx = Math.sin(a), ly = -Math.cos(a), at = (d: number): [number, number] => [Math.round(lx * d * 100) / 100, Math.round(ly * d * 100) / 100];
      const [hx1, hy1] = at(5.66), [hx2, hy2] = at(1.5);
      sh.soft3d = [{ color: 'rgba(255,255,255,0.7)', x: hx1, y: hy1, blur: 10 }, { color: 'rgba(0,0,0,0.25)', x: -hx1 * 1.25, y: -hy1 * 1.25, blur: 12 }];
      sh.bevel = [{ color: 'rgba(255,255,255,0.55)', x: -hx2, y: -hy2, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.35)', x: hx2, y: hy2, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.3)', x: -hx2 * 1.33, y: -hy2 * 1.33, blur: 3 }];
      sh.innerShadow = [{ color: 'rgba(0,0,0,0.35)', x: -hx2 * 1.33, y: -hy2 * 1.33, blur: 6, inset: true }];
    }
    panel.shadows = sh[kind] ?? panel.shadows;
  }
  // 分层立体（vis.depth@frame / @core / @well，M12b-36，factorio#0）：外框带凸 / 内芯平 / 凹槽凹；这三个是面板的层，不是目标（读字面键，旧皮肤只认皮肤之后的层）
  const layerOf = (part: string) => { const k = `vis.depth@${part}`; const v = admit(r, legacy, k) ? r.str(k, '') : ''; return v && v !== 'auto' ? v : ''; };
  const dFrame = layerOf('frame'), dCore = layerOf('core'), dWell = layerOf('well');
  const faceC = setAlpha(resolveColorIn(surface || (panel.bg && 'solid' in panel.bg ? panel.bg.solid : '') || pal.paper, pal), 1);
  if (dFrame || dCore) {
    const s2 = str('col.surface2'), band = s2 && s2 !== 'auto' ? s2 : luminance(faceC) < 0.35 ? mix(faceC, '#fff', 0.22) : mix(faceC, '#000', 0.1);
    panel.layers = { ...(dFrame ? { frame: { width: px1080(12), depth: dFrame, color: band, px: artPx } } : {}), ...(dCore ? { core: { depth: dCore, px: artPx } } : {}) };
  }
  // 凹槽（§2 的 tokens.well）：比面板深一档的底 + 内凹线（vis.depth@well 换立体：innerShadow = 默认的凹、pixelBevel、bevel、flat）
  const wk = dWell || 'innerShadow', wp = artPx;
  t.well = {
    bg: { solid: luminance(faceC) < 0.35 ? mix(faceC, '#000', 0.3) : mix(faceC, '#000', 0.14) }, radius: panel.radiusPct !== undefined ? 4 : panel.step ? 0 : 2,
    shadows: wk === 'flat' ? [] : wk === 'bevel' ? [{ color: 'rgba(255,255,255,0.4)', x: wp, y: wp, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.4)', x: -wp, y: -wp, blur: 0, inset: true }]
      : [{ color: 'rgba(0,0,0,0.5)', x: wp, y: wp, blur: wk === 'pixelBevel' ? 0 : wp, inset: true }, { color: 'rgba(255,255,255,0.18)', x: -wp, y: -wp, blur: 0, inset: true }],
  };
  const gloss = str('vis.gloss');
  if (gloss) panel.gloss = gloss === 'none' ? undefined : (gloss as BoxStyle['gloss']);
  // 渐隐（vis.fade / vis.fadeLength，M12b-41，octopath#1 的宝蓝两端渐隐带、elden-ring#43 的上下羽化横带）
  const fadeD = str('vis.fade'), fadeL = num('vis.fadeLength');
  if (fadeD || fadeL !== undefined) { const fd = fadeD ?? q.str('vis.fade', 'none'); panel.fade = fd === 'none' || fd === 'auto' ? undefined : { dir: fd, len: Math.max(0.01, Math.min(0.5, fadeL ?? q.num('vis.fadeLength', 0.25))) }; }

  /* ---- 图案、材质、装饰 ---- */
  const pattern = str('vis.pattern');
  const pOp = num('vis.patternOpacity');
  // 图案的作用区域 / 抖动矩阵 / 放射中心（M12b-42）；多色图案（双色网屏、肯特布、龟甲、花朵网点）的第二 / 第三色取强调色 / 第二强调色 / 字色
  const pArea = str('vis.patternArea'), pMat = str('vis.ditherMatrix'), pOrig = str('vis.patternOrigin');
  if (pattern || pOp !== undefined || pArea || pMat || pOrig) {
    const kind = pattern ?? q.str('vis.pattern', 'none');
    const ov: NonNullable<BoxStyle['overlay']> = { kind, opacity: pOp ?? q.num('vis.patternOpacity', 0.3), color: text || '#000' };
    const area = pArea ?? q.str('vis.patternArea', 'panel');
    if (area && area !== 'panel' && area !== 'auto') {
      ov.area = area;
      const sd0 = q.str('vis.strokeSides', 'all');
      if (area === 'edgeStrip') ov.edges = ({ left: 'l', right: 'r', bottom: 'b', topBottom: 'tb', leftRight: 'lr', endSquares: 'tb' } as Record<string, string>)[sd0] ?? 'trbl';
    }
    if (kind === 'halftoneDuo' || kind === 'tortoiseShell') ov.colors = ['@accent', '@accent2'];
    else if (kind === 'kente') ov.colors = ['@accent', '@accent2', text || '#111'];
    else if (kind === 'flowerTone') ov.colors = ['@accent'];
    if (kind === 'dither') { ov.matrix = (pMat ?? q.str('vis.ditherMatrix', 'bayer4')) === 'bayer8' ? 'bayer8' : 'bayer4'; ov.cell = artPx; }
    if (kind === 'sunburst') ov.origin = ({ top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5], tl: [0, 0], br: [1, 1] } as Record<string, [number, number]>)[pOrig ?? q.str('vis.patternOrigin', 'center')] ?? [0.5, 0.5];
    panel.overlay = kind === 'none' ? undefined : ov;
  }
  const core = str('ast.core'), coreMat = str('ast.coreMat');
  if (core || coreMat) {
    const c = core ?? q.str('ast.core', 'procedural');
    panel.material = c === 'texture' || c === 'illustration' ? (coreMat ?? q.str('ast.coreMat', 'paper')) : undefined;
    // 材质内芯改变了底色深浅：字色对不上（对比 < 3）就换成墨色 / 米白，标题与人名一起换。
    // 渐变底的内芯按渐变平均色着色（R4 回归修复 elden-ring#49，paint.ts 的 paintBase），对比也按它查；
    // 纯色底的内芯也是按底色着色画的（paint.ts drawBox：fillMaterial 的基色 = 底色），对比按底色查（整合修复 U#1：原来按材质基色查——
    // 布纹 #7a2b2b 是深红，奶油色面板上的字因此被换成米白，油画配方下视觉小说的台词看不见）；没有底色时才用材质自己的基色
    const pg = panel.material && panel.bg && ('linear' in panel.bg || 'radial' in panel.bg) ? gradientMean(('linear' in panel.bg ? panel.bg.linear.stops : panel.bg.radial.stops).map(([o, c]) => [o, resolveColorIn(c, pal)] as [number, string])) : undefined;
    const ps = panel.material && panel.bg && 'solid' in panel.bg ? resolveColorIn(panel.bg.solid, pal) : undefined;
    const mb = panel.material ? (pg ? setAlpha(pg, 1) : ps && parseColor(ps)[3] >= 0.5 ? setAlpha(ps, 1) : MATERIAL_BASE[panel.material]) : undefined;
    if (mb) {
      const tc = resolveColorIn(t.text, pal);
      if (contrastRatio(tc, mb) < 3) {
        const nt = luminance(mb) > 0.35 ? '#2a2018' : '#f4efe4';
        t.text = nt;
        if (t.title?.color && contrastRatio(resolveColorIn(t.title.color, pal), mb) < 3) t.title = { ...t.title, color: nt };
        if (t.name?.color && contrastRatio(resolveColorIn(t.name.color, pal), mb) < 3) t.name = { ...t.name, color: nt };
      }
    }
  }
  // 磨损与表面处理（M12b-52）：ast.wear 叠划痕 / 缺口 / 角部压暗；ast.finish 叠箔 / 镭射 / 多彩 / 玻璃（按目标：@card、@slot……）
  const wear = num('ast.wear');
  if (wear !== undefined) panel.wear = wear > 0 ? Math.min(1, wear) : undefined;
  const finish = str('ast.finish');
  if (finish) panel.finish = finish === 'none' || finish === 'auto' ? undefined : finish;
  // M12b-63 K1 视觉语言余项（都只在显式给了时写进面板）：
  // 套印错位（vis.misregister 0~3 px@1080p、vis.misregisterAngle 方向，默认 135° = 往右下错）：面板垫一块错开的强调色版，标题字先画一遍错开的强调色
  const misK = given('vis.misregister') ? num('vis.misregister') : undefined;
  if (misK !== undefined && misK > 0) {
    const a = (((given('vis.misregisterAngle') ? num('vis.misregisterAngle') : undefined) ?? 135) * Math.PI) / 180, d = px1080(Math.min(3, misK));
    const mr = { x: Math.round(Math.sin(a) * d * 100) / 100, y: Math.round(-Math.cos(a) * d * 100) / 100, color: resolveColorIn('@accent', pal) };
    panel.misregister = mr;
    t.title = { ...(t.title ?? {}), misregister: mr };
  }
  // 做旧（ast.aging，多选）
  if (given('ast.aging')) { const ag = q.list('ast.aging').filter((x) => AGING_KINDS.includes(x)); panel.aging = ag.length ? ag : undefined; }
  // 毛玻璃的着色 / 亮边 / 颗粒（vis.blurTint / vis.edgeLight / vis.grain）：与 vis.blur 的背景虚化分开
  const gTint = given('vis.blurTint') ? str('vis.blurTint') : undefined, gEdge = given('vis.edgeLight') ? str('vis.edgeLight') : undefined, gGrain = given('vis.grain') ? num('vis.grain') : undefined;
  if ((gTint && gTint !== 'auto') || (gEdge && gEdge !== 'none' && gEdge !== 'auto') || (gGrain !== undefined && gGrain > 0)) {
    panel.glass = { ...(gTint && gTint !== 'auto' ? { tint: refColor(gTint, pal, '#ffffff') } : {}), ...(gEdge && gEdge !== 'none' && gEdge !== 'auto' ? { edge: gEdge } : {}), ...(gGrain !== undefined && gGrain > 0 ? { grain: Math.min(1, gGrain) } : {}) };
  }
  // 外框结构：平框 / 雕花九宫格画成材质带（取代描边），包角叠在描边上（M3.5 程序化；M11 换素材）
  const frameK = str('ast.frame'), frameMatK = str('ast.frameMat');
  if (frameK || frameMatK) {
    const kind = frameK ?? q.str('ast.frame', 'procedural');
    if (kind && kind !== 'procedural' && kind !== 'auto') {
      panel.frame = { kind, mat: frameMatK ?? q.str('ast.frameMat', 'wood'), width: kind === 'cornersOnly' ? 5 : 7, motif: q.str('vis.motif', 'none') };
      if (kind !== 'cornersOnly') { delete panel.border; delete panel.sides; delete panel.ring; }
    } else delete panel.frame;
  }
  // 框厚（ast.frameThickness，M12b-50，px@1080p）：显式给了才换（原来固定 7 / 包角 5 设计单位），程序带与位图边带都按它
  const frameT = num('ast.frameThickness');
  if (frameT !== undefined && Number.isFinite(frameT) && frameT > 0 && panel.frame) panel.frame = { ...panel.frame, width: px1080(Math.max(2, Math.min(24, frameT))) };
  const fxv = val('ast.fx');
  if (fxv !== undefined) {
    const kinds = (Array.isArray(fxv) ? fxv : String(fxv ?? '').split(',')).map(String).filter((x) => x && x !== 'auto');
    panel.fx = kinds.length ? { kinds, color: '@accent' } : undefined;
  }
  const ornament = num('vis.ornament'), motif = str('vis.motif'), parts = val('ast.ornaments'), noiseD = num('vis.noiseDensity');
  if (ornament !== undefined || motif || parts !== undefined || noiseD !== undefined) {
    const level = ornament ?? q.num('vis.ornament', 0);
    const frameMat = q.str('ast.frameMat', '');
    const color = frameMat === 'gold' || frameMat === 'bronze' ? '#c9a24a' : str('vis.strokeColor') === 'accent' ? '@accent' : (panel.border?.color ?? (text || '@ink'));
    // 作用范围与最小面板（M12a-07）：有人给了才用（旧皮肤要皮肤之后的层给）；没给 = 原来的画法（全部面板、分隔线要盒子够高、角饰不限）
    const oScope = str('ast.ornamentScope');
    const oMin = num('ast.ornamentMinSize');
    // 分隔线样式（vis.dividerStyle，M12a-08）：plain = 只画两段线；没给 = 原来中间带母题符号的分隔线
    const dStyle = str('vis.dividerStyle');
    panel.ornament = {
      level, motif: motif ?? q.str('vis.motif', 'none'), color, parts: q.list('ast.ornaments'), named: q.src('ast.ornaments')?.layer === 'derived' ? [] : q.list('ast.ornaments'),
      scope: oScope === 'auto' ? undefined : oScope, minSize: oMin !== undefined && Number.isFinite(oMin) && oMin >= 0 ? px1080(oMin) : undefined,
      dividerStyle: dStyle && dStyle !== 'auto' ? dStyle : undefined,
    };
    // 饰件线两端渐隐（vis.strokeFade，M12b-37）：分隔饰条跟描边同一个比例
    const oFade = num('vis.strokeFade');
    if (oFade !== undefined && oFade > 0) panel.ornament.fade = Math.min(0.5, oFade);
    // 粗细调制（vis.strokeModulation，M12b-44）：显式给了才写（0 = 等宽，卷草母题也等宽）；没给时卷草母题按母题默认
    const oMod = num('vis.strokeModulation');
    if (oMod !== undefined && Number.isFinite(oMod)) panel.ornament.mod = Math.max(0, Math.min(1, oMod));
    // 功能性微字饰件（M12b-48）：数据噪声块的密度 / 字色（col.muted，没给时字色 60%）/ 字族（窄体），刻度侧轨画在哪几条边（vis.strokeSides：没给 = 左右）
    const pl = panel.ornament.parts;
    if (pl.includes('microText') || pl.includes('rulerRail') || pl.includes('registration')) {
      const mc = str('col.muted'), tc = resolveColorIn(text || t.text, pal);
      // 侧轨的边：皮肤之后的层（手动、复刻、关键词……）显式写了 vis.strokeSides 才按它，否则左右；轨面材质只在显式选了外框材质时用（默认的 wood 不算）
      const sd0 = postSkin(q.src('vis.strokeSides')) ? q.str('vis.strokeSides', '') : '';
      panel.ornament.micro = {
        density: Math.max(0, Math.min(1, noiseD ?? q.num('vis.noiseDensity', 0.5))), color: mc && mc !== 'auto' ? refColor(mc, pal, tc) : withAlpha(tc, 0.6), font: FONT_STACK.condensed ?? SANS,
        rail: sd0 === 'all' ? 'trbl' : sd0 === 'topBottom' ? 'tb' : sd0 === 'left' ? 'l' : sd0 === 'right' ? 'r' : 'lr', mat: given('ast.frameMat') && frameMat ? frameMat : undefined,
      };
    }
  }
  // 第二母题（vis.motif2，M12b-43）：分隔线与端头用；写进现有的饰件（旧皮肤自带的饰件也认皮肤之后的层给的值），auto = 跟 vis.motif
  const motif2 = str('vis.motif2');
  if (motif2 && motif2 !== 'auto' && panel.ornament) panel.ornament = { ...panel.ornament, motif2 };
  // 饰色与宝石色（col.ornament / col.gem，M12b-49，hades#25）：选过才换——饰色取代自动的金属色 / 描边色（auto = 原来的），宝石色取代写死的品红宝石 / 红挂件；
  // 饰件挂点 / 出框量 / 端头形（ast.ornamentAnchor / ast.ornamentOverhang / ast.endcapShape）写进现有饰件（旧皮肤自带的饰件也认皮肤之后的层给的值）
  const ornC = str('col.ornament'), gemC = str('col.gem');
  if (ornC && ornC !== 'auto') { t.ornColor = refColor(ornC, pal, text || t.text); if (panel.ornament) panel.ornament = { ...panel.ornament, color: t.ornColor }; }
  if (panel.ornament) {
    const anc = val('ast.ornamentAnchor') === undefined ? [] : q.list('ast.ornamentAnchor').filter((x) => x && x !== 'auto');
    const ovh = num('ast.ornamentOverhang'), ecap = str('ast.endcapShape');
    if (gemC && gemC !== 'auto') panel.ornament = { ...panel.ornament, gem: refColor(gemC, pal, text || t.text) };
    if (val('ast.ornamentAnchor') !== undefined && anc.length) panel.ornament = { ...panel.ornament, anchors: anc };
    if (ovh !== undefined && Number.isFinite(ovh) && ovh > 0) panel.ornament = { ...panel.ornament, overhang: Math.min(1, ovh) };
    if (ecap && ecap !== 'auto') panel.ornament = { ...panel.ornament, endcap: ecap };
  }
  // 分隔线的位置（vis.dividerPlace，M12b-45）：显式给了才写；不含 panelBottom 时饰件的底边分隔线不画（页头下 / 块之间 / 网格行间由 screen.ts 画）
  if (val('vis.dividerPlace') !== undefined && panel.ornament) { const dp = q.list('vis.dividerPlace').filter((x) => x && x !== 'auto'); if (dp.length) panel.ornament = { ...panel.ornament, dividerPlace: dp }; }

  /* ---- 文字 ---- */
  const bodyFam = str('typ.body.family');
  if (bodyFam) t.font = FONT_STACK[bodyFam] ?? t.font;
  const body: TextStyle = { ...(t.body ?? {}) };
  const bw = str('typ.body.weight'); if (bw) body.weight = WEIGHT[bw] ?? 400;
  const bc = str('typ.body.case'); if (bc) body.upper = bc === 'upper' || bc === 'smallCaps';
  const bt = num('typ.body.tracking'); if (bt !== undefined) body.spacing = bt;
  const bs = str('typ.body.style'); if (bs) body.italic = bs === 'italic';
  // 描边色与粗细（M12a-33）：typ.outlineColor（auto = 按字色自动反差，ink / white / accent 或 #hex）、typ.outlineWidth（字号的倍数，默认 0.08，下限 1px，
  // 字号 < 12 设计单位只留投影——paint.ts 的 outlineWidth）；文字可读辅助、标题特效的描边都用它，显式给了时飘字 / 连击 / 评级的描边也换（t.outline）
  const olPick = str('typ.outlineColor'), olW = given('typ.outlineWidth') ? num('typ.outlineWidth') : undefined;
  const olEm = olW !== undefined && Number.isFinite(olW) && olW > 0 ? Math.min(0.3, olW) : q.num('typ.outlineWidth', 0.08);
  const olColor = (auto: string) => (!olPick || olPick === 'auto' ? auto : olPick === 'ink' ? 'rgba(17,17,17,0.9)' : olPick === 'white' ? 'rgba(255,255,255,0.95)' : olPick === 'accent' ? pal.accent : refColor(olPick, pal, text || '#111'));
  if ((olPick && olPick !== 'auto') || olW !== undefined) t.outline = { color: olColor('rgba(0,0,0,0.75)'), widthEm: olEm };
  const leg = str('typ.legibility');
  if (leg) {
    delete body.outline; delete body.shadow; delete body.glowColor;
    const darkText = luminance(text || (lightness === 'dark' ? '#fff' : '#111')) < 0.4;
    const halo = darkText ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
    if (leg === 'outline') body.outline = { color: olColor(halo), width: 2, widthEm: olEm };
    else if (leg === 'shadow') body.shadow = { color: halo, x: 0, y: 1, blur: 3 };
    else if (leg === 'scrim') body.shadow = { color: halo, x: 0, y: 0, blur: 8 };
    else if (leg === 'textGlow') body.glowColor = text || '@accent';
  }
  if (t.body || Object.keys(body).length) t.body = body;
  // 基准字号是 px@1080p（M12a-05）：换成设计单位 ×0.5（26 → 13，PC 默认）；原来按 CSS 像素 ×0.93 用，电视的 26 画成约两倍大
  const size = num('typ.baseSize');
  if (size !== undefined) t.textSize = px1080(size);
  // 版面缩放跟基准字号走（字号定了以后的样子），再乘玩家的 UI 缩放 / 文字缩放（M8b）；画布缩放 unitK 由 HudSystem 整张画布乘
  const layoutBase = size !== undefined ? Math.max(0.85, (t.textSize ?? 13) / 13) : 1;
  // 文字缩放（a11y.textScale）：版面（盒子、格子、数值条）只放大 60%，字在绘制层再乘 textK（paint.ts 的 TEXT_K），
  // 合起来字正好放大 ts 倍；按量出来的字宽排的盒子自然跟上，写死宽度的会溢出——由溢出检查标出
  const ts = Math.max(0.5, q.num('a11y.textScale', 1));
  const us = Math.max(0.5, q.num('a11y.uiScale', 1));
  const grow = 1 + (ts - 1) * 0.6;

  // 标题样式的补丁同时打到标题与名字（对话框里的人名）上；旧皮肤没改时两者原样
  const tp: TextStyle = {};
  let fxReset = false;
  const df = str('typ.display.family');
  if (df) tp.font = df === 'same' ? undefined : DISPLAY_STACK[df];
  // 勒索信（M12a-33）：字族池在 paint.ts 逐字取，这里只打标记（原来只是一套粗黑体）
  if (df) tp.ransom = df === 'ransom' || undefined;
  const dw = str('typ.display.weight'); if (dw) tp.weight = WEIGHT[dw] ?? 700;
  const dc = str('typ.display.case'); if (dc) tp.upper = dc === 'upper' || dc === 'smallCaps';
  const dt = num('typ.display.tracking'); if (dt !== undefined) tp.spacing = dt;
  const ds = str('typ.display.style'); if (ds) tp.italic = ds === 'italic';
  const scale = num('typ.scale');
  const titleSize = scale !== undefined || size !== undefined
    ? Math.round((t.textSize ?? 13) * Math.min(1.8, Math.max(1, (scale ?? q.num('typ.scale', 1.4)) * 0.8)))
    : undefined;
  const fx = str('typ.titleFx');
  if (fx) {
    fxReset = true;
    const halo = luminance(text || '#111') < 0.4 ? '#fff' : '#000';
    if (fx === 'outline' || fx === 'outlineShadow') tp.outline = { color: olColor(halo), width: 2.5, widthEm: olEm };
    if (fx === 'shadow' || fx === 'outlineShadow') tp.shadow = { color: 'rgba(0,0,0,0.6)', x: 2, y: 2, blur: 0 };
    if (fx === 'metal') tp.metal = true;
    if (fx === 'titleGlow' || fx === 'fire') tp.glowColor = fx === 'fire' ? '#ff7a1a' : '@accent';
    if (fx === 'emboss') tp.shadow = { color: 'rgba(0,0,0,0.5)', x: 0, y: 3, blur: 0 };
  }
  const patchTitle = (s: TextStyle | undefined, sz: number | undefined): TextStyle | undefined => {
    if (!Object.keys(tp).length && !fxReset && sz === undefined) return s;
    const o: TextStyle = { ...(s ?? {}) };
    if (fxReset) { delete o.outline; delete o.shadow; delete o.glowColor; delete o.metal; }
    Object.assign(o, tp);
    if (sz !== undefined) o.size = sz;
    return o;
  };
  // 展示字体的作用范围（M12b-55，typ.display.scope）：显式给了时标题 / 人名只在列进范围时才换展示字体（Persona 的正文是干净黑体、名签与菜单词用勒索信），
  // 其余角色（菜单词、数字、按钮）经 displayFor 取 face；没给时原来的（标题 + 人名）。
  // 中期审查修复 ⑫：不在范围里的标题 / 人名去掉整套展示字面（字族、勒索信、字重、大小写、字距、斜体——原来只去字族与勒索信，字重 / 全大写 / 字距 / 斜体照样套上），
  // 回到皮肤原来的字样；标题字号（typ.scale）与标题特效（typ.titleFx：描边 / 投影 / 金属 / 发光）仍对所有标题生效
  const dScope = given('typ.display.scope') ? q.list('typ.display.scope').filter((x) => x !== 'auto') : null;
  const face: Partial<TextStyle> = { ...(t.title?.font ? { font: t.title.font } : {}), ...(t.title?.ransom ? { ransom: true } : {}), ...(t.title?.weight ? { weight: t.title.weight } : {}), ...tp };
  // 展示字面的字段（typ.display.family / weight / case / tracking / style 写进 tp 的那几项）；其余（描边 / 投影 / 发光 / 金属）是标题特效
  const FACE_KEYS = ['font', 'ransom', 'weight', 'upper', 'spacing', 'italic'] as const;
  const fxOnly = (s0: TextStyle | undefined, sz: number | undefined): TextStyle | undefined => {
    const keep: TextStyle = { ...tp };
    for (const k of FACE_KEYS) delete keep[k];
    if (!Object.keys(keep).length && !fxReset && sz === undefined) return s0;
    const o: TextStyle = { ...(s0 ?? {}) };
    if (fxReset) { delete o.outline; delete o.shadow; delete o.glowColor; delete o.metal; }
    Object.assign(o, keep);
    if (sz !== undefined) o.size = sz;
    return o;
  };
  // 打满补丁的标题（展示字面 + 特效 + 字号）：不按范围剪——数字 / 按钮写 family = display 时取它的字族 / 字重 / 勒索信（中期审查修复 ⑪：原来取范围剪过的 t.title，标题不在范围里时退成正文字）
  const dispTitle = patchTitle(t.title, titleSize);
  const inScope = (role: string) => !dScope || dScope.includes(role);
  t.title = inScope('title') ? dispTitle : fxOnly(t.title, titleSize);
  t.name = inScope('nameplate') ? patchTitle(t.name, undefined) : fxOnly(t.name, undefined);
  if (dScope) t.display = { scope: dScope, face };
  // 文字系统（M12b-55，typ.script）：cjk = 中文为主，正文字号 + 2 px@1080p（细笔画的中文在小字号下糊）；mixed + 1；latin / auto = 原来的
  const script = str('typ.script');
  if (script === 'cjk' || script === 'mixed') t.textSize = (t.textSize ?? 13) + px1080(script === 'cjk' ? 2 : 1);

  /* ---- 色彩策略：图标与血条 ---- */
  const strategy = str('col.strategy');
  if (strategy) {
    t.icon = strategy === 'mono' ? (text || t.text) : '@accent';
    const fillC = strategy === 'mono' ? (text || t.text) : strategy === 'duotone' ? '@accent2' : strategy === 'polychrome' ? '@good' : '@accent';
    t.bar = { ...t.bar, fill: { ...t.bar.fill, bg: { solid: fillC } } };
  }
  const inkC = resolveColorIn(t.text, pal);
  const roles = deriveRoles(str, q, pal, strategy, cvd, inkC);
  // 图标色对面板底至少 3 : 1（§8 RC4，轨道 E）：强调色当图标色时，浅色面板上的粉 / 深色格子上的暗红图标看不清——沿明暗方向调到 3 : 1；手动选了 col.icon 的照它
  if (QUALITY.on && !(str('col.icon') && str('col.icon') !== 'auto')) {
    const face = setAlpha(resolveColorIn(surface || (panel.bg && 'solid' in panel.bg ? panel.bg.solid : '') || pal.paper, pal), 1);
    roles.icon = ensureContrast(roles.icon, face, 3);
  }
  const colorOf = (k: string) => { const c = str(k); return c && c !== 'auto' ? refColor(c, pal, inkC) : undefined; };
  // 标题色（M12a-03，col.heading）：标题与人名的字样（模板页头、元素标题都读 e.title / e.name）；auto = 原来的（皮肤的标题色或正文色）
  const heading = colorOf('col.heading');
  if (heading) { t.title = { ...(t.title ?? {}), color: heading }; t.name = { ...(t.name ?? {}), color: heading }; }
  if (!legacy || corner || cornerSize !== undefined) {
    // 血条跟面板的转角走
    t.bar.track = { ...t.bar.track, radiusPct: panel.radiusPct !== undefined ? 50 : undefined, step: panel.step ? 2 : undefined };
    t.bar.fill = { ...t.bar.fill, radiusPct: panel.radiusPct !== undefined ? 50 : undefined };
  }
  if (!legacy) {
    t.bar.track.bg = { solid: withAlpha(text || '#000', 0.15) };
    t.key = { ...t.key, bg: { solid: '@accent' }, color: '#fff', radiusPct: panel.radiusPct !== undefined ? 25 : undefined, step: panel.step ? 2 : undefined, border: panel.border ? { ...panel.border } : undefined };
  }
  // 条的空槽（M12a-03）：col.track（darkScrim = 45% 黑）写进数值条底槽，col.trackStroke = none 去掉底槽描边、#hex 换描边色。
  // M12a-11：挪到新皮肤的默认底槽之后（原来写在前面，新皮肤上被「正文色 15%」盖掉，col.track 只对旧皮肤生效）；空槽色另记 trackColor，
  // 分段 / 细条 / 环 / 竖条等画法的空槽读它；auto 时「条高 < 6 的横条自动去描边」在 core.ts 的 gauge() 里做
  const track = str('col.track'), trackStroke = str('col.trackStroke');
  if (track && track !== 'auto') { const c = track === 'darkScrim' ? 'rgba(0,0,0,0.45)' : refColor(track, pal, inkC); t.bar = { ...t.bar, track: { ...t.bar.track, bg: { solid: c } }, trackColor: c }; }
  if (trackStroke && trackStroke !== 'auto') {
    const tb = { ...t.bar.track };
    if (trackStroke === 'none') { delete tb.border; delete tb.sides; }
    else tb.border = { width: tb.border?.width ?? 1, color: refColor(trackStroke, pal, inkC) };
    t.bar = { ...t.bar, track: tb, trackStroke };
  }
  // 强调色底上的字色（M12a-04）：白字对比 ≥ 3 用白；否则面板偏深用面板底色、偏浅用 #1f2328。新皮肤写进按键字色（主按钮、选中页签、菜单选中行、
  // segmented 选中项都读按键字色），标牌 / 徽章 / 回合横幅这类强调色底直接读 t.onAccent；patchTheme 按目标重算（col.accent@button……）。
  // 旧皮肤只在皮肤之后显式换了强调色时才算，且只改强调色底的按键；没换时 onAccent 不设，各处沿用原来的白字
  // 品质下限（§8 RC6）：旧皮肤也按强调色派生（皮肤的强调色换成了自己的一对，浅色强调上的白字看不清）；白字对比 ≥ 4.5 才用白，否则取深字 / 面板底里对比高的那个
  // 旧皮肤没换强调色时：皮肤这一对强调色上白字够 4.5 就照原来不派生（白字），不够才派生（浅色强调上的字换深）
  const legacyDerive = legacy && !!pair && !(isHex(acc) && postSkin(q.src('col.accent'))) && contrastRatio('#fff', pal.accent) < 4.5;
  if (!legacy || (isHex(acc) && postSkin(q.src('col.accent'))) || legacyDerive) {
    const pc = setAlpha(resolveColorIn(surface || (panel.bg && 'solid' in panel.bg ? panel.bg.solid : '') || '#fff', pal), 1);
    const dark = luminance(pc) < 0.35 ? pc : '#1f2328';
    t.onAccent = QUALITY.on ? (contrastRatio('#fff', pal.accent) >= 4.5 || contrastRatio('#fff', pal.accent) >= contrastRatio(dark, pal.accent) ? '#fff' : dark) : contrastRatio('#fff', pal.accent) >= 3 ? '#fff' : dark;
    if (!legacy || (t.key.bg && 'solid' in t.key.bg && t.key.bg.solid === '@accent')) t.key = { ...t.key, color: t.onAccent };
  }

  /* ---- 数字字形（M12b-07，§2 的 drawNumber）：显式给了才设（旧皮肤只认皮肤之后的层），没给时 drawNumber = 原来的 T() ---- */
  // typ.numerals.family 原来只作用在按钮字上（typ.button.family = numerals）；接上 drawNumber 以后资源 / 计时 / 时钟 / 名次 / 数值图形的数字都按它画（M12b-07）
  {
    const pick = (k: string) => { const x = given(k) ? str(k) : undefined; return x && x !== 'auto' ? x : undefined; };
    const nf = pick('typ.numerals.family'), nw = pick('typ.numerals.weight'), ns = pick('typ.numerals.style'), nc = pick('typ.numerals.cells'), fmt = pick('typ.numberFormat');
    const nd = given('typ.numerals.digits') ? num('typ.numerals.digits') : undefined;
    if (nf || nw || ns || nc || fmt || (nd !== undefined && Number.isFinite(nd))) {
      const face: NumeralFace = {};
      if (nf && nf !== 'body') face.family = nf;
      // 字面：display = 标题字的字族（字重仍是元素原来的，要换写 typ.numerals.weight）、pixel = 像素字；其余字族用元素原来的字（逐字排 / 矢量画）
      if (nf === 'display') face.font = dispTitle?.font ?? t.font;
      else if (nf === 'pixel') face.font = FONT_STACK.pixel;
      if (nw) { face.weight = NUM_WEIGHT[nw] ?? 400; face.thick = NUM_THICK[nw] ?? 1; }
      if (ns) face.italic = ns === 'italic';
      if (nd !== undefined && Number.isFinite(nd) && nd > 0) face.digits = Math.min(8, Math.round(nd));
      if (nc === 'inset') face.cells = true;
      if (fmt) face.format = fmt;
      t.numerals = face;
    }
  }

  /* ---- 事件字效（M12b-20）：字内填充 + 硬投影，显式给了才设（旧皮肤只认皮肤之后的层） ---- */
  {
    const fs = given('typ.fillStyle') ? str('typ.fillStyle') : undefined, fc = given('typ.fillColors') ? q.list('typ.fillColors').filter((c) => c && c !== 'auto') : [];
    const so = given('typ.shadowOffset') ? num('typ.shadowOffset') : undefined;
    // 颜色列表的项（B5 审查修复 ①）：与 col.actionColors / 色表同一写法——角色名（health / danger / good / currency……）换成颜色角色、accent / accent2 / text 换成色板与字色、
    // @引用 / #hex 原样解析；换完仍不是颜色的项丢掉（原来角色名原样进渐变，addColorStop('health') 在浏览器里抛 SyntaxError，整帧 HUD 中断）
    const cols = fc.map((c) => roleColor(c, roles, pal, inkOrText(t, pal))).filter(isColorStr);
    const fill = fs && fs !== 'auto' && fs !== 'solid' ? { kind: fs as 'gradient' | 'halftone' | 'metal', ...(cols.length ? { colors: cols } : {}) } : undefined;
    if (fill || (so !== undefined && Number.isFinite(so))) t.textFx = { ...(fill ? { fill } : {}), ...(so !== undefined && Number.isFinite(so) ? { shadow: px1080(Math.max(0, so)) } : {}) };
  }

  /* ---- 按钮（M12a-35）：字体角色、字号、动作角色色 ---- */
  // 字族角色（typ.button.family）：display = 标题字（ITB 的大号像素按钮字）、numerals = 数字字体、body / auto = 正文粗体（原来的）；
  // 字号（typ.button.size）：auto = 正文字号（原来的）、fit = 按钮高 × 0.42、数字 = px@1080p；下限与「scale 只缩框」在 core.ts 的 buttonText
  const bFam = str('typ.button.family'), bSize = given('typ.button.size') ? val('typ.button.size') : undefined;
  const numFam = q.str('typ.numerals.family', 'body');
  // 标题字 = 打满展示补丁的标题（dispTitle，不按 typ.display.scope 剪：中期审查修复 ⑪）
  const dispFont = dispTitle?.font ?? t.font;
  const bFont = bFam === 'display' ? dispFont : bFam === 'numerals' ? (numFam === 'display' ? dispFont : numFam === 'pixel' ? FONT_STACK.pixel : undefined) : undefined;
  const bNum = bSize === undefined || bSize === null || bSize === 'auto' || bSize === 'fit' ? NaN : Number(bSize);
  t.button = {
    font: bFont, weight: bFam === 'display' ? dispTitle?.weight ?? 800 : undefined, ransom: bFam === 'display' ? dispTitle?.ransom : undefined,
    size: Number.isFinite(bNum) && bNum > 0 ? px1080(bNum) : undefined, fit: bSize === 'fit',
    roles: buttonRoles(str('col.semantic'), given('col.actionColors') ? q.list('col.actionColors') : [], roles, pal, inkC),
  };

  /* ---- 外形（按键 / 小地图 / 图标） ---- */
  // 外形跟作用域走（M12a-09：vis.silhouette 进了 THEME_SCOPED，@button / @key / @元素 的按键 token 按目标重算）；none = 不画底座，由 button() 处理，这里不当多边形。
  // 不再读 vis.silhouette@icon（审查修复 B · C5）：那是字面键，不走目标链，原来压过 @button / @key / @元素 把整套按键 token（键帽、主按钮、选中页签）都换形；icon 部件没接上作用域
  const sil = val('vis.silhouette');
  // circle 画成半径 = 短边一半的圆角（方键是正圆、宽按钮 / 页签是药丸，M12a-09；原来是按外接框拉伸的椭圆多边形）
  if (sil === 'circle') t.key = { ...t.key, shape: undefined, circle: undefined, chamfer: undefined, step: undefined, radius: undefined, radiusPct: 50 };
  // edgeTab（贴边页签，B4 审查修复）不是多边形外形：按键 token 不换，按钮的 shapeStyle 按实际的高切左上角
  else if (sil !== undefined && sil !== 'box' && sil !== 'none' && sil !== 'edgeTab') t.key = { ...t.key, shape: sil as BoxStyle['shape'], ...(panel.shapeSize !== undefined ? { shapeSize: panel.shapeSize } : {}), ...(panel.shapeJitter !== undefined ? { shapeJitter: panel.shapeJitter } : {}), ...(panel.brush ? { brush: panel.brush } : {}) };
  const mapForm = val('el.minimap.form');
  // 雷达小地图是正圆：面板外形（vis.panelShape）不套到它上面
  if (mapForm === 'radar') t.map = { ...(t.map ?? {}), circle: true, ...(panel.shape ? { shape: undefined } : {}) };
  const dlg = val('cmp.dialogBox');
  if (dlg === 'bubble') t.dialog = { ...(t.dialog ?? {}), tail: true };
  else if (dlg === 'bare') t.dialog = { ...(t.dialog ?? {}), bg: { solid: 'rgba(0,0,0,0)' }, border: undefined, shadows: [], tail: false };
  else if (dlg === 'bar') t.dialog = { ...(t.dialog ?? {}), tail: false };
  const glyphs = val('ix.glyphs');
  if (glyphs === 'brackets') t.key = { ...t.key, brackets: true };
  else if (glyphs && glyphs !== 'brackets' && t.key.brackets) t.key = { ...t.key, brackets: false };

  // 品质下限（docs/workbench-redesign.md §8 RC3 ③，轨道 E）：面板 / 小地图 / 对话框的底色不透明度至少 0.88（亮场景上半透明的小部件看不清）；
  // 原本就很透的（< 0.3，毛玻璃 / 全息这类靠透明成立的皮肤）与带背景虚化的至少 0.6；完全透明（< 0.04，纯线框皮肤）不动；
  // 皮肤之后的层（手动、复刻、关键词……）显式写了 vis.opacity 的照它。抬完以后字色和底色对比 < 3 时换成墨色 / 米白
  if (QUALITY.on && !postSkin(q.src('vis.opacity'))) {
    // 一个底色的抬法：< 0.04（纯线框）不动，≥ 0.88 不动，否则抬到 0.88（原本 < 0.3 或带背景虚化的抬到 0.6）
    const liftA = (a0: number, blur: boolean) => (a0 < 0.04 || a0 >= 0.88 ? a0 : Math.max(a0, blur || a0 < 0.3 ? 0.6 : 0.88));
    const lift = (b: BoxStyle | undefined): BoxStyle | undefined => {
      if (!b?.bg) return b;
      if ('solid' in b.bg) {
        const c0 = resolveColorIn(b.bg.solid, pal), a0 = parseColor(c0)[3], a1 = liftA(a0, !!b.backdropBlur);
        return a1 === a0 ? b : { ...b, bg: { solid: setAlpha(c0, a1) } };
      }
      // 渐变底（审查修复：原来遇到渐变直接返回，最常见的暗色细线皮肤从不被抬）：按各色标的平均不透明度定倍数，每个色标一起抬（透明的端点按比例跟着抬，渐变形状不变）
      const g0 = 'linear' in b.bg ? b.bg.linear : 'radial' in b.bg ? b.bg.radial : null;
      if (!g0) return b;
      const stops = g0.stops.map(([o, c]) => [o, resolveColorIn(c, pal)] as [number, string]);
      const mean = stops.reduce((x, [, c]) => x + parseColor(c)[3], 0) / Math.max(1, stops.length), m1 = liftA(mean, !!b.backdropBlur);
      if (m1 === mean || mean <= 0) return b;
      const kA = m1 / mean, ns = stops.map(([o, c]) => [o, setAlpha(c, Math.min(1, parseColor(c)[3] * kA))] as [number, string]);
      return { ...b, bg: 'linear' in b.bg ? { linear: { ...b.bg.linear, stops: ns } } : { radial: { ...(b.bg as { radial: typeof g0 }).radial, stops: ns } } } as BoxStyle;
    };
    const p2 = lift(panel);
    if (p2 !== panel && p2) {
      Object.assign(panel, p2);
      const pbg = p2.bg!, pcol = 'solid' in pbg ? pbg.solid : gradientMean(('linear' in pbg ? pbg.linear.stops : (pbg as { radial: { stops: [number, string][] } }).radial.stops).map(([o, c]) => [o, resolveColorIn(c, pal)] as [number, string])) ?? t.text;
      const pc = setAlpha(resolveColorIn(pcol, pal), 1), tc = resolveColorIn(t.text, pal);
      if (contrastRatio(tc, pc) < 3) {
        const nt = luminance(pc) > 0.35 ? '#1f2328' : '#f4f2ec';
        t.text = nt;
        if (t.title?.color && contrastRatio(resolveColorIn(t.title.color, pal), pc) < 3) t.title = { ...t.title, color: nt };
        if (t.name?.color && contrastRatio(resolveColorIn(t.name.color, pal), pc) < 3) t.name = { ...t.name, color: nt };
        t.textGlow = undefined;
      }
    }
    if (t.map) t.map = lift(t.map);
    if (t.dialog) t.dialog = lift(t.dialog);
    // 透明的小地图（审查修复 E 视觉 ⑩：金丝这类纯线框皮肤的小地图只有四个角标，地图直接压在画面上看不清）：小地图底至少 0.88——按字色取深 / 浅底
    const mapBg = (t.map ?? panel).bg, mapA = !mapBg ? 0 : 'solid' in mapBg ? parseColor(resolveColorIn(mapBg.solid, pal))[3] : 1;
    if (mapA < 0.04) {
      const lightText = luminance(resolveColorIn(t.text, pal)) > 0.4;
      t.map = { ...(t.map ?? { ...panel, shadows: undefined, overlay: undefined }), bg: { solid: setAlpha(lightText ? mix(pal.ink, '#000', 0.45) : mix(pal.paper, '#fff', 0.3), 0.88) } };
    }
  }
  // 饰件皮肤的细描边（审查修复 E 视觉 ⑩：华丽 / 金丝只有小地图有金框，队伍、目标、快捷栏、通知用的面板是素矩形，暗场景上几乎看不见）：
  // 面板没有描边、皮肤有饰件色时，面板加一圈 1 单位的饰色细线（皮肤之后显式给了描边的照它）
  if (QUALITY.on && panel.ornament && (panel.ornament.level ?? 0) >= 1 && !panel.border && !panel.sides && !panel.frame && !postSkin(q.src('vis.stroke')) && !postSkin(q.src('vis.strokeWidth'))) {
    const oc = resolveColorIn(String(panel.ornament.color ?? t.ornColor ?? ''), pal);
    if (oc && parseColor(oc)[3] > 0.2) panel.border = { width: 1, color: withAlpha(oc, 0.75) };
  }
  if (QUALITY.on) {
    // 浮起阴影（§8 RC3 ④）：立体 = 平（没有任何投影）的皮肤给面板一层轻微的下投影，面板从画面上浮起来；手动 / 复刻显式选了 vis.depth 的照它，透明的线框面板不加。
    // 在面板的副本（控件面 / 提示框 / 卡面 / 贴边条）复制之前加，副本跟着有
    const pa = panel.bg && 'solid' in panel.bg ? parseColor(resolveColorIn(panel.bg.solid, pal))[3] : panel.bg ? 1 : 0;
    if (!panel.shadows?.length && pa >= 0.5 && !postSkin(q.src('vis.depth'))) panel.shadows = [{ color: 'rgba(0,0,0,0.26)', x: 0, y: 2, blur: 6 }];
  }
  // 控件面 / 提示框 / 标题带 / 卡面（M12a-03）：默认是面板的副本（画法不变）；col.control 换格子与次按钮的面、col.controlText 换次按钮与格子角标的字。
  // 按目标的写法（col.surface@tooltip、@card……）经 patchTheme 重算整块面板，副本跟着变
  const ctl = colorOf('col.control'), ctlText = colorOf('col.controlText');
  t.control = ctl ? { ...panel, bg: { solid: ctl } } : { ...panel };
  // 格子 / 次按钮的面不跟面板的外形与渐隐（M12b-38 / 41：它们的外形是 vis.silhouette；整屏面板渐隐的两端不该把格子抹掉）。
  // 渐隐是按目标写的（vis.fade@button / @el.choices……，Octopath 的指令带）时按钮 / 格子 / 键帽一起渐隐
  const fadeAt = !!panel.fade && !!q.scoped?.('vis.fade');
  if (t.control.shape || (t.control.fade && !fadeAt)) t.control = { ...t.control, shape: undefined, fade: fadeAt ? t.control.fade : undefined };
  if (fadeAt) t.key = { ...t.key, fade: panel.fade };
  if (ctlText) t.controlText = ctlText;
  t.tooltip = { ...panel };
  t.titleBar = { ...panel };
  t.card = { ...panel };
  // 贴边条 / 底座 / 共用底条（M12a-16 / 18，部件 hudBar）：面板的副本，实心底换成 col.surface2（没给时比面板深 / 浅一档）、透明度跟面板；渐变面板保留渐变。@hudBar 的键经 patchTheme 重算
  // 品质下限（审查修复 ⑦）：没在皮肤之后显式给 vis.opacity 时，贴边条的透明度跟抬过的面板走（原来用原始透明度：全息 0.25、合成器 0.6）
  const hbA = QUALITY.on && !postSkin(q.src('vis.opacity')) && panel.bg && 'solid' in panel.bg ? Math.max(parseColor(resolveColorIn(panel.bg.solid, pal))[3], opacity ?? (legacy ? 1 : q.num('vis.opacity', 1))) : opacity ?? (legacy ? 1 : q.num('vis.opacity', 1));
  t.hudBar = surface2 && panel.bg && 'solid' in panel.bg ? { ...panel, bg: { solid: setAlpha(surface2, hbA) } } : { ...panel };
  // 显式选了图标色时皮肤的图标 token 也换（四控件样本、菜单样本、Godot 的 HudIcon 读它）
  const iconPick = str('col.icon');
  if (iconPick && iconPick !== 'auto' && iconPick !== 'item') t.icon = roles.icon;
  // 字对不透明面板至少 4.5 : 1（整合修复 U#1，§8「文字 ≥ 4.5 : 1」）：字色按面板实际画出来的底色（≥ 0.85 不透明的纯色 / 渐变平均色）选，不按背后的场景；
  // 上面几处只在 < 3 时整块换墨色 / 米白，3–4.5 之间的（场景色板混出来的字色）沿明暗方向推到 4.5，标题（大字）到 3。皮肤之后显式给了 col.text 的照它
  if (QUALITY.on && !postSkin(q.src('col.text')) && panel.bg && !('pattern' in panel.bg)) {
    const fb = 'solid' in panel.bg ? resolveColorIn(panel.bg.solid, pal) : gradientMean(('linear' in panel.bg ? panel.bg.linear.stops : panel.bg.radial.stops).map(([o, c]) => [o, resolveColorIn(c, pal)] as [number, string]));
    if (fb && parseColor(fb)[3] >= 0.85) {
      const face = setAlpha(fb, 1), tc = resolveColorIn(t.text, pal);
      const nt = ensureContrast(tc, face, 4.5);
      if (nt !== tc) { t.text = nt; if (text) text = nt; t.textGlow = undefined; if (!roles.mutedSet) roles.muted = withAlpha(nt, 0.6); }
      if (t.title?.color) { const hc = resolveColorIn(t.title.color, pal), nh = ensureContrast(hc, face, 3); if (nh !== hc) t.title = { ...t.title, color: nh }; }
      if (t.name?.color) { const nc = resolveColorIn(t.name.color, pal), nn = ensureContrast(nc, face, 3); if (nn !== nc) t.name = { ...t.name, color: nn }; }
    }
  }
  // 色板角色（M12a-03）：'@heading' / '@icon' / '@muted' / '@quest' 在任何颜色引用里都能解析
  pal.heading = resolveColorIn(t.title?.color ?? t.text, pal);
  pal.icon = roles.icon; pal.muted = roles.muted; pal.quest = roles.objective;

  const px = q.str('vis.pixelScale', 'off');
  const pixel = !ok('vis.pixelScale') && legacy ? 1 : px === 'x2' ? 2 : px === 'x3' ? 3 : px === 'x4' ? 4 : px === 'world' ? 2 : 1;
  if (QUALITY.on && t.key.bg && 'solid' in t.key.bg) {
    // 键帽上的字（§8，轨道 E）：键帽实色底与键字对比 < 4.5 时换白 / 深里对比高的那个（扁平皮肤的键帽底跟场景天色走，浅蓝底上白字只有 2 : 1）
    const kb = parseColor(resolveColorIn(t.key.bg.solid, pal));
    if (kb[3] >= 0.5) {
      const kbc = setAlpha(resolveColorIn(t.key.bg.solid, pal), 1), kc = resolveColorIn(t.key.color ?? t.text, pal);
      if (contrastRatio(kc, kbc) < 4.5) t.key = { ...t.key, color: contrastRatio('#fff', kbc) >= contrastRatio('#1f2328', kbc) ? '#fff' : '#1f2328' };
    }
  }
  if (QUALITY.on && !postSkin(q.src('typ.scale'))) {
    // 字号层级（§8 RC5，轨道 E）：标题至少是正文的 1.33 倍（原来多数皮肤的标题与正文同号，只靠加粗区分）；像素皮肤（像素字按 12 的整数倍才清楚）不动。
    // 审查修复 ⑥：皮肤之后的层（手动 / 复刻）显式给了 typ.scale 时照它（「1.1：标题和正文差不多大」要画得出来）
    const body = t.textSize ?? 13, tmin = Math.round(body * 1.33 * 2) / 2;
    if (pixel === 1 && !/"GAE Pixel"/.test(t.title?.font ?? t.font) && (t.title?.size ?? body) < tmin) t.title = { ...(t.title ?? {}), size: tmin };
  }
  // 下限豁免（审查修复 ①②④⑤）：皮肤之后显式给了的值，下限让路
  const after = (k: string) => postSkin(q.src(k));
  const baseK = after('typ.baseSize') && size !== undefined && Number.isFinite(size) ? Math.min(1, px1080(size) / 13) : 1;
  const floors = {
    textK: baseK * (after('a11y.textScale') ? Math.min(1, ts) : 1) * (after('a11y.uiScale') ? Math.min(1, us) : 1),
    fade: !after('col.muted'), halo: !after('typ.legibility'), stroke: !after('vis.strokeWidth'),
    scrim: !after('typ.legibility') && !after('vis.opacity'),
  };
  return {
    tokens: t, pal, legacy, roles, floors,
    boxSkew: !legacy || postSkin(q.src('vis.skew')) ? panel.skewX ?? 0 : 0,
    boxTurn: !legacy || postSkin(q.src('vis.jitter')) || postSkin(q.src('vis.tilt')),
    density: q.num('cnt.density', 2),
    scale: layoutBase * us * grow,
    unitK: 1,
    textK: ts / grow,
    iconStyle: q.str('vis.iconStyle', 'line'),
    pixel, r,
    surface: surface || (panel.bg && 'solid' in panel.bg ? panel.bg.solid : '#fff'),
    text: text || t.text,
    scene, skinId,
  };
}

/**
 * 渐变的方向与类型（M12a-06）：col.gradient 按规范写成 {from, to, angle, type: linear | radial, stops?}，存进参数后是
 * 「linear(角度):色1,色2」/「radial:色1,色2」（uiKnowledge.ts 的 toStoreVal；原来只存两个颜色、方向和类型丢了，竖直渐变兜底）。
 * 这两种写法各色标自带的透明度保留（#00000000 → 透明）再乘面板不透明度；不带前缀的「色1,色2」返回 null，走原来的写法（逐像素不变）
 */
function gradientPaint(g: unknown, pal: SkinPalette, a: number): Paint | null {
  const col = (c: string) => withAlpha(resolveColorIn(String(c).trim(), pal), a);
  const spread = (cs: string[]): [number, string][] => cs.map((c, i) => [i / Math.max(1, cs.length - 1), col(c)] as [number, string]);
  if (typeof g === 'string') {
    const m = /^\s*(linear|radial)\s*(?:\(\s*(-?[\d.]+)\s*\))?\s*:(.+)$/.exec(g);
    if (!m) return null;
    const cs = m[3].split(',').filter((x) => x.trim());
    if (cs.length < 2) return null;
    return m[1] === 'radial' ? { radial: { stops: spread(cs) } } : { linear: { angle: m[2] !== undefined ? Number(m[2]) : 180, stops: spread(cs) } };
  }
  if (!g || typeof g !== 'object' || Array.isArray(g)) return null;
  const o = g as { from?: string; to?: string; angle?: number; type?: string; stops?: [number, string][] };
  const stops: [number, string][] = Array.isArray(o.stops) && o.stops.length >= 2 ? o.stops.map(([p, c]) => [Number(p), col(c)] as [number, string])
    : o.from && o.to ? [[0, col(o.from)], [1, col(o.to)]] : [];
  if (!stops.length) return null;
  return o.type === 'radial' ? { radial: { stops } } : { linear: { angle: Number.isFinite(o.angle) ? Number(o.angle) : 180, stops } };
}

/** 把颜色往黑或白（离底色远的那一头）调，直到与底色对比 ≥ min（每次 8%，最多调到纯黑 / 纯白）；本来就够时原样 */
export function ensureContrast(c: string, bg: string, min: number): string {
  if (!isColorStr(c) || !isColorStr(bg) || contrastRatio(c, bg) >= min) return c;
  const to = luminance(bg) > 0.5 ? '#000000' : '#ffffff';
  for (let k = 0.08; k <= 1.0001; k += 0.08) { const m = mix(c, to, k); if (contrastRatio(m, bg) >= min) return m; }
  return to;
}
/** 任务 / 货币的金色：深色字（浅色 UI）配深金，否则原来的亮金（品质下限关掉时一律原来的） */
const goldOn = (text: string) => (QUALITY.on && luminance(text) < 0.3 ? '#946100' : '#e3b341');
/** 颜色角色（M12a-02，说明见 Roles）。str = 旧皮肤只认皮肤之后各层的读法；色彩策略要在皮肤之后的层显式选了才改语义色 */
function deriveRoles(str: (k: string) => string | undefined, q: Reader, pal: SkinPalette, strategy: string | undefined, cvd: string, text: string): Roles {
  const A = pal.accent, A2 = pal.accent2, hi = mix(A, '#fff', 0.35);
  const picked = strategy !== undefined && postSkin(q.src('col.strategy'));
  const mono = picked && strategy === 'mono', duo = picked && strategy === 'duotone';
  const colorOf = (k: string) => { const c = str(k); return c && c !== 'auto' ? refColor(c, pal, text) : undefined; };
  const cvdOn = cvd === 'protan' || cvd === 'deutan' || cvd === 'tritan';
  const good = cvdOn ? pal.good : colorOf('col.good') ?? (mono ? A : pal.good);
  const bad = CVD_BAD[cvd] ?? colorOf('col.bad') ?? (mono ? A : '#e5484d');
  const warn = colorOf('col.warn') ?? (mono ? hi : '#e3b341');
  // 任务 / 金钱色（M12a-03，col.quest）：给了时目标与货币都用它；auto = 原来的金色（mono 时强调色）
  const quest = colorOf('col.quest');
  // 图标字：col.icon = item 表示保留图集 / 物品自身的颜色（图集图标本来就不着色），符号图标按 auto 画
  const ic = str('col.icon');
  return {
    good, warn, bad,
    health: bad, danger: bad,
    // 浅色 UI（字是深色墨，§8，轨道 E）：金色的任务 / 货币字压在浅底上只有 2 : 1，换成深一档的金（白底上 ≈ 5 : 1）
    currency: quest ?? (mono ? A : goldOn(text)), objective: quest ?? (mono ? A : goldOn(text)), highlight: mono ? hi : '#ffd34d', info: mono ? hi : '#7aa2f7',
    // 节点三态（M12a-29）：完成 = col.nodeDone（auto = 原来的：好色，duotone 时强调色）；当前 = 显式给了 col.focus 时用焦点色，否则原来的强调色（mono 提亮、duotone 第二强调色）
    done: colorOf('col.nodeDone') ?? (duo ? A : good), current: colorOf('col.focus') ?? (mono ? hi : duo ? A2 : A), locked: withAlpha(mono ? A : text, 0.35), short: duo ? A2 : bad,
    ghost: mono ? withAlpha(hi, 0.75) : 'rgba(255,255,255,0.75)',
    icon: ic && ic !== 'auto' && ic !== 'item' ? refColor(ic, pal, text) : mono ? text : A,
    muted: colorOf('col.muted') ?? withAlpha(text, 0.6), mutedSet: colorOf('col.muted') !== undefined,
    focus: colorOf('col.focus') ?? A,
    accentAt: !!q.scoped?.('col.accent'), accent2At: !!q.scoped?.('col.accent2'),
  };
}

/**
 * 按钮角色色的配色方案（col.semantic，M12a-35）：角色 → 颜色（good / bad = 颜色角色，其余 #hex）；方案里没写的角色按原来的按键 / 控件盒子画
 * （accentOnly = 主按钮强调色、次按钮控件面，就是原来的样子）
 */
const BUTTON_SCHEMES: Record<string, Partial<Record<ButtonRole, string>>> = {
  orangeGray: { primary: '#f28c28', confirm: '#f28c28', danger: 'bad' },
  greenRed: { primary: 'good', confirm: 'good', back: 'bad', danger: 'bad' },
  blueYellow: { primary: '#f2c94c', confirm: '#f2c94c', back: '#3b82f6', danger: 'bad' },
  greenBlue: { primary: 'good', confirm: 'good', secondary: '#3b82f6', back: '#3b82f6' },
  blueRedOrange: { primary: '#2f80ed', confirm: '#2f80ed', back: 'bad', danger: 'bad', utility: '#f28c28', sell: 'good' },
};
/** col.actionColors 的四项依次给：确认 / 出牌（primary、confirm）、取消 / 弃牌 / 危险（back、danger）、工具 / 排序（utility）、出售 / 次要（sell、secondary） */
const ACTION_SLOTS: ButtonRole[][] = [['primary', 'confirm'], ['back', 'danger'], ['utility'], ['sell', 'secondary']];
/** 颜色列表的一项（freeColors：角色名 / accent / accent2 / text / @引用 / #hex）→ 颜色：col.actionColors 与 typ.fillColors 共用（B5 审查修复 ①） */
function roleColor(c: string, ro: Roles, pal: SkinPalette, text: string): string {
  return c === 'good' ? ro.good : c === 'bad' ? ro.bad : c === 'warn' ? ro.warn : c in ro && typeof ro[c as RoleName] === 'string' ? (ro[c as RoleName] as string) : refColor(c === 'accent' ? '@accent' : c === 'accent2' ? '@accent2' : c === 'text' ? '@text' : c, pal, text);
}
/** 是不是能直接给画布的颜色串（#hex / rgb() / rgba() / hsl()）：渐变的色标只收这些 */
const isColorStr = (c: string) => /^#[0-9a-f]{3,8}$/i.test(c) || /^(rgba?|hsla?)\(/i.test(c);
function buttonRoles(scheme: string | undefined, action: string[], ro: Roles, pal: SkinPalette, text: string): Partial<Record<ButtonRole, string>> {
  const pick = (c: string) => roleColor(c, ro, pal, text);
  const out: Partial<Record<ButtonRole, string>> = {};
  for (const [k, c] of Object.entries(BUTTON_SCHEMES[scheme ?? ''] ?? {})) out[k as ButtonRole] = pick(c);
  action.forEach((c, i) => { if (c && c !== 'auto') for (const k of ACTION_SLOTS[i] ?? []) out[k] = pick(c); });
  return out;
}

/** 某个底色上的字色（与 t.onAccent 同一条对比规则，M12a-35 的角色色按钮用）：白字对比 ≥ 3 用白，否则面板偏深用面板底色、偏浅用 #1f2328 */
export function onColorOf(c: string, surface: string): string {
  const pc = setAlpha(surface || '#fff', 1);
  return contrastRatio('#fff', c) >= 3 ? '#fff' : luminance(pc) < 0.35 ? pc : '#1f2328';
}

export { rgba };

/** px@1080p → 绘制单位（设计画布 960 × 540 = 1080p 的一半，M12a-05）：所有按 px@1080p 声明的参数（字号、触控尺寸、饰件门槛、格子边长……）画之前过它；
 *  画布缩放 unitK 由 HudSystem 整张画布乘，这里不乘 */
export const px1080 = (v: number) => v * 0.5;
/** 按目标生效的参数清单（定义在无依赖的 scopable.ts，这里转出） */
export { SCOPABLE_IDS, isScopable } from './scopable';
