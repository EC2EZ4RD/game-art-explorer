// 技术补全（2026-10-23）P1·线条与后处理核心 轨道的新参数：registerParams / extendOptions（见 ./registry.ts）
// 规则：全部默认关 / 中性，现有配方、复刻、缩略图逐像素不变；配方要用由第二批（Z1）接入。
import { all } from './conditions';
import { extendOptions, getParam, is, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const edgesOn = (s: Values): true | string => (is(s, 'lines.edges', 'none') ? '需要先选择一种内部线检测方式' : true);
const weightOn = (s: Values): true | string => (is(s, 'lines.weightStyle', 'none') ? '需要先选一种「线的提按」画法' : true);

/* ---------- 泥金描线：内部线颜色多一个选项 ---------- */
extendOptions('lines.edgeColorMode', [
  {
    value: 'gold', label: '泥金', term: { zh: '泥金勾线', en: 'Gold-paint line' },
    desc: '金粉调胶勾的线：暗金底，线所在表面朝光处亮起、带一道高光和细碎金粉闪点；转镜头时光泽顺着形体走',
    prompt: '以泥金勾线：金色线条带金属光泽，朝光处闪亮、背光处转为暗金',
    techPrompt: '后处理内部线着色：线色 = 暗金→亮金按（视空间法线·固定光向）插值 + 半程向量高光 + 屏幕哈希金粉闪点',
    pitfalls: ['金线配浅色底不显：泥金多画在深色（藏青、墨绿、朱红）底子或重彩上', '线太细时只剩一两个像素，看不出金属光泽：线宽 1.5 以上更明显'],
    status: 'live',
    port: { godot: '边缘检测着色器里线色改成按 NORMAL 的金属色带（或采样一张金色渐变贴图）', godotLevel: 'post' },
  },
]);

const defs: ParamDef[] = [
  /* ---------- 线的提按：内部线（后处理）按画法改变粗细 ---------- */
  {
    id: 'lines.weightStyle', dim: 'lines', group: '线的提按', label: '线的提按', kind: 'choice', default: 'none', rebuild: 'uniform',
    activeWhen: edgesOn,
    options: [
      { value: 'none', label: '等宽（原样）', desc: '所有内部线一样粗' },
      {
        value: 'pressure', label: '手绘压力', term: { zh: '线的主次与轻重', en: 'Line weight variation' },
        desc: '外轮廓比内部折线重，背光一侧更粗，远处变细，沿线有手腕压力的轻重起伏',
        prompt: '手绘线稿的轻重：外轮廓重、内部结构线轻，暗部线条加粗，远处线条变细，沿线有自然的粗细起伏',
        techPrompt: '后处理边缘检测改成"到最近一处边的距离"：8 方向逐像素步进，按深度/法线/部件分开记距离，线宽 = 底宽 × 主次 × 暗部 × 远近 × 低频噪声，覆盖率按距离取（自带抗锯齿）',
      },
      {
        value: 'tiexian', label: '铁线描', term: { zh: '铁线描', en: 'Iron-wire line (tiexian miao)' },
        desc: '工笔的铁线描：细而匀、圆劲，几乎不起伏，外轮廓只比内线略重',
        prompt: '铁线描：线条细匀圆劲，如铁丝弯成，起止藏锋，粗细几乎不变',
      },
      {
        value: 'youshi', label: '游丝描', term: { zh: '游丝描', en: 'Gossamer line (youshi miao)' },
        desc: '极细、连绵、略淡的线，像游丝一样轻轻起伏，适合衣纹与远景',
        prompt: '游丝描：极细而连绵的线，轻盈流畅，若断若续',
      },
      {
        value: 'brush', label: '毛笔提按', term: { zh: '提按', en: 'Brush pressure (ti-an)' },
        desc: '毛笔的提与按：竖向的线粗、横向的线细（笔锋略斜），轮廓重、折线轻，沿线明显地一粗一细',
        prompt: '毛笔勾线有提按：竖笔粗重、横笔轻细，线条一笔之中有粗细与顿挫',
        techPrompt: '在"手绘压力"之上，线宽再乘 mix(0.35, 1.5, |边法线·笔锋方向|)（边法线由 8 方向命中的方向加权求和得到）',
      },
    ],
    explain: {
      plain: '让内部线（后处理勾出的线）不再一样粗：外轮廓重、内部折线轻，背光处加粗，远处变细，像手画的线有主次与提按。',
      ends: ['等宽清线', '粗细变化明显的手绘线'],
      lookAt: '物体外轮廓与内部折线的粗细对比；背光一侧的线；远处的线是否变细；毛笔画法里竖线与横线的粗细差别',
      term: { zh: '线的主次与提按', en: 'Line weight / pressure variation' },
      tech: '每个像素沿 8 个方向逐像素向外找最近的一处跳变（深度、法线、部件分界分开记距离），再按这一处该有的线宽换成覆盖率；深度跳变的线压在靠前的物体一侧',
      pitfalls: [
        '只作用于"内部线检测"画出的线；模型外壳描边（外轮廓描边开关）是另一套，仍然等宽——想要整幅画的线都有提按，把外壳描边关掉，让内部线检测负责外轮廓',
        '线宽变化建立在"内线宽度"之上：宽度很小（<0.8）时变化看不出来',
        '屏幕空间的压力起伏钉在屏幕上：镜头移动时粗细起伏不跟着物体',
      ],
      limits: '后处理看不出一条线从哪里起笔、在哪里收笔，所以没有真正的起收笔（藏锋、出锋）；要严格的笔画需要线稿贴图',
    },
    prompt: (v) => ({ none: null, pressure: '线条有主次轻重：外轮廓重、内线轻，暗部线条加粗', tiexian: '以铁线描勾勒：细匀圆劲', youshi: '以游丝描勾勒：极细连绵', brush: '毛笔勾线，竖粗横细，有提按顿挫' } as Record<string, string | null>)[String(v)] ?? null,
    techPrompt: (v) => (v === 'none' ? null : '后处理内部线：按到边的距离场取覆盖率，线宽随边的种类、明暗、深度与噪声变化'),
    port: { godot: '边缘检测着色器（hint_depth_texture + hint_normal_roughness_texture）改成 8 方向步进求最近边距离，线宽同一组公式', godotLevel: 'post' },
  },
  {
    id: 'lines.weightVar', dim: 'lines', group: '线的提按', label: '粗细变化', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: all(edgesOn, weightOn),
    explain: {
      plain: '线条粗细变化有多大。0 时每种画法只剩它的底宽（铁线描细、毛笔粗），越大主次、暗部加粗、近粗远细和沿线起伏越明显。',
      ends: ['几乎等宽', '粗细悬殊'],
      lookAt: '外轮廓与内线的粗细比；同一条线上粗细的起伏',
    },
    port: { godot: '边缘着色器的 weight_var uniform', godotLevel: 'post' },
  },
];

/* ---------- 新媒介：铜版 / 钞票雕刻线 ---------- */
extendOptions('surface.medium', [
  {
    value: 'engraving', label: '铜版雕刻', term: { zh: '铜版画 / 钞票雕刻线', en: 'Copperplate / banknote engraving' },
    desc: '顺着形体走的细密平行线，暗处线胀粗、亮处细成发丝，最暗处再叠交叉线；像老插图铜版画、钞票上的人像',
    prompt: '铜版雕刻插图：明暗全由顺着形体弯曲的细密平行线表现，线宽随明暗胀缩，暗部交叉成菱形网，像钞票上的雕刻肖像',
    techPrompt: '全屏后处理：视空间法线投影成方向场（同面平均），按 π/8 分档的全局连续平行线族，相位加深度项让曲面上的线弯曲；每族线半宽 = 线距 × f(色调)，按到线中心的距离取覆盖率；色调 >0.55、>0.82 各叠一族 ±60° 的交叉线',
    pitfalls: ['线距接近像素尺寸时会出现摩尔纹：笔触/颗粒尺度不要低于 0.8', '方向场来自法线：大面积正对镜头的平面（立绘背景板）没有走向，退回水平线'],
    status: 'live',
    port: { godot: '全屏 canvas_item 着色器读 hint_normal_roughness_texture / hint_depth_texture，同一组公式', godotLevel: 'post' },
  },
]);

const defs2: ParamDef[] = [
  {
    id: 'surface.cutFlow', dim: 'surface', group: '版画刻纹', label: '刻纹走向', kind: 'choice', default: 'fixed', rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'woodcut') ? true : '只在画面媒介为「版画木刻」时生效'),
    options: [
      { value: 'fixed', label: '固定斜向（原样）', desc: '整幅画一个方向的刻纹，加一点噪声扭动' },
      {
        value: 'form', label: '沿形体', term: { zh: '随形刻线', en: 'Form-following cuts' },
        desc: '刻纹顺着物体的形走：平面上是顺着透视的直刻纹，山坡、树冠、圆柱上的刻纹随形弯曲，像一刀一刀绕着形体刻',
        prompt: '木刻刻纹顺着形体走向：平面上随透视排列，曲面上随形弯曲',
        techPrompt: '刻纹相位 = (屏幕坐标·斜向 × cos α + 线性深度 × sin α) / 周期：等相位线是一组斜切平面与表面的交线；相位梯度由法线解析求出（∇深度 ≈ n.xy/n.z），按 2 的整数次幂分档，斜面上刻纹变密时隔一刀去一刀',
      },
    ],
    explain: {
      plain: '木刻的刀痕往哪个方向走。原来整幅画一个斜向、平铺在屏幕上；「沿形体」让刀痕贴着物体的形走：地面上顺着透视，山坡和树冠上随形弯曲。',
      lookAt: '山坡、树冠、圆柱上的刻纹是否跟着弯；斜着看的墙面上刻纹是否顺着透视',
      term: { zh: '随形刻线 / 切片线', en: 'Cross-contour / slice lines' },
      tech: '刻纹是一组斜切平面与物体表面的交线（相位由屏幕坐标和深度组成），整幅画连续、没有接缝；刻纹疏密由法线解析估算，斜面上隔一刀去一刀',
      pitfalls: ['正对镜头的平面上刻纹仍是直的（平面与平面的交线本来就是直线）', '屏幕空间刻纹：转动镜头时刻纹会相对物体滑动'],
      limits: '刻纹只跟着表面的形走，不知道物体的结构线（比如木纹、衣褶的走向）；要严格贴合需要手绘方向贴图',
    },
    prompt: (v, s) => (v === 'form' && is(s, 'surface.medium', 'woodcut') ? '刻纹顺着形体走向，曲面上随形弯曲' : null),
    port: { godot: 'post_medium 着色器读 hint_normal_roughness_texture 求方向场，同一组分档公式', godotLevel: 'post' },
  },
  /* ---------- 彩色排线 ---------- */
  {
    id: 'surface.hatchColor', dim: 'surface', group: '排线颜色', label: '排线颜色', kind: 'choice', default: 'mono', rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'sketch', 'crosshatch') ? true : '只在画面媒介为「铅笔素描」或「钢笔交叉排线」时生效'),
    options: [
      { value: 'mono', label: '单色（原样）', desc: '石墨灰 / 墨色排线' },
      {
        value: 'pencil', label: '彩铅', term: { zh: '彩色铅笔', en: 'Colored pencil' },
        desc: '每层排线用物体自己的颜色，越暗的层颜色越深越艳，最暗处掺一点墨；纸上先轻铺一层本色',
        prompt: '彩色铅笔画：明暗用物体本色的排线一层层加深，纸白透出，最暗处才见深色',
        techPrompt: '三层排线（或三张旋转的色调排线图）各按亮度阈值出现，颜色取 OKLab 里加深加艳的本色，以透光率相乘叠在纸上',
      },
      {
        value: 'multi', label: '多色叠加', term: { zh: '分色排线', en: 'Multi-hue hatching' },
        desc: '亮层用本色，中间调叠一层蓝紫冷色，暗部再叠一层暖褐，三层角度不同、交叠处颜色相乘变深',
        prompt: '多色排线：本色排线之上叠蓝紫色的阴影排线和暖褐色的暗部排线，交叉处颜色叠深',
        techPrompt: '三层不同角度的排线，颜色依次为加艳本色、OKLab 推向蓝紫的低彩度色、暖褐；以透光率相乘叠在纸上',
      },
    ],
    explain: {
      plain: '素描 / 钢笔排线的线是什么颜色。原来只有一种墨色；彩铅用物体自己的颜色一层层排，多色叠加让阴影里出现冷色、暗部出现暖褐。',
      lookAt: '暗部排线的颜色；不同颜色的排线交叉处是否变深；亮部是否留出纸白',
      term: { zh: '彩色排线', en: 'Colored hatching' },
      tech: '颜色按"透光率"相乘叠在纸上（像颜料一层层盖上去），不是直接换线色；打开「色调排线图」时每层笔画取自色调排线图并各转一个角度',
      pitfalls: ['画面本身很暗时三层全开，容易糊成一片：配合较亮的色板或调亮画面', '屏幕空间排线：镜头移动时排线相对物体滑动（明暗模型里的物体空间排线不受影响）'],
    },
    prompt: (v, s) => (is(s, 'surface.medium', 'sketch', 'crosshatch') ? ({ mono: null, pencil: '排线用物体本色的彩铅一层层加深', multi: '排线分色：本色、冷色阴影、暖褐暗部层层叠加' } as Record<string, string | null>)[String(v)] ?? null : null),
    port: { godot: 'post_medium 着色器的排线分支：三层颜色按透光率相乘（色调排线图作 sampler2D）', godotLevel: 'post' },
  },
  /* ---------- 水墨：泼墨、飞白 ---------- */
  {
    id: 'surface.pomo', dim: 'surface', group: '水墨', label: '泼墨', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'ink') ? true : '只在画面媒介为「水墨」时生效'),
    explain: {
      plain: '把墨大块地泼上去：画面里暗的大块形体（山体、树丛）被不规则的墨池吞没，池内浓淡起伏，池边积墨发暗、带毛边，池外一圈淡墨渗开。0 = 原样。',
      ends: ['没有泼墨（原样）', '大片墨池，形体只剩轮廓与留白'],
      lookAt: '山体与树丛的大块墨色是否有意外的形状、边缘是否有毛边和渗化',
      term: { zh: '泼墨', en: 'Splashed ink (pomo)' },
      tech: '墨池场 = 模糊后的暗度 × 1.2 + 低频扭曲噪声；按阈值取出墨池，池内用另一层噪声给浓淡，阈值附近加深成边，阈值以下一段给淡晕',
      pitfalls: ['泼墨靠"留白"才成立：配合高度雾 / 纸色天空，画面上方要留出空白', '墨池跟着画面暗部走：镜头移动时池子的形状会变（不是贴在物体上的）'],
      limits: '墨池形状由噪声决定，不是真实的水墨流体模拟；要有特定的泼墨形状需要手绘素材',
    },
    prompt: (v, s) => (is(s, 'surface.medium', 'ink') && Number(v) > 0.2 ? '大块泼墨：墨池吞没山体与树丛，边缘带毛边与渗化，墨色浓淡随机' : null),
    port: { godot: 'post_medium 着色器的水墨分支：同一组噪声与阈值（模糊图用屏幕纹理的 mip 层）', godotLevel: 'post' },
  },
  {
    id: 'surface.feibai', dim: 'surface', group: '水墨', label: '飞白', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'ink') ? true : '只在画面媒介为「水墨」时生效'),
    explain: {
      plain: '笔走得快、墨不够时，浓墨笔画里露出一道道顺着行笔方向的白丝。越浓的笔画、越靠近笔画边缘，白丝越多。0 = 原样。',
      ends: ['墨色饱满（原样）', '枯笔飞白，笔画里满是白丝'],
      lookAt: '浓墨的山脊、树干、轮廓线里的白丝：是否顺着笔画（形体轮廓）的方向',
      term: { zh: '飞白', en: 'Flying white (dry brush)' },
      tech: '行笔方向 = 模糊图亮度梯度转 90°，按 π/8 分档（每档噪声坐标全局连续）；沿笔画很长、横向很细的值噪声，阈值以上抠掉一部分墨',
      pitfalls: ['飞白只出现在浓墨处：画面整体偏淡时几乎看不见', '和"边缘积色"一起开太大，会像磨损的印刷品'],
    },
    prompt: (v, s) => (is(s, 'surface.medium', 'ink') && Number(v) > 0.2 ? '浓墨笔画带飞白：顺着行笔方向露出白丝' : null),
    port: { godot: 'post_medium 着色器的水墨分支：分档方向噪声（与网页版同一公式）', godotLevel: 'post' },
  },
  /* ---------- 工笔：罩染 ---------- */
  {
    id: 'surface.glaze', dim: 'surface', group: '工笔设色', label: '罩染', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'gongbi') ? true : '只在画面媒介为「工笔淡彩」时生效'),
    explain: {
      plain: '工笔的罩染：先平涂一遍底色，再用同一种颜色薄薄地罩好几遍，每一遍往暗处收一点。颜色越罩越深、越沉稳，形体里出现几级柔和的色阶，每一遍的边上留一道淡淡的积色；最后通罩一层淡赭石把颜色统一。0 = 原来的单层淡彩。',
      ends: ['单层淡彩（原样）', '层层罩染的重彩'],
      lookAt: '屋顶、墙面、衣服上颜色是否更饱满；暗处是否出现几级柔和的色阶和淡淡的阶边',
      term: { zh: '罩染', en: 'Layered glazing (zhaoran)' },
      tech: '颜色先换成"透光率"（颜色 / 纸色）并提一点彩度；底色一遍 + 按暗度阈值收缩的三遍，每遍乘透光率的 0.38 次方；阶边乘一点深色；最后乘淡赭石',
      pitfalls: ['罩染会让画面整体变深：配合"媒介强度"或较亮的色板', '色阶的位置跟着画面明暗走，不是按部件分好的'],
      limits: '真正的工笔是按部件先分染、再罩染，次序和范围由画家决定；这里只按明暗自动分层',
    },
    prompt: (v, s) => (is(s, 'surface.medium', 'gongbi') && Number(v) > 0.3 ? '设色层层罩染：颜色沉稳饱满，暗处有柔和的色阶' : null),
    port: { godot: 'post_medium 着色器的工笔分支：同一组阈值与透光率相乘', godotLevel: 'post' },
  },
  /* ---------- 水彩：湿画法 ---------- */
  {
    id: 'surface.wetness', dim: 'surface', group: '水性媒介', label: '湿画法', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'watercolor') ? true : '只在画面媒介为「水彩」时生效'),
    explain: {
      plain: '在湿纸上画水彩：颜色大范围化开、越过边界带着羽毛状的毛边；未干的颜色里流进水，形成内部发淡、边缘一圈深色细线、轮廓像菜花一样分叉的回流水渍；色块边缘内侧积出不规则的深色。0 = 原来的干画。',
      ends: ['干画法（原样）', '大片湿画：颜色化开、满是水渍'],
      lookAt: '大色块里的菜花状水渍（边缘一圈深色细线）；色块之间是否互相渗开、边缘是否毛',
      term: { zh: '湿画法 / 回流水渍', en: 'Wet-on-wet / backruns (cauliflower blooms)' },
      tech: '取样坐标加一层大尺度 fbm 扭曲和一层细噪声（化开 + 毛边），并向模糊图靠拢；水渍 = 扭曲 fbm 的阈值区，内部向纸色退、阈值边加深；色块边缘内侧按模糊差加深并用噪声打散',
      pitfalls: ['水渍只出现在有颜料的地方：亮色、留白处没有', '湿画会糊掉细节：小物体（人物、道具）多的画面宜 0.3 以下', '屏幕空间水渍：镜头移动时水渍相对物体滑动'],
      limits: '不是真实的颜料流体模拟，水渍的位置由噪声决定；要特定形状的水渍需要手绘素材',
    },
    prompt: (v, s) => (is(s, 'surface.medium', 'watercolor') && Number(v) > 0.2 ? '湿画法水彩：颜色在湿纸上化开，带羽状毛边与菜花状回流水渍' : null),
    port: { godot: 'post_medium 着色器的水彩分支：同一组噪声扭曲与阈值', godotLevel: 'post' },
  },
  /* ---------- 媒介范围：角色保持干净 ---------- */
  {
    id: 'surface.mediumScope', dim: 'surface', group: '媒介', label: '媒介范围', kind: 'choice', default: 'all', rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.medium', 'none') ? '需要先选择一种画面媒介' : true),
    options: [
      { value: 'all', label: '整个画面（原样）' },
      {
        value: 'environment', label: '只画环境', term: { zh: '分层滤镜', en: 'Layered stylization' },
        desc: '媒介只作用于环境；角色保持干净的三维着色（赛璐珞角色走在水彩 / 水墨的背景里）',
        prompt: '角色保持干净的赛璐珞着色，背景环境用绘画媒介表现，人与景分层',
        techPrompt: '媒介 pass 之后按法线缓冲里的颜色角色把角色像素换回调色后的原画（物体空间笔触之后、内部线之前）',
      },
    ],
    explain: {
      plain: '画面媒介作用在哪里。「只画环境」让角色保持干净的三维着色，只有背景变成水彩、水墨、油画……像动画里赛璐珞角色叠在手绘背景上。',
      lookAt: '角色身上有没有媒介的笔触、纸纹；角色与背景交界处',
      term: { zh: '角色与背景分层', en: 'Character / background separation' },
      tech: '按颜色角色（角色主体、角色点缀、皮肤、布料）把媒介之后的画面换回调色后的原画；内部线、纸纹、颗粒等后面的步骤仍然作用于整个画面',
      pitfalls: ['角色边缘可能留一圈背景媒介的颜色（媒介本身会把颜色抹开）', '只认颜色角色：没有标成角色的会动的东西（坐骑、敌人道具）仍会被画成媒介'],
    },
    prompt: (v, s) => (v === 'environment' && !is(s, 'surface.medium', 'none') ? '角色保持赛璐珞着色，只有环境是绘画媒介' : null),
    port: { godot: '媒介着色器里读角色遮罩（单独的 SubViewport 或模板缓冲），角色像素直接用原画', godotLevel: 'post' },
  },
  /* ---------- 错位填色 ---------- */
  {
    id: 'surface.misregister', dim: 'surface', group: '印刷', label: '错位填色', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '颜色和墨线没对齐：颜色版整体偏开一点并带着手抖般的起伏，一侧涂出线外，另一侧在线内露出一条纸白。像套色印刷错版、或孩子涂色涂出了线。0 = 原样。',
      ends: ['颜色与线严丝合缝（原样）', '明显错位、涂出线外'],
      lookAt: '物体轮廓：颜色是否越过墨线，另一侧是否露出纸白缝',
      term: { zh: '套色错位 / 涂出线外', en: 'Misregistration / coloring outside the lines' },
      tech: '内部线（后处理）之前把颜色版按"整体偏移 + 低频噪声起伏"错开取样；取样落到另一个物体上时，如果本像素在前（靠近镜头），露出纸色（漏白），否则保留溢出的颜色',
      pitfalls: ['墨线必须是后处理内部线（内部线检测）：模型外壳描边画在颜色里，会跟着颜色一起偏开', '错得太多会像重影，0.3~0.6 最像印刷'],
    },
    prompt: (v) => (Number(v) > 0.2 ? '颜色与墨线错位：颜色涂出线外，另一侧露出纸白缝，像套色错版' : null),
    port: { godot: '内部线之前加一个全屏着色器：颜色按偏移取样，深度 / 角色比较决定漏白', godotLevel: 'post' },
  },
  /* ---------- 物体空间笔触：排序、角色也铺 ---------- */
  {
    id: 'surface.strokeSort', dim: 'surface', group: '笔触', label: '笔触远近排序', kind: 'toggle', default: false, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (is(s, 'surface.strokes', 'none') ? '需要先打开物体空间笔触' : true),
    explain: {
      plain: '物体空间笔触按"离镜头由远到近"的顺序画：近处的笔总是盖在远处的笔上面，远处的笔不会再盖住近处物体的边缘。关掉 = 原来的随机顺序。',
      lookAt: '前景物体（树、房子）的边缘：远处地面的笔触有没有压到它们上面',
      term: { zh: '画家算法', en: "Painter's algorithm (back-to-front)" },
      tech: '镜头动了才重排：按沿镜头朝向的距离做 4096 档计数排序（O(n)），重排后整份实例数据重新上传；镜头静止时零开销',
      pitfalls: ['镜头持续转动时每帧都要重排上传（约 6 万笔、2MB），低端机上会多 1~3ms'],
    },
    port: { godot: 'MultiMesh 实例按深度排序后重写 buffer（或开启 transparency 的 depth draw + sorting_offset）', godotLevel: 'script' },
  },
  {
    id: 'surface.strokeTargets', dim: 'surface', group: '笔触', label: '笔触铺在', kind: 'choice', default: 'static', rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'surface.strokes', 'none') ? '需要先打开物体空间笔触' : true),
    options: [
      { value: 'static', label: '只铺静态场景', desc: '原样：地形、建筑、树铺笔触；角色和云照常三维渲染' },
      {
        value: 'all', label: '角色与云也铺', desc: '角色、云这类会动的物体也铺上更小更密的笔触，笔触跟着它们走、转身',
        prompt: '角色与云也由贴在身上的笔触画成，笔触随角色移动', techPrompt: '动态物体另撒一层：撒点存网格局部坐标 + 网格编号，每帧传 matrixWorld 数组在顶点着色器里变换',
      },
    ],
    explain: {
      plain: '物体空间笔触铺在哪些东西上。原来只铺静态场景，角色和云还是干净的三维渲染，和满屏笔触的背景格格不入；「角色与云也铺」让它们也由笔触画成，笔触钉在它们身上一起动。',
      lookAt: '角色身上是否有笔触；角色走动、转身时笔触是否跟着',
      tech: '动态层撒点存在网格的局部坐标里（带网格编号），每帧把这些网格的 matrixWorld 传进着色器再变换；被精灵接管而隐藏的网格整组剔掉。笔触约 0.35 倍大小',
      pitfalls: ['只认角色、云这类会动的网格；顶点着色器里的形变（风吹、骨骼）带不动笔触'],
      limits: '跟随的是网格整体的变换（移动、转身、挤压）；顶点着色器里的形变（风吹、骨骼）不会带动笔触',
    },
    port: { godot: '角色节点下挂一个 MultiMeshInstance3D（局部坐标撒点），跟着节点自然移动', godotLevel: 'script' },
  },
];

registerParams(defs);
registerParams(defs2);

/* 新媒介要用到的已有参数：生效条件里加上新媒介（不改原维度文件） */
function widenActive(id: string, media: string[]) {
  const p = getParam(id);
  if (!p) return;
  const prev = p.activeWhen;
  p.activeWhen = (s: Values) => (is(s, 'surface.medium', ...media) ? true : prev ? prev(s) : true);
}
widenActive('surface.keepAccent', ['engraving']);
