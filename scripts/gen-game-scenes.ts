/*
 * 生成场景注册表的数据（轨道 D，docs/workbench-redesign.md §5.1）：src/content/gameScenes.gen.json。
 *   npx tsx scripts/gen-game-scenes.ts           生成（写文件）
 *   npx tsx scripts/gen-game-scenes.ts --check   只核对：生成结果与文件里的一样、数据自检没有问题（门禁用，不写文件）
 *
 * 大部分由现有数据反推（§5.1「生成来源」）：
 *   - 24 个内容包（src/hud/content/packs/*）：一个包一个场景；环境 = 包的建议场景 ContentPack.scene，品类 = 包的 genres；
 *   - 2026-10-23 的 2D / 2.5D 环境（等距 / 纸艺剧场 / 伪 3D，轨道 Z2）：一个环境一个场景，借一个现有的内容包（Spec.pack），id = gs.<表的键>；
 *   - 布局：LAYOUT_PACK 反推（这个包对应的第一个品类布局）；画面品类：GENRE_PACK 反推，没有时取包 genres 里的品类；
 *   - 镜头机位：docs/survey/06-genre-camera-ui.md 的 A17 表（按画面品类）换算成 camera.* 的取值；
 *   - 26 个复刻（src/content/replicas/*.json）：名作组，一屏一个界面（只取索引：id、名字、环境、配方、屏 key；套用时再懒加载整份）；
 *   - 单屏名作（ex.* 案例屏，商业化的除外）：名作组里的单界面卡。
 * 只有这些是人工写的（本文件下面的表）：场景名、视角分组、默认皮肤、2D 环境候选、每个场景的界面顺序与标签。
 * 默认皮肤要过质量门槛（可读性检查 + 文字不小于 20px@1080p，§5.2）：验证记录见 docs/redesign/track-D.md。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/dims/index';
import { getParam } from '../src/dims/registry';
import { RECIPE_MAP } from '../src/content/recipes';
import { SCENES } from '../src/content/sceneCatalog';
import { GENRE_PACK, LAYOUT_PACK, PACKS } from '../src/hud/content';
import { isMonetizationPreset } from '../src/content/uiMonetization';
import { PRESET, presetsOf } from '../src/hud/sys/spec';
import { CAMERA_ANGLES } from '../src/dims/camera';
import { defaultValues, isUiKey } from '../src/dims/registry';
import { resolveUi } from '../src/hud/sys/resolve';
import { applyPreset } from '../src/hud/sys/apply';
import { BOSS_POSE, bossScreenValues, skinStyleValue } from '../src/content/gameScenes';
import { SCREEN_KEYS } from '../src/state/layers';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/content/gameScenes.gen.json');
const CHECK = process.argv.includes('--check');

/* ---------------- 人工表 ---------------- */

type Group = '3D自由' | '俯视' | '横版' | '等距' | '棋盘' | '立绘卡牌' | '伪3D' | '赛道' | '名作';
interface Spec {
  /**
   * 内容包（不写 = 表的键就是包 id）。2026-10-23 的 2D / 2.5D 环境（等距、纸艺剧场、伪 3D）一个环境一个场景，借现有的内容包：
   * 场景 id 仍是 gs.<表的键>，原来 24 个场景的 id 不变
   */
  pack?: string;
  /** 3D 后备环境（2D 环境没注册时用；不写 = 包的建议场景） */
  env3d?: string;
  /** 卡片悬停的说明（不写 = 包名：简介；借包的场景写成「环境名：看点。UI 内容借用「包名」」） */
  desc?: string;
  /** 场景名「品类·环境」 */
  name: string;
  /** 换上 2D 环境后的名字（环境变了，名字跟着变；不写 = 不变） */
  name2d?: string;
  group: Group;
  skin: string;
  /** 2D 环境候选（F 的构建器 id，按顺序取第一个已注册的）；都没有时用包的建议场景 */
  env2d?: string[];
  /** 换环境里排在前面的几个（场景弹窗） */
  altEnvs?: string[];
  /** 界面顺序（下面 SCREEN_DEFS 的 id） */
  screens: string[];
  /** 镜头的人工修正（盖在 A17 换算的值上） */
  rig?: Partial<Rig>;
  seed?: number;
  kit?: string;
  /** 建议配方（不强制，场景卡悬停里提一句） */
  look?: string;
  /**
   * 「局内」用哪个界面画（审查修复 21）：卡牌、视觉小说的局内就是手牌 / 对话框——品类布局的 auto HUD 画出来是卡组管理面板 / 日记面板，
   * 第一眼不像在打牌、看小说。给了时第一个界面仍叫「局内」（id = hud），值用这个界面的；它自己不再单列
   */
  home?: string;
}

