<!-- 来源：调色板调研（2026-10-13 调研子代理撰写，未经人工校对）。机器可读数据见 docs/survey/data/palettes.json，本文表格由该 JSON 自动生成，两者一致。 -->

# 权威调色板（Palettes）

这份文档给风格探索台提供一批"能直接用"的调色板：每个颜色都有确切 hex，并注明数据来源。共 **58 套调色板、889 个色样（swatch）**，在 JSON 里分成 10 个 group（下表把最后两组合在一行）：

| 组 | 套数 | 说明 |
|---|---|---|
| 中国传统色 | 12 | 从 zhongguose.com 的 526 个原始色里挑出 **90 个不重复色名**，编成 12 套游戏用主题色组，每套给出角色映射（roles） |
| 日本传统色 | 3 | NIPPON COLORS（nipponcolors.com），33 色 |
| 复古主机/电脑 | 7 | NES、C64、ZX Spectrum、Apple II、MSX、Amstrad CPC、Macintosh II |
| IBM PC | 7 | CGA 16 色、CGA 模式 4/5 的 5 种四色组、EGA 64 色 |
| 幻想主机 | 2 | PICO-8，以及 PICO-8 扩展 32 色 |
| 现代像素调色板 | 6 | Sweetie 16、Endesga 16/32/64、AAP-64、Resurrect 64 |
| Game Boy 4 色 | 9 | DMG（bgb）、Arne、Super Game Boy、Kirokaze、Demichrome 等 |
| 1-bit 双色 | 7 | 《奥伯拉丁的回归》（Return of the Obra Dinn）5 种显示器配色、1bit Monitor Glow、Bitbee |
| 艺术运动 / 印刷 | 3 + 2 | Bauhaus、De Stijl（近似）、Memphis（近似）；Riso 油墨全表 78 色、Riso 常用套色 |

## 1. 数据来源与可信度

| 数据 | 来源 | 获取方式 | 可信度与注意 |
|---|---|---|---|
| 中国传统色 | **中国色 zhongguose.com**（作者 Perchouli，运营方贵州算例科技）的公开接口 `GET https://zhongguose.com/api/colors` [1] | 2026-10-13 抓取，共 751 条。只用 `user_id` 为空的 **526 个原始色**，排除 225 个"共创颜色"（用户提交的） | 站点只说"收录 500 余种中国传统颜色"，**没有注明出处**。网上常说这批色来自某部 20 世纪中期的色谱出版物，我没能核实，记为**未核实**。数据内部还有矛盾：8 个颜色的 RGB 字段和 hex 字段对不上（杏仁黄、杏黄、淡灰绿、米色、金黄、玫瑰灰、月季红差得多；藤黄只差 1，保留了），"海参灰"的 hex 是 `#fffefa`，和名字明显不符。这 8 个可疑色**都没有收进**任何色组 |
| 中国传统色（备选） | nevertoday/zhongguo-traditional-colors [2]：742 色主列表 `docs/chinese-color-master-list.md` | 只查看，未采用 | 前 526 色的顺序和色值看上去与 zhongguose 相同，后面多出 216 色，同样没有逐色出处。仓库的 GitHub API 许可字段是 GPL-3.0，README 却写 MIT，**许可证说法不一致**，二次分发前要确认 |
| 中国传统色（备选） | 《中国传统色：故宫里的色彩美学》（郭浩、李健明，中信出版社 2020）的 384 色。OmicVerse 的 `_forbidden.py` 有转录 [3] | 只查看，未采用 | 转录值的 RGB 通道几乎全是 4 的倍数（例如人籁 `(156,188,28)`），像是从扫描图上取样再量化的，**不等于原书印刷值**，所以没用。想用"故宫色名"，建议拿原书 CMYK 重新换算 |
| 中国传统色（备选） | cht-colors（aj_oo，2010 年前后，reorx 重建）[4] | 只查看 | 常见的"中国传统色彩"表（粉红、妃色、品红……），出处同样不明，可以作为第二套命名体系 |
| 日本传统色 | NIPPON COLORS（Ono Takehiko，2010）[5] | 通过站点接口 `/php/io.php?color=<ROMAJI>` 逐色读取 | 站点注明色值引自《日本の伝統色 The Traditional Colors of Japan》（PIE BOOKS, 2007）[5]，是这几类里**出处最清楚**的 |
| 复古与像素调色板 | **Lospec Palette List** [6]，每套的 `.json`/`.hex` 文件 | 2026-10-13 下载 | 现代调色板（Endesga、AAP、Resurrect、Sweetie）是作者发布的原始值，可信。硬件调色板（NES、C64、Apple II、CGA）**本来就没有唯一的"官方 RGB"**：NES 和 Apple II 靠 NTSC 信号生成颜色，C64 有 Pepto 等多种测量版，这里只是 Lospec 收录的一种版本 |
| Obra Dinn 1-bit | Lospec 社区转录 [6] | 下载 | 游戏里确实可以切换几种"老显示器"配色，但这些 hex **没有和游戏文件核对**，记为**未核实** |
| Riso 油墨 | stencil.wiki/colors 的汇总，经 mattdesl/riso-colors 转存（2019-02-25 快照）[7] | 下载 JSON | 理想科学（RISO）官方只给油墨名和对应的 Pantone，hex 是社区按 Pantone 换算的屏幕近似值。原数据把 "Federal Blue" 写成了 "RisoFederal Blue"，这里已更正 |
| Bauhaus | Lospec "Bauhaus"（作者 Braquen）[6] | 下载 | 包豪斯本身**没有官方色板**，这是一位像素画家的诠释版 |
| De Stijl / Memphis | **没有可引用的权威 hex** | 本文按常见用法整理 | 全部记为**近似值（未核实）**，只用来做风格方向演示 |

> 用法提醒：传统色的"名字"是文化资产，"色值"只是某一来源的近似。工具里最好同时显示**色名、来源 id 和 hex**，不要把某个 hex 说成"唯一正确的朱红"。

## 2. 怎么用：角色映射（roles）与工具接入

每套**中国、日本色组**都给了 `roles` 字段，把颜色对应到场景里的角色。基本角色有 8 个：`paper` 纸/底、`sky` 天空、`ground` 地面、`foliage` 植被、`structure` 木构/墙体、`roof` 屋顶、`accent` 点缀、`ink` 墨线/最暗色。有些色组还加了扩展角色，比如 `water` 水、`rock` 山石、`wall` 墙、`base` 台基、`gold` 金、`glow` 光晕、`light` 光源、`foliageDark` 暗部植被。工具可以这样用：

1. **一键换肤**：场景材质按角色引用颜色，不直接写死 hex。切换色组时，按 `roles` 重新绑定材质颜色。缺少的角色退回到 `paper`、`ink` 或最接近的色相。
2. **调色板量化（palette quantization）后处理**：把最终画面的每个像素映射到最近的色样（最好在 OKLab 空间算距离），可以选择叠加有序抖动（Bayer dithering）。复古、像素、1-bit 调色板适合整屏量化；中国色组更适合只做"色调映射 + 局部量化"，否则晕染层次会断。
3. **Riso 叠印模拟**：每种油墨当成一个通道，用正片叠底（multiply）叠到纸色上，再加少量套版偏移（misregistration，1–3 px）和颗粒噪声。
4. **墨分五色**：`cn-shuimo` 的 6 级灰可以直接当成 toon ramp（色阶贴图）的 6 个台阶（参见 `04-chinese-architecture-painting.md` 第 2 节）。
5. **对比度自检**：UI 文字和背景的配对要过 WCAG 对比度检查。传统色里中间调很多，最容易"发灰看不清"。

