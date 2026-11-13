/*
 * 游戏 UI 字体子集化（docs/ui-hud-plan.md M2）。
 * 运行：npx tsx scripts/fonts-subset.ts（需要 Python + fontTools + brotli：pip install fonttools brotli；python 不在 PATH 上时设 PYTHON=python 的路径）
 * 输入：qa/fonts-src/ 里的原始字体（不随项目分发；从哪里下载见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」）
 *   与许可原文（qa/fonts-src/ 里没有就用 public/fonts/ 里已有的那份）。
 *   开跑前先查齐原始字体、许可原文与 Python：缺了就列出来（带上来源）并退出，什么都不写。
 * 输出：src/assets/fonts/<file>.woff2、charset.txt（中文全字表收了哪些字）与 display-charset.txt（展示字表收了哪些字）；
 *   public/fonts/LICENSES.md 与各字体许可原文（随构建复制到 dist/fonts/，OFL 要求分发时附带许可）
 * 每个文件按 HUD_FONT_FILES 的 charset 取字（M12b-54 起是逐文件的字表）：
 *   cjk = src/hud/ 下所有源码里出现的非 ASCII 字符 + CJK_EXTRA + LATIN_CHARS；latin = LATIN_CHARS；
 *   display = 展示角色实际画到的字（scripts/display-chars.ts 扫出来）+ 全角标点保底，去掉 LATIN_CHARS（展示栈里拉丁字族排在前面，拉丁字符轮不到中文展示字体）。
 * 子集先写进临时目录，由 scripts/fonts-rename.py 把字体内部的名字（name 表）改成我们的名字（OFL 不许修改版沿用保留字体名；subset-font 不改名），
 *   改名成功后才搬进 src/assets/fonts/、再写字表与 LICENSES.md——中途失败不会留下半套文件。
 * 界面新增文字后重跑本脚本；check:content 会检查 src/hud/ 里有没有子集外的字、展示角色画到的字是否都在展示字表里，以及总量预算。
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import subsetFont from 'subset-font';
import { CJK_EXTRA, FONT_BUDGET_KB, HUD_FONT_FILES, LATIN_CHARS, licenseFilesOf, type HudFontFile } from '../src/hud/fontList';
import { hudCharSet } from './hud-chars';
import { displayCharset } from './display-chars';

const ROOT = process.cwd();
const SRC = join(ROOT, 'qa', 'fonts-src');
const OUT = join(ROOT, 'src', 'assets', 'fonts');
const LIC = join(ROOT, 'public', 'fonts');
const PYTHON = process.env.PYTHON || 'python';
const RENAME = join(ROOT, 'scripts', 'fonts-rename.py');

/** 画布上可能出现的字（src/hud/ 去掉注释后，sys/ 除外），见 scripts/hud-chars.ts */
export function hudChars(): string {
  return [...hudCharSet(ROOT)].sort().join('');
}

/** 开跑前查齐原料：原始字体、许可原文（qa/fonts-src/ 或 public/fonts/ 有一份即可）、Python + fontTools。返回缺了什么（每条带来源） */
function preflight(): string[] {
  const out: string[] = [];
  const fonts = [...new Map(HUD_FONT_FILES.map((f) => [f.src, f])).values()].filter((f) => !existsSync(join(SRC, f.src)));
  if (fonts.length) {
    out.push('原始字体（放进 qa/fonts-src/，文件名照左边；不随项目分发，从右边的来源下载）：');
    for (const f of fonts) out.push(`  ${f.src} ← ${f.license.name}：${f.license.source}`);
  }
  const lics = [...new Map(HUD_FONT_FILES.flatMap((f) => licenseFilesOf(f.license).map((l) => [l, f.license] as const))).entries()]
    .filter(([l]) => !existsSync(join(SRC, l)) && !existsSync(join(LIC, l)));
  if (lics.length) {
    out.push('许可原文（qa/fonts-src/ 或 public/fonts/ 里有一份即可）：');
    for (const [l, lic] of lics) out.push(`  ${l} ← ${lic.name}：${lic.source}`);
  }
  const py = spawnSync(PYTHON, ['-I', '-c', 'import fontTools, brotli'], { encoding: 'utf8' });
  if (py.error || py.status !== 0) {
    out.push(`Python（改字体内部名字用，scripts/fonts-rename.py）：${PYTHON} ${py.error ? `跑不起来（${py.error.message}）` : '缺 fontTools 或 brotli'}`);
    out.push('  pip install fonttools brotli；python 不在 PATH 上时设环境变量 PYTHON = python 的路径');
  }
  return out;
}

