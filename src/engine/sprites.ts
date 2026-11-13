import * as THREE from 'three';
import { CARRIER_ASSET, FX_ASSET, getAsset, type PuppetPart } from '../content/assets';
import { ROLE_INDEX } from '../content/roles';
import { num, str } from '../dims/registry';
import type { Values } from '../dims/types';
import { NOISE, SHARED_DECL, SURFACE_LIB } from './materials/glsl';
import { U } from './materials/uniforms';
import { LAYER_FX } from './scene/build';
import { assetTexture } from './textures';

/*
 * 二维角色载体与序列帧特效（素材为 AI 生成，见 src/content/assets.json）：
 *   像素精灵：4 方向 × 4 帧行走图，按"角色移动方向相对镜头"选行，最近邻放大；
 *   纸片人：10 个部件按关节串成层级，整组正对镜头，走路时绕关节摆动，朝左时水平翻转；
 *   2D 特效：8 帧图集按自己的帧率逐帧播放，正对镜头，跟着角色。
 * 都写进场景的两张输出（颜色 + 法线/角色编号），所以描边、媒介、保留强调色照常生效。
 * 只在主相机层（不投影）；用 alpha 测试写深度，和三维场景正确遮挡。
 */

const VERT = /* glsl */ `
${SHARED_DECL}
uniform vec4 uRect;
out vec2 vUv;
out vec3 vWorld;
out float vViewDepth;
out vec3 vRight;
out vec3 vUp;
void main() {
  vUv = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  // 精灵平面在世界里的右 / 上方向（含水平翻转与关节转动）：自动法线从精灵平面转到世界用
  vRight = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vUp = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  vec4 mv = viewMatrix * wp;
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
${SHARED_DECL}
${NOISE}
${SURFACE_LIB}
uniform sampler2D tMap;
uniform float uLit;
uniform float uCut;
uniform float uRole;
uniform float uRecolor;
uniform float uDespill;
uniform float uDither;
/** 发光倍数（SceneImage.glow，收尾 X：皮影幕布这类从背后打亮的贴图，>1 时超出白点、开了辉光的配方会泛光） */
uniform float uImgGlow;
uniform vec3 uImageTint;
uniform vec3 uImageRamp[3];
uniform float uImageInk;
uniform float uAutoN;
uniform vec4 uRect;
in vec2 vUv;
in vec3 vWorld;
in float vViewDepth;
in vec3 vRight;
in vec3 vUp;
/*
 * 精灵自动法线（M 轨道 shape.spriteNormal）：在当前帧的格子里取一圈邻居的 alpha，透明邻居在哪边法线就朝哪边倒（轮廓倒角），
 * 再加亮度的梯度（亮处鼓起）做细节。返回精灵平面里的法线（x 右、y 上、z 朝镜头）
 */
vec3 spriteNormal(vec2 uv, float k) {
  vec2 ts = 1.0 / vec2(textureSize(tMap, 0));
  vec2 lo = uRect.xy + ts * 0.5, hi = uRect.xy + uRect.zw - ts * 0.5;
  // 轮廓倒角：离最近的透明像素多远（rmin）、透明的在哪个方向（g）→ 圆角枕头形的法线
  vec2 g = vec2(0.0);
  float rmin = 7.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5235988;
    vec2 d = vec2(cos(a), sin(a));
    for (int r = 1; r <= 6; r++) {
      float s = textureLod(tMap, clamp(uv + d * float(r) * ts, lo, hi), 0.0).a;
      if (s < 0.5) { g += vec2(d.x, -d.y) / float(r); rmin = min(rmin, float(r)); break; }
    }
  }
  float t = clamp(1.0 - (rmin - 1.0) / 6.0, 0.0, 1.0);
  vec2 dir = dot(g, g) > 1e-6 ? normalize(g) : vec2(0.0);
  float lx1 = lum(textureLod(tMap, clamp(uv + vec2(ts.x, 0.0), lo, hi), 0.0).rgb), lx0 = lum(textureLod(tMap, clamp(uv - vec2(ts.x, 0.0), lo, hi), 0.0).rgb);
  float ly1 = lum(textureLod(tMap, clamp(uv + vec2(0.0, ts.y), lo, hi), 0.0).rgb), ly0 = lum(textureLod(tMap, clamp(uv - vec2(0.0, ts.y), lo, hi), 0.0).rgb);
  vec2 lg = vec2(lx1 - lx0, ly0 - ly1);
  vec2 xy = dir * t * (0.55 + 0.45 * k) - lg * 0.9 * k;
  return normalize(vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.08))));
}
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oNormal;
float lumaOf(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  // 导数在最前面取（下面有 discard 和分支，分支里的采样一律用 textureGrad）
  vec2 dux = dFdx(vUv), duy = dFdy(vUv), dwx = dFdx(vWorld.xy), dwy = dFdy(vWorld.xy);
  vec4 t = texture(tMap, vUv);
  // 抖动透明（接触阴影、地面带的软边）：没有混合，按 4×4 Bayer 阈值丢像素，远看是半透明
  if (uDither > 0.5) {
    const int B4[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    ivec2 q = ivec2(gl_FragCoord.xy) & 3;
    float th = (float(B4[q.y * 4 + q.x]) + 0.5) / 16.0;
    if (t.a < max(th, uCut)) discard;
  } else if (t.a < uCut) discard;
  vec3 src = t.rgb;
  // 去品红溢色（抠图立绘，审查修复 6）：半透明边 = 前景按 alpha 混在品红底上，把品红底按 alpha 减回去；只动「偏品红」的边缘像素（红围巾、紫眼睛这类本色不动）
  if (uDespill > 0.5 && t.a < 0.995) {
    float k = smoothstep(0.04, 0.22, min(src.r, src.b) - src.g);
    vec3 un = clamp((src - (1.0 - t.a) * vec3(1.0, 0.0, 1.0)) / max(t.a, 0.25), 0.0, 1.0);
    float s2 = max(0.0, min(un.r, un.b) - un.g);
    un.r -= s2; un.b -= s2;
    src = mix(src, un, k);
  }
  // 立绘 / 背景插画跟画面层走（审查修复 1）：时段色 → 色板最近的角色色（保留原图明度）→ toon / 赛璐璐时按色阶分档；uRecolor = 0（角色载体精灵）时原色
  if (uRecolor > 0.0) {
    vec3 base = src * uImageTint;
    vec3 sp = sqrt(max(base, 0.0));
    float best = 1e9;
    vec3 tgt = base;
    for (int i = 0; i < ROLE_COUNT; i++) {
      vec3 d = sqrt(max(uRoleColors[i], 0.0)) - sp;
      float e = dot(d * d, vec3(0.3, 0.45, 0.25));
      if (e < best) { best = e; tgt = uRoleColors[i]; }
    }
    float ls = lumaOf(base);
    vec3 rc = mix(base, tgt * clamp(ls / max(lumaOf(tgt), 1e-3), 0.0, 4.0), 0.85);
    if (uModel == 3 || uModel == 4) {
      float n = float(max(uSteps, 2));
      float lp = sqrt(max(lumaOf(rc), 1e-5));
      float lq = clamp((floor(lp * n) + 0.5) / n, 0.0, 1.0);
      rc = mix(rc, rc * (lq * lq) / max(lp * lp, 1e-4), 0.65);
    }
    // 色板调色（整合修复 U#15）：暗部 / 中间调 / 亮部分别借色板三段平均色的色相与饱和度（保留原图明度）——换色板的配方在插画上看得出冷暖、浓淡
    float lb = lumaOf(base), tb = clamp(sqrt(lb) * 2.0, 0.0, 2.0);
    vec3 ramp = tb < 1.0 ? mix(uImageRamp[0], uImageRamp[1], tb) : mix(uImageRamp[1], uImageRamp[2], tb - 1.0);
    rc = mix(rc, clamp(ramp * (lb / max(lumaOf(ramp), 1e-3)), 0.0, 1.5), 0.5);
    src = mix(src, clamp(rc, 0.0, 1.5), uRecolor);
    // 手感材质（黏土、毛毡、纸、石、木）：插画上压一层起伏——有凹凸图案（黏土指纹、针织）时用它，否则用两层值噪声
    if (uMatPreset == 2 || uMatPreset == 4 || uMatPreset >= 6) {
      float hgt = uDetailMode > 0 ? textureGrad(tDetailH, vWorld.xy * uDetailScale * 0.35, dwx * uDetailScale * 0.35, dwy * uDetailScale * 0.35).r : vnoise2(vWorld.xy * 7.0) * 0.6 + vnoise2(vWorld.xy * 23.0) * 0.4;
      src *= 1.0 + (hgt - 0.5) * clamp(uBump * 0.5 + uGrain * 0.4, 0.0, 0.55) * uRecolor;
    }
    // 墨线：描边 / 内部线配方在插画的明暗边上勾线（插画没有深度、法线给后处理检测），线色取色板的墨色
    if (uImageInk > 0.0) {
      vec2 ox = dux * 1.6, oy = duy * 1.6;
      float a1 = sqrt(lumaOf(textureGrad(tMap, vUv + ox, dux, duy).rgb)), a2 = sqrt(lumaOf(textureGrad(tMap, vUv - ox, dux, duy).rgb));
      float b1 = sqrt(lumaOf(textureGrad(tMap, vUv + oy, dux, duy).rgb)), b2 = sqrt(lumaOf(textureGrad(tMap, vUv - oy, dux, duy).rgb));
      float e = smoothstep(0.1, 0.24, length(vec2(a1 - a2, b1 - b2))) * uImageInk * uRecolor;
      src = mix(src, uInk, e);
    }
  }
  // 受光：太阳（按高度角）+ 天光；uLit = 0 时是原色
  vec3 light = uSunColor * (0.45 + 0.55 * clamp(uSunDir.y * 2.0, 0.0, 1.0)) + mix(uGroundAmb, uSkyAmb, 0.7) * uAmbient * 0.6;
  vec3 lightMix = mix(vec3(1.0), clamp(light, 0.0, 1.3), uLit);
  // M：精灵自动法线——太阳、灯火、舞台聚光按法线照亮精灵，背光的一侧亮起轮廓光（2D 动态光照）
  if (uSpriteNormal > 0.0 && uAutoN > 0.5) {
    vec3 n = spriteNormal(vUv, 0.6 + uSpriteNormal);
    vec3 camFwd = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
    vec3 toCam = isOrthographic ? camFwd : normalize(cameraPosition - vWorld);
    vec3 Nw = normalize(vRight * n.x + vUp * n.y + toCam * n.z);
    float rimW = pow(clamp(1.0 - n.z, 0.0, 1.0), 1.5);
    // 轮廓光：光从精灵背后来时，朝外倒的边缘亮起来
    float behind = clamp(dot(uSunDir, -toCam) + 0.35, 0.0, 1.0);
    vec3 ln = uSunColor * (0.15 + 0.95 * max(dot(Nw, uSunDir), 0.0) + rimW * behind * 1.8)
      + mix(uGroundAmb, uSkyAmb, Nw.y * 0.5 + 0.5) * uAmbient * 0.7;
    for (int i = 0; i < MAX_POINTS; i++) {
      if (i >= uPointCount) break;
      vec3 Ld = uPointPos[i] - vWorld;
      float d = max(length(Ld), 1e-4);
      float a = clamp(1.0 - d / uPointRange[i], 0.0, 1.0);
      float nl = max(dot(Nw, Ld / d), 0.0);
      ln += uPointColor[i] * a * a * (nl * 1.3 + rimW * nl * 1.5);
    }
    for (int i = 0; i < 3; i++) {
      if (i >= uSpotCount) break;
      vec3 Ld = uSpotPos[i] - vWorld;
      float d = max(length(Ld), 1e-4);
      float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, dot(-Ld / d, uSpotDir[i]));
      ln += uSpotColor[i] * cone * max(dot(Nw, Ld / d), 0.0);
    }
    lightMix = mix(lightMix, clamp(ln, 0.0, 2.0), uSpriteNormal);
  }
  vec3 col = src * lightMix * uImgGlow;
  col = applyFog(col, vWorld, vViewDepth);
  oColor = vec4(col, 1.0);
  oNormal = vec4(0.5, 0.5, 1.0, (uRole + 0.5) / 64.0);
}`;

