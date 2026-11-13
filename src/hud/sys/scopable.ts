/*
 * 按目标生效的参数（M12a-01）：键写成 <参数>@<目标>（目标 = 信息元素 el.<id>，或组件 / 部件名，见 register.ts 的 COMPONENTS）时，
 * 只有这里列出的参数真的被渲染器按目标读；其余的作用域键能存、能校验，但画面按全局值画（scripts/refs/check-param-vectors.py 给"⚠"提醒）。
 * 读法与优先级：元素里的部件查 <参数>@<部件> → <参数>@<元素> → 全局（elements/core.ts 的 e.part()），与 Godot theme_type_variation 的继承同序。
 *
 * 本文件不依赖任何模块：theme.ts / core.ts 引用它，check-param-vectors.py 用正则读 SCOPABLE_IDS（只认单引号字符串，别改成拼接）。
 * 之后每批让某个参数按目标生效时：把它加进 SCOPABLE_IDS，并给参数写 overrideAt（docs/survey/data/ui-param-system.json）。
 */

export const SCOPABLE_IDS = [
  // 主题 token（sys/theme.ts 的 patchTheme 按目标链重算面板 / 按键 / 血条 / 文字 token，规则与全局那套相同）
  'vis.corner', 'vis.cornerSize', 'vis.edge', 'vis.skew', 'vis.jitter', 'vis.opacity', 'vis.fill', 'vis.pattern', 'vis.patternOpacity', 'vis.blur',
  'vis.stroke', 'vis.strokeWidth', 'vis.strokeColor', 'vis.strokeSides', 'vis.strokeGlow', 'vis.depth', 'vis.gloss', 'vis.ornament', 'vis.motif',
  // 随手倾角（M12a-06）：elements/core.ts 的 tiltOf 按目标链读（patchTheme 不用它）
  'vis.tilt',
  // 分隔线样式（M12a-08：theme.ts 的 panel.ornament.dividerStyle，patchTheme 按目标重算）
  'vis.dividerStyle',
  // 小组件外形（M12a-09）：elements/core.ts 的 shapeStyle 按 @部件 → @元素 → 全局读（格子、头像、主次按钮、按键、工具栏钮、节点）；
  // patchTheme 也重算（按键 token 的外形跟着作用域走，主按钮 / 按键帽与次按钮同形）
  'vis.silhouette',
  'col.lightness', 'col.surface', 'col.surface2', 'col.text', 'col.accent', 'col.accent2', 'col.border', 'col.gradient', 'col.strategy',
  // 语义色（M12a-02）与颜色角色参数（M12a-03）：theme.ts 的颜色角色 th.roles、角色盒子 control / tooltip / titleBar / card 按目标重算
  'col.good', 'col.warn', 'col.bad', 'col.focus', 'col.nodeDone', 'col.heading', 'col.icon', 'col.muted', 'col.quest', 'col.control', 'col.controlText', 'col.track', 'col.trackStroke',
  'ast.core', 'ast.coreMat', 'ast.frame', 'ast.frameMat', 'ast.fx', 'ast.ornaments', 'ast.ornamentScope', 'ast.ornamentMinSize',
  'typ.body.family', 'typ.body.weight', 'typ.body.case', 'typ.body.tracking', 'typ.body.style',
  'typ.display.family', 'typ.display.weight', 'typ.display.case', 'typ.display.tracking', 'typ.display.style', 'typ.titleFx', 'typ.legibility',
  // 描边色与粗细（M12a-33）：theme.ts 的可读辅助 / 标题特效描边与 t.outline 按目标重算
  'typ.outlineColor', 'typ.outlineWidth',
  // 按钮（M12a-35）：字族角色 / 字号与动作角色色写进 t.button（theme.ts 按目标重算，@button、@el.cta……）；内容 / 底框 / 面由 core.ts 的 button() 经 cmp() 按 @部件 → @元素 → 全局读
  'typ.button.family', 'typ.button.size', 'col.semantic', 'col.actionColors', 'cmp.button', 'cmp.buttonBox', 'cmp.buttonFace',
  // 组件形态（elements/core.ts 的 cmp()，按目标链查）
  'cmp.gauge', 'cmp.plate', 'cmp.badge', 'cmp.dialogBox', 'cmp.dialogTail', 'cmp.slot',
  // 面板插画槽（M12a-36：el.selection 读 cmp.panelArt@el.selection）
  'cmp.panelArt',
  // 格子状态（elements/core.ts 的 slot()，按 slot → 元素 → 全局查）；稀有度侧条 / 星级的位置（M12a-09）
  'st.locked', 'st.emptySlot', 'st.cooldown', 'st.selected', 'st.newCue', 'st.rarityCue', 'st.rarityPos',
  // 告警样式（M12a-31：世界状态图标按 @el.overlay 读 st.alert = blink）
  'st.alert',
  // 格子数量角标（M12a-09：画不画、画在哪，slot() 经 cmp() 按 slot → 元素 → 全局查）
  'cmp.slotBadge', 'cmp.slotBadgePos',
  // 页签内容与选中指示（M12a-22：elements/tabs.ts 的 tabStrip 经 cmp() 按 @tab / @nav2 → @元素 → 全局读）
  'cmp.tab', 'cmp.tabIndicator',
  // 列表行底与字段颜色（M12a-27：screen.ts 的 listRows 经 cmp() / e.v 按 @listRow → 全局读）
  'cmp.listRowBox', 'cmp.listRowColors',
  // 动效（sim.ts：数值变化按生命 / 资源元素读，力度按元素读——飘字放大、元素自己的震动幅度）
  'mo.valueChange', 'mo.juice',
  // 图标画风与位图着色（M12b-58：elements/core.ts 的 iconStyleOf / iconTintOf / glyphIcon 按目标链读；图集选择 iconSetId(r, 画风)）
  'vis.iconStyle', 'vis.iconTint', 'vis.iconTintAmount',
  // 文字对齐（M12b-55：screen.ts 的 textAlign 按 @body（长文块）/ @title（主体标题字）→ 全局读）
  'typ.align',
  // M12b B3 风格图元 I（theme.ts 的 derive 经 q 读，patchTheme 按目标重算）：分角遮罩、面板外形与生成轮廓、描边渐隐、偏移阴影、渐隐遮罩、图案作用区、磨损 / 表面处理、微字密度
  'vis.cornerMask', 'vis.panelShape', 'vis.shapeJitter', 'vis.brushDryness', 'vis.brushDir', 'vis.brushTip', 'vis.edgeSides', 'vis.strokeFade',
  'vis.depthOffset', 'vis.depthAngle', 'vis.depthColor', 'vis.fade', 'vis.fadeLength', 'vis.patternArea', 'vis.ditherMatrix', 'vis.patternOrigin', 'vis.noiseDensity',
  'ast.wear', 'ast.finish',
  // M12b B4 风格图元 II：线的粗细调制、第二母题（theme.ts 的 derive 经 q 读，写进面板描边与饰件）；标题前缀（core.ts titlePrefix 按 @title → @元素 → 全局查）
  'vis.strokeModulation', 'vis.motif2', 'typ.titlePrefix',
  // 分隔线的位置（M12b-45：theme.ts 写进饰件、screen.ts 的 dividerPlaces 按目标链读）
  'vis.dividerPlace',
  // 饰件挂点（M12b-49）：饰色 / 宝石色（theme.ts 写进饰件与 t.ornColor）；挂点 / 出框量 / 端头形（theme.ts 写进饰件，core.ts 的 anchorsOf / pickedStr 按目标链读）；耳标位置（core.ts earTab）
  'col.ornament', 'col.gem', 'ast.ornamentAnchor', 'ast.ornamentOverhang', 'ast.endcapShape', 'ast.earTabAt',
  // 外框结构（M12b-50）：框厚（theme.ts 写进 panel.frame，patchTheme 按目标重算：@el.cta 的齿轮表圈、@panelArt 的图窗框）
  'ast.frameThickness',
  // 标牌几何（M12b-47）：哪端斜切 / 出血（core.ts plate 经 cmpPicked 按 @角色 → @plate → @元素 → 全局查）
  'cmp.plateEnds', 'cmp.plateBleed',
  // M12b B5 数字字形（theme.ts 的 t.numerals，patchTheme 按目标重算：只给资源栏写里程表 typ.numerals.family@el.resources = odometer）
  'typ.numerals.family', 'typ.numerals.weight', 'typ.numerals.style', 'typ.numerals.digits', 'typ.numerals.cells', 'typ.numberFormat',
  // M12b B5 数值图形（elements/gauges.ts 经 chosenKey / pickedStr 按 @bar → @元素 → 全局读）：单位数 / 单位形 / 方向 / 仪表子件 / 球心图标、端头 / 外框 / 换色 / 阈值 / 附属件
  'cmp.gaugeUnits', 'cmp.gaugeUnitShape', 'cmp.gaugeDir', 'cmp.dialParts', 'cmp.gaugeIcon',
  'cmp.gaugeCap', 'cmp.gaugeCapSize', 'cmp.gaugeFrame', 'cmp.gaugeColorBy', 'cmp.gaugeLow', 'cmp.gaugeHigh', 'cmp.gaugeExtra',
  // M12b B5 事件字效（theme.ts 的 t.textFx，patchTheme 按目标重算：typ.fillStyle@el.feedback 只给飘字 / 拟声字）
  'typ.fillStyle', 'typ.fillColors', 'typ.shadowOffset',
  // M12b B6 输入字形与光标（core.ts keyCap / cursorSetOf 经 pickedStr 按 @key → @元素 → 全局读：ix.glyphTint@el.prompt 只给按键图例换单色圈）
  'ix.glyphTint', 'ix.cursorSet', 'ix.cursorContext',
  // M12b B7 格位与卡牌：格下标牌（core.ts slot 经 pickedStr 按 @slot → @元素 → 全局读）、格底状态色（slotTintOn 同口径，B7 审查修复 ⑭）
  'cmp.slotLabel', 'st.statusMark',
  // 卡面版式与语义着色（M12b-12：card.ts 的 cardKind / cardColorBy 按 @card → @元素 → 全局读）
  'cmp.card', 'cmp.cardColorBy',
  // 卡内子件与手牌（M12b-69：card.ts 的 cardPartsOf 按 @card / @tooltip → @元素 → 全局读；combat.ts 的 handGeom 按 @el.abilities → 全局读叠压 / 出屏）
  'cmp.cardParts', 'lay.cardOverlap', 'lay.cardBleed',
  // 插画槽的图窗处理 / 外框 / 宽高比 / 图注（M12b-32：core.ts artDecor 与 screen.ts artRatioH 按 @panelArt → @元素 → 全局读）
  'cmp.panelArtFrame', 'cmp.panelArtFx', 'cmp.panelArtRatio', 'cmp.panelArtCaption',
  // M12b B8 数据区与详情：详情字段（screen.ts detailFieldsOf 经 chosenKey 按 @tooltip → 全局读：cmp.detailFields@tooltip 只给浮动详情换字段）、
  // 格组（slotGroupBlock 按 @slotGroup → 全局读计数徽章；cmp.slotGroupTitle 同口径）
  'cmp.detailFields', 'cmp.slotGroup', 'cmp.slotGroupTitle',
  // 列表上方的选择条（M12b-13：listPlan 经 pickedStr 按 @listRow → 全局读）
  'cmp.listHeader',
  // B8 审查修复 ③：节点连线（combat.ts 的出牌指向按 @el.crosshair 读 vis.connector = chevronChain，slay-the-spire#13；节点图本身按全局画）、
  // 列表行字段（info.ts 的 el.party 状态带按 @el.party 读 level，octopath#16；经营面板的滑条按 @listRow 读；模板列表行本身按全局读）
  'vis.connector', 'cmp.listRow',
  // B8 审查修复 ⑥：引线（screen.ts 的 leaderOf 按 @tooltip（浮动详情 → 锚点）/ @mapLabel（地名 → 兴趣点）/ @slotGroup（格组 → 身体部位）→ 全局读）
  'cmp.leader', 'cmp.leaderEnd',
  // M12b B10：小地图单独选画风（core.ts mapStyleOf 按 @el.minimap → 全局读：vis.mapStyle@el.minimap = linePlan 时小地图按需烘一张线稿图）
  'vis.mapStyle',
  // 倾斜方式与作用层（M12b-40：core.ts tiltOf / tiltLayersOf 经 pickedStr 按 @部件 → @元素 → 全局读：vis.tiltLayers@el.party = boxAndContent 只让队伍卡整块转）
  'vis.tiltMode', 'vis.tiltLayers',
  // M12b-63 K1 视觉语言余项：theme.ts 的面板 token（patchTheme 按目标重算）——光源方向、套印错位、做旧、毛玻璃的着色 / 亮边 / 颗粒
  'vis.lightAngle', 'vis.misregister', 'vis.misregisterAngle', 'ast.aging', 'vis.blurTint', 'vis.edgeLight', 'vis.grain',
];

