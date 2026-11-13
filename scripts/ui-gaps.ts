/* 风格图谱与案例拆解里的 UI 缺口清单（M3b：看哪些已能用 UI 参数近似）。运行：npx tsx scripts/ui-gaps.ts */
import '../src/dims/index';
import { STYLES } from '../src/content/styles.data';
import { remainingNeeds } from '../src/content/styles';
const UI = /UI|HUD|界面|字体|菜单|图标|血条|面板|对话框|字幕|标题字|按钮|文字/i;
const all = new Map<string, string[]>();
for (const s of STYLES) for (const n of s.needs ?? []) if (UI.test(n)) all.set(n, [...(all.get(n) ?? []), s.id]);
const rem = new Set(STYLES.flatMap((s) => remainingNeeds(s)).filter((n) => UI.test(n)));
console.log(`风格缺口里与 UI 有关的 ${all.size} 条（未解决 ${rem.size}）`);
for (const [n, ids] of all) console.log(`${rem.has(n) ? '✗' : '✓'} ${n}  ← ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? '…' : ''}`);

// 案例拆解里自由书写的 UI 缺口
import { readFileSync } from 'node:fs';
import { hintsFromGaps } from '../src/content/styles';
const gaps: string[] = [];
for (const f of ['analysis-1', 'analysis-2', 'analysis-3', 'analysis-4']) {
  const j = JSON.parse(readFileSync(`src/content/cases/${f}.json`, 'utf8'));
  for (const a of (Array.isArray(j) ? j : Object.values(j)) as { gaps?: string[] }[]) for (const g of a.gaps ?? []) if (UI.test(g)) gaps.push(g);
}
const h = hintsFromGaps(gaps);
console.log(`\n案例拆解里与 UI 有关的缺口 ${gaps.length} 条：可近似 ${h.matched.length}，部分可近似 ${h.partial.length}`);
for (const g of h.matched) console.log('  ✓', g);
for (const g of h.partial) console.log('  ◐', g);
