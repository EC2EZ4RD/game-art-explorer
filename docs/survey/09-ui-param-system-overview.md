# 游戏 UI / UX / HUD 调参体系 · 总览

> 由 `docs/survey/data/ui-param-system.json` 自动生成（`scripts/refs/param-overview.py`），完整说明见 `docs/survey/09-ui-param-system.md`。

规模：18 个维度组、647 个参数、3220 个取值；222 个预设；37 条派生规则。
复测：22 / 30 能完整编码（73%）；v1 实测为 44 / 88（50%）

## 维度组与参数

### 设备与操作（8）
设备、画幅、输入、时间压力、同屏人数、语言。几乎都由「平台预设」「品类布局」给默认值，但每项都能单独改（PC 也能用手柄，竖屏也能是回合制）。

- **画幅朝向** `ctx.orientation` · global · choice · M10：横屏、竖屏
- **屏幕宽高比** `ctx.aspect` · global · choice · M10：16:9、21:9 超宽、4:3、16:10 掌机 / 平板、19.5:9 手机长屏
- **设备与观看距离** `ctx.device` · global · choice · M10：手机、平板、PC 显示器、主机 / 电视、掌机（Switch / Steam Deck）
- **输入方式** `ctx.input` · global · choice · M10：触屏、键鼠、手柄、键鼠 + 手柄自动切换
- **时间模型** `ctx.timeModel` · global · choice · M5b：实时、实时可暂停 / 变速、实时暂停战术、回合制
- **回合限时** `ctx.turnTimer` · global · toggle · M5b：
- **同屏玩家与视口** `ctx.players` · global · choice · M7：单人、本地合作共享一屏、分屏、1v1 镜像对战、线上队伍（队友栏 + 记分）、四人派对 等 7 种
- **文案语言** `ctx.locale` · global · choice · M2：简体中文、英文 / 拉丁、日文、中英并置

### 内容（这一屏显示什么）（26）
界面类型、子功能、阶段、数据状态、信息元素、数据结构、文字量、主视觉。与"怎么画"无关，是一切版式的起点。

- **示例内容包** `cnt.pack` · global · choice · C1：跟随品类、雪线旅人（探索）、铁炉矿坑（动作与 Roguelite）、没落王城（魂类）、萤火深处（横版平台 / 类银河城）、轨道封锁（射击） 等 25 种
- **界面子功能** `cnt.subtype` · screen · choice · M9a：跟随预设、登录、选服、创建角色 / 捏脸、公告、起名 等 80 种
- **界面类型** `cnt.screen` · screen · choice · M9a：局内 HUD、标题 / 主菜单、暂停菜单、设置、背包 / 物品、角色 / 装备 / 属性 等 27 种
- **基础界面 / 浮层** `cnt.layer` · screen · choice · M9a：基础界面、浮层
- **流程阶段** `cnt.stage` · screen · choice · M9b：入口 / 选择、浏览 / 进行中、等待 / 搜索、确认 / 消耗前、揭示演出、结果
- **数据状态** `cnt.dataState` · screen · choice · M9a：有数据、空、未解锁 / 预告
- **信息元素集合** `cnt.elements` · screen · multi · M5a：跟随预设、生命 / 护盾 / 体力、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、小地图 / 罗盘、目标 / 路点 等 43 种
- **主数据结构** `cnt.dataShape` · screen · choice · M9a：跟随预设、无数据、单个数值、单项详情、同类集合、对比表 等 12 种
- **信息密度** `cnt.density` · screen · int · M5a：极简、稀疏、中等、密集、极密
- **主体条目数** `cnt.itemCount` · screen · int · M5a：跟随预设
- **样本状态演示** `cnt.stateDemo` · screen · choice · M12a：跟随预设、演示、只画声明的
- **锁定从第几个开始** `cnt.lockedFrom` · screen · int · M12a：跟随预设、不锁
- **格子总数** `cnt.slotCount` · screen · int · M12a：跟随预设
- **已占用格数** `cnt.filledCount` · screen · int · M12a：跟随预设
- **占用比例** `cnt.fillRatio` · screen · range · M12a：跟随预设
- **空格分布** `cnt.fillOrder` · screen · choice · M12a：跟随预设、从前往后、穿插
- **样本进度（已完成几个）** `cnt.progress` · screen · int · M12a：跟随预设
- **样本血量** `cnt.sampleHp` · global · range · M12b：跟随预设
- **文案量** `cnt.textLength` · screen · choice · M5a：无文字、单个词、仅标题、一句话、短段（2–3 句）、长文滚动
- **主视觉主体** `cnt.focal` · screen · choice · M9a：跟随预设、无（信息就是主体）、标题字、角色、场景、物品 / 奖励 等 9 种
- **主体物品：带不带框** `cnt.focalFrame` · screen · choice · M12b：跟随预设、带框、无框展台
- **主角色呈现介质** `cnt.characterMedium` · screen · choice · M9a：跟随预设、头像级、Q 版小人、半身立绘、全身立绘、3D 实时模型 等 10 种
- **陪衬角色** `cnt.companion` · screen · choice · M9a：无、吉祥物 / NPC 陪衬、说话头像
- **角色画法处理** `cnt.characterRender` · screen · choice · M9a：彩色原样、素描、浮雕、版画 / 铜版、线稿、单色 等 8 种
- **插画画法处理** `cnt.illustrationRender` · screen · choice · M12b：跟随预设、彩色原样、素描、浮雕、版画 / 铜版、线稿 等 9 种
- **文案语气** `cnt.tone` · screen · choice · M9a：系统式、角色口吻、叙事式、激励、冷峻 / 惩罚、凯旋 / 胜利 等 8 种

### 结构与版式（怎么排）（79）
容器、构图、条目的几何排布、导航、详情、分组、层叠、溢出。只决定位置与关系，不决定质感。

- **容器** `lay.container` · screen · choice · M9a：跟随预设、不画 UI、直接叠加、横幅 / 提示条、居中弹窗、侧抽屉 等 13 种
- **容器尺寸** `lay.panelSize` · screen · range · M9a：跟随预设
- **容器宽** `lay.panelWidth` · screen · range · M12b：跟随预设
- **容器高** `lay.panelHeight` · screen · range · M12b：跟随预设
- **容器宽高比** `lay.panelAspect` · screen · choice · M12a：跟随预设、方、竖幅、4 : 3、3 : 4、满高竖栏
- **容器按内容收放** `lay.panelFit` · screen · choice · M12a：跟随预设、固定尺寸、按内容收放
- **容器竖向位置** `lay.vAlign` · screen · choice · M12a：跟随预设、靠上、居中、靠下
- **容器横向位置** `lay.panelAlign` · screen · choice · M12b：跟随预设、靠左、居中、靠右
- **容器横向偏移** `lay.panelOffset` · screen · range {'min': -0.5, 'max': 0.5, 'step': 0.05} · M12b：
- **抽屉贴边** `lay.drawerFlush` · screen · toggle · M12a：
- **标题位置** `lay.titlePos` · screen · choice · M12a：跟随预设、面板内左上、画面顶部、骑在面板上缘、压在立绘上、不写标题
- **标题对齐** `lay.titleAlign` · screen · choice · M12a：跟随预设、左对齐、居中
- **标题副题** `lay.titleSubtitle` · screen · choice · M12a：跟随预设、无、斜体副题、大写小字
- **页头图标槽** `lay.headerIcon` · screen · choice · M12b：跟随预设、无、徽章、框住的图标
- **面板抬头** `lay.panelHeader` · screen · choice · M12b：跟随预设、标题、勋章 + 两行名
- **HUD 组织方式** `lay.hudOrg` · screen · choice · M7：跟随预设、分散组件、整合底座、贴边整条、画在玩法区外的边框里
- **贴边条：哪条边** `lay.hudEdge` · screen · multi · M12a：上边、下边、左边、右边
- **贴边条长度** `lay.hudEdgeSpan` · screen · choice · M12b：整条边、按内容收短
- **贴边条：条内顺序** `lay.edgeBarSlots` · screen · multi · M12a：
- **玩法区形态** `lay.playfield` · screen · choice · M7：全屏、4:3 / 小窗加黑边、居中竖条 + 两侧装饰区、棋盘 / 关卡窗、画中画、分屏视口
- **分区方式** `lay.composition` · screen · choice · M9a：跟随预设、单区、左右分栏、上下分栏、三栏、斜切分屏 等 7 种
- **第三栏内容** `lay.sideRegion` · screen · choice · M12b：跟随预设、空着、列表、详情、属性表、元素
- **数据区分段** `lay.sections` · screen · multi · M12b：网格、一行格子、列表、属性表、长文、格组
- **段内子栏** `lay.subColumns` · screen · range · M12b：跟随预设
- **整组限宽** `lay.groupMaxW` · screen · range · M12b：跟随预设
- **数据纵向对齐** `lay.dataAlign` · screen · choice · M12b：跟随预设、靠上、垂直居中
- **停靠窗内容** `lay.dockContent` · screen · choice · M12b：跟随预设、背包、列表、详情
- **分栏比例** `lay.splitRatio` · screen · range · M12a：跟随预设
- **主体位置** `lay.focalSide` · screen · choice · M9a：跟随预设、居中、左、右、两侧（对话双人 / 对阵）、上 等 8 种
- **主体旁的装备格与文字** `lay.focalAside` · screen · choice · M12b：跟随预设、不分、装备格 + 文字
- **条目排布几何** `lay.arrangement` · screen · choice · M9a：跟随预设、横排、竖列、规则网格、六角网、环绕中心 / 轮盘 等 23 种
- **环形菜单：当前项名字** `lay.ringLabel` · screen · choice · M12b：跟随预设、不写、环心、环顶
- **环形菜单：二级弧** `lay.ringNested` · screen · choice · M12b：跟随预设、不画、外侧二级弧
- **错落菜单的铺开** `lay.cascadeSpread` · screen · choice · M12b：跟随预设、紧凑、沿对角线铺开
- **树的生长方向** `lay.flowDir` · screen · choice · M12b：跟随预设、自上而下、自下而上、从左往右（按层分列）、从右往左
- **树的层数** `lay.layers` · screen · range · M12b：跟随预设
- **分叉方式** `lay.branching` · screen · choice · M12b：跟随预设、对称、按种子分叉合流
- **根 / 终点放大** `lay.rootEmphasis` · screen · choice · M12b：跟随预设、不放大、根放大、终点放大（Boss）
- **牌阵** `lay.spread` · screen · choice · M12b：跟随预设、十字、凯尔特十字、三角
- **当前项抬高** `lay.raisedCurrent` · screen · toggle · M12a：
- **手牌：叠压** `lay.cardOverlap` · screen · range · M12b：跟随预设
- **手牌：下缘出屏** `lay.cardBleed` · screen · range · M12b：跟随预设
- **网格列数** `lay.columns` · screen · int · M5a：跟随预设
- **格子宽高比** `lay.cellAspect` · screen · range · M12a：跟随预设
- **格子边长** `lay.cellSize` · screen · range · M12a：跟随预设
- **格子间距** `lay.gap` · screen · range · M12a：跟随预设
- **分区导航** `lay.nav` · screen · choice · M9a：跟随预设、无导航、顶部页签、底部页签、左侧页签、右侧页签 等 10 种
- **分类级数** `lay.navDepth` · screen · int {'min': 0, 'max': 3, 'step': 1} · M9a：
- **页签托槽** `lay.navRail` · screen · choice · M12b：跟随预设、无、横托槽、弧形托槽
- **页签数** `lay.navCount` · screen · range {'min': 1, 'max': 10, 'step': 1} · M12b：
- **页签对齐** `lay.navAlign` · screen · choice · M12b：跟随预设、靠左、居中、铺满
- **页签分隔** `lay.navSeparator` · screen · choice · M12b：跟随预设、不分隔、竖线、圆点
- **第二导航（头像栏）** `lay.nav2` · screen · choice · M12b：跟随预设、不画、左缘头像栏
- **抽屉从哪边滑出** `lay.drawerSide` · screen · choice · M12b：跟随预设、右边、左边
- **容器外侧按钮列** `lay.sideButtons` · screen · choice · M12b：跟随预设、不画、右外侧、左外侧
- **容器外侧缩略图列** `lay.sideThumbs` · screen · choice · M12b：跟随预设、不画、右外侧、左外侧
- **双窗间距** `lay.windowGap` · screen · range {'min': 0, 'max': 240, 'step': 2, 'unit': 'px@1080p'} · M12b：
- **双窗连线** `lay.windowLink` · screen · choice · M12b：跟随预设、不连、直线、折角线
- **页签切换键** `lay.navKeys` · screen · choice · M12a：跟随预设、两端画切换键、不画
- **热区标记** `lay.hotspotCue` · screen · choice · M12b：跟随预设、不标、只标选中项、只标编号
- **详情呈现** `lay.detail` · screen · choice · M9a：跟随预设、无详情、行内展开、常驻一侧、临时出现、集合下方 等 9 种
- **详情字段（按序）** `cmp.detailFields` · globalScreen · multi · M12b：跟随预设、按数据形状派生、右栏分隔、稀有度字、名字、名下细线 等 42 种
- **浮动详情停靠** `lay.floatDock` · screen · choice · M12b：跟随预设、挨着选中项、网格右缘外
- **即时预览** `lay.preview` · screen · toggle · M9a：
- **分组方式** `lay.grouping` · screen · choice · M3a：跟随预设、面板、卡片、色块 / 斑马纹、分隔线、留白 等 9 种
- **主体与面板层叠** `lay.layering` · screen · choice · M9a：跟随预设、互不遮挡、主体出框压面板、面板压主体、主体作整屏背景
- **内容溢出方式** `lay.overflow` · screen · choice · M9a：单屏、纵向滚动、横向滚动、分页、长卷、可拖动大画布
- **分页指示** `lay.pageIndicator` · screen · choice · M9a：跟随预设、左右箭头、圆点、页码、不提示、翻页角
- **按钮行对齐** `lay.buttonRowAlign` · screen · choice · M12b：跟随预设、靠左、居中、靠右、两端分开
- **拖动提示** `lay.panHint` · screen · choice · M12b：跟随预设、不画
- **地图出血** `lay.mapBleed` · screen · choice · M12a：跟随预设、铺满整屏、装在框里
- **固定 / 置顶项** `lay.pinned` · screen · choice · M9a：无、顶部置顶行、底部固定行、专属页签
- **置顶行：格子边长** `lay.pinnedCellSize` · screen · range · M12b：跟随预设
- **网格页眉** `lay.gridHeader` · screen · choice · M12b：跟随预设、无、分类小标题、选中项名字
- **网格页脚** `lay.gridFooter` · screen · choice · M12b：跟随预设、无、排序键提示、选中项名字
- **网格行横档** `lay.rowRule` · screen · choice · M12b：跟随预设、无、细线、搁架横档
- **安全边距** `lay.safeMargin` · global · range · M10：跟随预设
- **饰件占位** `lay.ornamentInset` · screen · choice · M12a：按饰件让位、不让位
- **对齐体系** `lay.grid` · global · choice · M3a：跟随预设、自由、8 点网格、12 栏

