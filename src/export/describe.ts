import { getPalette } from '../content/palettes';
import { RECIPE_MAP } from '../content/recipes';
import { sceneMeta } from '../content/sceneCatalog';
import { activeState, allParams, isUiKey, isViewKey, labelOf, optionOf, str, uiIdle, withoutViewKeys } from '../dims/registry';
import type { DimId, ParamDef, Values } from '../dims/types';
import { normalizeOrigin, type Origin } from '../state/layers';
import { SCHEMA_VERSION, useStore } from '../state/store';

/*
 * 导出：
 *   实际画面说明 —— 只写当前确实生效的选择；
 *   AI 编码提示词 —— 按灵感提示词的结构组织，附技术实现与体检注意；
 *   可复现配方 —— 完整状态 JSON。
 */

const SECTIONS: { title: string; dims: DimId[] }[] = [
  { title: '游戏品类与视角', dims: ['game', 'camera'] },
  { title: '场景与空间结构', dims: ['world'] },
  { title: '形状、比例与几何', dims: ['shape', 'geometry'] },
  { title: '材质、明暗与线条', dims: ['material', 'shading', 'lines'] },
  { title: '画面媒介', dims: ['surface'] },
  { title: '色彩、灯光与环境', dims: ['color', 'lighting', 'atmosphere'] },
  { title: '动画与游戏 UI', dims: ['motion', 'hud'] },
];

function visualLine(p: ParamDef, v: Values): string | null {
  if (uiIdle(p, v) || activeState(p, v) !== true) return null;
  const val = v[p.id] ?? p.default;
  if (p.prompt) return p.prompt(val, v);
  if (p.kind === 'choice') return optionOf(p, val)?.prompt ?? null;
  return null;
}

export function describeVisual(v: Values): { title: string; lines: string[] }[] {
  const params = allParams();
  return SECTIONS.map((sec) => {
    const lines: string[] = [];
    for (const p of params.filter((x) => sec.dims.includes(x.dim))) {
      const l = visualLine(p, v);
      if (l && !lines.includes(l)) lines.push(l);
    }
    return { title: sec.title, lines };
  }).filter((s) => s.lines.length);
}

export function describeVisualText(v: Values, recipeId?: string | null): string {
  const r = recipeId ? RECIPE_MAP.get(recipeId) : undefined;
  const out: string[] = ['# 实际画面说明', '', '> 只包含当前实验中确实生效的选择。'];
  if (r) out.push('', `起点配方：${r.name}（${r.family}）。${r.summary}`);
  for (const s of describeVisual(v)) {
    out.push('', `## ${s.title}`);
    s.lines.forEach((l) => out.push(`- ${l}`));
  }
  return out.join('\n');
}

export type TargetEngine = 'three' | 'godot';

function techLine(p: ParamDef, v: Values, target: TargetEngine): string | null {
  if (uiIdle(p, v) || activeState(p, v) !== true) return null;
  const val = v[p.id] ?? p.default;
  const opt = p.kind === 'choice' ? optionOf(p, val) : undefined;
  if (target === 'godot') {
    // 数值参数在"关"的位置（技术描述为空）时不写迁移做法，免得让人去开一个没用到的效果
    if (!opt && p.techPrompt && p.techPrompt(val, v) == null) return null;
    const g = opt?.port?.godot ?? p.port?.godot;
    return g ? `${p.label}「${labelOf(p.id, v)}」→ ${g}` : null;
  }
  const t = p.techPrompt?.(val, v) ?? opt?.techPrompt ?? null;
  return t;
}

function pitfallsOf(v: Values): string[] {
  const out: string[] = [];
  for (const p of allParams()) {
    if (uiIdle(p, v) || activeState(p, v) !== true) continue;
    const val = v[p.id] ?? p.default;
    const opt = p.kind === 'choice' ? optionOf(p, val) : undefined;
    for (const x of opt?.pitfalls ?? []) if (!out.includes(x)) out.push(x);
  }
  return out;
}