## 3. 选色说明（中国传统色）

- 12 套色组都是**本文按画种、窑口或地域主观编配**的，表中"建议角色"也是设计建议，不是史料结论。每套的"说明"写了取舍理由。
- zhongguose 的名字与真实颜料并不总对应：例如"胭脂红"是 `#f03f24`，偏橙，和传统"胭脂"（偏紫的深红）不符，所以工笔花鸟组改用"枫叶红"。zhongguose 里也没有直接叫"墨"的色名，水墨组用一组暖灰到近黑的颜色来近似。
- 石青、石绿、朱砂、赭石这些**矿物、植物颜料**，实际观感取决于颗粒、胶、底材，以及几百年的老化。屏幕 hex 只能近似。要做"像画"的效果，靠的是颗粒和晕染贴图，不是更准的 hex。

## 4. 调色板明细

下面的表格由 `docs/survey/data/palettes.json` 自动生成。中国、日本、艺术运动、Riso 常用套色列出完整表格；复古和像素调色板只列 hex 序列，序号就是 JSON 里的顺序。

### 4.1 中国传统色（12 套）

#### 青绿山水（Blue-green landscape，参照《千里江山图》）  `cn-qinglv-shanshui`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：石青/石绿为矿物色，色相取自 zhongguose 同名或近似名色；画作实际绢色因老化偏褐，paper 取鹿角棕。色名与画面元素的对应为本文主观建议。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 鹿角棕 | `#e3bd8d` | 纸/底(paper) |
| 莲子白 | `#e5d3aa` | 天空(sky) |
| 淡赭 | `#be7e4a` | 地面(ground) |
| 赭石 | `#862617` | 山石(rock) |
| 铜绿 | `#2bae85` | 植被(foliage) |
| 石绿 | `#57c3c2` |  |
| 群青 | `#1772b4` | 山顶(peak) |
| 花青 | `#2376b7` | 水(water) |
| 苍黄 | `#806332` | 结构/木构(structure) |
| 鹤灰 | `#4a4035` | 屋顶(roof) |
| 朱红 | `#ed5126` | 点缀(accent) |
| 暗蓝 | `#101f30` | 墨线/最暗(ink) |

#### 水墨·墨分五色（Ink wash, five tones of ink）  `cn-shuimo`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：浅灰→莽丛绿按明度递减近似“清、淡、重、浓、焦”；zhongguose 无“墨”色名，焦墨取近黑的莽丛绿；高粱红作印泥（朱文/白文印）点缀。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 鱼肚白 | `#f7f4ed` | 纸/底(paper)、天空(sky) |
| 浅灰 | `#dad4cb` |  |
| 铅灰 | `#bbb5ac` | 地面(ground) |
| 中灰 | `#a49c93` |  |
| 瓦灰 | `#867e76` | 植被(foliage) |
| 淡松烟 | `#4d4030` | 结构/木构(structure) |
| 长石灰 | `#363433` | 屋顶(roof) |
| 莽丛绿 | `#141e1b` | 墨线/最暗(ink) |
| 高粱红 | `#c02c38` | 点缀(accent) |

#### 故宫红墙金瓦（Forbidden City: red walls, golden glazed tiles）  `cn-gugong`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：红墙（铁红/氧化铁红）+黄琉璃瓦+汉白玉台基+青绿彩画为北方官式皇家建筑典型配色；色值为传统色库近似，非故宫实测。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 鹅血石红 | `#ab372f` | 墙(wall) |
| 枣红 | `#7c1823` | 阴影(shadow) |
| 朱红 | `#ed5126` | 结构/木构(structure) |
| 琥珀黄 | `#feba07` | 屋顶(roof) |
| 土黄 | `#d6a01d` | 屋顶背光(roofShadow) |
| 汉白玉 | `#f8f4ed` | 台基(base)、纸/底(paper) |
| 瓦灰 | `#867e76` | 地面(ground) |
| 青灰 | `#2b333e` | 墨线/最暗(ink) |
| 景泰蓝 | `#2775b6` | 点缀(accent) |
| 宫殿绿 | `#20894d` | 饰线(trim) |
| 苍绿 | `#223e36` | 植被(foliage) |
| 远天蓝 | `#d0dfe6` | 天空(sky) |

#### 宋瓷（Song ceramics：汝、官、哥、钧、定、龙泉、建）  `cn-songci`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：对应关系（本文建议）：汝窑天青≈玉簪绿/月白，龙泉梅子青≈粉绿/青矾绿，哥窑米黄≈莲子白、金丝铁线≈鹤灰，钧窑玫瑰紫，定窑象牙白，建盏≈酱棕/古铜褐。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 月白 | `#eef7f2` | 天空(sky) |
| 玉簪绿 | `#a4cab6` |  |
| 虾壳青 | `#869d9d` | 屋顶(roof) |
| 粉绿 | `#83cbac` | 植被(foliage) |
| 青矾绿 | `#2c9678` |  |
| 莲子白 | `#e5d3aa` | 地面(ground) |
| 象牙白 | `#fffef8` | 纸/底(paper) |
| 鹤灰 | `#4a4035` | 墨线/最暗(ink) |
| 玫瑰紫 | `#ba2f7b` | 点缀(accent) |
| 酱棕 | `#5a1f1b` |  |
| 古铜褐 | `#5c3719` | 结构/木构(structure) |

#### 江南水乡·粉墙黛瓦（Jiangnan water town: white walls, dark tiles）  `cn-jiangnan`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：粉墙取略带暖灰的珍珠灰（纯白在实时光照下易过曝）；黛瓦取青灰/战舰灰两级。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 珍珠灰 | `#e4dfd7` | 纸/底(paper)、墙(wall) |
| 云峰白 | `#d8e3e7` | 天空(sky) |
| 青灰 | `#2b333e` | 屋顶(roof) |
| 战舰灰 | `#495c69` | 屋顶受光(roofLight) |
| 星灰 | `#b2bbbe` | 地面(ground) |
| 晚波蓝 | `#648e93` | 水(water) |
| 浪花绿 | `#92b3a5` |  |
| 芽绿 | `#96c24e` | 植被(foliage) |
| 苍绿 | `#223e36` | 暗部植被(foliageDark) |
| 栗棕 | `#5c1e19` | 结构/木构(structure) |
| 大红 | `#f04b22` | 点缀(accent) |
| 鸽蓝 | `#1c2938` | 墨线/最暗(ink) |

