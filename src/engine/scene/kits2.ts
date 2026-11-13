import type { Role } from '../../content/roles';
import type { Rng } from '../../core/rng';
import { B } from './kits';

/*
 * 第二批套件：农场、城市、遗迹、水下、工业、赛道、竞技场、桌面、超现实。
 */

/* ---------- 农场 ---------- */
export function cropRows(b: B, w: number, d: number, kind: 'wheat' | 'cabbage' | 'corn', rng: Rng) {
  b.box(0, -0.05, 0, w, 0.12, d, 'soil', { noOutline: true });
  const rows = Math.round(d / 0.8);
  for (let r = 0; r < rows; r++) {
    const z = -d / 2 + (r + 0.5) * (d / rows);
    b.box(0, 0.02, z, w * 0.96, 0.12, 0.22, 'soil', { noOutline: true });
    const n = Math.round(w / 0.55);
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + (k + 0.5) * (w / n);
      if (kind === 'cabbage') b.ball(x, 0.2, z, 0.2, 0.16, 0.2, 'foliage', { sway: 0.1 });
      else if (kind === 'corn') b.add('cylinder', x, 0.55, z, 0.08, 1.1 + rng() * 0.2, 0.08, 'foliage2', { args: [0.4], sway: 0.8 });
      else b.add('cylinder', x, 0.3, z, 0.22, 0.6, 0.22, 'sand', { args: [1.4], sway: 0.9, noOutline: true });
    }
  }
}
export function barn(b: B, w: number, d: number) {
  b.box(0, 0, 0, w, 3, d, 'roof');
  b.add('wedge', 0, 3 + 1.1, 0, w + 0.4, 2.2, d + 0.4, 'trim');
  b.box(0, 0, d / 2 + 0.02, w * 0.4, 2.4, 0.08, 'structure');
  b.add('box', 0, 1.2, d / 2 + 0.07, w * 0.4, 0.12, 0.04, 'trim', { rz: 0.9, noOutline: true });
  b.add('box', 0, 1.2, d / 2 + 0.07, w * 0.4, 0.12, 0.04, 'trim', { rz: -0.9, noOutline: true });
}
export function windmill(b: B, h: number) {
  b.cyl(0, 0, 0, 1.2, h, 'structure', 0.7);
  b.add('cylinder', 0, h + 0.7, 0, 1.9, 1.4, 1.9, 'roof', { args: [0] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.3;
    b.add('box', Math.cos(a) * 1.9, h - 0.2 + Math.sin(a) * 1.9, 1.15, 0.5, 3.8, 0.06, 'cloth', { rz: a - Math.PI / 2 });
  }
  b.ball(0, h - 0.2, 1.1, 0.2, 0.2, 0.2, 'wood');
}
export function haystack(b: B) {
  b.add('cylinder', 0, 0.55, 0, 1.4, 1.1, 1.4, 'sand', { args: [0.75] });
  b.ball(0, 1.1, 0, 0.55, 0.35, 0.55, 'sand');
}
export function scarecrow(b: B) {
  b.cyl(0, 0, 0, 0.05, 1.6, 'wood');
  b.add('box', 0, 1.25, 0, 1.2, 0.06, 0.06, 'wood');
  b.box(0, 0.8, 0, 0.45, 0.6, 0.2, 'cloth');
  b.ball(0, 1.55, 0, 0.18, 0.2, 0.18, 'sand');
  b.add('cylinder', 0, 1.78, 0, 0.6, 0.1, 0.6, 'trim', { args: [1] });
}

/* ---------- 城市 ---------- */
export function tallBuilding(b: B, w: number, d: number, h: number, rng: Rng, roleWall: Role = 'structure') {
  b.box(0, 0, 0, w, h, d, roleWall, { args: [0.05] });
  const floors = Math.floor(h / 3);
  const cols = Math.max(1, Math.round(w / 1.6));
  for (let f = 1; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.18) continue;
      const x = -w / 2 + ((c + 0.5) / cols) * w;
      const lit = rng() > 0.55;
      b.box(x, f * 3 + 0.6, d / 2 + 0.01, (w / cols) * 0.6, 1.4, 0.04, lit ? 'emissive' : 'glass', { noOutline: true });
      b.box(-w / 2 - 0.01, f * 3 + 0.6, -d / 2 + ((c + 0.5) / cols) * d, 0.04, 1.4, (d / cols) * 0.6, rng() > 0.55 ? 'emissive' : 'glass', { noOutline: true });
    }
  }
  b.box(0, h, 0, w * 0.4, 1.2, d * 0.4, 'metal');
  if (rng() > 0.6) b.cyl(w * 0.25, h, -d * 0.2, 0.05, 3, 'metal');
}
export function car(b: B, color: Role) {
  b.box(0, 0.25, 0, 1.8, 0.5, 0.95, color, { args: [0.5] });
  b.box(-0.1, 0.75, 0, 1.0, 0.4, 0.85, color, { args: [0.6] });
  b.box(-0.1, 0.78, 0, 1.02, 0.3, 0.87, 'glass', { noOutline: true });
  for (const sx of [-0.6, 0.6]) for (const sz of [-0.47, 0.47]) b.add('cylinder', sx, 0.22, sz, 0.42, 0.18, 0.42, 'ink', { rx: Math.PI / 2 });
}

