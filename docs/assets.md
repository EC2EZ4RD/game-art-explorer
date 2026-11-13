# 素材说明

工具的大部分画面都是程序实时算出来的：形状、着色、描边、媒介后处理、色板、游戏 UI 都不需要图片。只有少数效果需要一张"手感"图，比如纸纹、毛笔笔触、皴法、像素角色、纸片人分件、2D 特效序列帧、UI 雕花边框。这些图在 `public/assets/tex/`，共 44 条（22 条是游戏 UI 素材）。

## 来源

| 来源 | 条数 | 说明 |
|---|---|---|
| AI 生成 | 43 | 图像模型 gpt-image-2 生成原图，再用本地脚本整理（见下文） |
| 程序生成 | 1 | 色调排线图 TAM（6 级），由 `scripts/assets/process.py` 直接画出 |

每条素材的来源记在 `src/content/assets.json` 的 `source` 字段：

- AI 生成：`tool` 是模型名（`gpt-image-2`），`params` 是画幅、质量和格式（例如 `1:1，medium 质量，PNG`），另有生成日期 `date` 和提示词 `prompt`。
- 程序生成：`script` 是生成它的脚本。
- 以后加入的自绘图或第三方图片：`service` 写 `manual` 或 `third-party`，另记作者 `author`、原始页面 `url`。

原图（`assets/generated/raw/`）和生成记录（`assets/generated/` 下的 JSON）只在作者本地，`/assets/` 已加入 `.gitignore`。仓库里只有处理后的成品和登记表。

## 许可

`public/assets/tex/` 里的全部图片和同名 `.json` 以 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 发布：可以随意使用、修改、商用，不需要署名。

AI 生成图片在不同法域的版权状态并不统一。作者对这些文件拥有的任何权利都按 CC0 放弃；如果你在商业项目里使用，请自行确认所在地区和所用平台的要求。

## 处理流程

```
assets/generated/raw/<id>.png          原图（只在本地，不入库）
        │  scripts/assets/process.py     纹理：去光照不均、无缝平铺、高度与法线、笔触图集、
        │                                像素精灵表、序列帧、纸片人分件与关节点、剪纸遮罩；TAM 直接画出
        │  scripts/assets/process_ui.py  UI：抠背景、九宫格边框、图标与饰件图集、立绘与背景裁切
        ▼
public/assets/tex/<id>*.png + <id>.json  成品与处理参数（接缝、均值、图集 UV、关节点……）
        │  scripts/assets/register.py    合并 ENTRIES 素材表（标签、用途、提示词、局限）、
        │                                处理参数和本地生成记录（模型、参数、批次）
        ▼
src/content/assets.json                素材登记表：来源（source）、用途（usedBy）、局限（limits）、许可
```

脚本用法（Python 3，处理脚本需要 numpy、Pillow、scipy；`register.py` 只用标准库）：

```bash
python -I scripts/assets/process.py              # 处理全部纹理
```

```bash
python -I scripts/assets/process.py xuan_paper   # 只处理一条
```

```bash
python -I -X utf8 scripts/assets/process_ui.py   # 处理全部 UI 素材，也可以只给一个 id
```

```bash
python -I scripts/assets/register.py             # 重新生成 src/content/assets.json
```

克隆仓库后没有原图，不能重跑处理脚本，但也不需要：成品已经在 `public/assets/tex/`。

`register.py` 可以随时重跑。没有本地生成记录时，它沿用现有 `assets.json` 里的来源、原图路径、批次和许可，只刷新素材表和处理参数，并打印沿用了哪些条目。游戏 UI 素材的标签和提示词也在本地文件里，没有这个文件时 22 条 UI 素材整条沿用，只刷新处理参数。它不会把 AI 生成的素材改标成程序生成；找不到来源的新条目会直接报错，不写文件。

## 清单

| 类别 | 条目 |
|---|---|
| 纸纹 | 宣纸、冷压水彩纸、热压水彩纸、牛皮纸、绢本 |
| 笔触与皴法 | 毛笔长笔触 8 种、短笔点 16 种；披麻皴、斧劈皴、米点皴 |
| 材质细节 | 黏土指纹、针织（平针）、剥落做旧遮罩 |
| 角色 | 像素角色 A（SNES 16 色）、像素角色 B（HD-2D 细明暗）、纸片人分件（10 件） |
| 剪纸 | 窗花（团花）、冰裂梅花剪纸（可平铺） |
| 2D 特效 | 烟雾、爆炸、刀光，各 8 帧 |
| 排线 | 色调排线图 TAM（6 级，程序生成） |
| 游戏 UI | 雕花九宫格（金 / 青铜 / 石）、平框（木 / 皮革）、角花与宝石饰件、缎带、手绘与 3D 图标、立绘（二次元 / 厚涂 / 半身与 Q 版）、主视觉海报、风景插画背景、叙事容器（书桌 / 线索墙 / 柜台）、徽章、空状态插画、羊皮纸地图、书法标题字 |

每条素材被哪些参数用到、有哪些已知局限，见 `src/content/assets.json` 的 `usedBy` 和 `limits`。

## 新增素材

素材要以 CC0 发布：自己画的、自己生成的，或者原本就是 CC0 的图片。

1. 把原图放到 `assets/generated/raw/<id>.png`（只在本地，不入库）。
2. 在 `scripts/assets/process.py`（纹理）或 `scripts/assets/process_ui.py`（UI）的 `RECIPES` 表里加一条处理步骤，运行后得到 `public/assets/tex/<id>*.png` 和 `<id>.json`。
3. 在 `scripts/assets/register.py` 的 `ENTRIES` 表里加一条：标签 `label`、类别 `kind`、用到它的参数 `usedBy`、处理说明 `process`、局限 `limits`。来源这样写：
   - 自己画的图：`source=dict(service="manual", author="作者", date="2026-11-06")`，再写 `license="作者自绘，随本项目以 CC0 1.0 发布"`。
   - 第三方图片：`source=dict(service="third-party", author="原作者", url="原始页面", date="取得日期")`，`license` 写原图的许可。
   - 没有本地生成记录的 AI 生成图：`source=dict(service="ai", tool="公开模型名", params="画幅，质量，格式", date="生成日期")`，提示词写在条目的 `prompt` 里，再写 `license`。
   - 本地生成记录里有的 AI 生成图：不写 `source`，只写提示词 `prompt`，模型、参数和批次从生成记录里取。

   `ENTRIES` 上方的注释里有完整示例。
4. 运行 `python -I scripts/assets/register.py`，再运行 `npm run check:content`，输出应以"没有发现问题"结尾。
5. 在需要它的参数里引用素材 id，例如 `src/content/assets.ts` 的 `PAPER_ASSET`。Godot 迁移包带哪些纹理，由 `src/export/godot.ts` 的 `assetTextures` 决定（游戏 UI 素材见 `src/export/godotHud.ts`），新素材要确认在那里能被带上。
