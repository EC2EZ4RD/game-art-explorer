import { ROLE_INDEX } from '../../content/roles';
import { FLOW_LIB, POST_HEAD, POST_LIB } from './postGlsl';

/*
 * 各后处理 pass 的片元着色器。每个 pass 只做一件事，便于单独迁移。
 * 颜色约定：grade 之前是线性 HDR；grade 之后是显示空间（sRGB 编码，0~1）。
 */

const H = POST_HEAD + POST_LIB;
/* 纸张素材（AI 生成）：按画面像素平铺；没选素材时退回程序噪声 fallback */
const PAPER_FN = /* glsl */ `
uniform sampler2D tPaperTex;
uniform float uPaperTexOn;
uniform float uPaperTexScale;
uniform float uPaperTexMean;
uniform float uPaperTexGain;
uniform float uPaperTexColor;
uniform float uPaperTexSat;
vec3 paperSample(vec2 p) { return texture(tPaperTex, p / (1024.0 * uPaperTexScale)).rgb; }
/* 纸面高度 0~1（0.5 ≈ 平均）：灰度纸直接用，彩色纸取亮度起伏并放大 */
float paperHeight(vec2 p, float fallback) {
  if (uPaperTexOn < 0.5) return fallback;
  return clamp(0.5 + (lum(paperSample(p)) - uPaperTexMean) * uPaperTexGain, 0.0, 1.0);
}
/* 纸色：彩色纸（牛皮纸、绢本）用纸本身的颜色（亮度归一到约 0.86，饱和度按纸种收敛），否则用色板纸色 */
vec3 paperColorAt(vec2 p, vec3 pal) {
  if (uPaperTexOn < 0.5 || uPaperTexColor < 0.5) return pal;
  vec3 t = paperSample(p) * (0.86 / max(uPaperTexMean, 0.05));
  return clamp(mix(vec3(lum(t)), t, uPaperTexSat), 0.0, 1.0);
}
`;

/* 色调排线图（与场景着色器同一张图）：tone 0 纸白 ~ 1 最暗，返回纸的比例 */
const TAM_FN = /* glsl */ `
uniform sampler2D tTam1;
uniform sampler2D tTam2;
uniform float uTam;
float tamLevel(vec2 uv, int k) {
  if (k <= 0) return 1.0;
  if (k <= 3) { vec3 a = texture(tTam1, uv).rgb; return k == 1 ? a.r : k == 2 ? a.g : a.b; }
  vec3 b = texture(tTam2, uv).rgb; return k == 4 ? b.r : k == 5 ? b.g : b.b;
}
float tamPaper(vec2 uv, float tone) {
  float x = clamp(tone, 0.0, 1.0) * 6.0;
  int i = int(floor(x));
  return mix(tamLevel(uv, i), tamLevel(uv, min(i + 1, 6)), x - float(i));
}
`;

const roleCode = (r: keyof typeof ROLE_INDEX) => `${ROLE_INDEX[r]}.0`;

/** 角色编号：法线缓冲 alpha × 64 */
const ROLE_FN = /* glsl */ `
float roleAt(sampler2D t, vec2 uv) { return floor(texture(t, uv).a * 64.0); }
bool isAccentRole(float r) { return r == ${roleCode('accent')} || r == ${roleCode('flower')} || r == ${roleCode('interactive')} || r == ${roleCode('characterAccent')}; }
`;

export const BLOOM_PRE = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uThreshold;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  float l = lum(c);
  oColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.35, l), 1.0);
}`;

export const COPY = H + /* glsl */ `
uniform sampler2D tInput;
void main() { oColor = vec4(texture(tInput, vUv).rgb, 1.0); }`;

export const BLUR = H + /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uDir;
void main() {
  vec2 px = uDir / uRes;
  vec3 s = texture(tInput, vUv).rgb * 0.2270;
  s += (texture(tInput, vUv + px * 1.3846).rgb + texture(tInput, vUv - px * 1.3846).rgb) * 0.3162;
  s += (texture(tInput, vUv + px * 3.2308).rgb + texture(tInput, vUv - px * 3.2308).rgb) * 0.0703;
  oColor = vec4(s, 1.0);
}`;

