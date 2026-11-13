import { num, str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 立体显示（surface.stereo，P2）：由一张画面 + 深度合成左右两眼的画面（基于深度的视点合成，DIBR）。最后一步（录像带、压缩之后，输出之前）。
 *
 *   视差    对焦距离（镜头注视点）处为零视差；更远的东西"退进屏幕"、更近的"凸出屏幕"。透视按 1 − 对焦/深度，正交按深度差。
 *           每只眼逆向取样：迭代 4 次找"移过去之后正好落在这里"的源像素（遮挡处会被拉伸，和所有单图转立体一样）
 *   红青    半彩色红青立体：左眼取明度放进红通道，右眼的绿、蓝通道原样保留；戴红青眼镜看有纵深
 *   红黑    Virtual Boy：两只眼并排显示（交叉看 / 头显看），每只 384×224、只有黑与三档红；深度分成几层平面
 *           （VB 游戏的纵深就是一层层平面），天空是纯黑
 * 迁移到 Godot：真立体用 XR / 两台 Camera3D；单图合成用全屏着色器读深度做同样的逆向取样。
 */

const FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform float uMode;
uniform float uSep;
uniform float uFocus;
float zAt(vec2 uv) { float r = texture(tDepth, uv).r; return r > 0.99999 ? 1e5 : linDepth(r); }
/** 视差（像素，+ = 比对焦远） */
float dispAt(vec2 uv) {
  float z = zAt(uv);
  float d = uOrtho > 0.5 ? clamp((z - uFocus) / (uViewHalf.y * 1.5), -1.0, 1.0) : clamp(1.0 - uFocus / z, -1.2, 1.0);
  if (uMode > 1.5) d = floor(d * 3.0 + 0.5) / 3.0; // 红黑：深度按平面分层
  return d * uSep;
}
vec2 eyeUv(vec2 uv, float e) {
  vec2 s = uv;
  for (int i = 0; i < 4; i++) s.x = uv.x - e * 0.5 * dispAt(s) / uRes.x;
  return clamp(s, vec2(0.0), vec2(1.0));
}
void main() {
  if (uMode < 1.5) {
    vec3 l = texture(tInput, eyeUv(vUv, -1.0)).rgb;
    vec3 r = texture(tInput, eyeUv(vUv, 1.0)).rgb;
    oColor = vec4(dot(l, vec3(0.299, 0.587, 0.114)), r.g, r.b, 1.0);
    return;
  }
  // Virtual Boy：左右两块 384×224 的红黑屏，按原画面比例缩进各自的半边
  float e = vUv.x < 0.5 ? -1.0 : 1.0;
  vec2 local = vec2(fract(vUv.x * 2.0), vUv.y);
  float panelAsp = (uRes.x * 0.5) / uRes.y;
  float imgAsp = uRes.x / uRes.y;
  // 画面在半边里按宽度放满、上下居中
  local.y = (local.y - 0.5) * imgAsp / panelAsp + 0.5;
  // 两块屏之间留一点黑缝
  local.x = (local.x - 0.5) * 1.04 + 0.5;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 g = (floor(local * vec2(384.0, 224.0)) + 0.5) / vec2(384.0, 224.0);
  vec2 su = eyeUv(g, e);
  vec3 c = texture(tInput, su).rgb;
  float y = dot(c, vec3(0.3, 0.59, 0.11));
  if (zAt(su) > 1e4) y = 0.0;
  float lv = floor(clamp(pow(y, 0.85), 0.0, 1.0) * 3.0 + 0.5);
  vec3 reds[4] = vec3[4](vec3(0.0), vec3(0.33, 0.0, 0.0), vec3(0.64, 0.0, 0.0), vec3(0.94, 0.02, 0.02));
  oColor = vec4(reds[int(lv)], 1.0);
}`;

registerFx({
  id: 'retroStereo',
  stage: 'final',
  order: 0,
  frag: FRAG,
  uniforms: { tDepth: { value: null }, uMode: { value: 1 }, uSep: { value: 10 }, uFocus: { value: 20 } },
  active: (v) => str(v, 'surface.stereo') !== 'none',
  setup(p, c) {
    const vb = str(c.values, 'surface.stereo') === 'virtualBoy';
    p.uniforms.tDepth.value = c.depth;
    p.uniforms.uMode.value = vb ? 2 : 1;
    // 最大视差：强度 1 时约画面宽的 5%（默认 0.4 约 2%）（红黑模式每只眼只占半宽，视差按整幅算后在半宽里自然减半）
    p.uniforms.uSep.value = num(c.values, 'surface.stereoDepth') * c.res.x * 0.05;
    p.uniforms.uFocus.value = c.frame.focusDist;
  },
});
