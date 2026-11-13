import * as THREE from 'three';
import { ROLE_INDEX, type Role } from '../content/roles';
import { mulberry32 } from '../core/rng';
import { SHARED_DECL } from './materials/glsl';
import { U } from './materials/uniforms';
import { LAYER_FX } from './scene/build';
import type { SceneEmitter } from './scene/types';

/*
 * 粒子与弹幕（技术补全 2026-10-23，K 轨道）：两套 GPU 粒子，位置全在顶点着色器里按时间算出来，CPU 每帧只写几个 uniform。
 *   AmbientParticles：画面里的氛围粒子（motion.particles：火星 / 萤火 / 雪 / 魔法 / 彩纸 / 火花 / 浮尘），铺在镜头注视点周围一个盒子里，
 *     盒子按取景大小缩放（2D 小取景和 3D 大场景都合适），密度只改绘制数量；魔法粒子绕着玩家转（技能光环）。
 *   EmitterParticles：场景自带的发射器（SceneDesc.emitters：弹幕的一圈圈、螺旋、扇形、自机子弹，火把的火星，宝物的闪光）。
 * 两者都写场景的两张输出（颜色 + 法线 / 角色），所以描边、像素化、量化、辉光照常作用；不混合（不透明 + 抖动丢像素做软边，像素风也干净）。
 * 节拍（motion.beat）：uBeat = 每拍一下的脉冲（瞬间到 1、按指数衰减），粒子跟着一涨一落。
 */

/** 氛围粒子的种类（与 motion.particles 的选项一一对应） */
export const PARTICLE_KINDS = ['none', 'embers', 'fireflies', 'snow', 'magic', 'confetti', 'sparks', 'dust'] as const;
export type ParticleKind = (typeof PARTICLE_KINDS)[number];

const MAX_AMBIENT = 3000;

const COMMON = /* glsl */ `
${SHARED_DECL}
uniform float uT;
uniform float uBeat;
uniform float uBeatP;
uniform float uSizeK;
uniform float uPxK;
const int B4[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
float bayer4(vec2 fc) { ivec2 q = ivec2(fc) & 3; return (float(B4[q.y * 4 + q.x]) + 0.5) / 16.0; }
`;
/** 顶点阶段：世界尺寸 → 点的像素大小（正交按取景，透视再除以深度；内部分辨率，像素化时跟着变小） */
const COMMON_V = /* glsl */ `
${COMMON}
float pointPx(float worldSize, vec4 mv) {
  float k = projectionMatrix[1][1] * uResolution.y * 0.5 * worldSize;
  return clamp(isOrthographic ? k : k / max(-mv.z, 0.05), 1.0, 72.0);
}
`;

const OUT = /* glsl */ `
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oNormal;
`;

/* ---------------- 氛围粒子 ---------------- */

