import type { SceneRig } from '../engine/scene/types';
import { sceneRigValues } from './sceneRig';
import { ISO_SCENES } from './scenes25d/iso';
import { PAPER_SCENES } from './scenes25d/paper';
import { RETRO_SCENES } from './scenes25d/retro';

/*
 * 场景覆盖地图（需求 8.2 的 24 类 + 2026-10 的 2D 场景，docs/workbench-redesign.md §9.1）。builder 在 engine/scene/scenes 里按 id 注册；
 * 没有 builder 的条目仍然显示在覆盖地图里，状态为"待实现"，不会从分类中消失。
 * 分成 5 组（§11.1 F）：自然 / 聚落 / 室内 / 特殊 / 2D。2D 场景带 rig（锁定的镜头），界面读它判断「这个场景镜头已锁定」。
 */

export type SceneGroup = '自然' | '聚落' | '室内' | '特殊' | '2D';
export const SCENE_GROUPS: [SceneGroup, string][] = [
  ['自然', '地形、植被、水与天空'],
  ['聚落', '房屋、街道、城与村'],
  ['室内', '剖开的房间、洞穴与地牢'],
  ['特殊', '赛道、竞技场、桌面、超现实与测试台'],
  ['2D', '横版、俯视瓦片、棋盘、立绘、白盒、等距、纸艺、伪 3D：镜头锁定'],
];

export interface SceneFeatures {
  terrain?: boolean;
  water?: boolean;
  character?: boolean;
  indoor?: boolean;
  architecture?: boolean;
  vegetation?: boolean;
  clouds?: boolean;
}

export interface SceneMeta {
  id: string;
  name: string;
  category: string;
  checks: string;
  desc: string;
  features: SceneFeatures;
  /** 推荐镜头等默认值（"应用场景推荐"时使用；2D 场景 = 与锁定镜头一致的镜头键 + 建议的雾） */
  recommended?: Record<string, string | number | boolean>;
  /** 5 组之一（不写时由 GROUP_OF 补上） */
  group?: SceneGroup;
  /** 场景自带的镜头（2D 场景锁定机位；构建器写进 SceneDesc.camera 的是同一份，外加关卡尺寸相关的取景） */
  rig?: SceneRig;
  /** 同一套构建器的变体（横版·森林 / 洞窟……）：基础环境 id */
  variantOf?: string;
}

/* ---------------- 2D 场景的镜头（§9.1） ---------------- */

/** 横版：平视 0°、方位 0，透视 35mm（参数选正交时正交；像素化时强制正交 + 分层视差），只沿 x 跟拍，地面放在画面下方约 23% 处（整合修复 U#16：原来 0.17 时地面下面露出一大块空板） */
export const RIG_SIDE: SceneRig = { projection: 'values', pitch: 0, yaw: 0, fovMm: 35, lockOrbit: true, followAxis: 'x', frameOffset: [0, 0.27], fogSpan: 70 };
/** 俯视瓦片：正交、方位 0，俯角 50°（camera.angle 选正俯视时 88°），地面上跟拍 */
export const RIG_TILE: SceneRig = { projection: 'ortho', pitch: 50, yaw: 0, lockOrbit: true, followAxis: 'xz', angles: { high: 50, top: 88 } };
/** 战棋：正交二等距 30°、方位 45，固定机位；取景不小于 1 倍（审查修复 5） */
export const RIG_TACTICS: SceneRig = { projection: 'ortho', pitch: 30, yaw: 45, lockOrbit: true, minZoom: 1 };
/** 立绘背景：正交平视，固定机位；背景按画框铺满，取景不小于 1 倍（拉远就是一张浮在天上的画，审查修复 5 / 18） */
export const RIG_FLAT: SceneRig = { projection: 'ortho', pitch: 0, yaw: 0, lockOrbit: true, minZoom: 1 };
/** 平面牌桌：正交正俯视，固定机位，取景不小于 1 倍 */
export const RIG_TABLE: SceneRig = { projection: 'ortho', pitch: 88, yaw: 0, lockOrbit: true, minZoom: 1 };
/** 白盒横版：正交平视，只沿 x 跟拍；地面在画面下方约 26% 处（整合修复 U#16：原来 0.12，下面四成画面是一整块灰板） */
export const RIG_GREYBOX: SceneRig = { projection: 'ortho', pitch: 0, yaw: 0, fovMm: 35, lockOrbit: true, followAxis: 'x', frameOffset: [0, 0.24] };
/** 白盒竞技场：正交正俯视，地面上跟拍 */
export const RIG_ARENA_TOP: SceneRig = { projection: 'ortho', pitch: 88, yaw: 0, lockOrbit: true, followAxis: 'xz' };

