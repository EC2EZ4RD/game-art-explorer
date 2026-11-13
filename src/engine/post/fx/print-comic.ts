import * as THREE from 'three';
import { num, str } from '../../../dims/registry';
import { hudFontsVersion, loadHudFonts } from '../../../hud/fonts';
import type { FullscreenPass } from '../FullscreenPass';
import { PRINT_LIB } from './print-lib';
import { registerFx, type FxCtx } from './registry';

/*
 * P1b 漫画符号（叠在画面上的后处理，stage = 'afterOverlay'：纸纹 / 颗粒之后、镜头畸变之前）：
 *   surface.mangaFx  速度线 / 集中线 / 冲击爆炸（画在环境上，角色保持干净地站在线前面）
 *   surface.panels   分格：画面切成几格，有的格是主角的特写（镜头与画格转场）
 *   surface.sfxText  大号拟声字（白边黑字 / 美漫黄字），用已经打包的展示字体
 * 「主角在画面哪里」由 GPU 算：一个 1×1 的 pass 在角色编号缓冲上按网格取样，找离画面中心最近的角色，再求它附近角色像素的重心与范围。
 * 迁移到 Godot：三个全屏 canvas_item 着色器；主角位置直接由脚本把 Camera3D.unproject_position(玩家) 传进 uniform；拟声字用 Label / 字体贴图。
 */

/* ---------------- 主角定位：1×1 输出 (中心 x, 中心 y, 半径, 找到了没有) ---------------- */
const SUBJECT = /* glsl */ `
uniform sampler2D tInput;   // 不用，但 FX_HEAD 不声明 tInput，每个 fx 着色器都自己声明（主控约定）
uniform sampler2D tNormal;
void main() {
  // 先找离画面中心（略偏下）最近的角色像素，再求它附近角色像素的重心与范围
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 best = vec2(0.5); float bd = 9.0;
  for (int j = 0; j < 27; j++) for (int i = 0; i < 48; i++) {
    vec2 uv = (vec2(float(i), float(j)) + 0.5) / vec2(48.0, 27.0);
    if (!isCharacterRole(roleAt(tNormal, uv))) continue;
    float d = length((uv - vec2(0.5, 0.45)) * asp);
    if (d < bd) { bd = d; best = uv; }
  }
  if (bd > 8.0) { oColor = vec4(0.5, 0.5, 0.14, 0.0); return; }
  vec3 acc = vec3(0.0); float spread = 0.0;
  for (int j = 0; j < 27; j++) for (int i = 0; i < 48; i++) {
    vec2 uv = (vec2(float(i), float(j)) + 0.5) / vec2(48.0, 27.0);
    if (!isCharacterRole(roleAt(tNormal, uv))) continue;
    if (length((uv - best) * asp) > 0.2) continue;
    acc += vec3(uv, 1.0);
  }
  vec2 c = acc.xy / max(acc.z, 1.0);
  for (int j = 0; j < 27; j++) for (int i = 0; i < 48; i++) {
    vec2 uv = (vec2(float(i), float(j)) + 0.5) / vec2(48.0, 27.0);
    if (!isCharacterRole(roleAt(tNormal, uv))) continue;
    float d = length((uv - c) * asp);
    if (d > 0.2) continue;
    spread = max(spread, d);
  }
  oColor = vec4(c, clamp(spread + 0.03, 0.05, 0.3), 1.0);
}`;

let subjectRT: THREE.WebGLRenderTarget | null = null;
let subjectFrame: unknown = null;
/** 本帧的主角定位纹理（同一帧里多个 fx 共用，只算一次） */
function subjectTex(c: FxCtx): THREE.Texture {
  if (!subjectRT) subjectRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  if (subjectFrame !== c.frame) {
    const p = c.passOf('p1b-manga:subject');
    p.uniforms.tNormal.value = c.normal;
    p.render(c.renderer, subjectRT);
    subjectFrame = c.frame;
  }
  return subjectRT.texture;
}

/* 读主角定位（中心可选「画面中心」） */
const SUBJECT_FN = /* glsl */ `
uniform sampler2D tSubject;
uniform float uCenterMode;   // 0 主角，1 画面中心
vec4 subject() {
  vec4 s = texture(tSubject, vec2(0.5));
  if (uCenterMode > 0.5 || s.w < 0.5) return vec4(0.5, 0.5, 0.14, 0.0);
  return s;
}
`;

