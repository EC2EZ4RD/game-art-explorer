import type { Values } from '../dims/types';

/*
 * 提示词体检：把一段美术/技术提示词映射成实验参数，并标出技术误区。
 * 本地词典匹配，不调用任何 AI 服务。词典可以继续补充。
 */

interface Rule {
  re: RegExp;
  set?: Values;
  warn?: string;
  note: string;
  /** 只在整段文本也匹配这个条件时生效 */
  when?: RegExp;
  unless?: RegExp;
}

const RULES: Rule[] = [
  { re: /PlaneGeometry/i, set: { 'world.mesh': 'grid' }, note: '地表网格 → 规则网格', warn: 'PlaneGeometry 的对角线全朝一个方向，面着色时会出现同方向斜纹；可改用抖动网格或 Poisson + Delaunay' },
  { re: /Perlin/i, set: { 'world.noise': 'perlin' }, note: '噪声 → Perlin' },
  { re: /Simplex/i, set: { 'world.noise': 'simplex' }, note: '噪声 → Simplex', unless: /Perlin\s*\/\s*Simplex|Perlin\/Simplex/i },
  { re: /分形|fbm|fractal/i, set: { 'world.fractal': 'fbm' }, note: '分形叠加 → fBm' },
  { re: /山脊|ridged/i, set: { 'world.fractal': 'ridged' }, note: '分形 → Ridged 山脊' },
  { re: /toNonIndexed|面着色|Flat\s*Shading|faceted/i, set: { 'geometry.representation': 'faceted', 'geometry.normals': 'nonIndexed' }, note: '几何表示 → 低多边形折面（非索引几何）' },
  { re: /低多边形|low\s*-?poly/i, set: { 'geometry.representation': 'faceted' }, note: '几何表示 → 低多边形' },
  { re: /体素|voxel/i, set: { 'geometry.representation': 'voxel' }, note: '几何表示 → 体素', unless: /禁止[^。\n]{0,20}(体素|方块|voxel)|NO\s*Voxels|不要[^。\n]{0,10}(体素|方块)/i },
  { re: /禁止[^。\n]{0,20}(体素|方块|voxel)|NO\s*Voxels/i, note: '明确禁止体素：保持光滑或折面表示' },
  { re: /MeshToonMaterial/i, set: { 'shading.model': 'toonRamp' }, note: '明暗 → 内置式卡通色阶（MeshToonMaterial）', warn: 'MeshToonMaterial 的 gradientMap 只读 R 通道且必须 NearestFilter；投影不参与色阶量化，软阴影边缘会穿过色阶形成灰带' },
  { re: /(\d)\s*阶/, note: '色阶数', set: {} },
  { re: /赛璐璐|cel[\s-]?shad/i, set: { 'shading.model': 'cel' }, note: '明暗 → 赛璐璐' },
  { re: /Inverted\s*Hull|反向外壳|外壳描边/i, set: { 'lines.outline': true }, note: '外轮廓描边 → 反向外壳' },
  { re: /描边|outline/i, set: { 'lines.outline': true }, note: '外轮廓描边 → 开' },
  { re: /黑色渲染|黑色描边|黑线/, set: { 'lines.outlineColorMode': 'black' }, note: '线色 → 墨色' },
  { re: /高饱和/, set: { 'color.saturation': 1.1 }, note: '饱和度 → 偏高' },
  { re: /柠檬黄|苹果绿|松石青/, set: { 'color.palette': 'inspiration' }, note: '色板 → 高饱和纯色（灵感提示词）' },
  { re: /马卡龙|粉彩|pastel/i, set: { 'color.palette': 'macaron' }, note: '色板 → 马卡龙粉彩' },
  { re: /(水体|水面|水)[^。\n]{0,8}(清透|半透明|透明)/, set: { 'atmosphere.water': 'toon' }, note: '水面 → 清透卡通水' },
  { re: /OrthographicCamera|正交/i, set: { 'camera.projection': 'ortho' }, note: '投影 → 正交' },
  { re: /等距|isometric/i, set: { 'camera.angle': 'iso' }, note: '俯角 → 真等距 35.26°', warn: '"等距"有歧义：真等距是 35.264° 俯角，像素游戏常说的等距是 2:1 二等角（30°），建议写明' },
  { re: /PCFShadowMap/i, set: { 'lighting.shadows': 'pcf' }, note: '阴影 → PCF', when: /硬阴影|hard\s*shadow/i, warn: 'three.js r182 起 PCFShadowMap 是软阴影，不能保证"硬阴影"；硬边请用 BasicShadowMap，或在自定义光照里阈值化阴影因子' },
  { re: /PCFShadowMap/i, set: { 'lighting.shadows': 'pcf' }, note: '阴影 → PCF 软阴影', unless: /硬阴影|hard\s*shadow/i },
  { re: /硬阴影|hard\s*shadow/i, note: '阴影边缘要求清晰', unless: /PCFShadowMap/i, set: { 'lighting.shadows': 'hard' } },
  { re: /环境光|AmbientLight|HemisphereLight/i, set: { 'shading.ambient': 0.45 }, note: '环境光 → 柔和' },
  { re: /黏土小人|clay\s*figure/i, set: { 'shape.character': 'clay' }, note: '角色 → 黏土小人' },
  { re: /胶囊/, set: { 'shape.character': 'capsule' }, note: '角色 → 胶囊小人', unless: /黏土小人/ },
  { re: /WASD|方向键/i, set: { 'game.controls': 'walk' }, note: '操作 → WASD 行走' },
  { re: /镜头跟随|跟随视角|camera\s*follow/i, set: { 'camera.mode': 'follow' }, note: '镜头 → 跟随角色' },
  { re: /贴合[^。\n]{0,6}地形|贴地/, note: '角色贴地', warn: '抖动或离散化后的网格与噪声函数高度不一致：贴地要射线投射到实际网格表面' },
  { re: /圆冠|阔叶/, set: { 'shape.canopy': 'cluster', 'world.trees': 0.45 }, note: '树冠 → 团簇圆冠' },
  { re: /针叶|松/, set: { 'world.trees': 0.45 }, note: '高地针叶松' },
  { re: /石块|圆石|rock/i, set: { 'world.rocks': 0.35 }, note: '散落石块' },
  { re: /积雨云|漂浮[^。\n]{0,4}云|cloud/i, set: { 'world.clouds': 6 }, note: '漂浮云' },
  { re: /(水|波)[^。\n]{0,8}(浮动|起伏|波动)/, set: { 'atmosphere.waves': 0.35 }, note: '水面浮动', warn: '浮在水上的物体要与水面共用同一个波函数' },
  { re: /自动昼夜|昼夜流转|日夜循环/, set: { 'lighting.cycle': true }, note: '自动昼夜' },
  { re: /太阳方位|日夜时间滑块|时间滑块/, note: '时间滑块（实验台默认提供）' },
  { re: /新粗野主义|Neo-?Brutalism/i, set: { 'hud.style': 'neobrutal' }, note: 'UI → 新粗野主义' },
  { re: /毛玻璃|glassmorphism/i, set: { 'hud.style': 'glass' }, note: 'UI → 毛玻璃' },
  { re: /自转/, note: '镜头自转（可在镜头行为里切换）' },
  { re: /水彩|watercolor/i, set: { 'surface.medium': 'watercolor' }, note: '媒介 → 水彩' },
  { re: /水墨|ink\s*wash|sumi/i, set: { 'surface.medium': 'ink', 'color.palette': 'inkwash', 'atmosphere.sky': 'paper' }, note: '媒介 → 水墨' },
  { re: /工笔/, set: { 'surface.medium': 'gongbi', 'color.palette': 'gongbi', 'lines.edges': 'all', 'lines.edgeColorMode': 'tinted' }, note: '媒介 → 工笔淡彩（局部实验）', warn: '工笔需要有主次的手绘勾线与层层设色，实时后处理只能近似，完整效果需要专用线稿素材' },
  { re: /像素|pixel\s*art|pixelat/i, set: { 'camera.pixelSize': 4, 'camera.pixelSnap': true }, note: '像素化 → 4 倍', unless: /像素方块|禁止[^。\n]{0,10}像素/ },
  { re: /PS1|PSX|PlayStation\s*1/i, set: { 'camera.psx': 0.6, 'camera.pixelSize': 3, 'color.quantize': 'levels', 'color.dither': 'bayer4' }, note: 'PS1 复古' },
  { re: /网点|halftone|screentone/i, set: { 'surface.medium': 'halftone' }, note: '媒介 → 漫画网点' },
  { re: /油画|厚涂|oil\s*paint|impasto/i, set: { 'surface.medium': 'oil' }, note: '媒介 → 油画厚涂' },
  { re: /素描|sketch|排线|hatch/i, set: { 'surface.medium': 'sketch' }, note: '媒介 → 素描' },
  { re: /版画|木刻|woodcut|linocut/i, set: { 'surface.medium': 'woodcut' }, note: '媒介 → 版画木刻' },
  { re: /移轴|tilt-?shift|微缩/i, set: { 'camera.tiltShift': 0.5 }, note: '移轴微缩', warn: '微缩感来自高俯角 + 浅景深 + 高饱和 + 玩具材质的组合，单靠模糊不够' },
  { re: /辉光|泛光|bloom/i, set: { 'camera.bloom': 0.6 }, note: '辉光' },
  { re: /抖色|dither/i, set: { 'color.quantize': 'palette', 'color.dither': 'bayer4' }, note: '限色 + 抖色' },
  { re: /ACES/i, set: { 'color.tonemap': 'aces' }, note: '色调映射 → ACES', warn: 'ACES 会让高饱和纯色偏色、高光去饱和' },
  { re: /AgX/i, set: { 'color.tonemap': 'agx' }, note: '色调映射 → AgX', warn: 'AgX 去饱和明显，风格化色板容易发灰' },
  { re: /PBR|物理材质|MeshStandardMaterial/i, set: { 'shading.model': 'pbr' }, note: '明暗 → PBR', warn: 'PBR 不等于写实：写实感主要来自资产与贴图' },
  { re: /塞尔达|织梦岛|Link'?s\s*Awakening/i, note: '参考：塞尔达传说 织梦岛（2019，移轴玩具布景）' },
  { re: /Messenger/i, note: '参考：Messenger（Abeto，three.js 小星球网页游戏）' },
];

export interface CheckResult {
  changes: Values;
  matched: { phrase: string; note: string }[];
  warnings: string[];
  unmatched: string[];
}

export function checkPrompt(text: string): CheckResult {
  const changes: Values = {};
  const matched: CheckResult['matched'] = [];
  const warnings: string[] = [];
  const sentences = text.split(/[\n。；;！!]+/).map((s) => s.trim()).filter((s) => s.length > 3);
  const hitSentences = new Set<number>();
  for (const r of RULES) {
    const m = text.match(r.re);
    if (!m) continue;
    if (r.when && !r.when.test(text)) continue;
    if (r.unless && r.unless.test(text)) continue;
    Object.assign(changes, r.set ?? {});
    matched.push({ phrase: m[0], note: r.note });
    if (r.warn && !warnings.includes(r.warn)) warnings.push(r.warn);
    sentences.forEach((s, i) => { if (r.re.test(s)) hitSentences.add(i); });
  }
  // 色阶数
  const steps = text.match(/(\d)\s*阶[^。\n]{0,10}(渐变|Gradient|色阶|阶梯)/i) ?? text.match(/(Gradient|渐变)[^。\n]{0,12}(\d)\s*阶/i);
  if (steps) {
    const n = Number(steps[1].match(/\d/) ? steps[1] : steps[2]);
    if (n >= 2 && n <= 6) changes['shading.steps'] = n;
  }
  // 组合误区
  if (/toNonIndexed/i.test(text) && /Inverted\s*Hull|反向外壳/i.test(text)) {
    warnings.push('toNonIndexed() 与反向外壳同时使用：外壳沿各面法线挤出，低模转角会裂开，需要给描边单独准备平滑法线');
  }
  if (/禁止[^。\n]{0,20}(体素|方块|voxel)|NO\s*Voxels/i.test(text)) {
    warnings.push('"禁止方块"只适用于这一个方案；体素本身是一个独立方向，可以在几何表示里单独探索');
  }
  const unmatched = sentences.filter((_, i) => !hitSentences.has(i));
  return { changes, matched, warnings, unmatched };
}

export const INSPIRATION_PROMPT = `【核心创意】
将《我的世界》（Minecraft）的沙盒探索玩法，全盘迁移到现代高品质 NPR（非真实感卡通渲染/微缩手办）美学中。
⚠️ 绝对禁止使用任何立方体/方块（Strictly NO Voxels, NO Cubes, NO Minecraft block textures）！我们要的是像《塞尔达传说：织梦岛》重制版与《Messenger》那样自然起伏的低多边形微缩沙盒。
【一、视觉与渲染标准（严格执行）】
1. 地貌结构：使用平滑起伏的低多边形网格（PlaneGeometry + 连续分形 Perlin/Simplex 噪声）。使用 toNonIndexed() 实现清脆利落的面着色（Faceted Flat Shading），禁止粗糙的像素方块。
2. 着色管线：全局使用 MeshToonMaterial，绑定 Canvas 动态生成的 3 阶灰度阶梯渐变（Gradient Map），呈现干净干练的二分/三分阶梯硬光影。
3. 描边工艺：全场景重要物体（地形、植被、角色）必须基于反向外壳技术（Inverted Hull: 沿平滑法线微量膨胀 + BackSide 黑色渲染），打造手办线稿轮廓。
4. 色彩调色板：采用高饱和纯色。海滨浅滩柠檬黄、低地苹果绿、高山松石青、雪顶纯白，水体清透半透明，拒绝写实油腻贴图。
5. 等距光影：正交等距视角（OrthographicCamera），配置带硬阴影（PCFShadowMap）的 DirectionalLight 与柔和的环境光。
【二、沙盒游戏性（汲取《我的世界》的核心要素）】
1. 角色与漫游：在沙盘上生成一个简易小巧的 3D 黏土小人（或小胶囊角色），实现键盘 WASD / 方向键移动，平滑贴合起伏地形高度，镜头跟随角色。
2. 动态生态世界：随噪声起伏自然生成的植被群落（圆冠阔叶树、高山针叶松、圆润的小石块、漂浮积雨云）；水体边缘轻微动态浮动。
3. 动态时间与环境：提供动态太阳方位或自动昼夜流转逻辑，展现阳光拉长时沙盘阴影切面的玩具美感。
4. 界面交互：左上角保留精致的新粗野主义（Neo-Brutalism）控制面板，包含：重新生成种子、描边开关、自转/跟随视角切换、日夜时间滑块。`;
