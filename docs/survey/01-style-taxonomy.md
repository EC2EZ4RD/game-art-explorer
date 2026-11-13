<!-- 来源：风格分类调研（2026-10-13 调研子代理报告原文存档，未经人工校对；数据会在后续里程碑中核验与补充） -->

# 游戏美术风格分类调研（Taxonomy）

我按"维度组合"的思路整理了一张风格分类表。全表共 17 组、225 条风格或子风格：前 15 组按你给的分组，后面补了 2 组空缺，分别是第 16 组"世界民族与古典艺术"和第 17 组"技术/媒介模拟"。表后附了 UI 风格谱系、36 个情绪/氛围词、34 个文化与世界题材，最后是来源列表。

**图例**
- **平台**：St = Steam/PC；NS = 任天堂（含 GB/SNES/N64/Wii/Wii U 等历代主机）；PS = PlayStation（含 PS1/PS2/Vita）；XB = Xbox；M = 移动端；W = 网页；多 = 3 个及以上主流平台；DC = Dreamcast；MD = Mega Drive。
- **实时 3D（Three.js/WebGL）可实现度**：
  - 【实】：用内置材质、常见 shader 或后处理就能实时做出来。
  - 【局:…】：只能部分实现，冒号后写缺什么。
  - 【材:…】：需要专门的素材，冒号后写什么素材。
  - 【2D】：主要是 2D 制作规则，3D 里只能近似。
- **来源**：[n] 对应文末的来源编号。代表游戏多是公开常识；技法类说法尽量都标了来源。只有社区分析、没有官方说明的会单独注明。

---

## 1. 写实与风格化三维

| # | 名称 | 定义 | 关键视觉机制 | 与相邻风格区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|1.1|照片写实 (Photorealism)|靠物理正确的光照和扫描资产逼近照片|材质:PBR+扫描；光:GI/软阴影；镜头:真实焦段与曝光|与1.5相比，不主动夸张形体和色彩|黑神话：悟空(St/PS)[52]、TLOU Part II(PS/St)、Hellblade II(XB/St)|【局:缺实时GI与海量几何；材:扫描库】|
|1.2|电影化写实 (Cinematic)|写实画面加上电影摄影语言|镜头:宽银幕、景深、镜头光晕；表面:胶片颗粒；色:LUT 调色|重点是"摄影机感"，不是物理真实|The Order: 1886(PS4)、Death Stranding(PS/St)、Alan Wake 2(PS/XB/PC)|【实:后处理部分；写实底子仍是【局】】|
|1.3|随身摄像纪实 (Bodycam/Found-footage)|模拟随身或手持摄像机拍出的"录像真实"|镜头:鱼眼广角、手持抖动、自动曝光；表面:压缩噪点、时间码|与1.2相反：不讲构图、不美化画面|Bodycam(St)、Unrecord(St,未发售)、Backrooms 1998(St)[51]|【实:相机与后处理；材:写实资产】|
|1.4|灰调军事写实 (Gritty desaturated)|低饱和、尘土硝烟感的写实|色:去饱和的褐/绿；氛围:烟尘体积；材质:磨损|调色更"脏"，没有风格滤镜|Call of Duty 系列(多)、Escape from Tarkov(St)、S.T.A.L.K.E.R. 2(St/XB)|【局:同1.1】|
|1.5|风格化写实 (Stylized realism)|写实材质，但形体、色彩和视线引导都经过美术导演设计|比例:轻度夸张；色:用主色引导视线；光:戏剧化|画面服从美术意图（例如用风向给玩家引路）|Dishonored 2(多)、Ghost of Tsushima(PS/St)、Horizon Forbidden West(PS/St)|【实/局:精细资产需素材】|
|1.6|手绘贴图风格化 (Hand-painted texture)|光影和细节直接画进漫反射贴图|表面:手绘贴图（含 AO 和高光）；形:粗壮倒角；几乎不用 PBR|光照是"画死"在贴图里的|World of Warcraft(St)、Torchlight II(多)、League of Legends(St)|【实(Lambert/Basic 材质)；材:手绘贴图】|
|1.7|风格化PBR／英雄射击风 (Stylized PBR)|PBR 管线，但细节精简、色块大、可读性高|形:厚倒角、大剪影；材质:简化 PBR；色:阵营色|与1.6比光照是实时算的；与2.1比比例更写实|Overwatch 2(多)、Fortnite(多/M)、Valorant(St/PS/XB)|【实】|
|1.8|绘画-3D混合／Arcane式 (Painterly hybrid)|在 3D 模型上手绘明暗笔触，再配 2D 特效和绘制背景|表面:手绘明暗贴图（不是硬阴影）；特效:2D 手绘；背景:投影绘画[29]|比1.6更像油画，而且混合 2D 特效|标杆是剧集 Arcane[29]；游戏里近似的有 Dishonored 2(多)、Sea of Thieves(XB/St/PS)|【局:需手绘贴图+屏幕空间笔触；材:2D 特效序列】|
|1.9|低清资产＋现代光照 (Lo-fi assets/modern light)|低分辨率点采样贴图配粗模，再叠加体积光、阴影和雾|表面:最近邻过滤（Nearest）低清贴图；光:现代；氛围:浓雾|与8.1比没有顶点抖动和贴图扭曲|Valheim(St/XB)[48]、Lethal Company(St，默认 860×520 内部分辨率)[40]、Deep Rock Galactic(多)|【实】|
|1.10|华丽光泽写实（韩式MMO）(Glamour realism)|精致服装、光滑皮肤加强泛光|材质:高光泽、精细布料；光:柔光+泛光；比例:理想化|美化优先于真实|Black Desert(St/PS/XB/M)、Lost Ark(St)、天涯明月刀(PC/M)|【局:皮肤次表面散射/毛发】|
|1.11|微缩写实 (Macro realism)|写实材质，用昆虫或玩具的尺度去看世界|镜头:微距浅景深；比例:日常物件变成巨物|与5.8比材质是写实的，不是玩具|Pikmin 4(NS)、Grounded(多)、It Takes Two(多)|【实/局:材质需素材】|

## 2. 动画式三维

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|2.1|皮克斯式CG电影 (Pixar-like)|动画电影级的圆润角色加柔和体积光|比例:大头大眼；明暗:柔和次表面散射；动态:挤压拉伸|与2.3比更"有机"，更重表演|Ratchet & Clank: Rift Apart(PS/St)、Kena(PS/St)、Psychonauts 2(多)|【局:缺高质量次表面散射/毛发】|
|2.2|迪士尼长片风 (Disney-like)|迪士尼式的俊美角色加童话场景|比例:细腰大眼；色:童话饱和色；光:舞台光|比2.1更偏"公主/童话"审美|Kingdom Hearts III(多)、Disney Dreamlight Valley(多/M)|【局】|
|2.3|任天堂玩具感 (Nintendo toy-like)|干净的塑料或陶瓷感材质，比例短粗|材质:单色光滑塑料；光:明亮均匀+AO；色:高饱和原色|更像实体玩具，而不是活物|Super Mario Odyssey、Splatoon 3、Mario Wonder(NS)|【实】|
|2.4|Q版／大头 (Chibi 3D)|2–3 头身，四肢简化|比例:超大头；形:极简四肢|比例是核心，材质可以随意变|Animal Crossing NH(NS)、Blue Archive(M/St)、DQ Builders 2(多)|【实】|
|2.5|美式卡通3D (Western cartoon)|夸张的肢体，遵循卡通物理|比例:极端夸张；动态:强烈挤压拉伸|比2.1更夸张，更偏喜剧|Crash Bandicoot 4(多)、Spyro Reignited(多)、Sly Cooper(PS2/PS3)|【实】|
|2.6|卡通渲染／风之杖式 (Toon cartoon)|二阶硬阴影、大眼睛、风格化特效|明暗:二阶；描边:很少或没有；特效:卷云状烟雾|角色不是二次元比例，更偏童话|Wind Waker HD(Wii U)、A Hat in Time(多)、Lil Gator Game(St/NS)|【实(卡通材质 MeshToonMaterial)】|
|2.7|黏土质感CG (Claymation-look CG)|用 CG 模拟橡皮泥|表面:指纹凹凸法线；材质:哑光加次表面散射；动态:约 12fps 抽帧|与12.8比可以自由运镜和打光|Claybook(St/PS/XB，基于 SDF)、Wallace & Gromit's Grand Adventures(PC/X360)|【局:需指纹法线素材；抽帧容易做】|
|2.8|暗黑童话／蒂姆·伯顿式 (Burtonesque)|细长扭曲的比例加阴郁的玩偶感|比例:细长或大头；形:螺旋、尖角；光:单个点光源，冷暖对比|比13.7更童话、更像玩偶|Little Nightmares(多)、Lost in Random(多)、Don't Starve(2D,多)|【实】|

