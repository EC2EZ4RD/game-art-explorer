import { num, str } from '../dims/registry';
import type { Values } from '../dims/types';

/*
 * "感觉"入口：不需要术语，先变化，再告诉你改了什么、叫什么。
 */

export interface Nudge {
  id: string;
  label: string;
  hint: string;
  apply: (v: Values) => Values;
  terms: string[];
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const NUDGES: Nudge[] = [
  {
    id: 'crisp', label: '明暗更干脆', hint: '亮面暗面分成干净的色块',
    apply: (v) => ({ 'shading.model': 'cel', 'shading.steps': Math.max(2, num(v, 'shading.steps') - (str(v, 'shading.model') === 'cel' ? 1 : 0)), 'shading.softness': 0.01, 'shading.quantizeShadow': true, 'lighting.shadows': 'cel' }),
    terms: ['赛璐璐 / 卡通分阶（Cel shading）', '色阶数', '阴影阈值化'],
  },
  {
    id: 'soft', label: '明暗更柔和', hint: '暗部被抬亮，过渡平滑',
    apply: () => ({ 'shading.model': 'halfLambert', 'shading.wrap': 0.6, 'lighting.shadows': 'pcf', 'lighting.shadowSoft': 4 }),
    terms: ['半兰伯特 / 包裹光（Wrap lighting）', 'PCF 软阴影'],
  },
  {
    id: 'rounder', label: '物体更圆润', hint: '圆角、球形树冠、光滑曲面',
    apply: (v) => ({ 'shape.roundness': clamp(num(v, 'shape.roundness') + 0.3, 0, 1), 'geometry.representation': 'smooth', 'shape.canopy': 'single' }),
    terms: ['形状语言（Shape language）', '平滑着色'],
  },
  {
    id: 'sharper', label: '物体更硬朗', hint: '方正、折面、棱角',
    apply: (v) => ({ 'shape.roundness': clamp(num(v, 'shape.roundness') - 0.35, 0, 1), 'geometry.representation': 'faceted', 'shape.canopy': 'poly' }),
    terms: ['低多边形（Low poly）', '面着色（Flat shading）'],
  },
  {
    id: 'miniature', label: '更像小模型', hint: '高俯角、移轴虚化、塑料质感、饱和一点',
    apply: (v) => ({ 'camera.angle': 'high', 'camera.tiltShift': 0.6, 'material.preset': 'plastic', 'color.saturation': clamp(num(v, 'color.saturation') + 0.15, 0, 2), 'world.base': 'plinth', 'world.island': 'none' }),
    terms: ['移轴（Tilt-shift）', '微缩布景（Diorama）', '塑料高光'],
  },
  {
    id: 'paper', label: '表面更像纸', hint: '纸纹、纸色、纸的纤维',
    apply: () => ({ 'surface.paper': 0.6, 'surface.paperColor': 0.3, 'material.preset': 'paper', 'material.grain': 0.5 }),
    terms: ['纸纹（屏幕空间）', '三平面纹理（物体空间）', '浴帘效应'],
  },
  {
    id: 'handdrawn', label: '更有手绘感', hint: '线条抖动歪斜、纸纹、少一点完美',
    apply: (v) => ({ 'lines.edges': str(v, 'lines.edges') === 'none' ? 'depthNormal' : str(v, 'lines.edges'), 'lines.boil': 0.35, 'lines.wobble': 0.45, 'surface.paper': 0.35, 'geometry.vertexJitter': 0.12, 'motion.frameRate': '12' }),
    terms: ['沸腾线（Line boil）', '一拍二（On twos）', '顶点抖动'],
  },
  {
    id: 'muted', label: '颜色更克制', hint: '降低饱和、换成大地色',
    apply: (v) => ({ 'color.saturation': clamp(num(v, 'color.saturation') - 0.35, 0, 2), 'color.palette': 'earthy' }),
    terms: ['饱和度', '有限色板'],
  },
  {
    id: 'vivid', label: '颜色更鲜艳', hint: '高饱和纯色',
    apply: (v) => ({ 'color.saturation': clamp(num(v, 'color.saturation') + 0.3, 0, 2), 'color.palette': 'inspiration', 'color.tonemap': 'none' }),
    terms: ['饱和度', '色调映射会让纯色发灰'],
  },
  {
    id: 'hero', label: '主角更醒目', hint: '只描主体、边缘光、背景安静',
    apply: (v) => ({ 'lines.outline': true, 'lines.outlineScope': 'characters', 'shading.rim': 0.6, 'color.saturation': clamp(num(v, 'color.saturation') - 0.1, 0, 2), 'atmosphere.fogDensity': clamp(num(v, 'atmosphere.fogDensity') + 0.15, 0, 1) }),
    terms: ['图底关系', '边缘光（Rim light）', '描边范围'],
  },
  {
    id: 'retro', label: '更复古', hint: '低分辨率、限色、抖色',
    apply: () => ({ 'camera.pixelSize': 4, 'color.quantize': 'palette', 'color.palette': 'pico8', 'color.dither': 'bayer4', 'camera.pixelSnap': true }),
    terms: ['像素化', '色板量化', 'Bayer 抖色'],
  },
  {
    id: 'calm', label: '更安静', hint: '风停、雾起、黄昏、慢',
    apply: (v) => ({ 'atmosphere.wind': 0.08, 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': clamp(num(v, 'atmosphere.fogDensity') + 0.2, 0, 1), 'lighting.time': 17.5, 'color.saturation': clamp(num(v, 'color.saturation') - 0.12, 0, 2), 'motion.speed': 2.5 }),
    terms: ['空气透视', '色温', '节奏'],
  },
  {
    id: 'depth', label: '空间更深', hint: '透视、低机位、雾分层',
    apply: () => ({ 'camera.projection': 'persp', 'camera.fov': 28, 'camera.angle': 'low', 'atmosphere.fog': 'distance', 'atmosphere.fogDensity': 0.55 }),
    terms: ['透视投影', '广角', '空气透视'],
  },
  {
    id: 'thinLines', label: '线条更细', hint: '更精致',
    apply: (v) => ({ 'lines.outlineWidth': clamp(num(v, 'lines.outlineWidth') * 0.6, 0.5, 8), 'lines.edgeWidth': clamp(num(v, 'lines.edgeWidth') * 0.7, 0.5, 4) }),
    terms: ['线宽'],
  },
  {
    id: 'thickLines', label: '线条更粗', hint: '更像贴纸/漫画',
    apply: (v) => ({ 'lines.outline': true, 'lines.outlineWidth': clamp(num(v, 'lines.outlineWidth') * 1.6, 0.5, 8) }),
    terms: ['线宽', '反向外壳描边'],
  },
  {
    id: 'blocky', label: '变成方块', hint: '体素，方块内角压暗',
    apply: () => ({ 'geometry.representation': 'voxel', 'geometry.voxelAO': 0.8 }),
    terms: ['体素（Voxel）', '体素 AO'],
  },
  /* 技术补全 Z1（2026-10-23）：用上第一批新技术的几个一键微调 */
  {
    id: 'skylight', label: '暗部透天光', hint: '阴影里不再只是一种灰，被整片天空照亮，墙根有接触暗角',
    apply: () => ({ 'lighting.envLight': 0.8 }),
    terms: ['天空环境光（全局光照近似）', '球谐辐照度', '接触暗角'],
  },
  {
    id: 'wet', label: '地面湿漉漉', hint: '积水倒映灯光和天空',
    apply: () => ({ 'lighting.wetReflect': 0.75, 'lighting.wetCover': 0.55 }),
    terms: ['屏幕空间反射（SSR）', '菲涅耳'],
  },
  {
    id: 'airy', label: '空气里有光', hint: '体积雾里透出光柱、灯笼周围有光晕',
    apply: () => ({ 'atmosphere.volumetric': 0.5 }),
    terms: ['体积雾（Volumetric fog）', '光柱 / 上帝光', '前向散射'],
  },
  {
    id: 'brushLine', label: '线条有提按', hint: '外轮廓重、内部线轻，近粗远细',
    apply: (v) => ({ 'lines.edges': str(v, 'lines.edges') === 'none' ? 'depthNormal' : str(v, 'lines.edges'), 'lines.weightStyle': 'pressure', 'lines.weightVar': 0.6 }),
    terms: ['线的提按（Line weight）', '手绘压力'],
  },
  {
    id: 'spotlight', label: '像在舞台上', hint: '四周压暗，一束追光跟着主角',
    apply: () => ({ 'lighting.stage': 'single', 'lighting.stageDark': 0.85 }),
    terms: ['舞台追光（Spotlight）', '明暗对比'],
  },
];
