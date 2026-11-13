import { getParam } from './registry';
import type { PortInfo } from './types';

/*
 * 迁移说明补全：维度文件里没写 port 的参数在这里集中登记（多为某个主参数的子参数）。
 * 只补缺，不覆盖维度文件里已有的 port。
 */

/** 网页端程序生成的几何：迁移时有两条路 */
const GEO = (what: string): PortInfo => ({
  godot: `${what}在网页端按种子程序生成；迁移时导出 GLB（顶点色存颜色角色）直接导入，或用 GDScript + SurfaceTool 按同一参数重建`,
  godotLevel: 'script',
});
const TERRAIN = (what: string): PortInfo => ({
  godot: `${what}：FastNoiseLite 生成高度（noise_type / fractal_type / domain_warp 与本工具同名概念）→ SurfaceTool 建网格，HeightMapShape3D 做碰撞`,
  godotLevel: 'script',
});
const SCATTER = (what: string): PortInfo => ({
  godot: `${what}：GDScript 做泊松盘采样，用 MultiMeshInstance3D 批量摆放；落点用 PhysicsDirectSpaceState3D.intersect_ray 贴地`,
  godotLevel: 'script',
});
const SURF = (what: string): PortInfo => ({ godot: `art_style.gdshader 的 ${what}（导出包已带）`, godotLevel: 'shader' });
const LINE = (what: string): PortInfo => ({ godot: `${what}（导出包 outline.gdshader / post_edges.gdshader 里的同名 uniform）`, godotLevel: 'shader' });
const POST = (what: string): PortInfo => ({ godot: `${what}（导出包 post_*.gdshader 里的同名 uniform）`, godotLevel: 'post' });
const BIOME = (what: string): PortInfo => ({ godot: `${what}：在地形材质的 fragment() 里按世界高度（VERTEX 换算到世界）与坡度（NORMAL.y）混合颜色角色`, godotLevel: 'shader' });