### 层级与强调（8）
强调配方、正文内强调、主次按钮、非选中压暗。与"用什么颜色、什么形状"分开：同样的强调手段可以出现在任何皮肤里。

- **强调配方** `hier.emphasis` · screen · multi · M8a：跟随预设、尺寸、颜色、明暗对比、发光、字体反差 等 7 种
- **正文内强调** `hier.inline` · globalScreen · choice · M5a：跟随预设、不强调、红字、加粗、★ 符号、彩色标签 等 7 种
- **正文内多色语义** `hier.inlineMap` · globalScreen · multi · M12b：关键词、增益、减益 / 代价、升级值、类别色、方括号注释 等 7 种
- **自动涂黑比例** `hier.redactRatio` · globalScreen · range {'min': 0, 'max': 0.3, 'step': 0.02} · M12b：
- **决断句** `hier.callout` · globalScreen · choice · M12b：不突出、居中强调行
- **引子** `hier.kicker` · globalScreen · choice · M12b：不突出、小号类别字 + 线
- **主次差距靠什么** `hier.cta` · screen · choice · M3a：跟随预设、平级、颜色 / 饱和度、尺寸、实心 vs 描边
- **非选中压暗** `hier.dimInactive` · screen · range · M5a：跟随预设

### 视觉语言：形、线、面、饰（69）
皮肤里能单独覆盖的形与面。全局参数，可按组件（<参数>@button 等）或按元素（<参数>@el.vitals 等）覆盖，对应 Godot Theme 的 type variation。"程序画 / 用素材"只在资产槽位一侧判定（ast.core / ast.frame）：外框是程序线框时，这里的转角形状才生效；外框是程序线框或"只有四角件"时，描边才生效（四角之间的边由程序线画）。

- **转角** `vis.corner` · global · choice · M3a：跟随预设、直角、圆角、切角、像素台阶
- **圆角 / 切角大小** `vis.cornerSize` · global · range · M3a：跟随预设
- **只做这几个角** `vis.cornerMask` · global · multi · M12b：跟随预设、左上、右上、右下、左下
- **边缘处理** `vis.edge` · global · choice · M3.5：干净、撕边 / 破边、锯齿、笔触、异形轮廓、烧边 / 焦边 等 9 种
- **边缘处理作用在哪几边** `vis.edgeSides` · global · choice · M12b：跟随预设、四边、只做上边、只做下边、只做左边、只做右边
- **小组件轮廓** `vis.silhouette` · global · choice · M5a：跟随转角、不画底座、圆、菱形、六边形、盾形 等 23 种
- **面板外形** `vis.panelShape` · global · choice · M12b：跟随预设、按转角画、椭圆、八角、箭头端（右）、箭头端（左） 等 18 种
- **随机外形的偏移幅度** `vis.shapeJitter` · global · range · M12b：跟随预设
- **笔刷飞白** `vis.brushDryness` · global · range · M12b：跟随预设
- **笔向** `vis.brushDir` · global · choice · M12b：跟随预设、从左往右、从右往左
- **笔锋长度** `vis.brushTip` · global · range · M12b：跟随预设
- **倾斜角** `vis.skew` · global · range · M3a：跟随预设
- **手绘抖动** `vis.jitter` · global · range · M3a：跟随预设
- **底不透明度** `vis.opacity` · global · range · M3a：跟随预设
- **程序填充** `vis.fill` · global · choice · M3a：跟随预设、纯色、渐变
- **两端渐隐** `vis.fade` · global · choice · M12b：跟随预设、不渐隐、左端渐隐、右端渐隐、左右两端渐隐、上端渐隐 等 8 种
- **渐隐长度** `vis.fadeLength` · global · range · M12b：跟随预设
- **图案叠层** `vis.pattern` · global · choice · M3b：无、斜线条纹、黄黑警示条、排线阴影、圆点、网点 等 25 种
- **图案强度** `vis.patternOpacity` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M3b：
- **图案铺在哪** `vis.patternArea` · global · choice · M12b：跟随预设、整块面板、标题带、沿边一条、只在暗部
- **抖动矩阵** `vis.ditherMatrix` · global · choice · M12b：跟随预设、Bayer 4 × 4、Bayer 8 × 8
- **放射中心** `vis.patternOrigin` · global · choice · M12b：跟随预设、中心、上沿、下沿、左沿、右沿 等 8 种
- **背景模糊（毛玻璃）** `vis.blur` · global · range · M3a：跟随预设
- **毛玻璃：着色** `vis.blurTint` · screen · color · M12b：跟随预设
- **毛玻璃：亮边** `vis.edgeLight` · screen · choice · M12b：跟随预设、没有、顶边、左边、顶边 + 左边、四边
- **毛玻璃：颗粒** `vis.grain` · screen · range · M12b：跟随预设
- **描边线型** `vis.stroke` · global · choice · M3a：跟随预设、无描边、实线、双线、虚线、贴纸多重环 等 9 种
- **描边粗细** `vis.strokeWidth` · global · range · M3a：跟随预设
- **线的粗细调制** `vis.strokeModulation` · global · range · M12b：跟随预设
- **描边色** `vis.strokeColor` · global · choice · M3a：跟随预设、墨色、强调色、第二强调色、高光亮边、金属金 / 铜 等 8 种
- **描边画哪几边** `vis.strokeSides` · global · choice · M3a：四边、只画左边、只画右边、上下两条、只画底边、只画四角 等 8 种
- **描边发光** `vis.strokeGlow` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M3a：
- **描边两端渐隐** `vis.strokeFade` · global · range {'min': 0, 'max': 0.5, 'step': 0.05} · M12b：
- **立体与阴影** `vis.depth` · global · choice · M3a：跟随预设、平面、柔投影、错位硬投影、内阴影 / 内凹、倒角浮雕 等 10 种
- **光源方向** `vis.lightAngle` · screen · range · M12b：跟随预设
- **套印错位** `vis.misregister` · screen · range · M12b：跟随预设
- **套印错位：方向** `vis.misregisterAngle` · screen · range · M12b：跟随预设
- **阴影 / 厚度偏移** `vis.depthOffset` · global · range · M12b：跟随预设
- **阴影 / 厚度方向** `vis.depthAngle` · global · range · M12b：跟随预设
- **阴影 / 厚度颜色** `vis.depthColor` · global · color · M12b：跟随预设、墨色、强调色、第二强调色、第二面色、同色加深 等 7 种
- **光泽高光** `vis.gloss` · global · choice · M3a：跟随预设、无、顶部玻璃高光、镀铬条带、金属渐变、糖果塑料高光 等 8 种
- **装饰预算** `vis.ornament` · global · int · M3b：跟随预设、无、少、中、华丽
- **数据噪声密度** `vis.noiseDensity` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M12b：
- **屏幕边也放数据噪声** `vis.noiseEdges` · global · toggle · M12b：
- **装饰母题** `vis.motif` · global · choice · M3b：跟随预设、无、几何线 / 同心圆、角括号 / 准星角、花叶卷草、祥云 / 回纹 等 33 种
- **第二母题** `vis.motif2` · global · choice · M12b：跟随预设、无、几何线 / 同心圆、角括号 / 准星角、花叶卷草、祥云 / 回纹 等 33 种
- **分隔线样式** `vis.dividerStyle` · global · choice · M12a：跟随预设、只画线、线 + 母题符号、牛津线（粗细双线）、膨线、双线 等 8 种
- **分隔线放在哪** `vis.dividerPlace` · global · multi · M12b：跟随预设、面板底边、标题后、块之间、网格行间
- **图标风格** `vis.iconStyle` · global · choice · M11：跟随预设、线性、扁平填充、双色、手绘彩绘、3D 渲染 等 15 种
- **位图图标着色** `vis.iconTint` · global · choice · M12b：跟随预设、原图、去色、压暗、单色、强调色 等 7 种
- **位图图标着色强度** `vis.iconTintAmount` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M12b：
- **UI 像素化** `vis.pixelScale` · global · choice · M3a：跟随预设、清晰矢量、2 倍像素、3 倍像素、4 倍像素、与世界同网格
- **像素化的角色** `vis.pixelRoles` · global · multi · M12b：正文、标题与大字、数字、图标、面板与框、数值条
- **地图画风** `vis.mapStyle` · globalScreen · choice · M6：跟随预设、手绘水彩、羊皮纸古海图、卫星写实、战术线框 / 全息、扁平矢量 等 19 种
- **地图未探索区** `vis.mapUnexplored` · globalScreen · choice · M6：云雾遮挡、压暗、留白（纸面空白）、只有轮廓、全部可见、卷云纹 等 8 种
- **地图揭雾半径** `vis.mapRevealRadius` · screen · range · M12b：跟随预设
- **地图地名** `vis.mapLabels` · globalScreen · choice · M12a：跟随预设、小标牌、直写在地形上、只标当前、不标
- **地图墨色** `vis.mapInk` · globalScreen · color · M12a：
- **地图房间状态色** `vis.mapRoomStates` · screen · choice · M12b：跟随预设、按节点三态、清空 / 有物品 / 未探索
- **地图路线** `vis.mapRoute` · screen · choice · M12b：跟随预设、不画、走过实线、全程虚线
- **地图楼层列表** `vis.mapFloors` · screen · choice · M12b：跟随预设、不画、左侧竖列、顶上横排
- **地图部件** `vis.mapFurniture` · screen · multi · M12b：罗盘玫瑰、比例尺、图例框
- **连线样式** `vis.connector` · globalScreen · choice · M5a：跟随预设、直线、曲线、虚线 / 点线、红绳 + 图钉、电路走线 等 12 种
- **连线已走比例** `vis.connectorProgress` · globalScreen · range · M12b：跟随预设
- **连线粗细** `vis.connectorWeight` · globalScreen · choice · M12b：跟随预设、固定、按值
- **连线着色** `vis.connectorTint` · globalScreen · choice · M12b：跟随预设、固定、按正负
- **随手摆放倾角** `vis.tilt` · globalScreen · range {'min': 0, 'max': 10, 'step': 0.5, 'unit': '°'} · M3a：
- **倾斜方式** `vis.tiltMode` · screen · choice · M12b：跟随预设、逐块随机、统一角度、满角正反
- **倾斜作用层** `vis.tiltLayers` · screen · choice · M12b：跟随预设、只转盒子、整块一起转、只转内容、盒子与内容反着斜

