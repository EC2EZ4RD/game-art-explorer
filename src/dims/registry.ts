import type { DimId, DimMeta, OptionDef, ParamDef, Val, Values } from './types';

export const DIMS: DimMeta[] = [
  { id: 'game', label: '游戏条件', plain: '玩家怎么看、怎么操作', order: 0 },
  { id: 'world', label: '地貌', plain: '地形怎么起伏、世界什么形状', order: 1 },
  { id: 'geometry', label: '几何表示', plain: '光滑、折面还是块状', order: 2 },
  { id: 'shape', label: '形状比例', plain: '更圆、更尖、更像玩具', order: 3 },
  { id: 'material', label: '材质', plain: '像泥、塑料、陶瓷还是纸', order: 4 },
  { id: 'shading', label: '明暗', plain: '明暗连贯还是分成色块', order: 5 },
  { id: 'lines', label: '线条', plain: '轮廓线、内部线、粗细与颜色', order: 6 },
  { id: 'surface', label: '画面媒介', plain: '像水彩、水墨、像素还是版画', order: 7 },
  { id: 'color', label: '色彩', plain: '用哪些颜色、多鲜艳、多少种', order: 8 },
  { id: 'lighting', label: '灯光', plain: '几点钟、影子硬不硬', order: 9 },
  { id: 'camera', label: '镜头', plain: '像沙盘还是亲身进入', order: 10 },
  { id: 'atmosphere', label: '环境', plain: '雾、天空、水、风和天气', order: 11 },
  { id: 'motion', label: '运动', plain: '流畅还是顿挫', order: 12 },
  { id: 'hud', label: '游戏 UI', plain: '血条、提示、面板长什么样', order: 13 },
];

const params = new Map<string, ParamDef>();

export function registerParams(defs: ParamDef[]) {
  for (const d of defs) {
    if (params.has(d.id)) console.warn('重复登记参数', d.id);
    params.set(d.id, d);
  }
}

/**
 * 给已登记的选择型参数追加选项（技术补全各轨道在自己的 tech-*.ts 里用，不改原维度文件）。
 * 选项按调用顺序排在原有选项之后；已有同值的选项不重复追加
 */
export function extendOptions(id: string, opts: OptionDef[]) {
  const p = params.get(id);
  if (!p?.options) { console.warn('extendOptions：没有这个选择型参数', id); return; }
  for (const o of opts) if (!p.options.some((x) => x.value === o.value)) p.options.push(o);
}

export const getParam = (id: string) => params.get(id);
export const allParams = () => [...params.values()];
/** 画面模式的维度面板：不含 UI 参数体系的参数（它们在 UI 模式里按页签显示） */
export const paramsOf = (dim: DimId) => allParams().filter((p) => p.dim === dim && !p.ui);
export const uiParams = () => allParams().filter((p) => p.ui);

/* 不登记成参数、但可以存进 Values 的键（UI 的覆盖键与元素实例键）由各模块注册校验函数 */
const keyValidators: ((k: string) => boolean)[] = [];
export const registerKeyValidator = (f: (k: string) => boolean) => { keyValidators.push(f); };
export const validKey = (k: string) => params.has(k) || keyValidators.some((f) => f(k));
/** 属于游戏 UI 的键（换画面配方时保留） */
const uiKeyTests: ((k: string) => boolean)[] = [];
export const registerUiKeyTest = (f: (k: string) => boolean) => { uiKeyTests.push(f); };
/** UI 体系参数还在跟随（auto）：导出、描述、迁移表里不单独列（由 UI 主题整体说明） */
export const uiIdle = (p: ParamDef, v: Values) => !!p.ui && p.ui.scope !== 'start' && (v[p.id] ?? p.default) === 'auto';
export const isUiKey = (k: string) => k.startsWith('hud.') || !!params.get(k)?.ui || uiKeyTests.some((f) => f(k));

/*
 * 视图键（轨道 A，docs/workbench-redesign.md §4.3）：只是"怎么看"的开关（检查工具 chk.*：色盲模拟、视距预览、安全区叠加……）。
 * 它们仍然存在 Values 里（引擎、HUD、检查读法都不用改），但不进撤销、不进工作副本、不进收藏 / 导出、不算改动；
 * 每个标签页各存一份在 sessionStorage（gae.view.v1）。
 * 例外：chk.demo（流程演示）、chk.simPose / chk.simTime（复刻屏的钉帧）属于"界面"的内容，照常算参数。
 */
const VIEW_KEY_EXCEPT = new Set(['chk.demo', 'chk.simPose', 'chk.simTime']);
const viewKeyTests: ((k: string) => boolean)[] = [];
/** 别的模块要把自己的键标成视图键时登记（一般不需要） */
export const registerViewKeyTest = (f: (k: string) => boolean) => { viewKeyTests.push(f); };
export const isViewKey = (k: string) => (k.startsWith('chk.') && !VIEW_KEY_EXCEPT.has(k)) || viewKeyTests.some((f) => f(k));
/** 去掉视图键（存档、收藏、导出、历史快照用） */
export function withoutViewKeys(v: Values): Values {
  const out: Values = {};
  for (const k of Object.keys(v)) if (!isViewKey(k)) out[k] = v[k];
  return out;
}

export function defaultValues(): Values {
  const v: Values = {};
  for (const p of params.values()) v[p.id] = p.default;
  return v;
}

let defCache: { n: number; v: Readonly<Values> } | null = null;
/** 默认值的只读缓存（基线合成每次都要用；登记了新参数就重算）。要改的话先复制一份 */
export function defaultsCached(): Readonly<Values> {
  if (!defCache || defCache.n !== params.size) defCache = { n: params.size, v: Object.freeze(defaultValues()) };
  return defCache.v;
}

export function optionOf(p: ParamDef, value: Val): OptionDef | undefined {
  return p.options?.find((o) => o.value === value);
}

/** 当前参数是否生效：返回 true 或原因 */
export function activeState(p: ParamDef, s: Values): true | string {
  return p.activeWhen ? p.activeWhen(s) : true;
}

/* -------- 读取工具：引擎与描述生成都用它 -------- */
export const num = (s: Values, id: string) => {
  const v = s[id] ?? params.get(id)?.default;
  return typeof v === 'number' ? v : Number(v) || 0;
};
export const str = (s: Values, id: string) => String(s[id] ?? params.get(id)?.default ?? '');
export const bool = (s: Values, id: string) => {
  const v = s[id] ?? params.get(id)?.default;
  return v === true || v === 'true' || v === 1;
};
export const is = (s: Values, id: string, ...vals: string[]) => vals.includes(str(s, id));

/** 选项标签（用于描述与界面） */
export function labelOf(id: string, s: Values): string {
  const p = params.get(id);
  if (!p) return '';
  const v = s[id] ?? p.default;
  if (p.kind === 'choice') return optionOf(p, v)?.label ?? String(v);
  if (p.kind === 'toggle') return v ? '开' : '关';
  return `${typeof v === 'number' ? +v.toFixed(2) : v}${p.unit ?? ''}`;
}
