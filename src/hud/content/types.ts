/*
 * 示例内容包（docs/c1-content-packs.md）：每个品类一款虚构游戏，局内 HUD、菜单、界面模板、模拟事件里的样本文字与数值都从"当前包"读。
 *   "雪线旅人"是 snowline 包（原来写死在各处的样本，逐字保留，换回它时画面逐像素不变）；
 *   运营类界面（商城、抽卡、奖励、签到、首充、通行证、红包、广告）不按品类设计：所有包共用 GENERIC（generic.ts），包只在个别字上覆盖（ops）。
 * 字段名与类型尽量沿用原来的 DATA / MENU / Q：elements/core.ts 的 DATA 是当前包 hud 的视图（元素都读它）；screen.ts 的 Q 已删，消费方直接读包字段；
 *   menu.ts 的 MENU、sample.ts 的 SAMPLE 两个视图已经没有消费方（删不删由维护者定）。
 * 包文件放在 src/hud/ 下：scripts/hud-chars.ts 会把里面的字收进字体子集——新包写完要重跑 npx tsx scripts/fonts-subset.ts。
 * 写包的约定：文字长度与雪线旅人的同一字段相近（版面按字宽排，但很多格子是定宽的）；符号用已有的几何 / 杂项符号（◆●▲✦♥■⚔☄♨…），不用彩色 emoji。
 *   定宽 / 定位处的隐性约束写在对应字段的注释里（标"版面"的几条），汇总见文档第 5 节"隐性约束"。
 */

/** 图标集图集（ui_icons_painted / ui_icons_3d）里的 16 个物品格；物品带它时，图集素材开着就画这张图标 */
export type AtlasIcon = 'wood' | 'stone' | 'ironOre' | 'crystal' | 'herb' | 'rope' | 'resin' | 'pot' | 'sword' | 'shield' | 'potion' | 'coin' | 'gem' | 'key' | 'map' | 'scroll';

/**
 * 手柄按钮（ix.glyphs = xbox / playstation / nintendo 时画哪个钮）：south / east / west / north 是四个面键（Xbox 的 A / B / X / Y），
 * lb / rb / lt / rt 是肩键与扳机，view / menu 是两个小功能键，ls / rs 是摇杆按下，up / down / left / right 是十字键。各套图标里写什么见 glyphs.ts 的 PAD_BUTTON。
 */
export type PadButton = 'south' | 'east' | 'west' | 'north' | 'lb' | 'rb' | 'lt' | 'rt' | 'view' | 'menu' | 'ls' | 'rs' | 'up' | 'down' | 'left' | 'right';

/** 素材登记表（src/content/assets.json）里的一张图：素材 id + files 里的键（默认 image） */
export interface AssetRef { id: string; file?: string }

/**
 * 样本条目的状态（M12a-10）：逐条声明，渲染只按声明画（不写 = 没有这个状态）。一份样本里只要有一条声明了状态，按序号的「演示状态」
 * （第 6 格起锁定、第 2 个是新品、第 4 / 8 个带稀有度、快捷栏第 5、6 格锁定……）就关掉（cnt.stateDemo = auto 时；on / off 可强制）。
 * locked 锁定 / 未获得；cd 冷却剩余 0~1；rarity 稀有度 0~4；fresh 新获得；empty 空格；qty 数量（快捷栏）；durability 耐久 0~1；selected 选中 / 已装备
 */
export interface ItemState { locked?: boolean; cd?: number; rarity?: number; fresh?: boolean; empty?: boolean; qty?: number; durability?: number; selected?: boolean;
  /** 类别 / 流派序号（M12b-33）：col.coding 含 lineId 时按 col.lineColors 的第 line 项着色（Dead Cells 的暴虐 / 战术 / 生存）；不写时按条目序号轮着演示 */
  line?: number;
  /** 状态值 0~1（M12b-01，st.statusMark = slotTint 的格底色：新鲜度 1 好 → 0 坏）；不写时按序号演示 */
  freshness?: number;
  /** 等级（M12b-01，cmp.slotLabel = levelTag 的「Lv.N」）；不写时按序号演示 1 / 2 / 3 */
  level?: number;
  /** 跨格（M12b-10）：[列, 行]，网格里占几格（Control 的武器形态卡占 3 列）；不写 = 1 × 1 */
  span?: [number, number];
  /** 置顶（M12b-10，lay.pinned = pinTop）：排成网格上方独立的一行（已装配的武器 / 改造槽） */
  pinned?: boolean }

/** 物品：[符号, 名字, 数量, 图集图标?, 状态?]——图标不给时按名字查 uiAssets.ts 的 ITEM_BY_NAME，再按符号猜；状态见 ItemState（要写状态而不给图标时第 4 项写 undefined） */
export type ItemRow = [glyph: string, name: string, qty: number, icon?: AtlasIcon, state?: ItemState];

/** 手牌（M12b-12，HudData.hand）：[符号, 名字, 说明, 费用, 类型, 点数?, 花色?, 稀有度?, 版本?] */
export type HandCard = [glyph: string, name: string, desc: string, cost: number, type: string, rank?: string, suit?: string, rarity?: number, edition?: string];

/** 技能格：[符号, 冷却剩余 0~1, 状态?]——冷却值只在演示状态开着时用（M12a-10），声明了状态时按状态的 cd */
export type AbilityRow = [glyph: string, cd: number, state?: ItemState];

/* ---------------- 游戏本身 ---------------- */

export interface GameInfo {
  /** 游戏名（标题元素、标题 / 登录界面主体、合规水印） */
  name: string;
  /** 英文副标题（游戏名下面那行宽字距大写字；词间两个空格，如 "SNOWLINE  WANDERER"） */
  subtitle: string;
  /** 一句话简介（面板说明与描述导出用，画布上不画） */
  tagline: string;
  /** 单字徽记（菜单水印 ast.watermark = logo 画的那个字） */
  glyph: string;
  /** 当前章节 / 关卡的几种写法 */
  chapter: {
    /** 章节序号（标题卡上面的小字，"第三章"） */
    index: string;
    /** 章节名（标题卡的大字，"雪线以上"） */
    title: string;
    /** 整屏横幅（el.notify = band，序号与地名之间两个空格） */
    band: string;
    /** 章节卡模板（tpl.chapterCard）主体的大字 */
    card: string;
  };
}

/* ---------------- 局内 HUD ---------------- */

/** 选中信息（el.selection：建造 / 策略里选中的单位或物件） */
export interface SelectionData {
  /** 单位类型（卡片标题，"伐木工"） */
  name: string;
  /** 面板标题：类型 · 名字 */
  full: string;
  /** 面板副标题：在做什么 / 效率 */
  job: string;
  /** 头顶名牌：类型 · 状态 */
  tag: string;
  /** 头像首字 */
  initial: string;
  /** 多选时的一排头像首字（6 个，前两个画成友方色） */
  portraits: string[];
  /** 卡片上的三条属性 [名, 0~1] */
  stats: [string, number][];
  /** 面板上的两条状态 [名, 0~1]（第二条画成黄色） */
  bars: [string, number][];
  /** 悬停提示：[物件名, 说明, 操作提示] */
  tip: [string, string, string];
}

