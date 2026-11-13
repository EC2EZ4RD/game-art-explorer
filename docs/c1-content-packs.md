# C1 示例内容包：每个品类一款虚构游戏

> 状态：2026-10-14 架构完成并合并——24 个包全部写好、登记（30 个品类布局、16 个画面品类都有包；"全部控件展示"跟着画面品类走），消费方全部改成读包字段（第 6 节 G1–G5 已完成），screen.ts 的 Q 已删；cnt.pack 选项的名字与说明按包重写并重建 uiSpec。
> 2026-10-15 审查修正：手柄图标可以按提示指定按钮（`PadButton`）；统计表第四列可写百分比（`stats.unit`）；排行进度条按包自己的分数归一；数据主体放不下时缩字；全部控件展示不再固定画雪线旅人；各包修了定宽处的超长字、热力图档位顺序、跨包重名的人物、相同的存档时间 / 竞价 / 公告句式；字体子集把界面模板标题栏的字也收进来（字符 1271，其中汉字 1065；合计 1218 KB / 1,536 KB）；check:content、npm test、build 通过。
> 待维护者：逐像素对照（做法见第 7 节第 3 条）与逐包截图审阅；`MENU`（menu.ts）、`SAMPLE`（sample.ts）两个视图已经没有消费方，删不删由维护者定。

## 0. 为什么、做什么、不做什么

原来 31 个品类布局、63 个界面模板画的都是同一款游戏"雪线旅人"：游戏名、章节、物品、人物、台词、任务、事件文字写死在约 9 个文件里。用户要的是**风格探索要大而全**——同一套 UI 风格放进射击、经营、卡牌、竞速、恐怖……时成不成立，所以样本内容要跟着品类换。

- 新参数 `cnt.pack`（示例内容包，内容页，tier 2，默认 auto）：auto = 显式选的品类布局对应的包 → 画面品类 `game.genre` 对应的包 → 雪线旅人。
- 每个包是一款虚构游戏（`src/hud/content/packs/<id>.ts`），共 24 个（雪线旅人 + 23 个新包）。
- "雪线旅人" = `snowline` 包，逐字逐数保留：**cnt.pack = snowline 时所有画面与改造前逐像素一致**（对照 `qa/c1-before-*.png`）。
- **不做**：手游运营界面（商城、抽卡、奖励、签到、首充、通行证、红包、拍脸图、广告）不按品类设计——所有包共用 `GENERIC`（`src/hud/content/generic.ts`）与 screen.ts / flow.ts 里原有的通用字，包只在个别字上覆盖（`ops`）。
- 不复刻某一款真实游戏：每个包是我们自己编的题材，用来覆盖该品类 UI 常见的信息种类与语气。

## 1. 样本内容原来在哪（盘点）

| 文件 | 内容 | 现在 |
|---|---|---|
| `elements/core.ts` | `DATA`（34 个字段：数值、队伍、目标、奖励、聊天……） | `DATA = liveView(() => pack().hud)`，类型 `HudData`；元素都读它 |
| `elements/info.ts` | 选中面板（伐木工 · 阿卡……）、日历、热力图图例、上下文提示、主按钮、游戏名 / 章节 / 英文副标题、奖励大卡、价格与竞价表 | 已改（G1）：读 `DATA.*` 与 `pack().game / menu` |
| `elements/combat.ts` | 生命 / 护盾 / 体力、资源名、大招、目标标题、交互动作、意图、飘字、拟声字、评级、连击、各种提示条、回合 / 波次 / 圈数、速度单位 | 已改（G2） |
| `elements/meta.ts` | 段位、玩家信息（名字 / UID / 称号 / 等级）、读取提示、新手引导、计量条、工具栏类别、行动顺序里的敌人判定 | 已改（G2） |
| `sim.ts` | 拾取飘字、获得提示、升级横幅、回血飘字 | 已改（G2）：`packFor(r).events`，生命起点 `packFor(r).hud.hp` |
| `compose/screen.ts` | `Q`（任务、设置、绑定、服务器、排行、存档、统计、邮件、成就、路线、公告、制作人员、三选一）、模板页签、推理板线索、跑马灯、主体大字（游戏名 / 胜利 / 结束语 / 章节卡 / 大数字）、确认句、地图地名、活动横幅、合规水印 | 已改（G3）：读 `pack().screens / game / world / hud`，设置页 `settingsOf()`；`Q` 已删 |
| `compose/menu.ts` | `MENU`（行囊、页签、8 个物品、详情、按钮）、水印"旅"与"ITEMS"、书法水印 | 已改（G4）：`drawMenu` 读 `pack().menu`；`MENU` 视图还在，但已经没有消费方 |
| `compose/sample.ts` | `SAMPLE`（M1 四控件：旅人、木材 24……、打开宝箱、向导台词）、密集档技能栏符号 | 已改（G4）：`sampleOf(pack())`；`SAMPLE` 视图还在，但已经没有消费方 |
| `compose/touch.ts` | 触屏按钮符号与名字（⚔ 攻击、技能符号、⤒ 跳跃、✊ 动作） | 已改（G4）：`pack().hud.touch` |
| `uiAssets.ts` | `ITEM_BY_NAME`（中文物品名 → 图集图标）、立绘 / 主视觉 / 书法标题的素材 id | 已改（G4）：`iconOf()`、`artRef()`；`ITEM_BY_NAME` 保留 |
| `world.ts` | 兴趣点标签（宝箱 / 交互物 n / 灯 / 地标） | **不改**：场景侧的标签（引擎换场景时推导，没有包的上下文），画布上不画 |
| `export/godotHud.ts`、`godotLayout.ts` | `hud_sample.gd` 里的四控件文字、元素排版里的生命 / 资源 / 目标 / 字幕 / 开始游戏 | 已改（G5）：`packFor(r)` |
| `flow.ts` | 流程演示的阶段名与确认句（抽卡、购买） | **不改**：阶段名是工具字，确认句是运营类 |

不算样本内容（各处照旧）：确定 / 取消 / 设置 / 返回 / 跳过 / 继续 / 载入中…… 这类界面通用字、指南针方位、按键符号、需素材灰盒的标注、可读性检查与面板文字。

## 2. 数据结构（`src/hud/content/types.ts`）

