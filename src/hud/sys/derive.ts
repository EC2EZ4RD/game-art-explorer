import type { Values } from '../../dims/types';
import { asList, evalCond } from './cond';
import type { Resolved, Source } from './resolve';
import { checkResolved, DEV_NOTICES } from './check';
import { SPEC, type Cond, type Raw } from './spec';
import { SELECTORS } from './register';
import { autoPackId } from '../content';

/*
 * 派生规则（docs/survey/09-ui-param-system.md 4.2 节）的实现。四类：
 *   默认类（ruleDefault）：只补"还是参数默认值 / 没人给"的键，预设和手动值都能盖过它（rel.harmony = 同一媒介时，跟随画面的几条升为适配类）；
 *   适配类（adapt）：在预设之后变换，只有用户手动值挡得住；
 *   纯派生（derived）：由其它 UI 参数推出，含蕴含型约束；
 *   无障碍（a11y）：优先于一切。
 * 规则的文字说明在调研 JSON 里（SPEC.derived），这里按 id 实现；没实现的规则会在 check:content 里列出。
 */

const RD = (id: string): Source => ({ layer: 'ruleDefault', ref: id });
const AD = (id: string): Source => ({ layer: 'adapt', ref: id });
const DV = (id: string): Source => ({ layer: 'derived', ref: id });
const A11Y = (id: string): Source => ({ layer: 'a11y', ref: id });

/** 用户手动值挡住（适配类规则不改手动键） */
const adapt = (r: Resolved, manual: Set<string>, key: string, v: Raw | undefined, id: string) => {
  if (manual.has(key) || v === undefined) return;
  r.put(key, v, AD(id));
};
/** 默认类：只补默认值 */
const fill = (r: Resolved, key: string, v: Raw | undefined, id: string) => r.put(key, v, RD(id), true);

/*
 * 设备默认值。size（typ.baseSize）与 touch（ix.touchSize）都是 px@1080p（M12a-05，设计画布 540 高 = 1080p 的一半）：
 * 手机 / 平板 / PC / 掌机的字号原来按画布 CSS 像素写（×0.93 用），换算成 px@1080p 后在 540 高的画布上与原来一样大（PC 26 → 13px）；
 * 电视的 26 原来就是按 px@1080p 定的（XAG 的电视下限），以前被当成 CSS 像素画成约两倍大，现在与 PC 同为 13px（安全边、密度另算）
 */
const DEVICE: Record<string, { size: number; touch: number; safe: number; input: string }> = {
  phone: { size: 28, touch: 88, safe: 4, input: 'touch' },
  tablet: { size: 26, touch: 72, safe: 3, input: 'touch' },
  pc: { size: 26, touch: 48, safe: 2, input: 'kbm' },
  tv: { size: 26, touch: 64, safe: 5, input: 'pad' },
  handheld: { size: 34, touch: 64, safe: 3, input: 'pad' },
};

/** 本文件实现了哪些规则（check:content 对照调研 JSON 列出还没实现的；新增规则时同时加在这里） */
export const IMPLEMENTED_RULES = new Set([
  'D-device', 'D-outline', 'D-toon', 'D-paper', 'D-boil', 'D-frame', 'D-crt', 'D-timeModel', 'D-lightness',
  'D-orient', 'D-input', 'D-pixel', 'D-screen', 'D-container', 'D-harmony', 'D-palette', 'D-iconSet', 'D-dismiss',
  'D-lightness-text', 'D-ornament', 'D-emphasis', 'D-ops', 'D-implies', 'D-reduceMotion', 'D-reduceTransparency', 'D-pack',
]);
const rule = (id: string) => id;

