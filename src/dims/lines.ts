import { all, toggleOn } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const outlineOn = toggleOn('lines.outline', '外轮廓描边');
const edgesOn = (s: Values): true | string => (is(s, 'lines.edges', 'none') ? '需要先选择一种内部线检测方式' : true);

const defs: ParamDef[] = [
  /* ---------- 外轮廓：反向外壳 ---------- */
  {
    id: 'lines.outline', dim: 'lines', group: '外轮廓（反向外壳）', label: '外轮廓描边', kind: 'toggle', default: true, rebuild: 'uniform',
    explain: {
      plain: '把物体再画一遍、沿法线稍微放大、只画背面，露出来的一圈就是轮廓线。',
      lookAt: '物体外缘、远处物体的线宽、角色与地面交界',
      term: { zh: '反向外壳描边', en: 'Inverted hull outline' },
      limits: '只能画外轮廓，画不出物体内部的折线和交线（那需要内部线检测）',
      pitfalls: ['硬边或非索引几何会裂开，需要单独准备平滑法线', '薄物体会被外壳穿透'],
    },
    prompt: (v, s) => (v ? `重要物体带${is(s, 'lines.outlineColorMode', 'black') ? '深色' : is(s, 'lines.outlineColorMode', 'tinted') ? '随固有色加深的' : '彩色'}外轮廓线，像手办线稿` : null),
    techPrompt: (v, s) => (v
      ? s['lines.outlineNormals'] === 'raw'
        ? 'Inverted Hull：沿各面法线挤出（非索引几何的转角会裂开，这里保留以演示问题），side=BackSide 渲染轮廓色'
        : 'Inverted Hull：复制网格，沿单独保存的平滑法线在裁剪空间挤出固定像素宽度，side=BackSide 渲染轮廓色'
      : null),
    port: { godot: 'StandardMaterial3D.next_pass = 描边材质（cull_front + grow），或 spatial 着色器在 vertex() 沿 NORMAL 挤出', godotLevel: 'builtin' },
  },
  {
    id: 'lines.outlineWidth', dim: 'lines', group: '外轮廓（反向外壳）', label: '线宽', kind: 'range', min: 0.5, max: 8, step: 0.1, default: 2.2, unit: 'px', rebuild: 'uniform',
    activeWhen: outlineOn,
    explain: { plain: '轮廓线有多粗。', ends: ['细线，精致', '粗线，贴纸/漫画感'] },
    prompt: (v, s) => (s['lines.outline'] ? (Number(v) > 4 ? '轮廓线粗重' : Number(v) < 1.3 ? '轮廓线纤细' : null) : null),
  },
  {
    id: 'lines.outlineMode', dim: 'lines', group: '外轮廓（反向外壳）', label: '线宽随距离', kind: 'choice', default: 'clamped', rebuild: 'uniform',
    options: [
      { value: 'screen', label: '屏幕恒宽', desc: '远近一样粗，远景线条可能挤成黑块' },
      { value: 'world', label: '世界宽度', desc: '近粗远细，像真实的物体边缘；透视下远处线会消失' },
      { value: 'clamped', label: '按距离限幅', desc: '近处略粗、远处略细，但有上下限' },
    ],
    activeWhen: outlineOn,
    explain: { plain: '镜头拉远时线宽怎么变化。', pitfalls: ['正交相机下"世界宽度"与"屏幕恒宽"表现接近'] },
  },
  {
    id: 'lines.outlineColorMode', dim: 'lines', group: '外轮廓（反向外壳）', label: '线色', kind: 'choice', default: 'black', rebuild: 'uniform',
    options: [
      { value: 'black', label: '墨色', desc: '统一用色板里的墨色' },
      { value: 'tinted', label: '随固有色加深', desc: '线是物体颜色的深色版，更柔和（吉卜力式）' },
      { value: 'custom', label: '自定义颜色' },
    ],
    activeWhen: outlineOn,
    explain: { plain: '轮廓线是什么颜色。', pitfalls: ['纯黑线配高饱和色板容易显得生硬'] },
  },
  {
    id: 'lines.outlineColor', dim: 'lines', group: '外轮廓（反向外壳）', label: '自定义线色', kind: 'color', default: '#2D1F3D', rebuild: 'uniform',
    activeWhen: all(outlineOn, (s) => (is(s, 'lines.outlineColorMode', 'custom') ? true : '线色需设为"自定义颜色"')),
    explain: { plain: '自定义的轮廓颜色。' },
  },
  {
    id: 'lines.outlineScope', dim: 'lines', group: '外轮廓（反向外壳）', label: '描边范围', kind: 'choice', default: 'important', rebuild: 'uniform',
    options: [
      { value: 'all', label: '全部物体' },
      { value: 'important', label: '地形、植被、角色', desc: '灵感提示词里的"重要物体"' },
      { value: 'characters', label: '只描角色与交互物', desc: '主体突出，环境安静' },
      { value: 'environment', label: '只描环境', desc: '角色不描边' },
    ],
    activeWhen: outlineOn,
    explain: { plain: '哪些东西带轮廓线。只描主体可以把视线引到角色和交互物上。', lookAt: '主体与背景的分离程度' },
  },
  {
    id: 'lines.outlineNormals', dim: 'lines', group: '外轮廓（反向外壳）', label: '挤出法线', kind: 'choice', default: 'smooth', rebuild: 'uniform', advanced: true,
    options: [
      { value: 'smooth', label: '平滑法线副本（正确）', desc: '另存一份焊接后的平滑法线专供描边' },
      { value: 'raw', label: '直接用面法线（演示裂缝）', desc: '低模硬边处外壳会裂开' },
    ],
    activeWhen: outlineOn,
    explain: { plain: '描边沿哪组法线挤出。切到"直接用面法线"可以看到灵感提示词里 toNonIndexed + 反向外壳的裂缝问题。' },
  },
  /* ---------- 内部线：后处理边缘检测 ---------- */
  {
    id: 'lines.edges', dim: 'lines', group: '内部线（边缘检测）', label: '内部线检测', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '关闭' },
      { value: 'depthNormal', label: '深度 + 法线', desc: '内外线都有，线宽统一，最常用', techPrompt: '后处理：对深度与法线缓冲做 Sobel 边缘检测，深度阈值随距离缩放' },
      { value: 'normal', label: '只看法线', desc: '只画折面转角，适合低模结构线' },
      { value: 'depth', label: '只看深度', desc: '只画前后遮挡的边' },
      { value: 'region', label: '部件分界', desc: '不同部件（颜色角色）之间画线，像法比漫画的清线', term: { zh: '清线派', en: 'Ligne claire' } },
      { value: 'all', label: '全部', desc: '深度、法线、部件分界一起' },
    ],
    explain: {
      plain: '在画面上找出深度突变、法线转折或部件分界，画出物体内部的结构线。',
      lookAt: '物体内部的折线、物体与物体相交处',
      term: { zh: '屏幕空间边缘检测', en: 'Screen-space edge detection' },
      pitfalls: ['three.js 自带 SobelOperatorShader 处理的是颜色亮度，不是几何边缘，会描出纹理和色阶边', '固定深度阈值在远处斜面会误检'],
    },
    prompt: (v) => ({ none: null, depthNormal: '物体内部的结构线与遮挡线都被勾出', normal: '勾出形体转折处的结构线', depth: '勾出前后遮挡的边线', region: '不同部件之间用等宽清线分开', all: '线条完整勾出轮廓、结构与部件分界' } as Record<string, string | null>)[String(v)],
    port: { godot: '全屏四边形 spatial 着色器读取 hint_depth_texture 与 hint_normal_roughness_texture 做 Sobel，或 CompositorEffect', godotLevel: 'post' },
  },
  {
    id: 'lines.edgeWidth', dim: 'lines', group: '内部线（边缘检测）', label: '内线宽度', kind: 'range', min: 0.5, max: 4, step: 0.1, default: 1.2, unit: 'px', rebuild: 'uniform',
    activeWhen: edgesOn, explain: { plain: '内部线有多粗。' },
  },
  {
    id: 'lines.edgeThreshold', dim: 'lines', group: '内部线（边缘检测）', label: '检测灵敏度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: edgesOn, explain: { plain: '多小的转折也画线。', ends: ['只画大转折', '连细小起伏都画'] },
  },
  {
    id: 'lines.edgeColorMode', dim: 'lines', group: '内部线（边缘检测）', label: '内线颜色', kind: 'choice', default: 'ink', rebuild: 'uniform',
    options: [
      { value: 'ink', label: '墨色' },
      { value: 'tinted', label: '随画面颜色加深', desc: '工笔、吉卜力常见的色线' },
      { value: 'light', label: '亮线', desc: '像蓝图或霓虹的亮边' },
      { value: 'split', label: '外轮廓墨线 + 折边高光', desc: '遮挡边用墨色，形体折边用亮色，三维像素画常用', term: { zh: '边缘高光', en: 'Edge highlight' } },
    ],
    activeWhen: edgesOn, explain: { plain: '内部线的颜色。', term: { zh: '色线', en: 'Colored line' } },
  },
  {
    id: 'lines.edgeFade', dim: 'lines', group: '内部线（边缘检测）', label: '远处淡出', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'uniform',
    activeWhen: edgesOn, explain: { plain: '远处的线变淡，模拟空气透视，避免远景线条挤成一团。' },
  },
  {
    id: 'lines.boil', dim: 'lines', group: '手绘感', label: '线条抖动', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: edgesOn,
    explain: {
      plain: '线条以较低帧率轻微跳动，像逐帧手绘。',
      term: { zh: '沸腾线', en: 'Line boil' },
      pitfalls: ['每帧都变会闪得难受，必须降频（跟随"运动 > 动画帧率"）'],
    },
    prompt: (v) => (Number(v) > 0.2 ? '线条带有逐帧手绘般的轻微抖动' : null),
  },
  {
    id: 'lines.wobble', dim: 'lines', group: '手绘感', label: '线条歪斜', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: edgesOn,
    explain: { plain: '线条位置被噪声推歪，不再完全贴着几何边缘，像手画的线。' },
  },
];

registerParams(defs);