```
ContentPack
├─ id / label / genres / scene        包 id、面板名、服务的品类与布局、建议场景（sceneCatalog 的 id）
├─ game      GameInfo                 游戏名、英文副标题、一句话简介、单字徽记、章节（序号 / 名 / 横幅 / 章节卡）
├─ hud       HudData                  原 DATA 的 34 个字段（名字与类型不变）+ 原来写死在各元素里的 60 多项
├─ menu      MenuData                 原 MENU（标题、页签、8 个物品、详情、按钮）+ header 写法、英文大字
├─ screens   ScreenData               原 Q 的非运营部分 + 页签、线索、跑马灯、主体大字、确认句；settings 可选（默认 GENERIC）
├─ events    EventText                模拟事件文字（拾取、获得、升级、回血）
├─ world     WorldText                地名牌、目标距离
├─ icons?    物品名 → 图集图标的补充
├─ glyphIcons?  格子只给符号时按符号猜图标（只有 snowline 开）
├─ art?      PackArt                  书法标题 / 主视觉 / 四种立绘（只有 snowline 有）
└─ ops?      Partial<OpsText>         运营层个别字的覆盖（只有 snowline 用，保持"雪线祭"）
GENERIC：settings（设置行 + 枚举表）、mainMenu（暂停 / 标题竖排菜单）、hub（终端宫格）、ops（活动横幅标题）
```

每个字段在 types.ts 里有一行中文注释。物品行是 `ItemRow = [符号, 名字, 数量, 图集图标?]`；资源行 `ResDef = [符号, 名字, 图集图标?]`。图集图标是 16 个之一：`wood stone ironOre crystal herb rope resin pot sword shield potion coin gem key map scroll`。

## 3. 选包与运行时（`src/hud/content/index.ts`）

- **参数**：`cnt.pack`（`docs/survey/data/ui-param-system.json` 的 cnt 组第一个参数；取值 auto + 24 个包；生成文件 `src/content/uiSpec.gen.json` 已重建）。
- **派生规则 D-pack**（`sys/derive.ts`，纯派生；手动值优先）：`autoPackId(uip.layout, game.genre)`——显式布局的包已写好就用它，否则画面品类的包已写好就用它，否则 snowline。所以面板上"派生：D-pack"显示的就是实际在画的包。手动选了还没写的包时 `packFor()` 回到 snowline。
- **当前包**：`HudSystem.update` 的 `compose()` 第一步 `setPack(packFor(tth.r))`（A/B 两侧各选各的），画完再 `setPack(packFor(r))` 留在 B 侧。构图与元素用 `pack()` 或视图读。
- **不在 HudSystem 里画的地方**（Godot 导出、React 面板、`sim.ts` 的 `simulate`）一律用 `packFor(r)`，不要读全局 `pack()`——`simulate()` 在 `setPack` 之前调用，A/B 两侧的 `r` 也不同。
- **视图**：`DATA`（core.ts）是 `liveView(() => pack().hud)`，类型 `HudData`，所以**新字段也能直接 `DATA.selection`、`DATA.vitalNames` 地读**——元素里统一用 `DATA.x`；game / menu / screens / events / world / art 用 `pack().…`。screen.ts 的 `Q` 已删；`MENU`（menu.ts）、`SAMPLE`（sample.ts）两个视图还在，但已经没有消费方（删不删由维护者定）。
- **小工具**：`fill('第 {n} 天', { n })` 模板填空；`iconOf(name)` 包里声明过的图标；`artRef('title' | 'keyArt' | 'anime' | 'painterly' | 'bust' | 'chibi')` 包里的位图（null = 没有）；`opsText()`；`settingsOf()`；`GENERIC`；`PACK_IDS`；`LAYOUT_PACK` / `GENRE_PACK`。
- **登记**：`index.ts` import 了 24 个包文件，24 个都是写好的 `ContentPack`；id 拼错 / 没登记时 `packById()` 回到 snowline。新加包时在 `index.ts` 里 import、登记，并补进 `PACK_IDS`、`LAYOUT_PACK` / `GENRE_PACK` 与 cnt.pack 的选项。

### 布局 → 包（30 → 24）

`layout.showcase`（全部控件展示）不是品类布局，不在 `LAYOUT_PACK` 里：它按画面品类 `game.genre` 选包（默认 explore → snowline），所以每个包都能在它下面把所有控件看一遍。

| 包 | 品类布局（uip.layout） | 画面品类（game.genre） |
|---|---|---|
| snowline | explore | explore |
| action | action、mobileArpg | action |
| soulslike | soulslike | — |
| platformer | platformer、metroidvania | platformer |
| shooter | shooter | shooter |
| shmup | shmup | — |
| rpg | rpg、arpgOrb | rpg |
| tactics | strategyTurn | strategy |
| rts | strategyRts | — |
| towerDefense | towerDefense | — |
| arena | moba、fighting | — |
| cityBuilder | builder、idle | builder |
| colony | colonySim | — |
| factory | factory | factory |
| farming | life | life |
| sandbox | sandbox | sandbox |
| deckBuilder | card、autobattler | card |
| puzzle | puzzle | puzzle |
| visualNovel | narrative | narrative |
| rhythm | rhythm | — |
| horror | horror | horror |
| survival | survival | survival |
| survivors | survivors | — |
| racing | racing | racing |

注意：`layout.card`、`layout.narrative` 的界面类型不是局内 HUD，画的是菜单样本（MENU）——这两个包的 `menu` 要写好（卡组 / 记录本）。

## 4. 包清单与作者分组

题材是建议（保证题材互不重复、时代与文化分散）；作者可以换，但**同组内、跨组都不要撞题材**，换了请同步改包文件头注释。建议场景是 `game.scene` 的 id（面板"建议场景（套用）"按钮用），可重复。

