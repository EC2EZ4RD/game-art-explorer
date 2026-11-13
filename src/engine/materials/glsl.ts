import { ROLE_COUNT, ROLE_INDEX } from '../../content/roles';
import { MAX_POINT_LIGHTS } from './uniforms';
import { M_DECL, M_LIB } from './glslM';

/*
 * 场景着色器的公共 GLSL。结构刻意贴近 Godot 着色语言：
 *   顶点变形（风、PS1 吸附）≈ vertex()
 *   表面颜色与法线（分带、纹理、凹凸）≈ fragment()
 *   lightModel() 按模型把单个光源变成颜色 ≈ light()
 * 只用两边都有的 GLSL 写法，迁移时主要是改变量名（VERTEX / NORMAL / LIGHT / ATTENUATION）。
 */

const roleDefines = Object.entries(ROLE_INDEX)
  .map(([k, v]) => `#define R_${k.toUpperCase()} ${v}`)
  .join('\n');

export const ROLE_TERRAIN_CODE = 40;

export const SHARED_DECL = /* glsl */ `
#define ROLE_COUNT ${ROLE_COUNT}
#define MAX_POINTS ${MAX_POINT_LIGHTS}
#define ROLE_TERRAIN_CODE ${ROLE_TERRAIN_CODE}
${roleDefines}
uniform float uTime;
uniform float uAnimTime;
uniform vec3 uRoleColors[ROLE_COUNT];
uniform float uVariation;
uniform int uMatPreset;
uniform float uRoughness;
uniform float uSpecular;
uniform float uMetalness;
uniform float uBump;
uniform float uGrain;
uniform int uModel;
uniform int uSteps;
uniform float uThreshold;
uniform float uSoftness;
uniform vec3 uShadowColor;
uniform float uShadowTint;
uniform float uShadowDepth;
uniform float uQuantShadow;
uniform float uAmbient;
uniform float uWrap;
uniform float uRim;
uniform float uRimWidth;
uniform float uHighlight;
uniform float uHatchScale;
uniform float uHatchWorld;
uniform float uFlatMode;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmb;
uniform vec3 uGroundAmb;
uniform float uCloudShadow;
uniform vec3 uPointPos[MAX_POINTS];
uniform vec3 uPointColor[MAX_POINTS];
uniform float uPointRange[MAX_POINTS];
uniform int uPointCount;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform int uShadowMode;
uniform float uShadowRadius;
uniform float uShadowStrength;
uniform float uShadowTexel;
uniform float uShadowBias;
uniform int uFogMode;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec2 uFogRange;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform int uSkyMode;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform float uTerrainAmp;
uniform float uSea;
uniform float uBeach;
uniform float uHighland;
uniform float uSnow;
uniform int uBiomeMode;
uniform int uBlendMode;
uniform float uTerrainBottom;
uniform float uWind;
uniform float uSnap;
uniform vec2 uResolution;
uniform int uBendMode;
uniform float uBend;
uniform vec3 uBendCenter;
uniform vec2 uBendAxis;
uniform int uTexMode;
uniform float uTexScale;
uniform float uTexAmount;
uniform float uAffine;
uniform int uDetailMode;
uniform float uDetailScale;
uniform sampler2D tDetailN;
uniform sampler2D tDetailH;
uniform int uCunMode;
uniform float uCunAmount;
uniform float uCunScale;
uniform sampler2D tCun;
uniform float uWeather;
uniform float uWeatherScale;
uniform sampler2D tWeather;
uniform int uPapercut;
uniform float uPapercutScale;
uniform sampler2D tPapercut;
uniform float uWindowFlower;
uniform sampler2D tWindow;
uniform int uHatchTex;
uniform sampler2D tTam1;
uniform sampler2D tTam2;
uniform float uOutlineWidth;
uniform int uOutlineMode;
uniform int uOutlineColorMode;
uniform vec3 uOutlineColor;
uniform float uOutlineRaw;
uniform float uOutlineMask[ROLE_COUNT];
uniform float uOutlineTerrain;
uniform float uViewHeight;
uniform vec4 uBlob;
${M_DECL}
`;