/* ---------------- 速度线 / 集中线 / 冲击爆炸 ---------------- */
const MANGA = PRINT_LIB + SUBJECT_FN + /* glsl */ `
uniform sampler2D tInput;
uniform float uMode;     // 1 速度线，2 集中线，3 冲击
uniform float uAmount;
uniform float uAngle;
/* 速度线：沿 uAngle 的平行长线，离主角越远越密，主角那条带子空着 */
float speedLines(vec2 p, vec2 cpx, float rpx, float U) {
  vec2 q = rot2(-uAngle) * (p - cpx);
  float sp = 6.0 * U;
  float span = length(uRes);
  float ink = 0.0;
  for (int k = -1; k <= 1; k++) {
    float i = floor(q.y / sp) + float(k);
    float far = smoothstep(rpx * 1.0, rpx * 3.2, abs((i + 0.5) * sp));
    // 每条轨道最多两段线（错开），长短不一；离主角越远越密
    for (int sgi = 0; sgi < 2; sgi++) {
      float sg = float(sgi);
      float h1 = hash12(vec2(i, 1.7 + sg * 11.0)), h2 = hash12(vec2(i, 4.1 + sg * 13.0)), h3 = hash12(vec2(i, 8.3 + sg * 17.0));
      if (h1 > uAmount * (0.04 + 0.96 * far) * (sgi == 0 ? 0.95 : 0.5)) continue;
      float y0 = (i + 0.15 + 0.7 * h2) * sp;
      float len = mix(0.12, 0.55, hash12(vec2(i, 2.2 + sg * 5.0))) * span;
      // 线随时间沿方向流动（动起来像在跑）；冻结或截图时停住
      float x0 = fract(h2 * 3.7 + sg * 0.5 - uTime * 0.6 * (0.6 + h3)) * span * 1.6 - span * 0.8 - len * 0.5;
      float x = (q.x - x0) / len;
      if (x < 0.0 || x > 1.0) continue;
      // 一头粗一头尖（尺子拉出来的线），浓淡也各不相同
      float xx = h2 < 0.5 ? x : 1.0 - x;   // 0 = 尖头，1 = 粗头
      float wv = mix(1.2, 5.5, h3 * h3) * U * smoothstep(0.0, 0.6, xx) * (1.0 - smoothstep(0.94, 1.0, xx));
      ink = max(ink, (1.0 - smoothstep(wv * 0.5 - 0.6, wv * 0.5 + 0.6, abs(q.y - y0))) * (0.65 + 0.35 * h1));
    }
  }
  return ink;
}
/* 集中线：从画面外缘指向中心的尖楔，在主角外一圈参差地停住 */
float focusLines(vec2 p, vec2 cpx, float rpx, float U, float thick) {
  vec2 d = p - cpx;
  float r = length(d);
  float a = atan(d.y, d.x);
  float N = 220.0;
  float da = 2.0 * PI / N;
  float ink = 0.0;
  float rMax = length(uRes);
  for (int k = -1; k <= 1; k++) {
    float i = floor(a / da) + float(k);
    float ii = mod(i, N);
    float h1 = hash12(vec2(ii, 2.3)), h2 = hash12(vec2(ii, 5.9)), h3 = hash12(vec2(ii, 7.1));
    if (h1 > uAmount * 0.95) continue;
    float ac = (i + 0.5 + (h2 - 0.5) * 0.8) * da;
    float r0 = rpx * (1.15 + 1.4 * h3 * h3);
    if (r < r0) continue;
    float dist = sin(a - ac) * r;
    float x = (r - r0) / (rMax - r0);
    float w = (1.0 + 7.0 * h2 * thick) * U * (0.2 + 1.6 * smoothstep(0.0, 0.6, x));
    float tip = smoothstep(0.0, 0.06, x);
    ink = max(ink, (1.0 - smoothstep(w * 0.5 * tip - 0.6, w * 0.5 * tip + 0.6, abs(dist))));
  }
  return ink;
}
void main() {
  vec2 p = vUv * uRes;
  float U = UNIT();
  vec3 c = texture(tInput, vUv).rgb;
  vec4 s = subject();
  vec2 cpx = s.xy * uRes;
  float rpx = s.z * uRes.y;
  bool chr = isCharacterRole(roleAt(tNormal, vUv)) && texture(tDepth, vUv).r < 0.99999;
  // 线色按一小片区域的平均亮度定（网点、细纹理上不会一段黑一段白）
  vec2 px6 = 6.0 * U / uRes;
  float bgL = (lum(texture(tInput, vUv).rgb) + lum(texture(tInput, vUv + vec2(px6.x, 0.0)).rgb) + lum(texture(tInput, vUv - vec2(px6.x, 0.0)).rgb)
             + lum(texture(tInput, vUv + vec2(0.0, px6.y)).rgb) + lum(texture(tInput, vUv - vec2(0.0, px6.y)).rgb)) / 5.0;
  // 深色背景上用白线（漫画里常见的「白抜き」），亮背景上用墨线
  vec3 lineCol = bgL < 0.3 ? uPaper : uInk;
  if (uMode < 1.5) {
    float ink = speedLines(p, cpx, rpx, U);
    if (!chr) c = mix(c, lineCol, ink);
  } else if (uMode < 2.5) {
    float ink = focusLines(p, cpx, rpx, U, 0.6);
    if (!chr) c = mix(c, lineCol, ink);
  } else {
    // 冲击：锯齿星形的白色爆炸（黑描边）垫在主角身后，外面一圈粗集中线，背景压成高反差
    vec2 d = (p - cpx) / uRes.y;
    float r = length(d);
    float a = atan(d.y, d.x);
    float n = 15.0;
    float seg = (a / (2.0 * PI) + 0.5) * n;
    float si = floor(seg);
    float tri = 1.0 - abs(fract(seg) - 0.5) * 2.0;
    float lenK = mix(0.55, 1.0, hash12(vec2(mod(si, n), 3.3)));
    float R0 = s.z * 1.6 + 0.07;
    float R = R0 * (0.72 + 0.95 * pow(tri, 2.2) * lenK) * (0.6 + 0.8 * uAmount);
    float ow = 3.5 * U / uRes.y;
    float inside = 1.0 - smoothstep(R - ow * 0.5, R + ow * 0.5, r);
    float edge = 1.0 - smoothstep(ow * 0.5, ow * 1.5, abs(r - R));
    vec3 hc = vec3(lum(c));
    hc = smoothstep(0.25, 0.75, hc);
    vec3 bg = mix(c, mix(uInk, uPaper, hc), 0.55 * uAmount);
    float ink = focusLines(p, cpx, R * uRes.y * 0.55, U, 1.0);
    bg = mix(bg, uInk, ink * (1.0 - inside));
    // 爆炸内部：纸白 + 几条细放射线
    float rays = focusLines(p, cpx, rpx * 0.4, U * 0.5, 0.3) * 0.5;
    vec3 burst = mix(uPaper, uInk, rays * inside);
    vec3 env = mix(bg, burst, inside);
    env = mix(env, uInk, edge);
    if (!chr) c = env;
  }
  oColor = vec4(c, 1.0);
}`;