#### 敦煌壁画（Dunhuang murals）  `cn-dunhuang`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：壁画常用土红、石青、石绿、朱砂、白粉与金；部分铅丹/铅白颜料已氧化变黑褐，故以猪肝紫作“变色线”。色值为传统色库近似，非壁画测色。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 荔肉白 | `#f2e6ce` | 纸/底(paper) |
| 浅驼色 | `#e2c17c` | 地面(ground) |
| 淡赭 | `#be7e4a` |  |
| 赭石 | `#862617` | 结构/木构(structure) |
| 火泥棕 | `#aa6a4c` |  |
| 石绿 | `#57c3c2` | 屋顶(roof) |
| 铜绿 | `#2bae85` | 植被(foliage) |
| 群青 | `#1772b4` | 天空(sky) |
| 朱红 | `#ed5126` | 点缀(accent) |
| 姜黄 | `#e2c027` | 金(gold) |
| 苍黄 | `#806332` |  |
| 猪肝紫 | `#541e24` | 墨线/最暗(ink) |

#### 木版年画（Woodblock New Year prints：杨柳青/桃花坞）  `cn-nianhua`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：高饱和套色+墨线版；适合节庆 UI、Q 版场景。实际年画各产地色谱不同，此组为风格化概括。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 酪黄 | `#f6dead` | 纸/底(paper)、天空(sky) |
| 大红 | `#f04b22` | 结构/木构(structure) |
| 品红 | `#ef3473` | 点缀(accent) |
| 桃红 | `#f0ada0` |  |
| 柠檬黄 | `#fcd337` | 地面(ground) |
| 橘橙 | `#f97d1c` |  |
| 翠绿 | `#20a162` | 植被(foliage) |
| 靛青 | `#1661ab` | 屋顶(roof) |
| 玫瑰紫 | `#ba2f7b` |  |
| 莽丛绿 | `#141e1b` | 墨线/最暗(ink) |

#### 浅绛山水（Light ochre-crimson landscape：元四家/黄公望式）  `cn-qianjiang`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：以墨为骨、淡赭石+少量花青罩染；晴山蓝/淡蓝灰近似淡花青。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 莲子白 | `#e5d3aa` | 纸/底(paper) |
| 荔肉白 | `#f2e6ce` | 天空(sky) |
| 鹿角棕 | `#e3bd8d` | 山石(rock) |
| 淡赭 | `#be7e4a` | 地面(ground) |
| 赭石 | `#862617` | 结构/木构(structure) |
| 晴山蓝 | `#8fb2c9` |  |
| 淡蓝灰 | `#5e7987` | 植被(foliage) |
| 明灰 | `#8a988e` | 亮部植被(foliageLight) |
| 淡松烟 | `#4d4030` |  |
| 鹤灰 | `#4a4035` | 屋顶(roof) |
| 莽丛绿 | `#141e1b` | 墨线/最暗(ink) |
| 高粱红 | `#c02c38` | 点缀(accent) |

#### 闽南红砖·岭南（Minnan red brick & Lingnan）  `cn-minnan-lingnan`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：红砖墙+花岗岩白石+燕尾脊剪瓷（蓝绿黄）+潮州金漆木雕；榕树深绿。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 火砖红 | `#cd6227` | 结构/木构(structure) |
| 绀红 | `#a6522c` | 屋顶(roof) |
| 珍珠灰 | `#e4dfd7` | 纸/底(paper) |
| 铅灰 | `#bbb5ac` | 地面(ground) |
| 翠蓝 | `#1e9eb3` | 点缀(accent) |
| 蛙绿 | `#45b787` | 点缀2(accent2) |
| 柠檬黄 | `#fcd337` |  |
| 金叶黄 | `#ffa60f` | 金(gold) |
| 荷叶绿 | `#1a6840` | 植被(foliage) |
| 酱棕 | `#5a1f1b` | 墨线/最暗(ink) |
| 远天蓝 | `#d0dfe6` | 天空(sky) |

#### 徽派·烟雨（Huizhou in misty rain）  `cn-huizhou`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：马头墙白墙+黛瓦+木雕；油菜花黄为婺源春景点缀；墙面水渍（嫩灰）是“旧”感关键。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 鱼肚白 | `#f7f4ed` | 纸/底(paper)、墙(wall) |
| 银鱼白 | `#cdd1d3` | 墙背光(wallShade) |
| 牛角灰 | `#2d2e36` | 屋顶(roof)、墨线/最暗(ink) |
| 嫩灰 | `#74787a` | 水渍(stain) |
| 星灰 | `#b2bbbe` | 地面(ground) |
| 古铜褐 | `#5c3719` | 结构/木构(structure) |
| 油菜花黄 | `#fbda41` | 点缀(accent) |
| 松霜绿 | `#83a78d` | 远景植被(foliageFar) |
| 苍绿 | `#223e36` | 植被(foliage) |
| 云峰白 | `#d8e3e7` | 天空(sky) |
| 晚波蓝 | `#648e93` | 水(water) |

#### 宫廷工笔花鸟（Song court gongbi flower-and-bird）  `cn-gongbi-huaniao`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：绢底+蛤粉（象牙白）+分染花瓣；枫叶红近似胭脂（zhongguose 的“胭脂红”偏橙，未采用）。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 淡肉色 | `#f8e0b0` | 纸/底(paper)、地面(ground) |
| 象牙白 | `#fffef8` | 天空(sky) |
| 牡丹粉红 | `#eea2a4` | 点缀(accent) |
| 芍药耕红 | `#eba0b3` |  |
| 枫叶红 | `#c21f30` | 点缀2(accent2) |
| 藤黄 | `#ffd111` |  |
| 草原远绿 | `#9abeaf` | 亮部植被(foliageLight) |
| 亚丁绿 | `#428675` | 植被(foliage) |
| 花青 | `#2376b7` | 屋顶(roof) |
| 鹤灰 | `#4a4035` | 结构/木构(structure)、墨线/最暗(ink) |

#### 上元灯夜（Lantern Festival night）  `cn-shangyuan-night`
来源：中国色 zhongguose.com 公开接口 https://zhongguose.com/api/colors（原始 526 色，排除用户共创色；取 hex 字段）  
说明：冷暗底+暖灯笼；适合测试 Bloom 与发光材质的可读性。

| 色名 | HEX | 建议角色 |
|---|---|---|
| 暗蓝 | `#101f30` | 天空(sky)、墨线/最暗(ink) |
| 晶石紫 | `#1f2040` | 高空(skyHigh) |
| 钢青 | `#142334` | 地面(ground) |
| 鸽蓝 | `#1c2938` | 屋顶(roof) |
| 海报灰 | `#483332` | 结构/木构(structure) |
| 栗紫 | `#5a191b` | 暖阴影(shadowWarm) |
| 枫叶红 | `#c21f30` | 点缀暗部(accentShadow) |
| 朱红 | `#ed5126` | 点缀(accent) |
| 蜜黄 | `#fbb957` | 光晕(glow) |
| 金盏黄 | `#fcc307` | 光源(light) |
| 乳白 | `#f9f4dc` | 纸/底(paper) |

### 4.2 日本传统色 NIPPON COLORS（3 套）