## 3. 动漫／漫画

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|3.1|二次元赛璐珞（大世界手游）(Anime cel-shaded)|动漫角色用色阶阴影加描边，面部单独处理阴影|明暗:2–3 阶色阶贴图（ramp），加手绘阴影遮罩；描边:背面外扩；面部:SDF 阴影图；边缘光[8]|与3.2比是实时动态光照，不逐帧调法线|原神、崩坏：星穹铁道、绝区零(M/PS/PC)|【实；材:阴影遮罩、面部 SDF 图】|
|3.2|格斗级赛璐珞／Guilty Gear Xrd式|用 3D 冒充 2D 手绘，靠手调法线和有限动画|明暗:手调顶点法线；描边:内线贴图+外壳；动态:抽帧、不插值；逐镜头调光[1]|每一帧都像画出来一样修正过|Guilty Gear Strive(PS/XB/St)、Dragon Ball FighterZ(多)|【局:法线和逐帧形变要手工做】|
|3.3|吉卜力式 (Ghibli-like)|手绘背景感、自然饱和的绿色、圆脸角色|色:翠绿、天空蓝；天空:积云；角色:简洁赛璐珞|比3.1更自然、高光更少|Ni no Kuni I/II(PS/NS/St)|【实；天空和云需要绘制贴图】|
|3.4|动漫水彩氛围 (Atmospheric shader)|动漫角色加水彩化的环境滤镜|后处理:雾、柔焦、色彩调整，模拟手绘感[27]|主要靠滤镜，更有"空气感"|Tales of Arise(PS/XB/St)|【实】|
|3.5|日漫网点 (Manga screentone)|黑白漫画：用网点代替灰阶|明暗:网点/排线量化；特效:速度线、拟声字|没有彩色，以网点为主|JoJo ASBR(多)、World of Horror(St/NS/PS)[58]|【实(半调后处理 HalftonePass 或自定义)[42]】|
|3.6|美漫概念插画／Borderlands式|手绘线条贴图、粗外描边、硬阴影|描边:粗黑的后处理边线；表面:手绘线条纹理；Gearbox 自称"不是赛璐珞"[24]|比例写实，线条画在贴图里|Borderlands 2/3(多)、XIII(多)|【实；材:线稿纹理】|
|3.7|美漫墨线叙事／Telltale式|墨线排影贴图配柔和光照|表面:墨线排线贴图；描边:细|比3.6更像连载漫画，色调克制|The Walking Dead、The Wolf Among Us(多/M)|【实；材:墨线贴图】|
|3.8|蜘蛛宇宙式3D漫画 (Spider-Verse-like)|3D 加抽帧、半调网点、手绘冲击线|动态:每 2–3 帧更新一次；表面:Ben-Day 网点；2D 拟声字（GDC 演讲列出了漫画着色器 comic shaders[16]）|以网点和动画节奏为核心|Hi-Fi Rush(XB/PS/St)|【实】|
|3.9|清线派 (Ligne claire)|等粗的清晰线条，平涂、无阴影|描边:等宽；明暗:几乎没有|比3.10线条更干净、色彩更饱和|Tintin Reporter: Cigars of the Pharaoh(多)、Valiant Hearts(多/M)[54]|【实(Sobel 等宽线+无光照材质)】|
|3.10|Moebius／法比科幻漫画 (Bande dessinée)|细线、平涂、开阔的沙漠天空|细线+平涂，几乎不做阴影[6]|比3.9更科幻、留白更多|Sable(St/XB/PS)[6]、Gravity Rush(Vita/PS4)[53]|【实[7]】|
|3.11|黑色漫画 (Noir comic)|高反差黑白，加一个强调色|明暗:二值；色:黑白+红；构图:分格|没有网点，只有纯黑块面|MadWorld(Wii)、Max Payne(PC/XB/PS2)、Blacksad(多)|【实】|
|3.12|韩漫／条漫 (Webtoon/manhwa)|帅气的半写实角色、平滑渐变阴影、强光效|比例:修长；明暗:柔和渐变；霓虹特效|阴影比3.1更柔，比例更写实|Solo Leveling: Arise(M/St)|【实】|
|3.13|半写实二次元 (Semi-real anime)|二次元脸配 PBR 材质|材质:PBR；面部做卡通化处理|环境和衣物是写实的|Code Vein(多)、Honkai Impact 3rd(M/PC)、Tower of Fantasy(M/PC)|【实/局】|
|3.14|街头涂鸦卡通／JSR式 (Graffiti cel)|粗描边、平涂、涂鸦贴花|描边:粗；色:高饱和；涂鸦贴花；UI 偏 Y2K[62]|比3.8更"街头"，更有 Dreamcast 味|Jet Set Radio(DC/St)、Bomb Rush Cyberfunk(多)|【实】|

## 4. 绘画感三维

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|4.1|屏幕笔触绘画 (Painterly post)|在屏幕空间把 3D 画面"刷"成颜料块|后处理:Kuwahara 滤镜／方向笔触，色块化，保留边缘[37]|风格在屏幕上，不在贴图里|Dreams(PS4，SDF 加笔刷)[66]、Susurrus(W)[37]|【实】|
|4.2|墨绘／大神式 (Sumi-e, Ōkami)|粗墨描边、纸纹滤镜、留白|描边:粗细变化的墨线；表面:纸纹叠加；平涂（PS2 机能限制催生了赛璐珞方案）[13]|比9.1更图案化，融入了浮世绘|Ōkami HD(多)|【实；材:纸纹、笔触贴图】|
|4.3|油画／厚涂 (Oil/impasto)|能看到笔触和颜料厚度|表面:厚涂笔触法线；冷暖对比；大块明暗（开发组里有学院派油画家[25]）|比4.1笔触更厚，色彩更有表现力|Disco Elysium(多)、The Artful Escape(多)|【局:需笔触贴图】|
|4.4|印象派 (Impressionist)|用光色斑点表现，远景溶解成笔触|补色并置；短笔点；远景随距离笔触化|强调光而不是形|Skyward Sword HD(NS，常被评为印象派)、Dreams(PS4)|【实】|
|4.5|表现主义 (Expressionist)|透视扭曲，色彩情绪化|形:倾斜扭曲；非自然色；强光|表达情绪而不是描绘光|Psychonauts 2 心灵关卡(多)、Fran Bow(2D,多)|【局:需要定制几何】|
|4.6|水粉 (Gouache)|不透明、哑光的平涂色块|2–4 阶平涂；颗粒哑光；柔和色调|与4.7比不透明，没有湿边|塞尔达：旷野之息(NS，官方称"绘画风"(painterly))[23]、Jusant(PS/XB/St)、Old Man's Journey(2D)|【实】|
|4.7|水彩 (Watercolor)|湿边、晕染、纸纹颗粒、留白|纸纹颗粒；边缘加深；透明叠色；色彩渗化[55]|透明，边缘有晕染|Gris(2D,多)、Dordogne(真实水彩素材,多)[28]、Child of Light(多)|【局:能实时近似[55]，真实感要靠手绘素材】|
|4.8|粉彩／色粉 (Pastel)|高明度、低对比、粉质颗粒|明度高；颗粒粗；明暗柔和|没有湿边，颗粒比水彩粗|Haven(多)、Kirby's Dream Land 3(SNES)|【实】|
|4.9|彩色铅笔 (Colored pencil)|同方向排线、露出纸纹、颜色叠加|排线纹理跟随明暗（TAM 色调排线贴图）；叠色|与11.1比有色彩|代表作少（搜索没找到明确案例）|【实】|
|4.10|蜡笔／儿童画 (Crayon)|粗糙的蜡笔线、涂出线外、天真的比例|抖动粗线；蜡质颗粒|比彩铅更笨拙，故意画不准|Yoshi's Island(SNES)、Crayon Physics Deluxe(St/iOS)、Drawn to Life(DS/NS)|【局:需线条抖动和蜡质纹理】|
|4.11|马克笔／填色书 (Coloring book)|黑白线稿，再往里填色|黑线骨架；马克笔平涂、溢色|线稿是骨架，玩家参与上色|Chicory(St/NS/PS)|【实】|
|4.12|海报风景插画／Firewatch式|大块平涂、方向性彩色雾、剪影远景|分层彩色雾；单色调主题；简化剪影[22]|比4.6更平面设计化|Firewatch(多)、The Long Dark(多)|【实(自定义雾)】|
|4.13|钢笔淡彩 (Ink & wash)|墨线加淡彩|墨线；淡透明色；纸纹|以线条为主导|Book of Travels(St)、Pentiment(多)[21]|【实】|

## 5. 低多边形与几何

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|5.1|刻面低模 (Faceted low poly)|能看到三角面，用面法线平直着色|低面数；平直着色(flat shading)；渐变天空|每个面一个颜色，棱角分明|Lonely Mountains: Downhill(多)、Polytopia(M/St/NS)|【实】|
|5.2|平滑低模／色板贴图 (Smooth low poly)|低面数加顶点色或渐变色板贴图|色板图集(atlas)；平滑明暗|不强调刻面|TABS(多)、Islanders(多)|【实】|
|5.3|白盒极简＋强调色 (White minimal)|白灰世界里只有一个强调色|无纹理；白+红或原色|几何细节极少|Superhot(多)、Mirror's Edge(PS3/X360/PC)|【实】|
|5.4|折纸几何 (Papercraft geometric)|纸折面、锐利折痕、单色纸|折面几何；纸纹|比12.2更抽象|Paper Mario: The Origami King(NS)|【实；材:纸纹】|
|5.5|等距布景 (Isometric diorama)|正交等距相机下的切块小世界|正交等距相机；悬浮切块地形[47][61]|没有景深模糊，强调图形感|Monument Valley(M/St)、Bad North(多)、Townscaper(多)|【实】|
|5.6|不可能几何／埃舍尔式 (Impossible geometry)|只在特定视点成立的错觉连接|固定正交相机；伪连接[61]|错觉本身就是核心|Monument Valley、Manifold Garden(多)、Antichamber(St)|【局:非欧空间需传送门/模板缓冲】|
|5.7|小星球 (Tiny planet)|可以绕着走一圈的球面世界|球面地形；地平线明显弯曲；径向重力|可以连续行走|Messenger(W，Three.js 制作)[3]、Super Mario Galaxy(Wii/NS)、Outer Wilds(多)|【实】|
|5.8|移轴微缩 (Tilt-shift miniature)|画面上下模糊，高俯角，玩具材质|移轴景深；光滑塑料；高饱和（官方称为"模型布景感"(diorama)）[4]|与1.11比是玩具化的|Link's Awakening(NS,2019)、Captain Toad(NS)|【实(景深后处理 BokehPass 等)】|
|5.9|线框矢量 (Wireframe vector)|黑背景上的发光线框|只画边；自发光+泛光|没有填充面|Battlezone(1980 街机)、Rez Infinite(PS/St)、Tempest 4000(多)|【实(边线几何 EdgesGeometry)】|
|5.10|霓虹几何抽象 (Neon geometric)|几何体加粒子，随音乐驱动|强泛光；节拍同步|比5.9多了体积和粒子|Geometry Wars(X360/St)、Tetris Effect(多)、Thumper(多)|【实】|
|5.11|分形／SDF 数学形体 (SDF/fractal)|用光线步进渲染数学形体|SDF 或分形几何；AO 加雾[66]|完全没有多边形感|Marble Marcher(itch/St)、Hyperbolica(St)、Dreams(PS4)|【实(全屏光线步进 shader)】|
|5.12|剧场布景低模／KRZ式 (Theatrical low poly)|平涂、剪影、舞台光|舞台聚光；平面布景片（评论称融合了布莱希特式舞台与风格派(De Stijl)）[39]|叙事上是剧场化的|Kentucky Route Zero(多)|【实】|
|5.13|俯视柔光低模 (Soft top-down)|低模配强 AO、体积光、浅景深|强明暗对比；俯视加景深|没有玩具材质|Tunic(多)、Death's Door(多)|【实】|

