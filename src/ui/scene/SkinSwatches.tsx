import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { str } from '../../dims/registry';
import { scenePaletteOf } from '../../hud/HudSystem';
import { PRESET } from '../../hud/sys/spec';
import { useStore } from '../../state/store';
import { skinShort } from '../deck/deckText';
import { MenuHead } from '../stage/Pop';
import { FloatPop } from './FloatPop';
import { useShell } from '../stage/shell';
import { artChoices, choiceKey, choiceLabel, choiceTip, isChoiceOn, moneyBundles, pickChoice, SKIN_FAMILIES, WORD_GROUPS, wordPresets, zhPresetLabel, type SkinChoice } from './skinChoices';
import { PREVIEW_W } from './swatchRenderer';
import { useSwatch } from './useSwatch';
import './scene.css';

/*
 * 皮肤色板行（轨道 D，docs/workbench-redesign.md §0.3 §5.3）：
 *   默认 → 配套当前画面（≤3）→ 7 个家族的 38 个皮肤；行尾「家族▾」跳到某一族，「风格词▾ 节日▾ 成套▾」是收起的三组。
 * 每个色板是当前界面的一小块（生命 + 快捷栏一带），用离屏 HUD 按 1:1 画在当前画面上（swatchRenderer）；进入可见区域才画。
 * 悬停放大成整帧。点一下 = 换皮肤（只清皮肤负责的手动样式，元素位置保留；一步撤销）；再点已选中的 = 回到场景默认；按住 Alt 点 = 保留我的改动。
 * 另导出单个色板 <SkinSwatch skin="skin.glass" />（配方卡的「配套 UI」可以直接用）。
 */

const skinIdOf = (c: SkinChoice): string | null => (c.kind === 'skin' || c.kind === 'art' ? c.id : null);

