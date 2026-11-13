import type { SceneRig } from '../../engine/scene/types';
import type { SceneMeta } from '../sceneCatalog';
import { sceneRigValues } from '../sceneRig';

/*
 * 技术补全（2026-10-23）G·等距与 2.5D 轨道的场景登记：group = '2D'，带 rig（锁定镜头），recommended 用 sceneRigValues（../sceneRig.ts）。
 * 构建器在 engine/scene/scenes/iso.ts（同一份 rig 写进 SceneDesc.camera，外加取景大小与注视点）。
 */

/** 等距·小城：正交 2:1 二等角（俯角 30°、方位 45°），固定机位；整块悬空底座装进画面，取景不小于 1 倍 */
export const RIG_ISO_CITY: SceneRig = { projection: 'ortho', pitch: 30, yaw: 45, lockOrbit: true, minZoom: 1 };

/** 等距·地牢：正交、俯角 38°、方位 45°，地面上跟拍（Hades 的机位：比 2:1 略高，后墙看得到墙面，前墙切低） */
export const RIG_ISO_DUNGEON: SceneRig = { projection: 'ortho', pitch: 38, yaw: 45, lockOrbit: true, followAxis: 'xz' };

/** HD-2D·小镇：透视 50mm、俯角 28°、方位 0，沿街跟拍（八方旅人的机位：长焦、略俯，配移轴像在看微缩模型） */
export const RIG_HD2D: SceneRig = { projection: 'persp', pitch: 28, yaw: 0, fovMm: 50, lockOrbit: true, followAxis: 'xz' };

/** 斜俯视·村落：正交、俯角 60°、方位 0（3/4 俯视：房子和崖壁的正面朝镜头，竖线保持竖直），地面上跟拍、夹在地图里 */
export const RIG_OBLIQUE: SceneRig = { projection: 'ortho', pitch: 60, yaw: 0, lockOrbit: true, followAxis: 'xz' };

/** 等距·错觉塔：真等距（俯角 35.264° = atan(1/√2)、方位 45°）正交、固定机位——只有这个机位下错觉才成立 */
export const RIG_ILLUSION: SceneRig = { projection: 'ortho', pitch: 35.264, yaw: 45, lockOrbit: true, minZoom: 1 };

/** 等距·剖面屋：正交、俯角 45°、方位 45°，固定机位（模拟人生的建造视角；高俯角才看得进去掉屋顶的房间） */
export const RIG_CUTAWAY: SceneRig = { projection: 'ortho', pitch: 45, yaw: 45, lockOrbit: true, minZoom: 1 };

