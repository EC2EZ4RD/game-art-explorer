# 游戏 UI / HUD 设计原则（K2 修订稿）

> 机读版：`src/content/uiPrinciples.json`（同一份内容；探索台用它解释「为什么、什么时候用」，demo 写成 base + a + b 可直接渲染）。共 85 条原则、9 个领域、23 个品类篇、204 条文献。姊妹篇：[`17-ui-style-atlas.md`](17-ui-style-atlas.md)（UI 风格图谱：93 个家族的语法、搭配与失败模式）。两者互链：本文每条原则都有「同一原则，换一种风格」，指向图谱家族；图谱每个家族列出最相关的原则（JSON 的 `styleFamilies[].topPrinciples`）。

**范围**：局内 HUD、菜单与界面流程、对话、设置、地图、背包、制作与建造、成长、教学、标题与读取、结算、多人沟通（标记、信息流、计分板），以及 UI 风格与美术方向的关系。**手游的商城、奖励、抽卡、签到、首充、通行证、红包、广告等商业化界面不在范围内，也没有从中归纳任何原则**（08 号调研的材质统计也只取非商业化界面）；手游的战斗 HUD、触屏布局和非商业化界面在范围内。

**证据**：① 452 张 UI 参考卡（`src/content/uiRefs.json`，写作「游戏名（卡 id）」）。其中 79 张卡的商店图里没有 UI（或只有 CG / 海报），UI 描述来自已知印象，本文引用时标「据已知描述」，做法谱系与例子列表把看得见 UI 的卡排在前面。② R3 Steam 评测：本地缓存 74,932 条里有 6,243 条重复文本，**本文所有评测计数都是去重后（68,689 条、335 款）的重算**；只用计数，不引原文；「≥ 2 条」才算一款游戏是某类抱怨的出处；关键词是粗筛，只说明常被提起、出在哪些游戏，不做因果。「字太小」与「HUD 太乱」两类逐条人工复核后几乎全部失效（见第五部分），相关结论改由规范与看图支撑。分组比较只比「标了 X」和「明确标了非 X」的卡，并写出原始分数。③ 文献与官方规范（第七部分）。GameUI 手游卡没有评测数据，相关结论来自看图。每条反例都标了依据：评测 / 截图 / 文献 / 背景 / 推断。

**怎么读**：第一部分是 12 条总则；第二部分按 9 个领域展开原则，每条都有：要解决的问题 → 做法谱系 → 经验法则 → 反例与玩家评价 → 同一原则，换一种风格 → 出处 → 可演示的对比；第三部分按品类写；第四部分是风格家族与原则的对照；第五部分是证据与方法；第六部分是参数缺口与补卡单；第七部分是参考文献。参数一律写成「中文名 = 取值」（鼠标悬停可看参数 id），demo 的完整参数向量收在折叠块里；参数词表见 `09-ui-param-system-overview.md`。原则的意图是**探索风格的谱系**——同一个问题给出几种都成立的做法，再看它在不同风格家族里怎么落地，而不是复刻某一款游戏。

## 速查表

85 条原则一行一条：一句话法则、什么时候用、主要旋钮（2–3 个参数）、demo。点原则名跳到正文。

| 原则 | 一句话法则 | 什么时候用 | 主要旋钮 | demo |
|---|---|---|---|---|
| [P-priority-tiers](#p-priority-tiers) | 先分级再上色：每一刻只允许 1–3 个「主」信息 | 局内 HUD · 动作与 Roguelite、射击、竞速与驾驶 等 | 强调配方、大小 / 突出度、信息优先级 | 六块一样重 vs 只有血条与 Boss 条是「主」 |
| [P-glance-encoding](#p-glance-encoding) | 一眼可读：用形状、计数、位置传状态，别让玩家读字算数 | 局内 HUD · 动作与 Roguelite、横版平台、射击 等 | 数值图形、数值标注、生命 / 护盾 / 体力：条数 | 读三行当前 / 上限 vs 数格子 + 一个大数字 |
| [P-focal-periphery](#p-focal-periphery) | 焦点与余光：要精读的放在视线附近，四角只负责「有变化」 | 局内 HUD · 探索与冒险、动作与 Roguelite、射击 等 | 屏幕锚点、敌人血条 / 预警 / 意图：画法、世界挂点 | 信息分在四角 vs 挂在枪上、敌人头顶、屏幕边缘 |
| [P-actionable-first](#p-actionable-first) | 先给能行动的信息：先预告、再结算——意图、预警、命中率与结果预览替玩家做掉心算 | 局内 HUD · 动作与 Roguelite、角色扮演、策略与战术 等 | 敌人血条 / 预警 / 意图：画法、数值标注、世界挂点 | 只给「现在」 vs 画出敌人下一步与 a → b 预览 |
| [P-squint-test](#p-squint-test) | 眯眼检验：模糊后最显眼的必须是玩法信息，不是装饰和特效 | 局内 HUD · 所有品类 | 装饰预算、饰件、叠加特效层 | 装饰与特效预算压在 HUD 上 vs 收回去 |
| [P-two-questions-per-element](#p-two-questions-per-element) | 两个问题、逐个元素定位置：角色看不看得见 × 它在不在三维空间里 | 局内 HUD · 探索与冒险、动作与 Roguelite、射击 等 | 放置方式（逐元素）、默认放置方式、世界挂点 | 全部屏幕叠加 vs 逐元素选象限 |
| [P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction) | 叙事内载体要过两关：世界观给得出理由，镜头一定拍得到 | 局内 HUD · 探索与冒险、射击、叙事与视觉小说 等 | 默认放置方式、放置方式（逐元素）、世界挂点 | 读数在屏幕两角 vs 长在背上和手持物上 |
| [P-spatial-render-budget](#p-spatial-render-budget) | 空间内标注 | 局内 HUD · 探索与冒险、动作与 Roguelite、策略与战术 等 | 放置方式（逐元素）、世界渲染（逐元素）、世界挂点 | 公告板牌子 vs 透视缩放 + 地面预警 + 描边 |
| [P-device-bridge](#p-device-bridge) | 设备型界面「推到镜头前」：故事上是角色手里的东西，呈现上是清晰的平面 | 地图 / 世界地图 · 探索与冒险、动作与 Roguelite、叙事与视觉小说 等 | 场景容器、默认放置方式、UI 受画面后处理影响 | 暂停后的平面地图 vs 角色手里的纸地图 |
| [P-pause-world-state](#p-pause-world-state) | 开菜单时世界停不停 | 背包 / 物品 · 探索与冒险、动作与 Roguelite、角色扮演 等 | 背后画面来源、压暗强度、阻断性 | 冻结、压暗、去色 vs 世界照常运行、只轻压暗 |
| [P-meta-perception](#p-meta-perception) | 元 UI（整屏效果）只让玩家「感到」身体状态，不报数值 | 局内 HUD · 动作与 Roguelite、射击、竞速与驾驶 等 | 元 UI 屏幕效果、放置方式（逐元素）、元 UI 效果（逐元素） | 读得出剩几格 vs 只能从红边与褪色里感到 |
| [P-world-legibility-guard](#p-world-legibility-guard) | 进了世界就要受世界的光、雾和后处理：给叙事内 / 空间内元素做可读性兜底 | 局内 HUD · 探索与冒险、恐怖与悬疑、解谜与侦探 等 | 文字可读辅助、UI 受画面后处理影响、放置方式（逐元素） | 跟着场景变暗变小 vs 自发光、固定大小 |
| [P-world-space-text](#p-world-space-text) | 把字放进世界：目标投在墙上、地名写在建筑上——什么时候值得，以及怎样兜住可读性 | 局内 HUD · 探索与冒险、动作与 Roguelite、射击 等 | 放置方式（逐元素）、世界挂点、世界渲染（逐元素） | 目标写在屏幕右上 vs 投射在目标地点的墙面上 |
| [P-vr-spatial-ui](#p-vr-spatial-ui) | VR 与空间界面 | 射击、音游、模拟驾驶与飞行 等 | 放置方式（逐元素）、世界挂点、技能 / 冷却 / 弹药 / 手牌：画法 | VR 空间界面（文字说明，探索台暂不能演示） |
| [P-juice-budget](#p-juice-budget) | 反馈强度是一笔预算：按事件分量与品类节奏分配，而不是全局拉满 | 局内 HUD · 动作与 Roguelite、建造与经营、解谜与侦探 等 | 反馈强度、数值变化、入场动效 | 冷静（只有数值与颜色）vs 夸张（砸入、回弹、拟声字） |
| [P-hit-channel-split](#p-hit-channel-split) | 命中反馈分层：世界层回答「打中了吗」，UI 层只回答「打了多少 / 打得怎样」 | 局内 HUD · 动作与 Roguelite、射击、角色扮演 | 命中反馈 / 连击：画法、屏幕锚点、世界挂点 | 数字压在敌人身上 vs 评价与连击挪到右侧 |
| [P-damage-number-legibility](#p-damage-number-legibility) | 伤害数字：大小表达分量、颜色加字样表达类型、高频合并、玩家可关 | 局内 HUD · 动作与 Roguelite、射击、角色扮演 等 | 命中反馈 / 连击：画法、世界挂点、数字字体 | 逐击细数字摞成一列 vs 合并成一个描边大数 |
| [P-value-change-visible](#p-value-change-visible) | 数值变化要「看得见差值」：真值立即落位，差值层按角色选拖尾、分段或滚动 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 数值变化、数值图形、数字字体 | 瞬变只看结果 vs 拖尾留住这一串掉了多少 |
| [P-shake-hitstop](#p-shake-hitstop) | 震屏与顿帧：短、快速衰减、按强度分级、设上限、HUD 不跟着抖 | 局内 HUD · 动作与 Roguelite、横版平台、射击 等 | 反馈强度、元 UI 屏幕效果、时间模型 | 每下闪白大震、血条跟着晃 vs 轻震、血条不动 |
| [P-motion-personality](#p-motion-personality) | 动效语言是皮肤的一部分：缓动、时长、帧率、入场方式随美术风格成套切换 | 对话 / 文本 · 所有品类 | 缓动性格、入场动效、动效时长 | 水墨面板配故障闪现 vs 配墨晕擦出 |
| [P-transition-frequency](#p-transition-frequency) | 转场长度与使用频率成反比：高频界面近乎瞬时，稀有节点才给仪式 | 背包 / 物品 · 所有品类 | 动效时长、入场动效、界面转场 | 0.9 秒翻书打开背包 vs 0.15 秒淡入 |
| [P-event-callout-tiers](#p-event-callout-tiers) | 事件通告分级：越大越少、越大越短，只有最高一级可以占据画面中心 | 局内 HUD · 探索与冒险、动作与 Roguelite、竞速与驾驶 等 | 通知 / 大字提示：画法、入场动效、屏幕锚点 | 拾取也横贯屏幕 vs 进左上消息列 |
| [P-result-tally](#p-result-tally) | 结算节奏：结论先行、逐项计数、评级盖章，全程一键完成 | 结算 / 胜负 / 奖励 · 动作与 Roguelite、竞速与驾驶、卡牌与桌面 等 | 数值变化、数字字体、入场动效 | 不可跳过的慢计数 vs 快计数 + 一键完成 |
| [P-audio-haptic-pairing](#p-audio-haptic-pairing) | 声音与触觉是第二通道 | 局内 HUD · 所有品类 | 敌人血条 / 预警 / 意图：画法、对话框结构 | 身后来敌只有脚步声 vs 加上屏幕边缘方向提示 |
| [P-menu-architecture](#p-menu-architecture) | 菜单骨架：页签环、左侧导航、图标宫格、场景热区——按入口数与输入方式选 | 暂停菜单 · 探索与冒险、动作与 Roguelite、角色扮演 等 | 分区导航、分类级数、叠层表现 | 顶部页签环 vs 3×2 图标宫格 |
| [P-inventory-capacity-model](#p-inventory-capacity-model) | 背包容量模型：方格、列表、拼图格、负重、收藏本——先选'约束是什么' | 背包 / 物品 · 探索与冒险、动作与 Roguelite、射击 等 | 条目排布几何、格子结构、详情呈现 | 方格网格（空坑即容量）vs 列表 + x / y 计数 |
| [P-item-decision](#p-item-decision) | 装备与道具决策：背包要当场回答'这件比我身上的好吗' | 角色 / 装备 / 属性 · 探索与冒险、动作与 Roguelite、角色扮演 等 | 变化 / 前后对比、详情呈现、主角色呈现介质 | 悬停才有新数值 vs 常驻 a → b + 即时换装 |
| [P-map-conventions](#p-map-conventions) | 地图：先回答'我在哪、朝哪、下一步去哪'，画风再千变万化 | 地图 / 世界地图 · 探索与冒险、横版平台、策略与战术 等 | 地图画风、地图未探索区、节点形态 | 手里的纸地图 vs 屏幕地图（玩家箭头、针、云雾三态） |
| [P-dialogue-presentation](#p-dialogue-presentation) | 对话呈现：文字放在哪、谁在说、能不能回看 | 对话 / 文本 · 动作与 Roguelite、角色扮演、叙事与视觉小说 等 | 对话框结构、文字出现、主体位置 | 底部通栏 + 立绘 vs 右侧滚动文本栏 |
| [P-choice-framing](#p-choice-framing) | 对话 / 事件选项：让玩家知道自己在选什么 | 对话 / 文本 · 探索与冒险、动作与 Roguelite、角色扮演 等 | 对话 / 事件选项：画法、内部排布、屏幕锚点 | 冻结居中按钮 vs 头顶气泡 + 倒计时 |
| [P-journal-codex](#p-journal-codex) | 日志、任务与图鉴：给'接下来做什么'一个随时可回看的家 | 任务日志 / 目标 · 探索与冒险、角色扮演、建造与经营 等 | 详情呈现、场景容器、分区方式 | 同一本手写笔记本：没有追踪 vs 当前目标置顶 + 进度 |
| [P-progression-graph](#p-progression-graph) | 技能树 / 成长图：依赖关系、下一步、买不买得起，要比画风更先读出来 | 技能树 / 成长 · 动作与 Roguelite、角色扮演、策略与战术 等 | 条目排布几何、主数据结构、节点形态 | 三态全靠灰度 vs 锁、勾、常驻详情 |
| [P-settings-page](#p-settings-page) | 设置页：分类清楚、每项有说明与预览、改坏了能恢复 | 设置 · 所有品类 | 设置项：开关类、设置项：多选一、设置项：数值 | 一条长滚动列表 vs 分类 + 说明 + 实时预览 |
| [P-save-continuity](#p-save-continuity) | 存档与读档：让'中断'和'回来'都无痛 | 存档 / 读档 · 探索与冒险、动作与 Roguelite、横版平台 等 | 确认机制、主数据结构、条目排布几何 | 「存档 1 · 日期」一点就覆盖 vs 截图 + 地点 + 目标 + 二次确认 |
| [P-teach-then-retire](#p-teach-then-retire) | 教学先在情境里出现、成功一次就退场 | 教程 / 提示卡 · 所有品类 | 阻断性、引导强制度、本屏怎么结束 | 开局全屏强制弹窗 vs 情境提示条 + 成功即退场 |
| [P-craft-recipe](#p-craft-recipe) | 制作界面先回答「缺什么、能做几个、做完去哪」 | 制作 / 合成 · 生存与制作、建造与经营、工厂与自动化 等 | 价格 / 消耗：画法、锁定 / 未获得表现、警示表达 | 只说「材料不足」vs 逐项有 / 需对照 + 数量控件 |
| [P-build-placement](#p-build-placement) | 放置预览：合法与否用颜色 + 形状双通道说清，成本当场预览，撤销随手可得 | 建造菜单 · 建造与经营、工厂与自动化、生存与制作 等 | 确认机制、信息叠层 / 图例：画法、放置方式（逐元素） | 只用颜色、按下才知道 vs 幽灵预览 + 斜纹 + 成本预览 |
| [P-fail-retry](#p-fail-retry) | 失败到重来的秒数是一项设计指标：一键重来、失败原因一句话、重复的演出可跳过 | 结算 / 胜负 / 奖励 · 横版平台、动作与 Roguelite、竞速与驾驶 等 | 动效时长、跳过 / 快进、本屏怎么结束 | 慢结算 + 确认弹窗 vs 秒回 + 一键重来 |
| [P-frontend-loading](#p-frontend-loading) | 标题、读取与前端是风格浓度最高的地方：读取页兼作教学，等待也要有进度与可读的提示 | 读取 / 过场 · 所有品类 | 背后画面来源、替换背景、加载 / 等待指示：画法 | 只有转圈 vs 场景图 + 一条提示 |
| [P-in-game-charts](#p-in-game-charts) | 游戏内图表：先给趋势再给数值——增量箭头、内联条、对比条、迷你走势线各管一种问题 | 结算 / 胜负 / 奖励 · 建造与经营、工厂与自动化、策略与战术 等 | 统计图形、数值图形、世界 / 社会态势条：画法 | 一张数字表 vs 内联条 + 增量箭头 |
| [P-glyph-follows-device](#p-glyph-follows-device) | 按键提示跟着「手里正在用的设备」走 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 输入方式、按键提示图标集、按键 / 操作提示：画法 | PC 键鼠却显示手柄圆钮 vs 键帽字形 |
| [P-prompt-in-context](#p-prompt-in-context) | 按键提示放在「要按的地方」：情境提示优先，常驻键位表兜底 | 局内 HUD · 探索与冒险、动作与 Roguelite、角色扮演 等 | 按键 / 操作提示：画法、屏幕锚点、显隐（逐元素） | 顶部常驻整张键位表 vs 右下情境按键 + 贴物提示 |
| [P-focus-unmistakable](#p-focus-unmistakable) | 手柄 / 键盘焦点一眼可见、移动可以预测：至少两种通道，对相邻颜色 ≥ 3:1 | 背包 / 物品 · 探索与冒险、动作与 Roguelite、角色扮演 等 | 导航焦点表现、输入方式、已选 / 已装备标记 | 焦点与已装备都是描边 vs 焦点放大 + 已装备角标 |
| [P-radial-for-sticks](#p-radial-for-sticks) | 摇杆选方向：径向轮盘与十字快捷格代替一排热键 | 局内 HUD · 动作与 Roguelite、射击、角色扮演 等 | 输入方式、技能 / 冷却 / 弹药 / 手牌：画法、内部排布 | PC 热栏原样搬上手柄 vs 左下十字四格 |
| [P-touch-target-size](#p-touch-target-size) | 触屏：目标够大、主次分明、离拇指近，次要键也不能小，能不放按钮就不放 | 局内 HUD · 动作与 Roguelite、角色扮演、策略与战术 等 | 输入方式、虚拟摇杆、触屏按钮布局 | 40px 方格主次一样大 vs 大主键 + 弧形小键 |
| [P-portrait-one-hand](#p-portrait-one-hand) | 竖屏单手：操作在下 1/3，读数在上方 | 局内 HUD · 角色扮演、叙事与视觉小说、工厂与自动化 等 | 画幅朝向、输入方式、屏幕锚点 | 主按钮在右上 vs 挪到下中与右下 |
| [P-view-distance](#p-view-distance) | 按视距定字号与安全区：PC 60cm、电视 2.5m、掌机 30cm | 局内 HUD · 探索与冒险、动作与 Roguelite、角色扮演 等 | 设备与观看距离、安全边距、输入方式 | PC 密度直接上电视 vs 26px、5% 边距、稀疏 |
| [P-aspect-anchor](#p-aspect-anchor) | 画幅适配：锚定与留白，不拉伸 | 局内 HUD · 动作与 Roguelite、射击、竞速与驾驶 等 | 屏幕宽高比、安全边距、玩法区形态 | 16:9 vs 21:9 下 HUD 仍留在居中 16:9 |
| [P-detail-without-hover](#p-detail-without-hover) | 详情不能只挂在悬停上 | 背包 / 物品 · 角色扮演、策略与战术、建造与经营 等 | 详情呈现、输入方式、选中信息面板：画法 | 临时详情（触屏无悬停）vs 常驻右栏 |
| [P-input-parity](#p-input-parity) | 每种输入都走得完全程：一套界面，多套操作 | 设置 · 横版平台、角色扮演、策略与战术 等 | 输入方式、按键 / 操作提示：画法、导航焦点表现 | 下拉框 + 细滑条 vs 左右切换 + 分格条 + 图例 |
| [P-shared-screen](#p-shared-screen) | 同屏多人：每个玩家要一眼对上「我是哪个、我的手柄是哪个」 | 局内 HUD · 动作与 Roguelite、射击、竞速与驾驶 等 | 同屏玩家与视口、队伍 / 玩家条：画法、信息密度 | 单人队伍条 vs 共享一屏的玩家色头像条 |
| [P-confirm-by-input](#p-confirm-by-input) | 防误触与确认方式按输入选：抬起触发、可取消、少用长按与连打 | 局内 HUD · 叙事与视觉小说、策略与战术、建造与经营 等 | 确认机制、输入方式、按下反馈 | 即点即生效 + 右上小 × vs 二次确认 + 底部取消 |
| [P-text-size-floor](#p-text-size-floor) | 字号有底线、文字与 UI 都能缩放并重排：放到 200% 也不丢内容 | 背包 / 物品 · 探索与冒险、动作与 Roguelite、射击 等 | 文字缩放、文字溢出 / 伪本地化、大小 / 突出度 | 默认尺寸贴边 vs 放大 1.5 倍 + 安全边 + 溢出检查 |
| [P-text-over-live-scene](#p-text-over-live-scene) | 压在实时画面上的字必须自带「底」：对比度按最不利的那一帧算 | 局内 HUD · 探索与冒险、动作与 Roguelite、竞速与驾驶 等 | 文字可读辅助、底不透明度、面板明度 | 浅色毛玻璃 + 细体 vs 深底 + 描边 |
| [P-color-never-alone](#p-color-never-alone) | 颜色永远不单独承载信息：每个语义色都配一个形状、图标、文字或位置 | 局内 HUD · 动作与 Roguelite、射击、角色扮演 等 | 语义颜色编码、状态标识形态、图标风格 | 红绿阵营 + 只靠边框色 vs 橙蓝 + 星级框形 + 锁图标 |
| [P-high-contrast-and-recolor](#p-high-contrast-and-recolor) | 高对比模式与玩家自选色：把「重要的」和「不重要的」拉开，而不是把画面调亮 | 局内 HUD · 动作与 Roguelite、横版平台、射击 等 | 文字可读辅助、高对比模式、背后调色 | 默认显示 vs 高对比 + 换色（绿色盲模拟下） |
| [P-subtitles-captions](#p-subtitles-captions) | 字幕是一套独立排版：默认开、比正文大、标说话人、可加底，声音信息也要有画面版本 | 局内 HUD · 探索与冒险、动作与 Roguelite、射击 等 | 对话框结构、文字可读辅助、屏幕锚点 | 投影细字幕 + 打字机 vs 半透明底 + 大字 + 整句 |
| [P-typography-legible-format](#p-typography-legible-format) | 正文排版：无衬线可选、句子不用全大写、行长与字距有上限，风格交给标题 | 局内 HUD · 射击、角色扮演、叙事与视觉小说 等 | 正文字族、标题字族、正文字重 | 窄体全大写宽字距 vs 正文原样大小写 |
| [P-flash-motion-comfort](#p-flash-motion-comfort) | 光敏、晕动与减少动效：闪烁有硬阈值，减少动效按通道替换——降的是刺激，不是信息 | 局内 HUD · 所有品类 | 减少动效、反馈强度、环境待机动效 | 全部动效 vs 减少动效（替换而非删除） |
| [P-motor-input-alternatives](#p-motor-input-alternatives) | 改键与操作替代：任意动作可改，长按 / 连打 / 同时按都有替代，所有提示跟着改 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 输入方式、按键提示图标集、按键绑定呈现 | 长按确认与跳过 vs 选中 + 确认、跳过按钮、情境提示 |
| [P-a11y-presets-discoverable](#p-a11y-presets-discoverable) | 无障碍选项要成套、可发现、可预览：首启给预设，每项仍可单调 | 局内 HUD · 所有品类 | 即时预览、文字缩放、UI 缩放 | 默认设置 vs 「视觉辅助」一键预设 |
| [P-localization-ready](#p-localization-ready) | 本地化先于美术定稿 | 背包 / 物品 · 所有品类 | 文字溢出 / 伪本地化、文案语言、文字缩放 | 同一背包：中文文本 vs 英文文本（叠 +30% 溢出检查） |
| [P-harmony-four-relations](#p-harmony-four-relations) | 先定 UI 与画面的关系，再挑皮肤 | 手牌 / 牌桌 · 动作与 Roguelite、角色扮演、叙事与视觉小说 等 | UI 与画面关系、UI 取色来源、标题字族 | 同一媒介 vs 中性（换两种美术配方各看一遍） |
| [P-channel-borrowing](#p-channel-borrowing) | 把美术方向拆成六个通道（材质、线、色、字、饰、动），逐个决定借不借——“跟随画面”不是一个开关 | 局内 HUD · 探索与冒险、动作与 Roguelite、角色扮演 等 | UI 与画面关系、装饰母题、装饰预算 | 六个通道全借 vs 只借场景色 |
| [P-dwell-time-budget](#p-dwell-time-budget) | 风格浓度按停留时间分配：HUD 借最少，停下来看的界面借最多 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 装饰预算、信息密度、外框结构 | 菜单级装饰压在 HUD 上 vs 同字族的减配 HUD |
| [P-medium-constraints](#p-medium-constraints) | 同一媒介要守媒介的硬约束 | 局内 HUD · 动作与 Roguelite、横版平台、建造与经营 等 | 标题字族、UI 像素化、UI 动画帧率 | 矢量圆角浮在像素世界上 vs 同网格像素 UI |
| [P-palette-roles](#p-palette-roles) | UI 取色取“角色”不取“颜色” | 局内 HUD · 动作与 Roguelite、射击、竞速与驾驶 等 | UI 取色来源、骨架色彩策略、UI 饱和度 | 同色系红调警示 vs 场景骨架 + 独占品红 + 黄三角 |
| [P-type-two-tier](#p-type-two-tier) | 字分两层 | 对话 / 文本 · 动作与 Roguelite、角色扮演、叙事与视觉小说 等 | 标题字族、正文字族、数字字体 | 书法标题 + 楷体小正文 vs 书法标题 + 无衬线正文 |
| [P-title-lettering](#p-title-lettering) | 标题字 / LOGO 是“画”出来的资产 | 标题 / 主菜单 · 动作与 Roguelite、横版平台、角色扮演 等 | 标题字族、标题 / LOGO：画法、标题字特效 | 普通页眉 vs 用画面同一支笔写的标题 |
| [P-motif-from-world](#p-motif-from-world) | 装饰母题从世界里的“物与纹”取样：建筑、器物、织物、仪式符号，而不是通用花边 | 角色 / 装备 / 属性 · 探索与冒险、射击、角色扮演 等 | 装饰母题、装饰预算、外框材质 | 通用金花饰 + 宝石 vs 世界里取样的符文与石材 |
| [P-material-from-world](#p-material-from-world) | 面板材质先问一句“它在世界里是什么做的” | 任务日志 / 目标 · 角色扮演、策略与战术、建造与经营 等 | 内芯结构、内芯材质、外框结构 | 全息面板 vs 皮面日志本（看哪个属于这个世界） |
| [P-medium-simulation](#p-medium-simulation) | 先问界面在模仿什么载体 | 局内 HUD · 射击、竞速与驾驶、叙事与视觉小说 等 | 转角、描边线型、正文字族 | 通用深色面板 vs 头盔摄像机的取景器 OSD |
| [P-contrast-with-reason](#p-contrast-with-reason) | 刻意对比要有理由，而且只在一两个轴上反差 | 暂停菜单 · 动作与 Roguelite、射击、角色扮演 等 | UI 与画面关系、标题字族、UI 取色来源 | 与画面无关的多色拼贴 vs 取色回到场景的拼贴 |
| [P-neutral-one-voice](#p-neutral-one-voice) | 中性 UI 不等于没有风格 | 局内 HUD · 角色扮演、策略与战术、建造与经营 等 | UI 与画面关系、面板明度、底不透明度 | 调试面板式中性 vs 中性 + 一个声部 |
| [P-follow-world-over-time](#p-follow-world-over-time) | UI 跟着世界“变” | 局内 HUD · 探索与冒险、叙事与视觉小说、策略与战术 等 | 主题色变化、UI 取色来源、骨架色彩策略 | 固定浅色面板 vs 跟着场景色板换底换强调 |
| [P-icon-system](#p-icon-system) | 图标是一套词汇表 | 背包 / 物品 · 所有品类 | 图标风格、图标集来源、UI 像素化 | 写实小图标 + 三种灰色状态 vs 剪影图标 + 全局状态词汇 |
| [P-density-tempo](#p-density-tempo) | 密度跟着决策节奏走：实时要少，可暂停才能多；多了靠组织而不是删 | 局内 HUD · 动作与 Roguelite、角色扮演、策略与战术 等 | 信息密度、时间模型、HUD 组织方式 | 实时 + 高密度四散 vs 可暂停 + 整合底座 |
| [P-progressive-disclosure](#p-progressive-disclosure) | 渐进披露：第一层给结论，第二层给原因，最多两层 | 局内 HUD · 探索与冒险、角色扮演、策略与战术 等 | 详情呈现、选中信息面板：画法、显隐（逐元素） | 全部铺在第一层 vs 先看结论、按需展开 |
| [P-know-your-game-competition](#p-know-your-game-competition) | 先看游戏的「竞争度」 | 局内 HUD · 探索与冒险、射击、叙事与视觉小说 等 | HUD 显隐策略、默认放置方式、信息密度 | 读世界（叙事向）vs 读仪表（竞技向） |
| [P-contextual-hud](#p-contextual-hud) | 情境显现 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 显隐（逐元素）、HUD 显隐策略、入场动效 | 常驻 vs 情境显现（保留导航锚点） |
| [P-hudless-tax](#p-hudless-tax) | 无 HUD 要交「导航税」：信号物打底，再给一架按需加码的引导梯子 | 局内 HUD · 探索与冒险、横版平台、叙事与视觉小说 等 | 放置方式（逐元素）、HUD 显隐策略、世界挂点 | 零 HUD 无兜底 vs 零 HUD + 按需导航层 |
| [P-adaptive-layers](#p-adaptive-layers) | 分档与可调：新手档、作者档、老手档并存，沉浸程度交给玩家 | 局内 HUD · 探索与冒险、动作与 Roguelite、横版平台 等 | 显隐（逐元素）、世界渲染（逐元素）、HUD 显隐策略 | 新手档 vs 老手档 |
| [P-contextual-ping](#p-contextual-ping) | 情境标记：一键 ping，语义按目标自动推断，词汇控制在 3–5 个以内 | 局内 HUD · 射击、MOBA 与大逃杀、动作与 Roguelite 等 | 目标 / 路点：画法、世界挂点、放置方式（逐元素） | 队友打字说「B 点有人」vs 世界里的情境标记 + 边缘箭头 |
| [P-event-feed-tiers](#p-event-feed-tiers) | 事件流分级 | 局内 HUD · 射击、MOBA 与大逃杀、体育与体育经理 等 | 通知 / 大字提示：画法、屏幕锚点、入场动效 | 所有事件都弹在中间 vs 分级：一角信息流 + 顶部横幅 |
| [P-scoreboard-team-id](#p-scoreboard-team-id) | 计分板按住才出、队伍识别不靠颜色单独承担 | 局内 HUD · 射击、MOBA 与大逃杀、体育与体育经理 等 | 队伍 / 玩家条：画法、计时 / 分数 / 回合：画法、显隐（逐元素） | 红绿队色 + 常驻计分板 vs 橙蓝队色 + 按住才出 |

## 目录

- [一、总则](#一总则)
- [二、分领域原则](#二分领域原则)
  - 2.1 层级与一眼可读（5 条）：[P-priority-tiers](#p-priority-tiers)、[P-glance-encoding](#p-glance-encoding)、[P-focal-periphery](#p-focal-periphery)、[P-actionable-first](#p-actionable-first)、[P-squint-test](#p-squint-test)
  - 2.2 放置与世界关系（叙事性）（9 条）：[P-two-questions-per-element](#p-two-questions-per-element)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-device-bridge](#p-device-bridge)、[P-pause-world-state](#p-pause-world-state)、[P-meta-perception](#p-meta-perception)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-world-space-text](#p-world-space-text)、[P-vr-spatial-ui](#p-vr-spatial-ui)
  - 2.3 反馈、动效与演出（10 条）：[P-juice-budget](#p-juice-budget)、[P-hit-channel-split](#p-hit-channel-split)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-value-change-visible](#p-value-change-visible)、[P-shake-hitstop](#p-shake-hitstop)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-result-tally](#p-result-tally)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)
  - 2.4 导航、菜单与界面流程（16 条）：[P-menu-architecture](#p-menu-architecture)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-item-decision](#p-item-decision)、[P-map-conventions](#p-map-conventions)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-choice-framing](#p-choice-framing)、[P-journal-codex](#p-journal-codex)、[P-progression-graph](#p-progression-graph)、[P-settings-page](#p-settings-page)、[P-save-continuity](#p-save-continuity)、[P-teach-then-retire](#p-teach-then-retire)、[P-craft-recipe](#p-craft-recipe)、[P-build-placement](#p-build-placement)、[P-fail-retry](#p-fail-retry)、[P-frontend-loading](#p-frontend-loading)、[P-in-game-charts](#p-in-game-charts)
  - 2.5 输入方式与平台适配（12 条）：[P-glyph-follows-device](#p-glyph-follows-device)、[P-prompt-in-context](#p-prompt-in-context)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-touch-target-size](#p-touch-target-size)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-view-distance](#p-view-distance)、[P-aspect-anchor](#p-aspect-anchor)、[P-detail-without-hover](#p-detail-without-hover)、[P-input-parity](#p-input-parity)、[P-shared-screen](#p-shared-screen)、[P-confirm-by-input](#p-confirm-by-input)
  - 2.6 可读性与无障碍（10 条）：[P-text-size-floor](#p-text-size-floor)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-color-never-alone](#p-color-never-alone)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-subtitles-captions](#p-subtitles-captions)、[P-typography-legible-format](#p-typography-legible-format)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-motor-input-alternatives](#p-motor-input-alternatives)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-localization-ready](#p-localization-ready)
  - 2.7 UI 与美术方向（14 条）：[P-harmony-four-relations](#p-harmony-four-relations)、[P-channel-borrowing](#p-channel-borrowing)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-medium-constraints](#p-medium-constraints)、[P-palette-roles](#p-palette-roles)、[P-type-two-tier](#p-type-two-tier)、[P-title-lettering](#p-title-lettering)、[P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-medium-simulation](#p-medium-simulation)、[P-contrast-with-reason](#p-contrast-with-reason)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-icon-system](#p-icon-system)
  - 2.8 信息密度与无 HUD（6 条）：[P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-contextual-hud](#p-contextual-hud)、[P-hudless-tax](#p-hudless-tax)、[P-adaptive-layers](#p-adaptive-layers)
  - 2.9 多人与社交（3 条）：[P-contextual-ping](#p-contextual-ping)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-scoreboard-team-id](#p-scoreboard-team-id)
- [三、品类篇](#三品类篇)：探索与冒险、动作与 Roguelite、横版平台、射击、竞速与驾驶、角色扮演、叙事与视觉小说、策略与战术、建造与经营、工厂与自动化、生活与养成、沙盒与物理、生存与制作、恐怖与悬疑、解谜与侦探、卡牌与桌面、手机触屏（局内与非商业化界面）、格斗、音游、体育与体育经理、MOBA 与大逃杀、模拟驾驶与飞行、MMO
- [四、风格家族与原则](#四风格家族与原则)
- [五、证据与方法](#五证据与方法)
- [六、参数缺口与补卡单](#六参数缺口与补卡单)
- [七、参考文献](#七参考文献)

## 一、总则

这 12 条是从所有领域里反复出现的结论中提出来的；每条后面列出展开它的原则。

### C1 视觉权重 = 玩法权重：先给每个元素定级，再决定怎么强调

同屏 6–10 个元素一样大、一样亮时，玩家在最紧张的一刻找不到该看的那一个。被夸「清楚」的作品都先回答了「谁是主」：会让你死、输、错过机会的信息才配当主，每一刻不超过 1–3 个（工作记忆大约只能同时抓住 4 个组块）。强调手段本身与风格无关——Balatro（steam:2379780）用尺寸，Frostpunk（steam:323190）用压暗，Mini Metro（steam:287980）用留白孤立，横屏手游（gameui:6750）用拇指位置；CONTROL（steam:870780）把黄色只留给目标、菜单另用红色强调，说明强调色要按语义分工——但同一屏最多叠两种手段。装饰、发光、高饱和是稀缺资源，越到实时画面越要收。验收只有一个：眯眼（模糊）之后最显眼的三处必须是玩家、威胁、目标，而不是金色角花、放射光和连击大字。证据说明：这条原则来自文献（Riot 的清晰度准则、NN/g 视觉层级、Cowan 的工作记忆容量）与看图；评测里「HUD 太乱」一类去重并人工复核后只剩 9 条、每款 1 条，不足以按密度分组比较。

展开：[P-priority-tiers](#p-priority-tiers)、[P-squint-test](#p-squint-test)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-hit-channel-split](#p-hit-channel-split)、[P-icon-system](#p-icon-system)

### C2 一瞥预算：实时信息按「一瞥」设计，精读的放在视线附近

实时战斗里看 HUD 的时间按一瞥计（前注意加工约 200 毫秒），读一行字、比两个数在这种时刻等于没有。先写下玩家要回答的问题再选编码：「还能挨几下」用一格一格的分段（Hollow Knight steam:367520 的面具：初始 5 格，后期能涨到 9 格，格数一多就要分组），「还剩几发」用一个大号数字（Half-Life 2 steam:220），「快不快、危不危险」用表盘或整屏效果。要精读的东西放在视线附近或挂在目标上——对照实验里，枪身上的弹药数比角落 HUD 更快被利用；四角只负责报告「有变化」，用运动、颜色突变把变化推进余光。数值变化要看得见差值（真值立即落位，差值段拖尾追上）。

展开：[P-glance-encoding](#p-glance-encoding)、[P-focal-periphery](#p-focal-periphery)、[P-value-change-visible](#p-value-change-visible)、[P-damage-number-legibility](#p-damage-number-legibility)

### C3 密度跟着决策节奏走，多了靠组织而不是删

同样 30 个数字，回合制里是信息丰富，实时里是噪声。参考库里标了密度的卡，平均值从横版平台 0.31（n=16）、恐怖 0.38（n=16）到卡牌 2.21（n=33）、策略 1.88（n=26 / 59）；手游（13 / 39 张标了密度）和工厂（4 / 7）样本不足 10 张，不进总则。高密度既有人夸也有人骂，评测本身给不出方向：被夸 UI 的评测全库去重后只有 47 条（39 款），Civilization VI（steam:289070）2 条、Songs of Syx（steam:1162750，密度 4）1 条、Disco Elysium（steam:632470）1 条；同时 Songs of Syx 有 1 条明确说界面杂乱、Civilization VI 有 2 条说菜单难用。所以「密度要跟时间模型匹配」是从设计推理与文献（NN/g 渐进披露、Riot 清晰度）得出的，不是评测结论。库里「实时 + 高密度 + 四角分散」（密度 3–4、hudOrg=scattered）的卡只有 Factorio（steam:427520）、Terraria（steam:105600）、DRAGON QUEST BUILDERS 2（steam:1072420）、World Of Warcraft（iig:world-of-warcraft）几张，它们都靠固定位置、强惯例和可关闭的面板撑住。另一种错配有评测支撑：把复杂度推进菜单却没设计怎么展开——Valheim（steam:892970）局内密度为 0，背包抱怨却有 17 条（全库单款最多）、菜单难用 7 条。先定时间模型再定密度；密度 ≥ 3 时同时要有整合（底座、贴边整条）、渐进披露（第一层给结论、第二层给原因、最多两层）和 UI 缩放。

展开：[P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-menu-architecture](#p-menu-architecture)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-in-game-charts](#p-in-game-charts)

### C4 隐藏不等于删除：零 HUD 要交导航税

零 HUD / 叙事内是参考库最大的流派之一（标了 HUD 全隐的 35 张、标了叙事内的 37 张、密度极简 119 张），画面干净，但代价集中在「不知道去哪、该干什么、没有地图」。只比较标了显隐方式的卡：标「全隐」的 34 款（有评测数据）每千条评测 4.4 次引导抱怨（25 / 5,653），明确标了「情境显现 / 常驻」的 42 款为 2.8 次（30 / 10,825）；标「叙事内」的 36 款 5.1 次（39 / 7,711），明确标了「空间内 / 元」的 13 款 0.9 次（3 / 3,443）。方向一致，但各组只有几十款、关键词是粗筛，样本不足以下结论，只能当提示。单款最集中的是 Scorn（steam:698670）与 Kingdom Two Crowns（steam:701160）各 7 条引导抱怨、Clair Obscur（steam:1903340）13 条地图抱怨（全库单款最多）。所以去掉 HUD 之前先列出玩家每分钟要回答的问题，每一个都要有世界内或按需的答案；补救的顺序从便宜到昂贵是：情境显现（时间上的隐藏）→ 信号物与光 → 叙事化指引 → 感知模式与分级提示 → 按需罗盘与地图。无论多干净，都要留一个随时可回看的目标记录。

展开：[P-hudless-tax](#p-hudless-tax)、[P-contextual-hud](#p-contextual-hud)、[P-journal-codex](#p-journal-codex)、[P-map-conventions](#p-map-conventions)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-teach-then-retire](#p-teach-then-retire)

### C5 位置逐元素决定：四象限是给每条信息用的，不是整款游戏的风格开关

「屏幕叠加 / 空间内 / 叙事内 / 元 UI」本来是给每一条信息各自选位置的工具：角色看不看得见 × 它在不在三维空间里。对照实验的结论很清楚：弹药放在武器上最好，生命用屏幕数字最好，导航用空间路径线最好、罗盘最差，没有一个象限通吃。经验分配是：「在哪里」本身就是信息的（敌人、交互物、目标、范围）进空间；「我自己怎样」的精确值留屏幕；与手上动作绑定的读数（弹药、工具电量）放手持物（Half-Life: Alyx steam:546560）；元 UI 只让玩家「感到」身体状态。一旦进了世界，就要受光、雾、后处理影响，所以叙事内 / 空间内元素要做可读性兜底（自发光、固定大小、关键读数不跟随失真）；开菜单时世界停不停，也要让背后的画面自己说出来（Dead Space steam:1693980 的实时全息背包）。

展开：[P-two-questions-per-element](#p-two-questions-per-element)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-meta-perception](#p-meta-perception)、[P-pause-world-state](#p-pause-world-state)、[P-device-bridge](#p-device-bridge)、[P-world-space-text](#p-world-space-text)、[P-vr-spatial-ui](#p-vr-spatial-ui)

### C6 先预告、再结算：把玩家的心算交给界面

原始状态（血量、属性表）让玩家自己推演「接下来会怎样」；把推演结果直接画出来，就等于把最高优先级让给了「下一步」。这是策略、卡牌、魂类区别于其它品类的关键元素：Into the Breach（steam:590380）把攻击格与出手顺序画在地图上，Slay the Spire（iig:slay-the-spire）在敌人头顶给意图 + 数字，Sekiro（steam:814380 · 据已知描述）用「危」字预告不可防御的攻击，XCOM 2（steam:268500 · 据已知描述）用命中率与幽灵预览让确认按钮本身成为反馈。菜单里同理：装备页要当场给出 a → b 的差值，技能树选中节点时要高亮整条前置路径与总代价，选项要标出门槛与后果。预告越完整，命中时的反馈就越可以轻；预告与实际不一致，是最伤信任的错误。

展开：[P-actionable-first](#p-actionable-first)、[P-item-decision](#p-item-decision)、[P-progression-graph](#p-progression-graph)、[P-choice-framing](#p-choice-framing)、[P-build-placement](#p-build-placement)、[P-craft-recipe](#p-craft-recipe)

### C7 反馈强度是一笔预算：越高频越轻越短，只有最高一级能占画面中心

「打击感」不等于全局特效拉满。本地评测去重后按关键词「打击感」计数（关键词表见 JSON 的 reviewRecount.keywords），提到最多的是 God of War 17 条、Katana ZERO 15、Hades 12、Devil May Cry 5 10、Ori and the Will of the Wisps 10、STAR WARS Jedi: Survivor 8、Clair Obscur 8（全库 195 条 / 55 款，其中好评 168 条）；这些作品的 HUD 大多很少，分量靠动画、顿帧和音效。光敏 / 频闪 / 光污染一类去重后 70 条 / 40 款，最多的是 CONTROL 9、FINAL FANTASY XVI 5、Just Shapes & Beats 4、Nodebuster 4，都是高强度视觉作品。做法是先给事件分级（日常、有效命中、关键、里程碑），每级规定能用哪些通道、上限多少；世界层回答「打中了吗」，UI 层只回答「打了多少、打得怎样」；震屏要短、快速衰减，HUD 不跟着抖；通告分四级，越大越少、越大越短；转场长度与使用频率成反比——一局出现 50 次以上的界面，进入时长不超过 150 ms，稀有节点才给 0.8–2 秒的仪式，而且第二次起可跳过。反馈也不只有画面：每类事件配一种声音和一档震动，频率越高越轻越短。动效也是皮肤的一部分：缓动、时长、帧率、入场方式要跟着美术风格成套换。

展开：[P-juice-budget](#p-juice-budget)、[P-hit-channel-split](#p-hit-channel-split)、[P-shake-hitstop](#p-shake-hitstop)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-transition-frequency](#p-transition-frequency)、[P-result-tally](#p-result-tally)、[P-motion-personality](#p-motion-personality)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)、[P-fail-retry](#p-fail-retry)、[P-event-feed-tiers](#p-event-feed-tiers)

### C8 颜色永远不单独承载信息：每个语义、每个状态各占一个视觉通道

红绿色觉异常约占男性 8%，强光屏幕和护眼模式也会吞掉色差，而评测几乎不会暴露这类问题（「色盲 / 色弱」在约 7.5 万条评测里，去重后只有 6 条），只能靠设计时的冗余和模拟检查。每个语义色都配一个形状、图标、文字或位置：Mini Metro（steam:287980）用车站形状区分目的地，Portal 2（steam:620）的蓝 / 橙传送门在准星上分居左右两半；阵营默认橙蓝并拉开明度；稀有度至少「边框色 + 星级 / 框形」两种手段；锁定、冷却、完成、已选、焦点同屏出现时各占一个视觉通道——灰度锁、去饱和冷却、灰化完成三者同屏分不出，是本工具 R1 复测时踩过的坑。图标同理：一个语义一种画法，锁定 / 新 / 已装备的记号在所有界面上长得一样。验收：全色盲（灰度）模拟下游戏仍然能玩。

展开：[P-color-never-alone](#p-color-never-alone)、[P-item-decision](#p-item-decision)、[P-progression-graph](#p-progression-graph)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-icon-system](#p-icon-system)、[P-scoreboard-team-id](#p-scoreboard-team-id)

### C9 可读性底线是硬约束，风格建在底线之上

字号按视距定（PC ≥ 18px@1080p、电视 ≥ 26px@1080p、Steam Deck 在 1280×800 下最小 9px、建议 12px），并能放大到 200% 不丢内容；压在实时画面上的字按最不利的那一帧算对比（正文 ≥ 4.5:1）；正文用无衬线或衬线常规体、句子不全大写，风格交给标题字。这条底线由规范支撑（XAG 101、Steam Deck 兼容性要求），不由评测支撑：评测里明确抱怨文字字号的，去重、收紧口径并逐条复核后全库只有 10 条 / 8 款，只有 BioShock Infinite（steam:8870 · 据已知描述）的字幕达到 ≥ 2 条（3 条）；原来「看不清」一类的命中大多在说雾、暗场景和敌人动作，与文字无关。风格越重，越要把字分两层：标题承载身份，正文和数字承载可读，再给玩家一个「朴素字」开关；字幕是一套独立排版，默认开、比正文大、可加底。中日韩正文比拉丁文再大一档（约 +2px），版式给译文预留约 35% 的宽度余量。

展开：[P-view-distance](#p-view-distance)、[P-text-size-floor](#p-text-size-floor)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-typography-legible-format](#p-typography-legible-format)、[P-type-two-tier](#p-type-two-tier)、[P-subtitles-captions](#p-subtitles-captions)、[P-localization-ready](#p-localization-ready)

### C10 输入决定交互形态：每种输入都要走得完全程

同一款游戏会被键鼠、三家手柄、Steam Deck、触屏同时玩到。R3「手柄 / 键位」类去重后 20 款 25 条，≥ 2 条的只有 3 款：Assassin's Creed 2（steam:33230 · 据已知描述）3 条、Heavy Rain（steam:960910 · 据已知描述）3 条、FINAL FANTASY X/X-2 HD（steam:359870 · 据已知描述）2 条，三款都是移植作——样本太少，只能说明移植时容易出这类问题，不能当规律。提示字形跟着手里正在用的设备切换，改键后所有提示同步；手柄下屏幕上永远恰好一个焦点，至少用两种通道表现；只挂在悬停上的信息，在手柄和触屏下必须有常驻或可呼出的去处；PC 的一排 10 格热栏上了手柄，要改成轮盘或十字快捷格；触屏常用目标 ≥ 44pt（Apple HIG），主键明显大于次要键（「直径 1.5–2 倍」是经验值，库里截图量不出绝对尺寸），倍速、暂停、跳过这类次要键也不能小于触控下限；竖屏把「看」和「按」上下分开；不可逆操作给确认、可逆操作给撤销，长按与连打都要有替代。

展开：[P-glyph-follows-device](#p-glyph-follows-device)、[P-input-parity](#p-input-parity)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-detail-without-hover](#p-detail-without-hover)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-touch-target-size](#p-touch-target-size)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-confirm-by-input](#p-confirm-by-input)、[P-motor-input-alternatives](#p-motor-input-alternatives)、[P-contextual-ping](#p-contextual-ping)

### C11 先定 UI 与画面的关系，再按通道借风格、按停留时间分配浓度

不懂美术时最常见的做法是直接挑一个好看的皮肤，结果 UI 和画面像两款游戏拼在一起。更稳的顺序是：① 先选关系——同一媒介、统一调色、中性、刻意对比，是四种不同的产品决策；② 把美术方向拆成材质、线、色、字、饰、动六个通道，逐个决定借不借（Hollow Knight steam:367520 菜单借线、地图借纸，Black Myth: Wukong steam:2358720 借字与母题，SUMMERHOUSE steam:2533960 主要借色（卡上标 rel.harmony=unified），Darkest Dungeon steam:262060 全借）；③ 按停留时间分配浓度——实时 HUD 只借最便宜的色、字、线，停下来看的菜单、标题、图鉴才上材质与装饰（GameUI 只取非商业化界面各抽 100 张：带材质标签的战斗界面 1 张、菜单 22 张、建造 / 家园 9 张、登录 6 张；站方标签稀疏且约 18% 是误标，只看相对趋势）；④ 再问界面在模仿什么载体（操作系统、镜头、转播、印刷品、桌游配件）。风格家族以 17 号文档（`17-ui-style-atlas.md`）的 93 个家族为准，每条原则的 styleVariants 给出它在 2–3 个家族里的典型做法。同一套信息配四种关系、几种借法并排比较，是探索 UI 风格最快的办法。

展开：[P-harmony-four-relations](#p-harmony-four-relations)、[P-channel-borrowing](#p-channel-borrowing)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-medium-constraints](#p-medium-constraints)、[P-medium-simulation](#p-medium-simulation)、[P-contrast-with-reason](#p-contrast-with-reason)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-frontend-loading](#p-frontend-loading)、[P-icon-system](#p-icon-system)

### C12 默认值给作者意图，选项给每个玩家：分档、逐项、可预览、可发现

研究的结论是：透明（融入式）UI 不必然提升投入感，叠加式界面因为信息清楚常常更受欢迎（Llanos & Jørgensen 2011 摘要）；去掉 HUD 对老手的投入感有提升、对新手不明显（Iacovides 等 2015）。Kingdom Two Crowns（steam:701160）的评测里有 3 条夸 UI 简洁、7 条说不知道该干什么——同一个设计服务了两类人，却只给了一个档位。所以默认档等于作者意图，另给「更多信息」与「更少信息」两档；每个元素可单独显隐；整屏效果、震屏、闪白、速度线逐项有强度滑条，并读取系统的减少动效设置；无障碍按视觉 / 听觉 / 操作 / 动效成套预设、首启就能到达、在真实画面上预览；教学提示在玩家成功一次后退场，并能从暂停菜单回看。The Last of Us Part II（steam:2531310 · 据已知描述）与 God of War Ragnarök（steam:2322010 · 据已知描述）是选项组织的现成样板。

展开：[P-adaptive-layers](#p-adaptive-layers)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-settings-page](#p-settings-page)、[P-teach-then-retire](#p-teach-then-retire)

## 二、分领域原则

### 2.1 层级与一眼可读

回答「先看哪个」：给每个元素定主 / 次 / 背景，再选强调手段；实时信息按一瞥编码；精读的东西放在视线附近，四角只报「有变化」；最高优先级让给「下一步会怎样」。验收方式是眯眼检查与 0.5 秒遮挡测试。

#### P-priority-tiers

**先分级再上色：每一刻只允许 1–3 个「主」信息**

> 适用品类：动作与 Roguelite、射击、竞速与驾驶、策略与战术、卡牌与桌面、手机触屏（局内与非商业化界面）、MOBA 与大逃杀、模拟驾驶与飞行 · 相关：[P-squint-test](#p-squint-test)、[P-glance-encoding](#p-glance-encoding)、[P-dwell-time-budget](#p-dwell-time-budget) · 风格变体：`fam.candy`、`fam.dark-hairline`、`fam.swiss`

**要解决的问题**

局内 HUD 常有 6–10 个元素同时在场。如果它们一样大、一样亮、一样鲜艳，玩家在最紧张的时候找不到「现在该看的那一个」，设计者也说不清谁该放大、谁该退后。参数体系把这件事拆成两步：先给每个元素定信息优先级（elx.priority：主 / 次 / 背景），再给「主」选强调配方（hier.emphasis），强调只作用在「主」上。参考库里同样的「分级」可以用完全不同的手段实现：Balatro 用尺寸，Frostpunk 用压暗，Mini Metro 用留白，CONTROL 把黄色只留给目标（菜单另用红色强调），手游横屏 ARPG 用拇指位置。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 尺寸主导：主元素放大到 1.4 倍以上 | <abbr title="hier.emphasis=size">强调配方 = 尺寸</abbr>；<abbr title="el.timer.priority=primary">计时 / 分数 / 回合 · 信息优先级 = 主</abbr>；<abbr title="el.timer.scale=1.8">计时 / 分数 / 回合 · 大小 / 突出度 = 1.8</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="el.resources.priority=ambient">资源 / 货币 · 信息优先级 = 背景</abbr>；<abbr title="el.resources.scale=0.8">资源 / 货币 · 大小 / 突出度 = 0.8</abbr> | 有一个数字直接决定胜负或节奏：名次、分数 × 倍率、风格评级、判定字、生命数字。 | 大号元素会长期占住画面；同屏只能有一个「最大」，第二个大字会让两者都失效。 | Balatro（steam:2379780）、Garfield Kart - Furious Racing（steam:1085510）、MUSYNX（steam:952040）、Half-Life 2（steam:220）、Devil May Cry 5（steam:601150 · 据已知描述） |
| 明暗主导：其余压暗、暗幕聚光 | <abbr title="hier.emphasis=value">强调配方 = 明暗对比</abbr>；<abbr title="hier.dimInactive=0.4">非焦点压暗 = 0.4</abbr>；<abbr title="rel.dim=0.6">压暗强度 = 0.6</abbr>；<abbr title="rel.behind=frozen">背后画面来源 = 冻结</abbr> | 事件抉择、关键宣告、对话、暂停时的决策——玩家此刻只该处理一件事。 | 被压暗的周边信息暂时读不到，只适合非实时或已暂停的时刻；实时战斗里压暗等于遮挡。 | Frostpunk（steam:323190）、Darkest Dungeon II（steam:1940340）、Inscryption（steam:1092790） |
| 唯一强调色：中性骨架，只给主信息上色 | <abbr title="col.strategy=neutralAccent">骨架色彩策略 = 中性 + 一两个强调色</abbr>；<abbr title="hier.emphasis=color">强调配方 = 颜色</abbr>；<abbr title="col.saturation=0.75">UI 饱和度 = 0.75</abbr> | 写实或暗调画面里，要让一个类别（目标、危险、可攀爬路线）在任何背景上跳出来。 | 强调色一旦被装饰、特效或稀有度色挪用就失效；色盲玩家需要形状或位置的第二通道。 | Just Shapes & Beats（steam:531510）、Mirror's Edge（steam:17410）、Portal 2（steam:620）、CONTROL（steam:870780） |
| 位置主导：越重要越靠近视线 / 拇指 | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.touchCluster=arc">触屏按钮布局 = 大键 + 弧形环绕</abbr>；<abbr title="el.cta.form=round">主行动按钮：画法 = 大圆钮</abbr>；<abbr title="el.cta.priority=primary">主行动按钮 · 信息优先级 = 主</abbr>；<abbr title="el.cta.scale=1.6">主行动按钮 · 大小 / 突出度 = 1.6</abbr>；<abbr title="el.abilities.scale=0.9">技能 / 冷却 / 弹药 / 手牌 · 大小 / 突出度 = 0.9</abbr> | 触屏与手柄：操作的重要性 = 触达频率，主攻击键最大、最靠拇指，技能沿弧排开，系统入口缩到边角。 | 横屏双拇指区有限，大键挤占技能位；入口一多就退化成「图标墙」。 | 暖雪-手游（gameui:6750）、天涯明月刀（gameui:12771）、三界天骄（gameui:6729）、The Battle of Polytopia（steam:874390） |
| 留白孤立：靠空出来的周围突出主体 | <abbr title="hier.emphasis=isolation">强调配方 = 留白孤立</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr> | 元素本来就少、节奏慢的策略 / 解谜 / 放置：一个时钟、一排线路库存就够。 | 只在元素很少时成立；一旦加功能，留白最先被吃掉。 | Mini Metro（steam:287980）、Dorfromantik（steam:1455840）、ISLANDERS（steam:1046030） |

**经验法则**

- 每一刻的「主」信息 ≤ 3 个；工作记忆大约只能同时抓住 4 个组块，超过就要分层或分时出现。
- 先给每个元素填 elx.priority，再选强调配方；强调手段最多叠两种（尺寸 + 明暗，或颜色 + 孤立）。
- 「主」由玩法权重决定：会让你死、输、错过机会的信息才配当主，好看的不算。
- 次级信息用固定位置弥补不显眼（永远在同一角）；背景信息可以小到只有专门找它时才看得到。
- 验收：开 chk.squint，模糊后最显眼的三处应该正好是标为「主」的元素。

**反例与玩家评价**

- 平级堆砌：所有元素同尺寸、同亮度、同饱和度，界面像调试面板；或者塔防 / 动作里商店、波次、技能都用同样的分量摊在四周。 例：Your Only Move Is HUSTLE（steam:2212330）、Songs of Syx（steam:1162750）、Stellaris（steam:281990）。
  - 评价与证据（依据：截图）：看图：Your Only Move Is HUSTLE 把整排键位说明与预测开关平铺在屏上，评测里有 3 条说不知道该怎么玩。R3「HUD 太乱」一类去重并人工复核后，真正在说界面 / HUD 杂乱的只有 9 条、每款 1 条（Songs of Syx、Stellaris、Kingdom Two Crowns、Planet Zoo 等），没有一款达到「≥ 2 条」门槛；原来列在这里的 Bloons TD 6、Hades II 的命中说的是满屏气球与爆炸（多为好评）或场景杂乱，已移除。按密度分组的比较也因此不成立。
- 强调通胀：两个以上的东西同时用最大号 + 发光 + 闪烁（大招特效、总伤害大字、头像就绪光），互相抵消，真正的生命 / 威胁信息反而沉底。 例：神州风闻录（gameui:6853）、奇缘之旅（gameui:6904）。
  - 评价与证据（依据：截图）：GameUI 手游没有 Steam 评测数据；看 mobile/sheet-land-02 的截图：奇缘之旅、神州风闻录在自动战斗中大招特效覆盖画面中心近一半，HUD 只剩边角小图标。（战神之决战西伯利亚 gameui:7312 原来也列在这里，复看 sheet-port-01 第 6 格：画面干净、伤害数字小、倍速键在右下，不属于此类，已移除。）

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通里「主」靠尺寸和描边厚度：主元素大一号、粗描边，次级缩成小圆钮。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线里「主」靠明度：只有主元素用骨白字与亮条，其余压到暖灰。
- 瑞士几何 / 极简表格（`fam.swiss`，皮肤 `skin.swiss`）：瑞士几何里「主」靠网格位置与字号阶梯：主信息占大号无衬线，次级退到细字表格。
- 17 号图谱反查到的相关家族：`fam.anime-card`、`fam.swiss`、`fam.editorial`、`fam.mecha-warning`

**出处**

- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：画面上吸引注意力的程度要与玩法重要性相称；特效噪声会叠加，团战里最容易失控。
- [Nielsen Norman Group, Visual Hierarchy in UX: Definition](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)（S152）：层级靠尺寸、颜色 / 对比、位置、留白等手段建立，并用眯眼 / 模糊检查是否符合本意。
- [Cowan, The magical number 4 in short-term memory (BBS, 2001)](https://pubmed.ncbi.nlm.nih.gov/11515286/)（S173）：短时记忆的纯容量约为 3–5 个组块，平均约 4 个；可作为同时要盯住的主信息上限。
- [Healey, Perception in Visualization（前注意特征）](https://www.csc2.ncsu.edu/faculty/healey/PP/index.html)（S174）：单一独特特征（色相、尺寸、方向等）能「跳出」；多个特征组合定义的目标往往无法一眼找到——强调手段要单纯。
- [本项目 06 品类镜头与可读性 §0.5（Into the Breach 清晰优先）](06-genre-camera-ui.md)（S184）：视觉权重 = 玩法权重；开发者表示会为了清晰放弃很酷的点子。

**可演示的对比**

- **六块一样重 vs 只有血条与 Boss 条是「主」**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 信息优先级：次 → 主；敌人血条 / 预警 / 意图 · 信息优先级：次 → 主；强调配方：无 → 尺寸 + 明暗对比；非焦点压暗：0 → 0.35
  - 配套改动：小地图 / 罗盘 · 信息优先级：次 → 背景；资源 / 货币 · 信息优先级：次 → 背景；生命 / 护盾 / 体力 · 大小 / 突出度：1 → 1.4；敌人血条 / 预警 / 意图 · 大小 / 突出度：1 → 1.4；小地图 / 罗盘 · 大小 / 突出度：1 → 0.8；资源 / 货币 · 大小 / 突出度：1 → 0.8
  - 看什么：打开眯眼检查对比两边：A 的六块一样大一样亮，模糊后分不出先后；B 只有血条和 Boss 条跳出来，小地图和资源退成背景。信息一个没少，变的只是「先看哪个」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-priority-tiers#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.density=2` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.resources+el.threat` `el.threat.form=bossBar` `chk.squint=true` `el.abilities.priority=secondary` `el.objective.priority=secondary`
  - A：`hier.emphasis=[]` `hier.dimInactive=0` `el.vitals.priority=secondary` `el.threat.priority=secondary` `el.minimap.priority=secondary` `el.resources.priority=secondary` `el.vitals.scale=1` `el.threat.scale=1` `el.minimap.scale=1` `el.resources.scale=1`
  - B：`hier.emphasis=size+value` `hier.dimInactive=0.35` `el.vitals.priority=primary` `el.threat.priority=primary` `el.minimap.priority=ambient` `el.resources.priority=ambient` `el.vitals.scale=1.4` `el.threat.scale=1.4` `el.minimap.scale=0.8` `el.resources.scale=0.8`

  </details>
- **单变量版：六块一样重 → 只切换 el.vitals.priority、el.threat.priority、hier.emphasis、hier.dimInactive**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 信息优先级：次 → 主；敌人血条 / 预警 / 意图 · 信息优先级：次 → 主；强调配方：无 → 尺寸 + 明暗对比；非焦点压暗：0 → 0.35
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-priority-tiers#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.density=2` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.resources+el.threat` `el.threat.form=bossBar` `chk.squint=true` `el.abilities.priority=secondary` `el.objective.priority=secondary` `el.minimap.priority=secondary` `el.resources.priority=secondary` `el.vitals.scale=1` `el.threat.scale=1` `el.minimap.scale=1` `el.resources.scale=1`
  - A：`el.vitals.priority=secondary` `el.threat.priority=secondary` `hier.emphasis=[]` `hier.dimInactive=0`
  - B：`el.vitals.priority=primary` `el.threat.priority=primary` `hier.emphasis=size+value` `hier.dimInactive=0.35`

  </details>

#### P-glance-encoding

**一眼可读：用形状、计数、位置传状态，别让玩家读字算数**

> 适用品类：动作与 Roguelite、横版平台、射击、竞速与驾驶、生存与制作、手机触屏（局内与非商业化界面）、格斗、音游、体育与体育经理、MOBA 与大逃杀 · 相关：[P-focal-periphery](#p-focal-periphery)、[P-value-change-visible](#p-value-change-visible)、[P-view-distance](#p-view-distance) · 风格变体：`fam.candy`、`fam.dark-hairline`、`fam.zero-hud`

**要解决的问题**

实时战斗里玩家看 HUD 的时间按「一瞥」计：前注意加工在约 200 毫秒内完成，汽车界面规范把单次视线离开路面限制在 2 秒以内。需要读一行字、比两个数字的信息，在这种时刻等于没有。这件事在评测里很少被直接说出来（字号类抱怨收紧口径后全库只有 10 条），只能靠设计时的一瞥测试发现。编码方式（cmp.gauge、elx.valueLabel、cnt.textLength）决定了一个状态能不能在一瞥里被读出。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 纯图形条：只看长短，不标数字 | <abbr title="cmp.gauge@el.vitals=thinBar">数值图形（生命 / 护盾 / 体力） = 细条</abbr>；<abbr title="el.vitals.valueLabel=none">生命 / 护盾 / 体力 · 数值标注 = 不标</abbr>；<abbr title="el.vitals.count=3">生命 / 护盾 / 体力：条数 = 3</abbr>；<abbr title="mo.valueChange=trail">数值变化 = 延迟拖尾</abbr>（渲染说明：mo.valueChange@el.vitals 改写为全局 mo.valueChange（渲染器只读全局值）） | 玩家只需要判断「多 / 少 / 快没了」，精确值不影响下一步操作（魂系血 / 蓝 / 耐力）。 | 无法精算；条太细时在亮场景（雪地、强光）里会被吞掉，需要深色底或描边。 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）、CONTROL（steam:870780）、Lies of P（steam:1627720 · 据已知描述） |
| 可数的分段 / 图标：少量格子一眼数清（多了要分组） | <abbr title="cmp.gauge@el.vitals=segmented">数值图形（生命 / 护盾 / 体力） = 分段格</abbr>；<abbr title="el.vitals.valueLabel=none">生命 / 护盾 / 体力 · 数值标注 = 不标</abbr>；<abbr title="el.vitals.scale=1.2">生命 / 护盾 / 体力 · 大小 / 突出度 = 1.2</abbr> | 伤害按「格」结算，玩家要回答「还能挨几下」：心形、面具、血格（Hollow Knight 初始 5 个面具、后期最多 9 个，格数多了就要分组）。 | 数值范围大时格子爆炸（几十颗心就失去一眼可数）；需要每 5 格分组或换成条。 | Hollow Knight（steam:367520）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Hyper Light Drifter（steam:257850）、Overwatch（iig:overwatch）、The Last of Us Part I（steam:1888930 · 据已知描述） |
| 一个大号关键数字 | <abbr title="cmp.gauge@el.vitals=number">数值图形（生命 / 护盾 / 体力） = 纯数字</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="el.abilities.form=ammo">技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字</abbr>；<abbr title="el.abilities.valueLabel=current">技能 / 冷却 / 弹药 / 手牌 · 数值标注 = 当前值</abbr> | 精确值确实影响决策：弹药、名次、速度、分数 × 倍率。 | 数字必须被「读」，字号和对比要过线（XAG 101：主机 1080p 正文 ≥ 26 px、PC ≥ 18 px）；同屏数字一多就退化成表格。 | Half-Life 2（steam:220）、Zeepkist（steam:1440670）、Balatro（steam:2379780）、Garfield Kart - Furious Racing（steam:1085510）、Team Fortress 2（steam:440 · 据已知描述） |
| 表盘 / 指针：读角度和区间，不读数 | <abbr title="cmp.gauge@el.speed=dial">数值图形（速度 / 名次） = 表盘指针</abbr>；<abbr title="el.speed.screenAnchor=br">速度 / 名次 · 屏幕锚点 = 右下</abbr>；<abbr title="st.alert=redTint">警示表达 = 红色调</abbr> | 连续变化、关心趋势与危险区间的量：转速、速度、温度。 | 占面积大；需要精确值时仍要在表盘里附数字。 | NIGHT-RUNNERS PROLOGUE（steam:2707900）、Crashday Redline Edition（steam:508980）、Slackers - Carts of Glory（steam:2354000）、Need For Speed Heat（iig:need-for-speed-heat）、Frostpunk（steam:323190） |
| 整屏状态：不看 HUD 也能感到 | <abbr title="rel.metaFx=lowHpDesat+hurtVignette+speedLines">元 UI 屏幕效果 = 低血去饱和 + 受击红边 + 整屏速度线</abbr> | 只需要粗粒度的状态（濒死、受击、超速），而且要在玩家盯着别处时也传到。 | 粒度粗，和画面特效抢通道；要配「减少动效」开关，闪烁类注意光敏。 | Hellblade: Senua's Sacrifice（steam:414340）、Rise of the Tomb Raider（steam:391220 · 据已知描述）、Redout: Enhanced Edition（steam:517710 · 据已知描述） |

**经验法则**

- 先写下玩家要回答的问题，再选编码：「还能挨几下」→ 分段；「还剩几发」→ 数字；「快不快 / 危不危险」→ 表盘或整屏效果。
- 实时战斗中关键状态不靠文字：cnt.textLength 在局内 HUD 默认 ≤ 仅标题。
- 分段 ≤ 5 格可一眼数清，再多就每 5 格一组或改成条。
- 必须读的数字用大号展示数字 / 等宽数字，最小字号按设备派生（D-device），并做视距预览（chk.viewDistance）。
- 做 0.5 秒遮挡测试：截图只给看 0.5 秒，能答出主问题才算通过。

**反例与玩家评价**

- 战斗中用小字或句子传递关键状态，或把正文字号按 PC 标准用在电视 / 掌机上。 例：BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：评测里明确说文字太小的，去重并收紧口径（「看不清」必须和字 / 文字 / 字幕 / 字体同时出现）并逐条复核后全库只有 10 条 / 8 款：BioShock Infinite 3 条（都在说字幕），Civilization VI、METAL GEAR SOLID V（4K 下）、Disco Elysium（好评里提醒调大字号）、Absolute Drift、ASTRONEER、Dyson Sphere Program、鬼谷八荒（卷轴面板里的小字）各 1 条。原来列在这里的 Valheim、God of War Ragnarök、Sekiro、Dishonored 2、Forza Horizon 5、Mirror's Edge，复核后命中的是雾、暗场景、敌人招式看不清，不是文字，已移除。字号底线只靠 XAG 101 与 Steam Deck 规范支撑，评测证据不足。
- 什么都标「当前 / 上限」：血、蓝、经验、负重全带小号分数，玩家要读完一排数字才知道哪个要紧。 例：Your Only Move Is HUSTLE（steam:2212330）、Mr.Mine（steam:1397920）。
  - 评价与证据（依据：推断）：没有直接对应的评测分类；Your Only Move Is HUSTLE 有 3 条「不知道怎么玩」类评测，只作旁证。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通用心形 / 星形计数，每格一个图标，一眼数清。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线用分段细条加小端头，条下深色衬底保证雪地也读得出。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD 把状态交给画面：暗角、去色、角色动作就是读数。
- 17 号图谱反查到的相关家族：`fam.candy`、`fam.slant`、`fam.scifi`、`fam.military`、`fam.thin-geo`、`fam.industrial-scifi`、`fam.vector-display`、`fam.pixel`、`fam.boomer-bar`、`fam.flat-map`、`fam.steampunk-brass`

**出处**

- [Healey, Perception in Visualization（前注意特征）](https://www.csc2.ncsu.edu/faculty/healey/PP/index.html)（S174）：能在约 200 毫秒内、不依赖逐个扫视完成的判断属于前注意加工；可一眼读出的 HUD 编码应落在这些特征上。
- [NHTSA, Visual-Manual Driver Distraction Guidelines（2012 年提案说明，2013 年发布第一阶段）](https://www.nhtsa.gov/sites/nhtsa.gov/files/strickland-distraction_guidelines_03122012.pdf)（S149）：车载界面任务的单次视线离开不应超过 2 秒、总计不超过 12 秒——高压实时情境下的「一瞥预算」参考。
- [Evaluating the Effectiveness of HUDs and Diegetic Ammo Displays in First-person Shooter Games](https://www.yorku.ca/mack/ieee_gem2015.html)（S008）：五种弹药显示里，枪上的数字表现最好（换弹更快、空膛后多开的枪更少），HUD 上的子弹图标最差；大多数受试者偏好它。
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：默认最小字号：主机 1080p 26 px、PC 1080p 18 px；HUD 计量、目标文字都在范围内，并应支持放大到 200%。

**可演示的对比**

- **读三行当前 / 上限 vs 数格子 + 一个大数字**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：横条 → 分段格；生命 / 护盾 / 体力 · 数值标注：当前 / 上限 → 不标；数字字体：自动 → 大号展示数字；文案量：短段（2–3 句） → 仅标题
  - 配套改动：生命 / 护盾 / 体力：条数：3 → 1；生命 / 护盾 / 体力 · 数值标注位置：条尾 → 条内；技能 / 冷却 / 弹药 / 手牌 · 数值标注：当前 / 上限 → 当前值；目标 / 路点：画法：任务清单 → 标记图标；基准字号：12 → 16；生命 / 护盾 / 体力 · 大小 / 突出度：1 → 1.3
  - 看什么：把两边各看半秒再遮住：A 要读三行「当前 / 上限」小字和一列清单；B 只要数格子、看一个大数字、看一个路点。信息量差不多，读取时间差一个数量级。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-glance-encoding#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.objective` `el.abilities.form=ammo`
  - A：`el.vitals.count=3` `cmp.gauge@el.vitals=bar` `el.vitals.valueLabel=currentMax` `el.vitals.valueLabelPos=end` `el.abilities.valueLabel=currentMax` `el.objective.form=checklist` `cnt.textLength=short` `typ.baseSize=12` `el.vitals.scale=1` `typ.numerals.family=auto`
  - B：`el.vitals.count=1` `cmp.gauge@el.vitals=segmented` `el.vitals.valueLabel=none` `el.vitals.scale=1.3` `el.abilities.valueLabel=current` `typ.numerals.family=display` `el.objective.form=marker` `cnt.textLength=title` `typ.baseSize=16` `el.vitals.valueLabelPos=inside`

  </details>
- **单变量版：读三行当前 / 上限 → 只切换 cmp.gauge@el.vitals、el.vitals.valueLabel、typ.numerals.family、cnt.textLength**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：横条 → 分段格；生命 / 护盾 / 体力 · 数值标注：当前 / 上限 → 不标；数字字体：自动 → 大号展示数字；文案量：短段（2–3 句） → 仅标题
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-glance-encoding#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.objective` `el.abilities.form=ammo` `el.vitals.count=3` `el.vitals.valueLabelPos=end` `el.abilities.valueLabel=currentMax` `el.objective.form=checklist` `typ.baseSize=12` `el.vitals.scale=1`
  - A：`cmp.gauge@el.vitals=bar` `el.vitals.valueLabel=currentMax` `typ.numerals.family=auto` `cnt.textLength=short`
  - B：`cmp.gauge@el.vitals=segmented` `el.vitals.valueLabel=none` `typ.numerals.family=display` `cnt.textLength=title`

  </details>

#### P-focal-periphery

**焦点与余光：要精读的放在视线附近，四角只负责「有变化」**

> 适用品类：探索与冒险、动作与 Roguelite、射击、竞速与驾驶、恐怖与悬疑、音游 · 相关：[P-two-questions-per-element](#p-two-questions-per-element)、[P-meta-perception](#p-meta-perception)、[P-aspect-anchor](#p-aspect-anchor) · 风格变体：`fam.typographic-hud`、`fam.scifi`、`fam.contextual-hud`

**要解决的问题**

玩家的视线大部分时间停在屏幕中央、角色或准星附近（FPS 眼动研究），四角元素只能靠余光；而余光分辨细节很差、对运动和大面积颜色变化很敏感。把需要精读的数字放在角落，玩家要么不看，要么把视线从战斗里拉走。参数上这是三件事：放在哪（elx.screenAnchor）、挂在谁身上（elx.attachTo + elx.diegesis）、要不要用整屏效果报信（rel.metaFx / elx.metaFx）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 四角分散，中心净空 | <abbr title="lay.hudOrg=scattered">HUD 组织方式 = 分散组件</abbr>；<abbr title="el.vitals.screenAnchor=tl">生命 / 护盾 / 体力 · 屏幕锚点 = 左上</abbr>；<abbr title="el.minimap.screenAnchor=tr">小地图 / 罗盘 · 屏幕锚点 = 右上</abbr>；<abbr title="el.abilities.screenAnchor=br">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下</abbr>；<abbr title="lay.safeMargin=3">安全边距 = 3</abbr> | 低频查看的次级信息（小地图、资源、任务），以及大多数第三人称 / 俯视动作游戏的默认布局。 | 靠位置记忆，新手第一次找不到；超宽屏下角落离视线更远，需要收进 16:9 区域（D-aspect）。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Call of Duty 4: Modern Warfare (2007)（steam:7940）、Dead Cells（steam:588650）、Hades（steam:1145360） |
| 挂在焦点上：头顶、目标、手持物（空间内 / 叙事内） | <abbr title="el.threat.form=healthBar">敌人血条 / 预警 / 意图：画法 = 敌人血条</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.worldRender=billboard">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 平面公告板</abbr>；<abbr title="el.abilities.attachTo=held">技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.abilities.diegesis=diegetic">技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内</abbr> | 信息与某个世界对象强绑定：敌人血量、弹药、可交互物、对话选项、对手分数。 | 跟着镜头被遮挡或出屏，需要屏外回退（边缘箭头）；目标一多，头顶条互相叠压。 | Dead Space（steam:1693980）、Half-Life: Alyx（steam:546560）、Tricky Towers（steam:437920）、Beat Saber（steam:620980）、OXENFREE（steam:388880） 等 7 款 |
| 边缘方向提示：屏外信息从屏幕边进入余光 | <abbr title="el.threat.form=edgeDir">敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示</abbr>；<abbr title="el.objective.form=marker+edgeArrow">目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头</abbr> | 威胁或目标在镜头外，但玩家需要知道「从哪边来」。 | 箭头多了会在屏幕四周形成一圈噪声；要按威胁等级只显示最近 / 最危险的几个。 | God of War（steam:1593500 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 整屏元 UI：用余光最敏感的通道报警 | <abbr title="rel.metaFx=hurtVignette">元 UI 屏幕效果 = 受击红边</abbr>；<abbr title="el.vitals.metaFx=lowHpDesat">生命 / 护盾 / 体力 · 元 UI 效果（逐元素） = 低血去饱和</abbr> | 必须打断注意力的少数状态：濒死、受击方向、超速、被发现。 | 粒度粗、容易疲劳；和特效、调色抢通道；需要减少动效与色盲选项。 | Hellblade: Senua's Sacrifice（steam:414340）、Rise of the Tomb Raider（steam:391220 · 据已知描述）、Redout: Enhanced Edition（steam:517710 · 据已知描述） |
| 外围通知：用运动唤起，再退回可回看的位置 | <abbr title="el.notify.form=toast">通知 / 大字提示：画法 = 圆角提示卡</abbr>；<abbr title="el.notify.screenAnchor=tr">通知 / 大字提示 · 屏幕锚点 = 右上</abbr>；<abbr title="mo.enter=slide">入场动效 = 滑入 / 推移</abbr>；<abbr title="ix.dismiss=timed">本屏怎么结束 = 自动消失</abbr> | 需要被注意到、但不必立刻处理的事件（拾取、任务更新、奇观完成）。 | 战斗中很容易错过，必须同时进入可回看的日志；同时弹太多会排队拖延。 | Red Dead Redemption（steam:2668510）、Tooth and Tail（steam:286000）、Sid Meier’s Civilization® VI（steam:289070） |

**经验法则**

- 按「查看频率 × 紧急度」分区：高频高急 → 挂在角色 / 准星 / 目标附近；低频 → 四角；低频但紧急 → 用整屏效果或边缘提示推进余光。
- 放在余光里的元素要用运动、颜色突变、尺寸跳变报信，而不是只改一个数字。
- 屏幕中间约三分之一默认不放常驻面板；字幕、提示、交互气泡用完立刻退场。
- 挂在世界里的元素必须有出屏回退（edgeArrow / edgeDir）和遮挡回退（描边或穿墙显示）。
- 超宽屏把四角收进 16:9；电视按 5% 安全边（D-device），别让角落元素跑出视线。

**反例与玩家评价**

- 中心区被长期占用：字幕、教学提示、交互气泡或空间内控件停留在画面中部，挡住要看的世界。 例：CONTROL（steam:870780）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）。
  - 评价与证据（依据：截图）：看图：CONTROL 的巨型标题与目标提示直接压在画面中部。评测证据不足：原来引用的「HUD 太乱」命中，人工复核后 CONTROL 的 4 条说的是渲染故障弹窗、整体视觉杂乱与红光，Ghost of Tsushima 的 4 条里有 2 条恰恰在夸 UI 不杂乱，Tiny Glade 的 5 条说的是场景摆件（clutter 道具），都不是 HUD 挡视野——Tiny Glade 已从例子里移除（它只有底部一排小工具）。空间内组与全库的比较也因此不成立。
- 关键状态只在角落悄悄改一个数字，没有运动、颜色或整屏提示，玩家在战斗中察觉不到。
  - 评价与证据（依据：文献）：评测分类里没有「没注意到状态变化」这一类，本库暂无直接证据；这是从眼动与余光研究（见来源）推出的风险，建议用 chk.squint + 0.5 秒遮挡测试验证。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 细字直压 · 排印叠层（`fam.typographic-hud`，皮肤 `skin.mono`）：排印叠层把要精读的字压在视线中心附近，四角只留极小的细字。
- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD 用准星周围的弧形读数承载精读信息，四角只放闪烁的变化提示。
- 情境渐显 · 角落小件（`fam.contextual-hud`，皮肤 `skin.mono`）：情境渐显：角落小件平时隐身，变化时用运动淡入余光。

**出处**

- [Kenny, Koesling, Delaney, McLoone, Ward, A Preliminary Investigation into Eye Gaze Data in a First Person Shooter Game (ECMS 2005)](https://mural.maynoothuniversity.ie/id/eprint/282/)（S176）：在自制 FPS 里记录眼动，发现玩家大部分注视都落在屏幕中央附近——四角的 HUD 只是偶尔被扫到。
- [Rosenholtz, Capabilities and Limitations of Peripheral Vision (Annual Review of Vision Science, 2016)](https://doi.org/10.1146/annurev-vision-082114-035733)（S181）：余光的编码丢失大量细节，能做粗分类和「大意」判断，但不擅长读细节——角落放精读信息不划算。
- [Weiser & Brown, Designing Calm Technology (1995)](https://calmtech.com/papers/designing-calm-technology)（S182）：好的信息设计让内容在注意力中心与外围之间移动：外围让人同时感知很多事，需要时再拉到中心处理。
- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：按「是否属于虚构世界」和「是否在 3D 空间里」把界面分为叙事内、非叙事、空间内、元四类；挂在焦点上的做法多属空间内或叙事内。
- [Evaluating the Effectiveness of HUDs and Diegetic Ammo Displays in First-person Shooter Games](https://www.yorku.ca/mack/ieee_gem2015.html)（S008）：把弹药数字放在枪上（视线焦点附近）比放在 HUD 角落更快被利用。

**可演示的对比**

- **信息分在四角 vs 挂在枪上、敌人头顶、屏幕边缘**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；敌人血条 / 预警 / 意图：画法：目标头像框 → 敌人血条 + 屏幕边缘方向提示；元 UI 屏幕效果：无 → 受击红边
  - 配套改动：准星 / 瞄准：画法：十字 → 点；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 左下；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；敌人血条 / 预警 / 意图 · 屏幕锚点：上中 → 自动；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内；敌人血条 / 预警 / 意图 · 放置方式（逐元素）：继承 → 空间内；敌人血条 / 预警 / 意图 · 世界渲染（逐元素）：继承 → 平面公告板；生命 / 护盾 / 体力 · 元 UI 效果（逐元素）：自动 → 低血去饱和
  - 看什么：视线固定在准星：A 要知道弹药、敌血、自己血量得分别跳到右下、上中、左上三个角；B 的弹药在枪上、敌血在敌人头顶、来袭方向和低血用屏幕边缘的颜色传进余光，眼睛不用离开中心。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-focal-periphery#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.threat+el.crosshair` `el.abilities.form=ammo`
  - A：`el.crosshair.form=cross` `el.vitals.screenAnchor=tl` `el.abilities.screenAnchor=br` `el.threat.form=targetFrame` `el.threat.screenAnchor=tc` `rel.metaFx=[]` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit` `el.threat.attachTo=none` `el.threat.diegesis=inherit` `el.threat.worldRender=inherit` `el.vitals.metaFx=auto`
  - B：`el.crosshair.form=dot` `el.vitals.screenAnchor=bl` `el.vitals.metaFx=lowHpDesat` `el.abilities.attachTo=held` `el.abilities.diegesis=diegetic` `el.threat.form=healthBar+edgeDir` `el.threat.attachTo=target` `el.threat.diegesis=spatial` `el.threat.worldRender=billboard` `rel.metaFx=hurtVignette` `el.abilities.screenAnchor=auto` `el.threat.screenAnchor=auto`

  </details>
- **单变量版：信息分在四角 → 只切换 el.abilities.attachTo、el.threat.attachTo、el.threat.form、rel.metaFx**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；敌人血条 / 预警 / 意图：画法：目标头像框 → 敌人血条 + 屏幕边缘方向提示；元 UI 屏幕效果：无 → 受击红边
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-focal-periphery#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.threat+el.crosshair` `el.abilities.form=ammo` `el.crosshair.form=cross` `el.vitals.screenAnchor=tl` `el.abilities.screenAnchor=br` `el.threat.screenAnchor=tc` `el.abilities.diegesis=inherit` `el.threat.diegesis=inherit` `el.threat.worldRender=inherit` `el.vitals.metaFx=auto`
  - A：`el.abilities.attachTo=none` `el.threat.attachTo=none` `el.threat.form=targetFrame` `rel.metaFx=[]`
  - B：`el.abilities.attachTo=held` `el.threat.attachTo=target` `el.threat.form=healthBar+edgeDir` `rel.metaFx=hurtVignette`

  </details>

#### P-actionable-first

**先给能行动的信息：先预告、再结算——意图、预警、命中率与结果预览替玩家做掉心算**

> 适用品类：动作与 Roguelite、角色扮演、策略与战术、建造与经营、卡牌与桌面 · 相关：[P-item-decision](#p-item-decision)、[P-progression-graph](#p-progression-graph)、[P-color-never-alone](#p-color-never-alone) · 风格变体：`fam.pixel`、`fam.tabletop`、`fam.dark-hairline`

**要解决的问题**

原始状态（血量、属性表）要玩家自己推演「接下来会怎样」；把推演结果直接画出来，就等于把最高优先级让给了「下一步」。R2 策略 / 卡牌批次里「敌人意图 + 数字」反复出现（6 款），是这些品类区别于动作游戏的关键元素；动作游戏里对应的是挂在敌人身上的瞬时危险标记、地面预警与攻击类型颜色。参数上对应 el.threat.form（intent / telegraph / hitChance）、st.delta、lay.preview、elx.valueLabel = delta。只在事后给反馈（被打了才知道）会让玩家觉得不公平、只能背板；预告做得好，事后的反馈就可以更轻。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 敌人意图 + 数字 | <abbr title="el.threat.form=intent">敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.valueLabel=current">敌人血条 / 预警 / 意图 · 数值标注 = 当前值</abbr>；<abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr> | 回合制、确定性战斗：每个敌人头顶 / 格子上画出下一步动作类型和伤害。 | 减少惊喜与不确定性，玩法要接受「完全信息」；敌人多时头顶图标互相遮挡。 | Into the Breach（steam:590380）、Slay The Spire（iig:slay-the-spire）、Shogun Showdown（steam:2084000）、Slice & Dice（steam:1775490）、Alina of the Arena（steam:1668690） 等 6 款 |
| 地面预警 / 范围贴花 | <abbr title="el.threat.form=telegraph">敌人血条 / 预警 / 意图：画法 = 地面预警区</abbr>；<abbr title="el.threat.worldRender=decal">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 地面贴花</abbr>；<abbr title="col.coding=status">语义颜色编码 = 状态色</abbr> | 实时或俯视战斗中的可躲闪攻击与警戒范围：地面红圈、弹幕落点、潜行视锥。 | 地面贴花一多会和技能特效混在一起；颜色需配形状冗余。 | Into the Breach（steam:590380）、Just Shapes & Beats（steam:531510）、Intravenous（steam:1486630） |
| 命中率 / 概率直给 + 幽灵预览确认 | <abbr title="el.threat.form=hitChance">敌人血条 / 预警 / 意图：画法 = 命中率百分比</abbr>；<abbr title="el.threat.valueLabel=percent">敌人血条 / 预警 / 意图 · 数值标注 = 百分比</abbr>；<abbr title="ix.confirm=ghost">确认机制 = 幽灵预览 + ✓ / ✕</abbr> | 概率战术：瞄准时直接显示成功率。 | 显示越精确，玩家对「高概率落空」越不满，概率模型要诚实或做保护。 | Into the Breach（steam:590380）、XCOM® 2（steam:268500 · 据已知描述） |
| 结果预览与前后差值 | <abbr title="st.delta=arrow">变化 / 前后对比 = a → b 箭头</abbr>；<abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="el.vitals.valueLabel=delta">生命 / 护盾 / 体力 · 数值标注 = 变化量</abbr> | 构筑、升级、出牌、法令：确认前就看到 a → b。 | 实现成本高（要预先模拟结算）；预览与实际不一致会严重伤害信任。 | DICEOMANCER（steam:2501600）、Alina of the Arena（steam:1668690）、Balatro（steam:2379780） |
| 瞬时危险标记：实时动作的预告 | <abbr title="el.threat.form=intent">敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="col.coding=status">语义颜色编码 = 状态色</abbr> | 实时动作的不可防御攻击与反击时机：只狼头顶的红色「危」字、God of War Ragnarök 敌人身上的颜色圈（红 = 不可格挡、黄 = 可弹反）、Arkham 系列敌人头顶的反击闪电标记。这三款的卡都是「商店图无 UI」，做法据已知描述。 | 预告窗口必须足够反应；标记过多会变成噪声。 | Batman: Arkham City - Game of the Year Edition（steam:200260 · 据已知描述）、Sekiro（steam:814380 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述）、Batman: Arkham Knight（steam:208650 · 据已知描述） |
| 视锥：潜行的感知预告 | <abbr title="el.threat.form=visionCone">敌人血条 / 预警 / 意图：画法 = 视锥</abbr>；<abbr title="el.threat.worldRender=decal">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 地面贴花</abbr> | 潜行与俯视战术（Intravenous 的敌人视锥）。 | 视锥与真实感知规则必须一致，否则玩家会觉得被骗。 | Intravenous（steam:1486630） |
| 倒计时 / 截止 | <abbr title="el.timer.form=number">计时 / 分数 / 回合：画法 = 数字</abbr>；<abbr title="el.timer.priority=primary">计时 / 分数 / 回合 · 信息优先级 = 主</abbr>；<abbr title="st.alert=redTint">警示表达 = 红色调</abbr> | 有期限的经济或节奏：房租到期、敌人行动倒数、剩余时间。 | 制造持续压力；倒计时多了玩家会焦虑或麻木。 | Luck be a Landlord（steam:1404850）、Shogun Showdown（steam:2084000）、Katana ZERO（steam:460950）、The Battle of Polytopia（steam:874390） |

**经验法则**

- 先问「玩家下一步要做什么决定」，再把这个决定需要的结果画在决定发生的地方（格子上、敌人头上、按钮上）。
- 预览与最终结果用同一套编码（同色、同形、同位置），确认前后不跳变。
- 预告用与结算相同的视觉语言（同色、同图标）；结算时让预告「兑现」，例如预警格先闪一下再生效。
- 意图 = 图标表示类型 + 数字表示量，数字紧跟图标，不另起一处。
- 预告只给决策需要的那一层：意图类别 + 数值，细节放到悬停或按住。
- 不确定就显示不确定（区间、概率），不要假装精确。
- 实时游戏的预告窗口要留出反应时间；回合制直接给数字。
- 幽灵预览让确认按钮本身成为反馈（ix.confirm = ghost）。
- 预告越完整，命中时的 UI 反馈越可以轻（Into the Breach 的反馈主要在预告阶段）。
- 这类信息默认是 elx.priority = 主，强调它而不是原始血量。

**反例与玩家评价**

- 只给原始状态、让玩家心算后果：数值都在，但「这样做会怎样」需要自己推。 例：Your Only Move Is HUSTLE（steam:2212330）、Amazing Cultivation Simulator（steam:955900）、Anno 1800（steam:916440）、Timberborn（steam:1062090）。
  - 评价与证据（依据：背景）：R3「提示 / 引导不清」：Your Only Move Is HUSTLE 3 条，Amazing Cultivation Simulator、Anno 1800 各 2 条，Timberborn 3 条——都是「信息很全、后果不明」的策略 / 模拟（关键词粗筛，分不出具体原因）。
- 预告与实际不一致：预警区比真实判定小、特效与命中范围不符。
  - 评价与证据（依据：文献）：评测统计无直接计数；Riot 把特效与判定不一致列为最主要的挫败来源之一。
- 预告信息过量：每个单位都挂意图、血条、状态和数字，压成一片。
  - 评价与证据（依据：文献）：无可靠评测证据：原来引用的 Bloons TD 6、Total War: WARHAMMER II「太乱」命中，复核后分别是满屏气球 / 爆炸的好评和「地图没那么乱」的比较句，已移除。这条是设计推论（Riot 清晰度准则：特效噪声会叠加）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图把意图画成格子上的箭头与编号（Into the Breach 一路），和世界同网格。
- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）：桌游实物把预告做成棋盘上的标记物与骰面，意图就是摆在桌上的棋子。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线里预告挂在敌人身上：一圈细描边或一个字，颜色之外有形状。
- 17 号图谱反查到的相关家族：`fam.military`、`fam.tabletop`、`fam.sim-panel`

**出处**

- [Giant Bomb 用户评测, Into the Breach: A Gem of Constrained Design](https://www.giantbomb.com/into-the-breach/3030-58234/user-reviews/2200-31048/)（S087）：一张截图就包含战场的全部状态：敌人意图都可见，悬停还能看结算顺序，整个战场不需要滚动。
- [Rock Paper Shotgun 2018：Into the Breach 界面设计报道](https://www.rockpapershotgun.com/2018/03/05/into-the-breach-interface-design/)（S097）：开发者表示为了清晰宁可放弃酷的点子；敌人意图直接画在格子上（原文未能在本轮核实）。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：特效的判定范围要与看到的一致，投射物要看得出方向——把「接下来会发生什么」交给画面。
- [本项目 10 R2① 策略批次总结 §8](10-r2-strategy.md)（S186）：Into the Breach、Slice & Dice、Shogun Showdown、Beltmatic 都把敌人下一步画在格子或头顶。
- [Wikipedia, Into the Breach](https://en.wikipedia.org/wiki/Into_the_Breach)（S191）：敌人的攻击在下一回合前就显示出来，玩家的乐趣在于利用这些已知信息去推动、阻挡和抵消攻击（06 文档 [26]）。

**可演示的对比**

- **只给「现在」 vs 画出敌人下一步与 a → b 预览**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图：画法：敌人血条 → 敌人血条 + 意图图标 + 数字 + 地面预警区；即时预览：关 → 开；变化 / 前后对比：只给新值 → a → b 箭头；敌人血条 / 预警 / 意图 · 数值标注：不标 → 当前值
  - 配套改动：信息元素集合：敌人血条 / 预警 / 意图 + 生命 / 护盾 / 体力 + 行动顺序 + 主行动按钮 + 选中信息面板 → 敌人血条 / 预警 / 意图 + 生命 / 护盾 / 体力 + 行动顺序 + 主行动按钮 + 选中信息面板 + 信息叠层 / 图例；选中信息面板：画法：信息面板 → tooltip；生命 / 护盾 / 体力 · 数值标注：当前 / 上限 → 变化量；行动顺序：画法：小图标队列 → 头像队列；信息叠层 / 图例：画法：无 → 格子高亮；敌人血条 / 预警 / 意图 · 信息优先级：次 → 主
  - 看什么：A 只告诉你「现在」：敌人剩多少血、你剩多少血；B 在敌人头顶画出下回合打谁、打多少，地面标出攻击格，选中行动时直接预览「血量 a → b」。玩家的心算被界面替代，这才是该放大的「主」信息。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-actionable-first#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.hud` `lay.container=overlay` `ctx.timeModel=turn` `el.threat.attachTo=target`
  - A：`cnt.elements=el.threat+el.vitals+el.turnOrder+el.cta+el.selection` `el.threat.form=healthBar` `el.selection.form=panel` `el.vitals.valueLabel=currentMax` `st.delta=newOnly` `lay.preview=false` `el.turnOrder.form=icons` `el.overlay.form=[]` `el.threat.priority=secondary` `el.threat.valueLabel=none`
  - B：`cnt.elements=el.threat+el.vitals+el.turnOrder+el.cta+el.selection+el.overlay` `el.threat.form=healthBar+intent+telegraph` `el.threat.valueLabel=current` `el.threat.priority=primary` `el.selection.form=tooltip` `el.vitals.valueLabel=delta` `st.delta=arrow` `lay.preview=true` `el.overlay.form=gridHighlight` `el.turnOrder.form=portraitQueue`

  </details>
- **单变量版：只给「现在」 → 只切换 el.threat.form、lay.preview、st.delta、el.threat.valueLabel**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图：画法：敌人血条 → 敌人血条 + 意图图标 + 数字 + 地面预警区；即时预览：关 → 开；变化 / 前后对比：只给新值 → a → b 箭头；敌人血条 / 预警 / 意图 · 数值标注：不标 → 当前值
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-actionable-first#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.hud` `lay.container=overlay` `ctx.timeModel=turn` `el.threat.attachTo=target` `cnt.elements=el.threat+el.vitals+el.turnOrder+el.cta+el.selection` `el.selection.form=panel` `el.vitals.valueLabel=currentMax` `el.turnOrder.form=icons` `el.overlay.form=[]` `el.threat.priority=secondary`
  - A：`el.threat.form=healthBar` `lay.preview=false` `st.delta=newOnly` `el.threat.valueLabel=none`
  - B：`el.threat.form=healthBar+intent+telegraph` `lay.preview=true` `st.delta=arrow` `el.threat.valueLabel=current`

  </details>

#### P-squint-test

**眯眼检验：模糊后最显眼的必须是玩法信息，不是装饰和特效**

> 适用品类：所有品类 · 相关：[P-priority-tiers](#p-priority-tiers)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-juice-budget](#p-juice-budget) · 风格变体：`fam.ornate-frame`、`fam.candy`、`fam.flat-map`

**要解决的问题**

层级最后是由像素决定的：一个金色角花、一团放射光、一张高饱和立绘，都可能比血条更抢眼。NN/g 的眯眼法和 06 文档的可读性检查 #2 给出了统一的验收方式（chk.squint）。08 调研里只看非商业化界面：GameUI 战斗界面抽样 100 张只有 1 张带材质标签，菜单 22 张（站方标签约 18% 误标，只看趋势），业界默认把华丽留给停下来看的界面；但手游自动战斗、华丽皮肤和重特效动作游戏仍常在 HUD 上违反这一点。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 装饰预算分区：局内低、菜单高 | <abbr title="vis.ornament=0">装饰预算 = 无</abbr>；<abbr title="ast.ornaments=[]">饰件 = 无</abbr>；<abbr title="ast.fx=[]">叠加特效层 = 无</abbr>；<abbr title="vis.motif=none">装饰母题 = 无</abbr> | 几乎所有局内 HUD；风格感交给菜单、标题、结算和画面本身（Hollow Knight 局内只有面具和灵魂罐，护符页才用卷草纹）。 | HUD 本身的风格辨识度下降，要靠字体、图标和配色补。 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）、Hollow Knight（steam:367520）、Hades（steam:1145360） |
| 明度分层：底板 / 描边保证主信息最亮 | <abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr>；<abbr title="vis.opacity=0.85">底不透明度 = 0.85</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr> | 背后是明亮且杂乱的实时画面（植被、雪地、爆炸）。 | 底板压住画面，界面感更重；与「降低透明」无障碍选项联动。 | The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Timberborn（steam:1062090）、Dyson Sphere Program（steam:1366540） |
| 饱和度只给焦点 | <abbr title="col.strategy=neutralAccent">骨架色彩策略 = 中性 + 一两个强调色</abbr>；<abbr title="col.saturation=0.7">UI 饱和度 = 0.7</abbr>；<abbr title="hier.emphasis=color">强调配方 = 颜色</abbr> | 写实、暗调或单色画面：骨架灰白，只有目标 / 危险用彩色。 | 整体偏冷淡；必须有形状冗余照顾色盲。 | CONTROL（steam:870780）、Just Shapes & Beats（steam:531510）、Mirror's Edge（steam:17410）、Portal 2（steam:620） |
| 特效让位：玩家自己的特效降亮度，威胁最显眼 | <abbr title="mo.juice=0.4">反馈强度 = 0.4</abbr>；<abbr title="chk.fxOcclusion=true">特效遮挡检查 = 开</abbr>；<abbr title="el.threat.priority=primary">敌人血条 / 预警 / 意图 · 信息优先级 = 主</abbr>；<abbr title="el.threat.form=telegraph">敌人血条 / 预警 / 意图：画法 = 地面预警区</abbr> | 动作、弹幕、MOBA 式技能、手游自动战斗——特效越多越需要。 | 爽快感下降；要在打击感与可读之间调 mo.juice。 | Into the Breach（steam:590380）、God of War Ragnarök（steam:2322010 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） |

**经验法则**

- 每次换皮肤、加特效后都开 chk.squint：模糊半径约为视口高的 0.5–1%，最显眼的三处应是玩家、威胁、目标（或本屏的主操作）。
- 局内 HUD 装饰预算 ≤ 1、叠加特效层为空；华丽留给菜单、标题、结算这些停下来看的界面。
- 高饱和与发光是稀缺资源：同一屏只给一个类别。
- 玩家自己特效的亮度要低于敌方前摇（06 文档 A2）。
- 再用全色盲模拟（chk.cvd = 灰度）眯一次：只靠明度时层级也要成立。

**反例与玩家评价**

- 自动战斗手游：大招特效、伤害飘字、「总伤害」大字压过血条和头像条，HUD 退成边角小图标。 例：神州风闻录（gameui:6853）、奇缘之旅（gameui:6904）。
  - 评价与证据（依据：截图）：这些是 GameUI 手游，没有 Steam 评测数据；依据是 mobile 批次 sheet-land-02 的截图观察（15-r4-mobile.md）。
- 华丽框体、发光与高饱和图标叠在局内 HUD 上，和战斗特效同频，玩家分不清哪个是信息。 例：Hades II（steam:1145350）、Hyper Light Drifter（steam:257850）。
  - 评价与证据（依据：截图）：看图：Hades II 的雕花框与发光图标贴在战斗画面四周。评测证据不足：原来引用的 Hades II、Hyper Light Drifter、Bloons TD 6 的「太乱 / 字太小」命中，复核后说的是房间里的视觉杂乱、敌人数量、光污染或满屏气球，不是 HUD 本身。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 重装饰雕花框（`fam.ornate-frame`，皮肤 `skin.ornate`）：雕花框最容易不过眯眼：框退到菜单，HUD 只留内芯；眯眼后最亮的必须是血条不是雕花。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通满屏高饱和：只给主信息加白色粗描边与投影，眯眼后它仍跳出来。
- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何的地图即界面：眯眼后看到的应是线路与站点，不是装饰色块。
- 17 号图谱反查到的相关家族：`fam.dark-gold`、`fam.candy`、`fam.memphis`、`fam.graffiti`、`fam.latin-folk`

**出处**

- [Nielsen Norman Group, Squint Test（视频）](https://www.nngroup.com/videos/squint-test/)（S151）：眯眼或轻度模糊可以快速找出最抢注意力的元素，检查高优先级内容是否真的最突出。
- [Nielsen Norman Group, Visual Hierarchy in UX: Definition](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)（S152）：用不同模糊半径看页面：小半径看分组，大半径常暴露出某个强色块意外成为主角——内容（图片、特效）也会改变层级。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：特效要与玩法匹配、噪声要克制；皮肤不能比原版更难读。
- [本项目 08 UI 美术资产调研 §2.1（只取非商业化界面）](08-ui-art-assets.md)（S185）：只取非商业化界面：带材质标签的战斗界面抽样 100 张只有 1 张、菜单 22 张；站方标签约 18% 误标，只看趋势。
- [本项目 06 品类镜头与可读性 §0.5（Into the Breach 清晰优先）](06-genre-camera-ui.md)（S184）：眯眼 / 模糊检查：模糊后最显眼的三个区域应是玩家、威胁、目标；另有灰度、色盲、特效压力检查。

**可演示的对比**

- **装饰与特效预算压在 HUD 上 vs 收回去**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：装饰预算：华丽 → 无；叠加特效层：外发光 + 放射光芒 → 无；UI 饱和度：1.5 → 0.8
  - 配套改动：饰件：角花 / 角饰 + 嵌宝石 → 无
  - 看什么：两边的优先级设置完全一样（血条、Boss 条是主），只差装饰与特效预算。开着眯眼检查：A 模糊后最亮的是金色角花与放射光，B 才是血条和 Boss 条——层级是被装饰抢走的，不是被优先级设置错的。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-squint-test#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.threat+el.objective+el.feedback` `el.threat.form=bossBar` `el.feedback.form=floatNumbers` `vis.motif=floral` `hier.emphasis=value+color` `hier.dimInactive=0.3` `el.vitals.priority=primary` `el.threat.priority=primary` `el.objective.priority=secondary` `chk.squint=true`
  - A：`vis.ornament=3` `ast.ornaments=corners+gems` `ast.fx=glow+rays` `col.saturation=1.5`
  - B：`vis.ornament=0` `ast.ornaments=[]` `ast.fx=[]` `col.saturation=0.8`

  </details>

### 2.2 放置与世界关系（叙事性）

回答「UI 放在哪、和世界是什么关系」：按条目而不是按整款游戏选四象限；叙事内载体要过世界观与镜头两关；空间内标注要选对渲染方式并定数量预算；元 UI 只传达身体感受；开菜单时世界停不停、进了世界之后怎么保证可读，也属于这一层。把字放进世界与 VR 空间界面各有一条（P-world-space-text、P-vr-spatial-ui）。

#### P-two-questions-per-element

**两个问题、逐个元素定位置：角色看不看得见 × 它在不在三维空间里**

> 适用品类：探索与冒险、动作与 Roguelite、射击、策略与战术、生存与制作、恐怖与悬疑 · 相关：[P-focal-periphery](#p-focal-periphery)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-know-your-game-competition](#p-know-your-game-competition) · 风格变体：`fam.diegetic-device`、`fam.contextual-hud`、`fam.survival-horror`

**要解决的问题**

设计者常把「叙事内 / 零 HUD」当成整款游戏的一个风格开关：要么为了沉浸把需要瞬间判断的数值藏进世界，要么为了清晰把所有东西都贴在屏幕四角。Fagerholt & Lorentzon 的四象限本来是给每一条信息各自选位置的工具——同一款游戏里，生命、弹药、敌人、目标往往该落在不同象限。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 全部屏幕叠加（基线） | <abbr title="cnt.screen=screen.hud">界面类型 = 局内 HUD</abbr>；<abbr title="lay.container=overlay">容器 = 直接叠加</abbr>；<abbr title="rel.diegesis=screen">默认放置方式 = 屏幕叠加</abbr>；<abbr title="lay.hudOrg=scattered">HUD 组织方式 = 分散组件</abbr>；<abbr title="cnt.elements=el.vitals+el.abilities+el.crosshair+el.minimap+el.threat">信息元素集合 = 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 准星 / 瞄准 + 小地图 / 罗盘 + 敌人血条 / 预警 / 意图</abbr>；<abbr title="el.abilities.form=ammo">技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字</abbr>；<abbr title="el.threat.form=edgeDir">敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示</abbr> | 竞技、信息量大、需要随时精确读数；或世界观给不出任何叙事理由（抽象、街机）。 | 与画面分离、占四角与视野；沉浸感只能靠皮肤与情境显隐来补。 | Half-Life 2（steam:220）、Half-Life（steam:70）、Overwatch（iig:overwatch）、Call of Duty 4: Modern Warfare (2007)（steam:7940）、Team Fortress 2（steam:440 · 据已知描述） |
| 位置型信息挂进世界（空间内），自身状态留在屏幕 | <abbr title="rel.diegesis=screen">默认放置方式 = 屏幕叠加</abbr>；<abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.form=healthBar">敌人血条 / 预警 / 意图：画法 = 敌人血条</abbr>；<abbr title="el.threat.worldRender=billboard">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 平面公告板</abbr>；<abbr title="el.interact.diegesis=spatial">交互提示 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.interact.attachTo=poi">交互提示 · 世界挂点 = 兴趣点</abbr> | 「在哪里」本身就是信息的元素：敌人血条 / 意图、可交互物、角色想法、机器状态。 | 多目标同屏会堆叠；远近要定尺寸策略（见 P-spatial-render-budget）；镜头外的目标要另补边缘箭头。 | The Sims Legacy Collection（steam:3314060）、Factorio（steam:427520）、Slay The Spire（iig:slay-the-spire）、God of War（steam:1593500 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） |
| 与动作绑定的读数放到手持物上（叙事内），其余屏幕 | <abbr title="el.abilities.form=ammo">技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字</abbr>；<abbr title="el.abilities.diegesis=diegetic">技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.abilities.attachTo=held">技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.vitals.diegesis=screen">生命 / 护盾 / 体力 · 放置方式（逐元素） = 屏幕叠加</abbr>；<abbr title="el.vitals.screenAnchor=bl">生命 / 护盾 / 体力 · 屏幕锚点 = 左下</abbr> | 看读数的时刻就是看手上东西的时刻：换弹看枪、用工具看工具屏。 | 视模被遮挡、切换武器、第三人称背身时读不到；每件手持物都要单独做一块屏。 | Dead Space（steam:1693980）、Half-Life: Alyx（steam:546560）、Subnautica（steam:264710）、Scorn（steam:698670） |
| 全部交给世界（叙事内 / 世界即界面） | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr> | 进程 / 叙事向，信息少且允许模糊，世界里有天然载体（钱袋、旗帜、围巾、纸地图）。 | 引导与地图类抱怨显著增多（见 P-hudless-tax）；道具、动画、镜头都要为信息服务，制作成本最高。 | Firewatch（steam:383870）、Kingdom Two Crowns（steam:701160）、Journey（steam:638230）、Inscryption（steam:1092790）、Unpacking（steam:1135690） |

**经验法则**

- 先列信息清单，每条只问两句：角色看得见吗？它在世界里有位置吗？两个答案直接给出象限（屏幕叠加 / 空间内 / 叙事内 / 元 UI）。
- 「在哪里」本身就是信息的（敌人、交互物、目标、范围）优先空间内；「我自己怎样」的精确数值优先屏幕叠加；与手上动作绑在一起的读数（弹药、工具电量）可放手持物上做叙事内。
- 对照实验结论：弹药放在武器上最好，生命用屏幕数字最好，导航用空间路径线最好、罗盘最差——没有一个象限通吃。
- 全局 rel.diegesis 只是默认值，真正的决定写在 el.<元素>.diegesis 与 el.<元素>.attachTo 上。
- 参考库 452 张卡里标了叙事内 37、空间内 12、元 UI 1、整屏效果 7——叙事内多集中在恐怖、步行模拟、叙事解谜；竞技与策略几乎全是屏幕叠加 + 空间内。

**反例与玩家评价**

- 整套一刀切：生命这种要瞬间判断的量只用血迹 / 红屏等整屏效果表达，没有任何可读的量。
  - 评价与证据（依据：推断）：评测关键词没有按元素拆分，无法直接计数；对照实验（Peacocke 等 2018）里血迹式生命指示拖累了玩家的脱险表现，屏幕数字最好。
- 混搭却不讲同一个设备故事：地图做成手持实物，生命 / 弹药却是常规 HUD，两套逻辑并存、谁也不像。
  - 评价与证据（依据：推断）：参考库里无可计数的出处；业内讨论常拿 Far Cry 2（不在参考库）当例子，此条仅作提醒。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）：叙事内设备：读数放在腕表、头盔、手持终端上，只给「角色能看见」的信息。
- 情境渐显 · 角落小件（`fam.contextual-hud`，皮肤 `skin.mono`）：情境渐显：屏幕层只放「我自己怎样」，世界里的事情交给空间内标记。
- 生存恐怖物品检视（`fam.survival-horror`）：生存恐怖：生命在背包里看（叙事内读数），HUD 几乎为零。
- 17 号图谱反查到的相关家族：`fam.scifi`、`fam.spatial-type`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：按「是否属于故事」「是否在游戏空间里」两个轴把界面元素分成非叙事、空间（几何）、叙事内、元四类；强调「虚构」和「空间」是两件事，叙事内不自动等于更沉浸。
- [Peacocke, Teather, Carette, MacKenzie, McArthur (2018) An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations. Entertainment Computing 26](https://www.yorku.ca/mack/ec2018.html)（S180）：四组实验：弹药在武器上的数字最好；生命用 HUD 数字最好，血迹式指示拖后腿；导航用空间路径线最好、罗盘最差；结论是没有一类显示方式通吃，取决于信息类型、形式与位置。
- [Game UI Discoveries: What Players Want](https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want)（S002）：把四象限术语普及到业界，以 Dead Space、Far Cry 2 为例讨论把界面放进游戏世界。

**可演示的对比**

- **全部屏幕叠加 vs 逐元素选象限**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内；目标 / 路点 · 放置方式（逐元素）：继承 → 空间内；敌人血条 / 预警 / 意图 · 放置方式（逐元素）：继承 → 空间内；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器
  - 配套改动：技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；敌人血条 / 预警 / 意图 · 屏幕锚点：上中 → 自动；目标 / 路点：画法：目标文字 → 标记图标；目标 / 路点 · 屏幕锚点：右上 → 自动；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；敌人血条 / 预警 / 意图 · 世界渲染（逐元素）：继承 → 平面公告板
  - 看什么：A 的四个信息块分在四角；B 只有生命留在左下，弹药跟着枪、敌人血条跟着敌人、目标标记钉在兴趣点上——视线不用在准星和角落之间来回跳。同一套皮肤，只改了每个元素的象限。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-two-questions-per-element#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `rel.diegesis=screen` `cnt.elements=el.vitals+el.abilities+el.crosshair+el.threat+el.objective` `el.vitals.screenAnchor=bl` `el.abilities.form=ammo` `el.crosshair.form=dot` `el.threat.form=healthBar`
  - A：`el.abilities.screenAnchor=br` `el.threat.screenAnchor=tc` `el.objective.form=text` `el.objective.screenAnchor=tr` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit` `el.objective.attachTo=none` `el.objective.diegesis=inherit` `el.threat.attachTo=none` `el.threat.diegesis=inherit` `el.threat.worldRender=inherit`
  - B：`el.abilities.diegesis=diegetic` `el.abilities.attachTo=held` `el.threat.diegesis=spatial` `el.threat.attachTo=target` `el.threat.worldRender=billboard` `el.objective.form=marker` `el.objective.diegesis=spatial` `el.objective.attachTo=poi` `el.abilities.screenAnchor=auto` `el.objective.screenAnchor=auto` `el.threat.screenAnchor=auto`

  </details>
- **单变量版：全部屏幕叠加 → 只切换 el.abilities.diegesis、el.objective.diegesis、el.threat.diegesis、el.abilities.attachTo**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内；目标 / 路点 · 放置方式（逐元素）：继承 → 空间内；敌人血条 / 预警 / 意图 · 放置方式（逐元素）：继承 → 空间内；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-two-questions-per-element#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `rel.diegesis=screen` `cnt.elements=el.vitals+el.abilities+el.crosshair+el.threat+el.objective` `el.vitals.screenAnchor=bl` `el.abilities.form=ammo` `el.crosshair.form=dot` `el.threat.form=healthBar` `el.abilities.screenAnchor=br` `el.threat.screenAnchor=tc` `el.objective.form=text` `el.objective.screenAnchor=tr` `el.objective.attachTo=none` `el.threat.attachTo=none` `el.threat.worldRender=inherit`
  - A：`el.abilities.diegesis=inherit` `el.objective.diegesis=inherit` `el.threat.diegesis=inherit` `el.abilities.attachTo=none`
  - B：`el.abilities.diegesis=diegetic` `el.objective.diegesis=spatial` `el.threat.diegesis=spatial` `el.abilities.attachTo=held`

  </details>

#### P-diegetic-carrier-camera-fiction

**叙事内载体要过两关：世界观给得出理由，镜头一定拍得到**

> 适用品类：探索与冒险、射击、叙事与视觉小说、沙盒与物理、生存与制作、恐怖与悬疑、解谜与侦探、模拟驾驶与飞行 · 相关：[P-world-legibility-guard](#p-world-legibility-guard)、[P-device-bridge](#p-device-bridge)、[P-hudless-tax](#p-hudless-tax) · 风格变体：`fam.diegetic-device`、`fam.camera-osd`、`fam.cartographic`

**要解决的问题**

叙事内 UI 失败的两种典型：世界观不认（中世纪题材硬塞全息屏）、镜头看不到（第一人称把读数画在背上，俯视镜头把读数做在角色背面）。载体选对了，信息才既在世界里又读得到。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 身体挂件（第三人称越肩）：脊柱灯带、后颈环灯、背包读数、身体变化 | <abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.vitals.attachTo=player">生命 / 护盾 / 体力 · 世界挂点 = 玩家角色</abbr>；<abbr title="cmp.gauge@el.vitals=vertical">数值图形（生命 / 护盾 / 体力） = 竖条</abbr>；<abbr title="vis.strokeGlow=0.6">描边发光 = 0.6</abbr> | 越肩 / 追尾镜头始终拍到角色背面；只需表达 1–2 个量。 | 切到正面过场、贴墙掩体、换装时载体可能被挡或被换掉；量多了背上放不下。 | Dead Space（steam:1693980）、ASTRONEER（steam:361420）、Hellblade: Senua's Sacrifice（steam:414340）、The Callisto Protocol（steam:1544020 · 据已知描述） |
| 手、腕、武器（第一人称） | <abbr title="el.abilities.form=ammo">技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字</abbr>；<abbr title="el.abilities.diegesis=diegetic">技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.abilities.attachTo=held">技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.timer.diegesis=diegetic">计时 / 分数 / 回合 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.timer.attachTo=held">计时 / 分数 / 回合 · 世界挂点 = 手持物 / 武器</abbr> | 第一人称、VR：手和视模是镜头里唯一稳定可见的身体部位。 | 视模占屏、抬手看表要动作时间；VR 里手部读数要能抬到眼前。 | Half-Life: Alyx（steam:546560）、Scorn（steam:698670）、Subnautica（steam:264710） |
| 面罩 / 座舱框（第一人称、载具、太空） | <abbr title="ast.container=cockpit">场景容器 = 座舱 / 车内</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="cmp.gauge@el.vitals=arc">数值图形（生命 / 护盾 / 体力） = 弧形</abbr>；<abbr title="rel.followPost=warp">UI 受画面后处理影响 = 跟随弯曲 / 畸变</abbr> | 角色本来就戴头盔、坐座舱：把读数沿面罩边缘或仪表板排布，世界观零成本。 | 边缘读数在余光里，精读要移视线；面罩畸变会压扁文字。 | Hardspace: Shipbreaker（steam:1161580）、Call of Duty: Black Ops（steam:42700）、Starfield（steam:1716740）、No Man's Sky（steam:275850）、NIGHT-RUNNERS PROLOGUE（steam:2707900） |
| 拿出来看的实物（纸地图、手机、相机、心电图） | <abbr title="ast.container=handMap">场景容器 = 摊开的地图</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="flow.entry=hotkey">进入方式 = 按键呼出</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr> | 信息量中等、查看频率低：地图、照片、线索、通讯。 | 拿出 / 收起有时间成本；手持透视让细节难读（见 P-device-bridge）。 | Firewatch（steam:383870）、Red Dead Redemption（steam:2668510）、Alba: A Wildlife Adventure（steam:1337010）、Umurangi Generation（steam:1223500）、Resident Evil 2（steam:883710 · 据已知描述） |
| 整个游戏就是一台设备 / 一张桌子（2D、叙事、模拟） | <abbr title="ast.container=crt">场景容器 = CRT 电视 / 电脑终端</abbr>；<abbr title="ast.containerSurface=desk">容器放在哪 = 书桌</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr> | 玩法本身就是操作一台机器、一本书、一张牌桌。 | 每个功能都要找到物件化的说法；扩展系统时容易「找不到地方放」。 | Progressbar95（steam:1304550）、Hypnospace Outlaw（steam:844590）、Do Not Feed the Monkeys（steam:658850）、IMMORTALITY（steam:1350200）、Inkulinati（steam:957960） 等 6 款 |
| 世界状态本身（信号物，不画任何读数） | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr> | 信息可以由角色外观、环境颜色、物件数量自然表达（钱袋鼓不鼓、围巾长不长、颜色恢复了几种）。 | 只能表达粗粒度状态；美术、动画、关卡都得参与设计。 | Kingdom Two Crowns（steam:701160）、Kingdom: Classic（steam:368230）、Journey（steam:638230）、GRIS（steam:683320）、Mini Metro（steam:287980） |

**经验法则**

- 先问镜头：越肩 → 背、肩、后颈；第一人称 → 手、腕、武器、面罩边；俯视 / 横版 → 角色身上的大色块或随身物；2D 叙事 → 整屏做成设备、书或桌面。
- 再问世界观：科幻 → 全息、投影、面罩；现代 → 手机、手表、纸地图、对讲机；奇幻 / 历史 → 纸、墨、旗帜、火光、身体变化；抽象 → 颜色和形体本身。
- 身体挂件的信息量上限约 1–2 个量；更多信息放进「拿出来看」的设备。
- 立项早期就告诉美术、关卡、角色组：哪些道具要兼职当信息载体（武器自己显示该换弹，就省掉一个 HUD 元素）。
- Godot 落地：身上 / 手上读数用自发光材质或 SubViewport → ViewportTexture 贴到模型上；整屏设备是一个 2D 场景套壳。

**反例与玩家评价**

- 世界观不认：没有科技设定的题材里用全息投影、悬浮读数，比屏幕叠加更出戏。
  - 评价与证据（依据：推断）：评测关键词无法区分这一类，暂无计数；论据来自 Fagerholt & Lorentzon 对「全息屏放进中世纪奇幻会别扭」的论述。
- 载体太小、太暗或在镜头边缘：学了 Dead Space 的形式，却没给足面积与亮度。 例：The Callisto Protocol（steam:1544020 · 据已知描述）。
  - 评价与证据（依据：评测）：The Callisto Protocol（后颈环灯血量；卡为「商店图无 UI」，据已知描述）去重后背包难用 2 条、地图难用 2 条；另有 2 条说背包被杂物塞满。同为身体挂件的 Dead Space 只有地图、引导各 1 条。字号类在收紧口径后为 0。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）：载体是角色身上的设备：先问镜头看不看得到它、世界观里它为什么存在。
- 镜头屏显：取景器 / 摄像机 / 监控（`fam.camera-osd`）：镜头屏显：界面就是取景器 / 监控画面，REC 角标与时间码有叙事理由。
- 制图学 / 古海图图例（`fam.cartographic`）：制图学：地图是角色手里的纸，打开时世界不暂停。
- 17 号图谱反查到的相关家族：`fam.cassette-futurism`、`fam.camera-osd`、`fam.diegetic-device`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：虚构设定决定叙事内设计空间的上限：科幻 / 奇幻可以用未来科技或魔法道具解释，二战写实题材就很难；建议让各组在早期把道具当信息载体来设计。
- [Crafting Destruction: The Evolution of the Dead Space User Interface](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of)（S032）：讲 Dead Space 界面从早期概念到叙事内方案的迭代：生命条、物品栏、武器选择、导航线都在游戏世界里表现，由角色的装备给出理由。
- [Metro Exodus（Wikipedia，Gameplay 一节）](https://en.wikipedia.org/wiki/Metro_Exodus)（S190）：HUD 极简，信息多通过实物呈现：腕表上的计时显示防毒面具滤罐剩余时间，指南针挂在手腕上指向目标。
- [Godot 文档：SubViewport](https://docs.godotengine.org/en/stable/classes/class_subviewport.html)（S120）：SubViewport 可以把一块 2D 界面单独渲染，再作为 ViewportTexture 贴到 3D 物体上，用来做世界里的屏幕。

**可演示的对比**

- **读数在屏幕两角 vs 长在背上和手持物上**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 放置方式（逐元素）：屏幕叠加 → 叙事内；生命 / 护盾 / 体力 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内
  - 配套改动：生命 / 护盾 / 体力 · 屏幕锚点：左下 → 自动；数值图形（生命 / 护盾 / 体力）：横条 → 竖条；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；描边发光：0 → 0.6
  - 看什么：读数从屏幕两角搬到角色背上和手持物上，镜头转动时跟着角色走。看的是：在当前镜头下载体是否总在画面里、是否够大够亮——换成第一人称或俯视镜头，同一套 B 就该换载体。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-diegetic-carrier-camera-fiction#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities` `el.abilities.form=ammo`
  - A：`el.vitals.diegesis=screen` `el.vitals.screenAnchor=bl` `cmp.gauge@el.vitals=bar` `el.abilities.screenAnchor=br` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit` `el.vitals.attachTo=none` `vis.strokeGlow=0`
  - B：`el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `cmp.gauge@el.vitals=vertical` `el.abilities.diegesis=diegetic` `el.abilities.attachTo=held` `vis.strokeGlow=0.6` `el.abilities.screenAnchor=auto` `el.vitals.screenAnchor=auto`

  </details>
- **单变量版：读数在屏幕两角 → 只切换 el.vitals.diegesis、el.vitals.attachTo、el.abilities.attachTo、el.abilities.diegesis**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 放置方式（逐元素）：屏幕叠加 → 叙事内；生命 / 护盾 / 体力 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-diegetic-carrier-camera-fiction#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities` `el.abilities.form=ammo` `el.vitals.screenAnchor=bl` `cmp.gauge@el.vitals=bar` `el.abilities.screenAnchor=br` `vis.strokeGlow=0`
  - A：`el.vitals.diegesis=screen` `el.vitals.attachTo=none` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit`
  - B：`el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `el.abilities.attachTo=held` `el.abilities.diegesis=diegetic`

  </details>

#### P-spatial-render-budget

**空间内标注：先选对渲染方式（公告板 / 透视贴面 / 地面贴花 / 描边 / 边缘箭头），再给它定数量预算**

> 适用品类：探索与冒险、动作与 Roguelite、策略与战术、建造与经营、工厂与自动化、沙盒与物理 · 相关：[P-world-legibility-guard](#p-world-legibility-guard)、[P-actionable-first](#p-actionable-first)、[P-progressive-disclosure](#p-progressive-disclosure) · 风格变体：`fam.holo`、`fam.flat-map`、`fam.military`

**要解决的问题**

头顶血条、交互提示、目标标记、范围圈都挂在世界里，但它是固定大小还是近大远小、立着还是贴地、画面板还是只描轮廓，决定了它在远处是否可读、人多时是否把画面盖满。空间内元素不属于故事，可以用纯 UI 语言表达——这是它相对叙事内的最大自由。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 平面公告板（始终朝镜头、固定屏幕大小） | <abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.worldRender=billboard">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 平面公告板</abbr>；<abbr title="el.threat.form=healthBar+intent">敌人血条 / 预警 / 意图：画法 = 敌人血条 + 意图图标 + 数字</abbr> | 任何距离都必须读到的数值或符号：敌人血条、意图、名字、对话气泡。 | 人多时堆叠成墙；远处单位和近处一样大，丢失深度线索。 | Slay The Spire（iig:slay-the-spire）、Shogun Showdown（steam:2084000）、OXENFREE（steam:388880）、Stray（steam:1332010）、God of War（steam:1593500 · 据已知描述） 等 6 款 |
| 透视贴面（贴在物体表面、近大远小） | <abbr title="rel.worldRender=perspective">世界内标注渲染（默认） = 透视贴面</abbr>；<abbr title="el.objective.diegesis=spatial">目标 / 路点 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.objective.form=marker+text">目标 / 路点：画法 = 标记图标 + 目标文字</abbr> | 标注属于某个物体的细节：调查线索、扫描结果、建筑控制点；靠近才需要读。 | 斜角与远处看不清；文字会被透视压扁。 | Detroit: Become Human（steam:1222140）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述） |
| 地面贴花（预警区、范围、落点、建造网格） | <abbr title="el.threat.form=telegraph">敌人血条 / 预警 / 意图：画法 = 地面预警区</abbr>；<abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.worldRender=decal">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 地面贴花</abbr>；<abbr title="el.overlay.form=rangeRing+gridHighlight">信息叠层 / 图例：画法 = 范围圈 / 路线线 + 格子高亮</abbr>；<abbr title="el.overlay.diegesis=spatial">信息叠层 / 图例 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.overlay.worldRender=decal">信息叠层 / 图例 · 世界渲染（逐元素） = 地面贴花</abbr> | 俯视 / 等距、区域型信息：哪里会被打、塔的射程、能放在哪。 | 贴在起伏地形上会变形；颜色容易和地面材质混；第三人称低机位时贴花几乎看不见。 | Into the Breach（steam:590380）、Thronefall（steam:2239150）、The Banner Saga（steam:237990）、Intravenous（steam:1486630）、PlateUp!（steam:1599600） 等 6 款 |
| 物体描边（不画面板，只描轮廓） | <abbr title="el.interact.diegesis=spatial">交互提示 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.interact.attachTo=poi">交互提示 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.interact.worldRender=outline">交互提示 · 世界渲染（逐元素） = 物体描边</abbr>；<abbr title="el.threat.worldRender=outline">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 物体描边</abbr> | 信息只是「是哪个」：可交互物、透视敌人、潜行时的听觉位置。 | 承载不了数值；描边色会与阵营色、稀有度色争夺同一个颜色通道。 | Mirror's Edge（steam:17410）、Dishonored（steam:205100 · 据已知描述）、The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、Rise of the Tomb Raider（steam:391220 · 据已知描述）、Batman: Arkham Knight（steam:208650 · 据已知描述） |
| 屏幕边缘箭头（世界信息投影回屏幕） | <abbr title="el.threat.form=edgeDir">敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示</abbr>；<abbr title="el.threat.diegesis=screen">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 屏幕叠加</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.objective.form=edgeArrow">目标 / 路点：画法 = 屏幕边缘箭头</abbr> | 目标在镜头外：身后来袭、视野外的任务点。 | 只给方向不给距离；同时多个箭头会互相打架。 | God of War（steam:1593500 · 据已知描述） |
| 聚合与语义缩放（策略、建造的大量单位） | <abbr title="rel.semanticZoom=iconize">语义缩放 = 拉远图标化</abbr>；<abbr title="el.overlay.form=statusIcons">信息叠层 / 图例：画法 = 状态图标</abbr>；<abbr title="el.overlay.diegesis=spatial">信息叠层 / 图例 · 放置方式（逐元素） = 空间内</abbr> | 同屏几十上百个对象：只在出问题的对象上冒图标，拉远后图标化或切热力图。 | 要设计聚合规则与缩放阈值；细节只能点进去看。 | Factorio（steam:427520）、The Sims Legacy Collection（steam:3314060）、Cities: Skylines（steam:255710 · 据已知描述） |

**经验法则**

- 数值和名字用固定大小的公告板；物体细节用透视贴面；区域用地面贴花；「是哪个」用描边；镜头外用边缘箭头。同一游戏的不同元素可以各用各的（rel.worldRender 只是默认值）。
- 给空间标注设预算：常驻的只留当前锁定 / 最相关的一组，其余按距离、视线、相关性淡出；超预算就聚合（计数气泡、图标化）。
- 关键标注关掉深度测试（总在最上层），装饰性标注保留遮挡以留住深度感。
- 在最远交战距离和最斜视角各截一张图检查；俯视游戏还要检查贴花在高低地形上的变形。
- Godot 落地：Label3D 的 billboard + fixed_size 做公告板，Decal 节点做地面贴花，描边用后处理或 next_pass 材质。

**反例与玩家评价**

- 每个可交互物、每个单位都常驻标签，世界被标签盖满。 例：Total War: WARHAMMER II（steam:594570）、Assassin's Creed Unity（steam:289650 · 据已知描述）。
  - 评价与证据（依据：截图）：评测证据不足。Assassin's Creed Unity 的卡是「商店图无 UI」，满屏标签的印象据已知描述；它有 1 条评测说地图呈现塞了太多元素。Total War: WARHAMMER II（steam:594570）的战役图截图里每支军队、每座城都挂着常驻徽章与名牌——现在的量还可控，是同一做法放大以前的样子。Tiny Glade 原来也列在这里，但它只有底部一排小工具、控制点只在建造时临时出现，5 条「clutter」命中说的是场景摆件，已移除。
- 需要远距离读数的信息用了透视贴面或贴花，远处缩成看不清的一点。
  - 评价与证据（依据：推断）：评测无法区分到渲染方式；用工具里的视距预览（chk.viewDistance）与最小字号检查替代。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：标签浮在物体上的细线框，只在扫描模式出现，平时收走。
- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何：大量单位聚合成图标，拉远切热力图。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：单色描边与小方括号，只标最近的几个目标。
- 17 号图谱反查到的相关家族：`fam.holo`、`fam.spatial-type`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：几何（空间）元素在游戏空间里但不属于故事，特别适合传达环境、导航等带空间属性的信息；因为不受虚构约束，设计者可以用最合适的视觉形式。
- [Godot 文档：Label3D](https://docs.godotengine.org/en/stable/classes/class_label3d.html)（S119）：Label3D 可设置朝向镜头的公告板模式、固定屏幕大小（不随距离缩放）以及关闭深度测试（总画在最上层）。
- [Godot 文档：Using decals](https://docs.godotengine.org/en/stable/tutorials/3d/using_decals.html)（S121）：Decal 把贴图投射到网格表面、可运行时移动，适合落点、范围等地面标注；在 Compatibility 渲染器下不可用，任意文字建议用贴近表面的 3D 文字代替。
- [User Interface Design in Video Games](https://www.gamedeveloper.com/design/user-interface-design-in-video-games)（S003）：以 Splinter Cell: Conviction 把目标投影到场景表面为例，讨论空间投影式界面的表现力，也指出投影尺度过大时会挤压虚构的可信度。

**可演示的对比**

- **公告板牌子 vs 透视缩放 + 地面预警 + 描边**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：交互提示 · 世界渲染（逐元素）：平面公告板 → 物体描边；敌人血条 / 预警 / 意图：画法：敌人血条 → 敌人血条 + 地面预警区；敌人血条 / 预警 / 意图 · 世界渲染（逐元素）：平面公告板 → 透视贴面
  - 看什么：A 的血条和按键提示是一张张朝向镜头的牌子；B 的血条随距离缩放、预警压到地面、交互物只描一圈——画面上的「板子」变少，换来远处目标数字更难读。用视距预览比较两者。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-spatial-render-budget#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.threat+el.interact` `el.threat.diegesis=spatial` `el.threat.attachTo=target` `el.interact.form=keyPrompt` `el.interact.diegesis=spatial` `el.interact.attachTo=poi`
  - A：`el.threat.form=healthBar` `el.threat.worldRender=billboard` `el.interact.worldRender=billboard`
  - B：`el.threat.form=healthBar+telegraph` `el.threat.worldRender=perspective` `el.interact.worldRender=outline`

  </details>

#### P-device-bridge

**设备型界面「推到镜头前」：故事上是角色手里的东西，呈现上是清晰的平面**

> 适用品类：探索与冒险、动作与 Roguelite、叙事与视觉小说、生活与养成、生存与制作、模拟驾驶与飞行 · 相关：[P-pause-world-state](#p-pause-world-state)、[P-map-conventions](#p-map-conventions)、[P-medium-simulation](#p-medium-simulation) · 风格变体：`fam.phone-app`、`fam.retro-os`、`fam.diegetic-device`

**要解决的问题**

地图、手机、终端、背包真的拿在三维世界里看，透视、光照、手部遮挡会让大量信息难读；全做成普通菜单又断开了世界。Fagerholt & Lorentzon 的「元表现」——在故事里、但不在三维空间里——是中间解：用设备的壳给出理由，用平面保证可读。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 真实手持（有透视、受场景光） | <abbr title="cnt.screen=screen.map">界面类型 = 地图 / 世界地图</abbr>；<abbr title="ast.container=handMap">场景容器 = 摊开的地图</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.followPost=stylize">UI 受画面后处理影响 = 跟随纸纹 / 描边 / 调色</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="vis.mapStyle=painted">地图画风 = 手绘水彩</abbr> | 信息量小、查看本身就是体验（Firewatch 拿出纸地图和指南针）。 | 细节难读；拿出动作有时间成本；需要手部动画与持握姿势。 | Firewatch（steam:383870）、Red Dead Redemption（steam:2668510）、Alba: A Wildlife Adventure（steam:1337010）、Umurangi Generation（steam:1223500） |
| 镜头推进后转平面（拿起设备 → 全屏设备界面） | <abbr title="ast.container=phone">场景容器 = 手机</abbr>；<abbr title="mo.transition=zoomInto">界面转场 = 镜头推进到物件</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="rel.diegesis=meta">默认放置方式 = 元 UI</abbr>；<abbr title="rel.followPost=crisp">UI 受画面后处理影响 = 不受影响</abbr> | 信息量大（地图细节、清单、通讯、背包），又想保留设备的身份。 | 推进动画占时间；设备壳的比例会限制版面。 | METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Among Us（steam:945360）、OXENFREE（steam:388880） |
| 设定框住整个 HUD（面罩、记忆机器、座舱） | <abbr title="rel.diegesis=meta">默认放置方式 = 元 UI</abbr>；<abbr title="ast.container=cockpit">场景容器 = 座舱 / 车内</abbr>；<abbr title="rel.followPost=warp">UI 受画面后处理影响 = 跟随弯曲 / 畸变</abbr> | 世界观里角色本来就透过一层设备看世界：头盔、模拟机器、驾驶舱。 | 框本身占屏；畸变与边缘遮挡要控制。 | Assassin's Creed: Director's Cut Edition（steam:15100）、Hardspace: Shipbreaker（steam:1161580）、Subnautica（steam:264710）、Starfield（steam:1716740） |
| 整屏就是设备 / 桌面（二维叙事、模拟） | <abbr title="ast.container=crt">场景容器 = CRT 电视 / 电脑终端</abbr>；<abbr title="ast.containerSurface=desk">容器放在哪 = 书桌</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr> | 玩法就是操作一台机器、一张书桌。 | 所有新功能都得找到物件化的位置。 | Progressbar95（steam:1304550）、Hypnospace Outlaw（steam:844590）、Do Not Feed the Monkeys（steam:658850）、IMMORTALITY（steam:1350200）、RPG Time: The Legend of Wright（steam:1839510） |
| 纯菜单（不讲设备故事，只做叙事化命名） | <abbr title="ast.container=none">场景容器 = 无</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="rel.behind=frozen">背后画面来源 = 冻结</abbr>；<abbr title="rel.dim=0.6">压暗强度 = 0.6</abbr> | 系统复杂、查看频繁（装备、技能树）；可以用叙事化的名字与材质保持氛围。 | 与世界断开，沉浸感全靠皮肤。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Hades（steam:1145360） |

**经验法则**

- 信息量 ≤ 3 个量可以真实手持；信息量大就推进后转平面。
- 推进动画控制在 0.3–0.5 秒且可连按跳过；同一会话第二次打开可以直接切入。
- 平面化后仍保留设备的壳（边框、材质、按键位置），用 ast.container 表达，而不是换整套皮肤。
- 设备里的文字不跟随场景后处理（crisp），只让壳跟随画面。
- Godot 落地：界面写成一个 2D 场景放进 SubViewport；手持时贴到模型（ViewportTexture），推进后放进 SubViewportContainer 全屏——同一份界面只写一次。

**反例与玩家评价**

- 设备界面字小、透视斜、受场景光照影响，读一行字要凑近。 例：The Callisto Protocol（steam:1544020 · 据已知描述）。
  - 评价与证据（依据：评测）：The Callisto Protocol（卡为「商店图无 UI」，据已知描述）去重后背包难用 2 条、地图难用 2 条；收紧口径后没有说文字太小的评测——「设备界面字小」这一点只是推论。
- 每次打开都要播完拿出动画、不能连按跳过，频繁查看的界面变得迟钝。 例：Half-Life: Alyx（steam:546560）。
  - 评价与证据（依据：评测）：「UI 卡顿 / 响应慢」去重后 ≥ 2 条的只有 2 款（Cyberpunk 2077、DEATHLOOP）；Half-Life: Alyx（读数在手套与枪上、物品从身上取）有 1 条。证据很弱。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 手机 / 聊天 App 仿真（`fam.phone-app`）：手机 / 聊天 App 仿真：角色的手机推到镜头前就变成平面 App 界面。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：游戏里的电脑屏幕全屏化以后就是一套窗口系统。
- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）：叙事内设备：腕表、扫描仪拉近后切成清晰平面，壳仍在边缘。
- 17 号图谱反查到的相关家族：`fam.scifi`、`fam.cassette-futurism`、`fam.atompunk`、`fam.diegetic-device`、`fam.phone-app`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：元表现在故事里、但画在游戏空间之外，典型是角色持有的导航仪、手机，以最适合用途的方式平面呈现；它能给「为什么玩家看得到这些信息」一个合理解释。
- [How Firewatch's UI enhances immersion（UX Collective）](https://uxdesign.cc/how-firewatchs-ui-enhances-immersion-18feddbc7857)（S089）：玩家每次要辨认方向都得拿出指南针和纸地图，因为护林员本人也不会自动知道北在哪；比 HUD 地图更难用，但更能卖出森林里探索的感觉。
- [Godot 文档：SubViewport](https://docs.godotengine.org/en/stable/classes/class_subviewport.html)（S120）：SubViewport 可单独渲染一块界面，再以 ViewportTexture 贴到物体上或放进 SubViewportContainer 显示；默认不接收输入，要由容器转发。

**可演示的对比**

- **暂停后的平面地图 vs 角色手里的纸地图**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 摊开的地图；默认放置方式：屏幕叠加 → 叙事内；背后画面来源：冻结 → 实时场景；界面转场：自动 → 镜头推进到物件
  - 配套改动：容器：全屏页 → 自动；压暗强度：0.6 → 自动；地图画风：扁平矢量 → 手绘水彩；地图未探索区：云雾遮挡 → 留白（纸面空白）
  - 看什么：同一张地图：A 是暂停后的平面菜单，B 是角色手里摊开的纸，背后世界照常运行、未探索区是纸面空白。比较信息密度能放多少，以及「打开地图」这件事是否还属于游戏世界。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-device-bridge#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.map`
  - A：`lay.container=fullscreen` `ast.container=none` `rel.behind=frozen` `rel.dim=0.6` `vis.mapStyle=flatVector` `vis.mapUnexplored=fog` `mo.transition=auto` `rel.diegesis=screen`
  - B：`ast.container=handMap` `rel.diegesis=diegetic` `rel.behind=live` `mo.transition=zoomInto` `vis.mapStyle=painted` `vis.mapUnexplored=blank` `lay.container=auto` `rel.dim=auto`

  </details>
- **单变量版：暂停后的平面地图 → 只切换 ast.container、rel.diegesis、rel.behind、mo.transition**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 摊开的地图；默认放置方式：屏幕叠加 → 叙事内；背后画面来源：冻结 → 实时场景；界面转场：自动 → 镜头推进到物件
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-device-bridge#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.map` `lay.container=fullscreen` `rel.dim=0.6` `vis.mapStyle=flatVector` `vis.mapUnexplored=fog`
  - A：`ast.container=none` `rel.diegesis=screen` `rel.behind=frozen` `mo.transition=auto`
  - B：`ast.container=handMap` `rel.diegesis=diegetic` `rel.behind=live` `mo.transition=zoomInto`

  </details>

#### P-pause-world-state

**开菜单时世界停不停：先定「菜单 = 安全区」还是「菜单 = 风险」，再让背后的画面说出来**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、建造与经营、生存与制作、恐怖与悬疑 · 相关：[P-transition-frequency](#p-transition-frequency)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-device-bridge](#p-device-bridge) · 风格变体：`fam.holo`、`fam.parchment`、`fam.survival-horror`

**要解决的问题**

菜单会盖住玩法。玩家需要一眼知道'现在安全吗'；不同游戏要的张力不同——策略和 RPG 要冻结后从容思考，恐怖和魂类要'翻包也有风险'。背后画面怎么处理、叠层怎么堆，就是这个信息的载体。背包、换装、地图做成世界里的动作之后，时间是最关键的参数：世界继续跑是张力（恐怖游戏的来源），暂停是体贴——这个决定比菜单本身的样子更影响体验。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 冻结 + 重压暗 / 虚化（经典暂停） | <abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="rel.behind=frozen">背后画面来源 = 冻结</abbr>；<abbr title="rel.dim=0.75">压暗强度 = 0.75</abbr>；<abbr title="rel.sceneBlur=8">背后虚化 = 8</abbr>；<abbr title="rel.sceneTone=desaturate">背后调色 = 去饱和</abbr>；<abbr title="ix.dismiss=key">本屏怎么结束 = 按键返回（Esc / B）</abbr>；<abbr title="ix.close=keyGlyph">关闭控件 = 按键提示（Esc / B 返回）</abbr>；<abbr title="flow.stacking=replace">叠层表现 = 替换上一屏</abbr> | 单机 RPG / 冒险 / 回合制的暂停、背包、技能页；希望玩家慢慢想。 | 完全脱离世界；频繁开关（吃药、换装）时节奏被切碎，BotW 式'暂停吃 20 个苹果'会削弱战斗张力。 | The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、OMORI（steam:1150690）、Metaphor: ReFantazio（steam:2679460） |
| 冻结 + 叙事化外壳（公文箱、背包实物） | <abbr title="cnt.screen=screen.inventory">界面类型 = 背包 / 物品</abbr>；<abbr title="rel.behind=frozen">背后画面来源 = 冻结</abbr>；<abbr title="rel.dim=0.5">压暗强度 = 0.5</abbr>；<abbr title="rel.sceneTone=desaturate">背后调色 = 去饱和</abbr>；<abbr title="ix.blocking=modal">阻断性 = 模态</abbr>；<abbr title="ast.container=handheldDevice">场景容器 = 平板 / 手持终端</abbr> | 背包本身是解谜（拼图格、组合物品），需要玩家安心思考。 | 张力断开；要用压暗 / 去色明确告诉玩家「时间停了」。 | Crow Country（steam:1996010）、Resident Evil Village（steam:1196590 · 据已知描述）、Resident Evil 2（steam:883710 · 据已知描述） |
| 下层缩小后退（栈式叠层，保留'我从哪来'） | <abbr title="lay.container=modal">容器 = 居中弹窗</abbr>；<abbr title="flow.stacking=pushBack">叠层表现 = 下层缩小后退</abbr>；<abbr title="flow.depth=2">弹窗栈深 = 2</abbr>；<abbr title="rel.behind=frozen">背后画面来源 = 冻结</abbr>；<abbr title="rel.dim=0.5">压暗强度 = 0.5</abbr>；<abbr title="mo.transition=zoomInto">界面转场 = 镜头推进到物件</abbr>；<abbr title="mo.duration=0.25">动效时长 = 0.25</abbr> | 子菜单、确认框从暂停菜单弹出，想让玩家知道自己仍在暂停菜单里；风格化 JRPG 常用（Persona / Metaphor 的菜单叠在定格画面上）。 | 栈深 > 2 时后退的层已看不清，等于没用；转场动画会拖慢高频操作。 | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460） |
| 实时不暂停的空间内菜单（翻包即风险） | <abbr title="lay.container=overlay">容器 = 直接叠加</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="rel.dim=0.1">压暗强度 = 0.1</abbr>；<abbr title="rel.sceneBlur=0">背后虚化 = 0</abbr>；<abbr title="rel.diegesis=spatial">默认放置方式 = 空间内</abbr>；<abbr title="ast.frameMat=hologram">外框材质 = 全息网格</abbr>；<abbr title="vis.opacity=0.35">底不透明度 = 0.35</abbr>；<abbr title="flow.entry=hotkey">进入方式 = 按键呼出</abbr>；<abbr title="ix.dismiss=key">本屏怎么结束 = 按键返回（Esc / B）</abbr>；<abbr title="cnt.screen=screen.inventory">界面类型 = 背包 / 物品</abbr>；<abbr title="ix.blocking=none">阻断性 = 非阻断</abbr>；<abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr> | 恐怖 / 生存 / 魂类（含联机），希望管理物品本身就是压力与沉浸的一部分。 | 新手会以为已经暂停而受伤；必须首次提示'世界未暂停'，并给无障碍用的'菜单时暂停 / 慢速'开关。 | Dead Space（steam:1693980）、ELDEN RING（steam:1245620）、OXENFREE（steam:388880）、The Last of Us Part I（steam:1888930 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述） |
| 实时 + 侧抽屉（经营 / 建造，世界继续跑但可单独暂停） | <abbr title="lay.container=drawer">容器 = 侧抽屉</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="rel.dim=0">压暗强度 = 0</abbr>；<abbr title="ctx.timeModel=pausable">时间模型 = 实时可暂停 / 变速</abbr>；<abbr title="cnt.elements=el.gameSpeed">信息元素集合 = 倍速 / 暂停 / 自动</abbr>；<abbr title="el.gameSpeed.form=speedBar">倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr> | 建造 / 动物园 / 城市模拟：玩家要一边看场景一边改，抽屉不能盖住被编辑的对象。 | 抽屉宽度有限，复杂对比放不下；倍速控件必须常驻，不然玩家开着菜单错过事件。 | Planet Zoo（steam:703080）、Spiritfarer（steam:972660）、Megaquarium（steam:600480）、Satisfactory（steam:526870） |
| 变慢而不停（武器 / 技能轮按住呼出） | <abbr title="ctx.timeModel=pausable">时间模型 = 实时可暂停 / 变速</abbr>；<abbr title="el.abilities.arrangement=ring">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 环绕中心 / 轮盘</abbr>；<abbr title="el.abilities.visibility=onDemand">技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素） = 按键呼出</abbr> | 动作游戏里需要战斗中快速切换，又不想完全打断。 | 轮盘项数有上限（约 8）；减速时长要防滥用。 | Dishonored（steam:205100 · 据已知描述） |
| 只在安全点开放（工作台、存档点、篝火） | <abbr title="flow.entry=worldInteract">进入方式 = 世界内交互</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="ix.blocking=soft">阻断性 = 半阻断</abbr> | 复杂的升级 / 整理系统：把它放到世界里的安全地点，既叙事化又不必暂停。 | 玩家想用时可能离安全点很远；需要控制安全点密度。 | Dead Space（steam:1693980）、ELDEN RING（steam:1245620） |

**经验法则**

- 先定'菜单 = 安全区'还是'菜单 = 风险'，再让背后画面说出来：冻结用压暗 0.5–0.8 + 虚化 4–8px + 去饱和；实时只轻压暗 ≤ 0.2、不虚化、保留动态。
- 要张力就实时，但菜单要浅：一层、少于约 9 格、摇杆或数字键直选，换装 / 用药不超过一两次输入。
- 实时菜单：同一个键开关，首次打开提示世界未暂停，并提供'菜单时暂停'的无障碍开关。
- 做了实时，就给安全点：在工作台 / 存档点可以放心整理。
- 高频菜单（背包、地图、快速切换）开关动效 ≤ 0.25s，可被下一次输入打断，不做整屏转场。
- 弹窗栈深 ≤ 2（flow.depth）；更深就改用替换（flow.stacking = replace），并保证返回键逐层退回。
- 弹出对话框时焦点进入框内第一个可交互控件，框外不可聚焦；关闭后焦点回到打开它的那一项。
- 把「开菜单时世界停不停」写进每个界面模板（rel.behind），而不是全局一个开关。

**反例与玩家评价**

- 开关菜单的转场过长、不能被下一次输入打断，高频操作（开背包、切页签）累积成拖沓；或菜单本身掉帧。 例：Cyberpunk 2077（steam:1091500）、Enshrouded（steam:1203620）、Yi Xian: The Cultivation Card Game（steam:1948800）、DEATHLOOP（steam:1252330 · 据已知描述）、Prince of Persia（steam:19980 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「UI 卡顿 / 响应慢」去重后 11 款至少 1 条、共 13 条，≥ 2 条的只有 DEATHLOOP、Cyberpunk 2077 各 2 条；Prince of Persia、Half-Life: Alyx、Enshrouded、弈仙牌各 1 条（关键词粗筛，也混有性能卡顿）。
- 实时菜单却看起来和暂停菜单一样（同样重压暗 + 虚化），玩家无从判断世界是否还在跑。
  - 评价与证据（依据：推断）：无评测计数，属设计推论：Dead Space 用「全息投影在角色身前 + 角色低头操作」的画面本身提示世界未停；这是 rel.behind = live 与 rel.dim / rel.sceneBlur 的组合错误，探索台里可直接做 A / B。
- 实时菜单却做得很深：多层页签、拖拽格子，在战斗中操作等于送死。 例：Resident Evil 5（steam:21690 · 据已知描述）、The Callisto Protocol（steam:1544020 · 据已知描述）。
  - 评价与证据（依据：评测）：「背包 / 物品管理难用」去重后 24 款至少 1 条、7 款 ≥ 2 条：Valheim 17 条最多（负重 / 格子问题，非叙事内），其后 Resident Evil 5 4 条、No Man's Sky 3、Resident Evil 2 3、Abiotic Factor 2、Skyrim 2、The Callisto Protocol 2——生存 / 恐怖占多数。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：背包是投影在角色面前的全息板，背后世界仍在动（Dead Space）。
- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：羊皮纸任务书：打开书页时世界冻结、压暗，菜单就是安全区。
- 生存恐怖物品检视（`fam.survival-horror`）：生存恐怖：翻包时不暂停，角色蹲下翻找的动作本身就是风险提示。
- 17 号图谱反查到的相关家族：`fam.glass`、`fam.diegetic-device`、`fam.survival-horror`

**出处**

- [Crafting Destruction: The Evolution of the Dead Space User Interface](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of)（S032）：Dead Space 的界面从早期方案一步步走向叙事内与沉浸，背包、地图都作为角色面前的全息投影呈现，打开时游戏不停。
- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：玩家并不天然偏好融入世界的界面；很多情况下更喜欢叠加层，因为它读得清——沉浸与清晰要按情境取舍。
- [Xbox Accessibility Guideline 113: UI focus handling](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-113-ui-focus-handling)（S167）：对话框出现时焦点移到其中第一个可交互控件，打开期间焦点不能跑到框外；焦点指示永远可见。
- [Xbox Accessibility Guideline 116: Time limits](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-116-time-limits)（S169）：时间限制只在不可避免时使用，并让玩家能延长或关闭；实时菜单等于给操作加了时间压力，应当配可选的缓解手段。
- [How Dead Space 3 pulled from Dieter Rams and Instagram（Kill Screen）](https://www.killscreen.com/how-dead-space-3-pulled-dieter-rams-and-instagram/)（S088）：Ignacio 的界面思路可概括为「Simplify and hide」；Dead Space 3 的工作台用摇杆做类似收音机旋钮的选择，压缩玩家的操作步骤。
- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：无法自然融入世界的规则应被「具象化」，让玩家能站在角色立场理解（如用敌方炮火解释地图边界），但不要为了沉浸替换掉玩家熟悉的术语。

**可演示的对比**

- **冻结、压暗、去色 vs 世界照常运行、只轻压暗**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：背后画面来源：冻结 → 实时场景；压暗强度：0.75 → 0.1；背后调色：去饱和 → 原样
  - 配套改动：背后虚化：8 → 0
  - 看什么：同一个背包、同样的面板。A 背后冻结、压暗、去色——画面在说「你安全了」；B 背后照常运动、只轻压暗——画面在说「怪还在走」。面板材质与入场动效两边一样，差别只在背后画面的四个参数。（全息背包这种「材质也在讲世界不停」的做法，见做法谱系与 styleVariants 里的 fam.holo。）
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-pause-world-state#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.inventory` `cnt.subtype=bag` `lay.container=overlay` `lay.arrangement=grid` `cmp.slot=cell` `vis.opacity=0.85` `ix.dismiss=key` `mo.duration=0.2`
  - A：`rel.behind=frozen` `rel.dim=0.75` `rel.sceneBlur=8` `rel.sceneTone=desaturate`
  - B：`rel.behind=live` `rel.dim=0.1` `rel.sceneBlur=0` `rel.sceneTone=none`

  </details>

#### P-meta-perception

**元 UI（整屏效果）只让玩家「感到」身体状态，不报数值：分级、只占边缘、避开闪光阈值、可以关**

> 适用品类：动作与 Roguelite、射击、竞速与驾驶、叙事与视觉小说、恐怖与悬疑 · 相关：[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-glance-encoding](#p-glance-encoding)、[P-color-never-alone](#p-color-never-alone) · 风格变体：`fam.cinematic-letterbox`、`fam.ink`、`fam.crt`

**要解决的问题**

受击红边、低血去色、闪白、速度线把玩家和角色的感官连在一起，是 FPS 等品类的成熟惯例；但它铺满整个画面——用多了挡视野、引发不适，单独承担生命值时玩家判断不准，红色还会和敌方色撞车。瞬时状态（刚被打）和持续状态（快死了）要用不同的表现；大面积饱和红色闪烁是光敏高风险。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 受击红边 / 隧道视野（低血） | <abbr title="el.vitals.diegesis=meta">生命 / 护盾 / 体力 · 放置方式（逐元素） = 元 UI</abbr>；<abbr title="el.vitals.metaFx=hurtVignette">生命 / 护盾 / 体力 · 元 UI 效果（逐元素） = 受击红边</abbr>；<abbr title="rel.metaFx=hurtVignette+hitFlash">元 UI 屏幕效果 = 受击红边 + 闪白</abbr> | 回血制射击、动作：生命只需要「安全 / 受伤 / 濒死」几档感受。 | 边缘被压暗影响余光；红色与敌方 / 警示红冲突；没有精确值。 | Call of Duty 4: Modern Warfare (2007)（steam:7940）、Rise of the Tomb Raider（steam:391220 · 据已知描述）、Resident Evil Village（steam:1196590 · 据已知描述） |
| 低血去饱和 / 世界褪色 | <abbr title="rel.metaFx=lowHpDesat">元 UI 屏幕效果 = 低血去饱和</abbr>；<abbr title="el.vitals.visibility=contextual">生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr> | 画面色彩本身是卖点、又不想加红色的作品；或叙事上「世界在离你远去」。 | 褪色后威胁与环境的色相区分变弱，危险时反而更难看清敌人。 | Hellblade: Senua's Sacrifice（steam:414340）、Hellblade II（steam:2461850）、Rise of the Tomb Raider（steam:391220 · 据已知描述） |
| 速度 / 状态感（速度线、边缘光框） | <abbr title="rel.metaFx=speedLines">元 UI 屏幕效果 = 整屏速度线</abbr>；<abbr title="el.speed.diegesis=meta">速度 / 名次 · 放置方式（逐元素） = 元 UI</abbr>；<abbr title="el.speed.metaFx=speedLines">速度 / 名次 · 元 UI 效果（逐元素） = 整屏速度线</abbr> | 竞速、冲刺、技能状态：用整屏的动感代替一个速度表或状态图标。 | 四角最密，会压住角落 HUD；易引起晕动。 | Knights And Bikes（steam:592480）、Redout: Enhanced Edition（steam:517710 · 据已知描述） |
| 有叙事理由的失真（故障、夜视、机器界面） | <abbr title="rel.metaFx=glitch">元 UI 屏幕效果 = 故障</abbr>；<abbr title="rel.diegesis=meta">默认放置方式 = 元 UI</abbr>；<abbr title="rel.followPost=crisp">UI 受画面后处理影响 = 不受影响</abbr>；<abbr title="ast.fx=scanlines">叠加特效层 = 扫描线</abbr> | 世界观里本来就有「角色通过机器看世界」：义体故障、记忆机器、电视信号。 | 失真越重，文字和威胁越难读；需要把关键读数排除在失真之外。 | Cyberpunk 2077（steam:1091500）、Assassin's Creed: Director's Cut Edition（steam:15100）、绝区零（米哈游）（gameui:13081）、Balatro（steam:2379780） |
| 全局警报：只给极少数危机时刻 | <abbr title="st.alert=fullAlarm">警示表达 = 全屏红光 + 扫描线</abbr> | 全局危机、倒计时最后阶段、基地被突袭（XCOM 2 全球地图的红色警报全息）。 | 光敏风险最高的一档，只能短暂出现、不能持续闪烁。 | XCOM® 2（steam:268500 · 据已知描述） |

**经验法则**

- 元 UI 适合 2–3 档的「感受」（安全 / 受伤 / 濒死）；精确值仍放在屏幕或叙事内载体上，或在效果出现时同步显示。
- 瞬时事件（受击）用短闪；持续状态（低血、中毒）用缓慢、低对比的去色或暗角，两者不用同一种表现。
- 强度与紧急度成正比、恢复后退去；中心约 35% 的区域保持干净（暗角从边缘往里推，不压准星和目标）。
- 闪烁每秒不超过 3 次、面积不超过约 20–25% 屏幕；饱和红色的阈值更低，要先去饱和或减小面积（XAG 118）。
- 同一时刻最多一种持续整屏效果；每种效果都能单独关或降低强度。
- 颜色不单独承载：红边要配心跳 / 呼吸声或手柄震动——元感知同样有听觉、触觉通道。
- 受伤红与敌方红二选一：阵营已经用了红，受伤就改用去饱和或暗角。
- 警报类（st.alert = fullAlarm）只做一次性脉冲，持续状态退回红色调（redTint）或图标。
- 所有整屏效果接 a11y.reduceMotion，并在设置里有单独强度滑条（闪白、震屏、速度线、故障）。
- 有叙事理由的失真可以更重，但关键读数不跟随失真（rel.followPost = crisp）。

**反例与玩家评价**

- 用血迹 / 红屏单独表达生命值，没有任何可读的量。
  - 评价与证据（依据：推断）：评测关键词没有单列「整屏效果」类，无计数；对照实验（Peacocke 等 2018）中血迹式生命指示拖累了脱险表现。
- 常驻或高频的整屏效果（故障、扫描线、速度线、频繁闪白）压住文字与威胁，且没有关闭项。 例：CONTROL（steam:870780）。
  - 评价与证据（依据：文献）：无直接计数；探索台的可读性检查已对 speedLines / glitch 给出「关掉整屏速度线 / 故障」修复项，Xbox 无障碍指南 117 与 Game Accessibility Guidelines 都要求可关闭动效与闪烁。另：本地评测去重后按光污染 / 光敏 / 癫痫 / 频闪一类计数，CONTROL 9 条（全库最多，中文评测多说大片红色场景与红光闪烁刺眼），全库 70 条 / 40 款；CONTROL 另有地图 5 条。
- 低血暗角太重，盖住准星、敌人和 HUD 数字。
  - 评价与证据（依据：推断）：评测统计无直接计数。
- 「刚被打」和「快死了」用同一种红色效果，玩家分不清是瞬时还是持续状态。
  - 评价与证据（依据：推断）：评测统计无直接计数（设计规则）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 电影宽银幕 / 片头字幕（`fam.cinematic-letterbox`）：电影宽银幕：濒死时画面去色、四周暗角，像镜头语言。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：受伤时屏幕边缘泛出墨晕，不用红色闪烁。
- CRT 终端（`fam.crt`，皮肤 `skin.terminal`）：CRT 终端：低血时扫描线与色偏加重，像信号变差。
- 17 号图谱反查到的相关家族：`fam.contextual-hud`、`fam.survival-horror`、`fam.mecha-warning`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：元感知用整屏滤镜、畸变、叠加来弥补玩家感知不到角色身体状态的缺口（红屏、边缘变黑的隧道视野、Mirror's Edge 的速度光线），适合连接感官而不适合传递精细信息；还建议开发听觉与触觉的元感知。
- [Peacocke, Teather, Carette, MacKenzie, McArthur (2018) An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations. Entertainment Computing 26](https://www.yorku.ca/mack/ec2018.html)（S180）：生命信息用 HUD 数字表现最好，血迹式指示妨碍了玩家。
- [Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)（S170）：闪烁、移动的内容要能暂停或关闭；震屏、镜头晃动、运动模糊应避免或可关；举例 Halo Infinite 允许玩家把径向模糊、震屏、整屏效果、速度线各自从 0 调到 100%。
- [Game Accessibility Guidelines（Basic）](https://gameaccessibilityguidelines.com/basic/)（S143）：关键信息不能只靠颜色传达，要配符号或可换色；避免闪烁画面与重复图案。
- [Xbox Accessibility Guideline 118: Photosensitivity](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118)（S171）：亮度闪光与红色闪光都以约每秒 3 次、约 20% 屏幕面积为失败阈值；饱和红的判定更严；对策是去饱和、降对比、降频率、缩面积；所有游戏都应做光敏测试。
- [Game Accessibility Guidelines, Avoid flickering images and repetitive patterns](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)（S136）：避免超过 5 秒的闪烁、每秒超过 3 次且占 25% 以上屏幕的闪光；突然的大幅亮度变化和与红色之间的切换也算闪光；可用 Harding 测试。

**可演示的对比**

- **读得出剩几格 vs 只能从红边与褪色里感到**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 放置方式（逐元素）：继承 → 元 UI；元 UI 屏幕效果：无 → 受击红边 + 低血去饱和 + 闪白；生命 / 护盾 / 体力 · 数值标注：当前值 → 不标
  - 配套改动：生命 / 护盾 / 体力 · 屏幕锚点：左下 → 自动；数值图形（生命 / 护盾 / 体力）：分段格 → 自动；生命 / 护盾 / 体力 · 元 UI 效果（逐元素）：自动 → 受击红边
  - 看什么：用事件按钮触发「受击 / 低血」：A 读左下角还剩几格，B 只能从屏幕边缘的红和画面褪色判断——身体感更强，但说不出还剩多少；再打开色盲模拟看红边是否还分得出来。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-meta-perception#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.crosshair` `el.crosshair.form=cross`
  - A：`el.vitals.screenAnchor=bl` `cmp.gauge@el.vitals=segmented` `el.vitals.valueLabel=current` `rel.metaFx=[]` `el.vitals.diegesis=inherit` `el.vitals.metaFx=auto`
  - B：`el.vitals.diegesis=meta` `el.vitals.metaFx=hurtVignette` `rel.metaFx=hurtVignette+lowHpDesat+hitFlash` `cmp.gauge@el.vitals=auto` `el.vitals.screenAnchor=auto` `el.vitals.valueLabel=none`

  </details>
- **单变量版：读得出剩几格 → 只切换 el.vitals.diegesis、rel.metaFx、el.vitals.valueLabel**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 放置方式（逐元素）：继承 → 元 UI；元 UI 屏幕效果：无 → 受击红边 + 低血去饱和 + 闪白；生命 / 护盾 / 体力 · 数值标注：当前值 → 不标
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-meta-perception#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.crosshair` `el.crosshair.form=cross` `el.vitals.screenAnchor=bl` `cmp.gauge@el.vitals=segmented` `el.vitals.metaFx=auto`
  - A：`el.vitals.diegesis=inherit` `rel.metaFx=[]` `el.vitals.valueLabel=current`
  - B：`el.vitals.diegesis=meta` `rel.metaFx=hurtVignette+lowHpDesat+hitFlash` `el.vitals.valueLabel=none`

  </details>

#### P-world-legibility-guard

**进了世界就要受世界的光、雾和后处理：给叙事内 / 空间内元素做可读性兜底**

> 适用品类：探索与冒险、恐怖与悬疑、解谜与侦探、模拟驾驶与飞行 · 相关：[P-text-over-live-scene](#p-text-over-live-scene)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-medium-constraints](#p-medium-constraints) · 风格变体：`fam.dark-hairline`、`fam.holo`、`fam.storybook`

**要解决的问题**

屏幕叠加的 UI 默认清晰地压在最上层；一旦挂进世界，就会被暗场景吞掉、被雾和景深糊掉、被斜角压扁、被 CRT 弯曲、被纸纹和描边风格化——好看但读不出来。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 自发光载体：暗场景里自己亮 | <abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.vitals.attachTo=player">生命 / 护盾 / 体力 · 世界挂点 = 玩家角色</abbr>；<abbr title="vis.strokeGlow=0.7">描边发光 = 0.7</abbr>；<abbr title="typ.legibility=textGlow">文字可读辅助 = 文字发光</abbr> | 恐怖、科幻、夜间场景：读数不能依赖场景灯光。 | 发光元素会成为画面最亮点，抢走对威胁的注意；亮场景里发光细线反而消失。 | Dead Space（steam:1693980）、Subnautica（steam:264710）、Hyper Light Drifter（steam:257850）、The Callisto Protocol（steam:1544020 · 据已知描述）、Ori and the Blind Forest DE（steam:387290 · 据已知描述） |
| 外壳跟随画面、读数保持清晰 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.followPost=crisp">UI 受画面后处理影响 = 不受影响</abbr>；<abbr title="rel.harmony=unified">UI 与画面关系 = 统一调色</abbr> | 面罩、终端、设备界面：壳可以有畸变和材质，数字必须锐利。 | 壳与读数之间有一层「不像同一个东西」的缝；要在美术上处理过渡。 | Hardspace: Shipbreaker（steam:1161580）、METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700） |
| 全部跟随媒介（纸纹、描边、调色），靠大字号和高对比撑住 | <abbr title="rel.followPost=stylize">UI 受画面后处理影响 = 跟随纸纹 / 描边 / 调色</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="typ.baseSize=18">基准字号 = 18</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | 媒介化美术（1 位色、手抄本、橡皮管动画、木桌实物）里 UI 必须是同一种画法。 | 风格化会吃掉细节；字号、对比都要比常规高一档。 | Return of the Obra Dinn（steam:653530）、Pentiment（steam:1205520）、Inscryption（steam:1092790）、Cuphead（steam:268910 · 据已知描述） |
| 跟随弯曲（CRT、镜头畸变） | <abbr title="rel.followPost=warp">UI 受画面后处理影响 = 跟随弯曲 / 畸变</abbr>；<abbr title="ast.container=crt">场景容器 = CRT 电视 / 电脑终端</abbr> | 整屏就是一台旧屏幕的作品。 | 边角文字变形；高频扫描线和故障会伤可读性。 | Balatro（steam:2379780）、绝区零（米哈游）（gameui:13081）、Progressbar95（steam:1304550） |
| 空间内关键标注：固定大小 + 总在最上层 | <abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.worldRender=billboard">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 平面公告板</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 必须在任何距离、任何遮挡下读到的数字与符号。 | 失去遮挡关系与深度感，像贴纸浮在世界上。 | God of War（steam:1593500 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） |

**经验法则**

- 关键读数对其局部背景：文字对比 ≥ 4.5:1、图形 ≥ 3:1，在最亮和最暗的场景各测一次（科幻细线 HUD 在雪地、强光里最容易消失）。
- 暗场景里叙事内载体用自发光，不靠场景灯照亮。
- 雾、景深、运动模糊、胶片颗粒不作用在关键读数上；纸纹、描边、调色这类风格化可以作用在外壳。
- 默认按 D-diegesis-post：叙事内跟随纸纹 / 描边 / 调色，空间内只跟随弯曲，屏幕叠加和元 UI 不受影响；个别读数可逐元素拉回清晰。
- 叙事内文字设最小屏幕像素：随距离缩小到阈值就切成公告板或屏幕投影。
- 空间内描边与场景压暗可以兼作无障碍「高对比显示」（The Last of Us Part II 的做法），把描边设计成可加粗、可换色。

**反例与玩家评价**

- 细线 + 发光叠在亮背景上消失；叙事内 / 媒介化文字随距离或风格化变得太小。 例：Mirror's Edge（steam:17410）、Return of the Obra Dinn（steam:653530）。
  - 评价与证据（依据：截图）：看图：Mirror's Edge 的白色城市与 Return of the Obra Dinn 的 1 位色抖动画面都会吃掉细字和细线。评测证据不足：评测里明确说文字太小的，去重并收紧口径（「看不清」必须和字 / 文字 / 字幕 / 字体同时出现）并逐条复核后全库只有 10 条 / 8 款：BioShock Infinite 3 条（都在说字幕），Civilization VI、METAL GEAR SOLID V（4K 下）、Disco Elysium（好评里提醒调大字号）、Absolute Drift、ASTRONEER、Dyson Sphere Program、鬼谷八荒（卷轴面板里的小字）各 1 条。原来引用的 The Callisto Protocol、Mirror's Edge、Obra Dinn、Pentiment 各 2 条，复核后不是在说文字（Pentiment 的命中是夸字体随人物变化）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：世界内读数加暗描边与淡投影，雪地上也有底。
- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：全息标签自发光、固定屏幕大小，不受雾和景深影响。
- 绘本童话书 / 水彩（`fam.storybook`）：绘本童话书：世界里的字写在纸片或木牌上，牌子本身就是底板。
- 17 号图谱反查到的相关家族：`fam.holo`、`fam.camera-osd`、`fam.spatial-type`

**出处**

- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)（S073）：正文对比至少 4.5:1、大字 3:1，界面组件与图形至少 3:1；游戏 UI 可借作底线。
- [The Last of Us Part II 无障碍选项（PlayStation 官方页）](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)（S112）：提供高对比显示（专门的渲染模式增强游戏内元素对比）、HUD 缩放、HUD 背景加深与换色、强化聆听模式等。
- [Godot 文档：Label3D](https://docs.godotengine.org/en/stable/classes/class_label3d.html)（S119）：fixed_size 让标签不随距离缩放，no_depth_test 让它画在其它物体之上。

**可演示的对比**

- **跟着场景变暗变小 vs 自发光、固定大小**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线）；场景依次切换：白天雪地（snowVillage） → 夜间（snowVillage））
  - 承载原则的参数：敌人血条 / 预警 / 意图 · 世界渲染（逐元素）：透视贴面 → 平面公告板；文字可读辅助：无 → 文字发光；描边发光：0 → 0.7
  - 看什么：把场景切到夜间或雪地：A 的背部读数和远处敌人血条跟场景一起变暗、变小；B 自发光、固定大小，读得出来但更「像屏幕」。打开对比度检查和视距预览量化差别。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-world-legibility-guard#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.threat` `el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `col.lightness=dark` `el.threat.diegesis=spatial` `el.threat.attachTo=target`
  - A：`vis.strokeGlow=0` `typ.legibility=none` `el.threat.worldRender=perspective`
  - B：`vis.strokeGlow=0.7` `typ.legibility=textGlow` `el.threat.worldRender=billboard`

  </details>

#### P-world-space-text

**把字放进世界：目标投在墙上、地名写在建筑上——什么时候值得，以及怎样兜住可读性**

> 适用品类：探索与冒险、动作与 Roguelite、射击、恐怖与悬疑、解谜与侦探、叙事与视觉小说、横版平台、模拟驾驶与飞行 · 相关：[P-world-legibility-guard](#p-world-legibility-guard)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-localization-ready](#p-localization-ready)、[P-vr-spatial-ui](#p-vr-spatial-ui) · 风格变体：`fam.typographic-hud`、`fam.holo`、`fam.thin-geo`

**要解决的问题**

有一类界面把文字本身放进三维世界：目标提示投射在墙面上、地点名写在建筑和地面上、教程字浮在要操作的物体旁，甚至文字就是关卡（Typoman、Baba Is You 这类「文字即世界」的作品）。它让信息和位置合一，画面也更有设计感；代价是文字要受透视、光照、遮挡和距离影响，任何一个都可能让它读不出来。要回答三件事：这条信息「在哪里」本身是不是信息（是才值得放进世界）；用公告板（始终朝向镜头）还是透视贴面（贴在表面）；可读性兜底怎么做（自发光、最小屏幕尺寸、背面衬底，复用 P-world-legibility-guard）。参数上对应 elx.diegesis = spatial、elx.attachTo = poi、elx.worldRender = billboard / perspective / decal、typ.legibility。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 透视贴面：字贴在墙 / 地上 | <abbr title="el.objective.diegesis=spatial">目标 / 路点 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.objective.worldRender=perspective">目标 / 路点 · 世界渲染（逐元素） = 透视贴面</abbr>；<abbr title="el.objective.form=text">目标 / 路点：画法 = 目标文字</abbr> | 地点名、目标、区域说明与位置强绑定，且玩家会走近阅读（DEATH STRANDING 扫描后浮出的地形标记、Detroit 侦查时的证据标签）。 | 斜角与远处会压扁；要设最小屏幕尺寸。 | DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Detroit: Become Human（steam:1222140） |
| 公告板：字立在物体旁、始终朝向镜头 | <abbr title="el.objective.worldRender=billboard">目标 / 路点 · 世界渲染（逐元素） = 平面公告板</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr> | 远距离也要读的标签：队友名、交互提示、价格牌。 | 失去「贴在世界里」的设计感；数量多时会叠成墙（P-spatial-render-budget）。 | PlateUp!（steam:1599600） |
| 叙事内文字：标识牌、涂鸦、屏幕 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="el.objective.diegesis=diegetic">目标 / 路点 · 放置方式（逐元素） = 叙事内</abbr> | 世界里本来就有字的地方：测试室的标识牌（Portal 2）、城市的招牌、角色的手机屏幕。 | 只能承载世界里说得通的内容；本地化要换贴图。 | Portal 2（steam:620） |
| 文字即世界：字是可操作的物体 | <abbr title="cnt.focal=item">主视觉主体 = 物品 / 奖励</abbr>；<abbr title="typ.display.family=handwritten">标题字族 = 手写</abbr> | 以文字为核心机制的作品（Typoman、Baba Is You、Lost Words: Beyond the Page）：字本身可推、可拆、可组合。 | 本地化几乎要重新设计关卡；参考库暂无这类卡（待补参考）。 | — |
| 章节 / 地点大字压在画面上 | <abbr title="el.notify.form=band">通知 / 大字提示：画法 = 整屏横贯带大字</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 屏幕层的「排印叠层」：大号地名或章节名直接压在场景上（CONTROL 的整屏标题、Alan Wake 像电视剧片头的章节标题）。 | 只适合低频事件；要避开画面主体。 | CONTROL（steam:870780）、Alan Wake（steam:108710 · 据已知描述） |

**经验法则**

- 只有「在哪里」本身是信息时，才把字放进世界；否则留在屏幕层。
- 放进世界的字要有可读性兜底：自发光或背面衬底、最小屏幕尺寸、不跟随景深与雾（P-world-legibility-guard）。
- 需要远距离读的用公告板，只需要走近读的用透视贴面。
- 同屏世界文字有数量上限，远处的聚合或隐藏（P-spatial-render-budget）。
- 世界里的字也要能本地化：贴图字要按语种出图，或改成运行时文字（Godot Label3D）。

**反例与玩家评价**

- 目标文字贴在远处墙面上，斜角下压扁成一条线，又没有屏幕回退。
  - 评价与证据（依据：推断）：评测无法区分到渲染方式；用视距预览与最小字号检查验证。
- 世界文字只有一种语言的贴图，其它语言版本看不懂。
  - 评价与证据（依据：推断）：无计数；设计推论（见 P-localization-ready）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 细字直压 · 排印叠层（`fam.typographic-hud`，皮肤 `skin.mono`）：排印叠层：地点名与章节名是大号细字直压画面（CONTROL）。
- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：证据标签以全息细线框悬浮在物体上（Detroit）。
- 细线几何（`fam.thin-geo`，皮肤 `skin.thinGeo`）：细线几何：扫描后世界里浮出地形标记（DEATH STRANDING）。

**出处**

- [Godot 文档：Label3D](https://docs.godotengine.org/en/stable/classes/class_label3d.html)（S119）：三维空间里的运行时文字，可选朝向镜头（公告板）、固定大小、不受光照。
- [Lessons Learned Creating UI for 'The Division'](https://gdcvault.com/play/1024026/Lessons-Learned-Creating-UI-for)（S035）：空间内 UI 的可读性与数量是主要挑战。
- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：空间（spatial）表示：不属于故事、但存在于三维空间。

**可演示的对比**

- **目标写在屏幕右上 vs 投射在目标地点的墙面上**（单变量对照；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：目标 / 路点 · 放置方式（逐元素）：屏幕叠加 → 空间内；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；目标 / 路点 · 世界渲染（逐元素）：继承 → 透视贴面
  - 配套改动：目标 / 路点 · 屏幕锚点：右上 → 自动
  - 看什么：A 的目标是右上角一行字，玩家要自己把文字和地点对上；B 的字贴在目标地点上，位置即信息。转动镜头到斜角、走远一点，看 B 什么时候开始读不出——那就是需要最小尺寸和屏幕回退的地方。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-world-space-text#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `cnt.elements=el.objective+el.minimap` `el.objective.form=text` `typ.legibility=outline`
  - A：`el.objective.diegesis=screen` `el.objective.screenAnchor=tr` `el.objective.attachTo=none` `el.objective.worldRender=inherit`
  - B：`el.objective.diegesis=spatial` `el.objective.screenAnchor=auto` `el.objective.attachTo=poi` `el.objective.worldRender=perspective`

  </details>

#### P-vr-spatial-ui

**VR 与空间界面：没有「屏幕四角」——读数放在手上与手持物，面板放在 1–3 米的舒适深度，不用跟着头锁死的 HUD**

> 适用品类：射击、音游、模拟驾驶与飞行、动作与 Roguelite、解谜与侦探 · 相关：[P-world-space-text](#p-world-space-text)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-device-bridge](#p-device-bridge)、[P-meta-perception](#p-meta-perception)、[P-audio-haptic-pairing](#p-audio-haptic-pairing) · 风格变体：`fam.diegetic-device`、`fam.synthwave`

**要解决的问题**

VR 里屏幕叠加层不存在：贴在视野上的 HUD 会「贴脸」、引起不适，四角也不在余光里（射击品类篇已记录：VR 和载具里只能叙事内）。Half-Life: Alyx 把血量与弹药显示在手套与枪上，Beat Saber 把分数与连击浮在轨道两侧。设计上要回答：读数放在身体哪里（手腕、手持物、腰间）；面板放多远（通行经验是 1–3 米的舒适深度，太近难对焦、太远字小）；面板是固定在世界里、跟随身体还是跟随头部（跟随头部锁死最容易引起不适，宜用延迟跟随或固定在世界）；文字要多大（按角度而不是像素）。探索台目前只有平面画布，本条先给文字说明，不做 A / B 演示。参数上可以近似的是 elx.attachTo = held / player、elx.diegesis = diegetic / spatial、ast.container = wrist。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 读数在手上与手持物 | <abbr title="el.vitals.attachTo=held">生命 / 护盾 / 体力 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.abilities.attachTo=held">技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.abilities.form=ammo">技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字</abbr> | 第一人称 VR 动作：低头看手套就是看血量，弹药写在枪上（Half-Life: Alyx）。 | 玩家要主动看；关键警报仍需声音或视野边缘的提示。 | Half-Life: Alyx（steam:546560） |
| 手腕菜单 | <abbr title="ast.container=wrist">场景容器 = 腕表</abbr>；<abbr title="flow.entry=worldInteract">进入方式 = 世界内交互</abbr> | 需要随时打开的系统菜单：翻转手腕出现一块小面板，可用另一只手点。 | 面积小，只放少量入口；长时间抬手会累。 | — |
| 空间面板：1–3 米、固定在世界或延迟跟随 | <abbr title="rel.diegesis=spatial">默认放置方式 = 空间内</abbr>；<abbr title="lay.container=window">容器 = 可拖动窗口</abbr> | 背包、地图、设置：面板出现在面前舒适距离，固定在世界里，玩家转身时延迟跟随或可抓取挪动。 | 要处理遮挡与深度冲突（面板被墙穿过）。 | — |
| 轨道 / 场景旁的读数 | <abbr title="el.timer.diegesis=spatial">计时 / 分数 / 回合 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.feedback.diegesis=spatial">命中反馈 / 连击 · 放置方式（逐元素） = 空间内</abbr> | 节奏与竞技 VR：分数、连击浮在玩法区两侧（Beat Saber），不进入视线中心。 | 只适合玩法区固定的作品。 | Beat Saber（steam:620980） |

**经验法则**

- 没有屏幕叠加层：读数挂在身体、手持物或场景上。
- 面板放在约 1–3 米的舒适深度（经验值），在视野中央偏下，避免要求大幅转头（Apple 空间布局指南）。
- 不用跟随头部锁死的 HUD；用固定在世界、跟随身体或延迟跟随。
- 文字按视角大小定，而不是像素；正文宁大勿小。
- 关键警报配声音与触觉，并在视野边缘给方向（P-audio-haptic-pairing）。

**反例与玩家评价**

- 把平面游戏的四角 HUD 原样贴在 VR 视野上，跟着头一起动。
  - 评价与证据（依据：推断）：本地评测「晕 / motion sickness」去重后 204 条 / 97 款，集中在第一人称与镜头运动多的作品，但无法区分到 HUD；这是设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）：叙事内设备：读数在手套、枪与腕表上（Half-Life: Alyx）。
- 合成波 / 蒸汽波（`fam.synthwave`，皮肤 `skin.synth`）：合成波 / 霓虹：分数与连击浮在轨道两侧（Beat Saber）。

**出处**

- [Apple Human Interface Guidelines: Spatial layout（visionOS）](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)（S203）：内容放在视野中央、舒适距离，避免随头部锁死。
- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：叙事内与空间表示在第一人称里的优势与代价。

**可演示的对比**

- **VR 空间界面（文字说明，探索台暂不能演示）**（只有文字说明）
  - 探索台目前只有平面画布，无法演示深度、头部跟随与舒适距离。可以近似看的是：把 el.vitals 与 el.abilities 的 attachTo 设成 held、diegesis 设成 diegetic（参考 Half-Life: Alyx），观察屏幕四角清空以后信息还剩多少。

### 2.3 反馈、动效与演出

回答「发生了什么、有多重要」：反馈强度是按事件分量分配的预算；世界层与 UI 层分工；伤害数字、数值变化、震屏顿帧、整屏状态各有规矩；动效语言是皮肤的一部分；转场长度与使用频率成反比；通告分级；结算结论先行、一键完成。声音与触觉是第二通道（P-audio-haptic-pairing）。

#### P-juice-budget

**反馈强度是一笔预算：按事件分量与品类节奏分配，而不是全局拉满**

> 适用品类：动作与 Roguelite、建造与经营、解谜与侦探、卡牌与桌面 · 相关：[P-shake-hitstop](#p-shake-hitstop)、[P-hit-channel-split](#p-hit-channel-split)、[P-flash-motion-comfort](#p-flash-motion-comfort) · 风格变体：`fam.candy`、`fam.dark-hairline`、`fam.comic`

**要解决的问题**

「打击感」常被理解成全局特效拉满：捡一枚金币和击杀 Boss 一样闪、一样震，玩家分不出轻重，久玩疲劳、光敏风险上升；反过来，解谜和经营界面套用动作游戏的震屏与砸入，会打断思考、显得廉价。设计者需要一个从「冷静」到「夸张」的刻度，以及按事件分级的分配方法。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 冷静：状态变化本身就是反馈 | <abbr title="mo.juice=0.05">反馈强度 = 0.05</abbr>；<abbr title="mo.enter=cut">入场动效 = 硬切</abbr>；<abbr title="mo.easing=easeOut">缓动性格 = 缓出</abbr>；<abbr title="ix.press=darken">按下反馈 = 变暗</abbr>；<abbr title="mo.valueChange=instant">数值变化 = 瞬变</abbr> | 解谜、经营、极简策略、需要长时间盯着看的界面。操作的结果（线路接通、格子变色、数字更新）已经足够清楚，额外修饰只会干扰。 | 新手可能感觉不到操作已经生效，需要靠清晰的状态差异（颜色、形状、位置）补；宣传视频里显得「平」。 | Mini Metro（steam:287980）、Dorfromantik（steam:1455840）、Tiny Glade（steam:2198150）、Beltmatic（steam:2674590） |
| 克制但有重量：手感交给动画、音效与镜头，UI 只记账 | <abbr title="mo.juice=0.35">反馈强度 = 0.35</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="rel.metaFx=hurtVignette">元 UI 屏幕效果 = 受击红边</abbr>；<abbr title="mo.valueChange=trail">数值变化 = 延迟拖尾</abbr>（渲染说明：mo.valueChange@el.vitals 改写为全局 mo.valueChange（渲染器只读全局值）） | 写实 3A 动作、魂类。本地评测去重后提到「打击感」最多的就是这一类（God of War 17 条、STAR WARS Jedi: Survivor 8、God of War Ragnarök 7、Black Myth: Wukong 6），它们的 HUD 反而很少。 | 依赖角色动画、顿帧、音效和镜头的投入；UI 层面「看不出」打击感，原型阶段容易被误判为反馈不足。 | Black Myth: Wukong（steam:2358720）、ELDEN RING（steam:1245620）、God of War（steam:1593500 · 据已知描述）、Sekiro（steam:814380 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 数字即爽感：反馈落在数字跳动、累乘和燃烧上 | <abbr title="mo.juice=0.6">反馈强度 = 0.6</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="el.feedback.form=floatNumbers">命中反馈 / 连击：画法 = 飘字</abbr> | Roguelite、构筑卡牌、增量 / 放置：乐趣来自数值成长，玩家要看到「数变大」的过程（Balatro 分数翻倍时数字燃烧抖动，Cookie Clicker 以数字跳动为主要反馈）。 | 数值通胀后必须有缩写、合并与上限规则，否则满屏数字；数字字体成为风格的一部分，要单独设计。 | Balatro（steam:2379780）、Cookie Clicker（steam:1454400）、Nodebuster（steam:3107330）、Dead Cells（steam:588650）、Hades（steam:1145360） |
| 夸张：漫画、节奏与 Persona 式演出 | <abbr title="mo.juice=0.9">反馈强度 = 0.9</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="mo.easing=overshoot">缓动性格 = 回弹</abbr>；<abbr title="el.feedback.form=comicSFX+rating">命中反馈 / 连击：画法 = 拟声字 + 评价字（Good! / Perfect）</abbr>；<abbr title="ast.fx=speedlines">叠加特效层 = 面板速度线</abbr> | 风格化动作、节奏动作、漫画 / 拼贴风。夸张本身就是美术风格（Hi-Fi Rush 整屏拟声字、DMC5 评价字母越打越大）。 | 高频小事件必须降档，否则第三次就吵；光敏检测与屏占检查必做；本地化（拟声字、斜排字）成本高。 | Hi-Fi RUSH（steam:1817230）、Hi Fi Rush（iig:hi-fi-rush）、Persona 5 Royal（steam:1687950）、恐龙哪里跑（gameui:12857）、Devil May Cry 5（steam:601150 · 据已知描述） |

**经验法则**

- 先给事件分级（例如 0 日常 / 1 有效命中 / 2 关键 / 3 里程碑），每一级规定能用哪些通道（颜色、缩放、震屏、闪白、音效、顿帧）和上限，再定全局 mo.juice。
- mo.juice 当作全局乘数；高频元素用 mo.juice@el.<元素> 单独降档。
- 事件越高频，反馈越轻：每秒会发生多次的反馈最多用 1–2 个通道。
- 品类起点（经验值，要靠试玩校准）：解谜 / 经营 ≤ 0.15，写实动作 0.3–0.45，Roguelite / 割草 0.5–0.7，漫画 / 节奏 0.8 以上。
- 拉高强度之前先开特效遮挡检查（chk.fxOcclusion），并把光敏检测排进计划。

**反例与玩家评价**

- 所有事件同一强度：拾取、普通命中、暴击、击杀、升级全部闪白 + 震屏 + 放大，重要事件反而淹没。
  - 评价与证据（依据：背景）：本地评测去重后按关键词计数（关键词与正则见 JSON 的 reviewRecount.keywords）：「打击感」195 条 / 55 款、好评 168 条，最多的是 God of War 17、Katana ZERO 15、Hades 12、Devil May Cry 5 10、Ori and the Will of the Wisps 10、STAR WARS Jedi: Survivor 8、Clair Obscur 8；光敏 / 频闪 / 光污染 70 条 / 40 款，最多的是 CONTROL 9、FINAL FANTASY XVI 5、Just Shapes & Beats 4、Nodebuster 4、TUNIC 3、Ori and the Will of the Wisps 3、Sayonara Wild Hearts 3、Clair Obscur 3。两端都说明「强度对不对」比「有没有」更常被讨论。
- 在冷静品类里硬加动作游戏的反馈：经营 / 建造的确认操作也震屏、也砸入。
  - 评价与证据（依据：推断）：评测统计没有直接计数。间接参考：R3「菜单 / 界面难用」去重后 19 款 ≥ 2 条，建造经营类集中（Valheim 7、Parkasaurus 3、Dyson Sphere Program 3、Planet Zoo 2），这类界面玩家要的是快和确定。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：Q 弹缩放与彩色粒子是风格的一部分，但只给有效命中与里程碑，拾取只有小跳动。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：反馈几乎全在世界层（顿帧、音效、动画），UI 层只是一条细条的拖尾。
- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：拟声字是反馈的主角，按事件分级控制字号与出现频率。
- 17 号图谱反查到的相关家族：`fam.candy`、`fam.xianxia`

**出处**

- [Martin Jonasson & Petri Purho, Juice It or Lose It（GDC Europe 2012；Game Developer 报道）](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-)（S093）：用打砖块原型现场演示：补间、挤压拉伸、事件时放大缩小、震屏等小反馈叠加，让同一玩法明显更好玩；把 juice 概括为用最少的输入换最多的输出。
- [Folmer Kelly, Don't Juice It or Lose It（GDC Europe 独立游戏峰会；Game Developer 报道）](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)（S083）：反方观点：润色让游戏更热闹，但可能削弱沉浸感；反馈强度要服从作品气质。
- [Dominic Kao, The Effects of Juiciness in an Action RPG, Entertainment Computing 34 (2020)（二手摘要）](https://www.goodreads.com/author_blog_posts/19932694-the-effects-of-juiciness-in-an-action-rpg-new-study)（S081）：同一款 ARPG 做无 / 中 / 高 / 极端四档反馈对照，中档与高档在各项体验指标上都好于无和极端——强度存在最佳区间。原文未读，只据摘要。
- [Martin Pichlmair & Mads Johansen, Designing Game Feel: A Survey（arXiv:2011.09201，后发表于 IEEE Transactions on Games）](https://arxiv.org/abs/2011.09201)（S179）：把手感研究归成三种体验目标——物理感、放大、支持——分别对应调参、加 juice、精简流程；juice 只是三种打磨手段之一。

**可演示的对比**

- **冷静（只有数值与颜色）vs 夸张（砸入、回弹、拟声字）**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击：画法：无 → 拟声字 + 评价字（Good! / Perfect）；缓动性格：缓出 → 回弹；入场动效：淡入 → 砸入（放大落下 + 震）；反馈强度：0.1 → 0.9
  - 看什么：同一段战斗节拍：A 只有数值和颜色变化，B 有砸入、回弹和拟声字。看 B 在节拍循环到第三遍时是不是开始吵，再想想自己的游戏每分钟有多少次这样的事件。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-juice-budget#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `chk.demo=combatBeat`
  - A：`mo.juice=0.1` `mo.enter=fade` `mo.easing=easeOut` `el.feedback.form=[]`
  - B：`mo.juice=0.9` `mo.enter=slam` `mo.easing=overshoot` `el.feedback.form=comicSFX+rating`

  </details>

#### P-hit-channel-split

**命中反馈分层：世界层回答「打中了吗」，UI 层只回答「打了多少 / 打得怎样」**

> 适用品类：动作与 Roguelite、射击、角色扮演 · 相关：[P-damage-number-legibility](#p-damage-number-legibility)、[P-juice-budget](#p-juice-budget)、[P-actionable-first](#p-actionable-first) · 风格变体：`fam.comic`、`fam.dark-hairline`、`fam.pixel`

**要解决的问题**

把所有反馈都塞进 UI（飘字、命中标记、评价字、连击数）会盖住战场和敌人的出招前摇；全部交给世界特效，玩家又读不出数值、弱点和表现评价。需要先决定每一类信息由哪一层承担，再选 UI 层的画法。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 世界层为主，UI 只挂一条目标血条 | <abbr title="cnt.elements=el.vitals+el.threat">信息元素集合 = 生命 / 护盾 / 体力 + 敌人血条 / 预警 / 意图</abbr>；<abbr title="el.threat.form=healthBar">敌人血条 / 预警 / 意图：画法 = 敌人血条</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="mo.juice=0.4">反馈强度 = 0.4</abbr> | 写实动作、魂类、潜行：受击闪白、击退、血溅、音效和顿帧已经说明「打中了」，UI 只需要目标血量。 | 数值深度难以传达（伤害公式、抗性只能靠文字说明或试错）。 | God of War（steam:1593500 · 据已知描述）、Sekiro（steam:814380 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述）、Lies of P（steam:1627720 · 据已知描述） |
| 飘字挂在目标上 | <abbr title="el.feedback.form=floatNumbers">命中反馈 / 连击：画法 = 飘字</abbr>；<abbr title="el.feedback.attachTo=target">命中反馈 / 连击 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr> | ARPG、Roguelite、JRPG、刷宝射击：伤害数值是玩家构筑的结果，需要逐下看见（Hades、Dead Cells、Octopath 的大号衬线伤害数字、Borderlands 2 的彩色飘字）。 | 多敌人、高攻速时刷屏，需要合并与上限（见 P-damage-number-legibility）。 | Hades（steam:1145360）、Dead Cells（steam:588650）、OCTOPATH TRAVELER（steam:921570）、幻界之境（gameui:6836）、Borderlands 2（steam:49520 · 据已知描述） |
| 命中标记：反馈留在准星上 | <abbr title="el.feedback.form=hitMarker">命中反馈 / 连击：画法 = 命中标记</abbr>；<abbr title="el.feedback.screenAnchor=center">命中反馈 / 连击 · 屏幕锚点 = 中心</abbr>；<abbr title="el.crosshair.form=cross">准星 / 瞄准：画法 = 十字</abbr> | 第一 / 第三人称射击：玩家视线钉在准星，命中、爆头、击杀用准星旁的标记和声音区分，不让视线离开中心（探索台的射击品类布局默认就是 命中标记 + 飘字）。 | 标记本身的信息量很小；爆头、护盾、击杀要靠形状和颜色再分级。卡片笔记里没有直接记到命中标记，例子按该作已知 HUD。 | Overwatch（iig:overwatch）、Team Fortress 2（steam:440 · 据已知描述） |
| 拟声字：把反馈画成漫画的一部分 | <abbr title="el.feedback.form=comicSFX">命中反馈 / 连击：画法 = 拟声字</abbr>；<abbr title="el.feedback.screenAnchor=center">命中反馈 / 连击 · 屏幕锚点 = 中心</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="typ.display.family=graffiti">标题字族 = 涂鸦</abbr> | 画面本身就是漫画 / 卡通渲染时（Hi-Fi Rush 击打时整屏拟声字，竖屏手游的 BOOM 与命中拟声字）。 | 大字遮挡最多，只能留给重击或终结；要和画面同一套描边、字体与网点，不然像贴纸。 | Hi-Fi RUSH（steam:1817230）、Hi Fi Rush（iig:hi-fi-rush）、恐龙哪里跑（gameui:12857）、曙光重临（4399）（gameui:13586） |
| 评价字与连击数：反馈的是「打得怎样」 | <abbr title="el.feedback.form=rating+combo">命中反馈 / 连击：画法 = 评价字（Good! / Perfect） + 连击大数字</abbr>；<abbr title="el.feedback.screenAnchor=mr">命中反馈 / 连击 · 屏幕锚点 = 右中</abbr>；<abbr title="typ.numerals.style=italic">数字斜体 = 斜体</abbr> | 风格动作、节奏、竞速特技：评价字母（DMC5 右侧 D→SSS）、连击数（Arkham 左上）、判定字（音游中间 EXACT）把技巧表现变成可追求的目标。 | 需要一套评分规则（不重复招式、节拍准度）；放在中心会挡判定，节奏游戏除外。 | MUSYNX（steam:952040）、Crashday Redline Edition（steam:508980）、Beat Saber（steam:620980）、Devil May Cry 5（steam:601150 · 据已知描述）、Batman: Arkham Knight（steam:208650 · 据已知描述） 等 6 款 |

**经验法则**

- 先列玩家这一下需要知道什么：打中没有 → 世界层（受击闪白、击退、音效、顿帧）；打了多少 → 数字；打得好不好 → 评价 / 连击；有没有效（弱点、抵抗）→ 字样或颜色（如 WEAK）。
- 每类信息只交给一层；UI 层的反馈放在战场外围或目标头顶的小范围。
- 越写实，UI 反馈越少；越风格化，UI 反馈越可以成为画面的一部分，但必须用画面同一套线条、字体与配色。
- 射击类的反馈留在准星附近，不让视线离开中心。
- 评价字、连击数放侧边（DMC 在右侧中部、Arkham 在左上），不要挡住画面中心的敌人。

**反例与玩家评价**

- 飘字、命中特效、评价字全部压在目标身上，盖住敌人的出招前摇和地面预警。 例：Hades II（steam:1145350）。
  - 评价与证据（依据：截图）：看图：Hades II 的伤害数字、命中闪光与敌人前摇叠在同一块区域。评测证据不足：原来引用的「HUD 太乱」命中（Hades II 4、Bloons TD 6 5、ELDEN RING 3），复核后说的是房间狭小与敌人数量、满屏气球，或者在夸 ELDEN RING 没有界面杂物，都不是在说飘字挡前摇。
- 同一信息在每一层重复：每一下都同时有命中标记、飘字、闪白、震屏，信号多但信息没有增加。
  - 评价与证据（依据：推断）：评测统计没有直接计数；Hicks 等 2019 的实验显示视觉修饰主要提升「好看」，对胜任感只在特定条件下有帮助。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：世界层是拟声字与速度线，UI 层只报伤害与评级。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：命中靠火花与顿帧，数字挂在 Boss 条末端而不是飘在敌人身上。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：命中闪白一帧加像素粒子，伤害数字用像素字、整数缩放。

**出处**

- [Jan Willem Nijman（Vlambeer）对 Nuclear Throne 一发手枪的反馈拆解（Rock Paper Shotgun 访谈的转述）](https://infovore.org/?p=5275)（S091）：一次开枪拆成十几层：枪声、弹壳、镜头后坐几像素、快速衰减的震屏、枪械后坐、枪口闪、命中特效与材质音、敌人白闪 + 击退约 3 像素 / 帧、每次命中暂停约 10–20 毫秒。大部分都在世界层，UI 几乎不参与。
- [Hicks et al., Juicy Game Design: Understanding the Impact of Visual Embellishments on Player Experience, CHI PLAY 2019](https://doi.org/10.1145/3311350.3347171)（S175）：视觉修饰是重复表达已有信息的设计元素；两项实验里它们稳定提升视觉吸引力，但对胜任感等体验只在特定情况下有影响。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：画面上越重要的事件越该吸引注意；视觉噪声会叠加，炫目是有代价的；特效必须与判定范围一致。

**可演示的对比**

- **数字压在敌人身上 vs 评价与连击挪到右侧**（单变量对照；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击 · 世界挂点：目标 / 敌人 → 不挂（用屏幕锚点）；命中反馈 / 连击：画法：飘字 → 评价字（Good! / Perfect） + 连击大数字；命中反馈 / 连击 · 屏幕锚点：自动 → 右中
  - 看什么：A 让视线停在敌人身上读数字；B 把「打得怎样」挪到右侧，敌人身上只剩世界特效。比较两者下能不能同时看清敌人的下一次出招。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-hit-channel-split#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.screen=screen.hud` `chk.demo=combatBeat`
  - A：`el.feedback.form=floatNumbers` `el.feedback.attachTo=target` `el.feedback.screenAnchor=auto`
  - B：`el.feedback.form=rating+combo` `el.feedback.screenAnchor=mr` `el.feedback.attachTo=none`

  </details>

#### P-damage-number-legibility

**伤害数字：大小表达分量、颜色加字样表达类型、高频合并、玩家可关**

> 适用品类：动作与 Roguelite、射击、角色扮演、卡牌与桌面、手机触屏（局内与非商业化界面）、格斗 · 相关：[P-hit-channel-split](#p-hit-channel-split)、[P-color-never-alone](#p-color-never-alone)、[P-squint-test](#p-squint-test) · 风格变体：`fam.pixel`、`fam.persona-collage`、`fam.dark-hairline`

**要解决的问题**

在数值型战斗里伤害数字是主要反馈，但多段、持续和群体伤害会刷屏；暴击、弱点、护盾、治疗、受伤混在一起分不清；细字在亮色特效或雪地上看不见；数字盖住敌人。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 逐击飘字 | <abbr title="el.feedback.form=floatNumbers">命中反馈 / 连击：画法 = 飘字</abbr>；<abbr title="el.feedback.attachTo=target">命中反馈 / 连击 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | 节奏慢、单次伤害大的战斗（回合制 JRPG、ARPG 的重击）：每个数字都值得读（Octopath 的大号衬线伤害数字）。 | 攻速一高就刷屏；数字字体、描边、出现与消失的动效都要单独设计。 | OCTOPATH TRAVELER（steam:921570）、Hades（steam:1145360）、Borderlands 2（steam:49520 · 据已知描述） |
| 累计合并：同一目标的一串伤害合成一个跳动的总数 | <abbr title="el.feedback.form=floatNumbers">命中反馈 / 连击：画法 = 飘字</abbr>；<abbr title="el.feedback.attachTo=target">命中反馈 / 连击 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>（渲染说明：mo.valueChange@el.feedback 改写为全局 mo.valueChange（渲染器只读全局值）） | 多段攻击、持续伤害、自动战斗与割草类：玩家关心这一轮总共打了多少（自动战斗手游的「总伤害大字」、Balatro 的筹码 × 倍率累算）。 | 看不到单下的暴击；需要定义合并窗口（多久没有新伤害就结算）。 | 神州风闻录（gameui:6853）、Balatro（steam:2379780）、 战神之决战西伯利亚（gameui:7312） |
| 只在关键时出大字：弱点、暴击、破防 | <abbr title="el.feedback.form=floatNumbers+rating">命中反馈 / 连击：画法 = 飘字 + 评价字（Good! / Perfect）</abbr>；<abbr title="el.feedback.scale=1.6">命中反馈 / 连击 · 大小 / 突出度 = 1.6</abbr>；<abbr title="col.coding=element+status">语义颜色编码 = 元素属性色 + 状态色</abbr> | 有弱点 / 破防机制的回合制或动作 RPG：普通伤害小而淡，触发机制时数字变大并配字样（Octopath 的 WEAK 与破防时的大号数字）。 | 需要清楚的分级规则；若关键事件太频繁，大字就失去意义。 | OCTOPATH TRAVELER（steam:921570）、Borderlands 2（steam:49520 · 据已知描述） |
| 数字挂在血条端点，不飘 | <abbr title="el.threat.form=bossBar">敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字</abbr>；<abbr title="el.threat.valueLabel=delta">敌人血条 / 预警 / 意图 · 数值标注 = 变化量</abbr>；<abbr title="el.threat.valueLabelPos=end">敌人血条 / 预警 / 意图 · 数值标注位置 = 条尾</abbr>；<abbr title="el.threat.screenAnchor=bc">敌人血条 / 预警 / 意图 · 屏幕锚点 = 下中</abbr> | 魂类与 Boss 战：本次连段的伤害累计写在 Boss 长条一端，战场中心完全干净（艾尔登法环、Lies of P 的底部 Boss 条）。 | 小怪身上看不到数值；数字远离攻击点，弱点反馈要另靠特效和音效。 | ELDEN RING（steam:1245620）、Lies of P（steam:1627720 · 据已知描述） |
| 不显示数字，只看血条差值 | <abbr title="el.threat.form=healthBar">敌人血条 / 预警 / 意图：画法 = 敌人血条</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="mo.valueChange=trail">数值变化 = 延迟拖尾</abbr>（渲染说明：mo.valueChange@el.threat 改写为全局 mo.valueChange（渲染器只读全局值）） | 写实动作、生存恐怖：伤害用拖尾的差值和敌人的受击反应表达，数字会破坏氛围。 | 构筑与数值比较只能靠菜单；玩家在社区里自己算伤害。 | Sekiro（steam:814380 · 据已知描述）、Batman: Arkham City - Game of the Year Edition（steam:200260 · 据已知描述） |

**经验法则**

- 尺寸按「占目标血量的比例」或事件等级映射，不按绝对值——数值膨胀后绝对值会失控。
- 颜色编码伤害类型（暴击、弱点、护盾、治疗、自己受伤），同时用字形或字样做冗余（WEAK、CRIT、斜体、图标）。
- 出伤挂在目标上，受伤挂在自己或屏幕边缘，两类不进同一区域。
- 高频伤害合并成一个持续刷新的数字；超过 4–5 位用缩写（12.3K）。
- 提供开关：关 / 逐击 / 累计 / 都显示（Apex Legends 的四档）。
- 数字用大号展示数字字体 + 描边或投影（typ.legibility），不用正文细字；暴击可以停留更久而不是更大。

**反例与玩家评价**

- 高攻速下逐击飘字，数字摞成一列盖住敌人和弹幕。
  - 评价与证据（依据：推断）：本地评测去重后按「伤害数字 / 跳字 / damage numbers」计数只有 6 条 / 6 款——做对了玩家不提，做错了也很少被点名；这条主要是设计推论（Riot 清晰度准则、06 文档 A2）。
- 暴击、治疗、护盾只靠颜色区分，色弱玩家与亮色特效下都分不清。
  - 评价与证据（依据：推断）：评测统计未单列此项；对应 Game Accessibility Guidelines「关键信息不能只靠颜色」。
- 细字无描边，在雪地、沙地、闪光特效上读不出。
  - 评价与证据（依据：文献）：评测证据不足：原来引用的 Valheim「字太小」3 条，复核后说的是画面 / 夜晚看不清，不是伤害数字；依据改为 Game Accessibility Guidelines 与 06 文档 A16（任何背景上 4.5:1、描边或投影兜底）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：伤害数字用带描边的像素字，暴击换颜色并多一圈外框。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：关键伤害用倾斜大字与色块底，普通伤害小而淡。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：干脆不飘字，伤害合并成 Boss 条末端的一个累计数。

**出处**

- [Shacknews, How to change damage numbers in Apex Legends](https://shacknews.com/article/110042/how-to-change-damage-numbers-in-apex-legends)（S099）：伤害数字有关闭、累计、逐击飘字、两者都显示四档；颜色区分爆头、护盾与本体受伤。
- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：关键信息除了颜色，还要有形状、文字或图标等第二种通道。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：注意力应按事件的影响大小分配，噪声会叠加——同样适用于数字的大小与数量。

**可演示的对比**

- **逐击细数字摞成一列 vs 合并成一个描边大数**（单变量对照；内容包：survivors · 深海潜航；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值变化：自动 → 数字滚动；文字可读辅助：无 → 文字描边；数字字体：同正文 → 大号展示数字
  - 配套改动：特效遮挡检查：关 → 开
  - 看什么：A 每下一个细数字，连击时摞成一列、在亮色特效上看不清；B 合并成一个跳动的描边大数字。打开特效遮挡检查，看敌人有没有被数字挡住。注：合并跳数用的是全局 mo.valueChange = countUp（渲染器暂不按元素读），血条也会按计数方式变化。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-damage-number-legibility#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survivors` `cnt.screen=screen.hud` `el.feedback.form=floatNumbers` `el.feedback.attachTo=target` `chk.demo=combatBeat`
  - A：`typ.legibility=none` `typ.numerals.family=body` `chk.fxOcclusion=false` `mo.valueChange=auto`
  - B：`typ.legibility=outline` `typ.numerals.family=display` `chk.fxOcclusion=true` `mo.valueChange=countUp`

  </details>

#### P-value-change-visible

**数值变化要「看得见差值」：真值立即落位，差值层按角色选拖尾、分段或滚动**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、工厂与自动化、格斗 · 相关：[P-glance-encoding](#p-glance-encoding)、[P-contextual-hud](#p-contextual-hud) · 风格变体：`fam.dark-hairline`、`fam.candy`、`fam.crt`

**要解决的问题**

血量、资源瞬间跳到新值，玩家来不及知道刚才掉了多少；整条做成慢慢下降，读数又滞后，玩家以为还有血。零 HUD 的游戏还要决定：数值变化时要不要让 HUD 短暂出现。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 瞬变：读数优先 | <abbr title="mo.valueChange=instant">数值变化 = 瞬变</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 策略、经营、自动化：数字要拿来比较和计算，任何过渡都是误差（Mini Metro、Factorio、Beltmatic）。 | 变化不显眼，重要变化要靠颜色或图标另行提示。 | Mini Metro（steam:287980）、Factorio（steam:427520）、Beltmatic（steam:2674590） |
| 延迟拖尾：真值立即落，亮色差值段随后追上 | <abbr title="cmp.gauge@el.vitals=bar">数值图形（生命 / 护盾 / 体力） = 横条</abbr>；<abbr title="el.threat.form=bossBar">敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字</abbr>；<abbr title="mo.valueChange=trail">数值变化 = 延迟拖尾</abbr>（渲染说明：mo.valueChange@el.vitals 改写为全局 mo.valueChange（渲染器只读全局值）；mo.valueChange@el.threat 已移除（渲染器不读这个按元素覆盖）） | 动作、格斗、魂类的血条与 Boss 条：一串连击掉了多少一眼可见（探索台的格斗与魂类布局默认就是拖尾）。 | 两层进度条 + 计时器；拖尾追的时机要调，连续受击时不能永远追不上。 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）、Lies of P（steam:1627720 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） |
| 分段跳：一格一格地掉 | <abbr title="cmp.gauge@el.vitals=segmented">数值图形（生命 / 护盾 / 体力） = 分段格</abbr>；<abbr title="mo.valueChange=segment">数值变化 = 分段跳</abbr>（渲染说明：mo.valueChange@el.vitals 改写为全局 mo.valueChange（渲染器只读全局值）） | 血量少而离散（3–10 格）的平台、像素动作、英雄射击：每一格就是一次失误，掉格本身就是反馈（Hollow Knight 面具、Hyper Light Drifter 血格、Overwatch 分段血块、DMC5 分段血条）。 | 精细伤害无法表达；格数一多就退化成普通条。 | Hollow Knight（steam:367520）、Hyper Light Drifter（steam:257850）、Overwatch（iig:overwatch）、Devil May Cry 5（steam:601150 · 据已知描述）、Cuphead（steam:268910 · 据已知描述） |
| 数字滚动：加钱、加分、结算 | <abbr title="el.resources.form=bigNumber">资源 / 货币：画法 = 大号数字</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>（渲染说明：mo.valueChange@el.resources 改写为全局 mo.valueChange（渲染器只读全局值）） | 增量、构筑、得分类：滚动的过程就是奖励（Cookie Clicker、Balatro）。 | 滚动期间读数不准；必须能被按键立即完成。 | Cookie Clicker（steam:1454400）、Balatro（steam:2379780）、BIT.TRIP RUNNER（steam:63710） |
| 变化即出现：数值一变 HUD 才短暂显现 | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="el.vitals.visibility=contextual">生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="el.vitals.valueLabel=delta">生命 / 护盾 / 体力 · 数值标注 = 变化量</abbr> | 零 HUD / 情境显现的探索作：平时干净，掉血、拾取、用弹药时才出现（天际的三条、Ori 的光点、生化危机村庄、FEZ、神秘海域）。 | 显现时长太短会错过；玩家无法随时查询，要配按键呼出。 | FEZ（steam:224760）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Ori and the Blind Forest DE（steam:387290 · 据已知描述）、Resident Evil Village（steam:1196590 · 据已知描述）、UNCHARTED: Legacy of Thieves Collection（steam:1659420 · 据已知描述） 等 6 款 |

**经验法则**

- 真值在 0.1 秒内落位（Nielsen 的「即时」阈值），装饰性过渡只加在差值层。
- 拖尾：先停约 0.3–0.6 秒再追，让一串连击累成一段；追的速度要快于下一次受击的间隔（经验值）。
- 掉血和回血用不同表现：掉血留亮色差值段，回血先显示半透明的预回复段再填满。
- 数字滚动的时长随数额的对数增长并设上限，按键立即完成。
- 离散小数值（≤ 10）用分段或图标，不做平滑；需要精确比较的读数不做任何过渡。

**反例与玩家评价**

- 整条血条平滑下降，真值本身被动画延迟——玩家按读数判断还剩血，实际已经濒死。
  - 评价与证据（依据：推断）：评测统计无直接计数；「UI 卡顿 / 响应慢」去重后 ≥ 2 条的只有 Cyberpunk 2077、DEATHLOOP 两款，只能说明玩家对界面跟不上操作有感觉，证据很弱。
- 拖尾停顿太久或追得太慢：连续受击时差值段一直挂着，失去「刚才这一下」的意义。
  - 评价与证据（依据：推断）：无评测计数（经验规则）。
- 情境显现的条只闪一下就消失，或者一直不出现，玩家不知道自己状态。 例：Ghost of Tsushima DC（steam:2215430 · 据已知描述）。
  - 评价与证据（依据：评测）：R3：零 HUD 的代价主要表现为「提示 / 引导不清」（去重后 41 款 ≥ 2 条，Scorn 与 Kingdom Two Crowns 各 7 条最多）与「地图难用」；状态读数本身被点名得少。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：细条拖尾段用暖黄或白，追上时间短。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：心形一格一格地碎掉（分段），配一个小跳动。
- CRT 终端（`fam.crt`，皮肤 `skin.terminal`）：CRT 终端：数字滚动计数，像老式计数器翻牌。
- 17 号图谱反查到的相关家族：`fam.raw-web`

**出处**

- [Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）](https://www.nngroup.com/articles/response-times-3-important-limits/)（S144）：约 0.1 秒内的响应让人觉得即时，结果本身就是反馈；约 1 秒内思路不断；超过 10 秒必须给进度与取消。
- [Deadline Fighter 开发日志 3（itch.io，独立开发者实践记录）](https://elvenji.itch.io/deadline-fighter/devlog/957932/devlog-3-mejorando-enemigos-e-interfaz)（S106）：作者用「两层条 + 计时器」做延迟血条，发现它让受击更容易被察觉、画面也更好看。属于实践记录，不是研究。
- [Material Components for Android, Motion（Material 3 动效文档）](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)（S123）：动画覆盖的面积或距离越大，时长越长，才能让感知速度一致——数字滚动与拖尾时长也应随变化量增长。

**可演示的对比**

- **瞬变只看结果 vs 拖尾留住这一串掉了多少**（单变量对照；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值变化：瞬变 → 延迟拖尾
  - 看什么：连续三次受击：A 只能看到最终剩余；B 的亮色差值段留住了这一串连击一共掉了多少，然后才追上。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-value-change-visible#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.screen=screen.hud` `cnt.elements=el.vitals+el.threat` `cmp.gauge@el.vitals=bar` `chk.demo=combatBeat`
  - A：`mo.valueChange=instant`
  - B：`mo.valueChange=trail`

  </details>

#### P-shake-hitstop

**震屏与顿帧：短、快速衰减、按强度分级、设上限、HUD 不跟着抖**

> 适用品类：动作与 Roguelite、横版平台、射击、卡牌与桌面、格斗 · 相关：[P-juice-budget](#p-juice-budget)、[P-flash-motion-comfort](#p-flash-motion-comfort) · 风格变体：`fam.comic`、`fam.dark-hairline`、`fam.tabletop`

**要解决的问题**

震屏和顿帧是「重量感」最便宜的来源，但过量或持续会让人晕、遮挡判断，HUD 文字跟着抖会读不出；割草和多人混战里，每下都顿帧会把节奏拖垮。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 不震：画面保持稳定 | <abbr title="mo.juice=0.05">反馈强度 = 0.05</abbr>；<abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr> | 回合制、策略、经营、需要精确读格子与读图的游戏。 | 需要其它通道表达分量（音效、单元格高亮、单位动画）。 | Mini Metro（steam:287980）、Dorfromantik（steam:1455840）、Wingspan（steam:1054490） |
| 微震 + 短顿帧：只在命中与受击 | <abbr title="mo.juice=0.35">反馈强度 = 0.35</abbr>；<abbr title="rel.metaFx=hitFlash">元 UI 屏幕效果 = 闪白</abbr>（渲染说明：mo.juice@el.vitals 已移除（渲染器不读这个按元素覆盖）） | 大多数动作、平台、射击的默认档（Dead Cells、Hades、Katana ZERO、Hyper Light Drifter）。 | 数值要逐武器调；没有顿帧的投射物和多段攻击要另设更短的档位。 | Dead Cells（steam:588650）、Hades（steam:1145360）、Katana ZERO（steam:460950）、Hyper Light Drifter（steam:257850） |
| 重击分级：普通 / 重击 / 终结各一档，终结加定格 | <abbr title="mo.juice=0.7">反馈强度 = 0.7</abbr>；<abbr title="rel.metaFx=hitFlash">元 UI 屏幕效果 = 闪白</abbr>；<abbr title="el.feedback.form=rating">命中反馈 / 连击：画法 = 评价字（Good! / Perfect）</abbr>（渲染说明：mo.juice@el.vitals 已移除（渲染器不读这个按元素覆盖）） | 风格动作与写实动作的重攻击、处决、Boss 最后一击（DMC5、God of War 系列）。 | 需要事件分级表；多人同屏时顿帧会让别人的操作也停（Sakurai 在大乱斗里因此把顿帧压短）。 | Devil May Cry 5（steam:601150 · 据已知描述）、God of War（steam:1593500 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 只抖 UI 元素，不动镜头 | <abbr title="mo.juice=0.2">反馈强度 = 0.2</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>（渲染说明：mo.juice@el.feedback 已移除（渲染器不读这个按元素覆盖）；mo.valueChange@el.feedback 改写为全局 mo.valueChange（渲染器只读全局值）） | 卡牌、回合制、构筑类想要爽感又不能晃牌桌：抖的是分数和数字本身（Balatro 结算时数字燃烧抖动、Cookie Clicker 的数字跳动）。 | 抖动中的数字读不准，抖完必须停稳。 | Balatro（steam:2379780）、Cookie Clicker（steam:1454400） |

**经验法则**

- 震屏用 trauma 模型：事件往一个 0–1 的值上累加，实际幅度 = trauma 的平方，随时间快速衰减，位移由平滑噪声驱动而不是纯随机（Eiserloh）。
- 震屏只作用于游戏镜头，HUD 默认不抖（探索台里写 mo.juice@el.vitals = 0）；需要 UI 抖时只抖单个元素。
- 顿帧按攻击强度分级并设上限；投射物与多段攻击更短；同屏敌人很多（割草）时减少或取消。
- 顿帧期间让受击者抖动、幅度由大到小，地面左右抖、空中上下抖（Sakurai）。
- 给玩家 0 / 50% / 100% 三档，默认不一定是 100%（Celeste 1.4 新增 50% 档并设为默认）。

**反例与玩家评价**

- 震屏作用到整个 UI 层，血条、准星和文字跟着晃。 例：Return of the Obra Dinn（steam:653530）、Firewatch（steam:383870）、Portal 2（steam:620）、Detroit: Become Human（steam:1222140）、Stray（steam:1332010）、BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：本地评测去重后，直接说「震屏」的只有 7 条（7 款），但「晕 / motion sickness」一类有 204 条（97 款），集中在第一人称和镜头运动多的作品（Stray 14、Portal 2 8、Return of the Obra Dinn 8、BioShock Infinite 6、Firewatch 6、Detroit 6）——玩家描述结果而不是原因。Overwatch 2 也把镜头抖动和 HUD 抖动分成了两个选项。
- 持续性震屏（环境地震、低血时一直抖）或每个小怪都顿帧，节奏被拖慢。
  - 评价与证据（依据：推断）：评测无直接计数；Sakurai 指出无双类游戏几乎不用顿帧，因为会拖慢一次打一大片的节奏。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：顿帧时画面定格成一格漫画、加速度线，HUD 不动。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：只有重击才轻微震屏，HUD 固定在屏幕层不跟着抖。
- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）：桌游实物：不震镜头，只让被击中的棋子或卡牌抖一下。

**出处**

- [Squirrel Eiserloh, Math for Game Programmers: Juicing Your Cameras With Math（GDC 2016；Game Developer 报道）](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)（S100）：讲震屏的几种类型与镜头跟随的数学；常见实现是 trauma 值累加、平方后作为幅度、随时间衰减、用噪声驱动位移。
- [Bevy 官方示例 2D screen shake（按该演讲实现）](https://bevy.org/examples/camera/2d-screen-shake/)（S115）：trauma 在 0–1 之间并随时间衰减；只在渲染时偏移镜头，游戏逻辑不受影响；位移有上限、由噪声函数驱动。
- [Jan Willem Nijman（Vlambeer）对 Nuclear Throne 一发手枪的反馈拆解（Rock Paper Shotgun 访谈的转述）](https://infovore.org/?p=5275)（S091）：震屏值每次射击累加、快速衰减；每次命中暂停约 10–20 毫秒——顿帧以毫秒计，而不是以秒计。
- [樱井政博 Famitsu 专栏 Vol.490 关于顿帧（Source Gaming 非官方译文）](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)（S103）：攻击越强顿帧越长但设上限；投射物顿帧更短；受击者在顿帧中抖动、幅度递减，地面左右抖、空中上下抖；抖动幅度随镜头距离调整。
- [John Nesky, 50 Camera Mistakes（GDC 2014）](https://gdcvault.com/play/1021262/50-Camera)（S196）：震屏过度、镜头随步伐上下晃都被列为镜头错误（编号据二手转述，见 06 文档）。
- [Celeste v1.4.0.0 更新日志](https://maddymakesgamesinc.itch.io/celeste/devlog/237097/v1400-changelog)（S105）：新增 50% 震屏档并设为默认；同时已有光敏模式。

**可演示的对比**

- **每下闪白大震、血条跟着晃 vs 轻震、血条不动**（单变量对照；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：反馈强度：0.95 → 0.4；元 UI 屏幕效果：闪白 + 受击红边 → 受击红边
  - 看什么：A 每一下都闪白、大幅震，血条也跟着晃；B 镜头轻震、血条不动、只留受击红边。连续五次受击后，比较哪一边还能马上读出剩余血量。注：「血条不跟着抖」需要渲染器按元素读 mo.juice，现在只读全局值，所以 B 只表现为整体轻震（见参数缺口 G-motion-per-element）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-shake-hitstop#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.hud` `chk.demo=combatBeat`
  - A：`mo.juice=0.95` `rel.metaFx=hitFlash+hurtVignette`
  - B：`mo.juice=0.4` `rel.metaFx=hurtVignette`

  </details>

#### P-motion-personality

**动效语言是皮肤的一部分：缓动、时长、帧率、入场方式随美术风格成套切换**

> 适用品类：所有品类 · 相关：[P-channel-borrowing](#p-channel-borrowing)、[P-material-from-world](#p-material-from-world)、[P-medium-constraints](#p-medium-constraints) · 风格变体：`fam.ink`、`fam.persona-collage`、`fam.retro-os`

**要解决的问题**

换了皮肤但动效还是同一套淡入缓出，风格就只在静帧里成立；反过来，把漫画式砸入放进冷静的瑞士风界面，或给水墨界面配故障闪现，都会出戏。探索台现有 38 套皮肤里，重装饰雕花框、线描花饰、暗色细线、暗金金属牌、装饰艺术、合成波 6 套没有任何 mo.* 取值，动效完全落到默认值。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 瑞士 / 军事 / 数据表：硬切、短、线性 | <abbr title="mo.enter=cut">入场动效 = 硬切</abbr>；<abbr title="mo.duration=0.1">动效时长 = 0.1</abbr>；<abbr title="mo.easing=linear">缓动性格 = 线性</abbr>；<abbr title="ix.focus=invert">导航焦点表现 = 底色反白</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 信息即审美的界面：CONTROL 的黑底白字表格、MGSV 的等宽结算表、Mini Metro。动效越少越显得精确。 | 界面切换缺少空间感，层级关系要靠版式表达。 | CONTROL（steam:870780）、METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Mini Metro（steam:287980） |
| 像素：线性、一拍二、打字机 | <abbr title="mo.easing=linear">缓动性格 = 线性</abbr>；<abbr title="mo.frameRate=onTwos">UI 动画帧率 = 一拍二（12fps）</abbr>；<abbr title="mo.textReveal=typewriter">文字出现 = 打字机逐字</abbr>；<abbr title="vis.pixelScale=world">UI 像素化 = 与世界同网格</abbr> | 像素画面：UI 的运动也落在像素网格和低帧率上，平滑缓动会和世界的动画节奏打架。 | 低帧率动效读起来更「卡」，按钮按下反馈要更明显来补偿。 | Stardew Valley（steam:413150）、Dead Cells（steam:588650）、Hyper Light Drifter（steam:257850）、Katana ZERO（steam:460950） |
| 墨与纸：笔刷擦出、卷轴展开、慢淡入 | <abbr title="mo.enter=inkSpread">入场动效 = 墨晕 / 笔刷擦出</abbr>；<abbr title="mo.duration=0.5">动效时长 = 0.5</abbr>；<abbr title="mo.easing=easeOut">缓动性格 = 缓出</abbr>；<abbr title="vis.edge=brush">边缘处理 = 笔触</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr> | 国风、和风、手抄本：招式名的巨型竖排书法（Wandering Sword）、对马岛的毛笔笔触面板。 | 笔刷遮罩需要素材；0.5 秒级的入场不适合高频菜单，只用在标题、章节和演出。 | Wandering Sword（steam:1876890）、我自为道（竞技世界）（gameui:11870）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |
| 科幻：扫描开机、乱码解码 | <abbr title="mo.enter=boot">入场动效 = 扫描开机</abbr>；<abbr title="mo.textReveal=scramble">文字出现 = 乱码解码</abbr>；<abbr title="ast.fx=scanlines">叠加特效层 = 扫描线</abbr> | 科幻 HUD、全息、终端：界面像设备一样「启动」（Cyberpunk 2077、星穹铁道的切角面板）。 | 乱码解码会推迟可读时间；高频文本应改成淡入。 | Cyberpunk 2077（steam:1091500）、崩坏：星穹铁道（gameui:8283）、Dead Space（steam:1693980） |
| 漫画 / Persona：斜切划入、砸入、回弹 | <abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr>；<abbr title="mo.easing=overshoot">缓动性格 = 回弹</abbr>；<abbr title="mo.duration=0.2">动效时长 = 0.2</abbr>；<abbr title="vis.skew=-8">倾斜角 = -8</abbr>；<abbr title="mo.juice=0.85">反馈强度 = 0.85</abbr> | 拼贴、倾斜动感、漫画风：Persona 5 / Metaphor 的斜切菜单、Esports Godfather 的斜切横幅、DMC5 的砸入。动效是这类风格最重要的识别点。 | 每个菜单往往要单独设计与编程（Metaphor 的导演说过这很费工）；早期 Persona 5 的 UI 动画曾多到盖住画面，后来才减量。 | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、Esports Godfather（steam:1278540）、Devil May Cry 5（steam:601150 · 据已知描述） |
| 圆润友好 / 糖果：弹簧、缩小回弹、轻摇 | <abbr title="mo.easing=spring">缓动性格 = 弹簧</abbr>；<abbr title="ix.press=squash">按下反馈 = 缩小回弹</abbr>；<abbr title="mo.idle=sway">环境待机动效 = 轻摇</abbr>；<abbr title="vis.corner=round">转角 = 圆角</abbr> | 休闲、治愈、派对：按钮像软糖一样被按下、弹回（例子按参考卡的皮肤家族归类，动效未在静帧中直接观察）。 | 回弹量过大显得轻浮；待机轻摇会分散阅读，长文本界面要关掉。 | Spiritfarer（steam:972660）、Bloons TD 6（steam:960090）、蛋仔派对（网易）（gameui:3055） |

**经验法则**

- 每套皮肤至少定义 5 个动效 token：入场方式（mo.enter）、时长（mo.duration）、缓动（mo.easing）、文字出现（mo.textReveal）、按下反馈（ix.press）；导出时与颜色、字体同级。
- 时长随移动距离和面积增长：小控件约 50–200 ms、中等面板 250–400 ms、整屏 450 ms 以上（Material 的 short / medium / long 档）。
- 回弹量随题材：严肃题材为 0；友好题材约 15%（细微）到 30%（明显）；多数界面不超过 0.4（Apple 的弹簧建议）。
- 帧率跟画面走：画面一拍二，UI 动画也一拍二（派生规则 D-frame）。
- 一套 UI 的入场方式不超过两种：日常一种、演出一种。

**反例与玩家评价**

- 只换静态皮肤、不换动效：几套风格共用同一种淡入缓出，切换皮肤时「动起来都一样」。
  - 评价与证据（依据：背景）：静帧和评测都很难直接反映动效风格，没有评测计数；证据来自本工具 38 套皮肤预设的盘点（6 套没有动效取值）。旁证：动效最重的 Persona 5 Royal 在 R3 里提到 UI 的 79 条评测有 72 条是好评，说明强风格动效做成体系时会被当成卖点。
- 动画多而长，盖住画面、拖慢操作。 例：Persona 5 Royal（steam:1687950）。
  - 评价与证据（依据：评测）：本地评测去重后按「跳过动画 / 动画太长」一类计数只有 13 条（10 款，FINAL FANTASY VIII、Little Nightmares、Red Dead Redemption 2 各 2 条），这一类更多体现在开发史（06 文档引 Persona 5 早期减少 UI 动画）而不是评测里。
- 回弹或弹簧用在严肃、恐怖、魂类题材上，界面显得轻佻。
  - 评价与证据（依据：推断）：评测统计无直接计数（风格匹配规则）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：入场用墨晕擦出、文字淡入，缓动慢而柔。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：斜切划入、回弹、硬切，一拍二的帧率。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：窗口硬切弹出、没有缓动，像 1995 年的系统。
- 17 号图谱反查到的相关家族：`fam.aero`、`fam.persona-collage`、`fam.slant`、`fam.synthwave`、`fam.y2k`、`fam.cyberpunk`

**出处**

- [Apple WWDC23, Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/)（S194）：弹簧动画用「时长 + 回弹」两个参数描述；默认回弹为 0，约 15% 细微、约 30% 明显，多数 UI 不宜超过 0.4；回弹量要与产品性格一致；弹簧可保留速度、被中途打断而不跳变。
- [Material Components for Android, Motion（Material 3 动效文档）](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)（S123）：时长分 short 50–200、medium 250–400、long 450–600、extra long 700–1000 毫秒；面积或距离越大用越长的档；标准缓动用于功能性动效，强调缓动用于更有表现力的动效。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：早期 UI 动画多到遮挡画面，团队减少动画并调整文字方向，在风格与可用性之间取平衡（06 文档 [47]）。
- [Push Square, 桥野桂谈 Metaphor: ReFantazio / Persona 的菜单制作](https://www.pushsquare.com/news/2024/10/making-metaphor-refantazio-personas-immaculate-menus-is-really-annoying-says-director)（S096）：每个菜单都有独立设计与独立程序，非常耗时；Persona 5 的异形菜单一开始也很难读——强风格动效的成本主要在工时与可读性。
- [Game Developer, The 12 principles of animation in video games](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)（S084）：迪士尼十二原则（预备、跟随、挤压拉伸、缓入缓出等）在游戏里要为响应性让步：预备动作太长会让操作发软。

**可演示的对比**

- **水墨面板配故障闪现 vs 配墨晕擦出**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：国风水墨 / 墨笔；循环播放入场）
  - 承载原则的参数：动效时长：自动 → 0.5；缓动性格：回弹 → 缓出；入场动效：故障闪现 → 墨晕 / 笔刷擦出；文字出现：乱码解码 → 淡入
  - 看什么：同一张水墨笔触、书法标题的对话框：A 用故障闪现 + 乱码解码 + 回弹进场，静帧没问题，一动就出戏；B 用墨晕擦出 + 淡入文字，动起来才是同一种风格。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-motion-personality#d0` · 皮肤 `skin.ink`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.dialogue` `vis.edge=brush` `typ.display.family=calligraphy` `chk.demo=dialogue`
  - A：`mo.enter=glitchIn` `mo.textReveal=scramble` `mo.easing=overshoot` `mo.duration=auto`
  - B：`mo.enter=inkSpread` `mo.textReveal=fade` `mo.easing=easeOut` `mo.duration=0.5`

  </details>

#### P-transition-frequency

**转场长度与使用频率成反比：高频界面近乎瞬时，稀有节点才给仪式**

> 适用品类：所有品类 · 相关：[P-pause-world-state](#p-pause-world-state)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-result-tally](#p-result-tally) · 风格变体：`fam.persona-collage`、`fam.parchment`、`fam.crt`

**要解决的问题**

精心做的转场到第一百次打开背包时就成了等待；章节、Boss、关键事件这类稀有时刻又需要停顿来标记分量。转场类型还承担「新界面和旧界面是什么关系」的信息。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 瞬切 / 极短：暂停、背包、地图来回切 | <abbr title="mo.transition=useEnter">界面转场 = 用新界面的入场动效</abbr>；<abbr title="mo.enter=cut">入场动效 = 硬切</abbr>；<abbr title="mo.duration=0.1">动效时长 = 0.1</abbr>；<abbr title="flow.stacking=replace">叠层表现 = 替换上一屏</abbr> | 一局里出现几十上百次的界面；工厂、经营、策略类的面板切换（Factorio、Mini Metro）。 | 缺少空间关系，迷路感要靠稳定的版式和导航补。 | Factorio（steam:427520）、Mini Metro（steam:287980） |
| 下层后退：叠层时保留上下文 | <abbr title="flow.stacking=pushBack">叠层表现 = 下层缩小后退</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="rel.dim=0.5">压暗强度 = 0.5</abbr>；<abbr title="rel.sceneBlur=8">背后虚化 = 8</abbr>；<abbr title="mo.enter=slide">入场动效 = 滑入 / 推移</abbr>；<abbr title="mo.duration=0.25">动效时长 = 0.25</abbr> | 弹出层、详情、事件抉择：玩家要知道自己还在原来的位置，背后场景缩小、压暗、虚化（Frostpunk 的事件抉择压暗背景；The Last of Us Part I 打开背包时游戏不暂停，角色蹲下翻包，背后是实时场景）。 | 实时背景要额外渲染；背后是否继续运行要和暂停逻辑一致。 | Frostpunk（steam:323190）、The Last of Us Part I（steam:1888930 · 据已知描述） |
| 镜头推进到物件：进入的是世界里的东西 | <abbr title="mo.transition=zoomInto">界面转场 = 镜头推进到物件</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="ast.container=book">场景容器 = 书</abbr> | 叙事内界面：手抄本、牌桌、设备（Potion Craft 整屏是一本手抄本、Inscryption 的牌桌就是界面、Dead Space 投影在角色面前的全息菜单）。 | 推进镜头时长难以压到很短，高频使用时要提供快捷直达。 | Potion Craft: Alchemist Simulator（steam:1210320）、Inscryption（steam:1092790）、Dead Space（steam:1693980） |
| 仪式性大字转场：章节、Boss、关键事件 | <abbr title="el.notify.form=band">通知 / 大字提示：画法 = 整屏横贯带大字</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="mo.duration=0.8">动效时长 = 0.8</abbr>；<abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr>；<abbr title="el.title.form=titleCard">标题 / LOGO：画法 = 章节标题卡</abbr> | 一局只出现几次的节点：暗黑地牢 2 的关键事件整屏黑底大字、Alan Wake 像电视剧片头的章节标题、UnMetal 的 Boss 战前 VS 立绘切入。 | 第二次起要能跳过；多次出现会贬值。 | Darkest Dungeon II（steam:1940340）、UnMetal（steam:1203710）、Wandering Sword（steam:1876890）、Alan Wake（steam:108710 · 据已知描述） |
| 可加速的重复演出：倍速与跳过 | <abbr title="el.gameSpeed.form=speedBar">倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条</abbr>；<abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr>；<abbr title="mo.duration=0.2">动效时长 = 0.2</abbr> | 回合制和自动战斗里每回合都播的攻击动画：手游样本 39 款战斗界面里 18 款没有摇杆、靠倍速 / 托管 / 跳过推进（15 文档）。 | 加速后反馈层次被压扁，要保证关键事件（暴击、阵亡）在倍速下仍可辨认。 |  战神之决战西伯利亚（gameui:7312）、铸仙之境（测试）（gameui:7082）、奇缘之旅（gameui:6904）、Darkest Dungeon（steam:262060） |

**经验法则**

- 用「每局出现次数 × 时长」估算总等待：一局出现 50 次以上的界面，进入时长 ≤ 150 ms 或直接切（经验值）。
- 动画开始时就接受输入：可打断、可连按穿透，不要等动画播完才响应。
- 稀有节点（章节、Boss、结算）可以给 0.8–2 秒，但第二次起允许跳过或加速。
- 转场类型表达关系：进入世界物件用推进（zoomInto），同级切换用交叉淡化，弹出层用淡入（对应 Material 的容器变换 / 淡出淡入 / 淡入）。
- 转场期间背后画面冻结还是继续（rel.behind）要和游戏是否暂停一致。

**反例与玩家评价**

- 高频界面用长转场：每次打开背包都要 0.6 秒以上的飞入或翻书，输入在动画播完前不响应。 例：Cyberpunk 2077（steam:1091500）、DEATHLOOP（steam:1252330 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「UI 卡顿 / 响应慢」去重后 ≥ 2 条的只有 2 款：Cyberpunk 2077 2、DEATHLOOP 2；Prince of Persia、Half-Life: Alyx、Enshrouded、弈仙牌各 1 条（关键词粗筛，也混有性能卡顿）。
- 不可跳过、不可加速的重复演出。 例：Darkest Dungeon（steam:262060）。
  - 评价与证据（依据：评测）：本地评测去重后「跳过动画 / 动画太长」13 条 / 10 款（FINAL FANTASY VIII、Little Nightmares、Red Dead Redemption 2 各 2 条，Darkest Dungeon II 1 条）；手游样本里倍速 / 跳过按钮是自动战斗界面的标配。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：高频菜单只用 0.1 秒的斜切，华丽转场只留给章节节点。
- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：羊皮纸任务书：翻页动画只给打开日志，切页签直接换内容。
- CRT 终端（`fam.crt`，皮肤 `skin.terminal`）：CRT 终端：开机特效只在第一次，之后硬切。
- 17 号图谱反查到的相关家族：`fam.persona-collage`、`fam.cinematic-letterbox`、`fam.theatre-stage`

**出处**

- [Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）](https://www.nngroup.com/articles/response-times-3-important-limits/)（S144）：0.1 秒内感觉即时，1 秒内思路不断，10 秒是注意力上限——高频界面的转场应落在第一档。
- [Material Components for Android, Motion（Material 3 动效文档）](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)（S123）：容器变换用于从一个元素展开成新界面，共享轴用于有前后 / 层级关系的页面，淡出淡入用于没有强关系的切换，淡入用于屏内出现的弹窗与菜单。
- [W3C, Understanding WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)（S160）：由交互触发的非必要运动动画应能关闭；示例之一就是在减少动效开启时关掉翻页转场。

**可演示的对比**

- **0.9 秒翻书打开背包 vs 0.15 秒淡入**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线）；循环播放入场）
  - 承载原则的参数：动效时长：0.9 → 0.15；入场动效：翻页 / 开书 → 淡入；界面转场：用新界面的入场动效 → 交叉淡化
  - 看什么：连续开关背包五次：A 的翻书很漂亮，但第三次起就像在等；B 几乎瞬时。再想想这个界面一局要开多少次。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-transition-frequency#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.inventory`
  - A：`mo.enter=pageTurn` `mo.duration=0.9` `mo.transition=useEnter`
  - B：`mo.enter=fade` `mo.duration=0.15` `mo.transition=crossfade`

  </details>

#### P-event-callout-tiers

**事件通告分级：越大越少、越大越短，只有最高一级可以占据画面中心**

> 适用品类：探索与冒险、动作与 Roguelite、竞速与驾驶、角色扮演、策略与战术、建造与经营、生存与制作、格斗 · 相关：[P-title-lettering](#p-title-lettering)、[P-focal-periphery](#p-focal-periphery)、[P-juice-budget](#p-juice-budget) · 风格变体：`fam.ink`、`fam.broadcast`、`fam.typographic-hud`

**要解决的问题**

拾取、任务更新、升级、击杀、Boss 登场都想被看见。全做成横贯大字就互相抢、遮挡战斗；全做成小字又会错过关键节点。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 滚动消息列：低优先级、可堆叠 | <abbr title="el.notify.form=feed">通知 / 大字提示：画法 = 滚动消息列</abbr>；<abbr title="el.notify.screenAnchor=tl">通知 / 大字提示 · 屏幕锚点 = 左上</abbr>；<abbr title="mo.enter=slide">入场动效 = 滑入 / 推移</abbr>；<abbr title="ix.blocking=none">阻断性 = 非阻断</abbr> | RTS、殖民模拟、生存：大量小事件需要留痕、可回看（Tooth and Tail 左上消息列）。 | 容易被忽略；需要上限和淡出。 | Tooth and Tail（steam:286000） |
| 拾取小字 / 提示卡：单条、短暂 | <abbr title="el.notify.form=pickupText+toast">通知 / 大字提示：画法 = 小字道具名 + 圆角提示卡</abbr>；<abbr title="ix.dismiss=timed">本屏怎么结束 = 自动消失</abbr>；<abbr title="el.notify.screenAnchor=tl">通知 / 大字提示 · 屏幕锚点 = 左上</abbr> | 收集、拾取、轻量成就（Red Dead Redemption 的提示卡、Rayman Origins 和 FEZ 的收集数在拾取时浮出）。 | 多条同时到达时需要排队与合并。 | Red Dead Redemption（steam:2668510）、FEZ（steam:224760）、Rayman Origins（steam:207490 · 据已知描述） |
| 横幅：任务开始 / 完成、奇观落成 | <abbr title="el.notify.form=banner">通知 / 大字提示：画法 = 横幅</abbr>；<abbr title="el.notify.screenAnchor=tc">通知 / 大字提示 · 屏幕锚点 = 上中</abbr>；<abbr title="mo.enter=slide">入场动效 = 滑入 / 推移</abbr> | 中等分量的里程碑（文明 6 的奇观横幅、原神任务开始的半透明横幅、Destiny 2 左下的 NEW MISSION 横幅）。 | 同一时刻只能有一条，要有队列。 | Sid Meier’s Civilization® VI（steam:289070）、原神（米哈游）（gameui:1691）、Destiny 2（steam:1085660） |
| 整屏横贯大字带：Boss 登场、战斗开始、关键事件 | <abbr title="el.notify.form=band">通知 / 大字提示：画法 = 整屏横贯带大字</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="mo.duration=0.6">动效时长 = 0.6</abbr>；<abbr title="ix.blocking=none">阻断性 = 非阻断</abbr> | 一局个位数次的节点（暗黑地牢 2 的关键事件大字、Wandering Sword 的招式名书法大字、手游的战斗开始 / 首领登场大字、Crashday 的特技加分大字）。 | 遮挡最多；只要出现频率一高就贬值。 | Darkest Dungeon II（steam:1940340）、Wandering Sword（steam:1876890）、半世界之旅（gameui:6951）、小小英雄-优化版（4399）（gameui:12994）、Crashday Redline Edition（steam:508980） |
| 立绘切入：角色的大招与对决 | <abbr title="el.notify.form=cutIn">通知 / 大字提示：画法 = 立绘切入</abbr>；<abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr>；<abbr title="mo.duration=0.4">动效时长 = 0.4</abbr> | 角色驱动的 RPG 与动作：Persona 5 对话与总攻击的立绘切入、UnMetal 的 VS 立绘。 | 需要立绘素材；连续触发时要节流。 | Persona 5 Royal（steam:1687950）、UnMetal（steam:1203710） |

**经验法则**

- 分四级：消息列（可堆叠，上限 3–5 条）→ 拾取 / 提示卡（单条 1.5–3 秒）→ 横幅（同一时刻只有 1 条）→ 大字带 / 立绘切入（每局个位数次）。
- 级别越高越远离操作热区，并保持非阻断（ix.blocking = none）。
- 同类事件合并（显示「+3 木材」而不是三条）。
- 大字带的字体用皮肤的标题字（书法、漫画、哥特），这是风格最显眼的地方。
- 战斗中把非战斗通知延后到脱战再播。

**反例与玩家评价**

- 提示和过场文字压在战斗中心，或者阻断输入。 例：Ghost of Tsushima DC（steam:2215430 · 据已知描述）。
  - 评价与证据（依据：推断）：R3 无可靠计数：Ghost of Tsushima 原来被记为「挡视野」4 条，人工复核后 2 条在夸 UI 不杂乱、1 条说内容设计、1 条不相关；它另有 3 条评测夸 UI 简洁。这条反例保留为设计推论（字幕、提示、拾取同时出现时要排队与分级）。
- 最高级别被滥用：每次拾取、每个小任务都整屏大字。
  - 评价与证据（依据：推断）：评测统计无直接计数。
- 多条通知同时到达时互相覆盖，没有队列与合并。
  - 评价与证据（依据：推断）：评测统计无直接计数。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：最高一级是压在画面上的竖排书法大字，下面几级退成小字与印章。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播包装：信息流在侧边滚动，大事件才出斜切横幅与回放插播。
- 细字直压 · 排印叠层（`fam.typographic-hud`，皮肤 `skin.mono`）：排印叠层：地点名与章节名是大号细字直压画面，小通知是角落一行。
- 17 号图谱反查到的相关家族：`fam.slant`、`fam.comic`、`fam.synthwave`、`fam.broadcast`、`fam.mecha-warning`

**出处**

- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：注意力应与事件的分量成比例；视觉噪声会叠加，大型事件可以更吵，但吵是有代价的。
- [Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)（S170）：会自动更新、滚动或闪动的内容要允许玩家暂停、隐藏或控制更新频率；文字背后有动态画面时可提供不透明底板。

**可演示的对比**

- **拾取也横贯屏幕 vs 进左上消息列**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：通知 / 大字提示：画法：整屏横贯带大字 → 滚动消息列；通知 / 大字提示 · 屏幕锚点：中心 → 左上
  - 看什么：同样的「拾取 + 任务更新」：A 横贯屏幕挡住敌人，B 进入左上消息列。只把 Boss 登场这一类事件保留为大字带。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-event-callout-tiers#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud` `cnt.elements=el.vitals+el.notify+el.threat` `chk.demo=combatBeat`
  - A：`el.notify.form=band` `el.notify.screenAnchor=center`
  - B：`el.notify.form=feed` `el.notify.screenAnchor=tl`

  </details>

#### P-result-tally

**结算节奏：结论先行、逐项计数、评级盖章，全程一键完成**

> 适用品类：动作与 Roguelite、竞速与驾驶、卡牌与桌面、音游 · 相关：[P-transition-frequency](#p-transition-frequency)、[P-juice-budget](#p-juice-budget) · 风格变体：`fam.persona-collage`、`fam.desk-paperwork`、`fam.military`

**要解决的问题**

结算页一次堆满数字没有高潮；逐项演出又太慢，重复刷关时成为负担。失败与胜利用同一套庆祝动效也不对。（本原则只讲关卡 / 对局结算与评级，不涉及抽卡与奖励开箱。）

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 直接给表：数据型结算 | <abbr title="cnt.subtype=stats">界面子功能 = 数据统计 / 战报</abbr>；<abbr title="mo.reveal=direct">揭示方式 = 直接显示</abbr>；<abbr title="mo.valueChange=instant">数值变化 = 瞬变</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 冷静、数据驱动的作品：MGSV 的黑底等宽数据表、Mini Metro 的结算。 | 没有情绪高点；评级要靠排版（大字母）而不是动效。 | METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Mini Metro（steam:287980） |
| 逐项计数 + 字母评级盖章 | <abbr title="cnt.subtype=settle">界面子功能 = 结算</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>；<abbr title="el.rank.form=letter">名次 / 段位 / 评级：画法 = 评分字母（S / A / B）</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr> | 动作、潜行、节奏：评级字母是整段的重拍（DMC5 按字母评分、MGSV 大字母评级、Sayonara Wild Hearts 关末评级、The WereCleaner 钉在软木板上的星级报告）。 | 需要清晰的评分规则；重复刷关时必须可跳过。 | METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Sayonara Wild Hearts（steam:1122720）、The WereCleaner（steam:2795000）、Devil May Cry 5（steam:601150 · 据已知描述） |
| 累算过程即演出 | <abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr>；<abbr title="mo.juice=0.8">反馈强度 = 0.8</abbr>；<abbr title="typ.numerals.family=pixel">数字字体 = 像素数字</abbr>（渲染说明：mo.juice@el.timer 已移除（渲染器不读这个按元素覆盖）） | 得分驱动的构筑与街机：Balatro 每张牌依次加筹码、乘倍率，分数翻倍时数字燃烧——结算本身就是玩法高潮；BIT.TRIP RUNNER 的像素分数条。 | 演出与可读性冲突：玩家需要知道每一步加了多少；需要加速档。 | Balatro（steam:2379780）、BIT.TRIP RUNNER（steam:63710） |
| 胜负大字 + 少量数据 | <abbr title="cnt.subtype=victory">界面子功能 = 胜利 / 失败</abbr>；<abbr title="el.title.form=artTitle">标题 / LOGO：画法 = 艺术大字海报标题</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="ix.continueCue=keyGlyph">继续提示 = 按键图标</abbr> | 对战与关卡制：VICTORY / DEFEAT 斜体大字（AFK 2）、Squad Busters 的第一名大数字、通关 Well Done 大字（Star Blast）。 | 信息量少，想复盘的玩家要另进统计页。 | AFK 2：Journey（gameui:5744）、爆裂小队SquadBusters（gameui:13024）、Star Blast（gameui:4332） |

**经验法则**

- 结论先行：胜负 / 评级在第一秒就能看到（或先用剪影、空槽预告位置），细项随后计数。
- 计数总时长随项目数增长但设上限（例如 3 秒内），任意键立即完成全部计数，再按一次进入下一步。
- 评级字母用砸入 + 短震作为整段唯一的重拍。
- 失败页演出强度降到最低（mo.reward 0–1），给出「差在哪」的数据和重试入口。
- 数据型作品用等宽数字，计数时数位不跳动（typ.numerals.family = tabular）。

**反例与玩家评价**

- 不可跳过的逐项计数，每次通关都要看完。
  - 评价与证据（依据：背景）：本地评测去重后「跳过动画 / 动画太长」只有 13 条 / 10 款，数量很小；集中在重复游玩的作品（FINAL FANTASY VIII、Red Dead Redemption 2 各 2 条，Darkest Dungeon II 1 条）。
- 失败也用胜利的庆祝演出，或者失败页只有一句话、不告诉玩家差在哪。
  - 评价与证据（依据：推断）：评测统计无直接计数。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：评级字母斜着砸入、色块底，逐项计数可一键完成。
- 案头文书 / 官僚表格（`fam.desk-paperwork`）：案头文书：结算是一张报告纸，评级盖章（The WereCleaner 的软木板报告）。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：黑底等宽数据表 + 大字母评级，没有演出（MGSV）。
- 17 号图谱反查到的相关家族：`fam.broadcast`

**出处**

- [Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）](https://www.nngroup.com/articles/response-times-3-important-limits/)（S144）：超过约 10 秒的等待会让人分心，必须能看到进度或取消——长结算演出要可跳过。
- [Dominic Kao, The Effects of Juiciness in an Action RPG, Entertainment Computing 34 (2020)（二手摘要）](https://www.goodreads.com/author_blog_posts/19932694-the-effects-of-juiciness-in-an-action-rpg-new-study)（S081）：极端强度的反馈不比中高强度更好——结算演出同样存在适度区间。

**可演示的对比**

- **不可跳过的慢计数 vs 快计数 + 一键完成**（单变量对照；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线）；循环播放入场）
  - 承载原则的参数：跳过 / 快进：不可跳过 → 跳过按钮
  - 配套改动：动效时长：1.2 → 0.4
  - 看什么：同样的逐项计数 + 字母评级：A 每项慢慢滚、不可跳过；B 快速计完、可一键完成，评级砸入仍然是唯一的重拍。想象第十次通关时的感受。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-result-tally#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.results` `cnt.subtype=settle` `mo.valueChange=countUp` `el.rank.form=letter` `mo.enter=slam`
  - A：`mo.duration=1.2` `ix.skip=none`
  - B：`mo.duration=0.4` `ix.skip=button`

  </details>

#### P-audio-haptic-pairing

**声音与触觉是第二通道：每类反馈事件配一个声音家族和一档震动，越高频越轻越短，重要状态必须有不靠声音的画面版本**

> 适用品类：所有品类 · 相关：[P-juice-budget](#p-juice-budget)、[P-transition-frequency](#p-transition-frequency)、[P-subtitles-captions](#p-subtitles-captions)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-motion-personality](#p-motion-personality) · 风格变体：`fam.crt`、`fam.candy`、`fam.ink`

**要解决的问题**

反馈领域的其它原则都在讲画面，但玩家感到「这个界面很舒服」，有一半来自声音和手里的震动：悬停是轻轻的一声，确认是实在的一下，返回是往下走的音，错误是闷的一声。常见问题是四类：所有操作用同一个提示音；UI 声音和皮肤不配套（水墨界面配电子哔声）；不同优先级的声音互相盖住；重要信息只有声音（身后脚步、低血心跳）没有画面版本，听障玩家和静音玩家拿不到。这条原则把 C7（反馈强度预算）和 C8（每个语义各占一个通道）延伸到听觉与触觉。参数体系目前没有声音参数（见参数缺口），本条先给规则与配套表；可以在探索台演示的是「声音事件的画面版本」。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 按事件类分声音家族：悬停 / 确认 / 返回 / 错误 / 奖励 | — | 所有菜单：每类事件一种声音，同类事件只变音高不变音色；高频的（悬停、翻页）最轻最短，低频的（升级、解锁）才有完整音型。 | 要做一张事件 × 声音表，和通告分级（P-event-callout-tiers）对齐。 | — |
| 声音风格跟皮肤配套 | — | 换皮肤时声音一起换：终端 / CRT 用按键声与电流声，糖果 / Q 版用「啵」声与弹簧，水墨用木鱼、纸声与毛笔擦过，暗色细线用低沉的金属与布料。 | 每套皮肤要配一套 UI 声音素材。 | — |
| 优先级压低（ducking） | — | 多个声音同时出现时：警报与对白压低其它 UI 声，高频 UI 声音量上限低于战斗音效。 | 要在音频中间件里定优先级表。 | — |
| 触觉分档：手柄与手机 | — | 确认、受击、关键事件：轻点 / 中 / 重三档，与画面和声音同步；高频事件不震或极轻。玩家可整体关闭或调强度。 | 不同平台的马达差异大，要逐平台调。 | — |
| 声音事件的画面版本 | <abbr title="el.threat.form=edgeDir">敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示</abbr>；<abbr title="cmp.dialogBox@el.subtitle=bar">对话框结构（字幕 / 说话人） = 底部通栏</abbr> | 方向性声音（脚步、枪声、呼救）给屏幕边缘方向提示；环境声与情绪音进字幕标签（P-subtitles-captions）。 | 画面版本本身也要守通告分级，不能变成新的噪声。 | God of War（steam:1593500 · 据已知描述） |

**经验法则**

- 每类反馈事件配一个声音家族和一档触觉强度；同类事件只变音高、不变音色。
- 频率越高，声音越轻、越短、震动越弱（与 P-transition-frequency 同理）；只有最高一级事件才有完整音型和重震。
- UI 声音跟皮肤成套换：选皮肤时同时选声音（终端 → 按键声，糖果 → 啵声，水墨 → 木鱼 / 纸声）。
- 优先级之间互相压低：警报、对白 > 战斗 > UI；UI 声音量上限最低。
- 重要状态必须有不靠声音的画面版本（方向提示、字幕标签、图标）；声音同样不能是唯一通道（XAG 103、GAG）。
- 声音与触觉可以分别关闭和调强度；手柄与手机各有一套震动模式。

**反例与玩家评价**

- 所有按钮、悬停、确认、错误都是同一个提示音。
  - 评价与证据（依据：推断）：评测无专门分类；设计推论。
- 关键信息只有声音：身后来敌只有脚步声、低血只有心跳。
  - 评价与证据（依据：文献）：无计数；XAG 103 与 GAG 要求声音之外有画面通道。Forza Motorsport 反向做了「画面信息的声音版本」（音频提示帮助视障玩家），说明两个方向都要补。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- CRT 终端（`fam.crt`，皮肤 `skin.terminal`）：CRT 终端：按键声与电流声，确认是「哔」。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：「啵」与弹簧声，手机上配短促轻震。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：木鱼、纸声与毛笔擦过的声音。

**出处**

- [Xbox Accessibility Guideline 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103)（S161）：重要的声音信息要有画面通道，反之亦然。
- [Apple Human Interface Guidelines: Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)（S202）：触觉与画面、声音同步，并与事件分量相称。
- ['Forza Motorsport' will feature audio cues to help players with visual impairments drive](https://www.engadget.com/forza-motorsport-will-feature-audio-cues-to-help-players-with-visual-impairments-drive-180043633.html)（S065）：把画面信息做成声音提示，帮助视障玩家。

**可演示的对比**

- **身后来敌只有脚步声 vs 加上屏幕边缘方向提示**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图：画法：敌人血条 → 敌人血条 + 屏幕边缘方向提示
  - 看什么：把声音关掉看：A 里身后的敌人完全没有任何提示；B 的屏幕边缘出现方向箭头——这就是声音事件的画面版本。声音与触觉本身探索台还画不出来，配套表见本条的做法谱系。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-audio-haptic-pairing#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `cnt.elements=el.vitals+el.crosshair+el.threat` `el.threat.attachTo=target` `chk.demo=combatBeat`
  - A：`el.threat.form=healthBar`
  - B：`el.threat.form=healthBar+edgeDir`

  </details>

### 2.4 导航、菜单与界面流程

回答「怎么在系统之间走、怎么做决定」：菜单骨架按入口数与输入方式选；背包先选约束；装备页当场给对比；地图先回答我在哪、朝哪、去哪；对话与选项让人知道谁在说、在选什么；日志与图鉴承接「接下来做什么」；技能树先读出依赖与代价；设置与存档让改坏与中断都无痛。本轮补了玩法系统界面：教学与退场、制作、建造放置、失败重来、标题与读取、游戏内图表。

#### P-menu-architecture

**菜单骨架：页签环、左侧导航、图标宫格、场景热区——按入口数与输入方式选**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、策略与战术、建造与经营、工厂与自动化、生存与制作 · 相关：[P-input-parity](#p-input-parity)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-density-tempo](#p-density-tempo) · 风格变体：`fam.jrpg`、`fam.flat`、`fam.retro-os`

**要解决的问题**

系统一多（背包、装备、技能、地图、日志、设置……），玩家要在最少步数里到达，并随时知道自己在哪一层、怎么回去。骨架选错，每次切换都多绕一层；R3 里'菜单 / 界面难用'去重后 19 款 ≥ 2 条，集中在系统多的开放世界、生存与建造经营。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 顶部页签环（肩键左右循环） | <abbr title="cnt.subtype=menu">界面子功能 = 功能菜单 / 手册</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="lay.navDepth=1">分类级数 = 1</abbr>；<abbr title="flow.navPersistent=true">分区导航跨屏常驻 = 开</abbr>；<abbr title="cmp.tab=iconText">页签内容 = 图标 + 文字</abbr>；<abbr title="cmp.tabIndicator=underline">页签选中指示 = 下划线</abbr>；<abbr title="flow.stacking=replace">叠层表现 = 替换上一屏</abbr>；<abbr title="ix.glyphs=xbox">按键提示图标集 = Xbox</abbr> | 5–7 个平级子系统、手柄优先的动作 RPG / 开放世界 / 冒险；每个子系统一屏放得下。 | 页签超过 7 个就要缩成纯图标或溢出，靠后的页签很少被点开；跨页签对比做不到。 | Black Myth: Wukong（steam:2358720）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、OMORI（steam:1150690） |
| 左侧竖向导航 + 右侧内容（工具化） | <abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="lay.nav=tabsLeft">分区导航 = 左侧页签</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.navDepth=2">分类级数 = 2</abbr>；<abbr title="flow.navPersistent=true">分区导航跨屏常驻 = 开</abbr>；<abbr title="cmp.tab=iconText">页签内容 = 图标 + 文字</abbr>；<abbr title="cmp.tabIndicator=filled">页签选中指示 = 实心填充</abbr>；<abbr title="lay.grouping=divider">分组方式 = 分隔线</abbr> | 子系统 10 个以上、键鼠为主的放置 / 经营 / 大战略，玩家会在几个面板间高频来回。 | 左栏常驻吃掉 15–25% 宽度；手柄上纵向导航与内容焦点抢方向键，需要额外的'切换焦点区'键。 | Melvor Idle（steam:1267910）、Potionomics（steam:1874490）、Stellaris（steam:281990）、Songs of Syx（steam:1162750） |
| 图标宫格枢纽（hub & spoke） | <abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="lay.nav=hub">分区导航 = 图标宫格</abbr>；<abbr title="lay.arrangement=grid">条目排布几何 = 规则网格</abbr>；<abbr title="lay.columns=3">网格列数 = 3</abbr>；<abbr title="lay.navDepth=2">分类级数 = 2</abbr>；<abbr title="cmp.button=iconText">按钮内容 = 图标 + 文字</abbr>；<abbr title="flow.stacking=replace">叠层表现 = 替换上一屏</abbr>；<abbr title="ix.dismiss=key">本屏怎么结束 = 按键返回（Esc / B）</abbr>；<abbr title="ix.close=keyGlyph">关闭控件 = 按键提示（Esc / B 返回）</abbr> | 入口 ≤ 9 个、彼此独立，希望第一屏就看见全部功能（手机 / 设备隐喻，如 NookPhone、Elden Ring 的图标菜单、Cyberpunk 的磁贴枢纽）。 | 每换一个系统都要先回枢纽，往返步数翻倍；必须再给肩键直跳或专用热键兜底。 | Animal Crossing New Horizons（iig:animal-crossing-new-horizons）、ELDEN RING（steam:1245620）、Cyberpunk 2077（steam:1091500） |
| 场景热区 / 叙事内设备（菜单是一个地方） | <abbr title="lay.nav=hotspots">分区导航 = 场景热区</abbr>；<abbr title="ast.container=desk">场景容器 = 书桌 / 桌面</abbr>；<abbr title="ast.containerSurface=desk">容器放在哪 = 书桌</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="flow.entry=worldInteract">进入方式 = 世界内交互</abbr>；<abbr title="mo.transition=zoomInto">界面转场 = 镜头推进到物件</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr> | 叙事 / 模拟类、系统 ≤ 5 个且有强隐喻（书桌、电脑桌面、软木板、手抄本）。 | 可发现性差：热区不像按钮，要加悬停高亮与文字标签；系统一多场景就挤，后期加功能很难。 | Do Not Feed the Monkeys（steam:658850）、The WereCleaner（steam:2795000）、RPG Time: The Legend of Wright（steam:1839510）、Progressbar95（steam:1304550）、Hypnospace Outlaw（steam:844590） 等 6 款 |
| 可拖动多窗口（桌面式） | <abbr title="lay.container=window">容器 = 可拖动窗口</abbr>；<abbr title="lay.nav=none">分区导航 = 无导航</abbr>；<abbr title="flow.stacking=stack">叠层表现 = 叠在上面</abbr>；<abbr title="flow.depth=3">弹窗栈深 = 3</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr> | MMO / 经典模拟，玩家需要同时开几张表对照（任务 + 背包 + 角色）。 | 窗口互相遮挡、需要整理；固定像素尺寸在高分辨率下变小（RollerCoaster Tycoon Classic 去重后有 2 条缩放类抱怨）。 | RollerCoaster Tycoon Classic（steam:683900）、World Of Warcraft（iig:world-of-warcraft） |

**经验法则**

- 先数入口：≤ 6 个 + 手柄 → 顶部页签环；10 个以上 + 键鼠 → 左侧导航；≤ 9 个且彼此独立 → 宫格枢纽（再加肩键直跳）；≤ 5 个且有强隐喻 → 场景热区。
- 背包、地图、日志这三个最高频入口必须各有一键直达（热键 / 手柄 View 键），枢纽只是兜底。
- 任何功能离入口 ≤ 2 层（lay.navDepth ≤ 2），只有设置这类表单可到 3 层。
- 页签单行、在内容上方、≤ 7 个；肩键循环首尾相接，并记住上次停留的页签。
- 每一层都要能回答'我在哪'：标题 + 页签高亮或面包屑；返回键全局一致（Esc / B / 右键）。
- 选中态至少两种手段（下划线 + 加粗 / 底色 + 放大），焦点永远可见。

**反例与玩家评价**

- 常用功能要钻 3 层以上，且不同层用不同的返回方式；建造 / 生存类把几十个配方塞进同一层滚动列表。 例：Valheim（steam:892970）、Starfield（steam:1716740）、No Man's Sky（steam:275850）、Parkasaurus（steam:591460）、Planet Zoo（steam:703080）、Dyson Sphere Program（steam:1366540） 等 8 款。
  - 评价与证据（依据：评测）：R3'菜单 / 界面难用'去重后 76 款至少 1 条、19 款 ≥ 2 条、共 107 条；最多的是 Valheim 7 条、Starfield 4 条，其后 No Man's Sky、Assassin's Creed Unity、Parkasaurus、Dyson Sphere Program、Palworld 各 3 条。这 19 款多是子系统多的开放世界、生存与建造经营。
- 页签两行堆叠、或把页签与跳转链接混在一行，选中态只靠一种变化（只变色）。
  - 评价与证据（依据：文献）：R3 未单列；NN/g 的页签研究指出多行页签会让选中指示与面板的对应关系变模糊。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- JRPG 窗口（`fam.jrpg`，皮肤 `skin.jrpg`）：JRPG 窗口：竖排指令窗口层层叠开，返回就是关掉最上面一层。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：顶部页签 + 卡片网格，层级不超过两层。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：多窗口并排，任务栏就是导航。
- 17 号图谱反查到的相关家族：`fam.jrpg`、`fam.greybox`、`fam.retro-os`

**出处**

- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：导航顺序全游戏一致；确认 / 返回 / 页签 / 翻页的按键处处相同；每个子菜单都要有固定的路回到主菜单；跨多屏的复杂内容给不止一种找法（筛选页签 + 搜索）。
- [Xbox Accessibility Guideline 114: UI context](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context)（S168）：玩家应随时能看出自己在菜单层级的哪一层（例如 主菜单 > 设置 > 音频）；复用的组件外观与行为保持一致。
- [Nielsen Norman Group: Tabs, Used Right](https://www.nngroup.com/articles/tabs-used-right/)（S155）：页签只用于分组清晰的内容；数量要少，放在面板上方、单行；选中态至少两种视觉提示；需要跨页签对比时不该用页签。
- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：'用户控制与自由'要求随时有清楚的退出口；'识别而非回忆'要求把选项摆在眼前而不是让人记路径。

**可演示的对比**

- **顶部页签环 vs 3×2 图标宫格**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区导航：顶部页签 → 图标宫格；分类级数：1 → 2；分区导航跨屏常驻：开 → 关
  - 配套改动：页签内容：图标 + 文字 → 自动；页签选中指示：下划线 → 自动；导航焦点表现：高亮描边 → 放大；按钮内容：自动 → 图标 + 文字；条目排布几何：自动 → 规则网格；网格列数：自动 → 3
  - 看什么：同样 6 个子系统。A 页签常驻顶部，肩键横跳，'我在哪'靠下划线一眼可知；B 是 3×2 图标宫格，第一屏看全所有入口，但从背包到地图要先退回宫格再进（步数 ×2）。把入口加到 12 个再看：A 的页签行开始溢出，B 变 4×3 仍可读——这就是'入口数决定骨架'。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-menu-architecture#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.subtype=menu` `lay.container=fullscreen` `rel.behind=frozen` `rel.dim=0.7` `cnt.itemCount=6` `cnt.elements=el.prompt` `el.prompt.form=legend` `ix.glyphs=xbox` `cnt.screen=screen.pause`
  - A：`lay.nav=tabsTop` `lay.navDepth=1` `flow.navPersistent=true` `cmp.tab=iconText` `cmp.tabIndicator=underline` `ix.focus=outline` `cmp.button=auto` `lay.arrangement=auto` `lay.columns=auto`
  - B：`lay.nav=hub` `lay.arrangement=grid` `lay.columns=3` `lay.navDepth=2` `flow.navPersistent=false` `cmp.button=iconText` `ix.focus=scale` `cmp.tab=auto` `cmp.tabIndicator=auto`

  </details>
- **单变量版：顶部页签环 → 只切换 lay.nav、lay.navDepth、flow.navPersistent**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区导航：顶部页签 → 图标宫格；分类级数：1 → 2；分区导航跨屏常驻：开 → 关
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-menu-architecture#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.subtype=menu` `lay.container=fullscreen` `rel.behind=frozen` `rel.dim=0.7` `cnt.itemCount=6` `cnt.elements=el.prompt` `el.prompt.form=legend` `ix.glyphs=xbox` `cnt.screen=screen.pause` `cmp.tab=iconText` `cmp.tabIndicator=underline` `ix.focus=outline` `cmp.button=auto` `lay.arrangement=auto` `lay.columns=auto`
  - A：`lay.nav=tabsTop` `lay.navDepth=1` `flow.navPersistent=true`
  - B：`lay.nav=hub` `lay.navDepth=2` `flow.navPersistent=false`

  </details>

#### P-inventory-capacity-model

**背包容量模型：方格、列表、拼图格、负重、收藏本——先选'约束是什么'**

> 适用品类：探索与冒险、动作与 Roguelite、射击、角色扮演、生活与养成、沙盒与物理、生存与制作、恐怖与悬疑 · 相关：[P-item-decision](#p-item-decision)、[P-pause-world-state](#p-pause-world-state)、[P-detail-without-hover](#p-detail-without-hover) · 风格变体：`fam.survival-horror`、`fam.pixel-wood`、`fam.notebook`

**要解决的问题**

背包的本质是'容量约束 + 检索'。约束选错，收集就变成反复整理的苦差（R3 背包抱怨去重后 ≥ 2 条的 7 款里，生存 / 恐怖占 5 款）；约束太松，背包又失去取舍意义。表现形式（格子 / 行 / 拼图 / 本子）是风格，约束本身是设计。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 等大方格网格 + 堆叠 | <abbr title="cnt.subtype=bag">界面子功能 = 背包 / 仓库</abbr>；<abbr title="lay.arrangement=grid">条目排布几何 = 规则网格</abbr>；<abbr title="lay.columns=6">网格列数 = 6</abbr>；<abbr title="cmp.slot=cell">格子结构 = 方格</abbr>；<abbr title="st.emptySlot=pit">空槽表现 = 暗坑 / 凹槽</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="st.newCue=newTag">新内容 / 可领提示 = NEW 角标</abbr> | 物品图标可辨、种类中等（< 200）、有清晰分类；空格数就是剩余容量，最直观。 | 图标不够辨识时要逐个悬停读名字；扩容只能加格，后期一屏放不下要分页。 | The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Black Myth: Wukong（steam:2358720）、ELDEN RING（steam:1245620）、Bear and Breakfast（steam:1136370）、Terraria（steam:105600） 等 6 款 |
| 文字列表 + 数值列 + 侧详情 | <abbr title="cnt.subtype=bag">界面子功能 = 背包 / 仓库</abbr>；<abbr title="lay.arrangement=column">条目排布几何 = 竖列</abbr>；<abbr title="cmp.slot=rowCard">格子结构 = 横卡行</abbr>；<abbr title="cmp.listRow=icon+title+value+status">列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力 + 状态标记</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.overflow=scrollV">内容溢出方式 = 纵向滚动</abbr>；<abbr title="lay.nav=tabsLeft">分区导航 = 左侧页签</abbr> | 物品极多且主要靠数值区分（交易、材料、装备比价），需要按列排序。 | 失去空间记忆（'药在左下角'）；图标变小，扫视靠读字。 | No Mans Sky（iig:no-mans-sky）、Songs of Syx（steam:1162750）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述） |
| 拼图格（物品占多格，摆放即取舍） | <abbr title="cnt.subtype=packGrid">界面子功能 = 拼图格背包</abbr>；<abbr title="lay.arrangement=grid">条目排布几何 = 规则网格</abbr>；<abbr title="lay.columns=8">网格列数 = 8</abbr>；<abbr title="cmp.slot=cell">格子结构 = 方格</abbr>；<abbr title="ix.mode=drag">主交互模式 = 拖拽</abbr>；<abbr title="st.emptySlot=pit">空槽表现 = 暗坑 / 凹槽</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr> | 恐怖 / 生存 / 撤离类，'带什么出门'本身就是策略（RE4 公文箱式）。 | 旋转、拖拽操作量大，手柄更累；物品一多就成负担——RE 系列在背包抱怨里反复出现。 | Resident Evil Village（steam:1196590 · 据已知描述）、Resident Evil 2（steam:883710 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述） |
| 负重 / 体积制（数值上限，不限格数） | <abbr title="cnt.subtype=bag">界面子功能 = 背包 / 仓库</abbr>；<abbr title="lay.arrangement=column">条目排布几何 = 竖列</abbr>；<abbr title="cmp.slot=rowCard">格子结构 = 横卡行</abbr>；<abbr title="cmp.listRow=icon+title+value">列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力</abbr>；<abbr title="cmp.gauge@progress=fraction">数值图形（progress） = x / y 数字</abbr>；<abbr title="st.alert=redTint">警示表达 = 红色调</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr> | 开放世界 RPG：物品种类极多、不想做空间谜题，只想让'捡多少'有代价。 | 超重时要逐件比较'重量 / 价值'再丢，最容易变成管理苦差；格子 + 负重双重约束（Valheim）抱怨最集中。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Valheim（steam:892970）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述） |
| 收藏本 / 叙事内容器（无容量，背包是展示） | <abbr title="cnt.subtype=bag">界面子功能 = 背包 / 仓库</abbr>；<abbr title="ast.container=notebook">场景容器 = 笔记本 / 手账</abbr>；<abbr title="cmp.slot=bare">格子结构 = 无格直接摆放</abbr>；<abbr title="lay.arrangement=scatter">条目排布几何 = 自由散落</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="st.emptySlot=silhouette">空槽表现 = 灰色剪影</abbr>；<abbr title="vis.tilt=4">随手摆放倾角 = 4</abbr> | 轻松 / 收集向，物品少且每件都有故事；背包是成就展示而不是仓储。 | 不适合大量消耗品与数值比较；散放排布在手柄上焦点移动不规则。 | Lil Gator Game（steam:1586800）、DICEOMANCER（steam:2501600）、TOEM（steam:1307580） |

**经验法则**

- 一个游戏只用一种主约束（空间 / 数值 / 无），另一种只作提示；格子 + 负重双约束要非常谨慎。
- 容量常显（空格可见或 x / y），到 80% 时提前提示，而不是满了才报错。
- 物品 > 30 种就要排序 + 分类页签；> 100 种加搜索或'新获得'过滤。
- 堆叠、一键整理、一键存仓、批量出售 / 丢弃是背包的基础设施，比皮肤更影响口碑。
- 拼图格必须支持手柄旋转与自动摆放；实时拼图格只用在格数少、物品少的恐怖类。
- 空格表现（st.emptySlot）要与'锁定格'分得开：空 = 凹槽 / 虚线，锁 = 锁图标，不要都用灰。

**反例与玩家评价**

- 容量紧 + 没有快速整理（一键堆叠、一键存仓、排序），玩家频繁往返仓库、逐件拖拽；或冒险游戏只能一件件轮换翻物品。 例：Valheim（steam:892970）、No Man's Sky（steam:275850）、Grim Fandango Remastered（steam:316790）、Abiotic Factor（steam:427410）、Resident Evil 5（steam:21690 · 据已知描述）、Resident Evil 2（steam:883710 · 据已知描述） 等 8 款。
  - 评价与证据（依据：评测）：R3'背包 / 物品管理难用'去重后 24 款至少 1 条、7 款 ≥ 2 条、共 50 条；Valheim 一款 17 条，是全部类别里单款最集中的之一，其后 Resident Evil 5 4 条、No Man's Sky 3、Resident Evil 2 3、Abiotic Factor 2、Skyrim 2、The Callisto Protocol 2。
- 容量只在'捡不起来'时才告诉玩家（无常显 x / y、无临近上限预警）。
  - 评价与证据（依据：推断）：R3 未单列；属'系统状态可见'的通用可用性原则。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 生存恐怖物品检视（`fam.survival-horror`）：生存恐怖：公文箱拼图格，格子本身就是稀缺资源。
- 像素木框（`fam.pixel-wood`，皮肤 `skin.pixelWood`）：像素木框：木框里的规则方格 + 堆叠数，快捷栏是第一行。
- 手绘笔记本（`fam.notebook`，皮肤 `skin.handdrawn`）：手绘笔记本：背包是一页手账，物品贴在纸上、数量手写。
- 17 号图谱反查到的相关家族：`fam.pixel-wood`、`fam.survival-horror`

**出处**

- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：跨多屏的大量内容至少要给两种查找方式，例如带筛选的页签加搜索。
- [Xbox Accessibility Guideline 114: UI context](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context)（S168）：长列表应提供更快的输入方式（如输入即检索）；复用组件的图标、标签与受限状态的表现保持一致。
- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：系统状态应始终可见；让用户识别而非回忆——容量、已装备、新获得都应摆在眼前。

**可演示的对比**

- **方格网格（空坑即容量）vs 列表 + x / y 计数**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：格子结构：方格 → 横卡行；条目排布几何：规则网格 → 竖列；空槽表现：暗坑 / 凹槽 → 自动；数值图形（progress）：自动 → x / y 数字
  - 配套改动：分区导航：顶部页签 → 左侧页签；网格列数：6 → 自动；列表行字段：自动 → 图标 / 头像 + 标题 + 数值 / 战力 + 状态标记；分区方式：自动 → 左右分栏；内容溢出方式：单屏 → 纵向滚动
  - 看什么：同样 24 件物品。A 的剩余容量就是'还有几个空坑'，找东西靠图标与位置记忆；B 的容量是顶部 x / y 数字，找东西靠读名字、按数值列排序。眯眼看：A 扫视更快，B 比较更准——品类决定哪个更重要。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-inventory-capacity-model#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.subtype=bag` `lay.container=fullscreen` `lay.detail=persistent` `cnt.itemCount=24` `st.newCue=newTag` `cnt.screen=screen.inventory`
  - A：`lay.nav=tabsTop` `lay.arrangement=grid` `lay.columns=6` `cmp.slot=cell` `st.emptySlot=pit` `cmp.gauge@progress=auto` `cmp.listRow=auto` `lay.composition=auto` `lay.overflow=single`
  - B：`lay.nav=tabsLeft` `lay.composition=splitLR` `lay.arrangement=column` `cmp.slot=rowCard` `cmp.listRow=icon+title+value+status` `lay.overflow=scrollV` `cmp.gauge@progress=fraction` `lay.columns=auto` `st.emptySlot=auto`

  </details>
- **单变量版：方格网格（空坑即容量）vs 列表 + x / y 计数 → 只切换 cmp.slot、lay.arrangement、st.emptySlot、cmp.gauge@progress**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：格子结构：方格 → 横卡行；条目排布几何：规则网格 → 竖列；空槽表现：暗坑 / 凹槽 → 自动；数值图形（progress）：自动 → x / y 数字
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-inventory-capacity-model#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.subtype=bag` `lay.container=fullscreen` `lay.detail=persistent` `cnt.itemCount=24` `st.newCue=newTag` `cnt.screen=screen.inventory` `lay.nav=tabsTop` `lay.columns=6` `cmp.listRow=auto` `lay.composition=auto` `lay.overflow=single`
  - A：`cmp.slot=cell` `lay.arrangement=grid` `st.emptySlot=pit` `cmp.gauge@progress=auto`
  - B：`cmp.slot=rowCard` `lay.arrangement=column` `st.emptySlot=auto` `cmp.gauge@progress=fraction`

  </details>

#### P-item-decision

**装备与道具决策：背包要当场回答'这件比我身上的好吗'**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、卡牌与桌面 · 相关：[P-actionable-first](#p-actionable-first)、[P-color-never-alone](#p-color-never-alone)、[P-detail-without-hover](#p-detail-without-hover) · 风格变体：`fam.dark-hairline`、`fam.anime-card`、`fam.pixel`

**要解决的问题**

背包 / 装备页里真正的决策是'换不换、用不用、留不留'。信息若分散在悬停提示、另一个页签或另一个人物页，玩家只能靠记忆比较——这正是'识别而非回忆'要消除的负担；同屏状态（新、已装备、不可用、锁定）一多又容易撞车。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 纸娃娃居中 + 四周槽位 + 悬停对比 | <abbr title="cnt.subtype=loadout">界面子功能 = 装备纸娃娃 / 技能装配</abbr>；<abbr title="cnt.focal=character">主视觉主体 = 角色</abbr>；<abbr title="cnt.characterMedium=model3d">主角色呈现介质 = 3D 实时模型</abbr>；<abbr title="lay.focalSide=center">主体位置 = 居中</abbr>；<abbr title="lay.arrangement=ring">条目排布几何 = 环绕中心 / 轮盘</abbr>；<abbr title="cmp.slot=cell">格子结构 = 方格</abbr>；<abbr title="st.emptySlot=silhouette">空槽表现 = 灰色剪影</abbr>；<abbr title="st.delta=sideBySide">变化 / 前后对比 = 前后双卡</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr>；<abbr title="st.selected=badge">已选 / 已装备标记 = "已装备"角标</abbr> | 装备槽多、外观重要的 ARPG / 开放世界 RPG / 赛博改造。 | 人物占中间，物品格被挤小；悬停对比弹窗容易盖住被比的那件。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Cyberpunk 2077（steam:1091500）、Disco Elysium（steam:632470）、Diablo IV（steam:2344520 · 据已知描述） |
| 列表 + 常驻属性表（a → b 即时差值） | <abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="st.delta=arrow">变化 / 前后对比 = a → b 箭头</abbr>；<abbr title="st.statViz=table">统计图形 = 纯数字表</abbr>；<abbr title="cmp.listRow=icon+title+value">列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力</abbr>；<abbr title="hier.inline=keyword">正文内强调 = 关键词着色</abbr> | 数值驱动、玩家会细算的魂类 / CRPG；属性多到一张悬停卡放不下。 | 文字密，小字号风险高；需要清楚区分'当前值'与'换上后'的列。 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720） |
| 即时预览（换上就看见） | <abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="cnt.characterMedium=model3d">主角色呈现介质 = 3D 实时模型</abbr>；<abbr title="st.delta=plus">变化 / 前后对比 = 绿色 + 增量</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.focalSide=right">主体位置 = 右</abbr> | 外观装备、卡牌升级、改装：玩家要看'效果'而不只是数字。 | 实时模型渲染成本；预览与已装备状态要分得开，不然玩家以为已经换上了。 | The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、DICEOMANCER（steam:2501600）、Cyberpunk 2077（steam:1091500） |
| 状态标记体系（新 / 已装备 / 不可用 / 锁定 / 稀有度） | <abbr title="st.newCue=newTag">新内容 / 可领提示 = NEW 角标</abbr>；<abbr title="st.selected=check">已选 / 已装备标记 = 勾选角标</abbr>；<abbr title="st.locked=lock">锁定 / 未获得表现 = 锁图标</abbr>；<abbr title="st.cooldown=dimNumber">冷却 / 不可用表现 = 压暗 + 数字</abbr>；<abbr title="st.rarityCue=border+strip">稀有度表达手段 = 边框色 + 侧边色条</abbr>；<abbr title="col.coding=rarity">语义颜色编码 = 稀有度</abbr> | 物品量大、需要快速扫视的刷宝 / 生存 / 开放世界。 | 标记太多就变噪音；每种状态必须占用不同的视觉通道，否则同屏分不出。 | ELDEN RING（steam:1245620）、Diablo IV（steam:2344520 · 据已知描述）、Assassin's Creed Odyssey（steam:812140 · 据已知描述） |

**经验法则**

- 对比放在决策点：选中一件时，身上那件的数值和差值同时出现（a → b 或 +/−），不要求切页签。
- 差值同时用符号（▲▼ / + −）与颜色表达，颜色只是加强。
- 键鼠可用临时悬停详情；手柄与触屏一律常驻详情或底部浮层（lay.detail = persistent）。
- 新、已装备、不可用、锁定四态各占一个视觉通道（角标 / 描边 / 压暗 + 数字 / 锁图标），同屏不撞车。
- 稀有度至少两种手段：颜色 + 边框形状 / 侧色条 / 字母。
- 预览中的装备要有'预览中'标记，与'已装备'区分。

**反例与玩家评价**

- 比较只在悬停 tooltip 里，且 tooltip 盖住了被比较的物品或已装备栏；手柄 / 触屏没有悬停，干脆看不到对比。
  - 评价与证据（依据：推断）：R3 未单列；工具的派生规则 D-input 已规定触屏没有悬停、临时详情改底部浮层。
- 稀有度、可用 / 不可用只靠颜色（灰 = 不可用、紫 = 稀有），且'锁定''冷却''已完成'都用灰度。 例：Diablo IV（steam:2344520 · 据已知描述）、Assassin's Creed Odyssey（steam:812140 · 据已知描述）。
  - 评价与证据（依据：推断）：R3 未单列；工具 R1 复测时就发现灰度锁、去饱和冷却、灰化完成同屏分不出（09 总览'数据与状态编码'组）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：右侧属性表逐行写 a → b，涨的用亮色、降的用暗红并加箭头。
- 二次元白卡细线（`fam.anime-card`，皮肤 `skin.animeCard`）：二次元白卡：装备卡左右对比，差值用小胶囊标出。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：差值用 +/- 像素数字，稀有度靠外框形状。

**出处**

- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：让对象、动作、选项可见，不要求用户把上一步的信息记到下一步——对比数据应与候选物同屏。
- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：关键信息除颜色外再配文字、符号、图案或形状；做不到时允许玩家自定义相关颜色。
- [Xbox Accessibility Guideline 113: UI focus handling](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-113-ui-focus-handling)（S167）：焦点指示要高可见，可叠用描边、放大 / 加粗、对比底色，形成冗余。

**可演示的对比**

- **悬停才有新数值 vs 常驻 a → b + 即时换装**（整套做法对照（多个参数一起变）；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：临时出现 → 常驻一侧；变化 / 前后对比：只给新值 → a → b 箭头；即时预览：关 → 开
  - 配套改动：主角色呈现介质：剪影 → 3D 实时模型；已选 / 已装备标记：描边 → "已装备"角标
  - 看什么：同一个装备页。A 只在悬停时冒出新装备的数值，身上那件要自己记；B 右侧常驻 a → b 对比、已装备有角标、人物即时换装。看'决定换不换'需要几次眼动——A 要来回比，B 一眼。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-item-decision#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.subtype=loadout` `lay.container=fullscreen` `cnt.focal=character` `lay.focalSide=center` `lay.arrangement=ring` `cmp.slot=cell` `cnt.screen=screen.character`
  - A：`cnt.characterMedium=silhouette` `lay.detail=transient` `st.delta=newOnly` `st.selected=outline` `lay.preview=false`
  - B：`cnt.characterMedium=model3d` `lay.detail=persistent` `st.delta=arrow` `st.selected=badge` `lay.preview=true`

  </details>
- **单变量版：悬停才有新数值 → 只切换 lay.detail、st.delta、lay.preview**（单变量对照；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：临时出现 → 常驻一侧；变化 / 前后对比：只给新值 → a → b 箭头；即时预览：关 → 开
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-item-decision#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.subtype=loadout` `lay.container=fullscreen` `cnt.focal=character` `lay.focalSide=center` `lay.arrangement=ring` `cmp.slot=cell` `cnt.screen=screen.character` `cnt.characterMedium=silhouette` `st.selected=outline`
  - A：`lay.detail=transient` `st.delta=newOnly` `lay.preview=false`
  - B：`lay.detail=persistent` `st.delta=arrow` `lay.preview=true`

  </details>

#### P-map-conventions

**地图：先回答'我在哪、朝哪、下一步去哪'，画风再千变万化**

> 适用品类：探索与冒险、横版平台、策略与战术、生存与制作、恐怖与悬疑 · 相关：[P-hudless-tax](#p-hudless-tax)、[P-device-bridge](#p-device-bridge)、[P-journal-codex](#p-journal-codex) · 风格变体：`fam.cartographic`、`fam.holo`、`fam.flat-map`

**要解决的问题**

地图是导航与回顾工具。画风可以是羊皮纸、全息线框、楼层示意图、手里的纸地图，甚至没有地图；但定位、朝向、标注、迷雾三态必须读得出。R3'地图难用 / 没有地图'去重后 14 款 ≥ 2 条，Clair Obscur 一款 13 条（全库单款最多）——去掉地图的代价是真实存在的。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 手绘 / 羊皮纸世界图 + 云雾 | <abbr title="cnt.subtype=worldmap">界面子功能 = 地图</abbr>；<abbr title="cnt.dataShape=spatial">主数据结构 = 空间 / 地图</abbr>；<abbr title="vis.mapStyle=parchment">地图画风 = 羊皮纸古海图</abbr>；<abbr title="vis.mapUnexplored=fog">地图未探索区 = 云雾遮挡</abbr>；<abbr title="cmp.node=pin">节点形态 = 图标针</abbr>；<abbr title="lay.overflow=pan">内容溢出方式 = 可拖动大画布</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr> | 奇幻 / 历史题材、探索是核心；地图本身是世界观的一部分。 | 纸纹与水彩降低图标对比，图标必须加描边或底牌；纸面'留白'容易与'未探索'混淆。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Hollow Knight（steam:367520）、Total War: WARHAMMER II（steam:594570）、Kenshi（steam:233860）、Shogun Showdown（steam:2084000） 等 6 款 |
| 楼层示意图 / 房间格（标出'搜过没有'） | <abbr title="cnt.subtype=worldmap">界面子功能 = 地图</abbr>；<abbr title="vis.mapStyle=schematic">地图画风 = 示意图</abbr>；<abbr title="vis.mapUnexplored=outlineOnly">地图未探索区 = 只有轮廓</abbr>；<abbr title="cmp.node=glowDot">节点形态 = 发光点</abbr>；<abbr title="col.coding=status">语义颜色编码 = 状态色</abbr>；<abbr title="st.done=strike">完成 / 已领标记 = 划掉</abbr> | 室内恐怖、银河城、解谜：关键是'哪里还有东西没拿'（RE2 式房间红 / 蓝）。 | 缺少地标感与氛围；与世界画风反差大时要用同一媒介的线条与配色拉回来。 | Crow Country（steam:1996010）、Mini Metro（steam:287980）、Resident Evil 2（steam:883710 · 据已知描述） |
| 战术线框 / 全息星图（多尺度） | <abbr title="cnt.subtype=worldmap">界面子功能 = 地图</abbr>；<abbr title="vis.mapStyle=tactical">地图画风 = 战术线框 / 全息</abbr>；<abbr title="vis.mapUnexplored=dark">地图未探索区 = 压暗</abbr>；<abbr title="rel.semanticZoom=iconize">语义缩放 = 拉远图标化</abbr>；<abbr title="cmp.node=glowDot">节点形态 = 发光点</abbr>；<abbr title="vis.connector=beam">连线样式 = 光束 / 发光线</abbr> | 科幻 / 军事 / 大战略，要在星系—行星—地区几级尺度间缩放。 | 冷、信息密；拉远时必须语义缩放（标签 → 图标 → 色块），否则全是重叠的字。 | Destiny 2（steam:1085660）、Stellaris（steam:281990）、XCOM® 2（steam:268500 · 据已知描述） |
| 叙事内手持地图（不画或模糊画'你在这里'） | <abbr title="cnt.subtype=worldmap">界面子功能 = 地图</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="ast.container=handMap">场景容器 = 摊开的地图</abbr>；<abbr title="vis.mapStyle=painted">地图画风 = 手绘水彩</abbr>；<abbr title="vis.mapUnexplored=blank">地图未探索区 = 留白（纸面空白）</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="flow.entry=hotkey">进入方式 = 按键呼出</abbr> | 步行模拟 / 叙事冒险，读地图本身就是体验（Firewatch 的纸地图与指南针）。 | 定位慢；必须让地标在世界里与纸上一一对应，或至少给大致位置圈。 | Firewatch（steam:383870）、Red Dead Redemption（steam:2668510）、Pentiment（steam:1205520）、RPG Time: The Legend of Wright（steam:1839510） |
| 无地图 / 世界即导航（风、光、地标、指向物） | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="cnt.elements=el.objective">信息元素集合 = 目标 / 路点</abbr>；<abbr title="el.objective.form=marker">目标 / 路点：画法 = 标记图标</abbr>；<abbr title="el.objective.diegesis=diegetic">目标 / 路点 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 体量小、地标强的世界（Journey），或以'世界内指引'替代箭头的开放世界（Ghost of Tsushima 的引导之风，仍保留可呼出的大地图）。 | 世界一复杂，'地图难用'的抱怨就集中出现；必须至少保留一种回溯 / 定位手段。 | Journey（steam:638230）、Chants of Sennaar（steam:1931770）、TOEM（steam:1307580）、Clair Obscur: Expedition 33（steam:1903340）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |

**经验法则**

- 任何画风都要有：玩家位置 + 朝向、稳定的地标、可开关的图例、至少一种自定义标记。
- 未探索 / 已探索 / 已清空三态分开表达：云雾或轮廓 / 正常 / 划掉或压暗。
- 纸面底上的图标加深色描边或底牌，图标与底的对比 ≥ 3:1。
- 取消小地图时至少保留一种定位手段：罗盘条、世界内指引、可呼出的大地图。
- 大地图拉远时语义缩放（rel.semanticZoom），文字标签不重叠。
- 地图画风跟世界同媒介（D-paper：水彩 → painted，线稿 → chalk），但标记层保持屏幕叠加的清晰度。

**反例与玩家评价**

- 取消小地图 / 地图，却没给替代的定位与回溯手段（罗盘、地标、可呼出大地图、已探索记录）。 例：Clair Obscur: Expedition 33（steam:1903340）、Hyper Light Drifter（steam:257850）、CONTROL（steam:870780）、Chants of Sennaar（steam:1931770）、Scorn（steam:698670）、A Short Hike（steam:1055540） 等 8 款。
  - 评价与证据（依据：推断）：R3'地图难用 / 没有地图'去重后 45 款至少 1 条、14 款 ≥ 2 条、共 85 条；Clair Obscur 13 条（缺小地图）居首，CONTROL 5、Chants of Sennaar 5、Hyper Light Drifter 4、Valheim 4、TOEM 4，Abiotic Factor、Scorn、A Short Hike 各 3，黑神话：悟空 2。
- 纸面 / 水彩底上的标记只靠颜色与小图标区分，'未探索'与'空白区域'用同一种留白。
  - 评价与证据（依据：推断）：R3 未单列；10-r2-strategy 记录羊皮纸 / 手绘地图是策略类最常见画风（各 6 款），对比度问题随之而来。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 制图学 / 古海图图例（`fam.cartographic`）：制图学 / 古海图：未探索区留白，图例在角落像真正的地图图例。
- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：战术线框地图，未探索区只有轮廓。
- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何：地图本身就是界面，站点与线路就是标记。
- 17 号图谱反查到的相关家族：`fam.flat-map`、`fam.cartographic`

**出处**

- [Xbox Accessibility Guideline 109: Objective clarity](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-109-objective-clarity)（S165）：提供可选的路点 / 路径标记与方向提示，玩家久无进展时出现；给出收集与区域完成度的数字进度。
- [GDC 2021 · Parker Hamilton: Exploration in Ghost of Tsushima: Letting the Island Guide You](https://www.gdcvault.com/play/1027399/Exploration-in-Ghost-of-Tsushima)（S195）：Sucker Punch 用多种世界内手段（引导之风、烟柱、鸟、狐狸）让玩家看着世界而不是界面去发现内容。
- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：融入世界不等于更投入；玩家常因清晰而偏好叠加式信息——叙事内地图要在清晰上让步或给叠加备选。

**可演示的对比**

- **手里的纸地图 vs 屏幕地图（玩家箭头、针、云雾三态）**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：叙事内 → 屏幕叠加；场景容器：摊开的地图 → 无；地图未探索区：留白（纸面空白） → 云雾遮挡；节点形态：自动 → 图标针
  - 配套改动：容器：直接叠加 → 全屏页；背后画面来源：实时场景 → 自动；地图画风：手绘水彩 → 羊皮纸古海图；详情呈现：自动 → 临时出现；内容溢出方式：单屏 → 可拖动大画布
  - 看什么：同一片区域。A 是角色手里的纸地图：好看、沉浸，但'我在哪'要靠认地标；B 是屏幕地图：玩家箭头、自定义针、云雾 / 已探索三态一目了然。计时找自己的位置——差出来的几秒，就是 E33 / Chants 类抱怨的来源。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-map-conventions#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.subtype=worldmap` `cnt.dataShape=spatial` `cnt.screen=screen.map`
  - A：`lay.container=overlay` `rel.behind=live` `rel.diegesis=diegetic` `ast.container=handMap` `vis.mapStyle=painted` `vis.mapUnexplored=blank` `cmp.node=auto` `lay.detail=auto` `lay.overflow=single`
  - B：`lay.container=fullscreen` `rel.diegesis=screen` `vis.mapStyle=parchment` `vis.mapUnexplored=fog` `cmp.node=pin` `lay.overflow=pan` `lay.detail=transient` `ast.container=none` `rel.behind=auto`

  </details>
- **单变量版：手里的纸地图 → 只切换 rel.diegesis、ast.container、vis.mapUnexplored、cmp.node**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：叙事内 → 屏幕叠加；场景容器：摊开的地图 → 无；地图未探索区：留白（纸面空白） → 云雾遮挡；节点形态：自动 → 图标针
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-map-conventions#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.subtype=worldmap` `cnt.dataShape=spatial` `cnt.screen=screen.map` `lay.container=overlay` `rel.behind=live` `vis.mapStyle=painted` `lay.detail=auto` `lay.overflow=single`
  - A：`rel.diegesis=diegetic` `ast.container=handMap` `vis.mapUnexplored=blank` `cmp.node=auto`
  - B：`rel.diegesis=screen` `ast.container=none` `vis.mapUnexplored=fog` `cmp.node=pin`

  </details>

#### P-dialogue-presentation

**对话呈现：文字放在哪、谁在说、能不能回看**

> 适用品类：动作与 Roguelite、角色扮演、叙事与视觉小说、生活与养成、恐怖与悬疑 · 相关：[P-subtitles-captions](#p-subtitles-captions)、[P-choice-framing](#p-choice-framing)、[P-type-two-tier](#p-type-two-tier) · 风格变体：`fam.comic`、`fam.if-column`、`fam.jrpg`

**要解决的问题**

对话界面要同时交代'谁在说''说了什么''场景与表情'，文字量从一句话到小说。放错位置要么挡住演出，要么读得累；文本重的作品最怕小字压在纹理底上（评测里明确说字小的很少，主要靠对比度与字号检查发现）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 底部通栏 + 立绘 / 头像 + 名牌 | <abbr title="cnt.subtype=npc">界面子功能 = NPC 对话</abbr>；<abbr title="lay.container=tray">容器 = 底 / 顶托盘</abbr>；<abbr title="cmp.dialogBox=bar">对话框结构 = 底部通栏</abbr>；<abbr title="cnt.characterMedium=bust">主角色呈现介质 = 半身立绘</abbr>；<abbr title="lay.focalSide=left">主体位置 = 左</abbr>；<abbr title="lay.layering=behind">主体与面板层叠 = 面板压主体</abbr>；<abbr title="cmp.plate@name=tab">标牌（name） = 边缘小标签条</abbr>；<abbr title="mo.textReveal=typewriter">文字出现 = 打字机逐字</abbr>；<abbr title="ix.continueCue=blinkArrow">继续提示 = 闪烁小三角 / 叶片</abbr>；<abbr title="ix.skip=vnControls">跳过 / 快进 = 自动 / 快进 / 日志一组</abbr> | 角色驱动、有立绘资源的 RPG / 种田 / 动作叙事；每句 1–3 行。 | 占下 1/4–1/3 屏；长段落要翻多页，回看困难。 | Hades（steam:1145360）、Stardew Valley（steam:413150）、Fields of Mistria（steam:2142790）、FINAL FANTASY VIII（steam:39150）、Little Goody Two Shoes（steam:1812370） 等 6 款 |
| 挂在角色身上的气泡（世界里说话） | <abbr title="cmp.dialogBox=bubble">对话框结构 = 带尾气泡</abbr>；<abbr title="el.subtitle.diegesis=spatial">字幕 / 说话人 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.subtitle.attachTo=target">字幕 / 说话人 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="lay.container=overlay">容器 = 直接叠加</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="mo.textReveal=typewriter">文字出现 = 打字机逐字</abbr> | 多人对话、边走边说、镜头较远的俯视 / 横版；漫画化风格（Persona 的锯齿气泡、Pentiment 的分角色字体）。 | 气泡随镜头移动、长句难排；多个气泡同时出现时阅读顺序不清。 | OXENFREE（steam:388880）、Night in the Woods（steam:481510）、A Short Hike（steam:1055540）、Eastward（steam:977880）、Persona 5 Royal（steam:1687950） 等 6 款 |
| 侧栏滚动长文（小说式对话流） | <abbr title="cmp.dialogBox=chatThread">对话框结构 = 聊天软件式</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.focalSide=right">主体位置 = 右</abbr>；<abbr title="cnt.textLength=long">文案量 = 长文滚动</abbr>；<abbr title="lay.overflow=scrollV">内容溢出方式 = 纵向滚动</abbr>；<abbr title="el.choices.form=text">对话 / 事件选项：画法 = 文字行</abbr>；<abbr title="el.choices.arrangement=column">对话 / 事件选项 · 内部排布 = 竖列</abbr> | 文本量大、需要随时回看的 CRPG / 文字冒险（Disco Elysium 的右侧整栏）。 | 占 1/3 宽，场景演出弱；需要可调字号与深色底保证长时间阅读。 | Disco Elysium（steam:632470）、Depersonalization（steam:1477070）、Shadows of Doubt（steam:986130）、Curious Expedition（steam:358130） |
| 无框字幕 / 角落文字 | <abbr title="cmp.dialogBox=bare">对话框结构 = 无框字幕</abbr>；<abbr title="lay.container=overlay">容器 = 直接叠加</abbr>；<abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr>；<abbr title="el.subtitle.screenAnchor=bc">字幕 / 说话人 · 屏幕锚点 = 下中</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr> | 电影化、极简或文学化的作品；对话是画面的一部分而不是窗口。 | 背景复杂时可读性差，必须有描边 / 半透明底选项；说话人需另行标注。 | Kentucky Route Zero（steam:231200）、Crow Country（steam:1996010）、Firewatch（steam:383870） |
| 通讯设备 / 聊天软件式 | <abbr title="cmp.dialogBox=chatThread">对话框结构 = 聊天软件式</abbr>；<abbr title="ast.container=phone">场景容器 = 手机</abbr>；<abbr title="lay.container=drawer">容器 = 侧抽屉</abbr>；<abbr title="cnt.companion=avatar">陪衬角色 = 说话头像</abbr>；<abbr title="mo.textReveal=fade">文字出现 = 淡入</abbr> | 现代 / 科幻 / 远程通讯叙事（对讲机、终端、手机群聊）。 | 不适合面对面的戏；消息流过快时要能暂停与回看。 | UnMetal（steam:1203710）、Among Us（steam:945360）、The Artful Escape（steam:1122680）、绯闻港口 Gossip Harbor（gameui:4834） |

**经验法则**

- 说话人永远可辨：名牌、头像、气泡尾巴至少一种；多人同屏时颜色 + 名字双通道。
- 对话正文跟随文字缩放；每行 ≤ 40 字符（英文）/ 约 20 个汉字、一次 ≤ 2–3 行是字幕的上限，超出就换侧栏或全屏。
- 逐字显示：按一下补全、再按继续；提供自动、快进、历史日志（ix.skip = vnControls）。
- 文本框别盖住说话者的脸：立绘与文本框分左右或上下，lay.layering = behind 时检查遮挡。
- 无框字幕至少要有投影或半透明底板（typ.legibility ≠ none），并允许玩家调底板不透明度。

**反例与玩家评价**

- 长文本用小字号、无文字缩放，或把大段对白塞进底部通栏翻 5 页。 例：Disco Elysium（steam:632470）、BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：评测里明确说文字太小的，去重并收紧口径（「看不清」必须和字 / 文字 / 字幕 / 字体同时出现）并逐条复核后全库只有 10 条 / 8 款：BioShock Infinite 3 条（都在说字幕），Civilization VI、METAL GEAR SOLID V（4K 下）、Disco Elysium（好评里提醒调大字号）、Absolute Drift、ASTRONEER、Dyson Sphere Program、鬼谷八荒（卷轴面板里的小字）各 1 条。其中 BioShock Infinite 说字幕、Disco Elysium 是好评里提醒把字号调大、鬼谷八荒说卷轴面板里的字——都是读字很多的场景。原来列的 Pentiment、Obra Dinn、Wildermyth、鬼谷八荒、Hades II，复核后不是在说文字字号，已移除。
- 逐字显示不能一键补全、没有自动 / 快进 / 历史日志。
  - 评价与证据（依据：文献）：R3 未单列；06 文档 B10（JRPG 窗口）把'逐字显示要提供立即显示全部'列为陷阱。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：带尾气泡挂在角色头上，拟声字表达语气。
- 文字小说栏 / 互动小说排版（`fam.if-column`）：文字小说栏：右侧整栏滚动文本，说话人名放在台词前（Disco Elysium）。
- JRPG 窗口（`fam.jrpg`，皮肤 `skin.jrpg`）：JRPG 窗口：底部蓝窗 + 名牌 + 逐字出现，可一键显示全文。
- 17 号图谱反查到的相关家族：`fam.shoujo`、`fam.storybook`、`fam.comic`、`fam.jrpg`、`fam.phone-app`、`fam.theatre-stage`、`fam.if-column`

**出处**

- [Xbox Accessibility Guideline 104: Subtitles and captions](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104)（S162）：新说话人出现时标名字；用颜色区分说话人时必须同时有名字；每行 ≤ 40 字符、最多 2 行（特殊时 3 行）；提供实底并可调不透明度；字号可放大到最小值的 200%；设置要有实时预览。
- [Disco Elysium: Working on UI Design](https://80.lv/articles/disco-elysium-working-on-ui-design)（S052）：对话栏借鉴社交媒体信息流：文字向上滚动、排成一栏，方便快速扫读抓大意。
- [Xbox Accessibility Guideline 116: Time limits](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-116-time-limits)（S169）：对白、教程这类屏幕文字的停留时长应可调（至少到默认的 10 倍）或可关闭自动消失、改为按键推进。

**可演示的对比**

- **底部通栏 + 立绘 vs 右侧滚动文本栏**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：底部通栏 → 聊天软件式；容器：底 / 顶托盘 → 侧抽屉；内容溢出方式：单屏 → 纵向滚动；文案量：短段（2–3 句） → 长文滚动
  - 配套改动：主视觉主体：角色 → 自动；主角色呈现介质：半身立绘 → 头像级；主体位置：左 → 右；主体与面板层叠：面板压主体 → 自动；标牌（name）：边缘小标签条 → 无（直压）；文字出现：打字机逐字 → 逐行；继续提示：闪烁小三角 / 叶片 → 自动；信息元素集合：字幕 / 说话人 → 字幕 / 说话人 + 对话 / 事件选项；对话 / 事件选项 · 内部排布：继承 → 竖列；对话 / 事件选项：画法：自动 → 文字行；分区方式：自动 → 左右分栏
  - 看什么：把同一段 6 句对白分别放进去。A 底部通栏 + 半身立绘，演出好但要翻 3 页、看不到上一句；B 右侧滚动栏，上文一直在、选项接在正文下面，代价是场景只剩左边 2/3。文字量越大，B 越划算。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-dialogue-presentation#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.subtype=npc` `ix.skip=vnControls` `cnt.screen=screen.dialogue`
  - A：`lay.container=tray` `cmp.dialogBox=bar` `cnt.focal=character` `cnt.characterMedium=bust` `lay.focalSide=left` `lay.layering=behind` `cmp.plate@name=tab` `cnt.textLength=short` `mo.textReveal=typewriter` `ix.continueCue=blinkArrow` `cnt.elements=el.subtitle` `el.choices.arrangement=inherit` `el.choices.form=auto` `lay.composition=auto` `lay.overflow=single`
  - B：`lay.container=drawer` `cmp.dialogBox=chatThread` `lay.composition=splitLR` `lay.focalSide=right` `cnt.characterMedium=avatar` `cnt.textLength=long` `lay.overflow=scrollV` `mo.textReveal=lineByLine` `cnt.elements=el.subtitle+el.choices` `el.choices.form=text` `el.choices.arrangement=column` `cmp.plate@name=none` `cnt.focal=auto` `ix.continueCue=auto` `lay.layering=auto`

  </details>
- **单变量版：底部通栏 + 立绘 → 只切换 cmp.dialogBox、lay.container、lay.overflow、cnt.textLength**（单变量对照；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：底部通栏 → 聊天软件式；容器：底 / 顶托盘 → 侧抽屉；内容溢出方式：单屏 → 纵向滚动；文案量：短段（2–3 句） → 长文滚动
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-dialogue-presentation#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.subtype=npc` `ix.skip=vnControls` `cnt.screen=screen.dialogue` `cnt.focal=character` `cnt.characterMedium=bust` `lay.focalSide=left` `lay.layering=behind` `cmp.plate@name=tab` `mo.textReveal=typewriter` `ix.continueCue=blinkArrow` `cnt.elements=el.subtitle` `el.choices.arrangement=inherit` `el.choices.form=auto` `lay.composition=auto`
  - A：`cmp.dialogBox=bar` `lay.container=tray` `lay.overflow=single` `cnt.textLength=short`
  - B：`cmp.dialogBox=chatThread` `lay.container=drawer` `lay.overflow=scrollV` `cnt.textLength=long`

  </details>

#### P-choice-framing

**对话 / 事件选项：让玩家知道自己在选什么**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、策略与战术、建造与经营 · 相关：[P-dialogue-presentation](#p-dialogue-presentation)、[P-confirm-by-input](#p-confirm-by-input)、[P-actionable-first](#p-actionable-first) · 风格变体：`fam.if-column`、`fam.occult-tarot`、`fam.persona-collage`

**要解决的问题**

选项文字是玩家的'嘴'。改写过短（意图不明）、后果藏起来、限时压力太大，都会让选择失真；而选项怎么排（列表、按钮、轮盘、头顶气泡、卡牌）本身又是很强的风格信号。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 编号文字列表（全句 + 检定标签） | <abbr title="el.choices.form=text">对话 / 事件选项：画法 = 文字行</abbr>；<abbr title="el.choices.arrangement=column">对话 / 事件选项 · 内部排布 = 竖列</abbr>；<abbr title="el.choices.screenAnchor=bc">对话 / 事件选项 · 屏幕锚点 = 下中</abbr>；<abbr title="typ.numbering=arabic">序号样式 = 01 / DAY 1</abbr>；<abbr title="ix.focus=bar">导航焦点表现 = 整行色条</abbr>；<abbr title="hier.inline=chip">正文内强调 = 彩色标签</abbr> | CRPG / 文字冒险：选项长、需要标出技能检定或阵营倾向（BG3 的编号选项 + 骰子、Disco Elysium 用技能色与方括号标检定项）。 | 阅读量大，动作向玩家会跳读；一屏 > 5 条时要滚动。 | Disco Elysium（steam:632470）、Curious Expedition（steam:358130）、Depersonalization（steam:1477070）、Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 按钮 / 横幅（事件抉择，附后果提示） | <abbr title="el.choices.form=buttons">对话 / 事件选项：画法 = 按钮</abbr>；<abbr title="el.choices.arrangement=column">对话 / 事件选项 · 内部排布 = 竖列</abbr>；<abbr title="lay.container=modal">容器 = 居中弹窗</abbr>；<abbr title="rel.dim=0.5">压暗强度 = 0.5</abbr>；<abbr title="cnt.textLength=short">文案量 = 短段（2–3 句）</abbr>；<abbr title="hier.cta=equal">主次差距靠什么 = 平级</abbr>；<abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr> | 策略 / 经营 / Roguelite 的随机事件：选项少（2–4），每项有资源后果。 | 按钮化容易被当成'确定'误点；后果预告太细会变成算术题。 | Frostpunk（steam:323190）、Wildermyth（steam:763890） |
| 径向 / 环绕排布（位置 = 语气或按键） | <abbr title="cnt.subtype=dialogueWheel">界面子功能 = 对话轮盘</abbr>；<abbr title="el.choices.form=text">对话 / 事件选项：画法 = 文字行</abbr>；<abbr title="el.choices.arrangement=ring">对话 / 事件选项 · 内部排布 = 环绕中心 / 轮盘</abbr>；<abbr title="el.choices.screenAnchor=br">对话 / 事件选项 · 屏幕锚点 = 右下</abbr>；<abbr title="cmp.dialogBox@el.subtitle=bare">对话框结构（字幕 / 说话人） = 无框字幕</abbr>；<abbr title="ix.glyphs=playstation">按键提示图标集 = PlayStation</abbr> | 手柄上的电影化对话：选项短、语气位置固定，玩家能凭肌肉记忆选（Heavy Rain 的选项绕在角色头边，对应手柄按键）。 | 只能放短语，改写容易与实际台词语气不符；超过 6 项就挤。 | Heavy Rain（steam:960910 · 据已知描述） |
| 世界内气泡 + 限时（不暂停） | <abbr title="el.choices.form=bubbles">对话 / 事件选项：画法 = 聊天气泡</abbr>；<abbr title="el.choices.diegesis=spatial">对话 / 事件选项 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.choices.attachTo=player">对话 / 事件选项 · 世界挂点 = 玩家角色</abbr>；<abbr title="ctx.turnTimer=true">回合限时 = 开</abbr>；<abbr title="ix.continueCue=countdown">继续提示 = 倒计时</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr> | 实时叙事：想让打断、沉默、错过也算选择（OXENFREE 的头顶三气泡、边走边说）。 | 阅读慢的玩家吃亏；必须提供关闭或放慢限时的选项。 | OXENFREE（steam:388880）、Heavy Rain（steam:960910 · 据已知描述） |
| 卡牌化选项（选择要花资源） | <abbr title="el.choices.form=banners">对话 / 事件选项：画法 = 并列横幅</abbr>；<abbr title="cmp.card=statCard">卡牌版式 = 名牌 + 属性表</abbr>；<abbr title="lay.arrangement=row">条目排布几何 = 横排</abbr>；<abbr title="ix.mode=select">主交互模式 = 选择条目</abbr>；<abbr title="cnt.focal=card">主视觉主体 = 卡牌</abbr> | 选择本身就是资源投入：对话检定、砍价、挑战（Exocolonist 的卡牌对决、Potionomics 的砍价牌）。 | 规则学习成本高；不适合纯叙事分支。 | I Was a Teenage Exocolonist（steam:1148760）、Potionomics（steam:1874490） |

**经验法则**

- 选项写成'意图 + 方式'（[威胁] 让他交出钥匙），或直接写全句；不要只写一个词。
- 有门槛的选项标出属性与成功率，有后果的标图标（离开、开战、不可逆）。
- 一屏 ≤ 4–5 个选项；更多时分组或滚动，不要缩字号。
- 默认焦点放在中性 / 继续项；不可逆选项用长按或二次确认（ix.confirm = hold / double）。
- 限时选项给可见倒计时，并提供关闭或放慢限时的设置（XAG 116）。
- 已选过的选项变暗或打标，让回访 NPC 时知道哪些问过了。

**反例与玩家评价**

- 改写过短，一个词的选项与角色实际说出的话语气不符；玩家只能按位置 / 颜色选而不读内容。
  - 评价与证据（依据：推断）：R3 未单列（参考库无 Mass Effect 卡）；业界讨论见来源——BioWare 因全程配音改用短改写，也因此被批评语气预期不准。
- 限时选项与 QTE 无法关闭或放慢，且按键映射在移植版上不对。 例：Heavy Rain（steam:960910 · 据已知描述）。
  - 评价与证据（依据：评测）：Heavy Rain 在 R3'手柄 / 键位'类去重后 3 条（PC 版选项与 QTE 操作）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 文字小说栏 / 互动小说排版（`fam.if-column`）：文字小说栏：编号选项 + 检定写在选项前，已选变灰。
- 神秘学：塔罗 / 星图 / 炼金（`fam.occult-tarot`）：神秘学塔罗：选项是几张牌，牌面写后果预告。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：选项是斜切色块，选中项放大。
- 17 号图谱反查到的相关家族：`fam.if-column`

**出处**

- [Xbox Accessibility Guideline 116: Time limits](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-116-time-limits)（S169）：时间限制只在必要时使用，提前用不止一种方式预警，允许延长（至少到 10 倍）或关闭。
- [Xbox Accessibility Guideline 114: UI context](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context)（S168）：标签要说明控件的用途与操作方式；理解玩法所需的界面文字应浅白易懂，游戏内术语要有解释。
- [GameBanshee 转载 · Drew Karpyshyn 访谈（Mass Effect 对话轮盘）](https://www.gamebanshee.com/k44c8)（S085）：据访谈转述：主角全程配音后，若选项写出全句，玩家会先读一遍再听一遍，所以改成简短改写；这一取舍后来也被批评语气预期不准。

**可演示的对比**

- **冻结居中按钮 vs 头顶气泡 + 倒计时**（整套做法对照（多个参数一起变）；内容包：colony · 寒光营地；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话 / 事件选项：画法：按钮 → 聊天气泡；背后画面来源：冻结 → 实时场景；回合限时：关 → 开
  - 配套改动：容器：居中弹窗 → 直接叠加；压暗强度：0.5 → 0；信息元素集合：对话 / 事件选项 → 对话 / 事件选项 + 字幕 / 说话人；对话 / 事件选项 · 内部排布：竖列 → 继承；主次差距靠什么：平级 → 自动；文案量：短段（2–3 句） → 一句话；对话框结构（字幕 / 说话人）：自动 → 带尾气泡；对话 / 事件选项 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；对话 / 事件选项 · 放置方式（逐元素）：继承 → 空间内；继续提示：自动 → 倒计时
  - 看什么：同样 3 个选项。A 冻结压暗、居中按钮——安全、可以慢慢读；B 选项是挂在角色头顶的气泡，世界在动、倒计时在走——紧张、真实，但读得慢的人会错过。看 B 时打开'关闭限时'开关，体会它该是可选项而不是缺省。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-choice-framing#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=colony` `cnt.screen=screen.dialogue`
  - A：`lay.container=modal` `rel.behind=frozen` `rel.dim=0.5` `cnt.elements=el.choices` `el.choices.form=buttons` `el.choices.arrangement=column` `hier.cta=equal` `cnt.textLength=short` `cmp.dialogBox@el.subtitle=auto` `ctx.turnTimer=false` `el.choices.attachTo=none` `el.choices.diegesis=inherit` `ix.continueCue=auto`
  - B：`lay.container=overlay` `rel.behind=live` `rel.dim=0` `cnt.elements=el.choices+el.subtitle` `el.choices.form=bubbles` `el.choices.diegesis=spatial` `el.choices.attachTo=player` `ctx.turnTimer=true` `ix.continueCue=countdown` `cmp.dialogBox@el.subtitle=bubble` `cnt.textLength=line` `el.choices.arrangement=inherit` `hier.cta=auto`

  </details>
- **单变量版：冻结居中按钮 → 只切换 el.choices.form、rel.behind、ctx.turnTimer**（单变量对照；内容包：colony · 寒光营地；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话 / 事件选项：画法：按钮 → 聊天气泡；背后画面来源：冻结 → 实时场景；回合限时：关 → 开
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-choice-framing#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=colony` `cnt.screen=screen.dialogue` `lay.container=modal` `rel.dim=0.5` `cnt.elements=el.choices` `el.choices.arrangement=column` `hier.cta=equal` `cnt.textLength=short` `cmp.dialogBox@el.subtitle=auto` `el.choices.attachTo=none` `el.choices.diegesis=inherit` `ix.continueCue=auto`
  - A：`el.choices.form=buttons` `rel.behind=frozen` `ctx.turnTimer=false`
  - B：`el.choices.form=bubbles` `rel.behind=live` `ctx.turnTimer=true`

  </details>

#### P-journal-codex

**日志、任务与图鉴：给'接下来做什么'一个随时可回看的家**

> 适用品类：探索与冒险、角色扮演、建造与经营、生活与养成、生存与制作、恐怖与悬疑、解谜与侦探、MMO · 相关：[P-hudless-tax](#p-hudless-tax)、[P-map-conventions](#p-map-conventions)、[P-material-from-world](#p-material-from-world) · 风格变体：`fam.notebook`、`fam.noir-dossier`、`fam.printed-manual`

**要解决的问题**

'提示 / 引导不清'是 R3 最大的抱怨类（去重后 41 款 ≥ 2 条）。HUD 越少，越需要一个随时能打开的任务日志或笔记来承接'我在干什么'；图鉴则承担'收集了什么、还差什么'。它们的呈现可以从清单到手写日记、报纸、线索墙，风格空间很大。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 任务清单（主线 / 支线分组 + 置顶追踪） | <abbr title="cnt.subtype=quest">界面子功能 = 任务</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="cmp.listRow=icon+title+progress+status">列表行字段 = 图标 / 头像 + 标题 + 进度 + 状态标记</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="st.done=check">完成 / 已领标记 = 绿勾</abbr>；<abbr title="lay.pinned=pinTop">固定 / 置顶项 = 顶部置顶行</abbr> | 开放世界 RPG / MMO：任务多、并行推进。 | 容易变成待办清单的'工作感'；描述写得含糊就失去意义。 | World Of Warcraft（iig:world-of-warcraft）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、崩坏：星穹铁道（gameui:8283）、重返未来：1999（gameui:4596） |
| 笔记本 / 手写日记（叙事内，玩家参与书写） | <abbr title="cnt.subtype=quest">界面子功能 = 任务</abbr>；<abbr title="ast.container=notebook">场景容器 = 笔记本 / 手账</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="typ.body.family=kai">正文字族 = 楷书 / 手写感</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="vis.jitter=0.4">手绘抖动 = 0.4</abbr> | 解谜 / 推理 / 叙事：日志本身就是玩法（Chants of Sennaar 让玩家自己填词义，Obra Dinn 的日志书）。 | 手写体小字号难读；仍需记录'目标 + 地点'这两项硬信息。 | Chants of Sennaar（steam:1931770）、Return of the Obra Dinn（steam:653530）、Untitled Goose Game（steam:837470）、Do Not Feed the Monkeys（steam:658850）、L.A. Noire（steam:110800 · 据已知描述） |
| 报纸 / 编年史（世界事件回顾） | <abbr title="cnt.subtype=quest">界面子功能 = 任务</abbr>；<abbr title="ast.container=book">场景容器 = 书</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="cmp.panelArt=side">面板插画槽 = 侧图</abbr>；<abbr title="cnt.textLength=short">文案量 = 短段（2–3 句）</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr> | 经营 / 历史 / 叙事作，回顾的是'世界发生了什么'（Anno 1800 的报纸版式编年史、Pentiment 的手抄本页）。 | 不适合承载可执行的任务目标。 | Anno 1800（steam:916440）、Pentiment（steam:1205520） |
| 线索墙 / 推理板 | <abbr title="cnt.subtype=deduction">界面子功能 = 推理板</abbr>；<abbr title="cnt.dataShape=network">主数据结构 = 关系网</abbr>；<abbr title="lay.arrangement=scatter">条目排布几何 = 自由散落</abbr>；<abbr title="vis.connector=string">连线样式 = 红绳 + 图钉</abbr>；<abbr title="ast.container=clueWall">场景容器 = 线索墙 / 软木板</abbr>；<abbr title="ix.mode=drag">主交互模式 = 拖拽</abbr>；<abbr title="lay.overflow=pan">内容溢出方式 = 可拖动大画布</abbr> | 侦探 / 调查：玩家要自己把线索连起来。 | 卡片一多就乱，需要自动整理或分组；手柄拖拽体验要专门做。 | Shadows of Doubt（steam:986130）、The WereCleaner（steam:2795000） |
| 图鉴网格（剪影 / 问号 = 未获得） | <abbr title="cnt.subtype=collection">界面子功能 = 图鉴</abbr>；<abbr title="lay.arrangement=grid">条目排布几何 = 规则网格</abbr>；<abbr title="cmp.slot=cell">格子结构 = 方格</abbr>；<abbr title="st.locked=silhouette">锁定 / 未获得表现 = 黑剪影</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="cmp.gauge@progress=fraction">数值图形（progress） = x / y 数字</abbr> | 收集向：让'还差什么'可见（了不起的修仙模拟器的黑剪影、Little Kitty 的问号剪影、TOEM 的集章卡）。 | 剪影太像会剧透；未获得项的提示要给到'去哪找'的程度。 | Amazing Cultivation Simulator（steam:955900）、Little Kitty, Big City（steam:1177980）、TOEM（steam:1307580）、Yi Xian: The Cultivation Card Game（steam:1948800） |

**经验法则**

- 任务描述写成可执行动作（'去灯塔修好透镜'，而不是'调查'），当前追踪的任务置顶。
- 已完成任务归档到'已完成'分组，不删除。
- 叙事内日志也要一键可开，并至少记录'目标 + 地点'。
- 图鉴给总进度（x / y、%）与未获得的剪影 / 问号；提示到'在哪类地方找'。
- 长时间无进展时给可选提示（软提示、可关闭，ix.guideForce = soft）。
- 提供'前情提要'：读档或长时间离开后能回顾剧情。

**反例与玩家评价**

- 零 HUD / 世界即界面，却没有可回看的目标记录，玩家停下来就不知道下一步。 例：Scorn（steam:698670）、Kingdom Two Crowns（steam:701160）、Hellblade: Senua's Sacrifice（steam:414340）、Little Nightmares（steam:424840）、Gorogoa（steam:557600）、A Plague Tale: Requiem（steam:1182900 · 据已知描述）。
  - 评价与证据（依据：评测）：R3'提示 / 引导不清'去重后 41 款 ≥ 2 条、共 155 条，是各类里最多的；Scorn、Kingdom Two Crowns 各 7 条并列最多，两者都是零 HUD 的代表；ASTRONEER、Destiny 2 各 4，A Plague Tale: Requiem、Gorogoa、CONTROL 各 3，Hellblade、Little Nightmares 各 2。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 手绘笔记本（`fam.notebook`，皮肤 `skin.handdrawn`）：手绘笔记本：日志是一本手账，完成项划掉，但当前追踪的那条置顶并加便签。
- 黑色电影 / 侦探卷宗（`fam.noir-dossier`）：黑色电影卷宗：线索卡钉在墙上，红线相连（线索墙）。
- 印刷手册 / 数据表（`fam.printed-manual`）：印刷手册：图鉴是一本说明书，条目编号、配图与表格。
- 17 号图谱反查到的相关家族：`fam.notebook`、`fam.parchment`、`fam.printed-manual`、`fam.noir-dossier`

**出处**

- [Xbox Accessibility Guideline 109: Objective clarity](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-109-objective-clarity)（S165）：玩家应随时能查看当前任务与目标，描述具体、面向动作；保留已完成任务日志，最好主线 / 支线分开；提供剧情回顾。
- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：识别而非回忆：不要让玩家把'接下来做什么'记在脑子里，界面要能随时给出。
- [GDC 2021 · Parker Hamilton: Exploration in Ghost of Tsushima: Letting the Island Guide You](https://www.gdcvault.com/play/1027399/Exploration-in-Ghost-of-Tsushima)（S195）：即便把引导交给世界（风、烟、动物），作品仍保留可设定目标的地图与任务追踪作为后盾。

**可演示的对比**

- **同一本手写笔记本：没有追踪 vs 当前目标置顶 + 进度**（单变量对照；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：固定 / 置顶项：无 → 顶部置顶行；列表行字段：标题 → 标题 + 进度 + 状态标记
  - 看什么：风格完全一样（手写笔记本、划掉表示完成）。A 里「当前该做哪条」要自己找；B 把追踪项置顶、加进度与状态——引导感来自这两个参数，而不是换皮肤。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-journal-codex#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.journal` `cnt.subtype=quest` `lay.container=fullscreen` `ast.container=notebook` `rel.diegesis=diegetic` `typ.body.family=kai` `cnt.textLength=short` `lay.detail=persistent` `st.done=strike`
  - A：`lay.pinned=none` `cmp.listRow=title`
  - B：`lay.pinned=pinTop` `cmp.listRow=title+progress+status`

  </details>
- **风格对照：手写笔记本 vs 分组清单**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：笔记本 / 手账 → 无；默认放置方式：叙事内 → 屏幕叠加；完成 / 已领标记：划掉 → 绿勾
  - 配套改动：UI 与画面关系：同一媒介 → 自动；正文字族：楷书 / 手写感 → 无衬线；手绘抖动：0.4 → 自动；主数据结构：自动 → 同类集合；条目排布几何：自动 → 竖列；分区方式：自动 → 左右分栏；分区导航：自动 → 顶部页签
  - 看什么：这是整套做法的对比（spectrum），不是单变量实验：同样 5 条任务，A 有温度但要自己找当前目标，B 清楚但像软件。把上一个 demo 的「置顶追踪」叠到 A 上，就是兼顾风格与引导的做法。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-journal-codex#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.journal` `cnt.subtype=quest` `lay.container=fullscreen` `lay.detail=persistent`
  - A：`ast.container=notebook` `rel.diegesis=diegetic` `rel.harmony=sameMedium` `typ.body.family=kai` `st.done=strike` `vis.jitter=0.4` `cnt.dataShape=auto` `lay.arrangement=auto` `lay.composition=auto` `lay.nav=auto`
  - B：`cnt.dataShape=collection` `lay.arrangement=column` `lay.nav=tabsTop` `lay.composition=splitLR` `st.done=check` `ast.container=none` `rel.diegesis=screen` `rel.harmony=auto` `typ.body.family=sans` `vis.jitter=auto`

  </details>

#### P-progression-graph

**技能树 / 成长图：依赖关系、下一步、买不买得起，要比画风更先读出来**

> 适用品类：动作与 Roguelite、角色扮演、策略与战术、工厂与自动化 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-actionable-first](#p-actionable-first)、[P-progressive-disclosure](#p-progressive-disclosure) · 风格变体：`fam.mono-line`、`fam.scifi`、`fam.ink`

**要解决的问题**

技能树把'网络'数据摊开。玩家要同时看到：已拥有、可购买、锁定、买不起、通往目标的路径与总代价。画风差异极大（星座、电路、经脉、镜子列表、六角思想柜），但状态编码必须统一，否则越华丽越难读。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 星图 / 散点星座（浪漫、弱结构） | <abbr title="cnt.subtype=skill">界面子功能 = 技能</abbr>；<abbr title="cnt.dataShape=network">主数据结构 = 关系网</abbr>；<abbr title="lay.arrangement=constellation">条目排布几何 = 星图散点</abbr>；<abbr title="cmp.node=glowDot">节点形态 = 发光点</abbr>；<abbr title="vis.connector=beam">连线样式 = 光束 / 发光线</abbr>；<abbr title="lay.overflow=pan">内容溢出方式 = 可拖动大画布</abbr>；<abbr title="st.locked=dimmed">锁定 / 未获得表现 = 压暗 + 进度数</abbr> | 奇幻 / 武侠 / 风格化 RPG，成长是'修行'而非'科技'（天际的星座、Wandering Sword 的经脉图）。 | 依赖方向不直观，路径要靠高亮；节点间距不均时手柄焦点跳转难预测。 | Wandering Sword（steam:1876890）、Clair Obscur: Expedition 33（steam:1903340）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述） |
| 电路 / 直角树（结构清晰，可无限扩） | <abbr title="cnt.subtype=skill">界面子功能 = 技能</abbr>；<abbr title="cnt.dataShape=hierarchy">主数据结构 = 层级 / 树</abbr>；<abbr title="lay.arrangement=tree">条目排布几何 = 树 / 连线</abbr>；<abbr title="cmp.node=block">节点形态 = 等距方块</abbr>；<abbr title="vis.connector=circuit">连线样式 = 电路走线</abbr>；<abbr title="lay.overflow=pan">内容溢出方式 = 可拖动大画布</abbr>；<abbr title="st.locked=lock">锁定 / 未获得表现 = 锁图标</abbr> | 科技 / 工厂 / 塔防 / 放置：分支多、层级深、玩家会规划很远。 | 冷、像工程图；节点多了要缩放与搜索。 | Nodebuster（steam:3107330）、Widget Inc.（steam:3184110）、Infinitode 2 - Infinite Tower Defense（steam:937310）、Digseum（steam:3361470）、The Farmer Was Replaced（steam:2060160） |
| 中心放射环（代际 = 圈） | <abbr title="cnt.subtype=skill">界面子功能 = 技能</abbr>；<abbr title="cnt.dataShape=network">主数据结构 = 关系网</abbr>；<abbr title="lay.arrangement=ring">条目排布几何 = 环绕中心 / 轮盘</abbr>；<abbr title="cmp.node=circleNumber">节点形态 = 圆形编号</abbr>；<abbr title="vis.connector=straight">连线样式 = 直线</abbr> | 科技代际清楚、分支均衡的 4X / 轻策略（Polytopia 的绿色圆形科技盘）。 | 外圈越来越挤，扩展性差。 | The Battle of Polytopia（steam:874390） |
| 升级列表（行 + 等级 + 价格） | <abbr title="cnt.subtype=skill">界面子功能 = 技能</abbr>；<abbr title="cnt.dataShape=collection">主数据结构 = 同类集合</abbr>；<abbr title="lay.arrangement=column">条目排布几何 = 竖列</abbr>；<abbr title="cmp.listRow=icon+title+value+action">列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力 + 行内按钮</abbr>；<abbr title="cmp.gauge@progress=lightUp">数值图形（progress） = 节点点亮</abbr> | 依赖很少、主要是'加点数'的永久成长（Hades 的镜子、放置游戏的升级列表）。 | 没有空间感，难做'路线'取舍。 | Hades（steam:1145360）、The Perfect Tower II（steam:1197260）、Melvor Idle（steam:1267910） |
| 插槽板 / 六角柜（容量制成长） | <abbr title="cnt.subtype=loadout">界面子功能 = 装备纸娃娃 / 技能装配</abbr>；<abbr title="lay.arrangement=hexGrid">条目排布几何 = 六角网</abbr>；<abbr title="cmp.slot=cell">格子结构 = 方格</abbr>；<abbr title="st.emptySlot=dashed">空槽表现 = 虚线框</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr> | 成长是'装什么'而不是'学什么'：Disco Elysium 的思想柜、Hollow Knight 的护符槽。 | 容量规则要同屏讲清（剩几个槽、占几格）。 | Disco Elysium（steam:632470）、Hollow Knight（steam:367520） |

**经验法则**

- 四态双通道：已拥有（实心）/ 可购买（亮描边 + 价格）/ 锁定（锁或虚线 + 前置提示）/ 买不起（价格变红）；形状与颜色各编一遍。
- 选中节点时高亮通往它的整条前置路径，并显示总代价。
- 节点 > 40：可拖动大画布 + 缩放 + 语义缩放（远看只剩分支色块）+ 搜索。
- 撤销 / 洗点放在同屏，不藏进别的菜单。
- 连线样式跟媒介走：电路 → circuit，水墨 → brush，星图 → beam；节点形态用 cmp.node。

**反例与玩家评价**

- 已拥有 / 可购买 / 锁定 / 买不起只用灰度深浅区分；选中节点不显示前置路径与总代价。
  - 评价与证据（依据：推断）：R3 未单列；工具 R1 复测已记录'灰度锁 + 去饱和冷却 + 灰化完成同屏分不出'，v2 为此给每个状态标了视觉通道（09 总览'数据与状态编码'）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 单色线描 · 同一支笔（`fam.mono-line`，皮肤 `skin.mono`）：单色线描：技能树是星座，一支笔连起节点，选中时整条前置路径点亮。
- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：科技树是电路走线，节点是切角方块。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：经脉图圆形散点排布，已通的经脉用朱红。

**出处**

- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：系统状态可见（哪些可点、要多少）；用户控制与自由（随时撤销）；一致性与标准（同一状态同一表现）。
- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：节点状态除颜色外要有形状、符号或文字作第二信号。
- [Xbox Accessibility Guideline 114: UI context](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context)（S168）：复用组件的图标、标签与'受限'状态的表现保持一致；术语要有可访问的解释。

**可演示的对比**

- **三态全靠灰度 vs 锁、勾、常驻详情**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：临时出现 → 常驻一侧；锁定 / 未获得表现：灰度 → 锁图标
  - 配套改动：完成 / 已领标记：灰化沉底 → 绿勾；状态标识形态：自动 → 图标
  - 看什么：同一张星图、同样的发光节点。A 的已点 / 锁定 / 可点全靠灰度深浅；B 的锁定有锁、已点有勾、右侧常驻详情列出前置与代价。开色盲模拟或眯眼看：A 的三态塌成一片灰，B 仍然分得开——画风没变，可读性变了。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-progression-graph#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.subtype=skill` `lay.container=fullscreen` `cnt.dataShape=network` `lay.arrangement=constellation` `cmp.node=glowDot` `vis.connector=beam` `lay.overflow=pan` `cnt.screen=screen.skilltree`
  - A：`st.locked=grayscale` `st.done=grayOut` `lay.detail=transient` `st.statusMark=auto`
  - B：`st.locked=lock` `st.done=check` `st.statusMark=icon` `lay.detail=persistent`

  </details>

#### P-settings-page

**设置页：分类清楚、每项有说明与预览、改坏了能恢复**

> 适用品类：所有品类 · 相关：[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-motor-input-alternatives](#p-motor-input-alternatives)、[P-adaptive-layers](#p-adaptive-layers) · 风格变体：`fam.flat`、`fam.terminal-grid`、`fam.retro-os`

**要解决的问题**

设置是所有玩家都会进、而且常在第一次开机就进的页面。选项越来越多（TLOU Part II 有 60 多项无障碍设置），找不到、不知道效果、改坏回不去都是常见痛点；缺 UI 缩放与字号选项，在评测里表现为零星的'缩放'抱怨（去重后 12 款、15 条）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 左侧分类 + 右侧选项 + 说明 / 预览区 | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="lay.nav=tabsLeft">分区导航 = 左侧页签</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="cnt.dataShape=form">主数据结构 = 表单</abbr>；<abbr title="cmp.listRow=title+desc+action">列表行字段 = 标题 + 说明 + 行内按钮</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="cmp.optionBool=switch">设置项：开关类 = 开关</abbr>；<abbr title="cmp.optionEnum=arrows">设置项：多选一 = 左右切换 ◁ ▷</abbr>；<abbr title="cmp.optionRange=slider">设置项：数值 = 滑条</abbr> | 选项 30 个以上的 PC / 主机游戏；画面与无障碍选项需要看效果。 | 手柄上左右键既改值又可能跳分类——分类切换要交给肩键。 | Cyberpunk 2077（steam:1091500）、Wallpaper Engine（steam:431960） |
| 顶部分类页签 + 左右切换值（电视 / 手柄式） | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="cmp.optionBool=arrows">设置项：开关类 = 左右切换 ◁ ▷</abbr>；<abbr title="cmp.optionEnum=arrows">设置项：多选一 = 左右切换 ◁ ▷</abbr>；<abbr title="cmp.optionRange=segmentedBar">设置项：数值 = 分格条</abbr>；<abbr title="ix.focus=bar">导航焦点表现 = 整行色条</abbr>；<abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr> | 主机 / 掌机，远距离观看；每项一行、整行高亮，左右即改。 | 分格条精度低，音量、灵敏度这类连续值要给数字；分类 > 6 时页签溢出。 | The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild） |
| 手机卡片式（大开关 + 少量项） | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="lay.container=modal">容器 = 居中弹窗</abbr>；<abbr title="lay.panelSize=0.9">容器尺寸 = 0.9</abbr>；<abbr title="cmp.optionBool=switch">设置项：开关类 = 开关</abbr>；<abbr title="cmp.optionRange=slider">设置项：数值 = 滑条</abbr>；<abbr title="ix.close=xTopRight">关闭控件 = 右上 X</abbr>；<abbr title="ix.touchSize=88">触控尺寸 = 88</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr> | 触屏、选项 < 15 个的休闲 / 手游。 | 选项多时滚动很长，分组弱；关闭按钮位置在不同弹窗间容易不一致。 | 剑与远征：启程（AFK2）（gameui:12838）、贪吃怪大作战（gameui:13082）、蛋仔派对（网易）（gameui:3055）、爆裂小队SquadBusters（gameui:13024） |
| 首启预设 + 无障碍分组（先问再玩） | <abbr title="cnt.subtype=difficulty">界面子功能 = 难度 / 辅助模式</abbr>；<abbr title="flow.entry=sequence">进入方式 = 流程强制</abbr>；<abbr title="cmp.optionEnum=thumbnails">设置项：多选一 = 缩略图</abbr>；<abbr title="cmp.listRow=title+desc+action">列表行字段 = 标题 + 说明 + 行内按钮</abbr>；<abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="a11y.textScale=1.25">文字缩放 = 1.25</abbr> | 选项多且相互关联的 3A / 叙事作：先给'视觉 / 听觉 / 运动'预设，再允许逐项改（TLOU Part II 的做法）。 | 首次流程变长；预设应用后要清楚列出改了哪些项。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、The Last of Us Part I（steam:1888930 · 据已知描述） |
| 叙事内设置（终端 / 设备里的选项） | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="ast.container=crt">场景容器 = CRT 电视 / 电脑终端</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="typ.body.family=mono">正文字族 = 等宽 / 终端</abbr>；<abbr title="col.strategy=mono">骨架色彩策略 = 单色</abbr> | 风格极强的作品（iDroid、虚拟操作系统），设置也是世界的一部分。 | 必须保证任何时候能切回标准、可读、可缩放的设置页（无障碍底线）。 | METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Hypnospace Outlaw（steam:844590） |

**经验法则**

- 分类 ≤ 7：画面 / 音频 / 操作 / 界面 / 无障碍 / 语言 / 账户；无障碍单列一类，首启即可到达。
- 每项一句说明，能预览的就预览（字幕、色盲、UI 缩放必须预览）；需重启的项明确标出。
- 每类有'恢复默认'；离开时有未保存提示，焦点默认落在'保存'。
- 文字缩放与 UI 缩放分开给；掌机下最小字高 ≥ 9px@800p，建议 12px（Steam Deck 认证）。
- 手柄：肩键切分类、上下换项、左右改值；触屏：开关与滑条命中区 ≥ 44pt。
- 开关、多选一、数值三类控件全游戏统一（cmp.optionBool / Enum / Range 各选一种）。

**反例与玩家评价**

- 没有 UI 缩放 / 文字缩放，界面按固定像素画，高分辨率或大屏远看时变得很小。 例：RollerCoaster Tycoon Classic（steam:683900）、Melvor Idle（steam:1267910）、BioShock Infinite（steam:8870 · 据已知描述）、Far Cry 4（steam:298110 · 据已知描述）。
  - 评价与证据（依据：评测）：R3'UI 缩放 / 分辨率'去重后 12 款至少 1 条、共 15 条，≥ 2 条的只有 BioShock Infinite 3、RollerCoaster Tycoon Classic 2；Far Cry 4、Melvor Idle 各 1 条。字号类收紧口径后全库 10 条 / 8 款。
- 改了设置看不到效果、需要重启却不提示、没有'恢复默认'，离开时不提醒未保存。
  - 评价与证据（依据：文献）：R3 未单列；XAG 114 把'设置的可视化预览'列为实施要点。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：左侧分类、右侧开关与滑条，右侧大预览窗。
- 终端字符格 / ASCII（`fam.terminal-grid`）：终端字符格：设置是一屏等宽文本，方括号表示开关。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：设置是控制面板窗口，复选框与下拉框。

**出处**

- [Xbox Accessibility Guideline 114: UI context](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context)（S168）：对设置给出视觉化的效果模拟，最好放在真实游戏场景里；玩家应能看出自己在设置层级的哪里。
- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：无障碍设置必须从启动起就能到达：首屏引导配置、默认开启合规选项，或读取平台偏好。
- [PlayStation Blog: The Last of Us Part II Accessibility Features Detailed](https://blog.playstation.com/2020/06/09/the-last-of-us-part-ii-accessibility-features-detailed/)（S111）：60 多项无障碍设置彼此配合，因此提供视觉、听觉、运动三套预设一次配好，玩家之后仍可逐项调整。
- [Steamworks: Steam Deck Compatibility Review Process](https://partner.steamgames.com/doc/steamdeck/compat)（S157）：界面文字要在约 30cm 视距可读：1280×800 下最小字形高 9px，建议 12px；鼓励提供字号调节。

**可演示的对比**

- **一条长滚动列表 vs 分类 + 说明 + 实时预览**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区导航：无导航 → 左侧页签；即时预览：关 → 开；详情呈现：自动 → 常驻一侧；列表行字段：标题 + 行内按钮 → 标题 + 说明 + 行内按钮
  - 配套改动：容器：居中弹窗 → 全屏页；容器尺寸：0.9 → 自动；内容溢出方式：纵向滚动 → 单屏；关闭控件：右上 X → 左上返回箭头；设置项：多选一：自动 → 左右切换 ◁ ▷；分区方式：自动 → 左右分栏
  - 看什么：同样 20 个选项。A 一条长滚动列表、只有标题和控件，'字幕底板不透明度'是什么效果只能猜；B 左侧分类、每项一句说明、右侧实时预览。数一数找到'UI 缩放'要滚几屏 vs 点几下。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-settings-page#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.subtype=settings` `cnt.dataShape=form` `cmp.optionBool=switch` `cmp.optionRange=slider` `cnt.screen=screen.settings`
  - A：`lay.container=modal` `lay.panelSize=0.9` `lay.nav=none` `cmp.listRow=title+action` `lay.overflow=scrollV` `lay.preview=false` `ix.close=xTopRight` `cmp.optionEnum=auto` `lay.composition=auto` `lay.detail=auto`
  - B：`lay.container=fullscreen` `lay.nav=tabsLeft` `lay.composition=splitLR` `cmp.optionEnum=arrows` `cmp.listRow=title+desc+action` `lay.detail=persistent` `lay.preview=true` `ix.close=back` `lay.overflow=single` `lay.panelSize=auto`

  </details>
- **单变量版：一条长滚动列表 → 只切换 lay.nav、lay.preview、lay.detail、cmp.listRow**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区导航：无导航 → 左侧页签；即时预览：关 → 开；详情呈现：自动 → 常驻一侧；列表行字段：标题 + 行内按钮 → 标题 + 说明 + 行内按钮
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-settings-page#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.subtype=settings` `cnt.dataShape=form` `cmp.optionBool=switch` `cmp.optionRange=slider` `cnt.screen=screen.settings` `lay.container=modal` `lay.panelSize=0.9` `lay.overflow=scrollV` `ix.close=xTopRight` `cmp.optionEnum=auto` `lay.composition=auto`
  - A：`lay.nav=none` `lay.preview=false` `lay.detail=auto` `cmp.listRow=title+action`
  - B：`lay.nav=tabsLeft` `lay.preview=true` `lay.detail=persistent` `cmp.listRow=title+desc+action`

  </details>

#### P-save-continuity

**存档与读档：让'中断'和'回来'都无痛**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、角色扮演、叙事与视觉小说、生活与养成、恐怖与悬疑 · 相关：[P-journal-codex](#p-journal-codex)、[P-confirm-by-input](#p-confirm-by-input) · 风格变体：`fam.parchment`、`fam.retro-os`、`fam.pixel-wood`

**要解决的问题**

玩家随时可能被打断；存档形式（随时手动存、检查点、世界内存档点、全自动）决定节奏与张力，存档槽又要让人一眼认出'这是哪一局、玩到哪了'。存档页也是最少被设计、却最容易出事故（覆盖错档）的界面。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 描述型存档槽（截图 + 时间 + 地点 + 目标） | <abbr title="cnt.subtype=saveSlot">界面子功能 = 存档槽</abbr>；<abbr title="cnt.dataShape=collection">主数据结构 = 同类集合</abbr>；<abbr title="lay.arrangement=column">条目排布几何 = 竖列</abbr>；<abbr title="cmp.slot=rowCard">格子结构 = 横卡行</abbr>；<abbr title="cmp.listRow=icon+title+desc+time">列表行字段 = 图标 / 头像 + 标题 + 说明 + 时间</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="ix.confirm=double">确认机制 = 二次确认弹窗</abbr>；<abbr title="st.statusMark=tag">状态标识形态 = 文字 / 色块角标</abbr> | 长篇 RPG / CRPG，多存档、多周目（Witcher 3、BG3 的带截图存档列表）。 | 截图与元数据的存储与生成成本；列表长时要按时间倒序与分组。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 世界内存档点（打字机、长椅、睡觉） | <abbr title="cnt.subtype=saveSlot">界面子功能 = 存档槽</abbr>；<abbr title="flow.entry=worldInteract">进入方式 = 世界内交互</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr>；<abbr title="mo.enter=fade">入场动效 = 淡入</abbr> | 存档本身是节奏与安全区：恐怖（RE 打字机）、银河城（Hollow Knight 长椅）、种田（Stardew 睡觉即存）。 | 被迫中途离开会丢进度；需要'退出即挂起存档'兜底。 | Hollow Knight（steam:367520）、Stardew Valley（steam:413150）、Resident Evil 2（steam:883710 · 据已知描述） |
| 全自动存档 + 角标提示（没有存档页） | <abbr title="cnt.elements=el.loading">信息元素集合 = 加载 / 等待指示</abbr>；<abbr title="el.loading.form=motif">加载 / 等待指示：画法 = 母题化（指南针 / 地球 / 放大镜）</abbr>；<abbr title="el.loading.screenAnchor=br">加载 / 等待指示 · 屏幕锚点 = 右下</abbr>；<abbr title="el.loading.scale=0.6">加载 / 等待指示 · 大小 / 突出度 = 0.6</abbr>；<abbr title="ix.dismiss=timed">本屏怎么结束 = 自动消失</abbr> | Roguelite / 短局 / 线性动作：每个房间或关卡自动存（Hades、Dead Cells）。 | 不能回退到更早状态；存档时刻要让玩家知道，避免在存档中关机。 | Hades（steam:1145360）、Dead Cells（steam:588650） |

**经验法则**

- 手动存档 + 自动存档都要有；自动存档时屏幕角落给非阻断的小图标。
- 存档槽显示截图、地点、当前主目标、游戏时长与真实时间；覆盖存档二次确认。
- 保留多个可回退的存档点（经验值 ≥ 3），并标出'自动 / 手动 / 快速'。
- 世界内存档点的游戏提供'退出即挂起存档'。
- 读档页最新一档默认获得焦点，按时间倒序。

**反例与玩家评价**

- 只有检查点，退出即丢进度；或存档槽只有'存档 1 / 存档 2'+ 日期，覆盖时无确认。
  - 评价与证据（依据：推断）：R3 九类里没有存档类；Game Accessibility Guidelines 指出只能在检查点存档会排斥只能玩短时间或会被突然打断的玩家。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：羊皮纸任务书：存档是书签与日记页，章节名与时长手写。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：存档是文件夹里的文件，修改时间一目了然。
- 像素木框（`fam.pixel-wood`，皮肤 `skin.pixelWood`）：像素木框：存档点是世界里的长椅 / 打字机，读档页是木框卡片。
- 17 号图谱反查到的相关家族：`fam.meta-ui`

**出处**

- [Xbox Accessibility Guideline 109: Objective clarity](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-109-objective-clarity)（S165）：存档文件应带截图、时间戳、地点与进度 / 目标的简述，让玩家读档前就知道自己在哪；并提供剧情回顾。
- [Xbox Accessibility Guideline 108: Difficulty options](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-108-difficulty-options)（S164）：同时提供手动存档与自动存档，让玩家重试时不会损失大量进度。
- [Game Accessibility Guidelines: Provide a manual save feature](https://gameaccessibilityguidelines.com/provide-a-manual-save-feature/)（S140）：只在检查点存档会排斥只能短时间游玩或可能被突然打断的玩家，应提供手动存档并配合自动存档。

**可演示的对比**

- **「存档 1 · 日期」一点就覆盖 vs 截图 + 地点 + 目标 + 二次确认**（单变量对照；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：列表行字段：标题 + 时间 → 图标 / 头像 + 标题 + 说明 + 时间；确认机制：即点即生效 → 二次确认弹窗；详情呈现：自动 → 常驻一侧；状态标识形态：自动 → 文字 / 色块角标
  - 看什么：同样 3 个存档。A 只有'存档 1 · 日期'，一点就覆盖；B 每行有截图、地点、目标一句话、'自动 / 手动'标签，右侧详情，覆盖要确认。想象隔了一个月回来——哪边能直接认出要读哪一档。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-save-continuity#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.subtype=saveSlot` `lay.container=fullscreen` `cnt.dataShape=collection` `lay.arrangement=column` `cnt.itemCount=3` `cmp.slot=rowCard` `cnt.screen=screen.save`
  - A：`cmp.listRow=title+time` `ix.confirm=instant` `lay.detail=auto` `st.statusMark=auto`
  - B：`cmp.listRow=icon+title+desc+time` `lay.detail=persistent` `ix.confirm=double` `st.statusMark=tag`

  </details>

#### P-teach-then-retire

**教学先在情境里出现、成功一次就退场：提示条优先于全屏教程，老手可跳过，术语与按键随时能回看**

> 适用品类：所有品类 · 相关：[P-prompt-in-context](#p-prompt-in-context)、[P-hudless-tax](#p-hudless-tax)、[P-journal-codex](#p-journal-codex)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-glyph-follows-device](#p-glyph-follows-device)、[P-adaptive-layers](#p-adaptive-layers) · 风格变体：`fam.notebook`、`fam.printed-manual`、`fam.candy`

**要解决的问题**

每个品类都要教玩家：怎么移动、这个资源是什么、这套机制怎么用。最常见的两种失败方向相反——全屏教程弹窗一次塞五条规则，打断操作又记不住；或者为了干净什么都不教，玩家卡在第一个机制上（R3 去重后「提示 / 引导不清」41 款 ≥ 2 条，是各类抱怨里出处最多的一类）。设计上要回答四件事：提示在什么时候出现（玩家第一次需要它的那一刻）、什么时候退场（成功做到一次之后）、老手能不能关、事后能不能回看。参数上对应 cnt.screen = screen.tutorial、el.guide.form、ix.guideForce、ix.blocking、ix.dismiss；回看入口属于暂停菜单与图鉴（screen.codex）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 情境提示条：不打断，挂在要操作的地方 | <abbr title="el.guide.form=ring">引导指示 / 聚光：画法 = 光圈脉冲</abbr>；<abbr title="el.prompt.form=contextual">按键 / 操作提示：画法 = 情境按键</abbr>；<abbr title="ix.guideForce=soft">引导强制度 = 软提示（可忽略）</abbr>；<abbr title="ix.blocking=none">阻断性 = 非阻断</abbr>；<abbr title="ix.dismiss=timed">本屏怎么结束 = 自动消失</abbr> | 动作、探索、平台、触屏：一次只教一个动作，提示出现在玩家第一次需要它的位置（触屏的拖动圈、地上的按键提示）。 | 玩家可能错过；要写触发与退场规则（成功一次即退、超时重提）。 | 超星觉醒（大梦龙途）（gameui:13619）、Everdale（gameui:2915） |
| 叙事内教程：说明书页、墙上标识、手写待办 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="ast.container=notebook">场景容器 = 笔记本 / 手账</abbr>；<abbr title="ix.blocking=none">阻断性 = 非阻断</abbr> | 零 HUD / 世界即界面的作品：教学本身就是世界的一部分（TUNIC 捡到的说明书页、Portal 2 测试室墙上的标识牌、Untitled Goose Game 的手写待办纸条）。 | 信息必须自己能被读懂；关键操作仍要有一次明确的按键提示，否则会掉进「不知道怎么玩」。 | TUNIC（steam:553420）、Portal 2（steam:620）、Untitled Goose Game（steam:837470） |
| 分步全屏卡：只给规则复杂、必须先读的机制 | <abbr title="cnt.screen=screen.tutorial">界面类型 = 教程 / 提示卡</abbr>；<abbr title="lay.container=modal">容器 = 居中弹窗</abbr>；<abbr title="ix.blocking=modal">阻断性 = 模态</abbr>；<abbr title="ix.dismiss=button">本屏怎么结束 = 点关闭 / 确认按钮</abbr>；<abbr title="cnt.textLength=short">文案量 = 短段（2–3 句）</abbr> | 策略、卡牌、模拟的新系统第一次出现时：一张卡只讲一件事，配一张示意图，可「上一步 / 下一步」。 | 打断节奏；超过三张就开始被跳过。必须可关闭，并在图鉴里留副本。 | 少女前线：云图计划（散爆网络）（gameui:3033） |
| 可回看的术语表 / 按键说明 | <abbr title="cnt.screen=screen.codex">界面类型 = 图鉴 / 收集 / 成就</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.nav=tabsLeft">分区导航 = 左侧页签</abbr> | 所有有专有名词或复杂操作的作品：暂停菜单里永远能找到「操作说明」和「术语」，教程卡退场后的内容都归档到这里。 | 要维护一份和游戏同步的文本；术语首次出现时最好能直接跳到条目。 | Disco Elysium（steam:632470）、Pentiment（steam:1205520） |
| 老手档：教程可跳过、提示可全关 | <abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr>；<abbr title="ix.guideForce=none">引导强制度 = 无引导</abbr> | 续作、重开存档、多人游戏：第一屏就问「是否需要教学」，设置里有「关闭所有提示」。 | 跳过的玩家仍可能需要个别新机制的说明；新机制的提示要单独保留。 | — |

**经验法则**

- 提示在玩家第一次需要它的那一刻出现，在玩家成功做到一次后退场；超过一定时间没做到，再提示一次并升级（文字 → 指向 → 演示）。
- 一次只教一个动作；长文本拆成一步一个动作，每步不超过一行。
- 不打断操作的提示条优先；全屏教程只留给规则复杂、必须先读的系统，并且一张卡一件事。
- 所有教学内容事后都能从暂停菜单回看：操作说明、术语表、已看过的教程卡。
- 老手可以跳过教程、可以关闭全部提示，但新机制首次出现时仍给一次提示。
- 提示里的按键字形跟随当前设备（P-glyph-follows-device），挂在要操作的位置（P-prompt-in-context）。

**反例与玩家评价**

- 开局连弹五张全屏规则卡，玩家一路点「确定」，真正需要时一条都记不住。
  - 评价与证据（依据：推断）：评测无直接分类；Pinelle 等 2008 的可用性启发式把「提供教学与帮助」列为一类，XAG 109 要求目标与操作说明随时可查。
- 为了干净什么都不教，也没有可回看的说明，玩家卡在第一个机制上。 例：Kingdom Two Crowns（steam:701160）、Your Only Move Is HUSTLE（steam:2212330）。
  - 评价与证据（依据：评测）：R3 去重后：Kingdom Two Crowns 7 条、Your Only Move Is HUSTLE 3 条「提示 / 引导不清」；全库 41 款 ≥ 2 条，是出处最多的一类。
- 提示永不退场：玩家已经会了，按键提示仍常驻屏幕中央。
  - 评价与证据（依据：推断）：无评测计数；设计推论（与 P-contextual-hud 同理）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 手绘笔记本（`fam.notebook`，皮肤 `skin.handdrawn`）：手绘笔记本：教学写在本子的便签上，学会以后便签收进本子里可回看。
- 印刷手册 / 数据表（`fam.printed-manual`）：印刷手册：教程是一本游戏里的说明书（TUNIC），按页回看。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：触屏提示是一个会弹跳的手指 / 光圈，成功一次就消失。

**出处**

- [Xbox Accessibility Guideline 109: Objective clarity](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-109-objective-clarity)（S165）：目标与操作说明要随时可查，提示要能重复。
- [Heuristic Evaluation for Games: Usability Principles for Video Game Design](https://doi.org/10.1145/1357054.1357282)（S012）：可用性问题之一是缺少教学与帮助；帮助要在需要时可得。
- [Game Accessibility Guidelines（Basic）](https://gameaccessibilityguidelines.com/basic/)（S143）：提供可回看的操作说明，文字推进由玩家掌握。

**可演示的对比**

- **开局全屏强制弹窗 vs 情境提示条 + 成功即退场**（单变量对照；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：阻断性：模态 → 非阻断；容器：居中弹窗 → 横幅 / 提示条；本屏怎么结束：点关闭 / 确认按钮 → 自动消失
  - 配套改动：引导指示 / 聚光：画法：高亮方块 → 光圈脉冲
  - 看什么：A 用一整屏模态卡挡住画面，必须点按钮才能继续；B 只在角落给一条提示、在要操作的位置画一个圈，做到一次就自己淡出。再想象第二局：A 还会弹出来吗？B 的内容能在暂停菜单里找回来吗？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-teach-then-retire#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.tutorial` `cnt.subtype=guide` `cnt.textLength=short`
  - A：`lay.container=modal` `ix.blocking=modal` `ix.dismiss=button` `el.guide.form=box`
  - B：`lay.container=banner` `ix.blocking=none` `ix.dismiss=timed` `el.guide.form=ring`

  </details>

#### P-craft-recipe

**制作界面先回答「缺什么、能做几个、做完去哪」：有 / 需对照、数量控件、队列与反查**

> 适用品类：生存与制作、建造与经营、工厂与自动化、角色扮演、生活与养成、沙盒与物理、卡牌与桌面、MMO · 相关：[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-item-decision](#p-item-decision)、[P-color-never-alone](#p-color-never-alone)、[P-confirm-by-input](#p-confirm-by-input)、[P-icon-system](#p-icon-system) · 风格变体：`fam.notebook`、`fam.scifi`、`fam.parchment`

**要解决的问题**

制作 / 配方界面出现在生存、建造、RPG、工厂、生活、沙盒、卡牌等 7 个品类里，但常被做成「一格图标 + 一行材料」，玩家要自己去背包里数还差几个、能做几个、做完的东西放到哪里。生存类的背包与制作是评测里抱怨最集中的界面之一（R3 去重后 Valheim 背包 17 条、菜单 7 条）。要点有四个：材料的拥有 / 需要逐项对照、缺的那一项一眼可见；能做几个直接算出来；耗时的制作有队列和进度；从材料能反查它能做什么。参数上对应 cnt.screen = screen.craft、el.cost.form、cmp.quantity、st.locked、cmp.listRow。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 有 / 需对照：缺的那一项标红并说缺几个 | <abbr title="cnt.screen=screen.craft">界面类型 = 制作 / 合成</abbr>；<abbr title="el.cost.form=haveNeed">价格 / 消耗：画法 = 持有 / 需求（红绿）</abbr>；<abbr title="st.locked=dimmed">锁定 / 未获得表现 = 压暗 + 进度数</abbr>；<abbr title="st.alert=warnIcon">警示表达 = 黄三角图标</abbr> | 所有制作界面的默认：每种材料写「拥有 / 需要」，不够的那项用颜色 + 图标标出，按钮直接说明缺什么。 | 材料多时一行放不下，要换成竖列；颜色之外必须有图标或文字（P-color-never-alone）。 | Satisfactory（steam:526870）、Cozy Grove（steam:1458100）、Don't Starve（steam:219740 · 据已知描述） |
| 能做几个 + 一键做满 | <abbr title="cmp.quantity=stepper">数量控件 = 步进器</abbr>；<abbr title="el.cost.form=slots">价格 / 消耗：画法 = 材料格</abbr> | 批量制作（弹药、药水、建材）：数量控件旁直接显示上限，长按或一键做到上限。 | 一键做满容易误耗稀有材料，稀有材料要二次确认（P-confirm-by-input）。 | Satisfactory（steam:526870） |
| 制作队列与进度 | <abbr title="cnt.subtype=forge">界面子功能 = 锻造 / 合成 / 变强</abbr>；<abbr title="cmp.listRow=icon+title+progress+time">列表行字段 = 图标 / 头像 + 标题 + 进度 + 时间</abbr> | 耗时制作（工厂、殖民、种田加工）：队列一列排开，每项有进度与剩余时间，可取消、可调顺序。 | 队列一长就要分组；离开界面后进度要在 HUD 或世界里另有显示。 | — |
| 配方图鉴：按产物查、按材料反查 | <abbr title="cnt.screen=screen.codex">界面类型 = 图鉴 / 收集 / 成就</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="st.locked=question">锁定 / 未获得表现 = 问号</abbr> | 配方多、要探索的作品（炼金、烹饪、生存）：未发现的配方用问号占位，悬停材料能看到它的全部用途。 | 「问号」暴露了配方总数，会削弱探索感；可以只显示已知配方的数量。 | Potion Craft: Alchemist Simulator（steam:1210320）、Animal Crossing New Horizons（iig:animal-crossing-new-horizons） |

**经验法则**

- 每种材料都写「拥有 / 需要」，不够的那项颜色 + 图标双通道标出，并在按钮上直接说缺什么。
- 「能做几个」由界面算，不让玩家心算；批量制作给上限与一键做满。
- 耗时制作必须有队列与进度；离开界面后进度在 HUD 或世界里仍可见。
- 材料能反查用途；未发现的配方要不要显示，取决于你想不想让玩家知道总数。
- 制作与背包共用一套格子和稀有度画法（一个语义一种画法，见 P-icon-system）。

**反例与玩家评价**

- 配方只列材料名，不写拥有数量，玩家要来回切背包数。
  - 评价与证据（依据：推断）：评测无专门分类；「背包 / 物品管理难用」去重后 7 款 ≥ 2 条，生存 / 恐怖占 5 款，属同一类问题的背景。
- 制作按钮灰掉但不说为什么（缺材料？缺工作台？缺科技？）。
  - 评价与证据（依据：推断）：无计数；与建造品类「建造失败没有就地解释」同理。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 手绘笔记本（`fam.notebook`，皮肤 `skin.handdrawn`）：手绘笔记本：制作页是两页手账，左边配方、右边材料「有 / 需」手写（Cozy Grove）。
- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：制作是暗色半透明大面板，缺料项橙色加警示图标（Satisfactory）。
- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：羊皮纸任务书：配方写在手抄本上，原料格竖排在页边（Potion Craft）。

**出处**

- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)（S031）：系统状态可见、错误要用平白语言说明原因与解法。

**可演示的对比**

- **只说「材料不足」vs 逐项有 / 需对照 + 数量控件**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：价格 / 消耗：画法：货币图标 + 数字 → 持有 / 需求（红绿）；数量控件：输入框 → 步进器
  - 配套改动：锁定 / 未获得表现：灰度 → 压暗 + 进度数
  - 看什么：A 只写需要几个材料，不够的配方整格变灰，玩家不知道差在哪；B 每种材料写「有 / 需」，缺的那项标出来，数量控件旁直接是上限。看玩家要切几次背包才能决定做不做。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-craft-recipe#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.craft` `cnt.subtype=forge`
  - A：`el.cost.form=iconNumber` `cmp.quantity=input` `st.locked=grayscale`
  - B：`el.cost.form=haveNeed` `cmp.quantity=stepper` `st.locked=dimmed`

  </details>

#### P-build-placement

**放置预览：合法与否用颜色 + 形状双通道说清，成本当场预览，撤销随手可得**

> 适用品类：建造与经营、工厂与自动化、生存与制作、沙盒与物理、策略与战术、生活与养成 · 相关：[P-actionable-first](#p-actionable-first)、[P-color-never-alone](#p-color-never-alone)、[P-confirm-by-input](#p-confirm-by-input)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-craft-recipe](#p-craft-recipe) · 风格变体：`fam.flat-map`、`fam.cozy`、`fam.holo`

**要解决的问题**

建造与放置（screen.build）是建造经营、工厂、生存、沙盒、塔防的核心操作，也是最容易让人烦躁的：放不下不说为什么、钱不够要点了才知道、放错了不能撤。好的放置界面在玩家按下之前就回答：放在哪（网格吸附与占地）、能不能放（合法 / 非法，原因）、要花多少（拥有 / 需要）、放下以后会怎样（范围、相邻加成、分数）。参数上对应 ix.confirm = ghost、el.overlay.form = buildGrid / gridHighlight / rangeRing、lay.preview、el.cost.form = haveNeed、st.alert；撤销在 el.toolbar 上。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 幽灵预览 + 网格吸附 | <abbr title="ix.confirm=ghost">确认机制 = 幽灵预览 + ✓ / ✕</abbr>；<abbr title="el.overlay.form=buildGrid">信息叠层 / 图例：画法 = 建造网格</abbr>；<abbr title="el.overlay.diegesis=spatial">信息叠层 / 图例 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.overlay.worldRender=decal">信息叠层 / 图例 · 世界渲染（逐元素） = 地面贴花</abbr> | 城建、工厂、塔防：半透明建筑跟着光标，吸附到格子，占地格画在地面上。 | 地形起伏时贴花会变形；需要旋转、镜像的快捷键提示。 | ISLANDERS（steam:1046030）、Planet Zoo（steam:703080） |
| 合法 / 非法双通道：颜色 + 斜纹 / 图标 + 一句原因 | <abbr title="col.coding=status">语义颜色编码 = 状态色</abbr>；<abbr title="st.alert=stripes">警示表达 = 黄黑警示条</abbr>；<abbr title="el.overlay.form=gridHighlight">信息叠层 / 图例：画法 = 格子高亮</abbr> | 所有放置：非法区域除了红色还要有斜纹或叉号，光标旁写一句原因（「需要连接道路」「地形太陡」）。 | 原因文案要逐条写；红绿只靠颜色是色盲陷阱（建造品类坑 6）。 | — |
| 成本与效果即时预览 | <abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="el.cost.form=haveNeed">价格 / 消耗：画法 = 持有 / 需求（红绿）</abbr>；<abbr title="el.feedback.form=floatNumbers">命中反馈 / 连击：画法 = 飘字</abbr> | 有相邻加成、范围、分数的放置：放下之前就浮出「+分数」或效果范围（ISLANDERS 放置时世界里浮出分数）。 | 要预先模拟结算；预览与实际不一致最伤信任（P-actionable-first）。 | ISLANDERS（steam:1046030）、Dorfromantik（steam:1455840） |
| 撤销 / 重做常驻 | <abbr title="el.toolbar.form=buttonRow">建造栏 / 系统入口条：画法 = 图标按钮排</abbr>；<abbr title="el.toolbar.screenAnchor=bc">建造栏 / 系统入口条 · 屏幕锚点 = 下中</abbr> | 玩具式建造与创作：撤销、重做常驻在底部，放错不需要拆除流程（SUMMERHOUSE 底部的撤销 / 重做）。 | 涉及资源时撤销要退还成本，规则要明确。 | SUMMERHOUSE（steam:2533960）、Townscaper（steam:1291340） |
| 点哪长哪：没有预览面板，世界自己回应 | <abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="ix.confirm=instant">确认机制 = 即点即生效</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr> | 玩具 / 治愈建造（Townscaper、Tiny Glade）：没有失败、没有成本，放置本身就是反馈。 | 只适合没有资源约束的玩法。 | Townscaper（steam:1291340）、Tiny Glade（steam:2198150） |

**经验法则**

- 按下之前回答四件事：放在哪、能不能放、要花多少、放下以后会怎样。
- 非法状态用颜色 + 形状（斜纹、叉号、虚线轮廓）双通道，再加一句原因。
- 成本不足时预览就标红，并说差多少；不要等玩家点了才弹「资源不足」。
- 撤销 / 重做随手可得；涉及资源的撤销要退还成本。
- 网格、范围圈、占地格只在放置模式出现，退出模式立即收走（P-progressive-disclosure）。

**反例与玩家评价**

- 放不下时只把建筑染红，不说为什么（缺道路？地形？占地冲突？）。 例：Timberborn（steam:1062090）、Planet Zoo（steam:703080）。
  - 评价与证据（依据：截图）：评测无专门分类；见建造品类坑 7「建造失败没有就地解释」（看图归纳）。
- 合法 / 非法只用红绿区分。
  - 评价与证据（依据：推断）：无计数；06 文档 A9 / A10 陷阱清单（红绿对色盲不友好）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何：放置时地面出现网格与 +分数浮字（ISLANDERS）。
- 圆润友好（`fam.cozy`，皮肤 `skin.cozy`）：圆润友好：玩具建造只留撤销 / 重做两个圆钮（SUMMERHOUSE）。
- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息空间：幽灵预览是蓝色全息，非法区域红色斜纹。

**出处**

- [Godot 文档：Using decals](https://docs.godotengine.org/en/stable/tutorials/3d/using_decals.html)（S121）：地面贴花可以投射占地格与范围圈。
- ['Mini Metro': When Less is More](https://gdcvault.com/play/1024250/-Mini-Metro-When-Less)（S040）：放置与连线本身就是界面，结果当场可见。

**可演示的对比**

- **只用颜色、按下才知道 vs 幽灵预览 + 斜纹 + 成本预览**（单变量对照；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：确认机制：即点即生效 → 幽灵预览 + ✓ / ✕；警示表达：红色调 → 黄黑警示条；即时预览：关 → 开
  - 配套改动：信息叠层 / 图例：画法：格子高亮 → 建造网格 + 格子高亮
  - 看什么：同一次放置：A 只把格子染红，按下才知道放不了；B 先给半透明预览和占地网格，非法区域加斜纹，成本与效果在按下前就显示。打开色盲模拟（chk.cvd）再看一遍，A 的红绿是否还分得开。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-build-placement#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.build` `cnt.elements=el.toolbar+el.cost+el.overlay` `el.overlay.diegesis=spatial` `el.overlay.worldRender=decal` `col.coding=status` `chk.demo=build`
  - A：`ix.confirm=instant` `el.overlay.form=gridHighlight` `st.alert=redTint` `lay.preview=false`
  - B：`ix.confirm=ghost` `el.overlay.form=buildGrid+gridHighlight` `st.alert=stripes` `lay.preview=true`

  </details>

#### P-fail-retry

**失败到重来的秒数是一项设计指标：一键重来、失败原因一句话、重复的演出可跳过**

> 适用品类：横版平台、动作与 Roguelite、竞速与驾驶、解谜与侦探、音游、格斗、射击、卡牌与桌面、策略与战术、生存与制作 · 相关：[P-result-tally](#p-result-tally)、[P-transition-frequency](#p-transition-frequency)、[P-save-continuity](#p-save-continuity)、[P-confirm-by-input](#p-confirm-by-input)、[P-teach-then-retire](#p-teach-then-retire) · 风格变体：`fam.synthwave`、`fam.ornate-frame`、`fam.pixel`

**要解决的问题**

平台跳跃、动作、Roguelite、竞速、解谜里，玩家会失败几十上百次。从「死亡」到「重新能操作」中间每多一秒、多一个按钮，挫败感就被放大一次；反过来，Roguelite 的死亡总结又是推进的一部分（解锁、数据、下一局的目标），不能一笔带过。设计上要分清两种失败：练习型失败（立刻重来）与推进型失败（给总结再重开），并把失败原因用一句话交给玩家。参数上对应 cnt.screen = screen.results（cnt.subtype = runSummary）、ix.skip、ix.dismiss、mo.duration、flow.depth。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 秒回：失败后 1–2 秒内重新可操作，没有菜单 | <abbr title="mo.duration=0.2">动效时长 = 0.2</abbr>；<abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr>；<abbr title="ix.dismiss=key">本屏怎么结束 = 按键返回（Esc / B）</abbr>；<abbr title="flow.depth=1">弹窗栈深 = 1</abbr> | 精确平台、节奏、短关卡：失败就是练习，重来越快越好（Katana ZERO 把失败做成录像倒带）。 | 没有喘息与复盘；要配一个「暂停 / 返回」的出口。 | Katana ZERO（steam:460950） |
| 死亡总结：本局数据 + 解锁 + 下一步 | <abbr title="cnt.screen=screen.results">界面类型 = 结算 / 胜负 / 奖励</abbr>；<abbr title="cnt.subtype=runSummary">界面子功能 = 本局总结 / 死亡</abbr>；<abbr title="st.statViz=table">统计图形 = 纯数字表</abbr>；<abbr title="ix.continueCue=keyGlyph">继续提示 = 按键图标</abbr> | Roguelite、生存：失败推进元进度，总结页告诉玩家带走了什么、离下一个解锁还差多少。 | 第十次以后会被跳过；计数演出必须可一键完成（P-result-tally）。 | Hades（steam:1145360）、Dead Cells（steam:588650） |
| 失败原因一句话 + 分级提示 | <abbr title="cnt.textLength=line">文案量 = 一句话</abbr>；<abbr title="el.guide.form=npcBubble">引导指示 / 聚光：画法 = NPC 气泡（对话推进式引导）</abbr>；<abbr title="cnt.tone=encouraging">文案语气 = 激励</abbr> | 解谜、策略、Boss 战：失败页写一句「被什么打中 / 哪一步错了」，连续失败后提示逐级加码。 | 文案要按失败原因分别写；提示过早会剥夺解题乐趣。 | — |
| 检查点与自动存档提示 | <abbr title="cnt.screen=screen.save">界面类型 = 存档 / 读档</abbr>；<abbr title="cnt.subtype=saveSlot">界面子功能 = 存档槽</abbr>；<abbr title="el.notify.form=toast">通知 / 大字提示：画法 = 圆角提示卡</abbr> | 长关卡、叙事作：明确告诉玩家从哪里重来、丢失了什么（P-save-continuity）。 | 检查点太稀会让重来变成惩罚。 | Hollow Knight（steam:367520） |

**经验法则**

- 先分清练习型失败与推进型失败：前者 1–2 秒内重新可操作，后者给一页总结。
- 重复出现的失败演出第二次起可跳过，跳过键常驻同一位置。
- 失败页用一句话说原因；连续失败时提示按「方向 → 具体 → 答案」逐级加码。
- 重来路径上不要插入确认弹窗（「确定要重新开始吗？」）——撤销优于确认。
- 告诉玩家从哪里重来、丢了什么（检查点、未存档的收集物）。

**反例与玩家评价**

- 每次死亡都播完整的死亡动画 + 结算 + 读取，重来要 10 秒以上。
  - 评价与证据（依据：推断）：本地评测去重后「跳过动画 / 动画太长」一类只有 13 条 / 10 款，证据很弱；主要是设计推论（Nielsen 响应时间：超过 10 秒会失去注意力）。
- Roguelite 的死亡总结只给一个「再来」按钮，不说带走了什么。
  - 评价与证据（依据：推断）：无计数；设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 合成波 / 蒸汽波（`fam.synthwave`，皮肤 `skin.synth`）：合成波 / 霓虹：失败即倒带，录像回放的扫描线一闪就重来（Katana ZERO）。
- 重装饰雕花框（`fam.ornate-frame`，皮肤 `skin.ornate`）：雕花框：Roguelite 死亡总结是一页带框的「战报」，可一键跳过。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：失败页只有一行像素字和一个按键提示。

**出处**

- [Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）](https://www.nngroup.com/articles/response-times-3-important-limits/)（S144）：0.1 秒、1 秒、10 秒三个响应时间界限；超过 10 秒注意力会离开。
- [Why The Very Hard 'Celeste' is Perfectly Fine With You Breaking Its Rules](https://www.vice.com/en/article/celeste-difficulty-assist-mode/)（S060）：高难度作品用辅助选项而不是降低重来速度来照顾玩家。

**可演示的对比**

- **慢结算 + 确认弹窗 vs 秒回 + 一键重来**（单变量对照；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线）；循环播放入场）
  - 承载原则的参数：动效时长：1.2 → 0.2；跳过 / 快进：不可跳过 → 跳过按钮；弹窗栈深：3 → 1
  - 配套改动：本屏怎么结束：点关闭 / 确认按钮 → 按键返回（Esc / B）
  - 看什么：循环播放入场：A 每次失败都慢慢展开、叠三层弹窗、必须点按钮；B 0.2 秒进场、一键跳过、只有一层。数一数从「死亡」到「能再按跳跃」要几秒，再想象第五十次。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-fail-retry#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.results` `cnt.subtype=runSummary`
  - A：`mo.duration=1.2` `ix.skip=none` `ix.dismiss=button` `flow.depth=3`
  - B：`mo.duration=0.2` `ix.skip=button` `ix.dismiss=key` `flow.depth=1`

  </details>

#### P-frontend-loading

**标题、读取与前端是风格浓度最高的地方：读取页兼作教学，等待也要有进度与可读的提示**

> 适用品类：所有品类 · 相关：[P-dwell-time-budget](#p-dwell-time-budget)、[P-title-lettering](#p-title-lettering)、[P-transition-frequency](#p-transition-frequency)、[P-teach-then-retire](#p-teach-then-retire)、[P-motif-from-world](#p-motif-from-world) · 风格变体：`fam.zero-hud`、`fam.persona-collage`、`fam.ink`

**要解决的问题**

标题、主菜单、读取页、章节卡是玩家停留最久、操作最少的界面，按停留时间分配浓度（P-dwell-time-budget），这里正是风格最该「满」的地方：整幅主视觉、画出来的标题字、主题小动画。但常见两种浪费：读取页只有一个转圈，白白浪费一段注意力；或者标题界面做得像网页后台，第一印象就丢了。读取页可以兼作教学（一条提示 + 一张示意图），等待要给进度。08 调研只看非商业化界面时，带材质标签的登录界面 6 / 100、菜单 22 / 100，远多于战斗界面的 1 / 100（站方标签约 18% 误标，只看趋势）。参数上对应 cnt.screen = screen.title / screen.loading / screen.frontend、el.loading.form、el.title.form、ast.bgArt、rel.behind。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 标题即风景：实时场景 + 极少菜单 | <abbr title="cnt.screen=screen.title">界面类型 = 标题 / 主菜单</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="lay.container=none">容器 = 不画 UI</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 画面本身是卖点的探索、叙事作（GRIS 水彩渐变上的细衬线标题、Journey 沙丘上的极简字）。 | 菜单项少才成立；实时场景要控制性能与读取时间。 | GRIS（steam:683320）、Journey（steam:638230） |
| 整幅主视觉 + 画出来的标题字 | <abbr title="cnt.screen=screen.title">界面类型 = 标题 / 主菜单</abbr>；<abbr title="ast.bgArt=keyArt">替换背景 = 主视觉海报</abbr>；<abbr title="el.title.form=artTitle">标题 / LOGO：画法 = 艺术大字海报标题</abbr>；<abbr title="vis.ornament=2">装饰预算 = 中</abbr> | 角色驱动、风格强的作品（Persona 5 的拼贴、Metaphor 的剪纸异形菜单、Cuphead 1930 年代片头字）。 | 主视觉与标题字都是独立资产（P-title-lettering）；多语种要各写一版。 | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、Cuphead（steam:268910 · 据已知描述） |
| 读取页兼作教学：一条提示 + 示意 | <abbr title="cnt.screen=screen.loading">界面类型 = 读取 / 过场</abbr>；<abbr title="el.loading.form=tipsOnly">加载 / 等待指示：画法 = 只有提示文字</abbr>；<abbr title="cnt.textLength=line">文案量 = 一句话</abbr>；<abbr title="ast.bgArt=sceneArt">替换背景 = 风景插画</abbr> | 读取时间超过 3 秒的作品：每次一条和当前进度相关的提示（下一个 Boss 的弱点、刚解锁的系统）。 | 提示要按进度筛选，随机重复的「小贴士」很快被忽略。 | 明日方舟（gameui:2848） |
| 主题小动画 + 进度 | <abbr title="cnt.screen=screen.loading">界面类型 = 读取 / 过场</abbr>；<abbr title="el.loading.form=motif">加载 / 等待指示：画法 = 母题化（指南针 / 地球 / 放大镜）</abbr> | 读取时间不确定时：用和世界相关的小动画（走路的角色、旋转的徽记）加进度条，告诉玩家「没死机」。 | 动画本身不能卡；进度要诚实。 | 幻塔（完美世界）（gameui:3522）、花亦山心之月（朝夕光年）（gameui:2596） |
| 无读取：遮罩转场与无缝衔接 | <abbr title="mo.transition=iris">界面转场 = 光圈收缩</abbr>；<abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr> | 一镜到底的作品（God of War）或短读取：用镜头、门、遮罩转场藏住读取。 | 依赖技术与关卡设计配合。 | God of War（steam:1593500 · 据已知描述） |

**经验法则**

- 风格浓度：标题、读取、章节卡可以用到装饰预算 2–3，局内 HUD 仍守 0–1（P-dwell-time-budget）。
- 读取超过 3 秒就给进度；超过 10 秒要给可读的内容（提示、图鉴条目、故事前情）。
- 读取提示按当前进度筛选，并能在图鉴里回看（P-teach-then-retire）。
- 标题界面的菜单项不超过 5 个；「继续游戏」永远是第一个、默认焦点。
- 标题字是画出来的资产，每个语种单独出图（P-title-lettering）。

**反例与玩家评价**

- 读取页只有一个转圈，没有进度也没有内容。
  - 评价与证据（依据：推断）：无评测计数；设计推论（Nielsen 响应时间界限）。
- 标题界面用默认控件和系统字体，像设置面板。
  - 评价与证据（依据：推断）：无计数；08 文档 3.3：设计师作品几乎都把 LOGO 和标题字作为独立环节交付。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：标题即风景，菜单直接压在实时场景上（GRIS、Journey）。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：标题与读取页是整套拼贴的最大化。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：读取页是金色水墨旗帜插画 + 一行提示（花亦山心之月）。

**出处**

- [本项目 08 UI 美术资产调研 §2.1（只取非商业化界面）](08-ui-art-assets.md)（S185）：登录 6 / 100、菜单 22 / 100，战斗 1 / 100（标签约 18% 误标）。
- [Art Direction for AAA UI](https://gamedeveloper.com/art/video-art-direction-advice-for-crafting-triple-a-game-ui)（S041）：AAA UI 的美术方向要从世界里取，前端是最能体现方向的地方。
- [Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）](https://www.nngroup.com/articles/response-times-3-important-limits/)（S144）：1 秒以上要给反馈，10 秒以上要给进度。

**可演示的对比**

- **只有转圈 vs 场景图 + 一条提示**（单变量对照；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：加载 / 等待指示：画法：转圈 → 只有提示文字；文案量：无文字 → 一句话
  - 配套改动：替换背景：纯色 / 黑场 → 风景插画
  - 看什么：A 是纯色底上的转圈；B 是一张场景图加一条和当前进度相关的提示。等待时间一样，B 让这几秒有了用处，也是整款游戏风格最浓的一页。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-frontend-loading#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.loading`
  - A：`el.loading.form=spinner` `cnt.textLength=none` `ast.bgArt=solid`
  - B：`el.loading.form=tipsOnly` `cnt.textLength=line` `ast.bgArt=sceneArt`

  </details>
- **标题界面：页眉式标题 vs 主视觉 + 画出来的标题字**（单变量对照；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：标题 / LOGO：画法：页眉标题条 → 艺术大字海报标题；替换背景：纯色 / 黑场 → 主视觉海报
  - 配套改动：装饰预算：无 → 中
  - 看什么：同一组菜单项：A 像设置面板，B 用整幅主视觉和画出来的标题字——这是玩家对风格的第一印象，也是装饰预算最该花的地方。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-frontend-loading#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.title`
  - A：`el.title.form=header` `ast.bgArt=solid` `vis.ornament=0`
  - B：`el.title.form=artTitle` `ast.bgArt=keyArt` `vis.ornament=2`

  </details>

#### P-in-game-charts

**游戏内图表：先给趋势再给数值——增量箭头、内联条、对比条、迷你走势线各管一种问题**

> 适用品类：建造与经营、工厂与自动化、策略与战术、体育与体育经理、模拟驾驶与飞行、MMO、生存与制作 · 相关：[P-progressive-disclosure](#p-progressive-disclosure)、[P-density-tempo](#p-density-tempo)、[P-color-never-alone](#p-color-never-alone)、[P-glance-encoding](#p-glance-encoding)、[P-localization-ready](#p-localization-ready) · 风格变体：`fam.swiss`、`fam.sim-panel`、`fam.printed-manual`

**要解决的问题**

经营、工厂、策略、体育经理的玩家天天在看图表：产量够不够、钱在涨还是在掉、哪个部门拖后腿。但游戏里常把统计做成一张表，玩家要读几十个数字才能看出趋势。图表要先回答问题：「在涨还是在掉」用增量箭头或迷你走势线；「谁多谁少」用内联条；「两股力量谁占上风」用对比条（bipolar）；「离目标还差多少」用分数或百分比；「哪里出问题」用世界内热力图。参考库里 Parkasaurus 的统计页是白底色块 + 折线图 + 大数字，Frostpunk 用希望 / 不满对立条，Terra Nil 用百分比与圆环。参数上对应 st.statViz、st.delta、cmp.gauge（bipolar / fraction / percent / thermometer）、rel.semanticZoom = heatmap；折线 / 走势线目前缺取值（见参数缺口）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 数字 + 增量箭头（最省） | <abbr title="st.delta=arrow">变化 / 前后对比 = a → b 箭头</abbr>；<abbr title="el.resources.valueLabel=delta">资源 / 货币 · 数值标注 = 变化量</abbr> | 资源栏、产量：每项旁边一个 ↑↓ 和每回合 / 每分钟增量（策略内容包的「金币 312（+18 / 回合）」）。 | 只看到当前斜率，看不到历史。 | Sid Meier’s Civilization® VI（steam:289070） |
| 内联条：同屏比较多少 | <abbr title="st.statViz=inlineBar">统计图形 = 行内横条</abbr> | 部门、单位、队员之间比较：每行一根短条，长短一眼可比。 | 条的满值要统一，否则比较失真。 | Planet Zoo（steam:703080） |
| 对比条：两股力量谁占上风 | <abbr title="cmp.gauge=bipolar">数值图形 = 双向对立条</abbr>；<abbr title="el.meter.form=paired">世界 / 社会态势条：画法 = 两项对立</abbr> | 希望 / 不满、阵营支持、比分走势：中间向两边涨（Frostpunk 底部的希望 / 不满对立条）。 | 只能表达两方。 | Frostpunk（steam:323190） |
| 目标进度：分数 / 百分比 / 温度计 | <abbr title="cmp.gauge=fraction">数值图形 = x / y 数字</abbr>；<abbr title="el.meter.form=withIcon">世界 / 社会态势条：画法 = 图标 + 仪表</abbr> | 「离目标还差多少」：恢复度、人口目标、温度（Terra Nil 的百分比圆环、Frostpunk 的温度表盘）。 | 多个目标并列时要统一画法。 | Terra Nil（steam:1593030）、Frostpunk（steam:323190） |
| 世界内热力图：问题在哪里 | <abbr title="rel.semanticZoom=heatmap">语义缩放 = 拉远切热力图</abbr>；<abbr title="el.overlay.form=heatmap">信息叠层 / 图例：画法 = 热力图 + 图例</abbr> | 城建与工厂：污染、满意度、电力覆盖投在地图上。 | 红→绿热力图对色盲不友好，要换成单色明度或加图例符号。 | Factorio（steam:427520）、Cities: Skylines（steam:255710 · 据已知描述） |
| 统计页：大数字 + 走势 | <abbr title="cnt.screen=screen.results">界面类型 = 结算 / 胜负 / 奖励</abbr>；<abbr title="cnt.subtype=stats">界面子功能 = 数据统计 / 战报</abbr>；<abbr title="st.statViz=bigNumber">统计图形 = 战力大字</abbr> | 赛季、财报、比赛统计：一个大数字给结论，下面的走势线给原因（Parkasaurus 统计页）。 | 折线图目前没有参数取值，只能用大数字近似。 | Parkasaurus（steam:591460） |

**经验法则**

- 先写下图表要回答的问题，再选图形：涨跌 → 箭头 / 走势线，多少 → 内联条，对抗 → 对比条，差距 → 分数 / 百分比，位置 → 热力图。
- 提示框里放迷你走势线：悬停一个资源就能看到最近一段时间的变化（Tufte 的「数据墨水」：去掉网格与装饰，只留线）。
- 同一屏的条形用同一满值；单位与时间窗口写在标题里。
- 热力图用单色明度或带符号的图例，不用纯红→绿。
- 大数（万 / 亿或 K / M）按语言习惯缩写（P-localization-ready）。

**反例与玩家评价**

- 统计页是一张几十行的数字表，没有任何趋势或比较图形。 例：Songs of Syx（steam:1162750）。
  - 评价与证据（依据：截图）：看图：Songs of Syx 的深色表格面板；去重后它有 1 条评测明确说界面杂乱（未达门槛）。
- 热力图只用红→绿。
  - 评价与证据（依据：推断）：无计数；06 文档 A9 已把红→绿热力图列为色盲陷阱。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 瑞士几何 / 极简表格（`fam.swiss`，皮肤 `skin.swiss`）：瑞士几何：统计页是网格对齐的条形与折线，单色加一个强调色。
- 模拟 / 策略工具面板（`fam.sim-panel`，皮肤 `skin.godotDefault`）：模拟 / 策略工具面板：数字表加内联条与涨跌箭头。
- 印刷手册 / 数据表（`fam.printed-manual`）：印刷手册：报表做成报纸版式（Anno 1800 的编年史）。

**出处**

- [Edward Tufte, The Visual Display of Quantitative Information](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/)（S104）：最大化数据墨水比；小倍数与迷你走势线能在很小的面积里讲清趋势。
- [PCGamesN, Victoria 3 将沿用 Crusader Kings III 的嵌套提示系统](https://www.pcgamesn.com/victoria-3/nested-tooltip-system)（S094）：复杂经济用嵌套提示逐层解释数字从哪来。

**可演示的对比**

- **一张数字表 vs 内联条 + 增量箭头**（单变量对照；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：统计图形：纯数字表 → 行内横条；变化 / 前后对比：只给新值 → a → b 箭头
  - 看什么：同一组城市数据：A 是纯数字表，要逐行比较；B 每行一根条、一个涨跌箭头，哪个部门拖后腿一眼就能看出来。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-in-game-charts#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.results` `cnt.subtype=stats` `cnt.dataShape=table`
  - A：`st.statViz=table` `st.delta=newOnly`
  - B：`st.statViz=inlineBar` `st.delta=arrow`

  </details>

### 2.5 输入方式与平台适配

回答「手里拿的是什么设备、坐在多远」：提示字形跟设备走、提示放在要按的地方、焦点一眼可见、摇杆用轮盘、触屏目标够大且在拇指区、竖屏上看下按、按视距定字号与安全区、画幅锚定不拉伸、详情不只挂在悬停上、每种输入走完全程、同屏多人对得上号、防误触按输入选。

#### P-glyph-follows-device

**按键提示跟着「手里正在用的设备」走**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、射击、角色扮演、手机触屏（局内与非商业化界面） · 相关：[P-prompt-in-context](#p-prompt-in-context)、[P-motor-input-alternatives](#p-motor-input-alternatives)、[P-input-parity](#p-input-parity) · 风格变体：`fam.pixel`、`fam.ink`、`fam.greybox`

**要解决的问题**

同一款游戏会同时被键鼠、Xbox / PlayStation / Switch 手柄、Steam Deck 和触屏玩到。提示图标和手里的设备对不上时，玩家要先在脑子里把「按 X」翻译成自己手里的键，新手直接卡住；PC 上插着手柄时只在启动时检测一次设备，是最常见的错。设计者面临的问题是：一份 UI 要准备几套按键字形、字形放在哪里、怎么切换。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 键盘键帽（键鼠默认） | <abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="ix.glyphs=keycap">按键提示图标集 = 键盘键帽</abbr>；<abbr title="el.prompt.form=hotkeyBadge">按键 / 操作提示：画法 = 图标角标热键</abbr>；<abbr title="el.abilities.form=slots">技能 / 冷却 / 弹药 / 手牌：画法 = 技能格</abbr>；<abbr title="el.abilities.screenAnchor=bc">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中</abbr> | PC 键鼠为主、技能 / 物品多、需要玩家记住热键（MMO、ARPG、生存建造的数字快捷栏） | 键帽要装得下 Shift / Tab / Ctrl / Space 等长键名，宽度不固定；本地化后键名可能变长（德文键盘的 Strg）；改键后每个角标都要刷新 | World Of Warcraft（iig:world-of-warcraft）、Terraria（steam:105600）、Stardew Valley（steam:413150）、Overwatch（iig:overwatch）、崩坏：星穹铁道（gameui:8283） 等 7 款 |
| 品牌手柄字形（按连接的手柄切 Xbox / PlayStation / Nintendo） | <abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="ix.glyphs=xbox">按键提示图标集 = Xbox</abbr>；<abbr title="el.prompt.form=legend">按键 / 操作提示：画法 = 按键图例条</abbr>；<abbr title="el.prompt.screenAnchor=br">按键 / 操作提示 · 屏幕锚点 = 右下</abbr>；<abbr title="ix.close=keyGlyph">关闭控件 = 按键提示（Esc / B 返回）</abbr> | 主机 / 电视 / 掌机，或 PC 上检测到手柄；按钮少、靠肩键与面键组合 | 至少三套字形素材（再加 Steam Deck）；PlayStation 的 ○ / × 在日本旧机型上确认 / 取消相反，PS5 起全区统一为 × 确认；字形是固定圆钮，比键帽省排版但要按品牌换颜色与形状 | ELDEN RING（steam:1245620）、Clair Obscur: Expedition 33（steam:1903340）、KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、Assassin's Creed: Director's Cut Edition（steam:15100）、Assassin's Creed 2（steam:33230 · 据已知描述） 等 6 款 |
| 混合输入：按最近一次输入整套切换 | <abbr title="ctx.input=hybrid">输入方式 = 键鼠 + 手柄自动切换</abbr>；<abbr title="ix.focus=outline">导航焦点表现 = 高亮描边</abbr>；<abbr title="el.prompt.form=contextual">按键 / 操作提示：画法 = 情境按键</abbr> | PC 发行同时支持手柄、Steam Deck、云游戏；玩家可能边玩边换设备 | 每条提示、教程、按键图都要能实时换皮；摇杆死区内的轻微漂移不能触发切换，否则图标来回闪；排版要按最宽的一套字形留位 | Hades（steam:1145360）、Balatro（steam:2379780）、ELDEN RING（steam:1245620） |
| 文字 / 方括号文字（「按 E」、[E]） | <abbr title="ix.glyphs=brackets">按键提示图标集 = 括号文字 [E]</abbr>；<abbr title="typ.body.family=mono">正文字族 = 等宽 / 终端</abbr>；<abbr title="el.interact.form=keyPrompt">交互提示：画法 = 按键图标 + 文字</abbr> | 终端 / 复古 / 极简风格，或字形素材预算不够；叙事向游戏把提示写成一句话 | 不认识键位的人要先读字；手柄上写成「按 A」仍要按品牌换字；方括号只适合键盘，换手柄时必须改回图形字形 | Inscryption（steam:1092790） |
| 触屏：按钮画「动作」而不画键名 | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.glyphs=touch">按键提示图标集 = 触屏图标</abbr>；<abbr title="el.prompt.form=touchButtons">按键 / 操作提示：画法 = 触屏按钮</abbr>；<abbr title="cmp.button=icon">按钮内容 = 图标</abbr> | 手机 / 平板触屏 HUD；按钮本身就是提示 | 图标要一眼看出动作（剑 = 攻击、箭头 = 跳）；同一 HUD 若还要兼容手柄 / 键鼠，可以在角上加小号键位字母（天涯明月刀），但纯触屏时那些字母只是噪音 | 原神（米哈游）（gameui:1691）、Stumble Guys（steam:1677740）、暖雪-手游（gameui:6750）、天涯明月刀（gameui:12771） |

**经验法则**

- 提示字形 = 当前活动设备；以最近一次有效输入切换，摇杆死区内的微动和鼠标轻微抖动不算
- 字形集至少备齐：键帽、Xbox、PlayStation、Nintendo、触屏；在 Steam Deck 上用其自带控件时不得出现键鼠字形
- 改键后，所有提示、教程、按键图、加载页小贴士同步换成新键
- 字形里的字母也要达到正文最小字号，字形随文字缩放一起放大（到 200%）
- 触屏按钮画动作符号，不写 A / X / R1
- 确认与返回全游戏固定：A（Xbox）/ ×（PS5 起各区）确认，B / ○ 返回；B 能返回时界面上不必再画返回按钮

**反例与玩家评价**

- 键鼠在用却显示手柄字形（或反过来），或者只在启动时检测一次设备；PC 移植作沿用主机提示 例：Kingdom Rush Vengeance - Tower Defense（steam:1367550）、Assassin's Creed 2（steam:33230 · 据已知描述）、Heavy Rain（steam:960910 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述）、FINAL FANTASY X/X-2 HD Remaster（steam:359870 · 据已知描述）。
  - 评价与证据（依据：背景）：R3「手柄 / 键位不好」去重后 20 款 25 条，≥ 2 条的只有 3 款：Assassin's Creed 2 3 条、Heavy Rain 3、FINAL FANTASY X/X-2 HD 2——都是移植作，但样本太少，不能说「多数移植作」（关键词粗筛，分不出是图标错还是键位本身别扭）。
- 改键之后，教程、提示、按键图里还是旧键位
  - 评价与证据（依据：文献）：评测统计没有专门类别；Xbox 无障碍指南 107 把「改键后所有提示同步更新」列为硬性要求
- 手柄字形里的字母比正文还小（圆钮够大、里面的 A / X 只有十来像素）
  - 评价与证据（依据：文献）：无直接计数；字号类抱怨收紧口径后全库 10 条 / 8 款，不足以说明「主机首发大作」的问题，依据改为 XAG 101 与 Steam Deck 规范。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：每套手柄字形都要画像素版，切换设备时整套替换。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：按键字形放进印章形底框，手柄与键盘各一套印章。
- 灰盒（中性基线）（`fam.greybox`，皮肤 `skin.greybox`）：灰盒基线：先用最朴素的字形把切换逻辑做对，再交给皮肤。

**出处**

- [Steamworks: Steam Deck Compatibility Review Process](https://partner.steamgames.com/doc/steamdeck/compat)（S157）：屏幕上的按键字形必须与正在使用的输入一致（Deck / Steam 手柄 / Xbox），默认配置下用 Deck 控件时不得出现键鼠字形；需要输入文字时必须能调出屏幕键盘
- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：所有操作都应可重映射；改键后提示、教程、按键图中的标注要同步正确
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：图标与按键字形里的文字也要达到最小字号，并随文字缩放到 200%
- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：按实际连接的手柄品牌显示标签，优先用符号而非文字；触屏虚拟按钮用表示动作的图形，不要写手柄键名；菜单外的标准映射是 A 激活、B 取消 / 返回、肩键切分区
- [Famitsu / Kotaku 关于 PS5 统一确认键的报道（Byteside 转述）](https://www.byteside.com/2020/10/sony-playstation-5-japan-input-x-o-swap/)（S082）：PS5 起日本区也改为 × 确认、○ 取消，与其它地区统一（系统层面；游戏可自定）

**可演示的对比**

- **PC 键鼠却显示手柄圆钮 vs 键帽字形**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：按键提示图标集：Xbox → 键盘键帽
  - 看什么：同一个 PC 键鼠 HUD：A 手动锁成 Xbox 字形（模拟移植作没切换），交互提示和右下情境按键都画成圆钮 A / X / Y；B 换成键帽 E / Q / Shift。看提示条的宽度变化——键帽要给长键名留宽，圆钮宽度固定；再把 ctx.input 改成 hybrid 体会「按最近输入切换」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-glyph-follows-device#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `ctx.device=pc` `ctx.input=kbm` `cnt.elements=el.vitals+el.abilities+el.interact+el.prompt` `el.prompt.form=contextual` `el.interact.form=keyPrompt` `el.prompt.screenAnchor=br` `cnt.screen=screen.hud`
  - A：`ix.glyphs=xbox`
  - B：`ix.glyphs=keycap`

  </details>

#### P-prompt-in-context

**按键提示放在「要按的地方」：情境提示优先，常驻键位表兜底**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、沙盒与物理、恐怖与悬疑 · 相关：[P-glyph-follows-device](#p-glyph-follows-device)、[P-hudless-tax](#p-hudless-tax)、[P-contextual-hud](#p-contextual-hud) · 风格变体：`fam.contextual-hud`、`fam.comic`、`fam.dark-hairline`

**要解决的问题**

动作游戏里此刻能按什么随情境变化。全键位表常驻会占屏、没人看；把提示全删掉换来的「干净」又让新手不知道能做什么——「提示 / 引导不清」是 R3 里最大的一类抱怨（去重后 41 款 ≥ 2 条）。问题是：哪些提示常驻、哪些贴到世界里、菜单里的提示放哪。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 世界内情境提示（字形 + 动词贴在可交互物旁） | <abbr title="el.interact.form=keyPrompt">交互提示：画法 = 按键图标 + 文字</abbr>；<abbr title="el.interact.attachTo=poi">交互提示 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.interact.visibility=contextual">交互提示 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | 第三人称探索、潜行、恐怖：可交互物稀疏，需要「走近才出现」 | 要有世界挂点、遮挡与距离缩放；多个可交互物挤在一起时要排优先级；背景不可控，字必须描边或垫底 | Stray（steam:1332010）、Rise of the Tomb Raider（steam:391220 · 据已知描述）、Beyond: Two Souls（steam:960990 · 据已知描述）、Heavy Rain（steam:960910 · 据已知描述）、Forgotton Anne（steam:542050 · 据已知描述） |
| 屏幕角落情境按键表（当前可用的 2–4 个动作） | <abbr title="el.prompt.form=contextual">按键 / 操作提示：画法 = 情境按键</abbr>；<abbr title="el.prompt.screenAnchor=br">按键 / 操作提示 · 屏幕锚点 = 右下</abbr>；<abbr title="el.prompt.visibility=contextual">按键 / 操作提示 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="cnt.elements=el.prompt">信息元素集合 = 按键 / 操作提示</abbr> | 开放世界、动作冒险：动作随载具 / 姿态变化（骑马、驾船、攀爬） | 角落离视线中心远，紧急动作（QTE、反击）不适合放这里；要和小地图 / 弹药抢角落 | Crow Country（steam:1996010）、Minute of Islands（steam:1049710）、Red Dead Redemption 2（steam:1174180 · 据已知描述）、Assassin’s Creed IV Black Flag（steam:242050 · 据已知描述）、Assassin's Creed 2（steam:33230 · 据已知描述） |
| 菜单底部按键图例条（A 选择 / B 返回 / LB RB 切页） | <abbr title="el.prompt.form=legend">按键 / 操作提示：画法 = 按键图例条</abbr>；<abbr title="el.prompt.screenAnchor=bl">按键 / 操作提示 · 屏幕锚点 = 左下</abbr>；<abbr title="ix.dismiss=key">本屏怎么结束 = 按键返回（Esc / B）</abbr>；<abbr title="ix.close=keyGlyph">关闭控件 = 按键提示（Esc / B 返回）</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="cnt.elements=el.prompt">信息元素集合 = 按键 / 操作提示</abbr>；<abbr title="ix.glyphs=xbox">按键提示图标集 = Xbox</abbr> | 所有手柄菜单、设置、背包、商店；键鼠版也可保留（Esc / Tab / M） | 每屏都要列本屏真正有效的键；位置与顺序必须全游戏一致，否则玩家每屏都要重新找 | 崩坏：星穹铁道（gameui:8283）、ELDEN RING（steam:1245620）、Clair Obscur: Expedition 33（steam:1903340）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild） 等 6 款 |
| 技能 / 物品格上的热键角标 | <abbr title="el.prompt.form=hotkeyBadge">按键 / 操作提示：画法 = 图标角标热键</abbr>；<abbr title="el.abilities.form=hotbar">技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏</abbr>；<abbr title="el.abilities.arrangement=row">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 横排</abbr>；<abbr title="el.abilities.screenAnchor=bc">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中</abbr>；<abbr title="cnt.elements=el.prompt">信息元素集合 = 按键 / 操作提示</abbr>；<abbr title="ix.glyphs=brackets">按键提示图标集 = 括号文字 [E]</abbr> | 键鼠 MMO / ARPG / 生存的数字快捷栏；格子与键一一对应 | 角标很小，最容易低于最小字号；换手柄后角标要变成 D-pad 方向或面键组合 | World Of Warcraft（iig:world-of-warcraft）、Terraria（steam:105600）、Stardew Valley（steam:413150）、Overwatch（iig:overwatch）、天涯明月刀（gameui:12771） 等 6 款 |
| 完整键位表 / 手柄示意图（放在暂停或设置里，必要时常驻） | <abbr title="cnt.screen=screen.settings">界面类型 = 设置</abbr>；<abbr title="cnt.subtype=rebind">界面子功能 = 按键绑定</abbr>；<abbr title="cmp.bindingMap=pad">按键绑定呈现 = 手柄示意图 + 引线</abbr> | 操作复杂的格斗 / 模拟 / 硬核游戏；或作为改键页 | 常驻在局内就是「调试面板」感，只适合把操作本身当玩法的作品 | Your Only Move Is HUSTLE（steam:2212330）、Hollow Knight（steam:367520） |

**经验法则**

- 菜单图例条固定在同一角、同一顺序（确认在前、返回在后），只列本屏有效的键
- 局内只提示「此刻能做而且不常做」的动作；教会以后自动隐去，或给「提示频率」选项
- 贴物体的提示离物体不超过约一个角色身高，必须描边或垫半透明底
- 零 HUD 风格也要留首次提示通道（叙事内物件、声音、光引导）
- 热键角标与技能格同样遵守最小字号；换手柄时角标变成方向 / 面键而不是消失
- VR 或叙事内 UI：提示挂在手、手持物或可交互物上，而不是贴在镜头前
- 确认 / 返回 / 页签 LB-RB / 翻页 LT-RT 在所有菜单相同。

**反例与玩家评价**

- 为了「零 HUD」把情境提示也删光，又没有叙事内 / 声音 / 环境替代 例：Scorn（steam:698670）、Kingdom Two Crowns（steam:701160）。
  - 评价与证据（依据：评测）：R3「提示 / 引导不清」去重后 41 款 ≥ 2 条，各类里最多：Scorn 7、Kingdom Two Crowns 7、ASTRONEER 4、Destiny 2 4；Kingdom Two Crowns 同时有 3 条夸 UI 简洁——干净和看不懂是同一个决定的两面。
- 菜单图例每屏换位置、换顺序，或列出本屏无效的键 例：No Man's Sky（steam:275850）、Starfield（steam:1716740）、Valheim（steam:892970）。
  - 评价与证据（依据：背景）：R3「菜单 / 界面难用」去重后 19 款 ≥ 2 条（Valheim 7、Starfield 4、No Man's Sky 3…）；关键词分不出是否由图例不一致引起，只作背景。
- 常驻整张键位表压在玩法区上 例：Your Only Move Is HUSTLE（steam:2212330）。
  - 评价与证据（依据：推断）：无可靠评测计数：「HUD 太乱」一类人工复核后只剩 9 条、每款 1 条。这条是设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 情境渐显 · 角落小件（`fam.contextual-hud`，皮肤 `skin.mono`）：情境渐显：按键提示只在走近可交互物时淡入，挂在物体上。
- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：提示是小气泡加按键图标。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：右下一列细字提示，随状态整组替换。
- 17 号图谱反查到的相关家族：`fam.scumm-verbs`

**出处**

- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：跨界面重复出现的组件（如「选择 / 返回」提示）应在相同位置、相同相对顺序出现；以 Sea of Thieves 左下角固定提示为例
- [Console Dev Diary #3: UI/UX and Controls（Crusader Kings III）](https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls)（S056）：主机版把操作提示放在屏幕底部，并随菜单与情境变化，帮助玩家逐步学会操作
- [Microsoft · Gamepad and remote control interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/gamepad-and-remote-interactions)（S148）：B 用于返回时界面上不必再画返回按钮；Menu 键打开上下文菜单、Y 作搜索加速键
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：局内交互提示（如物品上方的「收集」）用描边保证在任意背景上可读

**可演示的对比**

- **顶部常驻整张键位表 vs 右下情境按键 + 贴物提示**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：按键 / 操作提示：画法：键位列表 → 情境按键；按键 / 操作提示 · 屏幕锚点：上中 → 右下；交互提示：画法：无 → 按键图标 + 文字
  - 配套改动：信息元素集合：生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 按键 / 操作提示 → 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 按键 / 操作提示 + 交互提示；HUD 显隐策略：常驻 → 情境显现
  - 看什么：A 顶部常驻整张键位表，压住画面上方；B 只在右下列出当前能做的 2–4 个动作，并把交互提示贴在可交互物旁，HUD 随情境出现。打开屏占比读数看两者差多少。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-prompt-in-context#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `ctx.input=pad` `ctx.device=tv` `cnt.screen=screen.hud`
  - A：`cnt.elements=el.vitals+el.abilities+el.prompt` `el.prompt.form=list` `el.prompt.screenAnchor=tc` `rel.hudVisibility=always` `el.interact.form=[]`
  - B：`cnt.elements=el.vitals+el.abilities+el.prompt+el.interact` `el.prompt.form=contextual` `el.prompt.screenAnchor=br` `el.interact.form=keyPrompt` `rel.hudVisibility=contextual`

  </details>
- **单变量版：顶部常驻整张键位表 → 只切换 el.prompt.form、el.prompt.screenAnchor、el.interact.form**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：按键 / 操作提示：画法：键位列表 → 情境按键；按键 / 操作提示 · 屏幕锚点：上中 → 右下；交互提示：画法：无 → 按键图标 + 文字
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-prompt-in-context#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `ctx.input=pad` `ctx.device=tv` `cnt.screen=screen.hud` `cnt.elements=el.vitals+el.abilities+el.prompt` `rel.hudVisibility=always`
  - A：`el.prompt.form=list` `el.prompt.screenAnchor=tc` `el.interact.form=[]`
  - B：`el.prompt.form=contextual` `el.prompt.screenAnchor=br` `el.interact.form=keyPrompt`

  </details>

#### P-focus-unmistakable

**手柄 / 键盘焦点一眼可见、移动可以预测：至少两种通道，对相邻颜色 ≥ 3:1**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、策略与战术、卡牌与桌面 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-view-distance](#p-view-distance)、[P-menu-architecture](#p-menu-architecture) · 风格变体：`fam.candy`、`fam.dark-hairline`、`fam.ink`

**要解决的问题**

没有指针时，「我现在停在哪」全靠焦点表现；坐在沙发上的玩家不会盯着整个电视。焦点和「已装备 / 已选中」如果用同一种记号，手柄移动时分不清；二维网格里还常有方向键走不到的格子、要穿过整条长列表才能按到的按钮。焦点只靠微弱发光或换色时，低视力与色觉异常玩家会迷路，电视视距下更明显；从鼠标界面移植来的菜单常常只有悬停态，没有焦点态。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 高亮描边 / 外发光（通用、跟任何皮肤都搭） | <abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="ix.focus=outline">导航焦点表现 = 高亮描边</abbr>；<abbr title="st.selected=check">已选 / 已装备标记 = 勾选角标</abbr> | 格子背包、卡牌、装备页；需要焦点框和格子本身都清楚 | 细描边在亮背景或电视上会「丢」，要够粗或配发光；描边颜色不能和稀有度边框色撞 | ELDEN RING（steam:1245620）、Slay The Spire（iig:slay-the-spire）、Black Myth: Wukong（steam:2358720） |
| 光标手指 / 三角（JRPG 指令窗） | <abbr title="ix.focus=cursor">导航焦点表现 = 光标指示（手指 / 三角 / 括号）</abbr>；<abbr title="cmp.dialogBox=bar">对话框结构 = 底部通栏</abbr>；<abbr title="lay.arrangement=column">条目排布几何 = 竖列</abbr> | 竖排指令菜单、对话选项、复古 / 像素风 | 光标要有轻微摆动动画，否则静止时不显眼；只适合一维列表 | FINAL FANTASY VIII（steam:39150）、FINAL FANTASY IX（steam:377840）、KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、Hollow Knight（steam:367520）、FINAL FANTASY VII REMAKE INTERGRADE（steam:1462040 · 据已知描述） |
| 整行色条 / 底色反白（表格、设置页） | <abbr title="ix.focus=invert">导航焦点表现 = 底色反白</abbr>；<abbr title="cmp.optionEnum=arrows">设置项：多选一 = 左右切换 ◁ ▷</abbr>；<abbr title="cmp.optionRange=segmentedBar">设置项：数值 = 分格条</abbr> | 瑞士 / 军事 / 终端风格的数据表、设置项；行宽占满时最醒目 | 反白后文字颜色要翻转，图标也要准备反色版本；整行色条不适合网格 | CONTROL（steam:870780）、METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Persona 5 Royal（steam:1687950） |
| 放大 + 描边，配合非焦点压暗 | <abbr title="ix.focus=scale">导航焦点表现 = 放大</abbr>；<abbr title="hier.dimInactive=0.3">非焦点压暗 = 0.3</abbr> | 格子、卡片、关卡选择：Elden Ring 的装备格选中时有高亮框。 | 放大会挤到邻格，要预留间距；压暗太多会让未选项读不清（未激活文字仍需 3:1）。 | ELDEN RING（steam:1245620） |
| 风格化焦点（毛笔笔触垫底、异形块放大、斜切） | <abbr title="ix.focus=brushSwash">导航焦点表现 = 毛笔笔触垫底</abbr>；<abbr title="vis.edge=brush">边缘处理 = 笔触</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr> | 美术风格强的菜单（和风、拼贴、西部）：焦点本身就是风格的一部分 | 需要素材；风格化焦点的形状变化要大到远看也能分辨（放大 / 变形 ≥ 10%） | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、Red Dead Redemption 2（steam:1174180 · 据已知描述）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |
| 焦点颜色单独设为语义色（col.focus），并参与对比检查 | <abbr title="col.focus=#FFD54A">焦点色 = #FFD54A</abbr>；<abbr title="ix.focus=outline">导航焦点表现 = 高亮描边</abbr>；<abbr title="vis.strokeWidth=3">描边粗细 = 3</abbr> | 任何以描边表示焦点的皮肤：焦点色与强调色、稀有度色分开，描边足够粗。 | 多一个必须在所有皮肤里调好的颜色。 | — |
| 局部指针模式（只在地图 / 大画布里给摇杆光标） | <abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="cnt.screen=screen.map">界面类型 = 地图 / 世界地图</abbr>；<abbr title="lay.overflow=pan">内容溢出方式 = 可拖动大画布</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr> | 世界地图、策略大地图、技能星图等自由画布，方向键焦点走不通的地方 | 光标需要吸附与「经过目标时减速」，否则摇杆点小目标很累；按确认键时拇指会让摇杆轻微偏移，要忽略这瞬间的移动 | Sid Meier’s Civilization® VI（steam:289070）、Stellaris（steam:281990）、Baldur's Gate 3（steam:1086940 · 据已知描述） |

**经验法则**

- 焦点至少用两种通道（形状 / 尺寸 / 光标 + 颜色），焦点指示对相邻颜色 ≥ 3:1（WCAG 1.4.11）。
- 手柄 / 键盘导航时屏幕上始终恰好一个焦点；进入界面时焦点落在最可能的第一个动作上
- 焦点与「已选 / 已装备」必须用不同视觉通道（如焦点 = 描边 + 放大，已装备 = 角标勾）
- 焦点移动顺序与视觉顺序一致，方向键与摇杆都能导航（XAG 107：界面支持数字输入）。
- 一维列表首尾循环，二维网格不循环；LB / RB 切页签，LT / RT 翻页，B 永远返回
- 从屏幕一边到另一边不超过约 6 次方向键；长列表前后的按钮挪到列表侧面或上方
- 鼠标模式下可以隐藏焦点框，但手柄一动必须立刻出现
- 不可用项也能被聚焦并说明原因，其文字 ≥ 3:1（XAG 102 未激活元素）。
- 只有自由画布才给虚拟光标，并做吸附与减速

**反例与玩家评价**

- 焦点和「已装备 / 已选中」用同一种描边，手柄移动时分不清哪个是光标
  - 评价与证据（依据：推断）：评测统计没有专门类别；参数体系在 v2 把焦点（ix.focus）和已选（st.selected）拆成两个参数正是为此
- 焦点只有轻微外发光或换色，在深色界面或电视上看不出。
  - 评价与证据（依据：文献）：评测没有可计数的分类；WCAG 1.4.11 要求焦点指示对相邻颜色 ≥ 3:1。
- 只有鼠标悬停态，没有手柄焦点态，或进入页面时没有默认焦点。
  - 评价与证据（依据：背景）：R3 手柄 / 键位类去重后 25 条 / 20 款里可能包含此类问题，但计数无法区分具体原因。
- 把 PC 布局原样放上主机、用摇杆当鼠标点小控件；或二维布局里有方向键走不到的元素 例：RollerCoaster Tycoon Classic（steam:683900）、Songs of Syx（steam:1162750）。
  - 评价与证据（依据：背景）：R3「菜单 / 界面难用」去重后 19 款 ≥ 2 条，建造 / 经营 / 生存类最集中（Valheim 7、Parkasaurus 3、Dyson Sphere Program 3、Planet Zoo 2）；关键词分不出是否与焦点导航有关，只作背景。
- 长列表之后才放「确认 / 下一页」按钮，手柄要按几十下才能到
  - 评价与证据（依据：文献）：无直接计数；微软手柄指南以「50 项列表需要 51 次点击」为反例

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：焦点项放大 + 白色粗描边 + 轻微弹跳。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：焦点用暖光渐亮 + 左侧一根细竖线。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：焦点是一笔墨刷扫过（brushSwash）。
- 17 号图谱反查到的相关家族：`fam.jrpg`、`fam.neobrutal`

**出处**

- [Microsoft · Gamepad and remote control interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/gamepad-and-remote-interactions)（S148）：屏幕上应始终有一个可见焦点；初始焦点放在最可能先操作的元素；XY 导航会出现走不到的元素和长列表陷阱，可用「焦点进入」或重排解决；地图类自由画布才用指针模式
- [Microsoft · Designing for Xbox and TV](https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv)（S147）：从电视一边导航到另一边不应超过六次点击；焦点要清楚且不会被误认
- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：导航顺序要符合视觉布局；单向菜单首尾循环，多向网格不必循环；整个游戏的确认 / 返回 / 切页键保持一致；UI 必须能只用数字按键走完
- [Console Dev Diary #3: UI/UX and Controls（Crusader Kings III）](https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls)（S056）：主机版放弃「摇杆当鼠标」保留 PC 界面的做法，改用在菜单、地图、弹窗之间切换焦点
- [W3C Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)（S158）：组件被聚焦时，其焦点指示对相邻颜色须 ≥ 3:1；与 2.4.7 焦点可见配合使用。
- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：菜单与游戏内界面都要支持数字与模拟导航，可用单键、非同时按键完成全部操作。
- [XAG 102: Contrast](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)（S069）：未激活元素上的文字对背景至少 3:1。

**可演示的对比**

- **焦点与已装备都是描边 vs 焦点放大 + 已装备角标**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：导航焦点表现：高亮描边 → 放大；已选 / 已装备标记：描边 → 勾选角标
  - 看什么：电视 + 手柄的背包：A 焦点和「已装备」都是描边，同屏两个框，看不出光标停在哪；B 焦点改为放大浮起、已装备改为角标勾，两种状态同屏也分得开。再试 ix.focus = cursor / invert / brushSwash 对比不同风格。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-focus-unmistakable#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `ctx.device=tv` `ctx.input=pad` `cnt.screen=screen.inventory`
  - A：`ix.focus=outline` `st.selected=outline`
  - B：`ix.focus=scale` `st.selected=check`

  </details>

#### P-radial-for-sticks

**摇杆选方向：径向轮盘与十字快捷格代替一排热键**

> 适用品类：动作与 Roguelite、射击、角色扮演、策略与战术 · 相关：[P-input-parity](#p-input-parity)、[P-pause-world-state](#p-pause-world-state) · 风格变体：`fam.scifi`、`fam.dark-hairline`、`fam.handmade-craft`

**要解决的问题**

手柄只有十几个键，PC 上一排 10–12 个数字热键无法一一映射；战斗中又要快速换武器 / 法术 / 道具 / 表情。方向是摇杆最自然的输入，所以主机游戏把「选择」变成「指向」：轮盘、十字格、菱形格。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 按住呼出的武器 / 能力轮（开轮时慢放或暂停） | <abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="cnt.dataShape=collection">主数据结构 = 同类集合</abbr>；<abbr title="lay.arrangement=ring">条目排布几何 = 环绕中心 / 轮盘</abbr>；<abbr title="lay.composition=single">分区方式 = 单区</abbr>；<abbr title="ix.mode=select">主交互模式 = 选择条目</abbr>；<abbr title="flow.entry=hotkey">进入方式 = 按键呼出</abbr> | 第三人称动作 / 射击里 6–8 种武器或能力，需要战斗中切换 | 单层超过 8 格方向就分不清，要分层或分页；轮盘盖住画面中心；多人游戏不能暂停，开轮时人很脆弱 | Ratchet & Clank: Rift Apart（steam:1895880 · 据已知描述）、Dishonored（steam:205100 · 据已知描述）、Marvel’s Spider-Man Remastered（steam:1817070 · 据已知描述）、Red Dead Redemption 2（steam:1174180 · 据已知描述）、Ori and the Will of the Wisps（steam:1057090 · 据已知描述） |
| 十字 / 菱形四向快捷格（D-pad 或四个面键直接对应） | <abbr title="el.abilities.form=hotbar">技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏</abbr>；<abbr title="el.abilities.arrangement=cross">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 十字四向</abbr>；<abbr title="el.abilities.screenAnchor=bl">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左下</abbr> | 魂类、动作 RPG：只有 4 个常用物品 / 法术，必须「盲按」 | 直达位只有 4 个，多的靠循环切换或「按住 + 面键」翻页，玩家要记；图形必须本身就是十字 / 菱形，才能免学 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）、Hogwarts Legacy（steam:990080 · 据已知描述）、Assassin's Creed Odyssey（steam:812140 · 据已知描述） |
| 竖排指令菜单（JRPG / 动作 RPG） | <abbr title="el.abilities.form=slots">技能 / 冷却 / 弹药 / 手牌：画法 = 技能格</abbr>；<abbr title="el.abilities.arrangement=column">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 竖列</abbr>；<abbr title="el.abilities.screenAnchor=bl">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左下</abbr>；<abbr title="ix.focus=cursor">导航焦点表现 = 光标指示（手指 / 三角 / 括号）</abbr> | 半即时 / 指令制战斗：攻击 / 魔法 / 道具三四项，上下键即可 | 层级深时要多次进出；实时战斗中翻子菜单慢，常配「快捷指令」 | KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、FINAL FANTASY VIII（steam:39150）、FINAL FANTASY VII REMAKE INTERGRADE（steam:1462040 · 据已知描述） |
| 分层大轮盘代替 PC 热栏（主机版 CRPG / 策略） | <abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="lay.arrangement=ring">条目排布几何 = 环绕中心 / 轮盘</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="cmp.tab=iconText">页签内容 = 图标 + 文字</abbr> | PC 上用到几乎整张键盘的复杂游戏移植主机（法术书、日志、营地都塞进轮盘） | 层数超过 2 就慢；玩家整理轮盘的成本高，需要自定义与「上次位置记忆」 | Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 键鼠：线性热栏 + 数字键直达 | <abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="el.abilities.form=hotbar">技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏</abbr>；<abbr title="el.abilities.arrangement=row">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 横排</abbr>；<abbr title="el.abilities.screenAnchor=bc">技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中</abbr>；<abbr title="el.prompt.form=hotkeyBadge">按键 / 操作提示：画法 = 图标角标热键</abbr> | PC 首发的 MMO、生存、种田：格子多、要拖拽整理 | 搬到手柄上无法一键直达，需要另做轮盘或循环；格子多时下中一整条压住画面 | World Of Warcraft（iig:world-of-warcraft）、Terraria（steam:105600）、Stardew Valley（steam:413150）、Enshrouded（steam:1203620） |

**经验法则**

- 单层轮盘 ≤ 8 个方向（4 或 8 最好）；超过就分层，层数 ≤ 2
- 每格同时给图标和名字；指向的格放大，中心显示名字、数量、冷却
- 动作游戏开轮慢放或暂停，并在设置里写明；多人游戏不暂停，就把轮盘做小、只盖住半屏
- 鼠标操作轮盘时按「移动方向」选择，而不是要求精确点中图标；键盘另给数字键直达
- 十字 / 菱形快捷格的形状要与 D-pad / 面键布局一致；技能区锚点跟右手面键走（全库技能区在右下 15 张、下中 18 张）
- 记住上次选择的格，松开即确认，避免拇指惯性把选择带进下一个菜单

**反例与玩家评价**

- 单层轮盘塞进十几项、只有图标没有名字，方向分辨不出、选错率高
  - 评价与证据（依据：文献）：评测统计没有轮盘专项；HCI 研究（标记菜单）显示每层超过 8 项时错误率明显上升
- 把 PC 的一排 10 格热栏原样放上手柄，用摇杆光标去点小格；或触屏首发的点选玩法直接上手柄 例：Kingdom Rush Vengeance - Tower Defense（steam:1367550）。
  - 评价与证据（依据：推断）：Kingdom Rush Vengeance（触屏首发塔防）去重后手柄 / 键位抱怨 1 条；整类「手柄 / 键位不好」去重后 20 款 25 条。证据很弱，主要是设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：武器轮是切角扇区 + 发光选中。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：轮盘是一圈细线分隔的扇区，中心写当前选择。
- 手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`）：手工实物：轮盘是纸做的转盘，选中项翘起来。
- 17 号图谱反查到的相关家族：`fam.scumm-verbs`

**出处**

- [Callahan, Hopkins, Weiser, Shneiderman · An Empirical Comparison of Pie vs. Linear Menus（CHI '88）](https://dl.acm.org/doi/10.1145/57167.57182)（S172）：饼形菜单比线性菜单选择更快、错误更少，原因是每个方向的目标更大、离起点同样近（Fitts 定律）
- [Kurtenbach & Buxton · The Limits of Expert Performance Using Hierarchic Marking Menus（CHI '93）](https://www.research.autodesk.com/publications/the-limits-of-expert-performance-using-hierarchic-marking-menus/)（S177）：层级标记菜单的宽度与深度都会抬高错误率；常被引用的结论是每层 8 项以内、8 项时最多两层
- [PlayStation Blog · How Baldur's Gate 3 adapts its gameplay for DualSense](https://blog.playstation.com/2023/09/05/how-baldurs-gate-3-adapts-its-expansive-rpg-gameplay-for-your-dualsense-controller/)（S109）：主机版把 PC 的常驻动作栏改成可自定义的径向菜单，地图、日志、法术书等由扳机键呼出的大轮盘进入
- [Console Dev Diary #3: UI/UX and Controls（Crusader Kings III）](https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls)（S056）：主机版用「人物轮盘」与「地图模式轮盘」做快速入口，肩键开顶层菜单、Bumper 切子菜单

**可演示的对比**

- **PC 热栏原样搬上手柄 vs 左下十字四格**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 内部排布：横排 → 十字四向；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：下中 → 左下；按键 / 操作提示：画法：图标角标热键 → 无
  - 看什么：A 把 PC 的一排热栏原样搬到手柄 + 电视，角标还是 1–0；B 改成左下十字四格，形状就是 D-pad。看下中区域被腾出来，以及字形从数字变成方向。想看轮盘本身，可把 cnt.screen 换成背包、lay.arrangement = ring。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-radial-for-sticks#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `ctx.device=tv` `ctx.input=pad` `cnt.elements=el.vitals+el.abilities+el.minimap` `el.abilities.form=hotbar` `cnt.screen=screen.hud`
  - A：`el.abilities.arrangement=row` `el.abilities.screenAnchor=bc` `el.prompt.form=hotkeyBadge`
  - B：`el.abilities.arrangement=cross` `el.abilities.screenAnchor=bl` `el.prompt.form=[]`

  </details>

#### P-touch-target-size

**触屏：目标够大、主次分明、离拇指近，次要键也不能小，能不放按钮就不放**

> 适用品类：动作与 Roguelite、角色扮演、策略与战术、解谜与侦探、卡牌与桌面、手机触屏（局内与非商业化界面） · 相关：[P-portrait-one-hand](#p-portrait-one-hand)、[P-confirm-by-input](#p-confirm-by-input)、[P-motor-input-alternatives](#p-motor-input-alternatives) · 风格变体：`fam.candy`、`fam.ink`、`fam.flat`

**要解决的问题**

手指会盖住按钮、没有悬停、精度只有约一厘米；横屏双手握持时拇指只够得到两个下角。虚拟按键越多越难按，越难按越容易误触。触屏 UI 的核心取舍是：用多少虚拟按键、多大、放哪，哪些动作干脆交给自动或直接操作。手机战斗 HUD 的主键普遍很大，但倍速、暂停、跳过、自动这类次要但常用的键常只有约 36–44pt、挤在角落（R4 目测）；手抖、单手持机、设备固定在支架上的玩家最容易误触或够不着。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 横屏：左摇杆 + 右下大攻击键 + 技能沿弧形环绕 | <abbr title="ctx.device=phone">设备与观看距离 = 手机</abbr>；<abbr title="ctx.orientation=landscape">画幅朝向 = 横屏</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.thumbZone=twoThumbs">握持与拇指区 = 横屏双拇指</abbr>；<abbr title="ix.touchStick=floating">虚拟摇杆 = 浮动摇杆</abbr>；<abbr title="ix.touchCluster=arc">触屏按钮布局 = 大键 + 弧形环绕</abbr>；<abbr title="ix.touchSize=88">触控尺寸 = 88</abbr> | 动作 / ARPG / MMO / 派对：持续移动 + 多个技能 | 右拇指只能同时盯一个键，技能多于 5 个就得分页；浮动摇杆不显示底盘，新手不知道能按在哪（要首次提示） | 暖雪-手游（gameui:6750）、三界天骄（gameui:6729）、天涯明月刀（gameui:12771）、元梦之星（gameui:11388）、原神（米哈游）（gameui:1691） 等 6 款 |
| 十字键 + 左右两个大键（横版平台） | <abbr title="ctx.orientation=landscape">画幅朝向 = 横屏</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.touchStick=dpad">虚拟摇杆 = 十字键</abbr>；<abbr title="ix.touchCluster=twoButtons">触屏按钮布局 = 左右两个大键</abbr> | 横版跑跳：只要左右 + 跳 + 攻击 | 十字键没有触感，斜向输入不可靠；精确平台跳跃在触屏上天然吃亏 | 《空之要塞启航》（gameui:7134） |
| 无摇杆：底部一排头像 / 卡牌（自动战斗、卡牌塔防） | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.touchStick=none">虚拟摇杆 = 无摇杆</abbr>；<abbr title="ix.touchCluster=row">触屏按钮布局 = 底部一排</abbr>；<abbr title="el.party.form=portraitRow">队伍 / 玩家条：画法 = 肖像行</abbr>；<abbr title="el.party.screenAnchor=bc">队伍 / 玩家条 · 屏幕锚点 = 下中</abbr> | 移动交给自动，玩家只决定「何时放大招 / 出哪张卡」 | 操作感弱；头像既是状态又是按钮，要用发光等「就绪」信号区分能不能按 | 海贼王：梦想指针（gameui:12746）、神州风闻录（gameui:6853）、死亡突围：僵尸战争（gameui:11009）、寻光之旅（gameui:6868）、疯狂宝贝（测试）（gameui:7101） |
| 直接操作世界（点地、拖拽、滑动，不画虚拟键） | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.touchStick=tapToMove">虚拟摇杆 = 点地移动</abbr>；<abbr title="ix.mode=drag">主交互模式 = 拖拽</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 解谜、规划、合成、建造、回合策略：玩法本身就是在画面上点和拖 | 可发现性差，要首次引导；拖拽 / 滑动对手部不便的玩家是障碍，需要「点两下」替代 | Monument Valley（steam:1927720）、Mini Metro（steam:287980）、Townscaper（steam:1291340）、Lara Croft GO（steam:540840）、萌宠解谜（gameui:7039） 等 9 款 |
| 回合制：大圆钮 + 图标带字的大按钮 | <abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr>；<abbr title="el.cta.form=round">主行动按钮：画法 = 大圆钮</abbr>；<abbr title="el.cta.screenAnchor=br">主行动按钮 · 屏幕锚点 = 右下</abbr>；<abbr title="cmp.button=iconText">按钮内容 = 图标 + 文字</abbr>；<abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr> | 回合策略 / 战棋 / 塔防：不赶时间、怕误触 | 按钮带字占位大，竖屏放不下几个；要和「选中 + 确认」配合才真正防误触 | The Battle of Polytopia（steam:874390）、英杰传（测试）（gameui:7158）、Bloons TD 6（steam:960090） |
| 布局预设 + 自定义大小 / 位置 / 透明度 | <abbr title="ix.touchSize=88">触控尺寸 = 88</abbr>；<abbr title="chk.touch=true">触控尺寸检查 = 开</abbr> | 所有带虚拟按键的游戏：XAG 107 举 Call of Duty: Mobile 可逐个调整按键大小与位置并存成布局、Fortnite 移动版提供三套预设布局。 | 需要布局编辑器、存档与重置。 | — |

**经验法则**

- 最小触控目标：常用 ≥ 44pt（iOS）/ 48dp（Android），次要 ≥ 28pt；手机上的主动作键按 Xbox 指南建议约 15mm，平板约 24mm
- 手机触控目标 ≥ 15mm（XAG 107：400 DPI 约 236px），平板 ≥ 24mm；Apple 的 44×44pt 是最低限而不是目标。
- 本工具现状：ix.touchSize 手机默认 88px@1080p（约 44pt）只到最低限，主键建议 96px 以上，次要键也不低于 88px。
- 主动作键明显大于次要键（「直径 1.5–2 倍」是经验值，没有出处；截图里只能量相对比例）；目标之间留出无效间隙
- 横屏：移动在左、动作在右；摇杆在手指落点生成，静止时淡出
- 手指会盖住按钮，按下反馈要外溢（外发光、放大、震动、声音）
- 抬起时触发，允许滑出取消；提供按钮大小 / 位置 / 透明度自定义和几套预设布局
- 提供 2–3 套布局预设 + 自定义大小 / 位置 / 透明度；支持横竖屏两种方向。
- 能自动的就自动（自动拾取、自动开火、自动战斗选项），每少一个键就少一个误触点
- 检查：chk.touch + chk.safeArea（刘海与圆角）。

**反例与玩家评价**

- 次要键（倍速、暂停、跳过、自动）做成小钮挤在角落，主次一样大或比主键还难按 例：奇缘之旅（gameui:6904）、巫师血脉（gameui:6814）、千鸟飞绝（gameui:6826）、《空之要塞启航》（gameui:7134）、小虾米战三国（gameui:6922）、 战神之决战西伯利亚（gameui:7312）。
  - 评价与证据（依据：截图）：R3 不含手游评测，无计数。R4 看图：倍速 / 暂停一类次要键明显小于主按钮；GameUI 截图的分辨率与设备 DPI 不明、不少是缩放或拼接的长图，量不出 pt，所以原来写的「约 36–44pt、低于 XAG 107 的 15mm」撤回，只保留相对量——次要键直径约为主按钮的一半上下、宽度占屏宽的几个百分点（目测，未逐张测量）。
- 把 PC 的小格背包、浮动窗口原样搬到触屏（或反之，把手机的固定像素界面搬到高分屏） 例：RollerCoaster Tycoon Classic（steam:683900）、Melvor Idle（steam:1267910）。
  - 评价与证据（依据：评测）：RollerCoaster Tycoon Classic（手机版移回 PC）「UI 缩放 / 分辨率」抱怨 3 条、Melvor Idle 2 条
- 按钮在手指按下瞬间就触发、不能滑出取消
  - 评价与证据（依据：文献）：无直接计数；Xbox 无障碍指南把「抬起时触发、可滑出取消」列为触屏要求
- 关键操作只能长按、拖拽或多指手势。
  - 评价与证据（依据：文献）：无计数；XAG 107 移动端要求为长按、拖拽 / 滑动、快速连点、多指与陀螺仪操作提供替代。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：主按钮大圆钮 + 厚描边，次要键也不小于触控下限。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：倍速 / 暂停做成圆印章，印章本身就够大。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：按钮尺寸按 44pt 网格排。
- 17 号图谱反查到的相关家族：`fam.phone-app`

**出处**

- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：常用触控 ≥ 44×44pt、次要 ≥ 28×28pt；按钮放在拇指可达、安全区内；移动在左、镜头在右；按下状态要在手指遮挡时仍可见；按情境显隐控件、合并功能、能用手势就别放按钮
- [Android Developers · Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)（S127）：触屏交互元素的触控区域至少 48×48dp，越大越好；鼠标等精确输入可以更小
- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：手机触控目标建议约 15mm、平板约 24mm；目标间留足间隔或无效区；允许调整大小 / 间距 / 位置并提供预设布局；抬起时触发；提供简化操作（自动拾取、自动开火）
- [Game Accessibility Guidelines · Ensure interactive elements / virtual controls are large and well spaced](https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/)（S135）：触屏目标研究上理想约 2.4cm，手机上最少约 0.96cm；按钮靠得近时要更大
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)（S131）：可点击控件至少 44×44pt（页面本次未能抓取正文，按 Apple 公开的通用规范记录，未逐字核对）。
- [docs/survey/15-r4-mobile.md（本项目）](15-r4-mobile.md)（S183）：R4 把竖屏卡一律按单手标注（约定，不是观察）；主按钮明显大于次要键，只能比较相对大小。

**可演示的对比**

- **40px 方格主次一样大 vs 大主键 + 弧形小键**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：触屏按钮布局：技能方格 → 大键 + 弧形环绕；触控尺寸：40 → 88；虚拟摇杆：固定摇杆 → 浮动摇杆
  - 看什么：打开触控尺寸检查：A 的 2×2 技能方格每格只有约 40px、主次一样大，检查画出一串红框；B 大攻击键 + 弧形小键，最小也 ≥ 88px（44pt@2x），左半屏任意处起摇杆。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-touch-target-size#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=phone` `ctx.orientation=landscape` `ctx.input=touch` `chk.touch=true` `cnt.screen=screen.hud`
  - A：`ix.touchSize=40` `ix.touchStick=fixed` `ix.touchCluster=grid`
  - B：`ix.touchSize=88` `ix.touchStick=floating` `ix.touchCluster=arc`

  </details>

#### P-portrait-one-hand

**竖屏单手：操作在下 1/3，读数在上方**

> 适用品类：角色扮演、叙事与视觉小说、工厂与自动化、解谜与侦探、卡牌与桌面、手机触屏（局内与非商业化界面） · 相关：[P-touch-target-size](#p-touch-target-size)、[P-confirm-by-input](#p-confirm-by-input) · 风格变体：`fam.cozy`、`fam.anime-card`、`fam.candy`

**要解决的问题**

竖屏大多是单手握持，拇指只够得到中下部，上方角落要换手；但眼睛又先看上方。竖屏 UI 要把「看」和「按」上下分开：状态往上、操作往下，而且左右并排的东西都要改成上下堆。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 上读下按：顶部只放状态，主按钮 + 底部页签在下 1/3 | <abbr title="ctx.device=phone">设备与观看距离 = 手机</abbr>；<abbr title="ctx.orientation=portrait">画幅朝向 = 竖屏</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="ix.thumbZone=oneHand">握持与拇指区 = 竖屏单手</abbr>；<abbr title="lay.nav=tabsBottom">分区导航 = 底部页签</abbr>；<abbr title="el.cta.form=wide">主行动按钮：画法 = 宽按钮</abbr>；<abbr title="el.cta.screenAnchor=bc">主行动按钮 · 屏幕锚点 = 下中</abbr>；<abbr title="ix.touchCluster=row">触屏按钮布局 = 底部一排</abbr> | 竖屏 RPG / 放置 / 关卡制游戏的主界面与局内 | 底部要同时容纳主按钮和页签，容易挤；页签超过 5 个就要折叠 | 阿尔米娅赞歌（gameui:6728）、苏打世界（gameui:12543）、幻界之境（gameui:6836）、代号：梦山海（篝火测试）（gameui:7090）、Royal Match（gameui:9383） 等 9 款 |
| 上场景 / 下操作托盘（上下分栏） | <abbr title="ctx.orientation=portrait">画幅朝向 = 竖屏</abbr>；<abbr title="lay.composition=splitTB">分区方式 = 上下分栏</abbr>；<abbr title="lay.container=tray">容器 = 底 / 顶托盘</abbr>；<abbr title="lay.focalSide=top">主体位置 = 上</abbr> | 战斗或剧情在上半屏「看」，下半屏是阵容、棋盘或指令 | 上半屏场景变小，角色与特效要按半屏尺寸设计 | Call of Antia（gameui:3830）、酱游记（测试）（gameui:6889）、代号肉鸽（测试）（gameui:7155）、小小英雄-优化版（4399）（gameui:12994） |
| 棋盘占下 2/3，对战信息压在顶部 | <abbr title="ctx.orientation=portrait">画幅朝向 = 竖屏</abbr>；<abbr title="lay.playfield=boardWindow">玩法区形态 = 棋盘 / 关卡窗</abbr>；<abbr title="el.timer.form=scorePill">计时 / 分数 / 回合：画法 = 比分胶囊</abbr>；<abbr title="el.timer.screenAnchor=tc">计时 / 分数 / 回合 · 屏幕锚点 = 上中</abbr>；<abbr title="ix.touchStick=swipe">虚拟摇杆 = 滑动手势</abbr> | 三消 / 合成 / 消除对战：整个盘面就是操作区 | 盘面格子数受宽度限制（列数 ≤ 7–8），格子尺寸要过触控下限 | 宝石小伙伴（测试）（gameui:7035）、萌宠解谜（gameui:7039）、小小传说 Little Legends（gameui:4456） |
| 底部浮层代替居中弹窗，关闭在底部 | <abbr title="ctx.orientation=portrait">画幅朝向 = 竖屏</abbr>；<abbr title="lay.container=sheet">容器 = 底部浮层</abbr>；<abbr title="ix.dismiss=tapOutside">本屏怎么结束 = 点空白处关闭</abbr>；<abbr title="ix.close=cancelBtn">关闭控件 = 底部取消按钮</abbr> | 竖屏的详情、选项、确认、捏脸 / 换装面板 | 浮层高度受限，长内容要滚动；需要下滑关闭的手势提示 | AFK2: Journey (剑与远征2：启程）（gameui:8436）、恋与深空（叠纸游戏）（gameui:12326）、贪吃怪大作战（gameui:13082） |
| 零 HUD 直接操作（只留一个低频菜单点） | <abbr title="ctx.orientation=portrait">画幅朝向 = 竖屏</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="ix.touchStick=none">虚拟摇杆 = 无摇杆</abbr> | 竖屏解谜、叙事小品：画面就是界面 | 唯一的菜单入口放在上角可以接受（低频），但必须容易被发现 | Monument Valley（steam:1927720）、Florence（iig:florence） |

**经验法则**

- 下 1/3 放主操作与高频控件，中间放内容，上方放只读状态与低频入口（菜单、设置）
- 关闭 / 取消放到底部（底部取消钮或下滑关闭），不能只靠右上 ×
- 危险操作（撤退、放弃、出售）不靠「够不着」防误触，用二次确认或长按
- 屏幕中间最快最准、四角最慢：最重要的可点内容靠中下
- 能同时支持横竖两种朝向时，内容重排而不是整体缩放
- 竖屏网格列数 ≤ 4（格子要过触控下限），页签 ≤ 5

**反例与玩家评价**

- 高频的战斗控制（自动 / 倍速 / 撤退）放在竖屏右上角，单手要换握法 例：小虾米战三国（gameui:6922）。
  - 评价与证据（依据：截图）：R3 不含手游评测，无计数。R4 看图：竖屏卡里主操作多在下 1/3（R4 把竖屏卡一律按单手标注，握法本身从截图看不出，不是观察结论）；小虾米战三国是少数把战斗控制放右上的；对照战神之决战西伯利亚把 ×2 / ×5 放右下、暂停放左下（gameui:7312，sheet-port-01 第 6 格）。
- 居中小弹窗 + 右上小 ×，单手要伸到右上角才能关 例：几何王国（gameui:12983）。
  - 评价与证据（依据：推断）：无直接计数；贪吃怪大作战（gameui:13082）所有弹窗把关闭叉放在底部，是反例的改法
- 横屏的左右分栏、侧页签原样搬到竖屏
  - 评价与证据（依据：推断）：无直接计数；工具里的 D-orient 规则会自动改写成上下分栏与底部页签

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 圆润友好（`fam.cozy`，皮肤 `skin.cozy`）：圆润友好：底部一排圆角页签，所有确认都在下 1/3。
- 二次元白卡细线（`fam.anime-card`，皮肤 `skin.animeCard`）：二次元白卡：上半立绘、下半米白卡片选项。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：弹窗关闭叉放在底部而不是右上（贪吃怪大作战的做法）。

**出处**

- [Steven Hoober · How Do Users Really Hold Mobile Devices?（UXmatters, 2013）](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)（S101）：在公共场所观察 1,333 次、780 人在触屏：单手 49%、托握 36%、双手 15%；作者后续更正强调屏幕中心比边角点得更快更准
- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：常用控件放在拇指可达处，菜单等次要控件放到屏幕顶部
- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：建议同时支持横竖屏（有玩家把设备固定在轮椅或桌面上），以 Wordament 横竖屏重排为例
- [Godot Docs · Multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)（S117）：竖屏游戏建议 720×1280 基准与 portrait 朝向，stretch aspect 用 expand，UI 用锚点贴边以适应 18:9 / 19:9 长屏

**可演示的对比**

- **主按钮在右上 vs 挪到下中与右下**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：主行动按钮 · 屏幕锚点：右上 → 下中
  - 配套改动：倍速 / 暂停 / 自动 · 屏幕锚点：右上 → 右下
  - 看什么：竖屏单手：A 把主按钮和倍速条放在右上，「单手可达」检查会标出上 1/3 的大按钮；B 挪到下中和右下，检查通过。顺便看顶部只剩血条与队伍条后有多干净。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-portrait-one-hand#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=phone` `ctx.orientation=portrait` `ctx.input=touch` `ix.thumbZone=oneHand` `cnt.elements=el.vitals+el.party+el.cta+el.gameSpeed` `el.gameSpeed.form=speedBar` `chk.touch=true` `cnt.screen=screen.hud`
  - A：`el.cta.screenAnchor=tr` `el.gameSpeed.screenAnchor=tr`
  - B：`el.cta.screenAnchor=bc` `el.gameSpeed.screenAnchor=br`

  </details>

#### P-view-distance

**按视距定字号与安全区：PC 60cm、电视 2.5m、掌机 30cm**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、策略与战术 · 相关：[P-text-size-floor](#p-text-size-floor)、[P-aspect-anchor](#p-aspect-anchor)、[P-glance-encoding](#p-glance-encoding) · 风格变体：`fam.dark-hairline`、`fam.pixel`、`fam.flat`

**要解决的问题**

同一张 1080p 画面，在 60cm 外的显示器、2.5m 外的电视、30cm 外的 7 寸掌机上，看起来的大小完全不同；电视还会因过扫描切掉四边。把 PC 的信息密度和字号直接搬上电视或掌机，小字就会读不清（这是规范推论：评测里明确抱怨字号的去重后全库只有 10 条，不足以说明哪类作品更常出错）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| PC 键鼠（约 60cm）：高密度，正文 18px@1080p 起 | <abbr title="ctx.device=pc">设备与观看距离 = PC 显示器</abbr>；<abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="typ.baseSize=18">基准字号 = 18</abbr>；<abbr title="lay.safeMargin=2">安全边距 = 2</abbr>；<abbr title="cnt.density=3">信息密度 = 密集</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr> | 策略、模拟、MMO、卡牌：大量数字和规则文字 | PC 默认 14px 只适合次要信息；把正文提到 18px 后表格行数减少，要靠分组和折叠 | Stellaris（steam:281990）、Songs of Syx（steam:1162750）、Sid Meier’s Civilization® VI（steam:289070）、World Of Warcraft（iig:world-of-warcraft） |
| 主机 / 电视（约 2.5m）：正文 26px@1080p 起，5% 安全边，信息量向手机看齐 | <abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="typ.baseSize=26">基准字号 = 26</abbr>；<abbr title="lay.safeMargin=5">安全边距 = 5</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="ix.glyphs=xbox">按键提示图标集 = Xbox</abbr>；<abbr title="el.prompt.form=legend">按键 / 操作提示：画法 = 按键图例条</abbr> | 主机首发、客厅游戏、需要 PC 大屏模式的作品 | 一屏能放的条目大约减半，详情要分页或常驻侧栏；悬停提示基本不能用 | Clair Obscur: Expedition 33（steam:1903340）、ELDEN RING（steam:1245620）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）、God of War（steam:1593500 · 据已知描述） |
| 掌机（Switch / Steam Deck，约 30cm 小屏）：手柄输入 + 中等字号 | <abbr title="ctx.device=handheld">设备与观看距离 = 掌机（Switch / Steam Deck）</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="typ.baseSize=18">基准字号 = 18</abbr>；<abbr title="lay.safeMargin=3">安全边距 = 3</abbr>；<abbr title="ix.glyphs=nintendo">按键提示图标集 = Nintendo</abbr> | Switch / Deck 上的独立游戏；PC 游戏申请 Deck 认证 | 近看小屏，字号比电视小但比 PC 大；还会被接到电视上，所以要能跟随系统或设置放大 | Hollow Knight（steam:367520）、Hades（steam:1145360）、Dead Cells（steam:588650） |
| 背景出血、内容进安全区 | <abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="lay.safeMargin=5">安全边距 = 5</abbr>；<abbr title="lay.container=fullscreen">容器 = 全屏页</abbr>；<abbr title="lay.overflow=scrollH">内容溢出方式 = 横向滚动</abbr>；<abbr title="chk.safeArea=true">安全区检查 = 开</abbr> | 电视菜单、横向滚动的卡片墙、侧边导航 | 要把「背景层」和「内容层」拆开排版：面板底色和滚动列表伸到边，焦点与文字留在 5% 以内 | Metaphor: ReFantazio（steam:2679460）、Persona 5 Royal（steam:1687950） |
| 玩家可调：UI / 文字缩放与 HUD 分项开关 | <abbr title="a11y.uiScale=1.5">UI 缩放 = 1.5</abbr>；<abbr title="a11y.textScale=1.4">文字缩放 = 1.4</abbr>；<abbr title="chk.overflow=plus30">文字溢出 / 伪本地化 = +30%（英文）</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr> | 所有平台的兜底：沙发距离、视力、屏幕尺寸各不相同 | 版面必须能放大到 200% 而不需要横纵双向滚动；盒子宽度不能写死 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Dishonored 2（steam:403640 · 据已知描述）、Red Dead Redemption 2（steam:1174180 · 据已知描述） |

**经验法则**

- 正文最小字号按视距：PC ≥ 18px@1080p、电视 ≥ 26px@1080p（Xbox 指南）；Steam Deck 在 1280×800 下最小 9px、建议 12px（约合 1080p 的 12 / 16px）
- 本工具 D-device 的 PC 默认 14px 只当次要信息字号用，正文按 18px 校
- 电视：交互元素与文字离边 ≥ 5%（微软 48 / 27 epx@960×540、tvOS 左右 80pt 上下 60pt、Android TV 48 / 27dp），背景与滚动列表可出血
- 电视一屏的信息量向手机看齐；从一边到另一边 ≤ 6 次方向键
- 所有字号由一个基准 × 阶梯比推出，才能一键整体缩放；提供到 200% 的文字缩放
- 电视上避免靠细微色差区分状态（不同电视色彩差异大），避免大面积纯白
- 测量方法按 XAG：从最高升部到最低降部的实测像素高；手机按 DPI 换算（100 DPI 为 18px，随 DPI 线性放大）；GAG 引用的 10 英尺经验是电视 28px 起，而且只是下限。大字本身可以是风格：Half-Life 2（steam:220）的橙色大号数字、Balatro（steam:2379780）的巨型像素数字。

**反例与玩家评价**

- 字号按 PC 近看定、没有文字缩放；主机作移植 PC 或 PC 作上电视都会撞上 例：METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：评测里明确说文字太小的，去重并收紧口径后全库只有 10 条 / 8 款（BioShock Infinite 3 条（都在说字幕），Civilization VI、METAL GEAR SOLID V（4K 下）、Disco Elysium（好评里提醒调大字号）、Absolute Drift、ASTRONEER、Dyson Sphere Program、鬼谷八荒（卷轴面板里的小字）各 1 条）。原来列在这里的 God of War Ragnarök、God of War、Sekiro、Forza Horizon 5、Valheim、Hades II 等「字太小 / 看不清」命中，复核后大多在说雾、暗场景和敌人招式看不清，没有一条在说文字，已移除；「38 款里约一半是主机首发 3A」的归类也一并撤回。电视字号底线只靠 XAG 101（主机 1080p 正文 ≥ 26px）与 Steam Deck 规范支撑。
- 关键文字、按钮、焦点框贴着屏幕边，电视过扫描或刘海切掉
  - 评价与证据（依据：推断）：无直接计数；工具的安全区检查（chk.safeArea）专门画出被切掉的区域
- 电视上依赖悬停提示与小字说明
  - 评价与证据（依据：文献）：无直接计数；微软 10 英尺指南明确建议电视上尽量不用 tooltip

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：电视上把发丝线加粗到 2px，细衬线正文换成常规字重。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：掌机上整数放大一档，像素字不缩放到非整数。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：按 10 英尺指南放大字号与焦点。
- 17 号图谱反查到的相关家族：`fam.thin-geo`、`fam.typographic-hud`

**出处**

- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：默认最小字号：主机 26px@1080p、PC / VR 18px@1080p、移动端按 DPI 线性换算；应能放大到 200% 且不需双向滚动
- [Microsoft · Designing for Xbox and TV](https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv)（S147）：10 英尺体验约 3m 视距；电视信息量应接近手机而非桌面；交互与文字避开边缘 5%（960×540 epx 下上下 27、左右 48）；背景可出血；尽量不用 tooltip；电视色彩差异大
- [Apple Human Interface Guidelines · Layout（tvOS）](https://developer.apple.com/design/human-interface-guidelines/layout)（S130）：tvOS 主要内容上下内缩 60pt、左右 80pt，以免被过扫描切掉
- [Android Developers · TV layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts)（S128）：960×540dp 画布上留约 5% 过扫描边（左右约 48dp、上下约 27dp），背景图不要裁到安全区内
- [Steamworks: Steam Deck Compatibility Review Process](https://partner.steamgames.com/doc/steamdeck/compat)（S157）：界面文字要在约 30cm 外易读：1280×800 下最小字符不低于 9px，建议 12px，并建议提供可调字号与对比度
- [Game Accessibility Guidelines: Use an easily readable default font size](https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/)（S141）：引用 10 英尺界面经验：1080p 电视 28px 是下限而不是目标；最理想是让玩家自选字号，做不到时至少默认就大。
- [AbleGamers APX: Clear Text](https://accessible.games/accessible-player-experiences/access-patterns/clear-text/)（S125）：让玩家改字号、对比与颜色、字体、字幕底和对话节奏；举 Hitman (2016) 五档字幕字号带实时预览为例。
- [God of War Ragnarök accessibility options (PlayStation)](https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/)（S108）：官方列出 70 多项无障碍功能并按视觉 / 听觉 / 动效 / 操作分预设，是选项组织的样板。

**可演示的对比**

- **PC 密度直接上电视 vs 26px、5% 边距、稀疏**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：密集 → 稀疏；安全边距：1 → 5；基准字号：14 → 26
  - 看什么：打开「视距预览：电视 2.5m」与安全区检查：A 是 PC 密度直接上电视（14px、1% 边距、密集），字糊成一片且四角元素落进过扫描区；B 26px、5% 边距、稀疏，远看仍可读。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-view-distance#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `ctx.device=tv` `ctx.input=pad` `chk.safeArea=true` `chk.viewDistance=tv` `cnt.screen=screen.hud`
  - A：`typ.baseSize=14` `lay.safeMargin=1` `cnt.density=3`
  - B：`typ.baseSize=26` `lay.safeMargin=5` `cnt.density=1`

  </details>

#### P-aspect-anchor

**画幅适配：锚定与留白，不拉伸**

> 适用品类：动作与 Roguelite、射击、竞速与驾驶、手机触屏（局内与非商业化界面） · 相关：[P-view-distance](#p-view-distance)、[P-text-size-floor](#p-text-size-floor)、[P-medium-constraints](#p-medium-constraints) · 风格变体：`fam.dark-hairline`、`fam.pixel`、`fam.boomer-bar`

**要解决的问题**

16:9 之外，还有 21:9 / 32:9 超宽、4:3 老作品与平板、19.5:9 刘海长屏、竖屏。HUD 贴四角时在超宽屏上眼睛要扫到很远；整体拉伸会把圆形变椭圆；固定像素的界面在 4K 上缩成一小块。适配的核心是：哪些东西贴边、哪些收进中间、多出来的地方放什么。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 关键 HUD 收进居中 16:9（超宽屏） | <abbr title="ctx.aspect=21x9">屏幕宽高比 = 21:9 超宽</abbr>；<abbr title="lay.safeMargin=2">安全边距 = 2</abbr>；<abbr title="cnt.elements=el.vitals+el.minimap+el.abilities">信息元素集合 = 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 技能 / 冷却 / 弹药 / 手牌</abbr> | 射击、竞速、动作：血量 / 弹药 / 小地图要在视线附近 | 两侧多出的视野只放环境；有的玩家想要贴边，所以要给「HUD 宽度」选项；样本里超宽编码很少（全库只有 2 张 21:9、都是电影黑边），Forza Horizon 5 是参数文档引用的超宽参照 | Forza Horizon 5（steam:1551360 · 据已知描述） |
| 电影宽银幕黑边（演出、叙事、过场） | <abbr title="ctx.aspect=21x9">屏幕宽高比 = 21:9 超宽</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 叙事驱动、零 HUD、过场：用画幅本身传达「电影感」 | 在 16:9 屏上会损失上下画面；字幕可以压进下黑边 | Hellblade II（steam:2461850）、Resident Evil 5（steam:21690 · 据已知描述）、STAR WARS Jedi: Survivor（steam:1774580 · 据已知描述） |
| 4:3 柱状黑边 + 装饰侧板 | <abbr title="ctx.aspect=4x3">屏幕宽高比 = 4:3</abbr>；<abbr title="lay.playfield=boxed">玩法区形态 = 4:3 / 小窗加黑边</abbr>；<abbr title="vis.ornament=2">装饰预算 = 中</abbr>；<abbr title="vis.motif=geometric">装饰母题 = 几何线 / 同心圆</abbr> | 老作品重制、像素 / 固定画幅玩法 | 侧板美术要和画面同风格，否则像贴纸；侧板里不要放会被忽略的关键信息 | Grim Fandango Remastered（steam:316790）、FINAL FANTASY IX（steam:377840） |
| 固定玩法窗 + 两侧可伸缩的 HUD 边栏 | <abbr title="lay.playfield=boardWindow">玩法区形态 = 棋盘 / 关卡窗</abbr>；<abbr title="lay.hudOrg=inMargin">HUD 组织方式 = 画在玩法区外的边框里</abbr> | 棋盘、卡牌、塔防、竖井式玩法：玩法区比例固定，画幅变化只改边栏宽 | 边栏在 4:3 上会被压得很窄，需要两套边栏排布 | Shotgun King: The Final Checkmate（steam:1972440）、Sol Cesto（steam:2738490）、Wall World（steam:2187290）、dotAGE（steam:638510）、Mr.Mine（steam:1397920） |
| 手机长屏：按刘海 / 圆角 / 底部横条加宽安全区 | <abbr title="ctx.device=phone">设备与观看距离 = 手机</abbr>；<abbr title="ctx.aspect=19.5x9">屏幕宽高比 = 19.5:9 手机长屏</abbr>；<abbr title="ctx.orientation=landscape">画幅朝向 = 横屏</abbr>；<abbr title="lay.safeMargin=4">安全边距 = 4</abbr>；<abbr title="chk.safeArea=true">安全区检查 = 开</abbr> | 所有横屏手游：刘海一侧与底部横条一侧都要避让 | 左右安全边不对称（刘海只在一侧，横屏翻转时互换），背景要画到真正的屏幕边 | 暖雪-手游（gameui:6750）、三界天骄（gameui:6729）、天涯明月刀（gameui:12771） |

**经验法则**

- 元素锚定到角和边（Godot：anchors + stretch aspect = expand），尺寸跟着整体缩放走，不跟宽度拉伸
- 关键 HUD 默认收进居中 16:9，并提供「HUD 宽度 / 安全区」滑条让玩家放开
- 为 16:9 绘制的过场与菜单美术在超宽屏上加黑边，背景插画按比例放大裁切，不改变宽高比
- 4:3 或固定画幅的黑边用装饰或 HUD 填，不要整片纯黑浪费
- 按 1080p 基准设计、整体缩放到 1440p / 4K；不要用固定像素
- 测试至少 16:9、21:9、32:9、4:3、19.5:9 横竖五种，每种看 HUD、地图、背包、对话、过场

**反例与玩家评价**

- 固定像素 UI 不随分辨率缩放，或整体拉伸变形 例：RollerCoaster Tycoon Classic（steam:683900）、Melvor Idle（steam:1267910）、BioShock Infinite（steam:8870 · 据已知描述）、Far Cry 4（steam:298110 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「UI 缩放 / 分辨率」去重后 12 款提到（15 条），≥ 2 条的只有 BioShock Infinite 3、RollerCoaster Tycoon Classic 2——老 PC 作与移植作的固定尺寸界面；Far Cry 4、Melvor Idle 各 1 条。
- 超宽屏上把小地图、血条贴到最外两角，或把为 16:9 绘制的菜单美术硬拉到 21:9
  - 评价与证据（依据：推断）：评测统计没有超宽专项（样本以 16:9 商店截图为主）

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：四角细条锚定在 16:9 安全区内，超宽屏两侧只延伸背景。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：整数缩放 + 黑边，宁可留边也不拉伸。
- 90 年代 FPS 状态栏（`fam.boomer-bar`）：90 年代 FPS 状态栏：底部状态栏横向延伸，中间头像固定比例。
- 17 号图谱反查到的相关家族：`fam.flat`、`fam.cinematic-letterbox`

**出处**

- [Godot Docs · Multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)（S117）：超宽与长屏都已常见，推荐 stretch mode = canvas_items + aspect = expand，Control 锚到正确的角；keep 模式会加黑边；content_scale_factor 可在运行时整体缩放 UI
- [Coherent Gameface 指南 · Handling Aspect Ratios with Media Queries](https://guide.coherent-labs.com/layout-assets-and-styling/styling--scalability/handling-aspect-ratios-with-media-queries/)（S116）：贴极端边缘的元素在超宽上相距过远；建议关键 HUD 放进居中、限宽的安全层，沉浸元素放全屏边缘层，再按比例微调
- [Apple Human Interface Guidelines · Layout（tvOS）](https://developer.apple.com/design/human-interface-guidelines/layout)（S130）：背景插画在加黑边或极宽窗口里不要改变宽高比，按比例放大铺满，并预期它会超出常规可见区
- [Microsoft · Designing for Xbox and TV](https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv)（S147）：背景和导航面板可以画到屏幕边缘以免「被框住」，交互与文字留在安全区内

**可演示的对比**

- **16:9 vs 21:9 下 HUD 仍留在居中 16:9**（单变量对照；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：屏幕宽高比：16:9 → 21:9 超宽
  - 看什么：切到 21:9 后画面两侧加宽，但 HUD 仍留在居中 16:9 区域——小地图和血条到画面中心的距离不变，两侧只多出环境。再试 4:3 + lay.playfield = boxed，看黑边如何用装饰填。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-aspect-anchor#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.elements=el.vitals+el.minimap+el.abilities+el.objective` `cnt.screen=screen.hud`
  - A：`ctx.aspect=16x9`
  - B：`ctx.aspect=21x9`

  </details>

#### P-detail-without-hover

**详情不能只挂在悬停上**

> 适用品类：角色扮演、策略与战术、建造与经营、卡牌与桌面 · 相关：[P-progressive-disclosure](#p-progressive-disclosure)、[P-input-parity](#p-input-parity)、[P-item-decision](#p-item-decision) · 风格变体：`fam.tabletop`、`fam.flat`、`fam.dark-gold`

**要解决的问题**

键鼠游戏用悬停提示承载大量规则文字（关键词、数值来源、成本）。触屏没有悬停，手柄要等焦点停留；移植时这些信息最先丢。问题是：同一份「详情」在三种输入下各放在哪。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 悬停提示（键鼠） | <abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr>；<abbr title="el.selection.form=tooltip">选中信息面板：画法 = tooltip</abbr> | PC 策略、卡牌构筑、CRPG：信息多、只在需要时看 | 嵌套提示（提示里的关键词再悬停）在手柄 / 触屏上无法直接搬 | Stellaris（steam:281990）、Sid Meier’s Civilization® VI（steam:289070）、Slay The Spire（iig:slay-the-spire）、Balatro（steam:2379780）、Chrono Ark（steam:1188930） |
| 焦点即详情：常驻侧栏（手柄友好） | <abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="ix.mode=select">主交互模式 = 选择条目</abbr>；<abbr title="cnt.dataShape=collection">主数据结构 = 同类集合</abbr> | 背包、装备、技能、图鉴；手柄移动焦点，右栏同步显示 | 占掉 1/3 屏宽，格子区变小；竖屏要改成上下 | ELDEN RING（steam:1245620）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、Black Myth: Wukong（steam:2358720）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Disco Elysium（steam:632470） |
| 触屏：点选 + 说明条 / 底部浮层 | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr>；<abbr title="lay.container=sheet">容器 = 底部浮层</abbr>；<abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr> | 手机背包、合成、卡牌：点一下看详情，再点一下或按确认才执行 | 多一步操作；浮层盖住一半盘面 | 萌宠解谜（gameui:7039）、几何王国（gameui:12983）、AFK2: Journey (剑与远征2：启程）（gameui:8436） |
| 行内展开（列表行原地展开） | <abbr title="lay.detail=inline">详情呈现 = 行内展开</abbr>；<abbr title="lay.overflow=scrollV">内容溢出方式 = 纵向滚动</abbr>；<abbr title="cmp.listRow=icon+title+desc">列表行字段 = 图标 / 头像 + 标题 + 说明</abbr> | 任务列表、设置说明、日志；一维列表在三种输入下都好用 | 展开时列表跳动，要有动画与焦点保持 | — |

**经验法则**

- 每条只在 tooltip 里的信息，在手柄 / 触屏版必须有常驻或可呼出的去处
- 手柄：焦点即详情（常驻侧栏），二级说明用固定键呼出（如 Y / 右摇杆按下），不靠停留计时
- 触屏：点一下选中看详情、再点或按确认才执行；长按查看必须有点按替代
- 键鼠悬停提示要能把鼠标移进去、可关闭、不自动消失
- 术语表 / 关键词说明做成可导航的列表，而不是只能逐层悬停

**反例与玩家评价**

- 触屏 / 手柄版保留了只能悬停才看得到的数值或规则
  - 评价与证据（依据：背景）：R3「菜单 / 界面难用」去重后 19 款 ≥ 2 条，以建造 / 经营 / 生存类最集中；关键词分不出是否与悬停有关，只作背景。
- 手柄焦点一停就自动弹 tooltip，挡住下一个格子
  - 评价与证据（依据：文献）：无直接计数；微软 10 英尺指南建议电视上尽量不用 tooltip

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）：桌游实物：按住卡牌放大到屏幕中央，看完松手。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：手柄下详情变成底部常驻抽屉。
- 暗金金属牌（`fam.dark-gold`，皮肤 `skin.darkGold`）：暗金金属牌：详情是一块固定在右侧的金属牌，不跟随光标。
- 17 号图谱反查到的相关家族：`fam.desk-paperwork`

**出处**

- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)（S073）：悬停或聚焦出现的附加内容应可关闭、可把指针移入、并持续显示到用户移开或关闭
- [Microsoft · Designing for Xbox and TV](https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv)（S147）：手柄下 tooltip 在获得焦点后片刻自动出现又消失，过多会分散注意，电视上应尽量避免
- [Microsoft · Gamepad and remote control interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/gamepad-and-remote-interactions)（S148）：右键的上下文菜单在手柄上用 Menu 键打开；只有文字的滚动区域需要「焦点进入」才能读完
- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：触屏上尽量用「点选画面中的物体」代替叠加按钮；用双击 / 长按承载同一动作的变体

**可演示的对比**

- **临时详情（触屏无悬停）vs 常驻右栏**（单变量对照；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区方式：单区 → 左右分栏；详情呈现：临时出现 → 常驻一侧
  - 看什么：平板触屏背包：A 的详情是「临时出现」（键鼠时等于悬停窗，触屏下需要额外弹出且被手指挡住）；B 选中格的说明常驻右栏，手指操作左侧网格时不挡字。把 ctx.input 换成 pad 看两者在手柄下的差别。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-detail-without-hover#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `ctx.device=tablet` `ctx.input=touch` `cnt.screen=screen.inventory`
  - A：`lay.composition=single` `lay.detail=transient`
  - B：`lay.composition=splitLR` `lay.detail=persistent`

  </details>

#### P-input-parity

**每种输入都走得完全程：一套界面，多套操作**

> 适用品类：横版平台、角色扮演、策略与战术、手机触屏（局内与非商业化界面） · 相关：[P-glyph-follows-device](#p-glyph-follows-device)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-motor-input-alternatives](#p-motor-input-alternatives) · 风格变体：`fam.jrpg`、`fam.retro-os`、`fam.candy`

**要解决的问题**

菜单只认鼠标、游戏只认手柄、起名没有屏幕键盘、改键不全——任何一处断掉，玩家就被挡在门外。PC 同时插手柄、Steam Deck、云游戏、手机外接手柄让「当前设备」随时变化。设计问题是：做一套能自动切换的界面，还是为某种输入单独重排。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 同一布局，按最近输入自动换提示与焦点 | <abbr title="ctx.input=hybrid">输入方式 = 键鼠 + 手柄自动切换</abbr>；<abbr title="ix.focus=outline">导航焦点表现 = 高亮描边</abbr>；<abbr title="el.prompt.form=legend">按键 / 操作提示：画法 = 按键图例条</abbr>；<abbr title="cmp.optionEnum=arrows">设置项：多选一 = 左右切换 ◁ ▷</abbr>；<abbr title="cmp.optionRange=slider">设置项：数值 = 滑条</abbr> | 动作 / 独立游戏，界面本来就不复杂 | 每个控件都要同时可点、可聚焦、可按方向调值（下拉框对手柄不友好，改左右切换） | Hades（steam:1145360）、Balatro（steam:2379780）、ELDEN RING（steam:1245620） |
| 为手柄单独重排（命令栏 + 肩键切页 + 轮盘） | <abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="cmp.tab=iconText">页签内容 = 图标 + 文字</abbr>；<abbr title="lay.arrangement=ring">条目排布几何 = 环绕中心 / 轮盘</abbr> | PC 上用到整张键盘的 CRPG / 大战略移植主机 | 等于再做一套 UI；两边功能必须一一对上 | Stellaris（steam:281990）、Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 触屏按钮同时标键位（一套 HUD 兼容触屏 / 手柄 / 键鼠） | <abbr title="ctx.input=touch">输入方式 = 触屏</abbr>；<abbr title="el.prompt.form=touchButtons+hotkeyBadge">按键 / 操作提示：画法 = 触屏按钮 + 图标角标热键</abbr>；<abbr title="ix.touchCluster=arc">触屏按钮布局 = 大键 + 弧形环绕</abbr> | 手游同时上 PC 或支持外接手柄 | 纯触屏时键位字母是噪音，最好按设备显隐 | 天涯明月刀（gameui:12771）、原神（米哈游）（gameui:1691） |
| VR / 体感：UI 挂在手或手持物上 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="el.vitals.attachTo=held">生命 / 护盾 / 体力 · 世界挂点 = 手持物 / 武器</abbr>；<abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | VR，或手本身就是输入的体感游戏 | 没有屏幕边可贴；手持物上的字要按 VR 的 18px 下限放大；需要非体感的替代输入 | Half-Life: Alyx（steam:546560）、Beat Saber（steam:620980）、Paper Beast（steam:1232570） |

**经验法则**

- 能用某种输入玩游戏，就能用同一种输入走完所有菜单（含设置、改键、退出）
- UI 只用单次、不同时按下的数字按键也能操作；滑条可以点一下进入、方向键调值
- 所有操作可重映射；摇杆双轴可分别反转；模拟灵敏度可调 ±50%
- 需要文字输入时调用平台屏幕键盘，或自带只用手柄就能完成的输入
- 下拉框在手柄下改成左右切换或分段按钮；拖拽一定有点选替代
- 设备切换不打断当前界面：焦点、滚动位置、已选项保持不变

**反例与玩家评价**

- 菜单只能用鼠标（或只能用 D-pad、不能用摇杆），和游戏本体的输入方式不一致
  - 评价与证据（依据：背景）：R3「手柄 / 键位不好」去重后 20 款 25 条；「菜单 / 界面难用」19 款 ≥ 2 条；两类都无法细分原因。
- 需要输入文字（起名、存档名、聊天）却没有手柄可用的屏幕键盘
  - 评价与证据（依据：推断）：无直接计数；Steam Deck 认证把它列为必须项
- UI 动画与输入响应慢，手柄连按时界面跟不上 例：Cyberpunk 2077（steam:1091500）、Half-Life: Alyx（steam:546560）、DEATHLOOP（steam:1252330 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「UI 卡顿 / 响应慢」去重后 11 款 13 条：DEATHLOOP 2、Cyberpunk 2077 2，Prince of Persia、Half-Life: Alyx、Enshrouded、Yi Xian 各 1 条。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- JRPG 窗口（`fam.jrpg`，皮肤 `skin.jrpg`）：JRPG 窗口：天生适合手柄的纵向菜单，键鼠只是加了点击。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：天生为鼠标设计，手柄要补焦点环与快捷键。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：触屏大按钮在键鼠下要补悬停与快捷键角标。
- 17 号图谱反查到的相关家族：`fam.retro-os`、`fam.scumm-verbs`

**出处**

- [Game Accessibility Guidelines · Ensure all areas of the UI can be accessed using the same input method as the gameplay](https://gameaccessibilityguidelines.com/ensure-that-all-areas-of-the-user-interface-can-be-accessed-using-the-same-input-method-as-the-gameplay/)（S134）：能用某种输入玩游戏，就应能用它操作全部菜单；举了键盘游戏配鼠标菜单、只能 D-pad 不能摇杆等反例
- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：UI 要同时支持数字与模拟导航、单次非同时按键；所有控制可重映射、可反转轴、灵敏度可调；移动端也要支持手柄、键盘等非触屏输入
- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：UI 要能被鼠标、键盘、手柄等多种输入完整导航；缩放或分辨率改变后导航顺序随视觉布局更新
- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：支持手柄时也要保留平台默认输入（iPhone / iPad 触屏、Mac 键鼠、Apple TV 遥控器）；自动检测配对；键盘优先单键命令并允许自定义
- [Steamworks: Steam Deck Compatibility Review Process](https://partner.steamgames.com/doc/steamdeck/compat)（S157）：玩家不应需要改游戏内设置才能启用手柄；需要文字输入时必须能用手柄完成

**可演示的对比**

- **下拉框 + 细滑条 vs 左右切换 + 分格条 + 图例**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：设置项：多选一：下拉 → 左右切换 ◁ ▷；设置项：数值：滑条 → 分格条；按键 / 操作提示：画法：无 → 按键图例条；导航焦点表现：高亮描边 → 整行色条
  - 看什么：PC 插手柄打开设置页：A 是鼠标思维（下拉框 + 细滑条），手柄要先进入下拉再上下选；B 改成左右切换 ◁ ▷ 与分格条，整行色条焦点，底部图例写清 ◁▷ 调值 / B 返回——同一份设置在键鼠下照样能点。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-input-parity#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `ctx.device=pc` `ctx.input=pad` `cnt.screen=screen.settings`
  - A：`cmp.optionEnum=dropdown` `cmp.optionRange=slider` `ix.focus=outline` `el.prompt.form=[]`
  - B：`cmp.optionEnum=arrows` `cmp.optionRange=segmentedBar` `ix.focus=bar` `el.prompt.form=legend`

  </details>

#### P-shared-screen

**同屏多人：每个玩家要一眼对上「我是哪个、我的手柄是哪个」**

> 适用品类：动作与 Roguelite、射击、竞速与驾驶、沙盒与物理、卡牌与桌面 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-glyph-follows-device](#p-glyph-follows-device) · 风格变体：`fam.candy`、`fam.broadcast`、`fam.tabletop`

**要解决的问题**

本地合作、分屏、派对游戏里，多名玩家共用一块屏幕、各拿各的设备。HUD 要回答「哪个角色 / 哪条血是我」，提示要按每个人手里的设备显示；分屏时每个视口只有半屏，按整屏尺寸做的 HUD 会挤满。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 共享一屏 + 顶部按玩家色排开的头像条 | <abbr title="ctx.players=sharedCoop">同屏玩家与视口 = 本地合作共享一屏</abbr>；<abbr title="el.party.form=frames">队伍 / 玩家条：画法 = 头像框 + 小血条</abbr>；<abbr title="el.party.screenAnchor=tc">队伍 / 玩家条 · 屏幕锚点 = 上中</abbr>；<abbr title="col.coding=player">语义颜色编码 = 玩家 / 频道色</abbr> | 清版动作、派对动作：2–4 人在同一镜头里 | 颜色要和角色服装 / 光圈一致，而且不能只靠颜色（加编号或名字） | Castle Crashers（steam:204360） |
| 分屏视口，各自 HUD 缩进自己的角落 | <abbr title="ctx.players=split">同屏玩家与视口 = 分屏</abbr>；<abbr title="lay.playfield=split">玩法区形态 = 分屏视口</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="a11y.uiScale=0.85">UI 缩放 = 0.85</abbr> | 双人合作冒险、竞速、射击 | 每个视口的安全区与字号要按半屏重新算；横分还是竖分影响 HUD 锚点 | It Takes Two（steam:1426210 · 据已知描述） |
| 信息挂在各自的角色 / 塔 / 棋子上 | <abbr title="ctx.players=party4">同屏玩家与视口 = 四人派对</abbr>；<abbr title="el.timer.attachTo=player">计时 / 分数 / 回合 · 世界挂点 = 玩家角色</abbr>；<abbr title="el.party.attachTo=player">队伍 / 玩家条 · 世界挂点 = 玩家角色</abbr>；<abbr title="rel.worldRender=billboard">世界内标注渲染（默认） = 平面公告板</abbr> | 同屏对战的派对游戏：每人一块区域，分数直接写在自己的东西上 | 角色重叠时挂件会互相遮挡；镜头拉远时要保最小字号 | Tricky Towers（steam:437920） |
| 四角 / 侧列玩家牌（桌游 / 回合制多人） | <abbr title="ctx.players=board">同屏玩家与视口 = 桌游多人</abbr>；<abbr title="el.party.form=tag">队伍 / 玩家条：画法 = 名牌</abbr>；<abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr> | 桌游数字版、大富翁式、回合制多人 | 当前行动者要额外强调（放大或高亮），否则四角一样重 | 100% Orange Juice（steam:282800）、Armello（steam:290340） |
| 手机当手柄：个人信息在手机，大屏只放公共信息 | <abbr title="ctx.players=party4">同屏玩家与视口 = 四人派对</abbr>；<abbr title="ctx.device=tv">设备与观看距离 = 主机 / 电视</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="typ.baseSize=26">基准字号 = 26</abbr> | 客厅派对、需要私密选择（答题、投票、手牌）的游戏 | 要做两套 UI（大屏 + 手机网页）；加入流程（房间码）必须在大屏上醒目 | The Jackbox Party Pack 7（steam:1211630） |

**经验法则**

- 每名玩家 = 颜色 + 编号 / 名字 + 位置，三者至少两样同时出现
- 每名玩家的按键提示按他自己的设备显示
- 分屏按视口重算 HUD：字号不低于设备下限，安全区只在外缘
- 共享镜头时个人信息尽量挂到角色上，屏幕边只放公共信息（时间、比分）
- 加入 / 退出、断开手柄的提示要能被任何一位玩家处理

**反例与玩家评价**

- 分屏时 HUD 仍按整屏尺寸，半个视口被 UI 占满；或只用颜色区分玩家
  - 评价与证据（依据：推断）：评测统计没有同屏多人专项；色盲相关见色彩主题
- 多人各用不同设备时，提示只按 1P 的设备显示
  - 评价与证据（依据：文献）：无直接计数；Apple 指南要求为每位玩家显示其手柄对应的字形并标注玩家

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：每位玩家一个颜色 + 一个图形头像，名字挂在角色头上。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播包装：分屏边界画成转播分隔条，比分牌居中共享。
- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）：桌游实物：每位玩家一块桌边面板，轮到谁就亮起来。
- 17 号图谱反查到的相关家族：`fam.tabletop`

**出处**

- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：支持多个手柄时为每位玩家显示其所用手柄的字形，多人时为每个手柄标注玩家
- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：关键信息不能只靠颜色传达，要配合符号、形状或文字（玩家区分同理）
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：最小字号按设备与视距定，分屏后每个视口的文字同样要满足

**可演示的对比**

- **单人队伍条 vs 共享一屏的玩家色头像条**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：语义颜色编码：状态色 → 玩家 / 频道色；同屏玩家与视口：单人 → 本地合作共享一屏；队伍 / 玩家条 · 屏幕锚点：左上 → 上中
  - 看什么：A 单人布局：队伍条在左上，看不出谁是谁；B 共享一屏的本地合作：头像条移到顶部中间、按玩家色编码，每人一格。再把 ctx.players 改成 split 看分屏时 HUD 如何按视口缩进。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-shared-screen#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=tv` `cnt.elements=el.vitals+el.party+el.timer` `el.party.form=frames` `cnt.screen=screen.hud`
  - A：`ctx.players=single` `el.party.screenAnchor=tl` `col.coding=status`
  - B：`ctx.players=sharedCoop` `el.party.screenAnchor=tc` `col.coding=player`

  </details>

#### P-confirm-by-input

**防误触与确认方式按输入选：抬起触发、可取消、少用长按与连打**

> 适用品类：叙事与视觉小说、策略与战术、建造与经营、工厂与自动化、解谜与侦探、卡牌与桌面、手机触屏（局内与非商业化界面） · 相关：[P-motor-input-alternatives](#p-motor-input-alternatives)、[P-touch-target-size](#p-touch-target-size) · 风格变体：`fam.ornate-frame`、`fam.flat`、`fam.persona-collage`

**要解决的问题**

不同输入的误触来源不同：鼠标是点错、触屏是手指按下就触发或滑过别的按钮、手柄是连按时惯性多按一下。不可逆操作（出售、跳过剧情、放弃关卡）需要防误触，但长按和连打本身又是很多玩家的障碍。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 即点即生效 + 撤销（键鼠、低风险操作） | <abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="ix.confirm=instant">确认机制 = 即点即生效</abbr>；<abbr title="ix.press=darken">按下反馈 = 变暗</abbr> | 建造放置、整理背包、玩具式创作：操作频繁、可逆 | 必须有可靠的撤销 / 重做；撤销入口要一直可见 | SUMMERHOUSE（steam:2533960）、Townscaper（steam:1291340） |
| 选中 + 确认按钮（触屏 / 回合制） | <abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr>；<abbr title="el.cta.form=wide">主行动按钮：画法 = 宽按钮</abbr>；<abbr title="el.cta.screenAnchor=bc">主行动按钮 · 屏幕锚点 = 下中</abbr> | 触屏战棋、卡牌出牌、捏脸选项：先看清再执行 | 多一步；确认按钮要在拇指区并且足够大 | 英杰传（测试）（gameui:7158）、AFK2: Journey (剑与远征2：启程）（gameui:8436）、Slay The Spire（iig:slay-the-spire） |
| 幽灵预览 + ✓ / ✕（放置类） | <abbr title="ix.confirm=ghost">确认机制 = 幽灵预览 + ✓ / ✕</abbr>；<abbr title="el.overlay.form=buildGrid">信息叠层 / 图例：画法 = 建造网格</abbr>；<abbr title="ctx.input=touch">输入方式 = 触屏</abbr> | 城建、拼图放置、地块摆放：在世界里预览结果再落子 | 预览要清楚标出合法 / 非法，✓ / ✕ 要跟着预览物移动且不挡住它 | ISLANDERS（steam:1046030）、Dorfromantik（steam:1455840） |
| 长按确认 / 长按跳过（不可逆、低频） | <abbr title="ix.confirm=hold">确认机制 = 长按确认</abbr>；<abbr title="ix.skip=hold">跳过 / 快进 = 长按跳过</abbr>；<abbr title="ix.skipAnchor=br">跳过按钮位置 = 右下</abbr> | 跳过过场、拆除建筑、放弃进度 | 长按对手部不便的玩家是障碍，必须能在设置里改成点按 + 二次确认；进度圈要明显；参考库里的跳过按钮（gameui:4796 右上跳过、gameui:3033 自动 / 跳过一组）都是点按式，没有长按样本 | — |
| 二次确认弹窗（不可逆、低频、后果大） | <abbr title="ix.confirm=double">确认机制 = 二次确认弹窗</abbr>；<abbr title="lay.container=modal">容器 = 居中弹窗</abbr>；<abbr title="ix.close=cancelBtn">关闭控件 = 底部取消按钮</abbr> | 删除存档、出售稀有物、退出联机 | 滥用会让玩家养成不看就点确认的习惯；默认焦点应停在「取消」上 | 几何王国（gameui:12983） |

**经验法则**

- 点按 / 点击在抬起时生效，手指或指针移出目标即取消
- 可逆操作给撤销，不可逆操作给确认——二选一，不要两样都没有
- 长按只用于低频、不可逆的操作，时长短并显示进度；设置里可改成点按
- QTE 和连打提供「按住代替连打」「自动完成」或跳过选项
- 二次确认弹窗默认焦点在取消上；手柄上 B 永远等于取消
- 跳过按钮离主操作键足够远，并避开手柄连按时最容易误触的确认键

**反例与玩家评价**

- QTE / 连打 / 长按作为唯一的操作方式，键鼠版提示也没有适配 例：Heavy Rain（steam:960910 · 据已知描述）、Beyond: Two Souls（steam:960990 · 据已知描述）。
  - 评价与证据（依据：评测）：Heavy Rain「手柄 / 键位不好」去重后 3 条（该类并列最多）；同类互动电影 Beyond: Two Souls 的按键提示只在 QTE 时浮现。
- 触屏按钮在手指按下瞬间触发，不能滑出取消；跳过按钮紧贴主操作键
  - 评价与证据（依据：文献）：R3 不含手游，无计数；Xbox 指南把「抬起触发、可取消」列为移动端要求

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 重装饰雕花框（`fam.ornate-frame`，皮肤 `skin.ornate`）：雕花框：不可逆操作用长按填充的金框按钮。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：可逆操作给底部「撤销」条，而不是确认弹窗。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：确认弹窗也是斜切色块，但「取消」永远在同一侧。
- 17 号图谱反查到的相关家族：`fam.neumorph`、`fam.desk-paperwork`

**出处**

- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：单指针操作在抬起时触发、可在完成前移开取消，否则要提供撤销；避免长按、同时按、快速连打与 QTE，必要时提供切换 / 自动 / 跳过；移动端提供滑出取消等纠错方式
- [Game Accessibility Guidelines · Avoid / provide alternatives to requiring buttons to be held down](https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/)（S133）：需要持续按住的操作应提供替代（如切换式），因为长按对部分玩家是障碍
- [Apple Human Interface Guidelines · Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)（S129）：触屏上按下状态要在手指遮挡时仍可见；可用双击、长按承载同一动作的变体以减少按钮数

**可演示的对比**

- **即点即生效 + 右上小 × vs 二次确认 + 底部取消**（单变量对照；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：关闭控件：右上 X → 底部取消按钮；确认机制：即点即生效 → 二次确认弹窗；容器：自动 → 底部浮层
  - 看什么：竖屏确认弹窗：A 即点即生效、关闭只有右上小 ×；B 改成二次确认 + 底部浮层 + 底部取消按钮，取消与确认都在拇指区，关闭不用伸手到右上。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-confirm-by-input#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `ctx.device=phone` `ctx.orientation=portrait` `ctx.input=touch` `cnt.screen=screen.hud` `cnt.subtype=confirm`
  - A：`ix.confirm=instant` `ix.close=xTopRight` `lay.container=auto`
  - B：`ix.confirm=double` `ix.close=cancelBtn` `lay.container=sheet`

  </details>

### 2.6 可读性与无障碍

回答「每个人都读得清、按得到吗」：字号底线与缩放重排、压在实时画面上的字、颜色冗余、高对比与换色、字幕、正文排版、光敏与减少动效、改键与操作替代、无障碍预设的组织方式。这些大多是硬底线或玩家选项，评测里很少被直接点名，只能靠设计时的检查发现。本地化与中日韩排版（P-localization-ready）也属于这一层。

#### P-text-size-floor

**字号有底线、文字与 UI 都能缩放并重排：放到 200% 也不丢内容**

> 适用品类：探索与冒险、动作与 Roguelite、射击、角色扮演、叙事与视觉小说、策略与战术、建造与经营、工厂与自动化、生存与制作、手机触屏（局内与非商业化界面） · 相关：[P-view-distance](#p-view-distance)、[P-typography-legible-format](#p-typography-legible-format)、[P-aspect-anchor](#p-aspect-anchor) · 风格变体：`fam.pixel`、`fam.mono-line`、`fam.ink`

**要解决的问题**

玩家坐在电视前 2–3 米、用掌机 / 手机小屏、或在 1440p / 4K 显示器上玩时，HUD、物品说明与字幕读不清；固定像素的 UI 在高分辨率下整体变小，放大以后又挤出屏幕、文字被截断。这条的依据是规范（XAG 101：可放大到 200%、只需单向滚动；Steam Deck：1280×800 下最小 9px、建议 12px），不是评测：评测里明确说文字太小的，去重并收紧口径后全库只有 10 条 / 8 款（BioShock Infinite 3 条（都在说字幕），Civilization VI、METAL GEAR SOLID V（4K 下）、Disco Elysium（好评里提醒调大字号）、Absolute Drift、ASTRONEER、Dyson Sphere Program、鬼谷八荒（卷轴面板里的小字）各 1 条）。「UI 缩放 / 分辨率」去重后 15 条 / 12 款（BioShock Infinite 3、RollerCoaster Tycoon Classic 2）。各设备的默认字号见 P-view-distance；本条回答哪些字可以小一级、哪些必须大一级、玩家能放大到多少、放大以后版面怎样不坏。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 字号阶梯：关键数字再大一级，标签可以小一级 | <abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="typ.scale=1.5">字号阶梯比 = 1.5</abbr>；<abbr title="el.vitals.valueLabel=current">生命 / 护盾 / 体力 · 数值标注 = 当前值</abbr>；<abbr title="el.vitals.priority=primary">生命 / 护盾 / 体力 · 信息优先级 = 主</abbr> | HUD 上真正要一眼读的只有少数几个数（血、弹药、分数、倍率、倒计时）；它们用展示数字放大，说明与标签降一级但仍过底线。 | 阶梯比太大时最小一级会掉到底线以下；数字字体与正文字体要成套设计。 | Half-Life 2（steam:220）、Balatro（steam:2379780）、Team Fortress 2（steam:440 · 据已知描述） |
| 玩家文字缩放 80%–200%（独立于 UI 缩放） | <abbr title="a11y.textScale=1.5">文字缩放 = 1.5</abbr>；<abbr title="chk.overflow=plus50">文字溢出 / 伪本地化 = +50%（德文等）</abbr> | 所有含正文的游戏；叙事、RPG、策略、生存的说明文字尤其需要。TLOU Part II 的视觉预设会把 HUD 调成大号，Ragnarök 的视觉预设含图标与字幕尺寸（后者据第三方整理；该卡为「商店图无 UI」，据已知描述）。 | 所有文本框必须能重排（换行或单向滚动），按钮、页签、格子里的字要放得下；按键图标里的字母也要跟着放大。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 全局 UI 缩放：按画面高度等比，玩家可再乘一个系数 | <abbr title="a11y.uiScale=1.25">UI 缩放 = 1.25</abbr> | 所有平台的基础，PC 必备。TLOU Part II 的 HUD 尺寸有默认 / 大两档。 | 布局必须是锚点 + 容器而不是绝对坐标；位图素材要有 2 倍版本或改九宫格。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述） |
| 只放大关键元素（血量、准星、小地图） | <abbr title="el.vitals.scale=1.4">生命 / 护盾 / 体力 · 大小 / 突出度 = 1.4</abbr>；<abbr title="el.crosshair.scale=1.3">准星 / 瞄准 · 大小 / 突出度 = 1.3</abbr>；<abbr title="el.minimap.scale=1.3">小地图 / 罗盘 · 大小 / 突出度 = 1.3</abbr> | 低视力但仍想保持画面开阔的玩家；动作 / 射击。Ragnarök 的视觉预设包含图标与字幕尺寸。 | 元素之间可能重叠，需要避让规则。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 长语言 / 放大溢出测试：重排而不是截断（英文 +50% 伪本地化） | <abbr title="ctx.locale=en">文案语言 = 英文 / 拉丁</abbr>；<abbr title="a11y.textScale=1.25">文字缩放 = 1.25</abbr>；<abbr title="chk.overflow=plus50">文字溢出 / 伪本地化 = +50%（德文等）</abbr> | 每个新界面模板都跑一遍，尤其按钮、页签、格子里的字。 | 按钮要能变宽或换行，固定宽度的花框素材要改成九宫格。 | — |
| 一键大字预设（ov.bigText），首启就能选 | <abbr title="a11y.textScale=1.4">文字缩放 = 1.4</abbr>；<abbr title="typ.baseSize=18">基准字号 = 18</abbr>；<abbr title="chk.minText=16">最小字号检查 = 16</abbr>；<abbr title="chk.overflow=plus30">文字溢出 / 伪本地化 = +30%（英文）</abbr> | 把放大与溢出检查打包成「视觉辅助」的一部分，在首次启动的设置页给出。 | 预设只是起点，仍要逐屏检查溢出与截断。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 正文字重至少常规，细体只留给大标题 | <abbr title="typ.body.weight=regular">正文字重 = 常规</abbr>；<abbr title="typ.display.weight=light">标题字重 = 细</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 极简 / 细线风格想保留气质时（本工具 skin.mono、skin.thinGeo 的默认正文都是细体 + 无底）：细体只用在 ≥ 大字的标题，正文回到常规字重。 | 画面会「重」一点，精致感改由标题、线条与留白承担。 | — |
| 可拖动、可重排的窗口与 HUD | <abbr title="lay.container=window">容器 = 可拖动窗口</abbr>；<abbr title="el.minimap.screenAnchor=tl">小地图 / 罗盘 · 屏幕锚点 = 左上</abbr> | 经营 / 模拟 / MMO 的多窗口；运动障碍玩家想把常用信息挪到顺手位置（GAG 运动类中级：可重排界面）。RollerCoaster Tycoon Classic 的窗口都可拖动——但它缺的正是缩放。 | 布局要存档，默认布局仍要是最好的。 | RollerCoaster Tycoon Classic（steam:683900） |

**经验法则**

- 默认正文字号按设备与视距定（PC ≥ 18px@1080p、电视 ≥ 26px@1080p，见 P-view-distance）；本条只管「在底线之上怎么放大」。
- 关键数值比正文再大一级；说明文字可以小，但不能低于底线。
- 书法、像素、手写、哥特等装饰字只用在大标题，正文给无衬线常规体。
- UI 缩放（0.75–2.0）与文字缩放（0.8–2.0）是两个独立滑条。
- 文字缩放至少到 200%：放大后不丢内容、只需单向滚动、标题仍明显大于正文；也允许玩家缩小。
- 以画面高度为基准等比缩放，4K 下不能比 1080p 小；Godot 用 stretch mode = canvas_items 打底，玩家倍率写进 Window.content_scale_factor。
- 按键图标里的字母 / 数字同样要过最小字号，图标随文字一起缩放。
- 每个界面模板跑 chk.overflow（+30% / +50%）与 chk.safeArea。
- 本工具现状：D-device 给 PC 的 14px、chk.minText 默认 12px 都低于 XAG 下限——PC 应改 18，掌机 ≥ 18，chk.minText 默认值随设备走。
- 检查：新界面先在 chk.viewDistance = 电视 2.5m 下看一遍，再开 chk.minText。

**反例与玩家评价**

- 风格化字体直接做小字号正文：像素字、1 位抖动画面里的小字、按角色区分的手抄体、羊皮纸漫画页上的小字，笔画在缩小后粘连。
  - 评价与证据（依据：文献）：评测证据不足：原来列的 Hyper Light Drifter、Return of the Obra Dinn、Pentiment、Wildermyth 各 2 条，复核后不是在说文字字号（Pentiment 的命中是夸「字体和字号随人物变化」）。依据改为 06 文档 B 部分（中文手写字体字符集不全、像素中文 12px 笔画粘连）与 XAG 101。
- 固定像素 UI：高分辨率下整体变小，且没有缩放选项。 例：RollerCoaster Tycoon Classic（steam:683900）、BioShock Infinite（steam:8870 · 据已知描述）、Far Cry 4（steam:298110 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 UI 缩放类去重后：BioShock Infinite 3、RollerCoaster Tycoon Classic 2、Far Cry 4 1。
- 信息密集的模拟 / 修仙 / 网页式界面：一屏塞满小字表格，没有放大选项。 例：鬼谷八荒 Tale of Immortal（steam:1468810）、Melvor Idle（steam:1267910）、Sid Meier’s Civilization® VI（steam:289070）。
  - 评价与证据（依据：评测）：Melvor Idle 去重后 UI 缩放 1 条；Civilization VI 有 1 条说找不到放大字号的办法；鬼谷八荒有 1 条说卷轴面板里的文字非常小（Terra Nil 原来的命中不是在说文字，已移除）。每款 1 条，证据很弱，主要靠规范。
- 放大后要横竖两个方向滚动，或文字被截断成省略号。
  - 评价与证据（依据：文献）：无评测分类；XAG 101 要求放大后只需单向滚动、不丢内容。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：像素字的最小档按整数倍放大，中文像素字不低于 12px。
- 单色线描 · 同一支笔（`fam.mono-line`，皮肤 `skin.mono`）：单色线描：细线可以细，正文字重不能细。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：书法只给标题，正文用楷体或黑体并守住字号底线。
- 17 号图谱反查到的相关家族：`fam.pixel`、`fam.greybox`、`fam.if-column`

**出处**

- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：启动时的默认最小字号：主机 26px@1080p、PC / VR 18px@1080p、移动端按 DPI 线性换算；按升部到降部的像素高测量；文字可放大到 200% 且不丢内容、只需单向滚动；图标里的字也要过线并随文字缩放。
- [Game Accessibility Guidelines: Use an easily readable default font size](https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/)（S141）：引用 10 英尺界面经验：1080p 电视 28px 是下限而不是目标；最理想是让玩家自选字号，做不到时至少默认就大。
- [AbleGamers APX: Clear Text](https://accessible.games/accessible-player-experiences/access-patterns/clear-text/)（S125）：让玩家改字号、对比与颜色、字体、字幕底和对话节奏；举 Hitman (2016) 五档字幕字号带实时预览为例。
- [God of War Ragnarök accessibility options (PlayStation)](https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/)（S108）：官方列出 70 多项无障碍功能并按视觉 / 听觉 / 动效 / 操作分预设，是选项组织的样板。
- [Game Accessibility Guidelines: Allow interfaces to be resized](https://gameaccessibilityguidelines.com/allow-interfaces-to-be-resized/)（S139）：先给好的默认尺寸，再让玩家放大或缩小界面：适配不同屏幕、帮助看不清小字与小图标的玩家、帮助精细操作困难的玩家；缩小则能多看画面。
- [Godot Docs · Multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)（S117）：stretch mode / aspect 与 content scale factor 的用法，是 a11y.uiScale 导出到 Godot 的落点。

**可演示的对比**

- **默认尺寸贴边 vs 放大 1.5 倍 + 安全边 + 溢出检查**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：文字缩放：1 → 1.5；UI 缩放：1 → 1.3；文字溢出 / 伪本地化：关 → +30%（英文）
  - 配套改动：安全边距：0 → 5
  - 看什么：同一个电视上的背包：A 是默认尺寸、元素贴着屏幕边，最小字号检查与安全区检查都会标红；B 文字放大 1.5 倍、整体 UI 放大 1.3 倍并收进 5% 安全边，再叠一层 +30% 溢出检查——看哪些按钮、页签、格子里的字开始挤出框，这些就是必须改成可重排容器（Godot 的 Container + 锚点）的地方。注：电视的最小字号底线是 26px@1080p，但参数 chk.minText 上限是 24，所以 demo 用 24；建议把上限放到 32（见参数缺口）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-text-size-floor#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `ctx.device=tv` `cnt.screen=screen.inventory` `chk.safeArea=true` `chk.minText=24`
  - A：`a11y.textScale=1` `a11y.uiScale=1` `lay.safeMargin=0` `chk.overflow=off`
  - B：`a11y.textScale=1.5` `a11y.uiScale=1.3` `lay.safeMargin=5` `chk.overflow=plus30`

  </details>

#### P-text-over-live-scene

**压在实时画面上的字必须自带「底」：对比度按最不利的那一帧算**

> 适用品类：探索与冒险、动作与 Roguelite、竞速与驾驶、叙事与视觉小说、建造与经营、生活与养成、生存与制作 · 相关：[P-world-legibility-guard](#p-world-legibility-guard)、[P-subtitles-captions](#p-subtitles-captions)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor) · 风格变体：`fam.typographic-hud`、`fam.glass`、`fam.dark-hairline`

**要解决的问题**

HUD 数值、提示、名牌、字幕直接叠在实时画面上，背后亮度每帧都在变：雪地、沙漠、白天天空、爆炸特效、彩色 CG。只要有一帧对比度掉下去，玩家就漏读。参考库里半透明面板很常见（建造类常用不透明度 0.4–0.8 的面板：Dyson Sphere Program、Before We Leave、ISLANDERS、Timberborn），本工具的毛玻璃、全息、细线几何皮肤，以及 skin.mono（17 号图谱里零 HUD、情境渐显、排印叠层、单色线描四族共用的皮肤）默认都是低不透明度或无底——它们在亮背景上最容易失效。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 文字描边 | <abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | 浮在世界里的字：伤害数字、按键提示、头顶名牌、像素 / 卡通风 HUD；背景亮暗都会出现时最稳。 | 描边太粗像贴纸，小字号下描边会糊掉字腔；写实风格里显得廉价，可改细描边 + 柔投影。 | Terraria（steam:105600）、Stumble Guys（steam:1677740）、Borderlands 2（steam:49520 · 据已知描述） |
| 投影（无底文字的最低要求） | <abbr title="vis.opacity=0">底不透明度 = 0</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 以暗场景为主的极简 HUD 与无框对话（恐怖、太空、夜晚、黑底叙事）。约束 C-legibility 规定无底 + 实时画面时至少要投影。 | 背景是中灰或高频纹理时投影救不回来；一旦场景变亮（雪、白天）就要升级为描边或底板。 | Kentucky Route Zero（steam:231200）、Hollow Knight（steam:367520） |
| 半透明底板（scrim） | <abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr>；<abbr title="vis.opacity=0.6">底不透明度 = 0.6</abbr> | 对话框、任务提示、字幕、HUD 数值块：背景复杂但又不想把画面挡死。Half-Life 2 的 HUD 数字垫半透明圆角黑底，BotW 对话是半透明黑底圆角框。 | 底板面积大了会挡视野；底板不透明度要交给玩家调（XAG：0–100%）。 | Half-Life 2（steam:220）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Hades II（steam:1145350）、原神（米哈游）（gameui:1691） |
| 实底面板 + 与场景反向的面板明度 | <abbr title="vis.opacity=1">底不透明度 = 1</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr> | 信息密集的战术 / 背包 / 状态页；场景很亮（雪、沙、白纸媒介）时用深色面板，很暗时用浅色（派生规则 D-lightness）。 | 面板感强，「融入画面」的风格目标要让步。 | Into the Breach（steam:590380）、Crow Country（steam:1996010）、OMORI（steam:1150690）、Stardew Valley（steam:413150） |
| 菜单叠在实时场景上时压暗 / 虚化背后 | <abbr title="rel.behind=live">背后画面来源 = 实时场景</abbr>；<abbr title="rel.dim=0.6">压暗强度 = 0.6</abbr>；<abbr title="rel.sceneBlur=8">背后虚化 = 8</abbr> | 暂停、背包、装备页不暂停世界时。Elden Ring 装备页是半透明黑底压在实时画面上。 | 压得太狠就没了「世界没停」的临场感；虚化有性能开销。 | ELDEN RING（steam:1245620）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild） |
| 降低透明：所有半透明皮肤都备一个实底版本 | <abbr title="a11y.reduceTransparency=true">降低透明 = 开</abbr> | 毛玻璃、全息、科幻半透明面板；开启后不透明度拉满、模糊归零（D-reduceTransparency）。 | 毛玻璃 / 全息的气质会变；实底版本要单独调色，不能只是把 alpha 改成 1。 | Dyson Sphere Program（steam:1366540）、Before We Leave（steam:1073910）、ISLANDERS（steam:1046030）、Timberborn（steam:1062090） |

**经验法则**

- 对比度按背景最不利的那一块算（XAG 102）：正文 ≥ 4.5:1；大字（PC 36px / 电视 52px@1080p 以上）与关键图标 ≥ 3:1；不可用项的文字 ≥ 3:1；高对比模式 ≥ 7:1。
- 无底文字至少投影（C-legibility）；亮场景（雪、沙、白天、白纸媒介）一律升级为描边或底板。
- 不透明度低于 0.6 的面板上不放正文，只放大字与图标（经验值）。
- 给玩家一个「文字底板不透明度 0–100%」滑条，同时作用于 HUD 文字、提示与字幕。
- 毛玻璃 / 全息皮肤必须有实底版本，绑定 a11y.reduceTransparency。
- 检查：把场景切到最亮与最暗两档，各开一次 chk.contrast；画面特效重时同时开 chk.fxOcclusion（D-fxDensity）。

**反例与玩家评价**

- 细白字无底直接压在亮场景或 CG 上（白色城市、雪地、白天天空、亮色立绘）。 例：Mirror's Edge（steam:17410）、CONTROL（steam:870780）、Sunrider: Mask of Arcadius（steam:313730）。
  - 评价与证据（依据：截图）：看图：Mirror's Edge 的白色城市、CONTROL 的巨型白字都直接压在亮画面上；Sunrider 的无框字幕在 152 条评测里没有对应抱怨。评测证据不足（字号 / 看不清类收紧口径后两款都是 0）——这类风险主要靠对比度检查发现，不能等评测。
- 低不透明度浅色毛玻璃（本工具 skin.glass 默认不透明度 0.18、模糊 12px、浅色面板；skin.holo 0.25）放在雪地 / 白天场景里承载正文。 例：ISLANDERS（steam:1046030）。
  - 评价与证据（依据：文献）：R3 没有「透明 / 对比」分类；ISLANDERS（0.4 不透明度胶囊，只放图标）没有相关抱怨。证据来自规范（XAG 102、NN/g），不是评测计数。
- 纸纹、图案底、彩色插画上的小字：底纹本身就是高频噪声。 例：Wildermyth（steam:763890）、Pentiment（steam:1205520）。
  - 评价与证据（依据：截图）：看图：Wildermyth 的羊皮纸漫画页、Pentiment 的手抄本页面都把小字放在纹理纸上。评测证据不足：两款原来的「字太小」命中复核后不是在说文字；06 文档 B11 测得棕墨配米黄底对比度常只有约 4:1。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 细字直压 · 排印叠层（`fam.typographic-hud`，皮肤 `skin.mono`）：排印叠层：无底的细字必须加投影或描边，雪地上用深色衬底条。
- 毛玻璃（`fam.glass`，皮肤 `skin.glass`）：毛玻璃：背景越花模糊越重，并提供降低透明度选项。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：整屏 60–85% 黑罩层本身就是底。
- 17 号图谱反查到的相关家族：`fam.dark-hairline`、`fam.filigree`、`fam.skeuo`、`fam.parchment`、`fam.glass`、`fam.typographic-hud`

**出处**

- [XAG 102: Contrast](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)（S069）：正文 4.5:1、大字 3:1、未激活元素文字 3:1、高对比模式 7:1；非纯色背景按对比最低处测量；提升对比的办法是可调底板、可选文字颜色、高对比模式、给文字与元素加边框。
- [W3C Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)（S158）：控件边界、选中 / 焦点等状态指示、理解内容所需的图形，对相邻颜色至少 3:1。
- [Nielsen Norman Group: Glassmorphism](https://www.nngroup.com/articles/glassmorphism/)（S154）：背景越花模糊要越重，并提供降低透明 / 提高对比的选项（06 文档已引用）。
- [The Last of Us Part II 无障碍选项（PlayStation 官方页）](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)（S112）：HUD 底可选默认 / 浅 / 加深三档，HUD 颜色有白、黄、蓝、红、绿可选——把「底」做成玩家选项的现成例子。

**可演示的对比**

- **浅色毛玻璃 + 细体 vs 深底 + 描边**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线）；场景依次切换：白天雪地（snowVillage））
  - 承载原则的参数：底不透明度：0.2 → 0.85；文字可读辅助：无 → 文字描边；面板明度：浅色面板 → 深色面板
  - 配套改动：背景模糊（毛玻璃）：12 → 0；正文字重：细 → 常规
  - 看什么：雪原场景正好是最不利背景：A 的浅色毛玻璃 + 细体字在亮雪地上被对比度检查标红，镜头转向暗处又恢复——这就是「有些帧读不到」；B 深底 + 描边在亮暗两种背景下都过 4.5:1。比较两边面板面积相同，差别只在底和字的处理。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-text-over-live-scene#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `chk.contrast=true`
  - A：`vis.opacity=0.2` `vis.blur=12` `col.lightness=light` `typ.legibility=none` `typ.body.weight=light`
  - B：`vis.opacity=0.85` `vis.blur=0` `col.lightness=dark` `typ.legibility=outline` `typ.body.weight=regular`

  </details>
- **单变量版：浅色毛玻璃 + 细体 → 只切换 vis.opacity、typ.legibility、col.lightness**（单变量对照；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线）；场景依次切换：白天雪地（snowVillage））
  - 承载原则的参数：底不透明度：0.2 → 0.85；文字可读辅助：无 → 文字描边；面板明度：浅色面板 → 深色面板
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-text-over-live-scene#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `chk.contrast=true` `vis.blur=12` `typ.body.weight=light`
  - A：`vis.opacity=0.2` `typ.legibility=none` `col.lightness=light`
  - B：`vis.opacity=0.85` `typ.legibility=outline` `col.lightness=dark`

  </details>

#### P-color-never-alone

**颜色永远不单独承载信息：每个语义色都配一个形状、图标、文字或位置**

> 适用品类：动作与 Roguelite、射击、角色扮演、策略与战术、建造与经营、工厂与自动化、沙盒与物理、解谜与侦探、卡牌与桌面、MMO · 相关：[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-item-decision](#p-item-decision)、[P-palette-roles](#p-palette-roles) · 风格变体：`fam.synthwave`、`fam.military`、`fam.flat-map`

**要解决的问题**

红绿色觉异常约占男性 8%（GAG 与 06 文档引用 8–10%），白内障、强光下的屏幕、护眼模式也会吞掉色差。阵营、稀有度、状态、危险只靠色相区分时，这些玩家分不出敌我、档位和可不可用。评测几乎不会暴露这类问题（关键词粗筛里「色盲 / 色弱」只有 6 条），只能靠设计时的冗余与模拟检查。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 形状即身份，颜色只做加强 | <abbr title="col.coding=lineId">语义颜色编码 = 路线 / 类别身份色</abbr>；<abbr title="st.statusMark=icon">状态标识形态 = 图标</abbr>；<abbr title="vis.iconStyle=flat">图标风格 = 扁平填充</abbr> | 大量同类对象要互相区分的极简 / 解谜 / 路网游戏：Mini Metro 的车站用圆、三角、方块等形状区分目的地，线路颜色只用来区分线路。 | 形状词汇有限（一般 6–8 种以内），要在设计初期就规划；新增类别时最难扩展。 | Mini Metro（steam:287980） |
| 意图图标 + 数字 + 颜色 | <abbr title="el.threat.form=intent">敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字</abbr>；<abbr title="st.statusMark=icon">状态标识形态 = 图标</abbr>；<abbr title="elx.valueLabel=current">数值标注 = 当前值</abbr> | 回合战术、卡牌、Roguelite：敌人下一步做什么用图标说、伤害多少用数字说、颜色只表示紧急度。Into the Breach 把攻击意图直接画在格子上（箭头 + 预警格）。 | 图标要先教会；单位头顶的图标与数字会互相挤。 | Into the Breach（steam:590380）、Slay The Spire（iig:slay-the-spire）、Shogun Showdown（steam:2084000）、Alina of the Arena（steam:1668690）、Slice & Dice（steam:1775490） |
| 稀有度 / 档位：边框色 + 星级 / 框形 / 字母 | <abbr title="col.coding=rarity">语义颜色编码 = 稀有度</abbr>；<abbr title="st.rarityCue=border+stars+frameShape">稀有度表达手段 = 边框色 + 星级 + 框形状不同</abbr>；<abbr title="col.rarityScale=diablo">稀有度色阶 = 白绿蓝紫橙</abbr> | 装备、卡牌、收集的格子视图（约束 C-rarity-redundancy 强制至少一种非颜色线索）。The WereCleaner 与 Defender's Quest 用星级表达档位。 | 小格子里多一层符号要留位置；星级与框形要统一一套语言。 | The WereCleaner（steam:2795000）、Defender's Quest: Valley of the Forgotten (DX edition)（steam:218410） |
| 阵营：橙蓝 + 明度拉开 + 剪影 / 位置 | <abbr title="col.coding=team">语义颜色编码 = 阵营色</abbr>；<abbr title="col.teams=orangeBlue">阵营色对 = 橙蓝（色盲安全）</abbr> | 对抗、多人、RTS / MOBA；UI 与 3D 场景共用同一对阵营色（D-teams）。TF2 的红蓝阵营同时靠职业剪影识别；Portal 2 的蓝 / 橙两个传送门在准星上分居左右两半，位置本身就是第二线索。 | 红 = 敌的直觉要换成别的线索建立；橙蓝两色要拉开明度（浅蓝 vs 深橙）才在灰度下仍可分。 | Portal 2（steam:620）、Team Fortress 2（steam:440 · 据已知描述） |
| 状态用符号，不用「变灰」 | <abbr title="st.locked=lock">锁定 / 未获得表现 = 锁图标</abbr>；<abbr title="st.cooldown=radialWipe">冷却 / 不可用表现 = 冷却扇形</abbr>；<abbr title="st.done=check">完成 / 已领标记 = 绿勾</abbr> | 背包、技能栏、菜单里的锁定 / 冷却 / 完成 / 不可用：XAG 103 举的例子是锁定商品除了变灰还加锁图标、不可用菜单项另写「不可用」。 | 符号一多画面会花，统一用一套线性小图标；同屏各状态要占不同通道（C-st-channels）。 | — |
| 单一危险色 + 明度极端拉开 | <abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="hier.emphasis=color+value">强调配方 = 颜色 + 明暗对比</abbr> | 节奏 / 弹幕 / 动作：全屏只有「会伤你的」一种高亮色，其它压暗。Just Shapes & Beats 的危险物全是品红、玩家是青色，两者明度差很大。 | 色彩表现力被压缩；仍需形状与运动方向帮助识别；品红 / 青这对在三种色盲模拟下都要单独验证。 | Just Shapes & Beats（steam:531510） |

**经验法则**

- 每个语义色都配一个非颜色线索：形状、图标、文字、图案、位置五选一以上。
- 先开全色盲（chk.cvd = achroma）看一遍：灰度下分不开的就是只靠色相的；再分别看红 / 绿 / 蓝色盲。
- 阵营默认橙蓝并拉开明度；危险色避开与安全色构成红绿对立。
- 稀有度至少两种通道：边框色 + 星级 / 框形 / 字母 / 侧边色条（C-rarity-redundancy）。
- 锁定 / 空槽 / 完成 / 冷却 / 选中同屏时各占不同视觉通道，符号类优先（C-st-channels）。
- UI 与 3D 世界共用一张语义色表，一起做色盲模拟（D-teams）；模拟只用于自查，最终要找色觉异常玩家实测（XAG 103）。

**反例与玩家评价**

- 红→绿热力图、红 / 绿表示好 / 坏或敌 / 友。 例：Cities: Skylines（steam:255710 · 据已知描述）。
  - 评价与证据（依据：评测）：评测里色盲话题极少（6 条 / 6 款），无法计数；06 文档 A9 已把红→绿热力图列为色盲陷阱。本工具 col.teams = greenRed 会触发 C-teams-cvd 警告。
- 格子 / 图标视图只用边框色或底色分档，档位文字只在详情里。 例：Assassin's Creed Odyssey（steam:812140 · 据已知描述）、Diablo IV（steam:2344520 · 据已知描述）。
  - 评价与证据（依据：推断）：无直接抱怨计数（评测几乎不提色盲）；Assassin's Creed Odyssey 的战利品按灰 / 蓝 / 紫 / 金上色，Diablo IV 卡上只记到边框色 + 底色两个色彩通道。
- 锁定、冷却、完成、不可用都用「去饱和 / 变灰」表达，同屏分不出来。
  - 评价与证据（依据：背景）：约束 C-st-channels 来自 R1 复测（v1 的灰度锁、去饱和冷却、灰化完成同屏分不出）；评测无对应分类。
- 说话人、频道、队友只靠名字颜色区分。
  - 评价与证据（依据：文献）：无计数；XAG 104 要求颜色之外必须有文字等第二种方式。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 合成波 / 蒸汽波（`fam.synthwave`，皮肤 `skin.synth`）：合成波：粉青配色对色觉障碍不友好，方块上加箭头做形状冗余（Beat Saber）。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：敌我除了颜色还有方括号形状与编号。
- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何：线路用颜色 + 站点形状（Mini Metro 的圆、三角、方）。
- 17 号图谱反查到的相关家族：`fam.military`、`fam.industrial-scifi`、`fam.terminal-grid`、`fam.one-bit-dither`、`fam.neumorph`、`fam.mono-line`、`fam.flat-map`、`fam.broadcast`、`fam.noir-dossier`、`fam.cyberpunk`

**出处**

- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：颜色要配合符号、图案或形状；红绿色觉异常在男性中常见（06 文档引用为 8–10%）。
- [Xbox Accessibility Guideline 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103)（S161）：关键信息用颜色表达时至少再加形状、图案、图标或文字之一；颜色是主要手段时要允许玩家改色（预设或自由取色）；变灰表示不可用时要另加手段；模拟滤镜不能替代真人测试。
- [AbleGamers APX: Distinguish This From That](https://accessible.games/accessible-player-experiences/access-patterns/distinguish-this-from-that/)（S126）：让玩家改色、在颜色旁加符号、提高前景与背景对比；举例包括三消游戏的色盲模式在珠子上叠符号、射击游戏把小地图敌我图标改色。
- [Machado, Oliveira & Fernandes 2009: CVD simulation](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)（S178）：本工具 chk.cvd 使用的色觉异常模拟矩阵出处（06 文档 C.4）。
- [Rock Paper Shotgun 2018：Into the Breach 界面设计报道](https://www.rockpapershotgun.com/2018/03/05/into-the-breach-interface-design/)（S097）：开发者表示为了清晰宁可放弃酷的点子；敌人意图直接画在格子上（原文未能在本轮核实）。

**可演示的对比**

- **红绿阵营 + 只靠边框色 vs 橙蓝 + 星级框形 + 锁图标**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：阵营色对：绿友红敌 → 橙蓝（色盲安全）；锁定 / 未获得表现：灰度 → 锁图标；稀有度表达手段：边框色 → 边框色 + 星级 + 框形状不同
  - 看什么：打开绿色盲模拟：A 的敌我（红 / 绿）变成几乎同色的土黄，稀有度格子只剩深浅相近的框，锁定格与普通格分不开；B 的橙蓝模拟后仍明暗分明，稀有度另有星级与框形，锁定格有锁图标。再把模拟切到全色盲：B 关掉颜色仍然能玩。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-color-never-alone#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `col.coding=team+rarity+status` `chk.cvd=deutan` `cnt.screen=screen.hud` `chk.redundancy=true`
  - A：`col.teams=greenRed` `st.rarityCue=border` `st.locked=grayscale`
  - B：`col.teams=orangeBlue` `st.rarityCue=border+stars+frameShape` `st.locked=lock`

  </details>

#### P-high-contrast-and-recolor

**高对比模式与玩家自选色：把「重要的」和「不重要的」拉开，而不是把画面调亮**

> 适用品类：动作与 Roguelite、横版平台、射击、竞速与驾驶、恐怖与悬疑 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable) · 风格变体：`fam.dark-hairline`、`fam.cozy`、`fam.greybox`

**要解决的问题**

默认配色照顾不了所有人：低视力玩家需要更强的分离，色觉异常玩家需要换色，部分阅读障碍玩家反而觉得强对比刺眼（XAG 102）。实时画面又在不断变化，美术调色保证不了每一帧都可读。设计者的问题是：高对比模式到底改什么、色盲模式是滤镜还是换色、这些选项怎样不毁掉美术。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 高对比显示模式：背景降饱和 / 压暗，自己、敌人、可交互物各一个纯色 | <abbr title="a11y.highContrast=true">高对比模式 = 开</abbr>；<abbr title="rel.sceneTone=desaturate">背后调色 = 去饱和</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | 3A 动作、射击、潜行、2D 平台；作为视觉辅助预设的一部分。TLOU Part II 的 High Contrast Display 是专门的渲染模式；据第三方整理，Ragnarök 也有高对比 HUD 与高对比过场选项。 | 每类对象都要有高对比着色通道；画面气质完全改变，只能作为选项。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 关键对象描边高亮（把已有的「感知模式」常开） | <abbr title="rel.worldRender=outline">世界内标注渲染（默认） = 物体描边高亮</abbr>；<abbr title="el.threat.worldRender=outline">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 物体描边</abbr> | 敌人、掉落、可交互物容易被写实环境吞掉时。很多作品已把描边做成能力：TLOU 的聆听模式把敌人描白、Dishonored 的透视、Horizon 的聚焦扫描、Mirror's Edge 把可攀爬路线染红——无障碍版本只是让它常开或可调颜色。 | 描边色要可选；常开会削弱潜行与探索的发现感。 | Mirror's Edge（steam:17410）、The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、Dishonored（steam:205100 · 据已知描述）、Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述） |
| HUD 颜色与 HUD 底板可选 | <abbr title="col.text=#FFE14D">文字色 = #FFE14D</abbr>；<abbr title="vis.opacity=1">底不透明度 = 1</abbr>；<abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr> | 以文字 / 细线为主的写实 HUD。TLOU Part II 给出五种 HUD 颜色与三档 HUD 底。 | 每套 HUD 色都要过对比检查；位图图标要准备多色版本或改为可着色的单色图标。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、The Last of Us Part I（steam:1888930 · 据已知描述） |
| 色盲预设 + 关键色逐项自选（替换语义色，不是全屏滤镜） | <abbr title="a11y.cvdPreset=deutan">色盲预设 = 绿色弱</abbr>；<abbr title="col.teams=orangeBlue">阵营色对 = 橙蓝（色盲安全）</abbr> | 有阵营、稀有度、敌我标记、危险区的游戏：至少红 / 绿 / 蓝三种预设 + 自定义。Destiny 2、Overwatch 有色盲模式；据第三方整理，Ragnarök 可以按多类对象单独选色；XAG 103 记录同系列 Forza Horizon 4 的三种色盲预设与高对比模式。 | 语义色必须集中管理（色板角色 / 主题变量），散在贴图里的颜色改不了。 | Destiny 2（steam:1085660）、Overwatch（iig:overwatch）、Forza Horizon 5（steam:1551360 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |

**经验法则**

- 高对比模式下 UI 与关键对象对背景 ≥ 7:1（XAG 102），并按类别分色：自己 / 敌人 / 可交互 / 危险。
- 所有语义色走色板角色（col.focus、col.accent、阵营色、稀有度色阶），一处改全局生效；Godot 里对应 Theme 常量或全局 shader uniform。
- 色盲支持 = 三种预设 + 自定义取色，预览放在真实游戏画面里（Battlefield 2042 在暗 / 中 / 亮三种环境里预览，见 XAG 102）。
- 描边默认用白 + 黑双层（亮暗背景都可见），颜色可改。
- 读取平台的高对比设置作默认值（XAG 102）。

**反例与玩家评价**

- 色盲模式做成全屏后处理滤镜：整张画面跟着变色，UI 语义色之间反而没有拉开。
  - 评价与证据（依据：文献）：无评测计数；XAG 103 强调模拟滤镜只用于开发自查，正确做法是逐元素换色或让玩家自选。
- 「高对比」只是把 UI 调亮：背景没有退后，对象类别也没有分色。
  - 评价与证据（依据：文献）：无计数；XAG 102 明确高对比模式的目的在于提高重要元素的可见性、拉开不同类元素、拉开重要与不重要元素。
- 选项很全但藏在深层菜单、首次启动不提示，默认值本身不过线。
  - 评价与证据（依据：文献）：评测证据不足：原来引用的 God of War Ragnarök 3 条、Forza Horizon 5 2 条「字小」，复核后不是在说文字。这条是规范推论（XAG 102 / 114：选项要可发现、可预览，默认值本身也要过线）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：高对比模式把背景压到近黑、可交互物描亮边。
- 圆润友好（`fam.cozy`，皮肤 `skin.cozy`）：圆润友好：奶油底高对比模式换深棕正文、浅色只给禁用态。
- 灰盒（中性基线）（`fam.greybox`，皮肤 `skin.greybox`）：灰盒基线：玩家自选色作用在逐元素语义色上，而不是全屏滤镜。
- 17 号图谱反查到的相关家族：`fam.glass`、`fam.neumorph`

**出处**

- [XAG 102: Contrast](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)（S069）：高对比模式（亮 / 暗）下所有 UI 元素对背景 ≥ 7:1；高对比的本意是拉开重要与不重要元素；举 Hyperdot 的双高对比模式、Eagle Island 的背景压暗与角色 / 平台描边。
- [The Last of Us Part II 无障碍选项（PlayStation 官方页）](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)（S112）：High Contrast Display 渲染模式、HUD 尺寸默认 / 大、HUD 颜色五选、HUD 底三档；视觉预设一键打开高对比与大 HUD，之后每项仍可单调。
- [God of War Ragnarök accessibility options (PlayStation)](https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/)（S108）：按视觉 / 听觉 / 动效减少 / 操作分预设；高对比 HUD、高对比过场、多类对象独立选色等具体条目据第三方选项清单整理，未逐项核对官方页。
- [Xbox Accessibility Guideline 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103)（S161）：颜色是主要信息手段时，玩家应能用预设或自由取色改掉；举 Forza Horizon 4 的三种色盲预设 + 高对比模式、Call of Duty: Black Ops Cold War 的小地图图标逐类选色。

**可演示的对比**

- **默认显示 vs 高对比 + 换色（绿色盲模拟下）**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：色盲预设：关 → 绿色弱；高对比模式：关 → 开；背后调色：原样 → 去饱和；世界内标注渲染（默认）：平面公告板 → 物体描边高亮
  - 看什么：同样在绿色盲模拟下看：B 开启后场景退成低饱和、敌人与可交互物改成带描边的纯色，HUD 按绿色弱预设换了语义色。注意 B 并没有整体变亮——它是「重要的跳出来、不重要的退下去」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-high-contrast-and-recolor#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `chk.cvd=deutan` `cnt.screen=screen.hud`
  - A：`a11y.highContrast=false` `a11y.cvdPreset=off` `rel.worldRender=billboard` `rel.sceneTone=none`
  - B：`a11y.highContrast=true` `a11y.cvdPreset=deutan` `rel.worldRender=outline` `rel.sceneTone=desaturate`

  </details>

#### P-subtitles-captions

**字幕是一套独立排版：默认开、比正文大、标说话人、可加底，声音信息也要有画面版本**

> 适用品类：探索与冒险、动作与 Roguelite、射击、角色扮演、叙事与视觉小说、恐怖与悬疑 · 相关：[P-dialogue-presentation](#p-dialogue-presentation)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-text-size-floor](#p-text-size-floor) · 风格变体：`fam.cinematic-letterbox`、`fam.comic`、`fam.zero-hud`

**要解决的问题**

字幕不只给听障玩家：Ian Hamilton 在 GDC 2019 的数据是约六成玩家会开字幕（静音玩、环境嘈杂、混音听不清）。常见问题是无框细字压在亮画面上、说话人不明、一屏三四行、过场开头来不及打开字幕、环境声与方向信息只有声音。本地评测里明确说字幕太小的只有 BioShock Infinite 3 条（去重后）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 电影式无框字幕 + 描边 / 投影 | <abbr title="cnt.elements=el.subtitle">信息元素集合 = 字幕 / 说话人</abbr>；<abbr title="cmp.dialogBox=bare">对话框结构 = 无框字幕</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr>；<abbr title="el.subtitle.screenAnchor=bc">字幕 / 说话人 · 屏幕锚点 = 下中</abbr> | 过场、步行模拟、画面偏暗且讲究电影感的作品：Dear Esther 只有旁白字幕，Kentucky Route Zero 的对话是角落无框文字，幻塔、绝区零的剧情字幕无框压在底部。 | 亮场景必然失效，必须同时提供底板选项；描边 / 投影对部分读写障碍玩家反而更难读（80.lv 转述 Hamilton）。 | Dear Esther: Landmark Edition（steam:520720）、Kentucky Route Zero（steam:231200）、幻塔（完美世界）（gameui:3522）、绝区零（米哈游）（gameui:13081） |
| 字幕底板（不透明度 0–100% 可调）+ 更大字号 | <abbr title="cnt.elements=el.subtitle">信息元素集合 = 字幕 / 说话人</abbr>；<abbr title="cmp.dialogBox=bare">对话框结构 = 无框字幕</abbr>；<abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr>；<abbr title="el.subtitle.scale=1.3">字幕 / 说话人 · 大小 / 突出度 = 1.3</abbr> | 所有有语音的游戏都该提供；户外 / 白天 / 雪地为主的作品默认就开。XAG 104 举同系列 Forza Horizon 4 的字幕设置：底板不透明度滑条 + 实时预览。 | 底板挡画面：默认可以低不透明度，但必须能拉满。 | Forza Horizon 5（steam:1551360 · 据已知描述） |
| 底部通栏对话框：名牌 + 头像 + 实底 | <abbr title="cmp.dialogBox=bar">对话框结构 = 底部通栏</abbr>；<abbr title="vis.opacity=0.9">底不透明度 = 0.9</abbr>；<abbr title="cnt.characterMedium=bust">主角色呈现介质 = 半身立绘</abbr> | RPG、视觉小说、像素叙事：说话人由名牌与立绘确定，底是实的。Hades 是左侧大立绘 + 底部框，FFVIII 对话窗左上写说话人名。 | 占下方约四分之一屏，与底部 HUD 冲突时要让位或暂隐 HUD。 | Hades（steam:1145360）、Stardew Valley（steam:413150）、FINAL FANTASY VIII（steam:39150）、OMORI（steam:1150690） |
| 挂在说话人身上的气泡（用空间位置标说话人） | <abbr title="cmp.dialogBox=bubble">对话框结构 = 带尾气泡</abbr>；<abbr title="el.subtitle.attachTo=target">字幕 / 说话人 · 世界挂点 = 目标 / 敌人</abbr> | 多人对话、边走边说、2D / 斜俯视叙事：OXENFREE 的台词与选项挂在角色头上，Night in the Woods 是黑底白字圆角气泡。 | 说话人离屏时要加 ← / → 方向；镜头拉远时气泡变小，需要最小尺寸。 | OXENFREE（steam:388880）、Night in the Woods（steam:481510）、Spiritfarer（steam:972660）、A Short Hike（steam:1055540） |
| 可回看的对话记录 + 自动 / 快进（阅读节奏自控） | <abbr title="cmp.dialogBox=chatThread">对话框结构 = 聊天软件式</abbr>；<abbr title="ix.skip=vnControls">跳过 / 快进 = 自动 / 快进 / 日志一组</abbr>；<abbr title="mo.textReveal=instant">文字出现 = 立即</abbr> | 文字量大的叙事、侦探、文字冒险：Disco Elysium 的对话是右侧整栏滚动文本，可以往回读。 | 需要日志界面与存储；长文还要配字号 / 行距设置。 | Disco Elysium（steam:632470）、Depersonalization（steam:1477070） |
| 音效字幕 + 方向指示（声音信息的画面副本） | <abbr title="cnt.elements=el.subtitle+el.threat">信息元素集合 = 字幕 / 说话人 + 敌人血条 / 预警 / 意图</abbr>；<abbr title="el.threat.form=edgeDir">敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示</abbr>；<abbr title="rel.metaFx=hurtVignette">元 UI 屏幕效果 = 受击红边</abbr> | 靠声音传递威胁或线索的射击、恐怖、潜行、生存。Valve 在 Half-Life 2 与 Portal 2 率先做了带音效描述的隐藏字幕；God of War 用屏幕边缘箭头标出画面外的来袭；节奏动作 Hi-Fi RUSH 提供节拍可视化。 | 要为关键音效写一张字幕表并标方位；受击红边要能看出方向，而不是整屏泛红。 | Half-Life 2（steam:220）、Portal 2（steam:620）、Hi-Fi RUSH（steam:1817230）、God of War（steam:1593500 · 据已知描述） |

**经验法则**

- 播放任何声音之前就能打开字幕；最好默认开（XAG 104 举 Gears 5 首启即开字幕）。
- 字幕比正文大：GAG 建议默认或可调到 ≥ 46px@1080p，且至少能放大到最小值的 200%。
- 每行 ≤ 38–40 个拉丁字符、最多两行（例外时三行）；中文按 XAG 101「CJK 行宽减半」换算约 ≤ 20 字（换算值，未单独核实）；断行放在语义处。
- 换说话人就标名字，离屏说话人加 ← / →；颜色只能作补充。
- 底板颜色与不透明度 0–100% 可调，设置页在真实画面上实时预览。
- 对白、背景闲聊、环境音效三类字幕分开开关；音效写在方括号里并标方向。
- 字幕放在下方居中，放到最大时也不能盖住关键 HUD；字幕设置随截图 / 录像保留（XAG 104）。

**反例与玩家评价**

- 无框细字幕压在亮 CG / 白天画面上，且没有底板选项。 例：Sunrider: Mask of Arcadius（steam:313730）、少女前线：云图计划（散爆网络）（gameui:3033）、幻塔（完美世界）（gameui:3522）。
  - 评价与证据（依据：推断）：R3 没有「字幕」分类；去重并收紧口径后，明确说字幕太小的只有 BioShock Infinite 3 条；Sunrider 在 152 条评测里无相关抱怨，两款 GameUI 手游卡没有 Steam 评测——这类风险靠对比度检查发现，不能等评测。
- 打字机逐字出现、不能一键显示全文，或自动翻页太快。
  - 评价与证据（依据：文献）：无计数；GAG 认知类基础项要求文字推进由玩家掌握。
- 一屏三四行、全大写、说话人只靠颜色区分。
  - 评价与证据（依据：文献）：无计数；XAG 104：每行约 40 字符、最多两行、混合大小写、颜色之外必须有文字说明说话人。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 电影宽银幕 / 片头字幕（`fam.cinematic-letterbox`）：电影宽银幕：字幕在下方黑边里，天然有底。
- 漫画对话框（`fam.comic`，皮肤 `skin.comic`）：漫画对话框：字幕变成带尾气泡，说话人一目了然。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：字幕是唯一常驻的文字，必须有半透明底和说话人名。
- 17 号图谱反查到的相关家族：`fam.cinematic-letterbox`

**出处**

- [Xbox Accessibility Guideline 104: Subtitles and captions](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104)（S162）：所有语音都有字幕、换说话人时标名、离屏用箭头；字幕默认开或开场前可设；字号过 XAG 101 下限并可放大到 200%；每行不超过约 40 字符、最多两行、混合大小写、至少一种无衬线；底板颜色与 0–100% 不透明度可调；设置有真实画面预览；三类字幕可分开开关。
- [Game Accessibility Guidelines: present subtitles / captions in a clear, easy to read way](https://gameaccessibilityguidelines.com/if-any-subtitles-captions-are-used-present-them-in-a-clear-easy-to-read-way/)（S142）：字号 ≥ 46px@1080p（默认或可调）、实底或半透明底、每行约 40 字符、两行为限；与美术冲突时可读性优先，用选项兼顾两者。
- [80.lv: 10 golden rules on subtitles for games（Ian Hamilton GDC 2019 演讲整理）](https://80.lv/articles/10-golden-rules-on-subtitles-for-games)（S078）：约六成玩家使用字幕；字幕与音效字幕分开处理，Valve 在 Half-Life 2 与 Portal 2 率先做了音效字幕；标说话人与方向、给足阅读时间、清晰无衬线、避免全大写、可选黑底。
- [AbleGamers APX: Clear Text](https://accessible.games/accessible-player-experiences/access-patterns/clear-text/)（S125）：举 Assassin's Creed Origins：字幕下有深色底、说话人名写在字幕上方；Grand Kingdom 有自动播放与回看日志。

**可演示的对比**

- **投影细字幕 + 打字机 vs 半透明底 + 大字 + 整句**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线）；场景依次切换：白天雪地（snowVillage））
  - 承载原则的参数：字幕 / 说话人 · 大小 / 突出度：1 → 1.3；文字出现：打字机逐字 → 立即；文字可读辅助：投影 → 半透明底板
  - 配套改动：基准字号：16 → 24
  - 看什么：雪地上 A 的投影字幕几乎消失，打字机效果让读得慢的人跟不上；B 加了半透明底、字号更大、整句一次出现。比较两者占用的面积：B 多挡了一条底，换来任何背景都能读——所以底板不透明度要给玩家调。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-subtitles-captions#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.elements=el.vitals+el.subtitle` `cmp.dialogBox=bare` `cnt.screen=screen.hud`
  - A：`typ.legibility=shadow` `typ.baseSize=16` `mo.textReveal=typewriter` `el.subtitle.scale=1`
  - B：`typ.legibility=scrim` `typ.baseSize=24` `el.subtitle.scale=1.3` `mo.textReveal=instant`

  </details>

#### P-typography-legible-format

**正文排版：无衬线可选、句子不用全大写、行长与字距有上限，风格交给标题**

> 适用品类：射击、角色扮演、叙事与视觉小说、策略与战术、卡牌与桌面 · 相关：[P-type-two-tier](#p-type-two-tier)、[P-text-size-floor](#p-text-size-floor) · 风格变体：`fam.scifi`、`fam.editorial`、`fam.handmade-craft`

**要解决的问题**

字号够了也可能难读：全大写长句、窄体 + 宽字距、细体、手写 / 书法 / 像素字做正文、超长行、两端对齐。科幻与极简风格最爱这些手法——本工具的科幻 HUD 皮肤默认正文是窄体 + 全大写 + 0.2em 字距，军事战术是等宽 + 全大写，新粗野主义的正文也是全大写。设计者的问题是：风格感放在哪一层，正文守住哪些底线。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 风格给标题，正文回到无衬线常规 | <abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.body.weight=regular">正文字重 = 常规</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr>；<abbr title="typ.titleFx=drybrush">标题字特效 = 墨飞白</abbr> | 国风、哥特、手绘、像素等强风格：Wandering Sword 把招式名做成巨型竖排书法、属性页正文仍是普通字；Metaphor 的斜排衬线大字只用在菜单标题；Ghost of Tsushima 用书法标题。 | 正文与标题反差大，要用颜色、底纹、装饰把两者收回同一体系。 | Wandering Sword（steam:1876890）、Metaphor: ReFantazio（steam:2679460）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |
| 句子用原样大小写，全大写只给 1–2 个词的标签 | <abbr title="typ.body.case=asIs">正文大小写 = 原样</abbr>；<abbr title="typ.display.case=upper">标题大小写 = 全大写</abbr>；<abbr title="typ.display.tracking=0.08">标题字距 = 0.08</abbr> | 英文 / 拉丁界面的科幻、军事、极简风格：CONTROL 的大号无衬线标题叠在画面上，说明文字保持正常大小写。 | 少了一点「冷峻」，可用标题的字距与字重补回。 | CONTROL（steam:870780） |
| 数字用等宽或展示数字 | <abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 跳动的计数、表格、计时、资源栏：等宽数字变化时不左右抖。MGSV 的结算是黑底等宽数据表；Balatro 的分数用大号展示数字。 | 等宽数字略宽；展示数字只适合少数大数。 | METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Balatro（steam:2379780） |
| 风格字体 + 「易读字体」开关 | <abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.display.family=same">标题字族 = 同正文</abbr> | 叙事核心依赖特殊字体（手抄体、像素字、手写）时：默认可以保留风格字体，但给一个无衬线替换（XAG 101：使用风格化字体时提供非风格化选项）。 | 两套字体都要做排版与溢出检查；中文风格字体还要查字符集是否完整。 | — |
| 段落上限：行宽、行距、对齐 | <abbr title="cnt.textLength=short">文案量 = 短段（2–3 句）</abbr>；<abbr title="typ.body.tracking=0.02">正文字距 = 0.02</abbr> | 说明、日志、卡牌规则、教程：Disco Elysium 把大量对话放在窄的右侧栏里，行短、可滚动。 | 长文要拆页或滚动；窄栏占用一侧画面。 | Disco Elysium（steam:632470） |

**经验法则**

- 至少提供一种无衬线正文字体；用了风格化字体就要有非风格化替代（XAG 101）。
- 句子用正常大小写；全大写只用于 1–2 个词的标签（XAG 101 对标签豁免）。
- 段落：拉丁文每行 ≤ 80 字符、中日韩 ≤ 40 字，行距 ≥ 1.5，段距 ≥ 2 倍行距（XAG 101 不可调时的建议值）。
- 字距：XAG 建议字距 ≥ 0.12 倍字号、词距 ≥ 0.16 倍（针对拉丁文）；中文正文以 0–0.05em 为宜（经验值），宽字距只给标题。
- 按语言方向左对齐，不要两端对齐或居中长段落。
- 跳动的数字用等宽数字；竖排只给标题（C-vertical-latin：拉丁字母全竖排基本不可读）。

**反例与玩家评价**

- 正文全大写 + 窄体 + 宽字距（科幻 / 军事 HUD 常见），单词失去轮廓。
  - 评价与证据（依据：推断）：评测无对应分类；本工具 skin.scifi（窄体 + 全大写 + 0.2em）、skin.military（等宽 + 全大写）、skin.neobrutal（正文全大写）都应在正文层改回原样大小写。
- 手写、书法、像素、手抄体做小字号正文。
  - 评价与证据（依据：文献）：评测证据不足：Pentiment、Hyper Light Drifter、鬼谷八荒原来的「字太小」命中复核后不是在说文字。依据是 06 文档 B 部分（中文手写字体字符集不全、像素中文 12px 笔画粘连）与 XAG 101。
- 细字重做正文（极简 / 细线风格的默认）。
  - 评价与证据（依据：推断）：无计数；skin.mono、skin.thinGeo 默认正文为细体且无底，是本工具里最容易不过最小字号与对比检查的两套皮肤。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：标题可以窄体全大写，正文回到常规大小写与正常字距。
- 极简编辑 / 杂志排版（`fam.editorial`）：极简编辑：正文行长 40–60 字、两端不对齐，标题才做排版表达。
- 手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`）：手工实物：手写体只给标签，正文用无衬线。
- 17 号图谱反查到的相关家族：`fam.crt`、`fam.swiss`、`fam.neobrutal`、`fam.outsider`、`fam.typographic-hud`

**出处**

- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：至少一种无衬线字体；风格化字体需有非风格化选项；字体字符集完整；行宽、行距、段距、字距、词距建议值；句子用正常大小写；按语言方向对齐。
- [80.lv: 10 golden rules on subtitles for games（Ian Hamilton GDC 2019 演讲整理）](https://80.lv/articles/10-golden-rules-on-subtitles-for-games)（S078）：清晰的无衬线字体、避免全大写、提供字体选项（同样适用于正文）。

**可演示的对比**

- **窄体全大写宽字距 vs 正文原样大小写**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：正文大小写：全大写 → 原样；正文字族：窄体 → 无衬线；正文字距：0.2 → 0.02；正文字重：细 → 常规
  - 配套改动：标题大小写：自动 → 全大写
  - 看什么：切到英文看：A 的说明文字是一排等高的大写块，单词轮廓消失，读一行要逐字母拼；B 只有标题保留全大写，正文恢复单词形状，风格感由标题承担。中文界面下两者的差别主要在细体与宽字距。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-typography-legible-format#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `ctx.locale=en` `cnt.screen=screen.hud`
  - A：`typ.body.family=condensed` `typ.body.case=upper` `typ.body.tracking=0.2` `typ.body.weight=light` `typ.display.case=auto`
  - B：`typ.body.family=sans` `typ.body.case=asIs` `typ.body.tracking=0.02` `typ.body.weight=regular` `typ.display.case=upper`

  </details>
- **单变量版：窄体全大写宽字距 → 只切换 typ.body.case、typ.body.family、typ.body.tracking、typ.body.weight**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：正文大小写：全大写 → 原样；正文字族：窄体 → 无衬线；正文字距：0.2 → 0.02；正文字重：细 → 常规
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-typography-legible-format#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `ctx.locale=en` `cnt.screen=screen.hud` `typ.display.case=auto`
  - A：`typ.body.case=upper` `typ.body.family=condensed` `typ.body.tracking=0.2` `typ.body.weight=light`
  - B：`typ.body.case=asIs` `typ.body.family=sans` `typ.body.tracking=0.02` `typ.body.weight=regular`

  </details>

#### P-flash-motion-comfort

**光敏、晕动与减少动效：闪烁有硬阈值，减少动效按通道替换——降的是刺激，不是信息**

> 适用品类：所有品类 · 相关：[P-meta-perception](#p-meta-perception)、[P-shake-hitstop](#p-shake-hitstop)、[P-juice-budget](#p-juice-budget) · 风格变体：`fam.synthwave`、`fam.meta-ui`、`fam.crt`

**要解决的问题**

光敏性癫痫玩家对高频、大面积、红色闪烁敏感；前庭障碍玩家会被大位移、视差、镜头晃动引起眩晕；注意力障碍玩家被常驻动画分心；菜单动效太长还会让所有人觉得「卡」。本地评测去重后（关键词见 reviewRecount.keywords）：光敏 / 频闪 / 光污染 70 条 / 40 款、晕 / motion sickness 204 条 / 97 款；R3 的「UI 卡顿 / 响应慢」13 条 / 11 款（Cyberpunk 2077、DEATHLOOP 各 2 条）。反过来，简单地「全部关掉」又会让受击、拾取等关键反馈消失，游戏变得难以理解——减少动效要按通道替换，而不是一刀切。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 默认就克制：短时长、缓出、少待机动画 | <abbr title="mo.duration=0.2">动效时长 = 0.2</abbr>；<abbr title="mo.easing=easeOut">缓动性格 = 缓出</abbr>；<abbr title="mo.juice=0.3">反馈强度 = 0.3</abbr>；<abbr title="mo.idle=none">环境待机动效 = 无</abbr> | 策略、经营、叙事、解谜，以及任何要反复进出的菜单：Mini Metro 与 CONTROL 都以安静的动效为主。 | 宣传视频里显得「平」；动作 / 派对类要把爽感集中在战斗反馈上。 | Mini Metro（steam:287980）、CONTROL（steam:870780） |
| 减少动效总开关（读系统设置） | <abbr title="a11y.reduceMotion=true">减少动效 = 开</abbr> | 所有游戏。开启后位移入场改淡入、去掉震屏 / 闪白 / 速度线 / 待机动画、演出强度封顶 1（D-reduceMotion）。Ragnarök 单独有「动效减少」预设。 | 每种入场与反馈都要准备淡入或静态替身，不能直接删掉反馈。 | God of War Ragnarök（steam:2322010 · 据已知描述） |
| 屏幕效果逐项强度滑条 | <abbr title="rel.metaFx=hurtVignette+speedLines">元 UI 屏幕效果 = 受击红边 + 整屏速度线</abbr>；<abbr title="mo.juice=0.5">反馈强度 = 0.5</abbr>；<abbr title="a11y.reduceMotion=false">减少动效 = 关</abbr>（渲染说明：mo.juice@el.vitals 已移除（渲染器不读这个按元素覆盖）） | 动作、射击、竞速：受击红边、速度线、镜头晃动、动态模糊分别可调。XAG 117 记录 Cyberpunk 2077 可调附加镜头运动、Halo Infinite 把模糊 / 震屏 / 整屏效果 / 速度线做成 0–100% 滑条。 | 设置项变多，要有「标准 / 低刺激」预设兜底（ov.lowStim）。 | Cyberpunk 2077（steam:1091500）、The Witcher 3: Wild Hunt — Remastered（steam:292030） |
| 替换而非删除 | <abbr title="a11y.reduceMotion=true">减少动效 = 开</abbr>；<abbr title="mo.enter=fade">入场动效 = 淡入</abbr>；<abbr title="rel.metaFx=edgeGlow">元 UI 屏幕效果 = 边缘光框</abbr>；<abbr title="mo.idle=none">环境待机动效 = 无</abbr>；<abbr title="st.alert=warnIcon">警示表达 = 黄三角图标</abbr> | 任何动效有承载信息的地方：滑入 / 缩放换成淡入，闪白换成描边或边缘光，震屏换成短暂的边缘高亮，闪烁警报换成静态图标。 | 每个反馈要设计第二套表现，工作量翻倍。 | — |
| 警示不靠闪：常亮色块 + 图标 + 声音 | <abbr title="st.alert=warnIcon">警示表达 = 黄三角图标</abbr> | 低血、倒计时、危险区：Into the Breach 的受威胁格是静态的预警格 + 箭头，不闪也足够醒目。 | 紧张感要靠声音与节奏补。 | Into the Breach（steam:590380） |
| 降低透明 + 菜单背景静止 | <abbr title="a11y.reduceTransparency=true">降低透明 = 开</abbr>；<abbr title="mo.idle=none">环境待机动效 = 无</abbr>；<abbr title="ast.fx=[]">叠加特效层 = 无</abbr>；<abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr> | 动态背景的主菜单、毛玻璃 / 全息界面；XAG 117 举 HyperDot 可以关闭菜单背景动画。 | 标题界面的第一印象会变平。 | — |
| 低刺激整体叠加 | <abbr title="a11y.reduceMotion=true">减少动效 = 开</abbr>；<abbr title="a11y.reduceTransparency=true">降低透明 = 开</abbr>；<abbr title="mo.juice=0">反馈强度 = 0</abbr>；<abbr title="rel.metaFx=[]">元 UI 屏幕效果 = 无</abbr> | 探索台的「低刺激」叠加预设（ov.lowStim）：给自闭谱系、偏头痛、前庭敏感的玩家一个一键选项。 | 需要在 QA 中把低刺激模式当成一套独立皮肤测试。 | — |

**经验法则**

- 闪烁：每秒 ≤ 3 次、面积 < 25% 屏幕、避免纯红闪、整段闪烁 ≤ 5 秒；移动的高对比条纹 ≤ 5 条、静止 ≤ 8 条（GAG）。
- 减少动效 = 用淡入替代位移 / 缩放，去掉震屏、闪白、速度线、待机动画，但保留状态变化本身（受击、拾取仍要看得见）。
- 按通道分：震屏、闪白 / 闪烁、整屏后处理（模糊、色差、速度线）、背景与待机动画、文字动画、镜头晃动；每项至少能关。
- 替换规则：空间位移（滑、缩放、旋转）→ 淡入淡出；闪白 → 描边或图标；震屏 → 边缘短亮；闪烁警报 → 静态图标。颜色与透明度变化不算运动动画，可以保留。
- UI 过渡 0.2–0.3 秒以内（经验值）；任何动画都不锁输入，可被下一次操作打断。
- 全屏效果逐项给强度滑条并有「全部关闭」；不要把选项叫「癫痫安全」（GAG）。
- 默认值读系统的减少动效 / 降低透明设置（WCAG 2.3.3 的建议做法）。
- 发布前对默认设置跑光敏测试（Harding 一类工具）——默认设置本身也必须过阈值，选项只是额外保障。

**反例与玩家评价**

- 强闪烁没有警告也没有选项。 例：Hyper Light Drifter（steam:257850）、Nodebuster（steam:3107330）、Just Shapes & Beats（steam:531510）、Sayonara Wild Hearts（steam:1122720）、Balatro（steam:2379780）、Cyberpunk 2077（steam:1091500） 等 7 款。
  - 评价与证据（依据：评测）：本地评测去重后按「光污染 / 光敏 / 癫痫 / 频闪 / flashing lights / epilepsy / photosensitive / seizure / strobe」计数 70 条 / 40 款，按条数排：CONTROL 9、FINAL FANTASY XVI 5、Just Shapes & Beats 4、Nodebuster 4、TUNIC 3、Ori and the Will of the Wisps 3、Sayonara Wild Hearts 3、Clair Obscur 3，其余 2 条以下。Hyper Light Drifter 有 2 条，其中有差评说闪光强烈且找不到选项；Nodebuster、Sayonara Wild Hearts、Just Shapes & Beats 的命中多是好评里附带的光敏警告——玩家在替开发者补警告。风格化故障效果的风险主要靠阈值检查而不是评测发现。
- 关掉动效后信息也没了：受击不再有任何提示，拾取没有出现提示。
  - 评价与证据（依据：推断）：评测统计无直接计数（替换原则）。
- 把选项叫作「癫痫安全模式」，承诺了做不到的事。
  - 评价与证据（依据：推断）：无评测计数；Game Accessibility Guidelines 明确建议按控制对象命名（如「屏幕闪光效果」）。
- 菜单入场 / 切页动画长，播放期间锁住输入。 例：Enshrouded（steam:1203620）、Yi Xian: The Cultivation Card Game（steam:1948800）、DEATHLOOP（steam:1252330 · 据已知描述）、Prince of Persia（steam:19980 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 UI 卡顿 / 响应慢去重后：DEATHLOOP 2、Cyberpunk 2077 2，Prince of Persia、Enshrouded、Yi Xian 各 1（这一类只说明「慢」，不全是动画导致）。
- UI 动画多到盖住战斗画面。 例：Persona 5 Royal（steam:1687950）。
  - 评价与证据（依据：评测）：Persona 5 开发中因 UI 动画遮挡画面而做了减量（Wikipedia 美术设计一节，06 文档转引）；P5R 本身在 R3 里没有相关抱怨。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 合成波 / 蒸汽波（`fam.synthwave`，皮肤 `skin.synth`）：合成波：霓虹闪烁与扫描线有强度滑条，默认中档。
- 元界面 / 故障破坏（`fam.meta-ui`）：元界面 / 故障：故障特效可关闭，关闭后改用静态色偏提示。
- CRT 终端（`fam.crt`，皮肤 `skin.terminal`）：CRT 终端：扫描线与辉光可关，关掉后仍保留单色配色。
- 17 号图谱反查到的相关家族：`fam.crt`、`fam.silent-film`、`fam.meta-ui`

**出处**

- [Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)（S170）：闪烁、滚动、自动更新的内容要能暂停、隐藏或关闭；避免或可关震屏、头部晃动、动态模糊；FOV 与镜头自动回中可调；举 Halo Infinite 的逐项滑条、Cyberpunk 2077 的附加镜头运动、HyperDot 的背景动画开关。
- [Game Accessibility Guidelines, Avoid flickering images and repetitive patterns](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)（S136）：闪烁阈值：3 次 / 秒、25% 屏幕面积、整段 5 秒；红色变化算闪；重复条纹的条数阈值；推荐 Harding 测试，不要称「癫痫安全」。
- [W3C, Understanding WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)（S160）：由交互触发的非必要动效应可关闭；前庭障碍会被视差、缩放等引起眩晕；可读取系统的减少动效偏好。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：开发中 UI 动画过多遮挡画面，后来做了减量（06 文档已引用）。
- [Xbox Accessibility Guideline 118: Photosensitivity](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118)（S171）：首选是从内容里消除光敏触发，而不是只放警告页；约 4000 人中有 1 人光敏。
- [MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)（S122）：该设置来自各操作系统的减少动效选项；建议把有风险的运动换成淡入或溶解，而不是简单拿掉反馈。
- [Celeste v1.4.0.0 更新日志](https://maddymakesgamesinc.itch.io/celeste/devlog/237097/v1400-changelog)（S105）：震屏增加 50% 档并设为默认，另有光敏模式——默认值本身就可以是中档。

**可演示的对比**

- **全部动效 vs 减少动效（替换而非删除）**（整套做法对照（多个参数一起变）；内容包：shmup · 流星特攻；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：减少动效：关 → 开；元 UI 屏幕效果：闪白 + 整屏速度线 → 边缘光框；入场动效：砸入（放大落下 + 震） → 淡入
  - 配套改动：反馈强度：0.8 → 自动；环境待机动效：粒子漂浮 → 自动；警示表达：自动 → 黄三角图标
  - 看什么：B 不是什么都不动：受击仍有边缘光、警示变成静态图标、面板仍会淡入，只是去掉了位移、震动、闪白和漂浮粒子。逐一检查 A 里的每个反馈在 B 里还有没有对应物。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-flash-motion-comfort#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shmup` `cnt.screen=screen.hud` `chk.demo=combatBeat`
  - A：`a11y.reduceMotion=false` `mo.juice=0.8` `mo.enter=slam` `rel.metaFx=hitFlash+speedLines` `mo.idle=float` `st.alert=auto`
  - B：`a11y.reduceMotion=true` `mo.enter=fade` `rel.metaFx=edgeGlow` `st.alert=warnIcon` `mo.idle=auto` `mo.juice=auto`

  </details>
- **单变量版：全部动效 → 只切换 a11y.reduceMotion、rel.metaFx、mo.enter**（单变量对照；内容包：shmup · 流星特攻；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：减少动效：关 → 开；元 UI 屏幕效果：闪白 + 整屏速度线 → 边缘光框；入场动效：砸入（放大落下 + 震） → 淡入
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-flash-motion-comfort#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shmup` `cnt.screen=screen.hud` `chk.demo=combatBeat` `mo.juice=0.8` `mo.idle=float` `st.alert=auto`
  - A：`a11y.reduceMotion=false` `rel.metaFx=hitFlash+speedLines` `mo.enter=slam`
  - B：`a11y.reduceMotion=true` `rel.metaFx=edgeGlow` `mo.enter=fade`

  </details>

#### P-motor-input-alternatives

**改键与操作替代：任意动作可改，长按 / 连打 / 同时按都有替代，所有提示跟着改**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、射击、角色扮演、叙事与视觉小说 · 相关：[P-glyph-follows-device](#p-glyph-follows-device)、[P-confirm-by-input](#p-confirm-by-input)、[P-input-parity](#p-input-parity) · 风格变体：`fam.greybox`、`fam.retro-os`、`fam.candy`

**要解决的问题**

运动障碍、单手、手抖、慢性疼痛、使用改装控制器的玩家，需要把任意动作挪到任意键，并避开长按、连打与组合键；改完以后所有提示都要跟着变。本地粗筛：改键 / 键位 109 条 / 72 款（Assassin's Creed 2 8、FFVII Remake 5、Resident Evil 5 4、Cuphead 4），QTE / 连打 184 条 / 62 款（Heavy Rain 33、Beyond: Two Souls 21、Detroit 13、FFXVI 13）；R3 手柄 / 键位类去重后 25 条 / 20 款（改键与 QTE 两项是未去重的早期粗筛，只作数量级参考）。改键页本身也要好用：按情境分组、冲突即时标出、看得出键在手柄或键盘上的位置；提示字形怎样跟随设备见 P-glyph-follows-device，提示放在哪里见 P-prompt-in-context。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 动作 → 键位列表（按情境分组） | <abbr title="cnt.subtype=rebind">界面子功能 = 按键绑定</abbr>；<abbr title="cnt.dataShape=form">主数据结构 = 表单</abbr>；<abbr title="cmp.bindingMap=list">按键绑定呈现 = 动作 → 键位列表</abbr>；<abbr title="cmp.listRow=title+action">列表行字段 = 标题 + 行内按钮</abbr>；<abbr title="lay.nav=tabsTop">分区导航 = 顶部页签</abbr>；<abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="ix.glyphs=keycap">按键提示图标集 = 键盘键帽</abbr> | PC 键鼠，动作多（30+）；按移动 / 战斗 / 菜单 / 载具分组。 | 看不出键在键盘上的位置关系，冲突要靠文字提示。 | Your Only Move Is HUSTLE（steam:2212330）、Red Dead Redemption 2（steam:1174180 · 据已知描述） |
| 手柄示意图 + 引线 | <abbr title="cnt.subtype=rebind">界面子功能 = 按键绑定</abbr>；<abbr title="lay.composition=splitLR">分区方式 = 左右分栏</abbr>；<abbr title="cmp.bindingMap=pad">按键绑定呈现 = 手柄示意图 + 引线</abbr>；<abbr title="ctx.input=pad">输入方式 = 手柄</abbr>；<abbr title="ix.glyphs=xbox">按键提示图标集 = Xbox</abbr> | 主机 / 掌机，按键少（≤ 16），位置关系就是信息（'头 / 手 / 脚'对应四个面键的 AC2 式映射）。 | 长按、组合键、情境键难画；多套布局要逐一出图。 | Assassin's Creed 2（steam:33230 · 据已知描述） |
| 图标随输入设备与改键结果自动切换 | <abbr title="ctx.input=hybrid">输入方式 = 键鼠 + 手柄自动切换</abbr>；<abbr title="ix.glyphs=auto">按键提示图标集 = 自动</abbr> | PC 同时支持键鼠与手柄、触屏兼容手柄：天涯明月刀手游在技能键上同时标了键位字母。 | 图标集与改键表要实时联动；Godot 里从 InputMap 读当前事件生成提示，而不是写死图标。 | 天涯明月刀（gameui:12771） |
| 长按 / 连打 / 同时按的替代方案 | <abbr title="ix.confirm=selectConfirm">确认机制 = 选中 + 确认按钮</abbr>；<abbr title="ix.skip=button">跳过 / 快进 = 跳过按钮</abbr>；<abbr title="ix.mode=select">主交互模式 = 选择条目</abbr> | 确认、跳过、QTE、蓄力、冲刺：提供「点按切换」「自动」或「跳过此段」。XAG 107 举 The Long Dark 把所有长按改成点按、Gears 5 的连打挑战可改为按住。 | 长按原本用于防误触，替代方案要配二次确认或撤销。 | — |

**经验法则**

- 所有动作可在游戏内改键（含菜单返回 / Esc），两根摇杆的 X / Y 轴可分别反转；改的是「动作」，不只是交换两个键。
- 全部动作可改键，提供几套预设 + 完全自定义；改键页按情境分组。
- 冲突即时标出并给'交换'选项；退出改键等待状态的方法（如 Esc）要写在屏幕上。
- 改键后所有提示、教程、按键图例、示意图同步更新（XAG 107）。
- 菜单能用单键、非同时按键完整操作；鼠标 / 触屏在抬起时才触发，可移开取消。
- 长按、连打、组合键都要有「点按 / 切换 / 自动」替代，或允许跳过该段。
- 默认配置必须能玩完全部内容，不需要进设置就能用手柄（Steam Deck 认证要求）。
- 模拟输入（摇杆、扳机）要有数字键等价操作与灵敏度调节。
- Godot：所有输入走 InputMap 动作，改键写回 InputMap 并存档；提示组件从当前绑定生成图标。

**反例与玩家评价**

- QTE 连打 / 限时按键是剧情必经，没有替代或跳过。 例：Heavy Rain（steam:960910 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述）。
  - 评价与证据（依据：评测）：QTE / 连打粗筛（未去重）：Heavy Rain 33 条、Resident Evil 5 8 条；R3 手柄 / 键位类去重后：Heavy Rain 3、Resident Evil 5 1。
- 移植作的键位与手柄支持差，提示与实际按键不一致，不能完整改键。 例：Kingdom Rush Vengeance - Tower Defense（steam:1367550）、Assassin's Creed 2（steam:33230 · 据已知描述）、FINAL FANTASY X/X-2 HD Remaster（steam:359870 · 据已知描述）、Heavy Rain（steam:960910 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述）、Ori and the Blind Forest DE（steam:387290 · 据已知描述） 等 7 款。
  - 评价与证据（依据：评测）：R3'手柄 / 键位不好'去重后 20 款至少 1 条、3 款 ≥ 2 条、共 25 条：Assassin's Creed 2 3 条、Heavy Rain 3、FINAL FANTASY X/X-2 HD 2；Resident Evil 5、Ori and the Blind Forest DE、Forgotton Anne、Kingdom Rush Vengeance 各 1 条。改键粗筛（未去重）Assassin's Creed 2 8 条。样本太少，「多为移植作」只能当提示。
- 长按确认 / 长按跳过是唯一方式。
  - 评价与证据（依据：文献）：无计数；XAG 107 要求避免必须长按、必须同时按、必须连打，做不到就提供替代或允许跳过。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 灰盒（中性基线）（`fam.greybox`，皮肤 `skin.greybox`）：灰盒基线：改键页先做对（分组、冲突提示），再套皮肤。
- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：改键页是一张键盘图，点键即改。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：长按操作配一个可选的「点按切换」开关。

**出处**

- [Xbox Accessibility Guideline 107（输入）](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)（S163）：游戏内可改全部控制、轴可反转、改的是动作；改键后提示同步；界面可用单键非同时按键操作；避免连打、长时间按住与同时按，或提供替代 / 跳过；举 The Long Dark 的长按改点按、Gears 5 的连打挑战替代。
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：按键图标内的文字同样要满足最小字号，并随文字缩放到 200%。
- [Godot Docs: InputMap](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)（S118）：运行时增删动作的输入事件，是改键与按键提示同步在 Godot 里的落点。
- [Game Accessibility Guidelines: Allow controls to be remapped / reconfigured](https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured)（S138）：改键是最有价值的无障碍功能之一；预设省事但不够，应同时给预设与完全自定义；改键并不会造成平台认证问题。
- [Xbox Accessibility Guideline 112: UI navigation](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation)（S166）：选择、返回、页签、翻页的提示与按键全游戏一致；若需用不同方式退出某个状态（如改键模式），界面必须说明。
- [Steamworks: Steam Deck Compatibility Review Process](https://partner.steamgames.com/doc/steamdeck/compat)（S157）：默认控制器配置必须能访问全部内容，玩家无需改任何设置即可用手柄游玩。

**可演示的对比**

- **长按确认与跳过 vs 选中 + 确认、跳过按钮、情境提示**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：确认机制：长按确认 → 选中 + 确认按钮；跳过 / 快进：长按跳过 → 跳过按钮；按键 / 操作提示：画法：键位列表 → 情境按键 + 按键图例条
  - 配套改动：按键绑定呈现：动作 → 键位列表 → 手柄示意图 + 引线；按键提示图标集：自动 → Xbox
  - 看什么：A 的确认与跳过都要按住，按键说明只在一张列表里；B 改为选中 + 确认、跳过按钮，交互物旁有情境按键、底部有图例条。用「对话推进」或「购买确认」演示脚本各走一遍，比较按键次数与按住时长。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-motor-input-alternatives#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `ctx.input=pad` `cnt.screen=screen.hud`
  - A：`el.prompt.form=list` `ix.confirm=hold` `ix.skip=hold` `cmp.bindingMap=list` `ix.glyphs=auto`
  - B：`ix.glyphs=xbox` `el.prompt.form=contextual+legend` `ix.confirm=selectConfirm` `ix.skip=button` `cmp.bindingMap=pad`

  </details>
- **单变量版：长按确认与跳过 → 只切换 ix.confirm、ix.skip、el.prompt.form**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：确认机制：长按确认 → 选中 + 确认按钮；跳过 / 快进：长按跳过 → 跳过按钮；按键 / 操作提示：画法：键位列表 → 情境按键 + 按键图例条
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-motor-input-alternatives#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `ctx.input=pad` `cnt.screen=screen.hud` `cmp.bindingMap=list` `ix.glyphs=auto`
  - A：`ix.confirm=hold` `ix.skip=hold` `el.prompt.form=list`
  - B：`ix.confirm=selectConfirm` `ix.skip=button` `el.prompt.form=contextual+legend`

  </details>

#### P-a11y-presets-discoverable

**无障碍选项要成套、可发现、可预览：首启给预设，每项仍可单调**

> 适用品类：所有品类 · 相关：[P-settings-page](#p-settings-page)、[P-adaptive-layers](#p-adaptive-layers) · 风格变体：`fam.flat`、`fam.cozy`、`fam.dark-hairline`

**要解决的问题**

选项做了玩家却找不到、不知道效果、或要一项项试，就等于没做。评测里提到「无障碍」的 51 条 / 30 款中好评 37 条（TUNIC 7、Cult of the Lamb 4、Hi-Fi RUSH 3、Kena 3、TLOU Part I / II 各 2）——成套且显眼的选项本身会被玩家夸。设计者的问题是：选项怎样组织、何时出现、怎样让人一眼看懂效果。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 按需求分组的一键预设（视觉 / 听觉 / 操作 / 动效） | <abbr title="a11y.textScale=1.4">文字缩放 = 1.4</abbr>；<abbr title="a11y.uiScale=1.2">UI 缩放 = 1.2</abbr>；<abbr title="a11y.highContrast=true">高对比模式 = 开</abbr>；<abbr title="typ.legibility=scrim">文字可读辅助 = 半透明底板</abbr> | 中大型作品：TLOU Part II 有视觉、听觉、操作三套预设，Ragnarök 有视觉、听觉、动效、操作四套并分「部分 / 全部」两档；本工具的叠加预设 ov.bigText、ov.colorSafe、ov.lowStim 就是这种组织的雏形。 | 预设之间会改到同一项，要定优先级；预设改过哪些项要标出来（据第三方整理，Ragnarök 用蓝色标出被预设改动的设置）。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述） |
| 首次启动先给字幕与无障碍设置 | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="flow.entry=sequence">进入方式 = 流程强制</abbr>；<abbr title="lay.preview=true">即时预览 = 开</abbr> | 有开场过场或大量文字的作品：XAG 104 举 Gears 5 首启字幕默认开，开场后直接进入无障碍设置。 | 多一步开场流程；要允许「稍后再说」并能在主菜单随时回来。 | — |
| 每项带说明与真实画面预览 | <abbr title="cnt.subtype=settings">界面子功能 = 设置页</abbr>；<abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="lay.preview=true">即时预览 = 开</abbr>；<abbr title="cmp.optionEnum=thumbnails">设置项：多选一 = 缩略图</abbr> | 字幕、对比、色盲、HUD 尺寸这类改了才知道效果的选项：XAG 104 举 The Outer Worlds 为每档字幕写清含义、Forza Horizon 在设置页预览字幕。 | 预览需要在设置页渲染真实画面片段或截图。 | — |
| 无障碍不等于更少：可加回的辅助层 | <abbr title="el.objective.form=marker+edgeArrow">目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头</abbr>；<abbr title="el.objective.visibility=always">目标 / 路点 · 显隐（逐元素） = 常驻</abbr>；<abbr title="ix.guideForce=soft">引导强制度 = 软提示（可忽略）</abbr> | 零 HUD / 极简作品为迷路或认知负担重的玩家准备的导航辅助（据第三方整理，Ragnarök 的视觉预设含导航辅助）；Hi-Fi RUSH 的节拍可视化也属于「加回来的信息」。 | 破坏「世界即 UI」的设计，只做选项；默认关时要在开场告诉玩家有这个选项。 | Hi-Fi RUSH（steam:1817230）、God of War Ragnarök（steam:2322010 · 据已知描述） |

**经验法则**

- 设置页有独立的「无障碍」分组，并在首次启动时就出现（至少包括字幕、字号、对比 / 色盲、减少动效）。
- 预设只是起点：选了预设后每一项仍可单独改，并标出预设改过的项。
- 每一项写清它控制什么（不承诺效果），在真实画面上预览。
- 设置自动保存，跨存档、跨设备一致（GAG 通用基础项）。
- 读取平台级设置（高对比、减少动效、字幕样式）作为默认值。
- 商店页 / 游戏内说明列出无障碍功能（GAG 通用基础项）。

**反例与玩家评价**

- 选项散落在显示、音频、操作各页，没有无障碍入口，也没有说明与预览。
  - 评价与证据（依据：文献）：无可靠评测计数：原来引用的 God of War Ragnarök、Forza Horizon 5「字小」命中复核后不是在说文字。这条依据 XAG 114 与 GAG 的组织建议。
- 把无障碍做成「简单模式」：一开就降低难度、或强行关掉 HUD 与特效。
  - 评价与证据（依据：文献）：无计数；GAG 把难度、辅助模式与视觉 / 听觉 / 操作选项分列，XAG 各条都要求逐项可调。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：首启一页「视觉 / 听觉 / 操作 / 动效」四张卡，选了就在真实画面上预览。
- 圆润友好（`fam.cozy`，皮肤 `skin.cozy`）：圆润友好：无障碍入口放在主菜单第一层，用友好的插图说明效果。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：设置页左侧单列一个「无障碍」分类，右侧实时预览。

**出处**

- [The Last of Us Part II 无障碍选项（PlayStation 官方页）](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)（S112）：视觉、听觉、操作三套预设一键配置推荐设置，之后每项仍可单独调整。
- [God of War Ragnarök accessibility options (PlayStation)](https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/)（S108）：70 多项无障碍功能分为视觉、听觉、动效减少、操作四套预设。
- [Xbox Accessibility Guideline 104: Subtitles and captions](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104)（S162）：Gears 5 首启字幕即开、开场后进入无障碍设置；The Outer Worlds 为每档字幕写清含义；字幕设置给真实画面预览。
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)（S066）：通用基础项：保存所有设置、在游戏内与商店页说明无障碍功能、征求无障碍反馈；中级项：辅助模式、可跳过非核心玩法、游戏中可改难度。

**可演示的对比**

- **默认设置 vs 「视觉辅助」一键预设**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：文字缩放：1 → 1.4；高对比模式：关 → 开；减少动效：关 → 开；色盲预设：关 → 绿色弱
  - 配套改动：UI 缩放：1 → 1.2；文字可读辅助：自动 → 半透明底板
  - 看什么：把 B 当作「视觉辅助」一键预设：字号、HUD 尺寸、高对比、色盲语义色、减少动效同时生效。在 HUD、背包、对话三个界面之间切换，看预设是不是在每个界面都成立——任何一屏溢出、遮挡或没跟着变，就是预设漏掉的地方。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-a11y-presets-discoverable#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud`
  - A：`a11y.textScale=1` `a11y.uiScale=1` `a11y.highContrast=false` `a11y.cvdPreset=off` `a11y.reduceMotion=false` `typ.legibility=auto`
  - B：`a11y.textScale=1.4` `a11y.uiScale=1.2` `a11y.highContrast=true` `a11y.cvdPreset=deutan` `a11y.reduceMotion=true` `typ.legibility=scrim`

  </details>
- **单变量版：默认设置 → 只切换 a11y.textScale、a11y.highContrast、a11y.reduceMotion、a11y.cvdPreset**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：文字缩放：1 → 1.4；高对比模式：关 → 开；减少动效：关 → 开；色盲预设：关 → 绿色弱
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-a11y-presets-discoverable#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud` `a11y.uiScale=1` `typ.legibility=auto`
  - A：`a11y.textScale=1` `a11y.highContrast=false` `a11y.reduceMotion=false` `a11y.cvdPreset=off`
  - B：`a11y.textScale=1.4` `a11y.highContrast=true` `a11y.reduceMotion=true` `a11y.cvdPreset=deutan`

  </details>

#### P-localization-ready

**本地化先于美术定稿：给文字留 35% 宽度余量，按元素选缩小或换行，中日韩字号大一档，大数用当地单位，竖排只给标题**

> 适用品类：所有品类 · 相关：[P-text-size-floor](#p-text-size-floor)、[P-title-lettering](#p-title-lettering)、[P-type-two-tier](#p-type-two-tier)、[P-typography-legible-format](#p-typography-legible-format)、[P-in-game-charts](#p-in-game-charts) · 风格变体：`fam.ink`、`fam.pixel`、`fam.silent-film`

**要解决的问题**

同一个按钮，中文两个字、英文一个词、德文 / 俄文常常再长三成以上；中文在同样的可读度下需要更大的字号（笔画更密），中西文混排时基线和字体回退会对不齐；国风界面喜欢竖排（typ.direction），但竖排长文本读起来很慢；数字格式也不同（中文的万 / 亿，英文的 K / M）；中文还有断行禁则（句号、逗号不能出现在行首）。这些问题如果等美术定稿以后才处理，花框、定宽格子、画出来的标题字都要返工。用户是中文开发者，中英双语几乎是默认需求。参数上对应 ctx.locale、chk.overflow（伪本地化 +30% / +50%）、typ.baseSize、typ.direction；文字系统（typ.script）与文字膨胀检查（chk.textExpansion）目前缺参数，见参数缺口。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 宽度余量 + 伪本地化测试 | <abbr title="chk.overflow=plus30">文字溢出 / 伪本地化 = +30%（英文）</abbr>；<abbr title="ctx.locale=en">文案语言 = 英文 / 拉丁</abbr> | 每个界面模板：按最长语言留约 35% 的宽度余量，用 +30% / +50% 伪本地化跑一遍，找出截断与写死的宽度。 | 版面会显得松；定宽花框要改成九宫格。 | — |
| 按元素选：缩小、换行还是截断 + 悬停全文 | <abbr title="a11y.textScale=1.25">文字缩放 = 1.25</abbr>；<abbr title="chk.overflow=plus50">文字溢出 / 伪本地化 = +50%（德文等）</abbr> | 按钮与页签允许缩小一档（有下限）；说明文字换行；列表行截断时必须能看到全文（悬停或详情）。 | 要逐元素定规则；缩小不能低于最小字号（P-text-size-floor）。 | — |
| 中日韩正文大一档 | <abbr title="ctx.locale=zh">文案语言 = 简体中文</abbr>；<abbr title="typ.baseSize=20">基准字号 = 20</abbr> | 中日韩为主要语言时：同样视距下正文比拉丁文大约 +2px，小字不用细体。 | 一屏能放的字变少，版式要按中文重排。 | — |
| 竖排只用于标题与侧牌 | <abbr title="typ.direction=verticalTitle">标题排版方向 = 标题竖排</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr> | 国风 / 和风：章节名、招式名、侧边签条竖排（Wandering Sword 的巨型竖排招式名），正文仍横排。 | 竖排标题要按语种分别设计；英文版要另给横排方案。 | Wandering Sword（steam:1876890）、我自为道（竞技世界）（gameui:11870） |
| 中西文混排：基线对齐与字体回退 | <abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 中文正文里夹数字、英文专名：中文字体与西文字体成套挑选，数字用等宽数字，基线统一。 | 要准备回退字体链；手写 / 像素中文字体常常字符集不全。 | Pentiment（steam:1205520） |

**经验法则**

- 版式按最长语言设计，给文字留约 35% 的宽度余量；定宽素材一律九宫格。
- 每个元素写明溢出规则：缩小（有下限）、换行、或截断 + 可看全文。
- 中日韩正文比拉丁文大一档（约 +2px），小字不用细体；中西文字体成套挑选、基线对齐。
- 大数用当地习惯：中文写「12.4 万」「3.2 亿」，英文写「124K」「320M」；千分位与小数点按语言。
- 中文断行守禁则：句号、逗号、右括号不在行首，左括号、左引号不在行尾（W3C clreq）。
- 竖排只用于标题与侧牌；正文横排。
- 画出来的标题字每个语种单独出图（P-title-lettering）；伪本地化测试在美术定稿前做。

**反例与玩家评价**

- 按钮按中文两个字的宽度画死，英文版文字被截断或挤出框。
  - 评价与证据（依据：推断）：评测无专门分类；Godot 伪本地化文档把截断与写死宽度列为首要检查项。
- 中文正文沿用拉丁文的字号与细体，笔画糊成一片。 例：鬼谷八荒 Tale of Immortal（steam:1468810）。
  - 评价与证据（依据：截图）：去重后鬼谷八荒有 1 条评测说卷轴面板里的文字非常小（未达门槛）；06 文档 B 部分记录像素中文 12px 笔画粘连。
- 书法 / 手写标题只做了一种语言，其它语种回退到系统字体。 例：Cuphead（steam:268910 · 据已知描述）。
  - 评价与证据（依据：文献）：正面参照：Cuphead 本地化时中日韩标题字分别请书法家重写（Xbox Wire 访谈）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：竖排只给标题与侧牌，英文版另给横排方案。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：中文像素字要单独设计字库与字号。
- 默片 / 1930 年代卡通（`fam.silent-film`）：默片：标题字卡按语种重写（Cuphead）。

**出处**

- [W3C, Requirements for Chinese Text Layout（中文排版需求，clreq）](https://www.w3.org/TR/clreq/)（S197）：中文排版的禁则、标点与直排规则。
- [Unicode Standard Annex #14: Unicode Line Breaking Algorithm](https://www.unicode.org/reports/tr14/)（S199）：断行规则的基础。
- [Godot Docs: Pseudolocalization](https://docs.godotengine.org/en/stable/tutorials/i18n/pseudolocalization.html)（S201）：伪本地化在没有译文时就能找出截断与写死的字符串。
- [Xbox Wire: Studio MDHR 谈 Cuphead 本地化](https://news.xbox.com/en-us/2019/04/19/studio-mdhr-interview-cuphead-localization/)（S113）：中日韩标题字分别由书法家重写。
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：字号底线与缩放要求对所有语言都成立。

**可演示的对比**

- **同一背包：中文文本 vs 英文文本（叠 +30% 溢出检查）**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：文案语言：简体中文 → 英文 / 拉丁
  - 看什么：版式完全一样，只换语言：看 B 的页签、按钮、物品名有哪些开始挤出框或被截断，这些就是需要留余量、改成可换行容器的地方。再把 A 的正文和 B 的正文放在同一视距下比较——中文要大一档才同样好读。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-localization-ready#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.inventory` `chk.overflow=plus30`
  - A：`ctx.locale=zh`
  - B：`ctx.locale=en`

  </details>

### 2.7 UI 与美术方向

回答「UI 风格怎么从美术方向推出来」：先定关系（同一媒介 / 统一调色 / 中性 / 刻意对比），再按六个通道逐个决定借不借，按停留时间分配浓度，守住媒介的硬约束；取色取角色、字分两层、标题字是画出来的资产、母题与材质从世界里取样；再问界面在模仿什么载体。这是「同一套信息、换多种风格」的探索方法，也是本库最想避免「只复刻一款游戏」的地方。图标是一套词汇表（P-icon-system）。风格家族以 17 号图谱（17-ui-style-atlas.md）为准。

#### P-harmony-four-relations

**先定 UI 与画面的关系，再挑皮肤：同一媒介 / 统一调色 / 中性 / 刻意对比是四种不同的产品决策**

> 适用品类：动作与 Roguelite、角色扮演、叙事与视觉小说、建造与经营、生活与养成、解谜与侦探、卡牌与桌面 · 相关：[P-channel-borrowing](#p-channel-borrowing)、[P-contrast-with-reason](#p-contrast-with-reason)、[P-neutral-one-voice](#p-neutral-one-voice) · 风格变体：`fam.parchment`、`fam.dark-hairline`、`fam.persona-collage`

**要解决的问题**

不懂美术的开发者最常见的做法是直接挑一个“好看的皮肤”套上去，结果 UI 和画面像两款游戏拼在一起；反过来把 UI 整个画进画风里，又容易字小、看不清、找不到按钮。rel.harmony 的四档本质上是在“画面认同感”和“信息可读性”之间选站位，应该先回答三个问题：画面本身是不是卖点？玩家在 UI 里停留多久？画面的媒介能不能承载小字和细节？

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 同一媒介：UI 用画面同一种画法（纸上手稿、像素、铅笔、牌桌） | <abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=parchment">内芯材质 = 羊皮纸</abbr>；<abbr title="ast.frame=procedural">外框结构 = 程序线框</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeColor=ink">描边色 = 墨色</abbr>；<abbr title="vis.strokeWidth=2">描边粗细 = 2</abbr>；<abbr title="vis.jitter=0.3">手绘抖动 = 0.3</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.display.case=smallCaps">标题大小写 = 小型大写</abbr>；<abbr title="vis.iconStyle=painted">图标风格 = 手绘彩绘</abbr> | 画面就是卖点，节奏慢（解谜、叙事、卡牌、经营），玩家在 UI 里停留时间长，而且世界里本来就有纸、书、牌桌这类载体。 | 整套都要定制素材和字体；字小、对比低的风险最高（规范推论）。评测侧给不出比较：452 张卡里只有 22 张标了 rel.harmony（同一媒介 19、统一调色 3、中性与刻意对比 0），没有可比的「明确非同一媒介」组，原来「同一媒介字太小 16% vs 全库 5%」等比较已撤回。 | Potion Craft: Alchemist Simulator（steam:1210320）、Pentiment（steam:1205520）、Darkest Dungeon（steam:262060）、Chicory: A Colorful Tale（steam:1123450）、Hauntii（steam:2060790） 等 8 款 |
| 统一调色：媒介不同，色板与字共用 | <abbr title="rel.harmony=unified">UI 与画面关系 = 统一调色</abbr>；<abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="ast.core=procedural">内芯结构 = 程序填充</abbr>；<abbr title="vis.opacity=0.6">底不透明度 = 0.6</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr>；<abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 3D 写实或绘画感很强的世界，画面复杂，UI 没法画进世界，但要让人觉得是同一款游戏。适合动作和开放世界。 | 认同感只靠颜色和字，辨识度中等。场景色变化大时（昼夜、生物群系）色板要联动，否则强调色在某些场景里会被画面吞掉。 | SUMMERHOUSE（steam:2533960）、Spiritfarer（steam:972660）、Black Myth: Wukong（steam:2358720）、Thronefall（steam:2239150）、Beat Saber（steam:620980） 等 6 款 |
| 中性：通用、克制，把舞台让给画面和信息 | <abbr title="rel.harmony=neutral">UI 与画面关系 = 中性</abbr>；<abbr title="col.source=skin">UI 取色来源 = 皮肤固定色</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="vis.opacity=0.75">底不透明度 = 0.75</abbr>；<abbr title="vis.fill=gradient">程序填充 = 渐变</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="vis.strokeColor=metal">描边色 = 金属金 / 铜</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr> | 信息极密（经营、大战略、MMO）、画面多变（多章节、多生物群系、多时代），或者要长期更新运营的游戏。 | 容易“像 App、像后台”，必须留一个通道（标题字或一个强调色）撑住身份，见 P-neutral-one-voice。 | ELDEN RING（steam:1245620）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、Songs of Syx（steam:1162750）、Stellaris（steam:281990）、Factorio（steam:427520） 等 6 款 |
| 刻意对比：UI 是另一层语言（平面拼贴、瑞士网格、设备界面） | <abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr>；<abbr title="col.source=uiPalette">UI 取色来源 = 独立控件色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="vis.skew=-8">倾斜角 = -8</abbr>；<abbr title="vis.edge=ornate">边缘处理 = 异形轮廓</abbr>；<abbr title="typ.display.family=ransom">标题字族 = 拼贴勒索信</abbr>；<abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr> | UI 本身就是作品的表达（菜单驱动的 JRPG、风格化动作），或者世界观给了“另一层界面”的理由（设备、系统、元叙事）。 | 设计门槛最高。动画一重就会被嫌慢（DEATHLOOP 有 3 条“UI 卡顿”）；没有叙事理由的反差会被看成贴皮，见 P-contrast-with-reason。 | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、CONTROL（steam:870780）、I Was a Teenage Exocolonist（steam:1148760）、Cyberpunk 2077（steam:1091500） 等 6 款 |

**经验法则**

- 先回答三个问题。美术是不是卖点？（评测里提到美术的比例超过约 25%，就算是。）玩家每局有多少时间在 UI 里？画面的媒介能不能承载 14px 以下的字？
- 按答案选档：是卖点、停留长、媒介撑得住小字 → 同一媒介；是卖点但画面复杂 → 统一调色；信息极密或画面多变 → 中性；UI 自己要表达 → 刻意对比。
- rel.harmony 只是全局默认，各屏可以不同档。常见组合是 HUD 统一调色、菜单同一媒介（见 P-dwell-time-budget）。
- 同一媒介能让画面被记住，但读不清的代价要用 P-type-two-tier 和 P-medium-constraints 补回来。（评测侧的「提到美术比例更高」只在标了同一媒介的 19 款与全库之间比较过，没有对照组，样本不足以下结论。）
- UI 长得越像世界，越会被看成世界的一部分（相似律），可交互的东西也越难被认出来。同一媒介的按钮要额外加“能点”的提示（焦点框、按下反馈）。
- 探索台里选好美术配方后，fromArt 表已经给出三档默认皮肤（sameMedium / neutral / contrast）。三档都并排看一遍再定，别只看第一档。

**反例与玩家评价**

- 没决定关系就套皮肤：在写实或水墨的世界上直接套扁平 / Material 或手游金框，看起来像两款游戏拼在一起。
  - 评价与证据（依据：文献）：评测关键词里没有“风格不搭”这一类，无法计数。GameUI 高赞作品的评论里反复批评“材质与世界观不符”“风格混搭没有主次”，被夸的则是角色、场景、UI 高度统一（08 文档 2.4，意译）。
- 为了同一媒介牺牲可读性：手写体、书法和纸纹一路压到正文和数字上。 例：Hyper Light Drifter（steam:257850）、Pentiment（steam:1205520）、Return of the Obra Dinn（steam:653530）。
  - 评价与证据（依据：截图）：看图：Hyper Light Drifter 的像素小字、Pentiment 的手抄体正文、Obra Dinn 的 1 位色衬线。评测证据不足：三款原来的「字太小」命中复核后都不是在说文字，「同一媒介 16% vs 全库 5%」的比较也因为没有对照组而撤回。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：同一媒介：羊皮纸世界配羊皮纸界面（Potion Craft）。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：中性：写实暗调世界配深色细线界面，UI 只是退后。
- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：刻意对比：UI 是另一层拼贴语言，和画面在形状上反差、在颜色上呼应。

**出处**

- [Nielsen Norman Group: The Aesthetic-Usability Effect](https://www.nngroup.com/articles/aesthetic-usability-effect/)（S156）：好看的界面会被认为更好用，用户也更能容忍小毛病，但掩盖不了严重的可用性问题。同一媒介换来的好感抵消不了读不清。
- [Laws of UX: Law of Similarity](https://lawsofux.com/law-of-similarity/)（S145）：外观相似的元素会被看成一组。UI 与画面越像，越容易被看成世界的一部分，可交互元素就需要和普通内容有明显区别。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：早期 UI 动画过多，遮住了画面上发生的事。团队削减动画、调整文字方向，在可用性和风格之间找平衡。即便是刻意对比的 UI，也要让位给信息。

**可演示的对比**

- **同一媒介 vs 中性（换两种美术配方各看一遍）**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线）；美术配方依次切换：水彩绘本（watercolor） → 素描排线（物体空间）（pencil-hatch） → 写实柔光（soft-pbr））
  - 承载原则的参数：UI 与画面关系：同一媒介 → 中性；UI 取色来源：取自场景色板 → 皮肤固定色；内芯结构：材质平铺 → 程序填充；标题字族：手写 → 无衬线
  - 配套改动：描边色：墨色 → 金属金 / 铜；描边粗细：2 → 1；手绘抖动：0.3 → 自动；图标风格：手绘彩绘 → 线性；面板明度：中明度 → 深色面板；底不透明度：1 → 0.75
  - 看什么：先配一个手绘类美术配方（watercolor 或 pencil-hatch）：A 的卡面和面板像画里的纸，B 像浮在画面上的工具窗。再换成写实柔光（soft-pbr）：A 反而突兀，B 更稳。同一档关系并不对所有画风都成立，所以先定关系，再定皮肤。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-harmony-four-relations#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `cnt.screen=screen.cards` `ast.coreMat=paper` `ast.frame=procedural` `vis.stroke=solid`
  - A：`rel.harmony=sameMedium` `col.source=scene` `ast.core=texture` `vis.strokeColor=ink` `vis.strokeWidth=2` `vis.jitter=0.3` `typ.display.family=handwritten` `vis.iconStyle=painted` `col.lightness=mid` `vis.opacity=1`
  - B：`rel.harmony=neutral` `col.source=skin` `ast.core=procedural` `col.lightness=dark` `vis.opacity=0.75` `vis.strokeWidth=1` `vis.strokeColor=metal` `typ.display.family=sans` `vis.iconStyle=line` `vis.jitter=auto`

  </details>
- **单变量版：同一媒介 → 只切换 rel.harmony、col.source、ast.core、typ.display.family**（单变量对照；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线）；美术配方依次切换：水彩绘本（watercolor） → 素描排线（物体空间）（pencil-hatch） → 写实柔光（soft-pbr））
  - 承载原则的参数：UI 与画面关系：同一媒介 → 中性；UI 取色来源：取自场景色板 → 皮肤固定色；内芯结构：材质平铺 → 程序填充；标题字族：手写 → 无衬线
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-harmony-four-relations#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `cnt.screen=screen.cards` `ast.coreMat=paper` `ast.frame=procedural` `vis.stroke=solid` `vis.strokeColor=ink` `vis.strokeWidth=2` `vis.jitter=0.3` `vis.iconStyle=painted` `col.lightness=mid` `vis.opacity=1`
  - A：`rel.harmony=sameMedium` `col.source=scene` `ast.core=texture` `typ.display.family=handwritten`
  - B：`rel.harmony=neutral` `col.source=skin` `ast.core=procedural` `typ.display.family=sans`

  </details>

#### P-channel-borrowing

**把美术方向拆成六个通道（材质、线、色、字、饰、动），逐个决定借不借——“跟随画面”不是一个开关**

> 适用品类：探索与冒险、动作与 Roguelite、角色扮演、叙事与视觉小说、建造与经营、卡牌与桌面 · 相关：[P-harmony-four-relations](#p-harmony-four-relations)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-motion-personality](#p-motion-personality) · 风格变体：`fam.filigree`、`fam.ink`、`fam.woodcut-print`

**要解决的问题**

“UI 跟随画面”常被理解成要么全像、要么不像。参考库里做得好的作品几乎都是挑着通道借：Hollow Knight 的菜单借线（白色线描卷草）、地图借纸（羊皮纸手绘）；Black Myth 借了字（书法）和母题（云纹），HUD 本体是中性细线；SUMMERHOUSE、Thronefall 主要借色（淡色小图标、限色画面）；Darkest Dungeon 六个通道全借。逐个通道决定，才能在认同感和可读性之间精细调节，一种画风也就能衍生出好几种 UI 风格，这正是探索风格最快的办法。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 全通道：材质、线、色、字、饰、动一起借 | <abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="ast.frame=carvedNinePatch">外框结构 = 雕花九宫格</abbr>；<abbr title="ast.frameMat=stone">外框材质 = 石</abbr>；<abbr title="vis.edge=torn">边缘处理 = 撕边 / 破边</abbr>；<abbr title="vis.motif=skulls">装饰母题 = 骷髅 / 哥特</abbr>；<abbr title="vis.ornament=3">装饰预算 = 华丽</abbr>；<abbr title="typ.display.family=gothic">标题字族 = 哥特黑体</abbr>；<abbr title="mo.enter=inkSpread">入场动效 = 墨晕 / 笔刷擦出</abbr> | 回合制或慢节奏、UI 占屏大的作品（整条底座、整屏书本）。 | 素材量最大（九宫格框、母题、字体、动效），任何一个通道走样都会显得廉价。 | Darkest Dungeon（steam:262060）、Potion Craft: Alchemist Simulator（steam:1210320）、Inkulinati（steam:957960）、RPG Time: The Legend of Wright（steam:1839510）、Pentiment（steam:1205520） |
| 只借线和字（线描花饰） | <abbr title="rel.harmony=unified">UI 与画面关系 = 统一调色</abbr>；<abbr title="vis.opacity=0">底不透明度 = 0</abbr>；<abbr title="ast.frame=cornersOnly">外框结构 = 只有四角件</abbr>；<abbr title="ast.frameMat=lineArt">外框材质 = 线描 / 平涂</abbr>；<abbr title="vis.motif=floral">装饰母题 = 花叶卷草</abbr>；<abbr title="vis.ornament=1">装饰预算 = 少</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.display.case=smallCaps">标题大小写 = 小型大写</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 手绘墨线、新艺术、美好年代风的世界：HUD 要轻，又要有气质。 | 没有底板时，可读性全靠投影；细线在低分辨率和电视远看时会发虚。 | Hollow Knight（steam:367520）、Clair Obscur: Expedition 33（steam:1903340）、Hogwarts Legacy（steam:990080 · 据已知描述）、Lies of P（steam:1627720 · 据已知描述） |
| 只借色（限色、双色调、霓虹几何） | <abbr title="rel.harmony=unified">UI 与画面关系 = 统一调色</abbr>；<abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr>；<abbr title="vis.motif=none">装饰母题 = 无</abbr>；<abbr title="typ.display.family=same">标题字族 = 同正文</abbr>；<abbr title="vis.iconStyle=line">图标风格 = 线性</abbr> | 以颜色为核心的画风：限色、双色调、低多边形加强色。 | 形状语言得自己设计；颜色太少时，语义色（危险、敌我）没地方放，只能靠形状补。 | SUMMERHOUSE（steam:2533960）、Thronefall（steam:2239150）、Beat Saber（steam:620980）、Just Shapes & Beats（steam:531510）、The Artful Escape（steam:1122680） |
| 只借字和母题（文化题材鲜明的写实世界） | <abbr title="rel.harmony=unified">UI 与画面关系 = 统一调色</abbr>；<abbr title="vis.opacity=0">底不透明度 = 0</abbr>；<abbr title="vis.stroke=none">描边线型 = 无描边</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr>；<abbr title="typ.titleFx=drybrush">标题字特效 = 墨飞白</abbr>；<abbr title="vis.motif=cloud">装饰母题 = 祥云 / 回纹</abbr>；<abbr title="vis.ornament=1">装饰预算 = 少</abbr>；<abbr title="ast.fx=ink">叠加特效层 = 墨晕 / 墨烟</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 写实 3D，但题材文化特征鲜明（东方、西部、北欧）。 | 中文书法要做成图片素材（M11），只能用在标题上；正文另配易读字体，见 P-type-two-tier。 | Black Myth: Wukong（steam:2358720）、Wandering Sword（steam:1876890）、逆水寒手游（网易）（gameui:9375）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） |
| 只借材质，HUD 保持中性（菜单借世界的主材料） | <abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr>；<abbr title="ast.frameMat=wood">外框材质 = 木</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=parchment">内芯材质 = 羊皮纸</abbr>；<abbr title="vis.iconStyle=painted">图标风格 = 手绘彩绘</abbr>；<abbr title="typ.titleFx=outline">标题字特效 = 描边</abbr> | 世界里有一种显眼的主材料（木、石、冰、金属）：塔防、种田、中世纪经营。 | 高分辨率下材质贴图要出多倍素材；纹理底上的文字要单独垫底。 | Kingdom Rush  - Tower Defense（steam:246420）、Stardew Valley（steam:413150）、Bear and Breakfast（steam:1136370）、Shogun Showdown（steam:2084000）、Frostpunk（steam:323190） |

**经验法则**

- 六个通道各对应一组参数。材质：ast.coreMat / ast.frameMat / ast.container。线：vis.stroke / vis.strokeWidth / vis.jitter / vis.edge。色：col.source / col.strategy / col.saturation。字：typ.display.family / typ.titleFx。饰：vis.motif / vis.ornament / ast.ornaments。动：mo.enter / mo.frameRate / mo.easing。
- HUD 最多借 2–3 个通道，优先借色、字、线；菜单可以借到 5–6 个。
- 字和色最便宜（不用素材），材质和饰最贵（要九宫格和母题素材）。预算紧时先借前两个。
- 每个通道只能有一个来源。比如线已经跟着画面线宽走了（D-outline），就别再叠一套别的风格的描边。
- 同一个美术配方做 3–4 种借法并排比较，是探索 UI 风格最快的方式。建议在探索台里做成一个“通道开关”视图。

**反例与玩家评价**

- 六个通道各借一点，彼此又不统一：木框配科幻发光字配卡通图标，像素材店拼盘。
  - 评价与证据（依据：文献）：评测里无法计数。GameUI 社区评论反复批评“风格混搭没有主次”，有设计师建议按比例定主次风格（例如 70 / 20 / 10）（08 文档 2.4，意译）。
- “饰”这个通道借得太满，压过了信息。 例：Hades II（steam:1145350）、Cult of the Lamb（steam:1313140）、Total War: WARHAMMER II（steam:594570）。
  - 评价与证据（依据：截图）：看图：Hades II 的雕花框、Cult of the Lamb 的塔罗卡框都压在战斗画面四周。评测证据不足：原来「重装饰雕花框 7 款每款 0.86 条太乱」按旧家族表计算，且「太乱」命中复核后几乎都在说场景或特效（Hades II 4 条、Cult of the Lamb 2 条均非 HUD），已撤回。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 线描花饰（`fam.filigree`，皮肤 `skin.filigree`）：只借线：白色线描卷草（Hollow Knight 的菜单）。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：只借字与母题：书法标题 + 云纹，HUD 本体中性（Black Myth）。
- 版画：木刻 / 铜版 / 双色套印（`fam.woodcut-print`）：全通道：木刻线、套色、纸纹、版画字一起借。
- 17 号图谱反查到的相关家族：`fam.filigree`、`fam.handmade-craft`

**出处**

- [SEGAbits 转述 Famitsu 访谈：Persona 5 美术与 UI 负责人](https://segabits.com/?p=54918)（S098）：UI 设计师说界面颜色是他最费力的部分：每一作都先看游戏主色（P3 青、P4 黄、P5 红）再定界面色，字色试过多种后定为黑白。这是只借“色”这个通道的典型。
- [Lettermatic: Custom Fonts for Pentiment](https://lettermatic.com/custom/pentiment)（S092）：五套字体按 16 世纪巴伐利亚的手稿和早期印刷体研究重画，很多字形用当年的书写工具手工上墨，刻意保留墨洇和笔画不均。这是“字”这个通道借到极致的例子。
- [Yacht Club Games: Breaking the NES](https://www.yachtclubgames.com/blog/breaking-the-nes/)（S114）：Shovel Knight 保留了 NES 的观感（色板、顶部状态栏），但去掉了闪烁等伤害体验的限制。借媒介时可以只借观感，不借毛病。

**可演示的对比**

- **六个通道全借 vs 只借场景色**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线）；美术配方依次切换：版画木刻（woodcut） → 钢笔墨稿（pen-crosshatch））
  - 承载原则的参数：外框结构：雕花九宫格 → 程序线框；装饰母题：骷髅 / 哥特 → 无；标题字族：哥特黑体 → 同正文；边缘处理：撕边 / 破边 → 干净
  - 配套改动：UI 与画面关系：同一媒介 → 统一调色；装饰预算：华丽 → 无；骨架色彩策略：单色 → 双色调
  - 看什么：同一个回合制 RPG 底座，A 六个通道全借（石框、撕边、骷髅母题、哥特标题），B 只借场景色。用版画木刻（woodcut）或钢笔墨稿（pen-crosshatch）配方看：A 和画面是一体的，B 干净但“谁家的游戏都行”。然后在 B 上一次只打开一个通道（先字、再线、再饰），看哪一个通道带来的认同感最多、成本最低。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-channel-borrowing#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `lay.hudOrg=console` `col.source=scene` `ast.frameMat=stone` `vis.stroke=solid` `vis.strokeWidth=1`
  - A：`rel.harmony=sameMedium` `ast.frame=carvedNinePatch` `vis.edge=torn` `vis.motif=skulls` `vis.ornament=3` `typ.display.family=gothic` `col.strategy=mono`
  - B：`rel.harmony=unified` `col.strategy=duotone` `ast.frame=procedural` `vis.ornament=0` `vis.motif=none` `typ.display.family=same` `vis.edge=clean`

  </details>
- **单变量版：六个通道全借 → 只切换 ast.frame、vis.motif、typ.display.family、vis.edge**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线）；美术配方依次切换：版画木刻（woodcut） → 钢笔墨稿（pen-crosshatch））
  - 承载原则的参数：外框结构：雕花九宫格 → 程序线框；装饰母题：骷髅 / 哥特 → 无；标题字族：哥特黑体 → 同正文；边缘处理：撕边 / 破边 → 干净
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-channel-borrowing#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `lay.hudOrg=console` `col.source=scene` `ast.frameMat=stone` `vis.stroke=solid` `vis.strokeWidth=1` `rel.harmony=sameMedium` `vis.ornament=3` `col.strategy=mono`
  - A：`ast.frame=carvedNinePatch` `vis.motif=skulls` `typ.display.family=gothic` `vis.edge=torn`
  - B：`ast.frame=procedural` `vis.motif=none` `typ.display.family=same` `vis.edge=clean`

  </details>

#### P-dwell-time-budget

**风格浓度按停留时间分配：HUD 借最少，停下来看的界面借最多**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、角色扮演、策略与战术 · 相关：[P-squint-test](#p-squint-test)、[P-channel-borrowing](#p-channel-borrowing)、[P-transition-frequency](#p-transition-frequency) · 风格变体：`fam.ornate-frame`、`fam.ink`、`fam.candy`

**要解决的问题**

同一套风格放在 HUD 和放在菜单上，代价完全不同。HUD 叠在实时画面上、每秒都要扫一眼，装饰和材质直接变成噪声；菜单、标题、图鉴、读取页是玩家停下来看的，恰恰是风格最能被欣赏的地方。GameUI 只取非商业化界面、每种各抽 100 张截图：带材质标签的战斗界面 1 张、菜单 22 张、建造 / 家园 9 张、登录 6 张（站方标签稀疏且约 18% 误标，只看相对趋势；商城、奖励、首充等商业化界面不计）。在 Interface In Game 上浏览的 Hades、Hollow Knight、Elden Ring、Clair Obscur，局内都只有几条细条和图标，装饰全留给了菜单。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| HUD 极轻：同字族、同强调色，去底板、去饰件 | <abbr title="cnt.screen=screen.hud">界面类型 = 局内 HUD</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="vis.opacity=0">底不透明度 = 0</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr>；<abbr title="cmp.gauge@el.vitals=thinBar">数值图形（生命 / 护盾 / 体力） = 细条</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr> | 实时动作、探索、平台跳跃：风格留给画面和菜单。 | HUD 太轻时在亮场景里会读不清（规范推论，评测里没有可靠计数）；菜单要有足够分量才撑得起整套风格。 | Hades（steam:1145360）、Hollow Knight（steam:367520）、ELDEN RING（steam:1245620）、Clair Obscur: Expedition 33（steam:1903340）、Black Myth: Wukong（steam:2358720） |
| 同一套皮肤的菜单端：雕花外框、标牌、侧图全上 | <abbr title="cnt.screen=screen.character">界面类型 = 角色 / 装备 / 属性</abbr>；<abbr title="ast.frame=carvedNinePatch">外框结构 = 雕花九宫格</abbr>；<abbr title="ast.frameMat=bronze">外框材质 = 青铜</abbr>；<abbr title="vis.ornament=3">装饰预算 = 华丽</abbr>；<abbr title="vis.motif=skulls">装饰母题 = 骷髅 / 哥特</abbr>；<abbr title="cmp.plate=plaque">标牌 = 铭牌 / 匾额</abbr>；<abbr title="cmp.panelArt=side">面板插画槽 = 侧图</abbr>；<abbr title="typ.display.family=artNouveau">标题字族 = 新艺术 / 美好年代</abbr> | 天赋、护符、收藏、图鉴这类低频、停下来细看的界面。 | 外框素材贵；菜单的点击路径要短，否则华丽变成负担（「菜单难用」是去重后全库第二常见的抱怨，19 款 ≥ 2 条）。 | Hades（steam:1145360）、Hollow Knight（steam:367520）、Clair Obscur: Expedition 33（steam:1903340）、Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）、Slay The Spire（iig:slay-the-spire） |
| HUD 做成和玩法区分开的底座，可以用菜单级装饰 | <abbr title="cnt.screen=screen.hud">界面类型 = 局内 HUD</abbr>；<abbr title="lay.hudOrg=console">HUD 组织方式 = 整合底座</abbr>；<abbr title="ast.frame=carvedNinePatch">外框结构 = 雕花九宫格</abbr>；<abbr title="ast.frameMat=stone">外框材质 = 石</abbr>；<abbr title="vis.ornament=2">装饰预算 = 中</abbr>；<abbr title="lay.playfield=full">玩法区形态 = 全屏</abbr> | 回合制或可暂停的 RPG、战略：底座占下半屏，不压在动作画面上。 | 屏占比大，压到画面的风险最高（设计推论；原来「暗金金属牌 6 款每款 1.17 条太乱」按旧家族表与未复核的关键词计算，已撤回）。 | Darkest Dungeon（steam:262060）、Total War: WARHAMMER II（steam:594570）、Sol Cesto（steam:2738490）、Diablo IV（steam:2344520 · 据已知描述）、Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 全程一致的极简：画面本身就是装饰 | <abbr title="vis.ornament=0">装饰预算 = 无</abbr>；<abbr title="vis.motif=none">装饰母题 = 无</abbr>；<abbr title="ast.bgArt=solid">替换背景 = 纯色 / 黑场</abbr>；<abbr title="col.lightness=light">面板明度 = 浅色面板</abbr>；<abbr title="typ.display.family=same">标题字族 = 同正文</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 画面本身极简（白模、低多边形、平涂地图）。 | 菜单缺少记忆点，身份全靠画面本身。 | Mini Metro（steam:287980）、Bad North（steam:688420）、Dorfromantik（steam:1455840）、ISLANDERS（steam:1046030）、Tiny Glade（steam:2198150） |

**经验法则**

- 按停留时间分三档。实时 HUD（不到 1 秒的一瞥）：装饰预算 0–1，只借色、字、线。高频菜单（背包、地图，每局几十次）：预算 1–2，材质用在外框，不用在格子底。低频界面（标题、章节卡、图鉴、结算）：预算 2–3，场景容器、插画、标题字全上。
- 资产型 UI 的价值主要在停下来看的界面。M11 生成素材时，优先给菜单、标题和图鉴出图，HUD 不出。
- 例外：回合制或可暂停游戏把 HUD 做成和玩法区分开的底座时，可以用菜单级装饰，因为它不压在画面上。
- 同一套皮肤要给 HUD 一个“减配版”：字族、强调色、转角都一样，但底不透明度为 0、去掉饰件。
- 高频界面入场动效不超过 0.25 秒，并且可以跳过；华丽演出只留给低频节点。

**反例与玩家评价**

- HUD 用和菜单一样的雕花框、金属牌，压在实时画面上。 例：Hades II（steam:1145350）、Cult of the Lamb（steam:1313140）、Total War: WARHAMMER II（steam:594570）、Diablo IV（steam:2344520 · 据已知描述）。
  - 评价与证据（依据：截图）：看图：Hades II、Cult of the Lamb 局内都带雕花或卡框，Total War: WARHAMMER II 与 Diablo IV 的底座 / 技能栏是金属牌。评测证据不足：「两个家族 13 款里 38% 太乱」按旧家族表计算，且「太乱」命中人工复核后在这些作品里都不是在说 HUD，已撤回。
- 把奖励、标题那种演出级动效用在高频菜单上，每次打开都要看一遍动画。 例：Cyberpunk 2077（steam:1091500）、Yi Xian: The Cultivation Card Game（steam:1948800）、DEATHLOOP（steam:1252330 · 据已知描述）。
  - 评价与证据（依据：评测）：「UI 卡顿 / 响应慢」去重后 ≥ 2 条的只有 DEATHLOOP、Cyberpunk 2077 两款，都是风格化很重的界面；弈仙牌 1 条。Persona 5 开发期也削减过遮挡画面的动画（维基）。证据很弱。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 重装饰雕花框（`fam.ornate-frame`，皮肤 `skin.ornate`）：雕花框：HUD 只留内芯，雕花外框全部给天赋、护符、收藏页。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：局内只有细线与小字，书法与水墨画留给标题与读取页。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：局内圆钮扁平，奖励与结算页才上立体糖果字。
- 17 号图谱反查到的相关家族：`fam.dark-hairline`、`fam.ornate-frame`、`fam.skeuo`、`fam.memphis`、`fam.aero`、`fam.y2k`、`fam.neobrutal`、`fam.art-nouveau`、`fam.stained-glass`、`fam.ceramic-lacquer`

**出处**

- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：团战时视觉噪声累积得很快。要保住层级、把噪声压到最低，一个元素得到的注意力应当与它的重要程度相当。HUD 装饰就是不重要却占注意力的噪声。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：早期版本 UI 动画过于激进、遮住了画面，后来减弱动画以平衡可用性与风格。高频界面的演出要克制。

**可演示的对比**

- **菜单级装饰压在 HUD 上 vs 同字族的减配 HUD**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：装饰预算：华丽 → 无；外框结构：雕花九宫格 → 程序线框；底不透明度：1 → 0；HUD 显隐策略：常驻 → 情境显现
  - 配套改动：装饰母题：骷髅 / 哥特 → 无；数值图形（生命 / 护盾 / 体力）：自动 → 细条；文字可读辅助：自动 → 投影；描边线型：实线 → 无描边
  - 看什么：打开“眯眼检查”和“UI 屏占比读数”：A 模糊之后最显眼的是青铜框和骷髅，不是血量与技能；B 的标题字族一样，一眼还能认出是同一款游戏，但屏占比和噪声都低得多。再把 A 的参数切到 cnt.screen = screen.character，同一套装饰放在停下来看的界面里，就变成了优点。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-dwell-time-budget#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `ast.frameMat=bronze` `typ.display.family=artNouveau`
  - A：`vis.opacity=1` `vis.ornament=3` `ast.frame=carvedNinePatch` `vis.motif=skulls` `rel.hudVisibility=always` `cmp.gauge@el.vitals=auto` `typ.legibility=auto` `vis.stroke=solid`
  - B：`vis.opacity=0` `vis.ornament=0` `ast.frame=procedural` `vis.stroke=none` `typ.legibility=shadow` `rel.hudVisibility=contextual` `cmp.gauge@el.vitals=thinBar` `vis.motif=none`

  </details>
- **单变量版：菜单级装饰压在 HUD 上 → 只切换 vis.ornament、ast.frame、vis.opacity、rel.hudVisibility**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：装饰预算：华丽 → 无；外框结构：雕花九宫格 → 程序线框；底不透明度：1 → 0；HUD 显隐策略：常驻 → 情境显现
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-dwell-time-budget#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `ast.frameMat=bronze` `typ.display.family=artNouveau` `vis.motif=skulls` `cmp.gauge@el.vitals=auto` `typ.legibility=auto` `vis.stroke=solid`
  - A：`vis.ornament=3` `ast.frame=carvedNinePatch` `vis.opacity=1` `rel.hudVisibility=always`
  - B：`vis.ornament=0` `ast.frame=procedural` `vis.opacity=0` `rel.hudVisibility=contextual`

  </details>

#### P-medium-constraints

**同一媒介要守媒介的硬约束：像素网格、线宽、明暗模型、帧率对齐；做不到，就用画框把两种精度隔开**

> 适用品类：动作与 Roguelite、横版平台、建造与经营、生活与养成、恐怖与悬疑、解谜与侦探、卡牌与桌面 · 相关：[P-world-legibility-guard](#p-world-legibility-guard)、[P-motion-personality](#p-motion-personality)、[P-medium-simulation](#p-medium-simulation) · 风格变体：`fam.pixel`、`fam.one-bit-dither`、`fam.woodcut-print`

**要解决的问题**

UI 想像画面，却只换了颜色：画面是 3 倍像素而 UI 是平滑矢量字，画面一拍二而 UI 动画是 60 帧丝滑，画面是粗黑描边而 UI 是发丝线。这些细小的错位会让 UI 看起来是“贴上去的”。反过来，也有作品故意让 UI 比画面精度高（了不起的修仙模拟器、Little Goody Two Shoes），但它们都把高精度 UI 放在画框或边栏里，不和像素玩法区重叠。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 与世界同网格（像素 / 体素 / 低清三维） | <abbr title="vis.pixelScale=world">UI 像素化 = 与世界同网格</abbr>；<abbr title="vis.corner=step">转角 = 像素台阶</abbr>；<abbr title="typ.body.family=pixel">正文字族 = 像素</abbr>；<abbr title="typ.display.family=pixel">标题字族 = 像素标题</abbr>；<abbr title="typ.numerals.family=pixel">数字字体 = 像素数字</abbr>；<abbr title="mo.frameRate=onTwos">UI 动画帧率 = 一拍二（12fps）</abbr>；<abbr title="vis.iconStyle=pixel">图标风格 = 像素</abbr>；<abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr>；<abbr title="ast.frameMat=wood">外框材质 = 木</abbr> | 像素、体素、低清三维画面（D-pixel）。 | 中文像素字在小字号下笔画粘连，布局受整数缩放约束。对齐网格本身并不更难读（评测侧没有可靠的字号计数可比较）。 | Stardew Valley（steam:413150）、Hyper Light Drifter（steam:257850）、Dead Cells（steam:588650）、Loop Hero（steam:1282730）、Luck be a Landlord（steam:1404850） 等 6 款 |
| 线宽与明暗模型对齐（赛璐璐、漫画、粗描边卡通） | <abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=3">描边粗细 = 3</abbr>；<abbr title="vis.strokeColor=ink">描边色 = 墨色</abbr>；<abbr title="vis.depth=hardDrop">立体与阴影 = 错位硬投影</abbr>；<abbr title="vis.pattern=halftone">图案叠层 = 网点</abbr>；<abbr title="vis.patternOpacity=0.2">图案强度 = 0.2</abbr>；<abbr title="typ.display.family=graffiti">标题字族 = 涂鸦</abbr>；<abbr title="typ.titleFx=outline">标题字特效 = 描边</abbr> | 画面有描边、色阶硬阴影（D-outline、D-toon）。 | 粗边占屏，HUD 元素数量要更少；网点要避开文字底。 | Hi-Fi RUSH（steam:1817230）、Castle Crashers（steam:204360）、TOEM（steam:1307580）、OMORI（steam:1150690）、Borderlands 2（steam:49520 · 据已知描述） |
| 帧率与手绘抖动对齐（定格、橡皮管动画、线条沸腾） | <abbr title="mo.frameRate=onThrees">UI 动画帧率 = 一拍三（8fps）</abbr>；<abbr title="vis.jitter=0.4">手绘抖动 = 0.4</abbr>；<abbr title="vis.edge=brush">边缘处理 = 笔触</abbr>；<abbr title="mo.easing=linear">缓动性格 = 线性</abbr>；<abbr title="mo.enter=cut">入场动效 = 硬切</abbr>；<abbr title="mo.valueChange=segment">数值变化 = 分段跳</abbr> | 画面一拍二 / 一拍三，或者线条在抖（D-frame、D-boil）。 | 阶跃动画让数值变化不连续，血量这类关键数值的变化要额外给数字或闪烁冗余。 | Stilstand（steam:1282320）、Inkulinati（steam:957960）、Cuphead（steam:268910 · 据已知描述）、Don't Starve（steam:219740 · 据已知描述） |
| 精度隔离：高精度 UI 放进玩法区外的画框 | <abbr title="lay.hudOrg=inMargin">HUD 组织方式 = 画在玩法区外的边框里</abbr>；<abbr title="lay.playfield=boxed">玩法区形态 = 4:3 / 小窗加黑边</abbr>；<abbr title="vis.pixelScale=off">UI 像素化 = 清晰矢量</abbr>；<abbr title="ast.frame=carvedNinePatch">外框结构 = 雕花九宫格</abbr>；<abbr title="ast.frameMat=wood">外框材质 = 木</abbr>；<abbr title="vis.ornament=2">装饰预算 = 中</abbr> | 想要像素玩法，又想要高精度的插画、书法或雕花 UI。 | 玩法区变小；超宽屏要设计两侧装饰区（D-aspect）。 | Amazing Cultivation Simulator（steam:955900）、Little Goody Two Shoes（steam:1812370）、Sol Cesto（steam:2738490）、RPG Time: The Legend of Wright（steam:1839510）、dotAGE（steam:638510） |
| 屏幕滤镜（CRT / 胶片）只让大字和边框跟随 | <abbr title="rel.followPost=warp">UI 受画面后处理影响 = 跟随弯曲 / 畸变</abbr>；<abbr title="ast.fx=scanlines">叠加特效层 = 扫描线</abbr>；<abbr title="typ.display.family=pixel">标题字族 = 像素标题</abbr>；<abbr title="typ.legibility=outline">文字可读辅助 = 文字描边</abbr> | CRT、VHS、老电视本身是世界观的一部分。 | 弯曲和扫描线会降低小字可读性。D-crt 默认屏幕叠加的 UI 保持清晰，只让标题、边框和叙事内的屏幕跟着弯。 | Balatro（steam:2379780）、绝区零（米哈游）（gameui:13081）、Progressbar95（steam:1304550）、Crow Country（steam:1996010） |

**经验法则**

- 画面像素化大于 1 时，UI 默认与世界同网格，用像素字和阶梯转角（D-pixel）。想用高精度 UI，就用 lay.hudOrg = inMargin 把它放到玩法区外，不要和像素玩法区重叠。
- UI 描边粗细约等于画面线宽（D-outline）。画面是卡通硬阴影，UI 就用错位硬投影；画面是柔和漫反射，就用柔投影（D-toon）。
- 画面一拍二或一拍三，UI 动画用同样的帧率（D-frame），但关键数值的变化要另给数字或闪烁冗余。
- CRT、胶片、纸纹这类后处理，默认只作用于叙事内 UI 和大字；HUD 小字保持清晰（rel.followPost = crisp）。
- 守媒介不是做年代考据：守住“看起来对”的约束，去掉“玩起来痛”的约束。

**反例与玩家评价**

- 混像素（mixels）：像素画面上放非整数缩放的像素 UI，或者把像素字和平滑矢量字混在同一块面板里。
  - 评价与证据（依据：文献）：评测关键词里没有这一类，无法计数。06 文档 B6 把“统一同屏像素密度”列为像素 UI 的首要陷阱。
- 为了守媒介，把伤害操作的年代限制也一起守下来（闪烁、极少颜色、超小字）。
  - 评价与证据（依据：推断）：无计数。Shovel Knight 开发者说明，他们保留 NES 观感，但去掉了闪烁等伤害体验的限制（Yacht Club 博客）。Obra Dinn 在 1 位色里也把可读性放在第一位。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：UI 与世界同一像素网格，动效一拍二跳格。
- 1-bit 抖动 / 经典 Mac（`fam.one-bit-dither`）：1-bit 抖动：只有两种颜色，层级靠抖动密度与反白。
- 版画：木刻 / 铜版 / 双色套印（`fam.woodcut-print`）：版画：线条粗细与留白由刀法决定，小字要单独设计。
- 17 号图谱反查到的相关家族：`fam.ornate-frame`、`fam.pixel-wood`、`fam.woodcut-print`、`fam.handmade-craft`、`fam.vector-display`、`fam.pixel`、`fam.terminal-grid`、`fam.one-bit-dither`、`fam.boomer-bar`、`fam.mono-line`

**出处**

- [Yacht Club Games: Breaking the NES](https://www.yachtclubgames.com/blog/breaking-the-nes/)（S114）：保留 NES 的纵向分辨率、色板和状态栏习惯，只补了几种“作弊色”，去掉闪烁这类伤害玩法的限制，把限制当成“画面别太乱”的设计指引。
- [PlayStation Blog: Lucas Pope on Return of the Obra Dinn's art style](https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style)（S110）：做 1 位色画面时，作者把可读性放在最高优先级：几何描边、尽量少用抖动。哪怕是最极端的媒介，可读性仍然排第一。
- [GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)（S044）：用 3D 冒充 2D 手绘时刻意抽帧、不插值（据 01 号文档的整理）。帧率是画风的一部分，UI 动画也应该跟着。

**可演示的对比**

- **矢量圆角浮在像素世界上 vs 同网格像素 UI**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线）；美术配方依次切换：三维像素画（pixel3d） → Game Boy 四绿（gameboy））
  - 承载原则的参数：UI 像素化：清晰矢量 → 与世界同网格；正文字族：无衬线 → 像素；转角：圆角 → 像素台阶；UI 动画帧率：流畅 → 一拍二（12fps）
  - 配套改动：圆角 / 切角大小：20 → 自动；标题字族：无衬线 → 像素标题；数字字体：同正文 → 像素数字；图标风格：扁平填充 → 像素；外框结构：程序线框 → 平框九宫格
  - 看什么：配一个像素类美术配方（pixel3d 或 gameboy）。A 的圆角矢量面板和平滑字浮在像素世界上，像手机 App 盖在游戏上；B 的木框、像素字和阶梯转角落在同一网格里。再看动效：A 的血条丝滑下降，B 按一拍二跳格，和角色动画同步。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-medium-constraints#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.screen=screen.hud` `ast.frameMat=wood`
  - A：`vis.pixelScale=off` `vis.corner=round` `vis.cornerSize=20` `typ.body.family=sans` `typ.display.family=sans` `typ.numerals.family=body` `mo.frameRate=smooth` `vis.iconStyle=flat` `ast.frame=procedural`
  - B：`vis.pixelScale=world` `vis.corner=step` `typ.body.family=pixel` `typ.display.family=pixel` `typ.numerals.family=pixel` `mo.frameRate=onTwos` `vis.iconStyle=pixel` `ast.frame=plainNinePatch` `vis.cornerSize=auto`

  </details>
- **单变量版：矢量圆角浮在像素世界上 → 只切换 vis.pixelScale、typ.body.family、vis.corner、mo.frameRate**（单变量对照；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线）；美术配方依次切换：三维像素画（pixel3d） → Game Boy 四绿（gameboy））
  - 承载原则的参数：UI 像素化：清晰矢量 → 与世界同网格；正文字族：无衬线 → 像素；转角：圆角 → 像素台阶；UI 动画帧率：流畅 → 一拍二（12fps）
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-medium-constraints#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.screen=screen.hud` `vis.cornerSize=20` `typ.display.family=sans` `typ.numerals.family=body` `vis.iconStyle=flat` `ast.frame=procedural`
  - A：`vis.pixelScale=off` `typ.body.family=sans` `vis.corner=round` `mo.frameRate=smooth`
  - B：`vis.pixelScale=world` `typ.body.family=pixel` `vis.corner=step` `mo.frameRate=onTwos`

  </details>

#### P-palette-roles

**UI 取色取“角色”不取“颜色”：骨架色从场景色板推，强调色和世界主色拉开，语义色单独保留**

> 适用品类：动作与 Roguelite、射击、竞速与驾驶、角色扮演、解谜与侦探 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-priority-tiers](#p-priority-tiers) · 风格变体：`fam.persona-collage`、`fam.ink`、`fam.military`

**要解决的问题**

直接拿画面主色当 UI 强调色，UI 会被画面吞掉（蓝窗口叠在蓝天上，橄榄色 HUD 叠在丛林里）；完全独立的控件色又让 UI 像另一款游戏。Persona 系列的做法是每一作先定世界主色，再围绕它挑界面色。P5 以红为主色，字只用黑白，除血条、魔条外整个 UI 只有红、黑、白三色。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 场景色板直取（同色系、双色调） | <abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="col.saturation=0.8">UI 饱和度 = 0.8</abbr>；<abbr title="hier.emphasis=value+size">强调配方 = 明暗对比 + 尺寸</abbr> | 限色、双色调、整体调色很强的画风。 | 强调色和场景同色，重要信息要靠明度和形状拉开；场景一换色就要联动（见 P-follow-world-over-time）。 | Hauntii（steam:2060790）、Thronefall（steam:2239150）、Melatonin（steam:1585220）、SUMMERHOUSE（steam:2533960）、Spiritfarer（steam:972660） |
| 世界标志色做面，黑白做字 | <abbr title="col.source=uiPalette">UI 取色来源 = 独立控件色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="col.accent=#e60012">强调色 = #e60012</abbr>；<abbr title="col.accent2=#ffffff">第二强调色 = #ffffff</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr> | 世界有一个强烈的标志色（红、紫、霓虹）。 | 大面积高饱和容易疲劳（06 文档 B18）；标志色就是危险色时，危险提示只能改用形状和动效。 | Persona 5 Royal（steam:1687950）、Cult of the Lamb（steam:1313140）、Cyberpunk 2077（steam:1091500）、DEATHLOOP（steam:1252330 · 据已知描述） |
| 画面压低饱和，UI 独占一个强调色 | <abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="col.strategy=mono">骨架色彩策略 = 单色</abbr>；<abbr title="col.accent=#ff2d7a">强调色 = #ff2d7a</abbr>；<abbr title="hier.emphasis=color+value">强调配方 = 颜色 + 明暗对比</abbr>；<abbr title="col.saturation=0.6">UI 饱和度 = 0.6</abbr> | 画面本身低饱和、单色或线稿。这个唯一的颜色只留给玩法信息（危险、可攀爬、效果）。 | 强调色一旦被装饰挪用就失效。强调要稀少才有效（Von Restorff）。 | Just Shapes & Beats（steam:531510）、(the) Gnorp Apologue（steam:1473350）、Mirror's Edge（steam:17410）、Wash Card（steam:2095150）、Into the Breach（steam:590380） |
| 场景色、控件色分两组（独立控件色板） | <abbr title="col.source=uiPalette">UI 取色来源 = 独立控件色板</abbr>；<abbr title="col.strategy=neutralAccent">骨架色彩策略 = 中性 + 一两个强调色</abbr>；<abbr title="col.semantic=accentOnly">按钮角色配色 = 强调色主按钮</abbr>；<abbr title="col.teams=orangeBlue">阵营色对 = 橙蓝（色盲安全）</abbr> | 场景色变化大（多星球、多季节），或者是竞技游戏，需要稳定的语义色。 | 需要用一个别的通道（字、转角、母题）把 UI 拉回世界。 | I Was a Teenage Exocolonist（steam:1148760）、Stellaris（steam:281990）、崩坏：星穹铁道（gameui:8283）、Overwatch（iig:overwatch）、Dyson Sphere Program（steam:1366540） |

**经验法则**

- 骨架三色从场景色板里取“角色”。底：场景暗部或亮部的去饱和版（D-lightness 决定深浅）。字：与底明度相反。强调：场景里面积最小、饱和度最高的那个颜色，而不是面积最大的主色。
- 语义色（危险、敌我、稀有度）不受骨架策略约束（col.coding 独立），必须在色相或明度上和世界主色拉开，并且有形状冗余。
- 场景色和控件色分两组写进色板，这是 GameUI 高赞作品的常见做法；控件组可以默认从场景组推导。
- 整套 UI 的强调色越少越好。P5 除血条、魔条外只用红黑白三色。
- 色盲检查要把 UI 和 3D 场景放在一起看（D-teams）。

**反例与玩家评价**

- UI 强调色等于场景主色：蓝底窗口叠蓝天，橄榄色战术 HUD 叠丛林，金框叠黄沙。
  - 评价与证据（依据：文献）：评测关键词没有按颜色拆分，无法计数。06 文档在 JRPG 窗口、军事战术（“迷彩化”）、手游金框三种风格的陷阱里都记了这一条。
- 同一个红色既是装饰色（朱砂、印章、主题红），又是危险色或敌方色。
  - 评价与证据（依据：文献）：无计数。06 文档 B8（印章红别和敌方红混用）、B25（朱红别和伤害提示混用）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：红黑白三色，字只用黑白，强调色只有一个。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：骨架取墨色与宣纸色，关键信息才用朱红。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：骨架白字 + 半透明黑底，不用橄榄色面板（会迷彩化）。
- 17 号图谱反查到的相关家族：`fam.cozy`、`fam.aero`、`fam.anime-card`、`fam.vector-display`、`fam.one-bit-dither`、`fam.flat`、`fam.african-pattern`、`fam.slavic-folk`、`fam.dancheong-minhwa`

**出处**

- [SEGAbits 转述 Famitsu 访谈：Persona 5 美术与 UI 负责人](https://segabits.com/?p=54918)（S098）：界面颜色要对照每一作的主色（青、黄、红）来定；P5 的字色试过多种之后选了黑白。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：红色是为了刺眼感，与前两作的蓝、黄区分开；黑白字在红底上最醒目；除血条、魔条外 UI 只用红黑白。
- [Laws of UX: Von Restorff Effect](https://lawsofux.com/von-restorff-effect/)（S146）：一组相似元素里与众不同的那个最容易被记住，但强调要克制：强调的东西太多就都不突出了，而且不能只靠颜色。
- [Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/)（S137）：关键信息不能只靠颜色传达。场景取色把 UI 色压得接近画面时，更要用形状和文字做冗余。

**可演示的对比**

- **同色系红调警示 vs 场景骨架 + 独占品红 + 黄三角**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线）；美术配方依次切换：黑白一点红（noir） → 水墨山水（ink-landscape））
  - 承载原则的参数：强调色：#3a6ea5 → #ff2d7a；骨架色彩策略：单色 → 中性 + 一两个强调色；强调配方：尺寸 → 颜色 + 明暗对比
  - 配套改动：警示表达：红色调 → 黄三角图标
  - 看什么：配一个低饱和的美术配方（noir 或 ink-landscape）。A 的低血警示用了画面同色系的红调，融进了场景；B 的骨架仍然取自场景，只把一个画面里没有的品红留给关键信息，警示还加了形状（黄三角）。再打开色盲模拟，看 B 去掉颜色之后还剩不剩信息。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-palette-roles#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `col.source=scene`
  - A：`col.strategy=mono` `hier.emphasis=size` `st.alert=redTint` `col.accent=#3a6ea5`
  - B：`col.strategy=neutralAccent` `col.accent=#ff2d7a` `hier.emphasis=color+value` `st.alert=warnIcon`

  </details>

#### P-type-two-tier

**字分两层：标题字承载身份（书法、手写、哥特、衬线、像素……），正文和数字承载可读，再给玩家一个“朴素字”开关**

> 适用品类：动作与 Roguelite、角色扮演、叙事与视觉小说、生活与养成、卡牌与桌面 · 相关：[P-typography-legible-format](#p-typography-legible-format)、[P-title-lettering](#p-title-lettering)、[P-text-size-floor](#p-text-size-floor) · 风格变体：`fam.ink`、`fam.art-deco`、`fam.silent-film`

**要解决的问题**

字体是把美术方向带进 UI 最便宜、也最有效的通道：一套书法标题就能让中性面板变成国风。但同一种字一旦压到正文、数字和小标签上，可读性马上崩。参考库里记了标题字族的 84 张卡中，衬线 17、书法 16、手写 10，表达型字体是多数。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 书法标题 + 无衬线正文（东方题材） | <abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr>；<abbr title="typ.direction=verticalTitle">标题排版方向 = 标题竖排</abbr>；<abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr>；<abbr title="cmp.plate=sideTab">标牌 = 竖排侧牌</abbr> | 国风、武侠、仙侠、和风。 | 中文书法要做成图片素材，不能动态排字；竖排侧牌占宽。 | Black Myth: Wukong（steam:2358720）、鬼谷八荒 Tale of Immortal（steam:1468810）、Wandering Sword（steam:1876890）、逆水寒手游（网易）（gameui:9375）、忘川风华录（网易）（gameui:2150） 等 7 款 |
| 衬线小型大写标题 + 衬线正文（西幻、古典、文学感） | <abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.display.case=smallCaps">标题大小写 = 小型大写</abbr>；<abbr title="typ.display.tracking=0.12">标题字距 = 0.12</abbr>；<abbr title="typ.body.family=serif">正文字族 = 衬线 / 宋</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 西幻、魂系、文学向叙事。 | 衬线小字在低分辨率和电视远看时发虚，正文要比平台最小字号再大一档。 | ELDEN RING（steam:1245620）、Hollow Knight（steam:367520）、Clair Obscur: Expedition 33（steam:1903340）、Disco Elysium（steam:632470）、OCTOPATH TRAVELER（steam:921570） 等 6 款 |
| 手写标题 + 圆体正文（手作、日记、童趣） | <abbr title="typ.display.family=handwritten">标题字族 = 手写</abbr>；<abbr title="typ.body.family=round">正文字族 = 圆体</abbr>；<abbr title="vis.jitter=0.2">手绘抖动 = 0.2</abbr> | 铅笔、蜡笔、贴纸、练习本这类“个人手作”质感。 | 中文手写字体常常缺字，生僻字会回退到别的字体（06 文档 B7）。 | Chicory: A Colorful Tale（steam:1123450）、TOEM（steam:1307580）、Lil Gator Game（steam:1586800）、OMORI（steam:1150690）、Spiritfarer（steam:972660） |
| 时代或亚文化展示字（勒索信、涂鸦、西部木刻、新艺术、哥特、模板字）+ 粗无衬线正文 | <abbr title="typ.display.family=ransom">标题字族 = 拼贴勒索信</abbr>；<abbr title="typ.display.weight=black">标题字重 = 特粗</abbr>；<abbr title="typ.body.family=sans">正文字族 = 无衬线</abbr>；<abbr title="typ.body.weight=bold">正文字重 = 粗</abbr> | 作品有鲜明的年代或亚文化指向：朋克、街头、西部、美好年代、哥特、军事。 | 本地化难（勒索信每个字母一种字体）；涂鸦和勒索信只适合极短的文本。 | Persona 5 Royal（steam:1687950）、Hi-Fi RUSH（steam:1817230）、Red Dead Redemption（steam:2668510）、Darkest Dungeon（steam:262060）、Tooth and Tail（steam:286000） 等 7 款 |
| 像素或等宽一字到底（字本身就是媒介） | <abbr title="typ.display.family=pixel">标题字族 = 像素标题</abbr>；<abbr title="typ.body.family=pixel">正文字族 = 像素</abbr>；<abbr title="typ.numerals.family=pixel">数字字体 = 像素数字</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr> | 像素画面、终端、编程谜题。 | 中文像素字 12px 以下会粘连。 | Balatro（steam:2379780）、Luck be a Landlord（steam:1404850）、Crow Country（steam:1996010）、BIT.TRIP RUNNER（steam:63710）、A=B（steam:1720850） |
| 标题等于正文（中性，靠字号与字重拉层级） | <abbr title="typ.display.family=same">标题字族 = 同正文</abbr>；<abbr title="typ.scale=2">字号阶梯比 = 2</abbr>；<abbr title="typ.display.weight=black">标题字重 = 特粗</abbr> | 瑞士风、极简、信息设计导向。 | 身份感全靠排版功底。 | Mini Metro（steam:287980）、CONTROL（steam:870780）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570） |

**经验法则**

- 三个字角色分开选。标题（typ.display.*）可以全力表达；正文（typ.body.*）只在无衬线、衬线、圆体、楷体里选；HUD 上的数字（typ.numerals.family）一律用 tabular 或 display，不用书法和手写。
- 表达型标题字只用在标题、章节卡、Boss 名和大字提示上，不进按钮小字、列表和 tooltip。
- 最小字号按平台定：XAG 101 规定 1080p 下主机正文字身高至少 26px、PC 至少 18px；细字重再大一档（Apple HIG）。
- 做一个“朴素字”开关（a11y），把所有风格字替换成正文字族。
- 风格字体必须覆盖全部语言的字符集；书法和手写标题按语种分别书写，见 P-title-lettering。

**反例与玩家评价**

- 表达型字体下沉到正文、数字和小标签。 例：Wandering Sword（steam:1876890）、鬼谷八荒 Tale of Immortal（steam:1468810）。
  - 评价与证据（依据：截图）：看图：鬼谷八荒的宣纸面板上竖排书法标签与小字说明混排；Wandering Sword 正文仍是普通字，是正例。原来「标了书法标题的 8 款平均每款 1.0 条字太小」已删除——typ.display.family 标的是标题字，本原则恰恰主张书法只用在标题；那些「字太小」命中复核后多数不是在说文字，只有鬼谷八荒 1 条说卷轴面板里的正文太小（说的是正文所在的小面板，不是书法标题）。评测证据不足。
- 风格字体没有“朴素字”退路，也没覆盖全部语种字符集。
  - 评价与证据（依据：文献）：无计数。XAG 101 要求风格化字体提供非风格化替代，并覆盖所有支持语言的字符集。Pentiment 的做法是加一个辅助选项：所有角色统一用最易读的人文手写体。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：书法标题 + 黑体 / 楷体正文。
- 装饰艺术（`fam.art-deco`，皮肤 `skin.deco`）：装饰艺术：几何展示字只给标题，正文用简洁无衬线。
- 默片 / 1930 年代卡通（`fam.silent-film`）：默片：标题是字卡式衬线大字，正文仍是清楚的小字。
- 17 号图谱反查到的相关家族：`fam.filigree`、`fam.art-deco`、`fam.shoujo`、`fam.notebook`、`fam.storybook`、`fam.ink`、`fam.wa`、`fam.editorial`、`fam.art-nouveau`、`fam.norse-knotwork`、`fam.antiquity`、`fam.gothic-tech`

**出处**

- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：用了风格化字体（滴血、哥特等）就要提供非风格化的替代；给出主机 26px、PC 18px（1080p 字身高）的最小默认值；字体要覆盖所有支持语言的完整字符集。
- [Apple Human Interface Guidelines: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)（S132）：自定义字体必须易读；游戏要在每个平台分别测文字可读性；细字重要比推荐字号更大；自定义字体也要支持字号调节等辅助功能。
- [Lettermatic: Custom Fonts for Pentiment](https://lettermatic.com/custom/pentiment)（S092）：没有配音，字体就承担“谁在说话”；字形按需要现代化以便阅读；辅助设置可以让所有角色统一显示最易读的人文手写体。
- [PCGamesN: Pentiment 的美术与字体](https://www.pcgamesn.com/pentiment/art-fonts-story)（S095）：字体按主角对每个人的印象来分配，印象改变时字体也跟着变。字体就是角色的“声音”。

**可演示的对比**

- **书法标题 + 楷体小正文 vs 书法标题 + 无衬线正文**（单变量对照；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：正文字族：楷书 / 手写感 → 无衬线；文字可读辅助：无 → 投影；数字字体：同正文 → 等宽数字
  - 配套改动：基准字号：12 → 16
  - 看什么：两边名牌上的书法标题一样，风格身份没变。打开“最小字号检查”和“视距预览：电视 2.5m”：A 的楷体小正文在远处糊成一片，B 的正文和数字仍然清楚。正文换字体几乎不损失国风感，这说明身份主要在标题上。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-type-two-tier#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.screen=screen.dialogue` `typ.display.family=calligraphy`
  - A：`typ.body.family=kai` `typ.numerals.family=body` `typ.baseSize=12` `typ.legibility=none`
  - B：`typ.body.family=sans` `typ.numerals.family=tabular` `typ.baseSize=16` `typ.legibility=shadow`

  </details>

#### P-title-lettering

**标题字 / LOGO 是“画”出来的资产：用世界的媒介去写，按语种重写，再用同一套规则复用到章节卡、Boss 名和大字提示**

> 适用品类：动作与 Roguelite、横版平台、角色扮演、叙事与视觉小说、生活与养成 · 相关：[P-type-two-tier](#p-type-two-tier)、[P-event-callout-tiers](#p-event-callout-tiers) · 风格变体：`fam.ink`、`fam.silent-film`、`fam.graffiti`

**要解决的问题**

设计师作品里，标题字是独立的大件（08 文档 3.3）：国风几乎都有书法标题，欧美卡通是立体卡通字，科幻是细线宽字距，恐怖是窄体粗字。但很多原型只是“选一个字体打上去”。真正把风格立住的做法是：标题用画面同一种工具写出来（毛笔、钢笔、木刻、霓虹管、像素点），再把同一套处理延伸到所有“大字时刻”。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 书法 / 毛笔（墨飞白、竖排、压在画面上） | <abbr title="el.title.form=artTitle">标题 / LOGO：画法 = 艺术大字海报标题</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr>；<abbr title="typ.titleFx=drybrush">标题字特效 = 墨飞白</abbr>；<abbr title="typ.direction=verticalTitle">标题排版方向 = 标题竖排</abbr>；<abbr title="ast.fx=ink">叠加特效层 = 墨晕 / 墨烟</abbr> | 东方题材；招式名、地名、章节名可以压在画面上做成大字。 | 每个大字都要单独出图；动态文本（玩家起的名字）没法用书法。 | Wandering Sword（steam:1876890）、我自为道（竞技世界）（gameui:11870）、炼仙传说（幻界游戏）（gameui:4897）、代号：梦山海（篝火测试）（gameui:7090）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） 等 6 款 |
| 年代海报 / 片头字（1930 年代动画、19 世纪海报、西部木刻、60 年代拼贴） | <abbr title="el.title.form=titleCard">标题 / LOGO：画法 = 章节标题卡</abbr>；<abbr title="typ.display.family=slabWestern">标题字族 = 西部木刻粗衬线</abbr>；<abbr title="typ.titleFx=shadow">标题字特效 = 投影</abbr>；<abbr title="ast.bgArt=material">替换背景 = 整屏材质</abbr>；<abbr title="ast.bgMat=paper">背景材质 = 米白纸</abbr> | 画面是在致敬某个年代的印刷或影像媒介。 | 要考据年代的版式规矩（字距、装饰线、居中构图），否则像仿冒字体包。 | Return of the Obra Dinn（steam:653530）、Red Dead Redemption（steam:2668510）、Dont Starve（iig:dont-starve）、Cuphead（steam:268910 · 据已知描述）、DEATHLOOP（steam:1252330 · 据已知描述） |
| 细线宽字距（几何、科幻、空灵） | <abbr title="el.title.form=logo">标题 / LOGO：画法 = LOGO</abbr>；<abbr title="typ.display.family=sans">标题字族 = 无衬线</abbr>；<abbr title="typ.display.weight=light">标题字重 = 细</abbr>；<abbr title="typ.display.tracking=0.3">标题字距 = 0.3</abbr>；<abbr title="typ.display.case=upper">标题大小写 = 全大写</abbr>；<abbr title="vis.motif=geometric">装饰母题 = 几何线 / 同心圆</abbr> | 极简、太空、梦幻、仪器感的画面。 | 细字在亮背景上会消失，要垫暗角或渐变。 | GRIS（steam:683320）、Destiny 2（steam:1085660）、Mu Cartographer（steam:513360）、明日方舟（gameui:2848） |
| 立体卡通字 / 粗描边字（Q 版、派对） | <abbr title="el.title.form=artTitle">标题 / LOGO：画法 = 艺术大字海报标题</abbr>；<abbr title="typ.display.family=round">标题字族 = 圆体</abbr>；<abbr title="typ.display.weight=black">标题字重 = 特粗</abbr>；<abbr title="typ.titleFx=emboss">标题字特效 = 3D 浮雕 / 糖果立体字</abbr> | 糖果色、玩具感、派对游戏。 | 立体字素材量大；用在每个弹窗标题上会显得吵。 | Castle Crashers（steam:204360）、Tricky Towers（steam:437920）、蛋仔派对（网易）（gameui:3055）、超级幻影猫：光痕（烛月网络）（gameui:13467）、Bloons TD 6（steam:960090） |
| 冲击大字（拟声字、评级字、事件横幅）：动作反馈也用标题字规则 | <abbr title="el.feedback.form=comicSFX+rating">命中反馈 / 连击：画法 = 拟声字 + 评价字（Good! / Perfect）</abbr>；<abbr title="el.notify.form=band">通知 / 大字提示：画法 = 整屏横贯带大字</abbr>；<abbr title="typ.display.family=graffiti">标题字族 = 涂鸦</abbr>；<abbr title="typ.titleFx=outlineShadow">标题字特效 = 描边 + 投影</abbr>；<abbr title="mo.enter=slam">入场动效 = 砸入（放大落下 + 震）</abbr>；<abbr title="mo.duration=0.2">动效时长 = 0.2</abbr> | 动作、节奏、风格化 RPG 的高光时刻。 | 一屏只能有一个，频率要低，否则就变成噪声（见 P-dwell-time-budget）。 | Hi-Fi RUSH（steam:1817230）、Darkest Dungeon II（steam:1940340）、Metaphor: ReFantazio（steam:2679460）、曙光重临（4399）（gameui:13586）、Devil May Cry 5（steam:601150 · 据已知描述） 等 6 款 |

**经验法则**

- 先写出标题，再把标题字规则写成规格，三项：笔具（毛笔、钢笔、木刻、霓虹管、像素点）、笔画特征（飞白、墨洇、描边、投影）、排列（横、竖、斜、拼贴）。章节卡、Boss 名、地名、结算大字全部套用。
- 标题字的媒介跟着画面走，哪怕 UI 其余部分是中性的：Black Myth、Elden Ring 局内 HUD 很中性，身份全在标题字上。
- 动态排字的大字（Boss 名、地名）要有字体版本；只有 LOGO 和固定的章节名可以用图片。
- 评级字和拟声字就是动作游戏的标题字：用同一套标题字规则来做，配 mo.enter = slam、短时长。
- 每个语种都单独审一遍标题字，不靠自动回退。

**反例与玩家评价**

- 标题直接用现成字体打字，章节卡、Boss 名、结算大字又各用一套。
  - 评价与证据（依据：文献）：评测无法计数。08 文档 3.3：高分设计师作品几乎都把 LOGO 和标题字作为独立环节交付，GameUI 作品分类里还专门有“游戏 LOGO”一类。
- 书法或手绘标题只做了中文或英文一版，其它语种回退到系统字体。
  - 评价与证据（依据：文献）：无计数。Cuphead 本地化时，中日韩标题字分别请了书法家，按 1930 年代的海报和书籍参照重写（Xbox Wire 访谈）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：书法标题按语种分别书写，飞白与竖排是风格位。
- 默片 / 1930 年代卡通（`fam.silent-film`）：默片 / 1930 卡通：片头字体按语种重写（Cuphead 请书法家写中日韩标题）。
- 街头涂鸦 / 贴纸滑板（`fam.graffiti`）：街头涂鸦：标题是喷漆字，带滴落与描边。
- 17 号图谱反查到的相关家族：`fam.art-deco`、`fam.memphis`、`fam.woodcut-print`、`fam.ink`、`fam.persona-collage`、`fam.graffiti`、`fam.y2k`、`fam.atompunk`、`fam.constructivist`、`fam.editorial`、`fam.silent-film`、`fam.occult-tarot`、`fam.islamic-persian`、`fam.latin-folk`、`fam.slavic-folk`、`fam.dancheong-minhwa`

**出处**

- [Xbox Wire: Studio MDHR 谈 Cuphead 本地化](https://news.xbox.com/en-us/2019/04/19/studio-mdhr-interview-cuphead-localization/)（S113）：日、韩、中文的手写标题由各自的书法家完成，先统一风格方向，再给书法家创作空间；参照的是 1930 年代的海报、卡片和书籍。
- [Exuberant video game menus designed with da Vinci in mind（The New York Times，经 DT Next 转载）](https://www.dtnext.in/amp/story/edit/exuberant-video-game-menus-designed-with-da-vinci-in-mind-807823)（S049）：Metaphor 的界面设计师从中世纪绘画、达·芬奇的笔触、日本传统绘画和歌词视频里取材；P5 菜单字取材自朋克唱片的勒索信封面和体育转播图形。标题字的灵感来自世界之外的具体媒介。
- [Lettermatic: Custom Fonts for Pentiment](https://lettermatic.com/custom/pentiment)（S092）：两千多个字形中，很多是用当年的书写工具手工上墨，有的故意用非惯用手写，模拟书写不熟练的人。字是“写”出来的，不是“选”出来的。

**可演示的对比**

- **普通页眉 vs 用画面同一支笔写的标题**（整套做法对照（多个参数一起变）；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线）；美术配方依次切换：水墨山水（ink-landscape））
  - 承载原则的参数：标题 / LOGO：画法：页眉标题条 → 艺术大字海报标题；标题字族：同正文 → 书法；标题字特效：无 → 墨飞白
  - 配套改动：水印层：无 → 书法；叠加特效层：自动 → 墨晕 / 墨烟；标题排版方向：横排 → 标题竖排
  - 看什么：配水墨山水（ink-landscape）。A 是一条普通页眉，B 的标题像用画面同一支笔写的。接着只改 B 的 typ.display.family 和 typ.titleFx：换成 slabWestern + shadow、pixel + none、sans light + 宽字距，版式不动、身份完全换掉。这说明标题字是风格探索里性价比最高的旋钮。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-title-lettering#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.screen=screen.title` `ast.watermarkOpacity=0.12`
  - A：`el.title.form=header` `typ.display.family=same` `typ.titleFx=none` `ast.watermark=none` `ast.fx=auto` `typ.direction=horizontal`
  - B：`el.title.form=artTitle` `typ.display.family=calligraphy` `typ.titleFx=drybrush` `typ.direction=verticalTitle` `ast.fx=ink` `ast.watermark=calligraphy`

  </details>
- **单变量版：普通页眉 → 只切换 el.title.form、typ.display.family、typ.titleFx**（单变量对照；内容包：soulslike · 没落王城；基线皮肤：灰盒（中性基线）；美术配方依次切换：水墨山水（ink-landscape））
  - 承载原则的参数：标题 / LOGO：画法：页眉标题条 → 艺术大字海报标题；标题字族：同正文 → 书法；标题字特效：无 → 墨飞白
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-title-lettering#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=soulslike` `cnt.screen=screen.title` `ast.watermarkOpacity=0.12` `ast.watermark=none` `ast.fx=auto` `typ.direction=horizontal`
  - A：`el.title.form=header` `typ.display.family=same` `typ.titleFx=none`
  - B：`el.title.form=artTitle` `typ.display.family=calligraphy` `typ.titleFx=drybrush`

  </details>

#### P-motif-from-world

**装饰母题从世界里的“物与纹”取样：建筑、器物、织物、仪式符号，而不是通用花边**

> 适用品类：探索与冒险、射击、角色扮演、策略与战术、建造与经营 · 相关：[P-material-from-world](#p-material-from-world)、[P-dwell-time-budget](#p-dwell-time-budget) · 风格变体：`fam.norse-knotwork`、`fam.art-deco`、`fam.slavic-folk`

**要解决的问题**

装饰是最容易做成“通用奇幻金边”的通道。参考库里有辨识度的装饰都能在世界里找到出处：BioShock 的 HUD 圆框和 Rapture 的装饰艺术建筑同源；Grim Fandango 的侧边纹样是装饰艺术加亡灵节；Frostpunk 的铆钉与冰霜来自蒸汽城市；Hollow Knight 的卷草呼应虫巢的曲线；逆水寒的竹叶、灯笼角饰来自场景里的植物和器物。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 建筑与时代纹样（装饰艺术、新艺术、哥特） | <abbr title="vis.motif=geometric">装饰母题 = 几何线 / 同心圆</abbr>；<abbr title="vis.ornament=2">装饰预算 = 中</abbr>；<abbr title="ast.frameMat=gold">外框材质 = 金</abbr>；<abbr title="vis.stroke=double">描边线型 = 双线</abbr>；<abbr title="vis.strokeColor=metal">描边色 = 金属金 / 铜</abbr>；<abbr title="vis.corner=chamfer">转角 = 切角</abbr>；<abbr title="typ.display.family=artNouveau">标题字族 = 新艺术 / 美好年代</abbr>；<abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr> | 世界的建筑或时代风格本身就很强。 | 细金线在低分辨率下发虚；宽字距全大写的中文版要另行设计（06 文档 B17）。 | Grim Fandango Remastered（steam:316790）、Clair Obscur: Expedition 33（steam:1903340）、BioShock（steam:7670 · 据已知描述）、BioShock Infinite（steam:8870 · 据已知描述）、Lies of P（steam:1627720 · 据已知描述） |
| 植物与器物（卷草、竹、樱、灯笼） | <abbr title="vis.motif=floral">装饰母题 = 花叶卷草</abbr>；<abbr title="ast.ornaments=corners+dividers">饰件 = 角花 / 角饰 + 分隔饰条</abbr>；<abbr title="vis.ornament=1">装饰预算 = 少</abbr>；<abbr title="ast.frame=cornersOnly">外框结构 = 只有四角件</abbr>；<abbr title="ast.frameMat=lineArt">外框材质 = 线描 / 平涂</abbr> | 自然、园林、东方题材；装饰只占角落和分隔线。 | 角花素材要按九宫格切好，四个角都能复用。 | Hollow Knight（steam:367520）、逆水寒手游（网易）（gameui:9375）、Yi Xian: The Cultivation Card Game（steam:1948800）、River Town Factory（steam:2281410）、Hogwarts Legacy（steam:990080 · 据已知描述） |
| 机械与工业（铆钉、齿轮、电路） | <abbr title="vis.motif=rivets">装饰母题 = 齿轮 / 铆钉 / 铜饰</abbr>；<abbr title="ast.ornaments=rivets">饰件 = 铆钉 / 金属夹角</abbr>；<abbr title="ast.frameMat=iron">外框材质 = 铁 / 钢 / 拉丝金属</abbr>；<abbr title="vis.depth=bevel">立体与阴影 = 倒角浮雕</abbr>；<abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr> | 蒸汽朋克、工业、工厂、复古科幻。电路母题适合科技树连线。 | 金属倒角显厚重，HUD 上要减一档。 | Frostpunk（steam:323190）、Evil Genius（steam:3720）、Nodebuster（steam:3107330）、Infinitode 2 - Infinite Tower Defense（steam:937310）、Lies of P（steam:1627720 · 据已知描述） 等 6 款 |
| 信仰与仪式符号（符文、骷髅、星座、塔罗） | <abbr title="vis.motif=runes">装饰母题 = 符文 / 法阵</abbr>；<abbr title="ast.watermark=sigil">水印层 = 符印 / 法阵</abbr>；<abbr title="ast.watermarkOpacity=0.1">水印强度 = 0.1</abbr>；<abbr title="ast.fx=magicCircle">叠加特效层 = 魔法阵</abbr> | 神话、邪教、占卜题材；符号本身就是世界观的一部分（技能树做成星座）。 | 符号必须来自设定，乱用宗教符号有文化风险（01 文档“文化与世界题材”的陷阱）。 | Journey（steam:638230）、Cult of the Lamb（steam:1313140）、Sol Cesto（steam:2738490）、Hades II（steam:1145350）、God of War（steam:1593500 · 据已知描述） 等 6 款 |
| 不要母题：让画面自己当装饰 | <abbr title="vis.motif=none">装饰母题 = 无</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr> | 画面本身极简，或者装饰性已经很强（彩窗、新艺术、敦煌），UI 不要再和画面抢。 | UI 本身的辨识度要靠字和色。 | Mini Metro（steam:287980）、Dorfromantik（steam:1455840）、Bad North（steam:688420）、Tiny Glade（steam:2198150） |

**经验法则**

- 从世界的美术设定里挑 3 样“物”（建筑构件、器物、织物 / 纹身 / 符号），母题只从这 3 样里提炼。
- 母题按装饰预算分配：HUD 不超过 1（只有角件或分隔线），菜单 2，标题和图鉴 3。D-ornament 会按母题给出默认饰件。
- 母题用在边框、分隔线、水印、空状态和读取页上，绝不铺在文字底下。
- 同一母题在 UI 和世界里的样子要一致（同线宽、同材质色），否则看起来是两套设计。
- 画面本身装饰性已经很强时（新艺术、彩窗、敦煌），UI 母题降一档，免得和画面抢。

**反例与玩家评价**

- 通用金框、花边：和世界无关，换到任何一款奇幻游戏都成立。
  - 评价与证据（依据：文献）：评测无法计数。GameUI 社区评论里有“材质与世界观不符”的批评（举的例子是装订皮革不像北欧，08 文档 2.4，意译）。
- 母题密度压过信息。 例：Hades II（steam:1145350）、Cult of the Lamb（steam:1313140）、Total War: WARHAMMER II（steam:594570）。
  - 评价与证据（依据：推断）：评测证据不足：原来「两个家族 13 款里 5 款太乱」按旧家族表与未复核的关键词计算，已撤回；这条是设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 北欧：结绳纹 / 符文石（`fam.norse-knotwork`）：北欧结绳纹：母题来自世界里的符文石。
- 装饰艺术（`fam.art-deco`，皮肤 `skin.deco`）：装饰艺术：圆框与放射线来自世界里的建筑（BioShock 的 Rapture）。
- 东欧 / 斯拉夫民间（十字绣、彩绘木器、剪纸）（`fam.slavic-folk`）：东欧 / 斯拉夫民间：母题来自十字绣、彩绘木器与剪纸，取自世界里的器物。
- 17 号图谱反查到的相关家族：`fam.dark-gold`、`fam.art-deco`、`fam.shoujo`、`fam.woodcut-print`、`fam.ink`、`fam.wa`、`fam.graffiti`、`fam.constructivist`、`fam.occult-tarot`、`fam.cartographic`、`fam.art-nouveau`、`fam.norse-knotwork`、`fam.antiquity`、`fam.stained-glass`、`fam.gothic-tech`、`fam.islamic-persian`、`fam.latin-folk`、`fam.african-pattern`、`fam.south-se-asian`、`fam.oceania-indigenous`、`fam.slavic-folk`、`fam.xianxia`、`fam.ceramic-lacquer`、`fam.dunhuang`、`fam.dancheong-minhwa`

**出处**

- [Wikipedia: BioShock（Art and design）](https://en.wikipedia.org/wiki/BioShock)（S193）：大量图像取自装饰艺术，因为它的大块简单形体用很少的多边形就能还原；为了少做复杂菜单，升级和购买都放进了世界里的售货机。母题和功能入口都来自世界本身。
- [Exuberant video game menus designed with da Vinci in mind（The New York Times，经 DT Next 转载）](https://www.dtnext.in/amp/story/edit/exuberant-video-game-menus-designed-with-da-vinci-in-mind-807823)（S049）：Metaphor 的菜单尽量做到最有表现力，但不能压过画面，过头时会被同事拉回来。华丽和清楚可以并存，但要有人把关。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：不要把每个元素都调到最大，否则会损害清晰度。装饰同理，越到实时画面越要收。

**可演示的对比**

- **通用金花饰 + 宝石 vs 世界里取样的符文与石材**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线）；美术配方依次切换：版画木刻（woodcut） → 剥落做旧（weathered））
  - 承载原则的参数：装饰母题：花叶卷草 → 符文 / 法阵；外框材质：金 → 石；水印层：无 → 符印 / 法阵
  - 配套改动：装饰预算：华丽 → 中；饰件：角花 / 角饰 + 分隔饰条 + 嵌宝石 → 分隔饰条；外框结构：雕花九宫格 → 平框九宫格；水印强度：0.12 → 0.1
  - 看什么：配版画木刻（woodcut）或剥落做旧（weathered）。A 的金色花饰加宝石放进任何奇幻游戏都一样；B 的符文、石材和淡水印能在画面里的石碑、刻痕上找到来源，装饰量少一档，辨识度反而更高。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-motif-from-world#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.character`
  - A：`vis.motif=floral` `vis.ornament=3` `ast.ornaments=corners+dividers+gems` `ast.frame=carvedNinePatch` `ast.frameMat=gold` `ast.watermark=none` `ast.watermarkOpacity=0.12`
  - B：`vis.motif=runes` `vis.ornament=2` `ast.ornaments=dividers` `ast.frame=plainNinePatch` `ast.frameMat=stone` `ast.watermark=sigil` `ast.watermarkOpacity=0.1`

  </details>
- **单变量版：通用金花饰 + 宝石 → 只切换 vis.motif、ast.frameMat、ast.watermark、ast.frame**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线）；美术配方依次切换：版画木刻（woodcut） → 剥落做旧（weathered））
  - 承载原则的参数：装饰母题：花叶卷草 → 符文 / 法阵；外框材质：金 → 石；水印层：无 → 符印 / 法阵；外框结构：雕花九宫格 → 平框九宫格
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-motif-from-world#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.character` `vis.ornament=3` `ast.ornaments=corners+dividers+gems` `ast.watermarkOpacity=0.12`
  - A：`vis.motif=floral` `ast.frameMat=gold` `ast.watermark=none` `ast.frame=carvedNinePatch`
  - B：`vis.motif=runes` `ast.frameMat=stone` `ast.watermark=sigil` `ast.frame=plainNinePatch`

  </details>

#### P-material-from-world

**面板材质先问一句“它在世界里是什么做的”：纸、木、石、金属还是屏幕？文字永远落在平静的内芯上**

> 适用品类：角色扮演、策略与战术、建造与经营、工厂与自动化、生活与养成、恐怖与悬疑、解谜与侦探 · 相关：[P-motif-from-world](#p-motif-from-world)、[P-medium-simulation](#p-medium-simulation)、[P-device-bridge](#p-device-bridge) · 风格变体：`fam.parchment`、`fam.holo`、`fam.handmade-craft`

**要解决的问题**

资产型 UI 最常见的做法是把面板做成世界里的物件。GameUI 的材质标签里，书 481、场景化 392、卷轴 210、桌面 186，加起来超过除纸张外所有面板底材的总和。材质选对了，UI 就是世界的一部分；选错了（北欧题材配皮革装订、中世纪配全息），比中性 UI 还糟。材质也决定了动效：纸会展开，墨会晕开，全息会开机。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 纸与书（手稿、日志、卷轴） | <abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=parchment">内芯材质 = 羊皮纸</abbr>；<abbr title="ast.container=book">场景容器 = 书</abbr>；<abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr>；<abbr title="ast.frameMat=leather">外框材质 = 皮革</abbr>；<abbr title="mo.enter=pageTurn">入场动效 = 翻页 / 开书</abbr>；<abbr title="vis.mapStyle=parchment">地图画风 = 羊皮纸古海图</abbr> | 历史、奇幻、推理、学者型主角；日志、图鉴、地图。 | 羊皮纸底上的棕墨对比度常常只有约 4:1（06 文档 B11），正文要实测。 | Potion Craft: Alchemist Simulator（steam:1210320）、Anno 1800（steam:916440）、Inkulinati（steam:957960）、Return of the Obra Dinn（steam:653530）、Chants of Sennaar（steam:1931770） 等 6 款 |
| 木与石（手工、中世纪、塔防） | <abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr>；<abbr title="ast.frameMat=wood">外框材质 = 木</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=paper">内芯材质 = 米白纸</abbr>；<abbr title="vis.depth=bevel">立体与阴影 = 倒角浮雕</abbr>；<abbr title="mo.enter=pop">入场动效 = 弹出缩放（回弹）</abbr> | 世界里的建筑和道具以木、石为主。 | 外框厚，屏占比大；石框适合放在边栏和底座，不适合做浮层。 | Kingdom Rush  - Tower Defense（steam:246420）、Stardew Valley（steam:413150）、Battle for Wesnoth（steam:599390）、Darkest Dungeon（steam:262060）、Pharaoh + Cleopatra（steam:564530） |
| 金属与机械（工业、蒸汽朋克、复古未来） | <abbr title="ast.frame=plainNinePatch">外框结构 = 平框九宫格</abbr>；<abbr title="ast.frameMat=iron">外框材质 = 铁 / 钢 / 拉丝金属</abbr>；<abbr title="ast.coreMat=iron">内芯材质 = 铁 / 钢 / 拉丝金属</abbr>；<abbr title="vis.gloss=metalGrad">光泽高光 = 金属渐变</abbr>；<abbr title="vis.motif=rivets">装饰母题 = 齿轮 / 铆钉 / 铜饰</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr>；<abbr title="mo.enter=slide">入场动效 = 滑入 / 推移</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr> | 工厂、殖民、复古科幻；数值多，适合仪表化。 | 金属渐变上叠字，对比会随渐变段变化（06 文档 B14）。 | Frostpunk（steam:323190）、Evil Genius（steam:3720）、Mr.Mine（steam:1397920）、Widget Inc.（steam:3184110） |
| 屏幕与投影（科幻、现代、系统界面） | <abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=hologram">内芯材质 = 全息网格</abbr>；<abbr title="vis.opacity=0.35">底不透明度 = 0.35</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="vis.strokeColor=accent">描边色 = 强调色</abbr>；<abbr title="vis.strokeGlow=0.5">描边发光 = 0.5</abbr>；<abbr title="mo.enter=boot">入场动效 = 扫描开机</abbr>；<abbr title="mo.textReveal=scramble">文字出现 = 乱码解码</abbr> | 世界里本来就有屏幕、投影、头盔面罩、操作系统。 | 细线加发光叠在亮背景上会消失；需要解释“是谁在投影”（Dead Space 是宇航服）。 | Dead Space（steam:1693980）、Detroit: Become Human（steam:1222140）、Dyson Sphere Program（steam:1366540）、METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Progressbar95（steam:1304550） 等 6 款 |
| 无材质（线描 / 平涂） | <abbr title="ast.core=procedural">内芯结构 = 程序填充</abbr>；<abbr title="ast.frame=cornersOnly">外框结构 = 只有四角件</abbr>；<abbr title="ast.frameMat=lineArt">外框材质 = 线描 / 平涂</abbr>；<abbr title="vis.opacity=0">底不透明度 = 0</abbr> | 画面以线和平色为主，答不出“它在世界里是什么做的”。 | 没有底板时，可读性全靠投影和画面暗部。 | Hollow Knight（steam:367520）、Clair Obscur: Expedition 33（steam:1903340）、Hauntii（steam:2060790） |

**经验法则**

- 每个界面回答一句“它在世界里是什么”：背包是行囊还是箱子，地图是纸图还是投影，日志是一本书。答不出来就用中性材质，别硬造。
- 外框可以重（木、石、金属），内芯必须平静（纸、纯色、半透明）。层级靠“底色 + 深一档内嵌色”的明度差来做（08 文档 3.1）。
- 材质决定入场动效：纸用展开或翻页（unroll / pageTurn），墨用晕开（inkSpread），全息用开机或故障（boot / glitchIn），金属用滑入（slide），塑料用回弹（pop + overshoot）。
- 一款游戏的材质家族最多 2 种主材加 1 种点缀（比如木 + 纸 + 铜角）。
- 位图材质要出 2 倍、3 倍素材，或者改用九宫格平铺，避免超宽屏和 4K 下发虚。

**反例与玩家评价**

- 材质和世界观不符：北欧题材配皮革装订，中世纪配全息，科幻配羊皮纸。
  - 评价与证据（依据：文献）：评测无法计数。GameUI 社区评论（08 文档 2.4，意译）。
- 文字直接压在高对比纹理上（木纹、羊皮纸斑、石刻）。 例：Potion Craft: Alchemist Simulator（steam:1210320）。
  - 评价与证据（依据：截图）：看图：Potion Craft 的羊皮纸书页上排着小字配方。评测侧无可靠计数（原来「羊皮纸家族每款 0.25 条字太小」按旧家族表与未收紧的关键词计算，已撤回）；06 文档 B11 测得棕墨配米黄底的对比度常只有约 4:1，低于 WCAG 正文要求的 4.5:1。
- 固定分辨率的位图框在高分辨率或超宽屏下不缩放。 例：RollerCoaster Tycoon Classic（steam:683900）、BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：「UI 缩放 / 分辨率」去重后 ≥ 2 条的只有 2 款：BioShock Infinite 3 条、RollerCoaster Tycoon Classic 2 条，都是早年的位图 UI。归因到位图材质是推测。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 羊皮纸任务书（`fam.parchment`，皮肤 `skin.parchment`）：羊皮纸：日志是世界里的一本书。
- 全息空间（`fam.holo`，皮肤 `skin.holo`）：全息：科幻世界的面板是投影。
- 手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`）：手工实物：纸艺 / 毛毡世界的面板也是纸和布。
- 17 号图谱反查到的相关家族：`fam.dark-gold`、`fam.ornate-frame`、`fam.skeuo`、`fam.pixel-wood`、`fam.parchment`、`fam.handmade-craft`、`fam.cartographic`、`fam.norse-knotwork`、`fam.antiquity`、`fam.steampunk-brass`、`fam.gothic-tech`、`fam.islamic-persian`、`fam.south-se-asian`、`fam.xianxia`、`fam.ceramic-lacquer`

**出处**

- [Crafting Destruction: The Evolution of the Dead Space User Interface](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of)（S032）：据二手报道：界面被解释为宇航服投射的全息影像，于是几乎任何界面形式都能用“全息”这个材质成立，生命值放在背部灯带上。材质要有世界里的理由。
- [Nielsen Norman Group: Flat Design – Its Origins, Its Problems, and Why Flat 2.0 Is Better for Users](https://www.nngroup.com/articles/flat-design/)（S153）：拟物借现实物件的隐喻提示用法；纯装饰性的真实纹理不提供隐喻；扁平化会丢掉“能点”的提示，所以推荐 Flat 2.0 这类折中。材质要服务于“它是什么、怎么用”。
- [W3C WCAG 2.1: 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum)（S159）：正文对比度至少 4.5:1。纹理底要按最不利的局部测，不能按平均色测。

**可演示的对比**

- **全息面板 vs 皮面日志本（看哪个属于这个世界）**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线）；美术配方依次切换：水彩绘本（watercolor） → 霓虹雨夜（neon-night））
  - 承载原则的参数：内芯材质：全息网格 → 羊皮纸；场景容器：无 → 书
  - 配套改动：底不透明度：0.35 → 1；描边色：强调色 → 同色加深；描边发光：0.5 → 0；入场动效：扫描开机 → 翻页 / 开书；外框结构：程序线框 → 平框九宫格
  - 看什么：先配水彩绘本（watercolor）：B 的日志像画里的一本书，A 的全息面板格格不入。再换到霓虹雨夜（neon-night）：结论倒过来。材质对不对取决于世界，而不是材质本身好不好看。顺便看入场动效：翻页和开机本身就在讲材质。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-material-from-world#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.journal` `ast.core=texture` `vis.stroke=solid` `ast.frameMat=leather`
  - A：`ast.coreMat=hologram` `vis.opacity=0.35` `vis.strokeColor=accent` `vis.strokeGlow=0.5` `mo.enter=boot` `ast.frame=procedural` `ast.container=none`
  - B：`ast.coreMat=parchment` `ast.container=book` `ast.frame=plainNinePatch` `mo.enter=pageTurn` `vis.opacity=1` `vis.strokeColor=darker` `vis.strokeGlow=0`

  </details>
- **单变量版：全息面板 → 只切换 ast.coreMat、ast.container**（单变量对照；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线）；美术配方依次切换：水彩绘本（watercolor） → 霓虹雨夜（neon-night））
  - 承载原则的参数：内芯材质：全息网格 → 羊皮纸；场景容器：无 → 书
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-material-from-world#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.journal` `ast.core=texture` `vis.stroke=solid` `vis.opacity=0.35` `vis.strokeColor=accent` `vis.strokeGlow=0.5` `mo.enter=boot` `ast.frame=procedural`
  - A：`ast.coreMat=hologram` `ast.container=none`
  - B：`ast.coreMat=parchment` `ast.container=book`

  </details>

#### P-medium-simulation

**先问界面在模仿什么载体：操作系统、终端、镜头、转播、印刷品、桌游配件——媒介模拟是一条独立的风格轴**

> 适用品类：射击、竞速与驾驶、叙事与视觉小说、策略与战术、建造与经营、工厂与自动化、沙盒与物理、恐怖与悬疑、解谜与侦探、卡牌与桌面、体育与体育经理 · 相关：[P-material-from-world](#p-material-from-world)、[P-device-bridge](#p-device-bridge)、[P-contrast-with-reason](#p-contrast-with-reason)、[P-medium-constraints](#p-medium-constraints) · 风格变体：`fam.retro-os`、`fam.camera-osd`、`fam.broadcast`

**要解决的问题**

现有的皮肤家族主要按「材质 / 质感」切分（纸、金属、像素、细线），但很多辨识度最高的 UI 其实是在模仿一种载体：Progressbar95（steam:1304550）整局是一台旧电脑，Umurangi Generation（steam:1223500）的界面是相机取景器，Esports Godfather（steam:1278540）借电视转播的比分牌与人名条，Inscryption（steam:1092790）的界面就是牌桌，L.A. Noire（steam:110800 · 据已知描述）是卷宗与笔记本。K1 风格发现统计：47 个缺失或欠代表的 UI 家族里，「媒介模拟」一条轴就占 14 个，它们彼此差别很大，却被塞进了旧家族表里的极简单色（17 号图谱已按 legacyFamilyMap 拆到十几个家族）、拟物、羊皮纸、科幻 HUD；17 号图谱为它们单列了「媒介模拟」门类（fam.camera-osd、fam.broadcast、fam.retro-os 等）。载体一旦定下来，版式惯例（标题栏、比分牌、页码、REC 角标）、控件方言和动效（窗口硬切、斜切划入、翻页、快门黑闪）都会跟着定下来。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 复古桌面操作系统（窗口即关卡） | <abbr title="lay.container=window">容器 = 可拖动窗口</abbr>；<abbr title="vis.corner=sharp">转角 = 直角</abbr>；<abbr title="vis.depth=bevel">立体与阴影 = 倒角浮雕</abbr>；<abbr title="vis.stroke=none">描边线型 = 无描边</abbr>；<abbr title="col.surface=#c0c0c0">面板底色 = #c0c0c0</abbr>；<abbr title="col.accent=#000080">强调色 = #000080</abbr>；<abbr title="col.text=#000000">文字色 = #000000</abbr>；<abbr title="typ.body.family=pixel">正文字族 = 像素</abbr>；<abbr title="ix.focus=invert">导航焦点表现 = 底色反白</abbr>；<abbr title="ix.press=sink">按下反馈 = 下沉到阴影</abbr>；<abbr title="mo.enter=cut">入场动效 = 硬切</abbr>；<abbr title="flow.stacking=stack">叠层表现 = 叠在上面</abbr> | 叙事、元叙事、模拟经营：玩法本身就是在一台虚构电脑上操作（窗口、任务栏、系统对话框）。 | 系统控件的时代方言（双层倒角按钮、标题栏三按钮、沙漏光标）要做得准才像；窗口多了互相遮挡，固定像素窗口的缩放问题最集中。 | Progressbar95（steam:1304550）、Hypnospace Outlaw（steam:844590）、RollerCoaster Tycoon Classic（steam:683900） |
| 终端字符格（一切对齐等宽字符） | <abbr title="typ.body.family=mono">正文字族 = 等宽 / 终端</abbr>；<abbr title="typ.display.family=same">标题字族 = 同正文</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr>；<abbr title="vis.stroke=double">描边线型 = 双线</abbr>；<abbr title="vis.corner=sharp">转角 = 直角</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="col.surface=#000000">面板底色 = #000000</abbr>；<abbr title="col.text=#c0c0c0">文字色 = #c0c0c0</abbr>；<abbr title="cnt.density=4">信息密度 = 极密</abbr>；<abbr title="lay.grouping=divider">分组方式 = 分隔线</abbr>；<abbr title="ix.focus=invert">导航焦点表现 = 底色反白</abbr>；<abbr title="mo.textReveal=instant">文字出现 = 立即</abbr> | 编程解谜、Roguelike、硬核模拟：信息密度极高，框线、进度条、图标都是字符。 | 新手门槛高；中文等宽字宽是拉丁字母的两倍，字符格要按全角重算；CRT 扫描线不是这条路的必需品。 | A=B（steam:1720850）、The Farmer Was Replaced（steam:2060160） |
| 镜头屏显（取景器 / 摄像机 / 监控） | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="vis.opacity=0">底不透明度 = 0</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=2">描边粗细 = 2</abbr>；<abbr title="vis.strokeSides=corners">描边画哪几边 = 只画四角</abbr>；<abbr title="vis.motif=brackets">装饰母题 = 角括号 / 准星角</abbr>；<abbr title="typ.body.family=mono">正文字族 = 等宽 / 终端</abbr>；<abbr title="typ.legibility=shadow">文字可读辅助 = 投影</abbr>；<abbr title="col.strategy=mono">骨架色彩策略 = 单色</abbr>；<abbr title="col.accent=#ff2a2a">强调色 = #ff2a2a</abbr>；<abbr title="el.cta.form=shutter">主行动按钮：画法 = 快门</abbr>；<abbr title="ast.fx=scanlines">叠加特效层 = 扫描线</abbr> | 拍照、调查、伪纪录片与监控恐怖：屏幕本身就是一个镜头（四角取景框、REC + 时间码、电池格、快门）。 | OSD 文字直接压在实时画面上，必须描边或投影；夜视、噪点、色差会吃掉小字，关键读数要排除在失真之外。 | Umurangi Generation（steam:1223500）、TOEM（steam:1307580）、IMMORTALITY（steam:1350200）、Do Not Feed the Monkeys（steam:658850） |
| 电视转播包装（体育 / 电竞 / 综艺） | <abbr title="el.timer.form=scorePill">计时 / 分数 / 回合：画法 = 比分胶囊</abbr>；<abbr title="el.timer.screenAnchor=tc">计时 / 分数 / 回合 · 屏幕锚点 = 上中</abbr>；<abbr title="col.coding=team">语义颜色编码 = 阵营色</abbr>；<abbr title="typ.display.family=condensed">标题字族 = 窄体</abbr>；<abbr title="typ.display.weight=black">标题字重 = 特粗</abbr>；<abbr title="typ.numerals.family=display">数字字体 = 大号展示数字</abbr>；<abbr title="typ.numerals.style=italic">数字斜体 = 斜体</abbr>；<abbr title="vis.skew=-8">倾斜角 = -8</abbr>；<abbr title="vis.corner=chamfer">转角 = 切角</abbr>；<abbr title="cmp.plate=slashBand">标牌 = 斜切色带</abbr>；<abbr title="st.statViz=versusBar">统计图形 = 左右对打条</abbr>；<abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr>；<abbr title="mo.valueChange=countUp">数值变化 = 数字滚动</abbr> | 体育、电竞、竞速、派对综艺：观众已经认得转播的版式（固定比分牌、下三分之一人名条、跑马灯、LOGO 转场）。 | 队色要贯穿全部元素，色盲安全要单独验证；斜切划入与数字滚动很重，高频界面要减配。 | Esports Godfather（steam:1278540）、Circuit Superstars（steam:1097130）、The Jackbox Party Pack 7（steam:1211630） |
| 印刷品与文书（说明书、卷宗、案头表格） | <abbr title="ast.container=book">场景容器 = 书</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr>；<abbr title="ast.coreMat=paper">内芯材质 = 米白纸</abbr>；<abbr title="col.lightness=light">面板明度 = 浅色面板</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="vis.strokeColor=ink">描边色 = 墨色</abbr>；<abbr title="typ.body.family=serif">正文字族 = 衬线 / 宋</abbr>；<abbr title="typ.numbering=arabic">序号样式 = 01 / DAY 1</abbr>；<abbr title="lay.overflow=paged">内容溢出方式 = 分页</abbr>；<abbr title="lay.pageIndicator=numbers">分页指示 = 页码</abbr>；<abbr title="st.done=stamp">完成 / 已领标记 = 盖章</abbr>；<abbr title="mo.enter=pageTurn">入场动效 = 翻页 / 开书</abbr> | 解谜、侦探、文书模拟：读文档本身就是玩法（TUNIC 的说明书页、L.A. Noire 的笔记本、Shadows of Doubt 的推理板、Do Not Feed the Monkeys 的书桌）。 | 纸面上的小字对比常常不过线；长文要分页，要有页码与目录；文书类的拖拽对照要有点选替代。 | TUNIC（steam:553420）、Shadows of Doubt（steam:986130）、Do Not Feed the Monkeys（steam:658850）、L.A. Noire（steam:110800 · 据已知描述） |
| 桌游实物（版图、棋子、骰子、卡牌） | <abbr title="ast.container=tableTop">场景容器 = 牌桌</abbr>；<abbr title="ast.containerSurface=table">容器放在哪 = 桌面 / 地面</abbr>；<abbr title="ctx.players=board">同屏玩家与视口 = 桌游多人</abbr>；<abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr>；<abbr title="col.coding=player">语义颜色编码 = 玩家 / 频道色</abbr>；<abbr title="vis.depth=softDrop">立体与阴影 = 柔投影</abbr>；<abbr title="vis.corner=round">转角 = 圆角</abbr>；<abbr title="mo.reveal=flip">揭示方式 = 翻牌</abbr>；<abbr title="ix.mode=drag">主交互模式 = 拖拽</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr> | 卡牌、数字桌游、回合战术：UI 就是桌上的配件，规则以计分轨、算子数字的形式摆在桌面上。 | 3/4 俯视的配件透视会压扁数字；每位玩家一色时要另配编号或图形；拖拽必须有点选替代（见 P-input-parity）。 | Inscryption（steam:1092790）、Wingspan（steam:1054490）、Armello（steam:290340）、100% Orange Juice（steam:282800）、Slice & Dice（steam:1775490） |

**经验法则**

- 先写一句「这块屏幕在世界里是什么设备 / 物件」：电脑、终端、相机、转播车、说明书、档案夹、牌桌。写不出来，就回到材质与中性（P-material-from-world、P-neutral-one-voice）。
- 载体定下来以后，跟着继承它的版式惯例与控件方言：OS 的标题栏与倒角按钮、转播的比分牌与下三分之一人名条、相机的 REC 与时间码、手册的章节号与页码——不要只借颜色和滤镜。
- 动效也来自载体：窗口硬切、斜切划入、快门黑闪、翻页、逐字打印（见 P-motion-personality）。
- 载体的「毛病」只借观感、不借痛点：老 OS 的固定像素、CRT 的闪烁、胶片的强颗粒都要可关，或只作用在大字与边框上（见 P-medium-constraints）。
- 媒介模拟与材质皮肤是两条独立的轴：一张卡可以同时是「复古 OS」（载体）与「像素位图」（质感）；探索台里应该能分开切换。

**反例与玩家评价**

- 只借质感不借惯例：用了终端绿字和扫描线，排版却仍是普通圆角面板，像贴了一层滤镜。
  - 评价与证据（依据：推断）：评测无法计数；K1 风格发现指出 CRT 终端皮肤只描述了显示器效果，并不是字符格排版，是这一类缺口的典型。
- 载体的年代缺陷原样保留：固定像素窗口不随分辨率缩放，闪烁与噪点压在小字上。 例：RollerCoaster Tycoon Classic（steam:683900）。
  - 评价与证据（依据：评测）：R3「UI 缩放 / 分辨率」：RollerCoaster Tycoon Classic 去重后 2 条（多窗口、固定像素的经典界面）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 复古桌面操作系统（`fam.retro-os`）：复古桌面操作系统：整局是一台旧电脑（Progressbar95、Hypnospace Outlaw）。
- 镜头屏显：取景器 / 摄像机 / 监控（`fam.camera-osd`）：镜头屏显：界面是取景器（Umurangi Generation）。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播：比分牌与人名条（Esports Godfather）。
- 17 号图谱反查到的相关家族：`fam.printed-manual`、`fam.comic`、`fam.crt`、`fam.industrial-scifi`、`fam.cassette-futurism`、`fam.retro-os`、`fam.raw-web`、`fam.outsider`、`fam.camera-osd`、`fam.silent-film`、`fam.theatre-stage`、`fam.desk-paperwork`、`fam.tabletop`、`fam.steampunk-brass`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：元表现（在故事里、但画在游戏空间之外）的典型是角色持有的设备：它能解释「为什么玩家看得到这些信息」。
- [HUDS+GUIS（及配套书 FUI: How to Design User Interfaces for Film and Games）](https://www.hudsandguis.com/)（S077）：收录电影、游戏与真实产品中的虚构界面，关注功能、外观、动效与声音——研究一种设备界面的版式与动效惯例的取材入口。
- [Yacht Club Games: Breaking the NES](https://www.yachtclubgames.com/blog/breaking-the-nes/)（S114）：保留 NES 的观感（色板、状态栏习惯），去掉闪烁等伤害体验的限制：模仿一种媒介时只借观感，不借毛病。
- [本项目 K1 风格发现（discover.json）](data/k1/discover.json)（S189）：47 个缺失 / 欠代表家族中有 14 个属于「媒介模拟」轴（复古 OS、终端字符格、镜头屏显、转播、印刷手册、默片、1-bit 抖动等）；现有家族按材质切分，缺这一条轴。

**可演示的对比**

- **通用深色面板 vs 头盔摄像机的取景器 OSD**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：屏幕叠加 → 叙事内；叠加特效层：自动 → 扫描线；正文字族：无衬线 → 等宽 / 终端；描边画哪几边：四边 → 只画四角
  - 配套改动：UI 与画面关系：中性 → 自动；面板明度：深色面板 → 中明度；底不透明度：0.75 → 0；描边粗细：1 → 2；骨架色彩策略：中性 + 一两个强调色 → 单色；强调色：#3a6ea5 → #ff2a2a；文字可读辅助：自动 → 投影；装饰母题：无 → 角括号 / 准星角
  - 看什么：同一个射击 HUD：A 是通用的深色半透明面板；B 只换了载体——变成「头盔摄像机」：面板消失，四角取景角标，等宽 OSD 字加投影，REC 红是唯一强调色，轻扫描线。元素和位置都没变，界面从「游戏面板」变成了「镜头里的读数」。再把 B 换成转播（斜切划入 + 比分胶囊）或印刷品（纸 + 墨线 + 页码）各看一遍，体会载体轴和材质轴是两回事。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-medium-simulation#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `vis.stroke=solid`
  - A：`rel.harmony=neutral` `col.lightness=dark` `vis.opacity=0.75` `vis.strokeWidth=1` `typ.body.family=sans` `col.strategy=neutralAccent` `ast.fx=auto` `col.accent=#3a6ea5` `rel.diegesis=screen` `typ.legibility=auto` `vis.motif=none` `vis.strokeSides=all`
  - B：`rel.diegesis=diegetic` `vis.opacity=0` `vis.strokeWidth=2` `vis.strokeSides=corners` `vis.motif=brackets` `typ.body.family=mono` `typ.legibility=shadow` `col.strategy=mono` `col.accent=#ff2a2a` `ast.fx=scanlines` `col.lightness=mid` `rel.harmony=auto`

  </details>
- **单变量版：通用深色面板 → 只切换 rel.diegesis、ast.fx、typ.body.family、vis.strokeSides**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：屏幕叠加 → 叙事内；叠加特效层：自动 → 扫描线；正文字族：无衬线 → 等宽 / 终端；描边画哪几边：四边 → 只画四角
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-medium-simulation#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `vis.stroke=solid` `rel.harmony=neutral` `col.lightness=dark` `vis.opacity=0.75` `vis.strokeWidth=1` `col.strategy=neutralAccent` `col.accent=#3a6ea5` `typ.legibility=auto` `vis.motif=none`
  - A：`rel.diegesis=screen` `ast.fx=auto` `typ.body.family=sans` `vis.strokeSides=all`
  - B：`rel.diegesis=diegetic` `ast.fx=scanlines` `typ.body.family=mono` `vis.strokeSides=corners`

  </details>

#### P-contrast-with-reason

**刻意对比要有理由，而且只在一两个轴上反差：UI 是“另一层语言”，但仍和世界共用一个通道**

> 适用品类：动作与 Roguelite、射击、角色扮演、策略与战术、卡牌与桌面 · 相关：[P-harmony-four-relations](#p-harmony-four-relations)、[P-palette-roles](#p-palette-roles)、[P-medium-simulation](#p-medium-simulation) · 风格变体：`fam.persona-collage`、`fam.swiss`、`fam.meta-ui`

**要解决的问题**

有些最受赞誉的 UI 恰恰和画面不像：Persona 5 和 Metaphor 的平面拼贴压在 3D 卡通世界上，Control 的瑞士网格压在写实的粗野主义建筑里，Exocolonist 的蓝色半透明设备界面压在水彩世界上。它们的共同点是：反差有叙事或玩法上的理由，而且只发生在一两个轴上（媒介、明度、几何），另一个通道仍然和世界相连（色、母题或概念）。没有理由的反差会被看成贴皮，有评论就认为 P5 Tactica 换成构成主义 UI 显得浮于表面。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 平面设计层（拼贴、剪纸）压在 3D 世界上，靠颜色相连 | <abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr>；<abbr title="col.source=uiPalette">UI 取色来源 = 独立控件色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr>；<abbr title="vis.skew=-8">倾斜角 = -8</abbr>；<abbr title="vis.edge=ornate">边缘处理 = 异形轮廓</abbr>；<abbr title="typ.display.family=ransom">标题字族 = 拼贴勒索信</abbr>；<abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr>；<abbr title="mo.duration=0.25">动效时长 = 0.25</abbr> | 菜单驱动、角色驱动，UI 本身就是作品的表达。 | 动画多了会被嫌慢：「UI 卡顿」去重后 ≥ 2 条的两款之一是 DEATHLOOP；Persona 5 开发中也削减过遮挡画面的动画。 | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、Esports Godfather（steam:1278540）、DEATHLOOP（steam:1252330 · 据已知描述） |
| 理性网格压在有机或写实的世界上，靠概念相连 | <abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="vis.corner=sharp">转角 = 直角</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="vis.strokeSides=left">描边画哪几边 = 只画左边</abbr>；<abbr title="typ.display.family=sans">标题字族 = 无衬线</abbr>；<abbr title="typ.display.weight=black">标题字重 = 特粗</abbr>；<abbr title="typ.scale=2">字号阶梯比 = 2</abbr>；<abbr title="vis.pattern=diagStripes">图案叠层 = 斜线条纹</abbr>；<abbr title="vis.patternOpacity=0.2">图案强度 = 0.2</abbr> | 世界观里有机构、档案、科学仪器这类“理性层”，UI 就是那一层。 | 冷。CONTROL 有 5 条「地图难用」、3 条「引导不清」：反差层再干净，信息组织不好照样被骂。 | CONTROL（steam:870780）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Mu Cartographer（steam:513360） |
| 设备界面：世界里存在的另一种媒介 | <abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr>；<abbr title="ast.coreMat=hologram">内芯材质 = 全息网格</abbr>；<abbr title="vis.opacity=0.6">底不透明度 = 0.6</abbr>；<abbr title="vis.corner=chamfer">转角 = 切角</abbr>；<abbr title="col.source=uiPalette">UI 取色来源 = 独立控件色板</abbr>；<abbr title="typ.display.family=sans">标题字族 = 无衬线</abbr>；<abbr title="mo.enter=boot">入场动效 = 扫描开机</abbr>；<abbr title="ast.core=texture">内芯结构 = 材质平铺</abbr> | 世界观里有平板、终端、机器人翻译器、义体系统。 | 设备感要贯穿所有界面；菜单的“壳”就是这台设备（08 文档 3.2 的叙事内设备家族）。 | I Was a Teenage Exocolonist（steam:1148760）、Dead Space（steam:1693980）、Stray（steam:1332010）、Among Us（steam:945360）、Cyberpunk 2077（steam:1091500） |
| 清晰度反差：风格化世界 + 干净的战术读数层 | <abbr title="rel.harmony=contrast">UI 与画面关系 = 刻意对比</abbr>；<abbr title="el.threat.form=intent+telegraph">敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字 + 地面预警区</abbr>；<abbr title="el.overlay.form=gridHighlight">信息叠层 / 图例：画法 = 格子高亮</abbr>；<abbr title="col.strategy=neutralAccent">骨架色彩策略 = 中性 + 一两个强调色</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr> | 战术、策略、卡牌：玩法信息必须精确，风格交给画面。 | 风格感主要靠画面承担。 | Into the Breach（steam:590380）、Slay The Spire（iig:slay-the-spire）、Slice & Dice（steam:1775490）、Shogun Showdown（steam:2084000） |

**经验法则**

- 用一句话写下反差的理由：设备、系统、角色视角，或者玩法清晰。写不出来就退回统一调色。
- 只在 1–2 个轴上做反差（媒介、明度、几何、饱和度里选一两个），至少留一个通道和世界相连（主色、母题或概念）。
- 反差 UI 里的强调必须稀少才有效（Von Restorff）：整屏都在“跳”，就没有焦点了。
- 高频界面的入场动效不超过 0.25 秒，并且可以跳过；华丽演出留给低频节点。
- 探索台的 fromArt 表给每个美术配方都配了一个 contrast 默认皮肤，拿它当起点，再按上面两条收窄。

**反例与玩家评价**

- 没有理由的反差：换一套流行风格（构成主义、Y2K、赛博）当皮肤，和世界、和故事都不相连。
  - 评价与证据（依据：推断）：评测无法计数。Inverse 评论 P5 Tactica 的构成主义 UI 和故事联系很浅（意译），并说明向开发方询问是否有意为之但没有得到回复。
- 反差层动画过重，拖慢高频操作。 例：Cyberpunk 2077（steam:1091500）、DEATHLOOP（steam:1252330 · 据已知描述）。
  - 评价与证据（依据：评测）：「UI 卡顿」去重后 ≥ 2 条的只有 DEATHLOOP、Cyberpunk 2077 各 2 条，两款都是风格化很重的界面。证据很弱。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- Persona 拼贴（`fam.persona-collage`，皮肤 `skin.persona`）：Persona 拼贴：反差在形状与字，颜色呼应世界主色。
- 瑞士几何 / 极简表格（`fam.swiss`，皮肤 `skin.swiss`）：瑞士几何：CONTROL 的冷静表格叠在超自然场景上，反差有叙事理由（官僚机构）。
- 元界面 / 故障破坏（`fam.meta-ui`）：元界面：界面故障本身就是故事（反差来自元叙事）。
- 17 号图谱反查到的相关家族：`fam.atompunk`、`fam.constructivist`、`fam.outsider`、`fam.meta-ui`、`fam.stained-glass`、`fam.cyberpunk`、`fam.african-pattern`、`fam.oceania-indigenous`、`fam.dunhuang`

**出处**

- [Inverse: Persona 5 Tactica's user interface](https://inverse.com/gaming/persona-5-tactica-user-interface)（S090）：作者认为构成主义让菜单更好读，但它和故事的个人主义反叛并不契合，显得浮于表面；对比 P5 的 UI 和叙事绑在一起。
- [Wikipedia, Persona 5（Art design）](https://en.wikipedia.org/wiki/Persona_5)（S192）：导演希望界面表达“换个视角，平凡生活也能变精彩”，反差 UI 和主题绑定；同时削减了过多的动画。
- [Rock Paper Shotgun 2018：Into the Breach 界面设计报道](https://www.rockpapershotgun.com/2018/03/05/into-the-breach-interface-design/)（S097）：开发者表示为了清晰宁可放弃酷的点子；敌人意图直接画在格子上（原文未能在本轮核实）。
- [Laws of UX: Von Restorff Effect](https://lawsofux.com/von-restorff-effect/)（S146）：与众不同的元素最容易被注意，但强调过多就互相抵消。

**可演示的对比**

- **与画面无关的多色拼贴 vs 取色回到场景的拼贴**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线）；美术配方依次切换：赛璐璐动画（cel-anime） → 漫画网点（manga-halftone））
  - 承载原则的参数：UI 取色来源：独立控件色板 → 取自场景色板；骨架色彩策略：骨架多色 → 双色调
  - 看什么：配赛璐璐动画（cel-anime）或漫画网点（manga-halftone）。两边都是拼贴，A 的多色与画面无关，像弹出了另一款游戏；B 只改了取色来源，反差留在形状和字上，颜色把它拉回世界。这就是“只在一两个轴上反差”。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-contrast-with-reason#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.pause` `rel.harmony=contrast` `vis.skew=-8` `vis.edge=ornate` `typ.display.family=ransom` `mo.enter=slashIn`
  - A：`col.source=uiPalette` `col.strategy=polychrome`
  - B：`col.source=scene` `col.strategy=duotone`

  </details>

#### P-neutral-one-voice

**中性 UI 不等于没有风格：用一个“声部”（标题字、一个强调色或一种转角）保住身份，其余让给画面和信息**

> 适用品类：角色扮演、策略与战术、建造与经营、工厂与自动化、生存与制作 · 相关：[P-harmony-four-relations](#p-harmony-four-relations)、[P-density-tempo](#p-density-tempo)、[P-title-lettering](#p-title-lettering) · 风格变体：`fam.dark-hairline`、`fam.thin-geo`、`fam.sim-panel`

**要解决的问题**

信息密集的经营、战略、MMO，或者画面写实、章节多变的作品，常选中性 UI（17 号图谱 2026-10-15 版的主归属：暗色细线 26 张、模拟 / 策略工具面板 24 张；极简门类 102 张——零 HUD 39、情境渐显 37、细字直压 8、空间排印 / 文字即世界 0、单色线描 4、扁平几何 14）。中性做不好会“像 App、像后台”（06 文档 B4 的陷阱）。做得好的作品都只留一个声部：Elden Ring 是衬线小型大写，Witcher 3 是卷草母题，Stellaris 是青绿细边，Death Stranding 是白色全大写细字。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 暗色细线 + 衬线（写实奇幻） | <abbr title="rel.harmony=neutral">UI 与画面关系 = 中性</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="vis.opacity=0.75">底不透明度 = 0.75</abbr>；<abbr title="vis.fill=gradient">程序填充 = 渐变</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeWidth=1">描边粗细 = 1</abbr>；<abbr title="vis.strokeColor=metal">描边色 = 金属金 / 铜</abbr>；<abbr title="typ.display.family=serif">标题字族 = 衬线</abbr>；<abbr title="typ.display.case=smallCaps">标题大小写 = 小型大写</abbr>；<abbr title="vis.ornament=1">装饰预算 = 少</abbr> | 写实 3D 奇幻、魂系、写实 RPG。 | 细线和小衬线在电视远看时发虚。 | ELDEN RING（steam:1245620）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、重返未来：1999（gameui:4596）、Lies of P（steam:1627720 · 据已知描述） |
| 深色半透明 + 一个强调色（科幻、经营） | <abbr title="rel.harmony=neutral">UI 与画面关系 = 中性</abbr>；<abbr title="col.lightness=dark">面板明度 = 深色面板</abbr>；<abbr title="vis.opacity=0.8">底不透明度 = 0.8</abbr>；<abbr title="col.strategy=neutralAccent">骨架色彩策略 = 中性 + 一两个强调色</abbr>；<abbr title="vis.corner=sharp">转角 = 直角</abbr>；<abbr title="vis.stroke=solid">描边线型 = 实线</abbr>；<abbr title="vis.strokeSides=left">描边画哪几边 = 只画左边</abbr>；<abbr title="vis.strokeColor=accent">描边色 = 强调色</abbr> | 太空战略、殖民、工厂：画面复杂、信息很多。 | 强调色要和场景里的发光物区分开。 | Stellaris（steam:281990）、Timberborn（steam:1062090）、Satisfactory（steam:526870）、Before We Leave（steam:1073910）、Megaquarium（steam:600480） |
| 浅色圆角卡（休闲经营） | <abbr title="rel.harmony=neutral">UI 与画面关系 = 中性</abbr>；<abbr title="col.lightness=light">面板明度 = 浅色面板</abbr>；<abbr title="vis.corner=round">转角 = 圆角</abbr>；<abbr title="vis.cornerSize=20">圆角 / 切角大小 = 20</abbr>；<abbr title="vis.depth=softDrop">立体与阴影 = 柔投影</abbr>；<abbr title="vis.iconStyle=flat">图标风格 = 扁平填充</abbr> | 明亮、休闲、面向大众的经营游戏。 | 最容易像 App，要靠图标风格或标题字补一个声部。 | Planet Zoo（steam:703080）、Parkasaurus（steam:591460）、Bad North（steam:688420）、Two Point Museum（steam:2185060 · 据已知描述） |
| 灰盒 / 工具风（信息即玩法） | <abbr title="rel.harmony=neutral">UI 与画面关系 = 中性</abbr>；<abbr title="col.strategy=mono">骨架色彩策略 = 单色</abbr>；<abbr title="vis.depth=bevel">立体与阴影 = 倒角浮雕</abbr>；<abbr title="typ.body.family=mono">正文字族 = 等宽 / 终端</abbr>；<abbr title="cnt.density=4">信息密度 = 极密</abbr> | 数值、表格、程序就是玩法本身。 | 只适合硬核受众；新手门槛高。 | Songs of Syx（steam:1162750）、RollerCoaster Tycoon Classic（steam:683900）、Your Only Move Is HUSTLE（steam:2212330）、Melvor Idle（steam:1267910）、Factorio（steam:427520） |

**经验法则**

- 中性皮肤也要指定一个声部并写进规格：标题字族、一个强调色、一种转角或一个母题，四选一到二。
- 信息密度达到“密集”以上时，优先用中性加一个声部，把风格预算转给标题、读取页、图鉴这些低频界面。
- 中性不等于删功能：小地图、底板、图例是信息，不是装饰。
- 画面每章、每个生物群系换风格时，中性 UI 是唯一稳定的锚点，强调色可以跟场景走（见 P-follow-world-over-time）。

**反例与玩家评价**

- 把中性理解成什么都不选：默认控件、系统字体、没有强调色。
  - 评价与证据（依据：背景）：评测里“菜单难用”去重后集中在信息密集的建造 / 生存类（Valheim 7 条，Parkasaurus、Dyson Sphere Program、Palworld 各 3 条）。中性风格本身不是病因，但中性 UI 没有了用风格弥补的余地，信息组织就是全部。
- 为了优雅把功能 UI 一起删掉（没有小地图、没有底板、没有图例）。 例：Clair Obscur: Expedition 33（steam:1903340）。
  - 评价与证据（依据：评测）：Clair Obscur 有 13 条“地图难用 / 没有地图”，是全库单款最多（去重后不变）。原来「线描花饰家族 4 款每款 3.5 条」按旧家族表计算，已撤回。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：唯一声部是衬线小型大写标题。
- 细线几何（`fam.thin-geo`，皮肤 `skin.thinGeo`）：细线几何：唯一声部是白色全大写细字（DEATH STRANDING）。
- 模拟 / 策略工具面板（`fam.sim-panel`，皮肤 `skin.godotDefault`）：模拟 / 策略工具面板：唯一声部是一根强调色竖线或一个等宽数字字体。
- 17 号图谱反查到的相关家族：`fam.dark-hairline`、`fam.anime-card`、`fam.greybox`、`fam.flat`、`fam.swiss`

**出处**

- [Nielsen Norman Group: Flat Design – Its Origins, Its Problems, and Why Flat 2.0 Is Better for Users](https://www.nngroup.com/articles/flat-design/)（S153）：扁平化常常把潮流外观放在用户需求之前，丢掉“能点”的提示；Flat 2.0 用少量阴影和层次找回提示。中性不是去掉一切，而是留下必要的提示与一个声部。
- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：目标是玩法清楚、层级保留、噪声最小。中性 UI 的价值就在这里，但层级要靠排版和强调来建立。

**可演示的对比**

- **调试面板式中性 vs 中性 + 一个声部**（整套做法对照（多个参数一起变）；内容包：colony · 寒光营地；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：标题字族：同正文 → 衬线；标题大小写：自动 → 小型大写；描边画哪几边：四边 → 只画左边；骨架色彩策略：单色 → 中性 + 一两个强调色
  - 配套改动：面板明度：中明度 → 深色面板；描边色：同色加深 → 强调色；底不透明度：1 → 0.8
  - 看什么：两边都是中性的殖民模拟 HUD。B 只多了衬线小型大写标题和左侧一条强调色线，就从“调试面板”变成了“有作者的界面”，信息密度和布局完全没动。再在 B 上把衬线换成书法或像素，体会“一个声部”能把同一个中性 UI 推向不同题材。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-neutral-one-voice#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=colony` `cnt.screen=screen.hud` `rel.harmony=neutral` `vis.ornament=0` `vis.stroke=solid`
  - A：`col.strategy=mono` `col.lightness=mid` `typ.display.family=same` `vis.strokeColor=darker` `typ.display.case=auto` `vis.opacity=1` `vis.strokeSides=all`
  - B：`col.strategy=neutralAccent` `col.lightness=dark` `vis.opacity=0.8` `typ.display.family=serif` `typ.display.case=smallCaps` `vis.strokeSides=left` `vis.strokeColor=accent`

  </details>
- **单变量版：调试面板式中性 → 只切换 typ.display.family、typ.display.case、vis.strokeSides、col.strategy**（单变量对照；内容包：colony · 寒光营地；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：标题字族：同正文 → 衬线；标题大小写：自动 → 小型大写；描边画哪几边：四边 → 只画左边；骨架色彩策略：单色 → 中性 + 一两个强调色
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-neutral-one-voice#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=colony` `cnt.screen=screen.hud` `rel.harmony=neutral` `vis.ornament=0` `vis.stroke=solid` `col.lightness=mid` `vis.strokeColor=darker` `vis.opacity=1`
  - A：`typ.display.family=same` `typ.display.case=auto` `vis.strokeSides=all` `col.strategy=mono`
  - B：`typ.display.family=serif` `typ.display.case=smallCaps` `vis.strokeSides=left` `col.strategy=neutralAccent`

  </details>

#### P-follow-world-over-time

**UI 跟着世界“变”：按章节、昼夜、区域、状态换色换质，让 UI 成为叙事的一部分**

> 适用品类：探索与冒险、叙事与视觉小说、策略与战术、生活与养成、生存与制作、解谜与侦探 · 相关：[P-palette-roles](#p-palette-roles)、[P-text-over-live-scene](#p-text-over-live-scene) · 风格变体：`fam.flat-map`、`fam.retro-os`、`fam.zero-hud`

**要解决的问题**

画面会随章节、昼夜、区域和角色状态变化，而 UI 常常只有一套固定皮肤，到了雪地、夜晚或某个关键章节就显得不搭，甚至看不清。参考库里有作品让 UI 跟着世界走：GRIS 用颜色逐步回归来表达进程，Mini Metro 有浅、深两套配色，Progressbar95 每个时代换一套操作系统皮肤，SPORE 每个阶段的 HUD 都不同，Hauntii 不同区域是不同的双色调，Pentiment 的字体随主角对人物的了解而改变。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 随场景或昼夜换色（骨架不变） | <abbr title="col.dynamic=perScene">主题色变化 = 随场景 / 昼夜</abbr>；<abbr title="col.source=scene">UI 取色来源 = 取自场景色板</abbr>；<abbr title="col.strategy=duotone">骨架色彩策略 = 双色调</abbr> | 画面有明显的昼夜或区域色调变化。 | 每个场景色板都要过一次对比度检查。 | Hauntii（steam:2060790）、Mini Metro（steam:287980）、TOEM（steam:1307580） |
| 每章换配色或换皮（叙事进程） | <abbr title="col.dynamic=perChapter">主题色变化 = 每章换配色</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr>；<abbr title="el.title.form=titleCard">标题 / LOGO：画法 = 章节标题卡</abbr> | 章节结构清楚、情绪曲线明显的叙事作品；换皮本身就是剧情。 | 每一章都要做一套皮肤；位置和语义色必须保持不变，否则会打乱肌肉记忆。 | GRIS（steam:683320）、Progressbar95（steam:1304550）、SPORE（steam:17390） |
| 随形态或机制切换（状态就是皮肤） | <abbr title="col.dynamic=perMode">主题色变化 = 随形态 / 机制切换</abbr>；<abbr title="el.overlay.form=holo">信息叠层 / 图例：画法 = 全息覆盖</abbr>；<abbr title="rel.sceneTone=tint">背后调色 = 整体着色</abbr>；<abbr title="rel.metaFx=edgeGlow">元 UI 屏幕效果 = 边缘光框</abbr> | 侦查、扫描、狂暴这类短时状态：整屏换调，UI 一起换色。 | 状态要有明确的进入和退出提示，持续时间要短。 | Hardspace: Shipbreaker（steam:1161580）、Detroit: Become Human（steam:1222140）、Batman: Arkham Knight（steam:208650 · 据已知描述）、Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述） |
| 随角色或阵营切换（谁在说话就用谁的字与色） | <abbr title="col.dynamic=perFaction">主题色变化 = 随阵营</abbr>；<abbr title="cnt.screen=screen.dialogue">界面类型 = 对话 / 文本</abbr>；<abbr title="typ.display.family=calligraphy">标题字族 = 书法</abbr> | 多阵营战略、无配音叙事：字和色就是角色的声音。 | 字体和配色的数量成倍增加；要给玩家“统一字体”的辅助开关。 | Pentiment（steam:1205520）、Sid Meier’s Civilization® VI（steam:289070） |
| 固定（最稳定） | <abbr title="col.dynamic=fixed">主题色变化 = 固定</abbr> | 竞技、信息密集、玩家要长时间建立肌肉记忆的游戏。 | 极端场景（雪地、强光、黑夜）里可能看不清，要靠 D-lightness 和文字可读辅助兜底。 | ELDEN RING（steam:1245620）、Songs of Syx（steam:1162750）、Overwatch（iig:overwatch） |

**经验法则**

- 可变的只有骨架色（底、强调）和材质、母题；位置、图标形状、语义色（危险、敌我、稀有度）永远不变。
- 每个场景色板都要跑一次对比度检查（chk.contrast），换色最容易在最亮和最暗的场景出问题。
- 用 UI 表达叙事进程（GRIS 式的“颜色回来了”）成本低、效果强：把 col.dynamic = perChapter 和章节标题卡一起设计。
- 短时状态（侦查、扫描、狂暴）可以整屏换调（rel.sceneTone）加 UI 换色，但时间要短，开关要明确。
- 为了这种动态，探索台的 UI 色板最好始终用“角色引用”（@accent、@surface），不要写死颜色值。

**反例与玩家评价**

- UI 只有一套固定颜色，进入雪地、夜晚或强光章节后，强调色被吞掉或对比不足。
  - 评价与证据（依据：推断）：评测没有按场景拆分，无法计数；D-lightness 规则就是为这个问题设的。
- 换皮时连位置和语义色一起改，破坏肌肉记忆。
  - 评价与证据（依据：推断）：无计数。建议只换骨架色与材质，不动位置、图标形状和语义色。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 扁平几何 · 地图即界面（`fam.flat-map`，皮肤 `skin.flat`）：扁平几何：浅色 / 深色两套配色随昼夜切换（Mini Metro）。
- 复古桌面操作系统（`fam.retro-os`）：复古操作系统：每个时代换一套系统皮肤（Progressbar95）。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：颜色随进程逐步回归（GRIS）。
- 17 号图谱反查到的相关家族：`fam.synthwave`、`fam.south-se-asian`、`fam.dunhuang`

**出处**

- [PCGamesN: Pentiment 的美术与字体](https://www.pcgamesn.com/pentiment/art-fonts-story)（S095）：字体按主角对每个人的看法分配，看法改变时字体也会变，用来反映这个人真正是谁。UI 的变化本身就是叙事。
- [W3C WCAG 2.1: 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum)（S159）：正文对比度至少 4.5:1。UI 跟着场景换色时，每一套色板都要单独达标。

**可演示的对比**

- **固定浅色面板 vs 跟着场景色板换底换强调**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线）；场景依次切换：白天雪地（snowVillage） → 夜间（snowVillage））
  - 承载原则的参数：主题色变化：固定 → 随场景 / 昼夜；UI 取色来源：皮肤固定色 → 取自场景色板
  - 配套改动：面板明度：浅色面板 → 自动
  - 看什么：在美术侧切换时段和天气（白天雪地 ↔ 夜晚篝火）。A 的浅色面板在雪地里几乎消失，到了夜里又像一块发光的广告牌；B 跟着场景色板和明度规则自动换底、换强调，HUD 的位置和图标一点没动。顺手打开对比度检查，在最亮和最暗两个场景各看一次。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-follow-world-over-time#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud` `vis.opacity=0.85`
  - A：`col.dynamic=fixed` `col.source=skin` `col.lightness=light`
  - B：`col.dynamic=perScene` `col.source=scene` `col.lightness=auto`

  </details>

#### P-icon-system

**图标是一套词汇表：先保证剪影可辨，全游戏一种画法，高频图标可以不带字、低频必须带字，状态记号全局统一**

> 适用品类：所有品类 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-channel-borrowing](#p-channel-borrowing)、[P-item-decision](#p-item-decision)、[P-glance-encoding](#p-glance-encoding)、[P-progression-graph](#p-progression-graph) · 风格变体：`fam.mono-line`、`fam.dark-hairline`、`fam.pixel`

**要解决的问题**

图标在这份文档里出现了两百多次，却是最常被「各画各的」的东西：背包用写实渲染、技能用线性、地图用扁平，锁定在背包里是灰度、在技能树里是锁头、在地图上是问号。玩家每换一个界面就要重新学一遍。图标的做法谱系从轻到重是线性、填充（扁平）、剪影、彩绘、写实 / 3D 渲染、像素，每种都有它适合的画面与尺寸（17 号图谱的「图标」轴，vis.iconStyle）。不管选哪一种，规则是同一套：16–24px 下仍能靠剪影认出来；全游戏只用一种画法；按使用频率决定要不要配文字；锁定 / 新 / 已装备 / 完成这类状态记号在所有界面上一个语义一种画法。参数上对应 vis.iconStyle、ast.iconSet、st.locked、st.newCue、st.selected、st.done、cmp.badge。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 线性 / 填充（扁平） | <abbr title="vis.iconStyle=line">图标风格 = 线性</abbr>；<abbr title="ast.iconSet=procedural">图标集来源 = 程序几何</abbr> | 中性、极简、科幻、系统菜单：线宽统一、可程序化生成，任何尺寸都清楚。 | 辨识度靠剪影，个性要交给标题字与配色。 | CONTROL（steam:870780）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Mini Metro（steam:287980） |
| 剪影 | <abbr title="vis.iconStyle=silhouette">图标风格 = 剪影</abbr> | 小尺寸、远视距、需要一眼区分的类别（资源、兵种、地图标记）。 | 细节少，同类物品（铜 / 铁 / 锡）要靠颜色与外框区分，注意色盲。 | Factorio（steam:427520）、Into the Breach（steam:590380） |
| 彩绘 / 手绘 | <abbr title="vis.iconStyle=painted">图标风格 = 手绘彩绘</abbr>；<abbr title="ast.iconSet=asset">图标集来源 = 图集素材</abbr> | 同一媒介的风格化作品（手绘、水彩、Q 版）：物品图标和世界同一支笔。 | 每个图标都是资产；小尺寸下要单独出简化版。 | Hades（steam:1145360）、Potion Craft: Alchemist Simulator（steam:1210320）、Don't Starve（steam:219740 · 据已知描述） |
| 写实 / 3D 渲染 | <abbr title="vis.iconStyle=render3d">图标风格 = 3D 渲染</abbr>；<abbr title="ast.iconSet=runtimeRender">图标集来源 = 游戏内实时渲染</abbr> | 写实 3A、装备驱动的 RPG：物品本身的外观就是信息（暗色细线家族的去饱和写实渲染）。 | 小尺寸剪影最弱；要统一光照方向与背景。 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720） |
| 像素 | <abbr title="vis.iconStyle=pixel">图标风格 = 像素</abbr>；<abbr title="vis.pixelScale=x2">UI 像素化 = 2 倍像素</abbr> | 像素作：图标与世界同一网格（D-pixel）。 | 非整数缩放会糊；中文像素字另有字符集问题。 | Balatro（steam:2379780）、Hyper Light Drifter（steam:257850） |
| 全局状态词汇：一个语义一种画法 | <abbr title="st.locked=lock">锁定 / 未获得表现 = 锁图标</abbr>；<abbr title="st.newCue=newTag">新内容 / 可领提示 = NEW 角标</abbr>；<abbr title="st.selected=check">已选 / 已装备标记 = 勾选角标</abbr>；<abbr title="st.done=stamp">完成 / 已领标记 = 盖章</abbr> | 所有作品：锁定、新、已装备、完成、冷却各选一种画法，在背包、技能树、地图、图鉴里完全一致，并且彼此占不同的视觉通道。 | 要在设计早期定一张状态词汇表并在每个界面检查。 | Hollow Knight（steam:367520）、Slay The Spire（iig:slay-the-spire） |

**经验法则**

- 先在 16–24px 下测剪影：去掉颜色和细节以后仍能认出来，才算一个图标。
- 全游戏只用一种图标画法（线宽、透视、光照、配色一致）；例外只给奖励大图和收藏品。
- 按使用频率决定配不配字：每局用几十次的图标可以不带字，低频的必须带字或悬停有名字。
- 状态记号全局统一：锁定、新、已装备、完成、冷却各一种画法，同屏出现时各占一个视觉通道（灰度、去饱和、灰化不能同时用）。
- 图标颜色只做第二通道，语义先靠形状（P-color-never-alone）。
- 图标风格从美术方向推出来：同一媒介用彩绘，中性用线性，像素作用像素（P-channel-borrowing）。

**反例与玩家评价**

- 多种图标风格混用：写实物品、线性技能、扁平地图标记在同一屏。
  - 评价与证据（依据：推断）：评测无专门分类；GameUI 社区评论反复批评「风格混搭没有主次」（08 文档 2.4，意译）。
- 同一个「锁定」在不同界面画法不同（灰度 / 锁头 / 问号），或者灰度锁、去饱和冷却、灰化完成同屏出现分不出。
  - 评价与证据（依据：推断）：本工具 R1 复测记录过这一问题（09 总览「数据与状态编码」组）；评测无对应分类。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 单色线描 · 同一支笔（`fam.mono-line`，皮肤 `skin.mono`）：单色线描：图标与世界同一支笔，统一线宽。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：物品用去饱和写实渲染，系统图标用单色小线稿。
- 像素位图（`fam.pixel`，皮肤 `skin.pixel`）：像素位图：图标是同一网格的像素画。

**出处**

- [Apple Human Interface Guidelines: Icons](https://developer.apple.com/design/human-interface-guidelines/icons)（S204）：一套图标保持统一的视觉重量与线宽；小尺寸先保证可辨认。
- [Healey, Perception in Visualization（前注意特征）](https://www.csc2.ncsu.edu/faculty/healey/PP/index.html)（S174）：单一独特特征才能一眼跳出；组合特征难以前注意识别。
- [AbleGamers APX: Distinguish This From That](https://accessible.games/accessible-player-experiences/access-patterns/distinguish-this-from-that/)（S126）：用多种通道区分不同类别的对象。
- [Laws of UX: Law of Similarity](https://lawsofux.com/law-of-similarity/)（S145）：长得像的东西会被看成一组——同一语义要长得一样。

**可演示的对比**

- **写实小图标 + 三种灰色状态 vs 剪影图标 + 全局状态词汇**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：图标风格：写实 → 剪影；锁定 / 未获得表现：灰度 → 锁图标；完成 / 已领标记：灰化沉底 → 盖章；已选 / 已装备标记：发光 → 勾选角标
  - 看什么：两边都开着全色盲（灰度）模拟：A 的写实小图标在格子里糊成色块，锁定、已完成、已装备都是「变灰 / 发光」，分不出谁是谁；B 的剪影一眼可辨，锁头、印章、勾各占一个通道。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-icon-system#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.inventory` `chk.cvd=achroma`
  - A：`vis.iconStyle=realistic` `st.locked=grayscale` `st.done=grayOut` `st.selected=glow`
  - B：`vis.iconStyle=silhouette` `st.locked=lock` `st.done=stamp` `st.selected=check`

  </details>

#### 附：风格门类速查（12 门类 → 代表家族）

旧版这里是一张按「材质」切的 33 族速查表，已被 17 号图谱取代（93 个家族、12 个门类，旧族名到新 id 的对照见图谱附录 D 与 JSON 的 `legacyFamilyMap`）。下面只列门类与代表家族（主归属卡最多的几个，加上本轮新立的家族），详解看 [17 号图谱 §2 风格家族树](17-ui-style-atlas.md#2-风格家族树)，家族与美术风格的搭配看 [§4.3 家族 × 美术风格关系](17-ui-style-atlas.md#43-家族--美术风格关系)。

| 门类 | 主归属卡数 | 代表家族（主归属卡数） | 这一门类回答的问题 |
|---|---|---|---|
| 暗色、金属与雕饰 | 70 | 暗色细线（`fam.dark-hairline`，26）、暗金金属牌（`fam.dark-gold`，22）、重装饰雕花框（`fam.ornate-frame`，9）、线描花饰（`fam.filigree`，5） | 写实、奇幻、历史题材的「重」界面：深色罩层、金属型材、雕花器物框、线描花饰、装饰艺术几何、拟物材质 |
| 友好、卡通与甜系 | 68 | 糖果卡通（Q 版）（`fam.candy`，32）、圆润友好（`fam.cozy`，23）、像素木框（`fam.pixel-wood`，9）、孟菲斯（`fam.memphis`，3） | 圆、胖、饱和或柔和的界面：糖果塑料、奶油纸面、卡通木框、孟菲斯撞色、千禧玻璃、少女漫画 |
| 纸、印刷与手作 | 23 | 手绘笔记本（`fam.notebook`，11）、羊皮纸任务书（`fam.parchment`，10）、印刷手册 / 数据表（`fam.printed-manual`，1）、手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`，1） | 界面是某种「纸上的东西」或「手做的东西」：笔记本、羊皮纸文书、印刷手册、版画、手工材料、绘本 |
| 东方 | 15 | 国风水墨 / 墨笔（`fam.ink`，14）、和风（`fam.wa`，1）、仙侠·玉石流光（`fam.xianxia`，0）、器物纹样（青花 / 漆器 / 景泰蓝）（`fam.ceramic-lacquer`，0） | 东亚传统视觉的界面化：水墨宣纸、和风纹样、仙侠玉石流光、器物纹样（青花 / 漆器 / 景泰蓝）、敦煌壁画、韩式丹青 |
| 漫画、二次元与动势 | 29 | 二次元白卡细线（`fam.anime-card`，14）、漫画对话框（`fam.comic`，9）、Persona 拼贴（`fam.persona-collage`，3）、倾斜动感（`fam.slant`，3） | 从漫画、动画、海报和街头文化借来的界面：二次元白卡、Persona 拼贴、倾斜动感、漫画分格、街头涂鸦 |
| 科技与复古未来 | 44 | 科幻 HUD（`fam.scifi`，17）、合成波 / 蒸汽波（`fam.synthwave`，9）、军事战术（`fam.military`，8）、全息空间（`fam.holo`，3） | 把界面画成机器读数：科幻 HUD、赛博朋克、军事、全息、CRT、合成波、Y2K、细线仪器，以及工业硬科幻、卡带未来、矢量显示器、原子朋克、哥特科技、机甲警示这些「不同年代、不同信仰想象的未来」 |
| 复古像素与系统控件 | 30 | 像素位图（`fam.pixel`，17）、JRPG 窗口（`fam.jrpg`，6）、灰盒（中性基线）（`fam.greybox`，3）、复古桌面操作系统（`fam.retro-os`，2） | 借用某个时代的「系统」当美术：像素网格、JRPG 窗、操作系统窗口、字符终端、1-bit、网页原生控件、90 年代 FPS 状态栏、点击冒险动词栏、中性灰盒 |
| 现代平面设计 | 33 | 模拟 / 策略工具面板（`fam.sim-panel`，24）、扁平 / Material（`fam.flat`，7）、瑞士几何 / 极简表格（`fam.swiss`，1）、毛玻璃（`fam.glass`，1） | 从网页与平面设计来的界面：扁平 / Material、模拟 / 策略工具面板、瑞士网格、新粗野、毛玻璃、新拟态、构成主义、杂志编辑排版、反设计 |
| 极简与少画 UI | 102 | 零 HUD · 世界即界面（`fam.zero-hud`，39）、情境渐显 · 角落小件（`fam.contextual-hud`，37）、扁平几何 · 地图即界面（`fam.flat-map`，14）、细字直压 · 排印叠层（`fam.typographic-hud`，8） | 原「极简单色」收容桶（107 张卡）按「信息交给谁 × 剩下的件怎么画」拆出的家族：零 HUD、情境渐显（这两族是 rel.hudVisibility 轴上的显隐策略，可叠在任何视觉家族上）、排印叠层、空间排印、单色线描、地图即界面；原来的调试面板已并入模拟 / 策略工具面板 |
| 媒介模拟（界面假装是某种载体） | 10 | 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`，4）、镜头屏显：取景器 / 摄像机 / 监控（`fam.camera-osd`，2）、电影宽银幕 / 片头字幕（`fam.cinematic-letterbox`，2）、默片 / 1930 年代卡通（`fam.silent-film`，1） | 界面在模仿一种设备或放映媒介：相机取景器、手持设备、电视转播、电影宽银幕、默片、被破坏的系统、手机 App、剧场舞台 |
| 题材方言（叙事道具成为界面） | 17 | 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`，6）、文字小说栏 / 互动小说排版（`fam.if-column`，4）、生存恐怖物品检视（`fam.survival-horror`，3）、黑色电影 / 侦探卷宗（`fam.noir-dossier`，2） | 某类题材自带的道具变成了界面：侦探卷宗、办公桌文书、桌游配件、塔罗与炼金、古地图、互动小说文本栏、生存恐怖物品检视 |
| 时代运动与地域纹样 | 0 | 新艺术 / 美好年代（`fam.art-nouveau`，0）、北欧：结绳纹 / 符文石（`fam.norse-knotwork`，0）、伊斯兰几何 / 波斯细密画（`fam.islamic-persian`，0）、中美洲 / 拉美民间（亡灵节、镂空彩纸、石刻）（`fam.latin-folk`，0） | 取自具体艺术运动或地域工艺的界面：新艺术、北欧交织纹、伊斯兰 / 波斯、拉美民间、非洲纹样、南亚 / 东南亚、大洋洲与原住民、东欧 / 斯拉夫、古代文明、蒸汽朋克黄铜、彩色玻璃 |

### 2.8 信息密度与无 HUD

回答「放多少、什么时候放」：密度跟着决策节奏走，多了靠组织；渐进披露最多两层；先看游戏的竞争度，再决定把多少信息交给世界；情境显现是常驻与全隐之间的折中；零 HUD 要交导航税；最后把档位交给玩家。

#### P-density-tempo

**密度跟着决策节奏走：实时要少，可暂停才能多；多了靠组织而不是删**

> 适用品类：动作与 Roguelite、角色扮演、策略与战术、建造与经营、工厂与自动化、卡牌与桌面、MMO · 相关：[P-progressive-disclosure](#p-progressive-disclosure)、[P-text-size-floor](#p-text-size-floor)、[P-neutral-one-voice](#p-neutral-one-voice) · 风格变体：`fam.sim-panel`、`fam.zero-hud`、`fam.dark-gold`

**要解决的问题**

同样 30 个数字，放在回合制里是信息丰富，放在实时战斗里是噪声。参考库 375 张标了密度的卡里，密度与品类强相关：横版平台平均 0.31（n=16）、恐怖 0.38（n=16）、叙事 0.53（n=15），卡牌 2.21（n=33）、策略 1.88（n=26）；手游（n=13）与工厂（n=4）不足 10 张，不下结论。评测既给不出「高密度招骂」也给不出「高密度被夸」：去重后全库夸 UI 的评测只有 47 条，Civilization VI 2 条、Songs of Syx 1 条、Disco Elysium 1 条，而 Songs of Syx 也有 1 条明确说界面杂乱。问题出在密度与时间模型不匹配，或者密度上去了却没有组织（分组、整合、对齐）——这是设计推理，不是评测结论。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 实时动作：极简到稀疏（0–1） | <abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="ctx.timeModel=realtime">时间模型 = 实时</abbr>；<abbr title="lay.hudOrg=scattered">HUD 组织方式 = 分散组件</abbr>；<abbr title="vis.ornament=0">装饰预算 = 无</abbr> | 眼睛必须留在世界里的游戏：动作、射击、平台、竞速。 | 深度信息全部推到菜单里，菜单必须好用；否则复杂度只是换了个地方（见 P-progressive-disclosure）。 | ELDEN RING（steam:1245620）、Call of Duty 4: Modern Warfare (2007)（steam:7940）、God of War（steam:1593500 · 据已知描述）、Ori and the Blind Forest DE（steam:387290 · 据已知描述）、Forza Horizon 5（steam:1551360 · 据已知描述） |
| 中等密度 + 贴边整条（回合制卡牌 / Roguelite） | <abbr title="cnt.density=2">信息密度 = 中等</abbr>；<abbr title="ctx.timeModel=turn">时间模型 = 回合制</abbr>；<abbr title="lay.hudOrg=edgeBar">HUD 组织方式 = 贴边整条</abbr>；<abbr title="lay.grouping=panel">分组方式 = 面板</abbr> | 回合制、信息量中等、需要随时对照的：血量、金币、遗物、分数 × 倍率放进一条边栏。 | 边栏吃掉一侧画面；边栏内部仍需层级（Balatro 把分数做成最大的数字）。 | Slay The Spire（iig:slay-the-spire）、Balatro（steam:2379780）、Loop Hero（steam:1282730）、Luck be a Landlord（steam:1404850） |
| 高密度 + 整合底座（RTS / CRPG / 经营） | <abbr title="cnt.density=3">信息密度 = 密集</abbr>；<abbr title="ctx.timeModel=pausable">时间模型 = 实时可暂停 / 变速</abbr>；<abbr title="lay.hudOrg=console">HUD 组织方式 = 整合底座</abbr>；<abbr title="lay.grouping=panel">分组方式 = 面板</abbr>；<abbr title="vis.opacity=0.9">底不透明度 = 0.9</abbr> | 要同时监控多个单位或资源，但中央必须留给战场：底部一整条把小地图、头像、技能、物品连起来。 | 底座常占屏幕高度的 15–25%；底座里继续加东西就会被骂乱。 | Total War: WARHAMMER II（steam:594570）、Darkest Dungeon（steam:262060）、The Sims Legacy Collection（steam:3314060）、Diablo IV（steam:2344520 · 据已知描述）、Baldur's Gate 3（steam:1086940 · 据已知描述） |
| 信息墙 + 可暂停（大战略 / 殖民 / 城市模拟 / MMO） | <abbr title="cnt.density=4">信息密度 = 极密</abbr>；<abbr title="ctx.timeModel=pausable">时间模型 = 实时可暂停 / 变速</abbr>；<abbr title="lay.hudOrg=edgeBar">HUD 组织方式 = 贴边整条</abbr>；<abbr title="lay.grouping=divider">分组方式 = 分隔线</abbr>；<abbr title="typ.baseSize=12">基准字号 = 12</abbr>；<abbr title="typ.numerals.family=tabular">数字字体 = 等宽数字</abbr> | 玩家可以随时暂停、以分析为乐；信息本身就是玩法。 | 学习曲线陡，必须配渐进披露与 UI 缩放；小字号在电视 / 掌机上不可用。 | Songs of Syx（steam:1162750）、Kenshi（steam:233860）、Stellaris（steam:281990）、World Of Warcraft（iig:world-of-warcraft）、Disco Elysium（steam:632470） |
| 多窗口自由布局 | <abbr title="lay.container=window">容器 = 可拖动窗口</abbr>；<abbr title="cnt.density=4">信息密度 = 极密</abbr>；<abbr title="ctx.timeModel=pausable">时间模型 = 实时可暂停 / 变速</abbr> | 桌面隐喻、编程解谜、怀旧经营：多个面板同时开着对照。 | 窗口互相遮挡，分辨率与缩放问题最集中。 | RollerCoaster Tycoon Classic（steam:683900）、The Farmer Was Replaced（steam:2060160）、Hypnospace Outlaw（steam:844590） |

**经验法则**

- 先定时间模型再定密度：纯实时的局内 HUD ≤ 2；可暂停 / 回合制才值得做到 3–4。
- 密度上去以后靠组织降低感知负担：同类聚合（hudOrg = console / edgeBar）、分组（lay.grouping）、对齐网格；屏幕中央约 60% 留给玩法。
- 密度 ≥ 3 必须同时提供 UI 缩放（a11y.uiScale）和渐进披露（悬停 / 展开 / 侧栏）。
- 密度只管字段数，不管装饰：高密度界面的装饰预算 ≤ 1。
- 同一款游戏可以分档：局内 1–2，暂停 / 管理界面 3–4（巫师 3 局内中等、背包密集）。

**反例与玩家评价**

- 实时 + 高密度 + 四散：商店、波次、技能、资源分散在玩法区四周，且无暂停可用。 例：Terraria（steam:105600）、DRAGON QUEST BUILDERS 2（steam:1072420）。
  - 评价与证据（依据：推断）：无可靠评测证据。库里「实时 + 密度 3–4 + 四角分散」的卡只有 Factorio、Terraria、DRAGON QUEST BUILDERS 2、World Of Warcraft 几张，它们靠固定位置、强惯例和可开关的面板撑住，评测里没有对应抱怨。原来的例子 Bloons TD 6（卡上密度 2、lay.hudOrg=edgeBar）和 Hades II（密度 2）与卡片参数矛盾，「太乱」命中复核后也不是在说 HUD，已移除。
- 高密度界面没有缩放：字号和面板按某一分辨率写死，高分屏 / 大屏上缩成一团。 例：RollerCoaster Tycoon Classic（steam:683900）、Melvor Idle（steam:1267910）、BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「UI 缩放 / 分辨率」去重后 ≥ 2 条的只有 2 款：BioShock Infinite 3 条、RollerCoaster Tycoon Classic 2 条；Melvor Idle、Far Cry 4 各 1 条。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 模拟 / 策略工具面板（`fam.sim-panel`，皮肤 `skin.godotDefault`）：模拟 / 策略工具面板：可暂停的模拟里密度 3–4 成立，靠表格对齐与分组撑住。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：实时探索里密度 0–1，信息交给世界。
- 暗金金属牌（`fam.dark-gold`，皮肤 `skin.darkGold`）：暗金金属牌：回合制底座可以密，但要和玩法区分开。
- 17 号图谱反查到的相关家族：`fam.cozy`、`fam.sim-panel`

**出处**

- [Edward Tufte, The Visual Display of Quantitative Information](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/)（S104）：主张提高数据墨水比、在合理范围内提高数据密度：低密度迫使人按顺序翻看而不是一眼比较——密度本身不是问题，非数据的装饰才是。
- [本项目 10 R2① 策略批次总结 §8](10-r2-strategy.md)（S186）：该品类「极简」16 款与「极密」10 款形成两极，信息密度是这个品类最重要的旋钮之一。
- [本项目 12 R3 玩家评价统计](12-r3-reviews.md)（S188）：各类抱怨的出处与条数（关键词粗筛；本文用去重后的重算）。
- [Celia Hodent, The Gamer's Brain (CRC Press, 2017)（作者访谈页）](https://www.odbms.org/2018/01/author-qa-session-celia-hodent/)（S080）：从感知、注意、记忆等大脑局限出发讨论游戏 UX（可用性与参与度两大支柱）：界面负担要和玩家当下的认知负荷相匹配。

**可演示的对比**

- **实时 + 高密度四散 vs 可暂停 + 整合底座**（整套做法对照（多个参数一起变）；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：时间模型：实时 → 实时可暂停 / 变速；HUD 组织方式：分散组件 → 整合底座；分组方式：自动 → 面板
  - 配套改动：信息元素集合：生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 目标 / 路点 + 队伍 / 玩家条 + 资源 / 货币 + 通知 / 大字提示 + 选中信息面板 + 计时 / 分数 / 回合 → 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 目标 / 路点 + 队伍 / 玩家条 + 资源 / 货币 + 通知 / 大字提示 + 选中信息面板 + 计时 / 分数 / 回合 + 倍速 / 暂停 / 自动；选中信息面板 · 屏幕锚点：右中 → 左下；队伍 / 玩家条 · 屏幕锚点：左中 → 下中；资源 / 货币 · 屏幕锚点：上中 → 左上；倍速 / 暂停 / 自动：画法：自动 → 暂停 / 1x / 2x 按钮条；小地图 / 罗盘 · 屏幕锚点：自动 → 右下
  - 看什么：两边的信息量相同（密度都是 4）。A 把面板摊在玩法区四周、又是纯实时；B 把同样的内容收进一条底座、加了暂停 / 倍速——中央重新空出来，密度从噪声变回了「可以停下来读的信息」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-density-tempo#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.density=4` `el.objective.form=checklist` `el.notify.form=feed` `el.selection.form=panel`
  - A：`ctx.timeModel=realtime` `lay.hudOrg=scattered` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.party+el.resources+el.notify+el.selection+el.timer` `el.selection.screenAnchor=mr` `el.party.screenAnchor=ml` `el.resources.screenAnchor=tc` `el.gameSpeed.form=auto` `el.minimap.screenAnchor=auto` `lay.grouping=auto`
  - B：`ctx.timeModel=pausable` `lay.hudOrg=console` `lay.grouping=panel` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.party+el.resources+el.notify+el.selection+el.timer+el.gameSpeed` `el.selection.screenAnchor=bl` `el.party.screenAnchor=bc` `el.minimap.screenAnchor=br` `el.resources.screenAnchor=tl` `el.gameSpeed.form=speedBar`

  </details>
- **单变量版：实时 + 高密度四散 → 只切换 ctx.timeModel、lay.hudOrg、lay.grouping**（单变量对照；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：时间模型：实时 → 实时可暂停 / 变速；HUD 组织方式：分散组件 → 整合底座；分组方式：自动 → 面板
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-density-tempo#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.density=4` `el.objective.form=checklist` `el.notify.form=feed` `el.selection.form=panel` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.party+el.resources+el.notify+el.selection+el.timer` `el.selection.screenAnchor=mr` `el.party.screenAnchor=ml` `el.resources.screenAnchor=tc` `el.gameSpeed.form=auto` `el.minimap.screenAnchor=auto`
  - A：`ctx.timeModel=realtime` `lay.hudOrg=scattered` `lay.grouping=auto`
  - B：`ctx.timeModel=pausable` `lay.hudOrg=console` `lay.grouping=panel`

  </details>

#### P-progressive-disclosure

**渐进披露：第一层给结论，第二层给原因，最多两层**

> 适用品类：探索与冒险、角色扮演、策略与战术、建造与经营、工厂与自动化、卡牌与桌面、MMO · 相关：[P-density-tempo](#p-density-tempo)、[P-detail-without-hover](#p-detail-without-hover)、[P-menu-architecture](#p-menu-architecture) · 风格变体：`fam.dark-hairline`、`fam.tabletop`、`fam.flat`

**要解决的问题**

信息多的游戏（策略、RPG、经营）不能全摊在第一层，也不能藏到玩家找不到。NN/g 的经验是：先只显示最常用的少数选项，其余按需展开；超过两层就容易迷路。游戏里的披露手段有悬停、常驻侧栏、按键呼出、语义缩放，取决于输入方式和查看频率（lay.detail、elx.visibility、rel.semanticZoom）。R3 的「菜单 / 界面难用」（去重后 19 款 ≥ 2 条）多出在复杂度被推进了菜单、却没设计好怎么展开的游戏。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 悬停 / 嵌套提示（键鼠） | <abbr title="lay.detail=transient">详情呈现 = 临时出现</abbr>；<abbr title="el.selection.form=tooltip">选中信息面板：画法 = tooltip</abbr>；<abbr title="ctx.input=kbm">输入方式 = 键鼠</abbr>；<abbr title="hier.inline=keyword">正文内强调 = 关键词着色</abbr> | 信息多，但每次只关心一个对象；术语密集时用可锁定、可再展开的嵌套提示。 | 触屏没有悬停（D-input 改为点击弹层或底部浮层）；手柄需要焦点导航；新手不知道哪些词能展开。 | Stellaris（steam:281990）、Into the Breach（steam:590380）、Slay The Spire（iig:slay-the-spire）、Chrono Ark（steam:1188930） |
| 常驻详情侧栏 | <abbr title="lay.detail=persistent">详情呈现 = 常驻一侧</abbr>；<abbr title="el.selection.form=panel">选中信息面板：画法 = 信息面板</abbr>；<abbr title="el.selection.screenAnchor=mr">选中信息面板 · 屏幕锚点 = 右中</abbr> | 要边看边比较、频繁切换选中对象：塔防选塔、殖民模拟选人、战棋选单位。 | 固定占屏；没选中东西时侧栏要有合理的空状态。 | Infinitode 2 - Infinite Tower Defense（steam:937310）、Kenshi（steam:233860）、Timberborn（steam:1062090）、Battle for Wesnoth（steam:599390） |
| 按键呼出整层 | <abbr title="rel.hudVisibility=onDemand">HUD 显隐策略 = 按键呼出</abbr>；<abbr title="el.minimap.visibility=onDemand">小地图 / 罗盘 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="el.abilities.form=slots">技能 / 冷却 / 弹药 / 手牌：画法 = 技能格</abbr>；<abbr title="el.abilities.arrangement=ring">技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 环绕中心 / 轮盘</abbr> | 偶尔才查、但查的时候要完整：开放世界的状态总览、能力轮、地图。 | 新手不知道有这个键，必须首次提示；按住呼出会占用一只手。 | ELDEN RING（steam:1245620）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）、Dishonored（steam:205100 · 据已知描述） |
| 语义缩放 / 信息视图 | <abbr title="rel.semanticZoom=heatmap">语义缩放 = 拉远切热力图</abbr>；<abbr title="el.overlay.form=heatmap+statusIcons">信息叠层 / 图例：画法 = 热力图 + 图例 + 状态图标</abbr>；<abbr title="el.overlay.visibility=onDemand">信息叠层 / 图例 · 显隐（逐元素） = 按键呼出</abbr> | 空间分布型数据：城市、工厂、战役地图——拉远看结论（色块），拉近看原因（单体）。 | 切换视图打断操作；红绿热力图对色盲不友好，要换明度渐变。 | Factorio（steam:427520）、Terra Nil（steam:1593030）、Cities: Skylines（steam:255710 · 据已知描述） |

**经验法则**

- 第一层回答「现在怎么样 / 该做什么」，第二层回答「为什么 / 具体多少」；需要第三层时先简化设计。
- 每个可展开的地方都要有可见线索：关键词着色或下划线、ⓘ、按键图标。
- 输入方式决定披露手段：键鼠 = 悬停；手柄 = 按住或焦点；触屏 = 点击弹层（D-input 自动改写）。
- 按键呼出的层第一次出现时给一次软提示（ix.guideForce = soft），之后不再打扰。
- 空间数据用语义缩放（D-zoom）：近处看单体，远处看图标，再远看色块。

**反例与玩家评价**

- 关键操作藏在三层以下或入口不明：HUD 很干净，复杂度全推进了菜单和背包。 例：Valheim（steam:892970）、Starfield（steam:1716740）、No Man's Sky（steam:275850）、Planet Zoo（steam:703080）、Dyson Sphere Program（steam:1366540）、Assassin's Creed Unity（steam:289650 · 据已知描述）。
  - 评价与证据（依据：评测）：R3「菜单 / 界面难用」去重后 19 款 ≥ 2 条：Valheim 7 条、Starfield 4 条，No Man's Sky、Assassin's Creed Unity、Parkasaurus、Dyson Sphere Program、Palworld 各 3 条。Valheim 局内密度只有 0，却同时是背包抱怨最集中的一款（17 条）——把复杂度从 HUD 挪走并不会让它消失。
- 全部摊在第一层：数值表、属性、修正项一次性铺满，没有「先看结论」的入口。 例：Amazing Cultivation Simulator（steam:955900）、Anno 1800（steam:916440）、Your Only Move Is HUSTLE（steam:2212330）。
  - 评价与证据（依据：评测）：R3「提示 / 引导不清」去重后：Your Only Move Is HUSTLE 3 条，Amazing Cultivation Simulator、Anno 1800 各 2 条。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：第一层是一行结论，按键展开右侧属性表。
- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）：桌游实物：卡牌缩略只有数字，按住放大看规则文字。
- 扁平 / Material（`fam.flat`，皮肤 `skin.flat`）：扁平 / Material：嵌套提示逐层解释数字来源。
- 17 号图谱反查到的相关家族：`fam.printed-manual`、`fam.raw-web`、`fam.noir-dossier`、`fam.occult-tarot`、`fam.sim-panel`

**出处**

- [Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)（S150）：先只展示少数最重要的选项，专门功能按需展开；两层以上的披露通常损害可用性；展开入口要明显并标清会看到什么。
- [PCGamesN, Victoria 3 将沿用 Crusader Kings III 的嵌套提示系统](https://www.pcgamesn.com/victoria-3/nested-tooltip-system)（S094）：Paradox 的大战略用「提示里还能再锁定、再展开的提示」来降低学习门槛。
- [Bandai Namco, ELDEN RING Starter Guide](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-starter-guide-tips-know-playing-the-game)（S079）：HUD 设为自动时平时只留罗盘，需要时按一个键临时显示完整 HUD。
- [Giant Bomb 用户评测, Into the Breach: A Gem of Constrained Design](https://www.giantbomb.com/into-the-breach/3030-58234/user-reviews/2200-31048/)（S087）：所有敌人意图都画在地图上，悬停按钮即可看到本回合结算的先后顺序——结论在第一层，细节在悬停里。

**可演示的对比**

- **全部铺在第一层 vs 先看结论、按需展开**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：无详情 → 临时出现；信息叠层 / 图例 · 显隐（逐元素）：常驻 → 按键呼出；信息密度：极密 → 中等；语义缩放：无 → 按缩放切换标签
  - 配套改动：选中信息面板：画法：信息面板 → tooltip；信息叠层 / 图例：画法：热力图 + 图例 + 状态图标 + 范围圈 / 路线线 → 状态图标；正文内强调：自动 → 关键词着色
  - 看什么：A 把热力图、范围圈、状态图标和完整信息面板同时铺满；B 平时只留出问题的状态图标，选中时才弹出提示、按键才叠加热力图——第一眼只看到「哪里出事了」，原因在第二层。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-progressive-disclosure#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.selection+el.overlay+el.resources+el.toolbar+el.minimap`
  - A：`cnt.density=4` `lay.detail=none` `el.selection.form=panel` `el.overlay.form=heatmap+statusIcons+rangeRing` `el.overlay.visibility=always` `rel.semanticZoom=none` `hier.inline=auto`
  - B：`cnt.density=2` `lay.detail=transient` `el.selection.form=tooltip` `el.overlay.form=statusIcons` `el.overlay.visibility=onDemand` `rel.semanticZoom=labels` `hier.inline=keyword`

  </details>
- **单变量版：全部铺在第一层 → 只切换 lay.detail、el.overlay.visibility、cnt.density、rel.semanticZoom**（单变量对照；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：无详情 → 临时出现；信息叠层 / 图例 · 显隐（逐元素）：常驻 → 按键呼出；信息密度：极密 → 中等；语义缩放：无 → 按缩放切换标签
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-progressive-disclosure#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.selection+el.overlay+el.resources+el.toolbar+el.minimap` `el.selection.form=panel` `el.overlay.form=heatmap+statusIcons+rangeRing` `hier.inline=auto`
  - A：`lay.detail=none` `el.overlay.visibility=always` `cnt.density=4` `rel.semanticZoom=none`
  - B：`lay.detail=transient` `el.overlay.visibility=onDemand` `cnt.density=2` `rel.semanticZoom=labels`

  </details>

#### P-know-your-game-competition

**先看游戏的「竞争度」：越靠技能比拼越需要屏幕 / 空间的无歧义信息，越靠叙事推进越可以交给世界**

> 适用品类：探索与冒险、射击、叙事与视觉小说、策略与战术、沙盒与物理、恐怖与悬疑、MOBA 与大逃杀 · 相关：[P-two-questions-per-element](#p-two-questions-per-element)、[P-hudless-tax](#p-hudless-tax)、[P-adaptive-layers](#p-adaptive-layers) · 风格变体：`fam.broadcast`、`fam.zero-hud`、`fam.scifi`

**要解决的问题**

同样说「要沉浸」，竞技射击和步行模拟需要的信息精度完全不同。把叙事游戏的零 HUD 套到技能型玩法上，玩家无法做决策；把竞技式的满屏标记搬进叙事游戏，世界被挡掉。单人游戏也可以有竞争（计时、评分、挑战）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 进程 / 叙事向：叙事内 + 信号物，允许模糊 | <abbr title="cnt.screen=screen.hud">界面类型 = 局内 HUD</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="cnt.tone=narrative">文案语气 = 叙事式</abbr> | 步行模拟、叙事冒险、氛围解谜：玩家的决策少，体验在「身处其中」。 | 迷路、卡关；新手更容易放弃（见 P-hudless-tax）。 | Firewatch（steam:383870）、Journey（steam:638230）、GRIS（steam:683320）、Venba（steam:1491670）、Behind the Frame（steam:1634150） |
| 混合：叙事内为主，屏幕层情境显现 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.vitals.attachTo=player">生命 / 护盾 / 体力 · 世界挂点 = 玩家角色</abbr> | 恐怖、动作冒险：有战斗决策，但张力来自世界。 | 两套表现要讲同一个故事；情境判定写得不好会出现「需要时才出现、出现时已晚」。 | Dead Space（steam:1693980）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）、Resident Evil Village（steam:1196590 · 据已知描述）、The Last of Us Part I（steam:1888930 · 据已知描述） |
| 技能 / 竞技向：屏幕叠加 + 空间内，信息无歧义 | <abbr title="rel.diegesis=screen">默认放置方式 = 屏幕叠加</abbr>；<abbr title="rel.hudVisibility=always">HUD 显隐策略 = 常驻</abbr>；<abbr title="cnt.density=3">信息密度 = 密集</abbr>；<abbr title="ctx.players=team">同屏玩家与视口 = 线上队伍（队友栏 + 记分）</abbr>；<abbr title="el.threat.diegesis=spatial">敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.form=healthBar">敌人血条 / 预警 / 意图：画法 = 敌人血条</abbr> | 多人竞技、战术、ARPG、工厂：玩家要比较、预判、精确计算。 | 画面被信息层覆盖；美术风格只能靠皮肤与配色贴近世界。 | Overwatch（iig:overwatch）、Into the Breach（steam:590380）、Factorio（steam:427520）、Team Fortress 2（steam:440 · 据已知描述）、Diablo IV（steam:2344520 · 据已知描述） |
| 按模式切换：同一款游戏的故事模式少 HUD，计时 / 挑战模式加计时与路线 | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="cnt.elements=el.timer+el.objective">信息元素集合 = 计时 / 分数 / 回合 + 目标 / 路点</abbr>；<abbr title="el.timer.form=number">计时 / 分数 / 回合：画法 = 数字</abbr>；<abbr title="el.timer.screenAnchor=tr">计时 / 分数 / 回合 · 屏幕锚点 = 右上</abbr>；<abbr title="el.objective.form=marker">目标 / 路点：画法 = 标记图标</abbr>；<abbr title="el.objective.diegesis=spatial">目标 / 路点 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr> | 有剧情模式也有竞速 / 挑战模式的作品。 | 要维护两套 HUD 配方与切换逻辑。 | Mirror's Edge（steam:17410）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、art of rally（steam:550320） |

**经验法则**

- 先把游戏放到「进程 ↔ 竞争」轴上：竞争度高 → 信息要无歧义、可比较、即时，用屏幕叠加 + 空间内，叙事内只做冗余装饰；竞争度低 → 允许模糊，甚至让「不确定」成为体验的一部分。
- 同一款游戏的不同模式可以用不同的放置配方（Mirror's Edge 的剧情 / 竞速 / 计时赛就是现成例子）。
- 熟练度也是变量：去掉 HUD 对老手的投入感有提升，对新手未必——默认值按目标玩家定，再给开关（见 P-adaptive-layers）。
- 竞技多人游戏里长时间探索全叙事内方案通常不划算：做出来的往往比玩家需要的更慢、更含糊。

**反例与玩家评价**

- 有生存 / 战斗决策的玩法套零 HUD：状态和下一步只能靠试错。 例：Scorn（steam:698670）、Kingdom Two Crowns（steam:701160）、ASTRONEER（steam:361420）。
  - 评价与证据（依据：评测）：去重后 Scorn 有 7 条评测说提示 / 引导不清、3 条说地图难用（引导类与 Kingdom Two Crowns 并列全库最多）；Kingdom Two Crowns 7 条引导抱怨，同时有 3 条夸 UI 简洁；ASTRONEER 引导 4 条。
- 叙事向开放世界把竞技式信息层整套搬进来（满屏标记、清单、计数），世界被标签盖住。 例：Assassin's Creed Unity（steam:289650 · 据已知描述）。
  - 评价与证据（依据：评测）：Assassin's Creed Unity（卡为「商店图无 UI」，满屏标记据已知描述）提到 UI 的 43 条评测里差评 26 条，菜单难用 3 条，另有 1 条说地图呈现塞了太多元素；R3 报告提醒这类高差评占比常是对整款游戏不满时顺带骂界面，只能当旁证。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播包装：竞技向用无歧义的比分与名条。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：叙事向把信息交给世界。
- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：竞技射击用统一的倾斜大写字体管住十几个元素（Overwatch）。
- 17 号图谱反查到的相关家族：`fam.boomer-bar`、`fam.zero-hud`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：游戏的竞争程度应反映在界面上：叙事 / 进程向用叙事内元素和信号物，模糊甚至有益；竞争向用非叙事与空间元素给出清晰信息；以 Mirror's Edge 三种模式说明同一款游戏可以分模式处理。
- [Removing the HUD: The Impact of Non-Diegetic Game Elements and Expertise on Player Involvement](https://discovery.ucl.ac.uk/id/eprint/1470398/)（S007）：去掉 HUD 的射击游戏对照实验：对老手的投入感（认知投入、控制感）有影响，对新手不明显；设计决策要考虑玩家熟练度。
- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：定性研究：「融入世界」的界面并不自动带来更强投入，很多玩家因为信息清晰而偏好叠加式界面。

**可演示的对比**

- **读世界（叙事向）vs 读仪表（竞技向）**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：叙事内 → 屏幕叠加；HUD 显隐策略：情境显现 → 常驻；信息密度：极简 → 密集
  - 配套改动：信息元素集合：生命 / 护盾 / 体力 + 目标 / 路点 → 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 目标 / 路点 + 敌人血条 / 预警 / 意图 + 计时 / 分数 / 回合；生命 / 护盾 / 体力 · 世界挂点：玩家角色 → 不挂（用屏幕锚点）；目标 / 路点：画法：便签 / 卷轴 → 任务清单；小地图 / 罗盘：画法：自动 → 平面小地图；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；敌人血条 / 预警 / 意图 · 放置方式（逐元素）：继承 → 空间内；敌人血条 / 预警 / 意图：画法：无 → 敌人血条；计时 / 分数 / 回合：画法：自动 → 数字
  - 看什么：整套做法的对比（spectrum）：同一个场景，A 让玩家「读世界」（角色身上的读数 + 一张便签），B 让玩家「读仪表」（清单、小地图、计时、敌人血条）。原 demo 顺手改了文案语气（cnt.tone），已去掉，避免混进与竞争度无关的变量。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-know-your-game-competition#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay`
  - A：`rel.diegesis=diegetic` `rel.hudVisibility=contextual` `cnt.density=0` `cnt.elements=el.vitals+el.objective` `el.vitals.attachTo=player` `el.objective.form=note` `el.minimap.form=auto` `el.threat.attachTo=none` `el.threat.diegesis=inherit` `el.threat.form=[]` `el.timer.form=auto`
  - B：`rel.diegesis=screen` `rel.hudVisibility=always` `cnt.density=3` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.threat+el.timer` `el.objective.form=checklist` `el.threat.form=healthBar` `el.threat.diegesis=spatial` `el.threat.attachTo=target` `el.timer.form=number` `el.minimap.form=plan` `el.vitals.attachTo=none`

  </details>
- **单变量版：读世界（叙事向）vs 读仪表（竞技向） → 只切换 rel.diegesis、rel.hudVisibility、cnt.density**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：叙事内 → 屏幕叠加；HUD 显隐策略：情境显现 → 常驻；信息密度：极简 → 密集
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-know-your-game-competition#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.objective` `el.vitals.attachTo=player` `el.objective.form=note` `el.minimap.form=auto` `el.threat.attachTo=none` `el.threat.diegesis=inherit` `el.threat.form=[]` `el.timer.form=auto`
  - A：`rel.diegesis=diegetic` `rel.hudVisibility=contextual` `cnt.density=0`
  - B：`rel.diegesis=screen` `rel.hudVisibility=always` `cnt.density=3`

  </details>

#### P-contextual-hud

**情境显现：HUD 跟着状态出现和退场——想要干净画面先试它，时间上的隐藏比把信息搬进世界便宜**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、叙事与视觉小说、生活与养成、沙盒与物理、生存与制作、恐怖与悬疑 · 相关：[P-hudless-tax](#p-hudless-tax)、[P-adaptive-layers](#p-adaptive-layers)、[P-value-change-visible](#p-value-change-visible) · 风格变体：`fam.contextual-hud`、`fam.dark-hairline`、`fam.ink`

**要解决的问题**

常驻 HUD 在平静的大部分时间里是噪声，全隐 HUD 在危急的少数时间里缺信息。情境显现（rel.hudVisibility = contextual / fadeIdle / onDemand，及逐元素的 elx.visibility）是两者之间的折中，也是 R2② 探索 / 动作批次的主流（情境 14、全隐 9、常驻 1）。R3 里只比较标了显隐方式的卡：标「情境显现」的 39 款每千条评测有 1.5 次夸 UI（15 / 9,996），明确标了「全隐 / 常驻」的 37 款为 0.6 次（4 / 6,482）；夸 UI 的评测本身很少，15 条里 10 条来自 4 款（Ghost of Tsushima、Kingdom Two Crowns 各 3，Plan B: Terraform、Bad North 各 2），样本不足以下结论。代价是触发规则必须可靠，并且不能把导航也一起藏掉。叙事内要美术、动画、镜头一起配合，成本高；很多 3A 用「平时隐去、用到才出现」就达到了接近的干净画面。显隐策略（什么时候出现）与放置方式（放在哪里）是两个独立的旋钮。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 常驻 | <abbr title="rel.hudVisibility=always">HUD 显隐策略 = 常驻</abbr> | 竞技与对战、信息每秒都在变的游戏（射击、MOBA、格斗、竞速、手游 MMO）。 | 画面永远被占一块；沉浸型作品里显得「界面感」重。 | Overwatch（iig:overwatch）、Party Hard（steam:356570）、Dead Space（steam:1693980）、天涯明月刀（gameui:12771）、ELDEN RING（steam:1245620） 等 7 款 |
| 事件触发显现 | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="el.vitals.visibility=contextual">生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="el.abilities.visibility=contextual">技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="mo.enter=fade">入场动效 = 淡入</abbr>；<abbr title="mo.duration=0.3">动效时长 = 0.3</abbr>；<abbr title="el.vitals.priority=primary">生命 / 护盾 / 体力 · 信息优先级 = 主</abbr> | 探索为主、战斗间歇长：受伤才出血条、开枪才出弹药、拾取才出计数。 | 触发规则要可预测（进战、受伤、拾取、瞄准），否则玩家不信任 HUD；进战一瞬间所有元素同时涌出也会吓人。 | FEZ（steam:224760）、Clair Obscur: Expedition 33（steam:1903340）、Rain World（steam:312520）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Resident Evil Village（steam:1196590 · 据已知描述） 等 8 款 |
| 静止渐隐 | <abbr title="rel.hudVisibility=fadeIdle">HUD 显隐策略 = 静止渐隐</abbr>；<abbr title="mo.enter=fade">入场动效 = 淡入</abbr>；<abbr title="mo.duration=0.6">动效时长 = 0.6</abbr> | 平台、步行、潜行：移动时画面干净，停下来时状态浮出。 | 玩家必须停下来才看得到；节奏快的段落里等于没有 HUD。 | Rain World（steam:312520）、Prince of Persia（steam:19980 · 据已知描述） |
| 按键呼出 + 留一个常驻锚点 | <abbr title="rel.hudVisibility=onDemand">HUD 显隐策略 = 按键呼出</abbr>；<abbr title="el.minimap.visibility=always">小地图 / 罗盘 · 显隐（逐元素） = 常驻</abbr>；<abbr title="el.minimap.form=compassBar">小地图 / 罗盘：画法 = 罗盘条</abbr>；<abbr title="el.minimap.screenAnchor=tc">小地图 / 罗盘 · 屏幕锚点 = 上中</abbr> | 开放世界：平时只留罗盘或一行目标，按一个键看完整状态。 | 需要教学和一个专用键位；手柄键位紧张时不好安排。 | ELDEN RING（steam:1245620）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Dishonored（steam:205100 · 据已知描述） |
| 逐元素分别设置 | <abbr title="el.vitals.visibility=contextual">生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="el.objective.visibility=always">目标 / 路点 · 显隐（逐元素） = 常驻</abbr>；<abbr title="el.resources.visibility=onDemand">资源 / 货币 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="el.minimap.visibility=onDemand">小地图 / 罗盘 · 显隐（逐元素） = 按键呼出</abbr> | 大型 RPG / 开放世界：每个元素的查看频率差别很大，并且把这些开关也开放给玩家。 | 设置项与测试组合变多；截图、教学要覆盖多种显示状态。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、Dishonored 2（steam:403640 · 据已知描述） |
| 电影模式（全隐）+ 叙事内承担 | <abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr> | 信息全部有世界载体的作品。 | 见 P-hudless-tax：引导 / 地图抱怨显著增多。 | Firewatch（steam:383870）、Hellblade: Senua's Sacrifice（steam:414340）、Journey（steam:638230）、Unpacking（steam:1135690） |

**经验法则**

- 决定叙事内之前先算账：哪些信息要搬进世界、谁来做这些道具和动画；如果只是想要干净画面，情境显现通常就够了。
- 给每个元素写清出现条件和消失条件（进战、受伤、拾取、静止 N 秒），条件要可预测、可学习。
- 平静时至少保留一个导航锚点（罗盘条或一行目标），不要让「情境化」变成「无引导」。
- 主信息（elx.priority = primary：生命、Boss）在战斗中最多变半透明，不消失。
- 出现用淡入或滑入，约 0.2–0.3 秒；消失前延迟 2–5 秒（经验值），避免闪烁。
- 竞技、对战、高频决策保持常驻；情境显现属于探索、叙事和单人动作。
- 永远给一个手动呼出（触摸板 / 按住），并在设置里允许「常驻」。
- 隐藏能让画面干净，但会把问题换成「不知道去哪」——同时做引导梯子。
- 把档位和逐元素开关交给玩家：常驻 / 情境 / 全隐，每项可单独显隐（见 P-adaptive-layers）。

**反例与玩家评价**

- 情境化之后引导也一起消失：目标、路线、可交互物只在特定时刻出现，玩家在平静段落里不知道该干什么。 例：Planet Coaster（steam:493340）、Rain World（steam:312520）、Clair Obscur: Expedition 33（steam:1903340）、A Plague Tale: Requiem（steam:1182900 · 据已知描述）、Ori and the Will of the Wisps（steam:1057090 · 据已知描述）。
  - 评价与证据（依据：推断）：R3 去重后：A Plague Tale: Requiem 3 条、Ori and the Will of the Wisps 3 条、Planet Coaster 2 条、Rain World 2 条「提示 / 引导不清」。只比较标了显隐方式的卡：情境显现 39 款每千条 2.6 次引导抱怨（26 / 9,996）、6 款是出处；明确标了全隐 / 常驻的 37 款 4.5 次（29 / 6,482）、8 款是出处——情境显现组并不更差，这条反例是设计推论（触发规则要可靠、导航不能一起藏掉）。Clair Obscur 地图 13 条是单款最集中的例子。
- 只有整体开 / 关两档：想关掉罗盘的人只能连 Boss 血条一起关，想看血量的人只能全开。 例：ELDEN RING（steam:1245620）。
  - 评价与证据（依据：评测）：R3 去重后 ELDEN RING「引导不清」3 条（原来的「挡视野」3 条复核后是在夸它没有界面杂物，已移除）；Steam 社区另有玩家抱怨 HUD 只能整体关闭（社区讨论，不在 R3 统计里）。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 情境渐显 · 角落小件（`fam.contextual-hud`，皮肤 `skin.mono`）：情境渐显 · 角落小件：这一族的本义——平时空屏，状态变化时淡入。
- 暗色细线（`fam.dark-hairline`，皮肤 `skin.darkHairline`）：暗色细线：三条细条只在消耗与受伤时出现。
- 国风水墨 / 墨笔（`fam.ink`，皮肤 `skin.ink`）：国风水墨：血条与葫芦情境显现，Boss 条两端祥云卷纹（Black Myth）。
- 17 号图谱反查到的相关家族：`fam.cozy`、`fam.wa`、`fam.holo`、`fam.contextual-hud`

**出处**

- [Bandai Namco, ELDEN RING Starter Guide](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-starter-guide-tips-know-playing-the-game)（S079）：自动 HUD：平时除罗盘外全部隐藏，按键可临时查看——「按需 + 常驻锚点」的官方做法。
- [Weiser & Brown, Designing Calm Technology (1995)](https://calmtech.com/papers/designing-calm-technology)（S182）：信息应当能在外围与中心之间移动：平时安静地待在外围，需要时进入中心。
- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：界面「透明」并不必然带来更强的投入感；很多玩家因为信息清楚而偏好叠加式 HUD——情境显现应当可选而不是强制。
- [AbleGamers / accessible.games, Personal Interface](https://accessible.games/accessible-player-experiences/access-patterns/personal-interface/)（S124）：让玩家按需显示、隐藏、缩放、固定或重排界面组件。
- [本项目 11 R2② 探索 / RPG / 动作批次总结](11-r2-arpg.md)（S187）：「零 HUD / 情境显现」是 3A 探索作的主流，rel.hudVisibility 与 cnt.density 是该品类的第一旋钮。
- [Removing the HUD: The Impact of Non-Diegetic Game Elements and Expertise on Player Involvement](https://discovery.ucl.ac.uk/id/eprint/1470398/)（S007）：去掉 HUD 的影响因玩家熟练度而异：老手的投入感与控制感上升，新手不明显。
- [Ghost of Tsushima 创意总监访谈（Android Central）](https://www.androidcentral.com/ghost-tsushima-creative-director-interview)（S086）：屏幕上的 UI 越多越妨碍「身在对马岛」的感觉，因此尽量少放、用不显眼的方式指向目标。

**可演示的对比**

- **常驻 vs 情境显现（保留导航锚点）**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：HUD 显隐策略：常驻 → 情境显现；生命 / 护盾 / 体力 · 显隐（逐元素）：继承 → 情境显现；小地图 / 罗盘 · 显隐（逐元素）：继承 → 常驻；目标 / 路点 · 显隐（逐元素）：继承 → 常驻
  - 配套改动：小地图 / 罗盘：画法：平面小地图 → 罗盘条；技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素）：继承 → 情境显现；小地图 / 罗盘 · 屏幕锚点：自动 → 上中；资源 / 货币 · 显隐（逐元素）：继承 → 按键呼出；动效时长：自动 → 0.3；入场动效：硬切 → 淡入
  - 看什么：播放「战斗节拍」：A 从头到尾一样满；B 在探索段只剩罗盘条和一行目标，进战、受伤时血条和技能淡入，战斗结束后几秒内退场。注意 B 始终保留了导航锚点。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-contextual-hud#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.resources` `el.objective.form=text` `chk.demo=combatBeat`
  - A：`rel.hudVisibility=always` `el.minimap.form=plan` `el.abilities.visibility=inherit` `el.minimap.screenAnchor=auto` `el.minimap.visibility=inherit` `el.objective.visibility=inherit` `el.resources.visibility=inherit` `el.vitals.visibility=inherit` `mo.duration=auto` `mo.enter=cut`
  - B：`rel.hudVisibility=contextual` `el.vitals.visibility=contextual` `el.abilities.visibility=contextual` `el.resources.visibility=onDemand` `el.minimap.form=compassBar` `el.minimap.visibility=always` `el.minimap.screenAnchor=tc` `el.objective.visibility=always` `mo.enter=fade` `mo.duration=0.3`

  </details>
- **单变量版：常驻 → 只切换 rel.hudVisibility、el.vitals.visibility、el.minimap.visibility、el.objective.visibility**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：HUD 显隐策略：常驻 → 情境显现；生命 / 护盾 / 体力 · 显隐（逐元素）：继承 → 情境显现；小地图 / 罗盘 · 显隐（逐元素）：继承 → 常驻；目标 / 路点 · 显隐（逐元素）：继承 → 常驻
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-contextual-hud#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.abilities+el.minimap+el.objective+el.resources` `el.objective.form=text` `chk.demo=combatBeat` `el.minimap.form=plan` `el.abilities.visibility=inherit` `el.minimap.screenAnchor=auto` `el.resources.visibility=inherit` `mo.duration=auto` `mo.enter=cut`
  - A：`rel.hudVisibility=always` `el.vitals.visibility=inherit` `el.minimap.visibility=inherit` `el.objective.visibility=inherit`
  - B：`rel.hudVisibility=contextual` `el.vitals.visibility=contextual` `el.minimap.visibility=always` `el.objective.visibility=always`

  </details>

#### P-hudless-tax

**无 HUD 要交「导航税」：信号物打底，再给一架按需加码的引导梯子**

> 适用品类：探索与冒险、横版平台、叙事与视觉小说、建造与经营、沙盒与物理、生存与制作、恐怖与悬疑、解谜与侦探 · 相关：[P-contextual-hud](#p-contextual-hud)、[P-journal-codex](#p-journal-codex)、[P-map-conventions](#p-map-conventions)、[P-adaptive-layers](#p-adaptive-layers) · 风格变体：`fam.zero-hud`、`fam.mono-line`、`fam.diegetic-device`

**要解决的问题**

零 HUD 是参考库里最大的流派之一：标了 HUD 全隐的 35 张卡、标了叙事内的 37 张、密度「极简」119 张，画面干净，也常被夸。R3 显示代价集中在「不知道去哪、该干什么、没有地图」。只比较标了同一维度的卡（去重后）：标「全隐」的 34 款每千条评测 4.4 次「引导不清」（25 / 5,653），明确标了「情境 / 常驻」的 42 款 2.8 次（30 / 10,825）；标「叙事内」的 36 款 5.1 次（39 / 7,711），明确标了「空间内 / 元」的 13 款 0.9 次（3 / 3,443）。同品类按密度比较：探索类密度 0–1 的 28 款 2.1 次 vs 密度 2–4 的 11 款 0.3 次，恐怖 4.1（n=14）vs 0（n=2），生存 4.7（n=12）vs 1.6（n=4）。方向一致，但各组样本小、关键词是粗筛，不足以下结论，只作提示。去掉 HUD 换来干净，换走的是导航——必须用世界、按需层或可选辅助补回来。补回导航的手段可以从最沉浸到最省时排成一架梯子：信号物与光 → 叙事化方向指引 → 叙事内载体 → 感知模式 → 分级提示 → 空间路径线 → 最低安全网（罗盘条、一行目标、按需地图）。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 世界引路：信号物、光、颜色、地标 | <abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr>；<abbr title="rel.diegesis=spatial">默认放置方式 = 空间内</abbr>；<abbr title="rel.worldRender=outline">世界内标注渲染（默认） = 物体描边高亮</abbr>；<abbr title="cnt.density=0">信息密度 = 极简</abbr>；<abbr title="rel.harmony=sameMedium">UI 与画面关系 = 同一媒介</abbr> | 线性或有强地标的世界；美术能保证引路元素在所有光照下都有对比。 | 依赖美术与关卡协同；对比会随场景失效（Ghost of Tsushima 的风在雪地里变弱）。 | Mirror's Edge（steam:17410）、Hellblade: Senua's Sacrifice（steam:414340）、Portal 2（steam:620）、Riven（steam:1712350）、Hyper Light Drifter（steam:257850） 等 8 款 |
| 叙事化的方向指引（风、动物、对讲机、低语、地标） | <abbr title="el.objective.diegesis=diegetic">目标 / 路点 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.objective.form=marker">目标 / 路点：画法 = 标记图标</abbr>；<abbr title="rel.hudVisibility=onDemand">HUD 显隐策略 = 按键呼出</abbr> | 开放世界想去掉路点，但还要可靠地把玩家带到目标。 | 指引本身要做成世界系统（风场、动物 AI、配音）；不如箭头精确。 | Firewatch（steam:383870）、Hellblade: Senua's Sacrifice（steam:414340）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |
| 叙事内载体：身上、手里、设备上 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="el.vitals.diegesis=diegetic">生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内</abbr>；<abbr title="el.vitals.attachTo=player">生命 / 护盾 / 体力 · 世界挂点 = 玩家角色</abbr>；<abbr title="rel.hudVisibility=hidden">HUD 显隐策略 = 电影模式（全隐）</abbr> | 第一 / 第三人称，设定里有合理载体（宇航服、手电、纸地图、枪身屏幕）。 | 读取更慢、受镜头角度影响；状态读得到，但「去哪」仍然缺。 | Dead Space（steam:1693980）、Firewatch（steam:383870）、Subnautica（steam:264710）、ASTRONEER（steam:361420）、Half-Life: Alyx（steam:546560） 等 7 款 |
| 扫描 / 感知模式：按需把信息叠回世界 | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="el.overlay.form=holo">信息叠层 / 图例：画法 = 全息覆盖</abbr>；<abbr title="el.overlay.visibility=onDemand">信息叠层 / 图例 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="rel.worldRender=outline">世界内标注渲染（默认） = 物体描边高亮</abbr>；<abbr title="el.overlay.diegesis=spatial">信息叠层 / 图例 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.interact.diegesis=spatial">交互提示 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.interact.attachTo=poi">交互提示 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.interact.worldRender=outline">交互提示 · 世界渲染（逐元素） = 物体描边</abbr> | 想保持平时零 HUD，又需要战术或导航信息：侦探视觉、聚焦扫描、聆听模式。 | 玩家可能长期开着扫描模式，整个游戏变成看全息线框，削弱美术。 | DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Hardspace: Shipbreaker（steam:1161580）、Mirror's Edge（steam:17410）、Batman: Arkham Knight（steam:208650 · 据已知描述）、Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述） 等 7 款 |
| 分级提示：按一次看方向、两次高亮目标、三次标出路径 | <abbr title="ix.guideForce=soft">引导强制度 = 软提示（可忽略）</abbr>；<abbr title="el.objective.form=marker+edgeArrow">目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头</abbr>；<abbr title="el.objective.visibility=onDemand">目标 / 路点 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="el.guide.form=ring">引导指示 / 聚光：画法 = 光圈脉冲</abbr> | 想让大多数玩家靠自己推理过关，同时不让卡关的人流失。 | 要写求助计数与时机判断；给得太快会让人觉得被操控，太慢又会挫败。 | Mirror's Edge（steam:17410）、Red Dead Redemption 2（steam:1174180 · 据已知描述） |
| 空间路径线 / 范围（最省时，也最出戏） | <abbr title="el.objective.form=marker">目标 / 路点：画法 = 标记图标</abbr>；<abbr title="el.objective.diegesis=spatial">目标 / 路点 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.overlay.form=rangeRing">信息叠层 / 图例：画法 = 范围圈 / 路线线</abbr>；<abbr title="el.overlay.diegesis=spatial">信息叠层 / 图例 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="el.overlay.worldRender=decal">信息叠层 / 图例 · 世界渲染（逐元素） = 地面贴花</abbr> | 导航效率优先；或世界观能给路径线一个理由（装备投射的导航线）。 | 玩家盯着线走、不看世界；开放世界里线一多就成了网。 | Dead Space（steam:1693980）、Detroit: Become Human（steam:1222140）、超星觉醒（大梦龙途）（gameui:13619） |
| 最低安全网：罗盘条、一行目标、按需地图 | <abbr title="el.minimap.form=compassBar">小地图 / 罗盘：画法 = 罗盘条</abbr>；<abbr title="el.minimap.visibility=onDemand">小地图 / 罗盘 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="el.objective.form=text">目标 / 路点：画法 = 目标文字</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr> | 非线性开放世界：保留最少的方向信息，其余全隐。 | 破坏一点「纯净」；罗盘条上的标记多了又会变成 HUD。 | ELDEN RING（steam:1245620）、No Man's Sky（steam:275850）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述） |

**经验法则**

- 去掉 HUD 之前，先列出玩家每分钟要回答的问题；每一个都必须有世界内答案或按需答案。
- 区分推进必需与可选发现：前者必须被放大（光、运动对比、信号物、可呼出的提示），后者可以藏起来当奖励。
- 导航最先补，优先级：光 / 颜色 / 地标引路 > 按需罗盘 > 常驻小地图；非线性世界至少给一张按需地图。
- 零 HUD 至少保留一种「我在哪」的手段：纸地图、可见的地标、可呼出的罗盘。
- 默认零提示 → 玩家求助时逐级加码（方向 → 高亮目标 → 标出路径），而不是一开始全给。
- 用对比做放大器：场景里唯一在动、唯一亮着的东西就是答案；不可交互的同类物件压暗、静止，主动抑制错误推理。
- 世界引路要过对比测试：雪地、夜晚、雾、强光各看一遍（06 文档 C.4 灰度 / 眯眼检查）。
- 感知模式要按住或切换，不要常驻——常驻就成了另一层 HUD。
- 叙事内数值要在 1 秒内读出（颜色分级 > 精确数字），读不出就补一个情境显现的屏幕叠加。
- 对照实验里导航用空间路径线最快，罗盘最慢：路径线是效率上限，叙事化指引是沉浸上限，按游戏定位在两者之间取点。
- 提供可选辅助层（导航辅助、路线高亮、HUD 档位）；默认可以是作者的纯净档。

**反例与玩家评价**

- 零 HUD + 非线性世界 + 没有地图（或只有极简目标行）：玩家只能凭记忆认路。 例：Scorn（steam:698670）、Clair Obscur: Expedition 33（steam:1903340）、Hyper Light Drifter（steam:257850）、Chants of Sennaar（steam:1931770）、TOEM（steam:1307580）、A Short Hike（steam:1055540） 等 7 款。
  - 评价与证据（依据：推断）：R3「地图难用 / 没有地图」去重后 14 款 ≥ 2 条：Clair Obscur: Expedition 33 13 条（全库单款最集中）、CONTROL 5、Chants of Sennaar 5、Hyper Light Drifter 4、TOEM 4、Scorn / A Short Hike 各 3。按密度看：密度 0–1 的 191 款里 14 款是地图出处（7%），密度 2 的 60 款与密度 3–4 的 50 款都是 0 款。
- 把推进必需的提示也藏起来，只剩试错。 例：Scorn（steam:698670）、Kingdom Two Crowns（steam:701160）、ASTRONEER（steam:361420）、Hellblade: Senua's Sacrifice（steam:414340）、Little Nightmares（steam:424840）、Gorogoa（steam:557600） 等 9 款。
  - 评价与证据（依据：评测）：只比较标了叙事性的卡（去重后）：标叙事内的 36 款里 8 款（22%）有 ≥ 2 条「提示 / 引导不清」，明确标了空间内 / 元的 13 款里 1 款；按每千条评测算 5.1 对 0.9。标全隐的 34 款里 7 款（21%），明确标了情境 / 常驻的 42 款里 7 款（17%）。样本小，只作提示。出处最多：Scorn 7、Kingdom Two Crowns 7、ASTRONEER 4、A Plague Tale: Requiem 3、Gorogoa 3。注：部分「无 HUD」来自商店图的营销隐藏。
- 世界即 UI，但规则从不教：资源、建造、谜题机制全靠试错发现。 例：Kingdom Two Crowns（steam:701160）、Gorogoa（steam:557600）、Little Nightmares（steam:424840）、Hellblade: Senua's Sacrifice（steam:414340）、ASTRONEER（steam:361420）。
  - 评价与证据（依据：评测）：R3 去重后：Kingdom Two Crowns「引导不清」7 条（同时有 3 条夸 UI 简洁）；ASTRONEER 4 条；Gorogoa 3 条；Little Nightmares、Hellblade 各 2 条。
- 无意中「演示」了玩家做不到的事：NPC 能开的门玩家开不了，玩家据此推理出不存在的可交互性。 例：Call of Duty 4: Modern Warfare (2007)（steam:7940）。
  - 评价与证据（依据：推断）：评测关键词无法计数；案例来自 Fagerholt & Lorentzon 对 Call of Duty 4 战役的分析。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD · 世界即界面：信号物与光是第一级引导，按需罗盘是最后的安全网。
- 单色线描 · 同一支笔（`fam.mono-line`，皮肤 `skin.mono`）：单色线描：引导是画面里的一笔线（同一支笔画的路）。
- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）：叙事内设备：地图与指南针是手里的纸和表（Firewatch）。
- 17 号图谱反查到的相关家族：`fam.notebook`、`fam.storybook`、`fam.thin-geo`、`fam.zero-hud`、`fam.mono-line`、`fam.oceania-indigenous`

**出处**

- [Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games](https://odr.chalmers.se/handle/20.500.12380/111921)（S001）：叙事内 / 非叙事 / 空间内 / 元四分法的出处；建议根据游戏的虚构设定决定信息是否放进世界。
- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：融入式界面不必然提升投入感，玩家常因信息清楚而偏好叠加式——零 HUD 是取舍，不是默认更好。
- [Crafting Destruction: The Evolution of the Dead Space User Interface](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of)（S032）：死亡空间把血量、弹药、菜单做成宇航服与全息投影，目标是拆掉玩家与游戏之间的「安全墙」。
- [EA, Follow the Red: Runner's Vision in Mirror's Edge Catalyst](https://ea.com/news/runners-vision-in-mirrors-edge-catalyst)（S107）：零 HUD 跑酷用红色高亮可攀爬物引路，并提供关闭 / 经典 / 完整三档。
- [GDC 2021 · Parker Hamilton: Exploration in Ghost of Tsushima: Letting the Island Guide You](https://www.gdcvault.com/play/1027399/Exploration-in-Ghost-of-Tsushima)（S195）：用多种世界内手段让玩家把视线留在岛上并发现内容，代替小地图与路点。
- [Ghost of Tsushima accessibility review](https://caniplaythat.com/2020/07/29/ghost-of-tsushima-accessibility-review/)（S059）：引导之风在早期很醒目，到雪地区域与地面对比下降、变得难以跟随——世界引路需要对比测试。
- [PlayStation Blog: The Last of Us Part II Accessibility Features Detailed](https://blog.playstation.com/2020/06/09/the-last-of-us-part-ii-accessibility-features-detailed/)（S111）：低视力预设一并打开高对比显示、大号 HUD 与导航 / 攀爬辅助——极简 HUD 作品用可选辅助层兜底。
- [Ghost of Tsushima 创意总监访谈（Android Central）](https://www.androidcentral.com/ghost-tsushima-creative-director-interview)（S086）：去掉路点是为了让玩家觉得身处对马岛：屏幕上的大量 UI 会妨碍这种感觉，引导之风在不显眼的前提下指向目标，野生动物也会把玩家引向兴趣点。
- [The Design Secrets of Breath of the Wild（80.lv，整理自 CEDEC 2017 任天堂演讲）](https://80.lv/articles/the-design-secrets-of-breath-of-the-wild/)（S102）：用远处可见的塔作为地标，三角形山体既遮挡视线制造惊喜又把视线引向山尖，用地形本身代替路点引导。
- [Peacocke, Teather, Carette, MacKenzie, McArthur (2018) An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations. Entertainment Computing 26](https://www.yorku.ca/mack/ec2018.html)（S180）：导航任务中描出路径的空间线表现最好，旋转小地图接近，罗盘最差。

**可演示的对比**

- **零 HUD 无兜底 vs 零 HUD + 按需导航层**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：HUD 显隐策略：电影模式（全隐） → 情境显现；小地图 / 罗盘 · 显隐（逐元素）：继承 → 按键呼出；目标 / 路点：画法：无 → 标记图标 + 屏幕边缘箭头；引导强制度：无引导 → 软提示（可忽略）
  - 配套改动：信息元素集合：无 → 目标 / 路点 + 小地图 / 罗盘 + 交互提示；交互提示 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；交互提示：画法：无 → 按键图标 + 文字；小地图 / 罗盘：画法：自动 → 罗盘条；小地图 / 罗盘 · 屏幕锚点：自动 → 上中；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；目标 / 路点 · 放置方式（逐元素）：继承 → 空间内
  - 看什么：静止截图里两边几乎一样干净；区别在于 B 在世界里多了一个路点（出屏时变成边缘箭头）、按住才出现的罗盘条和贴在物体上的交互提示——这就是零 HUD 必须交的那份「导航税」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-hudless-tax#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `lay.container=overlay` `rel.diegesis=diegetic` `cnt.density=0`
  - A：`rel.hudVisibility=hidden` `cnt.elements=[]` `el.interact.attachTo=none` `el.interact.form=[]` `el.minimap.form=auto` `el.minimap.screenAnchor=auto` `el.minimap.visibility=inherit` `el.objective.attachTo=none` `el.objective.diegesis=inherit` `el.objective.form=[]` `ix.guideForce=none`
  - B：`rel.hudVisibility=contextual` `cnt.elements=el.objective+el.minimap+el.interact` `el.objective.form=marker+edgeArrow` `el.objective.diegesis=spatial` `el.objective.attachTo=poi` `el.minimap.form=compassBar` `el.minimap.visibility=onDemand` `el.minimap.screenAnchor=tc` `el.interact.form=keyPrompt` `el.interact.attachTo=poi` `ix.guideForce=soft`

  </details>
- **单变量版：零 HUD 无兜底 → 只切换 rel.hudVisibility、el.minimap.visibility、el.objective.form、ix.guideForce**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：HUD 显隐策略：电影模式（全隐） → 情境显现；小地图 / 罗盘 · 显隐（逐元素）：继承 → 按键呼出；目标 / 路点：画法：无 → 标记图标 + 屏幕边缘箭头；引导强制度：无引导 → 软提示（可忽略）
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-hudless-tax#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud` `lay.container=overlay` `rel.diegesis=diegetic` `cnt.density=0` `cnt.elements=[]` `el.interact.attachTo=none` `el.interact.form=[]` `el.minimap.form=auto` `el.minimap.screenAnchor=auto` `el.objective.attachTo=none` `el.objective.diegesis=inherit`
  - A：`rel.hudVisibility=hidden` `el.minimap.visibility=inherit` `el.objective.form=[]` `ix.guideForce=none`
  - B：`rel.hudVisibility=contextual` `el.minimap.visibility=onDemand` `el.objective.form=marker+edgeArrow` `ix.guideForce=soft`

  </details>

#### P-adaptive-layers

**分档与可调：新手档、作者档、老手档并存，沉浸程度交给玩家**

> 适用品类：探索与冒险、动作与 Roguelite、横版平台、射击、角色扮演、建造与经营、沙盒与物理、恐怖与悬疑、MMO · 相关：[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-contextual-hud](#p-contextual-hud)、[P-hudless-tax](#p-hudless-tax) · 风格变体：`fam.contextual-hud`、`fam.dark-gold`、`fam.zero-hud`

**要解决的问题**

不同玩家需要的层级不同：新手需要引导和标注，老手嫌它挡；有人要沉浸，有人要信息。研究显示透明（融入式）UI 不必然提升投入，叠加式界面因为清楚常常更受欢迎（Llanos & Jørgensen 2011），也没有一种显示方式对所有信息都最好（Peacocke 等 2018 的后续研究）。R3 里 Kingdom Two Crowns 有 3 条夸 UI 简洁、7 条说不知道该干什么——同一个设计服务了两类人，却只给了一个档位。参数体系里这对应玩家选项（a11y.*）、逐元素显隐（elx.visibility）和引导强度（ix.guideForce）。这些开关本身也属于「UI 与世界关系」的设计：逐元素显隐、HUD 档位、元 UI 强度都要进设置页，在 Godot 里导出为玩家选项，而不是进美术配方。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| HUD 档位预设（沉浸 / 标准 / 完整，或常驻 / 自动 / 关闭） | <abbr title="rel.hudVisibility=contextual">HUD 显隐策略 = 情境显现</abbr>；<abbr title="el.minimap.visibility=always">小地图 / 罗盘 · 显隐（逐元素） = 常驻</abbr>；<abbr title="cnt.density=1">信息密度 = 稀疏</abbr>；<abbr title="rel.diegesis=screen">默认放置方式 = 屏幕叠加</abbr> | 中大型单机：给一个作者推荐档，另给更多 / 更少两档。 | 每档都要能玩通（全关时也要有导航办法）。 | ELDEN RING（steam:1245620）、Red Dead Redemption 2（steam:1174180 · 据已知描述）、Dishonored 2（steam:403640 · 据已知描述）、Ghost of Tsushima DC（steam:2215430 · 据已知描述） |
| 逐元素显隐、缩放、重排 | <abbr title="el.minimap.visibility=onDemand">小地图 / 罗盘 · 显隐（逐元素） = 按键呼出</abbr>；<abbr title="el.minimap.scale=0.8">小地图 / 罗盘 · 大小 / 突出度 = 0.8</abbr>；<abbr title="el.objective.visibility=always">目标 / 路点 · 显隐（逐元素） = 常驻</abbr>；<abbr title="el.party.visibility=contextual">队伍 / 玩家条 · 显隐（逐元素） = 情境显现</abbr>；<abbr title="el.vitals.visibility=always">生命 / 护盾 / 体力 · 显隐（逐元素） = 常驻</abbr> | 长线游戏、PC、MMO：玩家会根据自己的打法重新排 HUD。 | 测试矩阵和教学截图要覆盖多种布局；默认布局仍需最好。 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、World Of Warcraft（iig:world-of-warcraft）、Dishonored 2（steam:403640 · 据已知描述）、Red Dead Redemption 2（steam:1174180 · 据已知描述） |
| 引导强度档：路点、路线高亮可开可关 | <abbr title="ix.guideForce=soft">引导强制度 = 软提示（可忽略）</abbr>；<abbr title="el.objective.form=marker+edgeArrow">目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头</abbr>；<abbr title="el.guide.form=ring">引导指示 / 聚光：画法 = 光圈脉冲</abbr>；<abbr title="el.objective.visibility=onDemand">目标 / 路点 · 显隐（逐元素） = 按键呼出</abbr> | 零 HUD / 极简作品想照顾迷路玩家，或高难度档故意去掉提示。 | 要额外实现与测试；默认关闭时需要在开场说明有这个选项。 | Mirror's Edge（steam:17410）、The Last of Us Part II Remastered（steam:2531310 · 据已知描述） |
| 无障碍档：高对比空间描边 + 放大 HUD | <abbr title="a11y.highContrast=true">高对比模式 = 开</abbr>；<abbr title="a11y.uiScale=1.4">UI 缩放 = 1.4</abbr>；<abbr title="el.interact.worldRender=outline">交互提示 · 世界渲染（逐元素） = 物体描边</abbr>；<abbr title="el.threat.worldRender=outline">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 物体描边</abbr> | 低视力玩家：把世界本身的对比交给描边与压暗来补。 | 描边色要避开阵营 / 稀有度色；画面风格被大幅改变。 | The Last of Us Part II Remastered（steam:2531310 · 据已知描述） |
| 减少整屏效果 | <abbr title="a11y.reduceMotion=true">减少动效 = 开</abbr>；<abbr title="rel.metaFx=[]">元 UI 屏幕效果 = 无</abbr>；<abbr title="el.vitals.diegesis=screen">生命 / 护盾 / 体力 · 放置方式（逐元素） = 屏幕叠加</abbr> | 晕动、光敏、易分心的玩家；关掉元 UI 后生命信息自动回到屏幕。 | 失去身体感；要确保替代读数存在。 | — |

**经验法则**

- 默认档 = 作者意图；另给至少一个「更多信息」档和一个「更少信息」档。
- 默认值面向目标玩家；「沉浸档」可以更激进，因为是玩家自己选的。
- 引导类信息（路点、路线高亮、目标提示）放进难度或辅助选项里，而不是直接删掉。
- 设置页的 HUD 部分至少有：整体显隐策略、逐元素开关、HUD 缩放、元 UI 效果强度 / 开关。
- 切档时在暂停菜单里实时预览（探索台的「玩家设置预览」），玩家立刻看到差别。
- 无障碍预设（低视力、运动）一键打开一组相关选项（大 HUD、高对比、导航辅助），再允许逐项微调。
- 空间内描边 / 高亮可以兼作无障碍工具，设计成可加粗、可换色。
- 元 UI 强度滑条从 0 开始，为 0 时屏幕上的替代读数自动出现。
- 这些是玩家设置（a11y.*、elx.visibility），在 Godot 里导出到设置页，不进美术配方。

**反例与玩家评价**

- 只有一个档位：零 HUD 作品不提供任何可选引导，或者 HUD 只能整体开关。 例：Kingdom Two Crowns（steam:701160）、Scorn（steam:698670）、ELDEN RING（steam:1245620）。
  - 评价与证据（依据：评测）：R3 去重后：Kingdom Two Crowns「引导不清」7 条、「夸 UI」3 条；Scorn「引导不清」7 条；ELDEN RING「引导不清」3 条。
- 整屏效果（震屏、闪白、速度线、故障）没有关闭项或强度滑条。
  - 评价与证据（依据：文献）：评测关键词无此类；依据 Xbox 无障碍指南 117 与 Game Accessibility Guidelines。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 情境渐显 · 角落小件（`fam.contextual-hud`，皮肤 `skin.mono`）：情境渐显：作者档默认，另给「更多信息」「更少信息」两档。
- 暗金金属牌（`fam.dark-gold`，皮肤 `skin.darkGold`）：暗金金属牌：MMO 式可拖动框体，布局存成配置。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：沉浸档关掉一切，但保留一个按键呼出的目标行。
- 17 号图谱反查到的相关家族：`fam.terminal-grid`、`fam.zero-hud`、`fam.contextual-hud`

**出处**

- [Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues](https://dl.digra.org/index.php/dl/article/view/514)（S004）：玩家对界面的态度差异很大：透明界面与投入感没有必然联系，许多人因清晰而偏好叠加式 HUD。
- [Peacocke, Teather, Carette, MacKenzie, McArthur (2018) An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations. Entertainment Computing 26](https://www.yorku.ca/mack/ec2018.html)（S180）：HUD、叙事内、空间内显示没有哪一种始终更好，表现取决于信息类型、呈现方式和任务——要按信息逐项选择，而不是按「沉浸」潮流一刀切。
- [AbleGamers / accessible.games, Personal Interface](https://accessible.games/accessible-player-experiences/access-patterns/personal-interface/)（S124）：让玩家显示、隐藏、缩放、固定或重排界面组件；举了 Fortnite 移动版布局工具和 Battlefield 1 小地图尺寸 / 透明度的例子。
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)（S068）：最小默认字号之上，玩家应能把文字放大到 200% 且不丢内容。
- [PlayStation Blog: The Last of Us Part II Accessibility Features Detailed](https://blog.playstation.com/2020/06/09/the-last-of-us-part-ii-accessibility-features-detailed/)（S111）：用预设一键打开大号 HUD、高对比显示、导航辅助等一组选项，之后可逐项调整。
- [EA, Follow the Red: Runner's Vision in Mirror's Edge Catalyst](https://ea.com/news/runners-vision-in-mirrors-edge-catalyst)（S107）：引路高亮提供关闭、经典、完整三档，由玩家决定要多少帮助。
- [Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)（S170）：移动、闪烁的内容可暂停或关闭；视野、镜头晃动、运动模糊可调；以 Halo Infinite 为例，整屏效果、速度线、震屏都有独立的 0–100% 强度滑条。
- [The Last of Us Part II 无障碍选项（PlayStation 官方页）](https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/)（S112）：视觉预设一键打开高对比显示、大号 HUD、强化聆听模式，之后每项仍可单独调整。
- [Removing the HUD: The Impact of Non-Diegetic Game Elements and Expertise on Player Involvement](https://discovery.ucl.ac.uk/id/eprint/1470398/)（S007）：去 HUD 的效果取决于玩家熟练度，设计要考虑目标玩家的经验。

**可演示的对比**

- **新手档 vs 老手档**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：中等 → 极简；HUD 显隐策略：常驻 → 情境显现；引导强制度：软提示（可忽略） → 无引导；小地图 / 罗盘 · 显隐（逐元素）：继承 → 按键呼出
  - 配套改动：目标 / 路点：画法：目标文字 + 标记图标 + 屏幕边缘箭头 → 标记图标；小地图 / 罗盘：画法：平面小地图 → 罗盘条；按键 / 操作提示：画法：情境按键 → 无；交互提示：画法：按键图标 + 文字 → 锁定括号；UI 缩放：1.2 → 1；目标 / 路点 · 显隐（逐元素）：继承 → 按键呼出；生命 / 护盾 / 体力 · 显隐（逐元素）：继承 → 情境显现
  - 看什么：同一个场景的两个玩家档：A 是新手档（常驻目标、路点和屏外箭头、按键提示、稍大的 UI），B 是老手档（几乎全隐，按键才出罗盘和路点）。好的设计两档都提供，而不是在两者之间替所有玩家选一个。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-adaptive-layers#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.objective+el.minimap+el.prompt+el.interact`
  - A：`cnt.density=2` `rel.hudVisibility=always` `ix.guideForce=soft` `el.objective.form=text+marker+edgeArrow` `el.minimap.form=plan` `el.prompt.form=contextual` `el.interact.form=keyPrompt` `a11y.uiScale=1.2` `el.minimap.visibility=inherit` `el.objective.visibility=inherit` `el.vitals.visibility=inherit`
  - B：`cnt.density=0` `rel.hudVisibility=contextual` `ix.guideForce=none` `el.objective.form=marker` `el.objective.visibility=onDemand` `el.minimap.form=compassBar` `el.minimap.visibility=onDemand` `el.prompt.form=[]` `el.interact.form=bracket` `el.vitals.visibility=contextual` `a11y.uiScale=1`

  </details>
- **单变量版：新手档 → 只切换 cnt.density、rel.hudVisibility、ix.guideForce、el.minimap.visibility**（单变量对照；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：中等 → 极简；HUD 显隐策略：常驻 → 情境显现；引导强制度：软提示（可忽略） → 无引导；小地图 / 罗盘 · 显隐（逐元素）：继承 → 按键呼出
  - 看什么：从上一个 demo 的 A 整套设置出发，只把这几个承载本条原则的参数换成 B 的值，其余保持 A：效果里有多少来自它们、多少来自配套改动，一比就知道。由 spectrum demo 自动派生。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-adaptive-layers#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.container=overlay` `cnt.elements=el.vitals+el.objective+el.minimap+el.prompt+el.interact` `el.objective.form=text+marker+edgeArrow` `el.minimap.form=plan` `el.prompt.form=contextual` `el.interact.form=keyPrompt` `a11y.uiScale=1.2` `el.objective.visibility=inherit` `el.vitals.visibility=inherit`
  - A：`cnt.density=2` `rel.hudVisibility=always` `ix.guideForce=soft` `el.minimap.visibility=inherit`
  - B：`cnt.density=0` `rel.hudVisibility=contextual` `ix.guideForce=none` `el.minimap.visibility=onDemand`

  </details>

### 2.9 多人与社交

回答「和别人一起玩时，界面怎么替人说话」：标记 / ping 用一键表达意图、语义按目标自动推断；击杀信息流与占点广播接通告分级，位置固定、条数有上限；计分板按住才出、队伍识别不靠颜色单独承担。同屏多人的分屏与对号见 P-shared-screen（2.5）。商业化的组队大厅、好友邀请奖励不在范围内，只看沟通与识别。

#### P-contextual-ping

**情境标记：一键 ping，语义按目标自动推断，词汇控制在 3–5 个以内**

> 适用品类：射击、MOBA 与大逃杀、动作与 Roguelite、生存与制作、沙盒与物理、手机触屏（局内与非商业化界面） · 相关：[P-event-feed-tiers](#p-event-feed-tiers)、[P-scoreboard-team-id](#p-scoreboard-team-id)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-shared-screen](#p-shared-screen) · 风格变体：`fam.scifi`、`fam.military`、`fam.zero-hud`

**要解决的问题**

团队游戏里最高频的沟通不是聊天，而是「看这里」：敌人在哪、去哪集合、这里有物资。打字太慢，语音不是人人都开；标记（ping）把意图挂在世界里，所有人都看得见、听得懂、不分语言。PC Gamer 对 Apex Legends 标记系统的评价是它让不开麦的队伍也能配合。设计要点：一个键完成大部分沟通，语义按指向的目标自动推断（指敌人 = 敌人，指物资 = 物资，指地面 = 去这里）；轮盘只放 3–5 个补充词；标记挂在世界里并有屏幕边缘回退。参数上对应 el.objective.form = marker / edgeArrow、elx.attachTo = poi、elx.diegesis = spatial、ctx.players = team。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 一键情境标记：语义按目标推断 | <abbr title="el.objective.form=marker+edgeArrow">目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头</abbr>；<abbr title="el.objective.attachTo=poi">目标 / 路点 · 世界挂点 = 兴趣点</abbr>；<abbr title="el.objective.diegesis=spatial">目标 / 路点 · 放置方式（逐元素） = 空间内</abbr>；<abbr title="ctx.players=team">同屏玩家与视口 = 线上队伍（队友栏 + 记分）</abbr> | 小队射击、大逃杀、合作动作：一个键标敌人、物资、地点，世界里出现带图标与距离的标记，屏外的从边缘指回来。 | 目标推断要准；标记一多会盖住画面，需要自动过期。 | — |
| 标记轮盘：3–5 个补充词 | <abbr title="el.prompt.form=contextual">按键 / 操作提示：画法 = 情境按键</abbr>；<abbr title="ix.touchCluster=radial">触屏按钮布局 = 按住展开轮盘</abbr> | 需要表达「防守这里」「小心」「撤退」等少量意图时：按住呼出轮盘，词汇不超过 5 个（P-radial-for-sticks）。 | 词一多就退化成慢速聊天。 | — |
| 叙事内信号：鸣叫、手势、光 | <abbr title="rel.diegesis=diegetic">默认放置方式 = 叙事内</abbr>；<abbr title="cnt.elements=el.interact">信息元素集合 = 交互提示</abbr> | 不想要文字的合作作品（Journey 的同伴只能用鸣叫的符号沟通）。 | 信息量很小，只适合非竞争的合作。 | Journey（steam:638230） |
| 快捷语句 / 表情 | <abbr title="el.chat.form=collapsed">聊天：画法 = 折叠框</abbr>；<abbr title="el.notify.form=toast">通知 / 大字提示：画法 = 圆角提示卡</abbr> | 对战与派对游戏：预设短语出现在头像旁或信息流里，跨语言、可屏蔽。 | 容易被用来刷屏嘲讽，要有冷却与屏蔽。 | Among Us（steam:945360） |

**经验法则**

- 一个键完成 80% 的沟通：语义由指向的目标决定，不让玩家先选类型。
- 标记挂在世界里（空间内），带图标与距离；在屏外时从屏幕边缘指回（P-spatial-render-budget）。
- 补充词汇控制在 3–5 个，放进轮盘；每个词有固定图标与颜色，并配声音提示。
- 标记自动过期，同一玩家同时最多几个；敌人标记的颜色和友方标记分开，并有形状冗余。
- 标记事件进入信息流时降一级显示（P-event-feed-tiers），不抢击杀与占点广播。

**反例与玩家评价**

- 团队沟通只能靠打字或语音，不开麦的玩家无法参与配合。
  - 评价与证据（依据：文献）：评测无专门分类；PC Gamer 对 Apex 标记系统的评价可作正面参照。
- 标记类型太多（十几个按钮），玩家要先选类型再标，比打字还慢。
  - 评价与证据（依据：推断）：无计数；HCI 研究（标记菜单）显示每层超过 8 项时错误率明显上升。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 科幻 HUD（`fam.scifi`，皮肤 `skin.scifi`）：科幻 HUD：标记是发光菱形 + 距离，屏外时从边缘指回。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：标记是方括号 + 等宽距离数字。
- 零 HUD · 世界即界面（`fam.zero-hud`，皮肤 `skin.mono`）：零 HUD：标记是叙事内的鸣叫与光（Journey 的同伴符号）。

**出处**

- [Apex Legends' ping system is a tiny miracle for FPS teamwork and communication](https://www.pcgamer.com/apex-legends-ping-system-is-a-tiny-miracle-for-fps-teamwork-and-communication/)（S061）：一键标记让不开麦的队伍也能配合；语义按目标推断。
- [Kurtenbach & Buxton · The Limits of Expert Performance Using Hierarchic Marking Menus（CHI '93）](https://www.research.autodesk.com/publications/the-limits-of-expert-performance-using-hierarchic-marking-menus/)（S177）：轮盘每层项数过多时错误率上升。

**可演示的对比**

- **队友打字说「B 点有人」vs 世界里的情境标记 + 边缘箭头**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：目标 / 路点：画法：目标文字 → 标记图标 + 屏幕边缘箭头；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；目标 / 路点 · 放置方式（逐元素）：屏幕叠加 → 空间内
  - 看什么：A 只能在右上读一行文字再自己找 B 点在哪；B 的标记挂在目标上、带距离，目标在屏外时从边缘指回来。这就是「看这里」不用语言也能说清。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-contextual-ping#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `ctx.players=team` `cnt.elements=el.vitals+el.crosshair+el.objective+el.notify` `el.notify.form=feed` `el.objective.screenAnchor=tr`
  - A：`el.objective.form=text` `el.objective.attachTo=none` `el.objective.diegesis=screen`
  - B：`el.objective.form=marker+edgeArrow` `el.objective.attachTo=poi` `el.objective.diegesis=spatial`

  </details>

#### P-event-feed-tiers

**事件流分级：击杀信息流、占点广播、队友标记接通告分级——位置固定、条数有上限、越重要越少**

> 适用品类：射击、MOBA 与大逃杀、体育与体育经理、MMO、格斗、竞速与驾驶、策略与战术 · 相关：[P-event-callout-tiers](#p-event-callout-tiers)、[P-contextual-ping](#p-contextual-ping)、[P-scoreboard-team-id](#p-scoreboard-team-id)、[P-focal-periphery](#p-focal-periphery)、[P-medium-simulation](#p-medium-simulation) · 风格变体：`fam.broadcast`、`fam.military`、`fam.dark-gold`

**要解决的问题**

多人对局里同时有几十种事件：谁击杀了谁、哪个点被占、队友标记、成就、聊天。全部用同样的方式弹出来，画面中央会被一摞文字盖住，真正重要的「我方失去 B 点」反而被淹没。这和单人游戏的通告分级（P-event-callout-tiers）是同一个问题，只是事件源从一个人变成了十几个人：要按重要性分级，每级固定位置、固定上限、固定停留时间。电视转播的包装（17 号图谱 fam.broadcast）早就解决了这件事：比分牌常驻一角、击杀流在侧边滚动、大事件才占屏幕中间的横幅。参数上对应 el.notify.form = feed / banner / band、elx.screenAnchor、cnt.elements = el.chat。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 侧边信息流：滚动、上限 4–6 条、固定一角 | <abbr title="el.notify.form=feed">通知 / 大字提示：画法 = 滚动消息列</abbr>；<abbr title="el.notify.screenAnchor=tr">通知 / 大字提示 · 屏幕锚点 = 右上</abbr> | 击杀流、拾取、队友标记：最常见、最不重要的事件，固定在一角滚动，新的顶掉旧的。 | 信息量大时会被忽略——这正是它该有的级别。 | Overwatch（iig:overwatch） |
| 目标横幅：只给改变局势的事件 | <abbr title="el.notify.form=banner">通知 / 大字提示：画法 = 横幅</abbr>；<abbr title="el.notify.screenAnchor=tc">通知 / 大字提示 · 屏幕锚点 = 上中</abbr> | 占点、失点、Boss 刷新、最后一分钟：顶部中央一条横幅，同一时刻只有一条。 | 横幅一多就失去分量；要有排队与合并规则。 | Sid Meier’s Civilization® VI（steam:289070） |
| 大字带 / 转播式插播：每局个位数次 | <abbr title="el.notify.form=band">通知 / 大字提示：画法 = 整屏横贯带大字</abbr>；<abbr title="mo.enter=slashIn">入场动效 = 斜切划入 / 遮罩擦除</abbr> | 团灭、逆转、比赛结束：转播包装式的斜切大字带（fam.broadcast）。 | 遮挡最大，只能出现在节奏间歇。 | Esports Godfather（steam:1278540） |
| 聊天折叠：默认收起、只显示最新一行 | <abbr title="el.chat.form=collapsed">聊天：画法 = 折叠框</abbr>；<abbr title="cnt.elements=el.chat">信息元素集合 = 聊天</abbr> | MMO、合作：聊天平时收成一行，按键展开；系统消息与玩家消息分颜色与前缀。 | 社交重度玩家要能固定展开。 | 三界天骄（gameui:6729）、World Of Warcraft（iig:world-of-warcraft） |

**经验法则**

- 先列出所有事件，按「改变局势的程度」分 3–4 级，每级只用一种画法、一个位置。
- 信息流固定一角、最多 4–6 条、每条 3–5 秒；横幅同一时刻只有一条；大字带每局个位数次。
- 和「我」有关的事件（我击杀、我被击杀、我的队伍失点）在信息流里加粗或加底色，其余淡化。
- 队色贯穿信息流（击杀者与被击杀者名字用队色），并配图标或前缀，不只靠颜色（P-scoreboard-team-id）。
- 画面中央只留给最高一级（P-event-callout-tiers）；观战 / 回放模式可以把信息流放大。

**反例与玩家评价**

- 击杀、拾取、成就、聊天都在屏幕中央弹出，同时叠成一摞。
  - 评价与证据（依据：推断）：无可靠评测计数；设计推论（Riot 清晰度准则：特效与通告噪声会叠加，团战最容易失控）。
- 信息流没有上限，团战时滚得比读得快。
  - 评价与证据（依据：推断）：无计数；设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播包装：击杀流是侧边名条，大事件是斜切横幅。
- 军事战术（`fam.military`，皮肤 `skin.military`）：军事战术：信息流是等宽日志，大事件是全屏警示条纹。
- 暗金金属牌（`fam.dark-gold`，皮肤 `skin.darkGold`）：暗金金属牌：MMO 的系统消息与战斗日志分页签。

**出处**

- [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)（S053）：吸引注意力的程度要与玩法重要性相称；团战里噪声最容易失控。

**可演示的对比**

- **所有事件都弹在中间 vs 分级：一角信息流 + 顶部横幅**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：通知 / 大字提示：画法：滚动消息列 + 横幅 + 整屏横贯带大字 → 滚动消息列 + 横幅；通知 / 大字提示 · 屏幕锚点：中心 → 右上
  - 看什么：播放战斗片段：A 的击杀流、横幅、大字带全堆在准星附近；B 的击杀流固定在右上滚动、只有改变局势的事件才出顶部横幅。看准星周围还剩多少可见区域。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-event-feed-tiers#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `ctx.players=team` `cnt.elements=el.vitals+el.crosshair+el.minimap+el.notify` `chk.demo=combatBeat`
  - A：`el.notify.form=feed+banner+band` `el.notify.screenAnchor=center`
  - B：`el.notify.form=feed+banner` `el.notify.screenAnchor=tr`

  </details>

#### P-scoreboard-team-id

**计分板按住才出、队伍识别不靠颜色单独承担：队色接 col.teams，配形状、位置与名字冗余**

> 适用品类：射击、MOBA 与大逃杀、体育与体育经理、格斗、竞速与驾驶、MMO、卡牌与桌面 · 相关：[P-color-never-alone](#p-color-never-alone)、[P-shared-screen](#p-shared-screen)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-detail-without-hover](#p-detail-without-hover)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor) · 风格变体：`fam.broadcast`、`fam.candy`、`fam.slant`

**要解决的问题**

对战游戏的计分板（每个人的击杀、死亡、得分）信息量大，常驻会挡住画面，藏起来又让人不知道局势；队伍识别更是硬需求——敌我分不清，一切操作都是错的。MOBA 布局预设默认用绿 / 红阵营色（layout.moba 的 col.teams = greenRed），对红绿色觉异常的玩家（约男性 8%）几乎等于没有区分。做法：比分常驻一个小牌子，完整计分板按住才出；队色用橙 / 蓝并拉开明度，再配形状（头像框外形）、位置（我方在左 / 下）和名字前缀。参数上对应 col.teams、col.coding = team、el.party.form = scoreRow、elx.visibility = onDemand、chk.cvd。

**做法谱系**

| 做法 | 参数 | 何时用 | 代价 | 例子 |
|---|---|---|---|---|
| 比分小牌常驻 + 完整计分板按住才出 | <abbr title="el.timer.form=scorePill">计时 / 分数 / 回合：画法 = 比分胶囊</abbr>；<abbr title="el.party.form=scoreRow">队伍 / 玩家条：画法 = 头像 + 分数药丸</abbr>；<abbr title="el.party.visibility=onDemand">队伍 / 玩家条 · 显隐（逐元素） = 按键呼出</abbr> | 射击、MOBA、体育：顶部中央一块小比分牌常驻，Tab / 长按呼出整张表，松开即收。 | 手柄与触屏要有呼出键位（P-detail-without-hover）。 | Overwatch（iig:overwatch）、宝石小伙伴（测试）（gameui:7035） |
| 橙蓝队色 + 明度拉开 | <abbr title="col.teams=orangeBlue">阵营色对 = 橙蓝（色盲安全）</abbr>；<abbr title="col.coding=team">语义颜色编码 = 阵营色</abbr> | 所有分队对战的默认队色：橙与蓝在常见色觉异常下仍分得开，再拉开明度。 | 题材需要红蓝时（转播风）也要在明度上拉开，并提供色盲预设。 | — |
| 形状与位置冗余：我方左 / 下、敌方右 / 上，头像框外形不同 | <abbr title="el.party.form=portraits">队伍 / 玩家条：画法 = 立绘头像（大小区分当前）</abbr>；<abbr title="el.party.screenAnchor=tl">队伍 / 玩家条 · 屏幕锚点 = 左上</abbr>；<abbr title="vis.silhouette=shield">小组件轮廓 = 盾形</abbr> | MOBA 与格斗：双方头像排在两侧，外形不同；同屏多人用各自颜色 + 编号（Castle Crashers 顶部四人头像各有颜色）。 | 要为每种外形单独出图。 | Castle Crashers（steam:204360）、Your Only Move Is HUSTLE（steam:2212330） |
| 世界内队伍识别：描边与头顶名牌 | <abbr title="el.threat.worldRender=outline">敌人血条 / 预警 / 意图 · 世界渲染（逐元素） = 物体描边</abbr>；<abbr title="el.threat.attachTo=target">敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人</abbr>；<abbr title="el.threat.form=targetFrame">敌人血条 / 预警 / 意图：画法 = 目标头像框</abbr> | 射击与大逃杀：敌人描边、队友头顶名牌，透过墙的队友轮廓。 | 描边色与稀有度、交互描边抢同一通道（P-spatial-render-budget）。 | Overwatch（iig:overwatch） |

**经验法则**

- 队色默认橙 / 蓝并拉开明度；红 / 绿组合必须提供替代预设（C-teams-cvd 约束会警告）。
- 队伍识别至少再配一个非颜色通道：位置、外形、名字前缀或图标。
- 比分常驻一个小牌，完整计分板按住才出，松开即收；观战模式可以常驻。
- 计分板里「我」的那一行加底色或粗体，按得分排序，并标出连接状态。
- 用 chk.cvd 在 deutan / protan 下检查一遍敌我是否仍能区分。

**反例与玩家评价**

- 阵营只用红 / 绿区分，色盲玩家分不出敌我。 例：Call of Duty 4: Modern Warfare (2007)（steam:7940）。
  - 评价与证据（依据：推断）：评测里色盲话题去重后只有 6 条 / 6 款，无法计数；见射击品类坑 6 与 06 文档 A4。
- 完整计分板常驻屏幕一侧，挡住视野。
  - 评价与证据（依据：推断）：无计数；设计推论。

**同一原则，换一种风格**（把 demo 的 B 叠在这些家族的皮肤上看；家族详解见 17 号图谱）

- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）：电视转播包装：比分牌是转播包装的核心，队色加队徽。
- 糖果卡通（Q 版）（`fam.candy`，皮肤 `skin.candy`）：糖果卡通：每队一个颜色加一个形状头像框。
- 倾斜动感（`fam.slant`，皮肤 `skin.slant`）：倾斜动感：VS 画面左右两队用斜切色块与大字。

**出处**

- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)（S066）：关键信息不能只靠颜色；团队色应可自定义。
- [Xbox Accessibility Guideline 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103)（S161）：颜色之外要有形状、图案或文字等第二通道。

**可演示的对比**

- **红绿队色 + 常驻计分板 vs 橙蓝队色 + 按住才出**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：阵营色对：绿友红敌 → 橙蓝（色盲安全）；队伍 / 玩家条 · 显隐（逐元素）：常驻 → 按键呼出
  - 看什么：两边都开着绿色弱模拟：A 的红绿两队在计分板和小地图上几乎一样，而且计分板一直挡在屏幕一侧；B 用橙蓝、平时只留比分牌，按住才出整张表。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`P-scoreboard-team-id#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `cnt.screen=screen.hud` `ctx.players=team` `cnt.elements=el.party+el.timer+el.minimap` `el.party.form=scoreRow` `col.coding=team` `chk.cvd=deutan`
  - A：`col.teams=greenRed` `el.party.visibility=always`
  - B：`col.teams=orangeBlue` `el.party.visibility=onDemand`

  </details>

## 三、品类篇

每个品类按同一个顺序写：一眼要知道什么 → HUD 组织（参考库里的几种版式与占比）→ 关键元素与画法 → 重要界面 → 风格倾向（17 号图谱的家族）→ 代表作 → 坑 → 可演示的对比 → 样例内容。「探索台内容包」是这个品类在探索台里用的虚构样例内容（品类不同，内容不同，避免所有样张都长得像一款游戏）。3.18–3.23 是本轮新增的品类（格斗、音游、体育、MOBA / 大逃杀、模拟驾驶 / 飞行、MMO），参考库里卡很少，结论标「待补参考」，补卡单见第六部分。

### 3.1 探索与冒险

参考卡 47 张 · 探索台内容包：snowline（雪线旅人）

探索与冒险的 UI 核心是「把画面还给世界」：3A 开放世界以情境显现与罗盘条为主流，艺术探索作干脆零 HUD。47 张卡里只有 17 张标了显隐方式：情境显现 10、全隐 7、常驻 0（下面「四角常驻」那一行来自看图，巫师 3、刺客信条等卡上没有标显隐方式）。风险几乎全部集中在导航——去掉小地图之后，引路、地图和可回看的目标必须另有着落。

**子类**：开放世界动作冒险（3A：巫师 3、刺客信条全系、荒野大镖客、对马岛、地平线、霍格沃茨）；步行模拟 / 艺术探索（GRIS、Journey、Dear Esther、Firewatch、ABZU）；潜行与线性动作冒险（耻辱 1 / 2、古墓丽影、A Plague Tale、Stray、蝙蝠侠）；第一人称点击探索解谜（Riven）；风格化小品探索（A Short Hike、Knights And Bikes、The Artful Escape、Rain World、Prince of Persia 2008）；手游横 / 竖屏探索（GameUI 7 款，只看局内与对话，商城 / 活动页不计）

**一眼要知道什么**

1. 下一步往哪走：只需要方向 + 大致距离（罗盘条、小地图、或世界里的引导物），完整地图是按需打开的
2. 眼前什么能互动：可攀爬、可拾取、可对话的东西要先在世界里被看见（描边、闪点、提示键挂在物体上）
3. 我还撑得住吗：生命 / 体力（攀爬、冲刺、游泳、憋气）——只在变化或危险时才需要看
4. 环境本身危险吗：温度、天气、时间段、噪声 / 被发现的程度
5. 刚刚发生了什么：发现新地点、拿到物品、任务更新——一句话，几秒后消失
6. 这里来过吗、还剩什么没找：已探索区与收集进度（打开地图时才回答，不常驻）

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 零 HUD · 世界即界面：状态长在角色和环境上（围巾长度、手臂纹路、画面颜色），屏幕上只剩字幕 | 7 / 47 张卡 HUD 全隐（GRIS、Journey、Hellblade、Dear Esther、Riven、Firewatch、ABZU）；叙事内 8 / 47；信息密度为极简的 16 / 47 | GRIS（steam:683320）、Journey（steam:638230）、Hellblade: Senua's Sacrifice（steam:414340）、Dear Esther: Landmark Edition（steam:520720） 等 7 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；默认放置方式 = 叙事内；UI 与画面关系 = 同一媒介；信息元素集合 = 字幕 / 说话人；字幕 / 说话人 · 屏幕锚点 = 下中；文字可读辅助 = 投影 |
| 情境显现的角落组件：平时几乎空屏，受伤、攀爬、骑乘、瞄准时相关组件才淡入（3A 动作冒险的主流） | 10 / 47 标了情境显现（荒野大镖客 2、天际、对马岛、波斯王子、Rain World、死亡搁浅、古墓丽影、A Plague Tale、Stray 等）；标了显隐方式的 17 张里没有一张是「常驻」 | Rain World（steam:312520）、DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Stray（steam:1332010）、Red Dead Redemption 2（steam:1174180 · 据已知描述） 等 9 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 分散组件；HUD 显隐策略 = 情境显现；信息密度 = 稀疏；信息元素集合 = 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 按键 / 操作提示 + 交互提示 + 通知 / 大字提示；小地图 / 罗盘：画法 = 圆环雷达；小地图 / 罗盘 · 屏幕锚点 = 左下；数值图形（生命 / 护盾 / 体力） = 圆环；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；按键 / 操作提示：画法 = 情境按键；按键 / 操作提示 · 屏幕锚点 = 右下；交互提示：画法 = 按键图标 + 文字；交互提示 · 世界挂点 = 兴趣点；通知 / 大字提示：画法 = 圆角提示卡；通知 / 大字提示 · 屏幕锚点 = 左上 |
| 顶部罗盘条 + 底部 / 右下状态：方向信息压成一条横带，地图、目标都折叠进罗盘刻度（开放世界 RPG 式） | 罗盘条 5 / 47，标了位置的 4 张全在上中（天际、霍格沃茨、刺客信条 奥德赛、地平线 西之绝境；Starfield 未标位置） | Starfield（steam:1716740）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Hogwarts Legacy（steam:990080 · 据已知描述）、Assassin's Creed Odyssey（steam:812140 · 据已知描述） 等 5 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 分散组件；HUD 显隐策略 = 情境显现；信息元素集合 = 小地图 / 罗盘 + 生命 / 护盾 / 体力 + 目标 / 路点 + 技能 / 冷却 / 弹药 / 手牌；小地图 / 罗盘：画法 = 罗盘条；小地图 / 罗盘 · 屏幕锚点 = 上中；目标 / 路点：画法 = 标记图标；目标 / 路点 · 世界挂点 = 兴趣点；数值图形（生命 / 护盾 / 体力） = 横条；生命 / 护盾 / 体力：条数 = 3；生命 / 护盾 / 体力 · 屏幕锚点 = 下中；生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下 |
| 四角常驻 + 平面小地图：左上血、角落圆形小地图、右侧任务清单、右下武器 / 技能（巫师 3、刺客信条系列、Far Cry、蜘蛛侠） | 看图归纳（卡上没标显隐方式）：平面小地图 11 / 47（标了位置的：左下 5、右下 3、右上 2），加上圆环雷达 2 张，小地图类整体左下 7 张最多；标了血条位置的 13 张里左上 9 张 | The Witcher 3: Wild Hunt — Remastered（steam:292030）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Assassin’s Creed IV Black Flag（steam:242050 · 据已知描述）、Assassin's Creed 2（steam:33230 · 据已知描述） 等 7 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 中等；信息元素集合 = 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 目标 / 路点 + 技能 / 冷却 / 弹药 / 手牌 + 按键 / 操作提示；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 左下；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 右中；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；按键 / 操作提示：画法 = 情境按键；按键 / 操作提示 · 屏幕锚点 = 右上（渲染说明：vis.silhouette@el.minimap 已移除（渲染器不读这个按元素覆盖）） |
| 空间内感知 / 侦探视觉：按键切到第二层，世界去色、可交互物与敌人描边、全息标签浮在物体上；平时不画 | 空间内 4 / 47（蝙蝠侠 阿卡姆骑士、耻辱、刺客信条 大革命、地平线）；古墓丽影的生存直觉、死亡搁浅的扫描是同一思路 | DEATH STRANDING DIRECTOR'S CUT（steam:1850570）、Batman: Arkham Knight（steam:208650 · 据已知描述）、Dishonored（steam:205100 · 据已知描述）、Assassin's Creed Unity（steam:289650 · 据已知描述） 等 6 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；默认放置方式 = 空间内；世界内标注渲染（默认） = 物体描边高亮；背后调色 = 双色调；主题色变化 = 随形态 / 机制切换；骨架色彩策略 = 单色；信息元素集合 = 信息叠层 / 图例 + 交互提示 + 敌人血条 / 预警 / 意图；信息叠层 / 图例：画法 = 全息覆盖；交互提示：画法 = 锁定括号；交互提示 · 世界挂点 = 兴趣点；敌人血条 / 预警 / 意图：画法 = 敌人血条；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人 |
| 叙事内物件承载：地图、指南针、仪表是主角手里或座舱里的实物，打开时世界不暂停 | 叙事内 8 / 47（Firewatch 手持地图、荒野大镖客 宝藏图、Starfield 座舱仪表、Journey 围巾、Riven 机关刻痕……） | Firewatch（steam:383870）、Red Dead Redemption（steam:2668510）、Starfield（steam:1716740）、Journey（steam:638230） 等 5 款 | 界面类型 = 地图 / 世界地图；容器 = 直接叠加；默认放置方式 = 叙事内；场景容器 = 摊开的地图；背后画面来源 = 实时场景；地图画风 = 手绘水彩；HUD 显隐策略 = 电影模式（全隐） |
| 触屏竖屏探索：顶部资源胶囊、浮动摇杆、右下大按钮，目标画成地面光圈，引导靠底部 NPC 对话卡 | 竖屏 5 / 47，全部是 GameUI 手游（商城 / 活动页不计入） | 超星觉醒（大梦龙途）（gameui:13619）、贪吃怪大作战（gameui:13082）、曙光重临（4399）（gameui:13586） | 界面类型 = 局内 HUD；画幅朝向 = 竖屏；设备与观看距离 = 手机；输入方式 = 触屏；虚拟摇杆 = 浮动摇杆；握持与拇指区 = 竖屏单手；HUD 组织方式 = 分散组件；信息密度 = 中等；信息元素集合 = 资源 / 货币 + 按键 / 操作提示 + 引导指示 / 聚光 + 目标 / 路点；资源 / 货币：画法 = 胶囊 + 加号；资源 / 货币 · 屏幕锚点 = 上中；按键 / 操作提示：画法 = 触屏按钮；按键 / 操作提示 · 屏幕锚点 = 右下；引导指示 / 聚光：画法 = NPC 气泡（对话推进式引导）；目标 / 路点：画法 = 标记图标；目标 / 路点 · 世界渲染（逐元素） = 地面贴花；转角 = 圆角 |

**关键元素与画法**

- **小地图 / 罗盘**（`el.minimap`）：plan / compassBar / radar；常见位置 bl、tc、br、tr。探索类的第一元素，三种形态回答的问题不同：罗盘条只回答「朝哪」，把画面中心留给风景（5 张，标了位置的 4 张全在上中）；平面小地图回答「周围的结构」，适合城市与密集据点（11 张；连同雷达，小地图类左下 7 张最多，因为右下常被武器 / 技能占）；圆环雷达适合骑乘与荒野（荒野大镖客 1 / 2）。零 HUD 作干脆不画，代价见 pitfalls。
- **目标 / 路点**（`el.objective`）：marker / text / checklist / edgeArrow；常见位置 tr、mr、tl。3A 开放世界把目标做成挂在兴趣点上的世界标记，清单只在追踪任务时出现（巫师 3 小地图下方的清单）；对马岛、Hellblade 把目标完全交给环境（风、符文），罗盘条作把目标并进刻度。探索类的目标文字越短越好：一个动词 + 一个地名。
- **生命 / 护盾 / 体力**（`el.vitals`）：bar / segmented / ring / thinBar / icons；常见位置 tl、bl、bc。这个品类里血量不是核心信息，多数只在受伤 / 冲刺时才出现（天际底部三条、荒野大镖客 2 的三个小圆环）。形态跟画风走：写实作用细条 / 横条，卡通作用心形图标列（旷野之息、Eastward），可数的回复量用分段格（刺客信条 IV、波斯王子）。左上 9 张，左下 3 张。
- **交互提示**（`el.interact`）：keyPrompt / bracket / cursor；常见位置 center、br。探索的一半操作是「检查 / 拾取 / 攀爬 / 对话」，提示要挂在物体上（elx.attachTo = poi），而不是固定在角落；古墓丽影用描边高亮代替常驻提示，Stray 只在可交互处出现一个按键图标。
- **按键 / 操作提示**（`el.prompt`）：contextual / legend；常见位置 br、tr、bc。情境按键随状态整组替换：刺客信条右上「头 / 手 / 脚」对应手柄四键，荒野大镖客 2 右下竖排列表，骑马 / 驾船时整组换掉。图标集要跟输入方式走（D-input）。
- **通知 / 大字提示**（`el.notify`）：toast / banner / band / pickupText；常见位置 tl、tc。探索的奖励感主要来自这里：发现地点的大字横幅（书法 / 衬线，带细线与小字副标题）、任务更新、拾取小字。荒野大镖客用左上黑底提示卡。必须短、自动消失、不叠成一摞。
- **字幕 / 说话人**（`el.subtitle`）：bare / bar / bubble；常见位置 bc。形态取 cmp.dialogBox 的值。步行模拟里字幕是唯一常驻的文字（Dear Esther 旁白、Firewatch 对讲机）；画面常是亮天空和雾，所以无框字幕至少要文字投影，最好有半透明底板（06 文档 A16：任何背景上 4.5:1）。
- **时间 / 天气 / 日历**（`el.clock`）：clock / sunDial / weather；常见位置 tr、bl。昼夜与天气会改变能做的事和危险程度：巫师 3 把时间写在右上小地图边上，荒野大镖客的天气影响追踪。纯艺术探索作不画，靠光线本身表达。
- **世界 / 社会态势条**（`el.meter`）：withIcon / single；常见位置 br、bl。把「环境危险」做成一个常驻小仪表：旷野之息小地图旁的温度计与声音计、刺客信条 大革命的人群发现度眼睛。画法用 cmp.gauge@el.meter = thermometer / eye。
- **信息叠层 / 图例**（`el.overlay`）：holo / statusIcons / rangeRing；常见位置 center。扫描 / 感知模式把信息投到世界上（地平线的聚焦、死亡搁浅的地形扫描标记、蝙蝠侠的侦探模式），平时完全不画——这是「零 HUD」与「信息充足」两全的主要办法。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots / ammo / ultimate / hotbar；常见位置 br。动作冒险的能力 / 道具在右下（霍格沃茨菱形四格法术、刺客信条 奥德赛四技能、蜘蛛侠小工具轮、Far Cry 弹药），标了位置的 3 张全在右下；选择多的用按住呼出的轮盘（耻辱）。
- **敌人血条 / 预警 / 意图**（`el.threat`）：healthBar / visionCone / edgeDir；常见位置 tc。只有潜行 / 战斗向探索作需要：被谁看见、从哪个方向来。纯探索作没有。挂在目标上（elx.attachTo = target），屏外威胁用边缘方向提示。

**重要界面**

- **局内 HUD**：探索 HUD 的第一旋钮是显隐（rel.hudVisibility）和密度（cnt.density）：全隐 7、情境显现 10、极简 + 稀疏 31 / 47。保留的元素按「方向 > 互动 > 状态 > 通知」排序；HUD 元素允许玩家逐项关闭（巫师 3、耻辱 2、荒野大镖客 2 都这样做）。 例：The Witcher 3: Wild Hunt — Remastered（steam:292030）、Journey（steam:638230）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Red Dead Redemption 2（steam:1174180 · 据已知描述） 等 5 款。
- **地图 / 世界地图**：全屏地图走「物件感」：羊皮纸 / 手绘水彩（巫师 3、刺客信条 IV、荒野大镖客、A Short Hike 的手绘纸张），或干脆是主角手里的纸（Firewatch、荒野大镖客 宝藏图，打开时世界不暂停）。未探索区用留白或云雾；3A 开放世界的图标密度高，需要图例筛选与追踪标记。零 HUD 作若把地图也省掉会被骂。 例：The Witcher 3: Wild Hunt — Remastered（steam:292030）、Red Dead Redemption（steam:2668510）、Firewatch（steam:383870）、A Short Hike（steam:1055540） 等 5 款。
- **背包 / 物品**：两种骨架：①人物纸娃娃居中或偏右 + 一侧或两侧格子（巫师 3 暗底；旷野之息顶部页签、左侧黑底方格、右侧人物、左下说明）；②贴纸 / 卡片横排（Knights And Bikes 底部撕边贴纸卡）。比较值用数字箭头，稀有度用边框色（刺客信条 奥德赛灰 / 蓝 / 紫 / 金）。与 NPC 交易时复用同一版式、左右两栏分属双方。 例：The Witcher 3: Wild Hunt — Remastered（steam:292030）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、Knights And Bikes（steam:592480）、Assassin's Creed Odyssey（steam:812140 · 据已知描述）。
- **对话 / 文本**：探索作的对话是轻量的、不切场景：Stray 深色方角卡 + 名字标头 + 右下「继续」键；旷野之息半透明黑底圆角框 + 关键词彩色 + 右侧竖排胶囊选项；A Short Hike 白色像素气泡挂在头上；The Artful Escape 右侧堆叠黑色圆角气泡；Firewatch 用对讲机语音 + 字幕代替对话框。 例：Stray（steam:1332010）、The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）、A Short Hike（steam:1055540）、The Artful Escape（steam:1122680） 等 5 款。
- **标题 / 主菜单**：标题即风景：GRIS 在水彩渐变上画同心圆 + 字距很大的细衬线；Journey 沙丘上的极简字。菜单项少，直接压在实时场景上，几乎没有面板。 例：GRIS（steam:683320）、Journey（steam:638230）。
- **技能树 / 成长**：成长界面与世界观合一：天际把技能树画成星空星座（对应 tpl.skilltree 的 constellation + glowDot）。 例：The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）。
- **任务日志 / 目标**：任务日志 = 清单 + 叙述文本；HUD 上只追踪一条。西部题材用剪报与木刻粗衬线（荒野大镖客），奇幻用羊皮纸书页（魔兽世界）。 例：Red Dead Redemption（steam:2668510）、The Witcher 3: Wild Hunt — Remastered（steam:292030）、World Of Warcraft（iig:world-of-warcraft）。
- **结算 / 胜负 / 奖励**：潜行任务结算：黑底等宽数据表 + 大号字母评级（MGSV），评分维度都是可数的（用时、被发现次数、击杀数）。只讲成绩，不做奖励演出。 例：METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）。
- **暂停菜单**：把系统菜单做成世界里的装置：MGSV 的 iDroid 是全息蓝单色面板，Starfield 的座舱屏；切进去时用镜头推进到物件（mo.transition = zoomInto）。 例：METAL GEAR SOLID V: THE PHANTOM PAIN（steam:287700）、Starfield（steam:1716740）。
- **教程 / 提示卡**：零 HUD 作的教学也叙事化：Hellblade 用耳边低语，TUNIC 用游戏里捡到的说明书页，Hyper Light Drifter 用无文字象形图——但要配一个能回看的地方。 例：Hellblade: Senua's Sacrifice（steam:414340）、TUNIC（steam:553420）、Hyper Light Drifter（steam:257850）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 暗色细线（`fam.dark-hairline`）（10 张）：3A 开放世界：HUD 让位给风景、菜单深色无框，信息靠情境显现。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（10 张）：情境渐显 · 角落小件：本品类主归属卡 A Plague Tale: Requiem、Stray、Marvel’s Spider-Man Remastered 等（理由见 17 号图谱该家族的「多见品类」）。
- 零 HUD · 世界即界面（`fam.zero-hud`）（7 张）：零 HUD · 世界即界面：本品类主归属卡 Riven、Firewatch、ABZU 等（理由见 17 号图谱该家族的「多见品类」）。
- 圆润友好（`fam.cozy`）（3 张）：旷野之息、Kena、超星觉醒、贪吃怪大作战、Cureocity：HUD 少，菜单圆润。
- 漫画对话框（`fam.comic`）（2 张）：竖屏动作冒险的剧情与选角（曙光重临、恐龙哪里跑）。
- 全息空间（`fam.holo`）（2 张）：Horizon、Batman：扫描 / 侦探模式是探索与战斗准备的工具。
- 线描花饰（`fam.filigree`）（1 张）：Hogwarts Legacy：魔法学院的金线。
- 孟菲斯（`fam.memphis`）（1 张）：手游（超级幻影猫）的粗描边漫画分格 + 浅蓝格子底。

**代表作**

- Ghost of Tsushima DC（steam:2215430 · 据已知描述）〔和风〕：引导之风代替任务箭头、HUD 平时全隐按键呼出、书法标题 + 毛笔面板：叙事内引导的标杆（卡为「商店图无 UI」，据已知描述）。R3 里有 3 条夸 UI 简洁；原来记的「挡视野 4 条」复核后有 2 条恰恰在夸 UI 不杂乱。
- Journey（steam:638230）〔零 HUD · 世界即界面〕：零 HUD 最纯粹的例子：围巾长度 = 飞行能量，符文亮度 = 剩余量。R3 去重后没有任何 UI 类抱怨达到 2 条。
- Firewatch（steam:383870）〔零 HUD · 世界即界面〕：地图与指南针就是主角手里的纸，打开时世界照常运行；对讲机语音代替对话框。
- The Witcher 3: Wild Hunt — Remastered（steam:292030）〔暗色细线〕：四角常驻的经典布局（左上头像 + 血条 + 法印、右上圆形小地图带时间、下方任务清单），且每个 HUD 元素都能单独关。
- The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）〔情境渐显 · 角落小件〕：顶部罗盘条 + 底部三条只在变化时出现 + 星座技能树：开放世界 RPG 式探索 HUD 的模板。
- The Legend Of Zelda Breath Of The Wild（iig:the-legend-of-zelda-breath-of-the-wild）〔圆润友好〕：心形血量、小地图旁的温度 / 声音计、对话关键词着色 + 右侧胶囊选项：卡通探索作的完整一套。
- DEATH STRANDING DIRECTOR'S CUT（steam:1850570）〔细字直压 · 排印叠层〕：白色细字全大写、扫描后世界里浮出地形标记：极简科幻的探索 HUD；R3 提到 UI 的 83 条里 72 条是好评。
- Horizon Forbidden West Complete Edition（steam:2420110 · 据已知描述）〔全息空间〕：罗盘条 + 聚焦时机器部件全息高亮（空间内），把「看懂敌人」做成一种感知模式。
- Stray（steam:1332010）〔情境渐显 · 角落小件〕：几乎无 HUD，机器人对话是深色方角卡 + 名字标头，翻译机器人当叙事入口；去重后提到 UI 的 46 条评测里 45 条是好评。

**坑**

- 零 HUD / 极简却没有替代的引导手段（环境引导、可回看的提示、按需呼出的目标），新手不知道下一步做什么 例：Hellblade: Senua's Sacrifice（steam:414340）、Starfield（steam:1716740）、GRIS（steam:683320）、A Plague Tale: Requiem（steam:1182900 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：A Plague Tale: Requiem 引导抱怨 3 条、Starfield 3 条、Hellblade 2 条；全库 41 款 ≥ 2 条，最多的 Scorn、Kingdom Two Crowns 各 7 条——同样属于「世界即界面」流派。
- 去掉小地图或地图过于写意，方向感全靠记忆 例：A Short Hike（steam:1055540）、Hyper Light Drifter（steam:257850）、Clair Obscur: Expedition 33（steam:1903340）。
  - 评价与证据（依据：评测）：R3 去重后：Clair Obscur 地图抱怨 13 条（全库单款最多）、Hyper Light Drifter 4 条、A Short Hike 3 条；全库 14 款 ≥ 2 条。
- 字幕、提示卡、拾取通知、问号图标在画面上层层叠加，挡住本来要看的风景 例：Starfield（steam:1716740）、Assassin's Creed Unity（steam:289650 · 据已知描述）。
  - 评价与证据（依据：截图）：评测证据不足：「HUD 太乱 / 挡视野」一类去重并人工复核后只剩 9 条、每款 1 条，没有一款达到 ≥ 2 条门槛。原来引用的对马岛 4、Rain World 3、Starfield 2 条复核后说的是内容设计、场景杂乱或在夸 UI；只有 Assassin's Creed Unity 有 1 条说地图呈现塞了太多元素。这条反例主要靠看图与设计推论。
- 菜单层级深、背包难管理（开放世界 RPG 的物品量大） 例：Starfield（steam:1716740）、Cyberpunk 2077（steam:1091500）、Assassin's Creed Unity（steam:289650 · 据已知描述）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）、Assassin's Creed Syndicate（steam:368500 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：Starfield 菜单 4 条、Assassin's Creed Unity 菜单 3 条、天际菜单 2 + 背包 2、Cyberpunk 2077 菜单 2 + 卡顿 2、Assassin's Creed Syndicate 菜单 1。
- 按显示器距离设计字号，电视 / 掌机上看不清
  - 评价与证据（依据：文献）：评测证据不足：字号类去重、收紧口径并逐条复核后全库只有 10 条 / 8 款，原来列的耻辱 2、霍格沃茨、死亡搁浅、战神：诸神黄昏的命中都不是在说文字。依据改为 XAG 101（电视 1080p 正文 ≥ 26px）。
- 情境按键与手柄键位对应不直观（同一键在不同状态下含义变化，提示跟不上） 例：Assassin's Creed 2（steam:33230 · 据已知描述）、Ghost of Tsushima DC（steam:2215430 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：Assassin's Creed 2 手柄 / 键位抱怨 3 条，对马岛 1 条。
- 战利品稀有度只靠颜色区分（灰 / 蓝 / 紫 / 金），色盲玩家分不开 例：Assassin's Creed Odyssey（steam:812140 · 据已知描述）。
  - 评价与证据（依据：文献）：无评测证据；06 文档 A5 可读性规则：稀有度色阶要配边框形状或粗细

**可演示的对比**

- **同一段野外跑图：四角常驻 vs 情境显现**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：横条 → 细条；信息密度：中等 → 稀疏；信息元素集合：生命 / 护盾 / 体力 + 小地图 / 罗盘 + 时间 / 天气 / 日历 + 目标 / 路点 + 技能 / 冷却 / 弹药 / 手牌 + 按键 / 操作提示 → 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 目标 / 路点 + 按键 / 操作提示；技能 / 冷却 / 弹药 / 手牌：画法：技能格 → 自动
  - 配套改动：HUD 显隐策略：常驻 → 情境显现；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 下中；小地图 / 罗盘：画法：平面小地图 → 罗盘条；小地图 / 罗盘 · 屏幕锚点：右上 → 上中；时间 / 天气 / 日历：画法：时钟数字 → 自动；时间 / 天气 / 日历 · 屏幕锚点：右上 → 自动；目标 / 路点：画法：任务清单 → 标记图标；目标 / 路点 · 屏幕锚点：右中 → 自动；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；面板明度：深色面板 → 中明度；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；按键 / 操作提示 · 显隐（逐元素）：继承 → 情境显现；生命 / 护盾 / 体力 · 显隐（逐元素）：继承 → 情境显现；文字可读辅助：自动 → 投影；底不透明度：1 → 0
  - 看什么：看画面中心和上半屏：a 四角都有面板，b 只剩一条罗盘和世界里的标记，受伤 / 攀爬时细条才出现。用屏占比读数对比，再想清楚 b 丢掉的时间与技能冷却要靠什么补（光线、角色动作、按键呼出）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-explore#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.container=overlay` `lay.hudOrg=scattered` `el.vitals.count=2` `el.prompt.form=contextual` `el.prompt.screenAnchor=br` `vis.stroke=solid` `vis.strokeWidth=1`
  - A：`rel.hudVisibility=always` `cnt.density=2` `cnt.elements=el.vitals+el.minimap+el.clock+el.objective+el.abilities+el.prompt` `cmp.gauge@el.vitals=bar` `el.vitals.screenAnchor=tl` `el.minimap.form=plan` `el.minimap.screenAnchor=tr` `el.clock.form=clock` `el.clock.screenAnchor=tr` `el.objective.form=checklist` `el.objective.screenAnchor=mr` `el.abilities.form=slots` `el.abilities.screenAnchor=br` `col.lightness=dark` `el.objective.attachTo=none` `el.prompt.visibility=inherit` `el.vitals.visibility=inherit` `typ.legibility=auto` `vis.opacity=1`
  - B：`rel.hudVisibility=contextual` `cnt.density=1` `cnt.elements=el.vitals+el.minimap+el.objective+el.prompt` `cmp.gauge@el.vitals=thinBar` `el.vitals.visibility=contextual` `el.vitals.screenAnchor=bc` `el.minimap.form=compassBar` `el.minimap.screenAnchor=tc` `el.objective.form=marker` `el.objective.attachTo=poi` `el.prompt.visibility=contextual` `vis.opacity=0` `typ.legibility=shadow` `col.lightness=mid` `el.abilities.form=auto` `el.abilities.screenAnchor=auto` `el.clock.form=auto` `el.clock.screenAnchor=auto` `el.objective.screenAnchor=auto`

  </details>
- **目标指引：屏幕标记 + 边缘箭头 vs 世界里的环境引导**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线）；场景依次切换：雾天（mountain） → 夜间（snowVillage））
  - 承载原则的参数：信息元素集合：目标 / 路点 + 小地图 / 罗盘 → 目标 / 路点；小地图 / 罗盘：画法：罗盘条 → 自动；小地图 / 罗盘 · 屏幕锚点：上中 → 自动；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点
  - 配套改动：HUD 显隐策略：常驻 → 电影模式（全隐）；目标 / 路点：画法：标记图标 + 屏幕边缘箭头 + 目标文字 → 标记图标；目标 / 路点 · 放置方式（逐元素）：屏幕叠加 → 叙事内；目标 / 路点 · 屏幕锚点：右上 → 自动；目标 / 路点 · 世界渲染（逐元素）：继承 → 地面贴花；默认放置方式：屏幕叠加 → 叙事内；UI 与画面关系：自动 → 同一媒介
  - 看什么：同一个目标点：a 用图标 + 屏幕边缘箭头 + 一行字，b 只在世界里留下痕迹。切到雾天和夜晚看 b 还找不找得到路——这正是对马岛被夸、A Plague Tale / Hellblade 被骂引导不清的分界线。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-explore#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.container=overlay`
  - A：`rel.hudVisibility=always` `cnt.elements=el.objective+el.minimap` `el.objective.form=marker+edgeArrow+text` `el.objective.diegesis=screen` `el.objective.screenAnchor=tr` `el.minimap.form=compassBar` `el.minimap.screenAnchor=tc` `el.objective.attachTo=none` `el.objective.worldRender=inherit` `rel.diegesis=screen` `rel.harmony=auto`
  - B：`rel.hudVisibility=hidden` `rel.diegesis=diegetic` `rel.harmony=sameMedium` `cnt.elements=el.objective` `el.objective.form=marker` `el.objective.diegesis=diegetic` `el.objective.attachTo=poi` `el.objective.worldRender=decal` `el.minimap.form=auto` `el.minimap.screenAnchor=auto` `el.objective.screenAnchor=auto`

  </details>
- **大地图：羊皮纸手绘 vs 战术全息**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：地图画风：羊皮纸古海图 → 战术线框 / 全息
  - 配套改动：地图未探索区：留白（纸面空白） → 只有轮廓；节点形态：图标针 → 发光点；连线样式：虚线 / 点线 → 光束 / 发光线；内芯材质：羊皮纸 → 全息网格；标题字族：衬线 → 窄体；面板明度：浅色面板 → 深色面板；标题大小写：自动 → 全大写
  - 看什么：同一组兴趣点在两种地图画风下的气质差别：未探索区是纸面留白还是线框轮廓、标记是图钉还是发光点、路线是虚线还是光束；再看图例和地名在两种底上是否都可读。
  - 注：`vis.connector` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-explore#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.map` `lay.container=fullscreen` `rel.behind=replaced` `cnt.dataShape=spatial` `ast.core=texture` `ctx.locale=en` `col.strategy=mono`
  - A：`vis.mapStyle=parchment` `vis.mapUnexplored=blank` `cmp.node=pin` `vis.connector=dashed` `ast.coreMat=parchment` `typ.display.family=serif` `col.lightness=light` `typ.display.case=auto`
  - B：`vis.mapStyle=tactical` `vis.mapUnexplored=outlineOnly` `cmp.node=glowDot` `vis.connector=beam` `ast.coreMat=hologram` `typ.display.family=condensed` `typ.display.case=upper` `col.lightness=dark`

  </details>
- **感知模式：常态 HUD vs 扫描 / 侦探视觉层**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：小地图 / 罗盘 + 交互提示 → 小地图 / 罗盘 + 交互提示 + 信息叠层 / 图例 + 敌人血条 / 预警 / 意图；主题色变化：固定 → 随形态 / 机制切换；交互提示：画法：按键图标 + 文字 → 锁定括号；信息叠层 / 图例：画法：无 → 全息覆盖 + 状态图标
  - 配套改动：默认放置方式：屏幕叠加 → 空间内；背后调色：原样 → 双色调；叠加特效层：自动 → 扫描线；交互提示 · 世界渲染（逐元素）：继承 → 物体描边；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；敌人血条 / 预警 / 意图：画法：无 → 敌人血条 + 视锥；世界内标注渲染（默认）：自动 → 物体描边高亮
  - 看什么：b 是按键切入的第二层：场景整体去色成双色调，可交互物与敌人描边、全息标签浮在物体上。看两层之间的切换是否一眼可辨，以及 b 的信息量回到常态时是否完全收走。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-explore#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.container=overlay` `rel.hudVisibility=contextual` `el.minimap.form=compassBar` `el.minimap.screenAnchor=tc` `el.interact.attachTo=poi` `col.strategy=mono`
  - A：`rel.diegesis=screen` `rel.sceneTone=none` `cnt.elements=el.minimap+el.interact` `el.interact.form=keyPrompt` `ast.fx=auto` `col.dynamic=fixed` `el.interact.worldRender=inherit` `el.overlay.form=[]` `el.threat.attachTo=none` `el.threat.form=[]` `rel.worldRender=auto`
  - B：`rel.diegesis=spatial` `rel.sceneTone=duotone` `rel.worldRender=outline` `col.dynamic=perMode` `ast.fx=scanlines` `cnt.elements=el.minimap+el.interact+el.overlay+el.threat` `el.interact.form=bracket` `el.interact.worldRender=outline` `el.overlay.form=holo+statusIcons` `el.threat.form=healthBar+visionCone` `el.threat.attachTo=target`

  </details>
- **同一份探索信息：电视手柄横屏 vs 手机单手竖屏**（整套做法对照（多个参数一起变）；内容包：snowline · 雪线旅人；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：生命 / 护盾 / 体力 + 小地图 / 罗盘 + 按键 / 操作提示 + 目标 / 路点 → 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 按键 / 操作提示 + 目标 / 路点 + 引导指示 / 聚光；设备与观看距离：主机 / 电视 → 手机；输入方式：手柄 → 触屏；画幅朝向：横屏 → 竖屏
  - 配套改动：按键提示图标集：PlayStation → 触屏图标；HUD 显隐策略：情境显现 → 常驻；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 上中；小地图 / 罗盘：画法：罗盘条 → 平面小地图；小地图 / 罗盘 · 屏幕锚点：上中 → 左上；按键 / 操作提示：画法：情境按键 → 触屏按钮；目标 / 路点：画法：目标文字 → 标记图标；目标 / 路点 · 屏幕锚点：右上 → 自动；引导指示 / 聚光：画法：自动 → 光圈脉冲；目标 / 路点 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；目标 / 路点 · 世界渲染（逐元素）：继承 → 地面贴花；握持与拇指区：自动 → 竖屏单手；虚拟摇杆：自动 → 浮动摇杆；转角：直角 → 圆角
  - 看什么：按派生规则 D-device / D-orient / D-input 重排：b 的操作集中到拇指区、目标改成地面光圈、提示变成触屏按钮、字更大更少。看哪些信息在竖屏里被迫常驻（没有按键呼出）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-explore#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=snowline` `cnt.screen=screen.hud` `lay.hudOrg=scattered` `el.prompt.screenAnchor=br`
  - A：`ctx.device=tv` `ctx.orientation=landscape` `ctx.input=pad` `ix.glyphs=playstation` `rel.hudVisibility=contextual` `cnt.elements=el.vitals+el.minimap+el.prompt+el.objective` `el.vitals.screenAnchor=tl` `el.minimap.form=compassBar` `el.minimap.screenAnchor=tc` `el.prompt.form=contextual` `el.objective.form=text` `el.objective.screenAnchor=tr` `el.guide.form=auto` `el.objective.attachTo=none` `el.objective.worldRender=inherit` `ix.thumbZone=auto` `ix.touchStick=auto` `vis.corner=sharp`
  - B：`ctx.device=phone` `ctx.orientation=portrait` `ctx.input=touch` `ix.glyphs=touch` `ix.touchStick=floating` `ix.thumbZone=oneHand` `rel.hudVisibility=always` `cnt.elements=el.vitals+el.minimap+el.prompt+el.objective+el.guide` `el.vitals.screenAnchor=tc` `el.minimap.form=plan` `el.minimap.screenAnchor=tl` `el.prompt.form=touchButtons` `el.objective.form=marker` `el.objective.attachTo=poi` `el.objective.worldRender=decal` `el.guide.form=ring` `vis.corner=round` `el.objective.screenAnchor=auto`

  </details>

**样例内容**：荒野徒步（写实开放世界）（`snowline#hiking`）、群岛航海（`snowline#archipelago`）、废墟机械（科幻探索）（`snowline#ruins-mech`）、城市屋顶潜行（`snowline#rooftop-stealth`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（6 项）</summary>

- el.objective.form 缺「环境引导」选项（风向、鸟群、油漆 / 布条标记、光路）：现在只能用 el.objective.diegesis = diegetic + marker 近似，画出来仍是一个图标（证据 steam:2215430（据已知描述）、steam:414340）
- 缺玩家侧的 HUD 自定义：逐元素开关与预设（全显 / 精简 / 沉浸），巫师 3、耻辱 2、荒野大镖客 2 都当标配；elx.visibility 是设计参数不是玩家选项，建议在 a11y 组加 a11y.hudPreset
- 缺「被发现进度」的专门表达：潜行冒险的眼睛标记（steam:289650 · 据已知描述）现在只能 el.meter + cmp.gauge = eye 近似，el.threat.form 有视锥但没有挂在敌人头上的发现度填充
- 缺「感知 / 扫描模式」作为一个整体状态：现在要同时改 rel.sceneTone、el.overlay、rel.worldRender、col.dynamic 四处，建议一个模式开关（或一条微调方向 / 叠加预设）并演示切换转场
- 大地图缺标记密度与图例筛选参数：开放世界「问号清单」的密度是 3A 与艺术探索作风格差异的大头，建议 map 级参数 poiDensity + 图例筛选开关
- 缺地点发现卡的专属画法：现在用 el.notify = banner / band 近似，建议 el.title.form 增加 placeName（大字地名 + 细线 + 小字副标题，可书法 / 衬线）

</details>

**最相关的原则**（按针对性排序）：[P-contextual-hud](#p-contextual-hud)、[P-hudless-tax](#p-hudless-tax)、[P-map-conventions](#p-map-conventions)、[P-journal-codex](#p-journal-codex)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-device-bridge](#p-device-bridge)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-adaptive-layers](#p-adaptive-layers)、[P-prompt-in-context](#p-prompt-in-context)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-view-distance](#p-view-distance)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-glyph-follows-device](#p-glyph-follows-device) 等 34 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.2 动作与 Roguelite

参考卡 24 张 · 探索台内容包：action（铁炉矿坑）、soulslike（没落王城）、survivors（深海潜航）

动作与 Roguelite 的 HUD 遵守三条：威胁比自身显眼、四角留白（中央约 60% 给战斗）、数值可数而不是可读。镜头越近、越电影，HUD 越该退场；反馈层（评价字、拟声字）能决定作品性格——同一套血条加技能的版式，换掉反馈这一层，作品就变了。

**子类**：魂类（ELDEN RING、Lies of P、Sekiro、Black Myth: Wukong）；电影式动作冒险（God of War 两作、STAR WARS Jedi: Survivor、Kena、Batman: Arkham City）；俯视 / 横版动作 Roguelite（Hades 两作、Dead Cells、Hyper Light Drifter、TUNIC）；角色动作 / 风格评价（Devil May Cry 5、Hi-Fi RUSH）；清版合作（Castle Crashers）；音乐动作 / 弹幕闪避（Sayonara Wild Hearts、Just Shapes & Beats、Beat Saber VR）；潜行跑酷动作（Assassin's Creed）；手游动作（幻塔、绝区零剧情屏；触屏战斗 HUD 取自手游批：暖雪、天涯明月刀、三界天骄）

**证据说明**：24 张里 8 张商店图无 UI（战神两作、星战、刺客、Kena、Batman 等按已知 HUD 记）。能看清 HUD 的：Hades、ELDEN RING、Black Myth: Wukong（IIG 原图）、Hi-Fi RUSH、Castle Crashers、Hyper Light Drifter、Just Shapes & Beats、Assassin's Creed、Hades II、Dead Cells。

**关键发现**

- 威胁 > 自身：敌人前摇和 Boss 状态的显眼程度要高于玩家自己的特效与数值（06 文档 A2：玩家特效降亮度，把注意力留给威胁）。
- 四角留白：所有常驻元素贴边，画面中央 60% 留给战斗。Hades 把装饰预算拉满（vis.ornament = 3）仍然不挡战斗，因为装饰只出现在边缘。
- 数值要'可数'而不是'可读'：战斗中没时间读数字，所以用细条长度、分段格、图标个数。只有 Roguelite 这种可以停下来想的品类，才在条尾加 122/160 这样的读数。
- 显隐跟着镜头走：电影式一镜到底的作品默认情境显现（rel.hudVisibility = contextual），魂类与 Roguelite 默认常驻。镜头越近、越电影，HUD 越该退场。
- 反馈元素能决定作品性格：DMC5 / Hi-Fi RUSH 把评价字、拟声字放大成 HUD 的主角，同一套血条加技能的版式，只要换掉反馈这一层，作品性格就变了。

**一眼要知道什么**

1. 我还能挨几下：血量，以及治疗还剩几次（药壶 / 葫芦 / 回血次数）。细条要配'延迟拖尾'，才看得清这一下掉了多少。
2. 下一次闪避 / 格挡 / 技能的资源够不够：体力、法力、怒气、架势这类会被一次操作花掉的条。
3. 敌人下一招是什么、能不能挡：前摇高亮、攻击类型颜色（例如红色 = 不可格挡）、头顶警示字。这条比自己的任何数值都优先。
4. Boss 还剩多少、进了第几阶段：Boss 长条加名字，放在不挡战斗的位置（底中或顶中）。
5. 哪个技能 / 道具已就绪：冷却扇形、就绪发光；快捷栏当前选中的是哪一格。
6. 屏幕外有没有攻击来：屏幕边缘来袭方向箭头。越肩镜头尤其需要，因为背后看不到。
7. 我打得怎么样：连击数、风格评价字母（角色动作类的核心奖励回路）、伤害飘字。
8. 这一局拿到了哪些构筑：Roguelite 的祝福 / 遗物 / 被动列。细节不必一眼看清，但件数要能一眼数出来。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 魂系四角：常驻三细条 + 十字快捷栏 + 底中 Boss 长条 + 右下货币 | 4 / 24（ELDEN RING、Lies of P、Black Myth: Wukong、Sekiro）。血条位置分两派：ELDEN RING 在左上，Lies of P 与黑神话在左下；Boss 条都在底中 | ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）、Lies of P（steam:1627720 · 据已知描述）、Sekiro（steam:814380 · 据已知描述） | HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 稀疏；生命 / 护盾 / 体力：条数 = 3；数值图形（生命 / 护盾 / 体力） = 细条；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 十字四向；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左下；敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字；敌人血条 / 预警 / 意图 · 屏幕锚点 = 下中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 右下；小地图 / 罗盘：画法 = 罗盘条；小地图 / 罗盘 · 屏幕锚点 = 上中；标题字族 = 衬线；装饰预算 = 少；数值变化 = 延迟拖尾（渲染说明：mo.valueChange@el.vitals 改写为全局 mo.valueChange（渲染器只读全局值）） |
| 电影式情境显现：左下细条 + 右下大招 / 符文，敌人头顶小血条，平时几乎无 UI | 约 6 / 24（God of War、God of War Ragnarök、Jedi: Survivor、Kena、Batman: Arkham City；Sekiro 的敌人头顶条也属这一型），其中 5 张商店图无 UI | God of War（steam:1593500 · 据已知描述）、God of War Ragnarök（steam:2322010 · 据已知描述）、STAR WARS Jedi: Survivor（steam:1774580 · 据已知描述）、Kena: Bridge of Spirits（steam:1954200 · 据已知描述） 等 5 款 | HUD 组织方式 = 分散组件；HUD 显隐策略 = 情境显现；信息密度 = 稀疏；数值图形（生命 / 护盾 / 体力） = 细条；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现；技能 / 冷却 / 弹药 / 手牌：画法 = 大招充能；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；敌人血条 / 预警 / 意图：画法 = 敌人血条 + 屏幕边缘方向提示；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；敌人血条 / 预警 / 意图 · 放置方式（逐元素） = 空间内 |
| 俯视 Roguelite：四角 + 侧边构筑列（祝福竖排）+ 顶中 Boss 条 + 飘字 | 3 / 24（Hades、Hades II、Dead Cells）。Hades 的双 Boss 条在顶中并排；Dead Cells 是变体：左下大血条 + 下中四格武器 + 右上小地图 | Hades（steam:1145360）、Hades II（steam:1145350）、Dead Cells（steam:588650） | HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 中等；数值图形（生命 / 护盾 / 体力） = 横条；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；生命 / 护盾 / 体力 · 数值标注 = 当前 / 上限；生命 / 护盾 / 体力 · 数值标注位置 = 条尾；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 竖列；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 右下；敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字 + 敌人血条；敌人血条 / 预警 / 意图 · 屏幕锚点 = 上中；命中反馈 / 连击：画法 = 飘字；命中反馈 / 连击 · 世界挂点 = 目标 / 敌人；装饰预算 = 华丽 |
| 风格评价 / 漫画反馈：评价字母独占一角并越打越大，拟声字整屏砸入 | 3 / 24（Devil May Cry 5、Hi-Fi RUSH 两张卡）。Batman 的连击数是弱化版：只有数字，没有评价档 | Hi-Fi RUSH（steam:1817230）、Hi Fi Rush（iig:hi-fi-rush）、Devil May Cry 5（steam:601150 · 据已知描述）、Batman: Arkham City - Game of the Year Edition（steam:200260 · 据已知描述） | HUD 组织方式 = 分散组件；信息密度 = 中等；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；命中反馈 / 连击：画法 = 评价字（Good! / Perfect） + 连击大数字 + 拟声字；命中反馈 / 连击 · 屏幕锚点 = 右上；命中反馈 / 连击 · 大小 / 突出度 = 1.8；入场动效 = 砸入（放大落下 + 震）；反馈强度 = 0.9；倾斜角 = -10；标题字族 = 涂鸦 |
| 合作清版：顶部一排玩家头像框（每人一色）+ 底部 Boss 条 | 1 / 24（Castle Crashers）。分屏合作见平台跳跃的 It Takes Two | Castle Crashers（steam:204360） | HUD 组织方式 = 贴边整条；同屏玩家与视口 = 本地合作共享一屏；信息密度 = 中等；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 上中；队伍 / 玩家条 · 内部排布 = 横排；数值图形（生命 / 护盾 / 体力） = 横条；语义颜色编码 = 玩家 / 频道色；敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字；敌人血条 / 预警 / 意图 · 屏幕锚点 = 下中；描边线型 = 实线 |
| 音乐动作：零 HUD，危险色是唯一信号，顶部只有一条关卡进度细线 | 3 / 24（Just Shapes & Beats：玩家青、危险品红，顶部细进度条带检查点；Sayonara Wild Hearts 只在关末给评级；Beat Saber 的分数浮在轨道两侧，是空间内 UI） | Just Shapes & Beats（steam:531510）、Sayonara Wild Hearts（steam:1122720）、Beat Saber（steam:620980） | HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；骨架色彩策略 = 双色调；计时 / 分数 / 回合：画法 = 以数值图形呈现；数值图形（计时 / 分数 / 回合） = 细条；计时 / 分数 / 回合 · 屏幕锚点 = 上中；命中反馈 / 连击：画法 = 评价字（Good! / Perfect） |
| 像素小格 + 世界承担：左上一小排血格 / 能量，其余信息交给画面里的发光图形 | 2 / 24（Hyper Light Drifter、TUNIC；TUNIC 右上还有三格道具，说明书是叙事内的纸页） | Hyper Light Drifter（steam:257850）、TUNIC（steam:553420） | HUD 显隐策略 = 常驻；信息密度 = 极简；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；生命 / 护盾 / 体力 · 大小 / 突出度 = 0.7；UI 像素化 = 与世界同网格；UI 与画面关系 = 同一媒介；图标风格 = 像素 |
| 元 UI：整个 HUD 是剧情里一台机器的界面（同步率、计时、故障闪烁） | 1 / 24（Assassin's Creed：Animus 同步率 + 计时，右侧把头 / 手 / 脚映射成手柄按键的菱形图）。绝区零剧情屏用老电视故障效果，是同一思路的变体 | Assassin's Creed: Director's Cut Edition（steam:15100）、绝区零（米哈游）（gameui:13081） | 默认放置方式 = 元 UI；信息密度 = 稀疏；计时 / 分数 / 回合 · 屏幕锚点 = 左上；按键 / 操作提示：画法 = 情境按键；按键 / 操作提示 · 屏幕锚点 = 右上；元 UI 屏幕效果 = 故障 |
| 手游横屏触屏动作：左侧浮动摇杆 + 右下大攻击键 + 弧形技能键，左上头像细条 | 库外补充：动作 24 张里没有触屏战斗卡，取自手游批（暖雪是动作 Roguelite，天涯明月刀与三界天骄是 MMO 战斗） | 暖雪-手游（gameui:6750）、天涯明月刀（gameui:12771）、三界天骄（gameui:6729） | 输入方式 = 触屏；画幅朝向 = 横屏；虚拟摇杆 = 浮动摇杆；触屏按钮布局 = 大键 + 弧形环绕；握持与拇指区 = 横屏双拇指；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 环绕中心 / 轮盘；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；数值图形（生命 / 护盾 / 体力） = 细条；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；身份 / 头像 / 等级：画法 = 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点 = 左上；信息密度 = 稀疏（渲染说明：vis.silhouette@el.abilities 已移除（渲染器不读这个按元素覆盖）） |

**关键元素与画法**

- **生命 / 护盾 / 体力**（`el.vitals`）：thinBar ×7（魂系、战神、TUNIC） / bar ×6（Hades、Dead Cells、Jedi、Kena、Hi-Fi RUSH 的斜吉他形） / segmented ×2（DMC5、Hyper Light Drifter） / el.vitals.count = 3（血 / 体力 / 法力三条并排）；常见位置 bl ×9、tl ×5。动作游戏只能用余光读血。放在左下，离画面下半部的角色更近；魂类放左上，是为了把整个下半屏让给快捷栏和 Boss 条。细条加延迟拖尾能看清'这一下掉了多少'，比读数字快。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：hotbar ×5（魂系四格快捷栏、黑神话的葫芦 + 法术盘） / slots ×3（Hades 左侧祝福竖列、Dead Cells 下中四格） / ultimate ×2（战神怒气 / 符文冷却） / 触屏：大攻击键 + 弧形技能（暖雪）；常见位置 br ×4、bl ×3、ml ×1、bc ×1、tr ×1。动作的技能是'按的'而不是'看的'，手柄玩家靠肌肉记忆，所以图标只需要表达就绪 / 冷却 / 当前选中。魂系用十字四格对应十字键，键位和格子的位置一一对上。
- **敌人血条 / 预警 / 意图**（`el.threat`）：bossBar ×4（魂系底中带名字；Hades 顶中两条并排） / healthBar ×4（头顶小血条，attachTo = target：战神、Sekiro、Batman） / telegraph（God of War Ragnarök 攻击前用颜色圈区分攻击类型；Sekiro 头顶红色'危'字） / edgeDir（God of War 屏幕边缘来袭箭头）；常见位置 bc、tc、挂在目标上。这个品类的核心是读敌人。Boss 条做成全屏最长的元素，是在告诉玩家'这场战斗的进度'；小怪血条挂在头顶，视线不用离开目标。前摇提示决定能不能活下来，所以要有颜色以外的冗余（字符、形状）。
- **命中反馈 / 连击**（`el.feedback`）：rating（DMC5 评价从 D 升到 SSS；Hi-Fi RUSH 字母评级；Sayonara 关末评级） / comicSFX（Hi-Fi RUSH 整屏网点拟声字） / combo（Batman 连击数、Hi-Fi RUSH 的 6 HITS） / floatNumbers（Hades、Dead Cells 伤害飘字）；常见位置 tr / mr（评价字）、挂在目标上（飘字）、center（拟声字）。反馈是动作类的奖励回路。评价字放在右侧固定位置，好让玩家用余光确认'还在升档'；飘字挂在目标上，确认'打中了谁'。反馈的夸张程度（mo.juice）直接决定作品性格。
- **资源 / 货币**（`el.resources`）：iconNumber（Hades 右下货币 342、ELDEN RING 右下框内卢恩数）；常见位置 br。货币在战斗中不重要，放在最不占注意力的右下角，只在拾取时跳动。
- **小地图 / 罗盘**（`el.minimap`）：compassBar（ELDEN RING 顶部罗盘条，只标方位与地标） / plan（Dead Cells 右上） / 多数动作游戏不放小地图；常见位置 tc、tr。线性关卡和竞技场式战斗不需要小地图。开放世界动作用罗盘条，只给方向、不给地形，避免玩家盯着地图跑。
- **按键 / 操作提示**（`el.prompt`）：contextual（Assassin's Creed 右侧头 / 手 / 脚对应按键的菱形图；ELDEN RING 左中'Parry'一类动作名小签）；常见位置 tr、ml。动作类按键随情境变（攀爬、处决、弹反），所以只在可用时提示当前能做的动作。
- **队伍 / 玩家条**（`el.party`）：frames（Castle Crashers 顶部四人头像 + 血 / 魔条，每人一色）；常见位置 tc。同屏合作要能一眼找到'我是哪个'，所以用玩家色编码头像框，而不是一律同色。
- **计时 / 分数 / 回合**（`el.timer`）：number（Assassin's Creed 左上计时） / gauge（Just Shapes & Beats 顶部关卡进度细线 + 检查点三角）；常见位置 tl、tc。计时只在试炼 / 关卡制作品里出现；音乐动作用'歌曲进度'代替血量，告诉玩家离终点还多远。
- **字幕 / 说话人**（`el.subtitle`）：无框字幕压在底部中间（幻塔、绝区零剧情）；常见位置 bc。动作游戏的剧情常在实时场景里播，无框字幕不打断画面；可读性靠描边 / 投影（D-lightness-text）。

**重要界面**

- **局内 HUD**：四角分散、中央留白；Boss 条是最长的元素（底中或顶中）；血 / 技能分左右下角；评价 / 连击放右侧；电影向默认情境显现，魂系与 Roguelite 常驻。 例：ELDEN RING（steam:1245620）、Hades（steam:1145360）、Black Myth: Wukong（steam:2358720）、Hi-Fi RUSH（steam:1817230）。
- **背包 / 物品**：暗底或半透明黑底 + 细线方格，右侧是大图标和说明文字，顶部是分类页签；整体比 HUD 正式，但仍是暗色细线，不加厚框。 例：ELDEN RING（steam:1245620）、Black Myth: Wukong（steam:2358720）。
- **角色 / 装备 / 属性**：装备页是'左格右表'：左侧装备格，右侧一长列属性数值，衬线标题；角色本身不占画面（和 RPG 的纸娃娃居中不同）。 例：ELDEN RING（steam:1245620）。
- **技能树 / 成长**：Roguelite 的永久成长做成'列表式天赋'：紫金雕花外框里一列条目，每条是图标 + 名称 + 数值，而不是连线的树。 例：Hades（steam:1145360）。
- **对话 / 文本**：左侧大立绘 + 底部带名牌的文本框（Hades 金框、Hades II 圆角深色框）；Hi-Fi RUSH 用漫画分格把几个说话人排成一排；手游剧情多用无框字幕。 例：Hades（steam:1145360）、Hades II（steam:1145350）、Hi-Fi RUSH（steam:1817230）、幻塔（完美世界）（gameui:3522）。
- **结算 / 胜负 / 奖励**：关卡评价以字母为最大元素（DMC5 的 D 到 SSS），下面再列时间、伤害等细项；音乐动作只给一张评级卡。 例：Sayonara Wild Hearts（steam:1122720）、Devil May Cry 5（steam:601150 · 据已知描述）。
- **标题 / 主菜单**：卡通动作：彩色粗描边大按钮竖排堆在左侧，右侧是角色群像插画（Castle Crashers）。 例：Castle Crashers（steam:204360）。
- **读取 / 过场**：深色渐变 + 一条细进度线（幻塔）；或者把读取屏做成作品母题的道具，例如老电视加胶片齿孔边（绝区零）。 例：幻塔（完美世界）（gameui:3522）、绝区零（米哈游）（gameui:13081）。
- **图鉴 / 收集 / 成就**：叙事内说明书：图鉴 / 教程是游戏里捡到的纸页，用读不懂的文字写，靠插图传达信息（TUNIC）。 例：TUNIC（steam:553420）。
- **关卡 / 章节选择**：音乐动作：深色底上的关卡节点路径，节点即歌曲。 例：Just Shapes & Beats（steam:531510）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 暗色细线（`fam.dark-hairline`）（5 张）：魂系动作：极简细条 HUD + 厚重属性页，深色衬背景与暗黑美术同调。
- 科幻 HUD（`fam.scifi`）（3 张）：动作游戏只借用两角式和细条，科幻感主要来自世界（Jedi、幻塔、刺客信条的 Animus 元 UI）。
- 重装饰雕花框（`fam.ornate-frame`）（2 张）：Hades 系列：菜单级器物框，局内 HUD 仍轻。
- 漫画对话框（`fam.comic`）（2 张）：节奏动作（Hi-Fi Rush 局内 + 商店）：拟声字是打击反馈。
- 合成波 / 蒸汽波（`fam.synthwave`）（2 张）：Sayonara Wild Hearts、Beat Saber：音乐驱动的动作，几乎零 HUD。
- 像素位图（`fam.pixel`）（2 张）：Hyper Light Drifter、Dead Cells：左上 / 左下小簇血格 + 技能格。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（2 张）：情境渐显 · 角落小件：本品类主归属卡 God of War、God of War Ragnarök（理由见 17 号图谱该家族的「多见品类」）。
- 糖果卡通（Q 版）（`fam.candy`）（1 张）：主机卡通动作（Castle Crashers、王国之心）用饱和色条和头像环，保持和角色同样的「卡通物理」。

**代表作**

- ELDEN RING（steam:1245620）〔暗色细线〕：魂系模板最完整：左上八角头像槽 + 三细条（红 / 蓝 / 绿）、顶中罗盘条、左下十字四格、底中 Boss 条带名字、右下框内货币。所有元素贴边，中央全空。
- Hades（steam:1145360）〔重装饰雕花框〕：俯视 Roguelite 的四角加侧列：左侧菱形祝福竖列带等级、左下血条带读数、顶中两条 Boss 条并排、右下货币。装饰预算拉满但只在边缘，所以不挡战斗。
- Black Myth: Wukong（steam:2358720）〔暗色细线〕：同一个魂系版式，只靠 Boss 条两端的祥云卷纹和书法标题就换成了东方；右下六边形法术格 + 葫芦，血条情境显现。
- Hi-Fi RUSH（steam:1817230）〔漫画对话框〕：反馈层当主角：左上斜吉他形血条、右上漫画爆炸框评级字母、整屏网点拟声字。HUD 风格就是游戏的节奏性格。
- Devil May Cry 5（steam:601150 · 据已知描述）〔倾斜动感〕：风格评价字从 D 升到 SSS，越打越大越华丽，结算也按字母评分（商店图无 UI，按已知 HUD 记）。
- Just Shapes & Beats（steam:531510）〔扁平几何 · 地图即界面〕：无 HUD 的极端：玩家青、危险品红，界面只剩一条顶部进度线，颜色就是全部规则。
- Castle Crashers（steam:204360）〔糖果卡通（Q 版）〕：同屏四人合作：顶栏四个头像框，每人一色，名字、血、魔都在框里。
- 暖雪-手游（gameui:6750）〔暗色细线〕：触屏动作模板：左上头像 + 细血条 + 计时，右下大剑形攻击键 + 弧形技能键，左半屏浮动摇杆。

**坑**

- 零 / 近零 HUD 让新手迷路、看不懂目标：极简动作作把引导全交给世界，玩家不知道去哪、该做什么。 例：ELDEN RING（steam:1245620）、TUNIC（steam:553420）、Kena: Bridge of Spirits（steam:1954200 · 据已知描述）、STAR WARS Jedi: Survivor（steam:1774580 · 据已知描述）。
  - 评价与证据（依据：评测）：R3'提示 / 引导不清'在本品类去重后 4 款 ≥ 2 条：STAR WARS Jedi: Survivor 3 条、ELDEN RING 3 条、Kena 2 条、TUNIC 2 条（关键词粗筛）。
- 省掉小地图后回头找路成本很高：像素动作与魂类常被说地图难用或没有地图。 例：Hyper Light Drifter（steam:257850）、Black Myth: Wukong（steam:2358720）。
  - 评价与证据（依据：推断）：地图难用 / 没有地图（去重后）：Hyper Light Drifter 4 条（本品类单款最集中）、Black Myth: Wukong 2 条。
- 特效与 HUD 抢画面：俯视动作满屏特效、Boss 条与飘字叠在一起，敌弹被吞掉。 例：Hades II（steam:1145350）、Hyper Light Drifter（steam:257850）。
  - 评价与证据（依据：截图）：看图：Hades II、Hyper Light Drifter 的弹幕与特效同色同亮。评测证据不足：原来的「HUD 太乱」命中复核后说的是房间视觉杂乱、光污染，ELDEN RING 的命中是在夸它没有界面杂物。
- 3A 动作的小字：电视距离下，细衬线小字（物品说明、字幕）和过细的血条都难读（规范推论）。
  - 评价与证据（依据：文献）：评测证据不足：原来的「字太小 5 款达标」（God of War 两作、Sekiro、Hades II、Hyper Light Drifter）复核后说的是敌人动作、雾和暗场景看不清，不是文字，已撤回。依据改为 XAG 101。
- 只靠颜色区分攻击类型：用红 / 蓝 / 黄圈表示不可格挡、破盾等，色盲玩家分不出；需要字符或形状冗余（Sekiro 的'危'字就是一种，据已知描述）。 例：God of War Ragnarök（steam:2322010 · 据已知描述）、Sekiro（steam:814380 · 据已知描述）。
  - 评价与证据（依据：文献）：评测里没有直接计数；依据 06 文档 A2 与 0.5 第 8 条（形状 + 色相 + 明度三重编码，颜色不单独承载信息）。

**可演示的对比**

- **常驻魂系四角 vs 电影式情境显现**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 内部排布：十字四向 → 继承；技能 / 冷却 / 弹药 / 手牌：画法：物品快捷栏 → 大招充能；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：左下 → 右下；小地图 / 罗盘：画法：罗盘条 → 自动
  - 配套改动：HUD 显隐策略：常驻 → 情境显现；生命 / 护盾 / 体力：条数：3 → 2；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 左下；敌人血条 / 预警 / 意图：画法：Boss 长条 + 名字 → 敌人血条 + 屏幕边缘方向提示；敌人血条 / 预警 / 意图 · 屏幕锚点：下中 → 自动；敌人血条 / 预警 / 意图 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人
  - 看什么：非战斗时屏幕上还剩什么；Boss 战时两种做法的信息是否一样完整；视线要在角色、敌人和角落之间跑多远。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cmp.gauge@el.vitals=thinBar` `cnt.screen=screen.hud`
  - A：`rel.hudVisibility=always` `el.vitals.count=3` `el.vitals.screenAnchor=tl` `el.abilities.form=hotbar` `el.abilities.arrangement=cross` `el.abilities.screenAnchor=bl` `el.threat.form=bossBar` `el.threat.screenAnchor=bc` `el.minimap.form=compassBar` `el.threat.attachTo=none`
  - B：`rel.hudVisibility=contextual` `el.vitals.count=2` `el.vitals.screenAnchor=bl` `el.abilities.form=ultimate` `el.abilities.screenAnchor=br` `el.threat.form=healthBar+edgeDir` `el.threat.attachTo=target` `el.abilities.arrangement=inherit` `el.minimap.form=auto` `el.threat.screenAnchor=auto`

  </details>
- **伤害飘字 vs 风格评价字母：同一场连段的反馈性格**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击 · 世界挂点：目标 / 敌人 → 不挂（用屏幕锚点）；命中反馈 / 连击：画法：飘字 → 评价字（Good! / Perfect） + 连击大数字 + 拟声字；命中反馈 / 连击 · 大小 / 突出度：1 → 1.8；命中反馈 / 连击 · 屏幕锚点：自动 → 右上
  - 配套改动：入场动效：淡入 → 砸入（放大落下 + 震）；反馈强度：0.3 → 0.9；标题字族：同正文 → 涂鸦；倾斜角：自动 → -10
  - 看什么：连段时眼睛被拉到哪里；拟声字有没有盖住敌人的前摇；'冷静'和'耍帅'的分界在哪个参数上。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud`
  - A：`el.feedback.form=floatNumbers` `el.feedback.attachTo=target` `mo.enter=fade` `mo.juice=0.3` `el.feedback.scale=1` `el.feedback.screenAnchor=auto` `typ.display.family=same` `vis.skew=auto`
  - B：`el.feedback.form=rating+combo+comicSFX` `el.feedback.screenAnchor=tr` `el.feedback.scale=1.8` `mo.enter=slam` `mo.juice=0.9` `typ.display.family=graffiti` `vis.skew=-10` `el.feedback.attachTo=none`

  </details>
- **同一魂系版式换皮：暗色细线 vs 重装饰雕花框**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：标题字族：衬线 → 新艺术 / 美好年代；装饰预算：少 → 华丽
  - 配套改动：外框结构：程序线框 → 雕花九宫格；面板明度：深色面板 → 中明度；装饰母题：无 → 骷髅 / 哥特；标题字特效：自动 → 金属 / 渐变
  - 看什么：Boss 条与快捷栏的边框：装饰只在端头，还是包满整条；暗场景里 UI 还能不能和画面分开。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `vis.stroke=solid` `vis.strokeWidth=1` `cnt.screen=screen.hud` `ast.frameMat=bronze`
  - A：`vis.ornament=1` `ast.frame=procedural` `col.lightness=dark` `typ.display.family=serif` `vis.motif=none` `typ.titleFx=auto`
  - B：`vis.ornament=3` `ast.frame=carvedNinePatch` `vis.motif=skulls` `typ.display.family=artNouveau` `typ.titleFx=metal` `col.lightness=mid`

  </details>
- **敌人信息：头顶小血条 vs 底中 Boss 长条**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图 · 世界挂点：目标 / 敌人 → 不挂（用屏幕锚点）；敌人血条 / 预警 / 意图 · 放置方式（逐元素）：空间内 → 继承；敌人血条 / 预警 / 意图：画法：敌人血条 → Boss 长条 + 名字；敌人血条 / 预警 / 意图 · 屏幕锚点：自动 → 下中
  - 配套改动：敌人血条 / 预警 / 意图 · 大小 / 突出度：0.6 → 1.6
  - 看什么：多敌人时头顶条会不会乱；单 Boss 时长条能否成为'战斗进度'的仪式感。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `el.threat.valueLabel=none`
  - A：`el.threat.form=healthBar` `el.threat.attachTo=target` `el.threat.diegesis=spatial` `el.threat.scale=0.6` `el.threat.screenAnchor=auto`
  - B：`el.threat.form=bossBar` `el.threat.screenAnchor=bc` `el.threat.scale=1.6` `el.threat.attachTo=none` `el.threat.diegesis=inherit`

  </details>
- **攻击预警：只靠颜色 vs 颜色 + 符号冗余**（单变量对照；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图：画法：地面预警区 → 地面预警区 + 意图图标 + 数字
  - 配套改动：警示表达：红色调 → 黄三角图标
  - 看什么：打开色盲模拟（chk.cvd = deutan）后，两种攻击类型是否还分得开。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `col.coding=status` `cnt.screen=screen.hud`
  - A：`el.threat.form=telegraph` `st.alert=redTint`
  - B：`el.threat.form=telegraph+intent` `st.alert=warnIcon`

  </details>
- **主机手柄 vs 手机横屏触屏：技能从'看的图标'变成'按的按钮'**（整套做法对照（多个参数一起变）；内容包：action · 铁炉矿坑；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：输入方式：手柄 → 触屏；技能 / 冷却 / 弹药 / 手牌 · 内部排布：十字四向 → 环绕中心 / 轮盘；技能 / 冷却 / 弹药 / 手牌：画法：物品快捷栏 → 技能格；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：左下 → 右下
  - 配套改动：设备与观看距离：主机 / 电视 → 手机；按键提示图标集：Xbox → 自动；握持与拇指区：自动 → 横屏双拇指；触屏按钮布局：自动 → 大键 + 弧形环绕；虚拟摇杆：自动 → 浮动摇杆
  - 看什么：技能格的尺寸、位置、形状怎么变；触屏版右下拇指区会不会挡住角色前方的敌人。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-action#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=action` `cnt.screen=screen.hud` `ctx.orientation=landscape`
  - A：`ctx.input=pad` `ctx.device=tv` `ix.glyphs=xbox` `el.abilities.form=hotbar` `el.abilities.arrangement=cross` `el.abilities.screenAnchor=bl` `ix.thumbZone=auto` `ix.touchCluster=auto` `ix.touchStick=auto`
  - B：`ctx.input=touch` `ctx.device=phone` `ix.touchStick=floating` `ix.touchCluster=arc` `ix.thumbZone=twoThumbs` `el.abilities.form=slots` `el.abilities.arrangement=ring` `el.abilities.screenAnchor=br` `ix.glyphs=auto`

  </details>

**样例内容**：动作与 Roguelite（`action#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（6 项）</summary>

- 敌人的第二条：架势 / 韧性 / 破防条（中间向两边涨，满了可处决）——el.threat 加条数参数（同 el.vitals.count），或 el.threat.form 加 stagger 取值；画法可复用 cmp.gauge = bipolar。
- 攻击类型 / 威胁等级的语义颜色与符号——col.coding 加 attackType（不可格挡 / 可弹反 / 普通）；el.threat.form 加 warnGlyph（头顶警示字或符号），用来满足颜色冗余检查（chk.redundancy）。
- 风格评价的升档与衰减：评价字随连段升档、停手后衰减条走空降档——el.feedback 加评价档位数与衰减条开关；mo.valueChange@el.feedback 加 tierUp 取值（升档砸入、降档碎裂）。
- 增益 / 减益状态行（图标 + 层数 + 剩余时间），Roguelite 的祝福竖列——新元素 el.status，可挂在血条下或独立成侧列；现在只能借 el.abilities 竖列或 el.overlay.form = statusIcons 近似，语义不对。
- UI 随音乐节拍脉动（节奏动作里 HUD 与世界一起跟着 BPM 跳动）——mo.idle 加 beatPulse（按 BPM 缩放 / 闪动），与 layout.rhythm 配套。
- 玩家侧的 HUD 分项开关与整体透明度（动作冒险普遍提供）——a11y 组加 hudToggles（按元素开关）与 hudOpacity；探索台做成'玩家设置预览'，不进随机。

</details>

**最相关的原则**（按针对性排序）：[P-priority-tiers](#p-priority-tiers)、[P-squint-test](#p-squint-test)、[P-actionable-first](#p-actionable-first)、[P-hit-channel-split](#p-hit-channel-split)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-value-change-visible](#p-value-change-visible)、[P-shake-hitstop](#p-shake-hitstop)、[P-juice-budget](#p-juice-budget)、[P-focal-periphery](#p-focal-periphery)、[P-glance-encoding](#p-glance-encoding)、[P-contextual-hud](#p-contextual-hud)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-color-never-alone](#p-color-never-alone) 等 51 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.3 横版平台

参考卡 16 张 · 探索台内容包：platformer（萤火深处）

横版平台的四条屏幕边都是玩法区：常驻元素要小、要贴边；伤害按格算，用图标列；收集计数只在拾取时浮出；地图是按键呼出的独立屏，区名大字承担「到了新地方」的仪式。画风就是 UI 的来源——像素作与世界同网格，手绘作用同一笔触。

**子类**：氛围解谜平台 / 零 HUD（INSIDE、LIMBO、Neva）；情境显现的精致平台（Ori 三作、Rayman Origins、FEZ）；类银河城（Hollow Knight；Dead Cells 在库里归动作）；节奏 / 速度跑酷（BIT.TRIP RUNNER、Katana ZERO）；3D 平台射击（Ratchet & Clank: Rift Apart）；第一人称跑酷 / 解谜（Mirror's Edge、Portal 2）；卡通 Boss Rush（Cuphead）；分屏合作（It Takes Two）；手游横版（触屏十字键 + 跳跃键，取自手游批 gameui:7134）

**证据说明**：16 张里 7 张商店图无 UI（Ori、Ratchet、Rayman、It Takes Two、Cuphead 等）。零 HUD 作品看图即可确认（INSIDE、LIMBO、Neva、FEZ）；Hollow Knight、BIT.TRIP RUNNER、Katana ZERO 的截图里 HUD 清楚可见。

**关键发现**

- 横版的四条屏幕边都是玩法区：危险可能从任何一边进来，所以角落元素要小、要贴边，必要时情境显现。
- 伤害按'格'算：平台跳跃一次掉一格，用图标列（cmp.gauge = icons）比横条好数；格数一般 3–9。
- 收集计数用'拾取时浮出'：FEZ、Rayman、Ori 都只在变化时显示，平时把画面完整还给美术。
- 地图是独立屏而不是小地图：类银河城把地图做成按键呼出的全屏（Hollow Knight），区名大字承担'我到了新地方'的仪式感。
- 画风就是 UI 的来源：像素作 UI 与世界同网格，手绘作 UI 用同一笔触（Cuphead 扑克牌、Hollow Knight 白线花饰）。

**一眼要知道什么**

1. 能站在哪、哪里会死：这是画面的事，不是 HUD 的事。平台顶边、尖刺、深坑靠美术区分，HUD 绝不能遮住它们。
2. 我还能挨几下：图标式血量（面具、发光圆点、扑克牌 HP）要能一眼数出格数。
3. 能力 / 资源就绪了吗：灵魂罐、冲刺充能、超级技能卡。
4. 这一段收集了多少：拾取时才浮出的计数，平时不常驻。
5. 我在哪、出口在哪（类银河城）：按键呼出全屏地图，加上进入新区域时的区名大字。
6. 用时 / 分数 / 节奏（跑酷、速通）：贴着顶边的一条分数与计时。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 零 HUD / 电影模式：不画任何常驻 UI，生死与进度全靠画面 | 4 / 16（INSIDE、LIMBO、Neva、Mirror's Edge），Rayman Origins 近零 | INSIDE（steam:304430）、LIMBO（steam:48000）、Neva（steam:2420660）、Mirror's Edge（steam:17410） | HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；容器 = 不画 UI；UI 与画面关系 = 同一媒介 |
| 情境显现：底中一排发光小图标 / 收集计数，只在变化时出现 | 5 / 16（Ori 三作、FEZ、Rayman Origins） | FEZ（steam:224760）、Ori and the Blind Forest DE（steam:387290 · 据已知描述）、Ori and the Blind Forest（steam:261570 · 据已知描述）、Ori and the Will of the Wisps（steam:1057090 · 据已知描述） 等 5 款 | HUD 显隐策略 = 情境显现；信息密度 = 极简；数值图形（生命 / 护盾 / 体力） = 图标列（心 / 面具）；生命 / 护盾 / 体力 · 屏幕锚点 = 下中；生命 / 护盾 / 体力 · 显隐（逐元素） = 情境显现；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 显隐（逐元素） = 情境显现；入场动效 = 淡入 |
| 类银河城左上角簇：面具血量 + 灵魂罐 + 货币，地图按键呼出成全屏 | 1 / 16（Hollow Knight）。Dead Cells 是变体：左下血条 + 右上常驻小地图 | Hollow Knight（steam:367520）、Dead Cells（steam:588650） | HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 稀疏；数值图形（生命 / 护盾 / 体力） = 图标列（心 / 面具）；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；资源 / 货币：画法 = 以数值图形呈现；数值图形（资源 / 货币） = 液体球；资源 / 货币 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 显隐（逐元素） = 按键呼出；小地图 / 罗盘 · 屏幕锚点 = 中心；装饰母题 = 花叶卷草；标题字族 = 衬线 |
| 顶部贴边整条：分数 / 模式 / 计时排成一条 | 2 / 16（BIT.TRIP RUNNER：像素分数 + 黄框模式牌（HYPER）+ 金块数；Katana ZERO：霓虹计时条随剩余时间缩短，el.timer.form = gauge） | BIT.TRIP RUNNER（steam:63710）、Katana ZERO（steam:460950） | HUD 组织方式 = 贴边整条；信息密度 = 稀疏；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 上中；数字字体 = 像素数字；UI 像素化 = 与世界同网格；通知 / 大字提示：画法 = 整屏横贯带大字 |
| 3D 平台射击四角：左上分段血，右上武器 + 弹药 + 货币，武器轮按住呼出 | 1 / 16（Ratchet & Clank: Rift Apart，商店图无 UI） | Ratchet & Clank: Rift Apart（steam:1895880 · 据已知描述） | HUD 组织方式 = 分散组件；信息密度 = 中等；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右上；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 右上 |
| 画风同媒介的角落牌：血量画成作品世界里的物件 | 1 / 16（Cuphead：左下扑克牌形 HP 牌 + 超级技能卡，1930 年代动画片头字） | Cuphead（steam:268910 · 据已知描述） | 信息密度 = 极简；数值图形（生命 / 护盾 / 体力） = 纯数字；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；UI 与画面关系 = 同一媒介；标题字族 = 涂鸦；图标集来源 = 图集素材 |
| 叙事内 / 空间内：状态写在准星或世界里 | 2 / 16（Portal 2：准星两侧蓝 / 橙表示两个传送门的状态，提示是测试室墙上的标识牌；Mirror's Edge：可攀爬路线被环境染红） | Portal 2（steam:620）、Mirror's Edge（steam:17410） | 默认放置方式 = 叙事内；信息密度 = 极简；准星 / 瞄准：画法 = 点；准星 / 瞄准 · 屏幕锚点 = 中心；世界内标注渲染（默认） = 物体描边高亮 |
| 分屏合作：每个视口角落一条小血条 | 1 / 16（It Takes Two，商店图无 UI） | It Takes Two（steam:1426210 · 据已知描述） | 同屏玩家与视口 = 分屏；玩法区形态 = 分屏视口；信息密度 = 极简；数值图形（生命 / 护盾 / 体力） = 细条；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；生命 / 护盾 / 体力 · 大小 / 突出度 = 0.6 |
| 手游横版触屏：左下十字键 + 右下跳跃大键，右上自动 / 暂停 | 库外补充：平台 16 张里没有触屏卡，取自手游批 | 《空之要塞启航》（gameui:7134） | 输入方式 = 触屏；画幅朝向 = 横屏；虚拟摇杆 = 十字键；触屏按钮布局 = 左右两个大键；握持与拇指区 = 横屏双拇指；倍速 / 暂停 / 自动：画法 = 暂停 + 设置按钮；倍速 / 暂停 / 自动 · 屏幕锚点 = 右上 |

**关键元素与画法**

- **生命 / 护盾 / 体力**（`el.vitals`）：icons（Hollow Knight 一排面具、Ori 底中发光圆点） / number（Cuphead 扑克牌 HP 3） / segmented（Ratchet & Clank 分段条） / thinBar（It Takes Two 视口角小条）；常见位置 tl ×2、bl ×1、bc ×1。一次受伤掉一格，所以'还剩几格'比百分比重要；放在角落而且很小，画面中心要留给跳跃路线。Ori 放底中，是因为它的关卡多向上延伸。
- **资源 / 货币**（`el.resources`）：gauge → orb（Hollow Knight 灵魂罐，攻击充能、用来回血和放法术） / iconNumber（Hollow Knight 货币、Ratchet 螺栓） / 拾取时浮出的计数（FEZ 方块、Rayman 收集物）；常见位置 tl、tr。收集是平台跳跃的第二玩法，但计数不需要常驻：拾取时跳出来确认就够了。
- **计时 / 分数 / 回合**（`el.timer`）：number（BIT.TRIP RUNNER 像素分数） / gauge（Katana ZERO 顶部计时条越来越短）；常见位置 tc ×2。跑酷和速通类的计时就是玩法压力本身，所以放在最显眼的顶中，并做成会变短的条来制造紧迫感。
- **小地图 / 罗盘**（`el.minimap`）：plan + 按键呼出全屏（Hollow Knight：暗底白线房间、顶部衬线区名、图钉 / 长椅图标）；常见位置 center（呼出时）。精确跳跃时不能分心看角落地图；呼出式全屏地图把'探索规划'和'操作'分成两个时刻。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：ammo（Ratchet 武器 + 弹药，右上） / 技能轮，情境显现（Ori and the Will of the Wisps 底中）；常见位置 tr、bc。多数平台作的能力是'永久解锁的移动方式'，不需要冷却 UI；只有带战斗或射击的平台作才显示。
- **准星 / 瞄准**（`el.crosshair`）：dot（Portal 2：一个点，两侧蓝 / 橙半环表示两个传送门是否已放置）；常见位置 center。第一人称解谜平台：准星同时承担状态读数，HUD 就可以只剩这一个点。
- **通知 / 大字提示**（`el.notify`）：band（进入新区域时的区名大字 + 花饰分隔线，Hollow Knight） / banner（BIT.TRIP RUNNER 关前像素大字挑战牌）；常见位置 tc、center。零 / 少 HUD 的平台作，靠区名大字告诉玩家'到了一个新地方'，同时也是存档和迷路时的参照。
- **按键 / 操作提示**（`el.prompt`）：touchButtons（手游：十字键 + 跳跃键） / 世界内提示（Portal 2 测试室墙上的标识牌）；常见位置 bl、br。平台作的操作少而固定，教学可以交给世界；触屏版必须把跳跃键做成最大的按钮。

**重要界面**

- **局内 HUD**：零或极少常驻；血量用图标列，放左上或底中；收集计数拾取时浮出；跑酷类用顶部贴边整条放分数和计时。 例：Hollow Knight（steam:367520）、BIT.TRIP RUNNER（steam:63710）、INSIDE（steam:304430）、Ori and the Blind Forest DE（steam:387290 · 据已知描述）。
- **地图 / 世界地图**：全屏、按键呼出：暗底上白线画房间轮廓，顶部衬线区名，图钉 / 存档点用圆形图标；没走过的地方不画，背景是半透明的当前场景。 例：Hollow Knight（steam:367520）。
- **背包 / 物品**：护符 / 能力页不用面板底，只有黑底上的白色线描卷草纹边框：上方是已装备槽，下方是收藏格，右侧是说明。 例：Hollow Knight（steam:367520）。
- **标题 / 主菜单**：标题屏就是作品的海报：1930 年代动画片头字 + 角色插画（Cuphead）。 例：Cuphead（steam:268910 · 据已知描述）。
- **教程 / 提示卡**：关前挑战牌：纯色底上的像素大字写本关目标（BIT.TRIP RUNNER）；Portal 2 把教程做成测试室墙上的标识牌。 例：BIT.TRIP RUNNER（steam:63710）、Portal 2（steam:620）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 零 HUD · 世界即界面（`fam.zero-hud`）（5 张）：零 HUD · 世界即界面：本品类主归属卡 Mirror's Edge、Neva、INSIDE 等（理由见 17 号图谱该家族的「多见品类」）。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（4 张）：情境渐显 · 角落小件：本品类主归属卡 Ori and the Will of the Wisps、It Takes Two、Ori and the Blind Forest 等（理由见 17 号图谱该家族的「多见品类」）。
- 像素位图（`fam.pixel`）（3 张）：FEZ、BIT.TRIP RUNNER、Katana ZERO：平台跳跃几乎零 HUD，只有顶部一条像素分数 / 计时。
- 线描花饰（`fam.filigree`）（1 张）：Hollow Knight：2D 手绘黑白画风的自然延伸。
- 糖果卡通（Q 版）（`fam.candy`）（1 张）：Rayman Origins：手绘卡通，几乎无 HUD，收集物拾取时浮出。
- 科幻 HUD（`fam.scifi`）（1 张）：Ratchet & Clank：分段血条 + 武器轮。
- 默片 / 1930 年代卡通（`fam.silent-film`）（1 张）：默片 / 1930 年代卡通：本品类主归属卡 Cuphead（理由见 17 号图谱该家族的「多见品类」）。

**代表作**

- Hollow Knight（steam:367520）〔线描花饰〕：少而有性格：左上灵魂罐 + 一排面具 + 一个货币数；地图、护符页、区名都用同一套白线花饰和衬线字。
- Ori and the Blind Forest DE（steam:387290 · 据已知描述）〔情境渐显 · 角落小件〕：情境显现的标杆：底中一排发光小圆点，只在生命 / 能量变化时出现。
- INSIDE（steam:304430）〔零 HUD · 世界即界面〕：零 HUD 的极端：所有信息由光影和角色动作承担（LIMBO 同理）。
- BIT.TRIP RUNNER（steam:63710）〔像素位图〕：贴边整条：顶部一条像素分数，模式框（HYPER / EXTRA）像状态升级，进度和收集都在这一条里。
- Katana ZERO（steam:460950）〔像素位图〕：计时条就是关卡压力：顶中霓虹细条随剩余时间缩短，左上电池格是慢动作能量。
- Cuphead（steam:268910 · 据已知描述）〔默片 / 1930 年代卡通〕：HUD 与画风同媒介：扑克牌血量 + 超级技能卡，像片子里的道具。
- Portal 2（steam:620）〔零 HUD · 世界即界面〕：准星本身就是状态读数：蓝 / 橙两半表示两个传送门，HUD 只剩这一个点。

**坑**

- 情境显现 / 零 HUD 让玩家不知道去哪、能力是否就绪（引导不清）。 例：Hollow Knight（steam:367520）、Ori and the Will of the Wisps（steam:1057090 · 据已知描述）、Ori and the Blind Forest（steam:261570 · 据已知描述）、Ori and the Blind Forest DE（steam:387290 · 据已知描述）。
  - 评价与证据（依据：评测）：R3'提示 / 引导不清'去重后：Ori and the Will of the Wisps 3 条、Ori and the Blind Forest 2 条、Hollow Knight 2 条；平台类 3 款达标。
- 极简画面里的细字（字幕、菜单）在电视距离下看不清。 例：Mirror's Edge（steam:17410）、Neva（steam:2420660）。
  - 评价与证据（依据：截图）：看图：Mirror's Edge 白色城市上的细字、Neva 的极简白字。评测证据不足：两款原来各 2 条「字太小」，复核后不是在说文字（收紧口径后为 0）。
- 3D 平台把射击 HUD 搬进来后变挤：武器轮、弹药、货币、地图同时出现。 例：Ratchet & Clank: Rift Apart（steam:1895880 · 据已知描述）。
  - 评价与证据（依据：截图）：Ratchet & Clank: Rift Apart 去重后地图难用 1 条；原来的「HUD 太乱 2 条」复核后说的是背景视觉杂物。看图：武器轮、弹药、货币同时在屏。证据很弱。
- 按键提示与手柄不一致。 例：Ori and the Blind Forest DE（steam:387290 · 据已知描述）。
  - 评价与证据（依据：评测）：Ori and the Blind Forest DE：去重后手柄 / 键位 1 条（证据很弱）。
- 像素 UI 非整数缩放或亚像素滚动时闪烁；UI 与世界像素网格不一致时显得'贴上去'。 例：FEZ（steam:224760）、BIT.TRIP RUNNER（steam:63710）、Katana ZERO（steam:460950）。
  - 评价与证据（依据：文献）：评测无计数；依据 06 文档 A3 陷阱（像素对齐）与派生规则 D-pixel（UI 与世界同网格）。

**可演示的对比**

- **零 HUD vs 情境显现**（整套做法对照（多个参数一起变）；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：自动 → 图标列（心 / 面具）；资源 / 货币 · 显隐（逐元素）：继承 → 情境显现；生命 / 护盾 / 体力 · 屏幕锚点：自动 → 下中；生命 / 护盾 / 体力 · 显隐（逐元素）：继承 → 情境显现
  - 配套改动：HUD 显隐策略：电影模式（全隐） → 情境显现；容器：不画 UI → 自动
  - 看什么：受伤、拾取那一刻 HUD 从哪里浮出、停留多久；平时画面是否完整。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-platformer#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.density=0` `cnt.screen=screen.hud`
  - A：`rel.hudVisibility=hidden` `lay.container=none` `cmp.gauge@el.vitals=auto` `el.resources.visibility=inherit` `el.vitals.screenAnchor=auto` `el.vitals.visibility=inherit`
  - B：`rel.hudVisibility=contextual` `cmp.gauge@el.vitals=icons` `el.vitals.screenAnchor=bc` `el.vitals.visibility=contextual` `el.resources.visibility=contextual` `lay.container=auto`

  </details>
- **血量：图标格 vs 横条**（单变量对照；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：图标列（心 / 面具） → 横条
  - 配套改动：生命 / 护盾 / 体力 · 数值标注：不标 → 当前 / 上限；图标风格：剪影 → 扁平填充
  - 看什么：能不能一眼数出'还能挨几下'；图标格在 3 格和 9 格时的读法差别。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-platformer#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `el.vitals.screenAnchor=tl` `cnt.screen=screen.hud`
  - A：`cmp.gauge@el.vitals=icons` `el.vitals.valueLabel=none` `vis.iconStyle=silhouette`
  - B：`cmp.gauge@el.vitals=bar` `el.vitals.valueLabel=currentMax` `vis.iconStyle=flat`

  </details>
- **角落簇 vs 顶部贴边整条**（整套做法对照（多个参数一起变）；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：资源 / 货币 · 屏幕锚点：左上 → 上中；计时 / 分数 / 回合 · 屏幕锚点：右上 → 上中；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 上中；HUD 组织方式：分散组件 → 贴边整条
  - 配套改动：数字字体：自动 → 像素数字
  - 看什么：顶部一条会不会挡住从上方落下的危险；贴边整条读起来是否更像'比赛记分'。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-platformer#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.hud`
  - A：`lay.hudOrg=scattered` `el.vitals.screenAnchor=tl` `el.resources.screenAnchor=tl` `el.timer.screenAnchor=tr` `typ.numerals.family=auto`
  - B：`lay.hudOrg=edgeBar` `el.vitals.screenAnchor=tc` `el.resources.screenAnchor=tc` `el.timer.screenAnchor=tc` `typ.numerals.family=pixel`

  </details>
- **全屏地图：纸面手绘 vs 像素房间格**（单变量对照；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：内芯结构：材质平铺 → 程序填充；地图画风：羊皮纸古海图 → 像素房间格；地图未探索区：留白（纸面空白） → 压暗
  - 看什么：未探索区怎么表达；图钉 / 存档点图标在两种底上是否都认得出。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-platformer#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.map` `ast.coreMat=parchment`
  - A：`vis.mapStyle=parchment` `vis.mapUnexplored=blank` `ast.core=texture`
  - B：`vis.mapStyle=pixelRooms` `vis.mapUnexplored=dark` `ast.core=procedural`

  </details>
- **屏幕叠加血量 vs 画在角色身上（叙事内）**（整套做法对照（多个参数一起变）；内容包：platformer · 萤火深处；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：图标列（心 / 面具） → 自动；信息密度：中等 → 极简；生命 / 护盾 / 体力 · 屏幕锚点：左上 → 自动；默认放置方式：屏幕叠加 → 叙事内
  - 配套改动：生命 / 护盾 / 体力 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；生命 / 护盾 / 体力 · 放置方式（逐元素）：继承 → 叙事内
  - 看什么：去掉角落 UI 后还能不能读出血量；角色动画和颜色要承担多少信息（对照探索类的 Journey、Hellblade）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-platformer#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=platformer` `cnt.screen=screen.hud`
  - A：`rel.diegesis=screen` `cmp.gauge@el.vitals=icons` `el.vitals.screenAnchor=tl` `cnt.density=2` `el.vitals.attachTo=none` `el.vitals.diegesis=inherit`
  - B：`rel.diegesis=diegetic` `el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `cnt.density=0` `cmp.gauge@el.vitals=auto` `el.vitals.screenAnchor=auto`

  </details>

**样例内容**：横版平台（`platformer#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 逐元素显隐的触发条件：情境显现到底'在什么时候'出现（受伤 / 数值变化 / 拾取 / 战斗中 / 瞄准 / 静止），以及停留多久——elx.visibility = contextual 时补 elx.showOn（多选）和停留时长；全局的 rel.hudVisibility = fadeIdle 只能表达'静止时'这一种。
- 关卡线性进度条（横跑 / 音乐关卡：一条线 + 检查点 + 自己的位置）——与竞速的'赛道进度条带'合并为 el.minimap.form = progressStrip（见 racing 的 paramGaps）。

</details>

**最相关的原则**（按针对性排序）：[P-glance-encoding](#p-glance-encoding)、[P-contextual-hud](#p-contextual-hud)、[P-value-change-visible](#p-value-change-visible)、[P-hudless-tax](#p-hudless-tax)、[P-map-conventions](#p-map-conventions)、[P-medium-constraints](#p-medium-constraints)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-shake-hitstop](#p-shake-hitstop)、[P-title-lettering](#p-title-lettering)、[P-save-continuity](#p-save-continuity)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-input-parity](#p-input-parity)、[P-glyph-follows-device](#p-glyph-follows-device)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor) 等 17 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.4 射击

参考卡 19 张 · 探索台内容包：shooter（轨道封锁）、shmup（流星特攻）

射击的画面中心只允许一样东西：准星。其余信息按「左下是我、右下是我的枪」的长期约定退到两下角；竞技越强，信息越多但越统一（一种字体、一套阵营色）；叙事射击可以把 HUD 交给年代美术；VR 与载具里，数值必须长在手套、枪或座舱上。

**子类**：经典 / 叙事 FPS（Half-Life 系列、BioShock 两作、DEATHLOOP、Far Cry 3）；军事 FPS（Call of Duty 系列、Battlefield 1）；英雄 / 职业竞技射击（Overwatch、Team Fortress 2）；刷宝射击（Destiny 2、Borderlands 2）；第三人称动作射击（Uncharted、Resident Evil 5）；VR 射击（Half-Life: Alyx）；竖屏二次元射击手游（NIKKE、发条总动员；库里主要是剧情屏）；俯视双摇杆 / 弹幕射击：库里没有对应卡，只有 layout.shmup 预设

**证据说明**：19 张里 10 张商店图无 UI（3A 射击的商店图几乎都是宣传渲染）。能看清 HUD 的：Half-Life 2、Half-Life、Call of Duty 4、Overwatch（IIG 原图），以及 Destiny 2 的地图屏。俯视双摇杆 / 弹幕射击的结论只来自 layout.shmup 预设与 06 文档，置信度低。

**关键发现**

- 准星是唯一允许常驻在画面中心的东西，其余元素一律退到四角；准星的反馈（命中标记、扩散）比数值更重要。
- 两下角分工：左下'我'（血 / 护甲 / 头像），右下'我的枪'（弹药 / 技能）。这个约定从 Half-Life 延续到 Overwatch，玩家已经形成肌肉记忆。
- 竞技越强，信息越多但越统一：Overwatch 用一种倾斜大写字体和一套阵营色，管住了十几个元素。
- 叙事射击可以把 HUD 交给年代美术（BioShock 装饰艺术、DEATHLOOP 60 年代拼贴），代价是可读性风险要靠检查补回来。
- VR 和载具里只能叙事内：屏幕叠加在 VR 里会'贴脸'，所以数值必须长在手套、枪或座舱上。

**一眼要知道什么**

1. 我在瞄哪、打中没有：准星（亮芯 + 暗边，任何背景上都可见）+ 命中标记 / 击杀确认。
2. 弹匣还剩几发、要不要换弹：弹匣和备弹两个数，低弹量时变色。
3. 我还剩多少血 / 护甲：大号数字或分段块，放在左下余光里。
4. 谁在打我、从哪边：伤害方向指示 + 受击红边。
5. 目标在哪、进度如何：世界内目标标记（出屏时贴边箭头）、占点百分比、比分。
6. 谁是敌、谁是友：阵营色（建议橙蓝而非红绿）+ 名牌 + 描边。
7. 技能 / 大招 / 手雷就绪了吗：冷却数字、充能环。
8. 刚刚发生了什么：右上击杀信息流，以及目标被占、队友阵亡的广播。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 两下角式：左下血 / 护甲大数字，右下弹药，中心准星 | 约 7 / 19（Half-Life、Half-Life 2、Team Fortress 2、BioShock 两作、CoD MW2、CoD4；Far Cry 3 按已知 HUD 也是这一型） | Half-Life 2（steam:220）、Half-Life（steam:70）、Team Fortress 2（steam:440 · 据已知描述）、BioShock（steam:7670 · 据已知描述） 等 5 款 | HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 稀疏；数值图形（生命 / 护盾 / 体力） = 纯数字；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；准星 / 瞄准：画法 = 十字；准星 / 瞄准 · 屏幕锚点 = 中心；数字字体 = 大号展示数字；底不透明度 = 0.4 |
| 军事雷达式：左上方形雷达 + 世界内目标标记 + 队友名牌 + 右下弹药 / 手雷 | 3 / 19（Call of Duty 4、MW2、Black Ops 的军事战术风；CoD4 截图里雷达红点为敌、绿点为友，目标上方有红色三角标） | Call of Duty 4: Modern Warfare (2007)（steam:7940）、Call of Duty: Black Ops（steam:42700）、Call of Duty: Modern Warfare 2 (2009)（steam:10180 · 据已知描述） | HUD 组织方式 = 分散组件；信息密度 = 稀疏；小地图 / 罗盘：画法 = 圆环雷达；小地图 / 罗盘 · 屏幕锚点 = 左上；目标 / 路点：画法 = 标记图标 + 屏幕边缘箭头；目标 / 路点 · 放置方式（逐元素） = 空间内；队伍 / 玩家条：画法 = 名牌；队伍 / 玩家条 · 世界挂点 = 目标 / 敌人；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；敌人血条 / 预警 / 意图：画法 = 屏幕边缘方向提示；元 UI 屏幕效果 = 受击红边；阵营色对 = 绿友红敌；正文字族 = 等宽 / 终端 |
| 英雄竞技式：左下头像 + 分段血，底中大招环，右下技能，顶中目标，右上击杀流 | 2 / 19（Overwatch；Team Fortress 2 是更早的简版：左下十字 + 血量数字，红 / 蓝队伍色） | Overwatch（iig:overwatch）、Team Fortress 2（steam:440 · 据已知描述） | HUD 组织方式 = 分散组件；同屏玩家与视口 = 线上队伍（队友栏 + 记分）；信息密度 = 中等；身份 / 头像 / 等级：画法 = 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点 = 左下；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；生命 / 护盾 / 体力 · 数值标注 = 当前 / 上限；技能 / 冷却 / 弹药 / 手牌：画法 = 大招充能；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 上中；通知 / 大字提示：画法 = 滚动消息列；通知 / 大字提示 · 屏幕锚点 = 右上；命中反馈 / 连击：画法 = 命中标记；阵营色对 = 蓝我红敌；倾斜角 = -8；正文斜体 = 斜体 |
| 时代风格化 HUD：UI 直接用作品的年代美术 | 4 / 19（BioShock、BioShock Infinite 用装饰艺术圆框；DEATHLOOP 用 60 年代拼贴海报；Borderlands 2 用粗描边漫画） | BioShock（steam:7670 · 据已知描述）、BioShock Infinite（steam:8870 · 据已知描述）、DEATHLOOP（steam:1252330 · 据已知描述）、Borderlands 2（steam:49520 · 据已知描述） | 信息密度 = 稀疏；UI 与画面关系 = 统一调色；标题字族 = 新艺术 / 美好年代；装饰母题 = 几何线 / 同心圆；小组件轮廓 = 圆；装饰预算 = 中 |
| 叙事内：数值长在手套、枪或座舱上 | 2 / 19（Half-Life: Alyx 把血量和弹药放在手套与枪上；Call of Duty: Black Ops 直升机座舱仪表就是界面） | Half-Life: Alyx（steam:546560）、Call of Duty: Black Ops（steam:42700） | 默认放置方式 = 叙事内；信息密度 = 极简；生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内；生命 / 护盾 / 体力 · 世界挂点 = 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内；技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器 |
| 情境显现 TPS：开枪才出现弹药，准星只在瞄准时出现 | 2 / 19（Uncharted；Resident Evil 5 还加了宽银幕黑边），都是商店图无 UI | UNCHARTED: Legacy of Thieves Collection（steam:1659420 · 据已知描述）、Resident Evil 5（steam:21690 · 据已知描述） | HUD 显隐策略 = 情境显现；信息密度 = 极简；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素） = 情境显现；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；准星 / 瞄准：画法 = 点；准星 / 瞄准 · 显隐（逐元素） = 情境显现 |
| 竖屏射击手游：库里只有开场与剧情屏，战斗 HUD 缺样本 | 2 / 19（NIKKE、发条总动员） | NIKKE：胜利女神（gameui:5879）、发条总动员（沐瞳科技）（gameui:13717） | 画幅朝向 = 竖屏；输入方式 = 触屏；握持与拇指区 = 竖屏单手；对话框结构 = 底部通栏 |

**关键元素与画法**

- **准星 / 瞄准**（`el.crosshair`）：cross（静态十字） / dot（Portal 2 / TPS 的点） / dynamic（移动、连射时扩散，layout.shooter 的默认值）；常见位置 center。射击里唯一常驻在画面中心的元素。要用双色（亮芯 + 暗边），才能在任何背景上可见（06 文档 A4）；扩散直接告诉玩家'现在打不准'。
- **生命 / 护盾 / 体力**（`el.vitals`）：number ×3（Half-Life 系列橙色大数字 + 小号大写标签、TF2 十字 + 数字） / segmented（Overwatch 每 25 点一格，200 / 200 读数在上）；常见位置 bl ×4。射击的伤害快而碎，数字比条更精确，竞技玩家要算'还能不能吃一枪'；分段块兼顾两者：既能扫一眼读，也能精确计算。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：ammo（右下弹匣 / 备弹，Overwatch 的 8/25 一类） / ultimate（Overwatch 底中百分比环） / 技能格带冷却数字（Overwatch 右下斜框）；常见位置 br、bc。弹药与技能放在开枪手（右手）一侧，和左下的'我'分开；大招放底中，因为它是全队关注的节奏点。
- **小地图 / 罗盘**（`el.minimap`）：radar（CoD4 左上方形雷达，红点敌 / 绿点友） / compassBar（开放世界射击常用）；常见位置 tl。军事射击要看包抄方向，所以用雷达；放左上，是为了不和左下的血量挤在一起。
- **目标 / 路点**（`el.objective`）：marker（CoD4 目标上方的红色三角标） / text（Overwatch 顶中两队百分比 + 点位字母，下方横幅'CONTESTING POINT!'） / edgeArrow（目标出屏时贴边）；常见位置 tc、挂在目标上。目标要同时有'在哪'（世界内标记）和'进度如何'（顶中百分比）两种读法。
- **通知 / 大字提示**（`el.notify`）：feed（Overwatch 右上击杀流：队伍色名字 + 头像 + 武器图标） / banner（Destiny 2 任务开始时左下红色横幅 + 地名小字） / 准星下方小字（Overwatch 击杀名 + 加分）；常见位置 tr、bl、center 偏下。多人射击里事件很多，信息流在右上滚动、不打断瞄准；与自己直接相关的击杀确认放在准星下方，眼睛不用离开中心。
- **命中反馈 / 连击**（`el.feedback`）：hitMarker（命中标记） / floatNumbers（Borderlands 2 彩色伤害数字）；常见位置 center、挂在目标上。命中标记确认'打到了'；刷宝射击把伤害数字当奖励来展示，颜色编码伤害类型。
- **敌人血条 / 预警 / 意图**（`el.threat`）：edgeDir（受击方向） / healthBar（Borderlands 敌人头顶条）；常见位置 屏幕边缘、挂在目标上。第一人称看不到身后，受击方向是'活下来'的关键信息。
- **身份 / 头像 / 等级**（`el.profile`）：avatarLevel（Overwatch 六边形英雄头像 + 等级）；常见位置 bl。英雄射击要提醒'我现在是谁'（换英雄后技能完全不同），头像放在血量旁边。
- **队伍 / 玩家条**（`el.party`）：tag（CoD4 队友头顶名牌、Overwatch 敌人头顶名字）；常见位置 挂在角色上。敌我识别不能只靠模型，名牌加阵营色是第二道保险。

**重要界面**

- **局内 HUD**：左下'我'、右下'枪'、中心准星、顶中目标 / 比分、右上信息流、左上雷达（军事）；写实作品多用白字半透明，竞技作品用统一的倾斜大写字体和阵营色。 例：Half-Life 2（steam:220）、Overwatch（iig:overwatch）、Call of Duty 4: Modern Warfare (2007)（steam:7940）。
- **地图 / 世界地图**：刷宝射击的导航是星图：太空背景上的行星节点（圆形图标 + 名称），底部按键图例，不画地形。 例：Destiny 2（steam:1085660）。
- **排行 / 赛季 / 段位**：生涯数据：浅色玻璃卡数字表（每格一个大数字 + 小说明，排成网格），顶部页签切换模式。 例：Overwatch（iig:overwatch）。
- **对话 / 文本**：竖屏射击手游以剧情为主：1930 年代动画风漫画格 + 下方羊皮纸文本（发条总动员）；二次元白卡细线（NIKKE）。 例：发条总动员（沐瞳科技）（gameui:13717）、NIKKE：胜利女神（gameui:5879）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 情境渐显 · 角落小件（`fam.contextual-hud`）（4 张）：情境渐显 · 角落小件：本品类主归属卡 Battlefield 1、UNCHARTED: Legacy of Thieves Collection、Resident Evil 5 等（理由见 17 号图谱该家族的「多见品类」）。
- 军事战术（`fam.military`）（3 张）：CoD4 / MW2 / Black Ops：几乎隐形的两角式，座舱关卡转为叙事内。
- 装饰艺术（`fam.art-deco`）（2 张）：BioShock 两作：时代美术即世界观，HUD 取圆框与字体。
- 漫画对话框（`fam.comic`）（2 张）：射击（Borderlands 2、发条总动员）。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）（2 张）：Overwatch、Team Fortress 2：击杀信息流、队伍色
- 二次元白卡细线（`fam.anime-card`）（1 张）：射击（NIKKE）：暗场战术支。
- Persona 拼贴（`fam.persona-collage`）（1 张）：第一人称射击（DEATHLOOP）：海报拼贴 HUD（截图无 UI）。
- 科幻 HUD（`fam.scifi`）（1 张）：Half-Life 2：左下 HEALTH / SUIT 大号橙色数字，射击两角式的源头之一。

**代表作**

- Half-Life 2（steam:220）〔科幻 HUD〕：两下角式的原型：左下 HEALTH / SUIT、右下 AMMO，半透明圆角黑底 + 橙色大数字 + 小号大写标签。
- Overwatch（iig:overwatch）〔电视转播包装（体育 / 电竞 / 综艺）〕：信息最全又不乱：倾斜大写字统一全部元素；头像 + 分段血、底中大招环、右下技能斜框带冷却数字、顶中占点百分比、右上击杀流。
- Call of Duty 4: Modern Warfare (2007)（steam:7940）〔军事战术〕：军事型：左上方形雷达、目标上方三角标、队友头顶名牌、右下弹药与手雷。
- BioShock（steam:7670 · 据已知描述）〔装饰艺术〕：HUD 借作品的年代风格（装饰艺术圆框），世界里的海报招牌是风格来源。
- Half-Life: Alyx（steam:546560）〔零 HUD · 世界即界面〕：VR 只能叙事内：血量和弹药都在手套和枪上。
- DEATHLOOP（steam:1252330 · 据已知描述）〔Persona 拼贴〕：拼贴海报式 HUD 的风格上限；去重后「UI 卡顿」2 条，是全库这一类仅有的两款 ≥ 2 条之一（另一款是 Cyberpunk 2077），见陷阱。

**坑**

- 目标与下一步不清：大型刷宝与叙事射击的任务指引模糊。 例：Destiny 2（steam:1085660）、Half-Life（steam:70）、Half-Life: Alyx（steam:546560）。
  - 评价与证据（依据：评测）：R3'提示 / 引导不清'去重后：Destiny 2 4 条、Half-Life（1998）2 条；Half-Life: Alyx 1 条。
- UI 动画拖沓、菜单响应慢。 例：Half-Life: Alyx（steam:546560）、DEATHLOOP（steam:1252330 · 据已知描述）。
  - 评价与证据（依据：评测）：UI 卡顿 / 响应慢（去重后）：DEATHLOOP 2 条（全库只有它和 Cyberpunk 2077 达到 2 条）、Half-Life: Alyx 1 条。
- UI 不随分辨率缩放，宽屏 / 高分屏下 HUD 过小或错位。 例：BioShock Infinite（steam:8870 · 据已知描述）。
  - 评价与证据（依据：评测）：UI 缩放 / 分辨率（去重后）：BioShock Infinite 3 条，是全库这一类最多的一款；它另有 3 条说字幕太小。
- TPS 生存射击的格子背包与实时管理难用，手柄操作别扭。 例：Resident Evil 5（steam:21690 · 据已知描述）。
  - 评价与证据（依据：评测）：Resident Evil 5（去重后）：背包 / 物品管理 4 条、手柄 / 键位 1 条。
- 菜单繁琐。 例：Far Cry 3（steam:220240 · 据已知描述）。
  - 评价与证据（依据：评测）：菜单 / 界面难用：Far Cry 3 2 条。
- 敌友只靠红 / 绿区分，红绿色弱玩家分不出。 例：Call of Duty 4: Modern Warfare (2007)（steam:7940）。
  - 评价与证据（依据：文献）：评测无计数；依据 06 文档 A4 与 0.5 第 8 条：推荐橙 / 蓝并拉开明度，提供色盲预设。

**可演示的对比**

- **血量：大号数字 vs 分段块 + 头像**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：纯数字 → 分段格；身份 / 头像 / 等级：画法：自动 → 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点：自动 → 左下；生命 / 护盾 / 体力 · 屏幕锚点：左下 → 自动
  - 配套改动：数字字体：大号展示数字 → 自动；生命 / 护盾 / 体力 · 数值标注：不标 → 当前 / 上限；转角：直角 → 切角；倾斜角：自动 → -8
  - 看什么：余光里哪种更快读出'危险了'；分段每格代表多少血。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud`
  - A：`cmp.gauge@el.vitals=number` `el.vitals.screenAnchor=bl` `typ.numerals.family=display` `el.profile.form=auto` `el.profile.screenAnchor=auto` `el.vitals.valueLabel=none` `vis.corner=sharp` `vis.skew=auto`
  - B：`cmp.gauge@el.vitals=segmented` `el.vitals.valueLabel=currentMax` `el.profile.form=avatarLevel` `el.profile.screenAnchor=bl` `vis.skew=-8` `vis.corner=chamfer` `el.vitals.screenAnchor=auto` `typ.numerals.family=auto`

  </details>
- **弹药：屏幕叠加 vs 叙事内（画在枪上）**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：中等 → 极简；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动
  - 配套改动：默认放置方式：屏幕叠加 → 叙事内
  - 看什么：换弹时机还能不能用余光判断；枪模型转出画面（冲刺、近战）时信息去了哪里。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `el.abilities.form=ammo` `cnt.screen=screen.hud`
  - A：`rel.diegesis=screen` `el.abilities.screenAnchor=br` `cnt.density=2` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit`
  - B：`rel.diegesis=diegetic` `el.abilities.diegesis=diegetic` `el.abilities.attachTo=held` `cnt.density=0` `el.abilities.screenAnchor=auto`

  </details>
- **同一两下角版式换年代：军事战术 vs 装饰艺术**（整套做法对照（多个参数一起变）；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：正文字族：等宽 / 终端 → 无衬线；标题字族：模板字 → 新艺术 / 美好年代；装饰母题：角括号 / 准星角 → 几何线 / 同心圆；装饰预算：无 → 中
  - 配套改动：面板明度：深色面板 → 中明度；外框结构：程序线框 → 只有四角件；小组件轮廓：跟随转角 → 圆
  - 看什么：风格变了以后数字是否仍一眼可读；装饰有没有挤占准星周围。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `vis.corner=sharp` `cnt.screen=screen.hud` `ast.frameMat=bronze`
  - A：`typ.body.family=mono` `typ.display.family=stencil` `col.lightness=dark` `vis.motif=brackets` `vis.ornament=0` `ast.frame=procedural` `vis.silhouette=box`
  - B：`typ.display.family=artNouveau` `vis.motif=geometric` `vis.ornament=2` `vis.silhouette=circle` `ast.frame=cornersOnly` `col.lightness=mid` `typ.body.family=sans`

  </details>
- **准星：静态十字 vs 动态扩散 + 命中标记**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：准星 / 瞄准：画法：十字 → 动态扩散；命中反馈 / 连击：画法：无 → 命中标记
  - 配套改动：反馈强度：0.2 → 0.7；命中反馈 / 连击 · 屏幕锚点：自动 → 中心
  - 看什么：连射时扩散是否在'说话'；命中标记在亮天空和暗走廊上是否都看得见。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud`
  - A：`el.crosshair.form=cross` `mo.juice=0.2` `el.feedback.form=[]` `el.feedback.screenAnchor=auto`
  - B：`el.crosshair.form=dynamic` `el.feedback.form=hitMarker` `el.feedback.screenAnchor=center` `mo.juice=0.7`

  </details>
- **阵营色：红绿 vs 橙蓝**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：阵营色对：绿友红敌 → 橙蓝（色盲安全）
  - 看什么：打开色盲模拟（chk.cvd = deutan）后，雷达点和名牌的敌友是否还分得开。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `col.coding=team` `cnt.screen=screen.hud`
  - A：`col.teams=greenRed`
  - B：`col.teams=orangeBlue`

  </details>
- **常驻 vs 情境显现（第三人称）**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素）：继承 → 情境显现；准星 / 瞄准 · 显隐（逐元素）：继承 → 情境显现；HUD 显隐策略：常驻 → 情境显现
  - 看什么：非战斗时画面的电影感；交火瞬间 HUD 浮出的速度够不够快。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-shooter#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud`
  - A：`rel.hudVisibility=always` `el.abilities.visibility=inherit` `el.crosshair.visibility=inherit`
  - B：`rel.hudVisibility=contextual` `el.abilities.visibility=contextual` `el.crosshair.visibility=contextual`

  </details>

**样例内容**：射击（`shooter#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 玩家自定义准星（颜色 / 形状 / 大小 / 描边 / 透明度）——a11y 组加 crosshairCustom（颜色、形状、大小、描边），在探索台做成'玩家设置预览'。06 文档 A4 引 GAG：团队色和准星色应可自定义。
- 弹药读数格式：弹匣 / 备弹、子弹图标列，以及低弹量阈值警示——elx.valueLabel 加 magReserve 取值；el.abilities 加低量阈值，与 st.alert 联动（低于阈值变色 / 闪烁）。

</details>

**最相关的原则**（按针对性排序）：[P-focal-periphery](#p-focal-periphery)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-glance-encoding](#p-glance-encoding)、[P-meta-perception](#p-meta-perception)、[P-hit-channel-split](#p-hit-channel-split)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-color-never-alone](#p-color-never-alone)、[P-aspect-anchor](#p-aspect-anchor)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-medium-simulation](#p-medium-simulation)、[P-palette-roles](#p-palette-roles)、[P-motif-from-world](#p-motif-from-world) 等 30 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.5 竞速与驾驶

参考卡 18 张 · 探索台内容包：racing（午夜山道）

竞速的第一信息是名次，越街机越大；追尾镜头下前方赛道在画面中下部，所以 HUD 往四角与顶边推、底部中间留空。速度表是风格位；速度感特效（速度线、运动模糊、FOV）要设上限，以免淹没赛道边界、引起晕动。

**子类**：开放世界 / 街头竞速（Forza Horizon 5、Need For Speed Heat、NIGHT-RUNNERS PROLOGUE）；卡丁车 / 吉祥物竞速（Garfield Kart 两作、Sonic & SEGA All-Stars Racing）；特技 / 碰撞竞速（Crashday Redline Edition）；反重力竞速（Redout）；俯视 / 微缩赛道（Circuit Superstars、Absolute Drift、art of rally）；物理 / 独立小品（Zeepkist、Barro 2020、Slackers - Carts of Glory）；复古霓虹俯视（Razortron 2000）；派对淘汰赛跑（Stumble Guys、蛋仔派对，库里归在竞速）；音游（MUSYNX 在库里误归竞速，只用它的判定字与选曲页作旁证）

**证据说明**：竞速 18 张多为 E 档，评测量少（一半以上不足 100 条），R3 证据很薄；但商店图大多能看到 HUD（只有 3 张无 UI）。看图核对过：NFS Heat、Crashday、Garfield Kart 两作、Stumble Guys、Slackers、Razortron 2000、Circuit Superstars、Absolute Drift、NIGHT-RUNNERS。 MUSYNX（steam:952040）是音游，卡片 genre 仍写 racing；品类讨论见音游篇（rhythm）。

**关键发现**

- 追尾镜头下，前方赛道在画面中下部，所以 HUD 往四角和顶边推，底部中间尽量空着（Crashday 把剩余时间放在底中，是信息过载的代价）。
- 名次是第一信息：越街机越放大（Garfield Kart 左上巨型橙色数字），越写实越收敛（NIGHT-RUNNERS 左上小号斜体）。
- 速度表是风格位：同样是右下角，NFS Heat 用转速弧 + 档位 + 氮气瓶，Razortron 用斜框霓虹数字，Redout 干脆删掉、改用速度线和 FOV。
- 竞速的'地图'有三种问题：要去哪（GPS 路线线）、我和对手的相对位置（竖条进度）、赛道形状（俯视小图标）。先想清楚回答哪一个。
- 速度感特效要设上限：速度线、运动模糊、FOV 拉伸叠加会淹没赛道边界，还会引起晕动（06 文档 A14）。

**一眼要知道什么**

1. 我第几名 / 一共几人：全品类最重要的一个数，卡丁车把它做成全屏最大的字。
2. 第几圈 / 还剩几圈，或者剩余时间 / 下一个检查点。
3. 下一个弯往哪、离多远：小地图上的路线线、赛道进度条、路面上的行车线。
4. 开多快、挂几档：模拟向才重要；街机向可以只用速度线和镜头来表达。
5. 和前车 / 最佳成绩差多少：分段计时与红绿差值（要配 +/− 号，不能只靠颜色）。
6. 道具 / 氮气 / 特技槽就绪了吗。
7. 车还撑得住吗：车损、体力（Slackers 的体力瓶、Crashday 的车损剪影）。
8. 刚才那一下值多少分：特技 / 漂移的倍率与连段分。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 三件套四角：右下表盘，左上名次 / 计时，左下圆形地图，右上目标 | 约 6 / 18（NIGHT-RUNNERS、Forza Horizon 5、NFS Heat、Crashday、Slackers 的右下表盘；Garfield Kart 部分元素也同型） | NIGHT-RUNNERS PROLOGUE（steam:2707900）、Need For Speed Heat（iig:need-for-speed-heat）、Crashday Redline Edition（steam:508980）、Slackers - Carts of Glory（steam:2354000） 等 5 款 | HUD 组织方式 = 分散组件；信息密度 = 稀疏；信息元素集合 = 速度 / 名次 + 名次 / 段位 / 评级 + 计时 / 分数 / 回合 + 小地图 / 罗盘 + 目标 / 路点；数值图形（速度 / 名次） = 表盘指针；速度 / 名次 · 屏幕锚点 = 右下；速度 / 名次 · 数值标注 = 当前值；速度 / 名次 · 数值标注位置 = 环心 / 正中；名次 / 段位 / 评级：画法 = 名次数字；名次 / 段位 / 评级 · 屏幕锚点 = 左上；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 圆环雷达；小地图 / 罗盘 · 屏幕锚点 = 左下；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 右上（渲染说明：vis.silhouette@el.minimap 已移除（渲染器不读这个按元素覆盖）） |
| 卡丁车大名次：左上巨型名次，左侧竖条赛道进度带对手头像，顶中道具格，右上圈数 | 3 / 18（Garfield Kart: Furious Racing、Garfield Kart、Sonic & SEGA All-Stars Racing）。竖条进度现在只能用 plan + column 近似，见 paramGaps | Garfield Kart - Furious Racing（steam:1085510）、Garfield Kart（steam:362930）、Sonic & SEGA All-Stars Racing（steam:34190 · 据已知描述） | HUD 组织方式 = 分散组件；信息密度 = 中等；名次 / 段位 / 评级：画法 = 名次数字；名次 / 段位 / 评级 · 屏幕锚点 = 左上；名次 / 段位 / 评级 · 大小 / 突出度 = 2.2；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 右上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 左中；小地图 / 罗盘 · 内部排布 = 竖列；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 上中；元 UI 屏幕效果 = 整屏速度线；描边线型 = 实线；转角 = 圆角；数字字体 = 大号展示数字 |
| 零 / 近零 HUD：角落一行小字或干脆不画，风景是主角 | 4 / 18（art of rally 只有起点倒计时和分段时间；Barro 2020 零 HUD；Absolute Drift 左上一行黑色小字配白色几何场景；Zeepkist 右下大号速度 + 左下圈数小字） | art of rally（steam:550320）、Barro 2020（steam:1168660）、Absolute Drift（steam:320140）、Zeepkist（steam:1440670） | 信息密度 = 极简；计时 / 分数 / 回合：画法 = 小字倒计时；计时 / 分数 / 回合 · 屏幕锚点 = 左上；正文字族 = 无衬线；面板明度 = 浅色面板 |
| 速度靠画面不靠表：去掉速度表，用整屏速度线和 FOV 拉伸表达 | 1 / 18（Redout 反重力竞速） | Redout: Enhanced Edition（steam:517710 · 据已知描述） | 信息密度 = 稀疏；信息元素集合 = 名次 / 段位 / 评级 + 计时 / 分数 / 回合；元 UI 屏幕效果 = 整屏速度线；叠加特效层 = 面板速度线 |
| 霓虹斜框数字：一个元素承担全部风格 | 1 / 18（Razortron 2000：左下霓虹斜框速度数字，选车页是霓虹线框网格） | Razortron 2000（steam:539720） | 信息密度 = 极简；数值图形（速度 / 名次） = 纯数字；速度 / 名次 · 屏幕锚点 = 左下；倾斜角 = -12；骨架色彩策略 = 双色调；描边线型 = 实线；描边发光 = 0.8；数字字体 = 大号展示数字 |
| 实时名次表：左上竖列名字 + 分数 / 差距，右下赛道小图标 | 2 / 18（Circuit Superstars 左上名次 + 排名表；Crashday 左上实时得分表）。名次表现在借 el.party 近似，见 paramGaps | Circuit Superstars（steam:1097130）、Crashday Redline Edition（steam:508980） | 信息密度 = 稀疏；名次 / 段位 / 评级：画法 = 名次数字；名次 / 段位 / 评级 · 屏幕锚点 = 左上；队伍 / 玩家条：画法 = 名牌；队伍 / 玩家条 · 内部排布 = 竖列；队伍 / 玩家条 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右下 |
| 派对淘汰赛跑（触屏）：左上目标胶囊，右上晋级人数，玩家头顶名字，左摇杆右跳跃 | 2 / 18（Stumble Guys、蛋仔派对） | Stumble Guys（steam:1677740）、蛋仔派对（网易）（gameui:3055） | 输入方式 = 触屏；虚拟摇杆 = 固定摇杆；按键 / 操作提示：画法 = 触屏按钮；按键 / 操作提示 · 屏幕锚点 = 右下；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 左上；计时 / 分数 / 回合：画法 = 回合徽章；计时 / 分数 / 回合 · 屏幕锚点 = 右上；队伍 / 玩家条：画法 = 名牌；队伍 / 玩家条 · 世界挂点 = 目标 / 敌人；信息密度 = 中等；描边线型 = 实线；转角 = 圆角 |

**关键元素与画法**

- **速度 / 名次**（`el.speed`）：dial ×4（圆形表盘 + 中心数字 + 档位：NFS Heat、NIGHT-RUNNERS、Crashday、Slackers） / number（卡上 1 张：Razortron 斜框霓虹数字；Zeepkist 笔记里的右下大号速度数字也属此型） / 不画（Redout 用速度线代替）；常见位置 br ×5、bl ×1。速度表放右下，接近油门 / 扳机手的心理位置，也离开了画面中下部的路面；表盘的弧形本身在'表演'加速，数字只是精确读数。
- **名次 / 段位 / 评级**（`el.rank`）：number ×4（Garfield Kart: Furious Racing 左上超大橙色 5/8；Garfield Kart 右上；Circuit Superstars、NIGHT-RUNNERS 左上）；常见位置 tl ×2、tr ×1。名次是竞速最核心的状态，放在最先被扫视的左上；分母（共几人）用小字。
- **计时 / 分数 / 回合**（`el.timer`）：number（NIGHT-RUNNERS 左上圈速） / scorePill（Slackers 带时钟图标的圆角计时胶囊） / smallText（Absolute Drift、Zeepkist 角落小字） / 圈数 ROUND 1/3（Garfield Kart: Furious Racing 右上）；常见位置 tl ×3、tr、tc、br。计时赛里计时就是主角；排位赛里圈数比时间重要，常和名次分在左右两角。
- **小地图 / 罗盘**（`el.minimap`）：radar / 圆形 GPS（NFS Heat 左下，黄线路线 + 下方地名；Crashday、Forza 左下） / 竖条赛道进度 + 对手头像（Garfield Kart: Furious Racing 左侧） / 赛道形状小图标（Circuit Superstars 右下）；常见位置 bl ×3、ml、br。开放世界要回答'下一个路口往哪'，所以用带路线线的 GPS；封闭赛道要回答'我和对手差多远'，竖条比平面地图更直接。
- **命中反馈 / 连击**（`el.feedback`）：rating（Crashday 中央橙色斜体 STUNT BONUS!） / combo（4x Combo Score 倍率分）；常见位置 center。特技 / 漂移是竞速里的'连击'，倍率字放在车的上方，飘过视线但不挡路。
- **目标 / 路点**（`el.objective`）：checklist（NFS Heat 右上紫色半透明面板 + 勾选圈） / text（Stumble Guys 左上 Objective 小标签 + 白色胶囊大字）；常见位置 tr、tl。生涯 / 开放世界才有任务清单；派对赛每轮规则不同，所以开局先用胶囊大字宣布本轮目标。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots（卡丁车道具格：Garfield Kart 顶中两个圆格） / gauge（氮气 / 体力：NFS Heat 氮气瓶、Slackers 体力瓶贴在速度表旁）；常见位置 tc、br。道具格放顶中，用余光就能确认有没有道具；氮气挂在速度表旁，因为两者在操作上是同一只手。
- **队伍 / 玩家条**（`el.party`）：tag（Stumble Guys 玩家头顶名字） / 名次表（Crashday、Circuit Superstars 左上竖列）；常见位置 挂在车 / 角色上、tl。多人竞速要知道'前面那辆是谁'；名次表让落后的玩家知道差距。
- **按键 / 操作提示**（`el.prompt`）：touchButtons（Stumble Guys 左下摇杆 + 右下跳跃大圆钮）；常见位置 bl、br。触屏派对竞速的操作只有'移动 + 跳'，两个大键足够。
- **通知 / 大字提示**（`el.notify`）：起跑倒计时大字（art of rally） / band（最后一圈、新纪录）；常见位置 center。竞速的关键时刻（起跑、最后一圈、冲线）需要整屏横贯的仪式感，其余时间不打扰。

**重要界面**

- **局内 HUD**：四角三件套（速度右下、名次左上、地图左下），底部中间与画面中下部的路面留空；街机向放大名次并加速度线，写实向收敛成白色细字。 例：Need For Speed Heat（iig:need-for-speed-heat）、Garfield Kart - Furious Racing（steam:1085510）、Crashday Redline Edition（steam:508980）。
- **角色 / 装备 / 属性**：选车 / 车库 / 换装：Garfield Kart 是红框圆角卡 + 一排角色头像页签 + 属性条（速度 / 加速 / 操控）+ 一句话简介；NFS Heat 车库是左侧紫粉细线列表 + 右侧人物与车；Razortron 是霓虹线框网格上的车列 + 像素属性条；派对类是白底圆角卡 + 右侧换装格。 例：Garfield Kart（steam:362930）、Need For Speed Heat（iig:need-for-speed-heat）、Razortron 2000（steam:539720）、蛋仔派对（网易）（gameui:3055） 等 5 款。
- **建造菜单**：赛道编辑器：左侧图块面板（分类 + 方格图块）+ 中央俯视网格（Crashday）；改装页是车库场景里的细线数据（NIGHT-RUNNERS）。 例：Crashday Redline Edition（steam:508980）、NIGHT-RUNNERS PROLOGUE（steam:2707900）。
- **结算 / 胜负 / 奖励**：用三维领奖台（实物台子 + 车手模型 + 彩带）代替表格（Circuit Superstars）。 例：Circuit Superstars（steam:1097130）。
- **关卡 / 章节选择**：选赛道 / 选曲：斜放的插画卡片轮播 + 左右箭头 + 难度标签（MUSYNX 旁证）。 例：MUSYNX（steam:952040）。
- **设置**：派对竞速的设置 / 捏人面板：白底圆角卡 + 黄色斜切按钮，蓝黄撞色（蛋仔派对）。 例：蛋仔派对（网易）（gameui:3055）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 糖果卡通（Q 版）（`fam.candy`）（6 张）：需要在高速画面上一眼读出名次、目标与主按钮：描边大字、斜切黄键、小标签牌（Stumble Guys、SquadBusters、Garfield Kart、蛋仔派对）。
- 合成波 / 蒸汽波（`fam.synthwave`）（4 张）：竞速与节奏（原卡把音游 MUSYNX 归在 racing）：Razortron、MUSYNX、NFS Heat、Night-Runners，速度感与霓虹天然搭配。
- 零 HUD · 世界即界面（`fam.zero-hud`）（2 张）：零 HUD · 世界即界面：本品类主归属卡 Barro 2020、art of rally（理由见 17 号图谱该家族的「多见品类」）。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（2 张）：情境渐显 · 角落小件：本品类主归属卡 Forza Horizon 5、Crashday Redline Edition（理由见 17 号图谱该家族的「多见品类」）。
- 细字直压 · 排印叠层（`fam.typographic-hud`）（2 张）：风格化竞速：计时 / 速度数字是唯一要读的信息
- 科幻 HUD（`fam.scifi`）（1 张）：Redout：反重力竞速，用整屏速度线代替速度表。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）（1 张）：Circuit Superstars、F1：名次榜与圈数牌

**代表作**

- Need For Speed Heat（iig:need-for-speed-heat）〔合成波 / 蒸汽波〕：写实街头竞速最完整：左下圆形 GPS（黄色路线线 + 地名）、右下转速弧 + 速度 + 档位 + 氮气瓶、右上紫色半透明任务清单。
- Garfield Kart - Furious Racing（steam:1085510）〔糖果卡通（Q 版）〕：卡丁车把名次放到最大：左上巨型橙色名次，左侧竖条赛道进度带对手头像，顶中道具格，右上圈数和收集。
- Crashday Redline Edition（steam:508980）〔情境渐显 · 角落小件〕：信息最多但分区清楚：左上实时得分表、顶中分数、中央特技大字、底中剩余时间、左下雷达、右下表盘、右上车损剪影。
- Razortron 2000（steam:539720）〔合成波 / 蒸汽波〕：一个元素也能撑起风格：左下斜框霓虹速度数字。
- art of rally（steam:550320）〔零 HUD · 世界即界面〕：零 HUD 的竞速：低多边形风景就是界面，只留起点倒计时与分段时间。
- Redout: Enhanced Edition（steam:517710 · 据已知描述）〔科幻 HUD〕：速度靠画面：没有速度表，整屏速度线 + FOV 拉伸。
- Stumble Guys（steam:1677740）〔糖果卡通（Q 版）〕：触屏派对竞速：左上目标胶囊、右上晋级人数、头顶名字、两个大触屏键。

**坑**

- 车库 / 菜单与 HUD 读数在电视距离下太小。 例：MUSYNX（steam:952040）、Forza Horizon 5（steam:1551360 · 据已知描述）。
  - 评价与证据（依据：文献）：评测证据不足：Forza Horizon 5、MUSYNX 原来各 2 条「字太小」，复核后不是在说文字（MUSYNX 是音游，品类上改归音游篇）。依据改为 XAG 101。
- 改装 / 编辑器的菜单层级深、难用。 例：NIGHT-RUNNERS PROLOGUE（steam:2707900）、Zeepkist（steam:1440670）。
  - 评价与证据（依据：评测）：菜单 / 界面难用（去重后）：NIGHT-RUNNERS PROLOGUE 2 条、Zeepkist 1 条（两款评测量都不大）。
- 速度感特效叠加（速度线 + 运动模糊 + FOV）淹没赛道边界、引起晕动。 例：Garfield Kart - Furious Racing（steam:1085510）、Redout: Enhanced Edition（steam:517710 · 据已知描述）。
  - 评价与证据（依据：文献）：评测无计数（Redout 只有 27 条评测）；依据 06 文档 A14：速度感特效设上限，FOV 变化率 ≤ 10°/s（经验值）。
- 元素过多时往底部中间放，挡住近处路线（追尾镜头下，路面就在画面中下部）。 例：Crashday Redline Edition（steam:508980）。
  - 评价与证据（依据：截图）：评测无计数；看图归纳（Crashday 的剩余时间压在底中）。

**可演示的对比**

- **速度：圆形表盘 vs 速度线（不画表）**（整套做法对照（多个参数一起变）；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：叠加特效层：自动 → 面板速度线；数值图形（速度 / 名次）：表盘指针 → 自动；信息元素集合：自动 → 名次 / 段位 / 评级 + 计时 / 分数 / 回合 + 小地图 / 罗盘；速度 / 名次 · 屏幕锚点：右下 → 自动
  - 配套改动：速度 / 名次 · 数值标注：当前值 → 不标；速度 / 名次 · 数值标注位置：环心 / 正中 → 条内；元 UI 屏幕效果：无 → 整屏速度线
  - 看什么：去掉速度表后还能不能感觉到快；速度线有没有盖住路肩。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-racing#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud`
  - A：`cmp.gauge@el.speed=dial` `el.speed.screenAnchor=br` `el.speed.valueLabel=current` `el.speed.valueLabelPos=center` `ast.fx=auto` `cnt.elements=auto` `rel.metaFx=[]`
  - B：`cnt.elements=el.rank+el.timer+el.minimap` `rel.metaFx=speedLines` `ast.fx=speedlines` `cmp.gauge@el.speed=auto` `el.speed.screenAnchor=auto` `el.speed.valueLabel=none` `el.speed.valueLabelPos=inside`

  </details>
- **同一组元素换性格：写实街头 vs 卡丁车**（整套做法对照（多个参数一起变）；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：面板明度：深色面板 → 中明度；骨架色彩策略：单色 → 骨架多色；名次 / 段位 / 评级 · 大小 / 突出度：1 → 2.2；数字字体：自动 → 大号展示数字
  - 配套改动：描边线型：无描边 → 实线；底不透明度：0.35 → 1；标题字族：窄体 → 圆体；标题斜体：斜体 → 正体；转角：直角 → 圆角；描边粗细：1 → 3
  - 看什么：名次数字的大小与描边；同一张赛道截图上，哪种 HUD 更像'玩具'。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-racing#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud`
  - A：`vis.stroke=none` `col.lightness=dark` `vis.opacity=0.35` `typ.display.family=condensed` `typ.display.style=italic` `el.rank.scale=1` `col.strategy=mono` `typ.numerals.family=auto` `vis.corner=sharp` `vis.strokeWidth=1`
  - B：`vis.stroke=solid` `vis.strokeWidth=3` `vis.corner=round` `typ.display.family=round` `typ.numerals.family=display` `el.rank.scale=2.2` `col.strategy=polychrome` `col.lightness=mid` `typ.display.style=upright` `vis.opacity=1`

  </details>
- **地图：圆形 GPS vs 竖条赛道进度**（单变量对照；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：小地图 / 罗盘 · 内部排布：继承 → 竖列；小地图 / 罗盘：画法：圆环雷达 → 平面小地图；小地图 / 罗盘 · 屏幕锚点：左下 → 左中
  - 配套改动：小地图 / 罗盘 · 大小 / 突出度：1 → 0.7
  - 看什么：玩家得到的是'下一个弯往哪'，还是'我和对手的相对位置'。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-racing#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud`
  - A：`el.minimap.form=radar` `el.minimap.screenAnchor=bl` `el.minimap.arrangement=inherit` `el.minimap.scale=1`
  - B：`el.minimap.form=plan` `el.minimap.screenAnchor=ml` `el.minimap.arrangement=column` `el.minimap.scale=0.7`

  </details>
- **四角常驻 vs 零 HUD（俯视拉力）**（单变量对照；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：中等 → 极简
  - 配套改动：HUD 显隐策略：常驻 → 电影模式（全隐）
  - 看什么：风景占比；没有名次和圈数时，玩家还能不能判断比赛形势。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-racing#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud`
  - A：`rel.hudVisibility=always` `cnt.density=2`
  - B：`rel.hudVisibility=hidden` `cnt.density=0`

  </details>
- **手柄 vs 触屏派对**（整套做法对照（多个参数一起变）；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：输入方式：手柄 → 触屏；按键 / 操作提示：画法：按键图例条 → 触屏按钮；按键 / 操作提示 · 屏幕锚点：自动 → 右下；虚拟摇杆：自动 → 固定摇杆
  - 配套改动：按键提示图标集：Xbox → 自动；触控尺寸：自动 → 96
  - 看什么：触屏键占掉左下 / 右下后，速度表和地图被挤到哪里。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-racing#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud`
  - A：`ctx.input=pad` `ix.glyphs=xbox` `el.prompt.form=legend` `el.prompt.screenAnchor=auto` `ix.touchSize=auto` `ix.touchStick=auto`
  - B：`ctx.input=touch` `ix.touchStick=fixed` `el.prompt.form=touchButtons` `el.prompt.screenAnchor=br` `ix.touchSize=96` `ix.glyphs=auto`

  </details>

**样例内容**：竞速与驾驶（`racing#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（5 项）</summary>

- 速度表的附属读数：档位 / 转速红区 / 氮气 / 车损——el.speed 加 parts（gear / rpm / boost / damage，多选），或允许 cmp.gauge = dial 带内圈第二读数；现在 el.speed 只有通用模板参数。
- 线性进度条带：一条线标出自己、对手头像和检查点（竞速竖条 / 横版与音乐关卡的横条）——el.minimap.form 加 progressStrip（横 / 竖），与 cmp.gauge = track 配合。
- 分段计时与差值：圈速 + 与最佳 / 前车的 ±差值（红绿 + 正负号冗余）——el.timer.form 加 split；现在只能用 elx.valueLabel = delta 近似，表达不了'当前圈 / 最佳圈 / 差值'三联。
- 实时名次表：名次 + 名字 + 差距 / 分数，自己那一行高亮——el.party.form 加 standings（竖列表）；现在借 el.party.form = tag + column 近似。
- el.speed 与 el.rank 语义重叠：词表里 el.speed 的标签是'速度 / 名次'，而名次已有 el.rank——把 el.speed 的标签改为'速度 / 档位'，名次只归 el.rank。

</details>

**最相关的原则**（按针对性排序）：[P-priority-tiers](#p-priority-tiers)、[P-glance-encoding](#p-glance-encoding)、[P-focal-periphery](#p-focal-periphery)、[P-meta-perception](#p-meta-perception)、[P-aspect-anchor](#p-aspect-anchor)、[P-shared-screen](#p-shared-screen)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-result-tally](#p-result-tally)、[P-medium-simulation](#p-medium-simulation)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-palette-roles](#p-palette-roles)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-fail-retry](#p-fail-retry) 等 15 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.6 角色扮演

参考卡 24 张 · 探索台内容包：rpg（长风剑歌）

角色扮演同时要回答队伍状态、行动顺序、能做什么、敌人弱点、装备差值、成长距离和对话门槛；版式有整合底座（CRPG / 暗黑式）、JRPG 贴边指令窗、动作 RPG 分散角落、日程制拼贴 HUD、MMO 多栏五条路。信息越多，越要靠一套统一的状态编码。

**子类**：CRPG（俯视 / 等距，回合或即时暂停：博德之门 3、暗黑地牢 1 / 2）；回合 / ATB JRPG（最终幻想 VIII / IX / X、Octopath Traveler、Persona 5、Metaphor）；动作 RPG（最终幻想 XVI、最终幻想 VII 重制、王国之心、Clair Obscur 的探索段）；暗黑式刷宝 ARPG（暗黑破坏神 IV）；MMO（魔兽世界）；风格化 RPG（RPG Time、Eastward）；手游 RPG（原神、星穹铁道、剑与远征 启程、逆水寒、王牌三国志；抽卡 / 商城页不计）

**一眼要知道什么**

1. 队伍里每个人现在怎样：HP / MP / 行动资源 + 异常状态，谁快倒了
2. 轮到谁、下一个是谁：行动顺序或 ATB 充能
3. 我现在能做什么、代价是什么：指令 / 技能的消耗、冷却、射程；不能用的要一眼看出
4. 敌人怕什么、接下来要干什么：弱点、护盾 / 破防、意图或读条
5. 这件装备比身上的好吗：数值差（↑↓）与稀有度
6. 离下一级、下一个能力还有多远：经验条、技能点
7. 主线在哪、今天还剩几天：任务追踪、日历与期限（日程制 RPG）
8. 这个对话选项有没有门槛：属性检定、成功率、会不会得罪人

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 整合底座：下半屏一整条，装队伍肖像、技能栏、资源，甚至地牢小地图；上半屏留给战斗 | 整合底座 4 / 24（博德之门 3、暗黑 IV、暗黑地牢 1 / 2） | Darkest Dungeon（steam:262060）、Darkest Dungeon II（steam:1940340）、Baldur's Gate 3（steam:1086940 · 据已知描述）、Diablo IV（steam:2344520 · 据已知描述） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 整合底座；信息密度 = 密集；信息元素集合 = 队伍 / 玩家条 + 技能 / 冷却 / 弹药 / 手牌 + 资源 / 货币 + 小地图 / 罗盘；队伍 / 玩家条：画法 = 肖像行；队伍 / 玩家条 · 屏幕锚点 = 下中；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 横排；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左下；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右下；外框结构 = 雕花九宫格；外框材质 = 石；装饰预算 = 华丽 |
| JRPG 贴边指令窗：左下竖排指令菜单 + 光标，右下队伍名牌（名字 / HP / MP / ATB），渐变半透明窗 | 贴边整条 2 / 24（最终幻想 VIII / IX）；队伍名牌 5 / 24（FF VII 重制、VIII、IX、X 在右下，Octopath 在右上） | FINAL FANTASY VIII（steam:39150）、FINAL FANTASY IX（steam:377840）、OCTOPATH TRAVELER（steam:921570）、FINAL FANTASY X/X-2 HD Remaster（steam:359870 · 据已知描述） 等 5 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；时间模型 = 回合制；HUD 组织方式 = 贴边整条；信息密度 = 中等；信息元素集合 = 队伍 / 玩家条 + 技能 / 冷却 / 弹药 / 手牌 + 行动顺序 + 敌人血条 / 预警 / 意图 + 命中反馈 / 连击；队伍 / 玩家条：画法 = 名牌；队伍 / 玩家条 · 内部排布 = 竖列；队伍 / 玩家条 · 屏幕锚点 = 右下；队伍 / 玩家条 · 数值标注 = 当前 / 上限；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 竖列；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左下；行动顺序：画法 = 头像队列；行动顺序 · 屏幕锚点 = 右上；敌人血条 / 预警 / 意图：画法 = 敌人血条；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；命中反馈 / 连击：画法 = 飘字；程序填充 = 渐变；光泽高光 = 顶部玻璃高光；导航焦点表现 = 光标指示（手指 / 三角 / 括号） |
| 动作 RPG 分散角落：主角血条环绕头像（弧形）、队友小头像环、Boss 长条在顶部、技能 4 格在角上 | 分散组件 5 / 24（王国之心、Persona 5、Metaphor、魔兽世界、原神）；另有 FF XVI、FF VII 重制按同一思路摆 | KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、FINAL FANTASY XVI（steam:2515020）、原神（米哈游）（gameui:1691）、FINAL FANTASY VII REMAKE INTERGRADE（steam:1462040 · 据已知描述） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 分散组件；HUD 显隐策略 = 常驻；信息密度 = 中等；信息元素集合 = 生命 / 护盾 / 体力 + 队伍 / 玩家条 + 技能 / 冷却 / 弹药 / 手牌 + 敌人血条 / 预警 / 意图；数值图形（生命 / 护盾 / 体力） = 弧形；生命 / 护盾 / 体力 · 屏幕锚点 = 右下；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 右上；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 竖列；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左下；敌人血条 / 预警 / 意图：画法 = Boss 长条 + 名字；敌人血条 / 预警 / 意图 · 屏幕锚点 = 上中；描边线型 = 实线 |
| 日程制 RPG 的拼贴 HUD：角落一块斜放的日期 / 天气牌是视觉锚，菜单是异形剪纸块 + 斜排大字，入场斜切划入 | 2 / 24（Persona 5 Royal 左上日历、Metaphor 右上斜放日期 + 剩余天数） | Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 分散组件；信息元素集合 = 时间 / 天气 / 日历 + 队伍 / 玩家条 + 按键 / 操作提示；时间 / 天气 / 日历：画法 = 日历页；时间 / 天气 / 日历 · 屏幕锚点 = 左上；队伍 / 玩家条：画法 = 头像 + 分数药丸；队伍 / 玩家条 · 屏幕锚点 = 右下；按键 / 操作提示：画法 = 按键图例条；按键 / 操作提示 · 屏幕锚点 = 右下；边缘处理 = 异形轮廓；随手摆放倾角 = 6；骨架色彩策略 = 双色调；标题字族 = 拼贴勒索信；入场动效 = 斜切划入 / 遮罩擦除 |
| MMO 多栏：多排技能栏、可拖动窗口、右侧任务追踪、左上头像框、左下聊天——信息极密但玩家可重排 | 1 / 24（魔兽世界，信息密度极密）；对应现有品类布局 layout.rpg | World Of Warcraft（iig:world-of-warcraft） | 界面类型 = 局内 HUD；容器 = 可拖动窗口；HUD 组织方式 = 分散组件；信息密度 = 极密；信息元素集合 = 技能 / 冷却 / 弹药 / 手牌 + 队伍 / 玩家条 + 小地图 / 罗盘 + 目标 / 路点 + 聊天 + 敌人血条 / 预警 / 意图；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 规则网格；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右上；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 右中；聊天：画法 = 频道文本行；聊天 · 屏幕锚点 = 左下；敌人血条 / 预警 / 意图：画法 = 目标头像框；敌人血条 / 预警 / 意图 · 屏幕锚点 = 上中；外框材质 = 金；外框结构 = 平框九宫格 |
| 整屏是一件物件：游戏画在作业本上，状态栏是贴在书桌四周的手工卡纸和玩具（画在玩法区外的边框里） | 1 / 24（RPG Time）；同类思路见 Knights And Bikes 的旧照片暗角 | RPG Time: The Legend of Wright（steam:1839510） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 画在玩法区外的边框里；玩法区形态 = 棋盘 / 关卡窗；场景容器 = 书桌 / 桌面；默认放置方式 = 叙事内；UI 与画面关系 = 同一媒介；信息密度 = 极密；标题字族 = 手写；图标风格 = 手绘彩绘；外框材质 = 米白纸；外框结构 = 平框九宫格 |
| 探索态极简：跑图时只有左上地名 + 一行目标，进战斗才换成完整战斗 HUD | 1 / 24 明确标注（Clair Obscur）；FF XVI 探索时同样稀疏 | Clair Obscur: Expedition 33（steam:1903340）、FINAL FANTASY XVI（steam:2515020） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 显隐策略 = 情境显现；信息密度 = 稀疏；信息元素集合 = 目标 / 路点；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 左上；标题字族 = 衬线；底不透明度 = 0；文字可读辅助 = 投影 |

**关键元素与画法**

- **队伍 / 玩家条**（`el.party`）：tag / frames / portraitRow / scoreRow / portraits；常见位置 br、bl、bc、tr、tl、mr。RPG 的头号元素：队伍制时生命值并进队伍条。队伍条锚在右下的 5 / 24（4 张 JRPG 名牌 + Persona 5 的头像分数条），CRPG 头像竖列放左下（博德之门 3），地城底座里是一排肖像（暗黑地牢），手游放右侧（原神）。当前行动者要放大或高亮，异常状态用小图标挂在头像上。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots / ultimate / hotbar；常见位置 bc、br、bl。三种骨架：CRPG / MMO 是下中长热栏（多页、可拖）；JRPG 是左下竖排指令菜单 + 光标（攻击 / 技能 / 道具，用 elx.arrangement = column 近似）；动作 RPG 是角上 4 格。技能格 6 张、大招充能 1 张；下中 3、右下 2、左下 1。
- **行动顺序**（`el.turnOrder`）：portraitQueue / timeline / icons；常见位置 tl、tr、tc。回合 RPG 的「轮到谁」：FF X 战斗右上的行动顺序栏、Octopath 左上头像队列 + 下一回合预览、暗黑地牢 2 右上回合数 + 头像。能插队的技能要在队列上预览结果。
- **敌人血条 / 预警 / 意图**（`el.threat`）：intent / healthBar / bossBar / targetFrame；常见位置 tc。敌人信息挂在敌人身上：Octopath 敌人脚下的弱点格（未知用问号，护盾数在旁边）、FF XVI 顶部 Boss 长条带名字和韧性槽、暗黑地牢 2 敌人脚下的血条。稀有度色与元素色不能撞（06 文档 A5）。
- **命中反馈 / 连击**（`el.feedback`）：floatNumbers / rating；常见位置 center。伤害数字的字体是风格信号：Octopath 用大号衬线、Persona 用拼贴手写；「弱点！/ 暴击 / 抵抗」评价字配合弱点系统。挂在目标上。
- **生命 / 护盾 / 体力**（`el.vitals`）：thinBar / bar / arc / orb / icons；常见位置 tl、br、bc、bl。只有单主角操作时才单独画：FF XVI 左上横条、王国之心环绕头像的弧形条、暗黑 IV 左右液体球、Eastward 心形格。队伍制时并入 el.party。
- **对话 / 事件选项**（`el.choices`）：text / buttons；常见位置 bc、mr。对话是 RPG 的一半：博德之门 3 是电影镜头 + 底部编号选项 + 骰子检定，选项前面用彩色标签标出检定类型（hier.inline = chip）。选项要能标出门槛、已选过、锁定（见 paramGaps）。
- **字幕 / 说话人**（`el.subtitle`）：bubble / bar；常见位置 bc。形态取 cmp.dialogBox：带尾气泡 5 张（FF IX 灰蓝渐变圆角窗、Eastward 像素气泡、Persona / Metaphor 锯齿异形框），底部通栏 2 张（FF VIII 左上带说话人名、博德之门 3）。
- **时间 / 天气 / 日历**（`el.clock`）：calendar / dayCounter；常见位置 tl、tr。日程制 RPG 的日期牌是整个 HUD 的视觉锚：Persona 5 左上大号日期 + 星期 + 天气，Metaphor 右上斜放并在地图页写出任务还剩几天。
- **小地图 / 罗盘**（`el.minimap`）：plan；常见位置 tr、tl。开放世界 RPG 保留平面小地图（魔兽世界右上、原神 / 星穹铁道左上）；Clair Obscur 去掉小地图后成为单款最集中的评测抱怨（13 条）。
- **目标 / 路点**（`el.objective`）：checklist / text；常见位置 mr、tl、ml。MMO / 开放世界在右侧挂任务追踪清单（魔兽世界），手游在左侧（原神）；线性 RPG 探索时只给一行（Clair Obscur 左上）。
- **通知 / 大字提示**（`el.notify`）：band / banner / cutIn；常见位置 center、tc。关键时刻用整屏大字（暗黑地牢 2 的事件标题黑底大字）、全员立绘切入（Persona）、任务开始居中半透明横幅（原神）。要短、可跳过。
- **聊天**（`el.chat`）：lines；常见位置 bl。只有 MMO 需要（魔兽世界左下频道文本行）；单机 RPG 不画。
- **身份 / 头像 / 等级**（`el.profile`）：levelBar / avatarLevel；常见位置 tl。Lv + 经验条主要在角色页和战后出现，局内常驻少见；MMO 把头像 + 等级放在左上头像框里。
- **资源 / 货币**（`el.resources`）：iconNumber；常见位置 bl、br。金币、补给多放在地城底座左下（暗黑地牢）或菜单里，探索 / 战斗 HUD 上很少常驻。

**重要界面**

- **局内 HUD**：RPG 有两套 HUD：探索态（稀疏、只留目标 / 小地图）与战斗态（队伍、指令、行动顺序、敌人弱点）。切换本身是演出（遇敌转场）。战斗态的骨架由时间模型决定：回合 / ATB → 贴边指令窗 + 名牌；即时暂停 / 回合 CRPG → 整合底座热栏；动作 → 分散角落。 例：FINAL FANTASY IX（steam:377840）、OCTOPATH TRAVELER（steam:921570）、KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、Darkest Dungeon II（steam:1940340） 等 5 款。
- **对话 / 文本**：四种做法：①电影镜头 + 底部编号选项 + 检定骰子（博德之门 3）；②拼贴锯齿框 + 半身立绘切入 + 斜放名字牌 + 右下快进 / 自动 / 日志键（Persona 5、Metaphor）；③带尾渐变窗挂在角色旁（FF IX）；④底部通栏左上写说话人名（FF VIII）。说话人名牌 + 继续提示 + 回看是最低配置。 例：Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、FINAL FANTASY IX（steam:377840）、FINAL FANTASY VIII（steam:39150） 等 5 款。
- **角色 / 装备 / 属性**：两极：①黑底 + 大立绘居右 + 细线衬线字 + 手写感装饰线，技能用菱形节点连线（Clair Obscur）；②石框密表：左肖像、中间属性 / 怪癖 / 装备、右侧技能与抗性、最右名册（暗黑地牢）。风格化的做法是超大描边英文压在立绘上（Metaphor 的队伍页）。竖屏手游创角：上半立绘、下半色块选项卡 + 底部确认大按钮（剑与远征 启程）。装备 / 义体页的另一种骨架是人体剖面居中 + 四周插槽连线（赛博朋克 2077）。 例：Clair Obscur: Expedition 33（steam:1903340）、Darkest Dungeon（steam:262060）、Metaphor: ReFantazio（steam:2679460）、AFK2: Journey (剑与远征2：启程）（gameui:8436） 等 5 款。
- **背包 / 物品**：网格 + 一侧详情；稀有度至少两种手段冗余（边框色 + 底色，暗黑 IV）；比较值用 ↑↓ 数字；有负重的要把重量写在背包页固定位置；竖屏手游用白底网格 + 物品底色按稀有度（几何王国）。与 NPC 交易复用同一版式。 例：The Witcher 3: Wild Hunt — Remastered（steam:292030）、几何王国（gameui:12983）、Diablo IV（steam:2344520 · 据已知描述）、Baldur's Gate 3（steam:1086940 · 据已知描述）。
- **技能树 / 成长**：节点画法即世界观：菱形节点 + 细连线（Clair Obscur）、星座（天际）、六边形格（极乐迪斯科的思想柜）。锁定节点用灰度或剪影，可点亮的要有发光提示。 例：Clair Obscur: Expedition 33（steam:1903340）、Disco Elysium（steam:632470）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）。
- **地图 / 世界地图**：绘本插画地图 + 黑白标签 + 左上地名说明 + 右上任务期限倒计时（Metaphor）；纸板立体书地图（RPG Time）；手游平面地图配左上小地图（原神）。 例：Metaphor: ReFantazio（steam:2679460）、RPG Time: The Legend of Wright（steam:1839510）、原神（米哈游）（gameui:1691）。
- **任务日志 / 目标**：任务日志写成书页（魔兽世界的羊皮纸书页）；分主线 / 支线 / 委托，追踪中的任务高亮。 例：World Of Warcraft（iig:world-of-warcraft）、Red Dead Redemption（steam:2668510）。
- **登录 / 选服 / 创角**：创角 / 捏脸与登录选服：竖屏上半立绘、下半米白卡上的圆形色块（剑与远征 启程）；国风登录用宣纸底面板 + 竹叶灯笼角饰 + 书法标题 + 带朱红点的签条按钮（逆水寒）。 例：AFK2: Journey (剑与远征2：启程）（gameui:8436）、逆水寒手游（网易）（gameui:9375）。
- **读取 / 过场**：开场动画只在右上留一个「跳过」小字（黑暗之潮），章节转场用整屏黑底大字（暗黑地牢 2）。 例：黑暗之潮：契约（​​掌趣科技）（gameui:3711）、Darkest Dungeon II（steam:1940340）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 暗金金属牌（`fam.dark-gold`）（4 张）：ARPG / MMO 下中整合底座：WoW、Diablo IV、BG3。
- JRPG 窗口（`fam.jrpg`）（4 张）：回合 / ATB / CTB 战斗需要指令列表与队伍状态表（FF VIII、IX、X、Octopath）。
- 二次元白卡细线（`fam.anime-card`）（3 张）：开放世界与竖屏 RPG（原神、剑与远征：启程 ×2）。
- 暗色细线（`fam.dark-hairline`）（2 张）：Darkest Dungeon II、FF7R / FFXVI：深色细线 HUD 或黑底大字事件。
- 重装饰雕花框（`fam.ornate-frame`）（2 张）：Darkest Dungeon 石雕底座。
- Persona 拼贴（`fam.persona-collage`）（2 张）：日式 RPG（Persona 5 Royal、Metaphor: ReFantazio）：日历、对话、菜单、战斗指令全部拼贴化。
- 线描花饰（`fam.filigree`）（1 张）：Clair Obscur：美好年代取材。
- 糖果卡通（Q 版）（`fam.candy`）（1 张）：王国之心：饱和色描边指令菜单 + 环绕头像的弧形条，迪士尼式明快。

**代表作**

- Baldur's Gate 3（steam:1086940 · 据已知描述）〔暗金金属牌〕：CRPG 现代标准：底部中央多页可拖热栏、左下队伍竖列、对话是电影镜头 + 底部编号选项 + 骰子检定。
- Darkest Dungeon（steam:262060）〔重装饰雕花框〕：UI 与画面同一媒介的教科书：石雕底座与手绘粗黑线插画一体，角色页是密而有序的石框表格。
- Metaphor: ReFantazio（steam:2679460）〔Persona 拼贴〕：风格化到极致仍被夸好用（去重后 R3 有 2 条夸 UI——夸 UI 的评测全库只有 47 条，2 条已算多）：剪纸异形菜单、斜放日期牌、绘本地图带期限倒计时。
- Persona 5 Royal（steam:1687950）〔Persona 拼贴〕：日期 / 天气牌 + 锯齿对话框 + 立绘切入 + 右下快进 / 自动 / 日志键：日程制 RPG 的完整一套；提到 UI 的 79 条里 72 条好评。
- OCTOPATH TRAVELER（steam:921570）〔JRPG 窗口〕：回合战斗信息设计的范本：左上头像行动队列 + 下回合预览、敌人脚下弱点格（未知是问号）+ 护盾数、伤害数字用大号衬线。
- KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）〔糖果卡通（Q 版）〕：动作 RPG 的另一种骨架：左下竖排指令菜单（饱和色描边）+ 右下环绕头像的弧形血 / 魔条 + 右上队友小头像。
- Clair Obscur: Expedition 33（steam:1903340）〔线描花饰〕：探索态只留地名 + 一行目标、角色页黑底大立绘 + 细线衬线：极简而华丽；同时是「去掉小地图」代价的反面教材（地图抱怨 13 条）。
- FINAL FANTASY VIII（steam:39150）〔JRPG 窗口〕：经典 JRPG 窗口：左下指令窗、右下名字 / HP / ATB，对话窗左上写说话人名。
- RPG Time: The Legend of Wright（steam:1839510）〔手绘笔记本〕：画在玩法区外的边框里：整屏是书桌，状态栏是手工卡纸和玩具，地图是纸板立体书。
- Darkest Dungeon II（steam:1940340）〔文字小说栏 / 互动小说排版〕：回合地城的现代版：敌我脚下血条 + 右上回合与头像、底部技能行 + 站位点、关键事件整屏黑底大字。

**坑**

- 为了画面干净去掉小地图，又没有足够好用的大地图或指引 例：Clair Obscur: Expedition 33（steam:1903340）、OCTOPATH TRAVELER（steam:921570）、FINAL FANTASY XVI（steam:2515020）。
  - 评价与证据（依据：评测）：R3 去重后：Clair Obscur 地图抱怨 13 条（全库单款最多）；Octopath、FF XVI、王国之心各 1 条。
- 系统多层叠加（指令、卡片、联动技、职业）而教学与提示跟不上 例：KINGDOM HEARTS -HD 1.5+2.5 ReMIX-（steam:2552430）、FINAL FANTASY VII REMAKE INTERGRADE（steam:1462040 · 据已知描述）、Diablo IV（steam:2344520 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：王国之心 HD 引导抱怨 3 条、FF VII 重制 3 条、暗黑 IV 2 条。
- 整合底座 / 战斗 HUD 信息过密，或掉落物标签铺满屏幕 例：Baldur's Gate 3（steam:1086940 · 据已知描述）、Diablo IV（steam:2344520 · 据已知描述）。
  - 评价与证据（依据：截图）：看图为主（博德之门 3、暗黑 IV 的卡都是「商店图无 UI」，底座与掉落标签据已知描述）。评测证据不足：两款原来各 2 条「太乱」，复核后说的是战利品价值与特效，不是 HUD；暗黑 IV 提到 UI 的 68 条里 55 条是差评，但多是对整款游戏不满时顺带提及。
- 背包格子与负重管理繁琐 例：Darkest Dungeon II（steam:1940340）、Baldur's Gate 3（steam:1086940 · 据已知描述）、The Elder Scrolls V: Skyrim Special Edition（steam:489830 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：天际背包 2 条；博德之门 3、暗黑地牢 2 各 1 条（未达门槛）；全库背包抱怨 ≥ 2 条的 7 款集中在生存 / 恐怖。
- 稀有度色阶与元素属性色撞色（火红、冰蓝、毒绿），且只靠颜色区分 例：Diablo IV（steam:2344520 · 据已知描述）、Assassin's Creed Odyssey（steam:812140 · 据已知描述）。
  - 评价与证据（依据：文献）：无评测证据；06 文档 A5：稀有度色要配边框形状或粗细，并检查与技能元素色的冲突
- 风格化菜单动画过长、不能跳过，拖慢高频操作 例：Persona 5 Royal（steam:1687950）、Metaphor: ReFantazio（steam:2679460）、FINAL FANTASY IX（steam:377840）。
  - 评价与证据（依据：文献）：R3 没有直接计数；06 文档引 Persona 5 早期 UI 动画遮挡画面后被削弱；同为拼贴风的 Metaphor 有 2 条夸 UI——关键在动画时长与可跳过，而不是风格本身。
- 老 JRPG 重制沿用原版按键映射与 4:3 布局，手柄操作别扭 例：FINAL FANTASY IX（steam:377840）、FINAL FANTASY X/X-2 HD Remaster（steam:359870 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：FF X/X-2 HD 手柄 / 键位抱怨 2 条；FF IX 卡顿 1 条。

**可演示的对比**

- **战斗 HUD：JRPG 贴边指令窗 vs 暗黑式整合底座**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 雕花九宫格；数值图形（生命 / 护盾 / 体力）：自动 → 液体球；信息密度：中等 → 密集；信息元素集合：队伍 / 玩家条 + 技能 / 冷却 / 弹药 / 手牌 + 行动顺序 + 敌人血条 / 预警 / 意图 + 命中反馈 / 连击 → 生命 / 护盾 / 体力 + 资源 / 货币 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 敌人血条 / 预警 / 意图
  - 配套改动：时间模型：回合制 → 实时；HUD 组织方式：贴边整条 → 整合底座；队伍 / 玩家条：画法：名牌 → 自动；队伍 / 玩家条 · 内部排布：竖列 → 继承；队伍 / 玩家条 · 屏幕锚点：右下 → 自动；队伍 / 玩家条 · 数值标注：当前 / 上限 → 不标；技能 / 冷却 / 弹药 / 手牌 · 内部排布：竖列 → 横排；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：左下 → 下中；行动顺序：画法：头像队列 → 自动；行动顺序 · 屏幕锚点：右上 → 自动；敌人血条 / 预警 / 意图：画法：敌人血条 → Boss 长条 + 名字；敌人血条 / 预警 / 意图 · 世界挂点：目标 / 敌人 → 不挂（用屏幕锚点）；命中反馈 / 连击：画法：飘字 → 无；转角：圆角 → 直角；程序填充：渐变 → 纯色；光泽高光：顶部玻璃高光 → 自动；描边线型：双线 → 实线；描边色：高光亮边 → 同色加深；导航焦点表现：光标指示（手指 / 三角 / 括号） → 自动；数值图形（资源 / 货币）：自动 → 液体球；小地图 / 罗盘：画法：自动 → 平面小地图；小地图 / 罗盘 · 屏幕锚点：自动 → 右上；资源 / 货币：画法：自动 → 以数值图形呈现；资源 / 货币 · 屏幕锚点：自动 → 下中；敌人血条 / 预警 / 意图 · 屏幕锚点：自动 → 上中；生命 / 护盾 / 体力 · 屏幕锚点：自动 → 下中；冷却 / 不可用表现：自动 → 冷却扇形；装饰母题：无 → 骷髅 / 哥特；装饰预算：无 → 中
  - 看什么：时间模型怎样决定骨架：a 的信息贴着左右下边、靠光标选指令，b 全部收进中下一条底座、靠热键。看两者把画面的哪一块留给战斗，以及多人队伍（a）和单主角（b）的生命值放在哪。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rpg#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `lay.container=overlay` `el.abilities.form=slots` `col.lightness=dark` `ast.frameMat=iron`
  - A：`ctx.timeModel=turn` `lay.hudOrg=edgeBar` `cnt.density=2` `cnt.elements=el.party+el.abilities+el.turnOrder+el.threat+el.feedback` `el.party.form=tag` `el.party.arrangement=column` `el.party.screenAnchor=br` `el.party.valueLabel=currentMax` `el.abilities.arrangement=column` `el.abilities.screenAnchor=bl` `el.turnOrder.form=portraitQueue` `el.turnOrder.screenAnchor=tr` `el.threat.form=healthBar` `el.threat.attachTo=target` `el.feedback.form=floatNumbers` `vis.corner=round` `vis.fill=gradient` `vis.gloss=topShine` `vis.stroke=double` `vis.strokeColor=highlightEdge` `ix.focus=cursor` `ast.frame=procedural` `cmp.gauge@el.resources=auto` `cmp.gauge@el.vitals=auto` `el.minimap.form=auto` `el.minimap.screenAnchor=auto` `el.resources.form=auto` `el.resources.screenAnchor=auto` `el.threat.screenAnchor=auto` `el.vitals.screenAnchor=auto` `st.cooldown=auto` `vis.motif=none` `vis.ornament=0`
  - B：`ctx.timeModel=realtime` `lay.hudOrg=console` `cnt.density=3` `cnt.elements=el.vitals+el.resources+el.abilities+el.minimap+el.threat` `cmp.gauge@el.vitals=orb` `el.vitals.screenAnchor=bc` `el.resources.form=gauge` `cmp.gauge@el.resources=orb` `el.resources.screenAnchor=bc` `el.abilities.arrangement=row` `el.abilities.screenAnchor=bc` `st.cooldown=radialWipe` `el.minimap.form=plan` `el.minimap.screenAnchor=tr` `el.threat.form=bossBar` `el.threat.screenAnchor=tc` `ast.frame=carvedNinePatch` `vis.motif=skulls` `vis.ornament=2` `el.feedback.form=[]` `el.party.arrangement=inherit` `el.party.form=auto` `el.party.screenAnchor=auto` `el.party.valueLabel=none` `el.threat.attachTo=none` `el.turnOrder.form=auto` `el.turnOrder.screenAnchor=auto` `ix.focus=auto` `vis.corner=sharp` `vis.fill=solid` `vis.gloss=auto` `vis.stroke=solid` `vis.strokeColor=darker`

  </details>
- **行动顺序：头像队列 vs 速度时间轴**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：行动顺序：画法：头像队列 → 速度时间轴；行动顺序 · 屏幕锚点：左上 → 上中
  - 配套改动：行动顺序 · 内部排布：横排 → 继承
  - 看什么：a 只告诉「谁先谁后」，b 还告诉「快多少」。想象一个会让敌人推迟行动的技能：在哪一种上更容易预览结果？队列长度超过 8 人时哪一种还读得清？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rpg#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `lay.container=overlay` `ctx.timeModel=turn` `cnt.elements=el.turnOrder+el.party+el.threat` `el.party.form=tag` `el.party.screenAnchor=tr` `el.threat.form=intent` `el.threat.attachTo=target`
  - A：`el.turnOrder.form=portraitQueue` `el.turnOrder.arrangement=row` `el.turnOrder.screenAnchor=tl`
  - B：`el.turnOrder.form=timeline` `el.turnOrder.screenAnchor=tc` `el.turnOrder.arrangement=inherit`

  </details>
- **角色页：大立绘留白 vs 石框密表**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 雕花九宫格；信息密度：稀疏 → 极密；标题字族：衬线 → 哥特黑体；底不透明度：0 → 1
  - 配套改动：背后画面来源：替换为背景 → 冻结；替换背景：纯色 / 黑场 → 自动；主角色呈现介质：全身立绘 → 半身立绘；主体位置：右 → 左；主体与面板层叠：主体出框压面板 → 自动；正文字族：衬线 / 宋 → 无衬线；装饰预算：少 → 华丽；装饰母题：花叶卷草 → 骷髅 / 哥特；内芯结构：程序填充 → 材质平铺；分区方式：自动 → 三栏；分组方式：自动 → 面板；压暗强度：自动 → 0.6
  - 看什么：同一份角色数据（属性、技能、装备、抗性）：a 让立绘做主角、数值退成细线表格，b 让数据做主角、三栏塞满。眯眼看：a 第一眼是人，b 第一眼是哪一栏？哪种更适合需要频繁比较的地城 RPG？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rpg#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.character` `lay.container=fullscreen` `cnt.focal=character` `cnt.dataShape=record` `st.statViz=table` `vis.stroke=solid` `vis.strokeWidth=1` `col.lightness=dark` `col.strategy=mono` `ast.coreMat=stone` `ast.frameMat=stone` `col.coding=status`
  - A：`rel.behind=replaced` `ast.bgArt=solid` `cnt.characterMedium=full` `lay.focalSide=right` `lay.layering=breakout` `cnt.density=1` `typ.display.family=serif` `typ.body.family=serif` `vis.ornament=1` `vis.motif=floral` `vis.opacity=0` `ast.core=procedural` `ast.frame=procedural` `lay.composition=auto` `lay.grouping=auto` `rel.dim=auto`
  - B：`rel.behind=frozen` `rel.dim=0.6` `cnt.characterMedium=bust` `lay.focalSide=left` `lay.composition=three` `cnt.density=4` `lay.grouping=panel` `ast.core=texture` `ast.frame=carvedNinePatch` `vis.ornament=3` `vis.motif=skulls` `typ.display.family=gothic` `ast.bgArt=auto` `lay.layering=auto` `typ.body.family=sans` `vis.opacity=1`

  </details>
- **对话：电影镜头 + 编号选项 vs 拼贴锯齿框 + 立绘切入**（整套做法对照（多个参数一起变）；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：字幕 / 说话人 + 对话 / 事件选项 + 队伍 / 玩家条 → 字幕 / 说话人 + 时间 / 天气 / 日历；骨架色彩策略：单色 → 双色调；时间 / 天气 / 日历：画法：自动 → 日历页；时间 / 天气 / 日历 · 屏幕锚点：自动 → 左上
  - 配套改动：容器：底 / 顶托盘 → 直接叠加；主视觉主体：场景 → 角色；主角色呈现介质：3D 实时模型 → 半身立绘；对话框结构：底部通栏 → 带尾气泡；对话 / 事件选项：画法：文字行 → 自动；对话 / 事件选项 · 内部排布：竖列 → 继承；对话 / 事件选项 · 屏幕锚点：下中 → 自动；序号样式：01 / DAY 1 → 自动；正文内强调：彩色标签 → 自动；正文字族：衬线 / 宋 → 无衬线；底不透明度：0.85 → 1；面板明度：深色面板 → 中明度；队伍 / 玩家条：画法：肖像行 → 自动；队伍 / 玩家条 · 屏幕锚点：左下 → 自动；标牌（name）：无（直压） → 斜切色带；跳过 / 快进：自动 → 自动 / 快进 / 日志一组；跳过按钮位置：右上 → 右下；主体位置：自动 → 左；主体与面板层叠：自动 → 主体出框压面板；入场动效：硬切 → 斜切划入 / 遮罩擦除；标题字族：同正文 → 拼贴勒索信；边缘处理：干净 → 锯齿；随手摆放倾角：0 → 4
  - 看什么：a 把演出交给 3D 镜头，文字退到底部、选项前用彩色标签写检定类型；b 让 UI 自己当演出（锯齿框、斜名牌、立绘出框）。看选项多到 5 条、台词长到 3 行时两种各自怎么撑。
  - 注：`vis.tilt` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rpg#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.dialogue` `rel.behind=live`
  - A：`lay.container=tray` `cnt.focal=scene` `cnt.characterMedium=model3d` `cmp.dialogBox=bar` `cnt.elements=el.subtitle+el.choices+el.party` `el.choices.form=text` `el.choices.arrangement=column` `el.choices.screenAnchor=bc` `typ.numbering=arabic` `hier.inline=chip` `typ.body.family=serif` `vis.opacity=0.85` `col.lightness=dark` `el.party.form=portraitRow` `el.party.screenAnchor=bl` `cmp.plate@name=none` `col.strategy=mono` `el.clock.form=auto` `el.clock.screenAnchor=auto` `ix.skip=auto` `ix.skipAnchor=tr` `lay.focalSide=auto` `lay.layering=auto` `mo.enter=cut` `typ.display.family=same` `vis.edge=clean` `vis.tilt=0`
  - B：`lay.container=overlay` `cnt.focal=character` `cnt.characterMedium=bust` `lay.focalSide=left` `lay.layering=breakout` `cmp.dialogBox=bubble` `cmp.plate@name=slashBand` `vis.edge=jagged` `vis.tilt=4` `col.strategy=duotone` `typ.display.family=ransom` `mo.enter=slashIn` `ix.skip=vnControls` `ix.skipAnchor=br` `cnt.elements=el.subtitle+el.clock` `el.clock.form=calendar` `el.clock.screenAnchor=tl` `col.lightness=mid` `el.choices.arrangement=inherit` `el.choices.form=auto` `el.choices.screenAnchor=auto` `el.party.form=auto` `el.party.screenAnchor=auto` `hier.inline=auto` `typ.body.family=sans` `typ.numbering=auto` `vis.opacity=1`

  </details>
- **战利品稀有度：只靠边框色 vs 多手段冗余**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：分区方式：自动 → 左右分栏；详情呈现：临时出现 → 常驻一侧；变化 / 前后对比：a → b 箭头 → 前后双卡；稀有度表达手段：边框色 → 边框色 + 底色 + 框形状不同 + 侧边色条
  - 看什么：开色盲模拟后看 5 档稀有度在 a、b 里还能不能分开；再看比较装备时眼睛要移动多远（a 悬停弹出、b 常驻右侧前后对比）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rpg#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.inventory` `lay.container=fullscreen` `cnt.dataShape=collection` `lay.arrangement=grid` `cmp.slot=cell` `col.coding=rarity` `col.rarityScale=diablo`
  - A：`st.rarityCue=border` `st.delta=arrow` `lay.detail=transient` `lay.composition=auto`
  - B：`lay.composition=splitLR` `st.rarityCue=border+bg+frameShape+strip` `st.delta=sideBySide` `lay.detail=persistent`

  </details>

**样例内容**：西幻地城 CRPG（俯视 / 回合）（`rpg#dungeon-crpg`）、回合制 JRPG（队伍 / 行动顺序）（`rpg#turn-jrpg`）、东方武侠（动作 RPG）（`rpg#wuxia-arpg`）、科幻小队 RPG（`rpg#scifi-squad`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（7 项）</summary>

- el.choices 缺选项标注：技能检定（属性 + 难度 / 成功率）、已选过变灰、需求未满足锁定、后果预告——博德之门 3、极乐迪斯科的核心；建议 el.choices.annotate（多选：check / seen / locked / consequence），现在只能用 hier.inline = chip 近似
- el.threat 缺「弱点格 / 护盾计数」（未知用问号、命中后揭示图标、旁边写剩余护盾数）——Octopath 式破防系统；现在只能用 intent 近似（steam:921570）
- 缺「指令菜单」作为独立形态：JRPG 的攻击 / 技能 / 道具竖列 + 光标现在只能借 el.abilities + elx.arrangement = column，与技能格混在一起；建议 el.abilities.form 增加 commandList
- 缺队伍站位 / 阵列位置指示（1–4 站位点、技能的偏好站位与目标点）——暗黑地牢；cmp.gauge = lightUp 能画出点但没有语义
- cmp.gauge = arc 没有「环绕 el.party 头像」的挂载关系（王国之心式头像 + 弧形条），现在只能分别摆放
- 第二生命值（压力 / 理智 / 士气）用 el.vitals.count = 2 近似，缺「可溢出、到阈值触发事件」的表达
- 缺 RPG 常见的期限读数：Metaphor 地图右上的任务剩余天数可以用 el.timer = smallText 近似，但没有和 el.clock 日历牌联动的「距期限 N 天」形态

</details>

**最相关的原则**（按针对性排序）：[P-item-decision](#p-item-decision)、[P-progression-graph](#p-progression-graph)、[P-menu-architecture](#p-menu-architecture)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-choice-framing](#p-choice-framing)、[P-actionable-first](#p-actionable-first)、[P-density-tempo](#p-density-tempo)、[P-journal-codex](#p-journal-codex)、[P-save-continuity](#p-save-continuity)、[P-type-two-tier](#p-type-two-tier)、[P-contrast-with-reason](#p-contrast-with-reason)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-radial-for-sticks](#p-radial-for-sticks) 等 41 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.7 叙事与视觉小说

参考卡 17 张 · 探索台内容包：visualNovel（海风来信）

叙事与视觉小说的界面大多「不在」：17 款里 12 款信息密度极简，交互即画面。剩下的设计重心是谁在说、说了什么、能不能回看、选项有多少分量；作品即媒介（手抄本、漫画分格、剪辑台）时，风格字与小字号是最大的可读性风险。

**子类**：步行模拟 / 互动小品（Venba、Behind the Frame、Florence、Miniatures）；互动电影 / 分支剧情（Heavy Rain、Beyond: Two Souls、Detroit: Become Human）；对话 RPG / 文字冒险（Disco Elysium、Kentucky Route Zero、Pentiment）；日程养成叙事 / 视觉小说式（I Was a Teenage Exocolonist）；漫画 / 动画剧叙事（Stilstand、Goodbye Volcano High、Night in the Woods、Forgotton Anne、Minute of Islands）；媒介即玩法（IMMORTALITY 的剪辑台）

**一眼要知道什么**

1. 谁在说话、对谁说：名字、位置、立绘高亮或气泡尾巴，非说话人压暗
2. 说了什么、刚才说过什么：当前台词 + 能回看的历史
3. 我能怎么回应、哪些选择有分量：选项、检定、限时、已选过
4. 现在是什么时候：第几天、什么时段、还剩多少时间
5. 我的选择改变了什么：关系、属性、后果提示——轻、短、可忽略
6. 画面里什么能互动：零 HUD 画面里靠光标变化或小圆点提示
7. 我在故事的哪里：章节、流程图、存档

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 零 HUD · 交互即画面：做菜步骤就是锅和食材、画画就是手里的笔，屏幕上没有任何常驻元素 | 信息密度极简 12 / 17；HUD 全隐 6 / 17（Beyond、Heavy Rain、Behind the Frame、Venba、Goodbye Volcano High、Miniatures）；叙事内 4 / 17 | Venba（steam:1491670）、Behind the Frame（steam:1634150）、Miniatures（steam:2428840）、Florence（iig:florence） 等 5 款 | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；默认放置方式 = 叙事内；UI 与画面关系 = 同一媒介；信息元素集合 = 交互提示 + 字幕 / 说话人；交互提示：画法 = 光标变化；交互提示 · 世界挂点 = 兴趣点；字幕 / 说话人 · 屏幕锚点 = 下中 |
| 对话挂在角色身上：气泡跟着说话人走，边走边说不暂停，选项也是头顶的小气泡 | 带尾气泡 3 / 17（Night in the Woods、Pentiment、Stilstand）；OXENFREE（恐怖批）是边走边选的代表 | Night in the Woods（steam:481510）、Pentiment（steam:1205520）、Stilstand（steam:1282320）、OXENFREE（steam:388880） | 界面类型 = 对话 / 文本；容器 = 直接叠加；背后画面来源 = 实时场景；对话框结构 = 带尾气泡；信息元素集合 = 字幕 / 说话人 + 对话 / 事件选项；字幕 / 说话人 · 世界挂点 = 玩家角色；对话 / 事件选项：画法 = 聊天气泡；对话 / 事件选项 · 世界挂点 = 玩家角色；阻断性 = 非阻断；面板明度 = 深色面板 |
| 小说式文本栏：对话是右侧整栏滚动文本，像读小说；或角落一列无框文字，画面保持完整 | 聊天软件式 1 / 17（Disco Elysium）+ 无框字幕 1 / 17（Kentucky Route Zero） | Disco Elysium（steam:632470）、Kentucky Route Zero（steam:231200） | 界面类型 = 对话 / 文本；容器 = 侧抽屉；分区方式 = 左右分栏；对话框结构 = 聊天软件式；内容溢出方式 = 纵向滚动；文案量 = 长文滚动；信息元素集合 = 字幕 / 说话人 + 对话 / 事件选项；字幕 / 说话人 · 屏幕锚点 = 右中；对话 / 事件选项：画法 = 文字行；对话 / 事件选项 · 内部排布 = 竖列；对话 / 事件选项 · 屏幕锚点 = 右中；正文字族 = 衬线 / 宋；正文内强调 = 关键词着色；面板明度 = 深色面板 |
| 贴边常驻属性 + 日程：左侧竖条属性、顶部日程条，叙事选择直接改这些数值 | 贴边整条 2 / 17（I Was a Teenage Exocolonist、Disco Elysium 左下肖像 + 右下时钟） | I Was a Teenage Exocolonist（steam:1148760）、Disco Elysium（steam:632470） | 界面类型 = 局内 HUD；容器 = 直接叠加；HUD 组织方式 = 贴边整条；信息密度 = 极密；信息元素集合 = 世界 / 社会态势条 + 时间 / 天气 / 日历 + 身份 / 头像 / 等级 + 通知 / 大字提示；世界 / 社会态势条：画法 = 多项堆叠；数值图形（世界 / 社会态势条） = 细条；世界 / 社会态势条 · 屏幕锚点 = 左中；时间 / 天气 / 日历：画法 = 日历页；时间 / 天气 / 日历 · 屏幕锚点 = 上中；身份 / 头像 / 等级：画法 = 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点 = 左上；通知 / 大字提示：画法 = 圆角提示卡；通知 / 大字提示 · 屏幕锚点 = 右上；转角 = 圆角；骨架色彩策略 = 骨架多色 |
| 空间内文字：选项与按键提示以文字浮在角色头边或物体上，随镜头透视 | 空间内 2 / 17（Heavy Rain 选项旋转浮现、Detroit 证据标签全息细线框） | Detroit: Become Human（steam:1222140）、Heavy Rain（steam:960910 · 据已知描述）、Beyond: Two Souls（steam:960990 · 据已知描述） | 界面类型 = 局内 HUD；容器 = 直接叠加；默认放置方式 = 空间内；世界内标注渲染（默认） = 透视贴面；HUD 显隐策略 = 电影模式（全隐）；信息元素集合 = 对话 / 事件选项 + 按键 / 操作提示 + 目标 / 路点；对话 / 事件选项：画法 = 文字行；对话 / 事件选项 · 世界挂点 = 玩家角色；按键 / 操作提示：画法 = 情境按键；按键 / 操作提示 · 世界挂点 = 兴趣点；目标 / 路点：画法 = 标记图标 + 目标文字；目标 / 路点 · 世界挂点 = 兴趣点；骨架色彩策略 = 单色 |
| 作品即媒介：整部作品是一本手抄本、一套漫画分格、一张剪辑台，UI 就是媒介本身的部件 | 同一媒介 2 / 17（Pentiment、Stilstand）+ 叙事内 4 / 17（IMMORTALITY 剪辑台、Florence、Behind the Frame、Venba） | Pentiment（steam:1205520）、Stilstand（steam:1282320）、IMMORTALITY（steam:1350200）、Florence（iig:florence） | 界面类型 = 对话 / 文本；容器 = 直接叠加；默认放置方式 = 叙事内；UI 与画面关系 = 同一媒介；场景容器 = 书；内芯结构 = 材质平铺；内芯材质 = 羊皮纸；对话框结构 = 带尾气泡；标题字族 = 书法；装饰预算 = 中 |

**关键元素与画法**

- **字幕 / 说话人**（`el.subtitle`）：bubble / bar / bare / chatThread / fullPage；常见位置 bc、mr、bl。叙事类的主体元素，形态取 cmp.dialogBox：气泡挂角色（NITW 黑底白字圆角、Pentiment 羊皮纸卷、Stilstand 手写），右栏小说（Disco），角落无框文字（KRZ），底部黑条（Minute of Islands）。说话人识别靠名字 + 位置 + 非说话人压暗（06 文档 A16）。
- **对话 / 事件选项**（`el.choices`）：text / buttons / bubbles / banners；常见位置 mr、bc、center。选择是叙事游戏唯一的「操作」：Disco 编号红字行、Pentiment 左列圆形图标 + 缎带标签、Exocolonist 右侧圆角条、OXENFREE 头顶小气泡、Heavy Rain 环绕头部的浮字。已选 / 锁定状态不能只靠颜色（06 文档 A16）。
- **时间 / 天气 / 日历**（`el.clock`）：calendar / clock / dayCounter；常见位置 br、tc、tl。时间是叙事的资源：Disco 右下时钟 + 第几天，Exocolonist 顶部日程条。只在时间推动剧情的作品里画。
- **世界 / 社会态势条**（`el.meter`）：stack / withIcon；常见位置 ml。叙事养成把属性做成常驻竖条（Exocolonist 左侧共情 / 说服 / 勇气等），每次选择都能看见它在动；纯叙事作不画。
- **队伍 / 玩家条**（`el.party`）：portraitRow；常见位置 bl。Disco 左下油画肖像 + 两个小状态图标，是主角的「健康 / 士气」入口；单主角叙事作里它也是打开角色页的按钮。
- **交互提示**（`el.interact`）：cursor / keyPrompt；常见位置 center。零 HUD 画面里唯一的提示：Forgotton Anne 交互时出现小圆形提示，Minute of Islands 的物体旁小提示，Behind the Frame 是画笔本身。挂在物体上。
- **目标 / 路点**（`el.objective`）：text / marker；常见位置 bc。叙事作的目标多以旁白句出现：Minute of Islands 底部黑条 + 小图标一句话；Detroit 侦查时证据标签挂在物体上。
- **通知 / 大字提示**（`el.notify`）：toast / cutIn；常见位置 tr、tl、tc。选择后果与关系变化的提示：短、角落、可忽略；Exocolonist 的属性提升提示属于这一类。
- **按键 / 操作提示**（`el.prompt`）：contextual / legend；常见位置 bc、br。QTE 与情境按键只在需要时浮现（Beyond、Heavy Rain）；对话界面右下放快进 / 自动 / 日志一组（ix.skip = vnControls）。
- **标题 / LOGO**（`el.title`）：titleCard / artTitle；常见位置 center。章节标题卡是叙事节奏的标点：Stilstand 的手写大字标题格、Goodbye Volcano High 的动画剧片头；对应 tpl.chapterCard。

**重要界面**

- **对话 / 文本**：叙事类的主屏。按「画面占比」排：气泡挂角色（画面完整）→ 角落无框文字（画面完整 + 去色）→ 底部通栏 + 立绘（画面让一条）→ 右侧整栏小说（画面让 1/3，换来长文与历史）→ 全屏文本（NVL）。说话人名、继续提示、回看是最低配置；长文本要滚动与关键词着色。 例：Night in the Woods（steam:481510）、Kentucky Route Zero（steam:231200）、Disco Elysium（steam:632470）、Pentiment（steam:1205520） 等 5 款。
- **角色 / 装备 / 属性**：Disco 角色页是油画肖像格 + 大号衬线数字的技能矩阵；Pentiment 的背景选择是左列圆形图标 + 缎带标签 + 右侧说明卡，提示「按住确认」。叙事 RPG 的角色页同时是性格设定，不只是数值。 例：Disco Elysium（steam:632470）、Pentiment（steam:1205520）。
- **技能树 / 成长**：思想柜：六边形格子 + 右侧说明，研究中的思想有计时（Disco）。成长树也写成叙事文本。 例：Disco Elysium（steam:632470）。
- **背包 / 物品**：Disco 背包：中间人物纸娃娃 + 两侧衣物格 + 底部手绘物品格；Exocolonist 装备是圆角卡片 + 属性徽章的网格。物品描述常是一段叙事文字。 例：Disco Elysium（steam:632470）、I Was a Teenage Exocolonist（steam:1148760）。
- **地图 / 世界地图**：地图也是叙事媒介：KRZ 的公路地图是黑底细线路网 + 小地名；Pentiment 的书页即地图（手抄本插图页）。 例：Kentucky Route Zero（steam:231200）、Pentiment（steam:1205520）。
- **手牌 / 牌桌**：叙事养成把挑战做成卡牌对决：圆角卡 + 属性徽章，全屏半透明蓝框（Exocolonist）。 例：I Was a Teenage Exocolonist（steam:1148760）。
- **任务日志 / 目标**：日志 / 笔记本是叙事解谜的主界面：Obra Dinn 的 19 世纪书页排版日志、Chants of Sennaar 由玩家自己填写词义的手绘笔记（解谜批）。 例：Return of the Obra Dinn（steam:653530）、Chants of Sennaar（steam:1931770）。
- **局内 HUD**：多数叙事作没有局内 HUD；有的话只是一条情境提示（Minute of Islands 底部黑条）或侦查模式的空间内标签（Detroit）。剪辑台 / 设备界面作品里，HUD 就是那台设备（IMMORTALITY 的胶片格与时间码）。 例：Minute of Islands（steam:1049710）、Detroit: Become Human（steam:1222140）、IMMORTALITY（steam:1350200）。
- **读取 / 过场**：章节标题卡：黑场 / 纯色底上的手写或衬线大字，淡入、自动消失（对应 tpl.chapterCard）；漫画叙事用一整格画当标题。 例：Stilstand（steam:1282320）、Goodbye Volcano High（steam:1310330 · 据已知描述）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 零 HUD · 世界即界面（`fam.zero-hud`）（6 张）：零 HUD · 世界即界面：本品类主归属卡 Florence、Goodbye Volcano High、Venba 等（理由见 17 号图谱该家族的「多见品类」）。
- 细字直压 · 排印叠层（`fam.typographic-hud`）（4 张）：叙事：文字本来就是主要内容，排版即界面
- 羊皮纸任务书（`fam.parchment`）（1 张）：Pentiment：书页即世界，字体即角色。
- 漫画对话框（`fam.comic`）（1 张）：漫画叙事（Stilstand）。
- 全息空间（`fam.holo`）（1 张）：Detroit：调查重建，线索卡挂在物体上。
- 毛玻璃（`fam.glass`）（1 张）：毛玻璃：本品类主归属卡 I Was a Teenage Exocolonist（理由见 17 号图谱该家族的「多见品类」）。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（1 张）：手绘叙事（交互时出现小圆提示）
- 镜头屏显：取景器 / 摄像机 / 监控（`fam.camera-osd`）（1 张）：IMMORTALITY：胶片剪辑台

**代表作**

- Disco Elysium（steam:632470）〔文字小说栏 / 互动小说排版〕：小说式对话的标杆：右侧整栏滚动文本、技能人格当说话人、检定写在台词前、编号红字选项；左下油画肖像 + 右下时钟；角色页、思想柜、背包都是同一套油画 + 衬线语言。提到 UI 的 58 条里 53 条好评。
- Pentiment（steam:1205520）〔羊皮纸任务书〕：字体即身份：每个角色用不同字体说话，气泡是羊皮纸卷，书页即地图——同一媒介做到底；它还提供「所有角色统一用最易读字体」的辅助选项。评测里提到字体的命中多是在夸它（去重后无字号抱怨）。
- Kentucky Route Zero（steam:231200）〔细字直压 · 排印叠层〕：角落无框文字列表 + 黑底细线公路地图：几乎不画 UI，却有极强的作者风格。
- I Was a Teenage Exocolonist（steam:1148760）〔毛玻璃〕：叙事养成的信息密度上限：左侧属性竖条、顶部日程条常驻，挑战做成卡牌对决。
- Detroit: Become Human（steam:1222140）〔全息空间〕：空间内 UI：侦查时证据标签以全息细线框悬浮在物体上，蓝白单色。提到 UI 的 79 条里 75 条好评。
- Night in the Woods（steam:481510）〔细字直压 · 排印叠层〕：零 HUD + 黑底白字圆角气泡挂在头上：最轻的对话形态，去重后 25 条提到 UI 的评测全是好评。
- IMMORTALITY（steam:1350200）〔镜头屏显：取景器 / 摄像机 / 监控〕：剪辑台本身就是界面：胶片格、时间码、底部小图标——媒介即玩法。
- Stilstand（steam:1282320）〔漫画对话框〕：铅笔素描漫画分格 + 手写气泡：画面与文字是同一支笔。
- OXENFREE（steam:388880）〔漫画对话框〕：（恐怖批）对话选项是浮在角色头顶的三个小气泡，边走边说不暂停——叙事 UI 不打断移动的做法。

**坑**

- 为了媒介统一用了风格化字体（手抄体、手写体），正文字号又小，长文本难读 例：Pentiment（steam:1205520）、Return of the Obra Dinn（steam:653530）。
  - 评价与证据（依据：截图）：看图：Pentiment 的手抄体正文、Obra Dinn 的 1 位色小字。评测证据不足：原来记的 Pentiment 2、Venba 1、Obra Dinn 2 条「字太小」复核后不是在说文字。
- QTE 与浮空提示出现得突然、与手柄键位对应不清，失败了也不知道为什么 例：Heavy Rain（steam:960910 · 据已知描述）、Beyond: Two Souls（steam:960990 · 据已知描述）、Forgotton Anne（steam:542050 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：Heavy Rain 手柄 / 键位 3 条 + 引导 2 条；Beyond 引导 2 条（提到 UI 的 48 条里 23 条差评）；Forgotton Anne 手柄 1 条。
- 零 HUD 叙事里缺方向感，不知道还能去哪、要找谁 例：I Was a Teenage Exocolonist（steam:1148760）、Chants of Sennaar（steam:1931770）、TOEM（steam:1307580）。
  - 评价与证据（依据：评测）：R3 去重后：Exocolonist 地图抱怨 1 条；Chants of Sennaar 5 条、TOEM 4 条（同类「界面就是画面」作品）。
- 台词直接压在高频 / 高亮背景上，没有底板或投影 例：Kentucky Route Zero（steam:231200）、Goodbye Volcano High（steam:1310330 · 据已知描述）。
  - 评价与证据（依据：文献）：无评测证据；06 文档 A16：文本框在任何背景上都要 4.5:1，靠半透明底板或渐变遮罩（KRZ 靠暗场景避开了这个问题）
- 选项的已选 / 未选 / 锁定只靠颜色区分 例：Disco Elysium（steam:632470）、Pentiment（steam:1205520）。
  - 评价与证据（依据：文献）：无评测证据；06 文档 A16 可读性规则

**可演示的对比**

- **说话人呈现：底部通栏 + 半身立绘 vs 气泡挂头边走边说**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：底部通栏 → 带尾气泡；面板明度：中明度 → 深色面板；对话 / 事件选项 · 内部排布：竖列 → 横排；对话 / 事件选项 · 世界挂点：不挂（用屏幕锚点） → 玩家角色
  - 配套改动：容器：底 / 顶托盘 → 直接叠加；背后画面来源：冻结 → 实时场景；主视觉主体：角色 → 场景；主角色呈现介质：半身立绘 → 自动；主体位置：左 → 自动；主体与面板层叠：面板压主体 → 自动；非焦点压暗：0.3 → 自动；标牌（name）：边缘小标签条 → 无（直压）；文字出现：打字机逐字 → 立即；继续提示：闪烁小三角 / 叶片 → 自动；跳过 / 快进：自动 / 快进 / 日志一组 → 自动；对话 / 事件选项：画法：按钮 → 聊天气泡；字幕 / 说话人 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；阻断性：自动 → 非阻断；本屏怎么结束：自动 → 自动消失；转角：直角 → 圆角
  - 看什么：a 把世界停下来、让立绘说话；b 世界照常走、台词跟着角色。三个人同屏说话时，在哪一种里更快认出是谁在说？亮背景上 b 的气泡要不要深色底？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-narrative#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.screen=screen.dialogue` `cnt.elements=el.subtitle+el.choices`
  - A：`lay.container=tray` `rel.behind=frozen` `cmp.dialogBox=bar` `cnt.focal=character` `cnt.characterMedium=bust` `lay.focalSide=left` `lay.layering=behind` `hier.dimInactive=0.3` `cmp.plate@name=tab` `mo.textReveal=typewriter` `ix.continueCue=blinkArrow` `ix.skip=vnControls` `el.choices.form=buttons` `el.choices.arrangement=column` `col.lightness=mid` `el.choices.attachTo=none` `el.subtitle.attachTo=none` `ix.blocking=auto` `ix.dismiss=auto` `vis.corner=sharp`
  - B：`lay.container=overlay` `rel.behind=live` `cmp.dialogBox=bubble` `cnt.focal=scene` `mo.textReveal=instant` `ix.dismiss=timed` `ix.blocking=none` `el.subtitle.attachTo=player` `el.choices.form=bubbles` `el.choices.attachTo=player` `el.choices.arrangement=row` `col.lightness=dark` `vis.corner=round` `cmp.plate@name=none` `cnt.characterMedium=auto` `hier.dimInactive=auto` `ix.continueCue=auto` `ix.skip=auto` `lay.focalSide=auto` `lay.layering=auto`

  </details>
- **长文本：右栏小说 vs 角落无框文字 + 黑白场景**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：聊天软件式 → 无框字幕；信息元素集合：字幕 / 说话人 + 对话 / 事件选项 + 队伍 / 玩家条 + 时间 / 天气 / 日历 → 字幕 / 说话人 + 对话 / 事件选项；文案量：长文滚动 → 短段（2–3 句）；面板明度：深色面板 → 中明度
  - 配套改动：容器：侧抽屉 → 直接叠加；分区方式：左右分栏 → 自动；内容溢出方式：纵向滚动 → 单屏；正文字族：衬线 / 宋 → 无衬线；正文内强调：关键词着色 → 自动；字幕 / 说话人 · 屏幕锚点：右中 → 左下；对话 / 事件选项 · 屏幕锚点：右中 → 左下；队伍 / 玩家条：画法：肖像行 → 自动；队伍 / 玩家条 · 屏幕锚点：左下 → 自动；时间 / 天气 / 日历：画法：时钟数字 → 自动；时间 / 天气 / 日历 · 屏幕锚点：右下 → 自动；导航焦点表现：自动 → 整行色条；背后调色：原样 → 黑白；文字可读辅助：自动 → 投影；底不透明度：1 → 0
  - 看什么：a 用 1/3 画面换来长文和可回看的历史，b 保住整幅画面但只能放短句。把同一段 6 句对话放进去：a 是否自然、b 是否需要分页？b 的场景去色后文字对比度是否足够？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-narrative#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.screen=screen.dialogue` `rel.behind=live` `el.choices.form=text` `el.choices.arrangement=column`
  - A：`lay.container=drawer` `lay.composition=splitLR` `cmp.dialogBox=chatThread` `lay.overflow=scrollV` `cnt.textLength=long` `typ.body.family=serif` `hier.inline=keyword` `col.lightness=dark` `cnt.elements=el.subtitle+el.choices+el.party+el.clock` `el.subtitle.screenAnchor=mr` `el.choices.screenAnchor=mr` `el.party.form=portraitRow` `el.party.screenAnchor=bl` `el.clock.form=clock` `el.clock.screenAnchor=br` `ix.focus=auto` `rel.sceneTone=none` `typ.legibility=auto` `vis.opacity=1`
  - B：`lay.container=overlay` `rel.sceneTone=mono` `cmp.dialogBox=bare` `cnt.textLength=short` `vis.opacity=0` `typ.legibility=shadow` `typ.body.family=sans` `ix.focus=bar` `cnt.elements=el.subtitle+el.choices` `el.subtitle.screenAnchor=bl` `el.choices.screenAnchor=bl` `col.lightness=mid` `el.clock.form=auto` `el.clock.screenAnchor=auto` `el.party.form=auto` `el.party.screenAnchor=auto` `hier.inline=auto` `lay.composition=auto` `lay.overflow=single`

  </details>
- **选项：暂停后的按钮列 vs 世界里的限时浮字**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：对话 / 事件选项 → 对话 / 事件选项 + 按键 / 操作提示；界面类型：对话 / 文本 → 局内 HUD；对话 / 事件选项 · 内部排布：竖列 → 环绕中心 / 轮盘；对话 / 事件选项 · 世界挂点：不挂（用屏幕锚点） → 玩家角色
  - 配套改动：容器：居中弹窗 → 直接叠加；背后画面来源：冻结 → 实时场景；压暗强度：0.5 → 自动；背后虚化：6 → 0；对话 / 事件选项：画法：按钮 → 文字行；对话 / 事件选项 · 屏幕锚点：中心 → 自动；主交互模式：选择条目 → 时机操作；确认机制：选中 + 确认按钮 → 自动；阻断性：模态 → 非阻断；对话 / 事件选项 · 放置方式（逐元素）：继承 → 空间内；按键 / 操作提示 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；按键 / 操作提示：画法：无 → 情境按键；继续提示：自动 → 倒计时；默认放置方式：屏幕叠加 → 空间内
  - 看什么：a 给玩家时间想，b 用时间压力逼出本能反应。看 b 的浮字在角色头部周围是否会被动作遮住、倒计时是否清楚；这正是 Heavy Rain 被抱怨按键提示不清的位置。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-narrative#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel`
  - A：`cnt.screen=screen.dialogue` `lay.container=modal` `rel.behind=frozen` `rel.dim=0.5` `rel.sceneBlur=6` `cnt.elements=el.choices` `el.choices.form=buttons` `el.choices.arrangement=column` `el.choices.screenAnchor=center` `ix.mode=select` `ix.confirm=selectConfirm` `ix.blocking=modal` `el.choices.attachTo=none` `el.choices.diegesis=inherit` `el.prompt.attachTo=none` `el.prompt.form=[]` `ix.continueCue=auto` `rel.diegesis=screen`
  - B：`cnt.screen=screen.hud` `lay.container=overlay` `rel.behind=live` `rel.diegesis=spatial` `cnt.elements=el.choices+el.prompt` `el.choices.form=text` `el.choices.diegesis=spatial` `el.choices.attachTo=player` `el.choices.arrangement=ring` `el.prompt.form=contextual` `el.prompt.attachTo=player` `ix.mode=timing` `ix.continueCue=countdown` `ix.blocking=none` `el.choices.screenAnchor=auto` `ix.confirm=auto` `rel.dim=auto` `rel.sceneBlur=0`

  </details>
- **同一媒介（手抄本）vs 中性叠加（干净无衬线）**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：内芯结构：材质平铺 → 程序填充；面板明度：中明度 → 深色面板；对话 / 事件选项：画法：并列横幅 → 按钮；UI 与画面关系：同一媒介 → 中性
  - 配套改动：外框结构：雕花九宫格 → 程序线框；边缘处理：撕边 / 破边 → 干净；装饰预算：中 → 无；标题字族：书法 → 同正文；正文字族：衬线 / 宋 → 无衬线；转角：直角 → 圆角；底不透明度：1 → 0.85
  - 看什么：a 让对话像书页的一部分，b 像现代软件叠在画面上。开最小字号检查与 2 倍文字缩放：a 的手抄体在小字号下还能读吗（Pentiment 的抱怨）？b 是否完全丢了时代感？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-narrative#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.screen=screen.dialogue` `lay.container=overlay` `rel.behind=live` `cmp.dialogBox=bubble` `ast.coreMat=parchment` `ast.frameMat=parchment` `cnt.elements=el.subtitle+el.choices` `el.choices.arrangement=column` `el.choices.screenAnchor=ml`
  - A：`rel.harmony=sameMedium` `ast.core=texture` `ast.frame=carvedNinePatch` `vis.edge=torn` `vis.ornament=2` `typ.display.family=calligraphy` `typ.body.family=serif` `el.choices.form=banners` `col.lightness=mid` `vis.corner=sharp` `vis.opacity=1`
  - B：`rel.harmony=neutral` `ast.core=procedural` `vis.opacity=0.85` `vis.corner=round` `col.lightness=dark` `typ.body.family=sans` `el.choices.form=buttons` `ast.frame=procedural` `typ.display.family=same` `vis.edge=clean` `vis.ornament=0`

  </details>
- **同一段日常：零 HUD vs 贴边属性 + 日程**（整套做法对照（多个参数一起变）；内容包：visualNovel · 海风来信；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（世界 / 社会态势条）：自动 → 细条；信息密度：极简 → 极密；信息元素集合：交互提示 → 世界 / 社会态势条 + 时间 / 天气 / 日历 + 身份 / 头像 / 等级 + 资源 / 货币 + 通知 / 大字提示；骨架色彩策略：单色 → 骨架多色
  - 配套改动：HUD 显隐策略：电影模式（全隐） → 自动；默认放置方式：叙事内 → 屏幕叠加；交互提示：画法：光标变化 → 无；交互提示 · 世界挂点：兴趣点 → 不挂（用屏幕锚点）；时间 / 天气 / 日历：画法：自动 → 日历页；时间 / 天气 / 日历 · 屏幕锚点：自动 → 上中；世界 / 社会态势条：画法：自动 → 多项堆叠；世界 / 社会态势条 · 屏幕锚点：自动 → 左中；通知 / 大字提示：画法：无 → 圆角提示卡；通知 / 大字提示 · 屏幕锚点：自动 → 右上；身份 / 头像 / 等级：画法：自动 → 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点：自动 → 左上；资源 / 货币：画法：自动 → 图标 + 数字；资源 / 货币 · 屏幕锚点：自动 → 上中；HUD 组织方式：自动 → 贴边整条；标题字族：同正文 → 圆体；转角：直角 → 圆角
  - 看什么：a 让玩家只看这一刻（Venba 式），b 让玩家时刻看见选择的累计结果（Exocolonist 式）。同一个选择发生后，b 的属性条与提示是否抢走了情绪？a 又丢了哪些玩家其实想知道的东西？
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-narrative#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=visualNovel` `cnt.screen=screen.hud` `lay.container=overlay`
  - A：`rel.hudVisibility=hidden` `cnt.density=0` `rel.diegesis=diegetic` `cnt.elements=el.interact` `el.interact.form=cursor` `el.interact.attachTo=poi` `cmp.gauge@el.meter=auto` `col.strategy=mono` `el.clock.form=auto` `el.clock.screenAnchor=auto` `el.meter.form=auto` `el.meter.screenAnchor=auto` `el.notify.form=[]` `el.notify.screenAnchor=auto` `el.profile.form=auto` `el.profile.screenAnchor=auto` `el.resources.form=auto` `el.resources.screenAnchor=auto` `lay.hudOrg=auto` `typ.display.family=same` `vis.corner=sharp`
  - B：`lay.hudOrg=edgeBar` `cnt.density=4` `cnt.elements=el.meter+el.clock+el.profile+el.resources+el.notify` `el.meter.form=stack` `cmp.gauge@el.meter=thinBar` `el.meter.screenAnchor=ml` `el.clock.form=calendar` `el.clock.screenAnchor=tc` `el.profile.form=avatarLevel` `el.profile.screenAnchor=tl` `el.resources.form=iconNumber` `el.resources.screenAnchor=tc` `el.notify.form=toast` `el.notify.screenAnchor=tr` `vis.corner=round` `col.strategy=polychrome` `typ.display.family=round` `el.interact.attachTo=none` `el.interact.form=[]` `rel.diegesis=screen` `rel.hudVisibility=auto`

  </details>

**样例内容**：公路夜车（独白与选择）（`visualNovel#night-drive`）、侦探与内心声音（对话 RPG）（`visualNovel#detective-voices`）、校园日常与关系（日程养成叙事）（`visualNovel#campus-days`）、中世纪手抄本（同一媒介叙事）（`visualNovel#manuscript`）、家常小品（零 HUD 交互叙事）（`visualNovel#home-vignette`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（7 项）</summary>

- 缺「逐说话人样式」：Pentiment 用字体区分身份与阶层，typ 只能全局或按组件覆盖；建议说话人样式表（字体 / 颜色 / 名牌）或 typ.body.family@speaker 作用域
- 缺限时选项：Heavy Rain、Detroit、OXENFREE 的选项带倒计时或会自动消失；ix.continueCue = countdown 只用于「继续」，建议 el.choices.timer（无 / 进度条 / 选项逐渐淡出）
- 缺选择后果 / 关系变化的专门提示形态（一行小字、关系 ↑↓、角落淡出）：现用 el.notify = toast 近似；建议 el.notify.form 增加 consequence
- 对话回看（backlog）只作为 ix.skip = vnControls 的一部分存在，缺回看页本身的版式（Disco 的右栏天然就是历史，VN 是单独的日志页）
- 缺分支流程图界面：章节结束时的分支树（已走 / 未走 / 锁定）可用 cnt.dataShape = network + lay.arrangement = tree 近似，但缺三态组合的预设
- el.subtitle 没有自己的画法参数：说话人标注方式（名字 / 颜色 / 方向箭头）、字幕底板、字号档——字幕可读性是叙事与探索类最常见的无障碍诉求
- 缺两个叙事常见皮肤：中世纪手抄本 / 泥金装饰（首字下沉、页边插画、手抄体）与「油画 + 报刊排版」（Disco 式油画肖像格、大号衬线数字、细线分栏）；现在只能用羊皮纸任务书、暗色细线近似

</details>

**最相关的原则**（按针对性排序）：[P-dialogue-presentation](#p-dialogue-presentation)、[P-choice-framing](#p-choice-framing)、[P-subtitles-captions](#p-subtitles-captions)、[P-typography-legible-format](#p-typography-legible-format)、[P-type-two-tier](#p-type-two-tier)、[P-harmony-four-relations](#p-harmony-four-relations)、[P-hudless-tax](#p-hudless-tax)、[P-device-bridge](#p-device-bridge)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-save-continuity](#p-save-continuity)、[P-confirm-by-input](#p-confirm-by-input)、[P-medium-simulation](#p-medium-simulation)、[P-title-lettering](#p-title-lettering)、[P-prompt-in-context](#p-prompt-in-context) 等 27 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.8 策略与战术

参考卡 59 张 · 探索台内容包：tactics（机兵防线）、rts（赤沙战线）、towerDefense（渔港保卫战）

策略的第一信息不是「我还剩多少血」，而是「对方下一步做什么、我这一步有多确定」：意图箭头、预警格、出手顺序、命中率都挂在世界里，屏幕层只放汇总。皮肤可以换成像素、宣纸、塔罗雕花、霓虹，但意图格、阵营色、结束回合、资源增量的层级不应随皮肤漂移。

**子类**：回合战术 / 战棋（格子 + 单位：Into the Breach、XCOM 2、Battle for Wesnoth、The Banner Saga、手游战棋 英杰传）；Roguelike 战术（骰子 / 牌 / 棋盘当行动：Slice & Dice、Shogun Showdown、Shotgun King、Cobalt Core、Yi Xian）；4X / 回合大战略（Civilization VI、The Battle of Polytopia、Songs of Conquest）；实时可暂停大战略（Stellaris）；RTS / 即时战术（Total War: WARHAMMER II 战场、Tooth and Tail、Rusted Warfare、Bad North）；塔防（Kingdom Rush 三作、Bloons TD 5 / 6、Infinitode 2、Defender's Quest、Wall World、The Perfect Tower II、Orcs Must Die!）；自动战斗 / 自走棋（样本薄：Legend Creatures、手游自动战斗 奇缘之旅 / 铸仙之境）；叙事 / 拼图式策略（Wildermyth、Inkulinati、Dorfromantik、Sol Cesto）；手游 SLG / 战棋的战斗 HUD（英杰传、Epic Age、霸业；只看战斗界面，不看运营）

**证据说明**：genre = strategy 共 59 张卡。6 张只有运营 / 首充截图（快来当领主、守卫都市等），按用户要求不研究；6 张只有开场 / 登录（明日方舟、重返帝国等），只用于选阵营与读取页；5 张是误标的潜行 / 动作（MGS2、Party Hard、Intravenous、The WereCleaner、UnMetal），只当风格旁证。规律主要来自其余约 42 张 Steam / IIG 卡，另看了 4 张手游战斗 HUD（英杰传、死亡突围、奇缘之旅、铸仙之境）。看图：strategy 批对照图 sheet-01..17 里全部策略 / 工厂款（约 45 款）+ 20 张单图放大（Into the Breach、XCOM 2、Civ VI、Total War、Stellaris、Wesnoth、Polytopia、Shogun Showdown、Songs of Conquest、Slice & Dice、Banner Saga、Kingdom Rush、Bloons TD 6、Tooth and Tail、Infinitode 2、英杰传 等）。评测证据来自 ui-review-stats.json（只用计数，不引原文）。

**关键发现**

- 意图优先：策略 HUD 的第一信息不是“我还剩多少血”，而是“对方下一步做什么 + 我这一步有多确定”。意图箭头、预警格、出手顺序、命中率都挂在世界里（空间内），屏幕层只放汇总。
- 四角分散是最常见的版式（标了 HUD 组织的 24 张里 11 张），贴边侧栏（8 张）在经典战棋、塔防商店、复古 RTS 里依然强势；整合底座只在大规模 RTS（Total War）出现；4 张把 HUD 画在玩法区外的边框里。
- 结束回合 / 下一波几乎都在右下，并且是全屏最大的单个按钮（Polytopia、Civ VI、Songs of Conquest、Cobalt Core、英杰传）；Into the Breach 把它和撤销 / 重置放在左上组成“回合控制区”，是有意识的反例。
- 信息密度两极并存：0（Bad North、Dorfromantik）与 4（Stellaris、Total War）。密度由每回合的决策数量决定，不由画风决定。
- 深色面板压倒性（标了明度的 21 张里 17 张）：地图本身彩色，面板要退后；浅色只出现在极简（Bad North）或剧情 VN 段（Sunrider）。
- 地图画风是这个品类的第二层皮肤：羊皮纸古地图 5、手绘水彩 4、战术线框 / 全息 2——历史 / 奇幻用纸，科幻用线框。
- 阵营色是第一层级，但优秀样本都有形状冗余：Total War 的军旗、Tooth and Tail 单位头顶的阵营圆章、Civ VI 的国境线。
- 塔防是品类内外观最“商业”的一支（糖果 / 拟物木牌），且版式近乎公式：左上生命 + 金币 + 波次、右侧商店或点地建造、右下播放 / 快进。
- 风格可以完全换（像素、新艺术、宣纸、塔罗雕花、霓虹），但“意图格、阵营色、结束回合、资源增量”的层级不应随皮肤漂移——这是探索台在这个品类里该锁住的东西。

**一眼要知道什么**

1. 敌人下一步打哪、打多少、谁先出手？（Into the Breach 把攻击格和出手顺序编号画在地图上；Shogun Showdown 在敌人头顶给方向 + 回合倒计时；Slice & Dice 在敌人行旁给意图格）
2. 我这一步的结果有多确定：命中率 / 暴击率 / 伤害区间，以及由哪些修正项构成（XCOM 2 的开火确认条把瞄准、距离、侧翼加成逐项列出）
3. 我选中的是谁、它还能做什么：剩余移动范围（格子高亮）、可用技能与冷却、行动点、是否已行动
4. 谁是我的、谁是敌人、谁中立？远景也要分得清（Total War 战场上的白 / 红军旗、Civ VI 的国境线色、单位头顶的阵营圆章）
5. 资源够不够、每回合 +多少、还差多少才能造下一个（4X 顶栏存量 + 每回合增量；塔防左上金币 + 商店里每座塔的价格）
6. 进度与时限：第几回合 / 第几波 / 还剩几回合胜利、下一波何时来、来的是什么（Polytopia 顶部回合数、Bloons TD 6 的 31/40、Into the Breach“3 回合后胜利”、Shogun Showdown 顶部波次轨道）
7. 全局态势：哪里出事了、领土与迷雾怎样（小地图、消息流、国境与未探索区）
8. 现在还有什么待我决定：研究没选、单位没动、事件没处理（Civ VI 右下主按钮会先变成“选择研究”）
9. （塔防）这座塔能打到哪、放在这里花多少、升级后强多少
10. （实时 / 可暂停）现在是暂停还是在跑、倍速多少

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 四角分散：资源在上、小地图左下、选中信息左下 / 右下、结束回合右下（4X、回合战术、塔防主流） | 11 / 24 张标了 HUD 组织的卡（strategy 主样本） | Sid Meier’s Civilization® VI（steam:289070）、Songs of Conquest（steam:867210）、Into the Breach（steam:590380）、Kingdom Rush  - Tower Defense（steam:246420） 等 8 款 | HUD 组织方式 = 分散组件；资源 / 货币 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 左下；选中信息面板 · 屏幕锚点 = 左下；主行动按钮 · 屏幕锚点 = 右下 |
| 贴边整条：一条侧栏（多在右侧）收纳小地图 + 选中单位 + 建造 / 塔商店，玩法区是干净的矩形（经典战棋、复古 RTS、塔防商店、大战略抽屉） | 8 / 24（另：全部策略卡里建造栏 / 商店贴右 5 张、贴左 3 张） | Battle for Wesnoth（steam:599390）、Bloons TD 6（steam:960090）、Rusted Warfare - RTS（steam:647960）、Stellaris（steam:281990） 等 7 款 | HUD 组织方式 = 贴边整条；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 右中；选中信息面板：画法 = 信息面板；选中信息面板 · 屏幕锚点 = 右中；小地图 / 罗盘 · 屏幕锚点 = 右上 |
| 整合底座：底部整条单位卡 + 两端圆形徽章 + 右上小地图（大规模 RTS） | 1 / 24（Total War；建造批的 Evil Genius、模拟人生也是底座） | Total War: WARHAMMER II（steam:594570） | HUD 组织方式 = 整合底座；队伍 / 玩家条：画法 = 单位卡条；队伍 / 玩家条 · 内部排布 = 横排；队伍 / 玩家条 · 屏幕锚点 = 下中；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右上；外框材质 = 石；装饰预算 = 华丽；外框结构 = 平框九宫格 |
| 画在玩法区外的边框里：棋盘 / 关卡是一扇窗，两侧装饰立柱或木框承载全部 HUD | 4 / 24（Sol Cesto 塔罗立柱、Shotgun King 两侧竖排牌、Bloons TD 5 木框、ShapeHero Factory 四周木框） | Sol Cesto（steam:2738490）、Shotgun King: The Final Checkmate（steam:1972440）、Bloons TD 5（steam:306020）、ShapeHero Factory（steam:2389040） | HUD 组织方式 = 画在玩法区外的边框里；玩法区形态 = 棋盘 / 关卡窗；外框结构 = 雕花九宫格；装饰预算 = 华丽 |
| 世界即 UI / 几乎无 HUD：只留分数或待放物件，其余信息靠场景（决策空间小的策略） | 标了密度的 25 张里 6 张为“极简”，真正的策略是 Bad North、Dorfromantik（另 4 张是误标的潜行 / 开场）；建造批的 Thronefall、Kingdom 系同理 | Bad North（steam:688420）、Dorfromantik（steam:1455840）、Orcs Must Die!（steam:102600） | 信息密度 = 极简；HUD 显隐策略 = 情境显现；容器 = 直接叠加；装饰预算 = 无 |
| 左右对阵两列：我方一列、敌方一列，中间是交互区（Roguelike 战术 / 叙事战术） | 约 4 张（Slice & Dice 两列、Inkulinati 顶部双方头像排、Cobalt Core 与 Wildermyth 左侧英雄竖列） | Slice & Dice（steam:1775490）、Inkulinati（steam:957960）、Cobalt Core（steam:2179850）、Wildermyth（steam:763890） | 分区方式 = 左右分栏；主体位置 = 两侧（对话双人 / 对阵）；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 内部排布 = 竖列；队伍 / 玩家条 · 屏幕锚点 = 左中；敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字 |
| 底部托盘 / 手牌：行动来自一组牌、骰子或地块，放在底部中间的托盘里 | 手牌 4 张（Shogun Showdown 木托盘、Cobalt Core、Yi Xian、Dorfromantik 右下地块堆） | Shogun Showdown（steam:2084000）、Cobalt Core（steam:2179850）、Yi Xian: The Cultivation Card Game（steam:1948800）、Dorfromantik（steam:1455840） | 技能 / 冷却 / 弹药 / 手牌：画法 = 手牌；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；主行动按钮 · 屏幕锚点 = 右下；时间模型 = 回合制 |
| 叙事容器：整局摊在书 / 纸 / 电脑上，UI 是容器里的物件 | 3 张（Inkulinati 桌上的古书、Wildermyth 羊皮纸漫画页、Progressbar95 整台旧电脑） | Inkulinati（steam:957960）、Wildermyth（steam:763890）、Progressbar95（steam:1304550） | 默认放置方式 = 叙事内；场景容器 = 书；容器放在哪 = 桌面 / 地面 |
| 竖屏上下分区（手游）：上半战场、下半阵容与操作，倍速 / 跳过竖排在一侧 | 2 张手游战斗 HUD | 小小英雄-优化版（4399）（gameui:12994）、铸仙之境（测试）（gameui:7082） | 画幅朝向 = 竖屏；分区方式 = 上下分栏；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 下中；倍速 / 暂停 / 自动 · 屏幕锚点 = 右中 |

**关键元素与画法**

- **敌人血条 / 预警 / 意图**（`el.threat`）：intent / telegraph / hitChance / healthBar / visionCone；常见位置 attachTo=target。策略区别于动作的关键元素：把敌人的下一步画出来。卡片编码意图 3 张（Into the Breach 红箭头 + 斜线预警格；Shogun Showdown 头顶方向 + 倒计时；Slice & Dice 敌人行旁的意图格），命中率 1 张（XCOM 2 敌人头顶百分比）；塔防只用敌人头顶小血条（Kingdom Rush）。意图是空间内 UI，挂在目标上，用警示色并与阵营色分开。
- **信息叠层 / 图例**（`el.overlay`）：gridHighlight / arrows / rangeRing / statusIcons；常见位置 diegesis=spatial、worldRender=decal。移动 / 攻击范围的格子高亮是回合战术的底层语言：The Banner Saga 用蓝（可移动）+ 黄（加码可多走）两档，英杰传用蓝移动 + 红攻击；Total War 战役图用发光行军路线；塔防用射程圈；Civ VI 在每格上叠产出图标。叠层要用独立色板，不和地形撞色。
- **选中信息面板**（`el.selection`）：card / panel / tooltip；常见位置 bl、mr、br。选中单位卡是“决策输入面板”：Into the Breach 左下头像 + 武器格 + 情境按键提示；XCOM 2 左下名牌 + 底部中间开火确认条；Wesnoth 右侧栏的单位属性；Tooth and Tail 右下单位卡（造价 + 时间，角色插画出框压面板）；英杰传左下半身像 + 攻防数值；Infinitode 2 右侧常驻详情（属性 + 升级 + 出售）。地形说明用临时 tooltip（Into the Breach 右下“水格”）。
- **主行动按钮**（`el.cta`）：round / wide；常见位置 br、tl。结束回合 / 下一波是每回合必按的按钮：右下大圆钮最常见（Polytopia 勾号圆钮、Civ VI、Songs of Conquest、Cobalt Core、英杰传“待机”在拇指区）；塔防的“下一波”同位（Infinitode 2 右下大箭头、Bloons 右下播放）。Into the Breach 把它放左上，与撤销移动、重置回合组成回合控制区。Civ VI 的主按钮会先变成待处理事项，全部处理完才是下一回合。
- **计时 / 分数 / 回合**（`el.timer`）：number / turnBanner / badge / gauge；常见位置 tc、tr。回合 / 波次 / 胜利倒计时：Polytopia 顶部中间“分数 / 星 / 回合”三个大数字；Into the Breach 右上“3 回合后胜利”；Bloons TD 6 右上 31/40；Kingdom Rush 左上波次木牌；Shogun Showdown 顶部“WAVE 3/5”+ 骷髅点轨道直到 Boss；XCOM 2 右上六边形回合倒计时；Songs of Conquest 右下“第 4 轮”。
- **资源 / 货币**（`el.resources`）：iconNumber / gauge / bigNumber；常见位置 tl、tc、tr、bl。4X / 大战略：顶部一整行图标 + 数字，并给每回合增量（Civ VI、Stellaris、Songs of Conquest 右上）；塔防：左上生命 + 金币（左上锚点 4 张：Kingdom Rush 三作 + Bloons TD 6）；RTS：Tooth and Tail 左下大号“粮食”数字；Roguelike 战术把能量做成数值图形（Cobalt Core 左下圆、Slice & Dice 法力格）。
- **队伍 / 玩家条**（`el.party`）：frames / portraits / unitCards / portraitRow；常见位置 ml、bc、tr、mr。头像框是队伍最常见的画法（7 张）；战术小队多竖排在左侧（Into the Breach、Wildermyth、Cobalt Core、Slice & Dice）；RTS 底部整条单位卡（Total War）；自动战斗底部肖像行（Legend Creatures）；4X 用右上一排对手领袖头像做外交入口（Civ VI），Songs of Conquest 右缘竖排英雄 / 城镇。
- **行动顺序**（`el.turnOrder`）：portraitQueue / icons；常见位置 bl、bc、attachTo=target。行动顺序让玩家规划“谁先动”：The Banner Saga 左下当前单位大头像 + 后续小头像队列；Into the Breach 直接把敌人出手顺序编号画在格子上（挂在目标上的小图标队列）；铸仙之境底部头像行动条。卡片里没有单独编码，属于看图补充。
- **小地图 / 罗盘**（`el.minimap`）：plan；常见位置 bl、tr。4X / RTS 必备，回合战术、塔防、Roguelike 战术通常整张地图一屏可见、不需要。左下（Civ VI 带透镜按钮、Songs of Conquest、Tooth and Tail 的菱形小地图跟等距视角一致）与右上（Wesnoth 侧栏顶部、Total War）各半。
- **建造栏 / 系统入口条**（`el.toolbar`）：buttonRow / microMenu / categoryTabs；常见位置 mr、ml、bc、br。塔防商店贴右（Bloons TD 6 / 5 双列塔格 + 价格；Rusted Warfare 的 RTS 建造栏也贴右窄条）、贴左（Infinitode 2 塔类型色块列、Defender's Quest 左侧来波列表）；Polytopia 右下四个大圆钮（设置 / 统计 / 科技 / 结束）；Tooth and Tail 底部中间一排出兵圆钮；Stellaris 左缘图标竖列。
- **目标 / 路点**（`el.objective`）：checklist / text；常见位置 tr、tl、ml。关卡目标与附加目标：Into the Breach 右上附加目标（星）；Tooth and Tail 左上目标带倒计时（[3:36] 保护商人）；Songs of Conquest 左侧“消灭所有敌人 0/3”。策略目标多带计数或时限，要能一眼看出完成度。
- **世界 / 社会态势条**（`el.meter`）：single / paired / stack；常见位置 tl、tc、bl。全局态势条：Into the Breach 左上电网（分段格，城市共享血量 + 电网防御百分比）；Total War 顶部中间双方力量对比；Wall World 左下多根竖条资源计。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots / cards；常见位置 bc、bl、br。技能格 5 张、手牌 4 张：Kingdom Rush 左下英雄头像 + 两个技能圆钮；XCOM 2 底部技能图标排；Shogun Showdown 底部木托盘里的技能牌；Cobalt Core 底部卡牌行；Dorfromantik 右下待放地块堆 + 剩余数。
- **生命 / 护盾 / 体力**（`el.vitals`）：segmented / icons / number；常见位置 attachTo=target、tl。单位血量多做成挂在单位身上的小分段格（Into the Breach 机甲头顶绿格、Shogun Showdown 格子下的血点、Slice & Dice 名字下的心形点、Inkulinati 单位脚下的纸条名牌）；塔防的“基地生命”是左上图标 + 数字（Bloons 心形 200、Kingdom Rush 20）。
- **倍速 / 暂停 / 自动**（`el.gameSpeed`）：playFF / speedBar / x2 / autoBattle；常见位置 br、tl、bc、mr。塔防右下大绿播放 / 快进（Bloons TD 6）；Infinitode 2 左上暂停；Stellaris 右上日期与速度 + 底部中间“已暂停”标记；手游自动战斗把暂停 / 倍速放左上（奇缘之旅）或右侧竖排（铸仙之境）。
- **通知 / 大字提示**（`el.notify`）：banner / feed / band / cutIn；常见位置 tc、tl。Civ VI 奇观完成顶部横幅；Tooth and Tail 左上消息流；Wandering Sword 招式名巨型竖排书法压画面；UnMetal Boss 前 VS 立绘切入；小小英雄“首领登场”横贯大字。策略的通知以“态势变化”为主，频率高，宜用不阻断的横幅 / 消息流。
- **价格 / 消耗**（`el.cost`）：inButton / iconNumber / haveNeed；常见位置 mr、br。塔防商店里每座塔下方直接写价格（Bloons TD 6），买不起时变灰；Tooth and Tail 单位卡写造价 + 生产时间；4X 的生产 / 研究消耗要给“还差多少回合”。
- **时间 / 天气 / 日历**（`el.clock`）：sunDial / dayCounter；常见位置 mr、tr。时间影响战斗时才需要：Wesnoth 侧栏里画了当前昼夜的小插画（昼夜改变阵营强弱）；Shogun Showdown 右上小字记录天数 / 时长 / 回合 / 连击。
- **命中反馈 / 连击**（`el.feedback`）：floatNumbers / comicSFX / combo；常见位置 attachTo=target。策略的命中反馈优先级低于动作游戏，但塔防用它做爽感：Kingdom Rush 的拟声字（BOOM、POW）是风格的一部分；Shogun Showdown 的“COMBO!”。注意它不能盖住意图与血量。
- **对话 / 事件选项**（`el.choices`）：buttons / text；常见位置 bc、center。策略里的对话多是“事件抉择”：Wildermyth 漫画分格下方一排选项按钮；Defender's Quest 立绘 + 气泡；选项要写清后果（资源 ±、士气 ±、回合数）。
- **按键 / 操作提示**（`el.prompt`）：hotkeyBadge / contextual / list；常见位置 attachTo=cursor、tc。RTS / 4X 的建造与指令用图标角标热键；Into the Breach 在选中卡旁给情境按键（右键 / Q 解除）；Your Only Move Is HUSTLE 顶部平铺整排键位说明——像调试面板，评测里有 3 条说不知道该怎么玩。

**子类画像**

- **回合战术 / 战棋**：时间模型 = 回合制；HUD 组织方式 = 分散组件；敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字 + 地面预警区；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；信息叠层 / 图例：画法 = 格子高亮 + 方向箭头；信息叠层 / 图例 · 放置方式（逐元素） = 空间内；信息叠层 / 图例 · 世界渲染（逐元素） = 地面贴花；选中信息面板：画法 = 单位卡；选中信息面板 · 屏幕锚点 = 左下；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 内部排布 = 竖列；队伍 / 玩家条 · 屏幕锚点 = 左中；主行动按钮：画法 = 宽按钮；主行动按钮 · 屏幕锚点 = 左上；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 右上；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 右上；生命 / 护盾 / 体力 · 放置方式（逐元素） = 空间内；生命 / 护盾 / 体力 · 世界挂点 = 目标 / 敌人；数值图形（生命 / 护盾 / 体力） = 分段格；行动顺序：画法 = 小图标队列；行动顺序 · 世界挂点 = 目标 / 敌人。Into the Breach 式；把 el.cta 改为 br + round 即 XCOM / 战棋手游式。
- **Roguelike 战术（骰 / 牌 / 棋盘）**：时间模型 = 回合制；分区方式 = 左右分栏；主体位置 = 两侧（对话双人 / 对阵）；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 内部排布 = 竖列；队伍 / 玩家条 · 屏幕锚点 = 左中；敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；技能 / 冷却 / 弹药 / 手牌：画法 = 手牌；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；资源 / 货币：画法 = 以数值图形呈现；数值图形（资源 / 货币） = 分段格；主行动按钮：画法 = 宽按钮；主行动按钮 · 屏幕锚点 = 右下；格子结构 = 方格；UI 像素化 = 2 倍像素；描边线型 = 实线；面板明度 = 深色面板。Slice & Dice / Cobalt Core 式；Shogun Showdown 把双方放在一条横线上，可改 lay.composition = single。
- **4X / 回合大战略**：时间模型 = 回合制；HUD 组织方式 = 分散组件；语义缩放 = 拉远图标化；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 内部排布 = 横排；资源 / 货币 · 屏幕锚点 = 左上；资源 / 货币 · 数值标注 = 变化量；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 左下；主行动按钮：画法 = 大圆钮；主行动按钮 · 屏幕锚点 = 右下；队伍 / 玩家条：画法 = 肖像行；队伍 / 玩家条 · 屏幕锚点 = 右上；通知 / 大字提示：画法 = 横幅；通知 / 大字提示 · 屏幕锚点 = 上中；信息叠层 / 图例：画法 = 状态图标；选中信息面板：画法 = 信息面板；选中信息面板 · 屏幕锚点 = 左下；地图画风 = 羊皮纸古海图；地图未探索区 = 留白（纸面空白）；语义颜色编码 = 阵营色。Civ VI 式；Polytopia 版去掉小地图与资源行，只留顶部三个数字 + 右下四个圆钮。
- **实时可暂停大战略**：时间模型 = 实时可暂停 / 变速；HUD 组织方式 = 贴边整条；容器 = 侧抽屉；面板插画槽 = 头图横幅；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 内部排布 = 横排；资源 / 货币 · 屏幕锚点 = 上中；资源 / 货币 · 数值标注 = 变化量；倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条；倍速 / 暂停 / 自动 · 屏幕锚点 = 右上；建造栏 / 系统入口条：画法 = 系统入口小图标；建造栏 / 系统入口条 · 屏幕锚点 = 左中；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 右中；地图画风 = 战术线框 / 全息；语义缩放 = 拉远图标化；信息密度 = 极密；面板明度 = 深色面板。Stellaris 式；注意它也是“信息过量”的反面证据。
- **RTS / 即时战术**：时间模型 = 实时；HUD 组织方式 = 整合底座；队伍 / 玩家条：画法 = 单位卡条；队伍 / 玩家条 · 内部排布 = 横排；队伍 / 玩家条 · 屏幕锚点 = 下中；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右上；世界 / 社会态势条：画法 = 两项对立；数值图形（世界 / 社会态势条） = 双向对立条；世界 / 社会态势条 · 屏幕锚点 = 上中；世界内标注渲染（默认） = 平面公告板；语义缩放 = 拉远图标化；按键 / 操作提示：画法 = 图标角标热键；通知 / 大字提示：画法 = 滚动消息列；通知 / 大字提示 · 屏幕锚点 = 左上；语义颜色编码 = 阵营色。Total War 式；复古 RTS 改 lay.hudOrg = edgeBar + el.toolbar 贴右（Rusted Warfare）。
- **塔防**：时间模型 = 实时可暂停 / 变速；HUD 组织方式 = 贴边整条；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 内部排布 = 规则网格；建造栏 / 系统入口条 · 屏幕锚点 = 右中；价格 / 消耗：画法 = 按钮内嵌价 / 消耗；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左上；数值图形（生命 / 护盾 / 体力） = 纯数字；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 数值标注 = 当前 / 上限；计时 / 分数 / 回合 · 屏幕锚点 = 右上；倍速 / 暂停 / 自动：画法 = ▶ / ▶▶；倍速 / 暂停 / 自动 · 屏幕锚点 = 右下；信息叠层 / 图例：画法 = 范围圈 / 路线线；敌人血条 / 预警 / 意图：画法 = 敌人血条；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；命中反馈 / 连击：画法 = 飘字。Bloons TD 6 式；Kingdom Rush 版改 lay.hudOrg = scattered、技能放左下；Infinitode 版加 lay.detail = persistent 右侧详情。
- **自动战斗 / 自走棋（样本薄）**：时间模型 = 回合制；队伍 / 玩家条：画法 = 肖像行；队伍 / 玩家条 · 屏幕锚点 = 下中；计时 / 分数 / 回合：画法 = 回合徽章；计时 / 分数 / 回合 · 屏幕锚点 = 上中；倍速 / 暂停 / 自动：画法 = 倍速按钮；倍速 / 暂停 / 自动 · 屏幕锚点 = 左上；世界 / 社会态势条：画法 = 多项堆叠；数值图形（世界 / 社会态势条） = 分段格；世界 / 社会态势条 · 屏幕锚点 = 左中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左下；信息叠层 / 图例：画法 = 格子高亮。只有 Legend Creatures 与两款手游自动战斗作证据；羁绊列表、备战席的形态需要下一批补（见 paramGaps）。

**重要界面**

- **局内 HUD**：见 hudOrganization：四角分散 / 贴边侧栏 / 整合底座 / 边框内 / 世界即 UI 五种。固定组合：资源在上沿、小地图在一角、选中卡在左下、结束回合右下；意图、范围、血量挂在世界里。深色面板 17 / 21。 例：Into the Breach（steam:590380）、Sid Meier’s Civilization® VI（steam:289070）、Battle for Wesnoth（steam:599390）、Total War: WARHAMMER II（steam:594570） 等 5 款。
- **地图 / 世界地图**：战役 / 世界 / 关卡地图：羊皮纸古地图（Civ VI 未探索区是纸面留白、Total War 彩绘古地图 + 发光行军路线、Shogun Showdown 卷边羊皮纸）与手绘水彩（Kingdom Rush 系关卡旗帜、Defender's Quest 节点带星级）为主；科幻用战术线框 / 全息（Stellaris 星系图 + 势力色块、XCOM 2 红色全息地球）；Roguelike 用节点路线（ShapeHero Factory 羊皮纸虚线节点、Sol Cesto 星座散点）；休闲塔防用漂浮微缩岛（Bloons TD 5）。 例：Sid Meier’s Civilization® VI（steam:289070）、Total War: WARHAMMER II（steam:594570）、Shogun Showdown（steam:2084000）、Kingdom Rush  - Tower Defense（steam:246420） 等 10 款。
- **技能树 / 成长**：科技 / 研究树：树状连线为主，连线样式决定气质——电路走线（Infinitode 2）、放射圆环（Polytopia 绿色圆形节点放射排布，附一句科技成本说明）、横向长卷（Civ VI 科技 / 市政树，IIG）；国风用圆形散点（Wandering Sword 经脉 / 武学图）。 例：Infinitode 2 - Infinite Tower Defense（steam:937310）、The Battle of Polytopia（steam:874390）、Sid Meier’s Civilization® VI（steam:289070）、Wandering Sword（steam:1876890）。
- **匹配 / 组队 / 备战**：战前部署 / 编队 / 对阵：Into the Breach 选小队（左机甲立绘 + 右列表 + 随机按钮）；Songs of Conquest 战前对阵（暗红羊皮纸 + 双方纹章 + 六角布阵 + 自动 / 手动战斗两个按钮）；UnMetal Boss 前 VS 大字立绘。 例：Into the Breach（steam:590380）、Songs of Conquest（steam:867210）、UnMetal（steam:1203710）。
- **结算 / 胜负 / 奖励**：战后结算：数据表 + 星级 / 评分为主；The WereCleaner 把报告纸钉在软木板上（叙事内）；Songs of Conquest 战报面板；手游对战结算用领奖台 + 排名行（爆裂小队，只看结算版式）。 例：Songs of Conquest（steam:867210）、The WereCleaner（steam:2795000）、爆裂小队SquadBusters（gameui:13024）。
- **对话 / 文本**：事件与剧情：漫画分格 + 选项（Wildermyth）、全身立绘 + 白气泡（Defender's Quest）、VN 无框字幕 + 自动 / 跳过（Sunrider、少女前线：云图计划）。策略对话的重点是选项后果，不是演出。 例：Wildermyth（steam:763890）、Defender's Quest: Valley of the Forgotten (DX edition)（steam:218410）、Sunrider: Mask of Arcadius（steam:313730）、少女前线：云图计划（散爆网络）（gameui:3033）。
- **角色 / 装备 / 属性**：英雄 / 单位详情：The Banner Saga 用彩色长缎带条同时表示上限与当前；Kingdom Rush Vengeance 塔装备页是深色石框 + 大立绘卡；XCOM 2 士兵属性（IIG）；Wandering Sword 宣纸属性页。 例：The Banner Saga（steam:237990）、Kingdom Rush Vengeance - Tower Defense（steam:1367550）、Wandering Sword（steam:1876890）、XCOM® 2（steam:268500 · 据已知描述）。
- **图鉴 / 收集 / 成就**：兵种 / 卡牌百科：Tooth and Tail 整幅插画 + 黑底文字面板（ENCYCLOPEDIA 大字）；Yi Xian 宣纸底卡牌图鉴网格。 例：Tooth and Tail（steam:286000）、Yi Xian: The Cultivation Card Game（steam:1948800）。
- **登录 / 选服 / 创角**：选阵营 / 领袖 / 部族：Civ VI 左侧深蓝列表 + 右侧 3D 领袖立像；Polytopia 粉色天空上一格格圆形部族头像；无限王国左侧羊皮纸说明 + 纹章、右侧大幅场景插画。 例：Sid Meier’s Civilization® VI（steam:289070）、The Battle of Polytopia（steam:874390）、无限王国-Infinity Kingdom（gameui:2630）。
- **手牌 / 牌桌**：Roguelike 战术的构筑 / 三选一：Cobalt Core“PICK A CARD”大字 + 三张卡 + 跳过；Yi Xian 三选一圆章卡（选择仙命）；Shotgun King 两侧竖排双方增益牌。 例：Cobalt Core（steam:2179850）、Yi Xian: The Cultivation Card Game（steam:1948800）、Shotgun King: The Final Checkmate（steam:1972440）。
- **背包 / 物品**：策略里的道具页多是大网格（Legend Creatures 灰色石框里的道具方格），弱于 RPG；UnMetal 是带页签的物品 / 被动 / 武器三区。 例：Legend Creatures(传奇生物)（steam:1191840）、UnMetal（steam:1203710）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 模拟 / 策略工具面板（`fam.sim-panel`）（7 张）：大战略与战棋：地图 + 侧栏 + 嵌套提示。
- 暗金金属牌（`fam.dark-gold`）（5 张）：纹章珐琅板与整合底座：Civ VI、Songs of Conquest、Total War。
- 羊皮纸任务书（`fam.parchment`）（5 张）：事件抉择、路线地图、阵营纹章，策略游戏最需要「文书」感（Inkulinati、Wildermyth、ShapeHero Factory、无限王国、哈利波特魔法觉醒）。
- 军事战术（`fam.military`）（4 张）：XCOM 2（战术指挥）、UnMetal 与 MGS2（实为潜行动作，原卡品类误标）。
- 像素位图（`fam.pixel`）（4 张）：roguelite 战术 / 棋盘（Into the Breach、Shotgun King）、复古 RTS（Rusted Warfare）、塔防（Wall World）、潜行（Party Hard）：像素降低美术成本，UI 跟着走同一网格。
- 拟物（`fam.skeuo`）（3 张）：Kingdom Rush 三部：塔防的木牌资源、圆钮技能、物件菜单。
- 糖果卡通（Q 版）（`fam.candy`）（3 张）：单位与道具多，彩色底方格 + 3D 渲染图标比文字更快识别（Bloons TD 6 右侧塔商店）。
- 二次元白卡细线（`fam.anime-card`）（3 张）：塔防 / 战术 / VN 策略（明日方舟、少女前线：云图计划、Sunrider）。

**代表作**

- Into the Breach（steam:590380）〔像素位图〕：Into the Breach：清晰度的标杆——敌人攻击格 + 出手顺序编号画在地图上，左上“结束回合 / 撤销 / 重置 / 电网”是回合控制区，右上胜利倒计时 + 附加目标，左下选中机甲卡 + 情境按键，右下地形说明。去重后提到 UI 的 27 条里 21 条好评，没有一类抱怨达到 2 条。开发者公开说过宁可为清晰牺牲酷点子（06 文档 A12）。
- XCOM® 2（steam:268500 · 据已知描述）〔军事战术〕：XCOM 2：命中率挂在敌人身上，开火确认条把命中 / 暴击 / 伤害区间与每项修正逐条列出；底部技能排 + 斜线阴影；战略层是红色全息地球。
- Sid Meier’s Civilization® VI（steam:289070）〔暗金金属牌〕：Civ VI：4X 信息分层的范本——顶部资源行、右上对手领袖排、左下小地图 + 透镜、右下主按钮随待办变化；每格产出图标与城市横幅在世界里；未探索区是古地图纸面留白。去重后夸 UI 2 条，但也有菜单难用 2 条（见 pitfalls）。
- Total War: WARHAMMER II（steam:594570）〔暗金金属牌〕：Total War: WARHAMMER II：整合底座（底部整条单位卡 + 两端圆徽章）+ 战场上的白 / 红阵营军旗（拉远仍可读）+ 右上小地图；战役图彩绘古地图 + 发光行军路线。
- Battle for Wesnoth（steam:599390）〔模拟 / 策略工具面板〕：Battle for Wesnoth：经典贴边侧栏——小地图、昼夜插画、选中单位属性全在右侧暗色石纹栏，六角格地图是干净矩形；去重后提到 UI 的 8 条全是好评（样本小）。
- The Battle of Polytopia（steam:874390）〔扁平 / Material〕：The Battle of Polytopia：极简 4X——顶部三个大数字（分数 / 星 / 回合）+ 右下四个大圆钮，科技树是放射圆环；扁平低多边形与 UI 统一。
- Shogun Showdown（steam:2084000）〔像素木框〕：Shogun Showdown：意图 + 回合倒计时挂在敌人头顶，顶部波次骷髅轨道，底部木托盘放技能牌；一条横线就是整个战场。
- Slice & Dice（steam:1775490）〔像素位图〕：Slice & Dice：我方 / 敌方左右两列，每行一个角色 + 骰子格；点开是整张骰面展开图（所有可能结果一次看完）；底部重掷次数、撤销、结束回合。
- The Banner Saga（steam:237990）〔线描花饰〕：The Banner Saga：两档移动格（蓝 / 黄）、左下行动顺序头像队列、彩色缎带属性条与新艺术标题——风格化不牺牲战术信息。
- Kingdom Rush  - Tower Defense（steam:246420）〔拟物〕：Kingdom Rush：塔防标准答案——左上生命 / 金币 / 波次小木牌、左下英雄 + 技能圆钮、敌人小血条、拟声字反馈；世界地图是手绘地图 + 关卡旗帜。
- Infinitode 2 - Infinite Tower Defense（steam:937310）〔模拟 / 策略工具面板〕：Infinitode 2：塔防的“工具型”做法——左侧塔类型色块列、右侧常驻详情（属性表 + 升级条 + 出售价）、右下下一波大箭头；研究树是电路图。
- Sol Cesto（steam:2738490）〔重装饰雕花框〕：Sol Cesto：把 HUD 全部画进两侧塔罗雕花立柱，玩法区是一扇窗；装饰预算拉满但信息位置固定。
- Inkulinati（steam:957960）〔羊皮纸任务书〕：Inkulinati：整局在桌上的古书里，真实的手入画；双方单位头像排在页眉两侧，单位名牌与血量是纸条。叙事内容器的极端例子。
- Bad North（steam:688420）〔扁平几何 · 地图即界面〕：Bad North：局内几乎无 UI，选指挥官是极简白卡；去重后有 2 条夸 UI——决策空间小，极简才成立。
- Tooth and Tail（steam:286000）〔军事战术〕：Tooth and Tail：为手柄设计的 RTS——左上带倒计时的目标、左下菱形小地图 + 大号粮食数、底部出兵圆钮、右下单位卡（立绘出框）；单位头顶阵营圆章带数量。
- Stellaris（steam:281990）〔模拟 / 策略工具面板〕：Stellaris：实时可暂停大战略的高密度做法——顶部资源条、左侧抽屉面板带头图、右侧大纲列表（星区 / 星港 / 舰队）、右上日期与速度、底部“已暂停”；星系图是发光线框 + 势力色块，势力徽记直接压在领土上。也是反面教材（见 pitfalls）。
- Bloons TD 6（steam:960090）〔糖果卡通（Q 版）〕：Bloons TD 6：塔防右侧商店 + 左上生命金币 + 右上回合 + 右下播放快进的公式化版式；提到 UI 的 30 条评测里 29 条是好评。原来说它是「挡视野抱怨最多的一款」，复核后那些命中是在说满屏气球与爆炸（多为好评），已撤回。
- 英杰传（测试）（gameui:7158）〔糖果卡通（Q 版）〕：英杰传（手游战棋）：蓝色移动格 + 红色攻击格、左下选中单位面板、右下拇指区大圆键“待机”、右上回合 1/20——PC 战棋版式搬到触屏的直接答案。

**坑**

- 塔防后期特效与单位数量爆炸，加上贴边商店，把战场淹没——看不清敌人走到哪、塔打到哪 例：Bloons TD 6（steam:960090）。
  - 评价与证据（依据：截图）：看图：后期气球、塔与特效确实铺满战场。评测证据不足：Bloons TD 6 原来的「太乱 5 条」去重后 3 条，复核后都在说满屏气球 / 爆炸很爽或电脑卡顿，不是 HUD 抱怨；它提到 UI 的 30 条里 29 条是好评。这条反例是设计推论。
- 大规模 RTS 的底座 + 单位旗帜 + 特效叠加，挡住战场 例：Total War: WARHAMMER II（steam:594570）。
  - 评价与证据（依据：截图）：看图：Total War: WARHAMMER II 战役图上的军队徽章与城市名牌。评测证据不足：原来的「挡视野 2 条」去重后 1 条，复核后是「地图没有三代那么乱」的比较句。
- 大战略信息过量、面板叠面板、入口难找 例：Stellaris（steam:281990）、Sid Meier’s Civilization® VI（steam:289070）。
  - 评价与证据（依据：评测）：Stellaris：去重后提到 UI 的 47 条里 23 条差评，有 1 条明确说 UI 杂乱、对新手压力大，菜单难用 1 条；Civ VI：提到 UI 的 43 条里 14 条差评，菜单难用 2 条。R3 提醒：差评占比高也可能是对整款游戏不满时顺带提到界面。
- 规则说明缺位：零 / 极简 HUD 或调试面板式 UI 让新手不知道该看哪、该干什么 例：Your Only Move Is HUSTLE（steam:2212330）、Kingdom Two Crowns（steam:701160）、XCOM® 2（steam:268500 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 去重后：Your Only Move Is HUSTLE 引导不清 3 条（键位说明与预测开关平铺在屏上）；XCOM 2 2 条；建造批 Kingdom Two Crowns 7 条是零 HUD 的同一代价。对照：Bad North 也极简却有 2 条夸 UI——它的规则少。
- 纸本 / 插画风里用小号手写字或细衬线，正文看不清 例：Wildermyth（steam:763890）。
  - 评价与证据（依据：截图）：看图：Wildermyth 的羊皮纸漫画页。评测证据不足：原来的「字太小 2 条」复核后不是在说文字。
- 鼠标 / 触屏优先的塔防与回合策略移植到手柄，点地建造与菜单焦点不顺 例：Kingdom Rush Vengeance - Tower Defense（steam:1367550）。
  - 评价与证据（依据：评测）：Kingdom Rush Vengeance：去重后手柄 / 键位 1 条（证据很弱）。
- 回合策略的出牌 / 结算演出太长，拖慢回合节奏 例：Yi Xian: The Cultivation Card Game（steam:1948800）。
  - 评价与证据（依据：评测）：Yi Xian：去重后 UI 卡顿 / 响应慢 1 条（证据很弱）。
- 重装饰金框面板与高密度信息并存，界面评价两极 例：Songs of Conquest（steam:867210）。
  - 评价与证据（依据：评测）：Songs of Conquest：去重后提到 UI 的 17 条里 8 条差评，关键词粗筛只归出「菜单难用」1 条——原因未定，弱证据，留待逐条复核。
- 阵营色用红 / 绿、状态只靠颜色；迷雾把阵营色洗掉
  - 评价与证据（依据：截图）：无直接评测证据；来自 06 文档 A12 可读性规则（红绿色觉障碍约占男性 8–10%，阵营要有形状冗余）。看图正例：Total War 军旗形状、Tooth and Tail 阵营圆章。
- 意图 / 范围格与地形纹理“同频”，看不出哪格危险
  - 评价与证据（依据：截图）：无直接评测证据；06 文档 A12 测试片段“意图层”。看图正例：Into the Breach 用斜线红格 + 编号与地形区分，The Banner Saga 用蓝 / 黄两档纯色格压在雪地上。
- 按“结束回合”时不提醒还有未行动单位或未处理事项
  - 评价与证据（依据：截图）：无直接评测证据；看图正例：Civ VI 的主按钮先变成待处理事项（如“选择研究”），Into the Breach 把撤销 / 重置放在结束回合旁边。

**可演示的对比**

- **敌人意图：只给血条 vs 画出下一步**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图：画法：敌人血条 → 敌人血条 + 意图图标 + 数字 + 地面预警区
  - 配套改动：信息叠层 / 图例：画法：格子高亮 → 格子高亮 + 方向箭头；行动顺序 · 世界挂点：不挂（用屏幕锚点） → 目标 / 敌人；行动顺序：画法：自动 → 小图标队列
  - 看什么：1 秒内能不能说出“哪几格会挨打、谁先出手”；b 的预警格有没有盖住地形和己方单位（Into the Breach 用斜线红格 + 出手编号）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `ctx.timeModel=turn` `el.threat.attachTo=target` `cnt.screen=screen.hud`
  - A：`el.threat.form=healthBar` `el.overlay.form=gridHighlight` `el.turnOrder.attachTo=none` `el.turnOrder.form=auto`
  - B：`el.threat.form=healthBar+intent+telegraph` `el.overlay.form=gridHighlight+arrows` `el.turnOrder.form=icons` `el.turnOrder.attachTo=target`

  </details>
- **命中预测：一个大数字 vs 拆开修正项**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：详情呈现：无详情 → 常驻一侧；变化 / 前后对比：自动 → 绿色 + 增量；统计图形：战力大字 → 纯数字表
  - 看什么：玩家能否看出“为什么是 65%”，并知道怎么把它提高（XCOM 2 的开火确认条：左边命中修正、右边暴击修正）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `el.threat.form=hitChance` `cnt.screen=screen.hud`
  - A：`st.statViz=bigNumber` `lay.detail=none` `st.delta=auto`
  - B：`st.statViz=table` `lay.detail=persistent` `st.delta=plus`

  </details>
- **结束回合放哪：右下大圆钮 vs 左上回合控制区**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：主行动按钮 · 屏幕锚点：右下 → 左上
  - 配套改动：主行动按钮：画法：大圆钮 → 宽按钮；主行动按钮 · 大小 / 突出度：1.4 → 1；数值图形（世界 / 社会态势条）：自动 → 分段格；世界 / 社会态势条：画法：自动 → 单项；世界 / 社会态势条 · 屏幕锚点：自动 → 左上
  - 看什么：右下是 4X / 触屏的拇指区惯例（Polytopia、Civ VI、英杰传）；左上把“结束 / 撤销 / 电网”放成一组（Into the Breach），误触少、和全局状态同看，但离视线终点远。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.hud`
  - A：`el.cta.form=round` `el.cta.screenAnchor=br` `el.cta.scale=1.4` `cmp.gauge@el.meter=auto` `el.meter.form=auto` `el.meter.screenAnchor=auto`
  - B：`el.cta.form=wide` `el.cta.screenAnchor=tl` `el.meter.form=single` `cmp.gauge@el.meter=segmented` `el.meter.screenAnchor=tl` `el.cta.scale=1`

  </details>
- **4X 资源：只显示存量 vs 存量 + 每回合增量**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：资源 / 货币 · 数值标注：当前值 → 变化量
  - 看什么：能否一眼看出哪一项在亏（负增量标红 + 负号）；顶栏一行放 6–8 项时数字是否还能对齐（等宽数字）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `el.resources.form=iconNumber` `el.resources.arrangement=row` `el.resources.screenAnchor=tl` `cnt.screen=screen.hud` `col.coding=status`
  - A：`el.resources.valueLabel=current`
  - B：`el.resources.valueLabel=delta`

  </details>
- **HUD 组织：四角分散 vs 贴边侧栏**（整套做法对照（多个参数一起变）；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 平框九宫格；小地图 / 罗盘 · 屏幕锚点：左下 → 右上；资源 / 货币 · 屏幕锚点：左上 → 自动；选中信息面板 · 屏幕锚点：左下 → 右中
  - 配套改动：HUD 组织方式：分散组件 → 贴边整条；时间 / 天气 / 日历：画法：自动 → 太阳盘 / 日夜钟；时间 / 天气 / 日历 · 屏幕锚点：自动 → 右中
  - 看什么：地图可视面积（屏占比读数）与视线往返：侧栏把信息收进一条、玩法区是干净矩形（Wesnoth）；四角分散给地图更多面积但视线要跳四个角（Civ VI、Songs of Conquest）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `el.minimap.form=plan` `el.selection.form=panel` `el.cta.screenAnchor=br` `cnt.screen=screen.hud` `ast.frameMat=stone`
  - A：`lay.hudOrg=scattered` `el.minimap.screenAnchor=bl` `el.selection.screenAnchor=bl` `el.resources.screenAnchor=tl` `ast.frame=procedural` `el.clock.form=auto` `el.clock.screenAnchor=auto`
  - B：`lay.hudOrg=edgeBar` `el.minimap.screenAnchor=tr` `el.selection.screenAnchor=mr` `el.clock.form=sunDial` `el.clock.screenAnchor=mr` `ast.frame=plainNinePatch` `el.resources.screenAnchor=auto`

  </details>
- **塔防建造：右侧整条商店 vs 点地弹出环形菜单**（单变量对照；内容包：towerDefense · 渔港保卫战；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：建造栏 / 系统入口条 · 屏幕锚点：右中 → 自动；HUD 组织方式：贴边整条 → 分散组件
  - 配套改动：建造栏 / 系统入口条 · 内部排布：规则网格 → 环绕中心 / 轮盘；建造栏 / 系统入口条 · 世界挂点：不挂（用屏幕锚点） → 兴趣点
  - 看什么：屏占比（Bloons TD 6 右栏约占屏宽 1/6）与“看敌人 → 看商店 → 看格子”的视线距离；环形菜单会不会挡住塔周围的路。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=towerDefense` `el.toolbar.form=buttonRow` `el.cost.form=inButton` `cnt.screen=screen.hud`
  - A：`lay.hudOrg=edgeBar` `el.toolbar.arrangement=grid` `el.toolbar.screenAnchor=mr` `el.toolbar.attachTo=none`
  - B：`lay.hudOrg=scattered` `el.toolbar.arrangement=ring` `el.toolbar.attachTo=poi` `el.toolbar.screenAnchor=auto`

  </details>
- **世界即 UI vs 常驻战术面板**（整套做法对照（多个参数一起变）；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：极简 → 密集；容器：直接叠加 → 自动；HUD 组织方式：自动 → 贴边整条；HUD 显隐策略：情境显现 → 常驻
  - 配套改动：面板明度：浅色面板 → 深色面板
  - 看什么：新手能否从画面本身读出规则；同一张战场在 b 里信息是否抢走了画面（Bad North 被夸简洁，HUSTLE 被骂引导不清）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d6` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `cnt.screen=screen.hud`
  - A：`cnt.density=0` `rel.hudVisibility=contextual` `lay.container=overlay` `col.lightness=light` `lay.hudOrg=auto`
  - B：`cnt.density=3` `rel.hudVisibility=always` `lay.hudOrg=edgeBar` `col.lightness=dark` `lay.container=auto`

  </details>
- **战役地图画风：羊皮纸古地图 vs 战术全息**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：平框九宫格 → 程序线框
  - 配套改动：地图画风：羊皮纸古海图 → 战术线框 / 全息；地图未探索区：留白（纸面空白） → 压暗；连线样式：笔触线 → 光束 / 发光线；转角：直角 → 切角
  - 看什么：阵营 / 势力色在两种底上是否都分得清；纸面留白式未探索区（Civ VI）vs 压暗（Stellaris）哪个更能引起“想去看”的好奇。
  - 注：`vis.connector` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d7` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.map` `ast.frameMat=gold`
  - A：`vis.mapStyle=parchment` `vis.mapUnexplored=blank` `vis.connector=brush` `ast.frame=plainNinePatch` `vis.corner=sharp`
  - B：`vis.mapStyle=tactical` `vis.mapUnexplored=dark` `vis.connector=beam` `vis.corner=chamfer` `ast.frame=procedural`

  </details>
- **阵营色：蓝我红敌 vs 橙蓝 + 形状冗余（红色盲模拟下看）**（单变量对照；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：阵营色对：蓝我红敌 → 橙蓝（色盲安全）
  - 看什么：色盲模拟下远景单位的阵营是否仍可分；b 是否靠形状（盾形旗 vs 圆章）也能分。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d8` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `col.coding=team` `chk.cvd=protan` `cnt.screen=screen.hud` `chk.redundancy=true`
  - A：`col.teams=blueRed`
  - B：`col.teams=orangeBlue`

  </details>
- **语义缩放：拉远仍是模型 vs 拉远变阵营军旗**（单变量对照；内容包：rts · 赤沙战线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：语义缩放：无 → 拉远图标化；世界内标注渲染（默认）：自动 → 平面公告板
  - 看什么：Total War 的白 / 红军旗：拉远后军团数量、阵营、交战位置是否比看模型更好读。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d9` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rts` `col.coding=team` `cnt.screen=screen.hud`
  - A：`rel.semanticZoom=none` `rel.worldRender=auto`
  - B：`rel.semanticZoom=iconize` `rel.worldRender=billboard`

  </details>
- **行动顺序：不显示 vs 左下头像队列**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：行动顺序：画法：自动 → 头像队列；行动顺序 · 屏幕锚点：自动 → 左下
  - 看什么：The Banner Saga 式“当前大头像 + 后续小头像”：玩家能否规划下一轮谁先动，左侧小队列与左下队列会不会重复。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d10` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `ctx.timeModel=turn` `el.party.form=frames` `el.party.arrangement=column` `el.party.screenAnchor=ml` `cnt.screen=screen.hud`
  - A：`el.turnOrder.form=auto` `el.turnOrder.screenAnchor=auto`
  - B：`el.turnOrder.form=portraitQueue` `el.turnOrder.screenAnchor=bl`

  </details>
- **同一套回合战术 HUD 的两张皮：像素深底细描边 vs 新艺术衬线 + 青铜缎带**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 平框九宫格；装饰预算：无 → 中
  - 配套改动：UI 像素化：2 倍像素 → 自动；骨架色彩策略：中性 + 一两个强调色 → 单色；标题字族：像素标题 → 新艺术 / 美好年代；标牌：无（直压） → 缎带；统计图形：自动 → 行内横条；装饰母题：无 → 花叶卷草
  - 看什么：风格换了，意图格、阵营色、结束回合这些必须一眼读出的东西是否仍然最显眼（层级不随皮肤漂移）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d11` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `vis.corner=sharp` `vis.stroke=solid` `col.lightness=dark` `cnt.screen=screen.hud` `ast.frameMat=bronze`
  - A：`vis.pixelScale=x2` `col.strategy=neutralAccent` `typ.display.family=pixel` `vis.ornament=0` `ast.frame=procedural` `cmp.plate=none` `st.statViz=auto` `vis.motif=none`
  - B：`typ.display.family=artNouveau` `vis.motif=floral` `vis.ornament=2` `cmp.plate=ribbon` `st.statViz=inlineBar` `ast.frame=plainNinePatch` `col.strategy=mono` `vis.pixelScale=auto`

  </details>
- **叙事容器：屏幕叠加 vs 整局摊在书上**（整套做法对照（多个参数一起变）；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 书；容器放在哪：无（浮在画面上） → 桌面 / 地面；默认放置方式：屏幕叠加 → 叙事内
  - 配套改动：标题字族：同正文 → 手写；边缘处理：干净 → 笔触
  - 看什么：Inkulinati 式“书即战场”：单位名牌、血量、头像排变成纸上的物件后，信息位置是否仍然稳定、字是否还够大。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d12` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `cnt.screen=screen.hud`
  - A：`rel.diegesis=screen` `ast.container=none` `ast.containerSurface=none` `typ.display.family=same` `vis.edge=clean`
  - B：`rel.diegesis=diegetic` `ast.container=book` `ast.containerSurface=table` `vis.edge=brush` `typ.display.family=handwritten`

  </details>
- **触屏战棋：PC 右下小按钮 vs 拇指区大圆键**（单变量对照；内容包：tactics · 机兵防线；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：输入方式：键鼠 → 触屏；主行动按钮 · 大小 / 突出度：1 → 1.6；握持与拇指区：自动 → 横屏双拇指；触屏按钮布局：自动 → 大键 + 弧形环绕
  - 看什么：英杰传把“待机”做成右下拇指区最大的键，左下选中面板留给左手区；看触控尺寸检查是否通过、是否挡住右下角的格子。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-strategy#d13` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=tactics` `el.cta.form=round` `el.cta.screenAnchor=br` `cnt.screen=screen.hud` `ctx.orientation=landscape`
  - A：`ctx.input=kbm` `el.cta.scale=1` `ix.thumbZone=auto` `ix.touchCluster=auto`
  - B：`ctx.input=touch` `ix.thumbZone=twoThumbs` `ix.touchCluster=arc` `el.cta.scale=1.6`

  </details>

**样例内容**：策略与战术（`tactics#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（13 项）</summary>

- 战斗预测面板（攻方 / 守方伤害、命中、反击、前后血量对比）没有专门元素；XCOM 2 的修正项拆解只能用 st.statViz = table 近似。建议新增 el.forecast（画法：命中条 + 修正项列表 / 双方对打条 / 前后血条）。
- 敌人意图的“倒计时”与“出手顺序”没有子参数：Shogun Showdown 头顶的回合倒计时、Into the Breach 的出手编号都要靠 el.threat + el.turnOrder 拼。建议 el.threat 增加 intentCountdown / intentOrder。
- 波次预告（下一波的构成与倒计时）没有元素：Defender's Quest 左侧来波列表、Shogun Showdown 顶部骷髅轨道、Bloons 的 31/40。建议 el.timer.form 增加 waveQueue，或新元素 el.wave。
- 撤销 / 重置回合 / 时间回溯控件没有参数（Into the Breach 撤销移动 + 重置回合、Slice & Dice 撤销）。建议 ix.undo：无 / 撤销一步 / 重置回合 / 时间回溯。
- 世界内的己方单位 / 城市铭牌（城市名 + 人口 + 生产进度 + 城防；军旗 + 兵力圆章）没有对应元素：el.threat 只管敌人、el.selection.form = tag 只管选中。建议 el.worldLabel（城市横幅 / 军旗 / 计数圆章），可挂 target / poi。
- 领土 / 国境线着色不在 el.overlay.form 里（Civ VI、Stellaris、Polytopia 都靠国境读态势；Stellaris 还把势力徽记压在领土上）。建议 el.overlay.form 增加 borders。
- 信息透镜切换（Civ VI 小地图旁的透镜按钮；建造批 Cities: Skylines 的信息视图）没有“透镜选择器”控件。建议 el.overlay 增加 lensPicker，或 el.toolbar.form 增加 lensTabs。
- 主行动按钮的“下一待办”模式（Civ VI 右下先变成“选择研究”，处理完才是“下一回合”）没有参数。建议 el.cta.mode：固定结束回合 / 下一待办 / 下一波。
- 单位“已行动 / 未行动”在地图上的表现缺失：st.done 是给列表用的（绿勾 / 灰化），地图上要灰化已行动单位、给未行动单位脉冲。建议 st.done 允许 @el.party 与世界内渲染。
- 范围高亮只有一档：The Banner Saga 蓝（可移动）+ 黄（加码多走）、英杰传蓝移动 + 红攻击。建议 gridHighlight 增加档位数与语义（移动 / 冲刺 / 攻击 / 危险），并参与色盲检查。
- 4X 外交关系（战争 / 和平 / 同盟）没有颜色编码：col.coding 有阵营色但没有“关系状态色”；对手领袖排可用 el.party 近似。
- 自走棋样本不足：库里没有 Teamfight Tactics / Dota Underlords / 金铲铲之战这一类，羁绊列表（el.meter = stack 近似）、备战席、商店刷新的形态缺一手证据，下一批 R2 应补。
- “展开全部可能结果”的详情形态（Slice & Dice 的骰面展开图）在 lay.detail 里没有对应选项，属于 Roguelike 战术特有的低优先级缺口。

</details>

**最相关的原则**（按针对性排序）：[P-actionable-first](#p-actionable-first)、[P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-color-never-alone](#p-color-never-alone)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-detail-without-hover](#p-detail-without-hover)、[P-map-conventions](#p-map-conventions)、[P-progression-graph](#p-progression-graph)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-input-parity](#p-input-parity)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-typography-legible-format](#p-typography-legible-format) 等 32 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.9 建造与经营

参考卡 53 张 · 探索台内容包：cityBuilder（青河新城）、colony（寒光营地）

建造与经营的 HUD 要回答：存量 + 收支 + 上限、哪里出了问题（能一键定位）、能建什么、整体在变好还是变坏、时间走多快。主流是资源在上、建造栏在下中、选中面板在右；另有玩具建造、世界即 UI、地图即界面、放置数字墙几个完全不同的流派。

**子类**：经典城建 / 城市模拟（Pharaoh + Cleopatra、Cities: Skylines、Anno 1800、TheoTown、Songs of Syx）；生存城建 / 社会抉择（Frostpunk、Timberborn、Before We Leave）；主题园区 / 场馆经营（Planet Zoo、Planet Coaster、RollerCoaster Tycoon Classic、Parkasaurus、Two Point Museum、Megaquarium）；殖民 / 小人模拟（Kenshi、dotAGE、Cult of the Lamb、The Sims Legacy Collection）；修仙模拟（鬼谷八荒、Amazing Cultivation Simulator）；玩具建造 / 极简城建（Townscaper、ISLANDERS、SUMMERHOUSE、Cloud Gardens、Terra Nil、Plan B: Terraform）；地图即界面的交通规划（Mini Metro、Mini Motorways）；世界即 UI 的横版 / 塔防城建（Kingdom: Classic、Kingdom Two Crowns、Thronefall）；放置 / 增量经营（Cookie Clicker、Mr.Mine、Digseum、Nodebuster、(the) Gnorp Apologue、Cheeky Chooks、My Singing Monsters）；自动化边缘（Factorio、Dyson Sphere Program、Autonauts、Beltmatic、River Town Factory）；上帝模拟（WorldBox、SPORE）；经营 + 叙事 / 店铺（Spiritfarer、Bear and Breakfast、PlateUp!、Evil Genius、Do Not Feed the Monkeys）；竖屏手游经营（Everdale、猫咪公寓 2、魔术精品店——只取到开场 / 前端，局内 UI 缺图）

**一眼要知道什么**

1. 我有多少、每段时间进出多少？哪一项快见底或快满仓？（存量 + 收支 + 上限，三件事缺一不可）
2. 哪里出了问题、在地图上的哪一栋 / 哪一片？（缺电、缺工人、断路、不满、火灾）——问题必须能一键定位
3. 我能建什么、花多少、现在放得下吗？（建造栏 + 成本持有 / 需求 + 放置预览是否合法）
4. 整体在变好还是变坏？（满意度、希望 / 不满、恢复度等「社会温度计」与趋势）
5. 现在是什么时候、时间走多快、下一个寒潮 / 季节 / 事件还有多久？（日期、倍速、倒计时）
6. 选中的这栋建筑 / 这个居民 / 这只动物在干什么、缺什么、效率多少？
7. 这一局 / 这个剧本要达成什么，完成了几项？
8. 拉远看全城时，每一片是什么功能区？（语义缩放：标签 → 图标 → 色块 / 热力图）

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 分散组件 + 底部中间建造栏（现代 3D 城建主流）：资源在上、建造在下、选中面板在右、时间倍速在右上 / 右下、问题清单在左 | 分散组件 13 / 53（23 张编码了 HUD 组织的卡里最多）；建造栏锚点在下中 10 / 16 | Terra Nil（steam:1593030）、Timberborn（steam:1062090）、Frostpunk（steam:323190）、Dyson Sphere Program（steam:1366540） 等 7 款 | HUD 组织方式 = 分散组件；容器 = 直接叠加；时间模型 = 实时可暂停 / 变速；建造栏 / 系统入口条：画法 = 分类页签 + 子项抽屉；建造栏 / 系统入口条 · 屏幕锚点 = 下中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左上；选中信息面板：画法 = 信息面板；选中信息面板 · 屏幕锚点 = 右中；倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条；倍速 / 暂停 / 自动 · 屏幕锚点 = 右上；通知 / 大字提示：画法 = 滚动消息列；通知 / 大字提示 · 屏幕锚点 = 左中；面板明度 = 深色面板；底不透明度 = 0.8 |
| 贴边整条控制栏（经典 2D 城建 / 殖民 / 硬核模拟）：一整条侧栏或底栏装下小地图、建造、选中信息 | 6 / 53：Pharaoh 右侧石柱、Kenshi 与 Songs of Syx 底部暗色带、RollerCoaster Tycoon 顶部工具行、Before We Leave 左侧边栏、SUMMERHOUSE 左侧淡色图标列 | Pharaoh + Cleopatra（steam:564530）、Kenshi（steam:233860）、Songs of Syx（steam:1162750）、RollerCoaster Tycoon Classic（steam:683900） 等 6 款 | HUD 组织方式 = 贴边整条；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 右中；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右中；外框结构 = 雕花九宫格；外框材质 = 石；玩法区形态 = 全屏；信息密度 = 密集 |
| 整合底座：一块控制台装下需求条、头像、倍速（家用模拟 / 复古特工基地） | 2 / 53（The Sims 左下蓝色底座、Evil Genius 底部银灰金属仪表台） | The Sims Legacy Collection（steam:3314060）、Evil Genius（steam:3720） | HUD 组织方式 = 整合底座；建造栏 / 系统入口条 · 屏幕锚点 = 左下；队伍 / 玩家条：画法 = 头像框 + 小血条；世界 / 社会态势条：画法 = 多项堆叠；倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条；光泽高光 = 顶部玻璃高光；转角 = 圆角；骨架色彩策略 = 双色调 |
| 整屏画框：UI 画在玩法区外的边框里（像素殖民 / 放置） | 2 / 53（dotAGE 木框、Mr.Mine 铁框），Cookie Clicker 的三栏可算同一思路 | dotAGE（steam:638510）、Mr.Mine（steam:1397920）、Cookie Clicker（steam:1454400） | HUD 组织方式 = 画在玩法区外的边框里；玩法区形态 = 4:3 / 小窗加黑边；外框结构 = 平框九宫格；外框材质 = 木；UI 像素化 = 与世界同网格；资源 / 货币 · 屏幕锚点 = 左中；资源 / 货币 · 内部排布 = 竖列；资源 / 货币 · 数值标注 = 变化量 |
| 世界即 UI（叙事内零 HUD）：金币挂在角色身上、状态由火把 / 旗帜 / 地面圆标表达 | 3 / 53 张卡标了叙事内（Kingdom 两作、Do Not Feed the Monkeys 的书桌），Thronefall 地面金币圆标同理 | Kingdom: Classic（steam:368230）、Kingdom Two Crowns（steam:701160）、Thronefall（steam:2239150）、Do Not Feed the Monkeys（steam:658850） | 信息密度 = 极简；容器 = 直接叠加；默认放置方式 = 叙事内；HUD 显隐策略 = 情境显现；UI 与画面关系 = 同一媒介；资源 / 货币：画法 = 以数值图形呈现；资源 / 货币 · 世界挂点 = 玩家角色；价格 / 消耗 · 放置方式（逐元素） = 空间内 |
| 玩具建造：只剩一排很淡的小工具，画面占绝对主体 | 信息密度「极简」10 / 53，其中真正的玩具建造 5 张（Townscaper、ISLANDERS、SUMMERHOUSE、Cloud Gardens、Plan B）；Planet Coaster、Autonauts 的极简是商店图没拍到 UI，不计入 | Townscaper（steam:1291340）、ISLANDERS（steam:1046030）、SUMMERHOUSE（steam:2533960）、Cloud Gardens（steam:1372320） 等 5 款 | 信息密度 = 极简；容器 = 直接叠加；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；底不透明度 = 0.4；转角 = 圆角；装饰预算 = 无；UI 与画面关系 = 统一调色 |
| 地图即界面（示意图 / 线路图）：数据本身就是画面，UI 只剩库存与时钟 | 2 / 53（Mini Metro、Mini Motorways） | Mini Metro（steam:287980）、Mini Motorways（steam:1127500） | 主视觉主体 = 数据；地图画风 = 示意图；骨架色彩策略 = 骨架多色；面板明度 = 浅色面板；装饰预算 = 无；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；计时 / 分数 / 回合：画法 = 以数值图形呈现；计时 / 分数 / 回合 · 屏幕锚点 = 右上 |
| 放置三栏 / 数字墙：巨字主货币 + 长列表升级（行内价格按钮） | 放置 / 增量 7 / 53（Cookie Clicker、Mr.Mine、Digseum、Nodebuster、Gnorp Apologue、Cheeky Chooks、My Singing Monsters），三栏或侧栏长列表 | Cookie Clicker（steam:1454400）、Mr.Mine（steam:1397920）、Digseum（steam:3361470）、Cheeky Chooks（steam:922460） | 分区方式 = 三栏；信息密度 = 极密；资源 / 货币：画法 = 大号数字；资源 / 货币 · 屏幕锚点 = 上中；格子结构 = 横卡行；价格 / 消耗：画法 = 按钮内嵌价 / 消耗；列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力 + 行内按钮；数值变化 = 数字滚动 |
| 多窗口：可拖动、可同时开多个的浮动窗（老式 PC 经营 / 极密模拟） | 1 / 53 明确（RollerCoaster Tycoon Classic）；Songs of Syx 的居民小传也是浮动窗 | RollerCoaster Tycoon Classic（steam:683900）、Songs of Syx（steam:1162750） | 容器 = 可拖动窗口；立体与阴影 = 倒角浮雕；面板明度 = 中明度；信息密度 = 极密；叠层表现 = 叠在上面 |

**关键元素与画法**

- **资源 / 货币**（`el.resources`）：iconNumber / bigNumber / gauge / pills；常见位置 tl、tc、bl、ml。城建的第一问题是「够不够」。图标 + 数字横排在顶部是主流（Terra Nil、Before We Leave、Mr.Mine，左上 / 上中 4 / 5 张标了锚点的卡）；放置类把主货币做成巨字（Cookie Clicker、Cheeky Chooks）；dotAGE 竖列在左侧并带每回合 +/− 增量，负数标红；Megaquarium 放在底栏左端并附收入增量；Kingdom 干脆做成骑手身上的钱袋。资源超过 8 种要分组或可折叠（Timberborn 左上一整块资源表）。数值标注优先「当前 / 上限」或「变化量」，单纯一个存量回答不了「够不够」。
- **建造栏 / 系统入口条**（`el.toolbar`）：buttonRow / categoryTabs；常见位置 bc、ml、mr、tc。建造是主动作，所以建造栏几乎都放在下中（10 / 16）。建筑种类少于 10 用一排图标（Terra Nil 带数字分类键 + 卡片、ISLANDERS 半透明胶囊、Mini Metro 彩色圆点）；种类多用分类页签 + 子项抽屉（Planet Zoo 底部文字页签、Timberborn 底部长图标条、Before We Leave）。左侧竖列（Megaquarium、SUMMERHOUSE、Before We Leave，共 3 张）在宽屏上不挡底部场景；Pharaoh 把小地图和建造按钮合在右侧整条石柱里。
- **选中信息面板**（`el.selection`）：panel / tooltip / card；常见位置 mr、bl、br。选中建筑 / 居民 / 动物后的信息面板是城建里最大的面板：Frostpunk、Timberborn、Planet Zoo 放右侧常驻（能边看边改岗位），Kenshi 放左下底带里。面板惯用结构：头像或建筑图 + 名字 + 状态行 + 需求横条（绿 → 黄 → 红）+ 岗位分配 +/−（Frostpunk 工人 / 工程师行内加减）。
- **世界 / 社会态势条**（`el.meter`）：stack / paired / withIcon / single；常见位置 tr、tl、bc、br、ml。城建的「社会温度计」，6 张卡编码了它：多项堆叠 4（Terra Nil 右上三条恢复度、The Sims 需求条、Do Not Feed the Monkeys 右侧饥饿 / 健康 / 睡眠、dotAGE 顶部四格），两项对立 1（Frostpunk 底部希望 / 不满 + 顶部温度表盘），图标 + 仪表 1（Cult of the Lamb 左上信仰值）。对立条适合有道德两难的设计，堆叠条适合「把几项都拉满」的目标；锚点完全不集中，说明它跟着设计重点走。
- **时间 / 天气 / 日历**（`el.clock`）：clock / calendar / dayCounter / weather；常见位置 tr、br、tc。日期与季节决定节奏（寒潮将至、开园时间、年度结算）。Megaquarium 右下「时间 + 第几天」、PlateUp! 右上天数、dotAGE 右下日晷 + 天数；和倍速控件放在一起是惯例。Frostpunk 把温度（比时间更重要的威胁）放在顶部正中。
- **倍速 / 暂停 / 自动**（`el.gameSpeed`）：speedBar / playFF / pauseMenu；常见位置 tr、br、bc。可暂停 / 变速是这个品类的时间模型（ctx.timeModel = pausable）。暂停 / 1× / 2× / 3× 一组按钮挨着时钟：Timberborn 右上、Megaquarium 与 Planet Zoo 右下、Kenshi 底带中部。按键提示要可见，因为玩家会频繁用键盘暂停。
- **信息叠层 / 图例**（`el.overlay`）：heatmap / statusIcons / rangeRing / buildGrid / arrows。城建的信息叠层回答「哪一片 / 哪一栋」：Cities: Skylines 把城市变白模再上彩色热力（语义缩放 = 热力图）；Factorio 在机器上叠状态图标；Terra Nil 放置时显示影响范围；Megaquarium 的鱼缸卡上用黄三角标出不满足的条件。热力图要配图例、不能只靠红 → 绿。
- **通知 / 大字提示**（`el.notify`）：feed / toast / modalCard；常见位置 ml、bl、mr。城建的通知其实是「问题清单」：Timberborn 左侧一列红色图标 + 计数（建筑缺电、缺工人、无人居住），Frostpunk 左侧目标 / 社会事件提醒。好的做法是同类合并计数、点击跳到出事地点，而不是一条条滚动消息。Mini Metro 每周一次的二选一升级是居中卡片（modalCard），频率低所以可以打断。
- **目标 / 路点**（`el.objective`）：checklist / text / marker；常见位置 ml、tl。剧本 / 关卡目标：Planet Zoo 左侧目标面板（铜 / 银 / 金三档逐条勾选）、Terra Nil 左上圆环 + 勾、Frostpunk 左侧目标行。零 HUD 的 Kingdom Two Crowns 有 7 条评测说不知道该干什么——目标是这个品类最不该省的信息。
- **队伍 / 玩家条**（`el.party`）：frames / portraitRow / unitCards；常见位置 bc、tc、ml。殖民 / 小人模拟要随时看到「我的人」：Kenshi 底部小队头像行、dotAGE 左侧竖排村民 + 资源条、The Sims 底座里的头像；现有「殖民模拟」布局预设把殖民者栏放在顶部。锚点在下中的 3 张都是小队型。
- **价格 / 消耗**（`el.cost`）：iconNumber / haveNeed / inButton。建造卡角上的成本（Terra Nil 每张卡带叶子图标 + 数字）、放置类的行内价格按钮（Cookie Clicker、Digseum）、悬停详情里的解锁价（Timberborn）。持有 / 需求红绿能省掉一次「为什么点不了」。
- **计时 / 分数 / 回合**（`el.timer`）：gauge / number；常见位置 tr、bl。极简城建把时间 / 分数做成图形而不是数字：Mini Metro 右上时钟、ISLANDERS 左下圆环（当前分 / 下一座岛的门槛）。
- **对话 / 事件选项**（`el.choices`）：buttons / text；常见位置 center。事件抉择（Frostpunk 压暗背景 + 人物群像 + 文本选项）：选项上直接写清代价（某资源减少、不满上升），让抉择是策略而不是猜谜。
- **小地图 / 罗盘**（`el.minimap`）：plan / radar；常见位置 mr、tr、br。2D 城建的小地图常并入侧边控制栏（Pharaoh 右侧、Songs of Syx 右上）；3D 城建多用可旋转镜头 + 全屏地图 / 信息视图代替小地图（Dyson Sphere Program 右下是环形状态而非地图）。

**重要界面**

- **局内 HUD**：见 hudOrganization。共同点：可暂停的时间控件、资源 + 收支、建造入口、选中详情、问题清单五件套；密度从 0（Kingdom、Townscaper）到 4（Songs of Syx、Kenshi）都有，是这个品类最重要的旋钮。面板深色 15 vs 浅色 6，深色半透明为多。 例：Terra Nil（steam:1593030）、Timberborn（steam:1062090）、Frostpunk（steam:323190）、dotAGE（steam:638510） 等 5 款。
- **建造菜单**：分类页签（两级以内）+ 建筑卡（图标 / 缩略图 + 名称 + 成本）+ 悬停详情 + 幽灵预览放置。Spiritfarer 的建造模式是左侧圆角深青面板 + 所需材料；Terra Nil 卡片右下角是成本、旁边一个大撤销键；Planet Zoo 底部用文字页签；Timberborn 悬停浮出说明卡 + 解锁价。 例：Spiritfarer（steam:972660）、Terra Nil（steam:1593030）、Planet Zoo（steam:703080）、Timberborn（steam:1062090） 等 5 款。
- **角色 / 装备 / 属性**：个体详情（居民 / 游客 / 动物 / 小人）：头像 + 名字 + 需求横条列表 + 想法 / 心情。Planet Zoo 动物福利彩色横条、Timberborn 海狸需求条、Kenshi 肢体血量表、Songs of Syx 一整页小传文字、了不起的修仙模拟器卷轴人物页。密度越高越要按「出问题的排前面」排序。 例：Planet Zoo（steam:703080）、Timberborn（steam:1062090）、Kenshi（steam:233860）、Songs of Syx（steam:1162750） 等 5 款。
- **地图 / 世界地图**：整体视图 / 世界地图：Terra Nil 地球 + 发光连线 + 各区百分比（进度即地图）；Kenshi 羊皮纸窗口；Spiritfarer 手绘海图 + 弹出地点卡；鬼谷八荒水墨山水；Before We Leave 球面微缩星球。地图画风跟世界画风走。 例：Terra Nil（steam:1593030）、Kenshi（steam:233860）、Spiritfarer（steam:972660）、鬼谷八荒 Tale of Immortal（steam:1468810） 等 5 款。
- **任务日志 / 目标**：目标 / 剧本 / 编年史：Anno 1800 报纸版式羊皮纸 + 左侧人物肖像；Planet Zoo 左侧目标面板（分档勾选）；Frostpunk 左侧目标列。叙事型城建把「本局进度」做成报纸 / 法典这种世界内的纸质物件。 例：Anno 1800（steam:916440）、Planet Zoo（steam:703080）、Frostpunk（steam:323190）。
- **对话 / 文本**：城建里的对话多是「事件卡」：压暗场景 + 人物群像 / 头像 + 一段叙述 + 2–3 个写明代价的选项（Frostpunk 全屏文本）。经营 + 叙事类回到常规对话：Spiritfarer 白色圆角气泡、Bear and Breakfast 底部纸条 + 两侧半身立绘。 例：Frostpunk（steam:323190）、Spiritfarer（steam:972660）、Bear and Breakfast（steam:1136370）。
- **技能树 / 成长**：科技 / 升级树：Nodebuster 电路板式直角连线 + 发光方块节点、Digseum 方框节点 + 直线；放置类的升级多是长列表 + 行内价格按钮而不是树。 例：Nodebuster（steam:3107330）、Digseum（steam:3361470）。
- **结算 / 胜负 / 奖励**：统计 / 年报 / 关卡结束（不是奖励弹窗）：Parkasaurus 白底 + 色块 + 折线图 + 大数字；Mini Metro 结束时就停在线路图本身 + 运送人数。核心是趋势与对比，不是演出。 例：Parkasaurus（steam:591460）、Mini Metro（steam:287980）。
- **关卡 / 章节选择**：剧本 / 城市选择：Mini Metro 横向排开的城市线路缩略；PlateUp! 把选项做成立在地面上的纸卡，玩家走过去选（空间内）。 例：Mini Metro（steam:287980）、PlateUp!（steam:1599600）。
- **图鉴 / 收集 / 成就**：图鉴：了不起的修仙模拟器卷轴里方格排列，未获得的是黑剪影。 例：Amazing Cultivation Simulator（steam:955900）。
- **制作 / 合成**：生产 / 烹饪配方页：Bear and Breakfast 木框 + 米黄纸格子；Mr.Mine 铁框弹窗里的蓝图 + 所需材料。 例：Bear and Breakfast（steam:1136370）、Mr.Mine（steam:1397920）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 模拟 / 策略工具面板（`fam.sim-panel`）（10 张）：城市与殖民模拟：长时间盯数据，深底减少疲劳。
- 扁平几何 · 地图即界面（`fam.flat-map`）（9 张）：扁平几何 · 地图即界面：本品类主归属卡 ISLANDERS、Mini Motorways、Cloud Gardens 等（理由见 17 号图谱该家族的「多见品类」）。
- 圆润友好（`fam.cozy`）（7 张）：长时间游玩、低压力，UI 要能常开不累：Spiritfarer、Two Point Museum、PlateUp、Everdale。
- 像素木框（`fam.pixel-wood`）（4 张）：Stardew、dotAGE、River Town Factory、Maltese、古代收租日记、Bear and Breakfast、My Singing Monsters：长时间、物件多，木框 + 纸芯把大量格子包装成家具。
- 拟物（`fam.skeuo`）（2 张）：Pharaoh（城建石栏）、Cookie Clicker（放置木纹列表）、Do Not Feed the Monkeys（书桌模拟）。
- 糖果卡通（Q 版）（`fam.candy`）（2 张）：低模经营的统计和列表用扁平糖果色块，数据多时比厚框省空间。
- 国风水墨 / 墨笔（`fam.ink`）（2 张）：修仙经营（鬼谷八荒、了不起的修仙模拟器）：面板最多，卷轴 / 竹简 / 建筑立面作容器。
- 像素位图（`fam.pixel`）（2 张）：TheoTown、WorldBox：上帝视角像素地图，截图里 UI 极少。

**代表作**

- Frostpunk（steam:323190）〔线描花饰〕：Frostpunk：底部希望 / 不满对立条 + 顶部温度表盘把「生存压力」做成画面正中的两个读数；右侧建筑面板可直接加减工人；事件抉择全屏压暗——城建 UI 也能有叙事张力。
- Terra Nil（steam:1593030）〔模拟 / 策略工具面板〕：Terra Nil：现代城建的干净样板——下中带分类数字键的建筑卡 + 成本 + 大撤销键、右上三条恢复度、左上圆环目标、全屏地球进度视图。
- Timberborn（steam:1062090）〔模拟 / 策略工具面板〕：Timberborn：中高密度仍可读——左上资源表、左侧问题清单带计数、右侧居民需求条、右上周期 + 倍速、底部长建造条。
- Mini Metro（steam:287980）〔扁平几何 · 地图即界面〕：Mini Metro：地图即界面的极致，库存是底部一排彩色圆点，时钟在右上；还有浅 / 深两套配色。
- Kingdom Two Crowns（steam:701160）〔零 HUD · 世界即界面〕：Kingdom Two Crowns：世界即 UI 的代表，评测里有 3 条夸 UI 简洁、7 条说不知道该干什么——讲零 HUD 取舍时最好的正反例（夸 UI 的评测全库只有 47 条，3 条已算多，但仍是小样本）。
- dotAGE（steam:638510）〔像素木框〕：dotAGE：像素殖民把整屏包进木框，左侧资源竖列带每回合增减、顶部四格态势、右下日晷——inMargin 的完整示范。
- Pharaoh + Cleopatra（steam:564530）〔拟物〕：Pharaoh + Cleopatra：经典 2D 城建右侧整条石质控制栏（小地图 + 建造），外框材质即题材。
- Planet Zoo（steam:703080）〔扁平 / Material〕：Planet Zoo：浅色圆角卡片抽屉 + 青绿强调，左侧分档目标、右侧访客 / 动物状态条、底部文字页签建造栏；同时是「菜单繁琐」的被抱怨者。
- Songs of Syx（steam:1162750）〔模拟 / 策略工具面板〕：Songs of Syx：信息密度天花板，深色表格面板 + 像素城市；讲「多密才算太密」时用。
- The Sims Legacy Collection（steam:3314060）〔Frutiger Aero〕：The Sims：整合底座的代表，需求、心情、头像、倍速全在左下一块蓝色玻璃底座里；头顶思维气泡是空间内 UI。
- Anno 1800（steam:916440）〔羊皮纸任务书〕：Anno 1800：编年史做成报纸版式羊皮纸 + 人物侧图，把剧本进度变成世界内的纸质物件。
- Cookie Clicker（steam:1454400）〔拟物〕：Cookie Clicker：放置三栏（巨大饼干 / 建筑展示带 / 右侧木纹商店长列表），数字跳动就是主要反馈。

**坑**

- 零 HUD / 世界即 UI 的代价是引导不足：新玩家不知道目标、不知道钱袋里有多少、不知道某个建筑做什么。 例：Kingdom Two Crowns（steam:701160）、PlateUp!（steam:1599600）、Timberborn（steam:1062090）、Anno 1800（steam:916440）。
  - 评价与证据（依据：评测）：R3「提示 / 引导不清」去重后：Kingdom Two Crowns 7 条（与 Scorn 并列全库最多，同时有 3 条夸 UI 简洁），PlateUp!、Timberborn 各 3 条，Anno 1800、Planet Coaster、了不起的修仙模拟器各 2 条。
- 菜单层级深、功能难找：建筑 / 设施种类多的园区经营最常被说繁琐。 例：Planet Zoo（steam:703080）、Parkasaurus（steam:591460）、Dyson Sphere Program（steam:1366540）、Frostpunk（steam:323190）、Two Point Museum（steam:2185060 · 据已知描述）。
  - 评价与证据（依据：评测）：「菜单 / 界面难用」去重后：Parkasaurus 3、Dyson Sphere Program 3、Planet Zoo 2（另有 1 条说菜单里复杂度与杂物太多）、Frostpunk 2、Anno 1800 2、Two Point Museum 2。
- 信息过密、面板挡住城市：极密模拟把表格铺满半屏，玩家看不到自己造的东西。 例：Songs of Syx（steam:1162750）、Stellaris（steam:281990）。
  - 评价与证据（依据：评测）：人工复核后真正说界面杂乱的：Songs of Syx 1 条、Stellaris 1 条、Two Point Museum 1 条（每款 1 条，未达门槛）。原来列的 Cult of the Lamb、Bear and Breakfast 的命中说的是特效与房间摆设，已移除。Songs of Syx 提到界面的 62 条评测中差评 20 条（整体差评顺带提界面，仅作参考）。
- 镜头拉远的 3D 城建 + 高分辨率时字太小；卷轴 / 宣纸等装饰面板上细字更难读。 例：鬼谷八荒 Tale of Immortal（steam:1468810）、Terra Nil（steam:1593030）。
  - 评价与证据（依据：截图）：看图：鬼谷八荒的宣纸卷轴面板、Terra Nil 的远景小字。评测证据不足：两款原来各 2 条「字太小」，复核后只有鬼谷八荒 1 条确实在说卷轴面板里的文字太小（笔记本小屏上），Terra Nil 的命中说的是图层里东西难找。
- 老式 UI 不随分辨率缩放：复刻版经典经营在 4K 下控件极小。 例：RollerCoaster Tycoon Classic（steam:683900）。
  - 评价与证据（依据：评测）：「UI 缩放 / 分辨率」去重后：RollerCoaster Tycoon Classic 2 条（全库这一类第 2 多，只有 BioShock Infinite 更多）。
- 热力图与状态只靠红 → 绿区分；远景没有语义缩放，屋顶同色看不出功能，叠上信息层后对比崩溃。 例：Factorio（steam:427520）、Cities: Skylines（steam:255710 · 据已知描述）。
  - 评价与证据（依据：文献）：无评测统计；来自 06 文档 A9 / A10 陷阱清单（红绿热力对色盲不友好、远景细节变噪点、状态只靠红绿灯）。
- 建造失败没有就地解释：点不了建筑时不说缺哪种资源、放不下时不说为什么（地形 / 道路 / 占地）。 例：Timberborn（steam:1062090）、Planet Zoo（steam:703080）。
  - 评价与证据（依据：推断）：无单独统计；属于「引导不清」与「菜单难用」两类的交集（见上两条）。

**可演示的对比**

- **信息密度两极：世界即 UI vs 贴边石质控制栏**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 雕花九宫格；信息密度：极简 → 极密；面板明度：中明度 → 深色面板；价格 / 消耗 · 放置方式（逐元素）：空间内 → 继承
  - 配套改动：容器：直接叠加 → 自动；默认放置方式：叙事内 → 屏幕叠加；HUD 显隐策略：情境显现 → 自动；UI 与画面关系：同一媒介 → 自动；信息元素集合：资源 / 货币 + 价格 / 消耗 → 资源 / 货币 + 建造栏 / 系统入口条 + 选中信息面板 + 小地图 / 罗盘 + 时间 / 天气 / 日历 + 倍速 / 暂停 / 自动 + 通知 / 大字提示；资源 / 货币：画法：以数值图形呈现 → 自动；资源 / 货币 · 世界挂点：玩家角色 → 不挂（用屏幕锚点）；小地图 / 罗盘：画法：自动 → 平面小地图；小地图 / 罗盘 · 屏幕锚点：自动 → 右中；选中信息面板：画法：自动 → 信息面板；选中信息面板 · 屏幕锚点：自动 → 右中；建造栏 / 系统入口条：画法：自动 → 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点：自动 → 右中；HUD 组织方式：自动 → 贴边整条
  - 看什么：同一份经济信息：A 只靠角色身上的钱袋和地面上的金币圆标，B 用一整条石柱装下小地图、建造与选中详情。看新玩家能不能回答「我现在缺什么」，以及 UI 屏占比（A ≈ 0%，B ≈ 20%）。A 适合短局、单线目标；B 适合几十种建筑的长线城建。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.hud` `ast.frameMat=stone`
  - A：`cnt.density=0` `lay.container=overlay` `rel.diegesis=diegetic` `rel.hudVisibility=contextual` `rel.harmony=sameMedium` `cnt.elements=el.resources+el.cost` `el.resources.form=gauge` `el.resources.attachTo=player` `el.cost.diegesis=spatial` `ast.frame=procedural` `col.lightness=mid` `el.minimap.form=auto` `el.minimap.screenAnchor=auto` `el.selection.form=auto` `el.selection.screenAnchor=auto` `el.toolbar.form=auto` `el.toolbar.screenAnchor=auto` `lay.hudOrg=auto`
  - B：`cnt.density=4` `lay.hudOrg=edgeBar` `cnt.elements=el.resources+el.toolbar+el.selection+el.minimap+el.clock+el.gameSpeed+el.notify` `el.toolbar.form=buttonRow` `el.toolbar.screenAnchor=mr` `el.minimap.form=plan` `el.minimap.screenAnchor=mr` `el.selection.form=panel` `el.selection.screenAnchor=mr` `ast.frame=carvedNinePatch` `col.lightness=dark` `el.cost.diegesis=inherit` `el.resources.attachTo=none` `el.resources.form=auto` `lay.container=auto` `rel.diegesis=screen` `rel.harmony=auto` `rel.hudVisibility=auto`

  </details>
- **建造栏：一排图标 vs 分类页签 + 子项抽屉**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：格子结构：自动 → 竖卡；价格 / 消耗：画法：货币图标 + 数字 → 持有 / 需求（红绿）；建造栏 / 系统入口条：画法：图标按钮排 → 分类页签 + 子项抽屉；转角：圆角 → 直角
  - 配套改动：建造栏 / 系统入口条 · 内部排布：横排 → 继承；按钮内容：图标 → 自动；底不透明度：0.4 → 1；页签内容：自动 → 图标 + 文字；页签选中指示：自动 → 实心填充；详情呈现：自动 → 临时出现
  - 看什么：建筑少于 10 种时 A 一眼看全；超过 30 种时只有 B 不爆版。数一数在两边找到「水泵」各要点几下；B 的持有 / 需求红绿会直接告诉你哪个造不起。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `el.toolbar.screenAnchor=bc` `cnt.screen=screen.hud`
  - A：`el.toolbar.form=buttonRow` `el.toolbar.arrangement=row` `cmp.button=icon` `vis.corner=round` `vis.opacity=0.4` `el.cost.form=iconNumber` `cmp.slot=auto` `cmp.tab=auto` `cmp.tabIndicator=auto` `lay.detail=auto`
  - B：`el.toolbar.form=categoryTabs` `cmp.tab=iconText` `cmp.tabIndicator=filled` `cmp.slot=tallCard` `el.cost.form=haveNeed` `lay.detail=transient` `cmp.button=auto` `el.toolbar.arrangement=inherit` `vis.corner=sharp` `vis.opacity=1`

  </details>
- **社会温度计：多项堆叠 vs 两项对立**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：世界 / 社会态势条：画法：多项堆叠 → 两项对立
  - 配套改动：数值图形（世界 / 社会态势条）：细条 → 双向对立条；世界 / 社会态势条 · 屏幕锚点：右上 → 下中；世界 / 社会态势条 · 数值标注：百分比 → 不标；世界 / 社会态势条 · 内部排布：竖列 → 继承；世界 / 社会态势条 · 信息优先级：次 → 主；世界 / 社会态势条 · 大小 / 突出度：1 → 1.4
  - 看什么：A（右上三条细条 + 百分比）是「把几项都拉满」的清单式目标；B（屏幕正下方放大的对立条）是「在两难之间摆动」，每一次决策都会让指针动。看哪种更能让玩家感到压力、哪种更适合不打扰的治愈经营。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.hud`
  - A：`el.meter.form=stack` `cmp.gauge@el.meter=thinBar` `el.meter.screenAnchor=tr` `el.meter.valueLabel=percent` `el.meter.arrangement=column` `el.meter.priority=secondary` `el.meter.scale=1`
  - B：`el.meter.form=paired` `cmp.gauge@el.meter=bipolar` `el.meter.screenAnchor=bc` `el.meter.scale=1.4` `el.meter.priority=primary` `el.meter.arrangement=inherit` `el.meter.valueLabel=none`

  </details>
- **选中信息：常驻侧面板 vs 跟随光标的提示卡**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：列表行字段：图标 / 头像 + 标题 + 进度 + 数值 / 战力 → 自动；选中信息面板：画法：信息面板 → tooltip；选中信息面板 · 屏幕锚点：右中 → 自动
  - 配套改动：详情呈现：常驻一侧 → 临时出现；统计图形：行内横条 → 图标 + 计数；选中信息面板 · 世界挂点：不挂（用屏幕锚点） → 光标
  - 看什么：A 适合要调参的对象（岗位、票价、配给），能边看边改；B 适合只读的巡视（这栋楼缺什么），不遮挡城市。手柄 / 触屏没有悬停，B 要改成点选后底部浮层。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `cnt.screen=screen.hud` `cnt.textLength=line`
  - A：`el.selection.form=panel` `el.selection.screenAnchor=mr` `lay.detail=persistent` `st.statViz=inlineBar` `cmp.listRow=icon+title+progress+value` `el.selection.attachTo=none`
  - B：`el.selection.form=tooltip` `el.selection.attachTo=cursor` `lay.detail=transient` `st.statViz=iconCount` `cmp.listRow=auto` `el.selection.screenAnchor=auto`

  </details>
- **数据叠层：热力图 vs 状态图标**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息叠层 / 图例 · 放置方式（逐元素）：继承 → 空间内；信息叠层 / 图例：画法：热力图 + 图例 → 状态图标；信息叠层 / 图例 · 世界渲染（逐元素）：继承 → 平面公告板；背后调色：去饱和 → 原样
  - 配套改动：语义缩放：拉远切热力图 → 拉远图标化；警示表达：自动 → 黄三角图标
  - 看什么：A 回答「哪一片」（区域问题：污染、地价、噪音，城市先去饱和再上色块），B 回答「哪一栋」（单体问题：缺电、缺工人）。打开色盲模拟看 A 的红 → 绿是否还能分；B 的图标要靠形状而不是颜色区分问题类型。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `col.coding=status` `cnt.screen=screen.hud`
  - A：`el.overlay.form=heatmap` `rel.semanticZoom=heatmap` `rel.sceneTone=desaturate` `el.overlay.diegesis=inherit` `el.overlay.worldRender=inherit` `st.alert=auto`
  - B：`el.overlay.form=statusIcons` `rel.semanticZoom=iconize` `el.overlay.diegesis=spatial` `el.overlay.worldRender=billboard` `st.alert=warnIcon` `rel.sceneTone=none`

  </details>
- **面板明度：深色半透明细线 vs 浅色圆角卡片**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：面板明度：深色面板 → 浅色面板；转角：直角 → 圆角；立体与阴影：平面 → 柔投影；底不透明度：0.8 → 1
  - 配套改动：图标风格：线性 → 扁平填充；分组方式：自动 → 卡片
  - 看什么：参考库里深色 15 : 浅色 6。深色半透明（Timberborn、Factorio）在夜景和密集城市上不刺眼、能装大表格；浅色卡片（Planet Zoo、Parkasaurus）在明亮草地 / 沙地上像贴纸、显得友好。切换昼夜场景看哪套更稳。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `vis.stroke=solid` `vis.strokeWidth=1` `col.strategy=neutralAccent` `cnt.screen=screen.hud`
  - A：`col.lightness=dark` `vis.opacity=0.8` `vis.corner=sharp` `vis.iconStyle=line` `lay.grouping=auto` `vis.depth=flat`
  - B：`col.lightness=light` `vis.opacity=1` `vis.corner=round` `vis.depth=softDrop` `vis.iconStyle=flat` `lay.grouping=card`

  </details>
- **像素殖民：整屏木框 vs 分散组件**（整套做法对照（多个参数一起变）；内容包：cityBuilder · 青河新城；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：平框九宫格 → 程序线框；资源 / 货币 · 内部排布：竖列 → 横排；资源 / 货币 · 屏幕锚点：左中 → 上中；资源 / 货币 · 数值标注：变化量 → 当前值
  - 配套改动：HUD 组织方式：画在玩法区外的边框里 → 分散组件；玩法区形态：4:3 / 小窗加黑边 → 全屏；底不透明度：1 → 0.6
  - 看什么：A 像一块桌游盘，资源竖列带每回合增减，玩法区缩小但 UI 永远不压画面；B 视野最大但资源条压在地图上。看 A 是否让小村庄显得更「可经营」，B 是否更适合要大面积铺开的城市。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-builder#d6` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=cityBuilder` `ast.frameMat=wood` `vis.pixelScale=world` `cnt.screen=screen.hud`
  - A：`lay.hudOrg=inMargin` `lay.playfield=boxed` `ast.frame=plainNinePatch` `el.resources.screenAnchor=ml` `el.resources.arrangement=column` `el.resources.valueLabel=delta` `vis.opacity=1`
  - B：`lay.hudOrg=scattered` `lay.playfield=full` `el.resources.screenAnchor=tc` `el.resources.arrangement=row` `el.resources.valueLabel=current` `vis.opacity=0.6` `ast.frame=procedural`

  </details>

**样例内容**：中世纪河谷小镇（`cityBuilder#river-town`）、末日寒冬煤炉殖民地（`cityBuilder#winter-colony`）、海底水族馆（`cityBuilder#aquarium`）、野生动物园（`cityBuilder#wildlife-park`）、火星穹顶殖民（`cityBuilder#mars-dome`）、樱花茶园与温泉街（`cityBuilder#sakura-onsen`）、蒸汽港口贸易城（`cityBuilder#steam-port`）、漂浮云岛玩具建造（`cityBuilder#cloud-toys`）、地下矿城（放置）（`cityBuilder#mine-idle`）、修仙宗门（`cityBuilder#cultivation-sect`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（9 项）</summary>

- el.notify 缺「问题汇总列」形态（同类合并计数 + 点击跳到出事地点，如 Timberborn 左侧红色问题列、殖民模拟右侧警报列）：现在只能用滚动消息 feed 近似。建议加 el.notify.form = alertList。
- st.statViz 缺「历史折线 / 面积趋势图」（Parkasaurus 统计页、城建财政与人口曲线）：建议加 lineChart。
- 放置预览的合法性没有参数：幽灵预览绿 / 红、占地格、需连道路提示、成本不足标红（ix.confirm = ghost 只描述确认方式）。建议加 st.placeValid 或在 el.overlay.form 加 footprint。
- 资源收支明细没有呈现方式参数：悬停资源数字看「来源 / 去向」分解表。建议 el.resources 加 detail 子参数（tooltip 表格 / 侧栏 / 无）。
- 缺「人 × 岗位 / 时段」可编辑矩阵（Frostpunk 工人分配、殖民模拟的工作优先级 / 日程网格）：cmp.quantity 只覆盖单个数量。建议加 cmp.assignGrid 或在 cnt.dataShape 增加可编辑表格。
- 缺大数字记数法（放置类的 K / M / B、科学计数 1.2e23）：建议加 typ.numberFormat。
- 缺批量档位切换（放置 / 经营的 ×1 / ×10 / ×100 / MAX）：cmp.quantity 只有滑条、步进器、输入框。
- el.toolbar 缺「编辑操作组」（撤销 / 重做 / 拆除 / 移动 / 复制，如 SUMMERHOUSE 底部撤销重做、Terra Nil 橙色撤销键）。
- 缺区域刷 / 框选建造的读数（拖拽道路 / 规划区时实时显示长度、面积、总价）：ix.mode 有 drag 与 freePlace，但没有拖拽读数。

</details>

**最相关的原则**（按针对性排序）：[P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-material-from-world](#p-material-from-world)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-actionable-first](#p-actionable-first)、[P-confirm-by-input](#p-confirm-by-input)、[P-detail-without-hover](#p-detail-without-hover)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-color-never-alone](#p-color-never-alone)、[P-menu-architecture](#p-menu-architecture)、[P-text-size-floor](#p-text-size-floor)、[P-hudless-tax](#p-hudless-tax)、[P-motif-from-world](#p-motif-from-world) 等 27 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.10 工厂与自动化

参考卡 7 张 · 探索台内容包：factory（铁星工厂）

工厂与自动化里，工厂本身就是主信息：带子颜色、物品图标、机器状态图标都在世界里，HUD 只给建造栏、资源和里程碑。深色面板压倒性（12 张里 11 张），科技树是最有辨识度的二级界面；编程类以代码窗为主体，放置类走网页 / 后台风。

**子类**：物流工厂 / 自动化（Factorio、Dyson Sphere Program、Satisfactory、Beltmatic、Widget Inc.、River Town Factory）；编程自动化 / 编程解谜（The Farmer Was Replaced、A=B、Plasma、Craftomation 101、Autonauts）；放置 / 增量（Melvor Idle、Mr.Mine、Nodebuster、Digseum、The Perfect Tower II）；工厂 + 塔防 / 战斗混合（ShapeHero Factory、The Perfect Tower II、Wall World）；经营型生产（Maltese's Fluffy Onsen）

**证据说明**：genre = factory 只有 7 张（多是编程类与放置类）。为覆盖真正的物流工厂，补看了 11 张标在 builder / survival / strategy 下的同类卡：Factorio、Dyson Sphere Program、Satisfactory、Beltmatic、Autonauts、River Town Factory、Nodebuster、Mr.Mine、Digseum、ShapeHero Factory、The Perfect Tower II，合计 18 张。对照图 strategy 批 sheet-02 / 03 / 06 / 08 / 09 / 14 / 15 / 16 + life 批 sheet-15，单图放大 Factorio、Dyson Sphere Program、Beltmatic、Widget Inc.、Craftomation 101、The Farmer Was Replaced。局限：Factorio、Autonauts、Satisfactory 的商店图几乎全是纯画面，HUD 编码置信度低。

**关键发现**

- 工厂本身是主信息：商店图里 HUD 很少，信息靠世界内的带子颜色、物品图标、机器状态图标（Factorio 带子按等级分黄 / 红 / 蓝，Beltmatic 每个物品直接写数字）；HUD 只给建造栏、资源和里程碑。
- 深色面板 11 / 12：科幻切角半透明（Dyson Sphere Program、Satisfactory、Plasma）与暗色细线（Factorio、Widget Inc.）占了一大半——让彩色物流在深底上跳出来。
- 科技 / 解锁树是这个品类最有辨识度的二级界面：18 张里 6 张编码了树状排布，连线多用电路走线或直线方框。
- 编程类把代码编辑器当 UI 主体：等宽字、深色窗口，要么浮在世界上（The Farmer Was Replaced），要么整屏终端（A=B）。
- 放置类走网页 / 后台风（左导航 + 卡片网格 + 长列表 + 大数字），与物流工厂同名但是完全不同的 UI 语言。
- 建造栏几乎都在底部中间（Factorio 快捷栏、Dyson Sphere Program、River Town Factory、Beltmatic），大型建造菜单则按键呼出成模态大面板（Satisfactory）。

**一眼要知道什么**

1. 产线在转吗：哪台机器停了、为什么停（缺料 / 缺电 / 出口堵塞 / 没设配方）
2. 物流往哪走、带上是什么：方向箭头 + 物品颜色 / 图标 / 数字（Factorio 带子等级色、Beltmatic 物品上的数字）
3. 产量够不够：当前速率 vs 需求速率，瓶颈在哪（Beltmatic 中央枢纽 2k / 4k）
4. 下一个里程碑要什么、我有多少（Widget Inc. 左上“当前里程碑 0 / 961”、配方提示里的有 / 需 21 / 21 与 4 / 34）
5. 电够不够（Dyson Sphere Program 底部建造栏旁的能量条）
6. 我手上拿的是什么、现在处于放置 / 拆除 / 复制哪种模式（Beltmatic 底栏的复制 / 粘贴 / 剪切 / 清除 / 拆除）
7. （编程类）程序跑到哪一步、在运行还是暂停（The Farmer Was Replaced 代码窗的运行 / 停止，Craftomation 101 底部播放 / 暂停 / 单步 + 电量）
8. （放置类）每秒 / 每分钟产出多少、下一次升级多少钱、离线时攒了多少

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 分散组件 + 底部中央建造栏 / 快捷栏，小地图或雷达在一角 | 4 / 18（Factorio、Dyson Sphere Program、River Town Factory 卡片编码；Beltmatic 为看图补充） | Factorio（steam:427520）、Dyson Sphere Program（steam:1366540）、River Town Factory（steam:2281410）、Beltmatic（steam:2674590） | HUD 组织方式 = 分散组件；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；资源 / 货币 · 屏幕锚点 = 左上；小地图 / 罗盘：画法 = 圆环雷达；小地图 / 罗盘 · 屏幕锚点 = 右下 |
| 浮动代码窗 / 节点图压在世界上，世界是程序的执行结果 | 4 / 18（The Farmer Was Replaced、Plasma、A=B、Craftomation 101） | The Farmer Was Replaced（steam:2060160）、Plasma（steam:1409160）、A=B（steam:1720850）、Craftomation 101: Programming & Craft（steam:1724140） | 容器 = 可拖动窗口；正文字族 = 等宽 / 终端；面板明度 = 深色面板；背后画面来源 = 实时场景 |
| 网页式左右分栏：左侧导航长列表 + 右侧卡片网格 / 长列表（放置类） | 3 / 18（Melvor Idle、Craftomation 101 右侧指令列表、The Perfect Tower II 工坊长列表） | Melvor Idle（steam:1267910）、Craftomation 101: Programming & Craft（steam:1724140）、The Perfect Tower II（steam:1197260） | 分区方式 = 左右分栏；分区导航 = 左侧页签；列表行字段 = 图标 / 头像 + 标题 + 进度；信息密度 = 极密 |
| 模态建造大面板：分类页签 + 图标方格 + 右侧详情 | 3 / 18（Satisfactory 建造菜单、Plasma 零件库、Maltese's Fluffy Onsen 装饰弹窗） | Satisfactory（steam:526870）、Plasma（steam:1409160）、Maltese's Fluffy Onsen（steam:3404470） | 容器 = 居中弹窗；分区导航 = 左侧页签；格子结构 = 方格；图标风格 = 3D 渲染；背后画面来源 = 实时场景 |
| 画在玩法区外的边框里：铁 / 木框侧栏承载资源与进度 | 2 / 18（Mr.Mine 左右铁框竖条、ShapeHero Factory 四周木框） | Mr.Mine（steam:1397920）、ShapeHero Factory（steam:2389040） | HUD 组织方式 = 画在玩法区外的边框里；外框材质 = 铁 / 钢 / 拉丝金属；装饰预算 = 中；外框结构 = 平框九宫格 |
| 工厂即信息：几乎无 HUD，机器上叠空间内状态图标，拉远图标化 | 商店图里 2 / 18 几乎看不到 HUD（Factorio、Autonauts）；Factorio 卡片编码了机器状态叠层 | Factorio（steam:427520）、Autonauts（steam:979120） | 信息密度 = 极简；HUD 显隐策略 = 情境显现；信息叠层 / 图例：画法 = 状态图标 + 方向箭头；信息叠层 / 图例 · 放置方式（逐元素） = 空间内；语义缩放 = 拉远图标化 |

**关键元素与画法**

- **建造栏 / 系统入口条**（`el.toolbar`）：buttonRow / categoryTabs；常见位置 bc。建造入口是工厂 HUD 的主体：Dyson Sphere Program 底部中间图标排 + 能量条；Beltmatic 底栏带文字标签的工具（传送带 / 桥 / 采集器 / 加法器 / 乘法器）+ 编辑工具；River Town Factory 底部木条；Satisfactory 按键呼出分类大面板。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：hotbar；常见位置 bc。Factorio / Dyson Sphere Program 的快捷栏放“手上要放的建筑”，与建造栏合一；数字键对应格子。
- **信息叠层 / 图例**（`el.overlay`）：statusIcons / arrows / buildGrid / heatmap；常见位置 diegesis=spatial、worldRender=decal。机器状态（缺料 / 缺电 / 满仓）用空间内图标 + 颜色 + 动画三重编码（06 文档 A10）；带子方向箭头任何缩放都要可读；Craftomation 101 用彩色曲线画机器人路线；建造时的网格贴花。信息模式（叠配方图标）是可读性的关键补丁。
- **资源 / 货币**（`el.resources`）：iconNumber / bigNumber；常见位置 tl、tc、tr。图标 + 缩写数字一行（The Farmer Was Replaced 左上 9k / 10.1k / 6.1k；Widget Inc. 右上）；放置类改成大号数字并顶部居中（Mr.Mine 顶部密集资源表、Melvor Idle）。数字会涨到很大，缩写规则是必需品。
- **目标 / 路点**（`el.objective`）：text / checklist；常见位置 tl、center。里程碑驱动：Widget Inc. 左上“当前里程碑：第 3 阶段 0 / 961”；Beltmatic 把目标做成地图中央的枢纽（当前数字 + 速率 2k / 4k + 等级），目标本身是世界里的物件。
- **价格 / 消耗**（`el.cost`）：haveNeed / slots / inButton；常见位置 attachTo=cursor。配方 / 建造的材料有 / 需：Widget Inc. 悬停提示里“21 / 21 基础零件、4 / 34 旋转零件”；Maltese's Fluffy Onsen 装饰格下方的价签；放置类升级按钮内嵌价格（Digseum）。
- **选中信息面板**（`el.selection`）：tooltip / panel；常见位置 attachTo=cursor、mr。机器 / 建筑详情：Widget Inc. 用跟随光标的 tooltip（名称 + 说明 + 有 / 需 + 右键取消）；Beltmatic 升级面板是半透明蓝表格；大型工厂需要常驻面板显示配方、进度与输入输出。
- **世界 / 社会态势条**（`el.meter`）：withIcon / single；常见位置 bc、bl。电力 / 能源是全局约束：Dyson Sphere Program 底部建造栏左侧的能量条；Wall World 左下多根竖条资源计。
- **小地图 / 罗盘**（`el.minimap`）：radar / plan；常见位置 bl、br。Dyson Sphere Program 左下是星球雷达（球面）+ 坐标，右下是一组圆形系统按钮；平面工厂多用全屏地图而不是常驻小地图。
- **倍速 / 暂停 / 自动**（`el.gameSpeed`）：playFF / speedBar；常见位置 bc、tr。编程类的执行控制：Craftomation 101 底部暂停 / 播放 / 单步 + 电量百分比；The Farmer Was Replaced 每个代码窗自带运行 / 停止。
- **通知 / 大字提示**（`el.notify`）：toast / modalCard；常见位置 tr、center。研究完成、机器故障用不阻断的提示；放置类的“欢迎回来”离线收益汇总是居中弹窗（Melvor Idle）。
- **计时 / 分数 / 回合**（`el.timer`）：number；常见位置 tc。工厂 + 塔防混合才需要：ShapeHero Factory 顶部中间波次倒计时，The Perfect Tower II 顶部“WAVE 15 / 100”。

**子类画像**

- **物流工厂**：时间模型 = 实时；HUD 组织方式 = 分散组件；语义缩放 = 拉远图标化；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右上；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左上；信息叠层 / 图例：画法 = 状态图标 + 方向箭头 + 建造网格；信息叠层 / 图例 · 放置方式（逐元素） = 空间内；世界 / 社会态势条：画法 = 图标 + 仪表；世界 / 社会态势条 · 屏幕锚点 = 下中；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 左上；面板明度 = 深色面板；信息密度 = 密集。与现有 layout.factory 预设相比，多了能源条（el.meter）与里程碑（el.objective）。
- **编程自动化**：容器 = 可拖动窗口；背后画面来源 = 实时场景；正文字族 = 等宽 / 终端；倍速 / 暂停 / 自动：画法 = ▶ / ▶▶；倍速 / 暂停 / 自动 · 屏幕锚点 = 下中；资源 / 货币：画法 = 图标 + 数字；资源 / 货币 · 屏幕锚点 = 左上；条目排布几何 = 树 / 连线；连线样式 = 直线；面板明度 = 深色面板。A=B 版改 lay.container = fullscreen + ast.container = crt。
- **放置 / 增量**：分区方式 = 左右分栏；分区导航 = 左侧页签；资源 / 货币：画法 = 大号数字；资源 / 货币 · 屏幕锚点 = 上中；数值变化 = 数字滚动；列表行字段 = 图标 / 头像 + 标题 + 数值 / 战力 + 行内按钮；价格 / 消耗：画法 = 按钮内嵌价 / 消耗；通知 / 大字提示：画法 = 居中弹窗卡；信息密度 = 极密。Melvor Idle 式网页后台风；注意 UI 缩放（见 pitfalls）。
- **工厂 + 塔防混合**：HUD 组织方式 = 画在玩法区外的边框里；外框材质 = 木；内芯材质 = 羊皮纸；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 上中；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；UI 像素化 = 与世界同网格；内芯结构 = 材质平铺；外框结构 = 平框九宫格。ShapeHero Factory 式。

**重要界面**

- **局内 HUD**：建造栏 / 快捷栏底部中间、资源一行在上沿、能源条贴着建造栏；状态与物流信息全在世界里。深色面板 11 / 12。 例：Factorio（steam:427520）、Dyson Sphere Program（steam:1366540）、Beltmatic（steam:2674590）。
- **建造菜单**：建造菜单：常驻底栏（Dyson Sphere Program、Beltmatic）或按键呼出的模态大面板（Satisfactory：暗色半透明 + 橙色强调 + 分类图标格；Plasma：3D 渲染零件方格；Maltese's Fluffy Onsen：木框 + 左侧竖排图标页签 + 价签）。 例：Satisfactory（steam:526870）、Plasma（steam:1409160）、Maltese's Fluffy Onsen（steam:3404470）、Dyson Sphere Program（steam:1366540）。
- **制作 / 合成**：配方 / 制造：输入 → 输出 + 有 / 需；The Perfect Tower II 的工厂页是红色大色块 + 机器图标格 + 底部库存；Widget Inc. 的制造器把配方放在悬停提示里。 例：The Perfect Tower II（steam:1197260）、Widget Inc.（steam:3184110）。
- **技能树 / 成长**：研究 / 解锁树：电路走线 + 方块节点（Widget Inc.）、发光点节点 + 转生入口（Nodebuster）、方框 + 直线（Digseum、The Farmer Was Replaced）；节点上写等级 / 价格，买不起变暗。 例：Widget Inc.（steam:3184110）、Nodebuster（steam:3107330）、Digseum（steam:3361470）、The Farmer Was Replaced（steam:2060160）。
- **图鉴 / 收集 / 成就**：物品百科：Craftomation 101 的百科是米黄纸卡 + 物品方格 + 右侧详情。 例：Craftomation 101: Programming & Craft（steam:1724140）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 模拟 / 策略工具面板（`fam.sim-panel`）（4 张）：工厂与编程解谜：调试表格与代码窗是一等公民。
- 像素木框（`fam.pixel-wood`）（1 张）：小规模手工坊（River Town Factory 国风像素工厂、Maltese's Fluffy Onsen）：木框 + 米黄纸内芯，适合规模小、节奏慢的生产。
- 科幻 HUD（`fam.scifi`）（1 张）：Plasma：蓝图网格上的节点编辑器，标题条按类型着色。
- 扁平 / Material（`fam.flat`）（1 张）：Melvor Idle、Craftomation、Polytopia、Perfect Tower II：数据密集或手游移植。

**代表作**

- Factorio（steam:427520）〔模拟 / 策略工具面板〕：Factorio：工厂本身就是信息——带子按等级分色、管道与物品可辨、机器上叠状态图标；HUD 让位给世界。UI 提及 62 条里 59 条好评。
- Dyson Sphere Program（steam:1366540）〔科幻 HUD〕：Dyson Sphere Program：深色半透明切角科幻条、底部建造栏 + 能量条、左下星球雷达、右下圆形系统按钮簇；戴森球本身是巨型全息结构。
- Beltmatic（steam:2674590）〔扁平几何 · 地图即界面〕：Beltmatic：极简工厂——每个物品直接写数字，地图中央枢纽显示目标与速率，底栏是带文字的工具；规则全在世界里。
- Widget Inc.（steam:3184110）〔模拟 / 策略工具面板〕：Widget Inc.：左上里程碑计数、悬停提示里的有 / 需、电路式科技树——小体量工厂的完整信息链。
- The Farmer Was Replaced（steam:2060160）〔模拟 / 策略工具面板〕：The Farmer Was Replaced：代码窗浮在体素农田上，资源一行在左上用缩写数字；编程类“世界 = 程序结果”的版式。
- Craftomation 101: Programming & Craft（steam:1724140）〔扁平 / Material〕：Craftomation 101：右侧橙色指令长列表 + 顶部程序页签 + 彩色曲线路线 + 底部播放控制；百科是米黄纸卡。
- Nodebuster（steam:3107330）〔CRT 终端〕：Nodebuster：电路板式直角连线 + 发光方块节点 + 等宽像素字的升级树。
- Satisfactory（steam:526870）〔科幻 HUD〕：Satisfactory：第一人称工厂的模态建造面板（暗色半透明 + 橙色强调）；去重后提到 UI 的 93 条里 87 条好评，另有背包 1、菜单 1 条抱怨。
- A=B（steam:1720850）〔模拟 / 策略工具面板〕：A=B：纯黑白细线框 + 等宽字，只有题目、代码区、测试用例三块——编程解谜的最小 UI。
- ShapeHero Factory（steam:2389040）〔羊皮纸任务书〕：ShapeHero Factory：工厂 + 塔防混合，四周木框 + 羊皮纸地面，路线选择是羊皮纸地图上的虚线节点。
- River Town Factory（steam:2281410）〔像素木框〕：River Town Factory：国风像素工厂，底部木条物品栏 + 右上小木牌时间，证明工厂类也能走温暖手工风。

**坑**

- 建造 / 制作菜单层级深、分类不直观，找一个建筑要翻好几层 例：Dyson Sphere Program（steam:1366540）、Satisfactory（steam:526870）。
  - 评价与证据（依据：评测）：Dyson Sphere Program：去重后菜单 / 界面难用 3 条（全库这一类前列），另有 1 条说 UI 太小伤眼；Satisfactory：背包 / 物品管理 1 条、菜单难用 1 条。
- 网页式固定尺寸 UI 不随分辨率 / 显示器缩放 例：Melvor Idle（steam:1267910）。
  - 评价与证据（依据：评测）：Melvor Idle：去重后 UI 缩放 / 分辨率 1 条；UI 提及 22 条里 8 条差评。证据很弱。
- 机器全是金属灰褐色、彼此没有色相区分；状态只靠红绿灯
  - 评价与证据（依据：截图）：无直接评测证据；来自 06 文档 A10 美术陷阱。看图正例：Factorio 用带子等级色（黄 / 红 / 蓝）与管道色把物流分开，Beltmatic 用纯色方块区分机器。
- 大量机器同步运动形成动画噪声，盖过真正的状态变化
  - 评价与证据（依据：文献）：无直接评测证据；06 文档 A10 美术陷阱。
- 放置 / 增量 UI 的数字涨到很大后，完整位数、缩写、科学计数法混用，长列表与大色块一起堆满屏 例：The Perfect Tower II（steam:1197260）、Mr.Mine（steam:1397920）。
  - 评价与证据（依据：评测）：弱证据：The Perfect Tower II 去重后提到 UI 的 14 条里 7 条差评（关键词未归入具体类别，菜单难用 1 条）；数字混排来自看图。
- 编程类的规则 / 语法说明不足 例：The Farmer Was Replaced（steam:2060160）、A=B（steam:1720850）。
  - 评价与证据（依据：评测）：弱证据：The Farmer Was Replaced、A=B 各有引导不清 1 条（未达 ≥ 2 条的出处门槛）。
- 工厂与战斗混合时两套信息逻辑打架（工厂要密集信息，战斗要清场视野） 例：Wall World（steam:2187290）、ShapeHero Factory（steam:2389040）。
  - 评价与证据（依据：评测）：弱证据：Wall World 去重后提到 UI 的 23 条里 10 条差评（未归入具体类别）；ShapeHero Factory 评测样本只有 10 条。

**可演示的对比**

- **机器状态：彩色圆点 vs 图标 + 警示（绿色盲模拟下看）**（单变量对照；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：警示表达：自动 → 黄三角图标；状态标识形态：彩色圆点 → 图标
  - 看什么：色盲模拟下“运转 / 缺料 / 缺电”是否还分得开；b 的图标在最远缩放下会不会糊成噪点。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `el.overlay.form=statusIcons` `el.overlay.diegesis=spatial` `chk.cvd=deutan` `cnt.screen=screen.hud` `chk.redundancy=true`
  - A：`st.statusMark=dot` `st.alert=auto`
  - B：`st.statusMark=icon` `st.alert=warnIcon`

  </details>
- **拉远：保持模型 vs 图标化（信息模式）**（单变量对照；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息叠层 / 图例：画法：方向箭头 → 状态图标 + 方向箭头；语义缩放：无 → 拉远图标化
  - 配套改动：信息叠层 / 图例 · 显隐（逐元素）：继承 → 按键呼出
  - 看什么：缩到最远时，带子方向和物品种类是否还可读（06 文档 A10 的“100×100 工厂”测试）；按键呼出的配方图标叠层能不能替代逐台点开。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `cnt.screen=screen.hud`
  - A：`rel.semanticZoom=none` `el.overlay.form=arrows` `el.overlay.visibility=inherit`
  - B：`rel.semanticZoom=iconize` `el.overlay.form=statusIcons+arrows` `el.overlay.visibility=onDemand`

  </details>
- **研究树连线：电路走线 + 发光点 vs 星图散点 + 曲线**（单变量对照；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：节点形态：发光点 → 圆形编号；条目排布几何：树 / 连线 → 星图散点；连线样式：电路走线 → 曲线
  - 看什么：依赖关系是否一眼可追（电路走线横平竖直更像“工程图”）；节点上的等级 / 价格放得下吗。
  - 注：`vis.connector` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `cnt.screen=screen.skilltree` `col.lightness=dark`
  - A：`lay.arrangement=tree` `vis.connector=circuit` `cmp.node=glowDot`
  - B：`lay.arrangement=constellation` `vis.connector=curve` `cmp.node=circleNumber`

  </details>
- **代码与世界：浮动窗口压在农田上 vs 整屏终端**（单变量对照；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：面板明度：深色面板 → 中明度；容器：可拖动窗口 → 全屏页；背后画面来源：实时场景 → 自动
  - 配套改动：场景容器：无 → CRT 电视 / 电脑终端
  - 看什么：The Farmer Was Replaced 式“边写边看结果”与 A=B 式“只看代码和测试”的取舍：世界是否还在讲故事。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `typ.body.family=mono` `cnt.screen=screen.hud` `col.strategy=mono` `vis.ornament=0`
  - A：`lay.container=window` `rel.behind=live` `col.lightness=dark` `ast.container=none`
  - B：`lay.container=fullscreen` `ast.container=crt` `col.lightness=mid` `rel.behind=auto`

  </details>
- **资源读数：图标 + 缩写数字 vs 大号滚动数字**（整套做法对照（多个参数一起变）；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：资源 / 货币 · 屏幕锚点：左上 → 上中
  - 配套改动：资源 / 货币：画法：图标 + 数字 → 大号数字；资源 / 货币 · 内部排布：横排 → 继承；数值变化：瞬变 → 数字滚动；数字字体：等宽数字 → 大号展示数字；资源 / 货币 · 大小 / 突出度：1 → 1.6
  - 看什么：物流工厂要同时盯 6–10 种资源（a），放置类只盯一个主数字涨（b）；数字滚动会不会让人读不出当前值。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `cnt.screen=screen.hud`
  - A：`el.resources.form=iconNumber` `el.resources.arrangement=row` `el.resources.screenAnchor=tl` `mo.valueChange=instant` `typ.numerals.family=tabular` `el.resources.scale=1`
  - B：`el.resources.form=bigNumber` `el.resources.scale=1.6` `el.resources.screenAnchor=tc` `mo.valueChange=countUp` `typ.numerals.family=display` `el.resources.arrangement=inherit`

  </details>
- **建造入口：底部常驻图标排 vs 按键呼出的分类大面板**（整套做法对照（多个参数一起变）；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：格子结构：自动 → 方格；建造栏 / 系统入口条：画法：图标按钮排 → 分类页签 + 子项抽屉；建造栏 / 系统入口条 · 屏幕锚点：下中 → 自动；容器：自动 → 居中弹窗
  - 配套改动：建造栏 / 系统入口条 · 显隐（逐元素）：常驻 → 继承；进入方式：自动 → 按键呼出；分区导航：自动 → 左侧页签
  - 看什么：建筑种类 < 20 时常驻底栏更快（Beltmatic、Dyson Sphere Program）；种类上百时模态面板更好找但打断操作（Satisfactory，菜单抱怨的来源之一）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `cnt.screen=screen.hud`
  - A：`el.toolbar.form=buttonRow` `el.toolbar.screenAnchor=bc` `el.toolbar.visibility=always` `cmp.slot=auto` `flow.entry=auto` `lay.container=auto` `lay.nav=auto`
  - B：`el.toolbar.form=categoryTabs` `lay.container=modal` `lay.nav=tabsLeft` `cmp.slot=cell` `flow.entry=hotkey` `el.toolbar.screenAnchor=auto` `el.toolbar.visibility=inherit`

  </details>
- **面板皮肤：科幻切角半透明 vs 像素木框米黄纸**（整套做法对照（多个参数一起变）；内容包：factory · 铁星工厂；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：程序线框 → 平框九宫格；面板明度：深色面板 → 浅色面板；图标风格：线性 → 像素
  - 配套改动：转角：切角 → 直角；底不透明度：0.6 → 1；内芯结构：程序填充 → 材质平铺；UI 像素化：自动 → 与世界同网格
  - 看什么：同样的产线信息在两种皮里层级是否一致；木框适合小规模手工坊（River Town Factory），大规模物流（Dyson Sphere Program）需要退后的半透明面板。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-factory#d6` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=factory` `vis.stroke=solid` `cnt.screen=screen.hud` `ast.coreMat=paper` `ast.frameMat=wood`
  - A：`vis.corner=chamfer` `vis.opacity=0.6` `col.lightness=dark` `vis.iconStyle=line` `ast.core=procedural` `ast.frame=procedural` `vis.pixelScale=auto`
  - B：`vis.pixelScale=world` `vis.iconStyle=pixel` `col.lightness=light` `ast.core=texture` `ast.frame=plainNinePatch` `vis.corner=sharp` `vis.opacity=1`

  </details>

**样例内容**：工厂与自动化（`factory#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（8 项）</summary>

- 生产速率 / 吞吐（当前 vs 需求、每分钟）没有专门的数值标注：elx.valueLabel 没有“速率”项，st.statViz 也没有流量图或产量折线。建议 elx.valueLabel 增加 rate（/ 秒、/ 分），st.statViz 增加 flow / lineChart。
- 配方 / 输入输出（A + B → C）没有组件形态：el.cost.form = slots 只覆盖“材料格”。建议 cmp.recipe：横向箭头式 / 纵向列表式 / 节点图。
- 建造模式状态（放置 / 拆除 / 复制 / 蓝图）没有参数：拆除模式整屏变红、复制模式框选高亮是工厂品类标配（Beltmatic 底栏有复制 / 粘贴 / 剪切 / 拆除）。建议 ix.buildMode，或 el.toolbar 增加模式指示。
- 大数缩写与计数法（K / M / B、科学计数、工程计数）没有参数：typ.numerals 只管字体。建议 typ.numerals.notation：完整 / 缩写 / 科学 / 工程。
- 节点编程画布 / 代码编辑器没有界面子类型：cnt.subtype 里没有“编程 / 节点图”，只能用 lay.container = window + typ.body.family = mono 近似。建议 cnt.subtype 增加 programming，cmp 增加 codeEditor / nodeGraph。
- 物流网络叠层（电网覆盖、管网、机器人作业范围）只能用 el.overlay.form = rangeRing 近似。建议 el.overlay.form 增加 network。
- 世界内的物品 / 目标标签（Beltmatic 每个物品上的数字、中央枢纽的目标读数）没有对应元素，与策略的 el.worldLabel 缺口是同一件事。
- 放置类的“离线收益 / 欢迎回来”汇总没有模板，只能用 el.notify.form = modalCard 近似（Melvor Idle）。

</details>

**最相关的原则**（按针对性排序）：[P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-progression-graph](#p-progression-graph)、[P-color-never-alone](#p-color-never-alone)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-value-change-visible](#p-value-change-visible)、[P-menu-architecture](#p-menu-architecture)、[P-text-size-floor](#p-text-size-floor)、[P-medium-simulation](#p-medium-simulation)、[P-confirm-by-input](#p-confirm-by-input)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-material-from-world](#p-material-from-world)、[P-in-game-charts](#p-in-game-charts) 等 16 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.11 生活与养成

参考卡 20 张 · 探索台内容包：farming（农场日记）

生活与养成的 HUD 只回答「今天、体力、手上、钱、谁」，而且要能完全退场——零 HUD / 物件即界面是这个品类最大的一组（20 款里 8 款）。风格多为圆润友好、手绘笔记本、像素木框与白卡；粉彩同明度、交互物与装饰一样显眼是主要的坑。

**子类**：像素种田 RPG（Stardew Valley、Fields of Mistria）；治愈岛屿 / 收集（Animal Crossing New Horizons、Cozy Grove）；店铺经营 / 炼金（Potion Craft、Potionomics）；家庭养成 / 日程表（Chinese Parents）；拍照 / 探索收集（TOEM、Alba、Umurangi Generation、Little Kitty, Big City）；玩具 / 整理 / 装饰（Tiny Glade、Unpacking）；手作 / 涂绘冒险（Chicory、Lil Gator Game）；情绪 / 节奏小品（Melatonin、Hauntii）；竖屏恋爱养成手游（光与夜之恋、以闪亮之名、恋与深空——只研究对话、捏脸与前端，不研究抽卡运营）

**一眼要知道什么**

1. 今天是哪天、几点、什么季节和天气？离天黑 / 店铺关门 / 节日还有多久？
2. 我的体力 / 精力还够做几件事？
3. 手上拿的是什么工具 / 种子，还剩几个？快捷栏里还有什么？
4. 钱有多少？（通常只有 1–2 种货币）
5. 谁在附近、谁今天有事找我、和谁的关系到了哪一步？
6. 这块地 / 这株作物 / 这件家具现在是什么状态（要浇水、可收获、可摆放）？
7. 收集 / 图鉴 / 委托还差什么？（软目标，不是强制任务）
8. 这一刻能不能什么都不看，只看画面？（治愈类的 HUD 要能退场）

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 像素种田模板：右上「季节 · 星期 · 时间 · 钱」一块 + 下中数字快捷栏 + 底部头像对话框 | 2 / 20（Stardew Valley、Fields of Mistria），3 张编码了时钟的卡全是日历页；邻近的 DRAGON QUEST BUILDERS 2 也是下中物品栏 | Stardew Valley（steam:413150）、Fields of Mistria（steam:2142790）、DRAGON QUEST BUILDERS 2（steam:1072420） | HUD 组织方式 = 分散组件；信息密度 = 稀疏；时间 / 天气 / 日历：画法 = 日历页；时间 / 天气 / 日历 · 屏幕锚点 = 右上；资源 / 货币 · 屏幕锚点 = 右上；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；对话框结构 = 底部通栏；UI 像素化 = 与世界同网格；UI 与画面关系 = 同一媒介 |
| 侧边竖排功能列 + 角落小数字（手绘治愈 / 店铺）：功能多但每项都小，下方留给对话 | 2 / 20（Cozy Grove 左侧工具 + 右侧日记竖列、左下金币、右下小字时间；Potionomics 左上日夜圆盘 + 左侧一整列功能清单） | Cozy Grove（steam:1458100）、Potionomics（steam:1874490） | HUD 组织方式 = 分散组件；信息密度 = 中等；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 左中；建造栏 / 系统入口条 · 内部排布 = 竖列；按钮内容 = 图标 + 文字；资源 / 货币 · 屏幕锚点 = 左下；时间 / 天气 / 日历 · 屏幕锚点 = 右下；图标风格 = 手绘彩绘；转角 = 圆角 |
| 零 HUD / 物件即界面：房间、照片、画布本身就是 UI，完成时才出现一张卡 | 信息密度极简 8 / 20（Unpacking、Tiny Glade、Melatonin、Chicory、Hauntii、Umurangi Generation、Little Kitty、Alba），是这个品类最大的一组 | Unpacking（steam:1135690）、Tiny Glade（steam:2198150）、Melatonin（steam:1585220）、Chicory: A Colorful Tale（steam:1123450） 等 5 款 | 信息密度 = 极简；容器 = 直接叠加；HUD 显隐策略 = 电影模式（全隐）；默认放置方式 = 叙事内；UI 与画面关系 = 同一媒介 |
| 整部作品是一本书：UI 是书页的一部分（同一媒介边栏 + 羊皮纸地图） | 1 / 20 完整（Potion Craft：右侧原料竖栏、中间炼金台、地图是羊皮纸上的配方航线）；Lil Gator Game 的贴纸练习本背包同理 | Potion Craft: Alchemist Simulator（steam:1210320）、Lil Gator Game（steam:1586800） | HUD 组织方式 = 贴边整条；信息密度 = 密集；外框材质 = 羊皮纸；面板明度 = 浅色面板；标题字族 = 衬线；地图画风 = 羊皮纸古海图；UI 与画面关系 = 同一媒介；图标风格 = 手绘彩绘；外框结构 = 平框九宫格 |
| 养成日程表（极密）：左上头像 + 属性列（带每回合增量）、右侧日程卡、底部系统按钮 | 1 / 20（Chinese Parents，信息密度 4）；Potionomics（密度 3）把日程拆进左侧功能列 | Chinese Parents（steam:736190）、Potionomics（steam:1874490） | HUD 组织方式 = 贴边整条；信息密度 = 极密；分区方式 = 三栏；身份 / 头像 / 等级：画法 = 头像 + 等级；身份 / 头像 / 等级 · 屏幕锚点 = 左上；资源 / 货币 · 屏幕锚点 = 上中；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中；统计图形 = 纯数字表；面板明度 = 浅色面板；描边线型 = 实线 |
| 叙事内设备：相机 / 手机 / 取景器就是界面 | 4 / 20（Alba 主角手里的手机、Umurangi Generation 取景器、TOEM 相机 / 相册 / 社区卡、Unpacking 结束时的贴纸照片） | Alba: A Wildlife Adventure（steam:1337010）、Umurangi Generation（steam:1223500）、TOEM（steam:1307580） | 默认放置方式 = 叙事内；场景容器 = 手机；界面子功能 = 拍照模式；主行动按钮：画法 = 快门；信息密度 = 极简 |
| 竖屏白卡细线（恋爱养成手游的对话与捏脸）：上半 3D 角色、下半白底细线卡 + 缩略图横排 + 滑条 | 3 / 20（全部来自 GameUI 竖屏手游，只取到前端 / 对话 / 捏脸） | 恋与深空（叠纸游戏）（gameui:12326）、光与夜之恋（腾讯）（gameui:2638）、以闪亮之名（祖龙娱乐）（gameui:4865） | 画幅朝向 = 竖屏；面板明度 = 浅色面板；分区方式 = 上下分栏；主角色呈现介质 = 3D 实时模型；设置项：多选一 = 缩略图；设置项：数值 = 滑条；描边线型 = 实线 |

**关键元素与画法**

- **时间 / 天气 / 日历**（`el.clock`）：calendar / sunDial / clock / weather；常见位置 tr、tl、br。生活模拟的第一问题是「今天还剩多少时间」。像素种田的右上块同时放季节、星期、时间、天气（Stardew、Fields of Mistria），Potionomics 左上日夜圆盘 + 第几天，Cozy Grove 右下只有一行小字时间。时间精度决定压力：十分钟一跳的数字让人规划，日夜盘只给「上午 / 午后 / 夜」，压力更小。
- **资源 / 货币**（`el.resources`）：iconNumber / pills / bigNumber；常见位置 tr、tl、bl、tc。钱通常只有 1–2 种，小号放在时钟块下面（Stardew、Fields of Mistria）或角落胶囊（Cozy Grove 左下、Lil Gator 左上、Hauntii 左上一串符号）。Potionomics 用滚轮式计数器强调「做生意」主题。5 张标了锚点的卡分散在左上 2、右上 1、上中 1、左下 1，说明它不是视觉重点。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：hotbar；常见位置 bc、ml。工具 / 种子 / 物品快捷栏：下中横排 10–12 格并标数字键（Stardew、Fields of Mistria）；Cozy Grove 改成左侧竖列，把下方留给对话。选中格要明显（放大或亮框），数量角标放右下。
- **生命 / 护盾 / 体力**（`el.vitals`）：bar / segmented；常见位置 tl、br。（el.vitals 没有自己的画法参数，形态取 cmp.gauge@el.vitals。）体力 / 精力是「今天还能干几件事」：Fields of Mistria 左上一条细绿条。它不是战斗血条，不需要醒目，但快耗尽时要变色或闪动。
- **建造栏 / 系统入口条**（`el.toolbar`）：buttonRow / microMenu；常见位置 ml、bc、mr。生活模拟功能多（种植、装修、外出、日记、图鉴、存档）：Potionomics 左侧一整列带图标的功能清单；Cozy Grove 左侧工具 + 右侧日记竖列；Chinese Parents 底部一排系统按钮；Tiny Glade 只留底部一排很小的工具。功能入口可以多，但每个都要小。
- **对话 / 事件选项**（`el.choices`）：bubbles / buttons / text；常见位置 center、br。对话选项：Animal Crossing 是一串小气泡挂在对话框旁；Fields of Mistria 是深蓝按钮叠在对话框上方；Potionomics 把砍价做成卡牌 + 漫画气泡。
- **目标 / 路点**（`el.objective`）：checklist / marker / note；常见位置 tr、tl。生活模拟的目标是软性的：TOEM 社区卡（一张卡上列本地委托 + 盖章圆格）、Little Kitty 世界里的标记、公告板委托。避免做成常驻任务追踪器。
- **通知 / 大字提示**（`el.notify`）：pickupText / toast / modalCard；常见位置 bl、center。拾取 / 收获 / 新配方的提示要轻：左下小字或小卡。Unpacking 整个房间完成后才弹一张贴纸边框的照片，那是全局唯一的大提示。TOEM 新图鉴是居中的拍立得卡 + OK。
- **身份 / 头像 / 等级**（`el.profile`）：avatarLevel / idCard；常见位置 tl。养成类（Chinese Parents）左上头像 + 名字 + 压力条，下面一列属性 + 每回合增量；角色就是被经营的对象，所以放在第一眼的位置。
- **信息叠层 / 图例**（`el.overlay`）：statusIcons / buildGrid / gridHighlight。地块 / 作物 / 家具状态（要浇水、可收获、可摆放的格子）用世界内的小图标或格子高亮；Tiny Glade 建造时控制点直接浮在建筑上（空间内）。
- **主行动按钮**（`el.cta`）：shutter / round；常见位置 br、bc。拍照类（TOEM、Alba、Umurangi Generation）主按钮就是快门；相机 UI 本身就是界面，主行动只有一个。
- **交互提示**（`el.interact`）：bubble / keyPrompt。NPC 头上的小气泡 / 感叹号表示能对话或有委托；Little Kitty 用黄色小三角标出可互动的东西。治愈类偏爱气泡而不是按键文字。

**重要界面**

- **局内 HUD**：见 hudOrganization。默认极简（密度 0–1 共 15 / 20），面板浅色 8 : 深色 1，圆角 7 张全是圆角；标题字体手写 3、衬线 1。 例：Stardew Valley（steam:413150）、Fields of Mistria（steam:2142790）、Cozy Grove（steam:1458100）、Unpacking（steam:1135690）。
- **对话 / 文本**：两派：底部通栏 + 头像 / 半身（Stardew 木框右侧头像牌、Fields of Mistria 深蓝底 + 左上名牌 + 半身立绘、Cozy Grove 米白圆角卡 + 名牌）对带尾气泡（Animal Crossing 叶形气泡 + 气泡选项、Potionomics 漫画气泡 + 大立绘、Chicory 黑底手写气泡、Hauntii 同色调圆角气泡）。9 张有对话的卡里气泡 6、通栏 3——气泡更「边走边聊」，通栏更像 RPG。 例：Stardew Valley（steam:413150）、Fields of Mistria（steam:2142790）、Animal Crossing New Horizons（iig:animal-crossing-new-horizons）、Potionomics（steam:1874490） 等 5 款。
- **背包 / 物品**：Animal Crossing 米黄圆角格 + 右侧配方（持有 / 需求计数）；Lil Gator Game 贴满贴纸的练习本（撕边纸 + 胶带 + 手写字）；Stardew 木框方格。容器与画风一致比格子数量重要。 例：Animal Crossing New Horizons（iig:animal-crossing-new-horizons）、Lil Gator Game（steam:1586800）、Stardew Valley（steam:413150）。
- **制作 / 合成**：制作 / 炼金：Potion Craft 中央器具 + 右侧原料竖栏，把配方做成地图上的航线；Potionomics 锅 + 原料格 + 属性仪表；Cozy Grove 两页笔记本。制作页常常就是玩法本体，而不是菜单。 例：Potion Craft: Alchemist Simulator（steam:1210320）、Potionomics（steam:1874490）、Cozy Grove（steam:1458100）。
- **图鉴 / 收集 / 成就**：收集 / 图鉴：TOEM 社区卡 + 印章圆格；Little Kitty 黄色圆角卡上的帽子收藏格，未获得用问号剪影。收集是这个品类的长线目标，未获得要能看出「还有」。 例：TOEM（steam:1307580）、Little Kitty, Big City（steam:1177980）。
- **角色 / 装备 / 属性**：属性 / 外观：Chinese Parents 米色条目的属性 + 日程大表；恋与深空竖屏捏脸——上方 3D 角色、下方横排脸型缩略图 + 滑条。 例：Chinese Parents（steam:736190）、恋与深空（叠纸游戏）（gameui:12326）。
- **登录 / 选服 / 创角**：创建角色：Stardew 木框表单（名字、农场名、外观左右切换箭头）；竖屏手游的公告 / 选服是白底细线卡片。 例：Stardew Valley（steam:413150）、以闪亮之名（祖龙娱乐）（gameui:4865）。
- **商店 / 交易**：仅指游戏内用游戏币的交易玩法（非付费商城）：Potionomics 砍价是卡牌 + 漫画气泡 + 大立绘；Potion Craft 左右两人 + 中间天平；Animal Crossing 叶形对话框 + 价格气泡。交易被做成对话或小游戏，而不是商品列表。 例：Potionomics（steam:1874490）、Potion Craft: Alchemist Simulator（steam:1210320）、Animal Crossing New Horizons（iig:animal-crossing-new-horizons）。
- **地图 / 世界地图**：Potion Craft 的地图是羊皮纸上的配方航线（地图即玩法）；探索类（TOEM、Lil Gator）没有可用地图反而被抱怨。 例：Potion Craft: Alchemist Simulator（steam:1210320）、TOEM（steam:1307580）。
- **建造菜单**：装饰 / 建造：Tiny Glade 只有底部一排小工具，控制点浮在建筑上直接拖；Unpacking 没有建造菜单，物品从箱子里一件件取出直接摆。 例：Tiny Glade（steam:2198150）、Unpacking（steam:1135690）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 圆润友好（`fam.cozy`）（5 张）：动物森友会、Little Kitty、Chinese Parents、Alba、Mineko：UI 是生活用品（手机、日记、背包）。
- 二次元白卡细线（`fam.anime-card`）（3 张）：恋爱养成 / 换装：乙女轻奢支。
- 手绘笔记本（`fam.notebook`）（2 张）：养成 / 探索收集把「我的本子」做成图鉴和背包（Lil Gator Game、Chicory）。
- 零 HUD · 世界即界面（`fam.zero-hud`）（2 张）：生活小品（Unpacking）
- 单色线描 · 同一支笔（`fam.mono-line`）（2 张）：拍照 / 漫游小品：相机、相册、集章卡是主界面
- 像素木框（`fam.pixel-wood`）（1 张）：Stardew Valley：像素种田模板（木框 + 米黄内芯 + 与世界同像素），已有现成皮肤 skin.pixelWood。
- 羊皮纸任务书（`fam.parchment`）（1 张）：Potion Craft 整屏是炼金手抄本。
- 像素位图（`fam.pixel`）（1 张）：各 1 张：种田（Fields of Mistria）、像素 RPG（Eastward）、低清 3D 探索（A Short Hike）、Terraria、PS1 恐怖（Crow Country）、Half-Life、Noita、横屏塔防手游。像素 UI 不绑定品类，绑定的是画面媒介。

**代表作**

- Stardew Valley（steam:413150）〔像素木框〕：Stardew Valley：像素种田的通用模板（右上时钟块、下中快捷栏、木框头像对话、木框创角表单）。
- Fields of Mistria（steam:2142790）〔像素位图〕：Fields of Mistria：同一模板的现代变体——右上季节 + 时间 + 星期 + 钱一块、左上体力条、深蓝对话框 + 名牌 + 半身立绘 + 按钮选项。
- Potion Craft: Alchemist Simulator（steam:1210320）〔羊皮纸任务书〕：Potion Craft：整屏是手抄本，地图是羊皮纸上的配方航线，交易是两人 + 天平——同一媒介的极致。
- Potionomics（steam:1874490）〔圆润友好〕：Potionomics：左上日夜圆盘 + 左侧功能清单 + 顶部倒计时牌 + 右上滚轮金币；砍价做成卡牌对话。
- Cozy Grove（steam:1458100）〔圆润友好〕：Cozy Grove：左右竖排手绘图标列 + 左下金币胶囊 + 右下小字时间，下方留给对话，手绘治愈的标准答案。
- Chinese Parents（steam:736190）〔圆润友好〕：Chinese Parents：养成日程表的极密做法（属性 + 每回合增量 + 日程卡 + 底部系统按钮），中式家庭题材。
- TOEM（steam:1307580）〔单色线描 · 同一支笔〕：TOEM：黑白线稿世界配白底粗黑描边的相机 / 相册 / 社区卡；同时是「没有地图」抱怨的出处。
- Unpacking（steam:1135690）〔零 HUD · 世界即界面〕：Unpacking：零 HUD，房间就是界面，完成时一张贴纸照片——「完成感」只用一张卡。
- Tiny Glade（steam:2198150）〔扁平几何 · 地图即界面〕：Tiny Glade：只留底部一排很小的工具，控制点在建造时临时浮在建筑上（空间内）；提到 UI 的 69 条评测里 68 条是好评。原来说它「有 5 条挡视野抱怨」，复核后那些命中说的是可摆放的场景摆件（clutter 道具），已撤回。
- Animal Crossing New Horizons（iig:animal-crossing-new-horizons）〔圆润友好〕：Animal Crossing：米黄圆角背包格 + 配方持有 / 需求、叶形对话框 + 气泡选项。
- Lil Gator Game（steam:1586800）〔手绘笔记本〕：Lil Gator Game：背包是贴满贴纸的练习本（撕边、胶带、手写），容器即人设。

**坑**

- 粉彩 / 治愈画面所有颜色同一明度，HUD 与可交互物糊进背景；冬季雪地里白色物品与白色面板消失。 例：Cozy Grove（steam:1458100）。
  - 评价与证据（依据：截图）：看图：Cozy Grove 的粉彩画面与米白面板同明度。评测证据不足：Cozy Grove 的 3 条「cluttered」说的是岛上场景拥挤或泛指游戏；Tiny Glade 的 5 条说的是可摆放的场景摆件（clutter 道具），都不是 HUD，已移除。明度问题本身来自 06 文档 A11 的陷阱清单。
- 零 HUD 的探索 / 拍照类没有地图或地图太简，玩家迷路、找不到委托对象。 例：TOEM（steam:1307580）、Lil Gator Game（steam:1586800）。
  - 评价与证据（依据：推断）：「地图难用 / 没有地图」去重后：TOEM 4 条、Lil Gator Game 1 条。
- 装饰物太多、交互物与装饰同样显眼，玩家找不到能捡 / 能对话的东西。 例：Cozy Grove（steam:1458100）、Potion Craft: Alchemist Simulator（steam:1210320）。
  - 评价与证据（依据：文献）：无专门统计；06 文档 A11 陷阱。Potion Craft 有 1 条评测说书页上的标签太多、互相重叠，可作旁证。
- 像素种田的背包 / 菜单在早期版本被零星抱怨：格子翻页、整理与比较不便。 例：Fields of Mistria（steam:2142790）、Stardew Valley（steam:413150）。
  - 评价与证据（依据：评测）：Fields of Mistria 背包、菜单、引导各 1 条（未达 ≥ 2 门槛），去重后提到界面的 85 条评测中差评 24 条（整体差评顺带提界面，仅作参考）；Stardew Valley 菜单 1 条。
- 养成日程表信息过密：一屏十几个数字 + 每回合增量，新手看不出哪个最重要。 例：Chinese Parents（steam:736190）。
  - 评价与证据（依据：评测）：评测样本小（Chinese Parents 提到界面 5 条，引导 1 条）；主要是看图观察，建议在演示里配合眯眼层级检查。

**可演示的对比**

- **同一媒介像素木框 vs 零 HUD 玩具**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：平框九宫格 → 程序线框；信息密度：稀疏 → 极简；技能 / 冷却 / 弹药 / 手牌：画法：物品快捷栏 → 自动；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：下中 → 自动
  - 配套改动：HUD 组织方式：分散组件 → 自动；内芯结构：材质平铺 → 程序填充；UI 像素化：与世界同网格 → 自动；正文字族：像素 → 无衬线；UI 与画面关系：同一媒介 → 自动；时间 / 天气 / 日历：画法：日历页 → 自动；时间 / 天气 / 日历 · 屏幕锚点：右上 → 自动；信息元素集合：自动 → 建造栏 / 系统入口条；建造栏 / 系统入口条：画法：自动 → 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点：自动 → 下中；容器：自动 → 直接叠加；HUD 显隐策略：自动 → 情境显现；转角：直角 → 圆角；底不透明度：1 → 0.4
  - 看什么：A 让 UI 和世界用同一种像素与木头，时间和工具一直在；B 只在需要时浮出一排淡色工具。看 A 是否让「过日子」更有节奏感，B 是否更适合没有日程压力的装饰 / 建造玩具。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `ast.frameMat=wood` `ast.coreMat=paper` `cnt.screen=screen.hud`
  - A：`cnt.density=1` `lay.hudOrg=scattered` `ast.frame=plainNinePatch` `ast.core=texture` `vis.pixelScale=world` `typ.body.family=pixel` `rel.harmony=sameMedium` `el.clock.form=calendar` `el.clock.screenAnchor=tr` `el.abilities.form=hotbar` `el.abilities.screenAnchor=bc` `cnt.elements=auto` `el.toolbar.form=auto` `el.toolbar.screenAnchor=auto` `lay.container=auto` `rel.hudVisibility=auto` `vis.corner=sharp` `vis.opacity=1`
  - B：`cnt.density=0` `lay.container=overlay` `rel.hudVisibility=contextual` `cnt.elements=el.toolbar` `el.toolbar.form=buttonRow` `el.toolbar.screenAnchor=bc` `vis.opacity=0.4` `vis.corner=round` `ast.core=procedural` `ast.frame=procedural` `el.abilities.form=auto` `el.abilities.screenAnchor=auto` `el.clock.form=auto` `el.clock.screenAnchor=auto` `lay.hudOrg=auto` `rel.harmony=auto` `typ.body.family=sans` `vis.pixelScale=auto`

  </details>
- **时钟：日历页数字 vs 日夜圆盘**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：时间 / 天气 / 日历：画法：日历页 → 太阳盘 / 日夜钟；时间 / 天气 / 日历 · 屏幕锚点：右上 → 左上
  - 配套改动：时间 / 天气 / 日历 · 数值标注：当前值 → 不标；数字字体：等宽数字 → 自动；数值图形（时间 / 天气 / 日历）：自动 → 圆环
  - 看什么：A 精确到分钟，玩家会算「赶在商店关门前」；B 只给太阳在圆盘上的位置，时间感更松。同一套日程玩法下，哪一个让人更焦虑、哪一个更治愈。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.screen=screen.hud`
  - A：`el.clock.form=calendar` `el.clock.screenAnchor=tr` `el.clock.valueLabel=current` `typ.numerals.family=tabular` `cmp.gauge@el.clock=auto`
  - B：`el.clock.form=sunDial` `el.clock.screenAnchor=tl` `el.clock.valueLabel=none` `cmp.gauge@el.clock=ring` `typ.numerals.family=auto`

  </details>
- **对话：底部通栏 + 半身立绘 vs 带尾气泡**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：底部通栏 → 带尾气泡；主角色呈现介质：半身立绘 → 3D 实时模型；转角：直角 → 圆角
  - 配套改动：主体位置：左 → 自动；标牌：边缘小标签条 → 无（直压）；文字出现：打字机逐字 → 淡入；对话 / 事件选项：画法：按钮 → 聊天气泡
  - 看什么：A 让对话成为「停下来看人」的时刻（立绘大、名牌清楚），B 让对话发生在场景里、角色头顶（不遮挡世界）。参考库里气泡 6 : 通栏 3。看长对话时哪种更累、多人同时说话时哪种更清楚。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.screen=screen.dialogue`
  - A：`cmp.dialogBox=bar` `cnt.characterMedium=bust` `lay.focalSide=left` `cmp.plate=tab` `mo.textReveal=typewriter` `el.choices.form=buttons` `vis.corner=sharp`
  - B：`cmp.dialogBox=bubble` `cnt.characterMedium=model3d` `vis.corner=round` `el.choices.form=bubbles` `mo.textReveal=fade` `cmp.plate=none` `lay.focalSide=auto`

  </details>
- **养成：极密日程表 vs 一次只做一件事**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：按钮内容：自动 → 图标 + 文字；信息密度：极密 → 稀疏；时间 / 天气 / 日历：画法：自动 → 太阳盘 / 日夜钟；时间 / 天气 / 日历 · 屏幕锚点：自动 → 左上
  - 配套改动：HUD 组织方式：贴边整条 → 自动；分区方式：三栏 → 自动；身份 / 头像 / 等级：画法：头像 + 等级 → 自动；身份 / 头像 / 等级 · 屏幕锚点：左上 → 自动；统计图形：纯数字表 → 自动；资源 / 货币 · 屏幕锚点：右上 → 自动；建造栏 / 系统入口条 · 屏幕锚点：下中 → 左中；列表行字段：图标 / 头像 + 标题 + 数值 / 战力 + 行内按钮 → 自动；建造栏 / 系统入口条 · 内部排布：继承 → 竖列；容器：自动 → 直接叠加
  - 看什么：A 把所有属性、增量、日程摊开（适合喜欢算数值的养成玩家）；B 只给一列「今天能做的事」，数值藏到详情里。开眯眼检查看 A 第一眼落在哪里。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `el.toolbar.form=buttonRow` `cnt.screen=screen.hud`
  - A：`cnt.density=4` `lay.hudOrg=edgeBar` `lay.composition=three` `el.profile.form=avatarLevel` `el.profile.screenAnchor=tl` `st.statViz=table` `el.resources.screenAnchor=tr` `el.toolbar.screenAnchor=bc` `cmp.listRow=icon+title+value+action` `cmp.button=auto` `el.clock.form=auto` `el.clock.screenAnchor=auto` `el.toolbar.arrangement=inherit` `lay.container=auto`
  - B：`cnt.density=1` `lay.container=overlay` `el.toolbar.screenAnchor=ml` `el.toolbar.arrangement=column` `cmp.button=iconText` `el.clock.form=sunDial` `el.clock.screenAnchor=tl` `cmp.listRow=auto` `el.profile.form=auto` `el.profile.screenAnchor=auto` `el.resources.screenAnchor=auto` `lay.composition=auto` `lay.hudOrg=auto` `st.statViz=auto`

  </details>
- **背包容器：方格 vs 贴纸手账本**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 笔记本 / 手账；面板明度：浅色面板 → 中明度；标题字族：同正文 → 手写；转角：圆角 → 直角
  - 配套改动：格子结构：方格 → 无格直接摆放；条目排布几何：规则网格 → 自由散落；详情呈现：常驻一侧 → 自动；内芯结构：程序填充 → 材质平铺；边缘处理：干净 → 撕边 / 破边；图标风格：扁平填充 → 手绘彩绘；随手摆放倾角：0 → 4
  - 看什么：A 便于整理与比较（数量多时必需），B 把背包变成角色的个人物品（适合物品少、每件都有故事的作品）。物品超过 30 件时 B 还能不能用。
  - 注：`vis.tilt` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.screen=screen.inventory` `ast.coreMat=paper`
  - A：`cmp.slot=cell` `lay.arrangement=grid` `vis.corner=round` `col.lightness=light` `lay.detail=persistent` `ast.core=procedural` `ast.container=none` `typ.display.family=same` `vis.edge=clean` `vis.iconStyle=flat` `vis.tilt=0`
  - B：`ast.container=notebook` `vis.edge=torn` `cmp.slot=bare` `lay.arrangement=scatter` `vis.tilt=4` `typ.display.family=handwritten` `vis.iconStyle=painted` `ast.core=texture` `col.lightness=mid` `lay.detail=auto` `vis.corner=sharp`

  </details>
- **拍照：叙事内手机 vs 屏幕上的黑白相机**（整套做法对照（多个参数一起变）；内容包：farming · 农场日记；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：手机 → 无；信息密度：极简 → 中等；默认放置方式：叙事内 → 屏幕叠加；标题字族：同正文 → 手写
  - 配套改动：描边粗细：1 → 3
  - 看什么：A 把相机做成主角手里的手机（Alba 式，沉浸），B 是白底粗黑描边的相机面板（TOEM 式，和黑白线稿世界同一种线）。两者都只有一个快门，看哪种更容易让人记住「这是一个拍照游戏」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-life#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=farming` `cnt.subtype=photoMode` `el.cta.form=shutter` `cnt.screen=screen.hud` `col.strategy=mono` `vis.stroke=solid`
  - A：`rel.diegesis=diegetic` `ast.container=phone` `cnt.density=0` `typ.display.family=same` `vis.strokeWidth=1`
  - B：`rel.diegesis=screen` `vis.strokeWidth=3` `typ.display.family=handwritten` `ast.container=none` `cnt.density=2`

  </details>

**样例内容**：海边小镇种田（`farming#seaside`）、森林魔法药铺（`farming#witch-shop`）、城市小公寓整理（`farming#apartment`）、山村茶园（`farming#tea-village`）、无人岛露营（`farming#island-camp`）、城市流浪猫（`farming#stray-cat`）、黑白线稿小镇拍照（`farming#lineart-photo`）、中式家庭养成（`farming#family`）、沙漠绿洲集市（`farming#oasis-bazaar`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（5 项）</summary>

- 缺「关系 / 好感」元素：心形等级 + 今天是否已对话 / 送礼的标记，是种田 RPG 与恋爱养成的核心（现在只能借 el.party 或 cmp.gauge = icons 拼）。建议新增 el.relation。
- el.clock.form 是单选，但种田游戏右上块同时有季节、星期、时间、天气（还常并入钱）。建议改为多选或加 combo 形态。
- 作物 / 地块生长阶段没有专门表达（需浇水、第几阶段、可收获）：el.overlay = statusIcons 只是近似。建议 el.overlay.form 加 growthStage。
- 缺「日程表 / 课程表」数据形态（时段 × 活动，Chinese Parents、恋爱养成日程）：与建造经营的「人 × 岗位」矩阵是同一类缺口。
- 收集多态标记缺失：图鉴格常有「没见过 / 见过 / 拍到 / 已捐赠」多种状态，st.locked 与 st.done 两个参数只能表达两态。建议加 st.collectState。

</details>

**最相关的原则**（按针对性排序）：[P-contextual-hud](#p-contextual-hud)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-journal-codex](#p-journal-codex)、[P-save-continuity](#p-save-continuity)、[P-medium-constraints](#p-medium-constraints)、[P-harmony-four-relations](#p-harmony-four-relations)、[P-material-from-world](#p-material-from-world)、[P-type-two-tier](#p-type-two-tier)、[P-title-lettering](#p-title-lettering)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-device-bridge](#p-device-bridge)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-craft-recipe](#p-craft-recipe) 等 15 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.12 沙盒与物理

参考卡 16 张 · 探索台内容包：sandbox（方块边境）

沙盒的卖点是画面与物理本身，UI 退到最少（16 款里 7 款密度极简），而且要能整体关掉以便拍照录像。关键是让「能对什么动手」看得出来，并给开放玩法一点「可以试试这个」的暗示。

**子类**：物理破坏（Teardown、GoreBox）；搞笑模拟 / 闯祸（Goat Simulator 3、Untitled Goose Game、Totally Accurate Battle Simulator）；体素冒险 / MMO（Trove、The Touryst）；像素物理（Noita）；职业模拟 / 拆解（Hardspace: Shipbreaker）；沉浸模拟 / 侦探城市（Shadows of Doubt）；仪器 / 生成玩具（Mu Cartographer、Donut County）；艺术 / VR 生态（Paper Beast）；合作派对（Tricky Towers、Unrailed!）；工具软件（Wallpaper Engine，作为非游戏的对照）；邻近：生存建造沙盒（Terraria、DRAGON QUEST BUILDERS 2、Valheim、ASTRONEER，属 survival 卡）

**一眼要知道什么**

1. 手上是什么工具 / 材料，还剩多少，怎么换？
2. 我能对什么动手：能抓、能拆、能烧、能导电的东西是否看得出来？
3. 有没有目标？有的话还差什么；没有的话，用什么暗示「可以试试这个」？
4. 危险读数：氧气、燃料、耐久、警报倒计时还剩多少？
5. 我造 / 拆的东西现在的结构状态与参数（重量、完整度、回收价值）？
6. 多人时：谁领先、我在哪、我的东西是哪一个？
7. 能不能把 UI 全关了录视频 / 拍照？（沙盒的传播依赖干净画面）

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 零 HUD 物理玩具：截图里看不到 UI，只在角落留工具或进度 | 信息密度极简 7 / 16（Donut County、Teardown、Paper Beast、The Touryst、Untitled Goose Game、GoreBox、Goat Simulator 3）；其中 Teardown、GoreBox、Goat Simulator 3、The Touryst 是商店图没拍到 UI，置信度低 | Donut County（steam:702670）、Untitled Goose Game（steam:837470）、Paper Beast（steam:1232570）、Teardown（steam:1167630 · 据已知描述） | 信息密度 = 极简；容器 = 直接叠加；HUD 显隐策略 = 情境显现；文字可读辅助 = 投影 |
| 第一人称工具 HUD：右下工具 / 弹药 + 中心点准星，其余全部让给画面 | 1 / 16 明确（Teardown）；现有「沙盒与物理」布局预设也是这一套（下中快捷栏版本） | Abiotic Factor（steam:427410）、Teardown（steam:1167630 · 据已知描述） | 信息密度 = 稀疏；HUD 组织方式 = 分散组件；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；准星 / 瞄准：画法 = 点；按键 / 操作提示：画法 = 情境按键；底不透明度 = 0 |
| 面罩 / 设备叙事内：读数画在头盔边缘或背包上，扫描模式整屏线框 | 1 / 16（Hardspace: Shipbreaker）；邻近的 Subnautica、ASTRONEER 同理（叙事内是生存沙盒的常态） | Hardspace: Shipbreaker（steam:1161580）、Subnautica（steam:264710）、ASTRONEER（steam:361420） | 默认放置方式 = 叙事内；UI 受画面后处理影响 = 跟随弯曲 / 畸变；数值图形（生命 / 护盾 / 体力） = 弧形；生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内；信息叠层 / 图例：画法 = 全息覆盖；骨架色彩策略 = 双色调；转角 = 切角 |
| 体素 / 像素建造冒险：下中或左上快捷栏 + 右上小地图 + 生命图标列 | 沙盒卡里 1 / 16（Trove，快捷栏下中）；邻近 survival 卡 Terraria（左上 10 格 + 右上心形 + 小地图）、DRAGON QUEST BUILDERS 2（下中物品栏 + 右上圆形小地图） | Terraria（steam:105600）、DRAGON QUEST BUILDERS 2（steam:1072420）、Trove（steam:304050 · 据已知描述） | HUD 组织方式 = 分散组件；信息密度 = 中等；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；小地图 / 罗盘：画法 = 平面小地图；小地图 / 罗盘 · 屏幕锚点 = 右上；数值图形（生命 / 护盾 / 体力） = 图标列（心 / 面具）；生命 / 护盾 / 体力 · 屏幕锚点 = 右上 |
| 仪器边框：一圈细线仪器（旋钮、波形、圆盘）围住中央的生成物 | 1 / 16（Mu Cartographer） | Mu Cartographer（steam:513360） | HUD 组织方式 = 画在玩法区外的边框里；信息密度 = 密集；面板明度 = 浅色面板；骨架色彩策略 = 单色；描边线型 = 实线；装饰母题 = 几何线 / 同心圆；数值图形 = 表盘指针 |
| 派对 / 合作：分数挂在每个玩家的作品上，角落只有极小的文字 | 2 / 16（Tricky Towers 粗描边大数字挂在塔顶、Unrailed! 左上细小文字资源） | Tricky Towers（steam:437920）、Unrailed!（steam:1016920） | 同屏玩家与视口 = 四人派对；计时 / 分数 / 回合：画法 = 比分胶囊；计时 / 分数 / 回合 · 世界挂点 = 玩家角色；数字字体 = 大号展示数字；文字可读辅助 = 文字描边；资源 / 货币 · 屏幕锚点 = 左上 |
| 编辑器 / 工具软件式面板：左侧属性列表 + 滑条，右侧预览 | 2 / 16（TABS 单位编辑深色页、Wallpaper Engine 的 Windows 式设置窗） | Totally Accurate Battle Simulator（steam:508440）、Wallpaper Engine（steam:431960） | 分区方式 = 左右分栏；设置项：数值 = 滑条；面板明度 = 深色面板；转角 = 直角；信息密度 = 密集 |
| 沉浸模拟的推理板：深蓝底上证据卡 + 红线连接，对话是左侧深色选项列表 | 1 / 16（Shadows of Doubt） | Shadows of Doubt（steam:986130） | 界面子功能 = 推理板；场景容器 = 线索墙 / 软木板；连线样式 = 红绳 + 图钉；对话框结构 = 聊天软件式；面板明度 = 深色面板；信息密度 = 密集 |

**关键元素与画法**

- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：ammo / hotbar；常见位置 br、bc、tl。沙盒的主语是「手上的工具 / 材料」：Teardown 右下工具与弹药；Trove 下中快捷栏；邻近的 Terraria 左上 10 格、DRAGON QUEST BUILDERS 2 下中。切换时要短暂放大当前项名称，因为沙盒工具常常没有固定外观。
- **准星 / 瞄准**（`el.crosshair`）：dot；常见位置 center。第一人称沙盒用一个小点表示「当前要作用的方块 / 物体」，能抓 / 能拆时变形或加外圈——这是沙盒的 affordance 提示（06 文档 A15）。
- **生命 / 护盾 / 体力**（`el.vitals`）：thinBar / icons / arc / ring；常见位置 tr、bl。（形态取 cmp.gauge@el.vitals。）沙盒里生命不是核心：Noita 右上细小像素条 + 法杖格；Hardspace 面罩边缘弧形读数（叙事内）；邻近 Subnautica 左下四个圆环（生命 / 氧气 / 食物 / 水）。
- **目标 / 路点**（`el.objective`）：note / checklist；常见位置 tr、tl。开放沙盒容易「不知道玩什么」：Untitled Goose Game 用一张手写待办纸条（完成就划掉）给出搞事清单，是零 HUD 与目标感的折中；邻近 Enshrouded、Among Us 用常驻任务清单。
- **计时 / 分数 / 回合**（`el.timer`）：scorePill / number / smallText；常见位置 tl、tc。派对沙盒的分数挂在每个玩家的塔顶（Tricky Towers，粗描边大数字），不放角落——玩家眼睛本来就盯着自己的作品。
- **信息叠层 / 图例**（`el.overlay`）：holo / statusIcons。扫描 / 信息模式：Hardspace 扫描模式整屏绿线框，标出可回收与危险部件——拆解类沙盒的关键是看穿结构，用一个可切换的模式代替常驻标签。
- **资源 / 货币**（`el.resources`）：iconNumber / gauge；常见位置 tl。Unrailed! 左上细小文字资源；Donut County 左上一个小圆形进度（洞的大小 / 升级进度）。标了锚点的 2 张都在左上，且都很小。
- **按键 / 操作提示**（`el.prompt`）：legend / contextual；常见位置 bc、br。沙盒操作组合多：Shadows of Doubt 推理板底部一行按键图例；工具切换后在角落短暂显示该工具的按键，用完即隐。
- **选中信息面板**（`el.selection`）：panel / tooltip；常见位置 ml。编辑器式沙盒（TABS 单位编辑）左侧属性滑条列表 + 右侧模型预览；改一个数值立刻在预览里看到效果。

**重要界面**

- **局内 HUD**：见 hudOrganization。沙盒默认密度最低（7 / 16 极简），UI 多是第一人称工具 + 准星或叙事内读数；需要「关掉 HUD」开关来拍视频。 例：Hardspace: Shipbreaker（steam:1161580）、Noita（steam:881100）、Teardown（steam:1167630 · 据已知描述）。
- **任务日志 / 目标**：目标与线索：Untitled Goose Game 是一张手写待办纸条（划掉完成项）；Shadows of Doubt 是深蓝底推理板（证据卡 + 红线 + 底部按键图例）。 例：Untitled Goose Game（steam:837470）、Shadows of Doubt（steam:986130）。
- **角色 / 装备 / 属性**：单位 / 物体编辑：TABS 深色背景 + 左侧属性滑条列表（生命、大小、重量、速度、伤害）+ 右侧模型。 例：Totally Accurate Battle Simulator（steam:508440）。
- **关卡 / 章节选择**：模式选择：Tricky Towers 三张糖果色大卡（随机 / 杯赛等），粗描边圆体字。 例：Tricky Towers（steam:437920）。
- **设置**：Wallpaper Engine 是 Windows 式表单（工具软件的对照）：沙盒玩家对画质 / 性能选项的需求接近工具软件。 例：Wallpaper Engine（steam:431960）。
- **建造菜单**：邻近品类的建造菜单：Satisfactory 暗色半透明大面板 + 橙色强调 + 分类图标格。沙盒自由建造时，菜单要能一键收起回到画面。 例：Satisfactory（steam:526870）。
- **背包 / 物品**：邻近品类：Terraria 背包直接展开在快捷栏下方（不换屏）；生存沙盒的背包是评测重灾区。 例：Terraria（steam:105600）、Valheim（steam:892970）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 情境渐显 · 角落小件（`fam.contextual-hud`）（4 张）：情境渐显 · 角落小件：本品类主归属卡 Teardown、The Touryst、GoreBox 等（理由见 17 号图谱该家族的「多见品类」）。
- 糖果卡通（Q 版）（`fam.candy`）（2 张）：体素 MMO（Trove）与派对（Tricky Towers）：鲜艳、粗描边、大数字，配合多人热闹感。
- 零 HUD · 世界即界面（`fam.zero-hud`）（2 张）：零 HUD · 世界即界面：本品类主归属卡 Paper Beast、Untitled Goose Game（理由见 17 号图谱该家族的「多见品类」）。
- 科幻 HUD（`fam.scifi`）（1 张）：Hardspace：面罩边缘的琥珀细线读数。
- 细线几何（`fam.thin-geo`）（1 张）：Mu Cartographer：仪器本身就是玩法（调地形）。
- 像素位图（`fam.pixel`）（1 张）：各 1 张：种田（Fields of Mistria）、像素 RPG（Eastward）、低清 3D 探索（A Short Hike）、Terraria、PS1 恐怖（Crow Country）、Half-Life、Noita、横屏塔防手游。像素 UI 不绑定品类，绑定的是画面媒介。
- 灰盒（中性基线）（`fam.greybox`）（1 张）：Wallpaper Engine：工具软件，设置就是 Windows 表单。
- 细字直压 · 排印叠层（`fam.typographic-hud`）（1 张）：Unrailed!：左上细小文字资源

**代表作**

- Hardspace: Shipbreaker（steam:1161580）〔科幻 HUD〕：Hardspace: Shipbreaker：面罩边缘读数（叙事内）+ 扫描模式整屏线框，拆解沙盒「看穿结构」的标准做法。
- Untitled Goose Game（steam:837470）〔零 HUD · 世界即界面〕：Untitled Goose Game：零 HUD + 一张手写待办纸条，给开放沙盒一个轻目标。
- Shadows of Doubt（steam:986130）〔黑色电影 / 侦探卷宗〕：Shadows of Doubt：推理板（深蓝底证据卡 + 红线）+ 左侧深色对话选项，沉浸模拟的信息组织。
- Mu Cartographer（steam:513360）〔细线几何〕：Mu Cartographer：一圈细线仪器围住中央地形，把参数调节变成操作仪器。
- Tricky Towers（steam:437920）〔糖果卡通（Q 版）〕：Tricky Towers：分数挂在每个玩家的塔顶，派对沙盒的「信息跟着作品走」。
- Noita（steam:881100）〔像素位图〕：Noita：右上小号像素血条 + 法杖格，物理像素世界里 UI 尽量小。
- Totally Accurate Battle Simulator（steam:508440）〔模拟 / 策略工具面板〕：TABS：单位编辑页（左侧属性滑条 + 右侧模型），沙盒编辑器的最简形态。
- Teardown（steam:1167630 · 据已知描述）〔情境渐显 · 角落小件〕：Teardown：第一人称破坏沙盒，右下工具与弹药 + 点准星，其余全部让给体素画面。

**坑**

- 开放沙盒缺目标与引导：玩家不知道能做什么、该先做什么。 例：Hardspace: Shipbreaker（steam:1161580）、Shadows of Doubt（steam:986130）、ASTRONEER（steam:361420）。
  - 评价与证据（依据：评测）：去重后 Hardspace: Shipbreaker「引导不清」2 条；Shadows of Doubt 提到界面的 35 条评测中差评 15 条（多为整体评价）；邻近生存沙盒 ASTRONEER 引导 4、Subnautica 3、No Man's Sky 3。
- 建造 / 生存沙盒的背包与菜单是重灾区：格子少、负重、整理不便、菜单层级深。 例：Valheim（steam:892970）、No Man's Sky（steam:275850）、Abiotic Factor（steam:427410）。
  - 评价与证据（依据：评测）：邻近 survival 品类（去重后）：Valheim 背包 17 条（全库最多）+ 菜单 7 + 地图 4；No Man's Sky 背包 3、菜单 3；Abiotic Factor 地图 3、背包 2。
- 碎片 / 粒子停留太久，淹没玩家角色与 HUD；破坏后画面全是噪声。 例：Teardown（steam:1167630 · 据已知描述）、GoreBox（steam:2027330 · 据已知描述）。
  - 评价与证据（依据：文献）：无专门统计；06 文档 A15 陷阱；GoreBox 有 1 条评测说菜单与 HUD 杂乱（未达门槛）。
- 材质 / 工具只靠颜色区分：体素调色板单一时，木、石、金属、可燃物分不出来。 例：Trove（steam:304050 · 据已知描述）、Teardown（steam:1167630 · 据已知描述）。
  - 评价与证据（依据：文献）：无评测统计；06 文档 A15 陷阱（体素调色板单一、材质分不出）。
- 多人派对里找不到自己：零 HUD 时四个玩家的角色 / 作品长得一样。 例：Tricky Towers（steam:437920）、Unrailed!（steam:1016920）。
  - 评价与证据（依据：推断）：无评测统计；设计观察——Tricky Towers 用挂在塔顶的名字 + 分数解决。

**可演示的对比**

- **第一人称工具 HUD vs 面罩叙事内读数**（整套做法对照（多个参数一起变）；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：自动 → 弧形；信息密度：极简 → 中等；骨架色彩策略：单色 → 双色调；技能 / 冷却 / 弹药 / 手牌：画法：弹药数字 → 自动
  - 配套改动：技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；准星 / 瞄准：画法：点 → 无；底不透明度：0 → 1；文字可读辅助：投影 → 自动；信息叠层 / 图例：画法：无 → 全息覆盖；生命 / 护盾 / 体力 · 放置方式（逐元素）：继承 → 叙事内；默认放置方式：屏幕叠加 → 叙事内；UI 受画面后处理影响：自动 → 跟随弯曲 / 畸变；转角：直角 → 切角
  - 看什么：A 只剩右下工具和一个点（破坏沙盒，画面最干净）；B 把读数弯到面罩边缘并开扫描线框（职业 / 太空沙盒，沉浸但占屏）。打开大量碎片的场景看两者的可读性。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `cnt.screen=screen.hud`
  - A：`cnt.density=0` `el.abilities.form=ammo` `el.abilities.screenAnchor=br` `el.crosshair.form=dot` `vis.opacity=0` `typ.legibility=shadow` `cmp.gauge@el.vitals=auto` `col.strategy=mono` `el.overlay.form=[]` `el.vitals.diegesis=inherit` `rel.diegesis=screen` `rel.followPost=auto` `vis.corner=sharp`
  - B：`rel.diegesis=diegetic` `el.vitals.diegesis=diegetic` `cmp.gauge@el.vitals=arc` `vis.corner=chamfer` `col.strategy=duotone` `rel.followPost=warp` `el.overlay.form=holo` `cnt.density=2` `el.abilities.form=auto` `el.abilities.screenAnchor=auto` `el.crosshair.form=[]` `typ.legibility=auto` `vis.opacity=1`

  </details>
- **目标：手写待办纸条 vs 常驻任务清单**（整套做法对照（多个参数一起变）；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：平框九宫格 → 程序线框；目标 / 路点：画法：便签 / 卷轴 → 任务清单；目标 / 路点 · 屏幕锚点：自动 → 右上；目标 / 路点 · 显隐（逐元素）：按键呼出 → 常驻
  - 配套改动：正文字族：楷书 / 手写感 → 无衬线；完成 / 已领标记：划掉 → 绿勾
  - 看什么：A 按键呼出、划掉完成项（像主角自己的清单，鼓励自由发挥）；B 常驻右上（明确但像工作）。看 A 是否足以解决「不知道玩什么」，B 是否破坏搞笑沙盒的轻松感。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `ast.frameMat=paper` `cnt.screen=screen.hud`
  - A：`el.objective.form=note` `el.objective.visibility=onDemand` `typ.body.family=kai` `st.done=strike` `ast.frame=plainNinePatch` `el.objective.screenAnchor=auto`
  - B：`el.objective.form=checklist` `el.objective.screenAnchor=tr` `el.objective.visibility=always` `st.done=check` `ast.frame=procedural` `typ.body.family=sans`

  </details>
- **派对：分数挂在玩家作品上 vs 角落记分**（整套做法对照（多个参数一起变）；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：计时 / 分数 / 回合 · 世界挂点：玩家角色 → 不挂（用屏幕锚点）；计时 / 分数 / 回合：画法：比分胶囊 → 数字；文字可读辅助：文字描边 → 自动；数字字体：大号展示数字 → 等宽数字
  - 配套改动：计时 / 分数 / 回合 · 屏幕锚点：自动 → 左上
  - 看什么：四人同屏时，A 让每个人在看自己作品的同时看到分数；B 要移开视线到角落。数一数 A 是否会和作品重叠、B 是否需要颜色区分玩家。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `ctx.players=party4` `vis.stroke=solid` `cnt.screen=screen.hud`
  - A：`el.timer.form=scorePill` `el.timer.attachTo=player` `typ.numerals.family=display` `typ.legibility=outline` `el.timer.screenAnchor=auto`
  - B：`el.timer.form=number` `el.timer.screenAnchor=tl` `typ.numerals.family=tabular` `el.timer.attachTo=none` `typ.legibility=auto`

  </details>
- **像素物理小号 HUD vs 仪器边框**（整套做法对照（多个参数一起变）；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形：自动 → 表盘指针；数值图形（生命 / 护盾 / 体力）：细条 → 自动；信息密度：稀疏 → 密集；面板明度：中明度 → 浅色面板
  - 配套改动：UI 像素化：与世界同网格 → 自动；生命 / 护盾 / 体力 · 屏幕锚点：右上 → 自动；生命 / 护盾 / 体力 · 大小 / 突出度：0.7 → 1；HUD 组织方式：自动 → 画在玩法区外的边框里；装饰母题：无 → 几何线 / 同心圆
  - 看什么：A（Noita 式）UI 缩到最小、与像素世界同网格；B（Mu Cartographer 式）把所有参数做成一圈仪器，UI 成了玩法本身。看沙盒的「可调参数」多到什么程度时值得给它一个仪器边框。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `cnt.screen=screen.hud` `col.strategy=mono` `vis.stroke=solid`
  - A：`vis.pixelScale=world` `el.vitals.screenAnchor=tr` `el.vitals.scale=0.7` `cmp.gauge@el.vitals=thinBar` `cnt.density=1` `cmp.gauge=auto` `col.lightness=mid` `lay.hudOrg=auto` `vis.motif=none`
  - B：`lay.hudOrg=inMargin` `col.lightness=light` `vis.motif=geometric` `cmp.gauge=dial` `cnt.density=3` `cmp.gauge@el.vitals=auto` `el.vitals.scale=1` `el.vitals.screenAnchor=auto` `vis.pixelScale=auto`

  </details>
- **推理板：红绳图钉 vs 直线树**（单变量对照；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：线索墙 / 软木板 → 无；连线样式：红绳 + 图钉 → 直线
  - 配套改动：随手摆放倾角：3 → 0；条目排布几何：自动 → 树 / 连线
  - 看什么：A 是随手钉上墙的证据（有倾角、红线交叉，像玩家自己的笔记），B 是整理好的树（清楚但像软件）。看线索超过 15 条时哪种还能读。
  - 注：`vis.connector` `vis.tilt` 画布尚未实现（planned），这部分差异暂时看不到。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `cnt.subtype=deduction` `col.lightness=dark` `cnt.screen=screen.journal` `vis.corner=sharp`
  - A：`ast.container=clueWall` `vis.connector=string` `vis.tilt=3` `lay.arrangement=auto`
  - B：`vis.connector=straight` `lay.arrangement=tree` `vis.tilt=0` `ast.container=none`

  </details>
- **编辑器：深色滑条列表 vs 浅色缩略图选择**（整套做法对照（多个参数一起变）；内容包：sandbox · 方块边境；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：设置项：数值：滑条 → 分格条；面板明度：深色面板 → 浅色面板；转角：直角 → 圆角
  - 配套改动：主视觉主体：角色 → 自动；主角色呈现介质：3D 实时模型 → 自动；设置项：多选一：自动 → 缩略图
  - 看什么：A（TABS 式）连续数值任意调，适合物理参数；B 分档 + 缩略图，适合外观与预设。看「改一下就想马上看到效果」时哪一种反馈更快。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sandbox#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=sandbox` `cnt.screen=screen.character` `lay.composition=splitLR`
  - A：`cmp.optionRange=slider` `col.lightness=dark` `cnt.focal=character` `cnt.characterMedium=model3d` `cmp.optionEnum=auto` `vis.corner=sharp`
  - B：`cmp.optionRange=segmentedBar` `cmp.optionEnum=thumbnails` `col.lightness=light` `vis.corner=round` `cnt.characterMedium=auto` `cnt.focal=auto`

  </details>

**样例内容**：可破坏的体素小镇（`sandbox#voxel-town`）、太空船拆解厂（`sandbox#ship-breaker`）、像素物理洞穴（`sandbox#pixel-physics`）、搞笑动物闯祸（`sandbox#animal-chaos`）、积木塔多人对战（`sandbox#block-tower`）、星球地形生成器（`sandbox#planet-gen`）、雨夜侦探城市（`sandbox#rainy-detective`）、军团战斗模拟（`sandbox#army-sim`）、火车铺轨合作（`sandbox#rail-coop`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（5 项）</summary>

- 缺「编辑器 / 创作模式」界面类型（属性检查器 + 层级树 + 工具条 + 物理参数）：现在只能借 screen.build 或 screen.character。建议新增 screen.editor 与对应子功能。
- 缺材质 / 工具属性提示：当前材质是否可燃、导电、可破坏、多重——沙盒的 affordance 信息，现在没有元素或参数承载。
- 缺回放 / 慢动作 / 自由相机控制条（TABS 等沙盒的录像、慢放、拍照）：cnt.subtype 有 photoMode，但没有回放控制元素。建议新增 el.replay。
- 缺建造选区的尺寸读数（体素 / 方块框选时显示 3 × 4 × 2、方块数量、材料消耗）。
- el.toolbar 缺「编辑操作组」（撤销 / 重做 / 复制 / 镜像），与建造经营同一缺口。

</details>

**最相关的原则**（按针对性排序）：[P-contextual-hud](#p-contextual-hud)、[P-hudless-tax](#p-hudless-tax)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-adaptive-layers](#p-adaptive-layers)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-shared-screen](#p-shared-screen)、[P-color-never-alone](#p-color-never-alone)、[P-medium-simulation](#p-medium-simulation)、[P-prompt-in-context](#p-prompt-in-context)、[P-build-placement](#p-build-placement)、[P-craft-recipe](#p-craft-recipe)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.13 生存与制作

参考卡 18 张 · 探索台内容包：survival（林间余火）

生存类的核心问题是比较与趋势：哪条计量最先见底、离天黑还有多久、还差什么材料、背包还剩几格。背包 / 负重管理是品类第一大 UI 抱怨（Valheim 一款 17 条），叙事内的装备读数与屏幕计量常混用。

**子类**：开放世界生存建造（第三人称 / 合作）：Valheim、Enshrouded、Grounded、Palworld；第一人称生存探索（太空 / 海底 / 实验室）：Subnautica、ASTRONEER、No Man's Sky、Abiotic Factor；2D 横版沙盒生存：Terraria；斜俯视手绘生存 / 漂流：Don't Starve、The Flame in the Flood、The Wild at Heart；生存 + 建造 RPG：DRAGON QUEST BUILDERS 2；生存过渡到工厂自动化：Satisfactory；库内归入生存、实际是别类：Among Us（社交推理）、Mineko's Night Market（生活模拟）——只取它们的团队进度条、叙事内平板与书本日志做法

**一眼要知道什么**

1. 哪一条生存计量最先见底、正在涨还是在掉（生命 / 饱食 / 口渴 / 氧气 / 体温 / 理智）？——要的是「比较与趋势」，不是精确数值
2. 离天黑（或下一个危险周期：暴风雪、氧气耗尽、血月）还有多久？今天是第几天？
3. 手里拿的是什么、耐久还剩多少、快捷栏里下一件工具 / 武器在哪一格？
4. 想做的东西还差什么材料（持有 / 需求）？背包还剩几格、还能背多重？
5. 营地、刚才的资源点、当前目标在哪个方向、多远？
6. 刚捡到了什么？有没有因为背包满而掉在地上？
7. 身上有哪些增益 / 减益（已休息、潮湿、寒冷、中毒），还剩多久，怎样触发或解除？
8. 附近有没有敌对生物、我是否已被发现（夜行怪、巡逻无人机、巢穴）？

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 四角分散 + 常驻快捷栏：生存计量占一角，地图 / 时钟占另一角，快捷栏在底中（3D）或左上（2D 横版，避开脚下的挖掘区）。适用：采集—制作—建造循环频繁、需要随时切工具的作品 | 7 / 18（Terraria、Valheim、DQB2、Enshrouded、Abiotic Factor、Don't Starve ×2；Terraria 与 Valheim 的快捷栏在左上，DQB2 / Enshrouded / Abiotic / Don't Starve 在底中） | Terraria（steam:105600）、Valheim（steam:892970）、DRAGON QUEST BUILDERS 2（steam:1072420）、Enshrouded（steam:1203620） 等 7 款 | HUD 组织方式 = 分散组件；信息密度 = 中等；信息元素集合 = 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 时间 / 天气 / 日历 + 通知 / 大字提示 + 交互提示；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；小地图 / 罗盘 · 屏幕锚点 = 右上；时间 / 天气 / 日历 · 屏幕锚点 = 右上 |
| 头盔式科幻：顶部罗盘条（只给方向和兴趣点）+ 左上分段生命 / 护盾 + 右上环境防护与工具读数 + 右下倾斜色块任务提示。适用：宇航服 / 潜水服题材，玻璃面罩给了屏幕叠加的叙事理由 | 3 / 18（No Man's Sky ×2；Enshrouded 也用顶部罗盘条 + 左上双条） | No Mans Sky（iig:no-mans-sky）、No Man's Sky（steam:275850）、Enshrouded（steam:1203620） | HUD 组织方式 = 分散组件；信息密度 = 稀疏；信息元素集合 = 生命 / 护盾 / 体力 + 小地图 / 罗盘 + 世界 / 社会态势条 + 技能 / 冷却 / 弹药 / 手牌 + 目标 / 路点 + 敌人血条 / 预警 / 意图；小地图 / 罗盘：画法 = 罗盘条；小地图 / 罗盘 · 屏幕锚点 = 上中；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左上；世界 / 社会态势条：画法 = 图标 + 仪表；数值图形（世界 / 社会态势条） = 分段格；世界 / 社会态势条 · 屏幕锚点 = 右上；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 右下；转角 = 切角；面板明度 = 深色面板 |
| 装备即仪表（叙事内）：氧气 / 电量 / 电池画在背包、手持工具、载具仪表上，屏幕几乎空。适用：信息维度少（≤ 2 项）、角色本来就穿戴设备、想让玩家「看自己」而不是「看角落」 | 2 / 18 做到底（ASTRONEER 氧气 / 电量在背包上；Subnautica 工具电量在工具屏上，但生命 / 氧气 / 食物 / 水仍是左下四环）——生存类更常见的是「屏幕计量 + 装备读数」混用 | ASTRONEER（steam:361420）、Subnautica（steam:264710） | 默认放置方式 = 叙事内；信息密度 = 极简；生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内；生命 / 护盾 / 体力 · 世界挂点 = 玩家角色；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内；技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器 |
| 手绘同媒介：右上计量徽章 + 日夜表盘，左侧竖排制作分类页签，底部物品栏，边框用画面同款抖动手绘线与木纹。适用：画面本身是强风格化 2D（手绘、剪纸、版画） | 3 / 18（Don't Starve ×2、The Flame in the Flood 左上小圆计量） | Dont Starve（iig:dont-starve）、Don't Starve（steam:219740 · 据已知描述）、The Flame in the Flood（steam:318600 · 据已知描述） | UI 与画面关系 = 同一媒介；HUD 组织方式 = 分散组件；信息密度 = 中等；图标风格 = 手绘彩绘；边缘处理 = 笔触；外框材质 = 木；生命 / 护盾 / 体力 · 屏幕锚点 = 右上；时间 / 天气 / 日历：画法 = 太阳盘 / 日夜钟；时间 / 天气 / 日历 · 屏幕锚点 = 右上；建造栏 / 系统入口条：画法 = 分类页签 + 子项抽屉；建造栏 / 系统入口条 · 屏幕锚点 = 左中；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；外框结构 = 平框九宫格 |
| 低 HUD / 情境显现：截图里几乎看不到 HUD，状态只在变化时出现。注意多数是宣传图把 HUD 关掉，不等于局内真的没有 | 5 / 18（The Wild at Heart、Grounded、Mineko's Night Market、ASTRONEER、The Flame in the Flood；前四张中 3 张注明「商店图无 UI」，置信度低） | Mineko's Night Market（steam:762940）、ASTRONEER（steam:361420）、The Wild at Heart（steam:1093290 · 据已知描述）、Grounded（steam:962130 · 据已知描述） 等 5 款 | 信息密度 = 极简；HUD 显隐策略 = 情境显现 |
| 团队目标进度条 + 情境大按钮：左上整队任务进度条 + 可折叠任务页签，右下「使用 / 报告」类大按钮平时灰、靠近目标才亮。适用：多人合作 / 对抗、目标是全队共享的 | 1 / 18（Among Us） | Among Us（steam:945360） | HUD 组织方式 = 分散组件；信息密度 = 稀疏；世界 / 社会态势条：画法 = 单项；世界 / 社会态势条 · 屏幕锚点 = 左上；目标 / 路点：画法 = 任务清单；目标 / 路点 · 屏幕锚点 = 左上；按键 / 操作提示：画法 = 触屏按钮；按键 / 操作提示 · 屏幕锚点 = 右下 |

**关键元素与画法**

- **生命 / 护盾 / 体力**（`el.vitals`）：cmp.gauge@el.vitals=ring / cmp.gauge@el.vitals=icons / cmp.gauge@el.vitals=bar / cmp.gauge@el.vitals=vertical / cmp.gauge@el.vitals=segmented / cmp.gauge@el.vitals=orb / el.vitals.count=3–4；常见位置 bl、tr、tl。生存的「血」是 3–5 条同时衰减的资源，玩家要判断「哪条先见底」——所以用同形状、同大小并排的小计量 + 图标区分（Subnautica 左下四环、Don't Starve 右上三枚徽章），比一条大血条更适合比较。数值标注一般只给主计量（Terraria 心形旁写 当前 / 上限），其余只看比例。Valheim 把已吃的食物图标叠在竖条生命旁，直接说明「生命上限从哪来」；体力条只在消耗时出现在角色脚下（情境显现）。位置不统一（左下 / 右上 / 左上都有），关键是与环境计量、时钟成一簇，视线一次扫完。
- **世界 / 社会态势条**（`el.meter`）：el.meter.form=withIcon / el.meter.form=stack / cmp.gauge@el.meter=thermometer / cmp.gauge@el.meter=segmented；常见位置 tr、tl、bl。环境压力（温度、辐射、危险防护、休息度）是生存的第二层计量：不直接扣血，但决定资源消耗速度。No Man's Sky 右上用分段菱形表示环境防护，Abiotic Factor 左下人体剪影旁放辐射符号与饥渴疲劳小图标，Enshrouded 左上「已休息」增益带剩余时间与条件清单（坐着 / 温暖 / 舒适）。原则：环境计量贴着生命计量放，玩家能看出因果。
- **时间 / 天气 / 日历**（`el.clock`）：el.clock.form=sunDial / el.clock.form=dayCounter；常见位置 tr。夜晚是危险周期，玩家按「离天黑还有多久」安排采集与回营。Don't Starve 右上表盘把一天切成白天 / 黄昏 / 夜三色扇区，中间写天数——扇区比例比数字时钟读得更快，天数同时是「存活成绩」。DQB2 把太阳图标贴在圆形小地图上方，时钟与地图成一组。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：el.abilities.form=hotbar；常见位置 bc、tl。生存循环是「切工具 → 采集 → 切武器 → 进食」，快捷栏必须常驻，格内要有堆叠数（DQB2）与耐久（Don't Starve 格里直接写百分比），选中格上方写物品名（Terraria）。3D 第三人称放底中（视线与拇指的自然落点）；2D 横版放左上，把屏幕下半留给脚下地形与挖掘。快捷栏应是背包的第一行——Terraria 打开背包时从快捷栏原位向下展开，位置不跳。
- **小地图 / 罗盘**（`el.minimap`）：el.minimap.form=plan / el.minimap.form=radar / el.minimap.form=compassBar；常见位置 tr、tc。开放生存靠「回家」与「找资源点」：平面 / 圆形小地图（Terraria 金框、Valheim 方块 + 生物群系名、DQB2 圆形）服务建造与回营；顶部罗盘条（No Man's Sky、Enshrouded）只给方向不给地形，保留探索感。选罗盘就要把大地图做好——Valheim 4 条、Abiotic Factor 3 条地图抱怨（去重后）。
- **通知 / 大字提示**（`el.notify`）：el.notify.form=pickupText / el.notify.form=feed / el.notify.form=banner；常见位置 ml、br。采集频率极高，拾取提示必须是不打断的小字流（Enshrouded 左侧图标 + 物品名），同类合并计数；剧情 / 系统事件才用横幅（No Man's Sky 右下倾斜蓝色任务框）。拾取流放在快捷栏 / 背包所在的一侧，视线不来回跳。
- **交互提示**（`el.interact`）：el.interact.form=keyPrompt / el.interact.form=cursor；常见位置 center、attachTo=poi、attachTo=cursor。生存动作多是「长按持续」（烤肉、拆除、采集），提示要带进度（Enshrouded 中下「按住 / 松开完成」）；斜俯视鼠标操作则把物品名 + 动作写在光标旁（Don't Starve 悬停容器格子时显示名字与「吃」）。
- **信息叠层 / 图例**（`el.overlay`）：el.overlay.form=holo / el.overlay.form=buildGrid / el.overlay.form=statusIcons；常见位置 attachTo=poi。扫描 / 建造是生存的「第二视图」：按键后世界被临时标注（No Man's Sky 扫描后岩体覆上全息网格、资源点出现菱形标），平时不污染画面。建造模式同理切到网格与幽灵预览。
- **敌人血条 / 预警 / 意图**（`el.threat`）：el.threat.form=healthBar / cmp.gauge@el.threat=eye；常见位置 attachTo=target、center。敌对生物只在交战距离显示：Valheim 敌人头顶细血条 + 名字 + 星级；No Man's Sky 用屏幕中部的「发现度」圆环 + 感叹号表示被哨兵盯上——生存里「被发现」比「对方还剩多少血」更关键。
- **建造栏 / 系统入口条**（`el.toolbar`）：el.toolbar.form=categoryTabs；常见位置 ml。配方就是生存的科技树：Don't Starve 左侧竖排分类图标（工具 / 火 / 生存 / 农业 / 科学 / 战斗……）常驻，点开抽屉出子项；Satisfactory 建造菜单的左列图标页签同理。让「我能做什么」永远一键可达。
- **目标 / 路点**（`el.objective`）：el.objective.form=checklist / el.objective.form=text；常见位置 tr、tl。生存的目标多是自定的（「盖张床」「找到干净水源」），清单 + 材料计数把它钉在屏上：Enshrouded 右上任务 + 日志键；Satisfactory 屏幕右侧钉着「待办」材料清单（某材料 0 / 5）；Among Us 左上整队进度条。
- **按键 / 操作提示**（`el.prompt`）：el.prompt.form=list / el.prompt.form=legend；常见位置 br。操作随手持物变化（武器 / 锤子 / 锄头），右下按键列表跟着当前工具刷新（Valheim 鼠标键位列表、DQB2 按键图例）；左下工具位上写「切换」提示。

**重要界面**

- **背包 / 物品**：规则方格 + 堆叠数 + 耐久（百分比或格底细条）；快捷栏是背包第一行，打开时原位展开（Terraria）；容器（箱子）打开时格子直接浮在容器上方或与背包并排两列（Don't Starve 箱子格子挂在箱子上、背包在右侧竖列）；负重 / 格数上限要一直可见。交易页沿用同一套格子 + 右侧详情（No Man's Sky 半透明深色列表 + 彩色元素方块图标）。背包是这一类评测里抱怨最多的界面，「整理 / 一键存入 / 合并堆叠」按钮不能省。 例：Dont Starve（iig:dont-starve）、Terraria（steam:105600）、No Mans Sky（iig:no-mans-sky）、No Man's Sky（steam:275850） 等 5 款。
- **制作 / 合成**：左分类、中配方格、右详情 + 材料「持有 / 需求」（够的绿、不够的红）；缺料的配方压暗但保持可见，让玩家知道下一步该去找什么；配方可以「钉到 HUD」变成待办（Satisfactory 右侧材料清单）。快捷制作入口常驻在 HUD 一侧（Don't Starve 左侧竖排页签）。 例：Satisfactory（steam:526870）、Dont Starve（iig:dont-starve）。
- **建造菜单**：暗色半透明大面板 + 一个强调色（Satisfactory 橙色选中格），左列图标页签 + 顶部搜索 + 圆形图标格（带名字）+ 右侧大图详情与材料；选好后回到世界里放置预览（合法 / 非法上色）并用按键提示确认 / 取消。面板盖住世界时世界仍在动（rel.behind = 实时）。 例：Satisfactory（steam:526870）。
- **地图 / 世界地图**：生存地图是「走过才揭开」（云雾或留白）+ 玩家自放标记与文字；不给小地图时，大地图必须支持标记、缩放与当前朝向，否则评测里会集中出现地图抱怨（去重后 Valheim 4 条、Abiotic Factor 3 条）。 例：Valheim（steam:892970）、Abiotic Factor（steam:427410）。
- **角色 / 装备 / 属性**：选人 / 捏人页延续世界材质：Don't Starve 红色木纹底 + 粗衬线手写角色名 + 撕边黑面板说明 + 未解锁角色为黑剪影；DQB2 是系列血统的金色圆角选项卡 + 居中 3D 模型。 例：Dont Starve（iig:dont-starve）、DRAGON QUEST BUILDERS 2（steam:1072420）。
- **任务日志 / 目标**：日志 / 任务做成世界里的书（Mineko's Night Market 翻开的浮世绘册子，叙事内）或 HUD 右上任务 + 一个日志键（Enshrouded）。 例：Mineko's Night Market（steam:762940）、Enshrouded（steam:1203620）。
- **社交 / 聊天 / 公会 / 邮件**：多人会议 / 投票做成叙事内的平板：聊天流（每条带头像与玩家色）+ 右侧头像投票按钮 + 倒计时（Among Us）。 例：Among Us（steam:945360）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 情境渐显 · 角落小件（`fam.contextual-hud`）（5 张）：情境渐显 · 角落小件：本品类主归属卡 The Wild at Heart、Palworld、The Flame in the Flood 等（理由见 17 号图谱该家族的「多见品类」）。
- 科幻 HUD（`fam.scifi`）（4 张）：生存 / 太空探索需要常驻的氧气、护盾、资源读数，最适合「仪表」语法（Subnautica、NMS×2、Satisfactory）。
- 暗色细线（`fam.dark-hairline`）（2 张）：Valheim / Enshrouded：同样的暗色细线 HUD，背包可读性压力大。
- 圆润友好（`fam.cozy`）（2 张）：ASTRONEER：零 HUD，读数在背包上。
- 手绘笔记本（`fam.notebook`）（2 张）：Don't Starve 的刮擦墨线与旧纸按钮，把生存的寒酸感做进界面。
- 像素位图（`fam.pixel`）（1 张）：各 1 张：种田（Fields of Mistria）、像素 RPG（Eastward）、低清 3D 探索（A Short Hike）、Terraria、PS1 恐怖（Crow Country）、Half-Life、Noita、横屏塔防手游。像素 UI 不绑定品类，绑定的是画面媒介。
- JRPG 窗口（`fam.jrpg`）（1 张）：DQ Builders 2：JRPG 外衣的建造沙盒。
- 扁平 / Material（`fam.flat`）（1 张）：Palworld、Among Us、TABS、伊甸之战。

**代表作**

- Dont Starve（iig:dont-starve）〔手绘笔记本〕：一屏看全生存 HUD 的所有零件：右上日夜表盘（天数）+ 三枚计量徽章（胃 / 心 / 脑），左侧竖排制作分类，底部物品栏格内写耐久百分比，右侧背包竖列，箱子的格子直接浮在箱子上方，光标旁写物品名与动作——全部用画面同款手绘线。
- Subnautica（steam:264710）〔科幻 HUD〕：Subnautica：左下四个同形圆环（生命 / 氧气 / 食物 / 水）便于比较；手持工具上的小屏显示电量、载具驾驶舱也是叙事内，面罩边缘压暗当作取景框——「屏幕计量 + 装备读数」混用的范例。
- Enshrouded（steam:1203620）〔暗色细线〕：Enshrouded：增益「已休息」带倒计时与条件清单（坐着 / 温暖 / 舒适），把「为什么有这个 buff」写在 HUD 上；顶部罗盘条、右上任务 + 日志键、左侧拾取小字、中下长按进度提示，分工清楚。
- No Mans Sky（iig:no-mans-sky）〔科幻 HUD〕：No Man's Sky：扫描后全息网格覆在岩体上 + 资源菱形标（按键叠层），屏幕中部的发现度圆环，右上环境防护分段 + 工具百分比，顶部弧形罗盘——科幻生存的完整词汇。
- Terraria（steam:105600）〔像素位图〕：Terraria：高密度但有序——左上 10 格快捷栏 + 选中物名 + 下方增益图标，右上心形 + 文字读数 + 竖排魔力星，金框小地图；2D 横版把快捷栏放上方的理由很清楚。
- Satisfactory（steam:526870）〔科幻 HUD〕：Satisfactory：建造 / 自定义面板（左图标页签 + 搜索 + 圆形图标格 + 右详情）与钉在屏幕右侧的材料待办清单，是「制作目标上墙」的最好例子。

**坑**

- 背包 / 负重管理难用：格子太少、堆叠上限低、整理与箱子间搬运要点很多次——生存类第一大 UI 抱怨 例：Valheim（steam:892970）、No Man's Sky（steam:275850）、Satisfactory（steam:526870）、Abiotic Factor（steam:427410）、The Flame in the Flood（steam:318600 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 背包类去重后：Valheim 17 条（全库单款最多），No Man's Sky 3、Abiotic Factor 2；Satisfactory、The Flame in the Flood 各 1。
- 制作 / 建造菜单层级深、操作不直观 例：Valheim（steam:892970）、No Man's Sky（steam:275850）、Palworld（steam:1623730 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 菜单类去重后：Valheim 7、No Man's Sky 3、Palworld 3；Valheim 提到 UI 的 176 条评测里 132 条出自差评。
- 叙事内 / 低 HUD 的代价：开放世界里玩家不知道下一步做什么、去哪 例：ASTRONEER（steam:361420）、Subnautica（steam:264710）、No Man's Sky（steam:275850）、Grounded（steam:962130 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 引导类去重后：ASTRONEER 4（零 HUD 的代表）、Subnautica 3、No Man's Sky 3；Grounded 1。
- 不给小地图时大地图难用 / 不能标记 例：Valheim（steam:892970）、Abiotic Factor（steam:427410）、Subnautica（steam:264710）、ASTRONEER（steam:361420）、Enshrouded（steam:1203620）。
  - 评价与证据（依据：评测）：R3 地图类去重后：Valheim 4、Abiotic Factor 3、Subnautica 2、Enshrouded 2、ASTRONEER 1。
- 夜间 HUD 与资源图标不可读（夜晚过暗、铜 / 铁 / 锡图标同为灰褐） 例：Valheim（steam:892970）、No Man's Sky（steam:275850）。
  - 评价与证据（依据：文献）：无可靠评测计数：Valheim、No Man's Sky 原来的「字太小」命中复核后多在说夜晚和画面看不清，不是文字——这正好是「夜晚过暗」这条的旁证。资源同色系是 06 文档 A8 的美术陷阱。
- UI 响应慢（大面板打开卡顿） 例：Enshrouded（steam:1203620）。
  - 评价与证据（依据：评测）：R3 卡顿类去重后：Enshrouded 1 条（证据很弱）。

**可演示的对比**

- **生存计量：屏幕四环 vs 画在装备上**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：圆环 → 自动；信息密度：稀疏 → 极简；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内
  - 配套改动：生命 / 护盾 / 体力 · 放置方式（逐元素）：屏幕叠加 → 叙事内；生命 / 护盾 / 体力 · 屏幕锚点：左下 → 自动；生命 / 护盾 / 体力 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；默认放置方式：屏幕叠加 → 叙事内
  - 看什么：信息量相同：a 一眼比较四条谁最低；b 屏幕干净但要看角色背包 / 手持物才知道——再对照 ASTRONEER 引导抱怨 4 条（去重后），体会「沉浸 vs 一眼可读」的取舍
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-survival#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `cnt.elements=el.vitals+el.abilities` `el.vitals.count=4` `el.vitals.valueLabel=none` `cnt.screen=screen.hud`
  - A：`cmp.gauge@el.vitals=ring` `el.vitals.diegesis=screen` `el.vitals.screenAnchor=bl` `cnt.density=1` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit` `el.vitals.attachTo=none` `rel.diegesis=screen`
  - B：`rel.diegesis=diegetic` `el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `el.abilities.diegesis=diegetic` `el.abilities.attachTo=held` `cnt.density=0` `cmp.gauge@el.vitals=auto` `el.vitals.screenAnchor=auto`

  </details>
- **同一套生存 HUD：手绘同媒介 vs 暗色细线中性**（整套做法对照（多个参数一起变）；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：外框结构：雕花九宫格 → 程序线框；数值图形（生命 / 护盾 / 体力）：液体球 → 细条；面板明度：中明度 → 深色面板；时间 / 天气 / 日历：画法：太阳盘 / 日夜钟 → 天数大字
  - 配套改动：UI 与画面关系：同一媒介 → 中性；图标风格：手绘彩绘 → 线性；边缘处理：笔触 → 干净；标题字族：西部木刻粗衬线 → 衬线
  - 看什么：元素与位置不变，只换材质与笔触：a 像 Don't Starve 是「世界的一部分」，b 像 Valheim / Enshrouded 退到背景——看哪种更适合当前画面的媒介
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-survival#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `ast.frameMat=wood` `el.toolbar.form=categoryTabs` `el.toolbar.screenAnchor=ml` `cnt.screen=screen.hud` `vis.stroke=solid`
  - A：`rel.harmony=sameMedium` `vis.iconStyle=painted` `ast.frame=carvedNinePatch` `vis.edge=brush` `typ.display.family=slabWestern` `el.clock.form=sunDial` `cmp.gauge@el.vitals=orb` `col.lightness=mid`
  - B：`rel.harmony=neutral` `vis.iconStyle=line` `ast.frame=procedural` `col.lightness=dark` `typ.display.family=serif` `el.clock.form=dayCounter` `cmp.gauge@el.vitals=thinBar` `vis.edge=clean`

  </details>
- **导航：平面小地图 vs 顶部罗盘条**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：小地图 / 罗盘：画法：平面小地图 → 罗盘条；小地图 / 罗盘 · 屏幕锚点：右上 → 上中；目标 / 路点：画法：无 → 标记图标
  - 看什么：a 告诉你地形（适合回营 / 建造），b 只告诉方向与兴趣点（保留探索感、把地形留给世界）；选 b 时大地图要能标记
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-survival#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `el.clock.form=sunDial` `el.clock.screenAnchor=tr` `cnt.screen=screen.hud`
  - A：`el.minimap.form=plan` `el.minimap.screenAnchor=tr` `el.objective.form=[]`
  - B：`el.minimap.form=compassBar` `el.minimap.screenAnchor=tc` `el.objective.form=marker`

  </details>
- **扫描模式：常态 vs 按键叠层**（单变量对照；内容包：survival · 林间余火；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 → 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 小地图 / 罗盘 + 信息叠层 / 图例
  - 配套改动：信息叠层 / 图例 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；信息叠层 / 图例：画法：无 → 全息覆盖 + 状态图标；信息叠层 / 图例 · 显隐（逐元素）：继承 → 按键呼出
  - 看什么：资源点平时藏在世界里，按一下扫描才被网格与菱形标点亮——比常驻图标更干净，也让「找资源」成为一个动作
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-survival#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=survival` `rel.hudVisibility=always` `cnt.screen=screen.hud`
  - A：`cnt.elements=el.vitals+el.abilities+el.minimap` `el.overlay.attachTo=none` `el.overlay.form=[]` `el.overlay.visibility=inherit`
  - B：`cnt.elements=el.vitals+el.abilities+el.minimap+el.overlay` `el.overlay.form=holo+statusIcons` `el.overlay.visibility=onDemand` `el.overlay.attachTo=poi`

  </details>

**样例内容**：生存与制作（`survival#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（8 项）</summary>

- 状态效果列（增益 / 减益图标 + 倒计时 + 触发条件清单）没有独立元素：Enshrouded「已休息」的剩余时间与三条条件只能硬塞进 el.meter——新增 el.buffs（图标列 / 带倒计时 / 带条件清单），或 el.meter.form 加 statusList
- 格内耐久 / 燃料读数（百分比或格底细条）无法编码——cmp.slot 增加子参数 slotMeter：无 / 百分比文字 / 底部细条 / 边框变色
- 背包容量与负重（x / y 格、kg）没有落点——st 组增加 capacity 读数（格数 / 重量 / 两者），背包与容器页默认显示
- 界面挂在世界物体上：容器格子浮在箱子上方——elx.attachTo 只作用于 HUD 元素，不作用于整屏——flow.entry = worldInteract 时允许 lay.container 锚到物体（screen 级 attachTo = poi）
- 配方钉到 HUD（材料待办 0 / 5）只能近似为 el.objective = checklist，缺与「持有 / 需求」的联动——el.objective.form 增加 recipePin（行内显示 el.cost.form = haveNeed）
- 第一人称面罩 / 头盔边框作为 HUD 载体：ast.container 只有座舱，rel.metaFx 没有面罩框——ast.container 增加 helmet（面罩边缘压暗 + 玻璃反光），HUD 元素可吸附在面罩弧线上
- 部位伤害人形图（左下人体剪影各部位着色）：cnt.characterMedium 有人体示意图，但不能作为生命计量形态——cmp.gauge 增加 bodyMap
- 计量趋势（正在涨 / 掉的箭头、加速衰减时脉动）：elx.valueLabel = delta 只能写数字——elx 增加 trendCue：无 / 箭头 / 脉动 / 预测虚线段

</details>

**最相关的原则**（按针对性排序）：[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-pause-world-state](#p-pause-world-state)、[P-glance-encoding](#p-glance-encoding)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-device-bridge](#p-device-bridge)、[P-hudless-tax](#p-hudless-tax)、[P-map-conventions](#p-map-conventions)、[P-menu-architecture](#p-menu-architecture)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-journal-codex](#p-journal-codex)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-text-size-floor](#p-text-size-floor) 等 19 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.14 恐怖与悬疑

参考卡 16 张 · 探索台内容包：horror（黑水疗养院）

恐怖把信息故意做得粗粒度：生命是良好 / 注意 / 危险几档，威胁多半只给声音与画面线索，交互提示贴近才出现。三条主线是全隐电影模式、情境显现的右下小组、身体 / 武器即 HUD；开背包时世界停不停，是张力的开关。

**子类**：生存恐怖（越肩 / 固定机位，资源稀缺）：Resident Evil Village、Resident Evil 2、Dead Space、The Callisto Protocol、Crow Country（PS1 复古）；动作恐怖 / 悬疑动作：The Last of Us Part I / II、Alan Wake、CONTROL；步行 / 电影化恐怖：Still Wakes the Deep、Hellblade II、Scorn；横版氛围恐怖：Little Nightmares；超自然叙事冒险：OXENFREE；心理恐怖 RPG / 童话外壳：OMORI、Little Goody Two Shoes

**一眼要知道什么**

1. 我还能挨几下？——恐怖常把生命做成粗粒度状态（良好 / 注意 / 危险）而不是精确数值
2. 弹匣里还有几发、备弹多少、光源（手电电量 / 打火机油）还能撑多久？
3. 威胁在哪、它发现我了吗？（多数作品故意只给声音和画面线索）
4. 这个东西能不能检查 / 拾取 / 互动？——要在不放常驻图标的前提下看得出
5. 这里安全吗：安全屋 / 存档点，还是随时会被袭击的区域？
6. 我在哪、哪些门锁着、哪个房间还有没拿的东西？
7. 背包还放得下吗？要丢什么、存进箱子什么？

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 全隐（电影模式）：常驻 HUD 为零，交互提示只在贴近物体时出现，状态改由画面、角色动作或背包里的读数传达。适用：线性、空间尺度小、强调电影感 | 5 / 16（Resident Evil 2、Little Nightmares、Scorn、Hellblade II、Still Wakes the Deep；Hellblade II 另用 21:9 宽银幕黑边） | Little Nightmares（steam:424840）、Scorn（steam:698670）、Hellblade II（steam:2461850）、Still Wakes the Deep（steam:1622910） 等 5 款 | HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；信息元素集合 = 交互提示 + 字幕 / 说话人；交互提示 · 显隐（逐元素） = 情境显现；交互提示 · 世界挂点 = 兴趣点 |
| 情境显现的右下小组：生命（分段 / 图标 / 圆环）与弹药数挤在右下一角，只在受伤、掏枪、换弹时淡入。适用：有战斗、有资源压力，但仍要电影感 | 4 / 16（Resident Evil Village、The Last of Us Part I / II、Alan Wake 的手电电量圆环；全部注明商店图无 UI，按已知 HUD 记） | Resident Evil Village（steam:1196590 · 据已知描述）、The Last of Us Part I（steam:1888930 · 据已知描述）、The Last of Us Part II Remastered（steam:2531310 · 据已知描述）、Alan Wake（steam:108710 · 据已知描述） | HUD 显隐策略 = 情境显现；信息密度 = 极简；HUD 组织方式 = 分散组件；信息元素集合 = 生命 / 护盾 / 体力 + 技能 / 冷却 / 弹药 / 手牌 + 交互提示；数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 右下；技能 / 冷却 / 弹药 / 手牌：画法 = 弹药数字；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下 |
| 身体 / 武器即 HUD（叙事内）：生命是背脊或后颈的灯带 / 环形灯，弹药投影在枪上，菜单是角色面前的全息投影。适用：科幻题材、越肩视角（角色背部一直在画面中央） | 3 / 16（Dead Space 脊柱灯带、The Callisto Protocol 后颈环灯、Scorn 生物机械枪；Resident Evil 2 把心电图放进背包，属于半叙事内） | Dead Space（steam:1693980）、Scorn（steam:698670）、The Callisto Protocol（steam:1544020 · 据已知描述）、Resident Evil 2（steam:883710 · 据已知描述） | 默认放置方式 = 叙事内；HUD 显隐策略 = 常驻；信息密度 = 极简；生命 / 护盾 / 体力 · 放置方式（逐元素） = 叙事内；生命 / 护盾 / 体力 · 世界挂点 = 玩家角色；数值图形（生命 / 护盾 / 体力） = 竖条；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素） = 叙事内；技能 / 冷却 / 弹药 / 手牌 · 世界挂点 = 手持物 / 武器 |
| 屏幕叠加细线极简：左上一行目标（彩色小菱形 + 黄色标题 + 白色说明），左下一条细血条 + 能量，其余全空；系统页是瑞士式表格叠在实时场景上。适用：悬疑 / 超自然动作，世界观本身偏现代主义 | 1 / 16（CONTROL）；Crow Country 的右下按键 + 弹药读数也属此类 | CONTROL（steam:870780）、Crow Country（steam:1996010） | HUD 组织方式 = 分散组件；信息密度 = 稀疏；信息元素集合 = 生命 / 护盾 / 体力 + 目标 / 路点；数值图形（生命 / 护盾 / 体力） = 细条；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 左上；转角 = 直角；标题字族 = 无衬线；面板明度 = 深色面板 |
| 风格化框内 / 贴边：2D 心理恐怖把 UI 做得「可爱」——四角手绘头像框（OMORI）、玩法区外套彩色雕花木框 + 两侧立绘（Little Goody Two Shoes）——可爱外壳与恐怖内容形成反差 | 2 / 16（OMORI edgeBar、Little Goody Two Shoes inMargin） | OMORI（steam:1150690）、Little Goody Two Shoes（steam:1812370） | HUD 组织方式 = 贴边整条；信息密度 = 中等；信息元素集合 = 队伍 / 玩家条 + 生命 / 护盾 / 体力 + 通知 / 大字提示；队伍 / 玩家条：画法 = 头像框 + 小血条；数值图形（生命 / 护盾 / 体力） = 图标列（心 / 面具）；图标风格 = 手绘彩绘 |
| 空间内对话：台词与选项气泡挂在角色头顶，边走边说、不暂停，选项各用一种颜色对应方向键 | 1 / 16（OXENFREE） | OXENFREE（steam:388880） | 默认放置方式 = 空间内；HUD 显隐策略 = 情境显现；对话框结构 = 带尾气泡；对话 / 事件选项：画法 = 聊天气泡；对话 / 事件选项 · 世界挂点 = 玩家角色 |

**关键元素与画法**

- **生命 / 护盾 / 体力**（`el.vitals`）：cmp.gauge@el.vitals=segmented / cmp.gauge@el.vitals=icons / cmp.gauge@el.vitals=dial（心电图） / cmp.gauge@el.vitals=vertical / cmp.gauge@el.vitals=ring / cmp.gauge@el.vitals=thinBar；常见位置 br、bl、tl、attachTo=player。恐怖要保留不确定感：粗粒度的分段条、心电图 + 「良好 / 注意 / 危险」文字（Resident Evil 2、Crow Country 背包页）比精确数字更让人紧张；常驻的话就画在角色身上（Dead Space、Callisto），否则只在受伤时出现在右下，与弹药成组，一眼答完「还能打吗」。2D 心理恐怖反而用心形图标列（Little Goody Two Shoes 左上心形 + 面包），可爱外观制造反差。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：el.abilities.form=ammo；常见位置 br、attachTo=held。弹药稀缺是生存恐怖的资源压力来源：「弹匣 / 备弹」两个数字 + 当前武器名放右下（The Last of Us、Crow Country），或直接投影在枪上（Dead Space）。手电电量是第二种「弹药」（Alan Wake 右下圆环）。
- **交互提示**（`el.interact`）：el.interact.form=keyPrompt / elx.worldRender=outline；常见位置 attachTo=poi。06 文档 A7：可交互物用微弱高光或描边，不用常驻图标；按键提示只在贴近时出现（Still Wakes the Deep）。复古作品把动作直接写在物品说明下方（Crow Country「按键 + 装填」）。
- **敌人血条 / 预警 / 意图**（`el.threat`）：elx.worldRender=outline（能力触发时描白敌人） / el.threat.form=edgeDir；常见位置 attachTo=target。恐怖不给敌人血条——未知就是恐惧。只有玩家主动用能力（The Last of Us Part II 聆听模式把敌人描白）时短暂标出位置，用完即隐。
- **字幕 / 说话人**（`el.subtitle`）：cmp.dialogBox=bare（说话人名 + 白字，无底板） / 压进宽银幕下黑边（D-letterbox）；常见位置 bc。恐怖大量靠声音叙事，字幕必不可少，但一块不透明底板会破坏黑暗画面：用无框白字 + 文字投影（Crow Country 底部说话人名 + 台词），电影画幅作品把字幕放进黑边（Hellblade II）。
- **对话 / 事件选项**（`el.choices`）：el.choices.form=bubbles / el.choices.form=text；常见位置 attachTo=player、center。OXENFREE 让三个选项气泡围在角色头顶、边走边说不暂停——对话不打断紧张感，可以被打断、也可以不选；OMORI 战斗中的指令是手绘云朵形气泡，延续童画风格。
- **队伍 / 玩家条**（`el.party`）：el.party.form=frames；常见位置 tl、tr、bl、br。OMORI 战斗把四个手绘头像框放在四角、敌人居中，每个框顶写情绪状态（平静 / 悲伤 / 生气…），下面心形与果汁两条——情绪是战斗属性，所以状态文字直接写在头像框上。
- **目标 / 路点**（`el.objective`）：el.objective.form=text；常见位置 tl。多数恐怖把目标放进地图 / 文件里按需查看；CONTROL 左上一行彩色菱形 + 大写标题 + 一句说明，是「有目标但不抢画面」的最小形态。
- **标题 / LOGO**（`el.title`）：el.title.form=titleCard；常见位置 center。章节标题卡（Alan Wake 像电视剧片头）给叙事节奏和喘息点；恐怖标题常用窄体粗字（08 文档 GameUI 作品统计、预设 ui.oppressive）。
- **按键 / 操作提示**（`el.prompt`）：el.prompt.form=contextual；常见位置 br。只显示当前能做的动作（Crow Country 右下两个按键图标 + 弹药数 + 武器名），不放整张键位图。

**重要界面**

- **背包 / 物品**：三种做法：①格子本身是稀缺资源——Resident Evil 2 方格可扩容，Resident Evil Village 是公文箱拼图格（物品占多格、要摆放）；②实时不暂停——The Last of Us 角色蹲下翻包，背包打开时仍可能被袭击（rel.behind = 实时）；③复古四联头部——Crow Country 顶部四格（头像 / 心电图状态 / 已装备武器 / 地图键），物品散放在黑底上带数量，选中物的详情是红底面板 + 说明 + 可用动作。共同点：生命状态在背包里看（叙事内读数）。 例：Crow Country（steam:1996010）、Resident Evil 2（steam:883710 · 据已知描述）、Resident Evil Village（steam:1196590 · 据已知描述）、The Last of Us Part I（steam:1888930 · 据已知描述）。
- **制作 / 合成**：制作嵌在背包里、同样实时不暂停（The Last of Us）：材料不够的配方灰显，做的过程有读条，期间可被打断。 例：The Last of Us Part I（steam:1888930 · 据已知描述）。
- **地图 / 世界地图**：示意图式：灰色房间块 + 走廊线 + 房间名（Crow Country），房间状态（已清空 / 还有东西 / 门上锁）是这类地图的核心；地图难读或缺失是恐怖类第二大抱怨。 例：Crow Country（steam:1996010）、CONTROL（steam:870780）、Scorn（steam:698670）。
- **对话 / 文本**：四种：头顶气泡不暂停（OXENFREE）；黑底白框 + 像素字通栏（OMORI）；卷边羊皮纸条 + 大立绘（Little Goody Two Shoes）；说话人名 + 无框字幕（Crow Country）。恐怖对话框普遍「小、暗、不挡画面」。 例：OXENFREE（steam:388880）、OMORI（steam:1150690）、Little Goody Two Shoes（steam:1812370）、Crow Country（steam:1996010）。
- **标题 / 主菜单**：反差最常见：OMORI 白底铅笔线稿角色 + 小按钮，Little Goody Two Shoes 明亮童话插画——标题页故意不恐怖，把落差留给游戏。 例：OMORI（steam:1150690）、Little Goody Two Shoes（steam:1812370）。
- **角色 / 装备 / 属性**：装备 / 改造页（CONTROL 武器改造）：左上面包屑 + 返回键，右上资源数，左侧方格（空格用斜线纹），右侧红色小标题 + 等级 + 属性行（增减量用绿色），锁定行写「升级解锁」+ 锁图标，右下按键动作带消耗；整页是黑底白字瑞士式表格叠在压暗的实时场景上。 例：CONTROL（steam:870780）。
- **设置**：亮度 / 伽马校准页是恐怖的必需品（暗部换显示器就会压死）：示例图 + 「刚好看不见 / 刚好看得见」两档标记。参考卡里没有截到，来自 06 文档 A7 的建议。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 零 HUD · 世界即界面（`fam.zero-hud`）（3 张）：零 HUD · 世界即界面：本品类主归属卡 Still Wakes the Deep、Little Nightmares、Scorn（理由见 17 号图谱该家族的「多见品类」）。
- 生存恐怖物品检视（`fam.survival-horror`）（3 张）：生存恐怖物品检视：本品类主归属卡 Resident Evil Village、Crow Country、Resident Evil 2（理由见 17 号图谱该家族的「多见品类」）。
- 科幻 HUD（`fam.scifi`）（2 张）：恐怖把 HUD 收进角色身体（Dead Space 脊柱、Callisto 后颈），叙事内读数增加压迫感。
- 情境渐显 · 角落小件（`fam.contextual-hud`）（2 张）：情境渐显 · 角落小件：本品类主归属卡 The Last of Us Part I、The Last of Us Part II Remastered（理由见 17 号图谱该家族的「多见品类」）。
- 电影宽银幕 / 片头字幕（`fam.cinematic-letterbox`）（2 张）：电影宽银幕 / 片头字幕：本品类主归属卡 Alan Wake、Hellblade II（理由见 17 号图谱该家族的「多见品类」）。
- 重装饰雕花框（`fam.ornate-frame`）（1 张）：Little Goody Two Shoes 鎏金画框包像素玩法区。
- 手绘笔记本（`fam.notebook`）（1 张）：OMORI 用儿童画的天真来反衬恐怖。
- 漫画对话框（`fam.comic`）（1 张）：叙事悬疑（OXENFREE）：世界内气泡对话。

**代表作**

- Dead Space（steam:1693980）〔科幻 HUD〕：Dead Space：叙事内 HUD 的教科书——生命是背脊灯带、弹药投影在枪上、菜单是角色面前的全息面板；越肩视角让角色背部常在画面中央，这是它能成立的前提。
- CONTROL（steam:870780）〔瑞士几何 / 极简表格〕：CONTROL：屏幕叠加也能克制——左上一行目标 + 左下细血条；系统页是瑞士式表格叠在实时场景上。同时是反例：去重后地图 5 条、引导 3 条抱怨（原来的「挡视野 4 条」复核后说的是渲染故障与红光，已撤回）。
- Crow Country（steam:1996010）〔生存恐怖物品检视〕：Crow Country：复古生存恐怖的完整菜单词汇（头像 / 心电图状态 / 已装备 / 地图键四联头 + 散放物品 + 红底详情 + 情境按键），示意图地图，说话人名字幕。
- OXENFREE（steam:388880）〔漫画对话框〕：OXENFREE：对话选项挂在角色头顶、三色气泡对应方向键、边走边说不暂停——「对话不打断节奏」的最好示范。
- OMORI（steam:1150690）〔手绘笔记本〕：OMORI：可爱手绘外壳 + 四角头像框写情绪状态 + 黑底白框像素字对话，演示「风格反差」作为恐怖手段。
- Resident Evil 2（steam:883710 · 据已知描述）〔生存恐怖物品检视〕：Resident Evil 2：零常驻 HUD，生命在背包里看心电图（绿 / 黄 / 红），背包格子可扩容——状态读数从 HUD 移进菜单。
- The Last of Us Part I（steam:1888930 · 据已知描述）〔情境渐显 · 角落小件〕：The Last of Us Part I：右下一小组（分段生命 + 弹药）情境显现；背包与制作实时不暂停，把菜单操作也变成紧张的一部分。

**坑**

- 零 HUD 又不给提示：玩家迷路、不知道能和什么互动 例：Scorn（steam:698670）、Little Nightmares（steam:424840）、Hellblade II（steam:2461850）。
  - 评价与证据（依据：评测）：R3 引导类去重后：Scorn 7（与 Kingdom Two Crowns 并列全库最多）、Little Nightmares 2、Hellblade II 2；Scorn 另有地图抱怨 3。
- 地图缺失或难读，房间状态看不出来 例：CONTROL（steam:870780）、Scorn（steam:698670）、Resident Evil Village（steam:1196590 · 据已知描述）、The Callisto Protocol（steam:1544020 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 地图类去重后：CONTROL 5、Scorn 3、Resident Evil Village 2、The Callisto Protocol 2。
- 背包格子稀缺做成了折磨（来回丢东西、存箱） 例：Resident Evil 2（steam:883710 · 据已知描述）、The Callisto Protocol（steam:1544020 · 据已知描述）。
  - 评价与证据（依据：评测）：R3 背包类去重后：Resident Evil 2 3、The Callisto Protocol 2（另有 2 条说背包被杂物塞满）；全库另有 Resident Evil 5 的 4 条。
- 屏幕叠加的大字 / 提示挡画面 例：CONTROL（steam:870780）。
  - 评价与证据（依据：截图）：看图：CONTROL 的巨型标题与提示叠在画面上。评测证据不足：CONTROL 与 The Callisto Protocol 原来的「挡视野 / 字太小」命中复核后都不是在说 HUD 或文字。
- 黑位压死：换显示器或伽马后暗部全黑，UI 与线索一起消失；噪点 / 颗粒 / 色差叠太多打碎剪影
  - 评价与证据（依据：文献）：无评测计数；06 文档 A7 的美术陷阱，建议提供亮度校准页并做伽马 ±0.2 测试

**可演示的对比**

- **生命：右下情境小组 vs 背脊灯带**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：分段格 → 竖条；技能 / 冷却 / 弹药 / 手牌 · 世界挂点：不挂（用屏幕锚点） → 手持物 / 武器；技能 / 冷却 / 弹药 / 手牌 · 放置方式（逐元素）：继承 → 叙事内；技能 / 冷却 / 弹药 / 手牌：画法：弹药数字 → 自动
  - 配套改动：HUD 显隐策略：情境显现 → 常驻；生命 / 护盾 / 体力 · 放置方式（逐元素）：屏幕叠加 → 叙事内；生命 / 护盾 / 体力 · 屏幕锚点：右下 → 自动；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 自动；生命 / 护盾 / 体力 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；默认放置方式：屏幕叠加 → 叙事内
  - 看什么：a 平时屏幕全空、受伤才出现；b 一直「在」但长在角色身上——看哪一种更适合当前镜头（越肩才撑得起 b）
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-horror#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud`
  - A：`rel.hudVisibility=contextual` `el.vitals.diegesis=screen` `el.vitals.screenAnchor=br` `cmp.gauge@el.vitals=segmented` `el.abilities.form=ammo` `el.abilities.screenAnchor=br` `el.abilities.attachTo=none` `el.abilities.diegesis=inherit` `el.vitals.attachTo=none` `rel.diegesis=screen`
  - B：`rel.hudVisibility=always` `rel.diegesis=diegetic` `el.vitals.diegesis=diegetic` `el.vitals.attachTo=player` `cmp.gauge@el.vitals=vertical` `el.abilities.diegesis=diegetic` `el.abilities.attachTo=held` `el.abilities.form=auto` `el.abilities.screenAnchor=auto` `el.vitals.screenAnchor=auto`

  </details>
- **低血提示：数字读数 vs 画面效果**（单变量对照；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（生命 / 护盾 / 体力）：横条 → 分段格
  - 配套改动：生命 / 护盾 / 体力 · 数值标注：当前 / 上限 → 不标；生命 / 护盾 / 体力 · 显隐（逐元素）：常驻 → 情境显现；元 UI 屏幕效果：无 → 低血去饱和 + 受击红边
  - 看什么：a 精确但冷静；b 不告诉你还剩多少，只让画面变灰、变红——恐怖要的是 b 的不确定
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-horror#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.hud`
  - A：`cmp.gauge@el.vitals=bar` `el.vitals.valueLabel=currentMax` `el.vitals.visibility=always` `rel.metaFx=[]`
  - B：`cmp.gauge@el.vitals=segmented` `el.vitals.valueLabel=none` `el.vitals.visibility=contextual` `rel.metaFx=lowHpDesat+hurtVignette`

  </details>
- **背包：暂停全屏拼图格 vs 实时翻包**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：界面子功能：拼图格背包 → 背包 / 仓库；阻断性：模态 → 非阻断；容器：全屏页 → 底 / 顶托盘；背后画面来源：冻结 → 实时场景
  - 配套改动：压暗强度：0.7 → 0.2
  - 看什么：a 是安静的整理时间（Resident Evil 公文箱），b 把整理变成风险（The Last of Us 蹲下翻包）——同一份物品，两种节奏
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-horror#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.inventory`
  - A：`cnt.subtype=packGrid` `lay.container=fullscreen` `rel.behind=frozen` `rel.dim=0.7` `ix.blocking=modal`
  - B：`cnt.subtype=bag` `lay.container=tray` `rel.behind=live` `rel.dim=0.2` `ix.blocking=none`

  </details>
- **零 HUD 的补偿：完全不提示 vs 贴近才描边**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：字幕 / 说话人 → 字幕 / 说话人 + 交互提示；交互提示 · 世界挂点：不挂（用屏幕锚点） → 兴趣点；交互提示 · 显隐（逐元素）：继承 → 情境显现
  - 配套改动：交互提示：画法：无 → 按键图标 + 文字；交互提示 · 世界渲染（逐元素）：继承 → 物体描边
  - 看什么：屏幕上几乎一样空；b 只在走近可交互物时给一圈描边和一个按键——对照 Scorn 引导抱怨 7 条（去重后）
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-horror#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `rel.hudVisibility=hidden` `cnt.screen=screen.hud`
  - A：`cnt.elements=el.subtitle` `el.interact.attachTo=none` `el.interact.form=[]` `el.interact.visibility=inherit` `el.interact.worldRender=inherit`
  - B：`cnt.elements=el.subtitle+el.interact` `el.interact.visibility=contextual` `el.interact.attachTo=poi` `el.interact.worldRender=outline` `el.interact.form=keyPrompt`

  </details>
- **对话：底部通栏暂停 vs 头顶气泡不暂停**（整套做法对照（多个参数一起变）；内容包：horror · 黑水疗养院；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：对话框结构：底部通栏 → 带尾气泡；对话 / 事件选项 · 世界挂点：不挂（用屏幕锚点） → 玩家角色；对话 / 事件选项：画法：文字行 → 聊天气泡；默认放置方式：屏幕叠加 → 空间内
  - 配套改动：对话 / 事件选项 · 屏幕锚点：下中 → 自动；背后画面来源：冻结 → 实时场景；阻断性：模态 → 非阻断
  - 看什么：b 的选项跟着角色走、世界不停——紧张感不被对话框打断（OXENFREE）
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-horror#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=horror` `cnt.screen=screen.dialogue`
  - A：`cmp.dialogBox=bar` `el.choices.form=text` `el.choices.screenAnchor=bc` `rel.behind=frozen` `ix.blocking=modal` `el.choices.attachTo=none` `rel.diegesis=screen`
  - B：`cmp.dialogBox=bubble` `rel.diegesis=spatial` `el.choices.form=bubbles` `el.choices.attachTo=player` `rel.behind=live` `ix.blocking=none` `el.choices.screenAnchor=auto`

  </details>

**样例内容**：恐怖与悬疑（`horror#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（6 项）</summary>

- 粗粒度状态读数（心电图波形 + 良好 / 注意 / 危险 文字）：cmp.gauge 只有表盘可近似——cmp.gauge 增加 ecg（波形 + 分级文字），elx.valueLabel 增加 tier（分级词）
- 地图房间状态（已清空 / 有物品 / 上锁门）无法编码，vis.mapUnexplored 只管未探索区——vis.mapRoomState（multi：颜色 / 图标 / 门锁符号）
- 亮度 / 伽马校准页没有对应的子功能——cnt.subtype 增加 calibration（parent = screen.settings）
- 字幕没有形态参数：说话人名、无框 / 底板、声源方向、压进黑边——el.subtitle.form（bare / scrim / speakerName / directional / inLetterbox）
- 情绪 / 精神状态标签写在头像框上（OMORI）：el.party 没有状态文字位——el.party 增加 statusLabel，或 st.statusMark 允许作用于 el.party
- 能力触发的短暂世界标注（聆听模式描白敌人）：只能写 elx.worldRender = outline，缺「按键触发、几秒后渐隐」——elx.visibility 增加 pulse（按键脉冲后渐隐）

</details>

**最相关的原则**（按针对性排序）：[P-pause-world-state](#p-pause-world-state)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-meta-perception](#p-meta-perception)、[P-hudless-tax](#p-hudless-tax)、[P-contextual-hud](#p-contextual-hud)、[P-inventory-capacity-model](#p-inventory-capacity-model)、[P-map-conventions](#p-map-conventions)、[P-save-continuity](#p-save-continuity)、[P-subtitles-captions](#p-subtitles-captions)、[P-prompt-in-context](#p-prompt-in-context)、[P-medium-simulation](#p-medium-simulation)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-two-questions-per-element](#p-two-questions-per-element) 等 22 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.15 解谜与侦探

参考卡 26 张 · 探索台内容包：puzzle（雾城疑案）

解谜的界面大多「缺席」（Steam 解谜 16 张里 14 张信息密度极简），真有 UI 时只留一个角落入口和边缘滑出的物品栏；推理类把书 / 笔记本当主界面。最要紧的是提示阶梯和热点可见性——不能逼玩家逐像素扫屏。

**子类**：点击冒险：Machinarium、CHUCHEL、Return to Monkey Island、Grim Fandango Remastered；机关 / 盒子解谜：The Room；空间 / 视错觉 / 画格拼接：Monument Valley、Gorogoa、Mirror Drop、Old Man's Journey；推理 / 侦探：Return of the Obra Dinn、L.A. Noire；语言 / 符号破译：Chants of Sennaar；元界面叙事（整部游戏是一个假操作系统）：Hypnospace Outlaw；氛围艺术解谜：Genesis Noir、Lumino City、Papetura；手游消除 / 消除对战（竖屏）：Call of Antia、小小传说 Little Legends、Star Blast、球球快跑、小森灵；合成剧情：Gossip Harbor、Puzzle&Palace；另有 3 张 GameUI 卡是签到 / 转盘 / 首充运营页，按范围不纳入原则（见 meta.scope）

**一眼要知道什么**

1. 哪些东西可以碰 / 检查（热点在哪）？——不应逼玩家逐像素扫屏
2. 这一屏 / 这一关的目标是什么，离完成还差什么（手游消除：目标数 + 剩余步数）？
3. 我已经知道了什么：线索、已确认的推断、已破译的符号？
4. 手上有什么物品，能和什么组合？
5. 卡住时怎样拿到「刚好够」的提示而不被剧透？
6. 刚才的操作对不对：机关到位了吗、推断成立吗？
7. （对战消除）现在轮到谁，对手几回合后出手？

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 零 UI：画面即界面。没有任何常驻元素，提示、反馈、进度全部由画面本身承担（机关动、光变、画格拼合）。适用：单屏 / 单场景、交互对象少且大 | 7 / 26（Gorogoa、CHUCHEL、Lumino City、Papetura、Mirror Drop、Old Man's Journey、Genesis Noir）；Steam 解谜 16 张里 14 张信息密度 = 极简 | Gorogoa（steam:557600）、CHUCHEL（steam:711660）、Lumino City（steam:205020）、Papetura（steam:593640） 等 7 款 | HUD 显隐策略 = 电影模式（全隐）；信息密度 = 极简；容器 = 不画 UI；UI 与画面关系 = 同一媒介 |
| 一个角落入口 + 边缘滑出物品栏：常驻的只有一个细线小图标（菜单 / 暂停），物品栏只在需要「用物品」时从屏幕边缘滑出。适用：点击冒险、机关解谜 | 4 / 26（Monument Valley 左上细线圆点；The Room 右上暂停 + 左侧竖列空格；Machinarium 物品栏从上沿下拉；Return to Monkey Island 从下沿滑出） | Monument Valley（steam:1927720）、The Room（steam:288160）、Machinarium（steam:40700）、Return to Monkey Island（steam:2060130 · 据已知描述） | 信息密度 = 极简；HUD 显隐策略 = 情境显现；信息元素集合 = 建造栏 / 系统入口条 + 技能 / 冷却 / 弹药 / 手牌；建造栏 / 系统入口条：画法 = 系统入口小图标；建造栏 / 系统入口条 · 屏幕锚点 = 左上；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 左中；技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素） = 情境显现；图标风格 = 线性 |
| 书 / 笔记本是主界面：玩家的推理结果写进一本书（名册、死因、词义、审讯问题），书本有页签与分页，画面是「去找线索的地方」。适用：推理、破译、侦探 | 3 / 26（Return of the Obra Dinn、Chants of Sennaar、L.A. Noire 笔记本） | Return of the Obra Dinn（steam:653530）、Chants of Sennaar（steam:1931770）、L.A. Noire（steam:110800 · 据已知描述） | 界面类型 = 任务日志 / 目标；场景容器 = 书；UI 与画面关系 = 同一媒介；内芯材质 = 米白纸；分区方式 = 左右分栏；入场动效 = 翻页 / 开书；内芯结构 = 材质平铺 |
| 叙事内整机界面：整部游戏是一台 1999 年的电脑——浏览器窗口、地址栏面包屑、标题栏日期时间、左侧贴纸工具栏、右侧标签列表、任务栏；可拖动窗口、闪烁 GIF | 1 / 26（Hypnospace Outlaw） | Hypnospace Outlaw（steam:844590） | 默认放置方式 = 叙事内；容器 = 可拖动窗口；信息密度 = 极密；骨架色彩策略 = 骨架多色；光泽高光 = 顶部玻璃高光；场景容器 = CRT 电视 / 电脑终端 |
| 玩法区外装饰边：4:3 画面两侧用题材纹样填满（装饰艺术 / 亡灵节），字幕直接写在画面下方 | 1 / 26（Grim Fandango Remastered） | Grim Fandango Remastered（steam:316790） | 屏幕宽高比 = 4:3；玩法区形态 = 4:3 / 小窗加黑边；装饰预算 = 中；装饰母题 = 几何线 / 同心圆；对话框结构 = 无框字幕 |
| 竖屏上下分区：上半是角色 / 敌人或目标与步数，下半是棋盘，底部一排英雄头像或道具。适用：手游消除、消除对战 | 4 / 26（Call of Antia、小小传说 Little Legends、Star Blast、球球快跑） | Call of Antia（gameui:3830）、小小传说 Little Legends（gameui:4456）、Star Blast（gameui:4332）、球球快跑（测试）（gameui:6393） | 画幅朝向 = 竖屏；分区方式 = 上下分栏；玩法区形态 = 棋盘 / 关卡窗；信息密度 = 中等；信息元素集合 = 目标 / 路点 + 计时 / 分数 / 回合 + 命中反馈 / 连击 + 引导指示 / 聚光；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 右上；目标 / 路点 · 屏幕锚点 = 左上 |

**关键元素与画法**

- **交互提示**（`el.interact`）：el.interact.form=cursor / 画面内手绘提示物（问号）；常见位置 attachTo=cursor、attachTo=poi。解谜最怕「像素猎杀」。可交互的视觉语言要统一：Obra Dinn 的放大镜光标、CHUCHEL 画在场景里的手绘问号——提示长成世界的一部分，而不是浮动图标（06 文档 A6：所有可检查物同色微光，或靠近时才提示）。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：el.abilities.form=hotbar；常见位置 tc、bc、ml。点击冒险的物品栏只在「要用物品」时出现，从屏幕边缘滑出（Machinarium 上沿、Return to Monkey Island 下沿、The Room 左侧竖列）；平时不占画面。
- **建造栏 / 系统入口条**（`el.toolbar`）：el.toolbar.form=microMenu / 画面母题入口（纸角折起）；常见位置 tl、tr。解谜唯一常驻的往往是「出口」：Monument Valley 左上一个细线圆圈，The Room 右上暂停圆钮，Gorogoa 右上角纸张折起——入口做到最小，或借用作品的材质母题。
- **字幕 / 说话人**（`el.subtitle`）：cmp.dialogBox=bubble（图画代替台词） / cmp.dialogBox=bare（彩色字幕） / cmp.dialogBox=chatThread；常见位置 attachTo=player、bc。Machinarium 的思想气泡里是手绘小图而不是文字（零本地化、零阅读负担）；Grim Fandango 用彩色无框字幕；合成手游剧情用聊天气泡（Gossip Harbor）。
- **目标 / 路点**（`el.objective`）：el.objective.form=marker / el.objective.form=text；常见位置 tl。Steam 解谜几乎不写目标（发现目标本身就是谜题）；手游消除则把目标图标 + 剩余数量放左上（Star Blast：气球图标 + 40），与右上步数对称，中间放吉祥物头像。
- **计时 / 分数 / 回合**（`el.timer`）：el.timer.form=number / el.timer.form=badge；常见位置 tr、tc。步数是消除的「预算」，大号数字放右上（Star Blast）；对战消除用星形回合章（第 2 / 3 回合）放上中，下方一条「我的回合」横条。
- **命中反馈 / 连击**（`el.feedback`）：el.feedback.form=rating；常见位置 center。消除的连锁用立体描边评价大字（小小传说的「完美」字样压在棋盘中央）；Steam 解谜的反馈交给机关动作与声音，不出字。
- **引导指示 / 聚光**（`el.guide`）：el.guide.form=box / el.guide.form=npcBubble；常见位置 center。手游教学是一次性的：横贯棋盘的圆角提示条 + 高亮目标棋子（Star Blast），或高亮一整行 + 上方说明条（Call of Antia）；不常驻。
- **敌人血条 / 预警 / 意图**（`el.threat`）：el.threat.form=healthBar / el.threat.form=intent；常见位置 attachTo=target。消除对战：敌人脚下细血条 + 回合数字（几回合后出手），把「对手意图」压缩成一个数字；双方头像 + 血量数字放顶部两侧（小小传说）。
- **队伍 / 玩家条**（`el.party`）：el.party.form=portraitRow；常见位置 bc。底部一排英雄半身头像，每个下方一条元素色充能条，颜色与棋盘宝石一一对应——颜色把「消哪种宝石 → 谁充能」直接连起来。
- **标题 / LOGO**（`el.title`）：el.title.form=artTitle / el.title.form=logo；常见位置 center。Obra Dinn 的标题页是 19 世纪海报 / 书页衬线排版，1 位色——标题页就在交代「这是一份档案」。

**重要界面**

- **任务日志 / 目标**：书本即主界面：左图右文（Chants of Sennaar 左页人物插画、右侧环形 / 六角排布的符号牌由玩家拖进图下空位），书签页签标章节；Obra Dinn 是整本档案册（名册、甲板图、事件页）；L.A. Noire 笔记本记线索与审讯问题。输入（名字、词义）写进书里，确认要克制——推理类不轻易告诉你对错。 例：Chants of Sennaar（steam:1931770）、Return of the Obra Dinn（steam:653530）、L.A. Noire（steam:110800 · 据已知描述）。
- **暂停菜单**：无框浮空确认：场景轻微压暗，一行宽字距大写问句 + 两个细线圆圈图标按钮（取消 / 退出），没有面板（Monument Valley）。 例：Monument Valley（steam:1927720）。
- **关卡 / 章节选择**：章节以竖向场景画呈现，文字只有细线图标与宽字距大写，延续局内的无面板做法（Monument Valley）。 例：Monument Valley（steam:1927720）。
- **标题 / 主菜单**：标题页交代媒介：Obra Dinn 的标题与目录是 19 世纪海报 / 书封式衬线排版、1 位色——第一屏就告诉玩家「这是一份档案」。 例：Return of the Obra Dinn（steam:653530）。
- **对话 / 文本**：三种：图画气泡（Machinarium，无文字）；彩色无框字幕（Grim Fandango）；聊天气泡流 + 头像（Gossip Harbor）。 例：Machinarium（steam:40700）、Grim Fandango Remastered（steam:316790）、绯闻港口 Gossip Harbor（gameui:4834）。
- **教程 / 提示卡**：手游消除：一次性提示条 + 高亮（Star Blast）；发现类内容用米白卡 + 绿色标题条的图鉴卡（小森灵「我的新发现」）。 例：Star Blast（gameui:4332）、小森灵（gameui:3052）。
- **结算 / 胜负 / 奖励**：关卡结算：大号立体评价字 + 星 + 底部「点任意处继续」小字（Star Blast）；本文只取结构，不涉及奖励 / 运营演出。 例：Star Blast（gameui:4332）。
- **图鉴 / 收集 / 成就**：图鉴 / 发现：米白卡片 + 彩色标题条 + 物件插图 + 一句说明（小森灵）。 例：小森灵（gameui:3052）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 零 HUD · 世界即界面（`fam.zero-hud`）（8 张）：零 HUD · 世界即界面：本品类主归属卡 Monument Valley、The Room、Machinarium 等（理由见 17 号图谱该家族的「多见品类」）。
- 糖果卡通（Q 版）（`fam.candy`）（3 张）：棋盘本身就是糖果 / 果冻，UI 用同材质的厚框弹窗与糖果按钮（Star Blast、小小传说）。
- 圆润友好（`fam.cozy`）（2 张）：小森灵、Gossip Harbor：休闲 / 治愈题材，米白卡、圆角、聊天气泡。
- 暗金金属牌（`fam.dark-gold`）（1 张）：三消 / 卷轴商人手游，只有对话框名牌可用。
- 重装饰雕花框（`fam.ornate-frame`）（1 张）：Puzzle&Palace 捏人页的金色相框。
- 装饰艺术（`fam.art-deco`）（1 张）：Grim Fandango：冒险解谜，零 HUD，边柱纹样。
- 手绘笔记本（`fam.notebook`）（1 张）：Chants of Sennaar 让玩家在笔记里自己填词义，笔记就是解谜工具。
- 手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`）（1 张）：Lumino City、Papetura、Tengami

**代表作**

- Gorogoa（steam:557600）〔零 HUD · 世界即界面〕：Gorogoa：2×2 画格就是玩法区与界面，米白纸底边缘画着淡铅笔草图，右上纸角折起当菜单——零 UI 也能有完整的「媒介感」。
- Chants of Sennaar（steam:1931770）〔手绘笔记本〕：Chants of Sennaar：书本主界面 + 玩家自己填词义，符号牌在右侧环形排布，图下有空位——「玩家的知识」变成可见的 UI。代价：没有地图（地图抱怨 5 条）。
- Return of the Obra Dinn（steam:653530）〔1-bit 抖动 / 经典 Mac〕：Return of the Obra Dinn：1 位色画面 + 19 世纪衬线书页，档案册是主要界面，放大镜光标；滤镜会吃小字（看图判断；评测里没有可靠的字号计数）。
- Hypnospace Outlaw（steam:844590）〔复古桌面操作系统〕：Hypnospace Outlaw：整部游戏是假操作系统，极密信息（密度 4）也成立，因为密度本身就是题材的一部分。
- The Room（steam:288160）〔零 HUD · 世界即界面〕：The Room：屏幕上只有右上一个暂停圆钮与左侧一列物品空格，盒子与机关就是界面——机关解谜的最小 HUD。
- Machinarium（steam:40700）〔零 HUD · 世界即界面〕：Machinarium：思想泡泡里画图不写字，物品栏从上沿下拉——无文字叙事的范例，UI 抱怨 0。
- Monument Valley（steam:1927720）〔零 HUD · 世界即界面〕：Monument Valley：常驻只有左上一个细线圆点；退出确认是无框浮空的宽字距大写 + 细线图标按钮。
- Star Blast（gameui:4332）〔糖果卡通（Q 版）〕：Star Blast：顶部「目标 | 吉祥物 | 步数」三联、横贯棋盘的教学提示条、结算大字 + 星级——手游消除 HUD 的标准结构（只看玩法与结算，不看运营）。

**坑**

- 零引导导致卡关：没有任何提示阶梯 例：Gorogoa（steam:557600）、Genesis Noir（steam:735290）、Return of the Obra Dinn（steam:653530）、Lumino City（steam:205020）。
  - 评价与证据（依据：评测）：R3 引导类去重后：Gorogoa 3、Return of the Obra Dinn 2、Genesis Noir 1、Lumino City 1（样本仅 7 条）。
- 需要来回走动的解谜却没有地图 例：Chants of Sennaar（steam:1931770）。
  - 评价与证据（依据：评测）：R3 地图类：Chants of Sennaar 5
- 抖动 / 纸纹 / 描线滤镜把小字和小符号吃掉 例：Return of the Obra Dinn（steam:653530）。
  - 评价与证据（依据：截图）：看图：Obra Dinn 的抖动滤镜确实会吃掉细笔画。评测证据不足：原来的「字太小 2 条」复核后不是在说文字。06 文档 A6 同一陷阱。
- 老式物品栏 / 菜单：翻找物品、组合操作繁琐 例：Grim Fandango Remastered（steam:316790）。
  - 评价与证据（依据：评测）：R3 去重后：Grim Fandango Remastered 背包 1、菜单 1（证据很弱）。
- 像素猎杀：关键线索太小或与背景同明度
  - 评价与证据（依据：文献）：无评测计数；06 文档 A6 的美术陷阱（同屏真线索 3–5 个为宜）

**可演示的对比**

- **线索日志：通用列表页 vs 书本容器**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 书；内芯结构：程序填充 → 材质平铺；容器：全屏页 → 自动；入场动效：硬切 → 翻页 / 开书
  - 配套改动：详情呈现：常驻一侧 → 自动；UI 与画面关系：中性 → 同一媒介；面板明度：深色面板 → 中明度；标题字族：无衬线 → 衬线；输入框形态：自动 → 纸面下划线
  - 看什么：同样左右分栏、同样的信息；b 把「记录」变成世界里的一件东西，下划线输入让玩家像在本子上写字
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-puzzle#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.journal` `lay.composition=splitLR` `ast.coreMat=paper`
  - A：`lay.container=fullscreen` `ast.container=none` `lay.detail=persistent` `rel.harmony=neutral` `col.lightness=dark` `typ.display.family=sans` `ast.core=procedural` `cmp.input=auto` `mo.enter=cut`
  - B：`ast.container=book` `rel.harmony=sameMedium` `mo.enter=pageTurn` `cmp.input=underline` `typ.display.family=serif` `ast.core=texture` `col.lightness=mid` `lay.container=auto` `lay.detail=auto`

  </details>
- **物品栏：常驻底栏 vs 边缘滑出**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：稀疏 → 极简；信息元素集合：技能 / 冷却 / 弹药 / 手牌 → 技能 / 冷却 / 弹药 / 手牌 + 建造栏 / 系统入口条；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：下中 → 上中；技能 / 冷却 / 弹药 / 手牌 · 显隐（逐元素）：常驻 → 情境显现
  - 配套改动：HUD 显隐策略：常驻 → 情境显现；建造栏 / 系统入口条：画法：自动 → 系统入口小图标；建造栏 / 系统入口条 · 屏幕锚点：自动 → 右上
  - 看什么：b 平时只剩右上一个小图标，鼠标靠近上沿物品栏才下拉（Machinarium）——场景画面完整
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-puzzle#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `el.abilities.form=hotbar` `cnt.screen=screen.hud`
  - A：`cnt.elements=el.abilities` `el.abilities.screenAnchor=bc` `el.abilities.visibility=always` `rel.hudVisibility=always` `cnt.density=1` `el.toolbar.form=auto` `el.toolbar.screenAnchor=auto`
  - B：`cnt.elements=el.abilities+el.toolbar` `el.abilities.screenAnchor=tc` `el.abilities.visibility=contextual` `el.toolbar.form=microMenu` `el.toolbar.screenAnchor=tr` `rel.hudVisibility=contextual` `cnt.density=0`

  </details>
- **退出确认：标准面板 vs 无框浮空**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：图标风格：扁平填充 → 线性
  - 配套改动：弹窗结构：标准面板 → 无框浮空；压暗强度：0.6 → 0.25；背后画面来源：冻结 → 实时场景；标题大小写：自动 → 全大写
  - 看什么：b 只有一行问句和两个细线图标，场景几乎不变暗（Monument Valley）——解谜的系统界面也要轻
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-puzzle#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `cnt.screen=screen.pause` `lay.container=modal` `ctx.locale=en`
  - A：`cmp.modal=standard` `rel.dim=0.6` `rel.behind=frozen` `typ.display.case=auto` `vis.iconStyle=flat`
  - B：`cmp.modal=floating` `vis.iconStyle=line` `typ.display.case=upper` `rel.dim=0.25` `rel.behind=live`

  </details>
- **卡关时：不给提示 vs 软提示光圈**（单变量对照；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：无 → 引导指示 / 聚光 + 交互提示
  - 配套改动：引导强制度：无引导 → 软提示（可忽略）；引导指示 / 聚光：画法：自动 → 光圈脉冲；交互提示：画法：无 → 光标变化
  - 看什么：b 只在停留一段时间后，给下一个可交互物一圈淡光圈——对照 Gorogoa / Genesis Noir 的引导抱怨
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-puzzle#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `rel.hudVisibility=hidden` `cnt.screen=screen.hud`
  - A：`ix.guideForce=none` `cnt.elements=[]` `el.guide.form=auto` `el.interact.form=[]`
  - B：`ix.guideForce=soft` `cnt.elements=el.guide+el.interact` `el.guide.form=ring` `el.interact.form=cursor`

  </details>
- **竖屏消除：目标 / 步数 vs 对战血量与意图**（整套做法对照（多个参数一起变）；内容包：puzzle · 雾城疑案；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息元素集合：目标 / 路点 + 计时 / 分数 / 回合 + 命中反馈 / 连击 → 生命 / 护盾 / 体力 + 计时 / 分数 / 回合 + 敌人血条 / 预警 / 意图 + 队伍 / 玩家条 + 命中反馈 / 连击；目标 / 路点 · 屏幕锚点：左上 → 自动；计时 / 分数 / 回合：画法：数字 → 回合徽章；计时 / 分数 / 回合 · 屏幕锚点：右上 → 上中
  - 配套改动：目标 / 路点：画法：标记图标 → 无；同屏玩家与视口：单人 → 1v1 镜像对战；队伍 / 玩家条：画法：自动 → 肖像行；队伍 / 玩家条 · 屏幕锚点：自动 → 下中；敌人血条 / 预警 / 意图：画法：无 → 敌人血条 + 意图图标 + 数字
  - 看什么：同一块棋盘：a 的压力来自「步数预算」，b 来自「对手几回合后出手」——顶部信息完全不同，下半屏不变
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-puzzle#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=puzzle` `ctx.orientation=portrait` `lay.composition=splitTB` `lay.playfield=boardWindow` `el.feedback.form=rating` `cnt.screen=screen.hud`
  - A：`cnt.elements=el.objective+el.timer+el.feedback` `el.objective.form=marker` `el.objective.screenAnchor=tl` `el.timer.form=number` `el.timer.screenAnchor=tr` `ctx.players=single` `el.party.form=auto` `el.party.screenAnchor=auto` `el.threat.form=[]`
  - B：`ctx.players=versus` `cnt.elements=el.vitals+el.timer+el.threat+el.party+el.feedback` `el.timer.form=badge` `el.timer.screenAnchor=tc` `el.threat.form=healthBar+intent` `el.party.form=portraitRow` `el.party.screenAnchor=bc` `el.objective.form=[]` `el.objective.screenAnchor=auto`

  </details>

**样例内容**：解谜与侦探（`puzzle#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（7 项）</summary>

- 分级提示（方向 → 具体 → 答案）没有参数；ix.guideForce 只管强制度——ix.hintLadder：无 / 2 级 / 3 级 / 停留一定时间自动
- 玩家在书里填写（从词库拖词入空、写名字 + 死因）：cmp.input 只描述输入框外观——ix.mode 增加 fillSlots（拖词 / 选词入空位）
- 分批确认推断（攒够若干条正确才告知）——ix.confirm 增加 batch
- 画格玩法区（2×2 画框本身是界面）：lay.playfield 只有分屏 / 画中画——lay.playfield 增加 panels（画格网格）
- 图画气泡（无文字对话）：cmp.dialogBox = bubble + cnt.textLength = none 只能近似——cmp.dialogBox 增加 pictogram
- 用画面母题当菜单入口（纸角折起、盒子上的按钮）：el.toolbar.form = microMenu 只能表达一个小图标——el.toolbar.form 增加 motifEntry（取 ast.container / vis.motif 的物件）
- 热点全显（按住一个键高亮所有可交互物）——el.interact.form 增加 hotspotReveal，或 el.overlay.form 的 statusIcons 允许按键触发

</details>

**最相关的原则**（按针对性排序）：[P-hudless-tax](#p-hudless-tax)、[P-journal-codex](#p-journal-codex)、[P-harmony-four-relations](#p-harmony-four-relations)、[P-medium-constraints](#p-medium-constraints)、[P-material-from-world](#p-material-from-world)、[P-color-never-alone](#p-color-never-alone)、[P-confirm-by-input](#p-confirm-by-input)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-medium-simulation](#p-medium-simulation)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-palette-roles](#p-palette-roles)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-juice-budget](#p-juice-budget)、[P-touch-target-size](#p-touch-target-size) 等 17 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.16 卡牌与桌面

参考卡 33 张 · 探索台内容包：deckBuilder（七层酒馆）

卡牌与桌面的骨架高度稳定：顶栏 + 底部手牌 + 左下能量 + 右下结束回合 + 敌人头顶意图；可出与不可出必须一眼分开，结算公式每一步可见。风格空间却极大：金属铭牌、羊皮纸、手绘草图、像素、叙事内牌桌都能成立。

**子类**：构筑 Roguelike 卡牌（顶栏 + 底部手牌 + 敌人意图）；扑克 / 老虎机式数值构筑（算分公式就是主角）；卡牌 × 地图 / 放置混合（卡牌当地块或建筑）；第一人称牌桌 / 叙事内牌桌；集换式 / 对战卡牌（PvP，双方镜像）；数字桌游（棋盘、骰子、多名玩家轮流）；卡牌化叙事 / 事件抉择（日记页 + 编号选项）；派对与经理模拟（卡牌化的选人、对阵）；竖屏手游卡牌 RPG / 放置卡牌（底部英雄卡条 + 倍速）；格子战场卡牌（六边形 / 车道 / 棋盘上出牌）

**一眼要知道什么**

1. 这回合还剩多少能量 / 法力（当前 / 上限），哪几张手牌现在打得出、哪几张打不出——可出与不可出必须一眼分开
2. 每个敌人下回合要干什么：攻击几点、打几段、上 Buff 还是减益（意图图标 + 数字，挂在敌人头顶或排成队列）
3. 我和敌人的生命与格挡 / 护盾各是多少；这张牌打出去后对方还剩多少、我会不会死（预计值）
4. 这张牌做什么：费用、类型、效果数字；关键词能悬停或长按看解释
5. 抽牌堆 / 弃牌堆 / 消耗堆各剩几张（决定下回合能抽到什么）
6. 离失败条件还有多远：层数、回合数、目标分数、到期倒计时（Luck be a Landlord 的房租、Balatro 的盲注分数线）
7. 已有的被动构筑件（护符 / 小丑 / 装备）有哪些、什么时候触发
8. 数值构筑类：本次出牌的结算公式（基础 × 倍率 = 得分）每一步都可见
9. 结束回合在哪，是否还有没用完的行动（防误按）
10. 对战 / 桌游：轮到谁、对手手牌数与场面、每位玩家的状态

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 顶栏 + 底部手牌 + 两个下角（左下能量、右下结束回合）+ 敌人头顶意图——构筑 Roguelike 的通用骨架 | PC 卡牌 18 张里 4 张（杀戮尖塔、Alina、DICEOMANCER、Chrono Ark 的变体），另有跨品类 2 张（Cobalt Core、Shogun Showdown） | Slay The Spire（iig:slay-the-spire）、Alina of the Arena（steam:1668690）、DICEOMANCER（steam:2501600）、Chrono Ark（steam:1188930） 等 6 款 | HUD 组织方式 = 贴边整条；时间模型 = 回合制；技能 / 冷却 / 弹药 / 手牌：画法 = 手牌；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 扇形；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；资源 / 货币：画法 = 以数值图形呈现；数值图形（资源 / 货币） = 液体球；资源 / 货币 · 数值标注 = 当前 / 上限；资源 / 货币 · 屏幕锚点 = 左下；生命 / 护盾 / 体力 · 世界挂点 = 玩家角色；敌人血条 / 预警 / 意图：画法 = 意图图标 + 数字；敌人血条 / 预警 / 意图 · 世界挂点 = 目标 / 敌人；主行动按钮：画法 = 宽按钮；主行动按钮 · 屏幕锚点 = 右下；准星 / 瞄准：画法 = 拖拽指向曲线 |
| 竖向整条侧栏当计分台（大号数字 + 公式），玩法区留给牌 | PC 卡牌 18 张里 3 张（Balatro 左栏、Loop Hero 右栏、Armello 左侧玩家列），跨品类 1 张（Cobalt Core 左侧船员列） | Balatro（steam:2379780）、Loop Hero（steam:1282730）、Armello（steam:290340）、Cobalt Core（steam:2179850） | HUD 组织方式 = 贴边整条；计时 / 分数 / 回合：画法 = 以数值图形呈现；计时 / 分数 / 回合 · 屏幕锚点 = 左中；资源 / 货币：画法 = 大号数字；资源 / 货币 · 屏幕锚点 = 左中；数字字体 = 像素数字；统计图形 = 战力大字；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 横排；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；主行动按钮：画法 = 一对按钮 |
| 叙事内牌桌 / 实物容器：牌桌、卡册、日记本、玩家板本身就是界面 | PC 卡牌 18 张里 5 张至少有一屏这样做（Inscryption 整局、炉石收藏是皮面卡册、DICEOMANCER 卡组是摊开的书、Curious Expedition 事件是日记页、Wingspan 是玩家板） | Inscryption（steam:1092790）、Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）、DICEOMANCER（steam:2501600）、Curious Expedition（steam:358130） 等 5 款 | 默认放置方式 = 叙事内；场景容器 = 牌桌；容器放在哪 = 桌面 / 地面；UI 与画面关系 = 同一媒介；外框材质 = 木；信息密度 = 稀疏；通知 / 大字提示：画法 = 横幅；通知 / 大字提示 · 屏幕锚点 = 上中；外框结构 = 平框九宫格 |
| 桌游棋盘 + 四周玩家牌（多名玩家轮流） | PC 卡牌 18 张里 4 张（100% Orange Juice 四角头像牌、Armello 左侧四人竖列、Wingspan 栖息地三行玩家板、Jackbox 玩家名压在对白框下） | 100% Orange Juice（steam:282800）、Armello（steam:290340）、Wingspan（steam:1054490）、The Jackbox Party Pack 7（steam:1211630） | 同屏玩家与视口 = 桌游多人；时间模型 = 回合制；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 左中；计时 / 分数 / 回合：画法 = 回合横幅；信息密度 = 密集；转角 = 圆角 |
| 对镜 PvP：双方头像在上两角，双方牌组 / 手牌在下沿左右对放 | 卡牌 33 张里 1 张（Esports Godfather 的 VS 大字与选英雄），跨品类 1 张（弈仙牌：两侧头像 + 底部左右两副牌，对手的牌背朝上）；手机里寻光之旅同型 | Esports Godfather（steam:1278540）、Yi Xian: The Cultivation Card Game（steam:1948800）、寻光之旅（gameui:6868） | 同屏玩家与视口 = 1v1 镜像对战；主体位置 = 两侧（对话双人 / 对阵）；队伍 / 玩家条：画法 = 立绘头像（大小区分当前）；队伍 / 玩家条 · 屏幕锚点 = 左上；技能 / 冷却 / 弹药 / 手牌：画法 = 手牌；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 横排；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中；命中反馈 / 连击：画法 = 拟声字 |
| 竖屏手游卡牌 RPG：上半战场、下沿一排英雄卡 / 头像（点或拖出放技能），倍速在角落 | GameUI 卡牌手游 15 张里能看到战斗 HUD 的 4 张（AFK 剑与远征、圣树唤歌、艾尔多战记、AFK 2 布阵）；其余 11 张只拍到对话 / 标题 / 读取页 | AFK剑与远征（gameui:1168）、圣树唤歌（歆瑷网络）（gameui:3059）、 艾尔多战记（gameui:2827）、AFK 2：Journey（gameui:5744） | 画幅朝向 = 竖屏；握持与拇指区 = 竖屏单手；分区方式 = 上下分栏；队伍 / 玩家条：画法 = 单位卡条；队伍 / 玩家条 · 屏幕锚点 = 下中；卡牌版式 = 整幅立绘 + 少字；倍速 / 暂停 / 自动：画法 = 倍速按钮；倍速 / 暂停 / 自动 · 屏幕锚点 = 右下 |
| 卡牌化叙事：左右分栏，一边是场景插画，一边是长文本 + 编号选项 | PC 卡牌 18 张里 2 张（Curious Expedition 左侧羊皮纸日记 + 编号选项，Depersonalization 左像素场景 + 右黑底长文） | Curious Expedition（steam:358130）、Depersonalization（steam:1477070） | 分区方式 = 左右分栏；对话框结构 = 聊天软件式；对话 / 事件选项：画法 = 按钮；对话 / 事件选项 · 屏幕锚点 = 左中；标题字族 = 衬线；外框材质 = 羊皮纸；外框结构 = 平框九宫格 |
| 玩法区居中，两侧边距放牌与读数（棋盘窗口 + 边框里的 HUD） | 卡牌 33 张里 0 张；跨品类 2 张（Shotgun King 棋盘两侧竖排增益牌、Sol Cesto 塔罗牌式雕花立柱边框） | Shotgun King: The Final Checkmate（steam:1972440）、Sol Cesto（steam:2738490） | HUD 组织方式 = 画在玩法区外的边框里；玩法区形态 = 棋盘 / 关卡窗；卡牌版式 = 仅图标 / 问号；条目排布几何 = 竖列；UI 像素化 = 与世界同网格 |
| 零 HUD / 极简：路线节点或桌面物件就是全部界面 | 卡牌 33 张里 1 张（Lara Croft GO 回合解谜），跨品类 1 张（Dorfromantik 右下叠起来的地块'牌堆' + 剩余数圆标） | Lara Croft GO（steam:540840）、Dorfromantik（steam:1455840） | 信息密度 = 极简；HUD 显隐策略 = 电影模式（全隐）；容器 = 直接叠加；装饰预算 = 无 |

**关键元素与画法**

- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：cards / fan / row / column；常见位置 bc、ml。手牌是主操作面：放在下沿离鼠标 / 拇指最近，牌桌上方留给敌人。扇形（杀戮尖塔）在手牌数变化大时不用改布局，代价是牌互相遮挡、要悬停放大；平铺一排（Balatro、Alina 的六边形牌、Cobalt Core）每张牌位置固定，适合 ≤ 8 张；竖列表（Chrono Ark 左侧 1–6 编号 + 牌名 + 费用）最省空间、能按数字键出牌，但牺牲了卡图。第一人称牌桌（Inscryption）手牌是拿在手里的实物。
- **资源 / 货币**（`el.resources`）：gauge / iconNumber / bigNumber；常见位置 bl、tl、ml。能量 / 法力是每次出牌前都要看的数，所以做成手牌左侧的大圆球（杀戮尖塔 3/4、Alina 2/4），并且标'当前 / 上限'；金币、药水这类不常用的读数进顶栏。数值构筑类把钱和出牌次数放进侧栏计分台。
- **敌人血条 / 预警 / 意图**（`el.threat`）：intent / healthBar；常见位置 attachTo:target、mr、ml。构筑卡牌的决策核心是'看对面下一步再决定这回合打什么'，所以意图必须是图标 + 数字（攻击 18、4×3），不能只给图标。挂在敌人头顶最直观（杀戮尖塔、Alina、Shogun Showdown 还带倒计时）；敌人多或技能复杂时改成侧边列表（Chrono Ark 右侧施法列表、Alina 左侧意图说明框）。这和策略品类 Into the Breach 的'把意图画出来'是同一条原则。
- **生命 / 护盾 / 体力**（`el.vitals`）：bar / number；常见位置 attachTo:player、tl、bl。生命条挂在角色脚下并在左侧叠一个格挡盾牌数字（杀戮尖塔），同时顶栏再写一次——战斗里看脚下，地图上看顶栏。第一人称牌桌没有角色可挂，就放到左下（DICEOMANCER 心形 50/50）。
- **主行动按钮**（`el.cta`）：wide / round / dual；常见位置 br、mr、tl。结束回合是每回合必按、按错代价高的键：放在右下（杀戮尖塔、DICEOMANCER、Cobalt Core）与手牌和能量分开，形状和颜色与出牌区不同。Balatro 没有'结束回合'，而是手牌下方一对按钮（出牌 / 弃牌）。Chrono Ark 放在左上，是这批里唯一的反例。
- **计时 / 分数 / 回合**（`el.timer`）：number / gauge / smallText / badge；常见位置 tc、ml、tl。卡牌 Roguelike 的'计时'是进度与失败线：层数（杀戮尖塔顶栏）、底注 / 回合（Balatro 侧栏）、到期还剩几次（Luck be a Landlord 顶行'几次后交房租'）、回合数（Chrono Ark 顶部居中）。失败线越单一越该放大。
- **选中信息面板**（`el.selection`）：tooltip / card；常见位置 attachTo:cursor、mr、ml。小尺寸手牌上的规则文字不能是唯一信息源：悬停放大（杀戮尖塔）、点开详情框（Chrono Ark 暗色细边框弹窗，旁边再挂关键词说明块）、或在右侧常驻一张大卡（DICEOMANCER、Wingspan 放大的鸟卡）。触屏没有悬停，要改成长按或常驻。
- **命中反馈 / 连击**（`el.feedback`）：floatNumbers / comicSFX / combo；常见位置 attachTo:target、center。回合制没有动作手感，反馈全靠数字演出：Balatro 每张牌飞出 +10 并让总分数字燃烧抖动；DICEOMANCER 第一人称挥拳 + 漫画爆炸框里的巨大伤害数字；Alina 右上 COMBO；弈仙牌用书法飘字报'再次行动'。演出越强越要能加速 / 跳过。
- **队伍 / 玩家条**（`el.party`）：portraitRow / frames / portraits；常见位置 bc、ml、tl、tr。多角色构筑（Chrono Ark 底部头像条 + 各自血条、Cobalt Core 左侧船员列：每个船员对应一组牌）要让'这张牌属于谁'可追溯——牌面颜色或头像角标与队伍栏对应。桌游里同一个元素用来显示'轮到谁'。
- **准星 / 瞄准**（`el.crosshair`）：aimArrow；常见位置 attachTo:cursor。需要选目标的牌在拖出后画一条指向曲线（杀戮尖塔的一串箭头），目标敌人四角出现括号——把'这张牌会打谁'在松手前就确认掉。
- **行动顺序**（`el.turnOrder`）：icons / portraitQueue；常见位置 mr、tc。卡牌 × 回合 RPG 混合体里敌人行动有先后：Chrono Ark 把敌人即将施放的技能排成右侧'施法列表'（带倒计时数字），相当于意图队列。
- **信息叠层 / 图例**（`el.overlay`）：gridHighlight / buildGrid / rangeRing；常见位置 attachTo:target。格子战场卡牌要在出牌前高亮影响范围：Alina 的六边形格黄色高亮、Shogun Showdown 的左右车道、Loop Hero 把地形卡拖到路边时的可放置格。
- **通知 / 大字提示**（`el.notify`）：banner / band / toast；常见位置 tc、center。首领规则、叙事提示、回合开始用一条横幅说清楚：Balatro 首领盲注的'必须打 5 张牌'大字、Inscryption 屏幕顶端一行红色大写字、炉石结算的缎带横幅。
- **对话 / 事件选项**（`el.choices`）：buttons / text；常见位置 ml、bc。事件节点是'没有费用的牌'：Curious Expedition 日记页下方编号选项、Depersonalization 带框选项按钮。选项要把代价写在选项行里。
- **奖励 / 获得物**（`el.reward`）：cards；常见位置 center。这里只指战斗后的'选一张牌加入牌组'（局内成长，不是商业化奖励）：三张卡平铺居中 + 跳过按钮（Alina、Cobalt Core 的大字标题、Luck be a Landlord 三张深色像素卡带稀有度）。

**重要界面**

- **手牌 / 牌桌**：战斗屏（cnt.subtype = deck 的战斗态）：上 1/8 顶栏 → 中间牌桌（敌我站位、意图）→ 下 1/4 手牌区；左下能量、右下结束回合；牌堆计数在两个下角（杀戮尖塔左下抽牌堆 13、右下弃牌堆 3）。牌桌整体降饱和降对比，卡框提亮（06 A13）。卡组浏览态：规则网格 4–5 列 + 纵向滚动 + 按类型 / 费用排序，或做成摊开的书（DICEOMANCER 左右页卡格、炉石两页 4×2 + 右侧牌组列表）。 例：Slay The Spire（iig:slay-the-spire）、Balatro（steam:2379780）、Alina of the Arena（steam:1668690）、DICEOMANCER（steam:2501600） 等 6 款。
- **关卡 / 章节选择**：路线节点地图（routeMap）：自下而上或自左向右的分叉路线，节点图标按类型区分（战斗 / 精英 / 休息 / 商人 / 事件 / 首领），已走过的划掉或连线变实。Alina 是骷髅图标节点 + 暗底；Curious Expedition 是羊皮纸六边形地图；Inscryption 是桌上的立体模型地图。 例：Alina of the Arena（steam:1668690）、Curious Expedition（steam:358130）、Inscryption（steam:1092790）。
- **结算 / 胜负 / 奖励**：战后选牌（draft3 浮层）：三张卡平铺 + 跳过，背后冻结压暗；本局总结（runSummary）列出层数、击败数、关键牌。胜负页用一个大字定调（AFK 2 斜体 VICTORY / DEFEAT + 半透明灰底的成员数据行）。 例：Alina of the Arena（steam:1668690）、Cobalt Core（steam:2179850）、AFK 2：Journey（gameui:5744）、Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）。
- **制作 / 合成**：升级 / 改造一张牌（forge）：左右前后对比 + 中间箭头，改变的数字用颜色标出（Alina、Cobalt Core、DICEOMANCER 都是这一型）。 例：Alina of the Arena（steam:1668690）、Cobalt Core（steam:2179850）、DICEOMANCER（steam:2501600）。
- **任务日志 / 目标**：事件页：叙事段落 2–4 句 + 编号选项，选项行内写代价与结果预告；可用日记本 / 羊皮纸容器（Curious Expedition）或黑底长文本（Depersonalization）。 例：Curious Expedition（steam:358130）、Depersonalization（steam:1477070）。
- **角色 / 装备 / 属性**：选角：整幅角色插画占满背景，左侧写角色名与一句说明，底部一排可选角色 + 开始按钮（杀戮尖塔）；电竞经理类是斜切横幅 + 六边形英雄池（Esports Godfather）。手游养成页是暗底 + 左侧竖排细线页签 + 星级（重返未来：1999）。 例：Slay The Spire（iig:slay-the-spire）、Esports Godfather（steam:1278540）、重返未来：1999（gameui:4596）。
- **图鉴 / 收集 / 成就**：卡牌图鉴：规则网格，未获得的牌用黑剪影或问号，已获得的显示卡面；可做成卡册翻页（炉石皮面木框卡册）。手游图鉴多是头像方格（神觉者）。 例：Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）、神觉者（gameui:3767）。
- **匹配 / 组队 / 备战**：对阵 / 布阵：左右镜像 + 中间 VS 大字（Esports Godfather 红蓝双色）；手游布阵是下方阵容格 + 保存阵容按钮（AFK 2）。 例：Esports Godfather（steam:1278540）、AFK 2：Journey（gameui:5744）、伊甸之战（雷亚游戏/​​龙渊网络）（gameui:3860）。
- **对话 / 文本**：卡牌手游的剧情对话：横屏半透明暗金底条 + 书法名字（忘川风华录）、竖屏霓虹色气泡（神觉者 Dislyte）、竖屏底部对话框配暗紫插画（魔镜物语）。对话皮肤跟随该作的美术主题，与战斗 HUD 可以不同。 例：忘川风华录（网易）（gameui:2150）、神觉者 Dislyte（gameui:4373）、魔镜物语（猗国网络）（gameui:3239）。
- **商店 / 交易**：仅指 Roguelike 局内商人 / 局内商店（只用本局金币，属于玩法节点，不是付费商城）：商品是卡牌 / 护符 / 药水，价签贴在卡下方，钱不够时价签变红；有'删一张牌'服务。Balatro 的局内商店是核心循环的一部分；100% OJ 的卡片墙是米白卡片格。 例：Balatro（steam:2379780）、Luck be a Landlord（steam:1404850）、100% Orange Juice（steam:282800）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`）（6 张）：Inscryption、Wingspan、Armello、Slay the Spire、Hearthstone、100% Orange Juice
- 国风水墨 / 墨笔（`fam.ink`）（4 张）：国风卡牌手游的剧情 / 登录 / 开场（忘川、花亦山、我自为道、炼仙传说）：立绘 + 叙事为主，用屏风与竖排典籍。
- 暗金金属牌（`fam.dark-gold`）（3 张）：卡通手游金框（AFK、圣树唤歌、艾尔多战记）。
- 二次元白卡细线（`fam.anime-card`）（3 张）：卡牌（神觉者、剑与远征结算）。
- 暗色细线（`fam.dark-hairline`）（2 张）：该批次里的暗底文学排版与二次元暗调（Disco 式长文、重返未来：1999）。
- 手绘笔记本（`fam.notebook`）（2 张）：卡牌本身就是纸，铅笔卡面 + 书本卡组管理顺理成章（Wash Card、DICEOMANCER）。
- 文字小说栏 / 互动小说排版（`fam.if-column`）（2 张）：Depersonalization、Darkest Dungeon II
- 糖果卡通（Q 版）（`fam.candy`）（1 张）：休闲卡牌手游（魔魔打勇士、上古王冠）：圆角 + 高饱和撞色。

**代表作**

- Slay The Spire（iig:slay-the-spire）〔桌游实物：版图 / 棋子 / 骰子 / 算子〕：构筑卡牌的通用骨架：顶栏全局读数、扇形手牌、左下能量球、右下结束回合、敌人头顶意图 + 数字、拖牌时的指向曲线、两个下角的牌堆计数——几乎每个元素都有固定位置。
- Balatro（steam:2379780）〔CRT 终端〕：'计算可见'的范本：左侧整条栏按结算顺序列出目标分 → 本轮得分 → 牌型 × 倍率 → 出牌 / 弃牌次数 → 钱 → 底注 / 回合；CRT 弯曲与漩涡背景很重，但数字是大号扁平像素块。
- Inscryption（steam:1092790）〔桌游实物：版图 / 棋子 / 骰子 / 算子〕：叙事内牌桌做到底：牌、天平计分、地图模型都是桌上的物件，屏幕上只剩一行提示字。
- Chrono Ark（steam:1188930）〔二次元白卡细线〕：高密度变体：手牌改成左侧编号竖列表（可按数字键出牌），敌人技能排成右侧施法队列，队伍头像 + 血条排在底部。
- Alina of the Arena（steam:1668690）〔暗色细线〕：格子战场 + 六边形卡牌：卡牌外轮廓与战场格同形；意图既挂在敌人头顶又在左侧列成说明框；升级页是左右前后对比。
- Wingspan（steam:1054490）〔桌游实物：版图 / 棋子 / 骰子 / 算子〕：数字桌游：米白纸卡 + 水彩插画 + 属性图标，玩家板按栖息地分三行；右侧常驻一张放大的卡做详情。
- Luck be a Landlord（steam:1404850）〔像素位图〕：失败线只有一个（还剩几次要交房租），所以顶行把它和金币并排放大；三选一是三张深色像素卡，名字 / 稀有度 / 说明三段式。
- Curious Expedition（steam:358130）〔羊皮纸任务书〕：事件卡化：左侧羊皮纸日记页 + 编号选项，右侧像素场景；顶部理智条是唯一常驻读数。
- DICEOMANCER（steam:2501600）〔手绘笔记本〕：第一人称战斗 + 漫画爆炸框伤害数字；卡组管理是一本摊开的书，升级页是前后对比。
- Yi Xian: The Cultivation Card Game（steam:1948800）〔国风水墨 / 墨笔〕：PvP 卡牌的镜像布局：双方头像在上两角，下沿左右两副牌，对手的牌背朝上；宣纸 + 水墨装饰贯穿全部界面。
- Cobalt Core（steam:2179850）〔合成波 / 蒸汽波〕：多角色构筑：左侧船员列与牌一一对应，下沿一排牌 + 右下结束回合；选牌页用整屏大字标题。
- Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）〔桌游实物：版图 / 棋子 / 骰子 / 算子〕：收藏页是皮面木框卡册（两页 4×2 + 右侧牌组列表），结算是缎带横幅——实物容器做到奢华一档。

**坑**

- 侧栏 / 装备格信息过密，像素小字在 1080p 下难读；新手不知道先看哪一块 例：Loop Hero（steam:1282730）、Armello（steam:290340）。
  - 评价与证据（依据：评测）：Loop Hero：去重后提到界面的 18 条评测里 7 条来自差评；Armello：6 条里 3 条。两款都没有某一类抱怨达到 ≥ 2 条，属于弱信号。对照：同样是侧栏的 Balatro 49 条里只有 2 条来自差评——区别在 Balatro 侧栏只有大号数字，没有说明文字。
- 卡组 / 菜单管理层级深、操作繁琐（查看牌组、整理、比较要点好几下） 例：Chrono Ark（steam:1188930）、100% Orange Juice（steam:282800）、Wingspan（steam:1054490）、Dorfromantik（steam:1455840）。
  - 评价与证据（依据：评测）：'菜单 / 界面难用'去重后：Chrono Ark、Dorfromantik、100% Orange Juice、Wingspan 各 1 条（都未达 ≥ 2 条的门槛），证据很弱。
- 出牌 / 结算演出太长，拖慢节奏（尤其对战与自动结算） 例：Yi Xian: The Cultivation Card Game（steam:1948800）、Balatro（steam:2379780）。
  - 评价与证据（依据：评测）：弈仙牌'UI 卡顿 / 响应慢'去重后 1 条。设计上要配 mo.duration 与倍速 / 跳过；Balatro 演出很重但未出现这类抱怨（是否因为有游戏速度设置未核实）。
- 华丽卡框挤占规则文字；卡图缩小后变成色块 例：Hearthstone Heroes Of Warcraft（iig:hearthstone-heroes-of-warcraft）、圣树唤歌（歆瑷网络）（gameui:3059）。
  - 评价与证据（依据：文献）：本组没有直接评测证据；出自 06 文档 A13 的常见美术陷阱，测试片段是'卡高 120 px 时规则文字是否可读'。
- 只靠颜色区分卡牌类型 / 稀有度 / 效果，色盲或灰度下分不开 例：Wash Card（steam:2095150）、Luck be a Landlord（steam:1404850）。
  - 评价与证据（依据：文献）：无评测证据（Wash Card 在英文 / 简中都没有评测）；依据 06 文档 0.5 第 8 条与 A13'稀有度用边框或宝石形状 + 颜色'。Luck be a Landlord 的稀有度同时写成文字（普通 / 罕见 / 稀有），是正例。
- 叙事内牌桌把规则藏进世界，新手不知道去哪看数值 例：Inscryption（steam:1092790）。
  - 评价与证据（依据：评测）：Inscryption 本身未出现引导类抱怨——它的牌面数字仍是清晰平面字。但 R3 里'界面就是画面'的作品引导抱怨集中（去重后 Scorn、Kingdom Two Crowns 各 7 条），照搬时要保留屏幕层的数字。
- CRT / 弯曲 / 颗粒后处理压在小字上 例：Balatro（steam:2379780）。
  - 评价与证据（依据：评测）：Balatro 本身是反例（49 条提到界面的评测里 47 条来自好评、无'字太小'抱怨），可读性来自巨大的扁平数字；06 文档 A13 建议这类效果提供开关。照搬滤镜而不放大数字才是陷阱。
- 多人桌游四角堆满玩家信息，'轮到谁'不突出 例：100% Orange Juice（steam:282800）、Armello（steam:290340）。
  - 评价与证据（依据：评测）：100% Orange Juice：去重后提到界面 44 条，其中 9 条来自差评、'菜单难用'1 条；Armello 见上。均为弱信号。

**可演示的对比**

- **手牌：扇形叠压 vs 平铺一排**（单变量对照；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：卡牌版式：插画窗 + 费用角标 + 文本框 → 仅图标 / 问号；技能 / 冷却 / 弹药 / 手牌 · 内部排布：扇形 → 横排
  - 配套改动：详情呈现：临时出现 → 常驻一侧
  - 看什么：手牌从 5 张加到 10 张：扇形不改布局但互相遮挡，要靠悬停放大；平铺每张位置固定、一眼数得清，但超过 8 张就挤，详情改成常驻侧栏。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `el.abilities.form=cards` `el.abilities.screenAnchor=bc` `cnt.screen=screen.hud`
  - A：`el.abilities.arrangement=fan` `cmp.card=tcg` `lay.detail=transient`
  - B：`el.abilities.arrangement=row` `cmp.card=iconCard` `lay.detail=persistent`

  </details>
- **HUD 组织：顶栏 + 四角 vs 竖向侧栏计分台**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：数值图形（资源 / 货币）：液体球 → 自动；主行动按钮：画法：自动 → 一对按钮；主行动按钮 · 屏幕锚点：右下 → 自动；资源 / 货币：画法：以数值图形呈现 → 大号数字
  - 配套改动：资源 / 货币 · 屏幕锚点：左下 → 左中；计时 / 分数 / 回合 · 屏幕锚点：上中 → 左中；计时 / 分数 / 回合：画法：自动 → 以数值图形呈现；统计图形：自动 → 战力大字；数字字体：自动 → 像素数字
  - 看什么：视线路径：a 是绕屏幕一圈（顶栏 → 敌人 → 手牌 → 两个下角），b 是从左栏上到下读一遍就是一次结算；b 适合'分数 / 倍率'类构筑，a 适合'血量 / 意图'类构筑。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `lay.hudOrg=edgeBar` `cnt.screen=screen.hud`
  - A：`el.resources.form=gauge` `cmp.gauge@el.resources=orb` `el.resources.screenAnchor=bl` `el.timer.screenAnchor=tc` `el.cta.screenAnchor=br` `el.cta.form=auto` `el.timer.form=auto` `st.statViz=auto` `typ.numerals.family=auto`
  - B：`el.resources.form=bigNumber` `el.resources.screenAnchor=ml` `el.timer.form=gauge` `el.timer.screenAnchor=ml` `typ.numerals.family=pixel` `st.statViz=bigNumber` `el.cta.form=dual` `cmp.gauge@el.resources=auto` `el.cta.screenAnchor=auto`

  </details>
- **屏幕叠加 vs 叙事内牌桌**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 牌桌；容器放在哪：无（浮在画面上） → 桌面 / 地面；外框结构：程序线框 → 平框九宫格；信息密度：中等 → 稀疏
  - 配套改动：默认放置方式：屏幕叠加 → 叙事内；UI 与画面关系：中性 → 同一媒介；通知 / 大字提示：画法：无 → 横幅；通知 / 大字提示 · 屏幕锚点：自动 → 上中
  - 看什么：同一组卡牌与计分：b 里计分变成桌上物件、屏幕只剩顶端一行提示，氛围强但新手要找数字；检查 b 的牌面数字是否仍清晰。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `cnt.screen=screen.hud` `ast.frameMat=wood`
  - A：`rel.diegesis=screen` `ast.container=none` `rel.harmony=neutral` `cnt.density=2` `ast.frame=procedural` `ast.containerSurface=none` `el.notify.form=[]` `el.notify.screenAnchor=auto`
  - B：`rel.diegesis=diegetic` `ast.container=tableTop` `ast.containerSurface=table` `rel.harmony=sameMedium` `cnt.density=1` `el.notify.form=banner` `el.notify.screenAnchor=tc` `ast.frame=plainNinePatch`

  </details>
- **敌人意图：挂在头顶 vs 侧边施法队列**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：敌人血条 / 预警 / 意图 · 世界挂点：目标 / 敌人 → 不挂（用屏幕锚点）
  - 配套改动：敌人血条 / 预警 / 意图 · 数值标注：当前值 → 不标；敌人血条 / 预警 / 意图 · 内部排布：继承 → 竖列；敌人血条 / 预警 / 意图 · 屏幕锚点：自动 → 右中；行动顺序：画法：自动 → 小图标队列；行动顺序 · 屏幕锚点：自动 → 右中
  - 看什么：敌人从 1 个加到 5 个：头顶意图直观但会和特效、血条挤在一起；队列把先后顺序和倒计时也表达出来，代价是要在队列和敌人之间来回对照。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `el.threat.form=intent` `cnt.screen=screen.hud`
  - A：`el.threat.attachTo=target` `el.threat.valueLabel=current` `el.threat.arrangement=inherit` `el.threat.screenAnchor=auto` `el.turnOrder.form=auto` `el.turnOrder.screenAnchor=auto`
  - B：`el.threat.attachTo=none` `el.threat.screenAnchor=mr` `el.threat.arrangement=column` `el.turnOrder.form=icons` `el.turnOrder.screenAnchor=mr` `el.threat.valueLabel=none`

  </details>
- **卡面：插画窗 + 费用角标 vs 桌游纸卡（名牌 + 属性表）**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：卡牌版式：插画窗 + 费用角标 + 文本框 → 名牌 + 属性表；装饰预算：中 → 无
  - 配套改动：图标风格：手绘彩绘 → 扁平填充；面板明度：深色面板 → 浅色面板；稀有度表达手段：边框色 + 光效色 → 字母徽标（SSR） + 侧边色条；内芯结构：程序填充 → 材质平铺
  - 看什么：把卡缩到 120 px 高：a 的卡图仍是主角、规则文字最先糊；b 的属性图标与数字更耐缩，适合规则多、比较多的桌游类。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `col.coding=rarity` `cnt.screen=screen.hud` `ast.coreMat=paper`
  - A：`cmp.card=tcg` `vis.iconStyle=painted` `vis.ornament=2` `col.lightness=dark` `st.rarityCue=border+rarityGlow` `ast.core=procedural`
  - B：`cmp.card=statCard` `col.lightness=light` `vis.ornament=0` `vis.iconStyle=flat` `st.rarityCue=letter+strip` `ast.core=texture`

  </details>
- **卡牌详情：悬停临时放大 vs 右侧常驻大卡**（单变量对照；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：选中信息面板 · 世界挂点：光标 → 不挂（用屏幕锚点）；选中信息面板：画法：tooltip → 单位卡；选中信息面板 · 屏幕锚点：自动 → 右中；详情呈现：临时出现 → 常驻一侧
  - 看什么：切到触屏输入（D-input 会把悬停改成弹窗）：a 在触屏上要多点一下；b 永远占一块屏幕但不需要额外操作，适合竖屏或手柄。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `hier.inline=keyword` `cnt.screen=screen.hud`
  - A：`lay.detail=transient` `el.selection.form=tooltip` `el.selection.attachTo=cursor` `el.selection.screenAnchor=auto`
  - B：`lay.detail=persistent` `el.selection.form=card` `el.selection.screenAnchor=mr` `el.selection.attachTo=none`

  </details>
- **数值反馈：克制飘字 vs 燃烧大数字**（整套做法对照（多个参数一起变）；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击：画法：飘字 → 拟声字 + 连击大数字
  - 配套改动：数值变化：平滑 → 数字滚动；反馈强度：0.3 → 1；叠加特效层：自动 → 故障色差；元 UI 屏幕效果：无 → 故障
  - 看什么：连续打出 5 张牌：b 每张都有爆字和抖动，爽但慢——同时打开减少动效（a11y.reduceMotion）看 b 能否退化成 a。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d6` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `cnt.screen=screen.hud`
  - A：`el.feedback.form=floatNumbers` `mo.valueChange=smooth` `mo.juice=0.3` `ast.fx=auto` `rel.metaFx=[]`
  - B：`el.feedback.form=comicSFX+combo` `mo.valueChange=countUp` `mo.juice=1` `ast.fx=glitch` `rel.metaFx=glitch`

  </details>
- **卡组浏览：滚动网格 vs 卡册翻页**（单变量对照；内容包：deckBuilder · 七层酒馆；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：场景容器：无 → 书；分区方式：自动 → 左右分栏
  - 配套改动：网格列数：5 → 4；内容溢出方式：纵向滚动 → 分页
  - 看什么：40 张牌的牌组：滚动网格一屏能看最多；卡册翻页每页 8 张、有'翻书'的实物感，但找一张牌要翻好几页。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-card#d7` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=deckBuilder` `cnt.subtype=deck` `lay.container=fullscreen` `lay.arrangement=grid` `cnt.screen=screen.hud` `lay.pageIndicator=auto`
  - A：`lay.columns=5` `lay.overflow=scrollV` `ast.container=none` `lay.composition=auto`
  - B：`ast.container=book` `lay.composition=splitLR` `lay.columns=4` `lay.overflow=paged`

  </details>

**样例内容**：卡牌与桌面（`deckBuilder#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（10 项）</summary>

- 牌堆计数（抽牌堆 / 弃牌堆 / 消耗堆）没有对应元素——新增元素 el.piles，画法 form = 牌背叠层 + 数字 / 纯数字 / 牌背厚度；默认锚点 bl（抽牌）与 br（弃牌），点击打开牌组浮层
- 被动构筑件栏（护符 / 小丑 / 遗物一排图标，带触发计数）没有对应元素——新增元素 el.passives：form = 图标行 / 卡牌行；带'槽位上限'与'触发闪光'；默认锚点 tl 或 tc
- 结算公式条（基础 × 倍率 = 得分，逐步累加）无法表达——st.statViz 增加取值 formula（公式块：左值 × 右值 → 结果，每张牌结算时逐项跳动），或 el.meter.form 增加 product
- '可出 / 不可出 / 就绪'状态编码：现有 st.cooldown 只覆盖冷却，没有'费用不足 / 无合法目标 / 已就绪可释放'——新增 st.playable：亮边 / 不可出压暗 / 费用数字变红 / 就绪脉冲；与 st.cooldown、st.selected 一起参加两两不撞车检查
- 手牌溢出策略：手牌数变化时是叠压、缩小、换行还是改列表——新增 cmp.hand.overflow：overlap / shrink / wrap / list，配 cnt.itemCount 演示 3→12 张
- 预计值显示：出牌前预览'打完后剩多少血 / 实际伤害（算上易伤与格挡）'——elx.valueLabel 增加 projected（幽灵段预览：血条上显示将被扣掉的一截 + 预计数字）
- 卡牌类型编码（攻击 / 技能 / 能力）没有语义色维度——col.coding 增加 cardType，并要求与 vis.silhouette@el.abilities 或卡框形状冗余
- 随机结果展示（骰子 / 转轴 / 翻牌）没有元素——新增元素 el.dice：form = 骰子 / 转轴 / 翻牌 / 轮盘；配 mo.reveal 的翻牌 / 旋转（只做玩法内随机，不含抽卡）
- 关键词说明链：卡牌详情旁再挂一列关键词解释块（嵌套）——el.selection.form 增加 stackedTooltips，或 lay.detail 增加 transientStack
- 对手隐藏信息（对手手牌背面、剩余牌数）——el.party 增加子参数 hiddenInfo：牌背行 / 数字 / 不显示

</details>

**最相关的原则**（按针对性排序）：[P-actionable-first](#p-actionable-first)、[P-detail-without-hover](#p-detail-without-hover)、[P-color-never-alone](#p-color-never-alone)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-result-tally](#p-result-tally)、[P-transition-frequency](#p-transition-frequency)、[P-type-two-tier](#p-type-two-tier)、[P-harmony-four-relations](#p-harmony-four-relations)、[P-medium-simulation](#p-medium-simulation)、[P-shared-screen](#p-shared-screen)、[P-touch-target-size](#p-touch-target-size)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-confirm-by-input](#p-confirm-by-input) 等 25 条；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.17 手机触屏（局内与非商业化界面）

参考卡 39 张 · 探索台内容包：arena（星核联赛）

手机触屏只研究局内 HUD、触屏布局与非商业化界面：竖屏「上看下点」（R4 把 21 张竖屏卡一律按单手握持标注——握法从截图看不出，这是标注约定，不是观察结论），横屏双拇指（左摇杆 + 右下大攻击键 + 技能弧）。主操作在拇指区且够大，读数在上、操作在下，倍速、暂停、跳过这类次要键也不能小于触控下限。商城、抽卡、签到、首充、通行证、红包、广告等运营层一律不学。

**子类**：竖屏自动战斗 / 放置卡牌 RPG（底部英雄头像条 + 倍速 / 托管）；竖屏回合战斗（行动顺序条 + 竖排控制键）；竖屏消除 / 合成 / 三消对战（上战斗下棋盘）；竖屏地牢 / Roguelike（上场景下地图格）；横屏 ARPG / MMO（左摇杆 + 右下大攻击键 + 技能弧）；横屏派对 / 休闲动作（摇杆 + 跳跃大圆钮）；横屏横版（十字键 + 两个大键）；横屏回合战棋（选中单位面板 + 待机大键）；横屏塔防 / 出兵（底部单位卡）；横屏大军团即时战略（几乎无 HUD）；主城 / 家园 / 模拟经营大地图（点地移动 + 底部功能条）

**一眼要知道什么**

1. 我该点哪里：主操作在拇指够得着的区域（竖屏下 1/3、横屏左右下角），而且够大
2. 战斗是自动的还是手动的：当前倍速档位、托管开没开
3. 哪个英雄的大招 / 技能现在就绪（头像发光、充能满、冷却扇形走完）
4. 双方血量 / 比分 / 回合数 / 剩余时间
5. 这一关怎么算赢（胜利目标一句话）
6. 我的手指会不会挡住要看的东西（读数在上、操作在下）
7. 刚才那一下点到了没有（按下反馈、拖拽轨迹）
8. 怎么暂停、跳过、撤退或退出

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 竖屏'上看下点'：顶部只读（资源、回合、目标），中间战场，下沿一排英雄头像 / 卡（点或拖放技能） | 竖屏 21 张里 13 张是战斗画面，其中 6 张以下沿头像 / 卡条为主操作（梦想指针、放置七骑士、疯狂宝贝、铸仙之境、幻界之境、巫师血脉）；R4 把这 21 张一律按单手标注（标注约定，不是观察结论） | 海贼王：梦想指针（gameui:12746）、放置七骑士（gameui:10348）、疯狂宝贝（测试）（gameui:7101）、铸仙之境（测试）（gameui:7082） 等 6 款 | 画幅朝向 = 竖屏；输入方式 = 触屏；握持与拇指区 = 竖屏单手；虚拟摇杆 = 无摇杆；触屏按钮布局 = 底部一排；分区方式 = 上下分栏；队伍 / 玩家条：画法 = 单位卡条；队伍 / 玩家条 · 屏幕锚点 = 下中；倍速 / 暂停 / 自动：画法 = 倍速按钮；倍速 / 暂停 / 自动 · 屏幕锚点 = 右下；资源 / 货币 · 屏幕锚点 = 上中 |
| 竖屏半屏棋盘：上 1/3 战斗或比分，下 2/3 是可触摸的棋盘 | 手机 39 张里 4 张（宝石小伙伴 比分 52 : 40、酱游记 上回合战斗下消除、萌宠解谜 7 × 8 合成格、代号肉鸽 上场景下地图格）；跨品类解谜里还有 2 张（Call of Antia、小小传说） | 宝石小伙伴（测试）（gameui:7035）、酱游记（测试）（gameui:6889）、萌宠解谜（gameui:7039）、代号肉鸽（测试）（gameui:7155） 等 6 款 | 画幅朝向 = 竖屏；握持与拇指区 = 竖屏单手；分区方式 = 上下分栏；玩法区形态 = 棋盘 / 关卡窗；虚拟摇杆 = 滑动手势；计时 / 分数 / 回合：画法 = 比分胶囊；计时 / 分数 / 回合 · 屏幕锚点 = 上中；命中反馈 / 连击：画法 = 连击大数字 |
| 横屏双拇指：左半屏摇杆，右下一个大攻击键 + 技能沿四分之一圆弧排布 | 横屏 18 张里 6 张双拇指握持；其中大键 + 弧形 3 张战斗画面（天涯明月刀、三界天骄、暖雪）+ 主界面 1 张（元梦之星），十字键 + 两个大键 1 张（空之要塞启航） | 天涯明月刀（gameui:12771）、三界天骄（gameui:6729）、暖雪-手游（gameui:6750）、元梦之星（gameui:11388） 等 5 款 | 画幅朝向 = 横屏；输入方式 = 触屏；握持与拇指区 = 横屏双拇指；虚拟摇杆 = 浮动摇杆；触屏按钮布局 = 大键 + 弧形环绕；技能 / 冷却 / 弹药 / 手牌：画法 = 技能格；技能 / 冷却 / 弹药 / 手牌 · 内部排布 = 环绕中心 / 轮盘；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 右下；按键 / 操作提示：画法 = 触屏按钮；按键 / 操作提示 · 屏幕锚点 = 左下（渲染说明：vis.silhouette@el.abilities 已移除（渲染器不读这个按元素覆盖）） |
| 横屏自动 / 回合战斗：战场占满，下沿一排头像或单位卡，倍速与暂停缩在上角 | 横屏 18 张里 4 张（神州风闻录、奇缘之旅、死亡突围 点卡出兵、寻光之旅 底部卡牌 + 顶部两侧血条） | 神州风闻录（gameui:6853）、奇缘之旅（gameui:6904）、死亡突围：僵尸战争（gameui:11009）、寻光之旅（gameui:6868） | 画幅朝向 = 横屏；握持与拇指区 = 横屏双拇指；虚拟摇杆 = 无摇杆；触屏按钮布局 = 底部一排；队伍 / 玩家条：画法 = 肖像行；队伍 / 玩家条 · 屏幕锚点 = 下中；倍速 / 暂停 / 自动：画法 = 自动托管；倍速 / 暂停 / 自动 · 屏幕锚点 = 左上；计时 / 分数 / 回合：画法 = 回合徽章；计时 / 分数 / 回合 · 屏幕锚点 = 上中 |
| 竖屏控制键竖排在右缘（倍速 / 暂停 / 下一角色 / 跳过），左下是当前单位面板，下沿是行动顺序 | 手机 39 张里 1 张完整（铸仙之境 右缘四键竖排 + 左上'胜利目标'一句 + 战斗日志）；小虾米战三国 是同一思路的上角版本（右上一排自动 / ×2 / 撤退圆印章、左上回合 / 胜负 / 聊天竖排、左下跳过） | 铸仙之境（测试）（gameui:7082）、小虾米战三国（gameui:6922） | 画幅朝向 = 竖屏；握持与拇指区 = 竖屏单手；倍速 / 暂停 / 自动：画法 = 暂停 / 1x / 2x 按钮条；倍速 / 暂停 / 自动 · 屏幕锚点 = 右中；倍速 / 暂停 / 自动 · 内部排布 = 竖列；选中信息面板：画法 = 信息面板；选中信息面板 · 屏幕锚点 = 左下；行动顺序：画法 = 头像队列；行动顺序 · 屏幕锚点 = 下中；目标 / 路点：画法 = 目标文字；目标 / 路点 · 屏幕锚点 = 左上；通知 / 大字提示：画法 = 滚动消息列 |
| 横屏战棋：左下选中单位面板，右下一个圆形大键（待机 / 结束），格子高亮在战场上 | 手机 39 张里 1 张（英杰传），与策略品类的回合战术布局同源 | 英杰传（测试）（gameui:7158） | 画幅朝向 = 横屏；时间模型 = 回合制；虚拟摇杆 = 无摇杆；选中信息面板：画法 = 信息面板；选中信息面板 · 屏幕锚点 = 左下；主行动按钮：画法 = 大圆钮；主行动按钮 · 屏幕锚点 = 右下；信息叠层 / 图例：画法 = 格子高亮；计时 / 分数 / 回合：画法 = 回合徽章；计时 / 分数 / 回合 · 屏幕锚点 = 右上 |
| 几乎无 HUD：大军团或演出型战斗，只在顶部两侧留双方主将头像与兵力 | 手机 39 张里 3 张（霸业、半世界之旅 '战斗开始'大字横贯、风车之家）；跨品类 Monument Valley 是竖屏零 HUD 的代表 | 霸业（gameui:8901）、半世界之旅（gameui:6951）、风车之家（gameui:6997）、Monument Valley（steam:1927720） | 画幅朝向 = 横屏；信息密度 = 稀疏；虚拟摇杆 = 无摇杆；队伍 / 玩家条：画法 = 立绘头像（大小区分当前）；队伍 / 玩家条 · 屏幕锚点 = 上中；通知 / 大字提示：画法 = 整屏横贯带大字 |
| 主城 / 家园（只看非商业化部分）：点地移动 / 点地建造，底部一排功能或 4–5 个页签，中间偏下一个大 CTA（挑战 / 开始） | 手机 39 张里主界面 15 张：底部页签 6 张（战斗画面幻界之境也带底部页签）、中间大 CTA 4 张（苏打世界 PLAY、Royal Match 关卡号、小小霸主、阿尔米娅赞歌 挑战；Epic Age 的「招募」是抽卡入口，不计入）、点地移动 4 张 | 阿尔米娅赞歌（gameui:6728）、苏打世界（gameui:12543）、Royal Match（gameui:9383）、解忧小村落（gameui:6727） | 界面类型 = 主界面 / 大厅；虚拟摇杆 = 点地移动；分区导航 = 底部页签；分区导航跨屏常驻 = 开；主行动按钮：画法 = 宽按钮；主行动按钮 · 屏幕锚点 = 下中；建造栏 / 系统入口条：画法 = 图标按钮排；建造栏 / 系统入口条 · 屏幕锚点 = 下中 |

**关键元素与画法**

- **队伍 / 玩家条**（`el.party`）：unitCards / portraitRow / frames / portraits；常见位置 bc、tc。自动 / 半自动战斗里英雄头像就是技能按钮：放下沿拇指区，大招就绪用发光 / 充能满表示（神州风闻录）；血条可以画在头像上，但同一单位的头顶也要有一条，因为手指按着头像时看不到它。
- **倍速 / 暂停 / 自动**（`el.gameSpeed`）：x2 / autoBattle / speedBar / pauseMenu；常见位置 br、mr、tr、tl、bl。放置 / 自动战斗玩家最常用的系统键。锚点取决于下沿是否被头像占满：没占满放右下（战神之决 ×2 / ×5），占满了竖排到右缘（铸仙之境）或上角（小虾米战三国、奇缘之旅）。这批样本里倍速 / 暂停键明显小于主按钮（只能看相对比例：截图分辨率与设备 DPI 不明，量不出 pt），一场只按一两次所以可接受，但不能小于触控下限。国风作品把这组键做成圆印章（小虾米战三国），是皮肤可以接管的典型小组件。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots / cards / ring / row；常见位置 br、bc。动作类：大攻击键在右下拇指落点，3–5 个技能沿圆弧环绕（天涯明月刀、三界天骄、暖雪），越常用越近；卡牌 / 自动类：下沿一排卡（寻光之旅底部卡牌、死亡突围点卡出兵）。
- **按键 / 操作提示**（`el.prompt`）：touchButtons；常见位置 bl。虚拟摇杆 / 十字键在左下：固定摇杆有底盘，新手一眼知道能移动；浮动摇杆（暖雪）左半屏任意处按下即生成，画面最干净，但静态画面里看不出可以移动，首次要有提示。
- **主行动按钮**（`el.cta`）：round / wide；常见位置 br、bc。每屏只有一个最大的键：横屏是右下圆钮（英杰传'待机'、MMO 大攻击键），竖屏是下 1/3 居中的宽按钮（阿尔米娅赞歌'挑战'、苏打世界 PLAY、巫师血脉中间大战斗键）。
- **生命 / 护盾 / 体力**（`el.vitals`）：bar / segmented；常见位置 attachTo:target、tl、tr、tc。每个单位头顶一条小血条几乎是手游战斗的默认（几乎所有战斗样本都有）；1v1 或 PvE 首领战再在顶部两侧放双方大血条（寻光之旅斜切血条 + 中间倒计时、千鸟飞绝顶部两侧头像）。动作类单人只在左上一条（暖雪）。
- **计时 / 分数 / 回合**（`el.timer`）：scorePill / badge / number；常见位置 tc、tr。比分 / 回合 / 倒计时永远在顶部居中——只读、两只手都不会挡住。宝石小伙伴是蓝红对半的比分胶囊，回合制是'回合 1 / 18'小徽章。
- **目标 / 路点**（`el.objective`）：text / checklist；常见位置 tl、ml。胜利条件用一句话钉在左上（铸仙之境'胜利目标：击败敌方所有目标'）；MMO 的任务清单是左侧可折叠列表（天涯明月刀、三界天骄），占据左中但避开摇杆区。
- **命中反馈 / 连击**（`el.feedback`）：floatNumbers / combo；常见位置 attachTo:target、center。手机屏小、单位密，伤害飘字常常叠成一串（幻界之境一列 -35）；更好读的做法是加一个汇总数（神州风闻录、奇缘之旅底部'总伤害'大字，小虾米战三国顶部'总伤害'横幅）或连消大字（酱游记）。
- **通知 / 大字提示**（`el.notify`）：band / feed；常见位置 center、tl。'战斗开始'这类节拍用整屏横贯大字（半世界之旅）；回合制的治疗 / 增益日志用左上两行半透明滚动条（铸仙之境）。
- **选中信息面板**（`el.selection`）：panel；常见位置 bl。回合制给了阅读时间，左下放当前单位面板（立绘、血 / 蓝、四项属性、技能图标）——左手拇指不需要操作时那块区域是空的。
- **行动顺序**（`el.turnOrder`）：portraitQueue；常见位置 bc。竖屏回合战斗把行动顺序做成下沿圆形头像队列 + '行动 2 / 120'计数（铸仙之境）；幻界之境是底部 VS 回合条。
- **信息叠层 / 图例**（`el.overlay`）：gridHighlight；常见位置 attachTo:target。触屏没有悬停预览，战棋只能在选中后直接把移动 / 攻击范围铺在地上（英杰传青色 + 红色格、铸仙之境敌方红格）。
- **资源 / 货币**（`el.resources`）：iconNumber；常见位置 tc、tl、tr。战斗中的局内资源（死亡突围左上勇气 / 怒气两条、萌宠解谜顶部资源）放在顶部只读带。主界面资源条上的'+'购买入口属商业化层，不在本次范围。
- **建造栏 / 系统入口条**（`el.toolbar`）：buttonRow；常见位置 bc。家园 / 经营：建造、仓库、居民等功能一排放在下沿（解忧小村落、飞龙岛历险记），点地选位置、点按钮确认。
- **聊天**（`el.chat`）：collapsed；常见位置 bl。只有 MMO 有：左下两三行折叠聊天，挤在摇杆上方（三界天骄）——是横屏 MMO 最拥挤的一角。

**重要界面**

- **局内 HUD**：竖屏：顶部只读带（资源、回合、目标）→ 中间战场或棋盘 → 下 1/3 操作区（头像条 / 卡条 / 道具键）；倍速、暂停、跳过放右缘或下角。横屏：四角分工——左上头像 / 血量、右上小地图或回合、左下摇杆、右下大键 + 技能弧；中间尽量空。主按钮触控尺寸 ≥ 88 px@1080p（约 44pt），次要键也不低于触控下限。 例：铸仙之境（测试）（gameui:7082）、宝石小伙伴（测试）（gameui:7035）、天涯明月刀（gameui:12771）、暖雪-手游（gameui:6750） 等 5 款。
- **主界面 / 大厅**：只取非商业化骨架：底部 4–5 个页签常驻（flow.navPersistent），下 1/3 居中一个最大的'开始 / 挑战'键，顶部一条身份 + 资源只读带。两侧活动入口墙属于运营层，不学。 例：阿尔米娅赞歌（gameui:6728）、苏打世界（gameui:12543）、Royal Match（gameui:9383）、代号：梦山海（篝火测试）（gameui:7090）。
- **关卡 / 章节选择**：章节路径地图：竖屏长卷，节点沿蜿蜒小路自下而上，当前关卡带头像标记，'挑战'大按钮固定在下 1/3（阿尔米娅赞歌）；水墨长卷主城把地名竖排书法写在山间（代号：梦山海）。 例：阿尔米娅赞歌（gameui:6728）、代号：梦山海（篝火测试）（gameui:7090）。
- **结算 / 胜负 / 奖励**：胜负结算：一个大字定调（胜利 / VICTORY / DEFEAT），下方成员贡献行（伤害横条），按钮在底部；立绘可以压在一侧（战斗恋爱的胜利页是大立绘 + 浅蓝切角卡）。 例：战斗恋爱（gameui:11234）、AFK 2：Journey（gameui:5744）。
- **角色 / 装备 / 属性**：竖屏角色页：上半立绘，下半属性 / 技能卡片，页签在底部或左侧窄列（战斗恋爱浅蓝白切角卡）；横屏养成页是左侧竖排细线页签 + 右侧立绘（重返未来：1999）。 例：战斗恋爱（gameui:11234）、重返未来：1999（gameui:4596）。
- **匹配 / 组队 / 备战**：匹配等待：居中圆形加载 + 一句状态（伊甸之战）；对阵：斜切分屏 VS 卡；布阵：上方地图 / 战场预览，下方阵容格 + 保存按钮（AFK 2）。 例：伊甸之战（雷亚游戏/​​龙渊网络）（gameui:3860）、AFK 2：Journey（gameui:5744）。
- **对话 / 文本**：竖屏对话：底部对话框 + 半身立绘在上，或聊天气泡流（神觉者 Dislyte、绯闻港口）；继续靠点任意处。 例：神觉者 Dislyte（gameui:4373）、魔镜物语（猗国网络）（gameui:3239）、绯闻港口 Gossip Harbor（gameui:4834）。
- **登录 / 选服 / 创角**：登录 / 选服：米黄或白底列表卡居中（上古王冠选服），古风作品用屏风背景 + 白底卷轴弹窗（花亦山心之月）；确认按钮在弹窗底部居中。 例：上古王冠（gameui:2946）、花亦山心之月（朝夕光年）（gameui:2596）。
- **读取 / 过场**：读取：整幅主题插画（花亦山心之月金色水墨旗帜）+ 底部细进度条 + 一行提示；竖屏可用竖排书法标题（我自为道、炼仙传说）。 例：花亦山心之月（朝夕光年）（gameui:2596）、我自为道（竞技世界）（gameui:11870）、炼仙传说（幻界游戏）（gameui:4897）。
- **建造菜单**：家园 / 村落经营：等距地图占满，左上竖排日期（解忧小村落的季节 + 日期），底部一排建造功能；点地选位置。 例：解忧小村落（gameui:6727）、古代收租日记（测试）（gameui:6842）、飞龙岛历险记（gameui:6849）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 糖果卡通（Q 版）（`fam.candy`）（12 张）：Q 版角色与奶油卡 + 色带页眉、厚底按钮天然搭配，竖屏按单手设计时要求按钮大而少（单手是 R4 的默认标注，不是观察）。
- 暗金金属牌（`fam.dark-gold`）（8 张）：欧美卡通 / 奇幻手游的金框导航与名牌，多为单张或开场截图，证据弱。
- 暗色细线（`fam.dark-hairline`）（5 张）：手游横屏战斗：深色半透明顶条 + 细边技能键，证据只有单张。
- 国风水墨 / 墨笔（`fam.ink`）（5 张）：竖屏回合战斗、消除、经营（铸仙之境、小虾米、酱游记、梦山海、解忧小村落）：竖屏天然适合竖排与竖幡。
- 圆润友好（`fam.cozy`）（2 张）：Gossip Harbor、慢慢生活、萌宠解谜、小森灵、魔魔打勇士：剧情气泡与图鉴卡用奶油纸面。
- 倾斜动感（`fam.slant`）（2 张）：横屏卡牌对战与体育（寻光之旅、足球天才）。
- 重装饰雕花框（`fam.ornate-frame`）（1 张）：巫师血脉：魔幻主题的华丽回合横幅。
- 像素木框（`fam.pixel-wood`）（1 张）：像素木框：本品类主归属卡 古代收租日记（测试）（理由见 17 号图谱该家族的「多见品类」）。

**代表作**

- 铸仙之境（测试）（gameui:7082）〔国风水墨 / 墨笔〕：竖屏回合战斗最完整的一张：左上一句胜利目标 + 两行战斗日志、右缘四个竖排控制键、左下单位面板、下沿行动顺序头像队列，读写分区清楚。
- 暖雪-手游（gameui:6750）〔暗色细线〕：横屏动作的减法：左上一条血 + 怒气，右下大攻击键 + 三个技能弧，浮动摇杆不画底盘——HUD 密度 0。
- 宝石小伙伴（测试）（gameui:7035）〔糖果卡通（Q 版）〕：竖屏棋盘对战：顶部蓝红比分胶囊 + 双方头像，中间回合条，宝石盘占下 2/3，两个道具键在底角。
- 英杰传（测试）（gameui:7158）〔糖果卡通（Q 版）〕：触屏战棋：选中后直接铺移动 / 攻击格，左下单位面板，右下一个'待机'大圆键。
- 寻光之旅（gameui:6868）〔倾斜动感〕：横屏卡牌对战：顶部两侧斜切血条 + 中间倒计时，下沿一张卡 + 能量水晶，镜像对称。
- 疯狂宝贝（测试）（gameui:7101）〔糖果卡通（Q 版）〕：拖拽式技能：底部三张大英雄卡（带星级），拖出卡释放技能，右侧 ×2 倍速。
- 天涯明月刀（gameui:12771）〔暗色细线〕：横屏 MMO 的完整触屏骨架：技能键标注键位字母，同一套 UI 兼容键鼠 / 手柄；也展示了'四边全满'的代价。
- 小虾米战三国（gameui:6922）〔国风水墨 / 墨笔〕：皮肤接管小组件：自动 / ×2 / 撤退做成右上一排圆印章，左上回合数下面竖排胜负 / 聊天，跳过放左下，与水墨主题一致；顶部一条'总伤害'横幅汇总伤害。
- 阿尔米娅赞歌（gameui:6728）〔暗金金属牌〕：非商业化主界面的骨架：章节路径地图 + 下 1/3 居中'挑战'大按钮 + 底部五页签。
- 霸业（gameui:8901）〔暗色细线〕：大军团战斗几乎无 HUD：只有顶部两侧主将头像与兵力，战场占满。
- Monument Valley（steam:1927720）〔零 HUD · 世界即界面〕：跨品类对照：竖屏解谜零 HUD，只有左上一个小圆点菜单；去重后提到界面的 35 条评测只有 1 条来自差评。

**坑**

- 横屏 MMO 四边全满（顶部功能入口排 + 左侧任务 + 左下聊天 + 右下技能弧），战场只剩中间一小块 例：天涯明月刀（gameui:12771）、三界天骄（gameui:6729）。
  - 评价与证据（依据：截图）：GameUI 卡无评测；看图：天涯明月刀、三界天骄的横屏 MMO 四边都被入口与聊天占满。上过 Steam 的手游起家作品里，Stumble Guys 提到界面的 12 条评测里 5 条来自差评（样本很小）。
- 伤害飘字与技能特效叠成一团，盖住单位与头顶血条 例：幻界之境（gameui:6836）、神州风闻录（gameui:6853）。
  - 评价与证据（依据：截图）：无直接评测；看图（sheet-land-02）：飘字与技能特效叠成一团。对应 chk.fxOcclusion 与「总伤害汇总数」做法。
- 次要键（倍速、暂停、跳过）做得太小或贴着屏幕圆角 / 刘海 例：奇缘之旅（gameui:6904）、巫师血脉（gameui:6814）。
  - 评价与证据（依据：截图）：无评测；R4 看图：倍速 / 暂停键明显小于主按钮、贴近屏幕圆角（只能比较相对大小，截图量不出 pt）。触控下限按 ix.touchSize 默认手机 88 px@1080p 检查。
- 关键读数放在拇指正下方（只在头像上画血条，按住头像时看不到） 例：海贼王：梦想指针（gameui:12746）、放置七骑士（gameui:10348）。
  - 评价与证据（依据：推断）：无评测证据；依据'读数在上、操作在下'原则。正例：多数样本在单位头顶再画一条血（gameui:7312、gameui:6826）。
- 浮动摇杆完全不可见，新手不知道左半屏可以拖动 例：暖雪-手游（gameui:6750）。
  - 评价与证据（依据：推断）：无评测证据；R3'提示 / 引导不清'是各类里出处最多的一类（去重后 41 款）。建议首次进入时在左半屏画一个提示圈（el.guide.form = ring），成功拖动一次后退场（见 P-teach-then-retire）。
- 触屏 UI 原样移植到 PC / 手柄：大圆钮、拖拽、长按都没有对应输入，缩放不对 例：Kingdom Rush Vengeance - Tower Defense（steam:1367550）、Melvor Idle（steam:1267910）、Bloons TD 6（steam:960090）。
  - 评价与证据（依据：评测）：去重后 Kingdom Rush Vengeance'手柄 / 键位不好'1 条；Melvor Idle'UI 缩放 / 分辨率'1 条，提到界面的 22 条评测里 8 条来自差评。证据很弱。
- 竖屏把确认 / 关闭键放在顶角，单手够不到 例：贪吃怪大作战（gameui:13082）、阿尔米娅赞歌（gameui:6728）。
  - 评价与证据（依据：截图）：无评测；R4 看图：竖屏样本多把主按钮、页签、确认放在下 1/3（贪吃怪大作战的弹窗把关闭叉也放在底部，是正例）。

**可演示的对比**

- **握持：竖屏单手 vs 横屏双拇指**（整套做法对照（多个参数一起变）；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：画幅朝向：竖屏 → 横屏；技能 / 冷却 / 弹药 / 手牌 · 内部排布：继承 → 环绕中心 / 轮盘；技能 / 冷却 / 弹药 / 手牌：画法：自动 → 技能格；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：自动 → 右下
  - 配套改动：握持与拇指区：竖屏单手 → 横屏双拇指；虚拟摇杆：无摇杆 → 浮动摇杆；触屏按钮布局：底部一排 → 大键 + 弧形环绕；分区方式：上下分栏 → 自动；队伍 / 玩家条：画法：单位卡条 → 自动；队伍 / 玩家条 · 屏幕锚点：下中 → 自动
  - 看什么：打开拇指区示意：a 的全部操作在下 1/3、上 2/3 只读；b 的操作在左右两个下角、中间与上沿只读。同一套元素换握持后哪些锚点被改写。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.input=touch` `ctx.device=phone` `cnt.screen=screen.hud`
  - A：`ctx.orientation=portrait` `ix.thumbZone=oneHand` `ix.touchStick=none` `ix.touchCluster=row` `lay.composition=splitTB` `el.party.form=unitCards` `el.party.screenAnchor=bc` `el.abilities.arrangement=inherit` `el.abilities.form=auto` `el.abilities.screenAnchor=auto`
  - B：`ctx.orientation=landscape` `ix.thumbZone=twoThumbs` `ix.touchStick=floating` `ix.touchCluster=arc` `el.abilities.form=slots` `el.abilities.arrangement=ring` `el.abilities.screenAnchor=br` `el.party.form=auto` `el.party.screenAnchor=auto` `lay.composition=auto`

  </details>
- **自动战斗控制：右下横排倍速 vs 右缘竖排印章**（整套做法对照（多个参数一起变）；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：倍速 / 暂停 / 自动 · 内部排布：横排 → 竖列；倍速 / 暂停 / 自动：画法：倍速按钮 → 暂停 / 1x / 2x 按钮条；倍速 / 暂停 / 自动 · 屏幕锚点：右下 → 右中
  - 配套改动：标牌（倍速 / 暂停 / 自动）：无（直压） → 印章；标题字族：同正文 → 书法
  - 看什么：下沿已有 5 个英雄头像时：a 和头像条抢位置；b 让出下沿，并且展示皮肤如何接管一个系统小组件（印章外形 + 书法字）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`el.gameSpeed.form=x2` `el.gameSpeed.screenAnchor=br` `el.gameSpeed.arrangement=row` `cmp.plate@el.gameSpeed=none` `typ.display.family=same`
  - B：`el.gameSpeed.form=speedBar` `el.gameSpeed.screenAnchor=mr` `el.gameSpeed.arrangement=column` `cmp.plate@el.gameSpeed=seal` `typ.display.family=calligraphy`

  </details>
- **技能输入：大键 + 弧形环绕 vs 下沿卡条拖放**（整套做法对照（多个参数一起变）；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：技能 / 冷却 / 弹药 / 手牌 · 内部排布：环绕中心 / 轮盘 → 横排；技能 / 冷却 / 弹药 / 手牌：画法：技能格 → 手牌；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点：右下 → 下中；触屏按钮布局：大键 + 弧形环绕 → 底部一排
  - 配套改动：主交互模式：选择条目 → 拖拽；卡牌版式：自动 → 整幅立绘 + 少字
  - 看什么：a 适合实时动作（拇指不离开右下）；b 适合有'放哪儿'决策的卡牌 / 塔防（拖到战场上的位置本身是信息）。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d2` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`ix.touchCluster=arc` `el.abilities.form=slots` `el.abilities.arrangement=ring` `el.abilities.screenAnchor=br` `ix.mode=select` `cmp.card=auto`
  - B：`ix.touchCluster=row` `el.abilities.form=cards` `el.abilities.arrangement=row` `el.abilities.screenAnchor=bc` `ix.mode=drag` `cmp.card=fullArt`

  </details>
- **竖屏布局：全屏战场 vs 上战斗下棋盘**（整套做法对照（多个参数一起变）；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击：画法：无 → 连击大数字；计时 / 分数 / 回合：画法：回合徽章 → 比分胶囊；虚拟摇杆：自动 → 滑动手势；分区方式：单区 → 上下分栏
  - 配套改动：玩法区形态：全屏 → 棋盘 / 关卡窗
  - 看什么：b 把可操作区（棋盘）整块放进拇指区，战斗变成只读的'结果显示器'；对比两者上半屏的信息量。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d3` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.orientation=portrait` `el.timer.screenAnchor=tc` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`lay.composition=single` `lay.playfield=full` `el.timer.form=badge` `el.feedback.form=[]` `ix.touchStick=auto`
  - B：`lay.composition=splitTB` `lay.playfield=boardWindow` `el.timer.form=scorePill` `ix.touchStick=swipe` `el.feedback.form=combo`

  </details>
- **摇杆：固定底盘 vs 浮动无底盘**（整套做法对照（多个参数一起变）；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：信息密度：中等 → 极简；按键 / 操作提示：画法：触屏按钮 → 无；按键 / 操作提示 · 屏幕锚点：左下 → 自动；虚拟摇杆：固定摇杆 → 浮动摇杆
  - 配套改动：引导指示 / 聚光：画法：自动 → 光圈脉冲；HUD 显隐策略：自动 → 情境显现
  - 看什么：静止截图里 b 看不出能移动，靠首次提示圈；a 永远占左下一块但新手零学习成本。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d4` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`ix.touchStick=fixed` `el.prompt.form=touchButtons` `el.prompt.screenAnchor=bl` `cnt.density=2` `el.guide.form=auto` `rel.hudVisibility=auto`
  - B：`ix.touchStick=floating` `cnt.density=0` `rel.hudVisibility=contextual` `el.guide.form=ring` `el.prompt.form=[]` `el.prompt.screenAnchor=auto`

  </details>
- **触控尺寸：44pt 主按钮 vs 偏小的系统键**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：触控尺寸：88 → 64
  - 看什么：打开触控尺寸检查：b 下倍速 / 暂停 / 跳过被标红；同时看它们离屏幕圆角和刘海（chk.safeArea）有多近。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d5` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `chk.touch=true` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`ix.touchSize=88`
  - B：`ix.touchSize=64`

  </details>
- **伤害反馈：逐个飘字 vs 汇总大数**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击：画法：飘字 → 飘字 + 连击大数字
  - 配套改动：反馈强度：0.8 → 0.5；命中反馈 / 连击 · 屏幕锚点：自动 → 下中；数值变化：自动 → 数字滚动
  - 看什么：5 名英雄同时出手：a 的飘字叠成一列盖住单位；b 每个单位只留小飘字，底部一个滚动的总伤害数承担'爽感'。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobile#d6` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `chk.fxOcclusion=true` `ctx.device=phone` `ctx.input=touch` `cnt.screen=screen.hud`
  - A：`el.feedback.form=floatNumbers` `mo.juice=0.8` `el.feedback.screenAnchor=auto` `mo.valueChange=auto`
  - B：`el.feedback.form=floatNumbers+combo` `el.feedback.screenAnchor=bc` `mo.valueChange=countUp` `mo.juice=0.5`

  </details>

**样例内容**：手机触屏（局内与非商业化界面）（`arena#base`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（9 项）</summary>

- 拇指可达区没有可视化检查——新增工具项 chk.thumbReach：按 ix.thumbZone 叠加'易达 / 可达 / 难达'热区，主按钮落在难达区时警告
- 竖屏上下分屏的比例无法设置——新增 lay.splitRatio（range 0.2–0.8，作用于 lay.composition = splitTB / splitLR）
- 触屏的'查看详情'方式（触屏没有悬停）——新增 ix.inspect：longPress / infoButton / tapPreviewTapConfirm
- 技能键的拖动瞄准与取消区——新增 ix.skillAim：tap / dragAim / dragToPlace，并配一个取消区位置（按钮上方 / 屏幕顶部）
- 技能键上同时标触屏图标与键位字母——ix.glyphs 增加 touchPlusKey（触屏外形 + 角标键位），对应 cmp.button 的 hotkeyBadge
- 大招就绪 / 可用状态没有独立编码——与卡牌组的 st.playable 合并（就绪脉冲 / 亮边 / 充能满跳动）
- 触觉反馈（振动）——新增 mo.haptics：无 / 轻 / 按事件分级（受击、大招、结算），减少动效开时一并关闭
- 浮动摇杆底盘的显示策略——ix.touchStick = floating 时增加子参数 stickBase：hidden / onTouch / always
- 自动战斗的'撤退 / 认输'键没有取值——el.gameSpeed.form 增加 autoSpeedRetreat（或在 speedBar 里允许加入撤退项）

</details>

**最相关的原则**（按针对性排序）：[P-touch-target-size](#p-touch-target-size)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-confirm-by-input](#p-confirm-by-input)、[P-priority-tiers](#p-priority-tiers)、[P-squint-test](#p-squint-test)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-transition-frequency](#p-transition-frequency)、[P-aspect-anchor](#p-aspect-anchor)、[P-input-parity](#p-input-parity)、[P-glyph-follows-device](#p-glyph-follows-device)、[P-text-size-floor](#p-text-size-floor)、[P-glance-encoding](#p-glance-encoding)、[P-teach-then-retire](#p-teach-then-retire)、[P-contextual-ping](#p-contextual-ping)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

### 3.18 格斗

参考卡 1 张 · 探索台内容包：arena（星核联赛）

格斗的 HUD 是一套高度约定俗成的对称语法：顶部左右对称的两条血条、中间回合计时、底部两角的必杀 / 能量槽、连段数与评价字从中间偏上弹出。约定越强，风格越只能在「画法」上发挥（Street Fighter 6 的涂鸦、Guilty Gear 的动画式描边），位置几乎不能动。

**子类**：2D / 2.5D 对战格斗（Street Fighter、Guilty Gear）；3D 格斗（TEKKEN）；平台乱斗（大乱斗类）；回合制 / 模拟格斗（Your Only Move Is HUSTLE）；手游格斗与竞技场（星核联赛内容包）

**证据说明**：uiRefs.json 的 genre 字段里没有这个品类；17 号图谱把 1 张卡的子类记为它（Your Only Move Is HUSTLE）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：Your Only Move Is HUSTLE（steam:2212330，库里标 strategy）、Esports Godfather（steam:1278540）的选人页、Hi-Fi RUSH 的评价字。

**一眼要知道什么**

1. 我和对手各还剩多少血、谁领先——两边必须同样大、同样一眼可比。
2. 这一回合还剩几秒、比分几比几（回合点）。
3. 必杀 / 能量槽有几格、够不够放大招。
4. 刚才那一套打了几段、算不算有效连段（连段数 + 伤害）。
5. 我现在能不能动：硬直、倒地、防御崩溃这类状态。
6. 练习模式里：刚才的输入对不对、帧数是多少。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 顶部对称双血条 + 中央计时：左 1P、右 2P 镜像，头像与名字在血条外侧，回合点在计时两旁 | 待补参考：库里只有回合制格斗 Your Only Move Is HUSTLE（steam:2212330）一张卡，它也是顶部双方血条；探索台 layout.fighting 预设用的就是这一版式 | Your Only Move Is HUSTLE（steam:2212330） | 界面类型 = 局内 HUD；同屏玩家与视口 = 1v1 镜像对战；信息元素集合 = 生命 / 护盾 / 体力 + 队伍 / 玩家条 + 计时 / 分数 / 回合；生命 / 护盾 / 体力 · 屏幕锚点 = 上中；计时 / 分数 / 回合：画法 = 数字；计时 / 分数 / 回合 · 屏幕锚点 = 上中；队伍 / 玩家条：画法 = 立绘头像（大小区分当前）；数值变化 = 延迟拖尾 |
| 底角能量槽：必杀 / 超必杀槽分段，放在两下角，与血条同侧 | 待补参考（Street Fighter 6、Guilty Gear -Strive-、TEKKEN 8 的惯例） | — | 信息元素集合 = 资源 / 货币；资源 / 货币：画法 = 以数值图形呈现；数值图形（资源 / 货币） = 分段格；资源 / 货币 · 屏幕锚点 = 左下 |
| 中部偏上连段数 / 评价字：只在连段进行中出现，结束后合并成一个伤害总数 | 待补参考；同类做法见动作品类的风格评价字（Devil May Cry 5、Hi-Fi RUSH） | Hi-Fi RUSH（steam:1817230） | 命中反馈 / 连击：画法 = 连击大数字 + 评价字（Good! / Perfect）；命中反馈 / 连击 · 屏幕锚点 = 上中；命中反馈 / 连击 · 显隐（逐元素） = 情境显现 |

**关键元素与画法**

- **生命 / 护盾 / 体力**（`el.vitals`）：bar（长条 + 拖尾）；常见位置 tc。两条血条必须一样长、对称，掉血用拖尾差值段（mo.valueChange = trail），否则一套连段打了多少看不出来。可恢复的「灰血」段是格斗特有的第二层。
- **计时 / 分数 / 回合**（`el.timer`）：number；常见位置 tc。回合计时放在两条血条中间，数字大、等宽；最后 10 秒变色或放大。
- **资源 / 货币**（`el.resources`）：gauge → segmented；常见位置 bl、br。必杀槽按格分段，满一格就能放一次招；放在两下角、与各自血条同侧。
- **命中反馈 / 连击**（`el.feedback`）：combo / rating；常见位置 tc、center。连段数与「COUNTER / PUNISH」一类评价字只在发生时出现，用大号描边字；不能挡住角色。
- **队伍 / 玩家条**（`el.party`）：portraits；常见位置 tl、tr。头像与名字在血条外侧；团队格斗（3v3）在头像下排队友小头像。
- **按键 / 操作提示**（`el.prompt`）：list；常见位置 ml。练习模式的输入记录竖排在左侧，用方向与按键图标；对战中不显示。

**重要界面**

- **选人**：角色格子居中（网格或环形），双方各一个光标、各一块大立绘在左右两侧；选中后有短暂的 VS 演出。 例：Esports Godfather（steam:1278540）。
- **VS / 读取**：左右两张立绘 + 中间 VS 大字，读取进度藏在演出里（P-frontend-loading）。
- **训练 / 练习**：输入记录、帧数据、连段试炼列表；重来不经过任何菜单（P-fail-retry）。
- **结算**：胜者立绘 + 回合比分 + 一键再战 / 换角（对战游戏的「再来一局」必须是默认焦点）。 例：AFK 2：Journey（gameui:5744）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 模拟 / 策略工具面板（`fam.sim-panel`）（1 张）：模拟 / 策略工具面板：本品类卡 Your Only Move Is HUSTLE（见 17 号图谱该家族）。
- 街头涂鸦 / 贴纸滑板（`fam.graffiti`）（0 张）：Street Fighter 6 以嘻哈与涂鸦为界面基调（IGN Japan 访谈的转述，S063）——待补参考。
- 倾斜动感（`fam.slant`）（0 张）：倾斜动感：斜切横幅、斜体大字、速度线，最适合 VS 与连段演出。
- 漫画对话框（`fam.comic`）（0 张）：漫画对话框：动画式描边与拟声字（Guilty Gear 的 2D 动画式画面，S044）——待补参考。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）（0 张）：电竞转播包装：比分牌、选手名条、回放插播，适合竞技向格斗的观战模式。

**代表作**

- Your Only Move Is HUSTLE（steam:2212330）〔模拟 / 策略工具面板〕：Your Only Move Is HUSTLE：回合制格斗，顶部双方血条 + 键位说明、底部一大片招式按钮与预测开关——格斗约定 + 调试面板式的极端例子；评测里有 3 条说不知道该怎么玩。

**坑**

- 两边血条长度、粗细或颜色不对称，玩家要先想「哪条是我」。
  - 评价与证据（依据：推断）：无评测计数；格斗的对称语法是通行惯例（待补参考）。
- 连段数与评价字挡住角色，或者每一下都弹大字。
  - 评价与证据（依据：推断）：无计数；与 P-event-callout-tiers 同理。
- 能量槽只靠颜色表示可用，没有格数或闪光。
  - 评价与证据（依据：推断）：无计数；P-color-never-alone。
- 练习模式失败后要经过菜单才能重来。
  - 评价与证据（依据：推断）：无计数；P-fail-retry。

**可演示的对比**

- **血条与计时挤在左上角 vs 顶部对称双血条 + 中央计时**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：生命 / 护盾 / 体力 · 屏幕锚点：左上 → 上中；计时 / 分数 / 回合 · 屏幕锚点：右上 → 上中；数值变化：瞬变 → 延迟拖尾
  - 配套改动：资源 / 货币 · 屏幕锚点：左上 → 下中
  - 看什么：B 才像格斗：血条在顶部中央对称、计时夹在中间、能量槽沉到底部，掉血带拖尾。A 的信息一样多，但玩家要在角落里找自己和对手的血量。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-fighting#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `cnt.screen=screen.hud` `ctx.players=versus` `cnt.elements=el.vitals+el.party+el.timer+el.resources+el.feedback` `el.resources.form=gauge` `chk.demo=combatBeat`
  - A：`el.vitals.screenAnchor=tl` `el.timer.screenAnchor=tr` `el.resources.screenAnchor=tl` `mo.valueChange=instant`
  - B：`el.vitals.screenAnchor=tc` `el.timer.screenAnchor=tc` `el.resources.screenAnchor=bc` `mo.valueChange=trail`

  </details>

**样例内容**：街头对战（`fighting#street`）、武馆擂台（`fighting#dojo`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（3 项）</summary>

- 缺格斗内容包——cnt.pack 增加 fighting（两名角色、灰血、回合点、连段数）
- 血条的「可恢复灰血」段与「镜像」排布——cmp.gauge 增加 recoverable 层；el.vitals 增加 mirror（2P 镜像）
- 输入记录 / 帧数据显示——新增 el.inputLog

</details>

**最相关的原则**（按针对性排序）：[P-glance-encoding](#p-glance-encoding)、[P-value-change-visible](#p-value-change-visible)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-scoreboard-team-id](#p-scoreboard-team-id)、[P-fail-retry](#p-fail-retry)、[P-shake-hitstop](#p-shake-hitstop)、[P-damage-number-legibility](#p-damage-number-legibility)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

**待补参考（R5）**：Street Fighter 6、TEKKEN 8、Guilty Gear -Strive-

### 3.19 音游

参考卡 6 张 · 探索台内容包：rhythm（回声地下室）

音游的界面就是玩法本身：音轨（或判定线）、音符、判定字和连击数都在视线中心，其余信息退到边框外（lay.playfield = centerColumn、lay.hudOrg = inMargin）。判定字要在一瞥之内读出，颜色之外必须有字或形状；节拍与界面动效要同步，否则整套 UI 都显得「不在拍上」。

**子类**：下落式音轨（MUSYNX）；VR 劈砍（Beat Saber）；弹幕躲避式（Just Shapes & Beats）；节奏动作（Hi-Fi RUSH、Crypt of the NecroDancer）；节奏小品（Melatonin、Sayonara Wild Hearts）；高速节奏（Thumper）

**证据说明**：uiRefs.json 的 genre 字段里没有这个品类；17 号图谱把 6 张卡的子类记为它（Hi Fi Rush、Melatonin、Hi-Fi RUSH、Just Shapes & Beats、Beat Saber、MUSYNX）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：MUSYNX（steam:952040，库里标 racing）、Beat Saber、Just Shapes & Beats、Hi-Fi RUSH、Sayonara Wild Hearts、Melatonin。

**一眼要知道什么**

1. 下一个音符什么时候、从哪里来（音轨与判定线）。
2. 刚才那一下判得怎么样（完美 / 好 / 差）。
3. 连击还在不在、数到多少了。
4. 这首歌还剩多少、血量 / 容错还有多少。
5. 这首歌难不难、我上次打到哪一档（选曲页）。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 中央音轨 + 判定字压在判定线上方，分数与连击在音轨两侧或边框外 | 库里只有 MUSYNX（steam:952040，标在 racing）：中间判定字 EXACT 大字 + 连击数；探索台 layout.rhythm 预设同一版式 | MUSYNX（steam:952040） | 界面类型 = 局内 HUD；HUD 组织方式 = 画在玩法区外的边框里；玩法区形态 = 居中竖条 + 两侧装饰区；信息元素集合 = 命中反馈 / 连击 + 计时 / 分数 / 回合 + 世界 / 社会态势条；命中反馈 / 连击：画法 = 评价字（Good! / Perfect） + 连击大数字；命中反馈 / 连击 · 屏幕锚点 = 中心 |
| 空间内读数：分数、连击浮在玩法区两侧（VR） | Beat Saber（steam:620980，标在 action） | Beat Saber（steam:620980） | 命中反馈 / 连击 · 放置方式（逐元素） = 空间内；计时 / 分数 / 回合 · 放置方式（逐元素） = 空间内 |
| 近零 HUD：画面就是谱面，只有一条细进度条 | Just Shapes & Beats（steam:531510）顶部细进度条、危险全用品红；Sayonara Wild Hearts（steam:1122720）几乎无 HUD | Just Shapes & Beats（steam:531510）、Sayonara Wild Hearts（steam:1122720） | 信息密度 = 极简；计时 / 分数 / 回合：画法 = 以数值图形呈现；计时 / 分数 / 回合 · 屏幕锚点 = 上中 |

**关键元素与画法**

- **命中反馈 / 连击**（`el.feedback`）：rating / combo；常见位置 center。判定字（PERFECT / GREAT / MISS 或中文「完美 / 良好」）在判定线附近、一瞥可读；颜色之外要有字样或形状。连击数紧跟其下，断连时有明确的动画。
- **计时 / 分数 / 回合**（`el.timer`）：gauge / number；常见位置 tc、tr。歌曲进度用一条细条；分数用等宽数字，放边框外。
- **世界 / 社会态势条**（`el.meter`）：single；常见位置 tc、bc。容错 / 血量一条细条；有的作品（Thumper 一类）把它做进音轨本身。
- **信息叠层 / 图例**（`el.overlay`）：gridHighlight；常见位置 center。音轨与判定线本身是空间内叠层，按键提示画在轨道下端。

**重要界面**

- **选曲**：曲目卡片轮播 / 列表，每首歌给难度、最高评级、BPM；试听自动播放（MUSYNX 斜放的插画卡片轮播）。 例：MUSYNX（steam:952040）。
- **结算**：评级字母是重拍，判定分布（完美 / 良好 / 失误条数）用内联条（P-result-tally、P-in-game-charts）。 例：Sayonara Wild Hearts（steam:1122720）。
- **校准**：音画延迟校准页是音游独有的必需界面：按拍点击，给出偏移毫秒数。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 漫画对话框（`fam.comic`）（2 张）：漫画对话框：Hi-Fi RUSH 的拟声字与节拍评级。
- 合成波 / 蒸汽波（`fam.synthwave`）（2 张）：霓虹与合成波：MUSYNX、Beat Saber 都在这一路（两张卡在 17 号图谱里的主归属见对应家族）。
- 零 HUD · 世界即界面（`fam.zero-hud`）（1 张）：零 HUD：Sayonara Wild Hearts、Melatonin，界面退到画面里。
- 扁平几何 · 地图即界面（`fam.flat-map`）（1 张）：扁平几何 · 地图即界面：本品类卡 Just Shapes & Beats（见 17 号图谱该家族）。
- 矢量显示器 / 霓虹线框（`fam.vector-display`）（0 张）：矢量显示器 / 霓虹线框：高速音游（Thumper 一类）——待补参考。

**代表作**

- MUSYNX（steam:952040）〔合成波 / 蒸汽波〕：MUSYNX：中间判定字 EXACT 大字 + 连击数，选曲是斜放的插画卡片轮播（库里标在 racing，品类上属音游）。
- Beat Saber（steam:620980）〔合成波 / 蒸汽波〕：Beat Saber：VR 劈砍，分数与连击浮在轨道两侧，红蓝双色贯穿方块、光剑与灯光，方块上有箭头做形状冗余。
- Just Shapes & Beats（steam:531510）〔扁平几何 · 地图即界面〕：Just Shapes & Beats：危险全用品红、玩家用青色，其它元素不需要 UI；顶部一条细进度条。
- Hi-Fi RUSH（steam:1817230）〔漫画对话框〕：Hi-Fi RUSH：节奏动作，右上节拍评级字母，击打时整屏漫画拟声字。

**坑**

- 判定只靠颜色区分（金 / 绿 / 红），色弱玩家分不出。
  - 评价与证据（依据：推断）：无计数；Beat Saber 在方块上加箭头做形状冗余是正面例子。
- 密集段落里判定字、特效与音符叠在一起，看不清下一个音符。 例：MUSYNX（steam:952040）。
  - 评价与证据（依据：评测）：去重后 MUSYNX 有 2 条评测说难度上来后「密密麻麻看不清」——说的是谱面密度，不是文字；仍提示判定层不能再加噪声。
- UI 动效不在拍上（菜单转场、结算计数和歌曲节拍对不上）。
  - 评价与证据（依据：推断）：无计数；设计推论（P-motion-personality）。
- 没有音画延迟校准，判定被玩家认为不准。
  - 评价与证据（依据：推断）：无计数；通行惯例（待补参考）。
- 高强度闪光与频闪：节奏作品是光敏抱怨最集中的一类之一。 例：Just Shapes & Beats（steam:531510）、Sayonara Wild Hearts（steam:1122720）。
  - 评价与证据（依据：评测）：本地评测去重后光敏 / 频闪一类：Just Shapes & Beats 4 条、Sayonara Wild Hearts 3 条，多为好评里附带的警告。

**可演示的对比**

- **判定字缩在角落 vs 判定字压在判定线上方**（单变量对照；内容包：rhythm · 回声地下室；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：命中反馈 / 连击 · 屏幕锚点：右上 → 中心；命中反馈 / 连击：画法：连击大数字 → 评价字（Good! / Perfect） + 连击大数字
  - 看什么：A 的连击数缩在右上角，玩家的视线必须离开音轨才能看；B 的判定字和连击就在判定线上方，余光就能读到。音游里视线离开音轨等于漏音符。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-rhythm#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rhythm` `cnt.screen=screen.hud` `lay.hudOrg=inMargin` `lay.playfield=centerColumn` `cnt.elements=el.feedback+el.timer+el.meter` `chk.demo=combatBeat`
  - A：`el.feedback.form=combo` `el.feedback.screenAnchor=tr`
  - B：`el.feedback.form=rating+combo` `el.feedback.screenAnchor=center`

  </details>

**样例内容**：地下室乐队（`rhythm#basement`）、霓虹夜曲（`rhythm#neon`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 缺音轨 / 判定线元素——新增 el.lane（下落式 / 环形 / 横向），判定线位置与音符形状
- 缺音画延迟校准界面——cnt.subtype 增加 calibration

</details>

**最相关的原则**（按针对性排序）：[P-glance-encoding](#p-glance-encoding)、[P-focal-periphery](#p-focal-periphery)、[P-motion-personality](#p-motion-personality)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-result-tally](#p-result-tally)、[P-fail-retry](#p-fail-retry)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

**待补参考（R5）**：Crypt of the NecroDancer、Thumper

### 3.20 体育与体育经理

参考卡 2 张 · 探索台内容包：arena（星核联赛）

体育游戏的界面借电视转播：比分牌常驻一角、球员名条从下方滑入、回放与数据插播用斜切横幅（17 号图谱 fam.broadcast）。体育经理则是另一极——阵型图、球员属性表、赛季图表，信息密度 4。两者共同的是「球场」这种排布（lay.arrangement = pitch / track），目前没有任何家族或原则用到它。

**子类**：动作体育（足球、篮球、Rocket League 一类）；体育经理 / 电竞经理（Football Manager、Esports Godfather）；竞速体育见竞速篇

**证据说明**：uiRefs.json 的 genre 字段里没有这个品类；17 号图谱把 2 张卡的子类记为它（足球天才、Esports Godfather）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：Esports Godfather（steam:1278540，库里标 card）、Circuit Superstars（steam:1097130，标 racing）。

**一眼要知道什么**

1. 比分几比几、还剩多少时间。
2. 我控制的是哪个球员、他的体力 / 状态。
3. 传球 / 射门的目标在哪（力度条、指示箭头）。
4. 阵型与站位（经理类）：谁在哪个位置、状态如何。
5. 赛季走势：排名、积分、球员成长。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 转播式比分牌：左上或上中一块小牌（双方缩写 + 比分 + 时间），事件时滑出名条 | 待补参考（Rocket League、足球类）；转播包装家族见 17 号图谱 fam.broadcast（4 张卡） | — | 界面类型 = 局内 HUD；同屏玩家与视口 = 线上队伍（队友栏 + 记分）；信息元素集合 = 计时 / 分数 / 回合 + 队伍 / 玩家条 + 通知 / 大字提示；计时 / 分数 / 回合：画法 = 比分胶囊；计时 / 分数 / 回合 · 屏幕锚点 = 左上；通知 / 大字提示：画法 = 整屏横贯带大字；入场动效 = 斜切划入 / 遮罩擦除 |
| 阵型图：球场俯视 + 球员节点 + 属性小条（经理类） | 待补参考（Football Manager）；电竞经理 Esports Godfather（steam:1278540）的英雄池是六边形格 | Esports Godfather（steam:1278540） | 界面类型 = 角色 / 装备 / 属性；界面子功能 = 组队 / 布阵；条目排布几何 = 球场 / 实景站位；节点形态 = 头像；统计图形 = 行内横条 |
| 受控球员脚下光圈 + 头顶体力条 | 待补参考（通行惯例） | — | 生命 / 护盾 / 体力 · 世界挂点 = 玩家角色；生命 / 护盾 / 体力 · 放置方式（逐元素） = 空间内；引导指示 / 聚光：画法 = 光圈脉冲 |

**关键元素与画法**

- **计时 / 分数 / 回合**（`el.timer`）：scorePill；常见位置 tl、tc。比分牌是体育界面的第一元素：双方缩写 + 比分 + 时间，常驻一角，紧凑等宽。
- **队伍 / 玩家条**（`el.party`）：scoreRow / portraits；常见位置 bl、br。球员名条：换人、进球时从下方滑入；队色要有形状或文字冗余（P-scoreboard-team-id）。
- **通知 / 大字提示**（`el.notify`）：band / banner；常见位置 bc、tc。进球、犯规、回放用转播式斜切横幅（fam.broadcast），每场个位数次。
- **小地图 / 罗盘**（`el.minimap`）：plan；常见位置 bc。球场小图：双方球员点位，底部中央。
- **世界 / 社会态势条**（`el.meter`）：paired；常见位置 bc。控球率、气势这类两方对比用对比条（cmp.gauge = bipolar）。

**重要界面**

- **阵型 / 战术**：球场俯视（lay.arrangement = pitch），球员节点可拖动，旁边是属性对比；改动当场预览（P-build-placement 的放置规则同样适用）。
- **比赛统计**：双方对比条（射门、控球、传球成功率）+ 时间轴事件（P-in-game-charts）。
- **赛季 / 联赛表**：积分榜按排名排序，「我」的那一行加底色，升降箭头。 例：Circuit Superstars（steam:1097130）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 倾斜动感（`fam.slant`）（1 张）：倾斜动感：电竞与街头运动的斜切与速度感。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）（1 张）：电视转播包装：比分牌、名条、斜切横幅、回放插播，是体育类的默认风格方言。
- 瑞士几何 / 极简表格（`fam.swiss`）（0 张）：瑞士几何 / 极简表格：体育经理的数据表与阵型图。
- 扁平 / Material（`fam.flat`）（0 张）：扁平 / Material：现代体育游戏菜单的常见做法。

**代表作**

- Esports Godfather（steam:1278540）〔电视转播包装（体育 / 电竞 / 综艺）〕：Esports Godfather：电竞经理，红蓝双色、斜切横幅 SELECT HERO、VS 大字；英雄池是六边形格——转播包装 + 经理表格的结合。
- Circuit Superstars（steam:1097130）〔电视转播包装（体育 / 电竞 / 综艺）〕：Circuit Superstars：左上名次 + 排名表、三维颁奖台——赛车转播式的排名呈现（库里标 racing）。

**坑**

- 比分牌做得太大或放在画面中央，挡住球场。
  - 评价与证据（依据：推断）：无计数；转播惯例是左上 / 上中小牌（待补参考）。
- 两队只靠红 / 蓝或红 / 绿区分，色弱玩家在小地图上分不出。
  - 评价与证据（依据：推断）：无计数；P-scoreboard-team-id。
- 经理类一屏几十列数字，没有对比图形与排序。
  - 评价与证据（依据：推断）：无计数；P-in-game-charts。
- 转播式插播太频繁，打断比赛节奏。
  - 评价与证据（依据：推断）：无计数；P-event-feed-tiers。

**可演示的对比**

- **比分：中央大数字 vs 转播式左上比分牌 + 斜切入场**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：计时 / 分数 / 回合：画法：数字 → 比分胶囊；计时 / 分数 / 回合 · 屏幕锚点：上中 → 左上
  - 配套改动：倾斜角：0 → -8；入场动效：淡入 → 斜切划入 / 遮罩擦除
  - 看什么：A 把比分做成上中央的大数字，像街机；B 是转播式比分牌，收在左上、斜切入场。比较画面中央留出的球场面积，再想一想哪种更像「在看一场比赛」。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-sports#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `cnt.screen=screen.hud` `ctx.players=team` `cnt.elements=el.timer+el.party+el.minimap`
  - A：`el.timer.form=number` `el.timer.screenAnchor=tc` `vis.skew=0` `mo.enter=fade`
  - B：`el.timer.form=scorePill` `el.timer.screenAnchor=tl` `vis.skew=-8` `mo.enter=slashIn`

  </details>

**样例内容**：城市足球联赛（`sports#football`）、电竞经理（`sports#esports`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 缺体育内容包——cnt.pack 增加 sports（队名、比分、球员、阵型、积分表）
- lay.arrangement 的 pitch / track 取值没有任何家族或原则用到——本篇的阵型图 demo 与 fam.broadcast 家族用它；探索台补一个阵型模板（tpl.formation）

</details>

**最相关的原则**（按针对性排序）：[P-scoreboard-team-id](#p-scoreboard-team-id)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-in-game-charts](#p-in-game-charts)、[P-medium-simulation](#p-medium-simulation)、[P-glance-encoding](#p-glance-encoding)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

**待补参考（R5）**：Rocket League、Football Manager

### 3.21 MOBA 与大逃杀

参考卡 0 张 · 探索台内容包：arena（星核联赛）、shooter（轨道封锁）

MOBA 把 HUD 做成一个底座：左下小地图、底部中央技能台、头像与装备栏连成一条，队伍状态在顶部（layout.moba 预设）。大逃杀则是射击 HUD 加三件事：缩圈计时与安全区、小队状态、存活人数。两者都是高竞争品类（P-know-your-game-competition），信息必须无歧义、一眼可读，队色与标记是第一层级。

**子类**：MOBA（Dota 2、League of Legends 一类）；大逃杀（射击类）；派对淘汰赛（Stumble Guys）；手游 MOBA / 竞技场

**证据说明**：库里没有这个品类的卡（genre 字段不含它）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：Overwatch（iig:overwatch）、Stumble Guys（steam:1677740，标 racing）、爆裂小队（gameui:13024，只看结算）。

**一眼要知道什么**

1. 技能和装备是否就绪、冷却还剩多少。
2. 队友在哪、血量多少、谁需要帮助。
3. 敌人消失了吗、从哪来（小地图信号）。
4. 大逃杀：安全区在哪、多久缩圈、还剩几人。
5. 局势：比分、经济差、塔 / 目标的状态。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| MOBA 底座：底部中央技能台 + 头像 + 装备，左下小地图，顶部双方英雄头像排与比分 | 待补参考（Dota 2）；探索台 layout.moba 预设即此版式 | — | 界面类型 = 局内 HUD；HUD 组织方式 = 整合底座；同屏玩家与视口 = 线上队伍（队友栏 + 记分）；语义颜色编码 = 阵营色；信息元素集合 = 小地图 / 罗盘 + 技能 / 冷却 / 弹药 / 手牌 + 生命 / 护盾 / 体力 + 队伍 / 玩家条 + 计时 / 分数 / 回合；小地图 / 罗盘 · 屏幕锚点 = 左下；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中 |
| 大逃杀：射击四角 + 顶部缩圈计时与存活人数 + 左下小队状态 | 待补参考；派对淘汰赛 Stumble Guys（steam:1677740）右上晋级人数 0/8 | Stumble Guys（steam:1677740） | 界面类型 = 局内 HUD；同屏玩家与视口 = 线上队伍（队友栏 + 记分）；信息元素集合 = 生命 / 护盾 / 体力 + 队伍 / 玩家条 + 小地图 / 罗盘 + 计时 / 分数 / 回合 + 通知 / 大字提示；计时 / 分数 / 回合：画法 = 回合徽章；计时 / 分数 / 回合 · 屏幕锚点 = 上中；队伍 / 玩家条：画法 = 头像框 + 小血条；队伍 / 玩家条 · 屏幕锚点 = 左下 |
| 英雄射击：左下头像 + 分段血块，下中大招圆环，右下技能 | Overwatch（iig:overwatch，标在 shooter） | Overwatch（iig:overwatch） | 数值图形（生命 / 护盾 / 体力） = 分段格；生命 / 护盾 / 体力 · 屏幕锚点 = 左下；技能 / 冷却 / 弹药 / 手牌：画法 = 大招充能；技能 / 冷却 / 弹药 / 手牌 · 屏幕锚点 = 下中 |

**关键元素与画法**

- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：slots / ultimate；常见位置 bc。技能台是 MOBA 的主操作区：冷却扇形 + 剩余秒数、法力不足变暗、快捷键角标。
- **小地图 / 罗盘**（`el.minimap`）：plan；常见位置 bl、br。小地图是第二视野：队友、可见敌人、信号（危险 / 集合）、视野范围。
- **队伍 / 玩家条**（`el.party`）：portraits / frames；常见位置 tc、bl。队友头像排（血量、大招就绪、阵亡倒计时）；大逃杀的小队状态在左下。
- **计时 / 分数 / 回合**（`el.timer`）：badge / scorePill；常见位置 tc。比分与时间（MOBA）、缩圈计时与存活人数（大逃杀）。
- **敌人血条 / 预警 / 意图**（`el.threat`）：healthBar / edgeDir；常见位置 center。单位头顶血条按阵营着色并有外形区分；屏外威胁从边缘提示。
- **通知 / 大字提示**（`el.notify`）：feed / banner；常见位置 tr、tc。击杀流在右上滚动；推塔、大龙、缩圈用顶部横幅（P-event-feed-tiers）。

**重要界面**

- **选英雄 / 禁用**：双方各一列头像，英雄池网格居中，倒计时醒目；队友的选择实时可见。 例：Esports Godfather（steam:1278540）。
- **计分板**：按住才出：击杀 / 死亡 / 助攻、装备、经济（P-scoreboard-team-id）。
- **结算**：胜负大字 + 每人数据表 + 个人表现评级；「再来一局」默认焦点。 例：爆裂小队SquadBusters（gameui:13024）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 科幻 HUD（`fam.scifi`）（0 张）：科幻 HUD：英雄射击与科幻 MOBA 的切角面板与发光冷却。
- 暗金金属牌（`fam.dark-gold`）（0 张）：暗金金属牌：奇幻 MOBA 的技能台与装备栏常用金属边框——待补参考（Dota 2）。
- 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`）（0 张）：电竞转播包装：观战与赛事模式。
- 糖果卡通（Q 版）（`fam.candy`）（0 张）：糖果卡通：派对淘汰赛与手游竞技场（Stumble Guys、爆裂小队）。

**代表作**

- Overwatch（iig:overwatch）〔电视转播包装（体育 / 电竞 / 综艺）〕：Overwatch：英雄射击的完整一套——左下头像 + 分段血块、下中大招圆环、右下技能；一种倾斜大写字体和一套阵营色管住了十几个元素。
- Stumble Guys（steam:1677740）〔糖果卡通（Q 版）〕：Stumble Guys：派对淘汰赛，左上红底目标条、右上晋级人数 0/8，触屏版左下摇杆 + 右下跳跃大键。
- 爆裂小队SquadBusters（gameui:13024）〔糖果卡通（Q 版）〕：爆裂小队 SquadBusters：结算是第一名大数字 + 排名行（只看结算与大厅骨架，商城不研究）。

**坑**

- 阵营色默认红 / 绿（layout.moba 预设就是 greenRed），色弱玩家分不出敌我。
  - 评价与证据（依据：推断）：无计数；C-teams-cvd 约束会警告，见 P-scoreboard-team-id。
- 团战时技能特效、伤害数字、击杀流叠成一团，看不清敌人的关键技能。
  - 评价与证据（依据：文献）：无可靠评测计数；Riot「Clarity in League」把这一点列为最主要的可读性问题（S053）。
- 缩圈计时与安全区方向只在小地图上，玩家要低头看。
  - 评价与证据（依据：推断）：无计数；待补参考。
- 技能冷却只靠变暗，没有剩余秒数或扇形。
  - 评价与证据（依据：推断）：无计数；P-glance-encoding。

**可演示的对比**

- **四角分散 vs 底部底座（MOBA）**（单变量对照；内容包：arena · 星核联赛；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：HUD 组织方式：分散组件 → 整合底座
  - 看什么：同样的元素：A 四散在四角，视线要在战场与四个角落之间来回；B 收成底部一条底座，技能、头像、小地图连成一片，战场中央完全留空。注意队色用了橙蓝而不是预设的红绿。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobaBr#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=arena` `cnt.screen=screen.hud` `ctx.players=team` `col.coding=team` `col.teams=orangeBlue` `cnt.elements=el.minimap+el.abilities+el.vitals+el.party+el.timer`
  - A：`lay.hudOrg=scattered`
  - B：`lay.hudOrg=console`

  </details>
- **大逃杀：缩圈计时是小字 vs 顶部醒目徽章 + 小队状态**（单变量对照；内容包：shooter · 轨道封锁；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：计时 / 分数 / 回合：画法：小字倒计时 → 回合徽章；计时 / 分数 / 回合 · 信息优先级：次 → 主；队伍 / 玩家条：画法：名牌 → 头像框 + 小血条
  - 看什么：A 的缩圈计时是一行小字、队友只有名字；B 的计时是顶部徽章、到最后 30 秒升为主信息，队友各有血条。大逃杀里「还剩多久缩圈」决定下一步往哪走。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mobaBr#d1` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=shooter` `cnt.screen=screen.hud` `ctx.players=team` `cnt.elements=el.vitals+el.party+el.minimap+el.timer+el.crosshair` `el.timer.screenAnchor=tc`
  - A：`el.timer.form=smallText` `el.party.form=tag` `el.timer.priority=secondary`
  - B：`el.timer.form=badge` `el.party.form=frames` `el.timer.priority=primary`

  </details>

**样例内容**：三路对战（`moba#lanes`）、大逃杀小队（`moba#royale`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 缺 MOBA 内容包——cnt.pack 增加 moba（或给 arena 加大逃杀变体）
- 缺安全区 / 缩圈元素——el.timer 增加 zone 形态，或新增 el.zone（小地图圆圈 + 方向箭头 + 倒计时）

</details>

**最相关的原则**（按针对性排序）：[P-scoreboard-team-id](#p-scoreboard-team-id)、[P-contextual-ping](#p-contextual-ping)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-priority-tiers](#p-priority-tiers)、[P-glance-encoding](#p-glance-encoding)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

**待补参考（R5）**：Dota 2

### 3.22 模拟驾驶与飞行

参考卡 0 张 · 探索台内容包：racing（午夜山道）

模拟驾驶、飞行、太空模拟的界面大多是座舱本身：仪表盘、俯仰梯、雷达、多功能显示屏都在叙事内（ast.container = cockpit），屏幕叠加只留给系统菜单与辅助线。难点是座舱仪表的可读性（光照、视角、分辨率）和信息过载——真实飞机有上百个读数，游戏要挑出一眼必须看的那几个。

**子类**：飞行模拟（Microsoft Flight Simulator）；太空模拟（Elite Dangerous）；载具 / 卡车模拟；太空作业（Hardspace: Shipbreaker 的头盔 HUD）；潜艇 / 机甲座舱（Subnautica 的潜艇驾驶舱）

**证据说明**：库里没有这个品类的卡（genre 字段不含它）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：Hardspace: Shipbreaker（steam:1161580，标 sandbox）、Starfield（steam:1716740，标 explore）、Subnautica（steam:264710）。

**一眼要知道什么**

1. 我现在的姿态、速度、高度（飞行）或速度、档位、转速（驾驶）。
2. 目标 / 航点在哪个方向、多远。
3. 燃料、能量、护盾、损伤还剩多少。
4. 周围有什么（雷达、交通、敌我）。
5. 自动驾驶 / 辅助现在开着哪些。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| 座舱仪表：读数在仪表盘与多功能屏上，画面中央留给窗外 | Starfield（steam:1716740）商店图里唯一的 UI 就是座舱仪表屏；Subnautica 潜艇驾驶舱也是叙事内 | Starfield（steam:1716740）、Subnautica（steam:264710） | 界面类型 = 局内 HUD；默认放置方式 = 叙事内；场景容器 = 座舱 / 车内；信息元素集合 = 速度 / 名次 + 世界 / 社会态势条 + 小地图 / 罗盘 |
| 头盔 / 面罩 HUD：弧形读数沿视野边缘 | Hardspace: Shipbreaker（steam:1161580）面罩边缘的弧形读数 | Hardspace: Shipbreaker（steam:1161580） | 默认放置方式 = 叙事内；HUD 组织方式 = 画在玩法区外的边框里；数值图形（世界 / 社会态势条） = 弧形 |
| 平视显示器（HUD 的本义）：俯仰梯、速度带、高度带叠在窗外景物上 | 待补参考（飞行模拟、Elite Dangerous） | — | 默认放置方式 = 空间内；骨架色彩策略 = 单色；描边线型 = 实线；底不透明度 = 0 |

**关键元素与画法**

- **速度 / 名次**（`el.speed`）：dial / number；常见位置 bc、br。速度与转速：表盘读区间、数字读精确值；飞行用速度带（竖条刻度）。
- **世界 / 社会态势条**（`el.meter`）：stack / withIcon；常见位置 bl、br。燃料、能量分配、护盾、损伤并排比较（P-in-game-charts 的对比条）。
- **小地图 / 罗盘**（`el.minimap`）：radar；常见位置 bc。雷达：三维空间压成二维时要表达高度差（上下标记）。
- **目标 / 路点**（`el.objective`）：marker / edgeArrow；常见位置 center。航点挂在窗外目标上，带距离；屏外时从边缘指回。
- **信息叠层 / 图例**（`el.overlay`）：arrows；常见位置 center。俯仰梯与飞行路径矢量：叠在窗外，单色细线。

**重要界面**

- **星图 / 航线规划**：三维星图或二维航图，航点连线、燃料与距离预算当场计算（P-actionable-first）。
- **载具配置 / 能量分配**：分配点数用分段条，改动即时预览性能差值（P-item-decision）。
- **检查清单 / 教学**：真实流程（起飞前检查）拆成一步一个动作的提示条（P-teach-then-retire）。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 工业硬科幻 / NASA 朋克（`fam.industrial-scifi`）（0 张）：工业硬科幻 / NASA 朋克：座舱、标签、警示条纹——待补参考。
- 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`）（0 张）：叙事内设备：头盔、腕表、手持终端（Hardspace: Shipbreaker）。
- 卡带未来主义 / 模拟控制台（`fam.cassette-futurism`）（0 张）：卡带未来主义 / 模拟控制台：实体按钮与绿色单色屏——待补参考。
- 军事战术（`fam.military`）（0 张）：军事战术：单色平视显示器与等宽读数。

**代表作**

- Hardspace: Shipbreaker（steam:1161580）〔科幻 HUD〕：Hardspace: Shipbreaker：头盔内 HUD，面罩边缘的弧形读数（叙事内），扫描模式整屏绿线框。
- Starfield（steam:1716740）〔科幻 HUD〕：Starfield：座舱仪表屏（叙事内）；它在评测里菜单难用 4 条、引导 3 条，系统界面与座舱是两套语言。

**坑**

- 座舱仪表受场景光照与视角影响，夜间或逆光时读不出。
  - 评价与证据（依据：推断）：无计数；P-world-legibility-guard（自发光、固定亮度）。
- 把真实座舱的全部读数照搬，玩家找不到最重要的三个。
  - 评价与证据（依据：推断）：无计数；P-priority-tiers。
- 雷达把三维压成二维却不标高度差，目标看似重合。
  - 评价与证据（依据：推断）：无计数；待补参考。
- 平视显示器的细线在亮天空或云上消失。
  - 评价与证据（依据：推断）：无计数；P-text-over-live-scene。

**可演示的对比**

- **屏幕叠加仪表 vs 座舱内仪表**（单变量对照；内容包：racing · 午夜山道；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：默认放置方式：屏幕叠加 → 叙事内；场景容器：无 → 座舱 / 车内
  - 看什么：A 把速度、能量、雷达贴在屏幕四角；B 把它们收进座舱仪表盘。比较两边窗外视野的完整度，再打开视距预览看 B 的仪表字号是否还够大。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-vehicleSim#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=racing` `cnt.screen=screen.hud` `cnt.elements=el.speed+el.meter+el.minimap+el.objective`
  - A：`rel.diegesis=screen` `ast.container=none`
  - B：`rel.diegesis=diegetic` `ast.container=cockpit`

  </details>

**样例内容**：民航飞行（`sim#airliner`）、太空货运（`sim#space`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 缺飞行 / 太空内容包——cnt.pack 增加 flightSim
- 缺俯仰梯 / 速度带 / 高度带等平视显示器元素——新增 el.hudFlight（ladder / tape）

</details>

**最相关的原则**（按针对性排序）：[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-device-bridge](#p-device-bridge)、[P-priority-tiers](#p-priority-tiers)、[P-vr-spatial-ui](#p-vr-spatial-ui)、[P-in-game-charts](#p-in-game-charts)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

**待补参考（R5）**：Elite Dangerous、Microsoft Flight Simulator

### 3.23 MMO

参考卡 4 张 · 探索台内容包：rpg（长风剑歌）

MMO 的 HUD 是参考库里密度最高的一类之一（密度 4）：多排技能栏、可拖动窗口、团队框体、聊天、任务追踪、小地图同时在场（World Of Warcraft 是模板）。关键是「可定制」——团队框体的位置、技能栏的排数、聊天的展开都交给玩家；默认布局要给新手一个能用的起点。

**子类**：PC 端 MMO（World Of Warcraft）；手游 MMO（天涯明月刀、三界天骄）；合作刷宝 / 共享世界

**证据说明**：uiRefs.json 的 genre 字段里没有这个品类；17 号图谱把 4 张卡的子类记为它（天涯明月刀、三界天骄、World Of Warcraft、Trove）。下面的版式与元素来自跨品类卡与通行惯例，标「待补参考」的结论要等 R5 补卡后看图复核。借用：World Of Warcraft（iig:world-of-warcraft，标 rpg）、天涯明月刀（gameui:12771）、三界天骄（gameui:6729）。

**一眼要知道什么**

1. 我和目标的血量、法力、施法进度。
2. 团队里谁掉血了、谁有减益（治疗者的核心问题）。
3. 技能冷却与资源。
4. 任务追踪：下一步去哪、做什么。
5. 聊天与系统消息：有没有人在叫我。

**HUD 组织**

| 版式 | 参考库里的占比 / 样本 | 代表作 | 关键参数 |
|---|---|---|---|
| PC MMO 模板：左上自己 + 目标框，底部多排技能栏，左侧团队框体，右上小地图 + 任务追踪，左下聊天 | World Of Warcraft（iig:world-of-warcraft，标在 rpg）：多排技能栏、可拖动窗口 | World Of Warcraft（iig:world-of-warcraft） | 界面类型 = 局内 HUD；同屏玩家与视口 = 四人派对；信息密度 = 极密；信息元素集合 = 生命 / 护盾 / 体力 + 敌人血条 / 预警 / 意图 + 技能 / 冷却 / 弹药 / 手牌 + 队伍 / 玩家条 + 小地图 / 罗盘 + 目标 / 路点 + 聊天；敌人血条 / 预警 / 意图：画法 = 目标头像框；技能 / 冷却 / 弹药 / 手牌：画法 = 物品快捷栏；队伍 / 玩家条：画法 = 头像框 + 小血条；聊天：画法 = 频道文本行；容器 = 可拖动窗口 |
| 手游 MMO 横屏：右下大攻击键 + 技能弧，左侧任务，顶部入口排，左下聊天 | 天涯明月刀（gameui:12771）、三界天骄（gameui:6729）；顶部活动入口属于商业化层，不研究 | 天涯明月刀（gameui:12771）、三界天骄（gameui:6729） | 输入方式 = 触屏；触屏按钮布局 = 大键 + 弧形环绕；聊天：画法 = 折叠框；聊天 · 屏幕锚点 = 左下；目标 / 路点 · 屏幕锚点 = 左中 |

**关键元素与画法**

- **队伍 / 玩家条**（`el.party`）：frames；常见位置 ml、bc。团队框体：每人一格血条 + 减益图标 + 职责标记；治疗者需要把它挪到视线附近（可拖动）。
- **技能 / 冷却 / 弹药 / 手牌**（`el.abilities`）：hotbar；常见位置 bc。多排技能栏，快捷键角标；冷却扇形 + 秒数。
- **聊天**（`el.chat`）：lines / collapsed；常见位置 bl。聊天分频道页签，系统消息与玩家消息分色分前缀；默认折叠或半透明。
- **目标 / 路点**（`el.objective`）：checklist；常见位置 mr。任务追踪只显示当前追踪的几条，完整日志在任务书里（P-journal-codex）。
- **敌人血条 / 预警 / 意图**（`el.threat`）：targetFrame / healthBar；常见位置 tc、tl。目标框与目标的目标（仇恨对象），Boss 的施法条。

**重要界面**

- **任务日志**：World Of Warcraft 的羊皮纸书页：清单 + 叙述文本，HUD 只追踪少数几条。 例：World Of Warcraft（iig:world-of-warcraft）。
- **界面编辑模式**：拖动、缩放、开关每个 HUD 组件，存成配置——MMO 是「自定义布局」最成熟的品类（P-adaptive-layers）。
- **组队 / 团队管理（非商业化部分）**：职责分配、成员状态、准备确认；好友邀请奖励等运营功能不研究。

**风格倾向**（17 号图谱的家族；数字是本品类主归属卡数）

- 暗金金属牌（`fam.dark-gold`）（2 张）：暗金金属牌：奇幻 MMO 的技能栏与框体（World Of Warcraft 一路）。
- 暗色细线（`fam.dark-hairline`）（1 张）：暗色细线：现代 MMO 与共享世界作品的克制框体。
- 糖果卡通（Q 版）（`fam.candy`）（1 张）：糖果卡通（Q 版）：本品类卡 Trove（见 17 号图谱该家族）。
- 羊皮纸任务书（`fam.parchment`）（0 张）：羊皮纸任务书：任务日志与地图。
- 国风水墨 / 墨笔（`fam.ink`）（0 张）：国风水墨：国产 MMO（天涯明月刀、三界天骄）的标题与面板。

**代表作**

- World Of Warcraft（iig:world-of-warcraft）〔暗金金属牌〕：World Of Warcraft：MMO 模板——多排技能栏、可拖动窗口、羊皮纸书页任务日志。
- 天涯明月刀（gameui:12771）〔暗色细线〕：天涯明月刀：横屏手游 MMO，左侧任务清单、右下大攻击键 + 技能弧（标注键位字母供手柄 / 键鼠）。

**坑**

- 四边全满：技能栏、团队框体、聊天、任务、入口排把战场挤到中间一小块。 例：天涯明月刀（gameui:12771）、三界天骄（gameui:6729）。
  - 评价与证据（依据：截图）：看图：两款横屏手游 MMO 的四边都被占满（见手机触屏篇坑 1）。
- 团队框体只靠颜色表示减益类型，治疗者分不出。
  - 评价与证据（依据：推断）：无计数；P-color-never-alone。
- 布局不能改，或改了不能保存。
  - 评价与证据（依据：推断）：无计数；P-adaptive-layers。
- 聊天常驻展开、滚动刷屏，盖住左下的战斗信息。
  - 评价与证据（依据：推断）：无计数；P-event-feed-tiers。

**可演示的对比**

- **聊天常驻展开 + 信息墙 vs 聊天折叠 + 降一档密度**（单变量对照；内容包：rpg · 长风剑歌；基线皮肤：灰盒（中性基线））
  - 承载原则的参数：聊天：画法：频道文本行 → 折叠框；信息密度：极密 → 密集
  - 看什么：A 的聊天常驻展开、每个组件都满载；B 聊天收成一行、组件降一档密度。两边的团队框体位置一样——再试着把它挪到画面中央偏下，看治疗者视角下哪种布局更顺手。
  <details><summary>完整参数向量（id = 取值）</summary>

  - id：`G-mmo#d0` · 皮肤 `skin.greybox`
  - base（两侧共用）：`cnt.pack=rpg` `cnt.screen=screen.hud` `ctx.players=party4` `cnt.elements=el.vitals+el.abilities+el.party+el.chat+el.minimap+el.objective+el.threat` `el.party.form=frames` `el.chat.screenAnchor=bl`
  - A：`cnt.density=4` `el.chat.form=lines`
  - B：`cnt.density=3` `el.chat.form=collapsed`

  </details>

**样例内容**：团队副本（`mmo#raid`）、武侠大世界（`mmo#wuxia`）。字段已统一成和 `src/hud/content/types.ts` 对齐的结构（resources / items / objectives / dialogue / notify / prompts / places / units，见 JSON 的 `contentPack`），可直接生成新的内容包或包内变体。

<details><summary>参数缺口（2 项）</summary>

- 缺团队框体的减益图标与职责标记——el.party 增加 debuffs / role 子参数
- 缺「界面编辑模式」——cnt.subtype 增加 hudEdit；Godot 导出为可拖动的 Control 布局存档

</details>

**最相关的原则**（按针对性排序）：[P-adaptive-layers](#p-adaptive-layers)、[P-density-tempo](#p-density-tempo)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-journal-codex](#p-journal-codex)、[P-color-never-alone](#p-color-never-alone)、[P-progressive-disclosure](#p-progressive-disclosure)；另有通用原则：[P-squint-test](#p-squint-test)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-settings-page](#p-settings-page)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable)、[P-teach-then-retire](#p-teach-then-retire)、[P-frontend-loading](#p-frontend-loading)、[P-localization-ready](#p-localization-ready)、[P-icon-system](#p-icon-system)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)

## 四、风格家族与原则

风格家族以 17 号图谱为准，这里只给「家族 → 最相关的原则」的反查（来自每条原则的 styleVariants），方便从风格出发找原则；家族定义、语法、搭配、失败模式请看 [17 号图谱](17-ui-style-atlas.md)。图谱自己在每个家族下也列了相关原则（JSON 的 `relatedPrinciples`），两份互相补充。

| 门类 | 家族 | 本文的原则（styleVariants 反查） | 图谱列出的相关原则 |
|---|---|---|---|
| 暗色、金属与雕饰 | 暗色细线（`fam.dark-hairline`） | [P-priority-tiers](#p-priority-tiers)、[P-glance-encoding](#p-glance-encoding)、[P-actionable-first](#p-actionable-first)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-juice-budget](#p-juice-budget)、[P-hit-channel-split](#p-hit-channel-split) 等 23 条 | [P-neutral-one-voice](#p-neutral-one-voice)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 暗色、金属与雕饰 | 暗金金属牌（`fam.dark-gold`） | [P-detail-without-hover](#p-detail-without-hover)、[P-density-tempo](#p-density-tempo)、[P-adaptive-layers](#p-adaptive-layers)、[P-event-feed-tiers](#p-event-feed-tiers) | [P-material-from-world](#p-material-from-world)、[P-motif-from-world](#p-motif-from-world)、[P-squint-test](#p-squint-test) |
| 暗色、金属与雕饰 | 重装饰雕花框（`fam.ornate-frame`） | [P-squint-test](#p-squint-test)、[P-fail-retry](#p-fail-retry)、[P-confirm-by-input](#p-confirm-by-input)、[P-dwell-time-budget](#p-dwell-time-budget) | [P-dwell-time-budget](#p-dwell-time-budget)、[P-material-from-world](#p-material-from-world)、[P-medium-constraints](#p-medium-constraints) |
| 暗色、金属与雕饰 | 线描花饰（`fam.filigree`） | [P-channel-borrowing](#p-channel-borrowing) | [P-text-over-live-scene](#p-text-over-live-scene)、[P-type-two-tier](#p-type-two-tier)、[P-channel-borrowing](#p-channel-borrowing) |
| 暗色、金属与雕饰 | 装饰艺术（`fam.art-deco`） | [P-type-two-tier](#p-type-two-tier)、[P-motif-from-world](#p-motif-from-world) | [P-type-two-tier](#p-type-two-tier)、[P-motif-from-world](#p-motif-from-world)、[P-title-lettering](#p-title-lettering) |
| 暗色、金属与雕饰 | 拟物（`fam.skeuo`） | — | [P-material-from-world](#p-material-from-world)、[P-dwell-time-budget](#p-dwell-time-budget)、[P-text-over-live-scene](#p-text-over-live-scene) |
| 友好、卡通与甜系 | 糖果卡通（Q 版）（`fam.candy`） | [P-priority-tiers](#p-priority-tiers)、[P-glance-encoding](#p-glance-encoding)、[P-squint-test](#p-squint-test)、[P-juice-budget](#p-juice-budget)、[P-value-change-visible](#p-value-change-visible)、[P-audio-haptic-pairing](#p-audio-haptic-pairing) 等 15 条 | [P-glance-encoding](#p-glance-encoding)、[P-juice-budget](#p-juice-budget)、[P-squint-test](#p-squint-test) |
| 友好、卡通与甜系 | 圆润友好（`fam.cozy`） | [P-build-placement](#p-build-placement)、[P-portrait-one-hand](#p-portrait-one-hand)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-a11y-presets-discoverable](#p-a11y-presets-discoverable) | [P-density-tempo](#p-density-tempo)、[P-contextual-hud](#p-contextual-hud)、[P-palette-roles](#p-palette-roles) |
| 友好、卡通与甜系 | 像素木框（`fam.pixel-wood`） | [P-inventory-capacity-model](#p-inventory-capacity-model)、[P-save-continuity](#p-save-continuity) | [P-medium-constraints](#p-medium-constraints)、[P-material-from-world](#p-material-from-world)、[P-inventory-capacity-model](#p-inventory-capacity-model) |
| 友好、卡通与甜系 | 孟菲斯（`fam.memphis`） | — | [P-dwell-time-budget](#p-dwell-time-budget)、[P-squint-test](#p-squint-test)、[P-title-lettering](#p-title-lettering) |
| 友好、卡通与甜系 | Frutiger Aero（`fam.aero`） | — | [P-motion-personality](#p-motion-personality)、[P-palette-roles](#p-palette-roles)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 友好、卡通与甜系 | 少女漫画 / 甜系闪光（`fam.shoujo`） | — | [P-type-two-tier](#p-type-two-tier)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-motif-from-world](#p-motif-from-world) |
| 纸、印刷与手作 | 手绘笔记本（`fam.notebook`） | [P-inventory-capacity-model](#p-inventory-capacity-model)、[P-journal-codex](#p-journal-codex)、[P-teach-then-retire](#p-teach-then-retire)、[P-craft-recipe](#p-craft-recipe) | [P-journal-codex](#p-journal-codex)、[P-type-two-tier](#p-type-two-tier)、[P-hudless-tax](#p-hudless-tax) |
| 纸、印刷与手作 | 羊皮纸任务书（`fam.parchment`） | [P-pause-world-state](#p-pause-world-state)、[P-transition-frequency](#p-transition-frequency)、[P-save-continuity](#p-save-continuity)、[P-craft-recipe](#p-craft-recipe)、[P-harmony-four-relations](#p-harmony-four-relations)、[P-material-from-world](#p-material-from-world) | [P-text-over-live-scene](#p-text-over-live-scene)、[P-journal-codex](#p-journal-codex)、[P-material-from-world](#p-material-from-world) |
| 纸、印刷与手作 | 印刷手册 / 数据表（`fam.printed-manual`） | [P-journal-codex](#p-journal-codex)、[P-teach-then-retire](#p-teach-then-retire)、[P-in-game-charts](#p-in-game-charts) | [P-journal-codex](#p-journal-codex)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-medium-simulation](#p-medium-simulation) |
| 纸、印刷与手作 | 版画：木刻 / 铜版 / 双色套印（`fam.woodcut-print`） | [P-channel-borrowing](#p-channel-borrowing)、[P-medium-constraints](#p-medium-constraints) | [P-medium-constraints](#p-medium-constraints)、[P-title-lettering](#p-title-lettering)、[P-motif-from-world](#p-motif-from-world) |
| 纸、印刷与手作 | 手工实物材质（纸艺 / 毛毡 / 纸板 / 黏土）（`fam.handmade-craft`） | [P-radial-for-sticks](#p-radial-for-sticks)、[P-typography-legible-format](#p-typography-legible-format)、[P-material-from-world](#p-material-from-world) | [P-medium-constraints](#p-medium-constraints)、[P-material-from-world](#p-material-from-world)、[P-channel-borrowing](#p-channel-borrowing) |
| 纸、印刷与手作 | 绘本童话书 / 水彩（`fam.storybook`） | [P-world-legibility-guard](#p-world-legibility-guard) | [P-dialogue-presentation](#p-dialogue-presentation)、[P-type-two-tier](#p-type-two-tier)、[P-hudless-tax](#p-hudless-tax) |
| 东方 | 国风水墨 / 墨笔（`fam.ink`） | [P-meta-perception](#p-meta-perception)、[P-motion-personality](#p-motion-personality)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)、[P-progression-graph](#p-progression-graph)、[P-frontend-loading](#p-frontend-loading) 等 17 条 | [P-type-two-tier](#p-type-two-tier)、[P-motif-from-world](#p-motif-from-world)、[P-title-lettering](#p-title-lettering) |
| 东方 | 和风（`fam.wa`） | — | [P-contextual-hud](#p-contextual-hud)、[P-motif-from-world](#p-motif-from-world)、[P-type-two-tier](#p-type-two-tier) |
| 东方 | 仙侠·玉石流光（`fam.xianxia`） | — | [P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-juice-budget](#p-juice-budget) |
| 东方 | 器物纹样（青花 / 漆器 / 景泰蓝）（`fam.ceramic-lacquer`） | — | [P-material-from-world](#p-material-from-world)、[P-motif-from-world](#p-motif-from-world)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 东方 | 敦煌壁画 / 佛教彩绘（`fam.dunhuang`） | — | [P-motif-from-world](#p-motif-from-world)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-contrast-with-reason](#p-contrast-with-reason) |
| 东方 | 韩式丹青 / 民画（`fam.dancheong-minhwa`） | — | [P-motif-from-world](#p-motif-from-world)、[P-palette-roles](#p-palette-roles)、[P-title-lettering](#p-title-lettering) |
| 漫画、二次元与动势 | 二次元白卡细线（`fam.anime-card`） | [P-item-decision](#p-item-decision)、[P-portrait-one-hand](#p-portrait-one-hand) | [P-neutral-one-voice](#p-neutral-one-voice)、[P-palette-roles](#p-palette-roles)、[P-priority-tiers](#p-priority-tiers) |
| 漫画、二次元与动势 | Persona 拼贴（`fam.persona-collage`） | [P-damage-number-legibility](#p-damage-number-legibility)、[P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-result-tally](#p-result-tally)、[P-choice-framing](#p-choice-framing)、[P-frontend-loading](#p-frontend-loading) 等 10 条 | [P-motion-personality](#p-motion-personality)、[P-transition-frequency](#p-transition-frequency)、[P-title-lettering](#p-title-lettering) |
| 漫画、二次元与动势 | 倾斜动感（`fam.slant`） | [P-scoreboard-team-id](#p-scoreboard-team-id) | [P-motion-personality](#p-motion-personality)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-glance-encoding](#p-glance-encoding) |
| 漫画、二次元与动势 | 漫画对话框（`fam.comic`） | [P-juice-budget](#p-juice-budget)、[P-hit-channel-split](#p-hit-channel-split)、[P-shake-hitstop](#p-shake-hitstop)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-prompt-in-context](#p-prompt-in-context)、[P-subtitles-captions](#p-subtitles-captions) | [P-dialogue-presentation](#p-dialogue-presentation)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-medium-simulation](#p-medium-simulation) |
| 漫画、二次元与动势 | 街头涂鸦 / 贴纸滑板（`fam.graffiti`） | [P-title-lettering](#p-title-lettering) | [P-title-lettering](#p-title-lettering)、[P-squint-test](#p-squint-test)、[P-motif-from-world](#p-motif-from-world) |
| 科技与复古未来 | 科幻 HUD（`fam.scifi`） | [P-focal-periphery](#p-focal-periphery)、[P-progression-graph](#p-progression-graph)、[P-craft-recipe](#p-craft-recipe)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-typography-legible-format](#p-typography-legible-format)、[P-know-your-game-competition](#p-know-your-game-competition) 等 7 条 | [P-glance-encoding](#p-glance-encoding)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-device-bridge](#p-device-bridge) |
| 科技与复古未来 | 赛博朋克（霓虹都市 / 故障 / 企业界面）（`fam.cyberpunk`） | — | [P-contrast-with-reason](#p-contrast-with-reason)、[P-color-never-alone](#p-color-never-alone)、[P-motion-personality](#p-motion-personality) |
| 科技与复古未来 | 军事战术（`fam.military`） | [P-spatial-render-budget](#p-spatial-render-budget)、[P-result-tally](#p-result-tally)、[P-color-never-alone](#p-color-never-alone)、[P-palette-roles](#p-palette-roles)、[P-contextual-ping](#p-contextual-ping)、[P-event-feed-tiers](#p-event-feed-tiers) | [P-actionable-first](#p-actionable-first)、[P-color-never-alone](#p-color-never-alone)、[P-glance-encoding](#p-glance-encoding) |
| 科技与复古未来 | 全息空间（`fam.holo`） | [P-spatial-render-budget](#p-spatial-render-budget)、[P-pause-world-state](#p-pause-world-state)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-world-space-text](#p-world-space-text)、[P-map-conventions](#p-map-conventions)、[P-build-placement](#p-build-placement) 等 7 条 | [P-spatial-render-budget](#p-spatial-render-budget)、[P-world-legibility-guard](#p-world-legibility-guard)、[P-contextual-hud](#p-contextual-hud) |
| 科技与复古未来 | CRT 终端（`fam.crt`） | [P-meta-perception](#p-meta-perception)、[P-value-change-visible](#p-value-change-visible)、[P-transition-frequency](#p-transition-frequency)、[P-audio-haptic-pairing](#p-audio-haptic-pairing)、[P-flash-motion-comfort](#p-flash-motion-comfort) | [P-medium-simulation](#p-medium-simulation)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-typography-legible-format](#p-typography-legible-format) |
| 科技与复古未来 | 合成波 / 蒸汽波（`fam.synthwave`） | [P-vr-spatial-ui](#p-vr-spatial-ui)、[P-fail-retry](#p-fail-retry)、[P-color-never-alone](#p-color-never-alone)、[P-flash-motion-comfort](#p-flash-motion-comfort) | [P-follow-world-over-time](#p-follow-world-over-time)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-motion-personality](#p-motion-personality) |
| 科技与复古未来 | Y2K 镀铬（`fam.y2k`） | — | [P-motion-personality](#p-motion-personality)、[P-title-lettering](#p-title-lettering)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 科技与复古未来 | 细线几何（`fam.thin-geo`） | [P-world-space-text](#p-world-space-text)、[P-neutral-one-voice](#p-neutral-one-voice) | [P-glance-encoding](#p-glance-encoding)、[P-hudless-tax](#p-hudless-tax)、[P-view-distance](#p-view-distance) |
| 科技与复古未来 | 工业硬科幻 / NASA 朋克（`fam.industrial-scifi`） | — | [P-medium-simulation](#p-medium-simulation)、[P-color-never-alone](#p-color-never-alone)、[P-glance-encoding](#p-glance-encoding) |
| 科技与复古未来 | 卡带未来主义 / 模拟控制台（`fam.cassette-futurism`） | — | [P-medium-simulation](#p-medium-simulation)、[P-device-bridge](#p-device-bridge)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction) |
| 科技与复古未来 | 矢量显示器 / 霓虹线框（`fam.vector-display`） | — | [P-medium-constraints](#p-medium-constraints)、[P-glance-encoding](#p-glance-encoding)、[P-palette-roles](#p-palette-roles) |
| 科技与复古未来 | 原子朋克 / 50–60 年代美式广告（`fam.atompunk`） | — | [P-contrast-with-reason](#p-contrast-with-reason)、[P-title-lettering](#p-title-lettering)、[P-device-bridge](#p-device-bridge) |
| 科技与复古未来 | 哥特科技（战锤 40K 式）（`fam.gothic-tech`） | — | [P-material-from-world](#p-material-from-world)、[P-motif-from-world](#p-motif-from-world)、[P-type-two-tier](#p-type-two-tier) |
| 科技与复古未来 | 机甲警示 HUD（EVA / Armored Core 式）（`fam.mecha-warning`） | — | [P-event-callout-tiers](#p-event-callout-tiers)、[P-meta-perception](#p-meta-perception)、[P-priority-tiers](#p-priority-tiers) |
| 复古像素与系统控件 | 像素位图（`fam.pixel`） | [P-actionable-first](#p-actionable-first)、[P-hit-channel-split](#p-hit-channel-split)、[P-damage-number-legibility](#p-damage-number-legibility)、[P-item-decision](#p-item-decision)、[P-fail-retry](#p-fail-retry)、[P-glyph-follows-device](#p-glyph-follows-device) 等 12 条 | [P-medium-constraints](#p-medium-constraints)、[P-text-size-floor](#p-text-size-floor)、[P-glance-encoding](#p-glance-encoding) |
| 复古像素与系统控件 | JRPG 窗口（`fam.jrpg`） | [P-menu-architecture](#p-menu-architecture)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-input-parity](#p-input-parity) | [P-menu-architecture](#p-menu-architecture)、[P-focus-unmistakable](#p-focus-unmistakable)、[P-dialogue-presentation](#p-dialogue-presentation) |
| 复古像素与系统控件 | 灰盒（中性基线）（`fam.greybox`） | [P-glyph-follows-device](#p-glyph-follows-device)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-motor-input-alternatives](#p-motor-input-alternatives) | [P-neutral-one-voice](#p-neutral-one-voice)、[P-text-size-floor](#p-text-size-floor)、[P-menu-architecture](#p-menu-architecture) |
| 复古像素与系统控件 | 复古桌面操作系统（`fam.retro-os`） | [P-device-bridge](#p-device-bridge)、[P-motion-personality](#p-motion-personality)、[P-menu-architecture](#p-menu-architecture)、[P-settings-page](#p-settings-page)、[P-save-continuity](#p-save-continuity)、[P-input-parity](#p-input-parity) 等 9 条 | [P-medium-simulation](#p-medium-simulation)、[P-input-parity](#p-input-parity)、[P-menu-architecture](#p-menu-architecture) |
| 复古像素与系统控件 | 终端字符格 / ASCII（`fam.terminal-grid`） | [P-settings-page](#p-settings-page) | [P-medium-constraints](#p-medium-constraints)、[P-color-never-alone](#p-color-never-alone)、[P-adaptive-layers](#p-adaptive-layers) |
| 复古像素与系统控件 | 1-bit 抖动 / 经典 Mac（`fam.one-bit-dither`） | [P-medium-constraints](#p-medium-constraints) | [P-medium-constraints](#p-medium-constraints)、[P-color-never-alone](#p-color-never-alone)、[P-palette-roles](#p-palette-roles) |
| 复古像素与系统控件 | 网页原生控件 / 后台面板（`fam.raw-web`） | — | [P-progressive-disclosure](#p-progressive-disclosure)、[P-value-change-visible](#p-value-change-visible)、[P-medium-simulation](#p-medium-simulation) |
| 复古像素与系统控件 | 90 年代 FPS 状态栏（`fam.boomer-bar`） | [P-aspect-anchor](#p-aspect-anchor) | [P-glance-encoding](#p-glance-encoding)、[P-medium-constraints](#p-medium-constraints)、[P-know-your-game-competition](#p-know-your-game-competition) |
| 复古像素与系统控件 | 点击冒险动词栏（`fam.scumm-verbs`） | — | [P-input-parity](#p-input-parity)、[P-radial-for-sticks](#p-radial-for-sticks)、[P-prompt-in-context](#p-prompt-in-context) |
| 现代平面设计 | 扁平 / Material（`fam.flat`） | [P-menu-architecture](#p-menu-architecture)、[P-settings-page](#p-settings-page)、[P-touch-target-size](#p-touch-target-size)、[P-view-distance](#p-view-distance)、[P-detail-without-hover](#p-detail-without-hover)、[P-confirm-by-input](#p-confirm-by-input) 等 8 条 | [P-neutral-one-voice](#p-neutral-one-voice)、[P-aspect-anchor](#p-aspect-anchor)、[P-palette-roles](#p-palette-roles) |
| 现代平面设计 | 模拟 / 策略工具面板（`fam.sim-panel`） | [P-in-game-charts](#p-in-game-charts)、[P-neutral-one-voice](#p-neutral-one-voice)、[P-density-tempo](#p-density-tempo) | [P-density-tempo](#p-density-tempo)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-actionable-first](#p-actionable-first) |
| 现代平面设计 | 瑞士几何 / 极简表格（`fam.swiss`） | [P-priority-tiers](#p-priority-tiers)、[P-in-game-charts](#p-in-game-charts)、[P-contrast-with-reason](#p-contrast-with-reason) | [P-typography-legible-format](#p-typography-legible-format)、[P-priority-tiers](#p-priority-tiers)、[P-neutral-one-voice](#p-neutral-one-voice) |
| 现代平面设计 | 新粗野主义（`fam.neobrutal`） | — | [P-focus-unmistakable](#p-focus-unmistakable)、[P-typography-legible-format](#p-typography-legible-format)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 现代平面设计 | 毛玻璃（`fam.glass`） | [P-text-over-live-scene](#p-text-over-live-scene) | [P-pause-world-state](#p-pause-world-state)、[P-text-over-live-scene](#p-text-over-live-scene)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor) |
| 现代平面设计 | 新拟态（`fam.neumorph`） | — | [P-high-contrast-and-recolor](#p-high-contrast-and-recolor)、[P-color-never-alone](#p-color-never-alone)、[P-confirm-by-input](#p-confirm-by-input) |
| 现代平面设计 | 构成主义（`fam.constructivist`） | — | [P-contrast-with-reason](#p-contrast-with-reason)、[P-title-lettering](#p-title-lettering)、[P-motif-from-world](#p-motif-from-world) |
| 现代平面设计 | 极简编辑 / 杂志排版（`fam.editorial`） | [P-typography-legible-format](#p-typography-legible-format) | [P-type-two-tier](#p-type-two-tier)、[P-title-lettering](#p-title-lettering)、[P-priority-tiers](#p-priority-tiers) |
| 现代平面设计 | 反设计 / 外行美学（`fam.outsider`） | — | [P-contrast-with-reason](#p-contrast-with-reason)、[P-typography-legible-format](#p-typography-legible-format)、[P-medium-simulation](#p-medium-simulation) |
| 极简与少画 UI | 零 HUD · 世界即界面（`fam.zero-hud`） | [P-glance-encoding](#p-glance-encoding)、[P-frontend-loading](#p-frontend-loading)、[P-subtitles-captions](#p-subtitles-captions)、[P-follow-world-over-time](#p-follow-world-over-time)、[P-density-tempo](#p-density-tempo)、[P-know-your-game-competition](#p-know-your-game-competition) 等 9 条 | [P-hudless-tax](#p-hudless-tax)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-adaptive-layers](#p-adaptive-layers) |
| 极简与少画 UI | 情境渐显 · 角落小件（`fam.contextual-hud`） | [P-focal-periphery](#p-focal-periphery)、[P-two-questions-per-element](#p-two-questions-per-element)、[P-prompt-in-context](#p-prompt-in-context)、[P-contextual-hud](#p-contextual-hud)、[P-adaptive-layers](#p-adaptive-layers) | [P-contextual-hud](#p-contextual-hud)、[P-adaptive-layers](#p-adaptive-layers)、[P-meta-perception](#p-meta-perception) |
| 极简与少画 UI | 细字直压 · 排印叠层（`fam.typographic-hud`） | [P-focal-periphery](#p-focal-periphery)、[P-world-space-text](#p-world-space-text)、[P-event-callout-tiers](#p-event-callout-tiers)、[P-text-over-live-scene](#p-text-over-live-scene) | [P-text-over-live-scene](#p-text-over-live-scene)、[P-typography-legible-format](#p-typography-legible-format)、[P-view-distance](#p-view-distance) |
| 极简与少画 UI | 空间排印 / 文字即世界（`fam.spatial-type`） | — | [P-world-legibility-guard](#p-world-legibility-guard)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-two-questions-per-element](#p-two-questions-per-element) |
| 极简与少画 UI | 单色线描 · 同一支笔（`fam.mono-line`） | [P-progression-graph](#p-progression-graph)、[P-text-size-floor](#p-text-size-floor)、[P-icon-system](#p-icon-system)、[P-hudless-tax](#p-hudless-tax) | [P-medium-constraints](#p-medium-constraints)、[P-color-never-alone](#p-color-never-alone)、[P-hudless-tax](#p-hudless-tax) |
| 极简与少画 UI | 扁平几何 · 地图即界面（`fam.flat-map`） | [P-squint-test](#p-squint-test)、[P-spatial-render-budget](#p-spatial-render-budget)、[P-map-conventions](#p-map-conventions)、[P-build-placement](#p-build-placement)、[P-color-never-alone](#p-color-never-alone)、[P-follow-world-over-time](#p-follow-world-over-time) | [P-color-never-alone](#p-color-never-alone)、[P-glance-encoding](#p-glance-encoding)、[P-map-conventions](#p-map-conventions) |
| 媒介模拟（界面假装是某种载体） | 镜头屏显：取景器 / 摄像机 / 监控（`fam.camera-osd`） | [P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-medium-simulation](#p-medium-simulation) | [P-medium-simulation](#p-medium-simulation)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-world-legibility-guard](#p-world-legibility-guard) |
| 媒介模拟（界面假装是某种载体） | 叙事内设备（腕戴 / 手持 / 头盔）（`fam.diegetic-device`） | [P-two-questions-per-element](#p-two-questions-per-element)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-device-bridge](#p-device-bridge)、[P-vr-spatial-ui](#p-vr-spatial-ui)、[P-hudless-tax](#p-hudless-tax) | [P-device-bridge](#p-device-bridge)、[P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-pause-world-state](#p-pause-world-state) |
| 媒介模拟（界面假装是某种载体） | 电视转播包装（体育 / 电竞 / 综艺）（`fam.broadcast`） | [P-event-callout-tiers](#p-event-callout-tiers)、[P-shared-screen](#p-shared-screen)、[P-medium-simulation](#p-medium-simulation)、[P-know-your-game-competition](#p-know-your-game-competition)、[P-event-feed-tiers](#p-event-feed-tiers)、[P-scoreboard-team-id](#p-scoreboard-team-id) | [P-event-callout-tiers](#p-event-callout-tiers)、[P-result-tally](#p-result-tally)、[P-color-never-alone](#p-color-never-alone) |
| 媒介模拟（界面假装是某种载体） | 电影宽银幕 / 片头字幕（`fam.cinematic-letterbox`） | [P-meta-perception](#p-meta-perception)、[P-subtitles-captions](#p-subtitles-captions) | [P-subtitles-captions](#p-subtitles-captions)、[P-transition-frequency](#p-transition-frequency)、[P-aspect-anchor](#p-aspect-anchor) |
| 媒介模拟（界面假装是某种载体） | 默片 / 1930 年代卡通（`fam.silent-film`） | [P-localization-ready](#p-localization-ready)、[P-type-two-tier](#p-type-two-tier)、[P-title-lettering](#p-title-lettering) | [P-flash-motion-comfort](#p-flash-motion-comfort)、[P-medium-simulation](#p-medium-simulation)、[P-title-lettering](#p-title-lettering) |
| 媒介模拟（界面假装是某种载体） | 元界面 / 故障破坏（`fam.meta-ui`） | [P-flash-motion-comfort](#p-flash-motion-comfort)、[P-contrast-with-reason](#p-contrast-with-reason) | [P-contrast-with-reason](#p-contrast-with-reason)、[P-flash-motion-comfort](#p-flash-motion-comfort)、[P-save-continuity](#p-save-continuity) |
| 媒介模拟（界面假装是某种载体） | 手机 / 聊天 App 仿真（`fam.phone-app`） | [P-device-bridge](#p-device-bridge) | [P-device-bridge](#p-device-bridge)、[P-dialogue-presentation](#p-dialogue-presentation)、[P-touch-target-size](#p-touch-target-size) |
| 媒介模拟（界面假装是某种载体） | 剧场舞台 / 木偶戏（`fam.theatre-stage`） | — | [P-transition-frequency](#p-transition-frequency)、[P-medium-simulation](#p-medium-simulation)、[P-dialogue-presentation](#p-dialogue-presentation) |
| 题材方言（叙事道具成为界面） | 黑色电影 / 侦探卷宗（`fam.noir-dossier`） | [P-journal-codex](#p-journal-codex) | [P-journal-codex](#p-journal-codex)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-color-never-alone](#p-color-never-alone) |
| 题材方言（叙事道具成为界面） | 案头文书 / 官僚表格（`fam.desk-paperwork`） | [P-result-tally](#p-result-tally) | [P-confirm-by-input](#p-confirm-by-input)、[P-medium-simulation](#p-medium-simulation)、[P-detail-without-hover](#p-detail-without-hover) |
| 题材方言（叙事道具成为界面） | 桌游实物：版图 / 棋子 / 骰子 / 算子（`fam.tabletop`） | [P-actionable-first](#p-actionable-first)、[P-shake-hitstop](#p-shake-hitstop)、[P-detail-without-hover](#p-detail-without-hover)、[P-shared-screen](#p-shared-screen)、[P-progressive-disclosure](#p-progressive-disclosure) | [P-actionable-first](#p-actionable-first)、[P-medium-simulation](#p-medium-simulation)、[P-shared-screen](#p-shared-screen) |
| 题材方言（叙事道具成为界面） | 神秘学：塔罗 / 星图 / 炼金（`fam.occult-tarot`） | [P-choice-framing](#p-choice-framing) | [P-motif-from-world](#p-motif-from-world)、[P-progressive-disclosure](#p-progressive-disclosure)、[P-title-lettering](#p-title-lettering) |
| 题材方言（叙事道具成为界面） | 制图学 / 古海图图例（`fam.cartographic`） | [P-diegetic-carrier-camera-fiction](#p-diegetic-carrier-camera-fiction)、[P-map-conventions](#p-map-conventions) | [P-map-conventions](#p-map-conventions)、[P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world) |
| 题材方言（叙事道具成为界面） | 文字小说栏 / 互动小说排版（`fam.if-column`） | [P-dialogue-presentation](#p-dialogue-presentation)、[P-choice-framing](#p-choice-framing) | [P-dialogue-presentation](#p-dialogue-presentation)、[P-choice-framing](#p-choice-framing)、[P-text-size-floor](#p-text-size-floor) |
| 题材方言（叙事道具成为界面） | 生存恐怖物品检视（`fam.survival-horror`） | [P-two-questions-per-element](#p-two-questions-per-element)、[P-pause-world-state](#p-pause-world-state)、[P-inventory-capacity-model](#p-inventory-capacity-model) | [P-inventory-capacity-model](#p-inventory-capacity-model)、[P-pause-world-state](#p-pause-world-state)、[P-meta-perception](#p-meta-perception) |
| 时代运动与地域纹样 | 新艺术 / 美好年代（`fam.art-nouveau`） | — | [P-motif-from-world](#p-motif-from-world)、[P-type-two-tier](#p-type-two-tier)、[P-dwell-time-budget](#p-dwell-time-budget) |
| 时代运动与地域纹样 | 北欧：结绳纹 / 符文石（`fam.norse-knotwork`） | [P-motif-from-world](#p-motif-from-world) | [P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-type-two-tier](#p-type-two-tier) |
| 时代运动与地域纹样 | 伊斯兰几何 / 波斯细密画（`fam.islamic-persian`） | — | [P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-title-lettering](#p-title-lettering) |
| 时代运动与地域纹样 | 中美洲 / 拉美民间（亡灵节、镂空彩纸、石刻）（`fam.latin-folk`） | — | [P-motif-from-world](#p-motif-from-world)、[P-title-lettering](#p-title-lettering)、[P-squint-test](#p-squint-test) |
| 时代运动与地域纹样 | 非洲纹样（Adinkra、Kente、泥布、Ndebele）（`fam.african-pattern`） | — | [P-motif-from-world](#p-motif-from-world)、[P-palette-roles](#p-palette-roles)、[P-contrast-with-reason](#p-contrast-with-reason) |
| 时代运动与地域纹样 | 南亚 / 东南亚（叙事画、皮影 wayang、蜡染 batik）（`fam.south-se-asian`） | — | [P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-follow-world-over-time](#p-follow-world-over-time) |
| 时代运动与地域纹样 | 大洋洲与原住民（点画、木雕、骨雕刻线）（`fam.oceania-indigenous`） | — | [P-motif-from-world](#p-motif-from-world)、[P-hudless-tax](#p-hudless-tax)、[P-contrast-with-reason](#p-contrast-with-reason) |
| 时代运动与地域纹样 | 东欧 / 斯拉夫民间（十字绣、彩绘木器、剪纸）（`fam.slavic-folk`） | [P-motif-from-world](#p-motif-from-world) | [P-motif-from-world](#p-motif-from-world)、[P-palette-roles](#p-palette-roles)、[P-title-lettering](#p-title-lettering) |
| 时代运动与地域纹样 | 古代文明：浮雕 / 纸莎草 / 陶绘（`fam.antiquity`） | — | [P-motif-from-world](#p-motif-from-world)、[P-material-from-world](#p-material-from-world)、[P-type-two-tier](#p-type-two-tier) |
| 时代运动与地域纹样 | 蒸汽朋克黄铜仪表（`fam.steampunk-brass`） | — | [P-glance-encoding](#p-glance-encoding)、[P-material-from-world](#p-material-from-world)、[P-medium-simulation](#p-medium-simulation) |
| 时代运动与地域纹样 | 彩色玻璃 / 镶嵌（`fam.stained-glass`） | — | [P-dwell-time-budget](#p-dwell-time-budget)、[P-motif-from-world](#p-motif-from-world)、[P-contrast-with-reason](#p-contrast-with-reason) |

## 五、证据与方法

### 5.1 评测重算

在本地缓存 qa/refs-cache/reviews/ 上重算（只存计数，不存原文）：① 每款游戏把英文与简中两份合并，正文完全相同且长度 > 20 字的评测只算一次（原缓存 74,932 条里有 6,243 条重复，去重后 68,689 条、335 款）；② 9 类抱怨沿用 scripts/refs/r3-reviews.py 的正则；③「字太小」收紧口径：只认明确说文字 / 字幕 / 字体 / 字号小的说法，「看不清」必须和字、文字、字幕、字体同时出现，再逐条人工复核；④「HUD 太乱」先要求命中词前后 30 字内有 HUD / UI / 界面 / 图标 / 菜单一类词、前面没有否定词，再对被引用的出处逐条人工复核，去掉否定句、好评与场景 / 特效类命中。「≥ 2 条」才算一款游戏是某类抱怨的出处。scripts/refs/r3-reviews.py 与 docs/survey/data/ui-review-stats.json 尚未按此更新（不在本次可改文件范围内），12 号文档与该 JSON 的数字偏高。

| 类别 | 去重后命中条数（去重前） | 至少 1 条的款数 | ≥ 2 条的款数 | 条数最多的几款 |
|---|---|---|---|---|
| 背包 / 物品管理难用 | 50（55） | 24 | 7 | Valheim 17、Resident Evil 5 4、No Man's Sky 3、Resident Evil 2 3、Abiotic Factor 2、The Elder Scrolls V: Skyrim Special Edition 2 |
| 菜单 / 界面难用 | 107（113） | 76 | 19 | Valheim 7、Starfield 4、No Man's Sky 3、Assassin's Creed Unity 3、Parkasaurus 3、Dyson Sphere Program 3 |
| 地图难用 / 没有地图 | 85（95） | 45 | 14 | Clair Obscur: Expedition 33 13、CONTROL 5、Chants of Sennaar 5、Hyper Light Drifter 4、Valheim 4、TOEM 4 |
| 提示 / 引导不清 | 155（178） | 86 | 41 | Scorn 7、Kingdom Two Crowns 7、ASTRONEER 4、Destiny 2 4、Subnautica 3、No Man's Sky 3 |
| 手柄 / 键位不好 | 25（30） | 20 | 3 | Assassin's Creed 2 3、Heavy Rain 3、FINAL FANTASY X/X-2 HD Remaster 2 |
| UI 缩放 / 分辨率 | 15（19） | 12 | 2 | BioShock Infinite 3、RollerCoaster Tycoon Classic 2 |
| UI 卡顿 / 响应慢 | 13（18） | 11 | 2 | Cyberpunk 2077 2、DEATHLOOP 2 |
| 字太小（逐条复核） | 10 | 8 | 1 | BioShock Infinite 3（字幕）、Sid Meier’s Civilization® VI 1（找不到放大字号）、METAL GEAR SOLID V 1（4K 下字小）、Absolute Drift 1（UI 文字太小）、ASTRONEER 1（UI 文字太小）、Disco Elysium 1（好评里提醒调大字号）、Dyson Sphere Program 1（UI 太小伤眼）、鬼谷八荒 Tale of Immortal 1（卷轴面板里的字太小） |
| HUD 太乱（逐条复核） | 9 | 9 | 0 | Songs of Syx 1、Stellaris 1、Kingdom Two Crowns 1、Planet Zoo 1、Assassin's Creed Unity 1、Potion Craft: Alchemist Simulator 1、Wandering Sword 1、GoreBox 1、Two Point Museum 1 |

- 字太小：原「字太小 / 看不清」去重后 48 条 / 38 款、9 款 ≥ 2 条；逐条复核后真正在说文字大小的只有 10 条 / 8 款。
- HUD 太乱：原「HUD 太乱 / 挡视野」去重后 82 条 / 53 款、16 款 ≥ 2 条；逐条复核后真正在说界面 / HUD / 地图呈现杂乱的只有 9 条、每款 1 条，没有一款达到门槛。Bloons TD 6、Tiny Glade、Ghost of Tsushima、Hades II、CONTROL、ELDEN RING 等原出处的命中是好评、否定句或场景 / 特效描述。
- 夸 UI 的评测（「界面简洁 / 清晰 / 好用」一类）去重后全库只有 47 条、39 款，单款最多 3 条——本文不再用「头部」「名单」描述 1–3 条的命中。

### 5.2 关键词计数表（去重后）

| 关键词组 | 正则（简写） | 命中条数（去重前） | 款数 | 其中好评 | 条数最多的几款 |
|---|---|---|---|---|---|
| 打击感 | `打击感` | 195（232） | 55 | 168 | God of War 17、Katana ZERO 15、Hades 12、Devil May Cry 5 10、Ori and the Will of the Wisps 10、STAR WARS Jedi: Survivor 8、Clair Obscur: Expedition 33 8、Batman: Arkham Knight 7 |
| 光敏 / 频闪 / 光污染 | `光污染｜光敏｜癫痫｜频闪｜flashing lights?｜epilep\w*｜photosensitiv\w*｜…` | 70（87） | 40 | 33 | CONTROL 9、FINAL FANTASY XVI 5、Just Shapes & Beats 4、Nodebuster 4、TUNIC 3、Ori and the Will of the Wisps 3、Sayonara Wild Hearts 3、Clair Obscur: Expedition 33 3 |
| 晕动 | `晕3[dD]｜晕眩｜头晕｜想吐｜motion[- ]?sick\w*｜\bnause\w*｜\bdizz\w*` | 204（245） | 97 | 144 | Stray 14、Portal 2 8、Return of the Obra Dinn 8、BioShock Infinite 6、Firewatch 6、Detroit: Become Human 6、No Man's Sky 5、Scorn 5 |
| 震屏 | `震屏｜屏幕震动｜镜头抖动｜screen ?shake｜camera shake` | 7（7） | 7 | 5 | Call of Duty 4: Modern Warfare (2007) 1、BioShock Infinite 1、Call of Duty: Modern Warfare 2 (2009) 1、Ori and the Blind Forest DE 1、Rise of the Tomb Raider 1、Valheim 1、God of War 1 |
| 跳过动画 / 动画太长 | `跳过动画｜动画太长｜战斗动画.{0,6}(长｜慢｜拖)｜can.?t skip (the ｜combat ｜bat…` | 13（14） | 10 | 7 | FINAL FANTASY VIII 2、Little Nightmares 2、Red Dead Redemption 2 2、Sid Meier’s Civilization® VI 1、Detroit: Become Human 1、Cult of the Lamb 1、Stray 1、DEATH STRANDING DIRECTOR'S CUT 1 |
| 伤害数字 | `伤害数字｜跳字｜damage numbers?` | 6（6） | 6 | 5 | Half-Life 2 1、Kingdom Rush  - Tower Defense 1、Abiotic Factor 1、Grounded 1、ELDEN RING 1、FINAL FANTASY VII REMAKE INTERGRADE 1 |
| 色盲 / 色弱 | `色盲｜色弱｜colou?r ?blind\w*` | 6（7） | 6 | 4 | Rain World 1、Just Shapes & Beats 1、GRIS 1、CONTROL 1、Chrono Ark 1、Clair Obscur: Expedition 33 1 |

排名照实列出（按条数），不挑例子。完整正则在 JSON 的 `reviewRecount.keywords`。

### 5.3 分组比较的口径

只比较「标了 X」与「明确标了非 X」的卡；只有少数卡标了这些维度（rel.harmony 22 张、rel.hudVisibility 78 张、rel.diegesis 50 张、typ.display.family 84 张），各组几十款，样本不足以下结论。

| 比较 | 组 | 引导抱怨条数 / 评测数（款数） | 每千条 |
|---|---|---|---|
| HUD 显隐 | 标了全隐 | 25 / 5,653（34） | 4.4 |
|  | 明确标了情境显现 / 常驻 | 30 / 10,825（42） | 2.8 |
| 叙事性 | 标了叙事内 | 39 / 7,711（36） | 5.1 |
|  | 明确标了空间内 / 元 | 3 / 3,443（13） | 0.9 |
| 全库 | 全部 | 155 / 68,689（335） | 2.3 |

- rel.harmony 只有 22 张卡标了（同一媒介 19、统一调色 3、中性与刻意对比 0），没有对照组，不做比较。
- typ.display.family = calligraphy 标的是标题字，与正文字号抱怨无关，已从论证中删除。
- 17 号图谱 §0 里「同一媒介占多数」的比例统计的是分析者写的美术搭配建议（图谱已注明这一点），不是对游戏的观察；本文同样不把它当证据。

### 5.4 据已知描述的卡

取自 17 号图谱 assignments 里 evidence = described 的卡（uiRefs.json 笔记写明商店图无 UI / 多为 CG / 全是海报 / 只拿到开场）：它们的 UI 描述来自已知印象，不是看图得来的。本文引用时加注「据已知描述」，做法谱系与例子列表把看得见 UI 的卡排在前面。uiRefs.json 本身还没有证据置信度字段（不在本次可改文件范围内），以图谱的 evidence 为准。 共 79 张，按批次：card 20、arpg 33、life 22、strategy 4。完整列表见 JSON 的 `cardEvidence.described`。

### 5.5 参数 → 原则的反查

参数 → 原则的反查：role = approach（做法谱系里用到）/ demo（demo 的 focusKeys）/ rule（经验法则里点名）/ genreDemo（品类 demo）/ rationale（只有一句理由）。ops.* 运营参数不建索引（商业化界面不在范围内）；paramRationale 给没有原则覆盖的参数补一句理由，noRationale = true 表示它是工具参数或属于不研究的商业化界面，探索台应显示「暂无原则」。 共 255 个参数有原则或理由可查；没有原则覆盖的参数与理由：

- 示例内容包（`cnt.pack`）（暂无原则）：工具参数：选示例内容包，不是设计决策。原则与品类的 demo 用它让样张来自不同题材，避免所有样张都像一款游戏。
- 基础界面 / 浮层（`cnt.layer`）：基础界面还是浮层：浮层叠在什么上面、背后画面怎么处理，见开菜单时世界停不停与菜单骨架。 见 [P-pause-world-state](#p-pause-world-state)、[P-menu-architecture](#p-menu-architecture)。
- 流程阶段（`cnt.stage`）：流程阶段（进入 / 主体 / 等待 / 确认 / 仪式 / 结果）：仪式阶段只给稀有节点，结果阶段结论先行、一键完成。 见 [P-transition-frequency](#p-transition-frequency)、[P-result-tally](#p-result-tally)、[P-fail-retry](#p-fail-retry)。
- 数据状态（`cnt.dataState`）：数据状态（正常 / 空 / 锁定）：空与锁定的画法要进全局状态词汇表，在每个界面长得一样。 见 [P-icon-system](#p-icon-system)、[P-journal-codex](#p-journal-codex)。
- 主体条目数（`cnt.itemCount`）：条目数：容量本身就是设计（格子数、清单长度），条目一多就要分组与筛选。 见 [P-inventory-capacity-model](#p-inventory-capacity-model)、[P-density-tempo](#p-density-tempo)。
- 角色画法处理（`cnt.characterRender`）：角色画法处理（彩色 / 素描 / 浮雕 / 线描）：立绘也是借风格的一个通道，和面板同一媒介时最统一。 见 [P-channel-borrowing](#p-channel-borrowing)、[P-harmony-four-relations](#p-harmony-four-relations)。
- 对齐体系（`lay.grid`）：对齐体系：中性风格的身份常常就是网格本身；图表与表格必须对齐才可比。 见 [P-neutral-one-voice](#p-neutral-one-voice)、[P-in-game-charts](#p-in-game-charts)。
- 背景模糊（毛玻璃）（`vis.blur`）：毛玻璃模糊：背景越花模糊越重，并提供降低透明度选项，否则压在实时画面上的字有些帧读不到。 见 [P-text-over-live-scene](#p-text-over-live-scene)、[P-high-contrast-and-recolor](#p-high-contrast-and-recolor)。
- 次级底色（`col.surface2`）：次级底色：骨架色分主次两层，强调色只留给关键信息。 见 [P-palette-roles](#p-palette-roles)。
- 自定义描边色（`col.border`）：自定义描边色：与 vis.strokeColor = custom 成对出现；描边色也要按语义分工，别和阵营 / 稀有度色撞车。 见 [P-palette-roles](#p-palette-roles)、[P-color-never-alone](#p-color-never-alone)。
- 渐变（`col.gradient`）：渐变：镀铬、Aero、霓虹家族的面板质感；渐变上叠字时对比度随渐变段变化，要按最不利的一段检查。 见 [P-material-from-world](#p-material-from-world)、[P-text-over-live-scene](#p-text-over-live-scene)。
- 正文斜体（`typ.body.style`）：正文斜体：长段正文不用斜体，斜只留给标题与数字（倾斜动感家族的规则）。 见 [P-typography-legible-format](#p-typography-legible-format)、[P-type-two-tier](#p-type-two-tier)。
- 标题斜体（`typ.display.style`）：标题斜体：倾斜动感、转播包装的标题位，正文回正。 见 [P-type-two-tier](#p-type-two-tier)、[P-motion-personality](#p-motion-personality)。
- 先预告稀有度（`mo.revealTease`）（暂无原则）：先预告稀有度：只用于奖励 / 抽卡揭示演出，属于商业化界面，本文不研究。
- 跨界面常驻层（`flow.chrome`）：跨界面常驻层（顶部货币、聊天跑马灯、回主页）：常驻导航层要短、要稳定；顶部货币栏多见于商业化手游，那部分不研究。 见 [P-menu-architecture](#p-menu-architecture)。
- 按钮有底框（`cmp.buttonBox`）：按钮有没有底框：无框按钮的焦点与按下反馈要更明显，触控区仍要够大。 见 [P-focus-unmistakable](#p-focus-unmistakable)、[P-touch-target-size](#p-touch-target-size)。
- 徽章设计（`cmp.badge`）：徽章设计：评级徽章、状态记号与图标属于同一套视觉词汇。 见 [P-icon-system](#p-icon-system)、[P-result-tally](#p-result-tally)。
- 弹窗结构（`cmp.modal`）：弹窗结构：模态只给必须先读或不可逆的内容；可逆操作用撤销，教学用提示条。 见 [P-confirm-by-input](#p-confirm-by-input)、[P-teach-then-retire](#p-teach-then-retire)。
- 输入框形态（`cmp.input`）：输入框形态：要容纳长译文与输入法候选框（起名、搜索、聊天）。 见 [P-localization-ready](#p-localization-ready)、[P-settings-page](#p-settings-page)。
- 名次标识（`st.rank`）：名次标识：「我」的那一行要突出，按得分排序，名次形态跟着转播 / 竞技风格走。 见 [P-scoreboard-team-id](#p-scoreboard-team-id)、[P-result-tally](#p-result-tally)。
- 空状态画法（`st.emptyList`）：空状态画法：空日志、空图鉴要告诉玩家怎么获得第一条，而不是只放一张插画。 见 [P-journal-codex](#p-journal-codex)、[P-icon-system](#p-icon-system)。
- 颜色冗余检查（`chk.redundancy`）：颜色冗余检查：P-color-never-alone 的验收工具。 见 [P-color-never-alone](#p-color-never-alone)。
- UI 屏占比读数（`chk.coverage`）：UI 屏占比读数：按停留时间分配浓度、密度跟着节奏走的验收读数。 见 [P-dwell-time-budget](#p-dwell-time-budget)、[P-density-tempo](#p-density-tempo)。
- 流程演示脚本（`chk.demo`）（暂无原则）：流程演示脚本：工具参数，让纯动效 demo 动起来（缺「打开界面」「结算计数」脚本，见参数缺口）。 见 [P-transition-frequency](#p-transition-frequency)、[P-result-tally](#p-result-tally)。
- 时间 / 天气 / 日历：画法（`el.clock.form`）：时间 / 天气 / 日历：只在品类篇里讨论（生活、探索、建造）。
- 奖励 / 获得物：画法（`el.reward.form`）：奖励 / 获得物画法：主要用在奖励演出（商业化部分不研究）；非商业的局内拾取与结算见通告分级与结算节奏。 见 [P-event-callout-tiers](#p-event-callout-tiers)、[P-result-tally](#p-result-tally)。
- 身份 / 头像 / 等级：画法（`el.profile.form`）：身份 / 头像 / 等级：只在品类篇里讨论（RPG、手游）。
- 行动顺序：画法（`el.turnOrder.form`）：行动顺序：只在品类篇里讨论（策略、RPG）；原理同 P-actionable-first（把「接下来谁动」画出来）。 见 [P-actionable-first](#p-actionable-first)。

## 六、参数缺口与补卡单

### 6.1 本轮登记的参数缺口

- **新品类没有内容包**（`G-pack-new`）：cnt.pack 增加 fighting、sports、moba、flightSim（音游已有 rhythm，MMO 暂借 rpg）。来自 G-fighting、G-sports、G-mobaBr、G-vehicleSim
- **文字系统没有参数：中日韩与拉丁文的字号、行高、断行规则不同**（`G-typ-script`）：新增 typ.script（latin / cjk / mixed），派生规则按它调整 typ.baseSize（中日韩 +2px）与断行禁则。来自 [P-localization-ready](#p-localization-ready)
- **文字膨胀检查只有 +30% / +50% 两档，且不分语言**（`G-chk-textExpansion`）：新增 chk.textExpansion（按目标语言：de / ru +35%、zh → en 宽度换算），与 chk.overflow 合并或并列。来自 [P-localization-ready](#p-localization-ready)
- **大数格式（万 / 亿 vs K / M）没有参数**（`G-number-format`）：ctx.locale 派生 typ.numberFormat（cn10k / western）。来自 [P-localization-ready](#p-localization-ready)、[P-in-game-charts](#p-in-game-charts)
- **chk.demo 没有「打开界面」「结算计数」脚本，纯动效 demo 静态看不出差别**（`G-chk-demo-scripts`）：chk.demo 增加 openScreen、resultsTally；本文的 demo 先用 play = enter 表示「循环播放入场」。来自 [P-transition-frequency](#p-transition-frequency)、[P-result-tally](#p-result-tally)、[P-fail-retry](#p-fail-retry)
- **渲染器只读全局 mo.valueChange / mo.juice，按元素覆盖（@el.*）不生效**（`G-motion-per-element`）：sim.ts 改为 r.at('mo.valueChange', el)；check-param-vectors.py 维护「支持 @ 覆盖的参数」白名单（现在只有 cmp.*@ 与 vis.silhouette@icon）。来自 [P-value-change-visible](#p-value-change-visible)、[P-shake-hitstop](#p-shake-hitstop)、[P-damage-number-legibility](#p-damage-number-legibility)
- **按元素改外形（vis.silhouette@el.minimap = circle 等）不生效**（`G-silhouette-per-element`）：渲染器支持 vis.silhouette@el.*，或 el.minimap.form 增加 circle。来自 G-explore、G-racing、G-action、G-mobile、G-strategy
- **chk.minText 上限 24，电视底线 26px@1080p 设不出来**（`G-minText-range`）：把 chk.minText 上限放到 32。来自 [P-text-size-floor](#p-text-size-floor)、[P-view-distance](#p-view-distance)
- **st.statViz 没有折线 / 走势线**（`G-statviz-line`）：st.statViz 增加 lineChart、sparkline（提示框里的迷你走势线）。来自 [P-in-game-charts](#p-in-game-charts)、G-builder、G-factory
- **信息流没有「最多 N 条」与停留时长参数**（`G-notify-cap`）：el.notify 增加 maxItems 与 dwell。来自 [P-event-feed-tiers](#p-event-feed-tiers)
- **参数体系没有声音与触觉**（`G-audio`）：新增 aud.* 组：aud.family（与皮肤配套的声音家族）、aud.duck（优先级压低）、hap.level（触觉档位），只做说明与导出，不渲染。来自 [P-audio-haptic-pairing](#p-audio-haptic-pairing)
- **探索台只有平面画布，无法演示 VR 深度与头部跟随**（`G-vr`）：暂不实现；P-vr-spatial-ui 以文字说明。来自 [P-vr-spatial-ui](#p-vr-spatial-ui)
- **放置预览的合法性与原因没有参数**（`G-build-legality`）：el.overlay 增加 legality（color / stripes / icon）与 reasonText。来自 [P-build-placement](#p-build-placement)、G-builder
- **lay.arrangement 的 pitch / track 没有模板用到**（`G-arrangement-pitch`）：补阵型模板 tpl.formation（体育篇）与赛道进度条（竞速 / 音游）。来自 G-sports、G-rhythm

### 6.2 R5 补卡单

新品类篇与新原则缺参考卡的作品；补卡后要看图复核「待补参考」的结论。Interface In Game 不抓取，GameUI 不查询用户字段。

Street Fighter 6、TEKKEN 8、Guilty Gear -Strive-、Crypt of the NecroDancer、Thumper、Rocket League、Football Manager、Dota 2、Elite Dangerous、Microsoft Flight Simulator、Typoman Revised、Baba Is You、Lost Words: Beyond the Page

## 七、参考文献

编号与 JSON 的 `sources[].id` 一致；原则「出处」里的 Sxxx 指向这里。要点是中文转述，不含长引文。GDC Vault 演讲多数需要会员才能看全文，要点取自官方摘要与公开报道；gamedeveloper.com 的页面抓取受限，要点来自摘要与二手引用。Interface In Game 只作为人工浏览入口，未抓取。S197–S204 是本轮新增的规范与官方文档，内容按通行要点转述，未逐条联网核对（`verified = false`）。

### 学位论文（1）

- **S001** Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games（Erik Fagerholt, Magnus Lorentzon（Chalmers 理工大学，与 EA DICE 合作），2009）。<https://odr.chalmers.se/handle/20.500.12380/111921>
  - 用两个问题给每一个界面元素定位：它是否属于游戏的虚构故事、它是否存在于游戏的三维空间——由此得到叙事内（diegetic）、非叙事（non-diegetic）、空间（spatial）、元（meta）四种表示。 沉浸的定义来自游戏学、认知科学、媒介研究的文献，并用对当代 FPS 的现状调研与用户测试来检验假设。 提出四条指南：了解你的设计空间、了解你的游戏（竞技焦点与虚构设定会改变 UI 对沉浸的作用）、建立玩家能动性、强化玩家与化身之间的感知联结。 四象限是逐个元素挑位置的工具箱，并不主张整款游戏一刀切地取消 HUD。（引用于 P-focal-periphery、P-two-questions-per-element、P-diegetic-carrier-camera-fiction、P-spatial-render-budget、P-device-bridge、P-pause-world-state 等）

### 论文（25）

- **S004** Do Players Prefer Integrated User Interfaces? A Qualitative Study of Game UI Design Issues（Stein C. Llanos, Kristine Jørgensen，2011）。<https://dl.digra.org/index.php/dl/article/view/514>
  - 用质性玩家研究考察玩家怎么看各类 UI 元素，以及界面如何影响投入感。 摘要的结论：透明（融入式）界面并不必然带来更高投入；叠加式界面因为信息清楚，常常更受玩家偏好。 把 UI 选择看作美学与机制之间的平衡：用透明还是叠加，是在游戏语境里表示系统信息的一种方式。 同年 Gamasutra 对 Jørgensen 研究的报道：多数玩家满意传统叠加 HUD，但某个元素一旦不再服务其功能就会变得烦人、破坏投入。（引用于 P-pause-world-state、P-map-conventions、P-know-your-game-competition、P-contextual-hud、P-hudless-tax、P-adaptive-layers）
- **S007** Removing the HUD: The Impact of Non-Diegetic Game Elements and Expertise on Player Involvement（Ioanna Iacovides, Anna Cox, Richard Kennedy, Paul Cairns, Charlene Jennett，2015）。<https://discovery.ucl.ac.uk/id/eprint/1470398/>
  - CHI PLAY 2015 论文：让玩家玩同一款 FPS 的有 HUD / 无 HUD 两个版本，比较沉浸与投入。 去掉非叙事元素主要影响专家玩家：其认知投入与控制感上升，新手差异不明显。 结论是界面取舍要考虑玩家熟练度——“可关闭 / 极简 HUD”更像是面向老手的选项，而非默认。（引用于 P-know-your-game-competition、P-contextual-hud、P-adaptive-layers）
- **S008** Evaluating the Effectiveness of HUDs and Diegetic Ammo Displays in First-person Shooter Games（Margaree Peacocke, Robert J. Teather, Jacques Carette, I. Scott MacKenzie，2015）。<https://www.yorku.ca/mack/ieee_gem2015.html>
  - IEEE GEM 2015：比较五种弹药显示——HUD 上的条、图标、数字，以及武器旁的叙事内数字与子弹图形。 武器旁的叙事内数字表现最好：打空后的多余射击约少三分之一、换弹约快四分之一，七成被试最喜欢，且被评为最有沉浸感。 作者把差异主要归因于位置：信息靠近视线焦点（准星 / 武器）可以减少扫视；叙事内显示在符合题材时效果好。 同组 2018 年在 Entertainment Computing 的扩展研究：弹药类信息以叙事内 / 空间显示最好，而生命值用 HUD 时玩家表现明显更好——不同信息适合不同象限。（引用于 P-glance-encoding、P-focal-periphery）
- **S009** Head-up displays in action video games: the effects of physical and semantic characteristics on player performance and experience（Loïc Caroux, Maxime Delmas, Marc Cahuzac, Maylis Ader, Baldéric Gazagne, Anthony Ravassa，2022）。<https://doi.org/10.1080/0144929X.2022.2081609>
  - Behaviour & Information Technology：四个实验让不同熟练度的玩家玩商业动作游戏，分别操纵 HUD 的物理特征（大小、颜色）与语义特征（显示什么信息）。 只有当语义特征改变、且信息与主任务相关时，表现与体验才显著变化；越熟练的玩家受影响越大。 单改大小、颜色，或改与主任务无关的信息，影响不显著——HUD 优化应先决定显示什么，再决定怎么画。
- **S010** Player–video game interaction: A systematic review of current concepts（Loïc Caroux, Katherine Isbister, Ludovic Le Bigot, Nicolas Vibert，2015）。<https://doi.org/10.1016/j.chb.2015.01.066>
  - Computers in Human Behavior 综述：整理 72 篇 HCI 期刊文章，界定“玩家–游戏交互”的概念体系。 玩家侧概念为投入与乐趣；游戏侧为信息输入 / 输出技术、游戏内容、多人；另有可玩性等整体概念。 把信息输入 / 输出（含屏幕信息呈现）列为独立研究维度，为后续 HUD 实验提供框架。
- **S011** Diegetic interfaces and evaluating their User Experience: a systematic mapping（Guilherme Lopes da Cruz, João Luiz Bernardes Júnior（USP），2026）。<https://sol.sbc.org.br/index.php/sbgames/article/view/45403>
  - SBGames 2026 系统映射：分析 94 篇关于叙事内界面的文章。 开发叙事内界面的研究中有一部分采用 Galloway 的模型；评估多用 Game Experience Questionnaire、Immersion Experience Questionnaire 等传统问卷。 可作为查找叙事内 UI 可用性、沉浸、乐趣评估方法的最新入口。
- **S012** Heuristic Evaluation for Games: Usability Principles for Video Game Design（David Pinelle, Nelson Wong, Tadeusz Stach，2008）。<https://doi.org/10.1145/1357054.1357282>
  - CHI 2008：基于一个游戏网站对 108 款 PC 游戏的评测（6 大品类各 18 款）归纳出 12 类可用性问题。 据此提出 10 条游戏可用性启发式，涵盖：响应一致、可自定义设置、行为可预测、视野不被遮挡、可跳过非游玩内容、直观的输入映射、易管理的操作、提供游戏状态信息、提供教学与帮助、视觉表示易于解读。 初步评估表明这些启发式能抓到通用 UI 启发式漏掉的游戏特有问题，适用于早期原型与可运行版本。（引用于 P-teach-then-retire）
- **S013** Using Heuristics to Evaluate the Playability of Games（Heather Desurvire, Martin Caplan, Jozsef A. Toth，2004）。<https://doi.org/10.1145/985921.986102>
  - CHI 2004 扩展摘要：把生产力软件与试玩测试的启发式改造成游戏可玩性启发式 HEP（Heuristic Evaluation for Playability）。 在一款开发中的游戏上与常规用户测试对比，HEP 能发现相似也有不同的问题，最适合在原型 / 样稿阶段使用。 后续由 Desurvire 与 Wiberg 精简为 PLAY 启发式，可在更早阶段使用。
- **S014** GameFlow: A Model for Evaluating Player Enjoyment in Games（Penelope Sweetser, Peta Wyeth，2005）。<https://doi.org/10.1145/1077246.1077253>
  - ACM Computers in Entertainment：把心流理论与已有游戏启发式整合成八要素模型——专注、挑战、技能、控制、清晰目标、反馈、沉浸、社交。 用一高一低两款 RTS 做专家评审，模型能区分两者并解释成败原因。 “清晰目标”和“即时反馈”可直接翻译成 HUD / 提示层的检查项；2020 年的回顾统计该模型已有 200 多次应用。
- **S015** Playability Heuristics for Mobile Games（Hannu Korhonen, Elina M. I. Koivisto（Nokia Research Center），2006）。<https://doi.org/10.1145/1152215.1152218>
  - MobileHCI 2006：把移动游戏可玩性启发式分为三组——游戏可用性、移动性、玩法。 移动性问题是这类设备特有的：会话要能快速开始、能随时被打断再恢复、要适应外部环境。 后续 2007 年扩展到多人移动游戏；2018 年也有研究指出部分条目措辞对新手评审不够易懂。
- **S016** Gran Stylissimo: The Audiovisual Elements and Styles in Computer and Video Games（Aki Järvinen，2002）。<https://dl.digra.org/index.php/dl/article/view/19>
  - 提出“视听风格”概念，把游戏分为照相写实、漫画化（caricaturism）、抽象三种风格。 定义构成游戏视听外观的四个要素：维度（2D / 3D）、感知视点、视觉面貌、声音景观。 梳理从 Pong、Space Invaders 到 Doom 年代、再到 90 年代 3D 与写实化的演变，并指出新的风格方向正在出现——可作为 UI 风格与美术风格配对的上位分类。
- **S017** The Game FAVR: A Framework for the Analysis of Visual Representation in Video Games（Dominic Arsenault, Pierre-Marc Côté, Audrey Larochelle（Université de Montréal），2015）。<https://loading.journals.publicknowledgeproject.org/index.php/loading/article/view/155>
  - Loading... 期刊：给游戏画面的规则驱动、可交互一面（作者称“ergodic animage”）提供统一描述框架。 梳理电影、动画、艺术史、图学投影、技术制图等视觉传统，评估它们处理 2D / 3D 与游戏史的能力。 提供模板、流程图与案例，便于用同一套词汇描述任意游戏的视点、投影与画面组织——可用于给参考卡的“镜头 / 画面”打标签。
- **S018** Illustrative Rendering in Team Fortress 2（Jason Mitchell, Moby Francke, Dhabih Eng（Valve），2007）。<https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf>
  - NPAR 2007：九个职业必须一眼可分，因此以剪影、身体比例、武器为第一识别手段，配合明度对比与简洁形体。 着色用边缘高光与明度 / 色相变化快速传达形体，而不是画深色描边。 风格取自 20 世纪初商业插画：强烈独特的剪影、强调衣褶。Valve 在 GDC 2008 又以“有目的的风格化”为题做了延伸——说明风格选择首先服务于玩法可读性。
- **S019** Game Accessibility: A Survey（Bei Yuan, Eelke Folmer, Frederick C. Harris Jr.，2011）。<https://igda-gasig.org/2010/07/06/game-accessibility-a-survey/>
  - Universal Access in the Information Society 期刊综述，系统梳理游戏无障碍的学术文献。 按感官、运动、认知障碍分别总结可行策略，并给出美国受各类障碍影响而无法或难以玩游戏的人数统计。 可作为无障碍选项（字号、对比、替代通道、输入简化）背后学术依据的起点。
- **S172** Callahan, Hopkins, Weiser, Shneiderman · An Empirical Comparison of Pie vs. Linear Menus（CHI '88）。<https://dl.acm.org/doi/10.1145/57167.57182>
  - 饼形菜单比线性菜单选择更快、错误更少，原因是每个方向的目标更大、离起点同样近（Fitts 定律）（引用于 P-radial-for-sticks）
- **S173** Cowan, The magical number 4 in short-term memory (BBS, 2001)（2001）。<https://pubmed.ncbi.nlm.nih.gov/11515286/>
  - 短时记忆的纯容量约为 3–5 个组块，平均约 4 个；可作为同时要盯住的主信息上限。（引用于 P-priority-tiers）
- **S174** Healey, Perception in Visualization（前注意特征）。<https://www.csc2.ncsu.edu/faculty/healey/PP/index.html>
  - 单一独特特征（色相、尺寸、方向等）能「跳出」；多个特征组合定义的目标往往无法一眼找到——强调手段要单纯。 能在约 200 毫秒内、不依赖逐个扫视完成的判断属于前注意加工；可一眼读出的 HUD 编码应落在这些特征上。（引用于 P-priority-tiers、P-glance-encoding、P-icon-system）
- **S175** Hicks et al., Juicy Game Design: Understanding the Impact of Visual Embellishments on Player Experience, CHI PLAY 2019（2019）。<https://doi.org/10.1145/3311350.3347171>
  - 视觉修饰是重复表达已有信息的设计元素；两项实验里它们稳定提升视觉吸引力，但对胜任感等体验只在特定情况下有影响。（引用于 P-hit-channel-split）
- **S176** Kenny, Koesling, Delaney, McLoone, Ward, A Preliminary Investigation into Eye Gaze Data in a First Person Shooter Game (ECMS 2005)（2005）。<https://mural.maynoothuniversity.ie/id/eprint/282/>
  - 在自制 FPS 里记录眼动，发现玩家大部分注视都落在屏幕中央附近——四角的 HUD 只是偶尔被扫到。（引用于 P-focal-periphery）
- **S177** Kurtenbach & Buxton · The Limits of Expert Performance Using Hierarchic Marking Menus（CHI '93）。<https://www.research.autodesk.com/publications/the-limits-of-expert-performance-using-hierarchic-marking-menus/>
  - 层级标记菜单的宽度与深度都会抬高错误率；常被引用的结论是每层 8 项以内、8 项时最多两层（引用于 P-radial-for-sticks、P-contextual-ping）
- **S178** Machado, Oliveira & Fernandes 2009: CVD simulation（2009）。<https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html>
  - 本工具 chk.cvd 使用的色觉异常模拟矩阵出处（06 文档 C.4）。（引用于 P-color-never-alone）
- **S179** Martin Pichlmair & Mads Johansen, Designing Game Feel: A Survey（arXiv:2011.09201，后发表于 IEEE Transactions on Games）（2011）。<https://arxiv.org/abs/2011.09201>
  - 把手感研究归成三种体验目标——物理感、放大、支持——分别对应调参、加 juice、精简流程；juice 只是三种打磨手段之一。（引用于 P-juice-budget）
- **S180** Peacocke, Teather, Carette, MacKenzie, McArthur (2018) An empirical comparison of first-person shooter information displays: HUDs, diegetic displays, and spatial representations. Entertainment Computing 26（2018）。<https://www.yorku.ca/mack/ec2018.html>
  - 四组实验：弹药在武器上的数字最好；生命用 HUD 数字最好，血迹式指示拖后腿；导航用空间路径线最好、罗盘最差；结论是没有一类显示方式通吃，取决于信息类型、形式与位置。 生命信息用 HUD 数字表现最好，血迹式指示妨碍了玩家。 导航任务中描出路径的空间线表现最好，旋转小地图接近，罗盘最差。（引用于 P-two-questions-per-element、P-meta-perception、P-hudless-tax、P-adaptive-layers）
- **S181** Rosenholtz, Capabilities and Limitations of Peripheral Vision (Annual Review of Vision Science, 2016)（2016）。<https://doi.org/10.1146/annurev-vision-082114-035733>
  - 余光的编码丢失大量细节，能做粗分类和「大意」判断，但不擅长读细节——角落放精读信息不划算。（引用于 P-focal-periphery）
- **S182** Weiser & Brown, Designing Calm Technology (1995)（1995）。<https://calmtech.com/papers/designing-calm-technology>
  - 好的信息设计让内容在注意力中心与外围之间移动：外围让人同时感知很多事，需要时再拉到中心处理。 信息应当能在外围与中心之间移动：平时安静地待在外围，需要时进入中心。（引用于 P-focal-periphery、P-contextual-hud）

### 书（13）

- **S005** Gameworld Interfaces（Kristine Jørgensen，2013）。<https://www.thevideogamelibrary.org/book/gameworld-interfaces>
  - 比较两种呈现游戏信息的方式：自然地融入虚构世界，或用叠加符号、菜单呈现；两种都能有效传递玩家需要的信息。 核心论点：游戏世界并不受虚构一致性支配，而是受游戏机制逻辑支配；游戏世界本身就是玩家访问系统信息的界面。 方法上同时访谈开发团队（Harmonix、Turbine）并对四个不同品类的游戏做玩家观察与访谈。 MIT Press 出版；最后一章提出“游戏世界界面”理论，认为界面处于虚构与系统之间的阈限位置。
- **S006** Gaming: Essays on Algorithmic Culture（Alexander R. Galloway，2006）。<https://en.wikipedia.org/wiki/Gaming:_Essays_on_Algorithmic_Culture>
  - 开篇“游戏行为的四个时刻”用两条轴分析游戏：操作者（玩家）↔ 机器（电脑），叙事内 ↔ 非叙事。 四象限例子：开枪是叙事内操作者行为，环境音是叙事内机器行为，暂停是非叙事操作者行为，网络延迟是非叙事机器行为。 设置、暂停、存档等界面行为在这个框架里与射击同样是“游戏行为”——为把菜单当作玩法的一部分提供了理论依据。 后来的叙事性 UI 研究（含 2026 年的系统映射）大量沿用此模型。
- **S020** The Gamer's Brain: How Neuroscience and UX Can Impact Video Game Design（Celia Hodent，2017）。<https://thevideogamelibrary.org/book/the-gamer-s-brain-how-neuroscience-and-ux-can-impact-video-game-design>
  - CRC Press 出版；作者曾任 Epic Games UX 负责人，参与 Fortnite、Paragon 等。 从感知、记忆、注意、动机、情绪、学习等认知机制出发解释玩家为何看不见 / 记不住 / 误解界面，并澄清常见“神经迷思”。 把 UX 拆成可用性（易用、清晰、反馈、形式服从功能、减负）与投入感两大支柱，给出在开发中落地的 UX 框架。 强调注意力有限：一次只能处理少量信息，HUD 的重要信息必须靠显著性和位置争夺注意。
- **S022** The Psychology of Video Games（Celia Hodent，2020）。<https://routledge.com/product/isbn/9780367493134>
  - Routledge “The Psychology of Everything” 丛书中的短书，从创作者与玩家两侧看游戏为何吸引人。 讨论游戏在教育与医疗中的潜在益处，也讨论问题性游戏等担忧，最后落到行业伦理。 主张理解心智运作能帮助开发者做出更合乎伦理、更包容的游戏——可用来给“暗黑模式”类界面划红线。
- **S023** Game Usability: Advancing the Player Experience（第 2 版：Advice from the Experts for Advancing UX Strategy and Practice in Videogames）（Katherine Isbister, Noah Schaffer 编（第 2 版 2022：Katherine Isbister, Celia Hodent 编），2008）。<https://shop.elsevier.com/books/game-usability/isbister/978-0-12-374447-0>
  - 把生产力软件的可用性原则迁移到游戏，并解释玩家特征如何决定可用性策略；作者来自 Microsoft、Maxis、Sega、Ubisoft、Nintendo 等。 覆盖经典评估技术、特定品类与情境、原型与生理测量等进阶方法，以及在紧张排期中插入可用性工作的做法。 2022 年第 2 版（Routledge）新增无障碍、移动端可用性、数据科学、VR/AR、电竞五章。
- **S024** Games User Research（Anders Drachen, Pejman Mirza-Babaei, Lennart E. Nacke 编，2018）。<https://www.thevideogamelibrary.org/book/game-user-research>
  - Oxford University Press 出版的游戏用户研究（GUR）方法手册，几十位学界与业界作者撰稿。 覆盖研究规划、以用户为中心的测试、方法选择、把发现转化为可执行的修改，以及不同平台对研究实践的影响。 对 UI 而言：给出验证“玩家是否看见 / 理解 / 能操作”的具体方法（观察、问卷、眼动、遥测等）。
- **S025** Game Development Essentials: Game Interface Design（Kevin Saunders, Jeannie Novak，2007）。<https://www.thevideogamelibrary.org/book/game-development-essentials-game-interface-design>
  - Delmar / Cengage 出版的入门教材（2007 首版、2012 第 2 版），覆盖界面设计的基础、理论与实践。 讨论平台、品类与设计目标如何改变界面惯例，并回顾游戏界面设计史。 第 2 版扩充实践部分，加入移动设备、体感设备与多人游戏的界面设计，以及大量业内访谈与截图。
- **S026** Game Interface Design（Brent Fox，2004）。<https://tenlong.com.tw/products/9781592005932>
  - Thomson Course Technology 出版（版权页 2005），讲美观且易用的前端菜单与局内界面。 前几章讲菜单流程规划与基础设计原则，后几章讲按钮状态等具体部件。 包含界面动效与当时用 Flash 制作交互界面的方法——现已绝版，但菜单流程图的思路仍可用。
- **S027** Game Feel: A Game Designer's Guide to Virtual Sensation（Steve Swink，2008）。<https://routledge.com/product/isbn/9780123743282>
  - Morgan Kaufmann 首版（现由 CRC Press 发行），把“手感”当作设计者在用却很少被说清的隐性语言。 整合关于手感与感官如何产生投入的理论，覆盖声音、辅助指示（ancillary indicators）、隐喻、人类感知以及手感的简史。 对 UI 的启示：命中反馈、数值跳字、屏幕抖动等都是“输入—感知”回路的一部分，属于手感而不只是装饰。
- **S028** The Art of Game Design: A Book of Lenses（Jesse Schell，2008）。<https://routledge.com/product/isbn/9781138632059>
  - 以 100 多组“透镜”问题从不同角度审视游戏，在构建、试玩、修改中反复自问。 专章讨论“玩家通过界面玩游戏”（第 3 版第 16 章），把界面看作玩家与游戏世界之间的映射、反馈与信息通道。 第 3 版（2020，CRC Press）补充 VR/AR、免费游戏、混合与转化型游戏的例子。
- **S029** Patterns in Game Design（Staffan Björk, Jussi Holopainen，2005）。<https://tenlong.com.tw/products/9781584503545>
  - Charles River Media 出版，提出用于描述游戏的模板与 200 多个可复用的游戏设计模式。 把玩法看作玩家与游戏系统、与其他玩家之间的交互结构，按玩法侧面分章组织模式。 对本项目的启示：参数体系里的“预设 / 派生规则”可借鉴其模式写法（名称—问题—后果—关联模式）。
- **S030** Laws of UX: Using Psychology to Design Better Products & Services（Jon Yablonski，2020）。<https://lawsofux.com/>
  - O'Reilly 出版（2020 首版、2024 第 2 版），配套网站整理 30 条常用 UX 定律与心理学原则。 与游戏界面直接相关的有：Fitts 定律（目标越大越近越好点）、Hick 定律（选项越多决策越慢）、Miller 定律与组块化（工作记忆有限）、冯·雷斯托夫效应（与众不同者更易被记住）。 格式塔类（接近、相似、共同区域、一致连接）可用来解释 HUD 分组与面板分区；第 2 版加入暗黑模式、默认值与摩擦的伦理讨论。
- **S104** Edward Tufte, The Visual Display of Quantitative Information。<https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/>
  - 主张提高数据墨水比、在合理范围内提高数据密度：低密度迫使人按顺序翻看而不是一眼比较——密度本身不是问题，非数据的装饰才是。（引用于 P-density-tempo、P-in-game-charts）

### 演讲（19）

- **S021** The Gamer's Brain: How Neuroscience and UX Can Impact Design（GDC 2015 演讲）（Celia Hodent（Epic Games），2015）。<https://gamedeveloper.com/design/video-making-better-games-through-neuroscience---and-good-ux>
  - GDC 2015 设计轨：介绍与感知、注意、记忆相关的脑科学事实，以及如何把它们用于游戏设计。 主张用基础神经科学与 UX 指南在试玩之前就预判问题，让玩家体验到设计者意图中的体验。 例子主要来自 Epic Games 当时的项目；已在 GDC 官方 YouTube 免费公开。
- **S032** Crafting Destruction: The Evolution of the Dead Space User Interface（Dino Ignacio（Visceral Games），2013）。<https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of>
  - GDC 2013 视觉艺术轨：Dead Space 系列首席 UI 设计师讲界面为何以及如何走向叙事内与沉浸。 拆解前端菜单、工作台与 RIG 宇航服：生命条、库存、武器选择、定位指引都放在主角身上或世界里。 目标是拆掉玩家与游戏之间的“安全墙”，连读盘、存档点这类惯例也包装成可信的世界内元素；恐怖题材正是叙事内 UI 最能发挥的场合。（引用于 P-diegetic-carrier-camera-fiction、P-pause-world-state、P-material-from-world、P-hudless-tax）
- **S033** Tenacious Design and The Interface of 'Destiny'（David Candland（Bungie），2016）。<https://www.gdcvault.com/play/1023460/>
  - GDC 2016 视觉艺术轨：界面要对新玩家友好易懂，同时给老玩家足够的深度与快捷访问。 涉及主机上的自由光标、按住确认这类限时交互、为本地化预留的伸缩余量、视觉方向、图标制作管线与 Director 星图界面。 展示早期更花哨的原型如何收敛为最终较克制的样式。
- **S034** Hearthstone: How to Create an Immersive User Interface（Derek Sakamoto（Blizzard Entertainment），2015）。<https://gdcvault.com/play/1022036/Hearthstone-How-to-Create-an>
  - GDC 2015：介绍炉石团队如何组织工作、设定愿景并做出沉浸式界面，兼及跨平台开发。 卡牌游戏没有可走动的世界，界面就是整个游戏，所以 UI 设计师从很早期就参与并贯穿全程。 开盒、洗牌、拖牌等细节追求“实体桌游”般的触感；移植手机时调整了版面，把部分元素直接放上棋盘。
- **S035** Lessons Learned Creating UI for 'The Division'（Christian Savoie（Massive Entertainment / Ubisoft），2017）。<https://gdcvault.com/play/1024026/Lessons-Learned-Creating-UI-for>
  - GDC 2017：为 The Division 新建了 UI 技术与新的 UI 制作方式，讲系统如何工作以及为何如此取舍。 背景：制作方明确要求尽量去掉 2D 平面元素，让 HUD 以微倾角度贴在角色周围、配合腕部全息与全息地图，形成空间化界面。 每条经验都配实际开发故事，已在 GDC 官方 YouTube 免费公开。（引用于 P-world-space-text）
- **S036** 'God of War Ragnarok': Building the UI for a AAA Sequel（Zach Bohn（Santa Monica Studio），2023）。<https://www.gdcvault.com/play/1029143/-God-of-War-Ragnarok>
  - GDC 2023 设计轨：讲 UI 团队在大型项目中的角色与组织方式，以及设计、工程、美术三方面的挑战。 以工作室对 God of War（2018）UI 的内部复盘作为续作 UI 的基石。 最后给出 UI 技术优化技巧与制作中要避开的坑。
- **S038** User Interface in 'Cyberpunk 2077': Challenges and Optimizations（Arkadiusz Antonik（CD Projekt RED），2023）。<https://gdcvault.com/play/1034160/User-Interface-in-Cyberpunk-2077>
  - GDC Showcase 2023 程序轨：Cyberpunk 2077 的 UI 技术从零自研，需要支撑夜之城里成千上万个独立 UI 实例。 同一套 UI 框架被用于超出常规的玩法场景，例如城市里的广告牌系统——世界内屏幕与 HUD 共用技术。 讲在目标平台上满足性能预算的管线与技巧；对“赛博朋克风 UI”而言，世界内屏幕密度本身就是风格的一部分。
- **S039** UX Summit: Designing Immersive UI for 'Star Wars Jedi: Survivor'（Daanish Syed（Bit Reactor；时任该作首席 UI 视觉设计师），2024）。<https://gdcvault.com/play/1034481/UX-Summit-Designing-Immersive-UI>
  - GDC 2024 UX 峰会：讲如何做出无缝的叙事内界面，以及从设计理念到实现的步骤。 例子：光剑零件定制在工作台上以实物方式切换；技能解锁通过漂浮的石碑呈现。 说明沉浸 UI 不止 HUD，也可以覆盖定制与成长类菜单。
- **S040** 'Mini Metro': When Less is More（Jamie Churchman（Dinosaur Polo Club），2017）。<https://gdcvault.com/play/1024250/-Mini-Metro-When-Less>
  - GDC 2017 设计轨：复盘 Mini Metro 视觉设计的成功与失败，讨论 UI 与视觉决策如何构成有回报的体验。 批评堆砌计时器、奖励、粒子、收集品、通知来抓注意力的做法，主张依靠内在动机。 方法：建立强健的设计语言、通过“删减”而不是“添加”得到美感；画面借鉴 Harry Beck 式抽象地铁图。（引用于 P-build-placement）
- **S041** Art Direction for AAA UI（Omer Younas（DICE LA），2018）。<https://gamedeveloper.com/art/video-art-direction-advice-for-crafting-triple-a-game-ui>
  - GDC 2018：用视觉理论与最佳实践讲如何让 AAA 游戏的 UI 美术既一致又吸引人。 强调先理解认知过程如何影响视觉方向，再谈风格——美观与可用要同时成立。 已在 GDC 官方 YouTube 免费公开，常被拿来作为 UI 美术方向的入门课。（引用于 P-frontend-loading）
- **S042** 'Into the Breach' Design Postmortem（Matthew Davis（Subset Games），2019）。<https://gdcvault.com/play/1025772/-Into-the-Breach-Design>
  - GDC 2019 设计轨：回顾 FTL 之后约四年的开发，从早期草案到最终平衡，以及被砍掉和反复迭代的内容。 讨论如何决定砍什么、如何借鉴其他游戏机制又保持原创、如何定难度、放多少随机性。 背景：该作把敌人下一步攻击完全预告在棋盘上，属于“近乎完全信息”的回合策略——随机性少意味着界面必须把后果画清楚。
- **S044** GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D（Junya Christopher Motomura（Arc System Works），2015）。<https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The>
  - GDC 2015 视觉艺术轨：在全 3D 框架里重做经典 2D 格斗游戏，同时保留老式 2D 的味道，逆写实化潮流。 覆盖美术与程序两方面的研发：模型、贴图、着色器、渲染，以及背后的艺术取舍。 画面严格以日式动画为基准，这也是从 2D 精灵时代继承的传统；官方另提供英文讲稿 PDF。（引用于 P-medium-constraints）
- **S045** Juice it or lose it（Martin Jonasson, Petri Purho，2012）。<https://www.youtube.com/watch?v=Fy0aCDmgnxg>
  - 以一个打砖块原型现场演示：加入“多汁”反馈后同样的玩法立刻显得有生命。 手段包括颜色、缓动曲线、碰撞时的挤压拉伸、层叠音效与音乐、克制使用粒子、屏幕抖动、让物件对事件产生反应。 后来的反思：过量特效也会破坏沉浸，反馈强度应与事件重要性相称。
- **S046** Accessible Player Experiences: A New Approach to Data Informed Design for Accessible Games（Christopher Power, Mark Barlet（AbleGamers / University of York），2019）。<https://gdcvault.com/play/1025719/Accessible-Player-Experiences-A-New>
  - GDC 2019：基于数百名残障玩家的调查，介绍他们使用的辅助技术、跨障碍类型的共性以及常玩的游戏。 提出 22 个 APX 无障碍设计模式，可嵌入现有设计流程。 主张在开发早期考虑无障碍，比事后补做更省时省钱。
- **S047** Accessibility in The Last of Us Part II: A 3-Year Development Journey（Emilia Schatz, Matthew Gallant（Naughty Dog），2020）。<https://gangles.ca/talks/>
  - Game Accessibility Conference 2020：讲 60 多项无障碍设置如何规划、测试、迭代与交付。 预制作期就定下目标：延续 Uncharted 4 的运动障碍支持，给 HUD 和字幕加入缩放、颜色与对比选项，并让盲人玩家能不靠明眼人帮助通关。 重点讲高对比模式、声音提示等低视力 / 盲人功能，以及如何与顾问合作并把无障碍纳入常规试玩。
- **S048** ペルソナシリーズにおけるUIクリエイティブの手法 ～ペルソナ5のUI事例～（CEDEC+KYUSHU 2017 讲座报道）（ファミ通.com 报道；讲者 和田和久、須藤正喜（Atlus），2017）。<https://www.famitsu.com/news/201711/13145540.html>
  - Persona 3 时期预算有限又要换新形象，Atlus 于是把通常不起眼的 UI 强化为作品个性的门面——UI 被当作低成本提升体验与“包装”游戏资源的手段。 流程先定主色，同时定标题 logo 与关键字体；各作主色不同（P3 蓝、P4 黄、P5 红），P5 为突出红色几乎不用辅色。 制作：Photoshop 排版 → 动作设计师摆 3D 姿势 → 按最终姿势画 2D 决胜图；约千页规格书交给 UI 专属程序员，设计师在旁逐像素调整；为适配 PS3/PS4 分辨率准备可缩放的矢量路径。 华丽之外仍注重视线引导与信息明度分级；并认为给程序员留出发挥空间能提高 UI 品质。
- **S194** Apple WWDC23, Animate with springs。<https://developer.apple.com/videos/play/wwdc2023/10158/>
  - 弹簧动画用「时长 + 回弹」两个参数描述；默认回弹为 0，约 15% 细微、约 30% 明显，多数 UI 不宜超过 0.4；回弹量要与产品性格一致；弹簧可保留速度、被中途打断而不跳变。（引用于 P-motion-personality）
- **S195** GDC 2021 · Parker Hamilton: Exploration in Ghost of Tsushima: Letting the Island Guide You（2021）。<https://www.gdcvault.com/play/1027399/Exploration-in-Ghost-of-Tsushima>
  - Sucker Punch 用多种世界内手段（引导之风、烟柱、鸟、狐狸）让玩家看着世界而不是界面去发现内容。 即便把引导交给世界（风、烟、动物），作品仍保留可设定目标的地图与任务追踪作为后盾。 用多种世界内手段让玩家把视线留在岛上并发现内容，代替小地图与路点。（引用于 P-map-conventions、P-journal-codex、P-hudless-tax）
- **S196** John Nesky, 50 Camera Mistakes（GDC 2014）（2014）。<https://gdcvault.com/play/1021262/50-Camera>
  - 震屏过度、镜头随步伐上下晃都被列为镜头错误（编号据二手转述，见 06 文档）。（引用于 P-shake-hitstop）

### 访谈（7）

- **S037** A Deep Dive Into God of War Ragnarök's User Interface（80.lv 采访 Zach Bohn（Santa Monica Studio），2023）。<https://80.lv/articles/a-deep-dive-into-god-of-war-ragnar-k-s-user-interface>
  - HUD 分为战斗 HUD（生命、符文技能、怒气）与同伴 HUD（任务、日志、物品消息）；消息走单一队列，一次只显示一条；Boss 血条由专门管理器处理一到三个 Boss。 全作只用两种字体（标题 / 正文），由中央样式表统一管理；文字可放大到特大档，越大的档位步进越小以保持版面平衡。 上市时有 70 多项无障碍选项（完全重映射、高对比等），中期从 Naughty Dog 招了 UX / 无障碍设计师。 复杂菜单（如附魔）多次重做以平衡易用与信息量；教程尽量短，部分 UI 与系统在玩家到达前保持隐藏。
- **S043** Road to the IGF: Subset Games' Into the Breach（Joel Couture 采访 Justin Ma（Subset Games），2018）。<https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i->
  - 访谈主题之一是“让玩家读懂敌人的行动”：敌人提前预告攻击，每回合变成可研究的谜题。 即使知道敌人意图，闪避也可能让更重要的建筑挨打——预告信息把决策重心从“猜”转到“权衡”。 官方描述为极简回合战斗、所有敌方攻击都被预告，玩家每回合找最优应对。
- **S052** Disco Elysium: Working on UI Design（80.lv 报道 Robert Kurvitz（ZA/UM），2020）。<https://80.lv/articles/disco-elysium-working-on-ui-design>
  - 对话界面参考 Twitter 信息流：文字在右侧竖栏中向上滚动。 依据：读短帖的人往往只扫要点，因此对话按“可扫读”的节奏排版，并促使写作更短促有力。 （另据 Kurvitz 在 GameSpot 访谈中的说法转述）技能本身以说话者身份出现在对话流里，关键信息由不同技能多次重复以保持注意。（引用于 P-dialogue-presentation）
- **S057** Making Civilization VI both playable and beautiful（Game Developer（Gamasutra）采访 Brian Busatti（Firaxis 美术总监），2016）。<https://www.gamasutra.com/art/making-i-civilization-vi-i-both-playable-and-beautiful>
  - Busatti 强调形体与剪影，让镜头拉远时世界仍可读——策略游戏的美术风格必须先服务远景信息辨识。 （另据 Digital Trends、Twinfinite 对 Firaxis 的同期采访）整体风格以大航海时代古地图为母题：未探索区域画成羊皮纸素描，单位推进时手绘地图褪去露出真实地形。 美术不走卡通，而是在唤起古地图的同时保持明亮鲜艳；地图本身既是 UI 也是美术主体。
- **S058** Ghost of Tsushima: Your questions answered（Justin Massongill（PlayStation Blog），答问 Nate Fox, Jason Connell（Sucker Punch），2020）。<https://blog.playstation.com/2020/05/29/ghost-of-tsushima-your-questions-answered/>
  - 风是早期就定下的美术目标，后来团队测试其动态能否把玩家指向目的地，结果可行。 引导之风被打磨为指向当前追踪目标，也帮助找到可选收集品；同期其他访谈中开发者表示希望玩家看世界而不是看 UI，尽量少用 UI，但血条等必要信息保留。 生命条上的圆点代表“决心”，用于治疗或强力攻击——极简 HUD 仍保留关键资源。
- **S062** How to design a great Metroidvania map（PC Gamer（采访 Team Cherry 等开发者），2017）。<https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/>
  - Team Cherry 的 Ari Gibson 表示房间尺度与布局都围绕“发现感”构建，地图设计更多受 Metroid 影响。 游戏内地图需向 NPC Cornifer 购买、用羽毛笔并在长椅休息时才更新——把地图本身变成要“挣来”的资源，延续探索主题。 区域先在纸上模块化草拟，再填敌人、做内部测试。
- **S063** Street Fighter 6 director on hip hop and graffiti influence（IGN Japan 访谈的 EventHubs 英译报道）（EventHubs（Nicholas Taylor 译）；受访 Takayuki Nakayama, Shuhei Matsumoto（Capcom），2022）。<https://www.eventhubs.com/news/2022/jul/09/sf6-influence-hip-hop-graffiti>
  - 导演认为 Street Fighter 1 与 Third Strike 的界面和视觉早就受嘻哈与涂鸦影响，所以街头风格适合本系列。 SF6 把“街头”涂鸦美学贯穿 UI 与战斗演出；后续还加入可切换历代战斗 HUD 的选项。 说明格斗游戏 UI 风格常承担系列身份，而不只是信息容器。

### 开发者博客 / 官方说明（14）

- **S053** Clarity in League（Riot Games（League of Legends 开发团队），2021）。<https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/>
  - 把清晰度定义为玩家能理解场上发生了什么并作出反应：视觉与音效要让人快速认出英雄、技能与攻击。 注意力应与重要性匹配：强力、打断性、可躲避的技能要比次要效果更显眼，同时控制团战中的视听噪声总量。 英雄核心特征与朝向要能在剪影里读出，皮肤不得破坏它；皮肤技能必须至少与原皮一样清晰，且不能带来竞技优势。 早年地图更新也提出了层级：局内 UI > 技能与攻击 > 单位 > 环境，环境不应与玩法元素抢视觉。（引用于 P-priority-tiers、P-actionable-first、P-squint-test、P-hit-channel-split、P-damage-number-legibility、P-event-callout-tiers 等）
- **S054** Diablo IV Quarterly Update — February 2020（Luis Barriga, Angela Del Priore（首席 UI 设计师）, Candace Thomas（Blizzard），2020）。<https://news.blizzard.com/en-us/diablo4/23308274/diablo-iv-quarterly-update-february-2020>
  - 根据 BlizzCon 后的反馈，物品图标从“绘画感”转向基于 3D 模型的直接质感，降低图标底色亮度与饱和度，稀有度改由边框装饰表达。 PC 默认技能栏回到底部中央，离屏幕远的玩家可选左下角；主机保持角落布局；所有技能槽都可重绑。 首次 PC 与主机同步开发：统一的网格式布局让玩家在键鼠与手柄间无缝切换；双人同屏时两人可同时各开菜单。
- **S055** Frostpunk: Console Edition – Radial-Driven Design of Gameplay and Controls（Kuba Stokalski（11 bit studios 首席设计师），2019）。<https://news.xbox.com/en-us/2019/09/20/frostpunk-console-edition-radial-driven-design-of-gameplay-and-controls/>
  - 城市以发电机为圆心一圈圈生长，所以主机版 UI 从零按“圆”重做——界面形式呼应世界结构。 指挥中枢是一个大圆，外缘的小圆通向城市信息等其他页签；每个建筑类别（医疗、煤炭、住房等）各有自己的环形子菜单。 关键选项放在拇指易达的位置，便于手柄在菜单间快速切换；50 多种建筑被分组以降低负担。
- **S056** Console Dev Diary #3: UI/UX and Controls（Crusader Kings III）（Paradox Interactive / Lab42，2022）。<https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls>
  - 两个环形菜单（角色轮盘、地图视图）让玩家不必翻多层菜单就能换地图模式、用角色功能。 肩键打开顶层命令栏，扳机切换子菜单，十字键用于界面导航而不是模拟鼠标；每屏底部显示操作提示。 焦点切换系统让玩家在开着多个面板时仍能操作地图，减少打断性的全屏菜单。 背景：CK3 PC 版首创的嵌套提示（概念词可再悬停展开解释）后来被 Victoria 3 与 Europa Universalis V 沿用。（引用于 P-prompt-in-context、P-focus-unmistakable、P-radial-for-sticks）
- **S105** Celeste v1.4.0.0 更新日志。<https://maddymakesgamesinc.itch.io/celeste/devlog/237097/v1400-changelog>
  - 新增 50% 震屏档并设为默认；同时已有光敏模式。 震屏增加 50% 档并设为默认，另有光敏模式——默认值本身就可以是中档。（引用于 P-shake-hitstop、P-flash-motion-comfort）
- **S106** Deadline Fighter 开发日志 3（itch.io，独立开发者实践记录）。<https://elvenji.itch.io/deadline-fighter/devlog/957932/devlog-3-mejorando-enemigos-e-interfaz>
  - 作者用「两层条 + 计时器」做延迟血条，发现它让受击更容易被察觉、画面也更好看。属于实践记录，不是研究。（引用于 P-value-change-visible）
- **S107** EA, Follow the Red: Runner's Vision in Mirror's Edge Catalyst。<https://ea.com/news/runners-vision-in-mirrors-edge-catalyst>
  - 零 HUD 跑酷用红色高亮可攀爬物引路，并提供关闭 / 经典 / 完整三档。 引路高亮提供关闭、经典、完整三档，由玩家决定要多少帮助。（引用于 P-hudless-tax、P-adaptive-layers）
- **S108** God of War Ragnarök accessibility options (PlayStation)。<https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/>
  - 官方列出 70 多项无障碍功能并按视觉 / 听觉 / 动效 / 操作分预设——用来对照它在 R3 里仍被提到字小。 按视觉 / 听觉 / 动效减少 / 操作分预设；高对比 HUD、高对比过场、多类对象独立选色等具体条目据第三方选项清单整理，未逐项核对官方页。 70 多项无障碍功能分为视觉、听觉、动效减少、操作四套预设。（引用于 P-view-distance、P-text-size-floor、P-high-contrast-and-recolor、P-a11y-presets-discoverable）
- **S109** PlayStation Blog · How Baldur's Gate 3 adapts its gameplay for DualSense。<https://blog.playstation.com/2023/09/05/how-baldurs-gate-3-adapts-its-expansive-rpg-gameplay-for-your-dualsense-controller/>
  - 主机版把 PC 的常驻动作栏改成可自定义的径向菜单，地图、日志、法术书等由扳机键呼出的大轮盘进入（引用于 P-radial-for-sticks）
- **S110** PlayStation Blog: Lucas Pope on Return of the Obra Dinn's art style。<https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style>
  - 做 1 位色画面时，作者把可读性放在最高优先级：几何描边、尽量少用抖动。哪怕是最极端的媒介，可读性仍然排第一。（引用于 P-medium-constraints）
- **S111** PlayStation Blog: The Last of Us Part II Accessibility Features Detailed。<https://blog.playstation.com/2020/06/09/the-last-of-us-part-ii-accessibility-features-detailed/>
  - 60 多项无障碍设置彼此配合，因此提供视觉、听觉、运动三套预设一次配好，玩家之后仍可逐项调整。 低视力预设一并打开高对比显示、大号 HUD 与导航 / 攀爬辅助——极简 HUD 作品用可选辅助层兜底。 用预设一键打开大号 HUD、高对比显示、导航辅助等一组选项，之后可逐项调整。（引用于 P-settings-page、P-hudless-tax、P-adaptive-layers）
- **S112** The Last of Us Part II 无障碍选项（PlayStation 官方页）。<https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/>
  - 提供高对比显示（专门的渲染模式增强游戏内元素对比）、HUD 缩放、HUD 背景加深与换色、强化聆听模式等。 HUD 底可选默认 / 浅 / 加深三档，HUD 颜色有白、黄、蓝、红、绿可选——把「底」做成玩家选项的现成例子。 High Contrast Display 渲染模式、HUD 尺寸默认 / 大、HUD 颜色五选、HUD 底三档；视觉预设一键打开高对比与大 HUD，之后每项仍可单调。（引用于 P-world-legibility-guard、P-text-over-live-scene、P-high-contrast-and-recolor、P-a11y-presets-discoverable、P-adaptive-layers）
- **S113** Xbox Wire: Studio MDHR 谈 Cuphead 本地化。<https://news.xbox.com/en-us/2019/04/19/studio-mdhr-interview-cuphead-localization/>
  - 日、韩、中文的手写标题由各自的书法家完成，先统一风格方向，再给书法家创作空间；参照的是 1930 年代的海报、卡片和书籍。（引用于 P-title-lettering、P-localization-ready）
- **S114** Yacht Club Games: Breaking the NES。<https://www.yachtclubgames.com/blog/breaking-the-nes/>
  - Shovel Knight 保留了 NES 的观感（色板、顶部状态栏），但去掉了闪烁等伤害体验的限制。借媒介时可以只借观感，不借毛病。 保留 NES 的纵向分辨率、色板和状态栏习惯，只补了几种“作弊色”，去掉闪烁这类伤害玩法的限制，把限制当成“画面别太乱”的设计指引。 保留 NES 的观感（色板、状态栏习惯），去掉闪烁等伤害体验的限制：模仿一种媒介时只借观感，不借毛病。（引用于 P-channel-borrowing、P-medium-constraints、P-medium-simulation）

### 规范与指南（63）

- **S031** 10 Usability Heuristics for User Interface Design（Jakob Nielsen（Nielsen Norman Group），1994）。<https://www.nngroup.com/articles/ten-usability-heuristics/>
  - 与 Rolf Molich 1990 年共同提出、1994 年修订，2024 年仍在更新的十条通用可用性启发式。 包括：系统状态可见、贴合真实世界、用户可控可撤销、一致与标准、防错、识别优于回忆、灵活高效、美观且极简、帮助识别和恢复错误、帮助文档。 游戏启发式（HEP、Pinelle 等）大多以它为母本改写，适合用作菜单 / 设置 / 背包等非战斗界面的基线检查。（引用于 P-menu-architecture、P-inventory-capacity-model、P-item-decision、P-journal-codex、P-progression-graph、P-craft-recipe）
- **S066** Game Accessibility Guidelines（Barrie Ellis, Gareth Ford-Williams, Lynsey Graham, Dimitris Grammenos, Ian Hamilton, Headstrong Games, Ed Lee, Jake Manion, Thomas Westin 等，2012）。<https://gameaccessibilityguidelines.com/full-list/>
  - 按基础 / 中级 / 高级三档组织，分档依据为受益人数、影响程度与实现成本；再按运动、认知、视觉、听觉、言语、通用分类。 视觉基础项：文字 / UI 与背景高对比、易读的默认字号、不只靠颜色传达关键信息、交互元素大且间距足。 视觉中级项：临时关键信息不要放在视线之外、可调准星颜色样式、可调对比、界面可缩放、可关闭背景运动；高级项：字号可调、可隐藏所有非交互元素。 认知与听觉：避免闪烁与重复图案；字幕清晰、可自定义、在任何声音出现前就能开启。（引用于 P-a11y-presets-discoverable、P-scoreboard-team-id）
- **S067** Xbox Accessibility Guidelines (XAG)（Microsoft（与行业专家及玩家残障社群共同制定），2023）。<https://learn.microsoft.com/en-us/gaming/accessibility/guidelines>
  - 当前为 3.2 版（2023-06）：给设计者当灵感来源、给开发者当护栏、给测试团队当验证清单，但不作为合规认证。 每条 XAG 包含目标、概览、范围问题、关键区域、实施准则、示例与潜在受影响玩家。 核心条目覆盖文字显示（101）、对比度（102）、视听信息的额外通道（103）、字幕（104）等，可直接映射为 UI 参数的取值下限。
- **S068** XAG 101: Text display（Microsoft，2023）。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101>
  - 按平台给出默认文字最小高度（从最低下伸部到最高上伸部计）：主机 1080p 为 26 像素、4K 为 52；PC/VR 1080p 为 18、4K 为 36；移动端随 DPI 线性放大。 这些是出厂默认下限：文字应能放大到最小值的 200% 而不丢内容，图标 / 按键图标内的文字也要满足最小字号并随文字缩放。 至少提供一种无衬线字体；使用风格化字体时要提供非风格化替代；字体需覆盖所有支持语言的完整字符集。 多行文本：行宽不超过 80 字符（中日韩 40 字）、行距至少 1.5 倍、段距为行距 2 倍；按语言左 / 右对齐，避免居中或两端对齐长文。（引用于 P-glance-encoding、P-glyph-follows-device、P-prompt-in-context、P-view-distance、P-shared-screen、P-text-size-floor 等）
- **S069** XAG 102: Contrast（Microsoft，2023）。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102>
  - 对比度检查不只针对文字，也覆盖 HUD 元素（生命条、小地图元素、方向提示）、按钮、滑条、按键图标与承载关键信息的图像。 阈值：常规文字与关键视觉元素 4.5:1，大字与大元素 3:1，非激活元素文字 3:1；提供亮 / 暗高对比模式，开启后所有 UI 元素不低于 7:1；非纯色背景按对比最低处计算。 高对比模式的真正目的不只是黑白分离，而是提高重要元素的可见度、拉开不同类重要元素之间以及重要与次要元素之间的区分。 可让玩家自选前景 / 背景色、文字底板（可调不透明度）或描边；不要只靠颜色（红绿搭配常对色盲失效）；对比应可配置而非一味最大。（引用于 P-focus-unmistakable、P-text-over-live-scene、P-high-contrast-and-recolor）
- **S070** Accessible Player Experiences (APX)（The AbleGamers Charity（与 University of York 的 Paul Cairns、Christopher Power 研究合作），2019）。<https://accessible.games/accessible-player-experiences/>
  - 22 个模式呈金字塔：底层“可达”12 个（分控制与呈现两类），中层“挑战”10 个，顶层是团队共享的无障碍设计语言。 呈现类模式与 UI 直接相关：第二通道、清晰文字、灵活显示、个性化界面、区分此与彼、清晰通道等。 挑战类模式（放慢、跳过、练习场、随时存档等）主张让难度可调而不是删除挑战；资源有限时先做“可达”层。
- **S071** Designing for games（Apple Human Interface Guidelines）（Apple，2024）。<https://developer.apple.com/design/human-interface-guidelines/designing-for-games>
  - 尽快让玩家进入游戏：首包可玩、其余后台下载；按设备与辅助功能设置给出合理默认值；用可玩的教学教机制，权限请求放到相关时机。 文字需与背景有足够对比并满足平台最小字号（如 iOS 11pt、tvOS 23pt）；触控按钮默认至少 44×44pt、iOS 上不小于 28×28pt，虚拟按键叠在内容上方。 遵守安全区与屏幕形状，菜单适配 16:10、19.5:9、4:3 等比例与横竖屏，优先相对约束而非固定布局。 不只靠颜色传达关键信息，提供字幕；允许调整字号、操作映射、运动强度与音量平衡。
- **S072** Adding virtual controls to games that support game controllers in iOS（Apple（Game Controller 框架文档），2021）。<https://developer.apple.com/documentation/gamecontroller/adding-virtual-controls-to-games-that-support-game-controllers-in-ios>
  - 无实体手柄时默认显示虚拟手柄，接上实体手柄后自动隐藏——触屏 HUD 应随输入方式切换。 玩家当前不能执行的动作要隐藏对应按键（例如过场时只留跳过键）。 为沉浸与性能可自绘虚拟控件，用代表实际动作的符号代替通用按钮符号；控件区域按视图尺寸计算并放在安全区内（摇杆左下、主按钮右下）。
- **S073** Web Content Accessibility Guidelines (WCAG) 2.2（W3C，2023）。<https://www.w3.org/TR/WCAG22/>
  - W3C 推荐标准（2023 发布，2024-12 更新）；虽面向网页，但对比度公式与阈值是游戏 UI 对比检查的通用基准。 1.4.3 文字对比至少 4.5:1（大字 3:1）；1.4.6 增强级 7:1；1.4.11 非文字（UI 部件状态、关键图形）至少 3:1。 1.4.4 文字可放大到 200% 不丢内容；2.4.7 / 2.4.11 焦点可见且不被遮挡——对应手柄导航时的选中态设计。（引用于 P-world-legibility-guard、P-detail-without-hover）
- **S124** AbleGamers / accessible.games, Personal Interface。<https://accessible.games/accessible-player-experiences/access-patterns/personal-interface/>
  - 让玩家按需显示、隐藏、缩放、固定或重排界面组件。 让玩家显示、隐藏、缩放、固定或重排界面组件；举了 Fortnite 移动版布局工具和 Battlefield 1 小地图尺寸 / 透明度的例子。（引用于 P-contextual-hud、P-adaptive-layers）
- **S125** AbleGamers APX: Clear Text。<https://accessible.games/accessible-player-experiences/access-patterns/clear-text/>
  - 让玩家改字号、对比与颜色、字体、字幕底和对话节奏；举 Hitman (2016) 五档字幕字号带实时预览为例。 举 Assassin's Creed Origins：字幕下有深色底、说话人名写在字幕上方；Grand Kingdom 有自动播放与回看日志。（引用于 P-view-distance、P-text-size-floor、P-subtitles-captions）
- **S126** AbleGamers APX: Distinguish This From That。<https://accessible.games/accessible-player-experiences/access-patterns/distinguish-this-from-that/>
  - 让玩家改色、在颜色旁加符号、提高前景与背景对比；举例包括三消游戏的色盲模式在珠子上叠符号、射击游戏把小地图敌我图标改色。（引用于 P-color-never-alone、P-icon-system）
- **S127** Android Developers · Make apps more accessible。<https://developer.android.com/guide/topics/ui/accessibility/apps>
  - 触屏交互元素的触控区域至少 48×48dp，越大越好；鼠标等精确输入可以更小（引用于 P-touch-target-size）
- **S128** Android Developers · TV layouts。<https://developer.android.com/design/ui/tv/guides/styles/layouts>
  - 960×540dp 画布上留约 5% 过扫描边（左右约 48dp、上下约 27dp），背景图不要裁到安全区内（引用于 P-view-distance）
- **S129** Apple Human Interface Guidelines · Game controls。<https://developer.apple.com/design/human-interface-guidelines/game-controls>
  - 按实际连接的手柄品牌显示标签，优先用符号而非文字；触屏虚拟按钮用表示动作的图形，不要写手柄键名；菜单外的标准映射是 A 激活、B 取消 / 返回、肩键切分区 常用触控 ≥ 44×44pt、次要 ≥ 28×28pt；按钮放在拇指可达、安全区内；移动在左、镜头在右；按下状态要在手指遮挡时仍可见；按情境显隐控件、合并功能、能用手势就别放按钮 常用控件放在拇指可达处，菜单等次要控件放到屏幕顶部（引用于 P-glyph-follows-device、P-touch-target-size、P-portrait-one-hand、P-detail-without-hover、P-input-parity、P-shared-screen 等）
- **S130** Apple Human Interface Guidelines · Layout（tvOS）。<https://developer.apple.com/design/human-interface-guidelines/layout>
  - tvOS 主要内容上下内缩 60pt、左右 80pt，以免被过扫描切掉 背景插画在加黑边或极宽窗口里不要改变宽高比，按比例放大铺满，并预期它会超出常规可见区（引用于 P-view-distance、P-aspect-anchor）
- **S131** Apple Human Interface Guidelines: Accessibility。<https://developer.apple.com/design/human-interface-guidelines/accessibility>
  - 可点击控件至少 44×44pt（页面本次未能抓取正文，按 Apple 公开的通用规范记录，未逐字核对）。（引用于 P-touch-target-size）
- **S132** Apple Human Interface Guidelines: Typography。<https://developer.apple.com/design/human-interface-guidelines/typography>
  - 自定义字体必须易读；游戏要在每个平台分别测文字可读性；细字重要比推荐字号更大；自定义字体也要支持字号调节等辅助功能。（引用于 P-type-two-tier）
- **S133** Game Accessibility Guidelines · Avoid / provide alternatives to requiring buttons to be held down。<https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/>
  - 需要持续按住的操作应提供替代（如切换式），因为长按对部分玩家是障碍（引用于 P-confirm-by-input）
- **S134** Game Accessibility Guidelines · Ensure all areas of the UI can be accessed using the same input method as the gameplay。<https://gameaccessibilityguidelines.com/ensure-that-all-areas-of-the-user-interface-can-be-accessed-using-the-same-input-method-as-the-gameplay/>
  - 能用某种输入玩游戏，就应能用它操作全部菜单；举了键盘游戏配鼠标菜单、只能 D-pad 不能摇杆等反例（引用于 P-input-parity）
- **S135** Game Accessibility Guidelines · Ensure interactive elements / virtual controls are large and well spaced。<https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/>
  - 触屏目标研究上理想约 2.4cm，手机上最少约 0.96cm；按钮靠得近时要更大（引用于 P-touch-target-size）
- **S136** Game Accessibility Guidelines, Avoid flickering images and repetitive patterns。<https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/>
  - 避免超过 5 秒的闪烁、每秒超过 3 次且占 25% 以上屏幕的闪光；突然的大幅亮度变化和与红色之间的切换也算闪光；可用 Harding 测试。 闪烁阈值：3 次 / 秒、25% 屏幕面积、整段 5 秒；红色变化算闪；重复条纹的条数阈值；推荐 Harding 测试，不要称「癫痫安全」。（引用于 P-meta-perception、P-flash-motion-comfort）
- **S137** Game Accessibility Guidelines, Ensure no essential information is conveyed by a colour alone。<https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-colour-alone/>
  - 关键信息除了颜色，还要有形状、文字或图标等第二种通道。 关键信息除颜色外再配文字、符号、图案或形状；做不到时允许玩家自定义相关颜色。 节点状态除颜色外要有形状、符号或文字作第二信号。（引用于 P-damage-number-legibility、P-item-decision、P-progression-graph、P-shared-screen、P-color-never-alone、P-palette-roles）
- **S138** Game Accessibility Guidelines: Allow controls to be remapped / reconfigured。<https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured>
  - 改键是最有价值的无障碍功能之一；预设省事但不够，应同时给预设与完全自定义；改键并不会造成平台认证问题。（引用于 P-motor-input-alternatives）
- **S139** Game Accessibility Guidelines: Allow interfaces to be resized。<https://gameaccessibilityguidelines.com/allow-interfaces-to-be-resized/>
  - 先给好的默认尺寸，再让玩家放大或缩小界面：适配不同屏幕、帮助看不清小字与小图标的玩家、帮助精细操作困难的玩家；缩小则能多看画面。（引用于 P-text-size-floor）
- **S140** Game Accessibility Guidelines: Provide a manual save feature。<https://gameaccessibilityguidelines.com/provide-a-manual-save-feature/>
  - 只在检查点存档会排斥只能短时间游玩或可能被突然打断的玩家，应提供手动存档并配合自动存档。（引用于 P-save-continuity）
- **S141** Game Accessibility Guidelines: Use an easily readable default font size。<https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/>
  - 引用 10 英尺界面经验：1080p 电视 28px 是下限而不是目标；最理想是让玩家自选字号，做不到时至少默认就大。（引用于 P-view-distance、P-text-size-floor）
- **S142** Game Accessibility Guidelines: present subtitles / captions in a clear, easy to read way。<https://gameaccessibilityguidelines.com/if-any-subtitles-captions-are-used-present-them-in-a-clear-easy-to-read-way/>
  - 字号 ≥ 46px@1080p（默认或可调）、实底或半透明底、每行约 40 字符、两行为限；与美术冲突时可读性优先，用选项兼顾两者。（引用于 P-subtitles-captions）
- **S143** Game Accessibility Guidelines（Basic）。<https://gameaccessibilityguidelines.com/basic/>
  - 关键信息不能只靠颜色传达，要配符号或可换色；避免闪烁画面与重复图案。（引用于 P-meta-perception、P-teach-then-retire）
- **S144** Jakob Nielsen, Response Times: The 3 Important Limits（Nielsen Norman Group）。<https://www.nngroup.com/articles/response-times-3-important-limits/>
  - 约 0.1 秒内的响应让人觉得即时，结果本身就是反馈；约 1 秒内思路不断；超过 10 秒必须给进度与取消。 0.1 秒内感觉即时，1 秒内思路不断，10 秒是注意力上限——高频界面的转场应落在第一档。 超过约 10 秒的等待会让人分心，必须能看到进度或取消——长结算演出要可跳过。（引用于 P-value-change-visible、P-transition-frequency、P-result-tally、P-fail-retry、P-frontend-loading）
- **S145** Laws of UX: Law of Similarity。<https://lawsofux.com/law-of-similarity/>
  - 外观相似的元素会被看成一组。UI 与画面越像，越容易被看成世界的一部分，可交互元素就需要和普通内容有明显区别。（引用于 P-harmony-four-relations、P-icon-system）
- **S146** Laws of UX: Von Restorff Effect。<https://lawsofux.com/von-restorff-effect/>
  - 一组相似元素里与众不同的那个最容易被记住，但强调要克制：强调的东西太多就都不突出了，而且不能只靠颜色。 与众不同的元素最容易被注意，但强调过多就互相抵消。（引用于 P-palette-roles、P-contrast-with-reason）
- **S147** Microsoft · Designing for Xbox and TV。<https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv>
  - 从电视一边导航到另一边不应超过六次点击；焦点要清楚且不会被误认 10 英尺体验约 3m 视距；电视信息量应接近手机而非桌面；交互与文字避开边缘 5%（960×540 epx 下上下 27、左右 48）；背景可出血；尽量不用 tooltip；电视色彩差异大 背景和导航面板可以画到屏幕边缘以免「被框住」，交互与文字留在安全区内（引用于 P-focus-unmistakable、P-view-distance、P-aspect-anchor、P-detail-without-hover）
- **S148** Microsoft · Gamepad and remote control interactions。<https://learn.microsoft.com/en-us/windows/apps/design/input/gamepad-and-remote-interactions>
  - B 用于返回时界面上不必再画返回按钮；Menu 键打开上下文菜单、Y 作搜索加速键 屏幕上应始终有一个可见焦点；初始焦点放在最可能先操作的元素；XY 导航会出现走不到的元素和长列表陷阱，可用「焦点进入」或重排解决；地图类自由画布才用指针模式 右键的上下文菜单在手柄上用 Menu 键打开；只有文字的滚动区域需要「焦点进入」才能读完（引用于 P-prompt-in-context、P-focus-unmistakable、P-detail-without-hover）
- **S149** NHTSA, Visual-Manual Driver Distraction Guidelines（2012 年提案说明，2013 年发布第一阶段）（2012）。<https://www.nhtsa.gov/sites/nhtsa.gov/files/strickland-distraction_guidelines_03122012.pdf>
  - 车载界面任务的单次视线离开不应超过 2 秒、总计不超过 12 秒——高压实时情境下的「一瞥预算」参考。（引用于 P-glance-encoding）
- **S150** Nielsen Norman Group, Progressive Disclosure。<https://www.nngroup.com/articles/progressive-disclosure/>
  - 先只展示少数最重要的选项，专门功能按需展开；两层以上的披露通常损害可用性；展开入口要明显并标清会看到什么。（引用于 P-progressive-disclosure）
- **S151** Nielsen Norman Group, Squint Test（视频）。<https://www.nngroup.com/videos/squint-test/>
  - 眯眼或轻度模糊可以快速找出最抢注意力的元素，检查高优先级内容是否真的最突出。（引用于 P-squint-test）
- **S152** Nielsen Norman Group, Visual Hierarchy in UX: Definition。<https://www.nngroup.com/articles/visual-hierarchy-ux-definition/>
  - 层级靠尺寸、颜色 / 对比、位置、留白等手段建立，并用眯眼 / 模糊检查是否符合本意。 用不同模糊半径看页面：小半径看分组，大半径常暴露出某个强色块意外成为主角——内容（图片、特效）也会改变层级。（引用于 P-priority-tiers、P-squint-test）
- **S153** Nielsen Norman Group: Flat Design – Its Origins, Its Problems, and Why Flat 2.0 Is Better for Users。<https://www.nngroup.com/articles/flat-design/>
  - 拟物借现实物件的隐喻提示用法；纯装饰性的真实纹理不提供隐喻；扁平化会丢掉“能点”的提示，所以推荐 Flat 2.0 这类折中。材质要服务于“它是什么、怎么用”。 扁平化常常把潮流外观放在用户需求之前，丢掉“能点”的提示；Flat 2.0 用少量阴影和层次找回提示。中性不是去掉一切，而是留下必要的提示与一个声部。（引用于 P-material-from-world、P-neutral-one-voice）
- **S154** Nielsen Norman Group: Glassmorphism。<https://www.nngroup.com/articles/glassmorphism/>
  - 背景越花模糊要越重，并提供降低透明 / 提高对比的选项（06 文档已引用）。（引用于 P-text-over-live-scene）
- **S155** Nielsen Norman Group: Tabs, Used Right。<https://www.nngroup.com/articles/tabs-used-right/>
  - 页签只用于分组清晰的内容；数量要少，放在面板上方、单行；选中态至少两种视觉提示；需要跨页签对比时不该用页签。（引用于 P-menu-architecture）
- **S156** Nielsen Norman Group: The Aesthetic-Usability Effect。<https://www.nngroup.com/articles/aesthetic-usability-effect/>
  - 好看的界面会被认为更好用，用户也更能容忍小毛病，但掩盖不了严重的可用性问题。同一媒介换来的好感抵消不了读不清。（引用于 P-harmony-four-relations）
- **S157** Steamworks: Steam Deck Compatibility Review Process。<https://partner.steamgames.com/doc/steamdeck/compat>
  - 界面文字要在约 30cm 视距可读：1280×800 下最小字形高 9px，建议 12px；鼓励提供字号调节。 屏幕上的按键字形必须与正在使用的输入一致（Deck / Steam 手柄 / Xbox），默认配置下用 Deck 控件时不得出现键鼠字形；需要输入文字时必须能调出屏幕键盘 界面文字要在约 30cm 外易读：1280×800 下最小字符不低于 9px，建议 12px，并建议提供可调字号与对比度（引用于 P-settings-page、P-glyph-follows-device、P-view-distance、P-input-parity、P-motor-input-alternatives）
- **S158** W3C Understanding SC 1.4.11 Non-text Contrast。<https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html>
  - 组件被聚焦时，其焦点指示对相邻颜色须 ≥ 3:1；与 2.4.7 焦点可见配合使用。 控件边界、选中 / 焦点等状态指示、理解内容所需的图形，对相邻颜色至少 3:1。（引用于 P-focus-unmistakable、P-text-over-live-scene）
- **S159** W3C WCAG 2.1: 1.4.3 Contrast (Minimum)。<https://www.w3.org/TR/WCAG21/#contrast-minimum>
  - 正文对比度至少 4.5:1。纹理底要按最不利的局部测，不能按平均色测。 正文对比度至少 4.5:1。UI 跟着场景换色时，每一套色板都要单独达标。（引用于 P-material-from-world、P-follow-world-over-time）
- **S160** W3C, Understanding WCAG 2.3.3 Animation from Interactions。<https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html>
  - 由交互触发的非必要运动动画应能关闭；示例之一就是在减少动效开启时关掉翻页转场。 由交互触发的非必要动效应可关闭；前庭障碍会被视差、缩放等引起眩晕；可读取系统的减少动效偏好。（引用于 P-transition-frequency、P-flash-motion-comfort）
- **S161** Xbox Accessibility Guideline 103: Additional channels for visual and audio cues。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103>
  - 关键信息用颜色表达时至少再加形状、图案、图标或文字之一；颜色是主要手段时要允许玩家改色（预设或自由取色）；变灰表示不可用时要另加手段；模拟滤镜不能替代真人测试。 颜色是主要信息手段时，玩家应能用预设或自由取色改掉；举 Forza Horizon 4 的三种色盲预设 + 高对比模式、Call of Duty: Black Ops Cold War 的小地图图标逐类选色。（引用于 P-color-never-alone、P-high-contrast-and-recolor、P-audio-haptic-pairing、P-scoreboard-team-id）
- **S162** Xbox Accessibility Guideline 104: Subtitles and captions。<https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104>
  - 新说话人出现时标名字；用颜色区分说话人时必须同时有名字；每行 ≤ 40 字符、最多 2 行（特殊时 3 行）；提供实底并可调不透明度；字号可放大到最小值的 200%；设置要有实时预览。 所有语音都有字幕、换说话人时标名、离屏用箭头；字幕默认开或开场前可设；字号过 XAG 101 下限并可放大到 200%；每行不超过约 40 字符、最多两行、混合大小写、至少一种无衬线；底板颜色与 0–100% 不透明度可调；设置有真实画面预览；三类字幕可分开开关。 Gears 5 首启字幕即开、开场后进入无障碍设置；The Outer Worlds 为每档字幕写清含义；字幕设置给真实画面预览。（引用于 P-dialogue-presentation、P-subtitles-captions、P-a11y-presets-discoverable）
- **S163** Xbox Accessibility Guideline 107（输入）。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107>
  - 所有操作都应可重映射；改键后提示、教程、按键图中的标注要同步正确 菜单与游戏内界面都要支持数字与模拟导航，可用单键、非同时按键完成全部操作。 手机触控目标建议约 15mm、平板约 24mm；目标间留足间隔或无效区；允许调整大小 / 间距 / 位置并提供预设布局；抬起时触发；提供简化操作（自动拾取、自动开火）（引用于 P-glyph-follows-device、P-focus-unmistakable、P-touch-target-size、P-portrait-one-hand、P-input-parity、P-confirm-by-input 等）
- **S164** Xbox Accessibility Guideline 108: Difficulty options。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-108-difficulty-options>
  - 同时提供手动存档与自动存档，让玩家重试时不会损失大量进度。（引用于 P-save-continuity）
- **S165** Xbox Accessibility Guideline 109: Objective clarity。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-109-objective-clarity>
  - 提供可选的路点 / 路径标记与方向提示，玩家久无进展时出现；给出收集与区域完成度的数字进度。 玩家应随时能查看当前任务与目标，描述具体、面向动作；保留已完成任务日志，最好主线 / 支线分开；提供剧情回顾。 存档文件应带截图、时间戳、地点与进度 / 目标的简述，让玩家读档前就知道自己在哪；并提供剧情回顾。（引用于 P-map-conventions、P-journal-codex、P-save-continuity、P-teach-then-retire）
- **S166** Xbox Accessibility Guideline 112: UI navigation。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-112-ui-navigation>
  - 导航顺序全游戏一致；确认 / 返回 / 页签 / 翻页的按键处处相同；每个子菜单都要有固定的路回到主菜单；跨多屏的复杂内容给不止一种找法（筛选页签 + 搜索）。 跨多屏的大量内容至少要给两种查找方式，例如带筛选的页签加搜索。 无障碍设置必须从启动起就能到达：首屏引导配置、默认开启合规选项，或读取平台偏好。（引用于 P-menu-architecture、P-inventory-capacity-model、P-settings-page、P-prompt-in-context、P-focus-unmistakable、P-input-parity 等）
- **S167** Xbox Accessibility Guideline 113: UI focus handling。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-113-ui-focus-handling>
  - 对话框出现时焦点移到其中第一个可交互控件，打开期间焦点不能跑到框外；焦点指示永远可见。 焦点指示要高可见，可叠用描边、放大 / 加粗、对比底色，形成冗余。（引用于 P-pause-world-state、P-item-decision）
- **S168** Xbox Accessibility Guideline 114: UI context。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context>
  - 玩家应随时能看出自己在菜单层级的哪一层（例如 主菜单 > 设置 > 音频）；复用的组件外观与行为保持一致。 长列表应提供更快的输入方式（如输入即检索）；复用组件的图标、标签与受限状态的表现保持一致。 标签要说明控件的用途与操作方式；理解玩法所需的界面文字应浅白易懂，游戏内术语要有解释。（引用于 P-menu-architecture、P-inventory-capacity-model、P-choice-framing、P-progression-graph、P-settings-page）
- **S169** Xbox Accessibility Guideline 116: Time limits。<https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-116-time-limits>
  - 时间限制只在不可避免时使用，并让玩家能延长或关闭；实时菜单等于给操作加了时间压力，应当配可选的缓解手段。 对白、教程这类屏幕文字的停留时长应可调（至少到默认的 10 倍）或可关闭自动消失、改为按键推进。 时间限制只在必要时使用，提前用不止一种方式预警，允许延长（至少到 10 倍）或关闭。（引用于 P-pause-world-state、P-dialogue-presentation、P-choice-framing）
- **S170** Xbox Accessibility Guideline 117: Visual distractions and motion settings。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117>
  - 闪烁、移动的内容要能暂停或关闭；震屏、镜头晃动、运动模糊应避免或可关；举例 Halo Infinite 允许玩家把径向模糊、震屏、整屏效果、速度线各自从 0 调到 100%。 会自动更新、滚动或闪动的内容要允许玩家暂停、隐藏或控制更新频率；文字背后有动态画面时可提供不透明底板。 闪烁、滚动、自动更新的内容要能暂停、隐藏或关闭；避免或可关震屏、头部晃动、动态模糊；FOV 与镜头自动回中可调；举 Halo Infinite 的逐项滑条、Cyberpunk 2077 的附加镜头运动、HyperDot 的背景动画开关。（引用于 P-meta-perception、P-event-callout-tiers、P-flash-motion-comfort、P-adaptive-layers）
- **S171** Xbox Accessibility Guideline 118: Photosensitivity。<https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118>
  - 亮度闪光与红色闪光都以约每秒 3 次、约 20% 屏幕面积为失败阈值；饱和红的判定更严；对策是去饱和、降对比、降频率、缩面积；所有游戏都应做光敏测试。 首选是从内容里消除光敏触发，而不是只放警告页；约 4000 人中有 1 人光敏。（引用于 P-meta-perception、P-flash-motion-comfort）
- **S197** W3C, Requirements for Chinese Text Layout（中文排版需求，clreq）（W3C Chinese Layout Task Force，2023）。<https://www.w3.org/TR/clreq/>
  - 中文排版的标点挤压、行首行尾禁则（句号、逗号不出现在行首，开引号不出现在行尾）、直排与横排的差异。 中西文混排时要处理基线、间距与字体回退。（引用于 P-localization-ready）
- **S198** W3C, Requirements for Japanese Text Layout（日文排版需求，jlreq）（W3C Japanese Layout Task Force，2020）。<https://www.w3.org/TR/jlreq/>
  - 日文的禁则处理、直排时的标点与数字方向、注音（ruby）的排布。（引用于 P-localization-ready）
- **S199** Unicode Standard Annex #14: Unicode Line Breaking Algorithm（Unicode Consortium）。<https://www.unicode.org/reports/tr14/>
  - 给出各类字符在什么位置允许断行；引擎的自动换行一般以它为基础，中日韩文字可以在字间断行、标点有禁则。（引用于 P-localization-ready）
- **S202** Apple Human Interface Guidelines: Playing haptics（Apple）。<https://developer.apple.com/design/human-interface-guidelines/playing-haptics>
  - 触觉要和视觉、声音同步，并且与事件的分量相称；不要滥用，玩家应能关闭。（引用于 P-audio-haptic-pairing）
- **S203** Apple Human Interface Guidelines: Spatial layout（visionOS）（Apple）。<https://developer.apple.com/design/human-interface-guidelines/spatial-layout>
  - 空间界面放在视野中央、舒适距离处，避免要求用户大幅转头；内容随头部移动会让人不适，宜固定在世界或身体上。（引用于 P-vr-spatial-ui）
- **S204** Apple Human Interface Guidelines: Icons（Apple）。<https://developer.apple.com/design/human-interface-guidelines/icons>
  - 一套界面里的图标保持统一的视觉重量、线宽与透视；在小尺寸下先保证可辨认，必要时配文字。（引用于 P-icon-system）

### 技术文档（11）

- **S115** Bevy 官方示例 2D screen shake（按该演讲实现）。<https://bevy.org/examples/camera/2d-screen-shake/>
  - trauma 在 0–1 之间并随时间衰减；只在渲染时偏移镜头，游戏逻辑不受影响；位移有上限、由噪声函数驱动。（引用于 P-shake-hitstop）
- **S116** Coherent Gameface 指南 · Handling Aspect Ratios with Media Queries。<https://guide.coherent-labs.com/layout-assets-and-styling/styling--scalability/handling-aspect-ratios-with-media-queries/>
  - 贴极端边缘的元素在超宽上相距过远；建议关键 HUD 放进居中、限宽的安全层，沉浸元素放全屏边缘层，再按比例微调（引用于 P-aspect-anchor）
- **S117** Godot Docs · Multiple resolutions。<https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html>
  - 竖屏游戏建议 720×1280 基准与 portrait 朝向，stretch aspect 用 expand，UI 用锚点贴边以适应 18:9 / 19:9 长屏 超宽与长屏都已常见，推荐 stretch mode = canvas_items + aspect = expand，Control 锚到正确的角；keep 模式会加黑边；content_scale_factor 可在运行时整体缩放 UI stretch mode / aspect 与 content scale factor 的用法，是 a11y.uiScale 导出到 Godot 的落点。（引用于 P-portrait-one-hand、P-aspect-anchor、P-text-size-floor）
- **S118** Godot Docs: InputMap。<https://docs.godotengine.org/en/stable/classes/class_inputmap.html>
  - 运行时增删动作的输入事件，是改键与按键提示同步在 Godot 里的落点。（引用于 P-motor-input-alternatives）
- **S119** Godot 文档：Label3D。<https://docs.godotengine.org/en/stable/classes/class_label3d.html>
  - Label3D 可设置朝向镜头的公告板模式、固定屏幕大小（不随距离缩放）以及关闭深度测试（总画在最上层）。 fixed_size 让标签不随距离缩放，no_depth_test 让它画在其它物体之上。（引用于 P-spatial-render-budget、P-world-legibility-guard、P-world-space-text）
- **S120** Godot 文档：SubViewport。<https://docs.godotengine.org/en/stable/classes/class_subviewport.html>
  - SubViewport 可以把一块 2D 界面单独渲染，再作为 ViewportTexture 贴到 3D 物体上，用来做世界里的屏幕。 SubViewport 可单独渲染一块界面，再以 ViewportTexture 贴到物体上或放进 SubViewportContainer 显示；默认不接收输入，要由容器转发。（引用于 P-diegetic-carrier-camera-fiction、P-device-bridge）
- **S121** Godot 文档：Using decals。<https://docs.godotengine.org/en/stable/tutorials/3d/using_decals.html>
  - Decal 把贴图投射到网格表面、可运行时移动，适合落点、范围等地面标注；在 Compatibility 渲染器下不可用，任意文字建议用贴近表面的 3D 文字代替。（引用于 P-spatial-render-budget、P-build-placement）
- **S122** MDN, prefers-reduced-motion。<https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion>
  - 该设置来自各操作系统的减少动效选项；建议把有风险的运动换成淡入或溶解，而不是简单拿掉反馈。（引用于 P-flash-motion-comfort）
- **S123** Material Components for Android, Motion（Material 3 动效文档）。<https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md>
  - 动画覆盖的面积或距离越大，时长越长，才能让感知速度一致——数字滚动与拖尾时长也应随变化量增长。 时长分 short 50–200、medium 250–400、long 450–600、extra long 700–1000 毫秒；面积或距离越大用越长的档；标准缓动用于功能性动效，强调缓动用于更有表现力的动效。 容器变换用于从一个元素展开成新界面，共享轴用于有前后 / 层级关系的页面，淡出淡入用于没有强关系的切换，淡入用于屏内出现的弹窗与菜单。（引用于 P-value-change-visible、P-motion-personality、P-transition-frequency）
- **S200** Godot Docs: Internationalizing games（Godot Engine）。<https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html>
  - 用翻译表与 tr() 管理文本，Control 节点按语言自动换文本；字体要为各语言准备回退。（引用于 P-localization-ready）
- **S201** Godot Docs: Pseudolocalization（Godot Engine）。<https://docs.godotengine.org/en/stable/tutorials/i18n/pseudolocalization.html>
  - 伪本地化：把文本加长、加重音符号、加首尾标记，在没有真实译文时就找出截断、写死的字符串与拼接问题。（引用于 P-localization-ready）

### 文章与报道（34）

- **S002** Game UI Discoveries: What Players Want（Marcus Andrews（EA DICE），2010）。<https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want>
  - 作者受 DICE 委托评估沉浸式 UI 是否值得用于后续产品，并拆解了当时多款游戏的界面。 把 Fagerholt & Lorentzon 的叙事内 / 非叙事 / 空间 / 元四分法带进业界讨论，成为后来讨论 HUD 最常用的共同词汇。 以 Far Cry 2（手持地图、世界内物件）作为“把界面放进世界”的最直观参照，以 Dead Space 的全息界面作为叙事内 UI 的样板。 强调新颖的界面也必须同时满足玩家需求、服务玩法和目标受众，而不是单纯追求零 HUD。（引用于 P-two-questions-per-element）
- **S003** User Interface Design in Video Games（Anthony Stonehouse，2014）。<https://www.gamedeveloper.com/design/user-interface-design-in-video-games>
  - 用通俗例子解释四象限：叙事内（角色也能感知）、非叙事（传统数值条）、空间（按钮提示、角色名、赛车路面箭头）、元（受伤时画面抖动、模糊、变色）。 案例：Dead Space 2 的生命条长在主角宇航服背后；Metro 2033 用手表计算防毒面具滤罐余量；Assassin's Creed 的鹰眼视觉让玩家与角色看到同一画面。 提醒分类取决于语境：同样的生命条在不同游戏里可能属于不同象限；手持地图一旦切成全屏 2D 就变成非叙事。（引用于 P-spatial-render-budget）
- **S049** Exuberant video game menus designed with da Vinci in mind（The New York Times，经 DT Next 转载）（Rollo Romig，2024）。<https://www.dtnext.in/amp/story/edit/exuberant-video-game-menus-designed-with-da-vinci-in-mind-807823>
  - 采访 Metaphor: ReFantazio 首席界面设计师 Koji Ise、Atlus 多作 UI 负责人 Masayoshi Suto、导演 Katsura Hashino 以及 NYU、多伦多大学的 UI 研究者。 回合制 RPG 玩家大量时间待在菜单里，所以 Atlus 把最大的美术力气放在菜单上；Ise 以达·芬奇的笔触为灵感为中世纪题材设计菜单。 华丽复杂的界面也能清楚引导玩家；灵感来自中世纪绘画、MV、朋克专辑封面、体育转播图形等意外来源。 Hashino 在另一次采访中承认每个菜单几乎是独立程序与独立设计，开发成本很高。（引用于 P-title-lettering、P-motif-from-world）
- **S050** The Aims of UI（Sakurai's Famitsu Column Vol. 515，英译）（桜井政博（Source Gaming 英译），2016）。<https://sourcegaming.info/2016/11/24/the-aims-of-ui-sakurais-famitsu-column-vol-515/>
  - UI 是整理和展示复杂信息的“抽屉”；Persona 5 的黑白加强红、大量立绘与 3D 模型、活泼动效让它与众不同，但版面杂、要先学才找得到东西。 本地化文字通常比日文长，固定空间里塞信息更难，风格化 UI 尤其吃亏。 Pokémon GO 的朴素界面适合其广大受众，CP 值把强度压缩成一个数字——每个 UI 有各自的目标，难用不等于坏。
- **S060** Why The Very Hard 'Celeste' is Perfectly Fine With You Breaking Its Rules（Patrick Klepek（VICE / Waypoint），2018）。<https://www.vice.com/en/article/celeste-difficulty-assist-mode/>
  - Assist Mode 允许玩家调整游戏速度、体力、空中冲刺次数，甚至是否会死。 开发者因原名“作弊模式”带有评判意味而反复改名，最终定为 Assist Mode——设置项的命名本身就是 UX。 设计者认为默认难度才是设计本意，开启后等于“打破游戏”，但仍应让玩家自选挑战程度而不被告知玩错了。（引用于 P-fail-retry）
- **S061** Apex Legends' ping system is a tiny miracle for FPS teamwork and communication（PC Gamer，2019）。<https://www.pcgamer.com/apex-legends-ping-system-is-a-tiny-miracle-for-fps-teamwork-and-communication/>
  - 一个按键按目标不同产生不同结果：标记敌人、门、武器箱、确认指令、设路点等，并配角色语音播报。 （另据开发者访谈报道）开发期 Respawn 曾在禁用语音的条件下内部试玩约一个月，用假名随机组队模拟陌生人匹配，以此打磨 ping 系统。 图标 + 语音的组合跨语言、跨能力可用；继承自 Battlefield 的标记敌人功能，但更深、更有情境。（引用于 P-contextual-ping）
- **S064** Horizon Zero Dawn（Territory Studio 项目页）（Territory Studio，2017）。<https://territorystudio.com/project/horizon-zero-dawn/>
  - 与 Guerrilla 在早期研究阶段合作，测试非传统界面如何存在于游戏世界中。 为关键的全息设备（Focus）做概念设计，并为相关过场提供全息素材与方向。 最终 HUD 概念移交 Guerrilla 团队落地——外部 FUI 工作室参与游戏 UI 的典型模式。
- **S065** 'Forza Motorsport' will feature audio cues to help players with visual impairments drive（Engadget，2023）。<https://www.engadget.com/forza-motorsport-will-feature-audio-cues-to-help-players-with-visual-impairments-drive-180043633.html>
  - Blind Driving Assists 用可配置的音效提示赛道走向、弯道与障碍、车辆状态以及刹车 / 换挡建议。 转向提示把引擎与轮胎声左右声像偏移指示该打的方向，接近赛道边缘时有蜂鸣提示；每组提示可单独开关并调音高与音量。 由盲人顾问 Brandon Cole 与其他盲人 / 低视力玩家参与开发约两年，另有菜单朗读、色盲模式、字幕等。（引用于 P-audio-haptic-pairing）
- **S078** 80.lv: 10 golden rules on subtitles for games（Ian Hamilton GDC 2019 演讲整理）（2019）。<https://80.lv/articles/10-golden-rules-on-subtitles-for-games>
  - 约六成玩家使用字幕；字幕与音效字幕分开处理，Valve 在 Half-Life 2 与 Portal 2 率先做了音效字幕；标说话人与方向、给足阅读时间、清晰无衬线、避免全大写、可选黑底。 清晰的无衬线字体、避免全大写、提供字体选项（同样适用于正文）。（引用于 P-subtitles-captions、P-typography-legible-format）
- **S079** Bandai Namco, ELDEN RING Starter Guide。<https://en.bandainamcoent.eu/elden-ring/news/elden-ring-starter-guide-tips-know-playing-the-game>
  - HUD 设为自动时平时只留罗盘，需要时按一个键临时显示完整 HUD。 自动 HUD：平时除罗盘外全部隐藏，按键可临时查看——「按需 + 常驻锚点」的官方做法。（引用于 P-progressive-disclosure、P-contextual-hud）
- **S080** Celia Hodent, The Gamer's Brain (CRC Press, 2017)（作者访谈页）（2017）。<https://www.odbms.org/2018/01/author-qa-session-celia-hodent/>
  - 从感知、注意、记忆等大脑局限出发讨论游戏 UX（可用性与参与度两大支柱）：界面负担要和玩家当下的认知负荷相匹配。（引用于 P-density-tempo）
- **S081** Dominic Kao, The Effects of Juiciness in an Action RPG, Entertainment Computing 34 (2020)（二手摘要）（2020）。<https://www.goodreads.com/author_blog_posts/19932694-the-effects-of-juiciness-in-an-action-rpg-new-study>
  - 同一款 ARPG 做无 / 中 / 高 / 极端四档反馈对照，中档与高档在各项体验指标上都好于无和极端——强度存在最佳区间。原文未读，只据摘要。 极端强度的反馈不比中高强度更好——结算演出同样存在适度区间。（引用于 P-juice-budget、P-result-tally）
- **S082** Famitsu / Kotaku 关于 PS5 统一确认键的报道（Byteside 转述）。<https://www.byteside.com/2020/10/sony-playstation-5-japan-input-x-o-swap/>
  - PS5 起日本区也改为 × 确认、○ 取消，与其它地区统一（系统层面；游戏可自定）（引用于 P-glyph-follows-device）
- **S083** Folmer Kelly, Don't Juice It or Lose It（GDC Europe 独立游戏峰会；Game Developer 报道）。<https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it->
  - 反方观点：润色让游戏更热闹，但可能削弱沉浸感；反馈强度要服从作品气质。（引用于 P-juice-budget）
- **S084** Game Developer, The 12 principles of animation in video games。<https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games>
  - 迪士尼十二原则（预备、跟随、挤压拉伸、缓入缓出等）在游戏里要为响应性让步：预备动作太长会让操作发软。（引用于 P-motion-personality）
- **S085** GameBanshee 转载 · Drew Karpyshyn 访谈（Mass Effect 对话轮盘）。<https://www.gamebanshee.com/k44c8>
  - 据访谈转述：主角全程配音后，若选项写出全句，玩家会先读一遍再听一遍，所以改成简短改写；这一取舍后来也被批评语气预期不准。（引用于 P-choice-framing）
- **S086** Ghost of Tsushima 创意总监访谈（Android Central）。<https://www.androidcentral.com/ghost-tsushima-creative-director-interview>
  - 屏幕上的 UI 越多越妨碍「身在对马岛」的感觉，因此尽量少放、用不显眼的方式指向目标。 去掉路点是为了让玩家觉得身处对马岛：屏幕上的大量 UI 会妨碍这种感觉，引导之风在不显眼的前提下指向目标，野生动物也会把玩家引向兴趣点。（引用于 P-contextual-hud、P-hudless-tax）
- **S087** Giant Bomb 用户评测, Into the Breach: A Gem of Constrained Design。<https://www.giantbomb.com/into-the-breach/3030-58234/user-reviews/2200-31048/>
  - 一张截图就包含战场的全部状态：敌人意图都可见，悬停还能看结算顺序，整个战场不需要滚动。 所有敌人意图都画在地图上，悬停按钮即可看到本回合结算的先后顺序——结论在第一层，细节在悬停里。（引用于 P-actionable-first、P-progressive-disclosure）
- **S088** How Dead Space 3 pulled from Dieter Rams and Instagram（Kill Screen）。<https://www.killscreen.com/how-dead-space-3-pulled-dieter-rams-and-instagram/>
  - Ignacio 的界面思路可概括为「Simplify and hide」；Dead Space 3 的工作台用摇杆做类似收音机旋钮的选择，压缩玩家的操作步骤。（引用于 P-pause-world-state）
- **S089** How Firewatch's UI enhances immersion（UX Collective）。<https://uxdesign.cc/how-firewatchs-ui-enhances-immersion-18feddbc7857>
  - 玩家每次要辨认方向都得拿出指南针和纸地图，因为护林员本人也不会自动知道北在哪；比 HUD 地图更难用，但更能卖出森林里探索的感觉。（引用于 P-device-bridge）
- **S090** Inverse: Persona 5 Tactica's user interface。<https://inverse.com/gaming/persona-5-tactica-user-interface>
  - 作者认为构成主义让菜单更好读，但它和故事的个人主义反叛并不契合，显得浮于表面；对比 P5 的 UI 和叙事绑在一起。（引用于 P-contrast-with-reason）
- **S091** Jan Willem Nijman（Vlambeer）对 Nuclear Throne 一发手枪的反馈拆解（Rock Paper Shotgun 访谈的转述）。<https://infovore.org/?p=5275>
  - 一次开枪拆成十几层：枪声、弹壳、镜头后坐几像素、快速衰减的震屏、枪械后坐、枪口闪、命中特效与材质音、敌人白闪 + 击退约 3 像素 / 帧、每次命中暂停约 10–20 毫秒。大部分都在世界层，UI 几乎不参与。 震屏值每次射击累加、快速衰减；每次命中暂停约 10–20 毫秒——顿帧以毫秒计，而不是以秒计。（引用于 P-hit-channel-split、P-shake-hitstop）
- **S092** Lettermatic: Custom Fonts for Pentiment。<https://lettermatic.com/custom/pentiment>
  - 五套字体按 16 世纪巴伐利亚的手稿和早期印刷体研究重画，很多字形用当年的书写工具手工上墨，刻意保留墨洇和笔画不均。这是“字”这个通道借到极致的例子。 没有配音，字体就承担“谁在说话”；字形按需要现代化以便阅读；辅助设置可以让所有角色统一显示最易读的人文手写体。 两千多个字形中，很多是用当年的书写工具手工上墨，有的故意用非惯用手写，模拟书写不熟练的人。字是“写”出来的，不是“选”出来的。（引用于 P-channel-borrowing、P-type-two-tier、P-title-lettering）
- **S093** Martin Jonasson & Petri Purho, Juice It or Lose It（GDC Europe 2012；Game Developer 报道）（2012）。<https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough->
  - 用打砖块原型现场演示：补间、挤压拉伸、事件时放大缩小、震屏等小反馈叠加，让同一玩法明显更好玩；把 juice 概括为用最少的输入换最多的输出。（引用于 P-juice-budget）
- **S094** PCGamesN, Victoria 3 将沿用 Crusader Kings III 的嵌套提示系统。<https://www.pcgamesn.com/victoria-3/nested-tooltip-system>
  - Paradox 的大战略用「提示里还能再锁定、再展开的提示」来降低学习门槛。（引用于 P-progressive-disclosure、P-in-game-charts）
- **S095** PCGamesN: Pentiment 的美术与字体。<https://www.pcgamesn.com/pentiment/art-fonts-story>
  - 字体按主角对每个人的印象来分配，印象改变时字体也跟着变。字体就是角色的“声音”。 字体按主角对每个人的看法分配，看法改变时字体也会变，用来反映这个人真正是谁。UI 的变化本身就是叙事。（引用于 P-type-two-tier、P-follow-world-over-time）
- **S096** Push Square, 桥野桂谈 Metaphor: ReFantazio / Persona 的菜单制作。<https://www.pushsquare.com/news/2024/10/making-metaphor-refantazio-personas-immaculate-menus-is-really-annoying-says-director>
  - 每个菜单都有独立设计与独立程序，非常耗时；Persona 5 的异形菜单一开始也很难读——强风格动效的成本主要在工时与可读性。（引用于 P-motion-personality）
- **S097** Rock Paper Shotgun 2018：Into the Breach 界面设计报道（2018）。<https://www.rockpapershotgun.com/2018/03/05/into-the-breach-interface-design/>
  - 开发者表示，好点子和清晰冲突时宁可为清晰舍弃酷的点子；敌人意图直接画在格子上。 清晰度本身就可以是界面反差的理由。 （链接原为第三方博客 reads.mhlakhani.com 对本文的摘要，已换成 RPS 原文地址；本轮 RPS 站点无法抓取，原文未逐字核对。原先「界面是最大难点之一」的半句在摘要里找不到出处，已删除。）（引用于 P-actionable-first、P-color-never-alone、P-contrast-with-reason）
- **S098** SEGAbits 转述 Famitsu 访谈：Persona 5 美术与 UI 负责人。<https://segabits.com/?p=54918>
  - UI 设计师说界面颜色是他最费力的部分：每一作都先看游戏主色（P3 青、P4 黄、P5 红）再定界面色，字色试过多种后定为黑白。这是只借“色”这个通道的典型。 界面颜色要对照每一作的主色（青、黄、红）来定；P5 的字色试过多种之后选了黑白。（引用于 P-channel-borrowing、P-palette-roles）
- **S099** Shacknews, How to change damage numbers in Apex Legends。<https://shacknews.com/article/110042/how-to-change-damage-numbers-in-apex-legends>
  - 伤害数字有关闭、累计、逐击飘字、两者都显示四档；颜色区分爆头、护盾与本体受伤。（引用于 P-damage-number-legibility）
- **S100** Squirrel Eiserloh, Math for Game Programmers: Juicing Your Cameras With Math（GDC 2016；Game Developer 报道）（2016）。<https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math>
  - 讲震屏的几种类型与镜头跟随的数学；常见实现是 trauma 值累加、平方后作为幅度、随时间衰减、用噪声驱动位移。（引用于 P-shake-hitstop）
- **S101** Steven Hoober · How Do Users Really Hold Mobile Devices?（UXmatters, 2013）（2013）。<https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php>
  - 在公共场所观察 1,333 次、780 人在触屏：单手 49%、托握 36%、双手 15%；作者后续更正强调屏幕中心比边角点得更快更准（引用于 P-portrait-one-hand）
- **S102** The Design Secrets of Breath of the Wild（80.lv，整理自 CEDEC 2017 任天堂演讲）（2017）。<https://80.lv/articles/the-design-secrets-of-breath-of-the-wild/>
  - 用远处可见的塔作为地标，三角形山体既遮挡视线制造惊喜又把视线引向山尖，用地形本身代替路点引导。（引用于 P-hudless-tax）
- **S103** 樱井政博 Famitsu 专栏 Vol.490 关于顿帧（Source Gaming 非官方译文）。<https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/>
  - 攻击越强顿帧越长但设上限；投射物顿帧更短；受击者在顿帧中抖动、幅度递减，地面左右抖、空中上下抖；抖动幅度随镜头距离调整。（引用于 P-shake-hitstop）

### 评测（1）

- **S059** Ghost of Tsushima accessibility review（Josh Straub（Can I Play That?），2020）。<https://caniplaythat.com/2020/07/29/ghost-of-tsushima-accessibility-review/>
  - 白色的风线在前两幕很好用，但主角北上进入雪地后与地形对比消失，正当剧情最需要时变得难以辨认——叙事内引导的可读性随场景色调变化。 地图图标虽靠形状区分，但几乎都是浅灰底上的白色，对比不足。 字幕清晰且多带说话人标签，但不能调大；可作为“极简 / 叙事内 UI 需要无障碍兜底”的反例证据。（引用于 P-hudless-tax）

### 百科条目（4）

- **S190** Metro Exodus（Wikipedia，Gameplay 一节）。<https://en.wikipedia.org/wiki/Metro_Exodus>
  - HUD 极简，信息多通过实物呈现：腕表上的计时显示防毒面具滤罐剩余时间，指南针挂在手腕上指向目标。（引用于 P-diegetic-carrier-camera-fiction）
- **S191** Wikipedia, Into the Breach。<https://en.wikipedia.org/wiki/Into_the_Breach>
  - 敌人的攻击在下一回合前就显示出来，玩家的乐趣在于利用这些已知信息去推动、阻挡和抵消攻击（06 文档 [26]）。（引用于 P-actionable-first）
- **S192** Wikipedia, Persona 5（Art design）。<https://en.wikipedia.org/wiki/Persona_5>
  - 早期 UI 动画多到遮挡画面，团队减少动画并调整文字方向，在风格与可用性之间取平衡（06 文档 [47]）。 开发中 UI 动画过多遮挡画面，后来做了减量（06 文档已引用）。 早期 UI 动画过多，遮住了画面上发生的事。团队削减动画、调整文字方向，在可用性和风格之间找平衡。即便是刻意对比的 UI，也要让位给信息。（引用于 P-motion-personality、P-flash-motion-comfort、P-harmony-four-relations、P-dwell-time-budget、P-palette-roles、P-contrast-with-reason）
- **S193** Wikipedia: BioShock（Art and design）。<https://en.wikipedia.org/wiki/BioShock>
  - 大量图像取自装饰艺术，因为它的大块简单形体用很少的多边形就能还原；为了少做复杂菜单，升级和购买都放进了世界里的售货机。母题和功能入口都来自世界本身。（引用于 P-motif-from-world）

### 视频（2）

- **S051** Masahiro Sakurai on Creating Games（YouTube 频道，UI 分类各集）（桜井政博，2022）。<https://www.youtube.com/@sora_sakurai_en>
  - 2022 年起的系列短视频，UI 类从“清晰与风格”开篇：最清晰的方案不一定最好。 图标尺寸应反映其在游戏中的重要程度——越重要画得越大。 按键设置是费力但重要的功能；剧情段应尽量允许暂停与跳过；2024 年以 HUD 一集收尾 UI 分类。
- **S074** Designing for Disability（Game Maker's Toolkit 系列）（Mark Brown（Game Maker's Toolkit），2018）。<https://www.youtube.com/@GMTK>
  - 四集系列分别讲听觉、视觉、运动、认知障碍，以及游戏可以提供的选项与设计决策。 视觉一集（2018）讲面向色盲与低视力玩家的做法，例如设计适合色盲的调色板、不只用颜色区分。 系列完结后作者每年做一期年度无障碍回顾；同频道另有 Celeste 辅助模式、手感与 juice 等相关分析。

### UI 资料库（3）

- **S075** Game UI Database（Edd Coates，2020）。<https://www.gameuidatabase.com/>
  - 免费的游戏 UI 参考库；2.0 版（2024-08）时约有 1300 多款游戏的 5.5 万张截图与 1700 段视频。 可按界面类型、操作方式、纹理、图案、HUD 元素、颜色、品类、美术风格、布局等筛选——与本项目参数体系的维度高度对应。 截图版权属于原游戏，只能作学习参考；本项目已有的 gameui:* 参考卡即来自该库。
- **S076** Interface In Game（志愿者团队（站点未署个人名），2021）。<https://interfaceingame.com/>
  - 收集游戏 UI 的截图与视频，可按品类浏览；2021 年报道时已覆盖 300 多款游戏。 另有对 UI 开发者的访谈与界面评析文章（如 Cyberpunk 2077 UX/UI 评析）。 按项目规则不抓取该站，只作为人工浏览的参考入口。
- **S077** HUDS+GUIS（及配套书 FUI: How to Design User Interfaces for Film and Games）（Jono Yuen，2012）。<https://www.hudsandguis.com/>
  - 墨尔本创意总监 Jono Yuen 维护的灵感站，收录电影、游戏、概念设计与真实产品中的 HUD / GUI，关注界面的功能、外观、动效与声音。 游戏案例分析如 Dead Space 2 的叙事内界面、The Division 贴身倾斜的 HUD 与腕部全息、Cyberpunk 2077 以文字为主的低保真红色 HUD。 配套书汇集电影与游戏 FUI 从业者的经验，适合科幻 / 赛博类 UI 风格的取材。（引用于 P-medium-simulation）

### 本项目文档（7）

- **S183** docs/survey/15-r4-mobile.md（本项目）。`docs/survey/15-r4-mobile.md`
  - 88 张触屏参考里，R4 把竖屏卡一律按单手（ix.thumbZone=oneHand）标注（握法从截图看不出，是标注约定）、横屏双拇指 6 张；主按钮明显大于技能键，倍速 / 暂停等次要键偏小——截图分辨率与设备 DPI 不明，只能比较相对大小，量不出 pt。（引用于 P-touch-target-size）
- **S184** 本项目 06 品类镜头与可读性 §0.5（Into the Breach 清晰优先）。`docs/survey/06-genre-camera-ui.md`
  - 视觉权重 = 玩法权重；开发者表示会为了清晰放弃很酷的点子。 眯眼 / 模糊检查：模糊后最显眼的三个区域应是玩家、威胁、目标；另有灰度、色盲、特效压力检查。（引用于 P-priority-tiers、P-squint-test）
- **S185** 本项目 08 UI 美术资产调研 §2.1（只取非商业化界面）。`docs/survey/08-ui-art-assets.md`
  - 只取非商业化界面、每种各抽 100 张：带材质标签的战斗界面 1 张、菜单 22 张、建造 / 家园 9 张、登录 6 张；站方标签稀疏且约 18% 误标（08 文档 §3.1），只看相对趋势。08 原文的高材质界面清单里包括商城、充值、恭喜获得、通行证、转盘、首充等商业化界面，本文不引用这部分。（引用于 P-squint-test、P-frontend-loading）
- **S186** 本项目 10 R2① 策略批次总结 §8。`docs/survey/10-r2-strategy.md`
  - Into the Breach、Slice & Dice、Shogun Showdown、Beltmatic 都把敌人下一步画在格子或头顶。 该品类「极简」16 款与「极密」10 款形成两极，信息密度是这个品类最重要的旋钮之一。（引用于 P-actionable-first、P-density-tempo）
- **S187** 本项目 11 R2② 探索 / RPG / 动作批次总结。`docs/survey/11-r2-arpg.md`
  - 「零 HUD / 情境显现」是 3A 探索作的主流，rel.hudVisibility 与 cnt.density 是该品类的第一旋钮。（引用于 P-contextual-hud）
- **S188** 本项目 12 R3 玩家评价统计。`docs/survey/12-r3-reviews.md`
  - 各类抱怨的出处与条数（关键词粗筛）。本文引用的是去重（6,243 条重复文本）并收紧「字太小」、人工复核「HUD 太乱」之后的重算，见 JSON 的 reviewRecount；12 号文档与 ui-review-stats.json 的原始数字偏高。（引用于 P-density-tempo）
- **S189** 本项目 K1 风格发现（discover.json）。`docs/survey/data/k1/discover.json`
  - 47 个缺失 / 欠代表家族中有 14 个属于「媒介模拟」轴（复古 OS、终端字符格、镜头屏显、转播、印刷手册、默片、1-bit 抖动等）；现有家族按材质切分，缺这一条轴。（引用于 P-medium-simulation）