## 6. 体素 (Voxel)

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|6.1|方块体素／Minecraft式|1 米方块加 16px 点采样贴图|立方格；低清像素贴图|有贴图|Minecraft(全平台)|【实(实例化网格 InstancedMesh/面合并)】|
|6.2|纯色体素／MagicaVoxel式|每个体素一个颜色，不用贴图|小体素；AO；调色板|更像微缩模型|Crossy Road(M/多)、Cube World(St)、Cloudpunk(多)|【实】|
|6.3|高精微体素／Teardown式|极小体素，可破坏，光追光照|微体素；光线步进加光追；物理破坏[11]|光照是写实的|Teardown(St/PS/XB)|【局:需体素光线步进，WebGPU 更合适】|
|6.4|平滑体素／行进立方体 (Marching cubes)|从体素场提取出平滑、可挖掘的表面|等值面提取；无纹理色块（Astroneer 官方称"无纹理美学"(textureless aesthetic)）[49]|没有阶梯感|Astroneer(多)、Deep Rock Galactic(多)、No Man's Sky(多)|【实】|
|6.5|体素布景 (Voxel diorama)|体素加切块底座，配正交或移轴镜头|等距相机；切块地形|5.5的体素版|Block'hood(St)，社区里 MagicaVoxel 作品居多|【实】|
|6.6|像素挤出 (Pixel extrusion)|把 2D 像素图挤出成立体|像素块几何；沿用原像素色板|保留 2D 轮廓|Fez(多)、3D Dot Game Heroes(PS3)|【实】|
|6.7|体素＋写实渲染 (Hidden voxel)|底层是体素可建造世界，外观用写实材质|PBR 材质|外观看不出体素|Enshrouded(St)|【局】|

## 7. 像素 (Pixel)

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|7.1|1-bit|只有黑白两色，用抖动表现明暗|2 色；抖动/图案|3D 版本见8.10|Minit(多)、Gato Roboto(多)、World of Horror(多，用 MS Paint 绘制)[58]|【2D】|
|7.2|Game Boy 四色|4 阶绿/灰，分辨率 160×144|4 色 LUT|单色调|Pokémon 红/蓝(GB)、Link's Awakening(GB)|【2D/实(调色表)】|
|7.3|NES 8-bit|固定调色板，每个精灵 3 色，8×8 图块|54 色限制；8×8 tile|颜色少，没有多层视差|Super Mario Bros.(NES)、Shovel Knight(多，放宽了限制)|【2D】|
|7.4|SNES 16-bit|颜色更多，多层视差，Mode 7|15-bit 色；视差层|仍然遵守硬件限制|Chrono Trigger(SNES/M/St)、Stardew Valley(多)|【2D】|
|7.5|现代高位像素 (Hi-bit)|不受硬件限制的大精灵加现代光效|动态光、粒子、高帧动画|不遵守旧限制|Celeste、Owlboy、Eastward、Sea of Stars(多)|【2D】|
|7.6|PC-98／日式电脑像素|16 色抖动加动漫立绘|16 色+抖动|比 NES 更偏"插画"|VA-11 Hall-A(St/NS/PS)、东方 Project 旧作(PC-98)|【2D】|
|7.7|DOS EGA/CGA|16 色或 4 色固定调色板|EGA 16 色／CGA 品红+青|偏西式冒险游戏|King's Quest、Space Quest(DOS)|【2D/实(调色表)】|
|7.8|ZX Spectrum 属性冲突 (Attribute clash)|每个 8×8 格内只能有两色|格内 2 色，鲜艳原色|颜色"冲突"本身就是特征|Manic Miner(ZX)|【实(后处理)】|
|7.9|幻想主机 PICO-8|固定 16 色，128×128 分辨率|固定色板，极低分辨率|现代人的自我设限|Celeste Classic(W)|【2D/实】|
|7.10|HD-2D|像素精灵配 3D 场景，加景深、泛光、动态光|移轴景深；点光源投影；像素精灵用公告板(billboard)[9]|角色是像素，场景是 3D|Octopath Traveler I/II(多)、Triangle Strategy(NS/St)、Live A Live(NS/PS/St)|【实】|
|7.11|3D像素艺术着色器／t3ssel8r式|3D 场景低分辨率渲染成稳定的像素画|低分辨率渲染目标；相机按整像素吸附；法线/深度描边；光照色阶量化[5][38]|一切都是 3D|t3ssel8r 原型[5]、A Short Hike(多)[38]|【实(像素化渲染 RenderPixelatedPass)】|
|7.12|等距像素 (Isometric pixel)|2:1 等距线的像素图块|等距视角；图块拼接|5.5的像素版|Into the Breach(多)、RollerCoaster Tycoon(PC)、FF Tactics(PS1)、Habbo(W)|【2D/实】|
|7.13|像素＋法线光照 (Lit pixel)|像素精灵带法线图，能受动态光影响|2D 法线光照；由 3D 渲染转成像素（公开的流水线文章[10]）|光照是动态的|Dead Cells(多)、Children of Morta(多)、Kingdom Two Crowns(多)|【实】|
|7.14|RPG Maker式|32×32 图块、Q 版行走图、头像对话框|Q 版比例；对话框带头像|有工具模板感|To the Moon(St/NS/M)、OMORI(多)、Undertale(多)|【2D】|
|7.15|伪3D／缩放精灵 (Sprite scaling / Mode 7)|用精灵缩放模拟纵深|追尾视角；条纹道路|没有真正的 3D|OutRun(街机)、Super Mario Kart(SNES)、Slipstream(多)|【实】|

## 8. 复古三维

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|8.1|PS1/PSX|贴图仿射扭曲、顶点抖动、点采样、抖动色|顶点吸附到网格；仿射贴图坐标（无透视校正）；15-bit 色+Bayer 抖动[12]|贴图锐利，会"游泳"|Signalis(多)[63]、Crow Country(多)、Haunted PS1 Demo Disc(itch)|【实[12]】|
|8.2|N64|三点过滤导致贴图模糊，浓雾，顶点着色(Gouraud)|三点双线性过滤[57]；近距离雾；圆润低模|模糊但不抖动|Super Mario 64(N64/NS)、Banjo-Kazooie(N64)、Corn Kidz 64(St)|【实】|
|8.3|Saturn|四边形图元，网格抖动透明，无贴图过滤|网眼式(screen-door)透明；四边形图元[57]|网眼透明是标志|Panzer Dragoon、NiGHTS(Saturn)|【实】|
|8.4|Dreamcast／Y2K主机|亮色、高光泽、早期赛璐珞|强镜面高光；高饱和|比 PS2 更明亮乐观|Sonic Adventure、Shenmue、Crazy Taxi(DC)|【实】|
|8.5|PS2时代|浓雾、泛光、噪点、低模写实|雾、泛光、胶片噪点；去饱和|没有抖动，更写实|Silent Hill 2(PS2)、ICO、Shadow of the Colossus(PS2)|【实】|
|8.6|Quake软件渲染|256 色调色板量化，点采样，棕色调|调色板量化；硬边|颜色是量化过的|Quake(PC)、Dusk(多)、Ultrakill(St)|【实(调色表/量化)】|
|8.7|Build/Doom 2.5D|扇区几何加 8 方向精灵|2.5D 几何；精灵敌人|属于射击游戏传统|Doom(1993)、Duke Nukem 3D(PC)、Ion Fury(多)|【实】|
|8.8|90年代CGI预渲染|预渲染的 3D 转成精灵或背景|早期 CGI 光泽|强调年代感|Donkey Kong Country(SNES)、Myst(PC)、Diablo II(PC)|【材:离线渲染】|
|8.9|降制 (Demake)|把现代作品降到旧主机的限制里|套用旧机规则|针对现代 IP|Bloodborne PSX(PC,免费)|【实】|
|8.10|1-bit抖动3D／Obra Dinn式|实时 3D 的 1-bit 抖动加轮廓线|2 色；抖动必须稳定；描边优先保证可读性[2]|3D 下要解决抖动"跳动"问题|Return of the Obra Dinn(多)|【实(需世界空间稳定抖动)】|
|8.11|单色硬件模拟|模拟特定单色硬件（如 Virtual Boy 红黑）|单色 LUT|红黑立体|Virtual Boy Wario Land(VB)|【实】|