/**
 * 已经接上作用域的部件名（渲染器真的会 e.part(名字) 的）：组件名里不在这里的（modal、input）
 * 能存、能校验，但画面上按元素 / 全局值画，check-param-vectors.py 同样给"⚠"。信息元素 el.<id> 总是接上的（makeCtx 按元素打补丁）。
 */
export const SCOPE_PARTS = [
  'panel', 'button', 'key', 'tab', 'bar', 'slot', 'tooltip', 'titleBar', 'title', 'listRow', 'minimapFrame', 'avatar', 'badge', 'plate', 'card', 'node',
  // 二级页签行（M12a-22：lay.navDepth = 2，cmp.tab@nav2）
  'nav2',
  // 人名牌（M12a-23：对话类模板页头的说话人名，plate(…, 'name') 查 @name → @plate）与对白框（对话类模板的容器面板、字幕底条，e.part('dialog')）
  'name', 'dialog',
  // 贴边条 / 底座 / 边框与同锚点共用底条（M12a-16 / 18：compose/edgebar.ts 的 hudBarBox 取 e.part('hudBar') 的 t.hudBar 盒子；模板顶栏 flow.chrome = statusBar 同样）
  'hudBar',
  // 世界地图的地名牌（M12a-30：vis.mapLabels = plate 时 plate(…, 'mapLabel') 查 @mapLabel → @plate；onMap 的字色读 col.text@mapLabel）
  'mapLabel',
  // 列表行的进度条（cmp.gauge@progress，screen.ts 的 progressKind）与完成角标的标牌（cmp.plate@stateTag、col.surface@stateTag……，doneTag）：审查修复 A · C9
  'progress', 'stateTag',
  // M12b-68：行首 / 条前图标的底章（core.ts 的 iconChip：vis.silhouette@icon、col.surface@icon）、段位 / 回合章的盒子（el.rank 的 rankDisc、el.timer 的 timerRing：
  // vis.silhouette@rank、vis.stroke@rank……）、世界里的名牌与横幅名牌（el.selection / el.party 的 tag、el.profile 的 titleBanner：cmp.plate@nameplate、col.surface@nameplate……）
  'icon', 'rank', 'nameplate',
  // M12b-55：长文块（公告、对话 / 事件正文；screen.ts textBlock 的 e.part('body')：typ.align@body）
  'body',
  // M12b-36：面板的三层立体（外框带 / 内芯 / 凹槽）——只有 vis.depth@frame / @core / @well 读它们（theme.ts 读字面键，不是 e.part() 目标）
  'frame', 'core', 'well',
  // M12b-49：骑在面板边上的耳标（core.ts earTab 的 e.part('earTab')）、按钮端的键帽徽章（button() 的 e.part('keyBadge')）
  'earTab', 'keyBadge',
  // M12b-50：插画槽的图窗外框（core.ts artSlot 的 e.part('panelArt')：ast.frame@panelArt / ast.frameMat@panelArt）
  'panelArt',
  // M12b-24 / 13：分组标题（树的层列头、列表的分组标题行：screen.ts groupHeader 的 e.part('groupHeader')：cmp.plate@groupHeader 换标牌、col.text@groupHeader 换字色）；
  // M12b-11：格组（slotGroupBlock 的 e.part('slotGroup')：col.accent@slotGroup 换组名色、vis.silhouette@slotGroup 换格子外形）
  'groupHeader', 'slotGroup',
];

/** 参数（不带 @）是否按目标生效；'x.*' 形式的条目按前缀算 */
export const isScopable = (param: string) => SCOPABLE_IDS.includes(param) || SCOPABLE_IDS.some((s) => s.endsWith('.*') && param.startsWith(s.slice(0, -1)));

/**
 * 名字像主题 token、其实只经目标链读的参数（中期审查修复 ㉑）：theme.ts 的 derive 不读它们，按目标打主题补丁只是白算一遍，
 * Godot 也不该为它们出 Hud_<目标> 类型变体（原来出的变体与整屏主题一模一样）
 */
export const CHAIN_ONLY = new Set(['vis.iconTint', 'vis.iconTintAmount', 'typ.align', 'typ.titlePrefix', 'ast.earTabAt', 'ix.glyphTint', 'ix.cursorSet', 'ix.cursorContext', 'vis.connector', 'vis.mapStyle', 'vis.tiltMode', 'vis.tiltLayers']);
/** 主题 token 类（patchTheme 重算的那部分）：vis / col / ast / typ，去掉 CHAIN_ONLY */
export const THEME_SCOPED = new Set(SCOPABLE_IDS.filter((s) => /^(vis|col|ast|typ)\./.test(s) && !CHAIN_ONLY.has(s)));