export const GRADE = H + ROLE_FN + /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uExposure;
uniform sampler2D tAdapt;
uniform float uAuto;
uniform float uAEKey;
uniform float uAERange;
uniform int uTonemap;
uniform float uSat;
uniform float uContrast;
uniform float uTemp;
uniform int uGrade;
uniform float uGradeAmt;
uniform sampler2D tNormal;
uniform int uIsolate;
uniform float uIsolateAmt;
bool isCharacterRole(float r) { return r == ${roleCode('character')} || r == ${roleCode('characterAccent')} || r == ${roleCode('skin')} || r == ${roleCode('cloth')}; }
vec3 gradePreset(vec3 c) {
  float l = lum(c);
  if (uGrade == 1) { vec3 t = mix(c * vec3(0.82, 1.0, 1.12), c * vec3(1.15, 1.0, 0.82), smoothstep(0.2, 0.8, l)); return t; }
  if (uGrade == 2) { vec3 g = vec3(l); vec3 b = mix(g, c, 0.45); return (b - 0.5) * 1.25 + 0.5; }
  if (uGrade == 3) return vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
  if (uGrade == 4) { vec3 t = vec3(c.r - (c.g + c.b) * 0.5 + c.r, c.g - (c.r + c.b) * 0.5 + c.g, c.b - (c.r + c.g) * 0.5 + c.b); return mix(c, t, 0.35); }
  if (uGrade == 5) return vec3(smoothstep(0.05, 0.95, c.r), c.g * 1.05, c.b * 0.85 + 0.08);
  if (uGrade == 6) return mix(vec3(l), c, 0.6) * 0.86 + 0.08;
  if (uGrade == 7) return vec3(smoothstep(0.08, 0.92, l));
  return c;
}
const mat3 SRGB_TO_2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 R2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
vec3 agxContrast(vec3 x) { vec3 x2 = x * x; vec3 x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 agx(vec3 color) {
  const mat3 inset = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 outset = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  color = inset * (SRGB_TO_2020 * color);
  color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  color = outset * agxContrast(color);
  color = pow(max(vec3(0.0), color), vec3(2.2));
  return clamp(R2020_TO_SRGB * color, 0.0, 1.0);
}
vec3 neutral(vec3 color) {
  const float start = 0.76; const float desat = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= off;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  float d = 1.0 - start;
  float np = 1.0 - d * d / (peak + d - start);
  color *= np / peak;
  float g = 1.0 - 1.0 / (desat * (peak - np) + 1.0);
  return mix(color, vec3(np), g);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(tScene, vUv).rgb;
  if (uBloom > 0.0) c += texture(tBloom, vUv).rgb * uBloom;
  c *= uExposure;
  if (uAuto > 0.0) {
    // 自动曝光：1×1 纹理里是适应后的对数亮度；离目标差几档就补几档（夹在可补偿范围内），补多少由强度决定
    float adapted = texelFetch(tAdapt, ivec2(0), 0).r;
    float ev = clamp(log2(max(uAEKey, 1e-4)) - adapted, -uAERange, uAERange) * uAuto;
    // 用比较挡住 NaN / 无穷（NaN 与任何数比较都为假）
    if (ev > -16.0 && ev < 16.0) c *= exp2(ev);
  }
  if (uTonemap == 1) c = neutral(c);
  else if (uTonemap == 2) c = aces(c * 0.8);
  else if (uTonemap == 3) c = agx(c);
  else if (uTonemap == 4) c = c / (1.0 + c);
  c = linToSrgb(clamp(c, 0.0, 1.0));
  c = (c - 0.5) * uContrast + 0.5;
  c = mix(vec3(lum(c)), c, uSat);
  c *= vec3(1.0 + uTemp * 0.07, 1.0 + uTemp * 0.01, 1.0 - uTemp * 0.1);
  if (uGrade > 0) c = mix(c, gradePreset(clamp(c, 0.0, 1.0)), uGradeAmt);
  if (uIsolate > 0) {
    // 局部彩色：按颜色角色决定保留哪些颜色
    float r = floor(texture(tNormal, vUv).a * 64.0);
    bool acc = isAccentRole(r) || r == ${roleCode('emissive')};
    bool chr = isCharacterRole(r);
    bool keep = (uIsolate == 1 && acc) || (uIsolate == 2 && chr) || (uIsolate == 3 && (acc || chr));
    if (!keep) c = mix(c, vec3(lum(c)), uIsolateAmt);
  }
  oColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

/**
 * 随距离变化的笔触尺寸（经典与各向异性 Kuwahara 共用）：以镜头注视点为基准，近处笔触变细、远处变粗。
 * 透视相机按"比注视点远几倍"取对数；正交相机物体不随距离缩小，改按深度差占画面高度的比例。
 * 返回尺寸倍数：强度 1 时约 0.6（近）~ 2.4（远）；强度 0 时恰好为 1（与旧画面逐像素一致）。
 */
const STROKE_DEPTH_FN = /* glsl */ `
uniform sampler2D tDepth;
uniform float uStrokeDepth;
uniform float uFocus;
float strokeDepthScale(vec2 uv) {
  if (uStrokeDepth <= 0.0) return 1.0;
  float d = linDepth(texture(tDepth, uv).r);
  float f = max(uFocus, 1e-3);
  float s = uOrtho > 0.5 ? (d - f) / max(uViewHalf.y * 2.0, 1e-3) * 2.0 : log2(max(d, 1e-3) / f);
  return exp2(clamp(s, -1.5, 2.5) * 0.5 * uStrokeDepth);
}
`;

export const KUWAHARA = H + STROKE_DEPTH_FN + /* glsl */ `
uniform sampler2D tInput;
uniform int uRadius;
uniform float uSpread;
void main() {
  vec2 t = uSpread * strokeDepthScale(vUv) / uRes;
  int r = uRadius;
  vec3 m0 = vec3(0), m1 = vec3(0), m2 = vec3(0), m3 = vec3(0);
  vec3 s0 = vec3(0), s1 = vec3(0), s2 = vec3(0), s3 = vec3(0);
  for (int j = 0; j <= r; j++) {
    for (int i = 0; i <= r; i++) {
      vec3 c;
      c = texture(tInput, vUv + vec2(-i, -j) * t).rgb; m0 += c; s0 += c * c;
      c = texture(tInput, vUv + vec2(i, -j) * t).rgb; m1 += c; s1 += c * c;
      c = texture(tInput, vUv + vec2(-i, j) * t).rgb; m2 += c; s2 += c * c;
      c = texture(tInput, vUv + vec2(i, j) * t).rgb; m3 += c; s3 += c * c;
    }
  }
  float n = float((r + 1) * (r + 1));
  m0 /= n; m1 /= n; m2 /= n; m3 /= n;
  vec3 v0 = abs(s0 / n - m0 * m0), v1 = abs(s1 / n - m1 * m1), v2 = abs(s2 / n - m2 * m2), v3 = abs(s3 / n - m3 * m3);
  float w0 = 1.0 / (1.0 + pow((v0.r + v0.g + v0.b) * 300.0, 2.0));
  float w1 = 1.0 / (1.0 + pow((v1.r + v1.g + v1.b) * 300.0, 2.0));
  float w2 = 1.0 / (1.0 + pow((v2.r + v2.g + v2.b) * 300.0, 2.0));
  float w3 = 1.0 / (1.0 + pow((v3.r + v3.g + v3.b) * 300.0, 2.0));
  oColor = vec4((m0 * w0 + m1 * w1 + m2 * w2 + m3 * w3) / (w0 + w1 + w2 + w3), 1.0);
}`;

/**
 * 结构张量（Kyprianidis, Kang, Döllner 2009 §3.1）：Sobel 求调色后颜色的梯度，
 * (E, F, G) = (gx·gx, gx·gy, gy·gy)（RGB 三通道求和）。乘 1000 再存进半精度纹理，避免细微渐变落进半精度的非规格化区；
 * 方向只看比值，整体缩放不影响方向。之后由 BLUR 做两次分离高斯平滑（σ≈2px）。
 * 平坦区（天空、大片平涂）没有可靠的方向：叠一层很弱的低频噪声方向（大致水平、左右摆动），
 * 只给刷痕一个自然起伏的走向；有真实明暗变化的地方它会被盖过。AKF 对弱张量压低各向异性，平坦区的笔刷接近圆形。
 */
export const SST = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uScale;
const float TENSOR_GAIN = 1000.0;
const float FLAT_EPS = 0.002;
void main() {
  vec2 d = 1.0 / uRes;
  vec3 a = texture(tInput, vUv + vec2(-d.x, -d.y)).rgb;
  vec3 b = texture(tInput, vUv + vec2(0.0, -d.y)).rgb;
  vec3 c = texture(tInput, vUv + vec2(d.x, -d.y)).rgb;
  vec3 l = texture(tInput, vUv + vec2(-d.x, 0.0)).rgb;
  vec3 r = texture(tInput, vUv + vec2(d.x, 0.0)).rgb;
  vec3 e = texture(tInput, vUv + vec2(-d.x, d.y)).rgb;
  vec3 f = texture(tInput, vUv + vec2(0.0, d.y)).rgb;
  vec3 g = texture(tInput, vUv + vec2(d.x, d.y)).rgb;
  vec3 gx = (c + 2.0 * r + g - a - 2.0 * l - e) * 0.25;
  vec3 gy = (e + 2.0 * f + g - a - 2.0 * b - c) * 0.25;
  vec3 T = vec3(dot(gx, gx), dot(gx, gy), dot(gy, gy)) * TENSOR_GAIN;
  // 噪声给的是笔触走向（切线）；张量里要加的是与之垂直的"梯度"方向
  float ang = (vnoise(vUv * uRes / (90.0 * uScale)) - 0.5) * 2.4;
  vec2 n = vec2(-sin(ang), cos(ang));
  T += FLAT_EPS * vec3(n.x * n.x, n.x * n.y, n.y * n.y);
  oColor = vec4(T, 1.0);
}`;

/**
 * 各向异性 Kuwahara + 沿流向的笔触纹。
 * 1) 平滑后的结构张量 → 特征分解：切线 t（颜色变化最小的方向，即顺着轮廓/明暗交界）与各向异性
 *    A = (λ1-λ2)/(λ1+λ2+0.05)。分母多加的 0.05 是软下限：真实渐变（每像素 0.02 的缓坡，张量约 1.2）几乎不受影响；
 *    平坦区只剩噪声走向（0.002），A≈0.04，核接近圆形，与论文"平坦区用圆核"一致。
 * 2) 椭圆核：长轴沿 t，半轴 a = r(α+A)/α、b = rα/(α+A)（Kyprianidis 2009 §3.2，α=1）。
 * 3) 8 个平滑重叠扇区的多项式权重：扇区 0 以 +y 为轴，w0 = [(y + ζ) - η x²]²₊，平方项用横向坐标；
 *    其余扇区是它旋转 45° 的倍数（Kyprianidis, Semmo, Kang, Döllner 2010；Blender 合成器同式）。
 *    ζ = 2/r，η = (ζ + cos γ) / sin²γ，γ = 3π/16；乘径向高斯 exp(-π|v|²) 并按 8 个扇区权重之和归一。
 * 4) 扇区选择：w_k = 1 / max(σ_k, 0.02)^q（2011 多尺度版本的单尺度权重，q=8；写成 (0.02/max(σ,0.02))^q，只差常数倍，避免溢出）。
 * 取样在单位圆盘里按网格（每边 uGrid 格，≤6；镜像成对取样，最多 113 次取样）做，再映射到椭圆：
 * 半径变大只是取样变稀，开销不随半径平方增长。
 * 5) 线积分卷积（LIC）：从像素出发沿 t 双向各走 8 步（中点法，每步重新查张量），沿途平均噪声，得到顺着形体走的笔触纹。
 *    噪声钉在屏幕像素上：镜头静止时笔触稳定，镜头移动时笔触相对物体滑动（浴帘效应）。
 *    刷痕粗细随距离按半个倍频程分档、相邻两档交叉淡化：噪声坐标从不乘连续变化的系数，镜头移动时刷痕不会整片翻腾。
 */
export const AKF = H + STROKE_DEPTH_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tTensor;
uniform float uRadius;
uniform int uGrid;
uniform float uAlpha;
uniform float uSharp;
uniform float uScale;
uniform float uFlow;
uniform float uLength;
const float ANISO_FLOOR = 0.05;
vec2 flowDir(vec3 T, out float A) {
  float tr = T.x + T.z;
  float disc = sqrt(max((T.x - T.z) * (T.x - T.z) + 4.0 * T.y * T.y, 0.0));
  float l1 = 0.5 * (tr + disc);
  float l2 = 0.5 * (tr - disc);
  A = clamp((l1 - l2) / (max(l1 + l2, 0.0) + ANISO_FLOOR), 0.0, 1.0);
  vec2 t = vec2(l1 - T.x, -T.y);
  float len = length(t);
  return len > 1e-8 ? t / len : vec2(0.0, 1.0);
}
void acc(inout vec4 m, inout vec3 s, vec3 c, float w) { m += vec4(c * w, w); s += c * c * w; }
float sectorWeight(vec4 m, vec3 s, out vec3 mean) {
  mean = m.rgb / m.w;
  vec3 vr = abs(s / m.w - mean * mean);
  float sd = sqrt(vr.r) + sqrt(vr.g) + sqrt(vr.b);
  return pow(0.02 / max(sd, 0.02), uSharp);
}
float sq(float x) { return x * x; }
float streakNoise(vec2 p, float w) { return vnoise(p / w) * 0.7 + vnoise(p / (w * 0.45) + 17.0) * 0.3; }
void main() {
  vec2 px = 1.0 / uRes;
  float A;
  vec2 t = flowDir(texture(tTensor, vUv).rgb, A);
  vec2 nrm = vec2(-t.y, t.x);
  float ds = strokeDepthScale(vUv);
  float r = clamp(uRadius * uScale * ds, 1.5, 24.0);
  float ea = r * (uAlpha + A) / uAlpha;
  float eb = r * uAlpha / (uAlpha + A);
  // 单位圆盘坐标 (x, y) → 纹理偏移 x·ea·t + y·eb·n
  vec2 ax = t * ea * px;
  vec2 ay = nrm * eb * px;
  float zeta = 2.0 / r;
  float eta = (zeta + 0.8315) / 0.3087;
  vec3 c0 = textureLod(tInput, vUv, 0.0).rgb;
  // 中心像素在 8 个扇区里的权重都是 1/8
  vec4 m0 = vec4(c0 * 0.125, 0.125);
  vec4 m1 = m0, m2 = m0, m3 = m0, m4 = m0, m5 = m0, m6 = m0, m7 = m0;
  vec3 s0 = c0 * c0 * 0.125;
  vec3 s1 = s0, s2 = s0, s3 = s0, s4 = s0, s5 = s0, s6 = s0, s7 = s0;
  float g = float(uGrid);
  for (int j = 0; j <= 6; j++) {
    if (j > uGrid) break;
    for (int i = -6; i <= 6; i++) {
      if (i < -uGrid || i > uGrid || (j == 0 && i <= 0)) continue;
      vec2 v = vec2(float(i), float(j)) / g;
      float r2 = dot(v, v);
      if (r2 > 1.0) continue;
      // poly.x = ζ - η x² 配 ±y 轴上的扇区 0、4；poly.y = ζ - η y² 配 ±x 轴上的扇区 2、6
      vec2 poly = zeta - eta * v * v;
      float w0 = sq(max(0.0, v.y + poly.x));
      float w2 = sq(max(0.0, -v.x + poly.y));
      float w4 = sq(max(0.0, -v.y + poly.x));
      float w6 = sq(max(0.0, v.x + poly.y));
      // 坐标旋转 45° 得到斜向的扇区 1、3、5、7
      vec2 u = 0.70710678 * vec2(v.x - v.y, v.x + v.y);
      vec2 polyR = zeta - eta * u * u;
      float w1 = sq(max(0.0, u.y + polyR.x));
      float w3 = sq(max(0.0, -u.x + polyR.y));
      float w5 = sq(max(0.0, -u.y + polyR.x));
      float w7 = sq(max(0.0, u.x + polyR.y));
      float gw = exp(-3.14159265 * r2) / max(w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7, 1e-6);
      vec2 o = v.x * ax + v.y * ay;
      vec3 cu = textureLod(tInput, vUv + o, 0.0).rgb;
      vec3 cl = textureLod(tInput, vUv - o, 0.0).rgb;
      // 镜像像素 -v 落在相对的扇区（k + 4）
      acc(m0, s0, cu, w0 * gw); acc(m4, s4, cl, w0 * gw);
      acc(m1, s1, cu, w1 * gw); acc(m5, s5, cl, w1 * gw);
      acc(m2, s2, cu, w2 * gw); acc(m6, s6, cl, w2 * gw);
      acc(m3, s3, cu, w3 * gw); acc(m7, s7, cl, w3 * gw);
      acc(m4, s4, cu, w4 * gw); acc(m0, s0, cl, w4 * gw);
      acc(m5, s5, cu, w5 * gw); acc(m1, s1, cl, w5 * gw);
      acc(m6, s6, cu, w6 * gw); acc(m2, s2, cl, w6 * gw);
      acc(m7, s7, cu, w7 * gw); acc(m3, s3, cl, w7 * gw);
    }
  }
  vec3 mean;
  float w;
  vec3 sum = vec3(0.0);
  float ws = 0.0;
  w = sectorWeight(m0, s0, mean); sum += mean * w; ws += w;
  w = sectorWeight(m1, s1, mean); sum += mean * w; ws += w;
  w = sectorWeight(m2, s2, mean); sum += mean * w; ws += w;
  w = sectorWeight(m3, s3, mean); sum += mean * w; ws += w;
  w = sectorWeight(m4, s4, mean); sum += mean * w; ws += w;
  w = sectorWeight(m5, s5, mean); sum += mean * w; ws += w;
  w = sectorWeight(m6, s6, mean); sum += mean * w; ws += w;
  w = sectorWeight(m7, s7, mean); sum += mean * w; ws += w;
  vec3 col = ws > 0.0 ? sum / ws : c0;
  if (uFlow > 0.0) {
    // 刷痕粗细：基准只随"笔触/颗粒尺度"变；距离因子按半个倍频程分档（A 档与粗 √2 倍的 B 档），两档交叉淡化
    float sw0 = max(1.2, 1.4 * uScale);
    float lw = log2(ds) * 2.0;
    float l0 = floor(lw);
    float fw = lw - l0;
    float swA = sw0 * exp2(l0 * 0.5);
    float swB = swA * 1.41421356;
    // 刷痕长度随尺度和距离连续变化：只移动取样位置，不会让噪声翻腾
    float h = clamp(uLength * uScale * ds, 2.0, 64.0) / 16.0;
    vec2 p0 = vUv * uRes;
    float accA = streakNoise(p0, swA);
    float accB = fw > 0.0 ? streakNoise(p0, swB) : 0.0;
    float accW = 1.0;
    for (int side = 0; side < 2; side++) {
      vec2 p = p0;
      vec2 dir = side == 0 ? t : -t;
      for (int k = 1; k <= 8; k++) {
        float A2;
        vec2 tt = flowDir(texture(tTensor, (p + dir * h * 0.5) * px).rgb, A2);
        if (dot(tt, dir) < 0.0) tt = -tt;
        dir = tt;
        p += dir * h;
        float kw = 1.0 - float(k) / 9.0;
        accA += streakNoise(p, swA) * kw;
        if (fw > 0.0) accB += streakNoise(p, swB) * kw;
        accW += kw;
      }
    }
    // 平均后的噪声起伏很小，放大 4 倍再限幅，得到清楚的明暗条纹
    float st = clamp((mix(accA, accB, fw) / accW - 0.5) * 4.0, -1.0, 1.0);
    // 没有明暗走向的平坦区（天空、纯色背景，A≈0）刷痕减到约三成：笔触主要出现在顺着形体的地方，背景不至于满屏旋涡
    col *= 1.0 + st * uFlow * 0.5 * mix(0.3, 1.0, A);
  }
  oColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export const WATERCOLOR = H + PAPER_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform sampler2D tOrig;
uniform float uEdge;
uniform float uBleed;
uniform float uScale;
uniform float uStrength;
uniform vec3 uPaper;
uniform float uWet;
void main() {
  vec2 p = vUv * uRes;
  vec2 n = vec2(fbm(p / (70.0 * uScale)), fbm(p / (70.0 * uScale) + 7.3)) - 0.5;
  vec2 buv = vUv + n * uBleed * 9.0 * uScale / uRes;
  if (uWet > 0.0) {
    // 湿画法（技术补全 P1）：颜色在湿纸上大范围化开——更大尺度的取样扭曲，叠一层细噪声让化开的边缘带羽状毛边
    vec2 q = p / (150.0 * uScale);
    vec2 n2 = vec2(fbm(q + 2.7), fbm(q + 9.1)) - 0.5;
    vec2 n3 = vec2(fbm(p / (10.0 * uScale)), fbm(p / (10.0 * uScale) + 4.2)) - 0.5;
    buv += (n2 * 40.0 + n3 * 14.0) * uWet * uScale / uRes;
  }
  vec3 a = texture(tInput, buv).rgb;
  vec3 b = texture(tBlur, buv).rgb;
  if (uWet > 0.0) a = mix(a, b, 0.6 * uWet);
  float e = clamp(abs(lum(b) - lum(a)) * 7.0, 0.0, 1.0);
  vec3 c = a;
  // 颜料以乘法叠在纸上：亮处透出纸色
  vec3 P = paperColorAt(p, uPaper);
  vec3 pigment = clamp(c / max(uPaper, vec3(0.05)), 0.0, 1.0);
  c = P * mix(vec3(1.0), pigment, 0.92);
  c *= 1.0 - uEdge * e * 0.45;
  if (uWet > 0.0) {
    /*
     * 回流水渍（菜花纹）：未干的颜色里又流进了水，把颜料往外推：水渍内部发淡，边缘颜料堆成一圈深色细线，轮廓像菜花一样分叉。
     * 只出现在有颜料的地方（纸白处没有）。颜料沉积：湿边干透时颜料往边上走，色块边缘内侧积出一道更宽、更不规则的深色。
     */
    vec2 q = p / (200.0 * uScale);
    vec2 wq = q + (vec2(fbm(q * 1.3 + 5.0), fbm(q * 1.3 + 1.0)) - 0.5) * 1.4;
    // 小尺度噪声把水渍边缘打成菜花一样的分叉
    float f = fbm(wq * 2.0) + (fbm(p / (11.0 * uScale)) - 0.5) * 0.24;
    float th = mix(0.76, 0.6, uWet);
    float bloom = smoothstep(th - 0.01, th + 0.015, f);
    float rimB = bloom * (1.0 - smoothstep(0.0, 0.05, f - th));
    float pig = smoothstep(0.04, 0.25, 1.0 - lum(pigment));
    // 水渍内部：颜料被推开，越往里越淡（但不是纸白）；边缘被推过去的颜料堆成一圈深色的波浪细线
    float inner = mix(0.85, 0.55, smoothstep(0.0, 0.15, f - th));
    c = mix(c, P * mix(vec3(1.0), pigment, inner), bloom * pig * 0.75 * uWet);
    c *= 1.0 - rimB * pig * 0.6 * uWet;
    // 颜料沉积：色块边缘内侧积出一道不规则的深色
    float pool = clamp((lum(b) - lum(a)) * 6.0, 0.0, 1.0) * (0.5 + fbm(p / (20.0 * uScale)));
    c *= 1.0 - pool * 0.35 * uWet;
  }
  // 颗粒：颜料积在纸纹低处（选了水彩纸素材时就是真实的纸纹起伏）
  float grainH = paperHeight(p, fbm(p / (2.2 * uScale)));
  c *= 1.0 - (1.0 - grainH) * 0.28 * (1.0 - lum(c)) * (0.5 + uEdge * 0.5);
  // 色层浓淡起伏
  c *= 0.93 + 0.1 * fbm(p / (120.0 * uScale) + 3.1);
  oColor = vec4(mix(texture(tOrig, vUv).rgb, c, uStrength), 1.0);
}`;

export const GOUACHE = H + PAPER_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tOrig;
uniform float uLevels;
uniform float uScale;
uniform float uStrength;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  vec3 lab = toOklab(srgbToLin(c));
  float q = max(uLevels, 2.0);
  lab.x = (floor(lab.x * q) + smoothstep(0.35, 0.65, fract(lab.x * q))) / q;
  c = linToSrgb(fromOklab(lab));
  vec2 p = vUv * uRes;
  c *= 0.95 + 0.07 * paperHeight(p, fbm(p / (1.6 * uScale)));
  oColor = vec4(mix(texture(tOrig, vUv).rgb, c, uStrength), 1.0);
}`;

export const OIL = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tOrig;
uniform float uImpasto;
uniform float uScale;
uniform float uStrength;
// 1 = 输入已带顺着形体的刷痕（各向异性 Kuwahara + 刷痕纹理）：去掉固定竖直的鬃毛纹，免得出现两种方向的笔触
uniform float uFlowOn;
void main() {
  vec2 px = 1.0 / uRes;
  vec3 c = texture(tInput, vUv).rgb;
  float hL = lum(texture(tInput, vUv - vec2(px.x, 0)).rgb), hR = lum(texture(tInput, vUv + vec2(px.x, 0)).rgb);
  float hD = lum(texture(tInput, vUv - vec2(0, px.y)).rgb), hU = lum(texture(tInput, vUv + vec2(0, px.y)).rgb);
  vec2 p = vUv * uRes;
  float bristle = vnoise(vec2(p.x / (1.2 * uScale), p.y / (9.0 * uScale)));
  vec3 n = normalize(vec3((hL - hR) * 6.0 + (bristle - 0.5) * 0.4 * (1.0 - uFlowOn), (hD - hU) * 6.0, 1.0));
  float light = dot(n, normalize(vec3(-0.5, 0.6, 0.65)));
  c *= mix(1.0, 0.75 + 0.45 * light, uImpasto);
  float canvas = (sin(p.x * 1.6 / uScale) * sin(p.y * 1.6 / uScale)) * 0.5 + 0.5;
  c *= 0.96 + 0.05 * canvas;
  oColor = vec4(mix(texture(tOrig, vUv).rgb, c, uStrength), 1.0);
}`;

export const INK = H + ROLE_FN + PAPER_FN + FLOW_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform float uLevels;
uniform float uEdge;
uniform float uBleed;
uniform float uScale;
uniform float uStrength;
uniform float uKeepAccent;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform float uPomo;
uniform float uFeibai;
/* 飞白的丝：沿笔画方向很长、横向很细的噪声（d 是分档后的梯度方向，噪声坐标全局连续） */
float feibaiStreak(vec2 p, vec2 d) {
  vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
  return vnoise(vec2(q.x / (1.3 * uScale), q.y / (70.0 * uScale))) * 0.7 + vnoise(vec2(q.x / (0.7 * uScale), q.y / (26.0 * uScale)) + 9.3) * 0.3;
}
void main() {
  vec2 p = vUv * uRes;
  vec2 n = vec2(fbm(p / (45.0 * uScale)), fbm(p / (45.0 * uScale) + 5.1)) - 0.5;
  // 宣纸：墨顺着纤维渗（纸纹的梯度方向），纤维处吸墨更多
  float ph = paperHeight(p, 0.5);
  if (uPaperTexOn > 0.5) n += vec2(paperHeight(p + vec2(2.0, 0.0), 0.5) - paperHeight(p - vec2(2.0, 0.0), 0.5),
                                   paperHeight(p + vec2(0.0, 2.0), 0.5) - paperHeight(p - vec2(0.0, 2.0), 0.5)) * 1.2;
  vec2 buv = vUv + n * uBleed * 7.0 * uScale / uRes;
  vec3 o = texture(tInput, buv).rgb;
  vec3 b = texture(tBlur, buv).rgb;
  float d = 1.0 - lum(o);
  float db = 1.0 - lum(b);
  float q = max(uLevels, 2.0);
  float lv = floor(d * q + 0.35) / q;
  lv = mix(lv, d, 0.25);
  // 晕染：墨向外渗出淡晕
  lv = max(lv, db * 0.55 * uBleed);
  // 边缘积墨 + 干笔
  float e = clamp((d - db) * 5.0, 0.0, 1.0);
  float dry = smoothstep(0.35, 0.75, vnoise(vec2(p.x / (3.0 * uScale), p.y / (26.0 * uScale))));
  lv = clamp(lv + e * uEdge * 0.5 * (0.5 + dry * 0.5), 0.0, 1.0);
  if (uPomo > 0.0) {
    /*
     * 泼墨（技术补全 P1）：大块不规则的墨池，跟着画面里暗的大块形体（模糊后的暗度）走，再被低频噪声推出意外的形状；
     * 池内浓淡起伏，池边积墨发暗、带毛边，池外一圈淡墨渗化。
     */
    vec2 q = p / (220.0 * uScale);
    vec2 wq = q + (vec2(fbm(q * 1.7 + 3.1), fbm(q * 1.7 + 8.4)) - 0.5) * 2.2;
    float field = db * 1.35 + (fbm(wq * 2.0) - 0.5) * 1.5 + (fbm(p / (6.0 * uScale)) - 0.5) * 0.16;
    float th = mix(1.05, 0.38, uPomo);
    float pool = smoothstep(th - 0.02, th + 0.02, field);
    float rim = pool * (1.0 - smoothstep(0.0, 0.07, field - th));
    // 池内浓淡：大块的浓墨里有一片片稍淡的"墨韵"
    float inner = 0.62 + 0.38 * smoothstep(0.35, 0.7, fbm(wq * 3.5 + 1.7));
    lv = max(lv, pool * inner);
    lv = clamp(lv + rim * 0.3, 0.0, 1.0);
    float halo = smoothstep(th - 0.2, th - 0.02, field) * (1.0 - pool);
    lv = max(lv, halo * (0.15 + 0.22 * fbm(p / (16.0 * uScale))) * uPomo);
  }
  if (uFeibai > 0.0) {
    /*
     * 飞白（技术补全 P1）：笔走得快、墨不够时，浓墨笔画里露出一道道顺着行笔方向的白丝。
     * 行笔方向 = 模糊图亮度梯度的垂直方向（笔画顺着形体轮廓走），按 π/8 分档（FLOW_LIB.flowBins）；梯度太弱处退回竖向笔势。
     * 越浓的笔画、越靠近笔画边缘，白丝越多。
     */
    vec2 o3 = vec2(3.0 * uScale) / uRes;
    vec2 gr = vec2(lum(texture(tBlur, vUv + vec2(o3.x, 0.0)).rgb) - lum(texture(tBlur, vUv - vec2(o3.x, 0.0)).rgb),
                   lum(texture(tBlur, vUv + vec2(0.0, o3.y)).rgb) - lum(texture(tBlur, vUv - vec2(0.0, o3.y)).rgb));
    float gl = length(gr);
    vec2 gd = gl > 1e-5 ? gr / gl : vec2(1.0, 0.0);
    if (dot(gd, vec2(1.0, 0.0)) < 0.0) gd = -gd;
    gd = normalize(mix(vec2(1.0, 0.0), gd, smoothstep(0.004, 0.03, gl)));
    vec2 d0, d1;
    float wb;
    flowBins(gd, d0, d1, wb);
    float st = mix(feibaiStreak(p, d0), feibaiStreak(p, d1), wb);
    // 飞白长在浓墨笔画里、尤其是笔画边缘（干笔扫过的地方）；大片淡墨里很少
    float mask = smoothstep(0.35, 0.72, lv) * mix(0.3, 1.0, e);
    float gap = smoothstep(0.52, 0.7, st) * mask * uFeibai;
    lv *= 1.0 - gap * 0.88;
  }
  if (uPaperTexOn > 0.5) lv = clamp(lv * (0.8 + 0.4 * (1.0 - ph)), 0.0, 1.0);
  vec3 c = mix(paperColorAt(p, uPaper), uInk, lv * 0.95);
  c *= uPaperTexOn > 0.5 ? 1.0 + 0.12 * (ph - 0.5) : 0.95 + 0.06 * fbm(p / 2.5);
  float role = roleAt(tNormal, vUv);
  if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, texture(tInput, vUv).rgb, 0.85);
  oColor = vec4(mix(texture(tInput, vUv).rgb, c, uStrength), 1.0);
}`;

export const GONGBI = H + PAPER_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tBlur;
uniform float uEdge;
uniform float uScale;
uniform float uStrength;
uniform vec3 uPaper;
uniform float uGlaze;
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  vec3 b = texture(tBlur, vUv).rgb;
  // 淡彩：透明薄色叠在绢上
  vec3 wash = paperColorAt(p, uPaper) * mix(vec3(1.0), clamp(o / max(uPaper, vec3(0.05)), 0.0, 1.0), 0.62);
  wash = mix(vec3(lum(wash)), wash, 0.85);
  // 分染近似：靠近形体边界处颜色加深
  float e = clamp((lum(b) - lum(o)) * 6.0, 0.0, 1.0);
  wash *= 1.0 - e * 0.22 * uEdge;
  if (uGlaze > 0.0) {
    /*
     * 罩染（技术补全 P1）：先平涂一遍底色，再用同一种颜色薄薄地罩好几遍，每一遍的范围往暗处收一点。
     * 颜色越罩越深、越饱和；每一遍的边缘留下一道淡淡的积色，形体里出现几级柔和的色阶；最后整幅通罩一层淡赭石把颜色统一起来。
     */
    vec3 T = clamp(o / max(uPaper, vec3(0.05)), 0.0, 1.0);
    T = clamp(mix(vec3(lum(T)), T, 1.3), 0.0, 1.0);
    float dk = 1.0 - lum(mix(o, b, 0.5));
    float nz = fbm(p / (85.0 * uScale)) - 0.5;
    vec3 g = paperColorAt(p, uPaper) * mix(vec3(1.0), pow(T, vec3(0.45)), 0.9);
    for (int k = 0; k < 3; k++) {
      float th = 0.2 + 0.17 * float(k) + nz * 0.1;
      float m = smoothstep(th - 0.035, th + 0.035, dk);
      float rim = m * (1.0 - smoothstep(0.0, 0.05, dk - th));
      g *= mix(vec3(1.0), pow(T, vec3(0.38)), m);
      g *= 1.0 - rim * 0.07;
    }
    g *= mix(vec3(1.0), vec3(0.98, 0.93, 0.83), 0.7);
    wash = mix(wash, g, uGlaze);
  }
  // 绢纹
  if (uPaperTexOn > 0.5) wash *= 1.0 + 0.1 * (paperHeight(p, 0.5) - 0.5);
  else {
    float weave = (sin(p.x * 2.4 / uScale) * 0.5 + 0.5) * (sin(p.y * 2.4 / uScale) * 0.5 + 0.5);
    wash *= 0.965 + 0.035 * weave + 0.03 * (fbm(p / 3.0) - 0.5);
  }
  oColor = vec4(mix(o, wash, uStrength), 1.0);
}`;