#### 春·桜（Spring sakura）  `jp-haru-sakura`
来源：NIPPON COLORS https://nipponcolors.com/ （站点注明色值引自《日本の伝統色 The Traditional Colors of Japan》PIE BOOKS 2007；经 /php/io.php 接口逐色读取）

| 色名 | HEX | 建议角色 |
|---|---|---|
| 白練 SHIRONERI | `#fcfaf2` | 纸/底(paper) |
| 桜 SAKURA | `#fedfe1` | 花(blossom) |
| 撫子 NADESHIKO | `#dc9fb4` |  |
| 鴇 TOKI | `#eea9a9` |  |
| 紅梅 KOHBAI | `#e16b8c` | 点缀(accent) |
| 鶸 HIWA | `#bec23f` | 地面(ground) |
| 萌黄 MOEGI | `#7ba23f` | 植被(foliage) |
| 若竹 WAKATAKE | `#5dac81` | 暗部植被(foliageDark) |
| 空 SORA | `#58b2dc` | 天空(sky) |
| 墨 SUMI | `#1c1c1c` | 墨线/最暗(ink) |

#### 藍と墨（Indigo & sumi, wabi）  `jp-ai-sumi`
来源：NIPPON COLORS https://nipponcolors.com/ （站点注明色值引自《日本の伝統色 The Traditional Colors of Japan》PIE BOOKS 2007；经 /php/io.php 接口逐色读取）

| 色名 | HEX | 建议角色 |
|---|---|---|
| 鳥の子 TORINOKO | `#dac9a6` | 纸/底(paper) |
| 白鼠 SHIRONEZUMI | `#bdc0ba` | 地面(ground) |
| 瓶覗 KAMENOZOKI | `#a5dee4` | 天空(sky) |
| 白群 BYAKUGUN | `#78c2c4` |  |
| 浅葱 ASAGI | `#33a6b8` | 点缀(accent) |
| 縹 HANADA | `#006284` | 水(water) |
| 藍 AI | `#0d5661` |  |
| 紺 KON | `#0f2540` | 屋顶(roof) |
| 利休鼠 RIKYUNEZUMI | `#707c74` | 植被(foliage) |
| 鈍 NIBI | `#656765` | 结构/木构(structure) |
| 墨 SUMI | `#1c1c1c` | 墨线/最暗(ink) |

#### 社寺（Shrine & temple）  `jp-jinja`
来源：NIPPON COLORS https://nipponcolors.com/ （站点注明色值引自《日本の伝統色 The Traditional Colors of Japan》PIE BOOKS 2007；经 /php/io.php 接口逐色读取）

| 色名 | HEX | 建议角色 |
|---|---|---|
| 胡粉 GOFUN | `#fffffb` | 纸/底(paper) |
| 生壁 NAMAKABE | `#7d6c46` | 地面(ground) |
| 鉛丹 ENTAN | `#d75455` | 结构/木构(structure) |
| 真朱 SHINSYU | `#ab3b3a` | 结构暗部(structureShadow) |
| 弁柄 BENGARA | `#9a5034` |  |
| 山吹 YAMABUKI | `#ffb11b` | 点缀(accent) |
| 檜皮 HIWADA | `#854836` | 屋顶(roof) |
| 緑青 ROKUSYOH | `#24936e` | 铜瓦屋顶(roofCopper) |
| 千歳緑 CHITOSEMIDORI | `#36563c` | 植被(foliage) |
| 苔 KOKE | `#838a2d` | 苔(moss) |
| 消炭 KESHIZUMI | `#434343` |  |
| 黒 KURO | `#080808` | 墨线/最暗(ink) |

### 4.3 复古主机/电脑

#### NES（Nintendo Entertainment System，Lospec 55 色版）  `nes`
来源：Lospec Palette List https://lospec.com/palette-list/nintendo-entertainment-system  
说明：NES PPU 输出 NTSC 信号，没有唯一“官方 RGB”；各模拟器调色板不同（此为 Lospec 收录版本，含 #fcfcfc 与 #f8f8f8 两种近白）。

55 色：`#000000` · `#fcfcfc` · `#f8f8f8` · `#bcbcbc` · `#7c7c7c` · `#a4e4fc` · `#3cbcfc` · `#0078f8` · `#0000fc` · `#b8b8f8` · `#6888fc` · `#0058f8` · `#0000bc` · `#d8b8f8` · `#9878f8` · `#6844fc` · `#4428bc` · `#f8b8f8` · `#f878f8` · `#d800cc` · `#940084` · `#f8a4c0` · `#f85898` · `#e40058` · `#a80020` · `#f0d0b0` · `#f87858` · `#f83800` · `#a81000` · `#fce0a8` · `#fca044` · `#e45c10` · `#881400` · `#f8d878` · `#f8b800` · `#ac7c00` · `#503000` · `#d8f878` · `#b8f818` · `#00b800` · `#007800` · `#b8f8b8` · `#58d854` · `#00a800` · `#006800` · `#b8f8d8` · `#58f898` · `#00a844` · `#005800` · `#00fcfc` · `#00e8d8` · `#008888` · `#004058` · `#f8d8f8` · `#787878`

#### Commodore 64  `c64`
来源：Lospec Palette List https://lospec.com/palette-list/commodore64  
说明：C64 VIC-II 色值同样因模拟/测量方法不同而有多个版本（Pepto 等），此为 Lospec 版本。色名为本文按 C64 标准 16 色名逐一对应补注。

16 色：black `#000000` · dark grey `#626262` · grey `#898989` · light grey `#adadad` · white `#ffffff` · red `#9f4e44` · light red `#cb7e75` · brown `#6d5412` · orange `#a1683c` · yellow `#c9d487` · light green `#9ae29b` · green `#5cab5e` · cyan `#6abfc6` · light blue `#887ecb` · blue `#50459b` · purple `#a057a3`

#### ZX Spectrum（15 色：普通+BRIGHT）  `zx-spectrum`
来源：Lospec Palette List https://lospec.com/palette-list/zx-spectrum

15 色：black `#000000` · blue `#0000d8` · bright blue `#0000ff` · red `#d80000` · bright red `#ff0000` · magenta `#d800d8` · bright magenta `#ff00ff` · green `#00d800` · bright green `#00ff00` · cyan `#00d8d8` · bright cyan `#00ffff` · yellow `#d8d800` · bright yellow `#ffff00` · white `#d8d8d8` · bright white `#ffffff`

#### Apple II（低分辨率 15 色）  `apple-ii`
来源：Lospec Palette List https://lospec.com/palette-list/apple-ii  
说明：原机两种灰相同，故 15 色；NTSC 伪彩，色值随显示器差异很大。

15 色：`#000000` · `#515c16` · `#843d52` · `#ea7d27` · `#514888` · `#e85def` · `#f5b7c9` · `#006752` · `#00c82c` · `#919191` · `#c9d199` · `#00a6f0` · `#98dbc9` · `#c8c1f7` · `#ffffff`

#### MSX（TMS9918，15 色）  `msx`
来源：Lospec Palette List https://lospec.com/palette-list/msx

