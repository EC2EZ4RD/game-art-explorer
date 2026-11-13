import type { Rng } from '../../core/rng';
import type { Item } from './types';

/*
 * 部件库（程序化）：树、松、石、灌木、花、云、角色、道具。
 * 所有部件都由图元组成，并带角色标签，因此能在光滑/低模/体素之间切换、按色板取色。
 * 形状参数（圆润度、比例、细节）在这里起作用：它们改变结构，而不是材质。
 */

export interface ShapeOpts {
  roundness: number;
  proportion: number; // -1 矮胖 ~ 1 修长
  detail: number;
  variation: number;
  canopy: string;
}

type V3 = [number, number, number];

const blobPrim = (o: ShapeOpts): Item['prim'] => (o.roundness > 0.35 ? 'sphere' : 'poly');

export function broadleafTree(x: number, y: number, z: number, size: number, o: ShapeOpts, rng: Rng, id: number): Item[] {
  const items: Item[] = [];
  const tall = 1 + o.proportion * 0.45;
  const fat = 1 - o.proportion * 0.3;
  const trunkH = size * 0.95 * tall;
  const trunkR = size * 0.11 * fat;
  items.push({ prim: 'cylinder', args: [0.65], pos: [x, y + trunkH / 2 - 0.1, z], scale: [trunkR * 2, trunkH, trunkR * 2], role: 'trunk', id });
  const R = size * 0.62 * fat;
  const top = y + trunkH;
  const sway = 1;
  switch (o.canopy) {
    case 'single':
      items.push({ prim: blobPrim(o), args: [1], pos: [x, top + R * 0.75, z], scale: [R * 2.1, R * 2.1 * tall, R * 2.1], role: 'foliage', sway, id });
      break;
    case 'cone':
      for (let k = 0; k < 3; k++) {
        const r = R * (1.25 - k * 0.32);
        items.push({ prim: 'cylinder', args: [0.05 + o.roundness * 0.15], pos: [x, top + k * R * 0.62 + R * 0.2, z], scale: [r * 2, R * 1.1 * tall, r * 2], role: 'foliage', sway, id });
      }
      break;
    case 'poly':
      items.push({ prim: 'poly', args: [1], pos: [x, top + R * 0.7, z], rot: [rng(), rng() * 6, rng()], scale: [R * 2.2, R * 2.0 * tall, R * 2.2], role: 'foliage', sway, id });
      if (o.detail > 0.4) items.push({ prim: 'poly', args: [0], pos: [x + R * 0.55, top + R * 0.25, z - R * 0.2], rot: [rng(), rng() * 6, rng()], scale: [R * 1.2, R * 1.1, R * 1.2], role: 'foliage', sway, id });
      break;
    case 'tall':
      items.push({ prim: blobPrim(o), args: [1], pos: [x, top + R * 1.2, z], scale: [R * 1.3, R * 3.4 * tall, R * 1.3], role: 'foliage', sway, id });
      break;
    case 'flat':
      items.push({ prim: blobPrim(o), args: [1], pos: [x, top + R * 0.25, z], scale: [R * 2.8, R * 0.85, R * 2.8], role: 'foliage', sway, id });
      if (o.detail > 0.5) items.push({ prim: blobPrim(o), args: [1], pos: [x + R * 0.3, top + R * 0.65, z], scale: [R * 1.7, R * 0.6, R * 1.7], role: 'foliage', sway, id });
      break;
    case 'cluster':
    default: {
      const n = 3 + Math.round(o.detail * 3);
      items.push({ prim: blobPrim(o), args: [1], pos: [x, top + R * 0.7, z], scale: [R * 1.9, R * 1.75 * tall, R * 1.9], role: 'foliage', sway, id });
      for (let k = 1; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rng();
        const rr = R * (0.55 + rng() * 0.3);
        items.push({
          prim: blobPrim(o), args: [1],
          pos: [x + Math.cos(a) * R * 0.75, top + R * (0.35 + rng() * 0.7), z + Math.sin(a) * R * 0.75],
          scale: [rr * 2, rr * 1.8, rr * 2], role: 'foliage', sway, id,
        });
      }
    }
  }
  if (o.detail > 0.7) {
    const fruits = 2 + Math.round(rng() * 3);
    for (let k = 0; k < fruits; k++) {
      const a = rng() * Math.PI * 2;
      items.push({ prim: 'sphere', pos: [x + Math.cos(a) * R * 0.9, top + R * (0.3 + rng() * 0.8), z + Math.sin(a) * R * 0.9], scale: [size * 0.12, size * 0.12, size * 0.12], role: 'accent', sway, id, noOutline: true });
    }
  }
  return items;
}

