import { useEffect, useMemo } from 'react';
import { baseKeyOf } from '../../content/uiKnowledge';
import { SCENE_MAP, sceneMeta } from '../../content/sceneCatalog';
import { getParam, str, uiParams } from '../../dims/registry';
import type { ParamDef, Values } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { scenePaletteOf } from '../../hud/HudSystem';
import { packFor } from '../../hud/content';
import { evalCond } from '../../hud/sys/cond';
import { scopedAll } from '../../hud/sys/check';
import { parseElementKey, parseOverrideKey, SELECTORS } from '../../hud/sys/register';
import { resolveUi } from '../../hud/sys/resolve';
import { presetsOf, SPEC_GROUPS, SPEC_PARAM } from '../../hud/sys/spec';
import { buildTheme } from '../../hud/sys/theme';
import { applyEnv, nudgeState, pickNudge } from '../../state/actions';
import { isModifiedKey, type Origin } from '../../state/layers';
import { useStore } from '../../state/store';
import { useShell } from '../stage/shell';
import { UiParamRow } from './UiParamRow';
import { MotionBar } from './MotionBar';
import { KnowledgeLoading } from '../learn/KnowledgeBits';
import { useUiKnowledgeState } from '../learn/useUiKnowledge';
// 常用十项的 id 表放在 .ts 里（T0）：本文件只导出组件，Fast Refresh 才能热替换
import { STARTER_KNOBS } from './starterKnobs';
import './uiPanel.css';
import { groupOfTab, UI_GROUPS, UI_MORE_SUBS, useUiPanel, type UiGroup, type UiMoreSub } from './uiPanelState';

/*
 * UI 模式右栏的参数面板（轨道 D，docs/workbench-redesign.md §5.4 §7「UI 模式：10 个页签收成 5 组」）。
 *   常用：11 个感觉芯片（点 = 在当前值上微调，选中的再点 = 去掉）+ 常用十项；
 *   外观：形、线、面、饰、色彩、字体、素材槽（最上面「跟随画面配色」）；
 *   内容：这一屏显示什么、怎么排、层级；版式（品类布局 / 版式模式 / 场景容器——场景给了，高级用户可以盖）；信息元素（逐元素参数，收起）；
 *   动效：演示与事件（MotionBar）+ 动效、交互、流程参数；
 *   更多：组件 · 世界 · 无障碍（含无障碍叠加）· 运营 · 工具。
 * 原来的「起点」页拆走了（§5.4）：皮肤 / 风格词 / 节日 / 成套 → 画框下方的皮肤行；界面 → 界面胶片；平台 / 商业 → 场景弹窗的「我的游戏」；
 *   「↺ 全部跟随」并进顶栏 UI 标签的 ↺▾（A 的「清样式改动」）。选中元素时外壳在右栏换成元素检查器，所以这里不再放检查器。
 * 每组默认只显示常用（tier 1–2），tier 3 收在「更多参数」，不生效的折叠到组末尾。组 / 小节 / 展开状态在 uiPanelState（切模式不丢）。
 */

/** 已经处理过的参数跳转（store.uiJump.t）：面板切走再挂上时不再重跳一次旧的 */
let handledJumpT = 0;

const GROUP_LABEL = new Map(SPEC_GROUPS.map((g) => [g.id, g.label]));

/** 原来「起点」页的选择器：哪些留在面板里、放进哪一组（其余在皮肤行、界面胶片、场景弹窗） */
const START_PLACE: Record<string, { group: UiGroup; sub?: UiMoreSub; section: string }> = {
  'hud.useSceneColors': { group: 'look', section: '跟随画面' },
  [SELECTORS.layout]: { group: 'content', section: '版式' },
  [SELECTORS.pattern]: { group: 'content', section: '版式' },
  [SELECTORS.container]: { group: 'content', section: '版式' },
  [SELECTORS.overlay]: { group: 'more', sub: 'player', section: '无障碍叠加' },
  // 其余选择器的主入口在皮肤行 / 界面胶片 / 场景弹窗；这里留一份完整的下拉，任何取值都在 2 次点击内（§7「广度不丢」，审查修复 5：
  // 原来风格词「不用」、⌘K 跳到这几个参数都无处可去）
  'hud.style': { group: 'more', sub: 'tools', section: '选择器' },
  [SELECTORS.keyword]: { group: 'more', sub: 'tools', section: '选择器' },
  [SELECTORS.theme]: { group: 'more', sub: 'tools', section: '选择器' },
  [SELECTORS.screen]: { group: 'more', sub: 'tools', section: '选择器' },
  [SELECTORS.platform]: { group: 'more', sub: 'tools', section: '选择器' },
  [SELECTORS.business]: { group: 'more', sub: 'tools', section: '选择器' },
};

