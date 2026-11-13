import * as THREE from 'three';
import { NOISE, SHARED_DECL, SURFACE_LIB, VERTEX_COMMON, ROLE_TERRAIN_CODE } from './glsl';
import { VERTEX_M } from './glslM';
import { U } from './uniforms';

/*
 * 场景里所有材质都是这里的 ShaderMaterial（GLSL3，两个输出：颜色 + 视角法线/角色编号）。
 * 第二个输出给后处理用：边缘检测、按角色保留强调色、剪影诊断。
 */

const OUT = /* glsl */ `
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oNormal;
`;

const VARYINGS = (dir: 'in' | 'out') => /* glsl */ `
${dir} vec3 vWorld;
${dir} vec3 vNormal;
flat ${dir} float vRole;
${dir} float vTint;
flat ${dir} float vFaceH;
${dir} float vViewDepth;
${dir} vec2 vTuv;
${dir} vec3 vAffine;
${dir} vec3 vBary;
${dir} float vVoxAO;
flat ${dir} float vVoxUp;
${dir} vec3 vGour;
${dir} float vSunD;
${dir} float vGround;
`;

const SURFACE_VERT = /* glsl */ `
${SHARED_DECL}
${VERTEX_COMMON}
${NOISE}
${VERTEX_M}
in float aRole;
in float aTint;
in float aSway;
in float aFaceH;
in vec3 aBary;
in vec2 aVox;
in float aGround;
${VARYINGS('out')}
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  wp.xyz = applyWind(wp.xyz, aSway);
  if (uBoil > 0.0) wp.xyz += boilOffset(wp.xyz);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(m) * normal);
  vRole = aRole;
  vTint = aTint;
  vFaceH = aFaceH;
  vec4 mv = viewMatrix * vec4(applyBend(wp.xyz), 1.0);
  vViewDepth = -mv.z;
  vec4 clip = applySnap(projectionMatrix * mv);
  // 贴图坐标：按主法线方向做盒式投影（世界空间，单位 = 米）
  vTuv = abs(vNormal.y) > 0.6 ? wp.xz : (abs(vNormal.x) > abs(vNormal.z) ? wp.zy : wp.xy);
  // 仿射贴图（PS1）：插值 uv·w 与 w，片元里相除 = 屏幕空间线性插值（WebGL2 没有 noperspective）
  vAffine = vec3(vTuv * clip.w, clip.w);
  gl_Position = clip;
  // M 轨道：线框的重心坐标、离地高度、体素角落遮蔽、逐顶点光照（没有对应数据时都是中性值）
  vBary = aBary;
  vGround = aGround;
  vVoxAO = 1.0;
  vVoxUp = 0.0;
  ivec2 mk = ivec2(aVox + 0.5);
  if ((mk.x & 8192) != 0 && (uVoxelAO > 0.0 || uBlocks > 0.5 || uVertexLit > 0.5)) {
    vVoxAO = voxelCornerAO(mk, normal, position);
    vVoxUp = float(voxBit(mk, ivec3(0, 1, 0)));
  }
  vGour = vec3(0.0);
  vSunD = 0.0;
  if (uVertexLit > 0.5) {
    vGour = gouraudFill(wp.xyz, vNormal, vVoxAO);
    vSunD = max(dot(vNormal, uSunDir), 0.0) * mix(0.55, 1.0, vVoxAO);
  }
}
`;