/** 24 个包 → 场景（§5.1 的表；★ 的改用新 2D 环境，环境上线前用包的建议场景）+ 借包的 2D / 2.5D 场景（表尾） */
const SPECS: Record<string, Spec> = {
  sandbox: { name: '沙盒·小岛', group: '3D自由', skin: 'skin.pixelWood', screens: ['hud', 'inventory', 'build', 'map', 'pause', 'title', 'settings'], look: 'inspiration-fixed', rig: { fov: 28 } },
  snowline: { name: '探索·雪线', group: '3D自由', skin: 'skin.thinGeo', altEnvs: ['oblique-village'], screens: ['hud', 'map', 'inventory', 'dialogue', 'codex', 'pause', 'title'], look: 'watercolor' },
  action: { name: '动作·地牢', group: '俯视', skin: 'skin.constructivist', altEnvs: ['iso-dungeon'], screens: ['hud', 'boss', 'draft', 'route', 'dialogue', 'runSummary', 'pause', 'title'], look: 'cel-anime' },
  soulslike: { name: '魂类·城堡', group: '3D自由', skin: 'skin.darkHairline', screens: ['hud', 'boss', 'lowhp', 'loadout', 'inventory', 'map', 'pause', 'title'], look: 'soft-pbr', rig: { angle: 'low', fov: 28 } },
  platformer: { name: '横版·洞穴', group: '横版', skin: 'skin.filigree', env2d: ['sideStage-cave', 'sideStage'], altEnvs: ['sideStage', 'sideStage-ruins', 'sideStage-shanshui', 'cave', 'paper-theater', 'silhouette-forest'], screens: ['hud', 'boss', 'map', 'loadout', 'dialogue', 'shop', 'pause', 'title'], look: 'moebius' },
  shooter: { name: '射击·舱室', group: '3D自由', skin: 'skin.scifi', altEnvs: ['fp-maze'], screens: ['hud', 'boss', 'lowhp', 'loadout', 'stats', 'map', 'pause', 'title', 'settings'], look: 'soft-pbr', rig: { fov: 28 } },
  shmup: { name: '弹幕·奇境', name2d: '弹幕·竖版', group: '俯视', skin: 'skin.pixel', env2d: ['shmup-vertical'], screens: ['hud', 'boss', 'stats', 'leaderboard', 'pause', 'title'], look: 'cel-anime', rig: { angle: 'top' } },
  rpg: { name: 'RPG·庭院', group: '3D自由', skin: 'skin.ink', altEnvs: ['scroll-street', 'hd2d-town'], screens: ['hud', 'boss', 'dialogue', 'inventory', 'skilltree', 'quest', 'map', 'shop', 'pause'], look: 'ink-landscape' },
  tactics: { name: '战棋·棋盘', group: '棋盘', skin: 'skin.holo', env2d: ['tacticsBoard'], altEnvs: ['strategy'], screens: ['hud', 'formation', 'loadout', 'dialogue', 'map', 'stats', 'pause', 'title'], look: 'pixel3d' },
  rts: { name: 'RTS·赤沙', group: '俯视', skin: 'skin.military', screens: ['hud', 'build', 'stats', 'map', 'dialogue', 'pause', 'title'] },
  towerDefense: { name: '塔防·渔港', group: '俯视', skin: 'skin.cozy', screens: ['hud', 'build', 'levelPath', 'stats', 'pause', 'title'] },
  arena: { name: 'MOBA·竞技场', group: '俯视', skin: 'skin.scifi', screens: ['hud', 'vs', 'shop', 'stats', 'leaderboard', 'settle', 'title'] },
  cityBuilder: { name: '城建·新城', group: '俯视', skin: 'skin.flat', altEnvs: ['iso-city'], screens: ['hud', 'build', 'stats', 'map', 'achievement', 'pause', 'title'] },
  colony: { name: '殖民·雪营', group: '俯视', skin: 'skin.swiss', altEnvs: ['iso-cutaway'], screens: ['hud', 'build', 'hero', 'stats', 'dialogue', 'pause', 'title'] },
  factory: { name: '工厂·车间', group: '俯视', skin: 'skin.mono', screens: ['hud', 'build', 'skilltree', 'inventory', 'stats', 'pause', 'title'] },
  farming: { name: '农场·俯视', group: '俯视', skin: 'skin.pixelWood', env2d: ['tileTown-farm', 'tileTown'], altEnvs: ['tileTown', 'tileTown-field', 'farm', 'oblique-village'], screens: ['hud', 'inventory', 'dialogue', 'shop', 'map', 'codex', 'pause', 'title'], look: 'tile-pixel' },
  deckBuilder: { name: '卡牌·牌桌', group: '立绘卡牌', skin: 'skin.parchment', env2d: ['backdrop-cards', 'backdrop-battle'], altEnvs: ['tabletop', 'backdrop-battle'], screens: ['hud', 'draft', 'route', 'shop', 'runSummary', 'pause', 'title'], home: 'hand' },
  puzzle: { name: '解谜·街巷', group: '俯视', skin: 'skin.darkHairline', kit: 'european', altEnvs: ['iso-illusion'], screens: ['hud', 'deduction', 'dialogue', 'codex', 'quest', 'pause', 'title'] },
  visualNovel: { name: '视觉小说·来信', group: '立绘卡牌', skin: 'skin.animeCard', env2d: ['backdrop'], altEnvs: ['backdrop-desk', 'backdrop-title', 'room', 'stage-theater', 'shadow-puppet'], screens: ['hud', 'codex', 'chapter', 'save', 'settings', 'pause', 'title'], rig: { angle: 'high' }, home: 'dialogue' },
  rhythm: { name: '节奏·酒馆', group: '3D自由', skin: 'skin.constructivist', altEnvs: ['rhythm-lanes', 'stage-theater'], screens: ['hud', 'stats', 'leaderboard', 'levelPath', 'pause', 'title'] },
  horror: { name: '恐怖·废墟', group: '3D自由', skin: 'skin.mono', altEnvs: ['fp-maze'], screens: ['hud', 'lowhp', 'packGrid', 'map', 'codex', 'save', 'pause', 'title'] },
  survival: { name: '生存·林间', group: '3D自由', skin: 'skin.mono', screens: ['hud', 'lowhp', 'inventory', 'build', 'map', 'pause', 'title'], rig: { angle: 'dimetric', fov: 35 } },
  survivors: { name: '割草·深海', name2d: '割草·原野', group: '俯视', skin: 'skin.comic', env2d: ['tileTown-field'], altEnvs: ['underwater', 'greybox-arena'], screens: ['hud', 'boss', 'draft', 'runSummary', 'loadout', 'pause', 'title'] },
  racing: { name: '竞速·山道', group: '赛道', skin: 'skin.aero', altEnvs: ['road-pseudo3d', 'mode7-track'], screens: ['hud', 'stats', 'map', 'loadout', 'leaderboard', 'pause', 'title'] },

  /*
   * 2026-10-23 技术补全的 17 个 2D / 2.5D 环境（G 等距、H 纸艺与剧场、K 伪 3D；轨道 Z2 接进图库）：一个环境一个场景，内容包借现有的。
   * 竖版·弹幕直接当「弹幕」场景的 2D 环境（上面 shmup 那一行），其余 16 个各是一个新场景。默认皮肤按质量门槛挑（docs/tech/track-Z2.md）
   */
  // 等距 2.5D（G）
  isoCity: { pack: 'cityBuilder', name: '城建·小城', group: '等距', skin: 'skin.cozy', env2d: ['iso-city'], env3d: 'city', altEnvs: ['iso-cutaway', 'tileTown'], screens: ['hud', 'build', 'stats', 'map', 'achievement', 'pause', 'title'], look: 'tile-pixel' },
  isoDungeon: { pack: 'action', name: '动作·等距地牢', group: '等距', skin: 'skin.ornate', env2d: ['iso-dungeon'], env3d: 'dungeon', altEnvs: ['arena', 'fp-maze'], screens: ['hud', 'boss', 'draft', 'route', 'dialogue', 'runSummary', 'pause', 'title'], look: 'comic-ink-3d' },
  hd2dTown: { pack: 'rpg', name: 'RPG·小镇', group: '等距', skin: 'skin.darkHairline', env2d: ['hd2d-town'], env3d: 'street', altEnvs: ['oblique-village', 'tileTown'], screens: ['hud', 'boss', 'dialogue', 'inventory', 'skilltree', 'quest', 'map', 'shop', 'pause'], look: 'hd2d-sprite' },
  obliqueVillage: { pack: 'snowline', name: '冒险·村落', group: '等距', skin: 'skin.pixel', env2d: ['oblique-village'], env3d: 'farm', altEnvs: ['hd2d-town', 'tileTown'], screens: ['hud', 'map', 'inventory', 'dialogue', 'codex', 'pause', 'title'], look: 'gouache' },
  isoIllusion: { pack: 'puzzle', name: '解谜·错觉塔', group: '等距', skin: 'skin.thinGeo', env2d: ['iso-illusion'], env3d: 'surreal', altEnvs: ['iso-city'], screens: ['hud', 'levelPath', 'codex', 'quest', 'pause', 'title'], look: 'pastel-illusion' },
  isoCutaway: { pack: 'colony', name: '模拟·剖面屋', group: '等距', skin: 'skin.glass', env2d: ['iso-cutaway'], env3d: 'room', altEnvs: ['iso-city'], screens: ['hud', 'build', 'hero', 'stats', 'dialogue', 'pause', 'title'], look: 'toy-diorama' },
  // 伪 3D 与节奏（K）
  road: { pack: 'racing', name: '竞速·公路', group: '伪3D', skin: 'skin.synth', env2d: ['road-pseudo3d'], env3d: 'racetrack', altEnvs: ['mode7-track'], screens: ['hud', 'stats', 'map', 'loadout', 'leaderboard', 'pause', 'title'], look: 'arcade-road' },
  mode7: { pack: 'racing', name: '竞速·Mode7', group: '伪3D', skin: 'skin.pixel', env2d: ['mode7-track'], env3d: 'racetrack', altEnvs: ['road-pseudo3d'], screens: ['hud', 'stats', 'map', 'loadout', 'leaderboard', 'pause', 'title'], look: 'snes-mode7' },
  fpMaze: { pack: 'rpg', name: '地牢探索·迷宫', group: '伪3D', skin: 'skin.parchment', env2d: ['fp-maze'], env3d: 'dungeon', altEnvs: ['iso-dungeon'], screens: ['hud', 'boss', 'inventory', 'map', 'skilltree', 'quest', 'pause'], look: 'retro-maze' },
  rhythmLanes: { pack: 'rhythm', name: '节奏·音轨', group: '伪3D', skin: 'skin.scifi', env2d: ['rhythm-lanes'], env3d: 'tavern', altEnvs: ['stage-theater'], screens: ['hud', 'stats', 'leaderboard', 'levelPath', 'pause', 'title'], look: 'synthwave' },
  // 纸艺与剧场（H）
  paperTheater: { pack: 'platformer', name: '横版·纸片剧场', group: '横版', skin: 'skin.candy', env2d: ['paper-theater'], env3d: 'forest', altEnvs: ['stage-theater', 'sideStage'], screens: ['hud', 'boss', 'map', 'loadout', 'dialogue', 'shop', 'pause', 'title'], look: 'papercut' },
  silhouette: { pack: 'platformer', name: '横版·剪影', group: '横版', skin: 'skin.mono', env2d: ['silhouette-forest'], env3d: 'forest', altEnvs: ['sideStage', 'sideStage-cave'], screens: ['hud', 'boss', 'map', 'loadout', 'dialogue', 'pause', 'title'], look: 'layered-silhouette' },
  scrollStreet: { pack: 'rpg', name: '武侠·长街', group: '横版', skin: 'skin.ink', env2d: ['scroll-street'], env3d: 'courtyard', altEnvs: ['sideStage-shanshui', 'courtyard'], screens: ['hud', 'dialogue', 'quest', 'map', 'inventory', 'shop', 'pause'], look: 'jiehua-scroll' },
  beatemup: { pack: 'action', name: '清版·街巷', group: '横版', skin: 'skin.comic', env2d: ['beatemup-street'], env3d: 'street', altEnvs: ['sideStage-ruins'], screens: ['hud', 'boss', 'stats', 'leaderboard', 'pause', 'title'], look: 'cel-anime' },
  shadowPuppet: { pack: 'visualNovel', name: '叙事·皮影戏', group: '立绘卡牌', skin: 'skin.darkGold', env2d: ['shadow-puppet'], env3d: 'courtyard', altEnvs: ['stage-theater', 'backdrop'], screens: ['hud', 'codex', 'chapter', 'save', 'settings', 'pause', 'title'], home: 'dialogue', look: 'papercut' },
  stageTheater: { pack: 'visualNovel', name: '视觉小说·舞台', group: '立绘卡牌', skin: 'skin.deco', env2d: ['stage-theater'], env3d: 'tavern', altEnvs: ['shadow-puppet', 'backdrop'], screens: ['hud', 'codex', 'chapter', 'save', 'settings', 'pause', 'title'], home: 'dialogue', look: 'oil' },
};

