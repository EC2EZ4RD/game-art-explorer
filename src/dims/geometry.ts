import { all, notVoxel } from './conditions';
import { is, registerParams } from './registry';
import type { ParamDef } from './types';

const defs: ParamDef[] = [
  {
    id: 'geometry.representation', dim: 'geometry', group: '表示方式', label: '几何表示', kind: 'choice', default: 'faceted', rebuild: 'scene',
    options: [
      {
        value: 'smooth', label: '光滑圆润', term: { zh: '平滑着色', en: 'Smooth shading' },
        desc: '高分段、顶点法线平滑，看不出面片', prompt: '物体由光滑圆润的曲面构成，看不出面片',
        techPrompt: '高分段几何，mergeVertices 后 computeVertexNormals 得到平滑法线',
        port: { godot: 'MeshInstance3D 默认平滑法线；SurfaceTool.generate_normals()', godotLevel: 'builtin' },
      },
      {
        value: 'faceted', label: '低多边形折面', term: { zh: '低多边形 + 面着色', en: 'Low poly + Flat shading' },
        desc: '少而大的面片，每个面一个明暗', prompt: '物体由少量、经过取舍的大面片构成，每个面有独立明暗，轮廓清楚',
        techPrompt: '低分段几何（如 IcosahedronGeometry detail 0~1、6~8 段圆柱），每个三角面使用面法线',
        pitfalls: ['flat shading ≠ 低多边形：低多边形靠的是又少又大的面加清晰轮廓，高面数加 flat 只是磨砂感'],
        port: { godot: '低面数网格；面法线用 SurfaceTool 不共享顶点，或着色器 NORMAL = normalize(cross(dFdx(VERTEX), dFdy(VERTEX)))', godotLevel: 'shader' },
      },
      {
        value: 'voxel', label: '体素方块', term: { zh: '体素', en: 'Voxel' },
        desc: '所有物体按统一网格变成小方块', prompt: '整个世界用统一尺度的体素方块构建，轮廓呈阶梯状，按区域合并颜色',
        techPrompt: '按统一体素尺度对场景体素化（图元解析内外判定 / 网格用 three-mesh-bvh），InstancedMesh 渲染',
        pitfalls: ['体素 ≠ 屏幕像素化：体素是空间里的方块，转动镜头时方块的透视和阴影都是真的'],
        port: { godot: 'MultiMeshInstance3D 放方块，或 GridMap；大量体素建议 greedy meshing 后用 ArrayMesh', godotLevel: 'script' },
      },
    ],
    explain: {
      plain: '同一个布局，物体用什么几何来表示：光滑曲面、折面低模，还是方块。这是结构选择，不是滤镜。',
      lookAt: '物体外轮廓与表面上的面片',
      tech: '替换内容：光滑 = 曲面屋顶高分段、球与圆柱 24 段以上、顶点法线平滑；低多边形 = 屋顶按坡分成几块大折面、树冠换成二十面体、圆柱降到 6~8 棱、每个三角面一个明暗；体素 = 每个图元按体素尺寸做内外判定后换成方块（InstancedMesh），屋顶与圆形变成阶梯。地形同理：平滑网格 / 折面三角网 / 方块柱。',
      limits: '切换会替换几何，但布局、种子、颜色角色保持不变，方便公平比较',
    },
  },
  {
    id: 'geometry.normals', dim: 'geometry', group: '表示方式', label: '面法线做法', kind: 'choice', default: 'nonIndexed', rebuild: 'uniform',
    options: [
      { value: 'nonIndexed', label: '非索引几何（toNonIndexed）', desc: '每个三角面独立顶点，法线在 CPU 上算好', techPrompt: 'geometry.toNonIndexed() 后 computeVertexNormals()，每面独立顶点' },
      { value: 'derivative', label: '着色器导数', desc: '片元着色器里用屏幕导数算面法线，几何保持共享顶点', techPrompt: '片元着色器中 normal = normalize(cross(dFdx(worldPos), dFdy(worldPos)))' },
    ],
    activeWhen: all(notVoxel, (s) => (is(s, 'geometry.representation', 'faceted') ? true : '只在低多边形折面下生效')),
    explain: {
      plain: '面着色的两种实现，画面几乎一样，但影响描边：非索引几何会让反向外壳描边在硬边处裂开（需要另存一份平滑法线）。',
      pitfalls: ['toNonIndexed() + Inverted Hull：外壳沿各面法线挤出，转角处会裂开，必须给描边单独准备平滑法线'],
    },
    port: { godot: '两种都可：ArrayMesh 不共享顶点，或 spatial 着色器里用 dFdx/dFdy', godotLevel: 'shader' },
  },
  {
    id: 'geometry.segments', dim: 'geometry', group: '精细度', label: '曲面分段', kind: 'int', min: 3, max: 32, step: 1, default: 6, rebuild: 'scene',
    activeWhen: notVoxel,
    explain: { plain: '圆柱、球这些曲面用几段来近似。', ends: ['棱角分明', '接近圆'], term: { zh: '分段数', en: 'Segments' } },
  },
  {
    id: 'geometry.vertexJitter', dim: 'geometry', group: '精细度', label: '手作歪斜', kind: 'range', min: 0, max: 0.3, step: 0.01, default: 0.06, rebuild: 'scene',
    activeWhen: notVoxel,
    explain: { plain: '给模型顶点一点点随机偏移，打破机器般的规整。', ends: ['完美规整', '手捏般歪斜'], term: { zh: '顶点抖动', en: 'Vertex jitter' } },
    prompt: (v) => (Number(v) > 0.12 ? '形体略带手工捏制的不规整感' : null),
  },
  {
    id: 'geometry.voxelSize', dim: 'geometry', group: '体素', label: '体素尺寸', kind: 'range', min: 0.12, max: 1.2, step: 0.02, default: 0.42, unit: '米', rebuild: 'scene',
    activeWhen: (s) => (is(s, 'geometry.representation', 'voxel') ? true : '只在体素表示下生效'),
    explain: { plain: '方块有多大。', ends: ['细腻的小方块', '粗犷的大方块'], pitfalls: ['体素越小数量越多（立方增长），性能下降很快'] },
    prompt: (v) => `体素尺寸约 ${Number(v).toFixed(2)} 米`,
  },
  {
    id: 'geometry.voxelBevel', dim: 'geometry', group: '体素', label: '方块倒角', kind: 'range', min: 0, max: 0.3, step: 0.01, default: 0.0, rebuild: 'scene', advanced: true,
    activeWhen: (s) => (is(s, 'geometry.representation', 'voxel') ? true : '只在体素表示下生效'),
    explain: { plain: '方块边缘圆一点，更像积木或糖果。' },
  },
];

registerParams(defs);
