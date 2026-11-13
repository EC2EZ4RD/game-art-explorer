/*
 * 游戏 UI 样本用的自托管字体（docs/ui-hud-plan.md M2）。纯数据：浏览器加载器（fonts.ts）和子集化脚本（scripts/fonts-subset.ts）共用。
 * 全部是 SIL OFL 1.1；原始字体在 qa/fonts-src/（不分发），子集化后的 woff2 在 src/assets/fonts/（随构建打包，单文件构建时内联）。
 * family 一律用我们自己的名字（GAE …），不沿用原字体名；原字体的保留名（Noto 的 "Source"、霞鹜的 "LXGW"、Kreon、Pirata、Almendra、得意黑 / Smiley）都不出现在 family 里。
 * 子集文件内部的字体名（name 表的字族名、全名、PostScript 名、唯一标识）由 scripts/fonts-rename.py 改成 fontName ?? family（fonts-subset.ts 自动调用）；
 * 原字体的版权声明（nameID 0）照原样留着。字体来源见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」。
 */

export interface FontLicense {
  /** 原字体名 */
  name: string;
  license: 'OFL-1.1';
  copyright: string;
  source: string;
  /** 许可原文的文件名（public/fonts/ 下；重跑 fonts-subset 时 qa/fonts-src/ 里有就从那里拷） */
  licenseFile: string;
  /** 同一个字体文件里还带着别的字体的字形时，那些字体的许可原文（随子集一起分发，Godot 导出包里也带上） */
  extraLicenseFiles?: string[];
}

/** 一款字体要随子集分发的全部许可原文 */
export const licenseFilesOf = (l: FontLicense): string[] => [l.licenseFile, ...(l.extraLicenseFiles ?? [])];

export interface HudFontFile {
  /** CSS font-family（皮肤里引用的名字） */
  family: string;
  /**
   * 写进字体文件 name 表的字族名（scripts/fonts-rename.py），不写 = family。
   * family 里带了原字体名的（GAE Rajdhani / Cinzel / VT323：这三款没有保留名，CSS 名在皮肤与测试里引用着，先不改）在文件里换个不带原字体名的名字
   */
  fontName?: string;
  weight: number;
  /** 输出文件名（src/assets/fonts/） */
  file: string;
  /** 原始文件（qa/fonts-src/） */
  src: string;
  /** 可变字体固定到这个字重 */
  wght?: number;
  /**
   * cjk = 收进界面里实际出现的中文；latin = 只要拉丁字符；
   * display = 只收展示用字（M12b-54：标题、名牌、横幅、菜单词、按钮、数字——展示角色实际画到的字，由 scripts/display-chars.ts 扫出来，字表 display-charset.txt）。
   * display 字族只进展示字体栈（theme.ts 的 DISPLAY_STACK），正文字体栈不放它：正文的中文照旧落到后备的黑体 / 宋体，不会半句一种字
   */
  charset: 'cjk' | 'latin' | 'display';
  /**
   * 单字重的展示字体按这个字重范围注册（FontFace 的 weight 描述符写 "400 900"）：要粗体时浏览器直接用这一款，不合成假粗体
   * （Pirata One、站酷快乐体、得意黑本身就是粗重的展示字）；Godot 侧同理不加 embolden
   */
  weightRange?: [number, number];
  license: FontLicense;
  /** 用在哪些皮肤 / 用途 */
  use: string;
}

