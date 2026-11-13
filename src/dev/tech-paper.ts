/*
 * 技术补全 H（纸艺与剧场）的开发钩子：__gae.techPaper.*
 *
 *   __gae.techPaper.values(scene, recipe?, extra?)                 一张图交给引擎的参数（默认值 ⊕ 配方 ⊕ 场景推荐 ⊕ extra）
 *   await __gae.techPaper.shot(scene, recipe?, extra?, w?, h?, x?)   同步渲一张（captureFrame，不动 DOM），返回 PNG dataURL；x = 把玩家挪到这个 x
 *   await __gae.techPaper.save(name, cell, w?, h?)                 单张存 qa/tech/H/<name>.png
 *   await __gae.techPaper.sheet(name, cells, cols?, cw?)            拼成接触表 → qa/tech/H/<name>.png（cell 可带 w / h：画框比例）
 *   await __gae.techPaper.qa(ids?)                                 每个场景 × 3 个配方 + 4:3 / 竖屏取景 → qa/tech/H/scene_<id>.png
 *   __gae.techPaper.info()                                         当前场景的镜头、角色、斜投影系数
 *
 * 渲染不经过 store（不写撤销、不写存档）；渲完把 store 里的参数重新交给引擎。只在开发环境有效，请在自己的后台标签页里跑。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string; x?: number; w?: number; h?: number };
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const post = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/H/${name}`, dataUrl }) });
    return r.ok ? `qa/tech/H/${name}.png` : `失败 ${r.status}`;
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

  type Eng = NonNullable<ReturnType<typeof import('../ui/engineRef').getEngine>>;
  async function withEngine<T>(f: (eng: Eng) => Promise<T>): Promise<T | null> {
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

  async function capture(eng: Eng, c: Cell, w: number, h: number) {
    const { texturesPending, texturesReady } = await import('../engine/textures');
    // 先按截图尺寸改画框比例再套参数、复位镜头：跟拍的透视镜头只在复位时按比例（内容框 fit）重新摆位
    const es = eng as unknown as { sizeOverride: { w: number; h: number } | null; resize(): void };
    es.sizeOverride = { w, h };
    es.resize();
    eng.apply((await values(c.scene, c.recipe, c.extra)) as never);
    await texturesReady();
    const ec = eng as unknown as {
      resetCamera(): void; captureFrame(w: number, h: number, s: number): string;
      controls: { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: { set(a: number, b: number, c: number): void } };
      charState: { pos: { x: number; y: number; z: number } }; desc?: { ground?: { heightAt(x: number, z: number): number } };
    };
    if (c.x !== undefined) {
      ec.charState.pos.x = c.x;
      ec.charState.pos.y = ec.desc?.ground?.heightAt(c.x, ec.charState.pos.z) ?? 0;
    }
    ec.controls._sphericalDelta?.set(0, 0, 0);
    ec.controls._panOffset?.set(0, 0, 0);
    ec.resetCamera();
    let url = ec.captureFrame(w, h, 3);
    for (let i = 0; i < 3 && texturesPending(); i++) { await texturesReady(); url = ec.captureFrame(w, h, 3); }
    return url;
  }

  async function shot(scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540, x?: number) {
    return withEngine((eng) => capture(eng, { scene, recipe, extra, x }, w, h));
  }

  async function save(name: string, c: Cell, w = 1280, h = 720) {
    const url = await withEngine((eng) => capture(eng, c, c.w ?? w, c.h ?? h));
    return url ? post(name, url) : 'no engine';
  }

  /** 接触表：每格按自己的比例渲（默认 16:9），统一按格高 ch 缩放、居中放在格子里 */
  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const shots = await withEngine(async (eng) => {
      const { RECIPE_MAP } = await import('../content/recipes');
      const { sceneMeta } = await import('../content/sceneCatalog');
      const out: { label: string; url: string; w: number; h: number }[] = [];
      for (const c of cells) {
        const r = c.recipe ? RECIPE_MAP.get(c.recipe) : undefined;
        let sn = c.scene;
        try { sn = sceneMeta(c.scene).name; } catch { /* 未登记 */ }
        const w = c.w ?? 1280, h = c.h ?? 720;
        out.push({ label: c.label ?? `${sn} · ${r?.short ?? r?.name ?? c.recipe ?? '默认'}`, url: await capture(eng, c, w, h), w, h });
        await new Promise((res) => setTimeout(res, 0));
      }
      return out;
    });
    if (!shots) return 'no engine';
    const ch = Math.round((cw * 9) / 16), head = 24;
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * (ch + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + head);
      const s = shots[i], k = Math.min(cw / s.w, ch / s.h), dw = s.w * k, dh = s.h * k;
      g.drawImage(await load(s.url), x + (cw - dw) / 2, y + head + (ch - dh) / 2, dw, dh);
      g.fillStyle = '#eee'; g.fillText(s.label, x + 6, y + 17);
    }
    return post(name, cv.toDataURL('image/png'));
  }

  /** 每个场景挑三个气质不同、又和场景相配的配方；第二行是 4:3 与手机竖屏取景（默认配方） */
  const QA_RECIPES: Record<string, string[]> = {
    'paper-theater': ['papercut', 'cel-anime', 'pixel3d'],
    'shadow-puppet': ['papercut', 'ink-landscape', 'oil'],
    'scroll-street': ['gongbi', 'ink-landscape', 'qinglv'],
    'beatemup-street': ['cel-anime', 'pixel3d', 'neon-night'],
    'silhouette-forest': ['layered-silhouette', 'glow-layers', 'watercolor'],
    'stage-theater': ['oil', 'theatre-cold', 'cel-anime'],
  };
  /** 跟拍的场景再走到关卡里的看点（Boss、桥、城门）各渲一张 */
  const QA_WALK: Record<string, [number, string]> = {
    'paper-theater': [14, '纸箱台阶、彩虹、纸片怪'],
    'scroll-street': [-26, '城门楼'],
    'beatemup-street': [29, '帮派老大'],
    'silhouette-forest': [12.5, '大蜘蛛'],
  };
  async function qa(ids?: string[]) {
    const all = ids?.length ? ids : Object.keys(QA_RECIPES);
    const out: string[] = [];
    for (const id of all) {
      const rs = QA_RECIPES[id] ?? ['cel-anime', 'watercolor', 'pixel3d'];
      const cells: Cell[] = rs.map((recipe) => ({ scene: id, recipe }));
      cells.push({ scene: id, recipe: rs[0], w: 960, h: 720, label: '4:3' }, { scene: id, recipe: rs[0], w: 360, h: 780, label: '竖屏 9:19.5' }, { scene: id, w: 1280, h: 720, label: '默认参数' });
      const walkTo = QA_WALK[id];
      if (walkTo) cells.push({ scene: id, recipe: rs[1], x: walkTo[0], label: `走到 x = ${walkTo[0]}（${walkTo[1]}）· ${rs[1]}` }, { scene: id, recipe: rs[2], x: walkTo[0], w: 960, h: 720, label: `走到 x = ${walkTo[0]} · 4:3` });
      out.push(String(await sheet(`scene_${id}`, cells, 3, 640)));
    }
    return out;
  }

  async function info() {
    const { getEngine } = await import('../ui/engineRef');
    const e = getEngine() as unknown as { desc?: { camera?: unknown; actors?: { label: string; kind: string }[] }; camera: { type: string; projectionMatrix: { elements: number[] } } } | null;
    if (!e) return 'no engine';
    const m = e.camera.projectionMatrix.elements;
    return { rig: e.desc?.camera ?? null, camera: e.camera.type, actors: e.desc?.actors?.map((a) => `${a.kind}:${a.label}`) ?? [], shear: [m[8], m[9]] };
  }

  /** 斜投影改前 / 改后对照：卷轴·长街 同一配方，先关掉错切渲一张、再打开渲一张，上下拼成一张 → qa/tech/H/<name>.png */
  async function obliqueCompare(recipe = 'gongbi', name = 'scroll_oblique_before_after') {
    const { engineExts } = await import('../engine/engineExt');
    const ext = engineExts().find((e) => e.id === 'paper-oblique');
    if (!ext) return 'no ext';
    const keep = ext.onFrame;
    const urls: string[] = [];
    for (const on of [false, true]) {
      if (!on) ext.onFrame = () => {};
      const u = await withEngine((eng) => capture(eng, { scene: 'scroll-street', recipe }, 1280, 720));
      ext.onFrame = keep;
      if (u) urls.push(u);
    }
    if (urls.length < 2) return 'no engine';
    const cv = document.createElement('canvas');
    cv.width = 1280; cv.height = 720 * 2 + 56;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '18px sans-serif';
    g.fillStyle = '#eee'; g.fillText('改前：正交平视（地面看成一条线，屋顶和街面都看不见）', 8, 20);
    g.drawImage(await load(urls[0]), 0, 28);
    g.fillStyle = '#eee'; g.fillText('改后：斜二测斜投影（纵深沿 45° 斜着退去、缩短一半，没有灭点）', 8, 28 + 720 + 20);
    g.drawImage(await load(urls[1]), 0, 56 + 720);
    return post(name, cv.toDataURL('image/png'));
  }

  /** 纸片人转身翻面：同一位置按朝向 正面 → 侧对（一条线）→ 背面 渲五张，裁出主角附近拼成一条 → qa/tech/H/<name>.png */
  async function flip(recipe = 'cel-anime', name = 'paper_flip') {
    const facings = [Math.PI / 2, 0.9, 0.12, -0.7, -Math.PI / 2];
    const urls = await withEngine(async (eng) => {
      const out: string[] = [];
      for (const f of facings) {
        const e = eng as unknown as { charState: { facing: number } };
        await capture(eng, { scene: 'paper-theater', recipe }, 1280, 720);
        e.charState.facing = f;
        out.push((eng as unknown as { captureFrame(w: number, h: number, s: number): string }).captureFrame(1280, 720, 1));
      }
      return out;
    });
    if (!urls) return 'no engine';
    const W = 300, H = 300;
    const cv = document.createElement('canvas');
    cv.width = W * urls.length; cv.height = H + 26;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height); g.font = '15px sans-serif';
    const labels = ['朝右：正面', '转身中', '侧对镜头：一条线', '转过来了', '朝左：背面'];
    for (let i = 0; i < urls.length; i++) {
      g.drawImage(await load(urls[i]), 640 - W / 2 + 20, 360 - H / 2 + 60, W, H, i * W, 26, W, H);
      g.fillStyle = '#eee'; g.fillText(labels[i], i * W + 6, 18);
    }
    return post(name, cv.toDataURL('image/png'));
  }

  devHooks({ techPaper: { values, shot, save, sheet, qa, info, obliqueCompare, flip, QA_RECIPES } });
}

if (import.meta.hot) import.meta.hot.accept();