/** 界面：id → 标签（≤4 字）+ 写的值 + 种类。模板屏写 uip.screen；局内的几种写钉帧姿态 */
type V = Record<string, string | number>;
const SCREEN_DEFS: Record<string, { label: string; kind: 'hud' | 'template'; values: V }> = {
  hud: { label: '局内', kind: 'hud', values: { 'uip.screen': 'auto' } },
  // Boss：局内 HUD + Boss 登场（值按场景算，见下面 bossFor；审查修复 15）
  boss: { label: 'Boss', kind: 'hud', values: BOSS_POSE as V },
  lowhp: { label: '低血量', kind: 'hud', values: { 'uip.screen': 'auto', 'chk.simPose': 'lowHp' } },
  title: { label: '标题', kind: 'template', values: { 'uip.screen': 'tpl.title' } },
  pause: { label: '暂停', kind: 'template', values: { 'uip.screen': 'tpl.pausePc' } },
  settings: { label: '设置', kind: 'template', values: { 'uip.screen': 'tpl.settings' } },
  inventory: { label: '背包', kind: 'template', values: { 'uip.screen': 'tpl.inventory' } },
  packGrid: { label: '背包', kind: 'template', values: { 'uip.screen': 'tpl.packGrid' } },
  loadout: { label: '装备', kind: 'template', values: { 'uip.screen': 'tpl.loadout' } },
  hero: { label: '角色', kind: 'template', values: { 'uip.screen': 'tpl.hero' } },
  skilltree: { label: '技能树', kind: 'template', values: { 'uip.screen': 'tpl.skilltree' } },
  map: { label: '地图', kind: 'template', values: { 'uip.screen': 'tpl.worldmap' } },
  route: { label: '路线', kind: 'template', values: { 'uip.screen': 'tpl.routeMap' } },
  levelPath: { label: '关卡', kind: 'template', values: { 'uip.screen': 'tpl.levelPath' } },
  dialogue: { label: '对话', kind: 'template', values: { 'uip.screen': 'tpl.npc' } },
  shop: { label: '商店', kind: 'template', values: { 'uip.screen': 'tpl.shopCounter' } },
  runSummary: { label: '结算', kind: 'template', values: { 'uip.screen': 'tpl.runSummary' } },
  settle: { label: '结算', kind: 'template', values: { 'uip.screen': 'tpl.settle' } },
  stats: { label: '战绩', kind: 'template', values: { 'uip.screen': 'tpl.stats' } },
  leaderboard: { label: '排行', kind: 'template', values: { 'uip.screen': 'tpl.leaderboard' } },
  draft: { label: '三选一', kind: 'template', values: { 'uip.screen': 'tpl.draft3' } },
  build: { label: '建造', kind: 'template', values: { 'uip.screen': 'tpl.build' } },
  codex: { label: '图鉴', kind: 'template', values: { 'uip.screen': 'tpl.codex' } },
  quest: { label: '任务', kind: 'template', values: { 'uip.screen': 'tpl.quest' } },
  hand: { label: '手牌', kind: 'template', values: { 'uip.screen': 'tpl.hand' } },
  deduction: { label: '推理', kind: 'template', values: { 'uip.screen': 'tpl.deduction' } },
  formation: { label: '布阵', kind: 'template', values: { 'uip.screen': 'tpl.formation' } },
  vs: { label: '对阵', kind: 'template', values: { 'uip.screen': 'tpl.vs' } },
  achievement: { label: '成就', kind: 'template', values: { 'uip.screen': 'tpl.achievement' } },
  chapter: { label: '章节', kind: 'template', values: { 'uip.screen': 'tpl.chapterCard' } },
  save: { label: '存档', kind: 'template', values: { 'uip.screen': 'tpl.saveSlot' } },
};