/* ---------------- 分格 ---------------- */
const PANELS = PRINT_LIB + SUBJECT_FN + /* glsl */ `
uniform sampler2D tInput;
uniform float uLayout;   // 1 单格画框，2 三格（宽 + 两格斜切，右下是特写），3 四格（远、特写、中、全）
/* 有符号距离：点到凸四边形（逆时针 a b c d）里面为负 */
float sdQuad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
  vec2 e[4] = vec2[4](b - a, c - b, d - c, a - d);
  vec2 v[4] = vec2[4](a, b, c, d);
  float m = -1e9;
  for (int i = 0; i < 4; i++) {
    vec2 n = normalize(vec2(e[i].y, -e[i].x));
    m = max(m, dot(p - v[i], n));
  }
  return m;
}
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 P = vUv * asp;            // 按画面高为 1 的坐标（斜线角度不随画幅变形）
  float W = asp.x;
  float U = UNIT();
  float g = 0.016;               // 格间距（画面高的比例）
  float bw = 3.2 * U / uRes.y;   // 格框线宽
  vec4 s = subject();
  // 每格：四个角（逆时针）、取景中心（0~1 画面坐标）、放大倍数
  vec2 Q[16]; vec3 V[4]; int n = 1;
  float m = 0.035;
  if (uLayout < 1.5) {
    Q[0] = vec2(m, m); Q[1] = vec2(W - m, m); Q[2] = vec2(W - m, 1.0 - m); Q[3] = vec2(m, 1.0 - m);
    V[0] = vec3(0.5, 0.5, 1.0); n = 1;
  } else if (uLayout < 2.5) {
    float yb = 0.47;
    Q[0] = vec2(m, yb + g * 0.5); Q[1] = vec2(W - m, yb + 0.05 + g * 0.5); Q[2] = vec2(W - m, 1.0 - m); Q[3] = vec2(m, 1.0 - m);
    float xs = W * 0.56;
    Q[4] = vec2(m, m); Q[5] = vec2(xs - 0.06 - g * 0.5, m); Q[6] = vec2(xs + 0.06 - g * 0.5, yb + 0.05 * (xs + 0.06) / W - g * 0.5); Q[7] = vec2(m, yb - g * 0.5);
    Q[8] = vec2(xs - 0.06 + g * 0.5, m); Q[9] = vec2(W - m, m); Q[10] = vec2(W - m, yb + 0.05 - g * 0.5); Q[11] = vec2(xs + 0.06 + g * 0.5, yb + 0.05 * (xs + 0.06) / W - g * 0.5);
    V[0] = vec3(0.5, 0.66, 1.0); V[1] = vec3(0.5, 0.42, 1.35); V[2] = vec3(s.xy, 2.4); n = 3;
  } else {
    float xm = W * 0.5, ym = 0.5;
    Q[0] = vec2(m, ym + g * 0.5); Q[1] = vec2(xm + 0.04 - g * 0.5, ym + g * 0.5); Q[2] = vec2(xm - 0.04 - g * 0.5, 1.0 - m); Q[3] = vec2(m, 1.0 - m);
    Q[4] = vec2(xm + 0.04 + g * 0.5, ym + g * 0.5); Q[5] = vec2(W - m, ym + g * 0.5); Q[6] = vec2(W - m, 1.0 - m); Q[7] = vec2(xm - 0.04 + g * 0.5, 1.0 - m);
    Q[8] = vec2(m, m); Q[9] = vec2(xm - 0.04 - g * 0.5, m); Q[10] = vec2(xm + 0.04 - g * 0.5, ym - g * 0.5); Q[11] = vec2(m, ym - g * 0.5);
    Q[12] = vec2(xm - 0.04 + g * 0.5, m); Q[13] = vec2(W - m, m); Q[14] = vec2(W - m, ym - g * 0.5); Q[15] = vec2(xm + 0.04 + g * 0.5, ym - g * 0.5);
    V[0] = vec3(0.5, 0.5, 1.0); V[1] = vec3(s.xy, 2.8); V[2] = vec3(s.xy + vec2(0.0, 0.03), 1.7); V[3] = vec3(0.5, 0.5, 1.15); n = 4;
  }
  vec3 col = uPaper;
  for (int k = 0; k < 4; k++) {
    if (k >= n) break;
    float sd = sdQuad(P, Q[k * 4], Q[k * 4 + 1], Q[k * 4 + 2], Q[k * 4 + 3]);
    if (sd > bw) continue;
    // 这一格的包围盒中心与大小 → 取景
    vec2 lo = min(min(Q[k * 4], Q[k * 4 + 1]), min(Q[k * 4 + 2], Q[k * 4 + 3]));
    vec2 hi = max(max(Q[k * 4], Q[k * 4 + 1]), max(Q[k * 4 + 2], Q[k * 4 + 3]));
    vec2 pc = (lo + hi) * 0.5 / asp;
    float z = V[k].z;
    vec2 half_ = (hi - lo) * 0.5 / asp / z;
    // 放大 1 倍的格子原样对位（画面与游戏 UI 的标记仍对得上）；特写格的取景中心收在画面以内
    vec2 tc = z <= 1.001 ? pc : clamp(V[k].xy, half_, 1.0 - half_);
    vec2 suv = z <= 1.001 ? vUv : tc + (vUv - pc) / z;
    vec3 img = texture(tInput, clamp(suv, 0.0, 1.0)).rgb;
    float inner = 1.0 - smoothstep(-0.5 / uRes.y, 0.5 / uRes.y, sd);
    float frame = 1.0 - smoothstep(bw * 0.5 - 0.6 / uRes.y, bw * 0.5 + 0.6 / uRes.y, abs(sd + bw * 0.5));
    col = mix(col, img, inner);
    col = mix(col, uInk, frame);
  }
  oColor = vec4(col, 1.0);
}`;