export const HATCH_POST = H + ROLE_FN + PAPER_FN + TAM_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform float uScale;
uniform float uStrength;
uniform float uKeepAccent;
uniform int uMode;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform int uHatchColor;
float hl(vec2 p, float ang, float spacing, float width) {
  vec2 d = vec2(cos(ang), sin(ang));
  float v = dot(p, d) / spacing + vnoise(p * 0.05) * 0.6;
  return 1.0 - smoothstep(width, width + 0.2, abs(fract(v) - 0.5) * 2.0);
}
/* 彩色排线（技术补全 P1，surface.hatchColor）：颜色以"透光率"一层层乘在纸上，像彩铅 / 彩色墨水一层层排上去 */
vec3 hatchT(vec3 col, vec3 P) { return clamp(col / max(P, vec3(0.05)), 0.0, 1.0); }
/* 在 OKLab 里调颜色：明度 × k，彩度 × s，再把色相往 dab 推 */
vec3 hatchTone(vec3 c, float k, float s, vec2 dab) {
  vec3 lab = toOklab(srgbToLin(c));
  lab.x *= k;
  lab.yz = lab.yz * s + dab;
  return clamp(linToSrgb(fromOklab(lab)), 0.0, 1.0);
}
/*
 * 1 = 彩铅：每层排线用物体本身的颜色（逐层加深加艳），最暗一层掺墨色；纸上先轻轻铺一层本色。
 * 2 = 多色叠加：亮层本色、中间调一层冷色（蓝紫）、暗部一层暖褐，各层角度不同，交叠处颜色相乘变深——彩色插画里常见的分色排线。
 * 色调排线图（tam）打开时每层的笔画取自色调排线图（各层转不同角度），否则用程序直线。
 */
