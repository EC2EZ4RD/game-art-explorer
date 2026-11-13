import * as THREE from 'three';
import { num, str } from '../../../dims/registry';
import { registerEngineExt } from '../../engineExt';
import { U } from '../../materials/uniforms';
import { registerFx } from './registry';

/*
 * 湿地面反射（lighting.wetReflect，P2）：雨夜霓虹街那种屏幕空间反射。线性阶段（HDR，辉光之前：反射里的霓虹也会发光）。
 *
 *   哪里湿    法线朝上（视空间法线 · 世界上方向，世界上方向由本帧相机矩阵换到视空间）的非角色、非树冠表面；
 *             积水 = 世界 XZ 上的噪声斑块（贴在地上，转镜头不游动），"积水范围"调斑块大小；积水之外也是湿的，只是反射弱、更糊
 *   ssr       积水里用平的世界上方向当法线（下雨时加一点涟漪），沿反射方向在视空间步进 48 步（步长渐增），
 *             投影回屏幕比深度，交上后二分细化 5 次；出屏 / 打到天空就用天顶—地平线色；靠屏幕边缘时渐隐
 *   streak    反射沿屏幕竖直方向拉长模糊（湿路面上的灯影都是竖条）
 *   main      湿的地方底色压暗（湿沥青更深），加上按菲涅耳加权的反射：积水里清楚、积水外是糊开的竖条
 * 迁移到 Godot：Environment.ssr_enabled 只认材质粗糙度；要"积水斑块"需要在地面材质里用世界坐标噪声调 ROUGHNESS / 颜色，
 * 或照抄本算法写全屏 spatial 着色器（hint_depth_texture + hint_normal_roughness_texture）。
 */

const tex = () => ({ value: null as THREE.Texture | null });
const COMMON = {
  tNormal: tex(),
  tDepth: tex(),
  uViewToWorld: { value: new THREE.Matrix4() },
  uWorldToView: { value: new THREE.Matrix3() },
  uProjM: { value: new THREE.Matrix4() },
  uInvProjM: { value: new THREE.Matrix4() },
  uUpV: { value: new THREE.Vector3(0, 1, 0) },
  uAmount: { value: 0 },
  uCover: { value: 0.5 },
  uRain: { value: 0 },
  uWaterOn: { value: 0 },
  uWaterY: { value: 0 },
};

const LIB = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform mat4 uViewToWorld;
uniform mat3 uWorldToView;
uniform mat4 uProjM;
uniform mat4 uInvProjM;
uniform vec3 uUpV;
uniform float uAmount;
uniform float uCover;
uniform float uRain;
uniform float uWaterOn;
uniform float uWaterY;
/**
 * 视空间位置 / 投回画面：用镜头真实的投影矩阵（收尾 X / 复查 F10）。卷轴·长街的斜二测在投影矩阵上多乘了一个错切，
 * 按 uViewHalf 重建（viewPos）会把位置算偏「纵深 × 0.354」，倒影错位；普通正交 / 透视下两种算法结果相同
 */
vec3 viewPosM(vec2 uv, float lin) {
  vec4 c = uProjM * vec4(0.0, 0.0, -lin, 1.0);
  vec4 v = uInvProjM * vec4(uv * 2.0 - 1.0, c.z / c.w, 1.0);
  return v.xyz / v.w;
}
vec3 worldAt(vec2 uv, float lin) { return (uViewToWorld * vec4(viewPosM(uv, lin), 1.0)).xyz; }
vec2 projectV(vec3 q) {
  vec4 c = uProjM * vec4(q, 1.0);
  return c.xy / max(abs(c.w), 1e-4) * sign(c.w) * 0.5 + 0.5;
}
/** 积水斑块（世界 XZ），0 = 只是湿，1 = 积水 */
float puddleAt(vec3 wp) {
  float f = fbm(wp.xz * 0.21) * 0.78 + vnoise(wp.xz * 1.4) * 0.22;
  float th = mix(0.74, 0.26, uCover);
  return smoothstep(th, th + 0.045, f);
}
/**
 * 湿度：法线朝上的程度 × (积水 1 / 其余 0.35)；返回 x = 湿度，y = 积水。
 * 水面（场景的水，按世界高度认：水是半透明的，法线缓冲里混着水底的法线、角色编号也被混掉，靠不住）直接当积水，water = 1
 */