/** 精灵 / 贴图四边形的材质（立绘背景的 SceneImage 也用它，§9.1）：alpha 测试、可调受光、雾，写颜色 + 法线/角色两张输出 */
export function spriteMaterial(cut: number, role: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, tMap: { value: null }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uLit: { value: 0.6 }, uCut: { value: cut }, uRole: { value: role }, uRecolor: { value: 0 }, uDespill: { value: 0 }, uDither: { value: 0 }, uAutoN: { value: 0 }, uImgGlow: { value: 1 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });
}

/** 底边中点在原点的四边形（宽 w、高 h） */
function footQuad(w: number, h: number) {
  return new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
}

function layered(m: THREE.Object3D) {
  m.traverse((o) => o.layers.set(LAYER_FX));
  return m;
}

export interface CharState {
  pos: THREE.Vector3;
  facing: number;
  phase: number;
  moving: boolean;
}

/* ---------------- 纸片人 ---------------- */

const PUPPET_PARTS = ['head', 'torso', 'upperArmBack', 'upperArmFront', 'forearmBack', 'forearmFront', 'thighBack', 'thighFront', 'shinBack', 'shinFront'] as const;
type PartName = (typeof PUPPET_PARTS)[number];

class Puppet {
  readonly root = new THREE.Group();
  private joints: Partial<Record<PartName, THREE.Group>> = {};
  private hipY = 0;
  private mats: THREE.ShaderMaterial[] = [];