/** 每个品类的流程演示（▶流程：只在免费 / 手机时出现，§5.2）——FLOWS 的 id */
const FLOW_OF: Record<string, string> = { rpg: 'gacha', action: 'levelUp', strategy: 'draft', builder: 'build', card: 'draft', life: 'purchase', sandbox: 'build', survival: 'build' };
const FLOW_LABEL: Record<string, string> = { gacha: '抽卡', levelUp: '升级', draft: '三选一', build: '建造', purchase: '购买', login: '登录', dialogue: '对话' };

/** 复刻屏 key → 标签（≤4 字） */
const REP_SCREEN_LABEL: Record<string, string> = {
  hud: '局内', 'hud-lowhp': '低血量', 'hud-boss': 'Boss', 'hud-base': '基地', 'hud-combat': '战斗', 'hud-world': '世界', 'hud-building': '建筑',
  inventory: '背包', character: '角色', skilltree: '技能树', codex: '图鉴', infoview: '信息层', economy: '经济', title: '标题', city: '城市',
  build: '建造', diplomacy: '外交', greatpeople: '伟人', wonder: '奇观', map: '地图', chapter: '章节', dialogue: '对话', cards: '卡牌',
  create: '捏人', scan: '扫描', draft: '三选一', check: '检定', journal: '日志', results: '结算', craft: '制作', pause: '暂停', callout: '大字',
  research: '研究', combat: '战斗', cutscene: '过场', squad: '小队', deduction: '推理', battle: '战斗', 'battle-boss': 'Boss', field: '野外',
  'battle-command': '指令', allout: '总攻', calendar: '日历', frontend: '开局', hand: '手牌', blinds: '盲注', base: '基地',
};
/** 复刻的短名（卡片名 ≤8 字） */
const REP_NAME: Record<string, string> = {
  'rep.balatro': '小丑牌', 'rep.black-myth': '黑神话', 'rep.cities-skylines': '城市天际线', 'rep.civ6': '文明 6', 'rep.control': '控制',
  'rep.cult-of-the-lamb': '咩咩启示录', 'rep.cyberpunk-2077': '赛博朋克', 'rep.dead-cells': '死亡细胞', 'rep.dead-space': '死亡空间',
  'rep.disco-elysium': '极乐迪斯科', 'rep.dont-starve': '饥荒', 'rep.elden-ring': '艾尔登法环', 'rep.factorio': '异星工厂', 'rep.forza-horizon-5': '极限竞速',
  'rep.frostpunk': '冰汽时代', 'rep.ghost-of-tsushima': '对马岛之魂', 'rep.hades': '哈迪斯', 'rep.hi-fi-rush': '完美音浪', 'rep.hollow-knight': '空洞骑士',
  'rep.into-the-breach': '陷阵之志', 'rep.obra-dinn': '奥伯拉丁号', 'rep.octopath': '八方旅人', 'rep.persona5': '女神异闻录5', 'rep.slay-the-spire': '杀戮尖塔',
  'rep.stardew': '星露谷物语', 'rep.xcom2': '幽浮 2',
};
/** 单屏名作（ex.*）的短名 */
const EX_NAME: Record<string, string> = {
  'ex.hadesHud': '哈迪斯·局内', 'ex.hadesDialogue': '哈迪斯·对话', 'ex.hollowCharms': '空洞·护符', 'ex.dotaHud': '刀塔 2', 'ex.stardewDialogue': '星露谷·对话',
  'ex.miniMetroResult': '迷你地铁', 'ex.frostpunkEvent': '冰汽·抉择', 'ex.nookphone': '动森·手机', 'ex.sts2Combat': '尖塔 2', 'ex.detroitClue': '底特律',
  'ex.controlHud': '控制·局内', 'ex.nightCall': '夜班电话', 'ex.carcassonne': '卡卡颂',
};
/**
 * 名作的「换环境」里排在前面的（2026-10-23 的 2D / 2.5D 环境）：复刻自己的环境不改的，在这里给一个更贴原作的 2D 环境可以一键换上
 * （哈迪斯的复刻 2026-10-23 收尾时改指向等距地牢，原来的 Boss 竞技场留在这里当换环境）
 */
