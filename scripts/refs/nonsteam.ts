/*
 * 名单里没对上 Steam 的条目（R1 第一轮 121 条）：手工处理。
 *   - 缩写 / 旧名其实在 Steam 上：给出 Steam 上的名称（steam），采集时重新匹配，并入同一款游戏；
 *     重制或合集代替原作时在 note 里写明（UI 可能和原作不同）。
 *   - 真的不在 Steam（主机独占、手机、网页、掌机、下架老游戏）：给主品类、融合玩法、平台。
 * 主品类每款只取一个；融合类游戏把其他玩法写在 blend 与 note 里（用户 2026-10-14 的要求）。
 * 品类与平台按公开常识归类，没有逐条核对资料；拿不准的写"待核"。
 */

export type GenreId =
  | 'strategy' | 'builder' | 'factory' | 'explore' | 'rpg' | 'action' | 'platformer'
  | 'life' | 'puzzle' | 'narrative' | 'card' | 'racing' | 'shooter' | 'horror' | 'survival' | 'sandbox';

export interface ManualEntry {
  /** 名单里出现过的写法（奖项名单、案例库） */
  raw: string[];
  canonical: string;
  /** 在 Steam 上的名称：有就重新匹配 Steam */
  steam?: string;
  /** 商店搜索不稳定时直接写 appid（在 Steam 商店搜索结果里核对过） */
  appid?: number;
  platform: string;
  primary?: GenreId;
  blend?: GenreId[];
  note?: string;
}

