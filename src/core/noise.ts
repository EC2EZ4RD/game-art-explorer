import { createNoise2D, createNoise3D } from 'simplex-noise';
import { hash2, mulberry32 } from './rng';

/*
 * CPU 端噪声：地形、散布、湿度都用它。
 * 每种噪声都是 (x, y) → 约 -1~1，方便在分形叠加里互换。
 * Godot 迁移：FastNoiseLite 有 Value / Perlin / Simplex / Cellular 四类与 FBM / Ridged / PingPong 分形，参数可一一对应。
 */

export type NoiseKind = 'value' | 'perlin' | 'simplex' | 'worley';
export type FractalKind = 'single' | 'fbm' | 'ridged' | 'billow';
export type Noise2 = (x: number, y: number) => number;

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function valueNoise(seed: number): Noise2 {
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
  };
}

function perlinNoise(seed: number): Noise2 {
  const grad = (ix: number, iy: number, dx: number, dy: number) => {
    const a = hash2(ix, iy, seed) * Math.PI * 2;
    return Math.cos(a) * dx + Math.sin(a) * dy;
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const n00 = grad(xi, yi, xf, yf), n10 = grad(xi + 1, yi, xf - 1, yf);
    const n01 = grad(xi, yi + 1, xf, yf - 1), n11 = grad(xi + 1, yi + 1, xf - 1, yf - 1);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.41;
  };
}

function worleyNoise(seed: number): Noise2 {
  // F1 距离，映射到 -1~1（细胞中心低、边缘高）
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i + hash2(xi + i, yi + j, seed);
        const cy = yi + j + hash2(xi + i, yi + j, seed + 17);
        const d = Math.hypot(x - cx, y - cy);
        if (d < d1) d1 = d;
      }
    }
    return Math.min(1, d1) * 2 - 1;
  };
}

export function makeNoise(kind: NoiseKind, seed: number): Noise2 {
  switch (kind) {
    case 'value': return valueNoise(seed);
    case 'perlin': return perlinNoise(seed);
    case 'worley': return worleyNoise(seed);
    case 'simplex':
    default: {
      const n = createNoise2D(mulberry32(seed));
      return (x, y) => n(x, y);
    }
  }
}

export function makeNoise3(seed: number) {
  return createNoise3D(mulberry32(seed));
}

export interface FractalOpts {
  kind: FractalKind;
  octaves: number;
  lacunarity: number;
  gain: number;
}

/** 分形叠加：fBm 叠细节，Ridged 出山脊，Billow 出圆鼓丘陵 */
export function fractal(base: Noise2, o: FractalOpts): Noise2 {
  if (o.kind === 'single') return base;
  return (x, y) => {
    let amp = 1, freq = 1, sum = 0, norm = 0, weight = 1;
    for (let i = 0; i < o.octaves; i++) {
      let n = base(x * freq + i * 19.1, y * freq - i * 7.3);
      if (o.kind === 'ridged') {
        n = 1 - Math.abs(n);
        n *= n;
        n *= weight;
        weight = Math.min(1, Math.max(0, n * 1.6));
        n = n * 2 - 1;
      } else if (o.kind === 'billow') {
        n = Math.abs(n) * 2 - 1;
      }
      sum += n * amp;
      norm += amp;
      amp *= o.gain;
      freq *= o.lacunarity;
    }
    return sum / norm;
  };
}

/** 域扭曲：用另一组噪声推开采样坐标，地貌像被水流冲刷过 */
export function warp(f: Noise2, amount: number, seed: number): Noise2 {
  if (amount <= 0) return f;
  const wx = makeNoise('simplex', seed + 101);
  const wy = makeNoise('simplex', seed + 202);
  return (x, y) => f(x + wx(x * 0.7, y * 0.7) * amount, y + wy(x * 0.7, y * 0.7) * amount);
}

/** Poisson-disc 采样（Bridson）：自然、不重叠的散布点 */
export function poissonDisc(
  w: number,
  h: number,
  minDist: number,
  rng: () => number,
  accept: (x: number, y: number) => boolean = () => true,
  maxPoints = 20000,
): [number, number][] {
  const cell = minDist / Math.SQRT2;
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts: [number, number][] = [];
  const active: number[] = [];
  const add = (x: number, y: number) => {
    pts.push([x, y]);
    const i = pts.length - 1;
    active.push(i);
    grid[Math.floor(y / cell) * gw + Math.floor(x / cell)] = i;
  };
  add(rng() * w, rng() * h);
  while (active.length && pts.length < maxPoints) {
    const ai = Math.floor(rng() * active.length);
    const [px, py] = pts[active[ai]];
    let found = false;
    for (let k = 0; k < 24; k++) {
      const a = rng() * Math.PI * 2;
      const r = minDist * (1 + rng());
      const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      let ok = true;
      for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2) && ok; j++) {
        for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2); i++) {
          const q = grid[j * gw + i];
          if (q >= 0) {
            const dx = pts[q][0] - x, dy = pts[q][1] - y;
            if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
          }
        }
      }
      if (ok) { add(x, y); found = true; break; }
    }
    if (!found) active.splice(ai, 1);
  }
  return pts.filter(([x, y]) => accept(x, y));
}