| 组 | 包 id | 品类 | 题材建议 | 建议场景 |
|---|---|---|---|---|
| — | snowline | 探索与冒险 | 雪线旅人（已完成） | mountain |
| A 动作 | action | 动作与 Roguelite | 地下城砍杀：被诅咒的铸铁矿坑（蒸汽朋克矮人），每层祝福三选一 | dungeon |
| A | soulslike | 魂类 | 哥特黑暗奇幻：没落王城、余烬（存档点）、灰烬（货币）；Boss 名长，字少而冷 | castle |
| A | platformer | 横版平台 / 类银河城 | 地底萤火王国：面具血量、萤石收集、能力门 | cave |
| A | shooter | 射击 | 近未来战术射击：轨道空间站，弹匣 / 备弹、击杀信息流 | scifi |
| A | shmup | 弹幕射击 | 复古街机弹幕：残机、炸弹、9 位分数、英文多 | surreal |
| B 角色与策略 | rpg | MMO / ARPG 组队 | 仙侠网游：门派、组队副本、世界频道、掉落 | courtyard |
| B | tactics | 回合策略 / 战棋 | 机甲小队对抗巨兽：格子、意图、回合横幅 | strategy |
| B | rts | 即时战略 | 架空 20 世纪沙漠战争：兵营、电力、矿石、单位卡 | desert |
| B | towerDefense | 塔防 | 渔港塔防：抵御海怪潮，波次、金币、炮塔 | harbor |
| B | arena | MOBA / 格斗 | 未来竞技联赛：英雄、比分、段位、连击、能量槽 | arena |
| C 经营与建造 | cityBuilder | 建造经营 / 放置 | 现代城市：人口、税收、满意度、污染 | city |
| C | colony | 殖民模拟 | 冰原殖民地：殖民者名字与心情、温度、警报 | snowVillage |
| C | factory | 工厂与自动化 | 外星工厂：矿、齿轮、电路、传送带吞吐、电力 | factory |
| C | farming | 生活与养成 | 田园生活：季节日历、作物、村民好感、集市 | farm |
| C | sandbox | 沙盒与物理 | 体素沙盒：方块、合成、昼夜、怪物 | sandbox |
| D 桌面与叙事 | deckBuilder | 卡牌与桌面 / 自走棋 | 桌游酒馆卡牌爬塔：能量、手牌、敌人意图、商店与羁绊 | tabletop |
| D | puzzle | 解谜与侦探 | 1920 年代港口城市凶案：线索、证词、推理板 | street |
| D | visualNovel | 叙事与视觉小说 | 海边小镇的夏天：人物关系、章节、选项与回想 | room |
| D | rhythm | 节奏 | 地下乐队 Livehouse：判定字、连击、曲目与难度 | tavern |
| E 生存与竞速 | horror | 恐怖与悬疑 | 废弃疗养院：手电电量、理智、极简 HUD | ruins |
| E | survival | 生存与制作 | 荒野林地：饥饿 / 口渴 / 体温、快捷栏、制作 | forest |
| E | survivors | 割草类 | 深海潜艇割草：经验条、击杀数、计时 | underwater |
| E | racing | 竞速与驾驶 | 山道漂移 / 城市拉力：名次、圈速、氮气 | racetrack |

## 5. 写包的规矩（作者组 A–E）

**怎么写**：当时每个作者打开自己的 `packs/<id>.ts`，把 `export const PACK: ContentPack | null = null;` 换成 `export const PACK: ContentPack = { id: '<id>', … }`（24 个包现在都已写好；以后加包就新建 `packs/<id>.ts` 并按第 3 节登记）。字段与 `packs/snowline.ts` 一一对应——照着它逐字段改写成自己的游戏。写完 `npx tsc --noEmit -p tsconfig.json`。

**每个字段都要"像这个品类"**：同一个字段在不同品类里意思会变（这正是要探索的）——
- `hud.vitalNames`：射击写"生命 / 护甲 / 体力"，竞速可以写"车况 / 氮气 / 轮胎"，恐怖写"体力 / 理智 / 电量"；`gold / gems / wood` 依次是 `res` 三项的数值（主货币 / 次货币 / 采集物——城市可以是"资金 / 人口 / 木材"，卡牌是"金币 / 能量 / 卡牌"）。
- `boss / target / party / turnOrder`：竞速里 target 可以是"前车"、party 是车队；节奏里 boss 可以是"本曲"——**不要留空**，所有布局 + 全部控件展示都会画到。
- `selection`（单位面板）、`tools`（建造类别）、`meters`（计量条）、`heat`（热力图图例）：非经营品类也要写，写成本品类里最像的东西（射击的 selection = 选中的武器 / 队友；卡牌的 tools = 牌堆 / 弃牌 / 地图……）。
- `screens.stats.head` 是 4 列表头（射击：击杀 / 死亡 / 助攻 / 伤害；竞速：圈速 / 最快 / 超车 / 积分）；`binds` 写本品类的动作；`route` 是 9 个单字节点。
- 语气（`cnt.tone`）随品类：魂类冷峻，割草夸张，视觉小说温柔，街机弹幕多用英文与数字。

**数量必须与 snowline 相同**（代码按位置取）：objective 3、feed 3、abilities 4、party 4（scores 4，与 party 对应）、prompts 4、reward 3、chat 3、turnOrder 5、choices 3、vitalNames 3、res 3、hits 3、bids 3（最后一行是玩家）、tools 7、meters 3、selection.portraits 6 / stats 3 / bars 2、touch.skills 5、touchGlyphs 3、menu.tabs 3、menu.items 8、detail.stats 2、screens.tabs 5、quests 6、binds 7、servers 6（第 6 个是推荐新服——登录流程演示聚焦它）、leaders 7（第 5 行是"你"）、saves 3（第 3 个三项都写 ''，画"新建存档"）、stats.head 4 / rows 4、mail 3、achievements 8、route 9、credits 4、draft 3、clues 6。

**长度**：与 snowline 同一字段相近（±30%）。很多格子定宽：奖励卡 120px、选中卡 180px、名牌药丸、推理卡 100px、标题牌。经验值（按全角字计：半角的字母、数字、空格、符号算半个字）——游戏名 2–6 个汉字（英文名 ≤ 14 个字母）；`game.subtitle` ≤ 22 个大写字母（词间两个空格）；队伍名 2 个字（头像只画首字）；物品名 2–4 个字；`subtitle[1]` ≤ 26 字；`menu.detail.desc` 25–40 字（详情只画 3 行）；`screens.notice` 80–120 字（这一条按字符数算）；任务名 ≤ 7 字、说明 ≤ 14 字；`clues` ≤ 4 字；`draft` 名 2–3 字、效果 ≤ 9 字（效果在卡里会折行，略长也放得下）；`events.pickup` ≤ 6 字。

