import * as THREE from 'three';
import { num, str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 技术补全 P1：两个"图层"类的后处理扩展，都在物体空间笔触之后、内部线之前（afterStrokes）。
 *
 * 媒介范围（surface.mediumScope = 'environment'）：按法线缓冲里的颜色角色把角色像素换回调色后的原画，
 *   角色保持干净的三维（赛璐珞）着色，环境才是水彩 / 水墨 / 油画……内部线、纸纹、颗粒等后面的步骤仍作用于整个画面。
 *
 * 错位填色（surface.misregister）：颜色版按"整体偏移 + 低频起伏"错开取样，墨线（后面的内部线）仍在原位：
 *   一侧颜色涂出线外；另一侧取样落到后面的物体上时露出纸色（漏白缝）。像套色错版、孩子涂色涂出了线。
 */

const tex = () => ({ value: null as THREE.Texture | null });

const SCOPE = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tGraded;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  if (isCharacterRole(roleAt(tNormal, vUv))) c = texture(tGraded, vUv).rgb;
  oColor = vec4(c, 1.0);
}`;

registerFx({
  id: 'p1-mediumScope',
  stage: 'afterStrokes',
  order: -20,
  frag: SCOPE,
  uniforms: { tNormal: tex(), tGraded: tex() },
  active: (v) => str(v, 'surface.medium') !== 'none' && str(v, 'surface.mediumScope') === 'environment',
  setup(p, c) {
    p.uniforms.tNormal.value = c.normal;
    p.uniforms.tGraded.value = c.graded;
  },
});

const MISREG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform float uAmt;
uniform vec3 uPaper;
void main() {
  vec2 p = vUv * uRes;
  // 偏移量按约 720 行的画面换算：分辨率变了错位的观感不变
  float k = uRes.y / 720.0;
  vec2 wv = vec2(vnoise(p / (170.0 * k)), vnoise(p / (170.0 * k) + 13.7)) - 0.5;
  vec2 off = (vec2(3.2, -2.4) + wv * 7.0) * uAmt * k;
  vec2 suv = vUv - off / uRes;
  vec3 c = texture(tInput, suv).rgb;
  float r0 = roleAt(tNormal, vUv), r1 = roleAt(tNormal, suv);
  float d0 = linDepth(texture(tDepth, vUv).r), d1 = linDepth(texture(tDepth, suv).r);
  bool other = abs(r0 - r1) > 0.5 || abs(d0 - d1) / max(min(d0, d1), 1e-3) > 0.04;
  // 本像素在前、取样落到后面的东西上：颜色版没盖到这里，露出纸色（带一点颗粒，边不那么机械）
  if (other && d0 < d1) c = mix(c, uPaper, 0.88 - 0.22 * smoothstep(0.25, 0.75, vnoise(p / 3.0)));
  oColor = vec4(c, 1.0);
}`;

registerFx({
  id: 'p1-misregister',
  stage: 'afterStrokes',
  order: -10,
  frag: MISREG,
  uniforms: { tNormal: tex(), tDepth: tex(), uAmt: { value: 0 }, uPaper: { value: new THREE.Color() } },
  active: (v) => num(v, 'surface.misregister') > 0,
  setup(p, c) {
    const u = p.uniforms;
    u.tNormal.value = c.normal;
    u.tDepth.value = c.depth;
    u.uAmt.value = num(c.values, 'surface.misregister');
    u.uPaper.value.copy(c.paper);
  },
});
