# 案例数据流程：从调研表到本地案例库

**本次运行：** 2026-10-13（UTC 10:27–10:46），美区（`cc=US`），Node 25，未加任何 npm 依赖。

**结论：**
- 调研文档第三节写的是"222 条"，但表格里实际有 **361 行**。把 "Bastion / Transistor / Pyre" 拆成 3 条后是 363 条候选；Eastward（I、K 两组）和尼山萨满（H、Q 两组）跨组重复，合并后是 **361 个案例**。
- 核验结果（按 361 个案例计）：**已核验 340 个，已改正 1 个，没找到 1 个，不在 Steam 上 19 个**。
- 调研表里的数字 appid 全部和 Steam 名称对得上，没有发现填错的。4 个标了 (SP) 的也都确认了。
- 唯一改正的是 RPG Time: The Legend of Wright：调研表写的是"待核验"，按名称搜索确认为 **1839510**。
- 没找到的是 Mars After Midnight：它是 Playdate 掌机游戏，Steam 上搜不到。
- 为 341 个 Steam 游戏下载了截图，共 **2,118 个文件，296.9 MiB（311,334,491 字节，约 311 MB）**，没有下载失败的文件。
  - 每个游戏都有头图、4 张缩略图和 1 张原图 f1。
  - 第二张原图 f2 受总量预算限制，只下载了 72 个，全部是有奖项依据的游戏。

---

## 一、怎么重新运行

在项目根目录运行。各步骤可以单独跑，也可以一次跑完：

```bash
node scripts/cases/run-all.mjs                      # 全流程，约 15–20 分钟
node scripts/cases/run-all.mjs --skip=charts,steampeek
node scripts/cases/download.mjs --budget-mb=295     # 只重跑下载（可续跑）
```

| 步骤 | 脚本 | 输入 → 输出 | 用到的接口 | 耗时 |
|---|---|---|---|---|
| 1 解析调研表 | `candidates.mjs` | `docs/survey/03-cases-and-sources.md` → `src/content/cases/candidates.json`、`awards.json` | 无 | 秒级 |
| 2 核验 appid | `verify.mjs` | candidates → `src/content/cases/verify.json`、`scripts/cases/cache/getitems.json` | GetItems（50 个一批，schinese 和 english 各查一次）、GetTagList、storesearch | 约 1 分钟 |
| 3 截图地址 | `screens.mjs` | verify → `scripts/cases/cache/screens.json` | appdetails（`l=schinese`，一次一个，间隔 1.5 秒）；GetItems 兜底 | 约 15 分钟 |
| 4 下载截图 | `download.mjs` | screens → `public/cases/<appid>/*.jpg`、`provenance.json`、`cache/download-report.json` | Steam CDN `shared.akamai.steamstatic.com` | 约 5 分钟 |
| 5 榜单快照 | `charts.mjs` | → `src/content/cases/charts.json` | `search/results`（`infinite=1`）、GetItems | 约 20 秒 |
| 6 SteamPeek | `steampeek.mjs` | → `src/content/cases/steampeek.json` | `steampeek.hu/?appid=` | 约 1 分钟 |
| 7 汇总 | `assemble.mjs` | 以上全部 → `src/content/cases/cases.json` | 无 | 秒级 |

公共工具在 `scripts/cases/lib.mjs`，包括路径、重试退避、名称归一化和名称匹配。

**礼貌请求和续跑：**
- 请求之间都有间隔：GetItems 1.2 秒，storesearch 1.2 秒，appdetails 1.5 秒，SteamPeek 2.5 秒。
- 遇到 429、403 或 5xx 时按指数退避重试，并遵守 `Retry-After`。appdetails 的退避从 10 秒起步。
- `screens.mjs` 已经拿到的 appid 不会重复请求；加 `--refresh` 才会全部重抓。
- 另一个项目 `market_research/raw/<appid>/details_us.json` 里有的 appdetails 原始响应，直接只读复用。本次复用了 14 个。
- `download.mjs` 跳过已存在的文件。下载时先写 `.part` 临时文件，完成后再改名，中断后可以接着跑。

**下载分三轮，用来控制总量：**
1. 全部游戏的 `header.jpg` 和 `t1`–`t4`。
2. 全部游戏的 `f1`，用截图 0 的原图。
3. `f2`，用截图 2 的原图；没有截图 2 就用截图 1。调研"入选依据"里有 IGF/BAFTA/TGA 的游戏优先。

