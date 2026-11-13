import { getEngine } from '../engineRef';
import { useShell } from './shell';

/*
 * 截图（导出▾ › 截图，§2 F6）：只截画框，1920 × 1080（竖屏 1080 宽）。
 * 做法：画框临时放到 100%（CSS 1920 × 1080，HUD 的 unitK = 2，等于真 1080p），等引擎跟上几帧后取下一帧，再缩到整 1080p 像素（DPR > 1 时画布更大）。
 * 期间舞台盖一层「截图中」，截完回到原来的缩放和平移。
 */

const frames = (n: number) => new Promise<void>((res) => {
  const step = (i: number) => (i <= 0 ? res() : requestAnimationFrame(() => step(i - 1)));
  step(n);
});

export async function captureFrame1080(): Promise<string | null> {
  const eng = getEngine();
  if (!eng) return null;
  const sh = useShell.getState();
  const prev = { zoom: sh.zoom, pan: sh.pan };
  sh.set({ zoom: 'full', pan: { x: 0, y: 0 }, capturing: true });
  try {
    await frames(6);
    const url = await eng.capture();
    const img = new Image();
    img.src = url;
    await img.decode();
    const portrait = img.naturalHeight > img.naturalWidth;
    const w = portrait ? 1080 : Math.round((1080 * img.naturalWidth) / img.naturalHeight);
    const h = portrait ? Math.round((1080 * img.naturalHeight) / img.naturalWidth) : 1080;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    return cv.toDataURL('image/png');
  } finally {
    useShell.getState().set({ zoom: prev.zoom, pan: prev.pan, capturing: false });
  }
}
