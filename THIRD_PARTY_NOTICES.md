# 第三方声明与内容来源

本文件说明仓库里各部分内容的许可、第三方组件，以及调研数据从哪里来、能怎么用。

*English summary: Code is MIT (see `LICENSE`). Docs and research data are CC BY 4.0. The textures in `public/assets/tex/` and the tool's own renders (`public/thumbs/`, `public/swatches/`, `docs/images/`) are CC0 1.0. Font subsets are OFL-1.1 (see `public/fonts/LICENSES.md`). The Riso ink colour values are MIT-licensed third-party data, see §4; other third-party colour values are included as factual data, and CC BY 4.0 covers only our own compilation and notes. Game screenshots and UI reference images are **not** included; only metadata (names, store links, tags, our own notes) is published. Game titles and trademarks belong to their owners.*

## 1. 本项目各部分的许可

| 内容 | 位置 | 许可 |
|---|---|---|
| 代码（含写在代码文件里的文字，如内容包的示例文案） | `src/`、`scripts/` 下的 `.ts` `.tsx` `.css` `.mjs` `.py`，`index.html`、配置文件，以及生成的字表 `src/assets/fonts/*.txt` | MIT（见 [`LICENSE`](LICENSE)） |
| 文档与调研数据 | `docs/`（`docs/images/` 除外）、仓库根目录与 `src/dev/` 下的 `.md`、`src/content/` 下的 `.json` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，Riso 油墨色板除外（见 §4） |
| AI 生成与程序生成的纹理、精灵 | `public/assets/tex/` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)（见 [`docs/assets.md`](docs/assets.md)） |
| 工具自己渲染的缩略图、色票与说明图 | `public/thumbs/`、`public/swatches/`、`docs/images/` | CC0 1.0 |
| 字体子集 | `src/assets/fonts/*.woff2`（许可原文在 `public/fonts/`） | SIL OFL 1.1 |

## 2. npm 依赖

运行时（会打包进网页）：

| 包 | 版本 | 许可 |
|---|---|---|
| three | 0.186.1 | MIT |
| three-mesh-bvh | 0.9.16 | MIT |
| react / react-dom | 19.3.0 | MIT |
| scheduler（react-dom 的依赖） | 0.28.0 | MIT |
| zustand | 5.0.15 | MIT |
| simplex-noise | 4.0.3 | MIT |
| delaunator | 5.1.0 | ISC |
| robust-predicates（delaunator 的依赖） | 3.0.3 | Unlicense |
| fflate | 0.8.3 | MIT |
| idb-keyval | 6.3.0 | Apache-2.0 |

`npm run build` 会把这些包的许可原文汇总到构建产物里的 `third-party-licenses.md`，并把 `LICENSE` 和本文件一起复制进 `dist/`，随网页发布。单文件构建（`npm run build:single`）不生成这些文件，分发单文件版时请附带 `npm run build` 生成的 `dist/third-party-licenses.md`、本文件和 `public/fonts/`。