**隐性约束**（定宽 / 定位的地方，字长了会压到别的字或冒出盒子；types.ts 对应字段的注释里也写了）：
- `rank.number` ≤ 4 个半角字符（"#128"）、`rank.scope` ≤ 2 个字：范围画在 number 起点右边 90px，元素盒宽 120px；`rank.medal` 不宽于"黄金 II"（奖章右边只有约 58px）。
- `combo[0]` ≤ 2 位数：后面的字画在数字起点右边 62px。
- `place` 写成"2/8"画在速度表左边 70px 里（数字形态在圈数前 74px 里），所以共几 ≤ 9。
- `meters[0]` 的名字 ≤ 2 个汉字：single 形态把它画在条前 30px 里（另外两行的名字不画）。
- `heat.levels` 按位置上色：第一档红、第二档黄、第三档绿——第一档写危险 / 糟糕的一端（"污染 高"、"长势 差"、"温度 冻"）。
- `screens.stats` 第四列默认画成 round(v × 30000) 的数量；是比例（完成度、命中率、车况……）时写 `unit: 'pct'`，画成百分比。
- `screens.leaders` 的分数量级随品类定（进度条按第一名向上取到下一个整千归一），不要照抄 snowline 的数。
- `prompts` 的键在手柄图标集里按 glyphs.ts 的 PAD 换（只认 E F Q R Tab Esc Space Shift 1–4）；别的键、或者会撞到同一个手柄钮的，写第三项 `PadButton`（south / east / west / north / lb / rb / lt / rt / view / menu / ls / rs / up / down / left / right）；`interactKey` 不在 PAD 里时写 `interactPad`，`pickPrompt` 同样可写第三项。
- 设置页：一般不写（用 GENERIC）；本品类明显不同时才写 `screens.settings`（现在写了的有 shooter、shmup、rts、arena、racing）。
- 每个游戏有自己的一组人物：队伍、聊天、排行、制作人员、竞价里的名字不要和别的包重名；存档时间、竞价（围着本包的 `price` 出价）、公告的口吻也各写各的。

**特殊约定**：
- `target.name` 是"敌方"判定：`turnOrder` 里与它同名的画成红色，`avatar()` 对它不画立绘。
- `chat` 里说话人写 `系统` 的行画成系统色。
- 模板字：`dayText` 用 `{n}`，`turnText` 用 `{n}`，`waveText` 用 `{wave}`，`lapText` 用 `{a}` `{b}`。
- 全角空格 `　` 是排版的一部分（`'周三　☀'`、`'工作：伐木　效率 120%'`），照样用。
- 数值：比例都在 0~1；`hp` 写成和 `sim.ts` 起点一样的意思（局内生命条从它起跳，见 6.2）；`speed` 满刻度 300；`hour` 是小时小数。
- `res[0]` 是主货币：价格、花费、竞价都用它的符号与名字，画成金色。
- 符号用几何 / 杂项符号（◆●▲■✦♥⚔☄♨⚡❄☁◍⌂⚒⛏⛨✿⚙✖♠↻⤒✊……），不用彩色 emoji；能沿用 snowline 的就沿用。

**图标**：物品行 / 奖励行 / 资源行给第 4（资源行第 3）项图集图标，没有贴切的就不给（会画符号，不会再按符号乱猜成木头）；`hud.featured.item` 必须是能查到图标的名字（物品行里带图标的、`icons` 补充表里的，或 `uiAssets.ts` 的 `ITEM_BY_NAME` 里有的）。不要写 `glyphIcons`。

**位图**：不写 `art`。立绘、主视觉、书法标题都是雪线旅人的（红围巾女旅人、灯塔海报、"雪线旅人"四个字）——别的包画剪影 / 灰盒（需素材），这是对的。风景插画、羊皮纸地图、书桌 / 线索墙 / 柜台、外框、徽章、图标集是风格素材，所有包共用。

**运营**：不写 `ops`、不写商城 / 抽卡 / 签到之类的内容；`screens.settings` 一般不写（用 GENERIC），除非本品类的设置页明显不同（竞速：变速箱、辅助线；射击：灵敏度、准星）。

**字数预算（重要）**：包里的字会进字体子集（`scripts/hud-chars.ts` 扫 `src/hud/`），6 个中文字体合计约每个新字 1 KB；写包时是 951 KB，2026-10-15 重跑后 1,218 KB / 预算 1,536 KB，还剩约 300 个新字的余量。请尽量用常用字、复用 snowline 已有的字，**每个包新增的生僻字控制在 80 个以内**，写完用下面的命令报数（列出字体子集里还没有的字）：

```
npx tsx -e "import { readFileSync } from 'node:fs'; import { hudCharSet } from './scripts/hud-chars'; const have = new Set(readFileSync('src/assets/fonts/charset.txt', 'utf8')); const miss = [...hudCharSet(process.cwd())].filter((c) => !have.has(c)); console.log(miss.length, miss.join(''));"
```

（总数超出时由维护者决定：放宽 check:content 的 1,800 KB 预算，或请作者换字。全部写完后维护者跑一次 `npx tsx scripts/fonts-subset.ts`——需要 `qa/fonts-src/` 的原始字体——再跑 `npm run check:content`。）

## 6. 消费方改造（G1–G5，已完成）

下面是当时的分工与对照表，留作记录；现状见第 1 节"现在"一列。

总原则：
1. **snowline 逐像素不变**：每一处替换后，cnt.pack = snowline 时字、数、调用参数都与原来相同（包括传给 `slot()` 的是名字还是符号）。
2. `size()` 与 `draw()` 量的是同一个字段（fitW 的列表也要换），否则换包后字冒出盒子。
3. 元素里读 `DATA.<字段>`（它是 `HudData` 视图，新字段也在上面）；游戏名、章节、菜单、界面样本、事件、世界、位图用 `pack().game / menu / screens / events / world`、`artRef()`。
4. 只改分给自己的文件；`DATA`、`MENU`、`SAMPLE` 这几个导出在本阶段**都保留**（别的组可能还在用），全部合并后由维护者决定删不删。
5. 改完 `npx tsc --noEmit -p tsconfig.json`；不跑开发服务器，截图对比由维护者做。

### 6.1 G1：`elements/core.ts` + `elements/info.ts`

