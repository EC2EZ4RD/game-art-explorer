/*
 * 技术补全 M 轨道（材质与灯光，2026-10-23）的公共 GLSL。所有开关都是 uniform，默认关时这些分支一次也不进，画面与原来逐像素一致。
 *   M_DECL     uniform 声明（拼在 SHARED_DECL 后面）
 *   VERTEX_M   顶点阶段：逐帧形变、体素角落遮蔽、逐顶点光照（需要 NOISE）
 *   M_LIB      片元阶段：天空环境光照（球谐 + 反射）、方块贴图、龟裂、青花 / 掐丝珐琅 / 剔红图案、抖动透明
 * 迁移到 Godot：环境光照 ≈ WorldEnvironment 的天空环境光 + 反射（Sky 贴图的辐照度 / 粗糙度预滤波）；其余写进 spatial 着色器。
 */

export const M_DECL = /* glsl */ `
uniform float uEnvLight;
uniform vec3 uSH[9];
uniform vec3 uEnvGround;
uniform int uEnvReflect;
uniform float uEnvAmount;
uniform float uCoat;
uniform float uCoatRough;
uniform float uSss;
uniform vec3 uSssColor;
uniform int uSssScope;
uniform int uSpotCount;
uniform vec3 uSpotPos[3];
uniform vec3 uSpotDir[3];
uniform vec3 uSpotColor[3];
uniform vec2 uSpotCone[3];
uniform float uSpotRange[3];
uniform float uSpotShadow;
uniform float uWire;
uniform float uWireWidth;
uniform int uWireFill;
uniform float uWireGlow;
uniform int uWireColor;
uniform float uVoxelAO;
uniform float uBlocks;
uniform float uVoxelSize;
uniform float uCracks;
uniform float uCrackScale;
uniform float uGrime;
uniform float uBoil;
uniform float uBoilSeed;
uniform int uScreenDoor;
uniform float uVertexLit;
uniform int uMatExt;
uniform float uPatScale;
uniform float uFuzz;
uniform float uSpriteNormal;
`;

/** 顶点阶段（拼在 SHARED_DECL、NOISE 之后） */
export const VERTEX_M = /* glsl */ `
/* 逐帧形变（定格动画的颤动）：按世界位置取平滑噪声位移，每一拍换一个种子；同一位置的顶点位移相同，折面不裂缝 */
vec3 boilOffset(vec3 p) {
  vec3 q = p * 1.9 + vec3(uBoilSeed * 7.31, uBoilSeed * 3.17, uBoilSeed * 5.71);
  return (vec3(vnoise3(q), vnoise3(q + 19.1), vnoise3(q + 37.7)) - 0.5) * uBoil;
}
/* 体素邻居掩码：27 格（含自己，第 13 位恒为 1 当作「有数据」）拆成两个整数，低 14 位 / 高 13 位 */
int voxBit(ivec2 mk, ivec3 d) {
  int i = (d.x + 1) * 9 + (d.y + 1) * 3 + (d.z + 1);
  return i < 14 ? (mk.x >> i) & 1 : (mk.y >> (i - 14)) & 1;
}
/* Minecraft 式角落遮蔽：这个顶点所在面外侧的两条边、一个角各有没有方块；两边都有 = 最暗 */
float voxelCornerAO(ivec2 mk, vec3 nrm, vec3 p) {
  vec3 a = abs(nrm);
  vec3 fa = (a.x >= a.y && a.x >= a.z) ? vec3(1.0, 0.0, 0.0) : (a.y >= a.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  vec3 o = fa * sign(nrm);
  vec3 other = 1.0 - fa;
  vec3 eb = other.x > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 ec = other.z > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 sp = vec3(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0, p.z >= 0.0 ? 1.0 : -1.0);
  int s1 = voxBit(mk, ivec3(o + eb * sp));
  int s2 = voxBit(mk, ivec3(o + ec * sp));
  int c = voxBit(mk, ivec3(o + (eb + ec) * sp));
  int lv = (s1 == 1 && s2 == 1) ? 0 : 3 - (s1 + s2 + c);
  return float(lv) / 3.0;
}
/* 逐顶点光照（Gouraud，PS1 / N64）：天光 + 点光源 + 聚光，按顶点算好插值；太阳的 N·L 单独输出，投影在片元里乘 */
vec3 gouraudFill(vec3 wp, vec3 n, float ao) {
  vec3 c = mix(uGroundAmb, uSkyAmb, n.y * 0.5 + 0.5) * uAmbient;
  for (int i = 0; i < MAX_POINTS; i++) {
    if (i >= uPointCount) break;
    vec3 Ld = uPointPos[i] - wp;
    float d = max(length(Ld), 1e-4);
    float a = clamp(1.0 - d / uPointRange[i], 0.0, 1.0);
    c += uPointColor[i] * a * a * max(dot(n, Ld / d), 0.0);
  }
  for (int i = 0; i < 3; i++) {
    if (i >= uSpotCount) break;
    vec3 Ld = uSpotPos[i] - wp;
    float d = max(length(Ld), 1e-4);
    vec3 L = Ld / d;
    float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, dot(-L, uSpotDir[i]));
    float a = clamp(1.0 - d / uSpotRange[i], 0.0, 1.0);
    c += uSpotColor[i] * cone * a * max(dot(n, L), 0.0);
  }
  // 烘焙式暗角：缝里（体素角落）与朝下的面压暗，像预先烘进顶点色的 AO
  return c * mix(0.5, 1.0, ao) * mix(0.72, 1.0, smoothstep(-0.6, 0.3, n.y));
}
`;

