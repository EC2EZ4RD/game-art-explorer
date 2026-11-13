/*
 * 轨道 C 的开发钩子（docs/workbench-redesign.md §11.1；约定见同目录 README.md）：__gae.gallery.*
 *
 *   await __gae.gallery.bake()                 烘焙全部配方缩略图 → public/thumbs/<id>.webp（640×360）
 *   await __gae.gallery.bake(['watercolor'])   只烘焙这几个
 *   await __gae.gallery.bakeAtlas()            风格研究库 227 条 → public/thumbs/atlas/<id>.webp（480×270；可分段 bakeAtlas([], 0, 40)）
 *   await __gae.gallery.bakeRef()              仅参考 8 张卡的代表图（自己画的示意插画）→ public/thumbs/ref/<卡 id>.webp（640×360）
 *   __gae.gallery.job('atlas')                 同上，但刷新后自动接着跑（任务记在本标签页的 sessionStorage）
 *   await __gae.gallery.sheet()                把 public/thumbs 里的图拼成一张接触表 → qa/redesign/gallery_sheet.png
 *   __gae.gallery.problems()                   图库数据自检（卡片名 / 看点长度、参数挂得上）
 *   await __gae.gallery.mount()                在本标签页右下角挂一份 StyleGallery + StyleDeck（外壳还没挂插槽时预览用）
 *   await __gae.gallery.vdiff(id, extra?)      变体与父配方缩略图的差（% 像素）；vdiffAll() 全部变体
 *   await __gae.gallery.atlasDups()            风格研究库里渲染几乎重复的条目（贴到 learnData.ts 的 ATLAS_DUP）
 *
 * 烘焙不经过 store：直接把「默认值 ⊕ 展示场景 ⊕ 配方 ⊕ 展示覆盖、HUD 关」交给引擎同步渲染，
 * 所以不写撤销、不写 localStorage，不影响其他标签页。期间把画框 host 临时钉成 960×540（16:9），完了还原。
 * 只在开发环境有效；请在自己的后台标签页里跑（会改这一页的画面）。
 */
import { devHooks } from './hooks';

const W = 640, H = 360;

