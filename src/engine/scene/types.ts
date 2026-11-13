import type { Role } from '../../content/roles';
import type { Values } from '../../dims/types';
import type { Rng } from '../../core/rng';
import type { TerrainResult } from './terrain';

/*
 * 场景描述：图元 + 角色 + 变换。几何表示（光滑/低模/体素）在构建时才决定，
 * 所以同一份描述可以在三种表示之间切换而布局不变。
 */

export type PrimType =
  | 'box'      // 单位立方体 [-0.5,0.5]^3，args[0] = 圆角比例 0~1
  | 'sphere'   // 单位球直径 1（缩放后是椭球）
  | 'cylinder' // 半径 0.5、高 1，args[0] = 顶部半径比例（0 即圆锥）
  | 'poly'     // 十二面体/二十面体近似球，args[0] = 0 二十面体 / 1 十二面体
  | 'wedge'    // 三角棱柱（人字屋顶）：截面在 XY，顶点在 y=0.5
  | 'pyramid'  // 四棱锥（攒尖顶）
  | 'torus'    // 圆环，args[0] = 管径比例，args[1] = 弧度（默认整圆）
  | 'roof';    // 曲面屋顶：底面 [-0.5,0.5]²，屋脊在 y=0.5；args = [类型 0 庑殿/1 悬山/2 攒尖/3 歇山, 凹曲度, 起翘]

export interface Item {
  prim: PrimType;
  args?: number[];
  pos: [number, number, number];
  rot?: [number, number, number];
  scale: [number, number, number];
  role: Role;
  /** 风摆权重 0~1 */
  sway?: number;
  /** 物体编号：同一物体的部件共用，用于边缘检测分界 */
  id?: number;
  /** 不参与描边 */
  noOutline?: boolean;
  /** 地面薄片（俯视瓦片的区域、底座）：不做手作歪斜（几何.顶点抖动会把很薄的片推到底座下面，露出三角形的缺口） */
  flat?: boolean;
}

/** 动态物体（角色、云）：单独成组，可以每帧移动 */
export interface DynamicGroup {
  kind: 'character' | 'cloud' | 'prop';
  items: Item[];
  origin: [number, number, number];
  data?: Record<string, number>;
  /**
   * 公告板（K 轨道，伪 3D 的精灵）：每帧绕竖轴转到正对镜头（Doom / OutRun 的路边树、敌人都是永远正对镜头的一张图）。
   * 图元按「正面朝 +z」摆，通常是 flatten 压扁的一片；只有一个朝向（不是 8 方向图）
   */
  billboard?: boolean;
  /**
   * 程序动画（K 轨道，按动画时间 stepTime 走，抽帧配方一样会顿）：v = 速度（世界单位 / 秒）；wrap = 沿某轴循环（位置折回 [lo, hi)，
   * 两份首尾相接的布景就是无限卷轴）；spin = 绕竖轴转速（弧度 / 秒）；bob = [振幅, 角频率] 的上下浮动；
   * follow = 跟着玩家走的比例 [x, y, z]（[1, 0, 1] = 远山 / 天边永远离玩家一样远：Mode 7 / OutRun 的地平线视差带，转向时它横着滑）；
   * beatSync = 速度 v 按 128 BPM 写、实际乘「motion.beat / 128」（节奏·音轨的音符与品格：配方改了节拍，音符跟着改速，和灯光的闪对得上；节拍关时照 128）
   */
  anim?: { v?: [number, number, number]; wrap?: { axis: 0 | 1 | 2; lo: number; hi: number }; spin?: number; bob?: [number, number]; follow?: [number, number, number]; beatSync?: boolean };
  /**
   * 自带身体（K 轨道：赛车、卡丁车、飞船、纸片人）：character 组不随 shape.character 重建，角色载体精灵不接管。
   * true = 也不做走路起伏 / 挤压（车、飞船）；'keepBob' = 照常起伏、挤压（纸片人走路一颠一颠的，H 轨道的请求）
   */
  fixedBody?: boolean | 'keepBob';
  /** 移动时不转身（K 轨道：竖版射击的自机按 W A S D 平移，机头一直朝上）；不给 = 照常转向移动方向 */
  strafe?: boolean;
}

