import * as THREE from 'three';
import { bool } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 合成波落日（atmosphere.synthSun，P2）：80 年代复古未来（synthwave / outrun）的条纹大太阳 + 霓虹地平线。
 * 只画在天空像素上（深度 ≈ 1），线性阶段（HDR：太阳本身够亮，后面的辉光会把它晕开；湿地面反射在它之后，积水里能倒映出它）。
 *
 *   天空    深紫—洋红的渐变（把原来的天空换掉八成，星星之类还隐约留着）
 *   太阳    固定在镜头正前方的地平线上（像一张挂在远处的背景画，转镜头它跟着走），黄 → 橙 → 洋红渐变；
 *           下半部分被一条条横向的缺口切开，越往下缺口越宽，缺口慢慢往下流
 *   光晕    太阳周围一圈洋红光晕；地平线上一条亮线 + 向上渐淡的霓虹辉光
 * 和材质轨道的线框地形（geometry.wireFill 等）一起用就是完整的"线框网格地形与条纹落日"。
 * 迁移到 Godot：天空着色器（sky shader）里按 EYEDIR 画同样的太阳与渐变；条纹用 fract(EYEDIR.y …)。
 */

const lin = (h: string) => new THREE.Color(h).convertSRGBToLinear();

const FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform mat4 uInvViewProj;
uniform vec3 uFwd;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHor;
uniform vec3 uSunA;
uniform vec3 uSunB;
uniform vec3 uSunC;
uniform vec3 uGlow;
vec3 worldOf(vec2 uv, float d) { vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return w.xyz / w.w; }
void main() {
  vec3 base = texture(tInput, vUv).rgb;
  if (texture(tDepth, vUv).r < 0.99999) { oColor = vec4(base, 1.0); return; }
  vec3 d = normalize(worldOf(vUv, 1.0) - worldOf(vUv, 0.0));
  float el = asin(clamp(d.y, -1.0, 1.0));
  // 相对镜头正前方的方位角
  vec2 f = normalize(uFwd.xz + vec2(1e-5, 0.0));
  vec2 h = normalize(d.xz + vec2(1e-5, 0.0));
  float az = atan(f.x * h.y - f.y * h.x, dot(f, h));
  // 天空渐变
  float e = clamp(el / 0.9, 0.0, 1.0);
  vec3 sky = mix(uHor, uMid, smoothstep(0.0, 0.25, e));
  sky = mix(sky, uTop, smoothstep(0.2, 1.0, e));
  // 地平线以下（地面外的空处）压成深紫，像延伸出去的暗色大地
  sky = mix(sky, uTop * 0.6, 1.0 - smoothstep(-0.25, 0.0, el));
  vec3 c = mix(base, sky, 0.82);
  // 地平线：亮线 + 向上渐淡的霓虹辉光
  // 地平线以下辉光很快收掉（地面外的空处不该发亮）
  float glowUp = el >= 0.0 ? exp(-el * 9.0) : exp(el * 40.0);
  c += uGlow * (glowUp * 0.9 + exp(-abs(el) * 160.0) * 2.2);
  // 太阳
  float R = 0.24;
  vec2 q = vec2(az, el - 0.075) / R;
  float r = length(q);
  float v = q.y;
  vec3 sun = mix(uSunC, uSunB, smoothstep(-0.9, 0.15, v));
  sun = mix(sun, uSunA, smoothstep(0.15, 0.9, v));
  float k = clamp((0.3 - v) / 1.3, 0.0, 1.0);
  float ph = fract((v + uTime * 0.035) / 0.13);
  float gap = k > 0.0 ? step(ph, k * 0.62) : 0.0;
  // 太阳下沿被地平线切掉（半沉在地平线上）
  float disk = (1.0 - smoothstep(0.985, 1.0, r)) * (1.0 - gap) * smoothstep(-0.003, 0.003, el);
  c = mix(c, sun * 2.6, disk);
  c += uGlow * exp(-max(r - 1.0, 0.0) * 3.5) * 0.55 * (1.0 - disk);
  oColor = vec4(c, 1.0);
}`;

const fwd = new THREE.Vector3();

registerFx({
  id: 'retroSynthSun',
  stage: 'linear',
  order: -20,
  frag: FRAG,
  uniforms: {
    tDepth: { value: null }, uInvViewProj: { value: new THREE.Matrix4() }, uFwd: { value: new THREE.Vector3(0, 0, -1) },
    uTop: { value: lin('#0A0320') }, uMid: { value: lin('#2A0B4E') }, uHor: { value: lin('#8A1C78') },
    uSunA: { value: lin('#FFE65A') }, uSunB: { value: lin('#FF8A3A') }, uSunC: { value: lin('#FF2D84') },
    uGlow: { value: lin('#FF3FA4') },
  },
  active: (v, f) => bool(v, 'atmosphere.synthSun') && !!f.camera,
  setup(p, c) {
    p.uniforms.tDepth.value = c.depth;
    p.uniforms.uInvViewProj.value.copy(c.frame.invViewProj);
    c.frame.camera!.getWorldDirection(fwd);
    // 正俯视时前方几乎垂直：用相机"上"方向的水平分量代替
    if (Math.hypot(fwd.x, fwd.z) < 0.05) fwd.copy(c.frame.camUp);
    p.uniforms.uFwd.value.set(fwd.x, 0, fwd.z);
  },
});
