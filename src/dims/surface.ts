import { all, mediumIs } from './conditions';
import { is, num, registerParams } from './registry';
import type { OptionDef, ParamDef, Values } from './types';

/*
 * 画面媒介：在三维渲染结果之上，按媒介规则重新"画"一遍。
 * 每种媒介写明能做到的部分和缺的部分；缺口会进入待办，而不是被当成完成。
 */

export const MEDIUMS: OptionDef[] = [
  { value: 'none', label: '无（直接三维渲染）' },
  {
    value: 'watercolor', label: '水彩', term: { zh: '水彩', en: 'Watercolor' },
    desc: '色块抽象、边缘积色、纸纹颗粒、轻微渗色',
    prompt: '水彩画面：透明色层，边缘颜料沉积形成深色边，纸纹颗粒，轻微渗色，留出纸白',
    techPrompt: '多 pass：抽象（模糊/Kuwahara）→ 边缘加深（模糊前后差）→ 颗粒（纸高度×颜料浓度）→ 渗色（UV 噪声偏移）→ 纸纹',
    pitfalls: ['只叠一张纸纹不等于水彩，必须有边缘加深和渗色'],
    status: 'partial',
    port: { godot: '全屏 canvas_item 着色器（hint_screen_texture）多个 BackBufferCopy 级联', godotLevel: 'post' },
  },
  {
    value: 'gouache', label: '水粉', term: { zh: '水粉', en: 'Gouache' },
    desc: '不透明、哑光的平涂色块，边缘干净',
    prompt: '水粉画面：不透明哑光的平涂色块，2~4 阶明暗，颗粒细腻',
    status: 'partial', port: { godot: '全屏着色器：色阶化 + 小半径 Kuwahara + 颗粒', godotLevel: 'post' },
  },
  {
    value: 'oil', label: '油画厚涂', term: { zh: 'Kuwahara 滤镜', en: 'Kuwahara filter' },
    desc: '笔触色块、保留边缘，可叠加厚涂光照与画布',
    prompt: '油画厚涂：可见的笔触色块，边缘保留，颜料有厚度',
    pitfalls: ['经典 Kuwahara 会出方块伪影（"笔触算法"选「顺着形体走」可消除）；细线会被吃掉，线条要放在它之后', '屏幕空间笔触在镜头移动时会相对物体滑动'],
    status: 'partial', port: { godot: '全屏着色器 Kuwahara（经典 4 象限，或各向异性 8 扇区 + 就地估算的结构张量）', godotLevel: 'post' },
  },
  {
    value: 'ink', label: '水墨', term: { zh: '水墨', en: 'Ink wash / Sumi-e' },
    desc: '墨分浓淡、宣纸留白、边缘晕染、一点朱砂',
    prompt: '水墨画面：墨分浓淡，远景与天空化为宣纸留白，边缘有晕染与飞白，仅以少量朱砂点缀',
    techPrompt: '亮度 → 墨浓度分级查表；雾色设为纸色形成留白；边缘加深 + 噪声干笔；保留强调色角色的朱红',
    pitfalls: ['只做黑白滤镜不是水墨：需要留白、浓淡层次和笔势'],
    status: 'partial', port: { godot: '全屏着色器；墨阶与留白可移植，笔势需要专用笔刷素材', godotLevel: 'post' },
  },
  {
    value: 'gongbi', label: '工笔淡彩', term: { zh: '工笔淡彩', en: 'Gongbi with light color' },
    desc: '细色线勾勒结构，透明淡彩，分染近似，绢色底',
    prompt: '工笔淡彩：以细谨的色线交代结构，其上施透明淡彩并在形体边缘做分染，绢色底子',
    pitfalls: ['浅色材质 + 统一外轮廓线不等于工笔：工笔需要有主次的内部线描与层层设色'],
    status: 'partial',
    port: { godot: '全屏着色器可做淡彩与分染近似；真正的勾线需要手绘线稿贴图', godotLevel: 'hard' },
  },
  {
    value: 'sketch', label: '铅笔素描', term: { zh: '素描', en: 'Graphite sketch' },
    desc: '灰度、纸纹、按明暗排线',
    prompt: '铅笔素描：灰度明暗以排线表现，纸纹清晰',
    status: 'partial', port: { godot: '全屏着色器（亮度阈值多层排线）', godotLevel: 'post' },
  },
  {
    value: 'crosshatch', label: '钢笔交叉排线', term: { zh: '交叉排线', en: 'Cross-hatching' },
    desc: '墨线排线，暗处层层交叉，墨稿感',
    prompt: '钢笔墨稿：明暗用交叉排线表现，暗处线层叠加',
    port: { godot: '全屏着色器', godotLevel: 'post' },
  },
  {
    value: 'halftone', label: '漫画网点', term: { zh: '网点 / 网屏', en: 'Halftone / Screentone' },
    desc: '用网点大小表现明暗，像印刷漫画',
    prompt: '漫画网点：用网点大小表现明暗，色块干净',
    pitfalls: ['屏幕空间网点在镜头移动时会漂浮（漫画风通常可以接受）'],
    port: { godot: '全屏着色器（旋转网格 + 圆点阈值）', godotLevel: 'post' },
  },
  {
    value: 'woodcut', label: '版画木刻', term: { zh: '木刻', en: 'Woodcut / Linocut' },
    desc: '黑白二值、刀刻纹沿明暗走',
    prompt: '木刻版画：黑白二值，刀刻纹路随明暗疏密变化',
    status: 'partial', port: { godot: '全屏着色器', godotLevel: 'post' },
  },
  {
    value: 'posterize', label: '色阶海报', term: { zh: '色调分离', en: 'Posterize' },
    desc: '整个画面量化成几级色块',
    prompt: '整个画面量化为少量色块，像招贴画',
    pitfalls: ['RGB 三通道分别量化会色相跳变；这里在感知亮度上量化'],
    port: { godot: '全屏着色器 floor(c*n)/n', godotLevel: 'post' },
  },
  {
    value: 'riso', label: '孔版印刷', term: { zh: '孔版印刷', en: 'Risograph' },
    desc: '2~3 种专色叠印，套版错位，颗粒',
    prompt: '孔版印刷：两三种荧光专色叠印，套版轻微错位，带颗粒',
    status: 'partial', port: { godot: '全屏着色器（分色 + 偏移 + 正片叠底）', godotLevel: 'post' },
  },
  {
    value: 'stainedGlass', label: '彩色玻璃', term: { zh: '彩色玻璃', en: 'Stained glass' },
    desc: 'Voronoi 色块 + 黑色铅条',
    prompt: '彩色玻璃：不规则色块，被黑色铅条分隔',
    port: { godot: '全屏着色器（Voronoi）', godotLevel: 'post' },
  },
  {
    value: 'mosaic', label: '马赛克', term: { zh: '镶嵌', en: 'Mosaic' },
    desc: '方块镶嵌 + 砖缝',
    prompt: '马赛克镶嵌：小方块色片与砖缝',
    port: { godot: '全屏着色器', godotLevel: 'post' },
  },
  {
    value: 'ascii', label: '字符画', term: { zh: 'ASCII 字符画', en: 'ASCII art' },
    desc: '用字符的疏密表现明暗',
    prompt: '字符画：画面由字符构成，明暗靠字符疏密',
    port: { godot: '全屏着色器 + 字符图集', godotLevel: 'post' },
  },
];