## 9. 中国传统与东方

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|9.1|水墨（泼墨/破墨）(Ink wash)|墨分五色，宣纸晕染，留白|墨阶色阶贴图(ramp)；粗细笔触轮廓；宣纸纹；留白构图（有三维水墨渲染学术研究[35]）|比4.2更重晕染和山水构图|影之刃3(M/PC)、太吾绘卷(St,2D)；网页程序生成山水 {Shan,Shui}*[44]|【局:线条和墨阶可实时，晕染、飞白需噪声或素材】|
|9.2|写意 (Freehand)|简笔，意到即止，大块泼墨|变形简化；大笔触|放弃精确|一念逍遥(M)、鬼谷八荒(St) 的立绘和 UI|【2D为主】|
|9.3|工笔重彩 (Gongbi)|铁线描细线、分染、矿物色、绢本暖底|内描线；分染渐变；绢色底|精确工整|多见于手游立绘/皮肤，3D 案例少|【局:内线+分染贴图】|
|9.4|工笔淡彩|勾线加淡彩晕染|线条+浅透明色|比9.3色浅|同上|【局】|
|9.5|青绿山水 (Blue-green landscape)|石青石绿、赭石打底、层叠山峦|矿物青绿色板；层叠峰峦；皴法纹理|比9.1重彩|绘真·妙笔千山(M，网易×故宫，以《千里江山图》为蓝本)[14]|【实；材:皴法贴图】|
|9.6|金碧山水|青绿加泥金勾勒|金线描边|更富丽|代表作少|【实(金属描边)】|
|9.7|浅绛山水|水墨加淡赭石|墨+浅赭|比青绿淡雅|代表作少|【实】|
|9.8|白描 (Line only)|纯线条，不着色|只有线|没有排线明暗|代表作少，可以做成"线稿模式"|【实】|
|9.9|剪纸 (Paper-cut)|镂空阴阳刻、单色红、锯齿纹|透明度镂空；锯齿/月牙纹|不透光、没有关节|尼山萨满(M)[15]|【实；材:剪纸图样】|
|9.10|皮影 (Shadow puppetry)|半透明彩色兽皮、关节铆点、背光幕布|背光透射；半透明材质；关节摆动|比剪纸多了透光和关节|Projection: First Light(多)[32]|【实】|
|9.11|年画 (Nianhua)|木版粗线、桃红大绿明黄、构图饱满|版印粗线；高饱和套印|传统版印质感|代表作少（多见于节日活动）|【实/材】|
|9.12|敦煌壁画 (Dunhuang mural)|土红石绿底、飞天飘带、剥落龟裂|土红/石绿/青金；剥落贴图；飘带|粗犷且有岁月感|王者荣耀"遇见飞天"(M)[34]|【实；材:剥落贴图】|
|9.13|宋画（院体/文人）(Song painting)|淡雅、绢色暖灰、大量留白、平远构图|低饱和暖灰；平远构图；长焦镜头|极简克制|逆水寒(PC/M，宋代题材；官方美术方法未查到)|【实】|
|9.14|界画 (Ruled-line painting)|用尺规画建筑，平行斜投影|斜二测/正交相机；直尺般的精确线条|线描建筑|江南百景图(M，近似明代风俗画)|【实(正交斜投影)】|
|9.15|青花瓷 (Blue-and-white)|白釉上的钴蓝单色|蓝白色板；釉面清漆层|冷色|代表作少|【实(清漆层 clearcoat+调色表)】|
|9.16|漆器 (Lacquer)|黑红为主加描金，高光泽|黑朱金；清漆高光|暖深色|代表作少|【实】|
|9.17|景泰蓝 (Cloisonné)|金属丝分格加珐琅色块|金线分格；珐琅光泽|不透光|代表作少|【实】|
|9.18|汉画像石／拓片 (Han relief/rubbing)|浅浮雕剪影，黑白拓印|浮雕法线；黑白|有石刻肌理|代表作少|【实】|
|9.19|唐卡 (Thangka)|矿物色加金线，中心对称|对称构图；饱和色|宗教规范严格|代表作少（宗教题材敏感）|【2D】|
|9.20|国潮 (Guochao)|传统纹样配潮流平面撞色|高饱和撞色；纹样+现代字体|现代设计感|多见于手游皮肤和营销|【实】|
|9.21|国风仙侠写实 (Xianxia realism)|写实或半写实，加云海、浮空山、发光法宝|云海、光效、古建|浓郁华丽|天涯明月刀(PC/M)、古剑奇谭三(St)、仙剑七(St/PS/XB)|【局】|
|9.22|国风二次元|二次元赛璐珞配中式建筑和服饰|同3.1，加中式纹样|动漫化|原神·璃月、星穹铁道·仙舟(M/PS/PC)|【实】|
|9.23|浮世绘 (Ukiyo-e)|木版套色、平涂、粗轮廓、图案化的波浪|普鲁士蓝套色；图案化的自然[13]|比年画色更雅|Ōkami(多)|【实】|
|9.24|大和绘 (Yamato-e)|去掉屋顶的俯视（吹拔屋台）加金云分隔|俯视剖切；金云遮罩|更古老、更宫廷|Muramasa(Wii/Vita)|【实】|
|9.25|琳派 (Rinpa)|金箔底加图案化花草|金箔；大胆留空|装饰性强|代表作少|【实】|
|9.26|和风二次元|二次元加和式元素|—|—|阴阳师(M/PC)|【实】|
|9.27|韩国民画 (Minhwa)|平面空间、多视点、饱和矿物色、韩纸纹|平面多视点；虎与喜鹊等题材[33]|比年画更稚拙幽默|没查到以民画为主风格的商业游戏|【2D/实】|
|9.28|丹青彩绘 (Dancheong)|宫殿彩绘：青绿红几何纹|五方色；几何纹|配色和纹样与汉式彩画不同|代表作少|【实(贴图)】|

## 10. 西方艺术运动与平面设计

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|10.1|新艺术 (Art Nouveau)|鞭形曲线、植物纹、光环构图|有机曲线；装饰线|曲线（对比10.2的几何）|Transistor(多)[46]、The Last Express(PC/M，转描)[65]|【实/材:纹样】|
|10.2|装饰艺术 (Art Deco)|几何对称、阶梯形、金黑配色|放射/阶梯形；竖向线条|几何化|BioShock(多)、Grim Fandango(多)|【实】|
|10.3|包豪斯 (Bauhaus)|圆、方、三角加三原色|基本形；原色+黑白|不限于网格|代表作少；Thomas Was Alone(多)比较接近|【实】|
|10.4|风格派 (De Stijl)|正交网格加原色块|网格+原色|严格的网格|Mondrian - Abstraction in Beauty(St)、KRZ 局部[39]|【实】|
|10.5|构成主义 (Constructivism)|红黑白、斜向动势、照片拼贴|对角构图；粗无衬线字|带宣传画感|Persona 5 Tactica(多，UI)[45]、Atomic Heart(多)|【实/UI】|
|10.6|粗野主义 (Brutalism)|裸混凝土巨构，模块重复|巨块几何；混凝土；冷硬光|是建筑而不是平面|Control(多)、NaissanceE(St)|【实】|
|10.7|孟菲斯 (Memphis)|粉彩撞色、波浪线、波点|撞色；波点/锯齿纹|比波普更装饰、更 80 年代|纯孟菲斯代表作少；Pikuniku(St/NS)比较接近|【实】|
|10.8|波普 (Pop art)|Ben-Day 网点、粗黑线、原色|网点；粗描边|比3.8更静态平面|Comix Zone(MD/St)、Hi-Fi Rush[16]|【实】|
|10.9|瑞士国际主义 (Swiss/International)|网格排版、无衬线字、信息图|网格 UI；几何符号|以信息设计为导向|Mini Metro(多/M)、Wipeout(PS1，The Designers Republic 设计)|【实/UI】|
|10.10|Y2K|银色金属、半透明塑料、气泡字体|镀铬/半透明材质；冰蓝银|"乐观科技"|Jet Set Radio Future(XB)、Hypnospace Outlaw(多)|【实】|
|10.11|蒸汽波 (Vaporwave)|粉紫青渐变、古典雕像、Win95 界面|网格地平线；旧操作系统 UI|反讽、拼贴|Paradise Killer(多，近似)|【实】|
|10.12|合成波 (Synthwave/Outrun)|洋红青霓虹、条纹落日、线框地面|线框网格地形；泛光|80 年代复古乐观|Far Cry 3: Blood Dragon(多)、Hotline Miami(多)|【实】|
|10.13|Riso 印刷 (Risograph)|专色叠印、错版、颗粒|2–3 个专色；套印错位；网点（Hylics 被评为"像过了两遍 Riso"）[59]|以印刷瑕疵为美|Hylics(多)|【实(分色+偏移后处理)】|
|10.14|彩色玻璃 (Stained glass)|铅条分区加透光的饱和色块|粗黑铅条；透射发光[64]|透光|Saga of Sins(St)|【实(Voronoi 分区+透射)】|
|10.15|木刻／麻胶版 (Woodcut/linocut)|刀痕、黑白反刻、粗平行线|刀痕排线|比铜版粗犷|Pentiment(印刷章节)[21]|【实】|
|10.16|铜版／蚀刻 (Engraving/etching)|精细排线、交叉线、线宽变化|排线密度表现明暗|更精细|代表作少；Obra Dinn 局部接近|【实(TAM 排线)】|
|10.17|中世纪手抄本 (Illuminated manuscript)|金箔首字母、页边涂鸦、多视点平面|页边装饰；矿物色+金[21]|手绘彩色|Pentiment(多)、Inkulinati(多)|【2D/实】|
|10.18|古希腊黑绘陶 (Black-figure pottery)|黑剪影加刻线细节，陶橙底|黑/陶橙；刻线[18]|比14.5多了刻线和装饰带|Apotheon(St/PS4)|【实】|
|10.19|拜占庭马赛克 (Mosaic)|小方块镶嵌，金底|镶嵌格；金色|石块不规则|代表作少|【实(Voronoi 后处理)】|
|10.20|超现实主义 (Surrealism)|梦境逻辑、尺度错乱、长阴影|尺度错乱；长影|比13.11更"艺术史"|Superliminal(多)、Gorogoa(多/M)、Viewfinder(PS/St)|【实】|
|10.21|Persona式朋克拼贴UI|红黑白、剪报字、倾斜构图|UI 主导；用图形转场[45]|更朋克|Persona 5 Royal(多)|【实(UI层)】|
|10.22|Eyvind Earle式 (Mid-century decorative)|平面化，树木带垂直纹理，风格化色带|垂直纹理；平涂色带|装饰性强|The Banner Saga(多/M)|【2D/实】|