15 色：`#000000` · `#cacaca` · `#ffffff` · `#b75e51` · `#d96459` · `#fe877c` · `#cac15e` · `#ddce85` · `#3ca042` · `#40b64a` · `#73ce7c` · `#5955df` · `#7e75f0` · `#64daee` · `#b565b3`

#### Amstrad CPC（27 色）  `amstrad-cpc`
来源：Lospec Palette List https://lospec.com/palette-list/amstrad-cpc

27 色：`#040404` · `#808080` · `#ffffff` · `#800000` · `#ff0000` · `#ff8080` · `#ff7f00` · `#ffff80` · `#ffff00` · `#808000` · `#008000` · `#01ff00` · `#80ff00` · `#80ff80` · `#01ff80` · `#008080` · `#01ffff` · `#80ffff` · `#0080ff` · `#0000ff` · `#00007f` · `#7f00ff` · `#8080ff` · `#ff80ff` · `#ff00ff` · `#ff0080` · `#800080`

#### Macintosh II（16 色）  `mac-ii`
来源：Lospec Palette List https://lospec.com/palette-list/macintosh-ii

16 色：`#ffffff` · `#ffff00` · `#ff6500` · `#dc0000` · `#ff0097` · `#360097` · `#0000ca` · `#0097ff` · `#00a800` · `#006500` · `#653600` · `#976536` · `#b9b9b9` · `#868686` · `#454545` · `#000000`

### 4.4 IBM PC（CGA / EGA）

#### CGA 16 色（RGBI，含棕色修正）  `cga-16`
来源：Lospec Palette List https://lospec.com/palette-list/color-graphics-adapter  
说明：色名为 IBM RGBI 标准名，按 hex 对应补注；棕色 #aa5500 为显示器硬件对暗黄的修正。

16 色：black `#000000` · dark gray `#555555` · light gray `#aaaaaa` · white `#ffffff` · blue `#0000aa` · light blue `#5555ff` · green `#00aa00` · light green `#55ff55` · cyan `#00aaaa` · light cyan `#55ffff` · red `#aa0000` · light red `#ff5555` · magenta `#aa00aa` · light magenta `#ff55ff` · brown `#aa5500` · yellow `#ffff55`

#### CGA 模式4 调色板0（低亮度）  `cga-p0-low`
来源：Lospec Palette List https://lospec.com/palette-list/cga-palette-0-low  
说明：第 0 色为可设定背景色，此处按 Lospec 取黑。

4 色：`#000000` · `#00aa00` · `#aa0000` · `#aa5500`

#### CGA 模式4 调色板0（高亮度）  `cga-p0-high`
来源：Lospec Palette List https://lospec.com/palette-list/cga-palette-0-high

4 色：`#000000` · `#55ff55` · `#ff5555` · `#ffff55`

#### CGA 模式4 调色板1（低亮度）  `cga-p1-low`
来源：Lospec Palette List https://lospec.com/palette-list/cga-palette-1-low

4 色：`#000000` · `#aa00aa` · `#00aaaa` · `#aaaaaa`

#### CGA 模式4 调色板1（高亮度，经典青/品红/白）  `cga-p1-high`
来源：Lospec Palette List https://lospec.com/palette-list/cga-palette-1-high

4 色：`#000000` · `#ff55ff` · `#55ffff` · `#ffffff`

#### CGA 模式5“调色板2”（高亮度，青/红/白）  `cga-p2-high`
来源：Lospec Palette List https://lospec.com/palette-list/cga-palette-2-high

4 色：`#000000` · `#ff5555` · `#55ffff` · `#ffffff`

#### EGA 64 色全集（rgbRGB 6 位）  `ega-64`
来源：Lospec Palette List https://lospec.com/palette-list/enhanced-graphics-adapter  
说明：索引 0–63 即 6 位 rgbRGB 值；EGA 默认 16 色 = 索引 0,1,2,3,4,5,20,7,56–63。

64 色：`#000000` · `#0000aa` · `#00aa00` · `#00aaaa` · `#aa0000` · `#aa00aa` · `#aaaa00` · `#aaaaaa` · `#000055` · `#0000ff` · `#00aa55` · `#00aaff` · `#aa0055` · `#aa00ff` · `#aaaa55` · `#aaaaff` · `#005500` · `#0055aa` · `#00ff00` · `#00ffaa` · `#aa5500` · `#aa55aa` · `#aaff00` · `#aaffaa` · `#005555` · `#0055ff` · `#00ff55` · `#00ffff` · `#aa5555` · `#aa55ff` · `#aaff55` · `#aaffff` · `#550000` · `#5500aa` · `#55aa00` · `#55aaaa` · `#ff0000` · `#ff00aa` · `#ffaa00` · `#ffaaaa` · `#550055` · `#5500ff` · `#55aa55` · `#55aaff` · `#ff0055` · `#ff00ff` · `#ffaa55` · `#ffaaff` · `#555500` · `#5555aa` · `#55ff00` · `#55ffaa` · `#ff5500` · `#ff55aa` · `#ffff00` · `#ffffaa` · `#555555` · `#5555ff` · `#55ff55` · `#55ffff` · `#ff5555` · `#ff55ff` · `#ffff55` · `#ffffff`

### 4.5 幻想主机（PICO-8）

#### PICO-8  `pico-8`
来源：Lospec Palette List https://lospec.com/palette-list/pico-8  
说明：色名按 PICO-8 社区 wiki 惯例（未逐一核实官方手册）。

16 色：0 black `#000000` · 1 dark-blue `#1d2b53` · 2 dark-purple `#7e2553` · 3 dark-green `#008751` · 4 brown `#ab5236` · 5 dark-grey `#5f574f` · 6 light-grey `#c2c3c7` · 7 white `#fff1e8` · 8 red `#ff004d` · 9 orange `#ffa300` · 10 yellow `#ffec27` · 11 green `#00e436` · 12 blue `#29adff` · 13 lavender `#83769c` · 14 pink `#ff77a8` · 15 light-peach `#ffccaa`

#### PICO-8 扩展“秘密”调色板（32 色）  `pico-8-secret`
来源：Lospec Palette List https://lospec.com/palette-list/pico-8-secret-palette

32 色：`#000000` · `#1d2b53` · `#7e2553` · `#008751` · `#ab5236` · `#5f574f` · `#c2c3c7` · `#fff1e8` · `#ff004d` · `#ffa300` · `#ffec27` · `#00e436` · `#29adff` · `#83769c` · `#ff77a8` · `#ffccaa` · `#291814` · `#111d35` · `#422136` · `#125359` · `#742f29` · `#49333b` · `#a28879` · `#f3ef7d` · `#be1250` · `#ff6c24` · `#a8e72e` · `#00b543` · `#065ab5` · `#754665` · `#ff6e59` · `#ff9d81`

### 4.6 现代像素调色板

#### Sweetie 16（GrafxKid）  `sweetie-16`
来源：Lospec Palette List https://lospec.com/palette-list/sweetie-16  
说明：作者 GrafxKid（Lospec 页未填作者字段，作者信息为常识，未核实）。

