import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './dims';
import { App } from './App';
import { RECIPES } from './content/recipes';
import { applyRecipe } from './state/actions';
import { useStore } from './state/store';
import { getEngine } from './ui/engineRef';
import './styles.css';
import { texturesPending, texturesReady } from './engine/textures';
import { getParam, isUiKey, uiParams } from './dims/registry';
import { ELEMENTS } from './hud/elements/core';
import './hud/compose/hud';
import { analyzeReadability } from './hud/check/readability';
import { flowAt, flowTotal, playFlow, stopFlow } from './hud/flow';
import { HUD_SIM } from './hud/sim';
import { replicaSimValues, type KReplicaSim } from './content/uiKnowledge';
import { devHooksBase } from './dev/hooks';

// 各轨道的开发钩子：src/dev/<轨道>.ts（T0，docs/workbench-redesign.md §11.0；约定见 src/dev/README.md）。
// 这些文件会被提升到本文件最前面先执行；本文件下面的老钩子用 devHooksBase 登记，只补没有的键，所以轨道文件里的同名钩子优先。
import.meta.glob('./dev/*.ts', { eager: true });

// 同步渲染；渲染中第一次请求的素材（UI 位图画到才请求）下载完后再渲染一遍，最多 3 轮
async function settled(eng: NonNullable<ReturnType<typeof getEngine>>, scale: number): Promise<string> {
  await texturesReady();
  let url = eng.renderSync(scale);
  for (let i = 0; i < 3 && texturesPending(); i++) {
    await texturesReady();
    url = eng.renderSync(scale);
  }
  return url;
}

/** R5 复刻库的一份复刻配方（src/content/replicas/<id>.json，字段说明见 docs/ui-replicas.md） */
interface Replica {
  id: string;
  name: string;
  pack?: string;
  art?: { recipe?: string; scene?: string; values?: Record<string, unknown> };
  base: Record<string, unknown>;
  screens: { key: string; values: Record<string, unknown>; sim?: KReplicaSim }[];
}
/** 复刻屏的钉帧参数：与复刻面板（uiKnowledge.ts replicaScreenPatch）共用 replicaSimValues（终期审查修复 ⑪） */
const simValues = replicaSimValues;
/** 套一屏复刻的参数（replicaShots 与 replicaStrip 共用）：清掉 UI 键 → 画面配方 → 画面参数 + 画幅 → 内容包 → base → 这一屏 → 钉帧 */
function applyReplicaScreen(rep: Replica, s: Replica['screens'][number], at?: number) {
  const st = useStore.getState();
  st.unset(Object.keys(st.values).filter(isUiKey), 'qa');
  const r = rep.art?.recipe ? RECIPES.find((x) => x.id === rep.art!.recipe) : undefined;
  if (r) applyRecipe(r);
  const art = { ...(rep.art?.values ?? {}), ...(rep.art?.scene ? { 'game.scene': rep.art.scene } : {}), 'camera.letterbox': '1.78' };
  useStore.getState().setMany({ ...art, 'cnt.pack': rep.pack ?? 'auto', ...rep.base, ...s.values, ...simValues(s.sim, at) } as never, 'qa', !r);
}

