import { trackLoad } from '../engine/textures';
import { HUD_FONT_FILES } from './fontList';

/*
 * 游戏 UI 样本字体的加载（M2）。字体文件由 Vite 当作资源打包（单文件构建时内联成 data URL，file:// 下也能用）。
 * 用 FontFace 注册后，Canvas2D 才能按 family 名画字；加载进 textures.ts 的等待集合，QA 截图（texturesReady）会等字体就绪，
 * 避免首帧用回退字体。每加载完一个字体 version + 1，HudSystem 据此重画。
 */
const URLS = import.meta.glob('../assets/fonts/*.woff2', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** 字体文件的打包后地址（Godot 导出 zip 时按地址取二进制） */
export const hudFontUrl = (file: string): string | undefined => URLS[`../assets/fonts/${file}`];

let version = 0;
let started: Promise<void> | null = null;

export const hudFontsVersion = () => version;

export function loadHudFonts(): Promise<void> {
  if (started) return started;
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return (started = Promise.resolve());
  started = Promise.all(HUD_FONT_FILES.map(async (f) => {
    const url = URLS[`../assets/fonts/${f.file}`];
    if (!url) { console.warn('缺少字体文件', f.file); return; }
    try {
      // 单字重的展示字体按字重范围注册（M12b-54：fontList.ts 的 weightRange），要粗体时不合成假粗体
      const face = new FontFace(f.family, `url(${url})`, { weight: f.weightRange ? `${f.weightRange[0]} ${f.weightRange[1]}` : String(f.weight), style: 'normal', display: 'block' });
      await face.load();
      document.fonts.add(face);
      version++;
    } catch (e) {
      console.warn('字体加载失败', f.file, e);
    }
  })).then(() => undefined);
  trackLoad(started);
  return started;
}
