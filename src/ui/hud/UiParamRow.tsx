import { useMemo, useState } from 'react';
import { optionOf } from '../../dims/registry';
import type { OptionDef, ParamDef, Val } from '../../dims/types';
import { rationaleOf } from '../../content/uiKnowledge';
import { asList, condText, evalCond } from '../../hud/sys/cond';
import { scopedAll } from '../../hud/sys/check';
import { sourceText, type Resolved } from '../../hud/sys/resolve';
import { parseElementKey } from '../../hud/sys/register';
import { SPEC_PARAM, type Raw, type SpecParam } from '../../hud/sys/spec';
import type { SkinPalette } from '../../hud/types';
import { getParam } from '../../dims/registry';
import { resetKey } from '../../state/actions';
import { isModifiedKey, resetHint } from '../../state/layers';
import { useStore } from '../../state/store';
import { useShell } from '../stage/shell';
import '../state/state.css';
import { paramValueText } from './knowledgeText';
import { ParamWhy, WhyBadge } from '../learn/ParamWhy';
import { useUiKnowledgeState } from '../learn/useUiKnowledge';
import { optionWhy } from './optionWhy';

/*
 * UI 参数的一行（docs/survey/09-ui-param-system.md 第 7 节"三态"）：
 *   跟随（存的是 auto）：控件显示解析出来的值，旁边的小标签写明来源（皮肤 / 关键词 / 规则 / 默认）；
 *   手动：改过的值，带"↺ 跟随"按钮回到跟随；
 *   不生效：生效条件不满足时整行变灰，写明差什么。
 * 依据（G1，docs/t1-tool-knowledge.md）：行头的小徽标（原则 3 · 家族 5）点开是"为什么、什么时候用"（ParamWhy.tsx）；
 *   选项的悬停提示末尾追加一行"依据：做法 N 条 · 家族：…"。知识库懒加载，没加载完时只显示灰色占位，控件照常可用。
 * 轨道 A（docs/workbench-redesign.md §4.2 §7）：
 *   •↺ 只在这一键与基线（场景 ⊕ 皮肤 ⊕ 风格词，其余 UI 键 = 跟随）不同时出现，点了回到基线（不是一律回 auto）；双击标签同样；
 *   默认只显示 标签 | 控件 | 值 | •↺。来源（"跟随 · 皮肤：毛玻璃"）、两端、选项说明、不生效原因都进悬停提示；依据徽标只在开发者模式显示。
 *   「需素材 / 局部 / 待实现」（◇ ◐、（需素材）（局部）与悬停里的同类字样）、选项的参考出处（「参考：GameUI#…」）只在开发者模式显示
 *   （§1.1；审查修复 25，整合修复 U#18：平时的悬停提示里不再出现内部 id 和实现进度）。
 *   起点选择器（皮肤、风格词、节日、界面）照常调 store.set：store 把它们换成同一个合成函数里的套用（换皮肤清皮肤负责的手动样式、
 *   不记成手动改动，「清样式改动」不会把选的皮肤丢掉；审查修复 16）。
 */

const ROLES = ['accent', 'accent2', 'ink', 'paper', 'good', 'sky'] as const;
const ROLE_LABEL: Record<string, string> = { accent: '强调', accent2: '次强调', ink: '墨', paper: '纸', good: '正向', sky: '天' };

const toVal = (v: Raw | undefined): Val => (Array.isArray(v) ? v.join(',') : v === null || v === undefined ? '' : v);
const fmt = (p: ParamDef, v: Raw | undefined): string => {
  if (v === undefined || v === null) return '未定';
  if (Array.isArray(v)) return v.length ? v.map((x) => optionOf(p, x)?.label ?? x).join('、') : '无';
  if (p.kind === 'range' || p.kind === 'int') {
    const o = optionOf(p, v as Val);
    if (o) return o.label;
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : `${Number.isInteger(n) ? n : n.toFixed((p.step ?? 0.01) < 0.1 ? 2 : 1)}${p.unit ?? ''}`;
  }
  if (p.kind === 'toggle') return v === true || v === 'true' ? '开' : '关';
  return optionOf(p, v as Val)?.label ?? String(v);
};

