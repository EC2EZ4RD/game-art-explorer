<!-- 来源：案例与数据源调研（2026-10-13 调研子代理报告原文存档，未经人工校对；数据会在后续里程碑中核验与补充） -->

# 游戏美术风格探索台：Steam 数据接口、美术奖项和 200+ 案例调研

**结论：**
- 你要求测试的 Steam 接口全部能用。SteamPeek 是服务端直接输出的页面，能直接抓取。
- 另外发现 3 个能用的接口：
  - 批量查询接口 `IStoreBrowseService/GetItems`：一次能查 60 个 appid，能返回截图、素材、标签和开发者。
  - 搜索接口 `storesearch`：用游戏名（中文也行）查 appid。
  - 周销量榜接口 `GetWeeklyTopSellers`。
- 三大美术奖项都整理好了：IGF 视觉艺术奖 2015–2026，BAFTA 艺术成就奖 2010–2025，TGA 最佳美术指导 2015–2025。
- 候选案例共 222 条，分成 26 个风格组，每组至少 6 条。
- appid 全部经 Steam 官方接口确认过名称。我凭记忆填的 appid 里有 30 多个对不上（例如 1428470 其实是 Stowaway，不是 The Legend of Tianding），都已改正或标为"待核验"。

---

## 一、数据接口验证（2026-10-13 实测）

| 接口 | 结果 | 返回的数据 |
|---|---|---|
| `store.steampowered.com/api/appdetails?appids=1167630&l=schinese` | ✅ | 返回 `{"1167630":{"success":true,"data":{…}}}`。`data` 下有 38 个字段，包括 `name`、`steam_appid`、`developers[]`、`publishers[]`、`release_date{coming_soon,date}`、`genres[{id,description}]`、`categories`、`header_image`、`capsule_image`、`background`、`screenshots[{id,path_thumbnail,path_full}]`（Teardown 有 11 张，缩略图 600x338，原图 1920x1080）、`movies[{id,name,thumbnail,dash_av1,dash_h264,hls_h264,highlight}]`。用 `l=schinese` 时，类型和日期都是中文（如 "2022年4月21日"），解析日期时要注意。 |
| `search/results/?filter=topsellers&json=1&count=50&cc=us` | ✅ | 返回 `{"desc":"","items":[{"name","logo"}]}`，共 50 条。**没有单独的 appid 字段**，要从 logo 地址的 `/apps/{appid}/` 里截取。结果里混有硬件（Steam Deck/Frame/Controller/Machine）和 DLC。 |
| `search/results/?query&start=0&count=50&filter=topsellers&infinite=1&cc=us` | ✅ | 返回 `{success:1, results_html, total_count, start}`。每条结果的 HTML 里有 `data-ds-appid`、标题、平台、发售日、评价和价格。用 `start` 翻页，**推荐用这个**。 |
| `filter=popularwishlist`（上面两种写法都试了） | ✅ | 结构同上，`total_count=5360`。返回的发售日是 "To be announced / 2027 / Coming soon" 这类文字。 |
| `steampeek.hu/?appid=1167630` | ✅ | 页面顶部显示种子游戏的标签。相关游戏每页约 36 个（Teardown 共 5,622 个，157 页）。每条有：标签（链接为 `?tagid=N`）、标题（链接为 `?appid=ID`）、SteamPeek 评分（"N/A" 表示还没有评分）、两个不明数字、**RS 相似度**、简介、Steam 商店链接（`store.steampowered.com/app/ID/?utm_source=SteamPeek`）和 YouTube 链接。翻页参数没验证。 |
| **额外发现：** `api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json={"ids":[{"appid":…}],"context":{"language":"schinese","country_code":"US"},"data_request":{"include_basic_info":true,"include_assets":true,"include_screenshots":true,"include_release":true,"include_tag_count":20}}` | ✅ | **能批量查**（实测一次 60 个）。返回 `store_items[]`，字段有 `appid`、`name`、`type`、`success`、`basic_info{developers[{name}],publishers}`、`tagids`、`tags`、`assets{asset_url_format, header, library_capsule…}`、`screenshots.all_ages_screenshots[{filename,ordinal}]`、`release{steam_release_date}`。查不到的 appid 返回 `success:15`。截图的完整地址前缀我推断是 `https://shared.akamai.steamstatic.com/store_item_assets/`，还需要验证。 |
| **额外发现：** `store.steampowered.com/api/storesearch/?term=…&l=english&cc=US` | ✅ | 返回 `{total, items[{id,name,type,price,tiny_image,metascore,platforms}]}`，可以按名字反查 appid。中文名配 `l=schinese&cc=CN` 也能查（如 山海旅人→1161170）。 |
| **额外发现：** `IStoreTopSellersService/GetWeeklyTopSellers/v1` | ✅ | 返回 `{start_date, ranks[{rank,appid,item,last_week_rank,consecutive_weeks}], next_page_start}`，是官方周销量榜，适合拿来做趋势。 |

---

## 二、美术奖项证据

### 2.1 IGF 视觉艺术奖（Excellence in Visual Art）
**粗体为获奖作品**。获奖作品以维基百科为准，入围名单来自 igf.com 各年存档页。

| 年 | 入围（★为获奖） | 荣誉提名 |
|---|---|---|
| 2026 | ★**Eclipsium**、Blippo+、CARIMARA: Beneath the forlorn limbs、Loco Motive、Morsels、Skate Story | Sol Cesto、Is This Seat Taken?、The Drifter、Demonschool、Henry Halfhead、PBJ - The Musical |
| 2025 | ★**Hauntii**、Children of the Sun、Consume Me、Judero、Nine Sols、Thank Goodness You're Here! | Crow Country、Death of the Reprobate、Miniatures、Tiny Glade、Ultros |
| 2024 | ★**Phonopolis**、Anthology of the Killer、Clash: Artifacts of Chaos、Darkest Dungeon II、Little Goody Two Shoes、Venba | 30 Birds、Chants of Sennaar、Goodbye Volcano High、NIDUS、SLUDGE LIFE 2 |
| 2023 | ★**RPG Time: The Legend of Wright**、Afterglitch、How Deep Is the Dark Water?、Potionomics、To Hell With the Ugly、TUNIC | I Was a Teenage Exocolonist、Melatonin、NAIAD、Potion Craft、Return to Monkey Island、Swordship、Terra Nil、Voodoo Detective |
| 2022 | ★**Papetura**、The Eternal Cylinder、Behind the Frame、Fuzz Dungeon、The Wild at Heart、Jett: The Far Shore | Inscryption、A Musical Story、Kena、Saturnalia、Stonefly、Cris Tales |
| 2021 | ★**Genesis Noir**、Arrog、In Other Waters、Shady Part of Me、Call of the Sea、Carto | Stilstand、Bloodroots、OMORI、Chicory、Going Under、Umurangi Generation |
| 2020 | ★**Knights and Bikes**、Mutazione、Void Bastards、Creature in the Well、Eastward、Stone Story RPG | LUNA The Shadow Dust、Eastshade、Minute of Islands、Katana ZERO、Song of Bloom、A Short Hike、Creaks |
| 2019 | ★**Mirror Drop**、Alto's Odyssey、Forgotton Anne、Hypnospace Outlaw、Just Shapes & Beats、Return of the Obra Dinn | Beat Saber、Guildlings、Iconoclasts、Moss、Paratopic、Subnautica、Wandersong |
| 2018 | ★**CHUCHEL**、Night in the Woods、Cuphead、ECHO、Luna、The Gardens Between | Jettomero、Dead Cells、AER、Tooth and Tail、Rain World、Shape of the World、Hollow Knight |
| 2017 | ★**Hyper Light Drifter**、The Flame in the Flood、INSIDE、Virginia、Old Man's Journey、She Remembered Caterpillars | Inks、Night in the Woods、Mu Cartographer、Future Unfolding、Sundered、Un Pas Fragile |
| 2016 | ★**OXENFREE**、Armello、Darkest Dungeon、GNOG、Mini Metro、PANORAMICAL | Alto's Adventure、Astroneer、Epistory、Forkride Grilltime Sloth、Future Unfolding、Kingdom |
| 2015 | ★**Metamorphabet**、Donut County、else Heart.Break()、Lumino City、Memory of a Broken Dimension、Oquonie | Crawl、Future Unfolding、Hyper Light Drifter、Mini Metro、The Sailor's Dream、The Vanishing of Ethan Carter |

更早的获奖作品：2014 Gorogoa、2013 Kentucky Route Zero、2012 Dear Esther、2011 BIT.TRIP RUNNER、2010 Limbo、2009 Machinarium、2008 Fez、2007 Castle Crashers。

来源：
- 获奖总表：https://en.wikipedia.org/wiki/Independent_Games_Festival
- 2015–2025 各年：https://igf.com/archive-2015/ 到 https://igf.com/archive-2025/
- 2024：https://press-start.com.au/news/2024/03/21/the-independent-games-festival-awards-2024-finalists-have-been-revealed/
- 2026：https://igf.com/article/baby-steps-strolls-to-lead-with-5-nominations-at-2026-igf-awards/

### 2.2 BAFTA Games 艺术成就奖（Artistic Achievement）
**粗体为获奖作品**