vec2 wetAt(vec2 uv, out vec3 n, out float z, out float water) {
  float raw = texture(tDepth, uv).r;
  n = vec3(0.0, 1.0, 0.0); z = 0.0; water = 0.0;
  if (raw > 0.99999) return vec2(0.0);
  if (uWaterOn > 0.5) {
    float zz = linDepth(raw);
    if (abs(worldAt(uv, zz).y - uWaterY) < 0.3) { z = zz; n = uUpV; water = 1.0; return vec2(1.0); }
  }
  float role = roleAt(tNormal, uv);
  if (isCharacterRole(role) || role == ROLE_foliage || role == ROLE_foliage2 || role == ROLE_cloud || role == ROLE_emissive || role == ROLE_flower) return vec2(0.0);
  n = normalize(texture(tNormal, uv).rgb * 2.0 - 1.0);
  float up = smoothstep(0.7, 0.92, dot(n, uUpV));
  if (up <= 0.0) return vec2(0.0);
  z = linDepth(raw);
  float pud = puddleAt(worldAt(uv, z));
  if (role == ROLE_water || role == ROLE_waterDeep) pud = 1.0;
  return vec2(up * mix(0.35, 1.0, pud), pud);
}
`;

const SSR = LIB + /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
void main() {
  vec3 n; float z, water;
  vec2 w = wetAt(vUv, n, z, water);
  if (w.x <= 0.0) { oColor = vec4(0.0); return; }
  vec3 P = viewPosM(vUv, z);
  vec3 wp = worldAt(vUv, z);
  // 积水是平的；下雨时加一点随时间变化的涟漪
  vec3 N = normalize(mix(n, uUpV, w.y));
  if (uRain > 0.5) {
    vec2 q = wp.xz * 3.0;
    vec2 g = vec2(vnoise(q + vec2(uTime * 1.7, 0.0)) - vnoise(q + vec2(0.0, uTime * 1.3)), vnoise(q * 1.7 - uTime) - 0.5);
    N = normalize(N + uWorldToView * vec3(g.x, 0.0, g.y) * 0.05);
  }
  // 正交时视线不一定是 -z（斜投影的视线是斜的）：同一个像素往里退一个单位的方向
  vec3 V = uOrtho > 0.5 ? normalize(viewPosM(vUv, z + 1.0) - P) : normalize(P);
  vec3 Rv = reflect(V, N);
  vec3 Rw = (uViewToWorld * vec4(Rv, 0.0)).xyz;
  // 天空兜底：按反射方向的仰角取天顶—地平线色
  vec3 sky = mix(uSkyHor, uSkyTop, smoothstep(0.0, 0.6, Rw.y));
  // 反射方向的"无穷远处"如果就在画面里、而且那里是天空，直接取画面上的天空（落日、分形天空、星星都能倒映出来）
  if (uOrtho < 0.5 && Rv.z < -0.05) {
    vec2 su = projectV(Rv * uFar * 0.9);
    if (su.x > 0.0 && su.y > 0.0 && su.x < 1.0 && su.y < 1.0 && texture(tDepth, su).r > 0.99999) sky = texture(tInput, su).rgb;
  }
  vec3 refl = sky;
  float stp = max(0.04, z * 0.012);
  float t = stp * (0.6 + 0.8 * hash12(gl_FragCoord.xy));
  vec3 org = P + N * z * 0.002;
  for (int i = 0; i < 40; i++) {
    vec3 q = org + Rv * t;
    if (-q.z < uNear) break;
    vec2 su = projectV(q);
    if (su.x < 0.0 || su.y < 0.0 || su.x > 1.0 || su.y > 1.0) break;
    float sz = linDepth(texture(tDepth, su).r);
    if (-q.z > sz && -q.z - sz < max(stp * 2.5, z * 0.02)) {
      float a = t - stp, b = t;
      for (int k = 0; k < 5; k++) {
        float m = (a + b) * 0.5;
        vec3 qm = org + Rv * m;
        if (-qm.z > linDepth(texture(tDepth, projectV(qm)).r)) b = m; else a = m;
      }
      vec2 hu = projectV(org + Rv * b);
      vec2 e = min(hu, 1.0 - hu);
      float fade = smoothstep(0.0, 0.07, min(e.x, e.y));
      refl = mix(sky, texture(tInput, hu).rgb, fade);
      break;
    }
    t += stp;
    stp *= 1.1;
  }
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  float wt = uAmount * w.x * (0.32 + 0.68 * F);
  oColor = vec4(refl * wt, wt);
}`;

const STREAK = /* glsl */ `
uniform sampler2D tInput;
uniform float uLen;
void main() {
  vec4 s = vec4(0.0); float ws = 0.0;
  for (int i = -10; i <= 10; i++) {
    float f = float(i) / 10.0;
    float w = exp(-f * f * 2.5);
    vec2 o = vec2((hash12(vec2(float(i), 3.0)) - 0.5) * 1.5, f * uLen) / uRes;
    s += texture(tInput, vUv + o) * w;
    ws += w;
  }
  oColor = s / ws;
}`;