/** 禁止项（复制提示词也用） */
export function forbidden(v: Values): string[] {
  const f: string[] = [];
  const rep = str(v, 'geometry.representation');
  if (rep !== 'voxel') f.push('不要使用立方体/方块体素来构建世界（本方案的几何表示是' + (rep === 'smooth' ? '光滑曲面' : '低多边形折面') + '）');
  else f.push('不要用屏幕像素化冒充体素：方块必须是空间中的几何');
  if (str(v, 'color.tonemap') === 'none') f.push('不要使用 ACES/AgX 等色调映射，它们会让色板偏色或发灰');
  if (v['lines.outline'] && str(v, 'lines.outlineNormals') === 'smooth') f.push('不要直接沿非索引几何的面法线挤出描边外壳（转角会裂开），使用单独的平滑法线');
  if (str(v, 'shading.model') === 'cel' && v['shading.quantizeShadow']) f.push('不要让投影以软边渐变穿过色阶，投影需要和明暗一起阈值化');
  if (str(v, 'surface.medium') === 'ink') f.push('不要把水墨做成单纯的灰度滤镜：需要留白、浓淡层次与边缘晕染');
  if (str(v, 'surface.medium') === 'gongbi') f.push('不要把浅色材质加统一外轮廓线当作工笔：需要有主次的内部线描与分染');
  return f;
}

function checks(v: Values): string[] {
  const c = ['同一种子、同一镜头下截图，与实验台画面逐项对照'];
  if (str(v, 'color.tonemap') === 'none') c.push('切换色调映射前后，色板颜色保持精确');
  if (str(v, 'color.dither') !== 'none') c.push('转动或平移镜头时，抖色图案的游动程度可以接受');
  if (Number(v['camera.pixelSize']) > 1) c.push('平移镜头时像素图案稳定，不"爬"');
  if (v['lines.outline']) c.push('拉远镜头时，远景轮廓线不挤成黑块；低模转角处描边不裂');
  if (str(v, 'game.controls') === 'walk') c.push('角色行走时脚底贴合实际网格表面，不悬空、不陷入');
  return c;
}

export function aiPrompt(v: Values, target: TargetEngine, recipeId?: string | null): string {
  const r = recipeId ? RECIPE_MAP.get(recipeId) : undefined;
  const pal = getPalette(str(v, 'color.palette'));
  const scene = sceneMeta(str(v, 'game.scene'));
  const engineName = target === 'godot' ? 'Godot 4（Forward+ 渲染器）' : 'three.js r186（WebGLRenderer）';
  const out: string[] = [];
  out.push('【核心创意】');
  out.push(`用 ${engineName} 实现一个「${scene.name}」实验场景的美术方向${r ? `，起点是「${r.name}」：${r.summary}` : '。'}`);
  out.push('');
  out.push('【一、视觉与渲染标准】');
  let n = 1;
  for (const sec of SECTIONS) {
    const vis: string[] = [];
    const tech: string[] = [];
    for (const p of allParams().filter((x) => sec.dims.includes(x.dim))) {
      const l = visualLine(p, v);
      if (l && !vis.includes(l)) vis.push(l);
      const t = techLine(p, v, target);
      if (t && !tech.includes(t)) tech.push(t);
    }
    if (!vis.length && !tech.length) continue;
    out.push(`${n++}. ${sec.title}：${vis.join('；') || '（无特别要求）'}。`);
    tech.forEach((t) => out.push(`   - 实现：${t}`));
  }
  out.push(`${n++}. 色板（按颜色角色）：` + (['sand', 'grass', 'highland', 'snow', 'water', 'foliage', 'trunk', 'rock', 'character', 'accent', 'skyTop', 'skyHorizon', 'ink'] as const)
    .map((k) => `${k} ${pal.roles[k]}`).join('，') + `（${pal.name}）`);
  out.push('');
  out.push('【二、游戏性与观看条件】');
  if (str(v, 'game.controls') === 'walk') out.push('- 角色：WASD / 方向键移动，按相机朝向换算方向，平滑贴合地形实际表面高度；镜头' + (str(v, 'camera.mode') === 'follow' ? '平滑跟随角色' : '可自由环绕') + '。');
  if (v['lighting.cycle']) out.push('- 时间：自动昼夜流转，色温、天色、雾色与环境光一起随时间插值。');
  else out.push(`- 时间：固定在 ${Number(v['lighting.time']).toFixed(1)} 时，提供时间滑块。`);
  out.push('- 提供"重新生成种子"按钮，所有程序生成使用同一个可复现种子。');
  out.push('');
  out.push('【三、界面】');
  const hud = visualLine(allParams().find((p) => p.id === 'hud.style')!, v);
  out.push(`- ${hud ?? '不需要游戏 UI'}。UI 的强调色取自上面的色板。`);
  out.push('');
  out.push('【禁止项】');
  forbidden(v).forEach((f) => out.push(`- ${f}`));
  const pit = pitfallsOf(v);
  if (pit.length) {
    out.push('');
    out.push('【技术体检注意】');
    pit.forEach((x) => out.push(`- ${x}`));
  }
  out.push('');
  out.push('【验收方式】');
  checks(v).forEach((x) => out.push(`- ${x}`));
  return out.join('\n');
}

