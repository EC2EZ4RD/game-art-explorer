import * as THREE from 'three';
import { getAsset, STROKE_ASSET } from '../../content/assets';
import { mulberry32 } from '../../core/rng';
import { assetTexture } from '../textures';

/*
 * 物体空间笔触（Meier 1996, "Painterly Rendering for Animation"）：
 *   1. 场景构建后在静态网格表面按面积随机撒点（位置、法线、4 个随机数）——笔触钉在物体上；
 *   2. 每帧用一个实例化四边形画全部笔触：
 *      - 顶点着色器把撒点投到屏幕，读场景深度做遮挡测试（被挡住、背向镜头、出画的点丢掉）；
 *      - 颜色取调色后的画面在该点的颜色（所以光影、色板、雾都跟着画面走）；
 *      - 方向取表面"水平切线"（法线 × 上方向）在屏幕上的投影：墙上横着刷、坡上沿等高线刷；
 *      - 大小按世界尺寸换算成像素：近大远小，镜头拉远时笔触跟着变小。
 *   3. 笔触形状来自AI 生成的毛笔图集（单通道墨量），按 alpha 叠在媒介结果上。
 * 动态物体（技术补全 P1）：角色、云这类每帧会动的网格另撒一层——撒点存在网格自己的局部坐标里，带上网格编号，
 * 每帧把这些网格的 matrixWorld 传进着色器再变换，笔触跟着角色走、转身、挤压；看不见的网格（被精灵接管）整组剔掉。
 * 动态层笔触更小更密（角色比地形小得多），画在静态层之后。
 * 按深度排序（技术补全 P1）：静态层的实例按"离镜头由远到近"排好再画（镜头动了才重排，计数排序 O(n)），
 * 近处的笔触总是盖在远处的笔触上面，远笔不会再盖住近处物体的边缘。
 * 迁移到 Godot：MultiMeshInstance3D + 同样逻辑的 spatial 着色器（见参数的迁移说明）；动态层用挂在角色骨骼 / 节点下的 MultiMesh。
 */

const MAX_RECTS = 16;
/** 动态层最多跟随多少个网格（uniform mat4 数组） */
const MAX_DYN = 24;