/** 状态图标的角色（M12a-31）：颜色取颜色角色（sys/theme.ts 的 Roles：warn / danger / info / good） */
export type StatusRole = 'warn' | 'danger' | 'info' | 'buff';

export interface HudData {
  /** 功能性微字饰件的字串（M12b-48，ast.ornaments = microText）：编号、版本串、厂牌小字……（只用 ASCII）；没给时按种子生成 */
  microText?: string[];
  /* ---- 原 DATA 的字段（名字与类型不变；DATA 是它的视图） ---- */
  /** 生命比例 0~1（样本值；局内生命条由 sim.ts 模拟，起点 BASE_HP） */
  hp: number;
  /** 护盾比例 0~1（el.vitals 第二条） */
  shield: number;
  /** 体力比例 0~1（el.vitals 第三条） */
  stamina: number;
  /** 法力比例 0~1（保留，目前没有元素读它） */
  mana: number;
  /** 生命上限（数字 / 分数形态与数值标注用） */
  hpMax: number;
  /** 主货币数量（资源栏第一项 res[0]） */
  gold: number;
  /** 次货币数量（资源栏第二项 res[1]） */
  gems: number;
  /** 采集物数量（资源栏第三项 res[2]，拾取事件会加上去） */
  wood: number;
  /** 第四种资源数量（保留，目前没有元素读它） */
  stone: number;
  /** 技能格：[符号, 冷却剩余 0~1, 状态?]，4 个（快捷栏后面几格是物品；格数 elx.count 多于样本时循环取，M12a-20） */
  abilities: AbilityRow[];
  /**
   * 技能格 / 快捷栏的状态演示（M12a-10）：demo = 按序号演示冷却、锁定、空格、数量（原来的写法，不写时就是它）；
   * none = 这款游戏的快捷栏没有冷却和锁定（农场、工厂），只画逐条声明的状态
   */
  abilityStates?: 'none' | 'demo';
  /** 弹药：[弹匣, 备弹] */
  ammo: [number, number];
  /** 目标追踪三行：主目标、进度、下一步 */
  objective: string[];
  /** Boss：名字与血量比例 */
  boss: { name: string; hp: number };
  /** 当前目标（敌人）：名字、等级、血量比例；名字同时是"敌方"的判定（行动顺序里同名的画成红色、头像不画立绘） */
  target: { name: string; level: number; hp: number };
  /** 消息滚动三行（第一行高亮） */
  feed: string[];
  /** 计时（mm:ss） */
  timer: string;
  /** 分数 */
  score: number;
  /** 回合数 */
  turn: number;
  /** 波次（"7 / 10"） */
  wave: string;
  /** 速度（km/h 表盘，满刻度 300） */
  speed: number;
  /** 名次：[第几, 共几]（版面：写成 "2/8" 画在速度表左边 70px 里、数字形态的圈数前 74px 里，所以共几 ≤ 9） */
  place: [number, number];
  /** 圈数：[第几, 共几] */
  lap: [number, number];
  /** 队伍 4 人：[名字, 血量 0~1]（第一个是玩家；血量 < 0.25 画成危险色） */
  party: [string, number][];
  /** 第几天 */
  day: number;
  /** 时刻（小时，16.5 = 16:30） */
  hour: number;
  /** 天气（一两个字） */
  weather: string;
  /** 天气的符号（M12a-10：与 weather 取同一条天气，不写时画 ☀；原来写死太阳，冰雪殖民地画太阳却写「大雪」） */
  weatherIcon?: string;
  /**
   * 按键提示 4 个：[键, 动作, 手柄按钮?]。手柄图标集按 glyphs.ts 的 PAD 把键盘键换成手柄钮（只认 E F Q R Tab Esc Space Shift 1–4）：
   * 键不在这张表里、或者两个提示会换成同一个钮时，写第三项（四个提示的手柄钮互不相同）。
   */
  prompts: [key: string, action: string, pad?: PadButton][];
  /** 字幕 / 对白：[说话人, 台词]（M1 样本的对话框也用它） */
  subtitle: [string, string];
  /** 奖励 3 项：[符号, 物品名, 数量, 图集图标?]（稀有度依次 1 / 3 / 4） */
  reward: ItemRow[];
  /** 花费：[拥有, 需要]（第一项用于"有 / 需"形态，有 < 需画成红色） */
  cost: [number, number][];
  /** 聊天 3 行：[说话人, 内容]；说话人写"系统"的行画成系统色 */
  chat: [string, string][];
  /** 行动顺序 5 个名字（与 target.name 同名的是敌方） */
  turnOrder: string[];
  /** 对话选项 3 个（第一个是当前选中） */
  choices: string[];