## 11. 素描、版画、线描

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|11.1|铅笔素描 (Graphite)|石墨灰阶、纸纹、排线|手绘铅笔贴图贴在 3D 模型上[17]|单色|Mundaun(多)|【局:需手绘贴图；排线可后处理】|
|11.2|交叉排线 (Crosshatch)|把明暗映射成排线密度|TAM 色调排线贴图；Sobel 描边[7]|比铜版随手|Moebius 式着色器[7]|【实】|
|11.3|圆珠笔／钢笔 (Ballpoint/ink pen)|圆珠笔线条画在纸上|蓝/黑线条；纸底[30]|线条更硬|Inked: A Tale of Love(St/XB)|【实/材】|
|11.4|蓝图／工程制图 (Blueprint)|蓝底白线、尺寸标注、正交视图|正交相机；白色细线|静态制图感|多见于建造/扫描 UI|【实】|
|11.5|黑板粉笔 (Chalk)|深色底、粉笔颗粒、擦痕|颗粒；彩色粉笔|深色底|代表作少|【实】|
|11.6|笔记本涂鸦 (Notebook doodle)|横线或方格纸上的歪线和手写字|纸格；抖动线|学生涂鸦感|Doodle Jump(M)、Line Rider(W)|【实】|
|11.7|白场揭示 (White reveal)|纯白世界，靠颜料或线条显出形状|全白；涂抹揭示|信息是隐藏的|The Unfinished Swan(PS/PC)|【实】|
|11.8|动态抖线 (Line boil)|线条每帧轻微抖动|描边噪声随帧变化|属于动态属性|可作为任意线描风格的修饰参数|【实】|

## 12. 拼贴／剪纸／纸片／手工

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|12.1|纸片人 (Paper cutout)|平面纸片角色放在 3D 世界里|薄片几何；翻面动画|有纸质感和翻面动作|Paper Mario TTYD(NS)|【实】|
|12.2|纸艺世界 (Papercraft world)|一切都是纸做的，能折能撕|纸纤维；折痕；先做实物纸模再数字化[41]|手作感强|Tearaway(Vita)/Unfolded(PS4)|【局/材:实物参照】|
|12.3|卡纸剪贴 (Construction paper)|粗剪边的纯色卡纸，分片关节|剪边；分片动画|不镂空|South Park: Stick of Truth(多)|【实】|
|12.4|拼贴 (Collage)|照片、纸片、杂志片并置|质地混杂；比例错乱[59]|材料异质|LittleBigPlanet(PS3，贴纸)、Hylics(多)|【材:照片/扫描】|
|12.5|纸板／瓦楞 (Cardboard)|瓦楞边、胶带、马克笔|纸板材质|更厚，DIY 感|Yoshi's Crafted World、Nintendo Labo(NS)|【实；材:贴图】|
|12.6|毛线／毛毡 (Yarn/felt)|线迹、毛绒、纽扣|绒面光泽（sheen）；线迹法线（团队曾用真毛线做实物测试[43]）|不是针目纹样|Kirby's Epic Yarn(Wii)、Yoshi's Woolly World(Wii U)、Unravel(多)|【实；材:织物法线】|
|12.7|针织布偶 (Knitted)|有针目纹理的布偶|V 形针目|纹理结构化|Sackboy(PS/St)、LittleBigPlanet(PS3)|【实/材】|
|12.8|实拍黏土 (Real clay)|拍摄真实黏土模型|指纹；定格动画[59]|是实物拍摄|The Neverhood(PC)、Armikrog(多)、Hylics|【材:实拍】|
|12.9|定格／实物扫描 (Handmade + photogrammetry)|手工模型经摄影测量进入 3D|真实手工瑕疵；微缩比例[19][60]|可以自由运镜|Harold Halibut(多)、Lumino City(St/M，实拍布景)|【材:摄影测量】|
|12.10|塑料玩具／手办 (Toy figurine)|注塑塑料光泽、分模线|光滑塑料；微缩感[4]|更像实物玩具|Astro Bot(PS5)、Link's Awakening(NS，被比作 Playmobil)|【实】|
|12.11|乐高积木 (LEGO-like)|带凸点的模块、ABS 高光|标准砖；ABS 材质|有凸点和比例规范|LEGO Builder's Journey(多/M)、LEGO Star Wars: Skywalker Saga(多)|【实】|
|12.12|桌游棋子／木玩 (Board-game pieces)|带底座的棋子放在棋盘格上|俯视；木或塑料|棋盘规则可见|Hitman GO、Lara Croft GO(M/St/PS)|【实】|
|12.13|立体书 (Pop-up book)|翻页时立起的纸结构|展开动画；层叠纸片|有书页框架|The Plucky Squire(多)|【实】|
|12.14|布艺拼布 (Patchwork)|不同花布拼接加缝线|花布；缝线|平面布料|Kirby's Epic Yarn 场景|【实】|

## 13. 氛围与类型美学

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|13.1|赛博朋克霓虹 (Cyberpunk neon)|高密度垂直城市，雨夜霓虹|霓虹+湿地面反射；雨雾|反乌托邦、肮脏|Cyberpunk 2077(多)、Ghostrunner(多)、Cloudpunk(多)|【实】|
|13.2|太阳朋克 (Solarpunk)|绿植覆盖的可持续未来|曲线建筑；日光|对科技乐观|Terra Nil(St/M)、Lightyear Frontier(St/XB)|【实】|
|13.3|柴油朋克 (Dieselpunk)|战间期重工业：铆钉、黑铁、油污|铆钢；锈褐|内燃机时代，更阴沉|Iron Harvest(多)、Wolfenstein: The New Order(多)|【实】|
|13.4|蒸汽朋克 (Steampunk)|黄铜齿轮、蒸汽、维多利亚风|黄铜；蒸汽|更华丽|Frostpunk(多)、SteamWorld Dig 2(多)|【实】|
|13.5|原子朋克 (Atompunk)|50 年代核时代的乐观：镀铬、Googie 建筑|流线圆润；粉彩加镀铬|更早、更乐观|Fallout 4(多)、The Outer Worlds(多)|【实】|
|13.6|卡带未来主义 (Cassette futurism)|70–80 年代的模拟科技：CRT、实体按键|单色 CRT 界面；米色塑料[50]|功能性强，少霓虹|Alien: Isolation(多/M)、Observation(多)|【实】|
|13.7|哥特暗黑幻想 (Gothic dark fantasy)|尖拱、石雕、烛光、浓雾|垂直尖锐；暖色点光对冷色环境|人类尺度|Bloodborne(PS4)、Dark Souls III(多)、Blasphemous(多)|【局】|
|13.8|宇宙恐怖 (Cosmic horror)|不可名状之物，尺度压迫|触手、非欧形体；异常色|超越人类尺度|Dredge(多/M)、Darkest Dungeon(多)|【实】|
|13.9|民俗恐怖 (Folk horror)|乡村仪式、木雕面具|苍白日光；民俗道具|白天下的恐怖|Mundaun(多)、Pathologic 2(多)|【实】|
|13.10|阈限空间 (Liminal spaces)|空无一人的过渡空间加荧光灯|均匀冷荧光；几何重复；空旷[51]|写实而冷清|POOLS(St)、Anemoiapolis(St)、The Exit 8(多)|【实】|
|13.11|梦核／怪核 (Dreamcore/weirdcore)|童年碎片、过曝柔光、不合理拼接|过曝泛光；低清；拼贴|更怪诞|Yume Nikki(PC)、LSD: Dream Emulator(PS1)|【实】|
|13.12|治愈田园 (Cozy/cottagecore)|暖光、圆润、密布小物件|暖光；摇曳动画|前工业时代的田园|Animal Crossing NH(NS)、Stardew Valley(多)、Tiny Glade(St)|【实】|
|13.13|废土荒漠 (Wasteland)|锈蚀、沙尘、临时拼装|沙黄；锈|干燥|Mad Max(多)、Fallout(多)|【实】|
|13.14|绿色末日 (Overgrown apocalypse)|自然重新侵占城市|植被覆盖建筑；林间光|湿润有生机|TLOU(PS/St)、Horizon(PS/St)|【局:植被密度】|
|13.15|Lo-fi 低保真|暖夜景、窗边室内、颗粒柔焦|颗粒、柔焦；慢节奏|都市、夜晚|Coffee Talk(多)、Unpacking(多)|【实】|
|13.16|极简抽象 (Minimalist/abstract)|元素少、大色块、剪影|负空间；单一主色调（沙子用非物理光照模型渲染[26]）|有情绪色彩|Journey(PS/St/iOS)、Abzû(多)、Alto's Odyssey(M/St/NS)|【实】|
|13.17|高奇幻 (High fantasy)|城堡、魔法、饱和的金与蓝|魔法光效|明亮|World of Warcraft(St)、Baldur's Gate 3(St/PS/XB)|【局】|
|13.18|70年代科幻封面 (Pulp sci-fi)|饱和异色天空、奇异星球、巨构|异色天空；巨物比例|偏插画|No Man's Sky(多)|【实】|
|13.19|工业硬科幻 (NASA-punk)|白灰配警示橙，加各种标识|工业材质；标识贴花|现代工业|Hardspace: Shipbreaker(多)|【实】|
|13.20|生物朋克／Giger式 (Biopunk)|有机与机械融合，骨质湿润|湿润有机材质；骨刺|偏物质化|Scorn(St/XB)|【局/材】|