export const NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise3(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float vnoise2(vec2 x) {
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise3(p); p *= 2.03; a *= 0.5; }
  return s;
}
`;

/** 顶点阶段公共：风摆 + PS1 顶点吸附 */
export const VERTEX_COMMON = /* glsl */ `
vec3 applyWind(vec3 wp, float sway) {
  if (sway <= 0.0 || uWind <= 0.0) return wp;
  float t = uAnimTime;
  float s = sway * uWind;
  wp.x += sin(t * 1.7 + wp.x * 0.35 + wp.z * 0.25) * 0.16 * s;
  wp.z += cos(t * 1.3 + wp.z * 0.33 + wp.x * 0.1) * 0.11 * s;
  return wp;
}
/* 世界弯曲：按离焦点的水平距离平方下沉。1 = 球面（小星球），2 = 只沿镜头前后（滚筒） */
vec3 applyBend(vec3 wp) {
  if (uBendMode == 0) return wp;
  vec2 d = wp.xz - uBendCenter.xz;
  // 滚筒只弯镜头前方：焦点放在画面下沿，越往前沉得越多，前景保持平整
  float ahead = max(dot(d, uBendAxis), 0.0);
  float t = uBendMode == 1 ? dot(d, d) : ahead * ahead;
  wp.y -= uBend * t;
  return wp;
}
vec4 applySnap(vec4 clip) {
  if (uSnap <= 0.0) return clip;
  float g = mix(uResolution.y * 0.25, 40.0, uSnap);
  vec3 ndc = clip.xyz / clip.w;
  ndc.xy = floor(ndc.xy * g + 0.5) / g;
  return vec4(ndc * clip.w, clip.w);
}
`;

/** 片元阶段：取色、地形分带、阴影、光照模型 */
export const SURFACE_LIB = /* glsl */ `
vec3 roleColor(int r) { return uRoleColors[clamp(r, 0, ROLE_COUNT - 1)]; }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
/* 低清像素贴图：32×32 的程序图案（0 泥土斑点、1 砖、2 木板、3 瓦），q 为整数纹素坐标 */
float hashT(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float patternTexel(int pat, vec2 q) {
  q = mod(q, 32.0);
  float n = hashT(q + float(pat) * 37.0);
  if (pat == 1) {
    float row = floor(q.y / 8.0);
    float x = q.x + (mod(row, 2.0) > 0.5 ? 8.0 : 0.0);
    bool mortar = mod(q.y, 8.0) < 1.0 || mod(x, 16.0) < 1.0;
    return mortar ? 0.4 : 0.78 + 0.16 * hashT(vec2(floor(x / 16.0), row)) + 0.08 * (n - 0.5);
  }
  if (pat == 2) {
    float plank = floor(q.x / 8.0);
    bool seam = mod(q.x, 8.0) < 1.0 || mod(q.y + plank * 11.0, 32.0) < 1.0;
    float grain = 0.86 + 0.14 * hashT(vec2(q.x, floor(q.y / 5.0)));
    return seam ? 0.45 : grain * (0.86 + 0.14 * hashT(vec2(plank, 3.0)));
  }
  if (pat == 3) {
    float r = mod(q.y, 6.0);
    float x = q.x + (mod(floor(q.y / 6.0), 2.0) > 0.5 ? 3.0 : 0.0);
    return (r < 1.0 ? 0.5 : 0.74 + r * 0.05) * (mod(x, 6.0) < 1.0 ? 0.78 : 1.0);
  }
  return 0.8 + 0.2 * n - (hashT(floor(q / 2.0) + 5.0) > 0.86 ? 0.22 : 0.0);
}
/* 过滤方式：1 最近邻；2 N64 三点过滤（三角形内插）；3 双线性 */
float samplePattern(int pat, vec2 p) {
  if (uTexMode == 1) return patternTexel(pat, floor(p));
  vec2 b = floor(p - 0.5);
  vec2 f = p - 0.5 - b;
  float A = patternTexel(pat, b), B = patternTexel(pat, b + vec2(1.0, 0.0));
  float C = patternTexel(pat, b + vec2(0.0, 1.0)), D = patternTexel(pat, b + vec2(1.0, 1.0));
  if (uTexMode == 2) return f.x + f.y < 1.0 ? A + f.x * (B - A) + f.y * (C - A) : D + (1.0 - f.x) * (C - D) + (1.0 - f.y) * (B - D);
  return mix(mix(A, B, f.x), mix(C, D, f.x), f.y);
}
/* 颜色角色 → 图案；-1 不加贴图（角色、发光体、水、玻璃等） */
int patternOf(int role, bool terrain) {
  if (terrain) return 0;
  if (role == R_STRUCTURE || role == R_STONE) return 1;
  if (role == R_WOOD || role == R_TRIM || role == R_TRUNK) return 2;
  if (role == R_ROOF) return 3;
  if (role == R_SAND || role == R_GRASS || role == R_HIGHLAND || role == R_ROCK || role == R_SOIL || role == R_PATH || role == R_SNOW) return 0;
  return -1;
}
/*
 * 三平面取样（不需要 UV）：按世界坐标从 X / Y / Z 三个方向投影取样，按法线分量的 4 次方混合。
 * 侧面的 v 取 -y：图片上方 = 世界上方（纹理 flipY = false，v = 0 是图片第一行）。
 */
vec3 triW(vec3 N) { vec3 w = pow(abs(N), vec3(4.0)); return w / (w.x + w.y + w.z); }
float triTex(sampler2D t, vec3 p, vec3 N, float s) {
  vec3 w = triW(N);
  return texture(t, vec2(p.z, -p.y) * s).r * w.x + texture(t, p.xz * s).r * w.y + texture(t, vec2(p.x, -p.y) * s).r * w.z;
}
/* 三平面法线贴图（OpenGL 约定，绿 = 图片上方）：每个投影面用自己的切线 T = dP/du、副切线 B = 图片上方对应的世界方向 */
vec3 triNormal(sampler2D t, vec3 p, vec3 N, float s, float k) {
  vec3 w = triW(N);
  vec3 a = texture(t, vec2(p.z, -p.y) * s).xyz * 2.0 - 1.0;
  vec3 b = texture(t, p.xz * s).xyz * 2.0 - 1.0;
  vec3 c = texture(t, vec2(p.x, -p.y) * s).xyz * 2.0 - 1.0;
  vec3 nx = normalize(vec3(0.0, 0.0, 1.0) * a.x * k + vec3(0.0, 1.0, 0.0) * a.y * k + N * a.z);
  vec3 ny = normalize(vec3(1.0, 0.0, 0.0) * b.x * k + vec3(0.0, 0.0, -1.0) * b.y * k + N * b.z);
  vec3 nz = normalize(vec3(1.0, 0.0, 0.0) * c.x * k + vec3(0.0, 1.0, 0.0) * c.y * k + N * c.z);
  return normalize(nx * w.x + ny * w.y + nz * w.z);
}
/* 色调排线图：tone 0（纸白）~ 1（最暗），在相邻两级之间插值；返回纸的比例（1 = 白） */
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
bool isCunRole(int role, bool terrain) { return terrain || role == R_ROCK || role == R_STONE || role == R_HIGHLAND || role == R_SOIL; }
bool isWearRole(int role) { return role == R_STRUCTURE || role == R_WOOD || role == R_TRIM || role == R_STONE || role == R_ROOF || role == R_METAL; }
bool isCutRole(int role, bool terrain) {
  if (terrain || uPapercut == 0) return false;
  bool arch = role == R_STRUCTURE || role == R_ROOF || role == R_TRIM || role == R_WOOD || role == R_STONE || role == R_PAPER;
  bool veg = role == R_FOLIAGE || role == R_FOLIAGE2 || role == R_FLOWER;
  if (uPapercut == 1) return arch;
  if (uPapercut == 2) return veg;
  return arch || veg || role == R_INTERACTIVE || role == R_METAL || role == R_CLOTH;
}
float bandStep(float edge, float x, float w) { return w <= 0.0001 ? step(edge, x) : smoothstep(edge - w, edge + w, x); }

/* 地形分带：h 为归一化高度，slope = 1 - N.y，moist 0~1 */
vec3 terrainColor(float h, float slope, float moist, float w) {
  vec3 sand = roleColor(R_SAND), grass = roleColor(R_GRASS), high = roleColor(R_HIGHLAND);
  vec3 snow = roleColor(R_SNOW), rock = roleColor(R_ROCK);
  if (uBiomeMode == 3) return grass;
  if (uBiomeMode == 2) {
    grass = mix(mix(sand, grass, 0.55), mix(grass, roleColor(R_FOLIAGE), 0.35), smoothstep(0.35, 0.65, moist));
    high = mix(mix(high, rock, 0.35), high, smoothstep(0.3, 0.7, moist));
  }
  float s1 = uSea + uBeach;
  vec3 c = mix(sand, grass, bandStep(s1, h, w));
  c = mix(c, high, bandStep(uHighland, h, w));
  c = mix(c, snow, bandStep(uSnow, h, w));
  if (uBiomeMode == 1) c = mix(c, rock, bandStep(0.42, slope, w) * bandStep(s1, h, w) * (1.0 - bandStep(uSnow + 0.05, h, w) * 0.5));
  if (h < uSea - 0.002) c = mix(sand, roleColor(R_WATERDEEP), 0.3) * 0.9;
  return c;
}

float vogelShadow(vec2 uv, float z, float radius) {
  float sum = 0.0;
  float rot = hash12(gl_FragCoord.xy) * 6.2831853;
  for (int i = 0; i < 12; i++) {
    float r = sqrt((float(i) + 0.5) / 12.0);
    float th = float(i) * 2.4 + rot;
    vec2 o = vec2(cos(th), sin(th)) * r * radius * uShadowTexel;
    sum += step(z, texture(uShadowMap, uv + o).r);
  }
  return sum / 12.0;
}

/* 返回 0（全影）~1（全亮） */
float sampleShadow(vec3 wp, vec3 N) {
  if (uShadowMode == 0 || uShadowMode == 4) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp + N * 0.04, 1.0);
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if (c.x <= 0.0 || c.x >= 1.0 || c.y <= 0.0 || c.y >= 1.0 || c.z >= 1.0) return 1.0;
  float z = c.z - uShadowBias;
  float s;
  if (uShadowMode == 1) s = step(z, texture(uShadowMap, c.xy).r);
  else {
    s = vogelShadow(c.xy, z, uShadowRadius);
    if (uShadowMode == 3) s = smoothstep(0.38, 0.62, s);
  }
  return s;
}