if (import.meta.env.DEV) {
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  // 让出一帧：用 MessageChannel 而不是 setTimeout（后台标签页里 setTimeout 会被节流到 1 秒甚至 1 分钟一次，烘焙几百张会拖很久）
  const tick = () => new Promise<void>((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); });

  /**
   * 一张配方缩略图要交给引擎的参数。2D 展示场景（F 的横版 / 俯视 / 白盒）先铺环境的 recommended（锁定镜头一致的镜头键 + 建议的雾），
   * 和用户点「在 X 最好看 ›」/ 场景卡后看到的一样（场景层在配方层下面，配方写了的键照样盖过它）。
   */
  async function thumbValues(id: string, opt: { scene?: string; values?: Record<string, unknown> } = {}) {
    const [{ defaultValues }, { RECIPE_MAP }, { showcaseScene }, { hasSceneBuilder }] = await Promise.all([
      import('../dims/registry'), import('../content/recipes'), import('../content/taxonomy'), import('../engine/scene/sceneRegistry'),
    ]);
    const r = RECIPE_MAP.get(id);
    // 试调（trial）可以给一套还没写进 recipes.ts 的配方值（opt.values）和别的展示场景（opt.scene）
    if (!r && !opt.values) return null;
    const scene = opt.scene ?? (r ? showcaseScene(r, hasSceneBuilder) : 'sandbox');
    const values = (opt.values ?? r!.values) as Record<string, unknown>;
    return { ...defaultValues(), ...(await sceneLayer(scene, values)), ...(opt.values || opt.scene ? {} : r?.showcase?.overrides ?? {}), 'hud.style': 'none' };
  }

  /**
   * 「场景 ⊕ 配方」：2D 展示场景（横版 / 俯视 / 白盒 / 等距 / 纸艺 / 伪 3D）先铺环境的 recommended（锁定镜头一致的镜头键 + 建议的雾），
   * 和用户点「在 X 最好看 ›」/ 场景卡后看到的一样（场景层在配方层下面，配方写了的键照样盖过它）。
   */
  async function sceneLayer(scene: string, values: Record<string, unknown>) {
    const [{ is2dScene, sceneMeta }, { isSceneLightKey }] = await Promise.all([import('../content/sceneCatalog'), import('../state/layers')]);
    const rec = is2dScene(scene) ? sceneMeta(scene).recommended ?? {} : {};
    // 镜头机位键归场景（锁定镜头的场景里配方带的机位不生效，A 的合成规则）：recommended 的机位键压在配方上面
    // 光照键同理（收尾 10，A 的 isSceneLightKey：锁定镜头的场景里场景定的时段 / 灯笼 / 环境光 / 投影压在配方上面），与用户点过去看到的一致
    const rig = Object.fromEntries(Object.entries(rec).filter(([k]) => ['camera.projection', 'camera.angle', 'camera.azimuth', 'camera.fov', 'camera.zoom', 'camera.mode'].includes(k) || isSceneLightKey(k)));
    // 只看画面：HUD 关（和外壳「画面模式隐藏 HUD」同一个写法）
    return { ...rec, ...values, ...rig, 'game.scene': scene, 'game.seed': 7, 'lighting.cycle': false };
  }

  /** 缩略图的动画时间（秒）：程序动画、飘云、节拍都钉在这一刻（4 秒 = 120 / 128 BPM 都正好在拍上） */
  const THUMB_T = 4;

  /**
   * 引擎同步渲染（素材贴图第一次用到时要等下载完再渲一遍，最多 3 轮）。
   * 先复位镜头、清掉 OrbitControls 的阻尼残量（收尾 X / 复查 F7：上一张留下的旋转 / 平移惯性会把取景带歪，同一个配方每次烘出来的取景不同），
   * 动画时间钉在 THUMB_T：同一组参数每次烘出来一样
   */
  async function settledShot(): Promise<string | null> {
    const [{ getEngine }, { texturesPending, texturesReady }] = await Promise.all([import('../ui/engineRef'), import('../engine/textures')]);
    const eng = getEngine();
    if (!eng) return null;
    await texturesReady();
    const ec = eng as unknown as { resetCamera(): void; simTime: number; stepTime: number; controls: { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: { set(a: number, b: number, c: number): void } } };
    ec.controls._sphericalDelta?.set(0, 0, 0);
    ec.controls._panOffset?.set(0, 0, 0);
    ec.resetCamera();
    ec.simTime = THUMB_T; ec.stepTime = THUMB_T;
    let url = eng.renderSync(3);
    for (let i = 0; i < 3 && texturesPending(); i++) {
      await texturesReady();
      url = eng.renderSync(3);
    }
    return url;
  }

  /** PNG（任意尺寸）→ 居中裁 16:9 → w×h webp（默认 640×360） */
  async function toThumb(png: string, quality = 0.86, w = W, h = H): Promise<string> {
    const im = await load(png);
    const ar = w / h;
    let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
    if (sw / sh > ar) { const nw = sh * ar; sx = (sw - nw) / 2; sw = nw; } else { const nh = sw / ar; sy = (sh - nh) / 2; sh = nh; }
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
    return cv.toDataURL('image/webp', quality);
  }

  /** 风格研究库一条风格的缩略图参数：默认值 ⊕（对应配方）⊕ 近似参数，场景按配方展示场景或门类挑 */
  const GROUP_SCENE: Record<string, string> = {
    写实与风格化三维: 'forest', 动画式三维: 'sandbox', '动漫／漫画': 'street', 绘画感三维: 'harbor', 低多边形与几何: 'mountain', 体素: 'sandbox',
    像素: 'farm', 复古三维: 'forest', 中国传统与东方: 'courtyard', 西方艺术运动与平面设计: 'city', '素描、版画、线描': 'snowVillage',
    '拼贴／剪纸／纸片／手工': 'farm', 氛围与类型美学: 'ruins', '2D 绘制风格': 'castle', 混合媒介: 'sandbox', 世界民族与古典艺术: 'desert', '技术／媒介模拟': 'room',
  };
  async function atlasValues(id: string) {
    const [{ defaultValues }, { RECIPE_MAP }, { STYLES }, { effectiveApprox }, { showcaseScene }, { hasSceneBuilder }] = await Promise.all([
      import('../dims/registry'), import('../content/recipes'), import('../content/styles.data'), import('../content/styles'), import('../content/taxonomy'), import('../engine/scene/sceneRegistry'),
    ]);
    const st = STYLES.find((x) => x.id === id);
    if (!st) return null;
    const approx = effectiveApprox(st);
    const r = st.recipe ? RECIPE_MAP.get(st.recipe) : undefined;
    if (!Object.keys(approx).length && !r) return null;
    // 缺口由某个场景补上时（NEED_RESOLVERS 的 game.scene：伪 3D 公路、错觉塔、卷轴长街……），研究库的图就拍那个场景（铺它的推荐值）
    const scene = typeof approx['game.scene'] === 'string' ? approx['game.scene'] : r ? showcaseScene(r, hasSceneBuilder) : GROUP_SCENE[st.group] ?? 'sandbox';
    return { ...defaultValues(), ...(await sceneLayer(scene, { ...(r?.values ?? {}), ...approx })), 'hud.style': 'none' };
  }

  const post = async (dir: string, name: string, body: Record<string, string>) => {
    const r = await fetch(`/__bake?dir=${encodeURIComponent(dir)}`, { method: 'POST', body: JSON.stringify({ name, ...body }) });
    return r.ok ? await r.text() : `失败 ${r.status} ${await r.text()}`;
  };

  /** 默认烘焙：图库 44 张 + 变体 + 叠加（叠加用自己的完整配方渲） */
  async function allIds(): Promise<string[]> {
    const { RECIPES } = await import('../content/recipes');
    return RECIPES.map((r) => r.id);
  }

  async function bake(ids?: string[], opts: { quality?: number; dir?: string } = {}) {
    return bakeWith(ids?.length ? ids : await allIds(), thumbValues, opts.dir ?? 'thumbs', opts.quality ?? 0.86, W, H);
  }

  /** 风格研究库 227 条：public/thumbs/atlas/<id>.webp（480×270，没有近似参数的跳过） */
  async function bakeAtlas(ids?: string[], from = 0, count = 1000, force = false) {
    const { STYLES } = await import('../content/styles.data');
    let list = (ids?.length ? ids : STYLES.map((x) => x.id)).slice(from, from + count);
    // 已经烘焙过的跳过（别的轨道改文件会让本页整页刷新，烘焙可以分几次接着跑）
    if (!force) {
      const have = await Promise.all(list.map(async (id) => {
        const r = await fetch(`/thumbs/atlas/${id}.webp`, { method: 'HEAD' });
        return r.ok && (r.headers.get('content-type') ?? '').includes('image');
      }));
      list = list.filter((_, i) => !have[i]);
    }
    return bakeWith(list, atlasValues, 'thumbs/atlas', 0.8, 480, 270);
  }

  async function bakeWith(list: string[], valuesOf: (id: string) => Promise<Record<string, unknown> | null>, dir: string, quality: number, w: number, h: number) {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prevCss = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    host.style.cssText = `${prevCss};width:960px !important;height:540px !important;min-width:960px !important;min-height:540px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    const out: string[] = [];
    try {
      for (const id of list) {
        const v = await valuesOf(id);
        if (!v) { out.push(`${id}: 跳过（没有参数）`); continue; }
        // 每张都重新钉一次尺寸（别的组件重画时可能改了 host 的 style）
        if (host.clientWidth !== 960 || host.clientHeight !== 540) { host.style.cssText += ';width:960px !important;height:540px !important'; priv.resize(); }
        eng.apply(v as never);
        const png = await settledShot();
        if (!png) { out.push(`${id}: 引擎不见了`); break; }
        const webp = await toThumb(png, quality, w, h);
        out.push(`${id}: ${await post(dir, `${id}.webp`, { dataUrl: webp })}`);
        // 让出一帧：连续几十次同步渲染会让页面卡住
        await tick();
      }
    } finally {
      host.style.cssText = prevCss;
      priv.resize();
      const { useStore } = await import('../state/store');
      eng.apply(useStore.getState().values);
    }
    return out;
  }

  /** 接触表：把 public/thumbs 里现有的图按图库顺序拼起来，存到 qa/redesign/<name>.png */
  async function sheet(name = 'gallery_sheet', which: 'gallery' | 'all' = 'gallery', cols = 6, w = 320) {
    const [{ RECIPES }, { GALLERY, cardName, thumbUrl }] = await Promise.all([import('../content/recipes'), import('../content/taxonomy')]);
    const list = which === 'gallery' ? GALLERY : RECIPES;
    const h = Math.round((w * H) / W);
    const rows = Math.ceil(list.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * w; cv.height = rows * (h + 22);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '14px sans-serif';
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 22);
      try { g.drawImage(await load(`${thumbUrl(r.id)}?t=${Date.now()}`), x, y + 22, w, h); } catch { g.fillStyle = '#633'; g.fillRect(x, y + 22, w, h); }
      g.fillStyle = '#fff'; g.fillText(`${cardName(r)} · ${r.id}`, x + 4, y + 16);
    }
    const path = qaPath(name);
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: path, dataUrl: cv.toDataURL('image/png') }) });
    return res.ok ? `saved qa/${path}.png` : await res.text();
  }
  /** qa 下的相对路径：'tech/…' 原样（技术补全的轨道目录），其余放进 redesign/ */
  const qaPath = (name: string) => (name.startsWith('tech/') ? name : `redesign/${name}`);

  /**
   * 试调：同一张缩略图的几种参数并排渲出来（不改 recipes.ts，免得别的标签页整页刷新），存 qa/redesign/trial_<name>.png（name 带目录时存进那个目录）。
   * cells = [{ label, id, extra }]：id 是配方，extra 叠在缩略图参数上。
   */
  async function trial(name: string, cells: { label?: string; id: string; extra?: Record<string, unknown>; scene?: string; values?: Record<string, unknown> }[], cols = 3) {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return 'no engine';
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prevCss = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    host.style.cssText = `${prevCss};width:960px !important;height:540px !important;min-width:960px !important;min-height:540px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    const shots: { label: string; url: string }[] = [];
    try {
      for (const c of cells) {
        const v = await thumbValues(c.id, { scene: c.scene, values: c.values });
        if (!v) continue;
        eng.apply({ ...v, ...(c.extra ?? {}) } as never);
        const png = await settledShot();
        if (png) shots.push({ label: c.label ?? c.id, url: await toThumb(png) });
        await tick();
      }
    } finally {
      host.style.cssText = prevCss;
      priv.resize();
      const { useStore } = await import('../state/store');
      eng.apply(useStore.getState().values);
    }
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * W; cv.height = rows * (H + 24);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '16px sans-serif';
    for (let i = 0; i < shots.length; i++) {
      const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 24);
      g.drawImage(await load(shots[i].url), x, y + 24);
      g.fillStyle = '#fff'; g.fillText(shots[i].label, x + 6, y + 17);
    }
    // 名字里带目录（'IC/2d'）时存到 qa/redesign/<目录>/trial_<名>.png；以 tech/ 开头时存到 qa/tech/…（技术补全 Z1）
    const file = name.includes('/') ? name.replace(/([^/]+)$/, 'trial_$1') : `trial_${name}`;
    const path = qaPath(file);
    const res = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: path, dataUrl: cv.toDataURL('image/png') }) });
    return res.ok ? `saved qa/${path}.png` : await res.text();
  }

  /**
   * 仅参考卡的代表图（整合 U#23）：用 src/ui/learn/refArt.ts 自己画（Canvas 2D，不下载）→ public/thumbs/ref/<卡 id>.webp（640×360）。
   *   await __gae.gallery.bakeRef()            全部 8 张；bakeRef(['ref.8bit']) 只画这几张
   */
  async function bakeRef(ids?: string[]) {
    const [{ drawRefArt, REF_ART_IDS }] = await Promise.all([import('../ui/learn/refArt')]);
    const out: string[] = [];
    for (const id of ids?.length ? ids : REF_ART_IDS) {
      const cv = drawRefArt(id);
      if (!cv) { out.push(`${id}: 没有画法`); continue; }
      out.push(`${id}: ${await post('thumbs/ref', `${id}.webp`, { dataUrl: cv.toDataURL('image/webp', 0.9) })}`);
    }
    return out;
  }

  async function problems() {
    const [{ galleryProblems }, { getParam }] = await Promise.all([import('../content/taxonomy'), import('../dims/registry')]);
    return galleryProblems((id) => !!getParam(id));
  }

  /** 外壳还没挂插槽时，在本标签页右下角挂一份图库 + 配方卡预览 */
  let mounted: { unmount(): void; el: HTMLElement } | null = null;
  async function mount(on = true) {
    if (mounted) { mounted.unmount(); mounted.el.remove(); mounted = null; }
    if (!on) return 'unmounted';
    const [{ createElement }, { createRoot }, g, d] = await Promise.all([
      import('react'), import('react-dom/client'), import('../ui/left/StyleGallery'), import('../ui/deck/StyleDeck'),
    ]);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;display:grid;grid-template-columns:288px 808px;height:520px;background:var(--panel);border:1px solid var(--line-strong);box-shadow:0 8px 30px rgba(0,0,0,.25)';
    document.body.appendChild(el);
    const root = createRoot(el);
    root.render(createElement('div', { style: { display: 'contents' } },
      createElement('div', { style: { minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' } }, createElement(g.StyleGallery)),
      createElement('div', { style: { alignSelf: 'end', height: 340 } }, createElement(d.StyleDeck, { oneRow: false }))));
    mounted = { unmount: () => root.unmount(), el };
    return 'mounted';
  }

  /**
   * 能自己接着跑的烘焙：别的轨道改文件会让本页整页刷新，把任务记在本标签页的 sessionStorage 里，刷新后自动接着烘焙没做完的。
   *   __gae.gallery.job('atlas')   开始（已有的跳过）；__gae.gallery.job(null) 取消
   */
  const JOB_KEY = 'gae.bake.job';
  const lock = window as unknown as { __gaeBakeRunning?: boolean };
  async function runJob(kind: string) {
    if (lock.__gaeBakeRunning) return 'already running';
    lock.__gaeBakeRunning = true;
    try {
      const r = kind === 'atlas' ? await bakeAtlas() : 'unknown job';
      try { sessionStorage.removeItem(JOB_KEY); } catch { /* 忽略 */ }
      console.info('[gallery] 烘焙完成', kind, Array.isArray(r) ? r.length : r);
      return r;
    } finally {
      lock.__gaeBakeRunning = false;
    }
  }
  function job(kind: string | null) {
    try { if (kind) sessionStorage.setItem(JOB_KEY, kind); else sessionStorage.removeItem(JOB_KEY); } catch { /* 忽略 */ }
    return kind ? runJob(kind) : 'cancelled';
  }
  try {
    const pending = sessionStorage.getItem(JOB_KEY);
    if (pending) window.setTimeout(() => { void runJob(pending); }, 5000);
  } catch { /* 隐私模式：不接着跑 */ }

  /** 一张缩略图（配方 ⊕ extra）的像素（640×360） */
  async function pixelsOf(id: string, extra: Record<string, unknown> = {}): Promise<Uint8ClampedArray | null> {
    const { getEngine } = await import('../ui/engineRef');
    const eng = getEngine();
    if (!eng) return null;
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prevCss = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    host.style.cssText = `${prevCss};width:960px !important;height:540px !important;min-width:960px !important;min-height:540px !important;max-width:none !important;max-height:none !important;flex:none !important;transform:none !important`;
    priv.resize();
    try {
      const v = await thumbValues(id);
      if (!v) return null;
      eng.apply({ ...v, ...extra } as never);
      const png = await settledShot();
      if (!png) return null;
      const im = await load(await toThumb(png, 0.95));
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d')!;
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, W, H).data;
    } finally {
      host.style.cssText = prevCss;
      priv.resize();
      const { useStore } = await import('../state/store');
      eng.apply(useStore.getState().values);
    }
  }
  const diffOf = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let sum = 0, big = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      sum += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      if (d > 24) big++;
    }
    const n = a.length / 4;
    return { mean: Math.round((sum / n) * 10) / 10, pct: Math.round((big / n) * 1000) / 10 };
  };
  /**
   * 变体和父配方的缩略图差多少（审查修复 24：芯片点了要看得出变化）：pct = 变化超过 24/255 的像素占比（%），mean = 平均差。
   *   await __gae.gallery.vdiff('clay-print')                       用 recipes.ts 里的值
   *   await __gae.gallery.vdiff('clay-print', { 'material.detailScale': 2 })   试别的值（不改文件）
   */
  async function vdiff(variant: string, extra: Record<string, unknown> = {}, parent?: string) {
    const { RECIPE_MAP } = await import('../content/recipes');
    const r = RECIPE_MAP.get(variant);
    const pid = parent ?? r?.parent;
    if (!r || !pid) return 'no parent';
    const a = await pixelsOf(pid);
    const b = await pixelsOf(variant, extra);
    return a && b ? diffOf(a, b) : 'no engine';
  }
  /** 全部变体的 vdiff（低于 VARIANT_MIN_PCT 的要么调值、要么在配方卡里藏起来） */
  async function vdiffAll() {
    const { RECIPES } = await import('../content/recipes');
    const out: Record<string, unknown> = {};
    for (const r of RECIPES.filter((x) => x.kind === 'variant')) out[r.id] = await vdiff(r.id);
    return out;
  }
  /** 风格研究库里渲染图和前面某条几乎一样的条目（64×36 平均差 < th/255）：结果贴到 src/ui/learn/learnData.ts 的 ATLAS_DUP */
  async function atlasDups(th = 14) {
    const { STYLES } = await import('../content/styles.data');
    const small = async (id: string, rec?: string) => {
      for (const u of [`./thumbs/atlas/${id}.webp`, rec ? `./thumbs/${rec}.webp` : null]) {
        if (!u) continue;
        try {
          const im = await load(u);
          const cv = document.createElement('canvas');
          cv.width = 64; cv.height = 36;
          const g = cv.getContext('2d')!;
          g.drawImage(im, 0, 0, 64, 36);
          return g.getImageData(0, 0, 64, 36).data;
        } catch { /* 下一张 */ }
      }
      return null;
    };
    const seen: Uint8ClampedArray[] = [];
    const dups: string[] = [];
    for (const st of STYLES) {
      const px = await small(st.id, st.recipe);
      if (!px) continue;
      const near = seen.some((o) => { let s = 0; for (let i = 0; i < px.length; i += 4) s += (Math.abs(px[i] - o[i]) + Math.abs(px[i + 1] - o[i + 1]) + Math.abs(px[i + 2] - o[i + 2])) / 3; return s / (px.length / 4) < th; });
      if (near) dups.push(st.id); else seen.push(px);
    }
    return dups;
  }

  devHooks({ gallery: { bake, bakeAtlas, bakeRef, sheet, problems, mount, thumbValues, atlasValues, trial, job, vdiff, vdiffAll, atlasDups } });
}

// 自接受热更新：改这个文件时只重跑它，不整页刷新
if (import.meta.hot) import.meta.hot.accept();