  /* ---- 新增：原来写死在各元素里的样本 ---- */
  /** 生命 / 护盾 / 体力三条的名字（el.vitals、Godot 导出） */
  vitalNames: [string, string, string];
  /**
   * 生命类的行（M12a-12，el.vitals 的行模型）：[名字、比例、上限、行名图标、可回复的部分]，最多 4 行。不写时由 hp / shield / stamina / vitalNames
   * 兼容出三行（上限都是 hpMax）——content/index.ts 的 vitalsOf()；写了时第一行的比例仍由模拟的生命值驱动，名字 / 比例最好与旧字段一致（Godot 导出、旧样本读旧字段）
   */
  vitals?: VitalRow[];
  /** 资源栏三项 [符号, 名字, 图集图标?]，数值依次是 gold / gems / wood（第一项是主货币，物品价格也用它） */
  res: [ResDef, ResDef, ResDef];
  /** 第三项资源的目标数（资源条形态 "24 / 30"） */
  resGoal: number;
  /** 资源栏各项的变化量（每回合 / 每周的收支，M12a-13：elx.valueLabel = delta 时画在数字后；不写时用 +24 / +3 / -2） */
  resDelta?: number[];
  /** M1 四控件样本（旧皮肤的回归基线，compose/sample.ts）：状态面板标题、两行资源 [符号, "名 数量"]、密集档技能栏 6 个符号 */
  m1: { title: string; row: [string, string][]; row2: [string, string][]; hotbar: string[] };
  /** 交互提示的动作（"打开宝箱"；交互气泡、新手引导、M1 样本共用） */
  interact: string;
  /** 交互键 */
  interactKey: string;
  /** 交互键在手柄图标集里画哪个钮（不写 = 按 glyphs.ts 的 PAD 换；交互键不在 PAD 里时要写） */
  interactPad?: PadButton;
  /** 物体旁的上下文提示：[键, 动作, 手柄按钮?]（el.prompt = contextual；手柄按钮同 prompts） */
  pickPrompt: [key: string, action: string, pad?: PadButton];
  /** 选中信息面板 */
  selection: SelectionData;
  /** 队伍比分行（与 party 一一对应） */
  scores: number[];
  /** 日历：[季节 · 年, 星期 + 天气符号] */
  calendar: [string, string];
  /** 天气条上的温度 */
  temp: string;
  /** "第几天"的写法，{n} = day */
  dayText: string;
  /** 热力图图例：标题与三档（颜色按位置：levels[0] 画红、[1] 画黄、[2] 画绿——第一档写危险 / 糟糕的一端，如"污染 高"、"长势 差"、"温度 冻"） */
  heat: { title: string; levels: [string, string, string] };
  /**
   * 叠层图例的样例（M12b-26，cities-skylines#5）：按 el.overlay 的画法取（heatmap / routeLines / coverIcons / moveRange / guides / buildGrid）——标题、条目 [名字, 颜色?（色板角色名或 #hex）, 数值?]、
   * 渐变条两端字 low / high、统计行 stats [名, 值]；没写的画法退回通用的（heatmap 用上面的 heat 三档）
   */
  legends?: Partial<Record<string, LegendData>>;
  /** 房间图小地图（M12b-25，el.minimap = roomGraph）：[列, 行, 种类]（current 当前 / boss 头目 / shop 商店 / item 宝物 / 空）；没写时七个房间的一层 */
  rooms?: [col: number, row: number, kind: string][];
  /** 队伍的当前行动者（0 起，M12b-63：elx.dockFollow = active 的停靠者跟着它；没写时第一个） */
  partyActive?: number;
  /** el.prompt 触屏形态的三个按钮符号（主动作、技能、切换） */
  touchGlyphs: [string, string, string];
  /** 触屏操作层（compose/touch.ts）：主按钮 [符号, 名]、技能符号 5 个、跳跃键、动作键 */
  touch: { main: [string, string]; skills: string[]; jump: [string, string]; act: [string, string] };
  /** 主按钮文字：开始 / 返回 / 圆形大按钮；icon = 只画图标的圆钮（cmp.button@el.cta = icon，civ6#1）里画什么（随待办切换：按界面变体写），没写时 ▶ */
  cta: { start: string; back: string; go: string; icon?: string; sub?: string; group?: [string, string, string]; note?: string };
  /** 非本方回合时主按钮换成的字（M12b-01，st.cooldown@el.cta = turnLocked）；没写时「敌方回合」 */
  turnWait?: string;
  /** 立绘奖励、切入特写里的角色：名字与头像首字 */
  hero: { name: string; initial: string };
  /** 奖励大卡上的物品：符号、查图标用的物品名、显示名 */
  featured: { glyph: string; item: string; name: string };
  /** 价格（已带千分位） */
  price: string;
  /** 购买按钮上价格前面的字 */
  buy: string;
  /** 竞价表 3 行：[出价人, 价格]（最后一行是玩家） */
  bids: [string, string][];
  /** 手牌形态比技能多出来的那张牌的符号 */
  handExtra: string;
  /**
   * 手牌样本（M12b-12：el.abilities = cards 选了新卡面版式时读它；原来的图标牌只用符号）：[符号, 名字, 说明（可带富文本标记）, 费用, 类型（attack / skill / power…）,
   * 点数?（A 2–10 J Q K）, 花色?（S / H / D / C）, 稀有度?, 版本?（foil / holo / polychrome / glass）]；没写时按 screens.draft 的三选一卡演示
   */
  hand?: HandCard[];
  /** 盲注卡（M12b-69，cmp.cardParts 的 nameplate / valueTarget）：[名字, 目标分, 奖励 $ 个数, 名牌色]；没写时按序号演示 */
  blinds?: [name: string, target: number, reward: number, color: string][];
  /* ---- M12b-29：格位类 HUD 元素的样本（都可不写，没写时按演示 / 别的样本） ---- */
  /** 牌堆（el.piles）：[种类 draw / discard / exhaust, 张数, 总数?] */
  piles?: [kind: string, count: number, total?: number][];
  /** 遗物 / 被动道具（el.passives）：[符号, 名字, 层数?]；没写时取菜单物品 */
  relics?: [glyph: string, name: string, count?: number][];
  /** 消耗品槽（el.consumables，药水）：没写时快捷物品 / 菜单物品 */
  potions?: ItemRow[];
  /** 增益 / 状态槽（el.buffs，大卢恩）：没写时快捷物品 / 菜单物品 */
  buffs?: ItemRow[];
  /** 当前主动技能名（M12b-09，el.abilities.activeLabel：Elden 十字快捷栏上方的战技名）；没写时天赋样本的第一个 */
  activeSkill?: string;
  /** 人口（el.population）：[已分配, 总数]；没写时 42 / 80 */
  population?: [assigned: number, total: number];
  /** 快捷栏物品格的符号 */
  hotbarItem: string;
  /** 大招：[符号, 充能 0~1] */
  ultimate: [string, number];
  /** 目标追踪的标题 */
  objectiveTitle: string;
  /** 目标的进度 0~1 与前置图标（M12a-11：cmp.gauge@el.objective 给了时标题下画进度条、标题前画图标；不写时 0.6、◆） */
  objectiveProgress?: number;
  objectiveIcon?: string;
  /**
   * 世界状态图标（M12a-31，el.overlay = statusIcons）：[符号, 角色, 层数?]——角色 warn 警告色 / danger 危险色 / info 信息色 / buff 好色；
   * 层数（第 3 项）画成右下角的小数字（预留给叠层的增益 / 减益）。不写时 [!, warn]、[Z, info]、[♥, danger]
   */
  statusIcons?: [string, StatusRole, number?][];
  /** 结果提示（el.notify = toast）的结果（M12a-32：col.coding 含 resultTone 时成功好色、失败坏色）；不写 = 成功 */
  toastResult?: 'success' | 'fail';
  /** 横带 / 横幅通知的事件类型（M12b-33：col.coding 含 resultTone 时字色按它——good 好色、bad 坏色（Elden 的 YOU DIED 暗红）、neutral 高亮金色（击败强敌、发现赐福））；不写时按 toastResult（失败 = bad，否则 neutral） */
  notifyTone?: 'good' | 'bad' | 'neutral';
  /** 敌人意图：[符号, 数值] */
  intent: [string, string];
  /** 命中率 */
  hitChance: string;
  /** 飘字伤害 3 个（第一个是暴击，画大） */
  hits: string[];
  /** 漫画拟声字 */
  sfx: string;
  /** 评级：[字母, 英文评语] */
  rating: [string, string];
  /** 连击：[数字, 字]（版面：字画在数字起点右边 62px 处，所以数字 ≤ 2 位） */
  combo: [string, string];
  /** 发现新区域横幅 */
  discover: string;
  /** 成就提示条 */
  achievement: string;
  /** 徽记提示（占领、通关……） */
  emblem: string;
  /** 切入特写的台词 */
  cutIn: string;
  /** 升级弹窗：[标题, 一行说明] */
  levelUp: [string, string];
  /** 回合横幅，{n} = turn */
  turnText: string;
  /** 波次计量的标题，{wave} = wave */
  waveText: string;
  /** 速度单位 */
  speedUnit: string;
  /** 圈数，{a} / {b} = lap */
  lapText: string;
  /** 段位：排名数字、排名范围、字母评级、奖章段位、徽章段位与它的小字（版面：number ≤ 4 个半角字符如 "#128"，scope ≤ 2 个字——范围画在 number 起点右边 90px、盒宽 120px；medal 不宽于"黄金 II"） */
  rank: { number: string; scope: string; letter: string; medal: string; tier: string; tierShort: string };
  /** 玩家信息：名字（起名框默认值也用它）、头像首字、称号、UID 行、等级、经验 */
  profile: { name: string; initial: string; title: string; line: string; level: string; exp: string };
  /** 读取：提示语、主题小动画的符号（一行 6 个） */
  loading: { tip: string; motif: string };
  /** 新手引导：聚光提示、框选提示、引导 NPC 的头像首字与台词 */
  guide: { spotlight: string; box: string; npc: string; line: string };
  /** 计量条三行：[符号, 名, 0~1, 颜色]（版面：single 形态把第一行的名字画在条前 30px 里，所以 meters[0] 的名字 ≤ 2 个汉字） */
  meters: [string, string, number, string][];
  /** 双端计量条的两端 */
  meterEnds: [string, string];
  /** 两项对立计量（el.meter = paired，M12a-11）：上下两条 [名, 0~1]（Frostpunk 的不满 / 希望）；不写时用 meterEnds 的两端、0.62 / 0.45 */
  meterPair?: [string, number][];
  /** 游戏速度条（el.gameSpeed = speedBar，M12a-11）暂停后面的几档（"1×"、"2×"……）；不写时 1× / 2× / 3×，档数也可由 el.gameSpeed.steps 定 */
  speeds?: string[];
  /** 工具栏 / 建造类别 7 个：[符号, 名] */
  tools: [string, string][];
  /**
   * 快捷栏里的物品（M12b-62，el.abilities.slotContent = items：Elden 的盾 / 剑 / 法术 / 道具四格、饥荒的背包物品栏）：4 个 ItemRow，
   * 图集图标按物品名查，状态（数量、耐久）按第 5 项
   */
  quickItems?: ItemRow[];
  /**
   * 资源栏第 4 项起（M12b-62，civ6#49）：[符号, 名, 数值, 每回合增量, 颜色]——elx.count 超过 3 时依次取（不再循环前三项），颜色给符号与数字（4X 的按产出着色）
   */
  resExtra?: [glyph: string, name: string, value: number, delta: number, color: string][];
  /* ---- M12b B5：数值图形与读数的样本（都可不写，元素按注释里的默认画） ---- */
  /** 格挡值（M12b-03，cmp.gaugeExtra = shieldTint：有格挡时整条换第二强调色 + 左端盾徽数字，StS）；不写时 6 */
  block?: number;
  /** 死亡抗拒 / 复活次数 [剩余, 上限]（el.vitals.attach = lives，Hades 的「1 / 3」）与它的图标；不写时 [1, 3]、◆ */
  lives?: [number, number];
  livesIcon?: string;
  /** 充能 / 施法弹药 [有, 上限]（el.vitals.attach = charges，Hades 血条上方的两颗圆点）；不写时 [2, 3] */
  charges?: [number, number];
  /** 挡位与转速比例（M12b-02 的转速表 tachometer：中心大字 = 挡位，指针 = 转速）；不写时 '4'、0.72 */
  gear?: string;
  rpm?: number;
  /** 资源栏各项的容量比例 0~1（M12b-06 的 iconNumberBar 下方细条，Frostpunk）；不写时 0.62 / 0.35 / 0.8…… */
  resCap?: number[];
  /** 里程表左端的货币字（M12b-06 的 odometer，Stardew 的 G）；不写时主货币的符号 */
  currencyMark?: string;
  /** 纪年（M12b-06 的 el.timer = turnDate：回合 + 纪年 + 时钟，Civ6 的「公元前 2400」）；不写时 2400 BC */
  date?: string;
  /** 最佳圈速（el.timer = raceStack 的 BEST 行）；不写时 1:12.40 */
  bestLap?: string;
  /** 胜利倒计时（el.timer = countdownStrip：「{n} 回合后胜利」的 n 与写法，ITB 的 Victory in 3 turns）；不写时 3、「{n} 回合后胜利」 */
  countdown?: number;
  countdownText?: string;
  /** 计分标签（el.timer = scoreLabel 的小字，Hi-Fi 的 SCORE）；不写时 SCORE */
  scoreLabel?: string;
  /** 月份（M12b-08 的 el.clock = collage 拼贴日历的大号月数字，Persona 5）；不写时 4 */
  month?: number;
  /** 星期的写法 7 个，从周日起（el.clock = plaque / collage / dateStrip）；不写时 日 一 二 三 四 五 六 */
  weekdays?: string[];
  /** 时段（el.clock = collage 的斜白条，Persona 5 的 After School）；不写时 AFTER SCHOOL */
  period?: string;
  /** 预报标记：哪几天有寒潮 / 灾害（el.clock = timelineRuler 的危险色雪花，Frostpunk）；不写时第 day + 4、day + 7 天 */
  forecast?: number[];
  /** 计分公式（M12b-27 的 el.meter = formula，Balatro：牌型名、等级、筹码 A × 倍率 B）；不写时 FLUSH / lvl.2 / 35 × 4 */
  formula?: { name: string; level: string; a: number; b: number };
  /** 需求竖条（el.meter = demandBars，Cities 的 RCI：[字母, 0~1, 颜色]）；不写时 R 绿 / C 蓝 / I 黄 */
  demand?: [string, number, string][];
  /** 细框条（el.meter = framedStrip，ITB 的电网：[标签, 0~1, 读数, 按钮字?]）；不写时 POWER GRID / 0.6 / DEFENSE 19% / RESET TURN */
  meterStrip?: [string, number, string, string?];
  /** 遇敌危险度 0~1（el.meter = dangerDot：低蓝、中黄、高红，Octopath）；不写时 0.45 */
  danger?: number;
  /** 技能链（M12b-20 的 el.feedback = chainStack，FH5：[技能名, 分]…、总分、倍率）；不写时 DRIFT / NEAR MISS / AIR */
  chain?: { items: [string, number][]; total: number; mult: string };
  /** 检定骰子的点数（el.feedback = dice，Disco 的两枚白骰）；不写时 4、6 */
  dice?: number[];
  /** 名签上的技能名（el.notify = label，Octopath 的敌方技能名提示）；不写时切入特写的台词 */
  skillName?: string;
  /* ---- M12b B6：HUD 组合的样本（都可不写，元素按注释里的默认画） ---- */
  /** 并排的 Boss（M12b-04 的 el.threat.count：Hades 的忒修斯 + 牛头人）：[名字, 血量 0~1]；不写时 Boss + 当前目标 */
  bosses?: [string, number][];
  /**
   * 队伍成员的名册字段（M12b-18，与 party 一一对应，不写的成员按序号给演示值）：level 等级、hp / sp 当前与上限（statusStrip / shard 的 HP / SP 两行，Octopath / Persona）、
   * bp 点亮格 [亮, 上限]（Octopath 的 BP 宝石）、rank 军衔（rosterCard 的 V 形章层数 1–4）、kills 击杀数、status 状态标签（晋升 / 负伤……，XCOM 总结卡）、
   * role 职业小字（选角方砖的说明、名字旁的副题）、timer 头像下的倒计时（el.party.memberPill = timer，Frostpunk 侦察队）、locked 未解锁（emblemTiles 画锁）
   */
  partyInfo?: PartyInfo[];
  /**
   * 剧情条（M12b-28 的 el.objective = storyTracker，Frostpunk）：圆章里的倒计时、标题、倾向小徽章（一个符号）、子目标 [文字, 完成?]；不写时用 objectiveTitle / objective
   */
  storyTracker?: { count: string; title: string; lean?: string; subs: [string, boolean][] };
  /**
   * 分节简报（el.objective = sectioned，ITB）：每节 [小标题, [图标, 文字]…]，warn = 警告段（st.alert 含 framedLabel 时画成黄框警告条）；不写时由 objectiveTitle / objective 拼两节
   */
  objectiveSections?: { title: string; rows: [string, string][] }[];
  objectiveWarn?: [string, string];
  /** 研究 / 市政追踪行（el.objective = trackerRows，Civ6）：标题条 + [图标, 名字, 进度 0~1, 剩几回合, 解锁图标]；不写时研究 / 市政两行（行色走类别色表） */
  tracker?: { title: string; rows: [string, string, number, number, string][] };
  /** 弱点格（M12b-19 的 el.threat = weaknessGrid，Octopath）：护盾数与弱点格（null = 还没揭示，画问号；写了的是命中后翻出的图标）；不写时护盾 4、六格里揭示两格 */
  weakness?: { shield: number; slots: (string | null)[] };
  /** 世界标签（el.worldLabel，Civ6 城市名牌）：[人口, 名字, 首都?]；不写时内容包的地名（world.places）配演示人口、第一座是首都 */
  worldLabels?: [number, string, boolean?][];
  /** 光标悬停的物品名（M12b-60 的 el.interact = cursor 第一行，饥荒）；不写时奖励大卡上的物品名 */
  hoverItem?: string;
  /** 重掷剩余次数（M12b-60 的 ops.actions = reroll，Hades 的骰子 + 次数）；不写时 3 */
  rerolls?: number;
  /* ---- M12b B9：控件与对话的样本（都可不写，元素按注释里的默认画） ---- */
  /** 选中面板各版式的样本（M12b-15，el.selection.form = sidePanel / cityPanel / entityInfo / buildingPanel / dossier / shotCalc / bareText / cardStack）；不写时按 hud.selection 与地名拼 */
  selSheet?: SelSheet;
  /** 骑边计数小圆徽（M12b-17，elx.satellites = counters：Frostpunk 条下的病号 / 伤员数）：[符号, 数]；不写时 ✚ 3 / ◆ 1 */
  satCounters?: [string, number][];
  /** 检定标签（M12b-22，el.choices.labelStyle = checkTag，Disco）：每项 [技能, 难度, 红色检定?]；不写时 逻辑 · 中等 / 感知 · 困难（红） */
  choiceChecks?: [string, string, boolean][];
  /** 不满足条件的选项后面写的原因（el.choices.lockedItem，StS）；不写时「条件不足」 */
  choiceLockReason?: string;
  /* ---- M12b-30 标题与播报锁扣的样本（都可不写） ---- */
  /** 多级标题块（el.title.form = notice / titlePage）：[角色, 字]（kicker 引子 / title 大标题 / subtitle 副题 / quote 引语 / data 数据行 / source 出处 / divider 分隔线 / art 插画位）；不写时按游戏名、副标题、公告拼 */
  titleLines?: [role: string, text: string][];
  /** 章节卡的年代（el.title.form = chapterCard 的「地点 — 年代」戳）；不写时 1807 */
  year?: string;
  /** 跑马条（el.ticker = news）的条目；不写时信息流 hud.feed */
  ticker?: string[];
  /** 下三分之一人名条（el.lowerThird）：名字、头衔、队徽字；不写时玩家名 + 称号 + 首字 */
  lowerThird?: { name?: string; title?: string; team?: string };
  /** 引文字卡（el.subtitle.form = quoteCard，Civ6 奇观落成）：名称、圆图标、引文、出处；不写时地名 + 当前台词 + 说话人 */
  quote?: { name?: string; glyph?: string; text?: string; source?: string };
}