const AMBIENT_VERT = /* glsl */ `
${COMMON_V}
uniform int uKind;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform vec3 uPlayer;
uniform float uHasPlayer;
uniform float uGround;
in vec4 aSeed;
out vec3 vCol;
out float vGlow;
out float vShape;
out float vFlip;
out float vSoft;
vec3 roleCol(int r) { return uRoleColors[r]; }
float h1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
void main() {
  vec4 s = aSeed;
  float t = uT;
  vec3 c = uCenter, B = uBox;
  vec3 p;
  float size = 0.08, glow = 1.0, soft = 0.0, shape = 0.0;
  vec3 col = vec3(1.0);
  if (uKind == 1) {
    // 火星：从下往上飘、左右摆、一闪一闪，越高越小
    // 寿命 0 → 1：从盒子底部升起，上到一半多就烧尽（越往上越小、越稀）
    float life = fract(s.y + t * (0.16 + s.z * 0.14));
    p = c + vec3((s.x - 0.5) * B.x, -B.y * 0.5 + life * B.y * 0.75, (s.z - 0.5) * B.z);
    p.x += sin(life * 9.0 + s.w * 20.0) * 0.06 * B.y + sin(t * 1.3 + s.w * 40.0) * 0.015 * B.y;
    size = 0.085 * pow(1.0 - life, 1.4);
    glow = 1.25 + 0.45 * sin(t * 11.0 + s.w * 50.0);
    // 火是暖的：色板的发光色 / 强调色里掺一半固定的橙红（冷色板里火星也读得出是火；亮度压住，免得辉光把它烧成白点）
    col = mix(mix(roleCol(R_EMISSIVE), roleCol(R_ACCENT), 0.3 + s.z * 0.5), vec3(1.0, 0.36, 0.06), 0.5);
  } else if (uKind == 2) {
    // 萤火：贴近地面慢慢游走，一会儿亮一会儿灭
    p = c + vec3((s.x - 0.5) * B.x, 0.0, (s.z - 0.5) * B.z);
    p.y = uGround + 0.3 + s.y * B.y * 0.35;
    p += vec3(sin(t * 0.37 + s.w * 30.0), sin(t * 0.53 + s.x * 20.0) * 0.4, cos(t * 0.41 + s.y * 25.0)) * B.y * 0.05;
    float blink = pow(max(0.0, sin(t * (0.9 + s.w) + s.x * 40.0)), 3.0);
    size = 0.16 * (0.35 + 0.65 * blink);
    glow = 0.4 + 2.2 * blink;
    soft = 1.0;
    col = mix(roleCol(R_EMISSIVE), roleCol(R_FOLIAGE) * 1.6, 0.25);
  } else if (uKind == 3) {
    // 雪：大小不一的片往下飘、左右荡
    float fall = fract(s.y - t * (0.05 + s.z * 0.05));
    p = c + vec3((s.x - 0.5) * B.x, -B.y * 0.5 + fall * B.y, (s.z - 0.5) * B.z);
    p.x += sin(t * 0.8 + s.w * 30.0) * B.y * 0.03;
    size = 0.06 + s.w * 0.07;
    glow = 1.0;
    soft = 1.0;
    col = roleCol(R_SNOW) * 1.1;
  } else if (uKind == 4) {
    // 魔法：绕着玩家（没有玩家就绕注视点）螺旋上升的光点，三种颜色
    vec3 o = uHasPlayer > 0.5 ? uPlayer : c - vec3(0.0, B.y * 0.25, 0.0);
    float rise = fract(s.y + t * (0.18 + s.z * 0.12));
    float dir = s.w > 0.5 ? 1.0 : -1.0;
    float a = s.x * 6.2832 + t * (1.2 + s.z) * dir;
    float r = (0.55 + s.z * 0.9 + rise * 0.35) * clamp(B.y * 0.08, 0.6, 2.0);
    p = o + vec3(cos(a) * r, rise * clamp(B.y * 0.22, 1.6, 4.0), sin(a) * r);
    size = 0.24 * (1.0 - rise * 0.55);
    glow = 2.4 + uBeat * 1.5;
    shape = 2.0;
    col = s.w < 0.33 ? roleCol(R_INTERACTIVE) : s.w < 0.66 ? roleCol(R_EMISSIVE) : roleCol(R_ACCENT);
  } else if (uKind == 5) {
    // 彩纸：翻着落下（宽度随翻转变化），六种颜色
    float fall = fract(s.y - t * (0.07 + s.z * 0.05));
    p = c + vec3((s.x - 0.5) * B.x, -B.y * 0.5 + fall * B.y, (s.z - 0.5) * B.z);
    p.x += sin(t * 1.7 + s.w * 30.0) * B.y * 0.04;
    size = 0.2;
    glow = 1.15;
    shape = 1.0;
    vFlip = cos(t * (4.0 + s.w * 5.0) + s.x * 30.0);
    int k = int(floor(s.w * 6.0));
    col = k == 0 ? roleCol(R_ACCENT) : k == 1 ? roleCol(R_INTERACTIVE) : k == 2 ? roleCol(R_FLOWER) : k == 3 ? roleCol(R_CHARACTERACCENT) : k == 4 ? roleCol(R_CLOTH) : roleCol(R_EMISSIVE);
  } else if (uKind == 6) {
    // 火花：一簇簇炸开、带重力落下（节拍开着时每拍炸一次）
    float cl = floor(s.x * 7.0);
    // 节拍开着：每一拍所有簇一起炸（烟花踩点）；没开：各簇错开 1.4 秒一轮
    float P = uBeatP > 0.0 ? uBeatP : 1.4;
    float tt = uBeatP > 0.0 ? t : t + cl * 0.37;
    float n = floor(tt / P);
    float tau = tt - n * P;
    vec3 o = c + (vec3(h1(cl * 3.1 + n * 7.7), h1(cl * 5.3 + n * 3.3), h1(cl * 1.7 + n * 9.1)) - 0.5) * B * vec3(0.9, 0.6, 0.9);
    float th = s.y * 6.2832, ph = acos(mix(-0.2, 1.0, s.z));
    vec3 v = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)) * (0.5 + s.w) * B.y * 0.28;
    p = o + v * tau + vec3(0.0, -0.5, 0.0) * B.y * 0.5 * tau * tau;
    float life = tau / P;
    size = 0.1 * (1.0 - life * 0.8);
    glow = 2.8 * (1.0 - life) + 0.3;
    col = mix(roleCol(R_EMISSIVE), vec3(1.0), 0.35);
  } else {
    // 浮尘：慢慢漂的小亮点（逆光里最明显）
    p = c + (s.xyz - 0.5) * B;
    p += vec3(sin(t * 0.13 + s.w * 30.0), sin(t * 0.21 + s.x * 20.0), cos(t * 0.17 + s.y * 25.0)) * B.y * 0.03;
    size = 0.03 + s.w * 0.025;
    glow = 0.65 + 0.45 * clamp(uSunColor.r, 0.0, 1.0);
    soft = 1.0;
    col = mix(uPaper, uSunColor, 0.4);
  }
  size *= uSizeK * (1.0 + uBeat * 0.45);
  glow *= 1.0 + uBeat * 0.8;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = pointPx(size, mv) * uPxK;
  vCol = col;
  vGlow = glow;
  vShape = shape;
  vSoft = soft;
  if (uKind != 5) vFlip = 1.0;
}
`;