vec3 colorHatch(vec2 p, vec3 o, vec3 P, float sp) {
  float l = lum(o);
  bool soft = uMode == 0;
  vec3 c = P * mix(vec3(1.0), hatchT(o, P), soft ? 0.32 : 0.22);
  vec3 c1, c2, c3;
  if (uHatchColor == 1) {
    c1 = hatchTone(o, 0.95, 1.35, vec2(0.0));
    c2 = hatchTone(o, 0.72, 1.45, vec2(0.0));
    c3 = mix(uInk, hatchTone(o, 0.45, 1.2, vec2(0.0)), 0.45);
  } else {
    c1 = hatchTone(o, 0.98, 1.4, vec2(0.0));
    c2 = hatchTone(o, 0.72, 0.35, vec2(-0.015, -0.085));
    c3 = hatchTone(mix(o, vec3(0.45, 0.28, 0.16), 0.6), 0.55, 1.0, vec2(0.02, 0.03));
  }
  float i1, i2, i3;
  if (uTam > 0.5) {
    mat2 r1 = mat2(0.7071, -0.7071, 0.7071, 0.7071), r2 = mat2(0.7071, 0.7071, -0.7071, 0.7071), r3 = mat2(0.966, -0.259, 0.259, 0.966);
    i1 = 1.0 - tamPaper(r1 * p / (512.0 * uScale), smoothstep(0.92, 0.35, l) * 0.6);
    i2 = 1.0 - tamPaper(r2 * p / (512.0 * uScale) + 0.37, smoothstep(0.7, 0.15, l) * 0.75);
    i3 = 1.0 - tamPaper(r3 * p / (512.0 * uScale) + 0.71, smoothstep(0.4, 0.05, l) * 0.8);
  } else {
    float w = soft ? 0.2 : 0.15;
    i1 = hl(p, 0.9, sp, w) * (1.0 - smoothstep(0.6, 0.88, l));
    i2 = hl(p, -0.5, sp * 1.1, w * 0.9) * (1.0 - smoothstep(0.32, 0.62, l));
    i3 = hl(p, 0.15, sp * 0.9, w * 0.85) * (1.0 - smoothstep(0.1, 0.36, l));
  }
  float a = soft ? 0.75 : 0.95;
  c *= mix(vec3(1.0), hatchT(c1, P), i1 * a);
  c *= mix(vec3(1.0), hatchT(c2, P), i2 * a);
  c *= mix(vec3(1.0), hatchT(c3, P), i3 * a);
  return c * (uPaperTexOn > 0.5 ? 1.0 + 0.12 * (paperHeight(p, 0.5) - 0.5) : 0.95 + 0.06 * fbm(p / 1.8));
}
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  float l = lum(o);
  float sp = 5.0 * uScale;
  float ink = 0.0;
  vec3 P = paperColorAt(p, uPaper);
  if (uHatchColor > 0) { oColor = vec4(mix(o, colorHatch(p, o, P, sp), uStrength), 1.0); return; }
  // 色调排线图：素描沿 50° 铺、只到中等暗度；钢笔排线沿 45° 铺满全部 6 级
  vec2 tuv = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p / (512.0 * uScale);
  if (uTam > 0.5 && uMode == 0) {
    ink = 1.0 - tamPaper(tuv, smoothstep(0.85, 0.15, l) * 0.75);
    vec3 c = mix(P, vec3(l) * P, 0.55);
    c = mix(c, uInk * 0.6 + P * 0.15, ink * 0.7);
    c *= 1.0 + 0.12 * (paperHeight(p, 0.5 + 0.58 * (fbm(p / 1.8) - 0.5)) - 0.5);
    float role = roleAt(tNormal, vUv);
    if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, o, 0.7);
    oColor = vec4(mix(o, c, uStrength), 1.0);
    return;
  }
  if (uTam > 0.5) {
    ink = 1.0 - tamPaper(tuv, smoothstep(0.76, 0.08, l));
    vec3 c = mix(P, uInk, ink);
    if (uPaperTexOn > 0.5) c *= 1.0 + 0.1 * (paperHeight(p, 0.5) - 0.5);
    float role = roleAt(tNormal, vUv);
    if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, o, 0.75);
    oColor = vec4(mix(o, c, uStrength), 1.0);
    return;
  }
  if (uMode == 0) {
    // 铅笔：灰度底 + 稀疏排线
    ink = max(ink, hl(p, 0.9, sp, 0.18) * (1.0 - smoothstep(0.45, 0.75, l)));
    ink = max(ink, hl(p, -0.5, sp * 1.1, 0.16) * (1.0 - smoothstep(0.2, 0.45, l)));
    vec3 c = mix(P, vec3(l) * P, 0.55);
    c = mix(c, uInk * 0.6 + P * 0.15, ink * 0.55);
    c *= uPaperTexOn > 0.5 ? 1.0 + 0.12 * (paperHeight(p, 0.5) - 0.5) : 0.94 + 0.07 * fbm(p / 1.8);
    float role = roleAt(tNormal, vUv);
    if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, o, 0.7);
    oColor = vec4(mix(o, c, uStrength), 1.0);
    return;
  }
  // 钢笔交叉排线
  if (l < 0.82) ink = max(ink, hl(p, 0.785, sp, 0.14));
  if (l < 0.6) ink = max(ink, hl(p, -0.785, sp, 0.14));
  if (l < 0.4) ink = max(ink, hl(p, 0.0, sp * 0.8, 0.16));
  if (l < 0.2) ink = max(ink, hl(p, 1.57, sp * 0.7, 0.22));
  vec3 c = mix(P, uInk, ink);
  if (uPaperTexOn > 0.5) c *= 1.0 + 0.1 * (paperHeight(p, 0.5) - 0.5);
  float role = roleAt(tNormal, vUv);
  if (uKeepAccent > 0.5 && isAccentRole(role)) c = mix(c, o, 0.75);
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

export const HALFTONE = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uScale;
uniform float uStrength;
uniform vec3 uInk;
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  float s = 6.0 * uScale;
  mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 q = rot * p / s;
  vec2 cell = floor(q) + 0.5;
  vec2 cuv = (transpose(rot) * (cell * s)) / uRes;
  float l = lum(texture(tInput, cuv).rgb);
  float r = sqrt(clamp(1.0 - l * 1.15, 0.0, 1.0)) * 0.62;
  float dot_ = 1.0 - smoothstep(r - 0.06, r + 0.06, length(q - cell));
  // 色块：亮部提亮压平，暗部铺网点
  vec3 flatc = mix(o, vec3(1.0), 0.15);
  vec3 c = mix(flatc, uInk, dot_ * 0.88);
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

/*
 * 木刻。刻纹走向（surface.cutFlow，技术补全 P1）：0 = 原来的固定斜向 + 噪声扭动（逐像素不变）；
 * 1 = 沿形体：一组斜切平面与表面的交线（相位 = 屏幕坐标与线性深度的组合），平面上是直刻纹、曲面上随形弯，全画面连续。
 */
export const WOODCUT = H + ROLE_FN + FLOW_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform float uScale;
uniform float uStrength;
uniform float uKeepAccent;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform int uCutFlow;
uniform float uFocus;
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  float l = clamp((lum(o) - 0.5) * 1.7 + 0.42, 0.0, 1.0);
  float ink;
  if (uCutFlow == 1) {
    // 斜切平面与表面的交线：φ = (屏幕坐标·g·cos α + 线性深度·sin α) / 周期，平面上是直刻纹、曲面上随形弯；
    // 线距按 2 的整数次幂分档，两档各自二值化后在很窄的过渡带里切换（斜面上刻纹变密时隔一刀去一刀，平面上只用一档、不出粗细相间）
    float raw = texture(tDepth, vUv).r;
    vec3 n = texture(tNormal, vUv).xyz * 2.0 - 1.0;
    if (raw > 0.99999 || n.z < 0.02) n = vec3(0.0, 0.0, 1.0);
    vec2 dz = clamp(n.xy / max(n.z, 0.06), vec2(-16.0), vec2(16.0));
    vec2 g = vec2(0.3624, 0.932);
    float ca = 0.825, sa = 0.565;
    float period = 10.4 * uScale;
    float ph = (dot(p, g) * ca + flowDepthPx(linDepth(raw), uFocus) * sa) / period + fbm(p / (60.0 * uScale)) * 0.25;
    float lm = log2(max(length(g * ca + dz * sa), 1e-3));
    float k = floor(lm);
    float f = smoothstep(0.35, 0.65, lm - k);
    // 用 -cos：刻纹（波谷）落在整数相位，k+1 档的刻纹正好是 k 档的隔一刀
    float va = -cos(6.2831853 * ph * exp2(-k));
    float vb = -cos(6.2831853 * ph * exp2(-k - 1.0));
    float ia = 1.0 - smoothstep(0.47, 0.53, l * 1.1 + va * 0.22);
    float ib = 1.0 - smoothstep(0.47, 0.53, l * 1.1 + vb * 0.22);
    ink = mix(ia, ib, f);
  } else {
    float flow = fbm(p / (60.0 * uScale)) * 6.0;
    float v = sin((p.x * 0.35 + p.y * 0.9) / (1.6 * uScale) + flow);
    float t = l * 1.1 + v * 0.22;
    ink = 1.0 - smoothstep(0.47, 0.53, t);
  }
  vec3 c = mix(uPaper, uInk, ink);
  c *= 0.96 + 0.05 * fbm(p / 2.0);
  float role = roleAt(tNormal, vUv);
  if (uKeepAccent > 0.5 && isAccentRole(role) && ink < 0.5) c = mix(c, o, 0.8);
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

export const POSTERIZE = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uLevels;
uniform float uStrength;
void main() {
  vec3 o = texture(tInput, vUv).rgb;
  vec3 lab = toOklab(srgbToLin(o));
  float q = max(uLevels, 2.0);
  lab.x = floor(lab.x * q + 0.5) / q;
  lab.yz = floor(lab.yz * q * 4.0 + 0.5) / (q * 4.0);
  vec3 c = linToSrgb(fromOklab(lab));
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

export const RISO = H + /* glsl */ `
uniform sampler2D tInput;
uniform vec3 uInk1;
uniform vec3 uInk2;
uniform vec3 uInk3;
uniform int uInkCount;
uniform vec3 uPaper;
uniform float uScale;
uniform float uStrength;
vec3 layer(vec3 base, vec3 ink, float d) { return base * mix(vec3(1.0), ink / max(uPaper, vec3(0.05)), d); }
void main() {
  vec2 p = vUv * uRes;
  vec3 o = texture(tInput, vUv).rgb;
  vec2 off = vec2(1.5, -1.0) * uScale / uRes;
  vec3 o2 = texture(tInput, vUv + off).rgb;
  vec3 o3 = texture(tInput, vUv - off * 0.7).rgb;
  float best = 1e9; vec3 bc = uPaper;
  float grain = hash12(floor(p / max(uScale, 1.0)));
  // 在每种油墨的 5 级浓度里找最接近原色的组合
  for (int a = 0; a < 5; a++) {
    for (int b = 0; b < 5; b++) {
      for (int k = 0; k < 5; k++) {
        if (uInkCount < 3 && k > 0) break;
        vec3 c = layer(layer(layer(uPaper, uInk1, float(a) / 4.0), uInk2, float(b) / 4.0), uInk3, float(k) / 4.0);
        vec3 dd = c - o;
        float dist = dot(dd, dd);
        if (dist < best) { best = dist; bc = vec3(float(a), float(b), float(k)) / 4.0; }
      }
    }
  }
  // 套版错位：第二、三色用偏移后的取样重新估计浓度（近似）
  float d2 = clamp(bc.y + (lum(o) - lum(o2)) * 1.5, 0.0, 1.0);
  float d3 = clamp(bc.z + (lum(o) - lum(o3)) * 1.5, 0.0, 1.0);
  vec3 c = layer(layer(layer(uPaper, uInk1, step(grain * 0.9, bc.x)), uInk2, step(grain * 0.9, d2)), uInk3, step(grain * 0.9, d3) * (uInkCount > 2 ? 1.0 : 0.0));
  c = mix(c, layer(layer(uPaper, uInk1, bc.x), uInk2, d2), 0.5);
  oColor = vec4(mix(o, c, uStrength), 1.0);
}`;

export const STAINED = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uScale;
uniform float uStrength;
uniform vec3 uInk;
void main() {
  vec2 p = vUv * uRes / (22.0 * uScale);
  vec2 ip = floor(p);
  float f1 = 9.0, f2 = 9.0; vec2 c1 = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = ip + vec2(i, j);
    vec2 s = g + hash22(g) * 0.85 + 0.075;
    float d = length(p - s);
    if (d < f1) { f2 = f1; f1 = d; c1 = s; } else if (d < f2) f2 = d;
  }
  vec3 col = texture(tInput, c1 * 22.0 * uScale / uRes).rgb;
  col = mix(vec3(lum(col)), col, 1.35) * 1.08;
  float lead = 1.0 - smoothstep(0.05, 0.11, f2 - f1);
  vec3 c = mix(col, uInk, lead);
  oColor = vec4(mix(texture(tInput, vUv).rgb, c, uStrength), 1.0);
}`;

export const MOSAIC = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uScale;
uniform float uStrength;
uniform vec3 uPaper;
void main() {
  float s = 9.0 * uScale;
  vec2 p = vUv * uRes;
  vec2 cell = floor(p / s);
  vec2 f = fract(p / s);
  vec3 col = texture(tInput, (cell + 0.5) * s / uRes).rgb;
  col *= 0.92 + 0.16 * hash12(cell);
  float grout = 1.0 - step(0.09, f.x) * step(0.09, f.y) * step(f.x, 0.95) * step(f.y, 0.95);
  vec3 c = mix(col, uPaper * 0.55, grout);
  oColor = vec4(mix(texture(tInput, vUv).rgb, c, uStrength), 1.0);
}`;