16 色：`#1a1c2c` · `#5d275d` · `#b13e53` · `#ef7d57` · `#ffcd75` · `#a7f070` · `#38b764` · `#257179` · `#29366f` · `#3b5dc9` · `#41a6f6` · `#73eff7` · `#f4f4f4` · `#94b0c2` · `#566c86` · `#333c57`

#### Endesga 16  `endesga-16`
来源：Lospec Palette List https://lospec.com/palette-list/endesga-16（作者字段：ENDESGA）

16 色：`#e4a672` · `#b86f50` · `#743f39` · `#3f2832` · `#9e2835` · `#e53b44` · `#fb922b` · `#ffe762` · `#63c64d` · `#327345` · `#193d3f` · `#4f6781` · `#afbfd2` · `#ffffff` · `#2ce8f4` · `#0484d1`

#### Endesga 32  `endesga-32`
来源：Lospec Palette List https://lospec.com/palette-list/endesga-32（作者字段：ENDESGA）

32 色：`#be4a2f` · `#d77643` · `#ead4aa` · `#e4a672` · `#b86f50` · `#733e39` · `#3e2731` · `#a22633` · `#e43b44` · `#f77622` · `#feae34` · `#fee761` · `#63c74d` · `#3e8948` · `#265c42` · `#193c3e` · `#124e89` · `#0099db` · `#2ce8f5` · `#ffffff` · `#c0cbdc` · `#8b9bb4` · `#5a6988` · `#3a4466` · `#262b44` · `#181425` · `#ff0044` · `#68386c` · `#b55088` · `#f6757a` · `#e8b796` · `#c28569`

#### Endesga 64  `endesga-64`
来源：Lospec Palette List https://lospec.com/palette-list/endesga-64（作者字段：ENDESGA）

64 色：`#ff0040` · `#131313` · `#1b1b1b` · `#272727` · `#3d3d3d` · `#5d5d5d` · `#858585` · `#b4b4b4` · `#ffffff` · `#c7cfdd` · `#92a1b9` · `#657392` · `#424c6e` · `#2a2f4e` · `#1a1932` · `#0e071b` · `#1c121c` · `#391f21` · `#5d2c28` · `#8a4836` · `#bf6f4a` · `#e69c69` · `#f6ca9f` · `#f9e6cf` · `#edab50` · `#e07438` · `#c64524` · `#8e251d` · `#ff5000` · `#ed7614` · `#ffa214` · `#ffc825` · `#ffeb57` · `#d3fc7e` · `#99e65f` · `#5ac54f` · `#33984b` · `#1e6f50` · `#134c4c` · `#0c2e44` · `#00396d` · `#0069aa` · `#0098dc` · `#00cdf9` · `#0cf1ff` · `#94fdff` · `#fdd2ed` · `#f389f5` · `#db3ffd` · `#7a09fa` · `#3003d9` · `#0c0293` · `#03193f` · `#3b1443` · `#622461` · `#93388f` · `#ca52c9` · `#c85086` · `#f68187` · `#f5555d` · `#ea323c` · `#c42430` · `#891e2b` · `#571c27`

#### AAP-64（Adigun A. Polack）  `aap-64`
来源：Lospec Palette List https://lospec.com/palette-list/aap-64（作者字段：Adigun A. Polack）

64 色：`#060608` · `#141013` · `#3b1725` · `#73172d` · `#b4202a` · `#df3e23` · `#fa6a0a` · `#f9a31b` · `#ffd541` · `#fffc40` · `#d6f264` · `#9cdb43` · `#59c135` · `#14a02e` · `#1a7a3e` · `#24523b` · `#122020` · `#143464` · `#285cc4` · `#249fde` · `#20d6c7` · `#a6fcdb` · `#ffffff` · `#fef3c0` · `#fad6b8` · `#f5a097` · `#e86a73` · `#bc4a9b` · `#793a80` · `#403353` · `#242234` · `#221c1a` · `#322b28` · `#71413b` · `#bb7547` · `#dba463` · `#f4d29c` · `#dae0ea` · `#b3b9d1` · `#8b93af` · `#6d758d` · `#4a5462` · `#333941` · `#422433` · `#5b3138` · `#8e5252` · `#ba756a` · `#e9b5a3` · `#e3e6ff` · `#b9bffb` · `#849be4` · `#588dbe` · `#477d85` · `#23674e` · `#328464` · `#5daf8d` · `#92dcba` · `#cdf7e2` · `#e4d2aa` · `#c7b08b` · `#a08662` · `#796755` · `#5a4e44` · `#423934`

#### Resurrect 64（Kerrie Lake）  `resurrect-64`
来源：Lospec Palette List https://lospec.com/palette-list/resurrect-64（作者字段：Kerrie Lake）

64 色：`#2e222f` · `#3e3546` · `#625565` · `#966c6c` · `#ab947a` · `#694f62` · `#7f708a` · `#9babb2` · `#c7dcd0` · `#ffffff` · `#6e2727` · `#b33831` · `#ea4f36` · `#f57d4a` · `#ae2334` · `#e83b3b` · `#fb6b1d` · `#f79617` · `#f9c22b` · `#7a3045` · `#9e4539` · `#cd683d` · `#e6904e` · `#fbb954` · `#4c3e24` · `#676633` · `#a2a947` · `#d5e04b` · `#fbff86` · `#165a4c` · `#239063` · `#1ebc73` · `#91db69` · `#cddf6c` · `#313638` · `#374e4a` · `#547e64` · `#92a984` · `#b2ba90` · `#0b5e65` · `#0b8a8f` · `#0eaf9b` · `#30e1b9` · `#8ff8e2` · `#323353` · `#484a77` · `#4d65b4` · `#4d9be6` · `#8fd3ff` · `#45293f` · `#6b3e75` · `#905ea9` · `#a884f3` · `#eaaded` · `#753c54` · `#a24b6f` · `#cf657f` · `#ed8099` · `#831c5d` · `#c32454` · `#f04f78` · `#f68181` · `#fca790` · `#fdcbb0`

### 4.7 Game Boy 4 色

#### Game Boy DMG（bgb 模拟器绿）  `gb-dmg-bgb`
来源：Lospec Palette List https://lospec.com/palette-list/nintendo-gameboy-bgb

4 色：darkest `#081820` · dark `#346856` · light `#88c070` · lightest `#e0f8d0`

#### Game Boy（Arne 版）  `gb-dmg-arne`
来源：Lospec Palette List https://lospec.com/palette-list/nintendo-gameboy-arne

4 色：`#243137` · `#3f503f` · `#768448` · `#acb56b`

#### Super Game Boy 默认  `gb-super`
来源：Lospec Palette List https://lospec.com/palette-list/nintendo-super-gameboy

4 色：`#331e50` · `#a63725` · `#d68e49` · `#f7e7c6`

#### Kirokaze Gameboy  `gb-kirokaze`
来源：Lospec Palette List https://lospec.com/palette-list/kirokaze-gameboy（作者字段：Kirokaze）

4 色：`#332c50` · `#46878f` · `#94e344` · `#e2f3e4`

#### 2bit Demichrome  `gb-demichrome`
来源：Lospec Palette List https://lospec.com/palette-list/2bit-demichrome（作者字段：Space Sandwich）