/** 起点选择器（hud.style、uip.*）没有 auto，"跟随"= 默认值 */
const isStart = (p: ParamDef) => p.ui?.scope === 'start';

/**
 * value / srcLabel：元素实例键（el.vitals.scale）与覆盖键（cmp.gauge@el.vitals）没被单独设置时，显示它继承到的值与出处。
 * specId / element（审查修复 B · C4）：合成的行（元素实例键、覆盖键）按模板参数（elx.attachOffset、cmp.gauge）取词表与生效条件，
 * 条件里的 @参数 按这个元素读（@attachTo → el.vitals.attachTo，没单独设置时继承 elx.*）；elx.* 模板行自己的 @参数 读 elx.*
 */
export function UiParamRow({ p, r, pal, compact, godotOnly, value, srcLabel, specId, element }: { p: ParamDef; r: Resolved; pal: SkinPalette; compact?: boolean; godotOnly?: boolean; value?: Raw; srcLabel?: string; specId?: string; element?: string }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const set = useStore((s) => s.set);
  const focus = useStore((s) => s.focus);
  const setFocus = useStore((s) => s.setFocus);
  const dev = useShell((s) => s.dev);
  const mod = isModifiedKey(p.id, values, origin);
  const stored = values[p.id] ?? p.default;
  const start = isStart(p);
  const follow = start ? stored === p.default : stored === 'auto' || stored === undefined;
  const own = r.get(p.id);
  const resolved: Raw | undefined = start ? (stored as Raw) : own === undefined && value !== undefined ? value : own;
  const src = start ? undefined : r.src(p.id);
  const spec = SPEC_PARAM.get(p.id) ?? (specId ? SPEC_PARAM.get(specId) : undefined);
  // 元素实例键按元素读（继承 elx.*），其余按解析结果读
  const getCond = (key: string) => { const pe = parseElementKey(key); return pe ? r.el(pe.element, pe.suffix, pe.form) : r.get(key); };
  const condEl = element ?? (p.id.startsWith('elx.') ? 'elx' : undefined);
  // 控制参数按目标写了的，条件按全局或任一目标的值算（中期审查修复 ㉒）
  const cond = spec?.activeWhen ? evalCond(spec.activeWhen, getCond, condEl, scopedAll(r, getCond)) : true;
  const inactive = cond === false;
  const todo = p.status === 'todo';

  const change = (x: Val) => {
    set(p.id, x);
    if (focus !== p.id) setFocus(p.id);
  };
  const unfollow = () => resetKey(p.id);

  const cur = toVal(resolved);
  // 依据：按当前（解析出来的）取值查；覆盖键 / 元素实例键由 rationaleOf 退到模板参数。cur 是 resolved 的字符串形式，当缓存键
  const { k } = useUiKnowledgeState();
  const why = useMemo(() => (k ? rationaleOf(k, p.id, resolved) : null), [k, p.id, cur]);
  const [whyOpen, setWhyOpen] = useState(false);
  const tip = (o: OptionDef) => {
    const extra = k ? optionWhy(k, p.id, String(o.value)) : '';
    // 实现进度只在悬停里说（开发者模式另在选项名后标 ◇ ◐，审查修复 25）
    // 整合修复 U#18：实现进度、参考出处（「参考：GameUI#…」）只在开发者模式说
    const status = !dev ? '' : o.status === 'needsAsset' ? '需要素材：现在画的是占位' : o.status === 'partial' ? '局部实现' : '';
    return [plainDesc(o.desc, dev), status, extra && `依据：${extra}`].filter(Boolean).join('\n');
  };
  // 只看 Godot 内置：隐藏需要着色器 / 脚本 / 素材的取值（当前选中的保留，免得控件变空）；词表借 cnt.elements 的多选（lay.edgeBarSlots）不列 auto（审查修复 B · C3）
  const opts = (p.options ?? []).filter((o) => (!godotOnly || !o.port?.godotLevel || o.port.godotLevel === 'builtin' || String(o.value) === String(cur)) && !(p.kind === 'multi' && spec?.optionsFrom && String(o.value) === 'auto'));
  // 取值表里除 auto 以外的取值（auto = 行头的 ↺ 跟随）：颜色 / 数值参数的非颜色、非数取值放在色板 / 滑块旁边（审查修复 B · C3）
  const segOf = (list: OptionDef[]) => (
    <div className="seg" role="radiogroup" aria-label={`${p.label}：取值`}>
      {list.map((o) => (
        <button key={o.value} className={String(o.value) === String(cur) ? (follow ? 'on follow' : 'on') : ''} title={tip(o)} onClick={() => change(o.value)}>{o.label}</button>
      ))}
    </div>
  );
  let control: React.ReactNode = null;
  if (p.kind === 'choice' || ((p.kind === 'int' || p.kind === 'range') && opts.length >= 3)) {
    if (opts.length <= 6) {
      control = (
        <div className="seg" role="radiogroup" aria-label={p.label}>
          {opts.map((o) => (
            <button key={o.value} className={String(o.value) === String(cur) ? (follow ? 'on follow' : 'on') : ''} title={tip(o)} onClick={() => change(p.kind === 'choice' ? o.value : Number(o.value))}>
              {o.label}{dev ? (o.status === 'needsAsset' ? ' ◇' : o.status === 'partial' ? ' ◐' : '') : ''}
            </button>
          ))}
        </div>
      );
    } else {
      control = (
        <select value={String(cur)} onChange={(e) => change(p.kind === 'choice' ? e.target.value : Number(e.target.value))} aria-label={p.label} className={follow ? 'follow' : ''}>
          {!opts.some((o) => String(o.value) === String(cur)) && <option value={String(cur)}>{cur === '' ? '（未定）' : String(cur)}</option>}
          {opts.map((o) => (
            <option key={o.value} value={o.value} title={tip(o)}>{o.label}{dev ? (o.status === 'needsAsset' ? '（需素材）' : o.status === 'partial' ? '（局部）' : '') : ''}</option>
          ))}
        </select>
      );
    }
  } else if (p.kind === 'range' || p.kind === 'int') {
    // 非数取值（cnt.lockedFrom = none、typ.button.size = fit……）选中时滑块显示兜底值、画成跟随样式
    const words = opts.filter((o) => String(o.value) !== 'auto' && Number.isNaN(Number(o.value)));
    const isWord = words.some((o) => String(o.value) === String(cur));
    const n = Number(isWord ? spec?.fallback ?? p.min ?? 0 : resolved ?? spec?.fallback ?? p.min ?? 0);
    const slider = (
      <input
        type="range" min={p.min} max={p.max} step={p.step ?? (p.kind === 'int' ? 1 : 0.01)}
        value={Number.isNaN(n) ? p.min ?? 0 : n} className={follow || isWord ? 'follow' : ''}
        onChange={(e) => change(p.kind === 'int' ? Math.round(Number(e.target.value)) : Number(e.target.value))}
        aria-label={p.label}
      />
    );
    control = words.length ? <div className="range-words">{slider}{segOf(words)}</div> : slider;
  } else if (p.kind === 'toggle') {
    const on = resolved === true || resolved === 'true';
    control = <button className={`switch ${on ? 'on' : ''} ${follow ? 'follow' : ''}`} onClick={() => change(!on)} aria-pressed={on} aria-label={p.label} />;
  } else if (p.kind === 'multi' && spec?.ordered) {
    // 有序多选（审查修复 B · C3）：条目行，可排序、可重复、可占位、可写 #hex、可并排
    control = <OrderedList label={p.label} spec={spec} list={asList(resolved ?? null)} opts={opts} follow={follow} tip={tip} pal={pal} onChange={(xs) => change(xs.join(','))} />;
  } else if (p.kind === 'multi') {
    const list = asList(resolved ?? null);
    // 并集合并的多选（M12a-07）：手动值只记"相对下层的改动"——点掉下层带来的一项写成 -x，再点回来去掉 -x；
    // 「无」= 清空（存 none），之后再点的项都在清空之后（none,a = 只要 a）。这样切换模板 / 关键词后，手动减掉的仍然减掉、新带来的照样并进来
    const union = spec?.merge === 'union';
    const mine = follow ? [] : asList((stored ?? '') as Raw).filter((x) => x !== 'auto');
    const toggle = (x: string) => {
      if (!union) { change((list.includes(x) ? list.filter((y) => y !== x) : [...list, x]).join(',')); return; }
      if (x === 'none') { change('none'); return; }
      const rest = mine.filter((y) => y !== x && y !== `-${x}`);
      const replace = rest.includes('none');
      const next = list.includes(x) ? (replace ? rest : [...rest, `-${x}`]) : [...rest, x];
      change(next.length ? next.join(',') : replace ? 'none' : 'auto');
    };
    const isOn = (v: string) => (v === 'none' && union ? list.length === 0 && !follow : list.includes(v));
    control = (
      <div className="seg multi" aria-label={p.label}>
        {opts.map((o) => (
          <button key={o.value} className={isOn(String(o.value)) ? (follow ? 'on follow' : 'on') : ''} title={tip(o)} onClick={() => toggle(String(o.value))}>{o.label}</button>
        ))}
      </div>
    );
  } else if (p.kind === 'color') {
    const c = String(resolved ?? '');
    const hex = c.startsWith('@') ? pal[c.slice(1) as keyof SkinPalette] ?? '#888888' : c;
    // 取值表里的非颜色取值（col.icon = item、col.track = darkScrim、col.trackStroke = none、typ.outlineColor = ink / white / accent）
    const words = opts.filter((o) => String(o.value) !== 'auto');
    const word = words.find((o) => String(o.value) === c);
    const swatches = (
      <div className="swatches">
        {ROLES.map((role) => (
          <button key={role} className={c === `@${role}` ? 'on' : ''} style={{ background: pal[role] }} title={`色板：${ROLE_LABEL[role]}`} onClick={() => change(`@${role}`)} />
        ))}
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#888888'} onChange={(e) => change(e.target.value)} title="自定义颜色" />
        <span className="row-value">{word ? word.label : c.startsWith('@') ? `色板：${ROLE_LABEL[c.slice(1)] ?? c}` : c}</span>
      </div>
    );
    control = words.length ? <div className="range-words">{swatches}{segOf(words)}</div> : swatches;
  } else {
    control = <div className="row-value">{String(resolved ?? '未定')}（M3b 编辑器）</div>;
  }

  const valueText = p.kind === 'range' || p.kind === 'int' ? fmt(p, resolved) : '';
  const srcText = start ? (follow ? '默认' : '手动') : follow ? (own === undefined && srcLabel ? srcLabel : sourceText(src)) : '手动';
  const reason = inactive && spec?.activeWhen
    ? condText(spec.activeWhen, (id) => getParam(id)?.label ?? SPEC_PARAM.get(id)?.label ?? id, (id, v) => {
      const q = getParam(id);
      return q ? optionOf(q, v as Val)?.label ?? String(v) : String(v);
    })
    : '';
  const ends = p.explain.ends && (p.kind === 'range' || p.kind === 'int') && !opts.length ? `← ${p.explain.ends[0]}　${p.explain.ends[1]} →` : '';
  const optDesc = p.kind === 'choice' ? plainDesc(optionOf(p, cur)?.desc, dev) : undefined;
  // 悬停提示（T1）：来源、两端 / 当前选项、不生效原因、待实现
  const rowTip = [
    start ? (follow ? '默认' : '手动选的') : `${follow ? '跟随' : '手动'}${follow ? `：${srcText}` : ''}`,
    p.explain.plain !== p.label ? p.explain.plain : '',
    ends,
    optDesc,
    inactive ? `不生效：需要 ${reason}` : '',
    !dev ? '' : todo ? `待实现${p.ui?.milestone ? `（计划 ${p.ui.milestone}）` : ''}` : p.status === 'partial' ? '局部实现' : '',
    mod ? '双击回到原样' : '',
  ].filter(Boolean).join(NL);
  return (
    <div
      className={`row ui-row ${focus === p.id ? 'focus' : ''} ${inactive ? 'inactive' : ''} ${follow ? 'is-follow' : 'is-manual'} ${mod ? 'is-mod' : ''} ${compact ? 'compact' : ''}`}
      onMouseEnter={() => focus === null && setFocus(p.id)}
      onClick={() => setFocus(p.id)}
      id={`param-${p.id}`}
      title={inactive ? `不生效：需要 ${reason}` : undefined}
    >
      <div className="row-top">
        <span className="row-label" title={rowTip} onDoubleClick={() => { if (mod) unfollow(); }}>{p.label}</span>
        {dev && todo && <span className="status todo" title={p.ui?.milestone ? `计划在 ${p.ui.milestone}` : ''}>待实现{p.ui?.milestone ? ` ${p.ui.milestone}` : ''}</span>}
        {dev && p.status === 'partial' && <span className="status partial" title="局部实现">◐</span>}
        {dev && <WhyBadge k={k} r={why} open={whyOpen} onToggle={() => setWhyOpen(!whyOpen)} />}
        {dev && <span className={`src-badge ${follow ? '' : 'manual'}`} title={follow ? '跟随：值来自这一层' : '手动改过'}>{srcText}</span>}
        {valueText && <span className="row-value">{valueText}</span>}
        {mod && <button className="row-reset follow-btn" onClick={(e) => { e.stopPropagation(); unfollow(); }} title={resetHint(p.id, origin, values)} aria-label={`${p.label}：回到原样`}>•↺</button>}
      </div>
      {!inactive || !compact ? control : null}
      {whyOpen && k && why && <ParamWhy k={k} r={why} current={resolved === undefined || resolved === null ? '未定' : paramValueText(p.id, resolved)} onClose={() => setWhyOpen(false)} />}
    </div>
  );
}