export const ISO_SCENES: SceneMeta[] = [
  {
    id: 'iso-city', name: '等距·小城', category: '等距 2.5D', group: '2D', rig: RIG_ISO_CITY,
    checks: '2:1 等距读形、街区秩序、悬空剖面',
    desc: '悬空的方形地块（侧面看得到草皮、土层和岩层）：路网、住宅、商店、写字楼、公园、运河和桥，路上有车有人，一栋房子着了火、一块工地等着建（模拟城市 / Townscaper 一类）；正交 2:1 二等角、固定机位，像素化也好看。',
    features: { character: true, architecture: true, vegetation: true, water: true, clouds: true },
    recommended: sceneRigValues(RIG_ISO_CITY, { 'atmosphere.fog': 'none', 'camera.mode': 'orbit' }),
  },
  {
    id: 'iso-dungeon', name: '等距·地牢', category: '等距 2.5D', group: '2D', rig: RIG_ISO_DUNGEON,
    checks: '高后墙与切低的前墙、火光引导、敌我与陷阱辨识',
    desc: '悬在黑暗里的三间石室，用一座窄桥和一段走廊连起来：后墙高、有壁柱、壁龛和垂旗，前墙切成矮墙看得见室内；石柱、火盆、尖刺陷阱、游魂和精英守卫、宝箱、通往下一间的发光门（Hades / Diablo 一类）；正交 38° 俯角、方位 45°，镜头跟着角色走。',
    features: { character: true, indoor: true, architecture: true },
    recommended: sceneRigValues(RIG_ISO_DUNGEON, { 'atmosphere.fog': 'none', 'lighting.time': 22.5, 'lighting.lanterns': 1.8, 'shading.ambient': 0.35 }),
  },
  {
    id: 'hd2d-town', name: 'HD-2D·小镇', category: '等距 2.5D', group: '2D', rig: RIG_HD2D,
    checks: '像素人物与立体布景的融合、移轴微缩感、暖灯',
    desc: '傍晚的卵石街：一排木筋墙房子（出挑的二层、陡屋顶、花箱、店招）、小广场的水井和集市摊、钟楼，房后是树林和山上的城堡；街上的人都是像素小人，玩家是像素精灵（八方旅人 / 三角战略一类）；透视长焦、俯角 28°，沿街跟拍，推荐移轴 + 辉光 + 暖灯。',
    features: { character: true, architecture: true, vegetation: true },
    recommended: sceneRigValues(RIG_HD2D, {
      'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.25, 'lighting.time': 16.9, 'lighting.lanterns': 1.6,
      'camera.tiltShift': 0.6, 'camera.bloom': 0.45, 'shape.carrier': 'pixelB', 'shape.spriteLit': 0.7,
    }),
  },
  {
    id: 'oblique-village', name: '斜俯视·村落', category: '等距 2.5D', group: '2D', rig: RIG_OBLIQUE,
    checks: '3/4 俯视的正面读形、崖壁层次、可砍的灌木与可走的路',
    desc: '俯视偏斜的村子：北边一层台地、西北再高一层，崖壁有地层线和草沿，石阶切进崖里；屋顶显眼的村舍、土路、灌木、陶罐、高草和花，一条河上架着木桥；巡逻兵、河边的章鱼怪、绿宝石和高台上的大宝箱（塞尔达 众神的三角力量 / Eastward 一类）；正交 60° 俯角、方位 0，镜头跟着角色走。',
    features: { character: true, architecture: true, vegetation: true, water: true },
    recommended: sceneRigValues(RIG_OBLIQUE, { 'atmosphere.fog': 'none', 'lighting.time': 13.5 }),
  },
  {
    id: 'iso-illusion', name: '等距·错觉塔', category: '等距 2.5D', group: '2D', rig: RIG_ILLUSION,
    checks: '视点相关的错觉连接、粉彩几何、真等距读形',
    desc: '浮在空中的粉彩石台：矮平台伸出的走道在画面上平平地接到一座高塔的塔顶（其实远近高低都差 4 米），旁边一圈彭罗斯楼梯每级都往上、绕一圈又回到起点；拱廊、水池、图腾和乌鸦人（纪念碑谷 / 埃舍尔一类）。真等距正交、固定机位：只有这个角度错觉才成立。',
    features: { character: true, architecture: true, water: true },
    recommended: sceneRigValues(RIG_ILLUSION, { 'atmosphere.fog': 'none', 'lighting.shadows': 'none', 'camera.mode': 'orbit' }),
  },
  {
    id: 'iso-cutaway', name: '等距·剖面屋', category: '等距 2.5D', group: '2D', rig: RIG_CUTAWAY,
    checks: '去掉屋顶的剖面、家具尺度、房间分区',
    desc: '去掉屋顶的一栋平房：远处两面外墙整面高（墙纸、窗、挂画），近处外墙和内墙都切到齐膝，客厅、厨房、卧室、浴室、书房一眼看全；屋外草坪、车道、泳池、篱笆和信箱（模拟人生的墙面降下 / 大和绘的吹抜屋台）。正交 45° 俯角、方位 45°，固定机位。',
    features: { character: true, indoor: true, architecture: true, vegetation: true, water: true },
    recommended: sceneRigValues(RIG_CUTAWAY, { 'atmosphere.fog': 'none', 'lighting.time': 14, 'camera.mode': 'orbit' }),
  },
];