const SURFACE_FRAG = /* glsl */ `
${SHARED_DECL}
${NOISE}
${SURFACE_LIB}
${VARYINGS('in')}
${OUT}
vec3 bumpNormal(vec3 N, vec3 p, float freq, float amount) {
  float e = 0.08 / freq;
  float n0 = vnoise3(p * freq);
  vec3 g = vec3(vnoise3((p + vec3(e, 0, 0)) * freq), vnoise3((p + vec3(0, e, 0)) * freq), vnoise3((p + vec3(0, 0, e)) * freq)) - n0;
  g /= e * freq;
  g -= N * dot(g, N);
  return normalize(N - g * amount * 0.35);
}
/* M：次表面散射作用到哪些角色、有多「薄」（0 = 不作用）：uSssScope 0 有机物 / 1 只角色 / 2 全部 */
float sssThin(int role, bool terrain) {
  bool chr = role == R_CHARACTER || role == R_CHARACTERACCENT || role == R_SKIN || role == R_CLOTH;
  bool leaf = role == R_FOLIAGE || role == R_FOLIAGE2 || role == R_FLOWER;
  if (uSssScope == 1) return chr ? (role == R_SKIN ? 0.75 : 0.55) : 0.0;
  if (leaf) return 1.0;
  if (role == R_PAPER) return 0.9;
  if (chr) return role == R_SKIN ? 0.75 : role == R_CLOTH ? 0.7 : 0.55;
  if (uSssScope == 2) return terrain ? 0.25 : (role == R_EMISSIVE || role == R_WATER || role == R_WATERDEEP || role == R_METAL) ? 0.0 : 0.4;
  return 0.0;
}
bool isCharRole(int role) { return role == R_CHARACTER || role == R_CHARACTERACCENT || role == R_SKIN; }
bool isHardRole(int role) { return role == R_GLASS || role == R_METAL || role == R_WATER || role == R_WATERDEEP || role == R_EMISSIVE; }
void main() {
  vec3 N = normalize(vNormal);
  if (uFlatMode > 0.5) N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  else if (!gl_FrontFacing) N = -N;
  vec3 camFwd = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  vec3 V = isOrthographic ? camFwd : normalize(cameraPosition - vWorld);

  int role = int(floor(vRole + 0.5));
  int roleOut = role;
  bool terrain = vRole < -0.5;
  // 剪纸镂空：遮罩为 0 的地方挖空（露出后面的物体或描边外壳的背面）
  if (isCutRole(role, terrain) && triTex(tPapercut, vWorld, N, uPapercutScale) < 0.5) discard;
  // M：网眼透明（玻璃、树叶边缘）——没有混合，按 4×4 Bayer 阈值丢像素，远看是半透明
  if (uScreenDoor == 2 && !terrain) {
    float sa = 1.0;
    if (role == R_GLASS) sa = 0.42;
    else if (role == R_FOLIAGE || role == R_FOLIAGE2) sa = smoothstep(0.08, 0.45, abs(dot(N, V)) + (vnoise3(vWorld * 2.5) - 0.5) * 0.35);
    if (sa < 0.999 && sa <= bayer4(gl_FragCoord.xy)) discard;
  }
  // M：绒毛的毛边——轮廓处按细密的纤维噪声丢掉一部分像素，剪影变得毛茸茸
  if (uFuzz > 0.0 && !terrain && !isHardRole(role)) {
    float g = 1.0 - abs(dot(N, V));
    if (smoothstep(0.62, 0.98, g) * uFuzz > vnoise3(vWorld * 55.0) * 0.9 + 0.1) discard;
  }
  vec3 base;
  if (vRole < -0.5) {
    float hy = (uBlendMode == 0 ? vFaceH : vWorld.y) / max(uTerrainAmp, 0.01);
    float slope = 1.0 - clamp(N.y, 0.0, 1.0);
    float moist = vnoise2(vWorld.xz * 0.07 + 13.0);
    base = terrainColor(hy, slope, moist, uBlendMode == 2 ? 0.035 : 0.0);
    roleOut = ROLE_TERRAIN_CODE;
  } else {
    base = roleColor(role);
    if (role == R_SOIL) base *= 0.86 + 0.14 * step(0.5, fract(vWorld.y * 1.3));
  }
  base *= 1.0 + (vTint - 0.5) * 2.0 * uVariation;

  // 窗花：纸色部件上贴强调色团花
  if (uWindowFlower > 0.5 && !terrain && role == R_PAPER) base = mix(base, roleColor(R_ACCENT), texture(tWindow, fract(vTuv * 1.6)).r);

  // 剥落做旧：距离场 < 阈值处露出底层，边界压一道暗边（漆皮的厚度）
  if (uWeather > 0.0 && !terrain && isWearRole(role)) {
    float f = triTex(tWeather, vWorld, N, uWeatherScale);
    float peel = 1.0 - smoothstep(uWeather - 0.012, uWeather + 0.012, f);
    float lip = smoothstep(uWeather, uWeather + 0.03, f) * (1.0 - smoothstep(uWeather + 0.03, uWeather + 0.08, f));
    vec3 under = mix(base * 0.78, roleColor(R_SOIL), 0.35);
    base = mix(base * (1.0 - lip * 0.22), under, peel);
  }

  // 低清像素贴图
  if (uTexMode > 0) {
    int pat = patternOf(role, vRole < -0.5);
    if (pat >= 0) {
      vec2 tuv = uAffine > 0.5 ? vAffine.xy / vAffine.z : vTuv;
      base *= mix(1.0, samplePattern(pat, tuv * uTexScale) * 1.18, uTexAmount);
    }
  }

  // M：16px 方块贴图（Minecraft 式）：体素时一个方块面正好 16×16 纹素，按角色 / 地形分带选贴图
  if (uBlocks > 0.5) {
    float bs = uVoxelSize > 0.0 ? uVoxelSize : 1.0;
    vec2 q = floor(fract(vTuv / bs) * 16.0);
    int band = 1;
    if (terrain) band = terrainBand((uBlendMode == 0 ? vFaceH : vWorld.y) / max(uTerrainAmp, 0.01), 1.0 - clamp(N.y, 0.0, 1.0));
    int bk = blockKind(role, terrain, band, N.y > 0.6, vVoxUp > 0.5, abs(N.y) > 0.6);
    vec3 bc = base, alt = base;
    float vt = 1.0 + (vTint - 0.5) * 2.0 * uVariation;
    if (bk == 2 || (bk == 0 && (terrain || role == R_GRASS))) bc = roleColor(R_SOIL) * vt;
    if (bk == 3 && terrain && band == 3) bc = roleColor(R_ROCK) * vt;
    if (bk == 7) alt = roleColor(R_WOOD) * vt;
    base = blockTex(bk, q, bc, alt);
  }
  // M：龟裂纹（墙、石、木、地面）
  if (uCracks > 0.0 && (terrain || isWearRole(role) || role == R_ROCK || role == R_SOIL || role == R_PATH || role == R_SAND || role == R_HIGHLAND)) {
    vec2 cm = crackMask(vTuv, uCracks, uCrackScale);
    base *= 1.0 + cm.y * 0.12;
    base = mix(base, base * 0.3 + roleColor(R_INK) * 0.04, cm.x * 0.9);
  }
  // M：污渍——贴地的泥、向上面的苔、墙面上向下的雨痕、凹处积灰
  if (uGrime > 0.0 && !terrain && (isWearRole(role) || role == R_ROCK || role == R_TRUNK || role == R_INTERACTIVE)) {
    float gn = vnoise2(vTuv * 1.7 + 5.0) * 0.6 + vnoise2(vTuv * 5.3) * 0.4;
    float moss = smoothstep(0.5, 0.9, N.y) * smoothstep(0.72 - uGrime * 0.3, 0.84 - uGrime * 0.3, gn) * (role == R_METAL ? 0.0 : 1.0);
    float vert = 1.0 - smoothstep(0.25, 0.5, abs(N.y));
    float su = abs(N.x) > abs(N.z) ? vWorld.z : vWorld.x;
    float streak = smoothstep(0.5, 0.82, vnoise2(vec2(su * 7.0, vWorld.y * 0.35))) * smoothstep(0.3, 0.7, vnoise2(vec2(su * 1.3, vWorld.y * 0.12) + 3.0)) * vert;
    float hg = vGround > 500.0 ? vGround - 1000.0 : 99.0;
    float foot = (1.0 - smoothstep(0.0, 0.2 + (0.35 + 0.5 * gn) * uGrime, hg)) * (1.0 - smoothstep(0.5, 0.85, N.y));
    vec3 dirt = mix(roleColor(R_SOIL), roleColor(R_INK), 0.3) * 0.5;
    base = mix(base, dirt, clamp((foot * 0.85 + streak * 0.6) * uGrime, 0.0, 0.85));
    base *= 1.0 - 0.3 * uGrime * smoothstep(0.58, 0.82, fbm3(vWorld * 2.2));
    base = mix(base, mix(roleColor(R_FOLIAGE), roleColor(R_GRASS), 0.4) * 0.7, clamp(moss * uGrime * 1.2, 0.0, 0.9));
  }
  // M：新材料预设——掐丝珐琅 / 青花 / 剔红（图案按世界坐标盒式投影，跟着物体走）
  float mGloss = uCoat, mGlossR = uCoatRough, mGold = 0.0, mH = 0.0, mHK = 0.0;
  if (uMatExt > 0 && !isCharRole(role) && role != R_EMISSIVE && role != R_WATER && role != R_WATERDEEP && role != R_GLASS) {
    if (uMatExt == 1) {
      vec3 en;
      float w = cloisonne(vTuv * uPatScale, base, en);
      base = mix(en, vec3(1.0, 0.7, 0.3) * 0.3, w);
      mGold = w; mH = w; mHK = 0.02;
      mGloss = max(mGloss, 0.9); mGlossR = min(mGlossR, 0.05);
    } else if (uMatExt == 2) {
      float cb = qinghua(vTuv, vWorld.y, abs(N.y) > 0.6);
      base = mix(mix(vec3(0.9, 0.93, 0.97), base, 0.08), vec3(0.022, 0.06, 0.32), cb);
      mGloss = max(mGloss, 1.0); mGlossR = min(mGlossR, 0.04);
    } else {
      float th = tihong(vTuv);
      // 朱红漆（收尾 X：底色提亮、少混色板的强调色，凹处 0.22 → 0.45 倍——原来平均下来是一片暗褐，读不出朱红上的浮雕）
      vec3 cin = mix(vec3(0.62, 0.06, 0.03), roleColor(R_ACCENT), 0.08);
      base = mix(cin * 0.45 + vec3(0.015, 0.006, 0.003), cin * (0.88 + 0.18 * th), smoothstep(0.02, 0.3, th));
      mH = th; mHK = 0.08;
      mGloss = max(mGloss, 0.5); mGlossR = min(mGlossR, 0.2);
    }
  }

  // 表面纹理（世界空间，跟随物体）
  if (uGrain > 0.0) base *= 1.0 - uGrain * 0.4 * (fbm3(vWorld * 7.0) - 0.5);
  if (uMatPreset == 6) base *= 0.9 + 0.1 * fbm3(vWorld * vec3(14.0, 3.0, 14.0));
  else if (uMatPreset == 7) base *= 0.82 + 0.3 * vnoise3(vWorld * 6.0);
  else if (uMatPreset == 8) base *= 0.86 + 0.14 * smoothstep(0.35, 0.65, fract(vWorld.y * 2.5 + vnoise3(vWorld * 1.5) * 2.0));

  vec3 Ngeo = N; // M：清漆层用凹凸之前的法线（漆面是平滑的，盖在起伏的底层上）
  // 表面起伏：程序噪声，或三平面法线贴图（黏土指纹、针织）
  if (uBump > 0.0 && uModel != 0) {
    if (uDetailMode > 0) {
      // 针织：针缝压暗（高度低处）；先按几何法线取高度，再扰动法线
      // 黏土：凹处略暗（指纹沟里积灰）；针织：针缝压暗
      float dh = triTex(tDetailH, vWorld, N, uDetailScale);
      if (uDetailMode == 2) base *= mix(1.0, 0.45 + 0.65 * dh, min(1.0, uBump * 1.5));
      else base *= mix(1.0, 0.82 + 0.3 * dh, min(1.0, uBump));
      N = triNormal(tDetailN, vWorld, N, uDetailScale, uBump * (uDetailMode == 1 ? 6.0 : 2.5));
    } else {
      float f = uMatPreset == 2 ? 5.0 : uMatPreset == 7 ? 9.0 : 12.0;
      N = bumpNormal(N, vWorld, f, uBump * (uMatPreset == 2 ? 1.4 : 1.0));
    }
  }
  // M：图案的浮雕（金丝凸起、剔红的刻地）
  if (mHK > 0.0) N = bumpFromHeight(N, vWorld, mH, mHK);

  vec3 col;
  if (uVertexLit > 0.5) {
    // M：逐顶点光照（Gouraud）——环境、灯火、太阳的明暗都按顶点插值，投影仍按片元乘（像烘进顶点色 / 光照贴图的静态光）
    float shV = mix(1.0, sampleShadow(vWorld, N), uShadowStrength);
    col = base * (vGour + uSunColor * vSunD * shV);
  } else if (uModel == 0) {
    col = base;
  } else if (uModel == 8) {
    vec3 vn = normalize((viewMatrix * vec4(N, 0.0)).xyz);
    float d = clamp(dot(vn, normalize(vec3(-0.35, 0.55, 0.75))), 0.0, 1.0);
    col = base * (0.22 + 0.9 * d) + vec3(1.0) * pow(d, 30.0) * 0.45 * (presetSpec() + 0.3) + base * pow(1.0 - vn.z, 3.0) * 0.25;
  } else {
    float sh = sampleShadow(vWorld, N);
    if (uCloudShadow > 0.0) {
      float cs = smoothstep(0.5, 0.72, vnoise2(vWorld.xz * 0.045 + vec2(uAnimTime * 0.03, uAnimTime * 0.01)));
      sh *= 1.0 - uCloudShadow * cs * 0.8;
    }
    float shS = mix(1.0, sh, uShadowStrength);
    vec3 amb = mix(uGroundAmb, uSkyAmb, N.y * 0.5 + 0.5) * uAmbient;
    // M：环境光照——天空的球谐辐照度（天色、太阳一侧的天光、地面反光都在里面）代替两色半球环境光
    float envOcc = 1.0;
    if (uEnvLight > 0.0) {
      vec3 irr = envIrradiance(role == R_CLOUD ? normalize(vec3(N.x, abs(N.y) + 0.5, N.z)) : N);
      irr = mix(vec3(lum(irr)), irr, 0.5); // 色相留一半：黄昏的紫天光乘到绿草上不至于发黑
      // 贴地处的天光被地面和邻近物体挡掉一部分（像烘焙的接触 AO）：离地高度在场景建好后按需算进顶点
      float hgE = vGround > 500.0 ? vGround - 1000.0 : 99.0;
      // 只压竖直面与朝下的面：地板、地块这类贴地的朝上平面本身就是「地面」，不算接触
      envOcc = terrain ? 1.0 : mix(mix(0.4, 1.0, smoothstep(0.0, 1.1, hgE)), 1.0, smoothstep(0.5, 0.85, N.y));
      // 朝上的面与原来的天光一样亮（球谐在 JS 里按原天光的亮度归一过），变的是方向与颜色：侧面带太阳一侧的暖天光、朝下的面带地面反光
      amb = mix(amb, irr * uAmbient * 1.45 * envOcc, uEnvLight);
    }
    if (uModel == 7) {
      float t = clamp(max(dot(N, uSunDir), 0.0) * shS * 0.8 + uAmbient * 0.25 + lum(base) * 0.25 + 0.12, 0.0, 1.0);
      vec2 hc = uHatchWorld > 0.5
        ? (abs(N.y) > 0.6 ? vWorld.xz : (abs(N.x) > abs(N.z) ? vWorld.zy : vWorld.xy)) * (7.0 / uHatchScale)
        : gl_FragCoord.xy / uHatchScale;
      hc += vec2(vnoise3(vWorld * 0.9), vnoise3(vWorld * 0.9 + 7.0)) * 0.35;
      float ink = 0.0;
      if (uHatchTex == 1) {
        // 色调排线图：沿 45° 铺（与程序排线同向），亮度 0.78 以上留白
        vec2 tuv = mat2(0.7071, -0.7071, 0.7071, 0.7071) * hc * 0.09;
        ink = 1.0 - tamPaper(tuv, smoothstep(0.78, 0.08, t));
      } else {
        if (t < 0.66) ink = max(ink, hatchLine(hc, 0.785, 0.06) * smoothstep(0.66, 0.56, t));
        if (t < 0.4) ink = max(ink, hatchLine(hc, -0.785, 0.06) * smoothstep(0.4, 0.32, t));
        if (t < 0.24) ink = max(ink, hatchLine(hc * 1.5, 0.0, 0.08));
        if (t < 0.12) ink = max(ink, hatchLine(hc * 2.1, 1.5708, 0.12));
      }
      col = mix(mix(uPaper, base, 0.16), uInk, ink * 0.9);
    } else {
      col = lightModel(base, N, V, uSunDir, uSunColor, shS, true);
      float ambK = uModel == 4 ? 0.3 : uModel == 5 ? 0.15 : uModel == 3 ? 1.0 : 1.0;
      col += base * amb * ambK;
      for (int i = 0; i < MAX_POINTS; i++) {
        if (i >= uPointCount) break;
        vec3 Ld = uPointPos[i] - vWorld;
        float d = length(Ld);
        float a = clamp(1.0 - d / uPointRange[i], 0.0, 1.0);
        a *= a;
        if (a <= 0.0) continue;
        col += lightModel(base, N, V, Ld / d, uPointColor[i] * a, 1.0, false);
      }
      // M：舞台聚光灯（第一盏借太阳的阴影贴图：扩展此时把太阳方向换成了它的方向）
      for (int i = 0; i < 3; i++) {
        if (i >= uSpotCount) break;
        vec3 Ld = uSpotPos[i] - vWorld;
        float d = max(length(Ld), 1e-4);
        vec3 Ls = Ld / d;
        float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, dot(-Ls, uSpotDir[i]));
        float fall = clamp(1.0 - d / uSpotRange[i], 0.0, 1.0);
        if (cone * fall <= 0.0) continue;
        col += lightModel(base, N, V, Ls, uSpotColor[i] * cone * fall, (i == 0 && uSpotShadow > 0.5) ? shS : 1.0, false);
      }
      float fres = 1.0 - max(dot(N, V), 0.0);
      float rim = smoothstep(1.0 - uRimWidth, 1.0, fres) * uRim;
      col += mix(vec3(1.0), base, 0.45) * rim * 0.5 * (0.4 + 0.6 * lum(uSunColor));
      if (uMatPreset == 4) col += base * smoothstep(0.35, 1.0, fres) * 0.3;
      if (uMatPreset == 3 || uMatPreset == 5) {
        vec3 R = reflect(-V, N);
        vec3 env = mix(uGroundAmb * 1.5, uSkyTop, smoothstep(-0.2, 0.6, R.y));
        if (uMatPreset == 3) col += env * pow(fres, 4.0) * 0.6;
        else col = col * 0.45 + env * base * (0.6 + uSpecular * 0.4);
      }
      // M：次表面散射——交界线外侧透出散射色（卡通明暗时是一条窄色带），逆光时薄的部分透光
      if (uSss > 0.0) {
        float thin = sssThin(role, terrain);
        if (thin > 0.0) {
          vec3 st = mix(hueOf(base), hueOf(uSssColor), 0.6);
          float ndl = dot(N, uSunDir);
          float ws = uSss;
          bool toon = uModel == 3 || uModel == 4;
          float band = toon
            ? softBand(ndl, -0.22 * uSss, 0.012) * (1.0 - softBand(ndl, 0.03, 0.012)) * 0.9
            : max(clamp((ndl + ws) / (1.0 + ws), 0.0, 1.0) - max(ndl, 0.0), 0.0) * 2.2;
          col += base * st * uSunColor * band * mix(1.0, shS, 0.6) * uSss * (0.55 + 0.45 * thin);
          // 暗部更饱和、偏散射色（光在里面走了一段，带出了固有色）
          col += base * st * amb * 0.35 * uSss;
          // 透射：薄的部分背光一侧整片透亮（与视角无关的漫透射）+ 迎着光看时更亮（视角相关）
          vec3 Lt = normalize(uSunDir + N * 0.35);
          float back = pow(clamp(dot(V, -Lt), 0.0, 1.0), 3.0) * 1.4;
          float diffT = max(-ndl, 0.0);
          if (toon) { back = softBand(back, 0.4, 0.03) * 1.1; diffT = softBand(diffT, 0.12, 0.02) * 0.8; }
          float shT = mix(1.0, sampleShadow(vWorld + uSunDir * mix(0.25, 0.7, thin), N), uShadowStrength);
          vec3 tc = hueOf(base) * mix(vec3(1.0), hueOf(uSssColor), 0.35) * (0.4 + 0.6 * max(max(base.r, base.g), base.b));
          col += tc * (uSunColor * (back + diffT * 0.75) * shT + uSkyAmb * 0.12) * thin * uSss;
        }
      }
      // M：环境反射（环境光照的天空高光 / 反射贴图：天空、镀铬、球面反射）、掐丝的金丝、清漆层
      if (uEnvLight > 0.0 || uEnvReflect > 0 || mGloss > 0.0 || mGold > 0.0) {
        float nv = max(dot(N, V), 1e-3);
        vec3 R = reflect(-V, N);
        float spk = uModel == 6 ? 1.0 : clamp(presetSpec() * uSpecular, 0.0, 1.0) * 0.7;
        if (uEnvLight > 0.0 && spk > 0.0) {
          vec3 F0 = mix(vec3(0.04), base, uModel == 6 ? uMetalness : 0.0);
          vec2 ab = envBRDF(uRoughness, nv);
          col += envSpecular(R, uRoughness) * (F0 * ab.x + ab.y) * spk * uEnvLight * envOcc;
        }
        // 反射贴图只给建筑、器物与角色（地面、植被、云照旧——不然整个世界成了一面镜子）
        bool reflRole = !terrain && role != R_GRASS && role != R_SAND && role != R_HIGHLAND && role != R_SNOW && role != R_ROCK && role != R_SOIL
          && role != R_PATH && role != R_FOLIAGE && role != R_FOLIAGE2 && role != R_FLOWER && role != R_TRUNK && role != R_CLOUD && role != R_WATER && role != R_WATERDEEP;
        if (!reflRole) {}
        else if (uEnvReflect == 1) {
          vec3 F0r = mix(vec3(0.04), base, max(uMetalness, uMatPreset == 5 ? 1.0 : 0.0));
          vec2 ab = envBRDF(uRoughness, nv);
          vec3 fr = F0r * ab.x + ab.y;
          col += (envSpecular(R, uRoughness) * 2.0 + sunGlint(R, uRoughness) * shS) * fr * uEnvAmount;
        } else if (uEnvReflect == 2) {
          vec3 env = envSky(R, 0.02) * 1.15 + sunGlint(R, 0.0) * shS;
          float fr = 0.7 + 0.3 * pow(1.0 - nv, 4.0);
          col = mix(col, env * mix(vec3(0.92), hueOf(base), 0.3) * fr + base * amb * 0.05, clamp(uEnvAmount, 0.0, 1.0));
        } else if (uEnvReflect == 3) {
          vec3 vn = normalize((viewMatrix * vec4(N, 0.0)).xyz);
          vec3 mc = sphereMap(vn) * mix(vec3(1.0), hueOf(base), 0.55) * (0.45 + 0.45 * lum(base));
          col = mix(col, col * 0.35 + mc, clamp(uEnvAmount, 0.0, 1.0));
        }
        if (mGold > 0.0) {
          vec3 gold = vec3(1.0, 0.71, 0.29);
          vec2 ab = envBRDF(0.22, nv);
          vec3 gs = envSpecular(R, 0.22) * (gold * ab.x + ab.y) * 1.6 + sunGlint(R, 0.22) * gold * shS + gold * uSunColor * max(dot(N, uSunDir), 0.0) * shS * 0.25;
          col = mix(col, gs, mGold);
        }
        if (mGloss > 0.0) {
          // 漆面盖在凹凸之上，用凹凸前的法线（剔红的漆就是刻出来的那层，跟着浮雕走）
          vec3 Nc = uMatExt == 3 ? N : Ngeo;
          float nvc = max(dot(Nc, V), 1e-3);
          vec3 Rc = reflect(-V, Nc);
          float Fc = 0.04 + 0.96 * pow(1.0 - nvc, 5.0);
          vec3 envC = envSpecular(Rc, mGlossR);
          vec3 Hc = normalize(uSunDir + V);
          float ndh = max(dot(Nc, Hc), 0.0);
          float a2 = max(mGlossR * mGlossR, 0.0015);
          a2 *= a2;
          float dd = ndh * ndh * (a2 - 1.0) + 1.0;
          float D = a2 / (3.14159 * dd * dd);
          vec3 hs = uSunColor * min(D * 0.25 / max(nvc, 0.2), 60.0) * (0.04 + 0.96 * pow(1.0 - max(dot(Hc, V), 0.0), 5.0)) * max(dot(Nc, uSunDir), 0.0) * shS;
          if (uModel == 3 || uModel == 4) hs = uSunColor * softBand(ndh, 1.0 - 0.004 - mGlossR * 0.03, 0.0015) * shS * 1.4;
          col = col * (1.0 - Fc * mGloss) + (envC * Fc + hs) * mGloss;
        }
      }
      // M：绒毛——轮廓一圈泛起的绒光 + 细纤维的明暗
      if (uFuzz > 0.0 && !isHardRole(role)) {
        float g = 1.0 - max(dot(N, V), 0.0);
        float rimF = smoothstep(0.3, 1.0, g + (vnoise3(vWorld * 38.0) - 0.5) * 0.35) * (terrain ? 0.4 : 1.0);
        vec3 lc = uSunColor * (0.35 + 0.65 * clamp(dot(N, uSunDir) * 0.5 + 0.5, 0.0, 1.0)) * mix(1.0, shS, 0.5) + amb;
        col = mix(col, mix(base, hueOf(base) * 0.8, 0.3) * lc * 1.3, rimF * uFuzz * 0.75);
        col *= 1.0 - uFuzz * 0.18 * (vnoise3(vWorld * 70.0) - 0.5);
      }
    }
  }
  // 皴法：贴在山石表面，背光、陡坡处更浓（画家把皴擦放在阴面）；米点皴不看坡度
  if (uCunMode > 0 && isCunRole(role, terrain)) {
    float cun = triTex(tCun, vWorld, N, uCunScale);
    float lit = clamp(dot(N, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
    float slope = 1.0 - clamp(N.y, 0.0, 1.0);
    float k = uCunAmount * cun * (0.3 + 0.7 * (1.0 - lit)) * (uCunMode == 3 ? 1.0 : 0.35 + 0.65 * smoothstep(0.04, 0.45, slope));
    col = mix(col, col * 0.3 + uInk * 0.35, clamp(k * 1.3, 0.0, 1.0));
  }
  // M：体素角落遮蔽（逐顶点插值，Minecraft 式的方块缝暗角）
  if (uVoxelAO > 0.0 && uVertexLit < 0.5) col *= mix(1.0, mix(0.4, 1.0, vVoxAO), uVoxelAO);
  if (role == R_EMISSIVE && vRole > -0.5) col = base * 1.9;
  // M：线框几何——重心坐标画三角形的边（共面的对角线不画），面用暗色 / 天色填（消隐）或保留明暗
  if (uWire > 0.5 && vBary.x + vBary.y + vBary.z > 0.5) {
    vec3 d = fwidth(vBary);
    vec3 e3 = smoothstep(d * max(uWireWidth - 0.6, 0.0), d * (uWireWidth + 0.6), vBary);
    float line = 1.0 - min(min(e3.x, e3.y), e3.z);
    // 三角形在屏幕上太小时线挤成一片：淡掉一些
    line *= 1.0 - 0.65 * smoothstep(0.06, 0.22, max(max(d.x, d.y), d.z));
    vec3 lc = uWireColor == 1 ? roleColor(R_ACCENT) : uWireColor == 2 ? roleColor(R_EMISSIVE) : base;
    lc = hueOf(lc) * (0.45 + 0.55 * sqrt(clamp(max(max(lc.r, lc.g), lc.b), 0.0, 1.0))) * (1.0 + uWireGlow * 1.6);
    vec3 fill = uWireFill == 0 ? base * 0.035 + uInk * 0.03
      : uWireFill == 1 ? mix(uSkyHorizon, uSkyTop, smoothstep(0.15, 1.0, gl_FragCoord.y / uResolution.y))
      : col;
    col = mix(fill, lc, line);
  }
  if (uBlob.w > 0.0 && role != R_CHARACTER && role != R_CHARACTERACCENT && role != R_SKIN) {
    float bd = length(vWorld.xz - uBlob.xz) / uBlob.w;
    float near = 1.0 - smoothstep(0.0, 0.7, abs(vWorld.y - uBlob.y));
    col *= 1.0 - 0.5 * (1.0 - smoothstep(0.45, 1.0, bd)) * near;
  }
  if (uModel != 7 || uFogMode != 0) col = applyFog(col, vWorld, vViewDepth);
  oColor = vec4(col, 1.0);
  vec3 vn = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  oNormal = vec4(vn * 0.5 + 0.5, (float(roleOut) + 0.5) / 64.0);
}
`;

