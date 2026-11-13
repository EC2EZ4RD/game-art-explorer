# R5 复刻库：好游戏 UI 的复刻配方

> 路线图 v3 的 R5（`docs/ui-hud-plan.md`）。目的不是做某一款游戏，而是把大量美术好评游戏的 UI / HUD 用探索台的参数体系**逐屏写出来**：能写出来的就是"这套风格怎么搭"，写不出来的就是参数体系的缺口（交给 M12）。手游的商城、奖励、抽卡、签到、首充、通行证等界面不复刻。

## 文件

- `src/content/replicas/<id>.json`：一款游戏一份。`id` = `rep.<英文短名>`（小写、连字符），如 `rep.hades`、`rep.elden-ring`。
- `qa/replicas/<id>__<界面>.png`：浏览器里 `__gae.replicaShots([id])` 渲染（16:9，二倍分辨率）。
- `qa/replicas/sheets/<id>.jpg`：`python -X utf8 scripts/refs/replica-sheet.py <id>` 拼的对照图（左参考截图、右复刻）。参考截图只作本地学习参考，不分发、不进文档。
- 校验：`python -X utf8 scripts/refs/check-param-vectors.py [src/content/replicas/<id>.json]`（不给文件 = 全部复刻）：参数 id、取值、预设 id、皮肤值、参考卡 id、作用域键（下文"作用域覆盖"），以及复刻自己的格式（scores、round<N>Diffs、revisions、gaps[].kind）。错误让退出码为 1；"⚠"是提醒（例如写了渲染器不按目标读的作用域键），不算失败。

## 字段

```jsonc
{
  "id": "rep.hades",
  "name": "Hades",                       // 原名
  "card": "steam:1145360",              // src/content/uiRefs.json 里的参考卡 id
  "genre": "action",                    // 参考卡的品类
  "family": "fam.ornate-carved",        // UI 风格图谱（src/content/uiStyleFamilies.json）里的家族 id；图谱还没有时写中文家族名
  "pack": "action",                     // 示例内容包（src/hud/content/packs/，cnt.pack 的取值）：选同品类的包，不写真实游戏的文字
  "art": {                              // 画面侧（只为让背景的明暗与色调接近参考，评分不比较世界美术本身）
    "recipe": "<src/content/recipes.ts 里的配方 id，可选>",
    "scene": "<src/content/sceneCatalog.ts 的场景 id>",
    "values": { "<画面参数>": "<值>" } // 可选，少量
  },
  "base": { "hud.style": "darkGold", "...": "..." },   // 整套 UI 共用的取值：皮肤 + 色彩 / 字体 / 形 / 饰件 / 材质 / 动效
  "screens": [
    {
      "key": "hud",                     // hud / pause / inventory / map / dialogue / character / skilltree / title / settings / journal / craft / build / cards / results / loading / codex …（不含商城 / 抽卡 / 奖励）
      "ref": "qa/refs-cache/…/xxx.jpg", // 对应的本地参考截图；凭记忆编码、没有参考图时写 null
      "values": { "uip.layout": "layout.action", "...": "..." }, // 这一屏的取值（局内 HUD 用 uip.layout + 元素参数；其他界面用 uip.screen = tpl.* + 版式参数）
      "sim": { "pose": "lowHp" }        // 可选（M12c-14）：静帧钉法——姿态，或 { "demo": "combatBeat", "at": 2.4 } = 演示钉在第 2.4 秒
    }
  ],
  "gaps": [                             // 参数体系表达不了的地方（M12 的输入）
    { "screen": "hud", "what": "祝福图标是菱形且竖排两列", "severity": "high|medium|low", "proposal": "新取值 / 新参数 / 新画法的建议", "kind": "missingOption" }
  ],
  "scores": {                           // 对照图评分（0–10，只评 UI 层）：第一轮是单个对象，第二轮起是逐轮数组（最后一项 = 当前分）
    "hud": [
      { "layout": 1, "elements": 1, "palette": 4, "type": 4, "shape": 3, "density": 2, "overall": 1, "round": 1 },
      { "layout": 3, "elements": 2, "palette": 4, "type": 4, "shape": 4, "density": 3, "overall": 3, "round": 2 }
    ]
  },
  "round1Diffs": { "hud": ["第 1 轮对照图上和参考的差异，一条一句"] },   // 每轮一个：round1Diffs、round2Diffs……
  "round2Diffs": { "hud": ["第 2 轮对照图上仍有的差异"] },
  "revisions": ["hud：第 1 轮之后改了什么（一条一句，写清改了哪些键、为什么）"],
  "notes": "这款 UI 的要点（一两句，转述，不引用）"
}
```

### 字段细则（第二轮格式，M12a-39）

- **scores**：屏 key → 评分。只评过一轮的可以是单个对象（旧格式，仍然认）；评过多轮的写数组，按轮次排、`round` 递增（没写 `round` 的按位置算第 1、2……轮）。复刻库面板显示"R1 3 → R2 4（+1）"，列表与复刻页的"像不像"取**最后一轮**（`replicaScore()`；逐轮见 `replicaScoreHistory()`，`src/content/uiKnowledge.ts`）。每屏都要有评分。
- **round&lt;N&gt;Diffs**：第 N 轮对照图上这一屏和参考仍有的差异，屏 key → 字符串列表。面板按轮次各折叠一节。
- **revisions**：每轮之后改了什么（字符串列表，按时间顺序追加，不删旧的）。
- **gaps[].screen**：一屏的 key；几屏共有写 `"a / b / c"`（面板把它挂到每一屏）；整套共有写 `all`（旧写法 `global`、`*` 同义）。
- **gaps[].severity**：`high`（不补就不像）/ `medium` / `low`。
- **gaps[].kind**（必填）：缺口归哪一类，M12 backlog 按它分流。

| kind | 含义 | 例子 |
|---|---|---|
| `renderBug` | 参数 / 取值已有，渲染器不读或画错 | 写了 `col.accent@el.vitals` 不生效 |
| `layoutEngine` | 排版引擎的问题（避让、堆叠、贴边、锚点空间） | 下中列被避让推到画面上半部 |
| `missingParam` | 缺一个参数 | 饰件挂点、条的长度随上限 |
| `missingOption` | 已有参数缺一个取值 | `ops.actions` 没有"无" |
| `newDrawing` | 要一种新画法 / 新组件 | 棍势环、祥云墨刷端头 |
| `composite` | 几个元素拼成的复合件 | 温度透镜 + 倒计时 |
| `content` | 示例内容包的数据不够 | 天气图标与文字对不上 |
| `asset` | 要位图素材 | 整幅插画小丑牌、水墨图鉴画像 |
| `worldSpace` | 世界空间 / 场景的事（挂点、白模、投影） | 信息视图把城市重绘成白模 |
| `motion` | 动效 / 时序 | 数字跳动、受击闪白节奏 |

