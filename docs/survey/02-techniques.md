<!-- 来源：渲染技术目录调研（2026-10-13 调研子代理报告原文存档，未经人工校对；数据会在后续里程碑中核验与补充） -->

# 游戏美术风格探索台：技术目录（three.js r186 · Vite + TS）

这份目录覆盖你列的 11 个维度，另加 3 个补充维度，共 200 多项技术。每项都按你要的 7 列写：名称、肉眼看到的效果、可做成滑块/档位的参数、Three.js 实现要点、常见误区、性能成本、参考来源。

几点说明：
- **核实程度。** three.js 的 r180–r186 迁移说明、MeshToonMaterial / LightShadow / WebGLRenderer 文档、RetroPassNode 和 ToonOutlinePassNode 文档、`tsl/display` 文件列表、examples 名称，都是我打开原页面或源码核对过的。一部分经典论文和教程的 URL 是我凭已知地址填的，没有逐个打开。少数社区来源标了"未核实"或"社区"。
- **GDC Vault 不登录看不了。** 我只读到会话简介和二手报道，看不到幻灯片和视频。
- **Tunic 和 BotW 没找到一手渲染细节。** 它们的配方是根据报道写的，不是开发者原话。

---

## 0. 先读：r186 版本事实，以及灵感 prompt 的问题