/**
 * 选中面板的版式样本（HudData.selSheet，M12b-15）：都可不写（elements/info.ts 的 sheetOf 给默认值，字都在字表里）。
 * city = 城市 / 据点（sidePanel 的密集数值行、cityPanel 的圆徽人口 + 大号数字栏 + 增长条）；entity = 悬停实体（状态、配方）；building = 建筑面板（状态、队伍）；
 * mission = 任务卡（重要度、行动代号、目标、段落、底部饰条）；shot = 命中计算（技能名、命中 / 暴击两张明细、两端百分比、伤害区间、底边技能格）；bare = 无底说明的数值行
 */
export interface SelSheet {
  city?: { name?: string; pop?: string; growth?: number; growthText?: string; rows?: [string, string][] };
  entity?: { status?: string; ok?: boolean; recipe?: [string, string] };
  building?: { status?: string; ok?: boolean; members?: [string, string][] };
  mission?: { priority?: string; code?: string; objective?: string; text?: string; footer?: string };
  shot?: { skill?: string; hit?: [string, string][]; crit?: [string, string][]; hitPct?: number; critPct?: number; dmg?: string; skills?: string[] };
  bare?: { line?: [string, string][] };
}

/** 队伍成员的名册字段（HudData.partyInfo，M12b-18） */
export interface PartyInfo { level?: number; hp?: [number, number]; sp?: [number, number]; bp?: [number, number]; rank?: number; kills?: number; status?: string; role?: string; timer?: string; locked?: boolean }