/**
 * 可复现配方 JSON（§4.3）：values 去掉视图键（色盲模拟、对比度检查这些「怎么看」的开关不进导出），
 * 并带上来源 origin（场景 / 配方 / 叠加 / 皮肤 / 风格词和每层的值），导入时据此恢复各层的「原样」与改动数。
 * origin 不给时取 store 当前的来源。
 */
export function recipeJson(v: Values, recipeId?: string | null, notes = '', origin?: Origin | null): string {
  const pal = getPalette(str(v, 'color.palette'));
  const o = origin === undefined ? useStore.getState().origin : origin;
  return JSON.stringify({
    schema: SCHEMA_VERSION,
    app: 'game-art-explorer@0.1.0',
    createdAt: new Date().toISOString(),
    scene: { id: str(v, 'game.scene'), builderVersion: 1 },
    seed: v['game.seed'],
    baseRecipe: recipeId ?? null,
    origin: o ? normalizeOrigin(o) : null,
    values: withoutViewKeys(v),
    resolvedPalette: pal.roles,
    assets: [],
    refs: recipeId ? RECIPE_MAP.get(recipeId)?.refs ?? [] : [],
    notes,
  }, null, 2);
}

/** 导入可复现配方：逐项校验，未知参数与无效值列出来而不是悄悄丢掉 */
export interface ImportResult {
  ok: boolean;
  error?: string;
  values: Values;
  baseRecipe: string | null;
  /** 导出时的来源（没有时 null = 旧版导出：B 的导入按 baseRecipe 处理） */
  origin: Origin | null;
  notes: string;
  createdAt?: string;
  problems: string[];
  applied: number;
}

