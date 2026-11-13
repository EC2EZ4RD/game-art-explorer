import * as THREE from 'three';
import { bool, str } from '../../../dims/registry';
import { hudFontsVersion, loadHudFonts } from '../../../hud/fonts';
import { inkTable, mediumUniforms, PRINT_LIB, setMedium, unitOf } from './print-lib';
import { registerFx } from './registry';

/*
 * P1b 古代手工媒介：
 *   manuscript  彩绘手抄本：画面分到中世纪颜料（群青、朱砂、铜绿、赭黄、玫瑰红、铅白）的平涂 + 墨线，天空换成菱格纹底；
 *               再在纸纹之后把画面框进羊皮纸页：金箔边框、页边的藤蔓与常春藤叶、左上角的装饰首字母（金底蓝字）。
 *   blackFigure 古希腊黑绘陶：角色、树、建筑等「形象」涂成有光泽的黑釉剪影，地面与天空是陶土橙，
 *               剪影里的细节用刻线刮出陶土色的细线；再在纸纹之后把画面卷到瓶身上（圆柱弯曲 + 釉光），上下各一条回纹带、瓶底一圈放射纹。
 * 媒介这一步只换颜色；页框 / 瓶身在 afterOverlay 阶段画（这样内部线、纸纹都被一起框进去、一起弯曲）。
 * 迁移到 Godot：媒介与页框各一个全屏着色器；首字母用 Label（Cinzel 字体）或预渲染贴图。
 */

/* 中世纪颜料：群青、石青、朱砂、玫瑰红（茜草）、铜绿、绿土、赭黄、熟褐、铁胆墨；石青、朱砂、铜绿、玫瑰红另有掺铅白的浅档 */
const MS_INKS = inkTable('MS', ['#2B4DA0', '#5C7FC0', '#D03A26', '#B0485E', '#3E8A5A', '#7E9A5B', '#D4A53E', '#7A5230', '#2A1E16'], '#F1E6CC',
  ['#5C7FC0', '#D03A26', '#3E8A5A', '#B0485E', '#D4A53E'], { '#2A1E16': 0.02 });