function Swatch({ choice, active = true }: { choice: SkinChoice; active?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const { img: res, state } = useSwatch(choice, ref, active);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const on = useMemo(() => isChoiceOn(choice, values, origin), [choice, values, origin]);
  const label = choiceLabel(choice, skinShort);
  return (
    <button
      ref={ref}
      className={`sw ${on ? 'on' : ''}`}
      title={choiceTip(choice)}
      onClick={(e) => { pickChoice(choice, { keepMine: e.altKey, scene: scenePaletteOf(useStore.getState().values) }); }}
      onMouseEnter={(e) => setHover(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setHover(null)}
      aria-pressed={on}
    >
      {/* 还没画好：同一屏的旧图变暗 + 扫光；换了场景 / 界面是中性骨架（整合修复 U#4） */}
      <span className={`sw-img ${state !== 'ok' ? `sw-${state}` : ''}`} aria-busy={state !== 'ok'}>
        {res && <img src={res.crop} alt="" />}
      </span>
      <span className="sw-label">{label}</span>
      {hover && res && state === 'ok' && createPortal(
        <div className="sw-preview" style={{ left: Math.max(8, Math.min(window.innerWidth - PREVIEW_W - 8, hover.left + hover.width / 2 - PREVIEW_W / 2)), bottom: window.innerHeight - hover.top + 8 }}>
          <img src={res.full} alt="" />
          <div>{choiceTip(choice).split('\n')[0]}</div>
        </div>,
        document.body,
      )}
    </button>
  );
}

/** 单个皮肤的色板（给别的轨道用：配方卡「配套 UI」） */
export function SkinSwatch({ skin }: { skin: string }) {
  return <Swatch choice={{ kind: 'skin', id: skin }} />;
}

export function SkinSwatches() {
  const origin = useStore((s) => s.origin);
  const values = useStore((s) => s.values);
  const mode = useStore((s) => s.activeDim === 'hud');
  const keepMine = useShell((s) => s.keepMine);
  const dev = useShell((s) => s.dev);
  const strip = useRef<HTMLDivElement>(null);
  const art = useMemo(() => artChoices(origin), [origin]);
  const artIds = new Set(art.map((c) => skinIdOf(c)));
  const jump = (id: string) => {
    const el = strip.current?.querySelector(`[data-fam="${id}"]`) as HTMLElement | null;
    if (el && strip.current) strip.current.scrollLeft = el.offsetLeft - strip.current.offsetLeft - 4;
  };
  // 换场景 / 换界面后，把选中的色板滚进可见区域
  useEffect(() => {
    const el = strip.current?.querySelector('.sw.on') as HTMLElement | null;
    if (el && strip.current) {
      const s = strip.current;
      if (el.offsetLeft < s.scrollLeft || el.offsetLeft + el.offsetWidth > s.scrollLeft + s.clientWidth) s.scrollLeft = el.offsetLeft - s.offsetLeft - 40;
    }
  }, [origin.scene, origin.skin]);
  const curKw = str(values, 'uip.keyword'), curTheme = str(values, 'uip.theme');
  return (
    <div className="sw-row">
      <span className="deck-row-label">皮肤</span>
      <div className="deck-strip sw-strip" ref={strip}>
        <Swatch choice={{ kind: 'default' }} active={mode} />
        {art.length > 0 && <div className="sw-sep" data-fam="art" title="配套当前画面"><span>配套</span></div>}
        {art.map((c) => <Swatch key={choiceKey(c)} choice={c} active={mode} />)}
        {SKIN_FAMILIES.map((f) => (
          // 「Godot 默认」只在开发者模式出现（§1.1：Godot 相关的都藏进开发者模式，审查修复 25）
          <FamilyGroup key={f.id} id={f.id} label={f.label} skins={f.skins.filter((s) => !artIds.has(s) && (dev || s !== 'skin.godotDefault'))} active={mode} />
        ))}
      </div>
      <div className="sw-tools">
        <FloatPop label="家族▾" align="right" title="跳到某一族皮肤">
          {(close) => (
            <>
              {art.length > 0 && <button className="menu-item" onClick={() => { jump('art'); close(); }}><span className="mi-label">配套当前画面</span></button>}
              {SKIN_FAMILIES.map((f) => <button key={f.id} className="menu-item" onClick={() => { jump(f.id); close(); }}><span className="mi-label">{f.label}</span><span className="mi-hint">{f.skins.length}</span></button>)}
            </>
          )}
        </FloatPop>
        <FloatPop label="风格词▾" align="right" width={460} title="风格词 / 节日 / 成套">
          {() => (
            <div className="sw-word-pop">
              {WORD_GROUPS.map((g) => (
                <WordGroup key={g.id} kind={g.id} label={g.label} cur={g.id === 'keyword' ? curKw : g.id === 'theme' ? curTheme : ''} keepMine={keepMine} />
              ))}
              <WordGroup kind="money" label="成套 · 商业化" cur="" keepMine={keepMine} />
            </div>
          )}
        </FloatPop>
      </div>
    </div>
  );
}

function FamilyGroup({ id, label, skins, active }: { id: string; label: string; skins: string[]; active: boolean }) {
  if (!skins.length) return null;
  return (
    <>
      <div className="sw-sep" data-fam={id} title={label}><span>{label}</span></div>
      {skins.map((s) => <Swatch key={s} choice={{ kind: 'skin', id: s }} active={active} />)}
    </>
  );
}

/** 风格词 / 节日 / 成套：文字芯片（再点已选中的 = 去掉） */
function WordGroup({ kind, label, cur, keepMine }: { kind: 'keyword' | 'theme' | 'recipe' | 'money'; label: string; cur: string; keepMine: boolean }) {
  useStore((s) => s.origin);
  const list = kind === 'money' ? moneyBundles() : wordPresets(kind);
  if (!list.length) return null;
  // 风格词另有「不用」：把皮肤自带的风格词也关掉（uip.keyword = none；再点 = 回到跟随皮肤）。节日的默认就是「不用」，再点已选的节日即可（审查修复 5）
  const kwOff = kind === 'keyword' && cur === 'none';
  return (
    <>
      <MenuHead>{label}</MenuHead>
      {kind === 'keyword' && (
        <button className={`sw-word ${kwOff ? 'on' : ''}`} title="不用风格词（皮肤自带的也关掉）" onClick={() => useStore.getState().set('uip.keyword', kwOff ? 'auto' : 'none')}>不用</button>
      )}
      {list.map((p) => {
        const c: SkinChoice = { kind: 'preset', id: p.id };
        const on = kind === 'keyword' || kind === 'theme' ? cur === p.id : isChoiceOn(c, useStore.getState().values, useStore.getState().origin);
        return (
          <button key={p.id} className={`sw-word ${on ? 'on' : ''}`} title={p.desc ?? PRESET.get(p.id)?.label} onClick={(e) => pickChoice(c, { keepMine: keepMine || e.altKey, scene: scenePaletteOf(useStore.getState().values) })}>
            {zhPresetLabel(p.label)}
          </button>
        );
      })}
    </>
  );
}
