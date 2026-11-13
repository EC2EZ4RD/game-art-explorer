# R3 参考库 · 玩家评价（2026-10-14）

> 数据：`docs/survey/data/ui-review-stats.json`（`scripts/refs/r3-reviews.py`）；缓存 `qa/refs-cache/reviews/`（本地，不分发）。只存计数与归类，不存评测原文。参考卡新增后重跑脚本即可补齐（已缓存的不再请求）。

## 方法

- 范围：UI 参考卡里有 Steam appid 的 **176 款**（R2① 策略 / 建造 100 款 + R2② 探索 / RPG / 动作 76 款）；`check:content` 校验每张带 appid 的卡都有统计（176 / 176）。
- 取数：Steam 公开评测接口，英文 + 简体中文，按"有帮助"排序，每种语言最多 200 条；共 **40,961 条**，每款中位 240 条。请求间隔 1.5 秒、2 个并发，被限流（429）时退避 30 / 60 / 90 秒重试，失败不写缓存；最终 5 次请求没拿到（各缺一种语言的一页）。
- 归类：关键词正则（中英），统计"提到美术 / 画面"的比例与其中好评占比、提到界面 / UI 的条数（分好评 / 差评）、夸 UI 的条数，以及 9 类 UI 抱怨；一款游戏某类抱怨 **≥ 2 条评测**才算这款的出处。
- 局限：关键词归类是粗筛——"clutter / obstruct"也会命中说场景杂乱的评测；"按有帮助排序"偏向长评测；只看到每款的前 200 条。适合找"哪类问题常被提起、出在哪些游戏"，不适合精确比较两款游戏。

## 美术评价（这批参考的"美术好评"证据）

- 评测里提到美术 / 画面的比例：中位 **14%**（策略 / 建造 10%，探索 / RPG / 动作 20%）；这些评测中好评占比中位 **89%**。
- 提到美术最多的：Kena 59%、The Artful Escape 59%、ABZU 55%、GRIS 55%、Clair Obscur 52%、Hyper Light Drifter 52%、Inkulinati 48%、Sol Cesto 47%——都是"画面即卖点"的作品，与 R1 的奖项证据一致。

## 玩家常骂的 UI 做法（每类的出处游戏，括号里是提到的评测条数）

| 抱怨 | 出处（≥ 2 条） | 款数 | 落到探索台的哪里 |
|---|---|---|---|
| 提示 / 引导不清 | Kingdom Two Crowns 7、A Plague Tale: Requiem 6、PlateUp! 5、王国之心 HD 5、Hellblade 3、Planet Coaster 3、Anno 1800 3、了不起的修仙模拟器 3、Timberborn 3、艾尔登法环 3…… | 23 | M9b 流程与引导（关闭 / 确认 / 引导参数、教学提示模板）；"极简 / 零 HUD"流派（Kingdom、Hellblade）的代价正是引导不足 |
| 菜单 / 界面难用（繁琐、不直观） | Starfield 4、刺客信条 大革命 3、Parkasaurus 3、Planet Zoo 3、Dyson Sphere Program 3、文明 6 2、Rain World 2、Frostpunk 2…… | 16 | M9a 界面模板的层级深度、M9b 流程演示（点几下能到）；建造 / 经营类集中 |
| HUD 太乱 / 挡视野 | Bloons TD 6 5、Hades II 4、对马岛之魂 4、Hyper Light Drifter 3、Rain World 3、Planet Zoo 3、艾尔登法环 3…… | 15 | M8a 屏占比检查（chk.coverage）、M8b 特效遮挡（chk.fxOcclusion）、rel.hudVisibility 情境显现 |
| 字太小 / 看不清 | 战神：诸神黄昏 3、Hyper Light Drifter 2、耻辱 2 2、Wildermyth 2、只狼 2、Hades II 2、鬼谷八荒 2、Terra Nil 2、战神 2 | 9 | M8a 最小字号（chk.minText）、M8b 文字缩放（a11y.textScale + 大字叠加 ov.bigText）——3A 动作游戏也会被骂字小 |
| 地图难用 / 没有地图 | Clair Obscur 13（没有小地图）、Hyper Light Drifter 6、A Short Hike 4、黑神话：悟空 2 | 4 | 小地图形态（el.minimap.form）与"零 HUD 探索"的取舍；E33 的缺小地图是这批里单款最集中的抱怨 |
| 手柄 / 键位不好 | 刺客信条 2 4、FF X/X-2 HD 2、Kingdom Rush Vengeance 2 | 3 | M10 输入方式（按键图标集、按键绑定呈现） |
| UI 缩放 / 分辨率 | RollerCoaster Tycoon Classic 3、Far Cry 4 2、Melvor Idle 2 | 3 | a11y.uiScale（M8b 已接上）、M10 超宽 / 4K 适配 |
| UI 卡顿 / 响应慢 | 波斯王子 2、赛博朋克 2077 2、弈仙牌 2 | 3 | 动效时长（mo.duration）与减少动效（a11y.reduceMotion） |
| 背包 / 物品管理难用 | 天际 2、Bear and Breakfast 2（另有 7 款各 1 条：BG3、赛博朋克、Starfield、Factorio、暗黑地牢 2、侠客风云传前传、Parkasaurus） | **2** | **未达"≥ 3 款"**：这批参考里背包抱怨分散、每款只有一两条；R2③（养成 / 生存）后重跑再看 |

