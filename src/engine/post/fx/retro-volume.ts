import * as THREE from 'three';
import { num } from '../../../dims/registry';
import { registerEngineExt } from '../../engineExt';
import { MAX_POINT_LIGHTS, U } from '../../materials/uniforms';
import { registerFx } from './registry';

/*
 * 体积雾 / 烟尘（atmosphere.volumetric，P2）：真正沿视线步进的高度雾。线性阶段（HDR，辉光之前），湿地面反射之后。
 *
 *   密度    高度雾：地面以上按指数变稀（"雾层厚度"），乘上随风漂移的 3D 噪声（"烟尘起伏"：0 = 均匀的雾，1 = 一团团的烟）
 *   受光    太阳：每一步查一次阴影贴图——被树冠、屋檐挡住的地方不亮，缝隙里漏下的就是一道道光柱；
 *           前向散射（Henyey-Greenstein g = 0.6）：逆光看光柱最亮；
 *           天空环境光；夜里的点光源（灯笼、路灯）各自照亮周围的雾，形成暖色光晕
 *   做法    半分辨率步进 32 步（每像素起点错开，去掉分层），输出 内散射 rgb + 透过率 a；
 *           合成时按深度相近加权的 4×4 上采样，画面 = 原图 × 透过率 + 内散射
 * 场景尺度来自引擎扩展 onSceneBuilt 的 desc.bounds（雾层厚度、密度都按场景半径换算，大小场景手感一致）。
 * 迁移到 Godot：Environment.volumetric_fog_enabled（自带阴影光柱与点光散射）+ FogVolume / 密度噪声着色器。
 */

const scene = { center: new THREE.Vector3(0, 1.65, 0), radius: 30 };
registerEngineExt({
  id: 'retroVolumeBounds',
  onSceneBuilt(c) {
    const b = c.desc?.bounds;
    if (b) { scene.center.set(b.center[0], b.center[1], b.center[2]); scene.radius = Math.max(1, b.radius); }
  },
});

const tex = () => ({ value: null as THREE.Texture | null });

const MARCH = /* glsl */ `
// 本 pass 不读输入画面；照约定仍声明 tInput（FX_HEAD 不声明它）
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform mat4 uInvViewProj;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmb;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
uniform vec3 uPointPos[${MAX_POINT_LIGHTS}];
uniform vec3 uPointColor[${MAX_POINT_LIGHTS}];
uniform float uPointRange[${MAX_POINT_LIGHTS}];
uniform int uPointCount;
uniform float uDensity;
uniform float uBase;
uniform float uHeight;
uniform float uNoise;
uniform float uScale;
uniform float uMaxDist;
uniform vec3 uWind;
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 worldOf(vec2 uv, float d) {
  vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return w.xyz / w.w;
}
float densityAt(vec3 p) {
  float h = p.y - uBase;
  float hf = exp(-max(h, 0.0) / uHeight);
  vec3 q = p * uScale + uWind;
  float nz = n3(q) * 0.62 + n3(q * 2.37 + 5.1) * 0.38;
  float shape = mix(1.0, smoothstep(0.32, 0.78, nz) * 1.9, uNoise);
  return uDensity * hf * shape;
}
float sunVis(vec3 p) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(p, 1.0);
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if (c.x <= 0.0 || c.x >= 1.0 || c.y <= 0.0 || c.y >= 1.0 || c.z >= 1.0) return 1.0;
  return step(c.z - 0.002, texture(uShadowMap, c.xy).r);
}
void main() {
  float raw = texture(tDepth, vUv).r;
  vec3 ro = worldOf(vUv, 0.0);
  vec3 pe = worldOf(vUv, min(raw, 0.99999));
  vec3 rd = normalize(pe - ro);
  float L = raw > 0.99999 ? uMaxDist : min(length(pe - ro), uMaxDist);
  // 雾层上沿以上没有雾：把射线裁到雾层里
  float top = uBase + uHeight * 5.0;
  float t0 = 0.0, t1 = L;
  if (abs(rd.y) > 1e-4) {
    float tt = (top - ro.y) / rd.y;
    if (ro.y > top) { if (rd.y >= 0.0) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; } t0 = max(t0, tt); }
    else if (rd.y > 0.0) t1 = min(t1, tt);
  } else if (ro.y > top) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  if (t1 <= t0) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  const int N = 32;
  float dt = (t1 - t0) / float(N);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float cs = dot(rd, uSunDir);
  float g = 0.6;
  float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cs, 1.5);
  float phase = mix(1.0, hg, 0.75);
  vec3 sunL = uSunColor * phase * (uSunDir.y > -0.05 ? 1.0 : 0.0);
  vec3 S = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (t0 + (float(i) + j) * dt);
    float d = densityAt(p);
    if (d < 1e-4) continue;
    vec3 Ls = sunL * sunVis(p) + uSkyAmb * 0.5;
    for (int k = 0; k < ${MAX_POINT_LIGHTS}; k++) {
      if (k >= uPointCount) break;
      float dl = length(p - uPointPos[k]);
      float a = clamp(1.0 - dl / (uPointRange[k] * 1.15), 0.0, 1.0);
      Ls += uPointColor[k] * a * a * 2.2;
    }
    float ext = d * dt;
    float tr = exp(-ext);
    S += T * Ls * (1.0 - tr);
    T *= tr;
    if (T < 0.01) break;
  }
  oColor = vec4(S, T);
}`;