/**
 * 场景自带的镜头（§5.2 / §9.1，F 轨道）。2D 场景用它锁定机位：引擎按这里摆镜头，配方带来的投影 / 俯角 / 方位 / 焦距不生效
 *（像素化、景深、黑边、畸变、取景大小仍跟随参数）。元数据同一份写在 content/sceneCatalog.ts 的 SceneMeta.rig（界面读它判断「镜头已锁定」）。
 */
export interface SceneRig {
  /** 投影：固定正交 / 透视；'values' = 跟参数 camera.projection（横版：两种都读得出是 2D；像素化 > 1 时强制正交 + 分层视差） */
  projection: 'ortho' | 'persp' | 'values';
  /** 俯角（度，0 = 平视） */
  pitch: number;
  /** 方位（度） */
  yaw: number;
  /** 透视焦距（mm，36mm 胶片口径）；正交分层视差也按它换算每层的缩放 */
  fovMm?: number;
  /** 画面高度装下多少世界单位（覆盖 SceneDesc.viewSize；camera.zoom 仍按比例缩放） */
  viewSize?: number;
  /** 锁定：不能转镜头（平移 / 滚轮另看 followAxis） */
  lockOrbit: boolean;
  /** 跟拍：'x' 只沿 x 跟（横版），'xz' 地面上跟（俯视）；不给 = 固定机位 */
  followAxis?: 'x' | 'xz';
  /** 注视点相对被跟的点的偏移（单位 = 画面高度）：[0, 0.17] 把地面放在下三分之一 */
  frameOffset?: [number, number];
  /** 可选的俯角：camera.angle 是这里的一个时用它（俯视瓦片：高俯角 50° / 正俯视 88°） */
  angles?: Record<string, number>;
  /** 默认注视点（不给 = 包围球中心） */
  target?: [number, number, number];
  /** 跟拍时注视点 x 的范围（关卡两端不露出空白） */
  xRange?: [number, number];
  /** 分层雾的深度跨度（世界单位，从注视平面往后）：横版的远景层按它一层层退进雾里 */
  fogSpan?: number;
  /**
   * 最小取景倍数（camera.zoom × 滚轮缩放的乘积不能低于它；不给 = 0.75）：立绘 / 牌桌 / 棋盘这类固定机位的布景只铺到 1 倍，拉远就露边（审查修复 5 / 18）
   */
  minZoom?: number;
  /**
   * 内容框（审查修复 2：画框比例不是 16:9 时，主体不出画）：w = 必须留在画面里的宽度（画面平面上的世界单位），
   * cx = 内容中心相对默认注视点的横向偏移（沿镜头右方向）。画框太窄（手机竖屏、4:3）时取景高度放大到装得下 w（contain），
   * 注视点在不让内容出画的范围里尽量靠近默认点。16:9 下内容框都在画面里，不起作用
   */
  fit?: { w: number; cx?: number };
  /**
   * 跟拍的地面范围 [x0, x1, z0, z1]（俯视跟拍，审查修复 4）：注视点夹在里面，让正交镜头看到的地面
   *（半宽 = 取景 × 宽高比 / 2，半深 = 取景 / (2 · sin 俯角)）不出这个范围；范围比画面还小时居中
   */
  bounds?: [number, number, number, number];
  /*
   * ---- 第一人称 / 追尾镜头（K 轨道，2026-10-23）：设了 chase 或 eye，镜头每帧按玩家的位置和朝向摆（透视），pitch / yaw / followAxis / fit 不用；
   * 拖动、滚轮、平移都不响应。pitch 仍要写一个近似值（界面写「实际是 …」、sceneRigValues 推 camera.angle 用）
   */
  /**
   * 追尾镜头（伪 3D 公路、Mode 7 赛场、第三人称）：镜头在玩家身后 back、离玩家脚底高 up，看向玩家前方 ahead、离地 look 高的点；
   * lag = 跟随的快慢（每秒，默认 6；越小镜头甩得越开）。camera.zoom 按比例拉近 / 推远（夹在 0.6–2 倍）
   */
  chase?: { back: number; up: number; ahead: number; look?: number; lag?: number };
  /** 第一人称（格子迷宫、Doom 类）：镜头在玩家眼睛高度 height，朝玩家朝向看，down = 向下低头的角度（度）；玩家模型不画 */
  eye?: { height: number; down?: number };
  /** 车 / 坦克式操作：W / S 沿朝向前进、后退，A / D 原地转向（不是按镜头方向走）；speed = motion.speed 的倍数，turn = 转向速度（弧度 / 秒，默认 1.8）；撞墙时贴着墙滑 */
  steer?: { speed?: number; turn?: number };
  /** 透视镜头的最小水平视角（度）：画框太窄（4:3、手机竖屏）时把垂直视角放大到装得下（透视版的 fit，最多放到 100°） */
  minHFov?: number;
  /** 雾的距离 [开始, 到顶]（世界单位，从镜头算起；按 atmosphere.fogDensity 缩放，浓度 0.5 时正好是这两个数）：长赛道、迷宫这类包围球很大或很小的场景用 */
  fogDist?: [number, number];
  /** 阴影只罩住注视点周围这个半径（世界单位）：几百米长的赛道整条罩进一张阴影贴图会糊成一片 */
  shadowFollow?: number;
}

