import { devHooks } from './hooks';
import { useStore } from '../state/store';
import { getEngine } from '../ui/engineRef';
import { useShell, setMode } from '../ui/stage/shell';
import { isUiKey } from '../dims/registry';
import { RECIPES } from '../content/recipes';
import { applyRecipe, resetAll } from '../state/actions';
import { replicaSimValues, type KReplicaSim } from '../content/uiKnowledge';
import { texturesPending, texturesReady } from '../engine/textures';
import { skinValueOf } from '../hud/sys/register';
import { analyzeReadability, textContrastStats } from '../hud/check/readability';
import { SAMPLE_HUD } from '../hud/compose/sample';
import { ICONS, ICON_NAMES, GLYPH_ICON } from '../hud/icons/set';
import { drawVectorIcon } from '../hud/icons/draw';
import { hasLineFloor, QUALITY } from '../hud/paint';
import { PLACEHOLDER } from '../hud/greybox';
import { sampleSceneLumNow } from '../hud/sceneLum';
import { HudSystem } from '../hud/HudSystem';
import { presetsOf } from '../hud/sys/spec';

/*
 * 轨道 E（HUD 品质）的开发钩子：__gae.hudQa.*（docs/workbench-redesign.md §8、§11.1 E 行）。
 *   prep()                 进 UI 模式 + 左栏收成图标栏（编辑状态，1440×900 时画框 ≈1031×580）、QA 标签页（画面模式也画 HUD）
 *   shots(kind, tag)       按一组固定的格子逐格渲染，存 qa/redesign/E/shots/<tag>/<kind>-<序号>-<名字>.png，返回每格的指标
 *                          kind：skins（默认 HUD × 6 皮肤）/ layouts（6 个品类布局）/ templates（6 个界面模板）/ replicas（6 个复刻屏）
 *   metrics()              当前这一帧的 HUD 指标：最小字号（CSS 像素）、小于 11px 的字数、对比度合格率、细于 1 设备像素的线
 *   sample(on)             开发 / QA 用：局内 HUD 默认画 M1 四控件回归样本（drawSample），默认关（RC2）
 * 改前 / 改后对照图：scripts 不归 E，对照图由 scratchpad 里的 Python 拼（见 docs/redesign/track-E.md）。
 */

interface Cell { label: string; values: Record<string, unknown>; replica?: string }

/** 对照用的固定画面：灵感沙盒岛 + 低多边形 + 探索品类（改前改后同一个画面，不跟首屏常量走） */
const BASE_ART = { 'game.scene': 'sandbox', 'game.genre': 'explore', 'game.seed': 1 };
const SKINS6 = ['skin.neobrutal', 'skin.flat', 'skin.glass', 'skin.parchment', 'skin.scifi', 'skin.darkGold'];
const LAYOUTS6: [string, string][] = [['layout.action', 'action'], ['layout.shooter', 'shooter'], ['layout.rpg', 'rpg'], ['layout.strategyRts', 'strategy'], ['layout.builder', 'builder'], ['layout.racing', 'racing']];
const TEMPLATES6 = ['tpl.inventory', 'tpl.pausePc', 'tpl.npc', 'tpl.settle', 'tpl.title', 'tpl.hero'];
const REPLICAS6 = ['hades', 'hollow-knight', 'elden-ring', 'slay-the-spire', 'stardew', 'frostpunk'];

function cells(kind: string): Cell[] {
  if (kind === 'skins') return SKINS6.map((id) => ({ label: id.slice(5), values: { ...BASE_ART, 'hud.style': skinValueOf(id) } }));
  if (kind === 'layouts') return LAYOUTS6.map(([id, genre]) => ({ label: id.slice(7), values: { ...BASE_ART, 'game.genre': genre, 'uip.layout': id } }));
  if (kind === 'templates') return TEMPLATES6.map((id) => ({ label: id.slice(4), values: { ...BASE_ART, 'uip.screen': id } }));
  if (kind === 'replicas') return REPLICAS6.map((id) => ({ label: id, values: {}, replica: id }));
  return [];
}