/** 与锁定镜头一致的镜头键：实现挪到 ./sceneRig.ts（scenes25d/* 也用） */
const rigValues = sceneRigValues;

export const SCENE_CATEGORIES = [
  ['自然开放空间', '大色块、尺度、远景与路径'],
  ['林地', '遮挡、植被语言、光斑与层次'],
  ['山地', '垂直空间、地形轮廓、远近关系'],
  ['干旱地貌', '留白、风化、暖色、强光'],
  ['寒冷环境', '高明度、冷暖、材质区分'],
  ['水域边缘', '水陆交界、反射、透明与湿度'],
  ['水下', '水下可见度、色衰减、悬浮运动'],
  ['地下自然空间', '局部照明、封闭感、识路'],
  ['乡村与农场', '生产痕迹、秩序与自然关系'],
  ['城镇与市井', '街道层级、招牌、建筑密度'],
  ['大型城市', '垂直密度、尺度、城市节奏'],
  ['中式空间', '建筑语法、院落、文化依据'],
  ['历史与幻想建筑', '建筑轮廓、仪式感与材质组织'],
  ['地牢与遗迹', '路线、危险、明暗引导'],
  ['生活室内', '家具尺度、材料、生活叙事'],
  ['公共与商业室内', '动线、焦点、物品陈列'],
  ['工业空间', '模块重复、机械连接、信息密度'],
  ['科幻设施', '科技构形、模块、指示与灯光'],
  ['废弃与末日空间', '使用痕迹、破损与情绪'],
  ['超现实空间', '抽象形体、非日常尺度、构图'],
  ['交通与赛道', '速度、弯道识别、远景节奏'],
  ['战斗与竞技空间', '敌我识别、危险区、行动余量'],
  ['桌面与界面空间', '平面与立体混合、符号、UI'],
  ['宏观观察空间', '缩放、密度、层级与信息抽象'],
  ['对象测试台', '形状、材质与线条（单个对象）'],
  // 2D 场景（§9.1）
  ['横版卷轴', '分层纵深、平台落点、前后景剪影'],
  ['俯视瓦片', '方格地面、四向行走、地图感'],
  ['战棋棋盘', '格子、单位辨识、落点预览'],
  ['立绘与平面', '背景插画、立绘、平视构图'],
  ['几何白盒', '纯几何、色块与读形'],
  // 2D / 2.5D 场景第二批（2026-10-23 技术补全）
  ['等距 2.5D', '等距视角、立体模型感、斜俯视读形'],
  ['纸艺与剧场', '纸片分层、剪影、背光与舞台光'],
  ['伪 3D', '道路条纹、地面缩放、第一人称格子迷宫'],
  ['竖版与节奏', '竖向卷轴、弹道读形、节奏轨道'],
] as const;

