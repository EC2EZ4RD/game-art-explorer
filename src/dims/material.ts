import { all, shadingNot } from './conditions';
import { is, num, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const usesSpec = shadingNot('unlit', 'hatching', 'gooch');

const defs: ParamDef[] = [
  {
    id: 'material.preset', dim: 'material', group: '材料', label: '材料感', kind: 'choice', default: 'matte', rebuild: 'uniform',
    options: [
      { value: 'matte', label: '哑光', desc: '没有反光，颜色最纯', prompt: '表面哑光无反光，固有色纯净' },
      { value: 'plastic', label: '塑料玩具', desc: '光滑、有一个干净的小高光，像注塑玩具', prompt: '表面像注塑塑料玩具，光滑并带一个干净的小高光', port: { godot: 'StandardMaterial3D roughness≈0.25 + clearcoat', godotLevel: 'builtin' } },
      { value: 'clay', label: '黏土', desc: '柔和包裹光、细微的指纹凹凸', prompt: '表面像手捏黏土，柔和哑光并带细微指纹凹凸', pitfalls: ['凹凸噪声太强会像皮肤病'], port: { godot: 'StandardMaterial3D + detail normal（噪声法线）+ rim', godotLevel: 'shader' } },
      { value: 'ceramic', label: '陶瓷釉面', desc: '光滑釉面，边缘有反光', prompt: '表面像上釉陶瓷，光滑并在边缘带反光', port: { godot: 'StandardMaterial3D clearcoat=1，低 roughness', godotLevel: 'builtin' } },
      { value: 'felt', label: '毛毡', desc: '绒面，轮廓边缘泛白', prompt: '表面像羊毛毡，绒面在轮廓边缘泛出柔光', term: { zh: '绒面光泽', en: 'Sheen' }, port: { godot: 'StandardMaterial3D 没有 sheen，用 rim 近似或自定义 light()', godotLevel: 'shader' } },
      { value: 'metal', label: '金属', desc: '反射天空颜色，暗部很暗', prompt: '表面是金属，反射环境色', pitfalls: ['没有环境贴图时金属是黑的'] },
      { value: 'paper', label: '纸', desc: '纸纤维纹理、无高光', prompt: '表面像纸，带纤维纹理，没有高光', port: { godot: '三平面噪声纹理（triplanar）乘到 ALBEDO', godotLevel: 'shader' } },
      { value: 'stone', label: '石材', desc: '斑驳的颗粒', prompt: '表面带石材般的斑驳颗粒' },
      { value: 'wood', label: '木纹', desc: '沿高度方向的年轮条纹', prompt: '表面带木纹条纹' },
    ],
    explain: {
      plain: '物体看起来是什么做的。材料感来自高光、粗糙度、边缘光和表面纹理的组合，不是只换颜色。',
      lookAt: '高光的形状和大小、轮廓边缘、近看的表面纹理',
      pitfalls: ['PBR ≠ 写实：高饱和纯色 + 圆润形体 + PBR 得到的是玩具或黏土感'],
    },
    port: { godot: 'StandardMaterial3D 的 roughness / metallic / clearcoat / rim，或自定义 spatial 着色器', godotLevel: 'builtin' },
  },
  {
    id: 'material.roughness', dim: 'material', group: '反光', label: '粗糙度', kind: 'range', min: 0.05, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: all(usesSpec, (s: Values) => (is(s, 'material.preset', 'matte', 'paper') ? '哑光与纸张没有高光，粗糙度无效' : true)),
    explain: { plain: '表面多光滑。', ends: ['镜面般锐利的小高光', '大而柔的模糊高光'], term: { zh: '粗糙度', en: 'Roughness' } },
    port: { godot: 'StandardMaterial3D.roughness', godotLevel: 'builtin' },
  },
  {
    id: 'material.specular', dim: 'material', group: '反光', label: '高光强度', kind: 'range', min: 0, max: 1.5, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: all(usesSpec, (s: Values) => (is(s, 'material.preset', 'matte', 'paper') ? '哑光与纸张没有高光' : true)),
    explain: { plain: '高光有多亮。', ends: ['几乎不反光', '闪亮'], term: { zh: '镜面反射', en: 'Specular' } },
    port: { godot: 'StandardMaterial3D.specular / metallic_specular', godotLevel: 'builtin' },
  },
  {
    id: 'material.metalness', dim: 'material', group: '反光', label: '金属度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'shading.model', 'pbr') ? true : '只在物理材质（PBR）明暗下生效'),
    explain: { plain: '高光颜色跟随固有色（金属）还是白色（非金属）。', term: { zh: '金属度', en: 'Metalness' } },
    port: { godot: 'StandardMaterial3D.metallic', godotLevel: 'builtin' },
  },
  {
    id: 'material.bump', dim: 'material', group: '表面纹理', label: '表面起伏', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.15, rebuild: 'uniform',
    activeWhen: shadingNot('unlit'),
    explain: {
      plain: '用噪声扰动法线，让表面有细微凹凸（黏土指纹、石材颗粒）。',
      ends: ['完全光滑', '粗糙斑驳'],
      term: { zh: '法线扰动', en: 'Normal perturbation' },
      limits: '只改光照，不改轮廓；轮廓要靠几何',
    },
    port: { godot: 'detail_normal 贴图或着色器里 NORMAL_MAP', godotLevel: 'shader' },
  },
  {
    id: 'material.grain', dim: 'material', group: '表面纹理', label: '表面颗粒/纤维', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.2, rebuild: 'uniform',
    explain: {
      plain: '在固有色上叠加贴在物体表面（世界空间）的颗粒或纸纤维。贴在物体上，所以镜头移动时纹理跟着物体走。',
      ends: ['干净纯色', '明显的颗粒纹理'],
      lookAt: '镜头移动时纹理是跟物体走，还是贴在屏幕上不动',
      term: { zh: '三平面纹理', en: 'Triplanar texture' },
    },
    port: { godot: 'StandardMaterial3D.uv1_triplanar + 噪声纹理，或自定义着色器', godotLevel: 'builtin' },
  },
  {
    id: 'material.texture', dim: 'material', group: '表面纹理', label: '低清像素贴图', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无贴图', desc: '只用色板纯色' },
      { value: 'nearest', label: '点采样', desc: '低分辨率贴图不做过滤，纹素是清楚的方块（PS1、像素风 3D、方块游戏）', prompt: '低分辨率贴图用最近邻采样，纹素呈清晰的方块', term: { zh: '最近邻采样', en: 'Nearest / point sampling' } },
      { value: 'threePoint', label: '三点过滤（N64）', desc: '低清贴图被三角形内插糊开，带特有的斜向锯齿', prompt: '低清贴图带 N64 式三点过滤的模糊', term: { zh: '三点过滤', en: 'N64 three-point filtering' } },
      { value: 'bilinear', label: '平滑过滤', desc: '低清贴图双线性过滤，柔和但发糊', prompt: '低清贴图经过双线性过滤，略显模糊' },
    ],
    explain: {
      plain: '给墙、木头、屋顶和地面加上低分辨率的图案（砖、木板、瓦、泥土斑点），并选择它被放大时怎么显示。',
      lookAt: '靠近镜头的墙面与地面：纹素是方块、斜向糊开，还是柔和',
      tech: '图案在着色器里按整数纹素坐标程序生成（32×32），坐标用世界空间盒式投影，所以不需要贴图文件',
      pitfalls: ['贴图密度和像素化尺寸不匹配时，会出现大小不一的方块'],
    },
    port: { godot: 'art_style.gdshader 里同名的程序图案函数；用真实贴图时设 filter_nearest（点采样）或自写三点过滤', godotLevel: 'shader' },
  },
  {
    id: 'material.texScale', dim: 'material', group: '表面纹理', label: '贴图密度', kind: 'range', min: 4, max: 64, step: 1, default: 12, unit: '纹素/米', rebuild: 'uniform',
    activeWhen: (s) => (String(s['material.texture'] ?? 'none') === 'none' ? '需要先打开低清像素贴图' : true),
    explain: { plain: '每米多少个纹素。越小越"糊大块"，越大越细。', ends: ['大方块', '细密'] },
    port: { godot: 'art_style.gdshader 的 tex_scale', godotLevel: 'shader' },
  },
  {
    id: 'material.texAmount', dim: 'material', group: '表面纹理', label: '贴图强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: (s) => (String(s['material.texture'] ?? 'none') === 'none' ? '需要先打开低清像素贴图' : true),
    explain: { plain: '图案明暗有多明显。', ends: ['若隐若现', '强烈'] },
    port: { godot: 'art_style.gdshader 的 tex_amount', godotLevel: 'shader' },
  },
  {
    id: 'material.detail', dim: 'material', group: '表面纹理', label: '凹凸图案', kind: 'choice', default: 'noise', rebuild: 'uniform',
    options: [
      { value: 'noise', label: '程序噪声', desc: '均匀的噪声凹凸，没有方向和结构' },
      {
        value: 'clay', label: '黏土指纹', desc: '指纹、按压和刮痕（AI 生成的黏土高度图 → 法线）', prompt: '表面有手捏黏土的指纹、按压与刮痕',
        term: { zh: '指纹凹凸', en: 'Fingerprint normal map' }, status: 'live', port: { godot: 'StandardMaterial3D.normal_texture + uv1_triplanar，或 art_style.gdshader 的 detail_normal 三平面取样', godotLevel: 'builtin' },
      },
      {
        value: 'knit', label: '针织', desc: 'V 形平针针目，缝隙压暗（像毛线编织的世界）', prompt: '表面是毛线平针针织，V 形针目清晰',
        term: { zh: '平针', en: 'Stockinette knit' }, status: 'live', port: { godot: '同黏土：normal_texture + 三平面；针缝压暗用 detail_albedo 或着色器里乘高度', godotLevel: 'builtin' },
      },
    ],
    activeWhen: all(shadingNot('unlit'), (s: Values) => (num(s, 'material.bump') > 0 ? true : '需要先把"表面起伏"调到大于 0')),
    explain: {
      plain: '表面起伏用什么图案。噪声只是均匀的颗粒；黏土指纹和针织来自AI 生成的高度图，有结构、有方向。强度仍由"表面起伏"控制。',
      lookAt: '靠近镜头的角色与地面：指纹的划痕、针目的 V 形',
      tech: '三平面法线贴图：按世界坐标从三个方向取样，按法线分量的 4 次方混合（不需要 UV）',
      pitfalls: ['图案太密会变成噪点，太疏会像贴图没对齐'],
    },
    port: { godot: '三平面法线（uv1_triplanar 或着色器里手写三平面取样）', godotLevel: 'builtin' },
  },
  {
    id: 'material.detailScale', dim: 'material', group: '表面纹理', label: '图案密度', kind: 'range', min: 0.2, max: 6, step: 0.05, default: 1, unit: '块/米', rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'material.detail', 'noise') ? '需要先选一种凹凸图案素材' : true),
    explain: { plain: '每米重复几次图案。针织一块是 8 针。', ends: ['大块', '细密'] },
    port: { godot: 'uv1_scale（三平面）', godotLevel: 'builtin' },
  },
  {
    id: 'material.cun', dim: 'material', group: '皴法与做旧', label: '皴法', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'pima', label: '披麻皴', desc: '长而柔、略带波折的平行线，表现土质山坡（董源、黄公望）', prompt: '山石以披麻皴表现：长而柔的平行皴线', term: { zh: '披麻皴', en: 'Hemp-fiber texture strokes' }, status: 'live' },
      { value: 'fupi', label: '斧劈皴', desc: '侧锋刷出的楔形短笔，表现坚硬的岩壁（李唐、马远）', prompt: '山石以斧劈皴表现：侧锋刷出的楔形硬笔', term: { zh: '斧劈皴', en: 'Axe-cut texture strokes' }, status: 'live' },
      { value: 'midian', label: '米点皴', desc: '横向的湿墨点层层叠落，表现烟雨中的山（米芾、米友仁）', prompt: '山以米点皴表现：横向湿墨点层层积染', term: { zh: '米点皴', en: 'Mi dots' }, status: 'live' },
    ],
    explain: {
      plain: '中国山水画里表现山石纹理的笔法。皴笔贴在地形和岩石表面，按坡度和背光程度加浓：坡越陡、越背光，皴越密——这是画家的做法（皴擦在阴面）。',
      lookAt: '山体背光的一面、陡坡；转动镜头看皴笔是否跟着山走',
      term: { zh: '皴法', en: 'Cun (texture strokes)' },
      tech: '三平面取样AI 生成的皴法纹理（白 = 墨），乘以 (1 − 受光) 与坡度权重，向色板墨色压暗',
      pitfalls: ['皴法是平铺纹理，不会顺着山的结构线走向变化；真正的皴笔方向要沿山脊与转折'],
    },
    port: { godot: 'art_style.gdshader：uniform sampler2D cun_tex，三平面取样后在 light() 之前按坡度、在 fragment 里按太阳方向压暗', godotLevel: 'shader' },
  },
  {
    id: 'material.cunAmount', dim: 'material', group: '皴法与做旧', label: '皴擦浓度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'material.cun', 'none') ? '需要先选一种皴法' : true),
    explain: { plain: '皴笔有多浓。', ends: ['淡淡几笔', '浓重'] },
    port: { godot: 'cun_amount uniform', godotLevel: 'shader' },
  },
  {
    id: 'material.cunScale', dim: 'material', group: '皴法与做旧', label: '皴笔尺度', kind: 'range', min: 0.01, max: 0.4, step: 0.005, default: 0.05, unit: '块/米', rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'material.cun', 'none') ? '需要先选一种皴法' : true),
    explain: { plain: '皴法纹理每米重复几次。一张皴法图 1024 像素，大约让一个纹素对一个屏幕像素时皴笔最清楚；镜头拉远、山变大时调小。', ends: ['大笔', '细笔'] },
    port: { godot: 'cun_scale uniform', godotLevel: 'shader' },
  },
  {
    id: 'material.weathering', dim: 'material', group: '皴法与做旧', label: '剥落做旧', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '墙、木、石、屋顶的表层颜料剥落，露出底层。剥落从斑块中心向外扩，越调越旧。',
      ends: ['崭新', '大片剥落'],
      lookAt: '建筑墙面与木构：剥落边缘是否像真实的漆皮',
      term: { zh: '剥落遮罩', en: 'Peeling / wear mask' },
      tech: 'AI 生成的二值剥落图 → 环绕距离场（剥落区为 0、边界 0.5、完好区越远越接近 1）；着色器用阈值截取，所以连续调节时剥落从原有斑块向外长，而不是整片淡入',
      pitfalls: ['所有建筑用同一张平铺遮罩，凑近能看出重复'],
    },
    port: { godot: 'art_style.gdshader：三平面取样 wear_tex，ALBEDO = mix(ALBEDO, under_color, step(wear_tex, wear))', godotLevel: 'shader' },
  },
  {
    id: 'material.weatherScale', dim: 'material', group: '皴法与做旧', label: '剥落尺度', kind: 'range', min: 0.05, max: 2, step: 0.01, default: 0.22, unit: '块/米', rebuild: 'uniform', advanced: true,
    activeWhen: (s: Values) => (num(s, 'material.weathering') > 0 ? true : '需要先打开剥落做旧'),
    explain: { plain: '剥落图案每米重复几次。', ends: ['大块剥落', '细碎'] },
    port: { godot: 'wear_scale uniform', godotLevel: 'shader' },
  },
  {
    id: 'material.papercut', dim: 'material', group: '剪纸', label: '剪纸镂空', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'architecture', label: '建筑镂空', desc: '墙、屋顶、木构剪成冰裂梅花窗格（AI 生成的剪纸图样）', prompt: '建筑像红纸剪出的冰裂梅花窗格，可以透过镂空看到后面', status: 'live' },
      { value: 'vegetation', label: '植物镂空', desc: '树冠与花剪成镂空图样', prompt: '树冠像剪纸一样镂空', status: 'live' },
      { value: 'all', label: '全部镂空', desc: '除地面与角色外都镂空', prompt: '场景物件都像剪纸一样镂空', status: 'live' },
    ],
    explain: {
      plain: '把物体表面剪出镂空图样，透过空洞能看到后面——像窗花和剪纸灯笼。开了描边时，空洞里露出的是描边外壳的背面（墨色衬底），更像红纸贴在黑底上。',
      lookAt: '建筑和树冠的空洞；空洞后面露出的是什么',
      term: { zh: '剪纸镂空', en: 'Paper-cut lattice (alpha cutout)' },
      tech: '三平面取样剪纸遮罩，遮罩为 0 的地方 discard',
      pitfalls: ['阴影仍按实心物体计算（阴影 pass 没有镂空）'],
    },
    port: { godot: 'art_style.gdshader：ALPHA = mask；render_mode 加 depth_prepass_alpha，或 ALPHA_SCISSOR_THRESHOLD = 0.5', godotLevel: 'shader' },
  },
  {
    id: 'material.papercutScale', dim: 'material', group: '剪纸', label: '镂空尺度', kind: 'range', min: 0.05, max: 2, step: 0.01, default: 0.3, unit: '块/米', rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'material.papercut', 'none') ? '需要先打开剪纸镂空' : true),
    explain: { plain: '剪纸图样每米重复几次。', ends: ['大格', '细格'] },
    port: { godot: 'cut_scale uniform', godotLevel: 'shader' },
  },
  {
    id: 'material.windowFlower', dim: 'material', group: '剪纸', label: '窗花', kind: 'toggle', default: false, rebuild: 'uniform',
    explain: {
      plain: '在纸色部件（窗纸、灯笼、纸门）上贴红色团花窗花，颜色用色板的强调色。',
      lookAt: '中式建筑的窗格、灯笼',
      tech: '按主法线方向盒式投影，团花图样（AI 生成）平铺在纸色部件上',
    },
    port: { godot: 'art_style.gdshader：纸色材质里按 UV 取样窗花遮罩，mix(albedo, accent, mask)', godotLevel: 'shader' },
  },
  {
    id: 'material.variation', dim: 'material', group: '表面纹理', label: '个体色差', kind: 'range', min: 0, max: 0.4, step: 0.01, default: 0.08, rebuild: 'uniform',
    explain: { plain: '同类物件的颜色彼此略有不同，避免复制粘贴感。', ends: ['完全一致', '每个都有差别'] },
  },
];

registerParams(defs);
