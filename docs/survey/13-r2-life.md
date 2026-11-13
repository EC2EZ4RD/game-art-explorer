# R2③ 参考卡 · 养成 / 解谜 / 叙事 + 恐怖 / 生存 / 沙盒（2026-10-14）

> 卡片数据：`src/content/uiRefs.json`（batch = life），由 `scripts/refs/r2-cards.py life` 换算校验；看图笔记 `qa/refs-cache/r2/life/notes.txt`，对照图 `sheet-01..19.jpg`；统计 `scripts/refs/r2-report.py life`。参考库累计 327 张卡。

## 规模

- 113 款（114 款里 1 款 GameUI 手游没取到图）：R1 名单里这 6 个品类各按证据档（A→E）与好评数取前 16（96 款）+ Interface In Game 浏览过的同类 4 款（动物森友会、饥荒、无人深空、Florence，用手挑原图）+ GameUI 恋爱养成 / 消除 / 桌游棋牌手游 13 款。
- 424 个参数取值，用到 34 / 260 个参数；**换算缺口 0**。
- 品类：解谜 26、养成 20、生存 18、叙事 17、恐怖 16、沙盒 16。

## 这一批的 UI 规律（喂给 M9 界面模板与叙事 / 恐怖布局）

1. **"零 HUD"是这批的主流**：皮肤家族"极简单色"51 款（45%），信息密度极简 59 款；HUD 全隐 18、情境显现 7、常驻 1。解谜（Gorogoa、Machinarium、Monument Valley、The Room、Papetura、Lumino City）与叙事（Firewatch 式步行、Venba、Behind the Frame、Florence）几乎都没有 HUD——**界面就是画面本身**。
2. **叙事内 UI 最集中的一批**：叙事内 18、空间内 6。恐怖游戏是教科书：Dead Space 脊柱灯带血条 + 枪上弹药，Callisto Protocol 后颈环灯，Scorn 生物机械枪，RE2 背包里的心电图，Subnautica / Hardspace 面罩内读数，Among Us 投票会议在平板上，Hypnospace Outlaw 整个游戏是 1999 年的操作系统。
3. **"整部作品就是一本书 / 一张纸"**：Potion Craft（中世纪手抄本，右侧原料竖栏）、Pentiment（每个角色用不同字体说话，书页即地图）、Chants of Sennaar（手绘笔记由玩家填写词义）、Obra Dinn（1 位色画面 + 19 世纪海报衬线）、Lil Gator Game（贴满贴纸的练习本背包）、Stilstand（铅笔素描漫画分格）。→ 对应 `rel.harmony = 同一媒介` 9 款、ast.frameMat 米白纸 / 羊皮纸 7 款。
4. **对话框**：带尾气泡 12（OXENFREE 的选项气泡挂在角色头上、边走边说不暂停）、底部通栏 5、聊天软件式 3（Disco Elysium 右侧整栏滚动文本像读小说；Among Us 会议聊天）、无框字幕 2。
5. **血条位置不集中**（左上 / 左下 / 右上 / 右下各 2–3），形态以心形图标列、圆环为多——这批游戏里"血量"本来就不是核心信息。
6. **种田 / 养成模板**：Stardew Valley / Fields of Mistria = 右上季节 + 日期 + 时间圆章、下中快捷栏、底部通栏对话 + 半身立绘；Potionomics / Chinese Parents = 左列功能 + 大量数值的"日程表"界面（极密）；Cozy Grove = 左侧竖排手绘图标工具栏。
7. **标题字体**：手写 5（OMORI、Chicory、TOEM、Stilstand、Lil Gator Game）最多——这一类偏"个人日记 / 手作"质感。
8. **手游（GameUI 13 款，竖屏 15 张卡）**：三消 / 弹射对战的上半角色、下半棋盘；恋爱养成（光与夜之恋、恋与深空）白卡细线 + 3D 捏脸缩略图横排 + 滑条；运营弹窗是羊皮纸藏宝图 / 首充海报。

## 取材的局限

- 3A 恐怖（生化危机村庄 / 2、最后生还者、Callisto、Hellblade II、Alan Wake）与沙盒（Teardown、Palworld、Goat Simulator 3 等）的商店图大多没有 UI，约 30 款按已知 HUD 记，置信度低。
- GameUI 手游前几张仍有不少开场 / 闪屏；竖屏格子在对照图里过小。