const NL = String.fromCharCode(10);
/** 选项说明里 register.ts 拼上的「参考：GameUI#…、Dota 2 s570_0」（内部出处）：开发者模式以外去掉（整合修复 U#18） */
const REFS_TAIL = /[　\s]*参考：.*$/;
const plainDesc = (d: string | undefined, dev: boolean): string | undefined => (dev || !d ? d : d.replace(REFS_TAIL, '') || undefined);
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * 有序多选（spec.ordered，审查修复 B · C3：原来只能点选开关，排不了序、不能重复、不能写 #hex 与 "a|b"）：
 *   每一项一行——序号、名字、上移 / 下移 / 删除；
 *   逐行列表（生命条逐行画法 / 颜色 el.vitals.rowForms / rowColors、列表行字段颜色 cmp.listRowColors、按钮角色色 col.actionColors）可重复添加，
 *   可加 auto 占位（这一行 / 这一项用默认，渲染里按序号对位：审查修复 A · C2）；
 *   颜色列表（freeColors）可直接加 #hex（#rgb / #rrggbb / #rrggbbaa；不收 rgba()——列表存成逗号串会被拆开）；
 *   可并排的列表（joinable：lay.edgeBarSlots）可把一项并到上一项（存成 "a|b"，贴边条里同一格）或拆开。元素清单不重复
 */
