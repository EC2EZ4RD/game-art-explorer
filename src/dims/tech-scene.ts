// 技术补全（2026-10-23）K·伪3D与复古镜头 轨道的新参数：registerParams / extendOptions（见 ./registry.ts）
// 实现：src/engine/particles.ts（GPU 粒子）+ src/engine/ext/particles.ts（引擎扩展）；都默认关，旧配方画面不变
import { registerParams } from './registry';
import type { ParamDef, Values } from './types';

const particlesOn = (s: Values): true | string => (String(s['motion.particles'] ?? 'none') === 'none' ? '需要先选一种粒子' : true);
const beatOn = (s: Values): true | string => (Number(s['motion.beat'] ?? 0) > 0 ? true : '需要先设节拍（大于 0）');

const defs: ParamDef[] = [
  {
    id: 'motion.particles', dim: 'motion', group: '粒子与节拍', label: '粒子特效', kind: 'choice', default: 'none', rebuild: 'none',
    options: [
      { value: 'none', label: '无' },
      {
        value: 'embers', label: '火星', desc: '橙红的火星从下往上飘、一闪一闪，越高越小（篝火、铁匠铺、战场余烬）',
        prompt: '画面里飘着一点点往上升的橙红火星', techPrompt: 'GPU 点粒子：位置按时间在顶点着色器里算（上升 + 正弦摆动 + 闪烁），发光色写进场景缓冲',
        port: { godot: 'GPUParticles3D + ParticleProcessMaterial（gravity 向上、turbulence）+ 发光材质', godotLevel: 'builtin' },
      },
      {
        value: 'fireflies', label: '萤火', desc: '贴着地面慢慢游走的光点，一会儿亮一会儿灭（夜晚的林子、沼泽）',
        prompt: '夜里草丛上方飘着忽明忽暗的萤火虫光点',
        port: { godot: 'GPUParticles3D（低速、随机方向）+ 透明度曲线做闪烁', godotLevel: 'builtin' },
      },
      {
        value: 'snow', label: '飘雪', desc: '大小不一的雪片往下飘、左右荡；比天气里的雪更密、有远近大小',
        prompt: '大片雪花缓缓飘落，近大远小',
        port: { godot: 'GPUParticles3D（gravity 向下、小幅湍流），粒子网格用面向镜头的四边形', godotLevel: 'builtin' },
      },
      {
        value: 'magic', label: '魔法光环', desc: '绕着玩家螺旋上升的发光星点（三种颜色），像技能蓄力、法宝护体',
        term: { zh: '技能光环', en: 'Skill aura particles' },
        prompt: '角色周身环绕着螺旋上升的发光星点，像正在施法', techPrompt: '粒子绕角色做螺旋（角度随时间、半径与高度按种子），四角星形点精灵 + 辉光',
        port: { godot: 'GPUParticles3D 挂在角色下，ParticleProcessMaterial 的 orbit_velocity + 向上的 linear_velocity；或写一个粒子着色器', godotLevel: 'shader' },
      },
      {
        value: 'confetti', label: '彩纸', desc: '六种颜色的小纸片翻着落下（胜利、庆典、节奏游戏的高潮）',
        prompt: '五颜六色的彩纸翻转着从空中落下，庆典气氛',
        port: { godot: 'GPUParticles3D + 每粒子随机颜色 + 绕自身轴旋转（angular_velocity）', godotLevel: 'builtin' },
      },
      {
        value: 'sparks', label: '火花', desc: '一簇簇炸开、带重力落下的亮点（焊花、烟花、打击火花）；设了节拍时每一拍一起炸',
        prompt: '空中一簇簇火花炸开又落下',
        port: { godot: 'GPUParticles3D（one_shot + explosiveness = 1，按节拍 restart()）', godotLevel: 'script' },
      },
      {
        value: 'dust', label: '浮尘', desc: '空气里慢慢漂浮的细小亮点，颜色跟着阳光（老房子、洞窟、逆光里最明显）',
        prompt: '空气里漂浮着细小的尘埃，被光照亮',
        port: { godot: 'GPUParticles3D（极低速度、长寿命）+ 不受光的小点', godotLevel: 'builtin' },
      },
    ],
    explain: {
      plain: '在画面里加一层飘动的粒子：火星、萤火、雪、魔法光环、彩纸、火花、浮尘。粒子铺在镜头看的地方周围，大小跟着取景走（2D 小取景和 3D 大场景都合适），颜色取当前色板（发光色、强调色……），换色板跟着变。',
      ends: ['没有粒子：画面是静的', '密密麻麻：氛围很浓，但会抢主体'],
      lookAt: '粒子和主体抢不抢眼；像素化 / 描边 / 辉光配方里粒子是不是也跟着变成同一种画风',
      term: { zh: '粒子特效', en: 'Particle FX' },
      tech: '一个 THREE.Points（最多 3000 点），位置全在顶点着色器里按时间和每点的随机数算出来，CPU 每帧只写几个 uniform；不透明 + 4×4 抖动做软边（像素风里也是干净的点），写场景的颜色和法线 / 角色两张输出，所以后处理照常作用',
      pitfalls: ['粒子多了会把画面变脏：先少后多', '萤火、魔法在白天亮底上不明显，夜景或暗色板里才出效果', '这里的粒子不和场景碰撞（不会落在地上堆起来）'],
      limits: '不是逐粒子模拟：没有碰撞、风场和堆积；要真实的烟雾体积要体积渲染',
    },
    port: { godot: 'GPUParticles3D + ParticleProcessMaterial（各种类见选项）', godotLevel: 'builtin' },
  },
  {
    id: 'motion.particleDensity', dim: 'motion', group: '粒子与节拍', label: '粒子密度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'none',
    activeWhen: particlesOn,
    explain: { plain: '同时有多少粒子。', ends: ['零星几点', '铺满画面'], lookAt: '粒子和主体抢不抢眼' },
    port: { godot: 'GPUParticles3D.amount', godotLevel: 'builtin' },
  },
  {
    id: 'motion.particleSize', dim: 'motion', group: '粒子与节拍', label: '粒子大小', kind: 'range', min: 0.4, max: 3, step: 0.05, default: 1, unit: '倍', rebuild: 'none',
    activeWhen: particlesOn,
    explain: { plain: '每颗粒子有多大（在默认大小上乘的倍数）。像素化的配方里大一点才看得见。', ends: ['细小的点', '大颗的光斑'] },
    port: { godot: 'ParticleProcessMaterial.scale_min / scale_max', godotLevel: 'builtin' },
  },
  {
    id: 'motion.beat', dim: 'motion', group: '粒子与节拍', label: '节拍', kind: 'int', min: 0, max: 200, step: 1, default: 0, unit: 'BPM', rebuild: 'none',
    explain: {
      plain: '让画面跟着一个固定的拍子跳：每一拍发光的东西（灯、霓虹、发光体、强调色）一起亮一下再落回去，点光源闪一下，粒子涨一下，火花踩着拍子炸。0 = 关。',
      ends: ['0：不跟拍', '180：很快的电子乐'],
      lookAt: '发光体和灯的明暗节奏；配合「霓虹矢量」「辉光」类配方和「火花」「彩纸」粒子最明显',
      term: { zh: '节拍同步', en: 'Beat sync' },
      tech: '脉冲 = exp(−5.5 × 拍内相位) × 强度；每帧把色板里发光体 / 强调色 / 交互色和点光源的颜色按脉冲乘一个倍数（引擎重写颜色后自动认出新的底色，不会越乘越亮）',
      pitfalls: ['这里的拍子是固定 BPM，不是听音乐算出来的', '拍子太快 + 强度太大会闪得难受（注意光敏）'],
      limits: '没有接音频：真正的节奏游戏要从音乐的节拍时间表（或实时频谱）驱动',
    },
    prompt: (v) => (Number(v) > 0 ? `画面里的灯光与发光体随 ${v} BPM 的节拍一明一暗地脉动` : null),
    techPrompt: (v) => (Number(v) > 0 ? `按 ${v} BPM 的节拍脉冲（指数衰减）调制发光材质的强度、点光源与粒子大小` : null),
    port: { godot: 'AudioStreamPlayer.get_playback_position() 换算拍内相位（或 AudioEffectSpectrumAnalyzer 取低频能量）→ 写 global shader uniform / 灯光 energy', godotLevel: 'script' },
  },
  {
    id: 'motion.beatPulse', dim: 'motion', group: '粒子与节拍', label: '节拍强度', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.6, rebuild: 'none',
    activeWhen: beatOn,
    explain: { plain: '每一拍亮多少：小 = 轻轻呼吸，大 = 明暗起伏很大（拍与拍之间更暗）。', ends: ['轻轻的呼吸感', '强烈的闪动'] },
    port: { godot: '脉冲乘的系数', godotLevel: 'script' },
  },
];

registerParams(defs);