interface Replica { id: string; name: string; pack?: string; art?: { recipe?: string; scene?: string; values?: Record<string, unknown> }; base: Record<string, unknown>; screens: { key: string; values: Record<string, unknown>; sim?: KReplicaSim }[] }
const REPS = import.meta.glob<{ default: Replica }>('../content/replicas/*.json');
async function replica(id: string): Promise<Replica | null> {
  for (const imp of Object.values(REPS)) { const r = (await imp()).default; if (r.id === id || r.id === `rep.${id}`) return r; }
  return null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function settled(scale = 3): Promise<string> {
  const eng = getEngine();
  if (!eng) return '';
  await texturesReady();
  let url = eng.renderSync(scale);
  // 边缘衬底按画面亮度垫（sceneLum.ts）：先采一次当前画面的亮度网格再出图，不等节流
  sampleSceneLumNow(); url = eng.renderSync(scale);
  for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.renderSync(scale); }
  return url;
}

/** 从首屏状态出发套一格：清 UI 键 → 低多边形 → 固定画面 → 这一格的值（复刻：与 main.tsx 的 applyReplicaScreen 同口径的第一屏） */
async function applyCell(c: Cell) {
  const st = useStore.getState();
  st.unset(Object.keys(st.values).filter(isUiKey), 'qa');
  if (c.replica) {
    const rep = await replica(c.replica);
    if (!rep) return;
    const s = rep.screens[0];
    const r = rep.art?.recipe ? RECIPES.find((x) => x.id === rep.art!.recipe) : undefined;
    if (r) applyRecipe(r);
    const art = { ...(rep.art?.values ?? {}), ...(rep.art?.scene ? { 'game.scene': rep.art.scene } : {}) };
    useStore.getState().setMany({ ...art, 'cnt.pack': rep.pack ?? 'auto', ...rep.base, ...s.values, ...replicaSimValues(s.sim) } as never, 'qa', !r);
    return;
  }
  const r = RECIPES.find((x) => x.id === 'lowpoly-geo');
  if (r) applyRecipe(r);
  useStore.getState().setMany(c.values as never, 'qa');
}

function metrics() {
  const eng = getEngine();
  if (!eng) return null;
  const log = eng.hud.drawLog, r = eng.hud.resolved;
  const c = eng.renderer.domElement, cssW = c.clientWidth, cssH = c.clientHeight;
  const texts = log.texts.filter((t) => !t.fx);
  // 记录里的 size 是 CSS 像素（paint.ts drawText 记的是 字号 × 画布缩放 / CSS 缩放）
  const sizes = texts.map((t) => t.size);
  const scene = eng.sampleScene(192);
  const ct = scene && r ? textContrastStats(log, scene, scene.cssW, scene.cssH, r) : null;
  const issues = scene && r ? analyzeReadability(log, scene, scene.cssW, scene.cssH, r).map((i) => i.title) : [];
  return {
    unitK: +eng.hud.unitK.toFixed(3), canvas: [cssW, cssH], texts: texts.length,
    minCss: sizes.length ? +Math.min(...sizes).toFixed(1) : null,
    below11: sizes.filter((s) => s < 11 - 0.05).length,
    contrastPass: ct ? +(ct.pass / Math.max(1, ct.n)).toFixed(3) : null, contrastN: ct?.n ?? 0, worst: ct?.worst ?? [],
    thinLines: (globalThis as { __gaeThin?: number }).__gaeThin ?? null,
    issues,
  };
}

/** 渲染一格并存图，返回指标（截图脚本逐格调：别的轨道改文件引起整页刷新时只重跑没完成的那一格） */
async function shot(kind: string, i: number, tag: string) {
  const c = cells(kind)[i];
  if (!c || !getEngine()) return null;
  await applyCell(c);
  // 细线统计（审查修复 ⑩：原来只包了 HUD 主画布，烘焙的框 / 端头与渐隐的临时画布量不到）：渲染期间在原型上给 stroke / strokeRect 装计数
  // （线宽 × 变换缩放 < 1 个设备像素的算细线；装了线宽下限的画布——HUD 主画布、烘焙画布、渐隐临时画布——都算），渲染完换回原来的
  let thin = 0, strokes = 0;
  const P = CanvasRenderingContext2D.prototype as unknown as Record<string, (...x: unknown[]) => void>;
  const orig = { stroke: P.stroke, strokeRect: P.strokeRect };
  for (const fn of ['stroke', 'strokeRect'] as const) {
    P[fn] = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
      if (hasLineFloor(this)) { const m = this.getTransform(), k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; strokes++; if (this.lineWidth * k < 0.999) thin++; }
      return orig[fn].apply(this, a);
    };
  }
  let url = '';
  try { url = await settled(3); } finally { P.stroke = orig.stroke; P.strokeRect = orig.strokeRect; }
  (globalThis as { __gaeThin?: number }).__gaeThin = thin;
  const m = { ...metrics(), strokes };
  const name = `redesign/E/shots/${tag}/${kind}-${i}-${c.label}`;
  const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: url }) });
  return { cell: c.label, saved: res.ok, ...m };
}
async function shots(kind: string, tag: string) {
  const out: unknown[] = [];
  for (let i = 0; i < cells(kind).length; i++) { out.push(await shot(kind, i, tag)); await wait(30); }
  return out;
}