累计大小加上一张原图的预估值（650 KB）超过预算时，就停止下载原图。默认预算是 295 MiB，可以用 `--budget-mb=` 改；`--phases=1,2,3` 可以只跑其中几轮。

---

## 二、产出文件

| 文件 | 内容 |
|---|---|
| `src/content/cases/cases.json` | **主数据。** `{ meta, cases[] }`，每个案例一条，见下文字段表。约 0.9 MB |
| `src/content/cases/candidates.json` | 调研表逐行原文：名称、appid 列原文、组、平台、开发者、美术特征、依据、来源和解析出的 URL |
| `src/content/cases/awards.json` | 三大奖项表解析结果，共 307 条：IGF 155 条（含 2007–2014 年的获奖作品），BAFTA 96 条，TGA 56 条 |
| `src/content/cases/verify.json` | 每条候选的核验结果和方法，以及 storesearch 的搜索日志 |
| `src/content/cases/charts.json` | 热销榜和热门愿望单，各取过滤后的前 100，附带被过滤掉的硬件和 DLC |
| `src/content/cases/steampeek.json` | 12 个种子游戏各自第一页的 36 个相似游戏 |
| `public/cases/<appid>/` | `header.jpg`、`t1–t4.jpg`、`f1.jpg`、`f2.jpg`（部分游戏有）、`provenance.json` |
| `scripts/cases/cache/` | 中间缓存：GetItems 原始条目、截图地址表、下载报告、奖项未匹配列表 |

**`cases.json` 每条记录的字段：**

| 字段 | 说明 |
|---|---|
| `id` | slug，例如 `hades`。只有中文名的条目用人工拼音，例如 `jiangnan-baijingtu` |
| `name` / `nameZh` | 调研表里的名称 / Steam 简体中文名（和英文名相同时为 null） |
| `appid` | 只有核验通过（verified 或 corrected）才有值，否则为 null |
| `platform`、`developers`、`developersSurvey`、`publishers` | Steam 案例的开发商和发行商取自 GetItems；`developersSurvey` 保留调研原文 |
| `group`、`groupTitle`、`alsoInGroups[]` | 主分组和其他分组 |
| `artFeature` | 调研表里的美术特征原文 |
| `evidence.awards[]` | `{award, awardKey, year, result: winner/nominee/honorable, listedAs, source, note?, yearLabel?}` |
| `evidence.charts[]` | `{list, label, rank, steamRank, region, fetchedAt}`，来自本次榜单快照 |
| `evidence.steampeek[]` | 这个游戏出现在哪些种子的相似列表里，存种子 appid。`steampeekDetail` 里有排名、RS 和评分 |
| `evidence.other[]` | 调研表"入选依据"按分号拆开的原文 |
| `sources[]`、`sourcesPending` | 来源链接；没有任何链接时 `sourcesPending` 为 true |
| `verifyStatus`、`verifiedAt`、`verifyNote`、`surveyAppid` | 核验结果 |
| `steam` | `{name, nameZh, type, releaseDate, comingSoon}` |
| `images` | `{header, thumbs[], full[], provenance}`，都是相对路径（如 `cases/1145360/t1.jpg`），只列出实际存在的文件 |
| `steamTags` / `steamTagsEn` | GetItems 返回的前 20 个标签，按权重排序，中英文各一份 |

**`provenance.json` 的内容：** appid、Steam 名称、`sourcePage`（商店页）、截图列表的来源（appdetails、复用或 GetItems）、每个文件的原始 URL（保留 `?t=` 参数）、类型、截图序号、字节数和 `fetchedAt`。另外有两个固定字段：
- `imageType`："Steam 商店截图（未逐张核验是否为宣传合成图）"
- `usage`："本地学习参考，不再分发"

---

## 三、本次结果

### 3.1 核验

| 状态 | 案例数 | 说明 |
|---|---|---|
| verified（已核验） | 340 | GetItems 返回成功，而且名称能对上（调研名的词至少 75% 出现在 Steam 名里；纯中文名按汉字比较）。4 条 (SP) 另外用 storesearch 交叉确认过 |
| corrected（已改正） | 1 | RPG Time: The Legend of Wright：调研表为"待核验"，storesearch 精确匹配到 1839510 |
| not-found（没找到） | 1 | Mars After Midnight：storesearch 没有结果（它是 Playdate 游戏） |
| non-steam（不在 Steam） | 19 | 调研表标了"—"。保留条目，只放来源链接，不下载任何图片 |