async function main() {
  const missing = preflight();
  if (missing.length) {
    console.error(['fonts-subset：缺少下面这些，没有写任何文件。', ...missing, '只改了界面文字、手头没有原始字体的话，也可以不跑本脚本：在 PR 里说一声，维护者会重新生成。'].join('\n'));
    process.exit(1);
  }
  // 先把两份字表算出来（不写文件）：展示字表把界面按展示字体画一遍收字（M12b-54，scripts/display-chars.ts）；有屏画出错就停，不写一份不完整的字表
  const cjk = [...new Set(hudChars() + CJK_EXTRA + LATIN_CHARS)].join('');
  const disp = displayCharset();
  if (disp.errors.length) throw new Error(`展示用字扫描有 ${disp.errors.length} 屏画出错：${disp.errors.slice(0, 3).join('；')}`);
  const textOf = (f: HudFontFile) => (f.charset === 'cjk' ? cjk : f.charset === 'display' ? disp.text : LATIN_CHARS);

  // 子集写进临时目录 → 改名 → 搬进 src/assets/fonts/
  const tmp = mkdtempSync(join(tmpdir(), 'gae-fonts-'));
  let renameFailed = '';
  try {
    for (const f of HUD_FONT_FILES) {
      const input = readFileSync(join(SRC, f.src));
      const buf = await subsetFont(input, textOf(f), { targetFormat: 'woff2', ...(f.wght ? { variationAxes: { wght: f.wght } } : {}) });
      writeFileSync(join(tmp, f.file), buf);
    }
    const manifest = HUD_FONT_FILES.map((f) => ({ file: f.file, family: f.family, fontName: f.fontName, weight: f.weight }));
    const ren = spawnSync(PYTHON, ['-I', RENAME, '--stdin', '--dir', tmp], { input: JSON.stringify(manifest), stdio: ['pipe', 'inherit', 'inherit'] });
    if (ren.error || ren.status !== 0) renameFailed = ren.error ? `跑不起来：${ren.error.message}` : `退出码 ${ren.status}`;
    else {
      mkdirSync(OUT, { recursive: true });
      for (const f of HUD_FONT_FILES) copyFileSync(join(tmp, f.file), join(OUT, f.file));
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (renameFailed) {
    console.error(`fonts-subset：改字体内部名字失败（${PYTHON} -I scripts/fonts-rename.py ${renameFailed}），没有写任何文件。`);
    process.exit(1);
  }

  let total = 0;
  const rows: string[] = [];
  for (const f of HUD_FONT_FILES) {
    const size = statSync(join(OUT, f.file)).size;
    total += size;
    const cs = f.charset === 'display' ? '展示字表' : f.charset === 'cjk' ? '中文全字表' : '拉丁';
    const reg = `${f.family} ${f.weight}${f.weightRange ? `（注册为 ${f.weightRange[0]}–${f.weightRange[1]}）` : ''}${f.fontName ? `（文件内字族名 ${f.fontName}）` : ''}`;
    rows.push(`| ${f.file} | ${reg} | ${f.license.name} | ${cs} | ${(size / 1024).toFixed(1)} KB | ${f.use} |`);
    console.log(`${f.file.padEnd(28)} ${(size / 1024).toFixed(1).padStart(7)} KB  ${f.charset}`);
  }
  // 字表在字体写好之后再写：字体没生成出来时 check:content 不会拿一份新字表误判为「字都在」
  writeFileSync(join(OUT, 'charset.txt'), cjk);
  writeFileSync(join(OUT, 'display-charset.txt'), disp.text);

  // 许可原文随字体一起放（OFL 要求分发时附带许可）；qa/fonts-src/ 里没有的沿用 public/fonts/ 里已有的那份
  mkdirSync(LIC, { recursive: true });
  for (const lf of new Set(HUD_FONT_FILES.flatMap((f) => licenseFilesOf(f.license)))) if (existsSync(join(SRC, lf))) copyFileSync(join(SRC, lf), join(LIC, lf));
  const lic = [...new Map(HUD_FONT_FILES.map((f) => [f.license.name, f.license])).values()];
  const renamed = [...new Map(HUD_FONT_FILES.filter((f) => f.fontName).map((f) => [f.family, f.fontName])).entries()];
  const md = [
    '# 游戏 UI 样本字体许可登记',
    '',
    '游戏 UI 样本用的字体（构建产物 `assets/gae-*.woff2`，源在 `src/assets/fonts/`）都是 SIL Open Font License 1.1（OFL-1.1）字体的子集（只保留界面用到的字，转成 WOFF2），由 `scripts/fonts-subset.ts` 生成。本项目只分发这些子集，不分发原始字体；要重新生成子集，按下面「原字体与许可」里的来源下载原字体（做法见 CONTRIBUTING.md「改 HUD 文字与字体」）。单文件构建（build:single）把字体内联进 HTML，Godot 导出包也带着用到的子集与许可原文；分发时请附带本目录。',
    'OFL 允许修改（包括子集化）后再分发，条件是附带许可原文、不单独售卖字体，且修改版不能使用原字体的保留字体名（Reserved Font Name）。',
    `子集在网页里一律以我们自己的 family 名（GAE …）注册；子集文件内部的字体名（name 表的字族名、全名、PostScript 名、唯一标识）也由 \`scripts/fonts-rename.py\` 改成了 GAE … 名字，不含保留名（Source、LXGW / 霞鹜、Kreon、Pirata、Almendra、Smiley / 得意黑），也不含别的原字体名${renamed.length ? `（注册名带原字体名的 ${renamed.map(([fam]) => fam).join(' / ')} 在文件里叫 ${renamed.map(([, n]) => n).join(' / ')}；这几款原字体没有保留名）` : ''}；原字体的版权声明（name 表的 nameID 0）原样保留。霞鹜文楷的保留名不出现在子集里，所以 Godot 导出包带上它也不受附加许可「只限网页字体分发」的限制。`,
    '字表：「中文全字表」= 界面里出现的全部中文；「展示字表」= 只收展示角色（标题、名牌、横幅、菜单词、按钮、数字）实际画到的字（站酷快乐体、得意黑只用在展示字体上，正文的中文落到思源黑体）；「拉丁」= 可打印 ASCII 与常用符号。',
    '',
    '| 文件 | 注册名 | 原字体 | 字表 | 大小 | 用途 |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    `合计 ${(total / 1024).toFixed(1)} KB（预算 ${FONT_BUDGET_KB.toLocaleString('en')} KB）；中文全字表 ${[...cjk].length} 个字符（见 src/assets/fonts/charset.txt）；展示字表 ${[...disp.text].length} 个字符，其中汉字 ${disp.cjk} 个（见 src/assets/fonts/display-charset.txt，扫了 ${disp.configs.toLocaleString('en')} 屏）。`,
    '',
    '## 原字体与许可',
    '',
    '原始字体不随本项目分发，需要时从下面的来源下载。',
    '',
    ...lic.map((l) => `- **${l.name}** — ${l.license}；${l.copyright}；来源 ${l.source}；许可原文 ${licenseFilesOf(l).join('、')}`),
    '',
  ].join('\n');
  writeFileSync(join(LIC, 'LICENSES.md'), md);
  console.log(`合计 ${(total / 1024).toFixed(1)} KB（预算 ${FONT_BUDGET_KB.toLocaleString('en')} KB），中文子集 ${[...cjk].length} 字，展示字表 ${[...disp.text].length} 字（汉字 ${disp.cjk}，扫了 ${disp.configs} 屏）`);
  if (total > FONT_BUDGET_KB * 1024) console.warn(`超出预算 ${((total - FONT_BUDGET_KB * 1024) / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error('fonts-subset：', e);
  process.exit(1);
});
