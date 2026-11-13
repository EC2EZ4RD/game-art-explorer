import { evalCond, type AllGetter, type Getter } from './cond';
import { isScopable } from './scopable';
import type { Resolved, Source } from './resolve';
import { optionsOf, SPEC, SPEC_PARAM, SPEC_PARAMS } from './spec';
import { FONT_ROLES, HAVE_FAMILY, roleCjkDisplayOnly, roleHasFont, roleResolved } from '../fontList';
import { SKIN_MAP } from '../skins';
import { dockOrder, type DockSpec } from '../compose/dock';
import { baseId, ELEMENT_ANCHORS } from './register';
import { afterSkin } from './theme';

/*
 * 约束检查（docs/survey/09-ui-param-system.md 4.4 节）：
 *   check / imply：数据式条件，if 成立而 then 不成立即违例（imply 的"补值"由派生规则做，这里只验结果）；
 *   special：
 *     C-inactive    —— 某一层给了一个被生效条件关掉的参数（"无底却设面板明度"）；
 *     C-st-channels —— 同一屏的锁定 / 空槽 / 完成 / 冷却 / 选中 两两占了会撞车的视觉通道（符号类不算）；
 *     C-overlay-chrome —— 叠加 / 横幅 / 无容器的模板设了管面板、页头、关闭钮的参数（不画面板与页头，M12a-25）；
 *     C-font-alias  —— 选了一个还没有字体文件的字族（M12b-54：画面明确落到 fallback 的字体，不再静默别名）；
 *                      正文选了中文只收展示用字的字族（漫画手写 / 窄体）时给一条 info：正文的中文按 fallback 画。
 *     C-dock-cycle  —— 元素停靠（elx.dockTo，M12b-05）首尾相接成环：环上的元素都不停靠。
 *     C-group-split —— 成组（elx.group）的元素分在不同的锚点 / 挂世界点：组框只给挨在一起的组员画，这一组不画（B6 审查修复 ㉑）。
 *   C-skin-core / C-owners / C-keyword-dup / C-dup 是预设数据本身的检查，由 check:content 做。
 */

export interface Violation { id: string; level: string; why: string; keys?: string[] }

/**
 * 条件里按目标写的控制参数取全部值（中期审查修复 ㉒，见 cond.ts 的 AllGetter）：只对 SCOPABLE 参数、只在有 <参数>@<目标> 键时给；get = 读值的方法（各处自己的口径：
 * 只看设过的层 / 只看这一层自己的键……），作用域键也经它读
 */
const SCOPED_IDX = new WeakMap<Resolved, Map<string, string[]>>();
export function scopedAll(r: Resolved, get: Getter = (k) => r.get(k)): AllGetter {
  // 作用域键按参数分组（每个解析结果算一次：参数面板每行都要用）
  let by = SCOPED_IDX.get(r);
  if (!by) {
    by = new Map<string, string[]>();
    for (const k of r.keys()) { const i = k.indexOf('@'); if (i > 0) { const b = k.slice(0, i); if (!by.has(b)) by.set(b, []); by.get(b)!.push(k); } }
    SCOPED_IDX.set(r, by);
  }
  const idx = by;
  return (key: string) => {
    const ks = isScopable(key) ? idx.get(key) : undefined;
    return ks?.length ? [get(key), ...ks.map((k) => get(k))] : undefined;
  };
}

/** 只算"有人给了值"的层（默认、默认类规则、派生、兜底给的值不算设过） */
const SET_LAYERS = new Set<Source['layer']>(['platform', 'business', 'layout', 'pattern', 'container', 'screen', 'skin', 'keyword', 'theme', 'screenOverride', 'accent', 'overlay', 'user', 'adapt']);

/** 视觉状态参数 → 通道（取值表里的 channel 字段）；符号类（glyph）与"不表示"不算撞车 */
const STATE_PARAMS = ['st.locked', 'st.emptySlot', 'st.done', 'st.cooldown', 'st.selected'];
const NON_CLASH = new Set(['glyph', 'none', 'badge']);
/** 叠加类容器下不生效的参数（M12a-25：没有面板与页头） */
// M12b-64：容器宽高分设、横向位置与按钮行对齐同样没有面板可管
const OVERLAY_DEAD = ['cmp.modal', 'ix.close', 'ix.back', 'lay.titlePos', 'lay.titleAlign', 'lay.titleSubtitle', 'lay.panelSize', 'lay.panelWidth', 'lay.panelHeight', 'lay.panelAlign', 'lay.buttonRowAlign', 'cmp.panelArt', 'lay.ornamentInset'];

/** 只由默认值 / 兜底决定的键不算"有人这样设了"：条件里读到它们时按"未知"处理 */
const DEFAULTISH = new Set<Source['layer']>(['default', 'fallback']);