export const ASCII = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tGlyphs;
uniform float uScale;
uniform float uStrength;
uniform float uGlyphCount;
void main() {
  float s = 8.0 * uScale;
  vec2 p = vUv * uRes;
  vec2 cell = floor(p / s);
  vec2 f = fract(p / s);
  vec3 col = texture(tInput, (cell + 0.5) * s / uRes).rgb;
  float l = lum(col);
  float gi = floor(clamp(l, 0.0, 0.999) * uGlyphCount);
  float g = texture(tGlyphs, vec2((gi + f.x) / uGlyphCount, f.y)).r;
  vec3 c = col * g * 1.25;
  oColor = vec4(mix(texture(tInput, vUv).rgb, c, uStrength), 1.0);
}`;

export const EDGES = H + FLOW_LIB + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform int uMode;
uniform float uWidth;
uniform float uThreshold;
uniform float uFade;
uniform float uBoil;
uniform float uWobble;
uniform int uColorMode;
uniform vec3 uInk;
uniform vec3 uLight;
uniform int uWeightStyle;
uniform float uWeightVar;
uniform float uFocus;
uniform sampler2D tEdgeMask;
float gDepthE = 0.0;
/*
 * 深度边的掠射角判别（技术补全 P1 · 应 K 的要求，2026-10-23）：
 * 原来按"相邻像素的相对深度差"判，低机位看平地时每一行都超阈值，像素化配方在地平线下画出一整条墨色带。
 * 现在相对深度差照旧，但"本像素与邻居在同一个平面上"时不算边：平面上透视的 1/线性深度（正交的线性深度）在屏幕上是线性的，
 * 二阶差 ≈ 0，且两边法线一样。只用二阶差会漏掉曲面的轮廓（球的边缘本身就在急速变深，刚好和背后物体的深度接上），
 * 所以要两个条件同时成立才压掉：真正的轮廓（法线不同，或一侧跳变）照旧画。
 */
float depthCurv(vec2 uv, vec2 o, float dC) {
  float a = linDepth(texture(tDepth, uv + o).r), b = linDepth(texture(tDepth, uv - o).r);
  if (uOrtho > 0.5) return abs(a + b - 2.0 * dC) / max(dC, 1e-3);
  float ic = 1.0 / max(dC, 1e-4);
  return abs(1.0 / max(a, 1e-4) + 1.0 / max(b, 1e-4) - 2.0 * ic) / ic;
}
float edgeAt(vec2 uv, vec2 px, float dC, vec3 nC, float rC, float curv) {
  float dn = linDepth(texture(tDepth, uv).r);
  vec4 nt = texture(tNormal, uv);
  vec3 nN = nt.xyz * 2.0 - 1.0;
  float rN = floor(nt.a * 64.0);
  float tD = mix(0.09, 0.006, uThreshold);
  float tN = mix(0.55, 0.04, uThreshold);
  float e = 0.0;
  if ((uMode & 1) != 0) {
    float de = smoothstep(tD, tD * 1.6, abs(dn - dC) / max(min(dn, dC), 0.001));
    // 同一平面（二阶差小、法线相同）上的大深度差是掠射角，不是轮廓
    float plane = (1.0 - smoothstep(tD * 0.5, tD, curv)) * (1.0 - smoothstep(0.02, 0.08, 1.0 - dot(nC, nN)));
    de *= 1.0 - plane;
    e = max(e, de);
    gDepthE = max(gDepthE, de);
  }
  if ((uMode & 2) != 0 && rN > 0.5 && rC > 0.5) e = max(e, smoothstep(tN, tN * 1.5, 1.0 - dot(nC, nN)));
  if ((uMode & 4) != 0 && abs(rN - rC) > 0.5) e = 1.0;
  return e;
}
/*
 * 泥金描线（技术补全 P1）：金粉调胶勾的线。暗金底色，线所在表面朝向光的地方亮起，正对半程向量处有一道高光，
 * 再撒细碎的金粉闪点（只在朝光的一侧）。法线取线落在的那个表面，所以同一条线顺着形体有明暗变化。
 */
vec3 goldLine(vec3 n, vec2 p) {
  vec3 L = normalize(vec3(-0.45, 0.62, 0.64));
  float ndl = dot(n, L);
  float tone = clamp(0.42 + 0.5 * ndl, 0.0, 1.0);
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 14.0);
  vec3 c = mix(vec3(0.36, 0.23, 0.06), vec3(0.78, 0.57, 0.2), smoothstep(0.05, 0.75, tone));
  c = mix(c, vec3(1.0, 0.9, 0.58), clamp(smoothstep(0.7, 1.0, tone) * 0.55 + spec * 0.9, 0.0, 1.0));
  float spark = step(0.9, hash12(floor(p / 1.6))) * smoothstep(0.35, 0.8, tone);
  return min(c + spark * vec3(0.35, 0.3, 0.18), vec3(1.0));
}
/*
 * 线的提按（技术补全 P1）：在本像素周围半径 R 的圆盘里逐个纹素比较（深度按本像素所在平面外推后比，斜面不误检），
 * 找出"和本像素不在同一块"的最近纹素，按种类分开记距离；再按"这里的线该多粗"换成覆盖率：
 * 外轮廓（深度跳变，线压在靠前的物体一侧）最重、部件分界次之、形体折线最轻；暗部加粗、远处变细；
 * 手绘压力 = 沿线缓慢起伏的噪声；毛笔按线的走向分粗细（竖粗横细，笔锋略斜）。
 * 用距离取覆盖率：线边自带抗锯齿，端头是圆的。uWeightStyle = 0 时不走这里（原来的固定线宽，逐像素不变）。
 */
float covAt(float d, float hw) { return clamp(hw - d + 0.5, 0.0, 1.0); }
void mainWeighted(vec2 uv, vec2 px, float dC, vec3 nC, float rC) {
  vec3 cur = texture(tInput, vUv).rgb;
  vec2 p = vUv * uRes;
  float var = uWeightVar;
  int st = uWeightStyle;
  // 各画法：底宽、轮廓倍数、折线倍数、暗部加粗、远细、压力起伏、浓度（1 手绘压力 · 2 铁线描 · 3 游丝描 · 4 毛笔提按）
  float base = 0.9, mS = 1.0 + 0.5 * var, mC = 1.0 - 0.45 * var, sh = 0.7 * var, taper = 0.8 * var, pr = 0.5 * var, alpha = 1.0;
  if (st == 2) { base = 0.72; mS = 1.0 + 0.25 * var; mC = 1.0 - 0.15 * var; sh = 0.2 * var; taper = 0.35 * var; pr = 0.04 * var; }
  else if (st == 3) { base = 0.45; mS = 1.0 + 0.2 * var; mC = 1.0 - 0.1 * var; sh = 0.15 * var; taper = 0.35 * var; pr = 0.18 * var; alpha = 0.85; }
  else if (st == 4) { base = 1.0; mS = 1.0 + 0.6 * var; mC = 1.0 - 0.5 * var; sh = 0.8 * var; taper = 0.9 * var; pr = 0.75 * var; }
  float W = 2.0 * uWidth * base;
  // 近粗远细：以镜头注视点为基准（正交相机按深度差占画面高度的比例）
  float f = max(uFocus, 1e-3);
  float s = uOrtho > 0.5 ? (dC - f) / max(uViewHalf.y * 2.0, 1e-3) * 2.0 : log2(max(dC, 1e-3) / f);
  W *= exp2(-clamp(s, -1.5, 2.5) * 0.5 * taper);
  // 背光一侧加粗
  W *= 1.0 + sh * (1.0 - smoothstep(0.12, 0.62, lum(cur)));
  // 手绘压力：沿线缓慢起伏，再叠一层细碎的抖动
  W *= max(0.15, 1.0 + (vnoise(p / 34.0) - 0.5) * 2.0 * pr + (vnoise(p / 9.0 + 7.1) - 0.5) * 0.6 * pr);
  float hwMax = W * max(mS * 0.8, 0.5) * (st == 4 ? 1.5 : 1.0);
  int R = int(clamp(ceil(hwMax + 0.5), 1.0, 4.0));
  float tD = mix(0.09, 0.006, uThreshold);
  ivec2 ip = ivec2(uv * uRes);
  ivec2 lim = ivec2(uRes) - 1;
  // 本像素所在平面的深度梯度（左右、上下各取变化小的一侧，跨边时不被带偏）：判断边点和本像素是不是同一个面
  float dl = linDepth(texelFetch(tDepth, clamp(ip - ivec2(1, 0), ivec2(0), lim), 0).r);
  float dr = linDepth(texelFetch(tDepth, clamp(ip + ivec2(1, 0), ivec2(0), lim), 0).r);
  float dd = linDepth(texelFetch(tDepth, clamp(ip - ivec2(0, 1), ivec2(0), lim), 0).r);
  float du = linDepth(texelFetch(tDepth, clamp(ip + ivec2(0, 1), ivec2(0), lim), 0).r);
  // 透视下按 1/深度 求梯度（平面上屏幕线性），正交按线性深度
  bool persp = uOrtho < 0.5;
  float zC = persp ? 1.0 / max(dC, 1e-4) : dC;
  float zl = persp ? 1.0 / max(dl, 1e-4) : dl, zr = persp ? 1.0 / max(dr, 1e-4) : dr;
  float zd = persp ? 1.0 / max(dd, 1e-4) : dd, zu = persp ? 1.0 / max(du, 1e-4) : du;
  vec2 grad = vec2(abs(zr - zC) < abs(zC - zl) ? zr - zC : zC - zl, abs(zu - zC) < abs(zC - zd) ? zu - zC : zC - zd);
  float dNear = 99.0, dFar = 99.0, dCr = 99.0, dRg = 99.0;
  vec2 g = vec2(0.0);
  float rr = (float(R) + 0.5) * (float(R) + 0.5);
  for (int y = -4; y <= 4; y++) {
    if (y < -R || y > R) continue;
    for (int x = -4; x <= 4; x++) {
      if (x < -R || x > R) continue;
      vec2 o = vec2(float(x), float(y));
      float r2 = dot(o, o);
      if (r2 > rr) continue;
      ivec2 q = clamp(ip + ivec2(x, y), ivec2(0), lim);
      vec4 m = texelFetch(tEdgeMask, q, 0);
      if (m.r + m.g + m.b + m.a < 0.5) continue;
      float r = sqrt(r2);
      if (m.r + m.g > 0.5) {
        // 轮廓边点：只认和本像素同一个面的（不然线会越过轮廓画到另一边）
        float dn = linDepth(texelFetch(tDepth, q, 0).r);
        float zn = persp ? 1.0 / max(dn, 1e-4) : dn;
        if (abs(zn - (zC + dot(grad, o))) / max(zC, 1e-6) < tD * 1.3) {
          if (m.r > 0.5) dNear = min(dNear, r + 0.5);
          if (m.g > 0.5) dFar = min(dFar, r + 0.5);
        }
      }
      if (m.b > 0.5) dCr = min(dCr, r);
      if (m.a > 0.5) dRg = min(dRg, r);
      if (r > 0.0) g += o / (r2 * r);
    }
  }
  float dryGap = 0.0;
  if (st == 4 && dot(g, g) > 1e-6) {
    vec2 gn = normalize(g);
    float k = abs(dot(gn, vec2(0.94, 0.34)));
    W *= mix(1.0, mix(0.35, 1.5, k), var);
    // 粗笔里的飞白：顺着线走的细白丝（方向按 π/8 分档，噪声坐标全局连续），只在笔画粗处出现
    if (dot(gn, vec2(1.0, 0.0)) < 0.0) gn = -gn;
    vec2 d0, d1;
    float wb;
    flowBins(gn, d0, d1, wb);
    vec2 qa = vec2(dot(p, d0), dot(p, vec2(-d0.y, d0.x)));
    vec2 qb = vec2(dot(p, d1), dot(p, vec2(-d1.y, d1.x)));
    float sa = mix(vnoise(vec2(qa.x / 0.9, qa.y / 30.0)), vnoise(vec2(qb.x / 0.9, qb.y / 30.0)), wb);
    dryGap = smoothstep(0.6, 0.78, sa) * smoothstep(2.5, 5.0, W) * var * 0.75;
  }
  float eD = max(covAt(dNear, W * mS * 0.8), covAt(dFar, W * mS * 0.22));
  float e = eD;
  e = max(e, covAt(dRg, W * mix(mS, mC, 0.5) * 0.5));
  e = max(e, covAt(dCr, W * mC * 0.5));
  float far01 = clamp((dC - uNear) / max(uFar - uNear, 0.001), 0.0, 1.0);
  e *= (1.0 - uFade * smoothstep(0.25, 0.9, far01)) * alpha * (1.0 - dryGap);
  vec3 lc = uInk;
  if (uColorMode == 1) {
    vec3 nb = texture(tInput, vUv + px * uWidth).rgb;
    vec3 b = min(cur, nb);
    lc = mix(vec3(lum(b)), b, 1.4) * 0.42;
  } else if (uColorMode == 2) lc = uLight;
  else if (uColorMode == 3) {
    bool dep = eD > 0.5 || eD >= e;
    lc = dep ? uInk : mix(cur, uLight, 0.55);
    e *= dep ? 1.0 : 0.8;
  } else if (uColorMode == 4) lc = goldLine(nC, p);
  oColor = vec4(mix(cur, lc, clamp(e, 0.0, 1.0)), 1.0);
}
void main() {
  vec2 uv = vUv;
  vec2 px = 1.0 / uRes;
  if (uWobble > 0.0 || uBoil > 0.0) {
    vec2 q = uv * uRes / 16.0 + uStepTime * uBoil * 5.3;
    uv += (vec2(vnoise(q), vnoise(q + 31.7)) - 0.5) * (uWobble * 5.0 + uBoil * 2.6) * px;
  }
  float dC = linDepth(texture(tDepth, uv).r);
  vec4 nt = texture(tNormal, uv);
  vec3 nC = nt.xyz * 2.0 - 1.0;
  float rC = floor(nt.a * 64.0);
  if (uWeightStyle > 0) { mainWeighted(uv, px, dC, nC, rC); return; }
  vec2 o = px * uWidth;
  float e = 0.0;
  float cx = (uMode & 1) != 0 ? depthCurv(uv, vec2(o.x, 0.0), dC) : 0.0;
  float cy = (uMode & 1) != 0 ? depthCurv(uv, vec2(0.0, o.y), dC) : 0.0;
  e = max(e, edgeAt(uv + vec2(o.x, 0.0), px, dC, nC, rC, cx));
  e = max(e, edgeAt(uv - vec2(o.x, 0.0), px, dC, nC, rC, cx));
  e = max(e, edgeAt(uv + vec2(0.0, o.y), px, dC, nC, rC, cy));
  e = max(e, edgeAt(uv - vec2(0.0, o.y), px, dC, nC, rC, cy));
  float far01 = clamp((dC - uNear) / max(uFar - uNear, 0.001), 0.0, 1.0);
  e *= 1.0 - uFade * smoothstep(0.25, 0.9, far01);
  vec3 cur = texture(tInput, vUv).rgb;
  vec3 lc = uInk;
  if (uColorMode == 1) {
    vec3 nb = texture(tInput, vUv + vec2(o.x, o.y)).rgb;
    vec3 base = min(cur, nb);
    lc = mix(vec3(lum(base)), base, 1.4) * 0.42;
  } else if (uColorMode == 2) lc = uLight;
  else if (uColorMode == 3) {
    // 深度边用墨色描外轮廓，法线折边用亮色勾高光（t3ssel8r 式像素画）
    lc = gDepthE > 0.5 ? uInk : mix(cur, uLight, 0.55);
    e *= gDepthE > 0.5 ? 1.0 : 0.8;
  } else if (uColorMode == 4) lc = goldLine(nC, vUv * uRes);
  oColor = vec4(mix(cur, lc, clamp(e, 0.0, 1.0)), 1.0);
}`;