| 年度（颁奖年） | 获奖 / 提名 |
|---|---|
| 2025（2026年4月颁奖） | **Death Stranding 2**；Clair Obscur: Expedition 33、Dispatch、Ghost of Yōtei、Hollow Knight: Silksong、South of Midnight |
| 2024 | **Neva**；Astro Bot、Black Myth: Wukong、Harold Halibut、Hellblade II、Still Wakes the Deep |
| 2023 | **Alan Wake 2**；Baldur's Gate 3、Cocoon、Diablo IV、FFXVI、Hi-Fi Rush |
| 2022 | **Tunic**；Elden Ring、GoW Ragnarök、Immortality、Pentiment、A Plague Tale: Requiem |
| 2021 | **The Artful Escape**；It Takes Two、Psychonauts 2、Ratchet & Clank: Rift Apart、Returnal、RE Village |
| 2020 | **Hades**；Cyberpunk 2077、Dreams、TLOU2、Ghost of Tsushima、Half-Life: Alyx |
| 2019 | **Sayonara Wild Hearts**；Concrete Genie、Death Stranding、Control、Disco Elysium、Knights and Bikes |
| 2018 | **Return of the Obra Dinn**；Detroit、God of War、Spider-Man、Gris、RDR2 |
| 2017 | **Hellblade**；Cuphead、Gorogoa、Horizon ZD、Uncharted: TLL、Zelda: BotW |
| 2016 | **Inside**；Abzû、Dishonored 2、The Last Guardian、Uncharted 4、Unravel |
| 2015 | **Ori and the Blind Forest**；AC Syndicate、Arkham Knight、Everybody's Gone to the Rapture、MGSV、Witcher 3 |
| 2014 | **Lumino City**；AC Unity、Far Cry 4、Valiant Hearts、Hohokum、Monument Valley |
| 2013 | **Tearaway**；BioShock Infinite、Beyond、TLOU、Device 6、Ni no Kuni |
| 2012 | **Journey**；The Room、Halo 4、Dear Esther、Borderlands 2、Far Cry 3 |
| 2011 | **Rayman Origins**；Arkham City、L.A. Noire、LBP2、Uncharted 3、Skyrim |
| 2010 | **God of War III**；AC Brotherhood、CoD BO、Heavy Rain、Limbo、Mass Effect 2 |

来源：
- https://en.wikipedia.org/wiki/British_Academy_Games_Award_for_Artistic_Achievement
- 2026 获奖复核：https://www.pocketgamer.biz/clair-obscur-and-dispatch-take-top-accolades-at-bafta-games-awards-2026/

### 2.3 TGA 最佳美术指导（Best Art Direction）
**2014 年 TGA 没有这个奖项**，从 2015 年开始设立。维基百科页面里"最佳叙事"和"最佳美术指导"两个列表挨在一起，抓取时我三次读错了归属。2023–2025 年的名单我用 Gematsu 等新闻稿重新核对过，2016–2017 年在维基页面里单独复核过。

| 年 | 获奖 / 提名 |
|---|---|
| 2025 | **Clair Obscur: Expedition 33**；Death Stranding 2、Ghost of Yōtei、Hades II、Hollow Knight: Silksong |
| 2024 | **Metaphor: ReFantazio**；Astro Bot、Black Myth: Wukong、Elden Ring: Shadow of the Erdtree、Neva |
| 2023 | **Alan Wake 2**；Hi-Fi Rush、Lies of P、Super Mario Bros. Wonder、Zelda: TotK |
| 2022 | **Elden Ring**；GoW Ragnarök、Horizon FW、Scorn、Stray |
| 2021 | **Deathloop**；Kena、Psychonauts 2、Ratchet & Clank: Rift Apart、The Artful Escape |
| 2020 | **Ghost of Tsushima**；FFVII Remake、Hades、TLOU2、Ori and the Will of the Wisps |
| 2019 | **Control**；Death Stranding、Gris、Zelda: Link's Awakening、Sayonara Wild Hearts、Sekiro |
| 2018 | **Return of the Obra Dinn**；AC Odyssey、God of War、RDR2、Octopath Traveler |
| 2017 | **Cuphead**；Destiny 2、Horizon ZD、Persona 5、Zelda: BotW |
| 2016 | **Inside**；Abzû、Firewatch、Overwatch、Uncharted 4 |
| 2015 | **Ori and the Blind Forest**；Arkham Knight、Bloodborne、MGSV、Witcher 3 |

来源：
- 各年页面：https://en.wikipedia.org/wiki/The_Game_Awards_2015 到 …_2025
- 2023 复核：https://www.gematsu.com/2023/11/the-game-awards-2023-nominees-announced
- 2024 复核：https://www.gematsu.com/2024/12/the-game-awards-2024-winners-announced
- 2025 复核：https://www.gematsu.com/2025/11/the-game-awards-2025-nominees-announced

---

## 三、候选案例（26 组，共 222 条，每组至少 6 条）

**表格怎么读：**
- **appid 列**：
  - 纯数字：已用 Steam 官方接口（GetItems 或 storesearch）确认，appid 和名称对得上。
  - 标"(SP)"：只在 SteamPeek 的 Steam 链接里见过，没用官方接口单独确认。
  - "—"：不在 Steam 上。
- **来源列的缩写**：

| 缩写 | 含义 | 地址 |
|---|---|---|
| [S] | Steam 商店页 | `https://store.steampowered.com/app/{appid}/` |
| IGFyy | IGF 当年存档 | 见 2.1 |
| BAFTAyy | BAFTA 当年 | 见 2.2 |
| TGAyy | TGA 当年 | 见 2.3 |
| [TOP] | 热销榜快照 | 见第四节 |
| [WL] | 愿望单榜快照 | 见第四节 |
| [SP-ASH] | SteamPeek 以 A Short Hike 为种子 | https://steampeek.hu/?appid=1055540 |
| [SP-TS] | SteamPeek 以 Townscaper 为种子 | https://steampeek.hu/?appid=1291340 |

### A. 低多边形 / 微缩手办 / 移轴
| 名称 | appid | 平台 | 开发者 | 美术特征 | 入选依据 | 来源 |
|---|---|---|---|---|---|---|
| Townscaper | 1291340 | PC/Switch/移动 | Oskar Stålberg | 程序化小镇，粉彩，像微缩模型 | 代表作；SteamPeek 种子 | [S][SP-TS] |
| Tiny Glade | 2198150 (SP) | PC | Pounce Light | 微缩城堡，柔光，手工感建筑 | IGF25 荣誉提名；SP-TS #5 | [SP-TS] |
| A Short Hike | 1055540 | PC/Switch | adamgryu | 低多边形，叠加低分辨率像素化后处理 | IGF20 大奖，同年视觉奖荣誉提名 | [S] IGF20 |
| ISLANDERS | 1046030 | PC/Switch | GrizzlyGames | 极简低多边形岛屿，纯色渐变 | 代表作 | [S] |
| Dorfromantik | 1455840 | PC/Switch | Toukana Interactive | 六边形拼块田园，低饱和 | 代表作 | [S] |
| Bad North | 688420 | PC/主机/移动 | Plausible Concept | 漂浮小岛上的微缩战场 | 代表作 | [S] |
| The Gardens Between | 600990 | PC/主机 | The Voxel Agents | 记忆小岛，移轴，暮色调 | IGF18 入围 | [S] |
| Donut County | 702670 | PC/主机/移动 | Ben Esposito | 平涂低多边形，等距 | IGF15 入围 | [S] |
| Lara Croft GO | 540840 | PC/移动 | Square Enix Montréal | 棋盘式立体模型 | 代表作 | [S] |
| Before We Leave | 1073910 | PC | Balancing Monkey | 六边形小星球 | 代表作 | [S] |
| Grow Home | 323320 (SP) | PC | Ubisoft Reflections | 平涂低多边形，程序化藤蔓 | SP-ASH #23 | [SP-ASH] |
| Smushi Come Home | 1740300 | PC | SomeHumbleOnion | 低多边形森林，可爱生物 | SP-ASH #9 | [S] |
| AER Memories of Old | 331870 (SP) | PC | Forgotten Key | 平涂低多边形浮空岛 | IGF18 荣誉提名；SP-ASH #4 | [SP-ASH] |
| Alba: A Wildlife Adventure | 1337010 | PC/移动 | ustwo games | 地中海小岛，明亮低多边形 | 代表作 | [S] |
| Zelda: Link's Awakening (2019) | — | Switch | Grezzo | 玩具手办角色，立体模型世界，移轴景深 | TGA19 提名；作者指定的参考案例 | https://earth.gamerguides.com/the-legend-of-zelda-links-awakening |
| Messenger | — | Web (three.js) | Abeto | 小星球上送信，柔和卡通，微缩感 | 作者指定的参考案例 | https://en.wikipedia.org/wiki/Messenger_(video_game) ；官网 messenger.abeto.co |
| Astro Bot | — | PS5 | Team Asobi | 塑料玩具质感，高光泽 | TGA24、BAFTA24 提名 | 见 2.2/2.3 |

### B. 卡通分阶三维（Toon / Cel-shading）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Hi-Fi RUSH | 1817230 | PC/主机 | Tango Gameworks | 卡通渲染，漫画网点特效，动作卡节拍 | TGA23、BAFTA23 提名 | [S] |
| TUNIC | 553420 | PC/主机 | TUNIC Team | 等距视角，平涂光照，复古说明书风格 | BAFTA22 获奖；IGF23 入围 | [S] |
| Death's Door | 894020 | PC/主机 | Acid Nerve | 低饱和卡通，等距哥特 | 代表作 | [S] |
| Sea of Thieves | 1172620 | PC/Xbox | Rare | 风格化卡通，配写实水面 | 代表作 | [S] |
| Lil Gator Game | 1586800 | PC/Switch | MegaWobble | 平涂硬阴影，"孩子过家家"质感 | 代表作 | [S] |
| Psychonauts 2 | 607080 | PC/主机 | Double Fine | 夸张造型，超现实关卡 | TGA21、BAFTA21 提名 | [S] |
| Kena: Bridge of Spirits | 1954200 | PC/PS | Ember Lab | 皮克斯式三维动画 | TGA21 提名；IGF22 荣誉提名 | [S] |
| Ni no Kuni Remastered | 798460 | PC/主机 | Level-5（吉卜力参与） | 吉卜力动画式卡通渲染 | BAFTA13 提名 | [S] |
| Jet Set Radio | 205950 | PC | Sega/Blit | 早期 cel-shading 代表，涂鸦 | 风格源头 | [S] |
| Bomb Rush Cyberfunk | 1353230 | PC/主机 | Team Reptile | 继承 JSR，粗描边，高饱和 | 代表作 | [S] |
| Rollerdrome | 1294420 | PC/主机 | Roll7 | 欧洲漫画式描边，70 年代复古未来 | 代表作 | [S] |
| Haven | 983970 | PC/主机 | The Game Bakers | 粉彩卡通，轮廓光 | 代表作 | [S] |
| It Takes Two | 1426210 | PC/主机 | Hazelight | 动画电影式玩具世界 | BAFTA21 提名 | [S] |
| Ratchet & Clank: Rift Apart | 1895880 | PC/PS5 | Insomniac | 动画电影级卡通 | TGA21、BAFTA21 提名 | [S] |
| Overwatch | 2357570 | PC/主机 | Blizzard | 手绘纹理风格化 | TGA16 提名；热销 #28 | [S][TOP] |
| Potionomics | 1874490 | PC/主机 | Voracious Games | 三维角色配二维动画化表演 | IGF23 入围 | [S] |
| Zelda: The Wind Waker HD | — | Wii U | Nintendo | 经典卡通渲染 | 风格标杆 | https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_The_Wind_Waker_HD |
| Super Mario Bros. Wonder | — | Switch | Nintendo EPD | 动画化弹性形变 | TGA23 提名 | 见 2.3 |