export function surfaceMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: U,
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    side: THREE.FrontSide,
  });
  // M 轨道按需补的顶点属性（线框重心、体素邻居、离地高度）：几何里没有时读这组中性值（= 关）
  Object.assign(m.defaultAttributeValues as Record<string, number[]>, { aBary: [0, 0, 0], aVox: [0, 0], aGround: [0, 0] });
  return m;
}

/* ---------------- 描边：反向外壳 ---------------- */
const OUTLINE_VERT = /* glsl */ `
${SHARED_DECL}
${VERTEX_COMMON}
${NOISE}
${VERTEX_M}
in float aRole;
in float aSway;
in vec3 aOutline;
flat out float vRole;
void main() {
  vRole = aRole;
  int role = int(floor(aRole + 0.5));
  float mask = aRole < -0.5 ? uOutlineTerrain : uOutlineMask[clamp(role, 0, ROLE_COUNT - 1)];
  if (mask < 0.5 || uOutlineWidth <= 0.0 || dot(aOutline, aOutline) < 0.0001) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec3 nObj = uOutlineRaw > 0.5 ? normal : aOutline;
  vec4 wp = m * vec4(position, 1.0);
  wp.xyz = applyWind(wp.xyz, aSway);
  if (uBoil > 0.0) wp.xyz += boilOffset(wp.xyz);
  vec3 nW = normalize(mat3(m) * nObj);
  if (uOutlineMode == 1) {
    wp.xyz += nW * uOutlineWidth * 0.0045 * uViewHeight / 10.0;
    gl_Position = applySnap(projectionMatrix * viewMatrix * vec4(applyBend(wp.xyz), 1.0));
    return;
  }
  vec4 clip = projectionMatrix * viewMatrix * vec4(applyBend(wp.xyz), 1.0);
  vec4 clipN = projectionMatrix * viewMatrix * vec4(applyBend(wp.xyz + nW * 0.05), 1.0);
  vec2 dpx = (clipN.xy / clipN.w - clip.xy / clip.w) * uResolution;
  float len = length(dpx);
  vec2 dir = len > 1e-5 ? dpx / len : vec2(0.0);
  float w = uOutlineWidth;
  if (uOutlineMode == 2) {
    float ref = isOrthographic ? 1.0 : clamp(uViewHeight * 1.2 / max(clip.w, 0.01), 0.55, 1.5);
    w *= ref;
  }
  clip.xy += dir * w * 2.0 / uResolution * clip.w;
  clip.z += 0.0002 * clip.w;
  gl_Position = applySnap(clip);
}
`;