const AMBIENT_FRAG = /* glsl */ `
${COMMON}
in vec3 vCol;
in float vGlow;
in float vShape;
in float vFlip;
in float vSoft;
${OUT}
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float a;
  if (vShape > 1.5) {
    // 四角星
    vec2 aq = abs(q);
    a = 1.0 - smoothstep(0.0, 0.08, min(aq.x, aq.y) * 2.2 + length(q) * 0.55 - 0.18);
  } else if (vShape > 0.5) {
    // 彩纸：宽度随翻转缩放的小长方形
    float w = max(abs(vFlip), 0.12) * 0.42;
    a = step(abs(q.x), w) * step(abs(q.y), 0.26);
  } else {
    float d = length(q) * 2.0;
    a = vSoft > 0.5 ? 1.0 - smoothstep(0.35, 1.0, d) : step(d, 1.0);
  }
  // 硬形状 a 只有 0 / 1；软边（萤火、雪、浮尘）按 4×4 抖动丢像素，像素风里也是干净的点阵
  if (a < bayer4(gl_FragCoord.xy)) discard;
  float core = vShape < 0.5 ? smoothstep(0.55, 0.0, length(q) * 2.0) : 0.0;
  vec3 col = vCol * vGlow + core * 0.35 * vGlow;
  oColor = vec4(col, 1.0);
  // 法线 / 角色写成和天空一样（角色 0）、不写深度：内部线检测不会给每颗小粒子描一圈黑边（像素化配方里小粒子会整颗变成黑点）
  oNormal = vec4(0.5, 0.5, 1.0, 0.0);
}
`;

