// 技术补全（2026-10-23）P2·镜头与复古显示 轨道的新参数：registerParams / extendOptions（见 ./registry.ts）
// 实现都在 src/engine/post/fx/retro*.ts（后处理扩展）；新参数默认关，旧配方画面不变
import { isImageScene } from '../content/sceneCatalog';
import { registerParams, str } from './registry';
import type { ParamDef, Values } from './types';

const n = (s: Values, id: string, d = 0) => Number(s[id] ?? d);
/** 立绘场景（背景是一张插画）没有纵深 */
const needDepth = (s: Values): true | string => (isImageScene(str(s, 'game.scene')) ? '立绘场景没有纵深，景深和移轴不做' : true);

const defs: ParamDef[] = [
  /* ---------- 1 按深度移轴 ---------- */
  {
    id: 'camera.tiltMode', dim: 'camera', group: '景深', label: '移轴方式', kind: 'choice', default: 'band', rebuild: 'uniform',
    activeWhen: (s) => (needDepth(s) !== true ? needDepth(s) : n(s, 'camera.tiltShift') > 0 ? true : '需要先打开移轴模糊'),
    options: [
      { value: 'band', label: '屏幕带状', desc: '按画面高度虚化：上下糊、中间一条清晰带（快，和以前一样）' },
      {
        value: 'depth', label: '按深度对焦', term: { zh: '浅景深微缩', en: 'Depth-based miniature DOF' },
        desc: '对焦平面上的东西整个清楚，前后按真实距离虚化：竖着的高塔不会被拦腰糊掉，清晰的前景边缘也不会糊进背景',
        prompt: '真实的浅景深：只有对焦距离上的物体清晰，前后按距离逐渐虚化，像微距拍摄桌上的模型',
        techPrompt: '后处理浅景深：按线性深度算带符号弥散圆（透视 ∝ 1 − 对焦距离/深度），单 pass 黄金角螺旋采样；比中心远的样本弥散不超过中心自己的弥散（清晰前景不渗进虚化背景、背景也不糊到清晰前景上），近处的虚化可以盖到清晰物体上',
        port: { godot: 'CameraAttributesPractical.dof_blur_far/near_enabled + 距离（Godot 自带的是按深度的景深）；或全屏 spatial 着色器读 hint_depth_texture 做同样的螺旋采样', godotLevel: 'builtin' },
      },
    ],
    explain: {
      plain: '移轴的两种做法。"屏幕带状"只看像素在画面里的高度；"按深度对焦"看像素离镜头多远：和对焦处一样远的地方都清楚，越往前、往后越糊——这才是微缩摄影真正的样子。',
      ends: ['屏幕带状：快，但竖着的物体上下被糊掉、清晰带是一条水平线', '按深度：清晰区沿着地面的等距线弯曲，高楼整栋清楚'],
      lookAt: '画面中间的高物体（塔、树、角色）：带状时它的顶部被糊掉，按深度时整个清楚；前景物体压在虚化背景上的边缘有没有一圈糊边',
      term: { zh: '景深微缩 / 移轴', en: 'Tilt-shift by depth' },
      tech: '对焦距离取"清晰带位置"那一条水平线上 5 个点的平均深度（天空不算，全是天空时用镜头注视点距离）。弥散圆透视按 (深度 − 对焦)/深度、正交按深度差 / 画面高度；32 点黄金角螺旋采样，样本的弥散盖不到中心就不取；背景样本的弥散被夹到中心弥散的两倍以内。',
      pitfalls: ['微缩感仍然要靠高俯角 + 高饱和 + 玩具材质一起撑', '和"景深（散景）"同时开会叠两层虚化', '正交镜头下远近大小不变，按深度的虚化会比透视弱，可以把移轴强度调高一些'],
    },
    prompt: (v, s) => (v === 'depth' && n(s, 'camera.tiltShift') > 0.15 ? '按真实距离的浅景深，只有对焦距离上的物体清晰' : null),
    port: { godot: 'CameraAttributesPractical 的远近景深（本身就是按深度的）', godotLevel: 'builtin' },
  },
  /* ---------- 3 像素清理 ---------- */
  {
    id: 'camera.pixelClean', dim: 'camera', group: '画面分辨率', label: '像素清理', kind: 'toggle', default: false, rebuild: 'uniform',
    activeWhen: (s) => (n(s, 'camera.pixelSize', 1) > 1 ? true : '需要像素化大于 1'),
    explain: {
      plain: '把低分辨率渲染出来的"缩小的三维图"修成像手点的像素画：去掉孤零零的杂点和毛刺，渐变并成平涂色块，物体外圈加一像素的描边——描边用物体自己颜色的深一档，背光面更深、受光面浅一点。',
      ends: ['缩小的三维截图：杂点、毛边、到处是半调色', '手点的像素画：干净的色块和一圈有轻重的轮廓'],
      lookAt: '角色和树的外轮廓（是不是一圈 1 像素的深色线、拐角有没有多出来的"双像素"）、平面上的零星杂点',
      term: { zh: '选择性描边 / 像素完美线', en: 'Selective outline (sel-out) / pixel-perfect lines' },
      tech: '两个低分辨率 pass：① 孤点（8 邻都不同色）与毛刺（只有 1 个同色正邻、另外 3 个同色）换成周围的颜色，强调色与角色的单点细节保留；没开限色时做 3×3 中值并色块；正邻深度跳变大于本侧坡度 2.5 倍（或邻居是天空）记为剪影边，按法线是否朝光分受光 / 背光；② L 形拐角多出来的一格去掉（像素完美），剪影边换成自己颜色的深一档（开了严格限色时从色板里挑）。',
      pitfalls: ['像素倍数太小（2 倍）时描边会显得粗；4~6 倍最像', '深度跳变小的地方（贴地的花草、平铺地面上的阴影）不会有描边——像素画家本来也不给它们描'],
      limits: '只能清理一帧里的画面，不能保证动起来时每帧的像素一致（真正的像素动画是逐帧手调的）',
    },
    prompt: (v, s) => (v && n(s, 'camera.pixelSize', 1) > 1 ? '像手点的像素画：干净的平涂色块，物体外圈一像素的选择性描边（背光面深、受光面浅），没有杂点和双像素拐角' : null),
    techPrompt: (v, s) => (v && n(s, 'camera.pixelSize', 1) > 1 ? '低分辨率后处理：孤点 / 毛刺去除 + 3×3 中值并色；深度跳变检测剪影，像素完美（去 L 拐角）后用 OKLab 加深本色作描边（受光面浅、背光面深）' : null),
    port: { godot: 'SubViewport 低分辨率渲染后接两个 canvas_item 着色器（texelFetch 邻域 + 深度 / 法线纹理）', godotLevel: 'post' },
  },
  {
    id: 'camera.pixelOutline', dim: 'camera', group: '画面分辨率', label: '像素描边', kind: 'choice', default: 'selective', rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (n(s, 'camera.pixelSize', 1) > 1 && s['camera.pixelClean'] === true ? true : '需要先打开像素清理'),
    options: [
      { value: 'selective', label: '选择性描边', desc: '本色加深一档：背光面深、受光面浅（像素画家最常用）', term: { zh: '选择性描边', en: 'Sel-out' } },
      { value: 'self', label: '本色加深', desc: '整圈都用本色的深一档，不分受光背光' },
      { value: 'ink', label: '墨色描边', desc: '整圈用色板的墨色（早期主机与贴纸感）' },
      { value: 'none', label: '不描边', desc: '只清理杂点和并色块' },
    ],
    explain: { plain: '像素清理加的那圈外轮廓用什么颜色。', lookAt: '物体外圈那一像素' },
    port: { godot: '同一个着色器的描边模式 uniform', godotLevel: 'post' },
  },
  /* ---------- 4 老胶片 ---------- */
  {
    id: 'surface.filmAge', dim: 'surface', group: '显示与胶片', label: '老胶片', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'bw', label: '黑白默片', term: { zh: '黑白拷贝', en: 'B&W film print' },
        desc: '1930 年代黑白动画的放映拷贝：浓黑奶白、片门晃动、闪烁、灰尘毛发、竖划痕、放映机暗角',
        prompt: '1930 年代黑白卡通的放映拷贝：浓黑与奶白的高反差，画面随片门轻微晃动、明暗闪烁，满是灰尘黑点、偶尔的毛发和竖直划痕，四周是不均匀的放映暗角',
        techPrompt: '全屏后处理（每秒 24 格取随机数）：全色片明度 + S 曲线 + 暖色拷贝色调；整幅随机位移（片门晃动）、逐格曝光起伏、程序灰尘 / 毛发 / 竖划痕、单色颗粒、不均匀椭圆暗角',
        port: { godot: 'canvas_item 全屏着色器，TIME 取整到 24 格做随机；同样的灰尘 / 划痕公式', godotLevel: 'post' },
      },
      {
        value: 'twoStrip', label: '双色印片', term: { zh: '双色特艺彩色', en: 'Two-strip Technicolor' },
        desc: '只有橙红和青绿两种染料：皮肤偏桃红、天空和树叶是青绿，没有真正的蓝和黄；其余同黑白默片',
        prompt: '早期双色特艺彩色胶片：只有橙红与青绿两种色调，没有真正的蓝色，带灰尘、划痕与闪烁',
        techPrompt: '红光 / 绿光两条记录，减色叠印橙红与青绿两种染料（透过率按密度取幂）；其余同黑白拷贝',
        port: { godot: 'canvas_item 全屏着色器（两条记录 → 两种染料透过率相乘）', godotLevel: 'post' },
      },
    ],
    explain: {
      plain: '让画面像一部 1930 年代的老动画在放映机上放：黑白（或只有橙红 / 青绿两色），整幅画面跟着片门轻轻晃、明暗一闪一闪，满屏灰尘、偶尔一根毛发、几条竖划痕。茶杯头（Cuphead）那种橡皮管卡通的"胶片味"就是这一层。',
      ends: ['干净的数字画面', '放了几百遍的旧拷贝'],
      lookAt: '画面四周的暗角和圆角、屏幕上一闪而过的黑点和毛发、竖直的细划痕；动起来看整幅画面的轻微跳动与闪烁',
      term: { zh: '老电影 / 胶片放映', en: 'Vintage film projection' },
      tech: '每秒 24 格：每格随机的整幅位移（片门晃动）与曝光起伏；灰尘按 90 像素的格子逐格随机撒，边缘用噪声扰动成不规则的点；毛发是 8 段的弯折线，挂 6 格；划痕是慢慢横移的竖线，分段时有时无；颗粒是单色、中间调最强；最后放映机暗角与片门圆角。',
      pitfalls: ['胶片味主要靠"动"：静止截图只看得到色调和脏点，晃动和闪烁要在播放时看', '配合"运动 → 帧率"的 12 帧 / 秒（一拍二）和粗黑描边，才是完整的橡皮管动画', '和录像带一起开 = 把老胶片翻录到录像带上，也是合理的组合'],
    },
    port: { godot: 'canvas_item 全屏着色器（post_film）', godotLevel: 'post' },
  },
  {
    id: 'surface.filmWear', dim: 'surface', group: '显示与胶片', label: '胶片磨损', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform',
    activeWhen: (s) => (str(s, 'surface.filmAge') === 'none' ? '需要先选老胶片' : true),
    explain: {
      plain: '拷贝放了多少遍：灰尘、毛发、划痕的多少，晃动和闪烁的幅度。',
      ends: ['新拷贝：偶尔一粒灰，几乎不晃', '旧拷贝：满屏灰尘划痕，晃得厉害'],
      lookAt: '屏幕上的黑点、竖划痕数量',
    },
    port: { godot: 'post_film 的 wear uniform', godotLevel: 'post' },
  },
  /* ---------- 5 湿地面反射 ---------- */
  {
    id: 'lighting.wetReflect', dim: 'lighting', group: '湿地面', label: '湿地面反射', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '雨后的地面：朝上的表面变深、变亮滑，积水里倒映出周围的建筑、灯和招牌，灯影在湿路面上拉成竖条。雨夜霓虹街的标志画面。',
      ends: ['干燥的地面', '满地积水，倒影清楚'],
      lookAt: '路面和屋顶上的倒影：发光体（灯笼、霓虹）下方的竖条灯影；转镜头时积水斑块是否贴在地上不动',
      term: { zh: '屏幕空间反射', en: 'Screen-space reflections (SSR)' },
      tech: '线性阶段（辉光之前）：由深度重建视空间位置，世界上方向用本帧相机矩阵换到视空间，法线朝上的非角色 / 树冠表面算"湿"；积水是世界 XZ 的噪声斑块。积水里法线拉平（下雨时加涟漪），沿反射方向视空间步进 48 步、交上后二分 5 次，取 HDR 原图颜色；出屏或打到天空时用天顶—地平线色。反射先沿屏幕竖直方向拉长模糊，积水里取清楚的、积水外取糊的；按菲涅耳（掠射角更亮）加权叠加，湿处底色压暗一半。',
      pitfalls: ['屏幕空间反射只能映出画面里看得到的东西：画面外、被挡住的物体照不出来，靠屏幕边缘的倒影会渐隐', '俯视角度下菲涅耳弱，倒影淡；低机位、贴着路面看才最像雨夜街道', '夜景 + 辉光 + 发光招牌时最出效果，白天平光下只是"地面发亮"'],
      limits: '没有真正的反射探针 / 光线追踪：画面外的霓虹招牌不会出现在倒影里',
    },
    prompt: (v) => (Number(v) > 0.2 ? '雨后湿漉漉的地面，积水倒映着周围的灯光与建筑，灯影在湿路面上拉成竖条' : null),
    techPrompt: (v) => (Number(v) > 0 ? '屏幕空间反射：深度重建视空间位置，法线朝上的表面按世界坐标噪声分积水斑块，视空间光线步进 + 二分细化，竖向拉长模糊，菲涅耳加权叠加并压暗湿表面' : null),
    port: { godot: 'Environment.ssr_enabled + 地面材质用世界坐标噪声降低 ROUGHNESS、压暗 ALBEDO（积水斑块）', godotLevel: 'shader' },
  },
  {
    id: 'lighting.wetCover', dim: 'lighting', group: '湿地面', label: '积水范围', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'uniform',
    activeWhen: (s) => (n(s, 'lighting.wetReflect') > 0 ? true : '需要先打开湿地面反射'),
    explain: {
      plain: '积水斑块占地面的多少。积水里倒影清楚，积水之外只是湿亮、倒影糊成竖条。',
      ends: ['零星几个小水洼', '整片地面像镜子'],
      lookAt: '地面上清楚倒影的范围',
    },
    port: { godot: '地面材质里世界坐标噪声的阈值', godotLevel: 'shader' },
  },
  /* ---------- 6 体积雾 ---------- */
  {
    id: 'atmosphere.volumetric', dim: 'atmosphere', group: '体积雾', label: '体积雾', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '真正"有体积"的雾和烟尘：贴着地面一层，越高越稀，会被阳光照亮——树冠、屋檐的缝隙里漏下一道道光柱，夜里每盏灯笼周围是一团暖色的光晕。和普通的"雾"不同，它知道哪里有影子。',
      ends: ['空气清透', '浓雾弥漫，光柱分明'],
      lookAt: '逆光时树林、建筑缝隙里斜射下来的光柱；夜里灯火周围的光晕；远处地面被雾吞掉的程度',
      term: { zh: '体积雾 / 体积光', en: 'Volumetric fog (raymarched)' },
      tech: '线性阶段、半分辨率：每个像素从镜头沿视线步进 32 步（起点按交错梯度噪声错开），每步算高度雾密度 × 3D 噪声，查一次太阳阴影贴图（光柱来自这里）× 前向散射相位函数，加天空环境光和点光源；累计内散射与透过率。合成时按深度相近加权上采样：画面 = 原图 × 透过率 + 内散射。雾层厚度、密度按场景半径换算。',
      pitfalls: ['光柱要有阴影才出得来：投影类型选"无"或"圆斑"时只剩均匀受光的雾', '逆光（镜头朝着太阳）时光柱最明显，顺光时只是一层亮雾', '和"雾"（距离雾）一起开会叠两层，通常把普通雾关掉或调淡'],
      limits: '只认太阳和点光源；没有多次散射，浓雾的暗部会偏暗',
    },
    prompt: (v) => (Number(v) > 0.2 ? '贴地的体积雾与烟尘，阳光从缝隙里斜射成光柱，灯火周围有光晕' : null),
    techPrompt: (v) => (Number(v) > 0 ? '半分辨率光线步进高度雾：3D 噪声密度、太阳阴影贴图可见性 × Henyey-Greenstein 前向散射 + 点光源，透过率合成，深度感知上采样' : null),
    port: { godot: 'Environment.volumetric_fog_enabled（自带阴影光柱与灯光散射）+ FogVolume 与密度噪声', godotLevel: 'builtin' },
  },
  {
    id: 'atmosphere.volHeight', dim: 'atmosphere', group: '体积雾', label: '雾层厚度', kind: 'range', min: 0.05, max: 1, step: 0.01, default: 0.35, rebuild: 'uniform',
    activeWhen: (s) => (n(s, 'atmosphere.volumetric') > 0 ? true : '需要先打开体积雾'),
    explain: {
      plain: '雾从地面往上能厚到多高。薄的是贴地的晨雾、烟尘；厚的能把整片树林、整座城吞进去；镜头在高处往下看时，薄雾层就像一片云海。',
      ends: ['贴地一层', '整个场景都在雾里'],
      lookAt: '雾的上沿：树干、建筑哪一截开始露出来',
    },
    port: { godot: 'Environment.volumetric_fog 的 height / height_density', godotLevel: 'builtin' },
  },
  {
    id: 'atmosphere.volNoise', dim: 'atmosphere', group: '体积雾', label: '烟尘起伏', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (n(s, 'atmosphere.volumetric') > 0 ? true : '需要先打开体积雾'),
    explain: {
      plain: '雾是均匀的一层，还是一团一团随风飘的烟尘。',
      ends: ['均匀的雾', '成团飘动的烟尘'],
      lookAt: '雾里的浓淡团块，以及它们随风慢慢移动',
    },
    port: { godot: 'FogVolume 材质里的 3D 噪声密度', godotLevel: 'shader' },
  },
  /* ---------- 7 隔行梳齿 ---------- */
  {
    id: 'surface.interlaceComb', dim: 'surface', group: '显示与胶片', label: '隔行梳齿', kind: 'toggle', default: false, rebuild: 'uniform',
    explain: {
      plain: '真正的隔行视频：一帧由两"场"拼成，单数行是这一刻、双数行是上一刻。画面静止时看不出来；一动起来，移动的物体和镜头平移时的竖边就裂成一排细梳齿——暂停老录像、DV 录像时最典型的毛病。',
      ends: ['逐行画面', '运动处满是梳齿'],
      lookAt: '转动镜头或角色走动时，竖直边缘（树干、墙角、角色轮廓）上一行一行错开的细齿',
      term: { zh: '隔行扫描梳齿', en: 'Interlace combing' },
      tech: '每帧轮换"本场"：本场的行取当前画面，另一场的行取上一帧的画面（跨帧缓冲保存）；行高按约 480 条扫描线换算。放在镜头畸变与录像带之前（录像带录的就是隔行信号）。',
      pitfalls: ['静止截图上看不到（两场一样）：要在动的时候看，或者在运动中暂停', '和录像带的"隔行扫描"开关不同：那个是静态的细横纹近似，这个是真实的两场时间差'],
    },
    prompt: (v) => (v ? '隔行视频：运动的物体与平移的镜头边缘裂成一行行梳齿' : null),
    techPrompt: (v) => (v ? '隔行合成：按行奇偶交替取当前帧与上一帧（跨帧渲染目标），每帧轮换场序' : null),
    port: { godot: '两个 SubViewport 轮流保存上一帧，全屏着色器按行奇偶取样', godotLevel: 'post' },
  },
  /* ---------- 8 立体显示 ---------- */
  {
    id: 'surface.stereo', dim: 'surface', group: '显示与胶片', label: '立体显示', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'anaglyph', label: '红青立体', term: { zh: '红青互补色立体', en: 'Red-cyan anaglyph' },
        desc: '左眼进红通道、右眼进青通道；戴红青眼镜看有纵深，不戴时远近物体边缘是红青双影',
        prompt: '红青立体画面：物体边缘带红青双影，越远（或越近）错开越多，戴红青眼镜可见纵深',
        techPrompt: '基于深度的视点合成：对焦距离零视差，按深度逆向取样左右眼，半彩色红青合成（左眼明度 → R，右眼 G/B）',
        port: { godot: '两台 Camera3D 渲染到两个 SubViewport 再合成，或全屏着色器读深度做单图合成', godotLevel: 'post' },
      },
      {
        value: 'virtualBoy', label: '红黑双目', term: { zh: 'Virtual Boy 红黑立体', en: 'Virtual Boy stereo' },
        desc: '两只眼的画面并排（交叉看可见立体），各 384×224、只有黑和三档红；纵深是一层层平面，天空纯黑',
        prompt: 'Virtual Boy 式红黑双目显示：两块并排的红黑小屏，只有黑与几档红色，纵深是分层的平面',
        techPrompt: '基于深度的视点合成（视差量化成几层平面），左右眼并排各 384×224，明度量化成黑 + 三档红，天空置黑',
        port: { godot: '两台 Camera3D + 红色调色 LUT；或全屏着色器单图合成', godotLevel: 'post' },
      },
    ],
    explain: {
      plain: '用画面的深度合成左右两只眼看到的画面：对焦处不动，远处的东西退进屏幕、近处的凸出来。"红青立体"戴老式红青眼镜看；"红黑双目"模仿任天堂 Virtual Boy：两块并排的红黑小屏。',
      ends: ['普通画面', '立体'],
      lookAt: '远处物体与近处物体边缘的错位方向是否相反；红黑模式下左右两块画面里近景的位置差',
      term: { zh: '立体视觉', en: 'Stereoscopic display' },
      tech: '基于深度的视点合成（DIBR）：视差 = 立体强度 × (1 − 对焦距离 / 深度)，每只眼迭代 4 次逆向取样；红青用半彩色合成；红黑双目每只眼按 384×224 采样、明度量化成 4 档红、视差分层。',
      pitfalls: ['单张画面合成的立体在物体边缘会被拉伸（被挡住的部分本来就看不到）', '强度太大看着累，红青立体 0.3~0.5 比较舒服', '红黑模式的两块画面要"交叉看"（两眼聚焦在屏幕前方）才看得出立体'],
      limits: '这是单图合成，不是真正两台相机：被前景挡住的背景没有真实内容',
    },
    port: { godot: '两台 Camera3D / XR，或全屏着色器单图合成', godotLevel: 'post' },
  },
  {
    id: 'surface.stereoDepth', dim: 'surface', group: '显示与胶片', label: '立体强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'uniform',
    activeWhen: (s) => (str(s, 'surface.stereo') === 'none' ? '需要先选一种立体显示' : true),
    explain: { plain: '左右眼错开得多大：越大纵深越强，也越累眼。', ends: ['几乎平面', '强烈的纵深（容易重影）'], lookAt: '远近物体边缘的双影宽度' },
    port: { godot: '两台相机的间距（或单图合成的视差系数）', godotLevel: 'post' },
  },
  /* ---------- 9 合成波落日 ---------- */
  {
    id: 'atmosphere.synthSun', dim: 'atmosphere', group: '天空', label: '合成波落日', kind: 'toggle', default: false, rebuild: 'uniform',
    explain: {
      plain: '80 年代复古未来的天空：深紫到洋红的渐变，地平线上一条霓虹亮线，一轮黄到洋红渐变的大太阳半沉在地平线上，下半部分被一道道横条切开。配上霓虹线框地形就是经典的 Outrun / Synthwave 画面。',
      lookAt: '镜头正前方地平线上的条纹太阳、地平线的亮线与光晕；地面积水里的倒影（配湿地面反射）',
      term: { zh: '合成波 / 复古未来落日', en: 'Synthwave / Outrun sun' },
      tech: '线性阶段，只改天空像素（深度 ≈ 1）：由逆视投影矩阵求视线方向，按仰角画天空渐变与地平线辉光；太阳固定在镜头正前方的方位、略高于地平线，黄—橙—洋红竖直渐变，下半部的横向缺口按 fract 取，越往下越宽并随时间下流；太阳亮度 2.6 倍（HDR），辉光会把它晕开。',
      pitfalls: ['太阳跟着镜头转（像远处的背景画），不是真实的太阳方向；灯光仍按"时间"参数照明，夜里配色最好', '需要画面里看得到天空：高俯角、正俯视时可能整幅都是地面'],
    },
    prompt: (v) => (v ? '复古合成波天空：深紫到洋红的渐变，地平线霓虹亮线，一轮黄到洋红的条纹大太阳半沉在地平线上' : null),
    techPrompt: (v) => (v ? '天空像素上画：仰角渐变 + 地平线辉光 + 镜头前方的条纹太阳（fract 横向缺口，HDR 亮度供辉光）' : null),
    port: { godot: 'sky shader（EYEDIR 求仰角与方位，同样的条纹公式）', godotLevel: 'shader' },
  },
  /* ---------- 10 分形天空 ---------- */
  {
    id: 'surface.fractal', dim: 'surface', group: '分形天空', label: '分形天空', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'mandelbulb', label: '曼德博球', term: { zh: '曼德博球', en: 'Mandelbulb' },
        desc: '一颗巨大的三维分形球悬在镜头前方的天空里，慢慢自转，表面是无穷嵌套的褶皱，边缘泛光',
        prompt: '天空里悬着一颗巨大的三维分形球（Mandelbulb），表面层层嵌套的褶皱，边缘发光，缓慢自转',
        techPrompt: '天空像素上全屏光线步进 8 次幂 Mandelbulb 距离估计（7 次迭代、最多 90 步），轨道陷阱着色 + 四面体差分法线 + 步数 AO 与边缘辉光，半分辨率',
        port: { godot: 'sky shader 里同样的距离估计步进（建议四分之一分辨率更新）', godotLevel: 'shader' },
      },
      {
        value: 'menger', label: '门格海绵', term: { zh: '门格海绵', en: 'Menger sponge' },
        desc: '无限重复的方孔海绵：镜头在中间的方孔里慢慢往前飞，四面是层层嵌套的方孔，远处没进雾里',
        prompt: '天空被无限重复的门格海绵占满：层层嵌套的方孔结构向远处延伸，像一座分形大教堂',
        techPrompt: '天空像素上全屏光线步进无限重复的 Menger 海绵距离场（4 层），按层级着色、距离雾，半分辨率',
        port: { godot: 'sky shader 里同样的距离场步进', godotLevel: 'shader' },
      },
    ],
    explain: {
      plain: '把天空换成用数学公式实时"算"出来的三维分形——不是贴图，是每个像素沿视线一步步逼近一个无限精细的形状。适合超现实、梦境、电子音乐可视化那一类画面。',
      lookAt: '天空：分形的层层嵌套、边缘的辉光；转镜头时它像天空盒一样跟着视线变化',
      term: { zh: '光线步进距离场', en: 'Raymarched SDF fractal' },
      tech: '线性阶段，半分辨率：用逆视投影矩阵求每个像素的视线方向，在"天空空间"（只跟镜头朝向、不跟位置）里对分形距离场做球体追踪（最多 90 步），打中后用四面体差分求法线、按轨道陷阱 / 层级取色板的发光色与强调色、步数近似 AO；合成时只替换天空像素（深度 ≈ 1）。',
      pitfalls: ['只画在天空上：画面里没有天空（俯视、室内）时看不到', '比普通后处理贵（每像素几十次距离计算），所以只在半分辨率算', '分形细节在低分辨率 / 像素化下会闪烁，配大像素时更像"抽象图案"'],
    },
    port: { godot: 'sky shader 里做距离场步进', godotLevel: 'shader' },
  },
  /* ---------- 2 硬件限色 ---------- */
  {
    id: 'color.hardware', dim: 'color', group: '硬件限色', label: '老机器限色', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '不模拟' },
      {
        value: 'nes', label: 'NES 红白机', term: { zh: '属性格 + 精灵调色板', en: 'NES attribute tables' },
        desc: '54 色；每 16×16 格只能 3 色 + 全屏共用底色，角色另有自己的 3 色；约 240 行',
        prompt: 'NES 8 位画面：固定 54 色，每个 16×16 区域只有 3 种颜色加共用底色，角色精灵自带 3 色',
        techPrompt: '后处理：按 240 行取硬件像素；1×1 pass 求全屏共用底色（采样量化后的众数），每 16×16 格贪心选 3 色（OKLab 误差最小），角色像素（角色编号）另选 3 色；逐像素在格内候选色里取最近',
        port: { godot: '三个全屏着色器 / SubViewport：共用底色 → 格子调色板小纹理 → 逐像素取色', godotLevel: 'post' },
      },
      {
        value: 'snes', label: 'SNES 超任', term: { zh: '15 位色 + 手工色阶', en: '15-bit color' },
        desc: '15 位色；明暗按色阶分档，档间轻微 2×2 抖色；约 224 行',
        prompt: 'SNES 16 位画面：15 位色，明暗分成整齐的色阶，色阶交界处有轻微抖色',
        techPrompt: '后处理：按 224 行取硬件像素；OKLab 明度 10 档、彩度与色相分档，2×2 Bayer 轻抖，最后量化到每通道 5 位',
        port: { godot: '全屏着色器（同一套 OKLab 分档 + 5 位量化）', godotLevel: 'post' },
      },
      {
        value: 'c64', label: 'C64', term: { zh: '多色位图模式', en: 'C64 multicolor bitmap' },
        desc: '16 色（偏灰偏棕的 VIC-II 色）；横向双宽像素，每 4×8 格 3 色 + 共用底色；约 200 行',
        prompt: 'Commodore 64 画面：横向双宽的胖像素，偏灰偏棕的 16 色，每个小格只有几种颜色',
        techPrompt: '后处理：硬件像素宽 = 2 × 高；Pepto 16 色；每 4×8 格贪心选 3 色 + 全屏共用底色',
        port: { godot: '同 NES 的三段着色器，格子 4×8、像素宽 2', godotLevel: 'post' },
      },
      {
        value: 'cga', label: 'CGA 四色', term: { zh: 'CGA 调色板 1', en: 'CGA palette 1 (high)' },
        desc: '只有黑、青、品红、白四色，中间色全靠抖色；约 200 行',
        prompt: 'CGA 四色画面：只有黑、青、品红、白，靠点阵抖色凑出中间色',
        port: { godot: '全屏着色器：4 色最近色 + Bayer 抖色', godotLevel: 'post' },
      },
      {
        value: 'ega', label: 'EGA 十六色', term: { zh: 'EGA 16 色', en: 'EGA 16-color' },
        desc: 'DOS 冒险游戏的 16 色 + 抖色；约 200 行',
        prompt: 'EGA 16 色画面，鲜艳的固定色，渐变处是点阵抖色',
        port: { godot: '全屏着色器：16 色最近色 + Bayer 抖色', godotLevel: 'post' },
      },
      {
        value: 'gbc', label: 'GBC 彩色掌机', term: { zh: '图块调色板', en: 'GBC tile palettes' },
        desc: '15 位色；每 8×8 图块 4 色，角色另有 3 色；144 行',
        prompt: 'Game Boy Color 画面：低分辨率，每个 8×8 图块 4 种颜色',
        port: { godot: '同 NES 的三段着色器，格子 8×8、每格 4 色、15 位色', godotLevel: 'post' },
      },
      {
        value: 'zx', label: 'ZX 属性冲突', term: { zh: '属性冲突', en: 'Attribute clash' },
        desc: '每 8×8 格只有墨色 + 纸色两色，且共用一个亮度位；角色走过彩色背景时整格变色；192 行',
        prompt: 'ZX Spectrum 画面：每个 8×8 格只有两种鲜艳原色，角色经过时整格颜色跟着变（属性冲突）',
        techPrompt: '后处理：按 192 行取硬件像素；每 8×8 格在两种亮度下穷举 28 对墨色 / 纸色，取 OKLab 误差最小的一对；格内像素二值化（可带有序抖色）',
        port: { godot: '格子 pass 穷举墨色 / 纸色写进小纹理，逐像素二值化', godotLevel: 'post' },
      },
    ],
    explain: {
      plain: '按老游戏机 / 老电脑真实的颜色规则重新"画"一遍画面：不只是颜色少，而是"每一小格只能用几种颜色"。NES 每 16×16 格 3 色，ZX Spectrum 每 8×8 格只有两色——角色走过彩色背景时整格一起变色，这种"属性冲突"本身就是那个年代的样子。',
      ends: ['现代画面', '严格的老机器规则'],
      lookAt: '把画面放大看格子：同一个 8×8 或 16×16 小方格里只有几种颜色；角色和背景交界处的方块色斑',
      term: { zh: '硬件调色板限制', en: 'Hardware color limits' },
      tech: '先按机型的行数算出一个硬件像素占几个内部像素（像素化够粗时就是 1），按硬件像素中心采样；有属性格的机型先在一张小纹理里为每格选色（采样量化后贪心挑色 / ZX 穷举墨纸对），再逐像素在格内候选色里找最近；角色（角色编号）在 NES / C64 / GBC 上走独立的精灵调色板。',
      pitfalls: ['和"限色"同时开时，这里在后（更接近真实硬件）；不需要再开限色', '有属性格的机型颜色以格为单位，镜头移动时色块会跳——这是真的硬件行为', '画面越细碎（草叶、远景）越容易满屏冲突色块；大色块、少细节的场景最像'],
      limits: 'NES 真机整屏只有 4 套背景子调色板、GBC 只有 8 套，这里每格自由选色（相当于子调色板不限套数）；精灵每行 8 个的上限与闪烁不模拟',
    },
    port: { godot: '全屏着色器链（共用底色 → 格子调色板 → 逐像素取色）', godotLevel: 'post' },
  },
  {
    id: 'color.hardwareDither', dim: 'color', group: '硬件限色', label: '硬件抖色', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (str(s, 'color.hardware') === 'none' ? '需要先选一种老机器' : true),
    explain: {
      plain: '格内两种颜色之间用点阵交错来凑中间色的程度。CGA、ZX 这类颜色极少的机器，老游戏几乎都靠抖色画明暗。',
      ends: ['纯色块，色阶生硬', '点阵明显，明暗更细'],
      lookAt: '大面积渐变（天空、受光面）里的点阵',
    },
    port: { godot: 'Bayer 4×4 阈值加到颜色上再取最近色', godotLevel: 'post' },
  },
];

registerParams(defs);
