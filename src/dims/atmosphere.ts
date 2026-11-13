import { needTerrain, needWater } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef } from './types';

const defs: ParamDef[] = [
  {
    id: 'atmosphere.sky', dim: 'atmosphere', group: '天空', label: '天空', kind: 'choice', default: 'gradient', rebuild: 'uniform',
    options: [
      { value: 'gradient', label: '渐变天空', desc: '天顶到地平线的颜色渐变，随时间变化', prompt: '天空是从天顶到地平线的柔和渐变' },
      { value: 'solid', label: '纯色背景', desc: '单一背景色，像展示台', prompt: '纯色背景，像展示台' },
      { value: 'paper', label: '纸色留白', desc: '背景就是纸，水墨、素描常用', prompt: '背景是纸色留白' },
      { value: 'bands', label: '分层色带', desc: '天空分成几条硬边色带，像海报', prompt: '天空分成几条硬边色带，像风景海报' },
    ],
    explain: { plain: '背景是什么样子。', pitfalls: ['物理天空（Preetham）在风格化项目里显得太写实，3 段渐变更可控'] },
    port: { godot: 'WorldEnvironment + ProceduralSkyMaterial 或自定义 sky 着色器', godotLevel: 'builtin' },
  },
  {
    id: 'atmosphere.fog', dim: 'atmosphere', group: '雾', label: '雾', kind: 'choice', default: 'distance', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无雾', desc: '远近一样清楚' },
      { value: 'distance', label: '距离雾', desc: '越远越接近天色，拉开纵深', prompt: '远景融入天色，形成空气透视' },
      { value: 'height', label: '低洼雾', desc: '雾积在低处，山顶露出来', prompt: '雾气积在低洼处，山峰露出雾面' },
      { value: 'layers', label: '分层雾', desc: '按距离分成几层硬边色带，像海报风景', prompt: '远景按距离分成几层越来越淡的色带' },
    ],
    explain: {
      plain: '空气中的雾让远处变淡，是拉开空间层次最便宜的方法。',
      lookAt: '远景和近景的明度、饱和度差别',
      term: { zh: '空气透视', en: 'Aerial perspective' },
    },
    port: { godot: 'Environment.fog_enabled（深度雾 + 高度雾）；分层硬边需自定义着色器', godotLevel: 'builtin' },
  },
  {
    id: 'atmosphere.fogDensity', dim: 'atmosphere', group: '雾', label: '雾浓度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.3, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'atmosphere.fog', 'none') ? '没有雾' : true),
    explain: { plain: '雾有多浓。', ends: ['清透', '朦胧'] },
  },
  {
    id: 'atmosphere.water', dim: 'atmosphere', group: '水', label: '水面', kind: 'choice', default: 'toon', rebuild: 'uniform',
    options: [
      { value: 'toon', label: '清透卡通水', desc: '半透明，岸边有白色泡沫线，水深处更蓝', prompt: '水体清透半透明，岸边有白色泡沫线，深处颜色更浓' },
      { value: 'flat', label: '平涂水面', desc: '不透明纯色，像插画', prompt: '水面是不透明的平涂色块' },
      { value: 'glossy', label: '反光水面', desc: '高光与天色反射', prompt: '水面带天光反射与高光' },
      { value: 'hidden', label: '隐藏水面', desc: '只看地形' },
    ],
    activeWhen: needWater,
    explain: { plain: '水的画法。水陆交界是很多风格的识别点。', lookAt: '岸线、浅水与深水的区别' },
    port: { godot: 'spatial 着色器：读取 DEPTH_TEXTURE 算水深做颜色与泡沫', godotLevel: 'shader' },
  },
  {
    id: 'atmosphere.waterOpacity', dim: 'atmosphere', group: '水', label: '水的透明度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.55, rebuild: 'uniform',
    activeWhen: (s) => (needWater(s) === true && is(s, 'atmosphere.water', 'toon', 'glossy') ? true : '只在透明水面下生效'),
    explain: { plain: '能看到多少水下的地面。', ends: ['清澈见底', '不透明'] },
  },
  {
    id: 'atmosphere.waves', dim: 'atmosphere', group: '水', label: '水面浮动', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.35, rebuild: 'uniform',
    activeWhen: needWater,
    explain: { plain: '水面上下浮动的幅度。', pitfalls: ['浮在水上的物体要和水面共用同一个波函数，否则会穿模'] },
    prompt: (v) => (Number(v) > 0.1 ? '水体边缘轻微动态浮动' : null),
  },
  {
    id: 'atmosphere.wind', dim: 'atmosphere', group: '风与天气', label: '风', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.35, rebuild: 'uniform',
    explain: { plain: '树冠和草随风摇摆。', ends: ['静止', '大风'] },
    prompt: (v) => (Number(v) > 0.6 ? '大风吹动植被' : null),
    port: { godot: 'vertex() 里按高度权重做正弦摆动', godotLevel: 'shader' },
  },
  {
    id: 'atmosphere.weather', dim: 'atmosphere', group: '风与天气', label: '天气粒子', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '晴' },
      { value: 'snow', label: '雪', prompt: '飘雪' },
      { value: 'rain', label: '雨', prompt: '下雨' },
      { value: 'petals', label: '花瓣', prompt: '飘落花瓣' },
      { value: 'dust', label: '尘埃光点', prompt: '空气中漂浮的尘埃光点' },
    ],
    explain: { plain: '空中飘落的粒子，营造天气与情绪。' },
    port: { godot: 'GPUParticles3D', godotLevel: 'builtin' },
  },
  {
    id: 'atmosphere.cloudDrift', dim: 'atmosphere', group: '风与天气', label: '云的漂移', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.3, rebuild: 'uniform',
    activeWhen: needTerrain,
    explain: { plain: '漂浮云移动的速度。' },
  },
];

registerParams(defs);