/** 一个参数在哪一组 / 小节 */
function placeOf(p: ParamDef): { group: UiGroup; sub?: UiMoreSub } | null {
  if (p.ui?.scope === 'start') { const s = START_PLACE[p.id]; return s ? { group: s.group, sub: s.sub } : null; }
  return groupOfTab(p.ui?.tab);
}

const changed = (p: ParamDef, values: Values, origin: Origin) => isModifiedKey(p.id, values, origin);

export function UiPanel() {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const { group, sub, more, onlyChanged, godotOnly: godotPref, set } = useUiPanel();
  const dev = useShell((s) => s.dev);
  // 「只看 Godot 内置」只在开发者模式生效（勾选框也只在开发者模式出现；记住的勾选不能在普通模式下悄悄藏参数，审查修复 14）
  const godotOnly = godotPref && dev;
  // 知识面板里点了参数小标签（store.uiJump）：元素键由外壳的检查器处理（B 的 UiSide）；其余的切到它所在的组 / 小节，
  // 展开「更多参数」，滚到那一行（被「只看改过的」筛掉时先放开筛选；落在「当前不生效」折叠里的先展开）
  const uiJump = useStore((s) => s.uiJump);
  useEffect(() => {
    if (!uiJump || uiJump.t <= handledJumpT) return;
    const id = uiJump.id, t = uiJump.t;
    const target = parseElementKey(id)?.element ?? parseOverrideKey(id)?.target;
    if (target?.startsWith('el.')) return;
    const p = getParam(id) ?? getParam(baseKeyOf(id));
    const pl = p ? placeOf(p) : null;
    if (pl) {
      const st = useUiPanel.getState();
      st.set({ group: pl.group, ...(pl.sub ? { sub: pl.sub } : {}), ...((p?.ui?.tier ?? 2) >= 3 ? { more: { ...st.more, [pl.group]: true } } : {}) });
    }
    const timers: number[] = [];
    const find = (x: string) => document.getElementById(`param-${x}`);
    const go = (row: HTMLElement) => {
      const d = row.closest('details');
      if (d && !d.open) d.open = true;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.remove('kn-flash');
      void row.offsetWidth;
      row.classList.add('kn-flash');
      timers.push(window.setTimeout(() => row.classList.remove('kn-flash'), 1600));
    };
    timers.push(window.setTimeout(() => {
      handledJumpT = Math.max(handledJumpT, t);
      const row = find(id);
      if (row) return go(row);
      const st = useUiPanel.getState();
      st.set({ onlyChanged: false, godotOnly: false, more: { ...st.more, [st.group]: true } });
      timers.push(window.setTimeout(() => {
        const again = find(id);
        if (again) return go(again);
        const base = baseKeyOf(id);
        const b = base !== id ? find(base) : null;
        if (b) { useStore.getState().setFocus(base); go(b); }
      }, 120));
    }, 60));
    return () => timers.forEach((x) => clearTimeout(x));
  }, [uiJump]);
  const { error: knowError } = useUiKnowledgeState();
  const r = useMemo(() => resolveUi(values), [values]);
  const th = useMemo(() => buildTheme(r, scenePaletteOf(values), str(values, 'hud.style')), [r, values]);
  const pal = th.pal;
  const all = useMemo(() => uiParams(), []);

  // 每组改过几项（组名上的小数字）
  const counts = useMemo(() => {
    const c: Partial<Record<UiGroup, number>> = {};
    for (const p of all) {
      const pl = placeOf(p);
      if (pl && changed(p, values, origin)) c[pl.group] = (c[pl.group] ?? 0) + 1;
    }
    return c;
  }, [all, values, origin]);

  const inHere = (p: ParamDef) => { const pl = placeOf(p); return !!pl && pl.group === group && (group !== 'more' || pl.sub === sub); };
  const showMore = !!more[group];

  /** 一组参数：按参数组分段；tier 3 收进「更多参数」；不生效的收到末尾 */
  const rows = (ps: ParamDef[]) => {
    const allOf = scopedAll(r);
    const active: ParamDef[] = [], hidden: ParamDef[] = [], off: ParamDef[] = [];
    for (const p of ps) {
      if (onlyChanged && !changed(p, values, origin)) continue;
      if (godotOnly && p.port?.godotLevel && p.port.godotLevel !== 'builtin' && !changed(p, values, origin)) continue;
      const w = SPEC_PARAM.get(p.id)?.activeWhen;
      if (w && evalCond(w, (k) => r.get(k), undefined, allOf) === false && !changed(p, values, origin)) off.push(p);
      else if ((p.ui?.tier ?? 2) >= 3 && !showMore && !changed(p, values, origin) && p.ui?.scope !== 'start') hidden.push(p);
      else active.push(p);
    }
    const byGroup = new Map<string, ParamDef[]>();
    for (const p of active) {
      const g = p.ui?.scope === 'start' ? `start:${START_PLACE[p.id]?.section ?? ''}` : p.ui?.group ?? '';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(p);
    }
    return { byGroup, hidden, off };
  };

  const section = (ps: ParamDef[], opts: { pack?: boolean } = {}) => {
    const { byGroup, hidden, off } = rows(ps);
    return (
      <>
        {[...byGroup.entries()].map(([g, list]) => (
          <div key={g}>
            <div className="group-title">{g.startsWith('start:') ? g.slice(6) : (GROUP_LABEL.get(g) ?? g).replace(/（.*?）/g, '')}</div>
            {opts.pack && g === 'cnt' && <PackBar r={r} />}
            {list.map((p) => <UiParamRow key={p.id} p={p} r={r} pal={pal} godotOnly={godotOnly} />)}
          </div>
        ))}
        {!byGroup.size && <p className="hint">{onlyChanged ? '没有改过的参数' : '没有可调的参数'}</p>}
        {hidden.length > 0 && <button className="btn small ghost more-toggle" onClick={() => set({ more: { ...more, [group]: true } })}>更多参数（{hidden.length}）</button>}
        {showMore && <button className="btn small ghost more-toggle" onClick={() => set({ more: { ...more, [group]: false } })}>收起更多参数</button>}
        {off.length > 0 && (
          <details className="ui-off">
            <summary>当前不生效（{off.length}）</summary>
            {off.map((p) => <UiParamRow key={p.id} p={p} r={r} pal={pal} compact />)}
          </details>
        )}
      </>
    );
  };

  const body = () => {
    if (group === 'common') return <CommonGroup r={r} pal={pal} />;
    const ps = all.filter(inHere);
    if (group === 'content') {
      // 信息元素（逐元素参数）很多：收起来，打开才渲染
      const el = ps.filter((p) => p.ui?.tab === 'elements');
      const rest = ps.filter((p) => p.ui?.tab !== 'elements');
      const elChanged = el.filter((p) => changed(p, values, origin)).length;
      return (
        <>
          {section(rest, { pack: true })}
          <ElementsSection n={el.length} changedN={elChanged}>{() => section(el)}</ElementsSection>
        </>
      );
    }
    return (
      <>
        {group === 'motion' && <MotionBar r={r} />}
        {group === 'more' && (
          <div className="chips ui-subs">
            {UI_MORE_SUBS.map((s) => <button key={s.id} className={`chip link ${sub === s.id ? 'blue' : ''}`} title={s.tip} onClick={() => set({ sub: s.id })}>{s.label}</button>)}
          </div>
        )}
        {section(ps)}
      </>
    );
  };

  return (
    <div className="ui-panel">
      <div className="tabs ui-tabs" role="tablist">
        {UI_GROUPS.map((g) => (
          <button key={g.id} className={`tab ${group === g.id ? 'on' : ''}`} title={g.tip} onClick={() => set({ group: g.id })} role="tab" aria-selected={group === g.id}>
            {g.label}{counts[g.id] ? <sup>{counts[g.id]}</sup> : null}
          </button>
        ))}
      </div>
      {group !== 'common' && (
        <div className="ui-tools">
          <label><input type="checkbox" checked={onlyChanged} onChange={(e) => set({ onlyChanged: e.target.checked })} /> 只看改过的</label>
          {dev && <label title="隐藏需要着色器、额外脚本或素材才能在 Godot 里做出来的参数与取值"><input type="checkbox" checked={godotPref} onChange={(e) => set({ godotOnly: e.target.checked })} /> 只看 Godot 内置</label>}
          <span className="tb-spacer" />
          <Warnings r={r} />
        </div>
      )}
      {knowError && <KnowledgeLoading error={knowError} what="参数依据（UI 知识库）" />}
      {body()}
    </div>
  );
}