/**
 * 边点图（线的提按用，技术补全 P1）：每个像素只和上下左右 1 像素比较，标出 4 种边点：
 *   r = 靠前一侧的轮廓边点（邻居明显更远）· g = 靠后一侧的轮廓边点 · b = 形体折线（左右、上下两邻居的法线夹角大）· a = 部件分界。
 * 深度用"另一侧邻居线性外推"来比：斜面上不误检；折线用跨中心的两邻居比：多重采样把折线上的法线平均掉也不会漏。
 * EDGES 的提按画法再在圆盘里找最近的边点、按线宽换成覆盖率。
 */
export const EDGE_MASK = H + /* glsl */ `
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform int uMode;
uniform float uThreshold;
float dAt(ivec2 q) { return linDepth(texelFetch(tDepth, clamp(q, ivec2(0), ivec2(uRes) - 1), 0).r); }
vec4 nAt(ivec2 q) { return texelFetch(tNormal, clamp(q, ivec2(0), ivec2(uRes) - 1), 0); }
void main() {
  // 不在这里做歪斜 / 抖动：EDGES 读边点图时按歪斜后的位置找，线只被推歪一次
  ivec2 ip = ivec2(gl_FragCoord.xy);
  float tD = mix(0.09, 0.006, uThreshold) * 1.3;
  float tN = mix(0.55, 0.04, uThreshold) * 1.25;
  float dC = dAt(ip);
  vec4 m = vec4(0.0);
  ivec2 nb[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
  vec3 nCv = nAt(ip).xyz * 2.0 - 1.0;
  if ((uMode & 1) != 0) {
    for (int i = 0; i < 4; i++) {
      float dn = dAt(ip + nb[i]);
      float dop = dAt(ip - nb[i]);
      float rel = abs(dn - dC) / max(min(dn, dC), 0.001);
      // 另一侧邻居外推：正交按线性深度、透视按 1/深度（平面上都是屏幕线性的）
      float relP = uOrtho > 0.5
        ? abs(dn - (2.0 * dC - dop)) / max(dC, 0.001)
        : abs(1.0 / max(dn, 1e-4) - (2.0 / max(dC, 1e-4) - 1.0 / max(dop, 1e-4))) * dC;
      // 同平面（外推吻合、法线相同）的大深度差是掠射角；法线不同（曲面轮廓接上了背后的物体）照旧算边
      bool samePlane = relP < tD * 0.5 && 1.0 - dot(nCv, nAt(ip + nb[i]).xyz * 2.0 - 1.0) < 0.05;
      if (rel > tD && !samePlane) { if (dn > dC) m.r = 1.0; else m.g = 1.0; }
    }
  }
  vec4 nC = nAt(ip);
  float rC = floor(nC.a * 64.0);
  if ((uMode & 2) != 0) {
    vec4 a = nAt(ip + ivec2(1, 0)), b = nAt(ip - ivec2(1, 0)), c = nAt(ip + ivec2(0, 1)), d = nAt(ip - ivec2(0, 1));
    float k = 0.0;
    if (floor(a.a * 64.0) > 0.5 && floor(b.a * 64.0) > 0.5) k = max(k, 1.0 - dot(a.xyz * 2.0 - 1.0, b.xyz * 2.0 - 1.0));
    if (floor(c.a * 64.0) > 0.5 && floor(d.a * 64.0) > 0.5) k = max(k, 1.0 - dot(c.xyz * 2.0 - 1.0, d.xyz * 2.0 - 1.0));
    if (rC > 0.5 && k > tN) m.b = 1.0;
  }
  if ((uMode & 4) != 0) {
    for (int i = 0; i < 4; i++) if (abs(floor(nAt(ip + nb[i]).a * 64.0) - rC) > 0.5) m.a = 1.0;
  }
  oColor = m;
}`;

export const QUANTIZE = H + /* glsl */ `
uniform sampler2D tInput;
uniform int uMode;
uniform int uDither;
uniform int uCount;
uniform float uLevels;
uniform vec3 uSwLab[64];
uniform vec3 uSwRgb[64];
uniform int uAnchor;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uOrthoCam;
uniform float uDitherScale;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  vec2 p = gl_FragCoord.xy;
  if (uAnchor == 1) {
    // 世界稳定抖色：透视相机把点阵映射到以相机为中心的球面（Obra Dinn 的做法），正交相机映射到相机平面的世界坐标
    vec4 w = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 wp = w.xyz / w.w;
    // 比例取"每世界单位 / 每弧度对应多少像素"，点阵与屏幕像素一样密，平移时整格移动
    if (uOrthoCam > 0.5) {
      p = vec2(dot(wp, uCamRight), dot(wp, uCamUp)) * uRes.y / (2.0 * uViewHalf.y);
    } else {
      vec3 dir = normalize(wp - uCamPos);
      p = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0))) * uRes.y / (2.0 * uViewHalf.y);
    }
  }
  float th = 0.5;
  if (uDither == 1) th = bayer2(p);
  else if (uDither == 2) th = bayer4(p);
  else if (uDither == 3) th = bayer8(p);
  else if (uDither == 4) th = hash12(p);
  float spread = uDither == 0 ? 0.0 : 1.0;
  if (uMode == 2) {
    float q = max(uLevels - 1.0, 1.0);
    c = floor(c * q + mix(0.5, th, spread)) / q;
  } else if (uMode == 1) {
    vec3 lab = toOklab(srgbToLin(c));
    lab += (th - 0.5) * spread * vec3(0.16, 0.04, 0.04);
    float best = 1e9; int bi = 0;
    for (int i = 0; i < 64; i++) {
      if (i >= uCount) break;
      vec3 d = lab - uSwLab[i];
      d.x *= 1.6;
      float dd = dot(d, d);
      if (dd < best) { best = dd; bi = i; }
    }
    c = uSwRgb[bi];
  }
  oColor = vec4(c, 1.0);
}`;

export const TILTSHIFT = H + /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uDir;
uniform float uAmount;
uniform float uFocus;
void main() {
  float d = abs(vUv.y - uFocus);
  float r = smoothstep(0.06, 0.42, d) * uAmount * 12.0;
  vec3 s = vec3(0.0); float ws = 0.0;
  for (int i = -6; i <= 6; i++) {
    float w = exp(-float(i * i) / 18.0);
    s += texture(tInput, vUv + uDir * float(i) * r / 6.0 / uRes).rgb * w;
    ws += w;
  }
  oColor = vec4(s / ws, 1.0);
}`;

export const OVERLAY = H + PAPER_FN + /* glsl */ `
uniform sampler2D tInput;
uniform float uPaperAmt;
uniform float uPaperMix;
uniform float uGrain;
uniform float uChroma;
uniform float uVignette;
uniform vec3 uPaper;
void main() {
  vec2 uv = vUv;
  vec3 c;
  float k = uChroma * 0.004;
  if (k > 0.0) {
    c.r = texture(tInput, uv + vec2(k, 0.0)).r;
    c.g = texture(tInput, uv).g;
    c.b = texture(tInput, uv - vec2(k, 0.0)).b;
  } else c = texture(tInput, uv).rgb;
  vec2 p = vUv * uRes;
  if (uPaperMix > 0.0) c = mix(c, c * paperColorAt(p, uPaper) * 1.06, uPaperMix);
  if (uPaperAmt > 0.0) {
    if (uPaperTexOn > 0.5) c *= 1.0 + uPaperAmt * 0.3 * (paperHeight(p, 0.5) - 0.5);
    else {
      float g = fbm(p / 2.6) * 0.6 + fbm(p / 38.0) * 0.4;
      float fiber = vnoise(vec2(p.x / 1.3, p.y / 30.0));
      c *= 1.0 - uPaperAmt * (0.18 * (1.0 - g) + 0.06 * fiber);
    }
  }
  if (uGrain > 0.0) c += (hash12(gl_FragCoord.xy + floor(uTime * 24.0) * 17.31) - 0.5) * uGrain * 0.13;
  vec2 d = vUv - 0.5;
  c *= 1.0 - uVignette * smoothstep(0.3, 0.85, length(d) * 1.35);
  oColor = vec4(c, 1.0);
}`;

/*
 * VHS 录像带：亮度和颜色分开走（YIQ），颜色的带宽只有亮度的几分之一 → 颜色糊开、往右拖；
 * 再叠每行抖动、磁带慢晃、滚动的跟踪噪声带、底部磁头切换、掉磁白线、横向拉长的雪花。
 * 颜色取样读 tChroma（Pipeline 先横向预模糊到半分辨率），避免稀疏取样在细线旁拖出一串重影。
 * 屏显字幕：录像机字幕（PLAY/REC）叠在最上面保持清晰；摄像机日期先"烧进"画面，再跟着磁带一起变脏。
 * uVhs = 0 时只叠字幕（不是录像带的数码录像也可以有时间码）。
 * 画幅黑边仍由 OUTPUT 最后画（保持纯黑）；这里只把磁头切换区挪到黑边以内的画面底部。
 */
export const VHS = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tChroma;
uniform sampler2D tOsd;
uniform int uVhs;
uniform float uWear;
uniform float uTracking;
uniform int uInterlace;
uniform float uLetterbox;
uniform int uOsdMode;
uniform float uOsdK;
uniform vec2 uOsdSize;
vec3 rgb2yiq(vec3 c) { return vec3(dot(c, vec3(0.299, 0.587, 0.114)), dot(c, vec3(0.596, -0.274, -0.322)), dot(c, vec3(0.211, -0.523, 0.312))); }
vec3 yiq2rgb(vec3 c) { return vec3(c.x + 0.956 * c.y + 0.621 * c.z, c.x - 0.272 * c.y - 0.647 * c.z, c.x - 1.106 * c.y + 1.703 * c.z); }
/** 字幕画布：一个字幕像素 = uOsdK 个画面像素，画布第 0 行在画面顶部 */
vec4 osdAt(vec2 uv) {
  vec2 p = floor(uv * uRes / uOsdK);
  if (p.x < 0.0 || p.y < 0.0 || p.x >= uOsdSize.x || p.y >= uOsdSize.y) return vec4(0.0);
  return texelFetch(tOsd, ivec2(int(p.x), int(uOsdSize.y - 1.0 - p.y)), 0);
}
/** 磁带上的亮度信号：画面 + 烧进去的摄像机日期 */
vec3 src(vec2 uv) {
  vec3 c = clamp(texture(tInput, uv).rgb, 0.0, 1.0);
  if (uOsdMode == 2) { vec4 o = osdAt(uv); c = mix(c, o.rgb, o.a); }
  return c;
}
/** 磁带上的颜色信号：读预模糊过的半分辨率画面（摄像机日期同样烧进去） */
vec3 srcC(vec2 uv) {
  vec3 c = clamp(texture(tChroma, uv).rgb, 0.0, 1.0);
  if (uOsdMode == 2) { vec4 o = osdAt(uv); c = mix(c, o.rgb, o.a); }
  return c;
}
void main() {
  if (uVhs == 0) {
    vec3 c = texture(tInput, vUv).rgb;
    if (uOsdMode != 0) { vec4 o = osdAt(vUv); c = mix(c, o.rgb, o.a); }
    oColor = vec4(c, 1.0);
    return;
  }
  float W = uWear;
  float T = uTracking;
  // 磁带帧号：约 30 帧/秒，所有噪声都从它取（同一时刻结果固定）
  float fr = mod(floor(uTime * 29.97), 4096.0);
  vec2 uv = vUv;
  // 跟踪很差时整幅画面上下跳
  uv.y += (hash12(vec2(fr, 3.1)) - 0.5) * 0.006 * smoothstep(0.5, 1.0, T);
  // 一场约 240 行，与画面分辨率无关
  float ln = floor(uv.y * 240.0);
  float lineH = max(1.0, floor(uRes.y / 480.0));
  // 1 横向偏移：每行抖动 + 磁带慢晃（uv.x 减小 = 画面内容往右移）
  float dx = (hash12(vec2(ln, fr)) - 0.5) * (0.0006 + 0.0022 * W);
  dx += (sin(uv.y * 5.0 + uTime * 1.1) * 0.6 + sin(uv.y * 21.0 - uTime * 2.3) * 0.4) * (0.0005 + 0.0016 * W + 0.002 * T);
  // 跟踪噪声带：一条横带缓慢滚过画面，带里整行乱跳、整体右偏；跟踪不良约 0.1 起出现，0.4 以上满强度
  float bandY = fract(0.8 - uTime * (0.025 + 0.05 * T));
  float bd = abs(uv.y - bandY);
  bd = min(bd, 1.0 - bd);
  float band = (1.0 - smoothstep(0.0, mix(0.015, 0.11, T), bd)) * smoothstep(0.1, 0.4, T);
  dx -= band * ((hash12(vec2(ln * 1.7, fr + 3.0)) - 0.5) * 0.05 + 0.012) * T;
  // 磁头切换：画面最底下几行（有上下黑边时从黑边以内算起）整体右移、变脏
  float asp = uRes.x / uRes.y;
  float yb = uLetterbox > asp ? 0.5 - 0.5 * asp / uLetterbox : 0.0;
  float hsH = mix(0.012, 0.04, max(W, T));
  float hs = 1.0 - smoothstep(yb, yb + hsH, uv.y);
  dx -= hs * hs * (0.015 + 0.03 * hash12(vec2(fr, 7.0))) * (0.4 + 0.6 * max(W, T));
  // 隔行：奇偶两场错开一点
  float field = mod(floor(gl_FragCoord.y / lineH), 2.0);
  if (uInterlace == 1) dx += (field - 0.5) * 0.0012 * (0.5 + W);
  uv.x += dx;
  // 2 亮度：带宽有限（略糊）+ 录像机锐化电路的过冲（边缘出现亮边、暗边）
  // 步长按 1280 宽的视频算；画面更宽时一个步长超过 2 像素，单次双线性取样会漏读细线（细线变成一串有黑缝的重影），
  // 所以每个取样拆成 nSub 个子取样，间距不超过 2 像素，铺满整个步长
  float ls = (0.7 + 1.6 * W) / 1280.0;
  int nSub = int(clamp(ceil(ls * uRes.x * 0.5), 1.0, 4.0));
  float y0 = 0.0;
  float yw = 0.0;
  float wn = 0.0;
  float ww = 0.0;
  for (int k = -6; k <= 6; k++) {
    float fk = float(k);
    float y = 0.0;
    for (int j = 0; j < 4; j++) {
      if (j >= nSub) break;
      float o = (float(j) + 0.5) / float(nSub) - 0.5;
      y += rgb2yiq(src(uv + vec2((fk + o) * ls, 0.0))).x;
    }
    y /= float(nSub);
    float a = exp(-fk * fk / 6.0);
    float b = exp(-fk * fk / 24.0);
    y0 += y * a; wn += a;
    yw += y * b; ww += b;
  }
  y0 /= wn;
  yw /= ww;
  float Y = y0 + (y0 - yw) * (0.8 + 1.2 * W);
  // 3 颜色：带宽窄 → 糊开；色度延迟 → 整体往右拖
  float cs = (2.2 + 4.0 * W) / 640.0;
  float cd = 0.0025 + 0.004 * W;
  vec2 iq = vec2(0.0);
  float wc = 0.0;
  for (int k = -4; k <= 4; k++) {
    float fk = float(k);
    float w = exp(-fk * fk / 8.0);
    iq += rgb2yiq(srcC(uv + vec2(fk * cs - cd, 0.0))).yz * w;
    wc += w;
  }
  iq /= wc;
  // 整行被推出画面的地方是黑的
  if (uv.x < 0.0 || uv.x > 1.0) { Y = 0.02; iq = vec2(0.0); }
  // 4 黑位抬高、褪色、偏色（偏色只加在亮处，暗部不发紫）、噪声
  Y = Y * (0.92 - 0.06 * W) + 0.035 + 0.02 * W;
  iq *= 0.86 - 0.3 * W;
  iq += vec2(0.012, 0.01) * (0.3 + W) * smoothstep(0.03, 0.4, Y);
  iq += (vec2(vnoise(vec2(uv.x * 60.0, ln * 0.7 + fr * 13.0)), vnoise(vec2(uv.x * 60.0 + 17.0, ln * 0.7 - fr * 7.0))) - 0.5) * (0.015 + 0.08 * W);
  // 雪花：沿扫描线拉长的短横条，不是逐像素的方点
  float sw = (1.0 + 2.0 * W) * max(1.0, uRes.y / 540.0);
  vec2 sn0 = vec2(floor(gl_FragCoord.x / sw), floor(gl_FragCoord.y / lineH));
  Y += (hash12(sn0 + fr * vec2(37.0, 17.0)) - 0.5) * (0.025 + 0.09 * W + 0.04 * T);
  Y += (vnoise(vec2(gl_FragCoord.x / 6.0, ln + fr * 31.0)) - 0.5) * 0.06 * W;
  // 5 掉磁：偶尔一行出现一段白色横线（新带子几乎没有，磨损越大越多）
  float pDrop = W * (0.0005 + 0.012 * W * W);
  if (hash12(vec2(ln * 0.37 + 11.0, fr)) < pDrop) {
    float x0 = hash12(vec2(ln, fr + 5.0));
    float len = 0.02 + 0.12 * hash12(vec2(fr, ln + 9.0));
    float d = (vUv.x - x0) / len;
    float a = smoothstep(0.0, 0.04, d) * clamp(1.0 - d, 0.0, 1.0);
    Y = mix(Y, 1.0, a * 0.9);
    iq *= 1.0 - a;
  }
  // 6 跟踪噪声带里的白色碎横纹
  if (band > 0.001) {
    float seg = floor(vUv.x * (40.0 + 200.0 * hash12(vec2(ln, fr + 1.0))));
    float sn = hash12(vec2(seg, ln + fr * 57.0));
    float st = smoothstep(0.55, 0.95, sn) * band;
    Y = mix(Y, 0.7 + 0.3 * sn, st * (0.4 + 0.6 * T));
    iq *= 1.0 - band * 0.7;
  }
  // 7 磁头切换区：噪声更重、颜色丢失
  if (hs > 0.001) {
    Y = mix(Y, hash12(sn0 + fr), hs * 0.25 * (0.4 + 0.6 * max(W, T)));
    iq *= 1.0 - hs * 0.6;
  }
  vec3 c = clamp(yiq2rgb(vec3(Y, iq)), 0.0, 1.0);
  if (uInterlace == 1) c *= 1.0 - field * 0.12;
  // 8 录像机字幕：播放机自己生成，叠在最上面，不受磁带影响
  if (uOsdMode == 1) { vec4 o = osdAt(vUv); c = mix(c, o.rgb, o.a); }
  oColor = vec4(c, 1.0);
}`;

