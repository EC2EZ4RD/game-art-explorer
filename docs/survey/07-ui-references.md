# UI 参考库（研究轨 R1：候选名单）

> 生成：2026-10-13，由 `scripts/refs/collect-candidates.ts` + `report-candidates.ts` 产出；数据在 `docs/survey/data/ui-ref-candidates.json`。计划见 `docs/ui-hud-plan.md`。

## 这份名单是什么

UI 参考卡（R2）从这份名单里挑：每款都有"美术好评"的证据，按 16 个品类归类。现在还只是名单——UI 长什么样、玩家怎么评价，要到 R2 / R3 才逐款拆解。

**分级**

| 级 | 含义 | 数量 |
|---|---|---|
| A | 美术类奖项得主（IGF 视觉艺术、BAFTA 艺术成就、TGA 最佳美术指导、GDC 选择奖最佳视觉艺术、D.I.C.E. 美术指导、Golden Joystick 最佳视觉设计、Apple Design Awards 视觉与图形） | 82 |
| B | 上述奖项入围 | 274 |
| C | 案例库（美术风格调研的代表作） | 223 |
| D | Steam：美术标签排在玩家标签前 12 位，好评率 ≥ 90%，评测 ≥ 2,000 | 815 |
| E | 品类补充（只用于工厂自动化、竞速）：评测 ≥ 500、好评率 ≥ 85%，标签里有美术标签，主品类对得上 | 63 |

合计 **1457** 款（Steam 1391，非 Steam 66：主机独占、手机或未上架，R2 只能靠 Game UI Database 等链接与公开截图）。另有 600 款只挂着美术标签、但标签排名靠后，放在 `ui-ref-candidates.pool.json` 备查，不计入。

**奖项条目来源**：IGF 155，BAFTA 96，TGA 56，GDCA 26，DICE 144，GJ 12，ADA 6。

## 品类覆盖

按 Steam 玩家标签映射到探索台的 16 个品类。"主品类"每款只算一个；"含该品类"允许一款算进几个品类（如动作 RPG）。目标每个品类 ≥ 15 款可用参考。

| 组 | 品类 | 主品类 | 含该品类 | 其中 A/B 级 | 状态 |
|---|---|---|---|---|---|
| ① 策略 / 建造经营 | 策略 | 40 | 78 | 14 | 够 |
| ① 策略 / 建造经营 | 建造经营 | 47 | 87 | 11 | 够 |
| ① 策略 / 建造经营 | 工厂自动化 | 7 | 18 | 2 | 够 |
| ② 探索 / RPG / 动作 | 探索冒险 | 147 | 338 | 155 | 够 |
| ② 探索 / RPG / 动作 | 角色扮演 | 124 | 198 | 40 | 够 |
| ② 探索 / RPG / 动作 | 动作 | 172 | 254 | 76 | 够 |
| ② 探索 / RPG / 动作 | 平台跳跃 | 162 | 213 | 65 | 够 |
| ③ 养成 / 解谜 / 叙事 | 生活养成 | 82 | 180 | 19 | 够 |
| ③ 养成 / 解谜 / 叙事 | 解谜 | 117 | 220 | 65 | 够 |
| ③ 养成 / 解谜 / 叙事 | 叙事 | 190 | 275 | 44 | 够 |
| ④ 卡牌 / 竞速 / 射击 | 卡牌桌游 | 20 | 32 | 5 | 够 |
| ④ 卡牌 / 竞速 / 射击 | 竞速 | 41 | 57 | 2 | 够 |
| ④ 卡牌 / 竞速 / 射击 | 射击 | 90 | 148 | 50 | 够 |
| 其他（恐怖 / 生存 / 沙盒） | 恐怖 | 111 | 169 | 33 | 够 |
| 其他（恐怖 / 生存 / 沙盒） | 生存 | 26 | 41 | 5 | 够 |
| 其他（恐怖 / 生存 / 沙盒） | 沙盒 | 32 | 86 | 7 | 够 |

非 Steam 的 66 款（主机独占、手机、网页、下架老游戏）按 `scripts/refs/nonsteam.ts` 手工归类，已计入上表；名单里用缩写或旧名、其实在 Steam 上的条目，也在那张表里改成 Steam 上的名称后合并到同一款游戏。

## 各品类名单

每款只归一个主品类；融合类游戏的其他玩法写在"融合玩法与说明"一列（Steam 游戏按玩家标签自动列出，非 Steam 与改名条目带手工说明）。每个品类列主品类的全部游戏（A → E，同级按评测数）。"证据"列：奖项（★ = 得主）、案例库、美术标签；"好评"列：好评率 / 评测数（SteamSpy）。

### ① 策略 / 建造经营

