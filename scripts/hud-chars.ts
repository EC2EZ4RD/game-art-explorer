/*
 * 游戏 UI 画布上可能出现的字：src/hud/ 源码里（去掉注释后）出现的非 ASCII 字符，加上 uiSpec 里会画到画布上的名字（信息元素名、界面模板的标题栏）。
 * fonts-subset.ts 用它做中文子集，check-content.ts 用它检查有没有漏字。src/hud/sys/ 只做解析，不画字，跳过；
 * fontList.ts 是字体登记表（原字体名、许可、用途说明只写进 LICENSES.md，不上画布），也跳过（M12b-54：省下只在登记表里出现的字，一个字约 0.9 KB）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['sys']);
const SKIP_FILES = new Set(['fontList.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (SKIP.has(f) ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) && !SKIP_FILES.has(f) ? [p] : [];
  });
}

/** 去掉 /* … *\/ 块注释与 // 行注释（字符串里的 // 很少见，误删只会多收字，不会漏字之外的问题由 check:content 兜底） */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

export function hudCharSet(root: string): Set<string> {
  const set = new Set<string>();
  const add = (s: string) => { for (const ch of s) if (ch.charCodeAt(0) > 0x7e && !/\s/.test(ch)) set.add(ch); };
  for (const f of walk(join(root, 'src', 'hud'))) add(stripComments(readFileSync(f, 'utf8')));
  // 画布上会画的数据文字：信息元素名（全部控件展示的格子标题）
  type Spec = { vocab: { elements: { label: string }[] }; presets: { kind: string; label: string }[]; groups: { params: { id: string; options?: { label: string }[] }[] }[] };
  const spec = JSON.parse(readFileSync(join(root, 'src', 'content', 'uiSpec.gen.json'), 'utf8')) as Spec;
  for (const e of spec.vocab.elements) add(e.label);
  // 界面模板的标题栏（compose/screen.ts templateLabel）：选了模板预设时写预设名（去掉括号、取" / "前一段），否则写 cnt.subtype 的取值名（取" / "前一段）
  for (const p of spec.presets) if (p.kind === 'screen') add(p.label.replace(/（.*?）/g, '').split(' / ')[0]);
  for (const g of spec.groups) for (const p of g.params) if (p.id === 'cnt.subtype') for (const o of p.options ?? []) add(o.label.split(' / ')[0]);
  return set;
}