function OrderedList({ label, spec, list, opts, follow, tip, pal, onChange }: { label: string; spec: SpecParam; list: string[]; opts: OptionDef[]; follow: boolean; tip: (o: OptionDef) => string; pal: SkinPalette; onChange: (xs: string[]) => void }) {
  const [hexIn, setHexIn] = useState('');
  const perRow = !!spec.freeColors || spec.optionsFrom === 'cmp.gauge';
  const nameOf = (v: string) => (v === 'auto' ? '默认（占位）' : v.split('|').map((x) => opts.find((o) => String(o.value) === x)?.label ?? x).join(' ｜ '));
  // 角色名 / 色板引用的预览色（accent / accent2 走色板，其余角色只写名字）
  const swatchOf = (v: string) => (HEX.test(v) ? v : v === 'accent' || v === 'accent2' ? pal[v] : null);
  const used = new Set(list.flatMap((x) => x.split('|')));
  const addable = opts.filter((o) => String(o.value) !== 'auto' && (perRow || !used.has(String(o.value))));
  const move = (i: number, d: number) => { const xs = [...list]; [xs[i], xs[i + d]] = [xs[i + d], xs[i]]; onChange(xs); };
  const join = (i: number) => { const xs = [...list]; xs.splice(i - 1, 2, `${xs[i - 1]}|${xs[i]}`); onChange(xs); };
  const split = (i: number) => { const xs = [...list]; xs.splice(i, 1, ...xs[i].split('|')); onChange(xs); };
  return (
    <div className={`ordered ${follow ? 'follow' : ''}`} aria-label={label}>
      {list.length === 0 && <div className="ord-empty">（空）</div>}
      {list.map((x, i) => {
        const sw = swatchOf(x);
        return (
          <div key={`${i}:${x}`} className="ord-item">
            <span className="ord-n">{i + 1}</span>
            {sw && <span className="ord-sw" style={{ background: sw }} />}
            <span className="ord-name" title={(() => { const o = opts.find((y) => String(y.value) === x); return o ? tip(o) || o.label : x; })()}>{nameOf(x)}</span>
            <button className="btn small ghost" disabled={i === 0} onClick={() => move(i, -1)} title="上移">↑</button>
            <button className="btn small ghost" disabled={i === list.length - 1} onClick={() => move(i, 1)} title="下移">↓</button>
            {spec.joinable && i > 0 && !x.includes('|') && <button className="btn small ghost" onClick={() => join(i)} title="并到上一项：同一格里并排（存成 a|b）">并</button>}
            {spec.joinable && x.includes('|') && <button className="btn small ghost" onClick={() => split(i)} title="拆成单独的几格">拆</button>}
            <button className="btn small ghost" onClick={() => onChange(list.filter((_, j) => j !== i))} title="删掉这一项">✕</button>
          </div>
        );
      })}
      <div className="ord-add">
        <select value="" onChange={(e) => { if (e.target.value) onChange([...list, e.target.value]); }} aria-label={`${label}：加一项`}>
          <option value="">＋ 加一项…</option>
          {perRow && <option value="auto">默认（auto 占位）</option>}
          {addable.map((o) => <option key={o.value} value={o.value} title={tip(o)}>{o.label}</option>)}
        </select>
        {spec.freeColors && (
          <>
            <input className="ord-hex" value={hexIn} placeholder="#rrggbb" size={10} onChange={(e) => setHexIn(e.target.value.trim())} onKeyDown={(e) => { if (e.key === 'Enter' && HEX.test(hexIn)) { onChange([...list, hexIn]); setHexIn(''); } }} aria-label={`${label}：加一个颜色`} />
            <button className="btn small" disabled={!HEX.test(hexIn)} onClick={() => { onChange([...list, hexIn]); setHexIn(''); }} title="#rgb / #rrggbb / #rrggbbaa（不收 rgba()）">＋ 颜色</button>
          </>
        )}
      </div>
    </div>
  );
}