- **screens[].sim**（可选，M12c-14）：这一屏的截图钉在哪个时刻。`{ "pose": <chk.simPose> }` 选一个静帧姿态——`lowHp`（低血暗角 + 阈值变色）/ `hit`（受击闪白、伤害数字）/ `heal` / `pickup`（拾取提示条）/ `levelUp`（升级横幅）/ `dialogueMid`（逐字到一半）/ `enterMid`（入场与模板打开到一半）/ `idleFaded`（情境显现 / 闲置淡出的元素淡出）/ `bossIntro`（名牌已出、Boss 条涨到一半）/ `beatDown`（随拍放大的那一下）；`{ "demo": <chk.demo>, "at": <秒> }` 把一段演示（`combatBeat`、`openScreen`、`resultsTally`、`bossIntro`、`scoringSequence`、`beat`、`drawCards`……）钉在第 at 秒（0–10）；pose 与 at 同写时 at 换掉姿态时刻。渲染时写成 `chk.simPose` / `chk.demo` / `chk.simTime`（`__gae.replicaShots` 套在这一屏的 `values` 之后），同一组参数两次截图逐字节相同。只想钉住样本血量写 `values` 里的 `cnt.sampleHp`（0–1，例：hades 低血 = 0.23）。`scripts/refs/check-param-vectors.py` 校验字段与取值。
- **逐帧条带**（M12c-14）：动效类缺口（`kind = motion`）的屏用 `__gae.replicaStrip(id, screen, [0, 0.4, 0.8, 1.2, 1.6, 2.4])` 按一组时刻各钉一帧拼成横条（5–8 帧），存到 `qa/replicas/strips/<id>__<screen>.png`；`replica-sheet.py` 有条带时拼在那一屏的对照行下方，动效缺口据此评分。
- **ref**：没有本地参考截图、凭记忆编码的屏写 `null`；这类屏的评分可信度低，R5b 选参考截图时优先补（清单见 `docs/survey/17-ui-style-atlas.md` §5.5 末尾"复刻库待补参考图"）。

## 渲染时怎么套

每屏从默认值出发：`art.recipe`（有就套整套画面配方）→ `art.scene` 与 `art.values` → 画幅钉 16:9（`camera.letterbox = 1.78`）→ `cnt.pack = pack` → `base` → 这一屏的 `values` → 这一屏的 `sim`（静帧钉法，M12c-14）。所以 `values` 里同名键覆盖 `base`。

### 多选参数：清空与减项（M12a-07）

合并方式是并集（`merge = union`，如 `ops.actions`、`ast.fx`、`ast.ornaments`、`col.coding`、`st.rarityCue`）的多选参数，下层（界面模板、关键词、皮肤……）带进来的取值会和这一层的并在一起。要去掉它们：

- `[]` 或 `["none"]`：清空，这一层以下带进来的全部不要（例如本屏 `"ops.actions": []` 去掉模板自带的"再抽 10 次"）；
- `["none", "a"]`：清空后只留 a（替换）；
- `["-retry"]`：只减掉 retry，其余照旧（可以和普通取值混写：`["-gems", "dividers"]`）。

`base` 与这一屏的 `values` 都在用户层：同一屏里 `values` 的值盖过 `base` 的同名键（整个替换），不与 `base` 求并集。

派生规则也按这套写法清东西：选了买断制（`uip.business = business.premium`）时下层带进来的 `ops.actions` 全部去掉，必须选一个（`ix.dismiss = forced`，如三选一）时去掉"再抽"（`retry`），用户自己写的照留；装饰预算 `vis.ornament = 0` 时关键词带进来的饰件真的清空。

饰件画在哪（M12a-07）：`ast.ornamentScope`（all 全部面板 / screens 只在界面里 / templatePanels 只画主面板 / largePanels 只画大面板）与 `ast.ornamentMinSize`（短边低于它的盒子不画角花和分隔线，单位 px@1080p；不写时是原来的门槛，backlog 建议值 140）。两者都只在写了时生效。

### 字号与尺寸的单位：px@1080p（M12a-05）

`typ.baseSize`、`ix.touchSize`、`chk.minText`、`ast.ornamentMinSize`（以及之后的格子边长、间距、挂点间隔）都按 **1080p 画面上的像素** 写：探索台把 HUD 排在 960 × 540 的设计画布（= 1080p 的一半）上，整张再按画面缩放（与 Godot 的 canvas_items 拉伸一致）。所以 `typ.baseSize: 26` 在 1080p 上是 26px、在 928 × 522 的复刻画布上约 12.6px；PC / 电视默认都是 26，手机 28，掌机 34。

第二轮复刻里为抵消旧算法（把这个值当画布 CSS 像素用，电视的 26 画成约两倍大）手压的 12–16 要换算：`python -X utf8 scripts/refs/migrate-basesize.py`（默认只打印差异；`--all --exact` 把所有手调值按 2 × round(0.93 × 值) 换算，迁移后与迁移前在画布上一样大；`--write` 写回）。新写的复刻直接按 px@1080p 写，低于 16 的值 check-param-vectors.py 会提醒。

### 列表的写法：有序、并排、占位、颜色（M12a-12 / 16 / 27 / 35；审查修复 B）

- **有序多选**（参数表 `ordered`）：顺序有意义，按位置对应——`el.vitals.rowForms` / `el.vitals.rowColors`（第 i 行的画法 / 颜色）、`cmp.listRowColors`（标题 / 说明 / 数值 / 状态 / 时间）、`col.actionColors`（确认 / 取消 / 工具 / 出售）、`lay.edgeBarSlots`（贴边条里的格序）、各元素的 `el.*.form`（第一个是主画法）。合并方式是替换（这一层写了就整个换掉）。
- **`"auto"` 占位**：逐行 / 逐项的列表里写 `"auto"` = 这一行用默认，后面的行照样对位：`"el.vitals.rowForms": ["auto", "segmented"]` = 第一行照整组的 `cmp.gauge@el.vitals`、第二行分段（审查修复 A 之前 auto 会被丢掉、分段落到第一行）。`rowForms` / `rowColors` / `listRowColors` / `actionColors` 都认。
- **同一项可以重复**：`["bar", "bar", "segmented"]`、`["text", "text", "#d9b44a"]`。
- **颜色列表**（`freeColors`：`rowColors` / `listRowColors` / `actionColors`）：项是颜色角色名（accent / accent2 / good / warn / bad / currency / text / muted……）或 `#hex`（`#rgb` / `#rrggbb` / `#rrggbbaa`）。**不能写 `rgba()`**：列表存成逗号串，读时按逗号拆，`rgba(255,0,0,0.8)` 会变成 4 项；带透明度写 `#ff0000cc`。校验报错。
- **并排**（`joinable`：`lay.edgeBarSlots`）：一项写成 `"el.toolbar|el.clock"` = 两个元素在贴边条的同一格里并排（格与格之间画分隔线，同一格里不画）；每一段都要在词表里。
- 参数面板（审查修复 B）：有序多选显示成条目行——上移 / 下移 / 删除、「＋ 加一项」（逐行列表可重复、可加 auto 占位）、颜色列表可直接输入 #hex、`lay.edgeBarSlots` 可「并」到上一项 /「拆」开。复刻 JSON 里照上面的写法写数组即可。
- **px@1080p**：`typ.baseSize`、`ix.touchSize`、`chk.minText`、`ast.ornamentMinSize`、`lay.cellSize`、`lay.gap`、`elx.attachGap`、`typ.button.size` 的数都是 1080p 画面上的像素（见上一节）。
- **校验**（check-param-vectors.py，审查修复 B 起）：range / int 的数要在参数的范围里（`lay.cellSize` 24–320、`cnt.itemCount` 1–60……），或是取值表里的词（auto、none、fit）；toggle 只认 true / false；color 认 #hex、rgba()、色板引用 `@accent` / `@text`……或取值表里的词（`col.icon = item`、`col.track = darkScrim`）；`@el.<id>` 的元素要在 `cnt.elements` 的词表里（实例 `@el.<id>#2` 同样认）；元素级键（`el.vitals.scale`、实例的 `el.vitals#2.scale`）不能再带 `@`。