### C. 动漫赛璐璐
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| GUILTY GEAR -STRIVE- | 1384160 | PC/主机 | Arc System Works | 三维模型做出二维赛璐璐效果，有限帧动画 | 技术标杆 | [S] |
| GUILTY GEAR Xrd REV 2 | 520440 | PC/主机 | Arc System Works | 这套方法的开山之作 | 代表作 | [S] |
| DRAGON BALL FighterZ | 678950 | PC/主机 | Arc System Works | 还原动画画面 | 代表作 | [S] |
| Persona 5 Royal | 1687950 | PC/主机 | ATLUS | 红黑波普界面，赛璐璐 | TGA17 提名 | [S] |
| Metaphor: ReFantazio | 2679460 | PC/主机 | ATLUS | 绘画感界面，配赛璐璐 | TGA24 获奖 | [S] |
| Granblue Fantasy: Relink | 881020 | PC/PS | Cygames | 还原插画的赛璐璐 | 代表作 | [S] |
| SCARLET NEXUS | 775500 | PC/主机 | Bandai Namco | 动漫配近未来 | 代表作 | [S] |
| Atelier Ryza | 1121560 | PC/主机 | Koei Tecmo | 柔和动漫，自然光 | 代表作 | [S] |
| Tales of ARISE | 740130 | PC/主机 | Bandai Namco | 带水彩纹理的动漫画面 | 代表作 | [S] |
| Forgotton Anne | 542050 | PC/主机 | ThroughLine | 吉卜力式手绘动画 | IGF19 入围 | [S] |
| Wuthering Waves | 3513350 | PC/移动 | Kuro Games | 二次元开放世界 | 热销 #35 | [TOP] |
| Aniimo | 4126040 | PC | 待核验 | 萌宠收集类卡通（我的初步判断） | 热销 #15 | [TOP] |
| Persona 4 Revival | 2963950 | PC/主机 | ATLUS | 动漫重制 | 愿望单 #18 | [WL] |
| Genshin Impact | — | PC/移动/PS | HoYoverse | 二次元卡通渲染开放世界 | 风格标杆 | https://genshin.hoyoverse.com/ |

### D. 漫画 / 网点 / 美漫
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| XIII | 1154790 | PC/主机 | PlayMagic（原作 Ubisoft） | 法式漫画描边，分格演出 | 代表作 | [S] |
| Borderlands 2 | 49520 | PC/主机 | Gearbox | 手绘描边纹理 | BAFTA12 提名 | [S] |
| Borderlands 3 | 397540 | PC/主机 | Gearbox | 同上 | 代表作 | [S] |
| The Wolf Among Us | 250320 | PC/主机 | Telltale | 美漫黑色电影，粗描边 | 代表作 | [S] |
| Batman - The Telltale Series | 498240 | PC/主机 | Telltale | 美漫赛璐璐 | 代表作 | [S] |
| killer7 | 868520 | PC | Grasshopper | 极高反差的平涂 | 代表作 | [S] |
| Max Payne | 12140 | PC | Remedy | 图像小说式分格叙事 | 代表作 | [S] |
| Marvel Rivals | 2767030 | PC/主机 | NetEase | 美漫卡通渲染 | 热销 #12 | [S][TOP] |
| Dispatch | 2592160 | PC/主机 | AdHoc Studio | 二维动画剧集，超级英雄题材 | BAFTA25 提名；TGA25 最佳首作独立游戏提名 | [S] |
| The Legend of Tianding | 1406850 | PC/主机 | Creative Games（台湾） | 台湾漫画分格演出 | 代表作 | [S] |
| Ghost Trick | 1967430 | PC/主机 | Capcom | 流畅剪影动画，强轮廓 | 代表作 | [S] |
| Sunset Overdrive | 847370 | PC | Insomniac | 朋克涂鸦漫画 | 代表作 | [S] |
| Void Bastards | 857980 | PC/主机 | Blue Manchu | 美漫平涂，配科幻题材 | IGF20 入围 | [S] |

### E. 绘画感三维
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Clair Obscur: Expedition 33 | 1903340 | PC/主机 | Sandfall | 美好年代油画质感 | TGA25 获奖；BAFTA25 提名 | [S] |
| Dishonored 2 | 403640 | PC/主机 | Arkane | 油画笔触纹理 | BAFTA16 提名 | [S] |
| Hades | 1145360 | PC/主机 | Supergiant | 三维模型配手绘纹理和强描边 | BAFTA20 获奖；TGA20 提名 | [S] |
| Hades II | 1145350 | PC/主机 | Supergiant | 同上 | TGA25 提名 | [S] |
| The Artful Escape | 1122680 | PC/主机 | Beethoven & Dinosaur | 迷幻色彩的舞台布景 | BAFTA21 获奖；TGA21 提名 | [S] |
| Knights And Bikes | 592480 | PC/主机 | Foam Sword | 手绘纹理，80 年代绘本感 | IGF20 获奖；BAFTA19 提名 | [S] |
| Lost in Random | 1462570 | PC/主机 | Zoink | 蒂姆·伯顿式暗黑童话 | 代表作 | [S] |
| The Pathless | 1492680 | PC/主机 | Giant Squid | 大色块，红色作主色 | 代表作 | [S] |
| ABZU | 384190 | PC/主机 | Giant Squid | 风格化海洋色彩 | TGA16、BAFTA16 提名 | [S] |
| Journey | 638230 | PC/主机 | thatgamecompany | 沙漠光影，布料 | BAFTA12 获奖 | [S] |
| Sky: Children of the Light | 2325290 | PC/移动 | thatgamecompany | 云海光影 | 代表作 | [S] |
| SEASON: A letter to the future | 695330 | PC/PS | Scavengers Studio | 平涂绘画，旅行速写感 | 代表作 | [S] |
| Eastshade | 715560 | PC/主机 | Eastshade Studios | 油画感世界，画家主题 | IGF20 荣誉提名 | [S] |
| Disco Elysium | 632470 | PC/主机 | ZA/UM | 表现主义油画 | BAFTA19 提名 | [S] |
| Firewatch | 383870 | PC/主机 | Campo Santo | 海报式色块 | TGA16 提名 | [S] |
| Armello | 290340 | PC/主机 | League of Geeks | 绘本式彩绘 | IGF16 入围 | [S] |
| The Flame in the Flood | 318600 | PC/主机 | The Molasses Flood | 手绘纹理，美国南方民俗 | IGF17 入围 | [S] |

### F. 水彩 / 水粉
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| GRIS | 683320 | PC/主机/移动 | Nomada Studio | 水彩晕染，用色彩讲故事 | TGA19 提名；BAFTA18 提名 | [S] |
| Neva | 2420660 | PC/主机 | Nomada Studio | 水彩，配色彩主题 | BAFTA24 获奖；TGA24 提名 | [S] |
| Dordogne | 1272840 | PC/主机 | Un Je Ne Sais Quoi | 实体水彩手绘背景 | 代表作 | [S] |
| Child of Light | 256290 | PC/主机 | Ubisoft Montréal | 水彩童话 | 代表作 | [S] |
| Valiant Hearts | 260230 | PC/主机 | Ubisoft Montpellier | 法比漫画，配水彩 | BAFTA14 提名 | [S] |
| Old Man's Journey | 581270 | PC/移动 | Broken Rules | 插画式水彩 | IGF17 入围 | [S] |
| Behind the Frame | 1634150 | PC/移动 | Silver Lining Studio | 吉卜力式画面 | IGF22 入围 | [S] |
| Mutazione | 1080750 | PC/主机 | Die Gute Fabrik | 手绘水粉 | IGF20 入围 | [S] |
| Cloud Gardens | 1372320 | PC/主机 | Noio | 低保真植物，柔和色 | SP-TS #1 | [S][SP-TS] |
| Venba | 1491670 | PC/主机 | Visai Games | 平涂插画 | IGF24 入围及大奖 | [S] |
| Mineko's Night Market | 762940 | PC/Switch | Meowza Games | 日式绘本 | 代表作 | [S] |
| Minute of Islands | 1049710 | PC/主机 | Studio Fizbin | 手绘绘本 | IGF20 荣誉提名 | [S] |

