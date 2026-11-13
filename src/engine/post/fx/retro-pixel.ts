import * as THREE from 'three';
import { hexToLinear, linearToOklab } from '../../../core/color';
import { bool, num, str } from '../../../dims/registry';
import { U } from '../../materials/uniforms';
import { registerFx } from './registry';

/*
 * 像素清理（camera.pixelClean，P2）：低分辨率画面像手点的像素画。只在像素化（camera.pixelSize > 1）时跑，限色之后、移轴之前。
 *
 * 两个 pass（都在内部低分辨率上，逐像素 texelFetch）：
 *   a     ① 孤立点 / 毛刺：一个像素和 8 邻都不同色（孤点），或只有 1 个同色正邻、另外 3 个正邻同为一色（毛刺），
 *           就换成周围的颜色；强调色 / 角色身上和周围不同角色编号的单点（眼睛、扣子、小花）保留；
 *         ② 没开限色时先做 3×3 中值（OKLab 里离其余 8 个最近的那个），把渐变噪点并成平涂色块；
 *         ③ 轮廓：正邻比自己远得多（深度跳变大于本侧坡度的 2.5 倍，或邻居是天空）的像素是剪影边，
 *           记下它是受光面（法线朝光）还是背光面。
 *   main  ④ 像素完美：轮廓线在 L 形拐角上多出来的那一格去掉（两臂都长的直角保留）；
 *         ⑤ 轮廓像素换成"自己颜色的深一档"：背光面更深、受光面浅一点（选择性描边 sel-out），色相略偏冷；
 *           开了"严格落在色板里"时从色板里挑比自己暗一档、最接近的颜色，仍然不出色板。
 * 迁移到 Godot：SubViewport 低分辨率渲染后接两个 canvas_item 着色器（texelFetch 邻域），读同一个深度 / 法线。
 */

const tex = () => ({ value: null as THREE.Texture | null });
const SW = {
  uSwLab: { value: Array.from({ length: 64 }, () => new THREE.Vector3()) },
  uSwN: { value: 0 },
};