const MANUSCRIPT = PRINT_LIB + MS_INKS + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
int classify(vec2 uv) {
  vec3 lab = toOklab(srgbToLin(texture(tBlur, uv).rgb));
  float best = 1e9; int bi = 0;
  for (int i = 0; i < MS_N; i++) { vec3 d = lab - MS_LAB[i]; d.x *= 0.8; d.yz *= 1.15; float s = dot(d, d) + MS_B[i]; if (s < best) { best = s; bi = i; } }
  return bi;
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  vec3 parch = uPaper * vec3(1.0, 0.97, 0.9);
  vec3 c;
  if (skyAt(vUv)) {
    // 天空：菱格纹底（群青与玫瑰红相间，格心一个白点，格线是金线）
    vec2 q = rot2(PI * 0.25) * (p / (0.055 * uRes.y));
    vec2 id = floor(q), f = fract(q);
    float chk = mod(id.x + id.y, 2.0);
    c = chk < 0.5 ? vec3(0.17, 0.3, 0.63) : vec3(0.69, 0.28, 0.33);
    float dotW = 1.0 - smoothstep(0.07, 0.1, length(f - 0.5));
    float cross_ = (1.0 - smoothstep(0.02, 0.05, abs(f.x - 0.5))) * (1.0 - smoothstep(0.12, 0.2, abs(f.y - 0.5)))
                 + (1.0 - smoothstep(0.02, 0.05, abs(f.y - 0.5))) * (1.0 - smoothstep(0.12, 0.2, abs(f.x - 0.5)));
    c = mix(c, vec3(0.97, 0.93, 0.85), clamp(dotW + cross_ * 0.8, 0.0, 1.0));
    float grid = 1.0 - smoothstep(0.03, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    c = mix(c, goldLeafAt(p, 0.05 * uRes.y, 1.0), grid);
  } else {
    int k = classify(vUv);
    c = parch * MS_T[k];
    // 颜料是平涂但有厚薄：笔刷的浓淡起伏
    c *= 0.94 + 0.1 * fbm(p / (18.0 * U) + float(k) * 5.0);
    // 赭黄换成贴金（金箔）：手抄本里亮黄的地方多是金
    if (k == 7) c = goldLeafAt(p, 0.03 * uRes.y, 1.0);
    // 铅白提亮：亮面的边上一道白
    float hi = smoothstep(0.65, 0.9, lum(texture(tBlur, vUv).rgb)) * smoothstep(0.02, 0.08, lum(o) - lum(texture(tBlur, vUv).rgb));
    c = mix(c, vec3(0.97, 0.95, 0.9), hi * 0.6);
  }
  // 墨线：深褐色的铁胆墨，细而均匀
  float line = keyLineW(vUv, 1.3 * U * uScale, 0.45);
  c = mix(c, vec3(0.16, 0.11, 0.08), line * 0.92);
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

/* 页框：羊皮纸页边、金框、藤蔓、首字母 */
const PAGE = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tInitial;
uniform float uInitialAspect;
/* 常春藤叶（心形三尖）：中心 c、朝向 a、大小 r */
float ivy(vec2 p, vec2 c, float a, float r) {
  vec2 q = rot2(-a) * (p - c) / r;
  float d = length(q - vec2(0.0, 0.25)) - 0.55;
  d = min(d, length(q - vec2(-0.42, -0.15)) - 0.45);
  d = min(d, length(q - vec2(0.42, -0.15)) - 0.45);
  d = max(d, -(length(q - vec2(0.0, -0.95)) - 0.42));
  return d * r;
}
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 P = vUv * asp;
  float W = asp.x;
  float U = UNIT();
  float px = 1.0 / uRes.y;
  vec3 c = texture(tInput, vUv).rgb;
  float m = 0.092;                       // 页边宽（画面高的比例）
  vec2 lo = vec2(m), hi = vec2(W - m, 1.0 - m);
  vec2 d2 = max(lo - P, P - hi);
  float sd = max(d2.x, d2.y);            // 到画框的有符号距离（框内为负）
  // 羊皮纸：暖米色、云状斑驳、靠外缘发黄发暗
  vec2 p = vUv * uRes;
  vec3 parch = uPaper * vec3(1.0, 0.95, 0.84);
  parch *= 0.92 + 0.1 * fbm(p / (60.0 * U)) + 0.04 * (fbm(p / (7.0 * U)) - 0.5);
  float edge = min(min(P.x, W - P.x), min(P.y, 1.0 - P.y));
  parch *= mix(0.78, 1.0, smoothstep(0.0, 0.05, edge));
  parch = mix(parch, parch * vec3(0.95, 0.85, 0.7), smoothstep(0.55, 0.85, fbm(p / (140.0 * U) + 3.0)) * 0.5);
  if (sd > 0.0) c = parch;
  // 画框：外一道墨线、金条、内一道朱红细线
  float gw = 0.011;
  float gpos = sd;
  if (gpos > -0.004 && gpos < gw + 0.004) {
    vec3 gold = goldLeafAt(p, 0.03 * uRes.y, 1.0);
    if (gpos >= 0.0 && gpos <= gw) c = gold;
    if (gpos < 0.0) c = mix(c, vec3(0.75, 0.2, 0.14), 1.0);
  }
  float lineA = 1.0 - smoothstep(1.0 * px, 2.2 * px, abs(sd - gw));
  float lineB = 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(sd));
  float lineC = 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(sd + 0.004));
  c = mix(c, vec3(0.15, 0.1, 0.07), max(max(lineA, lineB), lineC * 0.8));
  // 页边藤蔓：沿页边中线波动的细茎，交替长出金、蓝、红的常春藤叶，叶旁一个金点
  if (sd > gw + 0.006) {
    float mid = m * 0.5 + gw * 0.25;
    // 页边的「行进坐标」t 与离中线的距离 n
    float t, n;
    float dl = P.x, dr = W - P.x, db = P.y, dt = 1.0 - P.y;
    float dm = min(min(dl, dr), min(db, dt));
    if (dm == dl) { t = P.y; n = dl - mid; } else if (dm == dr) { t = 1.0 + P.y; n = dr - mid; }
    else if (dm == db) { t = 2.0 + P.x; n = db - mid; } else { t = 3.0 + P.x; n = dt - mid; }
    float per = 0.12;
    float wave = sin(t / per * PI) * m * 0.14;
    float stem = 1.0 - smoothstep(0.9 * px, 2.0 * px, abs(n - wave));
    vec3 leafCol = vec3(0.0); float leafA = 0.0, leafLine = 0.0;
    for (int k = -1; k <= 1; k++) {
      float i = floor(t / per) + float(k);
      float tc = (i + 0.5) * per;
      float side = mod(i, 2.0) < 0.5 ? 1.0 : -1.0;
      vec2 lc = vec2(tc + per * 0.12, side * m * 0.2);
      float ld = ivy(vec2(t, n), lc, side * 0.5 + PI * (side > 0.0 ? 0.0 : 1.0), m * 0.2);
      // 叶柄：从茎连到叶
      vec2 a0 = vec2(tc - per * 0.05, sin((tc - per * 0.05) / per * PI) * m * 0.14), a1 = lc;
      vec2 ab = a1 - a0; float hh = clamp(dot(vec2(t, n) - a0, ab) / dot(ab, ab), 0.0, 1.0);
      float stalk = length(vec2(t, n) - a0 - ab * hh);
      leafLine = max(leafLine, 1.0 - smoothstep(0.8 * px, 1.8 * px, stalk));
      float colI = mod(i, 3.0);
      vec3 lcol = colI < 0.5 ? goldLeafAt(p, 0.02 * uRes.y, 1.0) : colI < 1.5 ? vec3(0.17, 0.3, 0.63) : vec3(0.72, 0.2, 0.15);
      if (ld < 0.0) { leafCol = lcol; leafA = 1.0; }
      leafLine = max(leafLine, 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(ld)));
      // 金点（拜占特）
      vec2 bc = vec2(tc + per * 0.5, -side * m * 0.26);
      float bd = length(vec2(t, n) - bc) - m * 0.07;
      if (bd < 0.0) { leafCol = goldLeafAt(p, 0.02 * uRes.y, 1.0); leafA = 1.0; }
      leafLine = max(leafLine, 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(bd)));
    }
    c = mix(c, vec3(0.2, 0.14, 0.09), stem * 0.85);
    c = mix(c, leafCol, leafA);
    c = mix(c, vec3(0.15, 0.1, 0.07), leafLine * 0.9);
  }
  // 首字母：左上角压在画框上的方块（金底、蓝字、朱红边）
  float s0 = 0.2;
  vec2 b0 = vec2(m - 0.02, 1.0 - m - s0 + 0.02);
  vec2 bq = (P - b0) / s0;
  if (all(greaterThanEqual(bq, vec2(0.0))) && all(lessThanEqual(bq, vec2(1.0)))) {
    float bw = 0.05;
    vec3 box = goldLeafAt(p, 0.025 * uRes.y, 1.0);
    // 方块里四分的底色：蓝 / 玫瑰红交替，上面一层白色细卷草（用噪声画）
    vec2 qd = step(0.5, bq);
    vec3 under = mod(qd.x + qd.y, 2.0) < 0.5 ? vec3(0.2, 0.32, 0.64) : vec3(0.66, 0.26, 0.32);
    float scroll = 1.0 - smoothstep(0.0, 0.03, abs(fract(length(bq - 0.5) * 9.0 + atan(bq.y - 0.5, bq.x - 0.5) / PI) - 0.5) - 0.42);
    under = mix(under, vec3(0.95, 0.92, 0.85), scroll * 0.6);
    float inner = step(bw, min(min(bq.x, bq.y), min(1.0 - bq.x, 1.0 - bq.y)));
    vec3 cc = mix(box, under, inner);
    vec4 g = texture(tInitial, vec2((bq.x - 0.5) / uInitialAspect * 1.0 + 0.5, bq.y));
    cc = mix(cc, g.rgb, g.a);
    float frame = 1.0 - smoothstep(0.006, 0.014, min(min(bq.x, bq.y), min(1.0 - bq.x, 1.0 - bq.y)));
    cc = mix(cc, vec3(0.15, 0.1, 0.07), frame);
    c = cc;
  }
  oColor = vec4(c, 1.0);
}`;

/* 首字母的字形：Cinzel（罗马碑刻体，已打包的拉丁字体）画成白描边金边的蓝字 */
class Initial {
  texture: THREE.CanvasTexture | null = null;
  aspect = 1;
  private key = '';
  /** 放掉 GPU 纹理（下次 update 重画；收尾 X / 复查 F9） */
  dispose() { this.texture?.dispose(); this.texture = null; this.key = ''; }
  update() {
    if (typeof document === 'undefined') return;
    void loadHudFonts();
    const key = String(hudFontsVersion());
    if (key === this.key && this.texture) return;
    this.key = key;
    const cv = (this.texture?.image as HTMLCanvasElement | undefined) ?? document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.font = '700 200px "GAE Cinzel", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = '#2A1E16'; g.lineWidth = 16; g.strokeText('A', 128, 140);
    g.strokeStyle = '#F4EBD8'; g.lineWidth = 8; g.strokeText('A', 128, 140);
    g.fillStyle = '#2B4DA0'; g.fillText('A', 128, 140);
    if (!this.texture) {
      this.texture = new THREE.CanvasTexture(cv);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.generateMipmaps = false;
    }
    this.texture.needsUpdate = true;
  }
}
const initial = new Initial();

registerFx({
  id: 'p1b-manuscript', stage: 'medium', medium: 'manuscript', frag: MANUSCRIPT,
  uniforms: mediumUniforms({ tBlur: { value: null } }),
  setup: setMedium,
  render(c, out, p) {
    p.uniforms.tBlur.value = c.blur(c.input, 0.8 * unitOf(c));
    p.render(c.renderer, out);
  },
});
registerFx({
  id: 'p1b-manuscript-page', stage: 'afterOverlay', order: 5, frag: PAGE,
  uniforms: mediumUniforms({ tInitial: { value: null }, uInitialAspect: { value: 1 } }),
  active: (v) => str(v, 'surface.medium') === 'manuscript' && bool(v, 'surface.pageFrame'),
  dispose() { initial.dispose(); },
  setup(p, c) {
    setMedium(p, c);
    initial.update();
    p.uniforms.tInitial.value = initial.texture;
  },
});

/* ---------------- 黑绘陶 ---------------- */
const BLACKFIG = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
const vec3 CLAY = vec3(0.8, 0.42, 0.2);
const vec3 GLAZE = vec3(0.07, 0.055, 0.045);
const vec3 PURPLE = vec3(0.43, 0.16, 0.15);
bool isGround(float r) {
  return r == ROLE_sand || r == ROLE_grass || r == ROLE_highland || r == ROLE_snow || r == ROLE_rock || r == ROLE_soil || r == ROLE_path
      || r == ROLE_water || r == ROLE_waterDeep || r == ROLE_cloud || r == ROLE_skyTop || r == ROLE_skyHorizon || r == ROLE_paper;
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 o = texture(tInput, vUv).rgb;
  // 陶土：橙色，有轻微的拉坯横纹与斑点
  vec3 clay = CLAY * (0.94 + 0.08 * fbm(p / (40.0 * U))) * (0.98 + 0.03 * sin(p.y / (3.0 * U) + fbm(p / (90.0 * U)) * 6.0));
  float r = roleAt(tNormal, vUv);
  bool sky = skyAt(vUv);
  bool fig = !sky && !isGround(r);
  // 很暗的地面（深影、夜里）也涂黑，形体更像剪影
  if (!sky && !fig && lum(o) < 0.12) fig = true;
  vec3 c = clay;
  if (fig) {
    // 黑釉：深黑带一点光泽起伏；角色点缀与强调色补涂紫红（黑绘陶的「附加色」）
    c = GLAZE * (0.9 + 0.25 * fbm(p / (25.0 * U)));
    c += vec3(0.05) * smoothstep(0.55, 0.85, lum(o));
    if (r == ROLE_characterAccent || r == ROLE_accent || r == ROLE_roof) c = mix(c, PURPLE, 0.85);
    // 刻线：剪影里面的结构线刮掉釉，露出陶土色细线
    float inc = keyLineW(vUv, 1.4 * U * uScale, 0.35);
    // 剪影外缘不刻（外形就是剪影本身）：只留四周都是剪影的线
    vec2 px2 = 2.5 * U / uRes;
    bool allFig = !isGround(roleAt(tNormal, vUv + vec2(px2.x, 0.0))) && !isGround(roleAt(tNormal, vUv - vec2(px2.x, 0.0)))
               && !isGround(roleAt(tNormal, vUv + vec2(0.0, px2.y))) && !isGround(roleAt(tNormal, vUv - vec2(0.0, px2.y)))
               && !skyAt(vUv + vec2(px2.x, 0.0)) && !skyAt(vUv - vec2(px2.x, 0.0)) && !skyAt(vUv + vec2(0.0, px2.y)) && !skyAt(vUv - vec2(0.0, px2.y));
    if (allFig) c = mix(c, clay * 0.95, smoothstep(0.4, 0.8, inc) * 0.95);
  } else if (!sky) {
    // 地面：陶土上用稀释的釉画一层淡淡的地面带，形体靠剪影交代
    c = mix(clay, clay * 0.86, smoothstep(0.7, 0.2, lum(o)) * 0.5);
  }
  oColor = vec4(mix(o, clamp(c, 0.0, 1.0), uStrength), 1.0);
}`;

