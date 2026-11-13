/*
 * 风格图谱数据自检（临时脚本）：npx tsx scripts/check-styles.ts
 * - 近似参数：id/选项是否存在、数值范围、类型、是否在这组参数下生效
 * - 配方、情绪、文化、品类引用是否有效；id 是否唯一
 * - 按分组计数、能力状态分布
 */
import '../src/dims/index';
import { activeState, defaultValues, getParam } from '../src/dims/index';
import type { Values } from '../src/dims/index';
import { capabilityOf, invalidApprox, type CapState, type StyleEntry } from '../src/content/styles';
import { CULTURES, MOODS, STYLES } from '../src/content/styles.data';
import { RECIPE_MAP } from '../src/content/recipes';

const problems: string[] = [];
const base = defaultValues();

function checkValues(tag: string, approx: Values) {
  const merged = { ...base, ...approx };
  for (const [id, v] of Object.entries(approx)) {
    const p = getParam(id);
    if (!p) continue; // invalidApprox 已报告
    if (p.kind === 'toggle' && typeof v !== 'boolean') problems.push(`${tag}: ${id} 应为布尔值`);
    if (p.kind === 'color' && !(typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v))) problems.push(`${tag}: ${id} 应为 #RRGGBB`);
    if (p.kind === 'range' || p.kind === 'int') {
      if (typeof v !== 'number') problems.push(`${tag}: ${id} 应为数字`);
      else {
        if (p.min != null && v < p.min) problems.push(`${tag}: ${id}=${v} 小于 ${p.min}`);
        if (p.max != null && v > p.max) problems.push(`${tag}: ${id}=${v} 大于 ${p.max}`);
        if (p.kind === 'int' && !Number.isInteger(v)) problems.push(`${tag}: ${id} 应为整数`);
      }
    }
    const st = activeState(p, merged);
    if (st !== true) problems.push(`${tag}: ${id} 不生效（${st}）`);
  }
}

const asStyle = (id: string, approx: Values): StyleEntry => ({
  id, code: '', name: id, group: '', definition: '', mechanisms: '', differs: '', representatives: [], surveyRealtime: 'live', approx, needs: [],
});

/* ---- 风格 ---- */
const ids = new Set<string>();
const codes = new Set<string>();
const moodNames = new Set(MOODS.map((m) => m.name));
const cultureNames = new Set(CULTURES.map((c) => c.name));
const genres = new Set((getParam('game.genre')?.options ?? []).map((o) => o.value));
for (const s of STYLES) {
  const tag = `${s.code} ${s.name}`;
  if (ids.has(s.id)) problems.push(`${tag}: id 重复 ${s.id}`);
  if (codes.has(s.code)) problems.push(`${tag}: 编号重复`);
  ids.add(s.id); codes.add(s.code);
  for (const b of invalidApprox(s)) problems.push(`${tag}: ${b}`);
  checkValues(tag, s.approx);
  if (s.recipe && !RECIPE_MAP.has(s.recipe)) problems.push(`${tag}: 配方不存在 ${s.recipe}`);
  for (const m of s.moods ?? []) if (!moodNames.has(m)) problems.push(`${tag}: 未知情绪 ${m}`);
  for (const c of s.cultures ?? []) if (!cultureNames.has(c)) problems.push(`${tag}: 未知文化 ${c}`);
  for (const g of s.genres ?? []) if (!genres.has(g)) problems.push(`${tag}: 未知品类 ${g}`);
}

/* ---- 情绪 ---- */
for (const m of MOODS) {
  const tag = `情绪 ${m.name}`;
  if (m.approx) {
    for (const b of invalidApprox(asStyle(m.id, m.approx))) problems.push(`${tag}: ${b}`);
    checkValues(tag, m.approx);
  }
  for (const r of m.recipes ?? []) if (!RECIPE_MAP.has(r)) problems.push(`${tag}: 配方不存在 ${r}`);
  if (!m.factors.length) problems.push(`${tag}: 没有可观察因素`);
}

/* ---- 文化 ---- */
const cultureIds = new Set<string>();
for (const c of CULTURES) {
  if (cultureIds.has(c.id)) problems.push(`文化 ${c.name}: id 重复`);
  cultureIds.add(c.id);
}

/* ---- 汇总 ---- */
const byGroup = new Map<string, number>();
for (const s of STYLES) byGroup.set(s.group, (byGroup.get(s.group) ?? 0) + 1);
const hist: Record<CapState, number> = { live: 0, partial: 0, needsAsset: 0, reference: 0, todo: 0 };
const bySurvey: Record<string, number> = {};
for (const s of STYLES) {
  hist[capabilityOf(s, base).state]++;
  bySurvey[s.surveyRealtime] = (bySurvey[s.surveyRealtime] ?? 0) + 1;
}

console.log(`风格 ${STYLES.length} 条，情绪 ${MOODS.length} 个，文化 ${CULTURES.length} 个`);
console.log('\n按分组：');
for (const [g, n] of byGroup) console.log(`  ${g}: ${n}`);
console.log('\n能力状态（capabilityOf，默认参数为底）：');
for (const [k, n] of Object.entries(hist)) console.log(`  ${k}: ${n}`);
console.log('\n调研判断（surveyRealtime）：');
for (const [k, n] of Object.entries(bySurvey)) console.log(`  ${k}: ${n}`);
console.log(problems.length ? `\n问题 ${problems.length} 个：\n${problems.join('\n')}` : '\n没有问题');
process.exitCode = problems.length ? 1 : 0;