export function parseRecipe(text: string): ImportResult {
  const empty: ImportResult = { ok: false, values: {}, baseRecipe: null, origin: null, notes: '', problems: [], applied: 0 };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ...empty, error: `不是有效的 JSON：${(e as Error).message}` };
  }
  const r = raw as { schema?: number; values?: Record<string, unknown>; baseRecipe?: string | null; origin?: unknown; notes?: string; createdAt?: string; assets?: unknown[] };
  if (!r || typeof r !== 'object' || !r.values || typeof r.values !== 'object') return { ...empty, error: '缺少 values 字段，不像是本工具导出的配方' };
  const problems: string[] = [];
  if (r.schema !== undefined && r.schema !== SCHEMA_VERSION) problems.push(`配方版本 ${r.schema}，当前工具版本 ${SCHEMA_VERSION}：已按参数逐项迁移`);
  const values: Values = {};
  let viewSkipped = 0;
  for (const [id, val] of Object.entries(r.values)) {
    // 视图键（检查工具）只是「怎么看」：旧版导出带了也不导入，免得一导入就开着色盲模拟
    if (isViewKey(id)) { viewSkipped++; continue; }
    const p = allParams().find((x) => x.id === id);
    // UI 的覆盖键（vis.corner@button）与元素实例键（el.minimap.form）不登记，按字符串收下
    if (!p && isUiKey(id)) { values[id] = Array.isArray(val) ? val.join(',') : String(val); continue; }
    // UI 体系参数的 auto = 跟随，不是选项
    if (p?.ui && val === 'auto') { values[id] = 'auto'; continue; }
    if (!p) { problems.push(`未知参数 ${id}（可能来自更新或更旧的版本），已忽略`); continue; }
    if (p.kind === 'choice') {
      if (!p.options?.some((o) => o.value === val)) { problems.push(`${p.label} 没有选项「${String(val)}」，保留默认值`); continue; }
      values[id] = val as string;
    } else if (p.kind === 'range' || p.kind === 'int') {
      const n = Number(val);
      if (!Number.isFinite(n)) { problems.push(`${p.label} 的值 ${String(val)} 不是数字，保留默认值`); continue; }
      const c = Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, p.kind === 'int' ? Math.round(n) : n));
      if (c !== n) problems.push(`${p.label} 的值 ${n} 超出范围，已改为 ${c}`);
      values[id] = c;
    } else if (p.kind === 'toggle') {
      values[id] = Boolean(val);
    } else {
      values[id] = String(val);
    }
  }
  if (viewSkipped) problems.push(`跳过了 ${viewSkipped} 个查看工具的开关（色盲模拟、对比度检查等，只影响怎么看）`);
  if (Array.isArray(r.assets) && r.assets.length) problems.push(`配方引用了 ${r.assets.length} 个素材：当前工具没有素材库，需手动核对`);
  const baseRecipe = r.baseRecipe && RECIPE_MAP.has(r.baseRecipe) ? r.baseRecipe : null;
  if (r.baseRecipe && !baseRecipe) problems.push(`起点配方 ${r.baseRecipe} 已不存在`);
  const origin = r.origin && typeof r.origin === 'object' ? normalizeOrigin(r.origin) : null;
  return { ok: true, values, baseRecipe, origin, notes: r.notes ?? '', createdAt: r.createdAt, problems, applied: Object.keys(values).length };
}

/** 目标美术 Brief：可以写尚未实现的愿景，但把缺口单列出来 */
export function targetBrief(v: Values, recipeId?: string | null, style?: { name: string; definition: string; mechanisms: string; needs: string[]; representatives: { name: string }[] } | null): string {
  const r = recipeId ? RECIPE_MAP.get(recipeId) : undefined;
  const scene = sceneMeta(str(v, 'game.scene'));
  const out: string[] = ['# 目标美术 Brief', ''];
  out.push(`**研究对象**：在「${scene.name}」（${scene.category}）这类空间里，${style ? `探索「${style.name}」方向：${style.definition}` : r ? `探索「${r.name}」方向：${r.summary}` : '探索当前实验的美术方向。'}`);
  if (style) out.push('', `**关键视觉机制**：${style.mechanisms}`);
  out.push('', '## 已在实验台上验证的部分', '');
  for (const s of describeVisual(v)) s.lines.forEach((l) => out.push(`- ${l}`));
  const gaps = [...(r?.missing ?? []), ...(style?.needs ?? [])].filter((x, i, a) => a.indexOf(x) === i);
  out.push('', '## 尚未实现、需要进一步制作的部分', '');
  if (gaps.length) gaps.forEach((g) => out.push(`- ${g}`));
  else out.push('- （暂无已知缺口；仍需在真实玩法镜头与运动下复核）');
  out.push('', '## 建议的下一步', '');
  out.push('- 固定场景、种子与镜头，分别只改线条、设色、光照，比较差异后再决定专用素材。');
  if (gaps.some((g) => /素材|贴图|手绘|笔|精灵|扫描|实拍/.test(g))) out.push('- 缺口中有需要专用素材的部分：先列出素材规格与复用方式，确认费用后再生成。');
  out.push('- 在目标品类的实际镜头下检查可读性：灰度、剪影、缩略图与移动中的闪烁。');
  const refs = [...(style?.representatives ?? []).map((x) => x.name), ...(r?.refs ?? [])].filter((x, i, a) => a.indexOf(x) === i);
  if (refs.length) out.push('', `**参考作品**（用于观察规则，不要求复制）：${refs.join('、')}`);
  return out.join('\n');
}
