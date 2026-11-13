/*
 * 技术补全 K 轨道（伪 3D 与复古镜头）的开发钩子：__gae.techK.*（约定见同目录 README.md）
 *
 *   await __gae.techK.shot(scene, recipe?, extra?, w?, h?)        同步渲一张（不经过 store），返回 PNG dataURL
 *   await __gae.techK.sheet(name, cells, cols?, cw?)              拼成接触表 → qa/tech/K/<name>.png；cell = { scene, recipe?, extra?, label?, drive? }
 *   await __gae.techK.aspects(name, scenes, recipe?)              每个场景按 16:9 / 4:3 / 9:19.5 各渲一张拼成一行 → qa/tech/K/<name>.png
 *   await __gae.techK.drive(seconds, keys)                        按住几个键模拟走 / 开几秒（后台标签页不跑 rAF，直接步进引擎）
 *   __gae.techK.info()                                            镜头、玩家、粒子
 *   await __gae.techK.save(name, dataUrl)                         存一张图到 qa/tech/K/
 *
 * cell.drive = [秒, 键…]：渲之前先模拟开 / 走一段（看追尾镜头、弯道、第一人称转身）。
 * 只在开发环境有效；请在自己的后台标签页里跑（会改这一页的画面），完了让外壳重新喂一次引擎。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const tick = () => new Promise((res) => setTimeout(res, 0));

  async function values(scene: string, recipe?: string, extra: Record<string, unknown> = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { sceneMeta }] = await Promise.all([import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog')]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    return {
      ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(scene).recommended ?? {}),
      'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none',
      ...extra,
    };
  }

  async function settled(): Promise<string | null> {
    const [{ getEngine }, { texturesPending, texturesReady }] = await Promise.all([import('../ui/engineRef'), import('../engine/textures')]);
    const eng = getEngine();
    if (!eng) return null;
    await texturesReady();
    let url = eng.renderSync(3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.renderSync(3); }
    return url;
  }

  async function pinned<T>(w: number, h: number, f: () => Promise<T>): Promise<T | string> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prev = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    host.style.cssText = `${prev};width:${w}px !important;height:${h}px !important;min-width:${w}px !important;min-height:${h}px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    try { return await f(); } finally {
      host.style.cssText = prev;
      priv.resize();
      const [{ useStore }, feed] = await Promise.all([import('../state/store'), import('../ui/stage/engineFeed')]);
      eng.apply(useStore.getState().values);
      feed.setDraft(null);
    }
  }

  type Priv = { pressed: Set<string>; stepCharacter(dt: number): void; renderSync(n: number): string; simTime: number; stepTime: number; charState: { pos: { x: number; y: number; z: number }; facing: number }; frozen: boolean };

  /** 按住 keys 模拟 seconds 秒（每步 1/60 秒：走路 + 动画时间一起推进；镜头最后直接摆到位） */
  async function drive(seconds: number, keys: string[]) {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as Priv | null;
    if (!e) return 'no engine';
    e.pressed.clear();
    for (const k of keys) e.pressed.add(k);
    for (let i = 0; i < Math.round(seconds * 60); i++) { e.simTime += 1 / 60; e.stepTime = e.simTime; e.stepCharacter(1 / 60); }
    e.pressed.clear();
    const p = e.charState.pos;
    return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, z: Math.round(p.z * 100) / 100, facing: Math.round(e.charState.facing * 100) / 100 };
  }

  /** 动画时间拨到 t 秒（程序动画、粒子、弹幕都按它；截图前用） */
  async function at(t: number) {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as Priv | null;
    if (!e) return;
    e.simTime = t; e.stepTime = t;
  }

  type Step = [number, ...string[]];
  /** drive：一段 [秒, 键…]，或几段依次走（[[2.4, 'w'], [0.9, 'a']] = 先往前走再左转） */
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string; drive?: Step | Step[]; t?: number };

  async function render(c: Cell): Promise<string | null> {
    const { getEngine } = await import('../ui/engineRef');
    getEngine()!.apply((await values(c.scene, c.recipe, c.extra)) as never);
    if (c.drive) for (const st of (Array.isArray(c.drive[0]) ? c.drive : [c.drive]) as Step[]) await drive(st[0], st.slice(1) as string[]);
    await at(c.t ?? 2.5);
    return settled();
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540): Promise<string | null> {
    const r = await pinned(w, h, () => render({ scene, recipe, extra }));
    return typeof r === 'string' && r.startsWith('data:') ? r : null;
  }

  async function save(name: string, dataUrl: string) {
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/K/${name}`, dataUrl }) });
    return res.ok ? `saved qa/tech/K/${name}.png` : await res.text();
  }

  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const ch = Math.round((cw * 9) / 16), head = 26;
    const shots: { label: string; url: string | null }[] = [];
    const out = await pinned(960, 540, async () => {
      const { RECIPE_MAP } = await import('../content/recipes');
      const { sceneMeta } = await import('../content/sceneCatalog');
      for (const c of cells) {
        const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
        shots.push({ label: c.label ?? `${sceneMeta(c.scene).name} · ${r?.short ?? r?.name ?? c.recipe ?? '默认'}`, url: await render(c) });
        await tick();
      }
      return 'ok';
    });
    if (out !== 'ok') return out;
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * (ch + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + head);
      const s = shots[i];
      if (s.url) g.drawImage(await load(s.url), x, y + head, cw, ch); else { g.fillStyle = '#633'; g.fillRect(x, y + head, cw, ch); }
      g.fillStyle = '#eee'; g.fillText(s.label, x + 6, y + 18);
    }
    return save(name, cv.toDataURL('image/png'));
  }

  /**
   * 逐张存（别的轨道改文件会触发整页刷新，长脚本会被打断）：每格渲完立刻存成 qa/tech/K/cells/<prefix>__<序号>.png，
   * 拼图交给 scripts 外的 Python（scratchpad 里的 compose 脚本）。from = 从第几格接着渲
   */
  async function cells(prefix: string, list: (Cell & { w?: number; h?: number })[], from = 0) {
    const done: number[] = [];
    for (let i = from; i < list.length; i++) {
      const c = list[i];
      const r = await pinned(c.w ?? 960, c.h ?? 540, () => render(c));
      if (typeof r === 'string' && r.startsWith('data:')) { await save(`cells/${prefix}__${i}`, r); done.push(i); }
      await tick();
    }
    return done;
  }

  /** 画框比例：16:9、4:3、手机竖屏 9:19.5（不裁，按同一高度拼一行） */
  async function aspects(name: string, scenes: string[], recipe?: string, sizes: [number, number][] = [[960, 540], [720, 540], [250, 540]], extra: Record<string, unknown> = {}) {
    const H = 320, head = 22;
    const rows: { label: string; urls: (string | null)[] }[] = [];
    for (const sc of scenes) {
      const urls: (string | null)[] = [];
      for (const [w, h] of sizes) {
        const r = await pinned(w, h, () => render({ scene: sc, recipe, extra }));
        urls.push(typeof r === 'string' && r.startsWith('data:') ? r : null);
        await tick();
      }
      rows.push({ label: `${sc} · ${recipe ?? '默认'}`, urls });
    }
    const ws = sizes.map(([w, h]) => Math.round((w / h) * H));
    const cv = document.createElement('canvas');
    cv.width = ws.reduce((a, b) => a + b + 6, 0); cv.height = rows.length * (H + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height); g.font = '14px sans-serif';
    for (let r = 0; r < rows.length; r++) {
      let x = 0;
      g.fillStyle = '#eee'; g.fillText(rows[r].label, 6, r * (H + head) + 16);
      for (let c = 0; c < sizes.length; c++) {
        const u = rows[r].urls[c];
        if (u) g.drawImage(await load(u), x, r * (H + head) + head, ws[c], H);
        x += ws[c] + 6;
      }
    }
    return save(name, cv.toDataURL('image/png'));
  }

  async function info() {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as { camera: { type: string; position: { x: number; y: number; z: number }; fov?: number }; controls: { target: { x: number; y: number; z: number }; enabled: boolean }; charState: { pos: { x: number; y: number; z: number }; facing: number }; props: unknown[]; world: { target?: { label: string } | null; poi?: { label: string } | null } | null } | null;
    if (!e) return 'no engine';
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      camera: e.camera.type, fov: e.camera.fov, pos: [r(e.camera.position.x), r(e.camera.position.y), r(e.camera.position.z)], target: [r(e.controls.target.x), r(e.controls.target.y), r(e.controls.target.z)],
      controls: e.controls.enabled, player: [r(e.charState.pos.x), r(e.charState.pos.y), r(e.charState.pos.z), r(e.charState.facing)], props: e.props.length,
      worldTarget: e.world?.target?.label ?? null, poi: e.world?.poi?.label ?? null,
    };
  }

  devHooks({ techK: { shot, sheet, cells, aspects, drive, at, info, save, values } });
}

if (import.meta.hot) import.meta.hot.accept();