export const SCENES: SceneMeta[] = [
  {
    id: 'sandbox', name: '灵感沙盒岛', category: '自然开放空间', checks: '大色块、尺度、路径；完整复现灵感提示词',
    desc: '噪声地形的小岛：沙滩、草地、高地、雪顶，阔叶树、针叶松、圆石、漂浮云和水，WASD 小人可以走动。',
    features: { terrain: true, water: true, character: true, vegetation: true, clouds: true },
  },
  {
    id: 'bench', name: '对象测试台', category: '对象测试台', checks: '单个对象的形状、材质与线条',
    desc: '转台上摆着角色、房屋、树、石头与道具，适合专心观察形状、材质和线条。',
    features: { character: true, architecture: true, vegetation: true },
    recommended: { 'camera.mode': 'autoRotate', 'camera.angle': 'high' },
  },
  {
    id: 'forest', name: '林间小径', category: '林地', checks: '遮挡、植被语言、光斑与层次',
    desc: '缓坡上的阔叶林、针叶林与竹林三片，一条蜿蜒土路穿过，林间有宝箱与灯。',
    features: { terrain: true, character: true, vegetation: true },
    recommended: { 'camera.angle': 'high', 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.4, 'lighting.cloudShadows': 0.45 },
  },
  {
    id: 'courtyard', name: '中式庭院', category: '中式空间', checks: '建筑语法、院落、文化依据',
    desc: '二进院落：门楼、厢房（悬山）、正房（歇山，台基柱网隔扇），月洞门通向有水池、拱桥、六角亭、竹与太湖石的侧园。',
    features: { character: true, architecture: true, vegetation: true, water: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'ortho', 'camera.zoom': 1, 'lighting.time': 15 },
  },
  {
    id: 'street', name: '市井街巷', category: '城镇与市井', checks: '街道层级、招牌、建筑密度与尺度',
    desc: '一条石板路两侧临街建筑，摊位、货箱与灯；文化套件切换中式市井 / 欧洲小镇 / 现代街道。',
    features: { character: true, architecture: true },
    recommended: { 'camera.projection': 'persp', 'camera.fov': 28, 'camera.angle': 'low', 'camera.mode': 'follow' },
  },
  {
    id: 'room', name: '书房卧室', category: '生活室内', checks: '家具尺度、材料、室内光与生活叙事',
    desc: '剖开两面墙的房间：床、书桌、椅、书架、地毯、盆栽、台灯，后墙有窗。',
    features: { character: true, indoor: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'ortho', 'camera.zoom': 1, 'lighting.time': 16.5, 'lighting.lanterns': 1.4, 'atmosphere.fog': 'none' },
  },
  {
    id: 'cave', name: '晶石洞穴', category: '地下自然空间', checks: '局部照明、封闭感、识路',
    desc: '元胞自动机生成的洞穴，岩壁高低错落，火把与发光水晶照亮通路。',
    features: { character: true, indoor: true },
    recommended: { 'lighting.time': 23, 'lighting.lanterns': 1.8, 'shading.ambient': 0.3, 'atmosphere.fog': 'none', 'camera.angle': 'high' },
  },
  {
    id: 'snowVillage', name: '雪村冻湖', category: '寒冷环境', checks: '高明度、冷暖对比、材质区分',
    desc: '缓坡雪地与冻湖，屋顶积雪的木屋、针叶林、柴堆与暖光窗。',
    features: { terrain: true, character: true, vegetation: true, architecture: true, water: true },
    recommended: { 'atmosphere.weather': 'snow', 'lighting.time': 15, 'color.temperature': -0.25, 'atmosphere.water': 'flat' },
  },
  {
    id: 'desert', name: '沙漠绿洲', category: '干旱地貌', checks: '留白、风化、暖色强光',
    desc: '鼓包噪声的沙丘、一汪绿洲水、棕榈、仙人掌、断柱遗迹与半个石拱。',
    features: { terrain: true, character: true, vegetation: true, water: true },
    recommended: { 'lighting.time': 13, 'color.temperature': 0.25, 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.3 },
  },
  {
    id: 'scifi', name: '科幻舱室', category: '科幻设施', checks: '科技构形、模块重复、指示与灯光',
    desc: 'L 形走廊加控制室：墙板、灯带、管线、舱门、储罐与控制台，俯视剖开。',
    features: { character: true, indoor: true, architecture: true },
    recommended: { 'lighting.time': 23, 'lighting.lanterns': 1.6, 'camera.bloom': 0.5, 'atmosphere.fog': 'none', 'camera.angle': 'high' },
  },
  {
    id: 'harbor', name: '渔港栈桥', category: '水域边缘', checks: '水陆交界、反射、透明与湿度',
    desc: '一侧是岸（沙滩→草地→房屋），一侧是海；木栈桥、渔船、货箱与灯塔。',
    features: { character: true, architecture: true, water: true, vegetation: true },
    recommended: { 'lighting.time': 17.5, 'atmosphere.water': 'toon' },
  },
  {
    id: 'mountain', name: '盘山小径', category: '山地', checks: '垂直空间、地形轮廓、远近关系',
    desc: '山脊噪声的高山，盘山路绕到山顶的经幡，低处针叶林、高处裸岩与雪。',
    features: { terrain: true, water: true, character: true, vegetation: true, clouds: true },
    recommended: { 'camera.projection': 'persp', 'camera.fov': 35, 'camera.angle': 'high', 'atmosphere.fog': 'height', 'atmosphere.fogDensity': 0.45 },
  },
  {
    id: 'underwater', name: '浅海珊瑚', category: '水下', checks: '水下可见度、色衰减、悬浮运动',
    desc: '沙质海床上的珊瑚、海草、沉船与鱼群，雾当作水体的色衰减。',
    features: { terrain: true, character: true, vegetation: true },
    recommended: { 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.75, 'atmosphere.sky': 'solid', 'color.temperature': -0.5, 'lighting.cloudShadows': 0.6, 'atmosphere.weather': 'dust', 'atmosphere.wind': 0.6 },
  },
  {
    id: 'farm', name: '田园农场', category: '乡村与农场', checks: '生产痕迹、秩序与自然关系',
    desc: '四块不同作物的田垄、谷仓、农舍、风车、草垛与稻草人，一条土路穿过。',
    features: { terrain: true, character: true, vegetation: true, architecture: true, clouds: true },
    recommended: { 'camera.angle': 'high', 'lighting.time': 16.5 },
  },
  {
    id: 'city', name: '城市街区', category: '大型城市', checks: '垂直密度、尺度、城市节奏',
    desc: '4×4 街区的高楼，中心更高，一块公园，路上有车；夜里窗户亮起。',
    features: { character: true, architecture: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'persp', 'camera.fov': 40, 'lighting.time': 19 },
  },
  {
    id: 'castle', name: '城堡与城下町', category: '历史与幻想建筑', checks: '建筑轮廓、仪式感与材质组织',
    desc: '护城河环绕的方城：四面城墙、角楼、主堡与尖顶，城内一排小屋，吊桥通向城外。',
    features: { terrain: true, water: true, character: true, architecture: true, vegetation: true, clouds: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'persp', 'camera.fov': 45 },
  },
  {
    id: 'dungeon', name: '地牢', category: '地牢与遗迹', checks: '路线、危险、明暗引导',
    desc: 'BSP 生成的房间与走廊，火把、宝箱、石柱与危险区，俯视剖开。',
    features: { character: true, indoor: true },
    recommended: { 'lighting.time': 23, 'lighting.lanterns': 1.7, 'shading.ambient': 0.3, 'atmosphere.fog': 'none', 'camera.angle': 'high' },
  },
  {
    id: 'tavern', name: '酒馆', category: '公共与商业室内', checks: '动线、焦点、物品陈列',
    desc: '吧台、酒架、木桶、圆桌与凳、壁炉和灯笼，剖开两面墙。',
    features: { character: true, indoor: true },
    recommended: { 'lighting.time': 20, 'lighting.lanterns': 1.4, 'camera.angle': 'high', 'atmosphere.fog': 'none' },
  },
  {
    id: 'factory', name: '工厂车间', category: '工业空间', checks: '模块重复、机械连接、信息密度',
    desc: '机床一排、传送带、储罐、管线、警示线与货箱，大跨度车间。',
    features: { character: true, indoor: true, architecture: true },
    recommended: { 'camera.angle': 'high', 'atmosphere.fog': 'none' },
  },
  {
    id: 'ruins', name: '末日废城', category: '废弃与末日空间', checks: '使用痕迹、破损与情绪',
    desc: '残墙断壁、瓦砾、废车、火桶与重新长出的灌木。',
    features: { terrain: true, character: true, architecture: true, vegetation: true },
    recommended: { 'lighting.time': 18, 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.5, 'atmosphere.weather': 'dust' },
  },
  {
    id: 'surreal', name: '超现实浮空', category: '超现实空间', checks: '抽象形体、非日常尺度、构图',
    desc: '棋盘地面、浮空岩块、不通向任何地方的楼梯与门、巨大的发光球和圆环。',
    features: { character: true },
    recommended: { 'atmosphere.sky': 'bands', 'camera.projection': 'persp', 'camera.fov': 24, 'camera.angle': 'low' },
  },
  {
    id: 'racetrack', name: '环形赛道', category: '交通与赛道', checks: '速度、弯道识别、远景节奏',
    desc: '椭圆赛道、红白路肩、护栏、起点门、赛车与林带。',
    features: { character: true, vegetation: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'persp', 'camera.fov': 30 },
  },
  {
    id: 'arena', name: 'Boss 竞技场', category: '战斗与竞技空间', checks: '敌我识别、危险区、行动余量',
    desc: '圆形竞技场，掩体石柱、巨像、火盆与红色危险区。',
    features: { character: true, architecture: true },
    recommended: { 'lighting.time': 21, 'lighting.lanterns': 1.6, 'camera.angle': 'high' },
  },
  {
    id: 'tabletop', name: '桌游与卡牌', category: '桌面与界面空间', checks: '平面与立体混合、符号、UI',
    desc: '桌布上的棋盘与棋子、手牌、骰子、筹码与一盏灯。',
    features: { indoor: true },
    recommended: { 'camera.angle': 'high', 'camera.projection': 'persp', 'camera.fov': 50, 'atmosphere.fog': 'none', 'lighting.time': 20, 'lighting.lanterns': 1.4 },
  },
  {
    id: 'strategy', name: '六边形策略地图', category: '宏观观察空间', checks: '缩放、密度、层级与信息抽象',
    desc: '六边形地块的岛屿，树林、村落与两方阵营的棋子单位。',
    features: { terrain: true, water: true, vegetation: true, clouds: true },
    recommended: { 'camera.angle': 'high', 'camera.zoom': 0.8, 'camera.mode': 'orbit' },
  },
];