const medium = (s: Values) => String(s['surface.medium'] ?? 'none');
const kuwaharaAniso = (s: Values): true | string => (is(s, 'surface.kuwahara', 'anisotropic') ? true : '需要"笔触算法"选择「顺着形体走」');
const vhsOnly = (s: Values): true | string => (is(s, 'surface.screen', 'vhs') ? true : '只在显示设备为「VHS 录像带」时生效');

const defs: ParamDef[] = [
  {
    id: 'surface.medium', dim: 'surface', group: '媒介', label: '画面媒介', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: MEDIUMS,
    explain: {
      plain: '在三维画面之上，按某种绘画或印刷媒介的规则重新"画"一遍。',
      lookAt: '色块边缘、纸面、笔触、网点',
      limits: '后处理只能模拟媒介的一部分规则；完整的笔势、勾线往往需要专用素材，工具会标明缺口',
    },
  },
  {
    id: 'surface.strength', dim: 'surface', group: '媒介', label: '媒介强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.85, rebuild: 'uniform',
    activeWhen: (s) => (medium(s) === 'none' ? '需要先选择一种画面媒介' : true),
    explain: { plain: '媒介效果和原始三维画面的混合比例。', ends: ['接近原画面', '完全媒介化'] },
  },
  {
    id: 'surface.scale', dim: 'surface', group: '媒介', label: '笔触/颗粒尺度', kind: 'range', min: 0.5, max: 3, step: 0.05, default: 1, rebuild: 'uniform',
    activeWhen: (s) => (medium(s) === 'none' ? '需要先选择一种画面媒介' : true),
    explain: { plain: '笔触、网点、色块、字符的大小。', ends: ['细腻', '粗犷'] },
  },
  {
    id: 'surface.edgeDarken', dim: 'surface', group: '水性媒介', label: '边缘积色', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: mediumIs('watercolor', 'ink', 'gongbi'),
    explain: { plain: '颜料在色块边缘沉积形成的深色边。', term: { zh: '边缘加深', en: 'Edge darkening' } },
  },
  {
    id: 'surface.bleed', dim: 'surface', group: '水性媒介', label: '渗色晕染', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'uniform',
    activeWhen: mediumIs('watercolor', 'ink', 'gongbi'),
    explain: { plain: '颜色越过边界向外渗开。', term: { zh: '渗色', en: 'Color bleeding' } },
  },
  {
    id: 'surface.inkLevels', dim: 'surface', group: '水墨', label: '墨色层次', kind: 'int', min: 2, max: 7, step: 1, default: 4, rebuild: 'uniform',
    activeWhen: mediumIs('ink', 'woodcut', 'posterize', 'gouache'),
    explain: { plain: '墨分几色 / 色调分几级。', ends: ['浓淡分明', '层次细腻'], term: { zh: '墨分五色', en: 'Ink tonal levels' } },
  },
  {
    id: 'surface.keepAccent', dim: 'surface', group: '水墨', label: '保留强调色', kind: 'toggle', default: true, rebuild: 'uniform',
    activeWhen: mediumIs('ink', 'sketch', 'crosshatch', 'woodcut'),
    explain: { plain: '黑白媒介里保留"强调色"角色的颜色，像水墨画上的朱印、黑白漫画里的一点红。' },
  },
  {
    id: 'surface.radius', dim: 'surface', group: '笔触', label: '笔触半径', kind: 'int', min: 2, max: 8, step: 1, default: 4, rebuild: 'uniform',
    activeWhen: mediumIs('oil', 'watercolor', 'gouache'),
    explain: {
      plain: '笔刷有多大：每个像素从周围多大的范围里挑一块最"平"的颜色。',
      ends: ['细笔，细节保留多', '大笔刷，只剩大色块'],
      lookAt: '树叶、窗格、远处小物体还认不认得出来',
      pitfalls: [
        '经典算法的开销随半径的平方增长（半径 8 约是半径 4 的 3 倍）',
        '各向异性算法的取样数封顶：笔刷半径（乘上"笔触/颗粒尺度"）超过 6 时只是取样变稀，不会更慢，但大色块边缘可能出现细碎颗粒',
        '水粉实际用约 0.75 倍、水彩约 0.85 倍的半径（这两种媒介本来就用较小的笔）；经典算法取整，相邻两档偶尔看起来一样',
        '比笔刷还细的线条（电线、细枝、描边）会被抹掉：线条要放在它之后画',
      ],
    },
  },
  {
    id: 'surface.kuwahara', dim: 'surface', group: '笔触', label: '笔触算法', kind: 'choice', default: 'anisotropic', rebuild: 'uniform',
    activeWhen: mediumIs('oil', 'watercolor', 'gouache'),
    options: [
      {
        value: 'classic', label: '方块四分（经典 Kuwahara）', term: { zh: '经典 Kuwahara 滤镜', en: 'Kuwahara filter' },
        desc: '把每个像素周围分成左上、右上、左下、右下四块正方形，取颜色最"平"的那块的平均色。色块边缘干净，但笔触是横平竖直的小方块。',
        prompt: '色块化的笔触，边缘保留但没有明显的笔触方向',
        techPrompt: '4 象限 Kuwahara：每个象限求均值与方差，按方差加权（方差越小权重越大）',
        pitfalls: ['大半径时出现方块与阶梯状边缘', '没有笔触方向：色块不会顺着形体走'],
        status: 'live',
        port: { godot: '全屏着色器：4 象限 Kuwahara（与网页版同公式）', godotLevel: 'post' },
      },
      {
        value: 'anisotropic', label: '顺着形体走（各向异性 Kuwahara）', term: { zh: '各向异性 Kuwahara 滤镜', en: 'Anisotropic Kuwahara filter' },
        desc: '先看清每一处颜色变化的走向，再用一支顺着走向拉长的椭圆笔刷去取色：色块沿轮廓和明暗交界被拉成长条，像一笔一笔刷出来的。',
        prompt: '笔触顺着形体轮廓与明暗交界的走向拉长，像一笔一笔刷出来的颜料块',
        techPrompt: '结构张量（Sobel）→ 高斯平滑 σ≈2px → 特征分解得到切线方向与各向异性 A → 椭圆核（α=1）8 扇区多项式权重，扇区按 1/σ^q（q=8）加权（Kyprianidis 2009 / 2010 / 2011）；取样网格封顶',
        pitfalls: ['平坦的大色块（天空、白墙）里没有可靠走向：那里笔刷接近圆形，刷痕按低频噪声大致横向走'],
        status: 'live',
        port: { godot: '单个全屏着色器：结构张量在 5×5 邻域里就地估算（无单独缓冲与分离平滑），刷痕走直线', godotLevel: 'post' },
      },
    ],
    explain: {
      plain: '油画、水粉、水彩共用的"把画面刷成色块"的算法。',
      lookAt: '色块的形状：是方块状，还是顺着轮廓、明暗交界拉长的长条；树冠边缘、屋檐、山脊最明显',
      term: { zh: 'Kuwahara 滤镜', en: 'Kuwahara filter' },
      tech: '经典：4 个正方形象限；各向异性：先求结构张量得到每处的走向，再用沿走向拉长的椭圆分 8 个扇区挑色',
      pitfalls: [
        '比笔触还细的线（电线、细枝、描边）会被抹掉：本工具的"内部线"在它之后画，不受影响；模型外壳描边在它之前画，会被抹细，需要加粗',
        '各向异性版比经典版贵：多 3 个全屏 pass（求张量、两次平滑），主滤波每像素最多 113 次取样；1080p 下高端卡比经典半径 5 每帧多约 1.5ms，中端卡约多 5ms',
      ],
      limits: '屏幕空间算法：笔触走向由画面颜色决定，不知道模型真实的结构与 UV；要严格沿模型走、且贴在物体上的笔触，需要笔触贴图',
    },
  },
  {
    id: 'surface.strokeFlow', dim: 'surface', group: '笔触', label: '刷痕纹理', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: all(mediumIs('oil', 'watercolor', 'gouache'), kuwaharaAniso),
    explain: {
      plain: '在色块里加上一道道顺着形体走向的刷痕，像鬃毛笔拖过颜料留下的细条纹。默认关闭（0），油画、水粉、水彩配方各自设了合适的值。',
      ends: ['只有色块、没有刷痕（默认）', '刷痕明显'],
      lookAt: '大块颜色内部（墙面、地面、天空）的细条纹，以及条纹在轮廓附近是否跟着弯',
      term: { zh: '线积分卷积', en: 'Line Integral Convolution (LIC)' },
      tech: '沿结构张量的切线方向双向各走 8 步（中点法，每步重新查张量），沿途平均两层值噪声；放大后乘到颜色上。粗细随距离按半个倍频程分档并交叉淡化',
      pitfalls: [
        '刷痕钉在屏幕上：镜头静止时稳定，镜头移动时刷痕相对物体滑动（浴帘效应）',
        '油画配合"厚涂起伏"会把刷痕变成凸起的颜料脊（打开刷痕后油画原来的竖直鬃毛纹自动去掉）；水彩宜轻（0.2 以下），否则像油画',
        '天空、白墙这类没有明暗变化的地方没有可靠走向：那里刷痕自动减弱到约三成，按低频噪声大致横向走',
      ],
      limits: '屏幕空间刷痕不知道物体的 UV；要让笔触牢牢贴在物体上，需要笔触贴图或物体空间方案',
    },
    prompt: (v) => (Number(v) > 0.2 ? '色块内部有顺着形体走向的细密刷痕' : null),
    port: { godot: 'post_medium.gdshader 的 stroke_flow：沿中心像素方向走直线积分噪声（网页版沿流线弯曲）', godotLevel: 'post' },
  },
  {
    id: 'surface.strokeLength', dim: 'surface', group: '笔触', label: '刷痕长度', kind: 'range', min: 4, max: 40, step: 1, unit: 'px', default: 14, rebuild: 'uniform', advanced: true,
    activeWhen: all(mediumIs('oil', 'watercolor', 'gouache'), kuwaharaAniso, (s) => (num(s, 'surface.strokeFlow') > 0 ? true : '需要先把「刷痕纹理」调到 0 以上')),
    explain: {
      plain: '一道刷痕拉多长（按画面像素计，会随"笔触/颗粒尺度"和距离一起缩放）。',
      ends: ['短促的点笔', '长长的拖笔'],
      lookAt: '刷痕条纹的长短；在弯曲的轮廓边看它是否顺着弯',
      pitfalls: ['太长时在急转弯处被拉直、跨过细小形体'],
    },
    port: { godot: 'post_medium.gdshader 的 stroke_length', godotLevel: 'post' },
  },
  {
    id: 'surface.strokeDepth', dim: 'surface', group: '笔触', label: '远景笔触化', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: mediumIs('oil', 'watercolor', 'gouache'),
    explain: {
      plain: '让笔触随距离变化：近处画得细，远处用大笔刷带过，远景溶解成色块，像画家对远处只"点到为止"。',
      ends: ['远近笔触一样大', '近处细腻、远处粗放'],
      lookAt: '远山、远处树林与近景物体的笔触大小对比；分界在镜头注视的位置',
      term: { zh: '随距离增强的笔触化', en: 'Depth-dependent stroke size' },
      tech: '按深度缓冲的线性深度缩放笔刷半径与刷痕尺寸：透视相机 2^(0.5·强度·clamp(log2(深度/注视距离), -1.5, 2.5))，强度 1 时近处约 0.6 倍、远处约 2.4 倍；正交相机改按深度差占画面高度的比例',
      pitfalls: [
        '远处笔刷变大但取样数不变：取样变稀，远景可能出现细碎颗粒',
        '正交（等距）镜头里远近差别本来就小，效果较弱',
      ],
      limits: '只改变笔触大小，不做印象派那种补色并置的短笔点',
    },
    prompt: (v) => (Number(v) > 0.2 ? '笔触随距离变化：近处细腻，远景溶解为大笔触色块' : null),
    port: { godot: 'post_medium.gdshader 读 hint_depth_texture 求线性深度，同一公式缩放笔刷（注视距离 focus_dist 按测试台相机写死）', godotLevel: 'post' },
  },
  {
    id: 'surface.impasto', dim: 'surface', group: '笔触', label: '厚涂起伏', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'uniform',
    activeWhen: mediumIs('oil'),
    explain: { plain: '颜料厚度在光下产生的起伏感。', term: { zh: '厚涂', en: 'Impasto' } },
  },
  {
    id: 'surface.spotColors', dim: 'surface', group: '印刷', label: '专色组合', kind: 'choice', default: 'pinkBlue', rebuild: 'uniform',
    options: [
      { value: 'pinkBlue', label: '荧光粉 + 蓝' },
      { value: 'pinkBlueYellow', label: '荧光粉 + 蓝 + 黄' },
      { value: 'redTeal', label: '红 + 青绿' },
      { value: 'orangeNavy', label: '橙 + 藏青' },
    ],
    activeWhen: mediumIs('riso'),
    explain: { plain: '孔版印刷使用的油墨颜色。' },
  },
  /* ---------- 纸张与画面颗粒（任何媒介都可叠加） ---------- */
  {
    id: 'surface.paper', dim: 'surface', group: '纸张', label: '纸纹', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '让整个画面像印在纸上。',
      ends: ['没有纸纹', '明显的纸纹'],
      lookAt: '大片平涂色块里的纹理，以及镜头移动时纹理的反应',
      pitfalls: ['屏幕空间纸纹会出现浴帘效应：纹理钉在屏幕上，物体从它"后面"滑过'],
    },
    prompt: (v) => (Number(v) > 0.2 ? '画面带有纸张纹理' : null),
    port: { godot: '全屏 canvas_item 着色器叠加纸纹贴图', godotLevel: 'post' },
  },
  {
    id: 'surface.paperColor', dim: 'surface', group: '纸张', label: '纸色混入', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: { plain: '整体向色板的纸色偏移，像颜料薄薄地画在有色纸上。选了牛皮纸、绢本这类有色纸素材时，用纸本身的颜色。' },
  },
  {
    id: 'surface.paperTex', dim: 'surface', group: '纸张', label: '纸张素材', kind: 'choice', default: 'noise', rebuild: 'uniform',
    options: [
      { value: 'noise', label: '程序噪声', desc: '不用素材，噪声拼出的纸纹（偏均匀，看不出纤维）' },
      { value: 'xuan', label: '宣纸', desc: '长纤维与云状纸浆起伏；水墨的晕染会顺着纤维走', prompt: '宣纸底子，可见长纤维与云状纸浆', term: { zh: '宣纸', en: 'Xuan paper' }, status: 'live' },
      { value: 'coldPress', label: '冷压水彩纸', desc: '粗颗粒起伏：水彩颜料沉在纸纹低处（颗粒沉淀）', prompt: '冷压水彩纸的粗颗粒纸纹，颜料沉积在凹处', term: { zh: '冷压纸', en: 'Cold-press paper' }, status: 'live' },
      { value: 'hotPress', label: '热压水彩纸', desc: '细腻平滑，几乎只有淡淡的毡纹', prompt: '热压水彩纸，表面细腻平滑', term: { zh: '热压纸', en: 'Hot-press paper' }, status: 'live' },
      { value: 'kraft', label: '牛皮纸', desc: '棕色纤维纸，带深浅斑点；纸色混入时用纸本身的棕色', prompt: '牛皮纸底子，棕色带纤维斑点', status: 'live' },
      { value: 'silk', label: '绢本', desc: '经纬细织与旧绢斑驳；工笔淡彩的底子', prompt: '绢本底子，细密经纬与陈旧斑驳', term: { zh: '绢本', en: 'Silk ground' }, status: 'live' },
    ],
    activeWhen: (s: Values) => (num(s, 'surface.paper') > 0 || num(s, 'surface.paperColor') > 0 || is(s, 'surface.medium', 'watercolor', 'ink', 'gongbi', 'sketch', 'gouache')
      ? true : '纸纹与纸色混入都为 0，且当前媒介不画在纸上'),
    explain: {
      plain: '纸纹用哪种纸。素材来自AI 生成的扫描质感（一次生成，所有场景复用）。水彩的颗粒、水墨的纤维晕染、工笔的绢底、素描的纸面都会换成这张纸。',
      lookAt: '大片平涂色块与天空里的纸纹；水彩暗部的颗粒；水墨墨晕的边缘',
      tech: '灰度纸纹图按屏幕像素平铺（1 纹素 ≈ 1 像素 × 纸纹尺度）；媒介 pass 读它代替程序噪声',
      pitfalls: ['纸纹钉在屏幕上：镜头移动时物体从纸"后面"滑过，这本来就是画布的性质'],
    },
    port: { godot: 'post_overlay / post_medium 里 uniform sampler2D paper_tex（repeat_enable），按 SCREEN_UV × 屏幕尺寸 / 1024 取样；导出包附带纸纹 PNG', godotLevel: 'post' },
  },
  {
    id: 'surface.paperTexScale', dim: 'surface', group: '纸张', label: '纸纹尺度', kind: 'range', min: 0.25, max: 3, step: 0.05, default: 1, unit: '×', rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'surface.paperTex', 'noise') ? '需要先选一种纸张素材' : true),
    explain: { plain: '纸纹放大多少倍。1 = 一个纸纹像素对一个画面像素。', ends: ['细密', '粗大'] },
    port: { godot: 'paper_scale uniform', godotLevel: 'post' },
  },
  /* ---------- 物体空间笔触（Meier 1996）：笔刷素材贴在物体表面 ---------- */
  {
    id: 'surface.strokes', dim: 'surface', group: '笔触', label: '物体空间笔触', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'long', label: '毛笔长笔', desc: '8 种起收笔的毛笔笔触（藏锋、露锋、提按、飞白、湿笔……），顺着表面走向铺开',
        prompt: '画面由贴在物体表面的毛笔笔触铺成，笔触有起收与飞白，顺着形体走向', term: { zh: '物体空间笔触', en: 'Object-space brush strokes (Meier 1996)' }, status: 'partial',
      },
      {
        value: 'marks', label: '短笔点', desc: '16 种点、叶、苔点、干擦：适合点彩、米点、苔点',
        prompt: '画面由贴在物体表面的短笔点堆成，像点彩或苔点', status: 'partial',
      },
    ],
    explain: {
      plain: '在物体表面撒上几万个"笔触粒子"，每个粒子画一笔真实的毛笔笔触（AI 生成的笔刷素材），颜色取它所在位置的画面颜色。笔触钉在物体上，转动镜头时跟着物体走，不会像屏幕空间滤镜那样滑动。',
      lookAt: '转动镜头：笔触是否跟着物体；笔触方向是否顺着表面',
      term: { zh: '笔触粒子', en: 'Painterly rendering for animation' },
      tech: '场景构建后按面积在静态网格表面随机撒点（位置、法线、随机数）→ 每帧用实例化四边形画：颜色取调色后画面在该点的颜色，方向取表面切线在屏幕上的投影，顶点着色器读深度做遮挡测试，背向镜头的点剔除',
      pitfalls: ['只有静态场景铺笔触：角色与云仍是三维渲染', '笔触太大时形体会糊掉，太小又像噪点'],
      limits: '世界弯曲、风摆、PS1 吸附不作用在笔触上；体素模式只在方块中心撒点',
    },
    status: 'partial',
    port: { godot: 'MultiMeshInstance3D（每个实例一个四边形）+ 自定义 spatial 着色器：billboard + 按屏幕颜色上色（hint_screen_texture）+ 深度测试；撒点在 GDScript 里用 MeshDataTool 按面积采样', godotLevel: 'script' },
  },
  {
    id: 'surface.strokeDensity', dim: 'surface', group: '笔触', label: '笔触数量', kind: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5, rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'surface.strokes', 'none') ? '需要先打开物体空间笔触' : true),
    explain: { plain: '撒多少笔（1 = 约 6 万笔）。', ends: ['稀疏，露出底下的画面', '满铺'] },
    port: { godot: 'MultiMesh.instance_count', godotLevel: 'script' },
  },
  {
    id: 'surface.strokeSize', dim: 'surface', group: '笔触', label: '笔触大小', kind: 'range', min: 0.05, max: 1.2, step: 0.01, default: 0.35, unit: '米', rebuild: 'uniform',
    activeWhen: (s: Values) => (is(s, 'surface.strokes', 'none') ? '需要先打开物体空间笔触' : true),
    explain: { plain: '每一笔在世界里有多长。笔触按世界尺寸画，所以近处笔大、远处笔小。', ends: ['细碎', '大笔触'] },
    port: { godot: 'stroke_size uniform', godotLevel: 'script' },
  },
  {
    id: 'surface.strokeColor', dim: 'surface', group: '笔触', label: '笔触颜色', kind: 'choice', default: 'scene', rebuild: 'uniform',
    options: [
      { value: 'scene', label: '取画面颜色', desc: '每笔的颜色取它所在位置的画面颜色（油画、水粉、点彩）' },
      { value: 'ink', label: '墨色（暗处更多）', desc: '笔触用色板的墨色，只在暗处出现：亮处留白，暗处笔密（水墨、钢笔）' },
    ],
    activeWhen: (s: Values) => (is(s, 'surface.strokes', 'none') ? '需要先打开物体空间笔触' : true),
    explain: { plain: '笔触用什么颜色。' },
    port: { godot: 'color_mode uniform', godotLevel: 'script' },
  },
  {
    id: 'surface.screen', dim: 'surface', group: '显示与胶片', label: '显示设备', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'crt', label: 'CRT 显像管', desc: '扫描线、屏幕弧度、荧光渗色、暗角', prompt: '模拟 CRT 显像管：扫描线、屏幕弧度与渗色' },
      {
        value: 'vhs', label: 'VHS 录像带', term: { zh: 'VHS 录像带', en: 'VHS tape' },
        desc: '颜色糊开并往右拖、轮廓带亮边、每行轻微抖动、底部几行错位，偶尔闪过白色掉磁线；跟踪不良调高后有滚动的噪声带',
        prompt: '模拟 VHS 录像带：颜色向右渗开拖影，轮廓带亮边，画面轻微横向抖动，底部磁头切换错位，零星白色掉磁线与横向雪花',
        techPrompt: '全屏后处理：RGB→YIQ，亮度窄模糊 + 锐化过冲；色度先横向预模糊到半分辨率，再宽模糊 + 右移（色度延迟）；每行随机横移 + 正弦慢晃，滚动的跟踪噪声带，底部磁头切换区，掉磁白线，沿扫描线拉长的雪花；噪声按磁带帧号（约 30 帧/秒）取，同一时刻结果固定',
        pitfalls: ['只做红蓝错位（色差）不像录像带：关键是颜色比亮度糊得多、并且往右拖', '整局游戏一直开着很累眼，常见做法是只在过场、回放或"录像"界面使用'],
        port: { godot: 'post_vhs.gdshader（canvas_item 全屏着色器，接在 post_overlay 之后，与网页版同一组公式；颜色预模糊改用屏幕纹理的 mip 层）', godotLevel: 'post' },
      },
      { value: 'lcd', label: '掌机 LCD 网格', desc: '像素之间的网格缝', prompt: '模拟掌机 LCD 像素网格' },
    ],
    explain: { plain: '模拟画面经过某种显示设备或录像介质。选"VHS 录像带"后，下面的"磁带磨损""跟踪不良"可以细调。', lookAt: '画面整体的质感：扫描线、颜色拖影、噪声带、像素缝' },
    port: { godot: '全屏着色器（Godot 社区有大量 CRT/VHS shader）', godotLevel: 'post' },
  },
  {
    id: 'surface.vhsWear', dim: 'surface', group: '显示与胶片', label: '磁带磨损', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'uniform',
    activeWhen: vhsOnly,
    explain: {
      plain: '录像带被反复播放、放久了的程度：颜色更糊更淡、往右拖得更远，轮廓旁的亮边更明显，横向雪花和白色掉磁线更多。',
      ends: ['新带子：只是略糊、颜色略往右偏，几乎没有掉磁线', '翻录多次的旧带：颜色化开、满屏雪花和白线'],
      lookAt: '红色、蓝色物体的右侧（颜色拖出的"影子"）、深色轮廓旁的亮边、偶尔闪过的白色横线',
      term: { zh: '磁带劣化 / 翻录损失', en: 'Tape wear / generation loss' },
      tech: '转到 YIQ：亮度 13 点小步长横向模糊，宽窄两种模糊之差做锐化过冲；颜色先横向预模糊到半分辨率，再 9 点大范围横向模糊并整体右移（色度延迟）；磨损同时放大模糊宽度、雪花和掉磁概率，降低饱和度、抬高黑位。噪声按约 30 帧/秒的磁带帧号取，同一时刻结果固定。',
      pitfalls: ['录像带的糊是"横向"的，而且颜色糊得远比亮度多；整体加高斯模糊不像录像带', '磨损太大时文字和小物体会认不出来，恐怖类作品常用 0.3~0.6'],
    },
    prompt: (v, s) => (is(s, 'surface.screen', 'vhs') ? (Number(v) > 0.6 ? '录像带严重磨损：颜色化开拖影，满屏雪花与白色掉磁线' : Number(v) < 0.2 ? '几乎全新的录像带：只有轻微的颜色右偏和柔化' : null) : null),
    port: { godot: 'post_vhs.gdshader 的 wear 参数', godotLevel: 'post' },
  },
  {
    id: 'surface.vhsTracking', dim: 'surface', group: '显示与胶片', label: '跟踪不良', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.2, rebuild: 'uniform',
    activeWhen: vhsOnly,
    explain: {
      plain: '录像机读带子"没对准"的程度：调高后一条横向的噪声带慢慢滚过画面，带里的画面整行乱跳；很差时整幅画面上下跳，最底下一截向右错开得更厉害。',
      ends: ['对准了：画面稳定，只有最底下一小截错位', '严重跑偏：粗噪声带滚动、画面上下跳'],
      lookAt: '横着慢慢移动的那条白色噪点带（0.1 以上才出现），以及画面最底下几行向右错开的部分（开了画幅黑边时在黑边以内的底部）',
      term: { zh: '跟踪误差 / 磁头切换噪声', en: 'Tracking error / head-switching noise' },
      tech: '噪声带位置 = fract(常数 − 时间 × 速度)，强度在 0.1~0.4 之间渐入；带内每行加随机横移、叠白色碎横纹并去掉颜色；画面底部 1%~4% 的行模拟磁头切换：整体右移、噪声更重。',
      pitfalls: ['噪声带一直开着会挡住玩法信息；游戏里通常只在剧情、受击或切换场景时临时加大', '截图里噪声带的位置取决于当时的时间，换一次截图位置就不同'],
    },
    prompt: (v, s) => (is(s, 'surface.screen', 'vhs') && Number(v) > 0.4 ? '录像带跟踪不良：横向噪声带滚过画面，画面上下跳动' : null),
    port: { godot: 'post_vhs.gdshader 的 tracking 参数；剧情里临时加大可用 Tween 改这个 uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.vhsInterlace', dim: 'surface', group: '显示与胶片', label: '隔行扫描', kind: 'toggle', default: false, rebuild: 'uniform', advanced: true,
    activeWhen: vhsOnly,
    explain: {
      plain: '老电视一帧分两次画：先画单数行，再画双数行。打开后能看到细密的横纹，两组行之间还会轻微错开。',
      lookAt: '竖直边缘上的细小梳齿、大片亮色里的细横纹',
      term: { zh: '隔行扫描', en: 'Interlacing' },
      tech: '按画面高度约 480 行分奇偶两场：一场压暗 12%，两场横向反向错开一点。真实的梳齿来自两场之间的运动，这里是静态近似。',
      pitfalls: ['画面被缩小显示时细横纹会出现摩尔纹，判断效果要看原尺寸'],
    },
    port: { godot: 'post_vhs.gdshader 的 interlace 开关', godotLevel: 'post' },
  },
  {
    id: 'surface.osd', dim: 'surface', group: '显示与胶片', label: '屏显时间码', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'play', label: '录像机播放', term: { zh: '录像机屏显', en: 'VCR on-screen display' },
        desc: '左上角"PLAY ▶"，右上角走动的磁带计数器；字清晰地浮在最上面，不跟着画面抖',
        prompt: '画面左上角有录像机的"PLAY ▶"白色点阵字，右上角是走动的磁带计数器',
        port: { godot: 'CanvasLayer 上的 Label（等宽字体、关闭抗锯齿、黑影），放在 VHS 着色器之后保持清晰；style_demo.gd 的 _process 每帧更新计数器', godotLevel: 'script' },
      },
      {
        value: 'rec', label: '录制中 REC', term: { zh: '录制指示', en: 'REC indicator' },
        desc: '左上角红色闪烁的"● REC"，右上角计时',
        prompt: '画面左上角是红色闪烁的"● REC"录制标记，右上角是计时器',
        port: { godot: 'CanvasLayer 上的 Label（等宽字体、关闭抗锯齿、黑影），放在 VHS 着色器之后保持清晰；style_demo.gd 的 _process 每帧更新计数器', godotLevel: 'script' },
      },
      {
        value: 'camcorder', label: '摄像机日期', term: { zh: '日期时间戳', en: 'Burned-in date stamp' },
        desc: '右下角烧进画面的拍摄日期和时间；开着录像带时会跟着一起变糊、抖动',
        prompt: '画面右下角烧进了家用摄像机的日期和时间，随录像带一起模糊抖动',
        port: { godot: 'CanvasLayer 上的 Label，放在 VHS 着色器之前，让它和画面一起被处理；style_demo.gd 的 _process 更新时钟', godotLevel: 'script' },
      },
    ],
    explain: {
      plain: '在画面上叠一层录像设备自己的文字：播放状态、录制标记、计数器或拍摄日期。可以不开录像带单独用，那就是干净的数码录像字幕（随身摄像、监控画面）。',
      lookAt: '画面四角的白色或红色点阵字；对比"录像机播放"和"摄像机日期"在录像带下是否跟着画面一起抖、一起糊',
      term: { zh: '屏显 / 时间码叠层', en: 'OSD / timecode overlay' },
      tech: '低分辨率字幕层（约 120 行高），用内置 5×7 点阵字逐点写字并加右下 1 像素黑影，只在显示的秒数变化时重写；着色器按整数倍放大取样，字是整齐的方块。计时由引擎时间推算（不读系统时钟）：计数器从 0:00:00 走，摄像机时钟从「时间」参数设定的时刻起走，日期固定从 1997-08-14 开始。字放在画幅黑边以内，窄画面会自动缩小。',
      pitfalls: ['录像机字幕是播放机后加的，不该跟着磁带抖；摄像机日期是拍摄时录进去的，应该一起变脏——两者弄反会显得假', '字幕会和游戏 UI 抢位置，常见做法是只在过场或"录像回放"界面出现'],
      limits: '网页版的点阵字只含数字、冒号、句点和用到的大写字母；Godot 版用系统等宽字体近似，字形不同。要还原特定机型的字形需要像素字体素材',
    },
  },
  {
    id: 'surface.compression', dim: 'surface', group: '显示与胶片', label: '数码压缩噪点', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '像被压成低码率的网络视频或监控录像：画面按小方块处理，渐变变成一格一格的台阶，细纹理被抹平成色块，物体边缘周围出现细碎的波纹（"蚊子"），颜色按块晕开。任何画面媒介、显示设备都能叠加。',
      ends: ['干净的画面', '码率极低：明显的方块、色块，边缘发糊带波纹'],
      lookAt: '天空、墙面这类平缓渐变里的方块台阶；草地、砖墙等细纹理是否被抹成色块；深色轮廓旁边那一格里的细碎波纹',
      term: { zh: '压缩伪影 / 块效应 / 蚊式噪声', en: 'Compression artifacts / macroblocking / mosquito noise' },
      tech: '单 pass：每个 8×8 宏块取 64 个样本，算出 4×4 个最低频的 DCT 系数，按"频率越高台阶越大"量化（直流单独量化 → 渐变台阶）；比它更细的细节小的丢掉、压得越狠硬边也越多丢掉，于是边缘发糊，量化误差在边缘旁留下跟着边走的振铃（蚊式噪声）。颜色按 2×2 取样（4:2:0）并向整块平均色靠拢。约每 2 秒一个"关键帧"，各块取整点轻微变化；静止画面不会每帧闪。宏块大小按约 540 行的视频换算（1080p 下 16 像素）。',
      pitfalls: ['真正的视频压缩还有帧间预测（拖影、"数据融化"），这里只做单帧的块效应', '和像素化一起用时，宏块按内部分辨率算，最小 8 个内部像素，在大像素倍数下会很粗，像两种分辨率打架'],
      limits: '没有运动补偿和关键帧之间的差分：镜头快速移动时不会出现真实视频里的拖尾与花屏',
    },
    prompt: (v) => (Number(v) > 0.6 ? '画面像低码率网络视频：明显的方块、色块与边缘蚊式噪声' : Number(v) > 0.25 ? '画面带数码压缩痕迹：渐变出现方块台阶，边缘有细碎噪点' : null),
    techPrompt: (v) => (Number(v) > 0 ? `全屏后处理模拟 JPEG/MPEG 压缩：8×8 宏块 4×4 低频 DCT 系数按频率量化 + 残差死区 + 4:2:0 色度，强度 ${Number(v).toFixed(2)}` : null),
    port: { godot: 'post_compress.gdshader（canvas_item 全屏着色器，与网页版同一算法；接在 VHS 和录像机字幕之后）', godotLevel: 'post' },
  },
  {
    id: 'surface.grain', dim: 'surface', group: '显示与胶片', label: '胶片颗粒', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: { plain: '随时间变化的细颗粒。', pitfalls: ['60fps 刷新的颗粒像在闪，降到 24fps 更自然'] },
    prompt: (v) => (Number(v) > 0.2 ? '画面带胶片颗粒' : null),
  },
  {
    id: 'surface.chroma', dim: 'surface', group: '显示与胶片', label: '色差', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform', advanced: true,
    explain: { plain: '画面边缘出现红蓝分离。', pitfalls: ['用多了显得廉价，还影响可读性'] },
  },
  {
    id: 'surface.vignette', dim: 'surface', group: '显示与胶片', label: '暗角', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.15, rebuild: 'uniform',
    explain: { plain: '画面四角变暗，视线向中心收拢。' },
  },
];

registerParams(defs);

export const mediumOption = (v: string) => MEDIUMS.find((m) => m.value === v);
export const isBlackWhiteMedium = (s: Values) => is(s, 'surface.medium', 'ink', 'sketch', 'crosshatch', 'woodcut');
