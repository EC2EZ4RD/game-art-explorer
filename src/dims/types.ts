/*
 * 维度注册表的数据结构。
 * 一切"可以调的东西"都登记成一条 ParamDef：新增选项只加数据，不改引擎与界面。
 */

export type Val = number | string | boolean;
export type Values = Record<string, Val>;

export type DimId =
  | 'game' | 'world' | 'geometry' | 'shape' | 'material' | 'shading' | 'lines'
  | 'surface' | 'color' | 'lighting' | 'camera' | 'atmosphere' | 'motion' | 'hud';

/** 能力状态：由实现情况决定，不是人为划界 */
export type CapStatus = 'live' | 'partial' | 'needsAsset' | 'reference' | 'todo';

/** 改动后引擎需要做多少事 */
export type Rebuild = 'scene' | 'character' | 'uniform' | 'camera' | 'none';

/** 迁移到游戏引擎的难度：直接对应 / 需写着色器 / 需后处理 / 需脚本或插件 / 困难 */
// texture = 需素材 / 贴图（M12b 加的参数级取值，终期审查修复 ⑮：原来不在这张表里，迁移说明写出「undefined」）
export type PortLevel = 'builtin' | 'shader' | 'post' | 'script' | 'texture' | 'hard';

export interface PortInfo {
  godot?: string;
  godotLevel?: PortLevel;
  unity?: string;
}

export interface Explain {
  /** 白话：它作用于什么 */
  plain: string;
  /** 往两端调，肉眼看到什么 */
  ends?: [string, string];
  /** 应该看画面的哪里 */
  lookAt?: string;
  term?: { zh: string; en?: string };
  /** 技术实现要点（three.js） */
  tech?: string;
  /** 常见误区 */
  pitfalls?: string[];
  /** 超出能力的部分 / 注意区别 */
  limits?: string;
}

export interface OptionDef {
  value: string;
  label: string;
  /** 一句话说明 */
  desc?: string;
  term?: { zh: string; en?: string };
  tech?: string;
  pitfalls?: string[];
  /** 可复用描述片段（视觉语言） */
  prompt?: string;
  /** 技术实现片段（交给代码 AI） */
  techPrompt?: string;
  status?: CapStatus;
  port?: PortInfo;
  /** 该选项本身不可用时的原因 */
  disabledWhen?: (s: Values) => string | false;
}

export type ParamKind = 'range' | 'int' | 'choice' | 'toggle' | 'color' | 'multi' | 'gradient';

/**
 * 游戏 UI 参数体系（docs/survey/09-ui-param-system.md）登记进来的参数带这一段。
 * 多选（multi）的值存成逗号分隔的字符串（'' = 一项都不选），'auto' = 跟随预设；
 * 覆盖键（vis.corner@button）与元素实例键（el.minimap.screenAnchor）不登记成参数，直接存在 Values 里。
 */
export interface UiParamMeta {
  /** 参数体系里的维度组（ctx / cnt / lay / vis …），起点选择器为 'start' */
  group: string;
  scope: 'global' | 'globalScreen' | 'screen' | 'element' | 'start';
  /** 探索台 UI 模式的页签 */
  tab: string;
  tier: number;
  cls: string;
  /** 跟随链上谁都没给值时的兜底 */
  fallback?: unknown;
  /** 数据式生效条件（cond.ts） */
  when?: unknown;
  overrideAt?: string[];
  merge?: 'union' | 'replace';
  preview?: string;
  random?: boolean;
  randomRange?: [number, number];
  milestone?: string;
  /** 静态截图看不出效果时的展示方式 */
  needs?: string;
  starter?: boolean;
  appliesTo?: string[];
}

export interface ParamDef {
  id: string;
  dim: DimId;
  /** 维度内的小分组标题 */
  group?: string;
  label: string;
  kind: ParamKind;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: OptionDef[];
  default: Val;
  explain: Explain;
  /** 视觉描述片段；返回 null 表示当前值不值得写进描述 */
  prompt?: (v: Val, s: Values) => string | null;
  /** 技术描述片段 */
  techPrompt?: (v: Val, s: Values) => string | null;
  /** 返回 true 表示生效；返回字符串表示不生效的原因 */
  activeWhen?: (s: Values) => true | string;
  rebuild: Rebuild;
  port?: PortInfo;
  status?: CapStatus;
  /** 折叠到"更多"里 */
  advanced?: boolean;
  /** 会影响到的其他参数（用于说明依赖） */
  affects?: string[];
  /** 游戏 UI 参数体系的参数（UI 模式里显示，画面模式的面板与随机不包含） */
  ui?: UiParamMeta;
}

export interface DimMeta {
  id: DimId;
  label: string;
  /** 新手看到的说法 */
  plain: string;
  order: number;
}