/** 片元阶段（拼在 SURFACE_LIB 末尾；用到 NOISE 与 SURFACE_LIB 里的 roleColor / hashT / lum / softBand） */
export const M_LIB = /* glsl */ `
float bayer4(vec2 fc) {
  ivec2 q = ivec2(fc) & 3;
  int B[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(B[q.y * 4 + q.x]) + 0.5) / 16.0;
}
vec3 hueOf(vec3 c) { return c / max(max(c.r, max(c.g, c.b)), 1e-3); }

/* ---------- 天空环境光照 ---------- */
/* 二阶球谐辐照度（系数在 JS 里按当前天空、太阳、地面反光算好，已含卷积核与 1/π：乘固有色就是漫反射） */
vec3 envIrradiance(vec3 n) {
  return max(uSH[0] + uSH[1] * n.y + uSH[2] * n.z + uSH[3] * n.x
    + uSH[4] * (n.x * n.y) + uSH[5] * (n.y * n.z) + uSH[6] * (3.0 * n.z * n.z - 1.0)
    + uSH[7] * (n.x * n.z) + uSH[8] * (n.x * n.x - n.y * n.y), vec3(0.0));
}
/* 天空的辐射：地平线 → 天顶的渐变 + 太阳周围的天光 + 地面反光；粗糙度越大地平线越糊 */
vec3 envSky(vec3 d, float rough) {
  float w = 0.012 + rough * 0.5;
  float up = smoothstep(-w, w, d.y);
  vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.7, max(d.y, 0.0)));
  sky += uSunColor * (pow(max(dot(d, uSunDir), 0.0), 3.0) * 0.45 + pow(max(dot(d, uSunDir), 0.0), 24.0) * 0.6);
  vec3 gnd = uEnvGround * mix(1.0, 0.65, smoothstep(0.0, 0.6, -d.y));
  return mix(gnd, sky, up);
}
/* 按粗糙度取反射：光滑时是清楚的天空与地平线，粗糙时退成辐照度（像预滤波的反射探针） */
vec3 envSpecular(vec3 R, float rough) {
  return mix(envSky(R, rough), envIrradiance(R) * 1.1, smoothstep(0.3, 0.95, rough));
}
/* 环境 BRDF 的解析近似（Karis 2014，移动端常用），返回 F0 的缩放与偏移 */
vec2 envBRDF(float rough, float nv) {
  vec4 r = rough * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a004 + r.zw;
}
/* 太阳在镜面里的亮点 */
vec3 sunGlint(vec3 R, float rough) {
  float p = mix(2400.0, 40.0, clamp(rough * 3.0, 0.0, 1.0));
  return uSunColor * min(pow(max(dot(R, uSunDir), 0.0), p) * p * 0.02, 24.0);
}
/* 球面反射贴图（老式 sphere map / 材质球）：按视角法线查一张程序画的「影棚球」——上方天光、左上窗格高光、深色地平线、下方地面 */
vec3 sphereMap(vec3 vn) {
  vec2 s = vn.xy;
  vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.9, s.y)) * 1.15;
  vec3 gnd = uEnvGround * 0.8;
  vec3 c = mix(gnd, sky, smoothstep(-0.14, -0.02, s.y));
  c *= 1.0 - 0.55 * exp(-pow((s.y + 0.08) * 9.0, 2.0)); // 地平线暗带
  vec2 wq = (s - vec2(-0.36, 0.42)) * vec2(1.0, 1.25);
  float win = smoothstep(0.24, 0.2, max(abs(wq.x), abs(wq.y)));
  float bars = step(0.025, abs(wq.x)) * step(0.025, abs(wq.y));
  c += vec3(1.0) * win * bars * 2.2; // 窗格高光
  c += vec3(1.0) * pow(max(0.0, 1.0 - length(s - vec2(0.42, 0.5)) * 3.0), 3.0) * 0.6; // 补光
  return c * (0.75 + 0.25 * vn.z) + mix(sky, gnd, 0.5) * pow(1.0 - vn.z, 3.0) * 0.5;
}

/* ---------- 程序图案的公共件 ---------- */
/* 二维 Voronoi：返回 (F1, F2, 胞编号哈希)，rel = 当前点到最近胞心的向量 */
vec3 voronoi2(vec2 p, out vec2 rel) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  rel = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(hash12(i + g), hash12(i + g + 17.3));
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(i + g + 41.7); rel = r; } else if (d < d2) d2 = d;
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
/* 高度 → 法线（屏幕导数，Mikkelsen 2010）：不需要切线；h 的单位跟 k 一起决定起伏 */
vec3 bumpFromHeight(vec3 N, vec3 p, float h, float k) {
  vec3 dpdx = dFdx(p), dpdy = dFdy(p);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - k * grad);
}

/* ---------- 16px 方块贴图（Minecraft 式） ---------- */
/* q：方块面内的整数纹素坐标 0..15（y 向上）；c 主色，alt 副色（草侧的草、原木截面的木芯） */
float hb(vec2 q, float s) { return hashT(q + s * 37.0); }
vec3 blockTex(int k, vec2 q, vec3 c, vec3 alt) {
  float n = hb(q, float(k));
  if (k == 0) return c * (0.7 + 0.34 * n - (hb(floor(q / 2.0), 3.0) > 0.84 ? 0.16 : 0.0));          // 泥土
  if (k == 1) return c * (0.72 + 0.36 * n);                                                         // 草顶
  if (k == 2) {                                                                                     // 草侧：泥土 + 顶上参差的草边
    float h = 3.0 + step(0.45, hb(vec2(q.x, 0.0), 5.0)) + step(0.8, hb(vec2(q.x, 1.0), 6.0));
    return q.y >= 16.0 - h ? alt * (0.72 + 0.36 * n) : c * (0.7 + 0.34 * n);
  }
  if (k == 3) return c * (0.8 + 0.2 * n - (hb(floor(q / vec2(3.0, 1.0)), 4.0) > 0.8 ? 0.15 : 0.0)); // 石头
  if (k == 4) {                                                                                     // 圆石
    vec2 rel; vec3 v = voronoi2((q + 0.5) / 4.3 + 3.0, rel);
    return v.y - v.x < 0.2 ? c * 0.48 : c * (0.72 + 0.3 * v.z + 0.08 * n);
  }
  if (k == 5) {                                                                                     // 木板
    float pl = floor(q.y / 4.0);
    bool seam = mod(q.y, 4.0) < 1.0 || mod(q.x + pl * 5.0, 16.0) < 1.0;
    return seam ? c * 0.55 : c * (0.82 + 0.1 * hb(vec2(floor(q.x / 3.0), q.y), 7.0) + 0.08 * hb(vec2(pl, 2.0), 8.0));
  }
  if (k == 6) return c * (0.6 + 0.28 * hb(vec2(q.x, floor(q.y / 4.0 + hb(vec2(q.x, 9.0), 8.0) * 3.0)), 9.0)); // 原木侧：竖向树皮
  if (k == 7) {                                                                                     // 原木截面：年轮
    float d = max(abs(q.x - 7.5), abs(q.y - 7.5));
    return d > 6.4 ? c * (0.55 + 0.15 * n) : alt * (mod(floor(d), 3.0) < 1.0 ? 0.78 : 0.95 + 0.05 * n);
  }
  if (k == 8) return c * (0.86 + 0.18 * n);                                                         // 沙
  if (k == 9) return n < 0.22 ? c * 0.42 : c * (0.74 + 0.36 * hb(q, 19.0));                          // 树叶
  if (k == 10) return c * (0.93 + 0.07 * n);                                                        // 雪
  if (k == 11) {                                                                                    // 砖
    float row = floor(q.y / 4.0);
    float x = q.x + mod(row, 2.0) * 4.0;
    bool mortar = mod(q.y, 4.0) < 1.0 || mod(x, 8.0) < 1.0;
    return mortar ? mix(c, vec3(0.75), 0.55) : c * (0.78 + 0.2 * hb(vec2(floor(x / 8.0), row), 11.0) + 0.06 * (n - 0.5));
  }
  if (k == 12) {                                                                                    // 铁块
    bool edge = q.x < 1.0 || q.y < 1.0 || q.x > 14.0 || q.y > 14.0;
    return c * (edge ? 0.68 : (abs(q.y - 7.5) < 0.6 ? 0.84 : 0.95 + 0.05 * n));
  }
  if (k == 13) return c * (0.75 + 0.55 * step(0.5, hb(floor(q / 3.0), 13.0)) * (0.8 + 0.2 * n));   // 萤石
  if (k == 15) {                                                                                    // 玻璃：浅色框 + 斜向反光
    bool edge = q.x < 1.0 || q.y < 1.0 || q.x > 14.0 || q.y > 14.0;
    bool streak = abs(q.x - q.y - 3.0) < 0.6 || abs(q.x - q.y + 5.0) < 0.6;
    return edge ? mix(c, vec3(1.0), 0.5) : (streak ? mix(c, vec3(1.0), 0.35) : c);
  }
  if (k == 16) return c * (0.82 + 0.18 * hb(vec2(q.x + floor(q.y / 3.0) * 5.0, floor(q.y / 3.0)), 16.0)); // 水
  return c * (0.85 + 0.12 * n + 0.05 * sin(q.x * 1.6 + q.y * 0.9));                                 // 羊毛
}
/* 地形分带（与 terrainColor 同样的阈值）：0 沙 1 草 2 高地 3 雪 4 岩坡 */
int terrainBand(float h, float slope) {
  if (uBiomeMode == 1 && slope > 0.42 && h > uSea + uBeach && h < uSnow + 0.05) return 4;
  if (h < uSea + uBeach) return 0;
  if (h < uHighland) return 1;
  if (h < uSnow) return 2;
  return 3;
}
int blockKind(int role, bool terrain, int band, bool top, bool above, bool cap) {
  if (terrain) {
    if (band == 0) return 8;
    if (band == 1) return top ? 1 : (above ? 0 : 2);
    if (band == 3) return top ? 10 : 3;
    return 3;
  }
  if (role == R_GRASS) return top ? 1 : (above ? 0 : 2);
  if (role == R_SOIL || role == R_PATH) return 0;
  if (role == R_SAND) return 8;
  if (role == R_SNOW) return 10;
  if (role == R_ROCK || role == R_HIGHLAND) return 3;
  if (role == R_STONE) return 4;
  if (role == R_STRUCTURE) return 11;
  if (role == R_ROOF || role == R_WOOD || role == R_TRIM) return 5;
  if (role == R_TRUNK) return cap ? 7 : 6;
  if (role == R_FOLIAGE || role == R_FOLIAGE2) return 9;
  if (role == R_METAL) return 12;
  if (role == R_EMISSIVE) return 13;
  if (role == R_GLASS) return 15;
  if (role == R_WATER || role == R_WATERDEEP) return 16;
  return 14;
}

/* ---------- 龟裂纹 ---------- */
/* 两级 Voronoi 裂网（大块 + 细碎），覆盖范围由 amount 控制（低时只在斑块里裂）；返回 (裂缝, 裂缝旁的翘边) */
vec2 crackMask(vec2 uv, float amount, float scale) {
  vec2 rel;
  vec2 p = uv * scale * 1.6;
  p += 0.18 * vec2(vnoise2(p * 2.1 + 1.7), vnoise2(p * 2.1 + 9.2));
  vec3 a = voronoi2(p, rel);
  vec3 b = voronoi2(p * 2.7 + 13.0, rel);
  float cover = smoothstep(0.92 - amount * 0.85, 1.02 - amount * 0.85, vnoise2(uv * scale * 0.45 + 4.0) * 0.6 + vnoise2(uv * scale * 1.3) * 0.4);
  float ea = a.y - a.x, eb = (b.y - b.x) / 2.7;
  float wa = 0.026 * (0.4 + vnoise2(p * 3.0)), wb = 0.012 * (0.3 + vnoise2(p * 5.0));
  float fa = fwidth(ea) + 1e-4, fb = fwidth(eb) + 1e-4;
  float ca = 1.0 - smoothstep(wa, wa + fa * 1.2, ea);
  float cb = (1.0 - smoothstep(wb, wb + fb * 1.2, eb)) * smoothstep(0.35, 0.75, cover);
  float crack = max(ca, cb * 0.85) * cover;
  float lip = (smoothstep(wa, wa + fa, ea) - smoothstep(wa * 2.4, wa * 2.4 + fa, ea)) * cover;
  return vec2(crack, lip);
}

/* ---------- 掐丝珐琅 ---------- */
/* 金丝勾出的花叶格（扭曲的 Voronoi 胞边）+ 格子里的卷草小螺旋；enamel = 这一格的釉色；返回金丝遮罩 */
float cloisonne(vec2 uv, vec3 base, out vec3 enamel) {
  vec2 p = uv * 2.4;
  p += 0.38 * vec2(vnoise2(p * 0.9 + 3.1), vnoise2(p * 0.9 + 8.7)) - 0.19;
  vec2 rel;
  vec3 v = voronoi2(p, rel);
  float e = v.y - v.x;
  float aa = fwidth(e) + 1e-4;
  // 远看淡出（收尾 X）：一格小于约 12 像素时金丝和螺线只剩几个像素宽、占了大半格，远景糊成金色噪点——按格子在屏幕上的大小把它们淡掉，只留釉色
  float fp = max(fwidth(p.x), fwidth(p.y));
  float farW = smoothstep(0.05, 0.11, fp), farC = smoothstep(0.025, 0.06, fp);
  float wire = (1.0 - smoothstep(0.045, 0.045 + aa * 1.5, e)) * (1.0 - 0.85 * farW);
  // 卷草：一半的格子里一条阿基米德螺线
  float rr = length(rel);
  float s = fract(rr * 9.0 - atan(rel.y, rel.x) / 6.2832);
  float sd = min(s, 1.0 - s);
  float aas = fwidth(rr * 9.0) + 1e-4;
  float curl = (1.0 - smoothstep(0.07, 0.07 + aas * 1.5, sd)) * step(0.45, v.z) * (1.0 - smoothstep(0.28, 0.36, rr)) * (1.0 - farC);
  wire = max(wire, curl);
  // 釉色：松石蓝地子为主，点缀红、黄、白、宝蓝、绿（取色板的水、强调、花、树冠色混一点）
  float t = v.z;
  vec3 turq = mix(vec3(0.02, 0.36, 0.4), roleColor(R_WATER), 0.3);
  vec3 ec = t < 0.5 ? turq
    : t < 0.64 ? mix(vec3(0.62, 0.04, 0.03), roleColor(R_ACCENT), 0.35)
    : t < 0.76 ? mix(vec3(0.85, 0.55, 0.06), roleColor(R_FLOWER), 0.3)
    : t < 0.86 ? vec3(0.8, 0.78, 0.7)
    : t < 0.94 ? vec3(0.02, 0.07, 0.36)
    : mix(vec3(0.08, 0.32, 0.06), roleColor(R_FOLIAGE), 0.4);
  ec = mix(ec, base, 0.12);
  ec *= 0.8 + 0.2 * smoothstep(0.0, 0.25, e);                     // 釉料在金丝边上积得厚、颜色深
  ec *= 1.0 - 0.35 * step(0.985, hash12(floor(uv * 160.0)));      // 砂眼
  enamel = ec;
  return wire;
}

/* ---------- 青花 ---------- */
/* 白釉上的钴蓝：弦纹、海水纹带、缠枝莲主纹（侧面按世界高度分带）；顶面是散落的团花。返回钴料浓度 0..1 */
float lineBand(float y, float c, float w, float aa) { return 1.0 - smoothstep(w, w + aa, abs(y - c)); }
float qinghua(vec2 uv, float y, bool top) {
  float k = uPatScale;
  if (top) {
    vec2 rel;
    vec3 v = voronoi2(uv * 0.9 * k, rel);
    float r = length(rel), a = atan(rel.y, rel.x);
    float aa = fwidth(r) + 1e-4;
    float petals = 0.2 + 0.05 * cos(a * 6.0 + v.z * 6.0);
    float flower = 1.0 - smoothstep(petals, petals + aa * 1.5, r);
    float heart = 1.0 - smoothstep(0.06, 0.06 + aa, r);
    float ring = lineBand(r, 0.3, 0.012, aa * 1.5) * step(0.5, v.z);
    return max(max(flower * (0.55 + 0.45 * heart), ring), 0.0) * step(0.25, v.z);
  }
  float P = 1.7 / k;
  float fy = fract(y / P);
  float u = uv.x / P;
  float aa = fwidth(fy) + 1e-4;
  // 弦纹：上下各一对细线
  float c = max(max(lineBand(fy, 0.05, 0.008, aa), lineBand(fy, 0.085, 0.005, aa)), max(lineBand(fy, 0.95, 0.008, aa), lineBand(fy, 0.915, 0.005, aa)));
  // 海水纹带：一排扇形浪
  if (fy > 0.11 && fy < 0.24) {
    float t = (fy - 0.11) / 0.13;
    vec2 q = vec2(fract(u * 5.0) - 0.5, t);
    float r = length(q - vec2(0.0, 0.0));
    float arcs = abs(fract(r * 3.2) - 0.5);
    c = max(c, (1.0 - smoothstep(0.12, 0.12 + aa * 25.0, arcs)) * step(r, 1.0) * 0.85);
    c = max(c, lineBand(fy, 0.24, 0.004, aa));
  }
  // 缠枝莲：一条起伏的主茎，峰谷处开花，两侧长叶
  if (fy > 0.27 && fy < 0.88) {
    float ph = u * 6.2832 * 0.8;
    float stemY = 0.575 + 0.16 * sin(ph);
    float sw = 0.009 * (0.7 + 0.6 * vnoise2(vec2(u * 9.0, 1.0)));
    c = max(c, lineBand(fy, stemY, sw, aa));
    // 花：在 sin 的峰与谷
    float fu = fract(u * 0.8 + 0.25) - 0.5;          // 每半个周期一朵
    float fl = fract(u * 1.6 + 0.5) - 0.5;
    vec2 fq = vec2(fl / 1.6 * 1.7, fy - (0.575 + 0.16 * sin(ph)));
    float fr = length(fq * vec2(1.0, 1.3));
    float fa = atan(fq.y, fq.x);
    float petal = 0.085 + 0.03 * abs(cos(fa * 2.5));
    float bloom = 1.0 - smoothstep(petal, petal + aa * 2.0, fr);
    float vein = lineBand(fr, 0.05, 0.006, aa) + lineBand(abs(fa), 1.57, 0.08, 0.05) * step(fr, petal);
    c = max(c, bloom * (0.62 + 0.38 * clamp(vein, 0.0, 1.0)));
    // 叶：茎两侧的小椭圆
    float lu = fract(u * 3.2) - 0.5;
    float side = sign(sin(u * 3.2 * 3.14159));
    vec2 lq = vec2(lu * 0.6, fy - stemY - side * 0.05);
    float leaf = 1.0 - smoothstep(0.05, 0.05 + aa * 2.0, length(lq * vec2(1.0, 2.2)));
    c = max(c, leaf * 0.8);
    c *= step(0.0, fu + 1.0);
  }
  // 钴料的浓淡：笔触里的晕散与「铁锈斑」深点
  float brush = 0.72 + 0.4 * vnoise2(uv * 7.0 * k + y * 3.0);
  float heap = step(0.93, hash12(floor(vec2(uv.x, y) * 90.0))) * 0.35;
  return clamp(c * (brush + heap), 0.0, 1.0);
}

/* ---------- 剔红 ---------- */
/* 锦地（细小的方格回纹）上浮起的花云浮雕，返回高度 0..1 */
float tihong(vec2 uv) {
  vec2 p = uv * 2.6 * uPatScale;
  vec2 g = fract(p * 3.0) - 0.5;
  float bg = smoothstep(0.4, 0.33, max(abs(g.x), abs(g.y))) * (1.0 - smoothstep(0.16, 0.1, max(abs(g.x), abs(g.y))) * 0.6);
  // 锦地格随距离淡出（收尾 X）：一格只剩三四个像素时收成平均值，远看不再是暗褐色的噪点
  bg = mix(bg, 0.5, smoothstep(0.12, 0.3, max(fwidth(p.x * 3.0), fwidth(p.y * 3.0))));
  vec2 w = p * 0.8 + 0.45 * vec2(vnoise2(p * 0.7), vnoise2(p * 0.7 + 4.0));
  vec2 rel;
  vec3 v = voronoi2(w, rel);
  float r = length(rel), a = atan(rel.y, rel.x);
  float lobe = 0.36 + 0.06 * cos(a * 5.0 + v.z * 9.0);
  float motif = (1.0 - smoothstep(lobe - 0.05, lobe, r)) * step(0.2, v.z);
  // 花瓣上的刻线
  float cut = smoothstep(0.9, 0.98, abs(cos(a * 2.5 + v.z * 9.0))) * step(0.11, r) * motif;
  float cush = motif * (0.7 + 0.3 * smoothstep(lobe, 0.05, r)) * (1.0 - cut * 0.7);
  return max(cush, bg * 0.32);
}
`;