const VERT = /* glsl */ `
precision highp float;
uniform sampler2D tDepth;
uniform sampler2D tColor;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uViewHalfY;
uniform float uSize;
uniform float uColorMode;
uniform float uSpin;
uniform vec4 uRects[${MAX_RECTS}];
uniform float uRectCount;
#ifdef DYNAMIC
uniform mat4 uMats[${MAX_DYN}];
in float aMesh;
#endif
in vec3 aPos;
in vec3 aNrm;
in vec4 aRand;
out vec2 vUv;
out vec3 vCol;
out float vAlpha;
float linD(float d) {
  if (isOrthographic) return uNear + d * (uFar - uNear);
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
void cull() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vUv = vec2(0.0); vCol = vec3(0.0); vAlpha = 0.0; }
void main() {
  vec3 wp = aPos;
  vec3 wn = aNrm;
#ifdef DYNAMIC
  // 动态层：局部坐标 × 网格这一帧的 matrixWorld；网格不可见时整组剔掉（矩阵全 0）
  mat4 M = uMats[int(aMesh + 0.5)];
  if (M[3][3] < 0.5) { cull(); return; }
  wn = normalize(mat3(M) * aNrm);
  wp = (M * vec4(aPos, 1.0)).xyz + wn * 0.01;
#endif
  vec4 clip = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  if (clip.w <= 0.0) { cull(); return; }
  vec3 ndc = clip.xyz / clip.w;
  vec3 camFwd = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  vec3 V = isOrthographic ? camFwd : normalize(cameraPosition - wp);
  float facing = dot(wn, V);
  if (facing < 0.02 || abs(ndc.x) > 1.15 || abs(ndc.y) > 1.15) { cull(); return; }
  vec2 suv = ndc.xy * 0.5 + 0.5;
  // 遮挡：撒点比场景深度更远（超过一点容差）就是被挡住了
  float ls = linD(texture(tDepth, suv).r);
  float lm = linD(ndc.z * 0.5 + 0.5);
  if (lm > ls + 0.05 + lm * 0.004) { cull(); return; }
  // 每笔明暗随机 ±15%：笔触颜色和底色不完全一样，笔触才看得出来（Meier 的做法）
  vCol = texture(tColor, suv).rgb * (0.85 + 0.3 * aRand.w);
  float dark = 1.0 - dot(vCol, vec3(0.2126, 0.7152, 0.0722));
  // 墨色模式：亮处不下笔，暗处笔密
  vAlpha = uColorMode > 0.5 ? smoothstep(0.25, 0.75, dark + (aRand.w - 0.5) * 0.2) : 1.0;
  // 掠射角处的笔触淡出，避免轮廓上一圈竖着的笔
  vAlpha *= smoothstep(0.02, 0.25, facing);
  // 方向：表面的水平切线；地面（法线朝上）用一个固定的世界方向
  vec3 t = cross(wn, vec3(0.0, 1.0, 0.0));
  t = dot(t, t) > 0.04 ? normalize(t) : normalize(vec3(1.0, 0.0, 0.35));
  vec4 c2 = projectionMatrix * viewMatrix * vec4(wp + t * 0.2, 1.0);
  vec2 dir = (c2.xy / c2.w - ndc.xy) * uRes;
  dir = dot(dir, dir) > 1e-6 ? normalize(dir) : vec2(1.0, 0.0);
  float ang = (aRand.y - 0.5) * uSpin;
  dir = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * dir;
  // 世界尺寸 → 像素
  float ppu = uRes.y / (2.0 * uViewHalfY * (isOrthographic ? 1.0 : lm));
  int k = int(floor(aRand.x * uRectCount));
  vec4 r = uRects[k];
  float L = uSize * (0.65 + 0.7 * aRand.z) * ppu;
  float W = L * r.w / max(r.z, 1e-4);
  vec2 corner = position.xy;
  vec2 off = dir * corner.x * L + vec2(-dir.y, dir.x) * corner.y * W;
  clip.xy += off * 2.0 / uRes * clip.w;
  gl_Position = clip;
  vUv = r.xy + vec2(corner.x + 0.5, 0.5 - corner.y) * r.zw;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tAtlas;
uniform float uOpacity;
uniform float uColorMode;
uniform vec3 uInk;
in vec2 vUv;
in vec3 vCol;
in float vAlpha;
layout(location = 0) out highp vec4 oColor;
void main() {
  float m = texture(tAtlas, vUv).r;
  float a = m * uOpacity * vAlpha;
  if (a < 0.01) discard;
  // 笔毛：墨量薄处颜色略暗，带出飞白与笔丝
  vec3 c = uColorMode > 0.5 ? uInk : vCol * (0.88 + 0.16 * smoothstep(0.2, 1.0, m));
  oColor = vec4(c, a);
}`;

export interface StrokeParams {
  set: string;
  density: number;
  size: number;
  colorMode: 'scene' | 'ink';
  ink: THREE.Color;
  /** 按深度由远到近画（surface.strokeSort，默认关 = 原来的随机顺序） */
  sort?: boolean;
  /** 角色、云这类会动的物体也铺（surface.strokeTargets = 'all'；要引擎登记过 setDynamicSources） */
  dynamic?: boolean;
}

function strokeMesh(dynamic: boolean) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: dynamic ? { DYNAMIC: 1 } : {},
    uniforms: {
      tDepth: { value: null }, tColor: { value: null }, tAtlas: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.1 }, uFar: { value: 100 }, uViewHalfY: { value: 1 },
      uSize: { value: 0.3 }, uColorMode: { value: 0 }, uSpin: { value: 0.6 }, uOpacity: { value: 0.9 },
      uRects: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector4()) }, uRectCount: { value: 1 },
      uInk: { value: new THREE.Color() },
      ...(dynamic ? { uMats: { value: Array.from({ length: MAX_DYN }, () => new THREE.Matrix4()) } } : {}),
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

