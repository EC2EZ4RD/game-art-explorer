/*
 * 技术补全收尾（轨道 X：修复 + 对照图）的开发钩子：__gae.techX.*
 *
 *   await __gae.techX.vals(scene, recipe?, extra?, opt?)   一张图交给引擎的参数（默认值 ⊕ 场景推荐 ⊕ 配方 ⊕ 场景说了算的镜头 / 光照键 ⊕ extra）
 *   await __gae.techX.shot(values, w?, h?, t?)              同步渲一张（镜头复位、清阻尼、动画时间钉在 t 秒；不动 DOM），返回 PNG dataURL
 *   await __gae.techX.run(prefix, cells, w?, h?)            逐格渲染并存 qa/<prefix>/<name>.png；整页刷新后用同一个 prefix 再调会接着跑
 *   await __gae.techX.uiShot(name, sceneId, recipe?)        场景图库的场景（默认 UI、UI 模式画框 1031×580）存 qa/<name>.png
 *
 * 渲染不经过 store（uiShot 除外，它走「点场景卡」的同一条路）；渲完把 store 里的参数重新交给引擎。只在开发环境有效，请在自己的后台标签页里跑。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { name: string; scene?: string; recipe?: string; extra?: Record<string, unknown>; values?: Record<string, unknown>; t?: number; w?: number; h?: number; showcase?: boolean };
  const save = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl }) });
    return r.ok ? `qa/${name}.png` : `失败 ${r.status}`;
  };

  /** 默认值 ⊕ 场景推荐 ⊕ 配方 ⊕ 场景的镜头 / 光照键（和点场景卡、缩略图同一个合成）⊕ extra（最后，可以盖过场景键） */
  async function vals(scene?: string, recipe?: string, extra: Record<string, unknown> = {}, opt: { showcase?: boolean } = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { is2dScene, sceneMeta }, { isSceneLightKey }, { showcaseScene }, { hasSceneBuilder }] = await Promise.all([
      import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog'), import('../state/layers'), import('../content/taxonomy'), import('../engine/scene/sceneRegistry'),
    ]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    const sc = scene ?? (r ? showcaseScene(r, hasSceneBuilder) : 'sandbox');
    const rec = is2dScene(sc) ? sceneMeta(sc).recommended ?? {} : {};
    const rig = Object.fromEntries(Object.entries(rec).filter(([k]) => ['camera.projection', 'camera.angle', 'camera.azimuth', 'camera.fov', 'camera.zoom', 'camera.mode'].includes(k) || isSceneLightKey(k)));
    const ov = opt.showcase && r?.showcase?.overrides ? r.showcase.overrides : {};
    return { ...defaultValues(), ...rec, ...(r?.values ?? {}), ...ov, ...rig, 'game.scene': sc, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none', ...extra };
  }

  type Eng = { apply(v: never): void; captureFrame(w: number, h: number, s: number): string; resetCamera(): void; controls: { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: { set(a: number, b: number, c: number): void }; update(dt: number): void }; simTime: number; stepTime: number; frozen: boolean };

  async function withEngine<T>(f: (eng: Eng) => Promise<T>): Promise<T | null> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine() as unknown as Eng | null;
    if (!eng) return null;
    const wasFrozen = eng.frozen;
    eng.frozen = true;
    try { return await f(eng); } finally {
      eng.frozen = wasFrozen;
      const [{ useStore }] = await Promise.all([import('../state/store')]);
      eng.apply(useStore.getState().values as never);
    }
  }

  async function capture(eng: Eng, v: Record<string, unknown>, w: number, h: number, t: number) {
    const { texturesPending, texturesReady } = await import('../engine/textures');
    eng.apply(v as never);
    await texturesReady();
    eng.apply(v as never);
    // 镜头复位 + 清 OrbitControls 的阻尼残量（上一张留下的旋转 / 平移惯性），动画时间钉住：同一组参数每次拍出来一样
    eng.controls._sphericalDelta?.set(0, 0, 0);
    eng.controls._panOffset?.set(0, 0, 0);
    eng.resetCamera();
    eng.simTime = t; eng.stepTime = t;
    let url = eng.captureFrame(w, h, 3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.captureFrame(w, h, 3); }
    return url;
  }

  async function shot(v: Record<string, unknown>, w = 960, h = 540, t = 4) {
    return withEngine((eng) => capture(eng, v, w, h, t));
  }

  /** 逐格渲染、逐格存（别的轨道整页刷新也不丢：已存的格子记在 sessionStorage，再调同一个 prefix 接着跑） */
  async function run(prefix: string, cells: Cell[], w = 960, h = 540) {
    const KEY = `gae.techX.${prefix}`;
    const done = new Set<string>(JSON.parse(sessionStorage.getItem(KEY) ?? '[]'));
    const out: string[] = [];
    await withEngine(async (eng) => {
      for (const c of cells) {
        if (done.has(c.name)) continue;
        const v = c.values ?? await vals(c.scene, c.recipe, c.extra ?? {}, { showcase: c.showcase });
        const url = await capture(eng, v, c.w ?? w, c.h ?? h, c.t ?? 4);
        out.push(await save(`${prefix}/${c.name}`, url));
        done.add(c.name);
        sessionStorage.setItem(KEY, JSON.stringify([...done]));
      }
    });
    return out;
  }
  function reset(prefix: string) { sessionStorage.removeItem(`gae.techX.${prefix}`); }

  /** 场景图库的一个场景：和点场景卡一样（建议配方 + 默认皮肤 + 默认界面），UI 模式画框钉 1031×580，动画时间钉住 */
  async function uiShot(name: string, sceneId: string, recipe?: string, t = 4) {
    const [A, { GAME_SCENES }, SA, { getEngine }, { texturesReady }, shell, { RECIPE_MAP }] = await Promise.all([
      import('../state/actions'), import('../content/gameScenes'), import('../ui/scene/sceneActions'),
      import('../ui/engineRef'), import('../engine/textures'), import('../ui/stage/shell'), import('../content/recipes'),
    ]);
    const eng = getEngine() as unknown as (Eng & { renderer: { domElement: HTMLCanvasElement }; renderSync(n: number): string; resize(): void }) | null;
    if (!eng) return 'no engine';
    const sc = GAME_SCENES.find((x) => x.id === sceneId);
    if (!sc) return `没有场景 ${sceneId}`;
    shell.setMode('ui');
    shell.useShell.getState().set({ uiRail: true, focus: false, zoom: 'fit' });
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prevCss = host.style.cssText;
    const pin = () => { host.style.cssText = `${prevCss};width:1031px !important;height:580px !important;min-width:1031px !important;min-height:580px !important;max-width:none !important;max-height:none !important;flex:none !important`; eng.resize(); };
    try {
      A.applySkin(null);
      const r = RECIPE_MAP.get(recipe ?? sc.look ?? '');
      if (r) A.applyRecipe(r, { keepMine: false });
      await SA.pickGameScene(sc);
      A.applySkin(null);
      await new Promise((res) => setTimeout(res, 120));
      pin();
      await texturesReady();
      eng.controls._sphericalDelta?.set(0, 0, 0);
      eng.controls._panOffset?.set(0, 0, 0);
      eng.resetCamera();
      eng.simTime = t; eng.stepTime = t;
      eng.renderSync(2);
      await new Promise((res) => setTimeout(res, 60));
      eng.simTime = t; eng.stepTime = t;
      const url = eng.renderSync(3);
      return await save(name, url);
    } finally {
      host.style.cssText = prevCss;
      eng.resize();
    }
  }

  devHooks({ techX: { vals, shot, run, reset, uiShot, save } });
}

if (import.meta.hot) import.meta.hot.accept();