const REP_ALT: Record<string, string[]> = {
  'rep.hades': ['iso-dungeon', 'arena'], 'rep.octopath': ['tileTown'], 'rep.cities-skylines': ['iso-city'], 'rep.hi-fi-rush': ['rhythm-lanes', 'beatemup-street'],
  'rep.hollow-knight': ['silhouette-forest'], 'rep.dead-cells': ['silhouette-forest'], 'rep.stardew': ['oblique-village'], 'rep.forza-horizon-5': ['road-pseudo3d'],
};
/** 名作的视角分组（只在「名作」里做小标题用；replica.genre → 视角） */

/* ---------------- A17 镜头表 ---------------- */

interface Rig { projection: 'ortho' | 'persp'; angle: string; azimuth?: number; fov?: number; zoom?: number; src: string }

/** A17 的品类名 → 画面品类（game.genre） */
const A17_GENRE: Record<string, string> = {
  探索与冒险: 'explore', '动作与Roguelite': 'action', 横版平台: 'platformer', 第一人称射击: 'shooter', '角色扮演（战术）': 'rpg', 解谜与侦探: 'puzzle',
  恐怖与悬疑: 'horror', 生存与制作: 'survival', 建造与经营: 'builder', 工厂与自动化: 'factory', 生活与养成: 'life', 策略与战术: 'strategy',
  卡牌与桌面: 'card', 竞速与驾驶: 'racing', 沙盒与物理: 'sandbox', 叙事与视觉小说: 'narrative',
};

