# 09 · 游戏 UI 调参体系（参数总表）· v2

> 2026-10-14。目标：任何真实游戏的任何一屏 UI，都能用这套参数的取值组合写出来；每个参数可以单独调，像画面探索台调画风一样调 UI。
> v2：按三份审稿意见修订——正交性（R1，40 条）、完备性（R2，16 条 + 88 条随机参考编码）、可用性 / 落地（R3，31 条）。逐条处理结果见第 11 节，v1 → v2 的改名与迁移见第 6.10 节。
> 依据：93 张横向对照图（68 种界面功能、约 150 款游戏）的坐标轴统计与 1,042 条观察者新轴；`docs/ui-hud-plan.md`、`06-genre-camera-ui.md`、`08-ui-art-assets.md`；`uiContent.ts`、`hud/types.ts`、`hud/skins.ts`、`hud/fontList.ts`、`dims/*`、`content/recipes.ts`、`styles.data.ts`；IIG 34 款浏览记录与 GameUI 29 种材质归纳。
> 机器可读版：`docs/survey/data/ui-param-system.json`（与本文由同一份数据生成，参数、预设、派生规则、约束、校验结果逐条一致）。

## 0. 结论

- **规模**：18 个维度组、257 个参数，按 R1 分四类计数：**设计参数 238**（其中 3 个是纯派生读数，不进控件面板）、玩家选项 6、工具与展示 12、解析设置 1。设计参数共 1213 个取值；全部取值里 1115 个带参考游戏或对照图 id。正交性只在设计参数之间讨论（第 5 节）。
- **预设 222 个**：皮肤 38、关键词 18、节日 5、品类布局 31、平台 6、商业模式 5、版式预设 6、容器预设 6、界面模板 63、UI 感觉 11、无障碍叠加 3、参考验证 15、整套 UI 配方 15。**派生规则 36 条**（默认类 17、适配类 6、纯派生 11、无障碍 2），**约束 26 条**。
- **v1 的主要问题已改**：重复词表合并成唯一一份（数值图形 cmp.gauge、小组件轮廓 vis.silhouette、标牌 cmp.plate、材质表、入场动效 mo.enter、排布 lay.arrangement）；画法里的位置 / 放置 / 排布词全部移到元素模板参数；"有没有底""本屏怎么结束""这个元素有没有"各只剩一个参数说了算；三层预设按参数组分工并由生成器强制；派生规则分出"只填空"和"变换"两类，D-orient 在手机竖屏上真的会把左页签改成底部页签（第 4.5 节轨迹）。
- **机器校验**：51 个参数有数据式生效条件、5 个有派生来源、35 个可按组件 / 元素覆盖；生成器对每个预设、参考验证、UI 配方，以及"界面模板 / 品类布局 × 平台 × 皮肤"共 21,432 个组合跑约束，全部通过；v1 的 7 个自相矛盾组合作为反例，全部被拦下（第 4.5 节）。
- **完备性**：R2 随机编码的 88 条参考，v1 能完整写出 44 条（50%）；按审稿列出的缺口逐条对照，v2 的参数都有对应写法（88 / 88）。这是"按已知缺口补词表"，不能当覆盖率证据——R2 批评的正是这种自证，所以第 8 节把它列为待复测，路线图 R2① 起每批另抽 30 条没见过的参考做回归。
- **可用性**：每个参数有页签、分层（tier 1–3）、展示方式，默认为跟随的参数都有兜底值；10 个大旋钮与 3 个起点选择标为第一屏；118 个参数有白话说明（tier 1–2 全覆盖）、20 个连续参数写了两端；每个取值有 needs（程序化 / 需字体 / 需素材 / 需场景）与 Godot 迁移难度。设计参数的取值里，需素材 127、需字体 15、需场景 19，其余可程序化先做；Godot 内置能做 1163，需着色器 32、改后处理 11、需脚本 5、很难 2。
- **对路线图**：建议把 M3 拆成"解析核心 + 程序外观"（M3a）与"预设层"（M3b），Godot 导出 M4 提到资产槽位之前，M5 / M8 / M9 各拆成两半，AI 生成素材按 15 套 UI 配方的缺口排序（第 10 节）。`docs/ui-hud-plan.md` 没有改。

## 1. 怎么读这套体系

### 1.1 几类东西

| 类别 | 是什么 | 例子 | 在探索台里 |
|---|---|---|---|
| 设计参数（238） | 真正独立的一维，任意两项可以自由组合（不能组合的写成生效条件或约束） | `vis.skew` 倾斜角、`lay.arrangement` 排布几何、`elx.screenAnchor` 锚点 | 一个控件（芯片 / 滑杆 / 开关 / 多选 / 九宫格） |
| 玩家选项（6） | 玩家在设置里能调的无障碍项，也导出到 Godot 设置页 | `a11y.textScale`、`a11y.reduceMotion` | "玩家设置预览"开关，不参与随机 |
| 工具与展示（12） | 检查与演示，不是游戏参数，不进配方 / 收藏 / 随机 / 导出 | `chk.contrast`、`chk.coverage`、`chk.demo` | 顶栏"诊断"下拉、视口按钮、只读读数 |
| 解析设置（1） | 派生规则的开关，不是视觉属性 | `rel.harmony` UI 与画面关系 | 起点页签里的一个分段控件 |
| 预设 | 一组参数默认值，每类只拥有自己的参数组（第 1.3 节），选中后每项仍可改 | 皮肤"重装饰雕花框"、品类布局"MOBA 底座"、界面模板"十连结果" | 预设选择器；改过的参数标"手动" |
| 派生规则 | 从画面参数或其它 UI 参数推出值；分默认 / 适配 / 纯派生 / 无障碍四类 | 画面有描边 → UI 描边加粗；竖屏 → 侧页签改底部页签 | 参数旁显示"由 D-xx 推出"，手动改值后不再跟随（无障碍除外） |
| 约束 | 机器可读的"不能这样组合"或"这样就必须那样" | 不画 UI ⇒ 元素集合为空；浮空弹窗 ⇒ 弹窗无底 | 违例时参数行显示 ⚠，蕴含型直接补值 |

### 1.2 作用范围与三种键

- **全局**：整套 UI 共用（皮肤 token、字体、色彩、输入方式）。**全局，可逐屏覆盖**：默认是全局的，界面模板可以按屏改（组件结构、状态编码、按钮配色、入场动效），模板写它时在解析里排到皮肤之后。**某一屏**：只作用于当前界面。**信息元素**：每个元素实例各一份。
- **参数键**：参数 id，如 `vis.corner`、`typ.body.family`（字体按"角色 × 属性"用三段式 id）。
- **覆盖键**：`<参数>@<目标>`。目标是组件（panel / modal / button / tab / bar / slot / tooltip / titleBar / listRow / nameplate / dialog / minimapFrame / icon / avatar / badge / plate / card / node / input，对应 Godot Theme 的 type variation）、角色（`cmp.plate@title`、`cmp.gauge@progress`）或信息元素（`cmp.gauge@el.vitals`、`ast.coreMat@el.cta`）。每个参数的"可覆盖"一栏列出允许的目标，生成器校验。
- **元素实例键**：`el.<元素>.<后缀>`，后缀是元素模板参数 `elx.*` 的末段，例如 `el.minimap.screenAnchor = tr`、`el.vitals.diegesis = diegetic`。元素自己的画法是 `el.<元素>.form`。

### 1.3 解析顺序与各层拥有的参数

1. 参数默认值
2. 默认类派生规则（只填空）
3. 平台 → 商业模式 → 品类布局 → 版式预设 → 容器预设 → 界面模板（各类只写自己拥有的参数组）
4. 皮肤（形与面）→ 关键词（材质与母题；未选时用皮肤引用的关键词或 keywordDefaults）→ 节日（白名单子集）
5. 屏幕类预设写到皮肤层也拥有的键：在这里作为本屏覆盖；然后模板 accent 只补空
6. 用户手动值（含 UI 感觉、无障碍叠加）
7. 适配类派生规则（变换；只有用户手动值能挡住）
8. 纯派生与蕴含约束
9. 无障碍规则（优先于一切）

每类预设只能写下表里自己拥有的参数（生成器的 C-owners 检查）；同一个键被几层共有时，后面的层赢。皮肤写不了的版式 / 交互建议放 `suggests`，默认不套用；界面模板里只想"补上"的材质与母题放 `accent`，只在皮肤与关键词没给值时生效。

| 预设类 | 拥有的参数（* = 通配；el.* = 元素实例键与 @el 覆盖键） |
|---|---|
| platform | ctx.orientation、ctx.aspect、ctx.device、ctx.input、typ.baseSize、ix.touchSize、lay.safeMargin、ix.glyphs |
| business | ops.*、st.newCue、flow.chrome、flow.navPersistent |
| layout | cnt.screen、cnt.subtype、cnt.elements、cnt.focal、cnt.characterMedium、lay.container、lay.hudOrg、lay.playfield、ctx.timeModel、ctx.turnTimer、ctx.players、rel.hudVisibility、rel.semanticZoom、rel.worldRender、col.coding、col.teams、cmp.card、cmp.dialogBox、cmp.gauge、ix.skip、ix.skipAnchor、hier.dimInactive、mo.textReveal、flow.chrome、el.* |
| pattern | lay.*、cnt.dataShape、cnt.focal、ops.poster、cmp.slot、ix.mode |
| container | ast.container、ast.containerSurface、mo.transition、lay.nav、lay.detail、lay.container、lay.overflow、cmp.slot |
| screen | cnt.*、lay.*、hier.*、rel.behind、rel.dim、rel.sceneBlur、rel.sceneTone、rel.hudVisibility、rel.diegesis、ix.mode、ix.confirm、ix.dismiss、ix.close、ix.continueCue、ix.skip、ix.skipAnchor、ix.guideForce、flow.entry、flow.stacking、flow.depth、flow.chrome、mo.reveal、mo.revealTease、mo.reward、mo.textReveal、mo.enter、mo.transition、st.*、cmp.*、ops.*、col.coding、col.semantic、typ.numbering、ast.container、ast.containerSurface、ast.bgArt、ast.bgMat、ast.watermark、ast.watermarkOpacity、vis.mapStyle、vis.mapUnexplored、el.* |
| skin | vis.corner、vis.cornerSize、vis.edge、vis.silhouette、vis.skew、vis.jitter、vis.opacity、vis.fill、vis.pattern、vis.patternOpacity、vis.blur、vis.stroke、vis.strokeWidth、vis.strokeColor、vis.strokeSides、vis.strokeGlow、vis.depth、vis.gloss、vis.iconStyle、vis.pixelScale、col.lightness、col.surface、col.surface2、col.text、col.accent、col.accent2、col.focus、col.border、col.gradient、col.strategy、col.semantic、col.saturation、typ.body.*、typ.display.*、typ.numerals.*、typ.legibility、typ.scale、mo.enter、mo.duration、mo.easing、mo.textReveal、mo.idle、mo.juice、mo.frameRate、ix.press、ix.focus |
| keyword | ast.core、ast.coreMat、ast.frame、ast.frameMat、ast.ornaments、ast.fx、ast.watermark、ast.watermarkOpacity、ast.bgArt、ast.bgMat、vis.motif、vis.ornament、vis.pattern、vis.patternOpacity、vis.edge、vis.mapStyle、typ.display.family、typ.titleFx、typ.direction、cmp.plate、col.accent、col.accent2 |
| theme | col.accent、col.accent2、vis.motif、ast.fx、ast.ornaments |
| nudge | vis.*、col.*、typ.*、mo.*、ast.*、rel.hudVisibility、rel.harmony、rel.diegesis、rel.sceneTone、cnt.density、hier.dimInactive、ix.press、ix.focus、el.* |
| overlay | a11y.*、chk.*、typ.baseSize、col.teams、st.rarityCue、mo.juice、vis.opacity、typ.legibility |
| example | * |
| recipe | * |

皮肤合并默认关键词之后必须给出这些外观核心键（或因生效条件而不生效）：`vis.corner`、`vis.stroke`、`vis.depth`、`vis.opacity`、`col.lightness`、`col.strategy`、`typ.body.family`、`typ.body.weight`、`typ.display.family`（C-skin-core）。

### 1.4 机器字段与条件语法

| 字段 | 含义 |
|---|---|
| `cls` | design / player / tool / resolve |
| `scope` | global / globalScreen / screen / element |
| `activeWhen` | 生效条件；不生效的参数在面板里收进"当前不生效（n）"，预设设了被自己其它值关掉的参数会报错（C-inactive） |
| `derivedFrom` / `panel` | 由哪些参数推出；`panel: false` 的是纯派生读数，不进控件面板 |
| `overrideAt` | 可按哪些组件 / 角色 / 元素覆盖 |
| `merge` | 多选参数跨层合并：union（并集）或 replace（替换） |
| `optionsFrom` | 共用另一个参数的取值表（不复制词表） |
| `appliesTo` | 元素模板参数只对哪些元素有效（数值标注只对显示数值的元素） |
| `tier` / `tab` / `starter` / `control` | 界面分层、所属页签、是否第一屏大旋钮、建议控件 |
| `preview` | 静帧 / 时间轴 / 事件 / 状态陈列板 / 情境三联 / 流程分镜 / 文案与设备 |
| `random` / `randomRange` | 是否参与随机、随机时用的常用区间 |
| `fallback` | 跟随链上谁都没给值时的兜底值（R3：不能把 auto 读成 0） |
| `plain` / `lookAt` / `ends` | 白话说明、看哪里、两端效果 |
| 取值的 `needs` / `godotLevel` | 程序化 / 需字体 / 需素材 / 需场景；Godot 内置 / 着色器 / 后处理 / 脚本 / 很难 |
| 取值的 `channel` | 状态编码占用的视觉通道（C-st-channels） |
| 子功能取值的 `parent` / `layer` | 所属基础界面；基础界面或浮层 |

条件语法：{p, in:[…]} \| {p, notIn:[…]} \| {p, has:x} \| {p, hasAny:[…]} \| {p, empty:true} \| {p, gt\|lt\|eq:n} \| {all:[…]} \| {any:[…]} \| {not:…}；p 以 @ 开头指同一元素的模板参数；值为 auto 时结果为"未知"，未知不报错。本文把条件写成"vis.opacity > 0 且 ast.core = procedural"这样的文字。

### 1.5 实现方式与依赖图例

| 实现方式 | 含义 | 参数数 |
|---|---|---|
| canvas | 画布 HUD 绘制 | 201 |
| scene | 场景内（世界空间 / 投影） | 16 |
| asset | 需要素材 | 28 |
| tool | 只能工具侧检查 | 12 |
| sim | 动画预览 | 22 |
| flow | 流程演示 | 14 |
| data | 数据 / 描述 | 5 |

| 取值依赖 needs | 含义 | 设计参数取值数 |
|---|---|---|
| canvas | 画布程序化即可 | 948 |
| font | 需要补字体（OFL 下载 + 子集化，不需要生成） | 15 |
| asset | 需要素材（未生成前画灰盒占位） | 127 |
| scene | 需要场景渲染 / 3D | 19 |
| sim | 需要确定性模拟 | 53 |
| flow | 需要流程演示 | 51 |

| Godot 难度 | 含义 | 设计参数取值数 |
|---|---|---|
| builtin | Godot 内置（StyleBoxFlat / Theme / Control） | 1163 |
| shader | 需要 CanvasItem 着色器或烘焙纹理 | 32 |
| post | 需要改后处理 / 合成顺序 | 11 |
| script | 需要脚本（逐字容器、多视口等） | 5 |
| hard | Godot 里很难（如全竖排正文、双向软阴影） | 2 |

参数卡里的取值后面用〔需素材〕〔需字体〕〔需场景〕〔Godot：着色器〕之类的标记注明；没有标记 = 画布程序化、Godot 内置能做。

### 1.6 维度组与探索台页签

| # | 组 | 一句话问题 | 参数数 | 所属页签 |
|---|---|---|---|---|
| 2.1 | 情境与载体（`ctx`） | 玩家在什么设备上、用什么操作、有多少时间看这套 UI？ | 8 | ⑤与世界 |
| 2.2 | 内容（这一屏显示什么）（`cnt`） | 这一屏给玩家看什么？ | 15 | ③内容与版式 |
| 2.3 | 结构与版式（怎么排）（`lay`） | 这一屏的东西怎么摆？ | 19 | ③内容与版式 |
| 2.4 | 层级与强调（`hier`） | 一眼先看哪里？ | 4 | ③内容与版式 |
| 2.5 | 视觉语言：形、线、面、饰（`vis`） | 面板和按钮是什么形状、什么边、什么底、有多少装饰？ | 24 | ②外观 |
| 2.6 | 色彩（`col`） | UI 用哪些颜色、颜色从哪来、颜色表达什么？ | 17 | ②外观 |
| 2.7 | 字体与文字（`typ`） | 用什么字、多大、怎么排？ | 18 | ②外观 |
| 2.8 | 资产槽位（内芯 / 外框 / 饰件 / 特效 / 容器 / 图标 / 背景 / 水印）（`ast`） | 面板用什么材料做、框上贴什么、背后放什么？ | 13 | ②外观 |
| 2.9 | 与世界的关系（`rel`） | UI 和游戏世界是什么关系：在不在世界里、像不像、背后的画面怎么处理？ | 11 | ⑤与世界 |
| 2.10 | 动效与演出（`mo`） | UI 怎么动：怎么出来、多快、什么手感、东西怎么"给"出来？ | 12 | ④动效与交互 |
| 2.11 | 交互与输入（`ix`） | 玩家怎么操作这一屏、怎么关掉它？ | 13 | ④动效与交互 |
| 2.12 | 流程与界面场景（`flow`） | 界面之间怎么进、怎么叠、什么一直都在？ | 5 | ④动效与交互 |
| 2.13 | 组件形态（控件库的结构）（`cmp`） | 按钮、页签、格子、条、对话框这些通用控件由哪几块组成？ | 19 | ⑥组件与状态 |
| 2.14 | 数据与状态编码（`st`） | 空、锁、完成、新、冷却、选中、警示这些状态怎么画？ | 13 | ⑥组件与状态 |
| 2.15 | 运营与商业化（`ops`） | 这一屏有多少运营元素：红点、倒计时、折扣、入口？ | 7 | ⑦运营 |
| 2.16 | 玩家选项（无障碍）（`a11y`） | 玩家能在设置里调什么？ | 6 | 玩家设置预览 |
| 2.17 | 工具与展示（不进配方）（`chk`） | 这套 UI 有没有问题？静态看不出的东西怎么演示？ | 12 | 诊断 / 工具 |
| 2.18 | 信息元素（逐元素）（`el`） | 每个信息块单独长什么样、放在哪、多大、什么时候出现？ | 41 | 元素检查器 |

| 页签 | 进控件面板的参数数 | 说明 |
|---|---|---|
| ①起点 | 10 个大旋钮 + 3 个起点选择（参数本身属于各自的页签） | 平台、输入方式、子功能 → 模板 / 布局、皮肤、关键词芯片、UI 与画面关系 + 10 个大旋钮 |
| ②外观 | 72 | 按设计师流程排序：色彩 → 字体 → 标题字 → 形线面 → 素材槽 → 图标 |
| ③内容与版式 | 37 | 内容、版式、层级 |
| ④动效与交互 | 29 | 动效、交互、流程 |
| ⑤与世界 | 19 | 情境与载体 + 与世界的关系 |
| ⑥组件与状态 | 32 | 组件结构与状态编码 |
| ⑦运营 | 6 | 只在商业模式不是买断，或界面是主界面 / 运营 / 商店时出现 |
| 元素检查器 | 41 | 在画布上点选元素打开；只列当前 cnt.elements 里的实例 |
| 玩家设置预览 | 6 | 做成预览开关，不进随机 |

第一屏大旋钮：`cnt.density`、`vis.corner`、`vis.stroke`、`vis.depth`、`vis.ornament`、`col.lightness`、`col.accent`、`typ.body.family`、`typ.display.family`、`mo.juice`（描边线型与粗细算一个旋钮）；起点选择：`ctx.input`、`cnt.subtype`、`rel.harmony`。设计参数进面板的按分层计：tier1 13、tier2 105、tier3 117。

## 2. 参数

### 2.1 情境与载体（`ctx.*`）

**玩家在什么设备上、用什么操作、有多少时间看这套 UI？** 设备、画幅、输入、时间压力、同屏人数、语言。几乎都由「平台预设」「品类布局」给默认值，但每项都能单独改（PC 也能用手柄，竖屏也能是回合制）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `ctx.orientation` | 画幅朝向 | 设计参数 / 全局 | 单选 | 横屏 | 2 | — | 画布 | builtin |
| `ctx.aspect` | 屏幕宽高比 | 设计参数 / 全局 | 单选 | 16:9 | 3 | — | 画布 | builtin |
| `ctx.device` | 设备与观看距离 | 设计参数 / 全局 | 单选 | PC 显示器 | 2 | — | 数据 | builtin |
| `ctx.input` | 输入方式 | 设计参数 / 全局 | 单选 | 键鼠 | 1 ★ | — | 画布 | builtin |
| `ctx.timeModel` | 时间模型 | 设计参数 / 全局 | 单选 | 实时 | 2 | — | 动画预览 | builtin |
| `ctx.turnTimer` | 回合限时 | 设计参数 / 全局 | 开关 | 关 | 3 | ctx.timeModel = turn | 画布 | builtin |
| `ctx.players` | 同屏玩家与视口 | 设计参数 / 全局 | 单选 | 单人 | 2 | — | 画布 | builtin / script |
| `ctx.locale` | 文案语言 | 设计参数 / 全局 | 单选 | 简体中文 | 2 | — | 画布 | builtin |

#### `ctx.orientation` 画幅朝向

设计参数 · 范围：全局 · 类型：单选 · 默认：横屏 · 分层：tier 2 · 页签：⑤与世界 · 展示：文案 / 设备外框 · 里程碑：M10

实现：画布：视口按朝向裁切，HUD 在安全区内排版（复用 camera.letterbox 的黑边能力）。Godot：project.godot：display/window/handheld/orientation；Control 锚点预设

白话：屏幕是横着拿还是竖着拿。竖屏时所有左右并排的东西都要改成上下堆。 看哪里：页签和列表的方向、主按钮是否落在拇指够得到的下半屏。

只管横竖；宽高比另立 ctx.aspect。竖屏时 D-orient（适配类）把左右分栏改成上下、侧页签改成底部、网格列数压到 4 以内。

吸收的观察轴 / 旧维度：N:屏幕朝向与设备、N:屏幕朝向、N:画幅方向、N:画幅朝向、N:屏幕方向画幅、N:画幅与平台、N:屏幕方向

- `landscape` **横屏**：左右分栏、四角 HUD：PC、主机、横屏手游（参考：Hades s1145360_0、GameUI#594209）
- `portrait` **竖屏**：上下堆叠、单列列表、底部页签，主操作在下半屏（参考：GameUI#646877、GameUI#1663927、GameUI#625083）

#### `ctx.aspect` 屏幕宽高比

设计参数 · 范围：全局 · 类型：单选 · 默认：16:9 · 分层：tier 3 · 页签：⑤与世界 · 展示：文案 / 设备外框 · 里程碑：M10

实现：画布：按宽高比给视口加黑边或扩边；超宽时关键信息收进中间 16:9 区域。Godot：window/stretch/aspect = expand + 安全区容器

从 v1 的 ctx.orientation 拆出（原来横竖和 21:9 / 4:3 混在一个枚举里）。"玩法区被框成 4:3 + 黑边画 HUD"是 lay.playfield = boxed，不是屏幕比例。

吸收的观察轴 / 旧维度：N:画幅与黑边（屏幕部分）

- `16x9` **16:9**：默认
- `21x9` **21:9 超宽**：两侧多出的视野不放关键信息，HUD 收拢到中间（参考：经验值：超宽屏安全区、Forza Horizon 5）
- `4x3` **4:3**：老显示器或刻意复古（参考：Nuclear Throne s242680_0）
- `19.5x9` **19.5:9 手机长屏**：刘海与圆角吃掉边角（参考：GameUI#1663927）

#### `ctx.device` 设备与观看距离

设计参数 · 范围：全局 · 类型：单选 · 默认：PC 显示器 · 分层：tier 2 · 页签：⑤与世界 · 展示：文案 / 设备外框 · 里程碑：M10

实现：数据：决定基准字号、最小触控尺寸、安全区的默认值（派生 D-device）；工具侧按视距换算最小可读字号。Godot：content_scale_factor；DisplayServer.screen_get_dpi()；DisplayServer.get_display_safe_area()

白话：在什么设备上看。设备决定字该多大、按钮该多大、边上要留多少安全距离。 看哪里：正文字号与按钮大小在该设备的实际视距下是否看得清、按得准。

视距是隐含量：手机约 30cm、PC 约 60cm、电视约 2.5m（10 英尺 UI），不单设轴。

吸收的观察轴 / 旧维度：N:平台范式、N:画幅与平台

- `phone` **手机**：近看小屏、拇指操作、刘海与圆角安全区（参考：GameUI 手游约 77%、GameUI#1663798）
- `tablet` **平板**：屏大但仍是触屏，常见双栏（参考：GameUI#943830）
- `pc` **PC 显示器**：约 60cm 视距，可容纳小字与高密度面板（参考：Stellaris s281990_2、Prison Architect s233450_0）
- `tv` **主机 / 电视**：约 2.5m 视距，字要大、留 5% 安全边、焦点导航（参考：Elden Ring、Clair Obscur s1903340_5）
- `handheld` **掌机（Switch / Steam Deck）**：小屏近看却用手柄（参考：Hollow Knight s367520_0、Celeste s504230_0）

#### `ctx.input` 输入方式

设计参数 · 范围：全局 · 类型：单选 · 默认：键鼠 · 分层：tier 1（第一屏起点选择） · 页签：⑤与世界 · 展示：静帧 · 里程碑：M10

实现：画布：换按键提示图标集、焦点框、触屏按钮层；工具侧检查触控尺寸。Godot：InputMap + 按最近一次 InputEvent 类型切换提示；TouchScreenButton；Control.focus_neighbor_*

白话：玩家用什么操作。键鼠能悬停，手柄靠焦点框移动，触屏没有悬停、按钮要大。 看哪里：按键提示图标、详情是悬停出现还是点开、有没有焦点框。

默认由 ctx.device 派生，可手动覆盖。v1 的"无输入（过场）"删掉：那是某一屏的状态，用 ix.mode = readOnly 表达。D-input（适配类）按它改写按键图标、悬停详情、焦点框。

吸收的观察轴 / 旧维度：I1

- `touch` **触屏**：大按钮、无悬停态、虚拟摇杆，主按钮放拇指区（参考：GameUI#1762374、GameUI#585162）
- `kbm` **键鼠**：悬停高亮、右键菜单、热键角标、可点小目标（参考：GameUI#1178739、Dota 2 s570_0）
- `pad` **手柄**：焦点在控件间移动，底部按键图例（A 确认 / B 返回）（参考：Clair Obscur s1903340_5、DQ Builders 2 s1072420_0、Moonlighter s606150_2）
- `hybrid` **键鼠 + 手柄自动切换**：同一界面按最近输入切换提示图标（参考：Hades、GameUI#545572）

#### `ctx.timeModel` 时间模型

设计参数 · 范围：全局 · 类型：单选 · 默认：实时 · 分层：tier 2 · 页签：⑤与世界 · 展示：情境三联 · 里程碑：M5b

实现：动画预览：决定是否出现计时、倍速、结束回合控件，以及 HUD 模拟的节拍。Godot：Engine.time_scale；get_tree().paused + Node.process_mode；回合状态机脚本

白话：游戏的时间怎么走：一直在跑、能暂停、还是轮流行动。这决定 HUD 是"瞄一眼"还是"慢慢读"。 看哪里：有没有结束回合 / 倍速 / 暂停控件，信息密度能不能高。

只描述游戏机制。v1 的"无时间压力"删掉（菜单、叙事屏本来就没有时间压力，由 cnt.screen ≠ hud 推出）；"回合 + 倒计时"拆成 ctx.turnTimer。

吸收的观察轴 / 旧维度：N:时间模型、N:操作节奏、N:回合/节奏指示

- `realtime` **实时**：没有暂停，HUD 只能"瞄一眼"（参考：Dota 2 s570_0、Marvel Rivals s2767030_2）
- `pausable` **实时可暂停 / 变速**：暂停、1x、2x 控件常驻，暂停时可以细读面板（参考：Frostpunk s323190_2、Bloons TD 6 s960090_0、Mini Metro）
- `rtwp` **实时暂停战术**：暂停下排指令再放行，需要"计划"态 UI（参考：Desperados III s610370_3）
- `turn` **回合制**：回合横幅、结束回合按钮、意图预告（参考：Wargroove s607050_2、Slay the Spire 2 s2868840_0、Into the Breach s590380_0）

#### `ctx.turnTimer` 回合限时

设计参数 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M5b

生效条件：ctx.timeModel = turn

实现：画布：回合计时徽章醒目显示。Godot：Timer + Label

从 v1 的 ctx.timeModel = turnTimer 拆出。参考：Worms W.M.D s327030_1、GameUI#1691829。

#### `ctx.players` 同屏玩家与视口

设计参数 · 范围：全局 · 类型：单选 · 默认：单人 · 分层：tier 2 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M7

实现：画布：决定玩家 HUD 的份数、镜像与分配；分屏时每个视口一套 HUD。Godot：分屏：SubViewportContainer × N；每个玩家一个 CanvasLayer；镜像对战用翻转锚点

白话：同一块屏幕上有几个人在玩、是不是对战。决定玩家 HUD 要几份、要不要左右镜像。 看哪里：玩家血条与头像的份数和位置。

派生 D-players：versus → lay.focalSide = both + 元素锚点左右镜像；split → lay.playfield = split。分屏要多视口 × 后处理 × HUD，性能与改动都大，建议排到后期（godotLevel: script）。

吸收的观察轴 / 旧维度：N:多人HUD布局、N:多人屏幕共享、N:分屏/多视口、N:镜像对称布局、N:对称对抗布局、N:玩家列表

- `single` **单人**：一套 HUD，围绕玩家角色（参考：Hollow Knight s367520_0）
- `sharedCoop` **本地合作共享一屏**：多份小 HUD 并排，共用镜头（参考：Castle Crashers s204360_1、Lovers in a Dangerous Spacetime s252110_1）
- `split` **分屏**：每个视口各一套 HUD，中缝要留白（参考：It Takes Two s1426210_2） 〔需场景 · Godot：脚本〕
- `versus` **1v1 镜像对战**：左右对称的血条、头像、计量槽（参考：Dragon Ball FighterZ s678950_3、BlazBlue Cross Tag Battle s702890_1、Minion Masters s489520_0）
- `team` **线上队伍（队友栏 + 记分）**：己方 / 敌方头像条、记分牌、击杀信息（参考：Dota 2 s570_0、Overwatch、GameUI#594343）
- `party4` **四人派对**：每位玩家一个框，玩家色区分（参考：Super Bomberman R s702700_0）
- `board` **桌游多人**：玩家条（头像 + 分数 + 剩余棋子）（参考：Carcassonne s598810_2）

#### `ctx.locale` 文案语言

设计参数 · 范围：全局 · 类型：单选 · 默认：简体中文 · 分层：tier 2 · 页签：⑤与世界 · 展示：文案 / 设备外框 · 里程碑：M2 · 现状：部分实现 · 不参与随机

实现：画布：字体回退、字宽、全大写是否可用；工具侧检查本地化长度。Godot：TranslationServer + 每语言一套 FontVariation；TextServerAdvanced

白话：界面文字是什么语言。英文能全大写、宽字距，中文要换做法；英文通常长 30–50%。 看哪里：按钮和标题里的字能不能放下。

全大写、小型大写、宽字距、斜体只对拉丁字母成立；中文版要换做法（见 typ.*.case 的说明）。日文需要另配字体（M2 的 13 个字体不含假名）。

吸收的观察轴 / 旧维度：N:语言/文字量、N:文案语言

- `zh` **简体中文**：方块字，等宽感强，字重不足时显虚（参考：GameUI 国服截图）
- `en` **英文 / 拉丁**：可全大写、小型大写、宽字距，长度比中文长约 30–50%（参考：Destiny 2、Control）
- `ja` **日文**：假名 + 汉字，和风字体常缺简中字形（参考：Clair Obscur（日版）、Persona 5） 〔需字体〕
- `bilingual` **中英并置**：中文主标题 + 英文小副标（暂停 PAUSE）（参考：GameUI#208067、GameUI#545481）

### 2.2 内容（这一屏显示什么）（`cnt.*`）

**这一屏给玩家看什么？** 界面类型、子功能、阶段、数据状态、信息元素、数据结构、文字量、主视觉。与"怎么画"无关，是一切版式的起点。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `cnt.subtype` | 界面子功能 | 设计参数 / 某一屏 | 单选 | 跟随 | 1 ★ | — | 数据 | builtin |
| `cnt.screen` | 界面类型 | 设计参数 / 某一屏 | 单选 | 局内 HUD | 2 | 由 cnt.subtype 推出 | 画布 | builtin |
| `cnt.layer` | 基础界面 / 浮层 | 设计参数 / 某一屏 | 单选 | 基础界面 | 3 | 由 cnt.subtype 推出 | 数据 | builtin |
| `cnt.stage` | 流程阶段 | 设计参数 / 某一屏 | 单选 | 浏览 / 进行中 | 3 | — | 流程演示 | builtin |
| `cnt.dataState` | 数据状态 | 设计参数 / 某一屏 | 单选 | 有数据 | 3 | — | 画布 | builtin |
| `cnt.elements` | 信息元素集合 | 设计参数 / 某一屏 | 多选 | 跟随（兜底：空） | 2 | — | 画布 | builtin |
| `cnt.dataShape` | 主数据结构 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 2 | — | 数据 | builtin |
| `cnt.density` | 信息密度 | 设计参数 / 某一屏 | 整数档位 | 2 | 1 ★ | — | 画布 | builtin |
| `cnt.itemCount` | 主体条目数 | 设计参数 / 某一屏 | 整数档位 | 跟随（兜底：6） | 3 | — | 画布 | builtin |
| `cnt.textLength` | 文案量 | 设计参数 / 某一屏 | 单选 | 一句话 | 2 | — | 画布 | builtin |
| `cnt.focal` | 主视觉主体 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 2 | cnt.dataShape ≠ spatial | 画布 / 素材 | builtin |
| `cnt.characterMedium` | 主角色呈现介质 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：avatar） | 3 | cnt.focal = character | 素材 | builtin |
| `cnt.companion` | 陪衬角色 | 设计参数 / 某一屏 | 单选 | 无 | 3 | — | 素材 / 画布 | builtin |
| `cnt.characterRender` | 角色画法处理 | 设计参数 / 某一屏 | 单选 | 彩色原样 | 3 | （cnt.focal = character 或 cnt.companion ≠ none 或 cnt.elements 含 {el.profile, el.party, el.turnOrder} 之一） | 画布（着色器） | shader |
| `cnt.tone` | 文案语气 | 设计参数 / 某一屏 | 单选 | 系统式 | 3 | — | 数据 | builtin |

#### `cnt.subtype` 界面子功能

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随 · 分层：tier 1（第一屏起点选择） · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a · 不参与随机

实现：数据：选界面模板（第 3.7 节）的键；每个取值带 parent（所属基础界面）与 layer（基础界面 / 浮层）。Godot：同一界面场景的变体（继承场景或 Theme type variation）

白话：这一屏是做什么的：登录、背包、抽卡结果、暂停……选它就会推荐对应的界面模板。 看哪里：模板给出的骨架（容器、构图、导航）是否像你要做的那一屏。

v2：父界面写进机器字段 parent（不再只在说明里）；确认、提示、大字提示、升级、奖励、引导、章节卡、记分板这类能叠在任何界面上的改为浮层（layer = overlay），没有 parent。新增 12 个 PC / 主机常见子功能（三选一、本局总结、路线图、按键绑定、难度、Boss 名牌、拾取弹出、装配、推理板、拼图背包、提示条、对话轮盘）。

吸收的观察轴 / 旧维度：GameUI 68 个功能标签、N:菜单语义用途、N:弹窗功能子类型、N:子功能/编辑目标、N:功能角色、N:公告内容类型、N:升级对象语义、N:社交子功能、N:交易模式、N:通行证页面类型、N:充值产品类型、N:福利机制类型、N:活动机制类型、N:抽奖机制隐喻、N:VIP载体形态

- `login` **登录**：海报 + 极少控件 + 合规角标（参考：GameUI#1762374、GameUI#614494） 〔属于 screen.frontend〕
- `server` **选服**：暗化背景 + 居中弹窗 + 左页签右列表 + 状态点（叠在登录页上）（参考：GameUI#534976、GameUI#594206） 〔浮层〕
- `create` **创建角色 / 捏脸**：预览载体 + 选项控件 + "下一步"（参考：GameUI#594209、GameUI#534982） 〔属于 screen.frontend〕
- `notice` **公告**：暗化背景 + 居中阅读弹窗（参考：GameUI#558742、GameUI#572305） 〔浮层〕
- `naming` **起名**：输入框 + 骰子随机 + 确认；常被包装成契约 / 证件（参考：GameUI#604573、GameUI#522754） 〔浮层〕
- `faction` **阵营 / 选将**：阵营卡或立绘并列选择（参考：GameUI#594066、GameUI#575873） 〔属于 screen.frontend〕
- `lobby` **主界面**：角色展台 / 路径地图 / 室内剖面 + 入口簇（参考：GameUI#1748411、GameUI#594027） 〔属于 screen.lobby〕
- `menu` **功能菜单 / 手册**：手游功能入口或 PC 暂停菜单（参考：GameUI#545543、GameUI#594011） 〔属于 screen.pause〕
- `pause` **暂停**：冻结画面 + 暗幕 + 竖排菜单（参考：GameUI#573374、GameUI#146281） 〔属于 screen.pause〕
- `photoMode` **拍照模式**：取景角标 + 快门 + 滤镜栏（参考：GameUI#126496、GameUI#143157） 〔属于 screen.pause〕
- `settings` **设置页**：控件列表：滑条、开关、分段、下拉（参考：GameUI#1511531、GameUI#594277） 〔属于 screen.settings〕
- `rebind` **按键绑定**：动作列表 + 键位，或键盘 / 手柄示意图 + 引线（参考：GameUI#573377、Hollow Knight s367520_5） 〔属于 screen.settings〕
- `difficulty` **难度 / 辅助模式**：难度档位卡 + 逐项辅助开关与说明（参考：Celeste（Assist Mode）、Hades（God Mode）） 〔属于 screen.settings〕
- `cutscene` **过场动画**：字幕 + 跳过键，UI 极少（参考：GameUI#1009447、GameUI#573380） 〔属于 screen.loading〕
- `loading` **读取**：背景素材 + 进度 + Tips（参考：GameUI#1775202、GameUI#1370789） 〔属于 screen.loading〕
- `guide` **新手引导**：指示符 + 遮罩 + 主持者 + 对话（叠在真实界面上）（参考：GameUI#584773、GameUI#1511384） 〔浮层〕
- `unlock` **功能解锁**：徽记 + 揭示演出 + 继续（参考：GameUI#600488、GameUI#564247） 〔浮层〕
- `confirm` **确认弹窗**：一句话 + 双按钮，或数量选择、协议长文（参考：GameUI#594215、GameUI#580656） 〔浮层〕
- `tips` **TIPS 小提示**：同一骨架换皮：确认 / 数量 / 资源不足（参考：GameUI#646842、GameUI#559177） 〔浮层〕
- `toast` **提示条**：圆角提示卡，自动消失（参考：GameUI#1663800） 〔浮层〕
- `combat` **战斗界面**：UI 骨架由玩法范式决定（参考：GameUI#1009418、GameUI#580604） 〔属于 screen.hud〕
- `callout` **战斗大字提示**：回合切换、Boss 来袭、合体技：整带 / 徽章 / 斜带（参考：GameUI#572354、GameUI#604580） 〔浮层〕
- `bossIntro` **Boss 登场名牌**：大字名 + 称号 + 镜头定格（参考：Hades、Hollow Knight、Elden Ring） 〔浮层〕
- `pickupToast` **拾取 / 成就弹出**：角落小卡：图标 + 名字 + 一句说明，自动消失（参考：Binding of Isaac s401920_3、Steam 成就弹出） 〔浮层〕
- `levelup` **升级提示**：前后对比 + 等级数字载体 + 继续（参考：GameUI#604597、GameUI#580609） 〔浮层〕
- `draft3` **三选一升级 / 祝福**：三张并排的强化卡 + 稀有度 + 重抽 / 跳过（参考：Hades（恩赐）、Vampire Survivors、Slay the Spire（选卡）） 〔浮层〕
- `vs` **VS / 匹配**：对阵分割 + VS 符号 + 匹配阶段（参考：GameUI#520751、GameUI#584767） 〔属于 screen.match〕
- `formation` **组队 / 布阵**：阵位几何 + 名册 + 出战键（参考：GameUI#572417、GameUI#567742） 〔属于 screen.match〕
- `reward` **恭喜获得**：奖励摆放 + 背光 + 点空白关闭（参考：GameUI#603729、GameUI#1511429） 〔浮层〕
- `settle` **结算**：胜负大字 + 奖励 / 数据 / 评级（参考：GameUI#1748480、GameUI#1698127） 〔属于 screen.results〕
- `runSummary` **本局总结 / 死亡**：死因 + 本局时长、击杀、获得 + 再来一局（参考：Hades（死亡回到冥府）、Dead Cells、Vampire Survivors） 〔属于 screen.results〕
- `stats` **数据统计 / 战报**：表格、对打条、MVP 高亮（参考：GameUI#1178800、GameUI#604592） 〔属于 screen.results〕
- `victory` **胜利 / 失败**：胜负色调对立 + 失败语气（参考：GameUI#625059、GameUI#604590） 〔属于 screen.results〕
- `chest` **宝箱 / 金币 / 兑换**：宝箱本体 + 档位 + 获取方式（参考：GameUI#603722、GameUI#556629） 〔属于 screen.results〕
- `scoreboard` **记分板**：按住键呼出的对局记分（叠在 HUD 上）（参考：World of Warcraft（IIG Scoreboard）、Dota 2） 〔浮层〕
- `npc` **NPC 对话**：立绘 + 底部文本框 + 名牌 + 选项（参考：GameUI#594004、GameUI#604577） 〔属于 screen.dialogue〕
- `dialogueWheel` **对话轮盘**：选项环绕中心，摇杆方向选择（参考：Mass Effect、Cyberpunk 2077） 〔属于 screen.dialogue〕
- `chapter` **章节标题卡**：黑场标题、横幅划过（叠在过场或关卡开始上）（参考：GameUI#572342、GameUI#559158） 〔浮层〕
- `stage` **关卡 / 挑战选择**：关卡拓扑 + 节点状态 + 进入键（参考：GameUI#596124、GameUI#604585） 〔属于 screen.levelselect〕
- `routeMap` **路线节点地图**：分叉路线 + 节点类型图标 + 已走路径（参考：Slay the Spire、Inscryption、FTL） 〔属于 screen.levelselect〕
- `profile` **玩家信息**：名片、头像、勋章（参考：GameUI#604599、GameUI#646845） 〔属于 screen.character〕
- `hero` **角色详情 / 养成**：角色呈现介质 + 属性 + 切换（参考：GameUI#1767141、GameUI#943764） 〔属于 screen.character〕
- `loadout` **装备纸娃娃 / 技能装配**：角色剪影周围一圈装备槽 + 属性对比（参考：Diablo、Elden Ring、Hades（武器 / 信物）） 〔属于 screen.character〕
- `outfit` **外观 / 时装**：预览载体 + 选择器 + 价格 / 拥有（参考：GameUI#943766、GameUI#514152） 〔属于 screen.character〕
- `pet` **宠物 / 坐骑**：主体舞台 + 养成动作 + 属性（参考：GameUI#535054、GameUI#487018） 〔属于 screen.character〕
- `avatarFrame` **头像 / 头像框 / 称号**：预览 + 网格 + 未获得表现（参考：GameUI#646845、GameUI#564162） 〔属于 screen.character〕
- `bag` **背包 / 仓库**：格子样式 + 空格 + 详情模式（参考：GameUI#1743976、GameUI#603725） 〔属于 screen.inventory〕
- `packGrid` **拼图格背包**：物品按形状占格，旋转摆放（参考：Resident Evil 4、Backpack Hero、Diablo II） 〔属于 screen.inventory〕
- `forge` **锻造 / 合成 / 变强**：核心装置 + 材料槽排布 + 前后对比（参考：GameUI#646899、GameUI#580683） 〔属于 screen.craft〕
- `skill` **技能**：树 / 环 / 卡牌网格 / 行列表（参考：GameUI#573454、GameUI#554271） 〔属于 screen.skilltree〕
- `quest` **任务**：五件套任务行 + 总进度里程碑（参考：GameUI#1743964、GameUI#943733） 〔属于 screen.journal〕
- `deduction` **推理板**：线索卡 + 连线 / 填空（参考：Return of the Obra Dinn、Shadows of Doubt、The Case of the Golden Idol） 〔属于 screen.journal〕
- `achievement` **成就**：行 / 徽章墙 / 拼贴 / 轨道（参考：GameUI#594258、GameUI#545679） 〔属于 screen.codex〕
- `collection` **图鉴**：容器隐喻 + 未解锁表现（参考：GameUI#1463177、GameUI#604663） 〔属于 screen.codex〕
- `worldmap` **地图**：地图本体画法 + 标记语言（参考：GameUI#594049、GameUI#604642） 〔属于 screen.map〕
- `deck` **卡组 / 卡牌**：卡牌形态 + 陈列载体（参考：GameUI#214058、GameUI#572456） 〔属于 screen.cards〕
- `home` **建造 / 家园**：相机视角 × 候选库形态 × 放置确认（参考：GameUI#518081、GameUI#556098） 〔属于 screen.build〕
- `mall` **商城**：陈列单位 + 价格位置 + 角标（参考：GameUI#1743969、GameUI#604615） 〔属于 screen.shop〕
- `auction` **拍卖行 / 交易所 / 柜台**：网格规格 + 商人 + 刷新（参考：GameUI#486069、GameUI#462112） 〔属于 screen.shop〕
- `guild` **公会 / 帮派**：承载形态 + 徽章 + 成员行（参考：GameUI#1743989、GameUI#604647） 〔属于 screen.social〕
- `chat` **聊天**：气泡 / 文本行 + 与实时场景共存（参考：GameUI#1511534、GameUI#943780） 〔属于 screen.social〕
- `friends` **好友 / 社交**：列表行 + 批量操作 + 空状态（参考：GameUI#604628、GameUI#594325） 〔属于 screen.social〕
- `mail` **邮件**：载体隐喻 + 列表 → 详情 + 附件（参考：GameUI#604607、GameUI#559123） 〔属于 screen.social〕
- `invite` **邀请好友**：列表 + 邀请奖励阶梯（参考：GameUI#604629、GameUI#504430） 〔属于 screen.social〕
- `marriage` **结婚 / 姻缘**：候选立绘 + 心形母题 + 书卷（参考：GameUI#522836、GameUI#474403） 〔属于 screen.social〕
- `leaderboard` **排行榜**：前三特写 + 名次标识 + 自身排名（参考：GameUI#625095、GameUI#594311） 〔属于 screen.rank〕
- `season` **赛季 / 段位**：徽章造型 + 进度轨道（参考：GameUI#594340、GameUI#445307） 〔属于 screen.rank〕
- `checkin` **七日 / 签到**：日格排布 × 天数隐喻 × 代言立绘（参考：GameUI#596110、GameUI#575888） 〔属于 screen.liveops〕
- `gacha10` **十连抽 / 招募**：入口 → 仪式 → 牌阵结果（参考：GameUI#646920、GameUI#604664） 〔属于 screen.liveops〕
- `topup` **充值 / 首充 / VIP**：产品类型 + 海报化 + 倍率大字（参考：GameUI#604614、GameUI#580635） 〔属于 screen.liveops〕
- `pass` **通行证**：奖励轨道 + 免费 / 付费区分（参考：GameUI#594312、GameUI#556160） 〔属于 screen.liveops〕
- `welfare` **福利 / 活动**：条目 + 领取按钮 + 头图（参考：GameUI#646866、GameUI#1511457） 〔属于 screen.liveops〕
- `wheel` **转盘 / 抽奖**：机制隐喻 + 奖品拓扑 + 指针（参考：GameUI#604670、GameUI#646917） 〔属于 screen.liveops〕
- `popupAd` **拍脸图**：海报 + 价格按钮 + 今日不再显示（叠在主界面上）（参考：GameUI#604565、GameUI#1562329） 〔浮层〕
- `redPacket` **红包**：信封本体 + 拆前拆后 + 记录（参考：GameUI#625077、GameUI#214553） 〔浮层〕
- `festival` **节日活动**：同机制换节日主题（参考：GameUI#535026、GameUI#215019） 〔属于 screen.liveops〕
- `credits` **制作人员**：滚动名单（参考：Hollow Knight（IIG Credits）） 〔属于 screen.title〕
- `saveSlot` **存档槽**：槽位列表或缩略图卡（参考：Hollow Knight、Resident Evil 2） 〔属于 screen.save〕

#### `cnt.screen` 界面类型

设计参数 · 范围：某一屏 · 类型：单选 · 默认：局内 HUD · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a · 现状：部分实现 · 不参与随机

由 `cnt.subtype` 推出（可手动覆盖）

实现：画布：切换要绘制的界面（M5 控件库 + M9 界面场景）。Godot：每种界面一个 Control 场景（.tscn），由 UI 管理脚本切换

白话：这一屏属于哪一类界面。选了子功能后通常自动定下来。 看哪里：界面模板列表按它过滤。

v2：子功能是基础界面时，界面类型由子功能的 parent 推出（不再两边都写）；子功能是浮层或未选时才手动选，此时它表示"浮层下面的那一屏"。26 个 id 与 uiContent.ts 一致。

吸收的观察轴 / 旧维度：现有 26 种界面（src/content/uiContent.ts）、IIG 21 个元素标签、计划第 4 维"界面场景"(hud.screen)

- `screen.hud` **局内 HUD**：玩的时候要一直看到什么（参考：Hades s1145360_0、Dota 2 s570_0、GameUI#1009418）
- `screen.title` **标题 / 主菜单**：第一印象：LOGO + 主视觉 + 几个入口（参考：Castle Crashers s204360_0、GameUI#1762374）
- `screen.pause` **暂停菜单**：停下来能做什么（参考：GameUI#573374、GameUI#545736）
- `screen.settings` **设置**：画面、操作、无障碍怎么调（参考：GameUI#1511531、GameUI#594277）
- `screen.inventory` **背包 / 物品**：我有什么、能用什么（参考：Moonlighter s606150_2、GameUI#1743976）
- `screen.character` **角色 / 装备 / 属性**：我现在多强、穿着什么（参考：GameUI#1743977、Clair Obscur（属性雷达））
- `screen.skilltree` **技能树 / 成长**：下一步往哪里成长（参考：Hades（Mirror of Night）、Grim Dawn s219990_2、GameUI#573454）
- `screen.map` **地图 / 世界地图**：我在哪、该去哪（参考：Civ VI、Red Dead Redemption 2、GameUI#594027）
- `screen.journal` **任务日志 / 目标**：我答应了谁、还有什么没做（参考：Anno 1800（Quest book）、GameUI#1743964）
- `screen.dialogue` **对话 / 文本**：谁在说话、我怎么回答（参考：Hades s1145360_1、GameUI#604577）
- `screen.shop` **商店 / 交易**：买卖什么、值不值（参考：Florence（货架）、GameUI#1743969）
- `screen.craft` **制作 / 合成**：能做什么、缺什么材料（参考：Witcher 3（Alchemy）、GameUI#646899）
- `screen.build` **建造菜单**：能造什么、放在哪（参考：Planet Zoo s703080_5、GameUI#518081）
- `screen.results` **结算 / 胜负 / 奖励**：这一局怎么样、得到了什么（参考：Mini Metro（结算）、GameUI#1748480）
- `screen.loading` **读取 / 过场**：等待时看什么（参考：GameUI#1775202、GameUI#572301）
- `screen.tutorial` **教程 / 提示卡**：这个怎么玩（参考：GameUI#584773、GameUI#1511384）
- `screen.codex` **图鉴 / 收集 / 成就**：我收集了多少（参考：Hearthstone（收藏册）、GameUI#1463177）
- `screen.save` **存档 / 读档**：进度存在哪（参考：Hollow Knight（长椅）、Resident Evil 2（打字机））
- `screen.lobby` **主界面 / 大厅**：进游戏后的落脚点（参考：GameUI#1748411、GameUI#646877）
- `screen.frontend` **登录 / 选服 / 创角**：进入游戏前要做什么（参考：GameUI#1511369、GameUI#534975）
- `screen.match` **匹配 / 组队 / 备战**：和谁一起、对手是谁（参考：GameUI#520751、GameUI#592060）
- `screen.social` **社交 / 聊天 / 公会 / 邮件**：我和其他玩家的联系（参考：GameUI#1511534、GameUI#604628）
- `screen.rank` **排行 / 赛季 / 段位**：我排第几（参考：GameUI#594340、GameUI#596121）
- `screen.liveops` **运营活动 / 抽卡 / 通行证**：今天有什么可领、可抽、可买（参考：GameUI#604664、GameUI#594312）
- `screen.levelselect` **关卡 / 章节选择**：下一关去哪、完成得怎么样（参考：GameUI#596124、GameUI#604585）
- `screen.cards` **手牌 / 牌桌**：我手里有什么、桌上发生什么（参考：Slay the Spire 2 s2868840_0、GWENT s1284410_0）

#### `cnt.layer` 基础界面 / 浮层

设计参数 · 范围：某一屏 · 类型：单选 · 默认：基础界面 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

由 `cnt.subtype` 推出（纯派生，不进控件面板）

实现：数据：这一屏是一个目的地（基础界面），还是叠在任意界面上的浮层。Godot：基础界面 = 场景切换；浮层 = 叠加的 CanvasLayer

v2 新增（R1）。浮层有自己的 lay.container（提示条、弹窗、全屏卡），叠在哪一屏由 cnt.screen 决定。

- `base` **基础界面**：玩家"去到"的一屏：背包、地图、设置
- `overlay` **浮层**：叠在任意一屏上的东西：提示条、确认、奖励、引导、章节卡（参考：GameUI#603729、GameUI#594215）

#### `cnt.stage` 流程阶段

设计参数 · 范围：某一屏 · 类型：单选 · 默认：浏览 / 进行中 · 分层：tier 3 · 页签：③内容与版式 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：同一屏在阶段之间切换（入口 → 仪式 → 结果）。Godot：AnimationTree 或简单状态机；每阶段一个子 Control

v2：删掉"空状态""预告 / 未解锁"（那是数据状态，见 cnt.dataState）。

吸收的观察轴 / 旧维度：N:抽卡流程阶段、N:匹配阶段、N:界面所处阶段、N:叙事时态、N:结果提示 vs 操作确认、N:拆前/拆后两态、N:拍照界面阶段

- `entry` **入口 / 选择**：还没开始：卡池入口、关卡选择、档位选择（参考：GameUI#604664、GameUI#596124）
- `main` **浏览 / 进行中**：常态：背包浏览、战斗中、设置调整（参考：GameUI#1743976、GameUI#1009418）
- `waiting` **等待 / 搜索**：匹配中、下载中、加载中（参考：GameUI#584767、GameUI#604574）
- `confirm` **确认 / 消耗前**：操作前确认：升级耗材、购买确认（参考：GameUI#943790、GameUI#594215）
- `ceremony` **揭示演出**：开抽仪式、匹配成功、拆红包（参考：GameUI#1778633、GameUI#1748475、GameUI#214554）
- `result` **结果**：十连结果、升级成功、领取完成（参考：GameUI#646920、GameUI#580609）

#### `cnt.dataState` 数据状态

设计参数 · 范围：某一屏 · 类型：单选 · 默认：有数据 · 分层：tier 3 · 页签：③内容与版式 · 展示：状态陈列板 · 里程碑：M9a

实现：画布：同一屏切换"有数据 / 空 / 未解锁"三种状态，驱动 st.emptyList 与 st.locked。Godot：数据驱动的显隐分组

v2 新增（R1），从 v1 的 cnt.stage 的 empty / locked 拆出。

- `normal` **有数据**：常态：列表里有数据
- `empty` **空**：邮件空箱、没有好友、没有记录（参考：GameUI#646885、GameUI#594325）
- `locked` **未解锁 / 预告**：功能预告、带锁入口（参考：GameUI#534875、GameUI#594098）

#### `cnt.elements` 信息元素集合

设计参数 · 范围：某一屏 · 类型：多选 · 默认：跟随（兜底：空） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布：决定这一屏实例化哪些信息元素控件（第 2.17 组每个元素有自己的参数）。Godot：每个元素一个可复用 Control 子场景；HUD 场景按集合实例化

白话：这一屏上有哪些信息块：血条、小地图、目标、按钮…… 看哪里：有没有多余的元素挡画面，有没有缺了玩家要的信息。

"这个元素有没有"只看这里（v2：删掉了各元素画法里的"不显示"、elx.visibility 的"隐藏"、rel.hudVisibility 的"只留叙事内"）。多选合并方式 = 替换：界面模板给的集合整体替换品类布局给的集合。约束 lay.container = none ⇒ 集合为空。

吸收的观察轴 / 旧维度：现有 18 种信息元素、新增 14 种（见 el 组）

- `el.vitals` **生命 / 护盾 / 体力**：我还能撑多久（参考：Hades s1145360_0）
- `el.resources` **资源 / 货币**：我有多少可以花（参考：Anno 1800）
- `el.abilities` **技能 / 冷却 / 弹药 / 手牌**：我现在能做什么动作（参考：Dota 2 s570_0）
- `el.minimap` **小地图 / 罗盘**：周围是什么（参考：Witcher 3）
- `el.objective` **目标 / 路点**：现在该干什么（参考：Control）
- `el.interact` **交互提示**：这个能不能用（参考：Party Hard s356570_0）
- `el.threat` **敌人血条 / 预警 / 意图**：谁在威胁我（参考：Into the Breach s590380_0）
- `el.feedback` **命中反馈 / 连击**：刚才那下有没有效（参考：DBFZ s678950_1）
- `el.notify` **通知 / 大字提示**：刚刚发生了什么（参考：GameUI#564135）
- `el.timer` **计时 / 分数 / 回合**：节奏与成绩（参考：Worms W.M.D s327030_1）
- `el.speed` **速度 / 名次**：开多快、排第几（参考：The Crew s2698940_0）
- `el.crosshair` **准星 / 瞄准**：我瞄着哪（参考：World of Warships s552990_0）
- `el.selection` **选中信息面板**：选中的是什么（参考：Gears Tactics s1184050_3）
- `el.party` **队伍 / 玩家条**：队友怎么样（参考：Castle Crashers s204360_1）
- `el.clock` **时间 / 天气 / 日历**：现在几点几号（参考：GameUI#594251）
- `el.overlay` **信息叠层 / 图例**：整片区域的数据分布（参考：Cities Skylines）
- `el.prompt` **按键 / 操作提示**：现在能按什么（参考：GameUI#545545）
- `el.subtitle` **字幕 / 说话人**：谁在说什么（参考：GameUI#575861）
- `el.cta` **主行动按钮**：下一步点哪（参考：GameUI#594209）
- `el.title` **标题 / LOGO**：这是哪一屏（参考：GameUI#1762374）
- `el.reward` **奖励 / 获得物**：得到了什么（参考：GameUI#603729）
- `el.cost` **价格 / 消耗**：要花什么（参考：GameUI#580683）
- `el.rank` **名次 / 段位 / 评级**：我排第几（参考：GameUI#594340）
- `el.profile` **身份 / 头像 / 等级**：我是谁（参考：GameUI#1743963）
- `el.loading` **加载 / 等待指示**：还要等多久（参考：GameUI#1775202）
- `el.guide` **引导指示 / 聚光**：该点哪里（参考：GameUI#584773）
- `el.chat` **聊天**：其他人在说什么（参考：GameUI#1694106）
- `el.gameSpeed` **倍速 / 暂停 / 自动**：节奏怎么控制（参考：Bloons TD 6 s960090_0）
- `el.meter` **世界 / 社会态势条**：局势怎么样：温度、希望、通缉、警戒（参考：Frostpunk s323190_2、NFS Heat）
- `el.toolbar` **建造栏 / 系统入口条**：能造什么、能打开什么（参考：Anno 1800、Frostpunk s323190_2）
- `el.turnOrder` **行动顺序**：下一个轮到谁（参考：Clair Obscur s1903340_5、Darkest Dungeon）
- `el.choices` **对话 / 事件选项**：我可以怎么回答（参考：Night Call s680380_3、Frostpunk s323190_4）

#### `cnt.dataShape` 主数据结构

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：数据：决定主区域放什么形状的数据（与"排成什么几何形状" lay.arrangement 分开）。Godot：集合 → ItemList / GridContainer；层级 → Tree / 自绘；网络 → GraphEdit 或自绘；空间 → SubViewport 地图

白话：主区域的数据是什么形状：一堆同类东西、一棵树、一张网、一条时间线、一张地图。 看哪里：数据的关系有没有被版式表达出来（父子、先后、空间位置）。

v2：只表达语义（R1），删掉"网格"（背包是一个集合，排成格子是 lay.arrangement = grid）。地图 = spatial，此时主视觉自动是地图（cnt.focal 不生效）。

吸收的观察轴 / 旧维度：C3

- `none` **无数据**：纯美术 + 按钮：登录、海报、标题卡（参考：GameUI#614494、GameUI#1762374）
- `scalar` **单个数值**：一个大数：血量、金额、倍率、计时（参考：GameUI#1663798、GameUI#625077）
- `record` **单项详情**：一件物品 / 一个角色 / 一句提示的说明（参考：GameUI#534982、GameUI#603729）
- `collection` **同类集合**：同构条目：背包、商品、好友、头像（参考：GameUI#575866、GameUI#1511375、GameUI#1776455）
- `table` **对比表**：多列对照：档位、战绩、前后属性（参考：GameUI#556097、GameUI#594343）
- `hierarchy` **层级 / 树**：有父子依赖：科技树、技能树、对阵树（参考：Civ VI（科技树）、GameUI#573454、GameUI#549937）
- `network` **关系网**：节点 + 连线，无严格父子：星图、法典、推理板（参考：Frostpunk（Book of laws）、Grim Dawn s219990_2、GameUI#573463）
- `sequence` **序列 / 时间线**：有先后：通行证、里程碑、签到、行动顺序（参考：GameUI#594312、GameUI#445308）
- `spatial` **空间 / 地图**：空间位置本身就是数据（参考：GameUI#594027、Mini Metro s287980_0）
- `text` **叙述文本**：段落：公告、剧情、协议（参考：GameUI#567628、GameUI#943700）
- `form` **表单**：输入：起名、创建公会、设置（参考：GameUI#572460、GameUI#584797）

#### `cnt.density` 信息密度

设计参数 · 范围：某一屏 · 类型：整数档位 0–4（步长 1） · 默认：2 · 分层：tier 1（第一屏大旋钮） · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

随机区间：1–3

实现：画布：控制可见字段与元素数量（同一界面的精简 / 完整档）；工具侧统计每百平方像素的文字量。Godot：同一场景的显隐分组（visible 开关）

白话：每块地方塞多少信息。0 只有一两样东西，4 是信息墙。 看哪里：同一张卡上的字段数、留白多少。 两端：0 极简：GRIS、Monument Valley ↔ 4 极密：Stellaris、MMO 面板。

v2：只管字段与元素，不管装饰（装饰量见 vis.ornament）。与屏占比独立：全屏页可以极简（GRIS），角落小 HUD 可以极密（WoW）。

吸收的观察轴 / 旧维度：C2、N:单卡信息量、N:商品卡信息量

- `0` **极简**：一两个元素，大量留白（参考：GRIS、Monument Valley、GameUI#614494）
- `1` **稀疏**：少量信息，重点突出（参考：Control、GameUI#1762374）
- `2` **中等**：常规菜单（参考：GameUI#1776456、GameUI#1178739）
- `3` **密集**：多栏多数据（参考：World of Warcraft、GameUI#594211）
- `4` **极密**：信息墙：大战略、MMO（参考：Stellaris s281990_2、GameUI#943688）

#### `cnt.itemCount` 主体条目数

设计参数 · 范围：某一屏 · 类型：整数档位 1–60（步长 1） · 默认：跟随（兜底：6） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

随机区间：3–12

实现：画布：主区域实例化多少个条目（十连 = 10，签到 = 7，三选一 = 3）。Godot：数据驱动实例化子场景

吸收的观察轴 / 旧维度：N:队位数量、N:奖励槽数量排布、N:技能物品槽容量、N:奖励格密度、N:菜单项数量、N:变化属性行数

#### `cnt.textLength` 文案量

设计参数 · 范围：某一屏 · 类型：单选 · 默认：一句话 · 分层：tier 2 · 页签：③内容与版式 · 展示：文案 / 设备外框 · 里程碑：M5a

实现：画布：占位文案的长度档位（检查排版与溢出）。Godot：Label / RichTextLabel + ScrollContainer

白话：这一屏的字有多少：没有、只有标题、一句话、一小段、长文。 看哪里：文字区域会不会挤或空。

与信息密度独立：一句话也可以字很大（标题卡），长文也可以是唯一元素（协议）。

吸收的观察轴 / 旧维度：N:文案长度、N:文字量、N:文字层级、N:内容长度、N:附带信息层

- `none` **无文字**：纯图标 / 纯画面（参考：Monument Valley、GameUI#1663799）
- `title` **仅标题**：一个词或一个大字（参考：GameUI#943717、GameUI#572354）
- `line` **一句话**：提示、确认（参考：GameUI#594215、GameUI#1511384）
- `short` **短段（2–3 句）**：说明、奖励描述（参考：GameUI#580656、GameUI#585162）
- `long` **长文滚动**：公告、协议、剧情（参考：GameUI#564122、GameUI#943688）

#### `cnt.focal` 主视觉主体

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：cnt.dataShape ≠ spatial

实现：画布 / 素材：主区域放什么当视觉中心（占位图或场景渲染）。Godot：TextureRect（立绘 / 插画）、SubViewport（3D 模型）

白话：画面中心放什么：标题大字、角色、场景、物品、装置、数据、卡牌，还是没有（信息本身就是主体）。 看哪里：一眼看过去最大的那样东西。

v2：删掉"地图"（由 cnt.dataShape = spatial 推出）；"装置"改名 apparatus，避免与 ctx.device 同名。

吸收的观察轴 / 旧维度：L3、N:主视觉类型、N:结算焦点内容、N:核心装置隐喻、N:宝箱载体形态

- `none` **无（信息就是主体）**：纯列表、纯表格（参考：GameUI#1178800）
- `title` **标题字**：巨型标题或胜负大字当主角（参考：GameUI#1762374、GameUI#1748480）
- `character` **角色**：人物主导画面（介质见 cnt.characterMedium）（参考：GameUI#1767146、GameUI#594209）
- `scene` **场景**：实景或插画场景当主体（参考：GameUI#614494、GameUI#943690）
- `item` **物品 / 奖励**：一件物品、宝箱、红包（参考：GameUI#603722、GameUI#625077）
- `apparatus` **装置**：熔炉、法阵、转盘、浑天仪（参考：GameUI#646899、GameUI#1778633、GameUI#604670）
- `data` **数据**：大数字、图表、表格当主体（参考：GameUI#559154、Mini Metro）
- `card` **卡牌**：卡面当主体（参考：GameUI#211996、GameUI#572456）

#### `cnt.characterMedium` 主角色呈现介质

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：avatar） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：cnt.focal = character

实现：素材：占位立绘 / 头像 / 剪影 / 3D 模型（场景里的角色可直接用）。Godot：TextureRect（2D）；SubViewport + Camera3D（3D 展台）

v2：从 v1 的 cnt.character 拆出（R1），只在主视觉是角色时生效；陪衬角色另见 cnt.companion。先用场景里现成的 3D 角色和剪影，立绘等 M11。

吸收的观察轴 / 旧维度：N:角色呈现形态、N:角色呈现介质、N:立绘类型、N:预览载体、N:角色出镜、N:代言角色位置

- `avatar` **头像级**：圆 / 方小头像（对话框旁的说话人头像也算）（参考：GameUI#646845、Stardew Valley s413150_4） 〔需素材〕
- `chibi` **Q 版小人**：站位小人或走动小人（参考：GameUI#580610、GameUI#556658） 〔需素材〕
- `bust` **半身立绘**：对话与名片常用（参考：GameUI#585160、GameUI#575864） 〔需素材〕
- `full` **全身立绘**：抽卡、角色详情、首充（参考：GameUI#594004、GameUI#943764） 〔需素材〕
- `model3d` **3D 实时模型**：可旋转的展台角色（参考：GameUI#1767141、Minion Masters s489520_2） 〔需场景〕
- `silhouette` **剪影**：未获得、神秘（参考：GameUI#1079022） 〔需素材〕
- `liveAction` **真人影像**：球星、真人主持（参考：GameUI#575866、GameUI#1009432） 〔需素材〕
- `diagram` **人体示意图**：生存类的分部状态（参考：GameUI#594230） 〔需素材〕

#### `cnt.companion` 陪衬角色

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：素材 / 画布：主体之外站在弹窗旁或角落说话的角色。Godot：TextureRect + 气泡

v2 新增（R1），从 v1 的 cnt.character = mascot 拆出：主体是数据时角落仍可站一个吉祥物。

吸收的观察轴 / 旧维度：N:角色在场方式、N:引导主持者、N:人物/吉祥物介入

- `none` **无**：画面里没有角色，信息本身就是主体
- `mascot` **吉祥物 / NPC 陪衬**：站在弹窗旁或角落说话（参考：GameUI#564126、GameUI#556123） 〔需素材〕
- `avatar` **说话头像**：角落一个小头像 + 气泡（参考：GameUI#556132）

#### `cnt.characterRender` 角色画法处理

设计参数 · 范围：某一屏 · 类型：单选 · 默认：彩色原样 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：（cnt.focal = character 或 cnt.companion ≠ none 或 cnt.elements 含 {el.profile, el.party, el.turnOrder} 之一）

实现：画布（着色器）：角色图像用什么处理呈现；可与 st.locked 联动（锁定时素描、解锁后上色）。Godot：CanvasItem 着色器（去色、浮雕、线稿提取）

v2 新增（R2：Civ VI 伟人页的白色浮雕头像、锁定素描 / 解锁上色）。

- `color` **彩色原样**：角色图像原样上色 〔Godot：着色器〕
- `sketch` **素描**：未解锁时只有铅笔稿（参考：ui-asset-materials 24.4） 〔Godot：着色器〕
- `relief` **浮雕**：白色或金属浮雕头像（参考：Civ VI（伟人）） 〔Godot：着色器〕
- `engraving` **版画 / 铜版**：铜版 / 版画线条处理（参考：Return of the Obra Dinn） 〔Godot：着色器〕
- `lineart` **线稿**：只留线稿（参考：GameUI#1079008） 〔Godot：着色器〕
- `monochrome` **单色**：单色调（与画面统一）（参考：Night Call s680380_1） 〔Godot：着色器〕

#### `cnt.tone` 文案语气

设计参数 · 范围：某一屏 · 类型：单选 · 默认：系统式 · 分层：tier 3 · 页签：③内容与版式 · 展示：文案 / 设备外框 · 里程碑：M9a

实现：数据：占位文案换语气（描述导出与提示词也带上）。Godot：翻译表里的文案（不是视觉参数）

语气是 UX 的一部分：失败页"继续努力"与"DEFEAT"传达的情绪不同，但版式可以完全一样。

吸收的观察轴 / 旧维度：N:标题语气、N:失败语气、N:卖点文案类型

- `system` **系统式**："设置名称""确认购买"（参考：GameUI#520675）
- `character` **角色口吻**："起个响亮的名字吧！"（参考：GameUI#564126）
- `narrative` **叙事式**："签下契约""探索中止"（参考：GameUI#486961、GameUI#594020）
- `encouraging` **激励**：失败页写"继续努力"（参考：GameUI#594345）
- `punitive` **冷峻 / 惩罚**："DEFEAT""YOU DIED"（参考：GameUI#1463211）
- `hype` **营销夸张**："3000% 返利""十连必出"（参考：GameUI#625073、GameUI#575934）

### 2.3 结构与版式（怎么排）（`lay.*`）

**这一屏的东西怎么摆？** 容器、构图、条目的几何排布、导航、详情、分组、层叠、溢出。只决定位置与关系，不决定质感。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `lay.container` | 容器 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：fullscreen） | 2 | — | 画布 | builtin |
| `lay.panelSize` | 容器尺寸 | 设计参数 / 某一屏 | 连续 | 跟随（兜底：0.5） | 3 | lay.container ∈ {modal, drawer, sheet, banner} | 画布 | builtin |
| `lay.hudOrg` | HUD 组织方式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：scattered） | 2 | cnt.screen = screen.hud | 画布 | builtin |
| `lay.playfield` | 玩法区形态 | 设计参数 / 某一屏 | 单选 | 全屏 | 3 | — | 画布 | builtin / script |
| `lay.composition` | 分区方式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：single） | 2 | — | 画布 | builtin |
| `lay.focalSide` | 主体位置 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：center） | 3 | cnt.focal ≠ none 且 cnt.dataShape ≠ spatial | 画布 | builtin |
| `lay.arrangement` | 条目排布几何 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：row） | 2 | cnt.dataShape ∈ {collection, hierarchy, network, sequence} | 画布 | builtin |
| `lay.columns` | 网格列数 | 设计参数 / 某一屏 | 整数档位 | 跟随（兜底：4） | 3 | lay.arrangement ∈ {grid, hexGrid} | 画布 | builtin |
| `lay.nav` | 分区导航 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |
| `lay.navDepth` | 分类级数 | 设计参数 / 某一屏 | 整数档位 | 1 | 3 | — | 画布 | builtin |
| `lay.detail` | 详情呈现 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |
| `lay.preview` | 即时预览 | 设计参数 / 某一屏 | 开关 | 关 | 3 | — | 画布 | builtin |
| `lay.grouping` | 分组方式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：panel） | 3 | — | 画布 | builtin |
| `lay.layering` | 主体与面板层叠 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：separate） | 3 | — | 画布 | builtin |
| `lay.overflow` | 内容溢出方式 | 设计参数 / 某一屏 | 单选 | 单屏 | 3 | — | 画布 | builtin |
| `lay.pageIndicator` | 分页指示 | 设计参数 / 某一屏 | 单选 | 左右箭头 | 3 | lay.overflow = paged | 画布 | builtin |
| `lay.pinned` | 固定 / 置顶项 | 设计参数 / 某一屏 | 单选 | 无 | 3 | — | 画布 | builtin |
| `lay.safeMargin` | 安全边距 | 设计参数 / 全局 | 连续 | 跟随（兜底：2） | 3 | — | 画布 | builtin |
| `lay.grid` | 对齐体系 | 设计参数 / 全局 | 单选 | 跟随（兜底：free） | 3 | — | 画布 | builtin |

#### `lay.container` 容器

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：fullscreen） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：这一屏的 UI 装在什么容器里、贴在哪条边（M9 界面场景的骨架）。Godot：CanvasLayer + Control：PanelContainer（弹窗）、侧抽屉用锚点 + Tween、Window（多窗）

白话：UI 装在什么里：没有容器直接叠在画面上、一条横幅、一个居中弹窗、从侧边滑出的抽屉、整屏替换…… 看哪里：UI 占了多大一块、背后的游戏画面还剩多少。

v2：原 lay.archetype 改名并只保留"容器边界与附着方式"（R1）。左列表右详情、网格陈列、地图为主、扇形手牌、轮盘、海报改为第 3.8 节的"版式预设"；叙事内物件、空间内浮动删掉（用 rel.diegesis + ast.container 表达）；"局内 HUD"删掉（cnt.screen = hud 推出 overlay）。none 严格表示"本屏不画任何 UI"，约束 none ⇒ cnt.elements 为空。

吸收的观察轴 / 旧维度：L1、N:底板形态、N:菜单承载（主机式）、N:主界面隐喻、N:公会承载形态、N:面板并存方式

- `none` **不画 UI**：本屏没有任何 UI：纯画面、电影模式、商店宣传图（参考：GRIS s683320_0、Days Gone s1259420_3）
- `overlay` **直接叠加**：没有整体容器，元素各自叠在游戏画面上（HUD、字幕）（参考：Hades s1145360_0、GameUI#1694106）
- `banner` **横幅 / 提示条**：横贯屏幕或角落的一条（参考：GameUI#564135、GameUI#1663800）
- `modal` **居中弹窗**：暗化背景上的一块面板（参考：GameUI#1304865、GameUI#572344）
- `drawer` **侧抽屉**：从一侧滑出，另一侧仍见场景（参考：GameUI#1511534、Against the Storm s1336490_2）
- `sheet` **底部浮层**：从底边升起的半屏面板（竖屏常用）（参考：GameUI#603721）
- `tray` **底 / 顶托盘**：整条托盘：手牌、建造栏、对话框（参考：GameUI#480368、GameUI#518082）
- `fullscreen` **全屏页**：整屏替换（参考：GameUI#1767146、GameUI#594209）
- `window` **可拖动窗口**：可同时打开、可拖动的多个独立窗口（参考：Path of Exile s238960_2、Albion Online s761890_4）

#### `lay.panelSize` 容器尺寸

设计参数 · 范围：某一屏 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：0.5） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：lay.container ∈ {modal, drawer, sheet, banner} · 随机区间：0.3–0.8

实现：画布：容器在它允许区间内的相对尺寸。Godot：PanelContainer 的 custom_minimum_size / 锚点

v2 新增（R1），取代 v1 的 lay.coverage 里"真正可调"的那部分。区间：弹窗 40–80% 屏、抽屉 30–50% 宽、底部浮层 30–70% 高、横幅 8–20% 高；0 = 区间下限，1 = 上限。整屏 UI 占比改为工具侧读数 chk.coverage。

#### `lay.hudOrg` HUD 组织方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：scattered） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M7

生效条件：cnt.screen = screen.hud

实现：画布：HUD 组件是各自独立、连成底座、贴成一条边，还是画在玩法区外的边框里。Godot：分散：每个组件一个锚定 Control；底座：PanelContainer 横跨底边；边条：锚定一边的 HBox/VBox；边框：玩法区 SubViewport 外的 Control

白话：局内 HUD 是散在四角、连成一整条底座、贴成一条边，还是画在玩法区外面的边框里。 看哪里：屏幕四边与底部。

v2（R1）：删"只剩一两件"（那是元素数量，见 cnt.elements）、"无底悬浮"（那是 vis.opacity = 0）、"顶部资源栏"（= 边条 + 资源元素锚在上边）；"嵌入装饰边框"改名 inMargin，只在玩法区不是全屏时成立。

吸收的观察轴 / 旧维度：N:HUD整合度、N:HUD与关卡框一体、N:HUD锚定边

- `scattered` **分散组件**：各组件独立锚在角落或边上，中间留给游戏（参考：Hades、World of Warships s552990_0、Witcher 3）
- `console` **整合底座**：一整条底座连起小地图、头像、技能、物品（参考：Dota 2 s570_0、Total War Warhammer II s594570_0、WoW（技能栏端盖））
- `edgeBar` **贴边整条**：一条贯穿某一边的栏（顶部资源栏、整列侧栏）；哪条边由元素锚点决定（参考：Anno 1800、Civ VI、Bloons TD 6 s960090_0）
- `inMargin` **画在玩法区外的边框里**：HUD 画在 4:3 / 棋盘窗外的装饰边上（参考：Flinthook s401710_2、Nuclear Throne s242680_4）

#### `lay.playfield` 玩法区形态

设计参数 · 范围：某一屏 · 类型：单选 · 默认：全屏 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M7

实现：画布：游戏画面是全屏，还是被框成 4:3、窄条、棋盘窗、画中画、分屏。Godot：SubViewport 的位置与大小；两侧装饰用 TextureRect

v2（R1）：吸收 v1 ctx.orientation 的 boxed；"画中画"改名 pip（避免与 inset 同名）；"分屏"由 ctx.players = split 推出。

吸收的观察轴 / 旧维度：N:游玩区形态、N:玩法区即界面、N:两侧艺术区内容、N:画幅与黑边（玩法区部分）

- `full` **全屏**：画面铺满，HUD 叠在上面（参考：Hades）
- `boxed` **4:3 / 小窗加黑边**：复古整数缩放后四周留黑边，黑边可以画装饰或 HUD（参考：Nuclear Throne s242680_0、Fez s224760_4、Flinthook s401710_2）
- `centerColumn` **居中竖条 + 两侧装饰区**：竖版弹幕、音游轨道：两侧放立绘或大字（参考：DJMAX RESPECT V s960170_1、s2062430_0）
- `boardWindow` **棋盘 / 关卡窗**：玩法区是一块被框住的板（参考：Into the Breach、Carcassonne s598810_2）
- `pip` **画中画**：主界面里嵌一个小场景窗（参考：Wargroove s607050_0（战斗切入窗））
- `split` **分屏视口**：多个视口（由 ctx.players = split 推出）（参考：It Takes Two s1426210_2） 〔Godot：脚本〕

#### `lay.composition` 分区方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：single） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：主区域分成几块。Godot：HBox / VBox / HSplit / GridContainer 组合

白话：主区域分成几块：一整块、左右两栏、上下两栏、三栏，或者斜着切开。 看哪里：面板之间的分界线。

v2（R1）：只管分区。删"对称居中 / 不对称 / 镜像"（对称性由 lay.focalSide = center / both 表达，镜像由 ctx.players = versus 推出）、"四角分散"（= lay.hudOrg = scattered）；"斜切分屏"改名 diagonalSplit。

吸收的观察轴 / 旧维度：L5、N:对阵分割方向、N:对阵结构、N:敌我布局、N:同屏面板数

- `single` **单区**：一块主区域（可以居中也可以偏一侧，见 lay.focalSide）（参考：GameUI#1762374、GameUI#552243）
- `splitLR` **左右分栏**：两栏：列表 + 详情，或立绘 + 面板（参考：GameUI#1178739、GameUI#556594）
- `splitTB` **上下分栏**：竖屏常用：上场景 / 下托盘（参考：GameUI#480368、GameUI#567706）
- `three` **三栏**：左子菜单 | 中展示 | 右网格（参考：Minion Masters s489520_2、AC Shadows s3159330_3、Albion Online s761890_4）
- `diagonalSplit` **斜切分屏**：对角线切开两半（参考：GameUI#1748417、GameUI#513945）

#### `lay.focalSide` 主体位置

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：center） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：cnt.focal ≠ none 且 cnt.dataShape ≠ spatial

实现：画布：立绘 / 主体放哪一侧，信息区自动让到另一侧。Godot：锚点预设（PRESET_LEFT_WIDE / RIGHT_WIDE）

v2：删"整屏背景"（与 lay.layering = backdrop 重复）。ctx.players = versus 时派生为 both。

吸收的观察轴 / 旧维度：N:角色出场方位、N:代言立绘位置、N:菜单对齐/锚点

- `center` **居中**：主体居中，信息对称分布在两侧或下方（参考：GameUI#594004）
- `left` **左**：主体靠左，信息面板让到右侧（参考：GameUI#580596、GameUI#572522）
- `right` **右**：主体靠右，信息面板让到左侧（参考：GameUI#580598、GameUI#604602）
- `both` **两侧（对话双人 / 对阵）**：两侧各一个主体，信息放中间或底部（参考：GameUI#604578）
- `top` **上**：竖屏上半屏（参考：GameUI#567706）

#### `lay.arrangement` 条目排布几何

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：row） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：cnt.dataShape ∈ {collection, hierarchy, network, sequence}

实现：画布：同一组条目沿什么几何形状排（行、环、金字塔、路径……）。Godot：规则排布用 Container；环、路径、金字塔、螺旋用脚本按公式摆放 Control（或 Path2D + PathFollow2D）

白话：一组条目摆成什么形状：一行、一列、网格、一圈、金字塔、路径、星图、扇形…… 看哪里：奖励、技能、关卡节点的排列。

与 cnt.dataShape 正交：同一份集合可排成一行、一圈或一条蜿蜒路径。这也是唯一的"轮盘"词表（v2 删掉 lay.nav / ix.mode / cmp.choice 里的轮盘）。信息元素内部的排布用同一词表的逐元素版 elx.arrangement。

吸收的观察轴 / 旧维度：N:阵型空间模型、N:阵型几何、N:关卡拓扑、N:技能组织结构、N:日格排布、N:十连牌阵排布、N:成就展示单元、N:输入槽布局、N:材料槽排布、N:奖品展示拓扑、N:奖励序列拓扑、N:轨道方向与排列、N:候选对象展示形式

- `row` **横排**：一行并列（3 张卡、5 个奖励）（参考：GameUI#594354、GameUI#572416）
- `column` **竖列**：纵向列表（参考：GameUI#646866）
- `grid` **规则网格**：N×M 格（参考：GameUI#646845、GameUI#596110）
- `hexGrid` **六角网**：六边形格（参考：GameUI#567742、GameUI#604605）
- `ring` **环绕中心 / 轮盘**：围着角色、装置或转盘；摇杆 / 鼠标方向选择由 ctx.input 推出（参考：GameUI#594066、GameUI#580682、GameUI#604670、Red Dead Redemption 2（Ability Wheel））
- `pyramid` **金字塔 / 菱阵**：十连常见的 4-3-2-1、2-3-3-2（参考：GameUI#646920、GameUI#625068）
- `path` **蜿蜒路径**：关卡节点沿路径排（参考：GameUI#596124、GameUI#580668）
- `tower` **垂直爬塔**：自下而上一层层（参考：GameUI#625091）
- `tree` **树 / 连线**：父子分叉（参考：GameUI#573454、Civ VI）
- `constellation` **星图散点**：节点自由分布 + 细线（参考：Grim Dawn s219990_2、Frostpunk（Book of laws）、GameUI#573460）
- `spiral` **螺旋**：自中心向外旋出（新，R2）（参考：GameUI#573460）
- `cross` **十字四向**：上下左右四格（新，R2）（参考：Elden Ring（快捷装备））
- `track` **轨道**：一条长轨（可横可纵），带里程碑（参考：GameUI#594312、GameUI#1707360）
- `pitch` **球场 / 实景站位**：站位按真实空间（参考：GameUI#575873、GameUI#575950）
- `fan` **扇形**：手牌（参考：GameUI#577645、Slay the Spire 2 s2868840_0）
- `scatter` **自由散落**：桌面上随意摆放（参考：GameUI#580660、Hearthstone）

#### `lay.columns` 网格列数

设计参数 · 范围：某一屏 · 类型：整数档位 1–8（步长 1） · 默认：跟随（兜底：4） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

生效条件：lay.arrangement ∈ {grid, hexGrid} · 随机区间：2–6

实现：画布：网格的列数。Godot：GridContainer.columns

v2：只表示网格列数；表格的字段数由 cmp.listRow 的字段多选推出（v1 tpl.stats 把 6 列表格写进这里）。竖屏时 D-orient 把上限压到 4。参考：好友双列（GameUI#604629）、商城 3 列（GameUI#455239）、头像 4×4（GameUI#646845）、背包 6 列以上（GameUI#556622）。

吸收的观察轴 / 旧维度：N:列数密度、N:列表列数、N:商品网格规格、N:格子密度

#### `lay.nav` 分区导航

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：在几个分区之间切换（页签 / 宫格 / 场景热区）。Godot：TabContainer / TabBar（可放四边）；按钮组 + ButtonGroup

白话：在几个分区之间怎么切换：上下左右的页签、图标宫格，或点场景里的物件。 看哪里：页签在哪一边。

v2（R1）：只留分区导航。翻页箭头、圆点分页移到 lay.pageIndicator；竖排按钮栈删掉（= lay.arrangement = column + cmp.button = text）；轮盘删掉（= lay.arrangement = ring）。"场景热区"同时承担 v1 el.cta 的"场景内点击"与 ast.container = desk 的"物件即入口"。竖屏时 D-orient 把侧页签改成底部页签。

吸收的观察轴 / 旧维度：L2、N:分区导航形态、N:频道切换位置、N:卡池切换方式、N:榜种切换结构、N:入口承载方式、N:功能入口组织

- `none` **无导航**：单页（参考：GameUI#594209）
- `tabsTop` **顶部页签**：PC 与横屏常见（参考：GameUI#545709、GameUI#575858）
- `tabsBottom` **底部页签**：竖屏手游主导航（参考：GameUI#646877、GameUI#1743963）
- `tabsLeft` **左侧页签**：弹窗与全屏页最常见（参考：GameUI#1776454、GameUI#594211）
- `tabsRight` **右侧页签**：给左侧留出立绘（参考：GameUI#594206、GameUI#594233）
- `hub` **图标宫格**：入口铺成宫格（参考：GameUI#1743989、Animal Crossing（Nookphone））
- `hotspots` **场景热区**：点场景里的物件进入（房间即入口）（参考：GameUI#600496、GameUI#603713）

#### `lay.navDepth` 分类级数

设计参数 · 范围：某一屏 · 类型：整数档位 0–3（步长 1） · 默认：1 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：几级分类（0 无、1 单级、2 左 + 顶双级）。Godot：嵌套 TabContainer

v2 改名为"分类级数"（R1：避免与弹窗栈深、视觉层级、信息优先级都叫"层级"）。参考：双级分类 GameUI#572546；无分类 GameUI#646886。

吸收的观察轴 / 旧维度：N:分类粒度、N:分类层级、N:设置分组结构

#### `lay.detail` 详情呈现

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：③内容与版式 · 展示：状态陈列板 · 里程碑：M9a

实现：画布：选中条目后详情在哪出现。Godot：常驻：HSplitContainer 一侧；临时：PopupPanel / 自定义 tooltip（_make_custom_tooltip）

白话：选中一个条目后，说明出现在哪：没有、在条目下面展开、另一栏一直显示、临时弹出来。 看哪里：点一个格子后多出来的那块。

v2（R1）：常驻详情的位置由 lay.composition 推出；临时详情的外形（悬停提示 / 弹窗 / 底部浮层）由 cmp.modal + ctx.input 推出（D-input）。v1 的"对页翻开"删掉：ast.container = book 时自动为常驻。即时预览另立 lay.preview。

吸收的观察轴 / 旧维度：N:详情面板模式、N:详情呈现方式、N:列表到详情切换、N:属性数值联动

- `none` **无详情**：格子本身就是全部信息（参考：GameUI#556146）
- `inline` **行内展开**：手风琴：在条目下面展开（参考：GameUI#1663794）
- `persistent` **常驻一侧**：另一栏一直显示选中项（书的右页也算）（参考：GameUI#604661、GameUI#575939、GameUI#1463177）
- `transient` **临时出现**：悬停提示、点开弹窗或底部浮层（随输入方式）（参考：GameUI#625097、GameUI#535007、GameUI#603721）

#### `lay.preview` 即时预览

设计参数 · 范围：某一屏 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：改设置 / 换装时显示效果预览。Godot：SubViewport 缩略预览

v2 新增（R1），从 v1 lay.detail = livePreview 拆出。参考：GameUI#594278、GameUI#564162。

吸收的观察轴 / 旧维度：N:预览反馈

#### `lay.grouping` 分组方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：panel） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M3a

实现：画布：同组内容用什么聚在一起。Godot：PanelContainer（面板 / 卡片）、HSeparator（分隔线）、theme_override 底色（色块）

与描边、填充独立：同一张"卡片"可以有线框或没有；分隔线也可以是装饰花纹线。

吸收的观察轴 / 旧维度：H2

- `panel` **面板**：大面板分区（参考：GameUI#943688、GameUI#604571）
- `card` **卡片**：每条一张卡（参考：GameUI#556097、GameUI#577637）
- `colorBlock` **色块 / 斑马纹**：靠底色分（参考：GameUI#575858、GameUI#563098）
- `divider` **分隔线**：只用细线（参考：GameUI#572305、Elden Ring）
- `whitespace` **留白**：不画任何容器（参考：GameUI#558742、Monument Valley）
- `tonalInset` **内嵌明度差**：米白纸卡嵌进深一档的米褐面板，靠明度差不靠描边（v1 名 inset）（参考：GameUI#534802#1、GameUI#646842）

#### `lay.layering` 主体与面板层叠

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：separate） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：立绘 / 主体与面板的前后关系。Godot：Control 的 z_index 与绘制顺序

吸收的观察轴 / 旧维度：N:立绘与面板层叠、N:框-立绘层叠、N:立绘与UI框层叠、N:立绘出血方式

- `separate` **互不遮挡**：主体与面板各占一块，互不覆盖（参考：GameUI#604664）
- `breakout` **主体出框压面板**：角色破框而出，张力强（参考：GameUI#564219、GameUI#604606、DJMAX s960170_4）
- `behind` **面板压主体**：对话框盖住立绘下半（参考：GameUI#594004）
- `backdrop` **主体作整屏背景**：面板浮在人物前（唯一的"主体垫底"写法）（参考：GameUI#559126、GameUI#1748417）

#### `lay.overflow` 内容溢出方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：单屏 · 分层：tier 3 · 页签：③内容与版式 · 展示：状态陈列板 · 里程碑：M9a

实现：画布：超出一屏时怎么办。Godot：ScrollContainer（horizontal / vertical_scroll_mode）；分页脚本

分页 + 触屏时由 D-input 推出"滑动翻页"（v1 的 ix.mode = swipe 删掉）。

吸收的观察轴 / 旧维度：N:地图滚动方式、N:长文滚动提示、N:内容长度

- `single` **单屏**：内容控制在一屏内，不滚动（参考：GameUI#594209）
- `scrollV` **纵向滚动**：纵向滚动，长文与长列表（参考：GameUI#943688）
- `scrollH` **横向滚动**：通行证轨道（参考：GameUI#594312）
- `paged` **分页**：左右切换角色、卡池也算（参考：GameUI#1663794、GameUI#1463189、GameUI#943741）
- `longScroll` **长卷**：关卡路径一路往上（参考：GameUI#596124）
- `pan` **可拖动大画布**：地图、技能树、关卡图：拖动 + 缩放（v1 版式原型"地图为主"的交互部分）（参考：GameUI#594027、Grim Dawn s219990_2、Civ VI）

#### `lay.pageIndicator` 分页指示

设计参数 · 范围：某一屏 · 类型：单选 · 默认：左右箭头 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

生效条件：lay.overflow = paged

实现：画布：分页时怎么告诉玩家"还有别的页"。Godot：TextureButton 箭头 / 圆点 HBox

v2 新增（R1），吸收 v1 lay.nav 的 pager / dots。

- `arrows` **左右箭头**：两侧左右箭头（参考：GameUI#1463189、GameUI#943741）
- `dots` **圆点**：底部一排小圆点表示第几页（参考：GameUI#195964）
- `numbers` **页码**："2 / 5"页码
- `none` **不提示**：不提示，靠滑动或按键

#### `lay.pinned` 固定 / 置顶项

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M9a

实现：画布：列表里有一项永远可见。Godot：ScrollContainer 外的独立行

v2：也承担 v1 el.rank.form = selfBar 与 hier.emphasis = position 的"推荐置顶"。

吸收的观察轴 / 旧维度：N:自身排名位置、N:最近登录入口、N:位置（推荐置顶）

- `none` **无**：没有固定项，所有条目一起滚动
- `pinTop` **顶部置顶行**："上次登录""推荐"（参考：GameUI#485301、GameUI#483142）
- `pinBottom` **底部固定行**：自己的排名（参考：GameUI#594311、GameUI#556648）
- `pinnedTab` **专属页签**："我的服务器"（参考：GameUI#483142）

#### `lay.safeMargin` 安全边距

设计参数 · 范围：全局 · 类型：连续 0–12 %（步长 0.5） · 默认：跟随（兜底：2） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M10 · 不参与随机

实现：画布：所有锚点离屏幕边的距离；工具侧检查刘海与电视安全区。Godot：MarginContainer 的 theme_override_constants/margin_*；DisplayServer.get_display_safe_area()

默认由设备派生：电视 5%，手机按刘海，PC 约 2%。

吸收的观察轴 / 旧维度：N:画幅与黑边

#### `lay.grid` 对齐体系

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：free） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M3a

实现：画布：控件位置与尺寸吸附到什么网格。Godot：自写对齐工具；像素网格配合 snap_2d_transforms_to_pixel

v2（R1）：像素网格由 vis.pixelScale ≠ off 推出、斜向网格由 vis.skew ≠ 0 推出，都不再是取值。

吸收的观察轴 / 旧维度：N:像素网格对齐、N:像素栅格一致性（疑似）

- `free` **自由**：不吸附网格，按设计稿自由摆放
- `grid8` **8 点网格**：现代手游与 App 惯例（参考：GameUI#1663800）
- `columns12` **12 栏**：瑞士式排版（参考：Control、Mini Metro）

### 2.4 层级与强调（`hier.*`）

**一眼先看哪里？** 强调配方、正文内强调、主次按钮、非焦点压暗。与"用什么颜色、什么形状"分开：同样的强调手段可以出现在任何皮肤里。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `hier.emphasis` | 强调配方 | 设计参数 / 某一屏 | 多选 | 跟随（兜底：空） | 2 | — | 画布 | builtin |
| `hier.inline` | 正文内强调 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：none） | 3 | — | 画布 | builtin |
| `hier.cta` | 主次差距靠什么 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：color） | 2 | — | 画布 | builtin |
| `hier.dimInactive` | 非焦点压暗 | 设计参数 / 某一屏 | 连续 | 跟随（兜底：0） | 3 | — | 画布 | builtin |

#### `hier.emphasis` 强调配方

设计参数 · 范围：某一屏 · 类型：多选 · 默认：跟随（兜底：空） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M8a

多选合并：替换

实现：画布：对 elx.priority = primary 的元素施加哪些强调（派生 D-emphasis 把它换算成具体的 elx.scale、颜色角色、发光层）；工具侧眯眼检查验证。Godot：主元素用独立 Theme type variation（更大字号 / 强调色 / 发光）

白话：最重要的那一两样东西靠什么跳出来：更大、换颜色、周围压暗、发光、换字体、空出来。 看哪里：眯眼看时最显眼的三处是不是玩家最该看的。

v2（R1）：改为"作用在主元素上的强调配方"，输出到别的参数，不再与它们并列。删"位置"（= lay.pinned / 锚点）、"边框"（= ix.focus / st.selected / st.rarityCue）；"动效光效"改为 glow（输出 ast.fx@主元素）；约束：含 color 时 col.strategy ≠ mono（单色界面只能用明暗）。

吸收的观察轴 / 旧维度：H1、N:第7天强化、N:里程碑大奖强调、N:最佳/MVP高亮

- `size` **尺寸**：主元素放大（elx.scale ≥ 1.4）：巨幅标题、终点大奖（参考：GameUI#1762374、GameUI#594312）
- `color` **颜色**：主元素用强调色、高饱和（参考：GameUI#594209、GameUI#646842）
- `value` **明暗对比**：其余压暗（hier.dimInactive ≥ 0.3）、暗幕聚光（参考：GameUI#584773）
- `glow` **发光**：主元素加发光层（参考：GameUI#572348、GameUI#556611）
- `typeface` **字体反差**：主元素标题换展示字体（参考：GameUI#943704）
- `isolation` **留白孤立**：周围空出来（参考：Monument Valley、GameUI#603729）

#### `hier.inline` 正文内强调

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

实现：画布：富文本里关键词怎么突出。Godot：RichTextLabel 的 BBCode（[color] [b]）

吸收的观察轴 / 旧维度：N:关键信息强调、N:失败变强引导

- `none` **不强调**：正文不做局部强调（参考：GameUI#558742）
- `red` **红字**：国服公告常见（参考：GameUI#625056）
- `bold` **加粗**：关键词加粗（参考：GameUI#539868）
- `star` **★ 符号**：用 ★ 等符号标出重点条目（参考：GameUI#556590）
- `chip` **彩色标签**：[活动][更新]（参考：GameUI#572305）
- `keyword` **关键词着色**：地名红、人名蓝（参考：Zelda: BotW（对话））

#### `hier.cta` 主次差距靠什么

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：color） · 分层：tier 2 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M3a

实现：画布：主按钮和次按钮靠什么拉开。Godot：主次两个 Theme type variation（Button 与 ButtonSecondary）

白话：主按钮和次按钮靠什么拉开差距：一样重、颜色、大小，还是实心对空心。 看哪里："确认"和"取消"两个按钮。

v2（R1）：只回答"差距靠什么"。删"语义色"（各按钮角色的色相由 col.semantic 决定）与"只有一个按钮"（那是按钮数量，见 ix.mode = singleCTA）。

吸收的观察轴 / 旧维度：N:按钮配置、N:主按钮区、N:CTA位置与数量、N:主次按钮配色

- `equal` **平级**：两个按钮同样分量（参考：GameUI#1304879）
- `color` **颜色 / 饱和度**：高饱和主按钮压灰次按钮（参考：GameUI#646842、GameUI#559177）
- `size` **尺寸**：主按钮更大（参考：GameUI#559139）
- `fillOutline` **实心 vs 描边**：主按钮实心，次按钮只有描边（参考：Zelda: BotW）

#### `hier.dimInactive` 非焦点压暗

设计参数 · 范围：某一屏 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：0） · 分层：tier 3 · 页签：③内容与版式 · 展示：静帧 · 里程碑：M5a

随机区间：0–0.5

实现：画布：未选中项、非说话者、背景元素降亮度与饱和。Godot：CanvasItem.modulate / self_modulate

A16：3 人同屏时非说话者压暗约 30%（经验值）。参考 GameUI#604578。

吸收的观察轴 / 旧维度：N:说话人（非说话者压暗）

### 2.5 视觉语言：形、线、面、饰（`vis.*`）

**面板和按钮是什么形状、什么边、什么底、有多少装饰？** 皮肤里能单独覆盖的形与面。全局参数，可按组件（<参数>@button 等）或按元素（<参数>@el.vitals 等）覆盖，对应 Godot Theme 的 type variation。"程序画 / 用素材"只在资产槽位一侧判定（ast.core / ast.frame）：外框是程序线框时，这里的转角形状才生效；外框是程序线框或"只有四角件"时，描边才生效（四角之间的边由程序线画）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `vis.corner` | 转角 | 设计参数 / 全局 | 单选 | 跟随（兜底：sharp） | 1 ★ | ast.frame = procedural | 画布 | builtin |
| `vis.cornerSize` | 圆角 / 切角大小 | 设计参数 / 全局 | 连续 | 跟随（兜底：12） | 2 | ast.frame = procedural 且 vis.corner ∈ {round, chamfer, step} | 画布 | builtin |
| `vis.edge` | 边缘处理 | 设计参数 / 全局 | 单选 | 干净 | 2 | — | 画布（遮罩）/ 素材 | builtin / shader |
| `vis.silhouette` | 小组件轮廓 | 设计参数 / 全局 | 单选 | 跟随转角 | 2 | — | 画布 | builtin |
| `vis.skew` | 倾斜角 | 设计参数 / 全局 | 连续 | 跟随（兜底：0） | 2 | — | 画布 | builtin |
| `vis.jitter` | 手绘抖动 | 设计参数 / 全局 | 连续 | 跟随（兜底：0） | 3 | — | 画布 | shader |
| `vis.opacity` | 底不透明度 | 设计参数 / 全局 | 连续 | 跟随（兜底：1） | 2 | — | 画布 | builtin |
| `vis.fill` | 程序填充 | 设计参数 / 全局 | 单选 | 跟随（兜底：solid） | 2 | ast.core = procedural 且 vis.opacity > 0 | 画布 | builtin |
| `vis.pattern` | 图案叠层 | 设计参数 / 全局 | 单选 | 无 | 2 | — | 画布 | builtin |
| `vis.patternOpacity` | 图案强度 | 设计参数 / 全局 | 连续 | 0.3 | 3 | vis.pattern ≠ none | 画布 | builtin |
| `vis.blur` | 背景模糊（毛玻璃） | 设计参数 / 全局 | 连续 | 跟随（兜底：0） | 2 | vis.opacity > 0 且 vis.opacity < 1 | 画布 | shader |
| `vis.stroke` | 描边线型 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 1 ★ | ast.frame ∈ {procedural, cornersOnly} | 画布 | builtin / script / shader |
| `vis.strokeWidth` | 描边粗细 | 设计参数 / 全局 | 连续 | 跟随（兜底：1） | 1 | ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none | 画布 | builtin |
| `vis.strokeColor` | 描边色 | 设计参数 / 全局 | 单选 | 跟随（兜底：ink） | 3 | ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none | 画布 | builtin |
| `vis.strokeSides` | 描边画哪几边 | 设计参数 / 全局 | 单选 | 四边 | 3 | ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none | 画布 | builtin |
| `vis.strokeGlow` | 描边发光 | 设计参数 / 全局 | 连续 | 0 | 3 | ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none | 画布 | shader |
| `vis.depth` | 立体与阴影 | 设计参数 / 全局 | 单选 | 跟随（兜底：flat） | 1 ★ | — | 画布 | builtin / shader / hard |
| `vis.gloss` | 光泽高光 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |
| `vis.ornament` | 装饰预算 | 设计参数 / 全局 | 整数档位 | 跟随（兜底：1） | 1 ★ | — | 画布 / 素材 | builtin |
| `vis.motif` | 装饰母题 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 2 | — | 素材 / 画布 | builtin |
| `vis.iconStyle` | 图标风格 | 设计参数 / 全局 | 单选 | 跟随（兜底：line） | 2 | — | 素材 | builtin |
| `vis.pixelScale` | UI 像素化 | 设计参数 / 全局 | 单选 | 跟随（兜底：off） | 2 | — | 画布 | builtin |
| `vis.mapStyle` | 地图画风 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：flatVector） | 3 | （cnt.dataShape = spatial 或 cnt.elements 含 el.minimap） | 场景内 / 素材 | builtin |
| `vis.mapUnexplored` | 地图未探索区 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 云雾遮挡 | 3 | （cnt.dataShape = spatial 或 cnt.elements 含 el.minimap） | 场景内 / 画布 | builtin |

#### `vis.corner` 转角

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：sharp） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

生效条件：ast.frame = procedural · 可覆盖：@组件 / @el.<元素>

实现：画布：BoxStyle 的 radius / chamfer / 像素台阶。Godot：StyleBoxFlat.corner_radius_* 与 corner_detail（切角用 corner_detail = 1 近似）

白话：面板和按钮的角：直角、圆角、切角，还是像素台阶。 看哪里：按钮和面板的四个角。

v2（R1）：v1 的 vis.shape 拆成 转角 + 圆角大小 + 边缘 + 小组件轮廓。直角 / 圆角 / 胶囊是同一个圆角半径的刻度（胶囊 = 圆角 50%）；"手绘有机"= vis.jitter > 0；"像素阶梯"在 vis.pixelScale ≠ off 时自动取 step；圆、菱、六边、盾这些只对小组件有意义，移到 vis.silhouette。

吸收的观察轴 / 旧维度：V1、N:几何母题、N:提示容器形状

- `sharp` **直角**：冷静、工具感（参考：Elden Ring、GameUI#1178739）
- `round` **圆角**：友好、现代；圆角大小见 vis.cornerSize（50% = 胶囊）（参考：GameUI#1511375、GameUI#1776454、Animal Crossing（名牌））
- `chamfer` **切角**：科幻、军事（参考：XCOM 2、GameUI#559088）
- `step` **像素台阶**：转角是像素台阶（像素化开启时自动取）（参考：Stardew Valley s413150_4、Moonlighter s606150_0）

#### `vis.cornerSize` 圆角 / 切角大小

设计参数 · 范围：全局 · 类型：连续 0–50 % 短边（步长 1） · 默认：跟随（兜底：12） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

生效条件：ast.frame = procedural 且 vis.corner ∈ {round, chamfer, step} · 可覆盖：@组件 / @el.<元素> · 随机区间：0–30

实现：画布：BoxStyle.radius = 百分比 × 短边。Godot：StyleBoxFlat.corner_radius_*（按控件高度换算）

白话：角有多圆（或切掉多少）。拉到最大就是两头全圆的胶囊。 看哪里：按钮两端是方、微圆还是全圆。 两端：0：直角 ↔ 50：胶囊（两端全圆）。

v2：取代 v1 的 vis.radius（px），改用短边百分比，这样"胶囊"就是 50%，切角大小也有了参数（R1）。

#### `vis.edge` 边缘处理

设计参数 · 范围：全局 · 类型：单选 · 默认：干净 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

可覆盖：@组件 / @el.<元素>

实现：画布（遮罩）/ 素材：面板外轮廓是干净的线，还是撕边、锯齿、笔触、异形。Godot：撕边 / 锯齿 / 笔触：CanvasItem 着色器遮罩或烘焙九宫格；异形：NinePatchRect 素材

白话：面板外轮廓是干净的线，还是撕开的纸边、锯齿、毛笔扫出来的边，或者整个外形就是装饰（拱门、盾）。 看哪里：面板最外一圈的形状。

v2 新增（R1 + R2）：吸收 v1 vis.shape 的 torn / ornate、vis.stroke 的 brush、ast.frame 的 torn，加 R2 要的锯齿（Hi-Fi Rush）。与外框素材叠加：撕边的纸框 = 边缘 torn + 外框材质 paper。只撕标题条：vis.edge@titleBar = torn（Armello）。

吸收的观察轴 / 旧维度：N:提示容器形状（异形部分）

- `clean` **干净**：干净的轮廓线（或没有线）
- `torn` **撕边 / 破边**：纸撕开或墨渍边缘（参考：Don't Starve、GameUI#134914、Armello） 〔Godot：着色器〕
- `jagged` **锯齿**：漫画式锯齿边（新，R2）（参考：Hi-Fi Rush（血条、对话框）） 〔Godot：着色器〕
- `brush` **笔触**：墨刷边、毛笔扫出的边（参考：Red Dead Redemption 2、Black Myth: Wukong） 〔Godot：着色器〕
- `ornate` **异形轮廓**：外轮廓本身是装饰（拱门、盾、卷轴头），需素材；与"矩形上贴雕花边框"（ast.frame = carvedNinePatch）不同（参考：Hades、GameUI#604568、GameUI#580589） 〔需素材〕

#### `vis.silhouette` 小组件轮廓

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随转角 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

可覆盖：@组件 / @el.<元素>

实现：画布：格子、图标底座、头像、徽章、小地图、按钮、选项、节点的外轮廓。Godot：Panel + StyleBox（方 / 圆）；其余用遮罩着色器或 TextureRect

白话：小东西（格子、图标底座、头像、徽章、小地图）的外形：方、圆、菱、六边、盾、缎带……通常按组件分别设。 看哪里：物品格和头像的外形。

v2 新增（R1）：唯一的小组件轮廓词表，取代 v1 的 vis.iconFrame、cmp.slot / cmp.avatar / cmp.badge / el.minimap.form / cmp.tab 里各自重列的圆、方、菱、六边、盾。全局值通常是 box，通过 vis.silhouette@icon、@avatar、@slot、@badge、@minimapFrame、@button、@el.choices 覆盖。加 R2 要的缎带 / 燕尾（StS 按钮）、盾尾（尖底）。

吸收的观察轴 / 旧维度：N:技能图标容器、N:图标容器、N:头像容器形状、N:头像槽轮廓、N:头像形状、N:小地图形状与位置（形状部分）

- `box` **跟随转角**：按 vis.corner 画的矩形
- `none` **不画底座**：图标直接压在画面上（参考：AC Shadows s3159330_2）
- `circle` **圆**：图标放在圆形底座里（参考：Frostpunk s323190_2、Gears Tactics s1184050_3、GameUI#625064）
- `diamond` **菱形**：图标放在菱形框里（参考：Hades（恩赐图标）、AC Shadows、Albion Online s761890_0）
- `hexagon` **六边形**：图标放在六边形框里（参考：Black Myth: Wukong、Overwatch、GameUI#556687）
- `shield` **盾形**：图标放在盾形框里（参考：GameUI#594260）
- `shieldTail` **盾尾 / 尖底**：下端收成尖角的挂牌（参考：ui-asset-materials 27.0、27.1）
- `ribbon` **缎带 / 燕尾**：两端剪成燕尾的条（参考：Slay the Spire（按钮）、ui-asset-materials 27.3）
- `trapezoid` **梯形**：梯形凹槽框（参考：Super Bomberman R s702700_3）

#### `vis.skew` 倾斜角

设计参数 · 范围：全局 · 类型：连续 -20–20 °（步长 1） · 默认：跟随（兜底：0） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

可覆盖：@组件 / @el.<元素> · 随机区间：-12–0

实现：画布：BoxStyle.skewX（已支持）。Godot：StyleBoxFlat.skew（Godot 4.1+）

白话：面板整体斜着画。斜一点就有速度感、竞技感。 看哪里：面板和标题是不是平行四边形。 两端：0：方正 ↔ −12° 左右：Persona、Hi-Fi Rush 的冲劲。

倾斜不是一种形状：任何转角都能被倾斜。≠ 0 时派生：对齐网格随之倾斜、标题文字随之旋转（v2 删掉了 lay.grid = diagonal 与 typ.direction = diagonal）。参考：Overwatch、Hi-Fi Rush、NFS Heat、Persona 5、GameUI#1748419。

吸收的观察轴 / 旧维度：V1 平行四边形斜切

#### `vis.jitter` 手绘抖动

设计参数 · 范围：全局 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：0） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

可覆盖：@组件 / @el.<元素> · 随机区间：0–0.4

实现：画布：边框路径抖动 + 面板轻微旋转（handdrawn 皮肤已用旋转近似）。Godot：CanvasItem 着色器做顶点抖动，或预烘九宫格

也承担 v1 vis.shape = organic（手绘有机轮廓）。与动效的线条沸腾（lines.boil）可联动（派生 D-boil）。参考：Don't Starve、GameUI#1079008。

#### `vis.opacity` 底不透明度

设计参数 · 范围：全局 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：1） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

可覆盖：@组件 / @el.<元素> · 随机区间：0.5–1

实现：画布：面板底色 alpha。Godot：StyleBoxFlat.bg_color.a

白话：面板底有多实。0 就是没有底，字直接压在游戏画面上。 看哪里：面板后面的游戏画面透出来多少，字还读不读得清。 两端：0：无底（字直接压在画面上） ↔ 1：完全不透明。

v2（R1）：唯一决定"有没有底"的参数，= 0 就是无底（删掉 v1 的 vis.fill = none、col.lightness = clear、lay.hudOrg = floating）。无底时 D-lightness 强制文字可读辅助 ≠ none。与 a11y.reduceTransparency 联动。参考：Zelda BotW 深色半透明、GameUI#580657；无底：GRIS、AC Shadows s3159330_2、Binding of Isaac s401920_1。

吸收的观察轴 / 旧维度：N:HUD与关卡框一体（无底部分）

#### `vis.fill` 程序填充

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：solid） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

生效条件：ast.core = procedural 且 vis.opacity > 0 · 可覆盖：@组件 / @el.<元素>

实现：画布：Paint（solid / linear / radial）；渐变的颜色与角度见 col.gradient。Godot：StyleBoxFlat.bg_color；渐变需烘成 GradientTexture2D 放进 StyleBoxTexture

白话：程序画的面板底是一种颜色还是渐变。 看哪里：面板中间的底色。

v2（R1 + R2）：只在内芯为程序填充、且有底时生效。删"无底"（= vis.opacity 0）、"彩绘插画底"（= ast.core = illustration）；"图案底"改成可叠在任何内芯上的 vis.pattern。毛玻璃 = vis.opacity < 1 + vis.blur > 0。

吸收的观察轴 / 旧维度：V2（除贴图材质，贴图归 ast.core）

- `solid` **纯色**：单一颜色填满面板（参考：GameUI#1762374、Mini Metro）
- `gradient` **渐变**：JRPG 蓝窗口、手游渐变卡（参考：GameUI#1776456、Final Fantasy）

#### `vis.pattern` 图案叠层

设计参数 · 范围：全局 · 类型：单选 · 默认：无 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3b

可覆盖：@组件 / @el.<元素>

实现：画布：叠在内芯之上的平铺图案（可叠在纸、木、纯色上）。Godot：StyleBoxTexture 平铺第二层，或 TextureRect（stretch_mode = TILE）

白话：面板上再叠一层图案：斜纹、网点、方格、叶子、云纹、重复文字…… 看哪里：面板底上淡淡的花样。

v2 新增（R2）。与 ast.core 独立：纸面上的淡云纹 = 内芯 paper + 图案 cloudTile。v1 ast.fx 的 halftone 并入这里。

吸收的观察轴 / 旧维度：N:装饰母题（底纹部分）

- `none` **无**：没有图案叠层
- `diagStripes` **斜线条纹**：斜向细条纹（XCOM 技能条、警戒区）（参考：XCOM 2（技能条、士兵页））
- `hazard` **黄黑警示条**：黄黑斜纹警示带（参考：GameUI#559108、GameUI#462112）
- `hatching` **排线阴影**：版画式排线阴影（参考：XCOM 2）
- `dots` **圆点**：波点（参考：Animal Crossing）
- `halftone` **网点**：漫画网点（参考：Hi-Fi Rush、comic 皮肤）
- `checker` **棋盘格**：棋盘格
- `grid` **方格纸**：方格纸 / 横格纸（参考：Return of the Obra Dinn、Ultimate Chicken Horse s386940_4）
- `quilt` **绗缝纹**：绗缝格（布面）（参考：Armello（卡牌页）） 〔需素材〕
- `leafTile` **叶子平铺**：叶子平铺（Nookphone）（参考：Animal Crossing（Nookphone）） 〔需素材〕
- `cloudTile` **云纹平铺**：淡云纹平铺（国风纸面）（参考：ui-asset-materials 1.0、17.1） 〔需素材〕
- `geometricTile` **几何平铺**：几何图形平铺（参考：GameUI#186664）
- `repeatText` **重复文字**：斜向重复的字或品牌名（参考：ui-asset-materials 26.5、GameUI#559108）
- `totem` **图腾纹**：图腾纹带（参考：kw.primitive 参考） 〔需素材〕

#### `vis.patternOpacity` 图案强度

设计参数 · 范围：全局 · 类型：连续 0–1（步长 0.05） · 默认：0.3 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3b

生效条件：vis.pattern ≠ none · 可覆盖：@组件 / @el.<元素> · 随机区间：0.1–0.5

实现：画布：图案层 alpha。Godot：TextureRect.modulate.a

#### `vis.blur` 背景模糊（毛玻璃）

设计参数 · 范围：全局 · 类型：连续 0–24 px（步长 1） · 默认：跟随（兜底：0） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

生效条件：vis.opacity > 0 且 vis.opacity < 1 · 可覆盖：@组件 / @el.<元素> · 随机区间：0–12

实现：画布：BoxStyle.backdropBlur（已支持，合成时用遮罩换成模糊画面）。Godot：BackBufferCopy + 读 SCREEN_TEXTURE 的模糊着色器

白话：透过面板看到的背景被糊得多厉害（毛玻璃）。 看哪里：半透明面板后面的画面。 两端：0：清楚地透出背景 ↔ 24：只剩色块。

只在半透明时有意义。背景越花模糊要越重（NN/g）。参考 GameUI#594204、GameUI#1304865。

#### `vis.stroke` 描边线型

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

生效条件：ast.frame ∈ {procedural, cornersOnly} · 可覆盖：@组件 / @el.<元素>

实现：画布：Border（solid / double / dashed）。Godot：StyleBoxFlat.border_width_* / border_color；双线用两层 StyleBox

白话：面板有没有边线、是什么线。 看哪里：面板和按钮的外圈。

v2（R1）：只表示线型；粗细只由 vis.strokeWidth 给（发丝线 = 宽 1）。花纹线、笔触改到素材一侧（ast.frame 素材结构 / vis.edge = brush）；发光线 = 实线 + vis.strokeGlow；虚线不再兼表"空槽"（空槽见 st.emptySlot）。

吸收的观察轴 / 旧维度：V3

- `none` **无描边**：面板没有边线，靠底色或阴影分界（参考：GameUI#600471、GameUI#943736）
- `solid` **实线**：粗细见 vis.strokeWidth（1px 即发丝线）（参考：Control、Destiny 2、GameUI#646837、Hi-Fi Rush）
- `double` **双线**：JRPG（DQ）、装饰艺术、金边（参考：GameUI#534976、Hearthstone） 〔Godot：脚本〕
- `dashed` **虚线**：缝线、选中虚框（参考：GameUI#572412、GameUI#17245） 〔Godot：着色器〕

#### `vis.strokeWidth` 描边粗细

设计参数 · 范围：全局 · 类型：连续 0.5–8 px（步长 0.5） · 默认：跟随（兜底：1） · 分层：tier 1 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

生效条件：ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none · 可覆盖：@组件 / @el.<元素> · 随机区间：1–4

实现：画布：Border.width。Godot：StyleBoxFlat.border_width_*

白话：边线有多粗。1 是发丝细线，3 以上是漫画、新粗野那种粗黑边。 看哪里：面板外圈线的粗细。 两端：1：发丝细线（Control、Destiny 2） ↔ 4+：粗黑边（Hi-Fi Rush、新粗野）。

默认可由画面描边粗细派生（D-outline）。

#### `vis.strokeColor` 描边色

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：ink） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none · 可覆盖：@组件 / @el.<元素>

实现：画布：Border.color 引用色板角色。Godot：StyleBoxFlat.border_color

v2：删"随稀有度"（= st.rarityCue = border）；"半透明亮边"改名 highlightEdge，透明度交给颜色本身；加 accent2 与自定义（R2：浅绿外框 GameUI#556687，颜色见 col.border）。

- `ink` **墨色**：色板里的墨色 / 黑（参考：Hi-Fi Rush）
- `accent` **强调色**：边线用强调色，常见于科幻与瑞士式（参考：Swiss 皮肤、XCOM 2）
- `accent2` **第二强调色**：边线用第二强调色（参考：Cyberpunk 2077）
- `highlightEdge` **高光亮边**：玻璃的 1px 亮边（参考：GameUI#594204）
- `metal` **金属金 / 铜**：手游金框、Hades 青铜（参考：GameUI#535009、Hades）
- `darker` **同色加深**：比底色深一档（参考：GameUI#646842）
- `custom` **自定义**：颜色见 col.border（参考：GameUI#556687）

#### `vis.strokeSides` 描边画哪几边

设计参数 · 范围：全局 · 类型：单选 · 默认：四边 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

生效条件：ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none · 可覆盖：@组件 / @el.<元素>

实现：画布：BoxStyle 各边宽度（panel.sides 已支持）。Godot：StyleBoxFlat.border_width_left / top / right / bottom

v2 新增（R2）：v1 第 6.6 节说 panel.sides 已被 vis.stroke 吸收，实际没有取值，这里补上。只画四角 = 科技角括号（程序画）；素材角件见 ast.frame = cornersOnly。

- `all` **四边**：四条边都画
- `left` **只画左边**：瑞士式左竖条（参考：swiss 皮肤、Control）
- `right` **只画右边**：只画右边竖条
- `topBottom` **上下两条**：国风上下线（参考：GameUI#572343）
- `bottom` **只画底边**：下划线式
- `corners` **只画四角**：科技角括号、取景框（参考：XCOM 2、GameUI#143082、GameUI#126496）

#### `vis.strokeGlow` 描边发光

设计参数 · 范围：全局 · 类型：连续 0–1（步长 0.05） · 默认：0 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：ast.frame ∈ {procedural, cornersOnly} 且 vis.stroke ≠ none · 可覆盖：@组件 / @el.<元素> · 随机区间：0–0.6

实现：画布：描边叠一层同色模糊。Godot：CanvasItem 着色器或预烘纹理

v2 新增（R1）：取代 v1 的 vis.stroke = glowLine（霓虹 / 全息）。参考：Cyberpunk 2077、Lovers s252110_1。

#### `vis.depth` 立体与阴影

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：flat） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

可覆盖：@组件 / @el.<元素>

实现：画布：Shadow[]（外 / 内 / 硬 / 柔）。Godot：StyleBoxFlat.shadow_color / shadow_size / shadow_offset（只支持一层外阴影；内阴影、倒角、双向阴影需 StyleBoxTexture 或着色器）

白话：面板是平的、浮起来的、压进去的，还是有厚度。 看哪里：面板下面和四周的阴影。

v2（R1）：删"外发光"（面板外发光统一归 ast.fx = glow，描边发光见 vis.strokeGlow）；"内阴影"改名 innerShadow。

- `flat` **平面**：没有阴影，完全平面（参考：Mini Metro、GameUI#1663800）
- `softDrop` **柔投影**：Material 式（参考：GameUI#1511375）
- `hardDrop` **错位硬投影**：新粗野主义（参考：neobrutal 皮肤）
- `innerShadow` **内阴影 / 内凹**：羊皮纸暗角、凹槽（v1 名 inset）（参考：GameUI#567648） 〔Godot：着色器〕
- `bevel` **倒角浮雕**：拟物按钮、石金框（参考：World of Warcraft、Total War Warhammer II s594570_0） 〔Godot：着色器〕
- `soft3d` **软塑料双向阴影**：新拟态 / 糖果按钮（参考：GameUI#211369#3） 〔Godot：很难〕

#### `vis.gloss` 光泽高光

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

可覆盖：@组件 / @el.<元素>

实现：画布：顶部高光层 / 多段金属渐变。Godot：渐变烘图 + StyleBoxTexture，或 CanvasItem 着色器

白话：面板和按钮表面有没有高光：玻璃反光、镀铬、金属渐变、糖果塑料。 看哪里：按钮上半截的亮条。

- `none` **无**：没有高光层
- `topShine` **顶部玻璃高光**：Frutiger Aero、Wii（参考：Wii Sports、GameUI#211369#3）
- `chrome` **镀铬条带**：Y2K（参考：y2k 皮肤、Wipeout）
- `metalGrad` **金属渐变**：金框、金币（参考：GameUI#535009、GameUI#943717）
- `candy` **糖果塑料高光**：Q 版休闲按钮（参考：GameUI#562993、GameUI#215019）

#### `vis.ornament` 装饰预算

设计参数 · 范围：全局 · 类型：整数档位 0–3（步长 1） · 默认：跟随（兜底：1） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3b

随机区间：0–2

实现：画布 / 素材：装饰总量（角花、分隔饰条、端盖的数量与面积）。Godot：饰件 TextureRect 的显隐

白话：装饰有多少。0 是干干净净，3 是金框、角花、宝石全上。 看哪里：面板角上、标题两侧、分隔线上的花样。 两端：0：Mini Metro ↔ 3：Hades、WoW、GameUI#604568。

v2（R1）：作为"装饰预算"保留，并加约束：0 ⇒ 饰件为空、母题为 none、边缘不是异形、外框不是雕花；≥ 2 而饰件为空时，按母题派生一组默认饰件（D-ornament）。"长什么样"见 vis.motif，"由哪些件组成"见 ast.ornaments。

吸收的观察轴 / 旧维度：V7

- `0` **无**（参考：Mini Metro）
- `1` **少**（参考：Witcher 3）
- `2` **中**（参考：Zelda BotW）
- `3` **华丽**（参考：Hades、World of Warcraft、GameUI#604568）

#### `vis.motif` 装饰母题

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3b

实现：素材 / 画布：角花、分隔线、标题牌两侧的花样（几何线、括号、电路、星、符文可程序绘制）。Godot：NinePatchRect + TextureRect 角件；程序花饰用 Line2D / 自绘

白话：装饰画的是什么花样：几何线、角括号、卷草、祥云、樱花、铆钉、电路、星、骷髅、羽翼…… 看哪里：角花、分隔线、标题两侧。

吸收的观察轴 / 旧维度：N:装饰母题、N:标题装饰母题、N:环境饰件、N:年节装饰元素、N:心形母题、N:品牌几何母题、N:饰件母题

- `none` **无**：没有装饰母题
- `geometric` **几何线 / 同心圆**：同心圆、轨道、三角等几何线（参考：GRIS、Destiny 2、DJMAX（▲））
- `brackets` **角括号 / 准星角**：科幻、取景框（参考：Cyberpunk 2077、GameUI#126496）
- `floral` **花叶卷草**：巴洛克、美好年代（参考：Hollow Knight、Clair Obscur） 〔需素材〕
- `cloud` **祥云 / 回纹**：国风（参考：GameUI#572343、GameUI#27211） 〔需素材〕
- `sakura` **樱花 / 家纹**：和风（参考：GameUI#134511、GameUI#134392） 〔需素材〕
- `rivets` **齿轮 / 铆钉 / 铜饰**：蒸汽朋克、西部（参考：Frostpunk、Desperados III s610370_4） 〔需素材〕
- `circuit` **电路 / 六边形**：科幻（参考：GameUI#133677）
- `stars` **星芒 / 星座**：星芒、星座连线（参考：Grim Dawn s219990_2、GameUI#1707359）
- `hearts` **心形**：恋爱、结婚（参考：GameUI#135369、GameUI#474404） 〔需素材〕
- `skulls` **骷髅 / 哥特**：暗黑（参考：Hades） 〔需素材〕
- `wings` **羽翼 / 桂冠 / 皇冠**：升级、段位、胜利（参考：GameUI#572370、GameUI#549939、GameUI#564147） 〔需素材〕
- `flames` **火焰**：战斗提示（参考：GameUI#564136） 〔需素材〕
- `inkSplash` **水墨飞白**：水墨飞溅与飞白笔触（参考：Black Myth: Wukong、GameUI#132864#1） 〔需素材〕
- `runes` **符文 / 法阵**：符文、法阵纹样（参考：GameUI#208192）

#### `vis.iconStyle` 图标风格

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：line） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M11

实现：素材：图标集按风格切换（程序几何图标作为占位）。Godot：AtlasTexture 图集 + Theme icon

白话：图标怎么画：线性、扁平、双色、手绘、3D 渲染、写实、像素、剪影。 看哪里：物品与功能图标。

v2（R1）：删"不用图标（纯文字）"（那是按钮内容 cmp.button = text，不是风格）。与图标来源 ast.iconSet 有兼容约束：图标字体只能线性 / 扁平，实时渲染只能 3D 渲染 / 写实，程序几何只能扁平 / 线性 / 双色 / 剪影。

吸收的观察轴 / 旧维度：V6

- `line` **线性**：单色线条图标（参考：Monument Valley s1927720_0、Hidden Folks s435400_1）
- `flat` **扁平填充**：纯色填充的扁平图标（参考：Cities Skylines、GameUI#594209）
- `duotone` **双色**：两种颜色叠出的图标（参考：GameUI#1663800）
- `painted` **手绘彩绘**：手绘上色的小插画图标（参考：Hades、Dota 2 s570_0） 〔需素材〕
- `render3d` **3D 渲染**：宝箱、宝石、礼盒（参考：GameUI#1511375、GameUI#596110） 〔需素材〕
- `realistic` **写实**：军事、生存（参考：GameUI#575887、AC Shadows s3159330_3） 〔需素材〕
- `pixel` **像素**：像素点阵图标（参考：Binding of Isaac、Stardew Valley） 〔需素材〕
- `silhouette` **剪影**：实心剪影图标（参考：Gears s3010850_1）

#### `vis.pixelScale` UI 像素化

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：off） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：按设计分辨率绘制再整数倍最近邻放大。Godot：SubViewport 低分辨率 + TEXTURE_FILTER_NEAREST；snap_2d_transforms_to_pixel

白话：UI 要不要像素化、像素有多大。和世界同网格时 UI 像素与游戏像素一样大。 看哪里：字和边框的边缘是否是锯齿台阶。

v2（R1）：唯一的像素主参数。≠ off 时派生：转角 = step、对齐网格 = 像素网格、默认像素字（D-pixel）。v1 rel.followPost = pixel（UI 被后处理像素化）与"与世界同网格"画出来一样，已删。

吸收的观察轴 / 旧维度：N:像素栅格一致性（疑似）、N:像素网格对齐

- `off` **清晰矢量**：高清 UI，即使世界是像素（参考：The Final Station s435530_1）
- `x2` **2 倍像素**：按半分辨率绘制再 2 倍放大
- `x3` **3 倍像素**：按三分之一分辨率绘制再 3 倍放大
- `x4` **4 倍像素**：按四分之一分辨率绘制再 4 倍放大
- `world` **与世界同网格**：UI 像素与世界像素一样大（参考：Flinthook s401710_0、Moonlighter s606150_0、Stardew Valley）

#### `vis.mapStyle` 地图画风

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：flatVector） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M6

生效条件：（cnt.dataShape = spatial 或 cnt.elements 含 el.minimap）

实现：场景内 / 素材：地图本体的渲染风格（烘焙小地图或插画底图）；大地图与小地图读同一个参数。Godot：SubViewport 正交相机烘焙；或 TextureRect 插画 + 标记层

v2（R1）：v1 的 cnt.mapRender 搬到视觉组改名；v1 el.minimap.form = roomGrid 并入 pixelRooms。默认由 D-paper 从画面媒介派生。

吸收的观察轴 / 旧维度：N:地图视角/投影、N:地图画风、N:地图表现形式、N:地图类型

- `painted` **手绘水彩**：绘本地图（参考：GameUI#604642、GameUI#604598） 〔需素材〕
- `parchment` **羊皮纸古海图**：海怪插画、复古制图图例（参考：Civ VI、Red Dead Redemption 2、GameUI#600492） 〔需素材〕
- `satellite` **卫星写实**：暗调实景俯视 + POI 图标（参考：GameUI#594249） 〔需场景〕
- `tactical` **战术线框 / 全息**：线框地形、扫描（参考：GameUI#1009409、XCOM 2） 〔需场景〕
- `flatVector` **扁平矢量**：色块分区（参考：GameUI#585185、Cities Skylines）
- `schematic` **示意图**：地铁线路图式抽象（参考：Mini Metro s287980_1）
- `chalk` **粉笔手绘线稿**：线稿区块 + 衬线地名（参考：Hollow Knight s367520_4）
- `diorama` **漂浮微缩岛**：3D 微缩景观（参考：GameUI#594049、Bad North） 〔需场景〕
- `pixelRooms` **像素房间格**：房间拼格（参考：Binding of Isaac s401920_1、Minit s609490_5）

#### `vis.mapUnexplored` 地图未探索区

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：云雾遮挡 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M6

生效条件：（cnt.dataShape = spatial 或 cnt.elements 含 el.minimap）

实现：场景内 / 画布：没去过的地方怎么画。Godot：遮罩纹理 + 着色器

v2 新增（R1）：v1 的 st.locked = fog（云雾遮挡）只对地图成立，移到地图层。

- `fog` **云雾遮挡**：没去过的地方盖云雾（参考：GameUI#646922）
- `dark` **压暗**：没去过的地方压暗（参考：Civ VI）
- `blank` **留白（纸面空白）**：没去过的地方留白（纸面空着）（参考：Hollow Knight（买图前））
- `outlineOnly` **只有轮廓**：只画轮廓，不画细节
- `reveal` **全部可见**：一开始就全部可见（参考：Mini Metro）

### 2.6 色彩（`col.*`）

**UI 用哪些颜色、颜色从哪来、颜色表达什么？** 取色来源、明度、色板角色（底、字、强调、第二强调、焦点、渐变、边框）、色彩策略、语义编码。色彩策略只约束界面骨架色（底、字、强调），语义编码色（阵营、稀有度、状态）不受它限制。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `col.source` | UI 取色来源 | 设计参数 / 全局 | 单选 | 跟随（兜底：scene） | 3 | 由 rel.harmony 推出 | 画布 | builtin |
| `col.lightness` | 面板明度 | 设计参数 / 全局 | 单选 | 跟随（兜底：light） | 1 ★ | vis.opacity > 0 | 画布 | builtin |
| `col.surface` | 面板底色 | 设计参数 / 全局 | 颜色 | 跟随 | 2 | vis.opacity > 0 | 画布 | builtin |
| `col.surface2` | 次级底色 | 设计参数 / 全局 | 颜色 | 跟随 | 3 | vis.opacity > 0 | 画布 | builtin |
| `col.text` | 文字色 | 设计参数 / 全局 | 颜色 | 跟随 | 3 | — | 画布 | builtin |
| `col.accent` | 强调色 | 设计参数 / 全局 | 颜色 | @accent | 1 ★ | — | 画布 | builtin |
| `col.accent2` | 第二强调色 | 设计参数 / 全局 | 颜色 | 跟随 | 2 | — | 画布 | builtin |
| `col.focus` | 焦点色 | 设计参数 / 全局 | 颜色 | 跟随 | 3 | — | 画布 | builtin |
| `col.border` | 自定义描边色 | 设计参数 / 全局 | 颜色 | 跟随 | 3 | vis.strokeColor = custom | 画布 | builtin |
| `col.gradient` | 渐变 | 设计参数 / 全局 | 渐变 | 跟随 | 3 | vis.fill = gradient | 画布 | builtin |
| `col.strategy` | 骨架色彩策略 | 设计参数 / 全局 | 单选 | 跟随（兜底：neutralAccent） | 2 | — | 画布 | builtin |
| `col.coding` | 语义颜色编码 | 设计参数 / 全局，可逐屏覆盖 | 多选 | status | 2 | — | 画布 | builtin |
| `col.semantic` | 按钮角色配色 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：accentOnly） | 3 | — | 画布 | builtin |
| `col.rarityScale` | 稀有度色阶 | 设计参数 / 全局 | 单选 | 跟随（兜底：diablo） | 3 | col.coding 含 rarity | 画布 | builtin |
| `col.teams` | 阵营色对 | 设计参数 / 全局 | 单选 | 跟随（兜底：blueRed） | 3 | col.coding 含 team | 画布 + 场景内 | builtin |
| `col.saturation` | UI 饱和度 | 设计参数 / 全局 | 连续 | 跟随（兜底：1） | 2 | — | 画布 | builtin |
| `col.dynamic` | 主题色变化 | 设计参数 / 全局 | 单选 | 固定 | 3 | — | 动画预览 | builtin |

#### `col.source` UI 取色来源

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：scene） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

由 `rel.harmony` 推出（可手动覆盖）

实现：画布：@accent 等色板引用解析到哪套颜色（已支持场景色板 / 皮肤默认两种）。Godot：导出时把解析后的颜色写进 Theme

v2（R1）：默认由 rel.harmony 派生（同一媒介 / 统一调色 → 场景，中性 → 皮肤，刻意对比 → 独立控件色板），可手动覆盖。旧开关 hud.useSceneColors 迁移：true → scene，false → skin（R3）。加 illustration（v1 col.strategy = fullColor 的"颜色来自插画本身"）。

吸收的观察轴 / 旧维度：hud.useSceneColors、N:主色来源（取自主角/IP）

- `scene` **取自场景色板**：检查 UI 与画面是否协调（现有开关的"开"）（参考：GameUI 评论："角色、场景、UI 高度统一"）
- `uiPalette` **独立控件色板**：设计师常把"场景色"和"控件色"分两组（参考：Valorborn 三套配色（GameUI 作品））
- `skin` **皮肤固定色**：皮肤自带颜色（现有开关的"关"）（参考：jrpg 皮肤）
- `illustration` **来自插画**：颜色由主视觉插画决定，UI 只取插画里的色（参考：GameUI#1058283、GameUI#614493）

#### `col.lightness` 面板明度

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：light） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

生效条件：vis.opacity > 0 · 可覆盖：@组件 / @el.<元素>

实现：画布：面板底与文字的明暗关系（浅底深字 / 深底浅字）。Godot：Theme 的 panel 与 font_color 两组

白话：面板是浅底深字、深底浅字，还是中间。 看哪里：面板底色和上面的字。

v2（R1）：只回答"底的明度"，只在有底时生效；删"无底随场景"（= vis.opacity 0）。中间调与色相无关。默认由场景亮度派生（D-lightness）；具体底色可用 col.surface 写死。

吸收的观察轴 / 旧维度：N:界面明暗基调、N:UI明暗基调、N:UI明度基调、N:明暗主题、N:整体明度、N:明暗基调

- `light` **浅色面板**：奶油、米白、白卡（参考：GameUI#646842、GameUI#577655）
- `mid` **中明度**：与色相无关的中间明度（参考：GameUI#580677、GameUI#564197）
- `dark` **深色面板**：暗色半透明、深木、暗金（参考：Elden Ring、GameUI#603739）

#### `col.surface` 面板底色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：vis.opacity > 0 · 可覆盖：@组件 / @el.<元素>

实现：画布：面板底色（auto = 按 col.lightness 与取色来源推出）。Godot：Theme 颜色常量 panel_bg

白话：面板底色具体用哪个颜色（不填就按面板明度和取色来源推出）。 看哪里：面板的底。

v2 新增（R2：Civ VI 的深蓝底写不出来）。

#### `col.surface2` 次级底色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：vis.opacity > 0

实现：画布：内嵌层、次级面板、列表斑马纹的底色。Godot：Theme 颜色常量 panel_bg_2

v2 新增（R2）。与 lay.grouping = tonalInset 配合。

#### `col.text` 文字色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：正文颜色（auto = 由面板明度推出，v1 写死的做法）。Godot：Theme.font_color

v2 新增（R2）。对比度检查 chk.contrast 读它。

#### `col.accent` 强调色

设计参数 · 范围：全局 · 类型：颜色 · 默认：@accent · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

可覆盖：@组件 / @el.<元素>

实现：画布：强调色（CTA、选中、图标）。Godot：Theme 颜色常量

白话：整套 UI 最抢眼的那个颜色：主按钮、选中、重要数字。 看哪里：主按钮和选中项。

默认引用当前色板的 accent 角色；也可写死。皮肤给默认，关键词与节日可以覆盖（三层共用的少数几个键之一）。

吸收的观察轴 / 旧维度：N:主色相、N:主光色相、N:主色来源

#### `col.accent2` 第二强调色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

可覆盖：@组件 / @el.<元素>

实现：画布：第二个强调色（双色调的另一色、另一类重要信息）。Godot：Theme 颜色常量

白话：第二个强调色：两种重要信息各用一色时用（黄色目标 + 青色血条）。 看哪里：第二种高亮颜色。

v2 新增（R2）：Control 的黄菱形 + 青血条、Cyberpunk 的红 + 青、NFS Heat 的蓝 + 紫、No Man's Sky 的橙顶条 + 蓝选中都要两个强调色。

#### `col.focus` 焦点色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：焦点框 / 选中的颜色（auto = 强调色）。Godot：Theme focus StyleBox 的颜色

v2 新增（R2）。

#### `col.border` 自定义描边色

设计参数 · 范围：全局 · 类型：颜色 · 默认：跟随 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：vis.strokeColor = custom · 可覆盖：@组件 / @el.<元素>

实现：画布：描边色写死。Godot：StyleBoxFlat.border_color

v2 新增（R2）。

#### `col.gradient` 渐变

设计参数 · 范围：全局 · 类型：渐变 · 默认：跟随 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：vis.fill = gradient · 可覆盖：@组件 / @el.<元素>

实现：画布：{ from, to, angle, type: linear | radial }。Godot：GradientTexture2D（fill = linear / radial）放进 StyleBoxTexture

v2 新增（R2）：vis.fill = gradient 时渐变的两端颜色与方向。

#### `col.strategy` 骨架色彩策略

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：neutralAccent） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：界面骨架（底、字、强调）用多少种色相。Godot：Theme 颜色表的规模

白话：界面骨架用几种颜色：单色、灰 + 强调色、双色、多色。语义颜色（敌我、稀有度）不受它限制。 看哪里：面板、字、按钮的整体配色。

v2（R1）：明确只约束骨架色，语义编码色（col.coding）不受它限制——单色终端也可以有红色警告。"多色分类"改名 polychrome（骨架多色），"全彩插画"移到 col.source = illustration。

吸收的观察轴 / 旧维度：V4（"用几种颜色"部分）

- `mono` **单色**：一种色相 + 明暗（参考：Minit s609490_0、terminal 皮肤、GameUI#673040）
- `neutralAccent` **中性 + 一两个强调色**：灰黑白 + 强调色（可再加第二强调色）（参考：Control、GameUI#1009405）
- `duotone` **双色调**：两种主色交替（第二色见 col.accent2）（参考：Florence s1102130_0、Persona 5）
- `polychrome` **骨架多色**：底、按钮、页签各用不同色相（孟菲斯、糖果）（参考：GameUI#1511375、Splatoon）

#### `col.coding` 语义颜色编码

设计参数 · 范围：全局，可逐屏覆盖 · 类型：多选 · 默认：status · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

多选合并：并集

实现：画布：哪些信息由颜色承载（每项必须配形状冗余，见 chk.redundancy）。Godot：Theme 颜色常量分组

白话：哪些信息用颜色区分：敌我、稀有度、状态、元素、玩家、胜负……每一项都要配形状或文字。 看哪里：同类东西之间的颜色差别。

v2（R1）：全局默认 + 逐屏覆盖，合并方式 = 并集（模板加"胜负冷暖"不会把全局的"状态色"去掉）。

吸收的观察轴 / 旧维度：V4（"颜色承载什么"部分）、N:敌我语义色、N:按钮状态语义色、N:付费区分方式、N:功能着色逻辑、N:服务器状态编码

- `team` **阵营色**：敌我、队伍（参考：GameUI#594343、Dota 2 s570_1）
- `rarity` **稀有度**：品质色阶（参考：GameUI#577645、GameUI#1511429）
- `status` **状态色**：绿可用 / 红警告 / 灰不可用（参考：GameUI#594206、GameUI#534976）
- `element` **元素属性色**：火红、冰蓝、毒绿（参考：Path of Exile）
- `player` **玩家 / 频道色**：每位玩家或聊天频道一色（参考：Carcassonne s598810_2、GameUI#943780）
- `resultTone` **胜负冷暖**：胜暖金、败冷灰（参考：GameUI#604590、GameUI#592053）
- `paidTier` **免费 / 付费档**：付费行金紫、免费行灰（参考：GameUI#1707360、GameUI#556160）
- `lineId` **路线 / 类别身份色**：每条线路一色（参考：Mini Metro s287980_1）

#### `col.semantic` 按钮角色配色

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：accentOnly） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：确认 / 取消 / 危险 / 领取 四种按钮角色各用什么色相。Godot：Button 的几个 type variation

v2（R1）：只给按钮角色分配色相；"单色靠形状"删掉（= hier.cta = fillOutline + col.strategy = mono）。主次差距靠什么见 hier.cta。加 R2 的"绿主蓝次"（GameUI#1762374 两个同级按钮各一色）。

吸收的观察轴 / 旧维度：N:按钮语义配色、N:主次按钮配色、N:确认取消按钮、N:价格按钮样式

- `orangeGray` **橙主灰次**：国产手游最常见（参考：GameUI#594215、GameUI#646842）
- `greenRed` **绿确认红取消**：确认用绿、取消用红（参考：GameUI#556175、Carcassonne s598810_2）
- `blueYellow` **蓝取消黄确认**：取消用蓝、确认用黄（参考：GameUI#559177）
- `greenBlue` **绿主蓝次**：两个同级入口各一色（参考：GameUI#1762374）
- `accentOnly` **强调色主按钮**：跟随 col.accent，其余中性（参考：Destiny 2）

#### `col.rarityScale` 稀有度色阶

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：diablo） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

生效条件：col.coding 含 rarity

实现：画布：稀有度对应的颜色表。Godot：Theme 颜色常量数组

v2：删"单色 + 星级"（不用颜色就不该在这个参数里，那是 st.rarityCue = stars）。

- `diablo` **白绿蓝紫橙**：暗黑类惯例（参考：Path of Exile、Diablo）
- `gacha` **蓝紫金 / 彩虹**：R / SR / SSR（参考：GameUI#580662、GameUI#1743977）
- `metal` **铜银金**：段位、名次（参考：GameUI#575942、GameUI#584777）

#### `col.teams` 阵营色对

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：blueRed） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

生效条件：col.coding 含 team

实现：画布 + 场景内：UI 与 3D 场景共用同一对阵营色（06 文档 C.2）。Godot：全局常量，UI 与材质共用

红绿方案在色盲检查下报警（A4 / A12）。

- `blueRed` **蓝我红敌**：己方蓝、敌方红（参考：XCOM 2、GameUI#594343）
- `greenRed` **绿友红敌**：友方绿、敌方红（色盲检查要报警）（参考：Dota 2 s570_1、World of Tanks Blitz s444200_0）
- `orangeBlue` **橙蓝（色盲安全）**：GAG 推荐（参考：06 文档 A4）
- `custom` **自定义**：自定义一对阵营色

#### `col.saturation` UI 饱和度

设计参数 · 范围：全局 · 类型：连续 0–2（步长 0.05） · 默认：跟随（兜底：1） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

随机区间：0.6–1.3

实现：画布：UI 颜色整体饱和度倍率。Godot：导出前把颜色预乘

白话：UI 颜色整体鲜艳还是灰。 看哪里：强调色和图标的鲜艳程度。 两端：0：全灰 ↔ 2：非常艳。

#### `col.dynamic` 主题色变化

设计参数 · 范围：全局 · 类型：单选 · 默认：固定 · 分层：tier 3 · 页签：②外观 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

实现：动画预览：主题色随状态 / 章节 / 阵营切换。Godot：Theme 运行时替换颜色或 Tween modulate

v2：删"警报换皮"（与 st.alert = fullAlarm 完全相同，参考图也相同）。

吸收的观察轴 / 旧维度：N:主题色变化策略、N:状态皮肤切换

- `fixed` **固定**：主题色始终不变
- `perMode` **随形态 / 机制切换**：切宝石、切形态时整套 UI 换色（参考：Marvel Rivals s2767030_2）
- `perChapter` **每章换配色**：每一章换一套主色（参考：Monument Valley s1927720_1、Florence）
- `perScene` **随场景 / 昼夜**：随场景或昼夜切换主色（参考：Stardew Valley s413150_3、Mini Metro（Night Mode））
- `perFaction` **随阵营**：敌方回合整套变红（参考：XCOM 2 s268500_5）

### 2.7 字体与文字（`typ.*`）

**用什么字、多大、怎么排？** 按"角色 × 属性"组织：正文、标题、数字三个角色，各有字族 / 字重 / 大小写 / 字距 / 斜体。另有标题特效、排版方向、字号、序号、可读辅助。标题牌（垫在标题下面的东西）移到组件组 cmp.plate。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `typ.body.family` | 正文字族 | 设计参数 / 全局 | 单选 | 跟随（兜底：sans） | 1 ★ | — | 画布 | builtin |
| `typ.body.weight` | 正文字重 | 设计参数 / 全局 | 单选 | 跟随（兜底：regular） | 2 | — | 画布 | builtin |
| `typ.body.case` | 正文大小写 | 设计参数 / 全局 | 单选 | 跟随（兜底：asIs） | 3 | ctx.locale ∈ {en, bilingual} | 画布 | builtin |
| `typ.body.tracking` | 正文字距 | 设计参数 / 全局 | 连续 | 跟随（兜底：0） | 3 | — | 画布 | builtin |
| `typ.body.style` | 正文斜体 | 设计参数 / 全局 | 单选 | 正体 | 3 | — | 画布 | builtin |
| `typ.display.family` | 标题字族 | 设计参数 / 全局 | 单选 | 跟随（兜底：same） | 1 ★ | — | 画布（字体能做的）/ 素材（中文书法、立体字需图片） | builtin |
| `typ.display.weight` | 标题字重 | 设计参数 / 全局 | 单选 | 跟随（兜底：bold） | 2 | — | 画布 | builtin |
| `typ.display.case` | 标题大小写 | 设计参数 / 全局 | 单选 | 跟随（兜底：asIs） | 3 | ctx.locale ∈ {en, bilingual} | 画布 | builtin |
| `typ.display.tracking` | 标题字距 | 设计参数 / 全局 | 连续 | 跟随（兜底：0） | 3 | — | 画布 | builtin |
| `typ.display.style` | 标题斜体 | 设计参数 / 全局 | 单选 | 正体 | 3 | — | 画布 | builtin |
| `typ.numerals.family` | 数字字体 | 设计参数 / 全局 | 单选 | 跟随（兜底：body） | 3 | — | 画布 | builtin |
| `typ.numerals.style` | 数字斜体 | 设计参数 / 全局 | 单选 | 正体 | 3 | — | 画布 | builtin |
| `typ.titleFx` | 标题字特效 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin / shader |
| `typ.direction` | 标题排版方向 | 设计参数 / 全局 | 单选 | 横排 | 2 | — | 画布 | script / hard |
| `typ.baseSize` | 基准字号 | 设计参数 / 全局 | 连续 | 跟随（兜底：14） | 2 | — | 画布 | builtin |
| `typ.scale` | 字号阶梯比 | 设计参数 / 全局 | 连续 | 跟随（兜底：1.4） | 3 | — | 画布 | builtin |
| `typ.numbering` | 序号样式 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：arabic） | 3 | — | 画布 | builtin |
| `typ.legibility` | 文字可读辅助 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |

#### `typ.body.family` 正文字族

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：sans） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M2 · 现状：已实现

实现：画布：SkinTokens.font（M2 已自托管 13 个 OFL 字体）。Godot：FontFile + Theme.default_font

白话：正文用什么字：黑体、宋体、圆体、楷书、像素字、等宽字。 看哪里：对话、说明、列表里的小字。

吸收的观察轴 / 旧维度：V5（正文）

- `sans` **无衬线**：思源黑体（参考：GameUI#1178739、Control）
- `serif` **衬线 / 宋**：宋体 / 衬线正文，偏古典与奇幻（参考：Elden Ring、GameUI#564121）
- `round` **圆体**：M2 字体未覆盖（候选：思源柔黑 / jf 粉圆，需核对许可）（参考：Animal Crossing、GameUI#572416） 〔需字体〕
- `kai` **楷书 / 手写感**：楷书或手写感正文（参考：GameUI#1079008、handdrawn 皮肤）
- `pixel` **像素**：像素点阵字（参考：Stardew Valley、Moonlighter）
- `mono` **等宽 / 终端**：等宽字，终端与数据感（参考：SUPERHOT s322500_3、terminal 皮肤）
- `condensed` **窄体**：拉丁有 Rajdhani；中文窄体未覆盖（参考：scifi 皮肤（Rajdhani）、World of Warships） 〔需字体〕

#### `typ.body.weight` 正文字重

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：regular） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：TextStyle.weight。Godot：FontVariation.variation_embolden 或换字重文件

白话：正文的粗细。 看哪里：小字的笔画粗细。

- `light` **细**：思源黑体是可变字体，加 300 档即可（参考：GRIS、Monument Valley） 〔需字体〕
- `regular` **常规**：常规字重
- `bold` **粗**：粗字重，醒目（参考：neobrutal 皮肤）
- `black` **特粗**：加 900 档（参考：Mini Metro、Persona 5） 〔需字体〕

#### `typ.body.case` 正文大小写

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：asIs） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

生效条件：ctx.locale ∈ {en, bilingual}

实现：画布：TextStyle.upper。Godot：Label.uppercase

对中文无效；中文版对应"字距加宽 + 小号副标"。

- `asIs` **原样**：保持原文大小写
- `upper` **全大写**：拉丁字母全部大写（参考：Destiny 2、scifi 皮肤）
- `smallCaps` **小型大写**：小写字母画成矮一号的大写（参考：Hades、Clair Obscur）

#### `typ.body.tracking` 正文字距

设计参数 · 范围：全局 · 类型：连续 -0.05–0.5 em（步长 0.01） · 默认：跟随（兜底：0） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：已实现

随机区间：0–0.1

实现：画布：TextStyle.spacing。Godot：FontVariation.spacing_glyph

#### `typ.body.style` 正文斜体

设计参数 · 范围：全局 · 类型：单选 · 默认：正体 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：italic / 合成斜体。Godot：FontVariation.variation_transform（合成斜体）

v2 新增（R2：BotW 的白色斜体对话写不出来）。

- `upright` **正体**：正体
- `italic` **斜体**：斜体（中文用合成斜体，慎用）（参考：Zelda: BotW（白色斜体标题与对话）、Overwatch）

#### `typ.display.family` 标题字族

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：same） · 分层：tier 1（第一屏大旋钮） · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布（字体能做的）/ 素材（中文书法、立体字需图片）。Godot：FontVariation 或 TextureRect 图片标题

白话：标题、LOGO、大字用什么字：同正文、衬线、书法、手写、哥特、像素…… 看哪里：界面标题、胜负大字、角色名。

v2（R1）：只留字族。v1 的"衬线小型大写"= serif + typ.display.case = smallCaps；"细线宽字距"= sans + weight light + tracking 宽；"斜体粗黑"= sans + style italic + weight black；"窄体粗字"= condensed + bold；"圆润粗体"= round + bold；"立体卡通字"= round + typ.titleFx = emboss。加 R2 的西部木刻粗衬线、涂鸦、新艺术。皮肤给默认，关键词可以覆盖。

吸收的观察轴 / 旧维度：计划维度 1b 标题字处理（hud.titleType）、A6、N:Logo 风格、N:VS 符号形态、N:胜负字形态、N:标题艺术字造型、N:池名标题艺术字、N:角色名呈现

- `same` **同正文**：标题用正文同一字体，只放大加粗（参考：Mini Metro）
- `sans` **无衬线**：无衬线标题（可配细字重 + 宽字距）（参考：Destiny 2、GRIS、GameUI#1009405）
- `serif` **衬线**：宋体 / 衬线正文，偏古典与奇幻（参考：Hades、Clair Obscur、GameUI#577635）
- `calligraphy` **书法**：中文书法标题走图片素材（M11）（参考：Black Myth: Wukong、GameUI#580589、GameUI#943766） 〔需素材〕
- `handwritten` **手写**：手写涂鸦字（参考：Ultimate Chicken Horse s386940_4、Hi-Fi Rush（STORE））
- `gothic` **哥特黑体**：拉丁用 OFL 字体（如 UnifrakturMaguntia）+ 中文回退（参考：Bloodborne 类暗黑标题（经验）） 〔需字体〕
- `condensed` **窄体**：恐怖、海报（参考：末班车（GameUI 作品）） 〔需字体〕
- `round` **圆体**：圆体，亲和、休闲（参考：Katamari s848350_0、Worms W.M.D s327030_1） 〔需字体〕
- `stencil` **模板字**：军事（参考：military 皮肤（Black Ops One）） 〔需字体〕
- `ransom` **拼贴勒索信**：每个字母不同字体与底色（参考：Persona 5） 〔需素材〕
- `pixel` **像素标题**：像素点阵大字（参考：Nuclear Throne s242680_3）
- `slabWestern` **西部木刻粗衬线**：新（R2）（参考：Red Dead Redemption 2） 〔需字体〕
- `graffiti` **涂鸦**：新（R2）（参考：GameUI#559108、Jet Set Radio） 〔需字体〕
- `artNouveau` **新艺术 / 美好年代**：新（R2）（参考：Clair Obscur: Expedition 33） 〔需字体〕

#### `typ.display.weight` 标题字重

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：bold） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：标题字重。Godot：FontVariation

白话：标题的粗细：从细线到特粗。 看哪里：大标题的笔画粗细。

- `light` **细**：思源黑体是可变字体，加 300 档即可（参考：GRIS、Monument Valley） 〔需字体〕
- `regular` **常规**：常规字重
- `bold` **粗**：粗字重，醒目（参考：neobrutal 皮肤）
- `black` **特粗**：加 900 档（参考：Mini Metro、Persona 5） 〔需字体〕

#### `typ.display.case` 标题大小写

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：asIs） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

生效条件：ctx.locale ∈ {en, bilingual}

实现：画布：标题大小写。Godot：Label.uppercase / 小型大写字体特性

v2：标题与正文分开（R1：Destiny 2 是"标题宽字距大写、正文常规"）。

- `asIs` **原样**：保持原文大小写
- `upper` **全大写**：拉丁字母全部大写（参考：Destiny 2、scifi 皮肤）
- `smallCaps` **小型大写**：小写字母画成矮一号的大写（参考：Hades、Clair Obscur）

#### `typ.display.tracking` 标题字距

设计参数 · 范围：全局 · 类型：连续 -0.05–0.5 em（步长 0.01） · 默认：跟随（兜底：0） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

随机区间：0–0.3

实现：画布：标题字距。Godot：FontVariation.spacing_glyph

#### `typ.display.style` 标题斜体

设计参数 · 范围：全局 · 类型：单选 · 默认：正体 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

实现：画布：标题斜体。Godot：FontVariation.variation_transform

- `upright` **正体**：正体
- `italic` **斜体**：斜体标题（动感、竞技）（参考：Zelda: BotW（白色斜体标题与对话）、Overwatch）

#### `typ.numerals.family` 数字字体

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：body） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

实现：画布：数值、计分、价格用的字体。Godot：FontVariation（tabular 数字需字体支持 OpenType tnum）

v2：v1 的 typ.numerals 并入"数字"角色；"斜体动感"= display + typ.numerals.style = italic。

吸收的观察轴 / 旧维度：N:营销倍率数字突出、N:金额表达、N:数量表达

- `body` **同正文**：数字和正文同一字体
- `tabular` **等宽数字**：数据表、计时（参考：military 皮肤、Stellaris）
- `display` **大号展示数字**：倍率、尺寸读数、金额（参考：GameUI#625073、Katamari s848350_0）
- `pixel` **像素数字**：像素点阵数字（参考：Binding of Isaac）

#### `typ.numerals.style` 数字斜体

设计参数 · 范围：全局 · 类型：单选 · 默认：正体 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

实现：画布：数字斜体（连击、速度）。Godot：FontVariation.variation_transform

- `upright` **正体**：正体数字
- `italic` **斜体**：连击、速度（参考：DBFZ s678950_1、The Crew s2698940_0）

#### `typ.titleFx` 标题字特效

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3b

实现：画布：描边 / 投影 / 渐变 / 发光可程序；故障、飞白、火焰需遮罩或序列帧。Godot：LabelSettings（outline_size / shadow）；渐变与故障用 CanvasItem 着色器

白话：标题字加什么效果：描边、投影、金属渐变、发光、故障、飞白、火焰、立体浮雕。 看哪里：大标题的边缘和表面。

v2：发光改名 titleGlow（R1：glow 出现在 6 个参数里，加作用对象前缀）。

吸收的观察轴 / 旧维度：N:标题字特效、N:文字质感

- `none` **无**：标题不加特效
- `outline` **描边**：手游粗描边（参考：GameUI#559121、GameUI#25298）
- `shadow` **投影**：标题加一层投影
- `outlineShadow` **描边 + 投影**：描边与投影叠加，手游最常见（参考：GameUI#604580）
- `metal` **金属 / 渐变**：金属渐变或描金（参考：GameUI#943717、GameUI#535026） 〔Godot：着色器〕
- `titleGlow` **标题发光**：黑底发光字（参考：GameUI#572342、DJMAX）
- `glitch` **故障切片**：横向切片错位与色差（参考：GameUI#559158） 〔Godot：着色器〕
- `drybrush` **墨飞白**：毛笔飞白的断笔效果（参考：GameUI#943704） 〔需素材 · Godot：着色器〕
- `fire` **火焰**：火焰缠绕或燃烧边（参考：GameUI#564136） 〔需素材 · Godot：着色器〕
- `emboss` **3D 浮雕 / 糖果立体字**：3D 浮雕 / 糖果立体字（参考：GameUI#215019、GameUI#1762374） 〔Godot：着色器〕

#### `typ.direction` 标题排版方向

设计参数 · 范围：全局 · 类型：单选 · 默认：横排 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3b

实现：画布：竖排需要逐字排版（中文竖排）。Godot：Godot 没有原生竖排：标题用逐字容器或图片；全竖排正文很难

白话：标题横排还是竖排（竖排标题常见于国风、和风）。 看哪里：标题文字的方向。

v2（R1）：删"斜排"（倾斜由 vis.skew 派生）。全部竖排在网页画布可做，Godot 4 的 Label 不支持，标"网页可做 / Godot 困难"（R3）。

吸收的观察轴 / 旧维度：N:文字排版方向、N:标题排版方向

- `horizontal` **横排**：所有文字横排 〔Godot：脚本〕
- `verticalTitle` **标题竖排**：正文仍横排（参考：GameUI#943766、GameUI#604572） 〔Godot：脚本〕
- `verticalAll` **全部竖排**：契约、卷轴（参考：GameUI#563036） 〔Godot：很难〕

#### `typ.baseSize` 基准字号

设计参数 · 范围：全局 · 类型：连续 10–32 px@1080p（步长 1） · 默认：跟随（兜底：14） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 不参与随机

实现：画布：正文字号（其它字号按阶梯比推出）；工具侧检查最小字号。Godot：Theme.default_font_size

白话：正文多大，其它字号都按它算。 看哪里：最小的那行字在目标设备上看不看得清。 两端：10：PC 信息墙 ↔ 26+：电视 10 英尺 UI。

默认由设备派生（D-device）。不参与随机。

吸收的观察轴 / 旧维度：N:UI字号尺度、N:界面缩放尺度

#### `typ.scale` 字号阶梯比

设计参数 · 范围：全局 · 类型：连续 1.1–2.2（步长 0.05） · 默认：跟随（兜底：1.4） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3a

随机区间：1.2–1.8

实现：画布：标题 / 副标 / 正文 / 注释按比例递推。Godot：Theme 中几个字号常量

瑞士式反差极大（Mini Metro 结算），JRPG 窗口很小。

#### `typ.numbering` 序号样式

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：arabic） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M5a

实现：画布：章节、关卡、天数、回合的序号写法。Godot：文案模板

吸收的观察轴 / 旧维度：N:章节序号呈现、N:序号内嵌、N:进度可见度（DAY 序号）

- `chineseChapter` **第 X 章**：写作"第 X 章"（参考：GameUI#572342）
- `arabic` **01 / DAY 1**：写作"01"或"DAY 1"（参考：GameUI#594229、GameUI#575888）
- `roman` **罗马数字**：写作罗马数字 I、II、III（参考：GameUI#559174）
- `singleChar` **单字（始 / 序）**：用一个字代替序号（始、序、终）（参考：GameUI#563039）
- `none` **无序号**：不写序号，只有标题（参考：GameUI#555610）

#### `typ.legibility` 文字可读辅助

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3a · 现状：部分实现

实现：画布：文字压在画面上时的保护（textGlow 已支持）。Godot：LabelSettings.outline / shadow；底板用 Panel

白话：字压在游戏画面上时怎么保证读得清：描边、投影、垫一块半透明底、发光。 看哪里：雪地、强光这类亮背景上的字。

vis.opacity = 0（无底）时 D-lightness 强制 ≠ none。发光改名 textGlow。

吸收的观察轴 / 旧维度：N:文字可读性处理

- `none` **无**：不加保护，适合实底面板
- `outline` **文字描边**：文字外加一圈深色描边（参考：Hades、Nuclear Throne）
- `shadow` **投影**：文字下加投影（参考：jrpg 皮肤）
- `scrim` **半透明底板**：A16 文本框 ≥ 4.5:1（参考：GameUI#594276、Celeste s504230_0）
- `textGlow` **文字发光**：文字外发光（终端荧光字）（参考：terminal 皮肤）

### 2.8 资产槽位（内芯 / 外框 / 饰件 / 特效 / 容器 / 图标 / 背景 / 水印）（`ast.*`）

**面板用什么材料做、框上贴什么、背后放什么？** 08 文档 3.1：皮肤拆成可独立替换的槽位。v2 把"结构"和"材质"分开：内芯与外框各选一个结构，再从共用材质表（第 2.19 节）里选材质；素材生成提示词 = 结构 × 材质 × 母题（vis.motif）× 装饰预算（vis.ornament）。程序化选项先做（M3.5），素材选项未生成前画灰盒占位（标"需素材 · M11"），不禁用。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `ast.core` | 内芯结构 | 设计参数 / 全局 | 单选 | 跟随（兜底：procedural） | 2 | — | 画布 / 素材 | builtin |
| `ast.coreMat` | 内芯材质 | 设计参数 / 全局 | 单选 | 米白纸 | 2 | ast.core = texture | 素材 | builtin / shader |
| `ast.frame` | 外框结构 | 设计参数 / 全局 | 单选 | 跟随（兜底：procedural） | 2 | — | 素材 / 画布 | builtin |
| `ast.frameMat` | 外框材质 | 设计参数 / 全局 | 单选 | 木 | 2 | ast.frame ≠ procedural | 素材 | builtin / shader |
| `ast.ornaments` | 饰件 | 设计参数 / 全局 | 多选 | 跟随（兜底：空） | 3 | — | 素材 / 画布 | builtin |
| `ast.fx` | 叠加特效层 | 设计参数 / 全局 | 多选 | 跟随（兜底：空） | 2 | — | 画布 / 动画预览 | builtin / shader |
| `ast.container` | 场景容器 | 设计参数 / 某一屏 | 单选 | 无 | 2 | — | 素材 / 画布 | builtin |
| `ast.containerSurface` | 容器放在哪 | 设计参数 / 某一屏 | 单选 | 无（浮在画面上） | 3 | ast.container ≠ none | 素材 | builtin |
| `ast.iconSet` | 图标集来源 | 设计参数 / 全局 | 单选 | 跟随（兜底：procedural） | 3 | — | 素材 | builtin |
| `ast.bgArt` | 替换背景 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：solid） | 3 | rel.behind = replaced | 素材 / 画布 | builtin |
| `ast.bgMat` | 背景材质 | 设计参数 / 某一屏 | 单选 | 米白纸 | 3 | ast.bgArt = material | 素材 | builtin / shader |
| `ast.watermark` | 水印层 | 设计参数 / 某一屏 | 单选 | 无 | 3 | — | 素材 / 画布 | builtin |
| `ast.watermarkOpacity` | 水印强度 | 设计参数 / 某一屏 | 连续 | 0.12 | 3 | ast.watermark ≠ none | 画布 | builtin |

#### `ast.core` 内芯结构

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：procedural） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

可覆盖：@组件 / @el.<元素>

实现：画布 / 素材：面板内芯是程序填充、平铺材质，还是一张彩绘插画。Godot：StyleBoxFlat（程序）/ StyleBoxTexture（texture_margin_*，axis_stretch = TILE）/ TextureRect（插画）

白话：面板里面是纯色（程序画），还是一张纸 / 木 / 石的材质，还是一整幅画。 看哪里：面板中间的底。

v2（R1）："程序 / 素材"只在这里判定；选程序填充时才看 vis.fill。v1 vis.fill 的"彩绘插画底"并入 illustration。

吸收的观察轴 / 旧维度：槽位 2 内芯、A1、V2 贴图材质、N:材质母题、N:材质语言、N:UI隐喻材质

- `procedural` **程序填充**：纯色或渐变（见 vis.fill）
- `texture` **材质平铺**：材质见 ast.coreMat（参考：GameUI#534802#1、Anno 1800、Hearthstone）
- `illustration` **彩绘插画**：面板本身就是一张画（参考：GameUI#600471、GameUI#556597） 〔需素材〕

#### `ast.coreMat` 内芯材质

设计参数 · 范围：全局 · 类型：单选 · 默认：米白纸 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：ast.core = texture · 可覆盖：@组件 / @el.<元素>

实现：素材：从共用材质表取（纸、宣纸、绢已有素材；其余未生成前用灰盒占位）。Godot：StyleBoxTexture.texture

白话：面板内芯用什么材料：纸、羊皮纸、宣纸、木、石、金属、皮革…… 看哪里：面板中间的纹理。

v2 新增（R1）：材质表与外框、背景共用。只换按钮的材质：ast.coreMat@button = stone（R2：Slay the Spire 的石质结束回合按钮）。

- `paper` **米白纸**：最通用的内芯；纸纹素材已有（参考：GameUI#534802#1、GameUI#646842）
- `parchment` **羊皮纸**：暗角、旧纸斑（参考：Anno 1800、WoW 任务、GameUI#567648）
- `xuan` **宣纸**：纤维纹、墨洇（参考：GameUI#134914、ink 皮肤）
- `silk` **绢本**：细密经纬、偏黄（参考：现成素材（assets.json））
- `cloth` **布 / 幕布 / 绗缝**：布面或幕布，常做成挂旗（参考：GameUI#128393#1、Armello） 〔需素材〕
- `leather` **皮革**：深红褐、缝线（参考：Civ VI（深红褐皮面板）、Desperados III s610370_4） 〔需素材〕
- `wood` **木**：木纹、木板拼接（参考：Hearthstone、GameUI#580656、Carcassonne s598810_1） 〔需素材〕
- `stone` **石**：石块、刻痕（参考：Total War Warhammer II s594570_0、Grim Dawn s219990_3） 〔需素材〕
- `gold` **金**：浮雕金、金箔（参考：GameUI#535009、GameUI#943792） 〔需素材〕
- `bronze` **青铜**：铜绿、嵌宝石（参考：Hades） 〔需素材〕
- `iron` **铁 / 钢 / 拉丝金属**：拉丝、螺栓、工业厚板（参考：Dota 2 s570_0、GameUI#462112） 〔需素材〕
- `ice` **冰霜金属**：结霜的金属（参考：Frostpunk） 〔需素材〕
- `jade` **玉 / 瓷**：玉或瓷的温润光泽底（参考：GameUI#129374） 〔需素材〕
- `lacquer` **红漆**：国潮红漆、描金（参考：GameUI#535026） 〔需素材〕
- `plastic` **塑料 / 糖果**：高光塑料、Q 版（参考：GameUI#562993、GameUI#215019）
- `hologram` **全息网格**：扫描网格、半透明光面（参考：Detroit、Cyberpunk 2077） 〔Godot：着色器〕
- `lineArt` **线描 / 平涂**：没有材质感的纯色线条与色块（白 / 金细线花饰）（参考：Hollow Knight、Clair Obscur） 〔需素材〕

#### `ast.frame` 外框结构

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：procedural） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

可覆盖：@组件 / @el.<元素>

实现：素材 / 画布：程序线框，或九宫格素材（平框 / 雕花框 / 只有四角）。Godot：StyleBoxFlat（程序）/ NinePatchRect 或 StyleBoxTexture（只拉伸中段）

白话：面板的边框是程序画的线，还是一圈素材（木框、金雕花框……）。 看哪里：面板外圈。

v2（R1）：只表示结构。v1 的成品组合拆开：金色浮雕框 = carvedNinePatch + gold + 装饰 3；青铜嵌宝石 = carvedNinePatch + bronze + 饰件 gems；冰霜金属 = carvedNinePatch + ice；科技线框 = procedural + 实线 1px + 只画四角 + 母题 brackets；像素木框 = plainNinePatch + wood + 像素化；云纹框 = plainNinePatch + 母题 cloud；糖果框 = procedural + 粗描边 + 光泽 candy；撕边 = vis.edge = torn；皮革铜饰 = plainNinePatch + leather + 饰件 rivets；卡牌金框（按稀有度换色）= st.rarityCue = border；重型工业框（R2）= plainNinePatch + iron + 饰件 rivets + 图案 hazard。"无外框" = procedural + vis.stroke = none（v1 的 none 删掉）。

吸收的观察轴 / 旧维度：槽位 1 外框、A2 边框

- `procedural` **程序线框**：按 vis.stroke / vis.corner 画（描边 none 即无外框）
- `plainNinePatch` **平框九宫格**：木框、皮框、像素框：均匀的一圈材质（参考：GameUI#534801#1、Carcassonne s598810_1、Stardew Valley s413150_4） 〔需素材〕
- `carvedNinePatch` **雕花九宫格**：浮雕金框、青铜嵌宝石、冰霜金属（参考：GameUI#535009、GameUI#943792、Hades、Frostpunk） 〔需素材〕
- `cornersOnly` **只有四角件**：角花 / 角铁是素材，四角之间的边由 vis.stroke 程序画（或不画）（参考：Hollow Knight、Clair Obscur） 〔需素材〕

#### `ast.frameMat` 外框材质

设计参数 · 范围：全局 · 类型：单选 · 默认：木 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：ast.frame ≠ procedural · 可覆盖：@组件 / @el.<元素>

实现：素材：从共用材质表取。Godot：NinePatchRect.texture

白话：外框用什么材料：木、石、金、青铜、冰霜金属、皮革…… 看哪里：面板外圈的纹理。

v2 新增（R1）。木牌式列表行：ast.frameMat@listRow = wood（R2：Hearthstone 收藏册）。

- `paper` **米白纸**：最通用的内芯；纸纹素材已有（参考：GameUI#534802#1、GameUI#646842）
- `parchment` **羊皮纸**：暗角、旧纸斑（参考：Anno 1800、WoW 任务、GameUI#567648）
- `xuan` **宣纸**：纤维纹、墨洇（参考：GameUI#134914、ink 皮肤）
- `silk` **绢本**：细密经纬、偏黄（参考：现成素材（assets.json））
- `cloth` **布 / 幕布 / 绗缝**：布面或幕布，常做成挂旗（参考：GameUI#128393#1、Armello） 〔需素材〕
- `leather` **皮革**：深红褐、缝线（参考：Civ VI（深红褐皮面板）、Desperados III s610370_4） 〔需素材〕
- `wood` **木**：木纹、木板拼接（参考：Hearthstone、GameUI#580656、Carcassonne s598810_1） 〔需素材〕
- `stone` **石**：石块、刻痕（参考：Total War Warhammer II s594570_0、Grim Dawn s219990_3） 〔需素材〕
- `gold` **金**：浮雕金、金箔（参考：GameUI#535009、GameUI#943792） 〔需素材〕
- `bronze` **青铜**：铜绿、嵌宝石（参考：Hades） 〔需素材〕
- `iron` **铁 / 钢 / 拉丝金属**：拉丝、螺栓、工业厚板（参考：Dota 2 s570_0、GameUI#462112） 〔需素材〕
- `ice` **冰霜金属**：结霜的金属（参考：Frostpunk） 〔需素材〕
- `jade` **玉 / 瓷**：玉或瓷的温润光泽底（参考：GameUI#129374） 〔需素材〕
- `lacquer` **红漆**：国潮红漆、描金（参考：GameUI#535026） 〔需素材〕
- `plastic` **塑料 / 糖果**：高光塑料、Q 版（参考：GameUI#562993、GameUI#215019）
- `hologram` **全息网格**：扫描网格、半透明光面（参考：Detroit、Cyberpunk 2077） 〔Godot：着色器〕
- `lineArt` **线描 / 平涂**：没有材质感的纯色线条与色块（白 / 金细线花饰）（参考：Hollow Knight、Clair Obscur） 〔需素材〕

#### `ast.ornaments` 饰件

设计参数 · 范围：全局 · 类型：多选 · 默认：跟随（兜底：空） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

多选合并：并集

实现：素材 / 画布：额外的小件（角花、分隔饰条、端盖……）。Godot：TextureRect 子节点，锚在面板角或边

v2：删"印章"（标牌统一到 cmp.plate = seal）。标题牌归 cmp.plate；页签外形归 cmp.tab；徽章底座只在这里（v1 vis.iconFrame = base 删掉）。受 vis.ornament 约束：预算 0 时必须为空。

吸收的观察轴 / 旧维度：槽位 3 饰件、A2 饰件

- `corners` **角花 / 角饰**：面板四角的花饰或金属角（参考：Hollow Knight、Clair Obscur） 〔需素材〕
- `dividers` **分隔饰条**：分隔区块的饰条（参考：Elden Ring（淡金细线）、GameUI#572343）
- `badgeBase` **徽章底座**：底座材质 + 通用符号两层（参考：GameUI#594259、GameUI#211602） 〔需素材〕
- `ribbons` **缎带**：飘带或缎带装饰（参考：Armello、Bad North） 〔需素材〕
- `hangers` **挂件 / 红绳**：红绳、流苏等挂件（参考：GameUI#129374） 〔需素材〕
- `rivets` **铆钉 / 金属夹角**：铆钉或金属夹角（参考：Dota 2 s570_5、Desperados III）
- `gems` **嵌宝石**：嵌在框上的宝石（参考：Hades（紫水晶）、GameUI#214058） 〔需素材〕
- `sprigs` **花枝**：面板角上探出的花枝（参考：GameUI#534801#1） 〔需素材〕
- `endcaps` **端盖**：技能栏两端雕花（参考：World of Warcraft） 〔需素材〕

#### `ast.fx` 叠加特效层

设计参数 · 范围：全局 · 类型：多选 · 默认：跟随（兜底：空） · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

可覆盖：@组件 / @el.<元素> · 多选合并：并集

实现：画布 / 动画预览：附着在 UI 元件上的加色效果层，跟随主题色、与面板材质解耦。Godot：CanvasItem 着色器（BLEND_ADD）、GPUParticles2D、AnimatedSprite2D

白话：UI 上叠的光效层：外发光、放射光、光柱、魔法阵、粒子、扫描线、故障、墨晕。 看哪里：奖励、金框、标题周围的光。

v2（R1）：限定为"附着在 UI 元件上的层"。删"颗粒噪点"（整屏颗粒属于画面后处理）、"网点"（并入 vis.pattern）、"光柱"保留（v1 mo.reveal = pillar 删掉，改成 光柱层 + 演出强度 3）。面板外发光只在这里（v1 vis.depth = glow 删掉）。多选合并 = 并集。怎么动属于 mo.*。

吸收的观察轴 / 旧维度：槽位 4 叠加特效、A4、M1、N:背光形态、N:光效氛围、N:环境饰件（光柱）

- `glow` **外发光**：柔和外发光（面板、金框）（参考：GameUI#572342、Cyberpunk 2077）
- `holo` **镭射彩虹**：随角度变化的彩虹镭射（参考：GameUI#38935） 〔Godot：着色器〕
- `rays` **放射光芒**：从中心向外放射的光芒（参考：GameUI#603729、GameUI#177285）
- `pillar` **光柱**：竖直落下的光柱（参考：GameUI#604593、GameUI#572391）
- `magicCircle` **魔法阵**：旋转的魔法阵（参考：GameUI#208192、GameUI#580682）
- `petals` **花瓣 / 雪 / 彩带粒子**：飘落的花瓣、雪花或彩带（参考：GameUI#123501、GameUI#215019）
- `stardust` **星尘 / 光点**：漂浮的光点与星尘（参考：GameUI#209024#2）
- `scanlines` **扫描线**：横向扫描线（参考：terminal 皮肤、The End Is Nigh s583470_5）
- `glitch` **故障色差**：错位与 RGB 色差（参考：Cyberpunk 2077、GameUI#559158） 〔Godot：着色器〕
- `ink` **墨晕 / 墨烟**：晕开的墨团或墨烟（参考：GameUI#132864#1） 〔需素材 · Godot：着色器〕
- `speedlines` **面板速度线**：只在面板 / 横幅上（整屏速度线见 rel.metaFx）（参考：GameUI#559090、DBFZ s678950_0）

#### `ast.container` 场景容器

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 2 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

实现：素材 / 画布：同一份菜单数据换"壳"（书的左页 / 书脊 / 右页、卷轴的卷杆 + 可拉长纸面……）。Godot：2D：TextureRect 物件底图 + 内容区 MarginContainer；3D：SubViewport 贴到模型上

白话：整个菜单装在一个"像世界里东西"的壳里：书、卷轴、手机、终端、信封、牌桌、柜台…… 看哪里：菜单的外壳。

与 rel.diegesis 独立：容器是"长得像世界里的东西"，放置方式是"是否真的在世界里"。屏幕上的一本 2D 书 = 容器 book + 放置 screen。v2 改名：banner → hangingBanner、device → handheldDevice、photo → photoFrame、stage → theater（R1 同名异义）；加 foldingScreen（R2）。先做 book / scroll / phone 三种验证"同一份数据换壳"。

吸收的观察轴 / 旧维度：槽位 5 场景容器、A3、N:容器隐喻、N:叙事包装、N:载体隐喻、N:页面隐喻、N:界面隐喻、N:照片载体隐喻、N:界面框架隐喻、N:货架隐喻、N:邮件载体隐喻、N:红包容器造型、N:陈列载体、N:叙事包装隐喻、N:命名输入承载

- `none` **无**：普通面板
- `book` **书**：左页列表、右页详情（详情自动为常驻）（参考：Moonlighter s606150_2、Hearthstone（收藏册）、GameUI#199632） 〔需素材〕
- `notebook` **笔记本 / 手账**：手账或笔记本，可贴照片和便签（参考：Return of the Obra Dinn、Ultimate Chicken Horse s386940_4、GameUI#1463177） 〔需素材〕
- `scroll` **卷轴**：上下卷杆、纸面可拉长的卷轴（参考：GameUI#572387、GameUI#943700） 〔需素材〕
- `hangingBanner` **挂旗 / 挂轴**：顶帽 + 可平铺中段 + 尖底的挂旗（参考：GameUI#136758#1、Armello） 〔需素材〕
- `desk` **书桌 / 桌面**：整屏是一张书桌，物件即入口（参考：GameUI#49084、Papers, Please） 〔需素材〕
- `tableTop` **牌桌**：牌桌或游戏桌面（参考：Hearthstone、GWENT s1284410_0） 〔需素材〕
- `counter` **柜台 / 货架**：店铺柜台与货架（参考：Florence、GameUI#567745） 〔需素材〕
- `phone` **手机**：游戏里的手机（参考：Animal Crossing（Nookphone）、GameUI#555446#1）
- `handheldDevice` **平板 / 手持终端**：手持终端或平板设备（参考：MGSV（iDroid）、Zelda BotW（希卡石板））
- `crt` **CRT 电视 / 电脑终端**：CRT 电视或老电脑屏幕（参考：SUPERHOT s322500_3、The Final Station s435530_3）
- `envelope` **信封 / 信笺**：信封与信笺（参考：GameUI#559122、GameUI#625077） 〔需素材〕
- `photoFrame` **相框 / 拍立得**：相框或拍立得（参考：GameUI#143157） 〔需素材〕
- `theater` **剧场舞台**：舞台与幕布（参考：BattleBlock Theater s238460_1、GameUI#128393#1） 〔需素材〕
- `noticeBoard` **告示牌 / 门楼**：告示牌、门楼牌匾（参考：GameUI#534704#1） 〔需素材〕
- `wrist` **腕表**：角色手腕上的表或设备（参考：s3008130_2）
- `cockpit` **座舱 / 车内**：车内仪表、座舱、后视镜（参考：The Crew s2698940_2、Night Call s680380_2） 〔需素材〕
- `handMap` **摊开的地图**：角色手里摊开的纸地图（参考：Red Dead Redemption 2） 〔需素材〕
- `foldingScreen` **屏风**：折页 + 折痕（新，R2）（参考：ui-asset-materials 17.1） 〔需素材〕

#### `ast.containerSurface` 容器放在哪

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无（浮在画面上） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：ast.container ≠ none

实现：素材：容器下面垫的台面（书放在木架上、手账摊在书桌上）。Godot：TextureRect 底图

v2 新增（R2：Hearthstone 收藏册在木架上、GameUI#594229 书桌）。

- `none` **无（浮在画面上）**：容器直接浮在画面或背景上
- `desk` **书桌**：容器摊在书桌上（参考：GameUI#594229） 〔需素材〕
- `shelf` **木架**：容器放在木架上（参考：Hearthstone（收藏册）） 〔需素材〕
- `table` **桌面 / 地面**：容器放在桌面或地面上（参考：ui-asset-materials 10.1） 〔需素材〕

#### `ast.iconSet` 图标集来源

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：procedural） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M11

实现：素材：图标从哪来（风格由 vis.iconStyle 定）。Godot：AtlasTexture 图集 + Theme 图标

v2：默认由图标风格派生（D-iconSet：线性 → 图标字体，扁平 / 双色 / 剪影 → 程序几何，手绘 / 3D / 写实 / 像素 → 图集素材，未生成前画灰盒占位）。v2（R1）：只留来源；"皮肤专属图标集"与"生成图集"合并为 asset（用 AI 生成还是手画是管线问题，写进素材元数据）。与 vis.iconStyle 有兼容约束。图标集按"货币三档（单个 / 一堆 / 一箱）+ 道具 + 系统功能"组织。

吸收的观察轴 / 旧维度：槽位 6 图标集、A5

- `procedural` **程序几何**：占位图标，零素材
- `font` **图标字体**：通用线性图标 〔需字体〕
- `asset` **图集素材**：手画或 M11 AI 批量生成（参考：Hades、Dota 2、GameUI 作品：AI 出图标对比） 〔需素材〕
- `runtimeRender` **游戏内实时渲染**：3D 道具实时渲染成图标（参考：GameUI#1511375） 〔需场景〕

#### `ast.bgArt` 替换背景

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：solid） · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：rel.behind = replaced

实现：素材 / 画布：场景被替换时背后放什么（A7 插画）。Godot：TextureRect 全屏 / SubViewport 3D 展台

v2：v1 ast.backdrop 改名（R1：backdrop 三义）。"整屏纸面"改为 material（材质见 ast.bgMat，R2 的整屏木纹 / 石 / 布也在这里）；"黑场"改为 solid（纯色，承接 v1 rel.backdrop = none）；"氛围展台"改名 spotlightStage。

吸收的观察轴 / 旧维度：A7、N:背景素材来源、N:背景处理、N:背景类型、N:场景类型、N:立绘背景处理、N:主体舞台、N:背景场景容器、N:叙事媒介、N:陈列背景

- `keyArt` **主视觉海报**：角色主视觉海报铺满背景（参考：GameUI#1767146、GameUI#604569） 〔需素材〕
- `sceneArt` **风景插画**：风景插画铺满背景（参考：GameUI#614494） 〔需素材〕
- `gradient` **抽象渐变 / 光效**：抽象渐变或光效背景（参考：GameUI#1511375）
- `pattern` **图案平铺**：图案平铺背景（参考：GameUI#186664）
- `material` **整屏材质**：材质见 ast.bgMat（纸、木、石、布……）（参考：GameUI#211068#1、Don't Starve（红木底）、ui-asset-materials 10.0）
- `starfield` **星空**：星空背景（参考：Destiny 2、GameUI#592048）
- `spotlightStage` **氛围展台**：中央 3D 角色 + 聚光（参考：Minion Masters s489520_2、GameUI#463054） 〔需场景〕
- `solid` **纯色 / 黑场**：纯黑或暗色舞台（参考：GameUI#1767141、GameUI#572342、GameUI#1776455）
- `comicPanels` **漫画分格**：漫画分格画面（参考：GameUI#559091、Florence s1102130_1） 〔需素材〕

#### `ast.bgMat` 背景材质

设计参数 · 范围：某一屏 · 类型：单选 · 默认：米白纸 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：ast.bgArt = material

实现：素材：从共用材质表取。Godot：TextureRect（stretch_mode = TILE）

- `paper` **米白纸**：最通用的内芯；纸纹素材已有（参考：GameUI#534802#1、GameUI#646842）
- `parchment` **羊皮纸**：暗角、旧纸斑（参考：Anno 1800、WoW 任务、GameUI#567648）
- `xuan` **宣纸**：纤维纹、墨洇（参考：GameUI#134914、ink 皮肤）
- `silk` **绢本**：细密经纬、偏黄（参考：现成素材（assets.json））
- `cloth` **布 / 幕布 / 绗缝**：布面或幕布，常做成挂旗（参考：GameUI#128393#1、Armello） 〔需素材〕
- `leather` **皮革**：深红褐、缝线（参考：Civ VI（深红褐皮面板）、Desperados III s610370_4） 〔需素材〕
- `wood` **木**：木纹、木板拼接（参考：Hearthstone、GameUI#580656、Carcassonne s598810_1） 〔需素材〕
- `stone` **石**：石块、刻痕（参考：Total War Warhammer II s594570_0、Grim Dawn s219990_3） 〔需素材〕
- `gold` **金**：浮雕金、金箔（参考：GameUI#535009、GameUI#943792） 〔需素材〕
- `bronze` **青铜**：铜绿、嵌宝石（参考：Hades） 〔需素材〕
- `iron` **铁 / 钢 / 拉丝金属**：拉丝、螺栓、工业厚板（参考：Dota 2 s570_0、GameUI#462112） 〔需素材〕
- `ice` **冰霜金属**：结霜的金属（参考：Frostpunk） 〔需素材〕
- `jade` **玉 / 瓷**：玉或瓷的温润光泽底（参考：GameUI#129374） 〔需素材〕
- `lacquer` **红漆**：国潮红漆、描金（参考：GameUI#535026） 〔需素材〕
- `plastic` **塑料 / 糖果**：高光塑料、Q 版（参考：GameUI#562993、GameUI#215019）
- `hologram` **全息网格**：扫描网格、半透明光面（参考：Detroit、Cyberpunk 2077） 〔Godot：着色器〕
- `lineArt` **线描 / 平涂**：没有材质感的纯色线条与色块（白 / 金细线花饰）（参考：Hollow Knight、Clair Obscur） 〔需素材〕

#### `ast.watermark` 水印层

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

实现：素材 / 画布：面板或整屏底下一层低对比的徽记、书法、古画。Godot：TextureRect + modulate.a

v2 新增（R2：WoW 部落徽记水印、黑神话影神图的书法 / 古画水印、云纹水印）。与 st.emptyList = watermark（空状态占位）不同。

- `none` **无**：没有水印
- `factionEmblem` **阵营徽记**：阵营徽记（部落、联盟）（参考：World of Warcraft（任务面板）） 〔需素材〕
- `calligraphy` **书法**：大字书法（参考：Black Myth: Wukong（影神图）） 〔需素材〕
- `faintPainting` **淡古画**：低对比古画（参考：Black Myth: Wukong（影神图）） 〔需素材〕
- `totem` **图腾**：图腾 〔需素材〕
- `sigil` **符印 / 法阵**：符印 / 法阵
- `logo` **游戏 LOGO**：游戏 LOGO（参考：Kena s1954200_0）
- `mapLines` **地图线条**：地图或星图线条（参考：ui-asset-materials 17.1）

#### `ast.watermarkOpacity` 水印强度

设计参数 · 范围：某一屏 · 类型：连续 0–0.5（步长 0.02） · 默认：0.12 · 分层：tier 3 · 页签：②外观 · 展示：静帧 · 里程碑：M3.5

生效条件：ast.watermark ≠ none

实现：画布：水印 alpha。Godot：TextureRect.modulate.a

### 2.9 与世界的关系（`rel.*`）

**UI 和游戏世界是什么关系：在不在世界里、像不像、背后的画面怎么处理？** UI 放在哪（四分法）、和画面是什么关系、背后的场景怎么处理、HUD 什么时候出现、后处理会不会作用到 UI。W1 / W2 / W3 三个观察轴在这里互相独立。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `rel.diegesis` | 默认放置方式 | 设计参数 / 全局 | 单选 | 屏幕叠加 | 2 | — | 画布（屏幕叠加 / 元 UI）+ 场景内（空间内 / 叙事内用世界空间公告板与四边形，M6） | builtin |
| `rel.harmony` | UI 与画面关系 | 解析设置 / 全局 | 单选 | 跟随 | 1 ★ | — | 解析设置 | builtin |
| `rel.behind` | 背后画面来源 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：live） | 2 | — | 画布 + 后处理 | builtin |
| `rel.dim` | 压暗强度 | 设计参数 / 某一屏 | 连续 | 跟随（兜底：0.5） | 2 | — | 画布 | builtin |
| `rel.sceneBlur` | 背后虚化 | 设计参数 / 某一屏 | 连续 | 0px | 3 | — | 画布 + 后处理 | shader |
| `rel.sceneTone` | 背后调色 | 设计参数 / 某一屏 | 单选 | 原样 | 3 | — | 后处理 | shader |
| `rel.hudVisibility` | HUD 显隐策略 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：always） | 2 | cnt.screen = screen.hud | 动画预览 | builtin |
| `rel.followPost` | UI 受画面后处理影响 | 设计参数 / 全局 | 单选 | 跟随（兜底：crisp） | 3 | — | 画布 | builtin / post |
| `rel.metaFx` | 元 UI 屏幕效果 | 设计参数 / 全局 | 多选 | （空） | 2 | — | 画布 / 后处理 | post |
| `rel.worldRender` | 世界内标注渲染（默认） | 设计参数 / 全局 | 单选 | 跟随（兜底：billboard） | 3 | — | 场景内 | builtin / shader |
| `rel.semanticZoom` | 语义缩放 | 设计参数 / 某一屏 | 单选 | 无 | 3 | — | 场景内 + 画布 | builtin |

#### `rel.diegesis` 默认放置方式

设计参数 · 范围：全局 · 类型：单选 · 默认：屏幕叠加 · 分层：tier 2 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M6

实现：画布（屏幕叠加 / 元 UI）+ 场景内（空间内 / 叙事内用世界空间公告板与四边形，M6）。Godot：屏幕：CanvasLayer；空间内：Camera3D.unproject_position() 或 Sprite3D / Label3D；叙事内：SubViewport 贴到 MeshInstance3D；元 UI：全屏 ColorRect 着色器

白话：UI 是贴在屏幕上，还是挂在世界里的物体上，还是本身就是世界里的东西（角色也看得见），还是用整屏效果表达。 看哪里：血条、标记跟着镜头动还是跟着世界动。

这是整套 UI 的默认；每个信息元素可单独覆盖（elx.diegesis）。

吸收的观察轴 / 旧维度：计划第 2 维 hud.diegesis、W1

- `screen` **屏幕叠加**：贴在屏幕上，和世界无关（参考：Hades、GameUI#594209）
- `spatial` **空间内**：在世界里定位，但角色看不见（头顶血条、命中率、标记）（参考：XCOM 2（命中率）、Detroit、Dota 2 s570_1）
- `diegetic` **叙事内**：UI 就是世界里的东西，角色也看得见（参考：Dead Space（背脊血条）、MGSV iDroid、Minit s609490_0）
- `meta` **元 UI**：屏幕效果表达状态（受伤泛红、夜视）（参考：Call of Duty、GameUI#600487）

#### `rel.harmony` UI 与画面关系

解析设置 · 范围：全局 · 类型：单选 · 默认：跟随 · 分层：tier 1（第一屏起点选择） · 页签：⑤与世界 · 展示：静帧 · 里程碑：M3a

实现：解析设置：决定"跟随画面"派生规则的强度与 col.source 的默认值；工具侧比较 UI 与场景色板 / 媒介的距离。Godot：无直接对应（设计约束）

白话：UI 要多像游戏画面：用同一种画法、只统一颜色、做成中性通用 UI，还是故意反差。 看哪里：UI 和画面放在一起像不像同一个游戏。

v2（R1）：归为"解析设置"，与原子参数分开计数。它推出 col.source（同一媒介 / 统一调色 → 场景色板，中性 → 皮肤色，刻意对比 → 独立控件色板）；同一媒介时 D-outline / D-toon / D-paper / D-pixel / D-frame 从"默认类"升为"适配类"，排到预设之后（UI 跟画面走，皮肤让位）。选项按"跟随画面"从强到弱排列（R3）。

吸收的观察轴 / 旧维度：W2

- `sameMedium` **同一媒介**：UI 和世界用同一种画法（像素对像素、墨线对墨线）（参考：Moonlighter s606150_0、Hidden Folks s435400_1、Florence）
- `unified` **统一调色**：同一色板，不同媒介（参考：GameUI#1775202、GameUI#604574）
- `neutral` **中性**：通用 UI，不刻意贴合（参考：Witcher 3、GameUI#1009406）
- `contrast` **刻意对比**：用反差让 UI 跳出来（参考：Carcassonne s598810_2、Marvel Rivals、GameUI#1767144）

#### `rel.behind` 背后画面来源

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：live） · 分层：tier 2 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M9a

实现：画布 + 后处理：背后是实时场景、冻结的场景，还是整屏替换成背景素材。Godot：get_tree().paused（冻结）；隐藏 3D 视口 + TextureRect（替换）

白话：弹出界面时，后面的游戏画面还在动、停住了，还是被换成一张背景图。 看哪里：界面后面露出来的东西。

v2（R1）：v1 rel.backdrop 改名，只表示来源。压暗与虚化拆成两个连续量 rel.dim / rel.sceneBlur（v1 的 dim / blur / dimBlur 四档删掉）；"无场景（纯色 / 黑场）"= replaced + ast.bgArt = solid。弹窗叠在另一层 UI 上时，下层 UI 同样由 rel.dim / rel.sceneBlur 处理（v1 flow.stacking = dimBelow 删掉）。

吸收的观察轴 / 旧维度：W3、N:暂停时世界状态、N:与实时场景共存、N:实时世界取景 vs 静态模板

- `live` **实时场景**：场景照常运行（HUD、侧抽屉、实时聊天）（参考：GameUI#1511534、Hades）
- `frozen` **冻结**：暂停时画面静止（参考：GameUI#573374）
- `replaced` **替换为背景**：见 ast.bgArt（参考：GameUI#1767146、GameUI#594333）

#### `rel.dim` 压暗强度

设计参数 · 范围：某一屏 · 类型：连续 0–0.95（步长 0.05） · 默认：跟随（兜底：0.5） · 分层：tier 2 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M9a

随机区间：0–0.7

实现：画布：暗幕不透明度（背后是场景或下层 UI 都一样）。Godot：ColorRect.color.a

白话：弹窗后面的画面压暗多少。 看哪里：弹窗四周的暗幕。 两端：0：不压暗 ↔ 0.9：几乎黑场。

轻 < 0.4（GameUI#177236）、中 0.4–0.7（GameUI#197284）、重 > 0.7（GameUI#573374）。

吸收的观察轴 / 旧维度：N:遮罩强度、N:遮罩深度

#### `rel.sceneBlur` 背后虚化

设计参数 · 范围：某一屏 · 类型：连续 0–24 px（步长 1） · 默认：0px · 分层：tier 3 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M9a

随机区间：0–12

实现：画布 + 后处理：对背后整屏做模糊。Godot：BackBufferCopy + 模糊着色器

v2 新增（R1），与面板自身的毛玻璃 vis.blur 分开命名。参考：GameUI#1304865、GameUI#146281、GameUI#1743964。

#### `rel.sceneTone` 背后调色

设计参数 · 范围：某一屏 · 类型：单选 · 默认：原样 · 分层：tier 3 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M9a

实现：后处理：背后画面（场景或替换背景）去色、单色、着色、暗角。Godot：全屏 ColorRect 着色器

v2 新增（R2：MGSV 结算的黑白照片底、暂停时去饱和）。

- `none` **原样**：背后画面原样 〔Godot：着色器〕
- `desaturate` **去饱和**：暂停时世界褪色（参考：GameUI#592053） 〔Godot：着色器〕
- `mono` **黑白**：背后画面变黑白（参考：MGSV（结算）） 〔Godot：着色器〕
- `duotone` **双色调**：背后画面映射成两色（参考：Persona 5） 〔Godot：着色器〕
- `tint` **整体着色**：背后画面整体染一层色 〔Godot：着色器〕
- `vignette` **暗角**：背后画面四周压暗角 〔Godot：着色器〕

#### `rel.hudVisibility` HUD 显隐策略

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：always） · 分层：tier 2 · 页签：⑤与世界 · 展示：情境三联 · 里程碑：M5b

生效条件：cnt.screen = screen.hud

实现：动画预览：按模拟状态（战斗 / 探索 / 静止）显隐 HUD 组件。Godot：Tween modulate.a；状态机驱动 visible

白话：HUD 什么时候出现：一直在、打起来才出现、不操作就淡出、按键才呼出。 看哪里：探索 / 战斗 / 静止三种情况下 HUD 的样子（看情境三联图）。

v2（R1）：删"只留叙事内"（那是放置方式：所有元素 elx.diegesis = diegetic + 这里 = always）。"全隐"只作为电影模式总开关。商店截图里大量"无 HUD"是营销隐藏，参考卡用元数据 ref.shotType 标出。

吸收的观察轴 / 旧维度：N:HUD显隐策略、N:HUD出现策略、N:UI存在方式、N:UI可见度

- `always` **常驻**：HUD 一直显示（参考：Dota 2 s570_0、Worms W.M.D s327030_1）
- `contextual` **情境显现**：探索时压到最小，战斗才出现（参考：AC Shadows s3159330_1、Elden Ring）
- `fadeIdle` **静止渐隐**：不操作一会儿就淡出（参考：Zelda BotW（经验））
- `onDemand` **按键呼出**：按住才看地图 / 罗盘 / 记分（参考：World of Warcraft（Scoreboard））
- `hidden` **电影模式（全隐）**：总开关：HUD 全部不画（参考：Journey、GRIS、Days Gone s1259420_3）

#### `rel.followPost` UI 受画面后处理影响

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：crisp） · 分层：tier 3 · 页签：⑤与世界 · 展示：静帧 · 里程碑：M6

实现：画布：HUD 纹理在后处理链的哪一步合成（OUTPUT 之前 / 之后）。Godot：CanvasLayer 放在 WorldEnvironment 之后（清晰）或把 UI 画进 SubViewport 再参与后处理

v2（R1）：删"跟随像素化"（= vis.pixelScale = world）。"跟随纸纹 / 描边 / 调色"只在放置方式不是屏幕叠加时成立（约束）。默认由放置方式派生（D-diegesis-post）。warp / stylize 要改 Pipeline 合成顺序，放到 M6（R3）。

吸收的观察轴 / 旧维度：计划第 5 维的一部分（CRT → UI 一起被弯曲）、N:屏幕后期滤镜、N:画面边缘处理

- `crisp` **不受影响**：清晰叠加在最上层（默认）（参考：Hades）
- `warp` **跟随弯曲 / 畸变**：CRT 弯曲、镜头畸变（参考：The End Is Nigh s583470_5） 〔Godot：后处理〕
- `stylize` **跟随纸纹 / 描边 / 调色**：叙事内 UI 被画面媒介处理（参考：Hidden Folks s435400_1、Florence） 〔Godot：后处理〕
- `full` **全部跟随**：UI 和画面一起经过全部后处理（参考：SUPERHOT s322500_3） 〔Godot：后处理〕

#### `rel.metaFx` 元 UI 屏幕效果

设计参数 · 范围：全局 · 类型：多选 · 默认：（空） · 分层：tier 2 · 页签：⑤与世界 · 展示：事件触发 · 里程碑：M6

多选合并：并集

实现：画布 / 后处理：用整屏效果表达状态（由事件触发）。Godot：全屏 ColorRect + CanvasItem 着色器（暗角、色差、去饱和）

白话：用整屏效果表达状态：受伤红边、低血去色、闪白、速度线、夜视、边缘光、故障。 看哪里：受击、低血量时整个屏幕的变化（用事件按钮触发）。

v2（R1）：只留状态触发的效果。删"CRT 框"（= 画面参数 surface.screen，D-crt 读它）、"电影黑边"（= 画面参数 camera.letterbox，D-letterbox 读它）。v1 el.vitals.form = edgeRed、el.feedback.form = flashShake 删掉：元素放置方式为元 UI 时，用 elx.metaFx 选这里的哪一项。

吸收的观察轴 / 旧维度：N:屏幕后期滤镜（元 UI 部分）

- `hurtVignette` **受击红边**：受击时屏幕边缘泛红（参考：Call of Duty、GameUI#580605） 〔Godot：后处理〕
- `lowHpDesat` **低血去饱和**：低血量时整屏去饱和（参考：GameUI#592053） 〔Godot：后处理〕
- `hitFlash` **闪白**：受击瞬间闪白（参考：GameUI#559090） 〔Godot：后处理〕
- `speedLines` **整屏速度线**：高速或冲刺时出现速度线（参考：DBFZ s678950_0、Thumper s356400_4） 〔Godot：后处理〕
- `nightVision` **夜视**：夜视绿色滤镜与颗粒（参考：Call of Duty MW s2000950_4） 〔Godot：后处理〕
- `edgeGlow` **边缘光框**：技能 / 状态时屏幕边发光（参考：Marvel Rivals s2767030_4） 〔Godot：后处理〕
- `glitch` **故障**：整屏数字故障（参考：Detroit s1222140_0） 〔Godot：后处理〕

#### `rel.worldRender` 世界内标注渲染（默认）

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：billboard） · 分层：tier 3 · 页签：⑤与世界 · 展示：情境三联 · 里程碑：M6

实现：场景内：空间内 / 叙事内元素的默认渲染方式；每个元素可用 elx.worldRender 覆盖。Godot：Sprite3D（billboard）、Decal（地面圈）、Label3D、描边着色器

v2（R1）：v1 rel.worldMarkers 改名并降为全局默认；同一游戏不同元素可以不同（Dota 2：头顶血条 billboard、范围圈 decal、交互 outline）。"投影回屏幕"删掉：= elx.diegesis = screen + elx.attachTo。

吸收的观察轴 / 旧维度：N:世界内标注、N:世界锚定 UI、N:世界锚定标记形态、N:信息挂载对象、N:空间内文字载体

- `billboard` **平面公告板**：始终朝屏幕，大小可固定（参考：Dota 2 s570_1、Worms W.M.D s327030_0） 〔需场景〕
- `perspective` **透视贴面**：面板贴在世界表面，有透视（参考：Detroit、Cyberpunk 2077） 〔需场景〕
- `decal` **地面贴花**：预警圈、范围圈、落点（参考：Disc Jam s415880_4、Dota 2） 〔需场景〕
- `outline` **物体描边高亮**：不画面板，只描物体（参考：A5 高亮键（06 文档）、The Last of Us） 〔需场景 · Godot：着色器〕

#### `rel.semanticZoom` 语义缩放

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 3 · 页签：⑤与世界 · 展示：情境三联 · 里程碑：M7

实现：场景内 + 画布：镜头拉远时信息换一种表达。Godot：按 Camera3D 距离切换 LOD 与标签显隐

A9 建造经营的核心规则：近景看细节，中景看屋顶剪影，远景看色块与图标。

吸收的观察轴 / 旧维度：N:缩放层级切换

- `none` **无**：缩放时信息表达不变
- `iconize` **拉远图标化**：单位变成图标 / 旗帜（参考：Civ VI s289070_1）
- `labels` **按缩放切换标签**：不同缩放显示不同标签（参考：Cities Skylines）
- `heatmap` **拉远切热力图**：拉远后切成热力图或色块（参考：Cities Skylines（信息视图））

### 2.10 动效与演出（`mo.*`）

**UI 怎么动：怎么出来、多快、什么手感、东西怎么"给"出来？** 静态截图看不出来的部分。按参数分别用"时间轴 + 逐帧条带 + 缓动曲线""事件触发""流程分镜"展示（见每个参数的"展示"字段与第 7 节）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `mo.enter` | 入场动效 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：cut） | 2 | — | 动画预览 | builtin / shader |
| `mo.duration` | 动效时长 | 设计参数 / 全局 | 连续 | 跟随（兜底：0.25） | 2 | — | 动画预览 | builtin |
| `mo.easing` | 缓动性格 | 设计参数 / 全局 | 单选 | 跟随（兜底：easeOut） | 2 | — | 动画预览 | builtin |
| `mo.textReveal` | 文字出现 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：instant） | 2 | — | 动画预览 | builtin |
| `mo.idle` | 环境待机动效 | 设计参数 / 全局 | 单选 | 跟随（兜底：none） | 3 | — | 动画预览 | builtin |
| `mo.valueChange` | 数值变化 | 设计参数 / 全局 | 单选 | 跟随（兜底：smooth） | 3 | — | 动画预览 | builtin |
| `mo.juice` | 反馈强度 | 设计参数 / 全局 | 连续 | 跟随（兜底：0.3） | 1 ★ | — | 动画预览 | builtin |
| `mo.reveal` | 揭示方式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：direct） | 3 | — | 流程演示 | builtin |
| `mo.revealTease` | 先预告稀有度 | 设计参数 / 某一屏 | 开关 | 关 | 3 | — | 流程演示 | builtin |
| `mo.reward` | 奖励演出强度 | 设计参数 / 某一屏 | 整数档位 | 跟随（兜底：1） | 3 | — | 流程演示 | builtin |
| `mo.transition` | 界面转场 | 设计参数 / 全局 | 单选 | 跟随（兜底：useEnter） | 3 | — | 流程演示 | builtin |
| `mo.frameRate` | UI 动画帧率 | 设计参数 / 全局 | 单选 | 跟随（兜底：smooth） | 3 | — | 动画预览 | builtin |

#### `mo.enter` 入场动效

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：cut） · 分层：tier 2 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

实现：动画预览：面板 / 界面入场关键帧（时间轴可拖）。Godot：Tween 或 AnimationPlayer（position / scale / modulate / 着色器参数）

白话：面板怎么出现：直接出现、淡入、滑进来、弹出来、砸下来、展开…… 看哪里：打开面板那一瞬间（看逐帧条带）。

v2（R1）：v1 mo.panelIn 改名，并承担全屏界面的入场（v1 mo.transition 里与它重复的翻书、推移、斜切删掉）。

吸收的观察轴 / 旧维度：M1（入场部分）、N:出现方式、N:入场动势（静帧推断）、N:揭示手法/转场

- `cut` **硬切**：直接出现，没有过渡（参考：Control、swiss 皮肤）
- `fade` **淡入**：透明度渐入（参考：GRIS）
- `slide` **滑入 / 推移**：从屏幕边滑入（参考：GameUI#1511534）
- `pop` **弹出缩放（回弹）**：从小放大并略微回弹（参考：Animal Crossing、GameUI#580609）
- `slam` **砸入（放大落下 + 震）**：战斗提示、胜负大字（参考：GameUI#564134、Disc Jam s415880_3）
- `unroll` **展开（卷轴）**：像卷轴一样展开（参考：GameUI#534875、GameUI#580667）
- `pageTurn` **翻页 / 开书**：像书一样翻开（参考：GameUI#217633）
- `boot` **扫描开机**：扫描线逐行亮起（参考：scifi 皮肤、XCOM 2）
- `glitchIn` **故障闪现**：错位闪烁后稳定（参考：GameUI#559158） 〔Godot：着色器〕
- `inkSpread` **墨晕 / 笔刷擦出**：墨迹晕开或笔刷擦出（参考：Ōkami、GameUI#132864#1） 〔Godot：着色器〕
- `slashIn` **斜切划入 / 遮罩擦除**：斜向切入（参考：Persona 5、GameUI#600487）

#### `mo.duration` 动效时长

设计参数 · 范围：全局 · 类型：连续 0–1.2 s（步长 0.05） · 默认：跟随（兜底：0.25） · 分层：tier 2 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

随机区间：0.15–0.5

实现：动画预览。Godot：Tween 时长

白话：动一次要多久。 看哪里：逐帧条带上动画占了几格。 两端：0：瞬间 ↔ 1.2s：很慢的演出。

Persona 5 早期 UI 动画太多盖住画面，后来减弱（06 文档 [47]）；与 a11y.reduceMotion 联动。

#### `mo.easing` 缓动性格

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：easeOut） · 分层：tier 2 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

实现：动画预览：旁边画出缓动曲线小图。Godot：Tween.TransitionType / EaseType

白话：动起来的手感：匀速、先快后慢、冲过头再弹回、像弹簧。 看哪里：缓动曲线小图和动画结尾那一下。

v2（R1）：删"阶跃（抽帧）"，那就是 mo.frameRate 一拍二 / 一拍三。

- `linear` **线性**：匀速，机械感
- `easeOut` **缓出**：现代 UI 默认（参考：Material）
- `overshoot` **回弹**：可爱、弹性（参考：cozy 皮肤、Animal Crossing）
- `spring` **弹簧**：物理感（参考：Hearthstone）

#### `mo.textReveal` 文字出现

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：instant） · 分层：tier 2 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

实现：动画预览。Godot：Label / RichTextLabel.visible_ratio 动画

白话：文字怎么出现：一下全出、打字机逐字、淡入、逐行、乱码解码。 看哪里：对话框里刚出来的字。

- `instant` **立即**：文字一次全部出现
- `typewriter` **打字机逐字**：逐字打出（参考：Stardew Valley、JRPG）
- `fade` **淡入**：整段淡入
- `lineByLine` **逐行**：一行一行出现（参考：GameUI#564124）
- `scramble` **乱码解码**：先乱码再解码成正文（参考：Cyberpunk 2077、Detroit）

#### `mo.idle` 环境待机动效

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 3 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

可覆盖：@el.<元素>

实现：动画预览：没有交互时 UI 自己的小动作。Godot：AnimationPlayer 循环

v2（R1）：只留环境待机。"脉冲"分到用途：可领提示的脉冲归 st.newCue = glowPulse，引导的脉冲归 el.guide.form = ring；"呼吸闪烁（点击屏幕开始）"归 ix.continueCue。逐元素覆盖写 mo.idle@el.<元素>（取代 v1 elx.motion）。

- `none` **无**：静止不动
- `shine` **光效扫过**：金框、镀铬（参考：GameUI#1767146、y2k 皮肤）
- `float` **粒子漂浮**：粒子缓慢漂浮（参考：GameUI#573380）
- `sway` **轻摇**：轻微左右摇摆（参考：cozy 皮肤）

#### `mo.valueChange` 数值变化

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：smooth） · 分层：tier 3 · 页签：④动效与交互 · 展示：事件触发 · 里程碑：M5b

可覆盖：@el.<元素>

实现：动画预览：掉血、回血、加钱的过渡（事件按钮触发）。Godot：TextureProgressBar 两层（实值 + 延迟值）+ Tween

逐元素覆盖写 mo.valueChange@el.<元素>（v1 elx.motion 里的"数字滚动"与这里重复，已删）。

- `instant` **瞬变**：数值直接跳到新值
- `smooth` **平滑**：数值平滑过渡
- `trail` **延迟拖尾**：先掉一截白条再追上（参考：BlazBlue s702890_1、Elden Ring）
- `segment` **分段跳**：一格一格地掉或涨（参考：Hades）
- `countUp` **数字滚动**：结算金币（参考：GameUI#596128）

#### `mo.juice` 反馈强度

设计参数 · 范围：全局 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：0.3） · 分层：tier 1（第一屏大旋钮） · 页签：④动效与交互 · 展示：事件触发 · 里程碑：M5b

可覆盖：@el.<元素> · 随机区间：0.1–0.8

实现：动画预览：按钮压下、震屏、闪白、数字弹跳的总强度。Godot：统一的 juice 系数乘到各 Tween 幅度

白话：操作的反馈有多夸张：按按钮、打中、拿到东西时的震动、弹跳、闪光。 看哪里：点一下按钮、受一次击（用事件按钮触发）。 两端：0：冷静（Mini Metro） ↔ 1：夸张（Hi-Fi Rush、DBFZ）。

#### `mo.reveal` 揭示方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：direct） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：结果阶段怎么把东西"给"出来。Godot：AnimationPlayer 序列 + GPUParticles2D

v2（R1）：删"光柱降临"（= ast.fx = pillar + mo.reward = 3）；"卡背预告稀有度"改成开关 mo.revealTease（它能和翻牌、开箱同时成立）。

吸收的观察轴 / 旧维度：N:揭示方式、N:揭示演出、N:单卡揭示形态、N:抽奖机制隐喻（动作部分）

- `direct` **直接显示**：直接显示结果（参考：GameUI#594354）
- `flip` **翻牌**：卡背朝上，逐张或一起翻开（参考：GameUI#592087、GameUI#214059）
- `chest` **开箱**：宝箱打开后物品飞出（参考：GameUI#596114、Hearthstone（开包））
- `unfold` **卷轴 / 破解展开**：卷轴或封印展开后露出（参考：GameUI#600483）
- `flyIn` **逐个飞入**：奖励一个接一个飞入格子（参考：GameUI#1463172）
- `spin` **转动停靠**：转盘、老虎机（参考：GameUI#604670、GameUI#535036）
- `capture` **场景内捕捉**：在场景里捕捉，捕捉环收拢（参考：GameUI#1698122）

#### `mo.revealTease` 先预告稀有度

设计参数 · 范围：某一屏 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：揭示前先让卡背 / 箱子发出稀有度颜色的光。Godot：AnimationPlayer 轨道

v2 新增（R1），取代 v1 mo.reveal = rarityTease。参考 GameUI#556611。

吸收的观察轴 / 旧维度：N:翻前稀有度预告、N:翻牌前稀有度预告

#### `mo.reward` 奖励演出强度

设计参数 · 范围：某一屏 · 类型：整数档位 0–3（步长 1） · 默认：跟随（兜底：1） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：结果阶段的演出规格。Godot：分级的 AnimationPlayer 动画

0 无（失败页 GameUI#592053）、1 低（GameUI#572350）、2 中（GameUI#556697）、3 高（全屏光柱 / SSR 大字 GameUI#580662）。默认随稀有度派生（D-rarity-show）。

吸收的观察轴 / 旧维度：B2、N:提示强度分级、N:演出阶段

#### `mo.transition` 界面转场

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：useEnter） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：两屏之间怎么换（跨屏特有的几种）。Godot：SceneTree 切换 + 全屏 ColorRect 着色器过渡

v2（R1）：只留跨屏特有的；其余（推移、翻书、斜切擦除）用新界面的 mo.enter（容器为全屏时）。

- `useEnter` **用新界面的入场动效**：新界面用自己的入场动效进来，不另做转场
- `crossfade` **交叉淡化**：两屏交叉淡化
- `zoomInto` **镜头推进到物件**：菜单就在世界里时（参考：Hearthstone（推进木箱）、MGSV iDroid）
- `iris` **光圈收缩**：圆形光圈收缩再张开（参考：复古动画惯例）

#### `mo.frameRate` UI 动画帧率

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：smooth） · 分层：tier 3 · 页签：④动效与交互 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

实现：动画预览：离散帧插值。Godot：Tween 步进或 AnimationPlayer 离散插值

默认跟随画面 motion.frameRate（D-frame）。也承担 v1 mo.easing = stepped。

- `smooth` **流畅**：每帧都更新
- `onTwos` **一拍二（12fps）**：每两帧更新一次，手绘顿挫（参考：Hi-Fi Rush）
- `onThrees` **一拍三（8fps）**：每三帧更新一次，定格感（参考：定格动画游戏）

### 2.11 交互与输入（`ix.*`）

**玩家怎么操作这一屏、怎么关掉它？** 交互模式、确认、关闭方式、继续、焦点、按下反馈、按键提示、触控尺寸、跳过、引导强制度。"本屏怎么结束"只由 ix.dismiss 决定，阻断性由它推出。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `ix.mode` | 主交互模式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：singleCTA） | 2 | — | 流程演示 | builtin |
| `ix.confirm` | 确认机制 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：instant） | 3 | — | 流程演示 | builtin |
| `ix.dismiss` | 本屏怎么结束 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：button） | 2 | — | 流程演示 | builtin |
| `ix.close` | 关闭控件 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：xTopRight） | 3 | ix.dismiss ∈ {button, key} | 画布 | builtin |
| `ix.continueCue` | 继续提示 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 3 | ix.dismiss ∈ {tapAnywhere, key, timed} | 画布 + 动画预览 | builtin |
| `ix.blocking` | 阻断性 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 3 | 由 ix.dismiss 推出 | 流程演示 | builtin |
| `ix.focus` | 导航焦点表现 | 设计参数 / 全局 | 单选 | 跟随（兜底：outline） | 2 | — | 画布 | builtin |
| `ix.press` | 按下反馈 | 设计参数 / 全局 | 单选 | 跟随（兜底：darken） | 2 | — | 动画预览 | builtin |
| `ix.glyphs` | 按键提示图标集 | 设计参数 / 全局 | 单选 | 跟随（兜底：keycap） | 3 | — | 画布 | builtin |
| `ix.touchSize` | 触控尺寸 | 设计参数 / 全局 | 连续 | 跟随（兜底：64） | 3 | ctx.input = touch | 工具侧 | builtin |
| `ix.skip` | 跳过 / 快进 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 3 | — | 画布 | builtin |
| `ix.skipAnchor` | 跳过按钮位置 | 设计参数 / 某一屏 | 单选 | 右上 | 3 | ix.skip ≠ none | 画布 | builtin |
| `ix.guideForce` | 引导强制度 | 设计参数 / 某一屏 | 单选 | 无引导 | 3 | — | 流程演示 | builtin |

#### `ix.mode` 主交互模式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：singleCTA） · 分层：tier 2 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：在探索台里能真的点 / 拖（键鼠模拟触屏）。Godot：Control 的 gui_input；拖拽用 _get_drag_data / _drop_data

白话：玩家主要怎么操作这一屏：只看、点一个按钮、几个按钮里选、选条目、拖拽、拉滑条、自由摆放、打字、看准时机按。 看哪里：交互注释层上的手势图标。

v2（R1）：删"点击任意处继续"（= ix.dismiss = tapAnywhere）；列表选择、网格点选合并为 select（只差排布）；轮盘删掉（= lay.arrangement = ring，摇杆 / 鼠标方向由 ctx.input 推出）；滑动翻页删掉（= lay.overflow = paged + 触屏）。"只读"也承担 v1 ctx.input = none（过场、标题循环）。

吸收的观察轴 / 旧维度：I2、N:放置交互、N:内嵌小游戏条、N:UI即玩法

- `readOnly` **只读**：只看不操作：过场、标题循环、公告（参考：GameUI#943688、GameUI#573380）
- `singleCTA` **单一主按钮**：只有一个主按钮（参考：GameUI#594209、GameUI#604614）
- `multiButton` **多按钮**：多个并列按钮（参考：GameUI#556592）
- `select` **选择条目**：在列表 / 网格 / 环里选一个（参考：GameUI#723824、GameUI#1743976）
- `drag` **拖拽**：布阵、出牌、背包（参考：GameUI#592060、Slay the Spire 2、Path of Exile s238960_2）
- `slider` **滑条调值**：拖动滑条调数值（参考：GameUI#594211）
- `freePlace` **自由放置**：建造（参考：GameUI#518081、Planet Zoo）
- `textInput` **文本输入**：起名、聊天（参考：GameUI#556119）
- `timing` **时机操作**：钓鱼条、节奏（参考：Graveyard Keeper s599140_4、DJMAX s960170_1）

#### `ix.confirm` 确认机制

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：instant） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示。Godot：确认态状态机；长按用 Timer

约束：二次确认弹窗自身（cnt.subtype = confirm）不能再要求二次确认。"幽灵预览"也承担 v1 el.interact.form = ghost。

吸收的观察轴 / 旧维度：N:确认机制、N:购买确认流程、N:确认动作隐喻

- `instant` **即点即生效**：点一下立即生效（参考：GameUI#646837）
- `selectConfirm` **选中 + 确认按钮**：先选中，再点确认按钮（参考：GameUI#504383）
- `double` **二次确认弹窗**：再弹一个确认窗（参考：GameUI#594215）
- `hold` **长按确认**：按手印、指纹（参考：GameUI#496232）
- `ghost` **幽灵预览 + ✓ / ✕**：建造、摆放（参考：GameUI#518081、Carcassonne s598810_2）

#### `ix.dismiss` 本屏怎么结束

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：button） · 分层：tier 2 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：这一屏靠什么关掉 / 推进。Godot：Button + ui_cancel 动作；Popup 的 popup_hide；Timer 自动关

白话：这一屏怎么关：点按钮、点外面、点哪都行、按返回键、自己消失，还是不让关。 看哪里：关闭按钮或"点击继续"提示在哪；能不能点外面关。

v2 新增主参数（R1）：v1 里"点空白关闭""自动消失""强制"分散在 ix.mode / ix.close / ix.blocking / ix.continueCue / 版式原型里各写一遍。阻断性 ix.blocking 由它推出：自动消失 → 非阻断，点空白 / 点任意处 → 半阻断，按钮 / 按键 → 模态，强制 → 强制流程。

吸收的观察轴 / 旧维度：N:关闭与确认、N:关闭方式、N:关闭/返回方式、N:继续/关闭方式、N:阻断性、N:阻塞性

- `button` **点关闭 / 确认按钮**：关闭控件的样子见 ix.close（参考：GameUI#572305、GameUI#594215）
- `tapOutside` **点空白处关闭**：点面板外的空白处关闭（参考：GameUI#603729）
- `tapAnywhere` **点任意处继续**：点屏幕任何地方继续 / 关闭（参考：GameUI#580609、GameUI#1079008）
- `key` **按键返回（Esc / B）**：主机菜单只有按键提示（参考：GameUI#545545）
- `timed` **自动消失**：显示一段时间后自己消失（R1 写作 auto，与"跟随预设"的 auto 重名，改名 timed）（参考：GameUI#572354、GameUI#1663800）
- `forced` **不可关闭**：强制流程，做完才走（参考：GameUI#604573、GameUI#584773）

#### `ix.close` 关闭控件

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：xTopRight） · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M9b

生效条件：ix.dismiss ∈ {button, key}

实现：画布：关闭控件的样子和位置。Godot：Button（Close 变体）

v2（R1）：只管控件长什么样、在哪；"点空白关闭 / 自动消失 / 不可关闭"移到 ix.dismiss。

吸收的观察轴 / 旧维度：N:关闭控件样式、N:退出控件、N:返回关闭控件、N:关闭键形态、N:关闭与不再提示

- `xTopRight` **右上 X**：面板右上角一个 X（参考：GameUI#572305）
- `xOutside` **角外悬挂红圆 X**：红色圆形 X 挂在面板角外（参考：GameUI#580656、GameUI#556096）
- `back` **左上返回箭头**：左上角返回箭头（参考：GameUI#577660）
- `cancelBtn` **底部取消按钮**：底部的取消按钮（参考：GameUI#556175）
- `keyGlyph` **按键提示（Esc / B 返回）**：只显示"Esc / B 返回"按键提示（参考：GameUI#545545）

#### `ix.continueCue` 继续提示

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M9b

生效条件：ix.dismiss ∈ {tapAnywhere, key, timed}

实现：画布 + 动画预览：提示玩家怎么继续（带呼吸闪烁）。Godot：Label + AnimationPlayer 呼吸

v1 mo.idle = breathe（"点击屏幕开始"的呼吸闪烁）并入这里。

吸收的观察轴 / 旧维度：N:继续提示、N:继续提示方式

- `none` **无**：没有继续提示
- `tapText` **"点击任意处继续"小字**：底部一行"点击任意处继续"（参考：GameUI#580609、GameUI#577669、GameUI#1079008）
- `blinkArrow` **闪烁小三角 / 叶片**：文本框角落闪烁的小三角（参考：GameUI#604577）
- `keyGlyph` **按键图标**：按键图标加"继续"（参考：Clair Obscur、GameUI#545545）
- `countdown` **倒计时**：自动消失前的倒数（参考：GameUI#596132）

#### `ix.blocking` 阻断性

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

由 `ix.dismiss` 推出（纯派生，不进控件面板）

实现：流程演示：是否吃掉其它输入（由 ix.dismiss 推出）。Godot：Control.mouse_filter；Popup 的 exclusive

v2：改为纯派生量，不进控件面板（R1）。

- `none` **非阻断**：toast、战斗大字（参考：GameUI#1663800、GameUI#572354）
- `soft` **半阻断**：点外面就关（参考：GameUI#603729）
- `modal` **模态**：必须处理（参考：GameUI#594215）
- `forced` **强制流程**：不能跳过（参考：GameUI#584773）

#### `ix.focus` 导航焦点表现

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：outline） · 分层：tier 2 · 页签：④动效与交互 · 展示：状态陈列板 · 里程碑：M10

实现：画布：手柄 / 键盘导航时光标所在项的画法。Godot：Theme 的 focus StyleBox

白话：用手柄或键盘移动时，当前停在哪一项怎么标出来。 看哪里：状态陈列板上"焦点"那一格。

v2（R1）：只管导航光标；"已选 / 已装备 / 上阵"移到 st.selected（手柄导航时"焦点在 A、装备的是 B"需要两个标记同时出现）。发光改名 focusGlow；加 R2 的毛笔笔触（选中项下垫一笔墨）。

吸收的观察轴 / 旧维度：N:聚焦指示物

- `outline` **高亮描边**：选中项加高亮描边（参考：GameUI#488711、GameUI#564162）
- `invert` **底色反白**：选中项底色反白（参考：GameUI#545736、Control）
- `scale` **放大**：选中项放大（参考：GameUI#211996）
- `cursor` **光标指示（手指 / 三角 / 括号）**：手指、三角或括号指着选中项（参考：Final Fantasy（手指）、Dragon Quest（三角））
- `focusGlow` **发光**：焦点项外发光（参考：Slay the Spire）
- `bar` **整行色条**：选中行整条着色（参考：Night Call s680380_3）
- `brushSwash` **毛笔笔触垫底**：新（R2）（参考：ui-asset-materials 5.1、Red Dead Redemption 2） 〔需素材〕

#### `ix.press` 按下反馈

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：darken） · 分层：tier 2 · 页签：④动效与交互 · 展示：状态陈列板 · 里程碑：M5b

实现：动画预览：按钮四态。Godot：Button 的 pressed StyleBox + Tween

白话：按下按钮那一下的反应。 看哪里：状态陈列板上"按下"那一格。

- `none` **无**：按下没有变化
- `sink` **下沉到阴影**：按钮下沉到阴影位置（参考：neobrutal 皮肤）
- `darken` **变暗**：按下变暗
- `squash` **缩小回弹**：按下缩小再弹回（参考：cozy 皮肤）
- `ripple` **波纹**：点击处扩散波纹（参考：Material）
- `flash` **闪光**：按下闪一下光（参考：GameUI#1767146）

#### `ix.glyphs` 按键提示图标集

设计参数 · 范围：全局 · 类型：单选 · 默认：跟随（兜底：keycap） · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M10 · 现状：部分实现

实现：画布：SkinTokens.key（brackets 已支持）+ 图标集。Godot：按 InputEvent 设备切换 AtlasTexture

默认由 ctx.input 派生（D-input，适配类）。

- `keycap` **键盘键帽**：键盘键帽图标（参考：Party Hard s356570_0）
- `xbox` **Xbox**：Xbox 手柄按键图标 〔需素材〕
- `playstation` **PlayStation**：PlayStation 手柄按键图标 〔需素材〕
- `nintendo` **Nintendo**：Nintendo 手柄按键图标 〔需素材〕
- `touch` **触屏图标**：手指、点按等触屏图标（参考：GameUI#126496）
- `text` **文字（"按 E"）**：直接写"按 E"（参考：GameUI#594218）
- `brackets` **括号文字 [E]**：方括号文字 [E]（参考：terminal 皮肤）

#### `ix.touchSize` 触控尺寸

设计参数 · 范围：全局 · 类型：连续 32–96 px（步长 2） · 默认：跟随（兜底：64） · 分层：tier 3 · 页签：④动效与交互 · 展示：文案 / 设备外框 · 里程碑：M10 · 不参与随机

生效条件：ctx.input = touch

实现：工具侧：检查可点区域 ≥ 设定值；画布：按此放大触屏按钮。Godot：Control.custom_minimum_size

默认由设备派生：手机 ≥ 44pt（约 88px@2x）。

#### `ix.skip` 跳过 / 快进

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：画布。Godot：Button + 长按 Timer

v2：位置拆到 ix.skipAnchor（R1 的"画法里不写位置"原则）。

吸收的观察轴 / 旧维度：N:推进与跳过、N:辅助控制钮

- `none` **不可跳过**：不能跳过
- `button` **跳过按钮**：一个"跳过"按钮（位置见 ix.skipAnchor）（参考：GameUI#559090、GameUI#585162）
- `hold` **长按跳过**：按住一段时间才跳过，防误触（参考：经验值）
- `vnControls` **自动 / 快进 / 日志一组**：视觉小说（参考：GameUI#577640、GameUI#572331）

#### `ix.skipAnchor` 跳过按钮位置

设计参数 · 范围：某一屏 · 类型：单选 · 默认：右上 · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M9b

生效条件：ix.skip ≠ none

实现：画布：跳过控件锚点。Godot：Control.anchors_preset

- `tr` **右上**：右上角（参考：GameUI#559090）
- `br` **右下**：右下角（参考：GameUI#585162）
- `bl` **左下**：左下角

#### `ix.guideForce` 引导强制度

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无引导 · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示：在真实界面上叠引导层。Godot：全屏 Control 拦截输入，只放行目标区域

v2（R1）：只留强制程度。"对话推进"是引导载体（= el.guide.form = npcBubble + cnt.companion），"自由探索 + 任务清单"= el.objective.form = checklist。

吸收的观察轴 / 旧维度：N:引导强制度、N:教学载体

- `none` **无引导**：没有引导
- `soft` **软提示（可忽略）**：只给提示，玩家可以不理（参考：GameUI#594218、GameUI#1511384）
- `forced` **强制点击高亮目标**：只能点高亮的目标，其它都被拦住（参考：GameUI#584773）

### 2.12 流程与界面场景（`flow.*`）

**界面之间怎么进、怎么叠、什么一直都在？** 属于 UX 流程，在探索台用"流程分镜条 + 交互注释层"展示，并可一键演示（chk.demo）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `flow.entry` | 进入方式 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：hotkey） | 3 | — | 流程演示 | builtin |
| `flow.stacking` | 叠层表现 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：replace） | 3 | — | 流程演示 | builtin |
| `flow.depth` | 弹窗栈深 | 设计参数 / 某一屏 | 整数档位 | 1 | 3 | — | 流程演示 | builtin |
| `flow.chrome` | 跨界面常驻层 | 设计参数 / 全局 | 多选 | （空） | 3 | — | 画布 | builtin |
| `flow.navPersistent` | 分区导航跨屏常驻 | 设计参数 / 全局 | 开关 | 关 | 3 | — | 画布 | builtin |

#### `flow.entry` 进入方式

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：hotkey） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示。Godot：InputMap 动作 / Area3D 触发 / 计时弹出

吸收的观察轴 / 旧维度：N:触发语境、N:触发情境、N:暂停时世界状态（进入部分）

- `hotkey` **按键呼出**：背包 I、地图 M（参考：Witcher 3、Elden Ring）
- `tapEntry` **点入口图标**：手游主界面（参考：GameUI#646877）
- `worldInteract` **世界内交互**：走到书桌、NPC、存档点（参考：Hades（镜子）、Elden Ring（赐福）、Hollow Knight（长椅））
- `autoPopup` **自动弹出**：拍脸、登录公告（参考：GameUI#1767145、GameUI#558742）
- `sequence` **流程强制**：登录 → 公告 → 选服 → 创角（参考：GameUI 热门游戏前 6 张）
- `event` **事件触发**：升级、获得、解锁（参考：GameUI#580609、GameUI#600488）

#### `flow.stacking` 叠层表现

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：replace） · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示。Godot：CanvasLayer.layer 与 modulate

v2（R1）：删"下层压暗"（= rel.dim 作用在下层 UI 上）与"二级窗在侧"（= lay.detail = persistent）。

吸收的观察轴 / 旧维度：N:弹窗层级

- `replace` **替换上一屏**：新界面完全替换旧界面
- `stack` **叠在上面**：下层照常保留（压不压暗由 rel.dim 决定）（参考：GameUI#625064）
- `pushBack` **下层缩小后退**：旧界面缩小后退（参考：iOS 式）

#### `flow.depth` 弹窗栈深

设计参数 · 范围：某一屏 · 类型：整数档位 1–4（步长 1） · 默认：1 · 分层：tier 3 · 页签：④动效与交互 · 展示：流程分镜 · 里程碑：M9b

实现：流程演示。Godot：弹窗栈

v2 改名（R1：避免与分类级数、视觉层级、信息优先级同叫"层级"）。玩家信息一级总览 + 二级选头像（GameUI#625063 / 625064）。

#### `flow.chrome` 跨界面常驻层

设计参数 · 范围：全局 · 类型：多选 · 默认：（空） · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M9b

多选合并：并集

实现：画布：所有界面都保留的骨架。Godot：Autoload 单例里的 CanvasLayer

v2：删"底部全局导航"（= flow.navPersistent）。聊天跑马灯只在这里（v1 el.chat.form = ticker 删掉）。

吸收的观察轴 / 旧维度：N:全局常驻栏、N:资源栏形态（常驻部分）

- `topCurrency` **顶栏货币**：每个界面顶部都有货币栏（参考：GameUI#1743963、Slay the Spire 2 s2868840_0）
- `chatTicker` **聊天跑马灯**：一行聊天跑马灯常驻（参考：GameUI#215360）
- `backHome` **返回 + 主页按钮**：返回与回主页按钮常驻（参考：GameUI#577660）

#### `flow.navPersistent` 分区导航跨屏常驻

设计参数 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：④动效与交互 · 展示：静帧 · 里程碑：M9b

实现：画布：lay.nav 给出的页签在切换界面时一直保留。Godot：Autoload 里的 TabBar

v2 新增（R1），取代 v1 flow.chrome = globalNav。参考 GameUI#646877。

### 2.13 组件形态（控件库的结构）（`cmp.*`）

**按钮、页签、格子、条、对话框这些通用控件由哪几块组成？** M5 控件库里通用组件的"结构"。视觉语言（vis / col / typ / ast）给质感，这里给构成；两者相乘就是一个具体控件。全局默认，可逐屏覆盖；外轮廓统一用 vis.silhouette@<组件>。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `cmp.button` | 按钮内容 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：text） | 2 | — | 画布 | builtin |
| `cmp.buttonBox` | 按钮有底框 | 设计参数 / 全局，可逐屏覆盖 | 开关 | 开 | 3 | — | 画布 | builtin |
| `cmp.tab` | 页签内容 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：text） | 3 | — | 画布 | builtin |
| `cmp.tabIndicator` | 页签选中指示 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：underline） | 3 | — | 画布 | builtin |
| `cmp.listRow` | 列表行字段 | 设计参数 / 全局，可逐屏覆盖 | 多选 | 跟随（兜底：icon、title） | 3 | — | 画布 | builtin |
| `cmp.slot` | 格子结构 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：cell） | 2 | — | 画布 | builtin |
| `cmp.card` | 卡牌版式 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：tcg） | 3 | — | 画布 + 素材 | builtin |
| `cmp.badge` | 徽章设计 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：medal） | 3 | — | 素材 / 画布 | builtin |
| `cmp.gauge` | 数值图形 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：bar） | 2 | — | 画布 | builtin |
| `cmp.plate` | 标牌 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 无（直压） | 2 | — | 素材 / 画布 | builtin |
| `cmp.dialogBox` | 对话框结构 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：bar） | 2 | — | 画布 | builtin |
| `cmp.modal` | 弹窗结构 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：standard） | 3 | lay.container = modal | 画布 | builtin |
| `cmp.quantity` | 数量控件 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：slider） | 3 | — | 画布 | builtin |
| `cmp.optionBool` | 设置项：开关类 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：switch） | 3 | — | 画布 | builtin |
| `cmp.optionEnum` | 设置项：多选一 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：segmented） | 3 | — | 画布 | builtin |
| `cmp.optionRange` | 设置项：数值 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：slider） | 3 | — | 画布 | builtin |
| `cmp.bindingMap` | 按键绑定呈现 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 动作 → 键位列表 | 3 | — | 画布 | builtin |
| `cmp.input` | 输入框形态 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：roundWhite） | 3 | — | 画布 | builtin |
| `cmp.node` | 节点形态 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：circleNumber） | 3 | — | 画布 | builtin |

#### `cmp.button` 按钮内容

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：text） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M5a

实现：画布：按钮四态 + 内容。Godot：Button（icon + text）

白话：按钮上是文字、图标，还是图标加文字。 看哪里：状态陈列板上按钮的常态 / 悬停 / 按下 / 禁用。

v2（R1）：只留"里面放什么"，有没有底框是 cmp.buttonBox。"物件化（木牌、缎带）"= ast.frame@button + vis.silhouette@button = ribbon；"内嵌价格"删掉（价格由 el.cost.form = inButton 决定）。

吸收的观察轴 / 旧维度：N:菜单项形态、N:主行动按钮形态、N:条目操作样式、N:申请按钮样式

- `text` **文字**：选中时反白或加下划线（参考：GameUI#573374、Control）
- `icon` **图标**：只有图标的圆钮或方钮（参考：Frostpunk s323190_2、GameUI#179626）
- `iconText` **图标 + 文字**：图标 + 文字（参考：GameUI#596117、GameUI#594209）

#### `cmp.buttonBox` 按钮有底框

设计参数 · 范围：全局，可逐屏覆盖 · 类型：开关 · 默认：开 · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a

实现：画布：按钮是否画底框（纯文字菜单就是关）。Godot：Button.flat

v2 新增（R1）。参考：纯文字菜单 Castle Crashers s204360_0、GameUI#545736。

#### `cmp.tab` 页签内容

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：text） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：TabBar 的 tab_selected / tab_unselected StyleBox

v2（R1）：只留内容；选中指示另立 cmp.tabIndicator；外形用 vis.silhouette@tab 与 vis.skew@tab（v1 的菱形、斜切六角）；木牌页签 = ast.frameMat@tab = wood。

吸收的观察轴 / 旧维度：N:页签外形、N:频道切换位置（形态部分）

- `text` **文字**：纯文字页签（参考：GameUI#604661）
- `icon` **图标**：图标页签（参考：GameUI#572458）
- `iconText` **图标 + 文字**：图标 + 文字（参考：GameUI#556146）
- `avatar` **头像页签**：用角色头像当页签（参考：GameUI#580653）

#### `cmp.tabIndicator` 页签选中指示

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：underline） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M5a

实现：画布。Godot：TabBar 的 tab_selected StyleBox

- `underline` **下划线**：选中项下面一条线（参考：swiss 皮肤、Control）
- `filled` **实心填充**：选中页签整块填色（参考：GameUI#604661）
- `raised` **凸起 / 前移**：选中页签更高或压在面板上（参考：GameUI#534801#1、GameUI#556146）

#### `cmp.listRow` 列表行字段

设计参数 · 范围：全局，可逐屏覆盖 · 类型：多选 · 默认：跟随（兜底：icon、title） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布：一行里放哪些字段（表格的字段数也由它推出）。Godot：HBoxContainer 行模板

"五件套任务行" = 图标 + 标题 + 进度 + 奖励 + 按钮（GameUI#1743964）。行内按钮也承担 v1 el.cta.form = inline（每行一个）。

吸收的观察轴 / 旧维度：N:任务行结构、N:条目行结构、N:列表行结构、N:榜单行结构、N:消息行元素、N:行主体、N:服务器条目形态

- `icon` **图标 / 头像**：行首的图标或头像
- `title` **标题**：条目名
- `desc` **说明**：一行说明文字
- `progress` **进度**：行内进度条或 x/y
- `value` **数值 / 战力**：右侧的关键数字
- `reward` **奖励图标**：完成可得的奖励
- `action` **行内按钮**：领取、前往、加好友
- `status` **状态标记**：在线、已完成、推荐
- `time` **时间**："3 小时前"、倒计时

#### `cmp.slot` 格子结构

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：cell） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：Panel + StyleBox；物品图标 TextureRect

白话：物品格是方格、竖卡、横卡，还是不画格子直接摆。 看哪里：背包和商店里的格子。

v2（R1）：只留结构；圆、方、六边这些轮廓用 vis.silhouette@slot。

吸收的观察轴 / 旧维度：N:物品格样式、N:物品格形态、N:商品陈列单位、N:商品图标容器、N:条目单元形态

- `cell` **方格**：图标 + 角标数量（参考：GameUI#1743976、GameUI#603725、Elden Ring）
- `tallCard` **竖卡**：图 + 名 + 价格竖排（参考：GameUI#1079017）
- `rowCard` **横卡行**：图标 + 名 + 说明（参考：GameUI#572458）
- `bare` **无格直接摆放**：物品直接放在货架 / 桌面上（参考：GameUI#559146、Florence（货架））

#### `cmp.card` 卡牌版式

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：tcg） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布 + 素材：卡面分区（费用、名称、插画窗、描述、稀有边）。Godot：卡牌子场景：TextureRect 插画 + NinePatchRect 卡框 + Label

卡背、卡框属于素材；横竖比例写在说明里（竖 2:3 / 横 3:2 / 方 tile / 圆）。按稀有度换色的卡框 = st.rarityCue = border。

吸收的观察轴 / 旧维度：N:卡面构成、N:卡牌牌面结构、N:卡牌形态、N:卡牌取向/比例、N:卡牌规则角标、N:卡背设计

- `fullArt` **整幅立绘 + 少字**：二次元角色卡（参考：GameUI#572456） 〔需素材〕
- `tcg` **插画窗 + 费用角标 + 文本框**：左上费用、中间插画窗、下方文本框的集换式卡牌（参考：Slay the Spire 2 s2868840_0、GWENT s1284410_0、Minion Masters s489520_0）
- `statCard` **名牌 + 属性表**：名字条 + 属性数值表（参考：GameUI#572416）
- `playerCard` **球员卡**：评分 + 位置（参考：GameUI#575947）
- `iconCard` **仅图标 / 问号**：只有图标或问号的小卡（参考：GameUI#214952）
- `tile` **方形瓦片**：方形地块瓦片（参考：Carcassonne s598810_2）

#### `cmp.badge` 徽章设计

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：medal） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M11

实现：素材 / 画布：徽章的图形设计（外轮廓见 vis.silhouette@badge）。Godot：TextureRect（底座 + 符号两层）

v2（R1）：删盾、六边形、三角（轮廓归 vis.silhouette@badge），只留图形设计；加 R2 的军衔 V 形章。

吸收的观察轴 / 旧维度：N:勋章造型、N:段位徽章造型、N:徽记形态、N:公会徽章、N:等级/星级徽记、N:VIP 等级徽章标识

- `medal` **圆章 + 星**：圆形奖章 + 星（参考：GameUI#556154、GameUI#600483）
- `trophy` **奖杯**：奖杯形（参考：GameUI#545679） 〔需素材〕
- `winged` **交叉兵器 + 翼**：交叉兵器加双翼（参考：GameUI#503227） 〔需素材〕
- `laurel` **桂冠**：桂冠环绕（参考：GameUI#549939） 〔需素材〕
- `crest` **纹章**：纹章（盾面 + 符号）（参考：GameUI#594260、GameUI#575878） 〔需素材〕
- `stamp` **印章**：印章式（参考：GameUI#572499）
- `crystal` **晶体 / 星芒**：六角晶体或星芒（参考：GameUI#534875、GameUI#1707359）
- `chevron` **军衔 V 形章**：新（R2）（参考：XCOM 2（士兵页））

#### `cmp.gauge` 数值图形

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：bar） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a · 现状：部分实现

可覆盖：@el.<元素> / @progress

实现：画布：SkinTokens.bar（已有横条）+ 待加：分段、弧、环、液体球、图标列、表盘、温度计、眼睛、双向条、节点轨道。Godot：TextureProgressBar（fill_mode：左右 / 顺时针环 / 自下而上 / 双向）

白话：数值怎么画：横条、细条、分段格、圆环、液体球、一排心、纯数字、表盘…… 看哪里：血条、能量条、进度条。

v2（R1）：唯一的"数值图形"词表——v1 的 st.progress、el.vitals.form、el.speed.form、el.timer.form 的环 / 大数字、el.loading.form 的细线 / 胶囊、el.resources.form 的能量条都并到这里（Godot 端都是同一个 TextureProgressBar）。"进度"是一个角色：cmp.gauge@progress 是进度条的默认，逐元素写 cmp.gauge@el.vitals 等（R2：Overwatch 分段血条 + 大招圆环、Frostpunk 表盘 + 横条同屏）。数字叠在条上见 elx.valueLabel。滑条 = 仪表 × 转角 × 描边，不单设参数。

吸收的观察轴 / 旧维度：N:仪表形态、N:数值载体隐喻、N:血量挂载点（形态部分）、N:滑条造型（与 vis 相乘）、N:进度表达、N:进度条位置与长度、N:等级表达、N:收集进度表达、N:容量/负重表达、N:总进度/里程碑、N:累充进度表达、N:加载指示器形态（部分）

- `bar` **横条**：横向长条（参考：Witcher 3、GameUI#1009418、GameUI#1743964）
- `thinBar` **细条**：很细的长条（参考：Elden Ring、Control、GameUI#943691）
- `segmented` **分段格**：分成一格一格的条（参考：Hades、Overwatch、GameUI#584779）
- `arc` **弧形**：弧形条（参考：NFS Heat（速度表））
- `ring` **圆环**：圆环（参考：Overwatch（大招）、GameUI#545569）
- `orb` **液体球**：装着液体的圆球，液面高度表示余量（参考：Torchlight II s200710_0、Path of Exile s238960_0）
- `vertical` **竖条**：竖向的条（参考：s2062430_1（剑形竖条））
- `icons` **图标列（心 / 面具）**：一排图标（心、面具），少一个表示掉一格（参考：Hollow Knight s367520_0、ARMO s805590_0）
- `number` **纯数字**：只显示数字（参考：Binding of Isaac、Frostpunk（天数））
- `dial` **表盘指针**：带指针的表盘（参考：The Crew s2698940_0、Frostpunk（温度））
- `thermometer` **温度计**：新（R2）（参考：Frostpunk）
- `eye` **眼睛 / 发现度**：潜行警戒（新，R2）（参考：Hitman、Assassin's Creed）
- `bipolar` **双向对立条**：希望 / 不满、拔河（新，R2）（参考：Frostpunk（希望 / 不满）、GameUI#575882）
- `track` **节点轨道 + 里程碑**：一条带节点和里程碑宝箱的轨道（参考：GameUI#445308、GameUI#594312）
- `fraction` **x / y 数字**：写成 x / y（参考：GameUI#604631）
- `percent` **百分比**：百分比数字（参考：GameUI#1775202）
- `stars` **星级**：1–3 颗星（参考：GameUI#1463172）
- `lightUp` **节点点亮**：完成的节点点亮（参考：GameUI#573460）

#### `cmp.plate` 标牌

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：无（直压） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M3b

可覆盖：@title / @name / @rank / @button / @stateTag

实现：素材 / 画布：垫在标题、名字、名次、按钮、状态角标下面的牌子。Godot：NinePatchRect 标题牌 + Label

白话：标题、名字下面垫的牌子：胶囊、缎带、匾额、卷轴头、印章、折扇…… 看哪里：界面标题、对话框上的名字、"已领取"角标。

v2（R1）：v1 的 typ.titleCarrier、cmp.nameplate、ast.ornaments = seal、st.rank = slashBlock、cmp.button = plaque、st.done = ribbon 合并成一个组件，按角色覆盖：cmp.plate@title / @name / @rank / @button / @stateTag。竖排侧牌会把标题设成竖排（约束）。加 R2 的折扇、燕尾旗；撕边横幅 = ribbon + vis.edge@plate = torn。

吸收的观察轴 / 旧维度：N:标题与横幅处理、N:标题承载方式、N:标题处理、N:等级数字载体（部分）、N:标题与关闭样式（标题部分）、N:说话者标识、N:说话人标识

- `none` **无（直压）**：标题直接压在画面或面板上（参考：GameUI#943717、GameUI#1009432）
- `tab` **边缘小标签条**：附在框边的名牌条（v1 对话框"框上方名牌条"）（参考：GameUI#562994）
- `pill` **胶囊**：标题放在胶囊形色条里（参考：GameUI#562993、Animal Crossing（名牌））
- `ribbon` **缎带**：标题写在一条缎带上（参考：Hearthstone、Anno 1800、GameUI#596120、Don't Starve） 〔需素材〕
- `plaque` **铭牌 / 匾额**：金属铭牌、木匾（参考：GameUI#580590、GameUI#604615） 〔需素材〕
- `scrollHead` **卷轴头 / 卷花**：标题放在卷轴头或卷花牌上（参考：GameUI#184395#2） 〔需素材〕
- `sideTab` **竖排侧牌**：会把标题设为竖排（参考：GameUI#943688）
- `slashBand` **斜切色带**：也是名次斜切色块（参考：GameUI#600487、Overwatch、GameUI#575942）
- `cloudPlate` **云形牌**：标题放在祥云形状的牌子上（参考：GameUI#572365） 〔需素材〕
- `crest` **盾徽 / 挂旗**：标题放在盾徽或挂旗上（参考：Armello、GameUI#136758#1） 〔需素材〕
- `seal` **印章**：标题旁或标题本身是一枚印章（参考：GameUI#522754、ink 皮肤）
- `fan` **折扇**：新（R2）（参考：GameUI#572353） 〔需素材〕
- `swallowtail` **燕尾旗**：新（R2）（参考：Armello） 〔需素材〕

#### `cmp.dialogBox` 对话框结构

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：bar） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a · 现状：部分实现

可覆盖：@el.<元素>

实现：画布：SkinTokens.dialog（tail 已支持）。Godot：PanelContainer + RichTextLabel；气泡尾巴用 Polygon2D

白话：对话框的结构：底部通栏、带尾气泡、无框字幕、聊天软件式、全屏文本。 看哪里：说话的那块框。

v2（R1）：只留结构。带头像 / 半身立绘的变体 = cnt.characterMedium + lay.focalSide + lay.layering；世界内悬浮 = elx.diegesis = spatial。字幕也用它（cmp.dialogBox@el.subtitle，v1 el.subtitle.form 删掉）。

吸收的观察轴 / 旧维度：N:对话容器隐喻、N:对话承载、N:对话呈现、N:叙事对话呈现、N:叙事文本呈现、N:消息呈现形态、N:对话/叙事界面形态、N:文案呈现形态

- `bar` **底部通栏**：NPC 对话绝对主流（名牌见 cmp.plate@name）（参考：GameUI#604577、GameUI#562994、Hades s1145360_1）
- `bubble` **带尾气泡**：带尾巴的气泡，指向说话的人（参考：Wandersong s530320_1、comic 皮肤）
- `bare` **无框字幕**：电影白字（参考：GameUI#1009432、Night Call s680380_1）
- `chatThread` **聊天软件式**：左右气泡 + 头像（参考：GameUI#577642、GameUI#534789）
- `fullPage` **全屏文本（NVL）**：全屏文本（视觉小说 NVL 模式）（参考：视觉小说惯例）

#### `cmp.modal` 弹窗结构

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：standard） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

生效条件：lay.container = modal

实现：画布。Godot：PopupPanel / PanelContainer

v2（R1）：只留结构。整页、底部抽屉、全宽横带由 lay.container 表达（fullscreen / sheet / banner），场景小窗由 lay.playfield = pip 表达。浮空弹窗会把弹窗底的不透明度设为 0（约束）。弹窗长得像卷轴 / 信封 / 书，由 ast.container 决定。

吸收的观察轴 / 旧维度：N:底板形态、N:弹窗边框形态（结构部分）

- `standard` **标准面板**：标准矩形弹窗（参考：GameUI#594215）
- `floating` **无框浮空**：内容直接悬在暗幕上（参考：GameUI#603729）

#### `cmp.quantity` 数量控件

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：slider） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：SpinBox / HSlider + Button

吸收的观察轴 / 旧维度：N:数量控件、N:数量选择控件、N:数量控件形态、N:批量操作控件

- `slider` **滑条 + 加减 + MAX**：滑条，两端加减号与最大值按钮（参考：GameUI#596116）
- `stepper` **步进器**：减号、数字、加号（参考：GameUI#575918）
- `input` **输入框**：直接输入数字（参考：GameUI#580676）

#### `cmp.optionBool` 设置项：开关类

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：switch） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：CheckButton / CheckBox

v2（R2）：v1 的 cmp.option 是单选，一页设置里混用滑条、开关、分段写不出来（GameUI#1511531），按数据类型拆成三个。

吸收的观察轴 / 旧维度：N:控件类型、N:设置控件类型

- `switch` **开关**：左右滑动的开关（参考：GameUI#585167）
- `checkbox` **勾选框**：方形勾选框（参考：GameUI#1463184）
- `segmented` **分段（开 / 关）**：几段按钮选其一（开 / 关、低 / 中 / 高）（参考：GameUI#594277）
- `arrows` **左右切换 ◁ ▷**：两侧箭头切换取值（参考：Hollow Knight s367520_5）

#### `cmp.optionEnum` 设置项：多选一

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：segmented） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：OptionButton / ButtonGroup

- `segmented` **分段按钮**：几段按钮选其一（开 / 关、低 / 中 / 高）（参考：GameUI#594277）
- `dropdown` **下拉**：点开的下拉列表（参考：GameUI#577664）
- `arrows` **左右切换 ◁ ▷**：两侧箭头切换取值（参考：Hollow Knight s367520_5）
- `radio` **单选点**：● YES ○ CANCEL（参考：GameUI#545727）
- `thumbnails` **缩略图**：画质、角色外观用小图选（参考：GameUI#594278）

#### `cmp.optionRange` 设置项：数值

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：slider） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：HSlider / SpinBox

- `slider` **滑条**：滑条，两端加减号与最大值按钮（参考：GameUI#1511531）
- `stepper` **步进器**：减号、数字、加号（参考：GameUI#575918）
- `segmentedBar` **分格条**：音量 10 格（参考：Hollow Knight s367520_5）
- `arrows` **左右切换数字**：两侧箭头切换取值

#### `cmp.bindingMap` 按键绑定呈现

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：动作 → 键位列表 · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M10

实现：画布：按键绑定页怎么画。Godot：列表：Tree / VBox；示意图：TextureRect + Line2D 引线

v2 新增（R2：键盘 / 手柄示意图写不出来，GameUI#573377）。

- `list` **动作 → 键位列表**：动作名 + 键位按钮的列表（参考：Hollow Knight s367520_5）
- `keyboard` **键盘示意图 + 引线**：键盘示意图 + 引线标动作（参考：GameUI#573377） 〔需素材〕
- `pad` **手柄示意图 + 引线**：手柄示意图 + 引线标动作（参考：GameUI#573377） 〔需素材〕
- `mouse` **鼠标示意图**：鼠标示意图 〔需素材〕

#### `cmp.input` 输入框形态

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：roundWhite） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：LineEdit 的 normal / focus StyleBox

吸收的观察轴 / 旧维度：N:输入框画法、N:搜索筛选

- `roundWhite` **白底圆角槽**：白底圆角输入槽（参考：GameUI#556119）
- `darkInset` **暗色嵌入槽**：深色凹陷输入槽（参考：GameUI#518086）
- `underline` **纸面下划线**：只有一条下划线，像在纸上写（参考：GameUI#563036）
- `boxed` **文本框 + 边框**：带边框的文本框（参考：GameUI#507441）
- `signature` **印章 / 签名框**：签名栏或印章框（参考：GameUI#522754）

#### `cmp.node` 节点形态

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：circleNumber） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布：地图、技能树、关卡路径、通行证轨道上的节点。Godot：TextureButton；连线用 Line2D

吸收的观察轴 / 旧维度：N:节点样式、N:地图标记语言、N:等级节点样式、N:路径连线样式

- `circleNumber` **圆形编号**：写着编号的圆（参考：GameUI#596124）
- `avatar` **头像**：角色头像当节点（参考：GameUI#585199）
- `building` **建筑图标**：建筑图标当节点（参考：GameUI#604585）
- `chest` **宝箱**：宝箱当节点（参考：GameUI#594048）
- `block` **等距方块**：等距立方块当节点（参考：GameUI#580686）
- `glowDot` **发光点**：发光的小点，学会后点亮（参考：Grim Dawn s219990_2、GameUI#573460）
- `pin` **图标针**：地图图钉（参考：GameUI#594251）

### 2.14 数据与状态编码（`st.*`）

**空、锁、完成、新、冷却、选中、警示这些状态怎么画？** 全局默认，可逐屏覆盖。和颜色编码（col.coding）一起用，必须满足形状冗余（chk.redundancy）。v2 给锁定 / 空槽 / 完成 / 冷却 / 选中的每个取值标了视觉通道，生成器检查同一屏里两两不撞车（R1：v1 的灰度锁、去饱和冷却、灰化完成三者同屏分不出来）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `st.delta` | 变化 / 前后对比 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：arrow） | 3 | — | 画布 | builtin |
| `st.statViz` | 统计图形 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：table） | 3 | — | 画布 | builtin |
| `st.rank` | 名次标识 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：number） | 3 | — | 画布 | builtin |
| `st.rarityCue` | 稀有度表达手段 | 设计参数 / 全局，可逐屏覆盖 | 多选 | 跟随（兜底：空） | 2 | col.coding 含 rarity | 画布 | builtin |
| `st.emptySlot` | 空槽表现 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：plus） | 3 | — | 画布 | builtin |
| `st.emptyList` | 空状态画法 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：watermark） | 3 | cnt.dataState = empty | 画布 + 素材 | builtin |
| `st.locked` | 锁定 / 未获得表现 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：lock） | 2 | — | 画布 | builtin |
| `st.done` | 完成 / 已领标记 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：check） | 3 | — | 画布 | builtin |
| `st.newCue` | 新内容 / 可领提示 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |
| `st.statusMark` | 状态标识形态 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：dot） | 3 | — | 画布 | builtin |
| `st.cooldown` | 冷却 / 不可用表现 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：radialWipe） | 3 | cnt.elements 含 {el.abilities, el.toolbar, el.cta} 之一 | 画布 + 动画预览 | builtin |
| `st.selected` | 已选 / 已装备标记 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：check） | 3 | — | 画布 | builtin |
| `st.alert` | 警示表达 | 设计参数 / 全局，可逐屏覆盖 | 单选 | 跟随（兜底：redTint） | 3 | — | 画布 + 动画预览 | builtin / post |

#### `st.delta` 变化 / 前后对比

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：arrow） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：RichTextLabel 模板

吸收的观察轴 / 旧维度：N:前后对比表达、N:前后对比呈现、N:数值变化表达、N:属性呈现形式（对比部分）

- `arrow` **a → b 箭头**：旧值 → 新值（参考：GameUI#572370、GameUI#625107）
- `plus` **绿色 + 增量**：新值后跟绿色 +增量（参考：GameUI#559164）
- `sideBySide` **前后双卡**：升级前后两张卡并排（参考：GameUI#564204）
- `newOnly` **只给新值**：只给新值，用大字强调（参考：GameUI#575902）
- `radar` **雷达图**：雷达图里新旧两层叠在一起（参考：Dispatch s2592160_5、Clair Obscur）

#### `st.statViz` 统计图形

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：table） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：自绘（_draw）或 GraphEdit

v2："战力大字"只在这里（v1 el.profile.form = power 删掉）。

吸收的观察轴 / 旧维度：N:数据可视化手段、N:属性表达、N:数据图表类型、N:特权信息呈现、N:战力数值强调

- `table` **纯数字表**：纯数字表格（参考：GameUI#1178800）
- `inlineBar` **行内横条**：每行数字后跟一条横条（参考：GameUI#604592）
- `versusBar` **左右对打条**：双方数值从中间向两边伸（参考：GameUI#575882）
- `iconCount` **图标 + 计数**：图标后跟数量（参考：GameUI#550187）
- `tactical` **战术图 / 点位**：在球场或地图上标点位（参考：GameUI#575881）
- `radar` **雷达**：多维雷达图（参考：Dispatch s2592160_5）
- `bigNumber` **战力大字**：一个巨大的总数（战力）（参考：GameUI#535056）

#### `st.rank` 名次标识

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：number） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布。Godot：按名次切换 Theme type variation

v2：删"斜切色块"（= cmp.plate@rank = slashBand）。

吸收的观察轴 / 旧维度：N:前三名展示、N:名次标识、N:个人排名呈现

- `number` **纯数字**：只写名次数字（参考：GameUI#554285）
- `medals` **奖牌 / 奖杯**：前几名用奖牌或奖杯（参考：GameUI#584777）
- `crown` **皇冠**：第一名戴皇冠（参考：GameUI#585189）
- `podium` **领奖台 / 立绘前三**：前三名站上领奖台或画成大立绘（参考：GameUI#625095、GameUI#604635）
- `top3Color` **前三色 + 其余数字**：前三金银铜色，其余普通数字（参考：GameUI#596121）

#### `st.rarityCue` 稀有度表达手段

设计参数 · 范围：全局，可逐屏覆盖 · 类型：多选 · 默认：跟随（兜底：空） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M5a

生效条件：col.coding 含 rarity · 多选合并：并集

实现：画布。Godot：StyleBox 按稀有度切换 + 星级图标

白话：稀有度除了颜色还用什么表达：边框、底色、星级、光效、框形、字母、侧条。至少要有一样不是颜色。 看哪里：高稀有度与低稀有度物品放在一起时的差别。

色阶本身见 col.rarityScale。06 文档 A5：稀有度不能只靠颜色，约束要求至少含一项非颜色手段（星、框形、字母、侧条）。v2：发光改名 rarityGlow；也承担 v1 vis.strokeColor = rarity（边框随稀有度变色）；加 R2 的侧边色条。用"边框色"时必须有边框（外框是素材，或程序描边 ≠ none）。

吸收的观察轴 / 旧维度：N:稀有度表达、N:稀有度/星级徽记、N:稀有度揭示强调、N:品质/阶段标记、N:拥有与稀有标识

- `border` **边框色**：边框颜色（参考：GameUI#1511429、GameUI#603727）
- `bg` **底色**：格子底色（参考：GameUI#575918）
- `stars` **星级**：星级数量（参考：GameUI#646849、GameUI#604633）
- `rarityGlow` **光效色**：按稀有度换光效颜色（参考：GameUI#603738）
- `frameShape` **框形状不同**：不同稀有度用不同框形（参考：06 文档 A5）
- `letter` **字母徽标（SSR）**：R / SR / SSR 字母标（参考：GameUI#1743977）
- `strip` **侧边色条**：新（R2）（参考：Black Myth: Wukong）

#### `st.emptySlot` 空槽表现

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：plus） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M5a

实现：画布。Godot：Panel 的 empty 变体

v2 改名（R1：st.empty → st.emptySlot，避免与空状态 st.emptyList 混淆）。

吸收的观察轴 / 旧维度：N:空槽表现、N:空槽与锁定表达、N:空格呈现、N:空/未获得槽位表达

- `plus` **+ 号**：空槽中间一个 + 号，点击添加（参考：GameUI#1178740、GameUI#556673） 〔通道：glyph〕
- `pit` **暗坑 / 凹槽**：空槽画成凹进去的暗坑（参考：GameUI#625125） 〔通道：value〕
- `silhouette` **灰色剪影**：空槽里放灰色剪影（参考：GameUI#564149） 〔通道：silhouette〕
- `dashed` **虚线框**：虚线框（参考：GameUI#572412） 〔通道：outline〕
- `blank` **留白无框**：空槽只留空白
- `question` **问号**：空槽里一个问号（参考：GameUI#1463178） 〔通道：glyph〕
- `hidden` **不画空格（只显示占用格）**：不画空槽，只显示已有的（参考：GameUI#556146）

#### `st.emptyList` 空状态画法

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：watermark） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M9a

生效条件：cnt.dataState = empty

实现：画布 + 素材。Godot：空列表时显示的子场景

v2 改名（R1：st.emptyState → st.emptyList），由 cnt.dataState = empty 驱动。

吸收的观察轴 / 旧维度：N:空状态画法、N:空状态表现、N:空状态、N:空态

- `watermark` **水印徽记**：列表为空时显示淡淡的徽记水印（参考：GameUI#594325、GameUI#646885）
- `illustration` **插画 + 一句话**：一张小插画加一句话（参考：GameUI#594055） 〔需素材〕
- `mascot` **吉祥物**：吉祥物出来说"这里还没有"（参考：GameUI#507779、GameUI#483233） 〔需素材〕
- `text` **一句文案**：只写一句提示（参考：GameUI#943754）
- `blank` **留白**：什么都不放（参考：GameUI#559147）

#### `st.locked` 锁定 / 未获得表现

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：lock） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M9a

实现：画布。Godot：modulate 去色 + 锁图标

白话：没解锁、没获得的东西怎么画：加锁、变灰、只剩剪影、打问号…… 看哪里：状态陈列板上"锁定"那一格，以及它和"完成""冷却"能不能分清。

v2：删"云雾遮挡"（只对地图成立，移到 vis.mapUnexplored）。由 cnt.dataState = locked 或条目自身状态驱动。

吸收的观察轴 / 旧维度：N:未解锁表现、N:未获得状态表达、N:解锁状态表现、N:槽位锁定表达、N:章节状态表达、N:节点状态

- `lock` **锁图标**：叠一个锁（参考：GameUI#594267） 〔通道：glyph〕
- `grayscale` **灰度**：变成灰度（参考：GameUI#577677） 〔通道：desat〕
- `silhouette` **黑剪影**：变成黑色剪影（参考：GameUI#1079017） 〔通道：silhouette〕
- `sealed` **特殊封印（冰晶等）**：被冰晶或封印覆盖（参考：GameUI#604593） 〔通道：overlay〕
- `question` **问号**：用问号代替（参考：GameUI#1463178） 〔通道：glyph〕
- `hiddenText` **??? 文字**：名字写成 ???（参考：GameUI#545679） 〔通道：glyph〕
- `dimmed` **压暗 + 进度数**：压暗并显示解锁进度（参考：GameUI#594259） 〔通道：value〕

#### `st.done` 完成 / 已领标记

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：check） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M9a

实现：画布。Godot：状态切换 TextureRect

v2：v1 的"已领取角标"改成 tag，角标的牌子由 cmp.plate@stateTag 决定。

吸收的观察轴 / 旧维度：N:完成状态标记、N:领取状态标记、N:任务状态呈现

- `check` **绿勾**：打一个绿勾（参考：GameUI#584780） 〔通道：glyph〕
- `stamp` **盖章**：盖一个"已完成"章（参考：GameUI#1663796、GameUI#572499） 〔通道：overlay〕
- `grayOut` **灰化沉底**：变灰并排到列表底部（参考：GameUI#594097） 〔通道：desat〕
- `strike` **划掉**：划掉（参考：Hidden Folks s435400_1） 〔通道：glyph〕
- `tag` **"已领取"角标**："已领取"角标（牌子形状见 cmp.plate@stateTag）（参考：GameUI#552281） 〔通道：badge〕

#### `st.newCue` 新内容 / 可领提示

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M9a

实现：画布。Godot：TextureRect 角标

白话：新东西 / 可领取的提示：红点、NEW 角标、数字角标、发光脉冲，或不提示。 看哪里：入口图标的右上角。

系统提示，与运营标记（ops.badges）分开。v2：已读 / 未读只归这里（v1 st.statusMark 也声称吸收了它）；可领取的脉冲只在这里（glowPulse）。

吸收的观察轴 / 旧维度：N:数量/角标语言（红点部分）、N:已读未读编码

- `redDot` **红点**：右上角红点（参考：GameUI#1748411）
- `newTag` **NEW 角标**：NEW 角标（参考：GameUI#554250）
- `count` **数字角标**：红底数字角标（参考：GameUI#1743976）
- `glowPulse` **发光脉冲**：可领取（参考：GameUI#596110、GameUI#572348）
- `none` **无**：买断制极简（参考：Hollow Knight）

#### `st.statusMark` 状态标识形态

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：dot） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：静帧 · 里程碑：M9a

实现：画布：服务器状态、在线状态、机器状态的小标记。Godot：TextureRect / ColorRect 小圆点

吸收的观察轴 / 旧维度：N:服务器状态编码、N:在线状态表达

- `dot` **彩色圆点**：绿 / 黄 / 红 / 灰小圆点（参考：GameUI#594206、GameUI#545572）
- `tag` **文字 / 色块角标**：爆满、推荐、在线（参考：GameUI#534976）
- `icon` **图标**：火焰、红绿圆（参考：GameUI#556591）
- `rowTint` **整行底色 / 灰度头像**：整行变色或头像变灰（参考：GameUI#438456）
- `text` **文字**："3 小时前"（参考：GameUI#438455）

#### `st.cooldown` 冷却 / 不可用表现

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：radialWipe） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：时间轴 + 逐帧条带 · 里程碑：M5b

生效条件：cnt.elements 含 {el.abilities, el.toolbar, el.cta} 之一

实现：画布 + 动画预览。Godot：TextureProgressBar（FILL_CLOCKWISE）叠在图标上

- `radialWipe` **冷却扇形**：扇形遮罩顺时针退去（参考：Dota 2 s570_0、World of Warcraft） 〔通道：overlay〕
- `dimNumber` **压暗 + 数字**：压暗并显示剩余秒数（参考：Marvel Rivals s2767030_2） 〔通道：value〕
- `desat` **去饱和**：去饱和变灰 〔通道：desat〕
- `fillUp` **自下而上充能**：颜色自下而上充满（参考：Overwatch） 〔通道：fill〕

#### `st.selected` 已选 / 已装备标记

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：check） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：状态陈列板 · 里程碑：M5a

实现：画布：选中、已装备、已上阵的标记（与导航焦点 ix.focus 可同时出现）。Godot：TextureRect 角标 / StyleBox

v2 新增（R1），从 v1 ix.focus 拆出。

吸收的观察轴 / 旧维度：N:已选/上阵状态标记、N:选中/装备态、N:选中态表现

- `check` **勾选角标**：选中项角上一个勾（参考：GameUI#564248） 〔通道：glyph〕
- `outline` **描边**：选中项加高亮描边（参考：GameUI#488711） 〔通道：outline〕
- `glow` **发光**：选中项发光（参考：Slay the Spire） 〔通道：glow〕
- `bar` **色条**：选中行整条着色（参考：Night Call s680380_3） 〔通道：fill〕
- `badge` **"已装备"角标**："已装备 / 已上阵"角标（参考：GameUI#552281） 〔通道：badge〕

#### `st.alert` 警示表达

设计参数 · 范围：全局，可逐屏覆盖 · 类型：单选 · 默认：跟随（兜底：redTint） · 分层：tier 3 · 页签：⑥组件与状态 · 展示：事件触发 · 里程碑：M5b

实现：画布 + 动画预览。Godot：主题色切换 + AnimationPlayer 闪烁

闪烁频率要克制（光敏风险，06 文档 B13）。"全屏红光 + 扫描线"只在这里（v1 col.dynamic = alert 删掉）。

吸收的观察轴 / 旧维度：N:警示表达、N:状态皮肤切换（警报部分）

- `redTint` **红色调**：标题或数字变红（参考：GameUI#564239）
- `warnIcon` **黄三角图标**：黄色三角感叹号（参考：GameUI#1663800）
- `blink` **闪烁**：闪烁（注意光敏风险）
- `stripes` **黄黑警示条**：黄黑相间警示条（参考：GameUI#559108）
- `fullAlarm` **全屏红光 + 扫描线**：整屏红光加扫描线（参考：Dispatch s2592160_2） 〔Godot：后处理〕

### 2.15 运营与商业化（`ops.*`）

**这一屏有多少运营元素：红点、倒计时、折扣、入口？** 手游界面的独立一维：同一套版式，运营元素可以从零加到满。与美术风格无关，与商业模式预设相关。买断制默认隐藏整页（第 7 节）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `ops.density` | 运营元素密度 | 设计参数 / 某一屏 | 整数档位 | 跟随（兜底：0） | 3 | 由 ops.badges、ops.entries、st.newCue 推出 | 读数 | builtin |
| `ops.badges` | 商业角标 | 设计参数 / 某一屏 | 多选 | （空） | 2 | — | 画布 | builtin |
| `ops.actions` | 运营动作按钮 | 设计参数 / 某一屏 | 多选 | （空） | 3 | — | 画布 | builtin |
| `ops.poster` | 海报化程度 | 设计参数 / 某一屏 | 连续 | 跟随（兜底：0） | 2 | — | 画布 | builtin |
| `ops.entries` | 运营入口簇 | 设计参数 / 某一屏 | 单选 | 跟随（兜底：none） | 2 | — | 画布 | builtin |
| `ops.compliance` | 合规与品牌层 | 设计参数 / 某一屏 | 多选 | （空） | 3 | — | 画布 | builtin |
| `ops.tierArt` | 档位升级美术 | 设计参数 / 某一屏 | 单选 | 无 | 3 | — | 素材 / 画布 | builtin |

#### `ops.density` 运营元素密度

设计参数 · 范围：某一屏 · 类型：整数档位 0–3（步长 1） · 默认：跟随（兜底：0） · 分层：tier 3 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

由 `ops.badges`、`ops.entries`、`st.newCue` 推出（纯派生，不进控件面板）

实现：读数：由已选商业标记、入口、红点的数量算出。Godot：—（统计量）

v2（R1）：改为派生量（v1 是可调参数，与 ops.badges 两边都能写，能写出"密度 0 + 倒计时 + 折扣"）。刻度：0 无（买断，GameUI#614494）、1 少（红点，GameUI#1748411）、2 中（礼包入口，GameUI#646877）、3 多（倒计时 + 折扣 + 拍脸，GameUI#1463173）。

吸收的观察轴 / 旧维度：B1

#### `ops.badges` 商业角标

设计参数 · 范围：某一屏 · 类型：多选 · 默认：（空） · 分层：tier 2 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

多选合并：并集

实现：画布。Godot：TextureRect 角标 + Label

白话：商品和入口上的商业角标：倒计时、折扣、限购、倍率、推荐、赠送、划线价、保底。 看哪里：商品卡的角上。

v2（R1）：只留真正的角标；分享、再来一次、看广告翻倍、今日不再显示是动作，移到 ops.actions。

吸收的观察轴 / 旧维度：N:商品角标、N:促销标签、N:原价/赠送标注、N:刷新与限购显示、N:刷新/限时机制、N:限时倒计时、N:保底卖点文案、N:保底奖池信息

- `countdown` **倒计时**：剩余时间倒计时（参考：GameUI#1463173、GameUI#556124）
- `discount` **折扣角标**：折扣角标（参考：GameUI#596129）
- `limit` **限购 x/y**：限购次数 x / y（参考：GameUI#1743969）
- `multiplier` **倍率大字**：3000%、20 倍（参考：GameUI#625073）
- `recommend` **推荐 / 热卖**：推荐、热卖、爆满标签（参考：GameUI#534976）
- `gift` **赠送 / 首充标签**：首充、赠送标签（参考：GameUI#577675）
- `strike` **划线原价**：原价划线 + 现价（参考：GameUI#604606）
- `pity` **保底提示**："十连必出"（参考：GameUI#575934、GameUI#580625）

#### `ops.actions` 运营动作按钮

设计参数 · 范围：某一屏 · 类型：多选 · 默认：（空） · 分层：tier 3 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

多选合并：并集

实现：画布。Godot：Button

v2 新增（R1），从 v1 ops.badges 拆出。

吸收的观察轴 / 旧维度：N:二次转化入口

- `share` **分享**：分享战绩按钮（参考：GameUI#594345）
- `retry` **再抽 N 次 / 再来一局**："再抽一次""再来一局"（参考：GameUI#1511429）
- `adDouble` **看广告翻倍**："看广告翻倍"按钮（参考：GameUI#1698127）
- `dontShow` **今日不再显示**："今日不再显示"勾选（参考：GameUI#1511459）

#### `ops.poster` 海报化程度

设计参数 · 范围：某一屏 · 类型：连续 0–1（步长 0.05） · 默认：跟随（兜底：0） · 分层：tier 2 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

实现：画布：插画占比、标题放大、控件收缩。Godot：布局比例常量

白话：这一屏有多像海报：插画越大、控件越少就越像。 看哪里：插画占了多少面积。 两端：0：功能面板 ↔ 1：整张海报。

0 功能面板（GameUI#575889）、0.5 海报 + 面板（GameUI#604614）、1 海报广告（GameUI#594293）。与运营密度独立：海报也可以只有一个按钮。

吸收的观察轴 / 旧维度：N:海报化程度、N:UI与海报融合度、N:界面截图嵌入方式

#### `ops.entries` 运营入口簇

设计参数 · 范围：某一屏 · 类型：单选 · 默认：跟随（兜底：none） · 分层：tier 2 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

实现：画布。Godot：VBox / HBox 图标列

白话：运营活动入口怎么摆：侧边一列图标、顶部轮播、浮动角标、横幅堆叠。 看哪里：主界面边上的活动图标。

v2：删"左侧活动页签"（= lay.nav = tabsLeft）。

吸收的观察轴 / 旧维度：N:侧边功能入口、N:顶部运营位、N:活动入口组织、N:活动 Tab 簇、N:节日/促销换肤（入口部分）

- `none` **无**：没有运营入口
- `sideIcons` **侧边图标列**：屏幕一侧竖排小图标（公告、活动、客服）（参考：GameUI#614493）
- `topBanner` **顶部轮播 / 横幅**：顶部轮播大图（参考：GameUI#596129）
- `floating` **浮动角标入口**：浮在主界面上的带角标入口（参考：GameUI#1743963）
- `bannerStack` **横幅竖向堆叠**：多张活动横幅竖向堆叠（参考：GameUI#594044）

#### `ops.compliance` 合规与品牌层

设计参数 · 范围：某一屏 · 类型：多选 · 默认：（空） · 分层：tier 3 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

多选合并：并集

实现：画布。Godot：Label + TextureRect 固定在安全区角落

国服登录页必备版面；商店图的评分墙 / 水印不是游戏内 UI，但同样能用这一项描述。

吸收的观察轴 / 旧维度：N:合规与评级信息、N:品牌合规标识、N:品牌水印、N:品牌水印/Logo叠加、N:营销叠层、N:营销叠层样式

- `ageRating` **年龄角标**：8+ / 12+ / 16+（参考：GameUI#1762374、GameUI#575855）
- `license` **版号 / 健康游戏长文**：底部版号、著作权与健康游戏忠告（参考：GameUI#614493）
- `version` **版本号**：角落版本号（参考：GameUI#1058283）
- `watermark` **Logo 水印**：角落游戏 LOGO 水印（参考：Kena s1954200_0、World of Warships s552990_0）
- `legal` **法务小字**：法务小字（参考：s1817070_3）
- `reviews` **媒体评分墙**：营销卡（参考：007 First Light s3768760_0、Sekiro s814380_0）

#### `ops.tierArt` 档位升级美术

设计参数 · 范围：某一屏 · 类型：单选 · 默认：无 · 分层：tier 3 · 页签：⑦运营 · 展示：静帧 · 里程碑：M9b

实现：素材 / 画布：同一类商品按档位换图（金币堆 → 铁箱 → 金箱）。Godot：按档位切换 TextureRect

v2 新增（R2：ui-asset-materials 22.1）。

- `none` **无**：每档商品用同一张图
- `stackGrow` **一堆越堆越高**：一堆越堆越高（参考：ui-asset-materials 22.1） 〔需素材〕
- `containerUpgrade` **容器升级（袋 → 箱 → 宝箱）**：从袋子到箱子到宝箱（参考：ui-asset-materials 22.1） 〔需素材〕
- `sizeScale` **同图放大**：同一张图按档位放大

### 2.16 玩家选项（无障碍）（`a11y.*`）

**玩家能在设置里调什么？** 玩家可调的无障碍选项：也是设计参数（M4 导出到 Godot 设置页），在探索台里做成"玩家设置预览"开关，不进随机。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `a11y.uiScale` | UI 缩放 | 玩家选项 / 全局 | 连续 | 1 | 3 | — | 画布 | builtin |
| `a11y.textScale` | 文字缩放 | 玩家选项 / 全局 | 连续 | 1 | 3 | — | 画布 | builtin |
| `a11y.highContrast` | 高对比模式 | 玩家选项 / 全局 | 开关 | 关 | 3 | — | 画布 | builtin |
| `a11y.reduceMotion` | 减少动效 | 玩家选项 / 全局 | 开关 | 关 | 3 | — | 动画预览 | builtin |
| `a11y.reduceTransparency` | 降低透明 | 玩家选项 / 全局 | 开关 | 关 | 3 | — | 画布 | builtin |
| `a11y.cvdPreset` | 色盲预设 | 玩家选项 / 全局 | 单选 | 关 | 3 | — | 画布 | builtin |

#### `a11y.uiScale` UI 缩放

玩家选项 · 范围：全局 · 类型：连续 0.75–2（步长 0.05） · 默认：1 · 分层：tier 3 · 页签：玩家设置预览 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：画布：整体缩放。Godot：content_scale_factor 或 Theme 缩放

#### `a11y.textScale` 文字缩放

玩家选项 · 范围：全局 · 类型：连续 0.8–2（步长 0.05） · 默认：1 · 分层：tier 3 · 页签：玩家设置预览 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：画布：只放大文字，检查溢出。Godot：Theme 字号常量

#### `a11y.highContrast` 高对比模式

玩家选项 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：玩家设置预览 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：画布：面板不透明、文字加描边、去掉纹理底。Godot：备用 Theme

#### `a11y.reduceMotion` 减少动效

玩家选项 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：玩家设置预览 · 展示：时间轴 + 逐帧条带 · 里程碑：M8b · 不参与随机

实现：动画预览：关闭震屏、闪白、粒子，入场改淡入。Godot：全局开关读入各 Tween

#### `a11y.reduceTransparency` 降低透明

玩家选项 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：玩家设置预览 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：画布：毛玻璃与半透明改成实底（NN/g 建议）。Godot：备用 Theme

#### `a11y.cvdPreset` 色盲预设

玩家选项 · 范围：全局 · 类型：单选 · 默认：关 · 分层：tier 3 · 页签：玩家设置预览 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：画布：换一套色盲安全的语义色。Godot：备用颜色表

- `off` **关**：使用默认语义色
- `protan` **红色弱**：红色换成橙或品红
- `deutan` **绿色弱**：绿色换成蓝
- `tritan` **蓝色弱**：蓝黄换成红青

### 2.17 工具与展示（不进配方）（`chk.*`）

**这套 UI 有没有问题？静态看不出的东西怎么演示？** 工具侧检查与展示方式，不是游戏参数：并入顶栏"诊断"下拉与视口按钮，不进配方、收藏、随机、导出（R1 + R3）。v1 的 a11y.redundancy、lay.coverage、flow.demo 改到这里。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `chk.contrast` | 对比度检查 | 工具与展示 / 全局 | 开关 | 开 | 3 | — | 工具侧 | builtin |
| `chk.cvd` | 色盲模拟 | 工具与展示 / 全局 | 单选 | 关 | 3 | — | 工具侧 | builtin |
| `chk.redundancy` | 颜色冗余检查 | 工具与展示 / 全局 | 开关 | 开 | 3 | — | 工具侧 | builtin |
| `chk.minText` | 最小字号检查 | 工具与展示 / 全局 | 连续 | 12px@1080p | 3 | — | 工具侧 | builtin |
| `chk.touch` | 触控尺寸检查 | 工具与展示 / 全局 | 开关 | 关 | 3 | — | 工具侧 | builtin |
| `chk.safeArea` | 安全区检查 | 工具与展示 / 全局 | 开关 | 关 | 3 | — | 工具侧 | builtin |
| `chk.overflow` | 文字溢出 / 伪本地化 | 工具与展示 / 全局 | 单选 | 关 | 3 | — | 工具侧 | builtin |
| `chk.fxOcclusion` | 特效遮挡检查 | 工具与展示 / 全局 | 开关 | 关 | 3 | — | 工具侧 | builtin |
| `chk.squint` | 眯眼层级检查 | 工具与展示 / 全局 | 开关 | 关 | 3 | — | 工具侧 | builtin |
| `chk.viewDistance` | 视距预览 | 工具与展示 / 全局 | 单选 | 关 | 3 | — | 工具侧 | builtin |
| `chk.coverage` | UI 屏占比读数 | 工具与展示 / 某一屏 | 连续 | 0% | 3 | — | 工具侧 | builtin |
| `chk.demo` | 流程演示脚本 | 工具与展示 / 全局 | 单选 | 不播放 | 3 | — | 流程演示 | builtin |

#### `chk.contrast` 对比度检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：开 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：取 HUD 下方背景亮度，文字 / 面板 ≥ 4.5、面板 / 背景 ≥ 3，不合格在画面上框出并显示比值。Godot：—（工具功能）

06 文档 C.4 #8；WCAG 2.1。参数行内也直接显示 ⚠（例如"雪地上文字对比 2.1 < 4.5"）。

#### `chk.cvd` 色盲模拟

工具与展示 · 范围：全局 · 类型：单选 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：Machado 2009 矩阵，包含 HUD。Godot：—

- `off` **关**：不模拟
- `protan` **红色盲**：Machado 2009 protanopia
- `deutan` **绿色盲**：Machado 2009 deuteranopia
- `tritan` **蓝色盲**：Machado 2009 tritanopia
- `achroma` **全色盲（灰度）**：只看明度

#### `chk.redundancy` 颜色冗余检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：开 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：检查每个 col.coding 项是否有形状 / 文字冗余（灰度诊断 + 含 UI 时查是否只靠色相区分）。Godot：—（设计约束）

v2（R1）：v1 的 a11y.redundancy 有一个取值"只靠颜色"直接标为不合格——有取值即错误的参数本质是检查项。GAG："颜色不单独承载信息"（06 文档 [32]）。

#### `chk.minText` 最小字号检查

工具与展示 · 范围：全局 · 类型：连续 8–24 px@1080p（步长 1） · 默认：12px@1080p · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：低于阈值的文字标红（按设备视距换算）。Godot：—

#### `chk.touch` 触控尺寸检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：工具侧：可点区域小于 ix.touchSize 时标红。Godot：—

#### `chk.safeArea` 安全区检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：工具侧：画出刘海、圆角、电视安全框，越界控件标红。Godot：—

#### `chk.overflow` 文字溢出 / 伪本地化

工具与展示 · 范围：全局 · 类型：单选 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：工具侧：把占位文案加长后重排，检查截断。Godot：—

- `off` **关**：用原始文案
- `plus30` **+30%（英文）**：文案加长 30%
- `plus50` **+50%（德文等）**：文案加长 50%

#### `chk.fxOcclusion` 特效遮挡检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8b · 不参与随机

实现：工具侧：特效压力（粒子 ×N、泛光拉满）下 HUD 关键信息是否仍可读。Godot：—

06 文档 C.4 #7。

吸收的观察轴 / 旧维度：N:特效与HUD层叠、N:特效体量

#### `chk.squint` 眯眼层级检查

工具与展示 · 范围：全局 · 类型：开关 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：整屏高斯模糊后最显眼的 3 处是否是主信息（elx.priority = primary 的元素、威胁、CTA）。Godot：—

GameUI 社区最常见批评："主次层级不清，像原画作品集不像 UI"（08 文档 2.4）。hier.emphasis 的效果在这里验证。

#### `chk.viewDistance` 视距预览

工具与展示 · 范围：全局 · 类型：单选 · 默认：关 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M10 · 不参与随机

实现：工具侧：按设备把画面缩到 30cm / 60cm / 2.5m 时的实际视角大小。Godot：—

v2 新增（R3）。

- `off` **关**：不模拟视距
- `phone` **手机 30cm**：按手机 30cm 视距缩放
- `pc` **PC 60cm**：按 PC 60cm 视距缩放
- `tv` **电视 2.5m**：按电视 2.5m 视距缩放

#### `chk.coverage` UI 屏占比读数

工具与展示 · 范围：某一屏 · 类型：连续 0–100 %（步长 1） · 默认：0% · 分层：tier 3 · 页签：诊断 / 工具 · 展示：静帧 · 里程碑：M8a · 不参与随机

实现：工具侧：统计 UI 不透明像素占比，显示在"内容与版式"页签顶部（只读）。Godot：—（统计量）

v2（R1 + R3）：v1 的 lay.coverage 改为只读读数。刻度：< 10% 角落 HUD（GameUI#594218）；10–40% 侧栏 / 底条；40–80% 弹窗（GameUI#534975）；100% 全屏页。可调的部分是 lay.panelSize。

吸收的观察轴 / 旧维度：L4、N:UI露出度、N:UI暴露度

#### `chk.demo` 流程演示脚本

工具与展示 · 范围：全局 · 类型：单选 · 默认：不播放 · 分层：tier 3 · 页签：诊断 / 工具 · 展示：流程分镜 · 里程碑：M9b · 不参与随机

实现：流程演示：视口上的"▶ 演示流程"按钮，一键播放一段确定性流程（录成逐帧条带）。Godot：示例场景里的 AnimationPlayer 轨道

v2：v1 的 flow.demo 改到这里（不是游戏参数，是"静态看不出的东西"的展示方式）。

- `none` **不播放**：不播放演示
- `combatBeat` **战斗节拍**：掉血、回血、技能冷却、伤害数字（参考：Hades）
- `login` **登录序列**：登录 → 公告 → 选服 → 创角（参考：GameUI 热门前 24 款）
- `gacha` **抽卡**：入口 → 仪式 → 结果（参考：GameUI#604664、GameUI#1778633、GameUI#646920）
- `levelUp` **升级**：确认 → 演出 → 结果（参考：GameUI#943790、GameUI#580609）
- `dialogue` **对话推进**：对话逐句推进并出选项（参考：GameUI#604577）
- `build` **建造放置**：选建筑 → 摆放预览 → 确认（参考：GameUI#518081）
- `purchase` **购买确认**：点商品 → 确认弹窗 → 获得（参考：GameUI#585176）
- `draft` **三选一**：升级 → 三选一 → 选中（参考：Hades、Vampire Survivors）

### 2.18 信息元素（逐元素）（`el.*`）

**每个信息块单独长什么样、放在哪、多大、什么时候出现？** 每个信息元素一组参数：画法（各元素自己的选项）+ 11 个通用模板参数（放置、九宫格锚点、世界挂点、世界渲染、元 UI 效果、内部排布、大小、显隐、信息优先级、数值标注与位置）。实例键写成「元素 id.后缀」，例如 el.minimap.screenAnchor = tr。28 个旧元素 + 4 个新元素（态势条、建造栏、行动顺序、对话选项）。在探索台里做成"元素检查器"：在画布上点一个元素就打开它的这一组参数（第 7 节）。

| 参数 | 名称 | 类别 / 范围 | 类型 | 默认 | 分层 | 生效条件 | 实现 | Godot |
|---|---|---|---|---|---|---|---|---|
| `elx.diegesis` | 放置方式（逐元素） | 设计参数 / 信息元素 | 单选 | 跟随全局 | 2 | — | 画布 / 场景内 | builtin |
| `elx.screenAnchor` | 屏幕锚点 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：tl） | 2 | 本元素.diegesis ∈ {screen, inherit} 且 本元素.attachTo = none | 画布 | builtin |
| `elx.attachTo` | 世界挂点 | 设计参数 / 信息元素 | 单选 | 不挂（用屏幕锚点） | 3 | 本元素.diegesis ≠ meta | 画布 / 场景内 | builtin |
| `elx.worldRender` | 世界渲染（逐元素） | 设计参数 / 信息元素 | 单选 | 跟随全局 | 3 | 本元素.diegesis ∈ {spatial, diegetic} | 场景内 | builtin |
| `elx.metaFx` | 元 UI 效果（逐元素） | 设计参数 / 信息元素 | 单选 | 跟随（兜底：hurtVignette） | 3 | 本元素.diegesis = meta | 画布 / 后处理 | post |
| `elx.arrangement` | 内部排布 | 设计参数 / 信息元素 | 单选 | 跟随全局 | 3 | — | 画布 | builtin |
| `elx.scale` | 大小 / 突出度 | 设计参数 / 信息元素 | 连续 | 1 | 2 | — | 画布 | builtin |
| `elx.visibility` | 显隐（逐元素） | 设计参数 / 信息元素 | 单选 | 跟随全局 | 3 | — | 动画预览 | builtin |
| `elx.priority` | 信息优先级 | 设计参数 / 信息元素 | 单选 | 次 | 2 | — | 画布 | builtin |
| `elx.valueLabel` | 数值标注 | 设计参数 / 信息元素 | 单选 | 不标 | 2 | — | 画布 | builtin |
| `elx.valueLabelPos` | 数值标注位置 | 设计参数 / 信息元素 | 单选 | 条内 | 3 | 本元素.valueLabel ≠ none | 画布 | builtin |
| `el.vitals.count` | 生命 / 护盾 / 体力：条数 | 设计参数 / 信息元素 | 整数档位 | 1 | 3 | — | 画布 | builtin |
| `el.resources.form` | 资源 / 货币：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：iconNumber） | 2 | — | 画布 | builtin |
| `el.abilities.form` | 技能 / 冷却 / 弹药 / 手牌：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：slots） | 2 | — | 画布 | builtin |
| `el.minimap.form` | 小地图 / 罗盘：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：plan） | 2 | — | 场景内 | builtin |
| `el.objective.form` | 目标 / 路点：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 场景内（M6 标记与屏幕边缘指示） | builtin |
| `el.interact.form` | 交互提示：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 场景内 | builtin |
| `el.threat.form` | 敌人血条 / 预警 / 意图：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 场景内 + 画布 | builtin |
| `el.feedback.form` | 命中反馈 / 连击：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 动画预览 | builtin |
| `el.notify.form` | 通知 / 大字提示：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 动画预览 | builtin |
| `el.timer.form` | 计时 / 分数 / 回合：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：number） | 2 | — | 画布 | builtin |
| `el.crosshair.form` | 准星 / 瞄准：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 场景内 | builtin |
| `el.selection.form` | 选中信息面板：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：panel） | 2 | — | 画布 + 场景内 | builtin |
| `el.party.form` | 队伍 / 玩家条：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：frames） | 2 | — | 画布 | builtin |
| `el.clock.form` | 时间 / 天气 / 日历：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：clock） | 2 | — | 画布 | builtin |
| `el.overlay.form` | 信息叠层 / 图例：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 场景内（地面叠层）+ 画布（图例） | builtin |
| `el.prompt.form` | 按键 / 操作提示：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布（图标集见 ix.glyphs） | builtin |
| `el.cta.form` | 主行动按钮：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：wide） | 2 | — | 画布 | builtin |
| `el.title.form` | 标题 / LOGO：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：logo） | 2 | — | 画布 + 素材（字族见 typ.display.family） | builtin |
| `el.reward.form` | 奖励 / 获得物：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：icons） | 2 | — | 画布 + 素材（图标集） | builtin |
| `el.cost.form` | 价格 / 消耗：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：inButton） | 2 | — | 画布 | builtin |
| `el.rank.form` | 名次 / 段位 / 评级：画法 | 设计参数 / 信息元素 | 多选 | （空） | 2 | — | 画布 + 素材（徽章） | builtin |
| `el.profile.form` | 身份 / 头像 / 等级：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：avatarLevel） | 2 | — | 画布 | builtin |
| `el.loading.form` | 加载 / 等待指示：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：gauge） | 2 | — | 画布 + 动画预览 | builtin |
| `el.guide.form` | 引导指示 / 聚光：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：finger） | 2 | — | 画布 + 动画预览 | builtin |
| `el.chat.form` | 聊天：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：collapsed） | 2 | — | 画布 | builtin |
| `el.gameSpeed.form` | 倍速 / 暂停 / 自动：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：pauseMenu） | 2 | — | 画布 | builtin |
| `el.meter.form` | 世界 / 社会态势条：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：single） | 2 | — | 画布 | builtin |
| `el.toolbar.form` | 建造栏 / 系统入口条：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：categoryTabs） | 2 | — | 画布 | builtin |
| `el.turnOrder.form` | 行动顺序：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：portraitQueue） | 2 | — | 画布 | builtin |
| `el.choices.form` | 对话 / 事件选项：画法 | 设计参数 / 信息元素 | 单选 | 跟随（兜底：text） | 2 | — | 画布 | builtin |

#### `elx.diegesis` 放置方式（逐元素）

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随全局 · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M6

实现：画布 / 场景内：覆盖全局 rel.diegesis。Godot：同 rel.diegesis

白话：这一个元素贴在屏幕上、挂在世界里、是世界里的东西，还是用屏幕效果表达。 看哪里：镜头转动时这个元素跟着谁动。

实例键：<元素>.diegesis。例：生命值画在角色背上（diegetic + attachTo player），其余保持屏幕叠加。v1 各元素画法里的"叙事内"变体（头顶、背上、手持地图、座舱仪表、腕表、武器计数、世界内飘出……）都改用这里 + elx.attachTo 表达。

- `screen` **屏幕叠加**：这个元素贴在屏幕上
- `spatial` **空间内**：这个元素定位在世界里，但角色看不见
- `diegetic` **叙事内**：这个元素是世界里的物件，角色也看得见（参考：Dead Space）
- `meta` **元 UI**：这个元素用整屏效果表达（参考：Call of Duty）

#### `elx.screenAnchor` 屏幕锚点

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：tl） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M7 · 不参与随机

生效条件：本元素.diegesis ∈ {screen, inherit} 且 本元素.attachTo = none

实现：画布：屏幕九宫格锚点（可在画布上拖动吸附）。Godot：Control.anchors_preset

白话：这个元素放在屏幕的哪个角或哪条边。 看哪里：九宫格里点一格，元素就移过去。

v2（R1）：v1 的 elx.anchor 拆成九宫格与世界挂点两个参数（九宫格只在屏幕叠加且不跟随世界点时有意义）。品类布局预设主要就是一组锚点。实例键：<元素>.screenAnchor。

吸收的观察轴 / 旧维度：N:HUD锚点、N:HUD锚定边、N:进度条位置与长度、N:Logo 位置、N:菜单对齐/锚点

- `tl` **左上**：屏幕左上角
- `tc` **上中**：屏幕顶部居中
- `tr` **右上**：屏幕右上角
- `ml` **左中**：屏幕左侧中部
- `center` **中心**：屏幕正中
- `mr` **右中**：屏幕右侧中部
- `bl` **左下**：屏幕左下角
- `bc` **下中**：屏幕底部居中
- `br` **右下**：屏幕右下角

#### `elx.attachTo` 世界挂点

设计参数 · 范围：信息元素 · 类型：单选 · 默认：不挂（用屏幕锚点） · 分层：tier 3 · 页签：元素检查器 · 展示：静帧 · 里程碑：M6

生效条件：本元素.diegesis ≠ meta

实现：画布 / 场景内：挂到世界对象上（屏幕叠加时 = 投影跟随；空间内 / 叙事内时 = 挂在物体上）。Godot：unproject_position 每帧更新；或 Sprite3D / Label3D 作为对象子节点

v2 新增（R1）。元 UI 没有挂点。实例键：<元素>.attachTo。

吸收的观察轴 / 旧维度：N:血量挂载点、N:信息挂载对象、N:第一人称持物呈现

- `none` **不挂（用屏幕锚点）**：不挂世界对象，用屏幕锚点
- `player` **玩家角色**：头顶、脚下、背上（参考：Dead Space、Hades（头顶））
- `target` **目标 / 敌人**：跟着当前目标或敌人（参考：Dota 2 s570_1、XCOM 2）
- `poi` **兴趣点**：交互物、任务点（参考：Detroit、DQ Builders 2 s1072420_2）
- `held` **手持物 / 武器**：第一人称视模、腕表、手持地图（参考：s3008130_2（腕表）、s219640_2、Red Dead Redemption 2（地图））
- `cursor` **光标**：跟着鼠标光标（参考：Graveyard Keeper（tooltip））

#### `elx.worldRender` 世界渲染（逐元素）

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随全局 · 分层：tier 3 · 页签：元素检查器 · 展示：情境三联 · 里程碑：M6

生效条件：本元素.diegesis ∈ {spatial, diegetic}

实现：场景内：覆盖全局 rel.worldRender。Godot：Sprite3D / Decal / Label3D / 描边着色器

v2 新增（R1）：v1 的 rel.worldMarkers 是全局单选，同一游戏不同元素需要不同渲染（Dota 2）。实例键：<元素>.worldRender。

- `billboard` **平面公告板**：平面公告板，始终朝屏幕（参考：Dota 2 s570_1） 〔需场景〕
- `perspective` **透视贴面**：透视贴面，贴在世界表面（参考：Detroit） 〔需场景〕
- `decal` **地面贴花**：地面贴花（参考：Disc Jam s415880_4） 〔需场景〕
- `outline` **物体描边**：不画面板，只描物体轮廓（参考：The Last of Us） 〔需场景〕

#### `elx.metaFx` 元 UI 效果（逐元素）

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：hurtVignette） · 分层：tier 3 · 页签：元素检查器 · 展示：事件触发 · 里程碑：M6

生效条件：本元素.diegesis = meta · 取值表同 `rel.metaFx`

实现：画布 / 后处理：元素以元 UI 表达时用哪种屏幕效果。Godot：全屏 ColorRect 着色器

v2 新增（R1）：取代 v1 el.vitals.form = edgeRed（= el.vitals.diegesis = meta + 这里 = hurtVignette）与 el.feedback.form = flashShake（= hitFlash + mo.juice）。取值表同 rel.metaFx。

取值：7 个，同 `rel.metaFx`（不重列）。

#### `elx.arrangement` 内部排布

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随全局 · 分层：tier 3 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

取值表同 `lay.arrangement`

实现：画布：元素内部多个条目怎么排（技能格一行 / 十字 / 环、队伍竖列 / 网格、奖励一行 / 网格、手牌扇形）。Godot：HBox / VBox / GridContainer / 脚本摆放

v2 新增（R1）：取值表同 lay.arrangement。v1 各元素画法里的"排布词"（底部技能栏、侧边竖列、手牌、环绕角色、顶部并排、图标行、网格、里程碑轨道……）都改用这里。实例键：<元素>.arrangement。

吸收的观察轴 / 旧维度：N:技能/增益栏排布、N:队伍头像条

取值：16 个，同 `lay.arrangement`（不重列）。

#### `elx.scale` 大小 / 突出度

设计参数 · 范围：信息元素 · 类型：连续 0.5–2.5（步长 0.05） · 默认：1 · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

随机区间：0.8–1.4

实现：画布：元素整体缩放。Godot：Control.scale

白话：这一个元素放大还是缩小。 看哪里：元素的大小。 两端：0.5：缩到角落的小字 ↔ 2.5：巨型 PLAY 按钮。

实例键：<元素>.scale。hier.emphasis = size 会把主元素推到 ≥ 1.4（D-emphasis）。

#### `elx.visibility` 显隐（逐元素）

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随全局 · 分层：tier 3 · 页签：元素检查器 · 展示：情境三联 · 里程碑：M5b

实现：动画预览：覆盖 rel.hudVisibility。Godot：visible + Tween

v2（R1）：删"隐藏"（元素有没有只看 cnt.elements）。实例键：<元素>.visibility。

- `always` **常驻**：这个元素一直显示
- `contextual` **情境显现**：相关时才出现（受伤才显示血条）
- `onDemand` **按键呼出**：按键时才显示

#### `elx.priority` 信息优先级

设计参数 · 范围：信息元素 · 类型：单选 · 默认：次 · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布：决定字号档、强调色、眯眼检查的期望；hier.emphasis 只作用在 primary 上。Godot：Theme type variation（Primary / Secondary / Ambient）

白话：这一个元素重要到什么程度：主（一眼必须看到）、次、背景。强调配方只作用在"主"上。 看哪里：眯眼检查时它是否在最显眼的三处里。

v2 改名为"信息优先级"（R1：避免与视觉层级、分类级数、弹窗栈深同叫"层级"）。实例键：<元素>.priority。

- `primary` **主**：一眼必须看到
- `secondary` **次**：需要时能找到
- `ambient` **背景**：需要时再看

#### `elx.valueLabel` 数值标注

设计参数 · 范围：信息元素 · 类型：单选 · 默认：不标 · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

只对 `el.vitals`、`el.resources`、`el.abilities`、`el.threat`、`el.timer`、`el.speed`、`el.party`、`el.profile`、`el.loading`、`el.meter`、`el.turnOrder` 有效

实现：画布：在数值图形上叠数字。Godot：Label 叠在 TextureProgressBar 上

白话：血条、能量环上要不要叠数字，叠什么数字。 看哪里：条上或环心的数字。

v2 新增（R2）：条和环上叠数字是最常见的组合（Hades 分段血条 + 数字、Overwatch 大招百分比、Dota 血条蓝条上的数字），v1 只能在"条"与"纯数字"之间二选一。只对显示数值的元素有效。实例键：<元素>.valueLabel。

- `none` **不标**：只画图形，不标数字
- `current` **当前值**：标当前值（参考：Hades s1145360_0）
- `currentMax` **当前 / 上限**：标"当前 / 上限"（参考：Dota 2 s570_0）
- `percent` **百分比**：标百分比（参考：Overwatch（大招）、GameUI#1775202）
- `delta` **变化量**：+12 / −30（参考：GameUI#559164）

#### `elx.valueLabelPos` 数值标注位置

设计参数 · 范围：信息元素 · 类型：单选 · 默认：条内 · 分层：tier 3 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

生效条件：本元素.valueLabel ≠ none · 只对 `el.vitals`、`el.resources`、`el.abilities`、`el.threat`、`el.timer`、`el.speed`、`el.party`、`el.profile`、`el.loading`、`el.meter`、`el.turnOrder` 有效

实现：画布。Godot：Label 锚点

- `inside` **条内**：数字在条内
- `end` **条尾**：数字在条尾外侧
- `above` **上方**：数字在条上方
- `below` **下方**：数字在条下方
- `center` **环心 / 正中**：数字在环心或条正中（参考：Overwatch（大招））

#### `el.vitals.count` 生命 / 护盾 / 体力：条数

设计参数 · 范围：信息元素 · 类型：整数档位 1–4（步长 1） · 默认：1 · 分层：tier 3 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布：同时显示几条（血 / 蓝 / 精力）。Godot：VBox 里几个 TextureProgressBar

v2（R1）：el.vitals.form 删掉——它与 cmp.gauge 是同一个词表（用 cmp.gauge@el.vitals）；"多条细条"改成条数；对战镜像由 ctx.players = versus 推出；头顶 / 画在身上 / 屏幕泛红分别是 elx.attachTo / elx.diegesis / elx.metaFx。

#### `el.resources.form` 资源 / 货币：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：iconNumber） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：HBoxContainer（图标 + Label）

白话：资源 / 货币怎么画：图标 + 数字、胶囊 + 加号、大号数字，或者画成一条能量条。 看哪里：屏幕上的金币、能量。

v2：删"顶部资源栏 / 角落"（位置）、"仓库实物"（= 叙事内 + 挂在兴趣点）、"面板内持有 / 需求"（= el.cost.form = haveNeed）；"无底平铺"= iconNumber + vis.opacity@el.resources = 0；"能量条"= gauge。

吸收的观察轴 / 旧维度：N:资源栏形态、N:货币图标造型、N:招募货币标示

- `iconNumber` **图标 + 数字**：货币图标 + 数字（无底时就是平铺）（参考：Binding of Isaac s401920_1、Hades（右下）、Anno 1800）
- `pills` **胶囊 + 加号**：手游顶栏常见（参考：GameUI#1743963）
- `bigNumber` **大号数字**：一个大号数字（参考：Katamari s848350_0）
- `gauge` **以数值图形呈现**：能量条、法力球（形状见 cmp.gauge@el.resources）（参考：Minion Masters s489520_0、Slay the Spire）

#### `el.abilities.form` 技能 / 冷却 / 弹药 / 手牌：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：slots） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：TextureButton 组；冷却用 TextureProgressBar

白话：技能区是技能格、手牌、弹药数字、物品快捷栏，还是单个大招充能。 看哪里：技能栏。

v2：位置（底部、右下、侧边）、排布（手牌扇形、环绕、十字）、放置（武器上的计数）都移出。

吸收的观察轴 / 旧维度：N:技能触发载体、N:技能物品槽容量、N:装配槽、N:卡牌手牌托盘

- `slots` **技能格**：图标格 + 冷却 + 热键（参考：World of Warcraft、Dota 2 s570_0、Marvel Rivals s2767030_2）
- `cards` **手牌**：卡牌（版式见 cmp.card）（参考：Slay the Spire 2 s2868840_0、GameUI#577645）
- `ammo` **弹药数字**：弹药数字（参考：Destiny 2、Gears s3010850_1）
- `hotbar` **物品快捷栏**：带数量的物品格（参考：DQ Builders 2 s1072420_1、Minecraft）
- `ultimate` **大招充能**：单个技能的充能图形（形状见 cmp.gauge@el.abilities）（参考：Overwatch（大招环））

#### `el.minimap.form` 小地图 / 罗盘：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：plan） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M6

实现：场景内：烘焙小地图（M6）。Godot：SubViewport 正交相机 + 遮罩着色器

白话：小地图是平面图、圆环雷达、罗盘条，还是弧形罗盘。 看哪里：小地图。

v2：圆 / 方 / 菱 = vis.silhouette@minimapFrame；房间拼格 = vis.mapStyle = pixelRooms；手持纸地图 = 叙事内 + 挂在手持物 + 地图画风羊皮纸；"无"删掉。加 R2 的弧形罗盘。

吸收的观察轴 / 旧维度：N:小地图形状与位置

- `plan` **平面小地图**：俯视平面小地图（外形见 vis.silhouette@minimapFrame）（参考：Witcher 3、Dota 2 s570_0、Albion Online s761890_0） 〔需场景〕
- `radar` **圆环雷达**：只画方向与距离的雷达环（参考：ARMO s805590_0、Lovers s252110_1） 〔需场景〕
- `compassBar` **罗盘条**：顶部一条罗盘，标出方向与目标（参考：No Man's Sky、AC Shadows、Skyrim） 〔需场景〕
- `compassArc` **弧形罗盘**：新（R2）（参考：No Man's Sky） 〔需场景〕

#### `el.objective.form` 目标 / 路点：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布 + 场景内（M6 标记与屏幕边缘指示）。Godot：Label + 边缘箭头脚本

白话：当前目标怎么告诉玩家：一行字、任务清单、标记图标、屏幕边缘箭头、便签（可多选）。 看哪里：目标提示。

v2：可多选（R2），第一个是主画法。"世界内标记"= marker + 空间内挂在兴趣点；"无（环境引导）"删掉（不在 cnt.elements 里即可）。

吸收的观察轴 / 旧维度：N:无UI的引导手段

- `text` **目标文字**：一行当前目标（参考：Control、AC Shadows）
- `checklist` **任务清单**：一列可勾选的目标（参考：Planet Zoo、Into the Breach）
- `marker` **标记图标**：菱形、感叹号、路点（参考：Control（黄色菱形）、Detroit）
- `edgeArrow` **屏幕边缘箭头**：目标在屏外时，屏幕边缘出现箭头（参考：ARMO s805590_0）
- `note` **便签 / 卷轴**：便签或卷轴写着目标（参考：GameUI#943731）

#### `el.interact.form` 交互提示：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布 + 场景内。Godot：Label3D / 投影回屏幕的按键图标

白话："这个能用"怎么提示：按键 + 文字、锁定括号、物体旁的气泡卡、光标变化（可多选）。 看哪里：靠近可交互物时出现的提示。

v2：删"物体描边高亮"（= elx.worldRender = outline）、"幽灵预览"（= ix.confirm = ghost）。

- `keyPrompt` **按键图标 + 文字**：物体旁出现按键图标和动作名（参考：Party Hard s356570_0）
- `bracket` **锁定括号**：四角括号框住可交互物（参考：DQ Builders 2 s1072420_2）
- `bubble` **带尾气泡卡**：物体旁浮出动作列表（参考：The Sims 4 s1222670_4）
- `cursor` **光标变化**：鼠标移上去光标变形（参考：点击类冒险游戏）

#### `el.threat.form` 敌人血条 / 预警 / 意图：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：场景内 + 画布。Godot：Sprite3D / Decal

白话：敌人的信息怎么画：血条、Boss 长条、目标头像框、锁定框、地面预警、意图图标、视锥、方向提示、命中率（可多选）。 看哪里：敌人头上和屏幕边缘。

v2：可多选（R2：XCOM 的锁定框 + 命中率）。"头顶血条"= healthBar + 挂在目标；加 R2 的目标头像框。地面预警、视锥会把该元素的世界渲染设为贴花（约束）。

吸收的观察轴 / 旧维度：N:世界内标注（敌人部分）

- `healthBar` **敌人血条**：形状见 cmp.gauge@el.threat（参考：Dota 2、World of Tanks Blitz s444200_0）
- `bossBar` **Boss 长条 + 名字**：屏幕上的 Boss 长血条与名字（参考：Elden Ring、Binding of Isaac s401920_4、Hades）
- `targetFrame` **目标头像框**：新（R2）（参考：World of Warcraft）
- `lockOn` **锁定框**：锁定目标的框或准心（参考：Zelda: Ocarina of Time（Z 注目）、XCOM 2）
- `telegraph` **地面预警区**：地面上的预警范围圈（参考：06 文档 A2）
- `intent` **意图图标 + 数字**：敌人头顶标出下一步要做什么和伤害（参考：Slay the Spire 2 s2868840_1、Into the Breach）
- `visionCone` **视锥**：敌人视野画成扇形（参考：Desperados III s610370_5）
- `edgeDir` **屏幕边缘方向提示**：屏幕边缘指示伤害来源方向（参考：Call of Duty（经验））
- `hitChance` **命中率百分比**：瞄准时显示命中率百分比（参考：XCOM 2 s268500_4）

#### `el.feedback.form` 命中反馈 / 连击：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：事件触发 · 里程碑：M5a

多选合并：替换

实现：画布 + 动画预览。Godot：Label + Tween（飘字）

白话：打中之后的反馈：飘字、拟声字、连击数、评价字、COMBO 斜块、命中标记（可多选）。 看哪里：命中瞬间（用事件按钮触发）。

v2：可多选（R2：Hi-Fi Rush 拟声字 + 评级、射击游戏命中标记 + 飘字）。"闪白 + 震屏"= elx.metaFx = hitFlash + mo.juice；"只靠世界内特效"删掉（不放这个元素即可）。

吸收的观察轴 / 旧维度：N:飘字处理、N:命中反馈画法、N:连击倍率显示、N:战斗反馈文字、N:连击评价文字

- `floatNumbers` **飘字**：伤害数字从目标身上飘起（参考：Hades、ARMO s805590_4）
- `comicSFX` **拟声字**："BOOM"之类的拟声字（参考：Hi-Fi Rush、Castle Crashers s204360_3）
- `combo` **连击大数字**：巨大的连击数（参考：DBFZ s678950_1、DJMAX s960170_1）
- `rating` **评价字（Good! / Perfect）**：评价字（Good、Perfect）（参考：BlazBlue s702890_4、Hi-Fi Rush）
- `comboBadge` **斜块 COMBO xN**：斜块里的"COMBO ×N"（参考：Flinthook s401710_0）
- `hitMarker` **命中标记**：准星处闪一个命中标记（参考：FPS 惯例）

#### `el.notify.form` 通知 / 大字提示：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：事件触发 · 里程碑：M5a

多选合并：替换

实现：画布 + 动画预览。Godot：CanvasLayer 上的队列控件

白话："刚刚发生了什么"怎么显示：消息列、横幅、整屏大字带、徽章、提示卡、小字、立绘切入、弹窗卡（可多选）。 看哪里：获得物品、完成任务的那一刻。

v2："侧边滚动列表 / 顶部横幅"去掉位置词；"世界中飘出"= 空间内 + 挂在兴趣点。

吸收的观察轴 / 旧维度：N:提示容器形状、N:提示语义类型、N:拾取文字、N:演出切入、N:提示配图元素

- `feed` **滚动消息列**：一条条往上顶的消息列（参考：Frostpunk s323190_2、Northgard s466560_4）
- `banner` **横幅**：地名、编辑模式（参考：AC Shadows、GameUI#556098）
- `band` **整屏横贯带大字**：横贯屏幕的大字带（参考：GameUI#564135、GameUI#600487）
- `emblem` **圆形徽章 / 纹章**：圆形徽章或纹章弹出（参考：GameUI#563041、GameUI#572353）
- `toast` **圆角提示卡**：小圆角提示卡，几秒后消失（参考：GameUI#1663800、GameUI#594227）
- `pickupText` **小字道具名**：拾取时角落一行道具名（参考：Binding of Isaac s401920_3）
- `cutIn` **立绘切入**：喊招、合体技（参考：GameUI#604583、GameUI#580602）
- `modalCard` **居中弹窗卡**：居中弹出一张卡（参考：GameUI#580609）

#### `el.timer.form` 计时 / 分数 / 回合：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：number） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：Label + 等宽数字

白话：计时 / 分数 / 回合怎么画：数字、回合徽章、回合横幅、比分胶囊、小字倒计时、倒计时环。 看哪里：计时器。

v2："进度环"= gauge；"梯形凹槽框"= vis.silhouette@el.timer = trapezoid；"世界内发车灯"= 叙事内。

吸收的观察轴 / 旧维度：N:计时器容器形状、N:回合/节奏指示、N:序号内嵌

- `number` **数字**：大号或小号数字（参考：Frostpunk、BlazBlue s702890_1）
- `badge` **回合徽章**：回合 / 波次徽章（参考：GameUI#600478、Worms W.M.D s327030_1）
- `turnBanner` **回合横幅**：横幅宣告"第 N 回合"（参考：Wargroove（Turn N））
- `scorePill` **比分胶囊**：双方比分胶囊（参考：Disc Jam s415880_2、GameUI#584770）
- `smallText` **小字倒计时**：小字倒计时（参考：GameUI#556124）
- `gauge` **以数值图形呈现**：倒计时环（形状见 cmp.gauge@el.timer）

#### `el.crosshair.form` 准星 / 瞄准：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布 + 场景内。Godot：TextureRect 居中；落点圈用 Decal

白话：准星长什么样：十字、点、动态扩散、瞄准圈、激光线、地面落点圈、拖拽指向曲线（可多选）。 看哪里：屏幕中心或拖拽时。

v2："武器瞄具"= 叙事内 + 挂在手持物；"无"删掉；加 R2 的拖拽指向曲线（Slay the Spire、Into the Breach）。

- `cross` **十字**：十字准星
- `dot` **点**：一个点（参考：Marvel Rivals s2767030_3）
- `dynamic` **动态扩散**：射击时散开的准星（参考：FPS 惯例）
- `ring` **瞄准圈 + 落点偏移**：瞄准圈并显示落点偏移（参考：World of Warships s552990）
- `laser` **激光线**：一条激光线（参考：Nuclear Throne s242680_2）
- `groundRing` **地面落点圈**：地面上的落点圈（参考：Disc Jam s415880_4）
- `aimArrow` **拖拽指向曲线**：新（R2）（参考：Slay the Spire 2 s2868840_0、Into the Breach）

#### `el.selection.form` 选中信息面板：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：panel） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布 + 场景内。Godot：PanelContainer；选择框用 Decal

白话：选中单位后的信息怎么画：信息面板、单位卡、铭牌、小提示框、选择光圈、肖像行。 看哪里：点选一个单位后。

v2：底部 / 侧面 / 角落去掉位置词，合成 panel / card；"头顶铭牌""世界内 tooltip"= tag / tooltip + 空间内挂在目标。

吸收的观察轴 / 旧维度：N:选中信息面板落点

- `panel` **信息面板**：选中对象的信息面板（属性、命令）（参考：Gears Tactics s1184050_3、Dota 2、Bloons TD 6 s960090_0）
- `card` **单位卡**：单位卡（头像 + 血 + 移动 / 攻击）（参考：Into the Breach s590380_0）
- `tag` **铭牌**：名字 + 小血条的铭牌（参考：Worms W.M.D）
- `tooltip` **tooltip**：跟着对象的小提示框（参考：Into the Breach s590380_3）
- `selectRing` **选择框 / 光圈**：选中单位脚下光圈或框选框（参考：Total War Warhammer II s594570_3）
- `portraits` **肖像行**：选中单位的肖像排成一行（参考：Desperados III s610370_4）

#### `el.party.form` 队伍 / 玩家条：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：frames） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：头像模板 + 排布容器

白话：队友 / 玩家怎么列：头像框 + 小血条、大立绘头像、名牌、单位卡、头像 + 分数。 看哪里：队伍栏。

v2：顶部并排 / 四角 / 侧边竖列 / 网格团队框（R2）= elx.arrangement；头顶名牌 = tag + 挂在玩家。

吸收的观察轴 / 旧维度：N:队伍头像条、N:玩家列表

- `frames` **头像框 + 小血条**：头像框 + 小血条（参考：World of Warcraft、Castle Crashers s204360_1）
- `portraits` **立绘头像（大小区分当前）**：较大的立绘头像，当前角色更大（参考：BlazBlue s702890_1）
- `tag` **名牌**：名字铭牌（参考：Worms W.M.D s327030_0）
- `unitCards` **单位卡条**：底部一排单位卡（参考：Total War Warhammer II s594570_1）
- `scoreRow` **头像 + 分数药丸**：桌游玩家条（参考：Carcassonne s598810_2）

#### `el.clock.form` 时间 / 天气 / 日历：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：clock） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：Label + TextureRect

白话：时间怎么画：时钟数字、太阳盘、日历页、天气徽标、天数大字。 看哪里：时钟。

v2："角落时钟"去掉位置；"太阳位置 / 腕表"= 叙事内。

吸收的观察轴 / 旧维度：N:环境状态叠加

- `clock` **时钟数字**：时钟数字（参考：Prison Architect、Mini Metro）
- `sunDial` **太阳盘 / 日夜钟**：日夜转盘或太阳盘（参考：Don't Starve、GameUI#604642）
- `calendar` **日历页**：日历：季节、日期、星期（参考：Stardew Valley）
- `weather` **天气徽标**：天气图标（参考：GameUI#594251）
- `dayCounter` **天数大字**：大字"第 N 天"（参考：Frostpunk）

#### `el.overlay.form` 信息叠层 / 图例：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：场景内（地面叠层）+ 画布（图例）。Godot：Decal / 着色器叠层；Legend 用 VBox

白话：区域数据怎么叠在地图上：热力图、箭头、状态图标、格子高亮、建造网格、范围圈、全息（可多选）。 看哪里：打开信息视图时的地面。

v2：可多选（R2：Cities Skylines 建筑染色 + 头顶状态图标）。

吸收的观察轴 / 旧维度：N:世界内覆盖层

- `heatmap` **热力图 + 图例**：地图染色 + 图例（参考：Cities Skylines）
- `arrows` **方向箭头**：方向箭头（参考：Factorio（Alt 模式））
- `statusIcons` **状态图标**：机器或建筑头顶状态图标（参考：Cities Skylines、Factorio）
- `gridHighlight` **格子高亮**：可移动 / 攻击范围（参考：Wargroove s607050_3）
- `buildGrid` **建造网格**：可建造网格（参考：Graveyard Keeper s599140_3）
- `rangeRing` **范围圈 / 路线线**：射程、影响范围圈或行军路线（参考：Total War Warhammer II s594570_4、Dota 2）
- `holo` **全息覆盖**：全息线框覆盖场景（参考：Detroit）

#### `el.prompt.form` 按键 / 操作提示：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布（图标集见 ix.glyphs）。Godot：HBox（按键图标 + Label）

白话："现在能按什么"怎么提示：键位列表、情境按键、底部按键图例、触屏按钮、图标角上的热键（可多选）。 看哪里：屏幕角落或底部的按键提示。

v2："角落键位列表""图标角标热键"去掉位置词。D-input 按输入方式改写（触屏 → 触屏按钮；手柄 → 按键图例条）。

- `list` **键位列表**："E 交互 / R 装填"这样的键位列表（参考：Party Hard）
- `contextual` **情境按键**：只显示当下能按的键（参考：DQ Builders 2 s1072420_0）
- `legend` **按键图例条**：底部一条按键图例（确认、返回）（参考：GameUI#545545、Clair Obscur）
- `touchButtons` **触屏按钮**：屏幕上的虚拟按钮与摇杆（参考：GameUI#126496）
- `hotkeyBadge` **图标角标热键**：技能图标角上的热键字母（参考：Dota 2（Q/W/E/R））

#### `el.cta.form` 主行动按钮：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：wide） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：Button（Primary 变体）

白话：主按钮长什么样：宽按钮、大圆钮、一对按钮、快门。 看哪里：最该按的那个按钮。

v2（R1）：只剩形态。右下 / 底部居中 = 锚点；巨型 PLAY = wide + elx.scale 2；每行一个 = cmp.listRow 的行内按钮；场景内点击 = lay.nav = hotspots；结束回合是按钮文案（内容），不是画法；勾叉大圆钮 = dual + vis.silhouette@el.cta = circle。

吸收的观察轴 / 旧维度：N:主行动按钮形态、N:主按钮位置与文案、N:CTA按钮形态、N:抽取CTA配置、N:进入按钮、N:确认取消按钮、N:后续出口按钮

- `wide` **宽按钮**：宽按钮（底部居中、右下、巨型 PLAY 都是它 + 锚点 / 大小）（参考：GameUI#594209、GameUI#584795、GameUI#1663798）
- `round` **大圆钮**：大圆钮（结束回合、攻击）（参考：Frostpunk s323190_2、Slay the Spire 2（结束回合））
- `dual` **一对按钮**：一次 / 十次（带消耗）、✓ / ✕（参考：GameUI#604664、Carcassonne s598810_2）
- `shutter` **快门**：外圈 + 实心圆（参考：GameUI#126496）

#### `el.title.form` 标题 / LOGO：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：logo） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布 + 素材（字族见 typ.display.family）。Godot：Label / TextureRect

白话：标题 / LOGO 怎么出现：LOGO、章节标题卡、页眉标题条、艺术大字。 看哪里：界面最上面或正中的大字。

v2：大 LOGO / 角落小 LOGO = logo + 大小与锚点；"无标题"删掉。

吸收的观察轴 / 旧维度：N:Logo 位置、N:Logo 露出方式、N:标题卡形态、N:活动艺术字标题

- `logo` **LOGO**：LOGO（大小与位置用 elx.scale / 锚点）（参考：GameUI#1762374、GameUI#1743961、GameUI#1663799）
- `titleCard` **章节标题卡**：章节标题卡（序号 + 标题）（参考：Monument Valley s1927720_5、GameUI#572342）
- `header` **页眉标题条**：面板顶部标题条（参考：GameUI#1743964）
- `artTitle` **艺术大字海报标题**：海报式艺术大字标题（参考：GameUI#1748413、GameUI#584794） 〔需素材〕

#### `el.reward.form` 奖励 / 获得物：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：icons） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布 + 素材（图标集）。Godot：物品格子场景 + 排布容器

白话：奖励怎么摆：图标 + 数量、单件特写、卡牌、立绘登场、宝箱、大奖励卡。 看哪里：获得物品的那一屏。

v2：图标行 / 网格 / 里程碑轨道 = icons + elx.arrangement（row / grid / track）。

吸收的观察轴 / 旧维度：N:奖励展示形态、N:奖励预览深度、N:奖励表达、N:附件奖励展示、N:附带奖励预览、N:关联奖励展示

- `icons` **图标 + 数量**：奖励图标 + 数量（排成一行或网格见 elx.arrangement）（参考：GameUI#625059、GameUI#1511429）
- `single` **单件特写**：只展示一件大奖（参考：GameUI#603729）
- `cards` **卡牌平铺**：卡牌平铺（参考：GameUI#592086）
- `portrait` **立绘登场**：新角色立绘登场（参考：GameUI#604594） 〔需素材〕
- `chest` **宝箱 + 物品**：宝箱 + 掉出的物品（参考：GameUI#596114）
- `bigCard` **大奖励卡 + 数量缎带**：大奖励卡 + 数量缎带（参考：GameUI#559123）

#### `el.cost.form` 价格 / 消耗：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：inButton） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：HBox（图标 + Label）

白话：价格 / 消耗怎么显示：按钮里、价签、图标 + 数字、巨字、持有 / 需求、免费次数、材料格、买卖价表。 看哪里：购买和升级按钮附近。

v2（R1）：价格就是一种消耗——v1 的 ops.price 并入这里，v1 el.resources.form = haveNeed 也并到这里。

吸收的观察轴 / 旧维度：N:成本/需求呈现、N:材料消耗展示、N:升级货币/技能点、N:价格与购买钮位置、N:价格呈现、N:价格与货币呈现

- `inButton` **按钮内嵌价 / 消耗**："¥6.00""2000 金"（参考：GameUI#580683、GameUI#563019）
- `tag` **价签 / 胶囊**：价签（参考：GameUI#507449）
- `iconNumber` **货币图标 + 数字**：货币图标 + 数字（参考：GameUI#604615）
- `bigNumber` **巨字价格**："一元"（参考：GameUI#575920）
- `haveNeed` **持有 / 需求（红绿）**：持有 / 需求，不足标红（参考：GameUI#594237）
- `freeTag` **免费次数标签**："免费 1 次"标签（参考：GameUI#1698121）
- `slots` **材料格**：所需材料一格一格列出（参考：GameUI#580654）
- `bidTable` **买价 / 卖价多列**：买价、卖价、竞价分列（参考：GameUI#436616）

#### `el.rank.form` 名次 / 段位 / 评级：画法

设计参数 · 范围：信息元素 · 类型：多选（有序，第一个是主画法） · 默认：（空） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

多选合并：替换

实现：画布 + 素材（徽章）。Godot：TextureRect + Label

白话：名次 / 评级怎么画：段位徽章、名次数字、评分字母、星级、奖牌（可多选）。 看哪里：结算和排行。

v2（R1）：删"榜单行"（= cmp.listRow）、"自身排名固定行"（= lay.pinned = pinBottom）、"比分条"（= el.timer.form = scorePill 或 st.statViz = versusBar）；"MVP 奖牌"= medal。

吸收的观察轴 / 旧维度：N:评级体系、N:结果类别、N:段位/等级徽章

- `badge` **段位徽章**：设计见 cmp.badge（参考：GameUI#594340、DJMAX s960170_5）
- `number` **名次数字**：名次数字（参考：GameUI#596121）
- `letter` **评分字母（S / A / B）**：S / A / B 字母评分（参考：MGSV（结算）、GameUI#592100）
- `stars` **星级评价**：星级评价（参考：GameUI#1463172）
- `medal` **奖牌 / MVP**：奖牌 / MVP 牌（参考：GameUI#594345）

#### `el.profile.form` 身份 / 头像 / 等级：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：avatarLevel） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：HBox（头像 + 名字 + 等级）

白话："我是谁"怎么显示：头像 + 等级、名片、Lv + 经验条、称号横幅。 看哪里：左上角的头像。

v2：删"战力大数字"（= st.statViz = bigNumber，参考图相同）。

- `avatarLevel` **头像 + 等级**：头像 + 等级（参考：GameUI#1743963）
- `idCard` **名片**：名片：头像、名字、签名、徽章（参考：GameUI#604599）
- `levelBar` **Lv + 经验条**：Lv 数字 + 经验条（参考：GameUI#1748484）
- `titleBanner` **称号横幅**：称号横幅（参考：GameUI#646844）

#### `el.loading.form` 加载 / 等待指示：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：gauge） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布 + 动画预览。Godot：TextureProgressBar / AnimatedSprite2D

白话：等待时显示什么：进度图形、转圈、母题动画、下载速度、只有提示文字。 看哪里：读取界面。

v2：底边细线 / 粗胶囊 / 右下细线 + 百分比 = gauge（cmp.gauge@el.loading）+ elx.valueLabel = percent + 锚点。

吸收的观察轴 / 旧维度：N:加载指示器形态、N:加载与更新反馈、N:等待指示、N:加载进度共存

- `gauge` **进度图形**：形状见 cmp.gauge@el.loading（参考：GameUI#943691、GameUI#1370789、GameUI#1775202）
- `spinner` **转圈**：转圈（参考：GameUI#1767142）
- `motif` **母题化（指南针 / 地球 / 放大镜）**：主题化的指示物（指南针、地球、放大镜）（参考：GameUI#577638、GameUI#584767）
- `download` **下载速度 + 体积**：下载速度与剩余体积（参考：GameUI#604574）
- `tipsOnly` **只有提示文字**：只有一行提示文字（参考：GameUI#1663799）

#### `el.guide.form` 引导指示 / 聚光：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：finger） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布 + 动画预览。Godot：全屏 Control + 镂空着色器

白话：引导指向怎么画：手指、光圈脉冲、箭头、高亮方块、暗幕镂空、NPC 气泡。 看哪里：新手引导时被点亮的地方。

引导用的脉冲只在这里（ring）。

吸收的观察轴 / 旧维度：N:引导指示符、N:遮罩与聚光、N:新手引导气泡、N:新手引导层、N:教程引导代言人

- `finger` **手指**：一只手指指着目标（参考：GameUI#584773）
- `ring` **光圈脉冲**：目标外一圈脉冲光圈（参考：GameUI#572348）
- `arrow` **箭头**：箭头指向目标（参考：GameUI#580600）
- `box` **高亮方块**：高亮方框框住目标（参考：GameUI#604587）
- `spotlight` **暗幕镂空**：全屏变暗，只露出目标（参考：GameUI#585162）
- `npcBubble` **NPC 气泡（对话推进式引导）**：NPC 气泡说明（参考：GameUI#556132、GameUI#1511384）

#### `el.chat.form` 聊天：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：collapsed） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：RichTextLabel + ScrollContainer + LineEdit

白话：聊天怎么显示：折叠框、频道文本行、气泡流。 看哪里：聊天区。

v2（R1）：跑马灯 = flow.chrome = chatTicker；半屏抽屉 = lay.container = drawer。

吸收的观察轴 / 旧维度：N:频道结构、N:输入区、N:自己/他人区分、N:社交面板并列

- `collapsed` **折叠框**：角落折叠的聊天框（参考：GameUI#1694106）
- `lines` **频道文本行**：[频道] 名字：内容 的文本行（参考：GameUI#943780）
- `bubbles` **气泡流**：左右气泡流（参考：GameUI#646881）

#### `el.gameSpeed.form` 倍速 / 暂停 / 自动：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：pauseMenu） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：Button 组 + Engine.time_scale

白话：节奏控件：暂停 + 设置、倍速按钮、自动托管、暂停 / 1x / 2x 按钮条、播放 / 快进。 看哪里：右上或右下的速度按钮。

吸收的观察轴 / 旧维度：N:自动/倍速/暂停控件

- `pauseMenu` **暂停 + 设置按钮**：暂停按钮 + 设置按钮（参考：GameUI#600482）
- `x2` **倍速按钮**：一个 ×2 倍速按钮（参考：GameUI#580605）
- `autoBattle` **自动托管**："自动"托管按钮（参考：GameUI#596127）
- `speedBar` **暂停 / 1x / 2x 按钮条**：暂停 / 1× / 2× 一组按钮（参考：Frostpunk s323190_2）
- `playFF` **▶ / ▶▶**：播放 / 快进三角（参考：Bloons TD 6 s960090_0、Mini Metro）

#### `el.meter.form` 世界 / 社会态势条：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：single） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：TextureProgressBar + 图标

白话：局势条的构成：单项、图标 + 仪表、两项对立、多项堆叠（形状见 cmp.gauge）。 看哪里：温度、希望 / 不满、警戒这类条。

v2 新增（R2）：温度、希望 / 不满、通缉 / 热度、警戒发现度、理智。形状用 cmp.gauge@el.meter（含温度计、眼睛、双向条）。

吸收的观察轴 / 旧维度：N:状态的世界内表达

- `single` **单项**：一个量一个图形（参考：NFS Heat（热度））
- `withIcon` **图标 + 仪表**：图标 + 仪表（参考：Frostpunk（温度））
- `paired` **两项对立**：希望 / 不满（参考：Frostpunk）
- `stack` **多项堆叠**：几条态势叠在一起（参考：Darkest Dungeon（压力））

#### `el.toolbar.form` 建造栏 / 系统入口条：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：categoryTabs） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：HBox / TabBar + 子项抽屉

白话：建造栏 / 系统入口条：分类页签 + 子项、图标按钮排、系统入口小图标。 看哪里：底部建造栏或角落入口。

v2 新增（R2）：Anno 底部建造栏、Frostpunk 底部圆形按钮。排布用 elx.arrangement（环形建造菜单 = ring）。

吸收的观察轴 / 旧维度：N:功能入口组织（局内部分）

- `categoryTabs` **分类页签 + 子项抽屉**：分类页签，点开是该类的建造项（参考：Anno 1800、Cities Skylines）
- `buttonRow` **图标按钮排**：一排图标按钮（参考：Frostpunk s323190_2）
- `microMenu` **系统入口小图标**：背包、地图、设置的小图标排（参考：World of Warcraft（微型菜单））

#### `el.turnOrder.form` 行动顺序：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：portraitQueue） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：HBox / VBox 头像队列

白话："下一个轮到谁"怎么排：头像队列、速度时间轴、小图标队列。 看哪里：行动顺序条。

v2 新增（R2）：Clair Obscur、JRPG、战棋。排布用 elx.arrangement，轮廓用 vis.silhouette@el.turnOrder。

- `portraitQueue` **头像队列**：头像排队（参考：Clair Obscur s1903340_5、Darkest Dungeon）
- `timeline` **速度时间轴**：按行动值排在刻度上（参考：Final Fantasy X（CTB）、Honkai: Star Rail）
- `icons` **小图标队列**：小图标排队（参考：Into the Breach）

#### `el.choices.form` 对话 / 事件选项：画法

设计参数 · 范围：信息元素 · 类型：单选 · 默认：跟随（兜底：text） · 分层：tier 2 · 页签：元素检查器 · 展示：静帧 · 里程碑：M5a

实现：画布。Godot：VBoxContainer + Button

白话：对话 / 事件选项的样子：文字行、按钮、并列横幅、聊天气泡（排成竖列、横排还是一圈见内部排布）。 看哪里：对话选项。

v2 新增（R1：v1 的 cmp.choice 混了排布、轮廓、放置）：排布 = elx.arrangement（竖列 / 横排 / 环 = 对话轮盘），轮廓 = vis.silhouette@el.choices（药丸 = box + 圆角 50%、六边斜切 = hexagon + vis.skew@el.choices），浮在世界里 = elx.diegesis = spatial。

吸收的观察轴 / 旧维度：N:选项呈现、N:对话选项布局、N:对话选项形态、N:事件选项形态、N:互动选项呈现

- `text` **文字行**：当前项色条高亮（参考：Night Call s680380_3）
- `buttons` **按钮**：按钮式选项（药丸、竖排按钮）（参考：Frostpunk s323190_4、Slay the Spire 2 s2868840_5、Zelda BotW（药丸））
- `banners` **并列横幅**：几条并列的横幅（参考：GameUI#572332、GameUI#572333）
- `bubbles` **聊天气泡**：像聊天回复一样的气泡（参考：GameUI#577642）

### 2.19 共用词表

**材质表**（`ast.coreMat` / `ast.frameMat` / `ast.bgMat` 共用；素材生成提示词 = 外框或内芯结构 × 材质 × 母题 × 装饰预算）

- `paper` **米白纸**：最通用的内芯；纸纹素材已有（参考：GameUI#534802#1、GameUI#646842）
- `parchment` **羊皮纸**：暗角、旧纸斑（参考：Anno 1800、WoW 任务、GameUI#567648）
- `xuan` **宣纸**：纤维纹、墨洇（参考：GameUI#134914、ink 皮肤）
- `silk` **绢本**：细密经纬、偏黄（参考：现成素材（assets.json））
- `cloth` **布 / 幕布 / 绗缝**（参考：GameUI#128393#1、Armello） 〔需素材〕
- `leather` **皮革**：深红褐、缝线（参考：Civ VI（深红褐皮面板）、Desperados III s610370_4） 〔需素材〕
- `wood` **木**：木纹、木板拼接（参考：Hearthstone、GameUI#580656、Carcassonne s598810_1） 〔需素材〕
- `stone` **石**：石块、刻痕（参考：Total War Warhammer II s594570_0、Grim Dawn s219990_3） 〔需素材〕
- `gold` **金**：浮雕金、金箔（参考：GameUI#535009、GameUI#943792） 〔需素材〕
- `bronze` **青铜**：铜绿、嵌宝石（参考：Hades） 〔需素材〕
- `iron` **铁 / 钢 / 拉丝金属**：拉丝、螺栓、工业厚板（参考：Dota 2 s570_0、GameUI#462112） 〔需素材〕
- `ice` **冰霜金属**：结霜的金属（参考：Frostpunk） 〔需素材〕
- `jade` **玉 / 瓷**（参考：GameUI#129374） 〔需素材〕
- `lacquer` **红漆**：国潮红漆、描金（参考：GameUI#535026） 〔需素材〕
- `plastic` **塑料 / 糖果**：高光塑料、Q 版（参考：GameUI#562993、GameUI#215019）
- `hologram` **全息网格**：扫描网格、半透明光面（参考：Detroit、Cyberpunk 2077）
- `lineArt` **线描 / 平涂**：没有材质感的纯色线条与色块（白 / 金细线花饰）（参考：Hollow Knight、Clair Obscur） 〔需素材〕

**按组件覆盖的目标**

`panel` 面板 · `modal` 弹窗 · `button` 按钮 · `tab` 页签 · `bar` 数值条 · `slot` 格子 · `tooltip` 提示框 · `titleBar` 面板标题条 · `listRow` 列表行 · `nameplate` 名牌 · `dialog` 对话框 · `minimapFrame` 小地图框 · `icon` 图标底座 · `avatar` 头像 · `badge` 徽章 · `plate` 标牌 · `card` 卡牌 · `node` 节点 · `input` 输入框

**角色**（只对个别参数有意义）

- `cmp.plate`：`@title` 标题、`@name` 说话人 / 角色名、`@rank` 名次 / 段位、`@button` 按钮、`@stateTag` 状态角标（已领取、推荐）
- `cmp.gauge`：`@progress` 进度（完成了多少：任务、通行证、收集）

**信息元素**（`cnt.elements` 的取值；也是 `<参数>@el.<元素>` 的覆盖目标；"数值" = 可用 `cmp.gauge@` 与 `elx.valueLabel`）

| 元素 | 名称 | 回答 | 数值 |
|---|---|---|---|
| `el.vitals` | 生命 / 护盾 / 体力 | 我还能撑多久 | ✓ |
| `el.resources` | 资源 / 货币 | 我有多少可以花 | ✓ |
| `el.abilities` | 技能 / 冷却 / 弹药 / 手牌 | 我现在能做什么动作 | ✓ |
| `el.minimap` | 小地图 / 罗盘 | 周围是什么 |  |
| `el.objective` | 目标 / 路点 | 现在该干什么 |  |
| `el.interact` | 交互提示 | 这个能不能用 |  |
| `el.threat` | 敌人血条 / 预警 / 意图 | 谁在威胁我 | ✓ |
| `el.feedback` | 命中反馈 / 连击 | 刚才那下有没有效 |  |
| `el.notify` | 通知 / 大字提示 | 刚刚发生了什么 |  |
| `el.timer` | 计时 / 分数 / 回合 | 节奏与成绩 | ✓ |
| `el.speed` | 速度 / 名次 | 开多快、排第几 | ✓ |
| `el.crosshair` | 准星 / 瞄准 | 我瞄着哪 |  |
| `el.selection` | 选中信息面板 | 选中的是什么 |  |
| `el.party` | 队伍 / 玩家条 | 队友怎么样 | ✓ |
| `el.clock` | 时间 / 天气 / 日历 | 现在几点几号 |  |
| `el.overlay` | 信息叠层 / 图例 | 整片区域的数据分布 |  |
| `el.prompt` | 按键 / 操作提示 | 现在能按什么 |  |
| `el.subtitle` | 字幕 / 说话人 | 谁在说什么 |  |
| `el.cta` | 主行动按钮 | 下一步点哪 |  |
| `el.title` | 标题 / LOGO | 这是哪一屏 |  |
| `el.reward` | 奖励 / 获得物 | 得到了什么 |  |
| `el.cost` | 价格 / 消耗 | 要花什么 |  |
| `el.rank` | 名次 / 段位 / 评级 | 我排第几 |  |
| `el.profile` | 身份 / 头像 / 等级 | 我是谁 | ✓ |
| `el.loading` | 加载 / 等待指示 | 还要等多久 | ✓ |
| `el.guide` | 引导指示 / 聚光 | 该点哪里 |  |
| `el.chat` | 聊天 | 其他人在说什么 |  |
| `el.gameSpeed` | 倍速 / 暂停 / 自动 | 节奏怎么控制 |  |
| `el.meter` | 世界 / 社会态势条 | 局势怎么样：温度、希望、通缉、警戒 | ✓ |
| `el.toolbar` | 建造栏 / 系统入口条 | 能造什么、能打开什么 |  |
| `el.turnOrder` | 行动顺序 | 下一个轮到谁 | ✓ |
| `el.choices` | 对话 / 事件选项 | 我可以怎么回答 |  |

## 3. 预设

每个预设只写它拥有的参数，其余保持跟随。生成器校验了每个键都存在（含覆盖键与元素实例键）、每个值合法、没有越界、没有设"被自己关掉"的参数、没有违反约束。

### 3.1 皮肤（形与面；`hud.style` 的选项，id 不变）

皮肤只拥有"形与面"（转角、描边、阴影、光泽、填充、不透明度、色彩策略与面板明度、字体、动效性格、按下与焦点）。材质与母题由引用的关键词（`keyword`）或只属于该皮肤的 `keywordDefaults` 给；版式与交互建议放 `suggests`，默认不套用。v1 与关键词重名的皮肤改为"形与面 + 引用关键词"，定义只有一份（C-keyword-dup 检查）。

| id | 名称 | 浏览家族 | 状态 | 说明 | 来源 | 参考 | 形与面 | 材质与母题 | 建议（不默认套用） |
|---|---|---|---|---|---|---|---|---|---|
| `skin.neobrutal` | 新粗野主义 | 平面现代 | 可实时 · 纯程序 | 粗黑边、错位硬投影、高饱和色块 | B1；现有 neobrutal | NN/g Neobrutalism、neobrutal 皮肤 | `vis.corner`=圆角；`vis.cornerSize`=8；`vis.opacity`=1；`vis.fill`=纯色；`vis.stroke`=实线；`vis.strokeWidth`=3；`vis.strokeColor`=墨色；`vis.depth`=错位硬投影；`col.lightness`=浅色面板；`col.strategy`=骨架多色；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.body.case`=全大写；`typ.display.family`=同正文；`vis.iconStyle`=线性；`ix.press`=下沉到阴影；`mo.easing`=线性 | `vis.ornament`=0；`vis.motif`=无 |  |
| `skin.glass` | 毛玻璃 | 平面现代 | 可实时 · 纯程序 | 半透明 + 背景模糊 + 1px 亮边 | B2；现有 glass | NN/g Glassmorphism、GameUI#594204 | `vis.corner`=圆角；`vis.cornerSize`=33；`vis.fill`=纯色；`vis.opacity`=0.18；`vis.blur`=12；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=高光亮边；`vis.depth`=柔投影；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`typ.legibility`=投影；`mo.enter`=淡入 |  |  |
| `skin.neumorph` | 新拟态 | 平面现代 | 待做 · 纯程序 | 与底同色、双向软阴影 | B3 | CSS-Tricks Neumorphism | `vis.corner`=圆角；`vis.cornerSize`=42；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=无描边；`vis.depth`=软塑料双向阴影；`col.lightness`=浅色面板；`col.strategy`=单色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`ix.press`=下沉到阴影 |  |  |
| `skin.flat` | 扁平 / Material | 平面现代 | 可实时 · 纯程序 | 纯色卡片、圆角、轻投影 | B4；现有 flat | Mini Metro、Alto's Adventure | `vis.corner`=圆角；`vis.cornerSize`=20；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=无描边；`vis.depth`=柔投影；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`vis.iconStyle`=扁平填充；`ix.press`=波纹；`mo.easing`=缓出 |  |  |
| `skin.skeuo` | 拟物 | 奇幻实物 | 待做 · 重素材 | 木、金属、纸的实物质感与倒角 | B5 | Hearthstone、Papers, Please、The Room | `vis.depth`=倒角浮雕；`vis.opacity`=1；`col.lightness`=中明度；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`typ.display.case`=小型大写；`vis.iconStyle`=写实；`mo.easing`=弹簧 | 引用 `kw.rustic` | `mo.transition`=镜头推进到物件 |
| `skin.pixel` | 像素位图 | 复古媒介 | 可实时 · 重素材 | 像素字、像素边框、整数缩放 | B6；现有 pixel | Celeste、Undertale、Stardew Valley | `vis.corner`=像素台阶；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=4；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=像素；`typ.body.weight`=常规；`typ.display.family`=像素标题；`typ.numerals.family`=像素数字；`vis.pixelScale`=3 倍像素；`vis.iconStyle`=像素；`mo.easing`=线性；`mo.frameRate`=一拍二（12fps）；`mo.textReveal`=打字机逐字 | `vis.ornament`=0 |  |
| `skin.pixelWood` | 像素木框 | 复古媒介 | 待做 · 重素材 | 橙色木板像素框 + 米色内芯 + 头像框 | IIG：圆润友好（像素木框） | Stardew Valley s413150_4、Moonlighter s606150_0 | `vis.corner`=像素台阶；`vis.pixelScale`=与世界同网格；`vis.opacity`=1；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=像素；`typ.body.weight`=常规；`typ.display.family`=像素标题；`mo.textReveal`=打字机逐字；`vis.iconStyle`=像素 | 引用 `kw.rustic` | `cmp.dialogBox`=底部通栏；`rel.harmony`=同一媒介 |
| `skin.handdrawn` | 手绘笔记本 | 复古媒介 | 可实时 · 纯程序 | 方格纸、歪线、手写字 | B7；现有 handdrawn | Return of the Obra Dinn、Doodle Jump | `vis.corner`=圆角；`vis.cornerSize`=15；`vis.jitter`=0.6；`vis.fill`=纯色；`vis.pattern`=方格纸；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=2；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=楷书 / 手写感；`typ.body.weight`=常规；`typ.display.family`=手写；`mo.enter`=淡入；`vis.iconStyle`=线性 |  |  |
| `skin.ink` | 国风水墨 / 墨笔 | 东方 | 可实时 · 重素材 | 宣纸、墨刷边、书法标题、朱红印章 | B8；现有 ink；IIG：墨笔 | Black Myth: Wukong、Red Dead Redemption 2、GameUI#134914 | `vis.corner`=直角；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=2；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=楷书 / 手写感；`typ.body.weight`=常规；`mo.enter`=墨晕 / 笔刷擦出 | 引用 `kw.ink` |  |
| `skin.scifi` | 科幻 HUD | 科幻 | 可实时 · 纯程序 | 青色细线、切角、扫描线、等宽大写 | B9；现有 scifi | Dead Space、Halo、XCOM 2 | `vis.corner`=切角；`vis.cornerSize`=15；`vis.fill`=纯色；`vis.opacity`=0.45；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=强调色；`vis.strokeGlow`=0.4；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=单色；`typ.body.family`=窄体；`typ.body.weight`=常规；`typ.body.case`=全大写；`typ.body.tracking`=0.2；`typ.display.family`=同正文；`mo.enter`=扫描开机；`mo.textReveal`=乱码解码 | 引用 `kw.tech` |  |
| `skin.holo` | 全息空间 | 科幻 | 待做 · 纯程序 | 线框网格贴在场景里、透视倾斜面板、色差故障 | IIG：全息空间 | Detroit: Become Human、Cyberpunk 2077、MGSV iDroid | `vis.corner`=直角；`vis.opacity`=0.25；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=强调色；`vis.strokeGlow`=0.6；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=单色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.body.case`=全大写；`typ.display.family`=同正文；`mo.enter`=故障闪现；`mo.textReveal`=乱码解码 | 引用 `kw.cyber` | `rel.diegesis`=空间内；`rel.worldRender`=透视贴面 |
| `skin.jrpg` | JRPG 窗口 | 奇幻实物 | 可实时 · 纯程序 | 蓝渐变底 + 白色双线圆角框 + 手指光标 | B10；现有 jrpg | Final Fantasy、Dragon Quest、Octopath Traveler | `vis.corner`=圆角；`vis.cornerSize`=12；`vis.fill`=渐变；`vis.opacity`=0.95；`vis.stroke`=双线；`vis.strokeWidth`=2；`vis.strokeColor`=高光亮边；`vis.depth`=柔投影；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`typ.legibility`=投影；`ix.focus`=光标指示（手指 / 三角 / 括号）；`mo.textReveal`=打字机逐字 |  |  |
| `skin.parchment` | 羊皮纸任务书 | 奇幻实物 | 可实时 · 重素材 | 羊皮纸内芯 + 深色缎带小标题 + 手绘肖像 | B11；现有 parchment；IIG：羊皮纸任务书 / 古海图 | Anno 1800、World of Warcraft（任务）、Civ VI | `vis.corner`=直角；`vis.opacity`=1；`vis.depth`=内阴影 / 内凹；`vis.stroke`=实线；`vis.strokeWidth`=1.5；`vis.strokeColor`=同色加深；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`typ.display.case`=小型大写；`vis.iconStyle`=手绘彩绘；`mo.enter`=展开（卷轴） | 引用 `kw.questBook` |  |
| `skin.comic` | 漫画对话框 | 复古媒介 | 可实时 · 纯程序 | 粗黑边气泡、网点、拟声字 | B12；现有 comic | Comix Zone、Viewtiful Joe、Hi-Fi Rush | `vis.corner`=圆角；`vis.cornerSize`=29；`vis.fill`=纯色；`vis.pattern`=网点；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=3；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=骨架多色；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=无衬线；`typ.display.weight`=特粗；`typ.display.style`=斜体；`mo.enter`=砸入（放大落下 + 震）；`mo.juice`=0.8 |  | `cmp.dialogBox`=带尾气泡 |
| `skin.slant` | 倾斜动感 | 科幻 | 待做 · 纯程序 | 平行四边形面板、斜体数字、速度线 | IIG：倾斜动感 / 漫画 | Overwatch、NFS Heat、No Man's Sky | `vis.corner`=直角；`vis.skew`=-12；`vis.opacity`=0.9；`vis.stroke`=无描边；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=无衬线；`typ.display.weight`=特粗；`typ.display.style`=斜体；`typ.numerals.family`=大号展示数字；`typ.numerals.style`=斜体；`mo.enter`=斜切划入 / 遮罩擦除；`mo.juice`=0.8 |  | `ast.fx`=面板速度线 |
| `skin.terminal` | CRT 终端 | 复古媒介 | 可实时 · 纯程序 | 黑底单色荧光字、扫描线、括号按键 | B13；现有 terminal | Fallout（终端）、Alien: Isolation、SUPERHOT s322500_3 | `vis.corner`=直角；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=强调色；`vis.opacity`=0.82；`vis.depth`=平面；`col.strategy`=单色；`col.lightness`=深色面板；`typ.body.family`=等宽 / 终端；`typ.body.weight`=常规；`typ.display.family`=同正文；`typ.legibility`=文字发光；`mo.textReveal`=打字机逐字；`ix.focus`=底色反白 |  | `ix.glyphs`=括号文字 [E]；`ast.fx`=扫描线；`hier.cta`=实心 vs 描边 |
| `skin.y2k` | Y2K 镀铬 | 复古媒介 | 可实时 · 纯程序 | 银色金属渐变、胶囊、半透明塑料 | B14；现有 y2k | Wipeout、Jet Set Radio | `vis.corner`=圆角；`vis.cornerSize`=38；`vis.fill`=渐变；`vis.opacity`=1；`vis.gloss`=镀铬条带；`vis.depth`=倒角浮雕；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=高光亮边；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=圆体；`typ.display.weight`=粗；`mo.idle`=光效扫过 |  |  |
| `skin.swiss` | 瑞士几何 / 极简表格 | 平面现代 | 可实时 · 纯程序 | 网格、左侧色条、超大粗体字、单色 + 一个强调 | B15；现有 swiss；IIG：瑞士几何 | Mini Metro、Control、MGSV（结算） | `vis.corner`=直角；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=3；`vis.strokeSides`=只画左边；`vis.strokeColor`=强调色；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`typ.display.weight`=特粗；`typ.scale`=2；`mo.enter`=硬切；`ix.focus`=底色反白 | `vis.ornament`=0；`vis.motif`=无 | `lay.grid`=12 栏；`cmp.tabIndicator`=下划线 |
| `skin.constructivist` | 构成主义 | 复古媒介 | 可实时 · 纯程序 | 红黑白、斜向构图、粗压缩字 | B16；现有 constructivist | Papers, Please | `vis.corner`=直角；`vis.skew`=-6；`vis.opacity`=1；`vis.stroke`=无描边；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=双色调；`col.accent`=#c8102e；`col.accent2`=#111111；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=窄体；`typ.display.weight`=粗；`typ.display.case`=全大写；`mo.enter`=斜切划入 / 遮罩擦除 |  |  |
| `skin.deco` | 装饰艺术 | 复古媒介 | 待做 · 纯程序 | 黑金细双线、放射纹、宽字距大写 | B17 | BioShock、Grim Fandango | `vis.corner`=切角；`vis.cornerSize`=10；`vis.opacity`=1；`vis.stroke`=双线；`vis.strokeWidth`=1；`vis.strokeColor`=金属金 / 铜；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`col.accent`=#c9a54c；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=无衬线；`typ.display.weight`=细；`typ.display.case`=全大写；`typ.display.tracking`=0.2 | `vis.motif`=几何线 / 同心圆；`vis.ornament`=2 |  |
| `skin.persona` | Persona 拼贴 | 复古媒介 | 待做 · 重素材 | 红黑白、锯齿倾斜、勒索信字 | B18 | Persona 5 | `vis.corner`=直角；`vis.skew`=-8；`vis.jitter`=0.2；`vis.opacity`=1；`vis.stroke`=无描边；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=双色调；`col.accent`=#e60012；`col.accent2`=#ffffff；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=拼贴勒索信；`mo.enter`=斜切划入 / 遮罩擦除；`mo.juice`=0.9 |  | `mo.transition`=用新界面的入场动效 |
| `skin.memphis` | 孟菲斯 | 复古媒介 | 待做 · 纯程序 | 糖果色、黑粗边、波点碎屑 | B19 | Splatoon（相近，未核实） | `vis.corner`=圆角；`vis.cornerSize`=17；`vis.fill`=纯色；`vis.pattern`=圆点；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=3；`vis.strokeColor`=墨色；`vis.depth`=错位硬投影；`col.lightness`=浅色面板；`col.strategy`=骨架多色；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=圆体；`typ.display.weight`=粗；`mo.easing`=回弹 |  |  |
| `skin.mono` | 极简单色 | 平面现代 | 待做 · 纯程序 | 灰阶 + 至多一个强调色，几乎没有容器 | B20 | Limbo、Inside、Journey | `vis.corner`=直角；`vis.opacity`=0；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=细；`typ.display.family`=同正文；`typ.legibility`=投影；`vis.iconStyle`=线性；`mo.enter`=淡入；`mo.duration`=0.6 | `vis.ornament`=0；`vis.motif`=无 |  |
| `skin.thinGeo` | 细线几何 | 平面现代 | 待做 · 纯程序 | 同心圆、轨道、细线图标、宽字距，几乎没有面板 | IIG：细线几何 | GRIS、Monument Valley、Destiny 2 | `vis.corner`=圆角；`vis.cornerSize`=50；`vis.opacity`=0；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=高光亮边；`vis.depth`=平面；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=无衬线；`typ.body.weight`=细；`typ.display.family`=无衬线；`typ.display.weight`=细；`typ.display.tracking`=0.3；`typ.legibility`=投影；`vis.iconStyle`=线性；`mo.enter`=淡入 | `vis.ornament`=1；`vis.motif`=几何线 / 同心圆 |  |
| `skin.aero` | Frutiger Aero | 平面现代 | 待做 · 纯程序 | 光泽玻璃按钮、天蓝草绿、气泡 | B21 | Wii Sports、The Sims 3、Fruit Ninja | `vis.corner`=圆角；`vis.cornerSize`=29；`vis.gloss`=顶部玻璃高光；`vis.fill`=渐变；`vis.opacity`=0.9；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=高光亮边；`vis.depth`=柔投影；`col.lightness`=浅色面板；`col.strategy`=骨架多色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=圆体；`mo.idle`=粒子漂浮 |  |  |
| `skin.synth` | 合成波 / 蒸汽波 | 复古媒介 | 待做 · 纯程序 | 粉青紫霓虹、透视网格、多层发光 | B22 | Far Cry 3: Blood Dragon、Hotline Miami | `vis.corner`=直角；`vis.opacity`=0.6；`vis.stroke`=实线；`vis.strokeWidth`=2；`vis.strokeColor`=强调色；`vis.strokeGlow`=0.8；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=双色调；`col.accent`=#ff3cac；`col.accent2`=#2bd2ff；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=无衬线；`typ.display.weight`=特粗；`typ.display.style`=斜体 | `ast.fx`=外发光、扫描线；`typ.titleFx`=标题发光；`vis.pattern`=方格纸 |  |
| `skin.military` | 军事战术 | 科幻 | 待做 · 纯程序 | 橄榄 / 琥珀、模板字、等宽数字、角标括号 | B23 | ARMA 3、Call of Duty: MW、XCOM（战略层） | `vis.corner`=直角；`vis.opacity`=0.85；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeSides`=只画四角；`vis.depth`=平面；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=等宽 / 终端；`typ.body.weight`=常规；`typ.body.case`=全大写；`typ.numerals.family`=等宽数字；`typ.display.family`=模板字；`mo.enter`=硬切 | `vis.motif`=角括号 / 准星角；`vis.ornament`=1 |  |
| `skin.cozy` | 圆润友好 | 可爱手游 | 待做 · 纯程序 | 圆胖气泡、药丸名牌、圆点底、回弹 | B24；IIG：圆润友好 | Animal Crossing: NH、A Short Hike、Zelda BotW（选项药丸） | `vis.corner`=圆角；`vis.cornerSize`=50；`vis.fill`=纯色；`vis.pattern`=圆点；`vis.opacity`=1；`vis.depth`=柔投影；`vis.stroke`=无描边；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=圆体；`typ.body.weight`=常规；`typ.display.family`=圆体；`typ.display.weight`=粗；`mo.easing`=回弹；`ix.press`=缩小回弹；`mo.idle`=轻摇 | `cmp.plate@name`=胶囊；`vis.ornament`=0 |  |
| `skin.wa` | 和风 | 东方 | 待做 · 重素材 | 和纸、朱与藍、明朝体、竖排标题 | B25 | Ōkami、Ghost of Tsushima、Sekiro | `vis.corner`=直角；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=墨色；`vis.depth`=平面；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`mo.enter`=墨晕 / 笔刷擦出 | 引用 `kw.wafu` |  |
| `skin.gacha` | 手游抽卡金框 | 可爱手游 | 待做 · 重素材 | 金色浮雕框、强发光、粗体描边标题 | B26 | Genshin Impact、Honkai: Star Rail、Fate/Grand Order | `vis.gloss`=金属渐变；`vis.depth`=柔投影；`vis.opacity`=1；`col.lightness`=深色面板；`col.strategy`=骨架多色；`typ.body.family`=无衬线；`typ.body.weight`=粗；`typ.display.family`=无衬线；`typ.display.weight`=特粗；`vis.iconStyle`=3D 渲染；`mo.idle`=光效扫过 | `ast.frame`=雕花九宫格；`ast.frameMat`=金；`typ.titleFx`=描边；`ast.fx`=放射光芒、外发光；`vis.ornament`=2 | `col.coding`=稀有度、状态色；`col.rarityScale`=蓝紫金 / 彩虹；`st.rarityCue`=边框色、星级、光效色；`st.newCue`=红点 |
| `skin.ornate` | 重装饰雕花框 | 奇幻实物 | 待做 · 重素材 | 彩绘雕花外框（青铜 / 石 / 冰 / 金）+ 深色内芯 + 缎带横幅 | IIG：重装饰雕花框 | Hades、World of Warcraft、Frostpunk、Armello、Hearthstone、Slay the Spire | `vis.opacity`=1；`vis.depth`=倒角浮雕；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`typ.display.case`=小型大写；`vis.iconStyle`=手绘彩绘 | 引用 `kw.ornate` | `ast.iconSet`=图集素材 |
| `skin.filigree` | 线描花饰 | 奇幻实物 | 待做 · 重素材 | 黑底或透明，只有白 / 金细线花饰与衬线字 | IIG：线描花饰 | Hollow Knight、Clair Obscur: Expedition 33 | `vis.opacity`=0；`vis.stroke`=无描边；`vis.depth`=平面；`col.strategy`=单色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`typ.display.case`=小型大写；`typ.legibility`=投影；`vis.iconStyle`=线性 | `ast.frame`=只有四角件；`ast.frameMat`=线描 / 平涂；`vis.motif`=花叶卷草；`vis.ornament`=2；`ast.ornaments`=角花 / 角饰、分隔饰条 |  |
| `skin.darkHairline` | 暗色细线 | 奇幻实物 | 待做 · 重素材 | 深色半透明渐变面板、淡金细分隔线、衬线字、手绘物品图标 | IIG：暗色细线（新） | Elden Ring、Witcher 3、Black Myth: Wukong（菜单） | `vis.corner`=直角；`vis.fill`=渐变；`vis.opacity`=0.75；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=金属金 / 铜；`vis.depth`=平面；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规；`typ.display.family`=衬线；`vis.iconStyle`=手绘彩绘 | `ast.ornaments`=分隔饰条；`vis.ornament`=1 | `lay.grouping`=分隔线 |
| `skin.animeCard` | 二次元白卡细线 | 可爱手游 | 待做 · 纯程序 | 白色细线卡片、斜切角标、轻发光 | GameUI：二次元 | 明日方舟（GameUI 热门）、GameUI#1663800、GameUI#577655 | `vis.corner`=切角；`vis.cornerSize`=10；`vis.fill`=纯色；`vis.opacity`=1；`col.lightness`=浅色面板；`col.strategy`=中性 + 一两个强调色；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=强调色；`vis.depth`=平面；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=无衬线；`typ.display.weight`=细；`typ.display.tracking`=0.15；`mo.enter`=滑入 / 推移 | `vis.ornament`=1；`vis.motif`=几何线 / 同心圆；`ast.fx`=外发光 |  |
| `skin.candy` | 糖果卡通（Q 版） | 可爱手游 | 待做 · 纯程序 | 粗描边、糖果高光、立体卡通字、回弹 | GameUI：Q 版卡通 | GameUI#562993、GameUI#215019、蛋仔派对（GameUI 热门） | `vis.corner`=圆角；`vis.cornerSize`=50；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=3；`vis.strokeColor`=同色加深；`vis.gloss`=糖果塑料高光；`vis.depth`=软塑料双向阴影；`col.lightness`=浅色面板；`col.strategy`=骨架多色；`typ.body.family`=圆体；`typ.body.weight`=粗；`typ.display.weight`=特粗；`mo.easing`=回弹；`mo.juice`=0.7 | 引用 `kw.toy` |  |
| `skin.darkGold` | 暗金金属牌 | 奇幻实物 | 待做 · 重素材 | 深色金属底 + 金框 + 金字 | GameUI：暗金（新） | GameUI#943792、GameUI#1707370、三国 SLG（GameUI） | `vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=金属金 / 铜；`vis.gloss`=金属渐变；`vis.depth`=倒角浮雕；`col.lightness`=深色面板；`col.strategy`=中性 + 一两个强调色；`typ.body.family`=衬线 / 宋；`typ.body.weight`=常规 | 引用 `kw.luxury` |  |
| `skin.greybox` | 灰盒（中性基线） | 基线 | 待做 · 纯程序 | 中灰面板、1px 线、系统字、无装饰：锁外观只看版式，或作为"还没定皮肤"的占位 |  | R3 建议 | `vis.corner`=直角；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeColor`=同色加深；`vis.depth`=平面；`col.lightness`=中明度；`col.surface`=#8a8a8a；`col.text`=#111111；`col.accent`=#3a6ea5；`col.strategy`=单色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`vis.iconStyle`=扁平填充；`mo.enter`=硬切；`mo.easing`=线性；`ix.press`=变暗 | `vis.ornament`=0；`vis.motif`=无；`ast.core`=程序填充；`ast.frame`=程序线框 |  |
| `skin.godotDefault` | Godot 4 默认主题 | 基线 | 待做 · 纯程序 | 复现 Godot 4 默认 Theme：深灰蓝面板、小圆角、蓝色焦点——迁移对照基线，也是 M4 导出的回归用例 |  | Godot 4 默认 Theme | `vis.corner`=圆角；`vis.cornerSize`=6；`vis.fill`=纯色；`vis.opacity`=1；`vis.stroke`=无描边；`vis.depth`=平面；`col.lightness`=深色面板；`col.surface`=#262c3b；`col.text`=#dfdfdf；`col.accent`=#699ce8；`col.strategy`=单色；`typ.body.family`=无衬线；`typ.body.weight`=常规；`typ.display.family`=同正文；`ix.focus`=高亮描边；`ix.press`=变暗；`mo.enter`=硬切 | `vis.ornament`=0；`vis.motif`=无；`ast.core`=程序填充；`ast.frame`=程序线框 |  |

### 3.2 关键词（材质与母题）

08 文档 3.3："关键词 → 材质"是设计师显式做的映射。关键词只写资产槽位、母题、装饰预算、图案、标题字族与特效、标牌、强调色。v1 的气质词（治愈、极简、恐怖、军事、复古像素）删掉：并入对应皮肤或改成 UI 感觉（第 3.10 节）。题材世界观不设参数，用第 3.14 节的"题材 → 关键词"对照。

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `kw.primitive` | 原始 | 石框、木、撕边、符文、图腾纹、手写标题 | GOD of ANGULA（GameUI 作品） | `ast.core`=材质平铺；`ast.coreMat`=木；`ast.frame`=平框九宫格；`ast.frameMat`=石；`vis.edge`=撕边 / 破边；`vis.motif`=符文 / 法阵；`vis.pattern`=图腾纹；`typ.display.family`=手写；`vis.ornament`=1 |
| `kw.luxury` | 奢华 | 金角件、花丝、金属字 | Jewels（GameUI 作品）、007 First Light s3768760_1 | `ast.frame`=只有四角件；`ast.frameMat`=金；`vis.motif`=花叶卷草；`vis.ornament`=2；`col.accent`=#c9a54c；`typ.display.family`=衬线；`typ.titleFx`=金属 / 渐变 |
| `kw.cyber` | 赛博 | 全息网格、电路、故障、霓虹双色 | Cyberpunk 2077、末班车（GameUI 作品） | `ast.core`=材质平铺；`ast.coreMat`=全息网格；`vis.motif`=电路 / 六边形；`ast.fx`=故障色差、外发光、扫描线；`typ.display.family`=窄体；`col.accent`=#ff2bd6；`col.accent2`=#29f0ff |
| `kw.tech` | 科技线框 | 角括号、扫描线、电路点缀（原 skin.scifi 的材质部分） | Dead Space、Halo、XCOM 2 | `vis.motif`=角括号 / 准星角；`ast.fx`=扫描线、外发光；`vis.ornament`=1；`col.accent`=#3fd8ff |
| `kw.guochao` | 国潮 | 红漆、祥云、书法、印章、红绳 | GameUI#535026、忘川风华录（GameUI 热门） | `ast.core`=材质平铺；`ast.coreMat`=红漆；`ast.frame`=平框九宫格；`ast.frameMat`=金；`vis.motif`=祥云 / 回纹；`ast.ornaments`=挂件 / 红绳；`cmp.plate@title`=印章；`typ.display.family`=书法；`col.accent`=#c8102e；`vis.ornament`=2 |
| `kw.ink` | 水墨 | 宣纸、墨刷边、水墨飞白、书法竖排标题、朱红印章（原 skin.ink 的材质部分） | Black Myth: Wukong、GameUI#134914、GameUI#132864#1 | `ast.core`=材质平铺；`ast.coreMat`=宣纸；`vis.edge`=笔触；`vis.motif`=水墨飞白；`vis.ornament`=1；`typ.display.family`=书法；`typ.titleFx`=墨飞白；`typ.direction`=标题竖排；`cmp.plate@title`=印章；`ast.fx`=墨晕 / 墨烟；`col.accent`=#b83a2e |
| `kw.holy` | 神圣 / 西幻 | 金雕花框、羽翼、放射光、衬线 | World of Warcraft、GameUI#572370 | `ast.frame`=雕花九宫格；`ast.frameMat`=金；`vis.motif`=羽翼 / 桂冠 / 皇冠；`ast.fx`=放射光芒、外发光；`typ.display.family`=衬线；`vis.ornament`=2 |
| `kw.ornate` | 雕花金石 | 青铜雕花框、嵌宝石、角花、端盖、缎带标题（原 skin.ornate 的材质部分） | Hades、World of Warcraft、Hearthstone | `ast.frame`=雕花九宫格；`ast.frameMat`=青铜；`vis.ornament`=3；`ast.ornaments`=角花 / 角饰、嵌宝石、端盖；`cmp.plate@title`=缎带；`ast.fx`=外发光 |
| `kw.steampunk` | 蒸汽朋克 | 铁板内芯、皮革铜饰框、铆钉、齿轮 | Frostpunk、Desperados III s610370_4 | `ast.core`=材质平铺；`ast.coreMat`=铁 / 钢 / 拉丝金属；`ast.frame`=平框九宫格；`ast.frameMat`=皮革；`ast.ornaments`=铆钉 / 金属夹角；`vis.motif`=齿轮 / 铆钉 / 铜饰；`vis.ornament`=2 |
| `kw.frost` | 冰霜 | 冰霜金属雕框、冷光、星尘 | Frostpunk | `ast.frame`=雕花九宫格；`ast.frameMat`=冰霜金属；`col.accent`=#7fd3ff；`ast.fx`=外发光、星尘 / 光点；`vis.ornament`=2 |
| `kw.wafu` | 和风 | 和纸、樱花家纹、书法竖排标题、朱色（skin.wa 引用它） | Ōkami、Sekiro、GameUI#134511 | `ast.core`=材质平铺；`ast.coreMat`=米白纸；`vis.motif`=樱花 / 家纹；`typ.display.family`=书法；`typ.direction`=标题竖排；`col.accent`=#d7402b；`vis.ornament`=1 |
| `kw.western` | 西部 | 皮革内芯、木框、墨刷边、木刻粗衬线 | Red Dead Redemption 2、Desperados III | `ast.core`=材质平铺；`ast.coreMat`=皮革；`ast.frame`=平框九宫格；`ast.frameMat`=木；`vis.edge`=笔触；`typ.display.family`=西部木刻粗衬线；`vis.ornament`=1 |
| `kw.nautical` | 航海 | 羊皮纸、古海图、铜饰 | Civ VI、Bad North | `ast.core`=材质平铺；`ast.coreMat`=羊皮纸；`vis.mapStyle`=羊皮纸古海图；`vis.motif`=齿轮 / 铆钉 / 铜饰；`vis.ornament`=1 |
| `kw.gothic` | 哥特暗黑 | 石雕框、骷髅、哥特黑体 | Grim Dawn s219990_3、Diablo | `ast.frame`=雕花九宫格；`ast.frameMat`=石；`vis.motif`=骷髅 / 哥特；`typ.display.family`=哥特黑体；`vis.ornament`=2 |
| `kw.space` | 太空科幻 | 星空背景、星座、细线圆环 | Destiny 2、Stellaris | `ast.bgArt`=星空；`vis.motif`=星芒 / 星座；`typ.display.family`=无衬线；`vis.ornament`=1 |
| `kw.toy` | 童趣 / 糖果 | 塑料糖果内芯、圆体立体字、星星（skin.candy 引用它） | GameUI#562993、GameUI#215019 | `ast.core`=材质平铺；`ast.coreMat`=塑料 / 糖果；`typ.display.family`=圆体；`typ.titleFx`=3D 浮雕 / 糖果立体字；`vis.motif`=星芒 / 星座；`vis.ornament`=1 |
| `kw.rustic` | 田园木作 | 木框、米纸内芯、花枝（skin.pixelWood、skin.skeuo 引用它） | Stardew Valley、Hearthstone、GameUI#534801#1 | `ast.core`=材质平铺；`ast.coreMat`=米白纸；`ast.frame`=平框九宫格；`ast.frameMat`=木；`ast.ornaments`=花枝；`vis.ornament`=1 |
| `kw.questBook` | 任务书 | 羊皮纸内芯 + 缎带标题（skin.parchment 引用它） | Anno 1800、World of Warcraft（任务） | `ast.core`=材质平铺；`ast.coreMat`=羊皮纸；`cmp.plate@title`=缎带；`vis.ornament`=1 |

### 3.3 节日 / 活动（关键词的白名单子集）

只能改强调色、母题、特效层、饰件（C-owners）。

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `theme.springFestival` | 春节 / 新年 | 红金、灯笼祥云、红绳、花瓣与光 | GameUI#535026、GameUI#625077 | `col.accent`=#c8102e；`col.accent2`=#e8b04a；`vis.motif`=祥云 / 回纹；`ast.ornaments`=挂件 / 红绳；`ast.fx`=花瓣 / 雪 / 彩带粒子、外发光 |
| `theme.christmas` | 圣诞 | 红绿、星星、雪 | GameUI#215019、GameUI#210868 | `col.accent`=#c0392b；`col.accent2`=#2e8b57；`vis.motif`=星芒 / 星座；`ast.fx`=花瓣 / 雪 / 彩带粒子 |
| `theme.sakura` | 七夕 / 樱花 | 粉紫、樱花飘落 | GameUI#4387、GameUI#474327 | `col.accent`=#e98bb5；`vis.motif`=樱花 / 家纹；`ast.fx`=花瓣 / 雪 / 彩带粒子 |
| `theme.halloween` | 万圣节 | 紫橙、骷髅、星尘 | Overwatch（Halloween Terror，经验） | `col.accent`=#ff7a1a；`col.accent2`=#7b3fa0；`vis.motif`=骷髅 / 哥特；`ast.fx`=星尘 / 光点 |
| `theme.season` | 赛季主题 | 赛季色、羽翼、光效 | GameUI#594291、GameUI#556160 | `col.accent`=#ffcf40；`vis.motif`=羽翼 / 桂冠 / 皇冠；`ast.fx`=外发光、放射光芒 |

### 3.4 品类布局

16 个品类各一套，加常见变体与 v2 新增的 9 个独立游戏热门子类（割草、魂类、殖民模拟、塔防、自走棋、节奏、放置、弹幕射击、类银河城）。布局 = 信息元素集合 + 每个元素的画法、锚点、排布、数值图形；"规则"列引用 06 文档 A 节；genre 挂回 game.genre 的 16 类。

| id | 名称 | 说明 | 品类 / 规则 | 参考 | 设定的参数 |
|---|---|---|---|---|---|
| `layout.explore` | 探索与冒险 | 罗盘 + 角落目标 + 物体旁交互，探索时 HUD 收起 | game.genre=explore；规则 A1 | Zelda BotW、Witcher 3、AC Shadows s3159330_1 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=情境显现；`ctx.timeModel`=实时；`cnt.elements`=生命 / 护盾 / 体力、小地图 / 罗盘、目标 / 路点、交互提示、通知 / 大字提示、字幕 / 说话人、按键 / 操作提示；`el.vitals.screenAnchor`=左上；`cmp.gauge@el.vitals`=横条；`el.minimap.form`=罗盘条；`el.minimap.screenAnchor`=上中；`el.objective.form`=目标文字；`el.objective.screenAnchor`=右上；`el.interact.form`=按键图标 + 文字；`el.interact.attachTo`=兴趣点；`el.subtitle.screenAnchor`=下中；`el.notify.form`=横幅；`el.notify.screenAnchor`=上中 |
| `layout.action` | 动作与 Roguelite | 左下分段血 + 数字、侧边增益竖列、右下货币、Boss 长条、飘字 | game.genre=action；规则 A2 | Hades s1145360_0、Elden Ring | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`ctx.timeModel`=实时；`cnt.elements`=生命 / 护盾 / 体力、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、敌人血条 / 预警 / 意图、命中反馈 / 连击、通知 / 大字提示；`cmp.gauge@el.vitals`=分段格；`el.vitals.valueLabel`=当前值；`el.vitals.screenAnchor`=左下；`el.abilities.form`=技能格；`el.abilities.arrangement`=竖列；`el.abilities.screenAnchor`=左中；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右下；`el.threat.form`=Boss 长条 + 名字；`el.threat.screenAnchor`=上中；`el.feedback.form`=飘字；`el.feedback.attachTo`=目标 / 敌人 |
| `layout.platformer` | 横版平台 | 左上图标血量 + 收集计数，其余全部留给关卡 | game.genre=platformer；规则 A3 | Hollow Knight s367520_0、Celeste、Flinthook s401710_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、资源 / 货币、计时 / 分数 / 回合；`cmp.gauge@el.vitals`=图标列（心 / 面具）；`el.vitals.screenAnchor`=左上；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=左上；`el.timer.screenAnchor`=右上 |
| `layout.shooter` | 第一 / 第三人称射击 | 左下血、右下弹药、中心准星、顶部目标、屏外威胁方向 | game.genre=shooter；规则 A4 | Call of Duty、Destiny 2、Overwatch | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌、准星 / 瞄准、目标 / 路点、小地图 / 罗盘、命中反馈 / 连击、敌人血条 / 预警 / 意图、通知 / 大字提示；`el.vitals.screenAnchor`=左下；`el.abilities.form`=弹药数字；`el.abilities.screenAnchor`=右下；`el.crosshair.form`=动态扩散；`el.crosshair.screenAnchor`=中心；`el.objective.screenAnchor`=上中；`el.minimap.form`=平面小地图；`vis.silhouette@el.minimap`=圆；`el.minimap.screenAnchor`=左上；`el.feedback.form`=命中标记、飘字；`el.threat.form`=屏幕边缘方向提示；`el.notify.form`=滚动消息列；`el.notify.screenAnchor`=右上 |
| `layout.rpg` | 角色扮演（MMO / ARPG） | 左上头像与细条、底部技能栏、右上小地图、右侧任务追踪、左侧队伍、左下聊天 | game.genre=rpg；规则 A5 | World of Warcraft、Witcher 3、Path of Exile | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌、小地图 / 罗盘、目标 / 路点、队伍 / 玩家条、聊天、通知 / 大字提示、身份 / 头像 / 等级、敌人血条 / 预警 / 意图；`el.vitals.count`=2；`cmp.gauge@el.vitals`=细条；`el.vitals.screenAnchor`=左上；`el.abilities.form`=技能格；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`el.minimap.form`=平面小地图；`vis.silhouette@el.minimap`=圆；`el.minimap.screenAnchor`=右上；`el.objective.form`=任务清单；`el.objective.screenAnchor`=右中；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=竖列；`el.party.screenAnchor`=左中；`el.chat.form`=折叠框；`el.chat.screenAnchor`=左下；`el.threat.form`=目标头像框；`el.threat.screenAnchor`=上中 |
| `layout.arpgOrb` | ARPG 液体球 | 底部居中：左红球、技能条、右蓝球（暗黑式整合底座） | game.genre=rpg；规则 A5 | Torchlight II s200710_0、Path of Exile s238960_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=整合底座；`cnt.elements`=生命 / 护盾 / 体力、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、小地图 / 罗盘、敌人血条 / 预警 / 意图；`cmp.gauge@el.vitals`=液体球；`el.vitals.screenAnchor`=左下；`el.resources.form`=以数值图形呈现；`cmp.gauge@el.resources`=液体球；`el.resources.screenAnchor`=右下；`el.abilities.form`=技能格；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`el.threat.form`=Boss 长条 + 名字；`el.threat.screenAnchor`=上中；`el.minimap.form`=平面小地图；`el.minimap.screenAnchor`=右上 |
| `layout.moba` | MOBA 底座 | 整条底座：左小地图 \| 中头像 + 技能 + 血蓝条 \| 右物品；顶部双方头像与比分；头顶血条 | game.genre=strategy；规则 A12 | Dota 2 s570_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=整合底座；`ctx.players`=线上队伍（队友栏 + 记分）；`col.coding`=阵营色；`col.teams`=绿友红敌；`cnt.elements`=小地图 / 罗盘、技能 / 冷却 / 弹药 / 手牌、生命 / 护盾 / 体力、资源 / 货币、队伍 / 玩家条、计时 / 分数 / 回合、敌人血条 / 预警 / 意图、按键 / 操作提示；`el.minimap.form`=平面小地图；`el.minimap.screenAnchor`=左下；`el.abilities.form`=技能格；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`el.vitals.count`=2；`cmp.gauge@el.vitals`=横条；`el.vitals.valueLabel`=当前 / 上限；`el.vitals.screenAnchor`=下中；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=横排；`el.party.screenAnchor`=上中；`el.timer.form`=数字；`el.timer.screenAnchor`=上中；`el.threat.form`=敌人血条；`el.threat.diegesis`=空间内；`el.threat.attachTo`=目标 / 敌人；`el.threat.worldRender`=平面公告板；`el.prompt.form`=图标角标热键；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右下 |
| `layout.fighting` | 格斗对战 | 顶部左右镜像血条 + 计时、底部能量槽、巨型连击数（镜像由 ctx.players = versus 推出） | game.genre=action；规则 A2 | DBFZ s678950_3、BlazBlue s702890_1 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`ctx.players`=1v1 镜像对战；`cnt.elements`=生命 / 护盾 / 体力、队伍 / 玩家条、计时 / 分数 / 回合、资源 / 货币、命中反馈 / 连击；`cmp.gauge@el.vitals`=横条；`el.vitals.screenAnchor`=上中；`el.party.form`=立绘头像（大小区分当前）；`el.timer.form`=数字；`el.timer.screenAnchor`=上中；`el.resources.form`=以数值图形呈现；`cmp.gauge@el.resources`=分段格；`el.resources.screenAnchor`=下中；`el.feedback.form`=连击大数字；`mo.valueChange@el.vitals`=延迟拖尾 |
| `layout.puzzle` | 解谜与侦探 | 几乎无 HUD：一个菜单入口、可选目标清单 | game.genre=puzzle；规则 A6 | Monument Valley s1927720_0、Hidden Folks s435400_1、The Witness | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=目标 / 路点、按键 / 操作提示；`el.objective.form`=任务清单；`el.objective.screenAnchor`=下中 |
| `layout.horror` | 恐怖与悬疑 | 只留字幕与交互描边，状态画在角色身上 | game.genre=horror；规则 A7 | Dead Space、Resident Evil 2、Control | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、交互提示、字幕 / 说话人；`el.vitals.diegesis`=叙事内；`el.vitals.attachTo`=玩家角色；`cmp.gauge@el.vitals`=分段格；`el.interact.diegesis`=空间内；`el.interact.attachTo`=兴趣点；`el.interact.worldRender`=物体描边；`el.interact.form`=按键图标 + 文字；`el.subtitle.screenAnchor`=下中 |
| `layout.survival` | 生存与制作 | 左下状态细条、底部快捷栏、右上时钟、罗盘、拾取通知、温度态势 | game.genre=survival；规则 A8 | Valheim、Don't Starve、DQ Builders 2 s1072420_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌、时间 / 天气 / 日历、小地图 / 罗盘、通知 / 大字提示、交互提示、世界 / 社会态势条；`el.vitals.count`=3；`cmp.gauge@el.vitals`=细条；`el.vitals.screenAnchor`=左下；`el.abilities.form`=物品快捷栏；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`el.clock.form`=太阳盘 / 日夜钟；`el.clock.screenAnchor`=右上；`el.minimap.form`=罗盘条；`el.minimap.screenAnchor`=上中；`el.notify.form`=滚动消息列；`el.notify.screenAnchor`=左中；`el.interact.form`=按键图标 + 文字；`el.interact.attachTo`=兴趣点；`el.meter.form`=图标 + 仪表；`cmp.gauge@el.meter`=温度计；`el.meter.screenAnchor`=左上 |
| `layout.builder` | 建造与经营 | 顶部资源栏、底部建造栏、右侧选中面板、左下消息、右上时间与倍速、希望 / 不满态势、信息叠层 | game.genre=builder；规则 A9 | Anno 1800、Cities Skylines、Frostpunk s323190_2 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=贴边整条；`ctx.timeModel`=实时可暂停 / 变速；`rel.semanticZoom`=按缩放切换标签；`cnt.elements`=资源 / 货币、时间 / 天气 / 日历、倍速 / 暂停 / 自动、信息叠层 / 图例、选中信息面板、通知 / 大字提示、建造栏 / 系统入口条、世界 / 社会态势条；`el.resources.form`=图标 + 数字；`el.resources.arrangement`=横排；`el.resources.screenAnchor`=上中；`el.clock.form`=时钟数字；`el.clock.screenAnchor`=右上；`el.gameSpeed.form`=暂停 / 1x / 2x 按钮条；`el.gameSpeed.screenAnchor`=右上；`el.overlay.form`=热力图 + 图例、状态图标；`el.selection.form`=信息面板；`el.selection.screenAnchor`=右中；`el.notify.form`=滚动消息列；`el.notify.screenAnchor`=左下；`el.toolbar.form`=分类页签 + 子项抽屉；`el.toolbar.screenAnchor`=下中；`el.meter.form`=两项对立；`cmp.gauge@el.meter`=双向对立条；`el.meter.screenAnchor`=左上 |
| `layout.factory` | 工厂与自动化 | 顶部资源、右下选中面板、方向箭头与状态图标叠层、右上小地图、底部快捷栏 | game.genre=factory；规则 A10 | Factorio、Satisfactory、shapez | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.semanticZoom`=拉远图标化；`cnt.elements`=资源 / 货币、选中信息面板、信息叠层 / 图例、小地图 / 罗盘、技能 / 冷却 / 弹药 / 手牌、建造栏 / 系统入口条；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=上中；`el.selection.form`=信息面板；`el.selection.screenAnchor`=右下；`el.overlay.form`=方向箭头、状态图标；`el.minimap.form`=平面小地图；`el.minimap.screenAnchor`=右上；`el.abilities.form`=物品快捷栏；`el.abilities.screenAnchor`=下中；`el.toolbar.form`=图标按钮排；`el.toolbar.screenAnchor`=左下 |
| `layout.life` | 生活与养成 | 右上日历时钟 + 金钱、底部物品栏、对话框带头像 | game.genre=life；规则 A11 | Stardew Valley、Animal Crossing | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=时间 / 天气 / 日历、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、通知 / 大字提示、字幕 / 说话人；`el.clock.form`=日历页；`el.clock.screenAnchor`=右上；`el.resources.form`=胶囊 + 加号；`el.resources.screenAnchor`=右上；`el.abilities.form`=物品快捷栏；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`cmp.dialogBox`=底部通栏 |
| `layout.strategyTurn` | 策略与战术（回合） | 左下单位卡、敌人意图、格子高亮、右上胜利条件、左侧小队、回合横幅、结束回合 | game.genre=strategy；规则 A12 | Into the Breach s590380_0、XCOM 2、Wargroove | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`ctx.timeModel`=回合制；`cnt.elements`=选中信息面板、敌人血条 / 预警 / 意图、信息叠层 / 图例、目标 / 路点、队伍 / 玩家条、计时 / 分数 / 回合、主行动按钮；`el.selection.form`=单位卡；`el.selection.screenAnchor`=左下；`el.threat.form`=意图图标 + 数字；`el.threat.attachTo`=目标 / 敌人；`el.overlay.form`=格子高亮；`el.objective.form`=任务清单；`el.objective.screenAnchor`=右上；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=竖列；`el.party.screenAnchor`=左中；`el.timer.form`=回合横幅；`el.timer.screenAnchor`=上中；`el.cta.form`=大圆钮；`el.cta.screenAnchor`=右下 |
| `layout.strategyRts` | 策略（RTS / 大战略） | 整合底座 + 单位卡条 + 小地图 + 法术簇 + 系统入口条；拉远图标化 | game.genre=strategy；规则 A12 | Total War: Warhammer II s594570_0、Northgard s466560_4、Civ VI | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=整合底座；`ctx.timeModel`=实时；`rel.semanticZoom`=拉远图标化；`cnt.elements`=小地图 / 罗盘、队伍 / 玩家条、技能 / 冷却 / 弹药 / 手牌、资源 / 货币、选中信息面板、通知 / 大字提示、建造栏 / 系统入口条；`el.minimap.form`=平面小地图；`el.minimap.screenAnchor`=右上；`el.party.form`=单位卡条；`el.party.arrangement`=横排；`el.party.screenAnchor`=下中；`el.abilities.form`=技能格；`el.abilities.arrangement`=规则网格；`el.abilities.screenAnchor`=右下；`el.resources.form`=图标 + 数字；`el.resources.arrangement`=横排；`el.resources.screenAnchor`=上中；`el.toolbar.form`=系统入口小图标；`el.toolbar.screenAnchor`=左上 |
| `layout.card` | 卡牌与桌面 | 底部扇形手牌、左下能量球、敌人意图、拖拽指向曲线、右下结束回合、顶部常驻栏 | game.genre=card；规则 A13 | Slay the Spire 2 s2868840_0、GWENT s1284410_0、Minion Masters s489520_0 | `cnt.screen`=手牌 / 牌桌；`lay.container`=直接叠加；`ctx.timeModel`=回合制；`flow.chrome`=顶栏货币；`cmp.card`=插画窗 + 费用角标 + 文本框；`cnt.elements`=技能 / 冷却 / 弹药 / 手牌、资源 / 货币、生命 / 护盾 / 体力、敌人血条 / 预警 / 意图、主行动按钮、准星 / 瞄准；`el.abilities.form`=手牌；`el.abilities.arrangement`=扇形；`el.abilities.screenAnchor`=下中；`el.resources.form`=以数值图形呈现；`cmp.gauge@el.resources`=液体球；`el.resources.valueLabel`=当前 / 上限；`el.resources.screenAnchor`=左下；`el.vitals.diegesis`=空间内；`el.vitals.attachTo`=玩家角色；`el.threat.form`=意图图标 + 数字；`el.threat.attachTo`=目标 / 敌人；`el.cta.form`=大圆钮；`el.cta.screenAnchor`=右下；`el.crosshair.form`=拖拽指向曲线 |
| `layout.racing` | 竞速与驾驶 | 右下表盘 + 大数字、左上名次、右上圈速、左下圆形小地图 | game.genre=racing；规则 A14 | NFS Heat、The Crew s2698940_0、Trackmania Turbo | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=速度 / 名次、名次 / 段位 / 评级、计时 / 分数 / 回合、小地图 / 罗盘；`cmp.gauge@el.speed`=表盘指针；`el.speed.valueLabel`=当前值；`el.speed.valueLabelPos`=环心 / 正中；`el.speed.screenAnchor`=右下；`el.rank.form`=名次数字；`el.rank.screenAnchor`=左上；`el.timer.form`=数字；`el.timer.screenAnchor`=右上；`el.minimap.form`=平面小地图；`vis.silhouette@el.minimap`=圆；`el.minimap.screenAnchor`=左下 |
| `layout.sandbox` | 沙盒与物理 | 底部快捷栏、左下图标血量、中心点准星 | game.genre=sandbox；规则 A15 | Minecraft、Teardown | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=技能 / 冷却 / 弹药 / 手牌、生命 / 护盾 / 体力、准星 / 瞄准、按键 / 操作提示；`el.abilities.form`=物品快捷栏；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`cmp.gauge@el.vitals`=图标列（心 / 面具）；`el.vitals.screenAnchor`=左下；`el.crosshair.form`=点 |
| `layout.narrative` | 叙事与视觉小说 | 底部文本框 + 名牌 + 立绘 + 选项，自动 / 快进 / 日志 | game.genre=narrative；规则 A16 | Night Call s680380_1、GameUI#604577、逆转裁判 | `cnt.screen`=对话 / 文本；`lay.container`=底 / 顶托盘；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`cnt.elements`=字幕 / 说话人、对话 / 事件选项；`cmp.dialogBox`=底部通栏；`ix.skip`=自动 / 快进 / 日志一组；`hier.dimInactive`=0.3；`mo.textReveal`=打字机逐字；`el.choices.form`=按钮；`el.choices.arrangement`=竖列 |
| `layout.mobileArpg` | 手游横屏动作（触屏） | 左下虚拟摇杆、右下技能簇大圆钮环、左上头像、右上小地图与货币 | game.genre=action；规则 A2；配 platform.phoneLandscape | GameUI#1694106、GameUI#1009418 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=技能 / 冷却 / 弹药 / 手牌、按键 / 操作提示、身份 / 头像 / 等级、小地图 / 罗盘、资源 / 货币、聊天、倍速 / 暂停 / 自动；`el.abilities.form`=技能格；`el.abilities.arrangement`=环绕中心 / 轮盘；`el.abilities.screenAnchor`=右下；`vis.silhouette@el.abilities`=圆；`el.prompt.form`=触屏按钮；`el.prompt.screenAnchor`=左下；`el.profile.form`=头像 + 等级；`el.profile.screenAnchor`=左上；`el.minimap.form`=平面小地图；`vis.silhouette@el.minimap`=圆；`el.minimap.screenAnchor`=右上；`el.chat.form`=折叠框；`el.chat.screenAnchor`=左下；`el.gameSpeed.form`=自动托管 |
| `layout.showcase` | 全部控件展示 | 每个信息元素各放一个，用来对照皮肤 |  | 计划 M5"全部控件展示"布局 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=生命 / 护盾 / 体力、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、小地图 / 罗盘、目标 / 路点、交互提示、敌人血条 / 预警 / 意图、命中反馈 / 连击、通知 / 大字提示、计时 / 分数 / 回合、速度 / 名次、准星 / 瞄准、选中信息面板、队伍 / 玩家条、时间 / 天气 / 日历、信息叠层 / 图例、按键 / 操作提示、字幕 / 说话人、主行动按钮、标题 / LOGO、奖励 / 获得物、价格 / 消耗、名次 / 段位 / 评级、身份 / 头像 / 等级、加载 / 等待指示、引导指示 / 聚光、聊天、倍速 / 暂停 / 自动、世界 / 社会态势条、建造栏 / 系统入口条、行动顺序、对话 / 事件选项 |
| `layout.survivors` | 割草类 | 顶部经验条 + 等级、计时、击杀与金币，角色脚下小血条；升级时弹三选一 | game.genre=action；规则 A2 | Vampire Survivors、Brotato、20 Minutes Till Dawn | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`ctx.timeModel`=实时；`cnt.elements`=身份 / 头像 / 等级、计时 / 分数 / 回合、资源 / 货币、生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌；`el.profile.form`=Lv + 经验条；`cmp.gauge@el.profile`=横条；`el.profile.screenAnchor`=上中；`el.timer.form`=数字；`el.timer.screenAnchor`=上中；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右上；`el.vitals.diegesis`=空间内；`el.vitals.attachTo`=玩家角色；`cmp.gauge@el.vitals`=细条；`el.abilities.form`=技能格；`el.abilities.arrangement`=规则网格；`el.abilities.screenAnchor`=左上 |
| `layout.soulslike` | 魂类 | 左上三细条（血 / 精 / 蓝）、底部 Boss 条、左下十字快捷栏、右下魂数 | game.genre=action；规则 A2 | Elden Ring、Dark Souls、Lies of P | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌、敌人血条 / 预警 / 意图、资源 / 货币；`el.vitals.count`=3；`cmp.gauge@el.vitals`=细条；`el.vitals.screenAnchor`=左上；`el.threat.form`=Boss 长条 + 名字；`el.threat.screenAnchor`=下中；`el.abilities.form`=物品快捷栏；`el.abilities.arrangement`=十字四向；`el.abilities.screenAnchor`=左下；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右下；`mo.valueChange@el.vitals`=延迟拖尾 |
| `layout.colonySim` | 殖民模拟 | 顶部殖民者头像栏、底部分类页签栏、右侧警报列、左上资源列、右下时间与倍速、左下选中面板 | game.genre=builder；规则 A9 | RimWorld、Oxygen Not Included、Going Medieval | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=贴边整条；`ctx.timeModel`=实时可暂停 / 变速；`cnt.elements`=队伍 / 玩家条、建造栏 / 系统入口条、通知 / 大字提示、资源 / 货币、时间 / 天气 / 日历、倍速 / 暂停 / 自动、选中信息面板；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=横排；`el.party.screenAnchor`=上中；`el.toolbar.form`=分类页签 + 子项抽屉；`el.toolbar.screenAnchor`=下中；`el.notify.form`=滚动消息列；`el.notify.screenAnchor`=右中；`el.resources.form`=图标 + 数字；`el.resources.arrangement`=竖列；`el.resources.screenAnchor`=左上；`el.clock.form`=时钟数字；`el.clock.screenAnchor`=右下；`el.gameSpeed.form`=暂停 / 1x / 2x 按钮条；`el.gameSpeed.screenAnchor`=右下；`el.selection.form`=信息面板；`el.selection.screenAnchor`=左下 |
| `layout.towerDefense` | 塔防 | 波次徽章、生命、金币、环形建造菜单、倍速 | game.genre=strategy；规则 A12 | Bloons TD 6 s960090_0、Kingdom Rush、Defense Grid | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`ctx.timeModel`=实时可暂停 / 变速；`cnt.elements`=计时 / 分数 / 回合、生命 / 护盾 / 体力、资源 / 货币、建造栏 / 系统入口条、倍速 / 暂停 / 自动；`el.timer.form`=回合徽章；`el.timer.screenAnchor`=上中；`cmp.gauge@el.vitals`=纯数字；`el.vitals.screenAnchor`=左上；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=左上；`el.toolbar.form`=图标按钮排；`el.toolbar.arrangement`=环绕中心 / 轮盘；`el.toolbar.attachTo`=光标；`el.gameSpeed.form`=▶ / ▶▶；`el.gameSpeed.screenAnchor`=右下 |
| `layout.autobattler` | 自走棋 | 底部候补席 + 商店行、左侧羁绊计数、顶部回合与金币 | game.genre=strategy；规则 A12 | Teamfight Tactics、Dota Underlords、Super Auto Pets | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`ctx.timeModel`=回合制；`cnt.elements`=队伍 / 玩家条、建造栏 / 系统入口条、世界 / 社会态势条、计时 / 分数 / 回合、资源 / 货币；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=横排；`el.party.screenAnchor`=下中；`el.toolbar.form`=图标按钮排；`el.toolbar.screenAnchor`=下中；`el.meter.form`=多项堆叠；`cmp.gauge@el.meter`=分段格；`el.meter.screenAnchor`=左中；`el.timer.form`=回合徽章；`el.timer.screenAnchor`=上中；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=左下 |
| `layout.rhythm` | 节奏 | 居中轨道 + 两侧装饰区、判定字与连击、顶部准度条、右上分数 | game.genre=action；规则 A2 | DJMAX RESPECT V s960170_1、Thumper、Hi-Fi Rush | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=画在玩法区外的边框里；`lay.playfield`=居中竖条 + 两侧装饰区；`rel.hudVisibility`=常驻；`cnt.elements`=命中反馈 / 连击、计时 / 分数 / 回合、世界 / 社会态势条；`el.feedback.form`=评价字（Good! / Perfect）、连击大数字；`el.feedback.screenAnchor`=中心；`el.timer.form`=数字；`el.timer.screenAnchor`=右上；`el.meter.form`=单项；`cmp.gauge@el.meter`=细条；`el.meter.screenAnchor`=上中 |
| `layout.idle` | 放置 | 巨大的资源数字、升级按钮列表、提示卡 | game.genre=builder；规则 A9 | Cookie Clicker、Melvor Idle、Egg Inc. | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`cnt.elements`=资源 / 货币、建造栏 / 系统入口条、通知 / 大字提示；`el.resources.form`=大号数字；`el.resources.scale`=1.6；`el.resources.screenAnchor`=上中；`el.toolbar.form`=图标按钮排；`el.toolbar.arrangement`=竖列；`el.toolbar.screenAnchor`=右中；`el.notify.form`=圆角提示卡 |
| `layout.shmup` | 弹幕射击 | 4:3 玩法区，两侧边框里放分数、残机、炸弹 | game.genre=action；规则 A2 | Touhou、DoDonPachi、Nuclear Throne s242680_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=画在玩法区外的边框里；`lay.playfield`=4:3 / 小窗加黑边；`rel.hudVisibility`=常驻；`cnt.elements`=计时 / 分数 / 回合、生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌；`el.timer.form`=数字；`el.timer.screenAnchor`=左上；`cmp.gauge@el.vitals`=图标列（心 / 面具）；`el.vitals.screenAnchor`=左中；`el.abilities.form`=技能格；`el.abilities.screenAnchor`=左中 |
| `layout.metroidvania` | 类银河城 | 左上面具血量 + 灵魂容器，地图按键呼出 | game.genre=platformer；规则 A3 | Hollow Knight s367520_0、Ori、Dead Cells | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`cnt.elements`=生命 / 护盾 / 体力、资源 / 货币、小地图 / 罗盘；`cmp.gauge@el.vitals`=图标列（心 / 面具）；`el.vitals.screenAnchor`=左上；`el.resources.form`=以数值图形呈现；`cmp.gauge@el.resources`=液体球；`el.resources.screenAnchor`=左上；`el.minimap.form`=平面小地图；`el.minimap.visibility`=按键呼出；`el.minimap.screenAnchor`=中心 |

### 3.5 平台

设备 + 朝向 + 宽高比 + 输入 + 基准字号 + 触控尺寸 + 安全边 + 按键图标。v2：v1 平台里写的页签、列数、详情方式、焦点框删掉——它们由适配类规则 D-orient / D-input 在所有预设之后改写。

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `platform.phonePortrait` | 手机竖屏 | 单列、底部页签、拇指区在下（页签与列数由 D-orient 改写） | GameUI#646877、GameUI#625083 | `ctx.orientation`=竖屏；`ctx.aspect`=19.5:9 手机长屏；`ctx.device`=手机；`ctx.input`=触屏；`typ.baseSize`=15；`ix.touchSize`=88；`ix.glyphs`=触屏图标 |
| `platform.phoneLandscape` | 手机横屏 | 四角 HUD + 大圆钮 | GameUI#1694106、GameUI#534975 | `ctx.orientation`=横屏；`ctx.aspect`=19.5:9 手机长屏；`ctx.device`=手机；`ctx.input`=触屏；`typ.baseSize`=14；`ix.touchSize`=88；`ix.glyphs`=触屏图标 |
| `platform.tablet` | 平板 | 双栏与更多同屏信息 | GameUI#943830 | `ctx.orientation`=横屏；`ctx.aspect`=16:9；`ctx.device`=平板；`ctx.input`=触屏；`typ.baseSize`=14；`ix.touchSize`=72 |
| `platform.pc` | PC 键鼠 | 高密度、悬停提示、热键角标 | Stellaris s281990_2、Dota 2 | `ctx.orientation`=横屏；`ctx.aspect`=16:9；`ctx.device`=PC 显示器；`ctx.input`=键鼠；`typ.baseSize`=14；`ix.glyphs`=键盘键帽；`lay.safeMargin`=2 |
| `platform.tv` | 主机 / 电视 | 大字、5% 安全边、焦点导航、按键图例 | Elden Ring、Clair Obscur | `ctx.orientation`=横屏；`ctx.aspect`=16:9；`ctx.device`=主机 / 电视；`ctx.input`=手柄；`typ.baseSize`=26；`ix.glyphs`=Xbox；`lay.safeMargin`=5 |
| `platform.handheld` | 掌机（Switch / Steam Deck） | 小屏 + 手柄 | Hollow Knight、Celeste | `ctx.orientation`=横屏；`ctx.aspect`=16:9；`ctx.device`=掌机（Switch / Steam Deck）；`ctx.input`=手柄；`typ.baseSize`=18；`ix.glyphs`=Nintendo；`lay.safeMargin`=3 |

### 3.6 商业模式

运营层的整体开关；与美术风格无关。运营元素密度是读数（D-ops），不在这里写。

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `business.premium` | 买断制 | 没有运营层；系统提示也克制；运营页签默认隐藏 | Hollow Knight、Hades | `ops.badges`=无；`ops.actions`=无；`ops.entries`=无；`st.newCue`=无；`flow.chrome`=无 |
| `business.f2pMobile` | F2P 手游 | 红点、角标、倒计时、拍脸、顶栏货币、底部导航跨屏常驻 | GameUI#1463173、GameUI#1743963 | `ops.badges`=倒计时、折扣角标、限购 x/y、推荐 / 热卖、赠送 / 首充标签；`ops.entries`=浮动角标入口；`st.newCue`=红点；`flow.chrome`=顶栏货币；`flow.navPersistent`=开；`ops.compliance`=年龄角标、版号 / 健康游戏长文、版本号 |
| `business.liveService` | 赛季服务型 | 通行证 + 赛季倒计时 + 商店轮换，红点克制 | Destiny 2、Overwatch、GameUI#594291 | `ops.badges`=倒计时；`st.newCue`=NEW 角标；`ops.entries`=顶部轮播 / 横幅 |
| `business.adSupported` | 免费 + 广告 | 看广告翻倍、再来一次 | GameUI#1698127 | `ops.actions`=看广告翻倍、再抽 N 次 / 再来一局；`st.newCue`=红点 |
| `business.mmo` | MMO（订阅 / 内购） | 聊天、社交、拍卖、活动横幅并存 | World of Warcraft、Albion Online s761890_4 | `st.newCue`=红点；`ops.entries`=侧边图标列；`flow.chrome`=聊天跑马灯 |

### 3.7 界面模板（cnt.subtype → 结构默认值）

63 个模板：v1 的 50 个按 v2 键改写，新增 13 个 PC / 主机常见界面（三选一、本局总结、路线图、按键绑定、难度、Boss 名牌、拾取弹出、存档、对话轮盘、拼图背包、装配、推理板、制作人员）。模板给结构、交互和内容，可引用版式预设与容器预设；材质与母题只放进 accent（只补空）。audience：premium = 买断 / PC / 主机常见，f2p = 手游运营常见，both = 都有；界面模板选择器默认按当前商业模式排序。

| id | 名称 | 受众 | 说明 | 版式 / 容器 | 参考 | 设定的参数 | 本屏强调（只补空） |
|---|---|---|---|---|---|---|---|
| `tpl.login` | 登录 | f2p | 海报 + 大 LOGO + 一个入口 + 合规角标 | pat.poster | GameUI#1762374、GameUI#614493 | `cnt.subtype`=登录；`lay.container`=全屏页；`lay.focalSide`=居中；`rel.behind`=替换为背景；`ast.bgArt`=主视觉海报；`cnt.elements`=标题 / LOGO、主行动按钮、加载 / 等待指示；`el.title.form`=LOGO；`el.title.scale`=1.8；`el.cta.form`=宽按钮；`el.cta.screenAnchor`=下中；`ix.dismiss`=点任意处继续；`ix.continueCue`="点击任意处继续"小字；`ops.compliance`=年龄角标、版号 / 健康游戏长文、版本号；`ops.entries`=侧边图标列 |  |
| `tpl.server` | 选服 | f2p | 暗化背景 + 弹窗 + 左页签 + 双列服务器 + 状态点 + 置顶上次登录 |  | GameUI#534976、GameUI#485301 | `cnt.subtype`=选服；`lay.container`=居中弹窗；`lay.nav`=左侧页签；`cnt.dataShape`=同类集合；`lay.arrangement`=规则网格；`lay.columns`=2；`st.statusMark`=彩色圆点；`lay.pinned`=顶部置顶行；`rel.behind`=实时场景；`rel.dim`=0.6；`ix.confirm`=即点即生效；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X；`col.coding`=状态色 |  |
| `tpl.create` | 创建角色 | both | 中央 3D 模型 + 左侧选项 + 右下"下一步" |  | GameUI#594209、GameUI#534982 | `cnt.subtype`=创建角色 / 捏脸；`lay.container`=全屏页；`lay.composition`=左右分栏；`cnt.focal`=角色；`cnt.characterMedium`=3D 实时模型；`lay.focalSide`=居中；`lay.nav`=左侧页签；`ix.mode`=选择条目；`cnt.elements`=主行动按钮；`el.cta.form`=宽按钮；`el.cta.screenAnchor`=右下；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=左上返回箭头 |  |
| `tpl.notice` | 公告 | f2p | 暗化背景上的阅读弹窗：左页签 + 长文滚动 + 红字强调 |  | GameUI#943688、GameUI#572305 | `cnt.subtype`=公告；`lay.container`=居中弹窗；`lay.panelSize`=0.9；`lay.nav`=左侧页签；`cnt.dataShape`=叙述文本；`cnt.textLength`=长文滚动；`lay.overflow`=纵向滚动；`hier.inline`=红字；`rel.dim`=0.6；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X；`ix.mode`=只读；`flow.entry`=自动弹出 |  |
| `tpl.naming` | 起名 | f2p | 输入框 + 随机骰子 + 吉祥物陪伴，强制完成 |  | GameUI#604573、GameUI#564126 | `cnt.subtype`=起名；`lay.container`=居中弹窗；`cnt.dataShape`=表单；`ix.mode`=文本输入；`cmp.input`=白底圆角槽；`cnt.companion`=吉祥物 / NPC 陪衬；`ix.dismiss`=不可关闭；`cnt.tone`=角色口吻 |  |
| `tpl.lobby` | 主界面（手游） | f2p | 角色展台 + 顶栏货币 + 底部导航 + 浮动运营入口 + 红点 |  | GameUI#1748411、GameUI#646877 | `cnt.subtype`=主界面；`lay.container`=全屏页；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`lay.focalSide`=居中；`lay.nav`=底部页签；`ops.entries`=浮动角标入口；`flow.chrome`=顶栏货币；`st.newCue`=红点；`cnt.elements`=身份 / 头像 / 等级、资源 / 货币、主行动按钮；`el.profile.form`=头像 + 等级；`el.profile.screenAnchor`=左上；`el.resources.form`=胶囊 + 加号；`el.resources.screenAnchor`=右上；`el.cta.form`=宽按钮；`el.cta.screenAnchor`=右下 |  |
| `tpl.title` | 标题 / 主菜单（PC / 主机） | premium | 实时场景或插画 + 大 LOGO + 竖排纯文字菜单贴左 |  | Castle Crashers s204360_0、GameUI#545736 | `cnt.screen`=标题 / 主菜单；`lay.container`=全屏页；`rel.behind`=实时场景；`cnt.dataShape`=同类集合；`lay.arrangement`=竖列；`cmp.button`=文字；`cmp.buttonBox`=关；`cnt.focal`=标题字；`lay.focalSide`=左；`cnt.elements`=标题 / LOGO、按键 / 操作提示；`el.title.form`=LOGO；`el.prompt.form`=按键图例条；`ix.mode`=选择条目 |  |
| `tpl.pausePc` | 暂停（PC / 主机） | premium | 冻结 + 暗幕 + 竖排文字菜单 + 按键图例 |  | GameUI#573374、GameUI#545736 | `cnt.subtype`=暂停；`lay.container`=全屏页；`rel.behind`=冻结；`rel.dim`=0.75；`cnt.dataShape`=同类集合；`lay.arrangement`=竖列；`cmp.button`=文字；`cmp.buttonBox`=关；`cnt.focal`=无（信息就是主体）；`cnt.elements`=按键 / 操作提示；`el.prompt.form`=按键图例条；`el.prompt.screenAnchor`=下中；`ix.dismiss`=按键返回（Esc / B）；`ix.close`=按键提示（Esc / B 返回）；`ix.mode`=选择条目 |  |
| `tpl.pauseMobile` | 暂停（手游） | f2p | 居中弹窗 + 2–3 个胶囊按钮 |  | GameUI#197284、GameUI#217711 | `cnt.subtype`=暂停；`lay.container`=居中弹窗；`lay.composition`=单区；`cmp.button`=文字；`cnt.itemCount`=3；`rel.behind`=冻结；`rel.dim`=0.5；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X；`ix.mode`=多按钮 |  |
| `tpl.settings` | 设置 | both | 左页签分组 + 控件列表（开关 / 下拉 / 滑条混用）+ 即时预览 |  | GameUI#1511530、GameUI#594277、GameUI#594278 | `cnt.subtype`=设置页；`lay.container`=全屏页；`lay.nav`=左侧页签；`cnt.dataShape`=表单；`cmp.optionBool`=开关；`cmp.optionEnum`=左右切换 ◁ ▷；`cmp.optionRange`=滑条；`cmp.listRow`=标题、行内按钮；`lay.preview`=开；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=左上返回箭头 |  |
| `tpl.loading` | 读取 | both | 主视觉 + 右下进度百分比 + 一行提示 + 角落 LOGO |  | GameUI#1775202、GameUI#1767142 | `cnt.subtype`=读取；`lay.container`=全屏页；`rel.behind`=替换为背景；`ast.bgArt`=主视觉海报；`cnt.elements`=加载 / 等待指示、标题 / LOGO；`el.loading.form`=进度图形；`cmp.gauge@el.loading`=细条；`el.loading.valueLabel`=百分比；`el.loading.screenAnchor`=右下；`el.title.form`=LOGO；`el.title.scale`=0.6；`el.title.screenAnchor`=左上；`cnt.textLength`=一句话；`ix.mode`=只读；`ix.dismiss`=自动消失 |  |
| `tpl.cutscene` | 过场 | both | 直接叠加：底部字幕 + 右上跳过（电影黑边是画面参数 camera.letterbox） |  | GameUI#1009447、GameUI#575861 | `cnt.subtype`=过场动画；`lay.container`=直接叠加；`rel.behind`=实时场景；`cnt.elements`=字幕 / 说话人；`cmp.dialogBox@el.subtitle`=无框字幕；`el.subtitle.screenAnchor`=下中；`ix.skip`=长按跳过；`ix.skipAnchor`=右上；`ix.mode`=只读；`ix.dismiss`=自动消失 |  |
| `tpl.guide` | 新手引导 | f2p | 叠在真实界面上：暗幕镂空 + 手指 + 吉祥物气泡 + 强制点击 |  | GameUI#584773、GameUI#585162 | `cnt.subtype`=新手引导；`lay.container`=直接叠加；`cnt.elements`=引导指示 / 聚光；`el.guide.form`=暗幕镂空；`ix.guideForce`=强制点击高亮目标；`ix.dismiss`=不可关闭；`cnt.companion`=吉祥物 / NPC 陪衬；`cmp.dialogBox`=带尾气泡；`ix.skip`=跳过按钮；`ix.skipAnchor`=右下 |  |
| `tpl.unlock` | 功能解锁 | both | 无框浮空徽记 + 放射光 + 展开演出 + 点击继续 |  | GameUI#600483、GameUI#564247 | `cnt.subtype`=功能解锁；`lay.container`=居中弹窗；`cmp.modal`=无框浮空；`rel.dim`=0.7；`cnt.focal`=物品 / 奖励；`cmp.badge`=晶体 / 星芒；`mo.reveal`=卷轴 / 破解展开；`mo.reward`=2；`ix.dismiss`=点任意处继续；`ix.continueCue`="点击任意处继续"小字；`cnt.stage`=结果 | `ast.fx`=放射光芒 |
| `tpl.confirm` | 二次确认 | both | 一句话 + 取消 / 确认，主次靠颜色 |  | GameUI#594215、GameUI#580656 | `cnt.subtype`=确认弹窗；`lay.container`=居中弹窗；`lay.panelSize`=0.2；`cmp.modal`=标准面板；`cnt.textLength`=一句话；`ix.mode`=多按钮；`ix.confirm`=即点即生效；`hier.cta`=颜色 / 饱和度；`col.semantic`=橙主灰次；`rel.dim`=0.6；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=角外悬挂红圆 X；`cnt.stage`=确认 / 消耗前 |  |
| `tpl.toast` | 提示条 | both | 圆角提示卡，自动消失，不阻断 |  | GameUI#1663800 | `cnt.subtype`=提示条；`lay.container`=横幅 / 提示条；`lay.panelSize`=0.2；`cnt.elements`=通知 / 大字提示；`el.notify.form`=圆角提示卡；`el.notify.screenAnchor`=上中；`ix.dismiss`=自动消失；`cnt.textLength`=一句话 |  |
| `tpl.callout` | 战斗大字提示 | both | 整屏横贯带 + 描边投影大字 + 砸入 + 速度线 |  | GameUI#564135、GameUI#604580 | `cnt.subtype`=战斗大字提示；`lay.container`=横幅 / 提示条；`lay.panelSize`=0.6；`cnt.elements`=通知 / 大字提示；`el.notify.form`=整屏横贯带大字；`mo.enter`=砸入（放大落下 + 震）；`ix.dismiss`=自动消失；`cnt.textLength`=仅标题 | `typ.titleFx`=描边 + 投影；`ast.fx`=面板速度线 |
| `tpl.levelup` | 升级提示 | both | 无框浮空 + a → b 属性 + 放射光 |  | GameUI#580609、GameUI#572370 | `cnt.subtype`=升级提示；`lay.container`=居中弹窗；`cmp.modal`=无框浮空；`rel.dim`=0.6；`st.delta`=a → b 箭头；`mo.reward`=2；`ix.dismiss`=点任意处继续；`ix.continueCue`="点击任意处继续"小字；`cnt.stage`=结果 | `vis.motif`=羽翼 / 桂冠 / 皇冠；`ast.fx`=放射光芒 |
| `tpl.reward` | 恭喜获得 | both | 暗幕上的奖励网格 + 缎带标题 + 放射光 + 逐个飞入 + 点空白关闭 |  | GameUI#603729、GameUI#1511429 | `cnt.subtype`=恭喜获得；`lay.container`=居中弹窗；`cmp.modal`=无框浮空；`rel.dim`=0.7；`rel.sceneBlur`=8；`cnt.elements`=奖励 / 获得物、标题 / LOGO；`el.reward.form`=图标 + 数量；`el.reward.arrangement`=规则网格；`mo.reveal`=逐个飞入；`st.rarityCue`=边框色、星级；`ix.dismiss`=点空白处关闭；`cnt.stage`=结果 | `cmp.plate@title`=缎带；`ast.fx`=放射光芒 |
| `tpl.settle` | 结算（对战） | f2p | 斜体大字胜负 + 英雄立绘 + MVP + 继续 / 分享 |  | GameUI#1748480、GameUI#594345 | `cnt.subtype`=结算；`lay.container`=全屏页；`cnt.focal`=标题字；`col.coding`=胜负冷暖；`mo.enter`=砸入（放大落下 + 震）；`cnt.elements`=标题 / LOGO、名次 / 段位 / 评级、奖励 / 获得物、主行动按钮；`el.title.scale`=2；`el.rank.form`=奖牌 / MVP；`el.cta.form`=宽按钮；`el.cta.screenAnchor`=下中；`ops.actions`=分享；`cnt.tone`=激励；`ix.dismiss`=点关闭 / 确认按钮 |  |
| `tpl.stats` | 数据统计 / 记分板 | both | 阵营色表格 + 行内横条 + MVP 高亮 |  | GameUI#1178800、GameUI#604592 | `cnt.subtype`=数据统计 / 战报；`lay.container`=全屏页；`cnt.dataShape`=对比表；`st.statViz`=行内横条；`col.coding`=阵营色；`cmp.listRow`=图标 / 头像、标题、数值 / 战力、进度、状态标记、时间；`hier.emphasis`=颜色、字体反差 |  |
| `tpl.npc` | NPC 对话 | both | 底部通栏 + 名牌条 + 立绘被框压住下半 + 打字机 + 自动 / 跳过 + 选项 |  | GameUI#604577、GameUI#594004 | `cnt.subtype`=NPC 对话；`lay.container`=底 / 顶托盘；`cmp.dialogBox`=底部通栏；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`lay.layering`=面板压主体；`lay.focalSide`=左；`ix.dismiss`=点任意处继续；`ix.continueCue`=闪烁小三角 / 叶片；`mo.textReveal`=打字机逐字；`ix.skip`=自动 / 快进 / 日志一组；`rel.behind`=实时场景；`cnt.elements`=字幕 / 说话人、对话 / 事件选项；`el.choices.form`=并列横幅；`el.choices.arrangement`=竖列 | `cmp.plate@name`=边缘小标签条 |
| `tpl.inventory` | 背包 | both | 左页签 + 方格网格 + 右侧常驻详情 + NEW 角标 | pat.masterDetail | GameUI#1743976、GameUI#604661 | `cnt.subtype`=背包 / 仓库；`lay.container`=全屏页；`lay.arrangement`=规则网格；`cmp.slot`=方格；`lay.columns`=5；`lay.nav`=左侧页签；`st.newCue`=NEW 角标；`st.emptySlot`=不画空格（只显示占用格）；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X |  |
| `tpl.hero` | 角色详情 | f2p | 左侧全身立绘 + 右侧属性面板 + 战力大字 + 左右切换 |  | GameUI#604633、GameUI#1748417 | `cnt.subtype`=角色详情 / 养成；`lay.container`=全屏页；`lay.composition`=单区；`lay.focalSide`=左；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`cnt.dataShape`=单项详情；`st.statViz`=战力大字；`lay.overflow`=分页；`lay.pageIndicator`=左右箭头 |  |
| `tpl.skilltree` | 技能树 | both | 星图连线 + 发光节点 + 未学灰度 + 临时详情 | pat.pannableCanvas | Grim Dawn s219990_2、GameUI#573454 | `cnt.subtype`=技能；`lay.container`=全屏页；`cnt.dataShape`=关系网；`lay.arrangement`=星图散点；`cmp.node`=发光点；`st.locked`=灰度 |  |
| `tpl.worldmap` | 世界地图 | both | 手绘地图 + 图标针 + 云雾未探索 + 点开详情 | pat.pannableCanvas | GameUI#604642、GameUI#594251 | `cnt.subtype`=地图；`lay.container`=全屏页；`cnt.dataShape`=空间 / 地图；`vis.mapStyle`=手绘水彩；`vis.mapUnexplored`=云雾遮挡；`cmp.node`=图标针 |  |
| `tpl.quest` | 任务 | f2p | 日常 / 周常页签 + 五件套行 + 底部活跃度宝箱轨道 |  | GameUI#1743964、GameUI#604631 | `cnt.subtype`=任务；`lay.container`=全屏页；`cnt.dataShape`=同类集合；`lay.arrangement`=竖列；`cmp.listRow`=图标 / 头像、标题、进度、奖励图标、行内按钮；`cmp.gauge@progress`=横条；`lay.nav`=顶部页签；`cnt.elements`=奖励 / 获得物；`el.reward.form`=宝箱 + 物品；`el.reward.arrangement`=轨道；`st.done`=灰化沉底；`col.semantic`=绿确认红取消 |  |
| `tpl.achievement` | 成就墙 | both | 徽章网格 + 未获得压暗计数 + 总进度 | pat.gallery | GameUI#594259、GameUI#585169 | `cnt.subtype`=成就；`lay.container`=全屏页；`cmp.badge`=圆章 + 星；`st.locked`=压暗 + 进度数；`cmp.gauge@progress`=x / y 数字 |  |
| `tpl.codex` | 图鉴（手账） | premium | 屏幕上翻开的手账：左页格子、右页详情，未收集剪影（容器是手账，放置仍是屏幕叠加） |  | GameUI#1463177、Return of the Obra Dinn | `cnt.subtype`=图鉴；`lay.container`=全屏页；`ast.container`=笔记本 / 手账；`lay.detail`=常驻一侧；`cnt.dataShape`=同类集合；`lay.arrangement`=规则网格；`st.locked`=黑剪影；`cmp.slot`=无格直接摆放 |  |
| `tpl.mall` | 商城 | f2p | 左页签 + 三列竖卡 + 内嵌价格按钮 + 折扣 / 限购 / 倒计时 + 顶部横幅 | pat.gallery | GameUI#1743969、GameUI#596129 | `cnt.subtype`=商城；`lay.container`=全屏页；`cmp.slot`=竖卡；`lay.columns`=3；`lay.nav`=左侧页签；`cnt.elements`=价格 / 消耗；`el.cost.form`=按钮内嵌价 / 消耗；`ops.badges`=折扣角标、限购 x/y、倒计时；`ops.entries`=顶部轮播 / 横幅；`ix.confirm`=二次确认弹窗 |  |
| `tpl.shopCounter` | 柜台商店 | premium | 店主立绘 + 货架上直接摆商品 + 图标价 | ctr.counter | Florence、GameUI#486069、GameUI#567745 | `cnt.subtype`=拍卖行 / 交易所 / 柜台；`lay.container`=全屏页；`cnt.focal`=角色；`cnt.characterMedium`=半身立绘；`lay.focalSide`=右；`cnt.elements`=价格 / 消耗；`el.cost.form`=货币图标 + 数字；`ix.mode`=选择条目；`ix.confirm`=选中 + 确认按钮 |  |
| `tpl.gachaEntry` | 抽卡入口 | f2p | 出框立绘 + 池名大字 + 一次 / 十次双键 + 保底 + 底部卡池页签 |  | GameUI#604664、GameUI#564219 | `cnt.subtype`=十连抽 / 招募；`cnt.stage`=入口 / 选择；`lay.container`=全屏页；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`lay.layering`=主体出框压面板；`lay.nav`=底部页签；`cnt.elements`=主行动按钮、价格 / 消耗、标题 / LOGO；`el.cta.form`=一对按钮；`el.cost.form`=按钮内嵌价 / 消耗；`el.title.form`=艺术大字海报标题；`ops.badges`=保底提示、倒计时 |  |
| `tpl.gachaResult` | 十连结果 | f2p | 金字塔牌阵 + 卡背预告稀有度 + 高强度演出 + 再抽 |  | GameUI#646920、GameUI#625068 | `cnt.subtype`=十连抽 / 招募；`cnt.stage`=结果；`lay.container`=全屏页；`cnt.dataShape`=同类集合；`lay.arrangement`=金字塔 / 菱阵；`cnt.itemCount`=10；`cmp.card`=整幅立绘 + 少字；`mo.revealTease`=开；`mo.reveal`=翻牌；`mo.reward`=3；`st.rarityCue`=光效色、边框色、字母徽标（SSR）；`ix.dismiss`=点任意处继续；`ix.continueCue`="点击任意处继续"小字；`ops.actions`=再抽 N 次 / 再来一局；`rel.behind`=替换为背景；`ast.bgArt`=纯色 / 黑场 |  |
| `tpl.pass` | 通行证 | f2p | 横向轨道 + 上免费下付费 + 锁 + 终点大奖放大 + 解锁按钮 |  | GameUI#594312、GameUI#556160 | `cnt.subtype`=通行证；`lay.container`=全屏页；`cnt.dataShape`=序列 / 时间线；`lay.arrangement`=轨道；`lay.overflow`=横向滚动；`col.coding`=免费 / 付费档；`st.locked`=锁图标；`cmp.gauge@progress`=节点轨道 + 里程碑；`hier.emphasis`=尺寸；`cnt.elements`=价格 / 消耗、主行动按钮；`el.cost.form`=按钮内嵌价 / 消耗；`cmp.node`=圆形编号 |  |
| `tpl.checkin` | 七日签到 | f2p | 3×3 礼盒格 + 右侧代言立绘 + 盖章已领 + 第七天放大 |  | GameUI#596110、GameUI#575888 | `cnt.subtype`=七日 / 签到；`lay.container`=居中弹窗；`cnt.dataShape`=序列 / 时间线；`lay.arrangement`=规则网格；`lay.columns`=3；`cnt.itemCount`=7；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`lay.focalSide`=右；`st.done`=盖章；`hier.emphasis`=尺寸、发光；`typ.numbering`=01 / DAY 1；`ops.badges`=倒计时；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=角外悬挂红圆 X |  |
| `tpl.firstPay` | 首充 | f2p | 海报化：出框立绘 + 巨型倍率字 + 3 个奖励格 + 内嵌价格按钮 | pat.poster | GameUI#604606、GameUI#575919 | `cnt.subtype`=充值 / 首充 / VIP；`lay.container`=居中弹窗；`ops.badges`=倍率大字、赠送 / 首充标签；`cnt.elements`=奖励 / 获得物、主行动按钮、价格 / 消耗；`el.reward.form`=图标 + 数量；`el.reward.arrangement`=横排；`el.cost.form`=按钮内嵌价 / 消耗；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X；`cnt.tone`=营销夸张 |  |
| `tpl.vs` | VS 对阵 | both | 斜切分屏 + 双方立绘 + VS + 阵营色 + 自动消失 |  | GameUI#520751、GameUI#575874 | `cnt.subtype`=VS / 匹配；`lay.container`=全屏页；`lay.composition`=斜切分屏；`cnt.focal`=角色；`cnt.characterMedium`=全身立绘；`lay.focalSide`=两侧（对话双人 / 对阵）；`col.coding`=阵营色；`mo.enter`=砸入（放大落下 + 震）；`ix.mode`=只读；`ix.dismiss`=自动消失；`cnt.stage`=揭示演出 |  |
| `tpl.formation` | 布阵 | f2p | 上阵位六角网 + 下名册托盘 + 拖拽 + 空槽加号 + 战力 |  | GameUI#567706、GameUI#592060 | `cnt.subtype`=组队 / 布阵；`lay.container`=全屏页；`lay.composition`=上下分栏；`cnt.dataShape`=同类集合；`lay.arrangement`=六角网；`ix.mode`=拖拽；`st.emptySlot`=+ 号；`cmp.slot`=竖卡；`st.statViz`=战力大字；`cnt.elements`=主行动按钮；`el.cta.form`=宽按钮；`el.cta.screenAnchor`=右下 |  |
| `tpl.leaderboard` | 排行榜 | both | 领奖台前三 + 榜单行 + 自己固定在底部 + 顶部榜种页签 |  | GameUI#625095、GameUI#594311 | `cnt.subtype`=排行榜；`lay.container`=全屏页；`cnt.dataShape`=同类集合；`lay.arrangement`=竖列；`st.rank`=领奖台 / 立绘前三；`lay.pinned`=底部固定行；`cmp.listRow`=图标 / 头像、标题、数值 / 战力；`lay.nav`=顶部页签 |  |
| `tpl.chat` | 聊天抽屉 | f2p | 半屏抽屉，另一侧实时场景照跑；频道竖页签 |  | GameUI#1511534、GameUI#604630 | `cnt.subtype`=聊天；`lay.container`=侧抽屉；`rel.behind`=实时场景；`rel.dim`=0；`cmp.dialogBox`=聊天软件式；`cnt.elements`=聊天；`el.chat.form`=气泡流；`lay.nav`=左侧页签；`cmp.input`=白底圆角槽；`ix.dismiss`=点空白处关闭 |  |
| `tpl.mail` | 邮件 | f2p | 左列表右详情 + 附件图标行 + 一键领取 + 空箱水印 | pat.masterDetail | GameUI#604607、GameUI#646885 | `cnt.subtype`=邮件；`lay.container`=居中弹窗；`lay.panelSize`=0.9；`cnt.elements`=奖励 / 获得物、主行动按钮；`el.reward.form`=图标 + 数量；`el.reward.arrangement`=横排；`el.cta.form`=宽按钮；`st.newCue`=红点；`st.emptyList`=水印徽记；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X |  |
| `tpl.levelPath` | 关卡路径 | f2p | 竖向长卷蜿蜒路径 + 圆形编号节点 + 星级 + 锁 |  | GameUI#596124、GameUI#580668 | `cnt.subtype`=关卡 / 挑战选择；`lay.container`=全屏页；`cnt.dataShape`=序列 / 时间线；`lay.arrangement`=蜿蜒路径；`lay.overflow`=长卷；`cmp.node`=圆形编号；`st.locked`=锁图标；`cmp.gauge@progress`=星级 | `vis.mapStyle`=手绘水彩 |
| `tpl.chapterCard` | 章节标题卡 | both | 黑场 + 竖排标题 + 第 X 章 + 淡入淡出，不阻断 |  | GameUI#572342、GameUI#943704 | `cnt.subtype`=章节标题卡；`lay.container`=全屏页；`rel.behind`=替换为背景；`ast.bgArt`=纯色 / 黑场；`cnt.elements`=标题 / LOGO；`el.title.form`=章节标题卡；`el.title.screenAnchor`=中心；`typ.numbering`=第 X 章；`mo.enter`=淡入；`ix.dismiss`=自动消失；`ix.mode`=只读 | `typ.direction`=标题竖排 |
| `tpl.forge` | 锻造 / 变强 | f2p | 中央装置 + 环绕材料槽 + a → b + 持有 / 需求 + 法阵光效 |  | GameUI#580682、GameUI#646899 | `cnt.subtype`=锻造 / 合成 / 变强；`lay.container`=全屏页；`cnt.focal`=装置；`cnt.dataShape`=同类集合；`lay.arrangement`=环绕中心 / 轮盘；`st.emptySlot`=+ 号；`st.delta`=a → b 箭头；`cnt.elements`=价格 / 消耗、主行动按钮；`el.cost.form`=持有 / 需求（红绿）；`hier.cta`=尺寸 | `ast.fx`=魔法阵 |
| `tpl.build` | 建造 | both | 底部卡片托盘 + 自由放置 + 幽灵预览 ✓✕ + 建造网格 |  | GameUI#518081、GameUI#518082 | `cnt.subtype`=建造 / 家园；`lay.container`=底 / 顶托盘；`cmp.slot`=竖卡；`ix.mode`=自由放置；`ix.confirm`=幽灵预览 + ✓ / ✕；`cnt.elements`=价格 / 消耗、信息叠层 / 图例；`el.cost.form`=按钮内嵌价 / 消耗；`el.overlay.form`=建造网格；`el.overlay.diegesis`=空间内；`el.overlay.worldRender`=地面贴花；`rel.behind`=实时场景 |  |
| `tpl.hand` | 手牌牌桌 | both | TCG 卡 + 牌桌容器 + 拖拽出牌 + 意图 + 结束回合 |  | Slay the Spire 2 s2868840_0、Hearthstone | `cnt.subtype`=卡组 / 卡牌；`lay.container`=直接叠加；`ix.mode`=拖拽；`cmp.card`=插画窗 + 费用角标 + 文本框；`ast.container`=牌桌；`cnt.elements`=技能 / 冷却 / 弹药 / 手牌、敌人血条 / 预警 / 意图、主行动按钮；`el.abilities.form`=手牌；`el.abilities.arrangement`=扇形；`el.threat.form`=意图图标 + 数字；`el.cta.form`=大圆钮 |  |
| `tpl.wheel` | 转盘 | f2p | 环形奖品 + 指针 + 转动停靠 + 单抽 / 十连 | pat.ring | GameUI#604670、GameUI#646917 | `cnt.subtype`=转盘 / 抽奖；`lay.container`=全屏页；`cnt.focal`=装置；`mo.reveal`=转动停靠；`cnt.elements`=主行动按钮；`el.cta.form`=一对按钮；`ops.badges`=倒计时 |  |
| `tpl.redPacket` | 红包 | f2p | 信封本体 + 金币"抢"圆钮 + 拆开后巨型金额 |  | GameUI#625077、GameUI#214553 | `cnt.subtype`=红包；`lay.container`=居中弹窗；`cmp.modal`=无框浮空；`rel.dim`=0.7；`ast.container`=信封 / 信笺；`cnt.dataShape`=单个数值；`cnt.elements`=主行动按钮；`el.cta.form`=大圆钮；`cnt.stage`=揭示演出；`ix.dismiss`=点空白处关闭 |  |
| `tpl.popupAd` | 拍脸图 | f2p | 整张海报 + 倒计时 + 今日不再显示 + 右上 X | pat.poster | GameUI#1767145、GameUI#1562329 | `cnt.subtype`=拍脸图；`lay.container`=居中弹窗；`ops.poster`=1；`ops.badges`=倒计时；`ops.actions`=今日不再显示；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=右上 X；`flow.entry`=自动弹出 |  |
| `tpl.photo` | 拍照模式 | both | 实时场景 + 取景角标 + 右下大圆快门 + 底部滤镜栏 + 分享 |  | GameUI#126496、GameUI#136811 | `cnt.subtype`=拍照模式；`lay.container`=底 / 顶托盘；`rel.behind`=冻结；`rel.dim`=0；`cnt.elements`=主行动按钮；`el.cta.form`=快门；`el.cta.screenAnchor`=右下；`ops.actions`=分享；`ix.dismiss`=按键返回（Esc / B） | `vis.motif`=角括号 / 准星角 |
| `tpl.draft3` | 三选一升级 / 祝福 | premium | 三张并排强化卡 + 稀有度 + 重抽 / 跳过；画面冻结压暗 |  | Hades（恩赐）、Vampire Survivors、Slay the Spire（选卡） | `cnt.subtype`=三选一升级 / 祝福；`lay.container`=居中弹窗；`cmp.modal`=无框浮空；`rel.behind`=冻结；`rel.dim`=0.6；`cnt.dataShape`=同类集合；`lay.arrangement`=横排；`cnt.itemCount`=3；`cmp.slot`=竖卡；`ix.mode`=选择条目；`ix.confirm`=即点即生效；`ix.dismiss`=不可关闭；`st.rarityCue`=边框色、字母徽标（SSR）；`col.coding`=稀有度；`ops.actions`=再抽 N 次 / 再来一局；`cnt.stage`=入口 / 选择 |  |
| `tpl.runSummary` | 本局总结 / 死亡 | premium | 死因 + 本局时长、击杀、获得 + 解锁进度 + 再来一局 |  | Hades、Dead Cells、Vampire Survivors | `cnt.subtype`=本局总结 / 死亡；`lay.container`=全屏页；`rel.behind`=冻结；`rel.dim`=0.7；`rel.sceneTone`=去饱和；`cnt.dataShape`=对比表；`st.statViz`=图标 + 计数；`cnt.tone`=冷峻 / 惩罚；`cnt.elements`=标题 / LOGO、奖励 / 获得物、主行动按钮；`el.reward.form`=图标 + 数量；`el.reward.arrangement`=横排；`el.cta.form`=宽按钮；`mo.valueChange@el.reward`=数字滚动；`ops.actions`=再抽 N 次 / 再来一局；`ix.dismiss`=点关闭 / 确认按钮 |  |
| `tpl.routeMap` | 路线节点地图 | premium | 自下而上分叉路线 + 节点类型图标 + 已走路径 + 当前位置 |  | Slay the Spire、Inscryption、FTL | `cnt.subtype`=路线节点地图；`lay.container`=全屏页；`cnt.dataShape`=关系网；`lay.arrangement`=树 / 连线；`lay.overflow`=长卷；`cmp.node`=建筑图标；`st.done`=划掉；`ix.mode`=选择条目 | `vis.mapStyle`=羊皮纸古海图 |
| `tpl.rebind` | 按键绑定 | premium | 动作列表 + 键位按钮 + 手柄示意图 |  | GameUI#573377、Hollow Knight s367520_5 | `cnt.subtype`=按键绑定；`lay.container`=全屏页；`cnt.dataShape`=表单；`lay.composition`=左右分栏；`cmp.bindingMap`=手柄示意图 + 引线；`cmp.listRow`=标题、行内按钮；`ix.mode`=选择条目；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=左上返回箭头 |  |
| `tpl.difficulty` | 难度 / 辅助模式 | premium | 难度档位卡 + 逐项辅助开关与说明 |  | Celeste（Assist Mode）、Hades（God Mode） | `cnt.subtype`=难度 / 辅助模式；`lay.container`=全屏页；`cnt.dataShape`=表单；`cmp.optionBool`=开关；`cmp.optionRange`=分格条；`cmp.listRow`=标题、说明、行内按钮；`cnt.textLength`=短段（2–3 句）；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=左上返回箭头 |  |
| `tpl.bossIntro` | Boss 登场名牌 | premium | 镜头定格 + 大字名 + 称号，自动消失 |  | Hades、Hollow Knight、Elden Ring | `cnt.subtype`=Boss 登场名牌；`lay.container`=横幅 / 提示条；`lay.panelSize`=0.4；`cnt.elements`=标题 / LOGO；`el.title.form`=章节标题卡；`el.title.scale`=1.6；`el.title.screenAnchor`=下中；`mo.enter`=淡入；`ix.dismiss`=自动消失；`cnt.textLength`=仅标题 |  |
| `tpl.pickupToast` | 拾取 / 成就弹出 | both | 角落小卡：图标 + 名字 + 一句说明，自动消失 |  | Binding of Isaac s401920_3、Steam 成就弹出 | `cnt.subtype`=拾取 / 成就弹出；`lay.container`=横幅 / 提示条；`lay.panelSize`=0.1；`cnt.elements`=通知 / 大字提示；`el.notify.form`=圆角提示卡；`el.notify.screenAnchor`=右下；`ix.dismiss`=自动消失；`cnt.textLength`=一句话 |  |
| `tpl.saveSlot` | 存档槽 | premium | 三个存档卡（缩略图 + 地点 + 时长） |  | Hollow Knight、Resident Evil 2 | `cnt.subtype`=存档槽；`lay.container`=全屏页；`cnt.dataShape`=同类集合；`lay.arrangement`=竖列；`cnt.itemCount`=3；`cmp.slot`=横卡行；`cmp.listRow`=图标 / 头像、标题、说明、时间；`ix.confirm`=二次确认弹窗；`ix.dismiss`=点关闭 / 确认按钮；`ix.close`=左上返回箭头 |  |
| `tpl.dialogueWheel` | 对话轮盘 | premium | 选项环绕中心，摇杆方向选择 |  | Mass Effect、Cyberpunk 2077 | `cnt.subtype`=对话轮盘；`lay.container`=直接叠加；`rel.behind`=实时场景；`cnt.elements`=对话 / 事件选项、字幕 / 说话人；`el.choices.form`=文字行；`el.choices.arrangement`=环绕中心 / 轮盘；`el.choices.screenAnchor`=右下；`cmp.dialogBox@el.subtitle`=无框字幕；`ix.dismiss`=不可关闭 |  |
| `tpl.packGrid` | 拼图格背包 | premium | 物品按形状占格、可旋转、右侧详情 | pat.masterDetail | Resident Evil 4、Backpack Hero、Diablo II | `cnt.subtype`=拼图格背包；`lay.container`=全屏页；`lay.arrangement`=规则网格；`lay.columns`=8；`cmp.slot`=方格；`ix.mode`=拖拽；`st.emptySlot`=暗坑 / 凹槽；`ix.dismiss`=按键返回（Esc / B） |  |
| `tpl.loadout` | 装备纸娃娃 / 技能装配 | premium | 中央角色剪影 + 一圈装备槽 + 属性对比 |  | Diablo、Elden Ring、Hades（武器 / 信物） | `cnt.subtype`=装备纸娃娃 / 技能装配；`lay.container`=全屏页；`cnt.focal`=角色；`cnt.characterMedium`=剪影；`lay.focalSide`=居中；`cnt.dataShape`=同类集合；`lay.arrangement`=环绕中心 / 轮盘；`cmp.slot`=方格；`st.emptySlot`=灰色剪影；`st.selected`="已装备"角标；`st.delta`=前后双卡；`lay.detail`=临时出现；`ix.dismiss`=按键返回（Esc / B） |  |
| `tpl.deduction` | 推理板 | premium | 线索卡 + 连线 / 填空，可拖动画布 | pat.pannableCanvas + ctr.desk | Return of the Obra Dinn、Shadows of Doubt、The Case of the Golden Idol | `cnt.subtype`=推理板；`cnt.dataShape`=关系网；`lay.arrangement`=自由散落；`ix.mode`=拖拽；`ix.confirm`=选中 + 确认按钮；`cmp.slot`=横卡行 |  |
| `tpl.credits` | 制作人员 | both | 滚动名单 + 背景插画 |  | Hollow Knight（IIG Credits） | `cnt.subtype`=制作人员；`lay.container`=全屏页；`rel.behind`=替换为背景；`ast.bgArt`=风景插画；`cnt.dataShape`=叙述文本；`lay.overflow`=纵向滚动；`ix.mode`=只读；`ix.dismiss`=按键返回（Esc / B）；`mo.textReveal`=逐行 |  |

### 3.8 版式预设（v1 版式原型里不属于"容器"的那几种）

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `pat.masterDetail` | 左列表右详情 | 选中项在另一栏常驻展开（v1 lay.archetype = masterDetail） | GameUI#604571、GameUI#577637 | `lay.composition`=左右分栏；`lay.detail`=常驻一侧；`cnt.dataShape`=同类集合；`ix.mode`=选择条目 |
| `pat.gallery` | 网格陈列 | 卡片或格子铺满主区（v1 gallery） | GameUI#573378、GameUI#596108 | `cnt.dataShape`=同类集合；`lay.arrangement`=规则网格；`lay.overflow`=纵向滚动；`cmp.slot`=方格；`ix.mode`=选择条目 |
| `pat.pannableCanvas` | 可拖动大画布 | 地图、技能树、关卡图占主区，面板叠在边上（v1 mapMain，改名） | GameUI#594027、GameUI#604588、Grim Dawn s219990_2 | `lay.composition`=单区；`lay.overflow`=可拖动大画布；`lay.detail`=临时出现 |
| `pat.fan` | 扇形手牌 | 底部扇形或横排手牌（v1 fan） | GameUI#577645、Slay the Spire 2 s2868840_0 | `cnt.dataShape`=同类集合；`lay.arrangement`=扇形；`lay.container`=底 / 顶托盘；`ix.mode`=拖拽 |
| `pat.ring` | 径向轮盘 | 围绕中心的扇区选择（v1 radial） | Cyberpunk 2077（Circle menu）、GameUI#573463、Red Dead Redemption 2 | `cnt.dataShape`=同类集合；`lay.arrangement`=环绕中心 / 轮盘；`lay.composition`=单区；`ix.mode`=选择条目 |
| `pat.poster` | 海报 | 插画 + 大字 + 一个按钮（v1 poster） | GameUI#604565、GameUI#1562329 | `ops.poster`=0.8；`cnt.focal`=角色；`cnt.dataShape`=无数据；`lay.composition`=单区；`lay.layering`=主体出框压面板 |

### 3.9 容器预设

"菜单就是世界里的一个物件"的常见组合（v1 的 skin.device 移到这里）。容器只管长得像什么；是否真的在世界里由 rel.diegesis 决定。

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `ctr.handheld` | 手持终端 | 菜单就是世界里的平板：iDroid、希卡石板（v1 skin.device） | MGSV iDroid、Zelda BotW | `ast.container`=平板 / 手持终端；`mo.transition`=镜头推进到物件；`lay.nav`=图标宫格；`lay.container`=全屏页 |
| `ctr.phone` | 游戏内手机 | 图标宫格 + 圆角外壳 | Animal Crossing（Nookphone）、GameUI#555446#1 | `ast.container`=手机；`lay.nav`=图标宫格；`mo.transition`=镜头推进到物件 |
| `ctr.book` | 书 / 收藏册 | 左页列表、右页详情 | Hearthstone（收藏册）、Moonlighter s606150_2 | `ast.container`=书；`lay.detail`=常驻一侧；`mo.transition`=用新界面的入场动效 |
| `ctr.scroll` | 卷轴 | 上下卷杆、纸面可拉长 | GameUI#572387、GameUI#943700 | `ast.container`=卷轴；`lay.overflow`=纵向滚动 |
| `ctr.desk` | 书桌 | 整屏是一张书桌，物件即入口 | Papers, Please、GameUI#49084 | `ast.container`=书桌 / 桌面；`lay.nav`=场景热区；`lay.container`=全屏页 |
| `ctr.counter` | 柜台 / 货架 | 商品直接摆在货架上 | Florence、GameUI#567745 | `ast.container`=柜台 / 货架；`cmp.slot`=无格直接摆放 |

### 3.10 UI 感觉（相对微调）

对应画面侧 nudges.ts 的"感觉"页：先变化，再告诉你改了什么、叫什么。值是相对操作（设为 / 加减 / 至少 / 至多 / 加入），套用后这些参数算"手动"。

| id | 名称 | 说明 | 参考 | 改动 | 术语 |
|---|---|---|---|---|---|
| `ui.cleaner` | 更干净 | 少装饰、少信息、细线、去掉特效层 | Mini Metro、Control | `vis.ornament`=-1；`cnt.density`=-1；`rel.hudVisibility`=情境显现；`vis.stroke`=实线；`vis.strokeWidth`=≤ 1；`ast.fx`=无 | 留白、信息密度、情境显现 HUD（contextual HUD） |
| `ui.fancier` | 更华丽 | 多装饰、金属光泽、金属标题字、外发光 | Hades、World of Warcraft | `vis.ornament`=+1；`vis.gloss`=金属渐变；`typ.titleFx`=金属 / 渐变；`ast.fx`=加 glow | 装饰预算、金属渐变、外发光 |
| `ui.readable` | 更好读 | 文字底板、字号 +2、面板更实、明度与场景反向、非焦点压暗 | Celeste s504230_0、GameUI#594276 | `typ.legibility`=半透明底板；`typ.baseSize`=+2；`vis.opacity`=≥ 0.85；`col.lightness`=与场景明度反向；`hier.dimInactive`=+0.2 | 对比度（WCAG 4.5:1）、文字底板（scrim）、视觉层级 |
| `ui.blendIn` | 更融入画面 | UI 用画面同一种画法、取场景色 | Moonlighter s606150_0、Florence | `rel.harmony`=同一媒介；`col.source`=取自场景色板 | 同一媒介（same medium）、场景色板取色 |
| `ui.punchier` | 更有冲击 | 反馈加强、斜体粗黑标题、倾斜、砸入、面板速度线 | Hi-Fi Rush、Persona 5 | `mo.juice`=+0.3；`typ.display.style`=斜体；`typ.display.weight`=特粗；`vis.skew`=-8；`mo.enter`=砸入（放大落下 + 震）；`ast.fx`=加 speedlines | 反馈强度（juice）、倾斜动感、砸入 |
| `ui.softer` | 更柔和 | 圆角到胶囊、回弹、圆体、饱和度降一点 | Animal Crossing、A Short Hike | `vis.corner`=圆角；`vis.cornerSize`=≥ 40；`mo.easing`=回弹；`typ.body.family`=圆体；`col.saturation`=0.8 | 形状语言、回弹缓动（overshoot）、圆体 |
| `ui.retro` | 更复古 | 像素化、像素字、一拍二、去阴影 | Celeste、Nuclear Throne | `vis.pixelScale`=3 倍像素；`typ.body.family`=像素；`mo.frameRate`=一拍二（12fps）；`vis.depth`=平面 | 整数缩放、像素字、一拍二（on twos） |
| `ui.calm` | 更冷静克制 | 单色、全大写、宽字距、细线、缓出、反馈收敛 | Control、Destiny 2 | `col.strategy`=单色；`typ.display.case`=全大写；`typ.display.tracking`=+0.08；`vis.strokeWidth`=≤ 1；`mo.easing`=缓出；`mo.juice`=≤ 0.2 | 单色策略、字距（tracking）、缓出（ease-out） |
| `ui.cinematic` | 更电影感 | HUD 静止渐隐、信息更少、背后压暗 | Journey、GRIS、Ghost of Tsushima | `rel.hudVisibility`=静止渐隐；`cnt.density`=≤ 1；`rel.sceneTone`=暗角 | HUD 渐隐、极简 HUD |
| `ui.diegetic` | 更像世界里的东西 | 默认放置改成叙事内（M6 之前标"待实现"） | Dead Space、MGSV iDroid | `rel.diegesis`=叙事内；`rel.harmony`=同一媒介 | 叙事内 UI（diegetic UI）、Fagerholt & Lorentzon 四分法 |
| `ui.oppressive` | 更压抑 | 深色、窄体字、无装饰、慢淡入（原 kw.horror 的气质部分） | Dead Space、Resident Evil 2 | `col.lightness`=深色面板；`typ.display.family`=窄体；`vis.ornament`=0；`mo.enter`=淡入；`mo.duration`=≥ 0.5；`col.saturation`=≤ 0.6 | 低饱和、窄体字 |

### 3.11 无障碍叠加（不改皮肤；A/B 时可开关比较）

| id | 名称 | 说明 | 参考 | 设定的参数 |
|---|---|---|---|---|
| `ov.bigText` | 大字 | 文字放大 1.4 倍、基准字号 +4，检查溢出 | Celeste（Assist）、Xbox 无障碍指南 | `a11y.textScale`=1.4；`typ.baseSize`=18；`chk.overflow`=+30%（英文）；`chk.minText`=16 |
| `ov.colorSafe` | 色盲友好 | 阵营色换橙蓝、稀有度加星与框形、开色盲模拟与冗余检查 | GAG、Into the Breach | `col.teams`=橙蓝（色盲安全）；`st.rarityCue`=星级、框形状不同；`chk.cvd`=绿色盲；`chk.redundancy`=开 |
| `ov.lowStim` | 低刺激 | 减少动效 + 降低透明（D-reduceMotion / D-reduceTransparency 生效） | NN/g、Apple Reduce Motion | `a11y.reduceMotion`=开；`a11y.reduceTransparency`=开 |

### 3.12 参考验证：真实游戏的一屏写成参数

v2 每条带 `unencoded`（仍写不出的特征）。R2 指出 v1 有 4 条悄悄丢了特征，已补：Hades HUD 的血条数字、Control 的黄 / 青两个色相、Slay the Spire 2 的红色指向箭头与石质结束回合按钮、Dota 2 条上的数字。生成器把每条当作用户手动值解析一遍并跑约束。它们也是 R2 建卡时"按参数标注"的格式。

| id | 名称 | 说明 | 参考 | 参数 | 仍写不出 |
|---|---|---|---|---|---|
| `ex.hadesHud` | Hades · 局内 HUD | 左下分段血 + 数字、左侧菱形恩赐竖列、右下货币、顶部 Boss 条、漫画粗描边文字 | Hades s1145360_0、s1145360_3、IIG Hades | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`rel.hudVisibility`=常驻；`vis.opacity`=0；`typ.legibility`=文字描边；`vis.iconStyle`=手绘彩绘；`vis.silhouette@icon`=菱形；`cnt.elements`=生命 / 护盾 / 体力、技能 / 冷却 / 弹药 / 手牌、资源 / 货币、敌人血条 / 预警 / 意图、命中反馈 / 连击；`cmp.gauge@el.vitals`=分段格；`el.vitals.valueLabel`=当前值；`el.vitals.valueLabelPos`=条尾；`el.vitals.screenAnchor`=左下；`el.abilities.form`=技能格；`el.abilities.arrangement`=竖列；`el.abilities.screenAnchor`=左中；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右下；`el.threat.form`=Boss 长条 + 名字；`el.threat.screenAnchor`=上中；`el.feedback.form`=飘字；`el.feedback.attachTo`=目标 / 敌人 | 恩赐图标里各神祇的纹章图形本身（图标内容，属于素材） |
| `ex.hadesDialogue` | Hades · 对话 | 半身大立绘 + 底部横幅文本框 + 说话人名 + 青铜雕花 | Hades s1145360_1 | `cnt.screen`=对话 / 文本；`lay.container`=底 / 顶托盘；`cmp.dialogBox`=底部通栏；`cnt.focal`=角色；`cnt.characterMedium`=半身立绘；`lay.layering`=面板压主体；`lay.focalSide`=左；`ast.frame`=雕花九宫格；`ast.frameMat`=青铜；`typ.display.family`=衬线；`typ.display.case`=小型大写；`cmp.plate@name`=边缘小标签条；`vis.opacity`=0.9；`col.lightness`=深色面板；`cnt.elements`=字幕 / 说话人 | — |
| `ex.hollowCharms` | Hollow Knight · 护符页 | 纯黑底、白色巴洛克线描角花、圆形护符网格、缺口凹槽、右侧描述、衬线字 | Hollow Knight s367520_5、IIG Hollow Knight | `cnt.screen`=角色 / 装备 / 属性；`lay.container`=全屏页；`rel.behind`=替换为背景；`ast.bgArt`=纯色 / 黑场；`vis.opacity`=0；`typ.legibility`=无；`ast.frame`=只有四角件；`ast.frameMat`=线描 / 平涂；`vis.motif`=花叶卷草；`vis.ornament`=2；`ast.ornaments`=角花 / 角饰、分隔饰条；`cnt.dataShape`=同类集合；`lay.arrangement`=规则网格；`cmp.slot`=方格；`vis.silhouette@slot`=圆；`lay.composition`=左右分栏；`lay.detail`=常驻一侧；`typ.body.family`=衬线 / 宋；`typ.display.family`=衬线；`col.strategy`=单色；`vis.iconStyle`=线性；`st.emptySlot`=暗坑 / 凹槽 | —（背景是纯黑替换背景（不是面板），所以无底时文字可读辅助可以是 none——约束 C-legibility 只在背后是实时场景时报错。） |
| `ex.dotaHud` | Dota 2 · 局内 | 拉丝金属整条底座：左方形小地图 \| 中头像 + 4 技能（冷却扇形 + 热键角标）+ 带数字的绿蓝条 \| 右物品；顶部两队头像 + 时钟；头顶红绿血条 | Dota 2 s570_0、s570_1、s570_5 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=整合底座；`ast.core`=材质平铺；`ast.coreMat`=铁 / 钢 / 拉丝金属；`ast.ornaments`=铆钉 / 金属夹角；`ctx.players`=线上队伍（队友栏 + 记分）；`col.coding`=阵营色；`col.teams`=绿友红敌；`cnt.elements`=小地图 / 罗盘、技能 / 冷却 / 弹药 / 手牌、按键 / 操作提示、队伍 / 玩家条、敌人血条 / 预警 / 意图、生命 / 护盾 / 体力、资源 / 货币、计时 / 分数 / 回合；`el.minimap.form`=平面小地图；`el.minimap.screenAnchor`=左下；`el.abilities.form`=技能格；`el.abilities.arrangement`=横排；`el.abilities.screenAnchor`=下中；`st.cooldown`=冷却扇形；`el.prompt.form`=图标角标热键；`el.party.form`=头像框 + 小血条；`el.party.arrangement`=横排；`el.party.screenAnchor`=上中；`el.threat.form`=敌人血条；`el.threat.diegesis`=空间内；`el.threat.attachTo`=目标 / 敌人；`el.threat.worldRender`=平面公告板；`el.vitals.count`=2；`cmp.gauge@el.vitals`=横条；`el.vitals.valueLabel`=当前 / 上限；`el.vitals.valueLabelPos`=环心 / 正中；`el.vitals.screenAnchor`=下中；`el.resources.form`=图标 + 数字；`el.resources.screenAnchor`=右下；`el.timer.form`=数字；`el.timer.screenAnchor`=上中；`typ.baseSize`=12；`vis.iconStyle`=手绘彩绘 | — |
| `ex.stardewDialogue` | Stardew Valley · 对话 | 橙色像素木框 + 米色内芯 + 右侧头像框 + 打字机 + 与世界同像素网格 | Stardew Valley s413150_4 | `cnt.screen`=对话 / 文本；`lay.container`=底 / 顶托盘；`cmp.dialogBox`=底部通栏；`ast.frame`=平框九宫格；`ast.frameMat`=木；`ast.core`=材质平铺；`ast.coreMat`=米白纸；`vis.pixelScale`=与世界同网格；`typ.body.family`=像素；`mo.textReveal`=打字机逐字；`rel.harmony`=同一媒介；`cnt.focal`=角色；`cnt.characterMedium`=头像级；`lay.focalSide`=右；`cnt.elements`=字幕 / 说话人 | — |
| `ex.miniMetroResult` | Mini Metro · 结算 | 色块底上超大粗体字 + 箭头 + 线路色，纯排版 | IIG Mini Metro | `cnt.screen`=结算 / 胜负 / 奖励；`lay.container`=全屏页；`cnt.focal`=数据；`cnt.dataShape`=单个数值；`col.strategy`=中性 + 一两个强调色；`col.coding`=路线 / 类别身份色；`typ.display.family`=同正文；`typ.display.weight`=特粗；`typ.scale`=2.2；`lay.grid`=12 栏；`vis.ornament`=0；`vis.fill`=纯色；`vis.opacity`=1；`mo.enter`=硬切 | — |
| `ex.frostpunkEvent` | Frostpunk · 事件抉择 | 立绘并排 + 居中段落 + 垂直青色选项按钮 + 冰霜金属框 | Frostpunk s323190_4 | `cnt.screen`=对话 / 文本；`lay.container`=居中弹窗；`cnt.focal`=角色；`cnt.characterMedium`=半身立绘；`cnt.textLength`=短段（2–3 句）；`cnt.elements`=对话 / 事件选项；`el.choices.form`=按钮；`el.choices.arrangement`=竖列；`ast.frame`=雕花九宫格；`ast.frameMat`=冰霜金属；`vis.opacity`=1；`col.lightness`=深色面板；`rel.dim`=0.5；`cnt.tone`=叙事式 | — |
| `ex.nookphone` | Animal Crossing · Nookphone | 圆角手机外壳 + 图标宫格 + 叶子图案底 + 回弹 | IIG Animal Crossing: New Horizons | `cnt.screen`=暂停菜单；`ast.container`=手机；`lay.nav`=图标宫格；`vis.corner`=圆角；`vis.cornerSize`=30；`vis.fill`=纯色；`vis.pattern`=叶子平铺；`vis.opacity`=1；`col.lightness`=浅色面板；`typ.body.family`=圆体；`mo.easing`=回弹；`mo.transition`=镜头推进到物件 | — |
| `ex.sts2Combat` | Slay the Spire 2 · 战斗 | 顶部常驻细栏（生命 / 金币 / 药水）+ 底部扇形 TCG 手牌 + 左下能量球 + 敌人头顶意图 + 红色拖拽指向箭头 + 右下石质结束回合按钮 | Slay the Spire 2 s2868840_0、s2868840_1 | `cnt.screen`=手牌 / 牌桌；`lay.container`=直接叠加；`ctx.timeModel`=回合制；`flow.chrome`=顶栏货币；`cmp.card`=插画窗 + 费用角标 + 文本框；`vis.iconStyle`=手绘彩绘；`cnt.elements`=技能 / 冷却 / 弹药 / 手牌、资源 / 货币、敌人血条 / 预警 / 意图、主行动按钮、准星 / 瞄准；`el.abilities.form`=手牌；`el.abilities.arrangement`=扇形；`el.resources.form`=以数值图形呈现；`cmp.gauge@el.resources`=液体球；`el.resources.valueLabel`=当前 / 上限；`el.resources.screenAnchor`=左下；`el.threat.form`=意图图标 + 数字；`el.threat.attachTo`=目标 / 敌人；`el.cta.form`=大圆钮；`el.cta.screenAnchor`=右下；`ast.core@el.cta`=材质平铺；`ast.coreMat@el.cta`=石；`el.crosshair.form`=拖拽指向曲线；`col.accent@el.crosshair`=#d2342b | — |
| `ex.detroitClue` | Detroit · 线索 | 蓝色线框网格贴在场景里 + 透视倾斜文字面板 + 3D 白色目标标签 | IIG Detroit: Become Human、s1222140_0 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`rel.diegesis`=空间内；`rel.worldRender`=透视贴面；`ast.core`=材质平铺；`ast.coreMat`=全息网格；`vis.stroke`=实线；`vis.strokeWidth`=1；`vis.strokeGlow`=0.6；`col.strategy`=单色；`typ.body.case`=全大写；`ast.fx`=故障色差；`cnt.elements`=目标 / 路点；`el.objective.form`=标记图标、目标文字；`el.objective.attachTo`=兴趣点 | — |
| `ex.controlHud` | Control · 局内 | 几乎没有：左上一行目标 + 黄色菱形，左下一条青色细血条 | IIG Control | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`lay.hudOrg`=分散组件；`vis.opacity`=0；`typ.legibility`=投影；`col.strategy`=中性 + 一两个强调色；`col.accent`=#f2d23c；`col.accent2`=#3fd8e0；`cnt.elements`=目标 / 路点、生命 / 护盾 / 体力；`el.objective.form`=标记图标、目标文字；`vis.silhouette@el.objective`=菱形；`col.accent@el.objective`=#f2d23c；`el.objective.screenAnchor`=左上；`cmp.gauge@el.vitals`=细条；`col.accent@el.vitals`=#3fd8e0；`el.vitals.screenAnchor`=左下 | — |
| `ex.nightCall` | Night Call · 对话 | 黑白画面左下无底台词 + 右侧选项列表黄色实心条高亮 + 后视镜（电影黑边是画面参数） | Night Call s680380_1、s680380_3 | `cnt.screen`=对话 / 文本；`lay.container`=直接叠加；`rel.behind`=实时场景；`rel.sceneTone`=黑白；`cnt.elements`=字幕 / 说话人、对话 / 事件选项；`cmp.dialogBox@el.subtitle`=无框字幕；`el.subtitle.screenAnchor`=左下；`el.choices.form`=文字行；`el.choices.arrangement`=竖列；`el.choices.screenAnchor`=右中；`ix.focus`=整行色条；`col.strategy`=单色；`col.accent`=#f2c230；`ast.container`=座舱 / 车内；`vis.opacity`=0；`typ.legibility`=投影 | 电影黑边：画面参数 camera.letterbox，不在 UI 体系里 |
| `ex.carcassonne` | Carcassonne · 对局 | 左侧玩家条（头像 + 分数药丸）+ 右侧绿勾红叉大圆钮 + 深木框压亮绿棋盘 | Carcassonne s598810_2 | `cnt.screen`=局内 HUD；`lay.container`=直接叠加；`ctx.players`=桌游多人；`ctx.timeModel`=回合制；`lay.playfield`=棋盘 / 关卡窗；`cnt.elements`=队伍 / 玩家条、主行动按钮；`el.party.form`=头像 + 分数药丸；`el.party.arrangement`=竖列；`el.party.screenAnchor`=左中；`el.cta.form`=一对按钮；`vis.silhouette@el.cta`=圆；`el.cta.screenAnchor`=右中；`col.semantic`=绿确认红取消；`rel.harmony`=刻意对比；`ast.frame`=平框九宫格；`ast.frameMat`=木；`ix.confirm`=幽灵预览 + ✓ / ✕；`col.coding`=玩家 / 频道色；`cmp.card`=方形瓦片 | — |
| `ex.cnGacha` | 二次元手游 · 十连结果 | 暗场金字塔牌阵 + 卡背按稀有度发光 + SSR 光柱 + 点击继续 | GameUI#646920、GameUI#556611 | `cnt.screen`=运营活动 / 抽卡 / 通行证；`cnt.subtype`=十连抽 / 招募；`cnt.stage`=结果；`cnt.dataShape`=同类集合；`lay.arrangement`=金字塔 / 菱阵；`cmp.card`=整幅立绘 + 少字；`mo.reveal`=翻牌；`mo.revealTease`=开；`mo.reward`=3；`ast.fx`=光柱、星尘 / 光点；`col.coding`=稀有度；`col.rarityScale`=蓝紫金 / 彩虹；`st.rarityCue`=光效色、字母徽标（SSR）；`ast.bgArt`=纯色 / 黑场；`rel.behind`=替换为背景；`ix.dismiss`=点任意处继续；`ix.continueCue`="点击任意处继续"小字 | — |
| `ex.cnCheckin` | 武侠手游 · 七日签到 | 左侧多活动竖页签 + 竖排书法活动名 + 列表行 + 倒计时 + 宣纸面板 | GameUI#943830、GameUI#943834 | `cnt.screen`=运营活动 / 抽卡 / 通行证；`cnt.subtype`=七日 / 签到；`lay.composition`=左右分栏；`lay.detail`=常驻一侧；`lay.nav`=左侧页签；`typ.display.family`=书法；`typ.direction`=标题竖排；`cnt.dataShape`=序列 / 时间线；`lay.arrangement`=竖列；`ops.badges`=倒计时；`ast.core`=材质平铺；`ast.coreMat`=宣纸；`cmp.listRow`=标题、奖励图标、行内按钮 | — |

### 3.13 整套 UI 配方

一键得到"像某类游戏的整套 UI"：引用各层预设 + 少量覆盖。"缺"由解析后各取值的 needs 自动算（需素材 / 字体 / 场景、且在当前屏真的生效的取值），探索台像画面配方一样显示"可实时 / 局部 · 缺 n 项"。成员是配方下的单屏（模板或参考验证），生成器把每个成员在配方的平台 / 商业 / 皮肤下解析并跑约束。

| id | 名称 | 各层 | 覆盖 | 成员 | 先试 / 看哪里 / 和谁不同 | 缺 |
|---|---|---|---|---|---|---|
| `rcp.hadesLike` | Hades 式动作 Roguelite（PC 买断） | platform=platform.pc、business=business.premium、layout=layout.action、skin=skin.ornate | `typ.legibility`=文字描边；`vis.silhouette@icon`=菱形 | ex.hadesHud、ex.hadesDialogue、tpl.draft3、tpl.runSummary | 先看 HUD：左下分段血 + 数字是否清楚；再开三选一，看雕花框和稀有度边框；看：无底 HUD 文字的描边、三选一卡的框；比 kw.holy 暗、偏青铜，不用羽翼 | 8：ast.frame = carvedNinePatch（素材）；ast.frameMat = bronze（素材）；ast.iconSet = asset（素材）；ast.ornaments = corners（素材）；ast.ornaments = endcaps（素材）；ast.ornaments = gems（素材）；cmp.plate@title = ribbon（素材）；vis.iconStyle = painted（素材） |
| `rcp.pixelPlatformer` | Celeste / Dead Cells 式像素平台 | platform=platform.handheld、business=business.premium、layout=layout.platformer、skin=skin.pixel | — | tpl.difficulty、tpl.pausePc | 看左上图标血量在 3 倍像素下是否清楚；看：像素台阶转角、像素字；比 skin.pixelWood 冷、没有木框 | 3：ast.iconSet = asset（素材）；ix.glyphs = nintendo（素材）；vis.iconStyle = pixel（素材） |
| `rcp.stardewFarm` | Stardew 式像素种田 | platform=platform.pc、business=business.premium、layout=layout.life、skin=skin.pixelWood | `rel.harmony`=同一媒介 | ex.stardewDialogue、tpl.inventory、tpl.npc | 打开对话：头像在右、木框像素与世界像素一样大；看：框的像素尺寸是否与世界一致；比 skin.pixel 暖、有木框 | 6：ast.frame = plainNinePatch（素材）；ast.frameMat = wood（素材）；ast.iconSet = asset（素材）；ast.ornaments = sprigs（素材）；cnt.characterMedium = full（素材）；vis.iconStyle = pixel（素材） |
| `rcp.hollowFiligree` | Hollow Knight 式线描花饰 | platform=platform.handheld、business=business.premium、layout=layout.metroidvania、skin=skin.filigree | — | ex.hollowCharms、tpl.pausePc、tpl.saveSlot | 看护符页：黑底上只有白线花饰和衬线字；看：角花和分隔线；比 skin.ornate 轻得多，没有实心框 | 7：ast.frame = cornersOnly（素材）；ast.frameMat = lineArt（素材）；ast.iconSet = font（字体）；ast.ornaments = corners（素材）；el.minimap.form = plan（场景）；ix.glyphs = nintendo（素材）；vis.motif = floral（素材） |
| `rcp.spireCards` | Slay the Spire 式卡牌 | platform=platform.pc、business=business.premium、layout=layout.card、skin=skin.ornate | — | ex.sts2Combat、tpl.routeMap、tpl.draft3 | 拖一张牌，看指向曲线与敌人意图；看：手牌扇形、结束回合按钮的石质材质；同用 skin.ornate，但布局是卡牌 | 9：ast.frame = carvedNinePatch（素材）；ast.frameMat = bronze（素材）；ast.iconSet = asset（素材）；ast.ornaments = corners（素材）；ast.ornaments = endcaps（素材）；ast.ornaments = gems（素材）；cmp.plate@title = ribbon（素材）；rel.worldRender = billboard（场景）；vis.iconStyle = painted（素材） |
| `rcp.breachTactics` | Into the Breach 式回合战术 | platform=platform.pc、business=business.premium、layout=layout.strategyTurn、skin=skin.pixel | `col.surface`=#1c2438；`col.accent`=#f2c230 | — | 看左下单位卡与敌人头顶意图；看：格子高亮与意图图标；像素皮肤 + 自定义深蓝底 | 2：ast.iconSet = asset（素材）；vis.iconStyle = pixel（素材） |
| `rcp.miniMetroMinimal` | Mini Metro 式极简 | platform=platform.pc、business=business.premium、layout=layout.puzzle、skin=skin.swiss | — | ex.miniMetroResult | 看结算页的数字层级；看：字号阶梯比与左侧色条；比 skin.flat 更冷、反差更大 | 1：typ.display.weight = black（字体） |
| `rcp.narrativeNight` | Night Call / Disco Elysium 式叙事对话 | platform=platform.pc、business=business.premium、layout=layout.narrative、skin=skin.mono | — | ex.nightCall | 看台词在暗画面上的可读性；看：选项高亮条与强调色；没有对话框，只有字 | 3：ast.iconSet = font（字体）；cnt.characterMedium = full（素材）；typ.body.weight = light（字体） |
| `rcp.noHud` | Control / Dead Space 式几乎无 HUD | platform=platform.tv、business=business.premium、layout=layout.horror、skin=skin.swiss | — | ex.controlHud | 切换 elx.diegesis：屏幕细条 ↔ 背脊血条；看：屏幕上还剩什么；版式靠放置方式而不是皮肤 | 4：el.interact.worldRender = outline（场景）；ix.glyphs = xbox（素材）；rel.worldRender = billboard（场景）；typ.display.weight = black（字体） |
| `rcp.colonySim` | RimWorld 式殖民模拟 | platform=platform.pc、business=business.premium、layout=layout.colonySim、skin=skin.flat | `col.lightness`=深色面板 | — | 看顶部殖民者栏与右侧警报；看：信息密度与可读性；扁平皮肤改深色 | 0： |
| `rcp.survivors` | Vampire Survivors 式割草 | platform=platform.pc、business=business.premium、layout=layout.survivors、skin=skin.jrpg、keyword=kw.gothic | — | tpl.draft3、tpl.runSummary | 升一级，看三选一卡；看：蓝窗口与顶部经验条；割草布局 + 复古 JRPG 窗口 | 6：ast.frame = carvedNinePatch（素材）；ast.frameMat = stone（素材）；ast.ornaments = corners（素材）；rel.worldRender = billboard（场景）；typ.display.family = gothic（字体）；vis.motif = skulls（素材） |
| `rcp.inkRpg` | 国风水墨 RPG | platform=platform.pc、business=business.premium、layout=layout.rpg、skin=skin.ink | — | tpl.npc、tpl.inventory、tpl.chapterCard | 看标题的竖排书法和印章；看：墨刷边与宣纸；比 kw.guochao 素，没有红漆 | 6：ast.fx = ink（素材）；cnt.characterMedium = full（素材）；el.minimap.form = plan（场景）；typ.display.family = calligraphy（素材）；typ.titleFx = drybrush（素材）；vis.motif = inkSplash（素材） |
| `rcp.consoleAction` | 主机电视动作冒险 | platform=platform.tv、business=business.premium、layout=layout.explore、skin=skin.darkHairline | — | tpl.pausePc、tpl.inventory | 开视距预览（电视 2.5m）看字号；看：按键图例与焦点框；比 PC 版字更大、安全边 5% | 4：ast.iconSet = asset（素材）；el.minimap.form = compassBar（场景）；ix.glyphs = xbox（素材）；vis.iconStyle = painted（素材） |
| `rcp.mobileCasual` | 手机竖屏休闲（买断） | platform=platform.phonePortrait、business=business.premium、layout=layout.puzzle、skin=skin.cozy | — | tpl.settings、tpl.levelPath | 看 D-orient 把左页签改成底部页签；看：拇指区的按钮；没有运营层的手机 UI | 2：typ.body.family = round（字体）；typ.display.family = round（字体） |
| `rcp.mobileArpgF2P` | 手机横屏 ARPG（F2P） | platform=platform.phoneLandscape、business=business.f2pMobile、layout=layout.mobileArpg、skin=skin.gacha | — | tpl.lobby、tpl.gachaEntry、tpl.gachaResult、tpl.mall | 看主界面运营入口与红点；看：金框、稀有度、倒计时；运营层满档 | 10：ast.frame = carvedNinePatch（素材）；ast.frameMat = gold（素材）；ast.iconSet = asset（素材）；ast.ornaments = corners（素材）；cmp.card = fullArt（素材）；cnt.characterMedium = full（素材）；el.minimap.form = plan（场景）；el.title.form = artTitle（素材）；typ.display.weight = black（字体）；vis.iconStyle = render3d（素材） |

### 3.14 从画面出发：画面配方 / 情绪 / 题材 → UI

**画面配方 → 三种关系的皮肤**（R3：43 套画面配方里只有 2 套设了 hud.style，其余都落到默认的新粗野主义）。探索台 UI 起点页顶部放一张"跟随当前画面"卡：同一帧并排三张缩略图，点一张即设 hud.style 与 rel.harmony；applyRecipe 不再重置 hud.style。

| 画面配方 | 名称 | 同一媒介 | 中性 | 刻意对比 |
|---|---|---|---|---|
| `inspiration-raw` | 灵感原样：低模微缩沙盒 | `skin.candy` | `skin.flat` | `skin.neobrutal` |
| `inspiration-fixed` | 灵感修正版 | `skin.candy` | `skin.flat` | `skin.neobrutal` |
| `toy-diorama` | 玩具手办微缩 | `skin.candy` | `skin.flat` | `skin.swiss` |
| `claymation` | 黏土定格 | `skin.cozy` | `skin.flat` | `skin.terminal` |
| `lowpoly-geo` | 低多边形几何 | `skin.flat` | `skin.thinGeo` | `skin.neobrutal` |
| `cel-anime` | 赛璐璐动画 | `skin.animeCard` | `skin.flat` | `skin.comic` |
| `manga-halftone` | 漫画网点 | `skin.comic` | `skin.mono` | `skin.slant` |
| `moebius` | 法漫清线平涂 | `skin.thinGeo` | `skin.flat` | `skin.constructivist` |
| `watercolor` | 水彩绘本 | `skin.handdrawn` | `skin.flat` | `skin.darkHairline` |
| `gouache` | 水粉平涂 | `skin.cozy` | `skin.flat` | `skin.swiss` |
| `oil` | 油画厚涂 | `skin.ornate` | `skin.darkHairline` | `skin.thinGeo` |
| `ink-landscape` | 水墨山水 | `skin.ink` | `skin.mono` | `skin.thinGeo` |
| `gongbi` | 工笔淡彩（局部） | `skin.ink` | `skin.parchment` | `skin.thinGeo` |
| `qinglv` | 青绿山水（局部） | `skin.ink` | `skin.parchment` | `skin.thinGeo` |
| `pencil-hatch` | 素描排线（物体空间） | `skin.handdrawn` | `skin.mono` | `skin.constructivist` |
| `pen-crosshatch` | 钢笔墨稿 | `skin.handdrawn` | `skin.mono` | `skin.terminal` |
| `woodcut` | 版画木刻 | `skin.parchment` | `skin.mono` | `skin.persona` |
| `voxel` | 体素世界 | `skin.pixel` | `skin.flat` | `skin.holo` |
| `pixel3d` | 三维像素画 | `skin.pixelWood` | `skin.flat` | `skin.terminal` |
| `ps1` | PS1 复古三维 | `skin.terminal` | `skin.military` | `skin.mono` |
| `onebit` | 1-bit 抖色 | `skin.terminal` | `skin.mono` | `skin.memphis` |
| `gameboy` | Game Boy 四绿 | `skin.pixel` | `skin.mono` | `skin.y2k` |
| `neon-night` | 霓虹雨夜 | `skin.synth` | `skin.darkHairline` | `skin.parchment` |
| `poster` | 海报风景 | `skin.swiss` | `skin.flat` | `skin.ornate` |
| `riso` | 孔版印刷 | `skin.memphis` | `skin.swiss` | `skin.holo` |
| `stained` | 彩色玻璃 | `skin.deco` | `skin.darkHairline` | `skin.thinGeo` |
| `noir` | 黑白一点红 | `skin.mono` | `skin.darkHairline` | `skin.persona` |
| `soft-pbr` | 写实柔光 | `skin.glass` | `skin.darkHairline` | `skin.neobrutal` |
| `felt` | 毛毡布偶 | `skin.cozy` | `skin.flat` | `skin.terminal` |
| `papercut` | 剪纸纸片（局部） | `skin.handdrawn` | `skin.flat` | `skin.holo` |
| `vhs-tape` | VHS 录像带 | `skin.terminal` | `skin.y2k` | `skin.glass` |
| `ink-xuan-cun` | 水墨·宣纸皴擦 | `skin.ink` | `skin.mono` | `skin.thinGeo` |
| `qinglv-pima` | 青绿·披麻皴绢本 | `skin.ink` | `skin.parchment` | `skin.thinGeo` |
| `gongbi-silk` | 工笔·绢本 | `skin.ink` | `skin.parchment` | `skin.animeCard` |
| `watercolor-coldpress` | 水彩·冷压纸颗粒 | `skin.handdrawn` | `skin.flat` | `skin.darkHairline` |
| `tam-pencil` | 素描·色调排线图 | `skin.handdrawn` | `skin.mono` | `skin.scifi` |
| `clay-print` | 黏土·指纹 | `skin.cozy` | `skin.flat` | `skin.terminal` |
| `woolly-knit` | 毛线针织世界 | `skin.cozy` | `skin.flat` | `skin.swiss` |
| `painterly-strokes` | 物体空间笔触 | `skin.handdrawn` | `skin.darkHairline` | `skin.swiss` |
| `hd2d-sprite` | HD-2D 像素精灵 | `skin.jrpg` | `skin.pixel` | `skin.glass` |
| `paper-puppet` | 剪纸纸片人 | `skin.handdrawn` | `skin.parchment` | `skin.holo` |
| `weathered` | 剥落做旧 | `skin.parchment` | `skin.darkHairline` | `skin.neobrutal` |
| `cel-2dfx` | 三维角色 + 手绘特效 | `skin.animeCard` | `skin.flat` | `skin.comic` |

**情绪 → UI 皮肤 / UI 感觉**（供 MOODS 增加 uiSkins / uiNudges）

| 情绪 | 名称 | 皮肤 | UI 感觉 |
|---|---|---|---|
| `healing` | 治愈 | `skin.cozy`、`skin.handdrawn` | `ui.softer` |
| `aloof` | 清冷 | `skin.thinGeo`、`skin.mono` | `ui.calm`、`ui.cleaner` |
| `oppressive` | 压迫 | `skin.darkHairline`、`skin.military` | `ui.oppressive` |
| `nostalgic` | 怀旧 | `skin.pixel`、`skin.parchment` | `ui.retro` |
| `lonely` | 孤独 | `skin.mono` | `ui.cinematic`、`ui.cleaner` |
| `mysterious` | 神秘 | `skin.filigree`、`skin.darkHairline` | `ui.cinematic` |
| `epic` | 史诗 | `skin.ornate`、`skin.darkGold` | `ui.fancier` |
| `uncanny` | 诡异 | `skin.terminal`、`skin.mono` | `ui.oppressive` |
| `dread` | 恐惧 | `skin.mono` | `ui.oppressive`、`ui.diegetic` |
| `cozy` | 温馨 | `skin.cozy`、`skin.pixelWood` | `ui.softer` |
| `hot-blooded` | 热血 | `skin.slant`、`skin.comic` | `ui.punchier` |
| `playful` | 轻快 | `skin.candy`、`skin.memphis` | `ui.softer`、`ui.punchier` |
| `solemn` | 庄严 | `skin.darkHairline`、`skin.ornate` | `ui.calm` |
| `desolate` | 荒凉 | `skin.mono`、`skin.military` | `ui.cleaner` |
| `dreamy` | 梦幻 | `skin.glass`、`skin.aero` | `ui.softer` |
| `bleak` | 肃杀 | `skin.military`、`skin.mono` | `ui.calm` |
| `ethereal` | 空灵 | `skin.thinGeo` | `ui.cleaner` |
| `decadent` | 颓废 | `skin.deco`、`skin.darkGold` | `ui.fancier` |
| `stern` | 冷峻 | `skin.swiss`、`skin.military` | `ui.calm` |
| `wild` | 狂野 | `skin.handdrawn`、`skin.persona` | `ui.punchier` |
| `elegant` | 优雅 | `skin.filigree`、`skin.deco` | `ui.calm` |
| `cute` | 可爱 | `skin.cozy`、`skin.candy` | `ui.softer` |
| `comedic` | 滑稽 | `skin.comic`、`skin.memphis` | `ui.punchier` |
| `melancholic` | 忧郁 | `skin.mono`、`skin.handdrawn` | `ui.cinematic` |
| `serene` | 宁静 | `skin.thinGeo`、`skin.wa` | `ui.cleaner` |
| `tense` | 紧张 | `skin.military`、`skin.scifi` | `ui.calm` |
| `hopeful` | 希望 | `skin.aero`、`skin.flat` | `ui.softer` |
| `sacred` | 神圣 | `skin.ornate` | `ui.fancier` |
| `absurd` | 荒诞 | `skin.memphis`、`skin.persona` | `ui.punchier` |
| `alienated` | 疏离 | `skin.swiss`、`skin.mono` | `ui.calm`、`ui.cleaner` |
| `primal` | 原始 | `skin.handdrawn` | — |
| `romantic` | 浪漫 | `skin.filigree`、`skin.cozy` | `ui.softer` |
| `psychedelic` | 迷幻 | `skin.synth`、`skin.memphis` | `ui.punchier` |
| `zen` | 禅意 | `skin.wa`、`skin.thinGeo` | `ui.cleaner` |
| `bustling` | 喧嚣 | `skin.gacha`、`skin.comic` | `ui.fancier` |
| `retro-tech` | 怀旧科技 | `skin.y2k`、`skin.terminal` | `ui.retro` |

**题材（CULTURES）→ 关键词**（取代 v1 的 D-style-material 规则：那条规则的输入"美术题材"不是参数）

| 题材 | 名称 | 关键词 | 备注 |
|---|---|---|---|
| `chinese-street-life` | 中式市井 | `kw.guochao` |  |
| `chinese-garden` | 中式园林 | `kw.ink` |  |
| `wuxia` | 武侠 | `kw.ink` |  |
| `xianxia` | 仙侠 | `kw.guochao` |  |
| `shanhaijing-fantasy` | 东方幻想（山海经） | `kw.guochao` |  |
| `jiangnan-water-town` | 江南水乡 | `kw.ink` |  |
| `silk-road` | 西北／丝路 | `kw.primitive` | + theme 色换沙金 |
| `chinese-ethnic-minorities` | 中国少数民族 | `kw.primitive` | 图案要按具体民族另做，不能泛化 |
| `japanese` | 日式和风 | `kw.wafu` |  |
| `korean` | 韩式 | — | 暂无关键词（R2 长尾） |
| `medieval-europe` | 欧洲中世纪 | `kw.holy` | 或 kw.questBook |
| `victorian` | 维多利亚 | `kw.steampunk` |  |
| `norse-viking` | 北欧／维京 | `kw.primitive` |  |
| `greco-roman` | 古典希腊罗马 | `kw.holy` |  |
| `middle-east-arab` | 中东／阿拉伯 | `kw.luxury` | 纹样需另做 |
| `persian` | 波斯 | `kw.luxury` | 纹样需另做 |
| `south-asia` | 南亚 | `kw.luxury` |  |
| `southeast-asia` | 东南亚 | `kw.primitive` |  |
| `latin-america-mexico` | 拉美／墨西哥 | `kw.primitive` | + 高饱和 |
| `mesoamerican-andean` | 中南美古文明 | `kw.primitive` |  |
| `africa` | 非洲 | `kw.primitive` | 纹样需另做 |
| `afrofuturism` | 非洲未来主义 | `kw.cyber` |  |
| `american-west` | 美国西部 | `kw.western` |  |
| `americana` | 美式小镇 | `kw.western` | 或 skin.y2k |
| `arctic-indigenous` | 北极／原住民 | `kw.frost` |  |
| `oceania-islands` | 大洋洲岛屿 | `kw.nautical` |  |
| `soviet-eastern-europe` | 苏联／东欧 | — | skin.constructivist |
| `cyber-city` | 赛博都市 | `kw.cyber` |  |
| `outer-space` | 太空 | `kw.space` |  |
| `deep-sea` | 海洋／深海 | `kw.nautical` |  |
| `polar-ice` | 极地／冰原 | `kw.frost` |  |
| `post-apocalyptic` | 末日废土 | `kw.steampunk` | 铁锈 + 皮革 |
| `fairy-tale-forest` | 童话森林 | `kw.rustic` |  |
| `contemporary-city` | 当代都市 | — | skin.flat |

## 4. 派生规则与约束

### 4.1 UI 体系读取的画面参数（只读）

| 画面参数 | 对 UI 的作用 | 吸收的观察轴 |
|---|---|---|
| `camera.projection / camera.angle / camera.mode / camera.fov` | 镜头视角：决定 HUD 需要哪些元素（第一人称要准星，俯视要选中面板）、世界内标注怎么画 | N:镜头视角; N:相机视角; N:视角人称; N:摄像机视角; N:地图视角/投影 |
| `camera.pixelSize / camera.pixelSnap` | 像素化：UI 是否进同一像素网格 | N:像素栅格一致性（疑似） |
| `camera.letterbox` | 画幅黑边：HUD 在黑边内排版；电影黑边就是它（v1 的 rel.metaFx = letterbox 删掉） | N:画幅与黑边; N:画面外框 |
| `camera.zoom` | 缩放：语义缩放档位 | N:缩放层级切换 |
| `camera.bloom / motion.fx2d` | 特效体量：HUD 需不需要描边 / 底板 | N:特效体量; N:特效与HUD层叠 |
| `color.palette（色板角色）` | UI 取色（@accent 等） | N:主色相; N:场景主色调; N:色板策略 |
| `color.brightness / lighting.time / atmosphere.*` | 场景明度与色温：UI 面板明度与可读辅助 | N:场景亮度调性; N:光照色温基调; N:场景明度与可读性; N:氛围时段与色温; N:整体明度基调 |
| `lines.outline / lines.outlineWidth / lines.boil` | 描边粗细与抖动：UI 边框与手绘抖动 |  |
| `shading.model / lighting.shadows` | 卡通明暗：UI 硬阴影 |  |
| `surface.medium / surface.paper / material.preset` | 画面媒介与材质：UI 内芯、外框、标题字、地图画风 | N:渲染媒介; N:渲染风格; N:世界美术风格; N:场景美术风格; N:场景渲染风格; N:美术技法 |
| `surface.screen（CRT / VHS / LCD）` | 屏幕滤镜：UI 是否一起弯曲；CRT 框就是它（v1 的 rel.metaFx = crtFrame 删掉） | N:屏幕后期滤镜 |
| `motion.frameRate` | 抽帧：UI 动画帧率 |  |
| `game.genre` | 品类：选默认的品类布局预设 | N:战斗玩法范式; N:游戏品类题材 |

### 4.2 规则表

R1 指出 v1 的"派生规则只改写跟随预设的值"有两种读法，两种都会出问题：被预设写过的值不算跟随，D-orient 就永远不生效；算跟随，D-outline 会覆盖皮肤的粗描边。v2 把规则分成四类，各自在解析顺序里有固定位置（第 1.3 节）。"生成器"列标 ✓ 的规则在生成器里实现了，用于校验与第 4.5 节的轨迹；其余依赖画面参数，只登记。

**默认类（预设之前，只填空）**

| id | 从 | 到 | 规则 | 依据 | 生成器 |
|---|---|---|---|---|---|
| D-device | ctx.device | typ.baseSize、ix.touchSize、lay.safeMargin、ctx.input | 手机：正文 15px、触控 ≥ 88px（44pt@2x）、安全区按刘海、输入 = 触屏；平板 14px / 72px；PC 14px / 安全边 2% / 键鼠；电视 26px / 5% / 手柄；掌机 18px / 3% / 手柄。视距（30cm / 60cm / 2.5m）是隐含量，由设备推出，不单设轴。 | 06 文档 A 节、经验值 | ✓ |
| D-lightness | color.brightness、lighting.time、atmosphere.fog、surface.paperColor、rel.harmony | col.lightness | 场景整体很亮（雪地、正午、白纸媒介）→ 深色面板；很暗（夜、洞穴、恐怖）→ 浅色面板或浅字 + 发光；rel.harmony = contrast 时反向。 | 06 文档 A11（雪地白物）、NN/g 玻璃拟态 |  |
| D-outline | lines.outline、lines.outlineWidth、lines.outlineColorMode、rel.harmony | vis.stroke、vis.strokeWidth、vis.strokeColor | 画面有描边 → UI 描边至少 solid，粗细 ≈ 画面线宽（2.2px → 2–3px），线色 = 墨色或同色加深；画面无描边 → 不强加。rel.harmony = sameMedium 时升为适配类（排到皮肤之后）；unified / neutral / contrast 时不生效。 | 计划第 5 维 |  |
| D-toon | shading.model、lighting.shadows、rel.harmony | vis.depth | 卡通色阶 / 硬阴影 → UI 用错位硬投影或平面；平滑漫反射 → 柔投影。同一媒介时升为适配类。 | 计划第 5 维 |  |
| D-paper | surface.medium、surface.paper、material.preset、rel.harmony | ast.core、ast.coreMat、ast.frame、ast.frameMat、typ.display.family、vis.edge、vis.mapStyle | 纸张素材 / 水彩 / 工笔 → 内芯 = 纸；水墨 → 宣纸 + 笔触边 + 书法标题；木纹 → 木框；石材 → 石框；金属 → 铁；黏土 / 毛毡 → 塑料或布；地图画风跟随媒介（水彩 → painted，线稿 → chalk）。同一媒介时升为适配类。 | 计划第 5 维、08 文档 2.3 |  |
| D-boil | lines.boil、lines.wobble、rel.harmony | vis.jitter | 线条沸腾 / 抖动开 → UI 手绘抖动同步（静态抖动幅度，动态跟随帧率）。同一媒介时升为适配类。 |  |  |
| D-frame | motion.frameRate、rel.harmony | mo.frameRate | 画面一拍二 / 一拍三 → UI 动画同样抽帧（v1 的"缓动改阶跃"删掉，阶跃就是帧率）。同一媒介时升为适配类。 | 计划第 5 维 |  |
| D-crt | surface.screen | rel.followPost、typ.body.family | CRT / VHS → 屏幕叠加 UI 默认仍清晰；叙事内 UI 跟着弯曲；建议等宽字（扫描线特效是关键词 kw.tech / kw.cyber 的事，不在规则里写）。 | The End Is Nigh s583470_5 |  |
| D-camera | camera.projection、camera.angle、camera.mode | cnt.elements、rel.worldRender、el.crosshair.form | 第一人称 → 加准星、手持物可承载叙事内 UI；俯视 / 等距 → 加选中面板、世界内标注默认地面贴花；第三人称追尾 → 默认头顶公告板。 |  |  |
| D-genre | game.genre | 品类布局预设 | 品类决定默认的品类布局预设（第 3.4 节，布局带 genre 字段）；之后每个元素的画法、锚点都可单独改。 | 06 文档 A1–A16 |  |
| D-timeModel | ctx.timeModel、ctx.turnTimer | cnt.elements | 回合制 → 加结束回合按钮（el.cta）与回合横幅（el.timer = turnBanner）；可暂停 → 加倍速控件（el.gameSpeed）；回合限时 → 计时徽章醒目。 |  |  |
| D-diegesis-post | rel.diegesis、elx.diegesis | rel.followPost | 叙事内 → 跟随纸纹 / 描边 / 调色（stylize）；空间内 → 跟随弯曲但不跟随纸纹；屏幕叠加与元 UI → 不受影响。 | 计划"叙事内 UI 走美术管线" |  |
| D-letterbox | camera.letterbox | lay.safeMargin | 画幅黑边开 → HUD 在黑边内排版；字幕可以压进下黑边。 | M1 已实现黑边内排版 |  |
| D-fxDensity | camera.bloom、motion.fx2d | typ.legibility、chk.fxOcclusion | 画面特效重 → 文字默认描边，建议开启特效遮挡检查。 | 06 文档 A2 |  |
| D-zoom | camera.zoom、camera.projection | rel.semanticZoom | 策略 / 建造镜头拉远超过阈值 → 切到下一档语义缩放（标签 → 图标 → 色块）。 | 06 文档 A9、Civ VI |  |
| D-rarity-show | 奖励稀有度（模拟数据）、col.rarityScale | mo.reward、mo.revealTease、ast.fx | 普通 → 演出强度 1、直接显示；稀有 → 2、放射光；最高稀有 → 3、光柱 + 卡背预告。 | GameUI#580662、GameUI#556611 |  |
| D-teams | col.teams | 场景材质阵营色 | 反向派生：UI 与 3D 场景共用同一对阵营色，色盲检查一起做。 | 06 文档 C.2 |  |

**适配类（预设与用户值之后变换，只有用户手动值能挡住）**

| id | 从 | 到 | 规则 | 依据 | 生成器 |
|---|---|---|---|---|---|
| D-orient | ctx.orientation | lay.composition、lay.nav、lay.columns、lay.focalSide | 竖屏：左右分栏 / 三栏 → 上下分栏，左右页签 → 底部页签，网格列数上限 4，左右立绘 → 上半屏。 | GameUI 竖屏约四成 | ✓ |
| D-aspect | ctx.aspect | lay.safeMargin | 21:9：HUD 收进中间 16:9 区域（安全边按超出部分加宽）；19.5:9 手机：按刘海加宽长边安全区。 |  |  |
| D-input | ctx.input | ix.glyphs、el.prompt.form、lay.overflow（分页 → 滑动）、临时详情的外形 | 键鼠 → 键帽图标，临时详情 = 悬停提示；手柄 → 主机按键图标、焦点框必须可见、按键提示 = 底部图例；触屏 → 触屏图标、没有悬停（临时详情改弹窗或底部浮层）、按键提示 = 触屏按钮、分页可滑动。按键图标与输入方式不匹配时改写。 |  | ✓ |
| D-players | ctx.players | lay.focalSide、lay.playfield、元素锚点 | 1v1 → 主体两侧（focalSide = both）+ 元素锚点左右镜像（v1 的 lay.composition = mirror 与 el.vitals.form = mirrored 删掉）；分屏 → lay.playfield = split；本地合作 → 队伍横排；四人派对 → 四个玩家框；桌游 → 玩家条竖列。 |  | ✓ |
| D-pixel | camera.pixelSize、camera.pixelSnap、vis.pixelScale | vis.pixelScale、vis.corner、typ.body.family、对齐网格 | 画面像素化 > 1 → UI 像素化 = 与世界同网格、像素字；UI 像素化 ≠ off → 转角 = 像素台阶、对齐到像素网格（v1 的 lay.grid = pixel 与 vis.shape = pixelStep 改为这里推出）。像素 UI 也能刻意保持清晰（The Final Station），此时手动改回 off。 | Flinthook、Moonlighter、The Final Station | ✓ |
| D-skew | vis.skew | 对齐网格、标题文字旋转 | 倾斜 ≠ 0 → 对齐网格随之倾斜、标题文字随之旋转（v1 的 lay.grid = diagonal、typ.direction = diagonal 删掉）。 |  |  |

**纯派生 / 蕴含**

| id | 从 | 到 | 规则 | 依据 | 生成器 |
|---|---|---|---|---|---|
| D-screen | cnt.subtype | cnt.screen、cnt.layer | 子功能是基础界面时，界面类型 = 它的 parent；layer 取子功能的 layer。子功能未选或是浮层时，界面类型保持手动值。 |  | ✓ |
| D-container | cnt.screen | lay.container | 局内 HUD 且容器未定 → overlay（v1 的 lay.archetype = hud 删掉）。 |  | ✓ |
| D-harmony | rel.harmony | col.source、D-outline、D-toon、D-paper、D-boil、D-frame | 同一媒介 → col.source = scene，跟随规则升为适配类；统一调色 → col.source = scene，跟随规则不生效；中性 → col.source = skin，跟随规则不生效；刻意对比 → col.source = uiPalette，D-lightness 反向。v2：D-palette 不再受它控制（D-palette 只看 col.source），消除 v1"中性 ⇒ D-palette 不生效"与"取色来源 = 场景 ⇒ D-palette 生效"的冲突。 | 08 文档 2.4（"角色、场景、UI 高度统一"） | ✓ |
| D-palette | color.palette、col.source | col.accent、@accent / @paper / @ink / @good / @sky | col.source = 取自场景色板时，UI 的色板引用解析为场景色板的对应角色（现有"UI 取色自色板"开关）。 | hud.useSceneColors |  |
| D-iconSet | vis.iconStyle | ast.iconSet | 图标来源未定时按风格给：线性 → 图标字体；扁平 / 双色 / 剪影 → 程序几何；手绘 / 3D 渲染 / 写实 / 像素 → 图集素材（未生成前灰盒占位）。 |  | ✓ |
| D-dismiss | ix.dismiss | ix.blocking | 自动消失 → 非阻断；点空白 / 点任意处 → 半阻断；按钮 / 按键 → 模态；不可关闭 → 强制流程。 |  | ✓ |
| D-lightness-text | vis.opacity、rel.behind、cnt.screen | typ.legibility | 无底（vis.opacity = 0）且背后是实时画面（或这是局内 HUD）时，文字可读辅助至少是投影（约束 C-legibility 检查它不是 none）。 | NN/g | ✓ |
| D-ornament | vis.ornament、vis.motif | ast.ornaments、vis.motif | 装饰预算 0 → 饰件清空、母题 none；≥ 2 而饰件未定 → 按母题给一组默认饰件（花叶 → 角花 + 分隔饰条；祥云 → 挂件；铆钉 → 铆钉；其它 → 角花）。 |  | ✓ |
| D-emphasis | hier.emphasis、elx.priority | elx.scale、hier.dimInactive、ast.fx@el.*、col.accent@el.*、typ.display.family | 单色界面（col.strategy = mono）里 color 自动退化为 value（明暗）。强调配方作用在 elx.priority = primary 的元素上：size → 该元素 scale ≥ 1.4；value → hier.dimInactive ≥ 0.3；glow → ast.fx@该元素 加 glow；color → col.accent@该元素 = 强调色；typeface → 标题字族 ≠ same。 |  | ✓ |
| D-ops | ops.badges、ops.entries、st.newCue | ops.density | 运营元素密度 = 读数：0 无；有红点或 1–2 个角标 → 1；有入口簇或 3 个以上角标 → 2；入口簇 + 倒计时 + 折扣 → 3。 |  | ✓ |
| D-implies | 见约束表 kind = imply 的各条 | 各条的 set | 蕴含型约束在解析时直接补值：书容器 → 详情常驻；浮空弹窗 → 弹窗底不透明度 0；竖排侧牌 → 标题竖排；分屏 → 玩法区分屏；不画 UI → 元素集合为空。 |  | ✓ |

**无障碍（优先于一切）**

| id | 从 | 到 | 规则 | 依据 | 生成器 |
|---|---|---|---|---|---|
| D-reduceMotion | a11y.reduceMotion | mo.juice、mo.enter、mo.idle、rel.metaFx、mo.reward | 开 → 反馈强度 0、入场改淡入、无待机动效、去掉闪白与震屏、演出强度上限 1。 |  | ✓ |
| D-reduceTransparency | a11y.reduceTransparency、a11y.highContrast | vis.opacity、vis.blur、typ.legibility、ast.core | 开 → 半透明面板改实底（0 < 不透明度 < 1 → 1）、模糊 0；高对比再加文字描边、去掉纹理内芯。 | NN/g | ✓ |

### 4.3 跟随画面的强度（rel.harmony）

| rel.harmony | col.source 默认 | D-outline / D-toon / D-paper / D-boil / D-frame | D-lightness |
|---|---|---|---|
| 未选（跟随） | 场景色板（兜底） | 默认类：在预设之前只填空，皮肤能盖掉 | 正常 |
| sameMedium 同一媒介 | 场景色板 | 升为适配类：排在皮肤之后，UI 跟着画面走 | 正常 |
| unified 统一调色 | 场景色板 | 不生效 | 正常 |
| neutral 中性 | 皮肤固定色 | 不生效 | 正常 |
| contrast 刻意对比 | 独立控件色板 | 不生效 | 反向 |

### 4.4 约束表

kind：check = 只检查；imply = 解析时直接补值，再检查；special = 生成器里的专门检查。level：error 报错，warn 只提示。

| id | 类型 | 级别 | 如果 | 那么 | 说明 |
|---|---|---|---|---|---|
| C-none-empty | imply | error | lay.container = none | cnt.elements 为空（补：`cnt.elements`=无） | lay.container = none 严格表示"本屏不画任何 UI"（R1：v1 的 tpl.cutscene / ex.nightCall 写成"无 UI + 字幕 / 选项"） |
| C-legibility | check | error | vis.opacity = 0 且 （rel.behind = live 或 cnt.screen = screen.hud） | typ.legibility ∉ {none, auto} | 无底文字直接压在实时画面上，必须有可读辅助（D-lightness-text 会先补投影） |
| C-emphasis-mono | check | error | hier.emphasis 含 color | col.strategy ≠ mono | 单色界面的"颜色强调"只能退化成明暗（R1） |
| C-floating | imply | error | cmp.modal = floating | vis.opacity@modal = 0（补：`vis.opacity@modal`=0） | 浮空弹窗 = 弹窗本身无底（R1） |
| C-split | imply | error | ctx.players = split | lay.playfield = split（补：`lay.playfield`=分屏视口） | 分屏由同屏玩家推出（R1） |
| C-split-rev | check | error | lay.playfield = split | ctx.players = split | 玩法区分屏只能来自分屏玩家 |
| C-inMargin | check | error | lay.hudOrg = inMargin | lay.playfield ≠ full | 玩法区全屏时没有边框可画 HUD（R1） |
| C-sideTab | imply | error | cmp.plate@title = sideTab | typ.direction ∈ {verticalTitle, verticalAll}（补：`typ.direction`=标题竖排） | 竖排侧牌上的标题必须竖排（R1） |
| C-ornament0 | check | error | vis.ornament = 0 | ast.ornaments 为空 且 vis.motif = none 且 vis.edge ≠ ornate 且 ast.frame ≠ carvedNinePatch | 装饰预算 0 却有饰件 / 母题 / 雕花（R1：能写不能画） |
| C-iconFont | check | error | ast.iconSet = font | vis.iconStyle ∈ {line, flat} | 图标字体只能是线性或扁平（R1 兼容矩阵） |
| C-iconRender | check | error | ast.iconSet = runtimeRender | vis.iconStyle ∈ {render3d, realistic} | 实时渲染的图标只能是 3D 渲染或写实 |
| C-iconProc | check | error | ast.iconSet = procedural | vis.iconStyle ∈ {flat, line, duotone, silhouette} | 程序几何图标画不出手绘、3D、写实、像素 |
| C-stylize | check | error | rel.followPost = stylize | rel.diegesis ≠ screen | 屏幕叠加 UI 不该被纸纹 / 描边处理（R1） |
| C-book | imply | error | ast.container = book | lay.detail = persistent（补：`lay.detail`=常驻一侧） | 书容器 = 左页列表右页详情（R1：v1 lay.detail = spread 删掉） |
| C-confirm-self | check | error | cnt.subtype = confirm | ix.confirm ≠ double | 二次确认弹窗自身不能再要求二次确认（R1：v1 tpl.confirm） |
| C-rarity-redundancy | check | error | col.coding 含 rarity 且 非（st.rarityCue 为空） | st.rarityCue 含 {stars, frameShape, letter, strip} 之一 | 06 文档 A5：稀有度不能只靠颜色 |
| C-rarity-border | imply | error | st.rarityCue 含 border | （ast.frame@slot ≠ procedural 或 vis.stroke@slot ≠ none）（补：`vis.stroke@slot`=实线；`vis.strokeWidth@slot`=2） | "边框色表达稀有度"需要格子有边框：皮肤没有描边时，蕴含给格子补一条 2px 实线 |
| C-teams-cvd | check | warn | col.coding 含 team 且 col.teams = greenRed | 非（col.teams = greenRed） | 红绿阵营色在色盲模拟下分不开（A4 / A12），建议 orangeBlue 或加形状 |
| C-pixel-step | imply | error | vis.pixelScale ∉ {off, auto} | vis.corner = step（补：`vis.corner`=像素台阶） | UI 像素化时转角就是像素台阶（R1） |
| C-vertical-latin | check | warn | typ.direction = verticalAll | ctx.locale ≠ en | 拉丁字母全竖排基本不可读 |
| C-st-channels | special | error | — | — | 同一屏里锁定 / 空槽 / 完成 / 冷却 / 选中 两两不能占用同一个会撞车的视觉通道（去饱和、压暗、剪影、叠加、描边、发光、填充、角标）；符号类（锁、勾、加号、问号）不算撞车（R1） |
| C-skin-core | special | error | — | — | 皮肤合并默认关键词后必须给出外观核心键（转角、描边、阴影、不透明度、面板明度、色彩策略、正文字族、字重、标题字族），或这些键因生效条件而不生效（R3） |
| C-owners | special | error | — | — | 每类预设只能写自己拥有的参数组（第 1.3 节表）；皮肤 / 品类布局写不了的建议放 suggests（R1 + R3） |
| C-keyword-dup | special | error | — | — | 皮肤内嵌的 keywordDefaults 与某个关键词预设 ≥ 75% 的键值相同时报错：应改为引用那个关键词（R1：重名合并） |
| C-dup | special | error | — | — | 界面模板写了与它引用的版式 / 容器预设相同的值，或皮肤写了与它引用的关键词相同的值（R1：30 多个预设对同一件事写两三遍） |
| C-inactive | special | error | — | — | 预设设了一个被它自己的其它值关掉的参数（例：无底却设面板明度、外框是素材却设转角） |

### 4.5 校验结果

- **全组合矩阵**：界面模板 63 个与品类布局 31 个，各自 × 平台 6 × 皮肤 38，共 21,432 次完整解析，约束违例 0。开发中这个矩阵抓出过 4 类真实冲突，都改成了规则：单色皮肤 + "颜色强调"模板（D-emphasis 把 color 退化为 value）、程序几何图标 + 手绘图标风格（图标来源改为由风格派生，D-iconSet）、装饰预算 0 的皮肤被模板 accent 补上羽翼母题（D-ornament 的清零提前到 accent 之前）、无描边皮肤 + "边框色表达稀有度"（C-rarity-border 改为蕴含，给格子补描边）。
- **参考验证与 UI 配方**：15 条参考验证、15 套配方（含 38 次成员解析）全部通过；剩下 3 条提示都是 C-teams-cvd（Dota 2 的红绿阵营色，色盲模拟下会报警，这是 Dota 本身的选择）。
- **反例**（v1 的 7 个自相矛盾组合换成 v2 的键后必须被拦下）：

| 反例 | 拦下它的检查 |
|---|---|
| skin.filigree / ex.hollowCharms：无底 + 深色面板 | C-inactive col.lightness 不生效（条件：vis.opacity > 0） |
| skin.glass：有底却声称无底（v2 写法：不透明度 0 却设了填充） | C-inactive vis.fill 不生效（条件：ast.core = procedural 且 vis.opacity > 0） |
| skin.pixel：实线 2–3px + 宽 4（v2：线型不再带粗细，改测"外框是素材却设转角"） | C-inactive vis.corner 不生效（条件：ast.frame = procedural） |
| tpl.cutscene：不画 UI + 字幕 | C-none-empty：lay.container = none ⇒ cnt.elements 为空 |
| ex.nightCall：不画 UI + 选项 | C-none-empty：lay.container = none ⇒ cnt.elements 为空 |
| tpl.confirm：二次确认弹窗自身又要二次确认 | C-confirm-self：cnt.subtype = confirm ⇒ ix.confirm ≠ double |
| 同屏灰度锁 + 灰化完成 | C-st-channels：st.locked 与 st.done 都用"desat"通道 |

- **D-orient 生效轨迹**（`platform.phonePortrait` + `skin.flat` + `tpl.inventory`；v1 里平台写的底部页签会被模板的左页签盖掉，D-orient 无从生效）：

| 来源 | 参数 | 从 | 到 |
|---|---|---|---|
| D-device | `lay.safeMargin` | "auto" | 2 |
| pat.masterDetail | `lay.composition` | "auto" | "splitLR" |
| pat.masterDetail | `lay.detail` | "auto" | "persistent" |
| tpl.inventory | `lay.container` | "auto" | "fullscreen" |
| tpl.inventory | `lay.arrangement` | "auto" | "grid" |
| tpl.inventory | `lay.columns` | "auto" | 5 |
| tpl.inventory | `lay.nav` | "auto" | "tabsLeft" |
| D-orient | `lay.nav` | "tabsLeft" | "tabsBottom" |
| D-orient | `lay.columns` | 5 | 4 |
| D-orient | `lay.composition` | "splitLR" | "splitTB" |
| D-screen | `cnt.screen` | "screen.hud" | "screen.inventory" |
| D-dismiss | `ix.blocking` | "auto" | "modal" |

## 5. 正交性说明（只在设计参数之间）

"独立"= 任意组合都有真实实例；"拆开"= 观察轴把两件事混成了一个；"主从"= 一个只在另一个取某值时生效（activeWhen，已写成机器字段）；"约束"= 有机器可读的蕴含或排斥；"共用词表"= 多个地方引用同一份取值表；"改为预设 / 派生 / 只读输入 / 元数据 / 解析设置"= 做不到独立，所以不当原子参数。v1 的 39 对大多挑的是本来就正交的对子（R1）；v2 换成了 R1 列出的真正重叠的对子，并写明改法。

| 参数 A | 参数 B | 结论 | 理由与改法 |
|---|---|---|---|
| cnt.density 信息密度 | cnt.textLength 文案量 | 独立 | 一句话的标题卡也能很大；一屏长文协议信息密度可能很低。 |
| cnt.itemCount 条目数 | lay.columns 网格列数 | 主从 | 10 张卡可以 5×2，也可以金字塔 4-3-2-1；列数只在排布为网格时生效（activeWhen）。 |
| lay.container 容器 | lay.composition 分区 | 独立 | 容器是"装在什么里"（弹窗 / 全屏 / 抽屉），分区是"容器里分几块"。同是弹窗，可以单区也可以左右分栏。v2：容器只剩 9 个取值，其余 v1 版式原型（左列表右详情、网格陈列、地图为主、扇形、轮盘、海报）改成版式预设。 |
| cnt.dataShape 数据结构 | lay.arrangement 排布几何 | 拆开 | C3 观察轴把两者混在一起。v2 进一步把 dataShape 改成纯语义（集合 / 层级 / 网络 / 序列 / 空间……），"网格"只在排布里出现。 |
| lay.container = overlay | lay.hudOrg HUD 组织 | 主从 | HUD 组织只在局内 HUD 生效；v2 删掉了 hudOrg 里的"只剩一两件"（元素数量）、"无底悬浮"（vis.opacity = 0）、"顶部资源栏"（贴边整条 + 锚点）。 |
| vis.corner 转角 | vis.skew 倾斜 | 拆开 | 任何转角都能被倾斜（Overwatch）。v2 把 v1 vis.shape 拆成转角 + 圆角大小 + 边缘 + 小组件轮廓，"像素阶梯"由像素化推出，"手绘有机"= 抖动。 |
| vis.opacity 不透明度 | vis.fill / col.lightness / vis.blur | 主从 | v2：只有不透明度决定"有没有底"；填充、面板明度、毛玻璃都只在有底时生效。v1 的"无底"有 6–7 种写法，已删到只剩 vis.opacity = 0。 |
| ast.core / ast.frame 结构 | vis.fill / vis.corner / vis.stroke | 主从 | "程序 / 素材"只在资产槽位一侧判定：内芯为程序填充时才看 vis.fill；外框为程序线框时才看转角；程序线框或只有四角件时才看描边。v1 里 vis.fill = illustrated、vis.stroke = ornamental / brush 是素材却挂在程序参数下，已移走。 |
| ast.frame 外框结构 | ast.frameMat 材质 / vis.motif 母题 / vis.ornament 装饰预算 | 拆开 | v1 的外框取值是"材质 × 母题 × 轮廓 × 装饰量"的成品组合（金色浮雕框、云纹框、科技线框、像素木框……）。v2：结构 4 个 × 共用材质表 17 种 × 母题 × 预算；素材生成提示词也按这四项拼。 |
| vis.ornament 装饰预算 | ast.ornaments 饰件 / vis.motif 母题 | 主从 + 约束 | v1 说三者独立，但 0 + 饰件不为空写得出来画不出来。v2：预算 0 ⇒ 饰件为空、母题 none（C-ornament0）；≥ 2 而饰件未定 ⇒ 按母题派生（D-ornament）。 |
| col.strategy 骨架色彩策略 | col.coding 语义编码 | 拆开 | V4 混了"用几种颜色"和"颜色表达什么"。v2 明确：策略只约束骨架色（底、字、强调），语义编码色不受它限制。 |
| col.lightness 面板明度 | col.accent / col.saturation / col.surface | 独立 + 覆盖 | 浅底 / 深底与色相、饱和度互不决定；col.surface 写死底色时明度由它推出。 |
| col.coding 稀有度 | st.rarityCue 表达手段 / col.rarityScale 色阶 | 主从 + 约束 | 色阶与表达手段只在编码含稀有度时生效；A5 要求表达手段至少含一项非颜色手段（C-rarity-redundancy）。v1 的"单色 + 星级"色阶、"随稀有度"描边色已删。 |
| rel.diegesis 放置 | ast.container 场景容器 | 独立（最易混） | 放置 = UI 是否真的在世界里；容器 = UI 长得像不像世界里的东西。屏幕上的一本 2D 书 = 屏幕叠加 + 书容器；Dead Space 背脊血条 = 叙事内 + 无容器；MGSV iDroid = 叙事内 + 手持终端容器。v1 tpl.codex 把屏幕上的手账标成"叙事内"，违反了这条，已改。 |
| rel.diegesis 放置 | rel.harmony 关系 / rel.behind 背后来源 | 独立 | W1 / W2 / W3：在哪、像不像、背后是什么，三者任意组合都有实例。rel.harmony 在 v2 归为解析设置，不参与原子参数计数。 |
| rel.behind 背后来源 | rel.dim 压暗 / rel.sceneBlur 虚化 / rel.sceneTone 调色 | 拆开 | v1 的 rel.backdrop 把来源（实时 / 冻结 / 替换）和处理（压暗、虚化）做成单选档位；v2 来源单选、处理是两个连续量 + 一个调色，下层是 UI 时同样适用。 |
| rel.metaFx 元 UI 效果 | ast.fx 叠加特效层 | 独立 | 元 UI 是"状态触发的整屏效果"（受伤泛红）；叠加特效是"附着在 UI 元件上的层"（金框发光、放射光）。v2 删掉了两边的越界项：ast.fx 的整屏颗粒、metaFx 的电影黑边与 CRT 框（它们是画面参数）。 |
| ast.fx 叠加特效层 | mo.* 动效 | 独立 | 放射光、法阵在静帧里也是可见的层。层归 ast.fx，怎么动归 mo。 |
| mo.reward 奖励演出强度 | ops.badges 商业角标 | 独立 | 买断游戏也有满屏金光的结算，手游也有朴素的领取。v1 的 ops.density 改为由角标与入口算出的读数。 |
| ops.poster 海报化 | ops.badges / cnt.focal | 独立 | 海报可以只有一个按钮；运营元素很多的页面也可以是纯表格。 |
| typ.display.family 标题字族 | typ.titleFx 特效 / cmp.plate@title 标牌 | 拆开 | 计划里的 hud.titleType 包了三件事。v2 再拆一层：字族、字重、大小写、字距、斜体按"角色 × 属性"组织（正文 / 标题 / 数字）。 |
| ctx.device 设备 | ctx.orientation 朝向 / ctx.aspect 宽高比 / ctx.input 输入 | 独立 + 派生默认 | 手机可横可竖；PC 可接手柄。设备只给默认值（D-device）。v2 把宽高比从朝向里拆出。 |
| ix.mode 交互模式 | ix.confirm 确认 / ix.dismiss 结束方式 | 拆开 | I2 混了"怎么选"与"怎么确认 / 退出"。v2 新增 ix.dismiss 作为"本屏怎么结束"的唯一参数，阻断性由它推出，关闭控件与继续提示按它生效。 |
| hier.emphasis 强调配方 | hier.cta 主次差距 / col.semantic 按钮角色色 | 主从 | v2：强调配方只作用在主元素上并输出到别的参数；主次差距只回答"靠什么"；按钮角色的色相只由 col.semantic 给。 |
| lay.grouping 分组方式 | vis.stroke 描边 / vis.fill 填充 | 独立 | "卡片"不等于有描边；"色块分组"可以无边；"分隔线"可以是花纹。 |
| cnt.focal 主视觉 | cnt.characterMedium 介质 / cnt.companion 陪衬 | 主从 + 拆开 | v1 的 cnt.character 同时表达主角色介质与陪衬吉祥物。v2：介质只在主视觉是角色时生效；陪衬角色单列。 |
| vis.iconStyle 图标风格 | ast.iconSet 图标来源 | 独立 + 兼容约束 | 画法与来源是两件事，但图标字体只能线性 / 扁平、实时渲染只能 3D 渲染（C-iconFont / C-iconRender / C-iconProc）。 |
| cmp.gauge 数值图形 | el.* 各元素 | 共用词表 + 逐元素覆盖 | v1 把"数值图形"重复了约 6 份（st.progress、el.vitals.form、el.loading.form、el.timer.form、el.speed.form、el.resources.manaBar）。v2 只留 cmp.gauge，逐元素写 cmp.gauge@el.<元素>，"进度"是一个角色（cmp.gauge@progress）。 |
| vis.silhouette 小组件轮廓 | cmp.slot / cmp.tab / cmp.badge / el.minimap / el.choices | 共用词表 + 按组件覆盖 | v1 的圆、方、菱、六边、盾在 5 个参数里各列一遍。v2 只留 vis.silhouette，组件写 vis.silhouette@slot / @icon / @avatar / @badge / @minimapFrame。 |
| cmp.plate 标牌 | typ / st / cmp 里的缎带、印章、胶囊 | 合并 | v1 的标题承载、名牌、印章饰件、名次斜切色块、物件化按钮、已领取缎带合并成一个组件，按角色覆盖（@title / @name / @rank / @button / @stateTag）。 |
| st.newCue 新内容提示 | ops.badges 商业角标 | 拆开 | 红点 / NEW 是系统提示，买断游戏也会用；折扣、倒计时、限购是运营层。v2 再把分享、再来一次、看广告翻倍拆成 ops.actions。 |
| ix.focus 导航焦点 | st.selected 已选标记 | 拆开 | 手柄导航时"焦点在 A、装备的是 B"需要两个标记同时出现（R1）。 |
| st.locked / emptySlot / done / cooldown / selected | 彼此 | 独立 + 通道约束 | v1 的灰度锁、去饱和冷却、灰化完成三者同屏分不出来。v2 给每个取值标了视觉通道，生成器检查同一屏里两两不撞车（C-st-channels）。 |
| elx.screenAnchor 九宫格 | elx.attachTo 世界挂点 / elx.diegesis 放置 | 拆开 + 主从 | v1 把九宫格与世界挂点放在一个枚举里，叙事内 + 左上是无效组合。v2：九宫格只在屏幕叠加且不跟随世界点时生效；元 UI 没有挂点。 |
| el.<元素>.form 画法 | elx.screenAnchor / elx.diegesis / elx.arrangement | 独立（v2 才真正成立） | v1 说"画法与放置、锚点独立"，但画法取值里写死了位置（顶部资源栏、右下主按钮）、放置（头顶、画在身上、手持地图）、排布（图标行、手牌、环绕）。v2 把这些词全部删掉，画法只剩轮廓与构成。 |
| cnt.subtype 子功能 | cnt.screen 界面类型 / cnt.layer 浮层 | 派生 | v1 的 50 个模板两个都写，选出不匹配的一对即无效。v2：基础界面子功能的 parent 推出界面类型；确认、奖励、引导、章节卡这类浮层可叠在任何界面上。 |
| cnt.subtype 子功能 | cnt.stage 流程阶段 / cnt.dataState 数据状态 | 独立 | 同一个抽卡有入口、仪式、结果三阶段；"空"与"未解锁"是数据状态，不是阶段（v2 拆出）。 |
| 皮肤家族（V9） | 视觉语言各参数 | 改为预设 | 皮肤家族是一组参数的常见组合，不是一维；v2 规定皮肤只拥有"形与面"（第 1.3 节）。 |
| 品类 / 题材世界观 | UI 参数 | 改为预设 | "三国""二次元""末世"是世界观，不是 UI 维度；通过关键词预设影响材质、母题、字体（第 3.14 节有 CULTURES → 关键词对照）。v1 的 D-style-material 规则删掉（它的输入"美术题材"不是参数）。 |
| 节日主题 | 色彩 / 母题 / 特效 / 饰件 | 改为预设 | v2：节日是关键词的白名单子集，只能改这 4 类。 |
| 镜头视角 / 渲染风格 / 场景色调 | UI 参数 | 改为只读输入 | 这些是画面维度（camera.* / surface.* / color.*），UI 只读，用派生规则推默认值。 |
| 截图类型 / 商店图类型 / UI 露出度 / 营销叠层 | UI 参数 | 改为参考元数据 / 工具读数 | 描述"这张参考图是什么"；UI 露出度是 chk.coverage 读数。营销叠层若要复现，用 ops.compliance 的 reviews / watermark。 |
| 观看距离 | ctx.device | 改为派生 | 视距只由设备决定；视距预览是工具 chk.viewDistance。 |
| 滑条造型 | cmp.gauge × vis.corner × vis.stroke | 改为组合 | 不单设参数。 |
| rel.harmony UI 与画面关系 | 原子参数 | 改为解析设置 | 它不是视觉属性，而是派生规则的开关（R1）。 |

## 6. 与现有计划和观察数据的对应

### 6.1 计划里的 8 + 2 个维度

| 原维度 | 本体系 | 说明 |
|---|---|---|
| 1 皮肤（视觉语言）hud.style + hud.* 覆盖参数 | 视觉语言 vis.*（24）、色彩 col.*（17）、字体 typ.*（18）、资产槽位 ast.*（13）+ 皮肤 38 / 关键词 18 / 节日 5 | hud.style 的 id 保留为皮肤 id（skin.<id>），旧配方与收藏不变；v2 里与关键词重名的皮肤（skin.wa、skin.ink、skin.candy、skin.ornate、skin.parchment、skin.darkGold、skin.pixelWood、skin.skeuo、skin.scifi、skin.holo）改为"形与面 + 引用一个关键词" |
| 1b 标题字处理 hud.titleType | typ.display.*（字族 / 字重 / 大小写 / 字距 / 斜体）+ typ.titleFx + cmp.plate@title + typ.direction | 一拆三再按角色拆 |
| 2 UI 放在哪 hud.diegesis | rel.diegesis（全局）+ elx.diegesis / elx.attachTo / elx.worldRender / elx.metaFx（逐元素）+ rel.worldRender + rel.followPost | 四分法不变，增加逐元素覆盖 |
| 2b 呈现内容（uiContent.ts） | cnt.subtype（78，带 parent / layer：基础界面 60、浮层 18）→ cnt.screen（26）+ cnt.layer + cnt.elements（32）+ el.* 画法 | 界面 26 种保持 id；信息元素 18 → 32 |
| 3 品类布局 hud.layout | 品类布局预设 31 个（第 3.4 节）+ lay.hudOrg + elx.screenAnchor + el.*.form | 布局 = 一组元素实例的锚点与画法 |
| 4 界面场景 hud.screen | cnt.subtype + cnt.stage + cnt.dataState + 流程组 flow.* + 界面模板 63 个（第 3.7 节）+ 版式预设 6 + 容器预设 6 |  |
| 5 UI 跟随画面 hud.followArt | 派生规则 D-outline / D-toon / D-paper / D-boil / D-frame（默认类，同一媒介时升为适配类）+ D-pixel（适配类）+ D-lightness + D-palette，强度由解析设置 rel.harmony 控制 | 不再是一个开关，而是一组规则 + 一个解析设置 |
| 6 动效与反馈 hud.motion | 动效组 mo.*（12）+ ix.press + st.cooldown + mo.*@el.<元素> | 静态看不出 → 时间轴 / 事件触发 / 状态陈列板 |
| 7 输入方式 hud.input | ctx.input + ix.glyphs + ix.focus + ix.touchSize + 平台预设 + D-input（适配类） |  |
| 8 可读性与无障碍（工具侧） | 玩家选项 a11y.*（6）+ 工具 chk.*（12） | 玩家选项导出到 Godot 设置页；工具不进配方 |
| hud.useSceneColors | col.source（默认由 rel.harmony 派生） | true → scene，false → skin |

### 6.2 资产槽位（08 文档 3.1）+ A6 / A7

| 槽位 | 本体系 | 说明 |
|---|---|---|
| 槽位 1 外框（九宫格） | ast.frame（结构 4）+ ast.frameMat（材质表 17） | 程序线框时交给 vis.stroke / vis.corner |
| 槽位 2 内芯 | ast.core（结构 3）+ ast.coreMat（材质表 17） | 程序填充时交给 vis.fill / vis.opacity / vis.blur；图案叠层 vis.pattern 可叠在任何内芯上；层级靠明度差 → lay.grouping = tonalInset |
| 槽位 3 饰件（页签 / 标题牌 / 角花 / 徽章底座） | ast.ornaments（角花、分隔饰条、徽章底座……）+ cmp.tab / cmp.tabIndicator（页签）+ cmp.plate（标牌）+ cmp.badge（徽章设计） | 页签与标牌是结构件，单独成参数 |
| 槽位 4 叠加特效层 | ast.fx（11 选项，多选，并集） | 怎么动见 mo.* |
| 槽位 5 场景容器 | ast.container（19 选项，逐屏）+ ast.containerSurface + 容器预设 6 | 与 rel.diegesis 正交 |
| 槽位 6 图标集 | ast.iconSet（来源）+ vis.iconStyle（画法）+ vis.silhouette@icon（底座） | 有兼容约束 |
| A6 标题字 / LOGO | typ.display.* / typ.titleFx / cmp.plate@title + el.title |  |
| A7 插画与立绘 | cnt.focal + cnt.characterMedium + cnt.companion + cnt.characterRender + ast.bgArt + lay.layering | 不生成，只占位 |
| （新）水印层 | ast.watermark + ast.watermarkOpacity | R2 |

### 6.3 26 种界面与功能标签

`cnt.screen` 的 26 个取值与 `uiContent.ts` 的界面 id 完全一致；GameUI 68 个功能标签与 IIG 的制作人员、记分板、存档并入 `cnt.subtype`，v2 共 78 个（基础界面 60、浮层 18），每个取值带机器字段 parent / layer。v1 里两处与 GAMEUI_FUNCTION_TO_CONTENT 不一致的归属（"变强"、"战斗提示 / 升级提示"）在 v2 分别是 forge（父界面 screen.craft）与浮层 callout / levelup；建议 R2 建卡前同步。

### 6.4 信息元素 18 → 32

| 元素 | 说明 / 吸收的观察画法 |
|---|---|
| 18 个原有元素 | el.vitals / resources / abilities / minimap / objective / interact / threat / feedback / notify / timer / speed / crosshair / selection / party / clock / overlay / prompt / subtitle，id 不变；v2 删掉了 vitals / speed / subtitle 的画法参数（与 cmp.gauge、cmp.dialogBox 重复），其余画法只剩轮廓与构成 |
| 新增 el.cta 主行动按钮 | 观察：el.cta、el.gacha_cta、el.claim_button、el.price_button、el.confirm |
| 新增 el.title 标题 / LOGO | 观察：el.logo、el.title、el.banner |
| 新增 el.reward 奖励 / 获得物 | 观察：el.reward、el.rewards、el.reward_preview、el.reward_slot、el.rewardlist |
| 新增 el.cost 价格 / 消耗 | 观察：el.cost、el.price、el.pricetag、el.resources 消耗；v2 并入 ops.price |
| 新增 el.rank 名次 / 段位 / 评级 | 观察：el.rank、el.score、el.stars、el.badge、el.leaderboard |
| 新增 el.profile 身份 / 头像 / 等级 | 观察：el.profile、el.avatar、el.level、el.id、el.vip_badge |
| 新增 el.loading 加载 / 等待 | 观察：el.loading、el.progress 加载进度、el.download |
| 新增 el.guide 引导指示 | 观察：el.guide、el.pointer、el.spotlight、el.tutorial |
| 新增 el.chat 聊天 | 观察：el.chat |
| 新增 el.gameSpeed 倍速 / 暂停 / 自动 | 观察：el.speed（倍速部分）、el.timectrl |
| v2 新增 el.meter 态势条 | R2：温度、希望 / 不满、通缉、警戒、理智 |
| v2 新增 el.toolbar 建造栏 / 系统入口条 | R2：Anno 建造栏、Frostpunk 底部圆钮、WoW 微型菜单 |
| v2 新增 el.turnOrder 行动顺序 | R2：Clair Obscur、JRPG、战棋 |
| v2 新增 el.choices 对话 / 事件选项 | R1：取代 v1 的 cmp.choice |
| 观察里的"组件"类元素 | el.tabs → lay.nav + cmp.tab；el.close → ix.dismiss + ix.close；el.slot → cmp.slot + st.emptySlot；el.card → cmp.card；el.input → cmp.input；el.slider / el.toggle → cmp.optionRange / cmp.optionBool；el.qty → cmp.quantity；el.lock → st.locked；el.node → cmp.node；el.legal / el.rating / el.version → ops.compliance；el.server_status → st.statusMark |

### 6.5 皮肤：14 个已实现 + 12 个待做 B 风格 + 10 个 IIG 家族

| 现有 / 调研 | 皮肤预设 |
|---|---|
| neobrutal（B1） | skin.neobrutal |
| glass（B2） | skin.glass |
| flat（B4） | skin.flat |
| pixel（B6） | skin.pixel |
| handdrawn（B7） | skin.handdrawn |
| ink（B8） | skin.ink → kw.ink |
| scifi（B9） | skin.scifi → kw.tech |
| jrpg（B10） | skin.jrpg |
| parchment（B11） | skin.parchment → kw.questBook |
| comic（B12） | skin.comic |
| terminal（B13） | skin.terminal |
| y2k（B14） | skin.y2k |
| swiss（B15） | skin.swiss |
| constructivist（B16） | skin.constructivist |
| B3 新拟态（未实现） | skin.neumorph |
| B5 拟物 | skin.skeuo → kw.rustic |
| B17 装饰艺术 | skin.deco |
| B18 Persona | skin.persona |
| B19 孟菲斯 | skin.memphis |
| B20 极简单色 | skin.mono |
| B21 Frutiger Aero | skin.aero |
| B22 合成波 | skin.synth |
| B23 军事 | skin.military（并入 v1 kw.military） |
| B24 治愈圆润 | skin.cozy（并入 v1 kw.cozy） |
| B25 和风 | skin.wa → kw.wafu |
| B26 手游金框 | skin.gacha |
| （新）中性基线 | skin.greybox、skin.godotDefault |

| IIG 家族 | 皮肤预设 |
|---|---|
| 重装饰雕花框（Hades / WoW / Frostpunk / Armello / Hearthstone / StS） | skin.ornate → kw.ornate；冰霜变体 = kw.frost |
| 线描花饰（Hollow Knight / Clair Obscur） | skin.filigree |
| 细线几何（GRIS / Monument Valley / Destiny 2） | skin.thinGeo |
| 羊皮纸任务书 / 古海图（Anno 1800 / WoW 任务 / Civ VI / Armello） | skin.parchment → kw.questBook；+ kw.nautical |
| 墨笔（RDR2 / Black Myth / Don't Starve） | skin.ink → kw.ink；西部墨刷 = kw.western |
| 瑞士几何 / 极简表格（Control / Mini Metro / MGSV 结算） | skin.swiss |
| 全息空间（Detroit / Cyberpunk / MGSV iDroid / XCOM） | skin.holo → kw.cyber |
| 倾斜动感 / 漫画（Overwatch / Hi-Fi Rush / No Man's Sky / NFS Heat） | skin.slant + skin.comic |
| 圆润友好（动森 / BotW / Stardew 像素木框） | skin.cozy + skin.pixelWood → kw.rustic |
| 叙事内设备 / 容器（Nookphone / iDroid / 希卡石板 / Hearthstone 木箱） | v2：容器预设 ctr.handheld / ctr.phone / ctr.book（v1 的 skin.device 移出皮肤） |

### 6.6 SkinTokens 字段 → 参数

| `src/hud/types.ts` 字段 | 参数 |
|---|---|
| `font` | typ.body.family（+ typ.display.family 的标题字体） |
| `textSize` | typ.baseSize（像素字取原生高度） |
| `text` | col.text（auto = 由面板明度推出） |
| `textGlow` | typ.legibility = textGlow |
| `panel.bg（Paint）` | vis.fill（solid / gradient）+ col.surface + col.gradient，或 ast.core |
| `panel.border` | vis.stroke + vis.strokeWidth + vis.strokeColor（+ col.border） |
| `panel.sides` | vis.strokeSides（v2 新增；v1 说已吸收，实际没有取值） |
| `panel.radius` | vis.cornerSize（vis.corner = round） |
| `panel.chamfer` | vis.corner = chamfer + vis.cornerSize |
| `panel.circle` | vis.silhouette = circle |
| `panel.shadows` | vis.depth |
| `panel.ring` | vis.stroke = double 的外圈 |
| `panel.backdropBlur` | vis.blur |
| `panel.rotate` | vis.jitter |
| `panel.skewX` | vis.skew |
| `panel.glow / bar.fill.glow` | ast.fx = glow / vis.strokeGlow |
| `dialog.tail` | cmp.dialogBox = bubble |
| `map.*` | el.minimap.form + vis.silhouette@minimapFrame + vis.mapStyle |
| `title / name（TextStyle）` | typ.display.* / typ.body.* |
| `bar` | cmp.gauge（+ cmp.gauge@el.<元素>） |
| `key（含 brackets）` | ix.glyphs + el.prompt.form |
| `icon` | col.accent / vis.iconStyle |

### 6.7 起始观察轴（25 个）

| 观察轴 | 本体系 |
|---|---|
| C2 信息密度 | cnt.density |
| C3 数据结构 | cnt.dataShape + lay.arrangement（拆开） |
| L1 版式原型 | lay.container + lay.hudOrg + 版式预设（拆开） |
| L2 导航 | lay.nav + lay.navDepth + lay.pageIndicator |
| L3 主视觉 | cnt.focal + cnt.characterMedium + cnt.companion |
| L4 屏占比 | chk.coverage 读数 + lay.panelSize |
| L5 构图 | lay.composition + lay.focalSide |
| H1 强调手段 | hier.emphasis（+ hier.inline / hier.cta） |
| H2 分组方式 | lay.grouping |
| V1 形状语言 | vis.corner + vis.cornerSize + vis.edge + vis.silhouette + vis.skew（拆开） |
| V2 底 / 填充 | vis.opacity + vis.fill + vis.pattern + vis.blur + ast.core（拆开） |
| V3 线条 | vis.stroke + vis.strokeWidth + vis.strokeColor + vis.strokeSides + vis.strokeGlow |
| V4 色彩策略 | col.strategy + col.coding（拆开）+ col.rarityScale + col.teams + 色板角色 |
| V5 字体 | typ.body.* + typ.display.* |
| V6 图标风格 | vis.iconStyle + vis.silhouette@icon |
| V7 装饰量 | vis.ornament（+ vis.motif、ast.ornaments） |
| V8 资产层 | ast.*（结构 × 材质） |
| V9 皮肤家族 | 皮肤预设（不是参数） |
| W1 放置 | rel.diegesis + elx.diegesis |
| W2 与世界关系 | rel.harmony（解析设置） |
| W3 背后场景 | rel.behind + rel.dim + rel.sceneBlur + rel.sceneTone + ast.bgArt |
| I1 输入 | ctx.input |
| I2 交互模式 | ix.mode + ix.confirm + ix.dismiss（拆开） |
| M1 动效 | ast.fx（层）+ mo.*（动） |
| B1 运营密度 | ops.badges + ops.entries → ops.density 读数 |
| B2 奖励演出 | mo.reward + mo.reveal + mo.revealTease |

### 6.8 统计里出现的高频新轴

| 新轴 | 归为 | 本体系 |
|---|---|---|
| N:屏幕朝向与设备 / N:屏幕朝向 / N:屏幕方向画幅 | 参数 | ctx.orientation + ctx.aspect + ctx.device |
| N:预览载体 | 参数 | cnt.characterMedium（+ cnt.focal = item） |
| N:服务器状态编码 | 参数 | st.statusMark + col.coding = status |
| N:叙事媒介 | 参数 | ast.bgArt（漫画分格 / 纯色 / 插画）+ rel.behind + cmp.dialogBox |
| N:引导指示符 | 参数 | el.guide.form |
| N:阵型空间模型 | 参数 | lay.arrangement（hexGrid / ring / pitch / grid） |
| N:角色呈现形态 / N:角色呈现介质 | 参数 | cnt.characterMedium + cnt.characterRender |
| N:解锁对象类型 | 内容语义 | cnt.subtype = unlock + cnt.focal（不设轴） |
| N:菜单语义用途 / N:子功能/编辑目标 / N:弹窗功能子类型 | 参数 | cnt.subtype |
| N:详情面板模式 | 参数 | lay.detail + lay.preview |
| N:空格呈现 | 参数 | st.emptySlot（hidden = 只画占用格）+ st.emptyList |
| N:界面明暗基调 / N:UI明暗基调 | 参数 | col.lightness |
| N:节日主题 | 预设 | theme.* |
| N:标题艺术字造型 | 参数 | typ.display.* + typ.titleFx |
| N:相机视角 / N:镜头视角 / N:视角人称 | 画面参数 | camera.*（只读，D-camera） |
| N:整体明度基调 / N:光照色温基调 | 画面参数 | color.* / lighting.*（只读，D-lightness） |
| N:渲染媒介 / N:渲染风格 / N:色板策略 | 画面参数 | surface.medium / color.palette（只读，D-paper / D-palette） |
| N:HUD锚定边 / N:HUD锚点 | 参数 | elx.screenAnchor（逐元素；整屏锚点分布是统计量） |
| N:UI可见度 / N:UI露出度 | 元数据 / 读数 | 参考卡 ref.shotType；复现时用 chk.coverage + rel.hudVisibility |
| N:商店图类型 / N:截图类型 | 元数据 | 参考卡 ref.shotType（实机含 HUD / 无 HUD / 过场 / 菜单 / 营销卡） |
| N:多人HUD布局 / N:玩家列表 | 参数 | ctx.players + el.party.form + elx.arrangement |
| N:画面外框 | 画面参数 + 参数 | camera.letterbox + lay.playfield = boxed + lay.hudOrg = inMargin |
| N:HUD显隐策略 | 参数 | rel.hudVisibility + elx.visibility |
| N:UI字号尺度 | 参数 | typ.baseSize + a11y.uiScale |
| N:世界内标注 | 参数 | elx.attachTo + elx.worldRender（+ rel.worldRender 默认） |
| N:时间模型 | 参数 | ctx.timeModel + ctx.turnTimer |
| N:世界内图形 | 参数 | elx.diegesis = diegetic |
| N:营销叠层样式 / N:品牌水印 | 参数 | ops.compliance（reviews / watermark） |
| N:UI隐喻材质 | 参数 | ast.core / ast.frame + 材质表 |
| N:HUD与关卡框一体 | 参数 | lay.hudOrg = inMargin + lay.playfield；无底 = vis.opacity 0 |
| N:连击倍率显示 | 参数 | el.feedback.form（combo / comboBadge） |
| N:拾取文字 | 参数 | el.notify.form = pickupText；整屏 = tpl.pickupToast |
| N:仪表形态 | 参数 | cmp.gauge（+ @el.<元素>） |
| N:像素栅格一致性（疑似） | 参数 | vis.pixelScale（+ D-pixel） |
| N:卡牌手牌托盘 | 参数 + 预设 | el.abilities.form = cards + elx.arrangement = fan + cmp.card + 版式预设 pat.fan |
| N:收藏页版式 | 预设 | lay.composition = three + 界面模板 |
| N:角色预览台 | 参数 | ast.bgArt = spotlightStage + cnt.characterMedium = model3d |
| N:对称对抗布局 | 参数 + 派生 | ctx.players = versus → D-players（focalSide = both + 镜像锚点） |
| N:HUD整合度 | 参数 | lay.hudOrg |
| N:技能物品槽容量 | 参数 | cnt.itemCount |
| N:嵌套场景窗 | 参数 | lay.playfield = pip |
| N:世界内覆盖层 | 参数 | el.overlay.form（gridHighlight / buildGrid / rangeRing）+ el.threat.form = visionCone |
| N:确认取消按钮 | 参数 | el.cta.form = dual + vis.silhouette@el.cta + col.semantic = greenRed |
| N:内嵌小游戏条 | 参数 | ix.mode = timing |

### 6.9 1,042 条新轴的长尾：按轴名关键词归并

| 轴名关键词 | 本体系 |
|---|---|
| 屏幕 / 画幅 / 朝向 / 平台 / 设备 | ctx.orientation / ctx.aspect / ctx.device |
| 题材 / 世界观 / 画风 / 美术题材 / 文化 / IP | 关键词预设（第 3.14 节 CULTURES → 关键词对照，不设轴） |
| 明暗 / 明度 / 基调 | col.lightness（UI 自身）或画面参数（场景） |
| 主色相 / 主光色相 / 主色来源 | col.accent / col.accent2 + col.source |
| 容器 / 载体 / 隐喻 / 包装 | ast.container（+ ast.core / ast.frame + 材质） |
| 标题 / Logo / 艺术字 / 字形 / 文字质感 | typ.display.* / typ.titleFx / cmp.plate@title / el.title |
| 排版方向 / 竖排 | typ.direction |
| 序号 | typ.numbering |
| 关闭 / 返回 / 退出 | ix.dismiss + ix.close |
| 继续 / 推进 / 跳过 | ix.continueCue / ix.skip |
| 阻断 / 阻塞 / 强制 | ix.dismiss（→ ix.blocking 派生）/ ix.guideForce |
| 确认 / 购买流程 | ix.confirm |
| 未解锁 / 锁定 / 未获得 / 探索进度 | st.locked + cnt.dataState；地图未探索 = vis.mapUnexplored |
| 空槽 / 空格 / 空状态 | st.emptySlot / st.emptyList |
| 完成 / 领取状态 / 已领 | st.done |
| 红点 / 角标 / 已读 | st.newCue / st.statusMark |
| 选中 / 已装备 / 上阵 | st.selected（导航光标是 ix.focus） |
| 稀有度 / 品质 / 星级 | st.rarityCue + col.rarityScale |
| 进度 / 里程碑 / 轨道 / 经验 | cmp.gauge@progress（+ lay.arrangement = track） |
| 前后对比 / 增量 | st.delta |
| 统计 / 数据可视化 / 属性表达 / 图表 | st.statViz |
| 名次 / 排名 / 前三 / 段位 / 评级 | st.rank + el.rank + cmp.badge + cmp.plate@rank |
| 徽章 / 勋章 / 徽记 | cmp.badge + vis.silhouette@badge |
| 头像 | vis.silhouette@avatar + el.profile |
| 卡牌 / 卡面 / 卡背 | cmp.card |
| 格子 / 槽位 / 商品卡 | cmp.slot + vis.silhouette@slot + cmp.listRow |
| 行结构 / 条目 | cmp.listRow |
| 节点 | cmp.node |
| 输入框 / 搜索 | cmp.input |
| 数量控件 / 步进 / 滑块 | cmp.quantity / cmp.optionRange |
| 设置控件 / 开关 / 下拉 | cmp.optionBool / cmp.optionEnum / cmp.optionRange |
| 按键绑定 / 键位图 | cmp.bindingMap |
| 对话 / 字幕 / 说话人 / 选项 | cmp.dialogBox / cmp.plate@name / el.choices |
| 立绘 / 角色出镜 / 代言 / 吉祥物 / 主持者 | cnt.characterMedium + cnt.companion + lay.focalSide + lay.layering |
| 层叠 / 出框 / 出血 | lay.layering |
| 排布 / 拓扑 / 牌阵 / 阵型 / 日格 / 组织结构 | lay.arrangement / elx.arrangement |
| 列数 / 网格规格 / 密度（格子） | lay.columns / cnt.itemCount |
| 分区 / 分类 / 页签 / 切换方式 | lay.nav / lay.navDepth / cmp.tab / lay.pageIndicator |
| 详情 | lay.detail |
| 置顶 / 自身排名 / 最近登录 | lay.pinned |
| 滚动 / 翻页 / 拖动画布 | lay.overflow |
| 揭示 / 演出 / 入场 / 出现方式 / 转场 | mo.reveal / mo.revealTease / mo.enter / mo.transition / mo.reward |
| 背光 / 光效 / 特效 / 粒子 / 环境饰件 | ast.fx |
| 装饰母题 / 饰件 / 底纹 / 水印 | vis.motif / ast.ornaments / vis.pattern / ast.watermark |
| 滤镜 / 后期 / 夜视 / 故障 / 暗角 | rel.metaFx / rel.followPost / rel.sceneTone |
| 世界内 / 空间内 / 挂载 / 锚定 | elx.diegesis / elx.attachTo / elx.screenAnchor / elx.worldRender |
| 显隐 / 出现策略 / 露出 | rel.hudVisibility / elx.visibility |
| 多人 / 分屏 / 镜像 / 对阵 | ctx.players（+ D-players） |
| 运营 / 促销 / 倒计时 / 限购 / 倍率 / 二次转化 | ops.badges / ops.actions / ops.entries |
| 海报化 / 截图嵌入 | ops.poster + pat.poster |
| 价格 | el.cost.form |
| 合规 / 版号 / 水印 / 评分墙 | ops.compliance |
| 语气 / 文案 | cnt.tone |
| 引导 / 教学 | el.guide + ix.guideForce |
| 主按钮 / CTA | el.cta + hier.cta + col.semantic |
| 数值载体 / 仪表 / 血量 | cmp.gauge + elx.valueLabel |
| 小地图 / 地图画风 | el.minimap + vis.mapStyle + vis.mapUnexplored |
| 语义缩放 | rel.semanticZoom |
| 节日 | theme.* |
| 截图类型 / 商店图 / 营销叠层（参考来源） | 参考元数据 ref.shotType |
| 镜头 / 视角 / 渲染风格 / 场景色调 / 光照 | 画面参数（只读）+ 派生 |

### 6.10 v1 → v2 迁移表

给已经按 v1 JSON 写了代码或参考卡的地方。`hud.style` 的 id 全部不变；hud.useSceneColors 迁到 col.source。

| v1 | v2 |
|---|---|
| ctx.orientation = ultrawide / boxed | ctx.aspect = 21x9；lay.playfield = boxed |
| ctx.input = none | ix.mode = readOnly |
| ctx.timeModel = turnTimer / none | ctx.timeModel = turn + ctx.turnTimer = true；删除（由 cnt.screen ≠ hud 推出） |
| cnt.subtype（取值不变的 64 个） | 同名；新增 parent / layer 字段；photo → photoMode |
| cnt.stage = empty / locked | cnt.dataState = empty / locked |
| cnt.dataShape = single / detail / list / grid / tree / graph / timeline / map / narrative | scalar / record / collection / collection + lay.arrangement = grid / hierarchy / network / sequence / spatial / text |
| cnt.character | cnt.characterMedium（主视觉是角色时）/ cnt.companion（mascot）；photo → liveAction |
| cnt.focal = device / map | apparatus；删除（由 cnt.dataShape = spatial 推出） |
| cnt.mapRender | vis.mapStyle |
| lay.archetype | lay.container（none / overlay / banner / modal / drawer / sheet / tray / fullscreen / window）；masterDetail / gallery / mapMain / fan / radial / poster → 版式预设 pat.*；hud → overlay；diegetic / worldFloat → rel.diegesis + ast.container；multiWindow → window |
| lay.coverage | 工具读数 chk.coverage；可调部分 = lay.panelSize |
| lay.hudOrg = topbar / sidebar / framed / floating / minimal | edgeBar / edgeBar / inMargin / vis.opacity = 0 / 删除（元素数量） |
| lay.playfield = inset | pip |
| lay.composition = centered / asymmetric / corners / diagonal / mirror | single + lay.focalSide / single + lay.focalSide / lay.hudOrg = scattered / diagonalSplit / 由 ctx.players = versus 推出 |
| lay.focalSide = background | lay.layering = backdrop |
| lay.nav = pager / dots / radial / stack / sceneHotspots | lay.overflow = paged + lay.pageIndicator = arrows / dots；lay.arrangement = ring；lay.arrangement = column + cmp.button = text + cmp.buttonBox = false；hotspots |
| lay.detail = sidePanel / popup / sheet / tooltip / expand / spread / livePreview | persistent / transient / transient / transient / inline / persistent（ast.container = book）/ lay.preview = true |
| lay.grouping = inset | tonalInset |
| lay.grid = pixel / diagonal | 由 vis.pixelScale / vis.skew 推出 |
| hier.emphasis = position / border / fx | lay.pinned / ix.focus、st.selected、st.rarityCue / glow |
| hier.cta = saturation / semantic / single | color / col.semantic / ix.mode = singleCTA |
| vis.shape | vis.corner（square → sharp，rounded / pill → round + vis.cornerSize，chamfer，pixelStep → step）；diamond / circle → vis.silhouette；ornate / torn → vis.edge；organic → vis.jitter |
| vis.radius（px） | vis.cornerSize（% 短边，约 px ÷ 48 × 100） |
| vis.fill = none / pattern / illustrated | vis.opacity = 0 / vis.pattern / ast.core = illustration |
| vis.stroke = hairline / bold / ornamental / brush / glowLine | solid + vis.strokeWidth = 1 / solid + 宽 ≥ 3 / ast.frame 素材结构 / vis.edge = brush / solid + vis.strokeGlow |
| vis.strokeColor = light / rarity | highlightEdge / st.rarityCue = border |
| vis.depth = inset / glow | innerShadow / ast.fx = glow |
| vis.iconStyle = textOnly | cmp.button = text |
| vis.iconFrame | vis.silhouette@icon（base → ast.ornaments = badgeBase） |
| col.lightness = clear | vis.opacity = 0 |
| col.strategy = multi / fullColor | polychrome / col.source = illustration |
| col.semantic = monoShape | hier.cta = fillOutline + col.strategy = mono |
| col.rarityScale = starsMono | st.rarityCue = stars |
| col.dynamic = alert | st.alert = fullAlarm |
| typ.body / typ.weight / typ.case / typ.tracking | typ.body.family / typ.body.weight（+ typ.display.weight）/ typ.body.case（+ typ.display.case）/ typ.body.tracking（+ typ.display.tracking） |
| typ.display | typ.display.family：serifCaps → serif + case smallCaps；thinWide → sans + weight light + tracking 0.2+；italicBold → sans + style italic + weight black；condensedBold → condensed + bold；roundBold → round + bold；cartoon3d → round + typ.titleFx = emboss |
| typ.numerals = italicDyn | typ.numerals.family = display + typ.numerals.style = italic |
| typ.titleCarrier | cmp.plate@title |
| typ.titleFx = glow | titleGlow |
| typ.direction = diagonal | 由 vis.skew 推出 |
| typ.legibility = glow | textGlow |
| ast.core = <材质> | ast.core = texture + ast.coreMat = <材质>（metal → iron） |
| ast.frame = <成品框> | ast.frame = plainNinePatch / carvedNinePatch / cornersOnly + ast.frameMat + vis.motif + vis.ornament（见 ast.frame 说明）；none → procedural + vis.stroke = none；card → st.rarityCue = border |
| ast.ornaments = seal | cmp.plate = seal |
| ast.fx = grain / halftone | 画面后处理（不在 UI）/ vis.pattern = halftone |
| ast.container = banner / device / photo / stage | hangingBanner / handheldDevice / photoFrame / theater |
| ast.iconSet = skinSet / generated / render | asset / asset / runtimeRender |
| ast.backdrop | ast.bgArt（paperFull → material + ast.bgMat；blackStage → solid；stage → spotlightStage） |
| rel.backdrop | rel.behind（visible → live，frozen，replaced）+ rel.dim + rel.sceneBlur；none → replaced + ast.bgArt = solid |
| rel.hudVisibility = diegeticOnly | 所有元素 elx.diegesis = diegetic + rel.hudVisibility = always |
| rel.followPost = pixel | vis.pixelScale = world |
| rel.metaFx = crtFrame / letterbox | 画面参数 surface.screen / camera.letterbox |
| rel.worldMarkers | rel.worldRender（全局默认）+ elx.worldRender；projected2d → elx.diegesis = screen + elx.attachTo |
| mo.panelIn | mo.enter |
| mo.easing = stepped | mo.frameRate = onTwos / onThrees |
| mo.idle = breathe / pulse | ix.continueCue（呼吸闪烁）/ st.newCue = glowPulse 或 el.guide.form = ring |
| mo.reveal = pillar / rarityTease | ast.fx = pillar + mo.reward = 3 / mo.revealTease = true |
| mo.transition = push / wipe / pageFlip / cut | mo.enter = slide / slashIn / pageTurn / cut（transition = useEnter） |
| ix.mode = tapAnywhere / listSelect / gridSelect / radial / swipe | ix.dismiss = tapAnywhere / select / select / lay.arrangement = ring / lay.overflow = paged + 触屏 |
| ix.close = tapOutside / keyBack / autoDismiss / forced | ix.dismiss = tapOutside / key（+ ix.close = keyGlyph）/ auto / forced |
| ix.blocking | 由 ix.dismiss 派生（不进面板） |
| ix.focus = glow / check | focusGlow / st.selected = check |
| ix.skip = topRight / bottomRight | ix.skip = button + ix.skipAnchor = tr / br |
| ix.guideForce = dialogue / forcedTap / questList | soft + el.guide.form = npcBubble / forced / none + el.objective.form = checklist |
| flow.stacking = dimBelow / beside | stack + rel.dim / lay.detail = persistent |
| flow.chrome = globalNav | flow.navPersistent = true |
| flow.demo | chk.demo（工具） |
| cmp.button = textOnly / labelBox / iconOnly / iconLabel / price / plaque | text + buttonBox false / text / icon / iconText / el.cost.form = inButton / ast.frame@button + vis.silhouette@button |
| cmp.tab = sticker / woodTag / diamond / slant / underline | vis.silhouette@tab / ast.frameMat@tab = wood / vis.silhouette@tab = diamond / vis.skew@tab / cmp.tabIndicator = underline |
| cmp.slot = roundSquare / square / circle / hexagon / noFrame | cell（+ vis.silhouette@slot）/ cell / cell + circle / cell + hexagon / bare |
| cmp.badge = shield / hexagon / roundMedal / triangle | vis.silhouette@badge / vis.silhouette@badge / medal / vis.silhouette@badge = diamond |
| cmp.avatar | vis.silhouette@avatar（ornateRing → ast.frame@avatar；portraitCard → cmp.slot = tallCard） |
| cmp.dialogBox = bottomBar / subtitle / portraitBar / sidePortrait / chat / nvl / worldFloat | bar / bare / bar + cnt.characterMedium = avatar / bar + bust / chatThread / fullPage / elx.diegesis = spatial |
| cmp.choice | el.choices（form + elx.arrangement + vis.silhouette@el.choices + elx.diegesis） |
| cmp.modal = band / sheet / fullPage / sceneWindow | lay.container = banner / sheet / fullscreen；lay.playfield = pip |
| cmp.nameplate | cmp.plate@name（bar → tab，inBox / textOnly → none） |
| cmp.option | cmp.optionBool / cmp.optionEnum / cmp.optionRange |
| st.progress | cmp.gauge@progress |
| st.rank = slashBlock | cmp.plate@rank = slashBand |
| st.rarityCue = glow | rarityGlow |
| st.empty / st.emptyState | st.emptySlot / st.emptyList |
| st.locked = fog | vis.mapUnexplored = fog |
| st.done = ribbon | tag + cmp.plate@stateTag |
| ops.density | 读数（由 ops.badges / ops.entries / st.newCue 算出） |
| ops.badges = share / retry / dontShow / adDouble | ops.actions |
| ops.price | el.cost.form |
| ops.entries = leftTabs | lay.nav = tabsLeft |
| a11y.redundancy | chk.redundancy（工具） |
| elx.anchor | elx.screenAnchor（九宫格）+ elx.attachTo（player / target / poi / held / cursor） |
| elx.visibility = hidden | 从 cnt.elements 去掉 |
| elx.motion | mo.idle@el.<元素> / mo.valueChange@el.<元素> / mo.juice@el.<元素> |
| el.vitals.form | cmp.gauge@el.vitals + el.vitals.count（thinBars → count）；mirrored → D-players；overhead → elx.attachTo；onBody → elx.diegesis = diegetic + attachTo player；edgeRed → elx.diegesis = meta + elx.metaFx = hurtVignette；none → 删除 |
| el.speed.form / el.subtitle.form | cmp.gauge@el.speed / cmp.dialogBox@el.subtitle |
| el.*.form 里的位置 / 放置 / 排布词 | 见各元素画法的说明（位置 → elx.screenAnchor，放置 → elx.diegesis + elx.attachTo，排布 → elx.arrangement） |

## 7. 落地建议（探索台界面）

R3 从"非美术独立开发者、最后迁到 Godot"的角度审了界面落地。下面把采纳的建议整理成实现说明；数据层的支撑（页签、分层、生效条件、兜底值、展示方式、needs / godotLevel、随机区间）已经写进 JSON。

**7.1 模式与页签**
- 顶栏加"画面 | UI"模式切换：LeftRail 与 RightPanel 的内容随模式切换，视口、A/B、撤销共用。
- UI 模式右栏 7 个页签：①起点 ②外观 ③内容与版式 ④动效与交互 ⑤与世界 ⑥组件与状态 ⑦运营；另有元素检查器、诊断（工具）、玩家设置预览。页签标题沿用 DIMS 的白话写法（各组的 question 字段）。
- 每个页签内：tier 1–2 直接显示，tier 3 收进"更多"；不生效的参数收进组尾的"当前不生效（n）"折叠条，不逐行灰显；手动值永远不折叠；页签上加"只看改过的"过滤。

**7.2 第一屏（起点页签）**
- 起点选择：平台预设、ctx.input 分段控件、子功能（带缩略图，按商业模式排序）→ 推荐界面模板或品类布局（默认跟随 game.genre）、皮肤（按浏览家族分组，标"可实时 / 待做""纯程序 / 重素材"）、关键词芯片、rel.harmony（同一媒介 → 统一调色 → 中性 → 刻意对比）、"跟随当前画面"卡、15 套 UI 配方。
- 10 个大旋钮：`cnt.density`、`vis.corner`、`vis.stroke`、`vis.depth`、`vis.ornament`、`col.lightness`、`col.accent`、`typ.body.family`、`typ.display.family`、`mo.juice`。除信息密度与反馈强度外都是 M3a 就能直接画的；这两项在 M5a / M5b 之前显示"待实现"。

**7.3 参数行：跟随的三态**
- 每行显示：解析后的实际值、来源徽标（"跟随 · 皮肤：毛玻璃 → 16%""派生：D-outline""兜底""手动"）、"↺ 跟随"按钮。拖动或点选即转为手动。组标题显示"本组手动 n 项"。
- 引擎与描述生成一律先过 resolveTheme（第 1.3 节的分层解析）再读值，不直接调用 registry.num() / str()——现在 num() 把 auto 读成 0，ParamRow 对 auto 得到 NaN（M3a 第一项）。
- 套用预设时弹一条提示，列出它改写了上一层的哪些键（例如"关键词「水墨」改了皮肤的 4 项"），可撤销。

**7.4 控件形态**
- 选项多于 6 个的单选改用"缩略图芯片"：HUD 本来就画在 Canvas2D 上，每个选项用同一个绘制器在 64×40 小画布上画一个样本，不重渲 3D；芯片角标显示参考游戏数。
- 屏幕锚点用 3×3 九宫格，世界挂点用 5 个芯片；多选用可多选芯片，由派生或预设加入的项标"由品类加入""由镜头加入"。
- 未实现的取值不隐藏、不禁用：素材类画带文字的灰盒（"金色浮雕框 · 需素材 · M11"）；加"只看 Godot 内置能做的"开关，同时作用于芯片与随机。

**7.5 元素检查器与搜索**
- "元素"页签只列当前 cnt.elements 里的实例，点开可调画法、锚点、大小、显隐、优先级、数值标注、动效覆盖。HudSystem 绘制时记录每个控件的矩形：在视口里点血条就聚焦 el.vitals.* 及影响它的全局参数（cmp.gauge、st.alert、vis.*），复用 focusParam()；拖动控件吸附到九宫格之一，直接写 el.<元素>.screenAnchor。
- 右栏顶部 Ctrl+K 搜索：索引参数名、取值名与 absorbs（1,042 条观察轴的同义词，例如"屏幕方向"→ ctx.orientation）。

**7.6 静态看不出的参数：按 preview 字段分 6 类展示**
- 时间型（mo.*、ix.press、st.cooldown、col.dynamic）：时间轴拖动 + 8 帧逐帧条带（0 / 50 / 100 / 150 / 250 / 400 / 700 / 1000ms），缓动与时长旁画缓动曲线小图，0.25× 慢放。
- 事件型（el.feedback、el.notify、st.alert、rel.metaFx、mo.valueChange、mo.juice）：视口里一排触发按钮（受击 / 回血 / 拾取 / 升级 / 冷却开始 / 低血量），驱动确定性 HUD 模拟。
- 状态型（ix.focus、ix.press、cmp.button、st.*、lay.detail）："状态陈列板"：同一控件按常态 / 悬停 / 焦点 / 按下 / 禁用 / 选中 / 锁定 / 新 / 冷却排成一行，是静图，可截图、A/B、扫描。
- 情境型（rel.hudVisibility、elx.visibility、ctx.timeModel、rel.semanticZoom、elx.worldRender）：探索 / 战斗 / 静止三联图；语义缩放出 3 档镜头距离条带；屏外指示让镜头环绕一圈。
- 流程型（flow.*、mo.reveal / reward / transition、ix.*、cnt.stage）：分镜条（入口 → 仪式 → 结果）+ 静帧上叠"交互注释层"（拖拽路径箭头、可点区域高亮、手势图标）；chk.demo 一键演示。
- 文本 / 设备型（cnt.tone、ctx.locale、cnt.textLength、ctx.device / aspect / orientation、ix.touchSize）：样例文案库切换 + 设备外框（刘海、圆角、拇指可达热区）+ 视距预览（chk.viewDistance）。

**7.7 随机**
- 两级：先在未锁定的层里抽预设（皮肤 × 关键词 × 布局变体），再按"变化幅度"扰动少量原子参数。锁定单位是 UI 页签；默认锁"起点 + 内容与版式"（同一屏只换外观），另有"锁外观只换版式"。
- 永不随机：random = false 的参数（语言、玩家选项、工具、界面类型与子功能、基准字号、安全边、触控尺寸、屏幕锚点）。单选排除 auto，多选抽 0–3 项，连续参数用 randomRange。
- 抽完先跑派生规则、约束和可读性检查，不及格的标 ⚠；"只要可读的结果"开关自动重抽最多 N 次；保留种子。

**7.8 A/B、扫描、诊断、收藏**
- UI 的 A/B 不重渲 3D：同一帧场景，A、B 两份解析结果各画一张 HUD 画布，中间可拖分割线；两侧共用 HUD 模拟时钟，"↻ 重放"同步播放；旁边列"差异清单"（按页签分组，点一行跳到该参数）；内容种子与 game.seed 分开，A/B 时锁住；支持 A / B / C / D 四宫格。
- UI 扫描只重画 HUD 层、取消 12 格上限、按受影响控件的包围盒裁切放大；"多背景扫描"把同一取值放在雪地亮场 / 夜晚暗场 / 茂密植被 / 高饱和 4 个场景各渲一格；也能扫描预设（皮肤家族排成网格）。
- chk.* 全部并入顶栏诊断下拉（对比度热区、色盲模拟、眯眼、安全区、触控热区、伪本地化、视距预览），与灰度 / 三级明度 / 剪影并列；三项旧诊断在含 UI 时的用法写进 title 提示。顶栏"可读性 ⚠ n"徽标点开是报告列表，每条带一键修复（打开文字底板、提高不透明度、翻转面板明度），走 setMany 可撤销；参数行内直接显示 ⚠（例如"雪地上文字对比 2.1 < 4.5"）。
- UI 模式下收藏标签换一套：喜欢——好读、层级清楚、和画面统一、有质感、干净、手感好、有个性；不喜欢——字太小、挡画面、太花、太素、太手游、不像我的游戏、看不出重点。动效类收藏存短循环 WebM。

**7.9 注册与 Godot**
- 注册方式：从 JSON 生成 ParamDef；ParamKind 增加 multi / gradient；增加 scope、activeWhen（数据式条件编译成函数）、fallback；覆盖键与元素实例键存在同一个 Values 对象里，配方 / 收藏 / localStorage 不需要新结构。
- Godot：全局视觉参数 → Theme（StyleBoxFlat / StyleBoxTexture / FontVariation / LabelSettings / 颜色常量），按组件覆盖 → type variation；结构参数 → Control 场景模板与锚点；元素画法 → 子场景；动效 → Tween / AnimationPlayer；空间内 → unproject_position 或 Sprite3D / Label3D / Decal；工具不导出，玩家选项导出成设置页。迁移难点按取值的 godotLevel 汇总（第 1.5 节）。

## 8. 覆盖率回归集

R2 随机编码了 88 条参考（IIG 34 款 66 屏、材质做法 10、对照图格子 12），v1 能完整写出 44 条。下表把每条的 v1 缺口和 v2 的对应写法并列。**v2 一列只说明"这个缺口现在有参数或取值可写"，不是重新看截图后的编码结果**；其中多数缺口是靠加取值补上的，这和 R2 批评的"自证式验证"是同一种风险。真正的覆盖率要用一批没见过的参考复测：建议 R2① 建卡时每批随机抽 30 条，用 v2 编码并记 unencoded，作为长期指标。

| 来源 | v1 完整 | v2（按缺口对照） |
|---|---|---|
| IIG | 35 / 66 | 66 / 66 |
| 材质 | 5 / 10 | 10 / 10 |
| 对照图 | 4 / 12 | 12 / 12 |
| 合计 | 44 / 88（50%） | 88 / 88（待复测） |

| 来源 | 条目 | v1 | v1 缺口 | v2 写法 |
|---|---|---|---|---|
| IIG | GRIS 菜单 | ✓ | — | — |
| IIG | Hades HUD | ◐ | 分段血条旁的数字 | elx.valueLabel = current（ex.hadesHud 已补） |
| IIG | Hades 资产屏 | ✓ | — | — |
| IIG | Hollow Knight HUD | ✓ | — | — |
| IIG | Hollow Knight 护符页 | ✓ | — | — |
| IIG | Witcher 3 HUD | ✓ | — | — |
| IIG | Witcher 3 炼金页 | ✓ | — | — |
| IIG | WoW HUD | ◐ | 团队框网格；目标头像框 | el.party.arrangement = grid；el.threat.form = targetFrame |
| IIG | WoW 任务面板 | ◐ | 部落徽记水印 | ast.watermark = factionEmblem |
| IIG | Control HUD | ◐ | 黄菱形与青血条两个色相 | col.accent2 + col.accent@el.<元素>（ex.controlHud 已补） |
| IIG | Control 资产屏 | ✓ | — | — |
| IIG | BotW 对话 | ◐ | 白色斜体 | typ.body.style / typ.display.style = italic |
| IIG | BotW 希卡石板 | ◐ | 白色斜体 | typ.display.style = italic + ctr.handheld |
| IIG | Elden Ring HUD | ◐ | 十字四向装备格 | el.abilities.arrangement = cross |
| IIG | Elden Ring 赐福菜单 | ✓ | — | — |
| IIG | Clair Obscur HUD | ◐ | 行动顺序头像列 | el.turnOrder |
| IIG | Clair Obscur 资产屏 | ✓ | — | — |
| IIG | Anno 1800 HUD | ◐ | 底部建造栏 | el.toolbar（layout.builder 已补） |
| IIG | Anno 1800 任务书 | ✓ | — | — |
| IIG | Frostpunk HUD | ◐ | 温度表盘、希望 / 不满条；仪表全局单选 | el.meter + cmp.gauge@el.meter（thermometer / bipolar） |
| IIG | Frostpunk 法典 | ✓ | — | — |
| IIG | Civ VI HUD | ◐ | 深蓝面板底色 | col.surface |
| IIG | Civ VI 伟人页 | ◐ | 白色浮雕头像 | cnt.characterRender = relief |
| IIG | Cities: Skylines HUD | ◐ | 信息视图同时有染色与图标 | el.overlay.form 多选（heatmap + statusIcons） |
| IIG | Cities: Skylines 里程碑页 | ✓ | — | — |
| IIG | XCOM 2 HUD | ◐ | 瞄准框 + 命中率；斜线阴影 | el.threat.form 多选（lockOn + hitChance）+ vis.pattern = hatching |
| IIG | XCOM 2 士兵页 | ◐ | 斜线阴影；军衔 V 形章 | vis.pattern = diagStripes + cmp.badge = chevron |
| IIG | Bad North 屏 1 | ✓ | — | — |
| IIG | Bad North 屏 2 | ✓ | — | — |
| IIG | Mini Metro 结算 | ✓ | — | — |
| IIG | Armello 事件卡 | ◐ | 只有标题条是撕边 | vis.edge@titleBar = torn |
| IIG | Armello 卡牌页 | ◐ | 绗缝纹 | vis.pattern = quilt |
| IIG | Stardew 屏 1 | ✓ | — | — |
| IIG | Stardew 屏 2 | ✓ | — | — |
| IIG | ACNH 屏 1 | ✓ | — | — |
| IIG | ACNH 屏 2 | ✓ | — | — |
| IIG | Don't Starve HUD | ✓ | — | — |
| IIG | Don't Starve 资产屏 | ◐ | 整屏红木纹底 | ast.bgArt = material + ast.bgMat = wood |
| IIG | No Man's Sky HUD | ✓ | — | — |
| IIG | No Man's Sky 列表页 | ◐ | 橙顶条与蓝选中两个色相 | col.accent2 / col.focus |
| IIG | Monument Valley 屏 1 | ✓ | — | — |
| IIG | Monument Valley 屏 2 | ✓ | — | — |
| IIG | Florence 屏 1 | ✓ | — | — |
| IIG | Florence 屏 2 | ✓ | — | — |
| IIG | Detroit 屏 1 | ✓ | — | — |
| IIG | Detroit 屏 2 | ✓ | — | — |
| IIG | Slay the Spire 战斗 | ◐ | 红色指向箭头；石质结束回合按钮 | el.crosshair.form = aimArrow + ast.coreMat@el.cta = stone（ex.sts2Combat 已补） |
| IIG | Slay the Spire 选卡页 | ◐ | 缎带形按钮 | vis.silhouette@button = ribbon |
| IIG | Hearthstone 金币奖励 | ✓ | — | — |
| IIG | Hearthstone 收藏册 | ◐ | 书放在木架上；木牌列表行 | ast.containerSurface = shelf + ast.frameMat@listRow = wood |
| IIG | NFS Heat HUD | ◐ | 蓝速度表与紫目标面板 | col.accent2 + col.accent@el.<元素> |
| IIG | NFS Heat 车库 | ✓ | — | — |
| IIG | Destiny 2 屏 1 | ✓ | — | — |
| IIG | Destiny 2 屏 2 | ✓ | — | — |
| IIG | Overwatch HUD | ◐ | 大招圆环 + 百分比（仪表已被分段血条占用） | cmp.gauge@el.abilities = ring + elx.valueLabel = percent |
| IIG | Overwatch 资产屏 | ✓ | — | — |
| IIG | Cyberpunk 2077 HUD | ◐ | 红 + 青双色 | col.accent2 |
| IIG | Cyberpunk 2077 资产屏 | ◐ | 红 + 青双色 | col.accent2 |
| IIG | RDR2 HUD | ◐ | 西部木刻粗衬线 | typ.display.family = slabWestern |
| IIG | RDR2 地图 | ✓ | — | — |
| IIG | MGSV iDroid | ✓ | — | — |
| IIG | MGSV 结算 | ◐ | 黑白照片底 | rel.sceneTone = mono |
| IIG | Black Myth HUD | ✓ | — | — |
| IIG | Black Myth 影神图 | ◐ | 书法 / 古画水印 | ast.watermark = calligraphy / faintPainting |
| IIG | Hi-Fi Rush HUD | ◐ | 锯齿血条；拟声字与评级并存 | vis.edge@el.vitals = jagged + el.feedback.form 多选 |
| IIG | Hi-Fi Rush 商店 | ◐ | 锯齿对话框 | vis.edge@dialog = jagged |
| 材质 | 木 0.0 | ✓ | — | — |
| 材质 | 纸 1.0 | ◐ | 纸内芯上的淡云纹底纹 | ast.core = texture（paper）+ vis.pattern = cloudTile |
| 材质 | 水墨 5.1 | ◐ | 选中项下垫毛笔笔触 | ix.focus = brushSwash |
| 材质 | 魔法阵 8.0 | ✓ | — | — |
| 材质 | 书 9.0 | ✓ | — | — |
| 材质 | 台面 10.1 | ✓ | — | — |
| 材质 | 场景 13.4 | ✓ | — | — |
| 材质 | 云纹 17.1 | ◐ | 低对比云纹水印、屏风折痕 | ast.watermark + ast.container = foldingScreen |
| 材质 | 金属 22.1 | ◐ | 金币堆 → 铁箱 → 金箱的档位美术 | ops.tierArt |
| 材质 | 平铺 26.5 | ◐ | 斜向重复文字底纹 | vis.pattern = repeatText |
| 对照图 | GameUI#1762374 | ◐ | 绿 / 蓝两个同级按钮 | col.semantic = greenBlue |
| 对照图 | GameUI#1009405 | ✓ | — | — |
| 对照图 | GameUI#572353 | ◐ | 折扇标题承载 | cmp.plate@title = fan |
| 对照图 | GameUI#559108 | ◐ | 带子里的重复文字底纹、涂鸦字 | vis.pattern = repeatText + typ.display.family = graffiti |
| 对照图 | GameUI#943704 | ✓ | — | — |
| 对照图 | GameUI#594229 | ✓ | — | — |
| 对照图 | GameUI#573460 | ◐ | 螺旋排布 | lay.arrangement = spiral |
| 对照图 | GameUI#556687 | ◐ | 浅绿外框 | vis.strokeColor = custom + col.border |
| 对照图 | GameUI#1511531 | ◐ | 滑条、开关、分段混在一页 | cmp.optionBool / optionEnum / optionRange |
| 对照图 | GameUI#573377 | ◐ | 键盘 / 鼠标键位示意图 | cmp.bindingMap |
| 对照图 | GameUI#445413 | ✓ | — | — |
| 对照图 | GameUI#462112 | ◐ | 重型工业金属框 | ast.frame = plainNinePatch + ast.frameMat = iron + ast.ornaments = rivets + vis.pattern = hazard（组合，不新增取值） |

## 9. 未决与风险

- **取值来自截图归纳**：不少取值只在一张对照图里出现过，R2 建卡时要补到每个取值 ≥ 3 款参考；标"经验"的参考是公开常识或经验值，未逐一核实；v2 新增的取值（锯齿、燕尾、温度计、眼睛、西部字、涂鸦……）多数只有 1–2 个参考。
- **覆盖率是按缺口对照估的**（第 8 节），需要用新的随机参考复测。
- **GameUI 对照图 id 只在本地看**：`GameUI#数字` 指向 `qa/refs-cache/` 的缩略图，按站方协议不分发；`sXXXX_n` 指 Steam 商店截图，同样只作本地学习。
- **参数更多了**：v2 有 257 个参数（v1 206），因为 R2 的缺口与 R1 的拆分都要新参数。面板靠页签、tier、生效条件折叠、元素检查器控制可见数量：设计参数进面板的 tier 1 + 2 共 118 个，按 7 个页签分摊。
- **生成器只实现了只依赖 UI 参数的派生规则**：依赖画面参数的规则（D-outline、D-paper、D-lightness……）只登记，矩阵校验里没跑；M3b 接入真实画面后要补跑。
- **组件形态与视觉语言相乘**：组合空间很大，M5a 控件库要按"结构 × 质感"拆实现，不能每个皮肤手画一套。
- **字体**：needs = font 的取值要补 OFL 字体；中文圆体、窄体、书法没有合适的 OFL 时要退到图片标题或回退字体；样例文案会让中文子集从 649 字膨胀，check:content 要报告子集体积。

## 10. 对路线图的影响

> 只给建议，不改 docs/ui-hud-plan.md。参数数量按 JSON 里每个参数的 milestone 字段统计（M8 的参数登记在 M8，这里按内容分到 M8a / M8b）。

### 10.1 为什么要调

- **先有解析核心，才能接参数**：计划里 M3 的"覆盖参数"假设 UI 参数是"皮肤 + 少量覆盖"。v2 的参数有作用范围、生效条件、覆盖键、多选合并、约束和四类派生规则，探索台需要先有分层解析器与数据驱动的注册（否则每接一组参数都要手写一遍 activeWhen 与读值），所以 M3 拆出 M3a 先做这件事。
- **素材依赖落到取值级**：设计参数的 1213 个取值里需素材 127、需字体 15、需场景 19。素材取值先画灰盒占位，版式探索不被 M11 卡住；M11 的内容按 15 套 UI 配方的"缺"列表排序，而不是一次全做完。
- **工具侧分出来了**：12 个工具项（chk.*）不进配方。其中对比度、眯眼、色盲、冗余检查是随机"只要可读"和 A/B 差异清单的前提，建议提前到 M5a 之后（M8a），其余（触控、安全区、伪本地化、特效遮挡、视距）留在后面（M8b）。
- **Godot 导出可以提前**：程序化外观（StyleBoxFlat 一类）在 M3a / M3b 后就稳定了，先导出能尽早核对每个取值的 godotLevel 标注；资产槽位导出（StyleBoxTexture / NinePatchRect）在 M3.5 增量补上。

### 10.2 建议的新顺序

- 计划：M0 → R1 → M1 → M2 → R2① → M3 → M3.5 → M11 → M4 → M5 → M6 → R2② → M7 → R3 → M8 → R2③④ → M9 → R4 → M10
- 建议：M0 ✓ → R1 ✓ → M1 ✓ → M2 ✓ → R2① → M3a → M3b → M4 → M3.5 → M11① → M5a → M8a → M5b → M6 → R2② → M7 → R3 → M8b → R2③④ → M9a → M9b → R4 → M10 → M11②
- M11① 保留计划里"M3.5 之后"的位置（2026-10-14 已批准），只是内容改为按缺口排序的第一批；仍按逐张清单批准后再生成。

| 里程碑 | 内容 | 接的参数数 | 依赖 | 验收 |
|---|---|---|---|---|
| **M3a** 解析核心 + 外观程序参数 | 从 ui-param-system.json 生成 ParamDef（scope / activeWhen / overrideAt / merge / tier / tab / preview / fallback），check:content 跑约束表与 OWNERS 校验（把本生成器的校验搬进仓库）；把 resolveTheme 推广成第 1.3 节的分层解析（默认类规则 → 预设各层 → 本屏覆盖 → 用户值 → 适配类 → 派生 → 兜底 → 无障碍），每个值带来源；先修两处已知问题：registry.num() 把 auto 读成 0、ParamRow 对 auto 得到 NaN；参数行显示"解析值 + 来源徽标 + ↺ 跟随"；顶栏"画面 \| UI"模式切换 + 7 个页签骨架 + 第一屏 10 个大旋钮；tier 3 收进"更多"，不生效的收进"当前不生效（n）"；接外观程序参数：vis.*（形、线、面）、col.*（色板角色）、typ.*（正文 / 标题 / 数字）、rel.harmony、hier.cta、lay.grid / lay.grouping；skin.greybox、skin.godotDefault 两个基线皮肤；字体补全（needs = font 的取值）：思源黑体加 300 / 900 两档字重，核对圆体候选（思源柔黑 / jf 粉圆）的简体覆盖与许可，拉丁哥特 / 模板字 / 西部 / 涂鸦 / 新艺术各选一款 OFL | 44 | M2 字体 | 14 个旧皮肤在新解析下逐像素不变；第一屏 10 个旋钮在 3 个皮肤上都生效；check:content 报出第 4.4 节反例里的 7 个矛盾 |
| **M3b** 预设层：皮肤 / 关键词 / 节日 / UI 感觉 / 从画面出发 | 38 个皮肤按 values / keyword / keywordDefaults / suggests 落地，补齐到 26 + 12；套用预设时提示"改写了上一层哪些键"；18 个关键词与 5 个节日（只接程序化能做的部分，素材部分先画灰盒）；11 条 UI 感觉（相对微调 + 术语）；默认类跟随规则 D-outline / D-toon / D-paper / D-boil / D-frame / D-lightness，rel.harmony = sameMedium 时升为适配类；"跟随当前画面"卡：43 套画面配方各给同一媒介 / 中性 / 刻意对比三个皮肤，applyRecipe 不再重置 hud.style；MOODS 增加 uiSkins / uiNudges；静态"状态陈列板"（常态 / 悬停 / 焦点 / 按下 / 禁用 / 选中 / 锁定 / 新 / 冷却），可截图、可 A/B；接 vis.motif / vis.ornament / vis.pattern / typ.titleFx / typ.direction / cmp.plate 的程序化取值 | 7 | M3a | 26 皮肤对照图各配参考截图；C-skin-core、C-keyword-dup 全过；风格图谱里 UI 缺口数下降 |
| **M4** Godot Theme 导出（提前到资产槽位之前） | 先导出程序化部分：StyleBoxFlat、FontVariation、LabelSettings、颜色常量、type variation（= 按组件覆盖的 @ 键）；用导出结果核对每个取值的 godotLevel 标注（builtin / shader / post / script / hard），标错的回写 JSON；skin.godotDefault 作为导出回归用例；验证脚本要求 HUD 成功标记 | 0 | M3b | 69 个旧组合 + 26 个皮肤变体通过且都有成功标记；"只看 Godot 内置能做的"开关在探索台可用 |
| **M3.5** 资产槽位（结构 × 材质） | 接 ast.core / ast.coreMat / ast.frame / ast.frameMat / ast.ornaments / ast.fx / ast.watermark / ast.bgArt 与 vis.edge；先程序化（R3 清单）：外框 procedural / 只有四角件 / 像素木框；内芯纸 / 宣纸 / 绢 / 全息；母题几何 / 括号 / 电路 / 星 / 符文；容器书 / 卷轴 / 手机；撕边、锯齿用遮罩；needs = asset 的取值一律画带字灰盒（"金色浮雕框 · 需素材 · M11"），不禁用，随机默认跳过 | 13 | M4 | 同一份菜单数据能换 3 种容器；单独替换一个槽位其余不变；灰盒占位在截图里可辨认 |
| **M11①** AI 生成素材第一批（位置不变，内容改为按缺口排序） | 保留计划里"M3.5 之后"的位置（已批准），但只做第 3.13 节 15 套 UI 配方 missing 列表里出现最多的那批：雕花九宫格（金 / 青铜 / 石）、平框（木 / 皮革）、角花与宝石饰件、缎带标牌、手绘与 3D 图标各一套；其余素材（立绘、徽章、空状态插画、手绘地图底图、书法标题）留到 M11②，每批仍按逐张清单批准后再生成 | — | M3.5 | 先报逐张清单，用户批准后再生成 |
| **M5a** 信息元素与组件（静态） | 32 个信息元素的画法（只剩轮廓与构成）+ 元素模板参数（screenAnchor / attachTo / arrangement / scale / priority / valueLabel）；cmp.*（按钮、页签、格子、卡牌、徽章、数值图形、标牌、对话框、设置控件）、st.*（静态状态，带视觉通道检查）；"全部控件展示"布局；元素检查器 + 画布点选（HudSystem 记录控件矩形）+ 拖动吸附九宫格 | 59 | M3.5 | 每个元素至少 2 种画法 × 3 皮肤对照图；在画布上点任一元素能打开它的参数 |
| **M8a** 可读性检查（前半，提前） | chk.contrast、chk.squint、chk.cvd、chk.redundancy、chk.minText、chk.coverage 读数：随机的"只要可读的结果"和 A/B 的差异清单都依赖它；顶栏"可读性 ⚠ n"徽标 + 一键修复（打开文字底板、提高不透明度、翻转面板明度），走 setMany 可撤销 | 7 | M5a | 雪地场景上的毛玻璃皮肤被标出；对比度计算有单元测试 |
| **M5b** 模拟与动效 | 确定性 HUD 模拟 + 时间轴 + 8 帧逐帧条带 + 缓动曲线 + 0.25× 慢放；事件按钮（受击 / 回血 / 拾取 / 升级 / 冷却 / 低血量）；mo.*、ix.press、st.cooldown / st.alert、rel.hudVisibility 与 elx.visibility 的"探索 / 战斗 / 静止"三联图；UI 的 A/B：同一帧两份解析结果、同步重放、差异清单、内容种子；UI 扫描只重画 HUD 并裁切放大 | 16 | M5a | 两次同步截图逐字节相同；A/B 两侧动效同步 |
| **M6** 空间内 / 叙事内 / 元 UI | 计划原内容 + elx.attachTo / elx.worldRender / elx.metaFx、rel.followPost（warp / stylize 改合成顺序）、vis.mapStyle / mapUnexplored（小地图烘焙） | 11 | M5b | 计划原验收 + 同一游戏不同元素用不同世界渲染（Dota：公告板 + 贴花 + 描边） |
| **M7** 品类布局 ① | 计划原内容 + lay.hudOrg / lay.playfield；新增的独立热门布局优先：割草、魂类、殖民模拟、塔防、类银河城；ctx.players = split（多视口 × 后处理 × HUD）放在本里程碑末尾 | 5 | M6 | 每个布局 × 3 皮肤对照图，各配参考截图 |
| **M8b** 可读性检查（后半） | chk.touch、chk.safeArea、chk.overflow（伪本地化）、chk.fxOcclusion、chk.viewDistance；玩家选项 a11y.* 与 3 个无障碍叠加预设 | 10 | M7 + R3 | 触屏布局通过触控尺寸检查；大字叠加下无截断 |
| **M9a** 界面模板（静态骨架） | lay.container / composition / arrangement / nav / detail / overflow、版式预设 6、容器预设 6、cnt.subtype（parent / layer）/ screen / stage / dataState；63 个模板按 audience 排序：先做买断 / 通用（三选一、本局总结、路线图、存档、按键绑定、暂停、背包、对话），手游专属（抽卡、通行证、签到、首充）后做 | 43 | M8b | 每种界面 × 3 皮肤对照图；商业模式 = 买断时模板列表先显示 PC / 主机界面 |
| **M9b** 流程与运营 | ix.dismiss / confirm / continueCue / skip / guideForce、flow.*、mo.reveal / reward / transition、chk.demo；流程分镜条 + 交互注释层；运营组 ops.* 放在最后，买断制默认隐藏整页 | 27 | M9a | 抽卡、升级、三选一、购买四段流程能一键演示并录成逐帧条带 |
| **M10** 输入方式与画幅 | D-input / D-orient / D-aspect 适配类规则、ix.glyphs 图标集、ix.focus 焦点移动、ix.touchSize、lay.safeMargin、cmp.bindingMap | 10 | M9b + R4 | 三种输入 × 3 个品类对照图；竖屏下侧页签自动变底部页签 |
| **M11②** AI 生成素材其余批次 | 立绘、徽章、空状态插画、手绘 / 羊皮纸地图底图、书法标题、图标集补全；按逐张清单批准 | — | 按需 | 同上 |

### 10.3 每个里程碑接哪些参数

按参数的 milestone 字段生成（M8 的工具项已按内容分到 M8a / M8b）。

| 里程碑 | 参数数（设计 / 其它） | 含需素材取值的参数 | 参数 |
|---|---|---|---|
| M2 | 2（2 / 0） | 0 | ctx.locale、typ.body.family |
| M3a | 44（43 / 1） | 1 | lay.grouping、lay.grid、hier.cta、vis.corner、vis.cornerSize、vis.skew、vis.jitter、vis.opacity、vis.fill、vis.blur、vis.stroke、vis.strokeWidth、vis.strokeColor、vis.strokeSides、vis.strokeGlow、vis.depth、vis.gloss、vis.pixelScale、col.source、col.lightness、col.surface、col.surface2、col.text、col.accent、col.accent2、col.focus、col.border、col.gradient、col.strategy、col.semantic、col.saturation、typ.body.weight、typ.body.case、typ.body.tracking、typ.body.style、typ.display.family、typ.display.weight、typ.display.case、typ.display.tracking、typ.display.style、typ.baseSize、typ.scale、typ.legibility、rel.harmony |
| M3b | 7（7 / 0） | 4 | vis.pattern、vis.patternOpacity、vis.ornament、vis.motif、typ.titleFx、typ.direction、cmp.plate |
| M4 | 0（0 / 0） | 0 |  |
| M3.5 | 13（13 / 0） | 12 | vis.edge、ast.core、ast.coreMat、ast.frame、ast.frameMat、ast.ornaments、ast.fx、ast.container、ast.containerSurface、ast.bgArt、ast.bgMat、ast.watermark、ast.watermarkOpacity |
| M11 | 3（3 / 0） | 3 | vis.iconStyle、ast.iconSet、cmp.badge |
| M5a | 59（59 / 0） | 2 | cnt.elements、cnt.density、cnt.itemCount、cnt.textLength、lay.columns、hier.inline、hier.dimInactive、vis.silhouette、col.coding、col.rarityScale、col.teams、typ.numerals.family、typ.numerals.style、typ.numbering、cmp.button、cmp.buttonBox、cmp.tab、cmp.tabIndicator、cmp.listRow、cmp.slot、cmp.gauge、cmp.dialogBox、st.rarityCue、st.emptySlot、st.selected、elx.arrangement、elx.scale、elx.priority、elx.valueLabel、elx.valueLabelPos、el.vitals.count、el.resources.form、el.abilities.form、el.objective.form、el.interact.form、el.threat.form、el.feedback.form、el.notify.form、el.timer.form、el.crosshair.form、el.selection.form、el.party.form、el.clock.form、el.overlay.form、el.prompt.form、el.cta.form、el.title.form、el.reward.form、el.cost.form、el.rank.form、el.profile.form、el.loading.form、el.guide.form、el.chat.form、el.gameSpeed.form、el.meter.form、el.toolbar.form、el.turnOrder.form、el.choices.form |
| M8a | 7（1 / 6） | 0 | hier.emphasis、chk.contrast、chk.cvd、chk.redundancy、chk.minText、chk.squint、chk.coverage |
| M5b | 16（16 / 0） | 0 | ctx.timeModel、ctx.turnTimer、col.dynamic、rel.hudVisibility、mo.enter、mo.duration、mo.easing、mo.textReveal、mo.idle、mo.valueChange、mo.juice、mo.frameRate、ix.press、st.cooldown、st.alert、elx.visibility |
| M6 | 11（11 / 0） | 1 | vis.mapStyle、vis.mapUnexplored、rel.diegesis、rel.followPost、rel.metaFx、rel.worldRender、elx.diegesis、elx.attachTo、elx.worldRender、elx.metaFx、el.minimap.form |
| M7 | 5（5 / 0） | 0 | ctx.players、lay.hudOrg、lay.playfield、rel.semanticZoom、elx.screenAnchor |
| M8b | 10（0 / 10） | 0 | a11y.uiScale、a11y.textScale、a11y.highContrast、a11y.reduceMotion、a11y.reduceTransparency、a11y.cvdPreset、chk.touch、chk.safeArea、chk.overflow、chk.fxOcclusion |
| M9a | 43（43 / 0） | 4 | cnt.subtype、cnt.screen、cnt.layer、cnt.dataState、cnt.dataShape、cnt.focal、cnt.characterMedium、cnt.companion、cnt.characterRender、cnt.tone、lay.container、lay.panelSize、lay.composition、lay.focalSide、lay.arrangement、lay.nav、lay.navDepth、lay.detail、lay.preview、lay.layering、lay.overflow、lay.pageIndicator、lay.pinned、rel.behind、rel.dim、rel.sceneBlur、rel.sceneTone、cmp.card、cmp.modal、cmp.quantity、cmp.optionBool、cmp.optionEnum、cmp.optionRange、cmp.input、cmp.node、st.delta、st.statViz、st.rank、st.emptyList、st.locked、st.done、st.newCue、st.statusMark |
| M9b | 27（26 / 1） | 1 | cnt.stage、mo.reveal、mo.revealTease、mo.reward、mo.transition、ix.mode、ix.confirm、ix.dismiss、ix.close、ix.continueCue、ix.blocking、ix.skip、ix.skipAnchor、ix.guideForce、flow.entry、flow.stacking、flow.depth、flow.chrome、flow.navPersistent、ops.density、ops.badges、ops.actions、ops.poster、ops.entries、ops.compliance、ops.tierArt、chk.demo |
| M10 | 10（9 / 1） | 3 | ctx.orientation、ctx.aspect、ctx.device、ctx.input、lay.safeMargin、ix.focus、ix.glyphs、ix.touchSize、cmp.bindingMap、chk.viewDistance |

### 10.4 哪些先做、哪些依赖素材、哪些属于工具侧

- **先做（程序化即可，不等素材）**：外观组 vis / col / typ 的绝大多数取值、版式与内容组、组件结构、状态编码、动效与交互、流程——它们的取值 needs 都是 canvas / sim / flow。
- **部分取值依赖素材**（31 个参数，素材取值先画灰盒）：`cnt.characterMedium`、`cnt.companion`、`vis.edge`、`vis.pattern`、`vis.motif`、`vis.iconStyle`、`vis.mapStyle`、`typ.display.family`、`typ.titleFx`、`ast.core`、`ast.coreMat`、`ast.frame`、`ast.frameMat`、`ast.ornaments`、`ast.fx`、`ast.container`、`ast.containerSurface`、`ast.iconSet`、`ast.bgArt`、`ast.bgMat`、`ast.watermark`、`ix.focus`、`ix.glyphs`、`cmp.card`、`cmp.badge`、`cmp.plate`、`cmp.bindingMap`、`st.emptyList`、`ops.tierArt`、`el.title.form`、`el.reward.form`。
- **全部取值都依赖素材**（0 个，未出素材前整项只有灰盒）：无。
- **依赖字体**：`ctx.locale`、`typ.body.family`、`typ.body.weight`、`typ.display.family`、`typ.display.weight`、`ast.iconSet`（M3a 字体补全）。
- **依赖场景渲染 / 世界空间**（M6 起）：`ctx.players`、`cnt.characterMedium`、`vis.mapStyle`、`ast.iconSet`、`ast.bgArt`、`rel.worldRender`、`elx.worldRender`、`el.minimap.form`。
- **工具侧**（不进配方）：`chk.contrast`（M8a）、`chk.cvd`（M8a）、`chk.redundancy`（M8a）、`chk.minText`（M8a）、`chk.touch`（M8b）、`chk.safeArea`（M8b）、`chk.overflow`（M8b）、`chk.fxOcclusion`（M8b）、`chk.squint`（M8a）、`chk.viewDistance`（M10）、`chk.coverage`（M8a）、`chk.demo`（M9b）。
- **Godot 难迁移、建议标"网页可做 / Godot 困难"**：`vis.depth = soft3d`、`typ.direction = verticalAll`；需要后处理 / 改合成顺序：`rel.followPost = warp`、`rel.followPost = stylize`、`rel.followPost = full`、`rel.metaFx = hurtVignette`、`rel.metaFx = lowHpDesat`、`rel.metaFx = hitFlash`、`rel.metaFx = speedLines`、`rel.metaFx = nightVision`、`rel.metaFx = edgeGlow`、`rel.metaFx = glitch`、`st.alert = fullAlarm`。

### 10.5 研究轨

- R2① 建卡：参考卡直接用 v2 参数值标注（第 3.12 节格式），每张卡带 unencoded[]；每批随机抽 30 条做覆盖率回归，指标长期跟踪（R2 建议）
- R3 玩家评价：常见 UI 抱怨清单直接对应 chk.* 检查项与 UI 感觉微调（"字太小" → ui.readable）
- R4 手机：喂给 M10 的 D-input / D-orient 与 platform.phone* 预设

### 10.6 如果采纳，计划文档要改的地方

- "拆解：游戏 UI 的 8 个维度"表 → 指向本文第 1.6 节的 18 组与 7 个页签；"皮肤 = 预设 + 覆盖"一段 → 第 1.3 节的分层解析与各层拥有的参数组。
- 里程碑表：M3 拆 M3a / M3b，M5 拆 M5a / M5b，M8 拆 M8a / M8b，M9 拆 M9a / M9b；M4 移到 M3b 之后；M11 拆成按缺口排序的两批。
- 验证方式：check:content 增加约束表、OWNERS、C-skin-core、C-keyword-dup、反例测试，以及"模板 / 布局 × 平台 × 皮肤"矩阵。

## 11. 审稿意见处理

三份审稿共 87 条：采纳 77、部分采纳 10、不采纳 0。部分采纳的条目在"处理"一栏写明哪部分没照做、为什么。

### 11.1 部分采纳 / 不采纳的理由

- **R1-03**（数值图形词表重复 6 份）：只留 cmp.gauge，补 track / fraction / percent / stars / lightUp（另加 R2 的温度计、眼睛、双向条）；st.progress 改为 cmp.gauge@progress；el.vitals.form 删掉，条数改为 el.vitals.count，镜像交给 D-players。命名上没有用 el.<x>.gauge，而是 cmp.gauge@el.<x>——与"按组件覆盖"同一套 @ 机制，少一套键规则。
- **R1-07**（程序 / 素材主从不闭合）："程序 / 素材"只在 ast 一侧判定；vis.fill 删 illustrated（→ ast.core = illustration）；vis.stroke 删 ornamental（→ 外框素材结构 + 母题）；ast.frame 删 none；转角 / 圆角 activeWhen 外框 = 程序，描边 activeWhen 外框 = 程序或只有四角件；vis.fill activeWhen 内芯 = 程序。没照做的一处：笔触边（brush）没有并进外框结构，而是放进新参数 vis.edge——笔触边可以用遮罩作用在任何外框（纸框、程序框）上，做成第 5 种外框结构反而要和材质再组合一遍。
- **R1-09**（皮肤 / 关键词 / 节日三层重名且越界）：三层按参数组分工并由生成器强制（OWNERS 表）；节日只能改强调色、母题、特效、饰件；越界键移到品类布局 / 界面模板，或放进皮肤的 suggests（默认不套用）；skin.device 移到容器预设 ctr.handheld；关键词里的气质词（治愈、极简、恐怖、军事、复古像素）并入皮肤或改成 UI 感觉微调。与原建议的两处不同：①重名没有删 id，而是"皮肤只留形与面 + 引用一个关键词"（skin.wa → kw.wafu、skin.candy → kw.toy、skin.ink → kw.ink……），hud.style 的 id 全部保留；生成器另加 C-keyword-dup 检查，皮肤内嵌的材质值与某个关键词重合 ≥ 75% 就报错。②标题字族和强调色允许皮肤给默认、关键词覆盖——R3 要求皮肤必须给齐外观核心键（含标题字），只让关键词拥有标题字会让大部分皮肤没有标题字。
- **R1-11**（"全局"参数被模板按屏写不同值）：作用范围改四档：global / globalScreen（全局，可逐屏覆盖）/ screen / element；模板只能写 globalScreen 及以下，写全局参数时在解析里排到皮肤之后；多选参数声明合并方式（col.coding、ops.badges、ops.actions、ast.fx、ast.ornaments、rel.metaFx = 并集；cnt.elements、cmp.listRow = 替换）。模板里的纯皮肤键挪到显式字段 accent，但语义取 R3 的"只在皮肤与关键词没给值时补上"，而不是"覆盖"——否则科幻皮肤也会被章节卡模板改成书法标题（R3 指出的泄漏）。
- **R1-21**（标题字造型混了字族 / 字重 / 字距 / 大小写）：改成"角色 × 属性"：typ.body.* 与 typ.display.* 各有 family / weight / case / tracking / style；数字角色只设 family / style（没有找到数字需要独立字重或字距的参考，按需再加）。display.family 用字族词表；R1 列的 sansItalic 改为 sans + typ.display.style = italic（R2 同时要求斜体是独立属性）；cartoon3d = round + titleFx = emboss。
- **R1-34**（对话框 / 字幕 / 聊天 / 选项重复）：el.subtitle.form 删掉（字幕用 cmp.dialogBox@el.subtitle）；cmp.dialogBox 只留 bar / bubble / bare / chatThread / fullPage；el.chat.form 只留 collapsed / lines / bubbles。cmp.choice 没有改成"只留排布 {column, row, ring, world}"，而是改成新的信息元素 el.choices：排布用 elx.arrangement、浮在世界里用 elx.diegesis、轮廓用 vis.silhouette@el.choices——照原建议会出现第四份排布词表，且 world 是放置方式，正是 R1 自己要求移出画法的那类词。
- **R1-38**（图标来源 × 风格；地图画风归属）：加兼容约束 C-iconFont / C-iconRender / C-iconProc；textOnly 移出图标风格；cnt.mapRender → vis.mapStyle，小地图读同一参数，roomGrid 删；fog → vis.mapUnexplored。ast.iconSet 保留 4 个来源（procedural / font / asset / runtimeRender），比建议多留了"图标字体"：它不需要生成，又是 Godot 可直接用的真实来源，删掉后线性图标只能等素材。
- **R2-05**（元素画法单选）：目标、交互、威胁、反馈、通知、准星、叠层、按键提示、名次 9 个元素的画法改成有序多选（第一个是主画法）；生命、资源、按钮等仍是单选——它们的"第二种画法"在参考里都是另一个量（蓝条、大招）或另一个元素，用条数或数值标注表达更准确。
- **R2-13**（字族与标题承载长尾）：typ.display.family 加 slabWestern / graffiti / artNouveau；cmp.plate 加 fan / swallowtail。撕边横幅没有单列：= cmp.plate@title = ribbon + vis.edge@plate = torn。
- **R2-14**（螺旋 / 十字；容器叠容器；屏风；工业框）：lay.arrangement 加 spiral / cross；新增 ast.containerSurface（书桌 / 木架 / 桌面）而不是把容器改多选；ast.container 加 foldingScreen。工业金属框没有加成外框取值：v2 外框只表示结构，工业框 = plainNinePatch + iron + 饰件 rivets + 图案 hazard，加成取值就退回了 R1 批评的"成品组合"。

### 11.2 逐条处理

**R1 正交性**

| 编号 | 对象 | 严重度 | 结论 | 处理 |
|---|---|---|---|---|
| R1-01 | 参数 schema：activeWhen / excludes / implies / derivedFrom | high | 采纳 | 每个参数加机器字段 activeWhen（条件语法见 1.4）、derivedFrom、overrideAt、merge；约束表（第 4.4 节）分 check / imply 两类；生成器对每个预设、每个参考验证、每套 UI 配方、以及"模板 × 平台 × 皮肤"全组合跑约束，违例即报错；另用 v1 的 7 个自相矛盾组合做反例测试，确认都会被拦下；C-dup 检查"同一件事写两遍"（模板与它引用的版式 / 容器预设、皮肤与它引用的关键词）。 |
| R1-02 | el.*.form 混入位置 / 放置 / 排布 | high | 采纳 | 所有画法删掉位置词、叙事内变体和排布词；新增 elx.arrangement（复用 lay.arrangement 词表）、elx.attachTo（世界挂点）；例 el.vitals = onBody → elx.diegesis = diegetic + elx.attachTo = player。el.cta.form 只剩 wide / round / dual / shutter。 |
| R1-03 | 数值图形词表重复 6 份 | high | 部分采纳 | 只留 cmp.gauge，补 track / fraction / percent / stars / lightUp（另加 R2 的温度计、眼睛、双向条）；st.progress 改为 cmp.gauge@progress；el.vitals.form 删掉，条数改为 el.vitals.count，镜像交给 D-players。命名上没有用 el.<x>.gauge，而是 cmp.gauge@el.<x>——与"按组件覆盖"同一套 @ 机制，少一套键规则。 |
| R1-04 | lay.archetype 不是一个维度 | high | 采纳 | 改名 lay.container，只留 none / overlay / banner / modal / drawer / sheet / tray / fullscreen / window；none 严格表示不画 UI，约束 none ⇒ cnt.elements 为空；masterDetail / gallery / mapMain / fan / radial / poster 改成第 3.8 节"版式预设"；diegetic / worldFloat 删掉；hud 删掉（D-container 推出 overlay）。tpl.codex 改成"屏幕叠加 + 手账容器"。 |
| R1-05 | lay.coverage 可推出；cmp.modal 与容器冲突 | high | 采纳 | lay.coverage 改为工具读数 chk.coverage；新增 lay.panelSize（只在 modal / drawer / sheet / banner 生效，0–1 = 该容器允许区间）；cmp.modal 只留 standard / floating，其余由 lay.container 与 lay.playfield = pip 表达。 |
| R1-06 | "无底"有 6–7 种写法 | high | 采纳 | 只由 vis.opacity 决定（0 = 无底）；删 vis.fill = none、col.lightness = clear、lay.hudOrg = floating；col.lightness 只留 light / mid / dark 且 activeWhen opacity > 0；cmp.modal = floating 蕴含 vis.opacity@modal = 0；无底且背后是实时画面时 D-lightness-text 补可读辅助，约束 C-legibility 检查。 |
| R1-07 | 程序 / 素材主从不闭合 | high | 部分采纳 | "程序 / 素材"只在 ast 一侧判定；vis.fill 删 illustrated（→ ast.core = illustration）；vis.stroke 删 ornamental（→ 外框素材结构 + 母题）；ast.frame 删 none；转角 / 圆角 activeWhen 外框 = 程序，描边 activeWhen 外框 = 程序或只有四角件；vis.fill activeWhen 内芯 = 程序。没照做的一处：笔触边（brush）没有并进外框结构，而是放进新参数 vis.edge——笔触边可以用遮罩作用在任何外框（纸框、程序框）上，做成第 5 种外框结构反而要和材质再组合一遍。 |
| R1-08 | ast.frame 是成品组合 | high | 采纳 | 建共用材质表（R1 列的 16 种 + 线描 lineArt，用于 Hollow Knight 式白线花饰，原表没有"无材质的线条"）；ast.frame 只留 procedural / plainNinePatch / carvedNinePatch / cornersOnly；ast.coreMat / ast.frameMat / ast.bgMat 引用材质表；素材提示词 = 结构 × 材质 × 母题 × 装饰预算；像素木框由像素化推出，卡牌金框由 st.rarityCue = border 驱动。 |
| R1-09 | 皮肤 / 关键词 / 节日三层重名且越界 | high | 部分采纳 | 三层按参数组分工并由生成器强制（OWNERS 表）；节日只能改强调色、母题、特效、饰件；越界键移到品类布局 / 界面模板，或放进皮肤的 suggests（默认不套用）；skin.device 移到容器预设 ctr.handheld；关键词里的气质词（治愈、极简、恐怖、军事、复古像素）并入皮肤或改成 UI 感觉微调。与原建议的两处不同：①重名没有删 id，而是"皮肤只留形与面 + 引用一个关键词"（skin.wa → kw.wafu、skin.candy → kw.toy、skin.ink → kw.ink……），hud.style 的 id 全部保留；生成器另加 C-keyword-dup 检查，皮肤内嵌的材质值与某个关键词重合 ≥ 75% 就报错。②标题字族和强调色允许皮肤给默认、关键词覆盖——R3 要求皮肤必须给齐外观核心键（含标题字），只让关键词拥有标题字会让大部分皮肤没有标题字。 |
| R1-10 | resolve 顺序 / 派生规则语义 | high | 采纳 | 派生规则分四类：默认类（预设之前，只填空）、适配类（预设与用户值之后变换，只有用户手动值能挡住：D-orient、D-input、D-players、D-pixel、D-aspect、D-skew）、纯派生、无障碍（优先于一切）。每类预设声明拥有的参数组，按组取值；屏幕类预设写到皮肤也拥有的键时推迟到节日之后作为本屏覆盖。D-style-material 删掉，改成第 3.14 节"题材（CULTURES）→ 关键词"对照表。生成器里实现了只依赖 UI 参数的规则，并在第 4.5 节给出 D-orient 在"手机竖屏 + 背包模板"上生效的解析轨迹。 |
| R1-11 | "全局"参数被模板按屏写不同值 | high | 部分采纳 | 作用范围改四档：global / globalScreen（全局，可逐屏覆盖）/ screen / element；模板只能写 globalScreen 及以下，写全局参数时在解析里排到皮肤之后；多选参数声明合并方式（col.coding、ops.badges、ops.actions、ast.fx、ast.ornaments、rel.metaFx = 并集；cnt.elements、cmp.listRow = 替换）。模板里的纯皮肤键挪到显式字段 accent，但语义取 R3 的"只在皮肤与关键词没给值时补上"，而不是"覆盖"——否则科幻皮肤也会被章节卡模板改成书法标题（R3 指出的泄漏）。 |
| R1-12 | "本屏怎么结束"散在 5 个参数 | high | 采纳 | 新增主参数 ix.dismiss（button / tapOutside / tapAnywhere / key / timed / forced；R1 写的 auto 与"跟随"的 auto 重名，改名 timed）；ix.blocking 改为纯派生；ix.close 只管控件样子与位置；ix.continueCue activeWhen dismiss ∈ {tapAnywhere, key, timed}；ix.mode 删 tapAnywhere；banner 描述删"自动消失"；ix.guideForce 只留 none / soft / forced。 |
| R1-13 | "不显示"有五种写法 | medium | 采纳 | 元素有没有只看 cnt.elements；各画法里的 none 全删；rel.hudVisibility 删 diegeticOnly，hidden 只作电影模式总开关；elx.visibility 删 hidden；约束 C-none-empty。 |
| R1-14 | 背后处理与压暗 / 模糊 / 黑场重复 | medium | 采纳 | rel.backdrop → rel.behind（live / frozen / replaced）；压暗与虚化是两个连续量 rel.dim / rel.sceneBlur；flow.stacking 删 dimBelow；ast.backdrop → ast.bgArt 并加 solid；lay.focalSide 删 background。另按 R2 加 rel.sceneTone。 |
| R1-15 | 构图与主体位置重复 | medium | 采纳 | lay.composition 只留 single / splitLR / splitTB / three / diagonalSplit；对称性由 lay.focalSide 表达；镜像由 ctx.players = versus 派生；lay.focalSide activeWhen 主视觉 ≠ none。 |
| R1-16 | 强调手段与色彩策略 / 按钮配色重复 | medium | 采纳 | col.semantic 只给按钮角色分配色相（删 monoShape）；hier.cta 只留 equal / color / size / fillOutline；hier.emphasis 改为作用在主元素上的"强调配方"（size / color / value / glow / typeface / isolation），由 D-emphasis 输出到 elx.scale、hier.dimInactive、ast.fx@元素、col.accent@元素；约束 C-emphasis-mono。 |
| R1-17 | 色彩策略与编码 / 来源重复 | medium | 采纳 | 明确 col.strategy 只约束骨架色；multi → polychrome；fullColor → col.source = illustration；删 col.rarityScale.starsMono、col.dynamic.alert、vis.strokeColor.rarity。 |
| R1-18 | 装饰量总闸与饰件多选冲突 | medium | 采纳 | 保留 vis.ornament 作装饰预算；约束 C-ornament0；D-ornament 在预算 ≥ 2 而饰件未定时按母题派生；cnt.density 的描述去掉"装饰数量"。 |
| R1-19 | glow 出现在 6 个参数 | medium | 采纳 | vis.depth 删 glow；面板外发光只在 ast.fx；描边发光 = vis.stroke = solid + 新增 vis.strokeGlow；其余改名 textGlow / titleGlow / focusGlow / rarityGlow。 |
| R1-20 | 描边线型里塞粗细；形状枚举是同一半径的刻度 | medium | 采纳 | vis.stroke 只留 none / solid / double / dashed，粗细只由 strokeWidth 给；vis.shape 拆成 vis.corner（sharp / round / chamfer / step）+ vis.cornerSize（短边百分比，50% = 胶囊）+ vis.edge；organic → vis.jitter；pixelStep 由像素化推出；圆 / 菱 / 六边 / 盾移到 vis.silhouette。 |
| R1-21 | 标题字造型混了字族 / 字重 / 字距 / 大小写 | medium | 部分采纳 | 改成"角色 × 属性"：typ.body.* 与 typ.display.* 各有 family / weight / case / tracking / style；数字角色只设 family / style（没有找到数字需要独立字重或字距的参考，按需再加）。display.family 用字族词表；R1 列的 sansItalic 改为 sans + typ.display.style = italic（R2 同时要求斜体是独立属性）；cartoon3d = round + titleFx = emboss。 |
| R1-22 | 标牌散在 6 处 | medium | 采纳 | 合并为 cmp.plate，按角色 @title / @name / @rank / @button / @stateTag 覆盖；ast.ornaments 删 seal；st.done = ribbon → tag + cmp.plate@stateTag；约束 C-sideTab（竖排侧牌蕴含标题竖排）。另加 tab（名牌条）与 R2 的 fan / swallowtail。 |
| R1-23 | "斜"与"像素"各分在多个参数 | medium | 采纳 | lay.grid 删 diagonal / pixel；typ.direction 删 diagonal；lay.composition.diagonal → diagonalSplit；vis.pixelScale 是唯一的像素主参数，转角 = step 由 D-pixel / C-pixel-step 推出；rel.followPost 删 pixel。 |
| R1-24 | 动效词表重复 | medium | 采纳 | mo.panelIn → mo.enter；mo.transition 只留跨屏特有的（另加 useEnter 表示"用入场动效"）；删 mo.easing.stepped；mo.idle 只留 none / shine / float / sway；脉冲按用途分到 st.newCue / el.guide；elx.motion 删掉，改成 mo.idle@el / mo.valueChange@el / mo.juice@el；mo.reveal 删 pillar，rarityTease 改为开关 mo.revealTease。 |
| R1-25 | ast.fx 与 rel.metaFx 越界 | medium | 采纳 | ast.fx 限定为附着在 UI 元件上的层（删 grain；halftone 并入 vis.pattern）；metaFx 只留状态触发的 7 种，删 letterbox / crtFrame（改读画面参数）；el.vitals.edgeRed、el.feedback.flashShake 删掉，改为元素 diegesis = meta 时用 elx.metaFx 选一项。 |
| R1-26 | worldMarkers 全局单选；anchor 内部混合 | medium | 采纳 | elx.anchor 拆成 elx.screenAnchor（九宫格）与 elx.attachTo（世界挂点）；rel.worldMarkers → rel.worldRender（全局默认）+ elx.worldRender（逐元素）；projected2d 删掉。 |
| R1-27 | HUD 组织 / 玩法区 / 画幅重复 | medium | 采纳 | ctx.orientation 只留横 / 竖，新增 ctx.aspect；boxed / centerColumn / boardWindow 归 lay.playfield；lay.hudOrg 只留 scattered / console / edgeBar / inMargin（inMargin 用约束 C-inMargin 要求玩法区不是全屏）；playfield.split 由 ctx.players 推出。 |
| R1-28 | 界面类型与子功能重复；浮层被压成一层 | medium | 采纳 | cnt.subtype 每个取值带 parent / layer，基础界面子功能推出 cnt.screen（D-screen）；新增 cnt.layer；确认、提示、大字提示、升级、奖励、引导、章节卡、记分板、拍脸、红包、公告、选服、起名改为浮层；cnt.stage 只留 6 个阶段；新增 cnt.dataState 驱动 st.emptyList / st.locked。 |
| R1-29 | 数据结构混入排布；角色呈现混两件事 | medium | 采纳 | cnt.dataShape 改纯语义 11 值；lay.arrangement activeWhen 集合 / 层级 / 网络 / 序列；lay.columns 只表示网格列数；cnt.character 拆成 cnt.characterMedium（activeWhen 主视觉 = 角色）与 cnt.companion；地图主视觉由 dataShape = spatial 推出；el.profile.form 删 power。 |
| R1-30 | 导航混了分区 / 翻页 / 排布；轮盘出现 5 次 | medium | 采纳 | lay.nav 只留分区导航 7 值；翻页指示移到 lay.pageIndicator；stack 删；ops.entries 删 leftTabs；flow.chrome.globalNav → flow.navPersistent；轮盘只在 lay.arrangement = ring；ix.mode 合并为 select，滑动由 D-input 推出。 |
| R1-31 | 详情呈现与叠层 / 弹窗 / 书容器重复 | medium | 采纳 | lay.detail 改为 none / inline / persistent / transient；spread 删（C-book 蕴含）；livePreview → lay.preview；flow.stacking 删 beside。 |
| R1-32 | 状态编码互相冲突 | medium | 采纳 | 给锁定 / 空槽 / 完成 / 冷却 / 选中的每个取值标视觉通道，C-st-channels 检查两两不撞车；fog 移到 vis.mapUnexplored；已读未读只归 st.newCue；新增 st.selected，ix.focus 只留导航光标；el.interact.form 删 ghost；el.rank.form 只留 badge / number / letter / stars / medal。 |
| R1-33 | 小组件轮廓词表各自重列 | medium | 采纳 | 唯一轮廓词表 vis.silhouette，按组件覆盖（@slot / @icon / @avatar / @badge / @minimapFrame / @button / @tab / @el.*）；cmp.slot 只留 cell / tallCard / rowCard / bare；cmp.tab 改为内容 + cmp.tabIndicator；cmp.button 改为内容 + cmp.buttonBox；cmp.avatar、vis.iconFrame 删掉；price 删掉。 |
| R1-34 | 对话框 / 字幕 / 聊天 / 选项重复 | medium | 部分采纳 | el.subtitle.form 删掉（字幕用 cmp.dialogBox@el.subtitle）；cmp.dialogBox 只留 bar / bubble / bare / chatThread / fullPage；el.chat.form 只留 collapsed / lines / bubbles。cmp.choice 没有改成"只留排布 {column, row, ring, world}"，而是改成新的信息元素 el.choices：排布用 elx.arrangement、浮在世界里用 elx.diegesis、轮廓用 vis.silhouette@el.choices——照原建议会出现第四份排布词表，且 world 是放置方式，正是 R1 自己要求移出画法的那类词。 |
| R1-35 | 运营密度总闸；价格重复 | medium | 采纳 | ops.density 改为由角标、入口、红点算出的读数（不进面板）；价格统一进 el.cost.form，删 ops.price 与 el.resources.haveNeed；ops.badges 拆出 ops.actions。 |
| R1-36 | rel.harmony 是规则开关 | low | 采纳 | 归为"解析设置"，与原子参数分开计数；col.source 默认由它派生（可手动覆盖）；D-harmony 不再控制 D-palette；stylize 用约束 C-stylize 要求放置方式不是屏幕叠加。 |
| R1-37 | ctx.input.none / timeModel 屏级取值 | low | 采纳 | 删 ctx.input = none（→ ix.mode = readOnly）；ctx.timeModel 只留 realtime / pausable / rtwp / turn，新增 ctx.turnTimer；"无时间压力"由界面类型推出。 |
| R1-38 | 图标来源 × 风格；地图画风归属 | low | 部分采纳 | 加兼容约束 C-iconFont / C-iconRender / C-iconProc；textOnly 移出图标风格；cnt.mapRender → vis.mapStyle，小地图读同一参数，roomGrid 删；fog → vis.mapUnexplored。ast.iconSet 保留 4 个来源（procedural / font / asset / runtimeRender），比建议多留了"图标字体"：它不需要生成，又是 Godot 可直接用的真实来源，删掉后线性图标只能等素材。 |
| R1-39 | 工具项与展示项混在原子参数里 | low | 采纳 | 参数分四类计数：设计参数 / 玩家选项 / 工具与展示 / 解析设置；chk.* 归入新组 chk（a11y.redundancy → chk.redundancy，lay.coverage → chk.coverage，flow.demo → chk.demo）；正交性只在设计参数之间讨论。 |
| R1-40 | 命名含糊 / 同名异义 | low | 采纳 | 按建议全部改名：pip、tonalInset、innerShadow、theater、spotlightStage、photoMode、liveAction、photoFrame、handheldDevice、apparatus、hangingBanner、分类级数、弹窗栈深、信息优先级、rel.behind、ast.bgArt、st.emptySlot、st.emptyList、pannableCanvas、highlightEdge；col.lightness.mid 描述改为"与色相无关"。v1 → v2 迁移表见第 6.10 节。 |

**R2 完备性**

| 编号 | 对象 | 严重度 | 结论 | 处理 |
|---|---|---|---|---|
| R2-01 | 色板角色 | high | 采纳 | 新增 col.surface / col.surface2 / col.text / col.accent2 / col.focus / col.border / col.gradient（新类型 gradient：from / to / angle / type）。 |
| R2-02 | 按组件 / 按元素覆盖 | high | 采纳 | 登记组件表 19 项（第 2.19 节）；参数声明 overrideAt；<参数>@<组件> 与 <参数>@el.<元素> 由生成器校验；数值图形、材质、颜色、动效都能逐元素覆盖（cmp.gauge@el.vitals、ast.coreMat@el.cta、col.accent@el.objective、mo.idle@el.reward）。 |
| R2-03 | 图案与水印层 | high | 采纳 | 新增 vis.pattern（14 种，可叠在任何内芯上）+ vis.patternOpacity；新增 ast.watermark（8 种）+ ast.watermarkOpacity。 |
| R2-04 | 缺元素：态势条、建造栏、行动顺序 | high | 采纳 | 新增 el.meter / el.toolbar / el.turnOrder，画法按 R1 规则去掉位置词（底部建造栏 → categoryTabs + 锚点）；补进 layout.builder / strategyRts / survival / colonySim 等。 |
| R2-05 | 元素画法单选 | medium | 部分采纳 | 目标、交互、威胁、反馈、通知、准星、叠层、按键提示、名次 9 个元素的画法改成有序多选（第一个是主画法）；生命、资源、按钮等仍是单选——它们的"第二种画法"在参考里都是另一个量（蓝条、大招）或另一个元素，用条数或数值标注表达更准确。 |
| R2-06 | 数值标注 | medium | 采纳 | 新增元素模板参数 elx.valueLabel（none / current / currentMax / percent / delta）与 elx.valueLabelPos，只对显示数值的 11 个元素生效；ex.hadesHud / ex.dotaHud 已补。 |
| R2-07 | 斜体 | medium | 采纳 | typ.body.style / typ.display.style / typ.numerals.style。 |
| R2-08 | 设置控件单选；按键示意图 | medium | 采纳 | cmp.option 拆成 cmp.optionBool / optionEnum / optionRange；新增 cmp.bindingMap（列表 / 键盘 / 手柄 / 鼠标示意图）与子功能 rebind、模板 tpl.rebind。 |
| R2-09 | 参考验证是自证式的 | medium | 采纳 | 每个参考验证加 unencoded 字段；补齐 Hades HUD 的数字、Control 的两个色相、StS2 的指向箭头与石质按钮、Dota 的条上数字；把本次 88 条随机参考登记为回归集（第 8 节），v1 / v2 判定并列。v2 的判定只是"缺口有没有对应参数"，没有重看截图，所以第 8 节明确写了它不能当覆盖率证据，下一批要用没见过的参考复测（路线图 R2② 起每批抽 30 条）。 |
| R2-10 | 锯齿 / 缎带 / 盾尾；单边描边 | medium | 采纳 | 锯齿 → vis.edge = jagged；缎带 / 燕尾、盾尾 → vis.silhouette；新增 vis.strokeSides（all / left / right / topBottom / bottom / corners）。 |
| R2-11 | 背后调色；整屏材质背景 | low | 采纳 | 新增 rel.sceneTone；ast.bgArt 加 material（材质见 ast.bgMat）；书桌放进 ast.containerSurface。 |
| R2-12 | 十字装备格、网格团队框、目标框、指向曲线、弧形罗盘 | low | 采纳 | 十字 / 网格走 elx.arrangement（lay.arrangement 加 cross）；el.threat.form 加 targetFrame；el.crosshair.form 加 aimArrow；el.minimap.form 加 compassArc。 |
| R2-13 | 字族与标题承载长尾 | low | 部分采纳 | typ.display.family 加 slabWestern / graffiti / artNouveau；cmp.plate 加 fan / swallowtail。撕边横幅没有单列：= cmp.plate@title = ribbon + vis.edge@plate = torn。 |
| R2-14 | 螺旋 / 十字；容器叠容器；屏风；工业框 | low | 部分采纳 | lay.arrangement 加 spiral / cross；新增 ast.containerSurface（书桌 / 木架 / 桌面）而不是把容器改多选；ast.container 加 foldingScreen。工业金属框没有加成外框取值：v2 外框只表示结构，工业框 = plainNinePatch + iron + 饰件 rivets + 图案 hazard，加成取值就退回了 R1 批评的"成品组合"。 |
| R2-15 | 笔触焦点；角色画法处理 | low | 采纳 | ix.focus 加 brushSwash；新增 cnt.characterRender（color / sketch / relief / engraving / lineart / monochrome）。 |
| R2-16 | 档位美术、V 形章、侧边色条 | low | 采纳 | 新增 ops.tierArt；cmp.badge 加 chevron；st.rarityCue 加 strip。 |

**R3 可用性 / 落地**

| 编号 | 对象 | 严重度 | 结论 | 处理 |
|---|---|---|---|---|
| R3-01 | 17 组直接变页签会迷路 | high | 采纳 | 每个参数加 tab 字段：①起点 ②外观 ③内容与版式 ④动效与交互 ⑤与世界 ⑥组件与状态 ⑦运营 + 元素检查器 + 诊断（工具）+ 玩家设置预览；顶栏"画面 \| UI"模式切换写进第 7 节。各页签参数数见第 1.6 节（由数据统计）。 |
| R3-02 | 第一屏没有可拧的旋钮 | high | 采纳 | starter 字段标出 10 个大旋钮（面板明度、强调色、标题字族、正文字族、转角、描边线型 + 粗细、阴影、装饰预算、信息密度、反馈强度）与起点选择（输入方式、子功能、UI 与画面关系）；rel.harmony 选项按跟随强弱重排。参数名按 v2 改名。 |
| R3-03 | JSON 缺 tier / activeWhen / parent | high | 采纳 | 全部参数有 tier（1–3）与数据式 activeWhen；子功能有 parent / layer；建议列出的依赖全部登记（名字按 v2）。 |
| R3-04 | "跟随预设"三态与 num() 读成 0 | high | 采纳 | 写进第 7 节：每行显示解析值 + 来源徽标 + ↺ 跟随；引擎与描述生成一律先过 resolveTheme。src/dims/registry.ts 的 num() 把 auto 读成 0、ParamRow 对 auto 得到 NaN，排进路线图 M3a 的第一项（代码改动不在本次文档修订范围）。 |
| R3-05 | 下拉框藏选项；没有 multi | medium | 采纳 | 参数加 control 提示（thumbChips / grid9 / multiChips / segmented）；第 7 节写缩略图芯片、参考数角标、九宫格 + 挂点芯片、多选芯片标"由品类加入"。 |
| R3-06 | 元素参数需要检查器 | medium | 采纳 | 第 7 节：元素检查器 + 画布点选（HudSystem 记录控件矩形，复用 focusParam）+ 拖动吸附九宫格。 |
| R3-07 | 参数搜索 | medium | 采纳 | 第 7 节：Ctrl+K 搜索，索引参数名、取值名与 absorbs（观察轴同义词）。 |
| R3-08 | 缺白话解释 / 两端 / 看哪里 | medium | 采纳 | tier 1–2 参数补 plain / lookAt，连续参数补 ends（数量见第 0 节）；每个组加一句白话问题 question。 |
| R3-09 | 关键词越界且与皮肤重名 | high | 采纳 | 与 R1-09 一起处理：关键词只留材质 / 母题类 18 个，生成器校验越界；气质词（治愈、极简、恐怖、军事、复古像素）删掉，改成 UI 感觉（ui.softer / ui.cleaner / ui.oppressive / ui.retro）或并入皮肤。 |
| R3-10 | 皮肤越界且外观键不全 | medium | 采纳 | 皮肤分 values（只含形与面）与 suggests（版式交互建议，默认不套用）；C-skin-core 要求合并默认关键词后给齐外观核心键；模板的 typ.display 等降为 accent（只补空）。"套用预设时提示改写了上一层哪些键"写进第 7 节。 |
| R3-11 | 缺 UI 感觉入口 | high | 采纳 | 新增 11 条 UI 感觉（相对微调，op = set / add / min / max / union），每条带 terms；情绪 → UI 皮肤 / 感觉对照表（第 3.14 节，供 MOODS 增加 uiSkins / uiNudges）。 |
| R3-12 | 缺整套 UI 配方 | high | 采纳 | 新增 15 套 UI 配方（引用平台 / 商业 / 布局 / 皮肤 / 关键词 + 覆盖 + firstTry / lookAt / differs / tags），missing 由取值的 needs 自动算；参考验证升级为配方的单屏成员；混搭写进第 7 节。 |
| R3-13 | 缺"从我的画面出发" | high | 采纳 | 43 套画面配方 → 同一媒介 / 中性 / 刻意对比 三个皮肤建议（第 3.14 节）；applyRecipe 不再重置 hud.style 列入路线图 M3b。 |
| R3-14 | 界面模板偏手游 | medium | 采纳 | 新增 13 个 PC / 主机常见模板（三选一、本局总结、路线图、按键绑定、难度、Boss 名牌、拾取弹出、存档、对话轮盘、拼图背包、装配、推理板、制作人员）与对应子功能；全部模板加 audience（premium / f2p / both）。 |
| R3-15 | 品类布局缺独立热门子类 | medium | 采纳 | 新增 9 个布局：割草、魂类、殖民模拟、塔防、自走棋、节奏、放置、弹幕射击、类银河城，genre 挂回 game.genre 的 16 类。 |
| R3-16 | 皮肤平铺、family 不全 | low | 采纳 | 皮肤加 browse（浏览家族）字段；"可实时 / 待做""纯程序 / 重素材"由 existing 与取值 needs 自动算（第 3.1 节表格列出）。 |
| R3-17 | 缺灰盒 / Godot 默认主题 | low | 采纳 | 新增 skin.greybox 与 skin.godotDefault。 |
| R3-18 | 无障碍叠加预设 | low | 采纳 | 新增 ov.bigText / ov.colorSafe / ov.lowStim（a11y.redundancy 已改成工具 chk.redundancy，色盲友好用它代替）。 |
| R3-19 | UI 随机 | high | 采纳 | 参数加 random: false（永不随机）与 randomRange（常用区间）；两级随机、按页签锁定、抽完跑约束与可读性检查写进第 7 节。 |
| R3-20 | UI 的 A/B | high | 采纳 | 第 7 节：同一帧两份 resolveTheme 各画一层 HUD、同步重放、差异清单、内容种子、四宫格。 |
| R3-21 | UI 扫描 | medium | 采纳 | 第 7 节：只重画 HUD、按控件包围盒裁切放大、多背景扫描、预设扫描。 |
| R3-22 | chk.* 归属与可读性修复入口 | high | 采纳 | chk.* 改为工具组，不进配方；第 7 节写诊断下拉、⚠ 徽标与一键修复。新增 chk.viewDistance（视距预览）。 |
| R3-23 | 收藏标签 | low | 采纳 | 第 7 节列出 UI 模式的喜欢 / 不喜欢标签。 |
| R3-24 | hud.useSceneColors 与 col.source 重复 | low | 采纳 | 迁移：true → scene，false → skin（col.source 说明与第 6.1 节）。 |
| R3-25 | 静态截图看不出的参数没有分展示方式 | high | 采纳 | 每个参数加 preview（static / time / event / state / context / flow / textDevice），第 7 节写 6 类各自的展示（时间轴 + 逐帧条带 + 缓动曲线、事件按钮、状态陈列板、情境三联、分镜 + 交互注释、设备外框 + 视距）。 |
| R3-26 | flow.demo、lay.coverage 不该是参数 | medium | 采纳 | 改为 chk.demo（视口按钮）与 chk.coverage（只读读数）。 |
| R3-27 | 后期标记下沉到选项级 | high | 采纳 | 每个取值有 needs（canvas / font / asset / scene / sim / flow）与 godotLevel（builtin / shader / post / script / hard）；未实现的素材选项画灰盒占位不禁用；"只看 Godot 内置能做的"开关写进第 7 节；数量统计见第 0 节。 |
| R3-28 | M2 字体覆盖不到的取值 | medium | 采纳 | 圆体、中文窄体、哥特、模板字、西部、涂鸦、新艺术、假名、细 / 特粗字重标 needs = font（不需要生成，只需 OFL 下载 + 子集化）；中文书法标题标 needs = asset；路线图 M3a 加"字体补全"。 |
| R3-29 | 高成本 / Godot 难迁移的参数 | medium | 采纳 | 分屏标 godotLevel = script 并排到 M7 末；全部竖排标 hard；抖动、毛玻璃、双线 / 虚线、内阴影 / 倒角 / 双向阴影、标题故障 / 飞白 / 火焰、特效故障 / 镭射 / 墨晕标 shader 或 hard；followPost 的 warp / stylize 标 post 并在 M6；运营组在 M9b 末尾、买断制默认隐藏。 |
| R3-30 | 素材槽位先程序化哪些 | medium | 采纳 | 取值的 needs 把"先程序化"与"等 M11"分开；路线图第 10 节按 R3 的清单排（外框先做程序 / 四角件 / 像素；内芯先做纸 / 宣纸 / 绢 / 全息；母题先做几何 / 括号 / 电路 / 星 / 符文；容器先做书 / 卷轴 / 手机）。 |
| R3-31 | M5 / M9 太大 | medium | 采纳 | 参数的 milestone 改为 M3a / M3b / M3.5 / M4 / M5a / M5b / M6 / M7 / M8 / M9a / M9b / M10 / M11，见第 10 节的数量表与新顺序。 |


## 12. 复测（2026-10-14，30 条没参与设计的参考）

做法：Interface In Game 15 款没浏览过的游戏，各人工挑 1 张原图；GameUI 15 种界面功能，各取 1 张"前 36 张之外"的截图（体系设计时没看过，且来自不同游戏）。图在 `qa/refs-cache/retest/`。逐条用 v2 参数编码，✓ = 能完整写出，◐ = 有写不出的地方。GameUI 的功能标签不总是准（#19 标"设置"实为战斗中暂停，#20 标"地图"是 Ori 的地图），按画面实际内容编码。

| # | 参考 | 结果 | 关键编码 / 缺口 |
|---|---|---|---|
| 1 | Stellaris · 行星概览 | ◐ | lay.container = 侧抽屉；col.lightness = 深色；vis.stroke = 实线（青色细边）；flow.chrome = 顶栏货币；教学旁白面板 = screen.tutorial 浮层。**缺：面板顶部的行星头图** |
| 2 | Planet Zoo · 动物信息 | ✓ | 侧抽屉 + 浅色圆角；st.statViz = 行内横条（红绿福利条）；el.selection = 信息面板；el.toolbar = 分类页签 + 子项抽屉 |
| 3 | Total War: WARHAMMER II · 科技 | ✓ | lay.arrangement = 规则网格；cmp.slot = 横卡行；ast.frameMat = 石；ast.coreMat = 羊皮纸；cmp.plate = 铭牌 / 匾额 |
| 4 | Gwent · 牌组构建 | ◐ | 三栏；ast.frameMat = 木；st.locked = 灰度；筛选行 = 分段按钮。**缺：左列牌组行的整行插画底** |
| 5 | Slay the Spire 2 · 战斗 | ✓ | el.crosshair = 拖拽指向曲线；el.threat = 意图图标 + 数字；el.abilities = 手牌；能量 = cmp.gauge 圆环；结束回合按钮材质用 ast.coreMat@button |
| 6 | Trackmania Turbo · 新纪录 | ◐ | 斜体粗展示字；st.delta = 绿色 + 增量（这里是黄色）；vis.pattern = 圆点。**缺：整屏超大文字底（BRAVO）** |
| 7 | Hidden Folks · 找目标 | ✓ | col.strategy = 单色；el.objective = 任务清单（底部图标条）；st.done = 绿勾；typ.body.family = 手写 |
| 8 | Portal 2 · 章节 | ✓ | el.title = 章节标题卡；cmp.plate = 无（直压）；rel.behind = 实时场景 |
| 9 | Alan Wake II · 线索板 | ◐ | cnt.subtype = 推理板；cnt.dataShape = 关系网；lay.arrangement = 树 / 连线；ast.bgArt = 整屏材质（木）。**缺：红绳连线样式、线索墙容器** |
| 10 | God of War · Boss 战 | ✓ | rel.hudVisibility = 情境显现；el.threat = Boss 长条 + 名字（底部居中细条） |
| 11 | Horizon Zero Dawn · 局内 | ✓ | el.minimap = 罗盘条；elx.valueLabel = 当前 / 上限；世界内 ! 标记 = 空间内 + 平面公告板 |
| 12 | Celeste · 明信片提示 | ◐ | ast.container = 信封 / 信笺；cmp.plate = 印章（邮票）；ix.continueCue = 按键图标。**缺：卡片随手倾斜的角度** |
| 13 | Dragon Quest Builders 2 · 任务完成 | ✓ | el.notify = 圆角提示卡（带头像）；typ.titleFx = 描边；任务清单 + 进度 x / y |
| 14 | Team Fortress 2 · 任务完成 | ✓ | cmp.plate = 缎带；el.rank = 评分字母；col.lightness = 深色；平面按钮 |
| 15 | A Short Hike · 对话选项 | ✓ | cmp.dialogBox = 带尾气泡；hier.inline = 红字；ix.focus = 光标指示；vis.pixelScale = 与世界同网格 |
| 16 | 萌宠解谜 · 战斗界面（竖屏） | ✓ | lay.playfield = 棋盘 / 关卡窗；糖果卡通皮肤；顶部资源胶囊 |
| 17 | 宝石小伙伴 · 主界面 | ✓ | 角色站台居中；ops.entries = 侧边图标列 + 倒计时；el.cta = 宽按钮；lay.nav = 底部页签；cmp.tabIndicator = 凸起 |
| 18 | 幻界之境 · 背包 | ✓ | 规则网格；st.rarityCue = 边框色；底部分类页签 |
| 19 | 奇缘之旅 · 战斗中暂停 | ✓ | cmp.modal = 无框浮空；vis.silhouette = 盾形按钮；rel.dim；顶部回合 / 关卡信息 |
| 20 | Ori · 地图 | ◐ | vis.mapUnexplored = 压暗；el.prompt = 按键图例条；完成度百分比。**缺：发光剪影地图画风** |
| 21 | 解忧小村落 · 住宅 | ◐ | 纸面 + 红木框；cmp.optionEnum = 分段按钮（税收档位）；st.locked = 锁图标。**缺：面板里的场景插画窗** |
| 22 | 阿尔米娅赞歌 · 角色 | ✓ | ast.fx = 魔法阵（站台）；st.rarityCue = 星级；技能圆形图标 |
| 23 | 酱游记 · NPC 对话 | ✓ | cnt.characterMedium = 全身立绘；cmp.dialogBox = 底部通栏（半透明）；ix.skip = 自动 / 快进 / 日志 |
| 24 | 小虾米战三国 · 挑战记录 | ✓ | cmp.plate = 缎带；列表行 = 头像 + 状态标记（胜 / 败用 st.statusMark = 文字角标近似） |
| 25 | 代号肉鸽 · 宝物宝库 | ◐ | 三选一圆形格；两个药丸按钮。**缺：面板顶部的宝箱头图** |
| 26 | 神州风闻录 · 侍从信息 | ✓ | lay.nav = 左侧页签（竖排字）；属性表；技能圆框图标；稀有度文字 SSS |
| 27 | 梦山海 · 任务 | ✓ | cmp.gauge = 节点轨道 + 里程碑（活跃度宝箱）；cmp.listRow = 图标 + 说明 + 行内按钮 |
| 28 | 风车之家 · 图鉴 | ✓ | lay.nav = 左侧页签；cmp.plate = 缎带（稀有度组头）；st.locked；数量 x / y |
| 29 | 小小霸主 · 获得新英雄 | ✓ | el.reward = 卡牌平铺（单张）；cmp.plate = 缎带；ops.actions = 再抽 N 次 |
| 30 | 飞龙岛历险记 · 排行榜 | ✓ | st.rank = 领奖台；cmp.plate = 缎带；左侧图标页签；底部倒计时 |

**结果：22 / 30 能完整编码（73%）**。v1 实测是 44 / 88（50%）；v2 修订后的"88 / 88"是补词表的估计，不是实测，以本节为准。

**缺口与已做的补充**（写进 `data/ui-param-system.json`，validation.retest 有记录）：
1. 面板插画槽（4 条）→ 新参数 `cmp.panelArt`：无 / 头图横幅 / 插画窗 / 侧图 / 整幅底图；`cmp.listRow` 加"行底插画"。
2. 整屏超大文字底 → `ast.watermark` 加"超大文字"。
3. 连线样式 → 新参数 `vis.connector`：直线 / 曲线 / 虚线 / 红绳 + 图钉 / 电路走线 / 光束 / 笔触线；`ast.container` 加"线索墙 / 软木板"。
4. 卡片随手倾斜 → 新参数 `vis.tilt`（0–10°，每个物件按种子取正负）。
5. 发光剪影地图 → `vis.mapStyle` 加"发光剪影"。

**饱和度判断**：8 条缺口都落在"取值"或"一个小参数"层面，没有一条需要新增维度组；维度结构可以定下来开工，词表的长尾在 R2 建卡时继续补（每批建卡顺带编码，编码不出的就补词表）。
