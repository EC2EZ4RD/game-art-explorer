import * as THREE from 'three';
import { hexToLinear, hexToRgb, linearToOklab } from '../../../core/color';
import { num, str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 硬件限色（color.hardware，P2）：按老机器真实的颜色规则重新"画"一遍画面。
 *
 *   NES      2C02 的 54 色；每 16×16 属性格只能用 3 色 + 全屏共用的底色；角色（精灵）另有自己的 3 色，不跟背景格冲突
 *   SNES     15 位色（每通道 32 级）；明暗按色阶分档 + 轻微 2×2 抖色（16 位游戏手工色阶的样子）
 *   C64      Pepto 测定的 16 色；多色位图模式：横向双宽像素，每 4×8 格 3 色 + 共用底色
 *   CGA      调色板 1 高亮：黑 / 青 / 品红 / 白，靠抖色凑中间色
 *   EGA      16 色 + 抖色
 *   GBC      15 位色，每 8×8 图块 4 色；精灵另有 3 色
 *   ZX       ZX Spectrum 属性冲突：每 8×8 格只有墨色 + 纸色两种，且两色共用一个"亮"位
 *
 * 分辨率：按各机型的行数（NES 240、SNES 224、C64/CGA/EGA 200、GBC 144、ZX 192）算出"一个硬件像素 = 几个内部像素"，
 * 像素化（camera.pixelSize）已经够粗时就是 1，两者配合用；画面按硬件像素中心点采样。
 *
 * 三个 pass：
 *   shared  1×1：全屏共用底色 = 画面 12×7 个采样点（不算角色）量化后出现最多的颜色
 *   cells   每个属性格 × 4 个颜色 × 2 层（背景 / 精灵）一张小纹理：在格子里取至多 8×8 个点，量化到母色板，
 *           贪心地挑出让总误差最小的几种颜色（ZX：两种亮度各试全部 28 对墨色 / 纸色，取误差最小的一对）
 *   main    每个硬件像素在自己格子的候选色里找最近的（OKLab），可选有序抖色
 * 迁移到 Godot：三个 SubViewport / 全屏着色器同样的顺序；格子纹理是一张 (格数×4)×(格数×2) 的小 Viewport。
 */

type Spec = { mode: number; lines: number; fat: number; cell: [number, number]; pick: number; shared: boolean; sprite: boolean; pal: string[] | null; spread: number; sat: number; abW: number };

const NES = [
  '7C7C7C', '0000FC', '0000BC', '4428BC', '940084', 'A80020', 'A81000', '881400', '503000', '007800', '006800', '005800', '004058',
  'BCBCBC', '0078F8', '0058F8', '6844FC', 'D800CC', 'E40058', 'F83800', 'E45C10', 'AC7C00', '00B800', '00A800', '00A844', '008888',
  'F8F8F8', '3CBCFC', '6888FC', '9878F8', 'F878F8', 'F85898', 'F87858', 'FCA044', 'F8B800', 'B8F818', '58D854', '58F898', '00E8D8', '787878',
  'A4E4FC', 'B8B8F8', 'D8B8F8', 'F8B8F8', 'F8A4C0', 'F0D0B0', 'FCE0A8', 'F8D878', 'D8F878', 'B8F8B8', 'B8F8D8', '00FCFC', 'F8D8F8',
  '000000',
];
/** C64：Pepto（Philip Timmermann）实测的 VIC-II 16 色 */
const C64 = ['000000', 'FFFFFF', '68372B', '70A4B2', '6F3D86', '588D43', '352879', 'B8C76F', '6F4F25', '433900', '9A6759', '444444', '6C6C6C', '9AD284', '6C5EB5', '959595'];
const CGA = ['000000', '55FFFF', 'FF55FF', 'FFFFFF'];
const EGA = ['000000', '0000AA', '00AA00', '00AAAA', 'AA0000', 'AA00AA', 'AA5500', 'AAAAAA', '555555', '5555FF', '55FF55', '55FFFF', 'FF5555', 'FF55FF', 'FFFF55', 'FFFFFF'];
/** ZX Spectrum：前 8 个普通亮度，后 8 个 BRIGHT（顺序：黑 蓝 红 品红 绿 青 黄 白） */
const ZX = ['000000', '0000D7', 'D70000', 'D700D7', '00D700', '00D7D7', 'D7D700', 'D7D7D7', '000000', '0000FF', 'FF0000', 'FF00FF', '00FF00', '00FFFF', 'FFFF00', 'FFFFFF'];

const SPECS: Record<string, Spec> = {
  nes: { mode: 1, lines: 240, fat: 1, cell: [16, 16], pick: 3, shared: true, sprite: true, pal: NES, spread: 0.12, sat: 1.25, abW: 1.6 },
  snes: { mode: 2, lines: 224, fat: 1, cell: [0, 0], pick: 0, shared: false, sprite: false, pal: null, spread: 0, sat: 1.05, abW: 1 },
  c64: { mode: 3, lines: 200, fat: 2, cell: [4, 8], pick: 3, shared: true, sprite: true, pal: C64, spread: 0.14, sat: 1.35, abW: 2.2 },
  cga: { mode: 4, lines: 200, fat: 1, cell: [0, 0], pick: 0, shared: false, sprite: false, pal: CGA, spread: 0.5, sat: 1, abW: 1 },
  ega: { mode: 5, lines: 200, fat: 1, cell: [0, 0], pick: 0, shared: false, sprite: false, pal: EGA, spread: 0.26, sat: 1.5, abW: 2.5 },
  gbc: { mode: 6, lines: 144, fat: 1, cell: [8, 8], pick: 4, shared: false, sprite: true, pal: null, spread: 0.08, sat: 1.15, abW: 1 },
  zx: { mode: 7, lines: 192, fat: 1, cell: [8, 8], pick: 2, shared: false, sprite: false, pal: ZX, spread: 0.34, sat: 1.7, abW: 2.6 },
};

/* 各 pass 共用的 uniform 对象（同一个对象挂在三个 pass 上，改一次都生效） */
const PAL = {
  uMode: { value: 0 },
  uPalLab: { value: Array.from({ length: 64 }, () => new THREE.Vector3()) },
  uPalRgb: { value: Array.from({ length: 64 }, () => new THREE.Vector3()) },
  uPalN: { value: 0 },
  uHw: { value: new THREE.Vector2(1, 1) },
  uCell: { value: new THREE.Vector2(8, 8) },
  uPick: { value: 3 },
  uSharedOn: { value: 0 },
  uSpriteOn: { value: 0 },
  uSat: { value: 1 },
  uAbW: { value: 1 },
  uDither: { value: 0.5 },
};
const tex = () => ({ value: null as THREE.Texture | null });

const LIB = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform int uMode;
uniform vec3 uPalLab[64];
uniform vec3 uPalRgb[64];
uniform int uPalN;
uniform vec2 uHw;
uniform vec2 uCell;
uniform float uPick;
uniform float uSharedOn;
uniform float uSpriteOn;
uniform float uSat;
uniform float uAbW;
uniform float uDither;
vec3 labOf(vec3 c) { return toOklab(srgbToLin(clamp(c, 0.0, 1.0))); }
/** 画面颜色进 OKLab 时先提一点彩度：老机器的颜色都很鲜，转换工具也都会先提饱和，否则暗绿会被明度拉到红、灰上 */
vec3 labIn(vec3 c) { vec3 l = labOf(c); l.yz *= uSat; return l; }
/** 加权距离：色相 / 彩度比明度更重要（颜色越少越要先保住"它是绿的"） */
float d2(vec3 a, vec3 b) { vec3 d = a - b; return d.x * d.x + uAbW * dot(d.yz, d.yz); }
/** 点 p 到线段 ab 的距离²（有抖色时，墨纸两色之间的颜色都能凑出来）与线段上的位置 t */
float segD2(vec3 p, vec3 a, vec3 b, out float t) {
  vec3 ab = b - a; vec3 w = vec3(1.0, uAbW, uAbW);
  t = clamp(dot((p - a) * w, ab) / max(dot(ab * w, ab), 1e-6), 0.0, 1.0);
  return d2(p, a + ab * t);
}
vec3 snap15(vec3 c) { return floor(clamp(c, 0.0, 1.0) * 31.0 + 0.5) / 31.0; }
/** 母色板里最近的颜色（显示空间）；没有色板 = 15 位色 */
vec3 nearestMaster(vec3 c) {
  if (uPalN == 0) return snap15(linToSrgb(fromOklab(labIn(c))));
  vec3 L = labIn(c);
  float best = 1e9; vec3 o = vec3(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= uPalN) break;
    float e = d2(L, uPalLab[i]);
    if (e < best) { best = e; o = uPalRgb[i]; }
  }
  return o;
}
/** 硬件像素（从左上角数）的中心 uv */
vec2 hwUv(vec2 hp) {
  vec2 px = min((hp + 0.5) * uHw, uRes - 0.5);
  return vec2(px.x, uRes.y - px.y) / uRes;
}
`;

/** 1×1：全屏共用底色 */
const SHARED = LIB + /* glsl */ `
void main() {
  vec3 q[84];
  int n = 0;
  for (int j = 0; j < 7; j++) for (int i = 0; i < 12; i++) {
    vec2 uv = (vec2(i, j) + 0.5) / vec2(12.0, 7.0);
    if (uSpriteOn > 0.5 && isCharacterRole(roleAt(tNormal, uv))) continue;
    q[n] = nearestMaster(texture(tInput, uv).rgb);
    n++;
  }
  vec3 best = vec3(0.0); int bc = -1;
  for (int i = 0; i < 84; i++) {
    if (i >= n) break;
    int c = 0;
    for (int j = 0; j < 84; j++) { if (j >= n) break; if (d2(q[i], q[j]) < 1e-5) c++; }
    if (c > bc) { bc = c; best = q[i]; }
  }
  oColor = vec4(best, 1.0);
}`;

/** 格子调色板：纹素 (格x×4 + k, 格y×2 + 层) = 这一格这一层的第 k 种颜色 */
const CELLS = LIB + /* glsl */ `
uniform sampler2D tShared;
const vec3 ZXC[16] = vec3[16](
  vec3(0.0), vec3(0.0, 0.0, 0.843), vec3(0.843, 0.0, 0.0), vec3(0.843, 0.0, 0.843), vec3(0.0, 0.843, 0.0), vec3(0.0, 0.843, 0.843), vec3(0.843, 0.843, 0.0), vec3(0.843),
  vec3(0.0), vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), vec3(1.0));