const NOTO_SANS: FontLicense = { name: 'Noto Sans SC（思源黑体）', license: 'OFL-1.1', copyright: 'Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name \'Source\'', source: 'https://github.com/google/fonts/tree/main/ofl/notosanssc', licenseFile: 'OFL-NotoSansSC.txt' };
const NOTO_SERIF: FontLicense = { name: 'Noto Serif SC（思源宋体）', license: 'OFL-1.1', copyright: 'Copyright 2012 Google Inc. All Rights Reserved.; (c) 2017-2024 Adobe (http://www.adobe.com/)', source: 'https://github.com/google/fonts/tree/main/ofl/notoserifsc', licenseFile: 'OFL-NotoSerifSC.txt' };
const WENKAI: FontLicense = { name: 'LXGW WenKai（霞鹜文楷）v1.522', license: 'OFL-1.1', copyright: 'Copyright 2021-2026 LXGW, with Reserved Font Names \'霞鹜\', \'霞鶩\', \'落霞孤鹜\', \'落霞孤鶩\' and \'LXGW\'; additional permission allows subsetted WOFF2 for web font delivery; Copyright 2020 The Klee Project Authors (https://github.com/fontworks-fonts/Klee)', source: 'https://github.com/lxgw/LxgwWenKai', licenseFile: 'OFL-LXGWWenKai.txt' };
const FUSION: FontLicense = { name: 'Fusion Pixel Font 12px proportional zh_hans 2026.09.25（含 Ark Pixel、Cubic 11、Galmuri 字形）', license: 'OFL-1.1', copyright: 'Copyright (c) 2022, TakWolf (https://takwolf.com); glyphs from Ark Pixel, Cubic 11 and Galmuri (OFL, see OFL-ArkPixel / OFL-Cubic11 / OFL-Galmuri)', source: 'https://github.com/TakWolf/fusion-pixel-font', licenseFile: 'OFL-FusionPixel.txt', extraLicenseFiles: ['OFL-ArkPixel.txt', 'OFL-Cubic11.txt', 'OFL-Galmuri.txt'] };
const GROTESK: FontLicense = { name: 'Space Grotesk', license: 'OFL-1.1', copyright: 'Copyright 2020 The Space Grotesk Project Authors', source: 'https://github.com/google/fonts/tree/main/ofl/spacegrotesk', licenseFile: 'OFL-SpaceGrotesk.txt' };
const RAJDHANI: FontLicense = { name: 'Rajdhani', license: 'OFL-1.1', copyright: 'Copyright (c) 2014, Indian Type Foundry', source: 'https://github.com/google/fonts/tree/main/ofl/rajdhani', licenseFile: 'OFL-Rajdhani.txt' };
const CINZEL: FontLicense = { name: 'Cinzel', license: 'OFL-1.1', copyright: 'Copyright 2020 The Cinzel Project Authors', source: 'https://github.com/google/fonts/tree/main/ofl/cinzel', licenseFile: 'OFL-Cinzel.txt' };
const VT323: FontLicense = { name: 'VT323', license: 'OFL-1.1', copyright: 'Copyright 2011, The VT323 Project Authors', source: 'https://github.com/google/fonts/tree/main/ofl/vt323', licenseFile: 'OFL-VT323.txt' };
// M12b-54 加的字体（字体来源见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」）
const KREON: FontLicense = { name: 'Kreon v2.002（可变字体，取 400 / 700 两档）', license: 'OFL-1.1', copyright: 'Copyright 2018 The Kreon Project Authors (https://github.com/googlefonts/kreon), with Reserved Font Name "Kreon"', source: 'https://github.com/google/fonts/tree/main/ofl/kreon', licenseFile: 'OFL-Kreon.txt' };
const PIRATA: FontLicense = { name: 'Pirata One v1.001', license: 'OFL-1.1', copyright: 'Copyright (c) 2012, Rodrigo Fuenzalida, Nicolas Massi (www.taip.com.ar / abc.taip.com.ar), with Reserved Font Name \'Pirata\'', source: 'https://github.com/google/fonts/tree/main/ofl/pirataone', licenseFile: 'OFL-PirataOne.txt' };
const ALMENDRA: FontLicense = { name: 'Almendra v1.004', license: 'OFL-1.1', copyright: 'Copyright (c) 2011-2012, Ana Sanfelippo (anasanfe@gmail.com), with Reserved Font Name \'Almendra\'', source: 'https://github.com/google/fonts/tree/main/ofl/almendra', licenseFile: 'OFL-Almendra.txt' };
const COMIC_NEUE: FontLicense = { name: 'Comic Neue v2.003', license: 'OFL-1.1', copyright: 'Copyright 2014 The Comic Neue Project Authors (https://github.com/crozynski/comicneue)', source: 'https://github.com/google/fonts/tree/main/ofl/comicneue', licenseFile: 'OFL-ComicNeue.txt' };
const KUAILE: FontLicense = { name: 'ZCOOL KuaiLe（站酷快乐体）v2.001', license: 'OFL-1.1', copyright: 'Copyright 2018 The ZCOOL KuaiLe Project Authors (https://github.com/googlefonts/zcool-kuaile)', source: 'https://github.com/google/fonts/tree/main/ofl/zcoolkuaile', licenseFile: 'OFL-ZCOOLKuaiLe.txt' };
const SMILEY: FontLicense = { name: 'Smiley Sans（得意黑）v2.0.1 Oblique', license: 'OFL-1.1', copyright: 'Copyright (c) 2022--2024, atelierAnchor <https://atelier-anchor.com>, with Reserved Font Name <Smiley> and <得意黑>', source: 'https://github.com/atelier-anchor/smiley-sans', licenseFile: 'OFL-SmileySans.txt' };