/*
 * 数码压缩噪点（像低码率的 JPEG / MPEG）：画面按 8×8 宏块处理——
 * 每块求 4×4 个最低频的 DCT 系数，按"频率越高台阶越大"量化（高频大多被量化成 0）：
 *   渐变出现方块台阶、细纹理被抹平，边缘旁出现跟着边走的振铃（蚊式噪声），只随画面内容变化；
 * 比 4 阶更细的细节：小的丢掉，压得越狠硬边也越多被丢掉 → 边缘变糊、块感更强；
 * 颜色按 2×2 共用一份（4:2:0），压得越狠越接近整块一个颜色。
 * 约每 2 秒一个"关键帧"：量化的取整点轻微变化，静止画面不会每帧闪。
 * 单 pass：每个像素读自己所在块的 64 个样本（同一块的像素读同一组纹素，缓存命中高）。
 */
export const COMPRESS = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uAmount;
uniform float uBlock;
const float PI = 3.14159265;
// KC[u * 8 + i] = cos(PI * (2i + 1) * u / 16)：8 点 DCT 的前 4 个基函数
const float KC[32] = float[32](
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  0.98079, 0.83147, 0.55557, 0.19509, -0.19509, -0.55557, -0.83147, -0.98079,
  0.92388, 0.38268, -0.38268, -0.92388, -0.92388, -0.38268, 0.38268, 0.92388,
  0.83147, -0.19509, -0.98079, -0.55557, 0.55557, 0.98079, 0.19509, -0.83147);
vec3 toYcc(vec3 c) { float y = dot(c, vec3(0.299, 0.587, 0.114)); return vec3(y, (c.b - y) * 0.564, (c.r - y) * 0.713); }
vec3 fromYcc(vec3 c) { return vec3(c.x + 1.403 * c.z, c.x - 0.344 * c.y - 0.714 * c.z, c.x + 1.773 * c.y); }
float qnt(float x, float q) { return floor(x / q + 0.5) * q; }
vec4 qnt4(vec4 x, vec4 q, float o) { return floor(x / q + 0.5 + o) * q; }
/** 一个取样格的平均色：格子大于 1.5 像素时取 4 个偏移 ±h 的双线性样本（格宽 2、4 像素时正好是盒式平均），避免只读到格子里的一个像素、细线一移动整块就闪 */
vec3 cellAvg(vec2 c, float h) {
  if (h < 0.375) return texture(tInput, c / uRes).rgb;
  return 0.25 * (texture(tInput, (c + vec2(-h, -h)) / uRes).rgb + texture(tInput, (c + vec2(h, -h)) / uRes).rgb
               + texture(tInput, (c + vec2(-h, h)) / uRes).rgb + texture(tInput, (c + vec2(h, h)) / uRes).rgb);
}
void main() {
  float a = uAmount;
  float s = uBlock / 8.0;
  vec2 px = gl_FragCoord.xy;
  vec2 blk = floor(px / uBlock);
  vec2 bo = blk * uBlock;
  // 1 整块取 8×8 个样本：先按行投影到 4 个水平频率，再按列投影 → 4×4 个系数（Cv 的分量 = 水平频率 u）；同时求颜色平均
  vec4 C0 = vec4(0.0);
  vec4 C1 = vec4(0.0);
  vec4 C2 = vec4(0.0);
  vec4 C3 = vec4(0.0);
  vec2 cdc = vec2(0.0);
  for (int j = 0; j < 8; j++) {
    vec4 row = vec4(0.0);
    for (int i = 0; i < 8; i++) {
      vec3 v = toYcc(clamp(cellAvg(bo + (vec2(float(i), float(j)) + 0.5) * s, s * 0.25), 0.0, 1.0));
      row += v.x * vec4(KC[i], KC[8 + i], KC[16 + i], KC[24 + i]);
      cdc += v.yz;
    }
    C0 += row * KC[j];
    C1 += row * KC[8 + j];
    C2 += row * KC[16 + j];
    C3 += row * KC[24 + j];
  }
  // 归一化：每个方向 Σcos² = 8（直流）或 4
  vec4 nu = vec4(8.0, 4.0, 4.0, 4.0);
  C0 /= nu * 8.0;
  C1 /= nu * 4.0;
  C2 /= nu * 4.0;
  C3 /= nu * 4.0;
  cdc /= 64.0;
  // 2 量化：台阶随频率 u + v 增大；每个关键帧（约 2 秒）各块的取整点轻微变化
  float gop = mod(floor(uTime * 0.5), 256.0);
  float ko = (hash12(blk + gop * vec2(13.0, 7.0)) - 0.5) * 0.35;
  float Q = mix(0.004, 0.075, a);
  vec4 fu = vec4(0.0, 1.0, 2.0, 3.0);
  vec4 q0 = qnt4(C0, Q * (1.0 + 0.8 * fu), ko);
  vec4 q1 = qnt4(C1, Q * (1.8 + 0.8 * fu), ko);
  vec4 q2 = qnt4(C2, Q * (2.6 + 0.8 * fu), ko);
  vec4 q3 = qnt4(C3, Q * (3.4 + 0.8 * fu), ko);
  // 直流单独量化、不加偏移：渐变出现方块台阶，整块亮度不会在关键帧跳
  float dq = 1.0 / mix(96.0, 12.0, pow(a, 0.8));
  q0.x = floor(C0.x / dq + 0.5) * dq;
  // 3 本像素在块里的位置（取样中心在 i + 0.5）→ 低频重建：原样的 lowF 与量化后的 lowQ
  vec2 q = (px - bo) / s;
  vec4 bx = cos(PI * fu * q.x / 8.0);
  vec4 by = cos(PI * fu * q.y / 8.0);
  float lowF = dot(C0 * by.x + C1 * by.y + C2 * by.z + C3 * by.w, bx);
  float lowQ = dot(q0 * by.x + q1 * by.y + q2 * by.z + q3 * by.w, bx);
  // 4 更细的细节（残差）：小的丢掉（纹理被抹平）；压得越狠，硬边也越多被丢掉 → 边缘变糊，块里留下振铃
  vec3 oc = toYcc(clamp(texture(tInput, vUv).rgb, 0.0, 1.0));
  float r = oc.x - lowF;
  float dz = mix(0.004, 0.12, a);
  float keep = smoothstep(dz, dz * 2.0, abs(r)) * (1.0 - 0.75 * smoothstep(0.15, 0.9, a));
  float Y = lowQ + qnt(r * keep, mix(0.002, 0.05, a));
  // 5 颜色：2×2 共用一份（4:2:0），压得越狠越接近整块一个颜色
  float s2 = 2.0 * s;
  vec2 c420 = toYcc(clamp(cellAvg((floor(px / s2) + 0.5) * s2, s2 * 0.25), 0.0, 1.0)).yz;
  vec2 C = mix(c420, cdc, smoothstep(0.25, 1.0, a) * 0.8);
  float cq = 1.0 / mix(128.0, 14.0, a);
  C = vec2(qnt(C.x, cq), qnt(C.y, cq));
  oColor = vec4(clamp(fromYcc(vec3(Y, C)), 0.0, 1.0), 1.0);
}`;

export const OUTPUT = H + /* glsl */ `
uniform float uLetterbox;
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform int uDiag;
uniform int uScreen;
uniform vec2 uInRes;
// 输出画布的设备像素高（CRT 扫描线的周期按它算）
uniform float uOutH;
uniform vec3 uPaper;
uniform vec3 uInk;
// 游戏 UI 样本（src/hud/HudSystem.ts）：预乘 alpha 的画布纹理；毛玻璃遮罩 + 模糊过的画面
uniform sampler2D tHud;
uniform sampler2D tHudMask;
uniform sampler2D tHudBlur;
uniform float uHudOn;
uniform float uHudBlur;
uniform float uHudInDiag;
// 色盲模拟（chk.cvd：0 关、1 红色弱、2 绿色弱、3 蓝黄色弱、4 全色盲），作用于合成后的整屏（含 UI）；Machado 2009 严重度 1.0，线性空间
uniform int uCvd;
// 元 UI（M6）：低血量去饱和、夜视（只作用于画面，UI 叠在上面不受影响）
uniform float uMetaDesat;
uniform float uNight;
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 cvd(vec3 c, int m) {
  vec3 l = toLin(clamp(c, 0.0, 1.0));
  if (m == 1) l = mat3(0.152286, 0.114503, -0.003882, 1.052583, 0.786281, -0.048116, -0.204868, 0.099216, 1.051998) * l;
  else if (m == 2) l = mat3(0.367322, 0.280085, -0.011820, 0.860646, 0.672501, 0.042940, -0.227968, 0.047413, 0.968881) * l;
  else if (m == 3) l = mat3(1.255528, -0.078411, 0.004733, -0.076749, 0.930809, 0.691367, -0.178779, 0.147602, 0.303900) * l;
  else if (m == 4) l = vec3(dot(l, vec3(0.2126, 0.7152, 0.0722)));
  return toSrgb(clamp(l, 0.0, 1.0));
}
// 眯眼（diag = squint）：合成后的画面做大半径模糊 + 半去色，看层级还剩什么
vec3 composite(vec2 p) { vec4 h = uHudOn > 0.5 ? texture(tHud, p) : vec4(0.0); return texture(tInput, p).rgb * (1.0 - h.a) + h.rgb; }
void main() {
  vec2 uv = vUv;
  if (uScreen == 1) {
    vec2 cc = uv * 2.0 - 1.0;
    cc *= 1.0 + dot(cc, cc) * 0.045;
    uv = cc * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { oColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  }
  vec3 c = texture(tInput, uv).rgb;
  if (uMetaDesat > 0.0) c = mix(c, vec3(lum(c)), uMetaDesat);
  if (uNight > 0.0) { float l = lum(c) * 1.6 + 0.04; float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); c = mix(c, vec3(0.15, 1.0, 0.35) * (l + (n - 0.5) * 0.08), uNight); }
  // HUD 与 CRT 一起弯曲（同一个 uv）；毛玻璃：遮罩处换成模糊过的画面
  vec4 hud = uHudOn > 0.5 ? texture(tHud, uv) : vec4(0.0);
  if (uHudBlur > 0.5) c = mix(c, texture(tHudBlur, uv).rgb, texture(tHudMask, uv).r);
  // 诊断视图要不要包含 HUD：包含时先合成再诊断（剪影模式把 HUD 当墨色）
  if (uHudInDiag > 0.5) c = c * (1.0 - hud.a) + hud.rgb;
  if (uDiag == 4) {
    // 黄金角螺旋 32 点：半径约 22 像素的圆盘模糊，没有方格感
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 32; i++) { float rr = sqrt((float(i) + 0.5) / 32.0) * 22.0; float a = float(i) * 2.39996; acc += composite(uv + vec2(cos(a), sin(a)) * rr / uInRes); }
    acc /= 32.0;
    c = mix(acc, vec3(lum(acc)), 0.6);
    hud = vec4(0.0);
  }
  if (uDiag == 1) c = vec3(lum(c));
  else if (uDiag == 2) { float l = lum(c); c = vec3(l < 0.33 ? 0.12 : l < 0.66 ? 0.5 : 0.9); }
  else if (uDiag == 3) c = (texture(tNormal, uv).a > 0.001 || (uHudInDiag > 0.5 && hud.a > 0.5)) ? uInk : uPaper;
  if (uHudInDiag < 0.5) c = c * (1.0 - hud.a) + hud.rgb;
  if (uScreen == 1) {
    // 扫描线（整合修复 U#11）：周期按输出像素算、至少 3 个输出像素一条。原来每个内部像素行一条——像素化为 1 时就是每个输出像素一条，
    // 被屏幕弧度一弯就和像素网格拍出一道道粗波纹（预览尺寸最明显）。现在一条扫描线 = k 个内部像素行（让周期 ≥ 3 输出像素的最小整数 k），
    // 像素化时仍和像素行对齐；输出越矮越淡（预览里不抢画面，1080 行以上是原来的强度）
    float per = uOutH / max(uInRes.y, 1.0);
    float lines = uInRes.y / ceil(3.0 / max(per, 1e-3));
    float row = fract(uv.y * lines);
    float amp = 0.28 * clamp(uOutH / 1080.0, 0.6, 1.0);
    c *= (1.0 - amp) + amp * sin(row * 3.14159);
    float m = mod(gl_FragCoord.x, 3.0);
    c *= vec3(m < 1.0 ? 1.08 : 0.94, m >= 1.0 && m < 2.0 ? 1.08 : 0.94, m >= 2.0 ? 1.08 : 0.94);
    vec2 d = uv - 0.5;
    c *= 1.0 - smoothstep(0.35, 0.75, length(d) * 1.2) * 0.5;
  } else if (uScreen == 3) {
    vec2 f = fract(uv * uInRes);
    c *= mix(0.68, 1.0, step(0.14, f.x) * step(0.14, f.y));
  }
  if (uLetterbox > 0.0) {
    // 画幅黑边：目标比例比画面宽 → 上下黑边；更窄 → 左右黑边
    float asp = uRes.x / uRes.y;
    if (uLetterbox > asp) { if (abs(vUv.y - 0.5) > 0.5 * asp / uLetterbox) c = vec3(0.0); }
    else if (abs(vUv.x - 0.5) > 0.5 * uLetterbox / asp) c = vec3(0.0);
  }
  if (uCvd > 0) c = cvd(c, uCvd);
  oColor = vec4(c, 1.0);
}`;

/** 屏幕空间环境光遮蔽：在线性 HDR 阶段压暗缝隙与接触处 */
export const SSAO = H + ROLE_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform float uAmount;
uniform float uRadius;
bool noAO(float r) { return r == ${roleCode('water')} || r == ${roleCode('waterDeep')}; }
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  vec4 nt = texture(tNormal, vUv);
  // 天空与水面不计算（水面法线带波纹，和几何不一致，会自遮蔽出噪点）
  if (nt.a < 0.001 || noAO(floor(nt.a * 64.0))) { oColor = vec4(c, 1.0); return; }
  float d = linDepth(texture(tDepth, vUv).r);
  vec3 p = viewPos(vUv, d);
  vec3 n = normalize(nt.xyz * 2.0 - 1.0);
  float R = uRadius;
  float rpx = clamp(R * pxPerUnit(d), 3.0, 80.0);
  float occ = 0.0;
  float rot = hash12(gl_FragCoord.xy) * 6.2831;
  for (int i = 0; i < 16; i++) {
    float a = rot + float(i) * 2.399;
    float r = sqrt((float(i) + 0.5) / 16.0) * rpx;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * r / uRes;
    if (texture(tNormal, suv).a < 0.001) continue;
    vec3 q = viewPos(suv, linDepth(texture(tDepth, suv).r));
    vec3 w = q - p;
    float dist = length(w);
    // 只算法线半球内、半径内的遮挡；距离越远权重越低（避免远处物体给前景描黑边）
    occ += max(0.0, dot(w / max(dist, 1e-4), n) - 0.15) * (1.0 - smoothstep(R * 0.6, R * 1.6, dist));
  }
  occ = clamp(occ / 16.0 * 2.2, 0.0, 1.0);
  oColor = vec4(c * (1.0 - occ * uAmount), 1.0);
}`;

