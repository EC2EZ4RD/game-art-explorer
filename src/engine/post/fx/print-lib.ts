import * as THREE from 'three';
import { num } from '../../../dims/registry';
import type { Role } from '../../../content/roles';
import { hexToRgb, linearToOklab, srgbToLinear } from '../../../core/color';
import type { FullscreenPass } from '../FullscreenPass';
import type { FxCtx } from './registry';

/*
 * P1b 版画与漫画：各媒介共用的 GLSL 与 uniform 设置。
 * 颜色约定与内置媒介一样：输入是调色后的显示空间画面（sRGB 编码 0~1）；媒介按 surface.strength 与原画混合。
 * 尺寸一律按「1080 行画面里的像素」写（UNIT = 画面高 / 1080），缩略图与全屏看到的笔点、线宽比例一致。
 */

/** 媒介 pass 的公共 uniform（每个 fx 一份，对象本身要稳定：管线按对象判断要不要重编译） */
export function mediumUniforms(extra: Record<string, THREE.IUniform> = {}): Record<string, THREE.IUniform> {
  return {
    tNormal: { value: null },
    tDepth: { value: null },
    uStrength: { value: 0.85 },
    uScale: { value: 1 },
    uPaper: { value: new THREE.Color(1, 1, 1) },
    uInk: { value: new THREE.Color(0, 0, 0) },
    ...extra,
  };
}

/** 写公共 uniform：强度、尺度、纸色、墨色、法线 / 深度缓冲 */
export function setMedium(p: FullscreenPass, c: FxCtx) {
  const u = p.uniforms;
  u.tNormal.value = c.normal;
  u.tDepth.value = c.depth;
  u.uStrength.value = num(c.values, 'surface.strength');
  u.uScale.value = num(c.values, 'surface.scale');
  (u.uPaper.value as THREE.Color).copy(c.paper);
  (u.uInk.value as THREE.Color).copy(c.ink);
}

/** 色板某个角色的颜色（显示空间）写进 vec3 uniform */
export function setRole(u: THREE.IUniform, c: FxCtx, role: Role) {
  (u.value as THREE.Color).setRGB(...hexToRgb(c.palette.roles[role]));
}

/**
 * 版画油墨表 → GLSL 常量：NAME_N、NAME_LAB（OKLab，分类用）、NAME_T（相对参考纸色的透过率：最终颜色 = 纸色 × 透过率）。
 * 第 0 项是纸（不上墨）。dilute 里列出的墨再加一档「冲淡」（约一半浓度：浮世绘的淡墨、淡蓝）
 */
export function inkTable(name: string, inks: string[], refPaper: string, dilute: string[] = [], bias: Record<string, number> = {}): string {
  const P = hexToRgb(refPaper);
  const all: [number, number, number][] = [P];
  const b: number[] = [bias.paper ?? 0];
  for (const h of inks) { all.push(hexToRgb(h)); b.push(bias[h] ?? 0); }
  for (const h of dilute) {
    const c = hexToRgb(h);
    all.push([0, 1, 2].map((i) => P[i] * Math.pow(Math.min(1, c[i] / P[i]), 0.45)) as [number, number, number]);
    b.push(bias[`${h}/2`] ?? 0);
  }
  const f = (x: number) => x.toFixed(4);
  const lab = all.map((c) => linearToOklab(c.map(srgbToLinear) as [number, number, number]));
  const T = all.map((c) => c.map((x, i) => Math.min(1, x / P[i])));
  const n = all.length;
  return `const int ${name}_N = ${n};
const vec3 ${name}_LAB[${n}] = vec3[${n}](${lab.map((l) => `vec3(${l.map(f).join(', ')})`).join(', ')});
const vec3 ${name}_T[${n}] = vec3[${n}](${T.map((t) => `vec3(${t.map(f).join(', ')})`).join(', ')});
const float ${name}_B[${n}] = float[${n}](${b.map(f).join(', ')});
`;
}

/** 画面高按 1080 行折算的单位（缩略图里同样比例） */
export const unitOf = (c: FxCtx) => Math.max(0.35, c.res.y / 1080);