/**
 * 生命类的一行（M12a-12）：recover = 可回复的那一截（0~1，M12b-03 的 cmp.gaugeExtra = recoverable 画成第二填充色段）；
 * types = 类型心（M12b-02 的 heartsTyped：red / blue / soul / black / gold / spirit，按颗）；cap = 帽头字母（cmp.gaugeExtra = capLabel，Stardew 的 E / H，没写时行名首字）；
 * trend = 趋势（elx.valueLabel = trend 的 ▲ / ▼：正数升、负数降）
 */
export interface VitalRow { name: string; v: number; max: number; icon?: string; recover?: number; types?: string[]; cap?: string; trend?: number }

/** 资源栏一项：[符号, 名字, 图集图标?] */
export type ResDef = [glyph: string, name: string, icon?: AtlasIcon];

/* ---------------- 菜单（M3.5 菜单样本、界面模板的格子与详情） ---------------- */

export interface MenuData {
  /** 菜单标题（背包叫什么） */
  title: string;
  /** 标题元素 header 形态的写法（字间加全角空格） */
  header: string;
  /** 大字水印（ast.watermark = bigText）的英文 */
  titleEn: string;
  /** 菜单页签 3 个 */
  tabs: string[];
  /** 菜单页签的图标符号（二级页签 / 类别页签 cmp.tab = icon 时画，M12b-61；没写时 icon 画法退回文字） */
  tabIcons?: string[];
  /** 物品 8 个（第一个是选中的，详情写的就是它；条目数多于 8 时循环取并编号，M12a-10） */
  items: ItemRow[];
  /** 物品格的状态演示（M12a-10，同 HudData.abilityStates）：none = 物品没有锁定 / 新品 / 稀有度的演示，只画逐条声明的 */
  itemStates?: 'none' | 'demo';
  /** 详情：名字、描述（两三行）、两条属性 [名, 0~1] */
  detail: { name: string; desc: string; stats: [string, number][] };
  /** 详情下面的按钮（第一个是主按钮） */
  buttons: string[];
}