const OUTLINE_FRAG = /* glsl */ `
${SHARED_DECL}
flat in float vRole;
${OUT}
void main() {
  int role = int(floor(vRole + 0.5));
  vec3 c = uInk;
  if (uOutlineColorMode == 1) {
    vec3 b = vRole < -0.5 ? uRoleColors[R_SOIL] : uRoleColors[clamp(role, 0, ROLE_COUNT - 1)];
    c = b * 0.32;
  } else if (uOutlineColorMode == 2) c = uOutlineColor;
  oColor = vec4(c, 1.0);
  int ro = vRole < -0.5 ? ${ROLE_TERRAIN_CODE} : role;
  oNormal = vec4(0.5, 0.5, 1.0, (float(ro) + 0.5) / 64.0);
}
`;

export function outlineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: U,
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
  });
}

/* ---------------- 阴影深度 ---------------- */
const DEPTH_VERT = /* glsl */ `
${SHARED_DECL}
${VERTEX_COMMON}
${NOISE}
${VERTEX_M}
in float aSway;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  wp.xyz = applyWind(wp.xyz, aSway);
  if (uBoil > 0.0) wp.xyz += boilOffset(wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const DEPTH_FRAG = /* glsl */ `
layout(location = 0) out highp vec4 oColor;
void main() { oColor = vec4(1.0); }
`;

export function shadowDepthMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: U,
    vertexShader: DEPTH_VERT,
    fragmentShader: DEPTH_FRAG,
    side: THREE.DoubleSide,
  });
}

/* ---------------- 天空（全屏三角形，画在最远处） ---------------- */
const SKY_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.99999, 1.0); }
`;
const SKY_FRAG = /* glsl */ `
${SHARED_DECL}
${NOISE}
${OUT}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float t = smoothstep(0.15, 1.0, uv.y);
  vec3 c;
  if (uSkyMode == 1) c = mix(uSkyHorizon, uSkyTop, 0.35);
  else if (uSkyMode == 2) c = uPaper;
  else if (uSkyMode == 3) c = mix(uSkyHorizon, uSkyTop, floor(t * 4.0) / 3.0);
  else c = mix(uSkyHorizon, uSkyTop, t);
  oColor = vec4(c, 1.0);
  oNormal = vec4(0.5, 0.5, 1.0, 0.0);
}
`;