const MAIN = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform sampler2D tVol;
uniform vec2 uVolRes;
void main() {
  vec3 base = texture(tInput, vUv).rgb;
  float zc = linDepth(texture(tDepth, vUv).r);
  vec2 hp = vUv * uVolRes - 0.5;
  vec2 b = floor(hp);
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
    vec2 q = b + vec2(i, j);
    vec2 quv = (q + 0.5) / uVolRes;
    float zq = linDepth(texture(tDepth, quv).r);
    vec2 dd = q - hp;
    float w = exp(-dot(dd, dd) * 0.7) * exp(-abs(zq - zc) / max(zc * 0.04, 0.05));
    acc += texture(tVol, quv) * w;
    ws += w;
  }
  vec4 v = ws > 1e-5 ? acc / ws : texture(tVol, vUv);
  oColor = vec4(base * v.a + v.rgb, 1.0);
}`;

let volRT: THREE.WebGLRenderTarget | null = null;

registerFx({
  id: 'retroVolume',
  stage: 'linear',
  order: 10,
  frag: MAIN,
  uniforms: { tDepth: tex(), tVol: tex(), uVolRes: { value: new THREE.Vector2(1, 1) } },
  extra: {
    march: {
      frag: MARCH,
      uniforms: {
        tDepth: tex(),
        uInvViewProj: { value: new THREE.Matrix4() },
        uSunDir: U.uSunDir, uSunColor: U.uSunColor, uSkyAmb: U.uSkyAmb,
        uShadowMap: U.uShadowMap, uShadowMatrix: U.uShadowMatrix, uShadowOn: { value: 0 },
        uPointPos: U.uPointPos, uPointColor: U.uPointColor, uPointRange: U.uPointRange, uPointCount: U.uPointCount,
        uDensity: { value: 0 }, uBase: { value: 0 }, uHeight: { value: 4 }, uNoise: { value: 0.6 }, uScale: { value: 0.1 },
        uMaxDist: { value: 100 }, uWind: { value: new THREE.Vector3() },
      },
    },
  },
  active: (v) => num(v, 'atmosphere.volumetric') > 0,
  dispose() { volRT?.dispose(); volRT = null; },
  render(c, out, p) {
    const r = c.renderer;
    const v = c.values;
    const w = Math.max(2, c.res.x >> 1), h = Math.max(2, c.res.y >> 1);
    if (!volRT) volRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    else if (volRT.width !== w || volRT.height !== h) volRT.setSize(w, h);
    const m = c.passOf('retroVolume:march');
    const u = m.uniforms;
    const R = scene.radius;
    u.tDepth.value = c.depth;
    u.uInvViewProj.value.copy(c.frame.invViewProj);
    u.uShadowOn.value = U.uShadowMode.value > 0 && U.uShadowMode.value < 4 ? 1 : 0;
    // 密度按场景半径换算：浓度 1 时贴地看过半个场景约衰减到 1/e²
    u.uDensity.value = (num(v, 'atmosphere.volumetric') * 4) / R;
    u.uBase.value = scene.center.y - R * 0.055;
    u.uHeight.value = Math.max(0.2, num(v, 'atmosphere.volHeight') * R * 0.25);
    u.uNoise.value = num(v, 'atmosphere.volNoise');
    u.uScale.value = 7 / R;
    u.uMaxDist.value = R * 3;
    const wind = 0.15 + num(v, 'atmosphere.wind');
    u.uWind.value.set(c.frame.time * 0.11 * wind, -c.frame.time * 0.03, c.frame.time * 0.05 * wind);
    m.uniforms.tInput.value = c.input;
    m.render(r, volRT);
    p.uniforms.tDepth.value = c.depth;
    p.uniforms.tVol.value = volRT.texture;
    p.uniforms.uVolRes.value.set(w, h);
    p.render(r, out);
  },
});