### 0.1 会影响探索台架构的 r180–r186 事实
| 事实 | 影响 | 来源 |
|---|---|---|
| **有两条管线**：`WebGLRenderer`（经典材质 + `onBeforeCompile` + `EffectComposer`）和 `WebGPURenderer`（`three/webgpu`，NodeMaterial + TSL + `RenderPipeline`，没有 WebGPU 时会退回 WebGL2）。`onBeforeCompile` 对 NodeMaterial 无效。 | 探索台得先选一条主管线。导出给 AI agent 的规格里必须写明用哪条，否则 agent 会把两种 API 混用。 | [WebGPU 后处理手册](https://threejs.org/manual/en/webgpu-postprocessing) |
| r183 把 `PostProcessing` 改名为 **`RenderPipeline`**；`Clock` 弃用，改用 `Timer`。 | 旧教程里的代码直接复制会报错。 | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) |
| **很多风格化后处理只有 TSL 版本**：`RetroPassNode`（PS1）、`tsl/display/CRT.js`（barrelUV/scanlines/vignette/colorBleeding）、`tsl/math/Bayer.js`（`bayerDither`）、`toonOutlinePass`、`PixelationPassNode`、`SobelOperatorNode`、`OutlineNode`、`GodraysNode`、`Lut3DNode`、`FilmNode`、`ChromaticAberrationNode`、`Sepia`、`BleachBypass`、`SSSNode`、`GTAONode`、`DepthOfFieldNode`、`BloomNode`、`MotionBlur`、`radialBlur`/`hashBlur`/`boxBlur`、`lensDirt`、`SharpenNode`、`TRAANode`/`FSR1Node` 等。噪声在 `tsl/math` 下有 `curlNoise`、`voronoiNoise`；核心 TSL 里有 `posterize`、`mx_noise_float`、`mx_worley_noise_float`。 | 风格化后处理选 WebGPU/TSL 路线收益最大。WebGL 路线这边是 `examples/jsm/postprocessing` 的约 30 个 Pass 加 `examples/jsm/shaders` 的约 50 个 Shader。 | [tsl/display 目录](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/tsl/display)、[webgpu_postprocessing_retro](https://threejs.org/examples/#webgpu_postprocessing_retro)、[RetroPassNode](https://threejs.org/docs/pages/RetroPassNode.html) |
| **阴影**：r182 起 WebGL 的 `PCFSoftShadowMap` 弃用，**`PCFShadowMap` 本身变成软阴影**（Vogel disk + IGN 采样）；r186 在 WebGPU 上直接移除了 PCFSoft。r186 的 `shadowMap.type` 只剩 `BasicShadowMap / PCFShadowMap / VSMShadowMap`。`shadow.radius` 对 Basic 无效，`blurSamples` 只作用于 VSM。 | 见 0.2 第 1 条。 | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)、[LightShadow](https://threejs.org/docs/pages/LightShadow.html)、[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) |
| r186 其他变更：`SimplifyModifier` 改用 meshoptimizer，`modify()` 变成 async；`Sky`/`SkyMesh` 删掉 `up` uniform（固定 +Y）；r183 删掉 Sky 的旧 gamma；`LightProbeGrid` 改名 `LightProbeGridWebGL`；新增 `Object3D.dispose()`；原生 `GaussianSplat`（只支持 WebGPU）。r185 删掉 `AnamorphicNode`，GTAO 变暗、变宽。 | — | 同上、[r186 splat](https://radiancefields.com/three.js-ships-its-native-gaussian-splat-renderer-and-splat-raycasting-in-r186) |
| 色彩管理默认开启：`outputColorSpace = SRGBColorSpace`，`toneMapping = NoToneMapping`；可选 Linear / Reinhard / Cineon / ACESFilmic / **AgX** / **Neutral** / Custom。 | 见 §6。 | [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) |
| 灯光强度从 r155 起改为物理单位（`useLegacyLights` 在 r165 移除）。 | 旧教程里的光强数值不能直接用。 | Migration Guide |

### 0.2 灵感 prompt 体检：原文里的技术假设有几处是错的或会互相冲突
| # | 原文 | 实际情况（r186） | 导出时建议的写法 |
|---|---|---|---|
| 1 | "DirectionalLight **PCFShadowMap 硬阴影**" | r182+ 的 PCF 默认是软阴影。 | 要硬阴影就写 `BasicShadowMap` + 足够大的 `mapSize`；或者在着色器里对 shadow 因子做 `step()` 量化。 |
| 2 | "Canvas **3 阶 Gradient Map**（彩色）" | MeshToonMaterial 的 `gradientMap` **只读 R 通道**，必须设 `min/magFilter = NearestFilter`、`colorSpace = NoColorSpace`（默认值），并关掉 mipmap。 | 色阶写成灰度 ramp，颜色交给 `material.color`；如果要"阴影偏蓝/偏紫"，就得自定义光照（见 §3）。 [MeshToonMaterial 文档](https://threejs.org/docs/pages/MeshToonMaterial.html) |
| 3 | Toon + 阴影 | 我读了 shader chunk：toon 只对 **N·L** 做 ramp 查表，阴影是乘到 `directLight.color` 上的，**不会被量化**。所以 PCF 的软边会穿过色阶，出现灰色渐变带。 | 写成"阴影因子也必须阈值化"，或者改用 BasicShadowMap。 |
| 4 | ramp 的坐标 | 查表坐标是 `dotNL*0.5+0.5`（half-Lambert 映射）。不给 gradientMap 时，默认是 0.7/1.0 两阶，阈值在 0.7，并用 fwidth 抗锯齿。 | 3 阶等分 ramp 的阈值在 N·L = ±1/3，背光面也会出现中间调。滑块应该直接暴露"阈值位置"。 |
| 5 | `toNonIndexed()` 面着色 + Inverted Hull | 非索引几何在硬边处法线分裂，外壳挤出时**会裂开**。 | 在 `mergeVertices` 之后的几何上算出平滑法线，另存为一个 attribute 专门给描边挤出；或者保持索引几何，改用 `material.flatShading = true`。 |
| 6 | 按高度给每个面上色 | `flatShading` 不会让 vertexColors 变平，三角形内部仍会插值。 | 必须用非索引几何，每个三角形的 3 个顶点写同一个颜色。 |
| 7 | `PlaneGeometry` 做低多边形地形 | 规则网格的对角线全朝一个方向，看起来有明显的机器感条纹。 | 加 XZ 方向的顶点抖动、交替对角线，或者用 Poisson-disc + Delaunay。 |
| 8 | 高饱和色板 | ACES 会让纯色偏色、高光去饱和；AgX 会明显变灰（[论坛](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)）。 | 色板要精确就用 `NoToneMapping` 或 `NeutralToneMapping`，或对个别材质设 `toneMapped = false`。 |
| 9 | "OrthographicCamera **等距**" | 真等距（俯角 35.264°）和 2:1 二等角（俯角 30°）不是一回事。 | 做成档位；正交相机下，平行光的阴影相机要框住视口并跟着相机移动，并对齐到 texel 网格防止阴影闪烁。 |
| 10 | "胶囊小人**贴地**行走" | 顶点被抖动或离散化之后，噪声原函数算出的高度和实际网格表面不一致。 | 用三角形重心插值，或 BVH 射线投射到实际网格上。 |
| 11 | "水边浮动" | 浮物和水面波形必须共用同一个波函数，在 CPU 上复算。 | 在规格里明确写出这一点。 |
| 12 | 昼夜循环 | 只降低光强，画面会整体发灰。 | 色温、半球光天地色、雾色、天空渐变要一起按时间插值。 |

---

## 1. 地形与世界结构

| 技术 | 视觉效果 | 关键参数（滑块/档位） | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| Value/Perlin 噪声 | 平缓连续的起伏 | frequency、amplitude、seed、offset | `three/addons/math/ImprovedNoise.js`（3D Perlin），在 CPU 上写 `position.y`；GPU 侧可用 TSL `mx_noise_float` | 只用一层看起来像果冻丘陵，不像山 | 低（一次性） | [iq fBm](https://iquilezles.org/articles/fbm/) |
| Simplex / OpenSimplex | 和 Perlin 类似，方向性伪影更少 | 同上 | `three/addons/math/SimplexNoise.js` 或 npm `simplex-noise` | 和 Perlin 的视觉差别远小于参数带来的差别，不值得做成主档位 | 低 | [Red Blob terrain](https://www.redblobgames.com/maps/terrain-from-noise/) |
| fBm 分形叠加 | 大形、中形、细节三层叠出自然地貌 | octaves 1–8、lacunarity≈2、gain≈0.5 | 循环叠加多层噪声 | 细节频率超过网格采样极限时会变成噪点状尖刺。低模网格上 octaves>4 基本没意义 | 低 | iq fBm |
| Ridged multifractal | 尖锐山脊和峡谷 | offset、sharpness（平方/立方）、逐层反馈权重 | `(offset-abs(n))^2`，每层用上一层的结果加权 | 不加遮罩会满图都是山脊 | 低 | [iq morenoise](https://iquilezles.org/articles/morenoise/) |
| Billow / turbulence | 圆鼓丘陵、卵石滩、云团 | 同 fBm | 每层取 `abs(noise)` 再叠加 | 和 ridged 是镜像关系，可以放在同一组档位里 | 低 | iq fBm |
| Domain warping 域扭曲 | 流动、扭曲、像被侵蚀过的有机形态 | warp 强度、warp 频率、嵌套 1–3 层 | `f(p+h(p))` 或 `fbm(p+fbm(p+fbm(p)))` | 强度过大会变成大理石纹 | 低–中 | [iq warp](https://iquilezles.org/articles/warp/) |
| Worley/Cellular（Voronoi） | 石板、龟裂、玄武岩柱、岛链 | F1 / F2 / F2-F1、jitter、距离度量（欧氏/曼哈顿/切比雪夫） | TSL `mx_worley_noise_float`、`tsl/math/voronoiNoise.js` | F2-F1 最适合做裂缝线；切比雪夫距离会出现方块感 | 低–中 | [webgpu_materialx_noise](https://threejs.org/examples/#webgpu_materialx_noise) |
| 高度重映射（Redistribution） | 平谷陡峰，或台地 | 指数 k 0.5–4、曲线编辑器 | `pow(h,k)` 或 LUT 曲线 | 不重映射的话到处都是"半山腰" | 低 | Red Blob |
| Terracing 梯田/台阶 | 层叠的台地，或等高线色带 | 阶数、台阶软硬（smoothstep 宽度）、每阶抖动、"只量化颜色/也量化几何"开关 | `floor(h*n)/n` 加平滑；改了几何后必须重算法线 | 直接 floor 会产生纯竖直墙面，法线退化；色带和几何台阶是两种不同效果 | 低 | Red Blob |
| 岛屿 falloff 遮罩 | 四周入海的岛 | 形状（圆/方/超椭圆）、指数、海岸噪声、岛数 | `h=mix(h,1-d,w)` 或 `h*=1-d^p` | 纯圆形 falloff 的岛像个盘子，距离 d 要加噪声 | 低 | Red Blob |
| Biome：高度×湿度（Whittaker 图） | 沙滩/草地/森林/岩石/雪分带，并有干湿差异 | 各阈值、湿度噪声尺度、温度随海拔递减率、过渡抖动 | 第二张噪声加一张 2D biome 查找纹理；面着色需要非索引几何 | 只按高度分带像生日蛋糕的条纹 | 低 | Red Blob、[mapgen4](https://www.redblobgames.com/maps/mapgen4/) |
| 坡度着色 | 陡坡露岩，平地长草 | 坡度阈值、过渡宽度 | 用 `normal.y` 判断 | 面着色时交界处会呈锯齿状跳色，可以当作一种风格 | 低 | — |
| Hydraulic erosion 水力侵蚀 | 沟壑、冲积扇、写实山体 | 水滴数、inertia、侵蚀/沉积率、蒸发、半径 | 放在 Worker 里预计算，或用 GPU，结果写回高度图 | 低模分辨率会把侵蚀细节吞掉，应先在高分辨率下侵蚀再简化 | 中–高（一次性） | [SebLague/Hydraulic-Erosion](https://github.com/SebLague/Hydraulic-Erosion) |
| Thermal erosion 热力侵蚀 | 碎石坡、塌落 | 安息角（talus）、迭代次数 | 相邻高度差超过阈值时搬运物质 | — | 中 | — |
| 导数 fBm（近似侵蚀） | 低成本的侵蚀感 | 导数抑制强度 | iq 的解析导数噪声 | — | 低 | iq morenoise |
| 河流 / 流量累积 | 河道、湖泊 | 降雨量、河宽阈值 | 沿下坡方向累积流量 | 直接在噪声地形上挖河，会出现"往上坡流"的河 | 中 | mapgen4 |
| Poisson-disc + Delaunay 不规则三角网 | 有机低多边形，看起来像手工建模 | 点密度、最小间距、按坡度/海拔调整密度 | npm `delaunator` 生成三角形后构建 BufferGeometry | 规则网格的对角线条纹问题（见 0.2 第 7 条） | 低 | [Red Blob 多边形地图](https://www.redblobgames.com/maps/polygon-map-generation/)、[Bridson 2007](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf) |
| 方格 tiles | 方块化的高度柱，桌游感 | tile 尺寸、高度阶数、侧裙边、倒角、间隙 | InstancedMesh 或合并网格 | — | 低 | — |
| 六边形 tiles | 策略/桌游感 | 半径、高度级、侧壁、倒角、间隙 | 用 axial/cube 坐标；6 段 CylinderGeometry 实例化 | 用 offset 坐标做邻接计算很痛苦 | 低 | [Red Blob hex](https://www.redblobgames.com/grids/hexagons/) |
| 不规则四边形网格（Townscaper） | 有机的小镇和自然弯曲的街道 | 松弛迭代次数、细分级 | 三角形合并成四边形，松弛后用 dual-grid 放模块 | — | 中 | [How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) |
| Marching squares / dual-grid 自动拼块 | 圆润的海岸和墙体拼块 | 拼块集（16 或 47 块）、圆角 | 按角点采样后查表放模块 | 标准 autotile 需要 47 块，dual-grid 只要 16 块 | 低 | 同上 |
| 方块体素 | Minecraft 风格 | 体素大小、greedy 合并、体素 AO | greedy meshing 加顶点 AO | 每个体素一个 Mesh 会直接卡死 | 低–中 | [0fps greedy](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)、[0fps 体素 AO](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/) |
| Marching cubes | 平滑的洞穴、悬崖、拱桥（高度场做不出悬垂） | 等值面阈值、分辨率 | `addons/objects/MarchingCubes.js` 偏向 metaball，做地形要自己写 | 二值场直接跑 MC 会出现台阶锯齿 | 中 | [Bourke](https://paulbourke.net/geometry/polygonise/)、[webgl_marchingcubes](https://threejs.org/examples/#webgl_marchingcubes) |
| Surface nets / Dual contouring | 更规整的平滑体素；DC 能保留棱角 | 同上 | 每个格子放一个顶点 | Surface nets 会把棱角磨圆 | 中 | [0fps surface nets](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/) |
| Tiny planet 小星球 | 弧形地平线，走几步就能看到曲率 | 半径、地形振幅/半径比、大气边缘光 | 在球面上采样 3D 噪声；用 cube-sphere 或 icosphere；角色 up = normalize(pos)，用四元数对齐 | UV sphere 在两极会挤压；相机 up 不跟着更新会翻转 | 中 | [Messenger (80.lv)](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game) |
| 浮空岛 | 顶面是草地，底部是倒锥形岩石，整体浮动 | 底部深度、收缩率、岩层色带、浮动幅度 | 顶部用高度场，底部反向挤出并加噪声 | 底部不加噪声看起来像蛋筒 | 低 | — |
| 微缩底座（Diorama plinth） | 切下来的一块地，侧面露出土层剖面，下面是木底座 | 底座形状（方/圆/六边）、侧壁高、地层色带、倒角 | 把地形裁切到边界，侧壁用挤出或手动缝合 | 侧壁和地表法线不连续时，描边会断开 | 低 | 配合 §8 的 tilt-shift |
| WFC 波函数坍缩 | 模块化拼成的村庄、城市、地牢 | tileset、权重、邻接规则、是否回溯、种子 | 逻辑放在 Worker 里，输出格子后实例化模块 | 规则矛盾时需要回溯；图大了很慢 | 中 | [mxgmn](https://github.com/mxgmn/WaveFunctionCollapse)、[Boris the Brave](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/)、[marian42](https://marian42.de/article/wfc/) |
| BSP 地牢 | 方正的房间加走廊 | 最小房间尺寸、分割比、走廊宽 | 递归二分空间 | 太规整，需要加入房间形状变化 | 低 | [RogueBasin BSP](https://www.roguebasin.com/index.php/Basic_BSP_Dungeon_generation) |
| 元胞自动机洞穴 | 有机形状的洞穴 | 初始填充率约 45%、4-5 规则、迭代次数 | 在 2D 网格上迭代 | 会生成孤立洞穴，要用 flood fill 保证连通 | 低 | [RogueBasin CA](https://www.roguebasin.com/index.php/Cellular_Automata_Method_for_Generating_Random_Cave-Like_Levels) |
| Rooms & Mazes | 房间加迷宫走廊 | 房间尝试次数、蜿蜒度、死路清除 | — | — | 低 | [Nystrom](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/) |
| 城市街区 | 路网、地块、楼体 | 路网类型（网格/放射/L-system）、街区尺寸、楼高分布、密度衰减 | 路网转多边形地块，挤出楼体，用实例化渲染 | 楼高全随机就没有天际线层次 | 中 | [Parish & Müller 2001](https://cgl.ethz.ch/Downloads/Publications/Papers/2001/p_Par01.pdf) |
| 植被散布 | 植被自然分布且成簇 | 最小间距、密度图（噪声×biome）、坡度/海拔限制、成簇度 | Poisson-disc 加密度遮罩，输出到 InstancedMesh | 纯随机会穿插重叠；纯 Poisson 又太均匀 | 低 | Bridson |

---

## 2. 几何表示

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| 平滑着色 | 圆润，看不出面片 | — | 先 `BufferGeometryUtils.mergeVertices` 焊接顶点，再 `computeVertexNormals()` | 顶点没焊接时会留下硬缝 | 低 | — |
| Faceted low-poly 面片化 | 每个三角面有独立明暗 | 面数、方式（非索引几何 / flatShading） | ①`toNonIndexed()` + `computeVertexNormals()`；②`material.flatShading=true`（基于导数计算，几何保持索引） | **flat shading ≠ 低多边形**：低多边形靠的是又少又大的面加清晰轮廓，高面数加 flat 只是磨砂感。②不会让 vertexColors 变平 | 低 | [MeshStandardMaterial 文档](https://threejs.org/docs/pages/MeshStandardMaterial.html) |
| EdgeSplit 按折角混合 | 折角小于阈值的平滑、大于阈值的保留硬边 | cutOffAngle | `addons/modifiers/EdgeSplitModifier.js` | — | 低 | [webgl_modifier_edgesplit](https://threejs.org/examples/#webgl_modifier_edgesplit) |
| 顶点抖动 | 打破规则感，像手工做的 | 幅度、只 XZ 或含 Y、种子、边界锁定 | 索引几何改共享顶点就不会裂；非索引几何要用位置 hash 保证同一位置的顶点偏移一致 | 非索引几何直接随机会裂开 | 低 | — |
| 三角化方向 | 规则条纹、交替或无序 | 模式 | 自己构建 index | — | 低 | — |
| 倒角 / 圆角 | 玩具感、黏土感，边缘有一条高光 | 倒角半径、段数 | `RoundedBoxGeometry`、`ExtrudeGeometry({bevelEnabled,bevelSize,bevelSegments})`、`CapsuleGeometry` | 没有倒角的硬边太"CG"；倒角太大又像泡泡 | 低 | — |
| Loop 细分 | 光滑有机的形体 | 迭代次数、split、preserveEdges、flatOnly | `three-subdivide` 的 `LoopSubdivision.modify()` | 每迭代一次面数×4，迭代 3 次就是×64 | 中 | [webgl_modifier_subdivision](https://threejs.org/examples/#webgl_modifier_subdivision) |
| Tessellation 曲面细分 | 均匀加密，方便做顶点动画 | maxEdgeLength、迭代次数 | `TessellateModifier` | — | 中 | [webgl_modifier_tessellation](https://threejs.org/examples/#webgl_modifier_tessellation) |
| 减面 | 高模变低模 | 目标比例 | `SimplifyModifier`（r186 起 async） | 自动减面得不到"美术低模"那种对称、大面、讲究轮廓的效果 | 中（一次性） | Migration Guide |
| 网格体素化 | 模型变成体素艺术 | 体素尺寸、内部填充、取色方式 | three-mesh-bvh 的 voxelize 示例，或射线奇偶判断 | 不用 BVH、直接用 Raycaster 会非常慢 | 中（一次性） | [Codrops 体素](https://tympanus.net/codrops/2023/03/28/turning-3d-models-to-voxel-art-with-three-js/)、[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) |
| Instancing 实例化 | 大量重复的物件 | 数量、随机缩放/旋转/颜色 | `InstancedMesh.setColorAt`、`BatchedMesh` | 逐实例的变化需要用 instance attribute | 低 | [webgl_instancing_scatter](https://threejs.org/examples/#webgl_instancing_scatter) |
| Billboard / Sprite | 始终朝向相机的面片 | 轴锁定（全向 / 只绕 Y） | `Sprite`；只绕 Y 轴的需要自写顶点着色器 | 正交顶视角下全向 billboard 会"躺平"消失 | 低 | [webgl_sprites](https://threejs.org/examples/#webgl_sprites)、[instancing_billboards](https://threejs.org/examples/#webgl_buffergeometry_instancing_billboards) |
| Impostor 冒名顶替 | 远景用贴图代替复杂物体 | 视角数、atlas 分辨率 | 八面体 impostor 烘焙 | 光照是烘死的，昼夜循环下不正确 | 低 | [Octahedral impostors](https://shaderbits.com/blog/octahedral-impostors) |
| 纸片 / 卡片角色（2D 放进 3D） | 手绘纸片在 3D 场景里移动 | 朝向模式、纸厚（叠层）、描边、投影 | Plane 加 `alphaTest`/`alphaHash`；阴影用 `customDepthMaterial` 支持 alpha | 透明物排序问题；侧光下纸片的影子只有一条线 | 低 | [Cult of the Lamb](https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb) |
| 2.5D 分层 / HD-2D | 像素精灵加 3D 场景，配合景深和 tilt-shift | 层数、层距、视差、DOF | 正交相机或窄 FOV 透视 | — | 低 | [Octopath HD-2D](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true) |
| Sprite stacking 切片堆叠 | 用 2D 切片叠出伪体素 | 切片数、层间距 | 多层 Plane 实例化 | 视角一低就穿帮 | 低 | — |
| Metaball / SDF | 黏土、糖果、融合的形体 | smooth-min k、分辨率 | MarchingCubes，或在片元着色器里 raymarch | raymarch 很难和场景深度、阴影融合 | 中–高 | [iq smin](https://iquilezles.org/articles/smin/) |
| CSG 布尔运算 | 挖洞、切削 | — | `three-bvh-csg` | 布尔后的法线和拓扑会比较脏 | 中 | [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) |
| 程序化树 | 有枝干结构的树 | 分叉层数、角度、长度衰减、叶团 | L-system、space colonization，或 `ez-tree` | — | 中 | [ez-tree](https://github.com/dgreenheck/ez-tree) |
| Gaussian Splat | 扫描级写实 | — | r186 的 `GaussianSplat`，只支持 WebGPU | 和描边、toon 基本不兼容 | 高 | 见 0.1 |

---

## 3. 着色模型

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| Unlit / 纯色 | 平涂，完全不受光 | color、vertexColors | `MeshBasicMaterial` | 不加描边、AO 或顶点色烘焙的话，体积感会完全丢失 | 极低 | — |
| Lambert | 柔和的漫反射 | color、emissive | `MeshLambertMaterial` | — | 低 | — |
| Half-Lambert / Wrap 光照 | 暗部被抬亮、更柔和，背光面不死黑 | wrap 0–1、平方开关 | WebGL：`onBeforeCompile` 替换 `RE_Direct`；WebGPU：继承 `LightingModel` 实现 `direct()` | 不符合物理；和 AO、阴影叠加后暗部容易发灰 | 低 | [Valve Half-Lambert](https://developer.valvesoftware.com/wiki/Half_Lambert)、[Valve 2006](https://advances.realtimerendering.com/s2006/Mitchell-ShadingInValvesSourceEngine.pdf)、[GPU Gems ch16](https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering) |
| Phong / Blinn | 塑料感的高光点 | shininess、specular | `MeshPhongMaterial` | — | 低 | — |
| PBR Standard | 能量守恒的材质 | roughness、metalness、envMapIntensity | `MeshStandardMaterial` + PMREM/`RoomEnvironment` | **PBR ≠ 写实**：高饱和纯色、无纹理、圆润形体配 PBR，出来的是玩具/黏土/Pixar 风。没有环境贴图时金属是黑的 | 中 | [webgl_lights_physical](https://threejs.org/examples/#webgl_lights_physical) |
| PBR Physical 扩展 | clearcoat 像车漆、糖果、塑料玩具；sheen 像绒布、毛毡；transmission 像玻璃、果冻；iridescence 像肥皂泡、甲虫壳；anisotropy 像拉丝金属、头发；dispersion 是色散 | clearcoat/Roughness、sheen/Color/Roughness、transmission/thickness/attenuation、iridescence/IOR/thickness、anisotropy/Rotation、dispersion | `MeshPhysicalMaterial` | transmission 会多一个渲染 pass，开销大 | 中–高 | [clearcoat](https://threejs.org/examples/#webgl_materials_physical_clearcoat)、[transmission](https://threejs.org/examples/#webgl_materials_physical_transmission)、[sheen](https://threejs.org/examples/#webgl_loader_gltf_sheen)、[iridescence](https://threejs.org/examples/#webgl_loader_gltf_iridescence)、[anisotropy](https://threejs.org/examples/#webgl_loader_gltf_anisotropy) |
| Toon ramp / Gradient map | 明暗分成 N 阶色块 | 阶数 2–5、各阶阈值、阶间软硬、各阶亮度 | `MeshToonMaterial` 或 `MeshToonNodeMaterial` 的 `gradientMap`：用 DataTexture(RedFormat) 加 NearestFilter | 见 0.2 第 2–4 条：只读 R 通道；阴影不被量化；坐标是 half-Lambert；环境光、半球光会把色阶对比压平；多光源会叠出额外的阶 | 低 | [文档](https://threejs.org/docs/pages/MeshToonMaterial.html)、[webgl_materials_toon](https://threejs.org/examples/#webgl_materials_toon)、[webgpu_materials_toon](https://threejs.org/examples/#webgpu_materials_toon) |
| 自定义 Cel：阴影着色 + 阴影阈值化 | 暗部是独立的阴影色（偏蓝/紫），投影也是硬边 | 阈值、软硬（smoothstep 宽度）、阴影色、高光阈值、"阴影因子参与阈值"开关 | `mix(shadowColor, litColor, smoothstep(t-w, t+w, NdotL*shadow))`。WebGL 用 `onBeforeCompile` 替换 `RE_Direct_Toon` / `lights_fragment_begin`；WebGPU 参考 `ToonLightingModel` 自定义 | 只把颜色乘暗，得到的是"脏灰"阴影，不是"色彩阴影" | 低 | [Roystan toon](https://roystan.net/articles/toon-shader/) |
| Gooch 冷暖光照 | 亮面偏暖、暗面偏冷，形体清晰 | warm 色、cool 色、α、β | 自定义光照：`mix(cool, warm, NdotL*0.5+0.5)` | 会改变物体固有色的观感 | 低 | [Gooch 1998](https://users.cs.northwestern.edu/~ago820/SIG98/abstract.html) |
| Matcap | ZBrush 黏土、金属球那种"烘焙光照" | matcap 贴图 | `MeshMatcapMaterial` | 不响应场景光和阴影；相机旋转时高光不变，因为基于视图空间法线 | 极低 | [webgl_materials_matcap](https://threejs.org/examples/#webgl_materials_matcap) |
| SDF 面部阴影（原神类） | 脸上的阴影形状由美术控制，随光向平滑移动 | 阈值贴图、脸部前向/右向、平滑度 | 在脸部 UV 上采样阈值图，和"光向与脸朝向的夹角"比较，每帧传入头骨方向 | 只适用于脸这类单一部件；外部投影投到脸上会不稳定 | 低 | [SDF 面部阴影流程（社区）](https://erichu33.notion.site/Face-Shadow-Map-Creation-Baking-Workflow-d3b8769021e04683a2f2ae4cf16ac810)、[Hi-Fi Rush 面部阈值图（机核）](https://www.gcores.com/articles/181912) |
| Rim / Fresnel 边缘光 | 轮廓发亮，角色从背景里跳出来 | power、宽度、阈值、颜色、"只在受光侧"开关 | `pow(1-N·V, p)`，乘以 N·L 遮罩 | 低多边形的大平面法线恒定，会整面一起变亮 | 低 | [TF2 NPAR 2007](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf) |
| 深度偏移等宽边缘光 | 屏幕上等宽的硬边缘光 | 偏移像素、阈值 | 读深度纹理，沿法线方向偏移采样后比较深度差 | 需要深度 prepass | 中 | — |
| Toon 高光 | 硬边高光斑，可以是条纹或星形 | 阈值、大小、软硬、拉伸方向 | `step(t, pow(N·H, s))` | — | 低 | Roystan |
| Hatching 排线（TAM） | 铅笔/钢笔排线表现明暗 | 色调层数（6）、笔触密度、角度、交叉层数 | Tonal Art Maps 加 mipmap 保持笔触尺寸；简易版可用 `shaders/ToonShader.js` 里的 `ToonShaderHatching` | 普通纹理排线在远处会糊、近处太粗 | 中 | [Praun 2001](https://hhoppe.com/proj/hatching/) |
| Stippling 点描 | 点的疏密表现明暗 | 点大小、密度、屏幕空间/物体空间 | `ToonShaderDotted` 或自写 | 屏幕空间点阵会有"浴室门"漂浮效应（见 §5） | 低–中 | [Secord 2002](https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/) |
| Painterly 笔触纹理 | 表面带画笔笔触（Arcane 式） | 笔触尺度、方向（沿切线/流向）、边缘噪声 | 物体空间的笔触纹理去调制 ramp 阈值 | 笔触尺度和镜头距离不匹配时会"糊"或"爬" | 中 | [Meier 1996](https://dl.acm.org/doi/10.1145/237170.237288) |
| 各向异性头发高光（Kajiya-Kay） | 沿发丝方向的天使环 | 切线偏移、两层高光的指数和颜色 | 自定义着色；`MeshPhysicalMaterial.anisotropy` 可以近似 | 需要可靠的切线 | 中 | [Scheuermann 2004](https://web.engr.oregonstate.edu/~mjb/cs557/Projects/Papers/HairRendering.pdf) |
| 次表面散射近似 | 皮肤、蜡、玉石的通透感 | wrap、透光颜色、distortion/power/scale、厚度图 | `SubsurfaceScatteringShader`（快速透光近似）；[webgpu_materials_sss](https://threejs.org/examples/#webgpu_materials_sss) | 和 toon 混用会把色阶抹平 | 中 | [Barré-Brisebois GDC 2011](https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/) |
| 黏土 / 指纹感 | 定格黏土动画的质感 | 法线噪声尺度/强度、指纹贴花、粗糙度波动、sheen | 三平面映射的噪声法线，或 `DecalGeometry` | 法线噪声太强看起来像皮肤病 | 低–中 | [webgl_decals](https://threejs.org/examples/#webgl_decals) |
| 毛毡 / 绒面 | 毛绒玩具、羊毛毡 | sheen、sheenRoughness、绒边 rim | `MeshPhysicalMaterial.sheen` | 只靠 sheen 不够，还需要轮廓"毛边" | 中 | 同 sheen |
| 顶点色烘焙光照 / AO | 低成本的体积感 | AO 强度 | 离线烘焙进 vertex color | — | 极低 | — |
| 2D Ramp 图集 | 每种材质一行 ramp，或白天/夜晚各一行 | 行号、按时段插值 | 用 (N·L, 材质ID/时间) 采样 ramp | — | 低 | [崩坏3 Unite 2018 幻灯片](https://docswell.com/s/UnityJapan/KWLQP5-unite-tokyo-20183rd) |
| 法线编辑 / 代理法线 | 阴影形状干净（GGXrd 的脸、蓬松树冠） | 向代理形状法线的混合度 | 离线把法线投射到球、柱等代理形体上，或存成自定义 attribute | 只改法线不改轮廓，侧面会穿帮 | 低 | [Blendernation：Motomura 幕后](https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/) |

---

## 4. 描边与线条

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| Inverted Hull 反面外壳 | 卡通外轮廓线 | 粗细、颜色、alpha、宽度空间（物体/视图/裁剪空间）、距离缩放上下限、z 偏移、逐顶点宽度 | WebGL：`addons/effects/OutlineEffect.js`，在裁剪空间挤出并乘以 `pos.w`，所以屏幕宽度恒定；默认 thickness 0.003，每个材质可用 `userData.outlineParameters` 覆盖。WebGPU：`toonOutlinePass(scene,camera,color,thickness,alpha)`，只作用于 Toon 材质 | 硬边或非索引几何会裂开（见 0.2 第 5 条）；画不出内部折线和交线；薄物体会被外壳穿透；每个物体多一次 draw call | 中（draw×2） | [OutlineEffect 源码](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/effects/OutlineEffect.js)、[ToonOutlinePassNode](https://threejs.org/docs/pages/ToonOutlinePassNode.html)、[Ameye](https://ameye.dev/notes/rendering-outlines/) |
| 平滑法线外壳 | 硬边模型的描边也不裂 | 法线来源（平滑法线 attribute / 顶点色 / 切线） | 在 mergeVertices 之后的副本上算法线，再拷回原几何作为 `outlineNormal` | — | 低 | Ameye |
| 宽度模式 | 世界空间宽度（近粗远细）、屏幕恒宽、按距离限幅 | 模式、min/max | 世界空间：`pos + n*w`；屏幕空间：裁剪空间偏移乘 w | 透视相机下用世界空间宽度，远景线会消失 | 低 | Ameye |
| 线色随表面着色 | 线色是底色的深色版，像吉卜力那种柔和线 | 加深系数、色相偏移、和黑色的混合比 | 外壳着色器里采样 base color 后乘系数 | 纯黑线配高饱和色板会显得廉价、生硬 | 低 | [GGXrd GDC 2015](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The) |
| 深度 + 法线边缘检测（后处理） | 内外线都有，线宽统一 | 深度阈值（按距离缩放）、法线阈值、线宽（核尺度）、线色、按距离淡出、掠射角遮罩、算子（Roberts / Sobel / Frei-Chen） | WebGL：多一个法线 pass 或用 MRT，再跑自定义 ShaderPass；WebGPU：`pass()` + `mrt({output, normal: normalView})` 再 `sobel()` 或自写 | three 自带的 `SobelOperatorShader`/`SobelOperatorNode` 处理的是颜色亮度，不是几何边缘，所以会描出纹理边和色阶边；深度阈值固定时远处斜面会误检；MSAA 对后处理无效 | 中 | [webgl_postprocessing_sobel](https://threejs.org/examples/#webgl_postprocessing_sobel)、[Omar Shehata 描边](https://omar-shehata.medium.com/how-to-render-outlines-in-webgl-8253c14724f9) |
| 物体 / 表面 ID 边缘 | 部件之间干净的分界线，适合 ligne claire（法比漫画清线）风格 | ID 粒度（物体 / 材质 / 面组） | 每个部件渲染一个 ID 色，对 ID 缓冲做边缘检测 | 同一部件内部的折线要靠法线边缘补 | 中 | 同上（Shehata 的 surface ID 改进） |
| 颜色差边缘 | 色块之间出线，像漫画 | 色差阈值 | 对 albedo 缓冲做检测 | 渐变色会产生乱线 | 中 | — |
| 折线（Crease lines） | 机械、建筑感的折线 | thresholdAngle、线宽（px/世界单位） | `EdgesGeometry` + `LineSegments2`/`LineMaterial`（fat lines，`linewidth`、`worldUnits`）；条件线（LDraw 式）可以补画轮廓 | WebGL 原生线宽恒为 1px；EdgesGeometry 不生成光滑曲面的轮廓线 | 低–中 | [webgl_lines_fat](https://threejs.org/examples/#webgl_lines_fat)、[LDraw 条件线](https://discourse.threejs.org/t/ldraw-like-edges/17100) |
| 精确可见边投影 | 技术插画、SVG 风 | — | `three-edge-projection` | CPU 计算重，不适合实时 | 高 | [three-edge-projection](https://github.com/gkjohnson/three-edge-projection) |
| Fresnel 轮廓线 | 物体内侧的边缘变暗 | power、宽度 | 见 §3 Rim | 只对球形物体有效 | 低 | Ameye |
| OutlinePass / OutlineNode | 选中高亮式的发光外轮廓 | edgeStrength、edgeGlow、edgeThickness、pulsePeriod、可见/遮挡边颜色 | `postprocessing/OutlinePass.js`，TSL `OutlineNode` | 这是选中高亮效果，不是卡通描边：线柔和、发光、只有外轮廓 | 中 | [webgl_postprocessing_outline](https://threejs.org/examples/#webgl_postprocessing_outline) |
| JFA 超宽描边 | 贴纸式的超粗外轮廓 | 宽度（像素） | Jump Flood 距离场 | — | 中 | [Ben Golus](https://bgolus.medium.com/the-quest-for-very-wide-outlines-ba82ed442cd9) |
| 模糊 / 膨胀描边 | 贴纸、发光描边 | 核大小、硬化阈值 | 遮罩 → 模糊 → 阈值化 | 宽度大时开销很大 | 中 | Ameye |
| 贴图内线（GGXrd 的 "Motomura line"） | 关节、肌肉、衣褶处干净的内线 | — | 把线画在贴图上，并让线和 UV 轴对齐成水平或垂直像素，避免锯齿 | 需要专门的 UV 布局，不是能自动生成的效果 | 低 | [GGXrd GDC](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The) |
| 线宽变化 | 线有粗细，更像手绘 | 按深度（近粗）、按光照（暗侧粗）、按曲率、末端 taper | 外壳逐顶点宽度，或后处理按亮度/深度调制 | 全部等宽会显得机械 | 低–中 | [Spider-Verse 线条 SIGGRAPH 2023](https://history.siggraph.org/learning/linework-in-spider-man-across-the-spider-verse-by-grochola-maccari-lee-and-boulet-gilly) |
| 抖动 / 沸腾线（boiling lines） | 手绘感线条，以 8–12fps 跳变 | 振幅、频率、跳帧率、多笔叠加数 | 边缘 pass 的采样 UV 加噪声偏移，噪声种子按 floor(t·fps) 步进 | 每帧都变会闪得让人难受，必须降频 | 低 | [Maxime Heckel Moebius](https://blog.maximeheckel.com/posts/moebius-style-post-processing) |
| 毛笔 / 水墨线 | 有起收笔、飞白的线 | 笔刷纹理、起收笔锥度、干笔噪声 | 用笔刷噪声调制边缘遮罩；沿轮廓生成 ribbon 带（较贵） | — | 中–高 | [Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami) |
| 隐藏线虚线（蓝图风） | 背面线显示为虚线 | 虚线长度、间隔 | `LineDashedMaterial`，配 `depthFunc` 只画被遮挡部分 | — | 低 | [webgl_lines_dashed](https://threejs.org/examples/#webgl_lines_dashed) |

---

## 5. 表面媒介后处理

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| 水彩 | 抽象色块、边缘颜料沉积、颗粒、渗色、纸纹 | 抽象强度、边缘加深、颗粒度、渗色半径、纸张扭曲、颜料湍流、纸纹锚定方式 | 多 pass：抽象（Kuwahara 或模糊）→ 边缘加深（模糊前后之差）→ 颗粒（纸高度 × 颜料浓度）→ 渗色 → 纸纹 | **只叠一张纸纹不等于水彩**，必须有边缘加深和渗色；屏幕空间纸纹会有浴室门效应 | 中–高 | [Bousseau 2006](https://artis.inrialpes.fr/Publications/2006/BKTS06)、[MNPR 2018](https://diglib.eg.org/handle/10.1145/3229147-3229162)、[Codrops Susurrus](https://tympanus.net/codrops/?p=113145) |
| Kuwahara（基础 / 广义 / 各向异性） | 油画、水粉的笔触色块 | 半径、扇区数 4/8、锐度 q、各向异性（结构张量）、pass 数 | 自写 ShaderPass 或 TSL；在低分辨率 RT 上处理 | 基础版会出方块伪影；大半径全屏很贵；细线会被它吃掉，所以线条要放在它之后画 | 高 | [Maxime Heckel 绘画着色](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders)、[Kyprianidis 2009](https://umsl.edu/~kangh/Papers/kang_cgf09.pdf) |
| 油画 | Kuwahara 加厚涂光照加画布纹理 | 厚涂法线强度、画布尺度 | 用 Kuwahara 结果的亮度当高度，算法线后打光 | — | 高 | MNPR |
| 水墨（sumi-e） | 灰阶墨韵、宣纸、晕染 | 墨阶数、纸色、晕染模糊、笔刷噪声、朱红点缀色 | 亮度 → 墨浓度查表，加边缘水墨线，再叠宣纸纹 | 只做黑白滤镜不是水墨，需要留白和浓淡 | 中 | [Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami) |
| 半调 / 网点 | 漫画网点、印刷网点 | 形状（圆点/椭圆/线/方块）、半径、R/G/B 角度、scatter、混合、灰度 | `HalftonePass`；TSL 半调示例 | 屏幕空间网点在镜头移动时会漂浮（漫画风可以接受）；网点尺寸要乘以 devicePixelRatio | 低 | [webgl_postprocessing_rgb_halftone](https://threejs.org/examples/#webgl_postprocessing_rgb_halftone)、[webgpu_tsl_halftone](https://threejs.org/examples/#webgpu_tsl_halftone) |
| 后处理交叉排线 | 墨稿式排线阴影 | 层数、每层角度、线距、线粗、每层亮度阈值 | 按亮度阈值叠加多组方向的线 | — | 低 | [Maxime Heckel Moebius](https://blog.maximeheckel.com/posts/moebius-style-post-processing) |
| Posterize 色阶化 | 招贴画式的色块 | 级数 2–32、量化空间（RGB/亮度/OKLab） | TSL `posterize()`，或 ColorCorrection 类 shader | RGB 三通道分别量化会导致色相跳变；在线性空间和 sRGB 空间量化，色带分布不同 | 极低 | — |
| Dithering 抖动 | 复古像素颗粒、有限色阶 | 算法（Bayer 2/4/8、蓝噪声、白噪声）、色阶数、像素尺度、调色板 | TSL `bayerDither()`（`tsl/math/Bayer.js`）；蓝噪声用纹理采样；误差扩散（Floyd-Steinberg）只能离线做 | 要先转线性空间再阈值化，否则渐变会过早变亮；Bayer 有亮度偏差 | 低 | [Surma Ditherpunk](https://surma.dev/things/ditherpunk/)、[Maxime Heckel 抖动](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web)、[蓝噪声纹理](https://momentsingraphics.de/BlueNoise.html) |
| Obra Dinn 式 1-bit 世界稳定抖动 | 1-bit 黑白版画，镜头转动时点阵不游动 | 双色调色板、抖动类型、贴图锚定（屏幕 / 相机球面）、线条强度 | 把抖动图案映射到以相机为中心的球面上，转镜头时稳定；同时叠加边缘线 | 纯屏幕空间抖动在转镜头时会游动、闪烁；1-bit 不加线条就读不懂画面 | 低–中 | [Lucas Pope 开发日志](https://forums.tigsource.com/index.php?topic=40832.msg1363742#msg1363742) |
| Pixelation 低分辨率渲染加最近邻放大 | 3D 像素画 | 像素尺寸 1–16、法线边缘强度、深度边缘强度、调色板 | `RenderPixelatedPass(pixelSize, scene, camera)` 及其 `normalEdgeStrength`/`depthEdgeStrength`；TSL `PixelationPassNode` | 不做吸附的话边缘会"爬"；透视相机下无法完全消除像素抖动；UI 和文字不能一起像素化 | 低（反而更省） | [webgl_postprocessing_pixel](https://threejs.org/examples/#webgl_postprocessing_pixel)、[webgpu_postprocessing_pixel](https://threejs.org/examples/#webgpu_postprocessing_pixel) |
| 像素完美的相机吸附 | 平移、旋转时像素网格稳定 | 平移吸附、旋转吸附步进（如 45°）、缩放吸附 | 官方 pixel 示例里有 `pixelAlignCamera`、`pixelAlignFrustum`、`pixelAlignedPanning`：先吸附相机，渲染完再恢复真实变换；平滑滚动用"亚像素余量偏移放大图"实现 | 只吸附相机、不吸附物体，物体仍会抖 | 低 | 同上、[Texel Splatting（arXiv 2026）](https://arxiv.org/abs/2603.14587) |
| t3ssel8r 式 3D 像素画 | 正交、低分辨率，深度/法线描边加高光边、toon、云影 | 同 Pixelation，加高光色、阴影色 | Pixelation + 边缘高光 + 吸附 + 调色板 | — | 低 | [t3ssel8r YouTube](https://www.youtube.com/@t3ssel8r)、[godotshaders 移植版](https://godotshaders.com/shader/3d-pixel-art-outline-highlight-post-processing-shader/) |
| 调色板量化 | 强制所有颜色落在指定色板里 | 调色板、距离度量（RGB/OKLab）、抖动量、严格度 | 从色板生成 3D LUT 再查表（便宜），或在 shader 里逐色求最近 | 在 RGB 空间求最近色会产生奇怪的跳色，用 OKLab 更好 | 低 | [Lospec](https://lospec.com/palette-list)、[OKLab](https://bottosson.github.io/posts/oklab/) |
| PS1 模拟 | 顶点抖动、仿射纹理扭曲、低分辨率、色深降低、雾 | 分辨率比例（默认 0.25≈320×240）、仿射强度、色深 4–32、抖动、是否过滤纹理 | TSL `retroPass(scene,camera,{affineDistortion})`，示例里还接了 `barrelUV`、`bayerDither`、`posterize`、`colorBleeding`、`vignette`、`scanlines` | PS1 是最近邻采样、没有透视校正；N64 是三点双线性加模糊，两者不要混 | 低 | [RetroPassNode](https://threejs.org/docs/pages/RetroPassNode.html)、[webgpu_postprocessing_retro](https://threejs.org/examples/#webgpu_postprocessing_retro) |
| N64 风 | 糊、雾大、低分辨率纹理 | 纹理分辨率、雾距、模糊 | 低分辨率纹理加 LinearFilter，配近雾 | — | 低 | — |
| CRT / 扫描线 | 曲面屏、扫描线、渗色、暗角 | curvature 0–0.2、扫描线强度/密度/滚动速度、渗色 0–0.005、暗角 | `tsl/display/CRT.js`：`barrelUV`、`scanlines`、`colorBleeding`、`vignette`、`barrelMask` | 扫描线数和屏幕像素不对齐会出摩尔纹 | 低 | 同 retro 示例 |
| 纸张 / 画布纹理 | 整个画面像印在纸上 | 尺度、强度、混合模式、锚定方式（屏幕 / 物体三平面 / 动态实体纹理） | 屏幕空间叠加最便宜 | **浴室门效应（shower door）**：纹理钉在屏幕上，物体从纹理"后面"滑过去 | 低 | [Bénard 2009 动态实体纹理](https://artis.inrialpes.fr/Publications/2009/BBT09)、[Breslav 2007](https://artis.inrialpes.fr/Publications/2007/BSMBT07)、[Bénard 2010 噪声基元](https://artis.inrialpes.fr/Publications/2010/BLVLDT10/) |
| 色差 | 边缘出现 RGB 分离 | amount、angle、径向/线性 | `RGBShiftShader`；TSL `ChromaticAberrationNode` | 用多了显得廉价，还影响可读性 | 低 | [webgpu_postprocessing_ca](https://threejs.org/examples/#webgpu_postprocessing_ca) |
| 胶片颗粒 | 胶片质感 | intensity、灰度、颗粒刷新率 | `FilmPass`；TSL `FilmNode` | 60fps 刷新的颗粒像在闪，降到 24fps 更自然 | 低 | — |
| 暗角 | 视线向画面中心收拢 | offset、darkness | `VignetteShader`，CRT 的 `vignette` | — | 极低 | — |
| Risograph 孔版印刷 | 2–4 种荧光专色、错版、颗粒、叠印 | 专色数、每色偏移（错版）、颗粒、纸色 | 按亮度分色，每个通道做 UV 偏移，正片叠底，乘噪声 | — | 低 | [Codrops 孔版颗粒光](https://tympanus.net/codrops/?p=58657) |
| 彩色玻璃 | Voronoi 色块加铅条 | 单元尺寸、线宽、抖动、发光 | `voronoiNoise`：单元内取平均色，用 F2-F1 画边 | — | 中 | — |
| 马赛克 / 瓷砖 | 网格色块加砖缝 | 格大小、缝宽、抖动 | 网格采样 | — | 低 | — |
| ASCII 字符画 | 字符构成的画面 | 字符集、分辨率、反相 | `AsciiEffect`，pmndrs 的 `ASCIIEffect` | — | 中 | [webgl_effects_ascii](https://threejs.org/examples/#webgl_effects_ascii) |
| Sepia / Bleach bypass / Technicolor | 怀旧、低饱和高对比、早期彩色电影 | 强度 | `SepiaShader`、`BleachBypassShader`、`TechnicolorShader`；TSL 有 Sepia、BleachBypass | — | 极低 | — |
| 残影 / 拖影 | 运动拖尾 | damp | `AfterimagePass`；TSL `AfterImageNode` | — | 低 | [webgl_postprocessing_afterimage](https://threejs.org/examples/#webgl_postprocessing_afterimage) |
| 故障效果 | 数字故障 | 频率、强度 | `GlitchPass` | — | 低 | — |
| 镜头畸变 / 鱼眼 | 滑板视频那种鱼眼（JSR 式） | 畸变量 | pmndrs `LensDistortionEffect`，或 CRT 的 `barrelUV` | — | 低 | [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) |
| Game Boy 4 色 | 160×144 分辨率、4 级绿色 | 分辨率、色板、抖动 | Pixelation + 色板量化 + Bayer 抖动 | — | 低 | [A Short Hike 相关讨论（社区）](https://criticalvideogamestudies.com/a-short-hike-appreciation-post/) |
| 蓝图 / 技术图 | 蓝底白线加网格 | 网格密度、线色 | 用边缘 pass 的结果替换颜色 | — | 低 | — |

---

## 6. 色彩

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| sRGB / 线性工作流 | 颜色"对" | — | `new Color(0x..)` 的十六进制按 sRGB 解释；颜色纹理要设 `colorSpace=SRGBColorSpace`；非颜色数据（法线、gradientMap）保持 NoColorSpace；EffectComposer 末尾要接 `OutputPass` | CanvasTexture 忘设色彩空间会发白或发暗；自写 ShaderMaterial 不会自动做转换；量化和抖动在哪个空间做，结果不同 | — | [色彩管理手册](https://threejs.org/manual/en/color-management) |
| 色调映射选择 | None 是原样，可能溢出；ACES 对比高、纯色会偏色；AgX 去饱和明显；Neutral 基本保留固有色、只压高光 | 档位 + `toneMappingExposure` | `renderer.toneMapping`；个别材质设 `toneMapped=false` 排除 | 风格化色板配 AgX 容易发灰（[论坛](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)），ACES 会压低对比（[论坛](https://discourse.threejs.org/t/acesfilmictonemapping-leading-to-low-contrast-textures/15484)） | 极低 | [Khronos PBR Neutral](https://github.com/KhronosGroup/ToneMapping) |
| LUT 调色 | 电影级色调 | LUT 选择、强度 | `LUTPass` 配 `LUTCubeLoader`/`LUT3dlLoader`/`LUTImageLoader`；TSL `Lut3DNode` | LUT 必须放在 tone mapping 之后、sRGB 空间里；8 位 LUT 会产生色带 | 低 | [webgl_postprocessing_3dlut](https://threejs.org/examples/#webgl_postprocessing_3dlut) |
| 阴影 / 高光色相偏移 | 暗部偏冷紫、亮部偏暖黄，不会"脏灰" | 暗部色相偏移角度、暗部饱和度提升、亮部偏移 | 在自定义 cel 里用 `shadowColor`，或在后处理里按亮度做 HSV 偏移 | 直接把颜色乘暗会让饱和度掉 | 低 | Gooch 1998 |
| 明度结构 / 压缩 | 前中后景分层清晰 | 明度范围、对比曲线、深度明度衰减 | 后处理按深度做明度插值（空气透视） | — | 低 | — |
| 饱和度 / 色温 / 色调 | 整体情绪 | 色相、饱和度、色温、色调 | `HueSaturationShader`、`ColorCorrectionShader`（powRGB/mulRGB/addRGB）、`BrightnessContrastShader` | — | 极低 | — |
| 有限调色板 | 复古主机或艺术色板的统一感 | PICO-8（16 色）、Game Boy DMG（4 绿）、NES（约 54 色）、CGA（4 色组）、Endesga 32/64、Sweetie 16、1-bit 双色 | 色板量化（§5），或只对材质颜色做约束 | 后处理强制量化会把阴影、雾、bloom 一起量化，结果和"材质用色板"完全不同 | 低 | [Lospec](https://lospec.com/palette-list)、[PICO-8](https://lospec.com/palette-list/pico-8)、[Endesga 32](https://lospec.com/palette-list/endesga-32) |
| 中国传统色 / 日本传统色 | 东方雅致色系：天青、黛蓝、胭脂、朱砂、藤黄、石青、石绿、赭石、月白 | 色系族、五色（青赤黄白黑）、和谐方案 | 做成 token 表，生成材质色和 UI 色 | 堆满高饱和的"中国红"会显得廉价，青绿山水的矿物色更雅 | — | [中国色 zhongguose](http://zhongguose.com/)、[742 色开源库](https://github.com/nevertoday/zhongguo-traditional-colors)、[NIPPON COLORS](https://nipponcolors.com/) |
| 色彩和谐方案 | 互补、类似、三角、分裂互补 | 主色相、方案、明度阶梯 | 在 OKLCH 里生成，CSS 可以直接用 `oklch()` | 在 HSL 里生成，亮度不均匀 | — | [OKLab](https://bottosson.github.io/posts/oklab/) |
| 调色板贴图集 | 所有模型共用一张色块或渐变小图 | 色块图集、行列 | UV 映射到色块；Dredge 用的是 64×64 或 128×128 的渐变图 | — | 极低 | [Dredge（Unity 访谈）](https://unity.com/resources/crafting-dredge-cozy-atmospheric-horror) |
| 时段色板 | 黎明、正午、黄昏、夜晚的整体色调 | 关键帧色板、插值曲线 | 天空、雾、半球光、太阳色一起插值 | 只调光强会发灰 | 低 | — |
| 可读性对比 | 可交互物从背景里跳出来 | 前景/背景亮度差下限 | 检查工具：灰度预览、色盲模拟 | — | — | [TF2 NPAR 2007](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf) |

---

## 7. 灯光与阴影

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| DirectionalLight 太阳光 | 平行光、投影方向一致 | 方位角、仰角、强度、色温、阴影相机框（l/r/t/b/near/far）、mapSize | `light.shadow.camera` 是正交相机 | 阴影框太大会糊、出锯齿；不对齐 texel 的话阴影会随镜头闪烁 | 中 | [阴影手册](https://threejs.org/manual/en/shadows) |
| HemisphereLight 半球光 | 天光加地面反弹的假 GI | 天色、地色、强度 | `HemisphereLight` | 在 toon 下会压平色阶 | 极低 | [webgl_lights_hemisphere](https://threejs.org/examples/#webgl_lights_hemisphere) |
| AmbientLight 环境光 | 整体提亮 | 强度、颜色 | — | 降低对比，"平"的元凶 | 极低 | — |
| 点光 / 聚光 | 灯笼、火把、舞台光 | 强度、decay（默认 2）、distance；聚光的 angle、**penumbra（0 就是硬边光锥）**、`map`（投影纹理） | `PointLight`/`SpotLight` | 点光阴影要渲 6 个面，很贵 | 中–高 | [webgl_lights_spotlight](https://threejs.org/examples/#webgl_lights_spotlight) |
| RectAreaLight 面光 | 柔和的影棚光 | 宽高、强度 | 需要 `RectAreaLightUniformsLib`；没有阴影 | — | 中 | [webgl_lights_rectarealight](https://threejs.org/examples/#webgl_lights_rectarealight) |
| **BasicShadowMap** | **硬边、像素化的阴影**，适合像素风或硬 toon | mapSize | `shadowMap.type = BasicShadowMap`；radius 无效 | 锯齿要靠提高 mapSize 解决 | 低 | [LightShadow](https://threejs.org/docs/pages/LightShadow.html) |
| **PCFShadowMap**（r182+） | **软边阴影**（默认） | radius、mapSize、bias、normalBias、intensity | 默认类型 | **不等于硬阴影**；PCFSoftShadowMap 已弃用/移除 | 中 | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) |
| VSMShadowMap | 很柔、可以模糊的阴影 | radius、blurSamples | `VSMShadowMap` | 有漏光（light bleeding）；VSM 下接收阴影的物体也会投射阴影 | 中–高 | [webgl_shadowmap_vsm](https://threejs.org/examples/#webgl_shadowmap_vsm) |
| 阴影阈值化（toon 硬阴影） | 投影边缘和 cel 色阶一样硬 | 阈值、软硬 | 在自定义光照里对 `getShadow()` 的结果做 `smoothstep` | — | 低 | 见 0.2 第 3 条 |
| 阴影强度 / 阴影着色 | 浅阴影、彩色阴影 | `shadow.intensity` 0–1、阴影色 | intensity 是内置属性；阴影着色要自定义 | 阴影太黑会把细节吃掉 | 低 | LightShadow |
| bias / normalBias | 消除阴影痤疮（acne）和漂浮（peter-panning） | bias≈-0.0001 量级、normalBias | — | 两者此消彼长；r183 之后 WebGPU 的阴影 bias 需要重新调 | — | 同上 |
| PCSS | 近处硬、远处软的接触硬化阴影 | 光源尺寸 | 示例里改了 shader chunk | 偏写实 | 高 | [webgl_shadowmap_pcss](https://threejs.org/examples/#webgl_shadowmap_pcss) |
| CSM 级联阴影 | 大世界里近处阴影清晰 | 级联数、分割方式 | `addons/csm/CSM.js` | 小场景用不上 | 中–高 | [webgl_shadowmap_csm](https://threejs.org/examples/#webgl_shadowmap_csm) |
| 接触阴影（地面） | 产品摄影、微缩模型式的柔和落地影 | 模糊、暗度、平面尺寸 | 从下方渲染深度，模糊后贴到地面平面 | 只适用于平地 | 中 | [webgl_shadow_contact](https://threejs.org/examples/#webgl_shadow_contact) |
| Blob shadow 圆影 | 角色脚下一团圆影，便于判断落点 | 尺寸随高度变化、不透明度 | 放一个径向渐变的 Plane，或用贴花 | 在斜坡上要对齐法线 | 极低 | [阴影手册（假阴影）](https://threejs.org/manual/en/shadows) |
| 屏幕空间阴影 | 细小的接触暗部 | 步长、厚度 | TSL `SSSNode` | — | 中 | [webgpu_postprocessing_sss](https://threejs.org/examples/#webgpu_postprocessing_sss) |
| 烘焙 AO | 稳定的缝隙暗部 | 强度 | 顶点色、`aoMap`、体素 AO | — | 极低 | 0fps 体素 AO |
| SSAO / SAO / GTAO | 实时的缝隙和接触暗部 | 半径、强度、距离；GTAO 的 radius、scale、thickness | `SSAOPass`、`SAOPass`、`GTAOPass`；TSL `GTAONode` | 和 toon 直接相乘会出"脏"渐变，更好的做法是把 AO 当作 toon 阈值的偏移，或量化后再用；r185 起 GTAO 变暗变宽 | 中–高 | [webgl_postprocessing_gtao](https://threejs.org/examples/#webgl_postprocessing_gtao) |
| 昼夜循环 | 太阳东升西落、天色变化、影子长短变化 | 时间（0–24）、速度、纬度、各时段色板 | 太阳方向由方位角和仰角算出；Sky 的 elevation/azimuth；雾色、半球光、曝光一起插值 | 夜晚只降光强会发灰；阴影相机要跟着太阳方向更新 | 低 | [webgl_shaders_sky](https://threejs.org/examples/#webgl_shaders_sky) |
| Sky（Preetham 物理天空） | 写实的天空渐变 | turbidity、rayleigh、mieCoefficient、mieDirectionalG、elevation、azimuth | `addons/objects/Sky.js`（r186 去掉了 up） | 风格化项目里显得太写实，3 段渐变天空更可控 | 低 | 同上 |
| 光照探针 / 环境光 | 局部环境色 | 探针位置、强度 | `LightProbe`、`LightProbeGenerator`、`LightProbeGridWebGL`（r186 改名） | — | 低–中 | [webgl_lightprobes](https://threejs.org/examples/#webgl_lightprobes) |
| 自发光 + Bloom | 霓虹、灯火、魔法 | strength、radius、threshold、选择性开关 | `UnrealBloomPass`；选择性 bloom 用 layers；TSL `bloom()` 或 emissive MRT | 阈值低时白色 toon 物体也会发光，应改用 selective 或 emissive 通道；bloom 需要 HDR 半浮点 RT | 中 | [unreal_bloom_selective](https://threejs.org/examples/#webgl_postprocessing_unreal_bloom_selective)、[webgpu_postprocessing_bloom_emissive](https://threejs.org/examples/#webgpu_postprocessing_bloom_emissive) |
| 体积光（God rays） | 光柱 | 密度、衰减、采样数 | `GodRaysShader`（径向模糊）；TSL `GodraysNode`（基于阴影图 raymarch）；风格化做法是用渐变 alpha 的光锥几何体 | 径向模糊只在光源可见时成立 | 中–高 | [webgpu_postprocessing_godrays](https://threejs.org/examples/#webgpu_postprocessing_godrays)、[GPU Gems 3 ch13](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process) |
| 假体积雾 | 层雾、山谷雾 | 高度、密度、噪声 | 高度雾（TSL）、多层噪声面片、粒子卡片 | 真体积光很贵（webgpu_volume_lighting） | 低–高 | [webgpu_fog_height](https://threejs.org/examples/#webgpu_fog_height) |
| 云影（gobo / cookie） | 地面上有滚动的云影 | 尺度、速度、暗度 | 材质里按 `worldPos.xz + t*wind` 采样噪声乘到光照上；也可用 SpotLight 的 `map` | — | 低 | t3ssel8r |
| 镜头光晕 | 太阳光晕 | 元素数、尺寸 | `Lensflare` addon，TSL `LensflareNode` | — | 低 | [webgl_lensflares](https://threejs.org/examples/#webgl_lensflares) |
| 三点布光预设 | 主光、补光、轮廓光 | 各光的强度和方向 | 预设组 | — | 低 | — |

---

## 8. 镜头与构图

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| 透视相机 / 焦距 | 广角夸张，长焦压缩空间 | fov 或焦距 mm | `PerspectiveCamera.setFocalLength(mm)`（35mm 胶片规格） | fov 是垂直方向的视角 | — | — |
| 正交相机 | 没有透视，像模型或地图 | frustum 尺寸、zoom | `OrthographicCamera`；OrbitControls 在正交下改的是 `.zoom` | 正交下 near/far 仍然会裁剪；拉远镜头不会让物体变小 | — | [Tunic（Unity）](https://blog.unity.com/games/smoke-mirrors-and-scrolling-textures-behind-the-scenes-of-tunic) |
| 真等距（isometric） | 三轴等比，地面轴线 30° | 俯角 35.264°（atan(1/√2)）、方位 45° | 相机放在 (d,d,d) 看向目标 | 游戏里常说的"等距"多半是 2:1 二等角 | — | [Isometric 游戏图形](https://en.wikipedia.org/wiki/Isometric_video_game_graphics) |
| 2:1 二等角（dimetric） | 像素画式的"等距"，2:1 阶梯线 | 俯角 30°、方位 45° | — | — | — | 同上 |
| 斜投影 / 3/4 俯视 | 超任塞尔达式的正面加顶面 | 剪切量 | 自定义 `projectionMatrix` 加剪切 | — | — | — |
| 顶视（90°） | 地图、桌游 | 高度 | — | 角色辨识度很低 | — | — |
| 横版（2.5D） | 侧视平台跳跃 | 窄 FOV 或正交、跟随死区 | 分层视差 | — | — | [Scroll Back（Itay Keren）](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers) |
| 第三人称跟随 | 弹簧臂跟随 | 距离、高度、阻尼、前瞻、碰撞回缩 | 用 `MathUtils.damp` 插值位置和朝向 | 每帧 `lerp(a,b,0.1)` 依赖帧率 | 低 | [50 个相机错误（GDC）](https://gdcvault.com/play/1020460/50-Camera) |
| 第一人称 | 沉浸 | FOV 70–90、头部摇晃 | `PointerLockControls`；参考 games_fps 示例 | 头部摇晃太大会晕 | 低 | [games_fps](https://threejs.org/examples/#games_fps) |
| Tilt-shift 微缩 | 微缩模型感 | 焦点线位置、焦带宽度、旋转、羽化、模糊核 | `HorizontalTiltShiftShader` 加 `VerticalTiltShiftShader`；pmndrs `TiltShiftEffect` | **微缩感来自"高俯角 + 浅景深 + 高饱和 + 快动作"的组合**，单靠模糊不够；它是屏幕空间的带状模糊，不是真景深 | 低 | [Link's Awakening 美术访谈](https://nintendoeverything.com/aonuma-on-how-the-art-style-came-to-be-for-zelda-links-awakening-on-switch/) |
| 散景景深 | 真实的焦外虚化 | 对焦距离、焦距、bokeh 尺度、光圈 | `BokehPass`；TSL `DepthOfFieldNode`（r180 改了新 API） | 和像素化冲突 | 中–高 | [webgpu_postprocessing_dof](https://threejs.org/examples/#webgpu_postprocessing_dof) |
| 相机平滑 | 柔和跟随 | λ（阻尼）、临界阻尼弹簧 | `MathUtils.damp(x, y, λ, dt)` | — | 极低 | — |
| 环绕 / 自转 | 展示台式转动 | 自转速度、阻尼、极角限制 | `OrbitControls` 的 autoRotate、enableDamping、min/maxPolarAngle | — | 极低 | [misc_controls_orbit](https://threejs.org/examples/#misc_controls_orbit) |
| 镜头震动（trauma 模型） | 打击感 | trauma 衰减、平方/立方曲线、噪声频率、最大偏移/旋转 | 位移和旋转由噪声驱动，幅度乘 trauma² 或 trauma³ | 用纯随机抖动会很生硬 | 极低 | [Eiserloh GDC 2016](https://gamedeveloper.com/programming/video-sprucing-up-cameras-with-math) |
| 旋转吸附 | 只允许 45° 或 90° 转向（像素画、等距） | 步长 | 官方 pixel 示例里的 `cameraRotationSnap` | — | — | webgl_postprocessing_pixel |
| 固定机位 / 电影轨道 | 生化危机式的固定视角 | 机位集合、切换规则 | 用触发体积切换相机 | — | — | — |
| 构图辅助 | 三分法、黑边比例（2.39:1） | 辅助线、遮幅 | 用 CSS 叠加层 | — | — | — |

---

## 9. 环境与特效

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| 卡通水：深度泡沫 | 浅水到深水的色带，岸边和交界处有白色泡沫线 | 浅/深水色、最大深度、泡沫距离、泡沫噪声阈值、扰动 | 先渲染不透明物到带 `depthTexture` 的 RT，水面着色器比较两者深度差；WebGPU 用 `viewportDepthTexture` | 透明物不写深度；**正交相机的深度是线性的**，线性化公式要分开处理；水面材质要 `depthWrite=false` | 中 | [Roystan 卡通水](https://roystan.net/articles/toon-water/)、[Omar Shehata 网页卡通水](https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t)、[three 论坛](https://discourse.threejs.org/t/toon-water-shader-with-depth-based-fog-and-intersection-foam/35978)、[webgpu_backdrop_water](https://threejs.org/examples/#webgpu_backdrop_water) |
| 顶点波浪 | 水面起伏 | 振幅、波长、速度、方向数（Gerstner） | 顶点着色器里叠 sin 或 Gerstner 波 | 低多边形水面加 flatShading 会闪个不停（可以当风格） | 低 | — |
| 写实 / 半写实水 | 反射、法线、FFT 海洋 | distortionScale、sunDirection、flow | `Water.js`、`Water2.js`、`Ocean`、`webgpu_ocean` | — | 中–高 | [webgl_shaders_ocean](https://threejs.org/examples/#webgl_shaders_ocean)、[Sea of Thieves SIGGRAPH 2018](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf) |
| 水面浮物 | 浮物随浪起伏、摇摆 | 振幅、每物体相位、倾斜度 | 在 CPU 上复算同一个波函数 | 浮物和水面函数不一致会穿模 | 极低 | — |
| 焦散 | 水底的光纹 | 尺度、速度 | 动画 Voronoi 投影；参考 `webgpu_caustics` | — | 低–中 | [webgpu_caustics](https://threejs.org/examples/#webgpu_caustics) |
| 蓬松树冠 | 吉卜力式的毛茸树冠 | 叶片数、尺寸、**法线向球形混合度（约 0.8）**、alpha cutoff、色相波动 | 叶片面片聚成球团，法线从代理球上转移，顶点着色器做 billboard 扩张，alphaTest，配 toon 着色 | 不改法线的话，叶片朝向会让明暗乱跳 | 中 | [Fluffy trees（three.js）](https://douges.dev/blog/threejs-trees-1)、[cremuss](https://cremuss.artstation.com/projects/Vyz12R) |
| 低多边形树和岩石 | 圆冠阔叶树（抖动的 icosphere）、针叶松（叠锥）、圆石 | 层数、抖动、颜色 | `IcosahedronGeometry(detail 0–1)` 加 flatShading | — | 低 | — |
| Alpha 卡片 | 草、叶 | alphaTest、alphaHash、alphaToCoverage | `alphaToCoverage` 需要 MSAA | `transparent=true` 会带来排序问题 | 低 | — |
| 风吹摆动 | 植被随风摆动 | 强度、频率、阵风尺度、刚度（按高度平方） | WebGL 在 `onBeforeCompile` 里改 `begin_vertex`；TSL 用 `positionNode` | 不同实例相位一样就会整齐划一地"跳舞" | 低 | [three 论坛实例化草](https://discourse.threejs.org/t/simple-instanced-grass-example/26694) |
| 草地实例化 | 大片草海 | 密度、根部到尖端渐变、弯曲、玩家踩压半径、LOD | InstancedMesh 草叶或卡片，玩家位置作为 uniform | 草叶太多拖垮移动端 | 中–高 | [Ghost of Tsushima 草（GDC 2021）](https://gdcvault.com/play/1027214/Advanced-Graphics-Summit-Procedural-Grass)、[Codrops 蓬松草](https://tympanus.net/codrops/?p=83092) |
| 风格化云 | 球团云、billboard 云、体积云 | 球团数、尺度、漂移速度、高度、阴影色 | 合并的 icosphere 加 toon；体积云用 `webgl_volume_cloud`（贵） | — | 低–高 | [webgl_volume_cloud](https://threejs.org/examples/#webgl_volume_cloud) |
| 天空 | 3 段渐变、卡通日月、星空 | 顶部/地平线/底部颜色、太阳盘尺寸、光晕 | 大球 BackSide 着色器，或 `scene.background` 用渐变纹理；Sky addon | 雾色和地平线颜色不一致，交界处会断层 | 低 | — |
| 雾 | 线性雾、指数雾、高度雾、自定义雾 | near/far、density、高度、雾色来源 | `Fog`、`FogExp2`；TSL 自定义雾（含散射） | 雾色要取自天空地平线颜色；Dredge 用的是以玩家为中心的雾 | 低 | [webgpu_custom_fog](https://threejs.org/examples/#webgpu_custom_fog)、[Dredge 雾（Game Developer）](https://www.gamedeveloper.com/production/leveraging-the-unseen-to-turn-players-worst-fears-against-them-in-dredge) |
| 雨雪粒子 | 天气 | 数量、速度、风、尺寸、雨丝长度 | `Points` 或实例化 quad；WebGPU 用 compute | — | 低–中 | [compute_particles_snow](https://threejs.org/examples/#webgpu_compute_particles_snow)、[rain](https://threejs.org/examples/#webgpu_compute_particles_rain) |
| 萤火虫 / 尘埃 | 氛围漂浮物 | 数量、亮度 | Points 加叠加混合，配 bloom | — | 低 | — |
| 卡通火焰 | 噪声侵蚀边缘的硬边火焰 | 阈值、滚动速度、色带 | 噪声做 alpha 再 step | — | 低 | [webgpu_tsl_vfx_flames](https://threejs.org/examples/#webgpu_tsl_vfx_flames) |
| 瀑布 / 河流 | 滚动纹理加阈值条纹 | 滚动速度、条纹阈值 | UV 滚动 | — | 低 | [Tunic（Unity）](https://blog.unity.com/games/smoke-mirrors-and-scrolling-textures-behind-the-scenes-of-tunic) |
| 积雪 | 朝上的面覆白 | 覆盖阈值 | 用 `normal.y` 混合 | — | 低 | — |
| 平面反射 / SSR | 镜面、湿地反射 | 分辨率、强度 | `Reflector`；`SSRPass`，TSL `SSRNode` | — | 中–高 | [webgl_postprocessing_ssr](https://threejs.org/examples/#webgl_postprocessing_ssr) |

---

## 10. 运动与动画

| 技术 | 视觉效果 | 关键参数 | Three.js 实现要点 | 常见误区 | 性能 | 参考 |
|---|---|---|---|---|---|---|
| 平滑插值 vs 一拍二/一拍三 | 60fps 丝滑，或 12fps/8fps 的手绘节奏感 | 姿态帧率 6–60、只作用于角色 / 也作用于特效 | 累积时间，满 1/12 秒才调用一次 `mixer.update(step)`；或者 `action.time = floor(t*12)/12` | **不要降整个渲染帧率**：相机和输入会跟着卡；角色步进、相机保持平滑，才是 Spider-Verse 的感觉 | 极低 | [Spider-Verse（fxphd）](https://www.fxphd.com/fxblog/spider-verse-at-siggraph/) |
| 有限动画 / 关键帧保持 | 格斗游戏式的定格姿势 | 每个关键帧的停留帧数 | 关闭插值（`InterpolateDiscrete`） | — | 极低 | [GGXrd GDC](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The) |
| Smear 帧 / 速度线 | 高速动作时的拉伸残影 | 拉伸量、速度阈值 | 沿速度方向拉伸几何；`AfterimagePass` | — | 低 | — |
| Squash & Stretch 挤压拉伸 | 弹性、卡通的跳跃落地 | 幅度、恢复弹簧的刚度和阻尼 | y 方向缩放 (1+s)，xz 方向缩放 1/√(1+s)，保持体积 | 不守恒体积看起来像"充气" | 极低 | [动画 12 原则](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation) |
| 预备 / 跟随 / 过冲 | 有生命感 | 预备深度、过冲量 | 弹簧阻尼 | — | 极低 | 同上 |
| 二级运动（弹簧骨骼） | 头发、耳朵、背包晃动 | 刚度、阻尼、重力 | 骨骼旋转加阻尼弹簧 | — | 低 | — |
| 程序化走路起伏 | 走路上下颠、左右摆、转弯倾斜 | 颠簸幅度、步频（随速度变化）、倾斜角 | 用 sin(相位) 驱动 | 步频和移动速度不匹配会"滑步" | 极低 | [David Rosen GDC 2014](https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation) |
| 程序化 IK / 落脚点 | 生物脚贴合地形 | 链长、迭代 | `addons/animation/CCDIKSolver.js` | — | 中 | — |
| 贴地角色控制器 | 沿起伏地形行走 | 速度、加速度、转向速度、坡度上限、台阶高度、重力、coyote time、跳跃缓冲 | 高度来源三选一：解析函数（最快，但只在几何没被扰动时准确）/ 三角形重心插值 / BVH 射线；碰撞用 `Capsule` + `Octree`（games_fps） | 对大网格每帧用 Raycaster 太慢；低模地形不做插值的话，角色会一阶一阶地跳 | 低–中 | [games_fps](https://threejs.org/examples/#games_fps)、[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) |
| 小星球行走 | 沿球面行走 | 重力指向球心、对齐速度 | `quaternion.setFromUnitVectors(up, normal)` | — | 低 | Messenger |
| 待机呼吸 / 眨眼 | 待机时的生命感 | 周期、幅度 | 用 sin 缩放 | — | 极低 | — |
| 节拍同步 | 场景随 BPM 律动（Hi-Fi Rush） | BPM、相位 | 全局节拍时钟 | — | 极低 | [Hi-Fi Rush（80.lv）](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style) |
| 弹出生成 | 物件出现时缩放带过冲（Townscaper 式） | 时长、过冲量 | easeOutBack 曲线 | — | 极低 | — |
| 定格黏土沸腾 | 定格动画式的形体抖动 | 沸腾帧率 8–12、抖动幅度 | 按 floor(t·fps) 重设顶点噪声种子 | — | 低 | — |
| 打击停顿 / 震屏 | 打击感 | 停顿帧数、trauma 量 | 时间缩放 | — | 极低 | Eiserloh |
| 手感：飘 / 脆 | 重力、跳跃顶点的滞空 | 重力倍率、下落加速倍率 | 控制器参数 | — | — | — |

---

## 11. 游戏 / 界面 UI 风格

| 风格 | 关键 CSS 特征 | 适合的游戏 | 误区 | 参考 |
|---|---|---|---|---|
| 新粗野主义（Neo-Brutalism） | `border:3px solid #000`；`box-shadow:4px 4px 0 #000`（不模糊）；纯平高饱和底色；粗体无衬线（Space Grotesk / Archivo Black）；悬停 `translate(-2px,-2px)` 并加大阴影，按下 `translate(4px,4px)` 阴影归零；圆角 0–8px | 工具类、休闲、独立游戏 | 对比太强，长时间使用容易疲劳；阴影方向必须统一 | [Bejamas](https://bejamas.com/insights/field-notes/neubrutalism-web-design-trend) |
| 玻璃拟态（Glassmorphism） | `background:rgba(255,255,255,.15)`；`backdrop-filter:blur(12px) saturate(140%)`；`1px rgba(255,255,255,.3)` 描边；圆角 16px | 科幻、现代、休闲 | 盖在 WebGL 画布上时 backdrop-filter 每帧都要重算，有开销；文字对比度难以保证 | [Webflow](https://webflow.com/blog/glassmorphism) |
| 新拟态（Neumorphism） | 背景和元素同色；一亮一暗双阴影 `8px 8px 16px 暗, -8px -8px 16px 亮`；按下改为 inset | 极简 | 对比度低、可达性差，2021 年后基本没人用了 | [Wikipedia](https://en.wikipedia.org/wiki/Neumorphism) |
| 黏土拟态（Claymorphism） | 圆角 24–40px；粉彩色；内阴影加外阴影 | 黏土、玩具风 3D 游戏 | — | — |
| 扁平 / Material 3 | 用 elevation token 做阴影层级；8dp 网格；state layer；色调色板 | 通用 | — | [M3](https://m3.material.io/) |
| 拟物 | 纹理（木、羊皮纸、金属）；渐变；`inset 0 1px 0 rgba(255,255,255,.4)` 斜面高光；`text-shadow` 浮雕字；`border-image` 画框 | 奇幻 RPG | 资源量大；跨分辨率容易糊 | [98.css（复古拟物参考）](https://jdan.github.io/98.css/) |
| 像素 UI | `image-rendering:pixelated`；像素字体（Press Start 2P；中文用 Zpix）；`border-image` 九宫格；多层 0 模糊 box-shadow 叠出台阶边；无圆角；整数倍缩放 | 像素风、复古 | 非整数倍缩放会让像素粗细不均；中文必须用像素字体 | [NES.css](https://nostalgic-css.github.io/NES.css/)、[Zpix](https://github.com/SolidZORO/zpix-pixel-font) |
| 手绘 / 草图 | rough.js 画抖动边框；不规则 `border-radius:255px 15px 225px 15px/15px 225px 15px 255px`；手写字体；纸纹背景；每个元素轻微旋转 | 童趣、日记、解谜 | — | [rough.js](https://roughjs.com/) |
| 中式 / 东方 | 宣纸纹；`mask-image` 噪声做水墨晕染边；朱砂印章作强调色；回纹、云纹用 SVG `border-image`；竖排 `writing-mode:vertical-rl`；宋体/楷体（Noto Serif SC、霞鹜文楷）；传统色 token；卷轴展开动画；月洞门用 `clip-path:circle()` | 武侠、仙侠、水墨风 | 符号堆太多显得廉价；留白是关键 | [霞鹜文楷](https://github.com/lxgw/LxgwWenKai)、[中国色](http://zhongguose.com/) |
| 科幻 HUD / 叙事内（diegetic）UI | 1px 细线；切角（`clip-path:polygon` 做倒角）；等宽字体；深底上的青色或琥珀色；`repeating-linear-gradient` 扫描线；`text-shadow` 发光；刻度动画。diegetic 指 UI 放进游戏世界里（如 Dead Space 的血条脊柱） | 科幻 | 信息过密 | [Beyond the HUD（Chalmers 论文）](https://publications.lib.chalmers.se/records/fulltext/111921.pdf) |
| Y2K / Frutiger Aero | 镀铬渐变；上半白色高光的胶囊按钮；气泡、虹彩；蓝绿天空 | 复古未来 | — | — |
| Memphis（孟菲斯） | 几何碎片（波浪线、三角、圆点）做背景 SVG；原色加粉彩；黑描边；`radial-gradient` 点阵 | 派对、休闲 | 喧宾夺主 | [Memphis Group](https://en.wikipedia.org/wiki/Memphis_Group) |
| 瑞士极简（Swiss） | 12 栏网格；Helvetica / Inter；左对齐右侧参差；大号数字；红色点缀；大量留白；无阴影 | 解谜、策略 | — | [International Typographic Style](https://en.wikipedia.org/wiki/International_Typographic_Style) |
| JRPG 窗口 | `linear-gradient(#2b3a8f,#0a0f3a)`；2px 白边、圆角 6px；内黑边；手指光标 | JRPG | — | — |
| Persona 5 式 | `skew(-12deg)` 倾斜；红黑白；剪报拼贴字；锯齿 `clip-path`；激进的动效 | 时尚、动作 | 可读性 | — |
| 终端 / CRT 文字 | 等宽绿色或琥珀色；发光；闪烁光标；扫描线 | 黑客、恐怖 | — | — |
| 治愈 / 绘本 | 大圆角；粉彩；圆体字；纸张；弹性缓动 | 动森类 | — | — |

补充两点：WebGL 游戏的 UI 通常用 DOM 叠在画布上，最灵活。如果要放进 3D 世界里（diegetic），可以用 troika-three-text 或 three-mesh-ui。

---

## 12. 补充维度 A：形状语言、比例、贴图策略
| 技术 | 视觉效果 | 关键参数 | 实现 / 误区 | 参考 |
|---|---|---|---|---|
| 形状语言 | 圆形显得友好，方形显得稳定，三角显得危险 | 圆角程度、锥度、夸张度 | 全局倒角和缩放夸张 | [TF2 剪影可读性](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf) |
| 角色比例 | 2–3 头身 Q 版、4–5 头身风格化、7–8 头身写实 | 头身比、手脚比例 | 用骨骼缩放实现；胶囊小人基本就是"无比例"的极简 | — |
| 道具夸张 | 粗树干、胖门、大轮子 | 夸张倍数 | — | [Sable 可读性](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability) |
| 细节密度分布 | 大中小三级细节加"留白休息区" | 细节频率、留白比例 | 植被、杂物密度用噪声控制 | [BotW GDC 2017](https://gdcvault.com/play/1024562/Change-and-Constant-Breaking-Conventions) |
| 贴图策略 | 无贴图（纯色）、顶点色、调色板图集、手绘贴图、像素贴图、三平面程序纹理、PBR 扫描 | 档位 | 像素贴图要 `NearestFilter`；手绘贴图要关掉强光照 | [Valheim 风格讨论（Steam 社区帖，含开发者回复，未逐条核实）](https://steamcommunity.com/app/892970/discussions/0/3104638636529536510) |

## 13. 补充维度 B：分辨率、抗锯齿、后处理顺序
| 技术 | 要点 | 误区 |
|---|---|---|
| MSAA / FXAA / SMAA / TAA（TRAA） | `antialias:true` 只对默认帧缓冲有效；EffectComposer 的 RT 要设 `samples`；后处理描边之后要补 FXAA 或 SMAA | 像素风必须关掉所有 AA；TAA 会把抖动图案抹掉 |
| 渲染比例 | `setPixelRatio`；TSL 有 `FSR1Node`/`TAAUNode`；低分辨率加放大本身也是一种风格 | 高 DPI 屏上网点、线宽要按 DPR 换算 |
| 推荐的后处理顺序 | 场景 → AO → 边缘检测（从 MRT 的法线/深度/ID）→ 风格化（Kuwahara/水彩）→ 叠加线条 → Bloom（HDR）→ Tone mapping / OutputPass → LUT → 色板量化 / 抖动 → CRT / 颗粒 / 暗角 → UI | 量化放在 tone mapping 之前，会被 tone mapping 打乱；线条放在 Kuwahara 之前，会被它吃掉 |

---

## 14. 风格化游戏案例研究（含可直接映射到探索台的配方）

| 作品 | 关键视觉配方（可以直接做成预设） | 来源 |
|---|---|---|
| Guilty Gear Xrd | 3D 模型做出 2D 动画效果：自定义 cel 着色；顶点色控制阴影倾向和描边粗细；编辑法线让脸部阴影干净；inverted hull 外描边；UV 对齐的贴图内线（Motomura line）；有限动画（关键帧保持、不插值）；每个镜头单独摆姿势 | [GDC 2015](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)、[Blendernation 幕后](https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/) |
| 原神 / 崩坏3 | 双阶 cel 加 ramp 图集（区分日夜）、SDF 面部阴影、等宽边缘光、描边、风格化云和天空 | [GDC 2021 原神](https://www.gdconf.com/news/learn-about-making-genshin-impacts-open-world-gdc-2021)、[崩坏3 Unite Tokyo 2018](https://docswell.com/s/UnityJapan/KWLQP5-unite-tokyo-20183rd)、[SDF 面部阴影（社区）](https://erichu33.notion.site/Face-Shadow-Map-Creation-Baking-Workflow-d3b8769021e04683a2f2ae4cf16ac810) |
| 塞尔达 BotW / TotK | 半写实加卡通：低饱和但亮的色彩、柔和的轮廓边缘光、强烈的空气透视、笔触感草地、雾；画风服务于玩法 | [GDC 2017](https://gdcvault.com/play/1024562/Change-and-Constant-Breaking-Conventions)、[CEDEC 2017 场次报道](https://www.gamespark.jp/article/2017/07/04/74432.html) |
| 织梦岛 Switch 重制 | 塑料玩具质感（PBR 加高光泽）、tilt-shift、俯视微缩模型、高饱和 | [Aonuma 访谈](https://nintendoeverything.com/aonuma-on-how-the-art-style-came-to-be-for-zelda-links-awakening-on-switch/) |
| Sable | Moebius 式细黑线、几乎不做明暗的平涂、点描、沙漠大色块、注重可读性 | [GDC 2022](https://gdcvault.com/play/1027721/The-Art-of-Sable-Imperfection)、[Game Developer](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability) |
| Tunic | 正交等距视角、低多边形纯色、靠光照表现体积、滚动纹理做水和特效（景深细节没找到一手资料） | [Unity：Smoke, mirrors and scrolling textures](https://blog.unity.com/games/smoke-mirrors-and-scrolling-textures-behind-the-scenes-of-tunic) |
| Hi-Fi Rush | 延迟渲染的 toon、漫画网点着色器、toon 灯光、静态加动态阴影图、光照探针 GI、阈值图驱动的脸部阴影、全场景跟随节拍 | [GDC 2024](https://gdcvault.com/play/1034251/3D-Toon-Rendering-in-Hi)、[80.lv](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style)、[机核](https://www.gcores.com/articles/181912) |
| 大神（Ōkami） | 水墨（sumi-e）加浮世绘、粗墨线、纸张滤镜、因 PS2 性能限制改走 cel 路线 | [Wikipedia](https://en.wikipedia.org/wiki/%C5%8Ckami) |
| Return of the Obra Dinn | 1-bit、世界稳定的抖动（映射到相机球面）、边缘线、可切换的复古双色调色板 | [Pope 开发日志](https://forums.tigsource.com/index.php?topic=40832.msg1363742#msg1363742)、[Ditherpunk](https://surma.dev/things/ditherpunk/) |
| 蜘蛛侠：纵横宇宙 | 角色一拍二、没有动态模糊、手绘线条跟随 3D、网点、色差 | [SIGGRAPH 2023 线条](https://history.siggraph.org/learning/linework-in-spider-man-across-the-spider-verse-by-grochola-maccari-lee-and-boulet-gilly)、[fxphd](https://www.fxphd.com/fxblog/spider-verse-at-siggraph/) |
| Arcane（双城之战） | 3D 模型上手绘明暗、油画式背景、2D 手绘特效叠加 | [VFX Voice](https://vfxvoice.com/riot-games-and-fortiche-get-revolutionary-with-arcane-season-2/) |
| 二之国 | cel 着色角色加轻微模糊（更像手绘）、水彩式平涂背景 | [Engadget 2010 预览](https://www.engadget.com/2010-09-16-ni-no-kuni-ps3-preview.html) |
| Jet Set Radio | 公认最早的 cel 着色、重要物体用更粗的线、街头高饱和 | [Wikipedia](https://en.wikipedia.org/wiki/Jet_Set_Radio)、[Time Extension](https://www.timeextension.com/features/the-story-of-jet-set-radios-unexpected-journey-from-dreamcast-to-game-boy-advance) |
| 无主之地 | 把原画直接转成 3D：手绘感贴图里画了描边、后处理边缘线、开发后期改了画风 | [GameSpot](https://www.gamespot.com/articles/behind-borderlands-11th-hour-style-change/1100-6253257/)、[80.lv](https://80.lv/articles/how-borderlands-devs-created-franchise-s-signature-art-style) |
| Valheim | 低分辨率像素贴图、低面数，配现代光照、雾、体积感、后处理 | [Steam 社区帖（含开发者回复，未逐条核实）](https://steamcommunity.com/app/892970/discussions/0/3104638636529536510) |
| Townscaper | 不规则四边形网格、dual-grid 模块、WFC、粉彩、弹出动画 | [How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) |
| Teardown | 体素（8 位调色板材质）、全动态光照、可破坏 | [Teardown Frame Teardown（Wittens）](https://acko.net/blog/teardown-frame-teardown/)、[voxagon 博客](https://blog.voxagon.se/) |
| A Short Hike | 低分辨率加像素可调、从实景照片采样出的暖色板 | [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) |
| Dredge | 以玩家为中心的自定义雾、64×64 渐变图集、风格化水（sine 波）、"舒适恐怖" | [Unity](https://unity.com/resources/crafting-dredge-cozy-atmospheric-horror)、[Game Developer](https://www.gamedeveloper.com/production/leveraging-the-unseen-to-turn-players-worst-fears-against-them-in-dredge) |
| Cult of the Lamb | 2D 手绘纸片放在 3D 空间里、着色器负责 3D 光影、红黑白配色 | [Unity Blog](https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb) |
| Hades | 手绘贴图、粗描边漫画风、强补色对比 | [Kotaku：The Art of Hades](https://kotaku.com/the-art-of-hades-1845443438) |
| Cuphead | 纸上手绘加上墨、水彩背景、1930 年代动画工艺、胶片颗粒 | [CGMagazine](https://www.cgmagonline.com/interviews/cuphead-artist-producer-maja-moldenhauer-studio-mdhr-interview) |
| Gris | 水彩晕染、色彩随叙事逐章解锁 | [MCV](https://mcvuk.com/?p=22112) |
| Sea of Thieves | 写实的 FFT 海洋再做风格化：深水色和次表面色按视角、太阳方向、浪尖遮罩混合 | [SIGGRAPH 2018](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf) |
| Messenger（Abeto） | Three.js 浏览器游戏、小星球（几米外就能看到曲率）、多彩低模、多人 emoji | [80.lv](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game)、[Wikipedia](https://en.wikipedia.org/wiki/Messenger_(video_game))、[在线游玩](https://messenger.abeto.co) |
| 补充：TF2 | 20 世纪商业插画风、Half-Lambert、冷暖 ramp、边缘光 | [NPAR 2007](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf) |
| 补充：Journey | 非物理的沙地着色（"海洋高光"、现象学漫反射） | [GDC 2013](https://gdcvault.com/play/1017742/Sand-Rendering-in) |
| 补充：Firewatch | 色块化的环境、大气渐变雾、手工建模的树 | [GDC 2016](https://gdcvault.com/play/1022923/Making-the-World-of) |
| 补充：Octopath（HD-2D） | 像素精灵放进 3D 场景，配点光阴影、tilt-shift、景深 | [Unreal Spotlight](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true) |
| 补充：帧分析合集 | 很多游戏的逆向帧分解 | [Adrian Courrèges](https://www.adriancourreges.com/blog/) |

---

## 15. 给探索台的落地建议

**1. 冲突矩阵。** 探索台应该在用户选到互相冲突的组合时自动提示：
- Pixelation × 外壳细描边：放大后线宽不一致，应改用 Pixelation 自带的边缘检测。
- Pixelation 或抖动 × Bloom / TAA / tilt-shift：像素会被糊掉。
- Toon × PCF 软阴影或 SSAO：会出现脏灰渐变。
- 非索引几何 × Inverted Hull：外壳开裂。
- Kuwahara 或水彩放在线条之后：线被吃掉。
- 屏幕空间纸纹或网点 × 镜头运动：浴室门效应。
- 色板量化 × 放在它之后的 tone mapping 或 LUT：调色板被破坏。
- AgX 或 ACES × 高饱和精确色板：颜色会偏移或变灰。
- 正交相机 × 透视写法的深度泡沫公式：泡沫算错。

**2. 管线开关。** 每个技术条目都标上"WebGL 实现 / TSL 实现 / 两者都有"。r186 里 PS1、CRT、Bayer、`toonOutlinePass`、`GodraysNode` 只有 TSL 版本。

**3. 导出规格建议包含的字段。**
- 视觉意图：肉眼可验证的描述，比如"阴影边缘是硬的、1 个像素过渡"。
- 精确的 API 选择，包括 r186 的类名。
- 必须避免的误区：直接从本目录的"常见误区"列里取。
- 验收检查项：比如"把 toneMapping 切到 None 后色板不变"、"转动镜头 90° 时抖动图案不游动"。

这样 AI agent 拿到的是带"负面约束"的规格，0.2 里列的那类错误就不容易复现。
