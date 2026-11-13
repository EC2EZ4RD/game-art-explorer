/* 抽查奖项解析：npx tsx scripts/refs/check-awards.ts（读 qa/refs-cache 里缓存的维基百科页面） */
import { readFileSync } from 'node:fs';
import { parseAppleDesign, parseDice, parseGdca, parseGoldenJoystick } from './awards';

const wk = (page: string) => JSON.parse(readFileSync(`qa/refs-cache/wiki_${page.replace(/[^\w.-]+/g, '_')}.json`, 'utf8')).parse.wikitext as string;
const show = (name: string, hits: { year: number; title: string; result: string }[]) => {
  const byYear: Record<number, string[]> = {};
  for (const h of hits) (byYear[h.year] ??= []).push((h.result === 'winner' ? '★' : '') + h.title);
  console.log(`== ${name}: ${hits.length} 条，${Object.keys(byYear).length} 年，得主 ${hits.filter((h) => h.result === 'winner').length}`);
  const years = Object.keys(byYear).map(Number).sort();
  for (const y of [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]]) console.log(`  ${y}: ${byYear[y].join(' | ')}`);
};
show('GDCA 最佳视觉艺术', parseGdca(wk('Game_Developers_Choice_Award_for_Best_Visual_Art')));
show('D.I.C.E. 美术指导', parseDice(wk('D.I.C.E._Award_for_Outstanding_Achievement_in_Art_Direction')));
show('Golden Joystick 视觉设计', parseGoldenJoystick(wk('Golden_Joystick_Awards')));
show('Apple Design Awards 视觉与图形', parseAppleDesign(wk('Apple_Design_Awards')));
