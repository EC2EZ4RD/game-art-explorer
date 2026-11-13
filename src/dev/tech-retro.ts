/*
 * P2·镜头与复古显示 的开发钩子（约定见同目录 README.md）：__gae.techRetro.*
 *
 *   await __gae.techRetro.sheet('name', [{ scene, recipe?, extra?, label? }, …], cols?, w?, h?)
 *        逐张同步渲染（借 __gae.scenes2d.shot），拼成接触表存 qa/tech/P2/<name>.png
 *   await __gae.techRetro.live('name', { scene, recipe?, extra? }, frames?)
 *        让引擎实际跑几帧（隔行梳齿这类要靠前后帧的效果）再截画布，存 qa/tech/P2/<name>.png
 *   await __gae.techRetro.time(values?, frames?)   当前画面每帧耗时（ms，平均）
 *
 * 只在开发环境有效；请在自己的后台标签页里跑（会改这一页的画面）。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string };
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const save = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/P2/${name}`, dataUrl }) });
    return r.ok ? `saved qa/tech/P2/${name}.png` : `失败 ${r.status}`;
  };
  type S2 = { shot(scene: string, recipe?: string, extra?: Record<string, unknown>, w?: number, h?: number): Promise<string | null> };
  const s2 = () => (window as unknown as { __gae: { scenes2d: S2 } }).__gae.scenes2d;

  async function sheet(name: string, cells: Cell[], cols = 2, w = 960, h = 540) {
    const urls: (string | null)[] = [];
    let prevScene = '';
    for (const c of cells) {
      // 换场景后镜头要过渡几帧：先空渲一张，让对比的两张取景一致
      if (c.scene !== prevScene) {
        await s2().shot(c.scene, c.recipe, c.extra ?? {}, w, h);
        // 镜头阻尼过渡：多推几步让它停稳
        const { getEngine } = await import('../ui/engineRef');
        const ctl = (getEngine() as unknown as { controls?: { update(dt: number): void } } | null)?.controls;
        for (let i = 0; i < 240; i++) ctl?.update(0.016);
      }
      prevScene = c.scene;
      urls.push(await s2().shot(c.scene, c.recipe, c.extra ?? {}, w, h));
    }
    const head = 28;
    const rows = Math.ceil(cells.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * w; cv.height = rows * (h + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '18px sans-serif';
    for (let i = 0; i < cells.length; i++) {
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + head);
      const u = urls[i];
      if (u) g.drawImage(await load(u), x, y + head, w, h); else { g.fillStyle = '#633'; g.fillRect(x, y + head, w, h); }
      g.fillStyle = '#eee';
      g.fillText(cells[i].label ?? `${cells[i].scene} · ${cells[i].recipe ?? '默认'}`, x + 8, y + 21);
    }
    return save(name, cv.toDataURL('image/png'));
  }

  /** 让引擎实际跑几帧再截画布（前后帧相关的效果） */
  async function live(name: string, c: Cell, frames = 20, w = 960, h = 540, spin = 1) {
    const [{ getEngine }, { useStore }, feed] = await Promise.all([import('../ui/engineRef'), import('../state/store'), import('../ui/stage/engineFeed')]);
    const eng = getEngine();
    if (!eng) return 'no engine';
    const { defaultValues } = await import('../dims/registry');
    const { RECIPE_MAP } = await import('../content/recipes');
    const { sceneMeta } = await import('../content/sceneCatalog');
    const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
    const vals = { ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(c.scene).recommended ?? {}), 'game.scene': c.scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none', ...(c.extra ?? {}) };
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prev = host.style.cssText;
    const priv = eng as unknown as { resize(): void; renderFrame(): void; controls: { update(dt: number): void }; simTime: number; frameDt: number };
    host.style.cssText = `${prev};width:${w}px !important;height:${h}px !important;min-width:${w}px !important;min-height:${h}px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    try {
      eng.apply(vals as never);
      const raf = () => new Promise<void>((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); });
      // 后台标签页的 requestAnimationFrame 会被节流：这里直接逐帧推（每帧之间让出一个宏任务，模拟时间照常走）
      let url = '';
      for (let i = 0; i < frames; i++) {
        await new Promise((res) => setTimeout(res, 16));
        // 模拟一帧 1/30 秒：时间往前走、自转镜头转一点（后台标签页里引擎自己的循环不跑）
        priv.simTime += 1 / 30;
        priv.frameDt = 1 / 30;
        priv.controls.update(1 / 30 * spin);
        priv.renderFrame();
        await raf();
      }
      url = eng.renderer.domElement.toDataURL('image/png');
      return save(name, url);
    } finally {
      host.style.cssText = prev;
      priv.resize();
      eng.apply(useStore.getState().values);
      feed.setDraft(null);
    }
  }

  /**
   * 每帧耗时：画框钉成 w×h（像素比 1），先渲基准（cells[0]），再逐个渲；返回 { 标签: 毫秒 }。
   * 每个组合渲 frames 帧取平均（readPixels 等 GPU 做完），差值就是这个效果的开销。
   */
  async function time(scene: string, recipe: string | undefined, cases: Record<string, Record<string, unknown>>, frames = 20, w = 1920, h = 1080) {
    const [{ getEngine }, { useStore }, feed] = await Promise.all([import('../ui/engineRef'), import('../state/store'), import('../ui/stage/engineFeed')]);
    const eng = getEngine();
    if (!eng) return 'no engine';
    const { defaultValues } = await import('../dims/registry');
    const { RECIPE_MAP } = await import('../content/recipes');
    const { sceneMeta } = await import('../content/sceneCatalog');
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    const base = { ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(scene).recommended ?? {}), 'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none' };
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prev = host.style.cssText;
    const priv = eng as unknown as { resize(): void; renderFrame(): void };
    const prevDpr = eng.renderer.getPixelRatio();
    eng.renderer.setPixelRatio(1);
    host.style.cssText = `${prev};width:${w}px !important;height:${h}px !important;min-width:${w}px !important;min-height:${h}px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    const gl = eng.renderer.getContext() as WebGL2RenderingContext;
    // GPU 计时：EXT_disjoint_timer_query_webgl2（没有就退回墙钟，数会被垂直同步干扰）
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
    const gpuMs = async (f: () => void) => {
      if (!ext) { const t0 = performance.now(); f(); return performance.now() - t0; }
      const q = gl.createQuery()!;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      f();
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      for (let k = 0; k < 200 && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE); k++) await new Promise((res) => setTimeout(res, 5));
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      gl.deleteQuery(q);
      return ns / 1e6;
    };
    const out: Record<string, number> = {};
    try {
      for (const [label, extra] of Object.entries(cases)) {
        eng.apply({ ...base, ...extra } as never);
        for (let i = 0; i < 3; i++) priv.renderFrame();
        const ms: number[] = [];
        for (let i = 0; i < frames; i++) ms.push(await gpuMs(() => priv.renderFrame()));
        ms.sort((a, b) => a - b);
        out[label] = +ms[Math.floor(ms.length / 2)].toFixed(2);
      }
    } finally {
      eng.renderer.setPixelRatio(prevDpr);
      host.style.cssText = prev;
      priv.resize();
      eng.apply(useStore.getState().values);
      feed.setDraft(null);
    }
    return out;
  }

  devHooks({ techRetro: { sheet, live, time } });
}

// 自接受热更新：改这个文件时只重跑它，不整页刷新
if (import.meta.hot) import.meta.hot.accept();