| 位置 | 原来 | 改成 |
|---|---|---|
| core `bustFace()` | `assetFile('ui_char_bust_chibi', 'bust')` | `const ref = artRef('bust'); const file = ref ? assetFile(ref.id, ref.file) : null;` 没有 → 返回 false（剪影） |
| core `avatar()` | `label !== DATA.target.name` | 不变 |
| info `el.selection` card | `'伐木工'`（size 与 draw 各一处）、`'伐'` | `DATA.selection.name`、`.initial` |
| 　tooltip | `'松木'`、`'可以砍伐 · 产出 木材 ×4'`、`'按 E 砍伐'`（size 与 draw） | `DATA.selection.tip[0..2]` |
| 　panel | `'伐木工 · 阿卡'`、`'工作：伐木　效率 120%'`（size 与 draw）、`'伐'` | `.full`、`.job`、`.initial` |
| 　tag | `'伐木工 · 工作中'` | `.tag` |
| 　portraits | `['伐','伐','农','兵','兵','兵']` | `.portraits` |
| 　card 属性 | `['力量','耐力','心情']` 与 `[0.7, 0.5, 0.85]` | `.stats`（名 / 值） |
| 　panel 状态 | `['生命','饥饿']` 与 `[0.9, 0.4]` | `.bars`（颜色 `[e.good, '#e3b341']` 留在代码里） |
| `el.party` scoreRow | `[12, 9, 7, 3][i]` | `DATA.scores[i]` |
| `el.clock` | `'春 · 第 1 年'`、`'周三　☀'`（size 与 draw）；`` `${DATA.weather}　18°C` ``（size 与 draw）；`` `第 ${DATA.day} 天` ``（size 两处、draw 两处） | `DATA.calendar[0/1]`；`` `${DATA.weather}　${DATA.temp}` ``；`fill(DATA.dayText, { n: DATA.day })` |
| `el.overlay` heatmap | `'污染程度'`、`['高','中','低']` | `DATA.heat.title`、`DATA.heat.levels`（颜色留在代码里） |
| `el.prompt` contextual | `'E'`、`'拾取'` | `DATA.pickPrompt[0/1]` |
| 　touchButtons | `'⚔'`、`'✦'`、`'↻'` | `DATA.touchGlyphs[0..2]` |
| `el.cta` | `'开始游戏'`（size 一处、draw 四处）、`'返回开始游戏'`（size）、`'返回'`、`'出发'` | `DATA.cta.start`、`` `${DATA.cta.back}${DATA.cta.start}` ``、`.back`、`.go` |
| `el.title` | `GAME_TITLE = '雪线旅人'`；`s === GAME_TITLE && inkTitleOn(e)` | `pack().game.name`；条件改成 `!!artRef('title') && inkTitleOn(e)`（书法字写的就是"雪线旅人"，别的包没有这张图） |
| 　header | `'行　囊'` | `pack().menu.header` |
| 　titleCard | `'第三章'`、`'雪线以上'` | `pack().game.chapter.index`、`.title` |
| 　副标题 | `'SNOWLINE  WANDERER'` | `pack().game.subtitle` |
| `el.reward` portrait | `'艾'`、`'艾琳'` | `DATA.hero.initial`、`.name` |
| 　bigCard | `itemIcon(e, '水晶', …)`、`'✦'`、`'寒霜水晶'` | `DATA.featured.item`、`.glyph`、`.name` |
| 　single | `slot(…, '✦', { item: '水晶' })`、`'寒霜水晶 ×1'` | `.glyph` / `.item`、`` `${DATA.featured.name} ×1` `` |
| `el.cost` | `coin()`：`itemIcon(e, '金币', …)`、`'●'` | `DATA.res[0][1]`、`DATA.res[0][0]`（金色保留） |
| 　 | `'购买　1,500'`；`'1,500'`（tag / bigNumber / 默认） | `` `${DATA.buy}　${DATA.price}` ``；`DATA.price` |
| 　bidTable | `[['艾琳','1,620'],['卡尔','1,500'],['你','1,480']]` | `DATA.bids` |
| 　freeTag | `'限时免费'` | 不改（运营类通用字） |

坑：`inkTitleOn()` 里旧皮肤的"显式选过"逻辑保留，只在外面加 `artRef('title')`；`drawInkTitle` 本身由 G4 改成读包（没有图时返回 false，照常写字），两边都改才能保证非雪线包永远写字。

### 6.2 G2：`elements/combat.ts` + `elements/meta.ts` + `sim.ts` + `compose/simfx.ts`

