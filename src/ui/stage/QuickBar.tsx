import { useLayoutEffect, useRef, useState } from 'react';
import { getParam } from '../../dims/registry';
import type { Val } from '../../dims/types';
import { baseId } from '../../hud/sys/register';
import type { Resolved } from '../../hud/sys/resolve';
import * as actions from '../../state/actions';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';
import { elementName, keyFor, nextInstance, resetElementNow, scaleText, scaleVal, toggleElementPatch } from './elements';
import { screenPartChanges } from './parts';
import { MenuItem, Pop } from './Pop';

/*
 * 浮动快捷条（轨道 B，§6）：36px 高，在选中元素上方 8px，靠近顶边时翻到下方，不遮住元素。
 *   画法▾（el.<id>.form；没有自己画法的数值条用 cmp.gauge@el.<id>）· 颜色 ●●●● 跟随（col.accent@el.<id>）· 圆角·当前▾（vis.corner@el.<id>）
 *   · 描边·当前▾（vis.strokeWidth@el.<id>）· 大小 − ×1.00 +（scale ±0.1）· 隐藏 · 复制 · ↺ 还原此元素 · 更多…（右栏完整检查器，展开「更多」）
 * 大小的读数两位小数（「×1.55」，整合 U#21：原来一位小数，快捷条写 1.6、检查器写 1.55）。
 * 按钮都用字（审查修复 24：◰ ▢ 👁 ⧉ 这类符号只有悬停才知道是什么），圆角 / 描边点开是小下拉，按钮上写着现在的值。
 * 每次点击一步撤销（−大小+ 连点会合并成一步：store.set 的 900ms 合并）。大小写排版实际读的那个键（画法级键写了值时写它，审查修复 7）。
 */

const COLOR_ROLES: [string, string][] = [['@accent', '强调'], ['@accent2', '次强调'], ['@good', '正向'], ['@ink', '墨色']];
const CORNERS: [string, string][] = [['sharp', '直角'], ['round', '圆角'], ['chamfer', '切角'], ['step', '台阶']];
const STROKES = [1, 2, 3, 4];
/** 量到实际宽度之前的估计（翻边 / 夹在画框里用） */
const BAR_W0 = 560;

/** 画法参数：元素自己的 el.<元素>.form，或数值条的组件形态 cmp.gauge */
function formParam(id: string): { key: string; def: ReturnType<typeof getParam> } | null {
  const base = baseId(id);
  const own = getParam(`${base}.form`);
  if (own) return { key: `${id}.form`, def: own };
  const g = getParam('cmp.gauge');
  if (g && ['el.vitals', 'el.speed', 'el.threat', 'el.loading', 'el.meter'].includes(base)) return { key: `cmp.gauge@${id}`, def: g };
  return null;
}