export class StrokeLayer {
  readonly scene = new THREE.Scene();
  private mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  /** 动态层（角色、云）：先画静态层，再画它 */
  private dyn: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private key = '';
  private dynKey = '';
  /** 撒点用的源网格（引擎在场景重建后设置） */
  private sources: THREE.Mesh[] = [];
  private sourceVersion = 0;
  /** 会动的源网格（角色、云；引擎在场景 / 角色重建后设置）：撒点存局部坐标，每帧按 matrixWorld 变换 */
  private dynSources: THREE.Mesh[] = [];
  private dynVersion = 0;
  /** 静态层撒点的原始顺序（排序时按它重排）与上一次排序时的镜头 */
  private raw: { pos: Float32Array; nrm: Float32Array; rnd: Float32Array } | null = null;
  private sortedFor = new THREE.Matrix4();
  private sortedOnce = false;

  constructor() {
    this.mesh = strokeMesh(false);
    this.dyn = strokeMesh(true);
    this.dyn.renderOrder = 1;
    this.scene.add(this.mesh, this.dyn);
  }

  /** 套参数时预先请求笔刷图集（截图前 texturesReady() 才等得到它） */
  preload(set: string) {
    const asset = getAsset(STROKE_ASSET[set] ?? '');
    if (asset) assetTexture(asset.files.alpha, { placeholder: '#000000' });
  }

  /** 场景重建后：登记可以铺笔触的静态网格（世界坐标已烘进几何，或用 matrixWorld 变换） */
  setSources(meshes: THREE.Mesh[]) {
    this.sources = meshes;
    this.sourceVersion++;
  }

  /** 场景 / 角色重建后：登记会动的网格（角色、云；最多 24 个，多的忽略）。只登记表面网格，描边外壳（背面）不要 */
  setDynamicSources(meshes: THREE.Mesh[]) {
    this.dynSources = meshes.filter((m) => !(m as THREE.InstancedMesh).isInstancedMesh).slice(0, MAX_DYN);
    this.dynVersion++;
  }

