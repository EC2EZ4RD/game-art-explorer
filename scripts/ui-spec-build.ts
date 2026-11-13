/*
 * UI 参数体系 → 探索台运行时数据（docs/ui-hud-plan.md M3a）。
 * 运行：npx tsx scripts/ui-spec-build.ts
 * 输入：docs/survey/data/ui-param-system.json（调研产物，约 1MB，带大量说明与审稿记录）
 * 输出：src/content/uiSpec.gen.json（只保留运行时要用的字段：参数、取值、预设、派生规则、约束、画面 → UI 对照）
 * check:content 会比对两者，调研 JSON 改了却没重跑本脚本时报警。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'docs', 'survey', 'data', 'ui-param-system.json');
const OUT = join(ROOT, 'src', 'content', 'uiSpec.gen.json');

type Any = Record<string, any>;
const raw = readFileSync(SRC, 'utf8');
const d = JSON.parse(raw) as Any;
const pick = (o: Any, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null && o[k] !== '').map((k) => [k, o[k]]));
const refs = (r: unknown, n: number) => (Array.isArray(r) ? r.slice(0, n) : undefined);

/*
 * 悬停文字里不出现内部 id（整合修复 U#18，docs/workbench-redesign.md §7「去掉英文 API 词」）：给人看的说明字段（取值说明、参数的白话 / 看哪里 / 两端、
 * 分组说明、预设说明）在生成时把参数 id 换成参数名（`id = 取值` 换成「参数名 = 取值名」）、元素 id 换成元素名、预设 id 换成预设名，
 * 里程碑号（M12a-26）、参考截图编号（elden-ring#43、GameUI#123）、内容样本键（hud.year）去掉。调研 JSON 里的原文不动（开发、Godot 迁移照旧读它）；
 * id、取值、impl / godot 这些开发字段不经过这里
 */
