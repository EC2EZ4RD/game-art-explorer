import type { SceneRig } from '../../engine/scene/types';
import type { SceneMeta } from '../sceneCatalog';
import { sceneRigValues } from '../sceneRig';

/*
 * 技术补全（2026-10-23）H·纸艺与剧场 轨道的场景登记：group = '2D'，带 rig（锁定镜头），recommended 用 sceneRigValues（../sceneRig.ts）。
 * 镜头常量写在这里（不从 sceneCatalog.ts 引：sceneCatalog 先引入本文件，反过来引会碰上还没初始化的常量）；构建器 engine/scene/scenes/paper.ts 也用这几份。
 */

/** 纸片剧场：低机位 12°（看得到纸片立在地上的支架和地上的影子），透视 35mm（参数选正交 / 像素化时正交），只沿 x 跟拍 */
export const RIG_PAPER: SceneRig = { projection: 'values', pitch: 12, yaw: 0, fovMm: 35, lockOrbit: true, followAxis: 'x', frameOffset: [0, 0.2], fogSpan: 30 };
/** 皮影戏台：正交平视、固定机位（整块幕布就是画面） */
export const RIG_PUPPET: SceneRig = { projection: 'ortho', pitch: 0, yaw: 0, lockOrbit: true, minZoom: 1 };
/**
 * 卷轴长街：正交平视、只沿 x 跟拍；构建器另外给镜头加斜投影（斜二测：纵深沿 45° 斜向上退、按一半缩短，没有近大远小），
 * 地面因此像界画一样「铺」进画面里
 */
export const RIG_SCROLL: SceneRig = { projection: 'ortho', pitch: 0, yaw: 0, lockOrbit: true, followAxis: 'x', frameOffset: [0, 0.26] };
/** 清版街巷：正交、俯角 16°，沿街跟拍（纵深是一条可以上下走的街道；跟拍只动 x）——像 16 位清版游戏那样没有近大远小 */
export const RIG_BRAWL: SceneRig = { projection: 'ortho', pitch: 16, yaw: 0, lockOrbit: true, followAxis: 'xz' };
/** 逆光剪影：平视 0°、透视 35mm（正交 / 像素化时正交 + 分层视差），只沿 x 跟拍 */
export const RIG_SILHOUETTE: SceneRig = { projection: 'values', pitch: 0, yaw: 0, fovMm: 35, lockOrbit: true, followAxis: 'x', frameOffset: [0, 0.24], fogSpan: 60 };
/** 舞台剧场：观众席上方一点的固定机位（俯角 10°）、透视 50mm（画面下沿露出前几排观众的椅背） */
export const RIG_STAGE: SceneRig = { projection: 'persp', pitch: 10, yaw: 0, fovMm: 50, lockOrbit: true, minZoom: 1 };

export const PAPER_SCENES: SceneMeta[] = [
  {
    id: 'paper-theater', name: '纸片·剧场', category: '纸艺与剧场', group: '2D', rig: RIG_PAPER,
    checks: '纸片分层、互相投影、纸片人翻面',
    desc: '一层层有厚度的纸片布景（灌木、纸房子、山丘、远山、挂在线上的云和太阳）按前后错开立在纸板台上，互相投下影子；主角是双面纸片人，转身时翻面。',
    features: { character: true, vegetation: true, architecture: true, clouds: true },
    recommended: sceneRigValues(RIG_PAPER, { 'camera.angle': 'low', 'atmosphere.fog': 'none', 'lighting.time': 15.5, 'lighting.azimuth': 20 }),
  },
  {
    id: 'shadow-puppet', name: '皮影·戏台', category: '纸艺与剧场', group: '2D', rig: RIG_PUPPET,
    checks: '背光透射、镂空剪影、关节分件',
    desc: '木戏台框（红柱、帷幔、歇山顶）围着一块从背后打亮的幕布；亭子、松、山石、如意云是半透明的彩色皮子，影人分件、关节铆钉、镂空透光，签子是幕布上的细线。',
    features: { character: true, architecture: true, indoor: true },
    recommended: sceneRigValues(RIG_PUPPET, { 'atmosphere.fog': 'none', 'lighting.time': 15, 'lighting.azimuth': 20, 'lighting.shadows': 'none' }),
  },
  {
    id: 'scroll-street', name: '卷轴·长街', category: '纸艺与剧场', group: '2D', rig: RIG_SCROLL,
    checks: '斜投影界画、长卷平远、散点构图',
    desc: '清明上河图式的长卷：镜头是斜二测投影（纵深沿 45° 斜着退去、不缩小，没有灭点），临河长街的铺面、虹桥、漕船、柳树和成群的小人一路排开，后面的田野与远山退进绢色的雾里。',
    features: { character: true, architecture: true, vegetation: true, water: true },
    recommended: sceneRigValues(RIG_SCROLL, { 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.5, 'atmosphere.sky': 'paper', 'lighting.time': 14, 'lighting.azimuth': 30 }),
  },
  {
    id: 'beatemup-street', name: '清版·街巷', category: '纸艺与剧场', group: '2D', rig: RIG_BRAWL,
    checks: '纵深走位、霓虹夜街、敌我辨识',
    desc: '夜里的城市街巷，俯角 20° 的清版视角：街有纵深，可以上下走位；身后一排门脸、卷帘门上的涂鸦和霓虹招牌，前景路灯和消防栓；可以打破的油桶木箱、一个个混混，街尾是帮派老大。',
    features: { character: true, architecture: true },
    recommended: sceneRigValues(RIG_BRAWL, { 'camera.angle': 'low', 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.35, 'lighting.time': 21.5, 'lighting.lanterns': 1.6 }),
  },
  {
    id: 'silhouette-forest', name: '剪影·逆光', category: '纸艺与剧场', group: '2D', rig: RIG_SILHOUETTE,
    checks: '逆光剪影、明度分层、光束',
    desc: '太阳压在画面正后方的逆光森林：地面、树干、藤、捕兽夹和大蜘蛛都是墨色剪影，几乎纯黑；中景远景一层层退进发亮的雾里，只剩明度差，光束从树干间漏下来，萤火虫在飞。',
    features: { character: true, vegetation: true },
    // 太阳方位 141.5° + 时段 17.6 → 实际方位 180°（正后方、贴着地平线），逆光；体积光把光束打出来
    recommended: sceneRigValues(RIG_SILHOUETTE, { 'atmosphere.fog': 'layers', 'atmosphere.fogDensity': 0.62, 'lighting.time': 17.6, 'lighting.azimuth': 141.5, 'lighting.godrays': 0.55 }),
  },
  {
    id: 'stage-theater', name: '舞台·剧场', category: '纸艺与剧场', group: '2D', rig: RIG_STAGE,
    checks: '舞台布光、台口构图、景片层次',
    desc: '从观众席略高处看镜框式舞台：金色台口、收在两边的红丝绒大幕和垂花檐幕，三对手绘树景片一层层往里，最里面一幅黄昏城堡的画景；台唇一排脚灯从下往上打亮台上的人，下沿是前几排观众的剪影。',
    features: { character: true, architecture: true, indoor: true },
    // 夜里：太阳暗下去，台上只剩脚灯和吊灯（舞台式布光）；再加三束舞台聚光（收尾 X：只有脚灯时台上的人和道具读不出来），四周压暗一半
    recommended: sceneRigValues(RIG_STAGE, { 'camera.angle': 'low', 'atmosphere.fog': 'none', 'lighting.time': 21, 'lighting.shadows': 'pcf', 'lighting.stage': 'spots3', 'lighting.stageDark': 0.5 }),
  },
];