/* ---------------- 2D 场景（§9.1，F 轨道） ---------------- */

const SIDE_REC = rigValues(RIG_SIDE, { 'atmosphere.fog': 'layers', 'atmosphere.fogDensity': 0.55 });
const TILE_REC = rigValues(RIG_TILE, { 'atmosphere.fog': 'none' });
const FLAT_REC = rigValues(RIG_FLAT, { 'atmosphere.fog': 'none', 'lighting.shadows': 'none' });

SCENES.push(
  {
    id: 'sideStage', name: '横版·森林', category: '横版卷轴', group: '2D', rig: RIG_SIDE,
    checks: '分层纵深、平台落点、前后景剪影',
    desc: '侧面平视的横版关卡：角色所在的平台一层，身后近、中、远、天边四层树林与山退进雾里，前景零星剪影；只能左右走。',
    features: { character: true, vegetation: true, clouds: true }, recommended: SIDE_REC,
  },
  {
    id: 'sideStage-cave', name: '横版·洞穴', category: '横版卷轴', group: '2D', rig: RIG_SIDE, variantOf: 'sideStage',
    checks: '暗处识路、局部光、平台轮廓',
    desc: '地下洞窟的横版关卡：钟乳石、石笋与高低平台，发光蘑菇和晶石照亮通路，身后一层层岩壁。',
    features: { character: true, indoor: true }, recommended: { ...SIDE_REC, 'lighting.time': 22, 'lighting.lanterns': 1.8, 'shading.ambient': 0.35 },
  },
  {
    id: 'sideStage-ruins', name: '横版·废墟', category: '横版卷轴', group: '2D', rig: RIG_SIDE, variantOf: 'sideStage',
    checks: '建筑剪影、破损、纵深层次',
    desc: '废墟城堡的横版关卡：断柱、拱门、残墙与吊灯，身后是城墙与塔楼的剪影。',
    // 时段 17.3（夕照）：原来 18.5 太阳已在地平线下，整屏几乎全黑、守门巨像看不见（整合修复 U#16）
    features: { character: true, architecture: true }, recommended: { ...SIDE_REC, 'lighting.time': 17.3, 'lighting.lanterns': 1.6 },
  },
  {
    id: 'sideStage-shanshui', name: '横版·山水', category: '横版卷轴', group: '2D', rig: RIG_SIDE, variantOf: 'sideStage',
    checks: '长卷构图、留白、远山层叠',
    desc: '山水长卷式的横版：近岸松石与小桥，中景山峦，远山一层淡过一层，水面留白。',
    features: { character: true, vegetation: true, architecture: true }, recommended: { ...SIDE_REC, 'atmosphere.fogDensity': 0.65 },
  },
  {
    id: 'tileTown', name: '俯视·小镇', category: '俯视瓦片', group: '2D', rig: RIG_TILE,
    checks: '方格地面、街区秩序、四向行走',
    desc: '方格地面按区域合并的小镇：石板广场、土路、草地、池塘，盒子房屋配楔形屋顶，树与围栏；正交高俯角。',
    features: { character: true, architecture: true, vegetation: true, water: true }, recommended: TILE_REC,
  },
  {
    id: 'tileTown-farm', name: '俯视·农场', category: '俯视瓦片', group: '2D', rig: RIG_TILE, variantOf: 'tileTown',
    checks: '田垄秩序、作物辨识、生活感',
    desc: '俯视的农场：几块翻过的田垄和作物、谷仓、农舍、篱笆、水井与池塘。',
    features: { character: true, architecture: true, vegetation: true, water: true }, recommended: TILE_REC,
  },
  {
    id: 'tileTown-field', name: '俯视·原野', category: '俯视瓦片', group: '2D', rig: RIG_TILE, variantOf: 'tileTown',
    checks: '大片草地上的敌群、拾取物与留白',
    desc: '大片草地上零散的树丛、石块和废墟，四面围上来的敌群与经验宝石（割草类）。',
    features: { character: true, vegetation: true }, recommended: TILE_REC,
  },
  {
    id: 'tacticsBoard', name: '战棋·棋盘', category: '战棋棋盘', group: '2D', rig: RIG_TACTICS,
    checks: '格子、地形格、敌我单位辨识',
    desc: '悬空的 8×8 棋盘：草地、水、山、建筑格，我方机甲与敌方虫群；正交二等距 30°，格子导出给 UI 对齐移动范围。',
    features: { character: true, water: true, architecture: true }, recommended: rigValues(RIG_TACTICS, { 'camera.mode': 'orbit', 'atmosphere.fog': 'none' }),
  },
  {
    id: 'backdrop', name: '立绘·来信', category: '立绘与平面', group: '2D', rig: RIG_FLAT,
    checks: '背景插画与立绘的一致性、对话构图',
    desc: '视觉小说的一幕：水彩风景作背景，二次元立绘站在右侧（画面后处理照样作用在插画上）。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-title', name: '立绘·标题', category: '立绘与平面', group: '2D', rig: RIG_FLAT, variantOf: 'backdrop',
    checks: '主视觉与标题、菜单的关系',
    desc: '主视觉海报铺满画面，作标题界面的背景。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-battle', name: '立绘·卡牌战', category: '立绘与平面', group: '2D', rig: RIG_FLAT, variantOf: 'backdrop',
    checks: '敌我站位、意图与血条的挂点',
    desc: '卡牌战斗的一幕：背景插画前，左边主角立绘，右边两只敌人站在同一条地平线上。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-shop', name: '立绘·商店', category: '立绘与平面', group: '2D', rig: RIG_FLAT, variantOf: 'backdrop',
    checks: '货架留白与商品界面',
    desc: '柜台与货架的背景，Q 版店主站在一侧，中间留给商品格。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-clue', name: '立绘·线索墙', category: '立绘与平面', group: '2D', rig: RIG_FLAT, variantOf: 'backdrop',
    checks: '调查界面、线索卡片的承托',
    desc: '软木线索墙作背景，半身侦探立在左侧，中间留给线索卡。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-desk', name: '立绘·书桌', category: '立绘与平面', group: '2D', rig: RIG_FLAT, variantOf: 'backdrop',
    checks: '叙事容器、读信与菜单面板',
    desc: '俯视的旧书桌铺满画面，四周是信、钥匙与地图，中间留空放界面。',
    features: { character: false }, recommended: FLAT_REC,
  },
  {
    id: 'backdrop-cards', name: '平面·牌桌', category: '立绘与平面', group: '2D', rig: RIG_TABLE, variantOf: 'backdrop',
    checks: '手牌、出牌区与筹码的版面',
    desc: '正俯视的牌桌：毡面上的手牌区（牌由 UI 画）、出牌区、小丑牌位、牌堆与筹码（Balatro 一类）。',
    features: { character: false, indoor: true }, recommended: rigValues(RIG_TABLE, { 'atmosphere.fog': 'none' }),
  },
  {
    id: 'greybox', name: '白盒·平台', category: '几何白盒', group: '2D', rig: RIG_GREYBOX,
    checks: '纯几何读形、色块即信息',
    desc: '只用方块、楔形、圆柱和球搭的横版关卡：平台、坡、门与开关，没有纹理，颜色就是信息。',
    features: { character: true }, recommended: rigValues(RIG_GREYBOX, { 'atmosphere.fog': 'none' }),
  },
  {
    id: 'greybox-arena', name: '白盒·竞技场', category: '几何白盒', group: '2D', rig: RIG_ARENA_TOP, variantOf: 'greybox',
    checks: '俯视读形、敌我与弹道区分',
    desc: '正俯视的几何竞技场：围墙、障碍块、四面涌来的几何敌人（双摇杆射击一类）。',
    features: { character: true }, recommended: rigValues(RIG_ARENA_TOP, { 'atmosphere.fog': 'none' }),
  },
);