export function pineTree(x: number, y: number, z: number, size: number, o: ShapeOpts, rng: Rng, id: number): Item[] {
  const items: Item[] = [];
  const tall = 1 + o.proportion * 0.5;
  const fat = 1 - o.proportion * 0.25;
  const trunkH = size * 0.5;
  items.push({ prim: 'cylinder', args: [0.7], pos: [x, y + trunkH / 2 - 0.1, z], scale: [size * 0.16, trunkH, size * 0.16], role: 'trunk', id });
  const tiers = 3 + (o.detail > 0.5 ? 1 : 0);
  const tip = 0.02 + o.roundness * 0.22;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers;
    const r = size * 0.62 * fat * (1 - t * 0.62);
    const h = size * 0.95 * tall * (1 - t * 0.2);
    items.push({
      prim: 'cylinder', args: [tip], pos: [x, y + trunkH + k * size * 0.55 * tall + h * 0.35, z], rot: [0, rng() * 6, 0],
      scale: [r * 2, h, r * 2], role: 'foliage2', sway: 0.6 + t * 0.4, id,
    });
  }
  return items;
}

export function rock(x: number, y: number, z: number, size: number, o: ShapeOpts, rng: Rng, id: number): Item[] {
  const flat = 0.55 + rng() * 0.35;
  return [{
    prim: o.roundness > 0.55 ? 'sphere' : 'poly', args: [rng() > 0.5 ? 1 : 0],
    pos: [x, y + size * flat * 0.3, z], rot: [rng() * 0.6, rng() * 6, rng() * 0.6],
    scale: [size * (1 + rng() * 0.4), size * flat, size * (0.9 + rng() * 0.3)], role: 'rock', id,
  }];
}

export function bush(x: number, y: number, z: number, size: number, o: ShapeOpts, rng: Rng, id: number): Item[] {
  const items: Item[] = [];
  const n = 2 + Math.round(o.detail * 2);
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2;
    const r = size * (0.4 + rng() * 0.25);
    items.push({ prim: blobPrim(o), args: [0], pos: [x + Math.cos(a) * size * 0.35, y + r * 0.6, z + Math.sin(a) * size * 0.35], scale: [r * 2, r * 1.6, r * 2], role: 'foliage', sway: 0.5, id });
  }
  return items;
}

export function flowers(x: number, y: number, z: number, size: number, _o: ShapeOpts, rng: Rng, id: number): Item[] {
  const items: Item[] = [];
  const n = 3 + Math.round(rng() * 3);
  for (let k = 0; k < n; k++) {
    const px = x + (rng() - 0.5) * size, pz = z + (rng() - 0.5) * size;
    const h = size * (0.25 + rng() * 0.2);
    items.push({ prim: 'cylinder', pos: [px, y + h / 2, pz], scale: [0.035, h, 0.035], role: 'foliage', sway: 0.8, id, noOutline: true });
    items.push({ prim: 'sphere', pos: [px, y + h, pz], scale: [size * 0.12, size * 0.09, size * 0.12], role: 'flower', sway: 1, id, noOutline: true });
  }
  return items;
}