/** 图标总表：每个图标 × 画风（line / flat / duotone / silhouette / painted / pixel），深 / 浅两种底；存 qa/redesign/E/<name>.png */
async function iconSheet(name = 'redesign/E/icons', size = 32) {
  const styles = ['line', 'flat', 'duotone', 'silhouette', 'painted', 'pixel'];
  const cols = 8, cellW = styles.length * (size + 10) + 16, cellH = size + 34, rows = Math.ceil(ICON_NAMES.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * cellW; cv.height = rows * cellH * 2 + 40;
  const g = cv.getContext('2d')!;
  const glyphOf = new Map(Object.entries(GLYPH_ICON).map(([k, v]) => [v, k]));
  for (const [bi, bg, fg] of [[0, '#16181d', '#e9e6dc'], [1, '#e9e6dc', '#22252b']] as [number, string, string][]) {
    const y0 = bi * (rows * cellH + 20);
    g.fillStyle = bg; g.fillRect(0, y0, cv.width, rows * cellH + 20);
    ICON_NAMES.forEach((n, i) => {
      const cx0 = (i % cols) * cellW, cy0 = y0 + 10 + Math.floor(i / cols) * cellH;
      g.fillStyle = fg; g.font = '12px sans-serif'; g.fillText(`${ICONS[n].label} ${glyphOf.get(n) ?? ''}`, cx0 + 8, cy0 + 12);
      styles.forEach((st, j) => drawVectorIcon(g, n, cx0 + 8 + j * (size + 10) + size / 2, cy0 + 18 + size / 2, size, j === 4 ? '#d9a441' : fg, { style: st }));
    });
  }
  const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
  return res.ok ? `saved ${name} (${ICON_NAMES.length} 个图标)` : await res.text();
}

/**
 * 皮肤规格页（docs/workbench-redesign.md §8 RC6，开发页）：38 个皮肤 × 同一套组件（RPG 布局：生命、资源、技能、小地图、目标、队伍、通知……），
 * 各画在灰 / 亮 / 暗三种底上（不经引擎：离屏 HudSystem 直接画 960 × 540，按 scale 缩进格子）。每页 per 个皮肤，存 qa/redesign/E/spec-<页>.png
 */
async function specSheet(layout = 'layout.rpg', per = 10, scale = 0.6) {
  const skins = presetsOf('skin').map((p) => skinValueOf(p.id));
  const st = useStore.getState(), base = Object.fromEntries(Object.entries(st.values).filter(([k]) => !isUiKey(k)));
  const BG: [string, string][] = [['灰', '#7d7f84'], ['亮', '#e9e6dc'], ['暗', '#14161b']];
  const W0 = 960, H0 = 540, cw = Math.round(W0 * scale), ch = Math.round(H0 * scale), lw = 120;
  const hud = new HudSystem();
  const out: string[] = [];
  try {
    for (let page = 0; page * per < skins.length; page++) {
      const list = skins.slice(page * per, (page + 1) * per);
      const cv = document.createElement('canvas');
      cv.width = lw + BG.length * (cw + 8); cv.height = 28 + list.length * (ch + 8);
      const g = cv.getContext('2d')!;
      g.fillStyle = '#202227'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#fff'; g.font = '14px sans-serif';
      BG.forEach(([n], i) => g.fillText(`${n}底`, lw + i * (cw + 8) + 4, 18));
      list.forEach((skin, row) => {
        const y = 28 + row * (ch + 8);
        g.fillStyle = '#fff'; g.fillText(skin, 6, y + 18);
        const v = { ...base, 'hud.style': skin, 'uip.layout': layout, 'uip.screen': 'auto', 'cnt.pack': 'snowline' } as never;
        const f = hud.update(v, W0, H0, W0, H0, 0, 0, [], null, null);
        const img = f?.texture.image as HTMLCanvasElement | undefined;
        BG.forEach(([, c], i) => {
          const x = lw + i * (cw + 8);
          g.fillStyle = c; g.fillRect(x, y, cw, ch);
          if (img) g.drawImage(img, 0, 0, img.width, img.height, x, y, cw, ch);
        });
      });
      const name = `redesign/E/spec-${page + 1}`;
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
      out.push(res.ok ? name : await res.text());
      await wait(20);
    }
  } finally { hud.dispose(); }
  // 离屏实例改写过模块级的世界 / 内容包等状态：让主画面下一帧重画
  useStore.getState().setMany({} as never, 'qa');
  return out;
}

/**
 * 整合修复的复查（真实的场景路径）：进 UI 模式、收起左栏，点场景卡（gameScenes 的 id，名作 = 'rep:rep.xxx'），可选套配方（keepMine = false）、点胶片里的某一屏
 * 返回这个场景的界面 id 列表
 */
async function scene(id: string, recipe?: string | null, screen?: string | null, extra?: Record<string, unknown>) {
  const [SA, { GAME_SCENES }, { RECIPE_MAP }] = await Promise.all([import('../ui/scene/sceneActions'), import('../content/gameScenes'), import('../content/recipes')]);
  // 从干净的状态出发（上一格手动写的皮肤 / 参数不带过来）
  resetAll();
  setMode('ui');
  useShell.getState().set({ uiRail: true, focus: false, zoom: 'fit' } as never);
  const sc = GAME_SCENES.find((s) => s.id === id);
  if (!sc) return null;
  await SA.pickGameScene(sc);
  const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
  if (r) applyRecipe(r, { keepMine: false });
  const scr = screen ? sc.screens.find((s) => s.id === screen) : undefined;
  if (scr) await SA.pickScreen(sc, scr);
  if (extra) useStore.getState().setMany(extra as never, 'qa');
  return sc.screens.map((s) => s.id);
}
/** 按编辑状态的画框尺寸（1440×900 时 1031×580、像素比 1，HUD unitK ≈ 1.074）出图：先渲一次、采画面亮度，再出图，存 qa/<name>.png */
async function save(name: string, w = 1031, h = 580) {
  const eng = getEngine();
  if (!eng) return false;
  await texturesReady();
  eng.captureFrame(w, h, 2);
  sampleSceneLumNow();
  let url = eng.captureFrame(w, h, 3);
  for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.captureFrame(w, h, 3); }
  const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: url }) });
  return res.ok;
}