/** 俯仰角 → camera.angle 的取值（最近的一档；横版用侧视；0° 的第一人称在我们的环绕镜头里用低机位） */
function angleOf(pitch: number, side: boolean): string {
  if (side) return 'side';
  if (pitch < 20) return 'low';
  let best = 'low', d = Infinity;
  for (const [k, a] of Object.entries(CAMERA_ANGLES)) if (k !== 'side' && Math.abs(a.pitch - pitch) < d) { d = Math.abs(a.pitch - pitch); best = k; }
  return best;
}

function parseA17(): Map<string, Rig> {
  const md = readFileSync(join(ROOT, 'docs/survey/06-genre-camera-ui.md'), 'utf8');
  const at = md.indexOf('### A17');
  if (at < 0) throw new Error('docs/survey/06-genre-camera-ui.md 里找不到 A17 表');
  const rows = md.slice(at).split('\n').filter((l) => l.startsWith('|')).slice(2);
  const out = new Map<string, Rig>();
  for (const row of rows) {
    const c = row.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 7) continue;
    const genre = A17_GENRE[c[0]];
    if (!genre || out.has(genre)) continue;
    const proj = c[1].startsWith('正交') ? 'ortho' : 'persp';
    const pitch = Number.parseFloat(c[2]) || 0;
    const vfov = Number.parseFloat(c[4]);
    const side = genre === 'platformer';
    const rig: Rig = { projection: proj, angle: angleOf(pitch, side), src: `A17 ${c[0]}：${c[1]} 俯仰 ${c[2]}° vFOV ${c[4]}` };
    // vFOV（度）→ 焦距（mm，全画幅 24mm 高）
    if (proj === 'persp' && Number.isFinite(vfov)) rig.fov = Math.max(14, Math.min(200, Math.round(24 / (2 * Math.tan(((vfov * Math.PI) / 180) / 2)))));
    if (side) rig.azimuth = 0;
    out.set(genre, rig);
  }
  return out;
}

/* ---------------- 生成 ---------------- */

interface ScreenOut { id: string; label: string; kind: 'hud' | 'template' | 'flow' | 'replica'; values?: V; flow?: string }
interface SceneOut {
  id: string; name: string; name2d?: string; group: Group; genre: string; layout: string; pack: string; skin: string; kit?: string;
  env: string; env2d?: string[]; altEnvs: string[]; seed: number; rig: Rig; look?: string; desc: string;
  screens: ScreenOut[]; replica?: string; example?: string;
}

const problems: string[] = [];
const bad = (s: string) => problems.push(s);
const len = (s: string) => [...s].length;

const a17 = parseA17();
const envName = (id: string) => SCENES.find((s) => s.id === id)?.name;
const genres = new Set((getParam('game.genre')?.options ?? []).map((o) => String(o.value)));

