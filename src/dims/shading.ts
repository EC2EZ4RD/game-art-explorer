import { shadingIs, shadingNot } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const toonish = shadingIs('toonRamp', 'cel');

const defs: ParamDef[] = [
  {
    id: 'shading.model', dim: 'shading', group: '明暗模型', label: '明暗模型', kind: 'choice', default: 'cel', rebuild: 'uniform',
    options: [
      {
        value: 'unlit', label: '无光照平涂', term: { zh: '无光照', en: 'Unlit' }, desc: '完全不受光，只有固有色，靠线和色块区分',
        prompt: '不受光照的平涂色块，体积感靠轮廓线和色块交代', techPrompt: 'MeshBasicMaterial / 着色器只输出固有色',
        pitfalls: ['不加描边或烘焙 AO，体积感会完全消失'], port: { godot: 'StandardMaterial3D.shading_mode = UNSHADED', godotLevel: 'builtin' },
      },
      {
        value: 'lambert', label: '漫反射', term: { zh: '兰伯特', en: 'Lambert' }, desc: '柔和连续的明暗',
        prompt: '明暗连续柔和的漫反射', port: { godot: 'StandardMaterial3D diffuse_mode = LAMBERT', godotLevel: 'builtin' },
      },
      {
        value: 'halfLambert', label: '半兰伯特包裹光', term: { zh: '半兰伯特 / 包裹光', en: 'Half-Lambert / Wrap lighting' }, desc: '暗部被抬亮，背光面不死黑',
        prompt: '暗部被柔和抬亮的包裹光照，背光面不死黑', port: { godot: 'StandardMaterial3D diffuse_mode = LAMBERT_WRAP', godotLevel: 'builtin' },
      },
      {
        value: 'toonRamp', label: '内置式卡通色阶', term: { zh: '色阶贴图', en: 'Toon ramp / Gradient map' },
        desc: '复刻 MeshToonMaterial：N·L 查灰度色阶，但投影不参与量化',
        prompt: '分阶的卡通明暗', techPrompt: 'MeshToonMaterial + gradientMap（DataTexture RedFormat，NearestFilter，关闭 mipmap）',
        pitfalls: [
          'gradientMap 只读 R 通道，必须 NearestFilter，否则色阶会被插值成渐变',
          '查表坐标是 N·L×0.5+0.5（半兰伯特映射），背光面也会出现中间调',
          '投影是乘在光照上的，不会被量化：软阴影边缘会穿过色阶，出现灰色渐变带',
        ],
        port: { godot: 'StandardMaterial3D diffuse_mode = TOON（只有两阶，粗糙度控制边缘），多阶需自定义 light()', godotLevel: 'shader' },
      },
      {
        value: 'cel', label: '自定义赛璐璐', term: { zh: '赛璐璐 / 卡通分阶', en: 'Cel shading' },
        desc: '明暗分成 N 阶色块，暗部用独立的阴影色，投影也一起量化',
        prompt: '干净利落的分阶明暗色块，暗部使用带色相偏移的阴影色',
        techPrompt: '自定义光照：mix(shadowColor, litColor, smoothstep(t-w, t+w, NdotL × shadow))，阴影因子参与阈值化',
        port: { godot: 'spatial 着色器 light() 里对 dot(NORMAL, LIGHT) × ATTENUATION 做 smoothstep 量化', godotLevel: 'shader' },
      },
      {
        value: 'gooch', label: '冷暖光照', term: { zh: 'Gooch 冷暖着色', en: 'Gooch shading' }, desc: '亮面偏暖、暗面偏冷，形体清晰',
        prompt: '亮面偏暖、暗面偏冷的冷暖着色，形体转折清楚', port: { godot: 'light() 里 mix(cool, warm, NdotL*0.5+0.5)', godotLevel: 'shader' },
      },
      {
        value: 'pbr', label: '物理材质', term: { zh: '基于物理的渲染', en: 'PBR' }, desc: '能量守恒的高光与漫反射',
        prompt: '基于物理的材质与光照', pitfalls: ['PBR ≠ 写实：写实感主要来自资产与贴图，不来自光照模型'],
        port: { godot: 'StandardMaterial3D 默认（Burley + Schlick-GGX）', godotLevel: 'builtin' },
      },
      {
        value: 'hatching', label: '排线素描', term: { zh: '色调排线', en: 'Hatching (TAM)' }, desc: '明暗用排线疏密表现，纸白底',
        prompt: '明暗用铅笔/钢笔排线的疏密表现，暗处交叉排线，纸白底子', status: 'partial',
        pitfalls: ['屏幕空间排线在移动时像贴在玻璃上（浴帘效应）；这里提供世界空间锚定'],
        port: { godot: 'fragment() 里按光照强度混合多层排线纹理（Tonal Art Maps）', godotLevel: 'shader' },
      },
      {
        value: 'matcap', label: '材质球', term: { zh: '材质捕获', en: 'Matcap' }, desc: '用视角法线查一张"烘焙好光照的球"，不受场景光影响',
        prompt: '像 ZBrush 雕刻预览的材质球光照', pitfalls: ['不响应场景光与投影，转动镜头高光不变'],
        port: { godot: 'fragment() 用 (VIEW_MATRIX × NORMAL).xy 采样 matcap 纹理', godotLevel: 'shader' },
      },
    ],
    explain: {
      plain: '光照怎样变成明暗：连续渐变、分成色块，还是用线条表示。',
      lookAt: '物体明暗交界线（受光面与背光面的分界）',
      term: { zh: '光照模型', en: 'Lighting model' },
      pitfalls: ['卡通着色不等于完整的动漫风格：动漫还依赖造型、线条和动画'],
    },
  },
  {
    id: 'shading.steps', dim: 'shading', group: '色阶', label: '明暗层数', kind: 'int', min: 2, max: 6, step: 1, default: 3, rebuild: 'uniform',
    activeWhen: toonish,
    explain: { plain: '明暗分成几阶色块。', ends: ['二分：亮/暗，最干脆', '多阶：接近渐变'], term: { zh: '色阶数', en: 'Ramp steps' } },
    prompt: (v, s) => (is(s, 'shading.model', 'toonRamp', 'cel') ? `明暗分为 ${v} 阶` : null),
    techPrompt: (v) => `${v} 阶色阶（Canvas/DataTexture 生成灰度 ramp）`,
  },
  {
    id: 'shading.threshold', dim: 'shading', group: '色阶', label: '明暗交界位置', kind: 'range', min: -0.6, max: 0.6, step: 0.01, default: 0.05, rebuild: 'uniform',
    activeWhen: toonish,
    explain: { plain: '亮面和暗面的分界线往哪边推。', ends: ['亮面多，画面明快', '暗面多，画面沉重'], term: { zh: '阈值', en: 'Threshold' } },
  },
  {
    id: 'shading.softness', dim: 'shading', group: '色阶', label: '交界软硬', kind: 'range', min: 0, max: 0.5, step: 0.005, default: 0.02, rebuild: 'uniform',
    activeWhen: toonish,
    explain: { plain: '色阶边缘是刀切般的硬边，还是有一点柔化。', ends: ['刀切硬边', '柔和过渡'], term: { zh: '边缘软化', en: 'Band softness' } },
    prompt: (v, s) => (is(s, 'shading.model', 'cel', 'toonRamp') ? (Number(v) < 0.04 ? '色阶边缘干脆利落' : Number(v) > 0.2 ? '色阶边缘柔和' : null) : null),
  },
  {
    id: 'shading.shadowColor', dim: 'shading', group: '阴影色', label: '阴影色', kind: 'color', default: '#5B4E9E', rebuild: 'uniform',
    activeWhen: shadingIs('cel', 'gooch'),
    explain: {
      plain: '暗部不是简单变黑，而是染上一种颜色（常见偏蓝紫）。',
      lookAt: '背光面的颜色是"脏灰"还是"有色"',
      pitfalls: ['只把颜色乘暗会让饱和度掉，得到脏灰阴影'],
      term: { zh: '阴影色', en: 'Shadow tint' },
    },
  },
  {
    id: 'shading.shadowTint', dim: 'shading', group: '阴影色', label: '阴影染色强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'uniform',
    activeWhen: shadingIs('cel', 'gooch'),
    explain: { plain: '阴影色混入多少。', ends: ['只变暗', '强烈的彩色阴影'] },
    prompt: (v, s) => (is(s, 'shading.model', 'cel') && Number(v) > 0.3 ? '暗部带有明显色相偏移，不发灰' : null),
  },
  {
    id: 'shading.shadowDepth', dim: 'shading', group: '阴影色', label: '暗部深度', kind: 'range', min: 0.15, max: 0.95, step: 0.01, default: 0.62, rebuild: 'uniform',
    activeWhen: shadingNot('unlit', 'matcap'),
    explain: { plain: '最暗的一阶有多亮。', ends: ['暗部很深，对比强', '暗部很亮，画面平'] },
  },
  {
    id: 'shading.quantizeShadow', dim: 'shading', group: '阴影色', label: '投影参与色阶', kind: 'toggle', default: true, rebuild: 'uniform',
    activeWhen: shadingIs('cel'),
    explain: {
      plain: '物体投下的影子是否也按色阶硬化。关掉就会看到 MeshToonMaterial 常见的灰色渐变带。',
      lookAt: '投影边缘',
      pitfalls: ['three.js 内置 Toon 不量化投影；PCF 软阴影边缘会穿过色阶'],
    },
  },
  {
    id: 'shading.ambient', dim: 'shading', group: '环境光', label: '环境光', kind: 'range', min: 0, max: 1.2, step: 0.01, default: 0.45, rebuild: 'uniform',
    activeWhen: shadingNot('unlit', 'matcap'),
    explain: {
      plain: '来自天空和地面的整体照明。',
      ends: ['对比强烈、暗部深', '画面平、暗部亮'],
      term: { zh: '半球光 / 环境光', en: 'Hemisphere / Ambient light' },
      pitfalls: ['环境光是画面"发平"的元凶之一；在卡通色阶下会压平色阶'],
    },
    port: { godot: 'WorldEnvironment ambient_light_color / ambient_light_energy', godotLevel: 'builtin' },
  },
  {
    id: 'shading.wrap', dim: 'shading', group: '环境光', label: '包裹程度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: shadingIs('halfLambert'),
    explain: { plain: '光线"绕"到背面多少。', ends: ['普通漫反射', '几乎没有暗面'], term: { zh: '包裹光', en: 'Wrap lighting' } },
  },
  {
    id: 'shading.rim', dim: 'shading', group: '边缘光', label: '边缘光', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.25, rebuild: 'uniform',
    activeWhen: shadingNot('unlit', 'hatching', 'matcap'),
    explain: {
      plain: '物体轮廓边缘亮起一圈，让主体从背景里跳出来。',
      ends: ['没有', '明显的亮边'],
      term: { zh: '边缘光 / 菲涅尔', en: 'Rim light / Fresnel' },
      pitfalls: ['低多边形的大平面法线一致，会整面一起变亮'],
    },
    prompt: (v) => (Number(v) > 0.35 ? '轮廓边缘带一圈亮边，主体从背景中分离' : null),
    port: { godot: 'StandardMaterial3D.rim_enabled / rim / rim_tint', godotLevel: 'builtin' },
  },
  {
    id: 'shading.rimWidth', dim: 'shading', group: '边缘光', label: '边缘光宽度', kind: 'range', min: 0.05, max: 0.8, step: 0.01, default: 0.3, rebuild: 'uniform', advanced: true,
    activeWhen: shadingNot('unlit', 'hatching', 'matcap'),
    explain: { plain: '亮边有多宽。' },
  },
  {
    id: 'shading.highlight', dim: 'shading', group: '卡通高光', label: '卡通高光', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.0, rebuild: 'uniform',
    activeWhen: toonish,
    explain: { plain: '一块硬边的高光斑，像动画里的反光。', ends: ['没有', '明显的高光斑'], term: { zh: '卡通高光', en: 'Toon specular' } },
  },
  {
    id: 'shading.hatchScale', dim: 'shading', group: '排线', label: '排线间距', kind: 'range', min: 2, max: 14, step: 0.5, default: 5, unit: 'px', rebuild: 'uniform',
    activeWhen: shadingIs('hatching'),
    explain: { plain: '排线有多密。', ends: ['细密', '稀疏'] },
  },
  {
    id: 'shading.hatchAnchor', dim: 'shading', group: '排线', label: '排线锚定', kind: 'choice', default: 'world', rebuild: 'uniform',
    options: [
      { value: 'screen', label: '屏幕空间', desc: '线条贴在屏幕上，移动时物体从线后面滑过（浴帘效应）' },
      { value: 'world', label: '世界空间', desc: '线条贴在物体表面，跟着物体移动' },
    ],
    activeWhen: shadingIs('hatching'),
    explain: { plain: '排线固定在屏幕上还是物体上。转动镜头就能看出区别。', term: { zh: '浴帘效应', en: 'Shower-door effect' } },
  },
  {
    id: 'shading.hatchTex', dim: 'shading', group: '排线', label: '排线来源', kind: 'choice', default: 'procedural', rebuild: 'uniform',
    options: [
      { value: 'procedural', label: '程序直线', desc: '等距的数学直线，按明暗阈值一层层叠加（层与层之间是硬切换）' },
      {
        value: 'tam', label: '色调排线图（TAM）', desc: '6 级排线图：每一级包含上一级的全部笔画再加新笔，明暗之间平滑过渡，笔画长短、粗细、疏密不齐',
        term: { zh: '色调排线图', en: 'Tonal Art Maps (Praun 2001)' }, status: 'live',
        prompt: '排线由长短不一、疏密渐变的笔画组成，亮处稀疏、暗处层层交叉',
      },
    ],
    activeWhen: (s: Values) => (is(s, 'shading.model', 'hatching') || is(s, 'surface.medium', 'sketch', 'crosshatch')
      ? true : '只在明暗模型为「排线」或媒介为「铅笔素描 / 钢笔交叉排线」时生效'),
    explain: {
      plain: '排线是用程序画的等距直线，还是查一组预先画好的排线图。排线图的每一级都包含上一级的所有笔画，所以明暗变化时笔画只增不跳。',
      lookAt: '明暗交界处：排线是一层层突然出现，还是逐渐加密',
      tech: '6 级排线图打包在两张 RGB 纹理里；按亮度在相邻两级之间插值。排线图在本地用程序生成',
    },
    port: { godot: 'art_style.gdshader / post_medium.gdshader：uniform sampler2D tam_a, tam_b（RGB 各存一级），按亮度混合相邻两级', godotLevel: 'shader' },
  },
];

registerParams(defs);
