import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_SCENES, SCENE_GROUPS, sceneName } from '../../content/gameScenes';
import { RECIPES } from '../../content/recipes';
import { SCENES } from '../../content/sceneCatalog';
import { STYLES } from '../../content/styles.data';
import { allParams } from '../../dims/registry';
import type { ParamDef } from '../../dims/types';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { HUD_STYLE_DEF, parseElementKey, parseOverrideKey } from '../../hud/sys/register';
import { resolveUi } from '../../hud/sys/resolve';
import { ELEMENT_IDS, SPEC_GROUPS } from '../../hud/sys/spec';
import { applyEnv, applyStyle, focusParam } from '../../state/actions';
import { useStore } from '../../state/store';
import { pickRecipe } from '../left/galleryActions';
import { pickGameScene } from '../scene/sceneActions';
import { elementName, toggleElementPatch } from './elements';
import { groupOfDim } from './rightGroups';
import { setMode, useShell } from './shell';

/*
 * ⌘K 搜索（轨道 B，§7「广度不丢」）：按中文名搜 配方 · 风格图谱 · 场景 · 名作 · 环境 · 皮肤 · 元素 · 全部参数（857 个），回车 / 点击就跳过去：
 *   配方 / 风格 → 套用（配方走图库同一个 pickRecipe：「保留我的改动」、Alt 一样生效）；
 *   场景 / 名作 → D 的场景卡同一个 pickGameScene（24 个基础场景 + 名作，整合 X#9：原来把 42 个环境当「场景」列，选了只换环境）；
 *   环境 → 只换环境（A 的 applyEnv，与场景弹窗的「换环境」一样；§1.2：环境只叫「环境」，测试台只在开发者模式）；皮肤 → 换皮肤（切到 UI 模式）；
 *   元素 → 切到 UI 模式并选中（不在屏上时加进来）；参数 → 右栏跳到那一行；「游戏条件」（game.*，右栏没有这一组）→ 打开顶栏的场景弹窗（审查修复 13）。
 * 结果的小字写「层 · 组」（画面 · 质感、UI · 外观、元素名），参数 id 只在开发者模式显示（审查修复 25：§1.1 参数 id 归开发者模式）。
 */

interface Item { kind: string; label: string; sub?: string; id?: string; key: string; run: () => void; devOnly?: boolean }

/** 测试用的环境（对象测试台）：只在开发者模式里搜得到（与 D 的「换环境」同一条） */
const TEST_ENVS: ReadonlySet<string> = new Set(['bench']);
const GROUP_LABEL = new Map(SCENE_GROUPS.map((g) => [g.id, g.label]));

const UI_GROUP = new Map(SPEC_GROUPS.map((g) => [g.id, g.label]));
const UI_TAB: Record<string, string> = { start: '起点', look: '外观', content: '内容', elements: '元素', components: '组件', motion: '动效', world: '世界', player: '玩家', tools: '工具', ops: '运营' };

/** 参数结果的小字：层 · 组（元素参数写元素名） */
function paramWhere(p: ParamDef): string {
  if (p.dim === 'game') return '场景 · 游戏条件';
  if (!p.ui) return `画面 · ${groupOfDim(p.dim)?.label ?? '其他'}`;
  const el = parseElementKey(p.id)?.element ?? parseOverrideKey(p.id)?.target;
  if (el?.startsWith('el.')) return `UI · ${elementName(el)}`;
  return `UI · ${(UI_GROUP.get(p.ui.group) ?? UI_TAB[p.ui.tab] ?? p.ui.tab).split(/[：:]/)[0]}`;
}