export function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: U,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthWrite: false,
    depthTest: false,
  });
}

/* ---------------- 水面 ---------------- */
export const WATER_U = {
  uHeightTex: { value: null as THREE.Texture | null },
  uHalf: { value: 20 },
  uWaterLevel: { value: 1 },
  uWaterMode: { value: 0 },
  uWaterOpacity: { value: 0.55 },
  uWaves: { value: 0.35 },
};

const WATER_VERT = /* glsl */ `
${SHARED_DECL}
${VERTEX_COMMON}
uniform float uWaves;
out vec3 vWorld;
out float vViewDepth;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += (sin(uAnimTime * 1.2 + wp.x * 0.45) * 0.5 + cos(uAnimTime * 0.9 + wp.z * 0.38) * 0.5) * 0.12 * uWaves;
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * vec4(applyBend(wp.xyz), 1.0);
  vViewDepth = -mv.z;
  gl_Position = applySnap(projectionMatrix * mv);
}
`;
const WATER_FRAG = /* glsl */ `
${SHARED_DECL}
${NOISE}
${SURFACE_LIB}
uniform sampler2D uHeightTex;
uniform float uHalf;
uniform float uWaterLevel;
uniform int uWaterMode;
uniform float uWaterOpacity;
uniform float uWaves;
in vec3 vWorld;
in float vViewDepth;
${OUT}
void main() {
  vec2 huv = (vWorld.xz + uHalf) / (2.0 * uHalf);
  float ground = texture(uHeightTex, clamp(huv, 0.001, 0.999)).r;
  vec2 outside = max(abs(vWorld.xz) - uHalf, 0.0);
  ground -= length(outside) * 0.35;
  float depth = uWaterLevel - ground;
  vec3 shallow = uRoleColors[R_WATER], deep = uRoleColors[R_WATERDEEP];
  vec3 col = mix(shallow, deep, smoothstep(0.2, 3.0, depth));
  float alpha = 1.0;
  float lightK = clamp(lum(uSunColor) * 0.75 + uAmbient * 0.6, 0.15, 1.3);
  col *= lightK;
  if (uWaterMode == 0 || uWaterMode == 2) {
    float n = vnoise2(vWorld.xz * 1.3 + uAnimTime * 0.25);
    float foam = 1.0 - smoothstep(0.08, 0.32, depth + (n - 0.5) * 0.18 * (0.4 + uWaves));
    col = mix(col, vec3(1.0) * clamp(lightK * 1.1, 0.4, 1.0), foam * 0.9);
    alpha = mix(1.0 - uWaterOpacity * 0.85, 1.0, smoothstep(0.0, 3.5, depth));
    alpha = max(alpha, foam);
  }
  if (uWaterMode == 2) {
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vec3(sin(vWorld.x * 0.8 + uAnimTime) * 0.08 * uWaves, 1.0, cos(vWorld.z * 0.7 + uAnimTime) * 0.08 * uWaves));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col = mix(col, uSkyHorizon, fres * 0.6);
    col += uSunColor * pow(max(dot(reflect(-uSunDir, N), V), 0.0), 120.0) * 1.5;
  }
  col = applyFog(col, vWorld, vViewDepth);
  // M：网眼透明——不做混合，按 4×4 Bayer 阈值丢像素（土星 / N64 时代的半透明）
  if (uScreenDoor > 0) {
    if (alpha < 0.999 && alpha <= bayer4(gl_FragCoord.xy)) discard;
    alpha = 1.0;
  }
  oColor = vec4(col, alpha);
  vec3 vn = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  oNormal = vec4(vn * 0.5 + 0.5, (float(R_WATER) + 0.5) / 64.0);
}
`;