const MAIN = LIB + /* glsl */ `
uniform sampler2D tSharp;
uniform sampler2D tBlur;
void main() {
  vec3 base = texture(tInput, vUv).rgb;
  vec3 n; float z, water;
  vec2 w = wetAt(vUv, n, z, water);
  if (w.x <= 0.0) { oColor = vec4(base, 1.0); return; }
  vec4 s = texture(tSharp, vUv);
  vec4 b = texture(tBlur, vUv);
  vec3 rs = s.a > 1e-4 ? s.rgb / s.a : vec3(0.0);
  vec3 rb = b.a > 1e-4 ? b.rgb / b.a : rs;
  // 积水里清楚（下雨时也略带竖条），积水外是糊开的竖条
  vec3 refl = mix(rb, rs, w.y * (uRain > 0.5 ? 0.55 : 0.85));
  // 湿表面更深更饱和
  vec3 wetBase = base * (1.0 - 0.5 * uAmount * w.x * (1.0 - water));
  oColor = vec4(wetBase + refl * s.a, 1.0);
}`;

const upW = new THREE.Vector3();
/** 场景有没有水、水面高度（场景重建时记下） */
const water = { on: false, level: 0 };
registerEngineExt({ id: 'retroWetWater', onSceneBuilt(c) { water.on = !!c.desc?.water; water.level = c.desc?.water?.level ?? 0; } });
/** 反射与竖条模糊都在半分辨率算（反射本来就要糊开，省四倍） */
let halfA: THREE.WebGLRenderTarget | null = null;
let halfB: THREE.WebGLRenderTarget | null = null;
function halfRT(t: THREE.WebGLRenderTarget | null, w: number, h: number) {
  if (!t) return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  if (t.width !== w || t.height !== h) t.setSize(w, h);
  return t;
}

registerFx({
  id: 'retroWet',
  stage: 'linear',
  order: 0,
  frag: MAIN,
  uniforms: { ...COMMON, tSharp: tex(), tBlur: tex() },
  extra: {
    ssr: { frag: SSR, uniforms: { ...COMMON, uSkyTop: U.uSkyTop, uSkyHor: U.uSkyHorizon } },
    streak: { frag: STREAK, uniforms: { uLen: { value: 20 } } },
  },
  active: (v, f) => num(v, 'lighting.wetReflect') > 0 && !!f.camera,
  // 两张半分辨率目标：关掉 / 换场景 / 换尺寸时放掉，下次用到再建（收尾 X / 复查 F9）
  dispose() { halfA?.dispose(); halfB?.dispose(); halfA = halfB = null; },
  render(c, out, p) {
    const r = c.renderer;
    const cam = c.frame.camera!;
    const v = c.values;
    COMMON.tNormal.value = c.normal;
    COMMON.tDepth.value = c.depth;
    COMMON.uViewToWorld.value.copy(cam.matrixWorld);
    COMMON.uWorldToView.value.setFromMatrix4(cam.matrixWorldInverse);
    // 投影矩阵（含卷轴·长街的斜投影错切）与它的逆：自己求逆，不依赖 projectionMatrixInverse 有没有被同步
    COMMON.uProjM.value.copy(cam.projectionMatrix);
    COMMON.uInvProjM.value.copy(cam.projectionMatrix).invert();
    upW.set(0, 1, 0).transformDirection(cam.matrixWorldInverse);
    COMMON.uUpV.value.copy(upW);
    COMMON.uAmount.value = num(v, 'lighting.wetReflect');
    COMMON.uCover.value = num(v, 'lighting.wetCover');
    COMMON.uRain.value = str(v, 'atmosphere.weather') === 'rain' ? 1 : 0;
    COMMON.uWaterOn.value = water.on && str(v, 'atmosphere.water') !== 'hidden' ? 1 : 0;
    COMMON.uWaterY.value = water.level;
    const hw = Math.max(2, c.res.x >> 1), hh = Math.max(2, c.res.y >> 1);
    const sharp = (halfA = halfRT(halfA, hw, hh)), blur = (halfB = halfRT(halfB, hw, hh));
    const s = c.passOf('retroWet:ssr');
    s.uniforms.tInput.value = c.input;
    s.render(r, sharp);
    const st = c.passOf('retroWet:streak');
    st.uniforms.tInput.value = sharp.texture;
    // 竖条长度（按全分辨率像素算，着色器里除以全分辨率 uRes 换成 uv）
    st.uniforms.uLen.value = c.res.y * (COMMON.uRain.value ? 0.05 : 0.03);
    st.render(r, blur);
    p.uniforms.tSharp.value = sharp.texture;
    p.uniforms.tBlur.value = blur.texture;
    p.render(r, out);
  },
});
