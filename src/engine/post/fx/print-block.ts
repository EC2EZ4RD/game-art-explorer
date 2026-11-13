import * as THREE from 'three';
import { num } from '../../../dims/registry';
import { inkTable, mediumUniforms, PRINT_LIB, setMedium, setRole, unitOf } from './print-lib';
import { registerFx } from './registry';

/*
 * P1b 木版套色：浮世绘（ukiyoe）与木版年画（nianhua）。
 * 一块主版印黑线（不偏移），每种颜色一块色版：画面颜色按「最近的一种油墨」分块，每块色版各自偏一点（套版错位），
 * 色块比线略收（刻版时留的余地）→ 线的一侧露出一丝纸白、另一侧颜色压到线上。色块里有木纹、刷印的颗粒，纸是和纸 / 粗纸。
 * 浮世绘另有天空的「一文字晕染」（顶上一条深普鲁士蓝渐淡）与地平线的淡红；年画是高饱和的桃红大绿明黄、粗黑线、开脸的粉腮。
 * 迁移到 Godot：一个全屏着色器（hint_screen_texture + 深度 / 法线）；年画的粉腮需要先把皮肤角色画成遮罩再模糊（多一个 SubViewport 或 BackBufferCopy）。
 */

/* 浮世绘的颜料：普鲁士蓝、靛蓝、草绿、深绿、黄土、朱、红（紅）、茶、鼠灰、墨；蓝、绿、灰、红另有冲淡的一档 */
const UKIYOE_INKS = inkTable('UK', ['#23466F', '#2E3D4F', '#8AA36B', '#4F6B45', '#D9B45A', '#CC4B2E', '#D9849A', '#8B5E3C', '#8C8C88', '#262626'], '#F0E3C4',
  ['#23466F', '#8AA36B', '#8C8C88', '#D9849A', '#8B5E3C', '#4F6B45'], { '#262626': 0.015, '#2E3D4F': 0.006 });
/* 年画的颜料：大红、桃红、粉、明黄、橙、大绿、草绿、青、紫、赭、淡墨、墨 */
// 墨与淡墨加偏置：只有真正很暗 / 很灰的地方才归黑版（年画里大片黑很少见），偏灰的中间调归纸白
const NIANHUA_INKS = inkTable('NH', ['#D7262E', '#EE4F8D', '#F6A3B5', '#F6C326', '#EE7A22', '#1F9A55', '#8CC63F', '#2A73B8', '#6B3D8F', '#B5652B', '#B9B6B0', '#1A1110'], '#FFF6E8',
  [], { paper: -0.012, '#F6A3B5': 0.006, '#6B3D8F': 0.006, '#B9B6B0': 0.02, '#1A1110': 0.03 });

/* 分色：每个像素归到最近的一种油墨（单独一个 pass 算一次，主 pass 只按编号取） */
const BLOCK_HEAD = PRINT_LIB + UKIYOE_INKS + NIANHUA_INKS + /* glsl */ `
uniform sampler2D tBlur;
uniform float uMode;      // 0 浮世绘，1 年画
uniform float uOffset;    // 套版错位 0~1
uniform float uGrain;     // 木纹 0~1
uniform float uBokashi;   // 天空晕染 0~1（浮世绘）
uniform vec3 uSkyInk;     // 晕染的蓝（色板的深水色）
uniform vec3 uRed;        // 地平线淡红（色板的强调色）

/* 最近的一种油墨（OKLab；明度权重小一点，让暗面的红仍然归红版） */
int classify(vec2 uv) {
  vec3 lab = toOklab(srgbToLin(texture(tBlur, uv).rgb));
  float best = 1e9; int bi = 0;
  if (uMode < 0.5) {
    for (int i = 0; i < UK_N; i++) { vec3 d = lab - UK_LAB[i]; d.x *= 0.85; float s = dot(d, d) + UK_B[i]; if (s < best) { best = s; bi = i; } }
  } else {
    for (int i = 0; i < NH_N; i++) { vec3 d = lab - NH_LAB[i]; d.x *= 0.6; d.yz *= 1.25; float s = dot(d, d) + NH_B[i]; if (s < best) { best = s; bi = i; } }
  }
  return bi;
}
`;
const CLASSIFY = BLOCK_HEAD + /* glsl */ `
uniform sampler2D tInput;   // 不用，但每个 fx 着色器都自己声明 tInput（FX_HEAD 不含）
void main() { oColor = vec4(float(classify(vUv)) / 32.0, 0.0, 0.0, 1.0); }`;

