# 游戏 UI 样本字体许可登记

游戏 UI 样本用的字体（构建产物 `assets/gae-*.woff2`，源在 `src/assets/fonts/`）都是 SIL Open Font License 1.1（OFL-1.1）字体的子集（只保留界面用到的字，转成 WOFF2），由 `scripts/fonts-subset.ts` 生成。本项目只分发这些子集，不分发原始字体；要重新生成子集，按下面「原字体与许可」里的来源下载原字体（做法见 CONTRIBUTING.md「改 HUD 文字与字体」）。单文件构建（build:single）把字体内联进 HTML，Godot 导出包也带着用到的子集与许可原文；分发时请附带本目录。
OFL 允许修改（包括子集化）后再分发，条件是附带许可原文、不单独售卖字体，且修改版不能使用原字体的保留字体名（Reserved Font Name）。
子集在网页里一律以我们自己的 family 名（GAE …）注册；子集文件内部的字体名（name 表的字族名、全名、PostScript 名、唯一标识）也由 `scripts/fonts-rename.py` 改成了 GAE … 名字，不含保留名（Source、LXGW / 霞鹜、Kreon、Pirata、Almendra、Smiley / 得意黑），也不含别的原字体名（注册名带原字体名的 GAE Rajdhani / GAE Cinzel / GAE VT323 在文件里叫 GAE Techno / GAE Roman / GAE Terminal；这几款原字体没有保留名）；原字体的版权声明（name 表的 nameID 0）原样保留。霞鹜文楷的保留名不出现在子集里，所以 Godot 导出包带上它也不受附加许可「只限网页字体分发」的限制。
字表：「中文全字表」= 界面里出现的全部中文；「展示字表」= 只收展示角色（标题、名牌、横幅、菜单词、按钮、数字）实际画到的字（站酷快乐体、得意黑只用在展示字体上，正文的中文落到思源黑体）；「拉丁」= 可打印 ASCII 与常用符号。