export const PORTS: Record<string, PortInfo> = {
  'game.scene': GEO('整个场景'),
  'game.kit': GEO('建筑套件'),
  'game.genre': { godot: '不影响渲染：决定测试用的镜头与观看条件，对应 Godot 里的 Camera3D 设置与关卡尺度', godotLevel: 'builtin' },

  'world.height': TERRAIN('高度幅度'),
  'world.redistribute': TERRAIN('高度重映射 pow(h, k)'),
  'world.terraces': TERRAIN('梯田量化 floor(h * n) / n'),
  'world.terraceSoft': TERRAIN('台阶边缘平滑'),
  'world.island': TERRAIN('岛屿遮罩（按到中心距离衰减高度）'),
  'world.seaLevel': TERRAIN('海平面高度（水面 MeshInstance3D 的 y）'),
  'world.size': TERRAIN('地图边长'),
  'world.curveAmount': { godot: '导出包 art_style.gdshader / outline.gdshader 的 BEND 常量', godotLevel: 'shader' },
  'world.base': GEO('微缩底座'),
  'world.resolution': TERRAIN('网格密度（SurfaceTool 的细分数）'),
  'world.jitter': TERRAIN('顶点抖动'),
  'world.tileLevels': GEO('地块高度级数'),
  'world.biome': BIOME('分带依据'),
  'world.biomeBlend': BIOME('分带过渡（step 或 smoothstep）'),
  'world.beach': BIOME('沙滩带宽'),
  'world.snowLine': BIOME('雪线高度'),
  'world.highland': BIOME('高地起点'),
  'world.trees': SCATTER('树木密度'),
  'world.rocks': SCATTER('石块密度'),
  'world.flowers': SCATTER('花草点缀'),
  'world.clouds': SCATTER('漂浮云数量'),
  'world.scatterSpacing': SCATTER('泊松盘最小间距'),

  'geometry.segments': GEO('曲面分段（SphereMesh.radial_segments / rings 等）'),
  'geometry.vertexJitter': GEO('顶点歪斜'),
  'geometry.voxelSize': GEO('体素尺寸（GridMap 的 cell_size，或 MultiMesh 方块）'),
  'geometry.voxelBevel': GEO('方块倒角'),

  'shape.canopy': GEO('树冠造型'),
  'shape.proportion': GEO('粗壮 / 修长比例'),
  'shape.headRatio': GEO('角色头身比（骨骼缩放或分件模型）'),
  'shape.character': GEO('角色造型'),
  'shape.detail': GEO('细节频率'),
  'shape.variation': GEO('个体大小差异'),

  'material.variation': SURF('个体色差（按实例 INSTANCE_CUSTOM 或世界坐标噪声扰动 albedo）'),

  'shading.steps': SURF('steps'),
  'shading.threshold': SURF('threshold'),
  'shading.softness': SURF('softness'),
  'shading.shadowColor': SURF('shadow_color'),
  'shading.shadowTint': SURF('shadow_tint'),
  'shading.shadowDepth': SURF('shadow_depth'),
  'shading.quantizeShadow': SURF('quantize_shadow（在 light() 里把 ATTENUATION 一起阈值化）'),
  'shading.wrap': SURF('wrap'),
  'shading.rimWidth': SURF('rim_width'),
  'shading.highlight': SURF('highlight'),
  'shading.hatchScale': SURF('排线间距'),
  'shading.hatchAnchor': SURF('排线锚定（屏幕空间用 SCREEN_UV，物体空间用世界坐标三平面）'),

  'lines.outlineWidth': LINE('width_px'),
  'lines.outlineMode': LINE('线宽随距离：固定像素或按 clip.w 缩放'),
  'lines.outlineColorMode': LINE('tint_by_albedo / outline_color'),
  'lines.outlineColor': LINE('outline_color'),
  'lines.outlineScope': { godot: '只给需要描边的材质设置 next_pass（导出包按颜色角色分配材质）', godotLevel: 'builtin' },
  'lines.outlineNormals': { godot: '平滑法线烘到 CUSTOM0（导入脚本或 SurfaceTool），outline.gdshader 改读 CUSTOM0', godotLevel: 'script' },
  'lines.edgeWidth': LINE('内线宽度'),
  'lines.edgeThreshold': LINE('检测阈值'),
  'lines.edgeColorMode': LINE('内线颜色'),
  'lines.edgeFade': LINE('远处淡出（按线性深度）'),
  'lines.boil': LINE('线条抖动（按 TIME 取整换噪声种子）'),
  'lines.wobble': LINE('线条歪斜（采样坐标加噪声偏移）'),

  'surface.strength': POST('媒介强度 strength'),
  'surface.scale': POST('笔触 / 颗粒尺度'),
  'surface.edgeDarken': POST('边缘积色'),
  'surface.bleed': POST('渗色晕染'),
  'surface.inkLevels': POST('墨色层次'),
  'surface.keepAccent': { godot: 'Godot 没有颜色角色缓冲：保留强调色需要强调物用单独材质写 stencil 或放进单独的 SubViewport', godotLevel: 'hard' },
  'surface.radius': POST('Kuwahara 半径'),
  'surface.impasto': POST('厚涂起伏'),
  'surface.spotColors': POST('专色组合'),
  'surface.paperColor': POST('纸色混入'),
  'surface.grain': POST('grain'),
  'surface.chroma': POST('色差（RGB 分别偏移采样）'),
  'surface.vignette': POST('vignette'),

  'color.temperature': { godot: 'Environment.adjustment_color_correction（LUT）或全屏着色器乘一个冷暖色', godotLevel: 'builtin' },
  'color.gradeAmount': POST('grade_amount'),
  'color.isolateAmount': { godot: 'style_demo.gd 里非保留角色材质的 desaturate', godotLevel: 'shader' },
  'color.levels': POST('levels'),

  'lighting.cycle': { godot: '脚本在 _process 里推进时间：旋转 DirectionalLight3D，并插值 light_color、Environment 的天空 / 雾 / 环境光颜色', godotLevel: 'script' },
  'lighting.cycleSpeed': { godot: '同上脚本里的时间倍率', godotLevel: 'script' },
  'lighting.timeLink': { godot: '同上脚本：选择哪些颜色随时段插值', godotLevel: 'script' },
  'lighting.azimuth': { godot: 'DirectionalLight3D.rotation_degrees.y', godotLevel: 'builtin' },
  'lighting.sun': { godot: 'DirectionalLight3D.light_energy', godotLevel: 'builtin' },
  'lighting.shadowSoft': { godot: 'DirectionalLight3D.shadow_blur + 项目设置 soft_shadow_filter_quality', godotLevel: 'builtin' },
  'lighting.shadowStrength': { godot: 'DirectionalLight3D.shadow_opacity', godotLevel: 'builtin' },
  'lighting.shadowRes': { godot: '项目设置 rendering/lights_and_shadows/directional_shadow/size', godotLevel: 'builtin' },
  'lighting.cloudShadows': { godot: '在表面着色器 light() 里用滚动噪声乘 ATTENUATION（Godot 4 的平行光没有 light cookie）', godotLevel: 'shader' },
  'lighting.aoRadius': { godot: 'Environment.ssao_radius', godotLevel: 'builtin' },
  'lighting.lanterns': { godot: 'OmniLight3D.light_energy（夜间由昼夜脚本调高）', godotLevel: 'builtin' },

  'camera.angle': { godot: 'Camera3D 的俯仰角（rotation_degrees.x = -俯角）', godotLevel: 'builtin' },
  'camera.azimuth': { godot: 'Camera3D 绕注视点的水平角（父节点 rotation_degrees.y）', godotLevel: 'builtin' },
  'camera.zoom': { godot: '正交：Camera3D.size；透视：相机距离或 fov', godotLevel: 'builtin' },
  'camera.pixelSnap': { godot: '把相机位置按"一个低分辨率像素对应的世界尺寸"取整（SubViewport 像素化时）', godotLevel: 'script' },
  'camera.tiltFocus': POST('移轴清晰带位置 focus'),
  'camera.dofRange': { godot: 'CameraAttributesPractical 的 dof_blur_far/near_distance 与 transition', godotLevel: 'builtin' },

  'atmosphere.fogDensity': { godot: 'Environment.fog_density（深度雾模式下用 fog_depth_begin / fog_depth_end）', godotLevel: 'builtin' },
  'atmosphere.waterOpacity': { godot: '水面 ShaderMaterial 的 ALPHA（render_mode blend_mix）', godotLevel: 'shader' },
  'atmosphere.waves': { godot: '水面着色器 vertex() 里按 TIME 起伏 VERTEX.y', godotLevel: 'shader' },
  'atmosphere.cloudDrift': { godot: '脚本移动云节点，或天空着色器里按 TIME 平移噪声', godotLevel: 'script' },

  'motion.squash': { godot: 'Tween / AnimationPlayer 缩放角色网格（保持体积：y 拉长时 xz 收窄）', godotLevel: 'script' },
  'motion.bob': { godot: 'CharacterBody3D 移动时按步频正弦偏移网格 y', godotLevel: 'script' },
  'motion.speed': { godot: 'CharacterBody3D.velocity 的速度上限', godotLevel: 'script' },

  'hud.useSceneColors': { godot: 'Theme 资源的颜色取自 palette.gd 的颜色角色', godotLevel: 'builtin' },
};

for (const [id, port] of Object.entries(PORTS)) {
  const p = getParam(id);
  if (p && !p.port?.godot) p.port = { ...p.port, ...port };
}