### 色彩（35）
取色来源、明度、色板角色（底、字、强调、第二强调、选中、渐变、边框）、色彩策略、语义编码。色彩策略只约束界面骨架色（底、字、强调），语义编码色（阵营、稀有度、状态）不受它限制。

- **UI 取色来源** `col.source` · global · choice · M3a：跟随预设、取自场景色板、独立控件色板、皮肤固定色、来自插画
- **面板明度** `col.lightness` · global · choice · M3a：跟随预设、浅色面板、中明度、深色面板
- **面板底色** `col.surface` · global · color · M3a：
- **次级底色** `col.surface2` · global · color · M3a：
- **文字色** `col.text` · global · color · M3a：
- **强调色** `col.accent` · global · color · M3a：
- **第二强调色** `col.accent2` · global · color · M3a：
- **选中色** `col.focus` · global · color · M3a：
- **饰色** `col.ornament` · global · color · M12b：
- **宝石 / 挂件色** `col.gem` · global · color · M12b：
- **节点完成色** `col.nodeDone` · global · color · M12a：
- **地图雾色** `col.fog` · screen · color · M12b：
- **好 / 正向色** `col.good` · global · color · M12a：
- **警告色** `col.warn` · global · color · M12a：
- **坏 / 危险色** `col.bad` · global · color · M12a：
- **标题色** `col.heading` · global · color · M12a：
- **图标色** `col.icon` · global · color · M12a：跟随预设、保留物品自身颜色
- **次要字色** `col.muted` · global · color · M12a：
- **任务 / 金钱色** `col.quest` · global · color · M12a：
- **控件面** `col.control` · global · color · M12a：
- **控件字色** `col.controlText` · global · color · M12a：
- **条槽色** `col.track` · global · color · M12a：跟随预设、深色压暗
- **条槽描边** `col.trackStroke` · global · color · M12a：跟随预设、无描边
- **自定义描边色** `col.border` · global · color · M3a：
- **渐变** `col.gradient` · global · gradient · M3a：
- **骨架色彩策略** `col.strategy` · global · choice · M3a：跟随预设、单色、中性 + 一两个强调色、双色调、骨架多色
- **语义颜色编码** `col.coding` · globalScreen · multi · M5a：无、阵营色、稀有度、状态色、元素属性色、玩家 / 频道色 等 10 种
- **按钮角色配色** `col.semantic` · globalScreen · choice · M3a：跟随预设、橙主灰次、绿确认红取消、蓝取消黄确认、绿主蓝次、强调色主按钮 等 8 种
- **按钮角色色（逐个）** `col.actionColors` · globalScreen · multi · M12a：强调色、第二强调色、好色、坏色、警告色、货币色 等 7 种
- **稀有度色阶** `col.rarityScale` · global · choice · M5a：跟随预设、白绿蓝紫橙、蓝紫金 / 彩虹、铜银金、灰 / 蓝 / 金、品质（银 / 金 / 铱） 等 7 种
- **稀有度色表（自定义）** `col.rarityColors` · global · multi · M12b：强调色、第二强调色、字色
- **类别 / 流派色表** `col.lineColors` · global · multi · M12b：强调色、第二强调色、好色、坏色
- **阵营色对** `col.teams` · global · choice · M5a：跟随预设、蓝我红敌、绿友红敌、橙蓝（色盲安全）、自定义
- **UI 饱和度** `col.saturation` · global · range · M3a：跟随预设
- **主题色变化** `col.dynamic` · global · choice · M5b：固定、随形态 / 机制切换、每章换配色、随场景 / 昼夜、随阵营

### 字体与文字（39）
按"角色 × 属性"组织：正文、标题、数字三个角色，各有字族 / 字重 / 大小写 / 字距 / 斜体。另有标题特效、排版方向、字号、序号、可读辅助。标题牌（垫在标题下面的东西）移到组件组 cmp.plate。

- **正文字族** `typ.body.family` · global · choice · M2：跟随预设、无衬线、衬线 / 宋、圆体、楷书 / 手写感、像素 等 11 种
- **正文字重** `typ.body.weight` · global · choice · M3a：跟随预设、细、常规、粗、特粗
- **正文大小写** `typ.body.case` · global · choice · M3a：跟随预设、原样、全大写、小型大写
- **正文字距** `typ.body.tracking` · global · range · M3a：跟随预设
- **正文斜体** `typ.body.style` · global · choice · M3a：正体、斜体
- **标题字族** `typ.display.family` · global · choice · M3a：跟随预设、同正文、无衬线、衬线、书法、手写 等 19 种
- **标题字重** `typ.display.weight` · global · choice · M3a：跟随预设、细、常规、粗、特粗
- **标题大小写** `typ.display.case` · global · choice · M3a：跟随预设、原样、全大写、小型大写
- **标题字距** `typ.display.tracking` · global · range · M3a：跟随预设
- **标题斜体** `typ.display.style` · global · choice · M3a：正体、斜体
- **标题字族：用在哪些地方** `typ.display.scope` · global · multi · M12b：标题、名牌、菜单词、大号读数、按钮字
- **文字对齐** `typ.align` · global · choice · M12b：跟随预设、左对齐、居中、两端对齐
- **第二文字系统行** `typ.display.secondary` · global · choice · M12b：没有、大写字母行、竖排中文 + 英文
- **第二文字系统行：字号比** `typ.display.secondaryScale` · global · range {'min': 0.2, 'max': 0.6, 'step': 0.02} · M12b：
- **第二文字系统行：字距** `typ.display.secondaryTracking` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M12b：
- **数字字体** `typ.numerals.family` · global · choice · M5a：跟随预设、同正文、等宽数字、大号展示数字、像素数字、里程表 等 10 种
- **数字斜体** `typ.numerals.style` · global · choice · M5a：正体、斜体
- **数字字重** `typ.numerals.weight` · global · choice · M12b：跟随预设、细、常规、中等、粗、特粗
- **数字位数** `typ.numerals.digits` · global · int · M12b：跟随预设
- **逐位格** `typ.numerals.cells` · global · choice · M12b：跟随预设、无、逐位内凹格
- **数字格式** `typ.numberFormat` · global · choice · M12b：跟随预设、千分位、不分组、K / M / B、万 / 亿
- **事件字效：字内填充** `typ.fillStyle` · global · choice · M12b：跟随预设、纯色、渐变、网点、金属
- **事件字效：填充色** `typ.fillColors` · global · multi · M12b：强调色、第二强调色、生命色、危险色、好色、警告色 等 10 种
- **事件字效：硬投影** `typ.shadowOffset` · global · range · M12b：跟随预设
- **按钮字族** `typ.button.family` · global · choice · M12a：跟随预设、正文粗体、标题字、数字字体
- **按钮字号** `typ.button.size` · global · range · M12a：跟随预设、按按钮高
- **标题字特效** `typ.titleFx` · global · choice · M3b：跟随预设、无、描边、投影、描边 + 投影、金属 / 渐变 等 11 种
- **标题前缀** `typ.titlePrefix` · global · choice · M12b：跟随预设、无、单箭头 >、双箭头 >>、圆点、母题符号
- **标题排版方向** `typ.direction` · global · choice · M3b：横排、标题竖排、全部竖排
- **基准字号** `typ.baseSize` · global · range · M3a：跟随预设
- **文字系统** `typ.script` · global · choice · M12b：跟随预设、拉丁为主、中文为主、混排
- **字号阶梯比** `typ.scale` · global · range · M3a：跟随预设
- **序号样式** `typ.numbering` · globalScreen · choice · M5a：跟随预设、第 X 章、01 / DAY 1、罗马数字、单字（始 / 序）、无序号
- **文字可读辅助** `typ.legibility` · global · choice · M3a：跟随预设、无、文字描边、投影、半透明底板、文字发光
- **首字下沉** `typ.dropCap` · global · choice · M12b：没有、首字放大、首字下沉、装饰首字
- **描边色** `typ.outlineColor` · global · color · M12a：跟随预设、墨色、白、强调色
- **描边粗细** `typ.outlineWidth` · global · range · M12a：跟随预设
- **字体栅格化** `typ.rasterize` · global · choice · M12b：跟随预设、不栅格化、按世界分辨率、2 倍、3 倍
- **字体混排** `typ.mix` · global · choice · M12b：跟随预设、不混排、逐行换字、按说话人换字、注释层

### 资产槽位（内芯 / 外框 / 饰件 / 特效 / 容器 / 图标 / 背景 / 水印）（39）
08 文档 3.1：皮肤拆成可独立替换的槽位。v2 把"结构"和"材质"分开：内芯与外框各选一个结构，再从共用材质表（第 2.19 节）里选材质；素材生成提示词 = 结构 × 材质 × 母题（vis.motif）× 装饰预算（vis.ornament）。程序化选项先做（M3.5），素材选项未生成前画灰盒占位（标"需素材 · M11"），不禁用。

- **内芯结构** `ast.core` · global · choice · M3.5：跟随预设、程序填充、材质平铺、彩绘插画
- **内芯材质** `ast.coreMat` · global · choice · M3.5：米白纸、羊皮纸、宣纸、绢本、布 / 幕布 / 绗缝、皮革 等 27 种
- **外框结构** `ast.frame` · global · choice · M3.5：跟随预设、程序线框、平框九宫格、雕花九宫格、只有四角件、环带 等 10 种
- **外框材质** `ast.frameMat` · global · choice · M3.5：米白纸、羊皮纸、宣纸、绢本、布 / 幕布 / 绗缝、皮革 等 27 种
- **框厚** `ast.frameThickness` · global · range · M12b：跟随预设
- **磨损** `ast.wear` · global · range {'min': 0, 'max': 1, 'step': 0.05} · M12b：
- **做旧** `ast.aging` · screen · multi · M12b：泛黄、污渍、折痕、咖啡圈、订书钉、复印噪点
- **表面处理** `ast.finish` · global · choice · M12b：跟随预设、没有、箔、镭射、多彩、玻璃
- **饰件** `ast.ornaments` · global · multi · M3.5：跟随预设、无、角花 / 角饰、分隔饰条、徽章底座、缎带 等 31 种
- **饰件作用范围** `ast.ornamentScope` · global · choice · M12a：跟随预设、全部面板、只在界面里、只画主面板、只画大面板
- **饰件挂在哪** `ast.ornamentAnchor` · global · multi · M12b：跟随预设、面板四角、面板边上、元素两端、数值条两端、名牌旁 等 7 种
- **饰件出框** `ast.ornamentOverhang` · global · range · M12b：跟随预设
- **端头形** `ast.endcapShape` · global · choice · M12b：跟随预设、尖角、圆珠、方块、云头、墨刷尾 等 10 种
- **骑边耳标** `ast.earTabAt` · global · choice · M12b：跟随预设、无、顶边左、顶边右、右边
- **饰件最小面板** `ast.ornamentMinSize` · global · range · M12a：跟随预设
- **叠加特效层** `ast.fx` · global · multi · M3.5：跟随预设、无、外发光、镭射彩虹、放射光芒、光柱 等 13 种
- **场景容器** `ast.container` · screen · choice · M3.5：无、书、笔记本 / 手账、卷轴、挂旗 / 挂轴、书桌 / 桌面 等 20 种
- **书本样式** `ast.bookStyle` · screen · choice · M12b：跟随预设、皮面书、正视硬边书
- **书本左页** `ast.pageLeft` · screen · choice · M12b：跟随预设、内容页、衬页、扉页框、素页
- **书本右页** `ast.pageRight` · screen · choice · M12b：跟随预设、内容页、衬页、扉页框、素页
- **容器放在哪** `ast.containerSurface` · screen · choice · M3.5：无（浮在画面上）、书桌、木架、桌面 / 地面
- **图标集来源** `ast.iconSet` · global · choice · M11：跟随预设、程序几何、图标字体、图集素材、游戏内实时渲染
- **替换背景** `ast.bgArt` · screen · choice · M3.5：跟随预设、主视觉海报、风景插画、抽象渐变 / 光效、图案平铺、整屏材质 等 13 种
- **背景位图画法** `ast.bgArtRender` · screen · choice · M12b：跟随预设、彩色原样、素描、炭笔、铜版、网点
- **背景材质** `ast.bgMat` · screen · choice · M3.5：米白纸、羊皮纸、宣纸、绢本、布 / 幕布 / 绗缝、皮革 等 27 种
- **背景材质方向** `ast.bgMatAngle` · screen · range · M12a：跟随预设
- **漩涡：流速** `ast.bgFlow` · screen · range · M12b：跟随预设
- **漩涡：扭曲度** `ast.bgWarp` · screen · range · M12b：跟随预设
- **漩涡：彩纸碎屑** `ast.bgConfetti` · screen · toggle · M12b：
- **漩涡：配色（逐个）** `ast.bgColors` · screen · multi · M12b：强调色、第二强调色、面板底色、好色、坏色
- **云天：前景** `ast.bgForeground` · screen · choice · M12b：跟随预设、没有、山丘、树林
- **屏幕边缘遮罩** `ast.screenEdge` · screen · multi · M12b：冰雾、墨烟、六角暗角、异星字带、胶片齿孔
- **边缘遮罩：颜色** `ast.screenEdgeColor` · screen · color · M12b：跟随预设
- **边缘遮罩：强度** `ast.screenEdgeStrength` · screen · range · M12b：跟随预设
- **边缘遮罩：层** `ast.screenEdgeLayer` · screen · choice · M12b：跟随预设、面板之下、面板与文字之上
- **水印层** `ast.watermark` · screen · choice · M3.5：无、阵营徽记、书法、淡古画、图腾、符印 / 法阵 等 13 种
- **水印强度** `ast.watermarkOpacity` · screen · range {'min': 0, 'max': 0.5, 'step': 0.02} · M3.5：
- **第二层水印** `ast.watermark2` · screen · choice · M12b：跟随预设、无、阵营徽记、书法、淡古画、图腾 等 14 种
- **第二层水印：强度** `ast.watermark2Opacity` · screen · range · M12b：跟随预设