/** 约束提醒：收成一个「⚠ N」芯片，内容进悬停提示（§7：右栏不放整句） */
function Warnings({ r }: { r: ReturnType<typeof resolveUi> }) {
  if (!r.warnings.length) return null;
  const err = r.warnings.some((w) => w.level === 'error');
  return <span className={`chip ${err ? 'warn' : ''}`} title={r.warnings.map((w) => `⚠ ${w.why}`).join('\n')}>⚠ {r.warnings.length}</span>;
}

/** 内容 › 信息元素：逐元素参数收起（打开才渲染，免得一次挂上百行） */
function ElementsSection({ n, changedN, children }: { n: number; changedN: number; children: () => React.ReactNode }) {
  const open = useUiPanel((s) => !!s.more.content && s.group === 'content');
  const set = useUiPanel((s) => s.set);
  const moreState = useUiPanel((s) => s.more);
  if (!n) return null;
  return (
    <details className="ui-elements" open={open || changedN > 0} onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== open) set({ more: { ...moreState, content: o } }); }}>
      <summary title="每个信息元素自己的参数（画法、锚点、大小……）；在画框上点选元素会直接打开它的检查器">信息元素（{n}）{changedN ? ` · 改 ${changedN}` : ''}</summary>
      {(open || changedN > 0) && children()}
    </details>
  );
}

