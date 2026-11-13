/*
 * 游戏 UI 的"呈现内容"分类：不同游戏的 UI / HUD 显示的东西不一样，先按内容分，再谈怎么画。
 * 两层：
 *   screen  界面类型——玩家此刻在看哪一屏（局内、背包、地图、对话……）
 *   element 信息元素——这一屏上呈现的具体信息（生命、资源、目标、交互提示……）
 * 用在三处（docs/ui-hud-plan.md）：
 *   R2 参考卡标注每款游戏呈现了哪些内容（按内容统计参考数，每项 ≥ 3）；
 *   M5 控件库按 element 组织（一个元素可以有多种画法：条、数字、图标、叙事内……）；
 *   M7 / M9 品类布局 = 选哪些 element 放在哪个 screen 的哪里。
 * 新增内容只加一条数据；`genres` 写最常见的品类（用探索台 game.genre 的选项值），不是限制。
 */

export type UiContentKind = 'screen' | 'element';

export interface UiContent {
  id: string;
  kind: UiContentKind;
  label: string;
  /** 回答"玩家需要知道什么" */
  question: string;
  /** 常见画法（M5 控件的变体来源） */
  forms: string[];
  /** 常见品类（game.genre 的值） */
  genres: string[];
  /** 可读性要点（引用 docs/survey/06-genre-camera-ui.md 的 A 节规则） */
  readability?: string;
}

