import * as THREE from 'three';
import { bool, num } from '../../../dims/registry';
import { FLOW_LIB } from '../postGlsl';
import { registerFx } from './registry';

/*
 * 铜版 / 钞票雕刻线（技术补全 P1，surface.medium = 'engraving'）。
 * 1) 线顺着形体走：每一族线是"一组斜切的平行平面与物体表面的交线"——相位 φ = (屏幕坐标·g·cos α + 线性深度·sin α) / 线距。
 *    平面上是笔直的平行线（地面横、墙面顺着透视斜），球、柱、树冠上是一圈圈弯曲的弧线，整个画面连续、没有分块接缝；
 *    正对镜头的面退回水平线（钞票底纹最常见的方向）。
 * 2) 线距稳定：相位的屏幕梯度由法线解析求出（∇深度 ≈ n.xy / n.z），按 2 的整数次幂分档、相邻两档交叉淡化：
 *    斜面上线变密时隔一根淡出一根（雕刻师在转折处也这样减线），不会挤成灰或出摩尔纹。
 * 3) 线宽随明暗：半宽 = 线距 × (0.06 ~ 0.5)，暗处线胀粗直到连成一片，亮处细成发丝、最亮处断开留白。
 *    明暗取原图与轻模糊图的平均：线宽沿线平滑地鼓起、收细，不被细碎纹理带得忽粗忽细。
 * 4) 暗部交叉：色调 > 0.5 起叠第二族（斜向切片），> 0.8 再叠第三族（另一斜向），像铜版画暗部的菱形交叉网。
 * 线的覆盖率按到线中心的距离（以一个像素跨过的周期数做抗锯齿带）求，线边自带抗锯齿。
 * 迁移到 Godot：一个全屏 canvas_item 着色器，读 NORMAL / DEPTH 两张缓冲，同一组公式。
 */
const ENGRAVE = FLOW_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tBlur;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform float uScale;
uniform float uStrength;
uniform float uKeepAccent;
uniform float uFocus;
// 一族线：phase 以线距为单位（线中心在整数处），hw = 半宽占线距的比例，fw = 一个像素跨过多少个周期
float lineFam(float phase, float hw, float fw) {
  float d = abs(fract(phase + 0.5) - 0.5);
  float a = 1.0 - smoothstep(hw - fw * 0.6, hw + fw * 0.6, d);
  return hw <= 0.0 ? 0.0 : mix(a, min(2.0 * hw, 1.0), smoothstep(0.3, 0.6, fw));
}
// 一族切片线：g = 屏幕上的基准方向（相位沿它增加），ang = 切片平面朝镜头倾斜的角度
float sliceInk(vec2 p, float zpx, vec2 dz, vec2 g, float ang, float sp, float hw, float off) {
  float ca = cos(ang), sa = sin(ang);
  float ph = (dot(p, g) * ca + zpx * sa) / sp + off;
  float m = length(g * ca + dz * sa);
  float lm = log2(max(m, 1e-3));
  float k = floor(lm);
  float f = lm - k;
  // 档 k：屏幕线距 sp·2^k/m ∈ (sp/2, sp]；档 k+1：∈ (sp, 2sp]，它的线是档 k 的隔一根；按 f 交叉淡化
  float s0 = exp2(-k), s1 = exp2(-k - 1.0);
  float a = lineFam(ph * s0, hw, m * s0 / sp);
  float b = lineFam(ph * s1, hw, m * s1 / sp);
  return mix(a, b, smoothstep(0.0, 1.0, f));
}
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  vec3 ob = texture(tBlur, vUv).rgb;
  // 色调：墨线面积 ≈ 2 × 半宽；中间调提亮一些（版画里中间调多半是疏朗的细线），亮处留白
  float tone = pow(clamp((1.0 - lum(mix(o, ob, 0.5)) - 0.06) / 0.86, 0.0, 1.0), 1.3);
  float raw = texture(tDepth, vUv).r;
  vec3 n = texture(tNormal, vUv).xyz * 2.0 - 1.0;
  // 天空、背景板没有可靠的法线：当作正对镜头（水平线）
  if (raw > 0.99999 || n.z < 0.02) n = vec3(0.0, 0.0, 1.0);
  vec2 dz = clamp(n.xy / max(n.z, 0.06), vec2(-16.0), vec2(16.0));
  float zpx = flowDepthPx(linDepth(raw), uFocus);
  float sp = 4.2 * uScale;
  float wob = (vnoise(p / 23.0) - 0.5) * 0.12;
  float hw1 = tone < 0.03 ? 0.0 : mix(0.06, 0.5, pow(tone, 0.8));
  float ink = sliceInk(p, zpx, dz, vec2(0.0, 1.0), 0.6, sp, hw1, wob);
  float hw2 = 0.4 * smoothstep(0.5, 1.0, tone);
  ink = max(ink, sliceInk(p, zpx, dz, vec2(0.866, -0.5), 0.5, sp * 1.1, hw2, 0.37));
  float hw3 = 0.34 * smoothstep(0.8, 1.0, tone);
  ink = max(ink, sliceInk(p, zpx, dz, vec2(-0.866, -0.5), 0.5, sp * 1.2, hw3, 0.71));
  vec3 c = mix(uPaper, uInk, ink);
  float role = roleAt(tNormal, vUv);
  if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, o * mix(1.0, 0.55, ink), 0.8);
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

const tex = () => ({ value: null as THREE.Texture | null });

registerFx({
  id: 'engraving',
  stage: 'medium',
  medium: 'engraving',
  frag: ENGRAVE,
  uniforms: {
    tNormal: tex(), tDepth: tex(), tBlur: tex(), uPaper: { value: new THREE.Color() }, uInk: { value: new THREE.Color() },
    uScale: { value: 1 }, uStrength: { value: 1 }, uKeepAccent: { value: 1 }, uFocus: { value: 20 },
  },
  setup(p, c) {
    const u = p.uniforms;
    u.tNormal.value = c.normal;
    u.tDepth.value = c.depth;
    u.tBlur.value = c.blur(c.input, 0.9);
    u.uPaper.value.copy(c.paper);
    u.uInk.value.copy(c.ink);
    u.uScale.value = num(c.values, 'surface.scale');
    u.uStrength.value = num(c.values, 'surface.strength');
    u.uKeepAccent.value = bool(c.values, 'surface.keepAccent') ? 1 : 0;
    u.uFocus.value = c.frame.focusDist;
  },
});
