import * as THREE from 'three';
import { assetUrl } from '../content/assets';

/*
 * 素材纹理缓存：第一次用到时才加载；加载完成前用 1×1 的中性色占位（纸纹 = 中灰、法线 = 朝上、遮罩 = 白），
 * 所以切换选项时画面不会闪黑。图片到了以后释放占位纹理、换上真图（尺寸变了必须重新分配 GPU 存储）。
 * 所有纹理 flipY = false：v = 0 是图片第一行，和 Python 处理脚本输出的切图坐标一致。
 */

export interface TexOpts {
  /** 平铺（REPEAT）还是夹边 */
  repeat?: boolean;
  /** 最近邻（像素精灵）；否则三线性 + 各向异性 */
  nearest?: boolean;
  /** 颜色贴图按 sRGB 解码；高度、法线、遮罩保持线性 */
  srgb?: boolean;
  /** 占位色 */
  placeholder?: string;
}

const cache = new Map<string, THREE.Texture>();
const pending = new Set<Promise<void>>();

export function assetTexture(file: string, o: TexOpts = {}): THREE.Texture {
  const key = `${file}|${o.repeat ? 1 : 0}${o.nearest ? 1 : 0}${o.srgb ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d')!;
  g.fillStyle = o.placeholder ?? '#808080';
  g.fillRect(0, 0, 1, 1);
  const t = new THREE.Texture<TexImageSource>(c);
  t.flipY = false;
  t.wrapS = t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = o.nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = o.nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = !o.nearest;
  t.anisotropy = o.nearest ? 1 : 8;
  t.colorSpace = o.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  cache.set(key, t);
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      t.dispose();
      t.image = img;
      t.needsUpdate = true;
      resolve();
    };
    img.onerror = () => {
      console.warn('素材加载失败', file);
      resolve();
    };
    img.src = assetUrl(file);
  });
  pending.add(p);
  p.then(() => pending.delete(p));
  return t;
}

/** 把其他异步资源（如 UI 字体）也纳入等待集合 */
export function trackLoad(p: Promise<void>) {
  pending.add(p);
  p.then(() => pending.delete(p));
}

/** 还在加载的素材数（UI 位图是画到才请求的，会在渲染之后才进入等待集合） */
export const texturesPending = () => pending.size;

/** 等待当前所有素材加载完成（视觉回归截图前调用） */
export async function texturesReady(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}

/**
 * 程序画出来的贴图（牌面等，SceneImage.canvas）：按 key 缓存，同一个 key 只画一次；颜色按 sRGB 解码，三线性过滤。
 * 画在 2D 画布上（只用图形与 ASCII 字母数字，不用中文字，所以不涉及 HUD 的字体子集）
 */
export function proceduralTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const k = `proc|${key}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  draw(c.getContext('2d')!, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  cache.set(k, t);
  return t;
}

/** 1×1 纹理（未选素材时绑定，避免着色器读到空纹理） */
export function solidTexture(color: string): THREE.Texture {
  const key = `solid|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 1, 1);
  const t = new THREE.Texture(c);
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}
