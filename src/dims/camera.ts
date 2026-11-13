import { isImageScene, rigOf } from '../content/sceneCatalog';
import { needCharacter } from './conditions';
import { is, registerParams, str } from './registry';
import type { ParamDef, Values } from './types';

export const CAMERA_ANGLES: Record<string, { label: string; pitch: number; desc: string }> = {
  iso: { label: '真等距 35.26°', pitch: 35.264, desc: '三轴等比，atan(1/√2)' },
  dimetric: { label: '2:1 二等角 30°', pitch: 30, desc: '像素画常说的"等距"，地面线是 2:1 阶梯' },
  high: { label: '高俯角 50°', pitch: 50, desc: '沙盘、经营、微缩模型' },
  top: { label: '正俯视 88°', pitch: 88, desc: '地图、桌游，角色辨识度低' },
  low: { label: '低机位 12°', pitch: 12, desc: '接近人眼，空间感强' },
  side: { label: '侧视 0°', pitch: 0, desc: '平视，横版视角' },
};

/*
 * 2D 场景锁定镜头（docs/workbench-redesign.md §5.2 / §9.1，F 轨道）：场景的 rig 决定投影 / 俯角 / 方位 / 焦距，
 * 配方和手动写的这几个键不生效（像素化、景深、黑边、畸变、取景大小照旧）。下面的 activeWhen 把原因写给界面。
 */
const rigHere = (s: Values) => rigOf(str(s, 'game.scene'));
const LOCKED = '这个场景锁定了镜头';
/** 俯角的名字（按度数找 CAMERA_ANGLES 里的一档，找不到就写度数） */
const pitchLabel = (deg: number) => Object.values(CAMERA_ANGLES).find((a) => Math.abs(a.pitch - deg) < 0.5)?.label ?? `${deg}°`;
/**
 * 锁定时写明「实际用的是什么」（审查修复 11 / 26：原来只说锁定了，选中的还是配方的值，和画面对不上）：
 * 例如「这个场景锁定了镜头：侧视 0°」
 */
const lockedAs = (what: string) => `${LOCKED}：实际是 ${what}`;
/** 第一人称 / 追尾镜头（SceneRig.eye / chase，技术补全 K）：镜头每帧跟着玩家的位置和朝向摆 */
const povOf = (s: Values): string | null => { const r = rigHere(s); return r?.eye ? '第一人称' : r?.chase ? '追尾镜头（跟在玩家身后）' : null; };
/** 投影：rig 写死了投影时不生效；横版（跟参数）像素化时强制正交 */
const projectionActive = (s: Values): true | string => {
  const r = rigHere(s);
  if (!r) return true;
  if (r.projection !== 'values') return lockedAs(r.projection === 'ortho' ? '正交' : '透视');
  return Number(s['camera.pixelSize'] ?? 1) > 1 ? '像素化时横版自动用正交 + 分层视差' : true;
};
/** 俯角：rig 给了可选俯角（俯视瓦片：高俯角 / 正俯视）时只有这几个能选；存的值不在里面时写明实际用的那一档 */
const angleActive = (s: Values): true | string => {
  const r = rigHere(s);
  if (!r) return true;
  const pov = povOf(s);
  if (pov) return lockedAs(pov);
  if (!r.angles) return lockedAs(pitchLabel(r.pitch));
  const cur = str(s, 'camera.angle');
  return cur in r.angles ? true : `这个场景只能用${Object.keys(r.angles).map((k) => CAMERA_ANGLES[k]?.label ?? k).join(' / ')}：实际是 ${pitchLabel(r.pitch)}`;
};
const azimuthActive = (s: Values): true | string => { const r = rigHere(s); const pov = povOf(s); return pov ? lockedAs(`${pov}，跟着玩家转`) : r ? lockedAs(`${r.yaw}°`) : true; };
const fovActive = (s: Values): true | string => {
  const r = rigHere(s);
  if (r) return r.projection === 'ortho' ? lockedAs('正交（没有焦距）') : lockedAs(`${r.fovMm ?? 35}mm`);
  return is(s, 'camera.projection', 'persp') ? true : '正交投影没有焦距';
};
/** 立绘场景（背景是一张插画）没有纵深：景深、移轴不做（审查修复 15） */
const needDepth = (s: Values): true | string => (isImageScene(str(s, 'game.scene')) ? '立绘场景没有纵深，景深和移轴不做' : true);