export class AmbientParticles {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor() {
    const g = new THREE.BufferGeometry();
    const r = mulberry32(4242);
    const seeds = new Float32Array(MAX_AMBIENT * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = r();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_AMBIENT * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...U, uT: { value: 0 }, uBeat: { value: 0 }, uBeatP: { value: 0 }, uSizeK: { value: 1 }, uPxK: { value: 1 }, uKind: { value: 0 },
        uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(20, 10, 20) }, uPlayer: { value: new THREE.Vector3() }, uHasPlayer: { value: 0 }, uGround: { value: 0 },
      },
      vertexShader: AMBIENT_VERT,
      fragmentShader: AMBIENT_FRAG,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.layers.set(LAYER_FX);
    this.points.visible = false;
    this.points.renderOrder = 20;
  }
  /** kind / 数量 / 大小倍数 */
  configure(kind: ParticleKind, density: number, sizeK: number) {
    const k = PARTICLE_KINDS.indexOf(kind);
    this.points.visible = k > 0 && density > 0;
    this.mat.uniforms.uKind.value = Math.max(0, k);
    const base = kind === 'snow' ? 1 : kind === 'dust' ? 0.45 : kind === 'confetti' ? 0.55 : kind === 'sparks' ? 0.8 : kind === 'magic' ? 0.3 : 0.45;
    this.points.geometry.setDrawRange(0, Math.round(MAX_AMBIENT * base * Math.min(1, Math.max(0, density))));
    this.mat.uniforms.uSizeK.value = sizeK;
  }
  /** 每帧：时间、节拍脉冲、注视点、盒子大小、玩家位置 */
  frame(t: number, beat: number, beatP: number, center: THREE.Vector3, viewH: number, aspect: number, player: THREE.Vector3 | null, pxK: number) {
    const u = this.mat.uniforms;
    u.uT.value = t;
    u.uBeat.value = beat;
    u.uBeatP.value = beatP;
    u.uCenter.value.copy(center);
    const H = Math.max(2, Math.min(60, viewH));
    u.uBox.value.set(H * Math.max(1, aspect) * 1.25, H * 1.15, H * 1.4);
    u.uHasPlayer.value = player ? 1 : 0;
    if (player) u.uPlayer.value.copy(player);
    u.uGround.value = player ? player.y : center.y - H * 0.3;
    // 世界尺寸按取景缩放：2D 小取景里粒子不会大得像气球，大场景里也不会小成噪点
    u.uPxK.value = pxK * Math.max(0.5, Math.min(3, H / 10));
  }
  dispose() { this.points.geometry.dispose(); this.mat.dispose(); }
}

/* ---------------- 场景发射器（弹幕、火把火星、闪光） ---------------- */

const EMIT_KIND: Record<SceneEmitter['kind'], number> = { ring: 0, spiral: 0, fan: 1, stream: 2, embers: 3, sparkle: 4 };
const SHAPE: Record<NonNullable<SceneEmitter['shape']>, number> = { orb: 0, rice: 1, star: 2 };

const EMIT_VERT = /* glsl */ `
${COMMON_V}
uniform vec3 uPlayer;
in vec4 aA; // kind, ring k, bullet j, count
in vec4 aB; // pos.xyz, speed
in vec4 aC; // period, rings, spin, dir
in vec4 aD; // spread, size, range, role
in vec4 aE; // shape, follow, seed, 0
out vec3 vCol;
out float vShape;
out vec2 vDir;
out float vFade;
void main() {
  int kind = int(aA.x);
  float k = aA.y, j = aA.z, n = max(aA.w, 1.0);
  vec3 o = aB.xyz + (aE.y > 0.5 ? uPlayer : vec3(0.0));
  float speed = aB.w, period = max(aC.x, 0.02), rings = max(aC.y, 1.0), spin = aC.z, dir = aC.w;
  float spread = aD.x, size = aD.y, range = aD.z;
  float t = uT;
  float age = mod(t - k * period, rings * period);
  float birth = t - age;
  vec3 p;
  vec3 v = vec3(0.0, 0.0, 1.0);
  float fade = 1.0;
  if (kind == 0) {
    float a = j / n * 6.2832 + spin * birth;
    v = vec3(sin(a), 0.0, cos(a));
    p = o + v * speed * age;
    fade = step(speed * age, range);
  } else if (kind == 1) {
    float a = dir + (n > 1.0 ? (j / (n - 1.0) - 0.5) * spread : 0.0) + sin(birth * spin) * 0.25;
    v = vec3(sin(a), 0.0, cos(a));
    p = o + v * speed * age;
    fade = step(speed * age, range);
  } else if (kind == 2) {
    vec3 f = vec3(sin(dir), 0.0, cos(dir)), r = vec3(f.z, 0.0, -f.x);
    v = f;
    p = o + r * (j - (n - 1.0) * 0.5) * spread + f * speed * age;
    fade = step(speed * age, range);
  } else if (kind == 3) {
    float h = fract(aE.z * 7.3 + t * speed / max(range, 0.1) + j / n);
    p = o + vec3(sin(t * 2.3 + j * 3.1) * 0.08 + (fract(j * 0.618) - 0.5) * 0.18, h * range, cos(t * 1.9 + j * 2.3) * 0.08);
    size *= (1.0 - h * 0.8);
    fade = 1.0;
  } else {
    float ph = fract(aE.z * 3.7 + j * 0.618);
    p = o + (vec3(fract(j * 0.754), fract(j * 0.437), fract(j * 0.913)) - 0.5) * range;
    size *= max(0.0, sin(t * 3.0 + ph * 6.2832));
  }
  size *= 1.0 + uBeat * 0.35;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = fade > 0.5 ? pointPx(size, mv) * uPxK : 0.0;
  if (fade < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  // 飞行方向在画面上的朝向（米粒弹按它拉长）
  vec4 c2 = projectionMatrix * (viewMatrix * vec4(p + v * 0.5, 1.0));
  vec2 d = c2.xy / c2.w - gl_Position.xy / gl_Position.w;
  vDir = length(d) > 1e-5 ? normalize(d * vec2(uResolution.x / uResolution.y, 1.0)) : vec2(0.0, 1.0);
  vCol = uRoleColors[int(aD.w)];
  vShape = aE.x;
  vFade = fade;
}
`;