## 14. 2D 绘制风格

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|14.1|橡皮管动画 (Rubber hose, 1930s)|管状无关节肢体、饼眼、白手套|手绘赛璐珞+水彩背景+胶片颗粒[31]|更早、更有弹性|Cuphead(多)、Bendy and the Ink Machine(3D,多)|【2D(3D里可做后处理)】|
|14.2|手绘墨线／空洞骑士式|黑白主体、手绘背景、多层视差雾|剪影化角色；视差；柔雾|角色有脸部和色彩|Hollow Knight、Silksong(多)|【2D】|
|14.3|古典手绘全动画 (Classical full animation)|迪士尼式的全帧动画|全帧；有体积感|更写实|Dragon's Lair(街机)、Aladdin(MD)|【2D】|
|14.4|矢量扁平 (Vector flat)|纯色几何，很少描边|平涂几何|彩色|Kingdom Rush(M/St)、Among Us(多)|【2D/实】|
|14.5|剪影 (Silhouette)|黑色剪影前景加灰雾背景|逆光；颗粒|几乎没有内部细节|Limbo、Inside(多)、Badland(M)|【实】|
|14.6|骨骼切片2D (Cutout rig)|把部件分片后用骨骼变形|骨骼/网格变形[56][54]|比逐帧省产能|Darkest Dungeon(用 Spine)、Rayman Legends、Valiant Hearts(用 UbiArt)|【实】|
|14.7|Live2D立绘|立绘局部网格变形，做呼吸和眨眼|局部网格动画|只动立绘局部|Azur Lane、Arknights(M)、Blue Archive(M/St)|【材:L2D 模型】|
|14.8|视觉小说 (Visual novel)|立绘、背景 CG、文本框|对话框 UI|以静态为主|DDLC(多)、Steins;Gate(多)、逆转裁判(多)|【2D/UI】|
|14.9|Flash时代卡通|粗黑线矢量，动作夸张|粗描边；补间动画|喜剧|Castle Crashers、Super Meat Boy(多)|【2D】|
|14.10|2D格斗高精逐帧|手绘逐帧，高帧率|逐帧|是真 2D|Skullgirls、BlazBlue(多)|【2D】|
|14.11|Vanillaware 日本画厚涂|高精度手绘、骨骼变形、浓色|厚涂；网格变形|有全身动作|Muramasa、Odin Sphere、Unicorn Overlord(NS/PS/XB)|【2D】|
|14.12|转描 (Rotoscope)|描摹真人动作|写实动作，平涂[65]|动作写实|Prince of Persia(1989)、Another World(多)、The Last Express|【材:真人录像】|
|14.13|粗线黑块／羊皮纸哥特|大块纯黑阴影、粗线、暖黄纸调|黑块；暖羊皮纸色（官方说法是刻意避开死灰色）[56]|彩色、哥特|Darkest Dungeon(多)|【实(后处理)】|
|14.14|故意粗糙／外行美学 (Outsider/ugly)|MS Paint 式的粗糙，或刻意做丑|粗线；刺眼的颜色|反设计、带讽刺|World of Horror[58]、Cruelty Squad(St)|【实】|
|14.15|儿童绘本插画 (Storybook)|绘本式的柔和插画|柔和色；绘本构图|是叙事插画|Child of Light(多)、Old Man's Journey(多)|【2D】|

## 15. 混合媒介

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|15.1|2.5D横版|3D 渲染，2D 平面玩法|侧视加景深|角色也是 3D|Trine(多)、Little Nightmares(多)、Ori WotW(XB/St/NS)|【实】|
|15.2|3D世界中的2D精灵 (Billboard sprites)|公告板精灵放在 3D 场景里|公告板(billboard)；固定视角|不一定是像素|Cult of the Lamb(多)、Don't Starve(多)、Ragnarok Online(PC)、Xenogears(PS1)|【实】|
|15.3|3D预渲染成2D|把 3D 模型渲染成精灵，可以带法线|离线渲染出精灵[10]|属于现代用法|Dead Cells(多)、Diablo II、StarCraft(PC)|【材:离线管线】|
|15.4|预渲染背景＋3D角色|静态背景图配实时角色|固定机位|角色是 3D|Resident Evil(1996,PS1)、FF VII(PS1)、Pillars of Eternity(多)|【实(背景平面+深度遮挡)】|
|15.5|FMV／真人影像|以真人视频为主体|视频媒介|不是渲染出来的|Her Story(St/M)、Immortality(多)、Night Trap|【材:视频】|
|15.6|照片即几何|把 2D 照片投射成 3D 空间|照片转几何|空间化的拼贴|Viewfinder(PS/St)|【局】|
|15.7|摄影测量写实 (Photogrammetry)|扫描真实物体和场景|扫描材质（黑神话对古建做了实景扫描）[52]|区别在资产来源|The Vanishing of Ethan Carter(多)、Star Wars Battlefront(2015)、黑神话|【材:扫描】|
|15.8|点云／LiDAR (Point cloud)|只用点云显示整个世界|点几何；按距离编码颜色[20]|是点而不是线|Scanner Sombre(St)、LiDAR Exploration Program(St)|【实(点 Points)】|
|15.9|高斯泼溅 (3D Gaussian splatting)|实景 splat 场景配 3D 角色|splat 几何|没有网格|新兴技术，游戏案例少|【实(用第三方 Web 库)】|
|15.10|2D/3D维度切换|2D 和 3D 视角互换就是玩法|正交与透视切换|切换本身是机制|Fez(多)、Super Paper Mario(Wii)|【实】|
|15.11|3D角色＋手绘2D特效|3D 模型配逐帧 2D 特效|手绘特效序列帧[29]|只有特效是 2D|Arcane(剧集参考)、多数二次元 3D 手游|【材:序列帧】|

## 16. 世界民族与古典艺术（新增）

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|16.1|伊努皮亚特骨雕 (Iñupiat scrimshaw)|不重叠的简洁刻纹线条|刻线；象牙底[36]|极简，不填充|Never Alone(多/M，与原住民长者共创)|【实/2D】|
|16.2|墨西哥民间／亡灵节|镂空彩纸、糖骷髅、亮色|亮粉橙；papel picado 剪纸纹样|图案体系与年画不同|Guacamelee!(多)、Grim Fandango(多)|【实】|
|16.3|中美洲原住民文化|石刻纹样、翡翠和赭色|石刻纹样|古代题材|Mulaka(多，塔拉乌马拉文化)|【实】|
|16.4|印度传统叙事插画|饱和色、侧面人物、装饰边框|装饰边框|—|Raji: An Ancient Epic(多)|【2D/实】|
|16.5|波斯细密画 (Persian miniature)|多视点平面、金色、精细花纹|俯视多视点；宝石色|—|代表作少|【2D】|
|16.6|伊斯兰几何纹 (Islamic geometric)|星形镶嵌、釉砖|程序化几何；釉砖材质|—|Monument Valley(参考了伊斯兰穹顶)[61]、Assassin's Creed Mirage(多)|【实(程序纹样)】|
|16.7|非洲纹样与木雕|Kente、Ndebele 等几何条纹|饱和几何纹|属于文化纹样|Tales of Kenzera: Zau(多)、Aurion(St)|【实】|
|16.8|北欧／维京装饰|动物交织纹、符文石|交织纹；木石材质|—|Northgard(多)、The Banner Saga(多)|【实】|
|16.9|大洋洲／美拉尼西亚|热带岛屿、木雕|—|—|Tchia(PS/St，新喀里多尼亚)|【实】|
|16.10|澳大利亚原住民点画 (Dot painting)|点阵构图|点；大地色|有文化特定性|代表作少；注意神圣图案禁忌|【2D】|

## 17. 技术／媒介模拟（新增）

| # | 名称 | 定义 | 关键视觉机制 | 区别 | 代表游戏 | 实时3D |
|---|---|---|---|---|---|---|
|17.1|ASCII／字符画|用字符格网显示画面|字符网格；终端配色|以字符为单位|Dwarf Fortress(经典版)、Caves of Qud(St)、Stone Story RPG(St/M)|【实(three.js 自带 AsciiEffect)】|
|17.2|CRT扫描线|扫描线、荧光掩膜、屏幕曲面|扫描线/桶形畸变后处理|是显示器效果|多见于复古风作品|【实】|
|17.3|VHS／模拟恐怖 (Analog horror)|跟踪噪声、色彩渗漏、时间码|色度偏移；噪声|是录像带媒介|Paratopic(多)、Backrooms 1998(St)|【实】|
|17.4|故障艺术 (Glitch)|像素块错位、RGB 分离|故障后处理（GlitchPass）|是数字错误|Observer(多)|【实】|
|17.5|热成像／夜视|按温度或亮度做伪彩色|伪彩 LUT|—|Splinter Cell(多)、CoD 热成像|【实】|
|17.6|全息投影 (Hologram)|半透明发光加扫描线|菲涅尔发光|有面，不只是线|Dead Space(多，剧情内全息 UI)|【实】|
|17.7|限色／双色调 (Limited palette/duotone)|画面映射到 2–4 色|限定色板 LUT|可以是彩色|Downwell(多/M)、Obra Dinn(可换色板)|【实】|

**附：UI 风格谱系**（对应"游戏 UI"维度）
- 日式 JRPG 蓝底白框窗口
- 中世纪羊皮纸/卷轴
- 科幻 HUD（线框加青色）
- 剧情内 UI（diegetic，例如 Dead Space 的全息界面）
- 拟物（皮革/金属）
- 扁平/Material 风
- 像素位图字 UI
- 漫画对话框/拟声字
- Persona 式朋克拼贴（10.21）
- 瑞士网格信息设计（10.9）
- 构成主义 UI（10.5）
- 国风卷轴/印章 UI
- 手写笔记本 UI
- CRT 单色终端（13.6）
- 毛玻璃/半透明（glassmorphism）

---

## 情绪／氛围词（36 个，每个对应 2–3 个可观察因素，不绑定固定色板）