const BLOCK = BLOCK_HEAD + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tMask;
uniform sampler2D tIdx;
/* 分色结果（油墨编号）：按像素整格取，不插值 */
int idxAt(vec2 uv) {
  ivec2 ip = clamp(ivec2(uv * uRes), ivec2(0), ivec2(uRes) - 1);
  return int(texelFetch(tIdx, ip, 0).r * 32.0 + 0.5);
}
vec3 inkT(int i) { return uMode < 0.5 ? UK_T[i] : NH_T[i]; }
/* 每块色版各自的错位（像素）：方向随版不同，整张纸还有一点缓慢的伸缩 */
vec2 blockOff(int i, vec2 uv) {
  if (i == 0) return vec2(0.0);
  vec2 h = hash22(vec2(float(i) * 7.13, 3.7)) - 0.5;
  float px = uOffset * UNIT() * (uMode < 0.5 ? 2.6 : 6.0);
  vec2 drift = (vec2(vnoise(uv * 2.3 + float(i)), vnoise(uv * 2.3 + 9.1 + float(i))) - 0.5) * 0.8;
  return (normalize(h + 1e-4) * (0.55 + 0.45 * length(h) * 2.0) + drift) * px;
}
/* 木纹（板目）：顺着横向的长纹，偶尔绕过节疤；每块版的纹不一样 */
float woodGrain(vec2 p, float blk) {
  vec2 g = p / UNIT() + blk * vec2(173.0, 61.0);
  float warp = fbm(vec2(g.x / 420.0, g.y / 90.0)) * 46.0;
  vec2 knot = g - (floor(g / 380.0) + 0.5) * 380.0 - (hash22(floor(g / 380.0)) - 0.5) * 200.0;
  float kr = length(knot * vec2(0.6, 1.4));
  warp += 30.0 * exp(-kr / 60.0) * sin(kr / 9.0);
  float v = (g.y + warp + fbm(g / 25.0) * 6.0) / (5.5 + 2.0 * vnoise(g / 200.0));
  float lines = smoothstep(0.55, 0.95, abs(fract(v) - 0.5) * 2.0);
  return lines * (0.6 + 0.4 * vnoise(g / 60.0));
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  bool nh = uMode > 0.5;
  // 1 色版：先按未偏移的位置认出是哪块版，再按那块版的错位去取（错位后的色块）
  // 年画的天空不印（空白的纸）
  bool skyHere = skyAt(vUv);
  int k0 = nh && skyHere ? 0 : idxAt(vUv);
  vec2 off = blockOff(k0, vUv) / uRes;
  int k = k0 == 0 ? 0 : idxAt(vUv - off);
  if (nh && skyAt(vUv - off)) k = 0;
  // 色块比主版线略收：色块边缘留一丝纸白（被线盖住大半，错位那一侧露出来）
  float e = (nh ? 1.6 : 1.1) * U;
  bool cut = false;
  if (k != 0) {
    vec2 q = vUv - off;
    cut = idxAt(q + vec2(e, 0.0) / uRes) != k || idxAt(q - vec2(e, 0.0) / uRes) != k
       || idxAt(q + vec2(0.0, e) / uRes) != k || idxAt(q - vec2(0.0, e) / uRes) != k;
  }
  vec3 T = inkT(k);
  float blk = float(k);
  // 刷印：墨的浓淡起伏（年画更斑驳）+ 木纹 + 刷子（马连）压出的细麻点
  float dens = 1.0;
  if (k != 0) {
    float blot = fbm(p / (U * (nh ? 55.0 : 120.0)) + blk * 3.7);
    dens *= nh ? 0.82 + 0.3 * blot : 0.9 + 0.16 * blot;
    dens *= 1.0 - uGrain * (nh ? 0.22 : 0.3) * woodGrain(p, blk);
    float speck = smoothstep(nh ? 0.72 : 0.8, 0.97, vnoise(p / (2.4 * U) + blk * 11.0)) * smoothstep(0.35, 0.7, vnoise(p / (14.0 * U) + blk));
    dens *= 1.0 - speck * (nh ? 0.6 : 0.35) * (0.5 + 0.5 * uGrain);
    if (cut) dens *= 0.08;
  }
  vec3 c = uPaper * mix(vec3(1.0), T, clamp(dens, 0.0, 1.0));
  // 2 浮世绘的天空：一文字晕染（顶上一条深蓝向下渐淡）+ 地平线附近的淡红
  if (!nh && skyAt(vUv)) {
    float horizon = 0.0;
    for (int i = 1; i <= 4; i++) horizon += skyAt(vUv - vec2(0.0, float(i) * 0.035)) ? 0.0 : 0.25;
    float top = pow(smoothstep(0.45, 1.0, vUv.y), 1.4);
    // 晕染的边缘按木纹走（板上抹湿再上色，渐变里能看到纹理）
    float g = woodGrain(p, 31.0);
    top = clamp(top + (g - 0.5) * 0.08 * uGrain, 0.0, 1.0);
    vec3 skyc = uPaper * mix(vec3(1.0), clamp(uSkyInk / max(uPaper, vec3(0.05)), 0.0, 1.0), top * 0.95);
    skyc = mix(skyc, uPaper * mix(vec3(1.0), clamp(uRed / max(uPaper, vec3(0.05)), 0.0, 1.0), 0.32), horizon * (1.0 - top) * 0.8);
    c = mix(c, skyc, uBokashi);
  }
  // 3 年画的开脸：皮肤是白净的纸色，脸颊晕开一团桃红
  if (nh) {
    float skin = texture(tMask, vUv).r;
    float r0 = roleAt(tNormal, vUv);
    if (r0 == ROLE_skin) {
      vec3 face = uPaper * vec3(1.0, 0.96, 0.94);
      float blush = smoothstep(0.25, 0.85, skin) * (0.75 + 0.25 * vnoise(p / (3.0 * U)));
      c = mix(face, uPaper * vec3(0.98, 0.56, 0.62), blush * 0.85);
    }
  }
  // 4 主版：物体轮廓与分界（不偏移），线粗略有起伏
  float w = (nh ? 2.3 : 1.25) * U * uScale;
  float line = keyLineW(vUv, w, nh ? 0.5 : 0.42);
  line *= smoothstep(0.25, 0.55, line + (vnoise(p / (6.0 * U)) - 0.5) * 0.35);
  vec3 lineCol = nh ? uInk * 0.9 : mix(uInk, uSkyInk, 0.3) * 0.85;
  c = mix(c, lineCol, clamp(line, 0.0, 1.0) * (nh ? 0.97 : 0.9));
  // 5 纸：和纸的纤维与云状纸浆（年画是更粗的土纸，带草屑）
  float wf = washi(p);
  c *= 1.0 + wf * (nh ? 0.07 : 0.05);
  if (nh) c *= 1.0 - 0.25 * smoothstep(0.93, 0.99, hash12(floor(p / (2.0 * U)))) * smoothstep(0.4, 0.8, vnoise(p / (9.0 * U)));
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

/* 年画粉腮用的皮肤遮罩：r = 皮肤 */
const MASK = /* glsl */ `
uniform sampler2D tInput;   // 不用，但每个 fx 着色器都自己声明 tInput（FX_HEAD 不含）
uniform sampler2D tNormal;
void main() { float r = roleAt(tNormal, vUv); oColor = vec4(r == ROLE_skin ? 1.0 : 0.0, isCharacterRole(r) ? 1.0 : 0.0, 0.0, 1.0); }`;

function blockFx(id: string, medium: 'ukiyoe' | 'nianhua') {
  const u = mediumUniforms({
    tBlur: { value: null }, tMask: { value: null }, tIdx: { value: null }, uMode: { value: medium === 'nianhua' ? 1 : 0 },
    uOffset: { value: 0.5 }, uGrain: { value: 0.5 }, uBokashi: { value: 0.7 },
    uSkyInk: { value: new THREE.Color() }, uRed: { value: new THREE.Color() },
  });
  registerFx({
    id, stage: 'medium', medium, frag: BLOCK, uniforms: u,
    extra: {
      mask: { frag: MASK, uniforms: { tNormal: { value: null } } },
      classify: { frag: CLASSIFY, uniforms: mediumUniforms({ tBlur: { value: null }, uMode: { value: medium === 'nianhua' ? 1 : 0 } }) },
    },
    setup(p, c) {
      setMedium(p, c);
      const v = c.values;
      p.uniforms.uOffset.value = num(v, 'surface.printOffset');
      p.uniforms.uGrain.value = num(v, 'surface.woodGrain');
      p.uniforms.uBokashi.value = num(v, 'surface.bokashi');
      setRole(p.uniforms.uSkyInk, c, 'waterDeep');
      setRole(p.uniforms.uRed, c, 'accent');
    },
    render(c, out, p) {
      const U = unitOf(c);
      if (medium === 'nianhua') {
        const m = c.passOf(`${id}:mask`);
        m.uniforms.tNormal.value = c.normal;
        const rt = c.scratch(0);
        m.render(c.renderer, rt);
        // 粉腮：皮肤遮罩模糊后，脸中间高、边上低
        p.uniforms.tMask.value = c.blur(rt.texture, 1.2 * U);
        // 模糊缓冲是共用的：遮罩先复制出来，再做画面的模糊
        c.copy(p.uniforms.tMask.value as THREE.Texture, c.scratch(1));
        p.uniforms.tMask.value = c.scratch(1).texture;
      } else p.uniforms.tMask.value = c.input;
      // 分色前先抹平明暗细节（版画是平涂色块）
      const bl = c.blur(c.input, (medium === 'nianhua' ? 1.1 : 0.95) * U);
      const k = c.passOf(`${id}:classify`);
      k.uniforms.tBlur.value = bl;
      k.uniforms.uMode.value = medium === 'nianhua' ? 1 : 0;
      k.render(c.renderer, c.scratch(2));
      p.uniforms.tBlur.value = bl;
      p.uniforms.tIdx.value = c.scratch(2).texture;
      p.render(c.renderer, out);
    },
  });
}

blockFx('p1b-ukiyoe', 'ukiyoe');
blockFx('p1b-nianhua', 'nianhua');

if (import.meta.hot) import.meta.hot.accept();
