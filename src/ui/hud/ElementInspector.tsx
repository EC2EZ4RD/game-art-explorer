import { getParam } from '../../dims/registry';
import type { ParamDef } from '../../dims/types';
import { packFor } from '../../hud/content';
import { wantsElements } from '../../hud/compose/hud';
import { baseId, INSTANCE_MAX, instanceNo, parseOverrideKey } from '../../hud/sys/register';
import type { Resolved } from '../../hud/sys/resolve';
import { ELEMENT_IDS, ELX_PARAMS, SPEC, type Raw } from '../../hud/sys/spec';
import type { Theme } from '../../hud/sys/theme';
import type { SkinPalette } from '../../hud/types';
import { useStore } from '../../state/store';
import { ANCHOR_GRID, ANCHOR_LABEL, anchorKey, anchorOf, elementName, isSampleHud, makeHudEditable, resetElementNow, toggleElementPatch } from '../stage/elements';
import { useShell } from '../stage/shell';
import { SLOT } from '../stage/slots';
import { UiParamRow } from './UiParamRow';

/*
 * 元素检查器（docs/ui-hud-plan.md M5a；轨道 B 按 docs/workbench-redesign.md §6 调了行序）：
 *   1 位置（九宫格锚点 + X / Y 偏移）→ 2 大小 → 3 显隐 → 4 画法 → 5 颜色 → 6 圆角 / 描边 → 7 更多（其余约 50 项：元素自己的参数、组件形态覆盖、实例参数、依据）。
 * 标题处有 ↺（还原这个元素：A 的 actions.resetElement，按来源基线还原，审查修复 2）。在画框上点选元素、或在本屏元素列表里点它都会打开这里。
 * 覆盖行：除了常用的组件形态，当前值里已有的、或知识面板点名要跳到的"参数@这个元素"也各给一行（例如 vis.corner@el.title），不然点了跳不到。
 * 整合修复（IB · U#18）：行的「跟随：…」出处平时写人话（元素默认 / 整套 UI 的画法 / 整套 UI），参数表里的 id（元素模板 elx、全局组件形态）只在开发者模式写；
 * 选元素的下拉里没有中文名的元素也不露 id。
 */

const LABEL = new Map((SPEC.vocab.elements as unknown as { id: string; label: string; question?: string }[]).map((x) => [x.id, x]));
/** 实例参数 = 参数表里全部 elx.*；写了 appliesTo 的只给这些元素 */
const instanceOf = (sel: string) => ELX_PARAMS.filter((p) => !p.appliesTo?.length || p.appliesTo.includes(sel)).map((p) => p.id.slice(4));
/** 每个元素常改的组件形态 */
const COMPONENTS: Record<string, string[]> = {
  'el.vitals': ['cmp.gauge'], 'el.speed': ['cmp.gauge'], 'el.threat': ['cmp.gauge'], 'el.loading': ['cmp.gauge'], 'el.meter': ['cmp.gauge'],
  'el.title': ['cmp.plate'], 'el.subtitle': ['cmp.dialogBox'], 'el.choices': ['cmp.button'], 'el.rank': ['cmp.badge'], 'el.reward': ['cmp.card', 'cmp.slot'],
  'el.abilities': ['cmp.slot'], 'el.selection': ['cmp.card'],
};
/** 前几段固定的行（其余进「更多」） */
const TOP_INST = ['offsetX', 'offsetY', 'scale', 'visibility'];
const TOP_OVERRIDES = ['col.accent', 'vis.corner', 'vis.strokeWidth'];

const synth = (base: ParamDef | undefined, id: string, label?: string): ParamDef | null => (base ? { ...base, id, label: label ?? base.label } : null);