/* ---------- 废墟与末日 ---------- */
export function ruinedBuilding(b: B, w: number, d: number, h: number, rng: Rng) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const hh = h * (0.35 + rng() * 0.65);
    b.box(-w / 2 + t * w, 0, -d / 2, w / n + 0.02, hh, 0.35, 'structure');
    if (rng() > 0.35) b.box(-w / 2, 0, -d / 2 + t * d, 0.35, h * (0.25 + rng() * 0.6), d / n + 0.02, 'structure');
  }
  for (let k = 0; k < 6; k++) b.add('poly', (rng() - 0.5) * w, 0.3, (rng() - 0.5) * d, 0.8 + rng(), 0.5, 0.8 + rng(), 'stone', { args: [1], ry: rng() * 6 });
  b.box(-w * 0.2, h * 0.5, -d / 2 + 0.2, 0.18, 0.18, d * 0.6, 'metal', { rx: 0.4 });
}
export function fireBarrel(b: B) {
  b.cyl(0, 0, 0, 0.3, 0.8, 'metal', 0.95);
  b.ball(0, 0.85, 0, 0.22, 0.3, 0.22, 'emissive');
}

/* ---------- 水下 ---------- */
export function coral(b: B, rng: Rng, role: Role) {
  const kind = Math.floor(rng() * 3);
  if (kind === 0) {
    for (let k = 0; k < 5; k++) b.add('cylinder', (rng() - 0.5) * 0.6, 0.4, (rng() - 0.5) * 0.6, 0.12, 0.8 + rng() * 0.8, 0.12, role, { args: [0.6], rx: (rng() - 0.5) * 0.6, rz: (rng() - 0.5) * 0.6, sway: 0.2 });
  } else if (kind === 1) {
    b.ball(0, 0.35, 0, 0.6, 0.45, 0.6, role);
    for (let k = 0; k < 6; k++) b.ball((rng() - 0.5) * 0.8, 0.6, (rng() - 0.5) * 0.8, 0.12, 0.12, 0.12, 'flower', { noOutline: true });
  } else {
    b.add('cylinder', 0, 0.5, 0, 1.4, 0.08, 1.0, role, { args: [1], rx: 1.2 });
  }
}
export function seaweed(b: B, h: number) {
  for (let k = 0; k < 4; k++) b.add('cylinder', 0, (h * (k + 0.5)) / 4, 0, 0.1, h / 4 + 0.05, 0.1, 'foliage2', { args: [0.8], sway: 0.3 + k * 0.25 });
}
export function fish(b: B, role: Role) {
  b.ball(0, 0, 0, 0.32, 0.18, 0.1, role);
  b.add('pyramid', -0.38, 0, 0, 0.2, 0.25, 0.04, role, { rz: Math.PI / 2 });
}
export function shipwreck(b: B) {
  b.add('wedge', 0, 0.8, 0, 2.6, 1.6, 7, 'wood', { rz: Math.PI + 0.35, rx: 0.1 });
  b.cyl(0.4, 0.8, 0.5, 0.12, 4, 'wood', 1, { rz: -0.6 });
  b.box(-0.6, 0, -2.8, 1.2, 1.0, 1.0, 'wood', { ry: 0.6 });
}

/* ---------- 工业 ---------- */
export function machine(b: B, rng: Rng) {
  b.box(0, 0, 0, 2.2, 1.6, 1.6, 'metal');
  b.box(0.6, 1.6, 0, 0.7, 0.9, 0.7, 'structure');
  b.cyl(-0.6, 1.6, 0.2, 0.25, 1.4, 'metal');
  b.box(0, 0.9, 0.81, 0.6, 0.3, 0.02, 'emissive', { noOutline: true });
  b.box(-1.1, 0.05, 0, 0.06, 0.1, 1.6, 'accent', { noOutline: true });
  if (rng() > 0.5) b.add('torus', 0.6, 2.7, 0, 0.6, 0.6, 0.6, 'metal', { args: [0.12] });
}
export function conveyor(b: B, len: number) {
  b.box(0, 0.7, 0, 1.0, 0.14, len, 'ink');
  for (let i = 0; i <= Math.round(len / 1.5); i++) for (const s of [-1, 1]) b.box(s * 0.45, 0, -len / 2 + i * 1.5, 0.08, 0.7, 0.08, 'metal');
  for (let i = 0; i < Math.round(len / 1.2); i++) b.box(0, 0.84, -len / 2 + (i + 0.5) * 1.2, 0.5, 0.35, 0.5, 'wood', { args: [0.15] });
}
export function hazardStripe(b: B, len: number) {
  for (let i = 0; i < Math.round(len / 0.5); i++) b.box(-len / 2 + (i + 0.5) * 0.5, 0.005, 0, 0.25, 0.01, 0.4, i % 2 ? 'ink' : 'interactive', { noOutline: true, rz: 0 });
}