export const UI_CONTENT: UiContent[] = [
  /* ---------------- 界面类型 ---------------- */
  { id: 'screen.hud', kind: 'screen', label: '局内 HUD', question: '玩的时候要一直看到什么', forms: ['屏幕四角叠加', '贴在世界里', '画在角色或设备上', '只在需要时出现'], genres: ['explore', 'action', 'rpg', 'shooter', 'strategy', 'builder', 'racing'] },
  { id: 'screen.title', kind: 'screen', label: '标题 / 主菜单', question: '游戏给人的第一印象', forms: ['静态插画 + 列表', '实时场景背景', '叙事内（菜单就在世界里）'], genres: [] },
  { id: 'screen.pause', kind: 'screen', label: '暂停菜单', question: '停下来能做什么', forms: ['半透明覆盖', '整屏切换', '叙事内（翻开笔记本、手机）'], genres: [] },
  { id: 'screen.settings', kind: 'screen', label: '设置', question: '画面、操作、无障碍怎么调', forms: ['分页列表', '分组卡片', '带预览的滑杆'], genres: [] },
  { id: 'screen.inventory', kind: 'screen', label: '背包 / 物品', question: '我有什么、能用什么', forms: ['网格', '列表', '俄罗斯方块式空间背包', '叙事内（打开箱子）'], genres: ['rpg', 'survival', 'action', 'horror'], readability: 'A8：图标在 32~64px 下可辨，稀有度不能只靠颜色' },
  { id: 'screen.character', kind: 'screen', label: '角色 / 装备 / 属性', question: '我现在多强、穿着什么', forms: ['纸娃娃 + 槽位', '属性表', '雷达图'], genres: ['rpg', 'action'] },
  { id: 'screen.skilltree', kind: 'screen', label: '技能树 / 成长', question: '下一步往哪里成长', forms: ['树状连线', '星图', '网格解锁'], genres: ['rpg', 'action', 'strategy'] },
  { id: 'screen.map', kind: 'screen', label: '地图 / 世界地图', question: '我在哪、该去哪', forms: ['俯视全图', '手绘地图', '立体沙盘', '叙事内（摊开的纸地图）'], genres: ['explore', 'rpg', 'strategy'] },
  { id: 'screen.journal', kind: 'screen', label: '任务日志 / 目标', question: '我答应了谁、还有什么没做', forms: ['列表 + 详情', '笔记本手写', '线索墙'], genres: ['rpg', 'explore', 'narrative', 'puzzle'] },
  { id: 'screen.dialogue', kind: 'screen', label: '对话 / 文本', question: '谁在说话、我怎么回答', forms: ['底部文本框 + 立绘', '气泡', '电影字幕', '分支选项轮盘'], genres: ['narrative', 'rpg', 'life'], readability: 'A16：文本框对任意背景 ≥ 4.5:1；说话人靠名牌颜色 + 位置 + 立绘高亮' },
  { id: 'screen.shop', kind: 'screen', label: '商店 / 交易', question: '买卖什么、值不值', forms: ['左右双栏', '柜台叙事内', '卡片陈列'], genres: ['rpg', 'life', 'builder', 'card'] },
  { id: 'screen.craft', kind: 'screen', label: '制作 / 合成', question: '能做什么、缺什么材料', forms: ['配方列表', '工作台网格', '节点图'], genres: ['survival', 'factory', 'life'] },
  { id: 'screen.build', kind: 'screen', label: '建造菜单', question: '能造什么、放在哪', forms: ['底部分类栏', '径向菜单', '蓝图模式叠层'], genres: ['builder', 'strategy', 'factory', 'survival'] },
  { id: 'screen.results', kind: 'screen', label: '结算 / 胜负 / 奖励', question: '这一局怎么样、得到了什么', forms: ['评分表', '逐项翻牌', '战报'], genres: ['action', 'racing', 'card', 'strategy'] },
  { id: 'screen.loading', kind: 'screen', label: '读取 / 过场', question: '等待时看什么', forms: ['提示文字 + 插画', '小动画', '无缝（没有读取屏）'], genres: [] },
  { id: 'screen.tutorial', kind: 'screen', label: '教程 / 提示卡', question: '这个怎么玩', forms: ['弹出卡片', '按键提示叠层', '叙事内（角色告诉你）'], genres: [] },
  { id: 'screen.codex', kind: 'screen', label: '图鉴 / 收集 / 成就', question: '我收集了多少', forms: ['卡片墙', '博物馆陈列', '百分比列表'], genres: ['explore', 'life', 'rpg'] },
  { id: 'screen.save', kind: 'screen', label: '存档 / 读档', question: '进度存在哪', forms: ['存档槽列表', '缩略图卡片', '叙事内（存档点）'], genres: [] },
  // 下面 7 种来自 GameUI.net 的"功能"分类（国内手游截图为主，2026-10-14 收集）：主界面、登录选服、匹配、社交、排行、运营活动、关卡选择
  { id: 'screen.lobby', kind: 'screen', label: '主界面 / 大厅', question: '进游戏后的落脚点：能去哪、有什么新东西', forms: ['功能入口环绕角色立绘', '3D 主城场景', '底部页签 + 红点提醒'], genres: [] },
  { id: 'screen.frontend', kind: 'screen', label: '登录 / 选服 / 创角', question: '进入游戏前要做什么', forms: ['登录页 + 公告弹窗', '服务器列表', '捏脸 / 职业 / 阵营选择', '起名'], genres: ['rpg'] },
  { id: 'screen.match', kind: 'screen', label: '匹配 / 组队 / 备战', question: '和谁一起、对手是谁', forms: ['VS 对阵屏', '房间与队伍列表', '阵容编排'], genres: ['shooter', 'strategy', 'card', 'action'] },
  { id: 'screen.social', kind: 'screen', label: '社交 / 聊天 / 公会 / 邮件', question: '我和其他玩家的联系', forms: ['聊天频道侧栏', '好友列表', '公会大厅', '邮件收件箱'], genres: [] },
  { id: 'screen.rank', kind: 'screen', label: '排行 / 赛季 / 段位', question: '我排第几、这个赛季能拿到什么', forms: ['排行榜列表', '段位徽章 + 进度', '赛季奖励轨道'], genres: ['shooter', 'card', 'racing', 'strategy'] },
  { id: 'screen.liveops', kind: 'screen', label: '运营活动 / 抽卡 / 通行证', question: '今天有什么可领、可抽、可买', forms: ['签到日历', '抽卡演出（十连）', '通行证奖励轨道', '礼包弹窗（拍脸图）', '活动页签'], genres: [] },
  { id: 'screen.levelselect', kind: 'screen', label: '关卡 / 章节选择', question: '下一关去哪、完成得怎么样', forms: ['关卡地图连线', '章节卡片', '难度与星级'], genres: ['puzzle', 'platformer', 'action', 'card'] },
  { id: 'screen.cards', kind: 'screen', label: '手牌 / 牌桌', question: '我手里有什么、桌上发生什么', forms: ['扇形手牌', '牌桌俯视', '数值牌固定位置'], genres: ['card'], readability: 'A13：费用、攻击、生命在固定位置的高对比底板上；稀有度靠边框或宝石形状' },

  /* ---------------- 信息元素 ---------------- */
  { id: 'el.vitals', kind: 'element', label: '生命 / 护盾 / 体力', question: '我还能撑多久', forms: ['条', '数字', '心形图标', '画在角色身上（叙事内）', '屏幕边缘泛红（元 UI）'], genres: ['action', 'rpg', 'shooter', 'survival', 'platformer'] },
  { id: 'el.resources', kind: 'element', label: '资源 / 货币 / 人口', question: '我有多少可以花', forms: ['顶部资源栏', '图标 + 数字', '仓库实物（叙事内）'], genres: ['strategy', 'builder', 'factory', 'life', 'survival'] },
  { id: 'el.abilities', kind: 'element', label: '技能栏 / 冷却 / 弹药', question: '我现在能做什么动作', forms: ['底部技能栏', '冷却扇形', '弹药数字', '武器上的计数（叙事内）'], genres: ['action', 'rpg', 'shooter'] },
  { id: 'el.minimap', kind: 'element', label: '小地图 / 罗盘', question: '周围是什么、朝哪走', forms: ['圆形小地图', '顶部罗盘条', '无（靠地标）'], genres: ['explore', 'rpg', 'shooter', 'strategy', 'racing'] },
  { id: 'el.objective', kind: 'element', label: '任务目标 / 路点', question: '现在该干什么、去哪', forms: ['角落文字', '世界中的标记（空间内）', '屏幕边缘箭头', '无（靠环境引导）'], genres: ['explore', 'rpg', 'action', 'shooter'], readability: 'A5：任务标记要和环境色区分，并有形状冗余' },
  { id: 'el.interact', kind: 'element', label: '交互提示', question: '这个东西能不能用、按什么', forms: ['按键图标 + 文字', '物体描边高亮', '物体旁浮出（空间内）'], genres: ['explore', 'action', 'horror', 'puzzle', 'life'], readability: 'A6：全游戏统一一种"可交互"提示' },
  { id: 'el.threat', kind: 'element', label: '敌人血条 / 锁定 / 预警', question: '谁在威胁我、什么时候出手', forms: ['头顶血条（空间内）', '锁定框', '地面预警圈', '屏幕边缘方向提示'], genres: ['action', 'rpg', 'shooter', 'strategy'], readability: 'A2：敌方前摇比玩家特效更显眼；预警圈边缘清楚、填充淡' },
  { id: 'el.feedback', kind: 'element', label: '伤害数字 / 命中反馈', question: '刚才那一下有没有效', forms: ['飘字', '命中标记', '闪白与震屏（元 UI）'], genres: ['action', 'rpg', 'shooter'] },
  { id: 'el.notify', kind: 'element', label: '拾取 / 通知 / 成就弹窗', question: '刚刚发生了什么', forms: ['侧边滚动列表', '顶部横幅', '世界中飘出图标'], genres: [] },
  { id: 'el.timer', kind: 'element', label: '计时 / 分数 / 连击', question: '节奏与成绩', forms: ['大数字', '连击计数器', '进度环'], genres: ['action', 'racing', 'platformer', 'puzzle'] },
  { id: 'el.speed', kind: 'element', label: '速度 / 圈数 / 名次', question: '我开多快、排第几', forms: ['仪表盘', '数字速度', '名次列表', '车内仪表（叙事内）'], genres: ['racing'], readability: 'A14：路牌与弯道提示在 100m 外可读' },
  { id: 'el.crosshair', kind: 'element', label: '准星 / 瞄准', question: '我瞄着哪', forms: ['十字', '点', '武器瞄具（叙事内）', '动态扩散准星'], genres: ['shooter'], readability: 'A4：亮芯 + 暗边的双色准星，颜色可自选' },
  { id: 'el.selection', kind: 'element', label: '单位 / 选中信息面板', question: '我选中的是什么、状态如何', forms: ['底部信息面板', '单位头顶铭牌（空间内）', '选择框'], genres: ['strategy', 'builder', 'factory'], readability: 'A12：单位图标 20~30px 可辨，阵营色优先且可自选' },
  { id: 'el.party', kind: 'element', label: '队伍 / 同伴状态', question: '队友怎么样', forms: ['头像 + 小血条列表', '头顶名牌'], genres: ['rpg', 'shooter', 'action'] },
  { id: 'el.clock', kind: 'element', label: '时间 / 天气 / 日历', question: '现在几点、哪天、什么季节', forms: ['角落时钟', '日历页', '太阳位置（叙事内）'], genres: ['life', 'survival', 'builder'] },
  { id: 'el.overlay', kind: 'element', label: '信息叠层 / 图例', question: '整片区域的数据是什么分布', forms: ['热力图叠层 + 图例', '方向箭头', '机器状态图标'], genres: ['builder', 'factory', 'strategy'], readability: 'A9 / A10：叠层有自己的色板和图例，色盲安全；状态用图标 + 颜色 + 动画' },
  { id: 'el.prompt', kind: 'element', label: '按键 / 操作提示', question: '现在能按哪些键', forms: ['屏幕角落键位列表', '按键图标（随输入设备切换）', '触屏按钮'], genres: [] },
  { id: 'el.subtitle', kind: 'element', label: '字幕 / 说话人', question: '谁在说什么', forms: ['底部字幕 + 说话人名', '气泡', '叙事内（屏幕、招牌上的文字）'], genres: ['narrative', 'action', 'explore'] },
];