  constructor(parts: Record<string, PuppetPart>, height: number) {
    // 关节点稍微往部件里收一点（圆头的中心，而不是最尖端）
    const inset = 0.08;
    const px = (p: PuppetPart) => {
      const [w, h] = p.size;
      const top = new THREE.Vector2(p.top[0] * w, p.top[1] * h);
      const bot = new THREE.Vector2(p.bottom[0] * w, p.bottom[1] * h);
      const axis = bot.clone().sub(top);
      return { w, h, a: top.clone().addScaledVector(axis, inset), b: bot.clone().addScaledVector(axis, -inset), len: axis.length() * (1 - 2 * inset) };
    };
    const P = Object.fromEntries(PUPPET_PARTS.map((n) => [n, px(parts[n])])) as Record<PartName, ReturnType<typeof px>>;
    const legPx = (P.thighFront.len + P.shinFront.len) * 0.98;
    const totalPx = legPx + P.torso.len + P.head.h * 0.85;
    const s = height / totalPx;
    this.hipY = legPx * s;

    // 部件网格：枢轴放在原点，并转正（上关节 → 下关节指向正下方）
    const mesh = (name: PartName, pivotAtBottom: boolean, z: number) => {
      const p = P[name];
      const info = parts[name];
      const geo = new THREE.PlaneGeometry(p.w * s, p.h * s);
      const pv = pivotAtBottom ? p.b : p.a;
      geo.translate((p.w / 2 - pv.x) * s, (pv.y - p.h / 2) * s, 0);
      const m = spriteMaterial(0.5, name === 'head' || name === 'torso' ? ROLE_INDEX.character : ROLE_INDEX.characterAccent);
      m.uniforms.tMap.value = assetTexture(info.file, { srgb: true, placeholder: '#00000000' });
      m.uniforms.uAutoN.value = 1; // 角色部件可以长自动法线（shape.spriteNormal）
      this.mats.push(m);
      const me = new THREE.Mesh(geo, m);
      const axis = p.b.clone().sub(p.a);
      // 图里 y 向下：向量 (dx, dy) 偏离正下方的角度 φ = atan2(dx, dy)；转回正下方要绕 z 转 -φ（头和躯干向上，同理）
      me.rotation.z = -Math.atan2(axis.x, axis.y);
      me.position.z = z;
      return me;
    };
    const joint = (name: PartName, parent: THREE.Object3D, x: number, y: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      parent.add(g);
      this.joints[name] = g;
      return g;
    };
    const hips = new THREE.Group();
    hips.position.y = this.hipY;
    this.root.add(hips);
    // 躯干：枢轴在髋（下关节），向上长
    const torso = joint('torso', hips, 0, 0);
    torso.add(mesh('torso', true, 0));
    const torsoLen = P.torso.len * s;
    const neck = joint('head', torso, 0, torsoLen);
    neck.add(mesh('head', true, 0.012));
    for (const side of ['Back', 'Front'] as const) {
      const z = side === 'Back' ? -0.03 : 0.03;
      const sh = joint(`upperArm${side}`, torso, 0, torsoLen * 0.84);
      sh.add(mesh(`upperArm${side}`, false, z));
      const el = joint(`forearm${side}`, sh, 0, -P[`upperArm${side}`].len * s);
      el.add(mesh(`forearm${side}`, false, z + 0.001));
      const hp = joint(`thigh${side}`, hips, 0, 0);
      hp.add(mesh(`thigh${side}`, false, z * 0.66));
      const kn = joint(`shin${side}`, hp, 0, -P[`thigh${side}`].len * s);
      kn.add(mesh(`shin${side}`, false, z * 0.66 + 0.001));
    }
    layered(this.root);
  }

