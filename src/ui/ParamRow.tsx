import { IMAGE_SCENE_INERT } from '../content/sceneCatalog';
import { activeState, labelOf, optionOf } from '../dims/registry';
import type { ParamDef, Val } from '../dims/types';
import { resetKey } from '../state/actions';
import { isModifiedKey, recipeRigValue, resetHint, RIG_KEYS } from '../state/layers';
import { useStore } from '../state/store';
import { imageInert } from './stage/rightGroups';
import { useShell } from './stage/shell';
import './state/state.css';

/*
 * 一个画面参数（docs/workbench-redesign.md §7「参数行」）：标签 | 控件 | 值 | •↺。
 *   改过的行（与基线 = 场景 ⊕ 配方 不同）出现 •↺，悬停写明「回到 画面·水彩：0.6」；双击标签也回到基线。一次 = 一步撤销。
 *   两端效果、选项说明、不生效的原因都放进悬停提示（T1）；ⓘ 说明弹窗由右栏（B）在悬停时给。
 *   「局部 / 待实现」这类实现进度的字样（◐、（局部）、（待实现））只在开发者模式显示（§1.1，审查修复 25）：平时只留禁用状态，原因在悬停提示里。
 *   场景锁定镜头（整合修复 F→A，§5.2）：不生效的原因写了「实际是 X」时（dims/camera.ts），控件把 X 当成选中值显示，加「锁定」小标；
 *     配方给这个镜头键的值和现在不同时，加一枚「配方 X」芯片——镜头键还能生效（3D 场景）时点了 = 套用（记成场景改动，可 ↺），
 *     2D 场景锁死了镜头时只是提示。
 */