### G. 水墨 / 写意
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Okami HD | 587620 | PC/主机 | Clover Studio / Capcom | 墨绘配浮世绘，画笔是核心玩法 | 风格标杆 | [S] |
| The Last Soldier of the Ming Dynasty | 2494450 | PC | Circuit_Art | 三维水墨山水，人物按古画比例 | 评测报道 | [S] https://automaton-media.com/en/news/20231207-23810/ |
| The Rewinder（山海旅人） | 1161170 | PC/主机 | MistyMountainStudio（云山小雨） | 用像素表现水墨 | 机核报道 | [S] https://www.gcores.com/articles/140906 |
| 鬼谷八荒 Tale of Immortal | 1468810 | PC | 鬼谷工作室 | 水墨界面和大地图 | 现象级国产游戏 | [S] |
| Yi Xian: The Cultivation Card Game | 1948800 | PC | Darksun Studio | 水墨卡牌 | 代表作 | [S] |
| Wash Card | 2095150 | PC | LeHuan | 商店页标注为水墨画风 | 搜索结果 | [S] |
| 春秋异闻录 The Hidden Scrolls | 3201830 | PC | Red Dragon Studio | 水墨，配油画质感 | 评论汇总 | [S] |
| Eastern Exorcist（斩妖行） | 1120810 | PC/主机 | Wildfire Game | 二维手绘，国风横版 | 代表作 | [S] |
| Muramasa: The Demon Blade | — | Wii/Vita | Vanillaware | 日本绘卷式手绘 | 风格标杆 | https://en.wikipedia.org/wiki/Muramasa:_The_Demon_Blade |

### H. 工笔 / 青绿山水 / 中国传统绘画
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| 绘真·妙笔千山 | — | iOS/Android | 网易 × 故宫 | 以《千里江山图》为蓝本的青绿山水，分层手绘配三维 | 作者指定的参考案例 | https://sspai.com/post/52301 ；https://news.17173.com/content/06052018/105438053.shtml |
| 千里山河录 Qianli: The Vastscape Scroll | 4358380 | PC | Betobe Studio（北斗北），2P Games 发行 | 《千里江山图》青绿配色，六边形地块拼图建造 | 2026 新作 | [S] https://www.gcores.com/articles/217367 |
| 江南百景图 | — | 移动 | 椰岛游戏 | 仇英重彩风俗画，加吴门山水，水墨晕染效果 | 人民日报海外版报道 | https://paper.people.com.cn/hwbwap/html/2020-08/25/content_2004988.htm |
| 岁久丹青 Ink Reverie | 3084260 | PC | Rolling Cat Studio（猫滚滚），indienova 发行 | 唐宋手绘国风城建，有敦煌地图 | 机核报道 | [S] https://www.gcores.com/articles/200707 |
| The Bustling World | 2724650 | PC | FireWo Games（待核验） | 建筑参考古画，5000+ 手绘元素 | 愿望单 #42 | [S][WL] https://www.gematsu.com/2023/12/chinese-style-open-world-action-rpg-the-bustling-world-announced-for-pc |
| Master Of Pottery – Suzhou Garden（DLC） | 1964100 | PC | AZGames | 苏州园林场景 | 园林题材 | [S] |
| 尼山萨满 | — | iOS | 腾讯 NEXT Studio 孵化 | 剪纸，满族萨满纹样（也归入 Q 组） | 少数派报道 | https://sspai.com/post/45735 |

### I. 中式题材（武侠 / 仙侠 / 市井 / 园林，含国产独立游戏）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Black Myth: Wukong | 2358720 | PC/PS5 | Game Science | 写实扫描，取材山西古建 | TGA24、BAFTA24 提名 | [S] |
| Nine Sols | 1809540 | PC/主机 | RedCandleGames | "道朋克"手绘二维 | IGF25 入围 | [S] |
| Sifu | 2138710 | PC/主机 | Sloclap | 绘画感三维，功夫题材 | 代表作 | [S] |
| Phantom Blade Zero | 4115450 | PC/PS5 | S-GAME | 中式"功夫朋克" | 愿望单 #6 | [WL] |
| WUCHANG: Fallen Feathers | 2277560 | PC/主机 | Leenzee | 明末暗黑写实 | 代表作 | [S] |
| Where Winds Meet | 3564740 | PC/移动 | Everstone Studio | 宋代题材开放世界 | 代表作 | [S] |
| Gujian3（古剑奇谭三） | 994280 | PC | 烛龙 | 古风写实 | 代表作 | [S] |
| Sword and Fairy 7（仙剑七） | 1543030 | PC/主机 | 软星 | 仙侠写实 | 代表作 | [S] |
| 侠客风云传 Tale of Wuxia | 377530 | PC | Heluo Studio | 二维国风立绘 | 代表作 | [S] |
| The Scroll of Taiwu（太吾绘卷） | 838350 | PC | ConchShip | 卷轴式界面，古画元素 | 代表作 | [S] |
| 暖雪 Warm Snow | 1296830 | PC/主机 | BadMudStudio | 暗黑国风手绘 | 代表作 | [S] |
| Amazing Cultivation Simulator | 955900 | PC | GSQ Games | 俯视角修仙经营 | 代表作 | [S] |
| Firework（烟火） | 1288310 | PC/移动 | Shiying Studio | 中式民俗恐怖，二维手绘 | 代表作 | [S] |
| Chinese Parents | 736190 | PC | 墨鱼玩游戏 | 国产生活题材，平涂 | 代表作 | [S] |
| 山河旅探 Murders on the Yangtze River | 1746030 | PC | 待核验 | 晚清题材探案 | 国产代表 | [S] |
| 饿殍：明末千里行 | 2593370 | PC | 待核验 | 明末题材叙事 | 国产代表 | [S] |
| 匠木 | 3731870 | PC | 待核验 | 榫卯木作，工艺题材 | 国产代表 | [S] |
| Moncage（笼中窥梦） | 1195290 | PC/移动 | Optillusion | 方盒透视拼图，写实材质 | 国产代表 | [S] |
| Eastward（风来之国） | 977880 | PC/主机 | Pixpil | 高精度像素（见 K 组） | IGF20 入围 | [S] |

### J. 体素（Voxel）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Teardown | 1167630 | PC/主机 | Tuxedo Labs | 可破坏体素，配光线追踪 | 接口测试用样本 | [S] |
| Minecraft Dungeons | 1672970 | PC/主机 | Mojang / Double Eleven | 方块世界，等距 | 代表作 | [S] |
| FEZ | 224760 | PC/主机 | Polytron | 像素体素，二维/三维翻转 | IGF08 视觉奖获奖 | [S] |
| Cloudpunk | 746850 | PC/主机 | ION LANDS | 霓虹体素城市 | 代表作 | [S] |
| Shadows of Doubt | 986130 | PC | ColePowered | 体素侦探城市，程序生成 | 代表作 | [S] |
| The Touryst | 1796410 | PC/主机 | Shin'en | 高质感体素岛屿 | 代表作 | [S] |
| Trove | 304050 | PC/主机 | gamigo | 体素 MMO | 代表作 | [S] |
| DRAGON QUEST BUILDERS 2 | 1072420 | PC/主机 | Square Enix / Koei Tecmo | 方块配鸟山明角色 | 代表作 | [S] |
| Minecraft | — | 多平台 | Mojang | 体素标杆 | 风格源头 | https://www.minecraft.net/ |

### K. 像素（8/16-bit、hi-bit）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Hyper Light Drifter | 257850 | PC/主机 | Heart Machine | 高对比 hi-bit，品红配青 | IGF17 获奖 | [S] |
| Eastward | 977880 | PC/主机 | Pixpil | 精细像素，配动态光 | IGF20 入围 | [S] |
| Celeste | 504230 | PC/主机 | Maddy Makes Games | 简洁像素，配粒子 | 代表作 | [S] |
| Stardew Valley | 413150 | 多平台 | ConcernedApe | 16-bit 田园 | 代表作 | [S] |
| Dead Cells | 588650 | PC/主机 | Motion Twin | 三维转像素工作流 | IGF18 荣誉提名 | [S] |
| Blasphemous | 774361 | PC/主机 | The Game Kitchen | 西班牙宗教暗黑像素 | 代表作 | [S] |
| Owlboy | 115800 | PC/主机 | D-Pad Studio | hi-bit，大量手绘像素动画 | 代表作 | [S] |
| Katana ZERO | 460950 | PC/主机 | Askiisoft | 霓虹像素，VHS 效果 | IGF20 荣誉提名 | [S] |
| Shovel Knight | 250760 | 多平台 | Yacht Club | 严格遵守 NES 色板 | 代表作 | [S] |
| Terraria | 105600 | 多平台 | Re-Logic | 16-bit 沙盒 | 代表作 | [S] |
| Chained Echoes | 1229240 | PC/主机 | Matthias Linda | SNES 风格 JRPG | 代表作 | [S] |
| Unpacking | 1135690 | PC/主机 | Witch Beam | 等距温馨像素 | 代表作 | [S] |
| Kingdom Two Crowns | 701160 | PC/主机 | Fury Studios | 剪影像素，水面倒影 | IGF16 荣誉提名（初代） | [S] |
| Undertale | 391540 | PC/主机 | tobyfox | 极简复古像素 | 代表作 | [S] |
| Iconoclasts | 393520 | PC/主机 | Joakim Sandberg | 丰富像素动画 | IGF19 荣誉提名 | [S] |
| ANIMAL WELL | 813230 | PC/主机 | Billy Basso | 像素，配体积光和粒子 | 代表作 | [S] |
| Pizza Tower | 2231450 | PC/Switch | Tour De Pizza | 卡通夸张像素动画 | 代表作 | [S] |
| Moonlighter | 606150 | PC/主机 | Digital Sun | 温馨像素 | 代表作 | [S] |
| Cave Story+ | 200900 | PC/Switch | Studio Pixel | 独立像素游戏开山作 | 代表作 | [S] |
| Loco Motive | 1709880 | PC | Robust Games | 像素点击式冒险 | IGF26 入围 | [S] |