/** jumpKey：UiPanel 这次挂载里刚跳到的键（知识面板点了"参数@这个元素"）：没有现成的一行时为它补一行 */
export function ElementInspector({ r, pal, th, jumpKey }: { r: Resolved; pal: SkinPalette; th: Theme; jumpKey?: string | null }) {
  const sel = useStore((s) => s.hudSel);
  const setSel = useStore((s) => s.setHudSel);
  const set = useStore((s) => s.set);
  const values = useStore((s) => s.values);
  const dev = useShell((s) => s.dev);
  const active = r.elements();
  const using = wantsElements(th);
  // 「跟随：…」的出处：开发者模式写参数表里的层名，平时写人话
  const SRC = dev ? { inst: '元素模板 elx', cmp: '全局组件形态', glob: '全局值' } : { inst: '元素默认', cmp: '整套 UI 的画法', glob: '整套 UI' };
  // 显示 / 隐藏：与本屏元素列表同一个写法（藏了再显示回到基线时不留改动）
  const toggle = () => {
    if (!sel) return;
    const on = active.includes(sel);
    useStore.getState().patch(toggleElementPatch(r, sel, !on), [], `${on ? '隐藏' : '显示'} ${elementName(sel)}`);
  };
  // 元素实例（M12b-04）：选中的可以是 el.<元素>#2 / #3——画法参数、实例参数都写成实例键（没写时回到参数表默认 / elx.*，不继承第一份）
  const base = sel ? baseId(sel) : null;
  const nextInstance = base ? [2, 3].map((n) => `${base}#${n}`).find((id) => !active.includes(id)) : undefined;
  const addInstance = () => { if (nextInstance && instanceNo(nextInstance) <= INSTANCE_MAX) { set('cnt.elements', [...active, nextInstance].join(',')); setSel(nextInstance); } };
  const own = sel && base ? (SPEC.groups.find((g) => g.id === 'el')?.params ?? []).filter((p) => p.id.startsWith(`${base}.`)).map((p) => synth(getParam(p.id), `${sel}${p.id.slice(base.length)}`)).filter(Boolean) as ParamDef[] : [];
  const formRow = own.find((p) => p.id === `${sel}.form`);
  const ownRest = own.filter((p) => p !== formRow);
  // 覆盖行：常用组件形态 + 颜色 / 圆角 / 描边 + 当前值里已有的 / 正要跳到的"参数@这个元素"
  const overrideParams = sel ? [...new Set([
    ...(COMPONENTS[sel] ?? COMPONENTS[base ?? ''] ?? []),
    ...TOP_OVERRIDES,
    ...[...Object.keys(values), ...(jumpKey ? [jumpKey] : [])].map((key) => parseOverrideKey(key)).filter((o) => o?.target === sel).map((o) => o!.param),
  ])] : [];
  const comps = sel ? overrideParams.map((c) => synth(getParam(c), `${c}@${sel}`, `${getParam(c)?.label ?? c}`)).filter(Boolean) as ParamDef[] : [];
  // 没有自己画法的数值条：画法 = 组件形态 cmp.gauge
  const gaugeForm = !formRow ? comps.find((p) => p.id.startsWith('cmp.gauge@')) : undefined;
  const compTop = comps.filter((p) => TOP_OVERRIDES.includes(p.id.split('@')[0]));
  const compRest = comps.filter((p) => p !== gaugeForm && !compTop.includes(p));
  const inst = sel && base ? instanceOf(base).map((suf) => synth(getParam(`elx.${suf}`), `${sel}.${suf}`)).filter(Boolean) as ParamDef[] : [];
  const instRow = (suf: string) => inst.find((p) => p.id === `${sel}.${suf}`);
  const instRest = inst.filter((p) => !TOP_INST.includes(p.id.slice((sel?.length ?? 0) + 1)) && p.id !== `${sel}.screenAnchor`);
  const info = base ? LABEL.get(base) : undefined;
  const Why = SLOT.ElementWhy;

  const elRow = (p: ParamDef | undefined) => p && sel ? <UiParamRow key={p.id} p={p} r={r} pal={pal} value={r.el(sel, p.id.slice(sel.length + 1)) as Raw} srcLabel={SRC.inst} specId={`elx.${p.id.slice(sel.length + 1)}`} element={sel} /> : null;
  const compRow = (p: ParamDef) => sel ? <UiParamRow key={p.id} p={p} r={r} pal={pal} value={r.at(p.id.split('@')[0], sel) as Raw} srcLabel={p.id.startsWith('cmp.') ? SRC.cmp : SRC.glob} specId={p.id.split('@')[0]} element={sel} /> : null;
  const ownRow = (p: ParamDef) => sel && base ? <UiParamRow key={p.id} p={p} r={r} pal={pal} element={sel} {...(sel !== base ? { value: r.el(sel, p.id.slice(sel.length + 1)) as Raw, specId: `${base}${p.id.slice(sel.length)}` } : {})} /> : null;
  const moreCount = ownRest.length + compRest.length + instRest.length;

  if (!sel) {
    return (
      <div className="ui-el">
        <div className="ui-el-head">
          <select value="" onChange={(e) => setSel(e.target.value || null)} aria-label="信息元素">
            <option value="">选一个元素…</option>
            {ELEMENT_IDS.map((id) => <option key={id} value={id}>{active.includes(id) ? '● ' : '　'}{LABEL.get(id)?.label ?? elementName(id)}{dev ? `（${id}）` : ''}</option>)}
          </select>
        </div>
      </div>
    );
  }
  const curAnchor = anchorOf(r, sel);
  const aKey = anchorKey(r, sel);
  return (
    <div className="ui-el">
      <div className="el-head">
        <button className="btn ghost small" onClick={() => setSel(null)} title="回到本屏元素">‹</button>
        <b className="el-name" title={info?.label}>{elementName(sel)}</b>
        <label className="el-show" title="显示 / 隐藏这个元素"><input type="checkbox" checked={active.includes(sel)} onChange={toggle} />显示</label>
        {active.includes(sel) && nextInstance && <button className="btn ghost small" onClick={addInstance} title="同一元素再加一份（各自的锚点 / 画法 / 参数）">⧉</button>}
        <button className="btn ghost small" onClick={() => resetElementNow(sel)} title="还原这个元素（锚点、大小、画法、颜色……回到原样；名作 / 场景给的位置保留）">↺</button>
      </div>
      {!using && (isSampleHud(r)
        // 示例 HUD（审查修复 16）：这里的改动画面上看不到，给一个直接能走的出口
        ? <p className="hint el-sample">示例 HUD 不按元素排版 <button className="btn small primary" onClick={() => makeHudEditable(r)} title="换成这个品类的布局，元素就能单独改（一步撤销）">改成可拖动的 UI</button></p>
        : <p className="hint">这一屏不按元素排版</p>)}
      <div className="group-title">位置</div>
      <div className="anchor-pick" role="radiogroup" aria-label="屏幕锚点">
        {ANCHOR_GRID.flat().map((a) => (
          <button key={a} className={a === curAnchor ? 'on' : ''} title={ANCHOR_LABEL[a]} onClick={() => set(aKey, a)} />
        ))}
        <span className="anchor-name">{ANCHOR_LABEL[curAnchor]}</span>
      </div>
      {elRow(instRow('offsetX'))}
      {elRow(instRow('offsetY'))}
      <div className="group-title">大小 · 显隐</div>
      {elRow(instRow('scale'))}
      {elRow(instRow('visibility'))}
      {(formRow || gaugeForm) && <div className="group-title">画法</div>}
      {formRow && ownRow(formRow)}
      {gaugeForm && compRow(gaugeForm)}
      <div className="group-title">颜色 · 圆角 · 描边</div>
      {compTop.map(compRow)}
      <details className="el-more" id="el-inspector-more">
        <summary>更多（{moreCount}）</summary>
        {info?.question && <p className="hint">{info.question}</p>}
        {Why && base && <Why el={base} label={info?.label ?? base} pack={packFor(r).id} />}
        {ownRest.map(ownRow)}
        {compRest.length > 0 && <div className="group-title">只对这个元素的覆盖</div>}
        {compRest.map(compRow)}
        <div className="group-title">摆放与显示（没设置时继承模板）</div>
        {instRest.map((p) => elRow(p))}
      </details>
    </div>
  );
}
