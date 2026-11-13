import { num, str } from '../../../dims/registry';
import { registerFx } from './registry';

/*
 * 老胶片（surface.filmAge，P2）：1930 年代橡皮管动画的放映拷贝。纸纹 / 颗粒 / 暗角之后、镜头畸变与录像带之前（先有胶片，才能翻录到录像带上）。
 *
 *   画面    黑白：全色片的明度 + 偏暖的拷贝色调 + S 形反差（黑位压实、高光奶白）；
 *           双色印片：只有红橙与青绿两条记录（Technicolor 双色法），没有真正的蓝和黄绿
 *   走片    每秒 24 格：每格随机的片门晃动（整幅画面上下左右抖 1~2 像素）+ 慢速漂移
 *   闪烁    每格的曝光起伏 + 灯泡的低频脉动
 *   脏污    每格随机的灰尘黑点（少量白点）、偶尔一根弯弯的毛发；几条竖直划痕（亮 / 暗）慢慢横移、时有时无
 *   暗角    放映机光斑：中心略亮、四周不均匀的椭圆暗角，四角有片门的圆角
 *   颗粒    单色颗粒，中间调最明显
 * 尺寸都按 1080 行换算，像素化后照样成比例。迁移到 Godot：一个 canvas_item 全屏着色器（同样的公式，TIME 取整到 24 格）。
 */

const FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform float uMode;
uniform float uWear;
float h1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
/** 线段 ab 上离 p 最近的距离 */
float segDist(vec2 p, vec2 a, vec2 b) { vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
void main() {
  float s = uRes.y / 1080.0;
  float fr = floor(uTime * 24.0);
  float w = uWear;
  // 片门晃动：每格随机 + 慢漂
  vec2 jit = (hash22(vec2(fr, 3.1)) - 0.5) * vec2(1.6, 3.2) * (0.4 + w) + vec2(sin(uTime * 0.9) * 0.6, sin(uTime * 1.7 + 1.0) * 1.2) * (0.3 + w);
  vec2 uv = vUv + jit * s / uRes;
  vec3 c = texture(tInput, uv).rgb;
  vec3 lin = srgbToLin(c);
  vec3 o;
  if (uMode < 1.5) {
    // 黑白：全色片明度、S 形反差、偏暖的拷贝色调
    float y = dot(clamp(c, 0.0, 1.0), vec3(0.30, 0.59, 0.11));
    y = pow(y, 0.8);
    y = smoothstep(0.06, 0.9, y);
    y = mix(y, y * y * (3.0 - 2.0 * y), 0.5);
    o = vec3(y) * vec3(1.0, 0.97, 0.91) + vec3(0.015, 0.012, 0.008);
  } else {
    // 双色印片：红光记录与绿光记录两条底片；绿记录少的地方印上橙红染料、红记录少的地方印上青绿染料（减色叠印）
    float rr = pow(clamp(lin.r * 0.9 + lin.g * 0.1, 0.0, 1.0), 0.6);
    float gg = pow(clamp(lin.g * 0.7 + lin.b * 0.3, 0.0, 1.0), 0.6);
    // 两种染料等量叠在一起是中性灰：橙红 × 青绿 ≈ (0.3, 0.3, 0.3)
    vec3 tOrange = vec3(1.0, 0.3, 0.3);
    vec3 tTeal = vec3(0.3, 1.0, 0.98);
    vec3 m = pow(tOrange, vec3((1.0 - gg) * 1.35)) * pow(tTeal, vec3((1.0 - rr) * 1.35));
    m = pow(m, vec3(0.8));
    m = mix(m, m * m * (3.0 - 2.0 * m), 0.6);
    o = m * vec3(1.0, 0.97, 0.9);
  }
  // 闪烁
  float fl = 1.0 + (h1(fr) - 0.5) * (0.06 + 0.14 * w) + sin(uTime * 7.3) * 0.012;
  o *= fl;
  vec2 px = gl_FragCoord.xy / s;
  // 颗粒（中间调最明显，每格换一次）
  float g = hash12(floor(gl_FragCoord.xy / max(1.0, 1.4 * s)) + fr * 17.31) - 0.5;
  float midt = 1.0 - abs(lum(o) - 0.5) * 1.4;
  o += g * (0.07 + 0.08 * w) * midt;
  // 灰尘：画面分成 90 像素的格，每格每帧随机决定有没有一粒、在哪、多大
  float dust = 0.0, white = 0.0;
  vec2 cellp = px / 90.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 cid = floor(cellp) + vec2(i, j);
    vec2 r = hash22(cid + fr * 13.7);
    if (r.x > 0.03 + 0.08 * w) continue;
    vec2 ctr = (cid + hash22(cid * 1.7 + fr)) * 90.0;
    float rad = 1.6 + 7.0 * pow(hash12(cid + fr * 3.3), 3.0);
    vec2 d = px - ctr;
    float wob = vnoise(d * 0.6 + cid * 7.0) * 1.6;
    float m = 1.0 - smoothstep(rad - 0.6, rad + 0.6, length(d) + wob - 0.8);
    if (r.y > 0.82) white = max(white, m); else dust = max(dust, m);
  }
  // 毛发：偶尔一根，弯弯的细线，挂几格
  float hf = floor(uTime * 24.0 / 6.0);
  if (h1(hf * 5.1) < 0.25 + 0.5 * w) {
    vec2 hc = (hash22(vec2(hf, 9.0)) * 0.8 + 0.1) * uRes / s;
    float ang = h1(hf) * 6.283;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 nrm = vec2(-dir.y, dir.x);
    float best = 1e9;
    vec2 prev = hc - dir * 60.0;
    for (int k = 1; k <= 8; k++) {
      float t = float(k) / 8.0;
      vec2 q = hc + dir * (t * 120.0 - 60.0) + nrm * sin(t * 5.0 + hf) * 14.0;
      best = min(best, segDist(px, prev, q));
      prev = q;
    }
    dust = max(dust, (1.0 - smoothstep(0.5, 1.3, best)) * 0.85);
  }
  o = mix(o, vec3(0.03, 0.025, 0.02), dust * 0.9);
  o = mix(o, vec3(0.95, 0.93, 0.88), white * 0.8);
  // 划痕：几条竖线慢慢横移，每格随机亮灭
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    if (h1(fk * 3.7 + floor(uTime * 24.0 / 3.0) * 0.37) > 0.35 + 0.55 * w) continue;
    float x = fract(h1(fk + 1.3) + uTime * (0.004 + 0.01 * h1(fk + 7.0)) * (h1(fk) > 0.5 ? 1.0 : -1.0)) * uRes.x / s;
    x += sin(px.y * 0.01 + fk) * 2.0;
    float d = abs(px.x - x);
    float line = 1.0 - smoothstep(0.4, 1.2, d);
    float seg = step(0.25, vnoise(vec2(px.y * 0.004, fk * 9.0 + fr * 0.05)));
    vec3 sc = h1(fk + 4.0) > 0.4 ? vec3(0.92, 0.9, 0.85) : vec3(0.05);
    o = mix(o, sc, line * seg * 0.55);
  }
  // 放映机光斑：中心略亮，椭圆暗角不太均匀，四角是片门的圆角
  vec2 q = vUv - 0.5;
  q.x *= uRes.x / uRes.y;
  float vig = 1.0 - smoothstep(0.25, 0.95, length(q * vec2(0.82, 1.0)) + (vnoise(vUv * 3.0 + fr * 0.03) - 0.5) * 0.08);
  o *= mix(0.62, 1.05, vig);
  vec2 e = abs(vUv - 0.5) * 2.0;
  float gate = length(max(e - vec2(0.965, 0.94), 0.0) / vec2(0.035, 0.06));
  o *= 1.0 - smoothstep(0.7, 1.0, gate);
  oColor = vec4(clamp(o, 0.0, 1.0), 1.0);
}`;

registerFx({
  id: 'retroFilm',
  stage: 'afterOverlay',
  order: 20,
  frag: FRAG,
  uniforms: { uMode: { value: 1 }, uWear: { value: 0.5 } },
  active: (v) => str(v, 'surface.filmAge') !== 'none',
  setup(p, c) {
    p.uniforms.uMode.value = str(c.values, 'surface.filmAge') === 'twoStrip' ? 2 : 1;
    p.uniforms.uWear.value = num(c.values, 'surface.filmWear');
  },
});