### 与世界的关系（15）
UI 放在哪（四分法）、和画面是什么关系、背后的场景怎么处理、HUD 什么时候出现、后处理会不会作用到 UI。W1 / W2 / W3 三个观察轴在这里互相独立。

- **默认放置方式** `rel.diegesis` · global · choice · M6：屏幕叠加、空间内、叙事内、元 UI
- **UI 与画面关系** `rel.harmony` · global · choice · M3a：跟随预设、同一媒介、统一调色、中性、刻意对比
- **背后画面来源** `rel.behind` · screen · choice · M9a：跟随预设、实时场景、冻结、替换为背景
- **压暗强度** `rel.dim` · screen · range · M9a：跟随预设
- **暗罩颜色** `rel.dimColor` · screen · color · M12b：跟随预设
- **暗罩方向** `rel.toneDir` · screen · choice · M12b：跟随预设、左侧与底部、左侧、右侧、上方、底部 等 7 种
- **底部雾带** `rel.fogBand` · screen · range {'min': 0, 'max': 1, 'step': 0.05} · M12b：
- **背后虚化** `rel.sceneBlur` · screen · range {'min': 0, 'max': 24, 'step': 1, 'unit': 'px'} · M9a：
- **背后调色** `rel.sceneTone` · screen · multi · M9a：原样、去饱和、黑白、双色调、整体着色、暗角 等 8 种
- **暗角强度** `rel.vignette` · screen · range · M12a：跟随预设
- **HUD 显隐策略** `rel.hudVisibility` · screen · choice · M5b：跟随预设、常驻、用到才显示、静止渐隐、按键呼出、电影模式（全隐）
- **UI 受画面后处理影响** `rel.followPost` · global · choice · M6：跟随预设、不受影响、跟随弯曲 / 畸变、跟随纸纹 / 描边 / 调色、全部跟随
- **元 UI 屏幕效果** `rel.metaFx` · global · multi · M6：受击红边、低血去饱和、闪白、整屏速度线、夜视、边缘光框 等 7 种
- **世界内标注渲染（默认）** `rel.worldRender` · global · choice · M6：跟随预设、平面公告板、透视贴面、地面贴花、物体描边高亮
- **语义缩放** `rel.semanticZoom` · screen · choice · M7：无、拉远图标化、按缩放切换标签、拉远切热力图、拉远切类别色块

### 动效与演出（12）
静态截图看不出来的部分。按参数分别用"时间轴 + 逐帧条带 + 缓动曲线""事件触发""流程分镜"展示（见每个参数的"展示"字段与第 7 节）。

- **入场动效** `mo.enter` · globalScreen · choice · M5b：跟随预设、硬切、淡入、滑入 / 推移、弹出缩放（回弹）、砸入（放大落下 + 震） 等 12 种
- **动效时长** `mo.duration` · global · range · M5b：跟随预设
- **缓动性格** `mo.easing` · global · choice · M5b：跟随预设、线性、缓出、回弹、弹簧
- **文字出现** `mo.textReveal` · globalScreen · choice · M5b：跟随预设、立即、打字机逐字、淡入、逐行、乱码解码
- **环境待机动效** `mo.idle` · global · choice · M5b：跟随预设、无、光效扫过、粒子漂浮、轻摇
- **数值变化** `mo.valueChange` · global · choice · M5b：跟随预设、瞬变、平滑、延迟拖尾、分段跳、数字滚动
- **反馈强度** `mo.juice` · global · range · M5b：跟随预设
- **揭示方式** `mo.reveal` · screen · choice · M9b：跟随预设、直接显示、翻牌、开箱、卷轴 / 破解展开、逐个飞入 等 8 种
- **先预告稀有度** `mo.revealTease` · screen · toggle · M9b：
- **奖励演出强度** `mo.reward` · screen · int · M9b：跟随预设
- **界面转场** `mo.transition` · global · choice · M9b：跟随预设、用新界面的入场动效、交叉淡化、镜头推进到物件、光圈收缩
- **UI 动画帧率** `mo.frameRate` · global · choice · M5b：跟随预设、流畅、一拍二（12fps）、一拍三（8fps）

### 交互与输入（21）
交互模式、确认、关闭方式、继续、选中、按下反馈、按键提示、触控尺寸、跳过、引导强制度。"本屏怎么结束"只由 ix.dismiss 决定，阻断性由它推出。

- **主交互模式** `ix.mode` · screen · choice · M9b：跟随预设、只读、单一主按钮、多按钮、选择条目、拖拽 等 10 种
- **确认机制** `ix.confirm` · screen · choice · M9b：跟随预设、即点即生效、选中 + 确认按钮、二次确认弹窗、长按确认、幽灵预览 + ✓ / ✕ 等 7 种
- **本屏怎么结束** `ix.dismiss` · screen · choice · M9b：跟随预设、点关闭 / 确认按钮、点空白处关闭、点任意处继续、按键返回（Esc / B）、自动消失 等 7 种
- **关闭控件** `ix.close` · screen · choice · M9b：跟随预设、不画、右上 X、角外悬挂红圆 X、左上返回箭头、底部取消按钮 等 10 种
- **角落返回牌：哪个角** `ix.closeCorner` · screen · choice · M12b：跟随预设、左上、右上、左下、右下
- **返回钮** `ix.back` · screen · choice · M12a：跟随预设、无、返回箭头、带字返回钮
- **继续提示** `ix.continueCue` · screen · choice · M9b：跟随预设、无、"点击任意处继续"小字、闪烁小三角 / 叶片、按键图标、倒计时 等 7 种
- **阻断性** `ix.blocking` · screen · choice · M9b：跟随预设、非阻断、半阻断、模态、强制流程
- **选中项表现** `ix.focus` · global · multi · M10：跟随预设、高亮描边、底色反白、放大、光标指示（手指 / 三角 / 括号）、发光 等 11 种
- **按下反馈** `ix.press` · global · choice · M5b：跟随预设、无、下沉到阴影、变暗、缩小回弹、波纹 等 7 种
- **按键提示图标集** `ix.glyphs` · global · choice · M10：跟随预设、键盘键帽、Xbox、PlayStation、Nintendo、触屏图标 等 10 种
- **按键字形着色** `ix.glyphTint` · global · choice · M12b：跟随预设、品牌色、单色细线圈、跟随字色
- **光标集** `ix.cursorSet` · global · choice · M12b：跟随预设、系统箭头、卡通手套、像素手套、三角、指手 等 7 种
- **光标按目标换** `ix.cursorContext` · global · toggle · M12b：
- **触控尺寸** `ix.touchSize` · global · range · M10：跟随预设
- **跳过 / 快进** `ix.skip` · screen · choice · M9b：跟随预设、不可跳过、跳过按钮、长按跳过、自动 / 快进 / 日志一组
- **跳过按钮位置** `ix.skipAnchor` · screen · choice · M9b：右上、右下、左下
- **引导强制度** `ix.guideForce` · screen · choice · M9b：无引导、软提示（可忽略）、强制点击高亮目标
- **虚拟摇杆** `ix.touchStick` · global · choice · M10：跟随预设、无摇杆、固定摇杆、浮动摇杆、十字键、点地移动 等 7 种
- **触屏按钮布局** `ix.touchCluster` · global · choice · M10：跟随预设、大键 + 弧形环绕、技能方格、底部一排、按住展开轮盘、左右两个大键
- **握持与拇指区** `ix.thumbZone` · global · choice · M10：跟随预设、横屏双拇指、竖屏单手、平板 / 桌面

### 流程与界面场景（5）
属于 UX 流程，在探索台用"流程分镜条 + 交互注释层"展示，并可一键演示（chk.demo）。

- **进入方式** `flow.entry` · screen · choice · M9b：跟随预设、按键呼出、点入口图标、世界内交互、自动弹出、流程强制 等 7 种
- **叠层表现** `flow.stacking` · screen · choice · M9b：跟随预设、替换上一屏、叠在上面、下层缩小后退、叠在局内 HUD 上
- **弹窗栈深** `flow.depth` · screen · int {'min': 1, 'max': 4, 'step': 1} · M9b：
- **跨界面常驻层** `flow.chrome` · global · multi · M9b：顶栏货币、聊天跑马灯、返回 + 主页按钮、PC 式状态条、居中细框短条、贯穿顶栏的分隔线
- **分区导航跨屏常驻** `flow.navPersistent` · global · toggle · M9b：

### 组件形态（控件库的结构）（58）
M5 控件库里通用组件的"结构"。视觉语言（vis / col / typ / ast）给质感，这里给构成；两者相乘就是一个具体控件。全局默认，可逐屏覆盖；外轮廓统一用 vis.silhouette@<组件>。