### L. HD-2D / 像素 + 三维
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| OCTOPATH TRAVELER | 921570 | PC/主机 | Square Enix / Acquire | 像素角色放在三维场景里，配景深、泛光 | TGA18 提名 | [S] |
| OCTOPATH TRAVELER II | 1971650 | PC/主机 | Square Enix / Acquire | 同上 | 代表作 | [S] |
| TRIANGLE STRATEGY | 1850510 | PC/主机 | Square Enix / Artdink | HD-2D 战棋 | 代表作 | [S] |
| DRAGON QUEST III HD-2D Remake | 2701660 | PC/主机 | Square Enix / Artdink | HD-2D | 代表作 | [S] |
| Eiyuden Chronicle | 1658280 | PC/主机 | Rabbit & Bear | 像素角色，配三维场景 | 代表作 | [S] |
| Wandering Sword | 1876890 | PC/主机 | The Swordman Studio | 武侠题材 HD-2D | 国产代表 | [S] |
| Sea of Stars | 1244090 | PC/主机 | Sabotage | 像素，配动态光照和昼夜 | 代表作 | [S] |
| CrossCode | 368340 | PC/主机 | Radical Fish | 16-bit 风格，三维高度感 | 代表作 | [S] |
| Children of Morta | 330020 | PC/主机 | Dead Mage | 像素，配动态光影 | 代表作 | [S] |
| Songs of Conquest | 867210 | PC | Lavapotion | 2.5D 像素策略 | 代表作 | [S] |

### M. 复古三维（PS1 / N64）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| SIGNALIS | 1262350 | PC/主机 | rose-engine | PS1 低模，配动漫科幻恐怖 | 代表作 | [S] |
| Crow Country | 1996010 | PC/主机 | SFB Games | PS1 生存恐怖，配粉彩 | IGF25 荣誉提名 | [S] |
| DUSK | 519860 | PC/主机 | David Szymanski | 90 年代 FPS 低模 | 代表作 | [S] |
| Paratopic | 897030 | PC | Arbitrary Metric | 低模，VHS 剪辑 | IGF19 荣誉提名 | [S] |
| Iron Lung | 1846170 | PC | David Szymanski | 低分辨率潜艇恐怖 | 代表作 | [S] |
| Pseudoregalia | 2365810 | PC | rittzler | N64 平台跳跃风格 | 代表作 | [S] |
| Mouthwashing | 2475490 | PC | Wrong Organ | 低模，配抖色恐怖 | 代表作 | [S] |
| Lunacid | 1745510 | PC | KIRA | King's Field 风格低模 | 代表作 | [S] |
| ULTRAKILL | 1229490 | PC | Arsi Patala | PS1 风 FPS | 代表作 | [S] |
| Cruelty Squad | 1388770 | PC | Consumer Softproducts | 刻意"丑美学"低模 | 代表作 | [S] |
| Anodyne 2 | 877810 | PC/主机 | Melos Han-Tani 等 | PS1 三维，配二维像素 | 代表作 | [S] |
| Umurangi Generation | 1223500 | PC/主机 | Origame Digital | 低分辨率三维，摄影玩法 | IGF21 大奖及视觉荣誉提名 | [S] |
| Dread Delusion | 1574240 | PC/主机 | Lovely Hellplace | PS1 风 RPG，迷幻配色 | 代表作 | [S] |
| SLUDGE LIFE | 1144770 | PC/主机 | Terri Vellmann | 低模涂鸦 | 2 代获 IGF24 荣誉提名 | [S] |
| Proteus | 219680 (SP) | PC | Ed Key 等 | 低保真像素化三维自然景观 | SP-ASH #3 | [SP-ASH] |

### N. 1-bit / 抖色
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Return of the Obra Dinn | 653530 | PC/主机 | Lucas Pope | 1-bit 抖色三维 | TGA18、BAFTA18 获奖；IGF19 大奖 | [S] |
| Minit | 609490 | PC/主机 | JW, Kitty 等 | 黑白 1-bit | 代表作 | [S] |
| WORLD OF HORROR | 913740 | PC/主机 | panstasz | 1-bit 伊藤润二风格 | 代表作 | [S] |
| Gato Roboto | 916730 | PC/主机 | doinksoft | 1-bit 银河城 | 代表作 | [S] |
| Downwell | 360740 | PC/移动 | Moppin | 三色调色板 | 代表作 | [S] |
| Buckshot Roulette | 2835570 | PC | Mike Klubnika | 抖色，低模恐怖 | 代表作 | [S] |
| Lorelei and the Laser Eyes | 2008920 | PC/主机 | Simogo | 黑白，配红色点缀 | 代表作 | [S] |
| Cryptmaster | 1885110 | PC | Paul Hart 等 | 黑白抖色地牢 | 代表作 | [S] |
| Mars After Midnight | 待核验（Steam 上搜不到） | Playdate | Lucas Pope | Playdate 掌机的 1-bit 画面 | 代表作 | https://play.date/games/mars-after-midnight/ |

### O. 素描 / 线稿 / 排线
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Sable | 757310 | PC/Xbox | Shedworks | 墨比斯式线稿，平涂 | 代表作 | [S] |
| Chicory: A Colorful Tale | 1123450 | PC/主机 | Greg Lobanov 等 | 填色书式线稿，玩家自己上色 | IGF21 荣誉提名 | [S] |
| Hidden Folks | 435400 | PC/移动 | Adriaan de Jongh 等 | 黑白钢笔手绘 | 代表作 | [S] |
| Slay the Princess | 1989270 | PC/主机 | Black Tabby Games | 铅笔纸面手绘（Abby Howard） | GiantBomb 资料页 | [S] https://giantbomb.com/wiki/Games/Slay_the_Princess |
| Mundaun | 720350 | PC/主机 | Hidden Fields | 三维场景全部用手绘铅笔纹理 | 代表作 | [S] |
| KINGDOM of the DEAD | 1547380 | PC | DIRIGO Games | 黑白钢笔排线 FPS | 代表作 | [S] |
| Inked: A Tale of Love | 690120 | PC/主机 | Somnium Games | 圆珠笔线稿 | 代表作 | [S] |
| TOEM | 1307580 | PC/主机 | Something We Made | 黑白手绘感三维 | 代表作 | [S] |
| Genesis Noir | 735290 | PC/主机 | Feral Cat Den | 黑白线稿，黑色爵士 | IGF21 获奖 | [S] |
| Shady Part of Me | 1116580 | PC/主机 | Douze Dixièmes | 纸面素描，配影子 | IGF21 入围 | [S] |
| Hauntii | 2060790 | PC/主机 | Moonloop Games | 手绘线稿风，配发光色 | IGF25 获奖 | [S] |
| RPG Time: The Legend of Wright | 待核验 | PC/主机 | DeskWorks | 笔记本手绘 | IGF23 获奖 | IGF23 |

### P. 版画 / 木刻 / 古典印刷与手抄本
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Pentiment | 1205520 | PC/主机 | Obsidian | 木刻（参考《纽伦堡编年史》），配泥金手抄本 | BAFTA22 提名 | [S] https://www.gamereactor.eu/how-obsidan-brought-the-past-to-life-in-pentiment-1221583/ |
| Inkulinati | 957960 | PC/主机 | Yaza Games | 中世纪手抄本页边插画 | 普林斯顿教育资源收录 | [S] https://middleagesforeducators.princeton.edu/inkulinati-medieval-illumination-game |
| Death of the Reprobate | 1739900 | PC | Joe Richardson | 文艺复兴画作拼贴 | IGF25 荣誉提名 | [S] |
| The Procession to Calvary | 1071130 | PC/主机 | Joe Richardson | 古典油画拼贴，巨蟒剧团式幽默 | 代表作 | [S] |
| Darkest Dungeon | 262060 | PC/主机 | Red Hook | 粗墨线哥特，近似木刻 | IGF16 入围 | [S] |
| Darkest Dungeon II | 1940340 | PC/主机 | Red Hook | 同上，做成三维 | IGF24 入围 | [S] |
| The Banner Saga | 237990 | PC/主机 | Stoic | 中世纪风格平面插画，配手绘动画 | 代表作 | [S] |
| Card Shark | 1371720 | PC/主机 | Nerial | 18 世纪法国绘画风格 | 代表作 | [S] |

### Q. 剪纸 / 纸片 / 拼贴
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Papetura | 593640 | PC | Petums | 真实纸雕实拍 | IGF22 获奖 | [S] |
| Lumino City | 205020 | PC/移动 | State of Play | 纸、卡板、马达手工搭建的实景 | BAFTA14 获奖；IGF15 入围 | [S] |
| Phonopolis | 1206070 | PC | Amanita Design | 硬纸板构成主义 | IGF24 获奖 | [S] |
| Tengami | 299680 | PC/移动 | Nyamyam | 日式立体书 | 代表作 | [S] |
| Paper Beast | 1232570 | PC/VR | Pixel Reef | 纸质生物 | 代表作 | [S] |
| Paper Cut Mansion | 1004370 | PC/主机 | Space Lizard | 铅笔画在纸上再扫描进游戏 | Game Developer 制作深度文章 | [S] https://www.gamedeveloper.com/art/deep-dive-how-paper-cut-mansion-was-made |
| South Park: The Stick of Truth | 213670 | PC/主机 | Obsidian | 剪纸动画 | 代表作 | [S] |
| Don't Starve | 219740 | PC/主机 | Klei | 蒂姆·伯顿式剪纸墨线 | 代表作 | [S] |
| Bug Fables | 1082710 | PC/主机 | Moonsprout | 纸片人 RPG | 代表作 | [S] |
| Tearaway | — | Vita/PS4 | Media Molecule | 纸艺世界 | BAFTA13 获奖 | 见 2.2 |
| Paper Mario 系列 | — | Nintendo | Intelligent Systems | 纸片角色 | 风格标杆 | https://en.wikipedia.org/wiki/Paper_Mario |
| 尼山萨满 | — | iOS | 腾讯 NEXT 孵化 | 剪纸，少数民族纹样 | 见 H 组 | https://sspai.com/post/45735 |