**名称写法和 Steam 不同，但已确认是同一作品的条目**（这里只列部分）：
- Ghost of Tsushima DC → DIRECTOR'S CUT
- Ori and the Blind Forest DE → Definitive Edition
- CONTROL → Ultimate Edition
- Disco Elysium → The Final Cut
- The Scroll of Taiwu → Steam 现名 "The Scroll of Taiwu : Beyond The Dome"
- 匠木 → Mortise & Tenon
- 饿殍：明末千里行 → The Hungry Lamb

**类型：** Master Of Pottery – Suzhou Garden 在 Steam 上是 DLC（type 4），其余都是游戏（type 0）。

**还没发售的 10 个：** Persona 4 Revival、Phantom Blade Zero、Witchbrook 等。它们的 `releaseDate` 是 Steam 的预定日期，有 4 个为空。

**调研表里开发者写"待核验"的，已经用 Steam 数据补上：**
- Aniimo → Pawprint Studio
- 山河旅探、饿殍、匠木、Emberville、Hela、Grave Seasons、The Bustling World，详见 `developers` 字段

### 3.2 奖项交叉引用

**匹配规则：**
1. 奖项表里的名称和案例名做归一化后精确匹配：忽略大小写、标点、变音符号和 ™®，罗马数字转成阿拉伯数字。
2. 精确匹配不上时，做词边界前缀匹配，只有唯一命中才采用。
3. 简称和版本差异用 `assemble.mjs` 里的 `AWARD_ALIASES` 人工表处理。

**匹配结果：** 307 条奖项记录中，精确匹配 143 条，人工别名 20 条，前缀匹配 4 条（Kena 两条、Chicory、AER），有歧义的 0 条。共有 **130 个案例**带奖项证据，其中 **35 个**是获奖作品。另外 140 条奖项记录对应的作品不在候选表里，列表见 `cache/crossref-unmatched.json`。

**需要注意的匹配：** 下面这些奖项颁给的是原版、续作或 DLC，挂到了相近的案例上，记录里都有 `note` 说明。
- Kingdom（IGF16）→ Kingdom Two Crowns
- SLUDGE LIFE 2（IGF24）→ SLUDGE LIFE
- TLOU（BAFTA13）→ The Last of Us Part I（2022 重制版）
- Ni no Kuni（BAFTA13）→ Ni no Kuni Remastered
- Persona 5（TGA17）→ Persona 5 Royal
- Elden Ring: Shadow of the Erdtree（TGA24）→ ELDEN RING
- Death Stranding、Ghost of Tsushima、Dear Esther、Ori and the Blind Forest → 对应的导演剪辑版、Landmark 版或决定版
- "Hellblade"（BAFTA17）用前缀匹配会同时命中两部作品，所以用人工表指定为 Hellblade: Senua's Sacrifice

**和调研文字对不上的地方**（记在 `meta.evidenceCheck`，数据没有改）：
- Hellblade: Senua's Sacrifice：调研写了"TGA17 提名"，但第二节的 TGA 2017 最佳美术指导名单里没有它。**疑似调研笔误**。
- Outer Wilds 的"IGF15 大奖"、Dispatch 的"TGA25 最佳首作独立游戏提名"不是美术类奖项，所以不在三张奖项表里，属于正常情况。

**BAFTA 的年份：** `year` 用的是奖项表里的游戏年度。2025 年度在 2026 年 4 月颁奖，这一点记在 `yearLabel`。

### 3.3 截图下载

| 项目 | 数量 |
|---|---|
| 有截图的游戏 | 341 个（340 个已核验加 1 个已改正；Eastward 两行合并为一个目录） |
| header.jpg / t1–t4 / f1 | 341 个游戏全部齐全 |
| f2 | 72 个游戏有，全部是有奖项依据的游戏。其余 269 个因为预算没下 |
| 文件总数 | 2,118 张图片，另有 341 个 provenance.json |
| 总大小 | 296.9 MiB（311,334,491 字节） |
| 截图地址来源 | appdetails 326 个，复用另一项目的原始文件 14 个，GetItems 兜底 1 个（Max Payne 12140） |

Max Payne 走兜底，是因为 appdetails 对它返回了 `{"success":false}`。GetItems 兜底时，截图地址按 `https://shared.akamai.steamstatic.com/store_item_assets/<filename>` 拼接，再插入 `.600x338` 或 `.1920x1080`。这个拼法这次实测返回 200，调研里"前缀还需要验证"的疑问已经解决。

