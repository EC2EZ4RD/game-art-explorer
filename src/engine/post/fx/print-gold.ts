import * as THREE from 'three';
import { num } from '../../../dims/registry';
import { PRINT_LIB } from './print-lib';
import { registerFx } from './registry';

/*
 * P1b 金云与金箔（叠在任何画面上，stage = 'afterQuantize'：线与限色之后、移轴与纸纹之前）：
 *   surface.goldLeaf   天空换成一片片贴上去的金箔（琳派屏风的金底）
 *   surface.goldCloud  一条条横向的金色云带（すやり霞），从中间穿过画面，遮住远处、近处的东西从云前面露出来（洛中洛外图）
 * 云带按深度遮挡：每条云带取它下沿那一行画面的深度当自己的深度，比它近的物体画在云前面。
 * 迁移到 Godot：一个全屏着色器（hint_depth_texture 判天空与遮挡）；金箔纹理同样程序生成。
 */

const GOLD = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform float uLeaf;
uniform float uCloud;
/* 胶囊（两头圆的长条）：中心 c、半长 hl、半高 hr（画面高为 1 的坐标），返回有符号距离 */
float sdCapsule(vec2 p, vec2 c, float hl, float hr) {
  vec2 d = p - c;
  d.x = max(abs(d.x) - hl, 0.0);
  return length(d) - hr;
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 c = texture(tInput, vUv).rgb;
  float raw = texture(tDepth, vUv).r;
  bool sky = raw > 0.99999;
  // 箔片边长：画面高的 3.5%（收尾 X：原来 8.5%、每片亮度在 0.74~0.96 之间跳、缝压暗 32%，读成一面方砖墙）；片与片只差一点、缝很浅
  float S = 0.035 * uRes.y;
  // 1 金箔天空
  if (sky && uLeaf > 0.0) c = mix(c, goldLeafK(p, S, 1.0, vec3(0.86, 0.67, 0.29), vec3(0.92, 0.75, 0.35), 0.12, 0.07), uLeaf);
  // 2 金云：最多 4 条带，每条由 3~4 个错开的胶囊拼成阶梯状的长云
  if (uCloud > 0.0) {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 P = vUv * asp;
    float W = asp.x;
    float myD = linDepth(raw);
    float best = 1e9;      // 最近的云边距离（画描边）
    float cover = 0.0;
    float bY = 0.5, bH = 0.06; // 最近那条云带的中线与半高（云内上亮下暗的渐变用）
    // 云边用 fbm 抖一下（手描的霞边，不是规整的胶囊）
    float jit = (fbm(P * 16.0 + 7.0) - 0.5) * 0.016;
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      if (fk >= 1.0 + uCloud * 3.2) break;
      float yk = 0.14 + 0.235 * fk + (hash12(vec2(fk, 1.3)) - 0.5) * 0.06;
      float hk = 0.052 + 0.022 * hash12(vec2(fk, 2.9));
      // 云带的深度：它下沿那一行画面里（非天空处）的平均深度，比这个近的物体从云前面露出来
      float acc = 0.0, n = 0.0;
      for (int s = 0; s < 6; s++) {
        vec2 su = vec2((float(s) + 0.5) / 6.0, yk - hk * 1.4);
        float rd = texture(tDepth, su).r;
        if (rd < 0.99999) { acc += linDepth(rd); n += 1.0; }
      }
      float bandD = n > 0.0 ? acc / n * 0.985 : 0.0;
      bool front = sky || n < 0.5 || myD > bandD;
      float drift = uTime * 0.004 * (fk + 1.0);
      // 一条云带 = 2~3 段：每段是一根主长条 + 上下错开的短条（阶梯状的层叠）+ 两头的圆卷
      for (int j = 0; j < 3; j++) {
        float fj = float(j);
        float h1 = hash12(vec2(fk, fj + 4.0)), h2 = hash12(vec2(fk, fj + 9.0)), h3 = hash12(vec2(fk, fj + 17.0));
        if (h3 > 0.45 + 0.55 * uCloud) continue;
        float cx = mod((fj + 0.5) / 3.0 * (W + 0.8) - 0.4 + (h1 - 0.5) * 0.4 + drift, W + 0.8) - 0.4;
        float hl = (0.16 + 0.16 * h2) * W * (0.65 + 0.35 * uCloud);
        float cy = yk + (h1 - 0.5) * hk * 1.4;
        float hr = hk * (0.85 + 0.3 * h2);
        float sd = sdCapsule(P, vec2(cx, cy), hl, hr);
        // 上层短条：错向一边，形成台阶
        float side = h3 < 0.5 ? 1.0 : -1.0;
        sd = min(sd, sdCapsule(P, vec2(cx + side * hl * 0.35, cy + hr * 1.15), hl * 0.55, hr * 0.8));
        // 下层更短的一条，错向另一边
        if (h2 > 0.35) sd = min(sd, sdCapsule(P, vec2(cx - side * hl * 0.45, cy - hr * 1.05), hl * 0.4, hr * 0.7));
        // 两头的圆卷（霞头）
        sd = min(sd, length(P - vec2(cx + side * (hl + hr * 0.2), cy + hr * 0.5)) - hr * 0.95);
        sd = min(sd, length(P - vec2(cx - side * (hl - hr * 0.1), cy - hr * 0.2)) - hr * 0.8);
        sd += jit;
        if (front) { if (sd < best) { best = sd; bY = yk; bH = hk; } if (sd < 0.0) cover = 1.0; }
      }
    }
    if (best < 1e8) {
      // 金云里面不贴箔片网格（收尾 X：原来是方砖拼的胶囊）：金泥的竖向渐变（上亮下暗）+ 细的金泥浓淡 + 稀疏的金砂点（砂子），云边附近砂子密一些、还撒出边外一点
      float gt = clamp((P.y - (bY - bH * 1.8)) / (bH * 3.6), 0.0, 1.0);
      vec3 gold = mix(vec3(0.7, 0.5, 0.19), vec3(0.96, 0.81, 0.43), smoothstep(0.0, 1.0, gt));
      gold *= 0.95 + 0.08 * vnoise(p / (6.0 * U)) + 0.04 * sin((p.x + p.y * 0.6) / uRes.y * 2.6 - uTime * 0.35);
      float hd = hash12(floor(p / (2.2 * U)));
      float edgeK = 1.0 - smoothstep(0.0, bH * 0.9, abs(best));
      float dust = step(1.0 - (0.018 + 0.07 * edgeK), hd);
      gold = mix(gold, vec3(1.0, 0.93, 0.62), dust * 0.75);
      float spill = dust * step(0.0, best) * (1.0 - smoothstep(0.0, bH * 0.6, best));
      // 云内上亮下暗一点，边上描一道深褐色细线
      float ow = 1.6 * U / uRes.y;
      float line = 1.0 - smoothstep(ow * 0.5, ow * 0.5 + 1.0 / uRes.y, abs(best));
      // 胡粉堆起的边（盛上げ）：描边内侧一道浅色的凸边
      float rim = smoothstep(-ow * 4.0, -ow * 1.5, best) * (1.0 - smoothstep(-ow * 1.5, -ow * 0.5, best));
      gold = mix(gold, vec3(1.0, 0.93, 0.72), rim * 0.55);
      vec3 cl = mix(c, gold, cover);
      cl = mix(cl, vec3(0.98, 0.85, 0.5), spill * 0.6);
      cl = mix(cl, vec3(0.42, 0.27, 0.1), line);
      c = cl;
    }
  }
  oColor = vec4(c, 1.0);
}`;

registerFx({
  id: 'p1b-gold', stage: 'afterQuantize', order: 10, frag: GOLD,
  uniforms: {
    tNormal: { value: null }, tDepth: { value: null }, uStrength: { value: 1 }, uScale: { value: 1 },
    uPaper: { value: new THREE.Color(1, 1, 1) }, uInk: { value: new THREE.Color(0, 0, 0) },
    uLeaf: { value: 0 }, uCloud: { value: 0 },
  },
  active: (v) => num(v, 'surface.goldLeaf') > 0 || num(v, 'surface.goldCloud') > 0,
  setup(p, c) {
    p.uniforms.tNormal.value = c.normal;
    p.uniforms.tDepth.value = c.depth;
    p.uniforms.uLeaf.value = num(c.values, 'surface.goldLeaf');
    p.uniforms.uCloud.value = num(c.values, 'surface.goldCloud');
  },
});

if (import.meta.hot) import.meta.hot.accept();