float softBand(float x, float edge, float w) { return smoothstep(edge - w - 0.0005, edge + w + 0.0005, x); }

/* 色阶：x ∈ [0,1]，N 阶，边缘软化 w */
float celLevels(float x, int n, float w) {
  float acc = 0.0;
  for (int k = 1; k < 6; k++) {
    if (k >= n) break;
    acc += softBand(x, float(k) / float(n), w);
  }
  return acc / float(max(n - 1, 1));
}

/* 内置式卡通色阶：half-Lambert 坐标查 N 格最近邻 ramp，投影不参与量化 */
float toonRampLevel(float ndl) {
  float coord = clamp(ndl * 0.5 + 0.5 + uThreshold * 0.5, 0.0, 0.9999);
  float n = float(uSteps);
  return floor(coord * n) / max(n - 1.0, 1.0);
}

vec3 shadowTintColor() {
  vec3 sc = uShadowColor / max(max(uShadowColor.r, max(uShadowColor.g, uShadowColor.b)), 0.01);
  return mix(vec3(1.0), sc, uShadowTint);
}

float presetSpec() {
  if (uMatPreset == 1) return 1.0;   // 塑料
  if (uMatPreset == 2) return 0.18;  // 黏土
  if (uMatPreset == 3) return 0.9;   // 陶瓷
  if (uMatPreset == 5) return 1.0;   // 金属
  if (uMatPreset == 7) return 0.12;  // 石
  if (uMatPreset == 8) return 0.15;  // 木
  return 0.0;
}

