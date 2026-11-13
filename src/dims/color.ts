import { PALETTES } from '../content/palettes';
import { is, registerParams } from './registry';
import type { ParamDef } from './types';

const defs: ParamDef[] = [
  {
    id: 'color.palette', dim: 'color', group: '色板', label: '色板', kind: 'choice', default: 'inspiration', rebuild: 'uniform',
    options: PALETTES.map((p) => ({ value: p.id, label: p.name, desc: `${p.group} · ${p.desc}${p.source ? `（${p.source}）` : ''}`, prompt: p.prompt })),
    explain: {
      plain: '每个部件按"角色"取色（沙滩、草地、树冠、角色、强调色……），换色板只换颜色，不换形状。',
      lookAt: '主色、辅色、强调色各占多大面积',
      term: { zh: '色板 / 颜色角色', en: 'Palette / Color roles' },
      pitfalls: ['高饱和与低饱和粉彩不是同一种要求', '"治愈"不必然等于马卡龙色'],
    },
    port: { godot: '每个角色一个材质颜色，或所有模型共用一张色板贴图（palette atlas）按 UV 取色', godotLevel: 'builtin' },
  },
  {
    id: 'color.saturation', dim: 'color', group: '整体调整', label: '饱和度', kind: 'range', min: 0, max: 2, step: 0.01, default: 1, rebuild: 'uniform',
    explain: { plain: '颜色有多鲜艳。', ends: ['灰调、克制', '浓烈'] },
    prompt: (v) => (Number(v) < 0.6 ? '整体低饱和、克制' : Number(v) > 1.35 ? '整体高饱和、浓烈' : null),
    port: { godot: 'Environment.adjustment_saturation', godotLevel: 'builtin' },
  },
  {
    id: 'color.contrast', dim: 'color', group: '整体调整', label: '对比度', kind: 'range', min: 0.5, max: 1.6, step: 0.01, default: 1, rebuild: 'uniform',
    explain: { plain: '亮暗差距。', ends: ['灰蒙蒙、柔和', '黑白分明'] },
    port: { godot: 'Environment.adjustment_contrast', godotLevel: 'builtin' },
  },
  {
    id: 'color.brightness', dim: 'color', group: '整体调整', label: '曝光', kind: 'range', min: 0.4, max: 2, step: 0.01, default: 1, rebuild: 'uniform',
    explain: { plain: '整体亮度（手动）。打开下面的"自动曝光"后，它在自动结果之上再乘一次，可以当作整体偏亮或偏暗的微调。', term: { zh: '曝光', en: 'Exposure' } },
    port: { godot: 'Environment.tonemap_exposure', godotLevel: 'builtin' },
  },
  {
    id: 'color.temperature', dim: 'color', group: '整体调整', label: '冷暖', kind: 'range', min: -1, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: { plain: '整体偏冷还是偏暖。', ends: ['偏蓝、清冷', '偏橙、温暖'], term: { zh: '色温', en: 'Color temperature' } },
    prompt: (v) => (Number(v) < -0.3 ? '整体色调偏冷' : Number(v) > 0.3 ? '整体色调偏暖' : null),
  },
  {
    id: 'color.autoExposure', dim: 'color', group: '自动曝光', label: '自动曝光', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '让画面像人眼或摄像机一样自己适应明暗：画面大部分是暗处（夜晚、室内、洞穴）时整体提亮，满屏亮色（雪地、沙漠、正午）时整体压暗。场景变了亮度不会立刻跳过去，而是过一会儿才适应：从暗处转到亮处先"晃眼"再回落，从亮处进暗处先一片黑再慢慢看清。',
      ends: ['不自动：亮就亮、暗就暗，只听"曝光"滑杆的', '完全自动：在"最大补偿"范围内，白天黑夜都被拉向同一个平均亮度'],
      lookAt: '把同一个场景切到夜晚、走进洞穴或转向雪地，看整体亮度变了多少、用了多久才稳定',
      term: { zh: '自动曝光 / 人眼适应', en: 'Auto exposure / Eye adaptation' },
      tech: '在线性 HDR 阶段（缝隙暗部、体积光之后，辉光与调色之前）把画面缩成 64×64 的对数亮度图（每个采样夹在可补偿范围外再放宽 2 档以内），再缩到 8×8、1×1 求对数平均（几何平均，一盏亮灯不会独占测光）；1×1 结果用两张浮点纹理前后交替，按帧间隔做指数适应（变亮快、变暗慢）；调色时读这张 1×1 纹理，曝光倍数 = 目标亮度 ÷ 适应亮度，夹在可补偿范围内，再按强度混合。全程在 GPU，不回读到 CPU',
      pitfalls: [
        '它会改变色板的精确颜色：同一块草地夜里被提亮、在雪地旁被压暗，"按色板取色"不再是屏幕上的最终颜色',
        '色调映射选"无"时，提亮后的亮部会直接顶到纯白溢出；配 Neutral 能把高光收住',
        '强度拉满会把夜晚提成白天、把洞穴提成大厅，气氛就没了；风格化用法通常 0.4~0.8，只补偿一部分',
        '适应速度太快时，镜头扫过灯笼、窗户、天空，整个画面会一明一暗地抽动（曝光呼吸）',
      ],
      limits: '它测的是整张画面的平均亮度，不知道哪里是主角：主角站在大片暗背景前会被提得过亮，可以改用中央重点或点测光；截图与时间冻结时直接显示适应完成的结果，看不到过渡过程',
    },
    prompt: (v) => (Number(v) > 0.3 ? '画面像人眼或摄像机一样自动适应明暗：进暗处慢慢提亮，转向亮处时先晃眼再回落' : null),
    techPrompt: (v) => (Number(v) > 0 ? `自动曝光：线性 HDR 阶段求对数平均亮度（64×64 → 8×8 → 1×1，全在 GPU），1×1 浮点纹理前后交替做指数适应（变亮快、变暗慢），曝光 = 目标亮度 / 适应亮度，按强度 ${Number(v).toFixed(2)} 混合` : null),
    port: { godot: 'CameraAttributesPractical.auto_exposure_enabled = true（挂在 Camera3D.attributes 上，与景深共用同一个对象）；强度 < 1 时用收窄 auto_exposure_min_sensitivity / max_sensitivity 的范围近似', godotLevel: 'builtin' },
  },
  {
    id: 'color.exposureSpeed', dim: 'color', group: '自动曝光', label: '适应速度', kind: 'range', min: 0.1, max: 5, step: 0.05, default: 1.5, rebuild: 'uniform',
    activeWhen: (s) => (Number(s['color.autoExposure'] ?? 0) > 0 ? true : '需要先打开自动曝光'),
    explain: {
      plain: '镜头转到别处之后，画面多久能自己调好亮度。画面压暗（从暗处转向亮处、先晃眼）比画面提亮（走进暗处、先一片黑）快大约 3 倍，和人眼一样：出洞时晃一下眼就好，进洞要好几秒才看清。',
      ends: ['很慢：像人眼，进暗处要好几秒才看清', '很快：像手机摄像头，几乎立刻跳到位'],
      lookAt: '镜头从亮处转到暗处后，画面完全稳定要多久',
      pitfalls: ['太快会让画面跟着每一盏灯、每一块天空一明一暗地抽动', '太慢会让切换场景、转镜头后长时间过暗或过亮，看起来像出了故障'],
    },
    port: { godot: 'CameraAttributesPractical.auto_exposure_speed（只有一个速度，变亮变暗一样快）', godotLevel: 'builtin' },
  },
  {
    id: 'color.metering', dim: 'color', group: '自动曝光', label: '测光方式', kind: 'choice', default: 'average', rebuild: 'uniform',
    activeWhen: (s) => (Number(s['color.autoExposure'] ?? 0) > 0 ? true : '需要先打开自动曝光'),
    options: [
      { value: 'average', label: '平均测光', desc: '整个画面一视同仁；天空、远景占得多，就主要按它们来定亮度', port: { godot: 'Godot 内置自动曝光就是整屏平均（它用算术平均，本工具用对数平均）', godotLevel: 'builtin' } },
      { value: 'center', label: '中央重点', desc: '画面中间权重大，边缘也算一点；最像普通相机，天空和画面边角的影响变小', term: { zh: '中央重点测光', en: 'Center-weighted metering' }, port: { godot: '内置自动曝光不支持；需关掉内置自动曝光，用缩小的 SubViewport 自己测光，再在脚本里改 CameraAttributes.exposure_multiplier', godotLevel: 'script' } },
      { value: 'spot', label: '点测光', desc: '只看画面正中一小块：跟随镜头时就是角色所在处，角色一走进阴影整个画面就跟着提亮', term: { zh: '点测光', en: 'Spot metering' }, prompt: '曝光跟着画面中心的主角走：主角走进阴影，整个画面随之提亮', port: { godot: '内置自动曝光不支持；需关掉内置自动曝光，在脚本里读画面中心一小块的亮度，自己算 CameraAttributes.exposure_multiplier', godotLevel: 'script' } },
    ],
    explain: {
      plain: '自动曝光"看"画面的哪里来决定亮暗。',
      lookAt: '主角站在亮天空前或暗洞口前时，主角本身是否看得清',
      term: { zh: '测光', en: 'Metering' },
      pitfalls: ['点测光在镜头扫过亮暗交界时跳得最厉害，最好配慢一点的适应速度'],
    },
    port: { godot: 'Godot 内置自动曝光只有整屏平均；中央重点 / 点测光需要自写脚本', godotLevel: 'script' },
  },
  {
    id: 'color.exposureKey', dim: 'color', group: '自动曝光', label: '目标亮度', kind: 'range', min: 0.08, max: 1, step: 0.01, default: 0.45, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (Number(s['color.autoExposure'] ?? 0) > 0 ? true : '需要先打开自动曝光'),
    explain: {
      plain: '自动曝光要把画面的平均亮度拉到多亮。默认值接近本工具白天场景的平均亮度：普通白天几乎不变，夜晚、洞穴被明显提亮，雪地、沙漠只压暗一点（三分之一到半档）。想让雪地、沙漠这类亮场景压暗得更明显，就把它调低（普通白天也会跟着暗一点）。',
      ends: ['适应后仍偏暗、低调', '适应后偏亮、高调'],
      term: { zh: '中灰 / 曝光基准', en: 'Key value / Middle grey' },
      pitfalls: ['调它和调"曝光"滑杆效果相近，但它只在自动曝光打开时起作用'],
    },
    port: { godot: 'CameraAttributesPractical.auto_exposure_scale', godotLevel: 'builtin' },
  },
  {
    id: 'color.exposureRange', dim: 'color', group: '自动曝光', label: '最大补偿', kind: 'range', min: 0.5, max: 5, step: 0.1, default: 2.5, unit: '档', rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (Number(s['color.autoExposure'] ?? 0) > 0 ? true : '需要先打开自动曝光'),
    explain: {
      plain: '自动曝光最多能提亮或压暗几档（1 档 = 亮度翻倍或减半）。范围小，夜晚仍然是夜晚、只是看得清一些；范围大，再暗的洞穴也会被提成白天。',
      ends: ['只微调，保留明暗气氛', '什么都能拉回正常亮度'],
      lookAt: '最暗的场景（洞穴、雨夜）和最亮的场景（雪地、沙漠）',
      pitfalls: ['范围太大时，暗场景被大幅提亮，噪点、色带和粗糙的暗部细节都会暴露出来'],
    },
    port: { godot: 'CameraAttributesPractical.auto_exposure_min_sensitivity / auto_exposure_max_sensitivity（感光度 = 亮度 × 800，exposure_sensitivity 保持默认 100）', godotLevel: 'builtin' },
  },
  {
    id: 'color.tonemap', dim: 'color', group: '色调映射', label: '色调映射', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无（色板原样）', desc: '颜色精确，亮部可能溢出', techPrompt: 'renderer.toneMapping = NoToneMapping（风格化色板要求颜色精确）' },
      { value: 'neutral', label: 'Neutral', desc: '基本保留固有色，只压高光', techPrompt: 'NeutralToneMapping' },
      { value: 'aces', label: 'ACES 电影', desc: '对比高，纯色会偏色、高光去饱和', pitfalls: ['ACES 会让高饱和纯色偏色'], techPrompt: 'ACESFilmicToneMapping' },
      { value: 'agx', label: 'AgX', desc: '去饱和明显，色板容易发灰', pitfalls: ['风格化色板配 AgX 容易发灰'], techPrompt: 'AgXToneMapping' },
      { value: 'reinhard', label: 'Reinhard', desc: '整体变柔和、偏灰' },
    ],
    explain: {
      plain: '把渲染出的高亮度压回屏幕能显示的范围。它会悄悄改变色板颜色。',
      lookAt: '纯色块是否还"纯"',
      pitfalls: ['要色板精确就用"无"或 Neutral；ACES/AgX 会让高饱和色板变灰或偏色'],
    },
    port: { godot: 'Environment.tonemap_mode = LINEAR / FILMIC / ACES / AGX', godotLevel: 'builtin' },
  },
  {
    id: 'color.grade', dim: 'color', group: '调色风格', label: '调色预设', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'tealOrange', label: '青橙', desc: '暗部偏青、亮部偏橙，商业大片常见', prompt: '青橙调色：暗部偏青、亮部与肤色偏橙' },
      { value: 'bleach', label: '漂白跳过', desc: '低饱和高对比，粗粝', prompt: '漂白跳过式调色：低饱和、高对比、银色质感', term: { zh: '漂白跳过', en: 'Bleach bypass' } },
      { value: 'sepia', label: '棕褐', desc: '旧照片', prompt: '棕褐旧照片色调' },
      { value: 'technicolor', label: '特艺彩色', desc: '早期彩色电影的浓艳三原色', prompt: '早期特艺彩色电影般浓艳的三原色', term: { zh: '特艺彩色', en: 'Technicolor (3-strip)' } },
      { value: 'cross', label: '交叉冲洗', desc: '暗部偏蓝、亮部偏黄绿', prompt: '交叉冲洗式的偏色：暗部偏蓝、亮部偏黄绿', term: { zh: '交叉冲洗', en: 'Cross processing' } },
      { value: 'faded', label: '褪色胶片', desc: '黑位提亮、颜色发灰发暖', prompt: '褪色胶片：黑位提亮、颜色发灰偏暖' },
      { value: 'mono', label: '黑白', desc: '去色并加一点对比', prompt: '黑白影像' },
    ],
    explain: {
      plain: '在色板之上整体套一层电影式调色。',
      lookAt: '暗部与亮部的偏色、肤色',
      term: { zh: '调色 / LUT', en: 'Color grading / LUT' },
      pitfalls: ['调色应放在色调映射之后、显示空间里', '调色会改变色板的精确颜色；要保持色板请调低强度'],
    },
    port: { godot: 'Environment.adjustment_color_correction（3D LUT 纹理，可由本工具预设烘焙）', godotLevel: 'builtin' },
  },
  {
    id: 'color.gradeAmount', dim: 'color', group: '调色风格', label: '调色强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.8, rebuild: 'uniform',
    activeWhen: (s) => (String(s['color.grade'] ?? 'none') === 'none' ? '需要先选择调色预设' : true),
    explain: { plain: '调色混入多少。', ends: ['原色', '完全套用'] },
  },
  {
    id: 'color.isolate', dim: 'color', group: '调色风格', label: '只留局部彩色', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'accent', label: '只留强调物', desc: '强调色、花、交互物、发光体保留颜色，其余变灰', prompt: '画面近乎黑白，只有关键物体保留鲜艳颜色' },
      { value: 'character', label: '只留角色', desc: '角色保留颜色，环境变灰', prompt: '环境去色，只有角色保留颜色，视线集中在角色上' },
      { value: 'both', label: '角色与强调物', desc: '角色和关键物体保留颜色', prompt: '环境去色，角色与关键物体保留颜色' },
    ],
    explain: {
      plain: '把画面大部分变成黑白，只让指定的东西保留颜色，视线会被它牢牢抓住。',
      lookAt: '保留颜色的物体与灰色环境的对比',
      term: { zh: '局部彩色 / 色彩隔离', en: 'Color isolation (selective color)' },
      pitfalls: ['保留颜色的东西太多就失去焦点'],
    },
    port: { godot: '在非强调材质的着色器里把 albedo 去饱和（本工具导出时按颜色角色处理）；或用 SubViewport 遮罩', godotLevel: 'shader' },
  },
  {
    id: 'color.isolateAmount', dim: 'color', group: '调色风格', label: '去色程度', kind: 'range', min: 0, max: 1, step: 0.01, default: 1, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (String(s['color.isolate'] ?? 'none') === 'none' ? '需要先选择保留什么颜色' : true),
    explain: { plain: '其余部分去掉多少颜色。', ends: ['保留原色', '完全黑白'] },
  },
  {
    id: 'color.quantize', dim: 'color', group: '限色', label: '限色', kind: 'choice', default: 'off', rebuild: 'uniform',
    options: [
      { value: 'off', label: '不限色' },
      { value: 'palette', label: '严格落在色板里', desc: '所有像素（含阴影、雾、高光）都换成色板中最近的颜色', prompt: '所有颜色严格限定在色板之内' },
      { value: 'levels', label: '每通道 N 级', desc: '像早期显卡的色深限制', prompt: '颜色深度被限制，色阶明显' },
    ],
    explain: {
      plain: '强制画面只使用有限的颜色。',
      pitfalls: ['后处理强制量化会把阴影、雾、辉光一起量化，结果和"材质用色板"完全不同', '在 RGB 里求最近色会跳色，这里用 OKLab'],
      term: { zh: '色板量化', en: 'Palette quantization' },
    },
    port: { godot: '全屏着色器（色板 uniform 数组或 LUT 贴图）', godotLevel: 'post' },
  },
  {
    id: 'color.levels', dim: 'color', group: '限色', label: '每通道级数', kind: 'int', min: 2, max: 32, step: 1, default: 6, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'color.quantize', 'levels') ? true : '只在"每通道 N 级"限色下生效'),
    explain: { plain: '每个颜色通道保留几级。' },
  },
  {
    id: 'color.dither', dim: 'color', group: '限色', label: '抖色', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'bayer2', label: 'Bayer 2×2' },
      { value: 'bayer4', label: 'Bayer 4×4', desc: '经典的十字网格抖色' },
      { value: 'bayer8', label: 'Bayer 8×8', desc: '更细腻的渐变' },
      { value: 'noise', label: '噪声抖色', desc: '颗粒状，没有规则图案' },
    ],
    activeWhen: (s) => (is(s, 'color.quantize', 'off') ? '需要先打开限色' : true),
    explain: {
      plain: '在两种颜色之间用点阵交错来"假装"中间色。',
      term: { zh: '抖色', en: 'Dithering' },
      pitfalls: ['屏幕空间抖色在转镜头时会游动（Obra Dinn 用球面映射解决）'],
    },
    prompt: (v) => (v !== 'none' ? '用规则点阵抖色表现渐变' : null),
    port: { godot: '全屏着色器 Bayer 矩阵', godotLevel: 'post' },
  },
  {
    id: 'color.ditherAnchor', dim: 'color', group: '限色', label: '抖色锚定', kind: 'choice', default: 'screen', rebuild: 'uniform',
    options: [
      { value: 'screen', label: '屏幕空间', desc: '点阵钉在屏幕上，转镜头时图案像贴在镜头上游动' },
      { value: 'world', label: '世界稳定', desc: '点阵映射到相机周围的球面（透视）或相机平面（正交），转动与平移时图案跟着世界走', term: { zh: '世界稳定抖色', en: 'World-stable dithering' }, prompt: '抖色点阵稳定地附着在世界上，转镜头时不游动' },
    ],
    activeWhen: (s) => (String(s['color.quantize'] ?? 'off') === 'off' || String(s['color.dither'] ?? 'none') === 'none' ? '需要先打开限色与抖色' : true),
    explain: {
      plain: '抖色点阵跟着屏幕还是跟着世界。Return of the Obra Dinn 用把点阵映射到相机球面的办法，解决转镜头时点阵游动闪烁。',
      lookAt: '转动或平移镜头时点阵是否闪烁',
      pitfalls: ['球面映射在画面边缘会有轻微拉伸', '相机移动（而不是转动）时仍有少量滑动'],
    },
    port: { godot: '全屏着色器里用 INV_VIEW_MATRIX 与 INV_PROJECTION_MATRIX 求视线方向，再映射 Bayer 坐标', godotLevel: 'post' },
  },
];

registerParams(defs);