/* ---------------- 界面模板（compose/screen.ts，运营类除外） ---------------- */

/** 设置页：行 [名, range | bool | enum, 值]；枚举行的取值表——第 5 行用 enums[0]，其余枚举行用 enums[1]（screen.ts form() 的写法） */
export interface SettingsData { rows: [string, string, number][]; enums: string[][] }

/** 列表行的状态（M12a-27，st.statusMark / st.done 按它画）：完成 / 失败 / 进行中 / 未开始 */
export type RowStatus = 'done' | 'fail' | 'active' | 'todo';

export interface ScreenData {
  /** 模板页签 5 个（第一个是"全部"一类的总览） */
  tabs: string[];
  /** 页签图标符号（cmp.tab = icon / iconText 时画，与 tabs 一一对应，M12a-22；M12b-61 起 24 个包都写了）；没写时 icon 画法退回文字（原来退回首字，factorio#37） */
  tabIcons?: string[];
  /** 任务 6 条：[名, 说明, 进度 0~1, 状态?]（状态 = 列表行的完成 / 失败 / 进行中 / 未开始，M12a-27；不写时进度满 = 完成，画状态标识时按演示序列） */
  quests: [string, string, number, RowStatus?][];
  /** 按键绑定 7 行：[动作, 键鼠, 手柄] */
  binds: [string, string, string][];
  /** 服务器 6 个（第 6 个是推荐的新服） */
  servers: string[];
  /** 排行 7 行：[名字, 分数]（第 5 行是玩家；分数量级随品类定，进度条按第一名的分数向上取到下一个整千归一） */
  leaders: [string, number][];
  /** 存档 3 个：[章节, 时长, 时间]（第 3 个空着 = 新建存档） */
  saves: [string, string, string][];
  /**
   * 数据统计：表头 4 列；行 [名字, 三个整数, 第四列 0~1]。
   * 第四列在表格 / 大数字形态里默认是"满值 30,000 的数量"，画成 round(v × 30000)（雪线旅人的伤害 0.92 → 27,600）；
   * 第四列是比例（完成度、命中率、车况……）时写 unit: 'pct'，画成百分比。条形态都直接用 0~1。
   */
  stats: { head: string[]; rows: [string, number, number, number, number][]; unit?: 'amount' | 'pct' };
  /** 走势（M12b-27 的 st.statViz = lineChart / sparkline / stackedArea：每行一串数）；不写时按 stats 每行的数值生成确定的样本 */
  series?: number[][];
  /** 键值行（M12b-27 的 st.statViz = keyValue：单人结算「存活 N 天 / 死于 X」，[标签, 值, 图标?]）；不写时 stats 的表头 + 第一行 */
  keyValues?: [string, string, string?][];
  /** 邮件 3 封：[发件人, 标题, 多久以前] */
  mail: [string, string, string][];
  /** 成就 8 个（前两个达成） */
  achievements: string[];
  /** 路线节点 9 个（单字：战 / 店 / 精 / 火 / ? / 王……） */
  route: string[];
  /** 树的层名（M12b-24，lay.grouping = header 时写在每层的列头 / 行头：Civ6 的时代、科技的层级）；不写时罗马数字 I / II / III… */
  tiers?: string[];
  /** 路线图上已经走过几个节点（下一个是当前；不写 = 2，M12a-29；cnt.progress 显式给了时以它为准） */
  routeProgress?: number;
  /** 公告正文（一段，100 字左右） */
  notice: string;
  /** 制作人员 4 行：[职务, 名字] */
  credits: [string, string][];
  /** 三选一 3 项：[符号, 名, 一句效果] */
  draft: [string, string, string][];
  /** 推理板线索卡 6 张（最后一张常是"？"） */
  clues: string[];
  /** 常驻层的聊天跑马灯一行 */
  ticker: string;
  /** 结算主体的大字：[胜利, 本局总结的结束语] */
  outcome: [string, string];
  /** 主体是数据时的大数字（放不下主体栏时会缩字，仍以 ≤ 8 个字符为宜） */
  bigStat: string;
  /** 二次确认弹窗的一句话 */
  confirm: string;
  /** 一句话提示（短文本） */
  line: string;
  /**
   * 对话 / 事件的一段正文（M12b-57，对话类模板的 cnt.dataShape = text 画它；没写时画公告 notice）：可带富文本标记（richText.ts：{k:} 关键词、{c1:} 类别、[[注释]]、{x:} 涂黑），
   * 段首「§ 」= 引子、「» 」= 决断句（Frostpunk 的三层文字）
   */
  passage?: string;
  /** 模板页头标题下的副题 / 引言（lay.titleSubtitle，M12a-23；不写时用 game.subtitle 英文副标题） */
  titleSub?: string;
  /** 陪衬吉祥物的台词（cnt.companion = mascot 的气泡，M12a-36；不写时用 hud.guide.line） */
  companionLine?: string;
  /** 设置页（不给时用 GENERIC.settings） */
  settings?: SettingsData;