export function QuickBar({ id, form, box, W, H, r }: { id: string; form?: string; box: { x: number; y: number; w: number; h: number }; W: number; H: number; r: Resolved }) {
  const values = useStore((s) => s.values);
  const st = useStore.getState();
  const ref = useRef<HTMLDivElement>(null);
  const [barW, setBarW] = useState(BAR_W0);
  useLayoutEffect(() => { const w = ref.current?.offsetWidth; if (w && Math.abs(w - barW) > 1) setBarW(w); });
  const name = elementName(id);
  const pal = getEngine()?.hud.theme?.pal as Record<string, string> | undefined;
  const top = box.y - 36 - 8 < 4 ? box.y + box.h + 8 : box.y - 36 - 8;
  const left = Math.max(4, Math.min(box.x, W - barW - 4));
  const fp = formParam(id);
  const curForm = fp ? String(values[fp.key] ?? (fp.key.includes('@') ? r.at('cmp.gauge', id) : r.el(id, 'form')) ?? '') : '';
  const colorKey = `col.accent@${id}`, cornerKey = `vis.corner@${id}`, strokeKey = `vis.strokeWidth@${id}`, scaleKey = keyFor(r, id, 'scale', form);
  const corner = values[cornerKey] as string | undefined;
  const stroke = values[strokeKey] as number | undefined;
  const scale = Number(r.el(id, 'scale', form) ?? 1) || 1;
  const setOrUnset = (k: string, v: Val | undefined, label: string) => (v === undefined ? st.patch({}, [k], label) : st.patch({ [k]: v }, [], label));
  const optLabel = (k: string, v: unknown) => getParam(k)?.options?.find((o) => o.value === v)?.label;
  const cornerName = corner ? CORNERS.find((c) => c[0] === corner)?.[1] ?? optLabel('vis.corner', corner) ?? corner : '跟随';
  const formName = fp ? optLabel(fp.def!.id, curForm) ?? '跟随' : '';
  const openMore = () => {
    const d = document.getElementById('el-inspector-more') as HTMLDetailsElement | null;
    if (!d) return;
    d.open = true;
    d.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  void H;
  return (
    <div className="quick-bar" ref={ref} style={{ left, top }} onPointerDown={(e) => e.stopPropagation()}>
      {fp && (
        <Pop label="画法▾" className="qb-btn" title={`画法：${formName}`}>
          {(close) => (
            <div className="qb-forms">
              {(fp.def!.options ?? []).map((o) => (
                <MenuItem key={o.value} on={curForm === o.value || curForm.split(',').includes(o.value)} onClick={() => { setOrUnset(fp.key, o.value === 'auto' ? undefined : o.value, `${name} 画法：${o.label}`); close(); }}>{o.label}</MenuItem>
              ))}
            </div>
          )}
        </Pop>
      )}
      <span className="qb-colors" title="颜色（只改这个元素）">
        {COLOR_ROLES.map(([role, l]) => (
          <button key={role} className={`qb-sw ${values[colorKey] === role ? 'on' : ''}`} title={l} style={{ background: pal?.[role.slice(1)] ?? '#888' }} onClick={() => setOrUnset(colorKey, role, `${name} 颜色：${l}`)} />
        ))}
        <button className={`qb-btn tiny ${values[colorKey] === undefined ? 'on' : ''}`} onClick={() => setOrUnset(colorKey, undefined, `${name} 颜色：跟随`)} title="颜色跟随皮肤">跟随</button>
      </span>
      <Pop label={`圆角·${cornerName}▾`} className={`qb-btn ${corner ? 'on' : ''}`} title="圆角（只改这个元素）">
        {(close) => (
          <div className="qb-forms">
            <MenuItem on={!corner} onClick={() => { setOrUnset(cornerKey, undefined, `${name} 圆角：跟随`); close(); }}>跟随皮肤</MenuItem>
            {CORNERS.map(([v, l]) => <MenuItem key={v} on={corner === v} onClick={() => { setOrUnset(cornerKey, v, `${name} 圆角：${l}`); close(); }}>{l}</MenuItem>)}
          </div>
        )}
      </Pop>
      <Pop label={`描边·${stroke ?? '跟随'}▾`} className={`qb-btn ${stroke ? 'on' : ''}`} title="描边粗细（只改这个元素）">
        {(close) => (
          <div className="qb-forms">
            <MenuItem on={stroke === undefined} onClick={() => { setOrUnset(strokeKey, undefined, `${name} 描边：跟随`); close(); }}>跟随皮肤</MenuItem>
            {STROKES.map((v) => <MenuItem key={v} on={stroke === v} onClick={() => { setOrUnset(strokeKey, v, `${name} 描边：${v}px`); close(); }}>{v}px</MenuItem>)}
          </div>
        )}
      </Pop>
      <span className="qb-size" title={`大小 ${scaleText(scale)}（拖角手柄也能缩放，按住 Shift 微调）`}>
        <span className="qb-lab">大小</span>
        <button className="qb-btn" onClick={() => st.set(scaleKey, scaleVal(scale - 0.1))} aria-label="缩小">−</button>
        <span className="qb-val">{scaleText(scale)}</span>
        <button className="qb-btn" onClick={() => st.set(scaleKey, scaleVal(scale + 0.1))} aria-label="放大">+</button>
      </span>
      <button className="qb-btn" title="隐藏（Delete）：右栏「已隐藏」里可以恢复" onClick={() => { st.patch(toggleElementPatch(r, id, false), [], `隐藏 ${name}`); st.setHudSel(null); }}>隐藏</button>
      <button className="qb-btn" title="同一元素再加一份（Ctrl+D）" disabled={!nextInstance(r, id)} onClick={() => { const n = nextInstance(r, id); if (n) { st.patch({ 'cnt.elements': [...r.elements(), n].join(',') }, [], `复制 ${name}`); st.setHudSel(n); } }}>复制</button>
      <button className="qb-btn" title="还原此元素（Shift+R）：位置、大小、样式回到原样" onClick={() => resetElementNow(id)}>↺</button>
      <button className="qb-btn" title="右栏完整检查器" onClick={openMore}>更多…</button>
    </div>
  );
}

/*
 * 「整个界面」快捷条（§6 过渡期）：模板 / 菜单 / 示例屏现在没有部件命中框（E 的第二阶段补上），
 * 这时画框左上角给一个「▣ 整个界面」，点开是版式 / 容器 / 密度 / 背景虚化。
 * 选中了一个部件（轨道 B2）时也是这一条，标题写「整个界面 · 选中：按钮 2」（这一条上的键都是整屏的，B2 审查修复 ⑦），下面多一条 PartBar（只在这一屏）；
 * tpl = 这一屏的模板 id：这一屏的部件覆盖（cmp.*@tpl.<id>）有改动时多一个「↺ 这一屏」（A 的 resetScreenParts，一步撤销）。
 * onClose：条尾的 ×（收起 / 取消选中）放在条里（B2 审查修复 ㉓：原来是画框最右边单独一个 ×，正好压在模板自己的关闭符号上）。
 */
const BEHIND: [string, string][] = [['auto', '跟随'], ['live', '实时'], ['frozen', '定格'], ['replaced', '换背景']];
export function ScreenQuickBar({ r, label, tpl, onClose, closeTitle = '收起' }: { r: Resolved; label: string; tpl?: string; onClose?: () => void; closeTitle?: string }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const partChanges = tpl ? screenPartChanges(values, origin, tpl) : 0;
  const st = useStore.getState();
  const opt = (k: string) => getParam(k)?.options ?? [];
  const cur = (k: string) => String(values[k] ?? getParam(k)?.default ?? '');
  // 信息密度：存的可能是 'auto'（跟随），那时从解析出的值起步（审查修复 18：原来 Number('auto') = NaN，显示「密NaN」还会写进 NaN）
  const raw = Number(values['cnt.density']);
  const own = values['cnt.density'] !== undefined && values['cnt.density'] !== 'auto' && Number.isFinite(raw);
  const resolved = r.num('cnt.density', 2);
  const density = own ? raw : Number.isFinite(resolved) ? resolved : 2;
  const setDensity = (v: number) => { if (Number.isFinite(v)) st.set('cnt.density', Math.max(0, Math.min(4, Math.round(v)))); };
  const behind = cur('rel.behind') || 'auto';
  const blur = values['vis.blur'];
  const pick = (k: string, name: string) => (
    <Pop label={`${name}▾`} className="qb-btn" title={`${name}：${opt(k).find((o) => o.value === cur(k))?.label ?? '跟随'}`}>
      {(close) => (
        <div className="qb-forms">
          {opt(k).map((o) => <MenuItem key={o.value} on={cur(k) === o.value} onClick={() => { st.set(k, o.value); close(); }}>{o.label}</MenuItem>)}
        </div>
      )}
    </Pop>
  );
  return (
    <div className="quick-bar screen-bar" onPointerDown={(e) => e.stopPropagation()}>
      <span className="qb-title">▣ {label}</span>
      {pick('uip.pattern', '版式')}
      {pick('uip.container', '容器')}
      <span className="qb-size" title={`信息密度：${own ? density : `跟随（${density}）`}`}>
        <span className="qb-lab">密度</span>
        <button className="qb-btn" disabled={density <= 0} onClick={() => setDensity(density - 1)} aria-label="更稀">−</button>
        <span className="qb-val">{own ? density : '跟随'}</span>
        <button className="qb-btn" disabled={density >= 4} onClick={() => setDensity(density + 1)} aria-label="更密">+</button>
      </span>
      <button className="qb-btn" title={`背后画面：${BEHIND.find((b) => b[0] === behind)?.[1] ?? behind}（点一下换下一种）`} onClick={() => st.set('rel.behind', BEHIND[(BEHIND.findIndex((b) => b[0] === behind) + 1) % BEHIND.length][0])}>背景·{BEHIND.find((b) => b[0] === behind)?.[1] ?? '跟随'}</button>
      <button className={`qb-btn ${blur !== undefined && blur !== 'auto' ? 'on' : ''}`} title="背景虚化（毛玻璃）" onClick={() => (blur === undefined || blur === 'auto' ? st.set('vis.blur', 8) : st.patch({}, ['vis.blur'], '背景虚化：跟随'))}>虚化</button>
      {tpl && partChanges > 0 && <button className="qb-btn" title={`这一屏的部件改动（${partChanges} 项）回到原样`} onClick={() => actions.resetScreenParts(tpl)}>↺ 这一屏</button>}
      {onClose && <button className="qb-btn qb-close" onClick={onClose} title={closeTitle} aria-label={closeTitle}>×</button>}
    </div>
  );
}

/*
 * 选中部件时的「只在这一屏」条（收尾 1，接上 D 的 X#8 解析链）：「整个界面」条下面第二行，
 * 部件种类自己的一项（按钮面 / 页签选中 / 列表行底 / 格子角标；面板类给立体与描边线型）+ 转角，
 * 写 <参数>@tpl.<这一屏>（resolve.ts 在这一屏当手动值，别的界面不受影响）。写入走 A 的 applyWrites、「跟随」走 resetKeys：一步撤销、算 UI 改动；
 * 写了以后胶片这一屏的 ↺ 与上面条里的「↺ 这一屏」自己出现。
 */
const PART_KNOBS: Record<string, string[]> = {
  button: ['cmp.buttonFace', 'vis.corner'], key: ['cmp.buttonFace', 'vis.corner'],
  tab: ['cmp.tabIndicator', 'vis.corner'], nav2: ['cmp.tabIndicator', 'vis.corner'],
  listRow: ['cmp.listRowBox', 'vis.corner'],
  slot: ['cmp.slotBadge', 'vis.corner'], slotGroup: ['cmp.slotBadge', 'vis.corner'],
};
const PANEL_KNOBS = ['vis.depth', 'vis.stroke', 'vis.corner'];
const KNOB_NAME: Record<string, string> = {
  'cmp.buttonFace': '按钮面', 'cmp.tabIndicator': '选中', 'cmp.listRowBox': '行底', 'cmp.slotBadge': '角标', 'vis.corner': '转角', 'vis.depth': '立体', 'vis.stroke': '描边',
};
/** 选项名在条上只留前 4 个字（全名在菜单里） */
const short = (s: string) => ([...s].length > 4 ? `${[...s].slice(0, 4).join('')}…` : s);

export function PartBar({ tpl, part, name, screenName }: { tpl: string; part: string; name: string; screenName: string }) {
  const values = useStore((s) => s.values);
  const ids = (PART_KNOBS[part] ?? PANEL_KNOBS).filter((p) => (getParam(p)?.options?.length ?? 0) > 1);
  if (!ids.length) return null;
  return (
    <div className="quick-bar screen-bar part-bar" onPointerDown={(e) => e.stopPropagation()}>
      <span className="qb-title" title={`下面几项只改「${screenName}」这一屏，别的界面不变`}>{name} · 只在{screenName}</span>
      {ids.map((p) => {
        const def = getParam(p)!;
        const k = `${p}@${tpl}`, raw = values[k];
        const cur = raw === undefined || raw === 'auto' ? undefined : String(raw);
        const opts = (def.options ?? []).filter((o) => o.value !== 'auto');
        const curName = cur === undefined ? '跟随' : opts.find((o) => o.value === cur)?.label ?? cur;
        return (
          <Pop key={p} label={`${KNOB_NAME[p] ?? def.label}·${short(curName)}▾`} className={`qb-btn ${cur !== undefined ? 'on' : ''}`} title={`${def.label}：${curName}（只在${screenName}）`}>
            {(close) => (
              <div className="qb-forms">
                <MenuItem on={cur === undefined} onClick={() => { if (raw !== undefined) actions.resetKeys([k], `${screenName} · ${def.label}：跟随`); close(); }}>跟随</MenuItem>
                {opts.map((o) => (
                  <MenuItem key={o.value} on={cur === o.value} onClick={() => { if (cur !== o.value) actions.applyWrites({ [k]: o.value }, `${screenName} · ${def.label}：${o.label}`); close(); }}>{o.label}</MenuItem>
                ))}
              </div>
            )}
          </Pop>
        );
      })}
    </div>
  );
}