开发工具（不进构建产物）：vite、@vitejs/plugin-react、vite-plugin-singlefile、tsx、@types/*（MIT），typescript（Apache-2.0），subset-font（BSD-3-Clause）；重新生成字体子集时还用到 Python 的 fontTools 与 brotli（MIT，见 `scripts/fonts-rename.py`）。各包的许可原文随 `npm install` 安装在 `node_modules/<包名>/` 下。

## 3. 字体

游戏 UI 样本用的 22 个 WOFF2 文件都是 OFL-1.1 字体的子集，原字体是：

- 中文：思源黑体（Noto Sans SC）、思源宋体（Noto Serif SC）、霞鹜文楷、站酷快乐体、得意黑
- 像素：Fusion Pixel（含 Ark Pixel、Cubic 11、Galmuri 字形）
- 拉丁：Space Grotesk、Rajdhani、Cinzel、VT323、Kreon、Almendra、Pirata One、Comic Neue

子集是修改版，所以按 OFL 的要求改了名：字体文件内部的名字和网页里注册的名字都是 "GAE …"，不使用原字体的保留字体名（网页里注册为 GAE Rajdhani / GAE Cinzel / GAE VT323 的三款，文件内部叫 GAE Techno / GAE Roman / GAE Terminal）。逐个字体的版权行、来源与许可原文见 [`public/fonts/LICENSES.md`](public/fonts/LICENSES.md) 和同目录的 `OFL-*.txt`。分发构建产物时请附带 `public/fonts/` 目录，尤其是把字体内联进 HTML 的单文件构建。

## 4. 色板

色值来自公开来源，逐条出处写在 [`docs/survey/05-palettes.md`](docs/survey/05-palettes.md) 和 `docs/survey/data/palettes.json`（`src/content/palettes.survey.json` 是它的副本）。要点：

- **中国传统色**：来自中国色 zhongguose.com 的公开接口（526 个原始色，排除用户共创色）。站点没有注明出处，色值只是该来源的近似，不代表"唯一正确"的传统色。
- **日本传统色**：NIPPON COLORS（nipponcolors.com），站点注明引自《日本の伝統色》（PIE BOOKS, 2007）。
- **复古主机、像素调色板**：Lospec Palette List。硬件调色板（NES、C64、Apple II、CGA 等）本来就没有唯一的官方 RGB。
- **Obra Dinn 1-bit、Bauhaus、De Stijl、Memphis**：社区转录或按常见用法整理，记为近似值、未核实。
- **Riso 油墨**（色板 id `riso-inks-stencil`，以及从中挑出 9 色组成的 `riso-zine-core`）：stencil.wiki 的汇总，取自 [mattdesl/riso-colors](https://github.com/mattdesl/riso-colors)（2019-02-25 快照）。hex 是社区按 Pantone 换算的屏幕近似值。这些色值沿用原仓库的 MIT 许可，不改为 CC BY 4.0，许可声明如下。`src/content/palettes.ts` 里手写的 `riso`（孔版专色）色板也取用了其中 7 个油墨色。
- 调研时看过但**没有采用**的来源（如 nevertoday/zhongguo-traditional-colors，其许可说法前后不一致）只在调研文档里提到，没有并入数据。
- 第三方色值按原样作为事实数据收录，各色板的作者与出处写在 `source` 字段里。本项目的 CC BY 4.0 只覆盖我们自己的整理、分组与说明，不对这些色值主张权利。

> **riso-colors** — The MIT License (MIT)
>
> Copyright (c) 2017 Matt DesLauriers
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 5. 游戏案例与 UI 参考

- **不包含任何游戏截图或 UI 参考图。** 本地开发时，`scripts/cases/` 的脚本可以把 Steam 商店截图下载到 `public/cases/`。这个目录和 `qa/` 都已加入 `.gitignore`，生产构建也不会复制它们。截图只供本地学习参考，请不要再分发。
- GameUI：只用公开接口收集元数据（robots.txt 允许）；它的用户协议禁止复制、传播站内作品，所以当时下载到本地对照的缩略图和下载脚本都不发布。Interface In Game：条款禁止爬取，只用它公开给搜索引擎的 sitemap 取名单；另在浏览器里逐页人工挑过 68 张图供本地对照，同样不发布。仓库里只有作者整理的元数据与笔记。
- 仓库里发布的只是元数据：游戏名、开发商与发行商、Steam appid 和商店链接、Steam 标签、获奖记录、榜单快照、相似推荐关系，以及作者自己写的视觉拆解与 UI 参数标注。
- 数据来源：
  - Steam 商店公开接口：appdetails、IStoreBrowseService、storesearch、榜单页
  - SteamPeek（steampeek.hu）的相似推荐
  - 维基百科上的 IGF / BAFTA / The Game Awards 获奖名单
  - gameui.net 与 Interface In Game（interfaceingame.com）的公开目录信息

  各条记录在 `sources` 字段里写有链接与核对日期。
- 用户评测只统计计数与归类（`docs/survey/data/ui-review-stats.json`），不保存评测原文。
- 视觉拆解、风格判断与参数近似是作者看图后的个人观察，可能有误，不代表游戏开发者的官方说法。
- "名作复刻"里的 HUD 是用本工具的通用元素重新搭的近似布局，用于学习界面结构，不含原作的图片、图标或字体。

## 6. 商标

文中提到的游戏名、工作室名、平台名（包括 Steam、Godot、Unity 等）及其标识归各自权利人所有。本项目与这些权利人没有隶属或合作关系，提到它们只是为了说明和对照。

## 7. 引用的外部知识

调研文档引用了大量公开资料（博物馆藏品页、技术文章、引擎文档、演讲、论文），出处以链接形式写在各篇文档的参考列表里。文档只做概括与转述，不大段复制原文；如果你发现某处引用不当，请提 issue，我们会尽快修改。
