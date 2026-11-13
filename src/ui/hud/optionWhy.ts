import { rationaleOf, type UiKnowledge } from '../../content/uiKnowledge';
import { HUD_STYLE_DEF, SELECTORS } from '../../hud/sys/register';
import { PRESET } from '../../hud/sys/spec';

/*
 * 选项提示（分段按钮的 title、下拉框 <option title>）里追加的一行依据（G1，docs/t1-tool-knowledge.md 第 7 节 B1）。
 * T0（docs/workbench-redesign.md §11.0）：原来写在 ParamWhy.tsx 里，组件文件导出非组件会让 Fast Refresh 退回整页刷新，所以挪到这里。
 */

const COLON = /[：:]/;
/** 做法名的短头（选项提示里用） */
const shortName = (t: string) => t.split(COLON)[0];

const optCache = new WeakMap<UiKnowledge, Map<string, string>>();
/** 品类布局 → 它的品类篇（布局预设的 genre 字段） */
const layoutChapterLabels = (k: UiKnowledge, value: string): string[] => {
  const pr = PRESET.get(value);
  if (!pr || pr.kind !== 'layout') return [];
  const genres = Array.isArray(pr.genre) ? pr.genre : pr.genre ? [pr.genre] : [];
  return genres.map((g) => k.chapterById.get(String(g))?.label).filter((x): x is string => !!x);
};

/** 一个选项的依据，一行字："做法 2 条：尺寸主导、场景色板直取 · 家族：暗金金属牌、装饰艺术 等 8 个"；没有就是空串 */
export function optionWhy(k: UiKnowledge, key: string, value: string): string {
  let m = optCache.get(k);
  if (!m) { m = new Map(); optCache.set(k, m); }
  const ck = `${key}=${value}`;
  const hit = m.get(ck);
  if (hit !== undefined) return hit;
  const r = rationaleOf(k, key, value);
  const am = r.approaches.filter((a) => a.match);
  const fm = r.families.filter((f) => f.match);
  const parts: string[] = [];
  if (am.length) parts.push(`做法 ${am.length} 条：${[...new Set(am.map((a) => shortName(a.approach.name)))].slice(0, 2).join('、')}${am.length > 2 ? ' 等' : ''}`);
  if (key === SELECTORS.layout) { const ch = layoutChapterLabels(k, value); if (ch.length) parts.push(`品类篇：${ch.join('、')}`); }
  if (fm.length) parts.push(`${key === HUD_STYLE_DEF.id ? '用这套皮肤的家族' : '家族'}：${fm.slice(0, 3).map((f) => f.family.name).join('、')}${fm.length > 3 ? ` 等 ${fm.length} 个` : ''}`);
  const out = parts.join(' · ');
  m.set(ck, out);
  return out;
}