### R. 黏土 / 定格 / 毛毡 / 玩具
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Harold Halibut | 924750 | PC/主机 | Slow Bros. | 手工黏土和布景扫描进游戏 | BAFTA24 提名 | [S] |
| Armikrog | 334120 | PC/主机 | Pencil Test Studios | 黏土定格（Neverhood 原班人马） | Rolling Stone 报道 | [S] https://www.rollingstone.com/culture/culture-news/armikrog-inside-the-modern-claymation-gaming-revival-67003/ |
| Trüberbrook | 757300 | PC/主机 | btf | 实体微缩布景扫描 | 代表作 | [S] |
| The Swapper | 231160 | PC/主机 | Facepalm Games | 黏土模型拍摄制作 | 代表作 | [S] |
| Hylics | 397740 | PC | Mason Lindroth | 超现实黏土 | 代表作 | [S] |
| LEGO Builder's Journey | 1544360 | PC/主机 | Light Brick Studio | 写实积木微缩 | 代表作 | [S] |
| Unravel | 1225560 | PC/主机 | Coldwood | 毛线角色，配写实自然 | BAFTA16 提名 | [S] |
| South of Midnight | 1934570 | PC/Xbox | Compulsion Games | 定格动画式表演 | BAFTA25 提名 | [S] |
| The Neverhood | — | PC（1996） | The Neverhood Inc. | 全黏土定格 | 风格源头 | https://professionalmoron.com/2024/02/04/the-neverhood-1996-adventure-game/ |
| Kirby's Epic Yarn | — | Wii | Good-Feel | 毛线和布料 | 风格标杆 | https://en.wikipedia.org/wiki/Kirby%27s_Epic_Yarn |

### S. 平面极简 / 几何
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Mini Metro | 287980 | PC/移动 | Dinosaur Polo Club | 地铁线路图式极简 | IGF16 入围 | [S] |
| Mini Motorways | 1127500 | PC/移动 | Dinosaur Polo Club | 极简俯视城市 | 代表作 | [S] |
| Monument Valley | 1927720 | PC/移动 | ustwo games | 埃舍尔式不可能几何 | BAFTA14 提名 | [S] |
| Thomas Was Alone | 220780 | PC/主机 | Bithell Games | 纯色矩形 | 代表作 | [S] |
| SUPERHOT | 322500 | PC/主机 | SUPERHOT Team | 白底红敌人 | 代表作 | [S] |
| Rez Infinite | 636450 | PC/VR | Monstars, Resonair | 线框，配联觉 | 代表作 | [S] |
| Thumper | 356400 | PC/VR | Drool | 金属几何，节奏暴力 | 代表作 | [S] |
| Tetris Effect: Connected | 1003590 | PC/VR | Monstars 等 | 粒子联觉 | 代表作 | [S] |
| APE OUT | 447150 | PC/主机 | Gabe Cuzzillo | Saul Bass 风格海报剪影 | 代表作 | [S] |
| Pikuniku | 572890 | PC/主机 | Sectordub 等 | 扁平几何，可爱 | 代表作 | [S] |
| Manifold Garden | 473950 | PC/主机 | William Chyr | 无限几何建筑 | 代表作 | [S] |
| Antichamber | 219890 | PC | Alexander Bruce | 白底配高饱和色块 | 代表作 | [S] |
| Kentucky Route Zero | 231200 | PC/主机 | Cardboard Computer | 舞台式极简平涂 | IGF13 获奖 | [S] |
| Virginia | 374030 | PC/主机 | Variable State | 平直着色低多边形，电影式剪辑 | IGF17 入围 | [S] |
| Florence | 1102130 | PC/移动 | Mountains | 扁平插画叙事 | 代表作 | [S] |
| COCOON | 1497440 | PC/主机 | Geometric Interactive | 有机与机械结合的极简异星 | BAFTA23 提名 | [S] |
| Just Shapes & Beats | 531510 | PC/主机 | Berzerk Studio | 霓虹几何 | IGF19 入围 | [S] |
| Children of the Sun | 1309950 | PC | René Rother | 高饱和平面色块 | IGF25 入围 | [S] |

### T. 霓虹赛博
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Cyberpunk 2077 | 1091500 | PC/主机 | CD Projekt Red | 写实赛博城市 | BAFTA20 提名 | [S] |
| Sayonara Wild Hearts | 1122720 | PC/主机 | Simogo | 霓虹流行 MV | BAFTA19 获奖；TGA19 提名 | [S] |
| RUINER | 464060 | PC/主机 | Reikon Games | 红黑赛博暴力 | 代表作 | [S] |
| The Ascent | 979690 | PC/主机 | Neon Giant | 高密度赛博等距 | 代表作 | [S] |
| Neon White | 1533420 | PC/主机 | Angel Matrix | 白色天堂，配动漫立绘 | 代表作 | [S] |
| Hotline Miami | 219150 | PC/主机 | Dennaton | 80 年代霓虹像素 | 代表作 | [S] |
| Ghostrunner | 1139900 | PC/主机 | One More Level | 霓虹巨构 | 代表作 | [S] |
| VA-11 Hall-A | 447530 | PC/主机 | Sukeban Games | PC-98 风格像素 | 代表作 | [S] |
| Stray | 1332010 | PC/主机 | BlueTwelve | 九龙城寨式霓虹 | TGA22 提名 | [S] |
| Furi | 423230 | PC/主机 | The Game Bakers | 高饱和霓虹（角色由 Takashi Okazaki 设计） | 代表作 | [S] |
| Skate Story | 1263240 | PC/主机 | Sam Eng | 玻璃恶魔，迷幻冥界 | IGF26 入围 | [S] |
| Hypnospace Outlaw | 844590 | PC/主机 | Tendershoot 等 | 90 年代网页和 Y2K 界面 | IGF19 入围 | [S] |

### U. 暗黑 / 哥特 / 恐怖
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Hollow Knight | 367520 | PC/主机 | Team Cherry | 手绘哥特虫国 | IGF18 荣誉提名 | [S] |
| Hollow Knight: Silksong | 1030300 | PC/主机 | Team Cherry | 同上 | TGA25、BAFTA25 提名 | [S] |
| INSIDE | 304430 | PC/主机 | Playdead | 低饱和剪影 | TGA16、BAFTA16 获奖；IGF17 入围 | [S] |
| LIMBO | 48000 | PC/主机 | Playdead | 黑白剪影 | IGF10 获奖 | [S] |
| Little Nightmares | 424840 | PC/主机 | Tarsier | 微缩恐怖玩偶屋 | 代表作 | [S] |
| DREDGE | 1562430 | PC/主机 | Black Salt | 低多边形，克苏鲁海雾 | 代表作 | [S] |
| Darkwood | 274520 | PC/主机 | Acid Wizard | 俯视角黑暗森林 | 代表作 | [S] |
| Scorn | 698670 | PC/Xbox | Ebb Software | 吉格尔、贝克辛斯基式生物机械 | TGA22 提名 | [S] |
| Lies of P | 1627720 | PC/主机 | NEOWIZ | 美好年代哥特 | TGA23 提名 | [S] |
| Inscryption | 1092790 | PC/主机 | Daniel Mullins | 木屋卡牌，媒介混用 | IGF22 大奖及视觉荣誉提名 | [S] |
| ELDEN RING | 1245620 | PC/主机 | FromSoftware | 黑暗奇幻宏大景观 | TGA22 获奖 | [S] |
| Sekiro | 814380 | PC/主机 | FromSoftware | 战国暗黑，水墨界面 | TGA19 提名 | [S] |
| ENDER LILIES | 1369630 | PC/主机 | Live Wire / Adglobe | 阴郁手绘 | 代表作 | [S] |
| SILENT HILL 2 | 2124490 | PC/PS5 | Bloober Team | 雾气写实恐怖 | 代表作 | [S] |
| Cult of the Lamb | 1313140 | PC/主机 | Massive Monster | 可爱外表下的邪教暗黑 | 代表作 | [S] |
| Eclipsium | 2419670 | PC | Housefire | 超现实恐怖（风格待看截图确认） | IGF26 获奖 | [S] |
| Bloodborne | — | PS4 | FromSoftware | 维多利亚哥特 | TGA15 提名 | 见 2.3 |

### V. 写实氛围
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Hellblade: Senua's Sacrifice | 414340 | PC/主机 | Ninja Theory | 写实心理恐怖，摄影测量 | BAFTA17 获奖；TGA17 提名 | [S] |
| Hellblade II | 2461850 | PC/主机 | Ninja Theory | 电影级写实 | BAFTA24 提名 | [S] |
| Red Dead Redemption 2 | 1174180 | PC/主机 | Rockstar | 写实西部光影 | TGA18、BAFTA18 提名；热销 #48 | [TOP] |
| DEATH STRANDING DIRECTOR'S CUT | 1850570 | PC/PS | Kojima Productions | 冰岛式荒原写实 | TGA19、BAFTA19 提名 | [S] |
| Ghost of Tsushima DC | 2215430 | PC/PS | Sucker Punch | 写实，配风和色彩 | TGA20 获奖 | [S] |
| Still Wakes the Deep | 1622910 | PC/主机 | The Chinese Room | 70 年代钻井平台写实恐怖 | BAFTA24 提名 | [S] |
| A Plague Tale: Requiem | 1182900 | PC/主机 | Asobo | 写实中世纪 | BAFTA22 提名 | [S] |
| The Last of Us Part I | 1888930 | PC/PS | Naughty Dog | 写实末日 | 代表作 | [S] |
| The Vanishing of Ethan Carter | 258520 | PC/主机 | The Astronauts | 摄影测量风景 | IGF15 荣誉提名 | [S] |
| Dear Esther: Landmark Edition | 520720 | PC/主机 | The Chinese Room | 氛围式孤岛 | IGF12 获奖；BAFTA12 提名 | [S] |
| What Remains of Edith Finch | 501300 | PC/主机 | Giant Sparrow | 魔幻写实家宅 | 代表作 | [S] |
| The Room | 288160 | PC/移动 | Fireproof | 触感写实机关盒 | BAFTA12 提名 | [S] |
| Unrecord | 2381520 | PC | DRAMA | 执法记录仪视角的超写实 | 愿望单 #14 | [WL] |

