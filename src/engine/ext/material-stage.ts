import * as THREE from 'three';
import { num, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { NOISE, SHARED_DECL } from '../materials/glsl';
import { U } from '../materials/uniforms';
import { LAYER_FX } from '../scene/build';
import type { SceneDesc } from '../scene/types';

/*
 * 舞台聚光（lighting.stage，M 轨道）：
 *   · 着色器里最多 3 盏聚光（U.uSpot*）；第一盏把太阳方向换成自己的方向，借太阳的阴影贴图投影；
 *   · 太阳、天光、天色、雾色、卡通暗部一起压暗（引擎写过的值记一份底，按比例缩；关掉时还原）；
 *   · 每盏灯一个加色混合的锥形网格（主相机层，不投影、不写深度），亮度按视线穿过的厚度与沿轴衰减，乘滚动噪声做浮尘。
 */

/* ---------- 光锥网格 ---------- */
const CONE_U = {
  uConeColor: { value: new THREE.Color() },
  uConeHaze: { value: 0.6 },
};
const CONE_VERT = /* glsl */ `
${SHARED_DECL}
out vec3 vLocal;
out vec3 vW;
out vec3 vN;
out float vDepth;
void main() {
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const CONE_FRAG = /* glsl */ `
${SHARED_DECL}
${NOISE}
uniform vec3 uConeColor;
uniform float uConeHaze;
in vec3 vLocal;
in vec3 vW;
in vec3 vN;
in float vDepth;
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oNormal;
void main() {
  float along = clamp(-vLocal.y, 0.0, 1.0);
  vec3 camFwd = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  vec3 V = isOrthographic ? camFwd : normalize(cameraPosition - vW);
  // 视线穿过光锥的厚度：正对锥面的地方（锥的中轴）最厚，掠过锥面的边缘最薄 → 边缘柔和
  float thick = pow(abs(dot(normalize(vN), V)), 1.5);
  float fall = (1.0 - along * 0.5) * smoothstep(0.0, 0.12, along);
  // 浮尘：慢慢飘的大块烟 + 一闪一闪的亮粒
  float t = uTime;
  float smoke = vnoise3(vW * 0.9 + vec3(0.0, -t * 0.12, t * 0.05)) * 0.6 + vnoise3(vW * 2.3 + vec3(t * 0.07, t * 0.1, 0.0)) * 0.4;
  float mote = smoothstep(0.86, 0.95, vnoise3(vW * 11.0 + vec3(0.0, -t * 0.35, 0.0))) * smoothstep(0.3, 0.8, thick);
  float f = uFogMode == 0 ? 0.0 : smoothstep(uFogRange.x, uFogRange.y, vDepth) * 0.8;
  vec3 c = uConeColor * uConeHaze * (thick * fall * (0.35 + 0.9 * smoke) * 0.16 + mote * 0.5 * fall);
  oColor = vec4(c * (1.0 - f), 1.0);
  oNormal = vec4(0.0);
}`;

function coneMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, uConeColor: { value: new THREE.Color() }, uConeHaze: { value: CONE_U.uConeHaze.value } },
    vertexShader: CONE_VERT,
    fragmentShader: CONE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    // 颜色加上去；alpha 与第二张输出（法线 / 角色）不变
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
}

/** 顶点在 y ∈ [0, -1] 的开口圆锥（尖在原点，底面半径 1） */
function coneGeometry() {
  const g = new THREE.CylinderGeometry(0.02, 1, 1, 40, 8, true);
  g.translate(0, -0.5, 0);
  return g;
}

/* ---------- 压暗：记下引擎写的值，按比例缩 ---------- */
type Slot = { key: keyof typeof U; kind: 'color' | 'vec' | 'num' };
const DIM: Slot[] = [
  { key: 'uSunColor', kind: 'color' }, { key: 'uSkyAmb', kind: 'color' }, { key: 'uGroundAmb', kind: 'color' },
  { key: 'uSkyTop', kind: 'color' }, { key: 'uSkyHorizon', kind: 'color' }, { key: 'uFogColor', kind: 'color' },
  { key: 'uImageTint', kind: 'color' }, { key: 'uShadowDepth', kind: 'num' }, { key: 'uSunDir', kind: 'vec' },
];
const base = new Map<string, THREE.Color | THREE.Vector3 | number>();
const last = new Map<string, THREE.Color | THREE.Vector3 | number>();
const same = (a: unknown, b: unknown) => {
  if (typeof a === 'number') return a === b;
  if (a instanceof THREE.Color && b instanceof THREE.Color) return a.equals(b);
  if (a instanceof THREE.Vector3 && b instanceof THREE.Vector3) return a.equals(b);
  return false;
};
const clone = (x: THREE.Color | THREE.Vector3 | number) => (typeof x === 'number' ? x : x.clone());
const uval = (k: string) => (U as unknown as Record<string, { value: THREE.Color | THREE.Vector3 | number }>)[k];

/** 引擎刚写过（和我们上次写的不一样）的值记成新底 */
function rebase() {
  for (const s of DIM) {
    const cur = uval(s.key).value;
    const l = last.get(s.key);
    if (l === undefined || !same(cur, l)) base.set(s.key, clone(cur));
  }
}
function writeDim(sunK: number, ambK: number, skyK: number, sunDir: THREE.Vector3 | null) {
  for (const s of DIM) {
    const b = base.get(s.key);
    if (b === undefined) continue;
    const u = uval(s.key);
    if (s.key === 'uSunDir') { if (sunDir) (u.value as THREE.Vector3).copy(sunDir); else (u.value as THREE.Vector3).copy(b as THREE.Vector3); }
    else if (s.kind === 'num') u.value = (b as number) * ambK;
    else {
      const k = s.key === 'uSunColor' ? sunK : s.key === 'uSkyTop' || s.key === 'uSkyHorizon' || s.key === 'uFogColor' ? skyK : ambK;
      (u.value as THREE.Color).copy(b as THREE.Color).multiplyScalar(k);
    }
    last.set(s.key, clone(u.value));
  }
}
function restoreDim() {
  for (const s of DIM) {
    const b = base.get(s.key), l = last.get(s.key);
    const u = uval(s.key);
    if (b !== undefined && l !== undefined && same(u.value, l)) {
      if (typeof b === 'number') u.value = b; else (u.value as THREE.Color | THREE.Vector3).copy(b as never);
    }
  }
  base.clear(); last.clear();
}

/* ---------- 灯位 ---------- */
interface Spot { pos: THREE.Vector3; aim: THREE.Vector3; color: THREE.Color; outer: number; inner: number }
const spots: Spot[] = [0, 1, 2].map(() => ({ pos: new THREE.Vector3(), aim: new THREE.Vector3(), color: new THREE.Color(), outer: 0.26, inner: 0.17 }));
const KEY = new THREE.Color(1.0, 0.9, 0.74), COOL = new THREE.Color(0.35, 0.62, 1.0), PINK = new THREE.Color(1.0, 0.32, 0.72), AMBER = new THREE.Color(1.0, 0.68, 0.25);

export class Stage {
  private group = new THREE.Group();
  private cones: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  private geo = coneGeometry();
  private mode = 'none';
  private char: THREE.Object3D | null = null;
  private desc: SceneDesc | null = null;
  private tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), q: new THREE.Quaternion(), down: new THREE.Vector3(0, -1, 0), dir: new THREE.Vector3() };

  constructor() {
    this.group.name = 'M.stage';
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(this.geo, coneMaterial());
      m.layers.set(LAYER_FX);
      m.frustumCulled = false;
      m.renderOrder = 900 + i;
      m.raycast = () => {};
      this.cones.push(m);
      this.group.add(m);
    }
    this.group.visible = false;
  }

  sceneBuilt(scene: THREE.Scene, root: THREE.Object3D | null, desc: SceneDesc | null) {
    if (this.group.parent !== scene) scene.add(this.group);
    this.desc = desc;
    this.char = null;
    root?.traverse((o) => { if (o.userData.dynKind === 'character') this.char = o; });
  }

  /** 每帧（含参数生效时）：摆灯、写 uniform、压暗 */
  update(scene: THREE.Scene, v: Values, camera: THREE.Camera, time: number) {
    const mode = str(v, 'lighting.stage');
    if (mode === 'none' || !this.desc) {
      if (this.mode !== 'none') { restoreDim(); U.uSpotCount.value = 0; U.uSpotShadow.value = 0; }
      this.mode = 'none';
      this.group.visible = false;
      return;
    }
    if (this.group.parent !== scene) scene.add(this.group);
    this.mode = mode;
    const d = this.desc;
    const t = this.tmp;
    // 主角位置（没有角色时用起点 / 场景中心）
    const T = t.a;
    if (this.char) this.char.getWorldPosition(T);
    else if (d.playerStart) T.set(...d.playerStart);
    else T.set(...d.bounds.center);
    const R = d.bounds.radius;
    const H = THREE.MathUtils.clamp(R * 0.5, 6, 15);
    const W = THREE.MathUtils.clamp(R * 0.16, 1.6, 4.5);
    // 镜头的水平前方与右方（灯从镜头这一侧略偏前照下来，正面受光）
    camera.getWorldDirection(t.b);
    t.b.y = 0;
    if (t.b.lengthSq() < 1e-6) t.b.set(0, 0, -1);
    t.b.normalize();
    const right = t.c.set(-t.b.z, 0, t.b.x);
    const fwd = t.b;
    const n = mode === 'single' ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const s = spots[i];
      if (mode === 'single' || i === 0) {
        s.aim.copy(T);
        s.pos.copy(T).addScaledVector(fwd, -H * 0.28).add(t.dir.set(0, H, 0));
        s.color.copy(KEY).multiplyScalar(mode === 'single' ? 3.4 : 2.6);
        s.outer = mode === 'single' ? 0.22 : 0.24; s.inner = s.outer * 0.62;
        if (mode === 'moving') {
          s.aim.addScaledVector(right, Math.sin(time * 0.7) * W * 1.4).addScaledVector(fwd, Math.cos(time * 0.53) * W * 0.6);
          s.pos.copy(T).add(t.dir.set(0, H, 0));
          s.color.copy(PINK).multiplyScalar(2.8);
        }
      } else {
        const side = i === 1 ? -1 : 1;
        s.pos.copy(T).addScaledVector(right, side * W * 1.6).addScaledVector(fwd, -H * 0.15).add(t.dir.set(0, H * 0.92, 0));
        s.aim.copy(T).addScaledVector(right, side * W * 0.75);
        s.color.copy(i === 1 ? COOL : PINK).multiplyScalar(2.2);
        s.outer = 0.2; s.inner = 0.12;
        if (mode === 'moving') {
          s.pos.copy(T).addScaledVector(right, side * W * 2.2).add(t.dir.set(0, H, 0));
          s.aim.copy(T).addScaledVector(right, side * W * 1.2 + Math.sin(time * (0.8 + i * 0.17) + i * 2.1) * W * 1.6).addScaledVector(fwd, Math.cos(time * 0.6 + i) * W * 0.8);
          s.color.copy(i === 1 ? COOL : AMBER).multiplyScalar(2.8);
        }
      }
    }
    // uniform
    U.uSpotCount.value = n;
    U.uSpotShadow.value = 1;
    for (let i = 0; i < 3; i++) {
      const s = spots[i];
      U.uSpotPos.value[i].copy(s.pos);
      U.uSpotDir.value[i].subVectors(s.aim, s.pos).normalize();
      U.uSpotColor.value[i].copy(s.color).multiplyScalar(i < n ? 1 : 0);
      U.uSpotCone.value[i].set(Math.cos(s.outer), Math.cos(s.inner));
      U.uSpotRange.value[i] = s.pos.distanceTo(s.aim) * 2.2;
    }
    // 压暗；太阳方向换成第一盏灯（从被照点指向灯），阴影贴图就从灯的方向画
    const dark = num(v, 'lighting.stageDark');
    rebase();
    const sunDir = t.dir.subVectors(spots[0].pos, spots[0].aim).normalize();
    writeDim(Math.pow(1 - dark, 2) * 0.9 + 0.02, 1 - dark * 0.88, 1 - dark * 0.93, sunDir);
    // 光锥：尖在灯的位置，沿灯的方向伸到地面再往下一点（地面以下被深度挡住）
    const haze = num(v, 'lighting.stageHaze');
    this.group.visible = haze > 0;
    for (let i = 0; i < 3; i++) {
      const m = this.cones[i];
      m.visible = i < n && haze > 0;
      if (!m.visible) continue;
      const s = spots[i];
      const L = s.pos.distanceTo(s.aim) * 1.12;
      const r = Math.tan(s.outer) * L;
      m.position.copy(s.pos);
      m.quaternion.setFromUnitVectors(t.down, U.uSpotDir.value[i]);
      m.scale.set(r, L, r);
      m.material.uniforms.uConeColor.value.copy(s.color);
      m.material.uniforms.uConeHaze.value = haze;
    }
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.geo.dispose();
    this.cones.forEach((c) => c.material.dispose());
    if (this.mode !== 'none') restoreDim();
  }
}
