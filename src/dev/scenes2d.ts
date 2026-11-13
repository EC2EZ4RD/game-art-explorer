/*
 * 轨道 F 的开发钩子（docs/workbench-redesign.md §9.1 / §11.1；约定见同目录 README.md）：__gae.scenes2d.*
 *
 *   __gae.scenes2d.list()                              2D 场景 id（有构建器的）
 *   await __gae.scenes2d.shot('sideStage', 'watercolor', extra?)   同步渲一张（不经过 store），返回 PNG dataURL
 *   await __gae.scenes2d.sheet('side', [{ scene, recipe, extra?, label? }, …], cols?)   拼成接触表 → qa/redesign/F/<name>.png
 *   await __gae.scenes2d.qa()                          每个 2D 场景 × 3 个配方，各存一张接触表（qa/redesign/F/scene_<id>.png）
 *   __gae.scenes2d.info()                              引擎现在的镜头（rig、视差、DPR、暂停原因）、世界挂点（交互点 / 目标 / 格子）
 *   __gae.scenes2d.values(scene, recipe?, extra?)      一张图交给引擎的参数（默认值 ⊕ 配方 ⊕ 场景推荐 ⊕ extra）
 *   await __gae.scenes2d.aspects(name, scenes, recipe?)  每个场景按 16:9 / 19.5:9 / 9:19.5 / 4:3 各渲一张拼成一行（画框比例自检）
 *   await __gae.scenes2d.walk(scene?, seconds?, seed?)   横版按住左右走一遍（模拟步进），看走到多远、跳了几次
 *   await __gae.scenes2d.snapCheck(scene?, recipe?)      像素横版每带相对吸附后相机的小数像素（应为 0）
 *
 * 渲染不经过 store：直接把参数交给引擎同步渲染（不写撤销、不写存档，不影响别的标签页）；期间把画框 host 临时钉成 w×h，完了还原并让外壳重新喂一次引擎。
 * 只在开发环境有效；请在自己的后台标签页里跑（会改这一页的画面）。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const tick = () => new Promise((res) => setTimeout(res, 0));

  async function list(): Promise<string[]> {
    const [{ SCENES }, { hasSceneBuilder }] = await Promise.all([import('../content/sceneCatalog'), import('../engine/scene/sceneRegistry')]);
    return SCENES.filter((s) => s.group === '2D' && hasSceneBuilder(s.id)).map((s) => s.id);
  }

  async function values(scene: string, recipe?: string, extra: Record<string, unknown> = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { sceneMeta }] = await Promise.all([import('../dims/registry'), import('../content/recipes'), import('../content/sceneCatalog')]);
    const r = recipe ? RECIPE_MAP.get(recipe) : undefined;
    return {
      ...defaultValues(), ...(r?.values ?? {}), ...(sceneMeta(scene).recommended ?? {}),
      'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false, 'hud.style': 'none',
      ...extra,
    };
  }

  /** 引擎同步渲染（素材贴图第一次用到时等下载完再渲一遍，最多 3 轮） */
  async function settled(): Promise<string | null> {
    const [{ getEngine }, { texturesPending, texturesReady }] = await Promise.all([import('../ui/engineRef'), import('../engine/textures')]);
    const eng = getEngine();
    if (!eng) return null;
    await texturesReady();
    let url = eng.renderSync(3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = eng.renderSync(3); }
    return url;
  }

  /** 把画框 host 钉成 w×h 跑 f，完了还原、让外壳重新喂引擎 */
  async function pinned<T>(w: number, h: number, f: () => Promise<T>): Promise<T | string> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prev = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    const pin = () => { host.style.cssText = `${prev};width:${w}px !important;height:${h}px !important;min-width:${w}px !important;min-height:${h}px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`; priv.resize(); };
    pin();
    try { return await f(); } finally {
      host.style.cssText = prev;
      priv.resize();
      const [{ useStore }, feed] = await Promise.all([import('../state/store'), import('../ui/stage/engineFeed')]);
      eng.apply(useStore.getState().values);
      feed.setDraft(null);
    }
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540): Promise<string | null> {
    const r = await pinned(w, h, async () => {
      const { getEngine } = await import('../ui/engineRef');
      getEngine()!.apply((await values(scene, recipe, extra)) as never);
      return settled();
    });
    return typeof r === 'string' && r.startsWith('data:') ? r : null;
  }

  /** x：把玩家挪到这个 x（横版看跟拍与视差），挪完镜头复位 */
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string; x?: number };
  async function placePlayer(x?: number) {
    if (x === undefined) return;
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as { charState: { pos: { x: number; y: number; z: number } }; desc?: { ground?: { heightAt(x: number, z: number): number } }; resetCamera(): void };
    e.charState.pos.x = x;
    e.charState.pos.y = e.desc?.ground?.heightAt(x, e.charState.pos.z) ?? 0;
    e.resetCamera();
  }
  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const ch = Math.round((cw * 9) / 16), head = 26;
    const shots: { label: string; url: string | null }[] = [];
    const out = await pinned(960, 540, async () => {
      const { getEngine } = await import('../ui/engineRef');
      const { RECIPE_MAP } = await import('../content/recipes');
      const { sceneMeta } = await import('../content/sceneCatalog');
      for (const c of cells) {
        getEngine()!.apply((await values(c.scene, c.recipe, c.extra)) as never);
        await placePlayer(c.x);
        const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
        shots.push({ label: c.label ?? `${sceneMeta(c.scene).name} · ${r?.short ?? r?.name ?? c.recipe ?? '默认'}`, url: await settled() });
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
      if (s.url) {
        const im = await load(s.url);
        // 居中裁 16:9
        const ar = 16 / 9; let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
        if (sw / sh > ar) { const nw = sh * ar; sx = (sw - nw) / 2; sw = nw; } else { const nh = sw / ar; sy = (sh - nh) / 2; sh = nh; }
        g.drawImage(im, sx, sy, sw, sh, x, y + head, cw, ch);
      } else { g.fillStyle = '#633'; g.fillRect(x, y + head, cw, ch); }
      g.fillStyle = '#eee'; g.fillText(s.label, x + 6, y + 18);
    }
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `redesign/F/${name}`, dataUrl: cv.toDataURL('image/png') }) });
    return res.ok ? `saved qa/redesign/F/${name}.png` : await res.text();
  }

  /** 每个 2D 场景 × 3 个配方（挑和这个场景气质相配、且彼此差得远的三个） */
  const QA_RECIPES: Record<string, string[]> = {
    sideStage: ['glow-layers', 'layered-silhouette', 'watercolor', 'pixel3d', 'cel-anime', 'lowpoly-geo'],
    'sideStage-cave': ['moebius', 'glow-pixel', 'ink-block'],
    'sideStage-ruins': ['glow-pixel', 'theatre-cold', 'bold-outline'],
    'sideStage-shanshui': ['ink-landscape', 'gongbi', 'poster'],
    tileTown: ['tile-pixel', 'hd2d-sprite', 'deco-storybook'],
    'tileTown-farm': ['tile-pixel', 'watercolor', 'lowpoly-geo'],
    'tileTown-field': ['coarse-pixel', 'cel-anime', 'voxel'],
    tacticsBoard: ['pixel3d', 'geo-blocks', 'toy-diorama'],
    backdrop: ['watercolor', 'manga-halftone', 'riso'],
    'backdrop-title': ['oil', 'pixel3d', 'noir'],
    'backdrop-battle': ['oil', 'ink-block', 'onebit'],
    'backdrop-shop': ['gouache', 'pixel3d', 'woodcut'],
    'backdrop-clue': ['noir', 'pen-crosshatch', 'cel-anime'],
    'backdrop-desk': ['watercolor', 'ps1', 'gameboy'],
    'backdrop-cards': ['vhs-tape', 'cel-anime', 'pixel3d'],
    greybox: ['geo-blocks', 'neon-vector', 'lowpoly-geo'],
    'greybox-arena': ['neon-vector', 'geo-blocks', 'riso'],
  };
  async function qa(ids?: string[]) {
    const all = ids?.length ? ids : await list();
    const out: string[] = [];
    for (const id of all) out.push(String(await sheet(`scene_${id}`, (QA_RECIPES[id] ?? ['inspiration-fixed', 'watercolor', 'pixel3d']).map((recipe) => ({ scene: id, recipe })), 3, 640)));
    return out;
  }

  async function info() {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine() as unknown as Record<string, unknown> | null;
    if (!eng) return 'no engine';
    const e = eng as unknown as {
      desc?: { camera?: unknown; actors?: unknown[]; grid?: unknown; layers?: unknown[] }; parallaxOn: boolean; pixelRatio: unknown; orbitLockReasons: string[];
      camera: { type: string; position: { x: number; y: number; z: number } }; controls: { target: { x: number; y: number; z: number }; enableRotate: boolean; enablePan: boolean };
      world: { poi?: { label: string; x: number; y: number } | null; target?: { label: string; x: number; y: number } | null; player?: { x: number; y: number } | null; grid?: unknown } | null;
    };
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      rig: e.desc?.camera ?? null, camera: e.camera.type, pos: [r(e.camera.position.x), r(e.camera.position.y), r(e.camera.position.z)], target: [r(e.controls.target.x), r(e.controls.target.y), r(e.controls.target.z)],
      rotate: e.controls.enableRotate, pan: e.controls.enablePan, parallax: e.parallaxOn, layers: e.desc?.layers?.length ?? 0, actors: e.desc?.actors?.length ?? 0,
      dpr: e.pixelRatio, orbitLocks: e.orbitLockReasons,
      poi: e.world?.poi ? `${e.world.poi.label} @ ${r(e.world.poi.x)},${r(e.world.poi.y)}` : null,
      target2: e.world?.target ? `${e.world.target.label} @ ${r(e.world.target.x)},${r(e.world.target.y)}` : null,
      player: e.world?.player ? [r(e.world.player.x), r(e.world.player.y)] : null,
      grid: e.world?.grid ?? null,
    };
  }

  /**
   * 格子对齐自检（§9.1 验收「战棋格子和 moveRange 对齐」）：渲一帧棋盘，把引擎导出的 WorldView.grid（玩家脚下一格 + 两条格轴）
   * 画成整张 8 × 8 的格线叠在截图上，再把 actors 的挂点画成圆点 → qa/redesign/F/<name>.png
   */
  async function gridCheck(recipe = 'geo-blocks', name = 'tactics_grid_check') {
    const out = await pinned(960, 540, async () => {
      const { getEngine } = await import('../ui/engineRef');
      const eng = getEngine()!;
      eng.apply((await values('tacticsBoard', recipe)) as never);
      const url = await settled();
      const w = eng.world as unknown as { grid?: { o: { x: number; y: number }; u: [number, number]; v: [number, number]; at: [number, number]; size: [number, number] }; all: { x: number; y: number; kind: string; label: string }[] } | null;
      if (!url || !w?.grid) return 'no grid';
      const im = await load(url);
      const cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const g = cv.getContext('2d')!;
      g.drawImage(im, 0, 0);
      const k = im.naturalWidth / (eng.renderer.domElement.parentElement as HTMLElement).clientWidth;
      const G = w.grid, P = (i: number, j: number) => [(G.o.x + (i - G.at[0]) * G.u[0] + (j - G.at[1]) * G.v[0]) * k, (G.o.y + (i - G.at[0]) * G.u[1] + (j - G.at[1]) * G.v[1]) * k];
      g.strokeStyle = '#00ffd0'; g.lineWidth = 2;
      for (let i = 0; i <= G.size[0]; i++) { const [a, b] = P(i - 0.5, -0.5), [c, d] = P(i - 0.5, G.size[1] - 0.5); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      for (let j = 0; j <= G.size[1]; j++) { const [a, b] = P(-0.5, j - 0.5), [c, d] = P(G.size[0] - 0.5, j - 0.5); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      const [ox, oy] = P(G.at[0], G.at[1]);
      g.fillStyle = '#ff2a6d'; g.beginPath(); g.arc(ox, oy, 6, 0, Math.PI * 2); g.fill();
      g.font = '14px sans-serif';
      for (const q of w.all) { if (!['enemy', 'boss', 'ally', 'objective'].includes(q.kind)) continue; g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(q.x * k, q.y * k, 4, 0, Math.PI * 2); g.fill(); g.fillText(q.label, q.x * k + 6, q.y * k - 4); }
      const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `redesign/F/${name}`, dataUrl: cv.toDataURL('image/png') }) });
      return res.ok ? `saved qa/redesign/F/${name}.png` : await res.text();
    });
    return out;
  }

  /**
   * 画框比例自检（审查修复 2）：每个场景按几种比例各渲一张（不裁），按同一个高度拼成一行 → qa/redesign/F/<name>.png。
   * sizes 默认：16:9、19.5:9（手机横屏）、9:19.5（手机竖屏）、4:3
   */
  async function aspects(name: string, scenes: string[], recipe?: string, sizes: [number, number][] = [[960, 540], [1170, 540], [250, 540], [720, 540]]) {
    const H = 300, head = 22;
    const rows: { label: string; urls: (string | null)[] }[] = [];
    for (const sc of scenes) {
      const urls: (string | null)[] = [];
      for (const [w, h] of sizes) {
        const r = await pinned(w, h, async () => {
          const { getEngine } = await import('../ui/engineRef');
          getEngine()!.apply((await values(sc, recipe)) as never);
          return settled();
        });
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
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `redesign/F/${name}`, dataUrl: cv.toDataURL('image/png') }) });
    return res.ok ? `saved qa/redesign/F/${name}.png` : await res.text();
  }

  /**
   * 横版走一遍（审查修复 20）：按住 → / ← 用固定步长模拟 seconds 秒（后台标签页不跑 rAF，直接调引擎的走路步进），
   * 返回走到的 x 范围和途中跳了几次；不改 store
   */
  async function walk(scene = 'sideStage', seconds = 14, seed = 7) {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    eng.apply((await values(scene, undefined, { 'game.seed': seed })) as never);
    const e = eng as unknown as { pressed: Set<string>; stepCharacter(dt: number): void; charState: { pos: { x: number; y: number } }; hop: unknown };
    const out: Record<string, { x: number; hops: number }> = {};
    for (const key of ['arrowright', 'arrowleft']) {
      e.charState.pos.x = 0; e.charState.pos.y = 0; e.hop = null;
      e.pressed.clear(); e.pressed.add(key);
      let hops = 0, was = false;
      for (let i = 0; i < seconds * 60; i++) { e.stepCharacter(1 / 60); const h = !!e.hop; if (h && !was) hops++; was = h; }
      e.pressed.clear();
      out[key] = { x: Math.round(e.charState.pos.x * 10) / 10, hops };
    }
    e.charState.pos.x = 0; e.charState.pos.y = 0;
    return out;
  }

  /** 像素横版的每带小数像素（审查修复 16：开着像素对齐时应该全是 0）：镜头沿 x 每次挪 0.037，记每带相对吸附后相机的小数 */
  async function snapCheck(scene = 'sideStage', recipe = 'glow-pixel', steps = 12) {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    eng.apply((await values(scene, recipe, { 'camera.mode': 'orbit' })) as never);
    const e = eng as unknown as { camera: { position: { x: number } }; controls: { target: { x: number } }; placeLayers(c: unknown): void; layerSnapError(): number[] };
    const errs: number[][] = [];
    for (let i = 0; i < steps; i++) {
      e.camera.position.x += 0.037; e.controls.target.x += 0.037;
      e.placeLayers(e.camera);
      errs.push(e.layerSnapError());
    }
    return { maxAbs: Math.max(0, ...errs.flat().map(Math.abs)), sample: errs.slice(0, 3) };
  }

  devHooks({ scenes2d: { list, values, shot, sheet, qa, info, placePlayer, gridCheck, aspects, walk, snapCheck, QA_RECIPES } });
}

if (import.meta.hot) import.meta.hot.accept();