### W. 治愈 / cozy
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Spiritfarer | 972660 | PC/主机 | Thunder Lotus | 手绘温情动画 | 代表作 | [S] |
| Slime Rancher 2 | 1657630 | PC/Xbox | Monomi Park | 高饱和可爱三维 | 代表作 | [S] |
| Cozy Grove | 1458100 | PC/主机 | Spry Fox | 手绘纸面，配复色 | 代表作 | [S] |
| Little Kitty, Big City | 1177980 | PC/主机 | Double Dagger | 卡通日式街区 | 代表作 | [S] |
| Wylde Flowers | 1896700 | PC/主机 | Studio Drydock | 柔和卡通三维 | 代表作 | [S] |
| Botany Manor | 1425350 | PC/主机 | Balloon Studios | 柔和英式庄园 | 代表作 | [S] |
| Wanderstop | 1299460 | PC/主机 | Ivy Road | 高饱和茶馆绘本风 | 代表作 | [S] |
| Tiny Bookshop | 2133760 | PC/主机 | neoludic | 海岸小镇绘本风 | 代表作 | [S] |
| Snufkin: Melody of Moominvalley | 1808680 | PC/主机 | Hyper Games | 姆明原作插画风 | 代表作 | [S] |
| Fields of Mistria | 2142790 | PC | NPC Studio | 90 年代动漫风像素 | 代表作 | [S] |
| Ooblets | 593150 | PC/主机 | Glumberland | 粉彩卡通 | 代表作 | [S] |
| Witchbrook | 1846700 | PC | Chucklefish | 像素魔法学院（我的初步判断） | 愿望单 #10 | [WL] |
| Emberville | 2295170 | PC | 待核验 | 待看截图确认 | 愿望单 #48 | [WL] |
| Hela: of Mice & Magic | 3161310 | PC | 待核验 | 小老鼠微缩世界（我的初步判断） | 愿望单 #50 | [WL] |
| Grave Seasons | 3255110 | PC | 待核验 | 像素农场，带恐怖元素（我的初步判断） | 愿望单 #46 | [WL] |
| Animal Crossing: New Horizons | — | Switch | Nintendo | 圆润玩具感 | 风格标杆 | https://animal-crossing.com/new-horizons/ |

### X. 手绘 2D 逐帧
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Cuphead | 268910 | PC/主机 | Studio MDHR | 1930 年代橡皮管动画，手绘赛璐璐 | TGA17 获奖；BAFTA17 提名；IGF18 入围 | [S] |
| Ori and the Blind Forest DE | 387290 | PC/主机 | Moon Studios | 手绘绘画层次，配三维光 | TGA15、BAFTA15 获奖 | [S] |
| Ori and the Will of the Wisps | 1057090 | PC/主机 | Moon Studios | 同上 | TGA20 提名 | [S] |
| Night in the Woods | 481510 | PC/主机 | Infinite Fall | 平面剪影，秋色 | IGF18 大奖及视觉入围 | [S] |
| OXENFREE | 388880 | PC/主机 | Night School | 绘画背景，配小人物 | IGF16 获奖 | [S] |
| Rayman Origins | 207490 | PC/主机 | Ubisoft Montpellier | UbiArt 手绘 | BAFTA11 获奖 | [S] |
| Rayman Legends | 242550 | PC/主机 | Ubisoft Montpellier | 同上 | 代表作 | [S] |
| Skullgirls 2nd Encore | 245170 | PC/主机 | Hidden Variable | 高帧数逐帧动画 | 代表作 | [S] |
| Indivisible | 421170 | PC/主机 | Lab Zero | 手绘动画 RPG | 代表作 | [S] |
| Wandersong | 530320 | PC/主机 | Greg Lobanov | 纸偶平涂 | IGF19 荣誉提名 | [S] |
| Lost in Play | 1328840 | PC/主机 | Happy Juice | 卡通动画片质感 | 代表作 | [S] |
| Machinarium | 40700 | PC/主机 | Amanita | 手绘锈蚀机械 | IGF09 获奖 | [S] |
| CHUCHEL | 711660 | PC/主机 | Amanita | 夸张手绘动画 | IGF18 获奖 | [S] |
| Botanicula | 207690 | PC | Amanita | 微观植物拼贴 | 代表作 | [S] |
| Samorost 3 | 421120 | PC | Amanita | 照片拼贴，配手绘 | 代表作 | [S] |
| Creaks | 956030 | PC/主机 | Amanita | 墨线手绘家宅 | IGF20 荣誉提名 | [S] |
| Gorogoa | 557600 | PC/主机 | Buried Signal（Jason Roberts） | 手绘插画分格拼图 | IGF14 获奖；BAFTA17 提名 | [S] |
| Carto | 1172450 | PC/主机 | Sunhead | 手绘地图拼块 | IGF21 入围 | [S] |
| Dust: An Elysian Tail | 236090 | PC/主机 | Humble Hearts | 手绘动画动作 | 代表作 | [S] |
| Jotun | 323580 | PC/主机 | Thunder Lotus | 手绘北欧巨像 | 代表作 | [S] |
| Sundered | 535480 | PC/主机 | Thunder Lotus | 手绘洛夫克拉夫特风格 | IGF17 荣誉提名 | [S] |
| Bastion / Transistor / Pyre | 107100 / 237930 / 462770 | PC/主机 | Supergiant | 手绘等距插画（Jen Zee） | 代表作 | [S] |
| Thank Goodness You're Here! | 2366980 | PC/主机 | Coal Supper | 英式卡通手绘 | IGF25 入围 | [S] |

### Y. 科幻工业
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Dyson Sphere Program | 1366540 | PC | Youthcat Studio | 星际工厂，干净科幻 | 国产代表 | [S] |
| Satisfactory | 526870 | PC | Coffee Stain | 异星工业巨构 | 代表作 | [S] |
| Factorio | 427520 | PC | Wube | 写实俯视工业像素 | 代表作 | [S] |
| Outer Wilds | 753640 | PC/主机 | Mobius Digital | 手工小太阳系，木质科技 | IGF15 大奖 | [S] |
| Hardspace: Shipbreaker | 1161580 | PC/主机 | Blackbird | 蓝领太空拆船 | 代表作 | [S] |
| Subnautica | 264710 | PC/主机 | Unknown Worlds | 异星海洋发光生物 | IGF19 荣誉提名 | [S] |
| No Man's Sky | 275850 | PC/主机 | Hello Games | 70 年代科幻小说封面配色 | 代表作 | [S] |
| CONTROL | 870780 | PC/主机 | Remedy | 粗野主义建筑，新怪谭 | TGA19 获奖；BAFTA19 提名 | [S] |
| Prey | 480490 | PC/主机 | Arkane | 新装饰艺术太空站 | 代表作 | [S] |
| Dead Space | 1693980 | PC/主机 | Motive | 工业恐怖 | 代表作 | [S] |
| The Talos Principle 2 | 835960 | PC/主机 | Croteam | 巨构建筑，配自然 | 代表作 | [S] |
| Kenshi | 233860 | PC | Lo-Fi Games | 荒凉沙漠科幻 | 代表作 | [S] |
| Lethal Company | 1966720 | PC | Zeekerss | 低保真工业恐怖 | 代表作 | [S] |
| Citizen Sleeper | 1578650 | PC/主机 | Jump Over The Age | 插画式科幻 | 代表作 | [S] |
| In Other Waters | 890720 | PC/主机 | Jump Over The Age | 声呐界面式抽象 | IGF21 入围 | [S] |
| Abiotic Factor | 427410 | PC | Deep Field | 90 年代实验室低多边形 | 代表作 | [S] |
| Rain World | 312520 | PC/主机 | Videocult | 生物机械废墟像素 | IGF18 荣誉提名 | [S] |
| ARC Raiders | 1808500 | PC/主机 | Embark | 70 年代复古未来（我的初步判断） | 热销 #7 | [TOP] |

### Z. 自然开放世界风格化（BotW 一类）
| 名称 | appid | 平台 | 开发者 | 美术特征 | 依据 | 来源 |
|---|---|---|---|---|---|---|
| Zelda: Breath of the Wild | — | Switch/Wii U | Nintendo EPD | 印象派风景，卡通渲染 | TGA17、BAFTA17 提名 | 见 2.2/2.3 |
| Zelda: Tears of the Kingdom | — | Switch | Nintendo EPD | 同上，加天空岛 | TGA23 提名 | 见 2.3 |
| Immortals Fenyx Rising | 2221920 | PC/主机 | Ubisoft | BotW 式卡通神话 | 代表作 | [S] |
| Tchia | 1496590 | PC/主机 | Awaceb | 南太平洋风格化 | 代表作 | [S] |
| Jusant | 1977170 | PC/主机 | Don't Nod | 雕塑感攀岩世界 | 代表作 | [S] |
| Grounded | 962130 | PC/主机 | Obsidian | 后院微缩开放世界 | 代表作 | [S] |
| Palworld | 1623730 | PC/主机 | Pocketpair | 卡通生物，配写实地形 | 代表作 | [S] |
| Valheim | 892970 | PC/主机 | Iron Gate | 低分辨率纹理，配体积光 | 代表作 | [S] |
| BIOMUTANT | 597820 | PC/主机 | Experiment 101 | 高饱和动物开放世界 | 代表作 | [S] |
| Tower of Fantasy | 2064650 | PC/移动 | Hotta Studio | 二次元开放世界 | 代表作 | [S] |
| Enshrouded | 1203620 | PC | Keen Games | 体素地形，配风格化 | 代表作 | [S] |
| Islands of Insight | 2071500 | PC | Lunarch | 浮岛解谜开放世界 | 代表作 | [S] |
| Light No Fire | 2719590 | PC | Hello Games | 程序化奇幻星球 | 愿望单 #2 | [WL] |

**IGF 2026 入围但还没分组：** Blippo+、CARIMARA。两者的 Steam appid 都没验证。另外，Morsels（1719040）也在入围名单里，但风格还要看截图确认，表格里暂时没收录。

---

## 四、Steam 榜单快照

**抓取条件：** 2026-10-13，区域 `cc=us`。工具没有记录具体时刻，所以无法给出精确到小时的时间。

**判断标注：** 下表里"美术"列的判断，只有标了奖项的有证据支持，其余都是我的初步判断，需要看截图复核。