export function applyRules(r: Resolved, art: Values, manual: Set<string>) {
  const harmony = r.str('rel.harmony');
  // 跟随画面的规则：同一媒介 → 适配类（盖过皮肤）；统一调色 / 中性 / 刻意对比 → 不生效；未定 → 默认类
  const followArt = (key: string, v: Raw | undefined, id: string) => {
    if (harmony === 'sameMedium') adapt(r, manual, key, v, id);
    else if (harmony === '' || harmony === 'auto') fill(r, key, v, id);
  };

  /* ---------- 默认类 ---------- */
  const dev = DEVICE[r.str('ctx.device', 'pc')] ?? DEVICE.pc;
  const D_DEVICE = rule('D-device');
  fill(r, 'typ.baseSize', dev.size, D_DEVICE);
  fill(r, 'ix.touchSize', dev.touch, D_DEVICE);
  fill(r, 'lay.safeMargin', dev.safe, D_DEVICE);
  fill(r, 'ctx.input', dev.input, D_DEVICE);

  if (art['lines.outline'] === true || art['lines.outline'] === 'true') {
    const w = Number(art['lines.outlineWidth'] ?? 2);
    followArt('vis.stroke', 'solid', rule('D-outline'));
    followArt('vis.strokeWidth', Math.max(1, Math.min(4, Math.round(w))), 'D-outline');
    followArt('vis.strokeColor', 'ink', 'D-outline');
  }
  const model = String(art['shading.model'] ?? '');
  if (model) followArt('vis.depth', model === 'cel' || model === 'toonRamp' || model === 'unlit' ? 'hardDrop' : 'softDrop', rule('D-toon'));
  const medium = String(art['surface.medium'] ?? 'none');
  // 纸纹强度（0~1）与纸的种类：明显的纸纹或纸上媒介才让面板换成材质内芯
  const paper = Number(art['surface.paper'] ?? 0);
  const paperTex = String(art['surface.paperTex'] ?? '');
  const PAPER_MAT: Record<string, string> = { xuan: 'xuan', kraft: 'parchment', silk: 'silk', coldPress: 'paper', hotPress: 'paper', noise: 'paper' };
  const MEDIUM_MAT: Record<string, string> = { watercolor: 'paper', gouache: 'paper', oil: 'cloth', gongbi: 'silk', sketch: 'paper', crosshatch: 'paper', woodcut: 'paper', riso: 'paper' };
  if (medium === 'ink') {
    followArt('ast.core', 'texture', rule('D-paper'));
    followArt('ast.coreMat', 'xuan', 'D-paper');
    followArt('vis.edge', 'brush', 'D-paper');
    followArt('typ.display.family', 'calligraphy', 'D-paper');
  } else if (MEDIUM_MAT[medium] || paper > 0.15) {
    followArt('ast.core', 'texture', rule('D-paper'));
    followArt('ast.coreMat', paper > 0.15 && PAPER_MAT[paperTex] ? PAPER_MAT[paperTex] : MEDIUM_MAT[medium] ?? 'paper', 'D-paper');
  }
  const boil = Number(art['lines.boil'] ?? 0);
  if (boil > 0) followArt('vis.jitter', Math.min(1, boil), rule('D-boil'));
  const fps = String(art['motion.frameRate'] ?? 'smooth');
  if (fps === '12') followArt('mo.frameRate', 'onTwos', rule('D-frame'));
  else if (fps === '8' || fps === '4') followArt('mo.frameRate', 'onThrees', rule('D-frame'));
  if (art['surface.screen'] === 'crt') fill(r, 'rel.followPost', 'warp', rule('D-crt'));
  const genre = String(art['game.genre'] ?? '');
  if (genre === 'strategy' || genre === 'card') fill(r, 'ctx.timeModel', 'turn', rule('D-timeModel'));
  const time = Number(art['lighting.time'] ?? 15);
  const night = time < 5.5 || time > 19.5;
  const lightness = night ? 'light' : undefined;
  if (lightness) fill(r, 'col.lightness', harmony === 'contrast' ? 'dark' : lightness, rule('D-lightness'));

  /* ---------- 适配类 ---------- */
  if (r.str('ctx.orientation') === 'portrait') {
    const id = rule('D-orient');
    const comp = r.str('lay.composition');
    if (comp === 'splitLR' || comp === 'three') adapt(r, manual, 'lay.composition', 'splitTB', id);
    const nav = r.str('lay.nav');
    if (nav === 'tabsLeft' || nav === 'tabsRight') adapt(r, manual, 'lay.nav', 'tabsBottom', id);
    if (r.num('lay.columns', 4) > 4) adapt(r, manual, 'lay.columns', 4, id);
  }
  const input = r.str('ctx.input');
  const glyph: Record<string, string> = { kbm: 'keycap', pad: 'xbox', touch: 'touch', hybrid: 'keycap' };
  const g = r.str('ix.glyphs');
  // 没人给按键图标时只是补默认（旧皮肤自带的 [E] 方括号不被改掉）；给了且与输入方式冲突才适配
  if (!g) fill(r, 'ix.glyphs', glyph[input], rule('D-input'));
  // 触屏的操作层默认值（M10，R4 的规律）：竖屏 = 单手、无摇杆、底部一排；横屏 = 双拇指、固定摇杆、大键 + 弧形技能
  if (input === 'touch') {
    const portrait = r.str('ctx.orientation', 'landscape') === 'portrait';
    fill(r, 'ix.thumbZone', portrait ? 'oneHand' : 'twoThumbs', rule('D-input'));
    fill(r, 'ix.touchStick', portrait ? 'none' : 'fixed', rule('D-input'));
    fill(r, 'ix.touchCluster', portrait ? 'row' : 'arc', rule('D-input'));
  }
  // M12b-59：鼠标键字形跟键鼠、触摸板手势字形跟手柄（混合输入两样都行），不算冲突
  else if (glyph[input] && g !== glyph[input] && !(input === 'kbm' && (g === 'text' || g === 'brackets' || g === 'mouse')) && !(input === 'pad' && g === 'touchpad') && !(input === 'hybrid' && (g === 'mouse' || g === 'touchpad'))) adapt(r, manual, 'ix.glyphs', glyph[input], rule('D-input'));
  // 画面像素化 → UI 一起像素化：属于"跟随画面"，按 rel.harmony 决定强弱（未定时只补默认，旧皮肤仍保持清晰）
  const px = Number(art['camera.pixelSize'] ?? 1);
  if (px > 1) {
    followArt('vis.pixelScale', 'world', rule('D-pixel'));
    followArt('typ.body.family', 'pixel', 'D-pixel');
  }
  if (r.str('vis.pixelScale') && r.str('vis.pixelScale') !== 'off') {
    // 强弱跟着像素倍数本身的来源：倍数来自皮肤自己或默认补值时，转角只补默认（皮肤自己写的转角算数）；
    // 来自更晚的层（手动、节日、本屏覆盖、跟随画面的适配）才盖过皮肤的转角
    const pxLayer = r.src('vis.pixelScale')?.layer;
    if (pxLayer === 'ruleDefault' || pxLayer === 'skin' || pxLayer === 'default' || pxLayer === 'fallback') fill(r, 'vis.corner', 'step', rule('D-pixel'));
    else adapt(r, manual, 'vis.corner', 'step', rule('D-pixel'));
  }

  /* ---------- 纯派生 ---------- */
  // 子功能 → 界面类型与层
  const sub = r.str('cnt.subtype');
  if (sub && sub !== 'auto') {
    const opt = (SPEC.groups.find((x) => x.id === 'cnt')?.params.find((p) => p.id === 'cnt.subtype')?.options ?? []).find((o) => o.value === sub);
    if (opt?.parent && !manual.has('cnt.screen')) r.put('cnt.screen', opt.parent, DV(rule('D-screen')));
    if (opt?.layer && !manual.has('cnt.layer')) r.put('cnt.layer', opt.layer, DV('D-screen'));
  }
  if (r.str('cnt.screen', 'screen.hud') === 'screen.hud' && !r.has('lay.container')) r.put('lay.container', 'overlay', DV(rule('D-container')));
  // 示例内容包：auto（没人给）→ 显式选的品类布局对应的包 → 画面品类对应的包 → 雪线旅人（只落到已写好的包，见 hud/content）
  if (!r.has('cnt.pack')) r.put('cnt.pack', autoPackId(art[SELECTORS.layout], art['game.genre']), DV(rule('D-pack')));
  // 取色来源：同一媒介 / 统一调色 → 场景色板；中性 / 刻意对比 → 皮肤固定色；都没给时看旧的"取色自色板"开关
  if (!manual.has('col.source')) {
    const src = harmony === 'sameMedium' || harmony === 'unified' ? 'scene' : harmony === 'neutral' || harmony === 'contrast' ? 'skin' : art['hud.useSceneColors'] === false ? 'skin' : 'scene';
    r.put('col.source', src, DV(rule('D-harmony')));
  }
  rule('D-palette');
  const icon = r.str('vis.iconStyle');
  if (!r.has('ast.iconSet') || r.src('ast.iconSet')?.layer === 'default') {
    const set = icon === 'line' ? 'font' : icon === 'painted' || icon === 'render3d' || icon === 'realistic' || icon === 'pixel' ? 'asset' : 'procedural';
    r.put('ast.iconSet', set, DV(rule('D-iconSet')));
  }
  const dismiss = r.str('ix.dismiss');
  if (dismiss && !manual.has('ix.blocking')) {
    const b: Record<string, string> = { timed: 'none', tapOutside: 'soft', tapAnywhere: 'soft', button: 'modal', key: 'modal', forced: 'forced' };
    if (b[dismiss]) r.put('ix.blocking', b[dismiss], DV(rule('D-dismiss')));
  }
  // 关闭控件的默认（M12a-23）：谁都没写 ix.close 时按本屏怎么结束推——不可关闭（forced，必须选一个）/ 自动消失（timed）/ 点任意处继续（tapAnywhere，目检修复：
  // ix.close 的生效条件本来就只有按钮 / 按键关闭；登录、升级提示、十连结果、NPC 对话原来都兜底画一个 ✕）→ 不画；
  // 不写标题（lay.titlePos = none）→ 也不画（原来兜底右上 ✕：三选一、读取、章节卡、起名这些屏仍画一个关不掉的 ✕）。点外面关闭（tapOutside，M12b-64 ⑧）同样不画。
  // 预设 / 手动写了 ix.close：关不掉的那几种结束方式下仍不画（screen.ts 的 closeKind，check 报 C-inactive），其余照写的画
  if (!r.has('ix.close') && (dismiss === 'forced' || dismiss === 'timed' || dismiss === 'tapAnywhere' || dismiss === 'tapOutside' || r.str('lay.titlePos') === 'none')) r.put('ix.close', 'none', DV('D-dismiss'));
  // 运营动作（M12a-07）：显式选了买断制（business.premium）→ 下层带进来的全部去掉；不可关闭（forced，必须选一个）→ 去掉"再抽 / 再来一局"。
  // 用减项写（并集多选），用户自己在 ops.actions 里写的照留
  const acts = r.list('ops.actions');
  if (acts.length) {
    const own = asList((art['ops.actions'] ?? '') as Raw).filter((x) => x !== 'auto' && x !== 'none' && !x.startsWith('-'));
    const premium = r.presets.business?.id === 'business.premium';
    // 重掷（reroll，M12b-60）是局内的玩法按钮、不是运营动作：买断制不去掉它
    const gone = (premium ? acts.filter((x) => x !== 'reroll') : dismiss === 'forced' ? acts.filter((x) => x === 'retry') : []).filter((x) => !own.includes(x));
    if (gone.length) r.put('ops.actions', gone.map((x) => `-${x}`), DV(premium ? 'D-ops' : 'D-dismiss'));
  }
  const behindLive = r.str('rel.behind', 'live') === 'live' || r.str('cnt.screen', 'screen.hud') === 'screen.hud';
  if (r.num('vis.opacity', 1) === 0 && behindLive && ['', 'none', 'auto'].includes(r.str('typ.legibility')) && !manual.has('typ.legibility')) r.put('typ.legibility', 'shadow', DV(rule('D-lightness-text')));
  let orn = r.get('vis.ornament');
  // 皮肤的装饰预算是 0，但节日 / 显式关键词 / 手动给了饰件或母题：那是更晚的层的意思，预算升到 1
  const LATE = new Set(['theme', 'keyword', 'screenOverride', 'user', 'overlay']);
  const lateOrn = ['ast.ornaments', 'vis.motif'].some((k) => { const s = r.src(k); return !!s && LATE.has(s.layer) && !s.viaSkin && r.list(k).some((x) => x !== 'none'); });
  if ((orn === 0 || orn === '0') && lateOrn && !manual.has('vis.ornament')) { r.put('vis.ornament', 1, DV(rule('D-ornament'))); orn = 1; }
  if (orn === 0 || orn === '0') {
    if (!manual.has('ast.ornaments')) r.put('ast.ornaments', [], DV(rule('D-ornament')));
    if (!manual.has('vis.motif')) r.put('vis.motif', 'none', DV('D-ornament'));
  } else if (Number(orn) >= 2 && !r.list('ast.ornaments').length && !manual.has('ast.ornaments')) {
    const motif = r.str('vis.motif');
    const set = motif === 'floral' ? ['corners', 'dividers'] : motif === 'cloud' ? ['hangers'] : motif === 'rivets' ? ['rivets'] : ['corners'];
    r.put('ast.ornaments', set, DV(rule('D-ornament')));
  }
  // hier.emphasis 是替换合并的多选（merge = replace）：直接写换过的列表
  if (r.str('col.strategy') === 'mono' && r.list('hier.emphasis').includes('color')) r.put('hier.emphasis', r.list('hier.emphasis').map((x) => (x === 'color' ? 'value' : x)), DV(rule('D-emphasis')));
  // 运营密度读数
  if (!manual.has('ops.density')) {
    const badges = r.list('ops.badges').length, entries = r.str('ops.entries', 'none');
    const d = entries !== 'none' && badges >= 2 ? 3 : entries !== 'none' || badges >= 3 ? 2 : badges > 0 || r.str('st.newCue', 'none') !== 'none' ? 1 : 0;
    r.put('ops.density', d, DV(rule('D-ops')));
  }
  // 蕴含型约束：条件成立时直接补值
  rule('D-implies');
  const get = (k: string) => r.get(k);
  for (const c of SPEC.constraints) {
    if (c.kind !== 'imply' || !c.if || evalCond(c.if, get) !== true || evalCond(c.then, get) !== false) continue;
    // 蕴含：条件成立而结论不成立时，按结论补值（手动值挡得住；补不出来的留给检查报警）
    for (const [k, x] of satisfy(c.then) ?? []) if (!manual.has(k)) r.put(k, x, DV(c.id));
  }

  /* ---------- 无障碍（优先于一切） ---------- */
  if (r.bool('a11y.reduceMotion')) {
    const id = rule('D-reduceMotion');
    r.put('mo.juice', 0, A11Y(id));
    r.put('mo.enter', 'fade', A11Y(id));
    r.put('mo.idle', 'none', A11Y(id));
    // rel.metaFx 是并集多选：用减项去掉受击闪白（直接写过滤后的列表只会再并一次，M12a-07）
    r.put('rel.metaFx', ['-hitFlash'], A11Y(id));
    if (r.num('mo.reward', 1) > 1) r.put('mo.reward', 1, A11Y(id));
  }
  if (r.bool('a11y.reduceTransparency')) {
    const id = rule('D-reduceTransparency');
    const o = r.num('vis.opacity', 1);
    if (o > 0 && o < 1) r.put('vis.opacity', 1, A11Y(id));
    r.put('vis.blur', 0, A11Y(id));
    if (r.bool('a11y.highContrast')) {
      r.put('typ.legibility', 'outline', A11Y(id));
      r.put('ast.core', 'procedural', A11Y(id));
    }
  }
  if (r.bool('a11y.highContrast')) {
    r.put('typ.legibility', 'outline', A11Y('a11y.highContrast'));
    if (r.num('vis.strokeWidth', 1) < 2) r.put('vis.strokeWidth', 2, A11Y('a11y.highContrast'));
  }
  // 字体别名提示（C-font-alias）只在开发者模式进警告（D 审查 18：缺字体文件时用黑体画是对的运行时行为，不该进「⚠N」的计数；B 的开发者模式开关设 DEV_NOTICES.on）
  r.warnings.push(...checkResolved(r).filter((v) => DEV_NOTICES.on || v.id !== 'C-font-alias').map(({ id, why, level }) => ({ id, why, level })));
  void asList;
}

/** 让一个条件成立的最简单赋值（只处理 in / eq / empty / has / any 的第一支 / all） */
function satisfy(c: Cond): [string, Raw][] | null {
  if (c.all) {
    const out: [string, Raw][] = [];
    for (const x of c.all) { const s = satisfy(x); if (!s) return null; out.push(...s); }
    return out;
  }
  if (c.any) return c.any.length ? satisfy(c.any[0]) : null;
  if (!c.p || c.p.startsWith('@')) return null;
  if (c.in?.length) return [[c.p, c.in[0] as Raw]];
  if (c.eq !== undefined) return [[c.p, c.eq as Raw]];
  if (c.empty === true) return [[c.p, []]];
  if (c.has !== undefined) return [[c.p, [String(c.has)]]];
  return null;
}
