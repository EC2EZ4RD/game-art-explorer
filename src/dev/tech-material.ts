/*
 * M 轨道（材质与灯光，docs/tech/track-M.md）的开发钩子：__gae.techM.*
 *
 *   await __gae.techM.shot(scene, recipe?, extra?, w?, h?)     同步渲一张（captureFrame，不改 DOM），返回 PNG dataURL
 *   await __gae.techM.sheet(name, cells, cols?, cw?)           拼成接触表 → qa/tech/M/<name>.png
 *   await __gae.techM.base(name, cases)                        存一组基线（内存里）供 diff 用
 *   await __gae.techM.diff(name, cases)                        重渲同一组，与基线逐像素比较：返回每张不同像素数与最大差
 *   __gae.techM.values(scene, recipe?, extra?)                 一张图交给引擎的参数（默认值 ⊕ 配方 ⊕ 场景推荐 ⊕ extra）
 *
 * 渲染不经过 store：直接 apply 给引擎再 captureFrame，完了把 store 的参数重新喂回引擎。只在开发环境有效；请在自己的后台标签页里跑。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string };
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });

  async function values(scene: string, recipe?: string, extra: Record<string, unknown> = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { sceneMeta }] = await Promise.all([import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog')]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    return {
      ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(scene).recommended ?? {}),
      'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none',
      ...extra,
    };
  }

  async function restore() {
    const [{ getEngine }, { useStore }, feed] = await Promise.all([import('../ui/engineRef'), import('../state/store'), import('../ui/stage/engineFeed')]);
    getEngine()?.apply(useStore.getState().values);
    feed.setDraft(null);
  }

  async function render(c: Cell, w: number, h: number): Promise<string | null> {
    const [{ getEngine }, { texturesPending, texturesReady }] = await Promise.all([import('../ui/engineRef'), import('../engine/textures')]);
    const eng = getEngine();
    if (!eng) return null;
    eng.apply((await values(c.scene, c.recipe, c.extra)) as never);
    await texturesReady();
    let url = eng.captureFrame(w, h, 3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.captureFrame(w, h, 3); }
    return url;
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540) {
    try { return await render({ scene, recipe, extra }, w, h); } finally { await restore(); }
  }

  async function save(name: string, dataUrl: string) {
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/M/${name}`, dataUrl }) });
    return res.ok ? `saved qa/tech/M/${name}.png` : await res.text();
  }

  /** 接触表：每渲完一格就存进 IndexedDB，页面被别的轨道的热更新整页刷新后，用同样的参数再调一次会接着渲 */
  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const ch = Math.round((cw * 9) / 16), head = 26;
    const { RECIPE_MAP } = await import('../content/recipes');
    const { sceneMeta } = await import('../content/sceneCatalog');
    const sig = JSON.stringify([cells, cols, cw]);
    const prev = await idbGet(`job:${name}`);
    let done: string[] = prev && prev[0] === sig ? prev.slice(1) : [];
    if (done.length >= cells.length) done = [];
    try {
      for (let i = done.length; i < cells.length; i++) {
        done.push((await render(cells[i], cw * 1.5, ch * 1.5)) ?? '');
        await idbPut(`job:${name}`, [sig, ...done]);
      }
    } finally { await restore(); }
    const shots = cells.map((c, i) => {
      const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
      return { label: c.label ?? `${sceneMeta(c.scene).name} · ${r?.name ?? c.recipe ?? '默认'}`, url: done[i] || null };
    });
    await idbPut(`job:${name}`, []);
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * (ch + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + head);
      const s = shots[i];
      if (s.url) g.drawImage(await load(s.url), x, y + head, cw, ch);
      else { g.fillStyle = '#633'; g.fillRect(x, y + head, cw, ch); }
      g.fillStyle = '#eee'; g.fillText(s.label, x + 6, y + 18);
    }
    return save(name, cv.toDataURL('image/png'));
  }

  /* 基线与逐像素比较（新参数默认关时画面应一个像素都不变）。基线 PNG 存进 IndexedDB，整页刷新后还在 */
  const idb = () => new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('gae-techM', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('base');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idbPut = async (k: string, v: string[]) => { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('base', 'readwrite'); t.objectStore('base').put(v, k); t.oncomplete = res; t.onerror = rej; }); };
  const idbGet = async (k: string) => { const db = await idb(); return new Promise<string[] | undefined>((res, rej) => { const q = db.transaction('base').objectStore('base').get(k); q.onsuccess = () => res(q.result as string[] | undefined); q.onerror = rej; }); };
  async function pixels(url: string): Promise<ImageData> {
    const im = await load(url);
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(im, 0, 0);
    return g.getImageData(0, 0, cv.width, cv.height);
  }
  async function grab(cases: Cell[]) {
    const out: string[] = [];
    try { for (const c of cases) { const u = await render(c, 960, 540); out.push(u ?? ''); } } finally { await restore(); }
    return out;
  }
  async function base(name: string, cases: Cell[]) {
    const urls = await grab(cases);
    await idbPut(name, urls);
    return `baseline ${name}: ${urls.length} shots`;
  }
  /** from：只比基线里从第 from 张起的这一段（cases 也从那里切），刷新频繁时分段跑 */
  async function diff(name: string, cases: Cell[], from = 0, count = 99) {
    const bu = await idbGet(name);
    if (!bu) return 'no baseline';
    const part = cases.slice(from, from + count);
    const b = await Promise.all(bu.slice(from, from + count).map((u) => pixels(u)));
    const now = await Promise.all((await grab(part)).map((u) => pixels(u)));
    cases = part;
    return now.map((d, i) => {
      const a = b[i];
      if (!a || a.width !== d.width || a.height !== d.height) return { i, err: 'size' };
      let n = 0, max = 0;
      for (let k = 0; k < d.data.length; k += 4) {
        const m = Math.max(Math.abs(d.data[k] - a.data[k]), Math.abs(d.data[k + 1] - a.data[k + 1]), Math.abs(d.data[k + 2] - a.data[k + 2]));
        if (m > 0) { n++; if (m > max) max = m; }
      }
      return { i, scene: cases[i].scene, recipe: cases[i].recipe, diffPixels: n, maxDiff: max };
    });
  }

  /** 编译失败的着色器程序（three 只在第一次编译时打一条错误，之后静默不画） */
  async function progErrors() {
    const { getEngine } = await import('../ui/engineRef');
    const progs = (getEngine()?.renderer.info.programs ?? []) as unknown as { name: string; diagnostics?: { runnable: boolean; fragmentShader: { log: string }; vertexShader: { log: string } } }[];
    return progs.filter((p) => p.diagnostics && !p.diagnostics.runnable).map((p) => ({ name: p.name, frag: p.diagnostics!.fragmentShader.log.slice(0, 400), vert: p.diagnostics!.vertexShader.log.slice(0, 400) }));
  }

  /** 逐帧颤动：同一场景按抽帧的前 n 拍各渲一张拼成一行（静态截图看不出颤动，只能并排比） */
  async function frames(name: string, scene: string, recipe: string, extra: Record<string, unknown> = {}, n = 3, fps = 12) {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    const e = eng as unknown as { stepTime: number; simTime: number };
    const vals = (await values(scene, recipe, extra)) as never;
    const urls: string[] = [];
    try {
      for (let i = 0; i < n; i++) { e.stepTime = i / fps; e.simTime = i / fps; eng.apply(vals); urls.push(eng.captureFrame(800, 450, 1)); }
    } finally { await restore(); }
    const cv = document.createElement('canvas');
    cv.width = n * 800; cv.height = 476;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    for (let i = 0; i < n; i++) { g.drawImage(await load(urls[i]), i * 800, 26, 800, 450); g.fillStyle = '#eee'; g.fillText(`第 ${i + 1} 拍（${fps} fps）`, i * 800 + 6, 18); }
    return save(name, cv.toDataURL('image/png'));
  }

  /*
   * 截图队列：别的轨道频繁热更新会整页刷新，长任务跑不完。队列存在 sessionStorage（只属于这个标签页，不会跑到别的标签页里），
   * 页面加载后自动接着跑；每张接触表跑完就出队。__gae.techM.queue([[name, cells, cols, cw], …])
   */
  type Job = [string, Cell[], number?, number?];
  const QKEY = 'gae.techM.queue';
  const readQ = (): Job[] => { try { return JSON.parse(sessionStorage.getItem(QKEY) ?? '[]') as Job[]; } catch { return []; } };
  const w = window as unknown as { __techMRun?: number };
  async function runQueue() {
    if (w.__techMRun && Date.now() - w.__techMRun < 120000) return 'busy';
    const log: string[] = [];
    for (let q = readQ(); q.length; q = readQ()) {
      w.__techMRun = Date.now();
      const [name, cells, cols, cw] = q[0];
      log.push(String(await sheet(name, cells, cols ?? 2, cw ?? 800)));
      sessionStorage.setItem(QKEY, JSON.stringify(readQ().slice(1)));
    }
    w.__techMRun = 0;
    return log;
  }
  async function queue(jobs: Job[]) {
    sessionStorage.setItem(QKEY, JSON.stringify([...readQ(), ...jobs]));
    return runQueue();
  }
  // 页面加载后：引擎就绪就接着跑没跑完的队列
  if (readQ().length) {
    const t0 = Date.now();
    const tryRun = async () => {
      const { getEngine } = await import('../ui/engineRef');
      if (getEngine()) setTimeout(() => void runQueue(), 1500);
      else if (Date.now() - t0 < 30000) setTimeout(() => void tryRun(), 500);
    };
    setTimeout(() => void tryRun(), 1000);
  }

  devHooks({ techM: { values, shot, sheet, save, base, diff, progErrors, frames, queue, runQueue, pending: () => readQ().map((j) => j[0]) } });
}

// 自接受热更新：改这个文件时只重跑它，不整页刷新
if (import.meta.hot) import.meta.hot.accept();
