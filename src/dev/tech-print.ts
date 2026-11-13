/*
 * 技术补全 P1b（版画与漫画）的开发钩子：__gae.techPrint.*
 *
 *   await __gae.techPrint.shot(scene, recipe?, extra?, w?, h?)      同步渲一张（借 __gae.scenes2d.shot：画框临时钉成 w×h），返回 PNG dataURL
 *   await __gae.techPrint.save(name, scene, recipe?, extra?, w?, h?)  渲一张原尺寸 → qa/tech/P1b/<name>.png
 *   await __gae.techPrint.sheet(name, cells, cols?, cw?)             拼成接触表 → qa/tech/P1b/<name>.png（cells: { scene, recipe?, extra?, label?, crop? }）
 *       crop = [x, y, w, h]（0~1，画面里的一块）：放大看细节（笔点、纸纹、套版错位）
 *   __gae.techPrint.values(scene, recipe?, extra?)                   一张图交给引擎的参数
 *
 * 渲染不经过 store（不写撤销、不写存档）；渲完把 store 里的参数重新交给引擎。只在开发环境有效，请在自己的后台标签页里跑。
 */
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  type Cell = { scene: string; recipe?: string; extra?: Record<string, unknown>; label?: string; crop?: [number, number, number, number]; w?: number; h?: number };
  type S2 = { shot(scene: string, recipe?: string, extra?: Record<string, unknown>, w?: number, h?: number): Promise<string | null>; values(scene: string, recipe?: string, extra?: Record<string, unknown>): Promise<Record<string, unknown>> };
  const s2 = () => (window as unknown as { __gae: { scenes2d: S2 } }).__gae.scenes2d;
  const load = (u: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const post = async (name: string, dataUrl: string) => {
    const r = await fetch('/__qa/save', { method: 'POST', body: JSON.stringify({ name: `tech/P1b/${name}`, dataUrl }) });
    return r.ok ? `saved qa/tech/P1b/${name}.png` : await r.text();
  };

  const shot = (scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540) => s2().shot(scene, recipe, extra, w, h);

  async function save(name: string, scene: string, recipe?: string, extra: Record<string, unknown> = {}, w = 960, h = 540) {
    const url = await shot(scene, recipe, extra, w, h);
    return url ? post(name, url) : 'no shot';
  }

  async function sheet(name: string, cells: Cell[], cols = 3, cw = 640) {
    const head = 26;
    const imgs: { label: string; im: HTMLImageElement | null; crop?: Cell['crop'] }[] = [];
    for (const c of cells) {
      const url = await shot(c.scene, c.recipe, c.extra, c.w ?? 960, c.h ?? 540);
      imgs.push({ label: c.label ?? `${c.scene} · ${c.recipe ?? '默认'}`, im: url ? await load(url) : null, crop: c.crop });
    }
    const ch = Math.round((cw * 9) / 16);
    const rows = Math.ceil(imgs.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * (ch + head);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '15px sans-serif';
    g.imageSmoothingQuality = 'high';
    imgs.forEach((s, i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + head);
      if (s.im) {
        const W = s.im.naturalWidth, H = s.im.naturalHeight;
        let [sx, sy, sw, sh] = s.crop ? [s.crop[0] * W, s.crop[1] * H, s.crop[2] * W, s.crop[3] * H] : [0, 0, W, H];
        // 居中裁 16:9
        const ar = 16 / 9;
        if (sw / sh > ar) { const nw = sh * ar; sx += (sw - nw) / 2; sw = nw; } else { const nh = sw / ar; sy += (sh - nh) / 2; sh = nh; }
        g.imageSmoothingEnabled = !s.crop;
        g.drawImage(s.im, sx, sy, sw, sh, x, y + head, cw, ch);
      } else { g.fillStyle = '#633'; g.fillRect(x, y + head, cw, ch); }
      g.fillStyle = '#eee'; g.fillText(s.label, x + 6, y + 18);
    });
    return post(name, cv.toDataURL('image/png'));
  }

  /**
   * 前后对照表：每行 = 一个场景的「原样 / 打开新技术 / 细节放大」。
   * on = 打开新技术的参数（如 { 'surface.medium': 'ukiyoe' }）；rows = [场景, 配方, 放大区域, 这一行额外的参数]
   */
  async function ba(name: string, on: Record<string, unknown>, rows: [string, string, Cell['crop'], Record<string, unknown>?][], tag = '') {
    const cells: Cell[] = rows.flatMap(([scene, recipe, crop, ex]) => [
      { scene, recipe, extra: { ...(ex ?? {}) }, label: `${scene} · ${recipe} · 原样` },
      { scene, recipe, extra: { ...(ex ?? {}), ...on }, label: `${scene} · ${recipe} · ${tag || Object.values(on).join(' ')}` },
      { scene, recipe, extra: { ...(ex ?? {}), ...on }, label: '细节放大', crop },
    ]);
    return sheet(name, cells, 3, 640);
  }

  devHooks({ techPrint: { shot, save, sheet, ba, values: (scene: string, recipe?: string, extra?: Record<string, unknown>) => s2().values(scene, recipe, extra) } });
}

if (import.meta.hot) import.meta.hot.accept();