export function cloud(size: number, o: ShapeOpts, rng: Rng, id: number): Item[] {
  const items: Item[] = [];
  const n = 4 + Math.round(o.detail * 3);
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : k / (n - 1) - 0.5;
    const r = size * (0.45 + (1 - Math.abs(t) * 1.6) * 0.35 + rng() * 0.12);
    items.push({
      prim: o.roundness > 0.3 ? 'sphere' : 'poly', args: [1],
      pos: [t * size * 2.2, r * 0.35 + rng() * size * 0.15, (rng() - 0.5) * size * 0.6],
      scale: [r * 2, r * 1.6, r * 1.8], role: 'cloud', id,
    });
  }
  return items;
}

/* ---------------- 角色（局部空间，脚底在原点，朝 +z） ---------------- */
export function character(style: string, headRatio: number, o: ShapeOpts, id: number): Item[] {
  const H = 0.85 + (headRatio - 1.5) * 0.15;
  const head = H / headRatio;
  const bodyH = H - head;
  const items: Item[] = [];
  const it = (prim: Item['prim'], pos: V3, scale: V3, role: Item['role'], extra: Partial<Item> = {}) => items.push({ prim, pos, scale, role, id, ...extra });
  const legH = bodyH * (headRatio < 3 ? 0.35 : 0.48);
  const torsoH = bodyH - legH;
  const w = Math.max(head * 0.85, H * 0.2) * (1 - o.proportion * 0.2);
  if (style === 'capsule') {
    it('cylinder', [0, bodyH / 2 + w * 0.25, 0], [w, bodyH - w * 0.5, w], 'character');
    it('sphere', [0, w * 0.5, 0], [w, w, w], 'character');
    it('sphere', [0, bodyH + head * 0.42, 0], [head, head, head], 'character');
    it('sphere', [-head * 0.18, bodyH + head * 0.5, head * 0.42], [head * 0.12, head * 0.16, head * 0.08], 'ink', { noOutline: true });
    it('sphere', [head * 0.18, bodyH + head * 0.5, head * 0.42], [head * 0.12, head * 0.16, head * 0.08], 'ink', { noOutline: true });
    return items;
  }
  if (style === 'blocky') {
    it('box', [0, legH + torsoH / 2, 0], [w * 1.1, torsoH, w * 0.6], 'character', { args: [0.15] });
    it('box', [0, legH + torsoH + head / 2, 0], [head * 0.95, head * 0.95, head * 0.95], 'skin', { args: [0.15] });
    it('box', [-w * 0.28, legH / 2, 0], [w * 0.45, legH, w * 0.5], 'characterAccent', { args: [0.1] });
    it('box', [w * 0.28, legH / 2, 0], [w * 0.45, legH, w * 0.5], 'characterAccent', { args: [0.1] });
    it('box', [-w * 0.75, legH + torsoH * 0.55, 0], [w * 0.36, torsoH * 0.9, w * 0.4], 'skin', { args: [0.1] });
    it('box', [w * 0.75, legH + torsoH * 0.55, 0], [w * 0.36, torsoH * 0.9, w * 0.4], 'skin', { args: [0.1] });
    it('box', [0, legH + torsoH + head * 0.95, 0], [head, head * 0.25, head], 'characterAccent', { args: [0.1] });
    it('box', [-head * 0.2, legH + torsoH + head * 0.55, head * 0.48], [head * 0.12, head * 0.15, head * 0.04], 'ink', { noOutline: true });
    it('box', [head * 0.2, legH + torsoH + head * 0.55, head * 0.48], [head * 0.12, head * 0.15, head * 0.04], 'ink', { noOutline: true });
    return items;
  }
  if (style === 'robot') {
    it('cylinder', [0, legH + torsoH / 2, 0], [w * 1.2, torsoH, w * 1.2], 'metal', { args: [0.85] });
    it('box', [0, legH + torsoH + head * 0.5, 0], [head * 1.1, head * 0.9, head], 'metal', { args: [0.4] });
    it('box', [0, legH + torsoH + head * 0.5, head * 0.46], [head * 0.8, head * 0.32, head * 0.12], 'ink', { args: [0.5], noOutline: true });
    it('sphere', [-head * 0.18, legH + torsoH + head * 0.5, head * 0.52], [head * 0.14, head * 0.14, head * 0.08], 'emissive', { noOutline: true });
    it('sphere', [head * 0.18, legH + torsoH + head * 0.5, head * 0.52], [head * 0.14, head * 0.14, head * 0.08], 'emissive', { noOutline: true });
    it('cylinder', [0, legH + torsoH + head * 1.2, 0], [0.025, head * 0.5, 0.025], 'metal');
    it('sphere', [0, legH + torsoH + head * 1.5, 0], [head * 0.18, head * 0.18, head * 0.18], 'accent');
    it('cylinder', [-w * 0.3, legH / 2, 0], [w * 0.35, legH, w * 0.35], 'characterAccent');
    it('cylinder', [w * 0.3, legH / 2, 0], [w * 0.35, legH, w * 0.35], 'characterAccent');
    it('cylinder', [-w * 0.8, legH + torsoH * 0.5, 0], [w * 0.25, torsoH * 0.8, w * 0.25], 'characterAccent', { rot: [0, 0, 0.25] });
    it('cylinder', [w * 0.8, legH + torsoH * 0.5, 0], [w * 0.25, torsoH * 0.8, w * 0.25], 'characterAccent', { rot: [0, 0, -0.25] });
    return items;
  }
  if (style === 'critter') {
    const L = H * 0.9;
    it('sphere', [0, L * 0.42, 0], [L * 0.42, L * 0.4, L * 0.75], 'character');
    it('sphere', [0, L * 0.38, L * 0.12], [L * 0.3, L * 0.28, L * 0.45], 'characterAccent');
    it('sphere', [0, L * 0.72, L * 0.38], [L * 0.42, L * 0.38, L * 0.4], 'character');
    it('pyramid', [-L * 0.13, L * 0.95, L * 0.36], [L * 0.12, L * 0.24, L * 0.08], 'character');
    it('pyramid', [L * 0.13, L * 0.95, L * 0.36], [L * 0.12, L * 0.24, L * 0.08], 'character');
    it('sphere', [0, L * 0.66, L * 0.6], [L * 0.12, L * 0.1, L * 0.12], 'ink', { noOutline: true });
    it('sphere', [0, L * 0.5, -L * 0.48], [L * 0.22, L * 0.22, L * 0.55], 'character', { rot: [0.6, 0, 0] });
    it('sphere', [0, L * 0.62, -L * 0.75], [L * 0.16, L * 0.16, L * 0.2], 'characterAccent');
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) it('cylinder', [sx * L * 0.13, L * 0.12, sz * L * 0.22], [L * 0.1, L * 0.26, L * 0.1], 'character');
    it('sphere', [-L * 0.1, L * 0.76, L * 0.56], [L * 0.06, L * 0.08, L * 0.04], 'ink', { noOutline: true });
    it('sphere', [L * 0.1, L * 0.76, L * 0.56], [L * 0.06, L * 0.08, L * 0.04], 'ink', { noOutline: true });
    return items;
  }
  // 黏土小人（默认）
  const legW = w * 0.34;
  it('cylinder', [-w * 0.22, legH / 2, 0], [legW, legH, legW], 'characterAccent', { args: [0.9] });
  it('cylinder', [w * 0.22, legH / 2, 0], [legW, legH, legW], 'characterAccent', { args: [0.9] });
  it('sphere', [-w * 0.22, legW * 0.3, w * 0.06], [legW * 1.25, legW * 0.8, legW * 1.6], 'characterAccent');
  it('sphere', [w * 0.22, legW * 0.3, w * 0.06], [legW * 1.25, legW * 0.8, legW * 1.6], 'characterAccent');
  it('cylinder', [0, legH + torsoH * 0.45, 0], [w, torsoH * 0.95, w * 0.85], 'character', { args: [0.82] });
  it('sphere', [0, legH + torsoH * 0.05, 0], [w, w * 0.6, w * 0.85], 'character');
  const armL = torsoH * 0.85;
  it('cylinder', [-w * 0.62, legH + torsoH * 0.5, 0], [w * 0.26, armL, w * 0.26], 'character', { rot: [0, 0, 0.3] });
  it('cylinder', [w * 0.62, legH + torsoH * 0.5, 0], [w * 0.26, armL, w * 0.26], 'character', { rot: [0, 0, -0.3] });
  it('sphere', [-w * 0.75, legH + torsoH * 0.12, 0], [w * 0.3, w * 0.3, w * 0.3], 'skin');
  it('sphere', [w * 0.75, legH + torsoH * 0.12, 0], [w * 0.3, w * 0.3, w * 0.3], 'skin');
  const hy = legH + torsoH + head * 0.46;
  it('sphere', [0, hy, 0], [head, head * 0.95, head], 'skin');
  it('sphere', [0, hy + head * 0.18, -head * 0.04], [head * 1.06, head * 0.72, head * 1.04], 'characterAccent');
  it('sphere', [-head * 0.17, hy - head * 0.02, head * 0.44], [head * 0.1, head * 0.14, head * 0.06], 'ink', { noOutline: true });
  it('sphere', [head * 0.17, hy - head * 0.02, head * 0.44], [head * 0.1, head * 0.14, head * 0.06], 'ink', { noOutline: true });
  it('box', [0, legH + torsoH * 0.55, -w * 0.55], [w * 0.8, torsoH * 0.7, w * 0.4], 'accent', { args: [0.4] });
  return items;
}

