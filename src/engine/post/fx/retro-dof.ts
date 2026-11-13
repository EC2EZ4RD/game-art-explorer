import { isImageScene } from '../../../content/sceneCatalog';
import { num, str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 按深度移轴（camera.tiltMode = 'depth'，P2）：微缩摄影真正的浅景深。
 * Pipeline 在 tiltMode = depth 时不做屏幕带状模糊，由这里接管（限色之后，和原来的移轴同一位置）。
 *
 * 单 pass 散射式采集（scatter-as-gather，思路同 Dennis Gustafsson 的单 pass 散景）：
 *   - 每个像素按线性深度算带符号弥散圆：透视 ∝ (深度 − 对焦)/深度（薄透镜），正交按深度差 / 画面高度；
 *   - 32 点黄金角螺旋采样到最大半径，一个样本只有当它自己的弥散圆能盖到中心时才算进来；
 *   - 比中心远的样本，弥散被夹到中心弥散的两倍以内：清晰的前景不会被身后的虚化"糊进去"，
 *     清晰前景的颜色也不会渗进虚化的背景（屏幕带状模糊和简单景深都有这圈糊边）；
 *   - 比中心近的样本照常散开：前景的虚化可以盖到清晰物体上（真实镜头就是这样）。
 * 迁移到 Godot：CameraAttributesPractical 的远近景深就是按深度的；要同样的"无渗边"可以用全屏 spatial 着色器照抄本算法。
 */

const FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform float uAmount;
uniform float uFocusY;
uniform float uFocusDist;
uniform float uScale;
float zAt(vec2 uv) { return linDepth(texture(tDepth, uv).r); }
float focusSample(vec2 uv, inout float n) {
  float raw = texture(tDepth, uv).r;
  if (raw > 0.99999) return 0.0;
  n += 1.0;
  return linDepth(raw);
}
/** 带符号弥散（-1~1，负 = 比对焦近） */
float cocOf(float z, float zf) {
  float c = uOrtho > 0.5 ? (z - zf) / max(uViewHalf.y * 0.55, 0.01) : (z - zf) / max(z, 1e-3) * 2.6;
  return clamp(c, -1.0, 1.0);
}
void main() {
  float n = 0.0;
  float f = 0.0;
  for (int i = 0; i < 5; i++) f += focusSample(vec2(0.34 + float(i) * 0.08, uFocusY), n);
  float zf = n > 0.0 ? f / n : uFocusDist;
  float R = uAmount * 18.0 * uScale;
  float zc = zAt(vUv);
  float cc = abs(cocOf(zc, zf)) * R;
  vec3 col = texture(tInput, vUv).rgb;
  if (R < 0.75) { oColor = vec4(col, 1.0); return; }
  vec3 acc = col;
  float tot = 1.0;
  const int N = 32;
  float rot = hash12(gl_FragCoord.xy) * 0.6;
  for (int i = 0; i < N; i++) {
    float a = float(i) * 2.39996 + rot;
    float r = sqrt((float(i) + 0.5) / float(N)) * R;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
    float zs = zAt(uv);
    float cs = abs(cocOf(zs, zf)) * R;
    if (zs > zc) cs = min(cs, cc * 2.0);
    float m = smoothstep(r - 0.75, r + 0.75, cs);
    vec3 sc = texture(tInput, uv).rgb;
    // 亮点略微加权：散成光斑
    m *= 1.0 + 1.5 * max(lum(sc) - lum(acc / tot), 0.0);
    acc += mix(acc / tot, sc, clamp(m, 0.0, 1.0));
    tot += 1.0;
  }
  oColor = vec4(acc / tot, 1.0);
}`;

registerFx({
  id: 'retroDepthTilt',
  stage: 'afterQuantize',
  order: 10,
  frag: FRAG,
  uniforms: {
    tDepth: { value: null },
    uAmount: { value: 0 },
    uFocusY: { value: 0.5 },
    uFocusDist: { value: 20 },
    uScale: { value: 1 },
  },
  active: (v) => str(v, 'camera.tiltMode') === 'depth' && num(v, 'camera.tiltShift') > 0 && !isImageScene(str(v, 'game.scene')),
  setup(p, c) {
    const u = p.uniforms;
    u.tDepth.value = c.depth;
    u.uAmount.value = num(c.values, 'camera.tiltShift');
    u.uFocusY.value = 1 - num(c.values, 'camera.tiltFocus');
    u.uFocusDist.value = c.frame.focusDist;
    // 弥散半径按"约 1080 行"换算：像素化后内部分辨率低，半径跟着变小
    u.uScale.value = c.res.y / 1080;
  },
});
