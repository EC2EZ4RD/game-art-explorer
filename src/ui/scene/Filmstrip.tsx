import { useMemo } from 'react';
import { gameScene, screensOf, type ScreenEntry } from '../../content/gameScenes';
import { resolveUi } from '../../hud/sys/resolve';
import { resetScreenParts } from '../../state/actions';
import { isModifiedKey } from '../../state/layers';
import { useStore } from '../../state/store';
import { MenuHead } from '../stage/Pop';
import { FloatPop } from './FloatPop';
import { GENERIC_SCREENS, pickScreen, pickTemplate } from './sceneActions';
import { templateGroups } from './sceneData';
import { ScreenIcon } from './ScreenIcon';
import './scene.css';

/*
 * 界面胶片（轨道 D，docs/workbench-redesign.md §2 F2 第 3 步、§5.2）：当前场景的 6–9 个界面（局内 · Boss · 背包 · 地图 · 对话……），
 * 点一张 = 只换界面（皮肤、画风不动，一步撤销）；▶ 开头的是流程演示（只在「我的游戏」是免费或手机时出现）。
 * 名作场景列它复刻过的那几屏。行尾「+更多」= 全部 63 个界面模板（局外 / 局内弹出 / 系统 / 运营）。
 * 当前界面的部件被改过时，卡片右上角出 ↺（界面 ↺：这一屏的 cmp.*@tpl 覆盖回到原样）。
 * oneRow：画框下方只留一行时的紧凑版（卡片变成一行高的小条）。
 */

export function Filmstrip({ oneRow }: { oneRow?: boolean }) {
  const origin = useStore((s) => s.origin);
  const values = useStore((s) => s.values);
  const sc = gameScene(origin.scene);
  const profile = { business: values['uip.business'], platform: values['uip.platform'] };
  const list: ScreenEntry[] = sc ? screensOf(sc, profile) : GENERIC_SCREENS;
  // 当前界面模板：局内（auto）但画的是模板（叙事类的对话屏这类派生出来的）时按解析结果认，和画框上部件的覆盖目标同一个（收尾 1）
  const curTpl = useMemo(() => { const v = String(values['uip.screen'] ?? 'auto'); return v.startsWith('tpl.') ? v : resolveUi(values).presets.screen?.id ?? v; }, [values]);
  // 来源记着当前界面（没选场景时 A 的 applyScreen 也记）；还没点过界面 = 第一个（局内）
  const isOn = (s: ScreenEntry) => (origin.screen ? origin.screen === s.id : s === list[0]);
  // 当前这一屏改过的部件覆盖（cmp.*@tpl.<id>）
  const partKeys = useMemo(() => (curTpl.startsWith('tpl.') ? Object.keys(values).filter((k) => k.endsWith(`@${curTpl}`) && isModifiedKey(k, values, origin)) : []), [values, origin, curTpl]);
  return (
    <div className={`fs-row ${oneRow ? 'one' : ''}`}>
      <span className="deck-row-label">界面</span>
      <div className="fs-strip" role="listbox" aria-label="界面">
        {list.map((s) => {
          const on = isOn(s);
          return (
            <button key={s.id} className={`fs-card ${on ? 'on' : ''} ${s.kind === 'flow' ? 'flow' : ''}`} role="option" aria-selected={on} onClick={() => { void pickScreen(sc, s); }} title={s.kind === 'flow' ? '播一遍这段流程' : undefined}>
              <ScreenIcon screen={s} />
              <span className="fs-label">{s.label}</span>
              {on && partKeys.length > 0 && (
                <span className="fs-reset" role="button" title={`这一屏的部件回到原样（${partKeys.length} 项）`} onClick={(e) => { e.stopPropagation(); resetScreenParts(curTpl); }}>↺</span>
              )}
            </button>
          );
        })}
      </div>
      <FloatPop label="+更多" align="right" width={560} title="全部界面模板">
        {(close) => (
          <div className="fs-more-pop">
            {templateGroups().map((g) => (
              <div key={g.label} className="fs-more-group">
                <MenuHead>{g.label}</MenuHead>
                <div className="fs-more-chips">
                  {g.ids.map((t) => <button key={t.id} className={`fs-more-chip ${values['uip.screen'] === t.id ? 'on' : ''}`} onClick={() => { pickTemplate(t.id); close(); }}>{t.label}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </FloatPop>
    </div>
  );
}
