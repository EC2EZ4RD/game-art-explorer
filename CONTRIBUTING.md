# 参与贡献

欢迎补充风格、参数、场景、配方、色板、案例拆解和 UI 内容，也欢迎修 bug 和改进文档。

## 开始之前

- 需要 Node.js 20.19+ 或 22.12+。`npm install` 之后 `npm run dev` 打开 http://localhost:5188 。
- 界面文字和大部分文档是中文。提交说明、issue 和 PR 用中文或英文都可以。
- 改动较大（新维度、新的渲染管线阶段、界面结构调整）时，先开一个 issue 说明想法，避免做完才发现方向不合。
- 代码注释和文档里偶尔会提到 `docs/m12a-progress.md`、`docs/m12b-progress.md`、`docs/redesign/`、`docs/legacy-hud/`、`docs/tech/track-*.md`、`docs/tech/review.md`、`docs/asset-plan.md`、`docs/ui-m11-asset-list.md` 等文件，它们是开发过程中的进度记录和台账，没有随仓库发布。设计结论已经整理进 `docs/workbench-redesign.md`、`docs/ui-hud-plan.md`、`docs/tech/summary.md` 和 `docs/assets.md`。

## 提交前请运行

```bash
npm run typecheck
```

```bash
npm run check:content
```

```bash
npm test
```

```bash
npm run build
```

CI 会跑同样的四步。改了着色器或 Godot 导出、而且本机装有 Godot 4 时，再跑一次 `npm run check:godot`（见 README 的 Godot 一节）。

视觉改动请在 PR 里附前后对比截图。

## 内容约定

- **数据驱动**：参数、选项、配方、风格、场景、色板、皮肤都是数据条目。尽量加条目，而不是在引擎里写特例。README 的"扩展"一节列了每类内容放在哪里。
- **每个参数写清楚**：白话说明、两端效果、在画面哪里看、术语（中 / 英）、生效条件（`activeWhen`）、Godot 迁移说明（`port.godot`）。`check:content` 会拦下缺白话说明的参数，并统计还没写 Godot 迁移说明的参数个数；其余各项请自查。
- **说清能力边界**：做不到或只做到一部分的，写进配方的"缺口"或风格的 `needs`，不要假装已实现。
- **界面文案**：用平实的中文短句，避免内部代号和实现细节；术语第一次出现时给白话解释。
- **Godot 可迁移**：着色器尽量只用 GLSL 与 Godot 着色语言都有的写法，不依赖 three.js 专有的 shader chunk。只在网页上能做到的效果要明确标出。

## 改 HUD 文字与字体

游戏 UI 样本的字体是子集，只收界面用到的字，放在 `src/assets/fonts/`。在 `src/hud/` 里加了新的中文后，`npm run check:content` 可能报「…个字不在字体子集里」或「…不在展示字表里」。有两种做法：

- **交给维护者**：在 PR 里说一声，维护者会重新生成字体子集，你不用下载字体。
- **自己生成**：
  1. 安装 Python 3 和 fontTools：`pip install fonttools brotli`。脚本用 `python -I` 运行，不读用户目录里的包（`pip install --user` 装的不算），请装进系统 Python 或虚拟环境；python 不在 PATH 上时，把环境变量 `PYTHON` 设成它的路径。
  2. 按下表下载原始字体，用左列的文件名放进 `qa/fonts-src/`。这个目录不提交，原始字体不随项目分发。
  3. 运行 `npx tsx scripts/fonts-subset.ts`。脚本先检查原料，缺文件就列出来并退出，不改任何文件。跑完会更新 `src/assets/fonts/` 下的 woff2 和字表、`public/fonts/LICENSES.md`，并用 `scripts/fonts-rename.py` 把字体内部的名字改成 GAE …（OFL 要求修改版不用原字体的保留名）。
  4. 再跑一次 `npm run check:content`，把 `src/assets/fonts/` 和 `public/fonts/LICENSES.md` 的改动一起提交。

