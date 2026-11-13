# R2① 参考卡 · 策略 / 建造 / 工厂（2026-10-14）

> 卡片数据：`src/content/uiRefs.json`（batch = strategy），每张卡是一组 UI 参数取值（`docs/survey/data/ui-param-system.json` 的词表），由 `scripts/refs/r2-cards.py` 换算校验；看图笔记 `qa/refs-cache/r2/strategy/notes.txt`，对照图 `sheet-01..20.jpg`；统计 `scripts/refs/r2-report.py strategy`。

## 规模

- 119 款（121 款里 2 款没有截图）：R1 名单的策略 / 建造 / 工厂 94 款 + Interface In Game 浏览过的同类 + GameUI 社区热门策略 / 模拟经营 / 塔防 / 即时战略手游 20 款。
- 864 个参数取值，用到 86 / 260 个参数；**换算缺口 0**（建卡中补了 1 个取值：队伍画法"肖像行"，Kenshi、传奇生物）。
- 局内 HUD 99 款；地图 15、对话 10、角色 9、技能树 8、读取 8、运营 7、登录 7、建造 6、结算 5、商店 5……

## 这个品类的 UI 规律（喂给 M7 品类布局 ①）

1. **HUD 组织**：分散组件 24、贴边整条 16（经典城建、RTS、塔防的右侧商店）、画在玩法区外的边框里 6（Sol Cesto、ShapeHero Factory、dotAGE：整屏木框 / 雕花框）、整合底座 3（模拟人生、Evil Genius、Total War）。
2. **建造栏**几乎都在**底部中间**（11），图标按钮排为主（13）；塔防例外：右侧竖排商店（Bloons、Kingdom Rush 系、Rusted Warfare）。
3. **资源**在左上（6）或顶部中间；**小地图**右上或左下；**选中信息面板**左下或右侧。
4. **"世界即 UI"是这个品类的一大流派**：极简单色 17 款，Kingdom、Mini Metro / Motorways、Dorfromantik、Townscaper、ISLANDERS、Thronefall、Bad North 几乎没有 HUD，信息密度"极简"16 款，和"极密"10 款（Kenshi、Songs of Syx、Cookie Clicker、Total War）形成两极。→ 信息密度是这个品类最重要的旋钮之一。
5. **面板明度**：深色 37 vs 浅色 10。**外框材质**：木最多（13：塔防、像素种田、Kingdom Rush），其次石、金、金属。
6. **地图画风**：手绘水彩 6、羊皮纸古海图 6（Civ、Total War、Kenshi、Shogun Showdown）、战术线框 / 全息 3、漂浮微缩岛 3。
7. **技能 / 科技树**：树状连线 7，连线有电路走线（Nodebuster、Infinitode、Widget Inc.）、直线、虚线（路线图）、曲线四种。
8. **战术游戏的"敌人意图"**：Into the Breach、Slice & Dice、Shogun Showdown、Beltmatic 都把敌人下一步画在格子或头顶（意图图标 + 数字）——这是该品类区别于动作游戏的关键元素。
9. **叙事内容器**：电脑 / 终端 4（Do Not Feed the Monkeys、Progressbar95、A=B、Farmer Was Replaced）、书 3（Inkulinati 整局在摊开的古书上）、卷轴 3（鬼谷八荒、了不起的修仙模拟器）。
10. **国风策略**（鬼谷八荒、弈仙牌、Wandering Sword、了不起的修仙模拟器）共同点：宣纸 / 卷轴内芯、竖排书法标题、竖排侧牌、墨晕特效。

## 取材的局限（下一批改进）

- **Steam 商店截图偏宣传**：Cities: Skylines、Planet Coaster、Two Point Museum、Orcs Must Die!、SPORE、Autonauts 等的商店图几乎全是纯场景，UI 信息少；这些款的 HUD 编码置信度低（卡上写了"截图多为纯画面"）。Interface In Game 有它们的完整界面，下一批遇到这类优先用 IIG 手挑原图补。
- **GameUI 手游前几张是闪屏、开场漫画、登录**：明日方舟、哈利波特、猫咪公寓 2、重返帝国、剑与远征启程等只拿到开场，局内 UI 没看到。下一批手游改为按功能标签取（战斗界面 / 主界面 / 背包 / 商城各 1–2 张）。
- 竖屏手游在对照图里格子太小，细节看不清；下一批竖屏单独拼图（竖格）。
