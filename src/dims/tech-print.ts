// 技术补全（2026-10-23）P1b·版画与漫画 轨道的新参数：registerParams / extendOptions（见 ./registry.ts）
import { mediumIs } from './conditions';
import { extendOptions, registerParams } from './registry';
import type { OptionDef, ParamDef } from './types';

/*
 * 新的画面媒介（surface.medium 的追加取值）与漫画 / 金云金箔叠层参数。全部默认关闭：已有配方的画面不变。
 * 着色器在 src/engine/post/fx/print-*.ts。
 */

const NEW_MEDIUMS: OptionDef[] = [
  {
    value: 'pointillism', label: '点彩', term: { zh: '点彩', en: 'Pointillism' },
    desc: '密密的纯色小圆点并置，暗部夹着补色点，点与点之间露出画布（修拉）',
    prompt: '点彩画面：整幅由密集的纯色小圆点构成，相邻的点用不同色相并置，阴影里夹着补色与群青的点，点之间露出浅色画布，远看才混成颜色',
    techPrompt: '全屏后处理：三层错开、各自旋转的抖动点阵；每个点取点中心的画面色，在 OKLab 里提高彩度，按随机数换成同色 / 邻色 / 补色 / 光色；暗处点更大、层更多；用模糊前后的亮度差做轮廓光晕',
    pitfalls: ['点太小（低于 4 像素）远看就成了噪点，点彩感消失', '屏幕空间的点钉在屏幕上：镜头移动时物体从点阵后面滑过'],
    status: 'live',
    port: { godot: '全屏 canvas_item 着色器（hint_screen_texture）：同样的三层抖动点阵 + OKLab 换色；轮廓光晕用一次 BackBufferCopy + 模糊', godotLevel: 'post' },
  },
  {
    value: 'ukiyoe', label: '浮世绘木版', term: { zh: '浮世绘（木版套色）', en: 'Ukiyo-e woodblock print' },
    desc: '黑线主版 + 平涂色版，色版略有错位；天空顶上一条普鲁士蓝渐淡，色块里有木纹，米色和纸',
    prompt: '浮世绘木版画：墨色细线勾出物体，平涂的套色色块（普鲁士蓝、草绿、黄土、朱红），色版与线略有错位露出纸白，天空顶部一条深蓝向下渐淡（一文字晕染），地平线一抹淡红，色块里隐约有木纹与刷印的麻点，米色和纸纹理',
    techPrompt: '全屏后处理：画面先轻微模糊，再按 OKLab 最近色分到约 16 种（含冲淡档）浮世绘颜料；每种颜料一块色版，按版各自偏移几个像素（套版错位），色块边缘内收 1 像素留纸白；主版线 = 深度二阶差分 + 法线折角 + 颜色角色分界，不偏移；天空（深度 = 1）换成顶部普鲁士蓝的渐变 + 地平线淡红；木纹 = 被 fbm 扭曲的横向长纹 + 节疤；和纸纤维',
    pitfalls: ['只做色调分离 + 黑描边不像浮世绘：要有色版错位、木纹、纸、晕染的天空', '色板很灰或很暗时，大片会被分到墨与鼠灰，画面发闷：配浮世绘色板或提亮'],
    status: 'live',
    port: { godot: '全屏着色器：油墨表写成 const 数组，分色 / 错位 / 主版线同网页版；天空判断用 hint_depth_texture', godotLevel: 'post' },
  },
  {
    value: 'nianhua', label: '木版年画', term: { zh: '木版年画', en: 'Chinese woodblock New Year print' },
    desc: '桃红、大绿、明黄的高饱和平涂，粗黑线，套色明显错位，粗纸斑驳；人物白脸粉腮',
    prompt: '木版年画：粗重的黑色墨线，大红、桃红、大绿、明黄、紫的高饱和平涂色块，套色明显错位、溢出线外，色块斑驳有白点，粗糙的土纸带草屑，人物白脸、两腮晕开桃红',
    techPrompt: '全屏后处理：轻微模糊后按 OKLab（偏重色相）分到 11 种年画颜料；每块色版各自偏移 3~6 像素；粗主版线（深度二阶差分 + 法线 + 角色分界）不偏移；色块浓淡斑驳 + 白点；皮肤角色换成纸白，皮肤遮罩模糊后中间叠桃红（开脸）',
    pitfalls: ['年画的颜色是固定的几种颜料：色板只决定每块分到哪种颜料，不会出现色板里的中间色', '人物很小时粉腮只是一点红'],
    status: 'live',
    port: { godot: '全屏着色器；粉腮要先把皮肤角色画成遮罩再模糊（多一个 SubViewport）', godotLevel: 'post' },
  },
  {
    value: 'pastel', label: '色粉', term: { zh: '色粉 / 粉彩', en: 'Soft pastel' },
    desc: '粉质的短斜笔，颜料只蹭在纸纹凸起上，露出有色的中间调纸；大片地方被手指抹开',
    prompt: '色粉画：粉质哑光的短斜笔触一层层排开，颜料只附着在纸纹凸起处，露出灰褐色的色粉纸，部分区域被揉抹得柔和，亮部压着浅色的提亮笔',
    techPrompt: '全屏后处理：底层 = 模糊后的画面按纸纹阈值覆盖（抹开）；上面两三层旋转的短笔轨道（每行一条，笔长不一），每笔取笔中心的颜色，笔压 × 纸纹高度决定覆盖；暗处加交叉笔，亮处加浅色提亮笔；纸纹 = 蜂窝状凸起 + 纤维',
    pitfalls: ['只加纸纹不像色粉：要有看得见的短笔和露出来的有色纸', '屏幕空间笔触在镜头移动时会滑动'],
    status: 'live',
    port: { godot: '全屏着色器；模糊底用一次 BackBufferCopy + 模糊', godotLevel: 'post' },
  },
  {
    value: 'crayon', label: '蜡笔', term: { zh: '蜡笔', en: 'Wax crayon' },
    desc: '蜡只挂在纸纹的凸起上，满是白色小斑；来回涂的排线、轻重不匀，偶尔涂出边',
    prompt: '蜡笔画：颜色鲜艳，蜡质颗粒感很强，纸纹的凹处留下密密的白色小斑，来回涂抹的排线方向可见、轻重不匀，颜色偶尔涂出轮廓，轮廓是用力描的深色蜡线',
    techPrompt: '全屏后处理：粗碎的纸纹高度场；按区域换方向的余弦排线调制笔压，覆盖 = smoothstep(1 - 笔压, …, 纸纹)；暗处加一层交叉的重涂；颜色取样带低频位移（涂出边）；轮廓 = 深度 / 法线 / 角色分界，也按纸纹断开',
    pitfalls: ['颗粒太细（1 像素）会像数码噪点；蜡笔的白斑要成团', '和「内部线」一起用时线会叠两层'],
    status: 'live',
    port: { godot: '全屏着色器', godotLevel: 'post' },
  },
  {
    value: 'marker', label: '马克笔', term: { zh: '马克笔', en: 'Alcohol marker' },
    desc: '一道道等宽的平行笔，透明叠色——重叠处更深；笔头停顿处积墨，边缘微微洇开',
    prompt: '马克笔手绘：同一方向的等宽平行笔道，透明颜色叠加，笔与笔重叠处更深，浅色处偶尔留出白色细缝，笔头停顿处积墨发深，颜色在边缘微微洇出',
    techPrompt: '全屏后处理：旋转坐标里的等宽笔道（间距略小于笔宽 → 重叠）；按明暗决定要几遍（错开半道的第二遍、换角度的第三遍）；颜色 = 纸 × 每层透过率^层数（层透过率 = 原色^(1/期望层数)）；笔道两侧与顺笔方向颜色突变处加深（积墨）；颜色取样带小幅抖动（洇色）',
    pitfalls: ['马克笔是透明的：不能像水粉那样一遍盖住，深色靠叠', '笔道方向一致才像；乱向的笔道像蜡笔'],
    status: 'live',
    port: { godot: '全屏着色器', godotLevel: 'post' },
  },
  {
    value: 'manuscript', label: '彩绘手抄本', term: { zh: '彩绘手抄本', en: 'Illuminated manuscript' },
    desc: '群青、朱砂、铜绿的平涂 + 墨线，天空是菱格纹，画面框进羊皮纸页：金框、页边藤蔓、左上角的装饰首字母',
    prompt: '中世纪彩绘手抄本的插图：群青、朱砂、铜绿、玫瑰红的平涂与深褐墨线，亮黄处贴金，天空是蓝红相间的菱格纹底，画面四周是羊皮纸页边，金箔边框外缠着常春藤叶的藤蔓，左上角一个金底蓝字的装饰首字母',
    techPrompt: '媒介：按 OKLab 分到 9 种中世纪颜料（另有掺铅白的浅档），赭黄换程序金箔，天空换菱格纹，亮面边缘铅白提亮，墨线 = 深度 / 法线 / 角色分界；页框（纸纹之后）：羊皮纸页边 + 金条框 + 沿页边中线波动的藤蔓（交替的常春藤叶与金点）+ 首字母方块（金底、四分底色、Cinzel 字形）',
    pitfalls: ['页框会盖住画面四周约 8%：重要的东西要放在中间', '首字母与藤蔓都是屏幕上的装饰，不随镜头移动'],
    status: 'live',
    port: { godot: '两个全屏着色器（媒介 + 页框）；首字母用 Label（Cinzel）或预渲染贴图', godotLevel: 'post' },
  },
  {
    value: 'blackFigure', label: '黑绘陶', term: { zh: '古希腊黑绘陶', en: 'Greek black-figure pottery' },
    desc: '角色、树、建筑涂成有光泽的黑剪影，背景是陶土橙，剪影里刮出陶土色的细刻线；画面卷在瓶身上，上下是回纹带',
    prompt: '古希腊黑绘陶瓶画：陶土橙的底上，人物、树木与建筑是有光泽的黑釉剪影，剪影内部用细刻线刮出陶土色的衣纹与结构，局部补涂紫红，画面卷在弧形瓶身上，上下围着回纹带，瓶底一圈黑色放射纹，釉面有一道竖直的高光',
    techPrompt: '媒介：按角色编号分「形象」（非地面、非天空）与「底」，形象 = 黑釉，底 = 陶土色；剪影内部的结构线（法线折角 / 角色分界）刮成陶土色，剪影外缘不刻；强调色补紫红；瓶身（纸纹之后）：asin 圆柱重映射 + 余弦明暗 + 竖直高光，上下 5×6 点阵的回纹带、底部三角放射纹、肩部舌纹',
    pitfalls: ['俯视的大地形会整片变成陶土色，只剩树和房子是黑的：侧视、近景更像瓶画', '剪影很小时刻线挤成一团'],
    status: 'live',
    port: { godot: '两个全屏着色器（媒介按角色编号贴图分形象 / 底；瓶身重映射 + 纹带）', godotLevel: 'post' },
  },
];