  /* ---- 按界面的结构化样本（M12b-62；取用一律经 content/samples.ts 的 samplesFor：本包 → GENERIC 同类 → 物品；24 个包都写全，check-content 逐包核对） ---- */
  /** 技能 / 天赋（技能树、天赋表；6 条，action 10 条） */
  talents?: TalentRow[];
  /** 图鉴条目（8 条） */
  codex?: CodexRow[];
  /** 单位名册（布阵 / 整备；3 个） */
  roster?: RosterRow[];
  /** 地点（世界地图的常驻详情；3 个，第一个是当前选中的） */
  locations?: LocationRow[];
  /** 地图的筛选类别（世界地图的页签；4 个） */
  mapFilters?: [glyph: string, label: string][];
  /** 任务详情（任务页的常驻详情：quests[0] 的长说明与子目标） */
  questDetail?: QuestDetail;
  /** 指令（指令环 / 战斗指令 / 外交动作；6 个） */
  commands?: [glyph: string, label: string][];
  /** 局内主菜单（暂停页的列表 / 入口网格，与标题界面的 GENERIC.mainMenu 分开；7 个） */
  pauseMenu?: [glyph: string, label: string][];
  /** 创建角色 / 捏人的表单行（8 行） */
  createRows?: CreateRow[];
  /** 配方（锻造 / 制作 / 机器；4 个，第一个是选中的） */
  recipes?: RecipeRow[];
  /** 建造（建筑格与建材清单；6 个） */
  builds?: BuildRow[];
  /** 目标档案（扫描 / 情报卡，el.selection.subject = target） */
  dossier?: Dossier;
  /** 经营（预算 / 维护 / 税率，cnt.screen = screen.manage） */
  economy?: Economy;
  /** 角色条目（选角 / 阵营 / 角色详情；3 个） */
  characters?: CharacterRow[];
  /** 格组（M12b-11 的 cmp.slotGroup / lay.arrangement = flankColumns / fixedGroups / lay.sections 的 slotGroups 段：装备部位、义体部位、护符已装备行）；不写时 GENERIC 的一份 */
  slotGroups?: SlotGroupRow[];
  /** 数据区分段的段标题（M12b-11 的 lay.sections / lay.subColumns，按段、子栏顺序取）；不写时按页签（跳过第一个） */
  sections?: string[];
}

/**
 * 技能 / 天赋（M12b-62）：[符号, 名字, 一句效果, 加成值（列表右侧的「+20%」）, 当前级, 上限, 花费（带单位，「3 灵光」）]
 * 列表行 = 符号 + 名字 + 加成值；详情 = 名字 + 效果 + 等级条 + 花费（black-myth#38、hades#18）
 */
export type TalentRow = [glyph: string, name: string, effect: string, value: string, level: number, max: number, cost: string];
/** 图鉴条目：[符号, 名字, 一句记述（详情栏的长文）, 解锁进度 0~1（0 = 未解锁：格子按 st.locked 画）] */
export type CodexRow = [glyph: string, name: string, lore: string, progress: number];
/** 单位名册：[名字, 职业, 数值 [名, 值]（2 项）, 武器 / 装备（1–2 件）] */
export type RosterRow = [name: string, cls: string, stats: [string, number][], weapons: string[]];
/** 地点：[名字, 所属区域, 危险度 0~3, 一句说明, 相关任务（1–2 条）, 动作按钮（「派遣」「前往」）] */
export type LocationRow = [name: string, region: string, danger: number, desc: string, quests: string[], action: string];
/** 任务详情：长说明（两三行）+ 子目标 [文字, 已完成]（3 条） */
export interface QuestDetail { desc: string; steps: [string, boolean][] }
/**
 * 创建 / 捏人的一行（M12b-62，cyberpunk-2077#20、stardew#23）：text = 输入框（值是文字）；arrows = ◁ 值 ▷（取值表里第 cur 个）；
 * color = 一排色块（取值是 #hex，第 cur 个选中）；toggle = 开关；slider = 滑条（0~1）
 */
export type CreateRow = ['text', string, string] | ['arrows', string, string[], number] | ['color', string, string[], number] | ['toggle', string, boolean] | ['slider', string, number];
/** 配方：[符号, 产物名, 一句说明, 原料 [名, 持有, 需要]（2–3 项）] */
export type RecipeRow = [glyph: string, name: string, desc: string, inputs: [string, number, number][]];
/** 建造：[符号, 建筑名, 一句说明, 建材 [名, 持有, 需要]（2 项）] */
export type BuildRow = [glyph: string, name: string, desc: string, materials: [string, number, number][]];
/** 目标档案：[名字, 等级, 威胁 0~3, 派系, 可用手段（2–3 个）] */
export type Dossier = [name: string, level: number, threat: number, faction: string, hacks: string[]];
/** 经营：标题、服务 [符号, 名, 日间 0~1, 夜间 0~1, 维护费]（4 项）、税率 [组名, 0~1]（3 组） */
export interface Economy { title: string; services: [string, string, number, number, number][]; taxes: [string, number][] }
/** 身体部位（M12b-11 的格组挂到主体的哪个部位：flankColumns 的纵向位置与引线起点） */
export type BodyPart = 'head' | 'eyes' | 'torso' | 'core' | 'back' | 'arms' | 'hands' | 'legs';
/** 格组：[组名, 部位符号（空格画它的剪影）, 格数, 已装几格, 挂的部位?] */
export type SlotGroupRow = [title: string, glyph: string, slots: number, filled: number, part?: BodyPart];
/** 角色条目：[头像首字, 名字, 称号 / 职业, 一句引言, 特性（1–2 条）] */
export type CharacterRow = [initial: string, name: string, title: string, quote: string, perks: string[]];

/** samplesFor 认的样本类别（items = 背包物品，原来的 menu.items / menu.detail） */
export type SampleKind = 'talents' | 'codex' | 'roster' | 'locations' | 'quests' | 'commands' | 'pauseMenu' | 'createRows' | 'recipes' | 'builds' | 'characters' | 'economy' | 'items';
/** 结构化样本的集合（ScreenData 里这几项；GENERIC.samples 是写全的一份） */
export type TypedSamples = Required<Pick<ScreenData, 'talents' | 'codex' | 'roster' | 'locations' | 'mapFilters' | 'questDetail' | 'commands' | 'pauseMenu' | 'createRows' | 'recipes' | 'builds' | 'dossier' | 'economy' | 'characters' | 'slotGroups'>>;

/* ---------------- 模拟事件、世界 ---------------- */

export interface EventText {
  /** 拾取飘字（也是 el.notify 的拾取文字） */
  pickup: string;
  /** 拾取后的获得提示条 */
  pickupToast: string;
  /** 升级横幅 */
  levelUp: string;
  /** 回血飘字 */
  heal: string;
}