export const HUD_FONT_FILES: HudFontFile[] = [
  { family: 'GAE Sans', weight: 400, file: 'gae-sans-400.woff2', src: 'NotoSansSC.ttf', wght: 400, charset: 'cjk', license: NOTO_SANS, use: '默认黑体（扁平、毛玻璃、Y2K、JRPG 等）与各拉丁字体的中文后备' },
  { family: 'GAE Sans', weight: 700, file: 'gae-sans-700.woff2', src: 'NotoSansSC.ttf', wght: 700, charset: 'cjk', license: NOTO_SANS, use: '标题与粗体' },
  { family: 'GAE Serif', weight: 400, file: 'gae-serif-400.woff2', src: 'NotoSerifSC.ttf', wght: 400, charset: 'cjk', license: NOTO_SERIF, use: '羊皮纸等衬线皮肤的中文' },
  { family: 'GAE Serif', weight: 700, file: 'gae-serif-700.woff2', src: 'NotoSerifSC.ttf', wght: 700, charset: 'cjk', license: NOTO_SERIF, use: '衬线标题' },
  { family: 'GAE Kai', weight: 400, file: 'gae-kai-400.woff2', src: 'LXGWWenKai-Regular.ttf', charset: 'cjk', license: WENKAI, use: '手绘笔记本、水墨' },
  { family: 'GAE Pixel', weight: 400, file: 'gae-pixel-400.woff2', src: 'FusionPixel-12px-zh_hans.woff2', charset: 'cjk', license: FUSION, use: '像素位图、终端的中文' },
  { family: 'GAE Grotesk', weight: 400, file: 'gae-grotesk-400.woff2', src: 'SpaceGrotesk.ttf', wght: 400, charset: 'latin', license: GROTESK, use: '新粗野主义、瑞士网格、构成主义、漫画的拉丁字' },
  { family: 'GAE Grotesk', weight: 700, file: 'gae-grotesk-700.woff2', src: 'SpaceGrotesk.ttf', wght: 700, charset: 'latin', license: GROTESK, use: '同上，粗体' },
  { family: 'GAE Rajdhani', fontName: 'GAE Techno', weight: 400, file: 'gae-rajdhani-400.woff2', src: 'Rajdhani-Regular.ttf', charset: 'latin', license: RAJDHANI, use: '科幻 HUD 的拉丁字' },
  { family: 'GAE Rajdhani', fontName: 'GAE Techno', weight: 700, file: 'gae-rajdhani-700.woff2', src: 'Rajdhani-Bold.ttf', charset: 'latin', license: RAJDHANI, use: '同上，粗体' },
  { family: 'GAE Cinzel', fontName: 'GAE Roman', weight: 400, file: 'gae-cinzel-400.woff2', src: 'Cinzel.ttf', wght: 400, charset: 'latin', license: CINZEL, use: '羊皮纸的拉丁字（罗马碑刻体）' },
  { family: 'GAE Cinzel', fontName: 'GAE Roman', weight: 700, file: 'gae-cinzel-700.woff2', src: 'Cinzel.ttf', wght: 700, charset: 'latin', license: CINZEL, use: '同上，粗体' },
  { family: 'GAE VT323', fontName: 'GAE Terminal', weight: 400, file: 'gae-vt323-400.woff2', src: 'VT323-Regular.ttf', charset: 'latin', license: VT323, use: '终端的拉丁字' },
  // M12b-54：板衬线 / 墨线衬线 / 神秘学衬线 / 漫画手写的拉丁字，漫画手写与窄体的中文（只收展示用字）
  { family: 'GAE Slab', weight: 400, file: 'gae-slab-400.woff2', src: 'Kreon.ttf', wght: 400, charset: 'latin', license: KREON, use: '板衬线（slab / slabWestern）的拉丁字：StS 的标题、正文、数字，西部木刻标题' },
  { family: 'GAE Slab', weight: 700, file: 'gae-slab-700.woff2', src: 'Kreon.ttf', wght: 700, charset: 'latin', license: KREON, use: '同上，粗体' },
  { family: 'GAE Inked', weight: 400, file: 'gae-inked-400.woff2', src: 'Almendra-Regular.ttf', charset: 'latin', license: ALMENDRA, use: '墨线窄衬线（inkedSerif）的拉丁字：饥荒；中文用霞鹜文楷' },
  { family: 'GAE Inked', weight: 700, file: 'gae-inked-700.woff2', src: 'Almendra-Bold.ttf', charset: 'latin', license: ALMENDRA, use: '同上，粗体' },
  { family: 'GAE Occult', weight: 400, file: 'gae-occult-400.woff2', src: 'PirataOne-Regular.ttf', charset: 'latin', weightRange: [400, 900], license: PIRATA, use: '神秘学楔形衬线（occultSerif）的拉丁字：Cult of the Lamb 的标题（单字重，粗体不合成）' },
  { family: 'GAE Comic', weight: 400, file: 'gae-comic-400.woff2', src: 'ComicNeue-Regular.ttf', charset: 'latin', license: COMIC_NEUE, use: '漫画手写（comicHand）的拉丁字：Hi-Fi Rush 的台词' },
  { family: 'GAE Comic', weight: 700, file: 'gae-comic-700.woff2', src: 'ComicNeue-Bold.ttf', charset: 'latin', license: COMIC_NEUE, use: '同上，粗体' },
  { family: 'GAE Comic CJK', weight: 400, file: 'gae-comic-cjk-400.woff2', src: 'ZCOOLKuaiLe-Regular.ttf', charset: 'display', weightRange: [400, 900], license: KUAILE, use: '漫画手写的中文（只收展示用字；正文的中文落到黑体）' },
  { family: 'GAE Condensed CJK', weight: 400, file: 'gae-condensed-cjk-400.woff2', src: 'SmileySans-Oblique.ttf', charset: 'display', weightRange: [400, 900], license: SMILEY, use: '窄体（condensed）的中文：CP2077 一类的窄斜体标题（只收展示用字；正文的中文落到黑体）' },
];