| 情绪 | 可观察视觉因素 |
|---|---|
|治愈 Healing|圆润形状；柔和、低对比的阴影；缓慢的循环摇曳动态|
|清冷 Aloof/cool|高明度、低饱和；大面积留白和空旷；动态很少|
|压迫 Oppressive|低机位广角、超尺度巨构；天花板压低或画面上方很"重"；狭窄构图|
|怀旧 Nostalgic|颗粒、低分辨率或老化偏色；旧时代物件；柔焦光晕|
|孤独 Lonely|小人物配大环境；单一光源；空旷的地平线|
|神秘 Mysterious|局部照明；雾气遮挡；只露半个剪影的形体|
|史诗 Epic|远景多层尺度；体积光；仰视机位|
|诡异 Uncanny|熟悉物件错位或重复；没有阴影的均匀光；轻微不自然的动作|
|恐惧 Dread|视野受限（暗角/雾）；黑暗中的负空间；低频闪烁|
|温馨 Cozy|暖色点光源；密集的小物件；柔焦|
|热血 Hot-blooded|斜向构图；速度线或动态模糊；高对比|
|轻快 Playful|弹性的挤压拉伸；圆角；节奏快的小动作|
|庄严 Solemn|对称构图；垂直线条；缓慢的镜头|
|荒凉 Desolate|物件密度低；风沙粒子；褪色材质|
|梦幻 Dreamy|柔光泛光；漂浮粒子；柔和边缘|
|肃杀 Bleak|尖锐形状；冷光；风吹的落叶或雪|
|空灵 Ethereal|半透明材质；留白；高明度的雾|
|颓废 Decadent|剥落腐朽的材质；华丽与破败并置；动作迟缓|
|冷峻 Stern|硬阴影；直线几何；高反差|
|狂野 Wild|不规则形状；粗糙强烈的笔触；高动态|
|优雅 Elegant|细长比例；流畅曲线；克制的元素数量|
|可爱 Cute|大头短身、大眼；柔软材质；弹跳|
|滑稽 Comedic|夸张比例；过度的挤压拉伸；时机错位|
|忧郁 Melancholic|雨或阴天；慢节奏；低饱和或低明度|
|宁静 Serene|水平线构图；缓慢的环境动画；低对比|
|紧张 Tense|倾斜镜头；频闪；紧凑构图|
|希望 Hopeful|逆光；上扬构图；由暗到亮的渐变|
|神圣 Sacred|顶光或光柱；对称；高光集中在一个焦点上|
|荒诞 Absurd|尺度错乱；不合逻辑的组合；平静地呈现怪事|
|疏离 Alienated|广角空旷；几何重复；人物远而小|
|原始 Primal|粗糙纹理；火光；大地材质|
|浪漫 Romantic|柔焦；低角度的夕照；飘落粒子（花瓣/光点）|
|迷幻 Psychedelic|色相循环；扭曲波动；图案重复|
|禅意 Zen|极简；留白；自然材质（石、木、水）|
|喧嚣 Bustling|高物件密度；多层动态的人群和旗帜；多光源|
|怀旧科技 Retro-tech|CRT 扫描线；实体按键；单色屏幕光|

## 文化与世界题材（34 个：关键视觉标记与常见陷阱）

| 题材 | 关键视觉标记 | 常见陷阱（避免刻板印象） |
|---|---|---|
|中式市井|青瓦、木构、牌匾、幌子、摊贩密度|满屏红灯笼和金龙；朝代混用（宋淡雅、清浓艳）|
|中式园林|框景、借景（漏窗、月洞门）、曲廊、太湖石、倒影|苏州园林和皇家园林混搭|
|武侠|竹林、客栈、镖局、写实古装、轻功动势|全员白衣飘飘；兵器形制混乱|
|仙侠|云海、浮空山、发光法宝、仙鹤|泛光和粒子过量，盖住了造型|
|东方幻想（山海经）|异兽、巫傩面具、青铜纹|符号拼贴化；可以参考三星堆、楚漆器的真实形制|
|江南水乡|粉墙黛瓦、石拱桥、烟雨|只做灰白两色，忽略了生活色彩|
|西北／丝路|夯土、胡杨、驼队、壁画|"异域"东方主义化|
|中国少数民族|苗银、经幡、蒙古包、刺绣|服饰张冠李戴；把宗教符号当装饰|
|日式和风|鸟居、町屋、和纸灯、四季植物|只剩武士、忍者、樱花；中日元素混淆|
|韩式|韩屋、丹青、韩纸、民画|和中、日风格混为一谈|
|欧洲中世纪|石堡、木框架房屋、纹章、彩窗|一律泥泞灰暗（史实上色彩很丰富）|
|维多利亚|煤气灯、红砖、铸铁、雾霾|只做伦敦；忽视殖民语境|
|北欧／维京|木长屋、符文、峡湾、极光|带角头盔（不符合史实）|
|古典希腊罗马|大理石、柱式、马赛克|纯白雕像（原本是彩绘的）|
|中东／阿拉伯|几何纹样、穹顶、市集|只有沙漠、头巾和反派；把阿拉伯、波斯、奥斯曼混为一谈|
|波斯|蓝釉砖、四分园、细密画|同上|
|南亚|神庙雕刻、纺织色彩、细密画|把神祇当怪物；只剩贫穷和混乱滤镜|
|东南亚|高脚屋、雨林、吴哥石刻、蜡染|各国混同|
|拉美／墨西哥|彩色土坯房、亡灵节、papel picado 剪纸|"墨西哥黄滤镜"；只拍毒枭|
|中南美古文明|阶梯金字塔、石刻|血腥献祭奇观化|
|非洲|杰内泥建筑、Kente 织物、Ndebele 几何纹|把非洲当成一个国家；只有草原和野生动物|
|非洲未来主义 (Afrofuturism)|传统纹样与高科技融合|把纹样当装饰贴纸用|
|美国西部|台地荒漠、木板小镇、风车|原住民刻板形象|
|美式小镇 (Americana)|餐车餐厅、郊区住宅、加油站|对时代的过度怀旧滤镜|
|北极／原住民|冰原、骨雕纹样|没有原住民共创（可参考 Never Alone[36]）|
|大洋洲岛屿|木雕、珊瑚礁、独木舟|"原始部落"化|
|苏联／东欧|赫鲁晓夫楼、马赛克壁画、粗野主义|苦难滤镜和单一灰色|
|赛博都市|霓虹汉字和假名、雨夜、超高密度|技术东方主义（techno-orientalism）|
|太空|舰船、空间站、星云|没有尺度参照，看不出大小|
|海洋／深海|焦散、体积光、生物发光|可见度和尺度失控|
|极地／冰原|高明度雪地、蓝阴影、风雪粒子|一片死白，没有层次（雪地需要冷暖对比）|
|末日废土|锈蚀、拼装、尘土|所有末日都用同一个棕色滤镜|
|童话森林|巨树、蘑菇、光柱|过度可爱化，失去了"童话的暗面"|
|当代都市|便利店、地铁、招牌|广告牌和商标侵权；城市特征混同|

---

## 给"探索台"的落地备注（简要）

**关于覆盖面**
- 上面 225 条风格大部分能由一组共享的实时模块拼出来，主要包括：
  - 卡通色阶材质（toon ramp）和描边（背面外扩或 Sobel 边缘检测）；
  - 后处理链：像素化、半调网点、Kuwahara 笔触、抖动、调色表、泛光、移轴景深、胶片颗粒、CRT/VHS、故障效果；
  - 材质库：PBR、绒面光泽（适合织物和毛线）、清漆层（适合漆器和瓷器）、透射（适合皮影和彩窗）；
  - 程序纹理：纸纹、画布、排线；
  - 相机预设：正交等距、斜投影、固定机位、移轴；
  - 几何模式：平直着色、体素、行进立方体、公告板精灵、点云、SDF 光线步进。
- three.js 官方已经提供的相关模块，见 [5][42] 的文档页。

**需要专用素材的风格**大致分 7 类：
- 真实水彩或手绘贴图（4.7、1.6、11.1）
- 手调法线和逐帧姿态（3.2）
- 实拍或扫描的手工制品（12.8、12.9）
- 摄影测量和 3DGS（15.7、15.9）
- 视频（15.5）
- Live2D 模型（14.7）
- 2D 特效序列帧（15.11）

**可信度说明**
- 标了"代表作少"的条目（例如工笔、青花、唐卡、民画、彩铅、孟菲斯），我没查到可靠的商业游戏代表作，建议在探索台里用"参照艺术品"代替"参照游戏"。
- 原神式渲染的技法只有社区逆向分析（[8]），没有官方说明。
- 逆水寒、江南百景图的美术方法，我没找到官方说明。
- Sable 的描边具体实现，目前没有官方技术资料。

---

## 来源（Sources）