/** 横版的一个深度带（§9.1）：同一深度的图元单独成一组，正交时按透视换算缩放 + 视差（每层单独对齐像素） */
export interface SceneLayer {
  /** 这一带的深度（z，0 = 角色所在的平面，负数在后，正数是前景） */
  z: number;
  items: Item[];
  name?: string;
}

/** 贴图四边形（立绘背景 §9.1）：正对 +z 的平面，写进场景的两张输出，所以后处理（媒介、描边、色板……）照样生效 */
export interface SceneImage {
  /** public/assets/tex 下的文件名 */
  file: string;
  /** 底边中点（anchor = 'bottom'）或中心（'center'） */
  pos: [number, number, number];
  /** 宽、高（世界单位） */
  size: [number, number];
  anchor?: 'bottom' | 'center';
  /** 受光 0~1（0 = 原画颜色） */
  lit?: number;
  /** 输出的颜色角色（描边分组、保留强调色用） */
  role?: Role;
  /** alpha 测试阈值（立绘抠图边缘） */
  cut?: number;
  flipX?: boolean;
  /** 只取图的一部分（uv，0~1，y 向下）：[x, y, w, h] */
  crop?: [number, number, number, number];
  /**
   * 铺满画面（立绘背景，审查修复 2）：引擎按当前画框比例与取景把它等比放大到盖住整个画面（以 pos 为中心，要配 anchor = 'center'），
   * 19.5:9、竖屏、4:3 都不再露出两边 / 上下的天色
   */
  cover?: boolean;
  /** 去品红溢色（抠图立绘的半透明边是品红底混出来的，审查修复 6）：边缘像素按 alpha 把品红底减掉 */
  despill?: boolean;
  /** 跟色板 / 时段 / 色阶走的程度（0 = 原画颜色；不给 = 0.7，审查修复 1） */
  recolor?: number;
  /** 绕 x / y / z 的旋转（弧度；牌桌上平躺的牌面用 [-π/2, 0, 0]） */
  rot?: [number, number, number];
  /** 半透明按抖动丢像素（接触阴影、地面带的软边；精灵材质不做混合） */
  dither?: boolean;
  /** 发光倍数（不给 = 1）：从背后打亮的贴图（皮影幕布、灯箱）> 1，颜色超出白点，开了辉光的配方会泛光（收尾 X） */
  glow?: number;
  /** 程序生成的贴图（不是 public/assets/tex 下的文件）：textures.ts 的 proceduralTexture 按 key 缓存 */
  canvas?: { key: string; w: number; h: number; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void };
}

/** 场景里的角色（RC8：敌人 / NPC / 拾取物 / Boss / 目标）：HUD 的头顶血条、伤害数字、名牌挂在它们身上 */
export type ActorKind = 'enemy' | 'boss' | 'npc' | 'pickup' | 'objective' | 'ally';
export interface SceneActor {
  kind: ActorKind;
  /** 脚底位置 */
  pos: [number, number, number];
  /** 身高（挂点在头顶 = pos.y + height） */
  height: number;
  label: string;
  /** 对应的图元编号（可选） */
  id?: number;
}

/** 棋盘格子（战棋，§9.1）：格 (i, j) 的中心 = origin + i·axes[0]·cell + j·axes[1]·cell；HUD 的移动范围按它对齐地面 */
export interface SceneGrid {
  origin: [number, number, number];
  cell: number;
  axes: [[number, number, number], [number, number, number]];
  size: [number, number];
}

