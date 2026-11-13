import type { Values } from '../dims/types';
import DATA from './gameScenes.gen.json';
import { SCENES } from './sceneCatalog';

/*
 * 场景注册表（轨道 D，docs/workbench-redesign.md §5.1 §5.2）：场景 = 品类 + 环境 + 镜头，带一套默认 UI（布局、内容包、皮肤）和一组界面。
 * 数据由 scripts/gen-game-scenes.ts 从 24 个内容包、26 个复刻、A17 镜头表反推生成（gameScenes.gen.json），人工只写名字、分组、默认皮肤、界面顺序。
 * 2026-10-23（轨道 Z2）：17 个 2D / 2.5D 环境（等距、纸艺剧场、伪 3D）接进来——16 个新场景各借一个内容包（gs.<键>），竖版·弹幕当「弹幕」场景的 2D 环境。
 * 本文件只放类型与纯函数（node 脚本、测试都能直接用）；套用动作在 src/ui/scene/sceneActions.ts。
 *
 * 2D 环境（F 的横版分层 / 俯视瓦片 / 战棋棋盘 / 立绘背景）：场景写了 env2d 候选，某个候选的构建器注册了就用它并锁定镜头；
 * 没注册时用包的建议场景（3D 环境），名字不变（name2d 只在换上 2D 环境后用）。调用方传 hasEnv（engine/scene/sceneRegistry 的 hasSceneBuilder）。
 */

export type SceneGroupId = '3D自由' | '俯视' | '横版' | '等距' | '棋盘' | '立绘卡牌' | '伪3D' | '赛道' | '名作';

export interface SceneRig {
  projection: 'ortho' | 'persp';
  /** camera.angle 的取值（iso / dimetric / high / top / low / side） */
  angle: string;
  azimuth?: number;
  /** 焦距 mm（透视） */
  fov?: number;
  zoom?: number;
  /** 出处（A17 的哪一行） */
  src: string;
}

export interface ScreenEntry {
  id: string;
  /** ≤4 字 */
  label: string;
  /** hud = 局内（含钉帧姿态）；template = 界面模板；flow = ▶流程演示；replica = 复刻的一屏 */
  kind: 'hud' | 'template' | 'flow' | 'replica';
  values?: Values;
  /** flow：FLOWS 的 id */
  flow?: string;
}

export interface GameScene {
  /** gs.<包 id>（借包的 2D / 2.5D 场景 = gs.<键>，pack 写借的包）；名作 = rep:<复刻 id>；单屏名作 = ex:<案例屏 id> */
  id: string;
  name: string;
  name2d?: string;
  group: SceneGroupId;
  /** game.genre */
  genre: string;
  /** uip.layout */
  layout: string;
  /** cnt.pack */
  pack: string;
  /** 默认皮肤（skin.*）；名作 / 单屏名作可能为空（皮肤在它自己的值里） */
  skin: string;
  kit?: string;
  /** 3D 环境（2D 环境没上线时用它） */
  env: string;
  env2d?: string[];
  /** 换环境里排在前面的 */
  altEnvs: string[];
  seed: number;
  rig: SceneRig;
  /** 建议配方（不强制） */
  look?: string;
  /** 悬停的一句话（包名：简介） */
  desc: string;
  screens: ScreenEntry[];
  replica?: string;
  example?: string;
}

export const GAME_SCENES: GameScene[] = (DATA as unknown as { scenes: GameScene[] }).scenes;
export const GAME_SCENE_MAP = new Map(GAME_SCENES.map((s) => [s.id, s]));
export const gameScene = (id: string | null | undefined): GameScene | undefined => (id ? GAME_SCENE_MAP.get(id) : undefined);

/**
 * 场景图库的分组（§2 F2：按视角分组）。2D 为主的几组排在 3D 自由前面（B 的审查修复 ⑫ / D 的审查修复 28：2D 是用户要的重点）；首屏选过的那组再挪到最前。
 * 2026-10-23（轨道 Z2）加两组：等距（等距 / 斜俯视 / HD-2D 这类 2.5D 立体模型视角）、伪 3D（追尾公路、Mode 7、第一人称格子迷宫、节奏音轨）
 */