/**
 * 每个 GAE 字族实际打包了哪些字重（M12a-33，由上表推出：GAE Sans / Serif / Grotesk / Rajdhani / Cinzel / Slab / Inked / Comic = 400 + 700，Kai / Pixel / VT323 / Occult 与两款中文展示字只有 400）。
 * paint.ts 的 fontString 按它就近取字重，免得要了一档不存在的字重（细体 300）时浏览器各自回退
 */
export const FONT_WEIGHTS: Record<string, number[]> = HUD_FONT_FILES.reduce((m, f) => {
  (m[f.family] ??= []).push(f.weight);
  m[f.family].sort((a, b) => a - b);
  return m;
}, {} as Record<string, number[]>);

/**
 * 字体角色（M12b-54）：typ.body.family / typ.display.family 的取值 → 这个角色自己的字族（family，GAE …）与中文字族（cjk），没有字体文件时明确落到的角色（fallback）。
 * 某个角色的 family 在 HUD_FONT_FILES 里登记了文件，它就生效（theme.ts 的 FONT_STACK 由 roleStack 拼出）；没有文件时 = 别名：画面用 fallback 的字体栈，
 * 参数表的取值标 needs: asset + aliasOf，界面检查（sys/check.ts 的 C-font-alias）与 check-param-vectors 提示「这个字族现在用 X 画」。
 * 以后补一款字体 = 把文件放进 qa/fonts-src/、在 HUD_FONT_FILES 加一行（family 写这里的名字，不要带原字体名）、重跑 scripts/fonts-subset.ts——不用改 theme.ts。
 * 中文字族的文件是 display 字表（只收展示用字）时，它只进展示字体栈（typ.display.family，按钮 / 数字借展示字体时同）；正文选这个角色时中文落到 fallback，C-font-alias 给一条 info。
 * base = 栈尾的系统字体（原来写死在 theme.ts 里的那几串，逐字保留，什么都不设时字体栈不变）
 */