/* 2D / 2.5D 场景第二批（2026-10-23 技术补全）：各轨道在 scenes25d/* 里登记 */
SCENES.push(...ISO_SCENES, ...PAPER_SCENES, ...RETRO_SCENES);

/** 现有 3D 场景的分组（§11.1 F：自然 / 聚落 / 室内 / 特殊） */
const GROUP_OF: Record<string, SceneGroup> = {
  sandbox: '自然', forest: '自然', mountain: '自然', desert: '自然', underwater: '自然',
  courtyard: '聚落', street: '聚落', snowVillage: '聚落', harbor: '聚落', farm: '聚落', city: '聚落', castle: '聚落', ruins: '聚落',
  room: '室内', cave: '室内', scifi: '室内', dungeon: '室内', tavern: '室内', factory: '室内',
  bench: '特殊', surreal: '特殊', racetrack: '特殊', arena: '特殊', tabletop: '特殊', strategy: '特殊',
};
for (const s of SCENES) s.group ??= GROUP_OF[s.id] ?? '特殊';

export const SCENE_MAP = new Map(SCENES.map((s) => [s.id, s]));
export const sceneMeta = (id: string) => SCENE_MAP.get(id) ?? SCENES[0];
/** 场景的锁定镜头（3D 场景没有：null） */
export const rigOf = (id: string): SceneRig | null => SCENE_MAP.get(id)?.rig ?? null;
/** 这个环境的镜头是不是锁定的（2D 场景）：A 的 planEnv / D 的套用场景可以据此设 origin.rigLock */
export const isRigLocked = (id: string): boolean => !!rigOf(id)?.lockOrbit;
export const is2dScene = (id: string): boolean => SCENE_MAP.get(id)?.group === '2D';
/**
 * 立绘场景（背景是一张插画、前面站立绘，审查修复 1）：画面层里只有色板 / 时段 / 明暗色阶和后处理作用在插画上，
 * 形体、几何、材质、受光细节（圆润度、材料感、暗部深度、边缘光……）和景深 / 移轴看不出变化。界面可以据此把这些行标成「当前不生效」
 */
