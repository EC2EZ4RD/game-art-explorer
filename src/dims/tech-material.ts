// 技术补全（2026-10-23）M·材质与灯光 轨道的新参数：registerParams / extendOptions（见 ./registry.ts）
// 全部默认关：现有配方、复刻、缩略图的画面不变。引擎侧在 src/engine/ext/material.ts（写 uniform、加光锥、补顶点属性）
import { shadingNot } from './conditions';
import { extendOptions, is, num, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const lit = shadingNot('unlit', 'hatching', 'matcap');
const notVertex = (s: Values): true | string => (is(s, 'shading.model', 'vertex') ? '逐顶点光照不做这一层（它只有漫反射）' : true);
const both = (...fs: ((s: Values) => true | string)[]) => (s: Values): true | string => {
  for (const f of fs) { const r = f(s); if (r !== true) return r; }
  return true;
};
const isWire = (s: Values): true | string => (is(s, 'geometry.representation', 'wireframe') ? true : '只在几何表示为「线框」时生效');
const isVoxel = (s: Values): true | string => (is(s, 'geometry.representation', 'voxel') ? true : '只在几何表示为「体素方块」时生效');
const stageOn = (s: Values): true | string => (is(s, 'lighting.stage', 'none') ? '需要先打开舞台聚光' : true);

/* ---------------- 已有选择型参数追加的选项 ---------------- */

extendOptions('material.preset', [
  {
    value: 'cloisonne', label: '掐丝珐琅', desc: '金丝勾出花叶与卷草的格子，格里填松石蓝、朱红、明黄的釉料，表面一层亮釉',
    prompt: '掐丝珐琅：凸起的金丝分出花叶格，格内是松石蓝地子与红黄白的釉料，表面光亮如玻璃', term: { zh: '掐丝珐琅（景泰蓝）', en: 'Cloisonné enamel' }, status: 'live',
    techPrompt: '片元着色器：扭曲 Voronoi 的胞边 + 胞内阿基米德螺线作金丝遮罩；金丝走金属反射，釉面走清漆层；高度 → 屏幕导数法线做凸起',
    port: { godot: 'spatial 着色器：同样的程序图案；金丝 METALLIC = 1，釉面 CLEARCOAT = 1', godotLevel: 'shader' },
  },
  {
    value: 'porcelain', label: '青花瓷', desc: '白釉上的钴蓝：一圈圈弦纹、海水纹带和缠枝莲，釉面很亮',
    prompt: '青花瓷：白釉底上钴蓝绘的弦纹、海水纹与缠枝莲，钴料浓淡不匀、有深色铁锈斑，釉面光亮', term: { zh: '青花', en: 'Blue-and-white porcelain' }, status: 'live',
    techPrompt: '按世界高度分带画弦纹 / 海水纹 / 缠枝花（侧面）、顶面散落团花；钴料浓度乘值噪声；整体加清漆层',
    port: { godot: 'spatial 着色器程序图案 + CLEARCOAT；或AI 生成青花纹样贴图', godotLevel: 'shader' },
  },
  {
    value: 'lacquer', label: '剔红漆器', desc: '朱漆上剔刻的浮雕：锦地上浮起花云，刻地深处发暗，表面一层漆光',
    prompt: '剔红漆器：层层朱漆剔刻出浮雕花纹，锦地细密，花云饱满，刻地深处暗红，漆面温润有光', term: { zh: '剔红', en: 'Carved red lacquer' }, status: 'live',
    techPrompt: '程序高度场（方格锦地 + 扭曲 Voronoi 花瓣）→ 屏幕导数法线做浮雕，按高度在暗红与朱红之间取色，加清漆层',
    port: { godot: 'spatial 着色器：高度场做 NORMAL_MAP（或视差），CLEARCOAT = 0.7', godotLevel: 'shader' },
  },
]);

extendOptions('material.texture', [
  {
    value: 'blocks16', label: '16px方块贴图', desc: 'Minecraft 式：每个方块面 16×16 纹素，草、土、石、木板、砖、树叶各有各的图案，最近邻放大',
    prompt: '方块世界：每个方块面贴 16×16 的像素贴图（草顶、草侧、泥土、圆石、木板、原木、砖、树叶），最近邻采样',
    term: { zh: '方块贴图', en: '16×16 block textures' }, status: 'live',
    techPrompt: '片元里按整数纹素坐标程序生成 16×16 图案；体素时坐标 = fract(世界坐标 / 体素尺寸) × 16，正好对齐每个方块面；草侧按上方有没有方块决定画草边还是泥土',
    port: { godot: 'GridMap + 带 16px 贴图的 MeshLibrary（texture_filter = NEAREST），或程序图案的 spatial 着色器', godotLevel: 'texture' },
  },
]);

extendOptions('geometry.representation', [
  {
    value: 'wireframe', label: '线框', term: { zh: '消隐线框', en: 'Hidden-line wireframe' },
    desc: '只画三角形的边（同一平面上的对角线不画），面用暗色或天色填上，背后的线被挡住；线可以发光',
    prompt: '整个世界是发光的线框：只画几何的边，面被填成暗色或背景色把背后的线挡住（消隐），像矢量显示器和合成波',
    techPrompt: '每个三角形写重心坐标，同平面相邻三角形之间的边打上「不画」标记；片元里 min(bary) / fwidth 得到等宽的线，面填暗色（隐藏线消除）',
    pitfalls: ['three.js 的 wireframe: true 用 GL_LINES，线宽固定 1 像素、会画出四边形的对角线，也不能消隐'],
    port: { godot: 'spatial 着色器 + 网格里存重心坐标（CUSTOM0）；或 RenderingServer 的线框调试绘制（不能消隐）', godotLevel: 'shader' },
  },
]);

extendOptions('shading.model', [
  {
    value: 'vertex', label: '逐顶点光照', term: { zh: '高洛德着色', en: 'Gouraud (per-vertex) lighting' },
    desc: '光照在顶点上算好再插值（PS1 / N64 / 早期 3D）：明暗是大块柔和的渐变，没有高光，缝隙与朝下的面带烘焙式暗角',
    prompt: '逐顶点光照：明暗按顶点插值成柔和的大渐变，没有高光，角落带烘进顶点色的暗角，像 PS1 / N64 时代的静态光照',
    techPrompt: '顶点着色器里算天光 + 点光源 + 聚光 + 太阳 N·L，乘烘焙暗角（体素角落遮蔽、朝下的面），片元只乘固有色与投影',
    pitfalls: ['低面数的大三角形上点光源会被插值抹掉（这正是那个年代的样子）'],
    port: { godot: 'StandardMaterial3D 的 shading_mode = PER_VERTEX', godotLevel: 'builtin' },
  },
]);

/* ---------------- 新参数 ---------------- */

const defs: ParamDef[] = [
  // ---- 灯光：环境光照与舞台光 ----
  {
    id: 'lighting.envLight', dim: 'lighting', group: '环境光照', label: '天空环境光', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: both(lit, notVertex),
    explain: {
      plain: '暗部不再是一种平平的灰蓝，而是被整片天空照亮：朝天的面偏天色，朝向太阳一侧的天光更暖，朝下的面带一点地面反上来的颜色；有高光的材质还会映出天空。这是实时全局光照最常见的近似。',
      ends: ['两色半球环境光', '天空 + 地面反光照亮暗部，材质映出天空'],
      lookAt: '背光面与阴影里的颜色、物体底部的反光、光滑表面边缘映出的天色',
      term: { zh: '基于图像的光照（天空球谐）', en: 'Image-based lighting (SH irradiance + sky reflection)' },
      tech: '每帧把当前天色、太阳一侧的天光、按太阳照度算的地面反光投影成二阶球谐（9 个系数，亮度按原来的天光归一，换上后整体明暗不跳），片元用法线取辐照度当环境光；贴地处按离地高度压暗（接触暗角）；镜面反射按反射方向与粗糙度取天空（光滑 = 清楚的地平线，粗糙 = 退成辐照度），乘环境 BRDF 近似',
      limits: '只有天空和一块地面，没有物体之间的互相反光与遮挡；室内、洞穴里的天空光要靠调暗天色',
      pitfalls: ['环境光太强会把明暗交界冲平，卡通明暗宜弱用'],
    },
    prompt: (v) => (Number(v) > 0.3 ? '暗部被天空光与地面反光照亮，光滑材质映出天空（基于图像的环境光照）' : null),
    techPrompt: (v) => (Number(v) > 0 ? '环境光照：天空 → 二阶球谐辐照度；反射按粗糙度在清晰天空与辐照度之间插值，乘 Karis 环境 BRDF 近似' : null),
    port: { godot: 'WorldEnvironment：ambient_light_source = SKY、reflected_light_source = SKY（ProceduralSkyMaterial 自动生成辐照度与反射）', godotLevel: 'builtin' },
  },
  {
    id: 'lighting.stage', dim: 'lighting', group: '舞台光', label: '舞台聚光', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'single', label: '单束追光', desc: '一束暖白追光从头顶罩住角色，四周压暗——单点光源的戏剧布光', prompt: '一束追光从上方罩住主角，四周沉在黑暗里，戏剧化的单点布光' },
      { value: 'spots3', label: '三色布光', desc: '中间一束暖白主光，两侧一冷一品红的侧光，像剧场舞台', prompt: '舞台式布光：暖白主光加两侧冷色与品红侧光，光锥里有浮尘' },
      { value: 'moving', label: '摇头灯', desc: '三束彩色光锥来回扫动，像演出现场', prompt: '三束彩色光锥在场景里来回扫动，像演出现场的摇头灯' },
    ],
    activeWhen: lit,
    explain: {
      plain: '用聚光灯代替太阳：灯从高处照下来，地面上是清楚的光斑，空气里能看到带浮尘的光锥，其余地方压暗。追光跟着角色走。',
      lookAt: '光斑的边缘、光锥里的浮尘、光照不到的地方有多暗',
      term: { zh: '舞台聚光 / 体积光锥', en: 'Stage spotlights with volumetric cones' },
      tech: '着色器里加最多 3 盏聚光（锥角软边 + 距离衰减）；第一盏把太阳方向换成自己的方向，借太阳的阴影贴图投影；光锥是加色混合的锥形网格，亮度按视线穿过的厚度与沿轴衰减，乘滚动噪声做浮尘；太阳、天光、天色、雾色一起压暗',
      limits: '只有第一盏有投影（平行投影近似）；光锥不会被物体挡住',
      pitfalls: ['四周完全压黑会丢掉空间感，留一点环境光'],
    },
    prompt: (v) => (v === 'none' ? null : ({ single: '一束追光罩住主角，四周暗下去', spots3: '剧场舞台式三色布光，光锥里有浮尘', moving: '彩色摇头灯的光锥来回扫动' } as Record<string, string>)[String(v)]),
    port: { godot: 'SpotLight3D（shadow_enabled）× 1~3 + 体积雾（Environment.volumetric_fog，光照自带光锥）；或加色锥形网格 + 噪声着色器', godotLevel: 'builtin' },
  },
  {
    id: 'lighting.stageDark', dim: 'lighting', group: '舞台光', label: '四周压暗', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.85, rebuild: 'uniform',
    activeWhen: stageOn,
    explain: { plain: '聚光以外的地方（太阳、天光、天色、雾）压暗多少。', ends: ['白天里多了几盏灯', '漆黑的剧场'] },
    port: { godot: 'DirectionalLight3D.light_energy 与 Environment.ambient_light_energy 调低', godotLevel: 'builtin' },
  },
  {
    id: 'lighting.stageHaze', dim: 'lighting', group: '舞台光', label: '光锥浓度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'uniform',
    activeWhen: stageOn,
    explain: { plain: '空气里光锥与浮尘有多明显（像舞台上放了多少烟）。', ends: ['只有地上的光斑', '浓烟里的光柱'], lookAt: '光锥的亮度、浮尘颗粒' },
    port: { godot: 'Environment.volumetric_fog_density，或光锥网格的透明度', godotLevel: 'builtin' },
  },

  // ---- 材质：环境反射、清漆、透光 ----
  {
    id: 'material.envReflect', dim: 'material', group: '环境反射', label: '反射贴图', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '无' },
      { value: 'sky', label: '映出天空', desc: '表面按粗糙度映出天空与地平线，越光滑越清楚，边缘反射更强（菲涅尔）', prompt: '光滑表面映出天空与地平线，掠射角处反光更强' },
      { value: 'chrome', label: '镀铬', desc: '整个表面变成镜面镀铬：上面是天、中间一道清楚的暗地平线、下面是地，太阳是一个刺眼的亮点', prompt: '镜面镀铬：表面映出天空、锐利的地平线与地面，太阳在上面是一个刺眼的亮点（Y2K / Googie 镀铬）', term: { zh: '镀铬环境贴图', en: 'Chrome environment map' } },
      { value: 'matcap', label: '球面反射', desc: '老式球面反射贴图：按视角法线查一张画好的「影棚球」，窗格高光永远在左上，像 PS2 时代的闪亮金属', prompt: '球面反射贴图式的高光：窗格形状的亮光永远在左上方，随视角滑动，像老游戏里的闪亮金属', term: { zh: '球面反射贴图', en: 'Sphere map / Matcap reflection' } },
    ],
    activeWhen: both(lit, notVertex),
    explain: {
      plain: '建筑、器物与角色的表面映出周围的样子（地面、植被、云照旧）。三种做法：真的按反射方向取天空、全镜面的镀铬、老游戏常用的球面反射贴图（反射只跟视角有关，不跟场景走）。',
      lookAt: '物体顶面与侧面映出的天色、地平线那条暗线、高光的形状',
      tech: '天空 / 镀铬：reflect(-V, N) 取程序天空（地平线锐度随粗糙度）+ 太阳亮点；球面反射：视角空间法线的 xy 查程序画的影棚球',
      pitfalls: ['镀铬会盖掉固有色，色板只剩一点点色相'],
    },
    prompt: (v) => (v === 'none' ? null : ({ sky: '表面映出天空', chrome: '镜面镀铬材质，映出天空与锐利的地平线', matcap: '球面反射贴图式的窗格高光' } as Record<string, string>)[String(v)]),
    port: { godot: '天空 / 镀铬：StandardMaterial3D metallic = 1、roughness ≈ 0 + 天空反射；球面反射：spatial 着色器用 (VIEW_MATRIX × NORMAL).xy 查 matcap 纹理', godotLevel: 'builtin' },
  },
  {
    id: 'material.envAmount', dim: 'material', group: '环境反射', label: '反射强度', kind: 'range', min: 0, max: 1.5, step: 0.01, default: 1, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'material.envReflect', 'none') ? '需要先选一种反射贴图' : true),
    explain: { plain: '反射有多强。镀铬与球面反射时是盖住原来颜色的比例。', ends: ['若有若无', '强烈'] },
    port: { godot: 'StandardMaterial3D.metallic_specular / 自定义混合', godotLevel: 'builtin' },
  },
  {
    id: 'material.clearcoat', dim: 'material', group: '清漆与透光', label: '清漆层', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: both(lit, notVertex),
    explain: {
      plain: '在原来的材质上再罩一层透明亮漆：一个很小很亮的高光，边缘映出天空，底下的颜色照旧（汽车漆、釉面、珐琅、漆器、糖果）。',
      ends: ['没有', '厚厚一层亮漆'],
      lookAt: '高光是不是一个锐利的亮点、物体边缘是不是映出天色',
      term: { zh: '清漆层', en: 'Clearcoat' },
      tech: '第二层镜面：固定 F0 = 0.04 的菲涅尔，GGX 高光（清漆粗糙度）+ 按清漆粗糙度取天空反射；底层乘 (1 − F)。卡通明暗时高光是一个硬边点',
    },
    prompt: (v) => (Number(v) > 0.3 ? '表面罩着一层透明亮漆，有锐利的小高光，边缘映出天色' : null),
    port: { godot: 'StandardMaterial3D.clearcoat_enabled + clearcoat / clearcoat_roughness', godotLevel: 'builtin' },
  },
  {
    id: 'material.clearcoatRough', dim: 'material', group: '清漆与透光', label: '清漆粗糙度', kind: 'range', min: 0.02, max: 0.5, step: 0.01, default: 0.08, rebuild: 'uniform',
    activeWhen: (s) => (num(s, 'material.clearcoat') > 0 ? true : '需要先打开清漆层'),
    explain: { plain: '漆面多光滑。', ends: ['镜面般的亮点', '柔和的缎面光'] },
    port: { godot: 'StandardMaterial3D.clearcoat_roughness', godotLevel: 'builtin' },
  },
  {
    id: 'material.sss', dim: 'material', group: '清漆与透光', label: '次表面散射', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: both(lit, notVertex),
    explain: {
      plain: '光钻进表面、在里面散开再出来：皮肤、蜡、黏土、树叶、玉、半透明塑料的明暗交界处会透出一圈暖色（不是直接变黑），逆光时薄的地方（叶子、耳朵、纸、布）整片透亮。',
      ends: ['硬的明暗交界', '交界泛红、逆光透亮'],
      lookAt: '明暗交界线的颜色；逆光时树叶、角色边缘、纸灯是不是透光',
      term: { zh: '次表面散射 / 透射', en: 'Subsurface scattering & translucency' },
      tech: '交界外侧：包裹漫反射减去兰伯特，乘散射色（卡通明暗时是一条窄色带）；透射：逆光项 pow(V·−(L + 0.35N), 3)，阴影在朝光一侧偏移一段「厚度」再取样（厚的地方被自己挡住，只有薄边透光），按角色给厚度',
      limits: '厚度按颜色角色估计（叶、纸最薄），不是真的测量物体厚度',
    },
    prompt: (v) => (Number(v) > 0.3 ? '材质有次表面散射：明暗交界透出暖色，逆光时薄处透亮' : null),
    port: { godot: 'StandardMaterial3D.subsurf_scatter_enabled + subsurf_scatter_transmittance（透射）；或 light() 里写包裹光与逆光项', godotLevel: 'builtin' },
  },
  {
    id: 'material.sssColor', dim: 'material', group: '清漆与透光', label: '散射色', kind: 'color', default: '#FF5A3C', rebuild: 'uniform',
    activeWhen: (s) => (num(s, 'material.sss') > 0 ? true : '需要先打开次表面散射'),
    explain: { plain: '光在里面散开后带出来的颜色（和固有色混合）。皮肤偏红，玉偏绿，蜡偏橙；选白色 = 只用固有色的色相。' },
    port: { godot: 'StandardMaterial3D.subsurf_scatter_transmittance_color', godotLevel: 'builtin' },
  },
  {
    id: 'material.sssScope', dim: 'material', group: '清漆与透光', label: '散射范围', kind: 'choice', default: 'organic', rebuild: 'uniform',
    options: [
      { value: 'organic', label: '有机物', desc: '角色、皮肤、布、纸、树叶与花' },
      { value: 'characters', label: '只有角色', desc: '只给角色（皮肤）' },
      { value: 'all', label: '全部', desc: '整个世界都是半透明的（黏土、蜡、果冻、半透明塑料的世界）' },
    ],
    activeWhen: (s) => (num(s, 'material.sss') > 0 ? true : '需要先打开次表面散射'),
    explain: { plain: '哪些东西有次表面散射。' },
    port: { godot: '只给对应材质开 subsurf_scatter', godotLevel: 'builtin' },
  },
  {
    id: 'material.fuzz', dim: 'material', group: '清漆与透光', label: '绒毛边缘', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: both(lit, notVertex),
    explain: {
      plain: '表面长了一层短绒毛：轮廓一圈泛起柔和的绒光，剪影边缘毛茸茸、不再是一条光滑的线（毛毡、毛线、绒布、动物的毛）。',
      ends: ['光滑的边', '毛茸茸的剪影'],
      lookAt: '物体轮廓：边缘是不是毛的、有没有一圈绒光',
      term: { zh: '绒面光泽 + 毛边', en: 'Sheen + fuzzy silhouette' },
      tech: '掠射角处混入受光的绒光色，乘细纤维噪声；轮廓最外一圈按世界空间高频噪声丢像素，剪影被打碎成毛边',
      limits: '不是一根根的毛发几何（壳层 / 毛发卡片），近看是噪点状的毛边',
    },
    prompt: (v) => (Number(v) > 0.3 ? '表面有一层短绒毛，轮廓毛茸茸并泛起柔和的绒光' : null),
    port: { godot: 'StandardMaterial3D 的 rim + 自定义 light()；毛边需要壳层（shell）多遍绘制或 ALPHA_SCISSOR 噪声', godotLevel: 'shader' },
  },
  {
    id: 'material.patternScale', dim: 'material', group: '材料', label: '纹样密度', kind: 'range', min: 0.3, max: 3, step: 0.05, default: 1, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'material.preset', 'cloisonne', 'porcelain', 'lacquer') ? true : '只对掐丝珐琅、青花瓷、剔红漆器生效'),
    explain: { plain: '纹样每米重复几次。', ends: ['大花大格', '细密'] },
    port: { godot: '图案 uniform 的缩放', godotLevel: 'shader' },
  },

  // ---- 材质：做旧 ----
  {
    id: 'material.cracks', dim: 'material', group: '皴法与做旧', label: '龟裂纹', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '墙、石、木和地面上裂开一张不规则的裂网：大块之间是深缝，块里还有细碎的小裂。调小时只在零星的斑块里裂，调大整面都裂开（干涸的泥地、老墙皮、开片的釉）。',
      ends: ['完好', '整面龟裂'],
      lookAt: '墙面与地面的裂缝：是不是不规则的多边形网、缝边有没有一点翘起的亮边',
      term: { zh: '龟裂 / 开片', en: 'Craquelure / crack network' },
      tech: '世界坐标盒式投影上两级 Voronoi 的 F2 − F1 = 到胞边的距离，线宽乘噪声，覆盖范围由低频噪声与强度阈值决定；fwidth 抗锯齿',
    },
    prompt: (v) => (Number(v) > 0.3 ? '墙面与地面布满不规则的龟裂纹' : null),
    port: { godot: 'spatial 着色器：Voronoi 边距离（或AI 生成裂纹贴图三平面取样）乘到 ALBEDO', godotLevel: 'shader' },
  },
  {
    id: 'material.crackScale', dim: 'material', group: '皴法与做旧', label: '龟裂尺度', kind: 'range', min: 0.2, max: 4, step: 0.05, default: 1, unit: '块/米', rebuild: 'uniform', advanced: true,
    activeWhen: (s) => (num(s, 'material.cracks') > 0 ? true : '需要先打开龟裂纹'),
    explain: { plain: '裂块有多大。', ends: ['大块', '细碎'] },
    port: { godot: '图案缩放 uniform', godotLevel: 'shader' },
  },
  {
    id: 'material.grime', dim: 'material', group: '皴法与做旧', label: '污渍', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '按朝向和高度分布的脏：墙根和贴地的地方溅满泥，朝上的面长出青苔，竖直的墙面上挂着一道道往下流的雨痕，凹处积灰。比均匀的做旧更像真的用过很多年。',
      ends: ['干净', '又脏又旧'],
      lookAt: '墙根、屋顶与石头的顶面、墙面上竖直的深色条',
      term: { zh: '按朝向与高度的污渍', en: 'Directional grime (dirt / moss / streaks)' },
      tech: '离地高度（场景建好后按地面高度算进顶点属性）→ 墙根泥；N.y → 苔；竖直面上纵向拉长的噪声 → 雨痕；三维 fbm 低处 → 积灰',
      limits: '凹处积灰用噪声近似，不是真的按几何凹陷（需要烘焙 AO / 曲率）',
    },
    prompt: (v) => (Number(v) > 0.3 ? '墙根溅泥、顶面长苔、墙面挂着往下流的雨痕' : null),
    port: { godot: 'spatial 着色器：NORMAL.y 混苔、世界高度混泥、纵向噪声做雨痕；离地高度可以烘进 CUSTOM 通道', godotLevel: 'shader' },
  },

  // ---- 材质：网眼透明 ----
  {
    id: 'material.screenDoor', dim: 'material', group: '透明', label: '网眼透明', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '关（正常混合）' },
      { value: 'water', label: '水面', desc: '水的半透明改成按网格丢像素：浅水处是一格格的点阵', prompt: '水面的半透明是规则的点阵网眼（像土星 / N64 时代）' },
      { value: 'all', label: '水、玻璃与树叶', desc: '水面之外，玻璃窗、树冠的轮廓也用点阵网眼透出后面', prompt: '水、玻璃与树叶边缘都用点阵网眼表现半透明' },
    ],
    explain: {
      plain: '老主机没有（或不肯用）半透明混合时的做法：按一张 4×4 的抖动表，把一部分像素直接丢掉，远看像半透明，近看是规则的网眼。和低分辨率、像素化放在一起最有那个年代的味道。',
      lookAt: '浅水、玻璃窗、树冠的边缘：是不是一格一格的点阵',
      term: { zh: '网眼透明 / 抖动透明', en: 'Screen-door transparency' },
      tech: '片元里 alpha ≤ Bayer 4×4 阈值时 discard，其余写不透明（还写深度，所以不用排序）',
      pitfalls: ['画面不像素化时点阵很细，会被看成噪点；配合像素化尺寸 ≥ 2'],
    },
    prompt: (v) => (v === 'none' ? null : '半透明用点阵网眼（screen-door）表现'),
    port: { godot: 'BaseMaterial3D.transparency = ALPHA_HASH（或 distance_fade_mode = PIXEL_DITHER）', godotLevel: 'builtin' },
  },

  // ---- 几何：线框、体素 AO、逐帧颤动 ----
  {
    id: 'geometry.wireFill', dim: 'geometry', group: '线框', label: '面的填充', kind: 'choice', default: 'dark', rebuild: 'uniform',
    options: [
      { value: 'dark', label: '暗色消隐', desc: '面填成几乎全黑，背后的线被挡住（矢量显示器、Battlezone）' },
      { value: 'sky', label: '背景色消隐', desc: '面填成和天空一样的颜色：物体只剩线，但仍然互相遮挡' },
      { value: 'shaded', label: '保留明暗', desc: '面照常着色，线叠在上面（建模软件的线框叠加）' },
    ],
    activeWhen: isWire,
    explain: { plain: '线框里的面怎么处理：填暗色 / 背景色把背后的线挡住（消隐），还是照常着色。', term: { zh: '隐藏线消除', en: 'Hidden-line removal' } },
    port: { godot: '同一着色器里 ALBEDO 的取法', godotLevel: 'shader' },
  },
  {
    id: 'geometry.wireWidth', dim: 'geometry', group: '线框', label: '线宽', kind: 'range', min: 0.5, max: 4, step: 0.1, default: 1.3, unit: 'px', rebuild: 'uniform',
    activeWhen: isWire,
    explain: { plain: '线有几个像素宽（不随远近变）。', ends: ['发丝', '粗线'] },
    port: { godot: '着色器里 fwidth 的倍数', godotLevel: 'shader' },
  },
  {
    id: 'geometry.wireGlow', dim: 'geometry', group: '线框', label: '线的辉光', kind: 'range', min: 0, max: 2, step: 0.01, default: 1, rebuild: 'uniform',
    activeWhen: isWire,
    explain: { plain: '线有多亮。超过 1 时配合「辉光」会发出霓虹般的光晕。', ends: ['素线', '霓虹发光'] },
    port: { godot: 'EMISSION + Environment.glow_enabled', godotLevel: 'builtin' },
  },
  {
    id: 'geometry.wireColor', dim: 'geometry', group: '线框', label: '线色', kind: 'choice', default: 'role', rebuild: 'uniform',
    options: [
      { value: 'role', label: '按物体颜色', desc: '每个物体的线用它自己的颜色（提亮）' },
      { value: 'accent', label: '强调色', desc: '所有线都用色板的强调色' },
      { value: 'emissive', label: '发光色', desc: '所有线都用色板的发光体颜色（霓虹）' },
    ],
    activeWhen: isWire,
    explain: { plain: '线用什么颜色。' },
    port: { godot: 'uniform 颜色', godotLevel: 'shader' },
  },
  {
    id: 'geometry.voxelAO', dim: 'geometry', group: '体素', label: '体素 AO', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: isVoxel,
    explain: {
      plain: 'Minecraft 那种方块缝里的暗角：两个方块相接的内角、方块贴着墙的边会柔和地暗下去，方块堆一下子有了体积和接触感。',
      ends: ['平的方块', '每条内角都有暗角'],
      lookAt: '方块与方块相接的内角、地面上方块的根部',
      term: { zh: '体素环境光遮蔽（逐顶点）', en: 'Voxel corner ambient occlusion' },
      tech: '建场景后给每个方块记下 26 个邻居有没有方块（实例属性，两个整数位掩码）；顶点着色器按这个顶点所在面外侧的两条边、一个角各有没有方块算出 0~3 级遮蔽（两边都有 = 最暗），插值到面上',
      pitfalls: ['四边形固定的对角线方向会让个别暗角插值不对称（Minecraft 用翻转对角线修，这里没有）'],
    },
    prompt: (v) => (Number(v) > 0.3 ? '方块之间的内角带 Minecraft 式的柔和暗角' : null),
    port: { godot: '生成网格时按邻居算进顶点色（COLOR）乘到 ALBEDO；GridMap 不做这个，需要自建网格', godotLevel: 'script' },
  },
  {
    id: 'geometry.boil', dim: 'geometry', group: '精细度', label: '逐帧颤动', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    explain: {
      plain: '每一帧形体都轻轻变一点：定格动画里黏土被手一次次捏过，轮廓与表面微微地颤。配合「运动 → 帧率」抽帧，每换一帧换一次形。',
      ends: ['纹丝不动', '明显地颤'],
      lookAt: '物体轮廓与描边：是不是每一拍都在微微变形',
      term: { zh: '逐帧形变（沸腾线）', en: 'Boiling / stop-motion jitter' },
      tech: '顶点着色器按世界位置取平滑噪声位移，种子每一拍（抽帧的帧号）换一次；描边外壳与阴影用同一位移，不会脱开',
    },
    prompt: (v) => (Number(v) > 0.2 ? '形体每一帧都有细微的变形颤动，像定格动画' : null),
    port: { godot: 'spatial 着色器 vertex() 里按 floor(TIME × fps) 换种子的噪声位移', godotLevel: 'shader' },
  },

  // ---- 角色载体：精灵法线 ----
  {
    id: 'shape.spriteNormal', dim: 'shape', group: '角色载体', label: '精灵法线', kind: 'range', min: 0, max: 1, step: 0.01, default: 0, rebuild: 'uniform',
    activeWhen: (s) => (is(s, 'shape.carrier', 'model') ? '只对像素精灵与纸片人生效' : true),
    explain: {
      plain: '给平面的像素精灵自动长出法线：从轮廓向里鼓起一圈倒角，再按亮度起伏，于是太阳与夜里的灯火能从侧面照亮它、背光时边缘亮起一圈轮廓光——2D 精灵也有了动态光照。',
      ends: ['平贴的精灵', '有体积、受侧光'],
      lookAt: '夜里灯笼旁的精灵：靠灯一侧亮、另一侧暗；逆光时的轮廓光',
      term: { zh: '自动法线贴图（2D 动态光照）', en: 'Auto-generated sprite normal maps' },
      tech: '片元里在当前帧的格子内取一圈邻居的 alpha，透明邻居的方向就是法线朝外的方向（轮廓倒角），再加亮度的梯度做细节；法线从精灵平面转到世界，按太阳、点光源算漫反射，背光边加轮廓光',
      limits: '自动法线只知道轮廓和明暗，不知道真实形体（鼻子、衣褶）；精确的要手绘或从 3D 烘焙法线贴图',
    },
    prompt: (v) => (Number(v) > 0.3 ? '像素精灵带法线贴图：被场景里的光源从侧面照亮，背光时有轮廓光' : null),
    port: { godot: 'Sprite2D/Sprite3D 的 CanvasTexture（normal_texture）+ PointLight2D；法线可以用 Laigter / SpriteIlluminator 生成', godotLevel: 'builtin' },
  },
];

registerParams(defs);