export const SCENE_GROUPS: { id: SceneGroupId; label: string }[] = [
  { id: '横版', label: '横版' }, { id: '俯视', label: '俯视' }, { id: '等距', label: '等距' }, { id: '棋盘', label: '棋盘' }, { id: '立绘卡牌', label: '立绘卡牌' },
  { id: '伪3D', label: '伪 3D' }, { id: '3D自由', label: '3D 自由' }, { id: '赛道', label: '赛道' }, { id: '名作', label: '名作' },
];

/** 首屏场景（F0：探索·小岛）：A 的 START_SCENE 可以引用它 */
export const START_SCENE_ID = 'gs.sandbox';

/** 这个场景现在用哪个环境：2D 候选里第一个已注册的（锁定镜头），否则 3D 环境 */
export function sceneEnv(sc: GameScene, hasEnv: (id: string) => boolean): { env: string; is2d: boolean } {
  const e2 = sc.env2d?.find((e) => hasEnv(e));
  return e2 ? { env: e2, is2d: true } : { env: sc.env, is2d: false };
}

/**
 * 「换环境」换过之后现在的环境（与场景默认的环境不同时返回它的 id，相同或没有场景时 null）：
 * 层级标签 / 场景弹窗可以据此在场景名后面写出环境名（F 的审查修复 13）
 */
export function envOverride(sc: GameScene | undefined, curEnv: string, hasEnv: (id: string) => boolean): string | null {
  if (!sc?.env || !curEnv) return null;
  return sceneEnv(sc, hasEnv).env === curEnv ? null : curEnv;
}

/** 场景名（换上 2D 环境后用 name2d） */
export const sceneName = (sc: GameScene, hasEnv: (id: string) => boolean): string => (sc.name2d && sceneEnv(sc, hasEnv).is2d ? sc.name2d : sc.name);

/** 镜头机位 → camera.* 的值 */
export function rigValues(r: SceneRig): Values {
  const v: Values = { 'camera.projection': r.projection, 'camera.angle': r.angle };
  if (r.fov !== undefined && r.projection === 'persp') v['camera.fov'] = r.fov;
  if (r.azimuth !== undefined) v['camera.azimuth'] = r.azimuth;
  if (r.zoom !== undefined) v['camera.zoom'] = r.zoom;
  return v;
}

/** hud.style 的值：skin.<x> → <x>（与 register.ts 的 skinValueOf 同一个规则，这里不引 HUD 模块，node 测试也能跑） */
export const skinStyleValue = (skinId: string): string => skinId.replace(/^skin\./, '');

/**
 * 场景写的值（A 的 applyScene 的 values）：game.*、镜头、布局、内容包、默认皮肤。
 * 名作 / 单屏名作不走这里（复刻走 applyReplica，案例屏另算）。
 */
export function sceneValues(sc: GameScene, hasEnv: (id: string) => boolean): Values {
  const { env, is2d } = sceneEnv(sc, hasEnv);
  // 2D 环境自带锁定的镜头（F 的 sceneCatalog：recommended = 与锁定镜头一致的镜头键 + 建议的雾）；3D 环境用按品类换算的机位（A17）
  const rig = is2d ? SCENES.find((s) => s.id === env)?.recommended ?? rigValues(sc.rig) : rigValues(sc.rig);
  const v: Values = {
    'game.scene': env, 'game.seed': sc.seed, 'game.genre': sc.genre,
    ...rig,
    'uip.layout': sc.layout, 'cnt.pack': sc.pack,
  };
  if (sc.kit) v['game.kit'] = sc.kit;
  if (sc.skin) v['hud.style'] = skinStyleValue(sc.skin);
  return v;
}