/**
 * 场景自带的粒子发射器（K 轨道，engine/particles.ts 在 GPU 上算轨迹，不占 CPU）：
 *   ring = 一圈圈向外扩散的弹幕；spiral = 旋转的螺旋臂；fan = 朝 dir 方向张开的扇形连发；stream = 一串串直线射出（自机的子弹）；
 *   embers = 火把上往上飘的火星；sparkle = 原地闪烁的光点（宝物、音符击中）。
 * 弹幕类在 xz 平面里飞（俯视的竖版射击）；颜色取色板角色，换色板跟着变
 */
export interface SceneEmitter {
  kind: 'ring' | 'spiral' | 'fan' | 'stream' | 'embers' | 'sparkle';
  pos: [number, number, number];
  role: Role;
  /** 每圈 / 每串几颗 */
  count: number;
  /** 同时在场的圈数（每 period 秒发一圈；不给 = 6） */
  rings?: number;
  /** 飞行速度（世界单位 / 秒） */
  speed: number;
  /** 每隔几秒发一圈（不给 = 0.5） */
  period?: number;
  /** 螺旋：发射角每秒转多少弧度 */
  spin?: number;
  /** 扇形 / 直线的方向（xz 平面，弧度，0 = +z） */
  dir?: number;
  /** 扇形张角 / 直线的横向间距（弧度 / 世界单位） */
  spread?: number;
  /** 子弹直径（世界单位） */
  size: number;
  /** 飞多远消失（世界单位） */
  range: number;
  /** 跟着玩家走（自机的子弹从机头射出） */
  follow?: boolean;
  /** 形状：orb = 白芯彩边的圆弹，rice = 米粒弹（沿飞行方向拉长），star = 四角星 */
  shape?: 'orb' | 'rice' | 'star';
}

export interface PointLightDesc {
  pos: [number, number, number];
  color: string;
  range: number;
  intensity: number;
  /** 只在夜间亮 */
  night?: boolean;
}

export interface SceneDesc {
  items: Item[];
  dynamic: DynamicGroup[];
  terrain?: TerrainResult;
  water?: { level: number; shape: 'square' | 'circle'; size: number; center?: [number, number]; heightTexture?: import('three').DataTexture; heightHalf?: number };
  /** 没有地形时的地面：高度与可行走范围 */
  ground?: { heightAt: (x: number, z: number) => number; inside: (x: number, z: number) => boolean };
  lights: PointLightDesc[];
  /** 场景包围球（阴影相机、默认取景用） */
  bounds: { center: [number, number, number]; radius: number };
  /** 默认取景大小（世界单位） */
  viewSize: number;
  playerStart?: [number, number, number];
  /** 角色起始朝向（弧度，0 = 朝 +z；横版里朝右 = π/2） */
  playerFacing?: number;
  /** 没有可操控角色的场景（立绘、卡牌）里「玩家」的挂点（脚底）：HUD 挂在玩家身上的元素用它 */
  playerAnchor?: [number, number, number];
  /** 可操控角色的缩放（正俯视的竞技场里角色只剩一个点，放大才认得出，审查修复 12；不给 = 1） */
  playerScale?: number;
  /** 场景自带镜头（2D 场景锁定机位） */
  camera?: SceneRig;
  /** 横版深度带（单独成组，正交时做分层视差） */
  layers?: SceneLayer[];
  /** 贴图四边形（立绘背景、立绘角色） */
  images?: SceneImage[];
  /** 场景里的角色（HUD 世界挂点优先用它们） */
  actors?: SceneActor[];
  /** 棋盘格子（导出给 HUD） */
  grid?: SceneGrid;
  /** 粒子发射器（弹幕、火把火星、闪光；K 轨道，engine/particles.ts） */
  emitters?: SceneEmitter[];
  /** 小地图怎么烘：默认俯视（x / z）；侧视场景按 x / y 烘（solidAt = 这一格是不是实心） */
  map?: { plane: 'xy'; x: [number, number]; y: [number, number]; solidAt: (x: number, y: number) => boolean };
}

export interface BuildCtx {
  values: Values;
  seed: number;
  rng: Rng;
  nextId: () => number;
}