### 元素实例、锁扣与世界标记（M12b-04 / 05 / 18 / 19；B6 审查修复）

- **实例 id**：`cnt.elements` 里同一元素可以再写第二 / 第三份 `el.<元素>#2` / `#3`（最多 #3）：`"cnt.elements": ["el.vitals", "el.vitals#2"]`（StS 的顶栏读数 + 脚下血条）、`el.abilities#2`（黑神话 / Ghost 的第二组快捷槽）、`el.toolbar#2`（Frostpunk 夹在条两侧的按钮）。
- **实例键**：`el.<元素>#2.<后缀>`、画法级 `el.<元素>#2.<画法>.<后缀>`（`el.threat#2.bossBar.screenAnchor`）。**元素自己的参数不继承第一份**——第一份的 `form / scale / count / arrangement / screenAnchor / attachTo / 停靠……` 可能来自品类布局，第二份没写就回到参数表默认 / `elx.*`。所以写实例时它的画法、缩放、个数、位置都要另写：Frostpunk 的 `el.toolbar#2` 要写 `form = buttonRow`、`count = 2`、`scale = 0.85`；黑神话的 `el.abilities#2` 要写 `scale = 0.55`（第一份是 0.55）。
- **按目标覆盖指到实例**：`<参数>@el.<元素>#2`。目标链是 **[el.<元素>#2, el.<元素>]**（B6 审查修复 ⑱）：第一份上写的样式键（`vis.silhouette@el.toolbar`、`ast.core@el.toolbar`、`col.accent@el.vitals`、`cmp.gauge@el.vitals`、`st.*@el.abilities`……）第二份跟着用，`@el.<元素>#2` 再单独改——不用为第二份抄一遍样式。
- **Godot**：实例 = 同一个子场景实例化几份，节点名 `Hud_el_<元素>_2`；类型变体 `Hud_el_<元素>_2`，没有自己的变体时用第一份的 `Hud_el_<元素>`。
- **个数**：`el.threat.count`（Boss 条并排）、`el.party.count`（人数，最多 8，一列 / 一行放不下时折列 / 折行）、`el.selection.count`、`el.turnOrder.count` 只认元素级键，不吃全局 `elx.count`；多选画法时可以写画法级键分开（`el.threat.targetRow.count = 4` 只管目标切换行，`el.threat.count` 两种画法共用）。
- **停靠**（`elx.dockTo / dockSide / dockGap / dockAlign / dockSlot`）：宿主要在同一屏的 `cnt.elements` 里；同一宿主同一边的几个停靠者按 `cnt.elements` 的顺序依次往外排（后一个停在前一个上；压角的沿那条边往里排，终期审查修复 ㉔），不用自己写成链；停靠者的骑边小件（`elx.satellites`）也留地方（㉘）；`dockSlot`（宿主第几格）只对报了成员格的宿主算数，现在只有 `el.party`（每个队员一格），停在别的元素上写了也是停在整个元素旁。成环（A → B → A）的那几个都不停靠、回到自己的锚点，停向环的元素照常停在它的宿主旁（C-dock-cycle 只列环上的）。宿主是多选画法的元素时停在它的第一个整块画法旁。跟着当前成员 `elx.dockFollow = active`（M12b B10）：停在宿主的当前行动者那一格旁（`el.party` 的当前成员 = 内容包 `hud.partyActive`，没写时第一个；octopath#13 的指令窗，代替写死的 `dockSlot`）。连接梁 `elx.dockConnector`：`ironBeam` = 从宿主的边一直伸到停靠者外端的铁艺翼梁，压在停靠者下面（停靠者挂在梁上；frostpunk#0 温度透镜两侧挂资源的翼梁）、`line` = 两块之间一道饰色细线。
- **成组**（`elx.group / groupFrame / groupConnector`）：组框与饰线只给挨在一起的组员画——同一个屏幕锚点、外接框里没有组外的元素；组员分在几个锚点（或挂世界点）时这一组不画，检查报 C-group-split。要把不同锚点的块拼成一条，用停靠。
- **骑边小件**（`elx.satellites` + `elx.satelliteSide / Count / Overhang`）：小圆钮按 `satelliteSide` 的边 / 角排；徽章 / 小签 / 拨杆只在给了角（tl / tr / bl / br）时挪到那个角，否则各在原来的角（小签左上、徽章与拨杆右上，同角时挨着排）；提示条只在给了底边（b / bl / br）时放到底边下方，否则顶边上方。所以 Civ6 的「左边两颗钮 + 顶上提示条」写 `satelliteSide = l` 即可。伸出框外的部分算进元素的排位尺寸（元素会让出那一圈）。
- **世界标记**：新元素 `el.worldLabel`（`nameplate / banner / altIcons`，默认挂兴趣点，排在其余世界标记之后让开它们）；画在几个点上的画法（世界名牌、`el.turnOrder = numberBadges`、`el.interact = iconBubble`）每一块都登记占位，只选这一种画法时也登记。

### 作用域覆盖：`<参数>@<目标>`（M12a-01）

键可以写成 `<参数>@<目标>`，只改一个信息元素或一类组件的样子：

- 目标是信息元素 `el.<id>`（`col.accent@el.vitals`），或组件 / 部件名（`src/hud/sys/register.ts` 的 COMPONENTS）。写错目标的键存不进参数，校验报错。
- **已经接上的部件**（`src/hud/sys/scopable.ts` 的 `SCOPE_PARTS`）：`slot`（格子）、`button`（按钮）、`key`（按键提示的键帽）、`plate`（标牌）、`title`（模板页头的标题字、标题标牌）、`titleBar`（模板页头）、`avatar`（头像）、`badge`（徽章）、`bar`（数值条的底槽与填充）、`panel`（元素自己的面板）、`node`（技能树 / 路线 / 地图上的节点）、`tooltip`（浮动详情、悬浮提示）、`listRow`（列表行）、`tab`（页签）、`nav2`（二级页签行，lay.navDepth = 2，M12a-22）、`card`（卡片：三选一的卡、选中信息的卡片画法）、`minimapFrame`（小地图 / 罗盘的框）、`hudBar`（贴边条 / 底座 / 边框的底板、同锚点共用底条 `elx.stackDir = rowBar`、模板顶栏 `flow.chrome = statusBar`，M12a-16 / 18）、`mapLabel`（世界地图的地名牌，`vis.mapLabels = plate` 时 `cmp.plate@mapLabel`，onMap 的字色 `col.text@mapLabel`，M12a-30）、`progress`（列表行的进度条：`cmp.gauge@progress`，任务 / 成就 / 通行证 / 关卡路线的行内进度；全局 `cmp.gauge` 是血条的，不换这里）、`stateTag`（列表行的完成角标：`cmp.plate@stateTag` 换形，`col.surface@stateTag` / `col.text@stateTag` 换色）。B5 起按部件读的组件参数还有：`cmp.button` / `cmp.buttonBox` / `cmp.buttonFace`（@button、@el.cta、@el.toolbar）、`cmp.tab` / `cmp.tabIndicator`（@tab、@nav2）、`cmp.listRowBox` / `cmp.listRowColors`（@listRow），主题类的 `typ.outlineColor` / `typ.outlineWidth` / `typ.button.*` / `col.semantic` / `col.actionColors`。B6 接上 `name`（对话类模板页头的说话人名牌：`cmp.plate@name` 选形态，`col.surface@name` / `col.text@name` / `vis.stroke@name` / `vis.strokeColor@name` 定底色、字色、描边）与 `dialog`（对话类模板的容器面板、字幕底条：`col.surface@dialog`……）。M12b-68 接上 `icon`（行首 / 条前图标的底章：`vis.silhouette@icon` 给逐行图标 / 资源符号垫一枚底章，`col.surface@icon` 换章底；图标本身的画风与位图着色不按 `@icon` 读——写在元素或格子上：`vis.iconStyle@el.toolbar`、`vis.iconTint@slot`，写 `@icon` 校验给"⚠"，中期审查修复）、`rank`（段位徽章 / 字母评级的底盘：`vis.silhouette@rank`、`col.surface@rank`……）、`nameplate`（选中信息 / 队伍的名牌与称号横幅：`cmp.plate@nameplate`、`col.surface@nameplate`……）。M12b-55 接上 `body`（长文块：公告、对话 / 事件正文的对齐 `typ.align@body`；主体标题字的对齐是 `typ.align@title`。`body` 只认 `typ.align`——字本身按元素的上下文画，写别的参数 @body（`col.text@body`、`typ.body.family@body`……）不起作用，校验给"⚠"，终期审查修复 ⑱）。M12b-36 加 `frame` / `core` / `well`：面板的三层立体（`vis.depth@frame` 外框带、`vis.depth@core` 内芯、`vis.depth@well` 凹槽），只有 `vis.depth` 读它们（写别的参数 @frame / @core / @well 不起作用，校验给"⚠"）。M12b-49 接上 `earTab`（骑在面板 / 元素边上的耳标，`ast.earTabAt` 选位置：`col.surface@earTab` 换底、`col.ornament@earTab` 换描边与拨杆色）与 `keyBadge`（按钮端的键帽徽章，`ast.ornamentAnchor = buttonEnd`：键帽按 `@key` → `@keyBadge` → 元素查；M12b-05 的骑边小件 `elx.satellites` 也画在这个部件上——`col.surface@keyBadge` 换小件底、`col.ornament@keyBadge` 换描边）。M12b-50 接上 `panelArt`（插画槽的图窗：`ast.frame@panelArt` / `ast.frameMat@panelArt` 给图窗套一圈外框，StS 事件插画的雕花画框）。M12b B8 接上 `groupHeader`（分组标题：树的层列头 `lay.grouping = header`、列表的分组标题行——`cmp.plate@groupHeader` 换成标牌（Civ6 的青蓝渐变胶囊写 `cmp.plate@groupHeader = pill` + `col.surface@groupHeader`），没选时小号粗体字 + 一道分隔线）与 `slotGroup`（格组：`col.accent@slotGroup` 换组名色、`cmp.slotGroup@slotGroup` / `cmp.slotGroupTitle` 换计数与标题位置）。其余组件名（`modal`、`input`）能写、能存，但还没有渲染器按它们读，校验给"⚠"，画面按元素 / 全局值画。
- **优先级：部件 > 元素 > 全局**。画元素 el.x 里的一个部件时依次查 `<参数>@<部件>` → `<参数>@el.x` → 全局值；画界面模板（构图器）时元素是 `el.screen`。标牌可以带调用方给的角色：页头的标题标牌查 `@title` → `@plate` → 元素 → 全局，对话类模板的说话人名牌查 `@name` → `@plate` → …（M12a-23）。注意 `col.surface@plate` 作用到**所有**标牌（页头标题牌、`Esc 返回` 胶囊、地名牌……），只想改标题牌写 `@title`。与 Godot Theme 的 theme_type_variation 继承同序：导出时每个有覆盖的目标一个类型变体 `Hud_<目标>` / `Hud_<目标>Label`。
- 部件嵌套时不叠加：格子里的按钮只查 `@button`、不查 `@slot`；部件里的面板就是这个部件本身（不再查 `@panel`）。
- 作用域值是**替换**，不与全局求并集：`"ast.fx@el.minimap": ["none"]` 让小地图不带任何特效，`"ast.ornaments@el.party": ["none"]` 让队伍面板不画饰件。饰件只画在带面板样式的大块上（元素面板、`card`、`minimapFrame`、模板主容器）；格子、列表行、悬浮提示、标牌、按钮这些小件本来就不画饰件，给它们写 `ast.ornaments@…` 没有效果（要控制范围用 `ast.ornamentScope` / `ast.ornamentMinSize`，M12a-07）。
- 只有渲染器真正按目标读的参数才生效，清单是 `scopable.ts` 的 `SCOPABLE_IDS`：
  - 主题 token（按目标链把面板、按键、数值条、正文 / 标题 / 人名字样重算一遍，规则与全局相同：面板明度、描边、立体、材质换字色……；版面缩放取整屏）：`vis.corner / cornerSize / edge / skew / jitter / opacity / fill / pattern / patternOpacity / blur / stroke / strokeWidth / strokeColor / strokeSides / strokeGlow / depth / gloss / ornament / motif / dividerStyle / silhouette`、M12b B3 的 `vis.cornerMask / panelShape / shapeJitter / brushDryness / brushDir / brushTip / edgeSides / strokeFade / depthOffset / depthAngle / depthColor / fade / fadeLength / patternArea / ditherMatrix / patternOrigin / noiseDensity`、`ast.wear / finish`、M12b B4 的 `vis.strokeModulation / motif2 / dividerPlace`、`col.ornament / gem`、`ast.ornamentAnchor / ornamentOverhang / endcapShape / frameThickness`、M12b B5 的 `typ.numerals.family / weight / style / digits / cells`、`typ.numberFormat`（数字字形：只给资源栏写里程表 = `typ.numerals.family@el.resources = odometer`）、`typ.fillStyle / fillColors / shadowOffset`（事件字效：`@el.feedback` 只给飘字 / 拟声字）、`vis.tilt`（随手倾角，按目标链读；转哪几层看 `vis.tiltLayers`，没写时只转盒子）、`col.lightness / surface / surface2 / text / accent / accent2 / border / gradient / strategy`、颜色角色 `col.good / warn / bad / focus / nodeDone / heading / icon / muted / quest / control / controlText / track / trackStroke`（M12a-02 / 03）、按钮的 `col.semantic / actionColors`、`ast.core / coreMat / frame / frameMat / fx / ornaments / ornamentScope / ornamentMinSize`、`typ.body.family / weight / case / tracking / style`、`typ.display.family / weight / case / tracking / style`、`typ.titleFx`、`typ.legibility`、`typ.outlineColor / outlineWidth`、`typ.button.family / size`、M12b B10 的 `vis.lightAngle / misregister / misregisterAngle`、`ast.aging`、`vis.blurTint / edgeLight / grain`（`ast.aging@el.party = ["stains"]` 只给队伍卡做旧）；
  - 只经目标链读、不重算主题的（中期审查修复：这几个原来混在主题 token 里，按目标打主题补丁只是白算一遍，Godot 也不再为它们出类型变体）：M12b-58 的图标画风与位图着色 `vis.iconStyle / iconTint / iconTintAmount`（@el.x、@slot：`vis.iconStyle@el.toolbar = painted`、`vis.iconTint@slot = mono`；`vis.iconStyle` 同时是主题 token，整屏的画风写全局）、M12b-55 的文字对齐 `typ.align`（@title 主体标题字、@body 长文块）、M12b-43 的标题前缀 `typ.titlePrefix`（@title → @元素）、M12b-49 的耳标位置 `ast.earTabAt`（@元素）、M12b-59 的输入字形与光标 `ix.glyphTint / cursorSet / cursorContext`（@key → @元素 → 全局：`ix.glyphTint@el.prompt = mono` 只给按键图例换单色圈、`ix.cursorSet@el.interact = pixelGlove` 只给交互光标换手套）、M12b B10 的 `vis.mapStyle`（@el.minimap 只给小地图换画风，只换地形层）、`vis.tiltMode / tiltLayers`（@el.x / 组件：`vis.tiltLayers@el.party = boxAndContent` 只让队伍卡连字一起转）；
  - 按钮、页签、列表行（M12a-35 / 22 / 27）：`cmp.button / buttonBox / buttonFace`（@button、@el.cta、@el.toolbar）、`cmp.tab / tabIndicator`（@tab、@nav2）、`cmp.listRowBox / listRowColors`（@listRow）；
  - 组件形态：`cmp.gauge`、`cmp.plate`、`cmp.badge`、`cmp.dialogBox`（按元素读；M12a-23 起 `cmp.plate@title` / `@name` 选标牌形态，`none` = 不垫牌；印章 `seal` 画成方章 + 内圈细框）；M12b B4 的 `cmp.plateEnds / plateBleed`（@title / @name / @plate / @元素：哪端斜切开叉、出血到屏幕边）；M12b B5 的数值图形参数 `cmp.gaugeUnits / gaugeUnitShape / gaugeDir / dialParts / gaugeIcon / gaugeCap / gaugeCapSize / gaugeFrame / gaugeColorBy / gaugeLow / gaugeHigh / gaugeExtra`（elements/gauges.ts 按 @bar → @元素 → 全局读：`cmp.gaugeCap@el.threat = motif` 只给 Boss 条装端头）；
  - 格子状态（按 `@slot` → 元素 → 全局）：`st.locked / emptySlot / cooldown / selected / newCue / rarityCue / rarityPos`，格子角标 `cmp.slotBadge / slotBadgePos`（M12a-09）、格下标牌 `cmp.slotLabel`（M12b-01：`cmp.slotLabel@el.abilities = levelTag` 只给恩赐格挂「Lv.N」）、格底状态色 `st.statusMark`（M12b-01，B7 审查修复 ⑭：`st.statusMark@el.abilities = slotTint` 只给快捷栏铺新鲜度色）；`st.cooldown@el.cta = turnLocked`（M12b-01）= 主按钮回合禁用（去色 + 换字）；`st.locked / cooldown / selected = none` = 这里不表达该状态；告警样式 `st.alert@el.overlay`（世界状态图标 blink，M12a-31）；
  - 小组件外形（M12a-09）：`vis.silhouette@slot / @avatar / @button / @key / @node / @el.x`（格子、头像、主次按钮、键帽、工具栏钮、节点；`box` = 跟 `vis.corner`，`none` = 不画底座，宽按钮上的 `circle` 是药丸）。全局 `vis.silhouette` 对这些组件都生效（原来只改主按钮）——只想改按钮就写 `@button`。贴边页签钮（M12b-47）是外形 `vis.silhouette@button / @el.cta = edgeTab`（B4 审查修复：从 `cmp.button` 挪来，按钮里放什么照旧由 `cmp.button` 管）。B1 · 68 起段位（`el.rank` 的字母 / 段位章）与计时（`el.timer` 的回合章）读 `vis.silhouette@rank`、时钟（`el.clock` 的框）读 `vis.silhouette@panel` / `@el.clock`，B1 · 66 起地图与路线的节点读 `vis.silhouette@node`；小地图（外形跟 `el.minimap.form`）与世界里的目标标记还没按它画；
  - 面板插画槽 `cmp.panelArt@el.selection`、模板容器的 `cmp.panelArt@panel`（M12a-36）；图窗的处理 / 外框 / 宽高比 / 图注 `cmp.panelArtFx / panelArtFrame / panelArtRatio / panelArtCaption`（M12b-32，按 @panelArt → @元素 → 全局）；
  - 卡牌（M12b-12 / 69，按 `@card` → 元素 → 全局，选过才换；旧皮肤只认皮肤之后的层）：卡面版式 `cmp.card@el.abilities = playingCard`（Balatro 手牌）、语义着色 `cmp.cardColorBy`、卡内子件 `cmp.cardParts`（`@tooltip` / `@card` 给选中信息的说明框 / 数据卡）；手牌叠压 / 出屏 `lay.cardOverlap / cardBleed@el.abilities`。网格格子画成卡要写 `cmp.slot = card`（只写 `cmp.card` 时方格照旧是格子）；
  - 数据区与详情（M12b B8，审查修复 ③ / ⑥ / ⑧ 补齐）：详情字段 `cmp.detailFields`（@tooltip 只换浮动详情的字段：`cmp.detailFields@tooltip = ["name", "type", "desc", "statCards"]`，control#10 / #30；常驻详情 / 记录页按全局）、列表上方的选择条 `cmp.listHeader`（@listRow）、格组的计数与标题位置 `cmp.slotGroup / slotGroupTitle`（@slotGroup）、引线 `cmp.leader / leaderEnd`（@tooltip = 浮框 → 它说明的格子 / 节点、@mapLabel = 兴趣点 → 抬高的地名牌、@slotGroup = 身体部位 → 格组；**全局值三处都画**——ITB 只要浮框的折角线写 `cmp.leader@tooltip = elbow`，地名牌才不跟着抬）、连线 `vis.connector`（`vis.connector@el.crosshair = chevronChain` 只换出牌指向的画法，slay-the-spire#13；节点图本身按全局画）、列表行字段 `cmp.listRow`（`cmp.listRow@el.party = ["level"]` 给队伍状态带写等级，octopath#16；模板列表行本身按全局排）、分组标题的标牌 `cmp.plate@groupHeader`（+ `col.surface@groupHeader`，civ6#19）；
  - 控件与对话（M12b B9，B9 审查修复 ⑨ 补齐）：选中面板的字段 `cmp.detailFields@el.selection`（只换 `el.selection` 新画法里的字段；浮动详情仍是 `@tooltip`、常驻详情 / 记录页按全局）、对话框尾巴 `cmp.dialogTail@dialog`（新版式与原来的 bar 托盘都认）；对话框版式 `cmp.dialogBox@dialog` 原来就按 @dialog 读；
  - 动效：`mo.valueChange@el.vitals`（生命条怎么变）、`mo.valueChange@el.resources`（资源跳数）、`mo.juice@el.feedback`（飘字放大）、`mo.juice@el.x`（这个元素自己的震动幅度：0 = 震屏时它不动）。
  不在清单里的作用域键（例如 `typ.display.scope@title`：展示字体的作用范围是全局的角色清单，不按目标读）校验给"⚠"提醒，画面上按全局值画；只给个别参数用的目标（`@frame / @core / @well` 只认 `vis.depth`、`@icon` 不认图标画风 / 着色）也给"⚠"。颜色角色（M12a-02）：原来写死的生命红、敌人 / Boss 条与准星激光的危险色、主货币与目标的金色、评级 / 暴击 / 通知首行 / 引导框的高亮黄，现在都走 `th.roles`：写了 `col.accent@<元素>` 时**第一条**改用作用域强调色（生命元素的生命行、选中信息的第一条状态、资源栏的主货币、目标标题与标记、敌人血条……），`col.accent2@<元素>` 改第二条（生命元素的护盾行、选中信息的第二条）；全局的好 / 警告 / 坏色用 `col.good / col.warn / col.bad`（也可 `@el.x`）。`col.strategy = mono` 在复刻里写了时，这些语义色都映射到强调色的明度阶（完成 / 好 / 坏 / 生命 = 强调色，当前 / 警告 / 高亮 = 提亮）——要单色以外的生命色就再写 `col.bad`；`duotone` 只改节点三态（完成 = 强调色、当前 = 第二强调色）。
- 旧的 14 个皮肤：作用域键和全局键一样，只有皮肤之后的层（手动、显式关键词、节日、本屏覆盖……）给的才生效，复刻里写的都算。
- 样本与排布（M12a-10 / 20 / 29）：样本里的锁定 / 冷却 / 新品 / 稀有度是按序号的演示（`cnt.stateDemo`，内容包逐条声明了状态时自动关），锁定起点 `cnt.lockedFrom`，节点进度 `cnt.progress`；`cnt.itemCount` 显式写了以后列表样本不够会循环取并编号，没写时网格 / 树 / 星图跟 `cnt.density`。多项元素：`elx.count`（`el.abilities.count` 等）、`el.abilities.arrangement`（row / column / grid / cross / pyramid / ring / zigzag2，**元素级要显式写**，继承的 `lay.arrangement` 只认 column）、`el.abilities.rows / groups / pages`、`elx.keyHint`（auto / corner / below / none）、`elx.durability`、`el.toolbar.fill`（通高 / 通宽）、`el.choices.arrangement = ring`。
- 局内 HUD 的旧四控件样本（没选品类布局时的 M1 样本）与 M3.5 的菜单样本不走元素上下文，作用域键在那里不生效。

### 数据区、图结构与详情的写法（M12b B8；B8 审查修复 ⑧）

- **多选参数里的 `auto` 与 `derive`**：`auto` = 跟随预设（与不写一样，写成 `["auto"]` 也是），`derive` = 按数据形状派生。`cmp.detailFields = ["derive"]`：图鉴 → 插画 / 名字 / 长文 / 进度点，层级 / 关系网 → 名字 / 说明 / 成本 / 解锁 / 按钮，记录 → 名字 / 说明 / 属性条 / 按钮，其余（物品）→ 稀有度 / 名字 / 下划线 / 类别 / 持有 / 说明 / 按钮；写具体字段时按写的顺序从上往下排，「`|`」之后的字段放右栏（`lay.detail = wide` 的两栏）。字段放不下时先省插画、再把说明 / 长文 / 词缀截到至少一行，还不够才从后往前省（名字与按钮留着）。挂点卡片（`lay.container = anchoredCard`）的拾取卡要写 `lay.panelFit = fitContent`，卡才按字段长高（dead-cells#21）。
- **图的写法**：方向 / 层数 / 分叉（`lay.flowDir / layers / branching`）只对树（`lay.arrangement = tree`，或数据形状 network / hierarchy 没写排布）；放射树（`radialTree`）认 `lay.rootEmphasis = none`（根不放大），宽数据区自动拉成椭圆（长的一边最多 1.6 倍）。路线图（`cnt.subtype = routeMap`）改了版式、或连线写 `vis.connector = progress` 时，完成 / 当前沿着图上的一条路走（`cnt.progress` = 走了几步）；`lay.overflow = longScroll / pan` 的长图（层多、节点要挤小）按节点尺寸排层、滚到当前节点，终点 Boss 可能在视窗外。版式节点（墨色剪影、类型圆章……）画路线图时把包里的路线单字换成类型符号（战 → ⚔、精 → ⛨、店 → ◈、火 → ♨、王 → ★……），`lay.rootEmphasis = end` 时只有终点是 Boss。
- **数据区构图**：分段 `lay.sections`（有序）、段内子栏 `lay.subColumns`（详情里的属性表——`lay.detail = wide / statsPanel`、`cmp.detailFields` 含 statTable——也按它分栏）、第三区 `lay.sideRegion`（只在 `lay.composition = three` 且主体不在上 / 下时有；第三区放了东西时主体两侧列的右列让给它，格组只排在左边的数据栏里）、整组限宽 `lay.groupMaxW`、纵向居中 `lay.dataAlign`、双窗停靠 `lay.container = windowPair`（`lay.panelWidth / panelHeight / vAlign / panelFit`、`cmp.modal = floating` 作用到整组两窗）+ `lay.dockContent`。固定分组 `lay.arrangement = fixedGroups` 放不下时先把格子缩到 34、28 再省组；Hollow / 黑神话这类没有「可用 n」计数的写 `cmp.slotGroup = plain`。经营面板（`cnt.screen = screen.manage` 的表单）的 `lay.columns = 2` 在一栏放不下两根条时退回一栏。
- **书本**：`ast.bookStyle`（flat = 硬边书）、`ast.pageLeft / pageRight`（endpaper 衬页 / framed 扉页框 / plain 素页 / content）；翻页角 `lay.pageIndicator = pageCurl` 画在装内容的那一页的右下角（不是数据区的角）。

### 控件与对话的写法（M12b B9；B9 审查修复 ⑨）

- **对话框版式**（`cmp.dialogBox` = offsetBox / framedBox / topBox / splitPortrait / transcript / codec / polygon，按 `@dialog` → 全局读）：只对对话类模板（`cnt.subtype` = npc / dialogueWheel / cutscene 或 `cnt.screen = screen.dialogue`）生效，容器是托盘 / 底部浮层 / 抽屉 / 弹窗 / 窗口 / 横幅 / 叠加 / 无容器都换（审查修复 ②：原来只有前三种，Persona 的叠加、Hollow 的横幅、ITB 的弹窗、Dead Space 的窗口上写了等于没写）；全屏页 / 挂点卡片 / 双窗不换。叠加 / 横幅 / 无容器上对话框单独一块，其余元素（时钟、按键图例……）躲开它；没有页头行时说话人名签骑在框的左上沿。主体的站位由版式定：人物站在框旁（尾巴 `cmp.dialogTail` 指向它），头像分框 / 通栏细框 / 通讯框的头像槽代替站姿（不必再写 `cnt.focal`；`cnt.characterMedium = videoFeed` 的视频窗与 codec 二选一），场景主体铺整屏。没写 `cnt.dataShape`、按 `cnt.textLength` 推出来的「一句话」由对话框画（字幕元素不另画）；写了 `cnt.dataShape = text` 的长文照常画在框里，**累积日志（transcript）连这段长文也并进日志**（段首是「技能 [难度：结果] ——」的段落说话人就是那个检定，Disco 的技能发言）。顶部框 / 头像分框里有选项（`el.choices` 在容器里排）时框长出一块选项区；底部有视觉小说控件（`ix.skip = vnControls`）时贴底的版式让出那一条。
- **局内字幕元素**（`el.subtitle` 自己画，不在对话类模板里）上新版式照旧是底条；只想拆掉「说话人：」前缀写 `el.subtitle.speaker = none`（与 `el.subtitle.form` 正交：`boxed` + `none` = 有底条无前缀，Hollow#34 不用 topBox 时的写法），topBox 本身不写名牌与前缀。尾巴 `cmp.dialogTail`（`@dialog` 可写）原来的 bar 托盘也认；叠加容器上要配一个新版式（polygon……）才画。
- **选中面板**（`el.selection` 的 sidePanel / cityPanel / entityInfo / buildingPanel / dossier / shotCalc / bareText / cardStack）：面板里的字段按 `cmp.detailFields@el.selection` 换（全局的 `cmp.detailFields` 仍管模板的详情栏，两处互不影响；建筑面板 / 档案卡自带头图，字段里写 art 不另占）。同一屏两块面板 = 元素实例：`cnt.elements` 加 `el.selection#2`，再写 `el.selection#2.form` / `el.selection#2.screenAnchor`（Civ6 的城市侧栏 + 右下城市面板）。命中计算（shotCalc）底边那排就是技能栏，XCOM 这类写了它可以去掉 `el.abilities`。
- **表单**：`cmp.optionRows` 是**有序**多选——第 i 项 = 第 i 行的控件（`auto` = 这一行照原来）；取值表类控件（arrows / segmented / dropdown / swatch）换到滑条 / 开关行时借设置页的取值表 1。没换的行按全局的 `cmp.optionEnum / optionRange / optionBool` 在自己的控件族里画（滑条行写 arrows = 带 − / ＋ 的数值、开关行写 arrows / segmented = 关 / 开；审查修复 ①：原来这样写整屏报错）。`cmp.optionLayout = stacked` 两层小框，`cmp.optionNative` 浏览器原生外观，`cmp.formKind = inlineBlanks` 句内填空。
- **页签挂法** `cmp.tabMount`：cradle / arcCradle 任何页签条都认；outsideTop 只在 `lay.nav = tabsTop`、bookmark 只在 `tabsLeft / tabsRight` 时挂（面包屑 / 轮播没有页签条）。
- **播报元素**：`el.ticker`（news 上中整宽 / stocks 右下）、`el.lowerThird`（左下）、`el.viewfinder`（整屏取景框）经 `cnt.elements` 加；锚点没写时按画法的默认位置（formAnchor）。取景框的四角括角、REC、电池、时间码是跟画面走的小件：别的元素排位时让开它们，挪不动的一整列时 REC / 电池 / 时间码自己挪到旁边。
- **选项**：`el.choices` 认全局 `elx.arrangement` 的 ring / fan / cascade（B9 起 fan 也认，与 ring 同口径；只想排一个元素就写 `el.choices.arrangement`）；`el.choices.defaultFocus = none` 去掉默认高亮，`bracketTag` 的「不高亮」只管富文本那两处（环上的照旧高亮第一项）；`labelStyle = checkTag` 的概率卡挂在选项上沿以外。
- **贴满屏宽** `elx.span = full`：只对 `el.notify`（横幅）/ `el.subtitle` 有用，可写元素级 `el.subtitle.span`。工具条附件（`el.toolbar.screenCode / extras`）在竖排 / 通高的条上排在条的下面。

### 地图、全屏层、倾斜与像素化的写法（M12b B10；B10 审查修复 ⑥）

- **地图画风** `vis.mapStyle`（+ linePlan / vectorOutline / hexChart / chart / inkTiles / frostSketch / pencil / desatTerrain，引擎烘焙的程序图，不是位图）：大地图与小地图读同一个；`vis.mapStyle@el.minimap` 只给小地图换，而且**只换地形层**——`el.minimap.layers` 里没写 terrain 时画风不起作用（forza-horizon-5#9 只写 `["roads", "route"]`：暗底 + 道路线 + 亮带）。`rel.semanticZoom = chart` 拉远切类别色块（小地图跟着）；chart / hexChart 在 `col.coding` 含 lineId 时用 `col.lineColors` 做类别 / 阵营色。
- **未探索区** `vis.mapUnexplored` + cloudSwirl（卷云，设备分辨率画在软边遮罩上）/ unpainted（未上色底稿）/ dashedExits（虚线出口）；揭开的范围另加已访问节点与路线（`vis.mapRevealRadius`、雾色 `col.fog`）。**出血地图**（`lay.mapBleed`）：地图与遮罩铺整屏，节点 / 地名排在整屏宽、页头与页签以下、底部按键图例以上的那一条（B10 审查修复 ⑪），遮罩按同一换算揭开。
- **地图部件**：`vis.mapFurniture`（compassRose 右上 / scaleBar 左下「0 … 1 km」，数字走数字字形 / legend 右下）、`vis.mapFloors`（left / top，楼层表 = 内容包 `world.floors / floor`）、`vis.mapRoute`（solid / dashed，`lay.currentMarker = avatar` 时头像挂在路线中点）、`vis.mapRoomStates = states`；都登记模板 data 占位。
- **小地图** `el.minimap`：`aspect`（square / wide / strip，只对 plan；选了 wide / strip 时地图按长边铺成方块、跟着玩家——用 `elx.width / height` 改宽高的照旧把地图拉满）、`rotate = headingUp`、`layers`（terrain / roads / route / pois，有序无关）、`compassText`、`cornerCurl`；新画法 roomGraph（房间 = 内容包 `hud.rooms`）/ tickLine。
- **叠层图例** `el.overlay.legendStyle / legendAnchor`（九宫锚点，默认 br）：内容取内容包 `hud.legends[画法]`；图例最后画、叠层图形裁掉图例那块（B10 审查修复 ⑫），statRows 的条目带颜色时名字前有色签（cities 的线路网可以写 statRows）。线路网（routeLines）画了就有图例。
- **屏幕边缘遮罩** `ast.screenEdge`（多选）+ `ast.screenEdgeColor / Strength / Layer`：under = 背景之上（替换背景、整屏主体、出血地图都在它下面）、面板之下；over = 面板与文字之上（飘字 / 横幅等模拟反馈与运营合规层仍在上面）。局内 HUD、界面模板、只画元素的叠加模板、菜单样本、四控件样本都画；按尺寸缓存，每帧只贴图。异星字带 / 六角暗角也能当水印（`ast.watermark` / `watermark2`，强度按水印）。
- **局内替换背景**：`rel.behind = replaced` + `ast.bgArt` = shaderSwirl / skyClouds / backlight（上一节）；Balatro 每屏不同的漩涡色写 `ast.bgColors`（不要为了换漩涡色去改 `col.accent / accent2`——那会连筹码蓝 / 倍率红一起换）。
- **倾斜**：`vis.tiltMode`（random 逐块随机 / uniform 同一个角 / alternate 满角正反）、`vis.tiltLayers`（box 只转盒子 = 原来的 / boxAndContent 连字一起转 / textOnly / split）；界面模板的容器整块转绕容器中心，跨界面常驻层不转。
- **按角色像素化** `vis.pixelRoles`（text / display / numerals / icons / frame / bars）与 `typ.rasterize`（off / world / x2 / x3，不换字族）：阴影 / 发光按画到的那一层算；弹出模板与它的垫底之间、浮动详情之前各层先合成下去。限制：同一层次里按 框 < 条 < 图标 < 字 整层合成——frame 与 bars / icons 分开选时，叠在一起的元素里另一层的条 / 图标压在框上，复刻里别把它们拆开（dead-cells#0 只写文字角色）。
- **K1 余项**：`vis.misregister / misregisterAngle`（错版）、`ast.aging`（做旧，同尺寸的盒子各不相同）、`vis.depth = layeredPaper`、`vis.lightAngle`（与 `vis.depth` 同层给出才重算 soft3d / bevel / innerShadow）、`vis.blurTint / edgeLight / grain`、`typ.mix`、`st.selected = inset`。贴边条跨界面常驻：条的成员全都写 `elx.keepOnMenu` 时非弹出模板上连底板一起画。
- **静帧**：`screens[].sim`（字段说明见「字段」一节）在 values 之后套。

### 模板外壳：页头、关闭、背景、叠加容器、分区（M12a-08 / 23 / 24 / 25 / 37）

- **不要页眉**：`lay.titlePos: "none"`（不写模板名）+ `ix.close: "none"`（不画关闭控件）。`ix.close` 没写时由派生规则推：`ix.dismiss` = forced / timed 或 `lay.titlePos = none` → none，其余兜底右上 ✕；以前为了去掉 ✕ 写的 `keyGlyph`（「Esc 返回」胶囊）现在可以改回 none，返回写在 `el.prompt` 图例里。
- 标题位置 `lay.titlePos`：panel（面板内，默认）/ screenTop（画面顶部居中 + 下划线 `vis.stroke@title` + 副题）/ straddle（标牌骑在面板上缘）/ onFocal（标牌压在立绘顶部、写角色名）/ none；`lay.titleAlign`（left / center）、`lay.titleSubtitle`（none / italic / caps，文字取内容包 `screens.titleSub`，没写时游戏英文副标题）。对话类模板（npc / dialogueWheel / cutscene）的标题位写说话人名。
- 关闭 / 返回：`ix.close` 加 none / bottomCenter（面板底边正中悬挂红圆 ✕）/ innerBR（内框右下小 ✕）；`ix.back`（none / arrow / labeled）能与关闭钮同时画，读 `cmp.button` 与 `vis.silhouette@button`。
- 页头字体读作用域的 `typ.display.family` / `typ.titleFx`；书法字体或 drybrush 时页头换楷体，drybrush 加枯笔描边。写了 `@titleBar` 的样式（`vis.pattern@titleBar`、`col.surface@titleBar`）时页头垫一条标题带。
- 饰件：`lay.ornamentInset`（auto = 角花与分隔线占位、标题 / 关闭钮 / 按钮行让开；none = 原来的叠放）；`vis.dividerStyle: "plain"` = 分隔饰条只有两段线；角花位图按饰色着色（白描角花写饰色白 / 描线材质）。
- 背景：替换背景（`rel.behind: "replaced"`）的 `ast.bgArt` 全部取值都画（material + `ast.bgMat` + `ast.bgMatAngle`、starfield、spotlightStage、pattern），`solid` 读 `col.surface2`，铺满整张画布；`ast.watermark` 在模板里也画（背景之上、容器之下）。`rel.sceneTone` 改多选（`["tint", "vignette"]` = 中间暗、四周染色），`rel.vignette` 暗角强度；局内 HUD 写了 `rel.dim` / `rel.sceneTone` 也会在元素下面压暗 / 着色。M12b B10：`ast.bgArt` 加 shaderSwirl（漩涡：配色 `ast.bgColors` 有序、按屏写——第 1 / 2 / 3 项 = 低值 / 中值 / 亮边色，没写时强调色 / 第二强调色 / 面板底色；流速 / 扭曲 `ast.bgFlow / bgWarp`；彩纸 `ast.bgConfetti`）、skyClouds（像素云天，前景 `ast.bgForeground`）、backlight（背光）——这三种在**局内 HUD** 上也画（`rel.behind = replaced`，Balatro 的漩涡底就是 UI 的底；场景处理只做一次），其余取值的局内 HUD 照旧不画替换背景；第二层水印 `ast.watermark2`（强度 `ast.watermark2Opacity`，没写时跟第一层）；屏幕边缘遮罩 `ast.screenEdge` 见上面「M12b B10 的写法」。
- 叠加容器：`lay.container = overlay / banner / none` 的模板有数据（`cnt.dataShape`）、主体（`cnt.focal`）或替换背景时仍走模板构图器——不画面板和页头，数据直接铺在场景上，只有主体时立绘按 `lay.focalSide` 站在一侧贴底。这类容器下 `cmp.modal`、`ix.close`、`lay.titlePos` 等不生效（检查 C-overlay-chrome 提示）。
- 分区：`cmp.modal: "perRegion"`（不画总框，数据区与常驻详情各一块半透明深底）；显式写 `lay.layering: "separate"` 且主体与数据分栏时只给数据那一栏画面板（主体站在背景上）；`lay.splitRatio`（主体占比 0.2–0.8）；`lay.grouping: "divider"` 画 1px 分栏线（`col.border`）。

## 评分口径（只看 UI 层）

| 项 | 看什么 |
|---|---|
| layout | 各信息元素的位置、分区、留白、对齐 |
| elements | 元素的画法（条 / 圈 / 格 / 图标 / 列表 / 卡片……）与数量 |
| palette | UI 的配色：底、字、强调色、明暗 |
| type | 字体类别、字号层级、大小写、描边 |
| shape | 面板形状、边框、外框材质、饰件、图标风格 |
| density | 信息密度与层级（一眼先看到什么） |
| overall | 整体"像不像这款游戏的 UI"（不看世界美术） |
