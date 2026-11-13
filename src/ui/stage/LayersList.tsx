import { useMemo } from 'react';
import type { Resolved } from '../../hud/sys/resolve';
import { ELEMENT_IDS } from '../../hud/sys/spec';
import { useStore } from '../../state/store';
import { elementModified, elementName, hiddenElements, isSampleHud, makeHudEditable, toggleElementPatch } from './elements';
import { useHudInfo } from './hudInfo';
import { MenuItem, Pop } from './Pop';

/*
 * 本屏元素列表（轨道 B，§6）：每项 👁 开关 + 名字 + •（改过）；点名字 = 选中（画框上同步出手柄）。
 * 「已隐藏 (N)」：基线（场景 / 名作套用时的元素清单）里有、被藏掉的元素，一键恢复；「+ 元素」：54 种元素里还没上屏的加进来。
 * • 和「已隐藏」都按 A 的来源基线算（审查修复 5）：名作故意不放的元素不算隐藏，基线里写着的位置不算改过。
 * 示例 HUD（没选品类布局时的 M1 样本）：元素不能单独改，列表灰掉，给一行说明和「改成可拖动的 UI」（审查修复 16）。
 * 整屏界面（背包、菜单这类模板屏，或局内 auto 而布局画的是整屏模板：HUD 画出了东西但不按元素排版，B2 审查修复 ⑪）：
 *   元素清单里的元素这一屏根本没画，列出来、点了出检查器只会让人以为「显示了却看不见」——不列元素、「+ 元素」灰掉，只写一行「这一屏是整屏界面」；
 *   整屏的版式 / 容器 / 密度在画框左上角「▣ 整个界面」，部件（面板、按钮）在画框上点选。
 */
export function LayersList({ r }: { r: Resolved }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const sel = useStore((s) => s.hudSel);
  const st = useStore.getState();
  const active = r.elements();
  const hidden = useMemo(() => hiddenElements(values, origin, r), [values, origin, r]);
  const sample = useMemo(() => isSampleHud(r), [r]);
  const hi = useHudInfo();
  // UI A/B 把分界拖到只看 A 时当前一侧没画（usesElements 为假），不等于这一屏是整屏界面
  const abOn = useStore((s) => s.hudABOn);
  const whole = !sample && !abOn && hi.drawn && !hi.usesElements;
  const off = sample || whole;
  const addable = ELEMENT_IDS.filter((x) => !active.includes(x));
  return (
    <div className={`layers ${off ? 'is-sample' : ''}`}>
      <div className="layers-head">
        <b>本屏元素</b>
        <span className="tb-spacer" />
        <Pop label="+ 元素" className="btn ghost small" align="right" title={sample ? '先把示例 HUD 改成可拖动的 UI' : whole ? '整屏界面上不画元素：回到「局内」再加' : '加一个信息元素到这一屏'} disabled={off}>
          {(close) => (
            <div className="layers-add">
              {addable.map((id) => <MenuItem key={id} title={elementName(id, true)} onClick={() => { st.patch(toggleElementPatch(r, id, true), [], `加入 ${elementName(id)}`); st.setHudSel(id); close(); }}>{elementName(id, true)}</MenuItem>)}
            </div>
          )}
        </Pop>
      </div>
      {sample && (
        <div className="layers-sample">
          <span>示例 HUD，不能单独改</span>
          <button className="btn small primary" onClick={() => makeHudEditable(r)} title="换成这个品类的布局：元素就能在画框上直接点选、拖动（一步撤销）">改成可拖动的 UI</button>
        </div>
      )}
      {whole && <div className="layers-sample" title="背包、菜单这类整屏界面不按元素排版：点画面上的面板、按钮单独选中，左上角「▣ 整个界面」整屏调版式、容器、密度"><span>这一屏是整屏界面</span></div>}
      {!whole && !active.length && <p className="hint">这一屏没有元素</p>}
      {!whole && active.map((id) => (
        <div key={id} className={`layer-row ${sel === id ? 'on' : ''} ${sample ? 'off' : ''}`} onClick={() => { if (!sample) st.setHudSel(id); }} title={elementName(id, true)}>
          <button className="eye" disabled={sample} onClick={(e) => { e.stopPropagation(); st.patch(toggleElementPatch(r, id, false), [], `隐藏 ${elementName(id)}`); if (sel === id) st.setHudSel(null); }} title="隐藏">👁</button>
          <span className="layer-name">{elementName(id)}</span>
          {!sample && elementModified(values, origin, id) && <span className="dot-mod" title="改过">•</span>}
        </div>
      ))}
      {!whole && hidden.length > 0 && (
        <details className="layers-hidden">
          <summary>已隐藏（{hidden.length}）</summary>
          {hidden.map((id) => (
            <div key={id} className="layer-row off">
              <button className="eye" onClick={() => st.patch(toggleElementPatch(r, id, true), [], `显示 ${elementName(id)}`)} title="恢复显示">◌</button>
              <span className="layer-name">{elementName(id)}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
