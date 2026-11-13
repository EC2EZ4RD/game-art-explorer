import { devHooks } from './hooks';

/*
 * 轨道 D 的开发钩子：window.__gae.scenes（docs/workbench-redesign.md §5；约定见 README.md）。
 *   await __gae.scenes.swatchSpike(['skin.glass', …])   离屏色板验证：画几张、量时间、核对主画面的全局没被改，拼一张图存 qa/redesign/D/
 * 只在开发环境有效；会改这一页的画面，请在自己的后台标签页里跑。
 */

if (import.meta.env.DEV) {
  /** 让出一个宏任务（MessageChannel：后台标签页里不被节流），让 React 把同步更新提交掉 */
  const yieldTask = () => new Promise<void>((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const save = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name, dataUrl }) });
    return r.ok ? `saved qa/${name}.png` : `失败 ${r.status}`;
  };

  /** 色板接触表：每张 2 倍放大 + 名字 */
  async function sheet(items: { label: string; url: string }[], name: string, cols = 6) {
    const imgs = await Promise.all(items.map((x) => load(x.url)));
    const cw = 152 * 2, ch = 64 * 2, lh = 22;
    const cv = document.createElement('canvas');
    cv.width = cols * (cw + 8) + 8;
    cv.height = Math.ceil(items.length / cols) * (ch + lh + 8) + 8;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
    imgs.forEach((im, i) => {
      const x = 8 + (i % cols) * (cw + 8), y = 8 + Math.floor(i / cols) * (ch + lh + 8);
      g.drawImage(im, x, y, cw, ch);
      g.fillStyle = '#eee'; g.font = '14px sans-serif'; g.fillText(items[i].label, x + 2, y + ch + 16);
    });
    return save(name, cv.toDataURL('image/png'));
  }


  /**
   * 实测对比度（只报不判，审查修复 3）：在最终合成的一帧上，取每段字外接框外面一圈（外扩 3px、宽 2px）的像素中位色当底色，和字色比。
   * 绘制记录里的盒子颜色与实际画出来的不一致时（比如皮肤用贴图 / 另一层画面板），这个数更接近眼睛看到的——用来找 E 的记录口径问题，不拿来放宽门槛。
   */
  async function pixelContrast(url: string, texts: { x: number; y: number; w: number; h: number; cw: number; color: string; size: number; bold: boolean; aided: boolean; text: string }[], boxes: { x: number; y: number; w: number; h: number; cw: number; color: string | null; blur: number }[], scene: { data: Uint8ClampedArray; w: number; h: number; cssW: number; cssH: number }) {
    const [{ parseColor }, RC] = await Promise.all([import('../hud/material'), import('../hud/check/readability')]);
    const im = await load(url);
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(im, 0, 0);
    let n = 0, pass = 0;
    const worst: [number, string][] = [];
    // 绘制记录口径（与 E 的 textContrastStats 同一算法）：逐段算出来，和实测取较好的那个
    const cssW = scene.cssW;
    const toCss = (o: { x: number; y: number; w: number; h: number; cw: number }) => { const q = cssW / o.cw; return { x: o.x * q, y: o.y * q, w: o.w * q, h: o.h * q }; };
    const bx = boxes.map((b) => ({ r: toCss(b), c: b.color ? parseColor(b.color) : null, blur: b.blur }));
    const logRatio = (t: (typeof texts)[number]) => {
      const tr = toCss(t), cx = tr.x + tr.w / 2, cy = tr.y + tr.h / 2;
      let under: (typeof bx)[number] | undefined;
      for (const b of bx) if (b.c && b.c[3] > 0.02 && cx >= b.r.x && cx <= b.r.x + b.r.w && cy >= b.r.y && cy <= b.r.y + b.r.h) under = b;
      const sc = RC.sceneUnder(scene, tr);
      const bgs: [number, number, number][] = [];
      if (under?.c && under.c[3] >= 0.98) bgs.push([under.c[0], under.c[1], under.c[2]]);
      else if (under?.c) for (const s0 of under.blur > 0 ? [sc.avg] : [sc.light, sc.dark]) bgs.push(RC.over([under.c[0], under.c[1], under.c[2]], under.c[3], s0));
      else bgs.push(sc.light, sc.dark);
      const tc = parseColor(t.color);
      return Math.min(...bgs.map((bg) => RC.contrast(RC.over([tc[0], tc[1], tc[2]], tc[3], bg), bg)));
    };
    for (const t of texts) {
      // 单个符号（图标字）不量：挨在一起的图标会互相当成底色（图标归 E 的 RC4）
      if (/^[^\p{L}\p{N}]+$/u.test(t.text.trim())) continue;
      const k = cv.width / t.cw;
      const x0 = Math.round(t.x * k), y0 = Math.round(t.y * k), w = Math.round(t.w * k), h = Math.round(t.h * k);
      const pad = Math.round(3 * k), band = Math.max(1, Math.round(2 * k));
      const px: [number, number, number][] = [];
      const grab = (x: number, y: number, ww: number, hh: number) => {
        x = Math.max(0, x); y = Math.max(0, y); ww = Math.min(cv.width - x, ww); hh = Math.min(cv.height - y, hh);
        if (ww <= 0 || hh <= 0) return;
        const d = g.getImageData(x, y, ww, hh).data;
        for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2]]);
      };
      grab(x0 - pad - band, y0 - pad - band, w + 2 * (pad + band), band);
      grab(x0 - pad - band, y0 + h + pad, w + 2 * (pad + band), band);
      grab(x0 - pad - band, y0 - pad, band, h + 2 * pad);
      grab(x0 + w + pad, y0 - pad, band, h + 2 * pad);
      if (!px.length) continue;
      const lum = (c: [number, number, number]) => RC.relLum(c);
      px.sort((a, b) => lum(a) - lum(b));
      const bg = px[Math.floor(px.length / 2)];
      const tc = parseColor(t.color);
      void logRatio;
      const ratio = RC.contrast([tc[0], tc[1], tc[2]], bg);
      const need = RC.required(t.size, t.bold, t.aided);
      n++;
      if (ratio >= need) pass++; else worst.push([ratio, `「${t.text}」${ratio.toFixed(1)}`]);
    }
    return { n, pass, worst: worst.sort((a, b) => a[0] - b[0]).slice(0, 4).map((x) => x[1]).join(' ') };
  }

  async function swatchSpike(ids?: string[], name = 'redesign/D/swatch_spike') {
    const [{ useStore }, SR, SC, { pack }, { worldNow }, { simNow }, { flowNow }, { DRAW_LOG }, { getEngine }, { presetsOf }, { resolveUi }] = await Promise.all([
      import('../state/store'), import('../ui/scene/swatchRenderer'), import('../ui/scene/skinChoices'), import('../hud/content'), import('../hud/world'),
      import('../hud/sim'), import('../hud/flow'), import('../hud/paint'), import('../ui/engineRef'), import('../hud/sys/spec'), import('../hud/sys/resolve'),
    ]);
    const eng = getEngine();
    if (!eng) return 'no engine';
    const st = useStore.getState();
    const list = ids?.length ? ids : presetsOf('skin').map((p) => p.id);
    const before = { pack: pack().id, world: worldNow(), sim: simNow(), flow: flowNow(), logTexts: DRAW_LOG.texts, mainResolved: resolveUi(st.values) };
    SR.setBackgroundKey(`spike|${Date.now()}`);
    const t0 = performance.now();
    const res: { id: string; ms: number; url: string }[] = [];
    await new Promise<void>((done) => {
      let left = list.length;
      for (const id of list) {
        const c = { kind: 'skin', id } as const;
        const key = `spike|${id}|${t0}`;
        const off = SR.onSwatch(key, (r) => { off(); res.push({ id, ms: r.ms, url: r.crop }); if (--left === 0) done(); });
        SR.requestSwatch({ key, values: () => SC.planChoice(st.values, st.origin, c) });
      }
    });
    const wall = performance.now() - t0;
    const after = { pack: pack().id, world: worldNow(), sim: simNow(), flow: flowNow(), logTexts: DRAW_LOG.texts, mainResolved: resolveUi(useStore.getState().values) };
    const saved = await sheet(res.map((r) => ({ label: `${r.id.replace('skin.', '')} ${r.ms.toFixed(0)}ms`, url: r.url })), name);
    const ms = res.map((r) => r.ms).sort((a, b) => a - b);
    return {
      n: res.length, wallMs: Math.round(wall), medianMs: ms[Math.floor(ms.length / 2)]?.toFixed(1), maxMs: ms.at(-1)?.toFixed(1), bgMs: SR.SWATCH_STATS.bgMs.toFixed(1),
      globalsIntact: before.pack === after.pack && before.world === after.world && before.sim === after.sim && before.flow === after.flow && before.logTexts === after.logTexts,
      mainResolveCached: before.mainResolved === after.mainResolved,
      saved, stats: { ...SR.SWATCH_STATS },
    };
  }


  /**
   * 质量门槛（§5.2 / §8 验收）：每个基础场景 × 默认皮肤，UI 模式、左栏收起（1440×900 时画框 1031×580），局内界面。
   * 过线（审查修复 3 / 17：与栏条「可读⚠N」用同一个检查，不再取两种算法里较好的那个）：
   *   - 可读性检查（analyzeReadability，栏条徽标同一个函数）没有 error 级问题；
   *   - E 的 textContrastStats 及格率 ≥ 95%（§8「可读性检查中 ≥95% 的文字 ≥4.5:1」）；
   *   - 最小字号 ≥ 20px@1080p（§5.2）。可读性检查按 PC 24px@1080p 报的「字太小」（20–24 之间是 warn）单列在 small24，不判。
   * 实测对比度（pxPass）只报不判。opts.screens = true：每个场景的全部界面都量一遍（只报不判）。opts.sheet：拼一张接触表存 qa/redesign/D/<sheet>.png
   * （名字带「/」时存 qa/<sheet>.png）。opts.fresh：先「全部重新开始」，不带进这一页之前的手动改动（轨道 Z2）
   * opts.cells：每个场景的那一帧另存 qa/<cells>/<场景 id>.png（配合 run 接着量，整页刷新也不丢）
   */
  async function gate(ids?: string[], opts: { screens?: boolean; sheet?: string; skin?: string; allSkins?: boolean; run?: string; recipe?: 'start' | 'look' | string; fresh?: boolean; cells?: string } = {}) {
    const [{ useStore }, A, { GAME_SCENES, sceneName }, SA, { getEngine }, { texturesReady }, { analyzeReadability }, shell, { sampleSceneLumNow }, { hasSceneBuilder }] = await Promise.all([
      import('../state/store'), import('../state/actions'), import('../content/gameScenes'), import('../ui/scene/sceneActions'),
      import('../ui/engineRef'), import('../engine/textures'), import('../hud/check/readability'), import('../ui/stage/shell'), import('../hud/sceneLum'),
      import('../engine/scene/sceneRegistry'),
    ]);
    const RC = (await import('../hud/check/readability')) as unknown as { textContrastStats?: (log: unknown, scene: unknown, w: number, h: number, r: unknown) => { n: number; pass: number; worst: string[] } };
    const eng = getEngine();
    if (!eng) return 'no engine';
    // 先全部重新开始（轨道 Z2）：别的钩子（replicaShots 这类直接 setMany 的）留下的 UI 样式改动换场景时不清，会一路带进每个场景
    if (opts.fresh) A.resetAll();
    shell.setMode('ui');
    shell.useShell.getState().set({ uiRail: true, focus: false, zoom: 'fit' });
    await new Promise((r) => setTimeout(r, 300));
    // 画框钉成编辑尺寸（1440×900 时 UI 模式的画框 1031×580，§3.3）：后台标签页里 ResizeObserver 不跑，画框会停在旧尺寸
    const host = eng.renderer.domElement.parentElement as HTMLElement;
    const prevCss = host.style.cssText;
    const priv = eng as unknown as { resize(): void };
    const pin = () => { host.style.cssText = `${prevCss};width:1031px !important;height:580px !important;min-width:1031px !important;min-height:580px !important;max-width:none !important;max-height:none !important;flex:none !important`; priv.resize(); };
    pin();
    try {
    const list = GAME_SCENES.filter((s) => s.group !== '名作' && (!ids?.length || ids.includes(s.id)));
    const rows: Record<string, unknown>[] = [];
    const shots: { label: string; url: string }[] = [];
    const measure = async (label: string) => {
      await yieldTask();
      if (host.clientWidth !== 1031 || host.clientHeight !== 580) pin();
      await texturesReady();
      // 衬底跟画面亮度走（E 的 sceneLum）：换场景后第一帧按色板估，量之前先渲一帧新画面、立刻采一次亮度网格，再渲几帧让 HUD 按网格重画（整合修复 X#20）
      eng.renderSync(1);
      sampleSceneLumNow();
      await yieldTask();
      const url = eng.renderSync(3);
      const scene = eng.sampleScene(192);
      const r = eng.hud.resolved;
      if (!scene || !r) return { label, err: 'no scene' };
      const log = eng.hud.drawLog;
      const uk = log.unitK ?? eng.hud.unitK;
      const texts = log.texts.filter((t) => !t.fx && t.text.trim());
      const sizes = texts.map((t) => (t.size * 2) / uk);
      const issues = analyzeReadability(log, scene, scene.cssW, scene.cssH, r);
      // E 的统计口径（§8「≥95% 的文字及格」）；没有时按可读性检查的对比度条数算
      const stats = typeof RC.textContrastStats === 'function' ? RC.textContrastStats(log, scene, scene.cssW, scene.cssH, r) : null;
      const bad = stats ? stats.n - stats.pass : issues.find((i) => i.id === 'contrast')?.rects.length ?? 0;
      const minPx = sizes.length ? Math.min(...sizes) : 0;
      const pass = stats ? (stats.n ? stats.pass / stats.n : 1) : texts.length ? 1 - bad / texts.length : 1;
      const px = await pixelContrast(url, texts, log.boxes, scene);
      const pxPass = px.n ? px.pass / px.n : 1;
      const errors = issues.filter((i) => i.level === 'error');
      const small24 = issues.find((i) => i.id === 'minText')?.rects.length ?? 0;
      return {
        label, worst: stats?.worst?.join(' ') ?? '', pxWorst: px.worst, pxPass: +(pxPass * 100).toFixed(1), texts: texts.length, minPx: +minPx.toFixed(1), minCss: +(minPx * uk / 2).toFixed(1), contrastPass: +(pass * 100).toFixed(1),
        errors: errors.map((i) => i.title).join('；'), warns: issues.filter((i) => i.level === 'warn').map((i) => i.title).join('；'), badge: issues.length, small24,
        ok: minPx >= 20 && pass >= 0.95 && !errors.length, url,
      };
    };
    if (opts.allSkins) {
      // 每个场景把 38 个皮肤都量一遍：返回 { 场景: [[皮肤, 最小字号, 及格率], …] }（挑默认皮肤用）
      const { presetsOf } = await import('../hud/sys/spec');
      const out: Record<string, [string, number, number, number, number][]> = {};
      for (const sc of list) {
        A.applySkin(null);
        if (opts.recipe) {
          const { RECIPE_MAP } = await import('../content/recipes');
          const { START_RECIPE } = await import('../state/layers');
          const rr = RECIPE_MAP.get(opts.recipe === 'start' ? START_RECIPE : opts.recipe === 'look' ? sc.look ?? START_RECIPE : opts.recipe);
          if (rr) A.applyRecipe(rr, { keepMine: false });
        }
        await SA.pickGameScene(sc);
        out[sc.id] = [];
        for (const p of presetsOf('skin')) {
          A.applySkin(p.id);
          const m = await measure(p.id) as { minPx?: number; contrastPass?: number; ok?: boolean; badge?: number };
          out[sc.id].push([p.id.replace('skin.', ''), m.minPx ?? 0, m.contrastPass ?? 0, m.ok ? 1 : 0, m.badge ?? 0]);
        }
        A.applySkin(null);
      }
      return out;
    }
    // run = 名字：每量完一个场景就记进 sessionStorage，页面被别的轨道整页刷新后再调同一个 run 接着量（已量的不重量）
    const RUN = opts.run ? `gae.dgate.${opts.run}` : '';
    const prev: Record<string, unknown>[] = RUN ? JSON.parse(sessionStorage.getItem(RUN) ?? '[]') : [];
    rows.push(...prev);
    for (const sc of list) {
      if (prev.some((x) => x.id === sc.id)) continue;
      // 画面固定下来再量（结果和当时的画风有关）：start = 首屏配方（明亮，§0.2 的难点），look = 场景的建议配方
      if (opts.recipe) {
        const { RECIPE_MAP } = await import('../content/recipes');
        const { START_RECIPE } = await import('../state/layers');
        const rid = opts.recipe === 'start' ? START_RECIPE : opts.recipe === 'look' ? sc.look ?? START_RECIPE : opts.recipe;
        const rr = RECIPE_MAP.get(rid);
        if (rr) A.applyRecipe(rr, { keepMine: false });
      }
      if (opts.skin) A.applySkin(opts.skin); else A.applySkin(null);
      await SA.pickGameScene(sc);
      if (!opts.skin) A.applySkin(null);
      await new Promise((r) => setTimeout(r, 50));
      // 名字用图库卡片上的（换上 2D 环境后是 name2d，轨道 Z2）
      const m = await measure(`${sceneName(sc, hasSceneBuilder)} · 局内`);
      const { url, ...row } = m as Record<string, unknown> & { url?: string };
      rows.push({ id: sc.id, skin: useStore.getState().values['hud.style'], art: useStore.getState().origin.recipe, frame: `${eng.renderer.domElement.parentElement?.clientWidth}x${eng.renderer.domElement.parentElement?.clientHeight}`, uk: +eng.hud.unitK.toFixed(3), ...row });
      if (url) shots.push({ label: `${sc.name} ${(m as { ok?: boolean }).ok ? '✓' : '✗'} ${(row as { minPx?: number }).minPx}px ${(row as { contrastPass?: number }).contrastPass}%`, url });
      // 逐格存图（轨道 Z2）：别的轨道频繁整页刷新时接触表常拼不完，每量完一个场景就把这一帧存到 qa/<cells>/<场景 id>.png，再在外面拼
      if (opts.cells && url) await save(`${opts.cells}/${sc.id.replace(/[^\w.-]/g, '_')}`, url);
      if (RUN) sessionStorage.setItem(RUN, JSON.stringify(rows));
      if (opts.screens) {
        for (const scr of sc.screens.slice(1).filter((x) => x.kind !== 'flow')) {
          await SA.pickScreen(sc, scr);
          const mm = await measure(`${sc.name} · ${scr.label}`);
          const { url: _u, ...rr } = mm as Record<string, unknown> & { url?: string };
          void _u;
          rows.push({ id: `${sc.id}/${scr.id}`, ...rr });
        }
      }
    }
    if (opts.sheet && shots.length) {
      const imgs = await Promise.all(shots.map((x) => load(x.url)));
      const W = 480, H = 270, cols = 4;
      const cv = document.createElement('canvas');
      cv.width = cols * W; cv.height = Math.ceil(shots.length / cols) * (H + 22);
      const g = cv.getContext('2d')!;
      g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
      imgs.forEach((im, i) => {
        const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 22);
        g.drawImage(im, x, y + 22, W, H);
        g.fillStyle = '#eee'; g.font = '14px sans-serif'; g.fillText(shots[i].label, x + 4, y + 16);
      });
      // 名字带「/」时按 qa/ 下的路径存（轨道 Z2：tech/Z2/…），否则存 qa/redesign/D/
      await save(opts.sheet.includes('/') ? opts.sheet : `redesign/D/${opts.sheet}`, cv.toDataURL('image/png'));
    }
    return rows;
    } finally {
      host.style.cssText = prevCss;
      priv.resize();
    }
  }

  /**
   * 场景卡缩略图：每个场景（含名作、单屏名作）套上它的建议配方 + 默认皮肤，UI 模式画框 16:9 同步渲染 → public/swatches/scenes/<id>.webp（320×180）。
   * 会改这一页的状态（自己的后台标签页里跑）；已经有图的跳过（force = true 重烘），别的轨道整页刷新后再调一次接着烘。
   */
  async function bakeThumbs(ids?: string[], force = false) {
    const [{ useStore }, A, { GAME_SCENES }, SA, { getEngine }, { texturesReady }, shell, { RECIPE_MAP }, { sceneThumbUrl }] = await Promise.all([
      import('../state/store'), import('../state/actions'), import('../content/gameScenes'), import('../ui/scene/sceneActions'),
      import('../ui/engineRef'), import('../engine/textures'), import('../ui/stage/shell'), import('../content/recipes'), import('../ui/scene/sceneData'),
    ]);
    const eng = getEngine();
    if (!eng) return 'no engine';
    shell.setMode('ui');
    shell.useShell.getState().set({ uiRail: true, focus: false, zoom: 'fit' });
    await new Promise((r) => setTimeout(r, 300));
    const out: string[] = [];
    for (const sc of GAME_SCENES.filter((x) => !ids?.length || ids.includes(x.id))) {
      const file = sceneThumbUrl(sc.id).split('/').pop()!;
      if (!force) {
        const h = await fetch(`/swatches/scenes/${file}`, { method: 'HEAD' });
        if (h.ok && (h.headers.get('content-type') ?? '').includes('image')) { out.push(`${sc.id}: 已有`); continue; }
      }
      A.applySkin(null);
      if (!sc.replica) { const r = sc.look ? RECIPE_MAP.get(sc.look) : undefined; if (r) A.applyRecipe(r, { keepMine: false }); }
      await SA.pickGameScene(sc);
      if (!sc.replica) A.applySkin(null);
      useStore.getState();
      await yieldTask();
      await texturesReady();
      // 镜头复位、清 OrbitControls 阻尼、动画时间钉在 4 秒（收尾 X，同配方缩略图 gallery.ts settledShot）：同一个场景每次烘出来一样
      const ec = eng as unknown as { resetCamera(): void; simTime: number; stepTime: number; controls: { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: { set(a: number, b: number, c: number): void } } };
      ec.controls._sphericalDelta?.set(0, 0, 0);
      ec.controls._panOffset?.set(0, 0, 0);
      ec.resetCamera();
      ec.simTime = 4; ec.stepTime = 4;
      const png = eng.renderSync(3);
      const im = await load(png);
      const cv = document.createElement('canvas');
      cv.width = 320; cv.height = 180;
      const g = cv.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      const ar = 16 / 9;
      let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
      if (sw / sh > ar) { const nw = sh * ar; sx = (sw - nw) / 2; sw = nw; } else { const nh = sw / ar; sy = (sh - nh) / 2; sh = nh; }
      g.drawImage(im, sx, sy, sw, sh, 0, 0, 320, 180);
      const r = await fetch('/__bake?dir=swatches/scenes', { method: 'POST', body: JSON.stringify({ name: file, dataUrl: cv.toDataURL('image/webp', 0.82) }) });
      out.push(`${sc.id}: ${r.ok ? 'ok' : `失败 ${r.status}`}`);
    }
    return out;
  }

  devHooks({ scenes: { swatchSpike, gate, bakeThumbs } });
}

if (import.meta.hot) import.meta.hot.accept();