export interface FontRole { family?: string; cjk?: string; fallback?: string; base?: string; label: string }
export const FONT_ROLES: Record<string, FontRole> = {
  sans: { family: 'GAE Sans', base: 'sys', label: 'Noto Sans SC' },
  serif: { family: 'GAE Serif', base: 'serif', label: 'Noto Serif SC' },
  kai: { family: 'GAE Kai', base: 'kai', label: 'LXGW WenKai' },
  pixel: { family: 'GAE Pixel', base: 'sys', label: 'Fusion Pixel' },
  mono: { family: 'GAE VT323', fallback: 'pixel', label: 'VT323' },
  condensed: { family: 'GAE Rajdhani', cjk: 'GAE Condensed CJK', fallback: 'sans', label: 'Rajdhani + Smiley Sans (display) / Noto Sans SC' },
  cinzel: { family: 'GAE Cinzel', fallback: 'serif', label: 'Cinzel' },
  grotesk: { family: 'GAE Grotesk', fallback: 'sans', label: 'Space Grotesk' },
  round: { family: 'GAE Round', fallback: 'sans', label: 'Noto Sans SC (no round font yet)' },
  calligraphy: { family: 'GAE Calligraphy', fallback: 'kai', label: 'LXGW WenKai (calligraphy bitmap for titles)' },
  handwritten: { family: 'GAE Hand', fallback: 'kai', label: 'LXGW WenKai (no hand font yet)' },
  gothic: { family: 'GAE Blackletter', fallback: 'cinzel', label: 'Cinzel (no blackletter yet)' },
  stencil: { family: 'GAE Stencil', fallback: 'grotesk', label: 'Space Grotesk (no stencil yet)' },
  ransom: { family: 'GAE Grotesk', fallback: 'sans', label: 'Space Grotesk (ransom mix)' },
  slabWestern: { family: 'GAE Slab', fallback: 'cinzel', label: 'Kreon + Noto Serif SC' },
  graffiti: { family: 'GAE Graffiti', fallback: 'grotesk', label: 'Space Grotesk (no graffiti yet)' },
  artNouveau: { family: 'GAE Nouveau', fallback: 'cinzel', label: 'Cinzel (no art nouveau yet)' },
  // M12b-54 新字族（字体来源见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」）
  slab: { family: 'GAE Slab', fallback: 'serif', label: 'Kreon + Noto Serif SC' },
  inkedSerif: { family: 'GAE Inked', cjk: 'GAE Kai', fallback: 'serif', label: 'Almendra + LXGW WenKai' },
  occultSerif: { family: 'GAE Occult', fallback: 'cinzel', label: 'Pirata One + Noto Serif SC' },
  comicHand: { family: 'GAE Comic', cjk: 'GAE Comic CJK', fallback: 'sans', label: 'Comic Neue + ZCOOL KuaiLe (display) / Noto Sans SC' },
};
/** 打包了文件的字族 */
export const HAVE_FAMILY = new Set(HUD_FONT_FILES.map((f) => f.family));
/** 只收展示用字的字族（charset = display，M12b-54）：只进展示字体栈 */
export const DISPLAY_ONLY = new Set(HUD_FONT_FILES.filter((f) => f.charset === 'display').map((f) => f.family));
/** 这个角色的中文字族只收展示用字（正文选它时中文落到 fallback） */
export const roleCjkDisplayOnly = (role: string) => { const c = FONT_ROLES[role]?.cjk; return !!c && DISPLAY_ONLY.has(c); };
/** 角色自己的字族（拉丁或中文）有没有文件：都没有 = 别名（画面用 fallback 的字体） */
export const roleHasFont = (role: string) => { const r = FONT_ROLES[role]; return !!r && ((!!r.family && HAVE_FAMILY.has(r.family)) || (!!r.cjk && HAVE_FAMILY.has(r.cjk))); };
/** 别名角色实际落到哪个有字体的角色（检查与参数说明用）；有字体的角色返回自己 */
export function roleResolved(role: string): string {
  let k = role;
  for (let i = 0; i < 6 && FONT_ROLES[k] && !roleHasFont(k) && FONT_ROLES[k].fallback; i++) k = FONT_ROLES[k].fallback!;
  return k;
}

/** 拉丁子集：可打印 ASCII + 常用符号 */
export const LATIN_CHARS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '·–—‘’“”…•°×÷±→←↑↓';
/** 中文子集总会带上的标点与符号（界面文字之外的保底） */
export const CJK_EXTRA = '，。、：；！？“”‘’（）《》【】「」『』—…·￥％＋－×÷～◆●○■□▲△★☆♥♡◇';
/** 展示字表总会带上的全角标点（M12b-54；展示字表的其余字由 scripts/display-chars.ts 扫出来，拉丁字符不收——展示栈里拉丁字族在前）；末尾三个字是漫画拟声字（surface.sfxText 的轰！砰！咚咚，P1b）用的，HUD 文案改了也不能被扫掉 */
export const DISPLAY_EXTRA = '，。、：；！？（）《》【】「」『』～轰砰咚';
/** 字体总量预算（KB，check:content 核对；2026-10-20 用户选「展示字表」方案时定的上限） */
// 2026-10-20 用户决定：M12b 加了展示字体后预算从 1,536 KB（M2 验收标准）放宽到 1,800 KB
export const FONT_BUDGET_KB = 1800;