#### 策略（40 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | [Tooth and Tail](https://store.steampowered.com/app/286000/) | IGF 2018，Pixel Graphics | 80% / 4,057 |  |
| B | [METAL GEAR SOLID 2: Sons of Liberty - Master Collection Version](https://store.steampowered.com/app/2131640/) | DICE 2001 | 86% / 2,439 | 融合 探索冒险、射击 |
| B | [Sol Cesto](https://store.steampowered.com/app/2738490/) | IGF 2026 | 96% / 879 | 融合 角色扮演 |
| C | [Wandering Sword](https://store.steampowered.com/app/1876890/) | 案例库，Pixel Graphics | 95% / 30,920 | 融合 角色扮演、探索冒险 |
| C | [Dorfromantik](https://store.steampowered.com/app/1455840/) | 案例库，Stylized/Hand-drawn | 97% / 27,597 | 融合 建造经营、生活养成、解谜 |
| C | [The Banner Saga](https://store.steampowered.com/app/237990/) | 案例库，Hand-drawn | 89% / 15,523 |  |
| C | [Bad North](https://store.steampowered.com/app/688420/) | 案例库，Stylized/Minimalist | 93% / 12,198 |  |
| C | [Songs of Conquest](https://store.steampowered.com/app/867210/) | 案例库，Pixel Graphics | 86% / 11,676 |  |
| C | [Yi Xian: The Cultivation Card Game](https://store.steampowered.com/app/1948800/) | 案例库，Pixel Graphics | 74% / 6,132 | 融合 卡牌桌游 |
| C | [Inkulinati](https://store.steampowered.com/app/957960/) | 案例库，Stylized/Hand-drawn | 87% / 928 |  |
| D | [Bloons TD 6](https://store.steampowered.com/app/960090/) | Cartoony | 97% / 353,960 |  |
| D | [Your Only Move Is HUSTLE](https://store.steampowered.com/app/2212330/) | Pixel Graphics/Anime | 96% / 31,876 | 融合 动作 |
| D | [Into the Breach](https://store.steampowered.com/app/590380/) | Pixel Graphics | 95% / 20,216 |  |
| D | [Wildermyth](https://store.steampowered.com/app/763890/) | Hand-drawn | 95% / 17,491 | 融合 叙事、角色扮演 |
| D | [Kingdom Rush  - Tower Defense](https://store.steampowered.com/app/246420/) | Cartoon | 97% / 14,832 |  |
| D | [Bloons TD 5](https://store.steampowered.com/app/306020/) | Colorful | 95% / 11,545 |  |
| D | [Party Hard](https://store.steampowered.com/app/356570/) | Pixel Graphics | 90% / 11,542 | 融合 动作 |
| D | [The WereCleaner](https://store.steampowered.com/app/2795000/) | Cartoony/Cute | 99% / 10,119 |  |
| D | [Kingdom Rush Vengeance - Tower Defense](https://store.steampowered.com/app/1367550/) | Cartoon | 94% / 9,793 |  |
| D | [Wall World](https://store.steampowered.com/app/2187290/) | Pixel Graphics | 91% / 10,001 | 融合 建造经营 |
| D | [Orcs Must Die!](https://store.steampowered.com/app/102600/) | Cartoony | 96% / 8,189 | 融合 射击 |
| D | [Kingdom Rush Origins - Tower Defense](https://store.steampowered.com/app/816340/) | Cartoony | 96% / 7,084 |  |
| D | [Rusted Warfare - RTS](https://store.steampowered.com/app/647960/) | Pixel Graphics | 97% / 6,241 |  |
| D | [Shotgun King: The Final Checkmate](https://store.steampowered.com/app/1972440/) | Pixel Graphics | 92% / 6,420 | 融合 动作 |
| D | [Battle for Wesnoth](https://store.steampowered.com/app/599390/) | Pixel Graphics | 94% / 5,356 |  |
| D | [The Battle of Polytopia](https://store.steampowered.com/app/874390/) | Colorful/Minimalist | 94% / 5,148 |  |
| D | [Shogun Showdown](https://store.steampowered.com/app/2084000/) | Pixel Graphics | 96% / 4,904 | 融合 角色扮演、卡牌桌游 |
| D | [Intravenous](https://store.steampowered.com/app/1486630/) | Pixel Graphics | 90% / 4,813 | 融合 动作 |
| D | [Chroma Squad](https://store.steampowered.com/app/251130/) | Pixel Graphics | 93% / 4,429 | 融合 角色扮演 |
| D | [Legend Creatures(传奇生物)](https://store.steampowered.com/app/1191840/) | Pixel Graphics | 90% / 3,922 |  |
| D | [Cobalt Core](https://store.steampowered.com/app/2179850/) | Pixel Graphics | 97% / 3,512 | 融合 卡牌桌游 |
| D | [Infinitode 2 - Infinite Tower Defense](https://store.steampowered.com/app/937310/) | Minimalist | 91% / 3,674 |  |
| D | [Defender's Quest: Valley of the Forgotten (DX edition)](https://store.steampowered.com/app/218410/) | Pixel Graphics | 95% / 3,460 |  |
| D | [Progressbar95](https://store.steampowered.com/app/1304550/) | Abstract | 96% / 2,955 | 融合 解谜 |
| D | [UnMetal](https://store.steampowered.com/app/1203710/) | Pixel Graphics | 94% / 3,017 | 融合 动作、探索冒险 |
| D | [Cureocity](https://store.steampowered.com/app/2612680/) | Hand-drawn/Cartoon | 98% / 2,675 | 融合 生活养成 |
| D | [Sunrider: Mask of Arcadius](https://store.steampowered.com/app/313730/) | Anime | 92% / 2,782 | 融合 叙事 |
| D | [Slice & Dice](https://store.steampowered.com/app/1775490/) | Pixel Graphics | 97% / 2,131 | 融合 角色扮演 |
| E | [The Perfect Tower II](https://store.steampowered.com/app/1197260/) | Colorful/Voxel | 88% / 3,639 | 融合 工厂自动化、建造经营 |
| E | [ShapeHero Factory](https://store.steampowered.com/app/2389040/) | Cute | 89% / 614 | 融合 建造经营、工厂自动化 |

#### 建造经营（47 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | [Kingdom: Classic](https://store.steampowered.com/app/368230/) | IGF 2016，Pixel Graphics | 91% / 22,088 |  |
| B | [Mini Metro](https://store.steampowered.com/app/287980/) | IGF 2016，IGF 2015，案例库，Minimalist | 96% / 15,672 |  |
| B | [Kingdom Two Crowns](https://store.steampowered.com/app/701160/) | IGF 2016，案例库，Pixel Graphics/Minimalist | 88% / 7,063 | 融合 策略 |
| B | [Terra Nil](https://store.steampowered.com/app/1593030/) | IGF 2023，Stylized/Colorful | 88% / 6,987 | 融合 策略、生活养成 |
| B | [Pharaoh + Cleopatra](https://store.steampowered.com/app/564530/) | DICE 2000 | 92% / 2,435 |  |
| B | [The Sims Legacy Collection](https://store.steampowered.com/app/3314060/) | DICE 2000，Colorful/Cartoony | 63% / 1,565 | 融合 沙盒 |
| C | [Factorio](https://store.steampowered.com/app/427520/) | 案例库，Pixel Graphics | 97% / 215,209 | 融合 生存 |
| C | [鬼谷八荒 Tale of Immortal](https://store.steampowered.com/app/1468810/) | 案例库，Hand-drawn | 53% / 227,104 | 融合 角色扮演、叙事、沙盒、动作、生活养成 |
| C | [Cult of the Lamb](https://store.steampowered.com/app/1313140/) | 案例库，Colorful/Cute | 96% / 103,228 | 融合 动作、角色扮演 |
| C | [Kenshi](https://store.steampowered.com/app/233860/) | 案例库 | 96% / 98,135 | 融合 生存、探索冒险 |
| C | [Dyson Sphere Program](https://store.steampowered.com/app/1366540/) | 案例库 | 98% / 85,088 |  |
| C | [Spiritfarer](https://store.steampowered.com/app/972660/) | 案例库，Hand-drawn/Cartoony | 95% / 46,417 | 融合 生活养成 |
| C | [Mini Motorways](https://store.steampowered.com/app/1127500/) | 案例库，Beautiful/Stylized | 96% / 21,432 |  |
| C | [Townscaper](https://store.steampowered.com/app/1291340/) | 案例库，Beautiful/Stylized | 96% / 21,028 |  |
| C | [Amazing Cultivation Simulator](https://store.steampowered.com/app/955900/) | 案例库，Anime | 86% / 23,009 |  |
| C | [ISLANDERS](https://store.steampowered.com/app/1046030/) | 案例库，Beautiful/Colorful | 95% / 16,316 |  |
| C | [Cloud Gardens](https://store.steampowered.com/app/1372320/) | 案例库，Surreal | 95% / 2,214 | 融合 沙盒、生活养成 |
| C | [Before We Leave](https://store.steampowered.com/app/1073910/) | 案例库 | 78% / 1,637 |  |
| C | 江南百景图（手机） | 案例库 | — | 融合 生活养成；明代江南城镇经营，界面仿古画 |
| D | [Planet Zoo](https://store.steampowered.com/app/703080/) | Cute | 91% / 87,849 |  |
| D | [Cookie Clicker](https://store.steampowered.com/app/1454400/) | Pixel Graphics | 97% / 79,892 |  |
| D | [SPORE](https://store.steampowered.com/app/17390/) | Cute | 92% / 66,120 | 融合 探索冒险 |
| D | [WorldBox - God Simulator](https://store.steampowered.com/app/1206560/) | Pixel Graphics | 95% / 44,062 | 融合 沙盒 |
| D | [My Singing Monsters](https://store.steampowered.com/app/1419170/) | Colorful/Cartoony | 94% / 41,701 | 融合 生活养成 |
| D | [Timberborn](https://store.steampowered.com/app/1062090/) | Voxel | 96% / 31,678 | 融合 沙盒 |
| D | [PlateUp!](https://store.steampowered.com/app/1599600/) | Cute | 95% / 23,401 |  |
| D | [Thronefall](https://store.steampowered.com/app/2239150/) | Colorful/Minimalist | 97% / 20,544 | 融合 策略、动作 |
| D | [Mr.Mine](https://store.steampowered.com/app/1397920/) | Pixel Graphics | 92% / 17,216 |  |
| D | [Nodebuster](https://store.steampowered.com/app/3107330/) | Minimalist/Abstract | 98% / 11,604 | 融合 生活养成 |
| D | [Do Not Feed the Monkeys](https://store.steampowered.com/app/658850/) | Pixel Graphics | 94% / 11,026 | 融合 叙事、解谜 |
| D | [(the) Gnorp Apologue](https://store.steampowered.com/app/1473350/) | Cute | 96% / 8,143 |  |
| D | [Two Point Museum](https://store.steampowered.com/app/2185060/) | Cartoony/Cute | 95% / 5,975 |  |
| D | [Songs of Syx](https://store.steampowered.com/app/1162750/) | Pixel Graphics | 96% / 5,822 |  |
| D | [Digseum](https://store.steampowered.com/app/3361470/) | Colorful/Pixel Graphics | 98% / 5,542 |  |
| D | [Bear and Breakfast](https://store.steampowered.com/app/1136370/) | Cartoon/Cute | 90% / 4,883 | 融合 生活养成 |
| D | [Evil Genius](https://store.steampowered.com/app/3720/) | Stylized | 93% / 3,506 | 融合 策略 |
| D | [Megaquarium](https://store.steampowered.com/app/600480/) | Cute | 95% / 3,374 |  |
| D | [TheoTown](https://store.steampowered.com/app/1084020/) | Pixel Graphics | 94% / 3,309 |  |
| D | [Parkasaurus](https://store.steampowered.com/app/591460/) | Cute | 93% / 3,020 |  |
| D | [SUMMERHOUSE](https://store.steampowered.com/app/2533960/) | Colorful/Pixel Graphics | 95% / 2,910 | 融合 生活养成、沙盒 |
| D | [Cheeky Chooks](https://store.steampowered.com/app/922460/) | Colorful/Cute | 94% / 2,670 | 融合 生活养成、策略 |
| D | [RollerCoaster Tycoon Classic](https://store.steampowered.com/app/683900/) | Pixel Graphics | 91% / 2,571 |  |
| D | [dotAGE](https://store.steampowered.com/app/638510/) | Pixel Graphics | 96% / 2,371 | 融合 卡牌桌游 |
| D | [Plan B: Terraform](https://store.steampowered.com/app/1894430/) | Colorful | 92% / 2,425 |  |
| E | [Autonauts](https://store.steampowered.com/app/979120/) | Cute | 90% / 4,785 | 融合 工厂自动化 |
| E | [Beltmatic](https://store.steampowered.com/app/2674590/) | Minimalist/Abstract | 95% / 1,430 | 融合 工厂自动化、沙盒 |
| E | [River Town Factory](https://store.steampowered.com/app/2281410/) | Pixel Graphics | 90% / 1,245 | 融合 工厂自动化、探索冒险、沙盒 |

#### 工厂自动化（7 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| D | [Melvor Idle](https://store.steampowered.com/app/1267910/) | Minimalist | 90% / 14,538 | 融合 生存、角色扮演、解谜 |
| E | [The Farmer Was Replaced](https://store.steampowered.com/app/2060160/) | Colorful/Minimalist | 97% / 1,543 | 融合 生活养成、解谜 |
| E | [Maltese's Fluffy Onsen](https://store.steampowered.com/app/3404470/) | Pixel Graphics/Cute | 94% / 878 | 融合 生活养成、沙盒 |
| E | [Plasma](https://store.steampowered.com/app/1409160/) | Stylized | 89% / 888 | 融合 沙盒、叙事、建造经营 |
| E | [A=B](https://store.steampowered.com/app/1720850/) | Minimalist | 96% / 809 |  |
| E | [Widget Inc.](https://store.steampowered.com/app/3184110/) | Pixel Graphics | 87% / 589 | 融合 建造经营 |
| E | [Craftomation 101: Programming & Craft](https://store.steampowered.com/app/1724140/) | Cute | 86% / 515 | 融合 生存 |

### ② 探索 / RPG / 动作

#### 探索冒险（147 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [The Witcher 3: Wild Hunt — Remastered](https://store.steampowered.com/app/292030/) | BAFTA 2015，TGA 2015，GJ 2015★ | 96% / 835,349 | 融合 叙事；"血与酒"是资料片 |
| A | [Cyberpunk 2077](https://store.steampowered.com/app/1091500/) | BAFTA 2020，ADA 2025★，案例库 | 84% / 844,921 |  |
| A | [GRIS](https://store.steampowered.com/app/683320/) | TGA 2019，BAFTA 2018，GDCA 2018★，案例库，Beautiful/Hand-drawn | 96% / 83,448 | 融合 平台跳跃 |
| A | [Hellblade: Senua's Sacrifice](https://store.steampowered.com/app/414340/) | BAFTA 2017★，DICE 2017，案例库 | 90% / 73,472 | 融合 恐怖 |
| A | [Assassin’s Creed IV Black Flag](https://store.steampowered.com/app/242050/) | GJ 2014★ | 89% / 71,071 |  |
| A | [Ghost of Tsushima DC](https://store.steampowered.com/app/2215430/) | BAFTA 2020，TGA 2020★，GDCA 2020★，案例库 | 94% / 65,115 | 融合 动作 |
| A | [Journey](https://store.steampowered.com/app/638230/) | BAFTA 2012★，GDCA 2012★，DICE 2012★，案例库，Beautiful/Stylized | 94% / 34,512 |  |
| A | [Red Dead Redemption](https://store.steampowered.com/app/2668510/) | DICE 2010★ | 92% / 10,406 | 融合 射击 |
| A | [Dear Esther: Landmark Edition](https://store.steampowered.com/app/520720/) | BAFTA 2012，IGF 2012★，案例库 | 75% / 6,849 | 融合 恐怖 |
| A | [Prince of Persia](https://store.steampowered.com/app/19980/) | GDCA 2008★，DICE 2008，Beautiful | 78% / 3,484 | 融合 平台跳跃、动作 |
| A | [Riven](https://store.steampowered.com/app/1712350/) | DICE 1998★，Surreal | 93% / 2,413 | 融合 解谜；获奖的是 1997 原作；Steam 为 2024 三维重制 |
| A | [The Artful Escape](https://store.steampowered.com/app/1122680/) | BAFTA 2021★，TGA 2021，案例库，Stylized/Colorful | 92% / 1,682 | 融合 叙事 |
| A | [Knights And Bikes](https://store.steampowered.com/app/592480/) | IGF 2020★，BAFTA 2019，案例库，Hand-drawn/Colorful | 90% / 581 | 融合 叙事、解谜、动作 |
| A | The Legend of Zelda: The Wind Waker（GameCube） | GDCA 2003★，DICE 2003★，案例库 | — | 融合 动作、解谜；航海探索 + 地牢解谜 |
| A | Death Stranding 2: On the Beach（PS5） | BAFTA 2025★，TGA 2025 | — | 融合 动作、叙事；送货探索为主，夹着战斗与大量过场 |
| A | LEGO Star Wars: Castaways（Apple Arcade） | ADA 2022★ | — | 融合 生活养成；社交冒险，手机触屏 |
| B | [Red Dead Redemption 2](https://store.steampowered.com/app/1174180/) | BAFTA 2018，TGA 2018，DICE 2018，案例库，Beautiful | 92% / 733,542 | 融合 射击 |
| B | [The Elder Scrolls V: Skyrim Special Edition](https://store.steampowered.com/app/489830/) | BAFTA 2011 | 92% / 337,058 | Steam 为特别版 |
| B | [Hogwarts Legacy](https://store.steampowered.com/app/990080/) | DICE 2023 | 90% / 321,395 |  |
| B | [Assassin's Creed Odyssey](https://store.steampowered.com/app/812140/) | TGA 2018 | 89% / 172,193 | 融合 叙事 |
| B | [Stray](https://store.steampowered.com/app/1332010/) | TGA 2022，DICE 2022，案例库，Beautiful/Colorful | 97% / 156,607 |  |
| B | [Rise of the Tomb Raider](https://store.steampowered.com/app/391220/) | DICE 2015 | 94% / 136,180 |  |
| B | [Batman: Arkham Knight](https://store.steampowered.com/app/208650/) | BAFTA 2015，TGA 2015，Comic Book | 89% / 140,048 | 融合 动作、解谜 |
| B | [Marvel’s Spider-Man Remastered](https://store.steampowered.com/app/1817070/) | BAFTA 2018，DICE 2018，Beautiful/Comic Book | 96% / 112,392 | 融合 动作；Steam 为重制版 |
| B | [Starfield](https://store.steampowered.com/app/1716740/) | DICE 2023 | 57% / 165,527 |  |
| B | [METAL GEAR SOLID V: THE PHANTOM PAIN](https://store.steampowered.com/app/287700/) | BAFTA 2015，TGA 2015 | 92% / 99,922 | 融合 射击、策略 |
| B | [Firewatch](https://store.steampowered.com/app/383870/) | TGA 2016，DICE 2016，案例库，Colorful | 90% / 90,438 |  |
| B | [Dishonored](https://store.steampowered.com/app/205100/) | DICE 2012 | 98% / 82,370 | 融合 射击 |
| B | [Assassin's Creed Unity](https://store.steampowered.com/app/289650/) | BAFTA 2014，DICE 2014，Beautiful | 78% / 74,294 |  |
| B | [Dishonored 2](https://store.steampowered.com/app/403640/) | BAFTA 2016，案例库 | 89% / 62,782 |  |
| B | [Far Cry 4](https://store.steampowered.com/app/298110/) | BAFTA 2014 | 84% / 61,267 | 融合 射击 |
| B | [Assassin's Creed 2](https://store.steampowered.com/app/33230/) | DICE 2009 | 89% / 54,646 |  |
| B | [Marvel’s Spider-Man: Miles Morales](https://store.steampowered.com/app/1817190/) | DICE 2020，Beautiful/Comic Book | 93% / 43,681 | 融合 动作 |
| B | [Rain World](https://store.steampowered.com/app/312520/) | IGF 2018，案例库，Pixel Graphics/Cute | 94% / 42,277 | 融合 平台跳跃 |
| B | [DEATH STRANDING DIRECTOR'S CUT](https://store.steampowered.com/app/1850570/) | BAFTA 2019，TGA 2019，DICE 2019，案例库 | 93% / 39,516 |  |
| B | [ABZU](https://store.steampowered.com/app/384190/) | BAFTA 2016，TGA 2016，案例库，Beautiful/Colorful | 93% / 26,113 |  |
| B | [Assassin's Creed Syndicate](https://store.steampowered.com/app/368500/) | BAFTA 2015 | 80% / 29,679 |  |
| B | [Assassin’s Creed Brotherhood](https://store.steampowered.com/app/48190/) | BAFTA 2010 | 89% / 23,136 |  |
| B | [Horizon Forbidden West Complete Edition](https://store.steampowered.com/app/2420110/) | TGA 2022，DICE 2022 | 89% / 22,735 |  |
| B | [A Short Hike](https://store.steampowered.com/app/1055540/) | IGF 2020，案例库，Beautiful/Pixel Graphics | 99% / 19,064 |  |
| B | [A Plague Tale: Requiem](https://store.steampowered.com/app/1182900/) | BAFTA 2022，案例库 | 91% / 20,610 | 融合 叙事 |
| B | [Marvel's Spider-Man 2](https://store.steampowered.com/app/2651280/) | DICE 2023，Comic Book | 76% / 19,012 | 融合 动作 |
| B | [Indiana Jones and the Great Circle](https://store.steampowered.com/app/2677660/) | DICE 2024 | 91% / 14,109 | 融合 解谜、平台跳跃 |
| B | [Sunset Overdrive](https://store.steampowered.com/app/847370/) | DICE 2014，案例库，Colorful | 90% / 12,899 | 融合 射击 |
| B | [Carto](https://store.steampowered.com/app/1172450/) | IGF 2021，案例库，Stylized/Hand-drawn | 97% / 8,541 | 融合 生活养成 |
| B | [The Vanishing of Ethan Carter](https://store.steampowered.com/app/258520/) | IGF 2015，DICE 2014，案例库，Beautiful | 88% / 8,831 | 融合 恐怖、解谜 |
| B | [COCOON](https://store.steampowered.com/app/1497440/) | BAFTA 2023，案例库，Beautiful/Stylized | 95% / 7,545 |  |
| B | [AER Memories of Old](https://store.steampowered.com/app/331870/) | IGF 2018，案例库，Colorful | 86% / 7,377 |  |
| B | [Epistory - Typing Chronicles](https://store.steampowered.com/app/398850/) | IGF 2016，Beautiful/Colorful | 95% / 6,581 | 融合 叙事 |
| B | [Eastshade](https://store.steampowered.com/app/715560/) | IGF 2020，案例库，Beautiful/Colorful | 89% / 5,157 |  |
| B | [Call of the Sea](https://store.steampowered.com/app/1042490/) | IGF 2021，Colorful/Surreal | 88% / 5,168 | 融合 解谜、恐怖 |
| B | [SLUDGE LIFE](https://store.steampowered.com/app/1144770/) | IGF 2024，案例库，Stylized/Abstract | 91% / 4,943 |  |
| B | [Prince of Persia: Warrior Within](https://store.steampowered.com/app/13500/) | DICE 2004 | 84% / 3,530 | 融合 动作、平台跳跃 |
| B | [Horizon Zero Dawn Remastered](https://store.steampowered.com/app/2561580/) | BAFTA 2017，TGA 2017，DICE 2017 | 81% / 3,403 | 融合 动作 |
| B | [The Gardens Between](https://store.steampowered.com/app/600990/) | IGF 2018，案例库，Stylized/Surreal | 94% / 2,689 | 融合 叙事、生活养成、解谜 |
| B | [Virginia](https://store.steampowered.com/app/374030/) | IGF 2017，案例库 | 64% / 3,288 |  |
| B | [In Other Waters](https://store.steampowered.com/app/890720/) | IGF 2021，案例库，Beautiful/Stylized | 87% / 2,267 | 融合 解谜 |
| B | [Everybody's Gone to the Rapture](https://store.steampowered.com/app/417880/) | BAFTA 2015，Beautiful | 69% / 1,901 |  |
| B | [Mutazione](https://store.steampowered.com/app/1080750/) | IGF 2020，案例库，Colorful/Cute | 95% / 1,214 | 融合 叙事、生活养成 |
| B | [SLUDGE LIFE 2](https://store.steampowered.com/app/2275150/) | IGF 2024，Stylized/Colorful | 97% / 1,095 |  |
| B | [The Midnight Walk](https://store.steampowered.com/app/2863640/) | DICE 2025，Hand-drawn | 95% / 926 | 融合 恐怖 |
| B | [The Eternal Cylinder](https://store.steampowered.com/app/865680/) | IGF 2022，Colorful/Surreal | 89% / 928 |  |
| B | [Harold Halibut](https://store.steampowered.com/app/924750/) | BAFTA 2024，案例库，Colorful | 84% / 881 | 融合 叙事、生活养成 |
| B | [Else Heart.Break()](https://store.steampowered.com/app/400110/) | IGF 2015，Surreal | 67% / 804 | 融合 工厂自动化 |
| B | [Shape of the World](https://store.steampowered.com/app/642610/) | IGF 2018，Colorful/Surreal | 79% / 389 |  |
| B | [NAIAD](https://store.steampowered.com/app/1813860/) | IGF 2023，Colorful/Minimalist | 97% / 281 |  |
| B | [A Musical Story](https://store.steampowered.com/app/1546100/) | IGF 2022，Hand-drawn/Colorful | 84% / 258 | 融合 叙事 |
| B | [PANORAMICAL](https://store.steampowered.com/app/284260/) | IGF 2016，Colorful/Psychedelic | 90% / 224 |  |
| B | [30 Birds](https://store.steampowered.com/app/1708770/) | IGF 2024，Hand-drawn/Colorful | 97% / 95 |  |
| B | [Future Unfolding](https://store.steampowered.com/app/539340/) | IGF 2017，IGF 2016，IGF 2015，Stylized/Hand-drawn | 84% / 99 |  |
| B | [JETT: The Far Shore + Given Time](https://store.steampowered.com/app/1761600/) | IGF 2022 | 70% / 53 |  |
| B | [Afterglitch](https://store.steampowered.com/app/594030/) | IGF 2023，Surreal/Psychedelic | 89% / 26 |  |
| B | [How Deep Is the Dark Water?](https://store.steampowered.com/app/3568480/) | IGF 2023，Noir | 100% / 2 |  |
| B | The Legend of Zelda: Link's Awakening (2019)（Switch） | TGA 2019，案例库 | — | 融合 动作、解谜；俯视角动作冒险，玩具微缩画面 |
| B | The Legend of Zelda: Breath of the Wild（Switch / Wii U） | BAFTA 2017，TGA 2017，DICE 2017，案例库 | — | 融合 动作、生存、解谜；开放世界探索，带生存（耐力、料理、天气）与神庙解谜 |
| B | The Legend of Zelda: Tears of the Kingdom（Switch） | TGA 2023，案例库 | — | 融合 动作、沙盒、解谜；在旷野之息基础上加了物理拼装（沙盒） |
| B | Jettomero: Hero of the Universe（PC（Steam 美区搜索不到，待核）） | IGF 2018 | — | 巨型机器人在星球间漫步 |
| B | Concrete Genie（PS4） | BAFTA 2019，DICE 2019 | — | 融合 解谜；用手柄涂鸦作画推进探索 |
| B | Disney's Villains' Revenge（PC（1999，已绝版）） | DICE 2000 | — | 融合 解谜；儿童向冒险小游戏合集 |
| B | Metroid Prime（GameCube / Switch） | DICE 2002 | — | 融合 射击；第一人称探索射击；HUD 画在头盔面罩上（叙事内 UI 的经典案例） |
| B | Metroid Prime 2: Echoes（GameCube / Wii） | DICE 2004 | — | 融合 射击；面罩式叙事内 HUD |
| C | [Sea of Thieves](https://store.steampowered.com/app/1172620/) | 案例库 | 89% / 355,238 |  |
| C | [Outer Wilds](https://store.steampowered.com/app/753640/) | 案例库，Beautiful | 96% / 84,488 |  |
| C | [South Park: The Stick of Truth](https://store.steampowered.com/app/213670/) | 案例库，Cartoon | 98% / 68,305 | 融合 角色扮演 |
| C | [What Remains of Edith Finch](https://store.steampowered.com/app/501300/) | 案例库 | 96% / 45,053 |  |
| C | [The Scroll of Taiwu（太吾绘卷）](https://store.steampowered.com/app/838350/) | 案例库，Anime | 70% / 60,637 | 融合 角色扮演、沙盒 |
| C | [Slime Rancher 2](https://store.steampowered.com/app/1657630/) | 案例库，Colorful/Cute | 94% / 33,619 | 融合 生活养成 |
| C | [Antichamber](https://store.steampowered.com/app/219890/) | 案例库，Colorful/Surreal | 95% / 17,115 | 融合 平台跳跃 |
| C | [BIOMUTANT](https://store.steampowered.com/app/597820/) | 案例库，Cute | 66% / 19,427 | 融合 动作 |
| C | [Cloudpunk](https://store.steampowered.com/app/746850/) | 案例库，Voxel | 88% / 14,511 |  |
| C | [The Talos Principle 2](https://store.steampowered.com/app/835960/) | 案例库 | 96% / 11,897 | 融合 解谜、平台跳跃 |
| C | [Okami HD](https://store.steampowered.com/app/587620/) | 案例库，Stylized/Colorful | 92% / 9,829 | 融合 角色扮演 |
| C | [Manifold Garden](https://store.steampowered.com/app/473950/) | 案例库，Colorful/Surreal | 96% / 7,229 | 融合 生活养成、解谜 |
| C | [Jotun](https://store.steampowered.com/app/323580/) | 案例库，Hand-drawn | 77% / 8,441 | 融合 动作 |
| C | [Grow Home](https://store.steampowered.com/app/323320/) | 案例库，Cute | 92% / 5,465 | 融合 平台跳跃、沙盒 |
| C | [Moncage（笼中窥梦）](https://store.steampowered.com/app/1195290/) | 案例库，Surreal/Abstract | 93% / 5,299 |  |
| C | [Sable](https://store.steampowered.com/app/757310/) | 案例库，Stylized/Hand-drawn | 87% / 5,614 | 融合 叙事 |
| C | [Lost in Random](https://store.steampowered.com/app/1462570/) | 案例库 | 89% / 4,638 | 融合 动作、卡牌桌游、角色扮演 |
| C | [Dread Delusion](https://store.steampowered.com/app/1574240/) | 案例库，Stylized/Pixel Graphics | 91% / 4,016 |  |
| C | [Snufkin: Melody of Moominvalley](https://store.steampowered.com/app/1808680/) | 案例库，Stylized/Colorful | 97% / 3,022 | 融合 生活养成 |
| C | [Immortals Fenyx Rising](https://store.steampowered.com/app/2221920/) | 案例库，Colorful | 72% / 3,877 | 融合 角色扮演 |
| C | [Minit](https://store.steampowered.com/app/609490/) | 案例库，Pixel Graphics/Minimalist | 89% / 2,617 | 融合 解谜 |
| C | [Lorelei and the Laser Eyes](https://store.steampowered.com/app/2008920/) | 案例库，Stylized/Noir | 95% / 2,271 | 融合 恐怖 |
| C | [Islands of Insight](https://store.steampowered.com/app/2071500/) | 案例库 | 72% / 3,007 | 融合 生活养成 |
| C | [Proteus](https://store.steampowered.com/app/219680/) | 案例库，Beautiful/Pixel Graphics | 76% / 2,741 |  |
| C | [The Pathless](https://store.steampowered.com/app/1492680/) | 案例库，Stylized | 92% / 1,687 |  |
| C | [Tengami](https://store.steampowered.com/app/299680/) | 案例库，Stylized | 81% / 1,768 | 融合 解谜 |
| C | [Botany Manor](https://store.steampowered.com/app/1425350/) | 案例库，Stylized/Colorful | 95% / 826 | 融合 解谜 |
| C | [Tchia](https://store.steampowered.com/app/1496590/) | 案例库，Stylized/Colorful | 90% / 422 | 融合 沙盒、平台跳跃 |
| C | [Inked: A Tale of Love](https://store.steampowered.com/app/690120/) | 案例库，Hand-drawn | 85% / 233 | 融合 解谜、叙事 |
| C | Messenger（Abeto）（网页） | 案例库 | — | 融合 叙事；浏览器里的小星球社交探索 |
| D | [Slime Rancher](https://store.steampowered.com/app/433340/) | Colorful/Cute | 98% / 138,097 |  |
| D | [Brothers - A Tale of Two Sons](https://store.steampowered.com/app/225080/) | Beautiful | 95% / 40,995 |  |
| D | [Trailmakers](https://store.steampowered.com/app/585420/) | Colorful | 93% / 28,047 | 融合 沙盒、生存、建造经营、竞速 |
| D | [The Plan](https://store.steampowered.com/app/250600/) | Beautiful | 92% / 23,087 |  |
| D | [We Were Here Expeditions: The FriendShip](https://store.steampowered.com/app/2296990/) | Cute | 91% / 22,334 | 融合 解谜 |
| D | [The Last Campfire](https://store.steampowered.com/app/990630/) | Cute | 98% / 14,698 | 融合 生活养成、平台跳跃、解谜 |
| D | [SpaceEngine](https://store.steampowered.com/app/314650/) | Colorful | 96% / 12,617 | 融合 沙盒 |
| D | [Aragami](https://store.steampowered.com/app/280160/) | Anime | 90% / 12,748 |  |
| D | [Scribblenauts Unlimited](https://store.steampowered.com/app/218680/) | Cute | 94% / 11,755 | 融合 沙盒 |
| D | [Viewfinder](https://store.steampowered.com/app/1382070/) | Surreal/Abstract | 94% / 8,505 | 融合 平台跳跃、沙盒、解谜 |
| D | [Bugsnax](https://store.steampowered.com/app/674140/) | Colorful/Cartoony | 97% / 7,380 | 融合 沙盒、解谜 |
| D | [Jazzpunk: Director's Cut](https://store.steampowered.com/app/250260/) | Surreal | 93% / 7,669 |  |
| D | [Attack on Titan 2 - A.O.T.2](https://store.steampowered.com/app/601050/) | Anime | 93% / 7,169 | 融合 动作、角色扮演 |
| D | [Cat Quest II](https://store.steampowered.com/app/914710/) | Cute | 96% / 6,365 | 融合 角色扮演、动作 |
| D | [A Space for the Unbound](https://store.steampowered.com/app/1201270/) | Pixel Graphics/Anime | 98% / 6,215 | 融合 生活养成 |
| D | [MANDAGON](https://store.steampowered.com/app/461560/) | Pixel Graphics | 95% / 5,666 | 融合 平台跳跃 |
| D | [RiME](https://store.steampowered.com/app/493200/) | Colorful | 90% / 5,079 |  |
| D | [Ghost of a Tale](https://store.steampowered.com/app/417290/) | Cute | 92% / 4,903 |  |
| D | [Loddlenaut](https://store.steampowered.com/app/1644940/) | Colorful/Cute | 98% / 4,399 | 融合 生活养成 |
| D | [Arctic Eggs](https://store.steampowered.com/app/2763670/) | Surreal | 97% / 3,691 | 融合 生活养成、沙盒 |
| D | [Supraland Six Inches Under](https://store.steampowered.com/app/1522870/) | Colorful/Cartoon | 96% / 3,490 | 融合 射击、平台跳跃、动作 |
| D | [HOME](https://store.steampowered.com/app/1067900/) | Minimalist | 90% / 3,338 |  |
| D | [THE CORRIDOR](https://store.steampowered.com/app/1347030/) | Surreal | 94% / 3,130 |  |
| D | [Keep Driving](https://store.steampowered.com/app/2756920/) | Pixel Graphics | 95% / 2,770 | 融合 竞速 |
| D | [The Good Time Garden](https://store.steampowered.com/app/1200860/) | Hand-drawn/Surreal | 96% / 2,716 | 融合 恐怖 |
| D | [Cat Quest III](https://store.steampowered.com/app/2305840/) | Cute | 95% / 2,742 | 融合 动作、角色扮演 |
| D | [Song of Nunu: A League of Legends Story](https://store.steampowered.com/app/1333200/) | Stylized/Cartoony | 95% / 2,730 |  |
| D | [Endling - Extinction is Forever](https://store.steampowered.com/app/898890/) | Cute | 95% / 2,685 | 融合 生存 |
| D | [Yaoling: Mythical Journey](https://store.steampowered.com/app/2816950/) | Cute | 92% / 2,628 | 融合 生活养成、策略 |
| D | [Dystopika](https://store.steampowered.com/app/2379910/) | Noir | 97% / 2,491 | 融合 建造经营、沙盒、生活养成 |
| D | [Disney•Pixar Cars](https://store.steampowered.com/app/331160/) | Cute | 91% / 2,573 | 融合 竞速 |
| D | [Swallow the Sea](https://store.steampowered.com/app/1511860/) | Pixel Graphics/Cute | 98% / 2,300 | 融合 生存、恐怖 |
| D | [OH MY GOD, LOOK AT THIS KNIGHT](https://store.steampowered.com/app/781440/) | Cute | 96% / 2,094 | 融合 动作、角色扮演 |
| D | [Broken Reality](https://store.steampowered.com/app/757480/) | Colorful/Surreal | 93% / 2,016 |  |
| E | [Vangers](https://store.steampowered.com/app/264080/) | Surreal/Psychedelic | 94% / 1,268 | 融合 竞速、沙盒 |
| E | [Shakedown: Hawaii](https://store.steampowered.com/app/598730/) | Colorful/Pixel Graphics | 89% / 545 | 融合 射击、沙盒、竞速、建造经营 |

#### 角色扮演（124 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Baldur's Gate 3](https://store.steampowered.com/app/1086940/) | BAFTA 2023，GJ 2023★ | 97% / 760,662 | 融合 叙事 |
| A | [Clair Obscur: Expedition 33](https://store.steampowered.com/app/1903340/) | BAFTA 2025，TGA 2025★，GDCA 2025★，案例库 | 96% / 111,032 |  |
| A | [Metaphor: ReFantazio](https://store.steampowered.com/app/2679460/) | TGA 2024★，案例库，Colorful/Anime | 91% / 34,840 |  |
| A | [FINAL FANTASY IX](https://store.steampowered.com/app/377840/) | DICE 2000★，Anime | 95% / 11,892 |  |
| A | [FINAL FANTASY VIII](https://store.steampowered.com/app/39150/) | DICE 2000★ | 88% / 9,072 | 融合 探索冒险 |
| A | [KINGDOM HEARTS -HD 1.5+2.5 ReMIX-](https://store.steampowered.com/app/2552430/) | GDCA 2002★，DICE 2002，Colorful/Anime | 84% / 7,602 | Steam 为高清合集 |
| A | [RPG Time: The Legend of Wright](https://store.steampowered.com/app/1839510/) | IGF 2023★，案例库，Hand-drawn/Pixel Graphics | 88% / 386 | 融合 解谜、卡牌桌游 |
| A | Genshin Impact（PC（官方启动器 / Epic）/ 主机 / 手机） | ADA 2021★，案例库 | — | 融合 动作、探索冒险；开放世界动作 RPG，手机与键鼠两套 UI |
| A | World of Warcraft（PC（Battle.net）） | GDCA 2004★ | — | 大型多人 RPG，HUD 可由玩家插件改造 |
| B | [Darkest Dungeon](https://store.steampowered.com/app/262060/) | IGF 2016，案例库 | 92% / 149,456 |  |
| B | [Persona 5 Royal](https://store.steampowered.com/app/1687950/) | TGA 2017，案例库，Colorful/Anime | 97% / 103,144 | Steam 为皇家版 |
| B | [FINAL FANTASY VII REMAKE INTERGRADE](https://store.steampowered.com/app/1462040/) | TGA 2020 | 89% / 37,307 |  |
| B | [Diablo IV](https://store.steampowered.com/app/2344520/) | BAFTA 2023 | 66% / 50,302 | 融合 动作 |
| B | [FINAL FANTASY XVI](https://store.steampowered.com/app/2515020/) | BAFTA 2023 | 79% / 23,043 | 融合 动作 |
| B | [FINAL FANTASY X/X-2 HD Remaster](https://store.steampowered.com/app/359870/) | DICE 2003，Anime | 90% / 20,047 | Steam 为 X / X-2 高清合集 |
| B | [Darkest Dungeon II](https://store.steampowered.com/app/1940340/) | IGF 2024，案例库，Stylized/Hand-drawn | 76% / 21,539 |  |
| B | [Eastward](https://store.steampowered.com/app/977880/) | IGF 2020，案例库，Pixel Graphics/Cute | 84% / 15,840 |  |
| B | [OCTOPATH TRAVELER](https://store.steampowered.com/app/921570/) | TGA 2018，案例库，Pixel Graphics/Anime | 86% / 15,188 |  |
| B | [FINAL FANTASY XII THE ZODIAC AGE](https://store.steampowered.com/app/595520/) | DICE 2006，Anime | 90% / 8,608 | 融合 探索冒险；Steam 为黄道时代版 |
| B | [Ni no Kuni Remastered](https://store.steampowered.com/app/798460/) | BAFTA 2013，案例库，Colorful/Anime | 85% / 4,568 | 融合 探索冒险 |
| B | [Jade Empire: Special Edition](https://store.steampowered.com/app/7110/) | DICE 2005 | 75% / 1,939 |  |
| B | [Cris Tales](https://store.steampowered.com/app/1079830/) | IGF 2022，Hand-drawn/Colorful | 65% / 495 |  |
| B | [Stonefly](https://store.steampowered.com/app/1198590/) | IGF 2022，Colorful | 89% / 122 | 融合 探索冒险 |
| B | Guildlings（Apple Arcade） | IGF 2019 | — | 融合 叙事；手机上的轻 RPG，界面模仿手机 |
| B | Fable II（Xbox 360 / Xbox One） | DICE 2008 | — | 融合 动作、生活养成；动作 RPG，带婚恋与置业 |
| C | [Granblue Fantasy: Relink](https://store.steampowered.com/app/881020/) | 案例库，Anime | 90% / 47,999 | 融合 动作 |
| C | [Gujian3（古剑奇谭三）](https://store.steampowered.com/app/994280/) | 案例库，Anime | 86% / 47,845 | 融合 动作、探索冒险 |
| C | [Tales of ARISE](https://store.steampowered.com/app/740130/) | 案例库，Anime | 87% / 34,782 |  |
| C | [Transistor](https://store.steampowered.com/app/237930/) | 案例库，Beautiful | 94% / 30,592 |  |
| C | [CrossCode](https://store.steampowered.com/app/368340/) | 案例库，Pixel Graphics/Anime | 93% / 16,866 |  |
| C | [Sword and Fairy 7（仙剑七）](https://store.steampowered.com/app/1543030/) | 案例库，Anime | 72% / 18,354 | 融合 探索冒险 |
| C | [OCTOPATH TRAVELER II](https://store.steampowered.com/app/1971650/) | 案例库，Pixel Graphics/Anime | 95% / 13,574 |  |
| C | [Minecraft Dungeons](https://store.steampowered.com/app/1672970/) | 案例库，Colorful/Cute | 91% / 13,952 | 融合 动作 |
| C | [Sea of Stars](https://store.steampowered.com/app/1244090/) | 案例库，Pixel Graphics | 89% / 12,698 |  |
| C | [Lunacid](https://store.steampowered.com/app/1745510/) | 案例库，Stylized | 91% / 8,827 |  |
| C | [Tower of Fantasy](https://store.steampowered.com/app/2064650/) | 案例库，Cartoony/Anime | 69% / 10,970 | 融合 探索冒险、平台跳跃 |
| C | [Atelier Ryza](https://store.steampowered.com/app/1121560/) | 案例库，Anime/Cute | 87% / 8,414 |  |
| C | [Hylics](https://store.steampowered.com/app/397740/) | 案例库，Stylized/Hand-drawn | 98% / 6,696 |  |
| C | [Chained Echoes](https://store.steampowered.com/app/1229240/) | 案例库，Pixel Graphics/Anime | 90% / 6,757 |  |
| C | [侠客风云传 Tale of Wuxia](https://store.steampowered.com/app/377530/) | 案例库 | 76% / 7,258 | 融合 探索冒险、生活养成 |
| C | [Bug Fables](https://store.steampowered.com/app/1082710/) | 案例库，Colorful/Cute | 97% / 5,444 |  |
| C | [Eiyuden Chronicle](https://store.steampowered.com/app/1658280/) | 案例库，Pixel Graphics/Anime | 77% / 3,921 |  |
| C | [DRAGON QUEST III HD-2D Remake](https://store.steampowered.com/app/2701660/) | 案例库，Colorful/Pixel Graphics | 75% / 3,695 |  |
| C | [TRIANGLE STRATEGY](https://store.steampowered.com/app/1850510/) | 案例库，Pixel Graphics | 81% / 2,962 | 融合 策略 |
| C | [Cryptmaster](https://store.steampowered.com/app/1885110/) | 案例库，Stylized/Surreal | 95% / 1,839 |  |
| C | Paper Mario 系列（Nintendo 各主机） | 案例库 | — | 融合 平台跳跃、解谜；纸片风回合制 RPG |
| D | [Persona 4 Golden](https://store.steampowered.com/app/1113000/) | Anime | 97% / 78,346 |  |
| D | [Persona 3 Reload](https://store.steampowered.com/app/2161700/) | Anime | 94% / 42,567 |  |
| D | [Touhou Mystia's Izakaya](https://store.steampowered.com/app/1584090/) | Pixel Graphics/Anime | 98% / 28,249 | 融合 生活养成 |
| D | [Crypt of the NecroDancer](https://store.steampowered.com/app/247080/) | Pixel Graphics | 96% / 25,116 |  |
| D | [Tales of Berseria](https://store.steampowered.com/app/429660/) | Anime | 92% / 18,408 |  |
| D | [ATLYSS](https://store.steampowered.com/app/2768430/) | Stylized/Cute | 97% / 16,773 |  |
| D | [LISA: The Painful](https://store.steampowered.com/app/335670/) | Pixel Graphics | 96% / 14,593 | 融合 恐怖、叙事 |
| D | [Grimm's Hollow](https://store.steampowered.com/app/1170880/) | Pixel Graphics/Cute | 99% / 13,883 |  |
| D | [Symphony of War: The Nephilim Saga](https://store.steampowered.com/app/1488200/) | Pixel Graphics | 95% / 12,952 | 融合 策略 |
| D | [Eternal Senia](https://store.steampowered.com/app/351640/) | Anime/Cute | 98% / 11,948 |  |
| D | [Valkyria Chronicles](https://store.steampowered.com/app/294860/) | Anime | 90% / 12,876 | 融合 策略 |
| D | [Hyperdimension Neptunia Re;Birth1](https://store.steampowered.com/app/282900/) | Anime/Cute | 94% / 12,106 |  |
| D | [Monster Sanctuary](https://store.steampowered.com/app/814370/) | Pixel Graphics | 92% / 11,439 | 融合 平台跳跃、策略 |
| D | [Living With Sister: Monochrome Fantasy](https://store.steampowered.com/app/2429860/) | Anime/Cute | 97% / 10,394 | 融合 射击 |
| D | [Digimon Story Cyber Sleuth: Complete Edition](https://store.steampowered.com/app/1042550/) | Anime/Cute | 91% / 10,959 |  |
| D | [Shin Megami Tensei V: Vengeance](https://store.steampowered.com/app/1875830/) | Anime | 93% / 9,654 | 融合 叙事、探索冒险 |
| D | [The Legend of Heroes: Trails in the Sky](https://store.steampowered.com/app/251150/) | Anime | 94% / 9,563 |  |
| D | [Cassette Beasts](https://store.steampowered.com/app/1321440/) | Cartoony | 95% / 9,298 |  |
| D | [Chronicon](https://store.steampowered.com/app/375480/) | Pixel Graphics | 94% / 9,315 |  |
| D | [RPG Maker MV](https://store.steampowered.com/app/363890/) | Pixel Graphics/Anime | 91% / 8,290 |  |
| D | [FANTASY LIFE i: The Girl Who Steals Time](https://store.steampowered.com/app/2993780/) | Cute | 92% / 7,594 |  |
| D | [Recettear: An Item Shop's Tale](https://store.steampowered.com/app/70400/) | Anime/Cute | 96% / 7,238 |  |
| D | [Drova - Forsaken Kin](https://store.steampowered.com/app/1585180/) | Pixel Graphics | 95% / 6,908 | 融合 探索冒险 |
| D | [FINAL FANTASY](https://store.steampowered.com/app/1173770/) | Pixel Graphics | 95% / 6,813 |  |
| D | [WitchSpring R](https://store.steampowered.com/app/1958220/) | Anime/Cute | 97% / 6,536 |  |
| D | [Elin](https://store.steampowered.com/app/2135150/) | Pixel Graphics | 94% / 6,575 | 融合 探索冒险 |
| D | [In Stars And Time](https://store.steampowered.com/app/1677310/) | Stylized | 98% / 6,184 |  |
| D | [Soda Dungeon](https://store.steampowered.com/app/564710/) | Pixel Graphics | 94% / 6,164 |  |
| D | [Fate/Samurai Remnant](https://store.steampowered.com/app/1902690/) | Anime | 91% / 6,285 | 融合 动作 |
| D | [Rakuen](https://store.steampowered.com/app/559210/) | Colorful/Pixel Graphics | 96% / 5,848 | 融合 解谜 |
| D | [The Legend of Heroes: Trails of Cold Steel](https://store.steampowered.com/app/538680/) | Anime/Cute | 95% / 5,445 |  |
| D | [Soda Dungeon 2](https://store.steampowered.com/app/946050/) | Pixel Graphics | 94% / 5,419 |  |
| D | [Trials of Mana](https://store.steampowered.com/app/924980/) | Anime | 92% / 5,450 |  |
| D | [RPG Maker VX Ace](https://store.steampowered.com/app/220700/) | Anime | 94% / 4,869 | 融合 沙盒 |
| D | [Word Game: Episode 0](https://store.steampowered.com/app/1507970/) | Pixel Graphics/Minimalist | 99% / 4,538 | 融合 叙事、平台跳跃、探索冒险 |
| D | [Ring of Pain](https://store.steampowered.com/app/998740/) | Stylized | 92% / 4,805 | 融合 卡牌桌游 |
| D | [Feign](https://store.steampowered.com/app/1436990/) | Cute | 91% / 4,810 | 融合 策略、解谜 |
| D | [LiEat](https://store.steampowered.com/app/373770/) | Hand-drawn/Pixel Graphics | 96% / 4,445 |  |
| D | [Felvidek](https://store.steampowered.com/app/2299900/) | Hand-drawn/Pixel Graphics | 99% / 4,037 |  |
| D | [One Way Heroics](https://store.steampowered.com/app/266210/) | Cute | 94% / 4,055 |  |
| D | [Costume Quest](https://store.steampowered.com/app/115100/) | Cute | 94% / 3,901 | 融合 策略 |
| D | [Sword and Fairy](https://store.steampowered.com/app/1546570/) | Colorful | 97% / 3,737 |  |
| D | [The Legend of Heroes: Trails in the Sky SC](https://store.steampowered.com/app/251290/) | Anime | 98% / 3,719 |  |
| D | [FINAL FANTASY VI](https://store.steampowered.com/app/1173820/) | Pixel Graphics | 91% / 3,811 |  |
| D | [Death Trash](https://store.steampowered.com/app/941460/) | Pixel Graphics | 93% / 3,533 | 融合 探索冒险、叙事 |
| D | [Hyperdimension Neptunia Re;Birth3 V Generation](https://store.steampowered.com/app/353270/) | Anime/Cute | 94% / 3,449 |  |
| D | [Atelier Ryza 2: Lost Legends & the Secret Fairy](https://store.steampowered.com/app/1257290/) | Cute | 91% / 3,570 |  |
| D | [STAR OCEAN THE SECOND STORY R](https://store.steampowered.com/app/2238900/) | Pixel Graphics | 94% / 3,371 |  |
| D | [Ys Origin](https://store.steampowered.com/app/207350/) | Anime | 93% / 3,385 |  |
| D | [Epic Battle Fantasy 4](https://store.steampowered.com/app/265610/) | Anime | 97% / 3,158 |  |
| D | [Megadimension Neptunia VII](https://store.steampowered.com/app/460120/) | Anime/Cute | 94% / 3,204 |  |
| D | [Hyperdimension Neptunia Re;Birth2: Sisters Generation](https://store.steampowered.com/app/351710/) | Anime/Cute | 92% / 3,259 |  |
| D | [Nexomon: Extinction](https://store.steampowered.com/app/1196630/) | Colorful | 91% / 3,237 |  |
| D | [Hylics 2](https://store.steampowered.com/app/1286710/) | Stylized/Surreal | 97% / 2,969 |  |
| D | [Just a To the Moon Series Beach Episode](https://store.steampowered.com/app/2159210/) | Pixel Graphics | 98% / 2,921 | 融合 叙事、探索冒险 |
| D | [DELTARUNE](https://store.steampowered.com/app/1671210/) | Pixel Graphics | 99% / 2,835 | 融合 动作 |
| D | [SKALD: Against the Black Priory](https://store.steampowered.com/app/1069160/) | Minimalist | 94% / 2,958 | 融合 策略、恐怖、叙事、探索冒险 |
| D | [Duck Simulator 2](https://store.steampowered.com/app/1808800/) | Surreal | 96% / 2,802 | 融合 解谜 |
| D | [Magical Girl Celesphonia](https://store.steampowered.com/app/1786790/) | Anime | 96% / 2,804 |  |
| D | [The Legend of Heroes: Trails of Cold Steel III](https://store.steampowered.com/app/991270/) | Anime | 92% / 2,940 |  |
| D | [The Legend of Heroes: Trails of Cold Steel II](https://store.steampowered.com/app/748490/) | Anime | 94% / 2,833 |  |
| D | [Path of Achra](https://store.steampowered.com/app/2128270/) | Pixel Graphics | 98% / 2,578 |  |
| D | [Ambrosia](https://store.steampowered.com/app/1078350/) | Anime | 94% / 2,544 |  |
| D | [Doom & Destiny](https://store.steampowered.com/app/318130/) | Pixel Graphics | 96% / 2,392 |  |
| D | [Atelier Sophie 2: The Alchemist of the Mysterious Dream](https://store.steampowered.com/app/1621310/) | Anime/Cute | 95% / 2,330 |  |
| D | [Legend of Keepers: Prologue](https://store.steampowered.com/app/1151080/) | Pixel Graphics | 92% / 2,369 |  |
| D | [FINAL FANTASY IV](https://store.steampowered.com/app/1173800/) | Pixel Graphics | 91% / 2,367 |  |
| D | [Xuan-Yuan Sword: The Scar of Sky](https://store.steampowered.com/app/1638220/) | Pixel Graphics | 93% / 2,280 |  |
| D | [Epic Battle Fantasy 3](https://store.steampowered.com/app/521200/) | Anime | 97% / 2,188 |  |
| D | [10,000,000](https://store.steampowered.com/app/227580/) | Pixel Graphics | 90% / 2,303 | 融合 解谜 |
| D | [Crystal Project](https://store.steampowered.com/app/1637730/) | Voxel | 93% / 2,237 |  |
| D | [FINAL FANTASY III](https://store.steampowered.com/app/1173790/) | Pixel Graphics | 93% / 2,219 |  |
| D | [Elise the Devil](https://store.steampowered.com/app/711990/) | Anime | 93% / 2,221 |  |
| D | [The Legend of Heroes: Trails of Cold Steel IV](https://store.steampowered.com/app/1198090/) | Anime | 92% / 2,231 |  |
| D | [Ara Fell: Enhanced Edition](https://store.steampowered.com/app/440540/) | Pixel Graphics | 94% / 2,147 | 融合 探索冒险 |
| D | [The Legend of Heroes: Trails in the Sky the 3rd](https://store.steampowered.com/app/436670/) | Anime | 94% / 2,133 |  |
| D | [Atelier Ryza 3: Alchemist of the End & the Secret Key](https://store.steampowered.com/app/1999770/) | Anime/Cute | 91% / 2,052 | 融合 探索冒险 |
| D | [Learn Japanese To Survive! Hiragana Battle](https://store.steampowered.com/app/438270/) | Anime | 91% / 2,058 |  |

#### 动作（172 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Black Myth: Wukong](https://store.steampowered.com/app/2358720/) | BAFTA 2024，TGA 2024，GDCA 2024★，案例库 | 97% / 1,150,098 |  |
| A | [ELDEN RING](https://store.steampowered.com/app/1245620/) | TGA 2024，BAFTA 2022，TGA 2022★，案例库 | 93% / 1,056,677 | 融合 角色扮演、探索冒险 |
| A | [Hades](https://store.steampowered.com/app/1145360/) | BAFTA 2020★，TGA 2020，DICE 2020，案例库，Hand-drawn/Anime | 98% / 279,741 |  |
| A | [God of War](https://store.steampowered.com/app/1593500/) | BAFTA 2018，TGA 2018，DICE 2005 | 96% / 158,017 | 融合 探索冒险 |
| A | [Devil May Cry 5](https://store.steampowered.com/app/601150/) | GJ 2019★，Stylized/Anime | 96% / 146,133 |  |
| A | [Castle Crashers](https://store.steampowered.com/app/204360/) | IGF 2007★，Cartoony/Cute | 96% / 125,598 |  |
| A | [Lies of P](https://store.steampowered.com/app/1627720/) | TGA 2023，ADA 2024★，案例库 | 92% / 52,485 | 融合 角色扮演、探索冒险 |
| A | [God of War Ragnarök](https://store.steampowered.com/app/2322010/) | BAFTA 2022，TGA 2022，DICE 2022★ | 86% / 31,388 | 融合 角色扮演 |
| A | [Hyper Light Drifter](https://store.steampowered.com/app/257850/) | IGF 2017★，IGF 2015，案例库，Colorful/Pixel Graphics | 93% / 17,843 | 融合 探索冒险 |
| A | [TUNIC](https://store.steampowered.com/app/553420/) | IGF 2023，BAFTA 2022★，案例库，Stylized/Colorful | 92% / 15,181 | 融合 角色扮演、平台跳跃、探索冒险 |
| A | [Sayonara Wild Hearts](https://store.steampowered.com/app/1122720/) | BAFTA 2019★，TGA 2019，案例库，Beautiful/Stylized | 97% / 8,348 | 融合 探索冒险 |
| A | Uncharted 3: Drake's Deception（PS3 / PS4） | BAFTA 2011，GDCA 2011★，DICE 2011★ | — | 融合 射击、平台跳跃；电影化动作冒险：掩体射击 + 攀爬 |
| A | God of War III（PS3 / PS4） | BAFTA 2010★，DICE 2010 | — |  |
| A | Jet Set Radio（Dreamcast（PC 版在 Steam 美区搜索不到，待核）） | GDCA 2000★，DICE 2000 | — | 融合 平台跳跃；街头滑轮 + 涂鸦动作；北美原名 Jet Grind Radio |
| A | Shadow of the Colossus（PS2 / PS4） | GDCA 2005★，DICE 2005★ | — | 融合 探索冒险、解谜；只有 Boss 战与探索，HUD 极简 |
| A | Uncharted 2: Among Thieves（PS3 / PS4） | GDCA 2009★，DICE 2009★ | — | 融合 射击、平台跳跃；电影化动作冒险：掩体射击 + 攀爬 |
| B | [Sekiro](https://store.steampowered.com/app/814380/) | TGA 2019，案例库 | 95% / 322,234 | 融合 探索冒险 |
| B | [Dead Cells](https://store.steampowered.com/app/588650/) | IGF 2018，案例库，Pixel Graphics | 97% / 168,464 | 融合 平台跳跃 |
| B | [Beat Saber](https://store.steampowered.com/app/620980/) | IGF 2019，Anime | 96% / 74,612 |  |
| B | [Batman: Arkham City - Game of the Year Edition](https://store.steampowered.com/app/200260/) | BAFTA 2011，DICE 2011，Comic Book | 96% / 68,636 | 融合 探索冒险 |
| B | [Hades II](https://store.steampowered.com/app/1145350/) | TGA 2025，案例库，Hand-drawn | 95% / 64,132 | 融合 角色扮演 |
| B | [STAR WARS Jedi: Survivor](https://store.steampowered.com/app/1774580/) | DICE 2023 | 69% / 67,054 | 融合 探索冒险 |
| B | [Hi-Fi RUSH](https://store.steampowered.com/app/1817230/) | BAFTA 2023，TGA 2023，案例库，Stylized/Colorful | 97% / 33,339 |  |
| B | [Just Shapes & Beats](https://store.steampowered.com/app/531510/) | IGF 2019，案例库，Colorful | 98% / 22,150 |  |
| B | [Assassin's Creed: Director's Cut Edition](https://store.steampowered.com/app/15100/) | DICE 2007 | 81% / 21,897 | 融合 探索冒险 |
| B | [Kena: Bridge of Spirits](https://store.steampowered.com/app/1954200/) | IGF 2022，TGA 2021，DICE 2021，案例库 | 92% / 15,240 | 融合 探索冒险 |
| B | [Returnal](https://store.steampowered.com/app/1649240/) | BAFTA 2021 | 82% / 8,446 |  |
| B | [Crawl](https://store.steampowered.com/app/293780/) | IGF 2015，Pixel Graphics | 95% / 7,039 | 融合 角色扮演、恐怖 |
| B | [ENSLAVED: Odyssey to the West Premium Edition](https://store.steampowered.com/app/245280/) | DICE 2010 | 86% / 7,628 | 融合 平台跳跃、探索冒险 |
| B | [Going Under](https://store.steampowered.com/app/1154810/) | IGF 2021，Colorful/Cute | 91% / 3,718 |  |
| B | [Moss VR](https://store.steampowered.com/app/846470/) | IGF 2019，Cute | 95% / 3,229 | 融合 平台跳跃 |
| B | [Clash: Artifacts of Chaos](https://store.steampowered.com/app/1430680/) | IGF 2024，Stylized/Colorful | 92% / 1,117 | 融合 角色扮演 |
| B | [Judero](https://store.steampowered.com/app/1960900/) | IGF 2025，Surreal/Psychedelic | 99% / 296 |  |
| B | [Creature in the Well](https://store.steampowered.com/app/852300/) | IGF 2020 | 79% / 337 | 融合 角色扮演 |
| B | [NIDUS](https://store.steampowered.com/app/2372170/) | IGF 2024，Hand-drawn/Surreal | 96% / 209 | 融合 射击 |
| B | [Bloodroots](https://store.steampowered.com/app/820540/) | IGF 2021，Cartoon | 89% / 214 |  |
| B | [Swordship](https://store.steampowered.com/app/1804270/) | IGF 2023，Stylized/Colorful | 92% / 121 | 融合 策略 |
| B | [Fuzz Dungeon](https://store.steampowered.com/app/1506080/) | IGF 2022，Stylized/Hand-drawn | 100% / 67 | 融合 探索冒险、解谜 |
| B | Bloodborne（PS4） | TGA 2015，案例库 | — | 融合 角色扮演、恐怖；类魂动作 RPG，哥特恐怖 |
| B | ECHO（Ultra Ultra）（PC / PS4（Steam 美区搜索不到，待核）） | IGF 2018 | — | 融合 解谜；潜行动作：敌人会学玩家的行为 |
| B | Forkride Grilltime Sloth（待核） | IGF 2016 | — | 资料不足，品类待核 |
| B | Ghost of Yōtei（PS5） | BAFTA 2025，TGA 2025，DICE 2025 | — | 融合 探索冒险；开放世界武士动作 |
| B | Peter Jackson's King Kong（多平台（已下架）） | DICE 2005 | — | 融合 射击；刻意几乎不用 HUD |
| B | Ultimate Spider-Man（PS2 / GameCube / Xbox） | DICE 2005 | — | 漫画分格式过场与 UI |
| B | Heavenly Sword（PS3） | DICE 2007 | — |  |
| C | [Hotline Miami](https://store.steampowered.com/app/219150/) | 案例库，Pixel Graphics/Surreal | 97% / 106,657 | 融合 射击 |
| C | [DRAGON BALL FighterZ](https://store.steampowered.com/app/678950/) | 案例库，Comic Book/Anime | 90% / 72,976 |  |
| C | [Ghostrunner](https://store.steampowered.com/app/1139900/) | 案例库 | 91% / 63,149 |  |
| C | [GUILTY GEAR -STRIVE-](https://store.steampowered.com/app/1384160/) | 案例库，Anime | 88% / 59,382 |  |
| C | [ENDER LILIES](https://store.steampowered.com/app/1369630/) | 案例库，Hand-drawn/Anime | 94% / 39,533 | 融合 平台跳跃 |
| C | [Bastion](https://store.steampowered.com/app/107100/) | 案例库，Colorful | 95% / 37,392 | 融合 角色扮演 |
| C | [暖雪 Warm Snow](https://store.steampowered.com/app/1296830/) | 案例库，Anime | 93% / 37,007 |  |
| C | [Skullgirls 2nd Encore](https://store.steampowered.com/app/245170/) | 案例库，Stylized/Hand-drawn | 73% / 40,853 |  |
| C | [Sifu](https://store.steampowered.com/app/2138710/) | 案例库 | 93% / 21,129 |  |
| C | [Children of Morta](https://store.steampowered.com/app/330020/) | 案例库，Pixel Graphics | 89% / 20,966 | 融合 角色扮演 |
| C | [Death's Door](https://store.steampowered.com/app/894020/) | 案例库，Colorful/Cartoony | 93% / 18,668 | 融合 平台跳跃、角色扮演 |
| C | [Moonlighter](https://store.steampowered.com/app/606150/) | 案例库，Pixel Graphics | 82% / 19,913 | 融合 角色扮演 |
| C | [SCARLET NEXUS](https://store.steampowered.com/app/775500/) | 案例库，Anime | 81% / 17,125 | 融合 角色扮演 |
| C | [Furi](https://store.steampowered.com/app/423230/) | 案例库，Stylized/Anime | 91% / 12,204 |  |
| C | [GUILTY GEAR Xrd REV 2](https://store.steampowered.com/app/520440/) | 案例库，Anime/Cute | 94% / 10,592 |  |
| C | [Eastern Exorcist（斩妖行）](https://store.steampowered.com/app/1120810/) | 案例库，Hand-drawn | 85% / 6,490 | 融合 平台跳跃、角色扮演 |
| C | [The Legend of Tianding](https://store.steampowered.com/app/1406850/) | 案例库，Stylized/Comic Book | 94% / 3,967 |  |
| C | [APE OUT](https://store.steampowered.com/app/447150/) | 案例库，Stylized/Surreal | 95% / 3,526 |  |
| C | [The Last Soldier of the Ming Dynasty](https://store.steampowered.com/app/2494450/) | 案例库，Stylized | 81% / 477 |  |
| C | Muramasa: The Demon Blade（Wii / PS Vita） | 案例库 | — | 融合 角色扮演；横版动作 RPG，日本画风 |
| D | [The Binding of Isaac: Rebirth](https://store.steampowered.com/app/250900/) | Pixel Graphics | 97% / 343,420 | 融合 角色扮演 |
| D | [Vampire Survivors](https://store.steampowered.com/app/1794680/) | Pixel Graphics | 99% / 250,334 |  |
| D | [Muse Dash](https://store.steampowered.com/app/774171/) | Colorful/Anime | 90% / 119,429 |  |
| D | [Enter the Gungeon](https://store.steampowered.com/app/311690/) | Pixel Graphics | 96% / 85,562 |  |
| D | [NARUTO SHIPPUDEN: Ultimate Ninja STORM 4](https://store.steampowered.com/app/349040/) | Anime | 91% / 88,502 | 融合 探索冒险 |
| D | [Batman: Arkham Asylum Game of the Year Edition](https://store.steampowered.com/app/35140/) | Comic Book | 96% / 73,651 | 融合 探索冒险 |
| D | [A Dance of Fire and Ice](https://store.steampowered.com/app/977950/) | Colorful/Psychedelic | 94% / 73,471 |  |
| D | [Hotline Miami 2: Wrong Number](https://store.steampowered.com/app/274170/) | Pixel Graphics | 94% / 66,634 | 融合 射击 |
| D | [Skul: The Hero Slayer](https://store.steampowered.com/app/1147560/) | Pixel Graphics | 93% / 54,901 | 融合 平台跳跃 |
| D | [DRAGON BALL Z: KAKAROT](https://store.steampowered.com/app/851850/) | Anime | 93% / 54,680 | 融合 角色扮演、探索冒险 |
| D | [DRAGON BALL XENOVERSE 2](https://store.steampowered.com/app/454650/) | Anime | 90% / 52,883 |  |
| D | [HoloCure - Save the Fans!](https://store.steampowered.com/app/2420510/) | Pixel Graphics/Anime | 99% / 37,986 |  |
| D | [Rivals of Aether](https://store.steampowered.com/app/383980/) | Pixel Graphics | 96% / 35,826 |  |
| D | [Clone Drone in the Danger Zone](https://store.steampowered.com/app/597170/) | Voxel | 97% / 33,067 |  |
| D | [Bright Memory](https://store.steampowered.com/app/955050/) | Anime | 91% / 32,728 | 融合 射击 |
| D | [BlazBlue Entropy Effect](https://store.steampowered.com/app/2273430/) | Pixel Graphics/Anime | 95% / 30,290 | 融合 平台跳跃 |
| D | [Paint the Town Red](https://store.steampowered.com/app/337320/) | Voxel | 96% / 29,576 | 融合 沙盒 |
| D | [Halls of Torment](https://store.steampowered.com/app/2218750/) | Pixel Graphics | 96% / 29,019 |  |
| D | [Risk of Rain (2013)](https://store.steampowered.com/app/248820/) | Pixel Graphics | 93% / 29,626 | 融合 平台跳跃 |
| D | [20 Minutes Till Dawn](https://store.steampowered.com/app/1966900/) | Pixel Graphics | 92% / 27,719 |  |
| D | [ICEY](https://store.steampowered.com/app/553640/) | Anime | 90% / 26,926 | 融合 平台跳跃 |
| D | [Super Hexagon](https://store.steampowered.com/app/221640/) | Minimalist | 97% / 24,676 |  |
| D | [Batman: Arkham Asylum Game of the Year Edition](https://store.steampowered.com/app/35010/) | Comic Book | 96% / 22,483 | 融合 探索冒险 |
| D | [Streets of Rogue](https://store.steampowered.com/app/512900/) | Pixel Graphics | 96% / 21,933 |  |
| D | [AI LIMIT](https://store.steampowered.com/app/2407270/) | Anime | 93% / 22,025 | 融合 角色扮演 |
| D | [Soulstone Survivors](https://store.steampowered.com/app/2066020/) | Colorful | 91% / 21,828 |  |
| D | [Wizard of Legend](https://store.steampowered.com/app/445980/) | Pixel Graphics | 91% / 20,520 |  |
| D | [Bopl Battle](https://store.steampowered.com/app/1686940/) | Cartoony | 97% / 19,125 | 融合 沙盒、策略 |
| D | [Death Must Die](https://store.steampowered.com/app/2334730/) | Pixel Graphics | 91% / 20,327 |  |
| D | [ONE PIECE: PIRATE WARRIORS 4](https://store.steampowered.com/app/1089090/) | Anime | 92% / 19,980 |  |
| D | [Hatsune Miku: Project DIVA Mega Mix+](https://store.steampowered.com/app/1761390/) | Anime/Cute | 94% / 19,033 |  |
| D | [Nuclear Throne](https://store.steampowered.com/app/242680/) | Pixel Graphics | 96% / 17,979 |  |
| D | [Iron Snout](https://store.steampowered.com/app/424280/) | Cartoon | 98% / 17,346 |  |
| D | [Another Crab's Treasure](https://store.steampowered.com/app/1887840/) | Cartoony | 94% / 17,139 | 融合 角色扮演、平台跳跃、探索冒险 |
| D | [Devil May Cry HD Collection](https://store.steampowered.com/app/631510/) | Stylized | 93% / 17,118 |  |
| D | [Dome Keeper](https://store.steampowered.com/app/1637320/) | Pixel Graphics | 92% / 16,212 | 融合 策略、建造经营 |
| D | [Ultra Street Fighter IV](https://store.steampowered.com/app/45760/) | Anime | 90% / 15,709 |  |
| D | [Teenage Mutant Ninja Turtles: Shredder's Revenge](https://store.steampowered.com/app/1361510/) | Colorful/Pixel Graphics | 94% / 13,748 | 融合 平台跳跃 |
| D | [Everhood](https://store.steampowered.com/app/1229380/) | Pixel Graphics/Surreal | 95% / 13,397 |  |
| D | [DR LIVESEY ROM AND DEATH EDITION](https://store.steampowered.com/app/2181930/) | Hand-drawn/Cartoon | 95% / 13,336 |  |
| D | [Timberman](https://store.steampowered.com/app/398710/) | Pixel Graphics | 93% / 11,336 |  |
| D | [BlazBlue Centralfiction](https://store.steampowered.com/app/586140/) | Anime | 94% / 11,027 | 融合 叙事 |
| D | [Trombone Champ](https://store.steampowered.com/app/1059990/) | Colorful/Cartoon | 98% / 9,777 |  |
| D | [Cat Quest](https://store.steampowered.com/app/593280/) | Cute | 95% / 9,726 | 融合 探索冒险、角色扮演 |
| D | [Death Road to Canada](https://store.steampowered.com/app/252610/) | Pixel Graphics | 93% / 9,385 | 融合 生存 |
| D | [Dungreed](https://store.steampowered.com/app/753420/) | Pixel Graphics | 93% / 9,293 | 融合 平台跳跃 |
| D | [Rabbit and Steel](https://store.steampowered.com/app/2132850/) | Anime/Cute | 97% / 8,711 |  |
| D | [UnderMine](https://store.steampowered.com/app/656350/) | Pixel Graphics | 91% / 9,058 | 融合 角色扮演 |
| D | [Juice Galaxy](https://store.steampowered.com/app/1708150/) | Psychedelic | 98% / 8,330 |  |
| D | [DEEP SPACE WAIFU](https://store.steampowered.com/app/639790/) | Anime | 97% / 7,474 | 融合 射击 |
| D | [Star Fetchers](https://store.steampowered.com/app/1178030/) | Pixel Graphics | 97% / 7,160 | 融合 探索冒险 |
| D | [GUILTY GEAR XX ACCENT CORE PLUS R](https://store.steampowered.com/app/348550/) | Anime | 96% / 7,193 |  |
| D | [Astral Ascent](https://store.steampowered.com/app/1280930/) | Hand-drawn/Anime | 95% / 6,914 |  |
| D | [ULTIMATE MARVEL VS. CAPCOM 3](https://store.steampowered.com/app/357190/) | Comic Book | 92% / 6,882 |  |
| D | [Bloody Hell](https://store.steampowered.com/app/2056220/) | Pixel Graphics | 98% / 5,963 |  |
| D | [Ember Knights](https://store.steampowered.com/app/1135230/) | Pixel Graphics | 94% / 6,189 |  |
| D | [EZ2ON REBOOT : R](https://store.steampowered.com/app/1477590/) | Anime | 90% / 5,822 |  |
| D | [Atomicrops](https://store.steampowered.com/app/757320/) | Colorful/Pixel Graphics | 92% / 5,660 |  |
| D | [SENRAN KAGURA ESTIVAL VERSUS](https://store.steampowered.com/app/502800/) | Anime/Cute | 94% / 5,309 |  |
| D | [Boneraiser Minions](https://store.steampowered.com/app/1944570/) | Pixel Graphics | 96% / 5,126 |  |
| D | [SUPER CHICKEN JUMPER](https://store.steampowered.com/app/584640/) | Colorful/Pixel Graphics | 96% / 4,982 |  |
| D | [THE KING OF FIGHTERS 2002 UNLIMITED MATCH](https://store.steampowered.com/app/222440/) | Pixel Graphics/Anime | 95% / 4,710 |  |
| D | [Touhou Tenkuushou ~ Hidden Star in Four Seasons.](https://store.steampowered.com/app/745880/) | Cute | 99% / 4,496 | 融合 射击 |
| D | [Melty Blood Actress Again Current Code](https://store.steampowered.com/app/411370/) | Anime/Cute | 93% / 4,549 | 融合 叙事 |
| D | [Fate/EXTELLA LINK](https://store.steampowered.com/app/622220/) | Anime | 93% / 4,539 | 融合 角色扮演、叙事 |
| D | [LUFTRAUSERS](https://store.steampowered.com/app/233150/) | Pixel Graphics | 91% / 4,426 | 融合 射击 |
| D | [Fate/EXTELLA](https://store.steampowered.com/app/511680/) | Anime/Cute | 91% / 4,334 |  |
| D | [Spin Rhythm XD](https://store.steampowered.com/app/1058830/) | Colorful | 97% / 4,043 |  |
| D | [Seraph's Last Stand](https://store.steampowered.com/app/1919460/) | Pixel Graphics | 94% / 4,118 | 融合 卡牌桌游 |
| D | [SENRAN KAGURA SHINOVI VERSUS](https://store.steampowered.com/app/411830/) | Anime/Cute | 95% / 3,871 |  |
| D | [UNDER NIGHT IN-BIRTH Exe:Late[cl-r]](https://store.steampowered.com/app/801630/) | Anime | 94% / 3,798 | 融合 叙事 |
| D | [Oh...Sir!! The Insult Simulator](https://store.steampowered.com/app/512250/) | Pixel Graphics | 91% / 3,702 |  |
| D | [En Garde!](https://store.steampowered.com/app/1654660/) | Stylized/Colorful | 92% / 3,597 |  |
| D | [TowerFall Ascension](https://store.steampowered.com/app/251470/) | Pixel Graphics | 95% / 3,410 | 融合 平台跳跃 |
| D | [Touhou Hero of Ice Fairy: Prologue](https://store.steampowered.com/app/1715460/) | Anime/Cute | 97% / 3,307 | 融合 射击、角色扮演 |
| D | [Picayune Dreams](https://store.steampowered.com/app/2088840/) | Pixel Graphics/Psychedelic | 99% / 3,219 |  |
| D | [OTXO](https://store.steampowered.com/app/1608640/) | Noir | 93% / 3,400 | 融合 射击 |
| D | [Timberman VS](https://store.steampowered.com/app/943380/) | Pixel Graphics | 91% / 3,402 |  |
| D | [Windowkill](https://store.steampowered.com/app/2726450/) | Minimalist | 96% / 3,057 |  |
| D | [Saint Seiya: Soldiers' Soul](https://store.steampowered.com/app/348710/) | Anime | 93% / 3,104 |  |
| D | [Princess Remedy in a World of Hurt](https://store.steampowered.com/app/407900/) | Pixel Graphics/Cute | 98% / 2,862 | 融合 射击 |
| D | [Star of Providence](https://store.steampowered.com/app/603960/) | Pixel Graphics | 97% / 2,877 | 融合 射击 |
| D | [Hyperdimension Neptunia U: Action Unleashed](https://store.steampowered.com/app/387340/) | Anime/Cute | 92% / 2,994 | 融合 角色扮演 |
| D | [Marfusha:Sentinel Girls ](https://store.steampowered.com/app/1456820/) | Pixel Graphics/Anime | 94% / 2,890 | 融合 射击 |
| D | [Akane](https://store.steampowered.com/app/884260/) | Pixel Graphics | 96% / 2,789 |  |
| D | [Realm of Ink](https://store.steampowered.com/app/2597080/) | Stylized/Colorful | 93% / 2,854 |  |
| D | [BlazBlue: Chronophantasma Extend](https://store.steampowered.com/app/388750/) | Anime | 91% / 2,836 | 融合 叙事 |
| D | [THE KING OF FIGHTERS '98 ULTIMATE MATCH FINAL EDITION](https://store.steampowered.com/app/222420/) | Pixel Graphics/Anime | 91% / 2,820 |  |
| D | [Full Metal Furies](https://store.steampowered.com/app/416600/) | Pixel Graphics | 91% / 2,819 | 融合 角色扮演 |
| D | [Wrestling Empire](https://store.steampowered.com/app/1620340/) | Colorful/Cartoony | 95% / 2,637 | 融合 叙事 |
| D | [GUILTY GEAR Xrd -SIGN-](https://store.steampowered.com/app/376300/) | Anime | 91% / 2,704 |  |
| D | [Frog Fractions: Game of the Decade Edition](https://store.steampowered.com/app/1194840/) | Surreal | 95% / 2,586 | 融合 探索冒险 |
| D | [TouHou Makuka Sai ~ Fantastic Danmaku Festival Part II](https://store.steampowered.com/app/1031480/) | Anime | 97% / 2,488 | 融合 射击 |
| D | [Touhou Blooming Chaos 2](https://store.steampowered.com/app/1260810/) | Pixel Graphics/Anime | 93% / 2,542 |  |
| D | [Geometry Arena](https://store.steampowered.com/app/1255650/) | Minimalist | 97% / 2,386 | 融合 射击 |
| D | [Boyfriend Dungeon](https://store.steampowered.com/app/674930/) | Cute | 92% / 2,471 | 融合 角色扮演、叙事 |
| D | [SENRAN KAGURA Burst Re:Newal](https://store.steampowered.com/app/889510/) | Anime | 93% / 2,392 |  |
| D | [The Spike](https://store.steampowered.com/app/1296840/) | Anime | 91% / 2,381 |  |
| D | [Devil May Cry 4](https://store.steampowered.com/app/45700/) | Stylized | 91% / 2,302 |  |
| D | [We Love Katamari REROLL+ Royal Reverie](https://store.steampowered.com/app/1730700/) | Colorful/Cute | 95% / 2,114 | 融合 生活养成 |
| D | [Bing in Wonderland](https://store.steampowered.com/app/1710100/) | Hand-drawn/Colorful | 97% / 2,074 |  |
| D | [Sephiria](https://store.steampowered.com/app/2436940/) | Pixel Graphics/Cute | 92% / 2,180 |  |
| D | [Last Command](https://store.steampowered.com/app/1487270/) | Pixel Graphics/Anime | 96% / 2,071 |  |
| D | [MARVEL vs. CAPCOM Fighting Collection: Arcade Classics](https://store.steampowered.com/app/2634890/) | Pixel Graphics/Comic Book | 94% / 2,077 |  |
| D | [Snezhinka:Sentinel Girls2](https://store.steampowered.com/app/2608350/) | Pixel Graphics/Anime | 97% / 2,013 | 融合 射击 |
| D | [PAC-MAN 256](https://store.steampowered.com/app/455400/) | Pixel Graphics | 92% / 2,085 |  |
| D | [Super Mega Baseball 3](https://store.steampowered.com/app/988910/) | Stylized | 91% / 2,066 |  |

#### 平台跳跃（162 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Cuphead](https://store.steampowered.com/app/268910/) | IGF 2018，BAFTA 2017，TGA 2017★，案例库，Hand-drawn/Colorful | 96% / 186,835 | 融合 动作 |
| A | [INSIDE](https://store.steampowered.com/app/304430/) | IGF 2017，BAFTA 2016★，TGA 2016★，案例库，Minimalist | 97% / 68,046 | 融合 恐怖、探索冒险、叙事 |
| A | [Ori and the Blind Forest DE](https://store.steampowered.com/app/387290/) | BAFTA 2015★，TGA 2015★，案例库，Beautiful/Cute | 95% / 66,979 |  |
| A | [Ori and the Blind Forest](https://store.steampowered.com/app/261570/) | BAFTA 2015★，TGA 2015★，GDCA 2015★，Cute | 94% / 57,412 | 融合 探索冒险 |
| A | [LIMBO](https://store.steampowered.com/app/48000/) | BAFTA 2010，IGF 2010★，GDCA 2010★，案例库，Surreal/Minimalist | 93% / 57,284 |  |
| A | [FEZ](https://store.steampowered.com/app/224760/) | IGF 2008★，案例库，Beautiful/Pixel Graphics | 93% / 15,562 | 融合 探索冒险 |
| A | [Ratchet & Clank: Rift Apart](https://store.steampowered.com/app/1895880/) | BAFTA 2021，TGA 2021，GDCA 2021★，案例库，Colorful/Cartoony | 90% / 13,677 | 融合 射击 |
| A | [Neva](https://store.steampowered.com/app/2420660/) | BAFTA 2024★，TGA 2024，案例库，Beautiful/Hand-drawn | 94% / 6,976 | 融合 探索冒险 |
| A | [Rayman Origins](https://store.steampowered.com/app/207490/) | BAFTA 2011★，DICE 2011，案例库，Colorful/Cartoony | 94% / 5,148 |  |
| A | [BIT.TRIP RUNNER](https://store.steampowered.com/app/63710/) | IGF 2011★，Colorful/Pixel Graphics | 86% / 3,918 |  |
| A | Tearaway（PS Vita / PS4） | BAFTA 2013★，DICE 2013，案例库 | — | 融合 探索冒险；纸艺世界，用触屏 / 摄像头与世界交互 |
| A | Banjo-Kazooie（N64 / Xbox） | DICE 1999★ | — | 融合 探索冒险；3D 收集型平台跳跃 |
| A | Sly Cooper and the Thievius Raccoonus（PS2） | DICE 2002★ | — | 融合 动作；潜行平台跳跃，赛璐璐风格 |
| A | LittleBigPlanet（PS3） | DICE 2008★ | — | 融合 沙盒；平台跳跃 + 关卡编辑 |
| B | [Portal 2](https://store.steampowered.com/app/620/) | DICE 2011 | 99% / 433,510 |  |
| B | [Hollow Knight](https://store.steampowered.com/app/367520/) | IGF 2018，案例库，Hand-drawn/Cute | 97% / 415,946 | 融合 探索冒险 |
| B | [It Takes Two](https://store.steampowered.com/app/1426210/) | BAFTA 2021，案例库 | 95% / 218,383 | 融合 探索冒险 |
| B | [Ori and the Will of the Wisps](https://store.steampowered.com/app/1057090/) | TGA 2020，DICE 2020，案例库，Beautiful/Cute | 97% / 136,690 | 融合 探索冒险 |
| B | [Katana ZERO](https://store.steampowered.com/app/460950/) | IGF 2020，案例库，Pixel Graphics/Noir | 98% / 71,069 | 融合 动作 |
| B | [Mirror's Edge](https://store.steampowered.com/app/17410/) | DICE 2008，Stylized/Colorful | 88% / 37,652 |  |
| B | [Nine Sols](https://store.steampowered.com/app/1809540/) | IGF 2025，案例库，Hand-drawn/Comic Book | 95% / 28,896 | 融合 动作 |
| B | [Valiant Hearts](https://store.steampowered.com/app/260230/) | BAFTA 2014，DICE 2014，案例库，Comic Book | 96% / 26,043 | 融合 探索冒险 |
| B | [Spyro Reignited Trilogy](https://store.steampowered.com/app/996580/) | DICE 1999，DICE 2000，Colorful/Cartoony | 94% / 20,506 | 获奖的是 PS1 原作；Steam 为重制合集，UI 与美术都重做 |
| B | [Psychonauts 2](https://store.steampowered.com/app/607080/) | BAFTA 2021，TGA 2021，案例库，Colorful/Cartoony | 96% / 12,943 |  |
| B | [Rayman Legends](https://store.steampowered.com/app/242550/) | DICE 2013，案例库，Beautiful | 90% / 10,043 |  |
| B | [Thank Goodness You're Here!](https://store.steampowered.com/app/2366980/) | IGF 2025，案例库，Hand-drawn/Colorful | 97% / 6,196 | 融合 探索冒险 |
| B | [Creaks](https://store.steampowered.com/app/956030/) | IGF 2020，案例库，Stylized/Hand-drawn | 95% / 4,855 | 融合 生活养成、探索冒险、解谜 |
| B | [Unravel](https://store.steampowered.com/app/1225560/) | BAFTA 2016，案例库，Beautiful/Colorful | 91% / 5,037 |  |
| B | [Iconoclasts](https://store.steampowered.com/app/393520/) | IGF 2019，案例库，Colorful/Pixel Graphics | 87% / 4,730 |  |
| B | [Sundered](https://store.steampowered.com/app/535480/) | IGF 2017，案例库，Hand-drawn | 82% / 4,957 |  |
| B | [Prince of Persia: The Sands of Time](https://store.steampowered.com/app/13600/) | DICE 2003 | 86% / 4,481 | 融合 动作 |
| B | [Oddworld: Abe's Oddysee](https://store.steampowered.com/app/15700/) | DICE 1998 | 85% / 4,355 | 融合 探索冒险 |
| B | [Wandersong](https://store.steampowered.com/app/530320/) | IGF 2019，案例库，Stylized/Colorful | 95% / 3,613 | 融合 探索冒险 |
| B | [Shady Part of Me](https://store.steampowered.com/app/1116580/) | IGF 2021，案例库 | 95% / 2,696 |  |
| B | [South of Midnight](https://store.steampowered.com/app/1934570/) | BAFTA 2025，案例库，Stylized/Surreal | 95% / 2,519 | 融合 动作、探索冒险、叙事 |
| B | [The Plucky Squire](https://store.steampowered.com/app/1627570/) | DICE 2024，Cartoony/Cute | 86% / 2,581 |  |
| B | [Oddworld: Munch's Oddysee](https://store.steampowered.com/app/15740/) | DICE 2001 | 77% / 1,037 |  |
| B | [Ultros](https://store.steampowered.com/app/2386310/) | IGF 2025，Stylized/Hand-drawn | 80% / 744 |  |
| B | [LEGO Horizon Adventures](https://store.steampowered.com/app/2428810/) | DICE 2024 | 61% / 423 | 融合 动作 |
| B | [The Puppeteer](https://store.steampowered.com/app/2434000/) | DICE 2013，Pixel Graphics | 100% / 7 | 融合 角色扮演、动作 |
| B | Astro Bot（PS5） | BAFTA 2024，TGA 2024，案例库 | — |  |
| B | Super Mario Bros. Wonder（Switch） | TGA 2023，案例库 | — |  |
| B | Kirby's Epic Yarn（Wii / 3DS） | DICE 2010，案例库 | — | 毛线织物世界 |
| B | LittleBigPlanet 2（PS3） | BAFTA 2011 | — | 融合 沙盒；平台跳跃 + 关卡编辑 |
| B | Jak II（PS2） | DICE 2003 | — | 融合 动作、射击；开放城区 + 射击 |
| B | Sly 2: Band of Thieves（PS2） | DICE 2004 | — | 融合 动作；潜行平台跳跃 |
| C | [Celeste](https://store.steampowered.com/app/504230/) | 案例库，Pixel Graphics/Anime | 98% / 120,602 |  |
| C | [Pizza Tower](https://store.steampowered.com/app/2231450/) | 案例库，Colorful/Cartoony | 98% / 66,693 |  |
| C | [Blasphemous](https://store.steampowered.com/app/774361/) | 案例库，Pixel Graphics | 90% / 51,484 | 融合 动作 |
| C | [ANIMAL WELL](https://store.steampowered.com/app/813230/) | 案例库，Pixel Graphics/Surreal | 96% / 20,790 | 融合 探索冒险 |
| C | [Dust: An Elysian Tail](https://store.steampowered.com/app/236090/) | 案例库，Beautiful/Anime | 95% / 18,638 | 融合 动作 |
| C | [Neon White](https://store.steampowered.com/app/1533420/) | 案例库，Stylized/Anime | 98% / 17,723 | 融合 射击 |
| C | [Shovel Knight](https://store.steampowered.com/app/250760/) | 案例库，Pixel Graphics | 96% / 16,112 |  |
| C | [Pseudoregalia](https://store.steampowered.com/app/2365810/) | 案例库，Stylized/Surreal | 97% / 15,027 |  |
| C | [Bomb Rush Cyberfunk](https://store.steampowered.com/app/1353230/) | 案例库，Stylized/Colorful | 98% / 13,387 | 融合 探索冒险 |
| C | [Child of Light](https://store.steampowered.com/app/256290/) | 案例库，Beautiful/Hand-drawn | 92% / 13,220 |  |
| C | [Pikuniku](https://store.steampowered.com/app/572890/) | 案例库，Colorful/Cute | 96% / 10,001 | 融合 探索冒险、解谜 |
| C | [Thomas Was Alone](https://store.steampowered.com/app/220780/) | 案例库，Colorful/Minimalist | 94% / 9,267 |  |
| C | [Downwell](https://store.steampowered.com/app/360740/) | 案例库，Pixel Graphics | 97% / 8,200 |  |
| C | [Cave Story+](https://store.steampowered.com/app/200900/) | 案例库，Pixel Graphics/Anime | 93% / 7,644 |  |
| C | [Jet Set Radio](https://store.steampowered.com/app/205950/) | 案例库，Stylized/Colorful | 87% / 8,127 |  |
| C | [The Swapper](https://store.steampowered.com/app/231160/) | 案例库 | 94% / 7,369 | 融合 探索冒险 |
| C | [Owlboy](https://store.steampowered.com/app/115800/) | 案例库，Pixel Graphics/Cute | 84% / 5,874 |  |
| C | [Jusant](https://store.steampowered.com/app/1977170/) | 案例库，Colorful/Cute | 93% / 4,995 | 融合 探索冒险 |
| C | [Gato Roboto](https://store.steampowered.com/app/916730/) | 案例库，Pixel Graphics/Cute | 95% / 4,622 |  |
| C | [Indivisible](https://store.steampowered.com/app/421170/) | 案例库，Hand-drawn/Colorful | 71% / 3,518 | 融合 角色扮演 |
| C | [Anodyne 2](https://store.steampowered.com/app/877810/) | 案例库，Pixel Graphics/Surreal | 95% / 743 | 融合 探索冒险 |
| D | [Geometry Dash](https://store.steampowered.com/app/322170/) | Colorful | 93% / 429,921 |  |
| D | [Broforce](https://store.steampowered.com/app/274190/) | Pixel Graphics | 97% / 58,880 |  |
| D | [A Hat in Time](https://store.steampowered.com/app/253230/) | Colorful/Cute | 98% / 51,687 | 融合 探索冒险 |
| D | [Duck Game](https://store.steampowered.com/app/312530/) | Pixel Graphics | 97% / 38,476 | 融合 射击 |
| D | [Bloodstained: Ritual of the Night](https://store.steampowered.com/app/692850/) | Anime | 94% / 39,485 |  |
| D | [SANABI](https://store.steampowered.com/app/1562700/) | Pixel Graphics | 97% / 35,954 |  |
| D | [Super Meat Boy](https://store.steampowered.com/app/40800/) | Pixel Graphics | 95% / 35,494 |  |
| D | [PICO PARK](https://store.steampowered.com/app/1509960/) | Cute | 91% / 28,499 | 融合 动作 |
| D | [Sonic Mania](https://store.steampowered.com/app/584400/) | Colorful/Pixel Graphics | 94% / 26,131 |  |
| D | [Sonic Generations Collection](https://store.steampowered.com/app/71340/) | Colorful | 94% / 25,232 |  |
| D | [Alice: Madness Returns](https://store.steampowered.com/app/19680/) | Surreal | 90% / 24,087 | 融合 动作、恐怖 |
| D | [Trine 2: Complete Story](https://store.steampowered.com/app/35720/) | Beautiful | 95% / 21,679 |  |
| D | [The Expendabros](https://store.steampowered.com/app/312990/) | Pixel Graphics | 97% / 18,174 | 融合 射击 |
| D | [Rogue Legacy](https://store.steampowered.com/app/241600/) | Pixel Graphics | 93% / 18,477 | 融合 动作 |
| D | [Crash Bandicoot N. Sane Trilogy](https://store.steampowered.com/app/731490/) | Colorful/Cartoony | 93% / 18,034 |  |
| D | [Refunct](https://store.steampowered.com/app/406150/) | Stylized | 96% / 17,331 | 融合 探索冒险、生活养成 |
| D | [SpongeBob SquarePants: Battle for Bikini Bottom - Rehydrated](https://store.steampowered.com/app/969990/) | Cartoon | 94% / 16,681 | 融合 探索冒险 |
| D | [Trine Enchanted Edition](https://store.steampowered.com/app/35700/) | Beautiful | 96% / 15,345 | 融合 沙盒、探索冒险 |
| D | [Webbed](https://store.steampowered.com/app/1390350/) | Pixel Graphics/Cute | 98% / 13,838 |  |
| D | [Blasphemous 2](https://store.steampowered.com/app/2114740/) | Pixel Graphics | 91% / 14,237 | 融合 动作 |
| D | [ENDER MAGNOLIA: Bloom in the Mist](https://store.steampowered.com/app/2725260/) | Anime | 96% / 13,465 | 融合 角色扮演、动作 |
| D | [Gunpoint](https://store.steampowered.com/app/206190/) | Pixel Graphics/Noir | 98% / 13,093 | 融合 解谜 |
| D | [SONIC X SHADOW GENERATIONS](https://store.steampowered.com/app/2513280/) | Colorful | 97% / 12,486 |  |
| D | [Montaro](https://store.steampowered.com/app/495890/) | Pixel Graphics/Anime | 95% / 12,103 |  |
| D | [Rabi-Ribi](https://store.steampowered.com/app/400910/) | Pixel Graphics/Anime | 96% / 11,858 | 融合 动作 |
| D | [Jump King](https://store.steampowered.com/app/1061090/) | Pixel Graphics | 90% / 12,303 | 融合 恐怖 |
| D | [The Messenger](https://store.steampowered.com/app/764790/) | Pixel Graphics | 93% / 11,860 |  |
| D | [Momodora: Reverie Under The Moonlight](https://store.steampowered.com/app/428550/) | Pixel Graphics/Cute | 93% / 11,248 |  |
| D | [Hue](https://store.steampowered.com/app/383270/) | Colorful | 93% / 10,524 |  |
| D | [VVVVVV](https://store.steampowered.com/app/70300/) | Pixel Graphics | 96% / 10,097 |  |
| D | [Door Kickers: Action Squad](https://store.steampowered.com/app/686200/) | Pixel Graphics | 95% / 10,139 | 融合 射击、策略 |
| D | [Reventure](https://store.steampowered.com/app/900270/) | Pixel Graphics | 95% / 9,224 | 融合 叙事、探索冒险 |
| D | [Kao the Kangaroo: Round 2 (2003 re-release)](https://store.steampowered.com/app/1048540/) | Cute | 94% / 7,859 |  |
| D | [Pumpkin Jack](https://store.steampowered.com/app/1186640/) | Colorful | 91% / 7,828 | 融合 探索冒险 |
| D | [Touhou Hero of Ice Fairy](https://store.steampowered.com/app/1955830/) | Anime/Cute | 97% / 7,085 | 融合 动作 |
| D | [Dungeon Munchies](https://store.steampowered.com/app/799640/) | Pixel Graphics/Anime | 97% / 6,903 | 融合 动作、探索冒险、角色扮演 |
| D | [Out There Somewhere](https://store.steampowered.com/app/263980/) | Pixel Graphics | 93% / 6,916 |  |
| D | [Record of Lodoss War-Deedlit in Wonder Labyrinth-](https://store.steampowered.com/app/1203630/) | Pixel Graphics/Anime | 93% / 6,733 |  |
| D | [Guacamelee! Super Turbo Championship Edition](https://store.steampowered.com/app/275390/) | Colorful/Cartoony | 93% / 6,733 |  |
| D | [Neon Beats](https://store.steampowered.com/app/1064610/) | Minimalist | 96% / 6,508 |  |
| D | [UFO 50](https://store.steampowered.com/app/1147860/) | Pixel Graphics | 96% / 6,249 | 融合 动作、策略 |
| D | [Guacamelee! Gold Edition](https://store.steampowered.com/app/214770/) | Colorful | 93% / 5,950 | 融合 动作 |
| D | [Axiom Verge](https://store.steampowered.com/app/332200/) | Pixel Graphics | 91% / 6,064 |  |
| D | [Wuppo: Definitive Edition](https://store.steampowered.com/app/400630/) | Cute | 94% / 5,739 |  |
| D | [Himno](https://store.steampowered.com/app/931690/) | Pixel Graphics | 91% / 5,775 | 融合 动作 |
| D | [You Have to Win the Game](https://store.steampowered.com/app/286100/) | Pixel Graphics | 93% / 5,675 |  |
| D | [DEADBOLT](https://store.steampowered.com/app/394970/) | Pixel Graphics | 96% / 5,425 | 融合 射击 |
| D | [Contrast](https://store.steampowered.com/app/224460/) | Noir | 91% / 5,492 | 融合 解谜、探索冒险 |
| D | [Planet of Lana](https://store.steampowered.com/app/1608230/) | Anime | 94% / 5,239 |  |
| D | [BirdGut](https://store.steampowered.com/app/1072390/) | Hand-drawn | 95% / 4,939 | 融合 恐怖、动作 |
| D | [Yoku's Island Express](https://store.steampowered.com/app/334940/) | Cute | 96% / 4,824 | 融合 探索冒险 |
| D | [I Wanna Maker](https://store.steampowered.com/app/1114940/) | Pixel Graphics | 95% / 4,834 |  |
| D | [MO:Astray](https://store.steampowered.com/app/1104660/) | Pixel Graphics/Cute | 92% / 4,934 | 融合 探索冒险 |
| D | [Freedom Planet](https://store.steampowered.com/app/248310/) | Pixel Graphics | 95% / 4,748 |  |
| D | [Melody's Escape](https://store.steampowered.com/app/270210/) | Stylized/Colorful | 93% / 4,820 |  |
| D | [FAR: Changing Tides](https://store.steampowered.com/app/1570010/) | Stylized/Hand-drawn | 93% / 4,673 | 融合 探索冒险、生活养成 |
| D | [140](https://store.steampowered.com/app/242820/) | Colorful/Minimalist | 93% / 4,604 |  |
| D | [Bloodstained: Curse of the Moon](https://store.steampowered.com/app/838310/) | Pixel Graphics | 95% / 4,263 |  |
| D | [Tukoni: Prologue](https://store.steampowered.com/app/1419860/) | Hand-drawn/Colorful | 98% / 3,841 | 融合 解谜 |
| D | [Castle of Illusion](https://store.steampowered.com/app/227600/) | Colorful | 91% / 3,921 |  |
| D | [HUNTDOWN](https://store.steampowered.com/app/598550/) | Pixel Graphics | 95% / 3,743 | 融合 射击 |
| D | [Grimhook](https://store.steampowered.com/app/2667430/) | Stylized | 98% / 3,622 | 融合 动作、射击 |
| D | [ANTONBLAST](https://store.steampowered.com/app/1887400/) | Cartoony/Comic Book | 96% / 3,588 |  |
| D | [SpongeBob SquarePants: The Cosmic Shake](https://store.steampowered.com/app/1282150/) | Colorful/Cartoon | 92% / 3,727 |  |
| D | [Tinykin](https://store.steampowered.com/app/1599020/) | Cartoony/Cute | 98% / 3,386 |  |
| D | [Turbo Pug](https://store.steampowered.com/app/418070/) | Pixel Graphics/Cute | 91% / 3,345 |  |
| D | [N++ (NPLUSPLUS)](https://store.steampowered.com/app/230270/) | Minimalist | 94% / 3,206 |  |
| D | [The End Is Nigh](https://store.steampowered.com/app/583470/) | Pixel Graphics | 94% / 3,092 |  |
| D | [Guacamelee! 2](https://store.steampowered.com/app/534550/) | Colorful/Cartoony | 91% / 3,145 |  |
| D | [Soda Crisis](https://store.steampowered.com/app/1592670/) | Colorful | 93% / 3,025 | 融合 射击 |
| D | [BIT.TRIP Presents... Runner2: Future Legend of Rhythm Alien](https://store.steampowered.com/app/218060/) | Colorful | 92% / 3,048 |  |
| D | [HAAK](https://store.steampowered.com/app/1352930/) | Pixel Graphics | 90% / 2,993 |  |
| D | [Gravity Circuit](https://store.steampowered.com/app/858710/) | Pixel Graphics | 95% / 2,821 |  |
| D | [Shantae and the Pirate's Curse](https://store.steampowered.com/app/345820/) | Pixel Graphics/Anime | 93% / 2,853 |  |
| D | [Papo & Yo](https://store.steampowered.com/app/227080/) | Surreal | 93% / 2,836 |  |
| D | [Laughing to Die](https://store.steampowered.com/app/2182400/) | Hand-drawn/Colorful | 97% / 2,678 | 融合 恐怖 |
| D | [Dreaming Sarah](https://store.steampowered.com/app/296870/) | Pixel Graphics/Surreal | 91% / 2,808 | 融合 探索冒险 |
| D | [Momodora: Moonlit Farewell](https://store.steampowered.com/app/1747760/) | Pixel Graphics/Anime | 92% / 2,759 |  |
| D | [TY the Tasmanian Tiger](https://store.steampowered.com/app/411960/) | Colorful/Cartoony | 98% / 2,596 |  |
| D | [Trine 5: A Clockwork Conspiracy](https://store.steampowered.com/app/1436700/) | Colorful | 92% / 2,721 | 融合 动作 |
| D | [Super Blue Boy Planet](https://store.steampowered.com/app/560260/) | Pixel Graphics | 91% / 2,706 |  |
| D | [The Upturned](https://store.steampowered.com/app/1717770/) | Cartoony | 99% / 2,364 | 融合 沙盒、恐怖、动作 |
| D | [30XX](https://store.steampowered.com/app/1029210/) | Pixel Graphics | 91% / 2,536 |  |
| D | [pureya](https://store.steampowered.com/app/1268960/) | Colorful/Pixel Graphics | 97% / 2,348 |  |
| D | [Arise: A Simple Story](https://store.steampowered.com/app/866140/) | Surreal/Cute | 92% / 2,468 |  |
| D | [Leap Year](https://store.steampowered.com/app/2951770/) | Hand-drawn/Pixel Graphics | 98% / 2,258 |  |
| D | [Shantae: Half-Genie Hero](https://store.steampowered.com/app/253840/) | Hand-drawn/Anime | 90% / 2,392 |  |
| D | [Castlevania Dominus Collection](https://store.steampowered.com/app/2369900/) | Pixel Graphics | 95% / 2,130 |  |
| D | [EDGE](https://store.steampowered.com/app/38740/) | Abstract | 92% / 2,194 |  |
| D | [Castlevania Advance Collection](https://store.steampowered.com/app/1552550/) | Pixel Graphics | 92% / 2,084 |  |
| D | [Super Fancy Pants Adventure](https://store.steampowered.com/app/668210/) | Stylized | 93% / 2,005 |  |
| E | [Transformice](https://store.steampowered.com/app/335240/) | Cute | 88% / 27,661 | 融合 竞速、生存 |
| E | [Caravan SandWitch](https://store.steampowered.com/app/1582650/) | Stylized/Colorful | 91% / 1,925 | 融合 探索冒险、叙事、竞速 |
| E | [Dino Run DX](https://store.steampowered.com/app/248330/) | Pixel Graphics | 94% / 1,511 | 融合 竞速 |
| E | [JellyCar Worlds](https://store.steampowered.com/app/1740930/) | Hand-drawn/Colorful | 97% / 922 | 融合 竞速 |

### ③ 养成 / 解谜 / 叙事

#### 生活养成（82 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Hauntii](https://store.steampowered.com/app/2060790/) | IGF 2025★，案例库，Stylized/Hand-drawn | 92% / 344 | 融合 探索冒险 |
| B | [Potion Craft: Alchemist Simulator](https://store.steampowered.com/app/1210320/) | IGF 2023，Hand-drawn | 92% / 37,608 | 融合 建造经营 |
| B | [Tiny Glade](https://store.steampowered.com/app/2198150/) | IGF 2025，案例库，Stylized/Colorful | 98% / 19,845 | 融合 建造经营 |
| B | [Melatonin](https://store.steampowered.com/app/1585220/) | IGF 2023，Hand-drawn/Colorful | 95% / 7,106 |  |
| B | [Potionomics](https://store.steampowered.com/app/1874490/) | IGF 2023，案例库，Anime | 91% / 6,703 | 融合 卡牌桌游、建造经营 |
| B | [Chicory: A Colorful Tale](https://store.steampowered.com/app/1123450/) | IGF 2021，案例库，Colorful/Cute | 98% / 3,420 | 融合 探索冒险、角色扮演、平台跳跃 |
| B | [Umurangi Generation](https://store.steampowered.com/app/1223500/) | IGF 2021，案例库，Colorful/Surreal | 91% / 1,132 | 融合 探索冒险 |
| B | Viva Piñata（Xbox 360 / PC（未上 Steam）） | DICE 2006 | — | 融合 建造经营；花园经营 + 养成 |
| C | [Stardew Valley](https://store.steampowered.com/app/413150/) | 案例库，Pixel Graphics/Cute | 98% / 886,195 |  |
| C | [Unpacking](https://store.steampowered.com/app/1135690/) | 案例库，Colorful/Pixel Graphics | 93% / 35,301 | 融合 解谜 |
| C | [Chinese Parents](https://store.steampowered.com/app/736190/) | 案例库，Anime/Cute | 92% / 25,651 | 融合 恐怖 |
| C | [Fields of Mistria](https://store.steampowered.com/app/2142790/) | 案例库，Pixel Graphics/Anime | 98% / 19,958 |  |
| C | [Little Kitty, Big City](https://store.steampowered.com/app/1177980/) | 案例库，Stylized/Colorful | 97% / 10,785 |  |
| C | [TOEM](https://store.steampowered.com/app/1307580/) | 案例库，Stylized/Hand-drawn | 99% / 8,385 |  |
| C | [Cozy Grove](https://store.steampowered.com/app/1458100/) | 案例库，Colorful/Cartoony | 90% / 7,998 |  |
| C | [Alba: A Wildlife Adventure](https://store.steampowered.com/app/1337010/) | 案例库，Stylized/Colorful | 98% / 6,640 | 融合 探索冒险 |
| C | [Lil Gator Game](https://store.steampowered.com/app/1586800/) | 案例库，Colorful/Cute | 99% / 4,739 |  |
| C | [LEGO Builder's Journey](https://store.steampowered.com/app/1544360/) | 案例库，Stylized/Colorful | 83% / 3,969 | 融合 解谜 |
| C | [Wylde Flowers](https://store.steampowered.com/app/1896700/) | 案例库，Cute | 96% / 2,283 |  |
| C | [Smushi Come Home](https://store.steampowered.com/app/1740300/) | 案例库，Stylized/Pixel Graphics | 99% / 2,211 | 融合 探索冒险 |
| C | [Wanderstop](https://store.steampowered.com/app/1299460/) | 案例库，Colorful | 93% / 1,756 |  |
| C | [Ooblets](https://store.steampowered.com/app/593150/) | 案例库，Colorful/Cute | 92% / 1,412 | 融合 角色扮演 |
| C | [Dordogne](https://store.steampowered.com/app/1272840/) | 案例库，Stylized/Hand-drawn | 92% / 1,086 | 融合 叙事、探索冒险 |
| C | Mars After Midnight（Playdate） | 案例库 | — | 融合 解谜；1-bit 掌机上的互助会管理小游戏，用摇杆 |
| C | Animal Crossing: New Horizons（Switch） | 案例库 | — | 融合 建造经营；生活模拟 + 岛屿布置 |
| D | [DAVE THE DIVER](https://store.steampowered.com/app/1868140/) | Pixel Graphics | 97% / 129,331 | 融合 建造经营 |
| D | [Helltaker](https://store.steampowered.com/app/1289310/) | Anime/Cute | 98% / 124,918 | 融合 解谜 |
| D | [HuniePop](https://store.steampowered.com/app/339800/) | Anime/Cute | 96% / 27,392 |  |
| D | [Leaf Blower Revolution - Idle Game](https://store.steampowered.com/app/1468260/) | Pixel Graphics | 94% / 25,292 | 融合 生存 |
| D | [Farm Together](https://store.steampowered.com/app/673950/) | Cute | 94% / 21,728 | 融合 建造经营 |
| D | [Placid Plastic Duck Simulator](https://store.steampowered.com/app/1999360/) | Colorful/Cute | 98% / 17,685 | 融合 沙盒 |
| D | [Cat Goes Fishing](https://store.steampowered.com/app/343780/) | Cute | 94% / 14,156 |  |
| D | [A Little to the Left](https://store.steampowered.com/app/1629520/) | Colorful/Cute | 92% / 13,536 | 融合 解谜 |
| D | [Rusty's Retirement](https://store.steampowered.com/app/2666510/) | Pixel Graphics | 97% / 12,778 | 融合 建造经营 |
| D | [Wobbledogs](https://store.steampowered.com/app/1424330/) | Colorful/Cute | 98% / 12,145 | 融合 沙盒 |
| D | [Spirit City: Lofi Sessions](https://store.steampowered.com/app/2113850/) | Cute | 98% / 12,083 |  |
| D | [AudioSurf](https://store.steampowered.com/app/12900/) | Colorful | 96% / 10,960 |  |
| D | [Virtual Cottage](https://store.steampowered.com/app/1369320/) | Cute | 98% / 10,402 |  |
| D | [小白兔电商~Bunny e-Shop](https://store.steampowered.com/app/1111460/) | Anime/Cute | 94% / 10,189 | 融合 叙事 |
| D | [Kind Words (lo fi chill beats to write to)](https://store.steampowered.com/app/1070710/) | Cute | 98% / 8,936 |  |
| D | [Viridi](https://store.steampowered.com/app/375950/) | Cute | 92% / 9,320 | 融合 沙盒 |
| D | [Assemble with Care](https://store.steampowered.com/app/1202900/) | Beautiful/Cute | 91% / 8,690 | 融合 解谜、叙事 |
| D | [Coloring Pixels](https://store.steampowered.com/app/897330/) | Colorful/Pixel Graphics | 96% / 7,919 |  |
| D | [Bejeweled 3](https://store.steampowered.com/app/78000/) | Colorful | 96% / 7,259 | 融合 解谜 |
| D | [Chillquarium](https://store.steampowered.com/app/2276930/) | Cute | 93% / 6,972 | 融合 建造经营 |
| D | [Glass Masquerade](https://store.steampowered.com/app/511470/) | Beautiful | 97% / 6,607 |  |
| D | [Littlewood](https://store.steampowered.com/app/894940/) | Pixel Graphics | 93% / 6,679 | 融合 建造经营 |
| D | [Sticky Business](https://store.steampowered.com/app/2303350/) | Colorful/Pixel Graphics | 95% / 6,171 |  |
| D | [Katamari Damacy REROLL](https://store.steampowered.com/app/848350/) | Colorful/Surreal | 93% / 6,021 | 融合 动作 |
| D | [Hello Kitty Island Adventure](https://store.steampowered.com/app/2495100/) | Colorful/Cute | 94% / 5,691 | 融合 探索冒险 |
| D | [Minami Lane](https://store.steampowered.com/app/2678990/) | Colorful/Cute | 98% / 5,307 | 融合 建造经营 |
| D | [STORY OF SEASONS: Friends of Mineral Town](https://store.steampowered.com/app/978780/) | Anime/Cute | 94% / 5,330 |  |
| D | [Hentai Girl](https://store.steampowered.com/app/878750/) | Anime | 91% / 5,112 | 融合 恐怖、解谜 |
| D | [My Dream Setup](https://store.steampowered.com/app/2200780/) | Minimalist/Cute | 90% / 5,077 | 融合 建造经营 |
| D | [Incredibox](https://store.steampowered.com/app/1545450/) | Stylized/Cartoony | 97% / 4,727 |  |
| D | [Cats Organized Neatly](https://store.steampowered.com/app/1369340/) | Hand-drawn/Colorful | 98% / 4,412 |  |
| D | [I commissioned some bees 0](https://store.steampowered.com/app/2250060/) | Hand-drawn/Colorful | 97% / 4,411 | 融合 解谜 |
| D | [Tiny Pasture](https://store.steampowered.com/app/3167550/) | Pixel Graphics/Cute | 92% / 4,601 | 融合 建造经营 |
| D | [SuchArt: Genius Artist Simulator](https://store.steampowered.com/app/1293180/) | Cute | 97% / 4,359 | 融合 沙盒、射击 |
| D | [Your Mother](https://store.steampowered.com/app/3399950/) | Anime/Cute | 91% / 4,375 | 融合 射击 |
| D | [A Castle Full of Cats](https://store.steampowered.com/app/2070550/) | Minimalist | 99% / 4,009 | 融合 解谜 |
| D | [A Building Full of Cats](https://store.steampowered.com/app/1969080/) | Hand-drawn/Cartoony | 99% / 4,011 | 融合 解谜 |
| D | [Chill Pulse](https://store.steampowered.com/app/2826180/) | Pixel Graphics/Anime | 96% / 3,863 |  |
| D | [Roots of Pacha](https://store.steampowered.com/app/1245560/) | Pixel Graphics | 94% / 3,893 |  |
| D | [Farm Together 2](https://store.steampowered.com/app/2418520/) | Cute | 93% / 3,710 |  |
| D | [Coloring Game](https://store.steampowered.com/app/1026820/) | Colorful/Pixel Graphics | 93% / 3,582 |  |
| D | [Orbt XL](https://store.steampowered.com/app/615610/) | Colorful/Minimalist | 97% / 3,369 |  |
| D | [Coloring Game 2](https://store.steampowered.com/app/1216200/) | Colorful/Pixel Graphics | 97% / 3,112 | 融合 解谜 |
| D | [Zenge](https://store.steampowered.com/app/461840/) | Minimalist | 95% / 3,050 |  |
| D | [Pretty Neko](https://store.steampowered.com/app/1212620/) | Anime | 93% / 3,057 | 融合 角色扮演 |
| D | [Sudoku Universe / 数独宇宙](https://store.steampowered.com/app/733070/) | Minimalist/Abstract | 95% / 2,919 |  |
| D | [Glass Masquerade 2: Illusions](https://store.steampowered.com/app/935880/) | Beautiful | 92% / 2,977 |  |
| D | [Battle Chef Brigade Deluxe](https://store.steampowered.com/app/452570/) | Hand-drawn/Anime | 96% / 2,625 | 融合 动作 |
| D | [Cattails | Become a Cat!](https://store.steampowered.com/app/634160/) | Pixel Graphics/Cute | 96% / 2,592 |  |
| D | [Spilled!](https://store.steampowered.com/app/2240080/) | Pixel Graphics/Cute | 95% / 2,592 |  |
| D | [Garden Galaxy](https://store.steampowered.com/app/1970460/) | Stylized/Cute | 98% / 2,391 | 融合 沙盒、建造经营 |
| D | [Omno](https://store.steampowered.com/app/969760/) | Colorful/Cute | 93% / 2,473 | 融合 探索冒险、平台跳跃 |
| D | [Garden Paws](https://store.steampowered.com/app/840010/) | Cute | 91% / 2,450 | 融合 探索冒险 |
| D | [Miracle Snack Shop](https://store.steampowered.com/app/995460/) | Anime | 97% / 2,270 | 融合 叙事、建造经营 |
| D | [Luna's Fishing Garden](https://store.steampowered.com/app/1477790/) | Pixel Graphics/Cute | 95% / 2,058 |  |
| E | [Plantera](https://store.steampowered.com/app/421040/) | Colorful/Cute | 89% / 5,785 | 融合 沙盒、工厂自动化、建造经营、解谜 |
| E | [The Last Clockwinder](https://store.steampowered.com/app/1755100/) | Stylized | 96% / 668 | 融合 建造经营、解谜、工厂自动化 |

#### 解谜（117 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Return of the Obra Dinn](https://store.steampowered.com/app/653530/) | IGF 2019，BAFTA 2018★，TGA 2018★，案例库，Noir | 97% / 29,016 | 融合 探索冒险 |
| A | [Gorogoa](https://store.steampowered.com/app/557600/) | BAFTA 2017，IGF 2014★，案例库，Beautiful/Stylized | 98% / 17,966 | 融合 探索冒险 |
| A | [Machinarium](https://store.steampowered.com/app/40700/) | IGF 2009★，DICE 2009，案例库，Beautiful/Stylized | 95% / 17,244 |  |
| A | [Monument Valley](https://store.steampowered.com/app/1927720/) | BAFTA 2014，GDCA 2014★，DICE 2014★，案例库 | 98% / 6,309 | 融合 生活养成、探索冒险 |
| A | [CHUCHEL](https://store.steampowered.com/app/711660/) | IGF 2018★，案例库，Stylized/Hand-drawn | 84% / 4,020 |  |
| A | [Genesis Noir](https://store.steampowered.com/app/735290/) | IGF 2021★，案例库，Beautiful/Stylized | 79% / 1,988 | 融合 探索冒险 |
| A | [Lumino City](https://store.steampowered.com/app/205020/) | IGF 2015，BAFTA 2014★，案例库 | 87% / 1,352 |  |
| A | [Papetura](https://store.steampowered.com/app/593640/) | IGF 2022★，案例库，Beautiful/Stylized | 93% / 918 | 融合 探索冒险、生活养成 |
| A | [Mirror Drop](https://store.steampowered.com/app/845270/) | IGF 2019★，Psychedelic | 93% / 73 |  |
| A | ICO（PS2 / PS3） | GDCA 2001★，DICE 2001★ | — | 融合 探索冒险；护送解谜，几乎没有 HUD |
| B | [L.A. Noire](https://store.steampowered.com/app/110800/) | BAFTA 2011，Noir | 86% / 34,026 | 融合 探索冒险 |
| B | [The Room](https://store.steampowered.com/app/288160/) | BAFTA 2012，案例库，Beautiful | 98% / 28,997 |  |
| B | [Chants of Sennaar](https://store.steampowered.com/app/1931770/) | IGF 2024，Stylized/Colorful | 98% / 22,453 |  |
| B | [Return to Monkey Island](https://store.steampowered.com/app/2060130/) | IGF 2023，Stylized/Hand-drawn | 92% / 8,518 | 融合 叙事 |
| B | [Grim Fandango Remastered](https://store.steampowered.com/app/316790/) | DICE 1999，Anime/Noir | 91% / 8,202 | 融合 探索冒险 |
| B | [Hypnospace Outlaw](https://store.steampowered.com/app/844590/) | IGF 2019，案例库，Surreal/Psychedelic | 97% / 4,781 |  |
| B | [Old Man's Journey](https://store.steampowered.com/app/581270/) | IGF 2017，案例库，Stylized/Hand-drawn | 87% / 3,970 | 融合 探索冒险、叙事 |
| B | [The Curse of Monkey Island](https://store.steampowered.com/app/730820/) | DICE 1998，Colorful/Cartoony | 97% / 2,745 | 融合 探索冒险 |
| B | [LUNA The Shadow Dust](https://store.steampowered.com/app/465100/) | IGF 2020，Beautiful/Stylized | 91% / 1,600 | 融合 探索冒险 |
| B | [GNOG](https://store.steampowered.com/app/290510/) | IGF 2016，Colorful | 92% / 1,009 |  |
| B | [Stone Story RPG](https://store.steampowered.com/app/603390/) | IGF 2020，Minimalist | 91% / 930 | 融合 工厂自动化 |
| B | [Loco Motive](https://store.steampowered.com/app/1709880/) | IGF 2026，案例库，Cartoony/Pixel Graphics | 95% / 720 |  |
| B | [She Remembered Caterpillars](https://store.steampowered.com/app/470780/) | IGF 2017，Hand-drawn/Cute | 95% / 524 | 融合 探索冒险 |
| B | [Death of the Reprobate](https://store.steampowered.com/app/1739900/) | IGF 2025，案例库，Hand-drawn/Colorful | 97% / 511 | 融合 叙事、探索冒险 |
| B | [Escape from Monkey Island](https://store.steampowered.com/app/730830/) | DICE 2000 | 57% / 655 |  |
| B | [Blade Runner: Enhanced Edition](https://store.steampowered.com/app/1678420/) | DICE 1998，Noir | 73% / 486 |  |
| B | [Voodoo Detective](https://store.steampowered.com/app/1740680/) | IGF 2023，Hand-drawn/Colorful | 95% / 332 |  |
| B | [Un Pas Fragile](https://store.steampowered.com/app/1093520/) | IGF 2017，Hand-drawn/Cute | 92% / 192 | 融合 探索冒险 |
| B | [Arrog](https://store.steampowered.com/app/1185700/) | IGF 2021，Beautiful/Stylized | 89% / 196 | 融合 探索冒险 |
| B | [To Hell With The Ugly](https://store.steampowered.com/app/1455450/) | IGF 2023，Stylized/Colorful | 89% / 119 |  |
| B | [Hohokum](https://store.steampowered.com/app/1210550/) | BAFTA 2014，Colorful/Cute | 86% / 99 | 融合 探索冒险 |
| B | Song of Bloom（手机） | IGF 2020 | — | 每关换一种画风与交互的谜题 |
| B | INKS.（手机） | IGF 2017 | — | 水彩弹珠台（解谜式弹球） |
| B | Oquonie（iOS） | IGF 2015 | — | 等距像素解谜，几乎无文字 |
| B | The Last Guardian（PS4） | BAFTA 2016，DICE 2016 | — | 融合 探索冒险；与大鸟配合解谜 |
| C | [山河旅探 Murders on the Yangtze River](https://store.steampowered.com/app/1746030/) | 案例库，Colorful | 97% / 18,192 |  |
| C | [Hidden Folks](https://store.steampowered.com/app/435400/) | 案例库，Hand-drawn/Colorful | 97% / 9,261 |  |
| C | [Tetris Effect: Connected](https://store.steampowered.com/app/1003590/) | 案例库，Beautiful/Stylized | 95% / 7,932 |  |
| C | [Lost in Play](https://store.steampowered.com/app/1328840/) | 案例库，Stylized/Hand-drawn | 98% / 7,049 |  |
| C | [The Rewinder（山海旅人）](https://store.steampowered.com/app/1161170/) | 案例库，Stylized/Pixel Graphics | 96% / 6,957 |  |
| C | [Botanicula](https://store.steampowered.com/app/207690/) | 案例库，Beautiful/Stylized | 95% / 6,285 | 融合 探索冒险 |
| C | [Ghost Trick](https://store.steampowered.com/app/1967430/) | 案例库，Anime | 98% / 5,947 | 融合 叙事 |
| C | [Samorost 3](https://store.steampowered.com/app/421120/) | 案例库，Stylized/Hand-drawn | 93% / 5,044 | 融合 生活养成 |
| C | [Trüberbrook](https://store.steampowered.com/app/757300/) | 案例库 | 73% / 2,146 | 融合 探索冒险 |
| C | [The Procession to Calvary](https://store.steampowered.com/app/1071130/) | 案例库，Beautiful/Surreal | 98% / 1,106 |  |
| C | [Armikrog](https://store.steampowered.com/app/334120/) | 案例库 | 58% / 1,571 |  |
| C | 绘真·妙笔千山（手机） | 案例库 | — | 融合 探索冒险；青绿山水画中解谜 |
| C | The Neverhood（PC（1996，未上 Steam）） | 案例库 | — | 融合 叙事；黏土定格点击冒险 |
| D | [Papers, Please](https://store.steampowered.com/app/239030/) | Pixel Graphics | 97% / 74,187 |  |
| D | [Phoenix Wright: Ace Attorney Trilogy](https://store.steampowered.com/app/787480/) | Anime | 98% / 37,254 | 融合 叙事 |
| D | [Danganronpa: Trigger Happy Havoc](https://store.steampowered.com/app/413410/) | Anime | 96% / 30,431 | 融合 叙事、恐怖 |
| D | [There Is No Game: Wrong Dimension](https://store.steampowered.com/app/1240210/) | Pixel Graphics | 98% / 23,430 | 融合 叙事 |
| D | [Baba Is You](https://store.steampowered.com/app/736260/) | Pixel Graphics/Minimalist | 98% / 21,921 | 融合 工厂自动化 |
| D | [Zup! S](https://store.steampowered.com/app/617670/) | Minimalist/Cute | 98% / 10,820 | 融合 沙盒、生活养成、恐怖 |
| D | [Rusty Lake Hotel](https://store.steampowered.com/app/435120/) | Hand-drawn/Surreal | 96% / 9,219 | 融合 恐怖 |
| D | [Enigma of Fear](https://store.steampowered.com/app/1507580/) | Pixel Graphics | 97% / 9,093 | 融合 恐怖 |
| D | [Hook](https://store.steampowered.com/app/367580/) | Minimalist/Abstract | 97% / 8,887 | 融合 生活养成 |
| D | [LYNE](https://store.steampowered.com/app/266010/) | Minimalist/Abstract | 96% / 8,180 | 融合 生活养成 |
| D | [Zup!](https://store.steampowered.com/app/533300/) | Minimalist | 94% / 8,219 | 融合 沙盒、生活养成 |
| D | [Zup! F](https://store.steampowered.com/app/601220/) | Minimalist | 97% / 7,687 | 融合 沙盒、生活养成 |
| D | [No Case Should Remain Unsolved](https://store.steampowered.com/app/2676840/) | Pixel Graphics | 97% / 7,150 | 融合 叙事 |
| D | [There Is No Game: Jam Edition 2015](https://store.steampowered.com/app/1241700/) | Pixel Graphics | 97% / 7,022 |  |
| D | [Zup! 2](https://store.steampowered.com/app/562220/) | Minimalist | 96% / 6,272 | 融合 沙盒、生活养成 |
| D | [Zup! X](https://store.steampowered.com/app/508900/) | Minimalist | 97% / 5,991 | 融合 沙盒、生活养成 |
| D | [Hexcells](https://store.steampowered.com/app/265890/) | Minimalist | 97% / 5,721 |  |
| D | [Tangle Tower](https://store.steampowered.com/app/359510/) | Noir | 95% / 5,243 |  |
| D | [Pilgrims](https://store.steampowered.com/app/1049280/) | Stylized/Hand-drawn | 96% / 5,110 | 融合 生活养成、卡牌桌游 |
| D | [Duck Detective: The Secret Salami](https://store.steampowered.com/app/2637990/) | Cute/Noir | 96% / 5,090 |  |
| D | [PRICE](https://store.steampowered.com/app/465520/) | Anime | 94% / 5,094 | 融合 恐怖 |
| D | [Frog Detective 1: The Haunted Island](https://store.steampowered.com/app/963000/) | Colorful/Cute | 93% / 5,048 |  |
| D | [Back to the Dawn](https://store.steampowered.com/app/1735700/) | Pixel Graphics | 93% / 4,935 | 融合 角色扮演、叙事 |
| D | [klocki](https://store.steampowered.com/app/499440/) | Minimalist/Abstract | 97% / 4,645 | 融合 生活养成 |
| D | [The Darkside Detective](https://store.steampowered.com/app/368390/) | Pixel Graphics | 95% / 4,724 |  |
| D | [Patrick's Parabox](https://store.steampowered.com/app/1260520/) | Minimalist/Abstract | 99% / 4,472 |  |
| D | [Hexcells Infinite](https://store.steampowered.com/app/304410/) | Minimalist | 97% / 4,440 | 融合 生活养成 |
| D | [Day of the Tentacle Remastered](https://store.steampowered.com/app/388210/) | Cartoony | 97% / 4,437 |  |
| D | [Neighbours back From Hell](https://store.steampowered.com/app/1283190/) | Colorful | 95% / 4,355 |  |
| D | [The Supper](https://store.steampowered.com/app/1171370/) | Pixel Graphics | 99% / 4,121 | 融合 恐怖、生活养成 |
| D | [Backbone: Prologue](https://store.steampowered.com/app/992310/) | Pixel Graphics/Noir | 97% / 4,122 |  |
| D | [When The Past Was Around](https://store.steampowered.com/app/1164050/) | Surreal/Abstract | 96% / 4,049 | 融合 叙事 |
| D | [Paradise Killer](https://store.steampowered.com/app/1160220/) | Stylized/Surreal | 93% / 4,049 | 融合 探索冒险 |
| D | [Thimbleweed Park](https://store.steampowered.com/app/569860/) | Pixel Graphics | 93% / 3,936 |  |
| D | [HIVESWAP: ACT 1](https://store.steampowered.com/app/623940/) | Cute | 93% / 3,948 | 融合 探索冒险 |
| D | [Zup! 8](https://store.steampowered.com/app/799070/) | Minimalist | 96% / 3,743 | 融合 沙盒、生活养成 |
| D | [Zup! Z](https://store.steampowered.com/app/1218900/) | Minimalist | 97% / 3,656 | 融合 沙盒、生活养成 |
| D | [Kathy Rain](https://store.steampowered.com/app/370910/) | Pixel Graphics/Noir | 92% / 3,778 |  |
| D | [Primordia](https://store.steampowered.com/app/227000/) | Pixel Graphics/Noir | 97% / 3,302 | 融合 探索冒险 |
| D | [Milo and the Magpies](https://store.steampowered.com/app/1407420/) | Hand-drawn/Colorful | 99% / 3,132 |  |
| D | [Birth](https://store.steampowered.com/app/1889040/) | Stylized/Hand-drawn | 96% / 3,152 |  |
| D | [Ace Attorney Investigations Collection](https://store.steampowered.com/app/2401970/) | Pixel Graphics | 97% / 3,077 | 融合 叙事 |
| D | [Apollo Justice: Ace Attorney Trilogy](https://store.steampowered.com/app/2187220/) | Anime | 91% / 3,272 | 融合 叙事 |
| D | [FRAMED Collection](https://store.steampowered.com/app/322450/) | Comic Book/Minimalist | 93% / 2,920 |  |
| D | [Later Alligator](https://store.steampowered.com/app/966320/) | Cartoony/Cute | 96% / 2,765 |  |
| D | [Hidden Through Time](https://store.steampowered.com/app/524910/) | Colorful/Cute | 94% / 2,833 |  |
| D | [Hexcells Plus](https://store.steampowered.com/app/271900/) | Minimalist | 95% / 2,683 |  |
| D | [Chaos on Deponia](https://store.steampowered.com/app/220740/) | Hand-drawn | 90% / 2,794 |  |
| D | [Insomnia: Theater in the Head](https://store.steampowered.com/app/2085360/) | Stylized/Hand-drawn | 98% / 2,547 |  |
| D | [Zup! 4](https://store.steampowered.com/app/591420/) | Minimalist/Cute | 90% / 2,734 |  |
| D | [NORCO](https://store.steampowered.com/app/1221250/) | Colorful/Pixel Graphics | 93% / 2,617 |  |
| D | [Zup! 5](https://store.steampowered.com/app/645090/) | Minimalist | 94% / 2,558 | 融合 沙盒 |
| D | [Zup! Zero](https://store.steampowered.com/app/610360/) | Minimalist/Cute | 94% / 2,467 | 融合 生活养成、沙盒 |
| D | [Unavowed](https://store.steampowered.com/app/336140/) | Pixel Graphics | 96% / 2,392 | 融合 叙事 |
| D | [Timelie](https://store.steampowered.com/app/1150950/) | Cute | 94% / 2,418 |  |
| D | [Sizeable](https://store.steampowered.com/app/1333910/) | Colorful/Minimalist | 98% / 2,313 | 融合 生活养成 |
| D | [The Excavation of Hob's Barrow](https://store.steampowered.com/app/1182310/) | Pixel Graphics | 93% / 2,444 | 融合 恐怖、叙事 |
| D | [Don't Escape: 4 Days to Survive](https://store.steampowered.com/app/611760/) | Pixel Graphics | 98% / 2,272 | 融合 叙事、探索冒险 |
| D | [Chicken Police - Paint it RED!](https://store.steampowered.com/app/1084640/) | Noir | 95% / 2,314 | 融合 叙事 |
| D | [Save Room - Organization Puzzle](https://store.steampowered.com/app/1955330/) | Minimalist | 97% / 2,250 | 融合 建造经营、恐怖、生活养成 |
| D | [This Bed We Made](https://store.steampowered.com/app/1243850/) | Noir | 91% / 2,340 | 融合 叙事、探索冒险 |
| D | [100 hidden cats](https://store.steampowered.com/app/1587560/) | Stylized/Hand-drawn | 95% / 2,238 |  |
| D | [I hate this game](https://store.steampowered.com/app/976010/) | Pixel Graphics/Minimalist | 93% / 2,262 | 融合 平台跳跃 |
| D | [Detective Grimoire](https://store.steampowered.com/app/272600/) | Colorful | 96% / 2,157 |  |
| D | [Labyrinth City: Pierre the Maze Detective](https://store.steampowered.com/app/1421790/) | Hand-drawn/Colorful | 96% / 2,137 | 融合 探索冒险 |
| D | [Zup! 6](https://store.steampowered.com/app/566160/) | Minimalist | 95% / 2,141 | 融合 沙盒、生活养成 |
| D | [The Bookwalker: Thief of Tales](https://store.steampowered.com/app/1432100/) | Surreal/Noir | 92% / 2,154 | 融合 探索冒险 |
| D | [Dropsy](https://store.steampowered.com/app/274350/) | Pixel Graphics/Surreal | 93% / 2,033 | 融合 探索冒险 |
| E | [Contraband Police: Prologue](https://store.steampowered.com/app/1396240/) | Colorful | 89% / 7,226 | 融合 射击、竞速 |

#### 叙事（190 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Kentucky Route Zero](https://store.steampowered.com/app/231200/) | IGF 2013★，案例库，Beautiful/Stylized | 81% / 4,158 | 融合 探索冒险、解谜 |
| B | [Detroit: Become Human](https://store.steampowered.com/app/1222140/) | BAFTA 2018，DICE 2018，Beautiful | 96% / 169,199 |  |
| B | [Disco Elysium](https://store.steampowered.com/app/632470/) | BAFTA 2019，案例库，Surreal/Noir | 93% / 111,712 | 融合 解谜、角色扮演 |
| B | [Beyond: Two Souls](https://store.steampowered.com/app/960990/) | BAFTA 2013，Beautiful | 88% / 28,027 | 融合 恐怖 |
| B | [Night in the Woods](https://store.steampowered.com/app/481510/) | IGF 2018，IGF 2017，案例库，Stylized/Hand-drawn | 94% / 18,741 |  |
| B | [Heavy Rain](https://store.steampowered.com/app/960910/) | BAFTA 2010 | 85% / 19,707 | 融合 解谜 |
| B | [Pentiment](https://store.steampowered.com/app/1205520/) | BAFTA 2022，案例库，Stylized/Hand-drawn | 95% / 7,746 | 融合 解谜 |
| B | [Behind the Frame](https://store.steampowered.com/app/1634150/) | IGF 2022，案例库，Hand-drawn/Colorful | 94% / 6,910 | 融合 解谜 |
| B | [I Was a Teenage Exocolonist](https://store.steampowered.com/app/1148760/) | IGF 2023，Hand-drawn | 97% / 3,931 |  |
| B | [Venba](https://store.steampowered.com/app/1491670/) | IGF 2024，案例库，Stylized/Hand-drawn | 92% / 2,577 |  |
| B | [Forgotton Anne](https://store.steampowered.com/app/542050/) | IGF 2019，案例库，Stylized/Hand-drawn | 90% / 1,876 | 融合 平台跳跃 |
| B | [Goodbye Volcano High](https://store.steampowered.com/app/1310330/) | IGF 2024，Hand-drawn/Comic Book | 89% / 1,643 |  |
| B | [IMMORTALITY](https://store.steampowered.com/app/1350200/) | BAFTA 2022，Noir | 84% / 1,678 | 融合 解谜 |
| B | [Minute of Islands](https://store.steampowered.com/app/1049710/) | IGF 2020，案例库，Hand-drawn/Cartoony | 78% / 853 | 融合 探索冒险、平台跳跃 |
| B | [Miniatures](https://store.steampowered.com/app/2428840/) | IGF 2025，Stylized/Hand-drawn | 96% / 233 | 融合 解谜、探索冒险 |
| B | [Stilstand](https://store.steampowered.com/app/1282320/) | IGF 2021，Hand-drawn/Comic Book | 96% / 71 |  |
| B | PBJ - The Musical（待核（Steam 美区搜索不到）） | IGF 2026 | — | 音乐剧式小品（品类待核） |
| B | The Sailor's Dream（手机） | IGF 2015 | — | 融合 探索冒险；无战斗的叙事探索 |
| B | DEVICE 6（iOS） | BAFTA 2013 | — | 融合 解谜；文字排版本身就是关卡与 UI |
| C | [Undertale](https://store.steampowered.com/app/391540/) | 案例库，Pixel Graphics/Cute | 97% / 272,932 |  |
| C | [饿殍：明末千里行](https://store.steampowered.com/app/2593370/) | 案例库，Anime/Cute | 96% / 52,780 | 融合 生活养成 |
| C | [VA-11 Hall-A](https://store.steampowered.com/app/447530/) | 案例库，Pixel Graphics/Anime | 97% / 36,462 |  |
| C | [The Wolf Among Us](https://store.steampowered.com/app/250320/) | 案例库，Cartoony/Comic Book | 98% / 35,678 | 融合 解谜 |
| C | [Slay the Princess](https://store.steampowered.com/app/1989270/) | 案例库，Hand-drawn/Comic Book | 97% / 23,963 |  |
| C | [Batman - The Telltale Series](https://store.steampowered.com/app/498240/) | 案例库，Comic Book/Noir | 87% / 15,888 | 融合 解谜 |
| C | [Florence](https://store.steampowered.com/app/1102130/) | 案例库，Beautiful/Stylized | 93% / 14,237 |  |
| C | [Pyre](https://store.steampowered.com/app/462770/) | 案例库，Stylized/Hand-drawn | 91% / 9,038 |  |
| C | [Citizen Sleeper](https://store.steampowered.com/app/1578650/) | 案例库，Hand-drawn | 93% / 8,105 |  |
| C | [Haven](https://store.steampowered.com/app/983970/) | 案例库，Beautiful/Anime | 90% / 5,037 | 融合 角色扮演、探索冒险 |
| C | [Card Shark](https://store.steampowered.com/app/1371720/) | 案例库，Stylized/Hand-drawn | 91% / 2,809 | 融合 卡牌桌游 |
| C | [SEASON: A letter to the future](https://store.steampowered.com/app/695330/) | 案例库，Stylized | 93% / 1,863 | 融合 探索冒险 |
| C | 尼山萨满（手机 / 主机） | 案例库 | — | 融合 解谜；剪纸风音乐节奏 + 叙事（待核：品类介于节奏与叙事） |
| D | [Mirror](https://store.steampowered.com/app/644560/) | Anime | 97% / 82,973 | 融合 生活养成、角色扮演 |
| D | [To the Moon](https://store.steampowered.com/app/206440/) | Pixel Graphics | 96% / 80,261 |  |
| D | [Everlasting Summer](https://store.steampowered.com/app/331470/) | Anime | 95% / 75,514 |  |
| D | [OneShot](https://store.steampowered.com/app/420530/) | Pixel Graphics/Cute | 98% / 53,704 | 融合 探索冒险 |
| D | [The Henry Stickmin Collection](https://store.steampowered.com/app/1089980/) | Hand-drawn | 99% / 50,698 |  |
| D | [NEEDY STREAMER OVERLOAD](https://store.steampowered.com/app/1451940/) | Pixel Graphics/Anime | 95% / 47,205 | 融合 恐怖 |
| D | [Volcano Princess](https://store.steampowered.com/app/1669980/) | Anime/Cute | 98% / 41,180 | 融合 生活养成、角色扮演 |
| D | [LoveChoice](https://store.steampowered.com/app/939400/) | Beautiful/Cute | 93% / 33,890 |  |
| D | [Senren＊Banka](https://store.steampowered.com/app/1144400/) | Anime/Cute | 99% / 31,226 | 融合 生活养成 |
| D | [The Walking Dead: The Telltale Definitive Series](https://store.steampowered.com/app/1449690/) | Comic Book | 97% / 31,041 |  |
| D | [Milk inside a bag of milk inside a bag of milk](https://store.steampowered.com/app/1392820/) | Anime/Abstract | 97% / 29,935 | 融合 恐怖 |
| D | [Doki Doki Literature Club Plus!](https://store.steampowered.com/app/1388880/) | Anime/Cute | 97% / 27,539 |  |
| D | [NEKOPARA Vol. 1](https://store.steampowered.com/app/333600/) | Anime/Cute | 95% / 26,924 | 融合 生活养成 |
| D | [Danganronpa 2: Goodbye Despair](https://store.steampowered.com/app/413420/) | Anime | 96% / 26,611 | 融合 恐怖、解谜、探索冒险 |
| D | [Rhythm Doctor](https://store.steampowered.com/app/774181/) | Pixel Graphics | 98% / 21,213 |  |
| D | [ATRI -My Dear Moments-](https://store.steampowered.com/app/1230140/) | Anime/Cute | 99% / 20,882 |  |
| D | [STEINS;GATE](https://store.steampowered.com/app/412830/) | Anime | 97% / 21,078 |  |
| D | [Road 96 ](https://store.steampowered.com/app/1466640/) | Colorful | 92% / 21,418 |  |
| D | [The Test](https://store.steampowered.com/app/1241510/) | Pixel Graphics | 97% / 19,954 | 融合 恐怖 |
| D | [Finding Paradise](https://store.steampowered.com/app/337340/) | Pixel Graphics | 98% / 18,763 | 融合 探索冒险、角色扮演 |
| D | [Milk outside a bag of milk outside a bag of milk](https://store.steampowered.com/app/1604000/) | Pixel Graphics/Abstract | 97% / 18,723 | 融合 恐怖 |
| D | [Before Your Eyes](https://store.steampowered.com/app/1082430/) | Hand-drawn/Colorful | 98% / 17,499 |  |
| D | [NEKOPARA Vol. 0](https://store.steampowered.com/app/385800/) | Anime/Cute | 94% / 17,525 | 融合 生活养成 |
| D | [Outcore: Desktop Adventure](https://store.steampowered.com/app/1275670/) | Colorful/Cute | 97% / 15,157 | 融合 解谜、恐怖、探索冒险 |
| D | [Our Life: Beginnings & Always](https://store.steampowered.com/app/1129190/) | Cute | 99% / 12,452 |  |
| D | [NEKOPARA Vol. 2](https://store.steampowered.com/app/420110/) | Anime/Cute | 97% / 12,598 | 融合 生活养成 |
| D | [The Red Strings Club](https://store.steampowered.com/app/589780/) | Pixel Graphics | 94% / 12,839 |  |
| D | [Find Love or Die Trying](https://store.steampowered.com/app/1714320/) | Anime | 97% / 12,007 | 融合 生活养成 |
| D | [I Love You, Colonel Sanders! A Finger Lickin’ Good Dating Simulator](https://store.steampowered.com/app/1121910/) | Beautiful/Anime | 92% / 12,608 | 融合 生活养成 |
| D | [NEKOPARA Vol. 3](https://store.steampowered.com/app/602520/) | Anime/Cute | 97% / 11,893 | 融合 生活养成 |
| D | [Impostor Factory](https://store.steampowered.com/app/1182620/) | Pixel Graphics | 96% / 11,773 | 融合 恐怖 |
| D | [Yog-Sothoth’s Yard](https://store.steampowered.com/app/2194530/) | Anime/Cute | 95% / 11,705 | 融合 生活养成、建造经营、角色扮演 |
| D | [Coffee Talk](https://store.steampowered.com/app/914800/) | Pixel Graphics | 95% / 11,267 |  |
| D | [A Date with Death](https://store.steampowered.com/app/2415010/) | Anime | 98% / 10,483 |  |
| D | [Pathologic 2](https://store.steampowered.com/app/505230/) | Surreal | 92% / 10,915 | 融合 恐怖、探索冒险、生存 |
| D | [Until Then](https://store.steampowered.com/app/1574820/) | Pixel Graphics | 98% / 9,868 |  |
| D | [CLANNAD](https://store.steampowered.com/app/324160/) | Anime/Cute | 99% / 9,709 |  |
| D | [Shower With Your Dad Simulator 2015: Do You Still Shower With Your Dad](https://store.steampowered.com/app/359050/) | Pixel Graphics/Surreal | 95% / 9,897 | 融合 动作 |
| D | [魔女的夜宴](https://store.steampowered.com/app/2458530/) | Anime | 99% / 8,775 | 融合 射击、生活养成 |
| D | [Kindergarten](https://store.steampowered.com/app/589590/) | Pixel Graphics | 97% / 8,817 | 融合 恐怖 |
| D | [OPUS: Echo of Starsong - Full Bloom Edition](https://store.steampowered.com/app/1504500/) | Anime | 96% / 8,773 |  |
| D | [Batman: The Enemy Within - The Telltale Series](https://store.steampowered.com/app/675260/) | Comic Book | 92% / 9,139 | 融合 解谜 |
| D | [NEKOPARA Vol. 4](https://store.steampowered.com/app/1406990/) | Anime/Cute | 97% / 8,619 |  |
| D | [BAD END THEATER](https://store.steampowered.com/app/1764390/) | Pixel Graphics/Anime | 98% / 8,332 |  |
| D | [Otaku's Adventure](https://store.steampowered.com/app/937170/) | Anime/Cute | 95% / 8,421 |  |
| D | [The Great Ace Attorney Chronicles](https://store.steampowered.com/app/1158850/) | Anime | 94% / 8,158 | 融合 解谜 |
| D | [Lucy -The Eternity She Wished For-](https://store.steampowered.com/app/430960/) | Anime/Cute | 95% / 8,061 |  |
| D | [AI: The Somnium Files](https://store.steampowered.com/app/948740/) | Anime | 92% / 8,364 | 融合 解谜 |
| D | [Material Girl](https://store.steampowered.com/app/644570/) | Anime | 92% / 8,047 | 融合 探索冒险、射击、生活养成 |
| D | [Gaokao.Love.100Days](https://store.steampowered.com/app/347620/) | Anime/Cute | 91% / 7,937 | 融合 生活养成 |
| D | [Far Away](https://store.steampowered.com/app/1250760/) | Anime/Cute | 98% / 7,360 |  |
| D | [Hatoful Boyfriend](https://store.steampowered.com/app/310080/) | Anime | 94% / 7,443 | 融合 生活养成 |
| D | [Marco & The Galaxy Dragon](https://store.steampowered.com/app/1202540/) | Anime/Cute | 98% / 7,068 |  |
| D | [Long Live The Queen](https://store.steampowered.com/app/251990/) | Anime/Cute | 95% / 7,038 |  |
| D | [STEINS;GATE 0](https://store.steampowered.com/app/825630/) | Anime | 96% / 6,918 |  |
| D | [King Exit](https://store.steampowered.com/app/712840/) | Anime | 95% / 6,818 | 融合 角色扮演 |
| D | [Aliya: Timelink](https://store.steampowered.com/app/2704110/) | Minimalist | 98% / 6,512 |  |
| D | [THE LONGING](https://store.steampowered.com/app/893850/) | Hand-drawn | 92% / 6,788 | 融合 探索冒险、解谜 |
| D | [Lay a Beauty to Rest: The Darkness Peach Blossom Spring](https://store.steampowered.com/app/1506980/) | Anime | 97% / 6,464 |  |
| D | [The NOexistenceN of you AND me](https://store.steampowered.com/app/2873080/) | Anime/Surreal | 94% / 6,585 |  |
| D | [Riddle Joker](https://store.steampowered.com/app/1277930/) | Anime/Cute | 98% / 6,239 | 融合 生活养成 |
| D | [Zero Escape: The Nonary Games](https://store.steampowered.com/app/477740/) | Anime | 93% / 6,206 |  |
| D | [Aokana - Four Rhythms Across the Blue](https://store.steampowered.com/app/1044620/) | Anime | 98% / 5,825 |  |
| D | [Emily is Away <3](https://store.steampowered.com/app/978460/) | Cute | 92% / 6,114 |  |
| D | [Word Game](https://store.steampowered.com/app/1109570/) | Noir | 94% / 5,972 | 融合 角色扮演、解谜 |
| D | [Emily is Away Too](https://store.steampowered.com/app/523780/) | Pixel Graphics | 93% / 5,977 |  |
| D | [Hooked on You: A Dead by Daylight Dating Sim](https://store.steampowered.com/app/1866180/) | Anime | 91% / 6,110 |  |
| D | [Fox Hime Zero](https://store.steampowered.com/app/844930/) | Anime/Cute | 97% / 5,682 |  |
| D | [WITCH ON THE HOLY NIGHT](https://store.steampowered.com/app/2052410/) | Anime | 98% / 5,466 |  |
| D | [Café Stella and the Reaper's Butterflies](https://store.steampowered.com/app/1829980/) | Anime/Cute | 98% / 5,385 |  |
| D | [星空列车与白的旅行](https://store.steampowered.com/app/1567800/) | Anime/Cute | 99% / 5,331 | 融合 生活养成 |
| D | [Vampires' Melody](https://store.steampowered.com/app/1377360/) | Anime/Cartoon | 98% / 5,377 | 融合 生活养成 |
| D | [YOU and ME and HER: A Love Story](https://store.steampowered.com/app/1293820/) | Anime | 96% / 5,466 | 融合 恐怖 |
| D | [Higurashi When They Cry Hou - Ch.1 Onikakushi](https://store.steampowered.com/app/310360/) | Anime/Cute | 96% / 5,312 |  |
| D | [WILL: A Wonderful World / WILL：美好世界](https://store.steampowered.com/app/588040/) | Anime | 93% / 5,385 |  |
| D | [PARANORMASIGHT: The Seven Mysteries of Honjo](https://store.steampowered.com/app/2106840/) | Hand-drawn/Anime | 96% / 5,190 | 融合 恐怖 |
| D | [The House in Fata Morgana](https://store.steampowered.com/app/303310/) | Anime | 95% / 5,103 | 融合 恐怖 |
| D | [Kindergarten 2](https://store.steampowered.com/app/1067850/) | Pixel Graphics | 98% / 4,892 | 融合 恐怖、探索冒险 |
| D | [I Wani Hug that Gator!](https://store.steampowered.com/app/1895350/) | Cute | 99% / 4,839 |  |
| D | [Narcissu 1st & 2nd](https://store.steampowered.com/app/264380/) | Anime | 96% / 4,881 |  |
| D | [Mosaique Neko Waifus 4](https://store.steampowered.com/app/1504020/) | Anime/Cute | 95% / 4,840 | 融合 生活养成 |
| D | [The Cosmic Wheel Sisterhood](https://store.steampowered.com/app/1340480/) | Pixel Graphics | 94% / 4,858 |  |
| D | [Maitetsu:Last Run!!](https://store.steampowered.com/app/1434480/) | Anime/Cute | 98% / 4,620 | 融合 射击 |
| D | [eden*](https://store.steampowered.com/app/315810/) | Anime/Cute | 97% / 4,637 |  |
| D | [Cute Honey](https://store.steampowered.com/app/1347430/) | Anime | 91% / 4,820 | 融合 射击、恐怖 |
| D | [Ib](https://store.steampowered.com/app/1901370/) | Pixel Graphics/Cute | 99% / 4,386 | 融合 恐怖 |
| D | [Summer Pockets](https://store.steampowered.com/app/897220/) | Anime | 99% / 4,336 |  |
| D | [私のリアルは充実しすぎている フルボイス版](https://store.steampowered.com/app/2106520/) | Anime | 96% / 4,388 |  |
| D | [If My Heart Had Wings](https://store.steampowered.com/app/326480/) | Anime/Cute | 92% / 4,559 |  |
| D | [泡沫冬景](https://store.steampowered.com/app/1049100/) | Anime | 96% / 4,390 | 融合 生活养成 |
| D | [Roadwarden](https://store.steampowered.com/app/1155970/) | Pixel Graphics | 95% / 4,218 |  |
| D | [Class of '09: The Re-Up](https://store.steampowered.com/app/2318310/) | Anime | 98% / 4,036 |  |
| D | [Cinderella Phenomenon - Otome/Visual Novel](https://store.steampowered.com/app/568770/) | Anime | 96% / 4,047 |  |
| D | [Tiny Snow](https://store.steampowered.com/app/1002560/) | Anime/Cute | 94% / 4,122 |  |
| D | [家有大貓 Nekojishi](https://store.steampowered.com/app/570840/) | Cute | 93% / 4,134 |  |
| D | [Ten Trials of Babel: The Doppelganger Maze](https://store.steampowered.com/app/1900340/) | Pixel Graphics | 93% / 4,087 |  |
| D | [NEKOPARA Extra](https://store.steampowered.com/app/899970/) | Anime/Cute | 97% / 3,844 |  |
| D | [Katawa Shoujo](https://store.steampowered.com/app/3068300/) | Anime/Cute | 98% / 3,806 |  |
| D | [My Vow to My Liege](https://store.steampowered.com/app/1146970/) | Anime | 93% / 3,949 |  |
| D | [月に寄りそう乙女の作法](https://store.steampowered.com/app/1776970/) | Anime/Cartoon | 98% / 3,748 |  |
| D | [Chasing Tails ~A Promise in the Snow~](https://store.steampowered.com/app/1555110/) | Anime | 92% / 3,921 | 融合 恐怖 |
| D | [DRAMAtical Murder](https://store.steampowered.com/app/1481080/) | Anime | 97% / 3,678 |  |
| D | [Fluffy Store](https://store.steampowered.com/app/1038740/) | Anime/Cute | 97% / 3,594 |  |
| D | [Amnesia: Memories](https://store.steampowered.com/app/359390/) | Anime | 92% / 3,747 | 融合 恐怖 |
| D | [Threefold Recital](https://store.steampowered.com/app/3084280/) | Cartoony/Cute | 99% / 3,475 | 融合 解谜、平台跳跃 |
| D | [Billionaire Lovers](https://store.steampowered.com/app/1578860/) | Anime | 95% / 3,605 |  |
| D | [月影魅像-解放之羽-](https://store.steampowered.com/app/1069230/) | Anime | 98% / 3,507 |  |
| D | [Beacon Pines](https://store.steampowered.com/app/1269640/) | Colorful/Cute | 98% / 3,495 | 融合 生活养成 |
| D | [DATE A LIVE: Rio Reincarnation](https://store.steampowered.com/app/1047440/) | Anime/Cute | 95% / 3,511 | 融合 生活养成 |
| D | [Mitoza](https://store.steampowered.com/app/1516240/) | Surreal | 96% / 3,423 |  |
| D | [Pretty Angel](https://store.steampowered.com/app/1148510/) | Anime/Cute | 92% / 3,552 | 融合 角色扮演 |
| D | [Rift of the NecroDancer](https://store.steampowered.com/app/2073250/) | Anime/Cute | 96% / 3,196 | 融合 动作 |
| D | [Dream Ending](https://store.steampowered.com/app/944020/) | Anime | 97% / 3,119 |  |
| D | [Muv-Luv Alternative](https://store.steampowered.com/app/802890/) | Anime | 96% / 3,142 |  |
| D | [Staffer Case: A Supernatural Mystery Adventure](https://store.steampowered.com/app/2128480/) | Cartoony/Anime | 95% / 3,187 | 融合 解谜、探索冒险 |
| D | [Fate/stay night REMASTERED](https://store.steampowered.com/app/2396980/) | Anime | 96% / 3,143 |  |
| D | [Ticy Adventure Club](https://store.steampowered.com/app/2135690/) | Cartoony/Pixel Graphics | 98% / 3,059 | 融合 恐怖 |
| D | [GNOSIA](https://store.steampowered.com/app/1608290/) | Anime | 94% / 3,185 |  |
| D | [fault - milestone one](https://store.steampowered.com/app/286260/) | Anime | 93% / 3,221 |  |
| D | [Some Some Convenience Store](https://store.steampowered.com/app/1217390/) | Anime/Cute | 96% / 3,078 | 融合 生活养成 |
| D | [planetarian HD](https://store.steampowered.com/app/623080/) | Anime/Cute | 99% / 2,981 |  |
| D | [Press Any Button](https://store.steampowered.com/app/1448030/) | Pixel Graphics | 91% / 3,247 |  |
| D | [恋爱绮谭~不存在的夏天~](https://store.steampowered.com/app/1345740/) | Anime/Cute | 95% / 2,969 |  |
| D | [one night, hot springs](https://store.steampowered.com/app/917680/) | Anime/Cute | 96% / 2,904 |  |
| D | [OneShot: World Machine Edition](https://store.steampowered.com/app/2915460/) | Pixel Graphics/Surreal | 99% / 2,807 | 融合 探索冒险 |
| D | [Bishojo Mangekyo Kotowari to Meikyu no Shojo](https://store.steampowered.com/app/1310990/) | Anime | 96% / 2,881 | 融合 射击 |
| D | [Tape to Tape](https://store.steampowered.com/app/1566200/) | Colorful/Comic Book | 92% / 2,958 | 融合 建造经营 |
| D | [Mosaique Neko Waifus 2](https://store.steampowered.com/app/1299120/) | Colorful | 95% / 2,825 |  |
| D | [他人世界末 On-looker](https://store.steampowered.com/app/1225780/) | Anime | 94% / 2,823 | 融合 生活养成 |
| D | [Who's Lila?](https://store.steampowered.com/app/1697700/) | Surreal | 95% / 2,731 | 融合 解谜、恐怖 |
| D | [A Raven Monologue](https://store.steampowered.com/app/744810/) | Hand-drawn | 95% / 2,657 | 融合 生活养成、探索冒险 |
| D | [Highway Blossoms](https://store.steampowered.com/app/451760/) | Anime/Cute | 94% / 2,613 |  |
| D | [fault - milestone two side:above](https://store.steampowered.com/app/344770/) | Anime | 96% / 2,555 |  |
| D | [GINKA](https://store.steampowered.com/app/2536840/) | Anime/Surreal | 91% / 2,604 |  |
| D | [Love Delivery](https://store.steampowered.com/app/1817940/) | Anime | 96% / 2,443 | 融合 生活养成 |
| D | [人间 The Lost We Lost](https://store.steampowered.com/app/1057680/) | Anime | 95% / 2,460 |  |
| D | [Tayutama 2-you're the only one-](https://store.steampowered.com/app/552280/) | Anime/Cute | 95% / 2,420 | 融合 生活养成 |
| D | [Lacuna – A Sci-Fi Noir Adventure](https://store.steampowered.com/app/1364100/) | Pixel Graphics/Noir | 92% / 2,471 | 融合 解谜 |
| D | [Coffee Talk Episode 2: Hibiscus & Butterfly](https://store.steampowered.com/app/1663220/) | Pixel Graphics | 97% / 2,312 |  |
| D | [Sakuya Izayoi Gives You Advice And Dabs](https://store.steampowered.com/app/1232180/) | Beautiful/Anime | 98% / 2,293 | 融合 生活养成、恐怖 |
| D | [Epiphyllum in Love](https://store.steampowered.com/app/1161870/) | Anime | 99% / 2,247 | 融合 生活养成 |
| D | [LOVE³ -Love Cube-](https://store.steampowered.com/app/939600/) | Anime | 95% / 2,328 | 融合 生活养成 |
| D | [a new life.](https://store.steampowered.com/app/1297160/) | Cute | 97% / 2,250 |  |
| D | [恋爱绮谭 不存在的真相](https://store.steampowered.com/app/1777430/) | Anime/Cute | 97% / 2,243 |  |
| D | [PARQUET](https://store.steampowered.com/app/1662840/) | Colorful/Anime | 95% / 2,249 |  |
| D | [Stella of The End](https://store.steampowered.com/app/2510770/) | Anime/Cute | 98% / 2,192 |  |
| D | [Analogue: A Hate Story](https://store.steampowered.com/app/209370/) | Anime | 93% / 2,280 |  |
| D | [NUKITASHI](https://store.steampowered.com/app/2399220/) | Anime/Cute | 96% / 2,170 |  |
| D | [Aviary Attorney](https://store.steampowered.com/app/384630/) | Hand-drawn | 95% / 2,168 | 融合 解谜 |
| D | [The Lion's Song: Episode 1 - Silence](https://store.steampowered.com/app/437160/) | Pixel Graphics | 92% / 2,220 |  |
| D | [千面 Melancholy Love](https://store.steampowered.com/app/1168470/) | Anime | 95% / 2,137 |  |
| D | [The Crown of Leaves](https://store.steampowered.com/app/604330/) | Hand-drawn | 96% / 2,092 |  |
| D | [Flowers Blooming at the End of Summer](https://store.steampowered.com/app/1173010/) | Anime/Cute | 96% / 2,089 |  |
| D | [planetarian ~the reverie of a little planet~](https://store.steampowered.com/app/316720/) | Anime/Cute | 98% / 2,032 |  |
| D | [Crimson Imprint plus -Nonexistent Christmas-](https://store.steampowered.com/app/740260/) | Anime | 94% / 2,095 | 融合 生活养成 |
| D | [Mosaique Neko Waifus 3](https://store.steampowered.com/app/1385730/) | Colorful/Anime | 95% / 2,050 |  |
| D | [Season of 12 Colors](https://store.steampowered.com/app/370280/) | Anime/Cute | 94% / 2,026 |  |
| D | [If Found...](https://store.steampowered.com/app/1041920/) | Beautiful/Stylized | 90% / 2,068 |  |

### ④ 卡牌 / 竞速 / 射击

#### 卡牌桌游（20 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | [Inscryption](https://store.steampowered.com/app/1092790/) | IGF 2022，案例库，Pixel Graphics/Surreal | 97% / 131,890 |  |
| B | [Armello](https://store.steampowered.com/app/290340/) | IGF 2016，案例库，Hand-drawn | 82% / 15,759 | 融合 策略 |
| B | [Lara Croft GO](https://store.steampowered.com/app/540840/) | DICE 2015，案例库，Anime | 93% / 3,755 | 融合 探索冒险、平台跳跃、解谜 |
| C | [Wash Card](https://store.steampowered.com/app/2095150/) | 案例库，Stylized/Hand-drawn | 50% / 2 | 融合 策略 |
| D | [Balatro](https://store.steampowered.com/app/2379780/) | Pixel Graphics | 98% / 153,566 |  |
| D | [Loop Hero](https://store.steampowered.com/app/1282730/) | Pixel Graphics | 93% / 34,659 | 融合 策略、叙事 |
| D | [100% Orange Juice](https://store.steampowered.com/app/282800/) | Anime/Cute | 92% / 28,236 |  |
| D | [Chrono Ark](https://store.steampowered.com/app/1188930/) | Anime | 90% / 12,267 | 融合 角色扮演 |
| D | [Luck be a Landlord](https://store.steampowered.com/app/1404850/) | Pixel Graphics | 93% / 10,630 | 融合 建造经营 |
| D | [Wingspan](https://store.steampowered.com/app/1054490/) | Cute | 94% / 10,317 | 融合 建造经营、生活养成 |
| D | [Depersonalization](https://store.steampowered.com/app/1477070/) | Pixel Graphics/Anime | 94% / 5,955 | 融合 角色扮演、解谜、恐怖 |
| D | [DICEOMANCER](https://store.steampowered.com/app/2501600/) | Colorful | 97% / 4,696 |  |
| D | [The Jackbox Party Pack 7](https://store.steampowered.com/app/1211630/) | Colorful | 97% / 4,665 |  |
| D | [Curious Expedition](https://store.steampowered.com/app/358130/) | Pixel Graphics | 91% / 4,284 | 融合 策略、恐怖 |
| D | [Esports Godfather](https://store.steampowered.com/app/1278540/) | Voxel | 92% / 3,739 | 融合 策略 |
| D | [Alina of the Arena](https://store.steampowered.com/app/1668690/) | Pixel Graphics | 92% / 3,722 | 融合 策略 |
| D | [Just Go](https://store.steampowered.com/app/1862520/) | Stylized | 93% / 2,958 | 融合 策略 |
| D | [Faerie Solitaire](https://store.steampowered.com/app/38600/) | Colorful/Cute | 91% / 2,521 |  |
| D | [Tiny Civilization](https://store.steampowered.com/app/2230280/) | Hand-drawn/Minimalist | 94% / 2,017 | 融合 建造经营、策略 |
| E | [Last Call BBS](https://store.steampowered.com/app/1511780/) | Pixel Graphics | 92% / 1,409 | 融合 解谜、工厂自动化、沙盒 |

#### 竞速（41 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | Alto's Odyssey（手机） | IGF 2019 | — | 融合 平台跳跃；无尽滑沙：竞速感的跑酷，单键操作 |
| B | Alto's Adventure（手机） | IGF 2016 | — | 融合 平台跳跃；无尽滑雪跑酷，单键操作 |
| D | [NIGHT-RUNNERS PROLOGUE](https://store.steampowered.com/app/2707900/) | Stylized/Noir | 95% / 18,415 |  |
| D | [art of rally](https://store.steampowered.com/app/550320/) | Stylized | 93% / 5,516 |  |
| E | [Forza Horizon 5](https://store.steampowered.com/app/1551360/) | Beautiful | 89% / 225,629 | 融合 探索冒险 |
| E | [Stumble Guys](https://store.steampowered.com/app/1677740/) | Colorful/Cute | 85% / 128,011 | 融合 生存、平台跳跃 |
| E | [Garfield Kart - Furious Racing](https://store.steampowered.com/app/1085510/) | Cartoony/Cute | 88% / 14,489 |  |
| E | [Garfield Kart](https://store.steampowered.com/app/362930/) | Beautiful/Cute | 88% / 14,059 |  |
| E | [MUSYNX](https://store.steampowered.com/app/952040/) | Pixel Graphics/Anime | 89% / 6,241 | 融合 叙事 |
| E | [Redout: Enhanced Edition](https://store.steampowered.com/app/517710/) | Colorful | 85% / 4,567 |  |
| E | [Sonic & SEGA All-Stars Racing](https://store.steampowered.com/app/34190/) | Colorful/Anime | 87% / 3,154 |  |
| E | [Absolute Drift](https://store.steampowered.com/app/320140/) | Surreal/Minimalist | 88% / 2,995 |  |
| E | [Circuit Superstars](https://store.steampowered.com/app/1097130/) | Stylized/Cute | 86% / 2,266 |  |
| E | [Razortron 2000](https://store.steampowered.com/app/539720/) | Stylized/Colorful | 85% / 2,045 |  |
| E | [Crashday Redline Edition](https://store.steampowered.com/app/508980/) | Colorful | 88% / 1,808 |  |
| E | [Barro 2020](https://store.steampowered.com/app/1168660/) | Pixel Graphics | 86% / 1,812 |  |
| E | [Slackers - Carts of Glory](https://store.steampowered.com/app/2354000/) | Stylized/Colorful | 91% / 1,703 | 融合 沙盒 |
| E | [Zeepkist](https://store.steampowered.com/app/1440670/) | Stylized/Colorful | 97% / 1,560 |  |
| E | [Slipstream](https://store.steampowered.com/app/732810/) | Stylized/Colorful | 88% / 1,650 |  |
| E | [Crash Drive 2](https://store.steampowered.com/app/343440/) | Stylized | 90% / 1,429 |  |
| E | [Make Way](https://store.steampowered.com/app/1445790/) | Colorful/Cartoony | 92% / 1,394 |  |
| E | [SKYE](https://store.steampowered.com/app/1214360/) | Beautiful | 92% / 1,319 | 融合 生活养成、探索冒险 |
| E | [Inertial Drift](https://store.steampowered.com/app/1184480/) | Beautiful/Stylized | 86% / 1,358 |  |
| E | [Arcade Moonlander](https://store.steampowered.com/app/727020/) | Pixel Graphics/Noir | 93% / 1,175 | 融合 探索冒险 |
| E | [Fling to the Finish](https://store.steampowered.com/app/1054430/) | Colorful/Cute | 87% / 1,256 | 融合 沙盒 |
| E | [Driftwood](https://store.steampowered.com/app/2223700/) | Cute | 96% / 912 |  |
| E | [Touge Shakai](https://store.steampowered.com/app/2113900/) | Stylized | 86% / 1,005 |  |
| E | [New Star GP](https://store.steampowered.com/app/2217580/) | Stylized/Colorful | 94% / 903 |  |
| E | [Aero GPX](https://store.steampowered.com/app/2160360/) | Stylized/Hand-drawn | 99% / 858 |  |
| E | [Super Woden GP 2](https://store.steampowered.com/app/2083210/) | Colorful | 89% / 883 |  |
| E | [Dog Sled Saga](https://store.steampowered.com/app/286240/) | Pixel Graphics/Cute | 92% / 787 | 融合 建造经营 |
| E | [Kandidatos Kart](https://store.steampowered.com/app/1415140/) | Stylized/Colorful | 86% / 818 |  |
| E | [Buck Up And Drive!](https://store.steampowered.com/app/1714590/) | Stylized/Colorful | 93% / 660 | 融合 动作 |
| E | [You Suck at Parking - Complete Edition](https://store.steampowered.com/app/837880/) | Stylized/Colorful | 86% / 712 |  |
| E | [Beach Buggy Racing 2: Island Adventure](https://store.steampowered.com/app/1230800/) | Cartoon | 92% / 651 | 融合 沙盒 |
| E | [Shipped](https://store.steampowered.com/app/1037190/) | Colorful/Anime | 97% / 615 |  |
| E | [GENSOU Skydrift](https://store.steampowered.com/app/1065260/) | Anime/Cute | 89% / 622 |  |
| E | [Madrun](https://store.steampowered.com/app/1266980/) | Pixel Graphics | 92% / 525 | 融合 平台跳跃 |
| E | [Offroad Mania](https://store.steampowered.com/app/1222040/) | Stylized | 95% / 508 |  |
| E | [Disney•Pixar Cars Mater-National Championship](https://store.steampowered.com/app/332260/) | Cute | 91% / 525 | 融合 探索冒险 |
| E | [Neodash](https://store.steampowered.com/app/1514950/) | Surreal/Abstract | 90% / 501 |  |

#### 射击（90 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Half-Life 2](https://store.steampowered.com/app/220/) | DICE 2004★ | 98% / 245,627 |  |
| A | [BioShock Infinite](https://store.steampowered.com/app/8870/) | BAFTA 2013，GDCA 2013★，DICE 2013，Beautiful | 94% / 140,682 |  |
| A | [BioShock](https://store.steampowered.com/app/7670/) | GDCA 2007★，DICE 2007★ | 94% / 30,931 |  |
| A | [DEATHLOOP](https://store.steampowered.com/app/1252330/) | TGA 2021★，DICE 2021 | 76% / 29,205 |  |
| B | [Team Fortress 2](https://store.steampowered.com/app/440/) | DICE 2007，Cartoony/Cartoon | 90% / 1,161,472 |  |
| B | [Destiny 2](https://store.steampowered.com/app/1085660/) | TGA 2017 | 80% / 625,616 |  |
| B | [Borderlands 2](https://store.steampowered.com/app/49520/) | BAFTA 2012，DICE 2012，案例库，Stylized | 92% / 295,218 |  |
| B | [Battlefield 1](https://store.steampowered.com/app/1238840/) | DICE 2016 | 87% / 192,821 |  |
| B | [Half-Life](https://store.steampowered.com/app/70/) | DICE 1999 | 97% / 148,221 |  |
| B | [Far Cry 3](https://store.steampowered.com/app/220240/) | BAFTA 2012，DICE 2012，Colorful | 89% / 114,019 | 融合 探索冒险 |
| B | [Half-Life: Alyx](https://store.steampowered.com/app/546560/) | BAFTA 2020，Beautiful | 98% / 97,229 | 融合 恐怖 |
| B | [Call of Duty: Modern Warfare 2 (2009)](https://store.steampowered.com/app/10180/) | DICE 2009 | 93% / 58,118 | 融合 策略 |
| B | [Resident Evil 5](https://store.steampowered.com/app/21690/) | DICE 2009 | 87% / 49,117 | 融合 恐怖 |
| B | [Call of Duty: Black Ops](https://store.steampowered.com/app/42700/) | BAFTA 2010 | 91% / 40,225 |  |
| B | [UNCHARTED: Legacy of Thieves Collection](https://store.steampowered.com/app/1659420/) | BAFTA 2017，BAFTA 2016，TGA 2016 | 90% / 29,689 | 融合 探索冒险；Steam 为合集（4 代 + 失落的遗产） |
| B | [Call of Duty 4: Modern Warfare (2007)](https://store.steampowered.com/app/7940/) | DICE 2007 | 94% / 25,070 |  |
| B | [Call of Duty: Modern Warfare](https://store.steampowered.com/app/2000950/) | DICE 2019 | 79% / 20,988 | 融合 策略 |
| B | [Battlefield 3](https://store.steampowered.com/app/1238820/) | DICE 2011 | 70% / 15,360 | 融合 策略 |
| B | [DOOM 3](https://store.steampowered.com/app/208200/) | DICE 2004 | 87% / 11,369 | 融合 恐怖 |
| B | [Void Bastards](https://store.steampowered.com/app/857980/) | IGF 2020，案例库，Stylized/Comic Book | 86% / 5,266 | 融合 动作 |
| B | [STAR WARS Battlefront](https://store.steampowered.com/app/1237980/) | DICE 2015 | 79% / 5,245 |  |
| B | [Call of Duty: Vanguard](https://store.steampowered.com/app/1985820/) | DICE 2021 | 67% / 3,404 | 融合 策略 |
| B | [Children of the Sun](https://store.steampowered.com/app/1309950/) | IGF 2025，案例库，Stylized/Psychedelic | 94% / 1,723 | 融合 策略 |
| B | [Tom Clancy's Rainbow Six Vegas](https://store.steampowered.com/app/13540/) | DICE 2006 | 80% / 1,491 | 融合 策略 |
| B | [Mass Effect 2 (2010) Edition](https://store.steampowered.com/app/2362420/) | BAFTA 2010 | 75% / 248 | 融合 叙事、角色扮演 |
| B | GoldenEye 007（N64 / Xbox / Switch） | DICE 1998 | — |  |
| B | Star Wars Rogue Squadron II: Rogue Leader（GameCube） | DICE 2001 | — | 太空飞行射击 |
| B | Ratchet & Clank: Going Commando（PS2） | DICE 2003 | — | 融合 平台跳跃；武器射击 + 平台跳跃 |
| B | Call of Duty 3（PS3 / Xbox 360 / Wii） | DICE 2006 | — |  |
| B | The Order: 1886（PS4） | DICE 2015 | — | 融合 叙事；电影化第三人称射击 |
| C | [Marvel Rivals](https://store.steampowered.com/app/2767030/) | 案例库 | 80% / 287,569 |  |
| C | [ULTRAKILL](https://store.steampowered.com/app/1229490/) | 案例库，Stylized/Colorful | 98% / 169,751 |  |
| C | [Borderlands 3](https://store.steampowered.com/app/397540/) | 案例库 | 84% / 149,065 |  |
| C | [SUPERHOT](https://store.steampowered.com/app/322500/) | 案例库，Minimalist | 91% / 38,776 |  |
| C | [DUSK](https://store.steampowered.com/app/519860/) | 案例库 | 97% / 23,469 |  |
| C | [Cruelty Squad](https://store.steampowered.com/app/1388770/) | 案例库，Stylized/Surreal | 97% / 20,791 |  |
| C | [The Ascent](https://store.steampowered.com/app/979690/) | 案例库 | 74% / 22,884 | 融合 探索冒险、角色扮演 |
| C | [Max Payne](https://store.steampowered.com/app/12140/) | 案例库，Noir | 89% / 14,653 |  |
| C | [RUINER](https://store.steampowered.com/app/464060/) | 案例库 | 90% / 11,592 | 融合 动作 |
| C | [killer7](https://store.steampowered.com/app/868520/) | 案例库，Stylized/Anime | 92% / 3,422 | 融合 恐怖、探索冒险 |
| C | [Rollerdrome](https://store.steampowered.com/app/1294420/) | 案例库，Stylized/Anime | 91% / 2,089 |  |
| C | [Rez Infinite](https://store.steampowered.com/app/636450/) | 案例库，Psychedelic | 92% / 1,164 | 融合 动作 |
| C | [XIII](https://store.steampowered.com/app/1154790/) | 案例库，Stylized/Cartoony | 37% / 1,438 |  |
| D | [Super Animal Royale](https://store.steampowered.com/app/843380/) | Cute | 94% / 42,367 |  |
| D | [Summer Memories](https://store.steampowered.com/app/1227890/) | Pixel Graphics/Anime | 93% / 21,799 | 融合 角色扮演、叙事 |
| D | [Warhammer 40,000: Boltgun](https://store.steampowered.com/app/2005010/) | Pixel Graphics | 91% / 15,030 |  |
| D | [Max Payne 2: The Fall of Max Payne](https://store.steampowered.com/app/12150/) | Noir | 95% / 11,934 |  |
| D | [Post Void](https://store.steampowered.com/app/1285670/) | Pixel Graphics/Surreal | 97% / 10,895 | 融合 动作 |
| D | [Into the Radius VR](https://store.steampowered.com/app/1012790/) | Surreal | 94% / 10,783 | 融合 恐怖、探索冒险 |
| D | [EARTH DEFENSE FORCE 4.1 The Shadow of New Despair](https://store.steampowered.com/app/410320/) | Anime | 95% / 10,054 |  |
| D | [Shotgun Farmers](https://store.steampowered.com/app/604240/) | Colorful | 93% / 9,847 |  |
| D | [Winter Memories](https://store.steampowered.com/app/2495450/) | Pixel Graphics/Anime | 98% / 9,173 | 融合 角色扮演 |
| D | [POSTAL: Brain Damaged](https://store.steampowered.com/app/1359980/) | Stylized/Pixel Graphics | 96% / 8,470 |  |
| D | [TheDawn](https://store.steampowered.com/app/1475380/) | Anime/Cute | 93% / 8,615 | 融合 动作 |
| D | [MULLET MADJACK](https://store.steampowered.com/app/2111190/) | Stylized/Anime | 98% / 7,532 |  |
| D | [Prodeus](https://store.steampowered.com/app/964800/) | Pixel Graphics | 93% / 7,556 |  |
| D | [Severed Steel](https://store.steampowered.com/app/1227690/) | Stylized/Voxel | 96% / 7,113 | 融合 沙盒 |
| D | [Blood Fresh Supply](https://store.steampowered.com/app/1010750/) | Pixel Graphics | 96% / 7,080 |  |
| D | [AMID EVIL](https://store.steampowered.com/app/673130/) | Colorful/Surreal | 94% / 7,157 |  |
| D | [Relic Hunters Zero: Remix](https://store.steampowered.com/app/382490/) | Pixel Graphics | 93% / 6,768 | 融合 动作 |
| D | [Turbo Overkill](https://store.steampowered.com/app/1328350/) | Pixel Graphics | 95% / 6,486 |  |
| D | [Bit Blaster XL](https://store.steampowered.com/app/433950/) | Pixel Graphics/Minimalist | 96% / 6,148 | 融合 动作 |
| D | [Minishoot' Adventures](https://store.steampowered.com/app/1634860/) | Cute | 98% / 6,013 | 融合 探索冒险、动作、平台跳跃 |
| D | [Echo Point Nova](https://store.steampowered.com/app/1836730/) | Stylized/Voxel | 98% / 5,810 |  |
| D | [Fallen Aces](https://store.steampowered.com/app/1411910/) | Comic Book/Noir | 98% / 5,721 |  |
| D | [Voidigo](https://store.steampowered.com/app/1304680/) | Pixel Graphics | 97% / 4,289 | 融合 动作 |
| D | [Miss Neko 3](https://store.steampowered.com/app/2022180/) | Anime/Cute | 93% / 4,454 | 融合 生活养成、恐怖 |
| D | [Selaco](https://store.steampowered.com/app/1592280/) | Pixel Graphics | 92% / 4,436 |  |
| D | [b](https://store.steampowered.com/app/660880/) | Anime | 91% / 4,181 | 融合 探索冒险 |
| D | [Wolfenstein 3D](https://store.steampowered.com/app/2270/) | Pixel Graphics | 93% / 3,920 |  |
| D | [I Am Your Beast](https://store.steampowered.com/app/1876590/) | Colorful | 99% / 3,660 |  |
| D | [Lovers in a Dangerous Spacetime](https://store.steampowered.com/app/252110/) | Colorful/Cute | 93% / 3,866 | 融合 动作 |
| D | [Robot Roller-Derby Disco Dodgeball](https://store.steampowered.com/app/270450/) | Colorful | 92% / 3,864 |  |
| D | [Maitetsu:Pure Station](https://store.steampowered.com/app/880950/) | Anime/Cute | 97% / 3,580 | 融合 叙事、生活养成 |
| D | [Island Saver](https://store.steampowered.com/app/1210250/) | Colorful/Cute | 95% / 3,578 |  |
| D | [Nightmare Reaper](https://store.steampowered.com/app/1051690/) | Pixel Graphics | 94% / 3,549 |  |
| D | [Live2DViewerEX](https://store.steampowered.com/app/616720/) | Anime | 92% / 3,490 |  |
| D | [Chicken Invaders Universe](https://store.steampowered.com/app/1510460/) | Cartoony | 91% / 3,490 |  |
| D | [Anger Foot](https://store.steampowered.com/app/1978590/) | Colorful | 94% / 2,988 |  |
| D | [Chop Goblins](https://store.steampowered.com/app/1935660/) | Colorful/Pixel Graphics | 98% / 2,811 |  |
| D | [Miss Neko 2](https://store.steampowered.com/app/1203420/) | Anime/Cute | 92% / 2,722 | 融合 生活养成 |
| D | [Wild Animal Racing](https://store.steampowered.com/app/389510/) | Psychedelic | 93% / 2,679 | 融合 竞速 |
| D | [Lovely Planet](https://store.steampowered.com/app/298600/) | Anime/Cute | 91% / 2,678 | 融合 平台跳跃 |
| D | [Divide By Sheep](https://store.steampowered.com/app/252130/) | Cute | 91% / 2,622 | 融合 生活养成、解谜 |
| D | [Vertigo 2](https://store.steampowered.com/app/843390/) | Colorful | 96% / 2,440 |  |
| D | [Beyond Citadel](https://store.steampowered.com/app/3371240/) | Comic Book/Anime | 97% / 2,244 |  |
| D | [Kill The Crows](https://store.steampowered.com/app/2441270/) | Pixel Graphics | 95% / 2,125 |  |
| D | [COMPOUND](https://store.steampowered.com/app/615120/) | Pixel Graphics | 97% / 2,076 | 融合 动作 |
| D | [近畿霊務局 - Kinki Spiritual Affairs Bureau](https://store.steampowered.com/app/2956820/) | Anime | 92% / 2,156 | 融合 动作、策略、恐怖 |
| D | [The Citadel](https://store.steampowered.com/app/1378290/) | Anime | 92% / 2,025 |  |

### 其他（恐怖 / 生存 / 沙盒）

#### 恐怖（111 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| A | [Resident Evil Village](https://store.steampowered.com/app/1196590/) | BAFTA 2021，DICE 2021，ADA 2023★ | 96% / 119,350 |  |
| A | [The Last of Us Part I](https://store.steampowered.com/app/1888930/) | BAFTA 2013，DICE 2013★，案例库 | 80% / 79,855 | 融合 射击；获奖的是 2013 原作；Steam 为 Part I 重制，UI 有改动 |
| A | [CONTROL](https://store.steampowered.com/app/870780/) | BAFTA 2019，TGA 2019★，GDCA 2019★，案例库，Surreal | 87% / 50,448 | 融合 探索冒险、射击 |
| A | [The Last of Us Part II Remastered](https://store.steampowered.com/app/2531310/) | BAFTA 2020，TGA 2020，DICE 2020 | 91% / 24,774 | 融合 射击 |
| A | [OXENFREE](https://store.steampowered.com/app/388880/) | IGF 2016★，案例库 | 92% / 11,840 | 融合 叙事、探索冒险 |
| A | Alan Wake 2（PC（Epic）/ PS5 / Xbox） | BAFTA 2023★，TGA 2023★，GDCA 2023★ | — | 融合 叙事、动作；生存恐怖，叙事很重，有射击 |
| B | [Resident Evil 2](https://store.steampowered.com/app/883710/) | DICE 2019 | 97% / 172,857 |  |
| B | [Little Nightmares](https://store.steampowered.com/app/424840/) | DICE 2017，案例库，Cute | 95% / 110,196 |  |
| B | [OMORI](https://store.steampowered.com/app/1150690/) | IGF 2021，Stylized/Hand-drawn | 97% / 80,237 | 融合 角色扮演 |
| B | [Dead Space](https://store.steampowered.com/app/1693980/) | DICE 2008，案例库 | 91% / 51,259 | 融合 射击 |
| B | [Alan Wake](https://store.steampowered.com/app/108710/) | DICE 2010 | 90% / 49,163 |  |
| B | [The Callisto Protocol](https://store.steampowered.com/app/1544020/) | DICE 2022 | 65% / 39,430 | 融合 射击 |
| B | [Scorn](https://store.steampowered.com/app/698670/) | TGA 2022，案例库，Surreal | 77% / 15,500 |  |
| B | [Hellblade II](https://store.steampowered.com/app/2461850/) | BAFTA 2024，DICE 2024，案例库 | 87% / 6,909 | 融合 探索冒险 |
| B | [Still Wakes the Deep](https://store.steampowered.com/app/1622910/) | BAFTA 2024，案例库 | 89% / 6,723 |  |
| B | [Crow Country](https://store.steampowered.com/app/1996010/) | IGF 2025，案例库，Stylized | 98% / 5,384 |  |
| B | [Little Goody Two Shoes](https://store.steampowered.com/app/1812370/) | IGF 2024，Anime | 96% / 1,813 | 融合 叙事、生活养成、探索冒险 |
| B | [Paratopic](https://store.steampowered.com/app/897030/) | IGF 2019，案例库，Stylized/Pixel Graphics | 74% / 1,951 | 融合 探索冒险 |
| B | [Anthology Of The Killer](https://store.steampowered.com/app/3212530/) | IGF 2024，Hand-drawn/Comic Book | 99% / 396 | 融合 探索冒险 |
| B | [Saturnalia](https://store.steampowered.com/app/916350/) | IGF 2022，Stylized/Comic Book | 90% / 80 | 融合 探索冒险、解谜 |
| B | Eternal Darkness: Sanity's Requiem（GameCube） | DICE 2002 | — | 融合 动作；"理智值"会伪造 UI（假的存档删除、静音提示）——元 UI 的经典案例 |
| C | [Lethal Company](https://store.steampowered.com/app/1966720/) | 案例库 | 97% / 487,160 |  |
| C | [Buckshot Roulette](https://store.steampowered.com/app/2835570/) | 案例库，Surreal | 96% / 95,541 |  |
| C | [Prey](https://store.steampowered.com/app/480490/) | 案例库 | 91% / 51,033 | 融合 探索冒险 |
| C | [DREDGE](https://store.steampowered.com/app/1562430/) | 案例库，Stylized | 96% / 43,966 | 融合 探索冒险 |
| C | [SILENT HILL 2](https://store.steampowered.com/app/2124490/) | 案例库 | 95% / 43,049 |  |
| C | [Firework（烟火）](https://store.steampowered.com/app/1288310/) | 案例库，Hand-drawn | 98% / 41,558 |  |
| C | [Mouthwashing](https://store.steampowered.com/app/2475490/) | 案例库，Surreal | 96% / 29,864 |  |
| C | [SIGNALIS](https://store.steampowered.com/app/1262350/) | 案例库 | 97% / 26,157 |  |
| C | [Darkwood](https://store.steampowered.com/app/274520/) | 案例库 | 95% / 21,618 |  |
| C | [WORLD OF HORROR](https://store.steampowered.com/app/913740/) | 案例库，Pixel Graphics/Anime | 92% / 9,381 |  |
| C | [Iron Lung](https://store.steampowered.com/app/1846170/) | 案例库，Pixel Graphics/Surreal | 92% / 8,170 | 融合 探索冒险 |
| C | [Thumper](https://store.steampowered.com/app/356400/) | 案例库，Psychedelic | 92% / 4,213 |  |
| C | [Mundaun](https://store.steampowered.com/app/720350/) | 案例库，Stylized/Hand-drawn | 94% / 1,272 | 融合 探索冒险 |
| C | [KINGDOM of the DEAD](https://store.steampowered.com/app/1547380/) | 案例库，Stylized/Hand-drawn | 80% / 361 | 融合 射击 |
| C | [Paper Cut Mansion](https://store.steampowered.com/app/1004370/) | 案例库，Stylized/Hand-drawn | 70% / 71 | 融合 探索冒险 |
| D | [Doki Doki Literature Club!](https://store.steampowered.com/app/698780/) | Anime/Cute | 97% / 210,717 | 融合 叙事 |
| D | [MiSide](https://store.steampowered.com/app/2527500/) | Cute | 98% / 111,087 |  |
| D | [WEBFISHING](https://store.steampowered.com/app/3146520/) | Cute | 98% / 65,810 |  |
| D | [Superliminal](https://store.steampowered.com/app/1049410/) | Surreal/Psychedelic | 95% / 30,151 | 融合 沙盒 |
| D | [CARRION](https://store.steampowered.com/app/953490/) | Pixel Graphics | 95% / 27,310 | 融合 平台跳跃 |
| D | [Sally Face - Episode One](https://store.steampowered.com/app/541570/) | Hand-drawn | 97% / 22,561 | 融合 叙事 |
| D | [Aseprite](https://store.steampowered.com/app/431730/) | Pixel Graphics/Cute | 99% / 21,818 |  |
| D | [Pony Island](https://store.steampowered.com/app/405640/) | Pixel Graphics | 95% / 17,182 |  |
| D | [Quaver](https://store.steampowered.com/app/980610/) | Anime | 92% / 15,519 |  |
| D | [Spooky's Jump Scare Mansion](https://store.steampowered.com/app/356670/) | Cartoon/Cute | 93% / 14,998 |  |
| D | [Tales of the Black Forest](https://store.steampowered.com/app/1093910/) | Pixel Graphics/Anime | 98% / 13,947 | 融合 叙事、角色扮演 |
| D | [Turnip Boy Commits Tax Evasion](https://store.steampowered.com/app/1205450/) | Cute | 95% / 12,829 | 融合 探索冒险、解谜 |
| D | [Bendy and the Dark Revival](https://store.steampowered.com/app/1063660/) | Cartoony | 93% / 12,975 |  |
| D | [KinitoPET](https://store.steampowered.com/app/2075070/) | Pixel Graphics | 93% / 12,279 |  |
| D | [DISTRAINT: Deluxe Edition](https://store.steampowered.com/app/395170/) | Pixel Graphics | 93% / 12,242 |  |
| D | [Little Misfortune](https://store.steampowered.com/app/714120/) | Cute | 92% / 12,087 | 融合 叙事、解谜 |
| D | [POSTAL](https://store.steampowered.com/app/232770/) | Surreal | 91% / 11,023 | 融合 射击 |
| D | [Five Nights at Freddy's: Into the Pit](https://store.steampowered.com/app/2638370/) | Pixel Graphics | 96% / 9,772 | 融合 探索冒险 |
| D | [BOKURA](https://store.steampowered.com/app/1801110/) | Pixel Graphics | 92% / 10,053 | 融合 探索冒险 |
| D | [Nubby's Number Factory](https://store.steampowered.com/app/3191030/) | Stylized/Surreal | 98% / 9,433 | 融合 卡牌桌游 |
| D | [Samsara Room](https://store.steampowered.com/app/1281800/) | Surreal | 97% / 9,202 | 融合 解谜、探索冒险 |
| D | [Yume Nikki](https://store.steampowered.com/app/650700/) | Pixel Graphics/Surreal | 94% / 8,629 | 融合 探索冒险 |
| D | [Yuppie Psycho: Executive Edition](https://store.steampowered.com/app/597760/) | Pixel Graphics/Anime | 95% / 8,444 |  |
| D | [The Exit 8](https://store.steampowered.com/app/2653790/) | Surreal | 94% / 8,394 | 融合 探索冒险 |
| D | [FAITH: The Unholy Trinity](https://store.steampowered.com/app/1179080/) | Pixel Graphics | 96% / 7,262 |  |
| D | [The Mortuary Assistant](https://store.steampowered.com/app/1295920/) | Surreal | 92% / 7,446 | 融合 探索冒险 |
| D | [The Song of Saya](https://store.steampowered.com/app/702050/) | Anime | 91% / 7,136 |  |
| D | [INMOST](https://store.steampowered.com/app/938560/) | Pixel Graphics | 91% / 6,680 | 融合 探索冒险 |
| D | [Insaniquarium Deluxe](https://store.steampowered.com/app/3320/) | Colorful/Cute | 97% / 5,923 | 融合 解谜、生活养成 |
| D | [INDIKA](https://store.steampowered.com/app/1373960/) | Surreal/Psychedelic | 90% / 6,212 | 融合 探索冒险 |
| D | [Mad Father](https://store.steampowered.com/app/483980/) | Pixel Graphics/Anime | 97% / 5,719 |  |
| D | [VTube Studio](https://store.steampowered.com/app/1325860/) | Anime/Cute | 93% / 5,695 |  |
| D | [OLDTV](https://store.steampowered.com/app/643270/) | Psychedelic | 95% / 5,441 |  |
| D | [Krita](https://store.steampowered.com/app/280680/) | Hand-drawn/Comic Book | 96% / 5,050 |  |
| D | [Fantasy Girl](https://store.steampowered.com/app/1064730/) | Anime | 95% / 4,950 | 融合 解谜 |
| D | [Angels of Death](https://store.steampowered.com/app/537110/) | Pixel Graphics/Anime | 95% / 4,971 |  |
| D | [The Hex](https://store.steampowered.com/app/510420/) | Pixel Graphics | 94% / 4,957 | 融合 叙事 |
| D | [Confess My Love](https://store.steampowered.com/app/637850/) | Pixel Graphics/Anime | 94% / 4,747 |  |
| D | [Have a Nice Dream](https://store.steampowered.com/app/1625080/) | Pixel Graphics/Minimalist | 93% / 4,641 |  |
| D | [DISTRAINT 2](https://store.steampowered.com/app/743390/) | Pixel Graphics/Surreal | 96% / 4,356 | 融合 探索冒险 |
| D | [Tattletail](https://store.steampowered.com/app/568090/) | Cute | 95% / 4,413 |  |
| D | [1000xRESIST](https://store.steampowered.com/app/1675830/) | Anime | 96% / 4,280 | 融合 叙事、探索冒险 |
| D | [Hello Neighbor Alpha 2](https://store.steampowered.com/app/1092720/) | Surreal | 95% / 3,930 |  |
| D | [Buddy Simulator 1984](https://store.steampowered.com/app/1269950/) | Pixel Graphics/Cute | 94% / 3,951 |  |
| D | [Zombie Night Terror](https://store.steampowered.com/app/416680/) | Pixel Graphics | 93% / 3,680 | 融合 策略 |
| D | [Perfect Vermin](https://store.steampowered.com/app/1416130/) | Surreal | 93% / 3,665 |  |
| D | [异化之恶〇Abnormal Treatment](https://store.steampowered.com/app/1122750/) | Pixel Graphics/Anime | 98% / 3,502 | 融合 叙事、角色扮演 |
| D | [Psychopomp GOLD](https://store.steampowered.com/app/3243190/) | Anime/Surreal | 98% / 3,443 |  |
| D | [Return to Shironagasu Island](https://store.steampowered.com/app/1156990/) | Anime | 94% / 3,523 | 融合 叙事、解谜 |
| D | [Lost in Vivo](https://store.steampowered.com/app/963710/) | Surreal | 93% / 3,581 |  |
| D | [The Witch's House MV](https://store.steampowered.com/app/885810/) | Pixel Graphics/Anime | 96% / 3,451 |  |
| D | [Spooky's Jump Scare Mansion: HD Renovation](https://store.steampowered.com/app/577690/) | Cute | 96% / 3,405 |  |
| D | [Hello Neighbor Alpha 1](https://store.steampowered.com/app/1092710/) | Cartoony | 92% / 3,479 | 融合 解谜 |
| D | [Saiko no sutoka](https://store.steampowered.com/app/1546860/) | Anime/Cute | 93% / 3,441 |  |
| D | [CHAOS;CHILD](https://store.steampowered.com/app/970570/) | Anime | 94% / 3,297 | 融合 叙事 |
| D | [The Coma 2: Vicious Sisters](https://store.steampowered.com/app/1045720/) | Anime | 96% / 3,227 |  |
| D | [Notch - The Innocent LunA: Eclipsed SinnerS](https://store.steampowered.com/app/325120/) | Surreal | 95% / 3,201 |  |
| D | [IMSCARED](https://store.steampowered.com/app/429720/) | Pixel Graphics | 94% / 3,206 |  |
| D | [Sucker for Love: First Date](https://store.steampowered.com/app/1574270/) | Anime/Cute | 98% / 2,745 | 融合 叙事 |
| D | [Smile For Me](https://store.steampowered.com/app/1018850/) | Surreal/Cute | 97% / 2,787 | 融合 解谜 |
| D | [Look Outside](https://store.steampowered.com/app/3373660/) | Pixel Graphics | 99% / 2,642 |  |
| D | [Brief Karate Foolish](https://store.steampowered.com/app/546390/) | Anime | 94% / 2,716 | 融合 动作 |
| D | [Noel the Mortal Fate Complete Edition](https://store.steampowered.com/app/850000/) | Anime/Cute | 96% / 2,626 | 融合 叙事 |
| D | [The Count Lucanor](https://store.steampowered.com/app/440880/) | Pixel Graphics | 93% / 2,693 |  |
| D | [Endoparasitic](https://store.steampowered.com/app/2124780/) | Stylized/Minimalist | 93% / 2,674 |  |
| D | [Trick & Treat](https://store.steampowered.com/app/497640/) | Pixel Graphics/Anime | 96% / 2,358 |  |
| D | [The Last Door - Collector's Edition](https://store.steampowered.com/app/284390/) | Pixel Graphics | 95% / 2,333 | 融合 解谜 |
| D | [Misao - 2024 HD Remaster](https://store.steampowered.com/app/691450/) | Pixel Graphics/Anime | 96% / 2,299 |  |
| D | [Umineko When They Cry - Question Arcs](https://store.steampowered.com/app/406550/) | Anime | 96% / 2,281 | 融合 叙事 |
| D | [Void Stranger](https://store.steampowered.com/app/2121980/) | Pixel Graphics | 91% / 2,299 | 融合 探索冒险、解谜 |
| D | [Tiny Bunny](https://store.steampowered.com/app/1249880/) | Anime | 96% / 2,169 | 融合 叙事 |
| D | [It Steals](https://store.steampowered.com/app/1349060/) | Pixel Graphics | 98% / 2,065 |  |
| D | [Bad Dream: Coma](https://store.steampowered.com/app/538070/) | Hand-drawn/Surreal | 92% / 2,135 | 融合 解谜、叙事 |
| E | [Desert Bus VR](https://store.steampowered.com/app/638110/) | Anime | 88% / 1,708 | 融合 竞速 |
| E | [4D Golf](https://store.steampowered.com/app/2147950/) | Surreal/Abstract | 98% / 681 | 融合 竞速、解谜、沙盒 |

#### 生存（26 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | [Subnautica](https://store.steampowered.com/app/264710/) | IGF 2019，案例库，Voxel | 97% / 313,707 | 融合 探索冒险 |
| B | [ASTRONEER](https://store.steampowered.com/app/361420/) | IGF 2016，Colorful/Voxel | 92% / 128,956 | 融合 探索冒险 |
| B | [The Flame in the Flood](https://store.steampowered.com/app/318600/) | IGF 2017，案例库 | 76% / 7,166 | 融合 探索冒险、动作 |
| B | [The Wild at Heart](https://store.steampowered.com/app/1093290/) | IGF 2022，Stylized/Hand-drawn | 96% / 704 | 融合 叙事、解谜、探索冒险、建造经营 |
| C | [Terraria](https://store.steampowered.com/app/105600/) | 案例库，Pixel Graphics | 98% / 1,409,473 |  |
| C | [Valheim](https://store.steampowered.com/app/892970/) | 案例库 | 94% / 499,828 |  |
| C | [Palworld](https://store.steampowered.com/app/1623730/) | 案例库，Anime | 94% / 380,709 | 融合 探索冒险 |
| C | [No Man's Sky](https://store.steampowered.com/app/275850/) | 案例库 | 83% / 352,858 | 融合 探索冒险 |
| C | [Satisfactory](https://store.steampowered.com/app/526870/) | 案例库 | 97% / 232,064 | 融合 探索冒险、建造经营 |
| C | [Don't Starve](https://store.steampowered.com/app/219740/) | 案例库 | 97% / 109,816 |  |
| C | [Grounded](https://store.steampowered.com/app/962130/) | 案例库，Cute | 89% / 84,517 |  |
| C | [Enshrouded](https://store.steampowered.com/app/1203620/) | 案例库 | 86% / 78,080 | 融合 探索冒险、角色扮演 |
| C | [Abiotic Factor](https://store.steampowered.com/app/427410/) | 案例库 | 96% / 31,274 |  |
| C | [DRAGON QUEST BUILDERS 2](https://store.steampowered.com/app/1072420/) | 案例库，Colorful/Anime | 92% / 7,233 | 融合 沙盒、角色扮演 |
| C | [Mineko's Night Market](https://store.steampowered.com/app/762940/) | 案例库，Hand-drawn/Anime | 79% / 302 | 融合 探索冒险 |
| D | [Among Us](https://store.steampowered.com/app/945360/) | Cartoony | 92% / 700,785 |  |
| D | [Starbound](https://store.steampowered.com/app/211820/) | Pixel Graphics | 92% / 164,906 |  |
| D | [Core Keeper](https://store.steampowered.com/app/1621690/) | Pixel Graphics | 93% / 54,979 |  |
| D | [The Escapists 2](https://store.steampowered.com/app/641990/) | Pixel Graphics | 91% / 31,948 | 融合 沙盒、策略 |
| D | [Necesse](https://store.steampowered.com/app/1169040/) | Pixel Graphics | 94% / 17,071 | 融合 探索冒险 |
| D | [The Escapists](https://store.steampowered.com/app/298630/) | Pixel Graphics | 90% / 16,050 |  |
| D | [Terminus: Zombie Survivors](https://store.steampowered.com/app/1534980/) | Pixel Graphics | 95% / 3,997 |  |
| D | [Wytchwood](https://store.steampowered.com/app/729000/) | Stylized/Colorful | 93% / 4,032 | 融合 探索冒险、解谜 |
| D | [Card Survival: Tropical Island](https://store.steampowered.com/app/1694420/) | Hand-drawn | 95% / 2,729 |  |
| D | [Nova Lands](https://store.steampowered.com/app/1501610/) | Pixel Graphics | 90% / 2,823 |  |
| D | [Outpath](https://store.steampowered.com/app/2237970/) | Pixel Graphics | 94% / 2,572 | 融合 建造经营、生活养成 |

#### 沙盒（32 款）

| 级 | 游戏 | 证据 | 好评 | 融合玩法与说明 |
|---|---|---|---|---|
| B | [Donut County](https://store.steampowered.com/app/702670/) | IGF 2015，案例库，Stylized/Cute | 92% / 10,545 | 融合 叙事 |
| B | [Mu Cartographer](https://store.steampowered.com/app/513360/) | IGF 2017 | 89% / 228 |  |
| B | Dreams（PS4） | BAFTA 2020 | — | 创作工具型游戏，UI 以编辑器为主 |
| C | [Teardown](https://store.steampowered.com/app/1167630/) | 案例库，Voxel | 96% / 109,462 |  |
| C | [Trove](https://store.steampowered.com/app/304050/) | 案例库，Colorful/Pixel Graphics | 80% / 92,370 | 融合 探索冒险 |
| C | [Hardspace: Shipbreaker](https://store.steampowered.com/app/1161580/) | 案例库 | 90% / 20,422 |  |
| C | [Shadows of Doubt](https://store.steampowered.com/app/986130/) | 案例库，Pixel Graphics/Voxel | 84% / 15,428 | 融合 解谜、探索冒险 |
| C | [Paper Beast](https://store.steampowered.com/app/1232570/) | 案例库，Beautiful/Stylized | 95% / 631 | 融合 探索冒险 |
| C | [The Touryst](https://store.steampowered.com/app/1796410/) | 案例库，Voxel | 89% / 106 | 融合 探索冒险、生活养成 |
| C | Minecraft（PC（官方启动器）/ 全平台） | 案例库 | — | 融合 生存、建造经营；沙盒 + 生存 + 建造 |
| D | [Wallpaper Engine](https://store.steampowered.com/app/431960/) | Anime/Cute | 98% / 894,458 |  |
| D | [Totally Accurate Battle Simulator](https://store.steampowered.com/app/508440/) | Colorful | 98% / 135,943 |  |
| D | [Noita](https://store.steampowered.com/app/881100/) | Pixel Graphics | 95% / 78,477 | 融合 角色扮演 |
| D | [Untitled Goose Game](https://store.steampowered.com/app/837470/) | Cute | 96% / 22,104 |  |
| D | [Unrailed!](https://store.steampowered.com/app/1016920/) | Voxel | 93% / 18,669 | 融合 生存、动作 |
| D | [Tricky Towers](https://store.steampowered.com/app/437920/) | Cartoony | 90% / 15,695 | 融合 建造经营 |
| D | [GoreBox](https://store.steampowered.com/app/2027330/) | Stylized | 91% / 14,504 | 融合 射击 |
| D | [Goat Simulator 3](https://store.steampowered.com/app/850190/) | Cartoony | 98% / 10,395 | 融合 探索冒险 |
| D | [World of Goo](https://store.steampowered.com/app/22000/) | Cute | 94% / 6,155 | 融合 建造经营 |
| D | [Zuma Deluxe](https://store.steampowered.com/app/3330/) | Colorful/Cute | 95% / 5,397 | 融合 解谜、策略 |
| D | [Kill It With Fire](https://store.steampowered.com/app/1179210/) | Colorful/Cute | 95% / 5,018 | 融合 恐怖 |
| D | [Zup! 3](https://store.steampowered.com/app/575640/) | Minimalist | 90% / 5,195 | 融合 解谜、生活养成 |
| D | [To The Core](https://store.steampowered.com/app/1988550/) | Stylized | 93% / 4,678 | 融合 探索冒险 |
| D | [WHAT THE GOLF?](https://store.steampowered.com/app/785790/) | Stylized/Cute | 94% / 4,278 |  |
| D | [DEEEER Simulator: Your Average Everyday Deer Game](https://store.steampowered.com/app/1018800/) | Surreal/Cute | 92% / 4,218 | 融合 探索冒险 |
| D | [Heavenly Bodies](https://store.steampowered.com/app/1138850/) | Stylized | 96% / 3,928 | 融合 探索冒险、平台跳跃 |
| D | [Walkabout Mini Golf VR](https://store.steampowered.com/app/1408230/) | Stylized/Colorful | 98% / 3,133 |  |
| D | [Death Coming/死神来了](https://store.steampowered.com/app/705120/) | Pixel Graphics | 90% / 3,244 | 融合 策略、解谜、探索冒险 |
| D | [Kill It With Fire: HEATWAVE](https://store.steampowered.com/app/1366290/) | Cute | 92% / 2,170 |  |
| E | [Instruments of Destruction](https://store.steampowered.com/app/1428100/) | Stylized | 92% / 1,348 | 融合 竞速、射击 |
| E | [RealFlight Evolution](https://store.steampowered.com/app/2069310/) | Colorful | 87% / 1,033 | 融合 竞速 |
| E | [WHAT THE CAR?](https://store.steampowered.com/app/2727650/) | Stylized/Colorful | 87% / 655 | 融合 竞速 |

## 按呈现内容分类（R2 建卡时标注）

不同游戏的 UI 呈现的内容不一样：先按"玩家此刻在看哪一屏"（界面类型）和"这一屏上显示了什么信息"（信息元素）分类，再看怎么画。分类数据在 `src/content/uiContent.ts`，R2 每张参考卡标注它出现了哪些内容，并按内容统计参考数（每项 ≥ 3）。

| 层 | 项 | 玩家想知道什么 | 常见画法 |
|---|---|---|---|
| 界面类型 | 局内 HUD | 玩的时候要一直看到什么 | 屏幕四角叠加、贴在世界里、画在角色或设备上、只在需要时出现 |
| 界面类型 | 标题 / 主菜单 | 游戏给人的第一印象 | 静态插画 + 列表、实时场景背景、叙事内（菜单就在世界里） |
| 界面类型 | 暂停菜单 | 停下来能做什么 | 半透明覆盖、整屏切换、叙事内（翻开笔记本、手机） |
| 界面类型 | 设置 | 画面、操作、无障碍怎么调 | 分页列表、分组卡片、带预览的滑杆 |
| 界面类型 | 背包 / 物品 | 我有什么、能用什么 | 网格、列表、俄罗斯方块式空间背包、叙事内（打开箱子） |
| 界面类型 | 角色 / 装备 / 属性 | 我现在多强、穿着什么 | 纸娃娃 + 槽位、属性表、雷达图 |
| 界面类型 | 技能树 / 成长 | 下一步往哪里成长 | 树状连线、星图、网格解锁 |
| 界面类型 | 地图 / 世界地图 | 我在哪、该去哪 | 俯视全图、手绘地图、立体沙盘、叙事内（摊开的纸地图） |
| 界面类型 | 任务日志 / 目标 | 我答应了谁、还有什么没做 | 列表 + 详情、笔记本手写、线索墙 |
| 界面类型 | 对话 / 文本 | 谁在说话、我怎么回答 | 底部文本框 + 立绘、气泡、电影字幕、分支选项轮盘 |
| 界面类型 | 商店 / 交易 | 买卖什么、值不值 | 左右双栏、柜台叙事内、卡片陈列 |
| 界面类型 | 制作 / 合成 | 能做什么、缺什么材料 | 配方列表、工作台网格、节点图 |
| 界面类型 | 建造菜单 | 能造什么、放在哪 | 底部分类栏、径向菜单、蓝图模式叠层 |
| 界面类型 | 结算 / 胜负 / 奖励 | 这一局怎么样、得到了什么 | 评分表、逐项翻牌、战报 |
| 界面类型 | 读取 / 过场 | 等待时看什么 | 提示文字 + 插画、小动画、无缝（没有读取屏） |
| 界面类型 | 教程 / 提示卡 | 这个怎么玩 | 弹出卡片、按键提示叠层、叙事内（角色告诉你） |
| 界面类型 | 图鉴 / 收集 / 成就 | 我收集了多少 | 卡片墙、博物馆陈列、百分比列表 |
| 界面类型 | 存档 / 读档 | 进度存在哪 | 存档槽列表、缩略图卡片、叙事内（存档点） |
| 界面类型 | 手牌 / 牌桌 | 我手里有什么、桌上发生什么 | 扇形手牌、牌桌俯视、数值牌固定位置 |
| 信息元素 | 生命 / 护盾 / 体力 | 我还能撑多久 | 条、数字、心形图标、画在角色身上（叙事内）、屏幕边缘泛红（元 UI） |
| 信息元素 | 资源 / 货币 / 人口 | 我有多少可以花 | 顶部资源栏、图标 + 数字、仓库实物（叙事内） |
| 信息元素 | 技能栏 / 冷却 / 弹药 | 我现在能做什么动作 | 底部技能栏、冷却扇形、弹药数字、武器上的计数（叙事内） |
| 信息元素 | 小地图 / 罗盘 | 周围是什么、朝哪走 | 圆形小地图、顶部罗盘条、无（靠地标） |
| 信息元素 | 任务目标 / 路点 | 现在该干什么、去哪 | 角落文字、世界中的标记（空间内）、屏幕边缘箭头、无（靠环境引导） |
| 信息元素 | 交互提示 | 这个东西能不能用、按什么 | 按键图标 + 文字、物体描边高亮、物体旁浮出（空间内） |
| 信息元素 | 敌人血条 / 锁定 / 预警 | 谁在威胁我、什么时候出手 | 头顶血条（空间内）、锁定框、地面预警圈、屏幕边缘方向提示 |
| 信息元素 | 伤害数字 / 命中反馈 | 刚才那一下有没有效 | 飘字、命中标记、闪白与震屏（元 UI） |
| 信息元素 | 拾取 / 通知 / 成就弹窗 | 刚刚发生了什么 | 侧边滚动列表、顶部横幅、世界中飘出图标 |
| 信息元素 | 计时 / 分数 / 连击 | 节奏与成绩 | 大数字、连击计数器、进度环 |
| 信息元素 | 速度 / 圈数 / 名次 | 我开多快、排第几 | 仪表盘、数字速度、名次列表、车内仪表（叙事内） |
| 信息元素 | 准星 / 瞄准 | 我瞄着哪 | 十字、点、武器瞄具（叙事内）、动态扩散准星 |
| 信息元素 | 单位 / 选中信息面板 | 我选中的是什么、状态如何 | 底部信息面板、单位头顶铭牌（空间内）、选择框 |
| 信息元素 | 队伍 / 同伴状态 | 队友怎么样 | 头像 + 小血条列表、头顶名牌 |
| 信息元素 | 时间 / 天气 / 日历 | 现在几点、哪天、什么季节 | 角落时钟、日历页、太阳位置（叙事内） |
| 信息元素 | 信息叠层 / 图例 | 整片区域的数据是什么分布 | 热力图叠层 + 图例、方向箭头、机器状态图标 |
| 信息元素 | 按键 / 操作提示 | 现在能按哪些键 | 屏幕角落键位列表、按键图标（随输入设备切换）、触屏按钮 |
| 信息元素 | 字幕 / 说话人 | 谁在说什么 | 底部字幕 + 说话人名、气泡、叙事内（屏幕、招牌上的文字） |

## 已知问题（R2 建卡时逐款纠正）

- **品类是按玩家标签自动映射的**，有误判：例如竞速里混进了派对闯关（Stumble Guys）、节奏游戏（MUSYNX），工厂里有挂机 RPG（Melvor Idle）。R2 建卡时人工确认品类。
- **D / E 级只说明"有鲜明美术风格且玩家口碑好"**，不等于玩家专门夸美术；R3 挖评测后按"提到美术的好评比例"再排序。
- **同一游戏的不同版本**（原版 / 决定版、本体 / 合集）可能各占一条，R2 合并。
- **非 Steam 的 66 款**（多为主机独占与手机）没有标签与评测，品类是手工归的（拿不准的标了"待核"），UI 参考主要靠 Game UI Database 链接与公开截图。
- 评测数来自 SteamSpy（有滞后，和 Steam 商店页的数字可能差几个百分点）。

## R2 怎么从这里挑约 500 款

每个品类先取 A / B / C 级，再按评测数补 D / E 级，直到该品类 ≥ 15 款且总数约 500；R2 按 策略/建造 → 探索/RPG/动作 → 养成/解谜/叙事 → 卡牌/竞速/射击 分 4 批建卡，每批开始前先把这一批的名单列出来。

## 补充方案（品类不足 15 款时）

所有品类都已达到 15 款。
