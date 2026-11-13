import { useEffect, useMemo, useState } from 'react';
import * as actions from '../state/actions';
import { nameOf } from '../state/layers';
import { useStore } from '../state/store';
import { layerCounts as viewCounts } from '../state/view';
import { getEngine } from './engineRef';
import { layerCounts, layerFullNames, layerNames } from './stage/layerInfo';
import { MenuHead, MenuItem, MenuSep, Pop } from './stage/Pop';
import { hudHidden, setMode, useMode, useShell } from './stage/shell';
import { SLOT } from './stage/slots';
import { captureFrame1080 } from './stage/capture';
import { resetCameraNow, useCameraMoved } from './stage/camState';

/*
 * 顶栏（轨道 B，docs/workbench-redesign.md §1.1 L0、§10 顶栏去向表）：
 *   探索台 │ [场景 X▾] [画面 X ·N▾] [UI X ·N▾] │ ↶▾ ↷ 重置▾ │ 对比 ☆ 方向板 │ 📖 ⌘K [导出▾] ⋯
 * 画面 / UI 标签 = 模式切换 + 改动数 + ↺▾ 重置菜单；场景标签 = 场景弹窗（顶上是「回到场景原样 (N)」，下面是 D 的场景图库：我的游戏、
 *   2D 筛选、各组场景、换环境、换个布局）+ 改动数 + ↺（审查修复 10 / 21）。换过环境时标签写「品类·环境」（整合 X#10）。
 *   整合修复（IB · X#16）：弹窗顶上的「2D」一行去掉了——D 的图库里横版组排第一、还有「2D」筛选，T8 照样 2 次点击。
 * 1280 宽不溢出：11 个控件 + ⋯，名字都截短。
 * 重置菜单、历史列表归轨道 A，场景弹窗内容归轨道 D（插槽）。整合修复（IB · X#13）：A / D 上线前的过渡版都删了。
 */

export function TopBar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.history.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const mode = useMode();
  const History = SLOT.HistoryMenu;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); useShell.getState().set({ paletteOpen: true }); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && (k === '1' || k === '2')) { setMode(k === '1' ? 'art' : 'ui'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <header className="topbar">
      <div className="brand" title="游戏美术风格探索台">探索台</div>
      <div className="tb-group layer-tabs">
        <SceneChip />
        <LayerChip layer="art" on={mode === 'art'} />
        <LayerChip layer="ui" on={mode === 'ui'} />
      </div>
      <div className="tb-group">
        <button className="btn ghost icon" onClick={undo} disabled={!canUndo} title="撤销（Ctrl+Z）">↶</button>
        {History && <Pop label="▾" className="btn ghost caret" title="最近的操作（点一步跳过去）">{(close) => <History onClose={close} />}</Pop>}
        <button className="btn ghost icon" onClick={redo} disabled={!canRedo} title="重做（Ctrl+Shift+Z）">↷</button>
        <ResetButton />
      </div>
      <div className="tb-group">
        <CompareButton />
        <button className="btn ghost" onClick={() => useStore.getState().setPanel('favorite')} title="收藏当前实验（自动命名，存缩略图）">☆</button>
        <button className="btn ghost" onClick={() => useStore.getState().setPanel('board')} title="方向板：收藏的缩略图">方向板</button>
      </div>
      <div className="tb-spacer" />
      <div className="tb-group">
        <button className={`btn ghost ${useShell((s) => s.learnOpen) ? 'on' : ''}`} onClick={() => useShell.getState().set({ learnOpen: !useShell.getState().learnOpen })} title="学习：风格研究库、名作案例、UI 原则、UI 风格家族、复刻对照">📖 学习</button>
        <button className="btn ghost" onClick={() => useShell.getState().set({ paletteOpen: true })} title="搜索配方、场景、皮肤、元素和全部参数（Ctrl+K）" aria-label="搜索">🔍</button>
        <ExportButton />
        <MoreMenu />
      </div>
    </header>
  );
}

/* ---------------- 层级标签 ---------------- */

function useLayerInfo() {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  return useMemo(() => {
    const st = { values, origin };
    return { counts: layerCounts(st), names: layerNames(st), full: layerFullNames(st) };
  }, [values, origin]);
}

