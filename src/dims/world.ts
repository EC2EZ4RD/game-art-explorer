import { all, needTerrain, notVoxel } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef, Values } from './types';

const tiles = (s: Values) => is(s, 'world.mesh', 'hexTiles', 'squareTiles');

const defs: ParamDef[] = [
  /* ---------- 噪声 ---------- */
  {
    id: 'world.noise', dim: 'world', group: '起伏从哪来', label: '噪声类型', kind: 'choice', default: 'simplex', rebuild: 'scene',
    options: [
      { value: 'value', label: '值噪声', term: { zh: '值噪声', en: 'Value noise' }, desc: '格点上放随机高度再插值，起伏偏"方"，能看出网格感', port: { godot: 'FastNoiseLite.TYPE_VALUE / TYPE_VALUE_CUBIC', godotLevel: 'builtin' } },
      { value: 'perlin', label: 'Perlin', term: { zh: '柏林噪声', en: 'Perlin noise' }, desc: '平缓连续的起伏，经典地形噪声', port: { godot: 'FastNoiseLite.TYPE_PERLIN', godotLevel: 'builtin' } },
      { value: 'simplex', label: 'Simplex', term: { zh: '单纯形噪声', en: 'Simplex noise' }, desc: '和 Perlin 类似，方向性伪影更少', port: { godot: 'FastNoiseLite.TYPE_SIMPLEX / TYPE_SIMPLEX_SMOOTH', godotLevel: 'builtin' } },
      { value: 'worley', label: 'Worley 细胞', term: { zh: '细胞噪声', en: 'Worley / Cellular' }, desc: '一个个鼓包或坑，像石板、玄武岩、岛链', port: { godot: 'FastNoiseLite.TYPE_CELLULAR', godotLevel: 'builtin' } },
    ],
    activeWhen: needTerrain,
    explain: {
      plain: '地形高度由噪声函数生成。不同噪声给出不同的"起伏性格"。',
      lookAt: '地形整体轮廓和山丘的形状',
      pitfalls: ['Perlin 与 Simplex 的差别远小于频率、振幅和分形参数带来的差别，不值得为它争论太久'],
      tech: 'CPU 端生成高度：h = noise(x·freq, z·freq)，写入顶点 y',
    },
    prompt: (v) => `地形起伏使用${({ value: '值噪声', perlin: 'Perlin 噪声', simplex: 'Simplex 噪声', worley: 'Worley 细胞噪声' } as Record<string, string>)[String(v)]}`,
    techPrompt: (v) => `高度场噪声：${v}（three.js 可用 addons/math/SimplexNoise.js 或 ImprovedNoise.js；Godot 用 FastNoiseLite）`,
    port: { godot: 'FastNoiseLite.noise_type', godotLevel: 'builtin' },
  },
  {
    id: 'world.fractal', dim: 'world', group: '起伏从哪来', label: '分形叠加', kind: 'choice', default: 'fbm', rebuild: 'scene',
    options: [
      { value: 'single', label: '单层', desc: '只有一层起伏，像果冻丘陵' },
      { value: 'fbm', label: 'fBm 分形', term: { zh: '分形布朗运动', en: 'fBm' }, desc: '大形、中形、细节叠加，自然地貌' },
      { value: 'ridged', label: 'Ridged 山脊', term: { zh: '脊状多重分形', en: 'Ridged multifractal' }, desc: '尖锐山脊与峡谷' },
      { value: 'billow', label: 'Billow 鼓包', term: { zh: '翻滚噪声', en: 'Billow' }, desc: '圆鼓鼓的丘陵、卵石滩、云团' },
    ],
    activeWhen: needTerrain,
    explain: {
      plain: '把同一种噪声按不同尺度叠起来。层数越多细节越碎。',
      lookAt: '山的轮廓是圆、是尖，还是一层层鼓包',
      pitfalls: ['低多边形网格上叠 4 层以上基本看不到，反而会出现尖刺噪点'],
    },
    prompt: (v) => ({ single: '单层平缓起伏', fbm: '分形叠加的自然起伏', ridged: '带尖锐山脊的起伏', billow: '圆鼓鼓的丘陵状起伏' } as Record<string, string>)[String(v)],
    port: { godot: 'FastNoiseLite.fractal_type = FRACTAL_FBM / FRACTAL_RIDGED / FRACTAL_PING_PONG', godotLevel: 'builtin' },
  },
  {
    id: 'world.octaves', dim: 'world', group: '起伏从哪来', label: '层数', kind: 'int', min: 1, max: 8, step: 1, default: 4, rebuild: 'scene',
    activeWhen: all(needTerrain, (s) => (is(s, 'world.fractal', 'single') ? '单层时没有层数' : true)),
    explain: { plain: '叠几层细节。', ends: ['大而圆的起伏', '越来越碎的细节'], term: { zh: '倍频程', en: 'Octaves' } },
    port: { godot: 'FastNoiseLite.fractal_octaves', godotLevel: 'builtin' },
  },
  {
    id: 'world.frequency', dim: 'world', group: '起伏从哪来', label: '起伏密度', kind: 'range', min: 0.01, max: 0.2, step: 0.005, default: 0.055, rebuild: 'scene',
    activeWhen: needTerrain,
    explain: { plain: '同样大小的岛上有几座山。', ends: ['一两座大山', '密密麻麻的小丘'], term: { zh: '频率', en: 'Frequency' } },
    port: { godot: 'FastNoiseLite.frequency', godotLevel: 'builtin' },
  },
  {
    id: 'world.height', dim: 'world', group: '起伏从哪来', label: '山有多高', kind: 'range', min: 0, max: 14, step: 0.1, default: 5.5, unit: '米', rebuild: 'scene',
    activeWhen: needTerrain,
    explain: { plain: '最高点和最低点的落差。', ends: ['几乎平地', '陡峭高山'], term: { zh: '振幅', en: 'Amplitude' } },
    prompt: (v) => (Number(v) < 2 ? '地势平坦' : Number(v) > 9 ? '起伏剧烈、山势陡峭' : null),
  },
  {
    id: 'world.warp', dim: 'world', group: '起伏从哪来', label: '扭曲流动感', kind: 'range', min: 0, max: 3, step: 0.05, default: 0, rebuild: 'scene',
    activeWhen: needTerrain,
    explain: {
      plain: '用另一组噪声推开采样位置，让地貌像被水流冲刷、被风吹过。',
      ends: ['规整的噪声起伏', '扭曲流动的有机地貌'],
      term: { zh: '域扭曲', en: 'Domain warping' },
      pitfalls: ['强度过大会变成大理石纹'],
    },
    prompt: (v) => (Number(v) > 0.5 ? '地貌带有被侵蚀般的扭曲流动感' : null),
    port: { godot: 'FastNoiseLite.domain_warp_enabled + domain_warp_amplitude', godotLevel: 'builtin' },
  },
  {
    id: 'world.redistribute', dim: 'world', group: '地貌造型', label: '平谷陡峰', kind: 'range', min: 0.4, max: 3.5, step: 0.05, default: 1.4, rebuild: 'scene',
    activeWhen: needTerrain,
    explain: {
      plain: '把高度做指数变换：值大时低处变平、高处变尖；值小时台地化。',
      ends: ['圆胖的台地', '平坦山谷配陡峭尖峰'],
      term: { zh: '高度重映射', en: 'Redistribution' },
      pitfalls: ['不做重映射，到处都是"半山腰"'],
    },
  },
  {
    id: 'world.terraces', dim: 'world', group: '地貌造型', label: '梯田台阶', kind: 'int', min: 0, max: 16, step: 1, default: 0, rebuild: 'scene',
    activeWhen: all(needTerrain, notVoxel),
    explain: {
      plain: '把高度量化成一层一层的台地，像等高线模型或梯田。0 为关闭。',
      ends: ['连续斜坡', '层层台地'],
      term: { zh: '阶梯化', en: 'Terracing' },
      pitfalls: ['直接 floor 会产生竖直墙面；色带和几何台阶是两种不同效果'],
    },
    prompt: (v) => (Number(v) > 0 ? `地形被量化为约 ${v} 层台地，像等高线模型` : null),
  },
  {
    id: 'world.terraceSoft', dim: 'world', group: '地貌造型', label: '台阶边缘软硬', kind: 'range', min: 0, max: 1, step: 0.05, default: 0.25, rebuild: 'scene', advanced: true,
    activeWhen: all(needTerrain, (s) => (Number(s['world.terraces']) > 0 ? true : '需要先打开梯田台阶')),
    explain: { plain: '台阶之间是垂直的崖还是缓坡。', ends: ['垂直的台阶壁', '圆滑的过渡'] },
  },
  {
    id: 'world.island', dim: 'world', group: '世界形状', label: '岛屿遮罩', kind: 'choice', default: 'circle', rebuild: 'scene',
    options: [
      { value: 'none', label: '无（连续大陆）', desc: '地形延伸到边界' },
      { value: 'circle', label: '圆岛', desc: '四周入海的小岛' },
      { value: 'square', label: '方岛', desc: '方形落差，像切块模型' },
      { value: 'archipelago', label: '群岛', desc: '多个小岛' },
    ],
    activeWhen: needTerrain,
    explain: { plain: '用距离遮罩把边缘压到海平面以下。', term: { zh: '衰减遮罩', en: 'Falloff mask' }, pitfalls: ['纯圆形遮罩的岛像个盘子，边界要加噪声'] },
    prompt: (v) => ({ none: null, circle: '四周环海的小岛', square: '方形的小块陆地', archipelago: '由多个小岛组成的群岛' } as Record<string, string | null>)[String(v)],
  },
  {
    id: 'world.seaLevel', dim: 'world', group: '世界形状', label: '海平面', kind: 'range', min: 0, max: 0.6, step: 0.01, default: 0.18, rebuild: 'scene',
    activeWhen: needTerrain,
    explain: { plain: '水淹到地形多高的位置。', ends: ['陆地多、水少', '只剩山顶露出水面'] },
  },
  {
    id: 'world.size', dim: 'world', group: '世界形状', label: '世界大小', kind: 'range', min: 16, max: 80, step: 1, default: 40, unit: '米', rebuild: 'scene',
    activeWhen: needTerrain,
    explain: { plain: '地图边长。和镜头距离一起决定"沙盘感"还是"大世界感"。' },
  },
  {
    id: 'world.curve', dim: 'world', group: '世界形状', label: '世界弯曲', kind: 'choice', default: 'none', rebuild: 'uniform',
    options: [
      { value: 'none', label: '平直' },
      { value: 'sphere', label: '小星球', desc: '四周都向下弯，像站在一颗小行星上', prompt: '世界向四周弯曲下沉，像一颗小星球，地平线是弧形', term: { zh: '弯曲世界', en: 'Curved world / Tiny planet' } },
      { value: 'cylinder', label: '滚筒', desc: '只有前后方向弯曲，远处地面像滚筒一样沉下去', prompt: '远处地面像滚筒一样向下弯曲，前景平整、远景沉入地平线', term: { zh: '滚筒世界', en: 'Rolling-log world' } },
    ],
    explain: {
      plain: '让远处的地面向下弯，画面更紧凑、有"小世界"的可爱感，也能自然藏起远处的东西。',
      lookAt: '画面上方与两侧的地平线',
      tech: '只在顶点着色器里按离焦点水平距离的平方下沉投影位置；光照、阴影、碰撞与行走仍按平直世界计算',
      limits: '这是视觉弯曲，不是真的球形世界：角色不会绕到星球背面，重力仍向下',
      pitfalls: ['弯曲太强时，高大的建筑会明显"后仰"'],
    },
    port: { godot: '在 spatial 着色器 vertex() 里按 (VERTEX 的世界坐标 - 焦点) 的距离平方下沉 VERTEX.y（MODEL_MATRIX / INV_VIEW_MATRIX 换算）', godotLevel: 'shader' },
  },
  {
    id: 'world.curveAmount', dim: 'world', group: '世界形状', label: '弯曲程度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'uniform',
    activeWhen: (s) => (String(s['world.curve'] ?? 'none') === 'none' ? '需要先选择弯曲方式' : true),
    explain: { plain: '弯得多厉害。', ends: ['几乎平直', '很小的星球'] },
  },
  {
    id: 'world.base', dim: 'world', group: '世界形状', label: '底座', kind: 'choice', default: 'none', rebuild: 'scene',
    options: [
      { value: 'none', label: '无底座', desc: '地形延伸进海里' },
      { value: 'plinth', label: '方形微缩底座', desc: '切下来的一块地，侧面露出土层，像桌上的模型', prompt: '世界被切成一块方形微缩底座，侧面露出土层剖面' },
      { value: 'round', label: '圆形底座', desc: '圆盘沙盘', prompt: '世界是一块圆形沙盘，侧面露出土层' },
      { value: 'floating', label: '浮空岛', desc: '底部是倒锥形岩石，悬在空中', prompt: '世界是悬浮在空中的浮空岛，底部是倒锥形岩石' },
    ],
    activeWhen: all(needTerrain, (s) => (tiles(s) ? '地块模式自带侧壁' : true)),
    explain: { plain: '把世界做成一块"摆在桌上的模型"，会强烈影响微缩感。', lookAt: '画面边缘、土层剖面' },
  },
  /* ---------- 网格结构 ---------- */
  {
    id: 'world.mesh', dim: 'world', group: '网格结构', label: '地表网格', kind: 'choice', default: 'jitter', rebuild: 'scene',
    options: [
      { value: 'grid', label: '规则网格（PlaneGeometry）', desc: '对角线全朝一个方向', pitfalls: ['面着色时会看到一条条同方向的斜纹，有机器感'], techPrompt: 'PlaneGeometry 规则网格（注意对角线同向的条纹）' },
      { value: 'alternate', label: '交替对角线', desc: '对角线交错，条纹消失，像菱格', techPrompt: '规则网格但对角线交替翻转' },
      { value: 'jitter', label: '抖动网格', desc: '顶点在水平方向随机偏移，像手工建模', techPrompt: '规则网格顶点做 XZ 方向抖动（共享顶点同步偏移，防止裂缝）' },
      { value: 'delaunay', label: '不规则三角网', term: { zh: 'Poisson + Delaunay', en: 'Poisson-disc + Delaunay' }, desc: '泊松采样点再三角化，最有机的低模地面', techPrompt: 'Poisson-disc 采样点 + Delaunay 三角化（npm delaunator）生成不规则低多边形地面' },
      { value: 'hexTiles', label: '六边形地块', desc: '一格一格的六边柱，桌游/策略感', techPrompt: '六边形柱地块（axial 坐标），高度量化成若干级，带侧壁' },
      { value: 'squareTiles', label: '方格地块', desc: '方柱地块，像体素但更大更整齐', techPrompt: '方形柱地块，高度量化，带侧壁与缝隙' },
    ],
    activeWhen: all(needTerrain, notVoxel),
    explain: {
      plain: '地面由什么形状的面片拼成。面着色时，网格结构直接变成画面上的纹理。',
      lookAt: '地面上面片的排列方式',
      pitfalls: ['PlaneGeometry 规则网格的对角线全朝一个方向，会出现机器感条纹'],
    },
    prompt: (v) => ({
      grid: '地面是规则网格三角面', alternate: '地面是对角交替的规则三角网', jitter: '地面是轻微错落的手工感三角面',
      delaunay: '地面是大小不一的有机三角面', hexTiles: '地面由六边形柱地块拼成', squareTiles: '地面由方柱地块拼成',
    } as Record<string, string>)[String(v)],
    port: { godot: 'SurfaceTool / ArrayMesh 按同样规则生成；六边形可用 MultiMeshInstance3D', godotLevel: 'script' },
  },
  {
    id: 'world.resolution', dim: 'world', group: '网格结构', label: '网格密度', kind: 'int', min: 12, max: 160, step: 1, default: 56, rebuild: 'scene',
    activeWhen: all(needTerrain, notVoxel),
    explain: { plain: '地面面片有多细。', ends: ['大块面片，低模感强', '细密面片，接近平滑'], term: { zh: '细分', en: 'Segments' } },
  },
  {
    id: 'world.jitter', dim: 'world', group: '网格结构', label: '抖动幅度', kind: 'range', min: 0, max: 0.5, step: 0.01, default: 0.32, rebuild: 'scene',
    activeWhen: all(needTerrain, notVoxel, (s) => (is(s, 'world.mesh', 'jitter') ? true : '只在抖动网格下生效')),
    explain: { plain: '顶点在水平方向偏移多少（以格距为单位）。', ends: ['规整', '错落'] },
  },
  {
    id: 'world.tileLevels', dim: 'world', group: '网格结构', label: '地块高度级数', kind: 'int', min: 2, max: 16, step: 1, default: 7, rebuild: 'scene',
    activeWhen: all(needTerrain, notVoxel, (s) => (tiles(s) ? true : '只在地块模式下生效')),
    explain: { plain: '地块的高度被量化成几级。', ends: ['平台很少，像棋盘', '高度变化细腻'] },
  },
  /* ---------- 生物群系 ---------- */
  {
    id: 'world.biome', dim: 'world', group: '地表分带', label: '分带依据', kind: 'choice', default: 'height', rebuild: 'uniform',
    options: [
      { value: 'height', label: '只按高度', desc: '沙滩→草地→高地→雪顶，像生日蛋糕的条纹', prompt: '地表按海拔分带' },
      { value: 'heightSlope', label: '高度 + 坡度', desc: '陡坡露出岩石，平地长草', prompt: '地表按海拔分带，陡坡露出岩石' },
      { value: 'heightMoist', label: '高度 + 湿度', term: { zh: '惠特克生物群系', en: 'Whittaker biomes' }, desc: '同海拔也有干湿差异', prompt: '地表按海拔与干湿分布成不同群系' },
      { value: 'single', label: '单一地表', desc: '整片同一颜色，只看形状', prompt: '地表为单一颜色，只靠形体与明暗区分' },
    ],
    activeWhen: needTerrain,
    explain: { plain: '地面颜色怎样分布。', lookAt: '地面色块的边界', pitfalls: ['只按高度分带会像蛋糕条纹'] },
  },
  {
    id: 'world.biomeBlend', dim: 'world', group: '地表分带', label: '分带过渡', kind: 'choice', default: 'face', rebuild: 'uniform',
    options: [
      { value: 'face', label: '按面（低模色块）', desc: '每个三角面一个颜色，交界呈锯齿', techPrompt: '每个三角面按面中心高度取一个颜色（非索引几何，面内三个顶点同色）' },
      { value: 'hard', label: '逐像素硬边', desc: '色带边界跟着等高线走，硬边' },
      { value: 'smooth', label: '逐像素渐变', desc: '颜色之间平滑过渡，更写实' },
    ],
    activeWhen: needTerrain,
    explain: {
      plain: '颜色带之间是锯齿色块、清晰等高线，还是渐变。',
      pitfalls: ['flatShading 不会让顶点色变平：要"每面一色"必须用非索引几何，面内三个顶点写同一个颜色'],
    },
    prompt: (v) => ({ face: '每个三角面一个纯色，色块交界呈锯齿', hard: '色带边界沿等高线清晰分开', smooth: '色带之间平滑渐变' } as Record<string, string>)[String(v)],
  },
  {
    id: 'world.beach', dim: 'world', group: '地表分带', label: '沙滩宽度', kind: 'range', min: 0, max: 0.2, step: 0.005, default: 0.05, rebuild: 'uniform', advanced: true,
    activeWhen: needTerrain, explain: { plain: '海平面以上多高还算沙滩。' },
  },
  {
    id: 'world.snowLine', dim: 'world', group: '地表分带', label: '雪线', kind: 'range', min: 0.4, max: 1.05, step: 0.01, default: 0.78, rebuild: 'uniform',
    activeWhen: needTerrain, explain: { plain: '多高开始积雪。', ends: ['半山腰就有雪', '没有雪'] },
  },
  {
    id: 'world.highland', dim: 'world', group: '地表分带', label: '高地起点', kind: 'range', min: 0.25, max: 0.9, step: 0.01, default: 0.5, rebuild: 'uniform', advanced: true,
    activeWhen: needTerrain, explain: { plain: '多高开始从低地草地变成高地颜色。' },
  },
  /* ---------- 散布 ---------- */
  {
    id: 'world.trees', dim: 'world', group: '植被与散布', label: '树木密度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.45, rebuild: 'scene',
    activeWhen: needTerrain, explain: { plain: '低地长阔叶树、高地长针叶松。', ends: ['光秃', '茂密森林'] },
    prompt: (v) => (Number(v) > 0.05 ? `随噪声自然分布的植被群落（低地圆冠阔叶树、高山针叶松）` : null),
  },
  {
    id: 'world.rocks', dim: 'world', group: '植被与散布', label: '石块密度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.35, rebuild: 'scene',
    activeWhen: needTerrain, explain: { plain: '散落的圆石。' },
    prompt: (v) => (Number(v) > 0.05 ? '散落圆润小石块' : null),
  },
  {
    id: 'world.flowers', dim: 'world', group: '植被与散布', label: '花草点缀', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.3, rebuild: 'scene',
    activeWhen: needTerrain, explain: { plain: '低地上的小花、灌木，提供细节频率。', ends: ['干净的大色块', '细碎点缀'] },
  },
  {
    id: 'world.clouds', dim: 'world', group: '植被与散布', label: '漂浮云', kind: 'int', min: 0, max: 16, step: 1, default: 6, rebuild: 'scene',
    activeWhen: needTerrain, explain: { plain: '漂在岛上空的卡通云团，会投下影子。' },
    prompt: (v) => (Number(v) > 0 ? '天空漂浮着团块状的积雨云' : null),
  },
  {
    id: 'world.scatterSpacing', dim: 'world', group: '植被与散布', label: '散布最小间距', kind: 'range', min: 0.8, max: 4, step: 0.1, default: 1.6, unit: '米', rebuild: 'scene', advanced: true,
    activeWhen: needTerrain,
    explain: { plain: '物体之间至少隔多远。', term: { zh: '泊松盘采样', en: 'Poisson-disc sampling' }, pitfalls: ['纯随机会穿插重叠；纯泊松又太均匀，需要配合密度噪声'] },
  },
];

registerParams(defs);