### 3.4 榜单快照（`charts.json`，2026-10-13 10:43 UTC，美区）

**抓取方式：** 两个榜单各抓 150 条原始结果，用 GetItems 的 `type` 字段只保留游戏（type 0），取前 100。

**被过滤掉的条目：**
- 热销榜前 100 名范围内去掉了 10 条：Steam Frame、Deck、Controller、Machine 四个硬件和 6 个 DLC。
- 愿望单范围内去掉了 4 个 DLC。

**和案例重合的有 20 个**，例如：
- 热销榜：ARC Raiders #6、Marvel Rivals #12、Aniimo #13、Overwatch #20、ELDEN RING #50
- 愿望单：Light No Fire #2、Phantom Blade Zero #6、Witchbrook #10

**这只是热度信号，不代表美术质量。**

### 3.5 SteamPeek（`steampeek.json`）

**抓取范围：** 12 个种子游戏，每个只抓第一页，各 36 条相似游戏。种子分别是：
- A Short Hike、Townscaper、Okami HD、Return of the Obra Dinn
- Teardown、GRIS、Hades、OCTOPATH TRAVELER
- SIGNALIS、Sable、TUNIC、山海旅人

**和案例重合的有 20 个**，例如：Tiny Glade、Cloud Gardens、Proteus、Neva、FEZ、Gorogoa、Chained Echoes、OCTOPATH TRAVELER II。

SteamPeek 页面上每个种子的"更新时间"在 2026-08-04 到 2026-10-01 之间。

---

## 四、注意事项

1. **截图版权和用途。** 截图来自 Steam 官方 CDN，版权属于各发行商，只用于本地学习参考，不再分发。
   - `vite build` 会把 `public/` 复制进 `dist/`，产物里会带上这约 300 MB 截图，**不要公开发布 dist**。
   - `build:single` 不复制 `public/`。
   - 如果以后把项目放进 git，建议忽略 `public/cases/`。
2. **截图不一定是实机画面。** Steam 商店截图可能是宣传合成图、带界面或文字的图，甚至是标题卡，比如 Return of the Obra Dinn 的 t1 是一张文字海报。没有逐张核验。
3. **缩略图尺寸。** Steam 文件名写的是 600x338，实际像素是 600x337。原图是 1920x1080。
4. **截图列表的语言不统一。** 复用的 14 个原始文件是 `l=english` 的响应。截图顺序和语言基本无关，但少数游戏的中文商店页可能用了不同的截图。
5. **名称匹配偏宽松。** 只要求调研名的词大部分出现在 Steam 名里，所以"Hades"也能匹配"Hades II"。这次已经人工检查过全部 34 条非精确匹配，都是正确的。以后新增条目时，请看一下 `verify.json` 里 `steamName` 和 `name` 差别大的条目。
6. **appid 只用接口返回值。** 脚本只接受 Steam 接口返回的 appid，不会自己编。`verify.mjs` 里的 `MANUAL` 表目前是空的，以后只用来"接受接口返回的某个 appid"。
7. **appdetails 有频率限制。** 实际经验约为每 5 分钟 200 次。脚本间隔 1.5 秒，并在 429 或 403 时退避，本次全程没有遇到 429。
8. **SteamPeek 是第三方网站。** 它主要按标签相似度推荐，混有大量低分或没有评分的小游戏，只能当作扩展线索。翻页参数没有用到。页面文字只当数据解析。
9. **非 Steam 条目只有链接。** 19 个 non-steam 条目和 1 个 not-found 条目都没有图片。其中 8 个连来源链接都没有（调研写了"来源待补"或"—"），`sourcesPending` 为 true：
   - non-steam 7 个：Wind Waker HD、Genshin Impact、Muramasa、Minecraft、Paper Mario、Kirby's Epic Yarn、Animal Crossing
   - not-found 1 个：Mars After Midnight
   如果需要补图，只能用官方渠道，并人工确认授权。
10. **调研数量写错了。** 调研写"222 条"，实际是 361 行。IGF 2026 入围的 Blippo+、CARIMARA、Morsels 没进表格，本流程也没有收录。
11. **数据会过时。** 所有数据的时间点都是 2026-10-13，Steam 的名称、标签、截图、榜单和价格会变。重跑 `verify` 和 `screens` 会刷新这些信息；已下载的图片不会自动替换，需要删掉对应目录后重新下载。