/* 瓶身：圆柱弯曲 + 釉光 + 上下回纹带 + 瓶底放射纹 */
const VASE = PRINT_LIB + /* glsl */ `
uniform sampler2D tInput;
const vec3 CLAY = vec3(0.8, 0.42, 0.2);
const vec3 GLAZE = vec3(0.07, 0.055, 0.045);
/* 回纹：5 行 × 6 列一个单元的点阵（第 0 行在下，最高位在左） */
float meander(vec2 q) {
  vec2 cell = floor(q);
  float x = mod(cell.x, 6.0), y = cell.y;
  if (y < 0.0 || y > 4.0) return 0.0;
  int row = y < 0.5 ? 63 : y < 1.5 ? 32 : y < 2.5 ? 46 : y < 3.5 ? 34 : 62;
  return float((row >> int(5.0 - x)) & 1);
}
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float W = asp.x;
  float U = UNIT();
  // 圆柱：画面横向是瓶身的一段弧，越靠两边越被压扁；视点略高，横线向两边微微下弯
  float xs = (vUv.x - 0.5) * 2.0;                   // -1~1
  float k = 0.82;
  float th = asin(clamp(xs * k, -1.0, 1.0));
  float u = th / asin(k) * 0.5 + 0.5;
  float sag = (1.0 - cos(th)) * 0.06;
  float v = vUv.y + sag;
  vec2 suv = vec2(u, v);
  // 图带：上面留回纹带、下面留回纹 + 放射纹
  float top = 0.9, bot = 0.13;
  vec3 c;
  vec2 pp = vec2(u * W, v);                      // 瓶面坐标（画面高为 1）
  if (v > bot && v < top) {
    // 画面压进图带里（上下略缩）
    vec2 iuv = vec2(u, (v - bot) / (top - bot) * 0.88 + 0.06);
    c = texture(tInput, iuv).rgb;
  } else {
    c = CLAY * (0.94 + 0.08 * fbm(pp * uRes.y / (40.0 * U)));
    float lineW = 0.004;
    // 图带上下的双线
    float lines = 0.0;
    for (int i = 0; i < 2; i++) {
      float y0 = i == 0 ? top : bot;
      lines = max(lines, 1.0 - smoothstep(lineW * 0.5, lineW * 0.5 + 0.002, abs(v - y0 - (i == 0 ? 0.006 : -0.006))));
      lines = max(lines, 1.0 - smoothstep(lineW * 0.4, lineW * 0.4 + 0.002, abs(v - y0 - (i == 0 ? 0.058 : -0.058))));
    }
    // 回纹带：图带上方、下方各一条
    float mh = 0.038;
    float ink = 0.0;
    if (v > top + 0.013 && v < top + 0.013 + mh) ink = meander(vec2(pp.x, v - top - 0.013) / (mh / 5.0));
    if (v < bot - 0.013 && v > bot - 0.013 - mh) ink = meander(vec2(pp.x, v - (bot - 0.013 - mh)) / (mh / 5.0));
    // 瓶底：一圈向上的黑色放射纹（尖三角）
    if (v < bot - 0.064) {
      float rh = bot - 0.07;
      float f = fract(pp.x / 0.06);
      float tri = 1.0 - abs(f - 0.5) * 2.0;
      ink = max(ink, step(v, rh * tri));
    }
    // 瓶肩：一圈舌纹（上方）
    if (v > top + 0.064) {
      float f = fract(pp.x / 0.045);
      float tongue = 1.0 - smoothstep(0.38, 0.42, length(vec2(f - 0.5, (v - top - 0.064) / 0.045 * 0.5)));
      ink = max(ink, tongue);
    }
    c = mix(c, GLAZE, max(ink, lines));
  }
  // 圆柱明暗：中间亮、两边暗；一道竖直的釉面高光（偏左）
  float shade = 0.55 + 0.45 * cos(th);
  c *= shade;
  float spec = exp(-pow((xs + 0.32) / 0.07, 2.0)) * 0.22 + exp(-pow((xs + 0.42) / 0.25, 2.0)) * 0.06;
  c += vec3(spec);
  oColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

registerFx({
  id: 'p1b-blackfigure', stage: 'medium', medium: 'blackFigure', frag: BLACKFIG,
  uniforms: mediumUniforms(),
  setup: setMedium,
});
registerFx({
  id: 'p1b-vase', stage: 'afterOverlay', order: 5, frag: VASE,
  uniforms: mediumUniforms(),
  active: (v) => str(v, 'surface.medium') === 'blackFigure' && bool(v, 'surface.pageFrame'),
  setup: setMedium,
});

if (import.meta.hot) import.meta.hot.accept();