async function prep() {
  useShell.getState().set({ qa: true });
  resetAll();
  setMode('ui');
  useShell.getState().set({ uiRail: true, qa: true, zoom: 'fit', focus: false } as never);
  await wait(600);
  return { frame: (document.querySelector('[data-frame]') as HTMLElement | null)?.clientWidth, canvas: getEngine()?.renderer.domElement.width };
}

if (import.meta.env.DEV) {
  devHooks({
    hudQa: {
      prep, shot, shots, metrics, cells, count: (kind: string) => cells(kind).length, iconSheet, specSheet, scene, save,
      /** 品质下限总开关（对照改前的样子）：floors(false) 关掉字号 / 描边 / 不透明度下限、自动描边与矢量图标 */
      /** 占位画回斜纹灰盒 + 「需素材」字（开发 / QA） */
      /** 立刻采一次画面亮度网格（边缘衬底按它垫；场景质量门槛这类批量脚本换场景后、量之前调） */
      lum: () => { sampleSceneLumNow(); return true; },
      placeholders: (qa = true) => { PLACEHOLDER.qa = qa; useStore.getState().setMany({} as never, 'qa'); return PLACEHOLDER.qa; },
      floors: (on = true) => { QUALITY.on = on; useStore.getState().setMany({} as never, 'qa'); return QUALITY.on; },
      sample: (on = true) => { SAMPLE_HUD.on = on; useStore.getState().setMany({} as never, 'qa'); return SAMPLE_HUD.on; },
    },
  });
}

if (import.meta.hot) import.meta.hot.accept();
