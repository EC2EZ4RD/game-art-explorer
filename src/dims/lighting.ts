import { shadingNot } from './conditions';
import { bool, is, registerParams } from './registry';
import type { ParamDef } from './types';

const lit = shadingNot('unlit', 'matcap');

const defs: ParamDef[] = [
  {
    id: 'lighting.time', dim: 'lighting', group: '时段', label: '时间', kind: 'range', min: 0, max: 24, step: 0.05, default: 15.5, unit: '时', rebuild: 'uniform',
    explain: {
      plain: '太阳的位置。早晚阳光低、影子长，正午影子短。',
      ends: ['深夜', '正午 → 深夜'],
      lookAt: '影子长度与方向、天色、暗部颜色',
    },
    prompt: (v) => {
      const t = Number(v);
      if (t < 5 || t > 20.5) return '月夜';
      if (t < 7.5) return '清晨低角度阳光，长影';
      if (t < 10.5) return '上午明亮阳光';
      if (t < 14.5) return '正午顶光，影子短';
      if (t < 17.5) return '午后斜阳，影子拉长';
      return '黄昏暖色低光，长影';
    },
    port: { godot: 'DirectionalLight3D 旋转 + WorldEnvironment 天空/雾/环境光随时间插值', godotLevel: 'script' },
  },
  {
    id: 'lighting.cycle', dim: 'lighting', group: '时段', label: '自动昼夜', kind: 'toggle', default: false, rebuild: 'uniform',
    explain: { plain: '时间自动流转，观察阳光变化时沙盘阴影的切面。' },
    prompt: (v) => (v ? '提供自动昼夜流转' : null),
  },
  {
    id: 'lighting.cycleSpeed', dim: 'lighting', group: '时段', label: '昼夜速度', kind: 'range', min: 0.1, max: 4, step: 0.1, default: 1, unit: '时/秒', rebuild: 'none',
    activeWhen: (s) => (bool(s, 'lighting.cycle') ? true : '需要先打开自动昼夜'),
    explain: { plain: '每秒流逝几个小时。' },
  },
  {
    id: 'lighting.timeLink', dim: 'lighting', group: '时段', label: '昼夜联动', kind: 'choice', default: 'full', rebuild: 'uniform',
    options: [
      { value: 'full', label: '全联动', desc: '色温、天色、雾色、环境光一起随时间变化' },
      { value: 'intensity', label: '只改光强', desc: '只调亮度——夜晚会整体发灰' },
    ],
    explain: { plain: '昼夜变化时改哪些东西。', pitfalls: ['只降低光强，夜晚画面会整体发灰；色温、天色、雾色要一起插值'] },
  },
  {
    id: 'lighting.azimuth', dim: 'lighting', group: '太阳', label: '太阳方位', kind: 'range', min: 0, max: 360, step: 1, default: 210, unit: '°', rebuild: 'uniform',
    explain: { plain: '阳光从哪个方向来。逆光让轮廓发亮，侧光体积感最强。' },
  },
  {
    id: 'lighting.sun', dim: 'lighting', group: '太阳', label: '阳光强度', kind: 'range', min: 0, max: 2.5, step: 0.01, default: 1.1, rebuild: 'uniform',
    activeWhen: lit,
    explain: { plain: '主光有多亮。' },
  },
  {
    id: 'lighting.shadows', dim: 'lighting', group: '阴影', label: '投影类型', kind: 'choice', default: 'hard', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无投影', desc: '物体不投影，容易"飘"' },
      { value: 'hard', label: '硬阴影', desc: '单次采样，边缘锐利（BasicShadowMap 的效果）', techPrompt: 'shadowMap.type = BasicShadowMap，提高 mapSize 抑制锯齿' },
      { value: 'pcf', label: 'PCF 软阴影', desc: '多次采样平均，边缘柔和（r182+ 的 PCFShadowMap 就是这样）', techPrompt: 'shadowMap.type = PCFShadowMap（r182 起默认软边）', pitfalls: ['PCFShadowMap 不等于硬阴影'] },
      { value: 'cel', label: '色阶化投影', desc: '先软采样再阈值化，像动画里的硬边投影', techPrompt: '自定义光照里对阴影因子做 smoothstep 阈值化' },
      { value: 'blob', label: '只有脚下圆影', desc: '角色脚下一团圆影，便于判断落点' },
    ],
    activeWhen: lit,
    explain: {
      plain: '物体投下的影子。投影是"接触关系"的主要来源，决定物体是站在地上还是飘着。',
      lookAt: '角色脚下、树下、影子边缘',
      pitfalls: ['three.js r182 起 PCFShadowMap 已经是软阴影，灵感提示词里"PCFShadowMap 硬阴影"的说法不成立', '要硬阴影就用 BasicShadowMap，或在着色器里阈值化阴影因子'],
      term: { zh: '阴影贴图', en: 'Shadow map' },
    },
    prompt: (v) => ({ none: '物体不投影', hard: '阴影边缘清晰锐利，接触关系明确', pcf: '阴影边缘柔和', cel: '投影和明暗色阶一样是硬边色块', blob: '角色脚下有圆形落地影' } as Record<string, string>)[String(v)],
    port: { godot: 'DirectionalLight3D.shadow_enabled；软硬由 shadow_blur 与 Project Settings 的 soft_shadow_filter_quality 决定；色阶化需在 light() 里处理 ATTENUATION', godotLevel: 'builtin' },
  },
  {
    id: 'lighting.shadowSoft', dim: 'lighting', group: '阴影', label: '阴影柔化半径', kind: 'range', min: 0.5, max: 6, step: 0.1, default: 2, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'lighting.shadows', 'pcf', 'cel') ? true : '只在 PCF 软阴影或色阶化投影下生效'),
    explain: { plain: '软阴影的模糊范围。' },
  },
  {
    id: 'lighting.shadowStrength', dim: 'lighting', group: '阴影', label: '阴影浓度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.85, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'lighting.shadows', 'none') ? '没有投影' : true),
    explain: { plain: '影子有多深。', pitfalls: ['阴影太黑会把细节吃掉'] },
  },
  {
    id: 'lighting.shadowRes', dim: 'lighting', group: '阴影', label: '阴影精度', kind: 'choice', default: '2048', rebuild: 'uniform', advanced: true,
    options: [
      { value: '512', label: '512（锯齿明显，像素风）' },
      { value: '1024', label: '1024' },
      { value: '2048', label: '2048' },
      { value: '4096', label: '4096（最清晰）' },
    ],
    activeWhen: (s) => (is(s, 'lighting.shadows', 'none', 'blob') ? '当前没有阴影贴图' : true),
    explain: { plain: '阴影贴图分辨率。低精度的锯齿阴影本身也可以是一种复古风格。' },
  },
  {
    id: 'lighting.cloudShadows', dim: 'lighting', group: '阴影', label: '云影', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.25, rebuild: 'uniform',
    activeWhen: lit,
    explain: { plain: '地面上缓慢滚动的云影，增加大地的层次。', term: { zh: '云影 / 光照遮罩', en: 'Cloud shadows / Light cookie' } },
  },
  {
    id: 'lighting.ao', dim: 'lighting', group: '阴影', label: '缝隙暗部（AO）', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: lit,
    explain: {
      plain: '物体接触处、缝隙和角落自然变暗，体积和接触关系更清楚；体素和积木场景尤其明显。',
      ends: ['没有', '强烈的角落暗部'],
      lookAt: '墙角、物体落地处、方块之间的缝',
      term: { zh: '环境光遮蔽', en: 'Ambient occlusion (SSAO)' },
      tech: '屏幕空间：用深度与视空间法线在半球内采样，比较遮挡后乘到线性颜色上（在辉光与调色之前）',
      pitfalls: ['和卡通色阶直接相乘会出现"脏"渐变，卡通风格宜弱用', '屏幕空间 AO 在画面边缘和薄物体后面会出现光晕'],
    },
    prompt: (v) => (Number(v) > 0.3 ? '物体接触处与缝隙有柔和的环境光遮蔽暗部' : null),
    port: { godot: 'Environment.ssao_enabled + ssao_intensity / ssao_radius', godotLevel: 'builtin' },
  },
  {
    id: 'lighting.aoRadius', dim: 'lighting', group: '阴影', label: 'AO 范围', kind: 'range', min: 0.2, max: 3, step: 0.05, default: 1, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (Number(s['lighting.ao'] ?? 0) > 0 ? true : '需要先打开缝隙暗部'),
    explain: { plain: '暗部向外扩散多远。', ends: ['只在紧贴处', '大片晕开'] },
  },
  {
    id: 'lighting.godrays', dim: 'lighting', group: '大气光', label: '体积光束', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: lit,
    explain: {
      plain: '太阳在画面里时，从天空透过物体缝隙射出的光束。',
      lookAt: '逆光时树冠、建筑缝隙周围',
      term: { zh: '体积光 / 上帝光', en: 'God rays (screen-space radial blur)' },
      limits: '这是屏幕空间径向模糊的近似，太阳不在画面里时没有效果；真实体积光需要光线步进或体积雾',
    },
    prompt: (v) => (Number(v) > 0.3 ? '逆光时有从天空透出的光束' : null),
    port: { godot: 'Environment.volumetric_fog_enabled（真实体积雾，效果不同），或全屏径向模糊着色器', godotLevel: 'post' },
  },
  {
    id: 'lighting.lanterns', dim: 'lighting', group: '点光源', label: '夜间灯火', kind: 'range', min: 0, max: 2, step: 0.01, default: 1, rebuild: 'uniform',
    activeWhen: lit,
    explain: { plain: '灯笼、窗户等点光源的亮度，夜晚最明显。' },
  },
];

registerParams(defs);