| 文件 | 注册名 | 原字体 | 字表 | 大小 | 用途 |
|---|---|---|---|---|---|
| gae-sans-400.woff2 | GAE Sans 400 | Noto Sans SC（思源黑体） | 中文全字表 | 191.8 KB | 默认黑体（扁平、毛玻璃、Y2K、JRPG 等）与各拉丁字体的中文后备 |
| gae-sans-700.woff2 | GAE Sans 700 | Noto Sans SC（思源黑体） | 中文全字表 | 195.9 KB | 标题与粗体 |
| gae-serif-400.woff2 | GAE Serif 400 | Noto Serif SC（思源宋体） | 中文全字表 | 248.8 KB | 羊皮纸等衬线皮肤的中文 |
| gae-serif-700.woff2 | GAE Serif 700 | Noto Serif SC（思源宋体） | 中文全字表 | 255.5 KB | 衬线标题 |
| gae-kai-400.woff2 | GAE Kai 400 | LXGW WenKai（霞鹜文楷）v1.522 | 中文全字表 | 282.3 KB | 手绘笔记本、水墨 |
| gae-pixel-400.woff2 | GAE Pixel 400 | Fusion Pixel Font 12px proportional zh_hans 2026.09.25（含 Ark Pixel、Cubic 11、Galmuri 字形） | 中文全字表 | 47.1 KB | 像素位图、终端的中文 |
| gae-grotesk-400.woff2 | GAE Grotesk 400 | Space Grotesk | 拉丁 | 10.9 KB | 新粗野主义、瑞士网格、构成主义、漫画的拉丁字 |
| gae-grotesk-700.woff2 | GAE Grotesk 700 | Space Grotesk | 拉丁 | 10.4 KB | 同上，粗体 |
| gae-rajdhani-400.woff2 | GAE Rajdhani 400（文件内字族名 GAE Techno） | Rajdhani | 拉丁 | 8.6 KB | 科幻 HUD 的拉丁字 |
| gae-rajdhani-700.woff2 | GAE Rajdhani 700（文件内字族名 GAE Techno） | Rajdhani | 拉丁 | 9.1 KB | 同上，粗体 |
| gae-cinzel-400.woff2 | GAE Cinzel 400（文件内字族名 GAE Roman） | Cinzel | 拉丁 | 13.5 KB | 羊皮纸的拉丁字（罗马碑刻体） |
| gae-cinzel-700.woff2 | GAE Cinzel 700（文件内字族名 GAE Roman） | Cinzel | 拉丁 | 14.9 KB | 同上，粗体 |
| gae-vt323-400.woff2 | GAE VT323 400（文件内字族名 GAE Terminal） | VT323 | 拉丁 | 12.1 KB | 终端的拉丁字 |
| gae-slab-400.woff2 | GAE Slab 400 | Kreon v2.002（可变字体，取 400 / 700 两档） | 拉丁 | 9.3 KB | 板衬线（slab / slabWestern）的拉丁字：StS 的标题、正文、数字，西部木刻标题 |
| gae-slab-700.woff2 | GAE Slab 700 | Kreon v2.002（可变字体，取 400 / 700 两档） | 拉丁 | 9.3 KB | 同上，粗体 |
| gae-inked-400.woff2 | GAE Inked 400 | Almendra v1.004 | 拉丁 | 7.6 KB | 墨线窄衬线（inkedSerif）的拉丁字：饥荒；中文用霞鹜文楷 |
| gae-inked-700.woff2 | GAE Inked 700 | Almendra v1.004 | 拉丁 | 7.2 KB | 同上，粗体 |
| gae-occult-400.woff2 | GAE Occult 400（注册为 400–900） | Pirata One v1.001 | 拉丁 | 5.1 KB | 神秘学楔形衬线（occultSerif）的拉丁字：Cult of the Lamb 的标题（单字重，粗体不合成） |
| gae-comic-400.woff2 | GAE Comic 400 | Comic Neue v2.003 | 拉丁 | 12.7 KB | 漫画手写（comicHand）的拉丁字：Hi-Fi Rush 的台词 |
| gae-comic-700.woff2 | GAE Comic 700 | Comic Neue v2.003 | 拉丁 | 12.5 KB | 同上，粗体 |
| gae-comic-cjk-400.woff2 | GAE Comic CJK 400（注册为 400–900） | ZCOOL KuaiLe（站酷快乐体）v2.001 | 展示字表 | 91.4 KB | 漫画手写的中文（只收展示用字；正文的中文落到黑体） |
| gae-condensed-cjk-400.woff2 | GAE Condensed CJK 400（注册为 400–900） | Smiley Sans（得意黑）v2.0.1 Oblique | 展示字表 | 110.0 KB | 窄体（condensed）的中文：CP2077 一类的窄斜体标题（只收展示用字；正文的中文落到黑体） |

合计 1566.0 KB（预算 1,800 KB）；中文全字表 1412 个字符（见 src/assets/fonts/charset.txt）；展示字表 886 个字符，其中汉字 849 个（见 src/assets/fonts/display-charset.txt，扫了 18,864 屏）。

## 原字体与许可

原始字体不随本项目分发，需要时从下面的来源下载。

