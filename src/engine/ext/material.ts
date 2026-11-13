// M 材质与灯光：引擎扩展（registerEngineExt，见 ../engineExt.ts）
import * as THREE from 'three';
import { ROLE_INDEX, type Role } from '../../content/roles';
import { hexToLinear } from '../../core/color';
import { bool, num, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { registerEngineExt, type EngineExtCtx } from '../engineExt';
import { U } from '../materials/uniforms';
import type { SceneDesc } from '../scene/types';
import { ensureAttrs } from './material-attrs';
import { Stage } from './material-stage';

/*
 * 参数 → U 里 M 轨道的 uniform（默认值都是「关」）；环境光照的球谐每帧按当前天色重算（便宜：128 个方向 × 9 个系数）；
 * 舞台聚光在 material-stage.ts；线框 / 体素 / 污渍要的顶点属性在 material-attrs.ts 按需补。
 */

const idx = (v: Values, id: string, opts: string[]) => Math.max(0, opts.indexOf(str(v, id)));

/* ---------- 环境光照：天空 → 二阶球谐 ---------- */
const NDIR = 128;
const DIRS: THREE.Vector3[] = [];
for (let i = 0; i < NDIR; i++) {
  // 斐波那契球面：均匀分布的方向
  const y = 1 - ((i + 0.5) / NDIR) * 2;
  const r = Math.sqrt(1 - y * y);
  const th = i * 2.399963229728653;
  DIRS.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
}
// 各阶的卷积核 Â_l / π 与基函数常数的平方（着色器里只乘多项式）
const SH_K = [1, 2 / 3, 2 / 3, 2 / 3, 1 / 4, 1 / 4, 1 / 4, 1 / 4, 1 / 4];
const SH_C = [0.282095, 0.488603, 0.488603, 0.488603, 1.092548, 1.092548, 0.315392, 1.092548, 0.546274];
const shPoly = (d: THREE.Vector3, i: number) => {
  switch (i) {
    case 0: return 1;
    case 1: return d.y;
    case 2: return d.z;
    case 3: return d.x;
    case 4: return d.x * d.y;
    case 5: return d.y * d.z;
    case 6: return 3 * d.z * d.z - 1;
    case 7: return d.x * d.z;
    default: return d.x * d.x - d.y * d.y;
  }
};
const _sky = new THREE.Color(), _c = new THREE.Color(), _gnd = new THREE.Color();
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 地面反光的颜色（反照率按场景地面的角色加权：有地形 = 草地，没有 = 大块地板的颜色） */
let groundRoles: [number, number][] = [[ROLE_INDEX.grass, 1]];
function sceneGround(desc: SceneDesc | null) {
  groundRoles = [[ROLE_INDEX.grass, 1]];
  if (!desc || desc.terrain) return;
  const acc = new Map<number, number>();
  for (const it of desc.items) {
    const area = it.scale[0] * it.scale[2];
    if (area < 4 || it.scale[1] > 0.8 || it.pos[1] > 1) continue;
    const r = ROLE_INDEX[it.role as Role];
    acc.set(r, (acc.get(r) ?? 0) + area);
  }
  if (acc.size) groundRoles = [...acc.entries()];
}

function updateEnv() {
  // 地面：反照率 × （太阳照度 + 天光）
  _gnd.setRGB(0, 0, 0);
  let wsum = 0;
  for (const [r, w] of groundRoles) { _gnd.r += U.uRoleColors.value[r].r * w; _gnd.g += U.uRoleColors.value[r].g * w; _gnd.b += U.uRoleColors.value[r].b * w; wsum += w; }
  _gnd.multiplyScalar(1 / Math.max(wsum, 1e-6));
  const sunY = Math.max(0, U.uSunDir.value.y);
  _c.copy(U.uSkyHorizon.value).lerp(U.uSkyTop.value, 0.5).multiplyScalar(0.5).add(_sky.copy(U.uSunColor.value).multiplyScalar(sunY * 0.7));
  _gnd.multiply(_c);
  // 反光不会比反照率的饱和度更艳：往灰里收一点
  const gl = _gnd.r * 0.2126 + _gnd.g * 0.7152 + _gnd.b * 0.0722;
  _gnd.lerp(_sky.setRGB(gl, gl, gl), 0.35);
  U.uEnvGround.value.copy(_gnd);
  // 投影：c_i = 4π/N Σ L(d) Y_i(d)；存 Â_l/π · C_i² · Σ（着色器里只乘多项式）
  const sh = U.uSH.value;
  for (const s of sh) s.set(0, 0, 0);
  const sd = U.uSunDir.value;
  for (const d of DIRS) {
    if (d.y >= 0) {
      _sky.copy(U.uSkyHorizon.value).lerp(U.uSkyTop.value, smooth(0, 0.7, d.y));
      const cs = Math.max(0, d.dot(sd));
      const g = Math.pow(cs, 3) * 0.45 + Math.pow(cs, 24) * 0.6;
      _sky.r += U.uSunColor.value.r * g; _sky.g += U.uSunColor.value.g * g; _sky.b += U.uSunColor.value.b * g;
    } else _sky.copy(_gnd).multiplyScalar(1 - 0.35 * smooth(0, 0.6, -d.y));
    for (let i = 0; i < 9; i++) {
      const w = shPoly(d, i);
      sh[i].x += _sky.r * w; sh[i].y += _sky.g * w; sh[i].z += _sky.b * w;
    }
  }
  const k = (4 * Math.PI) / NDIR;
  for (let i = 0; i < 9; i++) sh[i].multiplyScalar(k * SH_K[i] * SH_C[i] * SH_C[i]);
  // 亮度归一：朝上的辐照度 = 引擎原来的天光（换成环境光照时整体明暗不跳，只换方向与颜色）
  const lumOf = (x: number, y: number, z: number) => x * 0.2126 + y * 0.7152 + z * 0.0722;
  const up = lumOf(sh[0].x + sh[1].x - sh[6].x - sh[8].x, sh[0].y + sh[1].y - sh[6].y - sh[8].y, sh[0].z + sh[1].z - sh[6].z - sh[8].z);
  const want = lumOf(U.uSkyAmb.value.r, U.uSkyAmb.value.g, U.uSkyAmb.value.b);
  const s = Math.min(8, Math.max(0.6, want / Math.max(up, 1e-4)));
  for (let i = 0; i < 9; i++) sh[i].multiplyScalar(s);
}

/* ---------- 参数 → uniform ---------- */
const stage = new Stage();
let lastValues: Values = {};

function writeUniforms(v: Values) {
  const rep = str(v, 'geometry.representation');
  const model = str(v, 'shading.model');
  const litModel = !['unlit', 'hatching', 'matcap', 'vertex'].includes(model);
  U.uEnvLight.value = litModel ? num(v, 'lighting.envLight') : 0;
  U.uEnvReflect.value = litModel ? idx(v, 'material.envReflect', ['none', 'sky', 'chrome', 'matcap']) : 0;
  U.uEnvAmount.value = num(v, 'material.envAmount');
  U.uCoat.value = litModel ? num(v, 'material.clearcoat') : 0;
  U.uCoatRough.value = num(v, 'material.clearcoatRough');
  U.uSss.value = litModel ? num(v, 'material.sss') : 0;
  U.uSssColor.value.setRGB(...hexToLinear(str(v, 'material.sssColor')));
  U.uSssScope.value = idx(v, 'material.sssScope', ['organic', 'characters', 'all']);
  U.uFuzz.value = litModel ? num(v, 'material.fuzz') : 0;
  U.uWire.value = rep === 'wireframe' ? 1 : 0;
  U.uWireWidth.value = num(v, 'geometry.wireWidth');
  U.uWireFill.value = idx(v, 'geometry.wireFill', ['dark', 'sky', 'shaded']);
  U.uWireGlow.value = num(v, 'geometry.wireGlow');
  U.uWireColor.value = idx(v, 'geometry.wireColor', ['role', 'accent', 'emissive']);
  U.uVoxelAO.value = rep === 'voxel' ? num(v, 'geometry.voxelAO') : 0;
  U.uBlocks.value = str(v, 'material.texture') === 'blocks16' ? 1 : 0;
  U.uVoxelSize.value = rep === 'voxel' ? num(v, 'geometry.voxelSize') : 0;
  U.uCracks.value = num(v, 'material.cracks');
  U.uCrackScale.value = num(v, 'material.crackScale');
  U.uGrime.value = num(v, 'material.grime');
  U.uBoil.value = num(v, 'geometry.boil') * 0.06;
  U.uScreenDoor.value = idx(v, 'material.screenDoor', ['none', 'water', 'all']);
  U.uVertexLit.value = model === 'vertex' ? 1 : 0;
  U.uMatExt.value = idx(v, 'material.preset', ['', 'cloisonne', 'porcelain', 'lacquer']);
  U.uPatScale.value = num(v, 'material.patternScale');
  U.uSpriteNormal.value = str(v, 'shape.carrier') === 'model' ? 0 : num(v, 'shape.spriteNormal');
}

function attrs(c: EngineExtCtx) {
  const v = c.values;
  const rep = str(v, 'geometry.representation');
  ensureAttrs(c.root, c.desc, {
    bary: rep === 'wireframe',
    vox: rep === 'voxel' && (num(v, 'geometry.voxelAO') > 0 || str(v, 'material.texture') === 'blocks16' || str(v, 'shading.model') === 'vertex'),
    ground: num(v, 'material.grime') > 0 || num(v, 'lighting.envLight') > 0,
  });
}

const envOn = () => U.uEnvLight.value > 0 || U.uEnvReflect.value > 0 || U.uCoat.value > 0 || U.uMatExt.value > 0;

function boilSeed(c: EngineExtCtx) {
  if (U.uBoil.value <= 0) return;
  const fr = str(c.values, 'motion.frameRate');
  const fps = fr === 'smooth' ? 12 : Number(fr) || 12;
  U.uBoilSeed.value = Math.floor(c.stepTime * fps + 1e-3) % 97;
}

registerEngineExt({
  id: 'material',
  onValues(c) {
    lastValues = c.values;
    writeUniforms(c.values);
    attrs(c);
    stage.update(c.scene, c.values, c.camera, c.time);
    if (envOn()) updateEnv();
    boilSeed(c);
  },
  onSceneBuilt(c) {
    sceneGround(c.desc);
    stage.sceneBuilt(c.scene, c.root, c.desc);
    attrs(c);
  },
  onFrame(c) {
    // 舞台光先压暗天色，环境光照再按压暗后的天色算
    if (str(c.values, 'lighting.stage') !== 'none' || U.uSpotCount.value > 0) stage.update(c.scene, c.values, c.camera, c.time);
    if (envOn() && (bool(c.values, 'lighting.cycle') || U.uSpotCount.value > 0)) updateEnv();
    boilSeed(c);
  },
  onDispose() {
    stage.dispose();
  },
});

/** 开发自检用：最近一次的参数 */
export const materialExtValues = () => lastValues;