export function waterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, ...WATER_U },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: true,
  });
}

/* ---------------- 天气粒子 ---------------- */
export const PARTICLE_U = {
  uCenter: { value: new THREE.Vector3() },
  uBox: { value: new THREE.Vector3(40, 20, 40) },
  uKind: { value: 0 },
  uPointScale: { value: 1 },
};
const PARTICLE_VERT = /* glsl */ `
${SHARED_DECL}
uniform vec3 uCenter;
uniform vec3 uBox;
uniform int uKind;
uniform float uPointScale;
in vec3 aSeed;
out float vSeed;
void main() {
  float speed = uKind == 2 ? 9.0 : uKind == 1 ? 1.2 : uKind == 3 ? 0.8 : 0.25;
  vec3 p = aSeed * uBox;
  p.y = mod(p.y - uTime * speed * (0.7 + aSeed.x * 0.6), uBox.y);
  p.x += sin(uTime * 0.7 + aSeed.z * 30.0) * (uKind == 3 ? 1.2 : 0.4);
  vec3 wp = uCenter + vec3(p.x - uBox.x * 0.5, p.y - uBox.y * 0.15, p.z - uBox.z * 0.5);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uKind == 2 ? 2.0 : uKind == 1 ? 4.0 : uKind == 3 ? 6.0 : 3.0;
  gl_PointSize = size * uPointScale * (isOrthographic ? 1.0 : clamp(30.0 / -mv.z, 0.4, 3.0));
  vSeed = aSeed.x;
}
`;
const PARTICLE_FRAG = /* glsl */ `
${SHARED_DECL}
uniform int uKind;
in float vSeed;
${OUT}
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (uKind == 2) { if (abs(c.x) > 0.12) discard; }
  else if (d > 0.5) discard;
  vec3 col = uKind == 3 ? uRoleColors[R_FLOWER] : uKind == 4 ? uRoleColors[R_EMISSIVE] : vec3(0.95, 0.97, 1.0);
  if (uKind == 2) col = mix(uSkyHorizon, vec3(0.8, 0.85, 0.95), 0.5);
  oColor = vec4(col * (uKind == 4 ? 1.4 : 1.0), 1.0);
  oNormal = vec4(0.5, 0.5, 1.0, 0.0);
}
`;

export function particleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, ...PARTICLE_U },
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
  });
}