const EMIT_FRAG = /* glsl */ `
${COMMON}
in vec3 vCol;
in float vShape;
in vec2 vDir;
in float vFade;
${OUT}
void main() {
  vec2 q = gl_PointCoord - 0.5;
  q.y = -q.y;
  float r;
  if (vShape > 1.5) {
    vec2 aq = abs(q);
    r = min(aq.x, aq.y) * 2.4 + length(q) * 1.1;
  } else if (vShape > 0.5) {
    // 米粒弹：沿飞行方向拉长的椭圆
    vec2 ax = vec2(dot(q, vDir), dot(q, vec2(-vDir.y, vDir.x)));
    r = length(ax * vec2(2.0, 4.2));
  } else r = length(q) * 2.0;
  if (r > 1.0) discard;
  // 白芯 + 本色环 + 一圈深色边（东方式的弹幕：底色再乱也读得出）
  vec3 col = r < 0.45 ? mix(vec3(1.0), vCol, 0.25) * 1.6 : r < 0.82 ? vCol * 1.7 : vCol * 0.35;
  oColor = vec4(col, 1.0);
  oNormal = vec4(0.5, 0.5, 1.0, (float(R_EMISSIVE) + 0.5) / 64.0);
}
`;

export class EmitterParticles {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor(list: SceneEmitter[]) {
    const rows: number[][] = [];
    const rr = mulberry32(77);
    for (const e of list) {
      const rings = e.kind === 'embers' || e.kind === 'sparkle' ? 1 : e.rings ?? 6;
      for (let k = 0; k < rings; k++) for (let j = 0; j < e.count; j++) {
        rows.push([EMIT_KIND[e.kind], k, j, e.count, ...e.pos, e.speed, e.period ?? 0.5, rings, e.spin ?? 0, e.dir ?? 0, e.spread ?? 0, e.size, e.range, ROLE_INDEX[e.role as Role], SHAPE[e.shape ?? 'orb'], e.follow ? 1 : 0, rr(), 0]);
      }
    }
    const g = new THREE.BufferGeometry();
    const N = rows.length;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const att = (o: number) => { const a = new Float32Array(N * 4); rows.forEach((r, i) => a.set(r.slice(o, o + 4), i * 4)); return new THREE.BufferAttribute(a, 4); };
    g.setAttribute('aA', att(0)); g.setAttribute('aB', att(4)); g.setAttribute('aC', att(8)); g.setAttribute('aD', att(12)); g.setAttribute('aE', att(16));
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { ...U, uT: { value: 0 }, uBeat: { value: 0 }, uBeatP: { value: 0 }, uSizeK: { value: 1 }, uPxK: { value: 1 }, uPlayer: { value: new THREE.Vector3() } },
      vertexShader: EMIT_VERT,
      fragmentShader: EMIT_FRAG,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.layers.set(LAYER_FX);
    this.points.renderOrder = 21;
  }
  frame(t: number, beat: number, player: THREE.Vector3 | null, pxK: number) {
    const u = this.mat.uniforms;
    u.uT.value = t;
    u.uBeat.value = beat;
    u.uPxK.value = pxK;
    if (player) u.uPlayer.value.copy(player);
  }
  dispose() { this.points.geometry.dispose(); this.mat.dispose(); }
}