extendOptions('surface.medium', NEW_MEDIUMS);

const defs: ParamDef[] = [
  {
    id: 'surface.dotComplement', dim: 'surface', group: '点彩', label: '补色点', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: mediumIs('pointillism'),
    explain: {
      plain: '点彩里掺进去的「对面颜色」的点有多少：绿草里夹红橙点、橙色里夹蓝点，暗部还会掺群青和紫色的点。',
      ends: ['几乎只用同一种色相的点，像马赛克', '补色点很多，颜色闪烁、跳动'],
      lookAt: '阴影和草地里：凑近看是否有对面颜色的点；退远看颜色是否反而更鲜亮',
      term: { zh: '补色并置 / 视觉混色', en: 'Complementary juxtaposition / optical mixing' },
      pitfalls: ['补色点太多时整体会发灰（补色在眼里混成灰）', '色板本身很灰时，点彩会用一对补色的点「混」出灰色'],
    },
    prompt: (v, s) => (s['surface.medium'] === 'pointillism' && Number(v) > 0.6 ? '阴影里补色点与群青点很多，颜色跳动' : null),
    port: { godot: '点彩着色器的 complement uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.printOffset', dim: 'surface', group: '木版套色', label: '套版错位', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: mediumIs('ukiyoe', 'nianhua'),
    explain: {
      plain: '每种颜色是单独一块木版印上去的，版和版没有完全对准：色块相对黑线和彼此错开一点，线的一边露出一丝纸白，另一边颜色压到线外。',
      ends: ['对得很准，像机器印刷', '明显错开，像手工小作坊（年画常见）'],
      lookAt: '黑线两侧：一侧的白缝、一侧颜色溢出线外；不同颜色的块错开的方向不同',
      term: { zh: '套版错位', en: 'Misregistration' },
      pitfalls: ['错得太多会像重影，年画可以大一些，浮世绘宜小'],
    },
    prompt: (v, s) => (['ukiyoe', 'nianhua'].includes(String(s['surface.medium'])) && Number(v) > 0.6 ? '套色明显错位，颜色溢出墨线' : null),
    port: { godot: '版画着色器的 offset uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.woodGrain', dim: 'surface', group: '木版套色', label: '木纹', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: mediumIs('ukiyoe', 'nianhua'),
    explain: {
      plain: '大块平涂里印出来的木板纹理（顺着木板的长纹、绕过节疤），和刷印时压出的细小麻点。',
      ends: ['色块干净平整', '木纹和麻点明显，像手刷的老版'],
      lookAt: '天空的渐变、大片水面和墙面里的横向细纹',
      term: { zh: '板目 / 胡麻摺', en: 'Wood grain (mokume) / sesame printing' },
    },
    port: { godot: '版画着色器的 grain uniform（程序木纹，不需要贴图）', godotLevel: 'post' },
  },
  {
    id: 'surface.bokashi', dim: 'surface', group: '木版套色', label: '天空晕染', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.75, rebuild: 'uniform',
    activeWhen: mediumIs('ukiyoe'),
    explain: {
      plain: '浮世绘的天空不画蓝天，而是在纸的顶上印一条深蓝，向下渐渐淡成纸色；靠近地平线再抹一层淡红。深蓝取色板的「深水」色，淡红取「强调色」。',
      ends: ['天空就是画面原来的颜色（只做分色）', '顶上一条浓重的普鲁士蓝渐变'],
      lookAt: '画面顶部的蓝色带与地平线上方的淡红',
      term: { zh: '一文字晕染', en: 'Ichimonji bokashi' },
      limits: '只认深度缓冲里的天空；横版场景里画在平面上的天空背景不算天空',
    },
    prompt: (v, s) => (s['surface.medium'] === 'ukiyoe' && Number(v) > 0.3 ? '天空顶部一条深普鲁士蓝向下渐淡，地平线一抹淡红' : null),
    port: { godot: '版画着色器的 bokashi uniform；天空 = 深度 1', godotLevel: 'post' },
  },
  {
    id: 'surface.paperTooth', dim: 'surface', group: '色粉与蜡笔', label: '纸面颗粒', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: mediumIs('pastel', 'crayon'),
    explain: {
      plain: '纸面凸凹（纸的「牙」）有多明显。色粉和蜡笔都只蹭到凸起的地方，凹处留白：颗粒越明显，露出的纸越多、越碎。',
      ends: ['颜色铺得匀，像涂满的', '满是白色小斑，纸纹抢眼'],
      lookAt: '大片颜色里的白色小斑，暗处是否也透出纸',
      term: { zh: '纸纹齿 / 纸牙', en: 'Paper tooth' },
    },
    prompt: (v, s) => (['pastel', 'crayon'].includes(String(s['surface.medium'])) && Number(v) > 0.7 ? '纸纹颗粒很粗，颜料只挂在凸起处，满是白色小斑' : null),
    port: { godot: '色粉 / 蜡笔着色器的 tooth uniform（程序纸纹，不需要贴图）', godotLevel: 'post' },
  },
  {
    id: 'surface.smudge', dim: 'surface', group: '色粉与蜡笔', label: '抹擦', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: mediumIs('pastel'),
    explain: {
      plain: '用手指把色粉揉开的程度：揉开的地方颜色柔和、几乎盖满纸，笔触变淡；没揉的地方保留一笔一笔的粉痕。',
      ends: ['全是清楚的短笔，露纸多', '大片柔和的过渡，像擦笔画'],
      lookAt: '天空、远景这类大面积处的笔触是否被抹开',
      term: { zh: '擦笔 / 揉擦', en: 'Smudging / blending' },
    },
    port: { godot: '色粉着色器的 smudge uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.markerAngle', dim: 'surface', group: '马克笔', label: '笔道方向', kind: 'range', min: 0, max: 180, step: 1, unit: '°', default: 70, rebuild: 'uniform',
    activeWhen: mediumIs('marker'),
    explain: {
      plain: '马克笔一道道笔走的方向（0° = 横着走，90° = 竖着走）。设计手稿通常整张用同一个方向快速排笔。',
      ends: ['横向排笔', '竖向排笔'],
      lookAt: '大块颜色里平行笔道的走向',
    },
    port: { godot: '马克笔着色器的 angle uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.pageFrame', dim: 'surface', group: '手抄本与陶瓶', label: '页框与瓶身', kind: 'toggle', default: true, rebuild: 'uniform',
    activeWhen: mediumIs('manuscript', 'blackFigure'),
    explain: {
      plain: '手抄本：把画面框进羊皮纸页（金框、页边藤蔓、装饰首字母）；黑绘陶：把画面卷到瓶身上（两边压扁、上下回纹带、瓶底放射纹、釉光）。关掉就只保留颜色与线的处理，画面满屏。',
      lookAt: '画面四周：页边或瓶身的纹带',
      pitfalls: ['页框和瓶身的纹带会盖住画面边缘；瓶身弯曲时游戏 UI 的标记与画面上的位置对不齐'],
    },
    port: { godot: '第二个全屏着色器（页框 / 瓶身），接在纸纹之后', godotLevel: 'post' },
  },
  /* ---------- 漫画符号：叠在任何画面上（纸纹之后、镜头畸变之前） ---------- */
  {
    id: 'surface.mangaFx', dim: 'surface', group: '漫画符号', label: '漫画效果线', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'speed', label: '速度线', term: { zh: '速度线 / 流线', en: 'Speed lines' },
        desc: '沿一个方向的长细线，两头尖，离主角越远越密，主角那一条带子空着；线会流动',
        prompt: '背景上布满同一方向的尖头速度线，主角干净地留在线前面，表现高速移动',
        techPrompt: '全屏后处理：旋转坐标里按行随机放尖头长线（两头渐细），出现概率随离主角的垂直距离增大；角色编号缓冲里是角色的像素不画线；按时间平移',
        port: { godot: '全屏着色器；主角位置由脚本 unproject_position 传入', godotLevel: 'post' },
      },
      {
        value: 'focus', label: '集中线', term: { zh: '集中线', en: 'Focus lines / radial lines' },
        desc: '从画面四周射向主角的尖楔，在主角外围参差地停住，把视线收向中心',
        prompt: '从画面四周向主角汇聚的放射状集中线，中心留白，强调惊讶或冲击的一瞬',
        techPrompt: '全屏后处理：极坐标按角度分 220 条，每条随机粗细、随机在主角半径外 1.1~2.5 倍处停住，外粗内尖',
        port: { godot: '全屏着色器（极坐标）', godotLevel: 'post' },
      },
      {
        value: 'impact', label: '冲击爆炸', term: { zh: '冲击效果', en: 'Impact burst' },
        desc: '主角身后垫一个锯齿星形的白色爆炸（黑描边），外圈粗集中线，背景压成高反差',
        prompt: '打击瞬间的冲击画面：主角身后爆开锯齿星形的白色闪光，外圈粗放射线，背景压成黑白高反差',
        techPrompt: '全屏后处理：极坐标锯齿星形（15 个尖，长短随机）白底黑边，外面叠粗集中线，背景按亮度压成墨 / 纸两色；角色像素不受影响',
        port: { godot: '全屏着色器（极坐标）', godotLevel: 'post' },
      },
    ],
    explain: {
      plain: '漫画里用来表现速度、惊讶、打击的符号线，直接画在画面上：线画在环境上，角色干净地站在线前面。中心默认对准主角（自动从画面里找离中心最近的角色）。',
      lookAt: '线的疏密与方向、主角周围的留白、深色背景上线会变成白色',
      term: { zh: '效果线', en: 'Manga effect lines' },
      pitfalls: ['常开会很吵：游戏里一般只在冲刺、受击、必杀技的一瞬间打开', '主角太小或画面里没有角色时，中心退回画面正中'],
      limits: '屏幕空间叠层：线不会被前景的环境物体挡住（只有角色挡得住）',
    },
    prompt: (v) => (v === 'speed' ? '画面带漫画速度线' : v === 'focus' ? '画面带向主角汇聚的集中线' : v === 'impact' ? '画面带漫画式冲击爆炸' : null),
    port: { godot: 'post_manga.gdshader（全屏 canvas_item）；主角位置由 GDScript 每帧写 uniform', godotLevel: 'post' },
  },
  {
    id: 'surface.mangaAmount', dim: 'surface', group: '漫画符号', label: '线的密度', kind: 'range', min: 0.1, max: 1, step: 0.01, default: 0.7, rebuild: 'uniform',
    activeWhen: (s) => (String(s['surface.mangaFx'] ?? 'none') === 'none' ? '需要先选一种漫画效果线' : true),
    explain: { plain: '效果线有多密（冲击爆炸里也决定爆炸多大、背景压得多狠）。', ends: ['稀疏几笔', '密密麻麻'] },
    port: { godot: 'post_manga.gdshader 的 amount', godotLevel: 'post' },
  },
  {
    id: 'surface.mangaAngle', dim: 'surface', group: '漫画符号', label: '速度线方向', kind: 'range', min: 0, max: 180, step: 1, unit: '°', default: 0, rebuild: 'uniform',
    activeWhen: (s) => (s['surface.mangaFx'] === 'speed' ? true : '只对速度线生效'),
    explain: { plain: '速度线的方向（0° = 水平，90° = 竖直）。一般顺着角色运动的方向。' },
    port: { godot: 'post_manga.gdshader 的 angle', godotLevel: 'post' },
  },
  {
    id: 'surface.mangaCenter', dim: 'surface', group: '漫画符号', label: '符号中心', kind: 'choice', default: 'subject', rebuild: 'uniform',
    options: [
      { value: 'subject', label: '主角', desc: '自动找画面里离中心最近的角色' },
      { value: 'center', label: '画面中心' },
    ],
    activeWhen: (s) => (String(s['surface.mangaFx'] ?? 'none') !== 'none' || String(s['surface.sfxText'] ?? 'none') !== 'none' || String(s['surface.panels'] ?? 'none') !== 'none' ? true : '需要先打开漫画效果线、拟声字或分格'),
    explain: { plain: '集中线、冲击、拟声字、特写格对准哪里。' },
    port: { godot: 'Camera3D.unproject_position(玩家位置) 写进 uniform', godotLevel: 'script' },
  },
  {
    id: 'surface.panels', dim: 'surface', group: '漫画符号', label: '漫画分格', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'frame', label: '单格画框', desc: '画面四周留白边、加一圈黑框，像漫画里的一格', prompt: '画面被一圈黑色格框围住，四周是纸白的页边' },
      { value: 'three', label: '三格（含特写）', desc: '上面一格宽景；下面斜切成两格：一格中景，一格主角特写', prompt: '画面分成三格：上方宽景，下方斜切的两格，其中一格是主角特写', term: { zh: '分格', en: 'Panel layout' } },
      { value: 'four', label: '四格（远中近）', desc: '同一时刻的四种景别：全景、主角特写、中景、稍近的全景，格线斜着错开', prompt: '画面分成斜切的四格，同一时刻用全景、中景与特写交替呈现', term: { zh: '景别切换', en: 'Shot sizes across panels' } },
    ],
    explain: {
      plain: '把画面切成漫画的几格：格与格之间是纸白的空隙，每格有黑框；有的格是主角的放大特写（同一帧的不同景别），用来试「镜头与画格转场」的感觉。',
      lookAt: '格的切法（斜切更有动感）、特写格里主角是否在中间、格间空隙的宽度',
      term: { zh: '分格构图', en: 'Comic panel layout' },
      pitfalls: ['特写格是把当前画面放大，分辨率会变低（适合配网点、线条类画面）', '只有宽景那一格和游戏 UI 的标记对位，特写格里的位置对不上'],
      limits: '每格都是同一时刻的同一台摄像机：真正的分镜要多台摄像机或多个时刻（需要多次渲染）',
    },
    prompt: (v) => (v === 'three' || v === 'four' ? '画面按漫画分格，宽景与主角特写并置' : v === 'frame' ? '画面像漫画里的一格，带黑框与纸白页边' : null),
    port: { godot: 'post_panels.gdshader（全屏着色器按格重映射 SCREEN_UV）；真正的多机位分镜用多个 SubViewport', godotLevel: 'post' },
  },
  {
    id: 'surface.sfxText', dim: 'surface', group: '漫画符号', label: '拟声字', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'boom', label: '轰！', desc: '日漫式：粗斜体黑字、厚白边、外圈黑线', prompt: '画面上有一个巨大的手写感拟声字「轰！」，黑字厚白边，倾斜' },
      { value: 'bang', label: '砰！', desc: '日漫式：粗斜体黑字、厚白边、外圈黑线', prompt: '画面上有一个巨大的拟声字「砰！」，黑字厚白边' },
      { value: 'dong', label: '咚咚', desc: '圆润的白字、黑边，偏可爱', prompt: '画面上有圆润的白色拟声字「咚咚」，黑色描边' },
      { value: 'pow', label: 'POW!', desc: '美漫式：黄色字面、黑边、红色投影', prompt: '美式漫画拟声字「POW!」，黄色字面、黑色描边、红色错位投影' },
      { value: 'wham', label: 'WHAM!', desc: '美漫式：橙色字面、黑边、黄色投影', prompt: '美式漫画拟声字「WHAM!」，橙色字面、黑色描边、黄色投影' },
    ],
    explain: {
      plain: '在主角旁边放一个大号的拟声字，带描边、倾斜，像漫画里画出来的音效字。',
      lookAt: '字的位置（主角的左上或右上）、描边层次、和背景的对比',
      term: { zh: '拟声字 / 描き文字', en: 'Onomatopoeia lettering (SFX)' },
      pitfalls: ['常驻画面会挡视线：游戏里一般只在打击的一瞬间弹出', '只能选这几个字：字体只打包了界面里用到的字（中文走展示字体的字表）'],
      limits: '是平面贴图：不会随动作变形、碎裂；手绘感的字形需要专门的手写字体',
    },
    prompt: (v) => (v !== 'none' ? '画面上有漫画式的大号拟声字' : null),
    port: { godot: 'CanvasLayer 上的 Label（展示字体 + outline_size + shadow），位置用 unproject_position 跟着主角', godotLevel: 'script' },
  },
  {
    id: 'surface.sfxSize', dim: 'surface', group: '漫画符号', label: '拟声字大小', kind: 'range', min: 0.5, max: 2, step: 0.05, default: 1, unit: '×', rebuild: 'uniform',
    activeWhen: (s) => (String(s['surface.sfxText'] ?? 'none') === 'none' ? '需要先选一个拟声字' : true),
    explain: { plain: '拟声字的大小（1 = 约画面高度的五分之一）。' },
    port: { godot: 'Label 的字号', godotLevel: 'builtin' },
  },
  /* ---------- 金云与金箔（日本屏风画） ---------- */
  {
    id: 'surface.goldLeaf', dim: 'surface', group: '金云金箔', label: '金箔天空', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '把天空换成一片片贴上去的方形金箔：箔片成行叠压、每片金色略不同，有细皱纹和破口，表面有一道缓慢移动的流光。像琳派屏风的金底。',
      ends: ['原来的天空', '整片金箔'],
      lookAt: '天空里方形箔片的接缝、各片深浅不一的金色、破口露出的红褐色胶底',
      term: { zh: '金箔地 / 金地', en: 'Gold-leaf ground (kinpaku)' },
      limits: '只换深度缓冲里的天空；横版场景里画成平面的远景不会变金',
    },
    prompt: (v) => (Number(v) > 0.4 ? '天空是一片片方形金箔贴成的金底，箔片接缝可见，微微反光' : null),
    techPrompt: (v) => (Number(v) > 0 ? '后处理：深度 = 1 的像素换成程序金箔（成行的方形箔片 + 叠压缝 + 皱纹 + 破口 + 斜向流光）' : null),
    port: { godot: '全屏着色器：hint_depth_texture 判天空，程序金箔同网页版', godotLevel: 'post' },
  },
  {
    id: 'surface.goldCloud', dim: 'surface', group: '金云金箔', label: '金云', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '一条条横向的金色云带（すやり霞）穿过画面：两头圆、错落成阶梯状，描一道深褐细边。它挡住后面的东西，比它近的房子、树会从云前面露出来，像洛中洛外图用金云把一个个场面隔开。',
      ends: ['没有金云', '四条长云带，遮住大半画面'],
      lookAt: '云带的长条形与圆头、云和建筑的前后关系（近处的屋顶压在云上）',
      term: { zh: '金云 / すやり霞', en: 'Gold clouds (suyari-gasumi)' },
      pitfalls: ['云带位置按画面高度固定：转动镜头时云不跟着世界走（屏风画本来就是平面的）', '云太多会把要看的东西全遮住，0.3~0.6 比较像'],
      limits: '每条云带用它下沿那一行画面的深度做遮挡，地面起伏很大时前后关系可能不准',
    },
    prompt: (v) => (Number(v) > 0.2 ? '画面被几条横向的金色云带分隔，近处的建筑从金云前面露出' : null),
    techPrompt: (v) => (Number(v) > 0 ? '后处理：屏幕空间的胶囊形云带（阶梯排列）贴程序金箔 + 深褐描边；每条带取下沿一行的场景深度做深度测试' : null),
    port: { godot: '全屏着色器（hint_depth_texture 做遮挡）；也可以做成摆在场景里的金色云片网格', godotLevel: 'post' },
  },
];

registerParams(defs);
