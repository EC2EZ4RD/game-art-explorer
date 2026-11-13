/*
 * 技术补全 G（等距与 2.5D 场景）的开发钩子：__gae.techIso.*
 *
 *   __gae.techIso.values(scene, recipe?, extra?)              一张图交给引擎的参数（默认值 ⊕ 配方 ⊕ 场景推荐 ⊕ extra）
 *   await __gae.techIso.shot(scene, recipe?, extra?, w?, h?)    同步渲一张（画框临时钉成 w×h），返回 PNG dataURL
 *   await __gae.techIso.sheet(name, cells, cols?, cw?)          拼成接触表 → qa/tech/G/<name>.png（每格可带 w / h：不同画框比例按同一高度排）
 *   await __gae.techIso.qa(ids?)                                每个场景 3 个配方（16:9）+ 4:3 / 手机竖屏 / 手机横屏 → qa/tech/G/scene_<id>.png
 *   __gae.techIso.info()                                        镜头、角色、挂点（交互点 / 目标）
 *   await __gae.techIso.walk(scene, keys, seconds?)             按住方向键模拟走一段（后台标签页没有 rAF），返回走到哪
 *
 * 渲染不经过 store（不写撤销、不写存档）；渲完把 store 里的参数重新交给引擎。只在开发环境有效，请在自己的后台标签页里跑。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string; w?: number; h?: number; at?: [number, number] };
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  // 让出一下（MessageChannel：后台标签页里 setTimeout 会被节流到很慢）
  const tick = () => new Promise<void>((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); });
  const post = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/G/${name}`, dataUrl }) });
    return r.ok ? `qa/tech/G/${name}.png` : `失败 ${r.status}`;
  };

  async function values(scene: string, recipe?: string, extra: Record<string, unknown> = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { sceneMeta }] = await Promise.all([import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog')]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    return {
      ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(scene).recommended ?? {}),
      'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none',
      ...extra,
    };
  }

  type Eng = {
    apply(v: never): void; resetCamera(): void; renderSync(s: number): string; renderer: { domElement: HTMLCanvasElement };
    charState: { pos: { x: number; y: number; z: number }; facing: number }; desc?: { ground?: { heightAt(x: number, z: number): number } };
  };

  /** 把画框 host 钉成 w×h 跑 f（跟拍的镜头按这个比例夹住），完了还原、让外壳重新喂引擎 */
  async function pinned<T>(w: number, h: number, f: (e: Eng) => Promise<T>): Promise<T | null> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine() as unknown as Eng | null;
    if (!eng) return null;
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prev = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    host.style.cssText = `${prev};width:${w}px !important;height:${h}px !important;min-width:${w}px !important;min-height:${h}px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    try { return await f(eng); } finally {
      host.style.cssText = prev;
      priv.resize();
      const [{ useStore }, feed] = await Promise.all([import('../state/store'), import('../ui/stage/engineFeed')]);
      (eng as unknown as { apply(v: unknown): void }).apply(useStore.getState().values);
      feed.setDraft(null);
    }
  }

  /** 套参数 → （可选）把玩家挪到 at → 镜头复位 → 同步渲（素材贴图第一次用到时等下载完再渲，最多 3 轮） */
  async function render(e: Eng, c: Cell): Promise<string> {
    const { texturesPending, texturesReady } = await import('../engine/textures');
    e.apply((await values(c.scene, c.recipe, c.extra)) as never);
    if (c.at) {
      e.charState.pos.x = c.at[0]; e.charState.pos.z = c.at[1];
      e.charState.pos.y = e.desc?.ground?.heightAt(c.at[0], c.at[1]) ?? 0;
    }
    e.resetCamera();
    await texturesReady();
    let url = e.renderSync(3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = e.renderSync(3); }
    return url;
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540) {
    return pinned(w, h, (e) => render(e, { scene, recipe, extra }));
  }

  /** 接触表：每格按自己的画框比例渲（默认 960×540），按同一个格高排，一行装不下就换行 */
  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const { RECIPE_MAP } = await import('../content/recipes');
    const { sceneMeta } = await import('../content/sceneCatalog');
    const ch = Math.round((cw * 9) / 16), head = 24;
    const shots: { label: string; url: string | null; w: number; h: number }[] = [];
    for (const c of cells) {
      const w = c.w ?? 960, h = c.h ?? 540;
      const url = await pinned(w, h, (e) => render(e, c));
      const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
      shots.push({ label: c.label ?? `${sceneMeta(c.scene).name} · ${r?.short ?? r?.name ?? c.recipe ?? '默认'}${w * 9 !== h * 16 ? ` · ${w}×${h}` : ''}`, url, w, h });
      await tick();
    }
    // 排版：按格高 ch 等比缩放，每行最多 cols 个 16:9 宽
    const maxW = cols * cw;
    const place: { x: number; y: number; w: number }[] = [];
    let x = 0, y = 0;
    for (const s of shots) {
      const w = Math.round((s.w / s.h) * ch);
      if (x > 0 && x + w > maxW + cols * 4) { x = 0; y += ch + head; }
      place.push({ x, y, w });
      x += w + 4;
    }
    const cv = document.createElement('canvas');
    cv.width = maxW + cols * 4; cv.height = y + ch + head;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '14px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const p = place[i], s = shots[i];
      if (s.url) g.drawImage(await load(s.url), p.x, p.y + head, p.w, ch);
      else { g.fillStyle = '#633'; g.fillRect(p.x, p.y + head, p.w, ch); }
      g.fillStyle = '#eee'; g.fillText(s.label, p.x + 6, p.y + 17, Math.max(60, p.w - 8));
    }
    return post(name, cv.toDataURL('image/png'));
  }

  /** 每个场景挑 3 个彼此差得远、又和场景气质相配的配方 */
  const QA_RECIPES: Record<string, string[]> = {
    'iso-city': ['tile-pixel', 'lowpoly-geo', 'watercolor'],
    'iso-dungeon': ['comic-ink-3d', 'glow-pixel', 'oil'],
    'hd2d-town': ['hd2d-sprite', 'watercolor', 'toy-diorama'],
    'oblique-village': ['tile-pixel', 'cel-anime', 'gouache'],
    'iso-illusion': ['lowpoly-geo', 'geo-blocks', 'cel-anime'],
    'iso-cutaway': ['toy-diorama', 'gongbi', 'cel-anime'],
  };
  async function qa(ids?: string[]) {
    const { ISO_SCENES } = await import('../content/scenes25d/iso');
    const all = ids?.length ? ids : ISO_SCENES.map((s) => s.id);
    const out: string[] = [];
    for (const id of all) {
      const rs = QA_RECIPES[id] ?? ['lowpoly-geo', 'pixel3d', 'watercolor'];
      out.push(String(await sheet(`scene_${id}`, [
        ...rs.map((recipe) => ({ scene: id, recipe })),
        { scene: id, recipe: rs[0], w: 720, h: 540 },
        { scene: id, recipe: rs[1], w: 250, h: 540 },
        { scene: id, recipe: rs[2], w: 1170, h: 540 },
      ], 3, 640)));
    }
    return out;
  }

  async function info() {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as {
      desc?: { camera?: unknown; actors?: { kind: string; label: string }[] }; camera: { type: string; position: { x: number; y: number; z: number } };
      controls: { target: { x: number; y: number; z: number } }; charState: { pos: { x: number; y: number; z: number } };
      world: { poi?: { label: string } | null; target?: { label: string; on?: boolean } | null; player?: { x: number; y: number } | null } | null; built?: { triangles: number };
    } | null;
    if (!e) return 'no engine';
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      rig: e.desc?.camera ?? null, camera: e.camera.type, pos: [r(e.camera.position.x), r(e.camera.position.y), r(e.camera.position.z)],
      target: [r(e.controls.target.x), r(e.controls.target.y), r(e.controls.target.z)], player: [r(e.charState.pos.x), r(e.charState.pos.y), r(e.charState.pos.z)],
      actors: e.desc?.actors?.map((a) => `${a.kind}:${a.label}`) ?? [], poi: e.world?.poi?.label ?? null, target2: e.world?.target ? `${e.world.target.label}${e.world.target.on === false ? '（画面外）' : ''}` : null,
      triangles: e.built?.triangles ?? 0,
    };
  }

  /** 按住方向键走 seconds 秒（固定步长调引擎的走路步进），返回起点与终点 */
  async function walk(scene: string, keys: string[] = ['arrowright'], seconds = 4) {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as { apply(v: never): void; pressed: Set<string>; stepCharacter(dt: number): void; charState: { pos: { x: number; y: number; z: number } } } | null;
    if (!e) return 'no engine';
    e.apply((await values(scene)) as never);
    const p0 = { ...e.charState.pos };
    e.pressed.clear(); keys.forEach((k) => e.pressed.add(k));
    for (let i = 0; i < seconds * 60; i++) e.stepCharacter(1 / 60);
    e.pressed.clear();
    const r = (n: number) => Math.round(n * 10) / 10;
    return { from: [r(p0.x), r(p0.y), r(p0.z)], to: [r(e.charState.pos.x), r(e.charState.pos.y), r(e.charState.pos.z)] };
  }

  devHooks({ techIso: { values, shot, sheet, qa, info, walk, QA_RECIPES } });
}

if (import.meta.hot) import.meta.hot.accept();
