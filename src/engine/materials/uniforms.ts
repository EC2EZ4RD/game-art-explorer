import * as THREE from 'three';
import { ROLE_COUNT } from '../../content/roles';

/*
 * 所有场景材质共享的一组 uniform。参数变化只改这里的值，不重新编译着色器。
 * 迁移到 Godot 时，这一组对应 global shader uniforms（项目设置 → Shader Globals）或一个共享材质。
 */

export const MAX_POINT_LIGHTS = 8;

export const U = {
  uTime: { value: 0 },
  uAnimTime: { value: 0 },
  uRoleColors: { value: Array.from({ length: ROLE_COUNT }, () => new THREE.Color()) },
  uVariation: { value: 0.08 },

  // 材质
  uMatPreset: { value: 0 },
  uRoughness: { value: 0.6 },
  uSpecular: { value: 0.5 },
  uMetalness: { value: 0 },
  uBump: { value: 0.15 },
  uGrain: { value: 0.2 },

  // 明暗
  uModel: { value: 4 },
  uSteps: { value: 3 },
  uThreshold: { value: 0.05 },
  uSoftness: { value: 0.02 },
  uShadowColor: { value: new THREE.Color('#5B4E9E') },
  uShadowTint: { value: 0.45 },
  uShadowDepth: { value: 0.62 },
  uQuantShadow: { value: 1 },
  uAmbient: { value: 0.45 },
  uWrap: { value: 0.5 },
  uRim: { value: 0.25 },
  uRimWidth: { value: 0.3 },
  uHighlight: { value: 0 },
  uHatchScale: { value: 5 },
  uHatchWorld: { value: 1 },
  uFlatMode: { value: 0 },

  // 光
  uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uSkyAmb: { value: new THREE.Color(0.6, 0.7, 0.9) },
  uGroundAmb: { value: new THREE.Color(0.3, 0.28, 0.25) },
  uCloudShadow: { value: 0.25 },
  uPointPos: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Vector3()) },
  uPointColor: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
  uPointRange: { value: new Array<number>(MAX_POINT_LIGHTS).fill(1) },
  uPointCount: { value: 0 },

  // 阴影
  uShadowMap: { value: null as THREE.Texture | null },
  uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowMode: { value: 1 },
  uShadowRadius: { value: 2 },
  uShadowStrength: { value: 0.85 },
  uShadowTexel: { value: 1 / 2048 },
  uShadowBias: { value: 0.0015 },

  // 雾与天空
  uFogMode: { value: 1 },
  uFogColor: { value: new THREE.Color('#CDEFFF') },
  uFogDensity: { value: 0.3 },
  uFogRange: { value: new THREE.Vector2(20, 120) },
  uSkyTop: { value: new THREE.Color('#4FB4FF') },
  uSkyHorizon: { value: new THREE.Color('#CDEFFF') },
  uSkyMode: { value: 0 },
  uPaper: { value: new THREE.Color('#F7F1E3') },
  uInk: { value: new THREE.Color('#1E1B2E') },
  /** 立绘 / 背景插画的时段色（太阳色相 × 昼夜明暗，引擎按时段算；只有贴图四边形读它，审查修复 1） */
  uImageTint: { value: new THREE.Color(1, 1, 1) },
  /** 立绘的色板调色（整合修复 U#15）：色板颜色按明度分三段的平均色（暗 / 中 / 亮，线性），插画按明度在三者之间借色相；只有贴图四边形读它 */
  uImageRamp: { value: [new THREE.Color(0.1, 0.1, 0.1), new THREE.Color(0.4, 0.4, 0.4), new THREE.Color(0.8, 0.8, 0.8)] },
  /** 立绘的墨线强度（描边 / 边线配方在插画上按明暗边勾线，0 = 不勾） */
  uImageInk: { value: 0 },

  // 地形分带
  uTerrainAmp: { value: 5.5 },
  uSea: { value: 1 },
  uBeach: { value: 0.05 },
  uHighland: { value: 0.5 },
  uSnow: { value: 0.78 },
  uBiomeMode: { value: 0 },
  uBlendMode: { value: 0 },
  uTerrainBottom: { value: -2 },

  // 风与 PS1
  uWind: { value: 0.35 },
  uSnap: { value: 0 },
  uResolution: { value: new THREE.Vector2(1280, 720) },

  // 世界弯曲（小星球 / 滚筒世界）：只弯投影位置，光照、阴影与行走仍在平直世界里计算
  uBendMode: { value: 0 },
  uBend: { value: 0 },
  uBendCenter: { value: new THREE.Vector3() },
  uBendAxis: { value: new THREE.Vector2(0, 1) },

  // 低清像素贴图（程序生成，不需要贴图文件）：0 无 / 1 点采样 / 2 三点过滤（N64）/ 3 双线性
  uTexMode: { value: 0 },
  uTexScale: { value: 12 },
  uTexAmount: { value: 0.6 },
  uAffine: { value: 0 },

  // 素材纹理（AI 生成 / 程序生成，见 src/content/assets.json）：未选用时绑 1×1 中性纹理
  /** 凹凸图案：0 程序噪声 / 1 黏土指纹 / 2 针织 */
  uDetailMode: { value: 0 },
  uDetailScale: { value: 1.5 },
  tDetailN: { value: null as THREE.Texture | null },
  tDetailH: { value: null as THREE.Texture | null },
  /** 皴法：0 无 / 1 披麻 / 2 斧劈 / 3 米点 */
  uCunMode: { value: 0 },
  uCunAmount: { value: 0.6 },
  uCunScale: { value: 0.2 },
  tCun: { value: null as THREE.Texture | null },
  /** 剥落阈值（0 = 不剥落） */
  uWeather: { value: 0 },
  uWeatherScale: { value: 0.6 },
  tWeather: { value: null as THREE.Texture | null },
  /** 剪纸镂空：0 无 / 1 建筑 / 2 植物 / 3 全部 */
  uPapercut: { value: 0 },
  uPapercutScale: { value: 1 },
  tPapercut: { value: null as THREE.Texture | null },
  uWindowFlower: { value: 0 },
  tWindow: { value: null as THREE.Texture | null },
  /** 排线来源：0 程序直线 / 1 TAM */
  uHatchTex: { value: 0 },
  tTam1: { value: null as THREE.Texture | null },
  tTam2: { value: null as THREE.Texture | null },

  // 描边
  uOutlineWidth: { value: 2.2 },
  uOutlineMode: { value: 2 },
  uOutlineColorMode: { value: 0 },
  uOutlineColor: { value: new THREE.Color('#2D1F3D') },
  uOutlineRaw: { value: 0 },
  uOutlineMask: { value: new Array<number>(ROLE_COUNT).fill(1) },
  uOutlineTerrain: { value: 1 },
  uViewHeight: { value: 30 },
  /** 脚下圆影：xyz 位置，w 半径（0 为关闭） */
  uBlob: { value: new THREE.Vector4(0, 0, 0, 0) },

  /* ---- 技术补全 M 轨道（材质与灯光，2026-10-23）：都由 ext/material.ts 按参数写；默认值 = 关，画面与原来一致 ---- */
  // 环境光照：天空光的二阶球谐（已卷积成辐照度 ÷ π，乘固有色就是漫反射）+ 反射用的地面色
  uEnvLight: { value: 0 },
  uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) },
  uEnvGround: { value: new THREE.Color(0.2, 0.18, 0.15) },
  /** 反射贴图：0 无 / 1 天空 / 2 镀铬 / 3 球面反射（材质球式） */
  uEnvReflect: { value: 0 },
  uEnvAmount: { value: 1 },
  // 清漆层
  uCoat: { value: 0 },
  uCoatRough: { value: 0.08 },
  // 次表面散射：强度、散射色、范围（0 有机物 / 1 只角色 / 2 全部）
  uSss: { value: 0 },
  uSssColor: { value: new THREE.Color(1, 0.35, 0.22) },
  uSssScope: { value: 0 },
  // 舞台聚光灯（最多 3 盏）：位置、方向（光照方向，指向地面）、颜色（含强度）、锥角余弦（外, 内）、射程
  uSpotCount: { value: 0 },
  uSpotPos: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) },
  uSpotDir: { value: Array.from({ length: 3 }, () => new THREE.Vector3(0, -1, 0)) },
  uSpotColor: { value: Array.from({ length: 3 }, () => new THREE.Color(0, 0, 0)) },
  uSpotCone: { value: Array.from({ length: 3 }, () => new THREE.Vector2(0.9, 0.95)) },
  uSpotRange: { value: new Array<number>(3).fill(30) },
  /** 第一盏聚光借用太阳的阴影贴图（太阳方向被换成这盏灯的方向）：1 = 用 */
  uSpotShadow: { value: 0 },
  // 线框几何：开关、线宽（像素）、填充（0 暗色 / 1 天色 / 2 保留明暗）、辉光、线色（0 角色色 / 1 强调色 / 2 发光色）
  uWire: { value: 0 },
  uWireWidth: { value: 1.2 },
  uWireFill: { value: 0 },
  uWireGlow: { value: 1 },
  uWireColor: { value: 0 },
  // 体素 AO、16px 方块贴图（体素尺寸用来对齐方块面）
  uVoxelAO: { value: 0 },
  uBlocks: { value: 0 },
  uVoxelSize: { value: 0.42 },
  // 龟裂、污渍
  uCracks: { value: 0 },
  uCrackScale: { value: 1 },
  uGrime: { value: 0 },
  // 逐帧形变（定格颤动）：幅度（米）与这一拍的种子
  uBoil: { value: 0 },
  uBoilSeed: { value: 0 },
  // 网眼透明：0 关 / 1 水面 / 2 水、玻璃与树叶边缘
  uScreenDoor: { value: 0 },
  // 逐顶点光照（Gouraud）
  uVertexLit: { value: 0 },
  /** 新材料预设：0 无 / 1 掐丝珐琅 / 2 青花 / 3 剔红 */
  uMatExt: { value: 0 },
  uPatScale: { value: 1 },
  // 绒毛边缘
  uFuzz: { value: 0 },
  // 像素精灵自动法线
  uSpriteNormal: { value: 0 },
};

export type SharedUniforms = typeof U;