- **按钮内容** `cmp.button` · globalScreen · choice · M5a：跟随预设、文字、图标、图标 + 文字
- **按钮有底框** `cmp.buttonBox` · globalScreen · toggle · M5a：
- **按钮面** `cmp.buttonFace` · globalScreen · choice · M12a：跟随预设、实心、描边、下划线字
- **页签内容** `cmp.tab` · globalScreen · choice · M5a：跟随预设、文字、图标、图标 + 文字、头像页签
- **页签选中指示** `cmp.tabIndicator` · globalScreen · choice · M5a：跟随预设、下划线、实心填充、凸起 / 前移、只变粗、只变色 等 7 种
- **页签挂法** `cmp.tabMount` · globalScreen · choice · M12b：跟随预设、浮在面板上、贴身横托槽、贴身弧形托槽、容器上沿外的小牌、外挂书签
- **列表行字段** `cmp.listRow` · globalScreen · multi · M5a：跟随预设、图标 / 头像、标题、说明、进度、数值 / 战力 等 21 种
- **列表上方的选择条** `cmp.listHeader` · globalScreen · choice · M12b：跟随预设、不画、选择条
- **列表行底** `cmp.listRowBox` · globalScreen · choice · M12a：跟随预设、每行一块面板、无框文字行、无底无框、斑马纹
- **列表行字段颜色** `cmp.listRowColors` · globalScreen · multi · M12a：强调色、第二强调色、好色、坏色、警告色、次要色 等 8 种
- **格子结构** `cmp.slot` · globalScreen · choice · M5a：跟随预设、方格、竖卡、横卡行、无格直接摆放、肖像竖卡 等 9 种
- **格子数量角标** `cmp.slotBadge` · globalScreen · choice · M12a：跟随预设、画数量、大于 1 才画、不画
- **格子数量位置** `cmp.slotBadgePos` · globalScreen · choice · M12a：跟随预设、右下、左上、底边居中
- **格下标牌** `cmp.slotLabel` · globalScreen · choice · M12b：跟随预设、不画、名字在下、压边标牌、等级小牌
- **卡牌版式** `cmp.card` · globalScreen · choice · M9a：跟随预设、整幅立绘 + 少字、插画窗 + 费用角标 + 文本框、名牌 + 属性表、球员卡、图标卡（各入口原来的画法） 等 13 种
- **卡牌：语义着色** `cmp.cardColorBy` · globalScreen · multi · M12b：整卡底色按类别、名条按稀有度、窗形按类型、可打出外发光、费用不够变红
- **卡牌：卡内子件（按序）** `cmp.cardParts` · globalScreen · multi · M12b：抬头（小型大写多行）、彩色名牌、插画窗、圆龛人像、图标 + 效果、字段对 等 15 种
- **徽章设计** `cmp.badge` · globalScreen · choice · M11：跟随预设、无底座、扁平圆章、圆章 + 星、奖杯、交叉兵器 + 翼 等 11 种
- **数值图形** `cmp.gauge` · globalScreen · choice · M5a：跟随预设、横条、细条、分段格、弧形、圆环 等 30 种
- **数值图形：单位数** `cmp.gaugeUnits` · globalScreen · int · M12b：跟随预设
- **数值图形：单位形** `cmp.gaugeUnitShape` · globalScreen · choice · M12b：跟随预设、方格、圆点、菱形、心形、圆角小格 等 7 种
- **数值图形：单位方向** `cmp.gaugeDir` · globalScreen · choice · M12b：跟随预设、横排、竖排、沿弧
- **仪表子件** `cmp.dialParts` · globalScreen · multi · M12b：刻度、刻度数字、红区、指针、中心大字、副读数
- **球心图标** `cmp.gaugeIcon` · globalScreen · choice · M12b：跟随预设、无、行图标
- **数值条端头** `cmp.gaugeCap` · globalScreen · choice · M12b：跟随预设、无、尖头、圆珠、方块、按母题
- **端头大小** `cmp.gaugeCapSize` · globalScreen · range · M12b：跟随预设
- **数值条外框** `cmp.gaugeFrame` · globalScreen · choice · M12b：跟随预设、无、细框、双细线、深色底板
- **按数值换色** `cmp.gaugeColorBy` · globalScreen · choice · M12b：跟随预设、固定、分档、渐变
- **换色：危险线** `cmp.gaugeLow` · globalScreen · range · M12b：跟随预设
- **换色：警告线** `cmp.gaugeHigh` · globalScreen · range · M12b：跟随预设
- **数值条附属件** `cmp.gaugeExtra` · globalScreen · multi · M12b：可回复段、格挡染色、帽头字母、端徽、状态行、状态小方块（条旁）
- **标牌** `cmp.plate` · globalScreen · choice · M3b：无（直压）、边缘小标签条、胶囊、缎带、铭牌 / 匾额、卷轴头 / 卷花 等 24 种
- **标牌哪端斜切 / 开叉** `cmp.plateEnds` · globalScreen · choice · M12b：跟随预设、两端、只左端、只右端、都不
- **标牌出血到屏幕边** `cmp.plateBleed` · globalScreen · toggle · M12b：
- **对话框结构** `cmp.dialogBox` · globalScreen · choice · M5a：跟随预设、底部通栏、带尾气泡、无框字幕、聊天软件式、全屏文本（NVL） 等 13 种
- **对白框尾巴** `cmp.dialogTail` · globalScreen · choice · M12b：跟随预设、不画、圆弧尾、锯齿闪电、尖刺
- **弹窗结构** `cmp.modal` · globalScreen · choice · M9a：跟随预设、标准面板、无框浮空、分区各一块底
- **数量控件** `cmp.quantity` · globalScreen · choice · M9a：跟随预设、滑条 + 加减 + MAX、步进器、输入框、带极值步进器
- **设置项：开关类** `cmp.optionBool` · globalScreen · choice · M9a：跟随预设、开关、勾选框、分段（开 / 关）、左右切换 ◁ ▷、拨动开关
- **设置行排法** `cmp.optionLayout` · globalScreen · choice · M12b：跟随预设、单层、两层小框
- **逐行控件** `cmp.optionRows` · globalScreen · multi · M12b：跟随预设、输入框、输入框 + 骰子、左右箭头、分段、下拉 等 18 种
- **浏览器原生控件外观** `cmp.optionNative` · globalScreen · toggle · M12b：
- **表单的结构** `cmp.formKind` · globalScreen · choice · M12b：跟随预设、设置行、句内填空
- **设置项：多选一** `cmp.optionEnum` · globalScreen · choice · M9a：跟随预设、分段按钮、下拉、左右切换 ◁ ▷、单选点、缩略图 等 7 种
- **设置项：数值** `cmp.optionRange` · globalScreen · choice · M9a：跟随预设、滑条、步进器、分格条、左右切换数字、色相三联滑条 等 8 种
- **按键绑定呈现** `cmp.bindingMap` · globalScreen · choice · M10：动作 → 键位列表、键盘示意图 + 引线、手柄示意图 + 引线、鼠标示意图
- **输入框形态** `cmp.input` · globalScreen · choice · M9a：跟随预设、白底圆角槽、暗色嵌入槽、纸面下划线、文本框 + 边框、印章 / 签名框
- **节点形态** `cmp.node` · globalScreen · choice · M9a：跟随预设、圆形编号、头像、建筑图标、宝箱、等距方块 等 21 种
- **格组** `cmp.slotGroup` · globalScreen · choice · M12b：跟随预设、组名 + 计数徽章、只有组名
- **格组标题位置** `cmp.slotGroupTitle` · globalScreen · choice · M12b：跟随预设、格子外侧、格子上方、不写
- **当前位置标记** `lay.currentMarker` · screen · choice · M12b：跟随预设、不画、小头像、图钉
- **引线** `cmp.leader` · globalScreen · choice · M12b：跟随预设、不画、直线、曲线、折线
- **引线端头** `cmp.leaderEnd` · globalScreen · choice · M12b：跟随预设、实心圆点、括号、无
- **面板插画槽** `cmp.panelArt` · globalScreen · choice · M3.5：无、头图横幅、插画窗、侧图、整幅底图、场景小图拼贴 等 8 种
- **插画槽：图窗外框** `cmp.panelArtFrame` · globalScreen · choice · M12b：跟随预设、无框、细框、雕花框
- **插画槽：图窗处理** `cmp.panelArtFx` · globalScreen · multi · M12b：夜视、横向撕裂、扫描线、双色、去色、网点 等 7 种
- **插画槽：图窗宽高比** `cmp.panelArtRatio` · globalScreen · range · M12b：跟随预设
- **插画槽：图注带** `cmp.panelArtCaption` · globalScreen · choice · M12b：跟随预设、无、暗渐变图注带

### 数据与状态编码（14）
全局默认，可逐屏覆盖。和颜色编码（col.coding）一起用，必须满足形状冗余（chk.redundancy）。v2 给锁定 / 空槽 / 完成 / 冷却 / 选中的每个取值标了视觉通道，生成器检查同一屏里两两不撞车（R1：v1 的灰度锁、去饱和冷却、灰化完成三者同屏分不出来）。

- **变化 / 前后对比** `st.delta` · globalScreen · choice · M9a：跟随预设、a → b 箭头、绿色 + 增量、前后双卡、只给新值、雷达图
- **统计图形** `st.statViz` · globalScreen · choice · M9a：跟随预设、纯数字表、行内横条、左右对打条、图标 + 计数、战术图 / 点位 等 14 种
- **名次标识** `st.rank` · globalScreen · choice · M9a：跟随预设、纯数字、奖牌 / 奖杯、皇冠、领奖台 / 立绘前三、前三色 + 其余数字
- **稀有度表达手段** `st.rarityCue` · globalScreen · multi · M5a：跟随预设、无、边框色、底色、星级、光效色 等 15 种
- **稀有度记号位置** `st.rarityPos` · globalScreen · choice · M12a：跟随预设、左侧、底边、顶边
- **空槽表现** `st.emptySlot` · globalScreen · choice · M5a：跟随预设、+ 号、暗坑 / 凹槽、灰色剪影、虚线框、留白无框 等 10 种
- **空状态画法** `st.emptyList` · screen · choice · M9a：跟随预设、水印徽记、插画 + 一句话、吉祥物、一句文案、留白
- **锁定 / 未获得表现** `st.locked` · globalScreen · choice · M9a：跟随预设、无（不表达锁定）、锁图标、灰度、黑剪影、特殊封印（冰晶等） 等 11 种
- **完成 / 已领标记** `st.done` · globalScreen · choice · M9a：跟随预设、绿勾、盖章、灰化沉底、划掉、"已领取"角标 等 7 种
- **新内容 / 可领提示** `st.newCue` · globalScreen · choice · M9a：跟随预设、红点、NEW 角标、数字角标、发光脉冲、无
- **状态标识形态** `st.statusMark` · globalScreen · choice · M9a：跟随预设、彩色圆点、文字 / 色块角标、图标、整行底色 / 灰度头像、文字 等 7 种
- **冷却 / 不可用表现** `st.cooldown` · globalScreen · choice · M5b：跟随预设、无（不表达冷却）、冷却扇形、压暗 + 数字、去饱和、自下而上充能 等 7 种
- **已选 / 已装备标记** `st.selected` · globalScreen · choice · M5a：跟随预设、无（不表达选中）、勾选角标、描边、发光、色条 等 12 种
- **警示表达** `st.alert` · globalScreen · multi · M5b：红色调、黄三角图标、闪烁、黄黑警示条、全屏红光 + 扫描线、黄框警告条

### 运营与商业化（7）
手游界面的独立一维：同一套版式，运营元素可以从零加到满。与美术风格无关，与商业模式预设相关。买断制默认隐藏整页（第 7 节）。

- **运营元素密度** `ops.density` · screen · int · M9b：跟随预设
- **商业角标** `ops.badges` · screen · multi · M9b：倒计时、折扣角标、限购 x/y、倍率大字、推荐 / 热卖、赠送 / 首充标签 等 8 种
- **运营动作按钮** `ops.actions` · screen · multi · M9b：无、分享、再抽 N 次 / 再来一局、看广告翻倍、今日不再显示、重掷
- **海报化程度** `ops.poster` · screen · range · M9b：跟随预设
- **运营入口簇** `ops.entries` · screen · choice · M9b：跟随预设、无、侧边图标列、顶部轮播 / 横幅、浮动角标入口、横幅竖向堆叠
- **合规与品牌层** `ops.compliance` · screen · multi · M9b：年龄角标、版号 / 健康游戏长文、版本号、Logo 水印、法务小字、媒体评分墙
- **档位升级美术** `ops.tierArt` · screen · choice · M9b：无、一堆越堆越高、容器升级（袋 → 箱 → 宝箱）、同图放大

### 玩家选项（无障碍）（6）
玩家可调的无障碍选项：也是设计参数（M4 导出到 Godot 设置页），在探索台里做成"玩家设置预览"开关，不进随机。

- **UI 缩放** `a11y.uiScale` · global · range {'min': 0.75, 'max': 2, 'step': 0.05} · M8b：
- **文字缩放** `a11y.textScale` · global · range {'min': 0.8, 'max': 2, 'step': 0.05} · M8b：
- **高对比模式** `a11y.highContrast` · global · toggle · M8b：
- **减少动效** `a11y.reduceMotion` · global · toggle · M8b：
- **降低透明** `a11y.reduceTransparency` · global · toggle · M8b：
- **色盲预设** `a11y.cvdPreset` · global · choice · M8b：关、红色弱、绿色弱、蓝色弱

### 工具与展示（不进配方）（14）
工具侧检查与展示方式，不是游戏参数：并入顶栏"诊断"下拉与视口按钮，不进配方、收藏、随机、导出（R1 + R3）。v1 的 a11y.redundancy、lay.coverage、flow.demo 改到这里。

- **对比度检查** `chk.contrast` · global · toggle · M8a：
- **色盲模拟** `chk.cvd` · global · choice · M8a：关、红色盲、绿色盲、蓝色盲、全色盲（灰度）
- **颜色冗余检查** `chk.redundancy` · global · toggle · M8a：
- **最小字号检查** `chk.minText` · global · range {'min': 8, 'max': 32, 'step': 1, 'unit': 'px@1080p'} · M8a：
- **触控尺寸检查** `chk.touch` · global · toggle · M8b：
- **安全区检查** `chk.safeArea` · global · toggle · M8b：
- **文字溢出 / 伪本地化** `chk.overflow` · global · choice · M8b：关、+30%（英文）、+50%（德文等）
- **特效遮挡检查** `chk.fxOcclusion` · global · toggle · M8b：
- **眯眼层级检查** `chk.squint` · global · toggle · M8a：
- **视距预览** `chk.viewDistance` · global · choice · M10：关、手机 30cm、PC 60cm、电视 2.5m
- **UI 屏占比读数** `chk.coverage` · screen · range {'min': 0, 'max': 100, 'step': 1, 'unit': '%'} · M8a：
- **流程演示脚本** `chk.demo` · global · choice · M9b：不播放、战斗节拍、登录序列、抽卡、升级、对话推进 等 15 种
- **静帧姿态** `chk.simPose` · global · choice · M12b：不钉、低血、受击、回血、拾取、升级 等 11 种
- **静帧时刻** `chk.simTime` · global · range · M12b：跟随预设