/**
 * Boss 界面 = 局内 HUD + Boss 登场（审查修复 15）：钉在 Boss 登场的那一刻（名牌已出、条涨到八成），HUD 其余部分（生命、技能）照常在。
 * 原来用 tpl.bossIntro（标题卡模板）：画出来是章节名的横幅，没有 Boss 名和 Boss 条，HUD 也没了。
 * elements / threatForms = 这个场景局内 HUD 解析出来的元素清单与威胁元素的画法：没有 Boss 条时把威胁元素加进来、画成 Boss 条。
 */
export const BOSS_POSE: Values = { 'uip.screen': 'auto', 'chk.simPose': 'bossIntro', 'chk.simTime': 1.3 };
export function bossScreenValues(elements: string[] | null, threatForms: string[] | null): Values {
  const v: Values = { ...BOSS_POSE };
  const has = !!elements?.includes('el.threat');
  if (elements && !has) v['cnt.elements'] = [...elements, 'el.threat'].join(',');
  if (!has || !threatForms?.includes('bossBar')) v['el.threat.form'] = 'bossBar';
  return v;
}

/** 「我的游戏」：免费或手机时才出现 ▶流程（§5.2）与运营界面 */
export function showsFlows(profile: { business?: unknown; platform?: unknown }): boolean {
  const b = String(profile.business ?? ''), p = String(profile.platform ?? '');
  return b === 'business.f2pMobile' || b === 'business.adSupported' || p === 'platform.phonePortrait' || p === 'platform.phoneLandscape';
}

/** 胶片上显示的界面（▶流程按「我的游戏」过滤） */
export const screensOf = (sc: GameScene, profile: { business?: unknown; platform?: unknown }): ScreenEntry[] =>
  sc.screens.filter((s) => s.kind !== 'flow' || showsFlows(profile));

/** 第一个界面（局内） */
export const homeScreen = (sc: GameScene): ScreenEntry | undefined => sc.screens[0];

/** 某个 3D / 2D 环境对应的场景（配方卡「在 X 场景最好看 ›」用；没有时 undefined） */
export function sceneForEnv(env: string): GameScene | undefined {
  return GAME_SCENES.find((s) => s.group !== '名作' && (s.env === env || s.env2d?.includes(env)))
    ?? GAME_SCENES.find((s) => s.group !== '名作' && s.altEnvs.includes(env));
}

/** 当前来源对应的场景与界面（来源里的 scene id；名作 = rep:<id>） */
export function currentScreenOf(sc: GameScene | undefined, screenId: string | null | undefined): ScreenEntry | undefined {
  if (!sc) return undefined;
  return sc.screens.find((s) => s.id === screenId) ?? (screenId ? undefined : sc.screens[0]);
}

/** 自检（测试与 check 用）：名字长度、界面数、标签长度 */
export function sceneProblems(): string[] {
  const out: string[] = [];
  const base = GAME_SCENES.filter((s) => s.group !== '名作');
  // 24 个内容包各一个场景 + 2026-10-23 借包的 2D / 2.5D 场景（轨道 Z2）
  if (base.length < 24) out.push(`基础场景 ${base.length} 个（至少 24）`);
  if (GAME_SCENES.filter((s) => s.replica).length !== 26) out.push('复刻场景不是 26 个');
  for (const s of GAME_SCENES) {
    if ([...s.name].length > 8) out.push(`${s.id} 名字超过 8 字`);
    const n = s.screens.filter((x) => x.kind !== 'flow').length;
    if (s.group !== '名作' && (n < 6 || n > 9)) out.push(`${s.id} 界面 ${n} 个`);
    if (s.replica && (n < 6 || n > 9)) out.push(`${s.id} 名作界面 ${n} 个`);
    for (const x of s.screens) if ([...x.label.replace('▶', '')].length > 4) out.push(`${s.id} 界面标签过长：${x.label}`);
  }
  if (!GAME_SCENE_MAP.has(START_SCENE_ID)) out.push(`首屏场景 ${START_SCENE_ID} 不存在`);
  return out;
}