- **Noto Sans SC（思源黑体）** — OFL-1.1；Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'；来源 https://github.com/google/fonts/tree/main/ofl/notosanssc；许可原文 OFL-NotoSansSC.txt
- **Noto Serif SC（思源宋体）** — OFL-1.1；Copyright 2012 Google Inc. All Rights Reserved.; (c) 2017-2024 Adobe (http://www.adobe.com/)；来源 https://github.com/google/fonts/tree/main/ofl/notoserifsc；许可原文 OFL-NotoSerifSC.txt
- **LXGW WenKai（霞鹜文楷）v1.522** — OFL-1.1；Copyright 2021-2026 LXGW, with Reserved Font Names '霞鹜', '霞鶩', '落霞孤鹜', '落霞孤鶩' and 'LXGW'; additional permission allows subsetted WOFF2 for web font delivery; Copyright 2020 The Klee Project Authors (https://github.com/fontworks-fonts/Klee)；来源 https://github.com/lxgw/LxgwWenKai；许可原文 OFL-LXGWWenKai.txt
- **Fusion Pixel Font 12px proportional zh_hans 2026.09.25（含 Ark Pixel、Cubic 11、Galmuri 字形）** — OFL-1.1；Copyright (c) 2022, TakWolf (https://takwolf.com); glyphs from Ark Pixel, Cubic 11 and Galmuri (OFL, see OFL-ArkPixel / OFL-Cubic11 / OFL-Galmuri)；来源 https://github.com/TakWolf/fusion-pixel-font；许可原文 OFL-FusionPixel.txt、OFL-ArkPixel.txt、OFL-Cubic11.txt、OFL-Galmuri.txt
- **Space Grotesk** — OFL-1.1；Copyright 2020 The Space Grotesk Project Authors；来源 https://github.com/google/fonts/tree/main/ofl/spacegrotesk；许可原文 OFL-SpaceGrotesk.txt
- **Rajdhani** — OFL-1.1；Copyright (c) 2014, Indian Type Foundry；来源 https://github.com/google/fonts/tree/main/ofl/rajdhani；许可原文 OFL-Rajdhani.txt
- **Cinzel** — OFL-1.1；Copyright 2020 The Cinzel Project Authors；来源 https://github.com/google/fonts/tree/main/ofl/cinzel；许可原文 OFL-Cinzel.txt
- **VT323** — OFL-1.1；Copyright 2011, The VT323 Project Authors；来源 https://github.com/google/fonts/tree/main/ofl/vt323；许可原文 OFL-VT323.txt
- **Kreon v2.002（可变字体，取 400 / 700 两档）** — OFL-1.1；Copyright 2018 The Kreon Project Authors (https://github.com/googlefonts/kreon), with Reserved Font Name "Kreon"；来源 https://github.com/google/fonts/tree/main/ofl/kreon；许可原文 OFL-Kreon.txt
- **Almendra v1.004** — OFL-1.1；Copyright (c) 2011-2012, Ana Sanfelippo (anasanfe@gmail.com), with Reserved Font Name 'Almendra'；来源 https://github.com/google/fonts/tree/main/ofl/almendra；许可原文 OFL-Almendra.txt
- **Pirata One v1.001** — OFL-1.1；Copyright (c) 2012, Rodrigo Fuenzalida, Nicolas Massi (www.taip.com.ar / abc.taip.com.ar), with Reserved Font Name 'Pirata'；来源 https://github.com/google/fonts/tree/main/ofl/pirataone；许可原文 OFL-PirataOne.txt
- **Comic Neue v2.003** — OFL-1.1；Copyright 2014 The Comic Neue Project Authors (https://github.com/crozynski/comicneue)；来源 https://github.com/google/fonts/tree/main/ofl/comicneue；许可原文 OFL-ComicNeue.txt
- **ZCOOL KuaiLe（站酷快乐体）v2.001** — OFL-1.1；Copyright 2018 The ZCOOL KuaiLe Project Authors (https://github.com/googlefonts/zcool-kuaile)；来源 https://github.com/google/fonts/tree/main/ofl/zcoolkuaile；许可原文 OFL-ZCOOLKuaiLe.txt
- **Smiley Sans（得意黑）v2.0.1 Oblique** — OFL-1.1；Copyright (c) 2022--2024, atelierAnchor <https://atelier-anchor.com>, with Reserved Font Name <Smiley> and <得意黑>；来源 https://github.com/atelier-anchor/smiley-sans；许可原文 OFL-SmileySans.txt
