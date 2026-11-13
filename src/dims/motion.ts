import { needCharacter } from './conditions';
import { registerParams } from './registry';
import type { ParamDef } from './types';

const defs: ParamDef[] = [
  {
    id: 'motion.frameRate', dim: 'motion', group: '节奏', label: '动画帧率', kind: 'choice', default: 'smooth', rebuild: 'uniform',
    options: [
      { value: 'smooth', label: '流畅', desc: '每帧都更新' },
      { value: '12', label: '一拍二（12fps）', desc: '动画片常见的节奏，带手绘顿挫感', prompt: '动画以一拍二（约 12fps）的节奏更新，带手绘顿挫感' },
      { value: '8', label: '一拍三（8fps）', desc: '更强烈的定格感', prompt: '动画以一拍三（约 8fps）的节奏更新，像定格动画' },
      { value: '4', label: '定格（4fps）', desc: '像黏土定格动画' , prompt: '动画像黏土定格一样一顿一顿' },
    ],
    explain: {
      plain: '环境动画（风、水、云、角色）多久更新一次。镜头仍然流畅，只有物体按节拍跳动。',
      term: { zh: '抽帧 / 一拍二', en: 'Animating on twos' },
      lookAt: '树和水的摆动、角色走路',
    },
    port: { godot: '着色器里 TIME 换成 floor(TIME*fps)/fps；AnimationPlayer 用离散插值', godotLevel: 'shader' },
  },
  {
    id: 'motion.squash', dim: 'motion', group: '角色', label: '挤压拉伸', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.4, rebuild: 'none',
    activeWhen: needCharacter,
    explain: { plain: '角色走路时身体压扁、拉长的弹性。', ends: ['僵硬', '弹性十足'], term: { zh: '挤压与拉伸', en: 'Squash & stretch' } },
    prompt: (v) => (Number(v) > 0.5 ? '角色移动时有明显的挤压拉伸弹性' : null),
  },
  {
    id: 'motion.bob', dim: 'motion', group: '角色', label: '走路起伏', kind: 'range', min: 0, max: 1, step: 0.01, default: 0.5, rebuild: 'none',
    activeWhen: needCharacter,
    explain: { plain: '走路时上下颠动。' },
  },
  {
    id: 'motion.speed', dim: 'motion', group: '角色', label: '移动速度', kind: 'range', min: 1, max: 10, step: 0.1, default: 4, unit: '米/秒', rebuild: 'none',
    activeWhen: needCharacter,
    explain: { plain: '角色走多快。速度会改变画面的感觉：慢更宁静，快更紧张。' },
  },
  {
    id: 'motion.fx2d', dim: 'motion', group: '2D 特效', label: '2D 手绘特效', kind: 'choice', default: 'none', rebuild: 'none',
    options: [
      { value: 'none', label: '无' },
      { value: 'smoke', label: '烟雾', desc: '8 帧赛璐璐烟团：爆开、翻滚、散成细丝', prompt: '角色脚边冒出手绘赛璐璐风格的烟团', status: 'live' },
      { value: 'explosion', label: '爆炸', desc: '8 帧：闪光、火球、转黑烟、余烬', prompt: '场景里有手绘赛璐璐风格的爆炸特效', status: 'live' },
      { value: 'slash', label: '刀光', desc: '8 帧：白芯蓝边的弧形刀光、散成星点', prompt: '角色身前有手绘的弧形刀光特效', status: 'live' },
    ],
    explain: {
      plain: '三维场景里播放手绘的二维序列帧特效（日式动作游戏、《原神》《塞尔达》的常见做法）。特效是 AI 生成的 8 帧图集，按设定帧率逐帧播放，跟随角色。',
      lookAt: '特效的节奏（一拍几）与它和三维光影的反差',
      term: { zh: '序列帧特效', en: 'Flipbook VFX' },
      tech: '公告板四边形 + 图集 UV 按帧跳；帧率单独设置，不随画面帧率',
      pitfalls: ['序列帧帧数少时必须配合抽帧节奏，插值反而显得廉价'],
    },
    port: { godot: 'AnimatedSprite3D（billboard，SpriteFrames 从图集切 8 帧，fps 同下），或 GPUParticles3D + ParticleProcessMaterial 的 anim_speed 与 flipbook', godotLevel: 'builtin' },
  },
  {
    id: 'motion.fxFps', dim: 'motion', group: '2D 特效', label: '特效帧率', kind: 'choice', default: '12', rebuild: 'none',
    options: [
      { value: '8', label: '8 帧/秒（一拍三）' },
      { value: '12', label: '12 帧/秒（一拍二）' },
      { value: '24', label: '24 帧/秒（一拍一）' },
    ],
    activeWhen: (s) => (String(s['motion.fx2d'] ?? 'none') === 'none' ? '需要先选一种 2D 特效' : true),
    explain: { plain: '序列帧每秒换几张。手绘特效通常一拍二或一拍三。' },
    port: { godot: 'SpriteFrames.set_animation_speed', godotLevel: 'builtin' },
  },
  {
    id: 'motion.fxSize', dim: 'motion', group: '2D 特效', label: '特效大小', kind: 'range', min: 0.5, max: 5, step: 0.1, default: 1.8, unit: '米', rebuild: 'none',
    activeWhen: (s) => (String(s['motion.fx2d'] ?? 'none') === 'none' ? '需要先选一种 2D 特效' : true),
    explain: { plain: '特效在世界里有多大。' },
    port: { godot: 'AnimatedSprite3D.pixel_size', godotLevel: 'builtin' },
  },
];

registerParams(defs);