/* ---------------- 道具 ---------------- */
export function house(x: number, y: number, z: number, size: number, o: ShapeOpts, rot: number, id: number): Item[] {
  const items: Item[] = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (lx: number, ly: number, lz: number): V3 => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const W = size, D = size * 0.8, Hh = size * 0.62 * (1 + o.proportion * 0.4);
  items.push({ prim: 'box', args: [0.25], pos: P(0, Hh / 2, 0), rot: [0, rot, 0], scale: [W, Hh, D], role: 'structure', id });
  const roofH = size * 0.55 * (1 + o.proportion * 0.3);
  items.push({ prim: 'wedge', pos: P(0, Hh + roofH / 2, 0), rot: [0, rot, 0], scale: [W * 1.18, roofH, D * 1.15], role: 'roof', id });
  items.push({ prim: 'box', args: [0.3], pos: P(0, Hh * 0.32, D / 2 + 0.01), rot: [0, rot, 0], scale: [W * 0.22, Hh * 0.62, 0.08], role: 'wood', id });
  for (const sx of [-0.3, 0.3]) items.push({ prim: 'box', args: [0.2], pos: P(sx * W, Hh * 0.6, D / 2 + 0.01), rot: [0, rot, 0], scale: [W * 0.16, W * 0.16, 0.06], role: 'emissive', id, noOutline: true });
  if (o.detail > 0.3) items.push({ prim: 'box', args: [0.2], pos: P(W * 0.28, Hh + roofH * 0.55, -D * 0.1), rot: [0, rot, 0], scale: [W * 0.14, roofH * 0.8, W * 0.14], role: 'stone', id });
  if (o.detail > 0.6) items.push({ prim: 'box', args: [0.2], pos: P(-W * 0.38, Hh * 0.18, D / 2 + 0.15), rot: [0, rot, 0], scale: [W * 0.2, Hh * 0.18, W * 0.15], role: 'wood', id });
  return items;
}