| 放进 qa/fonts-src/ 的文件名 | 原字体与版本 | 下载 |
|---|---|---|
| NotoSansSC.ttf | 思源黑体 Noto Sans SC 2.004（可变字体） | google/fonts 的 `ofl/notosanssc/NotoSansSC[wght].ttf` |
| NotoSerifSC.ttf | 思源宋体 Noto Serif SC 2.003（可变字体） | google/fonts 的 `ofl/notoserifsc/NotoSerifSC[wght].ttf` |
| LXGWWenKai-Regular.ttf | 霞鹜文楷 v1.522 | https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522 |
| FusionPixel-12px-zh_hans.woff2 | Fusion Pixel 12px proportional 2026.09.25 | https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.09.25 的 12px proportional woff2 包，取 `fusion-pixel-12px-proportional-zh_hans.ttf.woff2` |
| SpaceGrotesk.ttf | Space Grotesk 2.000（可变字体） | google/fonts 的 `ofl/spacegrotesk/SpaceGrotesk[wght].ttf` |
| Rajdhani-Regular.ttf、Rajdhani-Bold.ttf | Rajdhani 1.201 | google/fonts 的 `ofl/rajdhani/` |
| Cinzel.ttf | Cinzel 2.000（可变字体） | google/fonts 的 `ofl/cinzel/Cinzel[wght].ttf` |
| VT323-Regular.ttf | VT323 2.000 | google/fonts 的 `ofl/vt323/` |
| Kreon.ttf | Kreon 2.002（可变字体） | google/fonts 的 `ofl/kreon/Kreon[wght].ttf` |
| Almendra-Regular.ttf、Almendra-Bold.ttf | Almendra 1.004 | google/fonts 的 `ofl/almendra/` |
| PirataOne-Regular.ttf | Pirata One 1.001 | google/fonts 的 `ofl/pirataone/` |
| ComicNeue-Regular.ttf、ComicNeue-Bold.ttf | Comic Neue 2.003 | google/fonts 的 `ofl/comicneue/` |
| ZCOOLKuaiLe-Regular.ttf | 站酷快乐体 2.001 | google/fonts 的 `ofl/zcoolkuaile/` |
| SmileySans-Oblique.ttf | 得意黑 v2.0.1 | https://github.com/atelier-anchor/smiley-sans/releases/tag/v2.0.1 的 `smiley-sans-v2.0.1.zip`，取其中的 ttf |

google/fonts 指 https://github.com/google/fonts/tree/main 。版本不同也能用，但子集会和仓库里的略有差别，请在 PR 里写明。

许可原文 `public/fonts/OFL-*.txt` 已经在仓库里，不用另外下载。Fusion Pixel 合并了 Ark Pixel、Cubic 11、Galmuri 的字形，这三款的许可原文是 `OFL-ArkPixel.txt`、`OFL-Cubic11.txt`、`OFL-Galmuri.txt`。

新增字体时，在 `src/hud/fontList.ts` 的 `HUD_FONT_FILES` 加一行（family 用 GAE … 名字，不要带原字体名），把许可原文放进 `public/fonts/`，再按上面的步骤生成。`public/fonts/LICENSES.md` 由脚本生成，不要手改。

## 版权与素材

- **不要提交第三方截图或图片。** 游戏截图和 UI 参考图只放在本地（`public/cases/`、`qa/`，已加入 `.gitignore`），仓库里只保存元数据：名称、链接、标签、你自己写的观察。
- 引用文章、书籍或演讲时只做概括，附上链接；不要大段复制原文。
- 新增素材请用 CC0 或同等宽松许可的图片，或者你自己画、自己生成并愿意以 CC0 发布的图片。在 `scripts/assets/register.py` 的 `ENTRIES` 表里登记来源与许可（`source` / `license`），再运行 `python -I scripts/assets/register.py` 重新生成 `src/content/assets.json`（这个文件不要手改，步骤见 [docs/assets.md](docs/assets.md)）。
- 新增字体只能用 OFL 等允许子集化再分发的字体，许可原文放进 `public/fonts/`，在 `src/hud/fontList.ts` 的 `HUD_FONT_FILES` 登记（`public/fonts/LICENSES.md` 由 `scripts/fonts-subset.ts` 生成，见下面「改 HUD 文字与字体」）。
- 新增 npm 依赖请选宽松许可（MIT / BSD / ISC / Apache-2.0），并更新 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

提交即表示你同意贡献内容按 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) §1 的表发布：代码文件（包括写在 `.ts` 里的参数、配方、风格、色板等数据条目）用 MIT；`docs/` 与 `src/content/` 下的 JSON 和说明文档用 CC BY 4.0；`public/assets/tex/` 的素材和工具渲染的图用 CC0 1.0。

## 报告问题

请写清：浏览器与显卡、复现步骤（选了哪个场景、配方、皮肤）、看到了什么、期望看到什么。画面问题最好附截图，并附「导出 → 参数 JSON」。