const A = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec3 uLightV;
uniform float uMedoid;
ivec2 cl(ivec2 q) { return clamp(q, ivec2(0), ivec2(uRes) - 1); }
vec3 C(ivec2 q) { return texelFetch(tInput, cl(q), 0).rgb; }
vec3 LB(vec3 c) { return toOklab(srgbToLin(max(c, 0.0))); }
float Z(ivec2 q) { float r = texelFetch(tDepth, cl(q), 0).r; return r > 0.99999 ? 1e6 : linDepth(r); }
float R(ivec2 q) { return floor(texelFetch(tNormal, cl(q), 0).a * 64.0); }
bool same(vec3 a, vec3 b) { vec3 d = a - b; return dot(d, d) < 0.0009; }
/** q 方向的邻居是不是"后面的东西"（本像素是前景剪影的边） */
bool behind(ivec2 p, ivec2 dir, float zc) {
  float zn = Z(p + dir);
  if (zn > 1e5) return zc < 1e5;
  float zo = Z(p - dir);
  float slope = zo > 1e5 ? 0.0 : abs(zc - zo);
  float thr = uOrtho > 0.5 ? uViewHalf.y * 0.03 : zc * 0.04;
  return zn - zc > max(thr, slope * 2.5);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 c = C(p);
  vec3 lc = LB(c);
  ivec2 o4[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
  ivec2 o8[4] = ivec2[4](ivec2(1, 1), ivec2(-1, 1), ivec2(1, -1), ivec2(-1, -1));
  vec3 n4[4]; vec3 l4[4];
  int eq4 = 0, eqd = 0;
  for (int i = 0; i < 4; i++) { n4[i] = C(p + o4[i]); l4[i] = LB(n4[i]); if (same(l4[i], lc)) eq4++; }
  for (int i = 0; i < 4; i++) if (same(LB(C(p + o8[i])), lc)) eqd++;
  // ① 孤点 / 毛刺
  vec3 outc = c;
  bool done = false;
  if (eq4 + eqd == 0 || (eq4 == 1 && eqd == 0)) {
    int bi = -1, bc = 0;
    for (int i = 0; i < 4; i++) {
      int k = 0;
      for (int j = 0; j < 4; j++) if (same(l4[i], l4[j])) k++;
      if (k > bc && !same(l4[i], lc)) { bc = k; bi = i; }
    }
    float rc = R(p);
    bool detail = (isAccentRole(rc) || isCharacterRole(rc)) && bi >= 0 && R(p + o4[bi]) != rc;
    if (bi >= 0 && !detail && (eq4 + eqd == 0 ? bc >= 2 : bc >= 3)) { outc = n4[bi]; done = true; }
  }
  // ①b 植被（树冠、草地）按簇画：8 邻里有一种颜色占到 5 个以上就并过去（细碎的 1 像素线、斑点并成色簇）
  float rc0 = R(p);
  if (!done && (rc0 == ROLE_foliage || rc0 == ROLE_foliage2 || rc0 == ROLE_grass)) {
    vec3 n8[8]; vec3 c8[8];
    for (int i = 0; i < 4; i++) { n8[i] = l4[i]; c8[i] = n4[i]; c8[i + 4] = C(p + o8[i]); n8[i + 4] = LB(c8[i + 4]); }
    for (int i = 0; i < 8; i++) {
      if (same(n8[i], lc)) continue;
      int k = 0;
      for (int j = 0; j < 8; j++) if (same(n8[i], n8[j])) k++;
      if (k >= 5) { outc = c8[i]; done = true; break; }
    }
  }
  // ② 没开限色：3×3 中值并色块
  if (!done && uMedoid > 0.5) {
    vec3 ls[9]; vec3 cs[9];
    int k = 0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { cs[k] = C(p + ivec2(i, j)); ls[k] = LB(cs[k]); k++; }
    float be = 1e9;
    for (int a = 0; a < 9; a++) {
      float e = 0.0;
      for (int b = 0; b < 9; b++) e += length(ls[a] - ls[b]);
      if (a == 4) e -= 0.02; // 平手时留自己
      if (e < be) { be = e; outc = cs[a]; }
    }
  }
  // ③ 剪影边
  float zc = Z(p);
  float edge = 0.0;
  if (zc < 1e5) {
    bool e = false;
    for (int i = 0; i < 4; i++) if (behind(p, o4[i], zc)) e = true;
    if (e) {
      vec3 nv = texelFetch(tNormal, p, 0).rgb * 2.0 - 1.0;
      edge = dot(normalize(nv), uLightV) > 0.25 ? 0.5 : 1.0;
    }
  }
  oColor = vec4(outc, edge);
}`;

const MAIN = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tA;
uniform vec3 uSwLab[64];
uniform int uSwN;
uniform float uMode;
uniform vec3 uInk;
ivec2 cl(ivec2 q) { return clamp(q, ivec2(0), ivec2(uRes) - 1); }
bool O(ivec2 q) { return texelFetch(tA, cl(q), 0).a > 0.25; }
/** 8 邻里有几个轮廓像素 */
int nb(ivec2 q) {
  int k = 0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) if ((i != 0 || j != 0) && O(q + ivec2(i, j))) k++;
  return k;
}
vec3 shade(vec3 c, float k) {
  if (uMode > 2.5) return uInk;
  vec3 lab = toOklab(srgbToLin(max(c, 0.0)));
  float lit = uMode > 1.5 ? 0.0 : step(k, 0.75);
  float L = lab.x * mix(0.56, 0.8, lit) - 0.03;
  vec2 ab = lab.yz * 1.12 + vec2(0.006, -0.022) * (1.0 - lit);
  vec3 want = vec3(L, ab);
  if (uSwN > 0) {
    // 严格限色：从色板里挑比自己暗、最接近目标的一格
    float be = 1e9; vec3 bl = want;
    for (int i = 0; i < 64; i++) {
      if (i >= uSwN) break;
      vec3 s = uSwLab[i];
      if (s.x > lab.x - 0.035) continue;
      vec3 d = s - want;
      float e = d.x * d.x * 1.5 + dot(d.yz, d.yz);
      if (e < be) { be = e; bl = s; }
    }
    want = bl;
  }
  return linToSrgb(fromOklab(want));
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(tA, p, 0);
  bool o = a.a > 0.25 && uMode > 0.5;
  if (o) {
    // ④a 孤立的轮廓点和两格的短划去掉（深度阈值边上断断续续的检测结果，留着像脏点）
    int k = nb(p);
    if (k == 0) o = false;
    else if (k == 1) {
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++)
        if ((i != 0 || j != 0) && O(p + ivec2(i, j)) && nb(p + ivec2(i, j)) == 1) o = false;
    }
  }
  if (o) {
    // ④ 像素完美：L 形拐角上多出来的一格（两臂都只有一格长时）去掉
    bool l = O(p + ivec2(-1, 0)), r = O(p + ivec2(1, 0)), u = O(p + ivec2(0, 1)), d = O(p + ivec2(0, -1));
    if (l && u && !r && !d && !O(p + ivec2(-1, 1)) && !(O(p + ivec2(-2, 0)) && O(p + ivec2(0, 2)))) o = false;
    if (l && d && !r && !u && !O(p + ivec2(-1, -1)) && !(O(p + ivec2(-2, 0)) && O(p + ivec2(0, -2)))) o = false;
    if (r && u && !l && !d && !O(p + ivec2(1, 1)) && !(O(p + ivec2(2, 0)) && O(p + ivec2(0, 2)))) o = false;
    if (r && d && !l && !u && !O(p + ivec2(1, -1)) && !(O(p + ivec2(2, 0)) && O(p + ivec2(0, -2)))) o = false;
  }
  oColor = vec4(o ? shade(a.rgb, a.a) : a.rgb, 1.0);
}`;

let swKey = '';
const lightV = new THREE.Vector3();

registerFx({
  id: 'retroPixelClean',
  stage: 'afterQuantize',
  order: -10,
  frag: MAIN,
  uniforms: { ...SW, tA: tex(), uMode: { value: 1 }, uInk: { value: new THREE.Color() } },
  extra: { a: { frag: A, uniforms: { tNormal: tex(), tDepth: tex(), uLightV: { value: new THREE.Vector3(0, 1, 0) }, uMedoid: { value: 0 } } } },
  active: (v) => bool(v, 'camera.pixelClean') && num(v, 'camera.pixelSize') > 1,
  render(c, out, p) {
    const r = c.renderer;
    const v = c.values;
    const quant = str(v, 'color.quantize');
    const a = c.passOf('retroPixelClean:a');
    a.uniforms.tInput.value = c.input;
    a.uniforms.tNormal.value = c.normal;
    a.uniforms.tDepth.value = c.depth;
    a.uniforms.uMedoid.value = quant === 'off' ? 1 : 0;
    lightV.copy(U.uSunDir.value);
    if (c.frame.camera) lightV.transformDirection(c.frame.camera.matrixWorldInverse);
    a.uniforms.uLightV.value.copy(lightV);
    const tmp = c.scratch(0);
    a.render(r, tmp);
    // 严格限色时，描边色也从色板里挑
    const key = quant === 'palette' ? c.palette.id : '';
    if (key !== swKey) {
      swKey = key;
      const sw = key ? c.palette.swatches.slice(0, 64) : [];
      SW.uSwN.value = sw.length;
      sw.forEach((h, i) => { const l = linearToOklab(hexToLinear(h)); SW.uSwLab.value[i].set(l[0], l[1], l[2]); });
    }
    p.uniforms.tA.value = tmp.texture;
    p.uniforms.uMode.value = ['none', 'selective', 'self', 'ink'].indexOf(str(v, 'camera.pixelOutline'));
    p.uniforms.uInk.value.copy(c.ink);
    p.render(r, out);
  },
});