### 信息元素（逐元素）（192）
每个信息元素一组参数：画法（各元素自己的选项）+ 11 个通用模板参数（放置、九宫格锚点、世界挂点、世界渲染、元 UI 效果、内部排布、大小、显隐、信息优先级、数值标注与位置）。实例键写成「元素 id.后缀」，例如 el.minimap.screenAnchor = tr。28 个旧元素 + 4 个新元素（态势条、建造栏、行动顺序、对话选项）。在探索台里做成"元素检查器"：在画布上点一个元素就打开

- **放置方式（逐元素）** `elx.diegesis` · element · choice · M6：跟随全局、屏幕叠加、空间内、叙事内、元 UI
- **屏幕锚点** `elx.screenAnchor` · element · choice · M7：跟随预设、左上、上中、右上、左中、中心 等 10 种
- **世界挂点** `elx.attachTo` · element · choice · M6：不挂（用屏幕锚点）、玩家角色、目标 / 敌人、兴趣点、手持物 / 武器、光标
- **挂点旁的位置** `elx.attachOffset` · element · choice · M12a：跟随预设、头顶、脚下、左边、右边、中心
- **与挂点的间距** `elx.attachGap` · element · range · M12a：跟随预设
- **挂点元素的宽** `elx.attachWidth` · element · choice · M12a：跟随预设、自己的宽、跟角色一样宽
- **挂点在屏外时** `elx.offscreen` · element · choice · M12a：跟随预设、夹紧在画面边上、不画、边缘箭头
- **压到屏幕 HUD 时** `elx.occlusion` · element · choice · M12a：跟随预设、推开、不画、不管
- **世界渲染（逐元素）** `elx.worldRender` · element · choice · M6：跟随全局、平面公告板、透视贴面、地面贴花、物体描边
- **元 UI 效果（逐元素）** `elx.metaFx` · element · choice · M6：跟随预设、受击红边、低血去饱和、闪白、整屏速度线、夜视 等 8 种
- **内部排布** `elx.arrangement` · element · choice · M5a：跟随全局、横排、竖列、规则网格、六角网、环绕中心 / 轮盘 等 19 种
- **大小 / 突出度** `elx.scale` · element · range {'min': 0.3, 'max': 2.5, 'step': 0.05} · M5a：
- **显隐（逐元素）** `elx.visibility` · element · choice · M5b：跟随全局、常驻、用到才显示、静止渐隐、按键呼出
- **信息优先级** `elx.priority` · element · choice · M5a：主、次、背景
- **数值标注** `elx.valueLabel` · element · choice · M5a：不标、当前值、当前 / 上限、百分比、变化量、趋势箭头
- **数值标注位置** `elx.valueLabelPos` · element · choice · M5a：条内、条尾、上方、下方、环心 / 正中、上标
- **数值标注：何时显示** `elx.valueLabelShow` · element · choice · M12b：跟随预设、一直显示、悬停时
- **速度：名次** `el.speed.showPlace` · element · choice · M12b：跟随预设、写名次、不写
- **格数 / 按钮数** `elx.count` · element · int · M12a：跟随预设
- **贴满屏宽** `elx.span` · element · choice · M12b：跟随预设、整屏宽
- **键位角标** `elx.keyHint` · element · choice · M12a：跟随预设、格角小字、格下键帽、不画
- **耐久标注** `elx.durability` · element · choice · M12a：不画、底边百分比、底边细条
- **贴边拉满** `elx.fill` · element · choice · M12a：按内容、通高、通宽
- **名字 / 行名** `elx.label` · element · choice · M12a：跟随预设、写、不写
- **数值图形粗细** `elx.thickness` · element · range {'min': 0.5, 'max': 3, 'step': 0.1} · M12a：
- **躲开玩家** `elx.avoidPlayer` · element · toggle · M12a：
- **同锚点堆叠方向** `elx.stackDir` · element · choice · M12a：跟随、竖排、横排、横排 + 共用底条
- **同锚点等宽** `elx.stackWidth` · element · choice · M12a：跟随、自己的宽、与同格等宽
- **横向偏移** `elx.offsetX` · element · range {'min': -50, 'max': 50, 'step': 0.5, 'unit': '%'} · M12a：
- **纵向偏移** `elx.offsetY` · element · range {'min': -50, 'max': 50, 'step': 0.5, 'unit': '%'} · M12a：
- **锚点空间** `elx.anchorSpace` · element · choice · M12a：跟随、容器、整屏、页头、数据区、详情栏
- **菜单打开时保留** `elx.keepOnMenu` · element · toggle · M12a：
- **垫底时画不画** `elx.underlay` · element · choice · M12b：跟随预设、垫底时不画
- **进不进贴边条** `elx.edgeBar` · element · choice · M12b：跟随预设、不进贴边条
- **元素套框** `elx.frame` · element · choice · M12b：跟随预设、不套、套框、托盘
- **格位托盘** `elx.tray` · element · choice · M12b：跟随预设、不垫、深色内嵌托盘
- **多成员：排法** `elx.instanceLayout` · element · choice · M12b：跟随预设、并排、错位叠放
- **错位叠放：露出量** `elx.stackReveal` · element · range · M12b：跟随预设
- **多成员：当前项强调** `elx.activeEmphasis` · element · choice · M12b：跟随预设、不强调、放大、抬起
- **锁扣：停靠到** `elx.dockTo` · element · choice · M12b：不停靠、生命 / 护盾 / 体力、资源 / 货币、技能 / 冷却 / 弹药 / 手牌、小地图 / 罗盘、目标 / 路点 等 41 种
- **锁扣：停在哪边** `elx.dockSide` · element · choice · M12b：跟随预设、右边、左边、下面、上面、左翼 等 12 种
- **锁扣：间距** `elx.dockGap` · element · range · M12b：跟随预设
- **锁扣：对齐** `elx.dockAlign` · element · choice · M12b：跟随预设、起边、居中、末边
- **锁扣：停在宿主的第几格** `elx.dockSlot` · element · int · M12b：跟随预设
- **锁扣：连接梁** `elx.dockConnector` · element · choice · M12b：跟随预设、不画、铁艺梁、细线
- **锁扣：跟着当前成员** `elx.dockFollow` · element · choice · M12b：跟随预设、不跟、跟着当前成员
- **成组：组名** `elx.group` · element · choice · M12b：不成组、组 1、组 2、组 3
- **成组：底板** `elx.groupFrame` · element · choice · M12b：跟随预设、不画、套框、托盘
- **成组：组员之间的饰线** `elx.groupConnector` · element · choice · M12b：跟随预设、不画、花饰、铁艺连接梁
- **骑边小件** `elx.satellites` · element · multi · M12b：小圆钮、数字徽章、小签、拨杆、提示条、计数小圆徽
- **骑边小件：小圆钮的位置** `elx.satelliteSide` · element · choice · M12b：跟随预设、顶边、右边、底边、左边、左上角 等 9 种
- **骑边小件：小圆钮个数** `elx.satelliteCount` · element · int · M12b：跟随预设
- **骑边小件：出框量** `elx.satelliteOverhang` · element · range · M12b：跟随预设
- **元素宽** `elx.width` · element · range · M12b：跟随预设
- **元素高** `elx.height` · element · range · M12b：跟随预设
- **生命 / 护盾 / 体力：条数** `el.vitals.count` · element · int {'min': 1, 'max': 4, 'step': 1} · M5a：
- **生命 / 护盾 / 体力：行名** `el.vitals.labels` · element · choice · M12a：跟随预设、文字、图标、不写
- **生命 / 护盾 / 体力：逐行画法** `el.vitals.rowForms` · element · multi · M12a：
- **生命 / 护盾 / 体力：逐行颜色** `el.vitals.rowColors` · element · multi · M12a：强调色、第二强调色、生命色、危险色、好色、警告色 等 10 种
- **生命 / 护盾 / 体力：逐行图标** `el.vitals.rowIcons` · element · multi · M12b：心形、十字加号、盾、闪电、星、菱形 等 10 种
- **生命 / 护盾 / 体力：逐行数值标注** `el.vitals.rowLabels` · element · multi · M12b：不标、当前值、当前 / 上限、百分比、变化量
- **生命 / 护盾 / 体力：附属件** `el.vitals.attach` · element · multi · M12b：死亡抗拒、充能圆点、等级方框、图标内写数、状态头像
- **生命 / 护盾 / 体力：锁扣** `el.vitals.lockup` · element · choice · M12b：跟随预设、无、圆徽 + 主条 + 副槽
- **生命 / 护盾 / 体力：条长按上限** `el.vitals.lengthByMax` · element · toggle · M12a：
- **生命 / 护盾 / 体力：最短条长** `el.vitals.lenRange` · element · range {'min': 0.05, 'max': 1, 'step': 0.05} · M12a：
- **生命 / 护盾 / 体力：排法** `el.vitals.stack` · element · choice · M12a：跟随预设、一行一条、竖条并排
- **资源 / 货币：画法** `el.resources.form` · element · choice · M5a：跟随预设、图标 + 数字、胶囊 + 加号、大号数字、以数值图形呈现、细框计数盒 等 10 种
- **技能 / 冷却 / 弹药 / 手牌：画法** `el.abilities.form` · element · choice · M5a：跟随预设、技能格、手牌、弹药数字、物品快捷栏、大招充能 等 10 种
- **技能 / 快捷栏：行数** `el.abilities.rows` · element · int {'min': 1, 'max': 3, 'step': 1} · M12a：
- **技能 / 快捷栏：每组格数** `el.abilities.groups` · element · int {'min': 0, 'max': 30, 'step': 1} · M12a：
- **技能 / 快捷栏：页数** `el.abilities.pages` · element · int {'min': 1, 'max': 9, 'step': 1} · M12a：
- **技能 / 快捷栏：格子里装什么** `el.abilities.slotContent` · element · choice · M12b：跟随预设、技能、物品、头像卡
- **技能：弹药旁的快捷格** `el.abilities.quickSlots` · element · int · M12b：跟随预设
- **技能：当前技能名牌** `el.abilities.activeLabel` · element · choice · M12b：跟随预设、不画、在上方、在下方
- **技能：溢出格** `el.abilities.overflow` · element · choice · M12b：跟随预设、不画、「+N」格
- **技能：首格消耗品** `el.abilities.lead` · element · choice · M12b：跟随预设、不画、血瓶格
- **小地图 / 罗盘：画法** `el.minimap.form` · element · choice · M6：跟随预设、平面小地图、圆环雷达、罗盘条、弧形罗盘、房间图 等 7 种
- **小地图：画幅** `el.minimap.aspect` · element · choice · M12b：跟随预设、方形、16 : 9、2 : 1
- **小地图：朝向** `el.minimap.rotate` · element · choice · M12b：跟随预设、北朝上、车头朝上
- **小地图：图层** `el.minimap.layers` · element · multi · M12b：地形、道路、导航路线、兴趣点
- **罗盘：方位字** `el.minimap.compassText` · element · choice · M12b：跟随预设、只写 N、英文字母、中文方位
- **小地图：卷角** `el.minimap.cornerCurl` · element · choice · M12b：跟随预设、不卷、右下一角、对角两角、四角
- **目标 / 路点：画法** `el.objective.form` · element · multi · M5a：目标文字、任务清单、标记图标、屏幕边缘箭头、便签 / 卷轴、剧情条 等 10 种
- **目标：标题色** `el.objective.titleColor` · element · color · M12b：跟随预设、任务色、正文色、标题色、强调色、第二强调色 等 10 种
- **目标：说明行颜色** `el.objective.descColor` · element · color · M12b：跟随预设、任务色、正文色、标题色、强调色、第二强调色 等 10 种
- **目标：标题前缀标记** `el.objective.marker` · element · choice · M12b：跟随预设、不画、实心菱形、描边菱形套实心小菱形、圆点、按外形
- **目标：距离字** `el.objective.distance` · element · toggle · M12b：
- **目标：贯穿十字线** `el.objective.crosshair` · element · toggle · M12b：
- **目标：勾选框形** `el.objective.checkShape` · element · choice · M12b：跟随预设、方框、圆框
- **交互提示：画法** `el.interact.form` · element · multi · M5a：按键图标 + 文字、锁定括号、带尾气泡卡、光标变化、小图标气泡、环形交互点 等 7 种
- **交互：光标旁写物品名** `el.interact.itemName` · element · toggle · M12b：
- **敌人血条 / 预警 / 意图：画法** `el.threat.form` · element · multi · M5a：敌人血条、Boss 长条 + 名字、目标头像框、锁定框、地面预警区、意图图标 + 数字 等 15 种
- **敌人血条 / 预警 / 意图：Boss 名对齐** `el.threat.nameAlign` · element · choice · M12a：跟随预设、居中、左对齐
- **敌人血条 / 预警 / 意图：锁定标记** `el.threat.lockStyle` · element · choice · M12b：跟随预设、准星圈、小圆点
- **敌人：发现度外形** `el.threat.detectShape` · element · choice · M12b：跟随预设、三角、菱形、眼睛
- **敌人：闪光预警的种类** `el.threat.glintKind` · element · choice · M12b：跟随预设、不可格挡、可格挡 / 闪避
- **敌人：警觉标记** `el.threat.alertKind` · element · choice · M12b：跟随预设、发现、起疑
- **敌人血条 / 预警 / 意图：Boss 条长** `el.threat.barWidth` · element · range · M12a：跟随预设
- **命中反馈 / 连击：画法** `el.feedback.form` · element · multi · M5a：飘字、拟声字、连击大数字、评价字（Good! / Perfect）、斜块 COMBO xN、命中标记 等 8 种
- **拟声字：尺寸档** `el.feedback.sfxSize` · element · choice · M12b：跟随预设、贴目标、主角级
- **拟声字：字内填充** `el.feedback.sfxFill` · element · choice · M12b：跟随预设、纯色、渐变、网点、金属
- **拟声字：星爆** `el.feedback.sfxBurst` · element · choice · M12b：跟随预设、单层、多层撞色
- **拟声字：逐字倾斜** `el.feedback.sfxLetterTilt` · element · range · M12b：跟随预设
- **通知 / 大字提示：画法** `el.notify.form` · element · multi · M5a：滚动消息列、横幅、整屏横贯带大字、圆形徽章 / 纹章、圆角提示卡、小字道具名 等 13 种
- **通知：条数上限** `el.notify.maxItems` · element · int · M12b：跟随预设
- **通知：停留时长** `el.notify.dwell` · element · range · M12b：跟随预设
- **计时 / 分数 / 回合：画法** `el.timer.form` · element · choice · M5a：跟随预设、数字、回合徽章、回合横幅、比分胶囊、小字倒计时 等 13 种
- **计时：侧标签** `el.timer.caption` · element · choice · M12b：跟随预设、无、任务名
- **准星 / 瞄准：画法** `el.crosshair.form` · element · multi · M5a：十字、点、动态扩散、瞄准圈 + 落点偏移、激光线、地面落点圈 等 9 种
- **准星：激光道数** `el.crosshair.lines` · element · int · M12b：跟随预设
- **准星：激光间距** `el.crosshair.spacing` · element · range · M12b：跟随预设
- **准星：激光排向** `el.crosshair.orientation` · element · choice · M12b：跟随预设、横向、竖向
- **准星：激光起点** `el.crosshair.laserFrom` · element · choice · M12b：跟随预设、左下、枪口、镜头外
- **指向箭头：起点** `el.crosshair.aimFrom` · element · choice · M12b：跟随预设、角色、手牌区
- **准星：十字臂长** `el.crosshair.armLength` · element · range · M12b：跟随预设
- **准星：中心缺口** `el.crosshair.gap` · element · range · M12b：跟随预设
- **选中信息面板：画法** `el.selection.form` · element · choice · M5a：跟随预设、信息面板、单位卡、铭牌、tooltip、选择框 / 光圈 等 15 种
- **选中信息面板：写的是谁** `el.selection.subject` · element · choice · M12b：跟随预设、物件 / 单位、目标档案
- **选中信息：说明框内卡** `el.selection.innerCard` · element · choice · M12b：跟随预设、单层、外框 + 白内卡
- **选中信息：侧栏贴哪边** `el.selection.edge` · element · choice · M12b：跟随预设、左缘、右缘
- **选中信息：实体小图** `el.selection.portrait` · element · choice · M12b：跟随预设、渲染图、圆头像、不画
- **队伍 / 玩家条：画法** `el.party.form` · element · choice · M5a：跟随预设、头像框 + 小血条、立绘头像（大小区分当前）、名牌、单位卡条、头像 + 分数药丸 等 14 种
- **队伍：肖像背后的光环** `el.party.halo` · element · toggle · M12b：
- **队伍：成员间距** `el.party.gap` · element · range · M12b：跟随预设
- **队伍：成员交叠** `el.party.overlap` · element · range · M12b：跟随预设
- **队伍：铺开方式** `el.party.spread` · element · choice · M12b：跟随预设、按锚点、铺满宽、对准每个单位
- **队伍：头像下的胶囊** `el.party.memberPill` · element · choice · M12b：跟随预设、不画、倒计时
- **队伍：状态带的点亮格行** `el.party.pointsRow` · element · choice · M12b：跟随预设、不画、点亮节点、独立小格、菱形点
- **时间 / 天气 / 日历：画法** `el.clock.form` · element · multi · M5a：时钟数字、太阳盘 / 日夜钟、日历页、天气徽标、天数大字、昼夜分段盘 等 11 种
- **时间：昼夜盘外圈** `el.clock.rim` · element · choice · M12b：跟随预设、素圈、锯齿、光芒
- **时间：白天占比** `el.clock.dayPart` · element · range · M12b：跟随预设
- **时间：黄昏占比** `el.clock.duskPart` · element · range · M12b：跟随预设
- **信息叠层 / 图例：画法** `el.overlay.form` · element · multi · M5a：热力图 + 图例、方向箭头、状态图标、格子高亮、建造网格、范围圈 / 路线线 等 11 种
- **叠层：状态图标的样子** `el.overlay.statusStyle` · element · choice · M12b：跟随预设、小图标、思想气泡
- **叠层：图例样式** `el.overlay.legendStyle` · element · choice · M12b：跟随预设、色块、渐变条、统计行、图标列
- **叠层：图例位置** `el.overlay.legendAnchor` · element · choice · M12b：跟随预设、左上、上中、右上、左中、右中 等 9 种
- **叠层：放置合法性** `el.overlay.legality` · element · choice · M12b：跟随预设、填色、红斜纹、图标
- **世界标签：画法** `el.worldLabel.form` · element · multi · M12b：城市名牌、竖幡、逐实体图标
- **牌堆：画法** `el.piles.form` · element · choice · M12b：跟随预设、牌背 + 计数角标
- **牌堆：哪几堆** `el.piles.kinds` · element · multi · M12b：抽牌堆、弃牌堆、消耗堆
- **遗物列：画法** `el.passives.form` · element · choice · M12b：跟随预设、一行图标、图标网格
- **遗物列：一页几个** `el.passives.perPage` · element · int · M12b：跟随预设
- **消耗品槽：画法** `el.consumables.form` · element · choice · M12b：跟随预设、一排格子
- **消耗品槽：有东西的格数** `el.consumables.filled` · element · int · M12b：跟随预设
- **增益槽：画法** `el.buffs.form` · element · choice · M12b：跟随预设、单格 / 一排
- **增益槽：有东西的格数** `el.buffs.filled` · element · int · M12b：跟随预设
- **人口胶囊：画法** `el.population.form` · element · choice · M12b：跟随预设、胶囊
- **世界容器：画法** `el.container.form` · element · choice · M12b：跟随预设、格子网格
- **世界容器：列数** `el.container.columns` · element · int · M12b：跟随预设
- **按键 / 操作提示：画法** `el.prompt.form` · element · multi · M5a：键位列表、当下可按、按键图例条、触屏按钮、图标角标热键
- **字幕：画法** `el.subtitle.form` · element · choice · M12a：跟随预设、无框字幕、底条、说话人着色、对话气泡、只写台词 等 7 种
- **字幕：说话人前缀** `el.subtitle.speaker` · element · choice · M12b：跟随预设、写前缀、不写
- **字幕：写外语原文** `el.subtitle.untranslated` · element · toggle · M12b：
- **主行动按钮：画法** `el.cta.form` · element · choice · M5a：跟随预设、宽按钮、大圆钮、一对按钮、快门、三联钮 等 12 种
- **行动号召：按钮上的字** `el.cta.caption` · element · choice · M12b：跟随界面、开始、继续、结束回合、跳过、出发 等 8 种
- **标题 / LOGO：画法** `el.title.form` · element · choice · M5a：跟随预设、LOGO、章节标题卡、页眉标题条、艺术大字海报标题、区域标题卡 等 9 种
- **标题 / LOGO：绝对字号（屏高 %）** `el.title.size` · element · range {'min': 2, 'max': 30, 'step': 1} · M12b：
- **标题 / LOGO：撑满宽度** `el.title.fit` · element · choice · M12b：不撑、撑满宽度
- **标题 / LOGO：出血裁切** `el.title.bleed` · element · range {'min': 0, 'max': 0.3, 'step': 0.02} · M12b：
- **区域标题卡：首访 / 再访** `el.title.visit` · element · choice · M12b：首访、再访
- **标题：写不写主标题** `el.title.name` · element · choice · M12b：跟随预设、写、不写
- **奖励 / 获得物：画法** `el.reward.form` · element · choice · M5a：跟随预设、图标 + 数量、单件特写、卡牌平铺、立绘登场、宝箱 + 物品 等 7 种
- **价格 / 消耗：画法** `el.cost.form` · element · choice · M5a：跟随预设、按钮内嵌价 / 消耗、价签 / 胶囊、货币图标 + 数字、巨字价格、持有 / 需求（红绿） 等 11 种
- **配方行：插件槽数** `el.cost.moduleSlots` · element · int · M12b：跟随预设
- **名次 / 段位 / 评级：画法** `el.rank.form` · element · multi · M5a：段位徽章、名次数字、评分字母（S / A / B）、星级评价、奖牌 / MVP、序数名次 等 7 种
- **身份 / 头像 / 等级：画法** `el.profile.form` · element · choice · M5a：跟随预设、头像 + 等级、名片、Lv + 经验条、称号横幅、名字 + 副题
- **加载 / 等待指示：画法** `el.loading.form` · element · choice · M5a：跟随预设、进度图形、转圈、母题化（指南针 / 地球 / 放大镜）、下载速度 + 体积、只有提示文字
- **引导指示 / 聚光：画法** `el.guide.form` · element · choice · M5a：跟随预设、手指、光圈脉冲、箭头、高亮方块、暗幕镂空 等 7 种
- **聊天：画法** `el.chat.form` · element · choice · M5a：跟随预设、折叠框、频道文本行、气泡流
- **倍速 / 暂停 / 自动：画法** `el.gameSpeed.form` · element · choice · M5a：跟随预设、暂停 + 设置按钮、倍速按钮、自动托管、暂停 / 1x / 2x 按钮条、▶ / ▶▶
- **倍速 / 暂停 / 自动：档数** `el.gameSpeed.steps` · element · int · M12a：跟随预设
- **世界 / 社会态势条：画法** `el.meter.form` · element · choice · M5a：跟随预设、单项、图标 + 仪表、两项对立、多项堆叠、计分公式 等 9 种
- **计量条：首行加粗** `el.meter.leadRow` · element · choice · M12b：跟随预设、一样粗、首行加粗
- **计量条：逐行颜色** `el.meter.rowColors` · element · multi · M12b：强调色、第二强调色、生命色、危险色、好色、警告色 等 10 种
- **建造栏 / 系统入口条：画法** `el.toolbar.form` · element · choice · M5a：跟随预设、分类页签 + 子项抽屉、图标按钮排、系统入口小图标、无底图标条、抽屉工具条 等 7 种
- **工具栏：屏幕代码** `el.toolbar.screenCode` · element · choice · M12b：跟随预设、不画、三字母代码
- **工具栏：附件** `el.toolbar.extras` · element · multi · M12b：转镜头箭头、圆形暂停钮
- **行动顺序：画法** `el.turnOrder.form` · element · choice · M5a：跟随预设、头像队列、速度时间轴、小图标队列、攻击顺序编号
- **行动顺序：轨道线** `el.turnOrder.track` · element · choice · M12b：跟随预设、不画、单线、双线
- **行动顺序：分段标签** `el.turnOrder.segments` · element · toggle · M12b：
- **行动顺序：本回合人数** `el.turnOrder.roundSize` · element · int · M12b：跟随预设
- **行动顺序：间距** `el.turnOrder.spacing` · element · choice · M12b：跟随预设、紧挨、均分
- **对话 / 事件选项：画法** `el.choices.form` · element · choice · M5a：跟随预设、文字行、按钮、并列横幅、聊天气泡、指令列表
- **对话选项：标签样式** `el.choices.labelStyle` · element · choice · M12b：跟随预设、普通、方括号标签、检定标签
- **选项：默认选中** `el.choices.defaultFocus` · element · choice · M12b：跟随预设、第一项、不高亮
- **选项：键位徽章** `el.choices.keyBadge` · element · choice · M12b：跟随预设、不画、起端、末端
- **选项：选中标记** `el.choices.focusMark` · element · choice · M12b：跟随预设、不画、小箭头、箭头 + 右移
- **选项：不满足条件的项** `el.choices.lockedItem` · element · range {'min': 0, 'max': 6, 'step': 1} · M12b：
- **跑马条：画法** `el.ticker.form` · element · choice · M12b：跟随预设、新闻条、行情条
- **人名条：画法** `el.lowerThird.form` · element · choice · M12b：跟随预设、两条斜切色带、实底小牌
- **取景框：画法** `el.viewfinder.form` · element · choice · M12b：跟随预设、摄像机、监控
- **对话选项：文字对齐** `el.choices.align` · element · choice · M12b：跟随预设、居中、左对齐

