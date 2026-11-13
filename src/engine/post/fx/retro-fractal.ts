import * as THREE from 'three';
import { hexToLinear } from '../../../core/color';
import { str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 分形天空（surface.fractal，P2）：全屏光线步进的距离场分形，画在天空像素上，当作一整片"天穹"背景。线性阶段（HDR）。
 *
 *   曼德博球    Mandelbulb（8 次幂）：一颗巨大的分形球悬在镜头前方的天空里，慢慢自转，边缘泛光
 *   门格海绵    无限重复的 Menger 海绵：从中间的方孔里穿行，四面是层层嵌套的方孔，镜头慢慢往前飞
 * 只跟镜头的朝向走、不跟位置走（像天空盒）；半分辨率步进到自己的目标，合成时只替换天空像素。
 * 颜色取色板：发光体 / 强调色 → 分形本体，天顶 / 地平线 → 远处的雾。
 * 迁移到 Godot：sky shader 里按 EYEDIR 步进同样的距离函数（天空着色器可以设成半分辨率 / 四分之一分辨率更新）。
 */

const tex = () => ({ value: null as THREE.Texture | null });
const v3 = () => ({ value: new THREE.Vector3() });

const MARCH = /* glsl */ `
// 本 pass 不读输入画面；照约定仍声明 tInput（FX_HEAD 不声明它）
uniform sampler2D tInput;
uniform mat4 uInvViewProj;
uniform vec3 uFwd;
uniform float uKind;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uFogTop;
uniform vec3 uFogHor;
vec3 worldOf(vec2 uv, float d) { vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return w.xyz / w.w; }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
float trapG;
float deBulb(vec3 p) {
  vec3 z = p; float dr = 1.0; float r = 0.0; trapG = 1e9;
  for (int i = 0; i < 7; i++) {
    r = length(z);
    if (r > 2.0) break;
    float th = acos(clamp(z.y / r, -1.0, 1.0)) * 8.0;
    float ph = atan(z.z, z.x) * 8.0;
    dr = pow(r, 7.0) * 8.0 * dr + 1.0;
    z = pow(r, 8.0) * vec3(sin(th) * cos(ph), cos(th), sin(th) * sin(ph)) + p;
    trapG = min(trapG, dot(z, z));
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float deMenger(vec3 p) {
  p = mod(p + 1.0, 2.0) - 1.0;
  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  trapG = 1e9;
  for (int m = 0; m < 4; m++) {
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y), db = max(r.y, r.z), dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    if (c > d) { d = c; trapG = float(m); }
  }
  return d;
}
mat3 bulbRot;
vec3 bulbC;
float de(vec3 p) {
  if (uKind < 1.5) return deBulb(bulbRot * (p - bulbC));
  return deMenger(p);
}
void main() {
  vec3 rd = normalize(worldOf(vUv, 1.0) - worldOf(vUv, 0.0));
  vec3 ro;
  vec2 f = normalize(uFwd.xz + vec2(1e-5, 0.0));
  if (uKind < 1.5) {
    ro = vec3(0.0);
    bulbC = normalize(vec3(f.x, 0.13, f.y)) * 4.8;
    bulbRot = rotY(uTime * 0.07) * rotX(0.35);
  } else {
    ro = vec3(0.0, 0.0, uTime * 0.12);
  }
  float t = 0.0;
  float hit = 0.0;
  int steps = 0;
  float maxT = uKind < 1.5 ? 8.0 : 9.0;
  for (int i = 0; i < 90; i++) {
    float d = de(ro + rd * t);
    if (d < (uKind < 1.5 ? 0.0028 : 0.0012) * t + 0.0004) { hit = 1.0; break; }
    t += d * 0.92;
    steps = i;
    if (t > maxT) break;
  }
  float e = clamp(rd.y, 0.0, 1.0);
  vec3 fog = mix(uFogHor, uFogTop, smoothstep(0.0, 0.7, e));
  if (hit < 0.5) {
    // 没打中：曼德博球只加边缘辉光（步数越多越贴近表面），原来的天空照旧；门格海绵是远处的雾
    float glow = float(steps) / 90.0;
    oColor = uKind < 1.5 ? vec4(uColA * glow * glow * 1.6, 0.0) : vec4(fog, 1.0);
    return;
  }
  vec3 p = ro + rd * t;
  float tr = trapG;
  // 法线：四面体差分
  vec2 k = vec2(1.0, -1.0) * 0.0025 * max(t, 0.5);
  vec3 n = normalize(k.xyy * de(p + k.xyy) + k.yyx * de(p + k.yyx) + k.yxy * de(p + k.yxy) + k.xxx * de(p + k.xxx));
  float ao = 1.0 - float(steps) / 90.0;
  vec3 L = normalize(vec3(0.4, 0.8, 0.3));
  float dif = max(dot(n, L), 0.0) * 0.8 + 0.2;
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float m = uKind < 1.5 ? clamp(sqrt(tr) * 0.6, 0.0, 1.0) : clamp(tr / 3.0, 0.0, 1.0);
  vec3 col = mix(uColB, uColA, m) * dif * (0.3 + 0.7 * ao * ao) + uColA * rim * 1.2;
  float fogK = uKind < 1.5 ? 0.0 : smoothstep(1.5, maxT, t);
  oColor = vec4(mix(col, fog, fogK), 1.0);
}`;

const MAIN = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform sampler2D tFrac;
void main() {
  vec3 base = texture(tInput, vUv).rgb;
  if (texture(tDepth, vUv).r < 0.99999) { oColor = vec4(base, 1.0); return; }
  // 分形目标：rgb = 预乘颜色，a = 覆盖
  vec4 f = texture(tFrac, vUv);
  oColor = vec4(base * (1.0 - clamp(f.a, 0.0, 1.0)) + f.rgb, 1.0);
}`;

let fracRT: THREE.WebGLRenderTarget | null = null;
const fwd = new THREE.Vector3();
let palKey = '';

registerFx({
  id: 'retroFractal',
  stage: 'linear',
  order: -30,
  frag: MAIN,
  uniforms: { tDepth: tex(), tFrac: tex() },
  extra: {
    march: {
      frag: MARCH,
      uniforms: { uInvViewProj: { value: new THREE.Matrix4() }, uFwd: v3(), uKind: { value: 1 }, uColA: v3(), uColB: v3(), uFogTop: v3(), uFogHor: v3() },
    },
  },
  active: (v, f) => str(v, 'surface.fractal') !== 'none' && !!f.camera,
  dispose() { fracRT?.dispose(); fracRT = null; },
  render(c, out, p) {
    const r = c.renderer;
    const w = Math.max(2, c.res.x >> 1), h = Math.max(2, c.res.y >> 1);
    if (!fracRT) fracRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    else if (fracRT.width !== w || fracRT.height !== h) fracRT.setSize(w, h);
    const m = c.passOf('retroFractal:march');
    const u = m.uniforms;
    u.uInvViewProj.value.copy(c.frame.invViewProj);
    c.frame.camera!.getWorldDirection(fwd);
    if (Math.hypot(fwd.x, fwd.z) < 0.05) fwd.copy(c.frame.camUp);
    u.uFwd.value.set(fwd.x, 0, fwd.z);
    u.uKind.value = str(c.values, 'surface.fractal') === 'menger' ? 2 : 1;
    const key = c.palette.id;
    if (key !== palKey) {
      palKey = key;
      const R = c.palette.roles;
      u.uColA.value.set(...hexToLinear(R.emissive)).multiplyScalar(1.4);
      u.uColB.value.set(...hexToLinear(R.accent));
      u.uFogTop.value.set(...hexToLinear(R.skyTop));
      u.uFogHor.value.set(...hexToLinear(R.skyHorizon));
    }
    m.render(r, fracRT);
    p.uniforms.tDepth.value = c.depth;
    p.uniforms.tFrac.value = fracRT.texture;
    p.render(r, out);
  },
});