// 开发时暴露给调试与视觉回归脚本
if (import.meta.env.DEV) {
  devHooksBase({
    store: useStore,
    /** 参数定义（动态 import 的模块可能带 ?t= 时间戳，与应用里的不是同一个实例，所以从这里取） */
    param: getParam,
    uiParams,
    ready: texturesReady,
    engine: getEngine,
    recipes: RECIPES,
    applyRecipe: (id: string) => {
      const r = RECIPES.find((x) => x.id === id);
      if (r) applyRecipe(r);
      return !!r;
    },
    /** 可读性检查（M8b 验收用）：设参数 → 同步渲染 → 跑检查，返回每条问题的 id / 标题 / 框数 */
    readCheck: async (extra: Record<string, unknown> = {}, reset = false) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      useStore.getState().setMany(extra as never, 'qa', reset);
      await settled(eng, 1);
      const scene = eng.sampleScene(192);
      const r = eng.hud.resolved;
      if (!scene || !r) return 'no scene';
      // els：问题框落在哪些信息元素里（按元素命中框）
      const elOf = (q: { x: number; y: number; w: number; h: number }) => eng.hud.hits.find((h) => q.x + q.w / 2 >= h.rect.x && q.x + q.w / 2 <= h.rect.x + h.rect.w && q.y + q.h / 2 >= h.rect.y && q.y + q.h / 2 <= h.rect.y + h.rect.h)?.element ?? '-';
      return analyzeReadability(eng.hud.drawLog, scene, scene.cssW, scene.cssH, r).map((i) => ({ id: i.id, level: i.level, title: i.title, detail: i.detail, n: i.rects.length, els: [...new Set(i.rects.map(elOf))].join(',') }));
    },
    /** 流程演示的逐帧条带（M9b 验收）：设参数 → 从头播放流程 → 等间隔取 n 帧拼成条带，保存到 qa/<name>.png */
    flowStrip: async (demo: string, name: string, extra: Record<string, unknown> = {}, n = 12, w = 300) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      useStore.getState().setMany(extra as never, 'qa');
      await texturesReady();
      playFlow(demo);
      const total = flowTotal(demo), dt = total / n;
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      let cv: HTMLCanvasElement | null = null;
      const cols = 6;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * dt;
        HUD_SIM.resetTo = t;
        const im = await load(eng.renderSync(1));
        await new Promise((res) => setTimeout(res, 0));
        const h = Math.round((w * im.height) / im.width);
        if (!cv) { cv = document.createElement('canvas'); cv.width = cols * w; cv.height = Math.ceil(n / cols) * (h + 20); const g0 = cv.getContext('2d')!; g0.fillStyle = '#222'; g0.fillRect(0, 0, cv.width, cv.height); }
        const g = cv.getContext('2d')!;
        const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 20);
        g.drawImage(im, x, y + 20, w, h);
        const fn = flowAt(demo, t);
        g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(`${t.toFixed(1)}s · ${fn?.s.label ?? ''}`, x + 4, y + 15);
      }
      stopFlow();
      if (!cv) return 'no frames';
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved ${name}` : await res.text();
    },
    /** 同步渲染并保存到 qa/<name>.png */
    snap: async (name: string) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const dataUrl = await settled(eng, 3);
      const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl }) });
      return r.ok ? `saved ${name}` : await r.text();
    },
    /** 接触表：一组配方（可叠加额外参数）渲染后拼成一张图，保存到 qa/<name>.png */
    contact: async (ids: string[], name: string, extra: Record<string, unknown> = {}, cols = 4, w = 420) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const imgs: { id: string; url: string }[] = [];
      for (const id of ids) {
        const r = RECIPES.find((x) => x.id === id);
        if (r) applyRecipe(r);
        if (Object.keys(extra).length) useStore.getState().setMany(extra as never, 'qa');
        imgs.push({ id, url: await settled(eng, 3) });
      }
      const first = await new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = imgs[0].url; });
      const h = Math.round((w * first.height) / first.width);
      const rows = Math.ceil(imgs.length / cols);
      const c = document.createElement('canvas');
      c.width = w * cols; c.height = (h + 20) * rows;
      const g = c.getContext('2d')!;
      g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
      g.font = '14px sans-serif';
      for (let i = 0; i < imgs.length; i++) {
        const im = await new Promise<HTMLImageElement>((res) => { const x = new Image(); x.onload = () => res(x); x.src = imgs[i].url; });
        const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 20);
        g.drawImage(im, x, y + 20, w, h);
        g.fillStyle = '#fff'; g.fillText(imgs[i].id, x + 4, y + 15);
      }
      const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: c.toDataURL('image/png') }) });
      return r.ok ? `saved ${name}` : await r.text();
    },
    /** 通用网格：每格 = 配方（可选）+ 额外参数，拼成一张图 */
    grid: async (cells: { label: string; recipe?: string; extra?: Record<string, unknown>; reset?: boolean }[], name: string, cols = 4, w = 420) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const imgs: { id: string; url: string }[] = [];
      for (const c of cells) {
        const r = c.recipe ? RECIPES.find((x) => x.id === c.recipe) : undefined;
        if (r) applyRecipe(r);
        // 没有配方时 reset=true 从默认值出发，避免上一格的参数残留（UI 键不随整套替换清掉，这里一并清回跟随）
        if (!r && c.reset) { const st = useStore.getState(); st.unset(Object.keys(st.values).filter(isUiKey), 'qa'); }
        if (c.extra) useStore.getState().setMany(c.extra as never, 'qa', !r && !!c.reset);
        else if (!r && c.reset) useStore.getState().setMany({} as never, 'qa', true);
        // 第一次用到的素材纹理要先下载完，否则截到的是占位色
        imgs.push({ id: c.label, url: await settled(eng, 3) });
        // 让出一帧：连续几十格同步渲染会让 React 报更新过深
        await new Promise((res) => setTimeout(res, 0));
      }
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const first = await load(imgs[0].url);
      const h = Math.round((w * first.height) / first.width);
      const rows = Math.ceil(imgs.length / cols);
      const cv = document.createElement('canvas');
      cv.width = w * cols; cv.height = (h + 20) * rows;
      const g = cv.getContext('2d')!;
      g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
      g.font = '14px sans-serif';
      for (let i = 0; i < imgs.length; i++) {
        const im = await load(imgs[i].url);
        const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 20);
        g.drawImage(im, x, y + 20, w, h);
        g.fillStyle = '#fff'; g.fillText(imgs[i].id, x + 4, y + 15);
      }
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved ${name}` : await res.text();
    },
    /**
     * R5 复刻库：按 src/content/replicas/*.json 逐屏渲染，存 qa/replicas/<id>__<界面>.png（16:9 构图，scripts/refs/replica-sheet.py 与参考截图拼成对照图）。
     * ids 为空 = 全部。每屏从默认值出发：画面配方（art.recipe，可选）→ 场景与画面取值 → 复刻整体取值（base）→ 这一屏的取值；内容包 = 复刻指定的包；画幅钉 16:9。
     */
    replicaShots: async (ids: string[] = [], scale = 2) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const mods = import.meta.glob<{ default: Replica }>('./content/replicas/*.json');
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const out: string[] = [];
      for (const imp of Object.values(mods)) {
        const rep = (await imp()).default;
        if (ids.length && !ids.includes(rep.id)) continue;
        for (const s of rep.screens) {
          // 每屏的静帧钉法（sim，M12c-14）一起套上：低血 / 受击 / 演示的某一秒
          applyReplicaScreen(rep, s);
          const im = await load(await settled(eng, scale));
          // 只留中间的 16:9（视口比 16:9 窄时上下是黑边）
          const w = im.width, h = Math.min(im.height, Math.round((im.width * 9) / 16)), y = Math.round((im.height - h) / 2);
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d')!.drawImage(im, 0, y, w, h, 0, 0, w, h);
          const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `replicas/${rep.id}__${s.key}`, dataUrl: cv.toDataURL('image/png') }) });
          out.push(res.ok ? `${rep.id}/${s.key}` : `${rep.id}/${s.key}: ${await res.text()}`);
          await new Promise((res2) => setTimeout(res2, 0));
        }
      }
      return out;
    },
    /**
     * 复刻屏的逐帧条带（M12c-14）：套一屏复刻（含 sim）→ 按 times（秒，5–8 个）各钉一帧（chk.simTime）→ 横排拼成一条，每帧上方写时刻，
     * 存到 qa/replicas/strips/<id>__<screen>.png（replica-sheet.py 拼在对照图那一屏的下方，动效缺口按它评分）。
     * 这一屏没写 sim.demo / sim.pose 时只钉时钟（背景流动、待机动画）
     */
    replicaStrip: async (id: string, screen: string, times: number[] = [0, 0.4, 0.8, 1.2, 1.6, 2.4], w = 360) => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const mods = import.meta.glob<{ default: Replica }>('./content/replicas/*.json');
      let rep: Replica | undefined;
      for (const imp of Object.values(mods)) { const x = (await imp()).default; if (x.id === id) { rep = x; break; } }
      const s = rep?.screens.find((q) => q.key === screen);
      if (!rep || !s) return `no screen ${id}/${screen}`;
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const ts = times.slice(0, 8);
      let cv: HTMLCanvasElement | null = null;
      for (let i = 0; i < ts.length; i++) {
        applyReplicaScreen(rep, s, ts[i]);
        const im = await load(await settled(eng, 1));
        // 只留中间的 16:9（与 replicaShots 同口径）
        const ih = Math.min(im.height, Math.round((im.width * 9) / 16)), iy = Math.round((im.height - ih) / 2), h = Math.round((w * 9) / 16);
        if (!cv) { cv = document.createElement('canvas'); cv.width = ts.length * w; cv.height = h + 20; const g0 = cv.getContext('2d')!; g0.fillStyle = '#222'; g0.fillRect(0, 0, cv.width, cv.height); }
        const g = cv.getContext('2d')!;
        g.drawImage(im, 0, iy, im.width, ih, i * w, 20, w, h);
        g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(`${ts[i].toFixed(1)}s`, i * w + 4, 15);
        await new Promise((res) => setTimeout(res, 0));
      }
      if (!cv) return 'no frames';
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `replicas/strips/${id}__${screen}`, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved replicas/strips/${id}__${screen}` : await res.text();
    },
    /**
     * UI 对照表：每格 = 起点参数（recipe 可选）+ 额外参数，裁出状态面板 / 小地图 / 交互提示 / 对话框四块（CSS 像素，1:1），一格一行。
     * reset：每格先把这些键设回跟随（UI 键不随配方重置，见 store.setMany）。
     * pack：示例内容包（cnt.pack），默认钉在雪线旅人——回归对照不随场景的画面品类换游戏；传 'auto' 跟随品类，格子的 extra 也可以单独覆盖。
     */
    hudSheet: async (cells: { label: string; recipe?: string; extra?: Record<string, unknown> }[], name: string, reset: string[] = [], pack = 'snowline') => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const c = eng.renderer.domElement;
      const cw = c.clientWidth, ch = c.clientHeight;
      const crops: [number, number, number, number][] = [[0, 0, 240, 150], [cw - 120, 0, 120, 150], [cw / 2 - 120, ch * 0.58 - 8, 240, 48], [cw / 2 - 280, ch - 140, 560, 110]];
      const rowH = 150, labelW = 170;
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const cv = document.createElement('canvas');
      cv.width = labelW + crops.reduce((a, x) => a + x[2] + 8, 0);
      cv.height = cells.length * (rowH + 4);
      const g = cv.getContext('2d')!;
      g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, cv.width, cv.height);
      g.font = '14px sans-serif';
      let y = 0;
      for (const cell of cells) {
        const r = cell.recipe ? RECIPES.find((x) => x.id === cell.recipe) : undefined;
        if (r) applyRecipe(r);
        useStore.getState().setMany({ ...Object.fromEntries(reset.map((k) => [k, 'auto'])), 'cnt.pack': pack, ...(cell.extra ?? {}) } as never, 'qa');
        const im = await load(await settled(eng, 2));
        const s = im.width / cw;
        g.fillStyle = '#fff';
        cell.label.split('\n').forEach((l, i) => g.fillText(l, 6, y + 20 + i * 18));
        let x = labelW;
        for (const [a, b, w, h] of crops) { g.drawImage(im, a * s, b * s, w * s, h * s, x, y, w, Math.min(h, rowH)); x += w + 8; }
        y += rowH + 4;
      }
      useStore.getState().setMany({ ...Object.fromEntries(reset.map((k) => [k, 'auto'])), 'cnt.pack': 'auto' } as never, 'qa');
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved ${name}` : await res.text();
    },
    /**
     * 信息元素对照表（M5a）：每行一个元素，每格一种画法（取元素的前 forms 种），只开这一个元素，按命中框裁出来。
     * reset：每格先清回跟随的键。
     * pack：示例内容包（cnt.pack），默认钉在雪线旅人（这里关掉了品类布局，不钉的话包跟着场景的画面品类走）；传 'auto' 跟随品类。
     */
    elementSheet: async (skin: string, name: string, forms = 3, reset: string[] = [], pack = 'snowline') => {
      const eng = getEngine();
      if (!eng) return 'no engine';
      const c = eng.renderer.domElement;
      const load = (u: string) => new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const CW = 300, CH = 170, LW = 150;
      const ids = [...ELEMENTS.keys()];
      const cv = document.createElement('canvas');
      cv.width = LW + forms * (CW + 6);
      cv.height = ids.length * (CH + 20);
      const g = cv.getContext('2d')!;
      g.fillStyle = '#262626'; g.fillRect(0, 0, cv.width, cv.height);
      g.font = '13px sans-serif';
      let row = 0;
      for (const id of ids) {
        const def = ELEMENTS.get(id)!;
        const key = getParam(`${id}.form`) ? `${id}.form` : id === 'el.vitals' || id === 'el.speed' ? `cmp.gauge@${id}` : id === 'el.subtitle' ? 'cmp.dialogBox@el.subtitle' : '';
        const list = def.forms.slice(0, forms);
        g.fillStyle = '#fff'; g.fillText(id, 6, row * (CH + 20) + 34);
        for (let i = 0; i < list.length; i++) {
          const val = id === 'el.subtitle' ? (i === 0 ? 'auto' : 'bar') : list[i];
          useStore.getState().setMany({ ...Object.fromEntries(reset.map((k) => [k, 'auto'])), 'hud.style': skin, 'uip.layout': 'none', 'uip.screen': 'auto', 'cnt.pack': pack, 'cnt.elements': id, ...(key ? { [key]: val } : {}) } as never, 'qa');
          const im = await load(await settled(eng, 1));
          const s = im.width / c.clientWidth;
          const hit = eng.hud.hits.find((h) => h.element === id)?.rect ?? { x: 0, y: 0, w: c.clientWidth, h: c.clientHeight };
          const pad = 16, sx = Math.max(0, hit.x - pad), sy = Math.max(0, hit.y - pad), sw = Math.min(c.clientWidth - sx, hit.w + pad * 2), sh = Math.min(c.clientHeight - sy, hit.h + pad * 2);
          const k = Math.min(CW / sw, CH / sh, 1.6);
          const x = LW + i * (CW + 6), y = row * (CH + 20) + 20;
          g.drawImage(im, sx * s, sy * s, sw * s, sh * s, x + (CW - sw * k) / 2, y + (CH - sh * k) / 2, sw * k, sh * k);
          g.fillStyle = '#9cf'; g.fillText(String(val), x + 4, y - 4);
        }
        row++;
      }
      useStore.getState().setMany({ ...Object.fromEntries(reset.map((k) => [k, 'auto'])), 'cnt.elements': 'auto', 'uip.layout': 'auto', 'cnt.pack': 'auto' } as never, 'qa');
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved ${name}` : await res.text();
    },
    /** 依次载入一组配方并截图 */
    sheet: async (ids: string[], prefix = 'recipe', extra: Record<string, unknown> = {}) => {
      const out: string[] = [];
      for (const id of ids) {
        const r = RECIPES.find((x) => x.id === id);
        if (!r) continue;
        applyRecipe(r);
        if (Object.keys(extra).length) useStore.getState().setMany(extra as never, 'qa');
        const eng = getEngine();
        if (!eng) break;
        const dataUrl = await settled(eng, 3);
        await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `${prefix}-${id}`, dataUrl }) });
        out.push(id);
      }
      return out;
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