/** 景深（散景近似）：按与焦点深度的距离做圆盘模糊 */
export const DOF = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tDepth;
uniform float uAmount;
uniform float uFocus;
uniform float uRange;
float sceneDepthAt(vec2 uv, inout float n) {
  float raw = texture(tDepth, uv).r;
  if (raw > 0.99999) return 0.0;
  n += 1.0;
  return linDepth(raw);
}
void main() {
  // 自动对焦：取画面中心附近的深度（跟随模式下就是角色）；中心是天空时退回镜头注视点距离
  float n = 0.0;
  float f = sceneDepthAt(vec2(0.5), n) + sceneDepthAt(vec2(0.47, 0.5), n) + sceneDepthAt(vec2(0.53, 0.5), n)
          + sceneDepthAt(vec2(0.5, 0.46), n) + sceneDepthAt(vec2(0.5, 0.54), n);
  float focus = n > 0.0 ? f / n : uFocus;
  float d = linDepth(texture(tDepth, vUv).r);
  float coc = clamp(abs(d - focus) / max(uRange, 0.01), 0.0, 1.0) * uAmount * 14.0 * uRes.y / 900.0;
  vec3 s = texture(tInput, vUv).rgb;
  float ws = 1.0;
  if (coc > 0.5) {
    for (int i = 0; i < 24; i++) {
      float a = float(i) * 2.399;
      float r = sqrt((float(i) + 0.5) / 24.0) * coc;
      vec2 o = vec2(cos(a), sin(a)) * r / uRes;
      vec3 c = texture(tInput, vUv + o).rgb;
      float w = 1.0 + lum(c) * 2.0;
      s += c * w; ws += w;
    }
  }
  oColor = vec4(s / ws, 1.0);
}`;

/** 体积光近似：从太阳的屏幕位置做径向模糊，只取天空与亮部 */
export const GODRAYS = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform vec2 uSun;
uniform float uAmount;
uniform vec3 uTint;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  // 只向太阳走一半路程：离太阳远的像素采不到太阳附近，光束自然收在太阳周围
  vec2 dir = (vUv - uSun) * 0.55 / 40.0;
  vec2 uv = vUv;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float acc = 0.0, decay = 1.0;
  float jitter = hash12(gl_FragCoord.xy);
  uv -= dir * jitter;
  for (int i = 0; i < 40; i++) {
    uv -= dir;
    vec2 cu = clamp(uv, 0.0, 1.0);
    // 光源只取"太阳附近的天空"：离太阳越远贡献越小，避免整片天空把画面洗白
    float sky = texture(tNormal, cu).a < 0.001 ? 1.0 : 0.0;
    float disc = 1.0 - smoothstep(0.02, 0.45, length((cu - uSun) * asp));
    acc += sky * disc * decay;
    decay *= 0.96;
  }
  acc /= 40.0;
  // 被遮挡的像素（自身不是天空）才显出光束；天空本身只加一点光晕
  float selfSky = texture(tNormal, vUv).a < 0.001 ? 0.35 : 1.0;
  float near = 1.0 - smoothstep(0.15, 0.9, length((vUv - uSun) * asp));
  oColor = vec4(c + uTint * acc * uAmount * 2.5 * selfSky * near, 1.0);
}`;

/** 镜头：鱼眼桶形畸变 */
export const LENS = H + /* glsl */ `
uniform sampler2D tInput;
uniform float uAmount;
void main() {
  vec2 cc = vUv * 2.0 - 1.0;
  float r2 = dot(cc, cc);
  // 除以角上的放大量，让四角刚好落在画面边缘（不出现黑边）
  vec2 uv = cc * (1.0 + r2 * uAmount * 0.35) / (1.0 + 2.0 * uAmount * 0.35) * 0.5 + 0.5;
  vec3 c = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec3(0.0) : texture(tInput, uv).rgb;
  c *= 1.0 - uAmount * smoothstep(0.6, 1.4, r2) * 0.6;
  oColor = vec4(c, 1.0);
}`;

/**
 * 自动曝光·测光：把线性 HDR 画面缩成 64×64 的"对数亮度"小图（每格 8×8 次采样），并按测光方式写入权重。
 * 每个采样的对数亮度夹在"可补偿范围再放宽 2 档"之内：描边、纯黑空洞不会把几何平均拖得太低，太阳、发光体也不会独占测光。
 */
export const AE_METER = H + /* glsl */ `
uniform sampler2D tInput;
uniform int uMetering;
uniform float uKeyLog;
uniform float uRange;
void main() {
  // 本格覆盖原画面的 1/64 × 1/64：在格内均匀取 8×8 个点（双线性采样，每点实际平均了相邻 2×2 个像素）
  vec2 cell = vec2(1.0 / 64.0);
  vec2 base = vUv - cell * 0.5;
  float lo = uKeyLog - uRange - 2.0;
  float hi = uKeyLog + uRange + 2.0;
  float s = 0.0;
  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) {
      vec2 uv = base + (vec2(float(i), float(j)) + 0.5) * cell * 0.125;
      float l = lum(clamp(texture(tInput, uv).rgb, vec3(0.0), vec3(65504.0)));
      // 用比较挡住 NaN（部分驱动会把 isnan 优化掉）
      if (!(l >= 0.0)) l = 1.0;
      s += clamp(log2(max(l, 1e-6)), lo, hi);
    }
  }
  // 测光权重：按画面高度归一的到中心距离（宽屏不变形）
  vec2 d = (vUv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  float r = length(d);
  float w = 1.0;
  if (uMetering == 1) w = 0.05 + exp(-r * r / 0.0968);
  else if (uMetering == 2) w = 0.002 + 1.0 - smoothstep(0.06, 0.12, r);
  oColor = vec4(s / 64.0, w, 0.0, 1.0);
}`;

/** 自动曝光·缩小：64×64 → 8×8，每格合并 8×8 个测光格（加权平均对数亮度，平均权重） */
export const AE_REDUCE = H + /* glsl */ `
uniform sampler2D tInput;
void main() {
  ivec2 o = ivec2(gl_FragCoord.xy) * 8;
  float s = 0.0, ws = 0.0;
  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) {
      vec2 m = texelFetch(tInput, o + ivec2(i, j), 0).rg;
      s += m.x * m.y;
      ws += m.y;
    }
  }
  oColor = vec4(s / max(ws, 1e-6), ws / 64.0, 0.0, 1.0);
}`;

/**
 * 自动曝光·适应：8×8 → 1×1 得到这一帧的目标（对数亮度），再从上一帧的结果向它靠拢。
 * 输出 r = 适应后的对数亮度，g = 这一帧测到的目标。uSnap = 1 时直接对准（首帧、场景重建、冻结时间、同步截图）。
 */
export const AE_ADAPT = H + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tPrev;
uniform float uDt;
uniform float uSpeed;
uniform float uSnap;
uniform float uKeyLog;
uniform float uRange;
void main() {
  float s = 0.0, ws = 0.0;
  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) {
      vec2 m = texelFetch(tInput, ivec2(i, j), 0).rg;
      s += m.x * m.y;
      ws += m.y;
    }
  }
  // 目标先夹进可补偿范围：超出的部分反正补不了，夹住后从极暗处回到亮处不会"迟到"
  float target = clamp(s / max(ws, 1e-6), uKeyLog - uRange, uKeyLog + uRange);
  float prev = texelFetch(tPrev, ivec2(0), 0).r;
  float a = target;
  // prev 不在合理范围（NaN、无穷、未初始化）时也直接对准，避免坏值一直留在交替纹理里
  if (uSnap < 0.5 && prev > -30.0 && prev < 30.0) {
    // 场景变亮（画面要压暗）适应快；场景变暗（画面要提亮）适应慢，像人眼进暗处要好几秒才看清
    float k = target > prev ? uSpeed : uSpeed * 0.35;
    a = prev + (target - prev) * (1.0 - exp(-max(uDt, 0.0) * k));
  }
  oColor = vec4(a, target, 0.0, 1.0);
}`;