### 4.1 热销榜前 30（`filter=topsellers`，美区）
| # | 名称（appid） | 美术 |
|---|---|---|
| 1 | AION 2 (3393110) | 写实奇幻 MMO |
| 2 | Counter-Strike 2 (730) | — |
| 3 | Hood Warfare 2 (5155360) | 未知 |
| 4 | Planet Zoo 2 (3219030) | 写实 |
| 5 | STAR WARS: Galactic Racer (4078430) | — |
| 6 | Steam Frame (4165890) | **硬件，需过滤** |
| 7 | ARC Raiders (1808500) | ★ 复古未来，值得关注 |
| 8 | Risk of Rain 2 (632360) | ★ 风格化低多边形 |
| 9 | Dota 2 (570) | ★ 手绘风格化 |
| 10 | Risk of Rain 2: Hallowed Concepts (3055670) | **DLC，需过滤** |
| 11 | Gears of War: E-Day (3010850) | 写实 |
| 12 | Marvel Rivals (2767030) | ★ 美漫卡通渲染 |
| 13 | WARDOGS (1867240) | 未知 |
| 14 | MapleStory (216150) | ★ 二维 Q 版 |
| 15 | Aniimo (4126040) | ★ 卡通萌宠 |
| 16 | Hellraiser: Revival (1551980) | 写实恐怖 |
| 17 | Steam Deck (1675200) | **硬件** |
| 18 | VRChat (438100) | UGC 内容 |
| 19 | CoD: Modern Warfare 4 (4435490) | 写实 |
| 20 | Fallout 76 (1151340) | 50 年代复古未来 |
| 21 | Dressmaker (4019220) | 未知 |
| 22 | Warframe (230410) | 科幻生物机械 |
| 23 | Rainbow Six Siege (359550) | 写实 |
| 24 | GTA V Enhanced (3240220) | 写实 |
| 25 | Halo: MCC (976730) | — |
| 26 | The Elder Scrolls Online (306130) | — |
| 27 | Dragon's Dogma 2 (2054970) | 写实奇幻 |
| 28 | Overwatch (2357570) | ★ TGA16 提名 |
| 29 | Steam Controller (4165870) | **硬件** |
| 30 | Apex Legends (1172470) | 半写实风格化 |

前 30 名之外的：#35 Wuthering Waves（★ 二次元）、#36 Castlevania: Belmont's Curse、#39 Destiny 2（★ TGA17 提名）、#48 Red Dead Redemption 2（★ TGA18 和 BAFTA18 提名）、#50 RuneScape: Dragonwilds（风格化）。

`GetWeeklyTopSellers` 周榜的排序不一样：前 10 是 AION 2、Gears E-Day、Ace Combat 8、CS2、Wuthering Waves、WARDOGS、Minecraft Dungeons II、Dressmaker、Aniimo、Marvel Rivals。

### 4.2 热门愿望单前 30（`filter=popularwishlist`，美区，共 5,360 款）
| # | 名称（appid） | 美术 |
|---|---|---|
| 1 | Deadlock (1422450) | ★ 绘画感蒸汽朋克风格化 |
| 2 | Light No Fire (2719590) | ★ 程序化奇幻 |
| 3 | Dear Passengers (4534960) | 未知 |
| 4 | Fable (2769570) | ★ 风格化英式奇幻 |
| 5 | Blight: Survival (1774880) | 写实中世纪 |
| 6 | Phantom Blade Zero (4115450) | ★ 中式功夫朋克 |
| 7 | Total War: WARHAMMER 40,000 (4199910) | — |
| 8 | Resident Evil Veronica (4824610) | 写实 |
| 9 | Kingmakers (2109770) | — |
| 10 | Witchbrook (1846700) | ★ 像素 cozy |
| 11 | ILL (1757350) | 写实恐怖 |
| 12 | ARK 2 (2050420) | — |
| 13 | Soulframe (4095380) | ★ 童话绘画感 |
| 14 | Unrecord (2381520) | ★ 执法记录仪超写实 |
| 15 | METRO 2039 (2590240) | 写实 |
| 16 | over the hill (2929250) | 未知 |
| 17 | The Witcher 3 — Songs of the Past (5006530) | DLC |
| 18 | Persona 4 Revival (2963950) | ★ 动漫 |
| 19 | Dawn of War IV (2272360) | — |
| 20 | Tides of Annihilation (3292470) | 写实（中国团队开发） |
| 21 | The Expanse: Osiris Reborn (3727390) | — |
| 22 | Tomb Raider: Legacy of Atlantis (3558670) | — |
| 23 | Chrono Odyssey (2873440) | — |
| 24 | Warhammer 40,000: Dark Heresy (3710600) | — |
| 25 | State of Decay 3 (1340720) | — |
| 26 | Vindictus: Defying Fate (2814860) | — |
| 27 | NAKWON: LAST PARADISE (2582960) | — |
| 28 | Chronicles: Medieval (2231020) | — |
| 29 | PUBG: Black Budget (4077740) | — |
| 30 | Railborn (2340970) | 未知 |

前 30 名之外值得收录的：
- #38 Showa American Story（复古 B 级片）
- #42 The Bustling World（★ 中式手绘）
- #44 PVKK（复古模拟科幻）
- #46 Grave Seasons
- #48 Emberville
- #49 Clockwork Revolution（蒸汽朋克）
- #50 Hela: of Mice & Magic

**结论：** 热销榜和愿望单榜都以 3A 写实和服务型游戏为主，拿来找"独立游戏美术案例"命中率很低。它们更适合当"热度信号"。找案例应该以奖项名单和 SteamPeek 扩展为主。

---

## 五、SteamPeek 扩展示例

**种子 A Short Hike（1055540）**
- 种子标签：Exploration、Relaxing、Adventure、Indie、Cute、Pixel Graphics、Open World、Casual。
- 第一页 36 条，按 RS 相似度排序，括号里是 appid、SteamPeek 评分、RS：
  1. Little Wings Deliveries（3457390，4.0，1.27）
  2. Letter Dragon（5158310，N/A，1.22）
  3. **Proteus**（219680，6.0，1.17）
  4. **AER Memories of Old**（331870，7.7，1.15）
  5. Broom Broom（3981510）
  6. Camp Lakeview（4332770）
  7. **Alpaca Stacka**（1655140，8.5）
  8. Coastal Postal（3987400）
  9. **Smushi Come Home**（1740300，7.4）
  10. Zitifono（3234820）
  11–18. Nephise Begins、Beyond The Underworld、TreasureTails、A Stranded Spark、Birdy's Island、A Walk With My Dog、Juniper: A Scrapbooking Adventure（3848640）、The Kind Camomille
  19. **Submerged**（301860，6.4）
  20–22. Being a Penguin、Bottle (2016)、**The Plan**（250600，9.3）
  23. **Grow Home**（323320，7.9）
  24–36. Odd Dorable、Unsettled、Healing Animal、Flutter Away、**Haven Park**（1549550，6.5）、b-e-e-t-l-e、A Robot's Tiny Adventure、Skolly's Adventure、Fish & Hike、Find Your Words、Nekour、**Meadow**（486310，7.8）、Cat Crazy

**种子 Townscaper（1291340）**
- 种子标签：Nature、Sandbox、Atmospheric、Relaxing、Experimental、Procedural Generation、Casual、Building。
- 第一页：
  1. **Cloud Gardens**（1372320，7.3，RS 1.21）
  2. Monterona（2427980）
  3. Cloudside Lane（3842880）
  4. **Islands & Trains**（1957760，5.7）
  5. **Tiny Glade**（2198150，9.9）
  6. **Pan'orama**（1730250，6.3）
  7–10. Open Land、Starlit Stories、Pan'orama: Prologue、Howling Woods
  11. **Gourdlets**（2013730，7.1）
  12–21. Cloud Getaway、Campground Owner、Sweetie Candy Maze、Fix This House、High Above、Dream Garden、Isles of Innsmouth、Desktop Town、Small Living World、Please Fix The Road
  22. **ShantyTown**（2434600，5.9）
  23–36. Serene Ponds、Treeplanter、miniopolis、Altstadt、Reefland、Teeny Tiny Town、Wicked Cabins、Among Ripples、Twizzle Puzzle ×2、Quiet as a Stone、Land Above Sea Below、Roomstack、The Birdsong Tree
  - 页面抓取工具提醒：标签和游戏的对应关系是按页面顺序推断的，可能有错位。

**SteamPeek 的特点：** 它主要按标签相似度推荐，会混进大量低分或没有评分的小游戏。真正和美术风格相近的只占约三分之一（上面粗体部分）。建议：
- 用 SteamPeek 评分 ≥7 或 Steam 好评率过滤。
- 再按风格相关标签筛选，比如 Pixel Graphics、Stylized、Hand-drawn、Colorful、Minimalist。

---

## 六、给工具设计的提醒
1. **appid 一定要用官方接口核对。** 我凭记忆写的 appid 有 30 多个是错的。建议在数据流程里固定一步：用 `GetItems` 批量核对名称，查不到的再用 `storesearch` 按名字找。
2. **截图优先用 `GetItems` 拿。** 一次能查很多款，比 appdetails 一款一款查效率高。截图完整地址的前缀需要再验证一次。appdetails 适合拿 `path_full` 这种 1920x1080 原图。
3. **两个榜单都要过滤。** 按 `type` 字段去掉硬件和 DLC。
4. **奖项是最可靠的"美术证据"层。** IGF 视觉艺术奖、BAFTA 艺术成就奖、TGA 美术指导三个榜单合计约 300 个独立作品条目。
5. **TGA 维基页面别直接机器解析。** "叙事"和"美术"两个奖项的列表挨在一起，自动解析容易把两个奖项的名单弄混。
6. **中国传统绘画和非 Steam 作品不能靠 Steam 数据发现。** 绘真·妙笔千山、江南百景图、尼山萨满、Messenger、Link's Awakening、Tearaway 等，需要单独做人工条目，附上外部来源链接。