function LayerChip({ layer, on }: { layer: 'art' | 'ui'; on: boolean }) {
  const { counts, names, full } = useLayerInfo();
  const n = counts[layer];
  const word = layer === 'art' ? '画面' : 'UI';
  const Reset = SLOT.ResetMenu;
  return (
    <div className={`layer-tab ${on ? 'on' : ''}`}>
      <button className="lt-main" onClick={() => setMode(layer)} title={`${word}${full[layer] ? `：${full[layer]}` : ''}（${word}模式，快捷键 ${layer === 'art' ? 1 : 2}）${n ? `；改了 ${n} 项` : ''}`}>
        <span className="lt-word">{word}</span>
        {names[layer] && <b className="lt-name">{names[layer]}</b>}
        {n > 0 && <span className="lt-count">·{n}</span>}
      </button>
      {Reset && (
        <Pop label="↺▾" className="lt-caret" title={`${word}的重置`}>
          {(close) => <Reset layer={layer} onClose={close} />}
        </Pop>
      )}
    </div>
  );
}

/**
 * 场景 ↺ 的悬停（收尾 9）：场景标签的数 = 场景键改动 + 「界面离开了第一个界面」1 项（A 的 tabCounts）；只换了界面时写「回到局内」，
 * 两样都有时写「清 N 项 · 回到局内」（与 A 的重置提示同一个说法；名作的第一屏用它自己的名字）
 */
function sceneResetTip(): string {
  const st = useStore.getState();
  const c = viewCounts(st);
  const home = c.screen ? `回到${st.origin.home ? nameOf(st.origin, st.origin.home.id) || '局内' : '局内'}` : '';
  const keys = c.scene - c.screen;
  if (!keys) return `${home}（一步撤销）`;
  return `回到场景原样（清 ${keys} 项${home ? ` · ${home}` : ''}，一步撤销）`;
}

/** 场景标签：点开是场景弹窗（顶上「回到场景原样 (N)」= A 的重置菜单 layer='scene'），旁边有改动时给 ↺（一下回到场景原样） */
function SceneChip() {
  const { counts, names, full } = useLayerInfo();
  const open = useShell((s) => s.scenePopOpen);
  const setShell = useShell((s) => s.set);
  const Gallery = SLOT.SceneGallery;
  const Reset = SLOT.ResetMenu;
  const camMoved = useCameraMoved();
  const n = counts.scene;
  return (
    <div className="layer-tab scene-tab">
      <Pop
        className="lt-main"
        label={<><span className="lt-word">场景</span><b className="lt-name">{names.scene}</b>{n > 0 && <span className="lt-count">·{n}</span>}<span className="lt-caret-in">▾</span></>}
        title={`场景${full.scene ? `：${full.scene}` : ''}（换场景、我的游戏、换个布局）${n ? `；改了 ${n} 项` : ''}`}
        open={open}
        onOpenChange={(o) => setShell({ scenePopOpen: o })}
      >
        {(close) => (
          <>
            {Reset && <div className="scene-pop-reset"><Reset layer="scene" onClose={close} /></div>}
            {/* 镜头复位只在镜头被转动过时出现（§4.2，B2 审查修复 ⑨） */}
            {camMoved && (
              <div className="scene-pop-reset">
                <MenuItem onClick={() => { resetCameraNow(); close(); }} title="镜头回到场景机位（也可以双击画框空白处；不进撤销）">镜头复位</MenuItem>
              </div>
            )}
            {Gallery && <div className="scene-pop"><Gallery variant="popover" onPicked={close} /></div>}
          </>
        )}
      </Pop>
      {n > 0 && <button className="lt-caret" onClick={() => actions.resetScene()} title={sceneResetTip()}>↺</button>}
    </div>
  );
}

/* ---------------- 撤销 / 重置 ---------------- */

function ResetButton() {
  const Reset = SLOT.ResetMenu;
  if (!Reset) return null;
  return (
    <Pop label="重置▾" className="btn ghost" title="重置画面 / UI / 场景，或全部重新开始">
      {(close) => <Reset layer="all" onClose={close} />}
    </Pop>
  );
}

/* ---------------- 对比 ---------------- */

function CompareButton() {
  const slotA = useStore((s) => s.slotA);
  const compare = useStore((s) => s.compare);
  const pin = async () => {
    const s = useStore.getState();
    const eng = getEngine();
    const aHud = !hudHidden(useShell.getState(), s.activeDim);
    const img = eng ? await eng.capture() : undefined;
    s.saveA(img);
    s.setCompare(true);
    const n = layerNames(s);
    useShell.getState().set({ aLabel: n.art || n.ui || '当前', aHud });
  };
  return (
    <button
      className={`btn ghost ${compare && slotA ? 'on' : ''}`}
      onClick={() => (slotA ? useStore.getState().setCompare(!compare) : pin())}
      title={slotA ? '开 / 关对比分屏（栏条上的 A 可以换成 A、清除 A）' : '把当前状态钉为 A，之后改任何东西都左右对比'}
    >对比</button>
  );
}

/* ---------------- 导出 / ⋯ ---------------- */