export function ParamRow({ p }: { p: ParamDef }) {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const set = useStore((s) => s.set);
  const focus = useStore((s) => s.focus);
  const setFocus = useStore((s) => s.setFocus);
  const dev = useShell((s) => s.dev);
  const stored = values[p.id] ?? p.default;
  // 立绘场景里看不出变化的行（B 的 rightGroups.imageInert 是唯一出处，右栏据它收进「当前不生效」）：这一行也灰掉、悬停写原因
  const act: true | string = imageInert(p.id, values) ? IMAGE_SCENE_INERT.reason : activeState(p, values);
  const inactive = act !== true;
  const mod = isModifiedKey(p.id, values, origin);
  // 锁定的镜头：显示实际用的值（「这个场景锁定了镜头：实际是 侧视 0°」→ 选中「侧视 0°」）
  const actual = inactive ? /实际是\s*(.+)$/.exec(act)?.[1]?.trim() : undefined;
  const actualOpt = actual && p.kind === 'choice' ? p.options?.find((o) => o.label === actual) : undefined;
  const actualNum = actual && (p.kind === 'range' || p.kind === 'int') ? Number.parseFloat(actual) : Number.NaN;
  const v: Val = actualOpt ? actualOpt.value : Number.isFinite(actualNum) ? actualNum : stored;
  const sug = recipeRigValue(p.id, values, origin);
  const change = (x: Val) => {
    set(p.id, x);
    if (focus !== p.id) setFocus(p.id);
  };
  const ends = p.explain.ends && (p.kind === 'range' || p.kind === 'int') ? `← ${p.explain.ends[0]}　${p.explain.ends[1]} →` : '';
  const optDesc = p.kind === 'choice' ? optionOf(p, v)?.desc : undefined;
  // 悬停提示：白话 + 两端 / 当前选项 + 不生效原因
  // 实现进度（局部 / 待实现）只在开发者模式写（整合修复 U#18）
  const tip = [p.explain.plain, ends, optDesc, inactive ? `不生效：${act}` : '', !dev ? '' : p.status === 'partial' ? '局部实现' : p.status === 'todo' ? '待实现' : ''].filter(Boolean).join('\n');
  let control: React.ReactNode = null;
  if (p.kind === 'range' || p.kind === 'int') {
    control = (
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.step ?? (p.kind === 'int' ? 1 : 0.01)}
        value={Number(v)}
        onChange={(e) => change(p.kind === 'int' ? Math.round(Number(e.target.value)) : Number(e.target.value))}
        aria-label={p.label}
        title={ends || undefined}
      />
    );
  } else if (p.kind === 'choice') {
    const opts = p.options ?? [];
    if (opts.length <= 6) {
      control = (
        <div className="seg" role="radiogroup" aria-label={p.label}>
          {opts.map((o) => {
            const dis = o.disabledWhen?.(values) || false;
            return (
              <button
                key={o.value}
                className={o.value === v ? 'on' : ''}
                disabled={!!dis}
                title={[dis, o.desc, dev && o.status === 'partial' ? '局部实现' : ''].filter(Boolean).join('\n')}
                onClick={() => change(o.value)}
              >
                {o.label}
                {dev && o.status === 'partial' ? ' ◐' : ''}
              </button>
            );
          })}
        </div>
      );
    } else {
      control = (
        <select value={String(v)} onChange={(e) => change(e.target.value)} aria-label={p.label} title={optDesc}>
          {opts.map((o) => {
            const dis = o.disabledWhen?.(values) || false;
            return (
              <option key={o.value} value={o.value} disabled={!!dis} title={dis || o.desc}>
                {o.label}{dev && o.status === 'partial' ? '（局部）' : ''}{dev && dis ? '（待实现）' : ''}
              </option>
            );
          })}
        </select>
      );
    }
  } else if (p.kind === 'toggle') {
    control = <button className={`switch ${v ? 'on' : ''}`} onClick={() => change(!v)} aria-pressed={!!v} aria-label={p.label} />;
  } else if (p.kind === 'color') {
    control = <input type="color" value={String(v)} onChange={(e) => change(e.target.value)} aria-label={p.label} style={{ width: 44, height: 22, border: 0, padding: 0, background: 'none' }} />;
  }
  const valueText = actual && (p.kind === 'range' || p.kind === 'int') ? actual
    : p.kind === 'range' || p.kind === 'int' ? `${Number(v).toFixed(p.kind === 'int' ? 0 : (p.step ?? 0.01) < 0.1 ? 2 : 1)}${p.unit ?? ''}` : '';
  const sugText = sug !== undefined ? labelOf(p.id, { [p.id]: sug }) : '';
  return (
    <div
      className={`row ${focus === p.id ? 'focus' : ''} ${inactive ? 'inactive' : ''} ${mod ? 'is-mod' : ''}`}
      onMouseEnter={() => focus === null && setFocus(p.id)}
      onClick={() => setFocus(p.id)}
      id={`param-${p.id}`}
    >
      <div className="row-top">
        <span className="row-label" title={mod ? `${tip}\n（双击回到原样）` : tip} onDoubleClick={() => { if (mod) resetKey(p.id); }}>{p.label}</span>
        {dev && p.status === 'partial' && <span className="status partial" title="局部实现">◐</span>}
        {p.kind === 'toggle' ? control : <span className="row-value">{valueText}</span>}
        {actual && <span className="row-lock" title={act === true ? undefined : act}>锁定</span>}
        {sug !== undefined && (inactive
          ? <span className="row-sug" title="配方建议的镜头（这个场景锁定了镜头，这里不生效）">配方 {sugText}</span>
          : <button className="row-sug" title={RIG_KEYS.has(p.id) ? `配方建议 ${sugText}：点一下套用（记成场景改动，可以 ↺）` : `配方写的是 ${sugText}，这个场景用自己的光照：点一下换成配方的（记成画面改动，可以 ↺）`} onClick={(e) => { e.stopPropagation(); change(sug); }}>配方 {sugText}</button>)}
        {mod && (
          <button className="row-reset" title={resetHint(p.id, origin, values)} aria-label={`${p.label}：回到原样`} onClick={(e) => { e.stopPropagation(); resetKey(p.id); }}>•↺</button>
        )}
      </div>
      {p.kind !== 'toggle' && control}
    </div>
  );
}