| 位置 | 原来 | 改成 |
|---|---|---|
| combat `el.vitals` 与 `vitalsMetrics` | `['生命','护盾','体力']` | `DATA.vitalNames` |
| `el.resources` | `[['●', gold, '金币'], ['✦', gems, '水晶'], ['◆', wood, '木材']]` | `DATA.res` 三项的符号与名字，数值仍是 `gold.toLocaleString('en')` / `String(gems)` / `String(wood + sim.resources)` |
| 　颜色 | `ch === '●' ? '#e3b341' : e.accent` | 第 0 项金色（按序号，不按符号；倒序循环时注意保留原序号） |
| 　bigNumber | `itemIcon(e, '金币', …)`、`'●'` | `DATA.res[0]` |
| 　gauge | `'木材'`、`` `${DATA.wood} / 30` ``、`DATA.wood / 30` | `DATA.res[2][1]`、`` `${DATA.wood} / ${DATA.resGoal}` ``、`/ DATA.resGoal` |
| `el.abilities` | cards 的 `['♠', 0]`；hotbar 物品格 `'◆'`；ultimate `0.78`、`'78%'`、`'☄'` | `DATA.handExtra`；`DATA.hotbarItem`；`DATA.ultimate[1]`、`` `${Math.round(v * 100)}%` ``、`DATA.ultimate[0]` |
| `el.objective` | `'目标'`；marker `'86 m'` | `DATA.objectiveTitle`；`pack().world.distance` |
| `el.interact` | `'打开宝箱'`（四处，含 `'[E] 打开宝箱'`）、`'E'` | `DATA.interact`、`DATA.interactKey`（`` `[${DATA.interactKey}] ${DATA.interact}` ``） |
| `el.threat` intent / hitChance | `'⚔'`、`'12'`；`'75%'` | `DATA.intent[0/1]`；`DATA.hitChance` |
| `el.feedback` | `['128','42','36']`；`'砰！'`；`'S'`、`'STYLISH'`；`'24'`、`'连击'` | `DATA.hits`（位置 / 颜色 / 大小按序号留在代码）；`DATA.sfx`；`DATA.rating`；`DATA.combo` |
| `el.notify` banner | `'发现 新区域：雪线'`（size 与 draw） | `DATA.discover` |
| 　band | `'第三章  雪线'` | `pack().game.chapter.band` |
| 　toast | `'成就解锁：初次登顶'`（size 与 draw） | `DATA.achievement` |
| 　pickupText | `'+3 木材'` | `pack().events.pickup` |
| 　emblem | `'据点占领'` | `DATA.emblem` |
| 　cutIn | `'艾'`、`'就是现在！'` | `DATA.hero.initial`、`DATA.cutIn` |
| 　modalCard | `'升级！'`、`'等级 7 → 8　生命 +12　解锁新技能'`（size 与 draw） | `DATA.levelUp[0/1]`（`'确定'` 不改） |
| `el.timer` | `` `第 ${DATA.turn} 回合 · 你的回合` ``；`` `波次 ${DATA.wave}` `` | `fill(DATA.turnText, { n: DATA.turn })`；`fill(DATA.waveText, { wave: DATA.wave })` |
| `el.speed` | `` `圈 ${a}/${b}` ``；`'km/h'`、`` `${DATA.speed} km/h` `` | `fill(DATA.lapText, { a, b })`；`DATA.speedUnit` |
| meta `el.rank` | `'#128'`、`'全服'`、`'A+'`、`'黄金 II'`、`'钻石'`、`'II'` | `DATA.rank.number / scope / letter / medal / tier / tierShort` |
| `el.profile` | `'雪线旅人'`（size 三处、draw 三处）、`'旅'`（三处）、`'UID 20261014　Lv.28'`、`'登山者'`、`'28'`（两处）、`'6,240 / 10,000'` | `DATA.profile.name / initial / line / title / level / exp`——**玩家名不是游戏名**，别用 `game.name` |
| `el.loading` | tip `'提示：雪线以上的树更矮，视野更开阔。'`；motif `'●'` | `DATA.loading.tip`、`.motif`（`'载入中…'`、`'62%'`、下载行不改） |
| `el.guide` | `'点这里打开宝箱'`、`'这是交互提示'`、`'向'`、`'先去打开那个宝箱吧！'` | `DATA.guide.spotlight / box / npc / line` |
| `el.meter` | rows 三行；`'冷'`、`'热'` | `DATA.meters`；`DATA.meterEnds` |
| `el.toolbar` | `cats` 七项 | `DATA.tools`（microMenu 的符号不改） |
| `el.turnOrder` | `n === '狼'`（两处） | `n === DATA.target.name` |
| `sim.ts` `simulate()` | `'+3 木材'`、`'获得 木材 ×3'`、`'升级！ Lv.8'`、`'+36'` | 开头 `const ev = packFor(r).events;`（`r` 为 null 时是 snowline），用 `ev.pickup / pickupToast / levelUp / heal` |
| 　起点 | `BASE_HP = 0.72` | 可选：起点改成 `packFor(r).hud.hp`（snowline 正好 0.72，不变），让各包的生命条起点不同；`BASE_HP` 导出保留 |
| `compose/simfx.ts` | 只画 `s.banner.text` / `s.toast.text` / 飘字 | 不用改，确认即可 |

坑：`sim.ts` 只从 `./content` import（不要 import elements，会成环）；`simulate` 是 (t, 事件, r) 的纯函数，**不要读全局 `pack()`**（它在 `setPack` 之前被调用，A/B 两侧的 r 也不同）。

### 6.3 G3：`compose/screen.ts`

| 位置 | 原来 | 改成 |
|---|---|---|
| 样本 `Q`（已删） | 视图（过渡） | 全部改成 `pack().screens.x`；设置页 `settingsOf()`（`.rows` / `.enums`）；改完删掉 `Q`、`LegacyQ`、`Q_CACHE` 与 `liveView` import |
| `TAB_LABELS` | `['全部','道具','装备','材料','任务']` | `pack().screens.tabs` |
| `drawNav` hub | 八个图标 | `GENERIC.hub` |
| 　hotspots 兜底 | `['信件','地图','日记','钥匙']` | 不改（书桌容器的物件名） |
| `templateLabel` 兜底 | `MENU.title` | `pack().menu.title` |
| `backdrop()` | `BG_ASSET[bg]`（keyArt → `ui_keyart`） | keyArt 只用 `artRef('keyArt')`（没有 → 灰盒"主视觉海报（需素材）"）；sceneArt 仍是通用的风景插画 |
| `drawFocal` character | avatar `'旅'` | `pack().hud.profile.initial` |
| 　VS | `assetFile('ui_char_anime')`、`assetFile('ui_char_painterly')` | `artRef('anime')`、`artRef('painterly')`（null → 剪影）；`focalArtReady` 同样改 |
| 　item | `slot(…, '✦', { rarity: 4 })` | `slot(…, DATA.featured.glyph, { rarity: 4, item: DATA.featured.item })`（snowline 两种查法都是 crystal） |
| 　title | `'雪线旅人'`（三处：主体字、书法条件、副标题条件）、`'胜利'`、`'旅途到此为止'`、`'第三章 · 雪线'`、`'SNOWLINE  WANDERER'` | `pack().game.name`、`screens.outcome[0/1]`、`game.chapter.card`、`game.subtitle`；书法条件再加 `!!artRef('title')` |
| 　data | `'28,460'` | `screens.bigStat` |
| `gridItems` | `MENU.items[i]` → `slot(e, rr, ch0, { … })`（只给符号） | `pack().menu.items`；`const [ch0, name, qty, ic] = …`，`slot(…, { …, item: ic ? name : undefined })`——snowline 不带图标，仍按符号猜，逐像素不变；别的包按声明的图标画 |
| 　tallCard / 签到 / opsBadge / goodsArt / `¥` 价格 | 运营类 | 不改 |
| `listRows` | `Q.leaders / servers / saves / mail / achievements / quests` | `screens.*`；服务器状态、`'推荐'`、`'空存档'`、`'＋ 新建存档'`、`'领取'`、`'前往'`、`'进行中'` 不改 |
| 　暂停 / 标题菜单 | `['继续游戏', …, '退出']` | `GENERIC.mainMenu` |
| 　奖励格 | `slot(…, '●', { qty: '×20' })` | `slot(…, DATA.res[0][0], { qty: '×20', item: DATA.res[0][1] })`（snowline 两种查法都是 coin） |
| `cardsRow` | `Q.draft` | `screens.draft` |
| `ringItems` | `MENU.items` 的符号 | `pack().menu.items`，同 gridItems 的图标规则 |
| `network` scatter | 六张卡 `'旧信'…'？'` | `screens.clues[i]`（位置留在代码） |
| 　routeMap | `Q.route` | `screens.route` |
| `table` | `Q.stats` | `screens.stats` |
| `form` naming | `'雪线旅人'`（两处） | `pack().hud.profile.name` |
| 　settings | `Q.settings`、`Q.enumVals[i === 4 ? 0 : 1]` | `settingsOf().rows / .enums`（第 5 行用枚举表 0、其余用 1 的约定保留） |
| `rebind` | `Q.binds` | `screens.binds` |
| `textBlock` | `Q.credits`；`'确定要分解这件装备吗？分解后无法恢复。'`；`'渡船已经修好了，可以出发。'`；`Q.notice` | `screens.credits / confirm / line / notice` |
| `mapView` | `'雪线'`（两处） | `pack().world.region` |
| `drawDetail` | `MENU.detail`、`MENU.buttons` | `pack().menu.detail / buttons`（`'+12'`、`'→ 74'` 不改） |
| `chrome()` chatTicker | `'[世界] 艾琳：有人一起去灯塔吗？'` | `screens.ticker` |
| `drawOps` topBanner | `'限时活动 · 雪线祭'` | `opsText().eventTitle`（snowline 覆盖成原字） |
| 　compliance watermark | `'雪线旅人'`（两处） | `pack().game.name` |
| 文件末 | `void DATA;` | DATA 不再用时连 import 一起删 |