export function lanternPost(x: number, y: number, z: number, id: number): Item[] {
  return [
    { prim: 'cylinder', pos: [x, y + 0.6, z], scale: [0.09, 1.2, 0.09], role: 'wood', id },
    { prim: 'box', args: [0.4], pos: [x, y + 1.32, z], scale: [0.26, 0.3, 0.26], role: 'emissive', id },
    { prim: 'pyramid', pos: [x, y + 1.55, z], scale: [0.34, 0.16, 0.34], role: 'roof', id },
  ];
}

export function barrel(x: number, y: number, z: number, id: number): Item[] {
  return [
    { prim: 'cylinder', args: [0.9], pos: [x, y + 0.35, z], scale: [0.5, 0.7, 0.5], role: 'wood', id },
    { prim: 'torus', args: [0.06], pos: [x, y + 0.2, z], rot: [Math.PI / 2, 0, 0], scale: [0.54, 0.54, 0.54], role: 'metal', id },
    { prim: 'torus', args: [0.06], pos: [x, y + 0.52, z], rot: [Math.PI / 2, 0, 0], scale: [0.52, 0.52, 0.52], role: 'metal', id },
  ];
}

export function crate(x: number, y: number, z: number, size: number, rot: number, id: number): Item[] {
  return [{ prim: 'box', args: [0.2], pos: [x, y + size / 2, z], rot: [0, rot, 0], scale: [size, size, size], role: 'wood', id }];
}