4 色：`#211e20` · `#555568` · `#a0a08b` · `#e9efec`

#### Ice Cream GB（Kerrie Lake）  `gb-ice-cream`
来源：Lospec Palette List https://lospec.com/palette-list/ice-cream-gb（作者字段：Kerrie Lake）

4 色：`#7c3f58` · `#eb6b6f` · `#f9a875` · `#fff6d3`

#### Mist GB（Kerrie Lake）  `gb-mist`
来源：Lospec Palette List https://lospec.com/palette-list/mist-gb（作者字段：Kerrie Lake）

4 色：`#2d1b00` · `#1e606e` · `#5ab9a8` · `#c4f0c2`

#### Rustic GB（Kerrie Lake）  `gb-rustic`
来源：Lospec Palette List https://lospec.com/palette-list/rustic-gb（作者字段：Kerrie Lake）

4 色：`#2c2137` · `#764462` · `#edb4a1` · `#a96868`

#### GB Chocolate  `gb-chocolate`
来源：Lospec Palette List https://lospec.com/palette-list/gb-chocolate

4 色：`#ffe4c2` · `#dca456` · `#a9604c` · `#422936`

### 4.8 1-bit 双色

#### 1bit Monitor Glow（Polyducks）  `1bit-monitor-glow`
来源：Lospec Palette List https://lospec.com/palette-list/1bit-monitor-glow（作者字段：Polyducks）

2 色：`#222323` · `#f0f6f0`

#### Bitbee（Poltergasm）  `1bit-bitbee`
来源：Lospec Palette List https://lospec.com/palette-list/bitbee（作者字段：Poltergasm）

2 色：`#292b30` · `#cfab4a`

#### Return of the Obra Dinn · Macintosh  `obra-dinn-macintosh`
来源：Lospec Palette List https://lospec.com/palette-list/obra-dinn-macintosh  
说明：《奥伯拉丁的回归》游戏内可选“显示器”配色之一；hex 为 Lospec 社区转录，未与游戏文件核对。

2 色：`#333319` · `#e5ffff`

#### Return of the Obra Dinn · IBM 8503  `obra-dinn-ibm-8503`
来源：Lospec Palette List https://lospec.com/palette-list/obra-dinn-ibm-8503  
说明：同上，未核实。

2 色：`#2e3037` · `#ebe5ce`

#### Return of the Obra Dinn · Commodore 1084  `obra-dinn-commodore-1084`
来源：Lospec Palette List https://lospec.com/palette-list/obra-dinn-commodore-1084  
说明：同上，未核实。

2 色：`#40318e` · `#88d7de`

#### Return of the Obra Dinn · IBM 5151  `obra-dinn-ibm-5151`
来源：Lospec Palette List https://lospec.com/palette-list/obra-dinn-ibm-5151  
说明：同上，未核实。

2 色：`#25342f` · `#01eb5f`

#### Return of the Obra Dinn · Zenith ZVM 1240  `obra-dinn-zenith-zvm-1240`
来源：Lospec Palette List https://lospec.com/palette-list/obra-dinn-zenith-zvm-1240  
说明：同上，未核实。

2 色：`#3f291e` · `#fdca55`

### 4.9 艺术运动

#### Bauhaus（Braquen 版）  `bauhaus-braquen`
来源：Lospec Palette List https://lospec.com/palette-list/bauhaus（作者字段：Braquen）  
说明：包豪斯并无“官方色板”；此为像素画家 Braquen 的诠释版。色名为本文补注。

| 色名 | HEX | 建议角色 |
|---|---|---|
| ink black | `#1a1616` | 墨线/最暗(ink) |
| violet | `#4f186b` |  |
| blue | `#3e4db4` | 天空(sky) |
| crimson | `#91144e` |  |
| red | `#ea1f25` | 点缀(accent) |
| ochre brown | `#ad6d37` |  |
| yellow | `#f1ca00` |  |
| paper | `#ecddbe` | 纸/底(paper) |

#### De Stijl / 蒙德里安（近似值）  `de-stijl-approx`
来源：本文整理的常见近似值（无权威 hex；未核实）  
说明：De Stijl 理论只规定“三原色 + 非色（黑白灰）”；原作颜料已老化，hex 仅为风格近似，未核实。

| 色名 | HEX | 建议角色 |
|---|---|---|
| red | `#d40920` |  |
| blue | `#1356a2` |  |
| yellow | `#f7d842` |  |
| white | `#f2f2ee` |  |
| light grey | `#d9d9d6` |  |
| black | `#141414` |  |

#### Memphis（孟菲斯，近似值）  `memphis-approx`
来源：本文整理的常见近似值（无权威 hex；未核实）  
说明：Memphis Group（1981–1987）以高饱和粉/黄/青/红配黑白图案（如 Bacterio 印花）为特征；具体 hex 为风格近似，未核实。

| 色名 | HEX | 建议角色 |
|---|---|---|
| black | `#111111` |  |
| white | `#fafafa` |  |
| pink | `#f7a1c4` |  |
| yellow | `#ffd23f` |  |
| turquoise | `#2ec4b6` |  |
| red | `#ef3e36` |  |
| cobalt | `#2a4bd7` |  |
| mint | `#a8e6cf` |  |
| lilac | `#b39ddb` |  |

### 4.10 Risograph 油墨

#### Risograph 油墨全表（stencil.wiki 汇总，78 色）  `riso-inks-stencil`
来源：stencil.wiki/colors，经 mattdesl/riso-colors 转存（2019-02-25 快照）https://github.com/mattdesl/riso-colors  
说明：RISO 官方只公布油墨名与 Pantone 近似，hex 为社区按 Pantone 换算的屏幕近似；原数据中 “RisoFederal Blue” 已更正为 Federal Blue；Tomato/Marine Red、Raspberry Red/Cranberry、Wine/Burgundy 共用同一 hex（原数据如此）。