const PARAM_LABEL = new Map<string, string>(), OPTION_LABEL = new Map<string, string>(), PRESET_LABEL = new Map<string, string>(), ELEMENT_LABEL = new Map<string, string>();
for (const g of d.groups) for (const p of g.params) {
  // 元素参数的名字是「元素：项」（准星：臂长）——写成「准星的臂长」
  PARAM_LABEL.set(p.id, String(p.label).replace(/\s*[：:]\s*/, '的').trim());
  for (const o of p.options ?? []) if (typeof o.value === 'string') OPTION_LABEL.set(`${p.id}=${o.value}`, String(o.label));
  if (p.id === 'cnt.elements') for (const o of p.options ?? []) if (String(o.value).startsWith('el.')) ELEMENT_LABEL.set(o.value, String(o.label).split(' / ')[0]);
}
for (const p of d.presets) PRESET_LABEL.set(p.id, String(p.label).replace(/（.*?）/g, '').trim());
const ID_RE = /(?<![A-Za-z0-9_./#-])([a-z][a-zA-Z0-9]*(?:\.[A-Za-z][A-Za-z0-9_]*)+)(@[A-Za-z][A-Za-z0-9_.]*)?(#\d+)?(?:(\s*=\s*)([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*))?/g;
function idName(id: string): string | null {
  return PARAM_LABEL.get(id) ?? ELEMENT_LABEL.get(id) ?? PRESET_LABEL.get(id) ?? null;
}
/** 开发进度备注：单独的里程碑号（M6 / M3.5 / M12c，后面不跟批次号）或「待实现」 */
const DEV_NOTE = /(?<![A-Za-z])M\d+(?:\.\d+)?[a-z]?(?![\w-])|待实现/;
function humanize(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(humanize);
  // 写在括号里的开发进度备注（「默认放置改成叙事内（M6 之前标"待实现"）」「（M11）」「（M4 导出到 Godot 设置页）」，收尾 8）：
  // 括号里有单独的里程碑号（M6、M3.5、M12c——不带批次号；M12a-26 这类批次号下面单独去掉、括号里的别的话留着）或「待实现」的那一段（按 ；分段）去掉，段都去掉了就整对去掉
  if (typeof s === 'string') {
    s = s.replace(/[（(]([^（）()]*)[）)]/g, (m: string, inner: string) => {
      if (!DEV_NOTE.test(inner)) return m;
      const keep = inner.split(/[；;]/).filter((x) => !DEV_NOTE.test(x)).map((x) => x.trim()).filter(Boolean);
      return keep.length ? `（${keep.join('；')}）` : '';
    });
  }
  if (typeof s !== 'string' || !/[a-z]\.[A-Za-z]|#\d|M1\d/.test(s)) return s;
  let t = s
    // 参考截图编号：elden-ring#43、GameUI#1511375、factorio#0（括号里只有它们时整对括号去掉）
    .replace(/[（(]\s*(?:(?<![.\w-])[A-Za-z][\w-]*#\d+[\s,，、/;；]*)+[）)]/g, '')
    .replace(/[\s,，、/]*(?<![.\w-])[A-Za-z][\w-]*#\d+\b/g, '')
    // 源文件名（charts.ts、paint.ts）、类型字段（ItemState.span）
    .replace(/\s*\b[A-Za-z]\w*\.(?:ts|tsx|json)\b/g, '').replace(/\s*\b[A-Z]\w*\.[a-z]\w*\b/g, '')
    // 素材批次号（位图 M12c-A2）
    .replace(/\s*M1\d[a-z]?-[A-Z]\d+\b/g, '')
    // 里程碑 / 批次号：M12a-26、M12b-47、M12c-11
    .replace(/[，、；;\s]*(?:新，)?M1\d[a-z]?-\d+[a-z]?(?:\s*[/、]\s*\d+)*\s*[：:]?/g, '');
  t = t.replace(ID_RE, (m, id: string, at: string | undefined, inst: string | undefined, eq: string | undefined, val: string | undefined, off: number, all: string) => {
    const name = idName(id);
    if (!name) return '';
    const tgt = at ? idName(at.slice(1)) : null;
    // 前文已经写了这个名字（「图标色 col.icon」「个数 el.threat.count」）：不再重复
    const before = all.slice(Math.max(0, off - 12), off).trimEnd(), tail = name.split('的').pop() ?? name;
    let out = !tgt && !inst && !eq && (before.endsWith(name) || before.endsWith(tail)) ? '' : tgt ? `${tgt}的${name}` : name;
    if (inst) out += `（第 ${inst.slice(1)} 份）`;
    // 取值：参数自己的取值名；元素 id 后面写的取值按它的画法（el.party = statusStrip → 队伍的画法里的名字）；预设 id（screen.manage）换预设名
    if (eq && val) out += `${out ? eq : ''}${OPTION_LABEL.get(`${id}=${val}`) ?? OPTION_LABEL.get(`${id}.form=${val}`) ?? PRESET_LABEL.get(val) ?? (val.includes('.') ? '' : val)}`;
    return out;
  });
  t = t.replace(ID_RE, (m: string, id: string) => idName(id) ?? (/^[a-z]+\.[a-z]/.test(id) ? '' : m));
  t = t.replace(/@(?=[一-鿿])/g, '');
  // 收拾去掉 id 以后留下的空括号、悬空的标点与「样本 」「见 」这类前缀（前缀后面要有空格：原文是「样本 hud.charges」，不吃「全大写）」的「写」）
  t = t.replace(/(?:样本|见|配|读|写|按|用|与)\s+(?=[）)，、；。]|$)/g, '')
    .replace(/[（(]\s*[，、；;=\s]*[）)]/g, '').replace(/[（(]\s*[，、；;]\s*/g, '（').replace(/\s*[，、；;]\s*[）)]/g, '）')
    .replace(/[，、]\s*[，、]/g, '，').replace(/\s*=\s*(?=[）)，、；。]|$)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([，。；、）])/g, '$1').trim();
  return t;
}
const human = (o: Any, keys: string[]) => { for (const k of keys) if (o[k] !== undefined) o[k] = humanize(o[k]); return o; };

const groups = d.groups.map((g: Any) => ({
  ...human(pick(g, ['id', 'label', 'desc', 'question']), ['desc', 'question']),
  params: g.params.map((p: Any) => ({
    ...human(pick(p, ['id', 'group', 'label', 'cls', 'scope', 'kind', 'default', 'range', 'activeWhen', 'overrideAt', 'merge', 'tier', 'tab', 'preview', 'random', 'randomRange', 'fallback', 'plain', 'lookAt', 'ends', 'starter', 'status', 'milestone', 'impl', 'godot', 'godotLevel', 'panel', 'appliesTo', 'optionsFrom', 'ordered', 'freeColors', 'joinable', 'control', 'derivedFrom', 'needs']), ['plain', 'lookAt', 'ends']),
    options: p.options?.map((o: Any) => ({ ...human(pick(o, ['value', 'label', 'desc', 'needs', 'godotLevel', 'parent', 'layer', 'channel']), ['desc']), refs: refs(o.refs, 2) })),
    absorbs: refs(p.absorbs, 12),
  })),
}));

const presets = d.presets.map((p: Any) => ({
  ...human(pick(p, ['id', 'kind', 'label', 'desc', 'values', 'suggests', 'accent', 'keywordDefaults', 'keyword', 'existing', 'genre', 'audience', 'browse', 'layers', 'members', 'firstTry', 'lookAt', 'differs', 'tags', 'missing', 'pattern', 'container', 'family', 'terms', 'survey', 'pairsWith', 'rules']), ['desc', 'lookAt', 'differs', 'firstTry']),
  refs: refs(p.refs, 3),
}));

const out = {
  // 换行统一成 LF 再算：Windows 工作区（CRLF）与 CI（LF）得到同一个值
  hash: createHash('sha1').update(raw.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12),
  meta: pick(d.meta, ['title', 'version', 'date']),
  groups,
  vocab: d.vocab,
  presets,
  derived: d.derived.map((r: Any) => pick(r, ['id', 'cls', 'from', 'to', 'rule', 'apply'])),
  constraints: d.constraints,
  fromArt: d.fromArt,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`uiSpec.gen.json: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB；参数 ${groups.reduce((n: number, g: Any) => n + g.params.length, 0)}，预设 ${presets.length}，派生 ${out.derived.length}，约束 ${out.constraints.length}`);
