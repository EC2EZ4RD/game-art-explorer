import { SCENES } from '../content/sceneCatalog';
import { hasSceneBuilder } from '../engine/scene/sceneRegistry';
import { registerParams } from './registry';
import type { ParamDef } from './types';

export const GENRES: [string, string, string][] = [
  ['explore', '探索与冒险', '第三人称/俯视移动、远近景切换；看路径、地标、空间与情绪'],
  ['action', '动作与 Roguelite', '角色、敌人、投射物和危险区；看动态可读性与特效遮挡'],
  ['platformer', '横版平台', '横向运动与落点；看前后景区分、平台边缘与轮廓'],
  ['shooter', '第一/第三人称射击', '移动镜头与远近目标；看目标识别与材质噪声'],
  ['rpg', '角色扮演', '远景探索与近景角色；看角色与环境是否一致'],
  ['puzzle', '解谜与侦探', '固定或缓慢镜头；看视觉引导与信息密度'],
  ['horror', '恐怖与悬疑', '暗处移动与有限照明；看气氛与必要信息的平衡'],
  ['survival', '生存与制作', '资源、植被、建筑与昼夜；看可采集物与危险'],
  ['builder', '建造与经营', '缩放与密集物件；看远景识别与建筑层级'],
  ['factory', '工厂与自动化', '连接与运输；看功能表达与颜色编码'],
  ['life', '生活与养成', '室内、农场、角色互动；看温度感与细节主次'],
  ['strategy', '策略与战术', '远距观察单位与阵营；看单位辨识与地图信息'],
  ['card', '卡牌与桌面', '卡面与桌面；看字体、图形与信息优先级'],
  ['racing', '竞速与驾驶', '快速移动与弯道；看路线预读与速度感'],
  ['sandbox', '沙盒与物理', '堆叠、破坏与状态变化；看结构与材料是否好理解'],
  ['narrative', '叙事与视觉小说', '对话、角色与背景；看立绘、背景与界面的一致性'],
];

const defs: ParamDef[] = [
  {
    id: 'game.scene', dim: 'game', group: '实验载体', label: '场景', kind: 'choice', default: 'sandbox', rebuild: 'scene',
    options: SCENES.map((m) => ({
      value: m.id, label: m.name, desc: `${m.category} · ${m.desc}`,
      disabledWhen: () => (hasSceneBuilder(m.id) ? false : '这个场景还没实现，已列入待办'),
    })),
    explain: {
      plain: '风格要放在合适的空间里检查。同一场景比较风格用于找原因，换场景用于检查适用范围。',
      lookAt: '空间结构、对象与尺度是否随场景改变',
    },
    prompt: (_v, s) => {
      const m = SCENES.find((x) => x.id === s['game.scene']);
      return m ? `场景：${m.name}（${m.category}）。${m.desc}` : null;
    },
  },
  {
    id: 'game.seed', dim: 'game', group: '实验载体', label: '随机种子', kind: 'int', min: 1, max: 99999, step: 1, default: 7, rebuild: 'scene',
    explain: {
      plain: '同一个种子永远生成同一个世界。比较风格时固定种子，才能确定变化来自参数而不是布局。',
      term: { zh: '随机种子', en: 'Seed' },
      tech: 'mulberry32(seed) 驱动所有噪声与散布；配方里保存种子即可复现布局',
    },
    port: { godot: 'FastNoiseLite.seed 与 RandomNumberGenerator.seed 使用同一个整数', godotLevel: 'builtin' },
    prompt: () => null,
    techPrompt: (v) => `所有程序生成使用同一个可复现种子（当前 ${v}），提供"重新生成种子"按钮`,
  },
  {
    id: 'game.kit', dim: 'game', group: '世界与文化', label: '建筑文化套件', kind: 'choice', default: 'chinese', rebuild: 'scene',
    options: [
      { value: 'chinese', label: '中式', desc: '悬山铺面、幌子、灯笼', prompt: '建筑采用中式木构：坡屋顶、檐下额枋、幌子与灯笼' },
      { value: 'european', label: '欧洲小镇', desc: '石基 + 木框架 + 陡坡屋顶', prompt: '建筑采用欧洲小镇木框架房：石砌底层、木构架上层、陡峭坡屋顶' },
      { value: 'modern', label: '现代街道', desc: '平顶店铺、玻璃橱窗、路灯', prompt: '建筑是现代平顶店铺：玻璃橱窗、雨棚、灯箱招牌与路灯' },
    ],
    activeWhen: (s) => (['street', 'harbor'].includes(String(s['game.scene'])) ? true : '只在街巷、港口这类可替换建筑的场景生效'),
    explain: {
      plain: '同一个空间布局，换一套建筑语法。文化差异必须进入结构（屋顶、立面、开窗），不是换几件符号化道具。',
      lookAt: '屋顶轮廓、立面比例、招牌与灯的形式',
      limits: '这里是程序化近似；考据级的地域差异见 docs/survey/04 的建筑调研',
    },
  },
  {
    id: 'game.genre', dim: 'game', group: '观看条件', label: '目标品类', kind: 'choice', default: 'explore', rebuild: 'none',
    options: GENRES.map(([value, label, desc]) => ({ value, label, desc })),
    explain: {
      plain: '品类决定玩家实际怎样看画面。漂亮的宣传视角，换到真实镜头和移动下可能看不清。',
      lookAt: '主角、路径和交互物在该品类的镜头下是否容易辨认',
    },
    prompt: (v) => {
      const g = GENRES.find((x) => x[0] === v);
      return g ? `目标品类：${g[1]}（检查重点：${g[2]}）` : null;
    },
    status: 'partial',
  },
  {
    id: 'game.controls', dim: 'game', group: '观看条件', label: '操作', kind: 'choice', default: 'walk', rebuild: 'none',
    options: [
      { value: 'walk', label: 'WASD 行走', desc: 'WASD / 方向键移动角色，平滑贴合地形高度', techPrompt: '键盘 WASD/方向键移动角色，沿相机朝向换算方向；用射线投射到实际网格表面求高度（不要直接用噪声函数，抖动或离散后的网格会和噪声不一致）' },
      { value: 'none', label: '只观察', desc: '不控制角色，专心看画面' },
    ],
    activeWhen: (s) => (SCENES.find((x) => x.id === s['game.scene'])?.features.character ? true : '当前场景没有角色'),
    explain: { plain: '让角色动起来，才能检查运动中的可读性、线条和纸纹是否闪烁。', lookAt: '角色移动时轮廓是否清楚、脚下是否贴地' },
    port: { godot: 'CharacterBody3D + move_and_slide()，或 RayCast3D 向下求地面高度', godotLevel: 'builtin' },
  },
];

registerParams(defs);