export function chest(x: number, y: number, z: number, rot: number, id: number): Item[] {
  return [
    { prim: 'box', args: [0.3], pos: [x, y + 0.22, z], rot: [0, rot, 0], scale: [0.7, 0.44, 0.48], role: 'interactive', id },
    { prim: 'cylinder', pos: [x, y + 0.46, z], rot: [0, rot, Math.PI / 2], scale: [0.46, 0.7, 0.46], args: [1], role: 'interactive', id },
    { prim: 'box', pos: [x, y + 0.42, z + 0.25], rot: [0, rot, 0], scale: [0.12, 0.14, 0.04], role: 'metal', id, noOutline: true },
  ];
}

export function crystal(x: number, y: number, z: number, id: number): Item[] {
  return [
    { prim: 'pyramid', pos: [x, y + 0.45, z], scale: [0.32, 0.9, 0.32], role: 'emissive', id },
    { prim: 'pyramid', pos: [x, y - 0.0, z], rot: [Math.PI, 0, 0], scale: [0.32, 0.25, 0.32], role: 'emissive', id },
  ];
}

export function mushroom(x: number, y: number, z: number, size: number, id: number): Item[] {
  return [
    { prim: 'cylinder', args: [0.8], pos: [x, y + size * 0.3, z], scale: [size * 0.3, size * 0.6, size * 0.3], role: 'structure', id },
    { prim: 'sphere', pos: [x, y + size * 0.62, z], scale: [size, size * 0.6, size], role: 'accent', id },
  ];
}

export function fence(x0: number, z0: number, x1: number, z1: number, yAt: (x: number, z: number) => number, id: number): Item[] {
  const items: Item[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.9));
  const ang = Math.atan2(x1 - x0, z1 - z0);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    items.push({ prim: 'box', args: [0.3], pos: [x, yAt(x, z) + 0.35, z], scale: [0.12, 0.7, 0.12], role: 'wood', id });
  }
  const ym = yAt((x0 + x1) / 2, (z0 + z1) / 2);
  items.push({ prim: 'box', args: [0.3], pos: [(x0 + x1) / 2, ym + 0.45, (z0 + z1) / 2], rot: [0, ang, 0], scale: [0.06, 0.08, len], role: 'wood', id });
  items.push({ prim: 'box', args: [0.3], pos: [(x0 + x1) / 2, ym + 0.22, (z0 + z1) / 2], rot: [0, ang, 0], scale: [0.06, 0.08, len], role: 'wood', id });
  return items;
}