/* ---------------- 拟声字 ---------------- */
const SFX_FRAG = PRINT_LIB + SUBJECT_FN + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tText;
uniform float uTextAspect;
uniform float uSize;
void main() {
  vec3 c = texture(tInput, vUv).rgb;
  vec4 s = subject();
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  // 放在主角的左上方（主角太靠左时放右上），略微倾斜
  float side = s.x < 0.42 ? 1.0 : -1.0;
  vec2 anchor = s.xy + vec2(side * (0.17 + s.z * 0.6) / asp.x * 1.0, 0.16 + s.z * 0.5);
  anchor = clamp(anchor, vec2(0.18, 0.2), vec2(0.82, 0.86));
  float ang = side * 0.16;
  vec2 q = rot2(-ang) * ((vUv - anchor) * asp);
  float h = uSize;
  vec2 tuv = vec2(q.x / (h * uTextAspect), q.y / h) + 0.5;
  if (all(greaterThanEqual(tuv, vec2(0.0))) && all(lessThanEqual(tuv, vec2(1.0)))) {
    vec4 t = texture(tText, tuv);
    c = mix(c, t.rgb, t.a);
  }
  oColor = vec4(c, 1.0);
}`;

interface SfxDef { text: string; font: string; fill: string; stroke: string; outer: string; shadow?: string; skew: number }
/*
 * 字只用已经打包的字：中文走展示字体（得意黑 / 站酷快乐体），这几个字都在展示字表 display-charset.txt 里；
 * 拉丁字走 Comic Neue（拉丁子集是完整 ASCII）
 */
const SFX: Record<string, SfxDef> = {
  boom: { text: '轰！', font: '400 300px "GAE Condensed CJK", "GAE Sans", sans-serif', fill: '#141414', stroke: '#FFFFFF', outer: '#141414', skew: -0.18 },
  bang: { text: '砰！', font: '400 300px "GAE Condensed CJK", "GAE Sans", sans-serif', fill: '#141414', stroke: '#FFFFFF', outer: '#141414', skew: -0.18 },
  dong: { text: '咚咚', font: '400 300px "GAE Comic CJK", "GAE Sans", sans-serif', fill: '#FFFFFF', stroke: '#141414', outer: '#FFFFFF', skew: -0.08 },
  pow: { text: 'POW!', font: '700 300px "GAE Comic", sans-serif', fill: '#FFE14D', stroke: '#141414', outer: '#FFFFFF', shadow: '#E8384F', skew: -0.12 },
  wham: { text: 'WHAM!', font: '700 300px "GAE Comic", sans-serif', fill: '#FF6B2C', stroke: '#141414', outer: '#FFFFFF', shadow: '#FFE14D', skew: -0.12 },
};

class SfxText {
  texture: THREE.CanvasTexture | null = null;
  aspect = 2;
  private texW = 0;
  private canvas: HTMLCanvasElement | null = null;
  private key = '';

  /** 放掉 GPU 纹理（下次 update 重画；收尾 X / 复查 F9） */
  dispose() { this.texture?.dispose(); this.texture = null; this.key = ''; }

  update(word: string) {
    const d = SFX[word];
    if (!d || typeof document === 'undefined') return;
    void loadHudFonts();
    const key = `${word}|${hudFontsVersion()}`;
    if (key === this.key && this.texture) return;
    this.key = key;
    if (!this.canvas) this.canvas = document.createElement('canvas');
    const cv = this.canvas;
    const g0 = cv.getContext('2d')!;
    g0.font = d.font;
    const tw = g0.measureText(d.text).width;
    const H = 420, pad = 70;
    cv.width = Math.ceil(tw + pad * 2 + H * Math.abs(d.skew));
    cv.height = H;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = d.font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.setTransform(1, 0, d.skew, 1, cv.width / 2 - d.skew * H * 0.5, H / 2 + 10);
    // 外圈细线 → 粗白边 → 投影色 → 字面
    g.strokeStyle = d.outer; g.lineWidth = 64; g.strokeText(d.text, 0, 0);
    g.strokeStyle = d.stroke; g.lineWidth = 44; g.strokeText(d.text, 0, 0);
    if (d.shadow) { g.fillStyle = d.shadow; g.fillText(d.text, 12, 12); }
    g.fillStyle = d.fill; g.fillText(d.text, 0, 0);
    this.aspect = cv.width / cv.height;
    // GPU 纹理尺寸不可变：画布宽度变了就换一张纹理
    if (this.texture && (this.texture.image as HTMLCanvasElement | undefined)?.width !== this.texW) { this.texture.dispose(); this.texture = null; }
    this.texW = cv.width;
    if (!this.texture) {
      this.texture = new THREE.CanvasTexture(cv);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.generateMipmaps = false;
    }
    this.texture.needsUpdate = true;
  }
}
const sfxText = new SfxText();

const ink = (p: FullscreenPass, c: FxCtx) => {
  (p.uniforms.uInk.value as THREE.Color).copy(c.ink);
  (p.uniforms.uPaper.value as THREE.Color).copy(c.paper);
  p.uniforms.tNormal.value = c.normal;
  p.uniforms.tDepth.value = c.depth;
  p.uniforms.uCenterMode.value = str(c.values, 'surface.mangaCenter') === 'center' ? 1 : 0;
  p.uniforms.tSubject.value = subjectTex(c);
};
const commonU = () => ({
  tNormal: { value: null }, tDepth: { value: null }, tSubject: { value: null }, uCenterMode: { value: 0 },
  uStrength: { value: 1 }, uScale: { value: 1 }, uPaper: { value: new THREE.Color(1, 1, 1) }, uInk: { value: new THREE.Color(0, 0, 0) },
});

registerFx({
  id: 'p1b-manga', stage: 'afterOverlay', order: 10, frag: MANGA,
  uniforms: { ...commonU(), uMode: { value: 1 }, uAmount: { value: 0.7 }, uAngle: { value: 0 } },
  extra: { subject: { frag: SUBJECT, uniforms: { tNormal: { value: null } } } },
  active: (v) => str(v, 'surface.mangaFx') !== 'none',
  // 主角定位的 1×1 目标三个漫画 fx 共用，挂在这一个上释放（下一帧谁先用谁重建）
  dispose() { subjectRT?.dispose(); subjectRT = null; subjectFrame = null; },
  setup(p, c) {
    ink(p, c);
    p.uniforms.uMode.value = ['none', 'speed', 'focus', 'impact'].indexOf(str(c.values, 'surface.mangaFx'));
    p.uniforms.uAmount.value = num(c.values, 'surface.mangaAmount');
    p.uniforms.uAngle.value = (num(c.values, 'surface.mangaAngle') * Math.PI) / 180;
  },
});

registerFx({
  id: 'p1b-panels', stage: 'afterOverlay', order: 20, frag: PANELS,
  uniforms: { ...commonU(), uLayout: { value: 1 } },
  active: (v) => str(v, 'surface.panels') !== 'none',
  setup(p, c) {
    ink(p, c);
    p.uniforms.uLayout.value = ['none', 'frame', 'three', 'four'].indexOf(str(c.values, 'surface.panels'));
  },
});

registerFx({
  id: 'p1b-sfx', stage: 'afterOverlay', order: 30, frag: SFX_FRAG,
  uniforms: { ...commonU(), tText: { value: null }, uTextAspect: { value: 2 }, uSize: { value: 0.22 } },
  active: (v) => str(v, 'surface.sfxText') !== 'none',
  dispose() { sfxText.dispose(); },
  setup(p, c) {
    ink(p, c);
    sfxText.update(str(c.values, 'surface.sfxText'));
    p.uniforms.tText.value = sfxText.texture;
    p.uniforms.uTextAspect.value = sfxText.aspect;
    p.uniforms.uSize.value = 0.2 * num(c.values, 'surface.sfxSize');
  },
});

if (import.meta.hot) import.meta.hot.accept();