export interface WorldText {
  /** 地图上的地名牌（世界地图模板） */
  region: string;
  /** 目标标记下面的距离 */
  distance: string;
  /**
   * 世界地图上的地名（M12a-30，vis.mapLabels）：[名字, u, v]（地图上 0~1 的位置），第一个是 region；不写时只有 region 一个（左上）
   */
  places?: [string, number, number][];
  /** 楼层列表（M12b-25，vis.mapFloors，control#12）：从上到下；没写时 3F / 2F / 1F / B1 / B2 */
  floors?: string[];
  /** 当前层在 floors 里的序号（没写时 1F 那一层） */
  floor?: number;
}

/** 图例的数据（M12b-26 的 legend 组件）：标题 + 条目；渐变条有两端字，统计行是 [名, 值] */
export interface LegendData { title: string; items: [label: string, color?: string, value?: string][]; low?: string; high?: string; stats?: [string, string][] }

/* ---------------- 位图（只有雪线旅人有） ---------------- */

export interface PackArt {
  /** 书法标题字（写的就是 game.name）：标题元素、标题界面、书法水印 */
  title?: AssetRef;
  /** 主视觉海报（ast.bgArt = keyArt） */
  keyArt?: AssetRef;
  /** 立绘：全身二次元 / 全身厚涂 / 半身 / Q 版（卡面、招募、VS、头像里的脸） */
  characters?: { anime?: AssetRef; painterly?: AssetRef; bust?: AssetRef; chibi?: AssetRef };
}

/* ---------------- 运营层（所有包共用，见 generic.ts） ---------------- */

export interface OpsText {
  /** 顶部活动横幅的标题 */
  eventTitle: string;
}

/** 所有包共用：运营类填充与不分品类的行 */
export interface GenericContent {
  /** 设置页（包没写 screens.settings 时用） */
  settings: SettingsData;
  /** 标题界面的竖排菜单（局内暂停页用包的 screens.pauseMenu，M12b-62） */
  mainMenu: string[];
  /** 游戏内手机 / 终端主屏的图标宫格：[符号, 名] */
  hub: [string, string][];
  /** 运营层文字 */
  ops: OpsText;
  /** 结构化样本的通用一份（M12b-62：包里缺某一类时的回落） */
  samples: TypedSamples;
  /** 按界面取的示例文字的通用变体（M12b-61：textFor 在包的变体之后比较） */
  texts: PackTexts;
}

/* ---------------- 按界面 / 子功能 / 阶段 / 语气取的示例文字（M12b-61，content/texts.ts 的 textFor） ---------------- */

/**
 * 变体的生效条件：每一项都要对上（值可以是数组 = 其中之一）；group = 界面组（hud / menu / map / dialogue / battle / reading，texts.ts 的 screenGroup 按 cnt.screen / cnt.subtype 推）。
 * 写得越多越具体：textFor 取对上的条件最多的那条，一样多时包的在 GENERIC 前、先写的在后写的前
 */
export interface TextWhen { group?: string | string[]; screen?: string | string[]; subtype?: string | string[]; stage?: string | string[]; tone?: string | string[] }
export interface TextVariant<T> { when?: TextWhen; value: T }
/** 按键图例的一项：[键, 动作, 手柄按钮?]（同 hud.prompts） */
export type PromptRow = [key: string, action: string, pad?: PadButton];
/** 页签：[名, 图标符号?]（cmp.tab = icon / iconText 时画图标；没有图标时 icon 画法退回文字） */
export type TabRow = [label: string, icon?: string];
/**
 * 示例文字的槽位（M12b-61）。没写变体的槽位回落到包里原来的字段（括号里），GENERIC 的变体按具体程度一起比：
 *   prompts 按键图例（hud.prompts）· tabs 模板页签（screens.tabs + tabIcons）· header 模板标题（模板名）· buttons 详情按钮（menu.buttons）·
 *   cta 行动号召（hud.cta）· band 横幅 / 横带的大字 [正文, 出处]（game.chapter.band / hud.discover）· feed 信息流（hud.feed）·
 *   bark 单词感叹（cnt.textLength = word 的字幕）· check 检定 / 结果通知 [成功, 失败] · objective 目标 [任务名, 能折两行的说明] ·
 *   rating 评级字 [大字, 小字]（hud.rating）· original 外语原文台词 [原文, 译文]（el.subtitle.untranslated）· focalTitle 主体标题字（区域 / 任务名、口号）
 */
export interface TextSlots {
  prompts: PromptRow[];
  tabs: TabRow[];
  header: string;
  buttons: string[];
  cta: { start: string; back?: string; icon?: string };
  band: [string, string?];
  feed: string[];
  bark: string;
  check: [string, string];
  objective: [string, string];
  rating: [string, string];
  original: [string, string];
  focalTitle: string;
}
export type TextSlot = keyof TextSlots;
export type PackTexts = { [K in TextSlot]?: TextVariant<TextSlots[K]>[] };

/* ---------------- 内容包 ---------------- */

export interface ContentPack {
  /** 包 id（cnt.pack 的取值） */
  id: string;
  /** 面板上显示的包名（一般就是游戏名） */
  label: string;
  /** 服务的品类：game.genre 的值与 uip.layout 的 id（说明用；自动选包以 index.ts 的 LAYOUT_PACK / GENRE_PACK 为准） */
  genres: string[];
  /** 建议场景（src/content/sceneCatalog.ts 的 id；面板"建议场景（套用）"按钮把 game.scene 设成它） */
  scene: string;
  /** 游戏本身 */
  game: GameInfo;
  /** 局内 HUD 的样本 */
  hud: HudData;
  /** 菜单的样本 */
  menu: MenuData;
  /** 界面模板的样本（运营类除外） */
  screens: ScreenData;
  /** 模拟事件的文字 */
  events: EventText;
  /** 世界上 / 地图上的字 */
  world: WorldText;
  /** 包里物品名 → 图集图标的补充（物品行、资源行带的图标之外的名字，如 featured.item） */
  icons?: Record<string, AtlasIcon>;
  /** 格子只给了符号时按符号猜图集图标（◆ → 木材、● → 金币……）：只有雪线旅人开（它原来就是这样画的）；别的包没声明图标的物品画符号 */
  glyphIcons?: boolean;
  /** 这款游戏的物品不分稀有度（M12a-10：工厂、农场；格子与奖励一律不画稀有度记号） */
  noRarity?: boolean;
  /** 位图：不给的部分画剪影 / 灰盒（需素材），不借用别的包的人物与海报 */
  art?: PackArt;
  /** 运营层个别字的覆盖（不写 = GENERIC.ops） */
  ops?: Partial<OpsText>;
  /** 按界面取的示例文字（M12b-61，content/texts.ts 的 textFor） */
  texts?: PackTexts;
}