export const MANUAL: ManualEntry[] = [
  /* ---------- 其实在 Steam 上（缩写、旧名、重制 / 合集） ---------- */
  { raw: ['Hellblade'], canonical: "Hellblade: Senua's Sacrifice", steam: "Hellblade: Senua's Sacrifice", platform: 'Steam' },
  { raw: ["Senua's Saga: Hellblade II"], canonical: "Senua's Saga: Hellblade II", steam: 'Hellblade II', platform: 'Steam' },
  { raw: ['Jet Grind Radio'], canonical: 'Jet Set Radio', platform: 'Dreamcast（PC 版在 Steam 美区搜索不到，待核）', primary: 'action', blend: ['platformer'], note: '街头滑轮 + 涂鸦动作；北美原名 Jet Grind Radio' },
  { raw: ['Kingdom Hearts'], canonical: 'Kingdom Hearts', steam: 'KINGDOM HEARTS -HD 1.5+2.5 ReMIX-', platform: 'Steam', note: 'Steam 为高清合集' },
  { raw: ['The Last of Us', 'TLOU'], canonical: 'The Last of Us', steam: 'The Last of Us Part I', platform: 'Steam', note: '获奖的是 2013 原作；Steam 为 Part I 重制，UI 有改动' },
  { raw: ['TLOU2'], canonical: 'The Last of Us Part II', steam: 'The Last of Us Part II Remastered', platform: 'Steam' },
  { raw: ['Witcher 3', 'The Witcher 3: Wild Hunt – Blood and Wine'], canonical: 'The Witcher 3: Wild Hunt', steam: 'The Witcher 3: Wild Hunt', platform: 'Steam', note: '"血与酒"是资料片' },
  { raw: ['Kena'], canonical: 'Kena: Bridge of Spirits', steam: 'Kena: Bridge of Spirits', platform: 'Steam' },
  { raw: ['Chicory'], canonical: 'Chicory: A Colorful Tale', steam: 'Chicory: A Colorful Tale', platform: 'Steam' },
  { raw: ['Jett: The Far Shore'], canonical: 'Jett: The Far Shore', steam: 'Jett: The Far Shore', platform: 'Steam' },
  { raw: ['Moss'], canonical: 'Moss', appid: 846470, platform: 'Steam（VR）' },
  { raw: ['ECHO'], canonical: 'ECHO（Ultra Ultra）', platform: 'PC / PS4（Steam 美区搜索不到，待核）', primary: 'action', blend: ['puzzle'], note: '潜行动作：敌人会学玩家的行为' },
  { raw: ['Jettomero'], canonical: 'Jettomero: Hero of the Universe', platform: 'PC（Steam 美区搜索不到，待核）', primary: 'explore', note: '巨型机器人在星球间漫步' },
  { raw: ['AER'], canonical: 'AER Memories of Old', steam: 'AER Memories of Old', platform: 'Steam' },
  { raw: ['Epistory'], canonical: 'Epistory - Typing Chronicles', appid: 398850, platform: 'Steam' },
  { raw: ['Kingdom'], canonical: 'Kingdom', steam: 'Kingdom Classic', platform: 'Steam' },
  { raw: ['FFXVI'], canonical: 'Final Fantasy XVI', steam: 'FINAL FANTASY XVI', platform: 'Steam' },
  { raw: ['GoW Ragnarök'], canonical: 'God of War Ragnarök', steam: 'God of War Ragnarök', platform: 'Steam' },
  { raw: ['RE Village'], canonical: 'Resident Evil Village', steam: 'Resident Evil Village', platform: 'Steam' },
  { raw: ['Detroit'], canonical: 'Detroit: Become Human', steam: 'Detroit: Become Human', platform: 'Steam' },
  { raw: ['Spider-Man'], canonical: "Marvel's Spider-Man", steam: "Marvel's Spider-Man Remastered", platform: 'Steam', note: 'Steam 为重制版' },
  { raw: ['RDR2'], canonical: 'Red Dead Redemption 2', steam: 'Red Dead Redemption 2', platform: 'Steam' },
  { raw: ['Horizon ZD'], canonical: 'Horizon Zero Dawn', steam: 'Horizon Zero Dawn Remastered', platform: 'Steam' },
  { raw: ['Horizon FW'], canonical: 'Horizon Forbidden West', steam: 'Horizon Forbidden West Complete Edition', platform: 'Steam' },
  { raw: ['Uncharted: TLL', 'Uncharted 4', 'Uncharted 4: A Thief\'s End'], canonical: 'Uncharted 4 / The Lost Legacy', steam: 'UNCHARTED: Legacy of Thieves Collection', platform: 'Steam', note: 'Steam 为合集（4 代 + 失落的遗产）' },
  { raw: ['Abzû'], canonical: 'ABZÛ', steam: 'ABZU', platform: 'Steam' },
  { raw: ['AC Syndicate'], canonical: "Assassin's Creed Syndicate", steam: "Assassin's Creed Syndicate", platform: 'Steam' },
  { raw: ['AC Unity'], canonical: "Assassin's Creed Unity", steam: "Assassin's Creed Unity", platform: 'Steam' },
  { raw: ['AC Brotherhood'], canonical: "Assassin's Creed Brotherhood", steam: "Assassin's Creed Brotherhood", platform: 'Steam' },
  { raw: ['AC Odyssey'], canonical: "Assassin's Creed Odyssey", steam: "Assassin's Creed Odyssey", platform: 'Steam' },
  { raw: ["Assassin's Creed"], canonical: "Assassin's Creed", steam: "Assassin's Creed: Director's Cut Edition", platform: 'Steam' },
  { raw: ["Assassin's Creed II"], canonical: "Assassin's Creed II", steam: "Assassin's Creed 2", platform: 'Steam' },
  { raw: ['Arkham Knight'], canonical: 'Batman: Arkham Knight', steam: 'Batman: Arkham Knight', platform: 'Steam' },
  { raw: ['Arkham City'], canonical: 'Batman: Arkham City', appid: 200260, platform: 'Steam' },
  { raw: ['MGSV'], canonical: 'Metal Gear Solid V: The Phantom Pain', steam: 'METAL GEAR SOLID V: THE PHANTOM PAIN', platform: 'Steam' },
  { raw: ['Beyond'], canonical: 'Beyond: Two Souls', steam: 'Beyond: Two Souls', platform: 'Steam' },
  { raw: ['Skyrim'], canonical: 'The Elder Scrolls V: Skyrim', steam: 'The Elder Scrolls V: Skyrim Special Edition', platform: 'Steam', note: 'Steam 为特别版' },
  { raw: ['CoD BO'], canonical: 'Call of Duty: Black Ops', steam: 'Call of Duty: Black Ops', platform: 'Steam' },
  { raw: ['FFVII Remake'], canonical: 'Final Fantasy VII Remake', steam: 'FINAL FANTASY VII REMAKE INTERGRADE', platform: 'Steam' },
  { raw: ['Persona 5'], canonical: 'Persona 5', steam: 'Persona 5 Royal', platform: 'Steam', note: 'Steam 为皇家版' },
  { raw: ['Spyro the Dragon', "Spyro 2: Ripto's Rage!", 'Spyro: Year of the Dragon'], canonical: 'Spyro 1–3', steam: 'Spyro Reignited Trilogy', platform: 'Steam', note: '获奖的是 PS1 原作；Steam 为重制合集，UI 与美术都重做' },
  { raw: ['Pharaoh'], canonical: 'Pharaoh', appid: 564530, platform: 'Steam' },
  { raw: ['The Sims'], canonical: 'The Sims', steam: 'The Sims Legacy Collection', platform: 'Steam（若找不到则为下架老游戏）' },
  { raw: ['Final Fantasy X-2'], canonical: 'Final Fantasy X-2', steam: 'FINAL FANTASY X/X-2 HD Remaster', platform: 'Steam', note: 'Steam 为 X / X-2 高清合集' },
  { raw: ['Final Fantasy XII'], canonical: 'Final Fantasy XII', steam: 'FINAL FANTASY XII THE ZODIAC AGE', platform: 'Steam', note: 'Steam 为黄道时代版' },
  { raw: ['Gears of War'], canonical: 'Gears of War', steam: 'Gears of War: Reloaded', platform: 'Steam', note: 'Steam 为 2025 重制' },
  { raw: ['PBJ - The Musical'], canonical: 'PBJ - The Musical', platform: '待核（Steam 美区搜索不到）', primary: 'narrative', note: '音乐剧式小品（品类待核）' },
  { raw: ['Riven: The Sequel to Myst'], canonical: 'Riven', steam: 'Riven', platform: 'Steam（2024 重制）', note: '获奖的是 1997 原作；Steam 为 2024 三维重制' },

  /* ---------- 不在 Steam：主机独占 ---------- */
  { raw: ['Death Stranding 2'], canonical: 'Death Stranding 2: On the Beach', platform: 'PS5', primary: 'explore', blend: ['action', 'narrative'], note: '送货探索为主，夹着战斗与大量过场' },
  { raw: ['Alan Wake 2'], canonical: 'Alan Wake 2', platform: 'PC（Epic）/ PS5 / Xbox', primary: 'horror', blend: ['narrative', 'action'], note: '生存恐怖，叙事很重，有射击' },
  { raw: ['God of War III'], canonical: 'God of War III', platform: 'PS3 / PS4', primary: 'action' },
  { raw: ['ICO'], canonical: 'ICO', platform: 'PS2 / PS3', primary: 'puzzle', blend: ['explore'], note: '护送解谜，几乎没有 HUD' },
  { raw: ['Shadow of the Colossus'], canonical: 'Shadow of the Colossus', platform: 'PS2 / PS4', primary: 'action', blend: ['explore', 'puzzle'], note: '只有 Boss 战与探索，HUD 极简' },
  { raw: ['The Last Guardian'], canonical: 'The Last Guardian', platform: 'PS4', primary: 'puzzle', blend: ['explore'], note: '与大鸟配合解谜' },
  { raw: ['The Legend of Zelda: The Wind Waker'], canonical: 'The Legend of Zelda: The Wind Waker', platform: 'GameCube', primary: 'explore', blend: ['action', 'puzzle'], note: '航海探索 + 地牢解谜' },
  { raw: ['Zelda: The Wind Waker HD'], canonical: 'The Legend of Zelda: The Wind Waker HD', platform: 'Wii U', primary: 'explore', blend: ['action', 'puzzle'], note: '高清版，UI 移到 GamePad 第二屏' },
  { raw: ['Zelda: Link\'s Awakening (2019)', 'Zelda: Link\'s Awakening'], canonical: "The Legend of Zelda: Link's Awakening (2019)", platform: 'Switch', primary: 'explore', blend: ['action', 'puzzle'], note: '俯视角动作冒险，玩具微缩画面' },
  { raw: ['Zelda: Breath of the Wild', 'Zelda: BotW', 'The Legend of Zelda: Breath of the Wild'], canonical: 'The Legend of Zelda: Breath of the Wild', platform: 'Switch / Wii U', primary: 'explore', blend: ['action', 'survival', 'puzzle'], note: '开放世界探索，带生存（耐力、料理、天气）与神庙解谜' },
  { raw: ['Zelda: Tears of the Kingdom', 'Zelda: TotK'], canonical: 'The Legend of Zelda: Tears of the Kingdom', platform: 'Switch', primary: 'explore', blend: ['action', 'sandbox', 'puzzle'], note: '在旷野之息基础上加了物理拼装（沙盒）' },
  { raw: ['Astro Bot'], canonical: 'Astro Bot', platform: 'PS5', primary: 'platformer' },
  { raw: ['Super Mario Bros. Wonder'], canonical: 'Super Mario Bros. Wonder', platform: 'Switch', primary: 'platformer' },
  { raw: ["Kirby's Epic Yarn"], canonical: "Kirby's Epic Yarn", platform: 'Wii / 3DS', primary: 'platformer', note: '毛线织物世界' },
  { raw: ['Tearaway'], canonical: 'Tearaway', platform: 'PS Vita / PS4', primary: 'platformer', blend: ['explore'], note: '纸艺世界，用触屏 / 摄像头与世界交互' },
  { raw: ['LittleBigPlanet'], canonical: 'LittleBigPlanet', platform: 'PS3', primary: 'platformer', blend: ['sandbox'], note: '平台跳跃 + 关卡编辑' },
  { raw: ['LBP2'], canonical: 'LittleBigPlanet 2', platform: 'PS3', primary: 'platformer', blend: ['sandbox'], note: '平台跳跃 + 关卡编辑' },
  { raw: ['Banjo-Kazooie'], canonical: 'Banjo-Kazooie', platform: 'N64 / Xbox', primary: 'platformer', blend: ['explore'], note: '3D 收集型平台跳跃' },
  { raw: ['Sly Cooper and the Thievius Raccoonus'], canonical: 'Sly Cooper and the Thievius Raccoonus', platform: 'PS2', primary: 'platformer', blend: ['action'], note: '潜行平台跳跃，赛璐璐风格' },
  { raw: ['Sly 2: Band of Thieves'], canonical: 'Sly 2: Band of Thieves', platform: 'PS2', primary: 'platformer', blend: ['action'], note: '潜行平台跳跃' },
  { raw: ['Jak II'], canonical: 'Jak II', platform: 'PS2', primary: 'platformer', blend: ['action', 'shooter'], note: '开放城区 + 射击' },
  { raw: ['Ratchet & Clank: Going Commando'], canonical: 'Ratchet & Clank: Going Commando', platform: 'PS2', primary: 'shooter', blend: ['platformer'], note: '武器射击 + 平台跳跃' },
  { raw: ['Bloodborne'], canonical: 'Bloodborne', platform: 'PS4', primary: 'action', blend: ['rpg', 'horror'], note: '类魂动作 RPG，哥特恐怖' },
  { raw: ['Uncharted 2: Among Thieves'], canonical: 'Uncharted 2: Among Thieves', platform: 'PS3 / PS4', primary: 'action', blend: ['shooter', 'platformer'], note: '电影化动作冒险：掩体射击 + 攀爬' },
  { raw: ["Uncharted 3: Drake's Deception", 'Uncharted 3'], canonical: "Uncharted 3: Drake's Deception", platform: 'PS3 / PS4', primary: 'action', blend: ['shooter', 'platformer'], note: '电影化动作冒险：掩体射击 + 攀爬' },
  { raw: ['Ghost of Yōtei'], canonical: 'Ghost of Yōtei', platform: 'PS5', primary: 'action', blend: ['explore'], note: '开放世界武士动作' },
  { raw: ['Dreams'], canonical: 'Dreams', platform: 'PS4', primary: 'sandbox', note: '创作工具型游戏，UI 以编辑器为主' },
  { raw: ['Concrete Genie'], canonical: 'Concrete Genie', platform: 'PS4', primary: 'explore', blend: ['puzzle'], note: '用手柄涂鸦作画推进探索' },
  { raw: ['The Order: 1886'], canonical: 'The Order: 1886', platform: 'PS4', primary: 'shooter', blend: ['narrative'], note: '电影化第三人称射击' },
  { raw: ['Heavenly Sword'], canonical: 'Heavenly Sword', platform: 'PS3', primary: 'action' },
  { raw: ['Fable II'], canonical: 'Fable II', platform: 'Xbox 360 / Xbox One', primary: 'rpg', blend: ['action', 'life'], note: '动作 RPG，带婚恋与置业' },
  { raw: ['Viva Piñata'], canonical: 'Viva Piñata', platform: 'Xbox 360 / PC（未上 Steam）', primary: 'life', blend: ['builder'], note: '花园经营 + 养成' },
  { raw: ['GoldenEye 007'], canonical: 'GoldenEye 007', platform: 'N64 / Xbox / Switch', primary: 'shooter' },
  { raw: ['Call of Duty 3'], canonical: 'Call of Duty 3', platform: 'PS3 / Xbox 360 / Wii', primary: 'shooter' },
  { raw: ['Star Wars Rogue Squadron II: Rogue Leader'], canonical: 'Star Wars Rogue Squadron II: Rogue Leader', platform: 'GameCube', primary: 'shooter', note: '太空飞行射击' },
  { raw: ['Eternal Darkness: Sanity\'s Requiem'], canonical: "Eternal Darkness: Sanity's Requiem", platform: 'GameCube', primary: 'horror', blend: ['action'], note: '"理智值"会伪造 UI（假的存档删除、静音提示）——元 UI 的经典案例' },
  { raw: ['Metroid Prime'], canonical: 'Metroid Prime', platform: 'GameCube / Switch', primary: 'explore', blend: ['shooter'], note: '第一人称探索射击；HUD 画在头盔面罩上（叙事内 UI 的经典案例）' },
  { raw: ['Metroid Prime 2: Echoes'], canonical: 'Metroid Prime 2: Echoes', platform: 'GameCube / Wii', primary: 'explore', blend: ['shooter'], note: '面罩式叙事内 HUD' },
  { raw: ['Ultimate Spider-Man'], canonical: 'Ultimate Spider-Man', platform: 'PS2 / GameCube / Xbox', primary: 'action', note: '漫画分格式过场与 UI' },
  { raw: ['King Kong'], canonical: "Peter Jackson's King Kong", platform: '多平台（已下架）', primary: 'action', blend: ['shooter'], note: '刻意几乎不用 HUD' },
  { raw: ['Muramasa: The Demon Blade'], canonical: 'Muramasa: The Demon Blade', platform: 'Wii / PS Vita', primary: 'action', blend: ['rpg'], note: '横版动作 RPG，日本画风' },
  { raw: ['World of Warcraft'], canonical: 'World of Warcraft', platform: 'PC（Battle.net）', primary: 'rpg', note: '大型多人 RPG，HUD 可由玩家插件改造' },
  { raw: ['Paper Mario 系列'], canonical: 'Paper Mario 系列', platform: 'Nintendo 各主机', primary: 'rpg', blend: ['platformer', 'puzzle'], note: '纸片风回合制 RPG' },
  { raw: ['Animal Crossing: New Horizons'], canonical: 'Animal Crossing: New Horizons', platform: 'Switch', primary: 'life', blend: ['builder'], note: '生活模拟 + 岛屿布置' },
  { raw: ['Genshin Impact'], canonical: 'Genshin Impact', platform: 'PC（官方启动器 / Epic）/ 主机 / 手机', primary: 'rpg', blend: ['action', 'explore'], note: '开放世界动作 RPG，手机与键鼠两套 UI' },
  { raw: ['Minecraft'], canonical: 'Minecraft', platform: 'PC（官方启动器）/ 全平台', primary: 'sandbox', blend: ['survival', 'builder'], note: '沙盒 + 生存 + 建造' },
  { raw: ['Disney\'s Villains\' Revenge'], canonical: "Disney's Villains' Revenge", platform: 'PC（1999，已绝版）', primary: 'explore', blend: ['puzzle'], note: '儿童向冒险小游戏合集' },
  { raw: ['The Neverhood'], canonical: 'The Neverhood', platform: 'PC（1996，未上 Steam）', primary: 'puzzle', blend: ['narrative'], note: '黏土定格点击冒险' },

  /* ---------- 不在 Steam：手机 / 掌机 / 网页 ---------- */
  { raw: ['Lego Star Wars: Castaways'], canonical: 'LEGO Star Wars: Castaways', platform: 'Apple Arcade', primary: 'explore', blend: ['life'], note: '社交冒险，手机触屏' },
  { raw: ['Alto\'s Odyssey'], canonical: "Alto's Odyssey", platform: '手机', primary: 'racing', blend: ['platformer'], note: '无尽滑沙：竞速感的跑酷，单键操作' },
  { raw: ['Alto\'s Adventure'], canonical: "Alto's Adventure", platform: '手机', primary: 'racing', blend: ['platformer'], note: '无尽滑雪跑酷，单键操作' },
  { raw: ['Guildlings'], canonical: 'Guildlings', platform: 'Apple Arcade', primary: 'rpg', blend: ['narrative'], note: '手机上的轻 RPG，界面模仿手机' },
  { raw: ['Inks'], canonical: 'INKS.', platform: '手机', primary: 'puzzle', note: '水彩弹珠台（解谜式弹球）' },
  { raw: ['Song of Bloom'], canonical: 'Song of Bloom', platform: '手机', primary: 'puzzle', note: '每关换一种画风与交互的谜题' },
  { raw: ['Oquonie'], canonical: 'Oquonie', platform: 'iOS', primary: 'puzzle', note: '等距像素解谜，几乎无文字' },
  { raw: ["The Sailor's Dream"], canonical: "The Sailor's Dream", platform: '手机', primary: 'narrative', blend: ['explore'], note: '无战斗的叙事探索' },
  { raw: ['Device 6'], canonical: 'DEVICE 6', platform: 'iOS', primary: 'narrative', blend: ['puzzle'], note: '文字排版本身就是关卡与 UI' },
  { raw: ['绘真·妙笔千山'], canonical: '绘真·妙笔千山', platform: '手机', primary: 'puzzle', blend: ['explore'], note: '青绿山水画中解谜' },
  { raw: ['江南百景图'], canonical: '江南百景图', platform: '手机', primary: 'builder', blend: ['life'], note: '明代江南城镇经营，界面仿古画' },
  { raw: ['尼山萨满'], canonical: '尼山萨满', platform: '手机 / 主机', primary: 'narrative', blend: ['puzzle'], note: '剪纸风音乐节奏 + 叙事（待核：品类介于节奏与叙事）' },
  { raw: ['Mars After Midnight'], canonical: 'Mars After Midnight', platform: 'Playdate', primary: 'life', blend: ['puzzle'], note: '1-bit 掌机上的互助会管理小游戏，用摇杆' },
  { raw: ['Messenger'], canonical: 'Messenger（Abeto）', platform: '网页', primary: 'explore', blend: ['narrative'], note: '浏览器里的小星球社交探索' },
  { raw: ['Forkride Grilltime Sloth'], canonical: 'Forkride Grilltime Sloth', platform: '待核', primary: 'action', note: '资料不足，品类待核' },
];

export const MANUAL_BY_RAW = new Map<string, ManualEntry>(MANUAL.flatMap((e) => e.raw.map((r) => [r, e] as const)));