/* ---------- 赛道与竞技 ---------- */
export function barrier(b: B, len: number) {
  for (let i = 0; i < Math.round(len / 1); i++) b.box(-len / 2 + (i + 0.5), 0, 0, 0.98, 0.5, 0.3, i % 2 ? 'accent' : 'paper', { args: [0.3] });
}
export function brazier(b: B) {
  b.cyl(0, 0, 0, 0.15, 1.0, 'metal');
  b.add('cylinder', 0, 1.1, 0, 0.8, 0.3, 0.8, 'metal', { args: [1.4] });
  b.ball(0, 1.35, 0, 0.3, 0.35, 0.3, 'emissive');
}
export function dangerZone(b: B, r: number) {
  b.add('torus', 0, 0.03, 0, r * 2, r * 2, 0.4, 'accent', { rx: Math.PI / 2, args: [0.04], noOutline: true });
  b.add('cylinder', 0, 0.01, 0, r * 1.9, 0.02, r * 1.9, 'accent', { noOutline: true });
}
export function statue(b: B, h: number) {
  b.box(0, 0, 0, 2, 0.8, 2, 'stone');
  b.add('cylinder', 0, 0.8 + h * 0.35, 0, 1.0, h * 0.7, 1.0, 'stone', { args: [0.7] });
  b.ball(0, 0.8 + h * 0.8, 0, 0.45, 0.5, 0.45, 'stone');
  for (const s of [-1, 1]) b.add('box', s * 0.7, 0.8 + h * 0.75, 0, 1.2, 0.25, 0.3, 'stone', { rz: s * 0.5 });
}

/* ---------- 桌面 ---------- */
export function boardTile(b: B, x: number, z: number, size: number, dark: boolean) {
  b.box(x, 0, z, size * 0.98, 0.12, size * 0.98, dark ? 'wood' : 'paper', { noOutline: true, args: [0.05] });
}
export function chessPiece(b: B, kind: 'pawn' | 'king' | 'rook', role: Role) {
  b.cyl(0, 0, 0, 0.32, 0.12, role, 0.9);
  b.cyl(0, 0.12, 0, 0.22, kind === 'pawn' ? 0.4 : 0.7, role, 0.6);
  if (kind === 'pawn') b.ball(0, 0.62, 0, 0.17, 0.17, 0.17, role);
  else if (kind === 'rook') b.box(0, 0.8, 0, 0.36, 0.24, 0.36, role, { args: [0.1] });
  else {
    b.ball(0, 0.95, 0, 0.2, 0.2, 0.2, role);
    b.box(0, 1.15, 0, 0.06, 0.25, 0.06, role);
    b.box(0, 1.2, 0, 0.18, 0.06, 0.06, role);
  }
}
export function card(b: B, role: Role, ry = 0) {
  b.box(0, 0, 0, 0.63, 0.02, 0.88, 'paper', { ry, noOutline: false, args: [0.2] });
  b.box(0, 0.021, 0, 0.5, 0.005, 0.75, role, { ry, noOutline: true, args: [0.1] });
}
export function die(b: B, ry: number) {
  b.box(0, 0, 0, 0.3, 0.3, 0.3, 'paper', { args: [0.7], ry });
  b.ball(0, 0.305, 0, 0.04, 0.01, 0.04, 'ink', { noOutline: true });
}
export function coinStack(b: B, n: number) {
  for (let k = 0; k < n; k++) b.add('cylinder', (k % 2) * 0.01, 0.02 + k * 0.035, 0, 0.26, 0.03, 0.26, 'interactive', { noOutline: k < n - 1 });
}

/* ---------- 超现实 ---------- */
export function floatingChunk(b: B, r: number, rng: Rng) {
  b.add('cylinder', 0, -r * 0.6, 0, r * 2, r * 1.2, r * 2, 'rock', { args: [1.5] });
  b.add('cylinder', 0, -r * 1.5, 0, r * 1.5, r * 0.9, r * 1.5, 'rock', { args: [1.6], rx: Math.PI });
  b.box(0, -0.05, 0, r * 1.9, 0.1, r * 1.9, 'grass', { args: [0.5] });
  if (rng() > 0.4) b.ball(0, 0.8, 0, 0.6, 0.7, 0.6, 'foliage', { sway: 0.4 });
}
export function stairs(b: B, steps: number, w: number) {
  for (let i = 0; i < steps; i++) b.box(0, i * 0.3, i * 0.4, w, 0.3, 0.4, 'stone', { args: [0.05] });
}
export function doorFrame(b: B) {
  b.box(0, 0, 0, 1.4, 2.4, 0.2, 'trim');
  b.box(0, 0, 0.01, 1.0, 2.1, 0.22, 'emissive', { noOutline: true });
}