  /** 按需重新撒点（场景、数量变化时） */
  private ensure(count: number) {
    const key = `${this.sourceVersion}|${count}`;
    if (key === this.key) return;
    this.key = key;
    const geo = this.mesh.geometry;
    const pos = new Float32Array(count * 3);
    const nrm = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 4);
    // 固定种子（主控 2026-10-23）：同一场景重建后撒点一样，缩略图可复现；原来用 1234 + 重建次数，每次重建换一套笔触
    const rng = mulberry32(1234);
    // 收集所有三角形的世界坐标面积，做累计分布
    type Tri = { m: THREE.Mesh; inst: number; i: number };
    const tris: Tri[] = [];
    const areas: number[] = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const im = new THREE.Matrix4();
    for (const m of this.sources) {
      const g = m.geometry;
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const idx = g.index;
      const n = idx ? idx.count / 3 : p.count / 3;
      const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
      // 体素：每个方块只取一个三角形样本的面积代表（方块大小一致，按实例均匀撒）
      for (let k = 0; k < inst; k++) {
        if (inst > 1) im.fromArray((m as THREE.InstancedMesh).instanceMatrix.array, k * 16);
        else im.copy(m.matrixWorld);
        const triCount = inst > 1 ? 1 : n;
        for (let t = 0; t < triCount; t++) {
          const tt = inst > 1 ? Math.floor(rng() * n) : t;
          const i0 = idx ? idx.getX(tt * 3) : tt * 3, i1 = idx ? idx.getX(tt * 3 + 1) : tt * 3 + 1, i2 = idx ? idx.getX(tt * 3 + 2) : tt * 3 + 2;
          a.fromBufferAttribute(p, i0).applyMatrix4(im);
          b.fromBufferAttribute(p, i1).applyMatrix4(im);
          c.fromBufferAttribute(p, i2).applyMatrix4(im);
          const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5 * (inst > 1 ? n : 1);
          if (area <= 1e-6) continue;
          tris.push({ m, inst: k, i: tt });
          areas.push(area);
        }
      }
    }
    const cdf = new Float64Array(areas.length);
    let acc = 0;
    areas.forEach((x, i) => { acc += x; cdf[i] = acc; });
    const nm = new THREE.Matrix3();
    const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
    let made = 0;
    for (let s = 0; s < count && tris.length; s++) {
      const r = rng() * acc;
      let lo = 0, hi = cdf.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
      const { m, inst, i: tt } = tris[lo];
      const g = m.geometry;
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const nAttr = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
      const idx = g.index;
      if ((m as THREE.InstancedMesh).isInstancedMesh) im.fromArray((m as THREE.InstancedMesh).instanceMatrix.array, inst * 16);
      else im.copy(m.matrixWorld);
      nm.getNormalMatrix(im);
      const i0 = idx ? idx.getX(tt * 3) : tt * 3, i1 = idx ? idx.getX(tt * 3 + 1) : tt * 3 + 1, i2 = idx ? idx.getX(tt * 3 + 2) : tt * 3 + 2;
      let u = rng(), v = rng();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      a.fromBufferAttribute(p, i0).applyMatrix4(im);
      b.fromBufferAttribute(p, i1).applyMatrix4(im);
      c.fromBufferAttribute(p, i2).applyMatrix4(im);
      const P = a.clone().multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
      let N: THREE.Vector3;
      if (nAttr) {
        na.fromBufferAttribute(nAttr, i0); nb.fromBufferAttribute(nAttr, i1); nc.fromBufferAttribute(nAttr, i2);
        N = na.multiplyScalar(1 - u - v).addScaledVector(nb, u).addScaledVector(nc, v).applyMatrix3(nm).normalize();
      } else N = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
      // 沿法线抬一点，避免和表面一样深时被深度测试误判
      P.addScaledVector(N, 0.02);
      pos.set([P.x, P.y, P.z], made * 3);
      nrm.set([N.x, N.y, N.z], made * 3);
      rnd.set([rng(), rng(), rng(), rng()], made * 4);
      made++;
    }
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos.slice(0, made * 3), 3));
    geo.setAttribute('aNrm', new THREE.InstancedBufferAttribute(nrm.slice(0, made * 3), 3));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd.slice(0, made * 4), 4));
    geo.instanceCount = made;
    this.raw = { pos: pos.slice(0, made * 3), nrm: nrm.slice(0, made * 3), rnd: rnd.slice(0, made * 4) };
    this.sortedOnce = false;
  }

  /**
   * 按深度排序：静态层实例按"沿镜头朝向的距离"由远到近重排（4096 档计数排序，O(n)），近处笔触画在最后、盖在上面。
   * 只在镜头矩阵变了时重排（静止画面零开销）；重排后整份实例数据重新上传。
   */
  private sortByDepth(camera: THREE.Camera) {
    const raw = this.raw;
    if (!raw) return;
    const n = raw.pos.length / 3;
    if (this.sortedOnce && this.sortedFor.equals(camera.matrixWorld)) return;
    this.sortedFor.copy(camera.matrixWorld);
    this.sortedOnce = true;
    const e = camera.matrixWorld.elements;
    // 镜头朝 -Z：沿 (−e8, −e9, −e10) 的距离越大越远
    const fx = -e[8], fy = -e[9], fz = -e[10], ox = e[12], oy = e[13], oz = e[14];
    const d = new Float32Array(n);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = (raw.pos[i * 3] - ox) * fx + (raw.pos[i * 3 + 1] - oy) * fy + (raw.pos[i * 3 + 2] - oz) * fz;
      d[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const B = 4096;
    const k = hi > lo ? (B - 1) / (hi - lo) : 0;
    const cnt = new Uint32Array(B + 1);
    // 远的在前：桶号 = (hi - d) 量化
    for (let i = 0; i < n; i++) cnt[Math.floor((hi - d[i]) * k) + 1]++;
    for (let b = 0; b < B; b++) cnt[b + 1] += cnt[b];
    const geo = this.mesh.geometry;
    const P = geo.getAttribute('aPos') as THREE.InstancedBufferAttribute;
    const N = geo.getAttribute('aNrm') as THREE.InstancedBufferAttribute;
    const R = geo.getAttribute('aRand') as THREE.InstancedBufferAttribute;
    const pa = P.array as Float32Array, na = N.array as Float32Array, ra = R.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const j = cnt[Math.floor((hi - d[i]) * k)]++;
      pa[j * 3] = raw.pos[i * 3]; pa[j * 3 + 1] = raw.pos[i * 3 + 1]; pa[j * 3 + 2] = raw.pos[i * 3 + 2];
      na[j * 3] = raw.nrm[i * 3]; na[j * 3 + 1] = raw.nrm[i * 3 + 1]; na[j * 3 + 2] = raw.nrm[i * 3 + 2];
      ra[j * 4] = raw.rnd[i * 4]; ra[j * 4 + 1] = raw.rnd[i * 4 + 1]; ra[j * 4 + 2] = raw.rnd[i * 4 + 2]; ra[j * 4 + 3] = raw.rnd[i * 4 + 3];
    }
    P.needsUpdate = true;
    N.needsUpdate = true;
    R.needsUpdate = true;
  }

  /** 关掉排序时还原撒点的原始顺序（和没有排序功能之前逐像素一样） */
  private unsort() {
    const raw = this.raw;
    if (!raw || !this.sortedOnce) return;
    this.sortedOnce = false;
    const geo = this.mesh.geometry;
    for (const [name, src] of [['aPos', raw.pos], ['aNrm', raw.nrm], ['aRand', raw.rnd]] as const) {
      const a = geo.getAttribute(name) as THREE.InstancedBufferAttribute;
      (a.array as Float32Array).set(src);
      a.needsUpdate = true;
    }
  }

  /** 动态层撒点：按各网格当前的世界面积分配数量，位置 / 法线存局部坐标，带网格编号 */
  private ensureDynamic(count: number) {
    const key = `${this.dynVersion}|${count}`;
    if (key === this.dynKey) return;
    this.dynKey = key;
    const geo = this.dyn.geometry;
    const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), rnd = new Float32Array(count * 4), mid = new Float32Array(count);
    const rng = mulberry32(777);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const wa = new THREE.Vector3(), wb = new THREE.Vector3(), wc = new THREE.Vector3();
    const tris: { mi: number; i0: number; i1: number; i2: number }[] = [];
    const cdf: number[] = [];
    let acc = 0;
    this.dynSources.forEach((m, mi) => {
      m.updateWorldMatrix(true, false);
      const g = m.geometry;
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const idx = g.index;
      const n = idx ? idx.count / 3 : p.count / 3;
      for (let t = 0; t < n; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        wa.fromBufferAttribute(p, i0).applyMatrix4(m.matrixWorld);
        wb.fromBufferAttribute(p, i1).applyMatrix4(m.matrixWorld);
        wc.fromBufferAttribute(p, i2).applyMatrix4(m.matrixWorld);
        const area = ab.subVectors(wb, wa).cross(ac.subVectors(wc, wa)).length() * 0.5;
        if (area <= 1e-7) continue;
        acc += area;
        tris.push({ mi, i0, i1, i2 });
        cdf.push(acc);
      }
    });
    let made = 0;
    const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
    for (let s = 0; s < count && tris.length; s++) {
      const r = rng() * acc;
      let lo = 0, hi = cdf.length - 1;
      while (lo < hi) { const md = (lo + hi) >> 1; if (cdf[md] < r) lo = md + 1; else hi = md; }
      const t = tris[lo];
      const g = this.dynSources[t.mi].geometry;
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      const nAttr = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
      let u = rng(), v = rng();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      a.fromBufferAttribute(p, t.i0); b.fromBufferAttribute(p, t.i1); c.fromBufferAttribute(p, t.i2);
      const P = a.clone().multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
      const N = nAttr
        ? na.fromBufferAttribute(nAttr, t.i0).multiplyScalar(1 - u - v).addScaledVector(nb.fromBufferAttribute(nAttr, t.i1), u).addScaledVector(nc.fromBufferAttribute(nAttr, t.i2), v).normalize()
        : ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
      pos.set([P.x, P.y, P.z], made * 3);
      nrm.set([N.x, N.y, N.z], made * 3);
      rnd.set([rng(), rng(), rng(), rng()], made * 4);
      mid[made] = t.mi;
      made++;
    }
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('aNrm', new THREE.InstancedBufferAttribute(nrm, 3));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
    geo.setAttribute('aMesh', new THREE.InstancedBufferAttribute(mid, 1));
    geo.instanceCount = made;
  }

  /** 把笔触画到 target（target 里已经是底图）；返回是否画了 */
  render(
    renderer: THREE.WebGLRenderer, camera: THREE.Camera, target: THREE.WebGLRenderTarget,
    colorTex: THREE.Texture, depthTex: THREE.Texture, p: StrokeParams,
    frame: { near: number; far: number; viewHalfY: number; res: THREE.Vector2 },
  ): boolean {
    const asset = getAsset(STROKE_ASSET[p.set] ?? '');
    if (!asset || (!this.sources.length && !(p.dynamic && this.dynSources.length))) return false;
    if (this.sources.length) {
      this.ensure(Math.round(p.density * 60000));
      if (p.sort) this.sortByDepth(camera); else this.unsort();
    }
    this.mesh.visible = this.sources.length > 0;
    // 动态层：角色比地形小得多，笔触缩到约 0.35 倍、按数量 × 0.15 撒（每平方米的笔数比地形密得多）
    this.dyn.visible = !!p.dynamic && this.dynSources.length > 0;
    if (this.dyn.visible) {
      this.ensureDynamic(Math.round(p.density * 9000));
      const mats = this.dyn.material.uniforms.uMats.value as THREE.Matrix4[];
      this.dynSources.forEach((m, i) => {
        let vis = true;
        for (let o: THREE.Object3D | null = m; o; o = o.parent) if (!o.visible) { vis = false; break; }
        if (vis) mats[i].copy(m.matrixWorld); else mats[i].makeScale(0, 0, 0).elements[15] = 0;
      });
    }
    const atlas = assetTexture(asset.files.alpha, { placeholder: '#000000' });
    const rects = asset.meta.rects ?? [];
    for (const layer of [this.mesh, this.dyn]) {
      const u = layer.material.uniforms;
      u.tDepth.value = depthTex;
      u.tColor.value = colorTex;
      u.tAtlas.value = atlas;
      rects.slice(0, MAX_RECTS).forEach((r, i) => (u.uRects.value as THREE.Vector4[])[i].set(r.x, r.y, r.w, r.h));
      u.uRectCount.value = Math.max(1, Math.min(MAX_RECTS, rects.length));
      u.uRes.value.copy(frame.res);
      u.uNear.value = frame.near;
      u.uFar.value = frame.far;
      u.uViewHalfY.value = frame.viewHalfY;
      u.uSize.value = layer === this.dyn ? p.size * 0.35 : p.size;
      u.uColorMode.value = p.colorMode === 'ink' ? 1 : 0;
      u.uInk.value.copy(p.ink);
      // 短笔点可以任意转向；长笔只在切线方向附近摆动
      u.uSpin.value = p.set === 'marks' ? 6.283 : 0.7;
      u.uOpacity.value = p.colorMode === 'ink' ? 0.85 : 0.95;
    }
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, camera);
    renderer.autoClear = prevAuto;
    return true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.dyn.geometry.dispose();
    this.dyn.material.dispose();
  }
}