/** 只给开发者看的提示（C-font-alias）要不要进解析结果的警告（derive.ts 按它筛；B 的开发者模式开关设 on 后重新解析）。checkResolved 本身照常全报 */
export const DEV_NOTICES = { on: false };
export function checkResolved(r: Resolved, opts: { inactive?: boolean; own?: Set<string> } = {}): Violation[] {
  const out: Violation[] = [];
  const get = (k: string) => r.get(k);
  const getSet = (k: string) => (DEFAULTISH.has(r.src(k)?.layer ?? 'default') ? undefined : r.get(k));
  for (const c of SPEC.constraints) {
    if (c.kind === 'special' || !c.if) continue;
    if (evalCond(c.if, get) === true && evalCond(c.then, get) === false) out.push({ id: c.id, level: c.level, why: c.why });
  }
  // 状态通道撞车
  const byChannel = new Map<string, string[]>();
  for (const id of STATE_PARAMS) {
    const v = getSet(id);
    if (v === undefined || v === null || v === 'auto') continue;
    const p = SPEC_PARAM.get(id);
    const ch = p && optionsOf(p).find((o) => String(o.value) === String(v))?.channel;
    if (!ch || NON_CLASH.has(ch)) continue;
    byChannel.set(ch, [...(byChannel.get(ch) ?? []), id]);
  }
  for (const [ch, ids] of byChannel) {
    if (ids.length > 1) {
      const c = SPEC.constraints.find((x) => x.id === 'C-st-channels');
      out.push({ id: 'C-st-channels', level: c?.level ?? 'error', why: `${ids.map((i) => SPEC_PARAM.get(i)?.label ?? i).join(' 与 ')} 都用"${ch}"通道：${c?.why ?? ''}`, keys: ids });
    }
  }
  // 字族别名（M12b-54）：选了一个没有字体文件的字族（gothic / handwritten / graffiti……）时提示它现在用哪套字画；有拉丁字体、缺中文字体的另给一条 info；
  // 中文字体只收展示用字的（comicHand = 站酷快乐体、condensed = 得意黑）选作正文时也给 info：正文的中文按 fallback 画（展示字表只给标题、名牌、横幅……）
  for (const k of r.keys().filter((x) => /^typ\.(body|display)\.family(@|$)/.test(x))) {
    const sk = r.src(k);
    if (!sk || !SET_LAYERS.has(sk.layer)) continue;
    const v = String(r.get(k) ?? '');
    const role = FONT_ROLES[v];
    if (!role) continue;
    const c = SPEC.constraints.find((x) => x.id === 'C-font-alias');
    if (!roleHasFont(v)) out.push({ id: 'C-font-alias', level: c?.level ?? 'warn', why: `${SPEC_PARAM.get(k.split('@')[0])?.label ?? k}「${v}」还没有字体文件，现在用「${FONT_ROLES[roleResolved(v)]?.label ?? roleResolved(v)}」画（${c?.why ?? ''}）`, keys: [k] });
    else if (role.cjk && !HAVE_FAMILY.has(role.cjk)) out.push({ id: 'C-font-alias', level: 'info', why: `${SPEC_PARAM.get(k.split('@')[0])?.label ?? k}「${v}」的中文字体还没有文件，中文按「${FONT_ROLES[role.fallback ?? 'sans']?.label ?? role.fallback}」画`, keys: [k] });
    else if (/^typ\.body\./.test(k) && roleCjkDisplayOnly(v)) out.push({ id: 'C-font-alias', level: 'info', why: `${SPEC_PARAM.get(k.split('@')[0])?.label ?? k}「${v}」的中文字体只收展示用字（标题、名牌、横幅、菜单词、按钮），正文的中文按「${FONT_ROLES[role.fallback ?? 'sans']?.label ?? role.fallback}」画`, keys: [k] });
  }
  // 叠加 / 横幅 / 无容器的模板（M12a-25）：走模板构图器但不画面板与页头，管面板 / 页头 / 关闭钮的参数设了也不生效
  const how = r.str('lay.container', '');
  if (['overlay', 'banner', 'none'].includes(how) && !!r.presets.screen) {
    const dead = OVERLAY_DEAD.filter((k) => { const s = r.src(k), v = r.get(k); return !!s && SET_LAYERS.has(s.layer) && v !== undefined && v !== null && !['auto', 'none', ''].includes(String(v)) && !(k === 'cmp.modal' && v === 'standard'); });
    if (dead.length) {
      const c = SPEC.constraints.find((x) => x.id === 'C-overlay-chrome');
      out.push({ id: 'C-overlay-chrome', level: c?.level ?? 'warn', why: `容器是「${how}」：${dead.map((k) => SPEC_PARAM.get(k)?.label ?? k).join('、')} 不生效——${c?.why ?? ''}`, keys: dead });
    }
  }
  // 停靠成环（M12b-05，C-dock-cycle）：元素 A 停在 B 旁边、B 又（经别的元素）停回 A——环上的都不停靠。B6 审查修复 ①：与排位用同一个 dockOrder（compose/dock.ts），
  // 键的口径也一样（多选画法按画法拆开读画法级键、宿主 = 它的第一个画法；旧皮肤只认皮肤之后的层，同 compose/hud.ts 的 layoutEl）——原来自己抄了一份，停向环的元素也被算进环
  const els = r.elements(), legacy = SKIN_MAP.has(String(r.art['hud.style'] ?? ''));
  const lay = (id: string, k: string, form?: string) => (legacy && !afterSkin(r, r.elKey(id, k, form)) ? undefined : r.el(id, k, form));
  const partsOf = (id: string): (string | undefined)[] => {
    const v = r.get(`${id}.form`) ?? r.el(id, 'form');
    const list = (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(String).filter((x) => x && x !== 'auto');
    return list.length > 1 ? list : [undefined];
  };
  const pk = (id: string, form?: string) => `${id}|${form ?? ''}`;
  const keys = new Set(els.flatMap((id) => partsOf(id).map((f) => pk(id, f))));
  const specs: DockSpec[] = [];
  for (const id of els) for (const f of partsOf(id)) {
    const h = String(lay(id, 'dockTo', f) ?? 'none');
    if (!h || h === 'none' || h === 'auto') continue;
    specs.push({ id: pk(id, f), host: els.includes(h) ? pk(h, partsOf(h)[0]) : `?${h}`, side: 'right', gap: 0, align: 'start', slot: 0 });
  }
  const cyc = [...new Set(dockOrder(specs, (k) => keys.has(k)).cycles.map((k) => k.split('|')[0]))];
  if (cyc.length) {
    const c = SPEC.constraints.find((x) => x.id === 'C-dock-cycle');
    out.push({ id: 'C-dock-cycle', level: c?.level ?? 'warn', why: `${cyc.join(' → ')}：${c?.why ?? ''}`, keys: cyc.map((x) => `${x}.dockTo`) });
  }
  // 成组分开了（B6 审查修复 ㉑，C-group-split）：同一组名的元素在不同的屏幕锚点（或挂在世界点上）——组框只给挨在一起的组员画（compose/hud.ts），这一组不画底板与饰线。
  // 锚点 = 显式给的 elx.screenAnchor，没给时元素的默认锚点（register.ts 的 ELEMENT_ANCHORS）
  const anchorOf = (id: string): string | undefined => {
    const at = String(lay(id, 'attachTo') ?? 'none');
    if (at && at !== 'none' && at !== 'auto') return 'world';
    const l = r.src(r.elKey(id, 'screenAnchor'))?.layer, a = String(lay(id, 'screenAnchor') ?? 'auto');
    return l && !DEFAULTISH.has(l) && l !== 'ruleDefault' && a !== 'auto' ? a : ELEMENT_ANCHORS.get(baseId(id));
  };
  const grp = new Map<string, string[]>();
  for (const id of els) { const g = String(lay(id, 'group') ?? 'none'); if (g && g !== 'none' && g !== 'auto') grp.set(g, [...(grp.get(g) ?? []), id]); }
  for (const [name, ids] of grp) {
    const an = ids.map(anchorOf).filter((x): x is string => !!x);
    if (ids.length < 2 || new Set(an).size < 2) continue;
    const c = SPEC.constraints.find((x) => x.id === 'C-group-split');
    out.push({ id: 'C-group-split', level: c?.level ?? 'warn', why: `${name}：${ids.map((id, i) => `${id}（${an[i] ?? '?'}）`).join('、')}——${c?.why ?? ''}`, keys: ids.map((x) => `${x}.group`) });
  }
  // 设了但不生效
  if (opts.inactive) {
    for (const p of SPEC_PARAMS) {
      if (!p.activeWhen || !r.has(p.id) || (opts.own && !opts.own.has(p.id))) continue;
      const s = r.src(p.id);
      if (!s || !SET_LAYERS.has(s.layer)) continue;
      const v = r.get(p.id);
      if (v === 'auto' || v === null) continue;
      // 只看这个预设 / 用户自己给的条件键（opts.own），否则看所有非默认的键
      const g: Getter = opts.own ? (k) => (opts.own!.has(k) ? r.get(k) : undefined) : getSet;
      if (evalCond(p.activeWhen, g, undefined, scopedAll(r, g)) === false) out.push({ id: 'C-inactive', level: 'error', why: `${p.label}（${p.id}）被设了值，但它的生效条件不成立`, keys: [p.id] });
    }
  }
  return out;
}