/*
 * 单个光源 → 颜色（≈ Godot 的 light()）。
 * base 固有色，L 光方向，lc 光颜色（已含强度），shadow 0~1。
 */
vec3 lightModel(vec3 base, vec3 N, vec3 V, vec3 L, vec3 lc, float shadow, bool primary) {
  float ndl = dot(N, L);
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = presetSpec() * uSpecular;
  if (uModel == 1) { // 兰伯特
    vec3 c = base * lc * max(ndl, 0.0) * shadow;
    c += lc * spec * pow(ndh, mix(120.0, 6.0, uRoughness)) * step(0.0, ndl) * shadow;
    return c;
  }
  if (uModel == 2) { // 半兰伯特 / 包裹
    float d = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);
    vec3 c = base * lc * d * mix(1.0, shadow, 0.85);
    c += lc * spec * pow(ndh, mix(120.0, 6.0, uRoughness)) * step(0.0, ndl) * shadow;
    return c;
  }
  if (uModel == 3) { // 内置式卡通色阶（MeshToonMaterial 行为）
    float lev = toonRampLevel(ndl);
    vec3 c = base * lc * lev * shadow;
    return c;
  }
  if (uModel == 4) { // 自定义赛璐璐
    float x = clamp(ndl * 0.5 + 0.5 + uThreshold * 0.5, 0.0, 1.0);
    if (uQuantShadow > 0.5) x *= mix(0.0, 1.0, shadow);
    float lev = celLevels(x, uSteps, uSoftness);
    if (!primary) return base * lc * lev * 0.6;
    vec3 dark = base * uShadowDepth * shadowTintColor();
    vec3 litc = base * lc;
    vec3 c = mix(dark, litc, lev);
    if (uQuantShadow < 0.5) c = mix(dark, c, mix(1.0, shadow, uShadowStrength));
    float hl = softBand(ndh, 1.0 - (0.004 + uRoughness * 0.06), 0.002) * (uHighlight + spec * 0.6) * lev;
    return c + lc * hl;
  }
  if (uModel == 5) { // Gooch 冷暖
    float t = clamp(ndl * 0.5 + 0.5, 0.0, 1.0) * mix(0.55, 1.0, shadow);
    vec3 cool = mix(base * 0.3, uShadowColor, 0.45 * (0.5 + uShadowTint));
    vec3 warm = base * lc * 1.05 + vec3(0.06, 0.04, 0.0);
    return mix(cool, warm, t);
  }
  if (uModel == 6) { // 物理材质（GGX）
    float nl = max(ndl, 0.0), nv = max(dot(N, V), 1e-3);
    float a = max(uRoughness * uRoughness, 0.002);
    float a2 = a * a;
    float dd = ndh * ndh * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159 * dd * dd);
    float k = (uRoughness + 1.0) * (uRoughness + 1.0) / 8.0;
    float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
    vec3 F0 = mix(vec3(0.04), base, uMetalness);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
    vec3 specc = D * G * F / max(4.0 * nl * nv, 1e-3) * (0.5 + uSpecular);
    vec3 diff = (1.0 - F) * (1.0 - uMetalness) * base;
    return (diff + specc) * lc * nl * shadow;
  }
  // 排线与默认：灰度强度
  return base * lc * max(ndl, 0.0) * shadow;
}

float hatchLine(vec2 c, float ang, float width) {
  vec2 d = vec2(cos(ang), sin(ang));
  float v = abs(fract(dot(c, d)) - 0.5) * 2.0;
  return 1.0 - smoothstep(width, width + 0.18, v);
}

vec3 applyFog(vec3 col, vec3 wp, float viewDepth) {
  if (uFogMode == 0) return col;
  float f;
  if (uFogMode == 2) {
    float hh = (wp.y - uSea * uTerrainAmp) / max(uTerrainAmp, 0.1);
    f = (1.0 - smoothstep(-0.05, 0.45, hh)) * uFogDensity * 1.4;
    f = max(f, smoothstep(uFogRange.x, uFogRange.y, viewDepth) * 0.6);
  } else {
    f = smoothstep(uFogRange.x, uFogRange.y, viewDepth);
    if (uFogMode == 3) f = floor(f * 4.0 + 0.3) / 4.0;
  }
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}
${M_LIB}
`;