/** 常用：11 个感觉芯片 + 常用十项（§5.4：STARTER_KNOBS + 11 个感觉 → UI 常用组） */
function CommonGroup({ r, pal }: { r: ReturnType<typeof resolveUi>; pal: ReturnType<typeof buildTheme>['pal'] }) {
  const values = useStore((s) => s.values);
  useStore((s) => s.origin);
  const scene = scenePaletteOf(values);
  return (
    <>
      <div className="group-title" title="在当前值上微调；选中的再点一次 = 去掉（之前手动改过的值放回去）">感觉</div>
      <div className="chips ui-chips">
        {presetsOf('nudge').map((p) => {
          const on = nudgeState(p.id, scene).on;
          return <button key={p.id} className={`chip link ${on ? 'blue' : ''}`} title={p.desc} onClick={() => pickNudge(p.id, { scene: scenePaletteOf(useStore.getState().values) })}>{p.label.replace(/^更/, '')}</button>;
        })}
      </div>
      <div className="group-title" title="每项都能盖过皮肤和场景给的值">常用</div>
      {STARTER_KNOBS.map((id) => {
        const p = getParam(id);
        return p ? <UiParamRow key={id} p={p} r={r} pal={pal} /> : null;
      })}
    </>
  );
}

/**
 * 示例内容包（cnt.pack）：面板自己解析的结果对应的包，悬停看一句话简介。
 * 没选场景时保留「建议场景（套用）」（换环境，可撤销）；选了场景时场景已经决定了包和环境，不再给这个按钮。
 */
function PackBar({ r }: { r: ReturnType<typeof resolveUi> }) {
  const scene = useStore((s) => str(s.values, 'game.scene'));
  const picked = useStore((s) => !!s.origin.scene);
  const p = packFor(r);
  const ok = !picked && SCENE_MAP.has(p.scene) && hasSceneBuilder(p.scene);
  const here = scene === p.scene;
  const name = sceneMeta(p.scene).name;
  return (
    <div className="ui-tools">
      <span title={p.game.tagline}>示例内容：{p.game.name}</span>
      <span className="tb-spacer" />
      {ok && (
        <button className="btn small" disabled={here} onClick={() => applyEnv(p.scene, name)} title={here ? '画面已经是这个环境' : `把环境换成"${name}"（可撤销）`}>
          建议环境：{name}
        </button>
      )}
    </div>
  );
}