export const isImageScene = (id: string): boolean => rigOf(id) === RIG_FLAT;
/**
 * 立绘场景里不生效的画面参数前缀与原因（给 A / B 的「当前不生效」用）。
 * 整合修复 U#15 / U#16 后插画也吃手感材质（material.preset / bump / grain / detail：黏土、毛毡、纸、石、木的起伏）和描边（lines.outline / edges：插画上勾墨线），
 * 所以材质只列不生效的那几项；卡牌战的敌人也换成了立绘贴图，这张表对所有立绘场景都一样，不再有例外
 */
export const IMAGE_SCENE_INERT: { prefixes: string[]; reason: string } = {
  prefixes: ['shape.', 'geometry.', 'material.roughness', 'material.specular', 'material.metalness', 'material.variation', 'material.texture', 'material.texScale', 'material.texAmount', 'material.cun', 'material.weather', 'material.papercut', 'material.windowFlower',
    'shading.shadowDepth', 'shading.rim', 'shading.highlight', 'shading.wrap', 'shading.ambient', 'shading.hatch', 'lighting.shadow', 'world.'],
  reason: '立绘场景只吃色板、时段、质感、描边和后处理',
};
/** 一组里的场景（按登记顺序） */
export const scenesInGroup = (g: SceneGroup) => SCENES.filter((s) => s.group === g);

export function registerSceneMeta(m: SceneMeta) {
  m.group ??= GROUP_OF[m.id] ?? '特殊';
  const i = SCENES.findIndex((s) => s.id === m.id);
  if (i >= 0) SCENES[i] = m; else SCENES.push(m);
  SCENE_MAP.set(m.id, m);
}