void main() {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  int k = fc.x - (fc.x / 4) * 4;
  int layer = fc.y - (fc.y / 2) * 2;
  vec2 cell = vec2(float(fc.x / 4), float(fc.y / 2));
  int sx = int(min(uCell.x, 8.0)), sy = int(min(uCell.y, 8.0));
  vec2 stp = uCell / vec2(float(sx), float(sy));
  // 采样并合并相同（OKLab 距离很近）的颜色：ul / ur = 不同的颜色，uw = 出现次数（后面所有误差都按次数加权，计算量按"不同颜色数"走）
  vec3 ul[64]; vec3 ur[64]; float uw[64];
  int m = 0;
  for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
    if (i >= sx || j >= sy) continue;
    vec2 hp = cell * uCell + floor((vec2(i, j) + 0.5) * stp);
    vec2 uv = hwUv(hp);
    bool ch = uSpriteOn > 0.5 && isCharacterRole(roleAt(tNormal, uv));
    if ((layer == 1) != ch) continue;
    vec3 c = texture(tInput, uv).rgb;
    vec3 l;
    if (uMode != 7) { c = nearestMaster(c); l = labOf(c); } else l = labIn(c);
    int f = -1;
    for (int q = 0; q < 64; q++) { if (q >= m) break; if (d2(ul[q], l) < 4e-4) { f = q; break; } }
    if (f >= 0) uw[f] += 1.0;
    else { ul[m] = l; ur[m] = c; uw[m] = 1.0; m++; }
  }
  if (m == 0) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  if (uMode == 7) {
    // ZX：两种亮度 × 36 对（含同色）里找误差最小的墨色 / 纸色
    float best = 1e9; vec3 ink = vec3(0.0), paper = vec3(0.0);
    float dk = min(uDither * 1.6, 1.0);
    for (int b = 0; b < 2; b++) {
      vec3 pl[8];
      for (int i = 0; i < 8; i++) pl[i] = labOf(ZXC[b * 8 + i]);
      for (int i = 0; i < 8; i++) for (int j = 0; j < 8; j++) {
        if (j < i) continue;
        // 有抖色时墨纸之间的颜色都能用点阵凑出来：误差按到两色连线的距离算（越抖越接近线段距离）
        float e = 0.0, t;
        for (int s = 0; s < 64; s++) {
          if (s >= m) break;
          float near = min(d2(ul[s], pl[i]), d2(ul[s], pl[j]));
          e += uw[s] * mix(near, segD2(ul[s], pl[i], pl[j], t), dk);
        }
        if (e < best) { best = e; ink = ZXC[b * 8 + i]; paper = ZXC[b * 8 + j]; }
      }
    }
    oColor = vec4(k == 0 ? ink : paper, 1.0);
    return;
  }
  // 贪心选色：先放进共用底色（背景层），每轮挑一个让全格（按次数加权）误差降得最多的颜色；第 k 个纹素只需要算到第 k 轮
  float cur[64];
  bool useBg = layer == 0 && uSharedOn > 0.5;
  vec3 bgLab = labOf(texelFetch(tShared, ivec2(0), 0).rgb);
  for (int s = 0; s < 64; s++) { if (s >= m) break; cur[s] = useBg ? d2(ul[s], bgLab) : 1e9; }
  int pick = layer == 1 ? 3 : int(uPick);
  int want = min(k, pick - 1);
  vec3 chosen = ur[0];
  for (int it = 0; it < 4; it++) {
    if (it > want) break;
    float be = 1e20; int bi = 0;
    for (int c = 0; c < 64; c++) {
      if (c >= m) break;
      float e = 0.0;
      for (int s = 0; s < 64; s++) { if (s >= m) break; e += uw[s] * min(cur[s], d2(ul[s], ul[c])); }
      if (e < be) { be = e; bi = c; }
    }
    chosen = ur[bi];
    for (int s = 0; s < 64; s++) { if (s >= m) break; cur[s] = min(cur[s], d2(ul[s], ul[bi])); }
  }
  oColor = vec4(chosen, 1.0);
}`;

const MAIN = LIB + /* glsl */ `
uniform sampler2D tCells;
uniform sampler2D tShared;
uniform float uSpread;
/** GBC 的反射式 LCD：颜色发灰发淡、偏青（常见模拟器的 GBC 色彩校正矩阵） */
vec3 gbcLcd(vec3 c) {
  vec3 o = vec3(c.r * 26.0 + c.g * 4.0 + c.b * 2.0, c.g * 24.0 + c.b * 8.0, c.r * 6.0 + c.g * 4.0 + c.b * 22.0) / 32.0;
  return pow(o, vec3(0.9));
}
void main() {
  vec2 top = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 hp = floor(top / uHw);
  vec2 uv = hwUv(hp);
  vec3 c = texture(tInput, uv).rgb;
  float bay = bayer4(hp) + 1.0 / 32.0 - 0.5;
  if (uMode == 2) {
    // SNES：15 位色；明度分 10 档、彩度 / 色相也按档（手工色阶），档与档之间轻微 2×2 抖色
    float b2 = bayer2(hp) + 0.125 - 0.5;
    vec3 lab = labOf(c);
    float L = floor(lab.x * 10.0 + 0.5 + b2 * uDither * 1.2) / 10.0;
    float ch = length(lab.yz);
    float hue = atan(lab.z, lab.y);
    ch = floor(ch * 26.0 + 0.5 + b2 * uDither * 0.8) / 26.0;
    hue = floor(hue / 0.2618 + 0.5) * 0.2618;
    vec3 o = linToSrgb(fromOklab(vec3(L, cos(hue) * ch, sin(hue) * ch)));
    oColor = vec4(snap15(o), 1.0);
    return;
  }
  if (uMode == 7) {
    // ZX：格内只有墨色 / 纸色；按在两色连线上的位置 + 有序抖色二值化
    vec2 cz = floor(hp / uCell);
    vec3 ink = texelFetch(tCells, ivec2(int(cz.x) * 4, int(cz.y) * 2), 0).rgb;
    vec3 paper = texelFetch(tCells, ivec2(int(cz.x) * 4 + 1, int(cz.y) * 2), 0).rgb;
    float t;
    segD2(labIn(c), labOf(ink), labOf(paper), t);
    oColor = vec4(t > 0.5 + bay * min(uDither * 1.6, 1.0) ? paper : ink, 1.0);
    return;
  }
  vec3 cd = c + bay * uSpread * uDither * 2.0;
  if (uCell.x < 0.5) {
    // 不分格（CGA / EGA）：整屏一套色板
    oColor = vec4(nearestMaster(cd), 1.0);
    return;
  }
  vec2 cell = floor(hp / uCell);
  bool ch = uSpriteOn > 0.5 && isCharacterRole(roleAt(tNormal, uv));
  int layer = ch ? 1 : 0;
  int pick = ch ? 3 : int(uPick);
  vec3 L = labIn(cd);
  vec3 o = vec3(0.0);
  float best = 1e9;
  if (!ch && uSharedOn > 0.5) { o = texelFetch(tShared, ivec2(0), 0).rgb; best = d2(L, labOf(o)); }
  for (int k = 0; k < 4; k++) {
    if (k >= pick) break;
    vec3 q = texelFetch(tCells, ivec2(int(cell.x) * 4 + k, int(cell.y) * 2 + layer), 0).rgb;
    float e = d2(L, labOf(q));
    if (e < best) { best = e; o = q; }
  }
  oColor = vec4(uMode == 6 ? gbcLcd(o) : o, 1.0);
}`;

let cellsRT: THREE.WebGLRenderTarget | null = null;
let sharedRT: THREE.WebGLRenderTarget | null = null;
const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false } as const;
let palKey = '';

function setPalette(spec: Spec) {
  const key = String(spec.mode);
  if (key === palKey) return;
  palKey = key;
  const pal = spec.pal ?? [];
  PAL.uPalN.value = pal.length;
  pal.forEach((h, i) => {
    const lab = linearToOklab(hexToLinear(h));
    PAL.uPalLab.value[i].set(lab[0], lab[1], lab[2]);
    PAL.uPalRgb.value[i].set(...hexToRgb(h));
  });
}

registerFx({
  id: 'retroHardware',
  stage: 'afterOverlay',
  order: 0,
  frag: MAIN,
  uniforms: { ...PAL, tNormal: tex(), tCells: tex(), tShared: tex(), uSpread: { value: 0 } },
  extra: {
    shared: { frag: SHARED, uniforms: { ...PAL, tNormal: tex() } },
    cells: { frag: CELLS, uniforms: { ...PAL, tNormal: tex(), tShared: tex() } },
  },
  active: (v) => str(v, 'color.hardware') !== 'none' && !!SPECS[str(v, 'color.hardware')],
  dispose() { cellsRT?.dispose(); sharedRT?.dispose(); cellsRT = sharedRT = null; },
  render(c, out, p) {
    const spec = SPECS[str(c.values, 'color.hardware')];
    setPalette(spec);
    const r = c.renderer;
    // 一个硬件像素占几个内部像素：像素化已经够粗时就是 1
    const hy = Math.max(1, Math.round(c.res.y / spec.lines));
    PAL.uMode.value = spec.mode;
    PAL.uHw.value.set(hy * spec.fat, hy);
    PAL.uCell.value.set(spec.cell[0], spec.cell[1]);
    PAL.uPick.value = spec.pick;
    PAL.uSharedOn.value = spec.shared ? 1 : 0;
    PAL.uSpriteOn.value = spec.sprite ? 1 : 0;
    PAL.uSat.value = spec.sat;
    PAL.uAbW.value = spec.abW;
    PAL.uDither.value = num(c.values, 'color.hardwareDither');
    const hwW = Math.ceil(c.res.x / (hy * spec.fat));
    const hwH = Math.ceil(c.res.y / hy);
    if (spec.shared) {
      sharedRT ??= new THREE.WebGLRenderTarget(1, 1, rtOpts);
      const sp = c.passOf('retroHardware:shared');
      sp.uniforms.tInput.value = c.input;
      sp.uniforms.tNormal.value = c.normal;
      sp.render(r, sharedRT);
    }
    if (spec.cell[0] > 0) {
      const cw = Math.ceil(hwW / spec.cell[0]) * 4, chh = Math.ceil(hwH / spec.cell[1]) * 2;
      if (!cellsRT) cellsRT = new THREE.WebGLRenderTarget(cw, chh, rtOpts);
      else if (cellsRT.width !== cw || cellsRT.height !== chh) cellsRT.setSize(cw, chh);
      const cp = c.passOf('retroHardware:cells');
      cp.uniforms.tInput.value = c.input;
      cp.uniforms.tNormal.value = c.normal;
      cp.uniforms.tShared.value = sharedRT?.texture ?? null;
      cp.render(r, cellsRT);
    }
    const u = p.uniforms;
    u.tNormal.value = c.normal;
    u.tCells.value = cellsRT?.texture ?? null;
    u.tShared.value = sharedRT?.texture ?? null;
    u.uSpread.value = spec.spread;
    p.render(r, out);
  },
});
