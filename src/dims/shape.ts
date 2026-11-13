import { needCharacter } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef } from './types';

const defs: ParamDef[] = [
  {
    id: 'shape.roundness', dim: 'shape', group: '形状语言', label: '圆润度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.55, rebuild: 'scene',
    explain: {
      plain: '物体整体用圆还是方来概括：圆角、球形树冠、胶囊体。',
      ends: ['硬朗方正、棱角锋利', '圆润饱满、像糖果和玩具'],
      lookAt: '先看整体剪影，忽略表面纹理',
      term: { zh: '形状语言', en: 'Shape language' },
      pitfalls: ['圆润不只是提高平滑度：低多边形也可以有圆润的形状语言'],
    },
    prompt: (v) => (Number(v) > 0.7 ? '以圆润饱满的大形组织角色与物件，减少尖角' : Number(v) < 0.25 ? '以方正硬朗的形体为主，转折锋利' : null),
    port: { godot: '同一形状语言需要对应的资产或程序几何（CSG / SurfaceTool），不是材质参数', godotLevel: 'script' },
  },
  {
    id: 'shape.canopy', dim: 'shape', group: '形状语言', label: '树冠造型', kind: 'choice', default: 'cluster', rebuild: 'scene',
    options: [
      { value: 'cluster', label: '团簇圆冠', desc: '几团球叠成蓬松树冠', prompt: '阔叶树是几团圆球叠成的蓬松圆冠' },
      { value: 'single', label: '单球棒棒糖', desc: '一个球顶在细干上，最玩具', prompt: '树是棒棒糖般的单球圆冠' },
      { value: 'cone', label: '圆锥分层', desc: '层层圆锥，偏针叶', prompt: '树冠是层层叠叠的圆锥' },
      { value: 'poly', label: '多面体', desc: '十二面体等几何体，几何设计感', prompt: '树冠是棱角分明的多面体' },
      { value: 'tall', label: '修长柏树', desc: '细高的椭球', prompt: '树冠修长挺拔，像柏树' },
      { value: 'flat', label: '伞盖', desc: '扁平宽大的伞形，像热带或松盖', prompt: '树冠扁平宽大如伞盖' },
    ],
    explain: { plain: '树是画面里面积最大的"形状样本"，树冠造型直接决定世界的形状语言。', lookAt: '树的剪影' },
  },
  {
    id: 'shape.proportion', dim: 'shape', group: '比例', label: '粗壮 ↔ 修长', kind: 'range', min: -1, max: 1, step: 0.01, default: 0, rebuild: 'scene',
    explain: {
      plain: '物件整体变矮胖还是瘦高。',
      ends: ['矮胖敦实，像玩具', '瘦高修长，更优雅或更怪诞'],
      term: { zh: '比例', en: 'Proportion' },
      pitfalls: ['任意拉伸一个模型不能冒充不同文化或不同物种的造型'],
    },
    prompt: (v) => (Number(v) < -0.4 ? '物件比例矮胖敦实' : Number(v) > 0.4 ? '物件比例瘦高修长' : null),
  },
  {
    id: 'shape.headRatio', dim: 'shape', group: '比例', label: '头身比', kind: 'range', min: 1.5, max: 7.5, step: 0.1, default: 2.6, unit: '头身', rebuild: 'character',
    activeWhen: needCharacter,
    explain: {
      plain: '角色身高是几个头长。',
      ends: ['Q 版大头，可爱、玩具感', '写实比例，修长'],
      lookAt: '角色剪影、头和身体的比例',
      term: { zh: '头身比', en: 'Head-to-body ratio' },
    },
    prompt: (v) => (Number(v) < 3 ? `角色约 ${Number(v).toFixed(1)} 头身的 Q 版比例` : Number(v) > 5.5 ? `角色约 ${Number(v).toFixed(1)} 头身的写实比例` : `角色约 ${Number(v).toFixed(1)} 头身`),
  },
  {
    id: 'shape.character', dim: 'shape', group: '比例', label: '角色造型', kind: 'choice', default: 'clay', rebuild: 'character',
    options: [
      { value: 'capsule', label: '胶囊小人', desc: '胶囊身体 + 球头，最抽象', prompt: '角色是简洁的胶囊小人' },
      { value: 'clay', label: '黏土小人', desc: '圆头、圆手脚、小背包，像手捏黏土', prompt: '角色是圆头圆手脚的黏土小人' },
      { value: 'blocky', label: '积木小人', desc: '方块拼的身体', prompt: '角色由方块拼成' },
      { value: 'robot', label: '小机器人', desc: '圆柱身体、天线、发光眼', prompt: '角色是带天线和发光眼睛的小机器人' },
      { value: 'critter', label: '小动物', desc: '四足小狐狸，长耳与尾巴', prompt: '角色是四足小动物' },
    ],
    activeWhen: needCharacter,
    explain: { plain: '角色的结构。不同造型需要不同的部件，不是拉伸同一个模型。', lookAt: '角色剪影是否一眼可辨' },
  },
  {
    id: 'shape.detail', dim: 'shape', group: '细节分配', label: '细节频率', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'scene',
    explain: {
      plain: '物件上有多少小部件：枝杈、果实、屋檐小饰件、石缝。',
      ends: ['简洁的大形', '细节密集'],
      term: { zh: '细节频率', en: 'Detail frequency' },
      lookAt: '同一物件近看时有多少小结构',
    },
    prompt: (v) => (Number(v) < 0.2 ? '细节极简，只保留大形' : Number(v) > 0.75 ? '细节丰富，大形之上有许多小结构' : null),
  },
  {
    id: 'shape.variation', dim: 'shape', group: '细节分配', label: '大小差异', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'scene',
    explain: { plain: '同类物件的大小差多少。差异大才有大中小的节奏。', ends: ['整齐划一', '大中小错落'] },
  },
  {
    id: 'shape.carrier', dim: 'shape', group: '角色载体', label: '角色载体', kind: 'choice', default: 'model', rebuild: 'none',
    options: [
      { value: 'model', label: '三维模型', desc: '程序化三维角色（造型、头身比可连续调节）' },
      {
        value: 'pixelA', label: '像素精灵 A（SNES 16 色）', desc: '公告板像素精灵：4 方向 × 4 帧行走，按相机方向选行，最近邻放大，16 色',
        prompt: '角色是 16 色像素精灵，以公告板方式立在三维场景里', term: { zh: '公告板精灵', en: 'Billboard sprite' }, status: 'live',
        port: { godot: 'Sprite3D（billboard = Y 轴、texture_filter = NEAREST、hframes = 4、vframes = 4），脚本按相机相对方向选行', godotLevel: 'builtin' },
      },
      {
        value: 'pixelB', label: '像素精灵 B（HD-2D 细明暗）', desc: '同样 4 方向行走，24 色，像素明暗更细；配合景深、移轴与场景光就是 HD-2D 的做法',
        prompt: '角色是带细腻明暗的像素精灵，置于三维立体场景中（HD-2D）', term: { zh: 'HD-2D', en: 'HD-2D' }, status: 'live',
        port: { godot: '同 A；HD-2D 的精灵受光用 Sprite3D.shaded = true', godotLevel: 'builtin' },
      },
      {
        value: 'puppet', label: '纸片人（分件关节）', desc: '10 个纸片部件按关节串起来，走路时绕关节转动；只有侧面，朝左时翻转',
        prompt: '角色是手绘纸片人，头、躯干、四肢分件，走路时绕关节转动，像皮影或剪纸动画', term: { zh: '切片动画', en: 'Cut-out animation' }, status: 'live',
        port: { godot: 'Skeleton2D + Polygon2D 放进 SubViewport 再贴到 Sprite3D，或直接用 Node3D 层级 + Sprite3D 部件（本工具的做法）', godotLevel: 'script' },
      },
    ],
    activeWhen: needCharacter,
    explain: {
      plain: '角色用什么做：三维模型、立在三维场景里的像素精灵（HD-2D、公告板），还是分件的纸片人。精灵与纸片人是 AI 生成的二维素材，生成一次后直接复用。',
      lookAt: '转动镜头：精灵是否换到对应的方向；角色和场景的风格是否统一',
      term: { zh: '2D/3D 混合', en: '2D characters in 3D worlds' },
      pitfalls: ['像素精灵放大倍数不是整数时，像素会大小不一', '纸片人只有侧面：镜头转到正面时会看到它很薄'],
    },
    port: { godot: '见各选项', godotLevel: 'builtin' },
  },
  {
    id: 'shape.spriteSize', dim: 'shape', group: '角色载体', label: '精灵大小', kind: 'range', min: 0.5, max: 2.5, step: 0.05, default: 1, unit: '×', rebuild: 'none',
    activeWhen: (s) => (is(s, 'shape.carrier', 'model') ? '只对像素精灵与纸片人生效' : needCharacter(s)),
    explain: { plain: '精灵与纸片人相对场景的大小（1 = 约 1 米高）。' },
    port: { godot: 'Sprite3D.pixel_size', godotLevel: 'builtin' },
  },
  {
    id: 'shape.spriteLit', dim: 'shape', group: '角色载体', label: '精灵受光', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'none',
    activeWhen: (s) => (is(s, 'shape.carrier', 'model') ? '只对像素精灵与纸片人生效' : needCharacter(s)),
    explain: {
      plain: '精灵的颜色多大程度跟着场景光变（夜晚变暗、夕阳变暖）。0 = 永远原色（经典 2D）；1 = 完全受光（HD-2D）。',
      ends: ['原色，像贴上去的', '融入场景光'],
    },
    port: { godot: 'Sprite3D.shaded；或自定义 spatial 着色器乘 LIGHT_COLOR', godotLevel: 'builtin' },
  },
];

registerParams(defs);