不改：空状态、溢出提示、按钮、确认弹窗、继续 / 跳过、引导、运营动作与入口、顶栏货币、合规其余几行、`levelRoll` 的 7 → 8。
坑：流程演示按位置聚焦——登录流程聚焦服务器第 6 个、三选一聚焦第 2 个、建造聚焦第 3 个；`LOCKED_FROM = 5`。

### 6.4 G4：`compose/menu.ts` + `compose/sample.ts` + `compose/hud.ts` + `compose/touch.ts` + `world.ts` + `uiAssets.ts` + HudSystem 收尾

| 位置 | 原来 | 改成 |
|---|---|---|
| menu `MENU` | 视图 | 当时保留导出；现在 `drawMenu` 读 `pack().menu`，screen.ts 也不再用它——`MENU` 已经没有消费方 |
| `drawBackdrop` | `BG_ASSET[bg]`（keyArt） | keyArt 只用 `artRef('keyArt')`，没有 → 灰盒"主视觉插画（需素材）" |
| `drawWatermark` logo | `'旅'` | `pack().game.glyph` |
| 　bigText | `'ITEMS'` | `pack().menu.titleEn` |
| 　calligraphy | `drawInkTitle(…)` | 没有 `artRef('title')` 时落到灰盒"书法水印（需素材）"（drawInkTitle 改完后自然如此） |
| 　`DESK_SPOTS`、`CONTAINER_LABEL`、`BG_LABEL`、`WM_LABEL` | 容器物件 / 标注 | 不改 |
| sample `SAMPLE` | 常量 | 改成视图：`liveView(() => 按包缓存的 { title: hud.m1.title, hp: hud.hp, row: hud.m1.row, row2: hud.m1.row2, key: hud.interactKey, prompt: hud.interact, name: hud.subtitle[0], line: hud.subtitle[1], feed: hud.feed, quest: hud.objective })`；当时保留导出，现在 godotHud.ts 改读 `packFor(r)`、drawSample 用 `sampleOf(pack())`——`SAMPLE` 已经没有消费方 |
| 　密集档技能栏 | `['◆','●','▲','✦','■','♥'][i]` | `pack().hud.m1.hotbar[i]`（`'任务'` 标题不改） |
| `compose/hud.ts` | 无样本字 | 不用改，确认即可 |
| touch `SKILLS` | `['✦','☄','♨','⚡','❄']` | `pack().hud.touch.skills` |
| 　按钮 | `'⚔' '攻击'`、`'⤒' '跳跃'`、`'✊' '动作'` | `touch.main`、`touch.jump`、`touch.act`（`'技能 n'`、提示语不改） |
| `world.ts` | 兴趣点标签 | 不改（见第 1 节） |
| uiAssets `itemName()` | `ITEM_BY_NAME[x] ?? ITEM_BY_GLYPH[x]` | `iconOf(x) ?? ITEM_BY_NAME[x] ?? (pack().glyphIcons ? ITEM_BY_GLYPH[x] : undefined) ?? null`；`ITEM_BY_NAME` 保留 |
| `characterImage(r, medium)` | 固定的三个立绘素材 | 读 `artRef(key, packFor(r))`：full → painterly / anime（原来的选择条件不变）、bust / avatar → bust、chibi → chibi；没有 → null（调用方画剪影 / 灰盒） |
| `BG_ASSET` | `{ keyArt: 'ui_keyart', sceneArt: … }` | 保留 sceneArt；keyArt 交给调用方按 `artRef('keyArt')`（或加一个 `bgAssetFile(bg)` 帮手，G3 的 backdrop 也可以用——但 G3 不等它，直接用 `artRef` + `assetFile`） |
| `drawInkTitle()` | `assetFile('ui_calligraphy_title')` | `const ref = artRef('title'); if (!ref) return false;` 再取文件 |
| HudSystem | — | 已接好（每侧 `setPack(packFor(tth.r))`，画完留在 B 侧）；确认没有在 compose 之外画字的地方 |

坑：uiAssets.ts 从 `./content` import（content 不 import uiAssets，没有环）；`characterImage` 用 `packFor(r)` 而不是 `pack()`（面板缩略图等可能在 HudSystem 之外调）。