## 玩家夸 UI 的

- 明确夸界面（"clean / intuitive / 简洁 / 清晰 UI"）最多的：Plan B: Terraform、Bad North、对马岛之魂、Kingdom Two Crowns、Sol Cesto、Parkasaurus、文明 6、Songs of Syx、Metaphor: ReFantazio。
- 有意思的对照：**Kingdom Two Crowns 同时是"夸 UI 简洁"和"骂引导不清"的头部**——零 HUD 的世界即 UI 做法，好看但新手不知道干什么；对马岛之魂（引导之风）既被夸简洁也有"挡视野"的抱怨（多来自过场字幕 / 提示）。
- 提到 UI 的评测里差评占比高的（≥ 15 条提及）：暗黑破坏神 4、巫师 3、刺客信条 大革命、Starfield——多是对整款游戏不满时顺带骂界面，不能直接当成 UI 差的证据。

## 喂给后续

- M8b 的检查已覆盖：字太小（最小字号 + 大字叠加）、HUD 挡视野（屏占比 + 特效遮挡）、UI 缩放（a11y.uiScale）。
- M9a / M9b：引导不清（最多的一类）与菜单繁琐 → 引导、流程、层级参数要有"点几下"与"首次提示"的演示。
- M10：手柄 / 键位、超宽 / 4K。
- 背包类抱怨待 R2③ 后补齐出处。

## 更新（2026-10-14，R2③④ 之后重跑）

范围扩到 **336 款**（R2 四批里所有带 Steam appid 的卡），**74,932 条**评测，每款中位 227 条；Wash Card 在英文 / 简中都没有评测。美术提及率中位 16%，其中好评 91%。**9 类抱怨现在每类都有 ≥ 3 款出处**（背包一类补齐了）：

| 抱怨 | 款数 | 出处最多的（条数） |
|---|---|---|
| 提示 / 引导不清 | 47 | Scorn 10、Kingdom Two Crowns 7、A Plague Tale: Requiem 6、ASTRONEER 5、PlateUp! 5、王国之心 HD 5、Destiny 2 4、Subnautica 3、无人深空 3 |
| 菜单 / 界面难用 | 24 | Valheim 7、Starfield 4、无人深空 3、刺客信条 大革命 3、Parkasaurus 3、Planet Zoo 3、Dyson Sphere Program 3、Palworld 3 |
| HUD 太乱 / 挡视野 | 22 | Bloons TD 6 5、Tiny Glade 5、CONTROL 4、Hades II 4、对马岛之魂 4、Hyper Light Drifter 3、Rain World 3、艾尔登法环 3 |
| 地图难用 / 没有地图 | 19 | Clair Obscur 13、Hyper Light Drifter 6、CONTROL 5、Chants of Sennaar 5、Abiotic Factor 4、Scorn 4、Valheim 4、A Short Hike 4、TOEM 4 |
| 字太小 / 看不清 | 18 | Valheim 3、战神：诸神黄昏 3、镜之边缘 2、Hyper Light Drifter 2、无人深空 2、耻辱 2 2、Obra Dinn 2、只狼 2 |
| 背包 / 物品管理难用 | 11 | Valheim 17、生化危机 5 4、无人深空 3、生化危机 2 3、Callisto Protocol 3、Grim Fandango 2、Flame in the Flood 2、Abiotic Factor 2 |
| 手柄 / 键位不好 | 7 | 刺客信条 2 4、Heavy Rain 3、生化危机 5 2、FF X/X-2 2、Ori 2、Forgotton Anne 2 |
| UI 卡顿 / 响应慢 | 6 | DEATHLOOP 3、波斯王子 2、Half-Life: Alyx 2、赛博朋克 2077 2、Enshrouded 2、弈仙牌 2 |
| UI 缩放 / 分辨率 | 4 | BioShock Infinite 4、RollerCoaster Tycoon Classic 3、Far Cry 4 2、Melvor Idle 2 |

新出现的规律：**生存 / 恐怖类的背包是重灾区**（Valheim 17 条、生化危机系列、Callisto——拼图格 / 负重 / 格子太少）；**零 HUD 的代价在这一批更明显**——Scorn（引导 10、地图 4）、CONTROL（挡视野 + 地图）、Chants of Sennaar / TOEM（没有地图）都是 R2③ 里"界面就是画面"的代表作。