/**
 * 外部参考站的分类 → 本表的 id（R2 建卡时把它们的截图标签换算成我们的内容分类）。
 * GameUI.net"功能"标签（70 个，scripts/refs/gameui-collect.ts 收集；check:content 校验全覆盖）。
 */
export const GAMEUI_FUNCTION_TO_CONTENT: Record<string, string> = {
  登录界面: 'screen.frontend', 创建角色: 'screen.frontend', 服务器选择: 'screen.frontend', 游戏公告: 'screen.frontend', 姓名输入: 'screen.frontend', 阵营选择: 'screen.frontend',
  主界面: 'screen.lobby', 菜单: 'screen.pause', 暂停: 'screen.pause', 拍照: 'screen.pause', 设置: 'screen.settings',
  过场动画: 'screen.loading', Loading: 'screen.loading', 新手引导: 'screen.tutorial', 功能解锁: 'screen.tutorial', 提示: 'screen.tutorial', TIPS: 'screen.tutorial',
  战斗界面: 'screen.hud', 战斗提示: 'el.notify', 升级提示: 'el.notify',
  'VS/匹配': 'screen.match', '组队/阵容': 'screen.match',
  恭喜获得: 'screen.results', 结算: 'screen.results', 数据统计: 'screen.results', '胜利/失败': 'screen.results', '宝箱/金币': 'screen.results',
  NPC对话: 'screen.dialogue', 章节提示: 'screen.levelselect', '关卡/挑战': 'screen.levelselect',
  玩家信息: 'screen.character', 角色: 'screen.character', '外观/时装': 'screen.character', '宠物/坐骑': 'screen.character', '头像框/称号': 'screen.character',
  背包: 'screen.inventory', '锻造/合成': 'screen.craft', 技能: 'screen.skilltree', 任务: 'screen.journal', 成就: 'screen.codex', 图鉴: 'screen.codex',
  地图: 'screen.map', '卡组/卡牌': 'screen.cards', '建造/家园': 'screen.build', 商城: 'screen.shop', 拍卖行: 'screen.shop',
  '工会/帮派': 'screen.social', 聊天: 'screen.social', '社交/好友': 'screen.social', 邮件: 'screen.social', 邀请好友: 'screen.social', 结婚: 'screen.social',
  排行榜: 'screen.rank', '赛季/段位': 'screen.rank',
  '七日/签到': 'screen.liveops', 变强: 'screen.liveops', 十连抽: 'screen.liveops', 招募: 'screen.liveops', 充值: 'screen.liveops', 通行证: 'screen.liveops', VIP: 'screen.liveops',
  首充: 'screen.liveops', 福利: 'screen.liveops', 活动: 'screen.liveops', '转盘/抽奖': 'screen.liveops', 拍脸图: 'screen.liveops', 红包: 'screen.liveops', 节日: 'screen.liveops',
};

/** Interface In Game 的 Elements 分类（站内 21 个，2026-10-14 从截图页筛选栏读取；该站禁止爬取，只人工浏览） */
export const IIG_ELEMENT_TO_CONTENT: Record<string, string> = {
  'In game': 'screen.hud', 'Start screen': 'screen.title', Menu: 'screen.pause', Settings: 'screen.settings', Credits: 'screen.title',
  Inventory: 'screen.inventory', Character: 'screen.character', Stats: 'screen.character', 'Skill tree': 'screen.skilltree', Map: 'screen.map',
  Loading: 'screen.loading', 'Level selection': 'screen.levelselect', 'Game over': 'screen.results', Progress: 'screen.codex', Overlay: 'el.notify',
  Dialogue: 'screen.dialogue', Lobby: 'screen.lobby', Quest: 'screen.journal', Scoreboard: 'screen.results', Store: 'screen.shop', Tutorial: 'screen.tutorial',
};

export const UI_CONTENT_MAP = new Map(UI_CONTENT.map((c) => [c.id, c]));
export const UI_SCREENS = UI_CONTENT.filter((c) => c.kind === 'screen');
export const UI_ELEMENTS = UI_CONTENT.filter((c) => c.kind === 'element');