const scenes: SceneOut[] = [];
for (const [key, spec] of Object.entries(SPECS)) {
  const packId = spec.pack ?? key;
  const p = PACKS.get(packId);
  if (!p) { bad(`包 ${packId} 不存在`); continue; }
  const layout = Object.entries(LAYOUT_PACK).find(([, pk]) => pk === packId)?.[0];
  if (!layout) bad(`包 ${packId} 没有对应的品类布局`);
  const genre = Object.entries(GENRE_PACK).find(([, pk]) => pk === packId)?.[0]
    ?? p.genres.find((g) => genres.has(g))
    ?? (PRESET.get(layout ?? '')?.genre as string | string[] | undefined);
  const g = Array.isArray(genre) ? genre[0] : genre ?? 'explore';
  if (!genres.has(g)) bad(`包 ${packId} 的画面品类 ${g} 不在 game.genre 的选项里`);
  const base = a17.get(g) ?? a17.get('explore')!;
  const rig: Rig = { ...base, ...(spec.rig ?? {}), ...(spec.rig ? { src: `${base.src}（人工修正：${Object.entries(spec.rig).map(([k, v]) => `${k}=${v}`).join('、')}）` } : {}) };
  // 这个场景的局内 HUD（Boss 界面按它补 Boss 条）：默认值 + 场景写的布局、内容包、皮肤、品类
  const hudR = resolveUi({ ...defaultValues(), 'game.genre': g, 'uip.layout': layout ?? 'auto', 'cnt.pack': packId, 'hud.style': skinStyleValue(spec.skin), 'uip.screen': 'auto' });
  const screens: ScreenOut[] = spec.screens.map((sid) => {
    const d = SCREEN_DEFS[sid];
    if (!d) { bad(`${spec.name}：界面 ${sid} 没定义`); return { id: sid, label: sid, kind: 'hud' }; }
    if (sid === 'boss') return { id: sid, label: d.label, kind: d.kind, values: bossScreenValues(hudR.elements(), hudR.list('el.threat.form')) as V };
    if (sid === 'hud' && spec.home) {
      const h = SCREEN_DEFS[spec.home];
      if (!h) bad(`${spec.name}：局内用的界面 ${spec.home} 没定义`);
      if (spec.screens.includes(spec.home)) bad(`${spec.name}：${spec.home} 已经当局内用了，不要再单列`);
      return { id: sid, label: d.label, kind: h?.kind ?? d.kind, values: h?.values ?? d.values };
    }
    return { id: sid, label: d.label, kind: d.kind, values: d.values };
  });
  const flow = FLOW_OF[g];
  if (flow) screens.push({ id: `flow.${flow}`, label: `▶${FLOW_LABEL[flow] ?? flow}`, kind: 'flow', flow, values: { 'chk.demo': flow } });
  // 借包的场景（2D / 2.5D 环境）：说明 = 环境名：环境的看点。UI 内容借用「包名」（包的故事和环境对不上，不写简介）
  const env2d = spec.pack && spec.env2d?.length ? SCENES.find((x) => x.id === spec.env2d![0]) : undefined;
  if (spec.pack && spec.env2d?.length && !env2d) bad(`${spec.name}：2D 环境 ${spec.env2d[0]} 不在场景目录里`);
  scenes.push({
    id: `gs.${key}`, name: spec.name, ...(spec.name2d ? { name2d: spec.name2d } : {}), group: spec.group, genre: g, layout: layout ?? 'auto', pack: packId,
    skin: spec.skin, ...(spec.kit ? { kit: spec.kit } : {}), env: spec.env3d ?? p.scene, ...(spec.env2d ? { env2d: spec.env2d } : {}),
    altEnvs: spec.altEnvs ?? [],
    seed: spec.seed ?? 7, rig, ...(spec.look ? { look: spec.look } : {}),
    desc: spec.desc ?? (env2d ? `${env2d.name}：${env2d.checks}。UI 内容借用「${p.label}」` : `${p.label}：${p.game.tagline}`), screens,
  });
}

/**
 * 复刻只复刻了 3–8 屏：不到 6 屏的补几个通用界面（§11.1 D 的验收「每个都有 6–9 个界面」）。
 * 补的是界面模板（皮肤跟着这个名作走，内容是它的内容包），已经复刻了同类的不补
 */
const FILLERS = ['title', 'pause', 'inventory', 'map', 'dialogue', 'settings'];
const FILLER_SAME: Record<string, string[]> = { title: ['title', 'frontend'], pause: ['pause'], inventory: ['inventory'], map: ['map'], dialogue: ['dialogue', 'check'], settings: [] };
function withFillers(list: ScreenOut[]): ScreenOut[] {
  const out = [...list];
  for (const f of FILLERS) {
    if (out.length >= 6) break;
    if (list.some((x) => FILLER_SAME[f].includes(x.id))) continue;
    const d = SCREEN_DEFS[f];
    out.push({ id: f, label: d.label, kind: d.kind, values: d.values });
  }
  return out;
}

// 名作：26 个复刻
const repDir = join(ROOT, 'src/content/replicas');
for (const f of readdirSync(repDir).filter((x) => x.endsWith('.json')).sort()) {
  const rep = JSON.parse(readFileSync(join(repDir, f), 'utf8')) as { id: string; name: string; genre: string; pack?: string; art?: { recipe?: string; scene?: string } | null; base?: Record<string, unknown>; screens: { key: string }[] };
  const name = REP_NAME[rep.id] ?? rep.name;
  const g = genres.has(rep.genre) ? rep.genre : 'explore';
  const skinVal = String(rep.base?.['hud.style'] ?? '');
  const skin = presetsOf('skin').find((s) => s.id === `skin.${skinVal}` || s.id === skinVal)?.id ?? '';
  scenes.push({
    id: `rep:${rep.id}`, name, group: '名作', genre: g, layout: String(rep.base?.['uip.layout'] ?? 'auto'), pack: rep.pack ?? 'auto', skin,
    env: rep.art?.scene ?? 'sandbox', altEnvs: (REP_ALT[rep.id] ?? []).filter((e) => e !== rep.art?.scene), seed: 7, rig: { ...(a17.get(g) ?? a17.get('explore')!) }, ...(rep.art?.recipe ? { look: rep.art.recipe } : {}),
    desc: `原作 ${rep.name}`, replica: rep.id,
    screens: withFillers(rep.screens.map((s) => ({ id: s.key, label: REP_SCREEN_LABEL[s.key] ?? s.key, kind: 'replica' as const }))),
  });
}

/** 案例屏写的界面键（与 sceneActions.exampleInput 的 home 同一个算法：在默认值上套一次，只留界面键） */
function exScreenValues(id: string): V {
  const patch = applyPreset(id, defaultValues(), { isUi: isUiKey, scene: null });
  const out: V = {};
  for (const [k, v] of Object.entries(patch?.set ?? {})) if (SCREEN_KEYS.has(k) && (typeof v === 'string' || typeof v === 'number')) out[k] = v;
  if (!Object.keys(out).length) bad(`单屏名作 ${id}：算不出界面键`);
  return out;
}

