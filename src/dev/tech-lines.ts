/*
 * 技术补全 P1（线条与后处理核心）的开发钩子：__gae.techLines.*
 *
 *   __gae.techLines.values(scene, recipe?, extra?)            一张图交给引擎的参数（默认值 ⊕ 配方 ⊕ 场景推荐 ⊕ extra）
 *   await __gae.techLines.shot(scene, recipe?, extra?, w?, h?)   同步渲一张（captureFrame，不动 DOM），返回 PNG dataURL
 *   await __gae.techLines.save(name, cells, w?, h?)            每格单独存一张 qa/tech/P1/<name>_<i>.png（像素对比用）
 *   await __gae.techLines.sheet(name, cells, cols?, cw?)       拼成接触表 → qa/tech/P1/<name>.png
 *   await __gae.techLines.time(scene, recipe?, extra?, n?)     粗测一帧耗时（毫秒，含 readPixels 同步）
 *
 * 渲染不经过 store（不写撤销、不写存档）；渲完把 store 里的参数重新交给引擎。只在开发环境有效，请在自己的后台标签页里跑。
 */
import type * as THREE from 'three';
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string };
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const post = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/P1/${name}`, dataUrl }) });
    return r.ok ? `qa/tech/P1/${name}.png` : `失败 ${r.status}`;
  };

  async function values(scene: string, recipe?: string, extra: Record<string, unknown> = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { sceneMeta }] = await Promise.all([import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog')]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    let rec: Record<string, unknown> = {};
    try { rec = sceneMeta(scene).recommended ?? {}; } catch { rec = {}; }
    return {
      ...defaultValues(), ...(r?.values ?? {}), ...rec,
      'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none',
      ...extra,
    };
  }

  async function withEngine<T>(f: (eng: NonNullable<ReturnType<typeof import('../ui/engineRef').getEngine>>) => Promise<T>): Promise<T | null> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return null;
    const e = eng as unknown as { frozen: boolean };
    const wasFrozen = e.frozen;
    e.frozen = true;
    try { return await f(eng); } finally {
      e.frozen = wasFrozen;
      const [{ useStore }, feed] = await Promise.all([import('../state/store'), import('../ui/stage/engineFeed')]);
      eng.apply(useStore.getState().values);
      feed.setDraft(null);
    }
  }

  async function capture(eng: { apply(v: never): void; captureFrame(w: number, h: number, s: number): string }, c: Cell, w: number, h: number) {
    const { texturesPending, texturesReady } = await import('../engine/textures');
    eng.apply((await values(c.scene, c.recipe, c.extra)) as never);
    await texturesReady();
    // 镜头复位：带阻尼的轨道控制每次同步渲染都会再挪一点，不复位的话前后两张不可比
    const ec = eng as unknown as { resetCamera(): void; controls: { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: { set(a: number, b: number, c: number): void } } };
    ec.controls._sphericalDelta?.set(0, 0, 0);
    ec.controls._panOffset?.set(0, 0, 0);
    ec.resetCamera();
    let url = eng.captureFrame(w, h, 3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.captureFrame(w, h, 3); }
    return url;
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540) {
    return withEngine((eng) => capture(eng as never, { scene, recipe, extra }, w, h));
  }

  /** from：从第几格接着存（页面被别的轨道热重载打断后续跑） */
  async function save(name: string, cells: Cell[], w = 960, h = 540, from = 0) {
    return withEngine(async (eng) => {
      const out: string[] = [];
      for (let i = from; i < cells.length; i++) out.push(await post(`${name}_${i}`, await capture(eng as never, cells[i], w, h)));
      return out;
    });
  }

  /** crop = [x0, y0, x1, y1]（0~1）：只取画面的这一块放大（看线宽等细节） */
  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640, w = 1280, h = 720, crop: [number, number, number, number] = [0, 0, 1, 1]) {
    const shots = await withEngine(async (eng) => {
      const { RECIPE_MAP } = await import('../content/recipes');
      const out: { label: string; url: string }[] = [];
      for (const c of cells) {
        const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
        out.push({ label: c.label ?? `${c.scene} · ${r?.short ?? r?.name ?? c.recipe ?? '默认'}`, url: await capture(eng as never, c, w, h) });
      }
      return out;
    });
    if (!shots) return 'no engine';
    const cwp = (crop[2] - crop[0]) * w, chp = (crop[3] - crop[1]) * h;
    const ch = Math.round((cw * chp) / cwp), head = 24;
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * (ch + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + head);
      g.drawImage(await load(shots[i].url), crop[0] * w, crop[1] * h, cwp, chp, x, y + head, cw, ch);
      g.fillStyle = '#eee'; g.fillText(shots[i].label, x + 6, y + 17);
    }
    return post(name, cv.toDataURL('image/png'));
  }

  /**
   * 粗测：画布钉成 w×h、像素比 1，同一组参数连画 n 帧（不读回像素，最后 readPixels 一次等 GPU 做完），返回每帧平均毫秒。
   * 返回 [这组参数, 对照参数] 两个数：只看两者的差（扩展效果自己的开销）。
   */
  async function time(scene: string, recipe: string | undefined, extra: Record<string, unknown>, base: Record<string, unknown> = {}, n = 30, w = 1920, h = 1080) {
    return withEngine(async (eng) => {
      type E = { renderer: { getContext(): WebGL2RenderingContext; setPixelRatio(r: number): void; getPixelRatio(): number }; sizeOverride: { w: number; h: number } | null; resize(): void; renderFrame(): void; frameDt: number };
      const e = eng as unknown as E;
      const gl = e.renderer.getContext();
      const px = new Uint8Array(4);
      const dpr = e.renderer.getPixelRatio();
      e.sizeOverride = { w, h };
      e.renderer.setPixelRatio(1);
      e.resize();
      const run = async (ex: Record<string, unknown>) => {
        eng.apply((await values(scene, recipe, ex)) as never);
        e.frameDt = 0;
        for (let i = 0; i < 5; i++) e.renderFrame();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const t0 = performance.now();
        for (let i = 0; i < n; i++) e.renderFrame();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return +((performance.now() - t0) / n).toFixed(2);
      };
      try {
        const b0 = await run(base);
        const t = await run({ ...base, ...extra });
        const b1 = await run(base);
        return { on: t, off: (b0 + b1) / 2, cost: +(t - (b0 + b1) / 2).toFixed(2) };
      } finally {
        e.sizeOverride = null;
        e.renderer.setPixelRatio(dpr);
        e.resize();
      }
    });
  }

  /**
   * 把角色与云登记成物体空间笔触的动态源（引擎还没接 setDynamicSources 时的演示；见 docs/tech/track-P1.md「需要别的轨道做的事」）。
   * 每次 apply 换场景后要再调一次。返回登记了几个网格
   */
  async function dynStrokes() {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine() as unknown as { character?: { object: THREE.Object3D }; built?: { dynamics: { object: THREE.Object3D }[] }; pipeline: { strokes: { setDynamicSources(m: THREE.Mesh[]): void } } } | null;
    if (!eng) return 0;
    const out: THREE.Mesh[] = [];
    const add = (o?: THREE.Object3D) => o?.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh && (mm.material as THREE.Material).side !== 1 /* THREE.BackSide：描边外壳不要 */) out.push(mm); });
    add(eng.character?.object);
    for (const d of eng.built?.dynamics ?? []) add(d.object);
    eng.pipeline.strokes.setDynamicSources(out);
    return out.length;
  }

  /** 和 save 一样，但每格先登记动态笔触源（dynStrokes） */
  async function saveDyn(name: string, cells: Cell[], w = 960, h = 540) {
    return withEngine(async (eng) => {
      const { texturesPending, texturesReady } = await import('../engine/textures');
      const res: string[] = [];
      for (let i = 0; i < cells.length; i++) {
        eng.apply((await values(cells[i].scene, cells[i].recipe, cells[i].extra)) as never);
        await dynStrokes();
        await texturesReady();
        (eng as unknown as { resetCamera(): void }).resetCamera();
        let url = eng.captureFrame(w, h, 3);
        for (let k = 0; k < 3 && texturesPending(); k++) { await texturesReady(); url = eng.captureFrame(w, h, 3); }
        res.push(await post(`${name}_${i}`, url));
      }
      return res;
    });
  }

  devHooks({ techLines: { values, shot, save, sheet, time, dynStrokes, saveDyn } });
}

if (import.meta.hot) import.meta.hot.accept();