  /** ph：步态相位（弧度），moving：是否在走 */
  pose(ph: number, moving: boolean, t: number) {
    const j = this.joints;
    const swing = moving ? Math.sin(ph) : 0;
    const k = moving ? 1 : 0;
    j.thighBack!.rotation.z = swing * 0.55;
    j.thighFront!.rotation.z = -swing * 0.55;
    j.shinBack!.rotation.z = -Math.max(0, Math.sin(ph + 1.2)) * 0.9 * k;
    j.shinFront!.rotation.z = -Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * 0.9 * k;
    j.upperArmBack!.rotation.z = -swing * 0.45;
    j.upperArmFront!.rotation.z = swing * 0.45;
    j.forearmBack!.rotation.z = 0.25 + Math.max(0, -swing) * 0.35 * k;
    j.forearmFront!.rotation.z = 0.25 + Math.max(0, swing) * 0.35 * k;
    j.torso!.rotation.z = moving ? -0.06 : 0;
    j.head!.rotation.z = moving ? 0.04 : Math.sin(t * 1.3) * 0.03;
    this.root.children[0].position.y = this.hipY + (moving ? Math.abs(Math.cos(ph)) * 0.025 : Math.sin(t * 2) * 0.004);
  }

  setLit(l: number) {
    this.mats.forEach((m) => (m.uniforms.uLit.value = l));
  }

