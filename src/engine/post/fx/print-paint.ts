import { num } from '../../../dims/registry';
import { mediumUniforms, PRINT_LIB, setMedium, unitOf } from './print-lib';
import { registerFx } from './registry';

/*
 * P1b 绘画类媒介：点彩、色粉、蜡笔、马克笔（surface.medium 的新取值，stage = 'medium'）。
 * 迁移到 Godot：每个媒介一个全屏 canvas_item 着色器（hint_screen_texture + 深度 / 法线），需要模糊图的先过一次 BackBufferCopy + 模糊。
 */

/* ---------------- 点彩（修拉）：纯色圆点并置，暗部夹补色点，点与点之间露出画布 ---------------- */
const POINTILLISM = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform float uComp;
/* 一个笔点的颜色：取点中心的画面颜色，换成更纯的色相；按随机数选同色、邻色、补色、光色 */
vec3 dotColor(vec3 src, vec3 srcBlur, vec2 id, float layer, float cov) {
  vec3 l = toLch(mix(src, srcBlur, 0.35));
  float L = l.x, C = l.y, h = l.z;
  float r1 = hash12(id * 1.37 + layer * 11.0), r2 = hash12(id * 2.11 + layer * 5.3), r3 = hash12(id * 0.73 + layer * 2.9);
  float shadow = smoothstep(0.62, 0.3, L);
  float light = smoothstep(0.72, 0.92, L);
  // 灰色（彩度很低）：用一对互补色的点混出灰（光学混色）
  float grey = 1.0 - smoothstep(0.02, 0.06, C);
  h = mix(h, r2 < 0.5 ? 1.05 : 1.05 + PI, grey);
  C = mix(C, 0.07, grey);
  float k2 = uComp * 2.0;
  float dh = (r2 - 0.5) * 0.3;      // 同色相小幅摆动
  float cm = 1.45;
  float mid = 1.0 - shadow - light;
  float pComp = (0.015 + 0.11 * shadow + 0.02 * mid) * k2;
  if (r1 < pComp) { dh = PI + (r2 - 0.5) * 0.3; cm = 0.85; }                                  // 补色点
  else if (r1 < pComp + 0.22) { dh = (r2 < 0.5 ? -1.0 : 1.0) * (0.3 + 0.25 * r3); }           // 邻色点
  h += dh;
  C = clamp(C * cm + 0.025, 0.0, 0.18);
  // 暗部掺群青 / 紫的冷色点（阴影是蓝的），亮部掺暖黄、橙的阳光点
  if (r3 < 0.3 * shadow * k2) { h = 4.7 + (r1 - 0.5) * 0.7; C = 0.1; L = min(L, 0.55); }
  else if (r3 > 1.0 - 0.28 * light * k2) { h = 1.2 + (r1 - 0.5) * 0.6; C = 0.1; L = max(L, 0.84); }
  // 新印象派不用黑与土色：最暗处也是深群青 / 深紫，整体明度抬高、发亮
  L = mix(0.24, 0.98, L);
  L += (r1 - 0.5) * 0.045 + 0.02 * (1.0 - cov);
  return fromLch(vec3(clamp(L, 0.04, 0.97), C, h));
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  float cell = 10.5 * uScale * U;
  // 底：画布 + 一层淡淡的底色（修拉先用宽笔铺一遍底色，再点点；点缝里露出的是底色与画布，不是纯白）
  float weave = sin(p.x * 1.7 / U) * sin(p.y * 1.7 / U);
  vec3 bl = texture(tBlur, vUv).rgb;
  vec3 col = mix(bl, uPaper, 0.45) * (0.975 + 0.025 * weave) * (0.98 + 0.04 * fbm(p / (40.0 * U)));
  float Lb = lum(bl);
  float shadow = smoothstep(0.62, 0.18, Lb);
  // 三层错开、各转一点角度的抖动点阵；越暗点越大、层越多（暗处几乎不露底）
  float cov = 0.7 + 0.28 * shadow;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float rad = (k == 0 ? 0.5 : k == 1 ? 0.47 : 0.44) * (0.92 + 0.2 * shadow);
    if (k == 2) rad *= smoothstep(0.0, 0.45, shadow);
    if (rad < 0.05) continue;
    mat2 R = rot2(0.45 + fk * 0.71);
    vec2 q = R * p / cell + vec2(fk * 0.37, fk * 0.61);
    vec2 ip = floor(q);
    float best = 9.0; vec2 bid = vec2(0.0); vec2 bc = vec2(0.0);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 g = ip + vec2(i, j);
      vec2 hj = hash22(g + fk * 17.0);
      vec2 c = g + 0.5 + (hj - 0.5) * 0.75;
      // 笔点略长圆，方向随机（短促的一点，不是正圆章）
      float a = hj.x * PI;
      vec2 d = rot2(a) * (q - c);
      d.x /= 1.0 + 0.32 * hj.y;
      float dist = length(d) / (rad * (0.85 + 0.3 * hash12(g * 3.1 + fk)));
      if (dist < best) { best = dist; bid = g; bc = c; }
    }
    float a = 1.0 - smoothstep(0.86, 1.0 + 0.9 / cell, best);
    if (a <= 0.0) continue;
    vec2 cuv = (transpose(R) * (bc - vec2(fk * 0.37, fk * 0.61))) * cell / uRes;
    vec3 dc = dotColor(texture(tInput, cuv).rgb, texture(tBlur, cuv).rgb, bid, fk, cov);
    // 颜料厚度：点的边缘略深、中间略亮
    dc *= 0.94 + 0.08 * (1.0 - best);
    col = mix(col, dc, a);
  }
  // 轮廓的光晕对比（修拉的「光渗」）：暗物体边上的亮底更亮，反之更暗
  float halo = clamp((lum(o) - Lb) * 0.6, -0.12, 0.12);
  col = clamp(col + halo, 0.0, 1.0);
  oColor = vec4(mix(o, col, uStrength), 1.0);
}`;

const pointU = mediumUniforms({ tBlur: { value: null }, uComp: { value: 0.5 } });
registerFx({
  id: 'p1b-pointillism', stage: 'medium', medium: 'pointillism', frag: POINTILLISM, uniforms: pointU,
  setup(p, c) {
    setMedium(p, c);
    p.uniforms.uComp.value = num(c.values, 'surface.dotComplement');
  },
  render(c, out, p) {
    p.uniforms.tBlur.value = c.blur(c.input, 1.5 * num(c.values, 'surface.scale') * unitOf(c));
    p.render(c.renderer, out);
  },
});

/* ---------------- 色粉：粉质的短斜笔，颜料只留在纸纹凸起处，大片地方被手指抹开 ---------------- */
const PASTEL = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform float uTooth;
uniform float uSmudge;
/* 色粉纸的纸纹（0~1）：细密的蜂窝状凸起 + 一点长纤维 */
float tooth(vec2 p) {
  vec2 q = p / UNIT();
  vec2 c = q / 3.2;
  vec2 ic = floor(c);
  float cell = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = ic + vec2(i, j);
    cell = min(cell, length(c - g - hash22(g)));
  }
  float t = 1.0 - smoothstep(0.1, 0.75, cell);
  return clamp(t * 0.6 + vnoise(q / 1.4) * 0.3 + vnoise(rot2(0.4) * q / vec2(14.0, 1.6)) * 0.15, 0.0, 1.0);
}
/* 粉质：不透明、哑光，略发白 */
vec3 chalky(vec3 c) { vec3 l = toLch(c); l.x = mix(l.x, 0.97, 0.12); l.y *= 0.92; return fromLch(l); }
/* 一层短斜笔：每一行是一条轨道，笔一段一段排着；返回 (颜色, 覆盖) */
vec4 strokeLayer(vec2 p, float ang, float len, float wid, float layer, float tth) {
  vec2 q = rot2(ang) * p;
  float row = floor(q.y / wid);
  float xo = hash12(vec2(row, layer)) * len;
  float colI = floor((q.x + xo) / len);
  vec2 id = vec2(colI, row);
  float u = fract((q.x + xo) / len);
  float v = fract(q.y / wid);
  float h = hash12(id + layer * 31.0);
  float L = 0.55 + 0.4 * h;          // 每一笔长短不一
  float body = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(L - 0.18, L, u));
  // 笔的两边是碎的（粉笔侧锋蹭出来的毛边）
  float across = 1.0 - smoothstep(0.22 + 0.12 * vnoise(vec2(u * 9.0, row + layer * 5.0)), 0.5, abs(v - 0.5));
  // 笔压：中段重、两头轻；粉笔只蹭到纸纹凸起
  float press = body * across * (0.55 + 0.45 * sin(u / L * PI));
  float cov = smoothstep(1.0 - press, 1.0 - press + 0.12, tth + 0.3);
  vec2 cq = vec2((colI + 0.5 * L) * len - xo, (row + 0.5) * wid);
  vec2 cuv = (transpose(rot2(ang)) * cq) / uRes;
  // 色粉画一层层换色：每一笔的色相、明度略有不同
  vec3 l = toLch(texture(tInput, cuv).rgb);
  float h2 = hash12(id * 1.9 + layer * 7.0);
  l.z += (h2 - 0.5) * 0.55;
  l.x += (hash12(id * 3.3 + layer) - 0.5) * 0.09;
  l.y *= 0.9 + 0.35 * h2;
  return vec4(fromLch(l), cov);
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  float tth = mix(0.5, tooth(p), uTooth);
  // 色粉纸是有色的中间调纸（灰褐）：空隙里露出来
  vec3 paper = mix(uPaper, vec3(0.62, 0.57, 0.5), 0.55);
  // 1 抹开的底：模糊的颜色（手指把粉揉进纸纹），抹得多的地方几乎盖满纸
  vec3 bl = texture(tBlur, vUv).rgb;
  float smudgeZone = smoothstep(0.35, 0.65, fbm(p / (230.0 * U) + 4.0));
  float sm = uSmudge * (0.45 + 0.55 * smudgeZone);
  float baseCov = smoothstep(0.8 - 0.5 * sm, 0.95 - 0.4 * sm, tth + 0.2 + 0.3 * sm);
  vec3 c = mix(paper, chalky(mix(bl, o, 0.4)), baseCov * (0.32 + 0.55 * sm));
  // 2 两层斜笔：主方向约 60°，按区域略转；暗处多一层交叉笔
  // 笔的方向按「一片一片」变（每片里是直的平行笔，片与片之间方向不同），不要连续旋转（会排成指纹状的弧）
  vec2 pc = p / (150.0 * U);
  vec2 ipc = floor(pc);
  float bd = 9.0; vec2 pid = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = ipc + vec2(i, j);
    float d = length(pc - g - hash22(g + 40.0));
    if (d < bd) { bd = d; pid = g; }
  }
  float dirN = (hash12(pid * 1.31) - 0.5) * 0.9;
  float len = 34.0 * U * uScale, wid = 11.0 * U * uScale;
  float strokeVis = 1.0 - 0.5 * sm;
  float ps = floor(hash12(pid * 2.7) * 50.0) * 3.0;
  vec4 s1 = strokeLayer(p, 1.0 + dirN, len, wid, ps, tth);
  c = mix(c, chalky(s1.rgb), s1.a * strokeVis);
  float dark = smoothstep(0.55, 0.2, lum(bl));
  vec4 s2 = strokeLayer(p, 1.0 + dirN + 0.65, len * 0.85, wid * 0.9, ps + 1.0, tth);
  c = mix(c, chalky(s2.rgb) * 0.92, s2.a * strokeVis * (0.35 + 0.65 * dark));
  // 3 亮部的提亮笔：浅色粉压在最上面
  float light = smoothstep(0.62, 0.85, lum(bl));
  vec4 s3 = strokeLayer(p, 0.8 + dirN, len * 0.7, wid * 0.8, ps + 2.0, tth);
  c = mix(c, chalky(mix(s3.rgb, vec3(1.0), 0.25)), s3.a * light * 0.7);
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

const pastelU = mediumUniforms({ tBlur: { value: null }, uTooth: { value: 0.6 }, uSmudge: { value: 0.5 } });
registerFx({
  id: 'p1b-pastel', stage: 'medium', medium: 'pastel', frag: PASTEL, uniforms: pastelU,
  setup(p, c) {
    setMedium(p, c);
    p.uniforms.uTooth.value = num(c.values, 'surface.paperTooth');
    p.uniforms.uSmudge.value = num(c.values, 'surface.smudge');
  },
  render(c, out, p) {
    p.uniforms.tBlur.value = c.blur(c.input, 1.7 * num(c.values, 'surface.scale') * unitOf(c));
    p.render(c.renderer, out);
  },
});

/* ---------------- 蜡笔：蜡只挂在纸纹的凸起上，满是白色小斑；来回涂的排线、轻重不匀，偶尔涂出边 ---------------- */
const CRAYON = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform float uTooth;
/* 纸纹：粗而碎，略横向 */
float grain(vec2 p) {
  vec2 q = p / UNIT();
  return clamp(vnoise(q / 1.05) * 0.45 + vnoise(q / 2.6 + 5.0) * 0.35 + vnoise(vec2(q.x / 7.0, q.y / 1.7) + 9.0) * 0.2, 0.0, 1.0);
}
vec3 waxy(vec3 c) { vec3 l = toLch(c); l.y = min(l.y * 1.25 + 0.02, 0.22); l.x = mix(l.x, 0.75, 0.1); return fromLch(l); }
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  float g = mix(0.55, grain(p), uTooth);
  // 小孩涂色：颜色区域整体歪一点、涂出边（低频位移）
  vec2 wob = (vec2(vnoise(p / (38.0 * U)), vnoise(p / (38.0 * U) + 7.7)) - 0.5) * 7.0 * U * uScale;
  vec3 src = texture(tBlur, vUv + wob / uRes).rgb;
  float dark = 1.0 - lum(src);
  // 来回涂的排线：方向按区域变（斜、竖、另一斜），线距 4~5 像素，线上的笔压起伏
  float region = vnoise(p / (150.0 * U) + 2.0);
  float ang = region < 0.4 ? 0.9 : region < 0.62 ? 1.57 : 2.3;
  vec2 d = vec2(cos(ang), sin(ang));
  float s = 4.6 * U * uScale;
  float t = dot(p, vec2(-d.y, d.x)) / s + vnoise(p / (25.0 * U)) * 1.4;
  float band = 0.5 + 0.5 * cos(t * 2.0 * PI);
  float press = 0.48 + 0.45 * dark + 0.2 * (vnoise(p / (70.0 * U)) - 0.5) + 0.3 * (band - 0.5);
  float cov = smoothstep(1.0 - press, 1.0 - press + 0.12, g);
  vec3 wax = waxy(src);
  vec3 c = mix(uPaper, wax, cov);
  // 暗处再横着涂一层同色更重的
  if (dark > 0.35) {
    vec2 d2 = vec2(cos(ang + 1.3), sin(ang + 1.3));
    float t2 = dot(p, vec2(-d2.y, d2.x)) / (s * 1.1) + vnoise(p / (21.0 * U) + 3.0) * 1.4;
    float b2 = 0.5 + 0.5 * cos(t2 * 2.0 * PI);
    float p2 = (dark - 0.35) * 1.3 + 0.2 * (b2 - 0.5);
    float cov2 = smoothstep(1.0 - p2, 1.0 - p2 + 0.12, grain(p + 13.0 * U));
    c = mix(c, waxy(src) * 0.82, cov2 * 0.85);
  }
  // 用力描的轮廓：同色更深的蜡线，也是颗粒状的
  float line = keyLineW(vUv + wob * 0.3 / uRes, 1.8 * U * uScale, 0.5);
  float lc = smoothstep(0.35, 0.6, g + 0.25) * line;
  c = mix(c, waxy(src) * 0.45, lc * 0.8);
  // 蜡的微光：笔压重的地方略亮一点（蜡面反光）
  c += vec3(0.04) * cov * smoothstep(0.75, 0.95, g);
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

const crayonU = mediumUniforms({ tBlur: { value: null }, uTooth: { value: 0.6 } });
registerFx({
  id: 'p1b-crayon', stage: 'medium', medium: 'crayon', frag: CRAYON, uniforms: crayonU,
  setup(p, c) {
    setMedium(p, c);
    p.uniforms.uTooth.value = num(c.values, 'surface.paperTooth');
  },
  render(c, out, p) {
    p.uniforms.tBlur.value = c.blur(c.input, 0.9 * num(c.values, 'surface.scale') * unitOf(c));
    p.render(c.renderer, out);
  },
});

/* ---------------- 马克笔：一道道等宽的平行笔，透明叠色（重叠处更深），笔头停顿处积墨，边缘洇出一点 ---------------- */
const MARKER = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform float uAngle;
/* 一组平行笔道：返回 (覆盖层数 0~1, 笔道内的位置 0~1, 笔道编号) */
vec3 bands(vec2 q, float w, float period, float seed) {
  float i = floor(q.x / period);
  float jit = (hash12(vec2(i, seed)) - 0.5) * 0.08 * period;
  float x = q.x - i * period - jit;
  float ww = w * (0.94 + 0.12 * hash12(vec2(i, seed + 3.0)));
  float inside = step(0.0, x) * step(x, ww);
  // 也可能被左边那一笔盖到（笔宽大于间距 → 重叠）
  float jitL = (hash12(vec2(i - 1.0, seed)) - 0.5) * 0.08 * period;
  float xl = q.x - (i - 1.0) * period - jitL;
  float wl = w * (0.94 + 0.12 * hash12(vec2(i - 1.0, seed + 3.0)));
  float insideL = step(0.0, xl) * step(xl, wl);
  float pos = inside > 0.5 ? x / ww : xl / max(wl, 1e-3);
  return vec3(inside + insideL, pos, inside > 0.5 ? i : i - 1.0);
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  float ang = uAngle;
  vec2 dir = vec2(cos(ang), sin(ang));          // 笔走的方向
  vec2 q = rot2(-ang + PI * 0.5) * p;            // q.y 顺着笔，q.x 横跨笔道
  q.x += (vnoise(vec2(q.y / (90.0 * U), 1.0)) - 0.5) * 6.0 * U;   // 手绘的笔道不是绝对直
  // 洇色：颜色区域向外渗一点（边缘略抖）
  vec2 bleed = (vec2(vnoise(p / (5.0 * U)), vnoise(p / (5.0 * U) + 3.3)) - 0.5) * 2.4 * U;
  vec3 t = texture(tBlur, vUv + bleed / uRes).rgb;
  float dark = 1.0 - lum(t);
  float w = 15.0 * U * uScale;
  // 第一遍：所有地方；第二遍（错开半道）：中间调以下；第三遍（换个角度）：暗部
  vec3 A = bands(q, w, w * 0.8, 1.0);
  vec3 B = bands(q + vec2(w * 0.43, 0.0), w, w * 0.9, 2.0);
  vec2 q3 = rot2(0.5) * q;
  vec3 C = bands(q3, w * 0.9, w * 0.8, 3.0);
  float needB = smoothstep(0.25, 0.5, dark + (hash12(vec2(B.z, 9.0)) - 0.5) * 0.2);
  float needC = smoothstep(0.55, 0.75, dark + (hash12(vec2(C.z, 5.0)) - 0.5) * 0.2);
  // 浅色处偶尔漏掉一道，留出白色细条（设计手稿常见）
  float skipA = step(0.22, hash12(vec2(A.z, 4.0)));
  float n = min(A.x, 1.0) * mix(1.0, skipA, smoothstep(0.3, 0.08, dark)) + (A.x > 1.5 ? 0.85 : 0.0) + B.x * needB + C.x * needC;
  // 毡头的细纹：顺着笔走的浓淡细条
  n *= 0.93 + 0.14 * vnoise(vec2(q.x / (1.6 * U), q.y / (70.0 * U)));
  // 笔道边缘积墨（每一笔的两侧略深）
  float edge = smoothstep(0.82, 1.0, abs(A.y - 0.5) * 2.0) * min(A.x, 1.0);
  n += edge * 0.35;
  // 一笔有头有尾：每条笔道按随机长度分段，段与段首尾相接处多叠一点（顿笔积墨）
  float segL = (90.0 + 140.0 * hash12(vec2(A.z, 21.0))) * U * uScale;
  float sv = (q.y + hash12(vec2(A.z, 22.0)) * segL) / segL;
  float sEnd = min(fract(sv), 1.0 - fract(sv)) * segL / U;
  n += 0.55 * (1.0 - smoothstep(1.5, 5.0, sEnd)) * min(A.x, 1.0);
  // 天空：设计手稿只在顶上排几笔，笔尾参差地停在半空，下面留白
  if (skyAt(vUv)) {
    float stop = 0.55 + 0.3 * hash12(vec2(A.z, 23.0));
    float yy = dot(vUv - 0.5, vec2(0.0, 1.0)) + 0.5;
    float keep = smoothstep(stop - 0.015, stop + 0.015, yy);
    n = mix(0.0, n, keep);
    n += 0.5 * (1.0 - smoothstep(0.0, 0.008, yy - stop)) * keep;
  }
  // 笔头停顿处积墨：顺着笔走，前后几个像素内颜色变了 → 这是一笔的头或尾
  vec3 ta = texture(tBlur, vUv + dir * 3.0 * U / uRes).rgb, tb = texture(tBlur, vUv - dir * 3.0 * U / uRes).rgb;
  float endPool = smoothstep(0.04, 0.12, max(length(ta - t), length(tb - t)));
  n += endPool * 0.6;
  // 期望的叠层数 → 每一层的透过率：平均下来接近原色
  float E = 1.0 + 0.55 * needB + 0.6 * needC + 0.12;
  vec3 T = pow(clamp(t / max(uPaper, vec3(0.05)), 0.02, 1.0), vec3(1.0 / E));
  vec3 c = uPaper * pow(T, vec3(n));
  // 马克笔纸：亮白、略冷
  c *= 0.985 + 0.015 * vnoise(p / (3.0 * U));
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

const markerU = mediumUniforms({ tBlur: { value: null }, uAngle: { value: 1.2 } });
registerFx({
  id: 'p1b-marker', stage: 'medium', medium: 'marker', frag: MARKER, uniforms: markerU,
  setup(p, c) {
    setMedium(p, c);
    p.uniforms.uAngle.value = (num(c.values, 'surface.markerAngle') * Math.PI) / 180;
  },
  render(c, out, p) {
    p.uniforms.tBlur.value = c.blur(c.input, 0.55 * unitOf(c));
    p.render(c.renderer, out);
  },
});

if (import.meta.hot) import.meta.hot.accept();