// 单屏名作（ex.*，商业化的不进）
for (const pr of presetsOf('example').filter((x) => !isMonetizationPreset(x.id))) {
  const name = EX_NAME[pr.id] ?? pr.label;
  scenes.push({
    id: `ex:${pr.id}`, name, group: '名作', genre: 'explore', layout: 'auto', pack: 'auto', skin: '', env: '', altEnvs: [], seed: 7,
    rig: { ...a17.get('explore')! }, desc: pr.label, example: pr.id,
    // 这一屏的界面键（案例屏写的 uip.screen / cnt.screen / cnt.subtype…，审查修复 2：原来不写，点胶片上这张卡 = 清空界面层，退回局内）
    screens: [{ id: pr.id, label: '这一屏', kind: 'template', values: exScreenValues(pr.id) }],
  });
}

/* ---------------- 自检 ---------------- */

const ids = new Set<string>();
for (const s of scenes) {
  if (ids.has(s.id)) bad(`场景 id 重复：${s.id}`);
  ids.add(s.id);
  if (len(s.name) > 8) bad(`${s.id} 名字超过 8 字：${s.name}`);
  if (s.group !== '名作') {
    if (!PRESET.has(s.skin)) bad(`${s.name}：默认皮肤 ${s.skin} 不存在`);
    if (!envName(s.env)) bad(`${s.name}：环境 ${s.env} 不在场景目录里`);
    for (const e of s.altEnvs) if (!envName(e)) bad(`${s.name}：换环境 ${e} 不在场景目录里`);
    if (s.layout !== 'auto' && PRESET.get(s.layout)?.kind !== 'layout') bad(`${s.name}：布局 ${s.layout} 不是品类布局`);
    if (s.look && !RECIPE_MAP.has(s.look)) bad(`${s.name}：建议配方 ${s.look} 不存在`);
    const n = s.screens.filter((x) => x.kind !== 'flow').length;
    if (n < 6 || n > 9) bad(`${s.name}：界面 ${n} 个（要 6–9 个）`);
    if (s.screens[0]?.id !== 'hud') bad(`${s.name}：第一个界面不是局内`);
  } else if (s.replica && (s.screens.length < 6 || s.screens.length > 9)) bad(`${s.name}：名作界面 ${s.screens.length} 个（要 6–9 个）`);
  if (s.replica) for (const e of s.altEnvs) if (!envName(e)) bad(`${s.name}：换环境 ${e} 不在场景目录里`);
  for (const e of s.env2d ?? []) if (!envName(e)) bad(`${s.name}：2D 环境 ${e} 不在场景目录里`);
  for (const x of s.screens) {
    if (len(x.label.replace('▶', '')) > 4) bad(`${s.name}：界面标签超过 4 字：${x.label}`);
    const tpl = x.values?.['uip.screen'] === undefined ? undefined : String(x.values['uip.screen']);
    if (tpl && tpl !== 'auto' && PRESET.get(tpl)?.kind !== 'screen') bad(`${s.name}：${x.label} 的模板 ${tpl} 不存在`);
    if (tpl && isMonetizationPreset(tpl)) bad(`${s.name}：${x.label} 用了商业化模板 ${tpl}`);
  }
}
const base = scenes.filter((s) => s.group !== '名作');
// 24 个内容包各有一个场景（id = gs.<包 id>，原来的 24 个）；另外的借包场景（2D / 2.5D 环境）不占包
for (const id of PACKS.keys()) if (!base.some((s) => s.id === `gs.${id}`)) bad(`内容包 ${id} 没有自己的场景 gs.${id}`);
if (base.length !== Object.keys(SPECS).length) bad(`基础场景 ${base.length} 个（表里 ${Object.keys(SPECS).length} 个）`);
// 2026-10-23 的 2D / 2.5D 环境（等距 2.5D / 纸艺与剧场 / 伪 3D / 竖版与节奏 四类）每个都是某个场景的 2D 环境（图库里点得到）
const NEW_CATS = new Set(['等距 2.5D', '纸艺与剧场', '伪 3D', '竖版与节奏']);
for (const m of SCENES.filter((x) => NEW_CATS.has(x.category))) if (!base.some((s) => s.env2d?.includes(m.id))) bad(`环境 ${m.name}（${m.id}）没有场景用它`);
if (scenes.filter((s) => s.replica).length !== 26) bad(`复刻 ${scenes.filter((s) => s.replica).length} 个（要 26 个）`);

const data = { generated: 'scripts/gen-game-scenes.ts', note: '自动生成，不要手改；改 scripts/gen-game-scenes.ts 里的表后重跑', scenes };
const text = `${JSON.stringify(data, null, 1)}\n`;

if (problems.length) {
  console.log(`场景注册表：${problems.length} 个问题`);
  for (const p of problems) console.log('  ✗', p);
  process.exit(1);
}
if (CHECK) {
  let cur = '';
  try { cur = readFileSync(OUT, 'utf8'); } catch { /* 没有文件 */ }
  if (cur !== text) { console.log('  ✗ src/content/gameScenes.gen.json 不是最新的：npx tsx scripts/gen-game-scenes.ts'); process.exit(1); }
  console.log(`场景注册表：${base.length} 个场景 + ${scenes.length - base.length} 个名作，数据是最新的，没有发现问题`);
} else {
  writeFileSync(OUT, text, 'utf8');
  console.log(`写入 src/content/gameScenes.gen.json：${base.length} 个场景 + ${scenes.length - base.length} 个名作（${scenes.reduce((a, s) => a + s.screens.length, 0)} 个界面）`);
}