export const PRINT_LIB = /* glsl */ `
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform float uStrength;
uniform float uScale;
uniform vec3 uPaper;
uniform vec3 uInk;
const float PI = 3.14159265;
/* 1080 行画面里的一个像素 */
float UNIT() { return max(0.35, uRes.y / 1080.0); }
bool skyAt(vec2 uv) { return texture(tDepth, uv).r > 0.99999; }
/* OKLab 的 亮度 / 彩度 / 色相 */
vec3 toLch(vec3 srgb) { vec3 l = toOklab(srgbToLin(clamp(srgb, 0.0, 1.0))); return vec3(l.x, length(l.yz), atan(l.z, l.y)); }
vec3 fromLch(vec3 lch) { return clamp(linToSrgb(fromOklab(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z)))), 0.0, 1.0); }
/* 色相差（弧度，-PI~PI） */
float hueDiff(float a, float b) { float d = a - b; return atan(sin(d), cos(d)); }
/* 2D 旋转 */
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
/*
 * 物体分界线（版画的主版线）：深度的二阶跳变（平面不出线，只有前后错开处出线）、法线折角、颜色角色分界。
 * w = 取样半径（像素）；返回 0~1。天空与天空之间不出线
 */
/* 雨雪粒子：法线缓冲写的是正对镜头的法线、角色编号 0（见 materials.ts 的 PARTICLE_FRAG）：版画的线不描它们 */
bool particleAt(vec4 n) { return n.a < 0.008 && abs(n.r - 0.5) < 0.002 && abs(n.g - 0.5) < 0.002 && n.b > 0.998; }
float keyLineW(vec2 uv, float w, float crease) {
  vec2 px = vec2(w) / uRes;
  float r0d = texture(tDepth, uv).r;
  float d0 = linDepth(r0d);
  vec4 n0 = texture(tNormal, uv);
  float role0 = floor(n0.a * 64.0);
  bool sky0 = r0d > 0.99999;
  if (particleAt(n0)) return 0.0;
  vec2 o[4] = vec2[4](vec2(px.x, 0.0), vec2(-px.x, 0.0), vec2(0.0, px.y), vec2(0.0, -px.y));
  float dd[4];
  float e = 0.0;
  for (int i = 0; i < 4; i++) {
    float rd = texture(tDepth, uv + o[i]).r;
    dd[i] = linDepth(rd);
    vec4 nb = texture(tNormal, uv + o[i]);
    if (particleAt(nb)) { dd[i] = d0; continue; }
    bool sk = rd > 0.99999;
    if (sk != sky0) { e = 1.0; continue; }
    if (sky0) continue;
    e = max(e, smoothstep(crease, crease + 0.25, 1.0 - dot(n0.rgb * 2.0 - 1.0, nb.rgb * 2.0 - 1.0)));
    if (floor(nb.a * 64.0) != role0) e = max(e, 0.85);
  }
  if (!sky0) {
    // 二阶差分：同一平面上（再斜也）接近 0，前后错开的轮廓处很大
    float lx = abs(dd[0] + dd[1] - 2.0 * d0), ly = abs(dd[2] + dd[3] - 2.0 * d0);
    e = max(e, smoothstep(0.012, 0.03, max(lx, ly) / max(d0, 1e-3)));
  }
  return e;
}
float keyLine(vec2 uv, float w) { return keyLineW(uv, w, 0.45); }
/*
 * 金箔：一张张方形箔片成行贴上，相邻片叠压出细缝；每片的金色、反光略不同（各自有点翘），
 * 有细皱纹，偶尔破口露出底下的红褐色胶底；整体有一道斜向的缓慢流光。S = 箔片边长（像素）
 */
vec3 goldLeafK(vec2 p, float S, float shimmer, vec3 lo, vec3 hi, float seamK, float tiltK);
vec3 goldLeafAt(vec2 p, float S, float shimmer) { return goldLeafK(p, S, shimmer, vec3(0.74, 0.55, 0.2), vec3(0.96, 0.8, 0.4), 0.32, 0.18); }
/* 同上，可调每片金色的范围 lo~hi、叠压缝压暗的程度 seamK、每片微翘的渐变 tiltK（屏风的金箔天空用小片、窄范围、浅缝、少翘，收尾 X） */
vec3 goldLeafK(vec2 p, float S, float shimmer, vec3 lo, vec3 hi, float seamK, float tiltK) {
  float U = UNIT();
  vec2 q = p / S;
  float row = floor(q.y);
  q.x += hash12(vec2(row, 3.1)) * 0.6;
  vec2 id = floor(q), f = fract(q);
  float t = hash12(id);
  vec3 g = mix(lo, hi, t);
  // 每片微翘：片内有一点渐变
  float tilt = dot(f - 0.5, normalize(hash22(id + 7.0) - 0.5)) * tiltK;
  g *= 1.0 + tilt;
  // 叠压的缝：左、下两边是压在上一片之上的边（亮一点的边 + 暗缝）
  float sx = f.x * S / U, sy = f.y * S / U;
  float seam = 1.0 - smoothstep(0.0, 1.6, min(sx, sy));
  float lip = smoothstep(1.2, 2.2, min(sx, sy)) * (1.0 - smoothstep(2.2, 4.0, min(sx, sy)));
  g *= 1.0 - seamK * seam;
  g *= 1.0 + 0.08 * lip;
  // 细皱纹
  float wr = abs(vnoise(p / (9.0 * U) + id * 3.0) - 0.5);
  g *= 1.0 - 0.12 * (1.0 - smoothstep(0.0, 0.05, wr));
  // 流光：一道斜向的宽亮带，随时间缓慢移动
  float band = sin((p.x + p.y * 0.6) / uRes.y * 2.6 - uTime * 0.35 * shimmer + t * 0.6);
  g *= 0.9 + 0.22 * smoothstep(0.2, 1.0, band);
  // 破口：露出红褐色的胶底
  float hole = smoothstep(0.9, 0.93, vnoise(p / (6.0 * U) + id * 13.0)) * step(0.85, hash12(id + 2.0));
  g = mix(g, vec3(0.5, 0.2, 0.12), hole * 0.85);
  return clamp(g, 0.0, 1.0);
}
/* 和纸 / 宣纸：长纤维 + 云状纸浆起伏，返回 -1~1 的起伏 */
float washi(vec2 p) {
  float U = UNIT();
  vec2 q = p / U;
  float cloud = fbm(q / 90.0) - 0.5;
  float f = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = hash12(vec2(float(i) * 13.1, 7.7)) * PI;
    vec2 r = rot2(a) * q;
    float fib = vnoise(vec2(r.x / 40.0, r.y / 1.4) + float(i) * 31.0);
    f += smoothstep(0.72, 0.95, fib) * 0.6;
  }
  return clamp(cloud * 0.9 + f * 0.5 + (hash12(floor(q)) - 0.5) * 0.15, -1.0, 1.0);
}
`;