### 6.5 G5：`export/godotHud.ts` + `export/godotLayout.ts` + `src/ui/hud/*`

| 位置 | 原来 | 改成 |
|---|---|---|
| `godotUiFiles` | 读 `SAMPLE` / `DATA`（全局当前包） | `const p = packFor(r);`，全部从 `p` 读；删掉 `SAMPLE`、`DATA` import |
| 四控件脚本 | `SAMPLE.title / hp / row / key / prompt / name / line` | `p.hud.m1.title`、`p.hud.hp`、`p.hud.m1.row`、`p.hud.interactKey`、`p.hud.interact`、`p.hud.subtitle[0/1]` |
| `layoutGd(layout, sample)` | `{ hp, objective, feed, party, prompts }` | 传 `p.hud`（或扩充 sample）：另需 `vitalNames`、`shield`、`stamina`、`res` + `gold / gems / wood`、`objectiveTitle`、`subtitle`、`cta.start` |
| godotLayout `el.vitals` | `[["生命", hp], ["护盾", 0.4], ["体力", 0.55]]` | `vitalNames` 与 `hp / shield / stamina` |
| `el.resources` | `[["●","1,280"],["✦","46"],["◆","24"]]` | `res[i][0]` + `gold.toLocaleString('en')` / `String(gems)` / `String(wood)` |
| `el.objective` | `"目标"` | `objectiveTitle` |
| `el.subtitle` | `"向导：山顶的雪线以上长不出阔叶树，你注意到了吗？"` | `` `${subtitle[0]}：${subtitle[1]}` `` |
| `el.cta` | `"开始游戏"` | `cta.start` |
| 引号 | 有的直接把字插进 `"…"` | 一律 `JSON.stringify()`（包里的字可能带引号、反斜杠；snowline 的输出逐字不变） |
| UiPanel 内容页 | 参数按组列出，组标题 `GROUP_LABEL.get(g)` | cnt 组标题后面加"示例内容：〈packFor(r).game.name〉"，旁边一个小按钮"建议场景：〈sceneMeta(p.scene).name〉（套用）"：`set('game.scene', p.scene)`（与 LeftRail 选场景同一写法，可撤销）；已经是这个场景时按钮置灰 |

坑：`godotHud` 的 `.gd` 文本在 snowline 下要与改造前逐字相同（迁移校验 `npm run check:godot` 有 Godot 时再跑一遍，非雪线包也跑一次，查 GDScript 字符串转义）；UI_MIGRATION.md 可以加一行"示例内容：游戏名"。面板的包名用 `packFor(r)`（`r` 是面板自己 `resolveUi(values)` 的结果），不读全局 `pack()`。

## 7. 验收

1. `npx tsc --noEmit -p tsconfig.json` 通过（每个组、每个包）。
2. `npm run check:content`：没有新问题（字体子集外的字由维护者统一重跑 `scripts/fonts-subset.ts` 后清零，见第 5 节字数预算）。
3. **逐像素**：cnt.pack = snowline 时，`qa/c1-before-layouts.png`、`c1-before-templates.png`、`c1-before-misc.png` 的每一格与改造后一致。
   - 包要钉在每一格里：`grid` 的 `reset: true` 会把 UI 键（含 cnt.pack）清回默认 auto，auto 下显式布局会换成各自品类的包，所以对照脚本要在每格的 `extra` 里写 `'cnt.pack': 'snowline'`（面板上手动设一次没用）；`hudSheet` / `elementSheet` 现在默认钉 snowline（最后一个参数传 'auto' 才跟随品类）。
   - 字体：C1 重跑了字体子集，界面模板标题栏的字（来自 uiSpec 的预设名，原来不在子集里、画的是系统兜底字体）有一部分现在进了子集，所以用现在的字体截图时这 7 格的标题栏会换字形：tpl.hero（详）、tpl.saveSlot（槽）、tpl.rebind（绑）、tpl.runSummary（总）、tpl.forge（锻）、tpl.loadout（娃）、tpl.settle（算）——这是字体变了，不是代码回归。要逐像素比，就用改造前的字体截"改造后"：先把改造前的 `src/assets/fonts/*.woff2` 与 `charset.txt` 放回去截图，截完 `npx tsx scripts/fonts-subset.ts` 重新生成（或放回备份）。
   - 代码层面已经用记录型的假 Canvas2D 对过一遍（969 个用例：全部布局 / 模板 / 皮肤 / 密度 / 容器 × 水印 / 主体 × 媒介 / 触屏 / 模拟事件 / 流程 / 伪本地化 / 每个元素的每种画法）：cnt.pack = snowline 时与改造前的绘制调用、画布状态、文字与命中框逐条一致（只多了数据主体缩字前的一次量字，不画东西）。
4. 每个新包：在它的布局（第 3 节表）+ 全部控件展示（把 game.genre 换成它的画面品类，或直接选 cnt.pack）+ 几个常用模板（标题、背包、任务、设置、结算、对话）下看一遍：没有冒字、没有空格子、语气像这个品类；手柄图标集（ix.glyphs = xbox / playstation / nintendo）下按键提示不重复。
5. Godot：snowline 的 `hud_sample.gd` 与改造前逐字相同；任选两个新包导出能通过 `npm run check:godot`。

## 8. 合并顺序

- 作者组（packs/*.ts）与改造组（消费方文件）改的文件互不重叠，可以同时进行；改造组用 snowline 自测（其余包是 null，自动回到 snowline）。
- 改造组之间的依赖都已经由本阶段的过渡层解开：`DATA` / `MENU` / `SAMPLE` 视图一直保留，`artRef` / `iconOf` / `fill` / `GENERIC` 已在 `content/index.ts`；G3 不等 G4 的 uiAssets 改动（keyArt 与 VS 立绘直接用 `artRef` + `assetFile`）。
- 全部合并后维护者：重跑字体子集 → check:content → 逐像素对照 → 逐包截图审阅；再决定是否删掉 `DATA` / `MENU` / `SAMPLE` 视图（删时把剩余消费方改成 `pack().…`）。字体子集、check:content 已在 2026-10-15 重跑；`MENU`、`SAMPLE` 已经没有消费方，`DATA` 仍是元素的读法。