1. Guilty Gear Xrd GDC 2015：[GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)；[Motomura 讲义 PDF](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf)
2. Obra Dinn：[PlayStation Blog](https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style)；[Simon Willison 对开发日志的转述](https://simonwillison.net/2017/Nov/23/return-of-the-obra-dinn/)
3. Messenger（Three.js）：[Wikipedia](https://en.wikipedia.org/wiki/Messenger_(video_game))；[80.lv](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game)
4. Link's Awakening 移轴/模型布景：[Nintendo Everything（青沼访谈）](https://nintendoeverything.com/aonuma-on-how-the-art-style-came-to-be-for-zelda-links-awakening-on-switch/)；[GamePro](https://www.gamepro.de/artikel/zelda-links-awakening-switch-look,3345549.html)
5. 3D 像素：[80.lv t3ssel8r](https://80.lv/articles/tips-on-convincing-animations-for-3d-pixel-art-games)；[three.js RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html)
6. Sable：[Cook & Becker](https://www.cookandbecker.com/en/article/170/exploration-through-line-art.html)；[Gamereactor](https://www.gamereactor.eu/sables-art-style-influenced-by-akira-french-comics-and-more/)；[Game Developer](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability)
7. [Maxime Heckel：Moebius 风格后处理](https://blog.maximeheckel.com/posts/moebius-style-post-processing)
8. 原神式卡通（社区分析，非官方）：[URPSimpleGenshinShaders](https://github.com/NoiRC256/URPSimpleGenshinShaders)；[Blender NPR 复刻](https://bjayers.artstation.com/blog/category/5)
9. HD-2D：[Unreal Engine Spotlight](https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true)；[Wikipedia HD-2D](https://en.wikipedia.org/wiki/HD-2D)
10. Dead Cells 3D→像素流水线：Thomas Vasseur 的文章《Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells》（Game Developer，原 Gamasutra）；[Devpost 复刻项目](https://devpost.com/software/the-dead-cells-animation-pipeline)
11. Teardown：[Software Engineering Daily](https://softwareengineeringdaily.com/2025/01/02/teardown-and-voxel-based-rendering-with-dennis-gustafsson/)；[TechRadar](https://www.techradar.com/gaming/consoles-pc/ray-tracing-is-so-crucial-to-teardown-that-the-world-goes-black-if-you-turn-it-off)
12. PS1 着色器：[Godot Shaders](https://godotshaders.com/shader/ps1-shader/)；[Codrops R3F 抖动着色器](https://tympanus.net/codrops/?p=80278)
13. Ōkami：[Wikipedia](https://en.wikipedia.org/wiki/%C5%8Ckami)；[Inlander](https://www.inlander.com/news/the-player-2180185)
14. 绘真·妙笔千山：[少数派](https://sspai.com/post/52301)；[17173](https://news.17173.com/content/06052018/105438053.shtml)
15. 尼山萨满：[少数派](https://sspai.com/post/45735)；[爱范儿](https://www.ifanr.com/app/1072586)
16. Hi-Fi Rush：[GDC Vault 2024](https://gdcvault.com/play/1034330/3D-Toon-Rendering-in-Hi)；[80.lv](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style)
17. [Mundaun（TheSixthAxis）](https://www.thesixthaxis.com/2020/10/09/how-mundaun-brings-hand-drawn-terror-to-its-alpine-setting)
18. Apotheon：[Ancient World Magazine](https://www.ancientworldmagazine.com/reviews/apotheon-2015/)；[Hyperallergic](https://hyperallergic.com/a-bloody-video-game-ode-on-a-grecian-urn)
19. Harold Halibut：[Capturing Reality](https://capturingreality.com/Article-RealityCapture-and-HaroldHalibut)；[Creative Bloq](https://www.creativebloq.com/features/making-harold-halibut)
20. [Scanner Sombre（TechCrunch）](https://techcrunch.com/2017/04/24/scanner-sombre-arms-you-with-lidar-for-a-gorgeous-creepy-explore-em-up)
21. [Pentiment 美术深度解析（Game Developer）](https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment)
22. Firewatch：[GDC Vault](https://gdcvault.com/play/1023707/The-Art-of)；[Campo Santo 博客](https://blog.camposanto.com/post/112703721804/this-blog-post-is-an-in-detail-explanation-of-part)
23. 旷野之息"绘画风"：[Zelda Universe](https://zeldauniverse.net/2017/03/14/takizawa-explains-how-the-wind-waker-hd-inspired-the-visual-style-for-breath-of-the-wild/)；[Nintendo Everything](https://nintendoeverything.com/art-director-on-why-zeldas-art-style-constantly-changes-and-how-breath-of-the-wilds-look-was-made/)
24. Borderlands：[Destructoid](https://www.destructoid.com/borderlands-explains-its-not-cel-shaded-actually-art-style/)；[Cook & Becker](https://cookandbecker.com/en/article/212/bucking-the-brown-shooter-trend.html)
25. [Disco Elysium PAX 预览（RPG Codex）](https://rpgcodex.net/article.php?id=11001)
26. [Journey 沙子渲染（GDC Vault）](https://gdcvault.com/play/1017742/Sand-Rendering-in)
27. [Tales of Arise TGS 2019](https://en.bandainamcoent.eu/tales-of/news/tales-of-arise-tgs-2019)
28. Dordogne：[AUTOMATON 访谈](https://automaton-media.com/en/interviews/20230621-19630/)；[Wikipedia](https://en.wikipedia.org/wiki/Dordogne_(video_game))
29. [Arcane 制作流程（RedShark News）](https://redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline)
30. [Inked: A Tale of Love（Xbox 商店）](https://www.xbox.com/en-US/games/store/-/9N2JG2V8QKPF)
31. [Cuphead 制作（GamesRadar）](https://gamesradar.com/the-making-of-cuphead)
32. [Projection: First Light（Unwinnable）](https://unwinnable.com/?p=81471)
33. [Minhwa（Wikipedia）](https://en.wikipedia.org/wiki/Minhwa)
34. 敦煌联动：[爱范儿](https://www.ifanr.com/1133838)；[澎湃](https://www.thepaper.cn/newsDetail_forward_7067726)
35. [三维水墨渲染论文（电子与信息学报）](https://jeit.ac.cn/cn/article/doi/10.11999/JEIT140434)
36. Never Alone：[Cliqist](https://cliqist.com/2014/11/29/art-never-alone/)；[MoMA 馆藏](https://www.moma.org/collection/works/404439)
37. Kuwahara 滤镜：[Heckel：绘画着色器](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders)；[Codrops Susurrus](https://tympanus.net/codrops/?p=113145)
38. [A Short Hike（PlayStation Blog）](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)
39. [Kentucky Route Zero（Rhizome）](https://old.rhizome.org/editorial/2013/aug/27/kentucky-route-zero-adventure-appalachian-limbo)
40. [Lethal Company（Windows Central）](https://windowscentral.com/gaming/lethal-company-was-2023-best-indie-game-surprise-so-brilliant-cant-stop-playing)；[画质设置指南](https://www.gameskinny.com/tips/best-lethal-company-graphics-settings-detailed/)
41. Tearaway：[PocketGamer.biz](https://www.pocketgamer.biz/unfolding-story-the-making-of-tearaway/)；[GamesBeat](https://gamesbeat.com/tearaway-is-a-love-letter-to-paper/)
42. three.js：[HalftonePass](https://threejs.org/docs/pages/HalftonePass.html)；[DotScreenPass](https://threejs.org/docs/pages/DotScreenPass.html)
43. [Yoshi's Woolly World 访谈（Nintendo Life）](https://www.nintendolife.com/news/2015/06/interview_knitting_together_the_pattern_of_yoshis_woolly_world_and_cuddly_amiibo)
44. [{Shan, Shui}*（CMU STUDIO）](https://studioforcreativeinquiry.org/?p=12894)
45. Persona UI：[SEGAbits / Famitsu 访谈](https://segabits.com/?p=54918)；[Inverse：P5 Tactica 构成主义](https://inverse.com/gaming/persona-5-tactica-user-interface)
46. [Transistor 新艺术风（Destructoid）](https://www.destructoid.com/transistors-sword-was-a-briefcase-at-one-point/)
47. [How Townscaper Works（Game Developer）](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
48. [Valheim 画面分析（TheSixthAxis）](https://www.thesixthaxis.com/2021/05/17/what-makes-a-game-look-good/)
49. [Astroneer（IGF）](https://igf.com/astroneer)
50. 卡带未来主义：[Film Stories](https://filmstories.co.uk/features/cassette-futurism-alternatives-to-the-sci-fi-space-aesthetic-that-almost-every-game-uses/)；[feedme.design](https://feedme.design/cassette-futurism-in-video-games)
51. [POOLS / 阈限空间（Jestr）](https://www.jestr.gg/games/pools)
52. [黑神话实景扫描（新华网）](https://www.news.cn/politics/20240822/d77d96fa7d7146ad8304c6d28c6eccc8/c.html)
53. Gravity Rush：[PlayStation Blog](https://blog.playstation.com/archive/2012/05/02/the-art-of-gravity-rush-on-ps-vita)；[AV Club](https://avclub.com/gravity-rush-carries-on-the-artistic-legacy-of-jean-mo-1798244973)
54. [UbiArt / Valiant Hearts（MCV）](https://www.mcvuk.com/business-news/publishing/how-the-ubiart-framework-encourages-risk-at-ubisoft/)
55. 实时水彩：[Montesdeoca 等，Art-directed Watercolor](https://diglib.eg.org/handle/10.2312/exp20161063)；[MNPR](https://diglib.eg.org/items/908efe9f-fb6a-4d3e-98b6-bda5d952c71e/full)
56. Darkest Dungeon：[Road to the IGF（Game Developer）](https://www.gamedeveloper.com/audio/road-to-the-igf-red-hook-studios-i-darkest-dungeon-i-)；[GameSpot](https://www.gamespot.com:443/articles/the-gothic-sensibilities-of-darkest-dungeon/1100-6424880/)
57. 旧主机贴图过滤与透明：[Emulation GameTechWiki](https://emulation.gametechwiki.com/index.php/Texture_filtering)；[Time Extension（Saturn 抖动透明）](https://www.timeextension.com/news/2026/03/the-sega-saturn-was-truly-ahead-of-its-time-heres-why-modern-games-use-dithering-instead-of-transparency)
58. [World of Horror（Wikipedia）](https://en.wikipedia.org/wiki/World_of_Horror)
59. Hylics：[Retroware](https://articles.retroware.com/2020/10/13/video-games-analog-and-digital-meet-in-hylics-2/)；[PC Gamer](https://pcgamer.com/remembering-hylics-the-surreal-art-rpg)
60. [Lumino City（MCV）](https://mcvuk.com/development-news/crafting-the-lumino-city)
61. [Monument Valley 十周年（MacStories）](https://www.macstories.net/linked/monument-valley-at-10-the-story-of-the-most-meticulous-puzzle-game-ever-created/)
62. [Bomb Rush Cyberfunk 评测（Slant）](https://slantmagazine.com/games/bomb-rush-cyberfunk-review)
63. [Signalis 一周年回顾（Inverse）](https://inverse.com/gaming/signalis-one-year-anniversary-retrospective-horror-game)
64. [Saga of Sins 彩色玻璃风（Outsider Gaming）](https://outsidergaming.com/german-developed-saga-of-sins/)
65. The Last Express：[Jordan Mechner 官网](https://www.jordanmechner.com/last-express)；[AUTOMATON](https://automaton-media.com/en/reviews/20231208-23849/)
66. Dreams 渲染器：[Media Molecule 博客](https://www.mediamolecule.com/blog/article/siggraph_2015)；[SIGGRAPH 2015 幻灯片](https://advances.realtimerendering.com/s2015/AlexEvans_SIGGRAPH-2015-sml.pdf)