function buildIndex(): Item[] {
  const st = () => useStore.getState();
  const items: Item[] = [];
  for (const r of RECIPES) items.push({ kind: '配方', label: r.name, sub: r.family, key: `r:${r.id}`, run: () => { setMode('art'); pickRecipe(r, { toggle: false }); } });
  for (const s of STYLES) items.push({ kind: '风格', label: s.name, key: `s:${s.id}`, run: () => { setMode('art'); applyStyle(s); } });
  for (const sc of GAME_SCENES) {
    const rep = sc.group === '名作';
    items.push({ kind: rep ? '名作' : '场景', label: rep ? sc.name : sceneName(sc, hasSceneBuilder), sub: rep ? undefined : GROUP_LABEL.get(sc.group), key: `g:${sc.id}`, run: () => { void pickGameScene(sc); } });
  }
  for (const s of SCENES) if (hasSceneBuilder(s.id)) items.push({ kind: '环境', label: s.name, sub: s.group, key: `c:${s.id}`, run: () => { applyEnv(s.id, s.name); }, devOnly: TEST_ENVS.has(s.id) });
  for (const o of HUD_STYLE_DEF.options ?? []) if (o.value !== 'none') items.push({ kind: '皮肤', label: o.label, key: `k:${o.value}`, run: () => { setMode('ui'); st().set(HUD_STYLE_DEF.id, o.value); } });
  for (const id of ELEMENT_IDS) items.push({
    kind: '元素', label: elementName(id, true), key: `e:${id}`,
    run: () => {
      setMode('ui');
      const r = resolveUi(st().values);
      if (!r.elements().includes(id)) st().patch(toggleElementPatch(r, id, true), [], `加入 ${elementName(id)}`);
      st().setHudSel(id);
    },
  });
  for (const p of allParams()) {
    if (p.id === HUD_STYLE_DEF.id) continue;
    items.push({
      kind: '参数', label: p.label, sub: paramWhere(p), id: p.id, key: `p:${p.id}`,
      run: () => {
        if (p.ui) st().jumpUiParam(p.id);
        else if (p.dim === 'game') useShell.getState().set({ scenePopOpen: true });
        else { setMode('art'); focusParam(p.id); }
      },
    });
  }
  return items;
}

let INDEX: Item[] | null = null;

export function CommandPalette() {
  const open = useShell((s) => s.paletteOpen);
  const dev = useShell((s) => s.dev);
  const set = useShell((s) => s.set);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  const results = useMemo(() => {
    if (!open) return [];
    INDEX ??= buildIndex();
    const s = q.trim().toLowerCase();
    if (!s) return INDEX.filter((x) => x.kind === '配方').slice(0, 12);
    const scored: [number, Item][] = [];
    for (const x of INDEX) {
      if (x.devOnly && !dev) continue;
      const l = x.label.toLowerCase();
      const at = l.indexOf(s);
      const sub = x.sub?.toLowerCase().includes(s) || (dev && x.id?.toLowerCase().includes(s));
      if (at < 0 && !sub) continue;
      // 环境排在同样匹配的场景后面（搜「城堡」先出「魂类·城堡」，再出「城堡与城下町」这个环境）
      scored.push([(at === 0 ? 0 : at > 0 ? 1 : 2) * 10 + Math.min(9, l.length / 4) + (x.kind === '环境' ? 10 : 0), x]);
    }
    return scored.sort((a, b) => a[0] - b[0]).slice(0, 40).map((x) => x[1]);
  }, [q, open, dev]);
  if (!open) return null;
  const close = () => set({ paletteOpen: false });
  const go = (x: Item | undefined) => { if (!x) return; close(); x.run(); };
  return (
    <div className="dialog-mask palette-mask" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette" role="dialog" aria-label="搜索">
        <input
          ref={input}
          className="palette-input"
          placeholder="搜配方、风格、场景、名作、皮肤、元素、参数…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(results.length - 1, x + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
            else if (e.key === 'Enter') go(results[i]);
          }}
        />
        <div className="palette-list">
          {results.map((x, j) => (
            <button key={x.key} className={`palette-item ${j === i ? 'on' : ''}`} onMouseEnter={() => setI(j)} onClick={() => go(x)}>
              <span className="pi-kind">{x.kind}</span>
              <span className="pi-label">{x.label}</span>
              {x.sub && <span className="pi-sub">{x.sub}</span>}
              {dev && x.id && <span className="pi-id">{x.id}</span>}
            </button>
          ))}
          {!results.length && <p className="hint">没有找到</p>}
        </div>
      </div>
    </div>
  );
}