## 预设（起点）

- **界面模板**（63）：登录、选服、创建角色、公告、起名、主界面（手游）、标题 / 主菜单（PC / 主机）、暂停（PC / 主机）、暂停（手游）、设置、读取、过场、新手引导、功能解锁、二次确认、提示条、战斗大字提示、升级提示、恭喜获得、结算（对战）、数据统计 / 记分板、NPC 对话、背包、角色详情、技能树、世界地图、任务、成就墙、图鉴（手账）、商城、柜台商店、抽卡入口、十连结果、通行证、七日签到、首充、VS 对阵、布阵、排行榜、聊天抽屉、邮件、关卡路径、章节标题卡、锻造 / 变强、建造、手牌牌桌、转盘、红包、拍脸图、拍照模式、三选一升…
- **皮肤**（38）：新粗野主义、毛玻璃、新拟态、扁平 / Material、拟物、像素位图、像素木框、手绘笔记本、国风水墨 / 墨笔、科幻 HUD、全息空间、JRPG 窗口、羊皮纸任务书、漫画对话框、倾斜动感、CRT 终端、Y2K 镀铬、瑞士几何 / 极简表格、构成主义、装饰艺术、Persona 拼贴、孟菲斯、极简单色、细线几何、Frutiger Aero、合成波 / 蒸汽波、军事战术、圆润友好、和风、手游抽卡金框、重装饰雕花框、线描花饰、暗色细线、二次元白卡细线、糖果卡通（Q 版）、暗金金属牌、灰盒（中性基线）、朴素默认…
- **品类布局**（31）：探索与冒险、动作与 Roguelite、横版平台、第一 / 第三人称射击、角色扮演（MMO / ARPG）、ARPG 液体球、MOBA 底座、格斗对战、解谜与侦探、恐怖与悬疑、生存与制作、建造与经营、工厂与自动化、生活与养成、策略与战术（回合）、策略（RTS / 大战略）、卡牌与桌面、竞速与驾驶、沙盒与物理、叙事与视觉小说、手游横屏动作（触屏）、全部控件展示、割草类、魂类、殖民模拟、塔防、自走棋、节奏、放置、弹幕射击、类银河城…
- **设计关键词**（18）：原始、奢华、赛博、科技线框、国潮、水墨、神圣 / 西幻、雕花金石、蒸汽朋克、冰霜、和风、西部、航海、哥特暗黑、太空科幻、童趣 / 糖果、田园木作、任务书…
- **参考游戏复刻**（15）：Hades · 局内 HUD、Hades · 对话、Hollow Knight · 护符页、Dota 2 · 局内、Stardew Valley · 对话、Mini Metro · 结算、Frostpunk · 事件抉择、Animal Crossing · Nookphone、Slay the Spire 2 · 战斗、Detroit · 线索、Control · 局内、Night Call · 对话、Carcassonne · 对局、二次元手游 · 十连结果、武侠手游 · 七日签到…
- **整套 UI 配方**（15）：Hades 式动作 Roguelite（PC 买断）、Celeste / Dead Cells 式像素平台、Stardew 式像素种田、Hollow Knight 式线描花饰、Slay the Spire 式卡牌、Into the Breach 式回合战术、Mini Metro 式极简、Night Call / Disco Elysium 式叙事对话、Control / Dead Space 式几乎无 HUD、RimWorld 式殖民模拟、Vampire Survivors 式割草、国风水墨 RPG、主机电视动作冒…
- **微调方向（UI 感觉）**（11）：更干净、更华丽、更好读、更融入画面、更有冲击、更柔和、更复古、更冷静克制、更电影感、更像世界里的东西、更压抑…
- **平台**（6）：手机竖屏、手机横屏、平板、PC 键鼠、主机 / 电视、掌机（Switch / Steam Deck）…
- **常用模式**（6）：左列表右详情、网格陈列、可拖动大画布、扇形手牌、径向轮盘、海报…
- **场景容器**（6）：手持终端、游戏内手机、书 / 收藏册、卷轴、书桌、柜台 / 货架…
- **节日主题**（5）：春节 / 新年、圣诞、七夕 / 樱花、万圣节、赛季主题…
- **商业化强度**（5）：买断制、F2P 手游、赛季服务型、免费 + 广告、MMO（订阅 / 内购）…
- **叠加**（3）：大字、色盲友好、低刺激…