  dispose() {
    this.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}

/* ---------------- 载体与特效 ---------------- */

export class CharacterSprites {
  readonly group = new THREE.Group();
  private billboard = new THREE.Group();
  private pixel: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private puppet?: Puppet;
  private puppetKey = '';
  private fxGroup = new THREE.Group();
  private fx: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private flip = 1;

  constructor() {
    this.pixel = new THREE.Mesh(footQuad(1, 1), spriteMaterial(0.5, ROLE_INDEX.character));
    this.pixel.material.uniforms.uAutoN.value = 1;
    this.billboard.add(this.pixel);
    this.fx = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), spriteMaterial(0.35, ROLE_INDEX.accent));
    this.fxGroup.add(this.fx);
    this.group.add(this.billboard, this.fxGroup);
    layered(this.group);
    this.group.visible = false;
  }

  /** 套参数时预先请求纹理（截图前 texturesReady() 才等得到） */
  preload(v: Values) {
    const a = getAsset(CARRIER_ASSET[str(v, 'shape.carrier')] ?? '');
    if (a?.kind === 'puppet') Object.values(a.meta.parts ?? {}).forEach((p) => assetTexture(p.file, { srgb: true, placeholder: '#00000000' }));
    else if (a) assetTexture(a.files.sheet, { nearest: true, srgb: true, placeholder: '#00000000' });
    const f = getAsset(FX_ASSET[str(v, 'motion.fx2d')] ?? '');
    if (f) assetTexture(f.files.sheet, { srgb: true, placeholder: '#00000000' });
  }

  /** 每帧：按参数切换载体、选帧、摆姿势；返回是否接管了角色（true 时引擎隐藏三维角色） */
  update(v: Values, cs: CharState, camera: THREE.Camera, ph: number, t: number, hasCharacter: boolean): boolean {
    const carrier = str(v, 'shape.carrier');
    const fxKind = str(v, 'motion.fx2d');
    const useCarrier = hasCharacter && carrier !== 'model' && !!getAsset(CARRIER_ASSET[carrier] ?? '');
    const useFx = hasCharacter && fxKind !== 'none' && !!getAsset(FX_ASSET[fxKind] ?? '');
    this.group.visible = useCarrier || useFx;
    if (!this.group.visible) return false;

    // 镜头水平方向：决定精灵用哪一行、纸片人朝哪边
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const dir = new THREE.Vector3(Math.sin(cs.facing), 0, Math.cos(cs.facing));
    const fd = dir.dot(fwd), rd = dir.dot(right);
    if (Math.abs(rd) > 0.2) this.flip = rd >= 0 ? 1 : -1;

    this.billboard.position.copy(cs.pos);
    this.billboard.quaternion.copy(camera.quaternion);
    const size = num(v, 'shape.spriteSize');
    const lit = num(v, 'shape.spriteLit');
    this.pixel.visible = false;
    if (this.puppet) this.puppet.root.visible = false;

    if (useCarrier && carrier === 'puppet') {
      const a = getAsset(CARRIER_ASSET.puppet)!;
      const key = `${size}`;
      if (!this.puppet || key !== this.puppetKey) {
        if (this.puppet) { this.billboard.remove(this.puppet.root); this.puppet.dispose(); }
        this.puppet = new Puppet(a.meta.parts!, 1.05 * size);
        this.puppetKey = key;
        this.billboard.add(this.puppet.root);
      }
      this.puppet.root.visible = true;
      this.puppet.root.scale.x = this.flip;
      this.puppet.setLit(lit);
      this.puppet.pose(ph, cs.moving, t);
    } else if (useCarrier) {
      const a = getAsset(CARRIER_ASSET[carrier])!;
      const m = this.pixel.material;
      m.uniforms.tMap.value = assetTexture(a.files.sheet, { nearest: true, srgb: true, placeholder: '#00000000' });
      m.uniforms.uLit.value = lit;
      // 行：0 朝镜头（下）、1 左、2 右、3 背对（上）
      const row = Math.abs(fd) >= Math.abs(rd) ? (fd > 0 ? 3 : 0) : (rd > 0 ? 2 : 1);
      const col = cs.moving ? Math.floor(ph / (Math.PI / 2)) % 4 : 0;
      m.uniforms.uRect.value.set(col / 4, row / 4, 1 / 4, 1 / 4);
      const cell = Number(a.meta.cell ?? 48);
      const h = 1.15 * size * (cell / 48);
      this.pixel.scale.set(h, h, 1);
      this.pixel.visible = true;
    }

    // 2D 序列帧特效：8 帧 + 6 帧停顿循环
    this.fx.visible = useFx;
    if (useFx) {
      const a = getAsset(FX_ASSET[fxKind])!;
      const m = this.fx.material;
      m.uniforms.tMap.value = assetTexture(a.files.sheet, { srgb: true, placeholder: '#00000000' });
      m.uniforms.uLit.value = 0;
      const fps = Number(str(v, 'motion.fxFps')) || 12;
      const n = Math.floor(t * fps) % 14;
      const [gc, gr] = (a.meta.grid as [number, number] | undefined) ?? [4, 2];
      if (n >= gc * gr) this.fx.visible = false;
      else m.uniforms.uRect.value.set((n % gc) / gc, Math.floor(n / gc) / gr, 1 / gc, 1 / gr);
      const s = num(v, 'motion.fxSize');
      this.fx.scale.set(s * (fxKind === 'slash' ? this.flip : 1), s, 1);
      // 位置：烟在脚边身后、刀光在面朝一侧的胸口高度、爆炸在面朝一侧稍远并靠近镜头（不被角色身后的东西挡住）
      const side = right.clone().multiplyScalar(this.flip);
      const p = cs.pos.clone();
      if (fxKind === 'smoke') p.addScaledVector(side, -0.35).add(new THREE.Vector3(0, s * 0.42, 0));
      else if (fxKind === 'slash') p.addScaledVector(side, 0.55).add(new THREE.Vector3(0, 0.55, 0));
      else p.addScaledVector(side, 1.6).addScaledVector(fwd, -0.8).add(new THREE.Vector3(0, s * 0.45, 0));
      this.fxGroup.position.copy(p);
      this.fxGroup.quaternion.copy(camera.quaternion);
    }
    return useCarrier;
  }

  dispose() {
    this.puppet?.dispose();
    this.pixel.geometry.dispose();
    this.pixel.material.dispose();
    this.fx.geometry.dispose();
    this.fx.material.dispose();
  }
}
