/*
 * UI 参考库 R1 报告：把 docs/survey/data/ui-ref-candidates.json 写成可审阅的文档 docs/survey/07-ui-references.md。
 * 运行：npx tsx scripts/refs/report-candidates.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { UI_CONTENT } from '../../src/content/uiContent';

const ROOT = process.cwd();
const data = JSON.parse(readFileSync(join(ROOT, 'docs/survey/data/ui-ref-candidates.json'), 'utf8'));
const pool = JSON.parse(readFileSync(join(ROOT, 'docs/survey/data/ui-ref-candidates.pool.json'), 'utf8'));

interface C {
  appid: number | null; name: string; platform: string;
  evidence: { awards: { source: string; year: number; result: string }[]; cases: string[]; artTags: string[]; tier: string };
  reviews?: { positive: number; negative: number; ratio: number };
  genres?: { primary: string | null; all: string[]; note?: string };
  manual?: { canonical: string; platform: string; note?: string };
}
const list: C[] = data.candidates;
const S = data.summary;

const GENRES: [string, string][] = [
  ['strategy', '策略'], ['builder', '建造经营'], ['factory', '工厂自动化'],
  ['explore', '探索冒险'], ['rpg', '角色扮演'], ['action', '动作'], ['platformer', '平台跳跃'],
  ['life', '生活养成'], ['puzzle', '解谜'], ['narrative', '叙事'],
  ['card', '卡牌桌游'], ['racing', '竞速'], ['shooter', '射击'],
  ['horror', '恐怖'], ['survival', '生存'], ['sandbox', '沙盒'],
];
const GROUPS: [string, string[]][] = [
  ['① 策略 / 建造经营', ['strategy', 'builder', 'factory']],
  ['② 探索 / RPG / 动作', ['explore', 'rpg', 'action', 'platformer']],
  ['③ 养成 / 解谜 / 叙事', ['life', 'puzzle', 'narrative']],
  ['④ 卡牌 / 竞速 / 射击', ['card', 'racing', 'shooter']],
  ['其他（恐怖 / 生存 / 沙盒）', ['horror', 'survival', 'sandbox']],
];
const label = Object.fromEntries(GENRES);
const SHORT: Record<string, string> = {
  'IGF Excellence in Visual Art': 'IGF', 'BAFTA Artistic Achievement': 'BAFTA', 'TGA Best Art Direction': 'TGA',
  'GDCA Best Visual Art': 'GDCA', 'D.I.C.E. Art Direction': 'DICE', 'Golden Joystick Best Visual Design': 'GJ',
  'Apple Design Awards Visuals and Graphics': 'ADA',
};
const ev = (c: C) => {
  const aw = [...new Set(c.evidence.awards.map((a) => `${SHORT[a.source] ?? a.source}${a.year ? ` ${a.year}` : ''}${a.result === 'winner' ? '★' : ''}`))].slice(0, 3);
  const parts = [...aw];
  if (c.evidence.cases.length) parts.push('案例库');
  if (c.evidence.artTags.length) parts.push(c.evidence.artTags.slice(0, 2).join('/'));
  return parts.join('，');
};
const rv = (c: C) => (c.reviews && c.reviews.positive + c.reviews.negative > 0 ? `${Math.round(c.reviews.ratio * 100)}% / ${(c.reviews.positive + c.reviews.negative).toLocaleString('en')}` : '—');
const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const sortKey = (a: C, b: C) => tierOrder[a.evidence.tier] - tierOrder[b.evidence.tier] || (b.reviews?.positive ?? 0) - (a.reviews?.positive ?? 0);

const primaryOf = (g: string) => list.filter((c) => c.genres?.primary === g);
const anyOf = (g: string) => list.filter((c) => c.genres?.all.includes(g));

const L: string[] = [];
L.push('# UI 参考库（研究轨 R1：候选名单）', '');
L.push(`> 生成：${S.generatedAt.slice(0, 10)}，由 \`scripts/refs/collect-candidates.ts\` + \`report-candidates.ts\` 产出；数据在 \`docs/survey/data/ui-ref-candidates.json\`。计划见 \`docs/ui-hud-plan.md\`。`, '');
L.push('## 这份名单是什么', '');
L.push('UI 参考卡（R2）从这份名单里挑：每款都有"美术好评"的证据，按 16 个品类归类。现在还只是名单——UI 长什么样、玩家怎么评价，要到 R2 / R3 才逐款拆解。', '');
L.push('**分级**', '');
L.push('| 级 | 含义 | 数量 |', '|---|---|---|');
L.push(`| A | 美术类奖项得主（IGF 视觉艺术、BAFTA 艺术成就、TGA 最佳美术指导、GDC 选择奖最佳视觉艺术、D.I.C.E. 美术指导、Golden Joystick 最佳视觉设计、Apple Design Awards 视觉与图形） | ${S.tiers.A ?? 0} |`);
L.push(`| B | 上述奖项入围 | ${S.tiers.B ?? 0} |`);
L.push(`| C | 案例库（美术风格调研的代表作） | ${S.tiers.C ?? 0} |`);
L.push(`| D | Steam：美术标签排在玩家标签前 12 位，好评率 ≥ 90%，评测 ≥ 2,000 | ${S.tiers.D ?? 0} |`);
L.push(`| E | 品类补充（只用于工厂自动化、竞速）：评测 ≥ 500、好评率 ≥ 85%，标签里有美术标签，主品类对得上 | ${S.tiers.E ?? 0} |`);
L.push('', `合计 **${S.total}** 款（Steam ${S.steam}，非 Steam ${S.nonSteam}：主机独占、手机或未上架，R2 只能靠 Game UI Database 等链接与公开截图）。另有 ${pool.games.length} 款只挂着美术标签、但标签排名靠后，放在 \`ui-ref-candidates.pool.json\` 备查，不计入。`, '');
L.push('**奖项条目来源**：' + Object.entries(S.awardSources).map(([k, n]) => `${SHORT[k] ?? k} ${n}`).join('，') + '。', '');
L.push('## 品类覆盖', '');
L.push('按 Steam 玩家标签映射到探索台的 16 个品类。"主品类"每款只算一个；"含该品类"允许一款算进几个品类（如动作 RPG）。目标每个品类 ≥ 15 款可用参考。', '');
L.push('| 组 | 品类 | 主品类 | 含该品类 | 其中 A/B 级 | 状态 |', '|---|---|---|---|---|---|');
for (const [gname, gs] of GROUPS) {
  for (const g of gs) {
    const p = primaryOf(g).length;
    const a = anyOf(g);
    const ab = a.filter((c) => c.evidence.tier === 'A' || c.evidence.tier === 'B').length;
    L.push(`| ${gname} | ${label[g]} | ${p} | ${a.length} | ${ab} | ${a.length >= 15 ? '够' : `**不足**（差 ${15 - a.length}）`} |`);
  }
}
const nonSteam = list.filter((c) => !c.appid);
L.push('', `非 Steam 的 ${nonSteam.length} 款（主机独占、手机、网页、下架老游戏）按 \`scripts/refs/nonsteam.ts\` 手工归类，已计入上表；名单里用缩写或旧名、其实在 Steam 上的条目，也在那张表里改成 Steam 上的名称后合并到同一款游戏。`, '');
L.push('## 各品类名单', '');
L.push('每款只归一个主品类；融合类游戏的其他玩法写在"融合玩法与说明"一列（Steam 游戏按玩家标签自动列出，非 Steam 与改名条目带手工说明）。每个品类列主品类的全部游戏（A → E，同级按评测数）。"证据"列：奖项（★ = 得主）、案例库、美术标签；"好评"列：好评率 / 评测数（SteamSpy）。', '');
for (const [gname, gs] of GROUPS) {
  L.push(`### ${gname}`, '');
  for (const g of gs) {
    const p = primaryOf(g).sort(sortKey);
    L.push(`#### ${label[g]}（${p.length} 款）`, '');
    if (!p.length) { L.push('（暂无，见"补充方案"）', ''); continue; }
    L.push('| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |', '|---|---|---|---|---|');
    for (const c of p) {
      const blend = (c.genres?.all ?? []).filter((x) => x !== g).map((x) => label[x]).join('、');
      const note = c.genres?.note ?? c.manual?.note;
      const other = [blend ? `融合 ${blend}` : '', note ?? ''].filter(Boolean).join('；');
      const name = c.appid ? `[${c.name}](https://store.steampowered.com/app/${c.appid}/)` : `${c.name}（${c.manual?.platform ?? '非 Steam'}）`;
      L.push(`| ${c.evidence.tier} | ${name} | ${ev(c)} | ${rv(c)} | ${other} |`);
    }
    L.push('');
  }
}
L.push('## 按呈现内容分类（R2 建卡时标注）', '');
L.push('不同游戏的 UI 呈现的内容不一样：先按"玩家此刻在看哪一屏"（界面类型）和"这一屏上显示了什么信息"（信息元素）分类，再看怎么画。分类数据在 `src/content/uiContent.ts`，R2 每张参考卡标注它出现了哪些内容，并按内容统计参考数（每项 ≥ 3）。', '');
L.push('| 层 | 项 | 玩家想知道什么 | 常见画法 |', '|---|---|---|---|');
for (const c of UI_CONTENT) L.push(`| ${c.kind === 'screen' ? '界面类型' : '信息元素'} | ${c.label} | ${c.question} | ${c.forms.join('、')} |`);
L.push('');
L.push('## 已知问题（R2 建卡时逐款纠正）', '');
L.push('- **品类是按玩家标签自动映射的**，有误判：例如竞速里混进了派对闯关（Stumble Guys）、节奏游戏（MUSYNX），工厂里有挂机 RPG（Melvor Idle）。R2 建卡时人工确认品类。');
L.push('- **D / E 级只说明"有鲜明美术风格且玩家口碑好"**，不等于玩家专门夸美术；R3 挖评测后按"提到美术的好评比例"再排序。');
L.push('- **同一游戏的不同版本**（原版 / 决定版、本体 / 合集）可能各占一条，R2 合并。');
L.push(`- **非 Steam 的 ${nonSteam.length} 款**（多为主机独占与手机）没有标签与评测，品类是手工归的（拿不准的标了"待核"），UI 参考主要靠 Game UI Database 链接与公开截图。`);
L.push('- 评测数来自 SteamSpy（有滞后，和 Steam 商店页的数字可能差几个百分点）。', '');
L.push('## R2 怎么从这里挑约 500 款', '');
L.push('每个品类先取 A / B / C 级，再按评测数补 D / E 级，直到该品类 ≥ 15 款且总数约 500；R2 按 策略/建造 → 探索/RPG/动作 → 养成/解谜/叙事 → 卡牌/竞速/射击 分 4 批建卡，每批开始前先把这一批的名单列出来。', '');
L.push('## 补充方案（品类不足 15 款时）', '');
const short = GENRES.filter(([g]) => anyOf(g).length < 15);
if (!short.length) L.push('所有品类都已达到 15 款。');
else {
  L.push('以下品类不足 15 款，R2 开始前按顺序补：', '');
  for (const [g, n] of short) L.push(`- **${n}**（现有 ${anyOf(g).length} 款）：① 放宽 Steam 门槛到评测 ≥ 500、好评率 ≥ 85%，只限该品类标签 + 美术标签；② 从 Game UI Database 按品类筛有美术口碑的作品，人工核对后加入；③ 非 Steam 获奖作品里属于该品类的。`);
}
L.push('');
writeFileSync(join(ROOT, 'docs/survey/07-ui-references.md'), L.join('\n'));
console.log('wrote docs/survey/07-ui-references.md', list.length);