78 色：Black (Pantone BLACK U) `#000000` · Burgundy (Pantone 235 U, S-4225) `#914e72` · Blue (Pantone 3005 U, S-4257) `#0078bf` · Green (Pantone 354 U, S-4259) `#00a95c` · Medium Blue (Pantone 286 U, S-4261) `#3255a4` · Bright Red (Pantone 185 U, S-4263) `#f15060` · Federal Blue (Pantone 288 U, S-4265) `#3d5588` · Purple (Pantone 2685 U, S-4267) `#765ba7` · Teal (Pantone 321 U, S-4269) `#00838a` · Flat Gold (Pantone 1245 U, S-4271) `#bb8b41` · Hunter Green (Pantone 342 U, S-4273) `#407060` · Red (Pantone WARM RED U, S-4275) `#ff665e` · Brown (Pantone 7526 U, S-4277) `#925f52` · Yellow (Pantone YELLOW U, S-4279) `#ffe800` · Marine Red (Pantone 186 U, S-4281) `#d2515e` · Orange (Pantone ORANGE 021 U, S-4283) `#ff6c2f` · Fluorescent Pink (Pantone 806 U, S-4287) `#ff48b0` · Light Gray (Pantone 424 U, S-4291) `#88898a` · Metallic Gold (Pantone 872 U,  S-2772) `#ac936e` · Crimson (Pantone 485 U, S-4285) `#e45d50` · Fluorescent Orange (Pantone 805 U, S-4289) `#ff7477` · Cornflower (Pantone 292 U, S-4617) `#62a8e5` · Sky Blue (Pantone 285U, S-4618) `#4982cf` · Sea Blue (Pantone 307 U, S-4619) `#0074a2` · Lake (Pantone 293 U, S-4620) `#235ba8` · Indigo (Pantone 2758 U, S-4621) `#484d7a` · Midnight (Pantone 296 U, S-4622) `#435060` · Mist (Pantone 7485 U, S-4623) `#d5e4c0` · Granite (Pantone 7538 U, S-4624) `#a5aaa8` · Charcoal (Pantone 7540 U, S-4625) `#70747c` · Smoky Teal (Pantone 5483 U, S-4626) `#5f8289` · Steel (Pantone 302 U, S-4627) `#375e77` · Slate (Pantone 5605 U, S-4628) `#5e695e` · Turquoise (Pantone 3275 U, S-4629) `#00aa93` · Emerald (Pantone 355 U, S-4630) `#19975d` · Grass (Pantone 356 U, S-4631) `#397e58` · Forest (Pantone 357 U, S-4632) `#516e5a` · Spruce (Pantone 567 U, S-4633) `#4a635d` · Moss (Pantone 371 U, S-4634) `#68724d` · Sea Foam (Pantone 570 U, S-4635) `#62c2b1` · Kelly Green (Pantone 368 U, S-4636) `#67b346` · Light Teal (Pantone 320 U, S-4637) `#009da5` · Ivy (Pantone 347 U, S-4638) `#169b62` · Pine (Pantone 3295 U, S-4639) `#237e74` · Lagoon (Pantone 323 U, S-4640) `#2f6165` · Violet (Pantone 265 U, S-4641) `#9d7ad2` · Orchid (Pantone 2592 U, S-4642) `#aa60bf` · Plum (Pantone 2603 U, S-4644) `#845991` · Raisin (Pantone 519 U, S-4645) `#775d7a` · Grape (Pantone 2695 U, S-4646) `#6c5d80` · Scarlet (Pantone RED 032 U, S-4647) `#f65058` · Tomato (Pantone 186 U, S-4648) `#d2515e` · Cranberry (Pantone 214 U, S-4649) `#d1517a` · Maroon (Pantone 221 U, S-4650) `#9e4c6e` · Raspberry Red (Pantone 214U, S-4651) `#d1517a` · Brick (Pantone 1807 U, S-4652) `#a75154` · Light Lime (Pantone 387 U, S-4653) `#e3ed55` · Sunflower (Pantone 116 U, S-4654) `#ffb511` · Melon (Pantone 1235 U, S-4655) `#ffae3b` · Apricot (Pantone 143 U, S-4656) `#f6a04d` · Paprika (Pantone 158 U, S-4657) `#ee7f4b` · Pumpkin (Pantone 1655 U, S-4658) `#ff6f4c` · Bright Olive Green (Pantone 103 U, S-4659) `#b49f29` · Bright Gold (Pantone 131 U, S-4660) `#ba8032` · Copper (Pantone 1525 U, S-4661) `#bd6439` · Mahogany (Pantone 491 U, S-4662) `#8e595a` · Bisque (Pantone 503 U, S-4663) `#f2cdcf` · Bubble Gum (Pantone 231 U, S-4664) `#f984ca` · Light Mauve (Pantone 7430 U, S-4665) `#e6b5c9` · Dark Mauve (Pantone 687 U, S-4666) `#bd8ca6` · Wine (Pantone 235 U, S-4674) `#914e72` · Gray (Pantone 403 U, S-4693) `#928d88` · White `#ffffff` · Aqua (Pantone 637 U, S-4917) `#5ec8e5` · Mint (Pantone 324 U, S-6316) `#82d8d5` · Fluorescent Yellow (Pantone 803 U, S-7761) `#ffe900` · Fluorescent Red (Pantone 812 U, S-7762) `#ff4c65` · Fluorescent Green (Pantone 802 U, S-7763) `#44d62c`

#### Riso 常用套色（zine 三/四鼓组合）  `riso-zine-core`
来源：stencil.wiki/colors 经 mattdesl/riso-colors（同上）  
说明：纸色 #f4f1ea 为本文假设的再生纸近似（非 Riso 数据）。叠印需在 shader 中用 multiply 模拟。

| 色名 | HEX | 建议角色 |
|---|---|---|
| Fluorescent Pink | `#ff48b0` | 点缀(accent) |
| Yellow | `#ffe800` |  |
| Medium Blue | `#3255a4` | 天空(sky) |
| Federal Blue | `#3d5588` |  |
| Teal | `#00838a` | 植被(foliage) |
| Bright Red | `#f15060` |  |
| Orange | `#ff6c2f` |  |
| Green | `#00a95c` |  |
| Black | `#000000` | 墨线/最暗(ink) |

额外角色：paper=`#f4f1ea`

## 5. 还缺什么（与 backlog 对应）

- **故宫色名体系**（384 色，二十四节气 × 72 候）：目前缺少可信的数字化色值，需要拿原书 CMYK 校对后再换算（见 `backlog.md`）。
- **矿物颜料实测色**：敦煌研究院、故宫文保科技部发表过颜料分析论文，可以据此做一套"实测近似"色组，替代现在的传统色库近似值。
- **NES / C64 多版本对照**：可以给出 FCEUX、Mesen、Pepto 等版本，让用户看到"同一台机器、不同颜色"。
- **更多日本色组**（侘寂茶室、浮世绘套色），以及韩国传统色（오방색 五方色、단청 丹青），后者需要找到可信来源。

## 来源

1. 中国色 zhongguose.com 首页与接口：https://zhongguose.com/ ；`https://zhongguose.com/api/colors`（2026-10-13 抓取）
2. nevertoday/zhongguo-traditional-colors：https://github.com/nevertoday/zhongguo-traditional-colors （主列表 `docs/chinese-color-master-list.md`；在线站 https://colors.xiaoxiaodong.ai/ ）
3. OmicVerse `omicverse/pl/_forbidden.py`（《中国传统色：故宫里的色彩美学》384 色转录）：https://github.com/omicverse/omicverse/blob/master/omicverse/pl/_forbidden.py
4. reorx/cht-colors（Chinese Traditional Colors）：https://github.com/reorx/cht-colors ，站点 https://cht-colors.pages.dev/
5. NIPPON COLORS - 日本の伝統色：https://nipponcolors.com/ （页面注明 "Color data cited: 日本の伝統色 The Traditional Colors of Japan. PIE BOOKS, 2007"）
6. Lospec Palette List：https://lospec.com/palette-list （各调色板页为 `https://lospec.com/palette-list/<slug>`，slug 写在 JSON 的 `source` 字段里）
7. mattdesl/riso-colors（数据来自 stencil.wiki/colors，2019-02-25）：https://github.com/mattdesl/riso-colors ；stencil.wiki：http://stencil.wiki/colors