const defs: ParamDef[] = [
  {
    id: 'camera.projection', dim: 'camera', group: '投影', label: '投影方式', kind: 'choice', default: 'ortho', rebuild: 'camera',
    activeWhen: projectionActive,
    options: [
      { value: 'ortho', label: '正交', term: { zh: '正交投影', en: 'Orthographic' }, desc: '远近一样大，像模型、像地图', prompt: '正交投影，远近物体大小一致，像在看桌上的模型', techPrompt: 'OrthographicCamera', port: { godot: 'Camera3D.projection = PROJECTION_ORTHOGONAL', godotLevel: 'builtin' } },
      { value: 'persp', label: '透视', term: { zh: '透视投影', en: 'Perspective' }, desc: '近大远小，有纵深', prompt: '透视投影，有近大远小的纵深', techPrompt: 'PerspectiveCamera', port: { godot: 'Camera3D.projection = PROJECTION_PERSPECTIVE', godotLevel: 'builtin' } },
    ],
    explain: {
      plain: '正交：远近物体一样大，像看桌上的模型；透视：近大远小，像亲身进入。',
      lookAt: '远处和近处同样大小的树',
      pitfalls: ['正交 ≠ 等距：等距是正交 + 特定的俯角与方位'],
    },
  },
  {
    id: 'camera.angle', dim: 'camera', group: '视角', label: '俯角', kind: 'choice', default: 'iso', rebuild: 'camera',
    activeWhen: angleActive,
    options: Object.entries(CAMERA_ANGLES).map(([value, a]) => ({
      value, label: a.label, desc: a.desc, prompt: `${a.label}视角`,
      disabledWhen: (s: Values) => { const r = rigHere(s); return r?.angles && !(value in r.angles) ? `这个场景只能用${Object.keys(r.angles).map((k) => CAMERA_ANGLES[k]?.label ?? k).join(' / ')}` : false; },
    })),
    explain: {
      plain: '镜头向下看的角度。',
      pitfalls: ['真等距（35.264°）和 2:1 二等角（30°）不是一回事，提示词里只写"等距"会有歧义'],
      term: { zh: '等距 / 二等角', en: 'Isometric / Dimetric' },
    },
  },
  {
    id: 'camera.azimuth', dim: 'camera', group: '视角', label: '方位', kind: 'range', min: 0, max: 360, step: 1, default: 45, unit: '°', rebuild: 'camera',
    activeWhen: azimuthActive,
    explain: { plain: '从哪个方向看。等距通常是 45°。' },
  },
  {
    id: 'camera.fov', dim: 'camera', group: '视角', label: '焦距', kind: 'range', min: 14, max: 200, step: 1, default: 50, unit: 'mm', rebuild: 'camera',
    activeWhen: fovActive,
    explain: { plain: '广角夸张纵深，长焦压缩空间（接近正交）。', ends: ['广角：夸张透视', '长焦：扁平压缩'], term: { zh: '焦距', en: 'Focal length' } },
    prompt: (v, s) => (is(s, 'camera.projection', 'persp') ? (Number(v) < 28 ? '广角镜头，透视夸张' : Number(v) > 100 ? '长焦镜头，空间压缩' : null) : null),
    port: { godot: 'Camera3D.fov（垂直视角，需由焦距换算）', godotLevel: 'builtin' },
  },
  {
    id: 'camera.zoom', dim: 'camera', group: '视角', label: '取景大小', kind: 'range', min: 0.3, max: 3, step: 0.01, default: 1, rebuild: 'camera',
    // 第一人称没有取景大小（视野由焦距定）；追尾镜头里它把镜头拉近 / 推远
    activeWhen: (s) => (rigHere(s)?.eye ? `${LOCKED}：第一人称没有取景大小` : true),
    explain: { plain: '画面里装下多大的世界。', ends: ['只看一小块，人物很大', '远看全貌'] },
  },
  {
    id: 'camera.mode', dim: 'camera', group: '镜头行为', label: '镜头行为', kind: 'choice', default: 'follow', rebuild: 'camera',
    activeWhen: (s) => { const pov = povOf(s); return pov ? `${LOCKED}：${pov}，一直跟着玩家` : true; },
    options: [
      { value: 'orbit', label: '自由环绕', desc: '鼠标拖动旋转、滚轮缩放（锁定镜头的场景里是固定机位）' },
      { value: 'autoRotate', label: '自转展示', desc: '像展示台一样慢慢转', disabledWhen: (s) => (rigHere(s) ? LOCKED : false) },
      { value: 'follow', label: '跟随角色', desc: '镜头跟着角色走', disabledWhen: (s) => (needCharacter(s) !== true ? '当前场景没有角色' : rigHere(s) && !rigHere(s)!.followAxis ? '这个场景是固定机位' : false) },
    ],
    explain: { plain: '镜头如何移动。移动中的镜头最容易暴露抖色、纸纹和细线的闪烁。' },
    prompt: (v) => ({ orbit: null, autoRotate: '镜头缓慢自转展示', follow: '镜头平滑跟随角色' } as Record<string, string | null>)[String(v)],
    port: { godot: 'Camera3D 挂在 SpringArm3D 上跟随；自转用 Tween 或 _process 旋转', godotLevel: 'builtin' },
  },
  {
    id: 'camera.pixelSize', dim: 'camera', group: '画面分辨率', label: '像素化', kind: 'int', min: 1, max: 12, step: 1, default: 1, unit: '倍', rebuild: 'uniform',
    explain: {
      plain: '先用低分辨率渲染，再用最近邻放大，每个"像素"变成一个方块。',
      ends: ['原始分辨率', '大像素'],
      term: { zh: '低分辨率渲染', en: 'Low-res render + nearest upscale' },
      pitfalls: ['像素化 ≠ 体素：像素化只是画面分辨率，物体本身没变', '镜头不做像素对齐时，边缘会"爬"'],
    },
    prompt: (v) => (Number(v) > 1 ? `画面以 1/${v} 分辨率渲染后最近邻放大，呈现像素画质感` : null),
    techPrompt: (v) => (Number(v) > 1 ? `低分辨率渲染目标（1/${v}）+ NearestFilter 放大（three: RenderPixelatedPass）` : null),
    port: { godot: 'SubViewport 低分辨率 + TextureRect 最近邻放大，或 Viewport.scaling_3d_scale + NEAREST', godotLevel: 'builtin' },
  },
  {
    id: 'camera.pixelSnap', dim: 'camera', group: '画面分辨率', label: '像素对齐', kind: 'toggle', default: true, rebuild: 'uniform',
    activeWhen: (s) => (Number(s['camera.pixelSize'] ?? 1) > 1 ? (is(s, 'camera.projection', 'ortho') ? true : '透视相机无法完全消除像素抖动') : '需要像素化大于 1'),
    explain: { plain: '把相机位置吸附到像素网格上，平移时像素图案稳定不"爬"。', term: { zh: '像素完美相机', en: 'Pixel-perfect camera snapping' } },
  },
  {
    id: 'camera.psx', dim: 'camera', group: '画面分辨率', label: '顶点抖动（PS1）', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '把顶点吸附到粗糙的屏幕网格上，模型会轻微抖动、变形——PS1 的标志特征。',
      term: { zh: '顶点吸附', en: 'Vertex snapping' },
      pitfalls: ['PS1 是最近邻、无透视校正；N64 是三点过滤加模糊，两者不要混'],
    },
    prompt: (v) => (Number(v) > 0.1 ? '顶点吸附到低精度网格，模型随镜头轻微抖动（PS1 风格）' : null),
    port: { godot: 'vertex() 中对裁剪空间坐标做 floor 量化', godotLevel: 'shader' },
  },
  {
    id: 'camera.affine', dim: 'camera', group: '画面分辨率', label: '仿射贴图扭曲（PS1）', kind: 'toggle', default: false, rebuild: 'uniform',
    activeWhen: (s) => (String(s['material.texture'] ?? 'none') === 'none' ? '需要先打开材质里的低清像素贴图' : true),
    explain: {
      plain: '贴图不做透视校正：靠近镜头的大三角形上，砖缝和木纹会弯折、随镜头移动而游动，是 PS1 画面的标志之一。',
      lookAt: '镜头斜看的大墙面和地面，转动镜头时贴图的弯折',
      term: { zh: '仿射贴图映射', en: 'Affine texture mapping' },
      tech: 'WebGL2 没有 noperspective：顶点输出 uv·w 和 w，片元里相除即得屏幕空间线性插值',
      pitfalls: ['网格分得越细，扭曲越小；PS1 游戏靠细分地面来减轻它'],
    },
    prompt: (v) => (v ? '贴图没有透视校正，靠近镜头的大面上贴图弯折游动（PS1 仿射贴图）' : null),
    port: { godot: '同样的 w 技巧：vertex() 里输出 varying vec3 (uv * w, w)，fragment() 里相除', godotLevel: 'shader' },
  },
  {
    id: 'camera.tiltShift', dim: 'camera', group: '景深', label: '移轴模糊', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: needDepth,
    explain: {
      plain: '画面上下模糊、中间清楚，让场景像拍摄微缩模型。',
      term: { zh: '移轴', en: 'Tilt-shift' },
      pitfalls: ['微缩感来自"高俯角 + 浅景深 + 高饱和 + 玩具材质"的组合，单靠模糊不够', '这是屏幕带状模糊，不是真实景深'],
    },
    prompt: (v) => (Number(v) > 0.15 ? '画面上下移轴虚化，像拍摄微缩模型' : null),
    port: { godot: 'CameraAttributesPractical 的 dof_blur_far/near，或全屏带状模糊着色器', godotLevel: 'builtin' },
  },
  {
    id: 'camera.tiltFocus', dim: 'camera', group: '景深', label: '清晰带位置', kind: 'range', min: 0.2, max: 0.8, step: 0.01, default: 0.5, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (needDepth(s) !== true ? needDepth(s) : Number(s['camera.tiltShift'] ?? 0) > 0 ? true : '需要先打开移轴模糊'),
    explain: { plain: '画面中清晰带的高度。' },
  },
  {
    id: 'camera.dof', dim: 'camera', group: '景深', label: '景深（散景）', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: needDepth,
    explain: {
      plain: '按距离虚化：焦点在镜头注视处，前后越远越虚，亮点会散成光斑。',
      ends: ['全部清晰', '强烈虚化'],
      lookAt: '前景与远景',
      term: { zh: '景深 / 散景', en: 'Depth of field / Bokeh' },
      tech: '用深度算弥散圆大小，在调色之后做圆盘采样；远景虚化按距离，前景用最大弥散圆近似',
      pitfalls: ['和移轴微缩同时用会叠两层虚化', '和像素化同时用，虚化会被像素格吃掉'],
    },
    prompt: (v) => (Number(v) > 0.2 ? '浅景深，焦点外的前景与背景虚化' : null),
    port: { godot: 'CameraAttributesPractical.dof_blur_far_enabled / dof_blur_near_enabled + dof_blur_amount', godotLevel: 'builtin' },
  },
  {
    id: 'camera.dofRange', dim: 'camera', group: '景深', label: '清晰范围', kind: 'range', min: 0.05, max: 1, step: 0.01, default: 0.3, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (needDepth(s) !== true ? needDepth(s) : Number(s['camera.dof'] ?? 0) > 0 ? true : '需要先打开景深'),
    explain: { plain: '焦点前后多大范围保持清晰（相对镜头距离）。', ends: ['只有焦点清晰', '大片清晰'] },
  },
  {
    id: 'camera.lens', dim: 'camera', group: '镜头特性', label: '鱼眼畸变', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '画面边缘向外弯曲，像滑板视频或随身摄像机。',
      ends: ['无畸变', '强烈鱼眼'],
      term: { zh: '桶形畸变', en: 'Barrel / Fisheye distortion' },
      limits: '这是成像后的屏幕扭曲，和真正的大视角透视不同（拉大视角会拉伸边缘而不是弯曲）',
    },
    prompt: (v) => (Number(v) > 0.2 ? '鱼眼镜头的桶形畸变' : null),
    port: { godot: '全屏着色器做桶形畸变（screen_texture 按半径重新采样）', godotLevel: 'post' },
  },
  {
    id: 'camera.shake', dim: 'camera', group: '镜头特性', label: '手持晃动', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'none',
    explain: {
      plain: '镜头像手持一样轻微晃动，增加临场感或紧张感。',
      term: { zh: '手持感 / 镜头噪声', en: 'Handheld camera noise' },
      pitfalls: ['晃动太大会让人晕', '会放大抖色、纸纹等屏幕空间图案的闪烁'],
    },
    prompt: (v) => (Number(v) > 0.2 ? '镜头带轻微的手持晃动' : null),
    port: { godot: 'Camera3D.h_offset / v_offset 用 FastNoiseLite 驱动', godotLevel: 'script' },
  },
  {
    id: 'camera.letterbox', dim: 'camera', group: '镜头特性', label: '画幅黑边', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: '2.39', label: '2.39:1 宽银幕', desc: '上下黑边，电影感最强', prompt: '2.39:1 宽银幕画幅，上下有黑边' },
      { value: '1.85', label: '1.85:1 遮幅', desc: '轻度电影画幅', prompt: '1.85:1 电影画幅' },
      { value: '1.78', label: '16:9', desc: '标准宽屏：视口不是 16:9 时补黑边，让画面与 UI 按 16:9 构图（和参考截图并排对照时用）', prompt: '16:9 画幅' },
      { value: '1.33', label: '4:3', desc: '左右黑边，老电视或复古游戏', prompt: '4:3 画幅，左右黑边' },
      { value: '1', label: '1:1 方形', desc: '方形构图', prompt: '1:1 方形画幅' },
    ],
    explain: {
      plain: '给画面加黑边，改变画幅比例。宽银幕让过场和叙事更像电影，窄画幅更复古。',
      term: { zh: '画幅 / 遮幅', en: 'Aspect ratio / Letterbox' },
      pitfalls: ['游戏 UI 应留在黑边以内或专门放在黑边上，不要被裁掉'],
    },
    port: { godot: '全屏着色器画黑边，或改用固定宽高比的 SubViewport', godotLevel: 'post' },
  },
  {
    id: 'camera.bloom', dim: 'camera', group: '光晕', label: '辉光', kind: 'range', min: 0, max: 2, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '亮处向周围溢出光晕，霓虹和灯火的关键。',
      term: { zh: '泛光', en: 'Bloom' },
      pitfalls: ['阈值太低时白色卡通物体也会发光；更好的做法是只让发光体（emissive）参与'],
    },
    prompt: (v) => (Number(v) > 0.4 ? '亮处带柔和光晕' : null),
    port: { godot: 'Environment.glow_enabled + glow_hdr_threshold', godotLevel: 'builtin' },
  },
];

registerParams(defs);
