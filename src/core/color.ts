/** 颜色工具：十六进制 ↔ 线性 RGB ↔ OKLab。色板投影用 OKLab 求最近色，比 RGB 距离更符合人眼。 */

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToLinear(hex: string): RGB {
  const [r, g, b] = hexToRgb(hex);
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

export function linearToOklab([r, g, b]: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinear([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function hexToOklab(hex: string): RGB {
  return linearToOklab(hexToLinear(hex));
}

export function oklabToHex(lab: RGB): string {
  const [r, g, b] = oklabToLinear(lab);
  return rgbToHex([linearToSrgb(Math.max(0, r)), linearToSrgb(Math.max(0, g)), linearToSrgb(Math.max(0, b))]);
}

/** 在 OKLab 中调亮/调暗、调饱和 */
export function adjust(hex: string, dL = 0, chroma = 1, hueDeg = 0): string {
  const [L, a, b] = hexToOklab(hex);
  const c = Math.hypot(a, b) * chroma;
  const h = Math.atan2(b, a) + (hueDeg * Math.PI) / 180;
  return oklabToHex([Math.min(1, Math.max(0, L + dL)), Math.cos(h) * c, Math.sin(h) * c]);
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToOklab(a), B = hexToOklab(b);
  return oklabToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function nearestHex(hex: string, swatches: string[]): string {
  const p = hexToOklab(hex);
  let best = swatches[0], bd = Infinity;
  for (const s of swatches) {
    const q = hexToOklab(s);
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