## 派生规则（UI 跟随画面等，不是独立维度）

- `D-device`：手机：正文 15px、触控 ≥ 88px（44pt@2x）、安全区按刘海、输入 = 触屏；平板 14px / 72px；PC 14px / 安全边 2% / 键鼠；电视 26px / 5% / 手柄；掌机 18px / 3% / 手柄。视距
- `D-lightness`：场景整体很亮（雪地、正午、白纸媒介）→ 深色面板；很暗（夜、洞穴、恐怖）→ 浅色面板或浅字 + 发光；rel.harmony = contrast 时反向。
- `D-outline`：画面有描边 → UI 描边至少 solid，粗细 ≈ 画面线宽（2.2px → 2–3px），线色 = 墨色或同色加深；画面无描边 → 不强加。rel.harmony = sameMedium 时升为适配类（排到皮肤之后）；unified 
- `D-toon`：卡通色阶 / 硬阴影 → UI 用错位硬投影或平面；平滑漫反射 → 柔投影。同一媒介时升为适配类。
- `D-paper`：纸张素材 / 水彩 / 工笔 → 内芯 = 纸；水墨 → 宣纸 + 笔触边 + 书法标题；木纹 → 木框；石材 → 石框；金属 → 铁；黏土 / 毛毡 → 塑料或布；地图画风跟随媒介（水彩 → painted，线稿 → chalk）。同一媒
- `D-boil`：线条沸腾 / 抖动开 → UI 手绘抖动同步（静态抖动幅度，动态跟随帧率）。同一媒介时升为适配类。
- `D-frame`：画面一拍二 / 一拍三 → UI 动画同样抽帧（v1 的"缓动改阶跃"删掉，阶跃就是帧率）。同一媒介时升为适配类。
- `D-crt`：CRT / VHS → 屏幕叠加 UI 默认仍清晰；叙事内 UI 跟着弯曲；建议等宽字（扫描线特效是关键词 kw.tech / kw.cyber 的事，不在规则里写）。
- `D-camera`：第一人称 → 加准星、手持物可承载叙事内 UI；俯视 / 等距 → 加选中面板、世界内标注默认地面贴花；第三人称追尾 → 默认头顶公告板。
- `D-genre`：品类决定默认的品类布局预设（第 3.4 节，布局带 genre 字段）；之后每个元素的画法、锚点都可单独改。
- `D-timeModel`：回合制 → 加结束回合按钮（el.cta）与回合横幅（el.timer = turnBanner）；可暂停 → 加倍速控件（el.gameSpeed）；回合限时 → 计时徽章醒目。
- `D-diegesis-post`：叙事内 → 跟随纸纹 / 描边 / 调色（stylize）；空间内 → 跟随弯曲但不跟随纸纹；屏幕叠加与元 UI → 不受影响。
- `D-letterbox`：画幅黑边开 → HUD 在黑边内排版；字幕可以压进下黑边。
- `D-fxDensity`：画面特效重 → 文字默认描边，建议开启特效遮挡检查。
- `D-zoom`：策略 / 建造镜头拉远超过阈值 → 切到下一档语义缩放（标签 → 图标 → 色块）。
- `D-rarity-show`：普通 → 演出强度 1、直接显示；稀有 → 2、放射光；最高稀有 → 3、光柱 + 卡背预告。
- `D-teams`：反向派生：UI 与 3D 场景共用同一对阵营色，色盲检查一起做。
- `D-orient`：竖屏：左右分栏 / 三栏 → 上下分栏，左右页签 → 底部页签，网格列数上限 4，左右立绘 → 上半屏。
- `D-aspect`：21:9：HUD 收进中间 16:9 区域（安全边按超出部分加宽）；19.5:9 手机：按刘海加宽长边安全区。
- `D-input`：键鼠 → 键帽图标，临时详情 = 悬停提示；手柄 → 主机按键图标、焦点框必须可见、按键提示 = 底部图例；触屏 → 触屏图标、没有悬停（临时详情改弹窗或底部浮层）、按键提示 = 触屏按钮、分页可滑动。按键图标与输入方式不匹配时改写。
- `D-players`：1v1 → 主体两侧（focalSide = both）+ 元素锚点左右镜像（v1 的 lay.composition = mirror 与 el.vitals.form = mirrored 删掉）；分屏 → lay.playfield 
- `D-pixel`：画面像素化 > 1 → UI 像素化 = 与世界同网格、像素字；UI 像素化 ≠ off → 转角 = 像素台阶、对齐到像素网格（v1 的 lay.grid = pixel 与 vis.shape = pixelStep 改为这里推出）。像
- `D-skew`：倾斜 ≠ 0 → 对齐网格随之倾斜、标题文字随之旋转（v1 的 lay.grid = diagonal、typ.direction = diagonal 删掉）。
- `D-screen`：子功能是基础界面时，界面类型 = 它的 parent；layer 取子功能的 layer。子功能未选或是浮层时，界面类型保持手动值。
- `D-container`：局内 HUD 且容器未定 → overlay（v1 的 lay.archetype = hud 删掉）。
- `D-pack`：示例内容包 auto：显式选了品类布局 → 它对应的包（31 个布局 → 24 个包，见 src/hud/content/index.ts 的 LAYOUT_PACK）；否则按画面品类 game.genre（GENRE_PACK）；对应的包
- `D-harmony`：同一媒介 → col.source = scene，跟随规则升为适配类；统一调色 → col.source = scene，跟随规则不生效；中性 → col.source = skin，跟随规则不生效；刻意对比 → col.source =
- `D-palette`：col.source = 取自场景色板时，UI 的色板引用解析为场景色板的对应角色（现有"UI 取色自色板"开关）。
- `D-iconSet`：图标来源未定时按风格给：线性 → 图标字体；扁平 / 双色 / 剪影 → 程序几何；手绘 / 3D 渲染 / 写实 / 像素 → 图集素材（未生成前灰盒占位）。
- `D-dismiss`：自动消失 → 非阻断；点空白 / 点任意处 → 半阻断；按钮 / 按键 → 模态；不可关闭 → 强制流程。不可关闭（forced，如三选一必须选一张）时，下层（界面模板）带进来的运营动作「再抽 / 再来一局」（ops.actions 的 r
- `D-lightness-text`：无底（vis.opacity = 0）且背后是实时画面（或这是局内 HUD）时，文字可读辅助至少是投影（约束 C-legibility 检查它不是 none）。
- `D-ornament`：装饰预算 0 → 饰件清空、母题 none；≥ 2 而饰件未定 → 按母题给一组默认饰件（花叶 → 角花 + 分隔饰条；祥云 → 挂件；铆钉 → 铆钉；其它 → 角花）。预算 0 的清空现在真的生效（并集多选写 [] = 清空，M12a-0
- `D-emphasis`：单色界面（col.strategy = mono）里 color 自动退化为 value（明暗）。强调配方作用在 elx.priority = primary 的元素上：size → 该元素 scale ≥ 1.4；value → hier
- `D-ops`：运营元素密度 = 读数：0 无；有红点或 1–2 个角标 → 1；有入口簇或 3 个以上角标 → 2；入口簇 + 倒计时 + 折扣 → 3。
- `D-implies`：蕴含型约束在解析时直接补值：书容器 → 详情常驻；浮空弹窗 → 弹窗底不透明度 0；竖排侧牌 → 标题竖排；分屏 → 玩法区分屏；不画 UI → 元素集合为空。
- `D-reduceMotion`：开 → 反馈强度 0、入场改淡入、无待机动效、去掉闪白与震屏、演出强度上限 1。
- `D-reduceTransparency`：开 → 半透明面板改实底（0 < 不透明度 < 1 → 1）、模糊 0；高对比再加文字描边、去掉纹理内芯。