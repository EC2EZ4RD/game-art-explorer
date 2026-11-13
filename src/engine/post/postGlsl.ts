/* 后处理公共 GLSL：深度线性化、亮度、噪声、OKLab */

export const POST_HEAD = /* glsl */ `
precision highp float;
in vec2 vUv;
layout(location = 0) out highp vec4 oColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uStepTime;
uniform float uNear;
uniform float uFar;
uniform float uOrtho;
uniform vec2 uViewHalf;
`;

export const POST_LIB = /* glsl */ `
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 x) {
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return s;
}
float linDepth(float d) {
  if (uOrtho > 0.5) return uNear + d * (uFar - uNear);
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
/** 由屏幕坐标与线性深度重建视空间位置 */
vec3 viewPos(vec2 uv, float lin) {
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc * uViewHalf * (uOrtho > 0.5 ? 1.0 : lin), -lin);
}
/** 一个世界单位在该深度处占多少像素 */
float pxPerUnit(float lin) {
  return uRes.y / (2.0 * uViewHalf.y * (uOrtho > 0.5 ? 1.0 : lin));
}
vec3 toOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0); m = pow(max(m, 0.0), 1.0 / 3.0); s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
              1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
              0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s);
}
vec3 fromOklab(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.291485548 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
             -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
             -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
}
vec3 srgbToLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 linToSrgb(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float bayer2(vec2 p) { p = mod(floor(p), 2.0); return (p.x * 2.0 + p.y * 3.0 - 4.0 * p.x * p.y) / 4.0; }
float bayer4(vec2 p) { return bayer2(p * 0.5) * 0.25 + bayer2(p); }
float bayer8(vec2 p) { return bayer4(p * 0.5) * 0.25 + bayer2(p); }
`;

/*
 * 形体方向场（技术补全 P1，2026-10-23）：木刻刻纹、铜版雕刻线、水墨飞白共用。依赖 POST_HEAD + POST_LIB。
 * formGrad：取中心与周围 8 处（半径 r 像素）的视空间法线在屏幕上的投影，只在同一表面（深度相近、不是天空）里平均。
 *   返回"线要横穿的方向"（相当于梯度方向；线沿它的垂直方向走：球上一圈圈绕着轮廓、柱子上顺着柱身、地面上横着走）；
 *   conf = 可信度（法线几乎正对镜头时接近 0，调用方退回固定角度）。
 * flowBins：方向按 π/8 分 8 档，取相邻两档与过渡权重。每一档的条纹相位是全局连续的 dot(p, 档方向)，
 *   不会因为方向场弯曲而扭曲；两档之间只在很窄的过渡带里交叉淡化（像刻刀在这里换了个方向下刀）。
 * flowDepthPx：把线性深度换成"像素"，加进相位后条纹就是一组斜切形体的平面与表面的交线：曲面上的线跟着弯。
 */
export const FLOW_LIB = /* glsl */ `
const float FLOW_PI = 3.14159265;
vec2 formGrad(sampler2D tN, sampler2D tD, vec2 uv, float r, out float conf) {
  vec2 px = 1.0 / uRes;
  float rawC = texture(tD, uv).r;
  float dc = linDepth(rawC);
  vec2 acc = vec2(0.0);
  float ws = 0.0;
  for (int i = 0; i < 9; i++) {
    vec2 o = i == 0 ? vec2(0.0) : vec2(cos(float(i) * 0.785398), sin(float(i) * 0.785398)) * r;
    vec2 u = uv + o * px;
    float raw = texture(tD, u).r;
    float d = linDepth(raw);
    float w = (1.0 - smoothstep(0.02, 0.08, abs(d - dc) / max(min(d, dc), 1e-3))) * step(raw, 0.99999);
    vec3 n = texture(tN, u).xyz * 2.0 - 1.0;
    acc += n.xy * w;
    ws += w;
  }
  acc /= max(ws, 1e-3);
  conf = rawC > 0.99999 ? 0.0 : length(acc);
  return conf > 1e-4 ? acc / conf : vec2(0.0, 1.0);
}
void flowBins(vec2 g, out vec2 d0, out vec2 d1, out float w) {
  float a = atan(g.y, g.x);
  if (a < 0.0) a += FLOW_PI;
  float x = clamp(a / (FLOW_PI / 8.0), 0.0, 7.9999);
  float k = floor(x);
  float a0 = k * (FLOW_PI / 8.0);
  d0 = vec2(cos(a0), sin(a0));
  // 第 8 档（180°）与第 0 档是同一组线：直接用第 0 档的方向，免得相位反号在 0°/180° 交界处错开
  d1 = k > 6.5 ? vec2(1.0, 0.0) : vec2(cos(a0 + FLOW_PI / 8.0), sin(a0 + FLOW_PI / 8.0));
  w = smoothstep(0.32, 0.68, x - k);
}
float flowDepthPx(float lin, float focus) {
  return lin * uRes.y / (2.0 * uViewHalf.y * (uOrtho > 0.5 ? 1.0 : max(focus, 1e-3)));
}
`;
