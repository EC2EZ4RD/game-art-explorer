import type { SceneRig } from '../../engine/scene/types';
import type { SceneMeta } from '../sceneCatalog';
import { sceneRigValues } from '../sceneRig';

/*
 * 技术补全（2026-10-23）K·伪3D与复古镜头 轨道的场景登记：group = '2D'，带 rig（锁定镜头），recommended 用 sceneRigValues（../sceneRig.ts）。
 * 构建器在 engine/scene/scenes/retro.ts（同一份 rig 写进 SceneDesc.camera，外加取景、注视点）。
 * 新的镜头字段（SceneRig.chase / eye / steer / minHFov / fogDist / shadowFollow）见 engine/scene/types.ts。
 */

/** 伪 3D·公路：追尾镜头（车后 8.6、高 2.9，看向车前 14 米）、22mm 广角，A / D 转向、W / S 油门；竖屏时水平视角至少 60° */
export const RIG_ROAD: SceneRig = {
  projection: 'persp', pitch: 12, yaw: 180, fovMm: 22, lockOrbit: true,
  chase: { back: 9, up: 4.2, ahead: 16, look: 0.6, lag: 5 }, steer: { speed: 6, turn: 0.9 }, minHFov: 62, fogDist: [220, 900], shadowFollow: 40,
};

export const RETRO_SCENES: SceneMeta[] = [
  {
    id: 'road-pseudo3d', name: '伪3D·公路', category: '伪 3D', group: '2D', rig: RIG_ROAD,
    checks: '条纹路面的速度感、弯道与坡顶、路边精灵的远近缩放',
    desc: '海边公路（OutRun / Super Hang-On 一类）：红白路肩、车道虚线、一深一浅的草地横带一路排到天边，路往右弯、翻过坡顶；路边的棕榈、弯道箭头牌、广告牌永远正对镜头，前面几辆对手车；左边是海和落日，右边远山。镜头低低地跟在红色敞篷跑车后面，W 油门、A / D 转向。',
    features: { character: true, vegetation: true, clouds: true, water: true },
    recommended: sceneRigValues(RIG_ROAD, { 'camera.angle': 'low', 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.45, 'lighting.time': 16.3 }),
  },
];

/** Mode7·赛场：追尾镜头（车后 7、高 3.6，看向前方 12 米）、低头看平地；推荐像素化 3 倍、不加雾 */
export const RIG_MODE7: SceneRig = {
  projection: 'persp', pitch: 15, yaw: 180, fovMm: 22, lockOrbit: true,
  chase: { back: 7.5, up: 4.2, ahead: 12, look: 0, lag: 5 }, steer: { speed: 4.5, turn: 1.6 }, minHFov: 60, fogDist: [420, 1300], shadowFollow: 30,
};

RETRO_SCENES.push({
  id: 'mode7-track', name: 'Mode7·赛场', category: '伪 3D', group: '2D', rig: RIG_MODE7,
  checks: '平铺地面的缩放旋转、远处的锯齿闪烁、地平线视差带',
  desc: '一整张平的赛场（超级马力欧赛车 / F-Zero 一类）：灰色赛道一圈、红白路肩、终点格子线、加速箭头、一排道具箱和金币，场外是深浅相间的方格草地和一汪湖；对手卡丁车是正对镜头的精灵，地平线上一圈小山和城堡跟着转向横着滑。镜头在卡丁车后上方，W 油门、A / D 转向；推荐像素化 3 倍。',
  features: { character: true, water: true, vegetation: true, clouds: true },
  recommended: sceneRigValues(RIG_MODE7, { 'camera.angle': 'low', 'atmosphere.fog': 'none', 'camera.pixelSize': 3, 'lighting.time': 13 }),
});

/** 第一人称·迷宫：眼睛高 1.65、略低头，28mm（16:9 下水平约 74°，德军总部的视野）；W / S 前后走、A / D 原地转身；竖屏时水平视角至少 70°；不加雾（雾色是天边色，地牢里会发白），远处靠火把照不到自己暗下去 */
export const RIG_MAZE: SceneRig = {
  projection: 'persp', pitch: 0, yaw: 180, fovMm: 28, lockOrbit: true,
  eye: { height: 1.65, down: 3 }, steer: { speed: 0.8, turn: 1.7 }, minHFov: 72, fogDist: [7, 30],
};

RETRO_SCENES.push({
  id: 'fp-maze', name: '第一人称·迷宫', category: '伪 3D', group: '2D', rig: RIG_MAZE,
  checks: '格子走廊的纵深、火光明暗、公告板敌人与道具',
  desc: '3 米一格的石砌地牢（德军总部 3D / 魔眼杀机 / Grimrock 一类）：错缝石块墙、方石板地、木梁天花板，走廊两侧火把；中段两级台阶上去、天花板升高（扇区式的高低变化），尽头一扇铁箍木门。骷髅兵、史莱姆、药水、钥匙、金币都是正对镜头的精灵。第一人称，W / S 前后走、A / D 转身。',
  features: { character: true, indoor: true, architecture: true },
  recommended: sceneRigValues(RIG_MAZE, { 'camera.angle': 'side', 'atmosphere.fog': 'none', 'lighting.time': 22, 'lighting.lanterns': 1.6, 'shading.ambient': 0.2 }),
});

/** 竖版·弹幕：正交正俯视（88°）、固定机位；游戏区 11 × 14 居中，竖屏时取景放大到装得下游戏区的宽 */
export const RIG_SHMUP: SceneRig = { projection: 'ortho', pitch: 88, yaw: 0, lockOrbit: true, minZoom: 1 };

RETRO_SCENES.push({
  id: 'shmup-vertical', name: '竖版·弹幕', category: '竖版与节奏', group: '2D', rig: RIG_SHMUP,
  checks: '弹幕读形、自机与敌弹的区分、卷轴视差',
  desc: '竖长的游戏区（东方 / 雷电 / 斑鸠一类）居中，两边是深色的界面侧板；脚下的海、岛屿和云按三种速度往下卷。自机在下方，上面一个 V 字敌机编队和中头目：螺旋弹、环形弹、朝自机的扇形米粒弹，自机往上连射。W A S D 在游戏区里平移。',
  features: { character: true, water: true, vegetation: true, clouds: true },
  recommended: sceneRigValues(RIG_SHMUP, { 'atmosphere.fog': 'none', 'lighting.time': 13.5, 'camera.mode': 'orbit' }),
});

/** 节奏·音轨：透视 24mm、低头约 20°、固定机位（判定线在下、音轨收向远处的消失点）；竖屏时退远到装得下音轨 */
export const RIG_RHYTHM: SceneRig = { projection: 'persp', pitch: 20.5, yaw: 0, fovMm: 24, lockOrbit: true, minZoom: 1 };

RETRO_SCENES.push({
  id: 'rhythm-lanes', name: '节奏·音轨', category: '竖版与节奏', group: '2D', rig: RIG_RHYTHM,
  checks: '音轨透视、音符读色、判定线与节拍',
  desc: '一条往远处收拢的五轨音轨（吉他英雄 / DJMAX / osu!mania 一类）：判定线上五个彩色判定圈，彩色宝石音符和每拍一条的品格往判定线流，两边一排排光柱，尽头是舞台和乐手剪影，两侧观众跟着起伏。推荐带 128 BPM 的节拍：灯和发光体踩着拍子闪。',
  features: { character: false },
  recommended: sceneRigValues(RIG_RHYTHM, { 'atmosphere.fog': 'none', 'lighting.time': 21, 'motion.beat': 128 }),
});