function ExportButton() {
  const dev = useShell((s) => s.dev);
  const [busy, setBusy] = useState(false);
  const open = (tab: string | null) => { useShell.getState().set({ exportTab: tab }); useStore.getState().setDialog('export'); };
  const shot = async () => {
    setBusy(true);
    try {
      const url = await captureFrame1080();
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `art-explorer-${Date.now()}.png`;
        a.click();
      }
    } finally { setBusy(false); }
  };
  return (
    <div className="split-btn">
      <button className="btn primary" onClick={() => open(null)} title="导出：画面说明、风格说明书、美术提示词、编码提示词、参数 JSON">导出</button>
      <Pop label="▾" className="btn primary caret" align="right" title="更多导出">
        {(close) => (
          <>
            <MenuItem onClick={() => { close(); void shot(); }} disabled={busy} hint="1920×1080">截图（只截画框）</MenuItem>
            <MenuItem onClick={() => { open('prompt'); close(); }} hint="含体检" title="给出图 AI / 美术外包的提示词（约 250 字），附体检提醒">美术提示词</MenuItem>
            <MenuItem onClick={() => { open('brief'); close(); }}>风格说明书</MenuItem>
            <MenuItem onClick={() => { open('visual'); close(); }}>画面说明</MenuItem>
            <MenuItem onClick={() => { open('json'); close(); }}>参数 JSON</MenuItem>
            {dev && <MenuItem onClick={() => { open('godot'); close(); }}>Godot 迁移包</MenuItem>}
          </>
        )}
      </Pop>
    </div>
  );
}

const KEYS: [string, string][] = [
  ['1 / 2', '画面 / UI 模式'], ['F', '专注（只看画框）'], ['[', '左栏收起 / 展开'], ['Ctrl+K', '搜索'],
  ['Ctrl+Z / Ctrl+Shift+Z', '撤销 / 重做'], ['空格 + 拖动', '放大时平移；元素上也转镜头'],
  ['方向键', '选中元素时微调 1 单位（Shift ×10）'], ['Delete', '隐藏选中元素'], ['Ctrl+D', '复制一份'], ['Tab', '轮换元素'], ['Shift+R', '还原元素'], ['Esc', '取消选中'],
];

const NOTICES_URL = 'https://github.com/EC2EZ4RD/game-art-explorer/blob/main/THIRD_PARTY_NOTICES.md';

function MoreMenu() {
  const dev = useShell((s) => s.dev);
  const theme = useShell((s) => s.theme);
  const set = useShell((s) => s.set);
  const [keys, setKeys] = useState(false);
  return (
    <Pop label="⋯" className="btn ghost icon" align="right" title="开发者模式、主题、导入、快捷键、许可">
      {(close) => (
        <div className="more-menu">
          <MenuItem on={dev} onClick={() => set({ dev: !dev })} hint={dev ? '开' : '关'} title="显示 fps 与统计、覆盖、Godot 导出、种子数字、依据徽标">开发者模式</MenuItem>
          <MenuSep />
          <MenuHead>主题</MenuHead>
          <div className="seg menu-seg">
            {([['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']] as const).map(([v, l]) => <button key={v} className={theme === v ? 'on' : ''} onClick={() => set({ theme: v })}>{l}</button>)}
          </div>
          <MenuSep />
          <MenuItem onClick={() => { set({ exportTab: 'json' }); useStore.getState().setDialog('export'); close(); }}>导入配方…</MenuItem>
          <MenuItem onClick={() => { useStore.getState().setDialog('check'); close(); }} title="粘贴一段美术 / 技术提示词：认出能映射成参数的部分、标出技术误区，可以载入为实验">提示词体检（导入）…</MenuItem>
          {dev && <MenuItem onClick={() => { set({ devPanel: 'coverage' }); close(); }}>覆盖统计</MenuItem>}
          {dev && <MenuItem onClick={() => { set({ devPanel: 'spec' }); close(); }} title="38 个皮肤 × 同一套组件，画在灰 / 亮 / 暗三种底上（§8 RC6）">皮肤规格页</MenuItem>}
          <MenuItem on={keys} onClick={() => setKeys(!keys)}>快捷键</MenuItem>
          {keys && <dl className="key-table">{KEYS.map(([k, d]) => <div key={k}><dt>{k}</dt><dd>{d}</dd></div>)}</dl>}
          <MenuSep />
          <MenuItem onClick={() => { window.open(NOTICES_URL, '_blank', 'noopener'); close(); }} title="代码、文档、素材、字体各自的许可，以及第三方数据的来源">许可与致谢</MenuItem>
        </div>
      )}
    </Pop>
  );
}
