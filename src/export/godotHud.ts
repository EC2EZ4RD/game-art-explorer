import { getAsset } from '../content/assets';
import { str } from '../dims/registry';
import type { Values } from '../dims/types';
import { FONT_ROLES, HAVE_FAMILY, HUD_FONT_FILES, licenseFilesOf, roleCjkDisplayOnly, roleHasFont, roleResolved } from '../hud/fontList';
import { sampleKind } from '../hud/content/samples';
import { feedLines, screenGroups, spokenLine, textFor, textPick } from '../hud/content/texts';
import { CAT_DEFAULT, richBBCode } from '../hud/richText';
import { frameAssetId, UI_ASSET_IDS } from '../hud/uiAssets';
import { parseColor } from '../hud/material';
import { borderWidths, outlineWidth, resolveColor } from '../hud/paint';
import { resolveUi, type Resolved } from '../hud/sys/resolve';
import { parseOverrideKey } from '../hud/sys/register';
import { THEME_SCOPED } from '../hud/sys/scopable';
import { deviceAspect as deviceAspectOf } from '../hud/sys/device';
import { scenePaletteOf } from '../hud/sys/scenePalette';
import { afterSkin, buildTheme, onColorOf, patchTheme, type Theme } from '../hud/sys/theme';
import type { BoxStyle, Corner, Paint, Radius, SkinPalette, TextStyle } from '../hud/types';
import { packFor, type ContentPack } from '../hud/content';
import { elementLayout, layoutGd, type LayoutOut } from './godotLayout';
import { hudOrgOf } from '../hud/compose/hud';
import { graphOf, graphPlanOf, overlayBody, wantsTemplate } from '../hud/compose/screen';
import { ctaText, lineTable, rarityTable, scopeChainOf, tableColor } from '../hud/elements/core';

/*
 * 游戏 UI 的 Godot 4 迁移（docs/ui-hud-plan.md M4）：
 *   ui/ui_theme.tres —— Theme 资源：StyleBoxFlat（面板 / 对话框 / 小地图 / 按键 / 血条底与填充 / 按钮四态）、颜色、字号、
 *                       描边与投影常量、类型变体（HudTitle、HudName、HudKey……）。能用 Godot 内置表达的都写进去；
 *                       按目标的覆盖（<参数>@<元素 | 部件>，M12a-01）每个目标一个类型变体 Hud_<目标>（PanelContainer + 覆盖后的面板 StyleBox）
 *                       与 Hud_<目标>Label（覆盖后的字色），按钮 / 按键 / 数值条的目标换成对应的基类型；
 *   ui/hud_sample.gd —— 运行时读字体（FontFile.load_dynamic_font，WOFF2 不需要导入步骤）、按字重 / 字距 / 斜体做 FontVariation、
 *                       搭出与探索台同样的四个控件；全部就绪后打印 GAE_HUD_OK（校验脚本据此判定成功，防止"资源没加载"被过滤后假通过）；
 *                       控件里的字来自这份参数的示例内容包（packFor(r)，不读画布的当前包），一律 JSON.stringify 成 GDScript 字符串；
 *   ui/fonts/ —— 探索台的 OFL 字体子集与许可原文；
 *   ui/tex/ —— 选了素材外框（ast.frame = 雕花 / 平框九宫格 × ast.frameMat）时的外框 PNG（192 px 的 Godot 变体），
 *              面板 / 对话框 / 小地图框改用 StyleBoxTexture，底色由 hud_sample.gd 垫在外框下面（M11）；
 *   ui/UI_MIGRATION.md —— 每个 token 的做法与难度：内置 / 需着色器 / 需脚本 / 需素材，以及本包是否已经做了；另列 UI 位图素材在 Godot 里的用法。
 */

/** asset：public/assets/tex/ 下的二进制素材（打包时原样拷贝，同 GodotFile.asset） */
export interface GodotUiFile { path: string; text: string; font?: string; license?: string; asset?: string }

type Props = Record<string, string | number | boolean>;

/** 选中的素材外框 → Godot 变体 PNG 与切边（192 px，StyleBoxTexture 的角按原像素 1:1 画）；不是九宫格 / 没有素材时 null */
interface FrameTex { id: string; file: string; slice: number; band: number }
/** 画布上画的是哪种九宫格（与 frame.ts drawFrame 同口径，B4 审查修复）：顶冠框 / 三段式的中段 = 平框，整幅插画框没有素材时 = 雕花框；环带 / 齿轮不是九宫格 */
const nineKind = (k: string) => (k === 'crowned' || k === 'threePart' ? 'plainNinePatch' : k === 'illustratedFrame' ? 'carvedNinePatch' : k);
function frameTex(s: BoxStyle): FrameTex | null {
  if (!s.frame) return null;
  const id = frameAssetId(nineKind(s.frame.kind), s.frame.mat);
  const a = id ? getAsset(id) : undefined;
  const m = a?.meta as unknown as { sliceGodot?: number; bandGodot?: number } | undefined;
  const file = a?.files.godot;
  if (!id || !file || !m?.sliceGodot) return null;
  return { id, file, slice: m.sliceGodot, band: m.bandGodot ?? m.sliceGodot };
}

type Level = 'builtin' | 'script' | 'shader' | 'texture' | 'hard';
const LEVEL_TEXT: Record<Level, string> = { builtin: '内置', script: '需脚本', shader: '需着色器', texture: '需素材 / 贴图', hard: '困难' };

export interface UiNote { where: string; what: string; how: string; level: Level; done: boolean; params?: string[] }

const f3 = (x: number) => +x.toFixed(4);
function gColor(c: string | undefined, pal: SkinPalette, fallback = 'transparent'): string {
  const [r, g, b, a] = parseColor(resolveColor(c, pal, fallback));
  return `Color(${f3(r / 255)}, ${f3(g / 255)}, ${f3(b / 255)}, ${f3(a)})`;
}

/** 渐变 / 图案的平均色（StyleBoxFlat 只有纯色底时的近似） */
function paintColor(p: Paint | undefined, pal: SkinPalette): string | null {
  if (!p) return null;
  if ('solid' in p) return resolveColor(p.solid, pal);
  if ('pattern' in p) return resolveColor(p.pattern.bg ?? p.pattern.fg, pal);
  const stops = 'linear' in p ? p.linear.stops : p.radial.stops;
  const cs = stops.map(([, c]) => parseColor(resolveColor(c, pal)));
  const avg = [0, 1, 2, 3].map((i) => cs.reduce((s, c) => s + c[i], 0) / cs.length);
  return `rgba(${avg[0]},${avg[1]},${avg[2]},${avg[3]})`;
}

function corners(r: Radius | undefined): [number, number, number, number] {
  if (r === undefined) return [0, 0, 0, 0];
  if (typeof r === 'number') return [r, r, r, r];
  const v = r.map((x) => (typeof x === 'number' ? x : Math.min(x.x, x.y)));
  return [v[0] ?? 0, v[1] ?? v[0] ?? 0, v[2] ?? v[0] ?? 0, v[3] ?? v[1] ?? v[0] ?? 0];
}

class Sub {
  blocks: string[] = [];
  add(id: string, type: string, props: Record<string, string | number | boolean>) {
    this.blocks.push([`[sub_resource type="${type}" id="${id}"]`, ...Object.entries(props).map(([k, v]) => `${k} = ${typeof v === 'boolean' ? String(v) : v}`)].join('\n'));
    return `SubResource("${id}")`;
  }
}

/** BoxStyle → StyleBoxFlat 的属性；记下做不到的部分 */
/**
 * decorated = 这个盒子是 hud_sample.gd 的 _surfaces 会挂表面覆盖层 / 渐隐材质的默认面板（中期审查修复 ⑮：只有它的「着色器已挂上」是真的；
 * 按目标的 Hud_<目标>、按键、血条、对话框……原来也写「已挂上」，其实样本没挂、着色器文件也不一定导出）
 */
function styleBox(s: BoxStyle, pal: SkinPalette, where: string, nominalH: number, notes: UiNote[], pad?: [number, number, number, number], decorated = false): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  const bgc = paintColor(s.bg, pal);
  if (bgc) p.bg_color = gColor(bgc, pal);
  else p.draw_center = false;
  if (s.bg && !('solid' in s.bg)) {
    const kind = 'pattern' in s.bg ? '图案底' : '渐变底';
    notes.push({ where, what: kind, how: 'pattern' in s.bg ? 'StyleBoxTexture + 平铺图案贴图（本包用底色近似）' : 'StyleBoxTexture + GradientTexture2D（本包用平均色近似）', level: 'pattern' in s.bg ? 'texture' : 'builtin', done: false, params: ['vis.fill', 'col.gradient', 'vis.pattern'] });
  }
  const bw = borderWidths(s);
  if (bw.t || bw.r || bw.b || bw.l) {
    p.border_width_left = bw.l; p.border_width_top = bw.t; p.border_width_right = bw.r; p.border_width_bottom = bw.b;
    const bc = s.border?.color ?? s.sides?.l?.color ?? s.sides?.t?.color ?? s.sides?.b?.color ?? s.sides?.r?.color;
    p.border_color = gColor(bc, pal, '#000');
    if (s.sides) {
      const cols = new Set([s.sides.t?.color, s.sides.r?.color, s.sides.b?.color, s.sides.l?.color].filter(Boolean));
      if (cols.size > 1) notes.push({ where, what: '各边不同颜色', how: 'StyleBoxFlat 只有一个边框色：叠两个 StyleBox（或 NinePatchRect）', level: 'script', done: false });
    }
    if (s.border?.style === 'double') notes.push({ where, what: '双线边框', how: '两层 PanelContainer 嵌套（外层画外线，内层 content_margin 留空隙画内线）', level: 'script', done: false, params: ['vis.stroke'] });
    if (s.border?.style === 'dashed') notes.push({ where, what: '虚线边框', how: 'StyleBoxFlat 不支持虚线：StyleBoxTexture 九宫格或 _draw() 里 draw_dashed_line', level: 'texture', done: false, params: ['vis.stroke'] });
    if (s.border?.glow) notes.push({ where, what: '描边发光', how: 'canvas_item 着色器，或叠一层 shadow 颜色 = 描边色、偏移 0 的 StyleBoxFlat', level: 'shader', done: false, params: ['vis.strokeGlow'] });
  }
  // 圆角 / 切角 / 台阶 / 正圆
  let c = corners(s.radius);
  // 正圆 / 药丸：半径 = 短边一半（比尺寸大的半径加上边框时 Godot 会画出杂线）
  const half = Math.ceil(nominalH / 2);
  if (s.circle || s.shape === 'circle') c = [half, half, half, half];
  else if (s.radiusPct !== undefined) c = Array(4).fill(s.radiusPct >= 50 ? half : Math.round((s.radiusPct / 100) * nominalH)) as typeof c;
  if (s.chamfer) {
    c = [Math.round(s.chamfer), 0, Math.round(s.chamfer), 0];
    p.corner_detail = 1;
  } else if (s.step) {
    c = [s.step * 2, s.step * 2, s.step * 2, s.step * 2];
    p.corner_detail = 2;
    notes.push({ where, what: '像素台阶转角', how: '本包用 corner_detail = 2 的折线近似；逐像素台阶要 StyleBoxTexture 九宫格（texture_filter = NEAREST）', level: 'texture', done: false, params: ['vis.corner'] });
  }
  // 分角遮罩（vis.cornerMask，M12b-38）：只给选中的角半径（切角 = 那几个角 corner_detail 1 的切角）
  if (s.cornerMask && !s.circle && s.shape !== 'circle') {
    const ord: Corner[] = ['tl', 'tr', 'br', 'bl'], v = s.chamfer ? Math.round(s.chamfer) : Math.max(...c);
    c = ord.map((k, i) => (s.cornerMask!.includes(k) ? (s.chamfer ? v : c[i] || v) : 0)) as typeof c;
  }
  if (c.some((x) => x > 0)) { p.corner_radius_top_left = c[0]; p.corner_radius_top_right = c[1]; p.corner_radius_bottom_right = c[2]; p.corner_radius_bottom_left = c[3]; }
  if (Array.isArray(s.radius) && s.radius.some((x) => typeof x !== 'number')) notes.push({ where, what: '手绘椭圆圆角', how: 'StyleBoxFlat 只有圆形圆角：取较小半径近似；要手绘感用 StyleBoxTexture', level: 'texture', done: false, params: ['vis.corner', 'vis.jitter'] });
  if (s.shape && s.shape !== 'box' && s.shape !== 'circle') notes.push({ where, what: `外形（${s.shape}）`, how: ['randomQuad', 'shard', 'brushStroke'].includes(s.shape)
    ? 'StyleBoxFlat 只有矩形：把 paint.ts 的 shapePoints 移植成 GDScript（RandomNumberGenerator.seed = 盒子种子 ^ 元素 id 哈希 ^ 尺寸），在面板 Control 的 _draw() 里 draw_colored_polygon + draw_polyline；干笔刷的飞白 = canvas_item shader 噪声条纹遮罩'
    : 'StyleBoxFlat 只有矩形：Polygon2D / _draw() 画多边形（点列与 paint.ts 的 shapePoints 同一组常数），或 StyleBoxTexture', level: 'script', done: false, params: ['vis.silhouette', 'vis.panelShape'] });
  // 描边新线型与渐隐（M12b-37）
  const bs = s.border?.style;
  if (bs === 'sticker') notes.push({ where, what: '贴纸多重环描边', how: '三层：外层 StyleBoxFlat 墨色（expand_margin = 描边宽、draw_center 关）+ 主描边（border = 2 × 宽、主色）+ 内墨环（第二个 PanelContainer，content_margin 内缩 2 × 宽，border = 宽、墨色、draw_center 关）', level: 'script', done: false, params: ['vis.stroke'] });
  if (bs === 'inline') notes.push({ where, what: '内二线型材描边', how: '主边 StyleBoxFlat + 第二层 StyleBoxFlat（expand_margin 取负值内缩 宽 + 2，border 1、对比色、draw_center 关）', level: 'script', done: false, params: ['vis.stroke'] });
  if (bs === 'stitched') notes.push({ where, what: '缝线描边', how: 'StyleBoxTexture 九宫格（虚线针脚纹理，内缩 3），或 _draw() 里 draw_dashed_line', level: 'texture', done: false, params: ['vis.stroke'] });
  if (bs === 'pencil') notes.push({ where, what: '铅笔线描边', how: '_draw() 里两遍 draw_polyline（点列加种子噪声、alpha 0.6），或手绘线九宫格纹理', level: 'script', done: false, params: ['vis.stroke'] });
  if (s.border?.fade || s.sides?.t?.fade || s.sides?.l?.fade || s.sides?.b?.fade || s.sides?.r?.fade) notes.push({ where, what: '两端渐隐的线', how: '每条边一个 Line2D（gradient 两端 alpha 0，宽 = 描边宽），或 StyleBoxLine + 带渐隐的线纹理', level: 'builtin', done: false, params: ['vis.strokeFade'] });
  if (s.sideEnds) notes.push({ where, what: '开口线 + 端头小方块', how: '上下两条 Line2D（两端各让 4%）+ 线端 4 个 ColorRect 小方块', level: 'script', done: false, params: ['vis.strokeSides'] });
  if (s.edge === 'burnt' || s.edge === 'deckle' || s.edge === 'scallop' || s.edgeSides) notes.push({ where, what: `边缘变体（${s.edge}${s.edgeSides ? '，只做 ' + s.edgeSides.join('') : ''}）`, how: '边缘遮罩 canvas_item shader（噪声位移 + 焦边暗色），或对应的九宫格纸边素材；只做一边时遮罩只在那一边的 UV 范围里起作用', level: 'shader', done: false, params: ['vis.edge', 'vis.edgeSides'] });
  // 实心厚度（vis.depth = extrude，M12b-36）：StyleBoxFlat 的底边 border + expand_margin_bottom（盒子往下长出厚度、色比面深）——没有别的描边时内置就能做
  const ex = (s.shadows ?? []).find((x) => x.sweep);
  if (ex) {
    const tk = Math.max(1, Math.round(Math.max(Math.abs(ex.x), Math.abs(ex.y)))), free = !bw.t && !bw.r && !bw.b && !bw.l;
    if (free) { p.border_width_bottom = tk; p.expand_margin_bottom = tk; p.border_color = gColor(ex.color, pal, '#000'); }
    notes.push({ where, what: '实心厚度', how: free ? `StyleBoxFlat：border_width_bottom = ${tk}、expand_margin_bottom = ${tk}、border_color = 厚度色（已导出）；按下（ix.press = sink）时换一个去掉厚度、content_margin_top + ${tk} 的 pressed 样式` : '已有描边占了 border_color：厚度另放一个往下偏移的纯色 Panel（show_behind_parent）', level: 'builtin', done: free, params: ['vis.depth', 'vis.depthOffset', 'vis.depthColor'] });
  }
  // 阴影：StyleBoxFlat 一个外阴影；内阴影、多层阴影做不到
  const outer = (s.shadows ?? []).filter((x) => !x.inset && !x.sweep);
  if (s.glow) {
    p.shadow_color = gColor(s.glow.color, pal); p.shadow_size = Math.max(1, Math.round(s.glow.blur)); p.shadow_offset = 'Vector2(0, 0)';
  } else if (outer.length) {
    const sh = outer[0];
    p.shadow_color = gColor(sh.color, pal);
    p.shadow_size = Math.max(1, Math.round(sh.blur / 2));
    p.shadow_offset = `Vector2(${sh.x}, ${sh.y})`;
    if (sh.blur === 0) notes.push({ where, what: '硬投影（模糊 0）', how: 'StyleBoxFlat 的阴影总带一点模糊（shadow_size ≥ 1）：要完全硬边就在面板后面再放一个偏移的纯色 Panel', level: 'script', done: false, params: ['vis.depth'] });
  }
  if (outer.length > 1) notes.push({ where, what: '多层阴影', how: '只导出第一层；其余层用额外的 Panel 叠出来', level: 'script', done: false, params: ['vis.depth'] });
  if ((s.shadows ?? []).some((x) => x.inset)) notes.push({ where, what: '内阴影 / 内发光', how: 'StyleBoxFlat 没有内阴影：canvas_item 着色器或 StyleBoxTexture', level: 'shader', done: false, params: ['vis.depth'] });
  if (s.ring) notes.push({ where, what: '外圈实线', how: '外面再包一层 PanelContainer，用边框画外圈', level: 'script', done: false, params: ['vis.stroke'] });
  if (s.skewX) {
    p.skew = `Vector2(${f3(Math.tan((s.skewX * Math.PI) / 180))}, 0)`;
    notes.push({ where, what: '斜切连字一起斜', how: 'StyleBoxFlat.skew 只斜底框；探索台里整块元素连字一起斜：把元素放进一个 Control，pivot_offset = size / 2，用 Transform2D(Vector2(1, 0), Vector2(tan(角度), 1), 原点) 设到 CanvasItem 上（或 SubViewport 渲染后整张斜贴）', level: 'script', done: false, params: ['vis.skew'] });
  }
  if (s.cornerMarks) notes.push({ where, what: '四角括角（vis.strokeSides = corners）', how: '自定义 StyleBox（GDScript 继承 StyleBox，_draw 里四角各画两条 L 形线，臂长 = vis.cornerSize）或四个 TextureRect 角件；本包按无边框导出', level: 'script', done: false, params: ['vis.strokeSides', 'vis.cornerSize'] });
  if (s.backdropBlur) notes.push({ where, what: '毛玻璃（背景模糊）', how: 'BackBufferCopy + 读 SCREEN_TEXTURE 的模糊 canvas_item 着色器（textureLod 取 mip）', level: 'shader', done: false, params: ['vis.blur'] });
  if (s.material) notes.push({ where, what: `材质内芯（${s.material}）`, how: 'StyleBoxTexture（平铺纹理，modulate 成底色）；探索台的程序化贴图可导出成 PNG，以后可换成 AI 生成素材', level: 'texture', done: false, params: ['ast.core', 'ast.coreMat'] });
  // 有序抖动 / 双色网屏是 ui_surface.gdshader 的 pattern（默认面板上样本已挂、区域按 vis.patternArea 遮罩，中期审查修复 ⑭ ⑮）；其余图案是平铺纹理
  if (s.overlay && s.overlay.kind !== 'none') {
    const shaderPat = s.overlay.kind === 'dither' || s.overlay.kind === 'halftoneDuo', area = s.overlay.area ?? 'panel';
    const areaTxt = area === 'panel' ? '整块面板' : area === 'header' ? '标题带（area = 1）' : area === 'edgeStrip' ? '沿描边那几条边的 6% 带（area = 2，edges 位掩码）' : '下方与右侧 40% 的 L 形、往右下角叠深（area = 3）';
    notes.push(shaderPat
      ? { where, what: `叠加图案（${s.overlay.kind}，区域：${areaTxt}）`, level: 'shader', done: decorated, params: ['vis.pattern', 'vis.patternArea', 'vis.ditherMatrix'],
        how: decorated ? 'ui/ui_surface.gdshader 的 pattern（样本里已作为面板第一个子节点的 ColorRect 挂上；area / header_px / edges uniform 按 vis.patternArea 遮罩，size 随 resized 更新）'
          : '本包只给默认面板挂上（hud_sample.gd 的 _surfaces）；这个盒子要在对应节点上加一个同样的 ColorRect + ui/ui_surface.gdshader（pattern / area 同默认面板的写法；默认面板没用到时本包不导出这个 shader）' }
      : { where, what: `叠加图案（${s.overlay.kind}${area !== 'panel' ? `，区域：${areaTxt}` : ''}）`, how: `TextureRect（平铺，半透明）叠在面板上，或 canvas_item 着色器${area !== 'panel' ? '；区域用 clip_contents 的子 Control 或着色器按 UV 遮罩（同 ui_surface.gdshader 的 area 写法）' : ''}`, level: 'texture', done: false, params: ['vis.pattern', ...(area !== 'panel' ? ['vis.patternArea'] : [])] });
  }
  if (s.gloss) notes.push({ where, what: `光泽（${s.gloss}）`, how: 'StyleBoxTexture 的高光贴图，或面板上叠一层渐变 TextureRect', level: 'texture', done: false, params: ['vis.gloss'] });
  if (s.edge && s.edge !== 'clean') notes.push({ where, what: `边缘（${s.edge}）`, how: '撕边 / 锯齿 / 毛笔边：StyleBoxTexture 九宫格素材，或带遮罩的 canvas_item 着色器', level: 'texture', done: false, params: ['vis.edge'] });
  if (s.jitter) notes.push({ where, what: '手绘抖动', how: '整块轻微旋转已在场景里做；线条抖动要素材或着色器', level: 'texture', done: false, params: ['vis.jitter'] });
  if (s.ornament && (s.ornament.level > 0 || s.ornament.parts.length)) notes.push({ where, what: `装饰（${s.ornament.motif}，${s.ornament.level} 级）`, how: '角花 / 分隔线 / 铆钉：TextureRect 饰件挂在面板四角，或 NinePatchRect 外框素材', level: 'texture', done: false, params: ['vis.ornament', 'vis.motif', 'ast.ornaments'] });
  if (s.frame && s.skewX && frameTex(s)) notes.push({ where, what: '素材外框 + 倾斜', how: 'StyleBoxTexture 不支持 skew：本包里素材外框与底色都不倾斜；要倾斜就把整个面板放进一个 Control，用 _draw() / 着色器做切变', level: 'script', done: false, params: ['vis.skew'] });
  if (s.frame) {
    const ft = frameTex(s);
    // 顶冠框 / 三段式的中段、没有插画素材的整幅插画框导出同一张九宫格（画布上就是它们）；顶冠 / 底坠与环带 / 齿轮见「外框结构」行
    const extra = s.frame.kind === 'crowned' || s.frame.kind === 'threePart' ? '（这是中段；顶冠 / 底坠两个不拉伸的 TextureRect 见「外框结构」）' : s.frame.kind === 'illustratedFrame' ? '（整幅插画框的素材还没有，现在与画布一样退回雕花框）' : '';
    notes.push({ where, what: `外框（${s.frame.kind} · ${s.frame.mat}）`, level: 'texture', done: !!ft, params: ['ast.frame', 'ast.frameMat'],
      how: ft ? `StyleBoxTexture 九宫格：res://ui/tex/${ft.file}（192 px，texture_margin = ${ft.slice}，内容边距按边带 ${ft.band} 留）；外框中间透明，面板底色是 hud_sample.gd 垫在下面的 StyleBoxFlat（主题 HudFrameFill 类型）${extra}`
        : s.frame.kind === 'cornersOnly' ? '四个 TextureRect 包角挂在面板四角（素材 ui_ornament_corners 图集，AtlasTexture 取 region，见下文"UI 位图素材"），本包只导出底与边框'
          : s.frame.kind === 'ring' || s.frame.kind === 'gear' ? '环带 / 齿轮表圈不是九宫格：圆钮外面一个 TextureRect（frame.ts drawRing 预渲染的环 / 齿轮纹理，按材质出一张）或 _draw() 移植，见「外框结构」行'
            : `NinePatchRect / StyleBoxTexture 九宫格（texture_margin = 框宽）；现成素材只有金 / 青铜 / 石 / 木 / 皮革五种材质，其余材质要自备${extra}` });
  }
  // 分层立体 / 渐隐 / 表面处理 / 磨损（M12b-36 / 41 / 52）
  if (s.layers) notes.push({ where, what: `分层立体（${[s.layers.frame ? `外框带 ${s.layers.frame.depth}` : '', s.layers.core ? `内芯 ${s.layers.core.depth}` : ''].filter(Boolean).join('、')}）`, how: '两层 PanelContainer：外层 StyleBoxFlat = 外框色 + 倒角（上左亮、下右暗的两色边要 StyleBoxTexture 或第二层 StyleBoxFlat 错位 1px），内层 content_margin = 框宽、StyleBoxFlat = 芯色；凹槽 = 主题里的 HudWell 类型变体', level: 'script', done: false, params: ['vis.depth'] });
  const notOurs = '本包只给默认面板挂上（hud_sample.gd 的 _surfaces）；这个盒子（按目标的 Hud_<目标>、按键、血条……）要在对应节点上挂同一个 shader（默认面板没用到时本包不导出它，照迁移说明的写法补）';
  if (s.fade) notes.push({ where, what: `渐隐（${s.fade.dir}，${Math.round(s.fade.len * 100)}%）`, how: decorated ? 'ui/ui_fade.gdshader 挂在 PanelContainer.material 上（面板自己的 StyleBox 按本地坐标乘 alpha，子节点不继承；样本里已挂上），或 StyleBoxTexture + GradientTexture2D' : `ui/ui_fade.gdshader 挂在 PanelContainer.material 上（或 StyleBoxTexture + GradientTexture2D）。${notOurs}`, level: 'shader', done: decorated, params: ['vis.fade', 'vis.fadeLength'] });
  if (s.finish) notes.push({ where, what: `表面处理（${s.finish}）`, how: decorated ? 'ui/ui_surface.gdshader 的 finish（样本里已作为面板第一个子节点的 ColorRect 挂上，画在面板底之上、内容之下）；随指针 / 时间偏移的动态版加一个 uniform 偏移' : `ui/ui_surface.gdshader 的 finish（面板第一个子节点的 ColorRect）。${notOurs}`, level: 'shader', done: decorated, params: ['ast.finish'] });
  if (s.wear) notes.push({ where, what: `磨损（${s.wear}）`, how: '面板上叠一层划痕 / 缺口纹理（TextureRect，modulate.a = 磨损）+ 四角暗角（GradientTexture2D 径向）', level: 'texture', done: false, params: ['ast.wear'] });
  if (s.fx?.kinds.length) notes.push({ where, what: `叠加特效（${s.fx.kinds.join('、')}）`, how: 'GPUParticles2D（花瓣、星屑）、canvas_item 着色器（扫描线、错位、全息）、TextureRect 叠加（光柱、放射光、法阵）', level: 'shader', done: false, params: ['ast.fx'] });
  if (pad) { p.content_margin_left = pad[0]; p.content_margin_top = pad[1]; p.content_margin_right = pad[2]; p.content_margin_bottom = pad[3]; }
  p.anti_aliasing = true;
  return p;
}

/** 某个 GAE 字族里最接近这一档字重的文件（没有这个字族时用 GAE Sans） */
function nearestFile(family: string, weight: number) {
  const files = HUD_FONT_FILES.filter((f) => f.family === family);
  const list = files.length ? files : HUD_FONT_FILES.filter((f) => f.family === 'GAE Sans');
  return list.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
}

/**
 * 字体栈 → 我们的字体文件（取第一个 GAE 字族，按字重找最近的一档）与中文回退（FontFile.fallbacks）。
 * 回退（M12b-54）按字体栈里排在后面的 GAE 字族依次取，与画布一致：拉丁字族后面的中文字族挨个挂上，到第一个「中文全字表」的字族为止
 * （漫画手写的标题 = Comic Neue → 站酷快乐体（只收展示用字）→ 思源黑体；Cinzel → 思源宋体；VT323 → 像素字）；栈里没有中文全字表的字族时补思源黑体（原来一律思源黑体）
 */
function fontFor(stack: string | undefined, weight: number): { file: string; embolden: number; pixel: boolean; latin: boolean; fallback: string[] } {
  const fams = [...(stack ?? '').matchAll(/"(GAE [^"]+)"/g)].map((m) => m[1]).filter((x) => HAVE_FAMILY.has(x));
  const fam = fams[0] ?? 'GAE Sans';
  const best = nearestFile(fam, weight);
  // 没有这一档字重：FontVariation 的 embolden 补（0.6 ≈ 粗一档）；按字重范围注册的单字重展示字体（Pirata One、站酷快乐体、得意黑）不补，与画布一样不合成粗体
  const ranged = !!best.weightRange && weight >= best.weightRange[0] && weight <= best.weightRange[1];
  const embolden = !ranged && weight - best.weight >= 200 ? Math.min(1.2, ((weight - best.weight) / 300) * 0.6) : 0;
  const latin = best.charset === 'latin';
  const fallback: string[] = [];
  if (latin) {
    for (const x of fams.slice(1)) {
      const fb = nearestFile(x, weight);
      if (fb.charset === 'latin' || fallback.includes(fb.file)) continue;
      fallback.push(fb.file);
      if (fb.charset === 'cjk') break;
    }
    if (!fallback.some((x) => HUD_FONT_FILES.find((h) => h.file === x)?.charset === 'cjk')) fallback.push(nearestFile('GAE Sans', weight).file);
  }
  return { file: best.file, embolden: f3(embolden), pixel: fam === 'GAE Pixel' || fam === 'GAE VT323', latin, fallback };
}

interface TextSpec { type: string; base: string; st: TextStyle & { font?: string }; size: number; color: string; glow?: string }

export function godotUiFiles(v: Values): { files: GodotUiFile[]; notes: UiNote[]; theme: Theme } | null {
  const style = str(v, 'hud.style');
  if (!style || style === 'none') return null;
  const r = resolveUi(v);
  const th = buildTheme(r, scenePaletteOf(v), style);
  const t = th.tokens, pal = th.pal, k = th.scale;
  // 示例内容包（cnt.pack）：样本字按这份参数选，不读画布的当前包；q = GDScript 字符串（JSON 的转义 GDScript 都认）
  const pk = packFor(r);
  // 样本血量（cnt.sampleHp，M12c-14）：给了时盖过包的生命起点（第一行生命条也跟着，与画布 simulate 的 sim.hp 同口径）
  const shp = r.num('cnt.sampleHp', NaN), hp1 = Number.isFinite(shp) ? Math.max(0, Math.min(1, shp)) : undefined;
  const hud = hp1 === undefined ? pk.hud : { ...pk.hud, hp: hp1, ...(pk.hud.vitals?.length ? { vitals: pk.hud.vitals.map((x, i) => (i === 0 ? { ...x, v: hp1 } : x)) } : {}) };
  const q = (s: string) => JSON.stringify(s);
  const notes: UiNote[] = [];
  const sub = new Sub();
  const bw = borderWidths(t.panel);
  const titleSize = (t.title?.size ?? t.textSize ?? 13);

  // 素材外框（M11）：框体换成 StyleBoxTexture，原来的 StyleBoxFlat 改名 *_fill 只当底色（脚本垫在外框下面）；没选素材外框时与原来逐字相同
  const ext: string[] = [];
  const extIds = new Map<string, string>();
  const framed: { variation: string; name: string; fill: string; inset: number }[] = [];
  const frames: FrameTex[] = [];
  const box = (id: string, variation: string, s: BoxStyle, flat: Props, pad: [number, number]) => {
    const ft = frameTex(s);
    if (!ft) return sub.add(id, 'StyleBoxFlat', flat);
    let tex = extIds.get(ft.file);
    if (!tex) {
      tex = `tex_${extIds.size + 1}`;
      extIds.set(ft.file, tex);
      ext.push(`[ext_resource type="Texture2D" path="res://ui/tex/${ft.file}" id="${tex}"]`);
      frames.push(ft);
    }
    // StyleBoxTexture 没有 skew：外框不倾斜，垫在下面的底色也去掉倾斜（否则平行四边形的底会从直角外框的角上露出来）
    const { skew: _skew, ...fillProps } = flat;
    void _skew;
    framed.push({ variation, name: id, fill: sub.add(`${id}_fill`, 'StyleBoxFlat', fillProps), inset: Math.round(ft.band / 2) });
    // 角按原像素 1:1 画（texture_margin = 切边），四边与中间拉伸；内容边距 = 边带 + 原来的留白
    const m = ft.slice, b = ft.band;
    return sub.add(id, 'StyleBoxTexture', {
      texture: `ExtResource("${tex}")`,
      texture_margin_left: m, texture_margin_top: m, texture_margin_right: m, texture_margin_bottom: m,
      content_margin_left: b + pad[0], content_margin_top: b + pad[1], content_margin_right: b + pad[0], content_margin_bottom: b + pad[1],
      axis_stretch_horizontal: 0, axis_stretch_vertical: 0, draw_center: false,
    });
  };
  const panelId = box('panel', '', t.panel, styleBox(t.panel, pal, '面板', 80 * k, notes, [bw.l + 12, bw.t + 10, bw.r + 12, bw.b + 10], true), [12, 10]);
  const dlgStyle = { ...t.panel, ...(t.dialog ?? {}) };
  const dlgId = box('dialog', 'HudDialog', dlgStyle, styleBox(dlgStyle, pal, '对话框', 65 * k, [], [bw.l + 14, bw.t + 10, bw.r + 14, bw.b + 10]), [14, 10]);
  if (t.dialog?.tail) notes.push({ where: '对话框', what: '漫画气泡尾巴', how: 'Polygon2D 三角形挂在对话框左下', level: 'script', done: true, params: ['cmp.dialogBox'] });
  const mapStyle = { ...t.panel, ...(t.map ?? {}) };
  const mapId = box('map', 'HudMinimap', mapStyle, styleBox(mapStyle, pal, '小地图框', 92 * k, []), [0, 0]);
  const keyId = sub.add('key', 'StyleBoxFlat', styleBox(t.key, pal, '按键', 22 * k, notes));
  const trackId = sub.add('bar_track', 'StyleBoxFlat', styleBox(t.bar.track, pal, '血条底', t.bar.height, notes));
  const fillId = sub.add('bar_fill', 'StyleBoxFlat', styleBox(t.bar.fill, pal, '血条填充', t.bar.height, notes));
  const dotId = sub.add('dot', 'StyleBoxFlat', { bg_color: gColor('@accent', pal), corner_radius_top_left: 99, corner_radius_top_right: 99, corner_radius_bottom_right: 99, corner_radius_bottom_left: 99, anti_aliasing: true });
  // 按钮四态：常态 = 按键样式；悬停提亮、按下压暗（M5a 的按钮组件接 ix.hover / ix.press 后按参数生成）
  const keyBg = paintColor(t.key.bg, pal) ?? resolveColor('@accent', pal);
  const btn = (name: string, mixTo: string, amt: number) => sub.add(`button_${name}`, 'StyleBoxFlat', { ...styleBox({ ...t.key, bg: { solid: keyBg } }, pal, '按钮', 28 * k, []), bg_color: gColor(mixRgb(keyBg, mixTo, amt), pal), content_margin_left: 10, content_margin_right: 10, content_margin_top: 4, content_margin_bottom: 4 });
  const btnN = btn('normal', '#ffffff', 0), btnH = btn('hover', '#ffffff', 0.15), btnP = btn('pressed', '#000000', 0.2), btnD = btn('disabled', '#808080', 0.6);
  // 按钮的动作角色色（M12a-35，col.semantic / col.actionColors）：每个有角色色的角色一个类型变体 HudButton<角色>（常态 / 悬停 / 按下按角色色，字色按同一条对比规则算好）；
  // 没有角色色（accentOnly，兜底）时一个都不加，主按钮照旧是 Button
  const surf = resolveColor(th.surface, pal);
  const btnRoles = buttonRoleLines('HudButton', 'button_', t, pal, surf, k, sub);
  const btnF = sub.add('button_focus', 'StyleBoxFlat', { draw_center: false, border_width_left: 2, border_width_top: 2, border_width_right: 2, border_width_bottom: 2, border_color: gColor('@accent2', pal), corner_radius_top_left: 4, corner_radius_top_right: 4, corner_radius_bottom_right: 4, corner_radius_bottom_left: 4, expand_margin_left: 3, expand_margin_top: 3, expand_margin_right: 3, expand_margin_bottom: 3 });

  // 文字
  const bodyColor = resolveColor(t.text, pal);
  const texts: TextSpec[] = [
    { type: 'Label', base: '', st: { ...(t.body ?? {}), font: t.font, weight: t.body?.weight ?? 400 }, size: t.textSize ?? 13, color: bodyColor, glow: t.textGlow ? resolveColor(t.textGlow, pal) : undefined },
    { type: 'HudTitle', base: 'Label', st: { weight: 800, ...(t.title ?? {}), font: t.title?.font ?? t.font }, size: titleSize, color: resolveColor(t.title?.color ?? t.text, pal), glow: t.textGlow ? resolveColor(t.textGlow, pal) : undefined },
    { type: 'HudName', base: 'Label', st: { weight: 800, ...(t.name ?? {}), font: t.name?.font ?? t.font }, size: t.name?.size ?? t.textSize ?? 13, color: resolveColor(t.name?.color ?? t.text, pal), glow: t.textGlow ? resolveColor(t.textGlow, pal) : undefined },
    { type: 'HudKeyLabel', base: 'Label', st: { weight: 800, font: t.key.font ?? t.font }, size: t.textSize ?? 13, color: resolveColor(t.key.color ?? t.text, pal) },
    { type: 'HudIcon', base: 'Label', st: { font: t.font }, size: t.textSize ?? 12, color: resolveColor(t.icon, pal) },
  ];
  const themeLines: string[] = [];
  const fontsUsed = new Map<string, { file: string; embolden: number; spacing: number; italic: boolean; pixel: boolean; latin: boolean; fallback: string[] }>();
  for (const x of texts) {
    if (x.base) themeLines.push(`${x.type}/base_type = &"${x.base}"`);
    themeLines.push(`${x.type}/colors/font_color = ${gColor(x.color, pal)}`);
    themeLines.push(`${x.type}/font_sizes/font_size = ${Math.round(x.size * k)}`);
    const st = x.st;
    // 描边宽按字号（M12a-33：参数生成的描边带 widthEm，字太小时不描边）；旧皮肤 token 写死的照旧
    const ow = st.outline ? outlineWidth(st.outline, x.size * k) : 0;
    if (st.outline && ow > 0) {
      themeLines.push(`${x.type}/colors/font_outline_color = ${gColor(st.outline.color, pal)}`, `${x.type}/constants/outline_size = ${Math.max(1, Math.round(ow * 2))}`);
    }
    if (st.shadow) {
      themeLines.push(`${x.type}/colors/font_shadow_color = ${gColor(st.shadow.color, pal)}`, `${x.type}/constants/shadow_offset_x = ${Math.round(st.shadow.x)}`, `${x.type}/constants/shadow_offset_y = ${Math.round(st.shadow.y)}`, `${x.type}/constants/shadow_outline_size = ${Math.max(0, Math.round(st.shadow.blur / 2))}`);
    } else if (st.glowColor || x.glow) {
      // 文字发光：偏移 0 的投影 + 投影描边近似
      themeLines.push(`${x.type}/colors/font_shadow_color = ${gColor(st.glowColor ?? x.glow, pal)}`, `${x.type}/constants/shadow_offset_x = 0`, `${x.type}/constants/shadow_offset_y = 0`, `${x.type}/constants/shadow_outline_size = 6`);
      notes.push({ where: x.type, what: '文字发光', how: '用偏移 0、shadow_outline_size 6 的投影近似（Godot 的字体投影不做高斯模糊）', level: 'builtin', done: true, params: ['typ.legibility', 'typ.titleFx'] });
    }
    if (st.metal) notes.push({ where: x.type, what: '金属渐变字', how: 'Label 的 material 设 canvas_item 着色器，按 UV.y 做渐变；本包用纯色', level: 'shader', done: false, params: ['typ.titleFx'] });
    const fnt = fontFor(st.font, st.weight ?? 400);
    const key = `${x.type}`;
    fontsUsed.set(key, { ...fnt, spacing: Math.round((st.spacing ?? 0) * x.size * k), italic: !!st.italic });
  }
  themeLines.push(
    `PanelContainer/styles/panel = ${panelId}`, `Panel/styles/panel = ${panelId}`,
    `HudDialog/base_type = &"PanelContainer"`, `HudDialog/styles/panel = ${dlgId}`,
    `HudMinimap/base_type = &"PanelContainer"`, `HudMinimap/styles/panel = ${mapId}`,
    `HudKey/base_type = &"PanelContainer"`, `HudKey/styles/panel = ${keyId}`,
    `HudDot/base_type = &"Panel"`, `HudDot/styles/panel = ${dotId}`,
    `ProgressBar/styles/background = ${trackId}`, `ProgressBar/styles/fill = ${fillId}`,
    `Button/styles/normal = ${btnN}`, `Button/styles/hover = ${btnH}`, `Button/styles/pressed = ${btnP}`, `Button/styles/disabled = ${btnD}`, `Button/styles/focus = ${btnF}`,
    `Button/colors/font_color = ${gColor(t.key.color ?? '#ffffff', pal)}`,
    `Button/font_sizes/font_size = ${Math.round((t.button?.size ?? t.textSize ?? 13) * k)}`,
    ...btnRoles,
  );
  // 素材外框下面的底色：自定义类型 HudFrameFill，样式名 = panel / dialog / map
  for (const f of framed) themeLines.push(`HudFrameFill/styles/${f.name} = ${f.fill}`);
  // 颜色角色（M12a-02）：自定义类型 HudRoles 的颜色常量，脚本里 th.get_color("health", "HudRoles")
  themeLines.push(...roleLines('HudRoles', th, null));
  // 稀有度与类别色表（M12b-33）：HudRoles/colors/rarity_0…4（col.rarityScale / col.rarityColors）、line_0…（col.coding 含 lineId 时的 col.lineColors）
  themeLines.push(...rarityTable(r).map((c, i) => `HudRoles/colors/rarity_${i} = ${gColor(tableColor(th, c), th.pal)}`), ...lineTable(r, th).map((c, i) => `HudRoles/colors/line_${i} = ${gColor(c, th.pal)}`));
  // 饰色 / 宝石色（M12b-49，B4 审查修复：迁移说明原来让人去找主题里的两个常量，导出器却没写）：选过 col.ornament / col.gem 时导出 HudRoles/colors/ornament、gem，
  // 饰件纹理按它们 modulate
  if (t.ornColor) themeLines.push(`HudRoles/colors/ornament = ${gColor(t.ornColor, pal)}`);
  if (t.panel.ornament?.gem) themeLines.push(`HudRoles/colors/gem = ${gColor(t.panel.ornament.gem, pal)}`);
  // 强调色底上的字（M12a-04）：按同一对比规则算好的字色（按键 / 按钮的 font_color 已经是它），标牌、徽章、横幅上的 Label 用这个变体
  if (t.onAccent) themeLines.push(`HudOnAccentLabel/base_type = &"Label"`, `HudOnAccentLabel/colors/font_color = ${gColor(t.onAccent, pal)}`);
  // 颜色角色参数（M12a-03）：次要字（MutedLabel）；格子 / 提示框 / 标题带 / 卡面各一个面板变体——和面板一样时直接引用面板的 StyleBox
  themeLines.push(`HudMutedLabel/base_type = &"Label"`, `HudMutedLabel/colors/font_color = ${gColor(th.roles.muted, pal)}`);
  // 凹槽（M12b-36，tokens.well）：HudWell 类型变体 = 深一档的底 + 上 / 左一道暗边（StyleBoxFlat 只有一个边色，下 / 右的亮边要第二层）
  if (t.well) {
    const wb = paintColor(t.well.bg, pal) ?? '#000';
    const wellId = sub.add('well', 'StyleBoxFlat', { bg_color: gColor(wb, pal), border_width_left: 1, border_width_top: 1, border_color: gColor('rgba(0,0,0,0.5)', pal), corner_radius_top_left: 2, corner_radius_top_right: 2, corner_radius_bottom_right: 2, corner_radius_bottom_left: 2, anti_aliasing: true });
    themeLines.push(`HudWell/base_type = &"PanelContainer"`, `HudWell/styles/panel = ${wellId}`);
  }
  const sameAsPanel = (s: BoxStyle | undefined) => !s || JSON.stringify(s) === JSON.stringify(t.panel);
  // 贴边条 / 共用底条 / PC 式状态条（M12a-16 / 18，部件 hudBar）：用到时才导出 HudBar 类型变体
  const usesBar = hudOrgOf(th) !== 'scattered' || r.list('flow.chrome').includes('statusBar') || r.keys().some((k) => /^(elx|el\.[a-zA-Z]+(\.[a-zA-Z0-9]+)?)\.stackDir$/.test(k) && r.str(k) === 'rowBar');
  for (const [type, s] of [['HudSlotPanel', t.control], ['HudTooltipPanel', t.tooltip], ['HudTitleBar', t.titleBar], ['HudCardPanel', t.card], ...(usesBar ? [['HudBar', t.hudBar]] : [])] as [string, BoxStyle | undefined][]) {
    const sb = sameAsPanel(s) ? panelId : sub.add(type.replace('Hud', '').toLowerCase(), 'StyleBoxFlat', styleBox(s!, pal, type, 80 * k, notes, [bw.l + 12, bw.t + 10, bw.r + 12, bw.b + 10]));
    themeLines.push(`${type}/base_type = &"PanelContainer"`, `${type}/styles/panel = ${sb}`);
  }
  if (t.controlText) themeLines.push(`HudSlotLabel/base_type = &"Label"`, `HudSlotLabel/colors/font_color = ${gColor(t.controlText, pal)}`);
  // 按目标的覆盖（M12a-01）：与 Godot 的类型变体同一套继承（变体 → 基类型 → 默认主题），没有作用域键时什么都不加
  const scoped = scopedVariations(r, th, sub, k, notes);
  themeLines.push(...scoped);
  const themeText = [
    `[gd_resource type="Theme" load_steps=${sub.blocks.length + ext.length + 1} format=3]`,
    '',
    ...(ext.length ? [ext.join('\n'), ''] : []),
    sub.blocks.join('\n\n'),
    '',
    '[resource]',
    `default_font_size = ${Math.round((t.textSize ?? 13) * k)}`,
    ...themeLines,
    '',
  ].join('\n');

  // 元素排版（M9b）：选了品类布局时按元素搭，否则是 M1 的四控件样本
  const layout = elementLayout(th);
  // 样本字与画布同口径（M12b-61）：按键图例 / 行动号召按界面取，字幕按 cnt.textLength / el.subtitle.untranslated 取那句台词
  const spoken = spokenLine(r, pk);
  // 信息流与画布同口径（中期审查修复 ㉔）：按界面的 feed 变体、显式 cnt.density ≤ 1 只留一条、el.notify.maxItems 选过时截（旧皮肤只认皮肤之后的层，同 elChosen）
  const mk = r.elKey('el.notify', 'maxItems', 'feed'), ms = r.src(mk), maxOn = !!ms && !['default', 'fallback', 'ruleDefault'].includes(ms.layer) && (!th.legacy || afterSkin(r, mk));
  const feed = feedLines(r, pk, maxOn ? Number(r.get(mk)) : undefined);
  const layoutScript = layout ? layoutGd(layout, { ...hud, prompts: textFor('prompts', r, pk) ?? hud.prompts, cta: ctaText(r, pk), subtitle: [spoken.who, spoken.line], feed }) : null;
  if (layout) {
    notes.push({ where: '元素排版', what: `${layout.items.length} 个屏幕元素按九个锚点成列`, how: '每个锚点一列 VBoxContainer（set_anchors_and_offsets_preset + grow_direction），元素用 PanelContainer / Label / ProgressBar / Button 近似；画法细节（液体球、弧形条、扇形手牌……）需要 _draw() 或着色器', level: 'builtin', done: true, params: ['cnt.elements', 'elx.screenAnchor', 'lay.safeMargin'] });
    if (layout.world.length) notes.push({ where: '元素排版', what: `挂在世界上 / 叙事内的元素：${layout.world.map((w) => w.label).join('、')}`, how: '挂点元素每帧用 Camera3D.unproject_position(目标.global_position) 定位；叙事内元素做成 SubViewport → 3D 网格上的贴图（Sprite3D / QuadMesh），本包未生成', level: 'script', done: false, params: ['elx.attachTo', 'rel.diegesis'] });
  }
  // 场景脚本
  const fontFiles = [...new Set([...fontsUsed.values()].map((f) => f.file))];
  for (const f of fontsUsed.values()) for (const fb of f.fallback) if (!fontFiles.includes(fb)) fontFiles.push(fb);
  const fontDict = [...fontsUsed.entries()].map(([type, f]) => `\t"${type}": ["${f.file}", ${f.embolden}, ${f.spacing}, ${f.italic}, ${f.pixel}, [${f.fallback.map((x) => `"${x}"`).join(', ')}]],`).join('\n');
  const upper = (s?: TextStyle) => (s?.upper ? 'true' : 'false');
  const rot = t.panel.rotate ?? 0;
  const dialogRot = t.dialog?.rotate ?? rot;
  // 素材外框的脚本部分（只在选了素材外框时出现）：给每个用外框的 PanelContainer 垫底色，角件不够高时补边距，并核对贴图已加载
  const frameVars = framed.length ? `
## 素材外框（StyleBoxTexture，中间透明）：面板底色存在主题的 HudFrameFill 类型里，按外框边带一半内缩，垫在面板下面
## 类型变体 → [HudFrameFill 里的样式名, 内缩 px]
const FRAME_FILL := {${framed.map((f) => `"${f.variation}": ["${f.name}", ${f.inset}]`).join(', ')}}
var _frames_ok := true
var _framed := 0` : '';
  // 面板表面的着色器（M12b-41 / 42 / 52）：有序抖动 / 双色网屏、表面处理、渐隐——面板用到时导出 ui/ui_surface.gdshader / ui_fade.gdshader，样本脚本挂到默认面板上（Godot 校验时会编译它们）
  const sv = surfaceOf(t.panel, pal);
  const surfaceVars = sv ? `
## 面板表面：图案 / 表面处理的覆盖层（ColorRect + ui_surface.gdshader）与渐隐（PanelContainer.material = ui_fade.gdshader）
${sv.overlay ? 'const SURFACE := preload("res://ui/ui_surface.gdshader")' : ''}
${sv.fade ? 'const FADE := preload("res://ui/ui_fade.gdshader")' : ''}
var _surfaced := 0` : '';
  const surfaceFuncs = sv ? `
## 默认面板（不是按键 / 小地图）挂上表面覆盖层与渐隐材质
func _surfaces(root: Control) -> void:
\tfor n in root.find_children("*", "PanelContainer", true, false):
\t\tvar pc := n as PanelContainer
\t\tif pc.theme_type_variation == "HudKey" or pc.theme_type_variation == "HudMinimap":
\t\t\tcontinue${sv.overlay ? `
\t\tvar over := ColorRect.new()
\t\tover.mouse_filter = Control.MOUSE_FILTER_IGNORE
\t\tvar m := ShaderMaterial.new()
\t\tm.shader = SURFACE
\t\tm.set_shader_parameter("pattern", ${sv.overlay.pattern})
\t\tm.set_shader_parameter("matrix_size", ${sv.overlay.matrix})
\t\tm.set_shader_parameter("level", ${f3(sv.overlay.level)})
\t\tm.set_shader_parameter("cell", ${f3(sv.overlay.cell)})
\t\tm.set_shader_parameter("ink", ${sv.overlay.ink})
\t\tm.set_shader_parameter("ink2", ${sv.overlay.ink2})
\t\tm.set_shader_parameter("finish", ${sv.overlay.finish})
\t\tm.set_shader_parameter("area", ${sv.overlay.area})
\t\tm.set_shader_parameter("header_px", ${f3(sv.overlay.header)})
\t\tm.set_shader_parameter("edges", ${sv.overlay.edges})
\t\tover.material = m
\t\tover.resized.connect(func(): m.set_shader_parameter("size", over.size))
\t\tpc.add_child(over)
\t\tpc.move_child(over, 0)` : ''}${sv.fade ? `
\t\tvar fm := ShaderMaterial.new()
\t\tfm.shader = FADE
\t\tfm.set_shader_parameter("dir", ${sv.fade.dir})
\t\tfm.set_shader_parameter("fade_len", ${f3(sv.fade.len)})
\t\tfm.set_shader_parameter("size", pc.size)
\t\tpc.material = fm
\t\tpc.resized.connect(func(): fm.set_shader_parameter("size", pc.size))` : ''}
\t\t_surfaced += 1
` : '';
  const frameFuncs = framed.length ? `
## 素材外框：主题里的 StyleBoxTexture 引用 res://ui/tex/ 下的 PNG（编辑器打开工程时自动导入）
func _frame_fills(n: Node, th: Theme) -> void:
\tfor c in n.get_children():
\t\t_frame_fills(c, th)
\t\tvar pc := c as PanelContainer
\t\tif pc == null:
\t\t\tcontinue
\t\tvar sb := pc.get_theme_stylebox("panel") as StyleBoxTexture
\t\tif sb == null:
\t\t\tcontinue
\t\tif sb.texture == null:
\t\t\t_frames_ok = false
\t\t\tpush_error("GAE_HUD_FAIL frame texture missing: %s" % pc.name)
\t\t# 面板比上下两个角件加起来还矮时角会被截掉：上下内容边距补够（内容仍居中）。
\t\t# 判断用含 custom_minimum_size 的最终最小高度，补多少按内容本身的最小高度算（只补边距抬的是内容最小高度）
\t\tvar need := sb.texture_margin_top + sb.texture_margin_bottom
\t\tif pc.get_combined_minimum_size().y < need:
\t\t\tvar short := need - pc.get_minimum_size().y
\t\t\tvar tall := sb.duplicate() as StyleBoxTexture
\t\t\ttall.content_margin_top += ceilf(short / 2)
\t\t\ttall.content_margin_bottom += ceilf(short / 2)
\t\t\tpc.add_theme_stylebox_override("panel", tall)
\t\tvar key := String(pc.theme_type_variation)
\t\tif not FRAME_FILL.has(key):
\t\t\tkey = ""
\t\tif not FRAME_FILL.has(key) or not th.has_stylebox(FRAME_FILL[key][0], "HudFrameFill"):
\t\t\tcontinue
\t\tvar fill := th.get_stylebox(FRAME_FILL[key][0], "HudFrameFill")
\t\tvar inset := Vector2.ONE * float(FRAME_FILL[key][1])
\t\t# Node2D 不参与容器排版；show_behind_parent 让它画在面板（外框）下面
\t\tvar under := Node2D.new()
\t\tunder.show_behind_parent = true
\t\tpc.add_child(under)
\t\tunder.draw.connect(func(): fill.draw(under.get_canvas_item(), Rect2(inset, pc.size - inset * 2)))
\t\tpc.resized.connect(under.queue_redraw)
\t\t_framed += 1
` : '';
  const script = `extends CanvasLayer
## 游戏 UI 样本（游戏美术风格探索台导出，皮肤：${style}）：状态面板、小地图、交互提示、对话框。
## 主题在 ui_theme.tres；字体在运行时从 ui/fonts/ 读（WOFF2，FontFile.load_dynamic_font 不需要导入）。
## 正式项目里把字体拖进编辑器导入，再在 Theme 里直接引用即可。

const THEME := preload("res://ui/ui_theme.tres")
## 类型变体 → [字体文件, 加粗 embolden, 字距 px, 斜体, 像素字体, 中文回退字体（拉丁字体才有，按字体栈的顺序）]
const FONTS := {
${fontDict}
}
const DENSITY := ${th.density}
const SCALE := ${f3(k)}
var _cache := {}
var _fonts_ok := true${frameVars}${surfaceVars}

## key：同一个文件挂不同回退链时各用一份 FontFile（fallbacks 是 FontFile 自己的属性，共用会互相覆盖）
func _load(file: String, key: String = "") -> FontFile:
\tvar k := key if key != "" else file
\tif _cache.has(k):
\t\treturn _cache[k]
\tvar f := FontFile.new()
\tvar err := f.load_dynamic_font("res://ui/fonts/" + file)
\tif err != OK:
\t\t_fonts_ok = false
\t\tpush_error("GAE_HUD font load failed: %s (%d)" % [file, err])
\t_cache[k] = f
\treturn f

func _variation(spec: Array) -> FontVariation:
\tvar key: String = spec[0]
\tfor fb in spec[5]:
\t\tkey += "|" + str(fb)
\tvar base := _load(spec[0], key)
\tif spec[4]:
\t\t# 像素字体：关掉抗锯齿与亚像素定位，按整数字号用
\t\tbase.antialiasing = TextServer.FONT_ANTIALIASING_NONE
\t\tbase.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
\tif spec[5].size() > 0:
\t\t# 拉丁字体没有中文：按字体栈的顺序回退（展示字体的中文子集只收展示用字，缺的字再落到思源黑体 / 宋体）
\t\tvar fbs: Array[Font] = []
\t\tfor fb in spec[5]:
\t\t\tvar ff := _load(str(fb))
\t\t\tif spec[4]:
\t\t\t\t# 像素字体的回退也是像素字（VT323 → Fusion Pixel）：同样关抗锯齿
\t\t\t\tff.antialiasing = TextServer.FONT_ANTIALIASING_NONE
\t\t\t\tff.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
\t\t\t# 回退的都是中文字体：子集化后有的字体（站酷快乐体、得意黑）GSUB 里没有 hani 文字系统标签，Godot 会当它不支持汉字而跳过、直接落到思源黑体；明确声明支持
\t\t\tff.set_script_support_override("Hani", true)
\t\t\tfbs.append(ff)
\t\tbase.fallbacks = fbs
\tvar fv := FontVariation.new()
\tfv.base_font = base
\tfv.variation_embolden = spec[1]
\tfv.spacing_glyph = spec[2]
\tif spec[3]:
\t\tfv.variation_transform = Transform2D(Vector2(1, 0), Vector2(0.2, 1), Vector2.ZERO)
\treturn fv

func _ready() -> void:
\tlayer = 10
\tvar th: Theme = THEME.duplicate()
\tfor type in FONTS:
\t\tvar fv := _variation(FONTS[type])
\t\tif type == "Label":
\t\t\tth.default_font = fv
\t\tth.set_font("font", type, fv)
\tth.set_font("font", "Button", th.get_font("font", "HudKeyLabel"))
\tvar root := Control.new()
\troot.set_anchors_preset(Control.PRESET_FULL_RECT)
\troot.mouse_filter = Control.MOUSE_FILTER_IGNORE
\troot.theme = th
\tadd_child(root)
\t_build(root)${framed.length ? '\n\t_frame_fills(root, th)' : ''}${sv ? '\n\t_surfaces(root)' : ''}
\tawait get_tree().process_frame
\tawait get_tree().process_frame
\tif _fonts_ok${framed.length ? ' and _frames_ok and _framed > 0' : ''} and root.get_child_count() > 0:
\t\tprint(${framed.length ? `"GAE_HUD_OK skin=${style} fonts=%d frames=%d" % [_cache.size(), _framed]` : `"GAE_HUD_OK skin=${style} fonts=%d" % _cache.size()`})
\telse:
\t\tpush_error("GAE_HUD_FAIL skin=${style}")

func _label(text: String, variation: String, upper := false) -> Label:
\tvar l := Label.new()
\tl.text = text
\tl.theme_type_variation = variation
\tl.uppercase = upper
\treturn l
${frameFuncs}${surfaceFuncs}
${layoutScript ??`func _build(root: Control) -> void:
\tvar size := root.get_viewport_rect().size
\tif DENSITY >= 1:
\t\t# 状态面板：左上，宽 200
\t\tvar status := PanelContainer.new()
\t\tstatus.position = Vector2(14, 14)
\t\tstatus.custom_minimum_size = Vector2(200 * SCALE, 0)
\t\tstatus.rotation_degrees = ${f3(rot)}
\t\troot.add_child(status)
\t\tvar col := VBoxContainer.new()
\t\tcol.add_theme_constant_override("separation", 6)
\t\tstatus.add_child(col)
\t\tcol.add_child(_label(${q(hud.m1.title)}, "HudTitle", ${upper(t.title)}))
\t\tvar bar := ProgressBar.new()
\t\tbar.value = ${Math.round(hud.hp * 100)}
\t\tbar.show_percentage = false
\t\tbar.custom_minimum_size = Vector2(0, ${t.bar.height})
\t\tcol.add_child(bar)
\t\tif DENSITY >= 2:
\t\t\tvar row := HBoxContainer.new()
\t\t\trow.add_theme_constant_override("separation", 6)
\t\t\tcol.add_child(row)
${hud.m1.row.map(([icon, label]) => `\t\t\trow.add_child(_label(${q(icon)}, "HudIcon"))\n\t\t\trow.add_child(_label(${q(label)}, "Label", ${upper(t.body)}))`).join('\n')}
\tif DENSITY >= 2:
\t\t# 小地图：右上 92×92，中间一个点
\t\tvar map := PanelContainer.new()
\t\tmap.theme_type_variation = "HudMinimap"
\t\tmap.size = Vector2(92, 92) * SCALE
\t\tmap.position = Vector2(size.x - 14 - 92 * SCALE, 14)
\t\troot.add_child(map)
\t\tvar dot := Panel.new()
\t\tdot.theme_type_variation = "HudDot"
\t\tdot.size = Vector2(8, 8) * SCALE
\t\tdot.position = Vector2(46, 46) * SCALE - dot.size / 2
\t\troot.add_child(dot)
\t\tdot.position += map.position
\t# 交互提示：水平居中，顶边在 58% 高度
\tvar prompt := PanelContainer.new()
\tprompt.add_theme_stylebox_override("panel", _padded(root.theme.get_stylebox("panel", "PanelContainer"), 10, 4))
\troot.add_child(prompt)
\tvar line := HBoxContainer.new()
\tline.add_theme_constant_override("separation", 8)
\tprompt.add_child(line)
\tvar key := PanelContainer.new()
\tkey.theme_type_variation = "HudKey"
\tkey.custom_minimum_size = Vector2(22, 22) * SCALE
\tline.add_child(key)
\tvar kl := _label(${q(t.key.brackets ? `[${hud.interactKey}]` : hud.interactKey)}, "HudKeyLabel")
\tkl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tkl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
\tkey.add_child(kl)
\tline.add_child(_label(${q(hud.interact)}, "Label", ${upper(t.body)}))
\tprompt.reset_size()
\tprompt.position = Vector2((size.x - prompt.size.x) / 2, size.y * 0.58)
\tif DENSITY >= 2:
\t\t# 对话框：底边距 40，宽 min(520, 70%)
\t\tvar dlg := PanelContainer.new()
\t\tdlg.theme_type_variation = "HudDialog"
\t\tvar w := minf(520 * SCALE, size.x * ${k > 1 ? 0.9 : 0.7})
\t\tdlg.custom_minimum_size = Vector2(w, 0)
\t\tdlg.rotation_degrees = ${f3(dialogRot)}
\t\troot.add_child(dlg)
\t\tvar dc := VBoxContainer.new()
\t\tdc.add_theme_constant_override("separation", 2)
\t\tdlg.add_child(dc)
\t\tdc.add_child(_label(${q(hud.subtitle[0])}, "HudName", ${upper(t.name)}))
\t\tvar text := _label(${q(hud.subtitle[1])}, "Label", ${upper(t.body)})
\t\ttext.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
\t\tdc.add_child(text)
\t\tdlg.reset_size()
\t\tdlg.position = Vector2((size.x - dlg.size.x) / 2, size.y - 40 - dlg.size.y)
${t.dialog?.tail ? `\t\tvar tail := Polygon2D.new()
\t\ttail.polygon = PackedVector2Array([Vector2(30, dlg.size.y - 6), Vector2(50, dlg.size.y - 6), Vector2(40, dlg.size.y + 4)])
\t\ttail.color = ${gColor(dlgStyle.border?.color ?? '#000', pal)}
\t\tdlg.add_child(tail)
` : ''}
## 交互提示的内边距比状态面板小（左右 10、上下 4）
func _padded(sb: StyleBox, h: int, v: int) -> StyleBox:
\tvar c := sb.duplicate()
\tc.content_margin_left = c.content_margin_left - 12 + h
\tc.content_margin_right = c.content_margin_right - 12 + h
\tc.content_margin_top = c.content_margin_top - 10 + v
\tc.content_margin_bottom = c.content_margin_bottom - 10 + v
\treturn c
`}`;

  // 输入方式（M10）
  const input = r.str('ctx.input', 'kbm');
  const glyphs = r.str('ix.glyphs', 'keycap');
  if (glyphs !== 'keycap' && glyphs !== 'brackets') notes.push({ where: '按键提示', what: `图标集：${glyphs}`, how: '按最后一次输入的设备（InputEventJoypadButton / InputEventKey / InputEventScreenTouch）切换 AtlasTexture；Input.get_joy_name() 区分 Xbox / PlayStation / Nintendo', level: 'script', done: false, params: ['ix.glyphs', 'ctx.input'] });
  if (input === 'touch') notes.push({ where: '触屏', what: `虚拟摇杆 ${r.str('ix.touchStick', 'fixed')}、按钮布局 ${r.str('ix.touchCluster', 'arc')}、握持 ${r.str('ix.thumbZone', 'twoThumbs')}`, how: 'TouchScreenButton（可设 action 直接触发输入映射）做动作键；摇杆用 Control + InputEventScreenDrag，浮动摇杆在按下位置生成；按钮最小边 ≥ ix.touchSize；project.godot 打开 input_devices/pointing/emulate_mouse_from_touch', level: 'script', done: false, params: ['ix.touchStick', 'ix.touchCluster', 'ix.touchSize'] });
  if (input === 'pad' || input === 'hybrid') notes.push({ where: '手柄导航', what: `焦点画法 ${r.str('ix.focus', 'outline')}`, how: 'Control.focus_mode = FOCUS_ALL，主题里 Button/styles/focus 已导出；focus_neighbor_* 设定方向键导航顺序，进入界面时 grab_focus() 第一个按钮', level: 'builtin', done: false, params: ['ix.focus'] });
  if (deviceAspectOf(r)) notes.push({ where: '画幅', what: `${r.str('ctx.orientation', 'landscape') === 'portrait' ? '竖屏' : '横屏'} ${r.str('ctx.aspect', '16x9')}`, how: 'project.godot：display/window/handheld/orientation 与 stretch/aspect = expand；根 Control 用 anchors 排版，超宽屏把 HUD 放进居中的 16:9 容器（AspectRatioContainer）', level: 'builtin', done: false, params: ['ctx.aspect', 'ctx.orientation'] });

  // 外形、状态层、多项排布、节点、插画槽（M12a-09 / 10 / 20 / 29 / 36）：只在用到时写迁移说明
  b3Notes(r, notes);
  b4Notes(r, notes);
  b5Notes(r, th, notes);
  b6Notes(r, th, notes);
  b7Notes(r, th, notes, layout);
  b8Notes(r, notes, layout);
  b9Notes(r, notes);
  m12bB1Notes(r, th, notes);
  m12bB2Notes(r, th, notes, pk);
  m12bB3Notes(r, th, notes);
  m12bB4Notes(r, th, notes);
  m12bB5Notes(r, th, notes);
  m12bB6Notes(r, th, notes);
  m12bB7Notes(r, th, notes);
  m12bB8Notes(r, th, notes, pk);
  m12bB9Notes(r, th, notes);
  m12bB10Notes(r, th, notes);

  // 全局做法说明
  if (th.pixel > 1) notes.push({ where: '整体', what: `UI 像素化 ×${th.pixel}`, how: 'UI 放进 SubViewport（尺寸 = 屏幕 / 倍数，texture_filter = NEAREST），用 TextureRect 整数倍放大；文字层单独放在上面保持可读', level: 'script', done: false, params: ['vis.pixelScale'] });
  if (str(v, 'camera.letterbox') !== 'none' && str(v, 'camera.letterbox')) notes.push({ where: '整体', what: '画幅黑边以内排版', how: '根 Control 的 offset 按黑边留出（本包按全屏排版）', level: 'builtin', done: false });
  if (r.str('rel.followPost') === 'warp' || str(v, 'surface.screen') === 'crt') notes.push({ where: '整体', what: 'CRT 弯曲作用于 UI', how: 'UI 放进 SubViewport，再作为纹理交给屏幕后处理着色器', level: 'shader', done: false, params: ['rel.followPost'] });

  const md = uiMigrationDoc(style, th, notes, frames, pk);
  const files: GodotUiFile[] = [
    { path: 'ui/ui_theme.tres', text: themeText },
    { path: 'ui/hud_sample.gd', text: script },
    { path: 'ui/UI_MIGRATION.md', text: md },
    ...(sv?.overlay ? [{ path: 'ui/ui_surface.gdshader', text: SURFACE_SHADER }] : []),
    ...(sv?.fade ? [{ path: 'ui/ui_fade.gdshader', text: FADE_SHADER }] : []),
    ...frames.map((f) => ({ path: `ui/tex/${f.file}`, text: '', asset: f.file })),
    ...fontFiles.map((f) => ({ path: `ui/fonts/${f}`, text: '', font: f })),
    // 许可原文：主许可 + 合并字体带的其他许可（Fusion Pixel 含 Ark Pixel、Cubic 11、Galmuri 的字形）
    ...[...new Set(HUD_FONT_FILES.filter((f) => fontFiles.includes(f.file)).flatMap((f) => licenseFilesOf(f.license)))].map((l) => ({ path: `ui/fonts/${l}`, text: '', license: l })),
  ];
  return { files, notes, theme: th };
}

/**
 * B3 的迁移说明（M12a-09 / 10 / 20 / 29 / 36）：小组件外形、状态层、多项排布、节点、插画槽——用到（有人显式写了对应参数）才写一行。
 * 都是画法层的东西：主题里导出的仍是 StyleBoxFlat 与颜色常量（节点三态 done / current / locked 在 HudRoles 里），这里说明 Godot 里怎么搭
 */
function b3Notes(r: Resolved, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback'; };
  const keys = r.keys();
  const sil = keys.filter((k) => k === 'vis.silhouette' || k.startsWith('vis.silhouette@')).filter((k) => r.str(k, 'box') !== 'box');
  if (sil.length) notes.push({ where: '小组件外形', what: sil.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '方 / 直角 / 圆角 / 药丸：StyleBoxFlat 的 corner_radius（直角 = 0）；圆：corner_radius = 边长一半；菱形 / 六角 / 盾 / 缎带：Polygon2D 或 _draw() 里 draw_colored_polygon，选中框 / 冷却罩沿同一多边形（clip_children = CLIP_CHILDREN_ONLY 的 Panel 作遮罩）；none = 不放底座 Panel；edgeTab（贴边页签）= StyleBoxFlat 只给 corner_radius_top_left（0.7 × 高）、corner_detail = 1 画成切角', level: 'script', done: false, params: ['vis.silhouette', 'vis.corner'] });
  const states = ['st.locked', 'st.cooldown', 'st.selected'].filter((k) => set(k));
  if (states.length) notes.push({ where: '格子状态', what: states.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '锁定 lock = 格子 modulate 0.45 + 挂锁 TextureRect；冷却 desat = 图标 CanvasItem 的去色着色器（COLOR.rgb = vec3(dot(COLOR.rgb, vec3(0.299, 0.587, 0.114))) × 0.7），radialWipe = TextureProgressBar（FILL_CLOCKWISE）叠在图标上；none = 不做这个状态；内凹格 = StyleBoxFlat 双色边框（上左暗、下右亮，两个叠放的 StyleBox）', level: 'shader', done: false, params: states });
  if (set('cmp.slotBadge') || set('cmp.slotBadgePos') || set('st.rarityPos')) notes.push({ where: '格子角标', what: '数量 / 稀有度记号的显隐与位置', how: '数量 Label 的 visible（qtyOver1 = 数量 > 1 才显示）与锚点预设（PRESET_BOTTOM_RIGHT / TOP_LEFT / CENTER_BOTTOM）；稀有度色条 = 锚在左 / 底 / 顶边的 ColorRect', level: 'builtin', done: false, params: ['cmp.slotBadge', 'cmp.slotBadgePos', 'st.rarityPos'] });
  const arr = keys.filter((k) => /^el\.(abilities|toolbar|choices)\.(arrangement|count|keyHint|durability|fill|rows|groups|pages)$/.test(k) || /^elx\.(count|keyHint|durability|fill)$/.test(k) && set(k));
  if (arr.length) notes.push({ where: '多项排布', what: arr.map((k) => `${k} = ${r.str(k)}`).join('、'), how: 'row / column / grid = HBox / VBox / GridContainer；cross / ring / zigzag2 / pyramid = 自定义 Container（GDScript：_notification(NOTIFICATION_SORT_CHILDREN) 里按探索台 arrangeCells 的公式对每个子节点 fit_child_in_rect）；格数 = 实例化 N 个格子子场景，分组 = 组间放一个定宽 Control；键位角标随最后一次输入的设备切换 Label / 键帽 TextureRect；通高 = anchors 拉满一边（PRESET_LEFT_WIDE）', level: 'script', done: false, params: ['elx.arrangement', 'elx.count', 'elx.keyHint', 'elx.fill'] });
  if (set('cmp.node') || set('col.nodeDone') || set('cnt.progress')) notes.push({ where: '节点', what: `画法 ${r.str('cmp.node', 'circleNumber')}`, how: '节点 = 子场景（TextureButton：底座 + 图标 + 编号 Label），三态（完成 / 当前 / 锁定）用 theme_type_variation，颜色取 HudRoles/colors/done、current、locked；连线 Line2D；building = 图标格 + 已完成角标，grace = 图标 + 放射光（加色混合的 Sprite2D）', level: 'script', done: false, params: ['cmp.node', 'col.nodeDone', 'st.done'] });
  const art = r.str('cmp.panelArt', 'none'), comp = r.str('cnt.companion', 'none');
  if ((art !== 'none' && art !== 'auto') || keys.some((k) => k.startsWith('cmp.panelArt@'))) notes.push({ where: '插画槽', what: `cmp.panelArt = ${art}`, how: 'PanelContainer 里的 TextureRect（expand_mode = IGNORE_SIZE、stretch_mode = KEEP_ASPECT_COVERED）：header 在顶部、window 在标题与数据之间、side 在详情栏顶部 / 左侧、full 铺满后叠一层 50% 黑 ColorRect；没有图时放占位贴图', level: 'texture', done: false, params: ['cmp.panelArt'] });
  if (comp === 'mascot' || comp === 'avatar') notes.push({ where: '陪衬角色', what: `cnt.companion = ${comp}`, how: comp === 'mascot' ? '弹窗左外沿一个独立的 Control：立绘 TextureRect + 气泡 PanelContainer（HudDialog 样式）+ 指向立绘的 Polygon2D 尾巴' : '字幕 HBox 里一张方形 TextureRect（细框 StyleBoxFlat），左右按 lay.focalSide', level: 'texture', done: false, params: ['cnt.companion'] });
}

/**
 * B4 的迁移说明（M12a-13 / 11 / 12 / 14）：数值标注、元素里的数值图形、生命条行模型、Boss 条、速度按钮条、多画法拆开——用到才写一行。
 * 条的底槽 / 填充 StyleBox 与 col.track 已在主题的 ProgressBar 里（bar token），这里说明控件怎么搭
 */
function b4Notes(r: Resolved, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback'; };
  const keys = r.keys();
  const vl = keys.filter((k) => /^(elx|el\.[a-zA-Z]+(\.[a-zA-Z0-9]+)?)\.valueLabel$/.test(k) && set(k) && r.str(k) !== 'none');
  if (vl.length) notes.push({ where: '数值标注', what: vl.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '数值 Label 作为 ProgressBar / TextureProgressBar 的子节点：inside / center = PRESET_CENTER（可读辅助用 LabelSettings.outline），end = 锚在条右侧外（HBox 里条后面一个 Label），above / below = 条上 / 条下一行；delta = 小一号 Label，正值 HudRoles/colors/good、负值 bad；文字每帧由脚本写（current / currentMax / percent）', level: 'builtin', done: false, params: ['elx.valueLabel', 'elx.valueLabelPos'] });
  const gk = keys.filter((k) => /^cmp\.gauge@el\./.test(k) && set(k));
  if (gk.length) notes.push({ where: '元素里的数值图形', what: gk.map((k) => `${k} = ${r.str(k)}`).join('、'), how: 'bar / thinBar = ProgressBar（主题里的底槽 / 填充 StyleBox，细条 = custom_minimum_size.y 小）；segmented = HBox 里 N 个小 Panel（或 TextureProgressBar + 分段纹理）；orb / ring / arc = TextureProgressBar 的 FILL_BOTTOM_TO_TOP（液面球，配圆形 mask）/ FILL_CLOCKWISE（环）/ radial_initial_angle + radial_fill_degrees（弧）；vertical = FILL_BOTTOM_TO_TOP；颜色 tint_progress 取 HudRoles 的颜色常量；目标进度条 = 标题下一条细 ProgressBar + 前置图标 TextureRect', level: 'builtin', done: false, params: ['cmp.gauge'] });
  const vk = keys.filter((k) => /^el\.vitals\.(labels|rowForms|rowColors|lengthByMax|lenRange|stack|count)$/.test(k) || /^(elx|el\.vitals)\.(label|thickness)$/.test(k)).filter(set);
  if (vk.length) notes.push({ where: '生命条行模型', what: vk.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '每行一个 HBoxContainer（行名 Label / 图标 TextureRect + TextureProgressBar），整组 VBoxContainer；竖条并排 = HBoxContainer of TextureProgressBar（fill_mode = FILL_BOTTOM_TO_TOP，行名在条顶）；逐行画法 / 颜色 = 各自的纹理与 tint_progress；条长按上限 = custom_minimum_size.x ∝ max_value；粗细 = custom_minimum_size.y × elx.thickness；多颗圆形计量 = 按 elx.arrangement 的自定义 Container 里 N 个 TextureProgressBar', level: 'builtin', done: false, params: ['el.vitals.labels', 'el.vitals.rowForms', 'el.vitals.rowColors', 'el.vitals.lengthByMax', 'el.vitals.stack', 'elx.thickness'] });
  if (set('el.threat.nameAlign') || set('el.threat.barWidth')) notes.push({ where: 'Boss 条', what: `名字 ${r.str('el.threat.nameAlign', 'center')}、条长 ${r.str('el.threat.barWidth', 'auto')}`, how: 'VBoxContainer（名字 Label + ProgressBar），名字 horizontal_alignment = LEFT / CENTER；条长 = custom_minimum_size.x = 视口宽 × 比例（锚 PRESET_CENTER_TOP / BOTTOM，不随 HUD 缩放改长短）', level: 'builtin', done: false, params: ['el.threat.nameAlign', 'el.threat.barWidth'] });
  if (r.str('el.gameSpeed.form') === 'speedBar') notes.push({ where: '速度按钮条', what: `暂停 + ${r.str('el.gameSpeed.steps', 'auto')} 档`, how: 'HBoxContainer 里 N + 1 个 Button（toggle_mode + 同一个 ButtonGroup），按下设 Engine.time_scale（暂停 = get_tree().paused）', level: 'builtin', done: false, params: ['el.gameSpeed.form', 'el.gameSpeed.steps'] });
  const multi = keys.filter((k) => /^el\.[a-zA-Z]+\.form$/.test(k) && r.list(k).filter((x) => x && x !== 'auto').length > 1);
  if (multi.length) notes.push({ where: '多画法', what: multi.map((k) => `${k} = ${r.list(k).join(' + ')}`).join('、'), how: '元素节点下每种画法一个子场景，各自的锚点（屏幕类：anchors preset，hud_sample.gd 已按子项排进锚点列）或挂点（世界类：每帧 unproject_position 跟随目标，Sprite3D / Label3D 也行）；画法级键 el.<元素>.<画法>.screenAnchor / attachTo 对应各子场景自己的锚点', level: 'script', done: false, params: ['elx.screenAnchor', 'elx.attachTo'] });
}

/** B5（M12a-33 / 35 / 22 / 27）的迁移说明：文字引擎、按钮、页签、列表行；只在用到时写 */
function b5Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback'; };
  const t = th.tokens;
  if (t.title?.ransom) notes.push({ where: '标题字', what: '勒索信逐字混排（typ.display.family = ransom）', how: 'RichTextLabel（bbcode_enabled）逐字写 [font=…][font_size=…][bgcolor=…][color=…]字[/…]：字族 / 字重 / 反白方块按（字串, 序号）的哈希取（与探索台同一算法，可在 GDScript 里移植 FNV-1a + mulberry32）；逐字旋转与基线抖动要 RichTextEffect 自定义特效（_process_custom_fx 里改 char_fx.transform）', level: 'script', done: false, params: ['typ.display.family'] });
  if (set('typ.outlineColor') || set('typ.outlineWidth')) notes.push({ where: '文字描边', what: `描边色 ${r.str('typ.outlineColor', 'auto')}、粗细 ${r.str('typ.outlineWidth', '0.08')} em`, how: 'LabelSettings.outline_size = round(2 × 字号 × 倍数)、outline_color；字号 < 24px@1080p 的 Label 不设描边，改用 shadow（shadow_size 2、offset (0, 1)）', level: 'builtin', done: true, params: ['typ.outlineColor', 'typ.outlineWidth'] });
  const roles = Object.keys(t.button?.roles ?? {});
  if (roles.length) notes.push({ where: '按钮', what: `动作角色色（${r.str('col.semantic', 'accentOnly')}）：${roles.join('、')}`, how: '主题里已导出类型变体 HudButton<角色>（Confirm / Back / Danger / Utility / Sell……）：按钮节点的 theme_type_variation 设成对应角色', level: 'builtin', done: true, params: ['col.semantic', 'col.actionColors'] });
  const face = r.str('cmp.buttonFace', 'filled'), box = r.str('cmp.buttonBox', 'true'), content = r.str('cmp.button', 'text');
  if (face !== 'filled' || box === 'false' || content !== 'text' || set('typ.button.family') || set('typ.button.size')) notes.push({ where: '按钮', what: `面 ${face}、底框 ${box}、内容 ${content}、字族 ${r.str('typ.button.family', 'body')}、字号 ${r.str('typ.button.size', 'auto')}`, how: 'outline = StyleBoxFlat.draw_center = false + border_width；link = LinkButton（underline = UNDERLINE_MODE_ALWAYS）；无底框 = Button.flat；icon / iconText = Button.icon（+ text）；字族 / 字号 = HudButton 类型变体的 fonts/font、font_sizes/font_size（字号下限 = 基准字号 × 0.8，按钮缩放只改 custom_minimum_size）', level: 'builtin', done: false, params: ['cmp.buttonFace', 'cmp.buttonBox', 'cmp.button', 'typ.button.family', 'typ.button.size'] });
  const nav = r.str('lay.nav', 'none');
  if (/^tabs/.test(nav) && (set('cmp.tab') || set('cmp.tabIndicator') || r.num('lay.navDepth', 1) >= 2 || r.str('lay.navKeys', 'auto') !== 'auto')) notes.push({ where: '页签', what: `内容 ${r.str('cmp.tab', 'text')}、选中 ${r.str('cmp.tabIndicator', 'filled')}、级数 ${r.num('lay.navDepth', 1)}、切换键 ${r.str('lay.navKeys', 'auto')}`, how: 'TabBar：tab_selected / tab_unselected StyleBox（filled = 按键样式；underline = 只画下边框的 StyleBoxFlat；weight / colorOnly = 两态只改 font_selected_color 与字重；sunken / raised = 选中项 expand_margin 下移 / 上移）；图标 = set_tab_icon；二级页签 = 第二个 TabBar；切换键 = 两侧 TextureRect + InputMap 的 ui_tab_prev / next', level: 'builtin', done: false, params: ['cmp.tab', 'cmp.tabIndicator', 'lay.navDepth', 'lay.navKeys'] });
  if (nav === 'hotspots' && !['none', 'auto'].includes(r.str('cnt.focal', 'none'))) notes.push({ where: '场景热区', what: '热区叠在主体插画上（不占版面）', how: '插画 TextureRect 上放透明 TextureButton（或 Area2D + CollisionPolygon2D）当热区，焦点热区显示编号 / 高亮圈，名字用悬停的 Tooltip', level: 'builtin', done: false, params: ['lay.nav', 'cnt.focal'] });
  const rowBox = r.str('cmp.listRowBox', 'auto');
  if (rowBox !== 'auto' || set('cmp.listRowColors') || r.list('cmp.listRow').includes('status') || set('st.done') || ['row', 'cascade'].includes(r.str('lay.arrangement', ''))) notes.push({ where: '列表行', what: `行底 ${rowBox}、状态 ${r.str('st.statusMark', 'dot')}、完成 ${r.str('st.done', 'check')}、排布 ${r.str('lay.arrangement', 'column')}`, how: 'VBoxContainer 里每行一个 PanelContainer / Button（listRow 类型变体：card = StyleBoxFlat，plain = StyleBoxLine 分隔线，bare = StyleBoxEmpty，zebra = 两个交替的 StyleBoxFlat）；字段颜色 = 各 Label 的 theme_type_variation；状态 = 行尾 TextureRect / 小 Label；完成 = 划线用 RichTextLabel 的 [s]、灰化 = modulate.a；cascade = 每项一个 Control 设 rotation 与字号（脚本按序号生成）', level: 'builtin', done: false, params: ['cmp.listRowBox', 'cmp.listRowColors', 'st.statusMark', 'st.done', 'lay.arrangement'] });
  if (r.list('ix.focus').includes('brushSwash')) notes.push({ where: '导航焦点', what: '笔刷底（brushSwash）', how: '焦点项后面放一张笔刷 TextureRect（暗色面板用浅色笔刷、正常混合，焦点项 Label 的 font_focus_color = 面板底色；亮色面板 CanvasItemMaterial.blend_mode = MUL）', level: 'texture', done: false, params: ['ix.focus'] });
}

/** 模板外壳（M12a-08 / 23 / 24 / 25 / 37）：饰件占位、页头、背景与场景处理、叠加容器、分区面板 / 分栏——只在用到时写迁移说明 */
function b6Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived'; };
  const o = th.tokens.panel.ornament;
  if (o && (o.level > 0 || o.parts.length)) notes.push({ where: '饰件', what: `饰件占位 ${r.str('lay.ornamentInset', 'auto')}、分隔线 ${o.dividerStyle ?? 'auto'}`, how: '角花 = 面板下的 NinePatchRect / TextureRect 角件子节点（位图角件用灰阶贴图 + modulate 按饰色着色）；占位 = 面板内容 MarginContainer 的 margin（或 StyleBox.content_margin）取角件臂宽，页头 HBox 左右再让出角件宽；分隔线 = HSeparator（StyleBoxLine），plain 时不放中间的 TextureRect', level: 'builtin', done: false, params: ['lay.ornamentInset', 'vis.dividerStyle', 'ast.ornaments'] });
  // 关闭控件按生效条件（M12b-64 ⑧，与 screen.ts 的 closeKind 同口径）：forced / timed / tapAnywhere / tapOutside 时不放
  const pos = r.str('lay.titlePos', 'panel'), close = ['forced', 'timed', 'tapAnywhere', 'tapOutside'].includes(r.str('ix.dismiss', '')) ? 'none' : r.str('ix.close', 'xTopRight'), back = r.str('ix.back', 'none');
  if (pos !== 'panel' || set('lay.titleAlign') || set('lay.titleSubtitle') || back !== 'none' || ['none', 'bottomCenter', 'innerBR'].includes(close)) notes.push({ where: '页头', what: `标题位置 ${pos}、对齐 ${r.str('lay.titleAlign', 'left')}、副题 ${r.str('lay.titleSubtitle', 'none')}、返回 ${back}、关闭 ${close}`, how: '页头 = 面板顶部 HBoxContainer（返回 Button + 标题 Label / 标牌 PanelContainer + 关闭 Button）；screenTop = CanvasLayer 顶部居中的 VBox（Label + 下划线 ColorRect + 副题 Label）；straddle = 负 offset_top 的标牌 Panel；onFocal = 立绘 TextureRect 的子节点；bottomCenter / innerBR = 锚在面板底边中点 / 内框右下的关闭 Button；none = 不放；居中标题与容器上沿正中的成块饰件（顶饰 TextureRect）相交时，页头 HBox 的 margin_top 让到饰件下沿 + 4（让出的不超过内框高 25%，R4 回归修复 C1 ⑤）', level: 'builtin', done: false, params: ['lay.titlePos', 'lay.titleAlign', 'lay.titleSubtitle', 'ix.back', 'ix.close'] });
  const tones = r.list('rel.sceneTone').filter((x) => x && x !== 'none');
  if (tones.length || set('rel.vignette') || (r.str('rel.behind', 'live') === 'replaced' && ['material', 'starfield', 'spotlightStage', 'pattern'].includes(r.str('ast.bgArt', 'solid'))) || !['none', 'auto'].includes(r.str('ast.watermark', 'none'))) notes.push({ where: '背景', what: `背后调色 ${tones.join(' + ') || 'none'}、暗角 ${r.str('rel.vignette', 'auto')}、替换背景 ${r.str('ast.bgArt', 'solid')}、水印 ${r.str('ast.watermark', 'none')}`, how: '全屏 ColorRect（压暗）+ CanvasItem shader：tint / duotone 用 SCREEN_TEXTURE 乘强调色（探索台的 HUD 画布只能叠薄色，Godot 里可以做真的正片叠底 / 去色），vignette 的 strength 作 uniform；替换背景 = 全屏 TextureRect（材质 stretch_mode = TILE、rotation = ast.bgMatAngle）；水印 = TextureRect + modulate.a', level: 'shader', done: false, params: ['rel.sceneTone', 'rel.vignette', 'ast.bgArt', 'ast.bgMatAngle', 'ast.watermark'] });
  if (['overlay', 'banner', 'none'].includes(r.str('lay.container', 'modal')) && (!['none', 'auto'].includes(r.str('cnt.dataShape', 'none')) || !['none', 'auto'].includes(r.str('cnt.focal', 'none')))) notes.push({ where: '叠加模板', what: '叠加 / 横幅容器里的主体与数据', how: '根节点是不带 Panel 的 Control（anchors 铺满），数据区直接放 GridContainer / HBoxContainer，主体立绘 TextureRect 贴底；没有页头', level: 'builtin', done: false, params: ['lay.container', 'cnt.dataShape', 'cnt.focal'] });
  if (r.str('cmp.modal', 'standard') === 'perRegion' || set('lay.splitRatio') || (r.str('lay.grouping', '') === 'divider' && set('lay.grouping')) || (r.str('lay.layering', '') === 'separate' && set('lay.layering'))) notes.push({ where: '分区', what: `弹窗结构 ${r.str('cmp.modal', 'standard')}、分栏比例 ${r.str('lay.splitRatio', 'auto')}、分组 ${r.str('lay.grouping', 'panel')}`, how: 'HSplitContainer / VSplitContainer（split_offset 或两栏 size_flags_stretch_ratio = 分栏比例）；perRegion / separate = 每个分区各一个 PanelContainer（半透明 StyleBoxFlat），根节点不放总 Panel；divider = 两栏之间一个 VSeparator（1px，颜色 col.border）；对话类模板分栏、数据是正文时，没选锚点空间的选项（el.choices）与正文放进同一个 VBox（正文 RichTextLabel 在上、选项 VBox 紧跟、间距 14；lay.dataAlign = center 时整个 VBox 竖向居中，R4 回归修复 C1 ④）', level: 'builtin', done: false, params: ['cmp.modal', 'lay.splitRatio', 'lay.grouping', 'lay.layering'] });
}

/** HUD 版式引擎（M12a-17 / 18 / 16 / 19）：占位表与避让、同锚点堆叠、贴边条、模板里的锚点空间与垫底——用到才写（按元素排版时总写避让一行） */
function b7Notes(r: Resolved, th: Theme, notes: UiNote[], layout: LayoutOut | null) {
  const elements = !!layout;
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived'; };
  const keys = r.keys();
  // 旧皮肤：皮肤之前的层（品类布局）写的堆叠 / 偏移 / 躲开玩家不生效（与 compose/hud.ts 的 layoutEl 同口径，目检修复），迁移说明也不列
  const elk = (suffix: string) => keys.filter((k) => new RegExp(`^(elx|el\\.[a-zA-Z]+(\\.[a-zA-Z0-9]+)?)\\.${suffix}$`).test(k) && set(k) && (!th.legacy || afterSkin(r, k)));
  const avoid = elk('avoidPlayer').filter((k) => r.bool(k));
  if (elements) notes.push({ where: '避让', what: `占位表避让（中列先横向收缩、纵向不越过中线）${avoid.length ? `；躲开玩家：${avoid.join('、')}` : ''}`, how: '运行时布局脚本 HudLayout.gd（autoload）在 _process 里按探索台同一张占位表算：收集各锚点列 / 贴边条 / 触屏按钮的 get_global_rect()，上中 / 下中列与侧列相交时先 scale 到两侧之间的空宽（下限 0.75）并居中（Boss 条这类必须居中的先只收条长到对称空宽、最短原长一半，再试纵向挪），放不下再沿离开屏幕边的方向挪（不越过 viewport 高的一半）；世界挂点元素（unproject_position 的 Label / TextureRect）压到这些矩形时沿上 / 下 / 左 / 右推开（取挪得最少、仍在安全区里的），推不开 visible = false；elx.avoidPlayer 的列在玩家投影外扩 80 设计单位的矩形进入原位、且对边的位置不压玩家时换成对边的 anchors 预设；合规层 Label 被压时上移或换角。迟滞（审查修复 A · L1 / L5，每帧重判会抖）：每个元素在脚本里存一份状态（Dictionary，键 = 元素 + 画法）——躲开玩家：翻过去后玩家走进新位置、原位空出来时马上翻回，否则要原位外扩 24 设计单位仍空着连续 6 帧（或 ≥ 2 帧且 0.3 秒）才翻回；推开：上一帧的推开方向这帧还推得开、且不比最省的方案多挪 8 设计单位以上就沿用；推不开时上一帧还显示着的按上一帧的位移再显示 3 帧才隐藏', level: 'script', done: false, params: ['elx.avoidPlayer', 'elx.occlusion', 'elx.screenAnchor'] });
  const stack = [...elk('stackDir').filter((k) => r.str(k) !== 'inherit' && r.str(k) !== 'column'), ...elk('stackWidth').filter((k) => r.str(k) === 'match'), ...elk('offsetX').filter((k) => r.num(k, 0)), ...elk('offsetY').filter((k) => r.num(k, 0))];
  if (stack.length) notes.push({ where: '同锚点堆叠', what: stack.map((k) => `${k} = ${r.str(k)}`).join('、'), how: 'hud_sample.gd 已按锚点搭成 HBoxContainer（每格一个 VBoxContainer：row 另起一格）；rowBar = 这一行外面再包一层 PanelContainer（HudBar 类型变体）；match = 元素 size_flags_horizontal = SIZE_FILL；偏移 = 外面一层不排版的 Control，元素 position = 屏宽 / 屏高 × 百分比', level: 'builtin', done: true, params: ['elx.stackDir', 'elx.stackWidth', 'elx.offsetX', 'elx.offsetY'] });
  const org = hudOrgOf(th);
  if (org !== 'scattered') {
    const bars = layout?.bars ?? [], mg = layout?.margin;
    const dropped = layout?.dropped ?? [];
    const what = `lay.hudOrg = ${org}${r.list('lay.hudEdge').length ? `（${r.list('lay.hudEdge').join(' + ')}）` : ''}${org === 'inMargin' && mg ? `，玩法区 ${mg.aspect}、边框宽 ${mg.side}` : ''}${bars.some((b) => b.fit < 1) ? `，整条缩放 ${bars.map((b) => `${b.edge} ${b.fit}`).join(' / ')}` : ''}${dropped.length ? `；放不下、退回散排：${dropped.join('、')}` : ''}`;
    notes.push({ where: '贴边条', what, how: org === 'inMargin'
      ? 'hud_sample.gd 已搭：玩法区两侧各一个全高 PanelContainer（HudBar 类型变体，PRESET_LEFT_WIDE / RIGHT_WIDE，宽 = 边框宽）装左列 / 右列的元素（上 / 中 / 下三段 VBox），散排的元素放在两框之间的版面里。玩法区画幅与探索台同一份规划（compose/hud.ts 的 planMargins）：lay.playfield = boxed 依次试 4:3 → 1:1 → 3:4、centerColumn 试 3:4 → 9:16、其余 4:3（画面比 16:9 宽时 16:9），先取元素都不用缩的，再取都放得下（缩放 ≥ 0.75）的；放不下的元素（优先级低的先退）退回散排。3D 画面要居中裁成同一画幅时把相机视口放进 AspectRatioContainer'
      : 'hud_sample.gd 已搭：锚到边的 PanelContainer（HudBar 类型变体，PRESET_TOP_WIDE / BOTTOM_WIDE / LEFT_WIDE / RIGHT_WIDE）+ 起 / 中 / 末三段 HBox（竖条 VBox），条里的格按 lay.edgeBarSlots 的顺序（"a|b" = 同一格的 HBox 里并排），给了 lay.edgeBarSlots 时每格之间一条分隔线、否则只在中段两侧；成员、格序、整条缩放（≥ 0.85，元素尺寸已按它缩好）与「放不下时低优先级的格退回散排」与探索台同一份规划（compose/hud.ts 的 planEdgeBars）；散排的元素放在扣掉条厚度的版面（AREA）里。console 两端的仪表盒 = 两端各一个更高的 PanelContainer（anchors 贴底角），本包没搭',
      level: 'builtin', done: true, params: ['lay.hudOrg', 'lay.hudEdge', 'lay.edgeBarSlots', 'lay.playfield'] });
  }
  if (r.list('flow.chrome').includes('statusBar')) notes.push({ where: 'PC 式状态条', what: 'flow.chrome = statusBar', how: 'Autoload 的 CanvasLayer 里一条 PRESET_TOP_WIDE 的 PanelContainer（HudBar）：左边 HBox 放资源图标 + 数字 Label（没有「+」按钮），右边回合 / 时间 Label 与菜单 Button，中间 VSeparator', level: 'builtin', done: false, params: ['flow.chrome'] });
  const space = elk('anchorSpace').filter((k) => r.str(k) !== 'inherit'), keep = elk('keepOnMenu').filter((k) => r.bool(k));
  if (space.length || keep.length || r.str('flow.stacking', 'replace') === 'overHud') notes.push({ where: '模板里的元素', what: [...space.map((k) => `${k} = ${r.str(k)}`), ...keep.map((k) => `${k} = true`), ...(r.str('flow.stacking', 'replace') === 'overHud' ? ['flow.stacking = overHud'] : [])].join('、'), how: 'screen = 挂在界面 CanvasLayer 根下（anchors 按整屏）；container = 面板节点下；header = 页头 HBoxContainer 的子节点（标题 Label 隐藏；比 max(2 × 标题行高, 内框高 25%) 还高的元素不进页头、放进页头与按钮行之间那一条，R4 回归修复 C1 ①）；data / detail = 对应分区容器下；keepOnMenu 的局内元素放在比菜单更高的 CanvasLayer（菜单打开时不隐藏）；overHud = 打开界面时局内 HUD 的 CanvasLayer 照常显示、菜单的暗幕盖在它上面', level: 'builtin', done: false, params: ['elx.anchorSpace', 'elx.keepOnMenu', 'flow.stacking'] });
}

/**
 * 世界挂点、状态图标、字幕通知、提示小件、地图视图（M12a-15 / 31 / 32 / 34 / 30）的迁移说明：用到（显式写了对应参数 / 元素在场）才写一行。
 * 都是运行时布局与画法：主题里导出的仍是 StyleBox 与颜色常量（状态图标的 info 色在 HudRoles 里），这里说明 Godot 里怎么搭
 */
function b8Notes(r: Resolved, notes: UiNote[], layout: LayoutOut | null) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived'; };
  const keys = r.keys();
  const elk = (suffix: string) => keys.filter((k) => new RegExp(`^(elx|el\\.[a-zA-Z]+(\\.[a-zA-Z0-9]+)?)\\.${suffix}$`).test(k) && set(k) && r.str(k, 'auto') !== 'auto');
  const els = r.elements();
  const blocks = layout?.world.filter((w) => w.block) ?? [];
  const wopts = [...elk('attachOffset'), ...elk('attachGap'), ...elk('attachWidth'), ...elk('offscreen'), ...elk('occlusion')];
  const card = r.str('lay.container', 'modal') === 'anchoredCard';
  if (blocks.length || wopts.length || card) notes.push({ where: '世界挂点', what: [...blocks.map((w) => `${w.label} → ${w.attach}（${w.side}）`), ...wopts.map((k) => `${k} = ${r.str(k)}`), ...(card ? ['lay.container = anchoredCard'] : [])].join('、'), how: '挂点元素是普通 Control（不进锚点列）：_process 里 position = Camera3D.unproject_position(目标.global_position) + 偏移（attachOffset：above = (−size.x / 2, −包围盒上沿 − 间距 − size.y)、below / left / right / center 同理，间距 = attachGap），再 clamp 到视口安全区；屏外（not camera.is_position_in_frustum）按 offscreen：clamp / visible = false / 画面边缘一个 rotation 指向目标的箭头 TextureRect；与 HUD 控件的 get_global_rect() 相交时按 occlusion 挪到最近的不相交位置 / 隐藏 / 不管；attachWidth = actor = 目标 AABB 投影的宽；anchoredCard = 一个 PanelContainer 每帧挂在掉落物上方，情境提示 Label 放在卡片下沿', level: 'script', done: false, params: ['elx.attachTo', 'elx.attachOffset', 'elx.attachGap', 'elx.attachWidth', 'elx.offscreen', 'elx.occlusion', 'lay.container'] });
  const status = els.includes('el.overlay') && r.list('el.overlay.form').includes('statusIcons');
  const badge = r.str('cmp.badge', 'auto');
  if (status || (set('cmp.badge') && ['none', 'roundel', 'chevron'].includes(badge))) notes.push({ where: '状态图标与徽章', what: [status ? 'el.overlay = statusIcons' : '', set('cmp.badge') ? `cmp.badge = ${badge}` : '', set('st.alert') ? `st.alert = ${r.list('st.alert').join(' / ')}` : ''].filter(Boolean).join('、'), how: 'StatusIcons.tscn = HBoxContainer（separation 3）里每个图标一个 TextureRect / Label，整行挂在目标头顶的投影点上、贴在头顶血条上方；颜色 = HudRoles/colors/warn、danger、info、good；roundel = 圆形 StyleBoxFlat（corner_radius = 半宽，角色色底）+ 白色符号；none = 只放符号（LabelSettings 描边）；chevron = 自定义 _draw 画 V 形杠（等级 1–5 道，4 级起加星），线色 = HudRoles/colors/icon；st.alert = blink 用 AnimationPlayer 让 danger 类的 modulate.a 每秒闪两次；像素风（vis.iconStyle = pixel）用像素图集的 AtlasTexture（texture_filter = NEAREST）', level: 'script', done: false, params: ['el.overlay.form', 'cmp.badge', 'st.alert', 'vis.iconStyle'] });
  const subF = r.str('el.subtitle.form', 'auto'), dlg = r.str('cmp.dialogBox', 'bar');
  const scopedNotify = keys.some((k) => /@(el\.notify|el\.subtitle|dialog)$/.test(k) && /^(col\.surface|col\.text|vis\.opacity|vis\.stroke)/.test(k));
  if ((els.includes('el.subtitle') && (subF !== 'auto' || dlg === 'bubble')) || scopedNotify) notes.push({ where: '字幕与通知', what: [els.includes('el.subtitle') ? `字幕 ${subF !== 'auto' ? subF : dlg === 'bubble' ? 'bubble' : 'auto'}` : '', scopedNotify ? '字幕 / 通知按元素取色' : ''].filter(Boolean).join('、'), how: '字幕 = RichTextLabel（bbcode：speakerColor 的说话人名用 [color]，lineOnly 不写前缀）放进 PanelContainer（HudDialog 类型变体；boxed 的默认底 = 60% 黑 StyleBoxFlat）；bubble = NinePatchRect 气泡 + 尾巴 Polygon2D（尾尖指向说话人投影点）；挂在说话人身上的字幕 = 挂点 Control（见「世界挂点」）；通知横带 band 的底 = ColorRect（col.surface@el.notify，默认强调色 85%），字 = LabelSettings（发光 = shadow_color 跟字色）；信息流 feed 的行底透明度 = StyleBoxFlat.bg_color.a（0 = StyleBoxEmpty + 描边字）；结果提示 toast 按结果换 HudRoles/colors/good / bad', level: 'builtin', done: false, params: ['el.subtitle.form', 'cmp.dialogBox', 'el.notify.form'] });
  const ind = r.str('lay.pageIndicator', 'auto');
  if ((els.includes('el.prompt') && r.list('el.prompt.form').includes('legend')) || (set('lay.pageIndicator') && ind !== 'auto')) notes.push({ where: '按键图例与分页', what: [els.includes('el.prompt') ? '按键图例按实宽排' : '', set('lay.pageIndicator') ? `分页指示 ${ind}` : ''].filter(Boolean).join('、'), how: '图例 = HBoxContainer（键帽 PanelContainer / 手柄图标 TextureRect 与动作 Label 交替，separation 6 / 16，宽度自动、按锚点 SIZE_SHRINK_BEGIN / END）；平移提示并进图例的最后一项；分页指示 = 自定义 PageIndicator：dots = HBox of TextureRect、arrows = 数据区两侧垂直居中的 TextureButton（花饰箭头用带卷须的贴图）、numbers = Label「1 / 3」；滚动条 = ScrollContainer 的 VScrollBar，放在网格右缘（兼作分隔线）', level: 'builtin', done: false, params: ['el.prompt.form', 'lay.pageIndicator', 'lay.overflow'] });
  if (r.str('cnt.dataShape', 'none') === 'spatial') notes.push({ where: '世界地图', what: `出血 ${r.str('lay.mapBleed', 'auto')}、地名 ${r.str('vis.mapLabels', 'auto')}、画风 ${r.str('vis.mapStyle', 'auto')}、未探索 ${r.str('vis.mapUnexplored', 'fog')}${set('vis.mapInk') ? `、墨色 ${r.str('vis.mapInk')}` : ''}`, how: '地图 = TextureRect（出血时铺满、放最底层 CanvasLayer，页头 / 图例放在上面一层，上下各一条 GradientTexture2D 暗带；不出血时放进内容区的 PanelContainer，clip_contents = true）；底图按窗口尺寸用 SubViewport + 正交 Camera3D 烘焙（尺寸 = 视口宽 × 屏幕缩放，上限 1024），画风 / 色板作 CanvasItem shader 的 uniform（chalk / glowSilhouette 用 shader 里的边缘检测描轮廓）；未探索遮罩 = 遮罩纹理（探索格）+ 噪声扰边的 shader；节点 = 子场景（位置按探索台的泊松盘结果导出成常量数组，或 GDScript 里用同一个种子生成），聚簇 = 距离阈值合并后显示数字徽章；地名 = Label（onMap，LabelSettings 阴影）/ PanelContainer + Label（plate）', level: 'shader', done: false, params: ['lay.mapBleed', 'vis.mapLabels', 'vis.mapStyle', 'vis.mapUnexplored', 'vis.mapInk', 'cnt.itemCount'] });
}

/**
 * 集合几何与详情栏（M12a-28 / 21 / 26 / 38）的迁移说明：网格几何与格子占用、卡行、详情栏与浮动详情、容器几何——显式写了对应参数（或模板本来就有网格 / 卡行 / 详情）才写一行。
 * 都是界面模板的版式：主题里导出的仍是 StyleBox（tooltip / card / panel 部件的类型变体），这里说明 Godot 里怎么搭
 */
function b9Notes(r: Resolved, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto'; };
  const arr = r.str('lay.arrangement', ''), shape = r.str('cnt.dataShape', 'none');
  const grid = (shape === 'collection' || shape === 'sequence') && (arr === 'grid' || arr === 'hexGrid');
  const gk = ['lay.columns', 'lay.cellAspect', 'lay.cellSize', 'lay.gap', 'cnt.slotCount', 'cnt.filledCount', 'cnt.fillRatio', 'cnt.fillOrder'].filter(set);
  if (grid && (gk.length || arr === 'hexGrid' || (r.list('ix.focus').includes('scale') && set('ix.focus')))) notes.push({ where: '集合网格', what: [`${arr}`, ...gk.map((k) => `${k} = ${r.str(k)}`), ...(set('ix.focus') && r.list('ix.focus').includes('scale') ? ['ix.focus 含 scale'] : [])].join('、'), how: 'GridContainer（columns = lay.columns、theme_override_constants/h_separation / v_separation = lay.gap ÷ 2）里每格一个子场景，custom_minimum_size = (边长, 边长 ÷ lay.cellAspect)；放不下全部行时脚本按 (容器高 − 行间距) ÷ 行数反推格高（探索台 lattice 的公式），缩到下限仍放不下就放进 ScrollContainer 分页；六角网 = 自定义 Container（奇数行右移半格、行距 = 格高 × 外形系数 0.75 / 0.5 / 0.866）；焦点放大 = 获得焦点的格子 scale 1.12（pivot_offset = 中心）、同行邻格 position.x 外推 6%；格子占用 = 数据层：总格数 N 个子场景、其中 M 个放物品，其余用 empty 变体（st.emptySlot）', level: arr === 'hexGrid' || set('ix.focus') ? 'script' : 'builtin', done: false, params: ['lay.columns', 'lay.cellAspect', 'lay.cellSize', 'lay.gap', 'cnt.slotCount', 'cnt.fillRatio', 'cnt.filledCount', 'cnt.fillOrder'] });
  const cards = shape === 'collection' && arr === 'row' && (r.str('cnt.subtype', '') === 'draft3' || r.str('cmp.slot', '') === 'tallCard');
  if (cards) notes.push({ where: '卡行', what: [`${Math.round(r.num('cnt.itemCount', 3))} 张`, set('lay.cellAspect') ? `宽高比 ${r.str('lay.cellAspect')}` : '', r.num('hier.dimInactive', 0) > 0 ? `非当前压暗 ${r.num('hier.dimInactive', 0)}` : '', r.bool('lay.raisedCurrent') ? '当前抬高' : ''].filter(Boolean).join('、'), how: 'HBoxContainer（alignment = CENTER，separation 18）里每张卡一个子场景，custom_minimum_size = 按可用高定宽（高 × 宽高比，没给时 1 : 1.45、宽封顶 200）；当前卡 = 获得焦点的那张（与选中同一张）：position.y −= 14（lay.raisedCurrent）、其余 modulate = 1 − 0.7 × hier.dimInactive 且下沉 12；稀有度色只在 col.coding 含 rarity / st.rarityCue 不为空时用；卡内名字与说明同一 horizontal_alignment（lay.titleAlign）', level: 'builtin', done: false, params: ['cnt.itemCount', 'lay.cellAspect', 'hier.dimInactive', 'lay.raisedCurrent', 'lay.titleAlign'] });
  const det = r.str('lay.detail', 'none');
  if (det === 'persistent' || det === 'transient' || shape === 'record') notes.push({ where: '详情栏', what: `详情 ${shape === 'record' ? 'record' : det}、交互 ${r.str('ix.mode', 'singleCTA')} / ${r.str('ix.confirm', 'instant')}、输入 ${r.str('ctx.input', 'kbm')}`, how: 'DetailPanel.tscn = VBoxContainer（名字 Label：字号 = max(标题, 正文 × typ.scale, 小字 × 1.15)——比说明字至少大一级；旧皮肤没选 typ.scale 时 = 标题字号，可选 HSeparator 细线 → 说明 Label（autowrap、max_lines_visible，栏矮时先截它）→ 属性 ProgressBar 行 → 按钮 HBox 贴底（size_flags_vertical = EXPAND 的空 Control 把它压到底））；按钮集合由脚本按交互模式与最后输入的设备决定（只读 / 即点即生效的选择 / 手柄 = 不放，单一主按钮 = 只放第一个；显式选了 ix.mode = singleCTA、这一屏没放 el.cta、有常驻详情 / 记录页时详情栏不放按钮，主动作写进模板底部按钮行 HBox 的那一颗）；浮动详情 = PopupPanel（HudTooltip 类型变体，带外框）+ 定位脚本：候选 = 焦点控件 get_global_rect() 的右 / 左 / 下 / 上（朝屏幕中心一侧优先），取第一个不与条目 / 节点 / HUD 控件相交的位置（节点图——关系网 / 层级——上四个都压到节点时，再在锚点四周 8 个方向 × 3 圈（1 / 1.6 / 2.4 倍的「半个焦点框 + 8 + 半个浮框」）由近到远找；发光点的节点框按光晕 = 1.6 × 半径算），HUD 控件、页签条与挂在容器外沿的页签不能压——四个方向都压到它们时，左右候选沿挡路的那块上下滑、上下候选左右滑到空当里（离原位近的先试，R4 回归修复 C1 ⑦），仍都相交时取重叠最小的、并把列表的 custom_minimum_size.x 收窄让出一栏；尺寸 = 内容的最小尺寸（宽 200–300）', level: det === 'transient' ? 'script' : 'builtin', done: false, params: ['lay.detail', 'ix.mode', 'ix.confirm', 'typ.scale'] });
  const ck = ['lay.panelAspect', 'lay.panelFit', 'lay.vAlign', 'lay.drawerFlush'].filter(set);
  const tray = ['tray', 'sheet'].includes(r.str('lay.container', 'modal')) && set('lay.panelSize');
  if (ck.length || tray) notes.push({ where: '容器几何', what: [...ck.map((k) => `${k} = ${r.str(k)}`), ...(tray ? [`托盘宽 = 画面宽 × ${r.str('lay.panelSize')}`] : [])].join('、'), how: 'panelAspect = 面板外包一层 AspectRatioContainer（ratio = 宽 ÷ 高，stretch_mode = FIT，fullHeight = anchors 上下拉满）；fitContent = 面板 PanelContainer 的 size_flags = SIZE_SHRINK_CENTER（随内容的最小尺寸收放，弹窗居中 / 抽屉贴顶 / 托盘贴底，或按 lay.vAlign 的 SHRINK_BEGIN / END）；托盘宽 = anchors 左右各收 (1 − panelSize) ÷ 2；drawerFlush = 抽屉 anchors PRESET_RIGHT_WIDE、offset_top = 顶栏高、不留边距', level: 'builtin', done: false, params: ['lay.panelAspect', 'lay.panelFit', 'lay.vAlign', 'lay.drawerFlush', 'lay.panelSize'] });
}

/**
 * M12b B1 的迁移说明（M12b-68 / 67 / 33 / 58 / 64 / 65 / 66）：作用域接线、格子与列表行细节、稀有度 / 类别色表、图标着色、模板排位 v2、HUD 排位残留、地图视图——
 * 用到（显式写了对应参数 / 模板里有对应结构）才写一行。颜色表（HudRoles/colors/rarity_i、line_i）已在主题里导出（done）
 */
function m12bB1Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto'; };
  const keys = r.keys();
  // 68：逐行图标 / 行名、锁定标记、热区提示、按目标的图标风格 / 着色
  const rowK = ['el.vitals.rowIcons', 'el.vitals.rowLabels', 'el.threat.lockStyle', 'lay.hotspotCue'].filter((k) => r.has(k) && set(k));
  if (rowK.length) notes.push({ where: '小选项', what: rowK.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '生命 / 护盾 / 体力的逐行图标 = 每行 HBox 开头一个 TextureRect（或单色字形 Label，emoji 字形加 U+FE0E 文本变体、字体回退到单色符号字体）、行名 = Label；锁定小点 = 目标上 _draw() 画一颗 col.focus 实心点 + 深色细边；热区提示 = 热区 Control 的 hover 信号切换高亮 TextureRect / Label', level: 'script', done: false, params: rowK });
  const iconScoped = keys.filter((k) => /^vis\.(iconStyle|iconTint|iconTintAmount)@/.test(k));
  if (set('vis.iconTint') || iconScoped.length || ['etched', 'symbol', 'singleChar'].includes(r.str('vis.iconStyle', ''))) notes.push({ where: '图标着色与风格', what: [set('vis.iconTint') ? `vis.iconTint = ${r.str('vis.iconTint')}（强度 ${r.str('vis.iconTintAmount', '1')}）` : '', set('vis.iconStyle') ? `vis.iconStyle = ${r.str('vis.iconStyle')}` : '', ...iconScoped.map((k) => `${k} = ${r.str(k)}`)].filter(Boolean).join('、'), how: '位图图标的去色 / 压暗 / 单色 / 双色 = TextureRect 的 canvas_item shader（uniform：tint_mode、tint_color、strength）；单色 accent 也可以只用 self_modulate；按目标（@icon / @el.x）= 那类节点用 Hud_<目标> 类型变体或单独的 ShaderMaterial；etched = 浅浮雕：图标下错开 1px 再画一层暗色副本；singleChar = 只写名字首字的 Label', level: 'shader', done: false, params: ['vis.iconTint', 'vis.iconTintAmount', 'vis.iconStyle'] });
  // 33：稀有度 / 类别色
  if (set('col.rarityScale') || set('col.rarityColors') || set('col.lineColors')) notes.push({ where: '稀有度与类别色', what: [set('col.rarityScale') ? `色阶 ${r.str('col.rarityScale')}` : '', set('col.rarityColors') ? '自定义稀有度色表' : '', set('col.lineColors') ? '自定义类别色表' : ''].filter(Boolean).join('、'), how: '颜色已导出为 HudRoles/colors/rarity_0…4 与 line_0…；格子 / 行卡的稀有度边框、类别底色按物品数据取对应常量（StyleBoxFlat.border_color / bg_color 由脚本按 rarity 设）', level: 'builtin', done: true, params: ['col.rarityScale', 'col.rarityColors', 'col.lineColors'] });
  // 64：模板排位 v2
  const sc = r.str('cnt.screen', 'screen.hud'), tpl = sc !== 'screen.hud' || r.str('cnt.subtype', 'auto') !== 'auto';
  if (tpl) {
    const lk = ['lay.buttonRowAlign', 'lay.panelAlign', 'lay.panelOffset', 'lay.panelWidth', 'lay.panelHeight'].filter((k) => set(k) && !(k === 'lay.panelOffset' && !r.num(k, 0)));
    notes.push({ where: '模板排位', what: ['元素默认锚点 / 页头槽 / 数据区与容器让位', ...lk.map((k) => `${k} = ${r.str(k)}`), r.str('cnt.companion', 'none') === 'mascot' ? '陪衬立绘位' : ''].filter(Boolean).join('、'), how: '模板 = 面板根 VBox（页头 HBox / 主体 + 数据 HSplit / 按钮行 HBox）：只有一种画法、没人选锚点的元素用它自己的默认锚点（el.reward 居中、el.cta 下中、el.rank 右上……）；锚在上排、不比标题行高的元素放进页头 HBox 的左 / 右段（标题 Label 照写，放不下才隐藏标题）；没选锚点空间的元素压进数据区时，数据区容器从那一边收（offset），钉在屏幕上的元素（anchorSpace = screen）放在根 CanvasLayer、抽屉 / 全屏页 / 托盘的 offset 让开它们（HudLayout.gd 用探索台同一张占位表）；按钮行 = HBoxContainer.alignment（start / center / end；split = 返回钮与其余按钮之间一个 SIZE_EXPAND 的空 Control）；托盘 / 弹窗的横向位置与宽高 = 锚点预设 + offset（panelAlign / panelOffset）、custom_minimum_size（panelWidth / panelHeight）；陪衬立绘位 = 面板根 HBox 左侧一列 VBox（气泡 PanelContainer + TextureRect）', level: 'script', done: false, params: ['elx.screenAnchor', 'elx.anchorSpace', ...lk, 'cnt.companion'] });
  }
  // 65：HUD 排位残留
  const k65 = keys.filter((k) => /^(elx|el\.[a-zA-Z]+)\.(edgeBar|underlay)$/.test(k) && set(k)).concat(set('lay.hudEdgeSpan') && r.str('lay.hudEdgeSpan') !== 'full' ? ['lay.hudEdgeSpan'] : []);
  const rowBar = keys.some((k) => /\.stackDir$/.test(k) && r.str(k) === 'rowBar');
  if (k65.length || rowBar) notes.push({ where: 'HUD 排位', what: [...k65.map((k) => `${k} = ${r.str(k)}`), rowBar ? '共用底条按内容收格' : ''].filter(Boolean).join('、'), how: 'elx.edgeBar = exclude 的元素不放进贴边条 HBox、按锚点预设挂在根 Control 下（hud_sample.gd 已按同一份成员表搭）；hudEdgeSpan = content 时贴边条 PanelContainer 锚 PRESET_CENTER_TOP / BOTTOM（竖条 CENTER_LEFT / RIGHT）、按内容的最小尺寸收短（已搭）；elx.underlay = hide = 菜单打开时局内 HUD 那层里这个节点 visible = false；叙事内的立牌（MeshInstance3D + ViewportTexture）在同一挂点上往上叠（每块 position.y += 前一块高 × 1.08）；rowBar 的格 = HBox 里每格 SIZE_SHRINK_CENTER（竖向居中、宽按内容）', level: 'builtin', done: false, params: ['elx.edgeBar', 'lay.hudEdgeSpan', 'elx.underlay', 'elx.stackDir'] });
  // 66：地图视图
  if (r.str('cnt.dataShape', 'none') === 'spatial') {
    const k66 = ['vis.mapRevealRadius', 'col.fog', 'lay.panHint'].filter(set);
    const pinSil = r.str('cmp.node', 'pin') === 'pin' && r.has('vis.silhouette@node') && set('vis.silhouette@node');
    if (k66.length || pinSil || r.str('vis.mapUnexplored', 'fog') !== 'reveal') notes.push({ where: '地图揭雾与节点', what: [`未探索 ${r.str('vis.mapUnexplored', 'fog')}`, ...k66.map((k) => `${k} = ${r.str(k)}`), pinSil ? `图钉外形 ${r.str('vis.silhouette@node')}` : ''].filter(Boolean).join('、'), how: '揭雾遮罩 = 一张 Image（地图格大小）：已访问 / 当前节点各画一个半径 = mapRevealRadius × 短边的圆、相邻已访问节点之间画一条宽 0.9 × 半径的线，再交给地图 shader 按遮罩混雾色（col.fog 作 uniform）；遮罩下面的节点 visible = false（outlineOnly 时 modulate.a = 0.35）；图钉外形 = 节点子场景换成菱形 / 六边形 Polygon2D，当前节点用 HudRoles/colors/objective；地名牌 plaque = PanelContainer（面板 StyleBox / NinePatch 外框）+ Label；拖动提示 = 一个 Label（panHint = none 时不放）', level: 'shader', done: false, params: ['vis.mapUnexplored', 'vis.mapRevealRadius', 'col.fog', 'cmp.node', 'cmp.plate', 'lay.panHint'] });
  }
  void th;
}

/**
 * M12b 批次 B2 的迁移说明（结构化样本 / 按界面取词 / 富文本 / 标题与展示字体 / 字族）：只在这一屏用到时写。
 * 样本与示例文字不进主题：它们是游戏数据，迁移时换成自己的 Resource / 翻译表
 */
function m12bB2Notes(r: Resolved, th: Theme, notes: UiNote[], pk: ContentPack) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto'; };
  const on = (k: string) => set(k) && !['none', '0', 'false', ''].includes(r.str(k, 'none'));
  // 62：结构化样本
  const kind = sampleKind(r);
  if (kind !== 'items') notes.push({ where: '示例内容', what: `这一屏的样本类别 = ${kind}（内容包 ${pk.id} 的 screens.${kind}）`, how: '结构化样本是游戏数据：每类导出成一个 JSON / Resource（res://ui/samples/<类别>.json），模板场景按类别取——天赋 = [图标, 名字, 效果, 数值, 等级, 上限, 花费]、图鉴 = [图标, 名字, 记述, 进度]、名册 = [名字, 职业, [属性, 值]…, 武器]、地点 = [名字, 地区, 危险, 描述, 任务数, 动作]、配方 / 建造 = [图标, 名字, 说明, [材料, 现有, 需要]…]、经营 = 服务 [图标, 名字, 覆盖, 满意, 支出] + 税率（字段表见 src/hud/content/types.ts）；列表 = VBox / ItemList 里每条一个子场景，详情面板按选中那条填字。本包的 hud_sample.gd 只搭局内 HUD，模板屏未生成', level: 'script', done: false, params: ['cnt.screen', 'cnt.subtype'] });
  // 61：按界面取词
  const slots = (['prompts', 'buttons', 'cta', 'header', 'band', 'tabs', 'feed', 'rating'] as const).filter((k) => { const t = textPick(k, r, pk); return !!t && !t.legacy; });
  const k61 = ['el.cta.caption', 'el.subtitle.untranslated', 'cnt.textLength'].filter((k) => on(k) && (k !== 'cnt.textLength' || r.str(k) === 'word'));
  if (slots.length || k61.length) {
    const gs = [...screenGroups(r)], sub = r.str('cnt.subtype', 'auto');
    const key = `${gs[0]}.${sub !== 'auto' ? sub : 'default'}.${slots[0] ?? 'cta'}`;
    notes.push({ where: '示例文字', what: [`界面组 ${gs.join(' + ')}${sub !== 'auto' ? ` · 子功能 ${sub}` : ''}`, slots.length ? `按这一屏取的槽位：${slots.join('、')}` : '', ...k61.map((k) => `${k} = ${r.str(k)}`)].filter(Boolean).join('；'), how: `同一个槽位在不同界面写不同的字（菜单页的按键图例写「确定 / 返回」、结算屏的主按钮写「继续」、布阵写「开始作战」）：翻译表（CSV 或 .po）的键名按 <界面组>.<子功能>.<槽位>（例：${key}），控件 text = tr(键名)，不要让各屏共用一条局内的字；主按钮字（el.cta.caption）= Button.text 的词条；cnt.textLength = word 时字幕 Label 只写一个感叹词、不写说话人；el.subtitle.untranslated = 字幕写外语原文（original），译文放 tooltip_text 或下面一行。hud_sample.gd 里的按键图例、主按钮、字幕已按这一屏取`, level: 'builtin', done: true, params: ['cnt.screen', 'cnt.subtype', 'cnt.stage', 'cnt.tone', ...k61] });
  }
  // 57：富文本
  // 旧皮肤只认皮肤之后的层（与画布的 richStyle / drawRich 同口径，中期审查修复 ㉓）
  const rOn = (k: string) => !th.legacy || afterSkin(r, k);
  const map = rOn('hier.inlineMap') ? r.list('hier.inlineMap').filter((x) => x !== 'auto' && x !== 'none') : [];
  const k57 = ['hier.kicker', 'hier.callout', 'typ.dropCap', 'el.choices.labelStyle'].filter((k) => on(k) && r.str(k) !== 'plain');
  if (map.length || k57.length || on('hier.redactRatio')) {
    const hex = (c: string) => { const [cr, cg, cb] = parseColor(resolveColor(c, th.pal)); return '#' + [cr, cg, cb].map((x) => Math.round(x).toString(16).padStart(2, '0')).join(''); };
    const lt = lineTable(r, th);
    const colors: Parameters<typeof richBBCode>[1] = {};
    if (map.includes('keyword')) colors.keyword = hex('@accent');
    if (map.includes('buff')) colors.buff = hex(th.roles.good);
    if (map.includes('debuff')) colors.debuff = hex(th.roles.bad);
    if (map.includes('upgraded')) colors.upgraded = hex('@accent2');
    if (map.includes('note')) colors.note = hex(th.roles.muted);
    if (map.includes('redact')) colors.redact = hex(th.tokens.text);
    if (map.includes('category')) colors.category = (lt.length ? lt : CAT_DEFAULT).map(hex);
    const src = pk.screens.passage ?? pk.screens.talents?.[0]?.[2] ?? '';
    const il = rOn('hier.inline') ? r.str('hier.inline', 'none') : 'none';
    const bbo = { kicker: rOn('hier.kicker') && r.str('hier.kicker', 'none') === 'smallCapsRule', callout: rOn('hier.callout') && r.str('hier.callout', 'none') === 'centredLine', inline: il === 'auto' ? 'none' : il, accent: hex('@accent'), bad: hex(th.roles.bad) };
    const bb = src ? richBBCode(src.split('\n')[0], colors, bbo) : '';
    notes.push({ where: '富文本', what: [map.length ? `行内着色 ${map.join(' / ')}` : '', on('hier.redactRatio') ? `自动涂黑 ${Math.round(r.num('hier.redactRatio', 0) * 100)}%` : '', ...k57.map((k) => `${k} = ${r.str(k)}`)].filter(Boolean).join('、'), how: `内容串里的小标记（{k:词} 关键词、{b:} 增益、{d:} 减益、{u:} 升级值、{c1:}…{c5:} 类别、[[注释]]、{x:} 涂黑）转成 RichTextLabel（bbcode_enabled = true）的 BBCode：src/hud/richText.ts 的 richBBCode 与画布同口径（没开的类不着色），例：${bb ? '`' + bb.slice(0, 160) + '`' : '（本包无示例段落）'}；涂黑 = [fgcolor=正文色]…[/fgcolor]（Godot 4 内置的前景色块），按比例自动涂黑在写进 RichTextLabel 之前由脚本按同一种子挑词；引子（§）= [font_size] 小号类别字 + 下面一条 HSeparator，决断句（»）= [center]；首字下沉 = 首字单独一个 Label（font_size ≈ 正文 × 2.6），正文 RichTextLabel 前两行用 [indent] 让出位置（Godot 没有文字绕排）；选项的方括号标签（bracketTag）= Button 里放一个 RichTextLabel（mouse_filter = IGNORE），标签段 [color=强调色]`, level: 'script', done: false, params: ['hier.inlineMap', 'hier.inline', 'hier.redactRatio', ...k57] });
  }
  // 55：标题与展示字体
  const k55 = ['typ.display.scope', 'typ.display.secondary', 'typ.script', 'el.title.size', 'el.title.fit', 'el.title.bleed', 'el.choices.align'].filter((k) => (k === 'typ.display.scope' ? set(k) && r.list(k).length > 0 : on(k)));
  const alignK = r.keys().filter((k) => /^typ\.align(@|$)/.test(k) && on(k));
  if (k55.length || alignK.length) notes.push({ where: '标题与展示字体', what: [...k55, ...alignK].map((k) => `${k} = ${k === 'typ.display.scope' ? r.list(k).join(' + ') : r.str(k)}`).join('、'), how: '展示字体作用范围 = 每个角色一个 theme type variation（HudTitle / HudName 已按范围导出；菜单项 HudMenuItem、数字 HudNumber、按钮 Button 要在主题里另加，font 指向展示字体的 FontVariation）；副标题（latinCaps）= 第二个 Label（LabelSettings.font_size = 主标题 × secondaryScale，FontVariation.spacing_glyph = 字号 × secondaryTracking，text 转大写）；cjkVertical / 竖排标题 = Label 没有竖排属性：每字之间插换行的 Label（autowrap 关），或 _draw() 里用 TextServer.shaped_text_set_orientation(ORIENTATION_VERTICAL)；el.title.size = 标题 font_size ≈ 屏高 × size%；fit = width：脚本按 Label 宽用 Font.get_string_size 反算 font_size；bleed = 标题超出屏边：父 Control.clip_contents = true、Label 的 position 取负；typ.align（@title / @body）= Label / RichTextLabel.horizontal_alignment（justify = HORIZONTAL_ALIGNMENT_FILL）；typ.script = cjk / mixed：中文字号已按 +2 px@1080p 写进 default_font_size（换语言时按 TranslationServer.get_locale() 切）；选项对齐 = Button.alignment', level: 'script', done: false, params: [...new Set([...k55, ...alignK.map((k) => k.split('@')[0])])] });
  // 54：字族（没有字体文件的角色明确落到 fallback）
  const famK = r.keys().filter((k) => /^typ\.(body|display)\.family(@|$)/.test(k) && set(k));
  const alias = famK.map((k) => ({ k, v: r.str(k) })).filter(({ v }) => !!FONT_ROLES[v] && (!roleHasFont(v) || (!!FONT_ROLES[v].cjk && !HAVE_FAMILY.has(FONT_ROLES[v].cjk!))));
  if (alias.length) notes.push({ where: '字族', what: alias.map(({ k, v }) => `${k} = ${v}（${roleHasFont(v) ? `中文落到 ${FONT_ROLES[FONT_ROLES[v].fallback ?? 'sans']?.label ?? 'sans'}` : `现在用 ${FONT_ROLES[roleResolved(v)]?.label ?? roleResolved(v)}`}）`).join('、'), how: '这个字族还没有字体文件：本包的 FontVariation 已按回落的字族取文件（与画布一致，不写不存在的字体名）。补字体：把 OFL 字体放进 qa/fonts-src/、在 src/hud/fontList.ts 的 HUD_FONT_FILES 加一行（family 写 FONT_ROLES 里的名字）、重跑 scripts/fonts-subset.ts，再导出一次；Godot 里 = 新的 FontFile，中文字体挂在 FontFile.fallbacks（字体来源见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」）', level: 'texture', done: false, params: [...new Set(famK.map((k) => k.split('@')[0]))] });
  // 54：中文是展示字表的字族（漫画手写 = 站酷快乐体、窄体 = 得意黑）：展示角色的 FontFile.fallbacks 先挂展示字表、再挂思源黑体；正文选它时中文直接落到思源黑体
  const dispK = famK.map((k) => ({ k, v: r.str(k) })).filter(({ v }) => !!FONT_ROLES[v] && roleHasFont(v) && roleCjkDisplayOnly(v));
  if (dispK.length) notes.push({ where: '字族', what: dispK.map(({ k, v }) => `${k} = ${v}（${k.startsWith('typ.display') ? `展示：${FONT_ROLES[v].label}` : '正文：中文按思源黑体，展示字表只给展示字体'}）`).join('、'), how: '展示字体（HudTitle / HudName 及按 typ.display.scope 借展示字体的类型变体）= 拉丁 FontFile + fallbacks [中文展示字表子集, 思源黑体子集]：展示字表只收展示角色画到的字（src/assets/fonts/display-charset.txt，scripts/display-chars.ts 扫出来），字表外的字落到思源黑体；正文（Label）的字体栈不挂展示字表，中文直接是思源黑体。正式项目换完整字体时，把 fallbacks 里的子集换成原字体的 FontFile 即可', level: 'builtin', done: true, params: [...new Set(dispK.map(({ k }) => k.split('@')[0]))] });
  // 62 的元素数据源：技能栏放物品、选中面板写目标档案
  const kData = ['el.abilities.slotContent', 'el.selection.subject'].filter((k) => on(k));
  if (kData.length) notes.push({ where: '元素数据源', what: kData.map((k) => `${k} = ${r.str(k)}`).join('、'), how: 'slotContent = items：技能栏格子的数据源换成快捷物品（[图标, 名字, 数量]），格子 TextureRect 的纹理 = 物品图标（AtlasTexture），右下数量 Label；selection.subject = target：同一个选中面板场景，数据源换成目标档案（名字、等级、危险度、属性行、弱点）的 Resource', level: 'builtin', done: false, params: kData });
}

/** 面板表面着色器的参数（M12b-41 / 42 / 52）：图案只认有序抖动 / 双色网屏（其余图案是平铺纹理，见迁移说明），表面处理四种，渐隐六个方向；都没有时 null */
function surfaceOf(s: BoxStyle, pal: SkinPalette): { overlay?: { pattern: number; matrix: number; level: number; cell: number; ink: string; ink2: string; finish: number; area: number; header: number; edges: number }; fade?: { dir: number; len: number } } | null {
  const ov = s.overlay, pat = ov?.kind === 'dither' ? 1 : ov?.kind === 'halftoneDuo' ? 2 : 0, fin = ['none', 'foil', 'holo', 'polychrome', 'glass'].indexOf(s.finish ?? 'none');
  const fd = s.fade ? ['', 'left', 'right', 'both', 'top', 'bottom', 'vertical'].indexOf(s.fade.dir) : 0;
  if (!pat && fin <= 0 && fd <= 0) return null;
  return {
    ...(pat || fin > 0 ? { overlay: { pattern: pat, matrix: ov?.matrix === 'bayer8' ? 8 : 4, level: ov?.opacity ?? 0.3, cell: Math.max(1, (ov?.cell ?? 1) * 2), ink: gColor(resolveColor(ov?.colors?.[0] ?? ov?.color ?? '#000', pal), pal), ink2: gColor(resolveColor(ov?.colors?.[1] ?? ov?.color ?? '#000', pal), pal), finish: Math.max(0, fin) , area: pat ? Math.max(0, ['panel', 'header', 'edgeStrip', 'shadowOnly'].indexOf(ov?.area ?? 'panel')) : 0, header: ov?.header ?? -1, edges: [...(ov?.edges ?? 'trbl')].reduce((m, ch) => m | ({ t: 1, b: 2, l: 4, r: 8 }[ch] ?? 0), 0) } } : {}),
    ...(fd > 0 ? { fade: { dir: fd, len: s.fade!.len } } : {}),
  };
}
/** 面板表面（canvas_item）：pattern 1 = 有序抖动（bayer4 / bayer8，与画面后处理 postGlsl.ts 同一公式）、2 = 双色网屏（≈14° / 76°）；finish 1 箔 / 2 镭射 / 3 多彩 / 4 玻璃 */
const SURFACE_SHADER = `shader_type canvas_item;
// 游戏美术风格探索台导出：面板表面覆盖层（图案 / 表面处理）。挂在面板第一个子节点的 ColorRect 上（画在面板底之上、内容之下）
uniform int pattern = 0;
uniform int matrix_size = 4;
uniform float level = 0.3;
uniform float cell = 2.0;
uniform vec4 ink : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 ink2 : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform int finish = 0;
// 图案作用区（vis.patternArea，中期审查修复 ⑭）：0 整块 / 1 标题带（header_px 高，负数 = 盒高 18%、16–44 px）/ 2 沿边 6% 带（edges 位掩码：1 上 2 下 4 左 8 右）/ 3 下方与右侧 40% 的 L 形四层叠深
uniform int area = 0;
uniform float header_px = -1.0;
uniform int edges = 15;
uniform vec2 size = vec2(100.0, 40.0);

float bayer2(vec2 p) { p = mod(floor(p), 2.0); return (p.x * 2.0 + p.y * 3.0 - 4.0 * p.x * p.y) / 4.0; }
float bayer4(vec2 p) { return bayer2(p * 0.5) * 0.25 + bayer2(p); }
float bayer8(vec2 p) { return bayer4(p * 0.5) * 0.25 + bayer2(p); }
float screen_dot(vec2 p, float ang, float pitch, float r) {
\tvec2 q = mat2(vec2(cos(ang), sin(ang)), vec2(-sin(ang), cos(ang))) * p / pitch;
\treturn step(length(fract(q) - 0.5), r);
}
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }

// 这个像素在作用区里的强度倍数（0 = 区外）；shadowOnly 返回叠到第几层（1–4）/ 4
float area_k(vec2 uv) {
\tif (area == 1) { float hh = header_px >= 0.0 ? header_px : clamp(size.y * 0.18, 16.0, 44.0); return uv.y * size.y < min(size.y, hh) ? 1.0 : 0.0; }
\tif (area == 2) {
\t\tfloat tv = max(3.0, size.y * 0.06), th = max(3.0, size.x * 0.06), x = uv.x * size.x, y = uv.y * size.y;
\t\tbool on = ((edges & 1) != 0 && y < tv) || ((edges & 2) != 0 && y > size.y - tv) || ((edges & 4) != 0 && x < th) || ((edges & 8) != 0 && x > size.x - th);
\t\treturn on ? 1.0 : 0.0;
\t}
\tif (area == 3) { float m = max(uv.x, uv.y); return clamp(floor((m - 0.6) / 0.1) + 1.0, 0.0, 4.0) / 4.0; }
\treturn 1.0;
}

void fragment() {
\tvec2 px = FRAGCOORD.xy;
\tvec4 c = vec4(0.0);
\tfloat ak = area_k(UV);
\t// shadowOnly：抖动按层降覆盖率（level × 层数 / 4），网屏按层叠的透明度（1 − (1 − a)^层数，a = 每层的透明度）
\tfloat lv = area == 3 ? (pattern == 1 ? level * ak : 1.0 - pow(1.0 - (1.0 - pow(1.0 - level, 0.25)), ak * 4.0)) : level * ak;
\tif (pattern == 1) {
\t\tfloat b = matrix_size == 8 ? bayer8(px / cell) : bayer4(px / cell);
\t\tif (b < lv && ak > 0.0) { c = ink; }
\t} else if (pattern == 2) {
\t\tfloat a = screen_dot(px, radians(14.0), 12.0, 0.32);
\t\tfloat d = screen_dot(px, radians(76.0), 12.0, 0.25) * (1.0 - a);
\t\tc = vec4(ink.rgb * a + ink2.rgb * d, lv * max(a, d));
\t}
\tvec4 f = vec4(0.0);
\tfloat t = UV.x * 0.7 + UV.y * 0.5;
\tif (finish == 1) { f = vec4(mix(vec3(0.79, 0.64, 0.29), vec3(1.0), 0.5 + 0.5 * sin(t * 9.0)), 0.32); }
\telse if (finish == 2) { f = vec4(hue(fract(t)), 0.26); }
\telse if (finish == 3) { f = vec4(hue(fract(length(UV - vec2(0.3)))), 0.3); }
\telse if (finish == 4) { f = vec4(vec3(1.0), 0.28 * smoothstep(0.42, 0.5, fract(t)) * (1.0 - smoothstep(0.5, 0.62, fract(t))) + 0.08); }
\tCOLOR = vec4(mix(c.rgb, f.rgb, f.a), max(c.a, f.a));
}
`;
/** 面板渐隐（canvas_item，挂在 PanelContainer.material 上：面板自己的 StyleBox 按本地坐标乘 alpha，子节点不继承）。dir 1 左 / 2 右 / 3 两端 / 4 上 / 5 下 / 6 上下 */
const FADE_SHADER = `shader_type canvas_item;
// 游戏美术风格探索台导出：面板渐隐（vis.fade）。size 由脚本在 resized 时更新
uniform int dir = 3;
uniform float fade_len = 0.25;
uniform vec2 size = vec2(100.0, 40.0);
varying vec2 local_pos;

void vertex() { local_pos = VERTEX; }

void fragment() {
\tvec2 t = local_pos / max(size, vec2(1.0));
\tfloat L = max(fade_len, 0.001);
\tfloat a = 1.0;
\tif (dir == 1 || dir == 3) { a *= clamp(t.x / L, 0.0, 1.0); }
\tif (dir == 2 || dir == 3) { a *= clamp((1.0 - t.x) / L, 0.0, 1.0); }
\tif (dir == 4 || dir == 6) { a *= clamp(t.y / L, 0.0, 1.0); }
\tif (dir == 5 || dir == 6) { a *= clamp((1.0 - t.y) / L, 0.0, 1.0); }
\tCOLOR.a *= a;
}
`;

/**
 * M12b B3 的迁移说明（外形库 / 生成轮廓 / 描边 / 分层立体 / 填充 / 图案 / 材质 / 微字饰件）：盒子级的做法在 styleBox() 的说明里（每个用到的盒子一行），
 * 这里只写参数级的（按目标的面板外形、凹槽分组、方向性暗罩与雾带、双色网点背景、微字饰件、屏幕边的数据噪声）
 */
function m12bB3Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto'; };
  const keys = r.keys();
  const shapeK = keys.filter((k) => /^vis\.(panelShape|cornerMask|shapeJitter|brushDryness|brushDir|brushTip|edgeSides)(@|$)/.test(k) && set(k));
  if (shapeK.length) notes.push({ where: '面板外形', what: shapeK.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '多边形面板 = 面板 Control 的 _draw()（paint.ts shapePoints 的点列移植成 GDScript，随机外形用同一个种子），或预烘成 StyleBoxTexture；按目标（@dialog / @el.x）= 那类面板单独一个脚本 / 纹理；分角圆角 / 切角是 StyleBoxFlat 内置（已导出）', level: 'script', done: false, params: ['vis.panelShape', 'vis.cornerMask', 'vis.shapeJitter', 'vis.brushDryness', 'vis.brushDir', 'vis.brushTip', 'vis.edgeSides'] });
  if (r.str('lay.grouping', '') === 'wells' && set('lay.grouping')) notes.push({ where: '凹槽分组', what: 'lay.grouping = wells', how: '网格 / 列表外面包一个 PanelContainer（theme_type_variation = HudWell，主题里已导出），格子放进去', level: 'builtin', done: true, params: ['lay.grouping', 'vis.depth'] });
  const tones = r.list('rel.sceneTone');
  const k41 = ['rel.dimColor', 'rel.toneDir', 'rel.fogBand'].filter(set);
  if (tones.includes('directional') || tones.includes('halftone') || k41.length) notes.push({ where: '背后的暗罩', what: [tones.includes('directional') ? '方向性暗罩' : '', tones.includes('halftone') ? '双色网点' : '', ...k41.map((k) => `${k} = ${r.str(k)}`)].filter(Boolean).join('、'), how: '全屏 ColorRect：暗罩色 = rel.dimColor（color.a = 压暗）；方向性暗罩 = TextureRect + GradientTexture2D（fill_from / fill_to 按 rel.toneDir，around = 径向）；雾带 = 底部一条竖向 alpha 渐变的 TextureRect；双色网点 = 全屏 ColorRect + ui_surface.gdshader（pattern = 2）', level: 'builtin', done: false, params: ['rel.sceneTone', 'rel.dimColor', 'rel.toneDir', 'rel.fogBand'] });
  const orn = r.list('ast.ornaments').filter((x) => ['microText', 'rulerRail', 'registration'].includes(x));
  const noiseEdges = r.str('vis.noiseEdges', 'false') === 'true' && set('vis.noiseEdges');
  if (orn.length || noiseEdges) notes.push({ where: '功能性微字饰件', what: [...orn, noiseEdges ? '屏幕边数据噪声' : '', set('vis.noiseDensity') ? `密度 ${r.str('vis.noiseDensity')}` : ''].filter(Boolean).join('、'), how: '数据噪声 = 面板四角几个小字 Label（窄体、font_size ≈ 11 px@1080p、HudMutedLabel 颜色）+ 条码 TextureRect，生成场景时按密度决定个数；刻度侧轨 = 沿边的 NinePatchRect / TextureRect（竖向平铺的刻度纹理，数字烘进纹理），面板 content_margin 留出轨宽；套准十字 = 四角各一个 TextureRect；屏幕边的噪声块 = HUD 根节点下贴边的小字组，HudLayout.gd 按占位表跳过被元素占的位置', level: 'script', done: false, params: ['ast.ornaments', 'vis.noiseDensity', 'vis.noiseEdges'] });
  void th;
}

/**
 * M12b B4 风格图元 II 的迁移说明（卷草、母题、分隔线、饰件挂点、花饰标牌、外框结构、标题带）：只在用到时写，都是做法说明（done = false：B4 的画法都要纹理 / 脚本，
 * 本包没有直接导出成节点）；导出了的只有主题里的饰色 / 宝石色常量（HudRoles/colors/ornament、gem）、外框中段的九宫格纹理（见「外框」行）
 */
function m12bB4Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto'; };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  // M12b-44 卷草：母题 / 尖顶饰 / 粗细调制
  const scrollK = anyKey(/^vis\.motif(@|$)/).filter((k) => ['baroque', 'ironScroll', 'wroughtIron'].includes(r.str(k, '')));
  const finials = r.list('ast.ornaments').includes('finials'), modK = anyKey(/^vis\.strokeModulation(@|$)/);
  if (scrollK.length || finials || modK.length) notes.push({ where: '卷草花饰', what: [...scrollK.map((k) => `${k} = ${r.str(k)}`), finials ? '尖顶饰 finials' : '', ...modK.map((k) => `${k} = ${r.str(k)}`)].filter(Boolean).join('、'), how: '卷须 = ornament.ts scroll() 的带状多边形（沿贝塞尔采样、按两端细中段胖的宽度沿法线偏移、涡卷 / 刺 / 叶端头）：用同一段代码把四个角件 / 母题符号 / 尖顶饰预渲染成 PNG 图集（按饰色 modulate 着色，角件用 flip_h / flip_v 镜像），挂在面板四角 / 边中点的 TextureRect；或把点列生成器移植成 GDScript 在 _draw() 里 draw_polygon。膨线描边（vis.strokeModulation）= 四条边各一个 Polygon2D / 预烘纹理，StyleBoxFlat 做不出粗细变化', level: 'script', done: false, params: ['vis.motif', 'ast.ornaments', 'vis.strokeModulation'] });
  // M12b-43 母题库：新母题 / 第二母题 / 标题前缀
  const NEW_M = ['sigil', 'lightning', 'notes', 'chevrons', 'atom', 'starburst', 'interlace', 'greekKey', 'kamon', 'hexWarn', 'wedge'];
  const motifK = anyKey(/^vis\.motif(@|$)/).filter((k) => NEW_M.includes(r.str(k, ''))), m2K = anyKey(/^vis\.motif2(@|$)/), preK = anyKey(/^typ\.titlePrefix(@|$)/).filter((k) => r.str(k, '') !== 'none');
  if (motifK.length || m2K.length) notes.push({ where: '母题', what: [...motifK, ...m2K].map((k) => `${k} = ${r.str(k)}`).join('、'), how: '母题符号 = ornament.ts glyph() 的单色矢量：导出成一张母题图集（白色 PNG / SVG，按饰色 modulate），角件 / 分隔线中间 / 端头 / 水印的 TextureRect 取对应 region；第二母题（vis.motif2）只换分隔线与端头那几枚；ast.watermark = sigil 时水印用同一张图放大', level: 'texture', done: false, params: ['vis.motif', 'vis.motif2', 'ast.watermark'] });
  if (preK.length) notes.push({ where: '标题前缀', what: preK.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '「> 」「>> 」= 标题 Label 文字前缀（或 RichTextLabel 里 [color=强调色]>[/color]）；圆点 / 母题符号 = 标题 HBoxContainer 最前面一个 TextureRect', level: 'builtin', done: false, params: ['typ.titlePrefix'] });
  // M12b-45 分隔线库：线型 / 位置
  const divK = [...anyKey(/^vis[.]dividerStyle(@|$)/).filter((k) => !['plain', 'glyph'].includes(r.str(k, ''))), ...anyKey(/^vis[.]dividerPlace(@|$)/)];
  if (divK.length) notes.push({ where: '分隔线', what: divK.map((k) => `${k} = ${r.list(k).join(' / ')}`).join('、'), how: '分隔线 = HSeparator：双线 / 渐隐用 StyleBoxLine（thickness + grow_begin / grow_end，渐隐配 GradientTexture2D）；牛津线 / 膨线 / 点线 = TextureRect（ornament.ts divider() 预渲染的横条纹理，stretch_mode = 平铺或拉伸）。位置：页头 HBox 之后、主体 / 数据 / 详情各块之间、正文段落之间（VBoxContainer 里插 HSeparator）、网格每行之后（GridContainer 换成 VBox 包行 HBox）', level: 'texture', done: false, params: ['vis.dividerStyle', 'vis.dividerPlace'] });
  // M12b-49 饰件挂点：饰色 / 宝石色、挂点、出框、端头形、耳标、四角花焦点、墨团 / 胶带 / 封印条
  const k49 = [...anyKey(/^col[.](ornament|gem)(@|$)/), ...anyKey(/^ast[.](ornamentAnchor|ornamentOverhang|endcapShape|earTabAt)(@|$)/).filter((k) => r.str(k, '') !== 'none')];
  const p49 = r.list('ast.ornaments').filter((x) => ['inkBacking', 'tape', 'sealStrip'].includes(x)), cf = r.list('ix.focus').includes('cornerFlourish') && set('ix.focus');
  if (k49.length || p49.length || cf) notes.push({ where: '饰件挂点', what: [...k49.map((k) => `${k} = ${r.list(k).join(' / ')}`), ...p49, cf ? 'ix.focus = cornerFlourish' : ''].filter(Boolean).join('、'), how: '饰色 / 宝石色 = 饰件纹理的 modulate（主题已导出 HudRoles/colors/ornament、gem 两个颜色常量，选过 col.ornament / col.gem 时才有）；元素两端 / 条两端 / 名牌旁 / 按钮端 = 脚本按挂点定位的子 TextureRect（端头纹理按 ast.endcapShape 一形一张）；出框 = 角件负 offset；耳标 = 面板子节点 PanelContainer（负 offset 骑边）：左上 = 图标小签（TextureRect / Label）、右上 = 拨杆（CheckButton）、右边 = ✕（Button）；四角花焦点 = 焦点 StyleBox 换成四个角件 NinePatch + 背后一张径向渐变 TextureRect（focus 颜色）；墨团 / 胶带 / 封印条 = 预渲染纹理', level: 'script', done: false, params: ['col.ornament', 'col.gem', 'ast.ornamentAnchor', 'ast.ornamentOverhang', 'ast.endcapShape', 'ast.earTabAt', 'ix.focus', 'ast.ornaments'] });
  // M12b-46 花饰标题牌
  const k46 = anyKey(/^cmp[.]plate(@|$)/).filter((k) => ['flourish', 'flankLines', 'bracketFrame'].includes(r.str(k, ''))), area = r.str('el.title.form', '') === 'areaCard';
  if (k46.length || area) notes.push({ where: '花饰标题牌', what: [...k46.map((k) => `${k} = ${r.str(k)}`), area ? `区域标题卡（${r.str('el.title.visit', 'first')}）` : ''].filter(Boolean).join('、'), how: '标题 = HBoxContainer：两侧花线 = 左右各一个 TextureRect（细线 + 端头符号的纹理，stretch 横向）、Label 在中间；对称花饰 = Label 下面压一张花饰纹理（ornament.ts flourish 预渲染，按饰色 modulate）；括号框 = 左右两张括号纹理（NinePatchRect 竖向拉伸）夹住标题 + 副题的 VBox；区域标题卡 = VBox（小字 Label / 大字 Label / 花饰 TextureRect），再访 = 另一个只有小字的场景变体', level: 'texture', done: false, params: ['cmp.plate', 'el.title.form', 'el.title.visit', 'lay.titleSubtitle'] });
  // M12b-50 外框结构
  const k50 = [...anyKey(/^ast[.]frame(@|$)/).filter((k) => ['ring', 'gear', 'crowned', 'illustratedFrame', 'threePart'].includes(r.str(k, ''))), ...anyKey(/^ast[.]frameThickness(@|$)/), ...anyKey(/^lay[.]navRail$/).filter((k) => r.str(k, '') !== 'none'), ...keys.filter((k) => /^el[x]?\.[a-zA-Z.]*frame$/.test(k) && !k.startsWith('ast.') && set(k) && ['panel', 'tray'].includes(r.str(k, '')))];
  if (k50.length) notes.push({ where: '外框结构', what: k50.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '环带 / 齿轮表圈 = 圆钮外面一个 TextureRect（frame.ts drawRing 预渲染的环 / 齿轮纹理，按材质出一张）或 _draw() 移植；顶冠框 / 三段式 = StyleBoxTexture 九宫格 + 顶边 / 底边正中各一个不拉伸的 TextureRect（顶冠、底坠）；整幅插画框 = TextureRect + MarginContainer（margin = 内窗）；框厚 = texture_margin / patch_margin 按 ast.frameThickness 缩放；元素套框（elx.frame）= 元素根节点外包一层 PanelContainer（StyleBoxTexture 九宫格，tray 再加材质底）；页签托槽 = TabBar 后面的 NinePatchRect（横）/ 弧形托槽纹理；插画图窗外框（ast.frame@panelArt）= 图窗 TextureRect 外包 NinePatchRect', level: 'texture', done: false, params: ['ast.frame', 'ast.frameThickness', 'elx.frame', 'lay.navRail'] });
  // 只画图标的圆钮（cmp.button@el.cta = icon，M12b-50，civ6#1）：图标跟内容包（B4 审查修复）
  const ctaIcon = anyKey(/^cmp[.]button@el[.]cta$/).filter((k) => r.str(k, '') === 'icon');
  if (ctaIcon.length) notes.push({ where: '只画图标的圆钮', what: ctaIcon.map((k) => `${k} = icon`).join('、'), how: '圆钮里的图标 = 内容包的 hud.cta.icon（按界面变体写，随待办切换；没写时 ▶）：Button.icon / TextureButton 的贴图由脚本按同一字段换', level: 'builtin', done: false, params: ['cmp.button', 'el.cta.form'] });
  // M12b-47 标题带与标牌几何
  const P47 = ['band', 'fadeBand', 'dragHandle', 'stripedFlank', 'bleedLabel', 'twoLine', 'cartouche', 'stele', 'scrollHead', 'sideTab', 'cloudPlate', 'crest', 'fan'];
  const k47 = [...anyKey(/^cmp[.]plate(@|$)/).filter((k) => P47.includes(r.str(k, ''))), ...anyKey(/^cmp[.]plate(Ends|Bleed)(@|$)/).filter((k) => !['both', 'false'].includes(r.str(k, ''))), ...anyKey(/^lay[.]headerIcon$/).filter((k) => r.str(k, '') !== 'none'), ...anyKey(/^vis[.]silhouette(@|$)/).filter((k) => r.str(k, '') === 'edgeTab'), ...anyKey(/^vis[.]edge(@|$)/).filter((k) => r.str(k, '') === 'printWorn')];
  if (k47.length) notes.push({ where: '标题带与标牌', what: k47.map((k) => `${k} = ${r.str(k)}`).join('、'), how: '整宽标题带 = 页头 HBox 后面一块 PanelContainer（band = StyleBoxFlat 实色 / 渐变用 StyleBoxTexture + GradientTexture2D；fadeBand = GradientTexture2D 横向 alpha）；拖拽条 = 标题 Label 后接一个 size_flags_horizontal = EXPAND 的 TextureRect（三道横纹平铺），关闭钮放在同一个 HBox 末尾；斜纹侧翼 = 名牌两侧各一个平铺斜纹 TextureRect；出血标签 / cmp.plateBleed = 标牌节点负 offset 伸到视口边（或放进贴边的 CanvasLayer）；两行名牌 = VBox（名字 Label + 称号 Label，称号色 = accent2）；名字环 / 石碑 / 卷轴头 / 竖签 / 云牌 / 盾牌 / 扇环 = Polygon2D 或预渲染的 StyleBoxTexture；哪端斜切 = Polygon2D 的点；页头图标槽 = HBox 最前面的 TextureRect；贴边页签钮 = 单角切角的 StyleBoxFlat（corner_detail = 1、只给左上角 corner_radius）；印刷磨损 = 一层斑点遮罩 shader / 纹理', level: 'script', done: false, params: ['cmp.plate', 'cmp.plateEnds', 'cmp.plateBleed', 'lay.headerIcon', 'cmp.button', 'vis.edge'] });
  void th;
}

/**
 * M12b B5 数值图形与读数的迁移说明（数字字形、离散 / 仪表盘族、条的端头 / 外框 / 换色 / 附属件、计数读数、时钟日历、计量条与数据图、事件字效）：只在用到时写，
 * 都是做法说明（done = false：B5 的画法要自绘 Control / 纹理 / shader，本包没有直接导出成节点）
 */
function m12bB5Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  // 旧皮肤：皮肤之前的层（品类布局 / 皮肤预设）写的 B5 取值画布上冻结不画（skin.pixel 的数字字族、layout.survival 的温度计……），迁移说明也不列
  // （B5 审查修复 ⑤，与 b7Notes / compose/hud.ts 的 layoutEl 同口径）
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && r.str(k, 'auto') !== 'auto' && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  // M12b-07 数字字形
  const k07 = anyKey(/^typ[.](numerals[.](family|weight|style|digits|cells)|numberFormat)(@|$)/);
  if (k07.length) notes.push({ where: '数字字形（M12b-07）', what: k07.map((k) => `${k} = ${val(k)}`).join('、'), how: '数字 Label 的 LabelSettings / theme_type_variation（HudNumber）：display / pixel = 换 FontFile、字重 = FontVariation.variation_embolden 或换一档 FontFile、斜体 = variation_transform；tabular = opentype_features {"tnum": 1}、oldstyle = {"onum": 1}（字体要带这些特性：画布只是近似）；七段 = DSEG7（OFL，未下载）或自绘 Control 的 _draw()（paint.ts vectorGlyph 的段表移植）；点阵 / 单线笔画 = 自绘 Control（同一组点表）；里程表 / 逐位格 = HBoxContainer 里每位一个 PanelContainer（HudWell）+ Label，前导零 = 另一个 LabelSettings（col.muted 35%）；数字格式 = 一个 format_number(n, mode) 函数（K / M / B、万 / 亿）', level: 'script', done: false, params: ['typ.numerals.family', 'typ.numerals.weight', 'typ.numerals.digits', 'typ.numerals.cells', 'typ.numberFormat'] });
  // M12b-02 数值图形新画法
  const NEW_G = ['pips', 'diamondPips', 'heartsTyped', 'lightStrip', 'textBar', 'scaleBar', 'trigram', 'tachometer', 'arcDots', 'ecg', 'pressureTube', 'thermometer', 'eye', 'bipolar', 'track', 'lightUp'];
  const k02 = [...anyKey(/^cmp[.]gauge(@|$)/).filter((k) => NEW_G.includes(r.str(k, ''))), ...anyKey(/^cmp[.](gaugeUnits|gaugeUnitShape|gaugeDir|dialParts|gaugeIcon)(@|$)/), ...anyKey(/^el[.][a-zA-Z]+[.]valueLabelShow$/), ...anyKey(/^el[.]speed[.]showPlace$/)];
  if (k02.length) notes.push({ where: '数值图形（M12b-02）', what: k02.map((k) => `${k} = ${val(k)}`).join('、'), how: '离散单位族（独立小格 / 菱形点 / 类型心 / 灯段 / 字符条 / 比例尺 / 卦象）= HBox / VBox 里 N 个 TextureRect（每种单位形一张纹理，按值切换 texture / modulate），或一个自绘 Control 按 elements/gauges.ts 的同一套几何 _draw；灯段的光晕 = CanvasItemMaterial(blend_mode = ADD) 或 GradientTexture2D 径向光点；仪表族：转速表 = TextureProgressBar(FILL_CLOCKWISE, radial_initial_angle = 225, radial_fill_degrees = 270) + 刻度纹理 + 指针 Sprite2D（rotation 跟值）+ 中心 / 副读数两个 Label；环徽点亮（arcDots）= 墨环 TextureRect + 中心插画 TextureRect + 沿弧的 N 个 TextureRect（亮 = modulate 强调色）；点亮节点（lightUp）= HBox 里 N 个圆点 TextureRect（亮 = modulate 填充色 + 光晕纹理）；心电图 / 压力计 / 温度计 / 眼睛 = 自绘 Control（_draw）；双向条 = 两个 ProgressBar 背靠背（左边 fill_mode = END_TO_BEGIN）；悬停显示数值 = mouse_entered / exited 切 Label.visible；趋势箭头 = 数值 Label 后一个 ▲ / ▼ Label', level: 'script', done: false, params: ['cmp.gauge', 'cmp.gaugeUnits', 'cmp.gaugeUnitShape', 'cmp.gaugeDir', 'cmp.dialParts', 'cmp.gaugeIcon', 'elx.valueLabelShow', 'el.speed.showPlace'] });
  // M12b-03 端头 / 外框 / 换色 / 附属件 / 生命条附属与锁扣
  const k03 = [...anyKey(/^cmp[.](gaugeCap|gaugeCapSize|gaugeFrame|gaugeColorBy|gaugeLow|gaugeHigh|gaugeExtra)(@|$)/).filter((k) => !['none', 'fixed'].includes(r.str(k, ''))), ...anyKey(/^el[.]vitals[.](attach|lockup)$/).filter((k) => r.str(k, '') !== 'none'), ...(r.list('col.coding').includes('value') && (!th.legacy || afterSkin(r, 'col.coding')) ? ['col.coding'] : [])];
  if (k03.length) notes.push({ where: '数值条的端头 / 外框 / 换色 / 附属件', what: k03.map((k) => `${k} = ${val(k)}`).join('、'), how: '端头 = TextureProgressBar 两侧各一个 TextureRect 子节点（按端头形一张纹理，modulate = HudRoles/colors/ornament 或饰件色）；外框 = 外包一层 PanelContainer（StyleBoxFlat：hairline = border_width 1、double = 两层、plate = 深色 bg + expand_margin 3）；按数值换色 = 脚本里 value_changed 时按阈值（cmp.gaugeLow / High）切 tint_progress，或 Gradient.sample(value)，最低档闪烁 = Tween 循环 modulate.a；可回复段 = 叠在下面的第二个 TextureProgressBar（under 层，受击后 Tween 衰减到当前值）；格挡染色 = 整条 modulate 第二强调色 + 左端盾徽 TextureRect + Label；帽头 / 端徽 = 条前 PanelContainer + Label；状态行 = 条下 HBox（TextureRect + 层数 Label）；生命条附属件（死亡抗拒 / 充能圆点 / 等级方框 / 图标内写数 / 状态头像）= 生命条 HBox / VBox 的兄弟节点，状态头像 = AnimatedSprite2D 按血量档切帧；锁扣（badgeBar）= 一个自绘 Control（_draw 圆徽 + 斜切主条 + 副槽 + 粗描边）或九宫格纹理 + 两个 TextureProgressBar', level: 'script', done: false, params: ['cmp.gaugeCap', 'cmp.gaugeFrame', 'cmp.gaugeColorBy', 'cmp.gaugeExtra', 'el.vitals.attach', 'el.vitals.lockup', 'col.coding'] });
  // M12b-06 计数与读数
  const NEW_RES = ['framedCounter', 'odometer', 'iconNumberBar', 'labeledStrip', 'statGrid'], NEW_TIMER = ['turnDate', 'ringCounter', 'countdownStrip', 'scoreLabel', 'raceStack', 'timecode'], NEW_RANK = ['ordinal', 'letterDisc'];
  const k06 = [...anyKey(/^el[.]resources[.]form$/).filter((k) => NEW_RES.includes(r.str(k, ''))), ...anyKey(/^el[.]timer[.]form$/).filter((k) => NEW_TIMER.includes(r.str(k, ''))), ...anyKey(/^el[.]rank[.]form$/).filter((k) => r.list(k).some((x) => NEW_RANK.includes(x))), ...anyKey(/^el[.][a-zA-Z]+[.]valueLabelPos$/).filter((k) => r.str(k, '') === 'superscript'), ...anyKey(/^el[.]timer[.]caption$/)];
  if (k06.length) notes.push({ where: '计数与读数（M12b-06）', what: k06.map((k) => `${k} = ${val(k)}`).join('、'), how: '细框计数盒 = PanelContainer（StyleBoxFlat 两层细边）里 HBox（TextureRect + 右对齐 Label）；里程表 = PanelContainer 里一排逐位 Panel（HudWell）+ Label；图标数字 + 容量细条 = VBox（HBox + 高 2 的 ProgressBar）；暗底通栏 = 贴边 PanelContainer 里 HBox（标签 Label + 数值 Label）×N；统计格 = GridContainer（2 列）里 VBox（小标题 Label + HudWell 里的彩色大数字 Label）；上标增量 = RichTextLabel 的 [font_size] + 上移（或单独一个小 Label 偏移）；回合 + 纪年 + 时钟 = HBox 三个 Label + VSeparator；双环计数 = 自绘 Control 两个 draw_arc + 中心 Label（侧标签 = VBox Label + 斜纹 TextureRect）；倒计时条 = PanelContainer + RichTextLabel（数字放大）；标签 + 大分数 = VBox 两个 Label（斜体 = FontVariation.variation_transform）；比赛信息栈 = GridContainer（2 列：小标签、值）；时间码 = HBox（闪烁的红点 TextureRect + Label + 电池 TextureProgressBar）；序数名次 = HBox 三个 Label（大号、后缀、/总数）；字母盘 = TextureProgressBar(radial) + 齿轮盘 TextureRect + 弧形小字（Label 逐字旋转或预渲染）+ 大字母 Label', level: 'script', done: false, params: ['el.resources.form', 'el.timer.form', 'el.rank.form', 'elx.valueLabelPos', 'el.timer.caption'] });
  // M12b-08 时钟 / 日历
  const NEW_CLOCK = ['phaseDial', 'plaque', 'collage', 'dateStrip', 'timelineRuler', 'bigTemp'];
  const k08 = [...anyKey(/^el[.]clock[.]form$/).filter((k) => r.list(k).some((x) => NEW_CLOCK.includes(x))), ...anyKey(/^el[.]clock[.](rim|dayPart|duskPart)$/)];
  if (k08.length) notes.push({ where: '时钟 / 日历组合件（M12b-08）', what: k08.map((k) => `${k} = ${val(k)}`).join('、'), how: '每个子件一个 Control 场景，按元素拆开排位：昼夜分段盘 = 自绘 Control（draw_polygon 三段扇区 + 指针 draw_line，外圈锯齿 / 光芒 = 多边形）+ 描边 Label；复合挂牌 = PanelContainer（ast.frame 九宫格）里 HBox（日晷小盘 Control + VBox 两块 HudWell 小牌）；拼贴日历 = Control 里几个各自 rotation 的 Label / TextureRect（星芒 = Polygon2D）；日期带 = HBox 七个 PanelContainer（当天 scale 1.25、已过的叠一条划线 Line2D）；时间尺 = 自绘刻度 + 三角 / 雪花 TextureRect；温度透镜 = TextureRect（径向 GradientTexture2D）+ 细体 Label', level: 'script', done: false, params: ['el.clock.form', 'el.clock.rim', 'el.clock.dayPart', 'el.clock.duskPart'] });
  // M12b-27 计量条与数据图
  const NEW_METER = ['formula', 'demandBars', 'framedStrip', 'dangerDot'], NEW_VIZ = ['keyValue', 'inkNumber', 'lineChart', 'sparkline', 'stackedArea', 'network'];
  const k27 = [...anyKey(/^el[.]meter[.]form$/).filter((k) => NEW_METER.includes(r.str(k, ''))), ...anyKey(/^el[.]meter[.](leadRow|rowColors)$/), ...anyKey(/^st[.]statViz$/).filter((k) => NEW_VIZ.includes(r.str(k, '')))];
  if (k27.length) notes.push({ where: '计量条与数据图（M12b-27）', what: k27.map((k) => `${k} = ${val(k)}`).join('、'), how: '计分公式 = VBox（Label 牌型 + 等级）+ HBox（两个 PanelContainer 色块 + Label，中间 × Label）；需求竖条 = HBox 几个竖向 ProgressBar（fill_mode = BOTTOM_TO_TOP）+ 字母 Label；细框条 = PanelContainer（细边 StyleBoxFlat）里 HBox（图标、Label、分段 TextureProgressBar、读数 Label、Button flat）；危险度圆点 = TextureRect（modulate 按档）；首行加粗 = 第一个 ProgressBar 的 custom_minimum_size.y 加大；数据图 = 自绘 Control（_draw：折线 draw_polyline、面积 draw_colored_polygon、气泡 draw_circle），键值行 = VBox of HBox(Label, Label)，墨团数字 = 墨团纹理 TextureRect + 大号 Label + 菱形点 HBox', level: 'script', done: false, params: ['el.meter.form', 'el.meter.leadRow', 'el.meter.rowColors', 'st.statViz'] });
  // M12b-20 事件字效与新事件画法
  const NEW_FB = ['chainStack', 'dice'], NEW_NOTIFY = ['bareText', 'socialFeed', 'alertIcons', 'label', 'finisherCard'];
  const k20 = [...anyKey(/^el[.]feedback[.]form$/).filter((k) => r.list(k).some((x) => NEW_FB.includes(x))), ...anyKey(/^el[.]feedback[.](sfxSize|sfxFill|sfxBurst|sfxLetterTilt|count)$/), ...anyKey(/^typ[.](fillStyle|fillColors|shadowOffset)(@|$)/), ...anyKey(/^el[.]notify[.]form$/).filter((k) => r.list(k).some((x) => NEW_NOTIFY.includes(x))), ...anyKey(/^el[.]notify[.](maxItems|dwell)$/)];
  if (k20.length) notes.push({ where: '事件提示与字效（M12b-20）', what: k20.map((k) => `${k} = ${val(k)}`).join('、'), how: '字效 = Label + LabelSettings（outline / shadow 颜色与偏移）+ canvas_item shader（渐变 / 网点 / 金属填充）；逐字倾斜 = RichTextLabel 自定义 RichTextEffect（按字序号的哈希转角）；主角级拟声字 = 锚在视口中下的 Label（font_size 按视口宽算）+ 一到三层星爆 Polygon2D（R4 · C3：整屏叠加——不进世界挂点的推开 / 隐藏，节点排在其余 HUD 之前、垫在下面；布局脚本只把它当软占位）；技能链 = VBox 里一行一个 Label（Tween 存入时整串上飘）+ 总分 / 倍率 Label；骰子 = TextureRect（六面纹理）；无底大字 = Label + 硬阴影；社交气泡流 = VBox of PanelContainer（浅色 StyleBoxFlat）里 HBox（头像 TextureRect + VBox 名字 / 一句话）；警报图标列 = VBox of PanelContainer + TextureRect（AnimationPlayer 闪烁）；名签 = PanelContainer（细亮边）+ Label；收尾大卡 = 全屏 TextureRect（插画）+ 网点 shader + 主题边框九宫格 + 旋转的缎带标牌；条数上限 / 停留时长 = 通知队列脚本（max_items、Timer.wait_time）', level: 'script', done: false, params: ['el.feedback.form', 'el.feedback.sfxSize', 'el.feedback.sfxFill', 'el.feedback.sfxBurst', 'el.feedback.sfxLetterTilt', 'typ.fillStyle', 'typ.fillColors', 'typ.shadowOffset', 'el.notify.form', 'el.notify.maxItems', 'el.notify.dwell'] });
}

/**
 * M12b B6 HUD 组合的迁移说明（元素多实例、锁扣与停靠、队伍名册、目标追踪、世界标记、输入字形与光标、准星 / 交互 / 焦点小画法）：只在用到时写。
 * 停靠与元素宽高导出进 hud_sample.gd（LAYOUT 的尺寸、DOCKS + _dock_place：done），其余是做法说明（done = false）。旧皮肤：皮肤之前的层写的 B6 取值画布上不生效，这里也不列
 */
function m12bB6Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && !['auto', 'none', '', 'false'].includes(r.str(k, 'auto')) && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  const els = r.elements();
  // M12b-04 元素多实例
  const inst = els.filter((id) => id.includes('#')), k04 = [...anyKey(/^el[.](threat|party|selection|turnOrder)(#[23])?[.]count$/), ...anyKey(/^el[.][a-zA-Z]+(#[23])?[.](instanceLayout|stackReveal|activeEmphasis)$/)];
  if (inst.length || k04.length) notes.push({ where: '元素多实例', what: [...inst.map((id) => `实例 ${id}`), ...k04.map((k) => `${k} = ${val(k)}`)].join('、'), how: '同一个元素子场景实例化几份（节点名按实例 id：Hud_el_party_2，类型变体 Hud_el_party_2——只有实例自己写了 @el.party#2 才单独出，变体里已合进第一份的 @el.party；没有时用 Hud_el_party，与画布的目标链 [el.party#2, el.party] 一致），各自的锚点 preset / 参数；Boss 条并排 = HBox 里 N 个 Boss 条子场景（每条宽 = 视口宽 × 0.2）；错位叠放 = 自定义 Container 的 _notification(NOTIFICATION_SORT_CHILDREN) 按露出量 fit_child_in_rect（后加的在上面）；当前项强调 = 当前子节点 custom_minimum_size × 1.2（或 scale + pivot）、抬起 = position.y 减；perAttach（每个实例挂一个世界点）还没做', level: 'script', done: inst.length > 0 && !k04.length, params: ['cnt.elements', 'elx.count', 'elx.instanceLayout', 'elx.stackReveal', 'elx.activeEmphasis'] });
  // M12b-05 锁扣
  const k05d = anyKey(/^el[.][a-zA-Z]+(#[23])?[.]dock(To|Side|Gap|Align|Slot)$/), k05g = anyKey(/^el[.][a-zA-Z]+(#[23])?[.](group|groupFrame|groupConnector)$/), k05s = anyKey(/^el[.][a-zA-Z]+(#[23])?[.]satellite(s|Side|Count|Overhang)$/), k05w = anyKey(/^el[.][a-zA-Z]+(#[23])?[.](width|height)$/);
  if (k05d.length || k05w.length) notes.push({ where: '停靠与元素宽高', what: [...k05d, ...k05w].map((k) => `${k} = ${val(k)}`).join('、'), how: '已导出：hud_sample.gd 的 LAYOUT 尺寸按 elx.width / height（custom_minimum_size）；DOCKS 里的停靠者不进锚点列，是 root 下的兄弟节点，宿主 item_rect_changed 时按 _dock_place（与画布 dockRect 同一组式子：边 / 间距 / 对齐 / 宿主第几格——第几格只对报了成员格的宿主算数，现在只有 el.party，其余导出 0）重放。画布上宿主按「宿主 + 停靠者」的外接框进锚点列、整组一起避让；Godot 里宿主照自己的尺寸进列（停靠者可能伸出锚点列，要整组一起排时把宿主与停靠者包进同一个 HBox / VBox）', level: 'script', done: true, params: ['elx.dockTo', 'elx.dockSide', 'elx.dockGap', 'elx.dockAlign', 'elx.dockSlot', 'elx.width', 'elx.height'] });
  if (k05g.length) notes.push({ where: '成组底板', what: k05g.map((k) => `${k} = ${val(k)}`).join('、'), how: '同组元素外包一个 PanelContainer（tray = 材质 StyleBoxTexture 托盘 + 外框九宫格画在组员后面；panel = 外框九宫格画在组员上面：Control 的 z_index + 1）；组员之间的花饰 = 预渲染的 flourish 纹理 TextureRect 插在相邻两块之间（竖排时旋转 90°）', level: 'texture', done: false, params: ['elx.group', 'elx.groupFrame', 'elx.groupConnector'] });
  if (k05s.length) notes.push({ where: '骑边小件', what: k05s.map((k) => `${k} = ${val(k)}`).join('、'), how: '宿主的子 Control、负 offset 出框（出框量 × 尺寸）：小圆钮 = HBox / VBox of Button（全圆角 StyleBoxFlat、图标 = 工具栏符号），徽章 = Panel + Label，小签 = PanelContainer + Label，拨杆 = CheckButton，提示条 = PanelContainer（HBox：按键 + Label）；clip_contents = false 让它们画在框外。已导出：伸出框外的量（与画布 satelliteReach 同一份）写进 LAYOUT / DOCKS 的留白列，hud_sample.gd 在元素外面套一层 MarginContainer（_pad），邻居与停靠者让出同样的地方（终期审查修复 ⑯ / ㉘）', level: 'builtin', done: false, params: ['elx.satellites', 'elx.satelliteSide', 'elx.satelliteCount', 'elx.satelliteOverhang'] });
  // M12b-18 队伍 / 名册 / 行动顺序 / 名片
  const NEW_PARTY = ['avatarRow', 'portraitCard', 'statusStrip', 'shard', 'emblemTiles', 'rosterCard', 'videoGrid'];
  const k18 = [...anyKey(/^el[.]party(#[23])?[.]form$/).filter((k) => NEW_PARTY.includes(r.str(k, ''))), ...anyKey(/^el[.]party(#[23])?[.](halo|gap|overlap|spread|memberPill|pointsRow)$/), ...anyKey(/^el[.]turnOrder(#[23])?[.](track|segments|roundSize|spacing)$/), ...anyKey(/^el[.]profile(#[23])?[.]form$/).filter((k) => r.str(k, '') === 'nameText')];
  if (k18.length) notes.push({ where: '队伍 / 名册 / 行动顺序', what: k18.map((k) => `${k} = ${val(k)}`).join('、'), how: 'Party = HBox / VBox of 成员子场景（separation = el.party.gap，交叠 = 负 separation 的自定义 Container）：只画头像 = TextureRect（圆形遮罩 shader）+ tooltip_text 名字；肖像竖卡 = TextureRect（cover）+ 背后径向 GradientTexture2D 光环；状态带 = VBox（名字 Label、点亮格 HBox、HP / SP 两行 HBox（小标签 + 大 / 小数字 Label + 细 ProgressBar））；碎片卡 = Polygon2D 碎片 + 剪影 TextureRect + 两个斜体 Label + 两条 Line2D；选角方砖 = 倒角 StyleBoxFlat 的 Button + 徽记 TextureRect + 锁 TextureRect + 悬停时的说明 PanelContainer；名册卡 = PanelContainer（V 形章 TextureRect、名字、数值 Label、状态 PanelContainer 标签）；视频通话格 = TextureRect 立绘 + 底部暗条 HBox（名字 + 三个图标）+ 焦点那块的括角 NinePatchRect；头像下的倒计时 = 全圆角 PanelContainer + Label；铺满宽 = size_flags EXPAND_FILL。行动顺序的轨道 = HBox 后的 Line2D（一条 / 两条）+ 分段 Label；名字 + 副题 = VBox 两个 Label', level: 'builtin', done: false, params: ['el.party.form', 'el.party.halo', 'el.party.gap', 'el.party.overlap', 'el.party.spread', 'el.party.memberPill', 'el.party.pointsRow', 'el.turnOrder.track', 'el.turnOrder.segments', 'el.turnOrder.roundSize', 'el.turnOrder.spacing', 'el.profile.form'] });
  // M12b-28 目标与追踪器
  const NEW_OBJ = ['storyTracker', 'sectioned', 'panelTab', 'trackerRows'];
  const k28 = [...anyKey(/^el[.]objective(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => NEW_OBJ.includes(x))), ...anyKey(/^el[.]objective(#[23])?[.](titleColor|descColor|marker|crosshair|checkShape)$/), ...(r.list('st.alert').includes('framedLabel') && set('st.alert') ? ['st.alert'] : [])];
  if (k28.length) notes.push({ where: '目标与追踪器', what: k28.map((k) => `${k} = ${val(k)}`).join('、'), how: '标题 / 说明色 = HudTitle / Label 的 font_color 覆盖；前缀标记 = HBox 里标题前一个 TextureRect；剧情条 = HBox（圆章：TextureProgressBar(radial) + Label、标题 Label、倾向 TextureRect）+ 子目标 HBox of CheckBox（圆形 icon）；分节简报 = VBox（每节 Label + HSeparator + 图标行 HBox）+ 警告 PanelContainer（警告色细边 StyleBoxFlat）；页签清单 = 页签 PanelContainer 压在细框 PanelContainer 顶边上 + CheckBox 列表；追踪行 = 标题条 PanelContainer + 每行 HBox（TextureProgressBar(radial) + 图标 + 名字 + 回合数 Label）；标记读外形 = Sprite3D 换纹理、贯穿十字 = 两条 Line2D', level: 'builtin', done: false, params: ['el.objective.form', 'el.objective.titleColor', 'el.objective.descColor', 'el.objective.marker', 'el.objective.distance', 'el.objective.crosshair', 'el.objective.checkShape', 'st.alert'] });
  // M12b-19 敌方与世界标记
  const NEW_THREAT = ['weaknessGrid', 'detection', 'glint', 'alertMark', 'eliteMark', 'targetRow'];
  const k19 = [...anyKey(/^el[.]threat(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => NEW_THREAT.includes(x))), ...anyKey(/^el[.]threat(#[23])?[.](detectShape|glintKind|alertKind)$/), ...anyKey(/^el[.]turnOrder(#[23])?[.]form$/).filter((k) => r.str(k, '') === 'numberBadges'), ...anyKey(/^el[.]overlay(#[23])?[.]statusStyle$/), ...anyKey(/^el[.]interact(#[23])?[.]form$/).filter((k) => r.list(k).includes('iconBubble')), ...anyKey(/^cmp[.]gaugeExtra(@|$)/).filter((k) => r.list(k).includes('statusBeside')), ...(els.some((id) => id.startsWith('el.worldLabel')) ? ['el.worldLabel'] : [])];
  if (k19.length) notes.push({ where: '敌方与世界标记', what: k19.map((k) => `${k} = ${val(k)}`).join('、'), how: '世界标记 = Sprite3D / Label3D 广告牌（billboard = BILLBOARD_ENABLED，no_depth_test）或 SubViewport 贴图的 Control 跟着投影点走：弱点格 = HBox（盾 TextureRect + 数字、N 个 Panel 格：问号 / 图标），发现度 = TextureProgressBar(FILL_BOTTOM_TO_TOP)，闪光 = GPUParticles3D / 加色 Sprite3D，警觉 = Label3D（AnimationPlayer 闪烁），精英 = Sprite3D 环徽；目标切换行 = HBox of 头像 TextureRect + 命中率 Label（当前项黄框 StyleBoxFlat）；攻击顺序 = 每个敌人头顶 Label3D 圆章；思想气泡 = 云形 NinePatchRect + HBox 图标；条旁状态小方块 = 头顶血条 HBox 里的 Panel + TextureRect；小图标气泡 = Sprite3D；世界标签 = 名牌 PanelContainer（全圆角，HBox：人口 Label + 城名 Label）/ 竖幡 NinePatchRect + 竖排 Label / 逐实体图标 TextureRect。每个敌人 / 每座城一份（逐实体的演员列表还没做）', level: 'script', done: false, params: ['el.threat.form', 'el.threat.detectShape', 'el.threat.glintKind', 'el.threat.alertKind', 'el.turnOrder.form', 'el.overlay.statusStyle', 'el.interact.form', 'cmp.gaugeExtra', 'el.worldLabel.form'] });
  // M12b-59 输入字形与光标集
  const g59 = r.str('ix.glyphs', 'keycap'), k59 = [...(['mouse', 'touchpad'].includes(g59) && set('ix.glyphs') ? ['ix.glyphs'] : []), ...anyKey(/^ix[.](glyphTint|cursorSet|cursorContext)(@|$)/)];
  if (k59.length) notes.push({ where: '输入字形与光标', what: k59.map((k) => `${k} = ${val(k)}`).join('、'), how: '字形导出成白色图集（AtlasTexture），按 modulate 着色：mono = 只有边的圆角 StyleBoxFlat 里放 Label、text = 实心圆 + 面板底色 Label；鼠标 / 触摸板字形 = 按设备（InputEventMouseButton / 手柄的 touchpad 手势）切换的 AtlasTexture，没有对应键的提示照旧键帽；光标 = 每种导出一张 PNG，Input.set_custom_mouse_cursor(tex, Input.CURSOR_ARROW, 热点)，按目标换 = 悬停时切到 CURSOR_POINTING_HAND / CURSOR_HELP 等另一张；导航光标（ix.focus = cursor）= 跟着焦点控件移动的 TextureRect', level: 'builtin', done: false, params: ['ix.glyphs', 'ix.glyphTint', 'ix.cursorSet', 'ix.cursorContext'] });
  // M12b-60 准星 / 交互 / 焦点小画法
  const k60 = [...anyKey(/^el[.]crosshair(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => x === 'triLaser' || x === 'reticle')), ...anyKey(/^el[.]crosshair(#[23])?[.](lines|spacing|orientation|laserFrom|armLength|gap)$/), ...anyKey(/^el[.]interact(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => x === 'poiRing' || x === 'magnifier')), ...anyKey(/^el[.]interact(#[23])?[.]itemName$/),
    ...(r.list('ix.focus').some((x) => x === 'fill' || x === 'textColor') || r.list('ix.focus').length > 1 ? (set('ix.focus') ? ['ix.focus'] : []) : []), ...(r.list('ops.actions').includes('reroll') ? ['ops.actions'] : [])];
  if (k60.length) notes.push({ where: '准星 / 交互 / 焦点小画法', what: k60.map((k) => `${k} = ${val(k)}`).join('、'), how: '准星 = 自绘 Control（_draw：平行激光 = N 条 draw_line（Gradient 渐隐）+ 端点圆，起点 = 武器骨骼的屏幕投影；细圈 + 长十字 = draw_arc + 4 段 draw_line）；环形交互点 = Sprite3D 圆环；放大镜 = 带圆形遮罩的 TextureRect 显示 SubViewport 的放大区域（或 BackBufferCopy + screen_texture shader 采样放大）；物品名行 = 光标旁 VBox 两个 Label；焦点多选 = 主题的 focus StyleBox 叠加 + AnimationPlayer 放大，整格填色 = focus StyleBoxFlat 实心（图标不反色）、只换字色 = 焦点时改 font_color；重掷 = 小 Button（骰子图标 + 次数 Label）', level: 'builtin', done: false, params: ['el.crosshair.form', 'el.crosshair.lines', 'el.crosshair.spacing', 'el.crosshair.orientation', 'el.crosshair.laserFrom', 'el.crosshair.armLength', 'el.crosshair.gap', 'el.interact.form', 'el.interact.itemName', 'ix.focus', 'ops.actions'] });
}

/**
 * M12b B7 格位与卡牌的迁移说明（格子状态、卡面渲染器、卡内组合与手牌、网格扩展、格位类新元素、技能变体、插画槽与滤镜）：只在用到时写。
 * 新元素进 hud_sample.gd 的 LAYOUT（与别的元素同一套锚点 / 尺寸：done），其余是做法说明（done = false）。旧皮肤：皮肤之前的层写的 B7 取值画布上不生效，这里也不列
 */
function m12bB7Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && !['auto', 'none', '', 'false'].includes(r.str(k, 'auto')) && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  const els = r.elements();
  // M12b-01 格子状态新取值
  const NEW01: Record<string, string[]> = { 'st.rarityCue': ['cornerIcon', 'cornerStar', 'roman', 'cornerTab', 'label'], 'st.locked': ['redTint', 'prototype'], 'st.cooldown': ['turnLocked'], 'st.selected': ['fill', 'brighten', 'dashed', 'lift'], 'st.emptySlot': ['slashed', 'motif'], 'st.statusMark': ['slotTint'] };
  const k01 = [...Object.entries(NEW01).flatMap(([p, vs]) => anyKey(new RegExp(`^${p.replace('.', '[.]')}(@|$)`)).filter((k) => r.list(k).some((x) => vs.includes(x)))), ...anyKey(/^cmp[.]slotLabel(@|$)/)];
  if (k01.length) notes.push({ where: '格子状态（M12b-01）', what: k01.map((k) => `${k} = ${val(k)}`).join('、'), how: '格子子场景（PanelContainer + TextureRect + Label 角标）：状态 = 主题类型变体（SlotLocked / SlotSelected / SlotTint…，StyleBoxFlat 的 bg_color / border）；角落记号（品质小徽 / 角星 / 罗马数字 / 斜条 / 稀有度文字）= 子 TextureRect / Label 用锚点预设贴在内切区的角；红底 / 格底状态色 = bg_color 按状态值插值（Gradient.sample）；原型 = 虚线 StyleBox（_draw）+ 灯泡 TextureRect；回合禁用 = modulate 灰 + 按钮 text 换成 hud.turnWait；抬起 = position.y 减 12% + 投影 TextureRect；斜杠空格 = _draw 一条线；格下标牌 = 格子下面的 Label / PanelContainer（按状态切 StyleBox）', level: 'builtin', done: false, params: ['st.rarityCue', 'st.locked', 'st.cooldown', 'st.selected', 'st.emptySlot', 'st.statusMark', 'cmp.slotLabel'] });
  // M12b-12 卡面渲染器
  // 格子画成卡（cmp.slot = card，B7 审查修复 ⑫：原来只列 portraitCard / collectionCard）：没选 cmp.card 时画布按 tile 画，说明里写出来
  const cardKeys = anyKey(/^cmp[.]card(@|$)/).filter((k) => r.str(k, 'iconCard') !== 'iconCard');
  const slotCard = ['portraitCard', 'collectionCard', 'card'].includes(r.str('cmp.slot', '')) && set('cmp.slot');
  // 马赛克墙 / 置顶行里跨格的格子也按 tile 卡面画（BentoContainer 见「网格扩展」行，卡面子场景在这一行）
  const spanTile = r.str('cmp.slot', 'cell') === 'cell' && (r.str('lay.arrangement', '') === 'mosaic' || (set('lay.pinned') && r.str('lay.pinned', '') === 'pinTop'));
  const tileDef = !cardKeys.includes('cmp.card') && ((slotCard && r.str('cmp.slot', '') === 'card') || spanTile) ? [spanTile ? 'cmp.card = tile（跨格瓷砖，默认）' : 'cmp.card = tile（默认）'] : [];
  const k12 = [...cardKeys, ...anyKey(/^cmp[.]cardColorBy(@|$)/), ...(slotCard ? ['cmp.slot'] : [])];
  if (k12.length || tileDef.length) notes.push({ where: '卡面（M12b-12）', what: [...k12.map((k) => `${k} = ${val(k)}`), ...tileDef].join('、'), how: 'CardFace_<版式>.tscn：PanelContainer（主题类型变体 Card，底色 = col.surface@card）> VBox 分段——TCG = 费用 Panel（全圆角）+ 名条 Label + 插画 TextureRect（窗形 = 遮罩纹理）+ 类型 Label + RichTextLabel 文本框；扑克 = 两个角标 VBox（点数 Label + 花色 TextureRect，右下那组 rotation 180°）+ 点阵 GridContainer / 人头牌 TextureRect；塔罗 = 罗马数字 Label + 拱顶遮罩 TextureRect + 名牌，说明 Label 在卡外；圆龛 = 圆形遮罩 TextureRect（浮雕 shader）+ 道具 TextureRect；肖像竖卡 = TextureRect + 底条 Label + 右下数值 Panel；符箓 = 黄纸 StyleBox + 竖排 Label + 印章；语义着色 = 按样本切 StyleBoxFlat、费用 font_color；可打出外发光 = shadow_size 的 StyleBoxFlat。插画 = PackArt.cards 的纹理，没有时卡的符号', level: 'builtin', done: false, params: ['cmp.card', 'cmp.cardColorBy', 'cmp.slot'] });
  // M12b-69 卡内组合与手牌
  const k69 = [...anyKey(/^cmp[.]cardParts(@|$)/), ...anyKey(/^lay[.]card(Overlap|Bleed)(@|$)/), ...anyKey(/^el[.]selection(#[23])?[.]innerCard$/)];
  if (k69.length) notes.push({ where: '卡内组合与手牌（M12b-69）', what: k69.map((k) => `${k} = ${val(k)}`).join('、'), how: '卡内子件 = CardFace 的 VBox 按 cmp.cardParts 的顺序实例化字段小场景（elements/fields.ts 同名：抬头 Label×n、圆龛、图标 + RichTextLabel、字段对 VBox、金额条 = 单角 corner_radius / 切角 StyleBox、小表 = PanelContainer + GridContainer + VScrollBar、价格胶囊 HBox、目标 Label、动作 Button、供能格 HBox of Panel），插画 / 圆龛 size_flags_vertical = EXPAND_FILL；手牌 = 自定义 HandContainer（_notification(NOTIFICATION_SORT_CHILDREN)：子节点按 (1 − 叠压) × 卡宽排、下缘出屏 = position.y 往下挪、选中项 position.y 减 12% 卡高）；张数计数 = 下方 Label；说明框内卡 = 深色 PanelContainer > 白 PanelContainer > RichTextLabel + 类别胶囊；版本叠层 = ui_surface.gdshader 的 finish', level: 'script', done: false, params: ['cmp.cardParts', 'lay.cardOverlap', 'lay.cardBleed', 'el.selection.innerCard'] });
  // M12b-10 网格扩展
  const k10 = [...(r.str('lay.arrangement', '') === 'mosaic' && set('lay.arrangement') ? ['lay.arrangement'] : []), ...(r.str('lay.pinned', '') === 'pinTop' && set('lay.pinned') ? ['lay.pinned'] : []), ...anyKey(/^lay[.](pinnedCellSize|gridHeader|gridFooter|rowRule)$/)];
  if (k10.length) notes.push({ where: '网格扩展', what: k10.map((k) => `${k} = ${val(k)}`).join('、'), how: '跨格 / 马赛克 = 自定义 BentoContainer（按 span 行优先放进列格：fit_child_in_rect）；置顶行 = 网格上方一个独立 HBox（与下面的 GridContainer 之间多一个 separation）；页眉 / 页脚 = GridContainer 上下的 Label（焦点项名字在 focus_entered 时更新、排序提示 = 按键 TextureRect + Label）；行横档 = 每行后面的 ColorRect（或 GridContainer 的 v_separation 里画 StyleBoxLine）', level: 'script', done: false, params: ['lay.arrangement', 'lay.pinned', 'lay.pinnedCellSize', 'lay.gridHeader', 'lay.gridFooter', 'lay.rowRule'] });
  // M12b-29 新的格位元素
  const NEW29 = ['el.piles', 'el.passives', 'el.consumables', 'el.buffs', 'el.population', 'el.container'];
  const e29 = els.filter((id) => NEW29.some((b) => id === b || id.startsWith(`${b}#`))), k29 = [...anyKey(/^el[.][a-zA-Z]+(#[23])?[.]tray$/), ...anyKey(/^el[.]cost(#[23])?[.]form$/).filter((k) => ['recipeRow', 'pips'].includes(r.str(k, ''))), ...anyKey(/^el[.]cost(#[23])?[.]moduleSlots$/)];
  if (e29.length || k29.length) notes.push({ where: '格位类新元素（M12b-29）', what: [...e29.map((id) => `元素 ${id}`), ...k29.map((k) => `${k} = ${val(k)}`)].join('、'), how: '已导出：新元素和别的元素一样进 hud_sample.gd 的 LAYOUT（锚点 / 尺寸 / 停靠），近似控件是一块 Panel + Label。做法：牌堆 = 两张错开的卡背 TextureRect + 角标 Panel / Label（点开 = Button）；遗物列 = HBox / GridContainer of TextureRect + 层数 Label、翻页 TextureButton；消耗品 / 增益槽 = HBox of 格子子场景（空槽 = empty 变体，八角 = 遮罩纹理）；人口 = 全圆角 PanelContainer > HBox（放大镜 Button + Label）；世界容器 = PanelContainer > GridContainer（跟世界物件 = RemoteTransform / 相机投影）；托盘 = 凹槽 StyleBoxFlat 的 PanelContainer + 容量 Label；配方行 = HBox（格子、箭头 TextureRect、ProgressBar、产物格）+ 插件槽 HBox；凹槽点数 = HBox of 圆形 Panel', level: 'builtin', done: e29.length > 0 && !k29.length, params: ['cnt.elements', 'elx.tray', 'el.cost.form', 'el.cost.moduleSlots'] });
  // M12b-09 技能变体
  const NEW09 = ['list', 'buttonCluster', 'unitLoadout', 'weapon'];
  const k09 = [...anyKey(/^el[.]abilities(#[23])?[.]form$/).filter((k) => NEW09.includes(r.str(k, ''))), ...anyKey(/^el[.]abilities(#[23])?[.](quickSlots|activeLabel|overflow|lead)$/), ...anyKey(/^el[.]abilities(#[23])?[.]slotContent$/).filter((k) => r.str(k, '') === 'portraits')];
  if (k09.length) notes.push({ where: '技能元素变体', what: k09.map((k) => `${k} = ${val(k)}`).join('、'), how: '每种画法一个子场景：指令列表 = VBox of HBox（TextureRect + Label + 消耗 PanelContainer，当前行 StyleBoxFlat 强调色）、说明框 = 停靠的 el.selection；按键簇 = 四个固定位置的按键 TextureRect + 斜体 Label（当前项 scale 1.25）；单位装配 = HBox（头像 TextureRect、VBox：名字 Label + 血格 HBox + 武器格 HBox + 按键说明）；武器读数 = 武器剪影 TextureRect + 弹匣 HBox of Panel + Label；快捷格 = 弹药 HBox 末尾的格子子场景；当前技能名牌 = HBox（ColorRect 竖线 + TextureRect + Label）+ GradientTexture2D 渐隐底；溢出格 = 虚线空格 + Label「+N」；首格血瓶 = 瓶形 TextureRect + 次数点 HBox；头像卡 = 倾斜（rotation）的 PanelContainer + TextureRect', level: 'builtin', done: false, params: ['el.abilities.form', 'el.abilities.quickSlots', 'el.abilities.activeLabel', 'el.abilities.overflow', 'el.abilities.lead', 'el.abilities.slotContent'] });
  // M12b-32 插画槽扩展与滤镜
  const k32 = [...anyKey(/^cmp[.]panelArt(@|$)/).filter((k) => ['collage', 'halo', 'photomontage'].includes(r.str(k, ''))), ...anyKey(/^cmp[.]panelArt(Frame|Fx|Ratio|Caption)(@|$)/), ...anyKey(/^cnt[.](focalFrame|characterRender|illustrationRender)$/).filter((k) => !['color', 'framed'].includes(r.str(k, ''))), ...anyKey(/^ast[.]bgArtRender$/).filter((k) => r.str(k, '') !== 'color'), ...(r.str('cnt.characterMedium', '') === 'videoFeed' && set('cnt.characterMedium') ? ['cnt.characterMedium'] : [])];
  if (k32.length) notes.push({ where: '插画槽与插画滤镜', what: k32.map((k) => `${k} = ${val(k)}`).join('、'), how: '插画 = TextureRect + canvas_item shader（画布同一套公式：monochrome 去色、sketch / lineart / charcoal = Sobel 边缘 + 纸色、engraving = 按明度的排线、relief = 浮雕差分、cutout = 阈值两色 + 边缘白线、inkWash = 色调分离 + 模糊、halftone = 有序抖动；背景位图同一个 shader）；拼贴 = 几个旋转的 TextureRect（白边 StyleBox）+ 斜体 Label；光环 = 立绘后一个径向 GradientTexture2D + 圆环；照片拼贴 = Polygon2D 遮罩 + 去色；图窗处理（夜视 / 撕裂 / 扫描线 / 双色 / 去色 / 网点 / 旧照片）= 同一个 shader 的开关；图注带 = GradientTexture2D + Label；图窗外框 = NinePatchRect；无框展台 = TextureRect + 顶光 GradientTexture2D；视频窗 = TextureRect（扫描线 / 信号中断 shader）+ REC Label', level: 'shader', done: false, params: ['cmp.panelArt', 'cmp.panelArtFrame', 'cmp.panelArtFx', 'cmp.panelArtRatio', 'cmp.panelArtCaption', 'cnt.focalFrame', 'cnt.characterRender', 'cnt.illustrationRender', 'ast.bgArtRender', 'cnt.characterMedium'] });
}

/**
 * M12b B8 的迁移说明（数据区与图结构）：图生成与连线（24）、节点版式（23）、数据区构图与格组（11）、详情字段组合（14）、列表行字段（13）、书本（53）。
 * 只列选过的参数（旧皮肤只认皮肤之后的层，与画布同口径）。图的点位按 compose/graph.ts 的 layoutGraph（同一种子）导出，GraphLayout 脚本照抄即可
 */
function m12bB8Notes(r: Resolved, th: Theme, notes: UiNote[], pk: ContentPack) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && !['auto', 'none', '', 'false'].includes(r.str(k, 'auto')) && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  const has = (k: string, vs: string[]) => set(k) && r.list(k).some((x) => vs.includes(x));
  // M12b-24 图结构与连线
  const k24 = [...anyKey(/^lay[.](flowDir|layers|branching|rootEmphasis|spread)$/), ...(has('lay.arrangement', ['radialTree', 'spread']) ? ['lay.arrangement'] : []),
    ...anyKey(/^vis[.]connector(@|$)/).filter((k) => ['elbow', 'chevronChain', 'orbit', 'progress'].includes(r.str(k, ''))), ...anyKey(/^vis[.]connector(Progress|Weight|Tint)$/), ...anyKey(/^cmp[.]leader(End)?$/), ...anyKey(/^el[.]crosshair(#[23])?[.]aimFrom$/)];
  if (k24.length) {
    // 点位（B8 审查修复 ①）：与画布同一份输入——screen.ts 的 graphPlanOf（与 drawData 同一个分派：只有数据形状 network / hierarchy 的树 / 星图 / 放射树、集合的牌阵才有图；
    // 节点数按 itemCountOr = cnt.itemCount 显式给了才用、否则默认 × 信息密度；星图种子 0）。原来按 cnt.itemCount 的兜底 6、写死宽高比 1.6、没有图的屏（局内 HUD、两侧列）也写
    const P = wantsTemplate(th) || overlayBody(th) ? graphPlanOf({ r, th, scope: ['el.screen'] }, pk.id) : null;
    let pos = '';
    if (P) {
      const G = graphOf(P), pts = G.pts.map(([u, v]) => [+u.toFixed(3), +v.toFixed(3)]);
      const asp = P.kind === 'radialTree' ? '，宽高比 1 的点位——实际内框宽 w、高 h 时 x = 0.5 + (x − 0.5) × sx、y = 0.5 + (y − 0.5) × sy，(sx, sy) = graph.ts 的 radialSquash(w ÷ h)：圆按短边、长的一边最多拉成 1.6 倍的椭圆' : P.kind === 'spread' ? `，格子 ${G.grid?.cols ?? 3} × ${G.grid?.rows ?? 3} 的中心、旋转 ${JSON.stringify(G.rot ?? [])}` : '';
      pos = `；点位（${P.kind}，${G.pts.length} 个，种子 ${P.seed}${asp}）= ${JSON.stringify(pts)}，连线 = ${JSON.stringify(G.pairs)}`;
    }
    notes.push({ where: '图结构与连线（M12b-24）', what: `${k24.map((k) => `${k} = ${val(k)}`).join('、')}${pos}`,
      how: 'GraphLayout.gd：节点按上面的相对坐标（0–1，数据区四边留边之后的内框里：原来的画法留 26，版式节点留半个节点外接尺寸 + 4）实例化节点子场景；树的方向 / 层数 / 分叉在 compose/graph.ts 的 layoutGraph（纯函数，种子 = 内容包 + 模板 + 子功能，随机数是 mulberry32，照抄）；连线 = Line2D（直线 / 折线 = points、曲线 = Curve2D 采样、虚线与 V 形链 = texture_mode TILE 的平铺纹理、进度分段 = 两条 Line2D、按值线宽 = width、按正负色 = default_color）；引线 = Line2D + 端点 TextureRect；出牌指向 = Path2D + 沿路径排的 V 形 Sprite2D（PathFollow2D）；长图（lay.overflow = longScroll / pan、节点要缩到 0.75 以下）= ScrollContainer 里按 2.2 倍节点尺寸排层、滚到当前节点', level: 'script', done: false, params: k24 });
  }
  // M12b-23 节点版式
  const NEW23 = ['iconRing', 'rowCard', 'techCard', 'rosette', 'iconBadge', 'diamond', 'plainDot', 'inkIcon', 'pawn', 'token', 'counter'];
  const k23 = [...anyKey(/^cmp[.]node(@|$)/).filter((k) => NEW23.includes(r.str(k, ''))), ...anyKey(/^st[.]done(@|$)/).filter((k) => r.str(k, '') === 'inkCircle'), ...anyKey(/^lay[.]currentMarker$/)];
  if (k23.length) notes.push({ where: '节点版式（M12b-23）', what: k23.map((k) => `${k} = ${val(k)}`).join('、'), how: '节点 = 子场景（TextureButton + 三态 theme variation）：图标环 = 圆 Panel + 图标 TextureRect + 一圈小点（_draw）；横长 / 方形科技卡 = PanelContainer 预设（HBox：圆图标 + VBox(名字 Label、花费 Label、解锁 HBox) / VBox：图标、名字、底部状态色 Panel + 花费 Label）；花托 = 叶片纹理 Sprite（8 片旋转实例）+ 圆章 + SIGNED / 名字 Label；类型圆章 = 黑底白边 StyleBoxFlat 全圆角 + 图标（modulate = 类型色）+ 星 HBox；棋子 / 代币 / 算子 = 纹理（TextureRect）；手绘墨圈 = 墨圈纹理；当前位置标记 = 节点上方的 TextureRect', level: 'builtin', done: false, params: k23 });
  // M12b-11 数据区构图与格组
  const k11 = [...anyKey(/^lay[.](sideRegion|sections|subColumns|groupMaxW|dataAlign|dockContent)$/), ...anyKey(/^cmp[.]slotGroup(Title)?(@|$)/),
    ...(has('lay.arrangement', ['flankColumns', 'fixedGroups']) ? ['lay.arrangement'] : []), ...(has('lay.composition', ['dualGrid']) ? ['lay.composition'] : []), ...(has('lay.focalSide', ['bottom']) ? ['lay.focalSide'] : []),
    ...(has('lay.container', ['windowPair']) ? ['lay.container'] : []), ...(has('lay.detail', ['below']) ? ['lay.detail'] : [])];
  if (k11.length) notes.push({ where: '数据区构图与格组（M12b-11）', what: k11.map((k) => `${k} = ${val(k)}`).join('、'), how: '分段 = VBoxContainer（每段：标题 Label + HSeparator + 内容 GridContainer / ItemList / Label，段内子栏 = HBoxContainer）；第三栏 = HBox 第三个子节点；主体两侧列 = HBox（左 VBox 右对齐、主体 TextureRect + Marker2D 部位点、右 VBox）+ 引线 Line2D；固定分组 = HFlowContainer of 格组；格组 = VBox（组名 Label + 计数 HBox）+ HBox of 格子；双网格 = HBox 两个 GridContainer（各带 TabBar）；双窗停靠 = HBoxContainer 里两个 PanelContainer（不拖动）；详情在集合下方 = VBoxContainer（集合 + 详情 + 按钮行）外包 CenterContainer（限宽 = custom_minimum_size.x）；垂直居中 = VBoxContainer.alignment = CENTER', level: 'builtin', done: false, params: k11 });
  // M12b-14 详情字段组合
  const k14 = [...anyKey(/^cmp[.]detailFields(@|$)/), ...(has('lay.detail', ['statsPanel', 'hero', 'wide']) ? ['lay.detail'] : []), ...anyKey(/^lay[.]floatDock$/)];
  if (k14.length) notes.push({ where: '详情字段组合（M12b-14）', what: k14.map((k) => `${k} = ${val(k)}`).join('、'), how: 'Detail = VBoxContainer，每个字段一个子场景（开关 visible、顺序 = move_child；放不下时先藏插画、再从后往前藏，按钮贴底 = 最后一个子节点 + size_flags_vertical EXPAND 的空 Control 垫在前面）：属性表 = GridContainer（2 列，子栏 = 多个 GridContainer + 段标题）、属性卡 = 虚线 StyleBox 的 PanelContainer、词缀 = HBox(Label, 箭头 Label)、主数值 = 带边框的 PanelContainer + 大字 Label、成本 = HBox of 胶囊、解锁 = HBox of TextureRect、进度点 = HBox of TextureRect；wide = HSplitContainer（详情 | 属性表）；浮框停在网格右缘 = PopupPanel.position.x = 网格右缘 + 14', level: 'builtin', done: false, params: k14 });
  // M12b-13 列表行字段
  const NEW13 = ['upgrade', 'toggle', 'slots', 'leadButtons', 'statChips', 'grade', 'valueBlock', 'slider', 'keyHint', 'level'];
  const k13 = [...anyKey(/^cmp[.]listRow(@|$)/).filter((k) => r.list(k).some((x) => NEW13.includes(x))), ...anyKey(/^cmp[.]listHeader(@|$)/), ...(has('lay.grouping', ['header']) ? ['lay.grouping'] : [])];
  if (k13.length) notes.push({ where: '列表行字段（M12b-13）', what: k13.map((k) => `${k} = ${val(k)}`).join('、'), how: '行 = HBoxContainer 预设，新字段 = 子 Control：升级格 = Button（加号图标）+ Label（MAX / 花费）；形态切换 / 行首按钮列 = Button（VBox 两个）；行内小格 = HBox of 小 PanelContainer；色块数字 = StyleBoxFlat 圆角 Panel + Label；评级 = 斜体 Label（总评 = 表下一个大 Label）；滑条 = HSlider；两侧键帽 = 行外两个 TextureRect；分组标题行 = 每组前一个 Label / 标牌 Panel（ItemList 用 set_item_disabled 的分隔项也行）；选择条 = 列表上方 HBox of TextureButton', level: 'builtin', done: false, params: k13 });
  // M12b-53 书本
  const k53 = [...anyKey(/^ast[.](bookStyle|pageLeft|pageRight)$/), ...(has('lay.pageIndicator', ['pageCurl']) ? ['lay.pageIndicator'] : [])];
  if (k53.length) notes.push({ where: '书本容器（M12b-53）', what: k53.map((k) => `${k} = ${val(k)}`).join('、'), how: '书 = 封面 Panel（硬边 = StyleBoxFlat 直角无纹理；皮面 = 皮革纹理 StyleBoxTexture）里两个页 PanelContainer：衬页 = 抖动 / 排线纹理平铺（TextureRect stretch_mode = TILE），扉页框 = 两层 border 的 StyleBoxFlat；不排内容的页上不放子节点，内容排在另一页；翻页角 = 页右下角的卷角 TextureRect', level: 'builtin', done: false, params: k53 });
}

/** 导出的颜色角色（M12a-02）：好 / 警告 / 坏、生命、危险、货币、目标、高亮；节点三态 done / current / locked（M12a-29）；状态图标的信息色 info（M12a-31） */
const ROLE_KEYS = ['good', 'warn', 'bad', 'health', 'danger', 'currency', 'objective', 'highlight', 'info', 'icon', 'muted', 'focus', 'done', 'current', 'locked'] as const;
/** 画布上用 e.fill(0, 角色) 取色的元素角色（core.ts 的 fillOf：第 0 条遇到 col.accent@<目标> 时取作用域强调色；节点的 done 也是第 0 条） */
const FILL0_ROLES = new Set<string>(['health', 'danger', 'currency', 'objective', 'highlight', 'done']);
/**
 * 颜色角色的主题行；base 给了时只写与它不同的（按目标覆盖的类型变体）。
 * 与画布的 e.fill() 同口径：目标写了 col.accent@<目标> 时，生命 / 危险 / 货币 / 目标 / 高亮 / 完成这几个第 0 条的角色取作用域强调色；
 * 写了 col.accent2@<目标> 时第 1 条（e.fill(1, …)：生命条第二行、第二个数值图形）取作用域第二强调色——导出成 fill2（审查修复 B · C6：原来没导出）
 */
function roleLines(type: string, th: Theme, base: Theme | null): string[] {
  const eff = (t: Theme, k: (typeof ROLE_KEYS)[number]) => (t.roles.accentAt && FILL0_ROLES.has(k) ? resolveColor('@accent', t.pal) : t.roles[k]);
  const lines = ROLE_KEYS.filter((k) => !base || eff(base, k) !== eff(th, k)).map((k) => `${type}/colors/${k} = ${gColor(eff(th, k), th.pal)}`);
  const fill2 = (t: Theme) => (t.roles.accent2At ? resolveColor('@accent2', t.pal) : null);
  const f2 = fill2(th);
  if (f2 && (!base || fill2(base) !== f2)) lines.push(`${type}/colors/fill2 = ${gColor(f2, th.pal)}`);
  return lines;
}

/**
 * 按钮的动作角色色（M12a-35，col.semantic / col.actionColors）：每个有角色色的角色一个类型变体 <prefix><角色>（常态 / 悬停 / 按下按角色色，字色按同一条对比规则算好）；
 * 没有角色色（accentOnly，兜底）时一个都不加。base 给了时只写颜色与它不同的角色（按目标覆盖 col.actionColors@button……，审查修复 B · C6）
 */
function buttonRoleLines(prefix: string, idp: string, t: Theme['tokens'], pal: SkinPalette, surf: string, k: number, sub: Sub, base?: Theme['tokens']): string[] {
  const out: string[] = [];
  for (const [role, c] of Object.entries(t.button?.roles ?? {})) {
    if (!c || (base && (base.button?.roles as Record<string, string | undefined> | undefined)?.[role] === c)) continue;
    const type = `${prefix}${role[0].toUpperCase()}${role.slice(1)}`;
    const st = (name: string, mixTo: string, amt: number) => sub.add(`${idp}${role}_${name}`, 'StyleBoxFlat', { ...styleBox({ ...t.key, bg: { solid: c } }, pal, '按钮', 28 * k, []), bg_color: gColor(mixRgb(c, mixTo, amt), pal), content_margin_left: 10, content_margin_right: 10, content_margin_top: 4, content_margin_bottom: 4 });
    out.push(`${type}/base_type = &"Button"`, `${type}/styles/normal = ${st('normal', '#ffffff', 0)}`, `${type}/styles/hover = ${st('hover', '#ffffff', 0.15)}`, `${type}/styles/pressed = ${st('pressed', '#000000', 0.2)}`, `${type}/colors/font_color = ${gColor(onColorOf(c, surf), pal)}`);
  }
  return out;
}

/**
 * 按目标覆盖的面板类目标用哪个盒子（审查修复 B · C6，与画布同口径）：slot = 控件面（t.control，格子 / 次按钮，core.ts 的 slot()）、hudBar = 贴边条底板（t.hudBar，edgebar.ts）、
 * tooltip / card / titleBar = 各自的角色盒子、dialog / el.subtitle = 对白框（面板 + dialog）、minimapFrame / el.minimap = 小地图框（面板 + map）；其余（元素、panel……）= 面板
 */
function scopedBox(t: Theme['tokens'], target: string): BoxStyle {
  switch (target) {
    case 'slot': return t.control ?? t.panel;
    case 'hudBar': return t.hudBar ?? t.panel;
    case 'tooltip': return t.tooltip ?? t.panel;
    case 'card': return t.card ?? t.panel;
    case 'titleBar': return t.titleBar ?? t.panel;
    case 'dialog': case 'el.subtitle': return { ...t.panel, ...(t.dialog ?? {}) } as BoxStyle;
    case 'minimapFrame': case 'el.minimap': return { ...t.panel, ...(t.map ?? {}) } as BoxStyle;
    default: return t.panel;
  }
}

/** 有算数的主题类作用域键的目标（旧皮肤只认皮肤之后的层给的，与 patchTheme 同口径：patchTheme 返回整屏主题 = 没有） */
function scopedTargets(r: Resolved): string[] {
  const out = new Set<string>();
  for (const key of r.keys()) {
    const o = key.includes('@') ? parseOverrideKey(key) : null;
    // 面板的三层立体（vis.depth@frame / @core / @well，M12b-36）不是目标：它们已经在整屏主题的面板 / HudWell 里，不另出类型变体
    if (o && THEME_SCOPED.has(o.param) && !['frame', 'core', 'well'].includes(o.target)) out.add(o.target);
  }
  return [...out].sort();
}

/** 一个目标的类型变体（Hud_<目标> 与 Hud_<目标>Label）：pt = 按目标重算的主题，th = 整屏主题（颜色角色只写改过的） */
function variationLines(pt: Theme, th: Theme, target: string, sub: Sub, k: number, notes: UiNote[]): string[] {
  const lines: string[] = [];
  const t = pt.tokens, pal = pt.pal, name = `Hud_${target.replace(/[^A-Za-z0-9]/g, '_')}`, id = `scoped_${target.replace(/[^A-Za-z0-9]/g, '_')}`;
  if (target === 'button') {
    const bg = paintColor(t.key.bg, pal) ?? resolveColor('@accent', pal);
    lines.push(`${name}/base_type = &"Button"`, `${name}/styles/normal = ${sub.add(id, 'StyleBoxFlat', { ...styleBox({ ...t.key, bg: { solid: bg } }, pal, `按钮 @${target}`, 28 * k, notes), content_margin_left: 10, content_margin_right: 10, content_margin_top: 4, content_margin_bottom: 4 })}`, `${name}/colors/font_color = ${gColor(t.key.color ?? '#ffffff', pal)}`);
    // 按钮字号（typ.button.size@button，M12a-35）与动作角色色（col.actionColors@button / col.semantic@button）：Hud_button 的字号、Hud_button<角色> 变体（审查修复 B · C6）
    if (t.button?.size !== th.tokens.button?.size) lines.push(`${name}/font_sizes/font_size = ${Math.round((t.button?.size ?? t.textSize ?? 13) * k)}`);
    lines.push(...buttonRoleLines(name, `${id}_`, t, pal, resolveColor(pt.surface, pal), k, sub, th.tokens));
  } else if (target === 'key') {
    lines.push(`${name}/base_type = &"PanelContainer"`, `${name}/styles/panel = ${sub.add(id, 'StyleBoxFlat', styleBox(t.key, pal, `按键 @${target}`, 22 * k, notes))}`);
  } else if (target === 'bar') {
    lines.push(`${name}/base_type = &"ProgressBar"`, `${name}/styles/background = ${sub.add(`${id}_track`, 'StyleBoxFlat', styleBox(t.bar.track, pal, `血条底 @${target}`, t.bar.height, notes))}`, `${name}/styles/fill = ${sub.add(`${id}_fill`, 'StyleBoxFlat', styleBox(t.bar.fill, pal, `血条填充 @${target}`, t.bar.height, notes))}`);
  } else {
    // 面板类：按目标取它在画布上真正用的盒子（格子 = 控件面、贴边条 = hudBar 底板……，scopedBox）
    const bx = scopedBox(t, target), bw = borderWidths(bx);
    lines.push(`${name}/base_type = &"PanelContainer"`, `${name}/styles/panel = ${sub.add(id, 'StyleBoxFlat', styleBox(bx, pal, `面板 @${target}`, 80 * k, notes, [bw.l + 12, bw.t + 10, bw.r + 12, bw.b + 10]))}`);
  }
  lines.push(`${name}Label/base_type = &"Label"`, `${name}Label/colors/font_color = ${gColor(resolveColor(t.text, pal), pal)}`, `${name}Label/font_sizes/font_size = ${Math.round((t.textSize ?? 13) * k)}`);
  // 颜色角色按目标改过的（col.good@el.x……）写进同一个变体
  lines.push(...roleLines(name, pt, th));
  return lines;
}

/** 每个有覆盖的目标一个类型变体：Hud_<目标>（面板 / 按键 / 按钮 / 数值条）+ Hud_<目标>Label（字色与字号） */
function scopedVariations(r: Resolved, th: Theme, sub: Sub, k: number, notes: UiNote[]): string[] {
  const lines: string[] = [];
  const done: string[] = [];
  for (const target of scopedTargets(r)) {
    // 元素实例（el.x#2）的变体与画布同一条目标链（B6 审查修复 ⑱：先这一份、再第一份）
    const pt = patchTheme(th, r, target.startsWith('el.') ? scopeChainOf(target) : [target]);
    if (pt === th) continue;
    // 生成出来与整屏主题一样（中期审查修复 ㉑：只改了 Godot 主题里没有对应项的参数——数字字形、字效、标题前缀……）时不出这个变体；
    // 盒子的迁移说明不一样（按目标的渐隐 / 表面处理这类 StyleBoxFlat 里没有的）时只写说明
    const probe = (tt: Theme) => { const s0 = new Sub(), n0: UiNote[] = []; const text = [...variationLines(tt, th, target, s0, k, n0), ...s0.blocks].join('\n'); return { text, n0 }; };
    const p1 = probe(pt), p0 = probe(th);
    if (p1.text === p0.text) {
      const seen = new Set(p0.n0.map((q) => `${q.what}|${q.how}`));
      notes.push(...p1.n0.filter((q) => !seen.has(`${q.what}|${q.how}`)));
      continue;
    }
    lines.push(...variationLines(pt, th, target, sub, k, notes));
    done.push(`Hud_${target.replace(/[^A-Za-z0-9]/g, '_')}`);
  }
  if (done.length) notes.push({ where: '按目标覆盖', what: `${done.length} 个类型变体：${done.join('、')}`, how: '控件的 theme_type_variation 设成 Hud_<目标>（文字用 Hud_<目标>Label）；部件 > 元素 > 全局的优先级 = 变体 → 基类型 → 主题默认。hud_sample.gd 已接：元素面板有 Hud_<元素> 时用它（正文 Label 用 Hud_<元素>Label），贴边条 / 共用底条 / 边框有 Hud_hudBar 时用它；面板类变体按画布上真正用的盒子导出（slot = 控件面、hudBar = 贴边条底板、tooltip / card / titleBar = 各自的盒子），按钮的 Hud_button 带字号与 Hud_button<角色>。部件嵌在元素里时（元素里的格子）Godot 只认一个变体：给它单独做一个合并后的变体', level: 'builtin', done: true, params: [...new Set(r.keys().filter((x) => x.includes('@')).map((x) => parseOverrideKey(x)?.param).filter((x): x is string => !!x && THEME_SCOPED.has(x)))] });
  return lines;
}

function mixRgb(a: string, b: string, t: number): string {
  const x = parseColor(a), y = parseColor(b);
  return `rgba(${x[0] + (y[0] - x[0]) * t},${x[1] + (y[1] - x[1]) * t},${x[2] + (y[2] - x[2]) * t},${x[3]})`;
}

/** UI 位图素材在 Godot 里的用法（按素材类别） */
const ASSET_USE: Record<string, string> = {
  'ui-frame': 'StyleBoxTexture 或 NinePatchRect：texture_margin / patch_margin = 切边，axis_stretch = STRETCH；内容边距 ≥ 边带；中间透明，底色另垫一层。切边按屏幕像素 1:1 画：HUD 大小的面板用 192 px 的 *_godot.png（切边见括号）；用 1024 原图要先把贴图与切边按同一比例缩小，否则角件有一两百像素宽',
  'ui-ornament': 'AtlasTexture（atlas = 图集，region = 下表矩形）放进 TextureRect，挂在面板四角 / 边上（角花的另外三个角用 flip_h / flip_v）',
  'ui-ribbon': 'NinePatchRect 横向三段：patch_margin_left / right = 端头宽，上下 0，axis_stretch_horizontal = STRETCH。端头按原像素画、不随高度缩，所以要整体缩放：NinePatchRect.scale = 目标高 / 源图高、size = (目标宽 / scale, 源图高)；或先把 PNG 缩到目标高、端头宽乘同一比例',
  'ui-icons': 'AtlasTexture（region = 下表矩形）：TextureRect、Button.icon、ItemList 图标',
  'ui-badges': 'AtlasTexture（region = 下表矩形）→ TextureRect',
  'ui-empty': 'AtlasTexture（region = 下表矩形）→ TextureRect，放在空列表 / 空格子中间',
  'ui-character': 'TextureRect：expand_mode = EXPAND_IGNORE_SIZE，stretch_mode = STRETCH_KEEP_ASPECT_CENTERED；放在对话框后面或旁边',
  'ui-backdrop': 'TextureRect 全屏：expand_mode = EXPAND_IGNORE_SIZE，stretch_mode = STRETCH_KEEP_ASPECT_COVERED',
  'ui-container': 'TextureRect 全屏（STRETCH_KEEP_ASPECT_COVERED），画面中间留空的区域放 UI 控件',
  'ui-map': 'TextureRect 作地图底图；圆形小地图用 canvas_item 着色器按半径遮罩',
  'ui-title': 'TextureRect；黑墨 + alpha，modulate 乘不出颜色：canvas_item 着色器 COLOR = vec4(tint.rgb, COLOR.a * tint.a) 着色',
};

function uiAssetDoc(frames: FrameTex[]): string[] {
  type M = { size?: [number, number] | Record<string, [number, number]>; slice?: number; band?: number; sliceGodot?: number; cap?: Record<string, [number, number]>; rects?: Record<string, [number, number, number, number]> };
  const lines = [
    '',
    '## UI 位图素材（AI 生成）',
    '',
    `探索台的 public/assets/tex/ 下有 ${UI_ASSET_IDS.length} 套游戏 UI 位图素材（来源与提示词见 src/content/assets.json）。本包只附带当前皮肤用到的外框（ui/tex/）；其余要用时把文件拷进 res://ui/tex/，编辑器打开工程时会自动导入。`,
    '',
  ];
  if (frames.length) {
    for (const f of frames) lines.push(`- 本包已用：外框 \`${f.id}\` → \`ui/tex/${f.file}\`（192 px，texture_margin = ${f.slice}，边带 ${f.band}），面板 / 对话框 / 小地图框的 StyleBoxTexture；中间透明，底色是 hud_sample.gd 垫在下面的 StyleBoxFlat。`);
    lines.push('- 这张 PNG 由主题 ext_resource 引用，需要编辑器导入：先在编辑器里打开一次工程（或运行 `godot --headless --path <工程> --import`），再命令行运行。', '');
  }
  lines.push('| 素材 | 内容 | 文件（像素） | Godot 里的用法 |', '|---|---|---|---|');
  const atlases: string[] = [];
  for (const id of UI_ASSET_IDS) {
    const a = getAsset(id);
    if (!a) continue;
    const m = a.meta as unknown as M;
    const sizeOf = (key: string): string => {
      const s = Array.isArray(m.size) ? m.size : m.size?.[key];
      return s ? `${s[0]}×${s[1]}` : '';
    };
    const files = Object.entries(a.files).map(([key, file]) => {
      if (key === 'godot') return `${file}（192，切边 ${m.sliceGodot}）`;
      if (a.kind === 'ui-frame') return `${file}（${sizeOf(key)}，切边 ${m.slice}，边带 ${m.band}）`;
      if (a.kind === 'ui-ribbon' && m.cap?.[key]) return `${file}（${sizeOf(key)}，端头 ${m.cap[key][0]} / ${m.cap[key][1]}）`;
      return sizeOf(key) ? `${file}（${sizeOf(key)}）` : file;
    });
    lines.push(`| ${id} | ${a.label} | ${files.join('<br>')} | ${ASSET_USE[a.kind] ?? 'TextureRect'} |`);
    if (m.rects && !Array.isArray(m.rects)) atlases.push(`- \`${id}\`（${a.files.atlas}）：${Object.entries(m.rects).map(([n, r]) => `${n} (${r.join(', ')})`).join(' · ')}`);
  }
  if (atlases.length) lines.push('', '### 图集矩形（像素，AtlasTexture.region = Rect2(x, y, w, h)）', '', ...atlases);
  return lines;
}

function uiMigrationDoc(style: string, th: Theme, notes: UiNote[], frames: FrameTex[], sample: ContentPack): string {
  const lines = [
    '# 游戏 UI 迁移说明（Godot 4）',
    '',
    `皮肤：${style}。主题资源 \`ui/ui_theme.tres\`，示例场景脚本 \`ui/hud_sample.gd\`（由 style_demo.gd 挂到场景里）。`,
    '',
    `示例内容：${sample.game.name}（内容包 \`${sample.id}\`）。hud_sample.gd 里的标题、数值、提示与对白是这款虚构游戏的样本字，换成自己的数据即可。`,
    '',
    '## 已用 Godot 内置做到的',
    '',
    frames.length
      ? '- 面板、对话框、小地图框：素材外框 StyleBoxTexture + 垫在下面的 StyleBoxFlat 底色（HudFrameFill，底色、圆角、一层外阴影、内边距）；按键、血条底与填充、按钮四态：StyleBoxFlat（底色、各边边框、圆角、切角 = corner_detail 1、一层外阴影、倾斜 skew、内边距）。'
      : '- 面板、对话框、小地图框、按键、血条底与填充、按钮四态：StyleBoxFlat（底色、各边边框、圆角、切角 = corner_detail 1、一层外阴影、倾斜 skew、内边距）。',
    '- 文字：Label 的颜色、字号、描边（outline_size）、投影；类型变体 HudTitle / HudName / HudKeyLabel / HudIcon；大写用 Label.uppercase；字距、加粗、斜体用 FontVariation（spacing_glyph / variation_embolden / variation_transform）。',
    '- 颜色角色：自定义主题类型 HudRoles 的颜色常量 good / warn / bad / health / danger / currency / objective / highlight / icon / muted / focus（脚本里 `theme.get_color("health", "HudRoles")`，生命条、敌人血条、货币、目标、评级、图标、次要字、选中描边的颜色取这里）；按目标改过的（col.good@el.x、col.accent@el.vitals……）写进对应的 Hud_<目标> 类型变体。次要字用 HudMutedLabel，格子 / 提示框 / 标题带 / 卡面用 HudSlotPanel / HudTooltipPanel / HudTitleBar / HudCardPanel（和面板一样时直接引用面板的 StyleBox）。',
    '- 字体：探索台的 OFL 字体子集（WOFF2）；拉丁字体按字体栈的顺序回退到中文子集（FontFile.fallbacks：思源黑体 / 宋体 / 霞鹜文楷 / 像素字；站酷快乐体、得意黑只收展示用字，缺的字再落到思源黑体）；像素字体关抗锯齿。许可原文在 ui/fonts/。',
    `- 版面：信息密度 ${th.density}、版面缩放 ${th.scale}；面板旋转用 Control.rotation。${th.r.num('vis.tilt', 0) ? `随手倾角 vis.tilt = ±${th.r.num('vis.tilt', 0)}°：每块面板 / 卡片各自 Control.rotation_degrees = 按序号取的确定角度，pivot_offset = size / 2，文字不跟着转（字放在不旋转的兄弟节点里）。` : ''}`,
    `- 单位与拉伸：project.godot 设 stretch mode = canvas_items、aspect = expand、基准 ${th.r.str('ctx.orientation', 'landscape') === 'portrait' ? '540 × 960' : '960 × 540'}（= 1080p 的一半，探索台的设计画布），整个 UI 随窗口等比缩放，与探索台一致。主题里的字号、边距、圆角、描边都是设计单位 = px@1080p ÷ 2（基准字号 typ.baseSize ${th.r.num('typ.baseSize', 26)}px@1080p → default_font_size ${Math.round((th.tokens.textSize ?? 13) * th.scale)}）；并入以 1920 × 1080 为基准的工程时，把 display/window/stretch/scale 设成 2，或把这些数值全部 × 2。`,
    ...(frames.length ? [`- 外框：素材九宫格 StyleBoxTexture（${frames.map((f) => `ui/tex/${f.file}`).join('、')}），见文末"UI 位图素材"。`] : []),
    '',
    '## 需要额外做的',
    '',
    '| 位置 | 内容 | 做法 | 难度 | 本包 |',
    '|---|---|---|---|---|',
  ];
  const seen = new Set<string>();
  for (const n of notes) {
    const key = `${n.where}|${n.what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`| ${n.where} | ${n.what} | ${n.how.replace(/\|/g, '/')} | ${LEVEL_TEXT[n.level]} | ${n.done ? '已做' : '未做'} |`);
  }
  if (!notes.length) lines.push('| — | 无 | 这套皮肤全部能用 StyleBoxFlat 表达 | 内置 | 已做 |');
  lines.push('', '> 只看 Godot 内置能做的：探索台 UI 面板勾"只看 Godot 内置"，取值表里会隐藏需要着色器 / 素材 / 脚本的选项。');
  lines.push(...uiAssetDoc(frames));
  return lines.join('\n');
}

/**
 * M12b B9（控件与对话）的迁移说明：选中面板版式、页签导航、CTA 与工具条、对话框版式、选项、表单控件、标题与播报锁扣。
 * 口径同 B8：显式给了（不是默认 / 派生 / 兜底层、不是 auto / none）才写；旧皮肤只认皮肤之后的层
 */
function m12bB9Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && !['auto', 'none', '', 'false'].includes(r.str(k, 'auto')) && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  // M12b-15 选中面板版式
  const SHEETS = ['sidePanel', 'cityPanel', 'entityInfo', 'buildingPanel', 'dossier', 'shotCalc', 'bareText', 'cardStack'];
  const k15 = [...anyKey(/^el[.]selection(#[23])?[.]form$/).filter((k) => SHEETS.includes(r.str(k, ''))), ...anyKey(/^el[.]selection(#[23])?[.](edge|portrait)$/), ...anyKey(/^cmp[.]detailFields@el[.]selection/)];
  if (k15.length) notes.push({ where: '选中面板版式（M12b-15）', what: k15.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '每个版式一个预制场景（Selection_<版式>.tscn），同一份 Selection 资源驱动数据；内容区 = Detail 字段组合的 VBox（与模板详情同一套字段子场景：statTable = GridContainer 2 列、statusRow = HBox(ColorRect 圆点, Label)、memberList = VBox of HBox(TextureRect 头像, Label, Label)、bigNumbers = GridContainer、iconTabs = 托槽 NinePatchRect + HBox of Button）。骨架：sidePanel = 锚点 LEFT_WIDE / RIGHT_WIDE 的 PanelContainer + 标题条 Panel + 红圆关闭 Button；cityPanel = 名牌 Panel（负 offset 骑上沿）+ 圆徽 TextureProgressBar(radial) + 大数字 Label；entityInfo = 标题 HBox(Label, TextureRect 渲染图 = SubViewport 纹理)；buildingPanel / dossier = 头图 / 情报 TextureRect + 字段 VBox；shotCalc = HBox(大百分比 Label, 明细 Grid, 伤害区间 Label, 明细 Grid, 大百分比 Label) + 铭牌（两侧斜纹 TextureRect TILE）+ 底边技能 HBox（负 offset 压出下沿）；bareText = 无底 VBox（LabelSettings 投影）；cardStack = 自定义 Container（按 memberRects 的错位叠放公式 fit_child_in_rect）',
    level: 'builtin', done: false, params: k15 });
  // M12b-16 页签导航扩展
  const has = (k: string, vs: string[]) => set(k) && r.list(k).some((x) => vs.includes(x));
  const k16 = [...anyKey(/^lay[.](navCount|navAlign|navSeparator|nav2|drawerSide)$/), ...anyKey(/^cmp[.]tabMount$/), ...(has('lay.nav', ['breadcrumb', 'carousel']) ? ['lay.nav'] : [])];
  if (k16.length) notes.push({ where: '页签导航（M12b-16）', what: k16.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '页签条 = TabBar（tab_count = lay.navCount；tab_alignment = LEFT / CENTER，铺满 = HBox 里每个 Button EXPAND_FILL；分隔 = 主题里的竖 StyleBoxLine / 小圆点 TextureRect）；托槽 = TabBar 后面的 NinePatchRect（材质 = ast.frameMat，贴身托槽的宽 = TabBar 的实际内容宽，居中时跟着居中；弧形 = Polygon2D）；容器外沿的小牌 / 书签 = 容器外的 HBox / VBox of Button（同材质 StyleBoxTexture，选中项 z_index 高、往容器里压 4 px 盖住边）；头像栏 = 主 TabBar 左边一列 VBox of TextureButton（ButtonGroup）；面包屑 = HBox(Label ←, 键帽 TextureRect, Label 上级（modulate 次要色）, Label /, Label 当前)；轮播 = 顶上一行 HBox(键帽, Label 前一页) … HBox(Label 后一页, 键帽) + 两侧中部 TextureButton 翻页箭头；抽屉从左边滑出 = 锚点 LEFT_WIDE',
    level: 'builtin', done: false, params: k16 });
  // M12b-17 CTA 与工具条
  const CTA17 = ['triple', 'splitCorners', 'stack', 'smallSquare', 'confirmBack', 'edgeTab', 'textWithSubline'];
  const k17 = [...anyKey(/^el[.]cta(#[23])?[.]form$/).filter((k) => CTA17.includes(r.str(k, ''))), ...anyKey(/^el[.]toolbar(#[23])?[.]form$/).filter((k) => ['iconStrip', 'drawer'].includes(r.str(k, ''))),
    ...anyKey(/^el[.]toolbar(#[23])?[.](screenCode|extras)$/), ...anyKey(/^cmp[.]slot(@|$)/).filter((k) => r.str(k, '') === 'thumbCard'), ...anyKey(/^lay[.](sideButtons|windowGap|windowLink)$/),
    ...anyKey(/[.]satellites$/).filter((k) => r.list(k).includes('counters'))];
  if (k17.length) notes.push({ where: 'CTA 与工具条（M12b-17）', what: k17.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '按钮 = Button + 按角色的类型变体 HudButton<角色>：三联钮 = HBox(主 Button, PanelContainer(VBox(Label 组名, HBox(两颗小 Button))), 危险 Button)；分角双钮 / 箭头钮对 = 底部 HBox 两端各一颗、中间一个 EXPAND 的空 Control（箭头外形 = Polygon2D 或箭头 StyleBoxTexture）；竖排钮组 = 细框 PanelContainer > VBox(两颗同宽 Button, Label 小字)；小方钮 = custom_minimum_size 正方的 Button；贴边页签钮 = 单角 corner_radius / corner_detail 1 的 StyleBoxFlat，锚到容器右下、负 offset 伸出外沿；带副行 = Button 里 VBox(Label, Label 危险色)。工具条：无底图标条 = HBox of TextureButton（flat）+ 角标 Label；抽屉 = VBox(上层 PanelContainer(VBox(TabBar 小号, HBox of 缩略卡 PanelContainer(TextureRect, Label 价格))), 下层 HBox of Button)；屏幕代码 = HBox 末尾大号细体 Label；转镜头箭头 / 圆暂停 = 两个镜像 TextureButton + 圆 Button。容器外侧按钮列 = 容器外的 VBox of Button；双窗间距 = HBox.separation，连线 = Line2D；计数小圆徽 = 宿主的子 HBox（负 offset 压在下沿外）',
    level: 'builtin', done: false, params: k17 });
  // M12b-21 对话框版式
  const DLG21 = ['offsetBox', 'framedBox', 'topBox', 'splitPortrait', 'transcript', 'codec', 'polygon'];
  const k21 = [...anyKey(/^cmp[.]dialogBox(@|$)/).filter((k) => DLG21.includes(r.str(k, ''))), ...anyKey(/^cmp[.]dialogTail(@|$)/), ...anyKey(/^el[.]subtitle(#[23])?[.]speaker$/),
    ...(has('lay.focalSide', ['followLine']) ? ['lay.focalSide'] : []), ...(has('ix.continueCue', ['ornament']) ? ['ix.continueCue'] : [])];
  if (k21.length) notes.push({ where: '对话框版式（M12b-21）', what: k21.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '对话类模板除全屏页 / 挂点卡片 / 双窗以外的容器都换版式（叠加 / 横幅上对话框单独一块、其余元素躲开它；人物站在框旁，头像分框 / 通栏细框 / 通讯框的头像槽代替站姿）；局内字幕元素（el.subtitle）上新版式退回底条。DialogueBox = PanelContainer（对白框类型变体 HudDialog）+ RichTextLabel（visible_characters 做打字机，富文本照 BBCode）+ 名牌 Panel（负 offset 骑缝）：偏移框 = 锚点按立绘那一侧偏移的 PanelContainer（宽 50%）；通栏细框 = 锚点 BOTTOM_WIDE + 左边 TextureRect 头像槽（R4 回归修复 C1 ③：在有面板的弹窗 / 窗口里 = 面板 VBox 最下面一个 PanelContainer（头像 TextureRect + RichTextLabel），容器、插画、标题带照常；edgeTab 的 CONTINUE 挂在面板右下外沿，负 offset）；顶部框 = 锚点 CENTER_TOP + 上下羽化 GradientTexture2D 底 + 上下两条花线 TextureRect + 底部花饰；头像分框 = HBox(文字框 Panel, 头像框 Panel(TextureRect) + 名签 Panel)；累积日志 = 右侧 ScrollContainer > VBox of RichTextLabel（新段 add_child、滚到底；小像 TextureRect 跟着最新一段的 position.y）；通讯框 = HBox(头像, VBox(频率 Label, 台词), 头像)；多边形框 = Polygon2D 底 + Line2D 描边；尾巴 = Polygon2D（同色）指向立绘节点；说话人前缀 = Label 文本拼接开关',
    level: 'builtin', done: false, params: k21 });
  // M12b-22 选项与环形菜单余项
  // 选项的扇形 / 错落也认全局的 elx.arrangement（画布经 ownArrangement 读它；B9 审查修复 ⑪：原来只认 el.choices.arrangement），只在放了选项、元素级没另写时算
  const elsB9 = r.list('cnt.elements').map((x) => x.split('#')[0]), own0 = r.get('el.choices.arrangement'), ownArr = own0 !== undefined && own0 !== 'inherit' && own0 !== 'auto';
  const k22 = [...anyKey(/^el[.]choices(#[23])?[.]form$/).filter((k) => r.str(k, '') === 'commandList'), ...anyKey(/^el[.]choices(#[23])?[.]arrangement$/).filter((k) => ['fan', 'cascade'].includes(r.str(k, ''))),
    ...(elsB9.includes('el.choices') && !ownArr ? anyKey(/^elx[.]arrangement$/).filter((k) => ['fan', 'cascade'].includes(r.str(k, ''))) : []),
    ...anyKey(/^el[.]choices(#[23])?[.]labelStyle$/).filter((k) => r.str(k, '') === 'checkTag'), ...anyKey(/^el[.]choices(#[23])?[.](defaultFocus|keyBadge|focusMark|lockedItem)$/), ...anyKey(/^lay[.](ringLabel|ringNested|cascadeSpread)$/)];
  if (k22.length) notes.push({ where: '选项与环形菜单（M12b-22）', what: k22.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '选项行 = Button（ButtonGroup；默认焦点 none = 不预选）+ 子节点：键位徽章 = 一端的圆形 TextureRect + Label、焦点小箭头 = 左边的 TextureRect（focus_entered 时 visible，shift = position.x + 10）、检定标签 = 后缀 Label（红色检定 modulate 坏色）+ 概率卡 PopupPanel；压灰项 = disabled + 后缀 Label；指令列表 = VBox of Button（StyleBoxTexture 向左渐隐的横带，当前项更亮 + 指针 TextureRect），停靠见 elx.dockTo 的说明；扇形 / 错落 = 自定义 Container 按同一公式设每个 Button 的 position / rotation；环心名字 = 轮盘中心 Label、二级弧 = RadialMenu 子菜单（同一 Container，半径 + 1 层）；错落菜单铺开 = 按数据区对角线均分 position',
    level: 'builtin', done: false, params: k22 });
  // M12b-31 表单控件库
  const k31 = [...anyKey(/^cmp[.](optionLayout|optionRows|optionNative|formKind)$/), ...anyKey(/^lay[.]sideThumbs$/), ...(has('cmp.optionEnum', ['swatch']) ? ['cmp.optionEnum'] : []),
    ...(has('cmp.optionRange', ['hsvTriplet', 'knob', 'fader']) ? ['cmp.optionRange'] : []), ...(has('cmp.optionBool', ['toggleSwitch']) ? ['cmp.optionBool'] : []), ...(has('cmp.quantity', ['stepperMinMax']) ? ['cmp.quantity'] : []), ...(has('ix.confirm', ['batch']) ? ['ix.confirm'] : [])];
  if (k31.length) notes.push({ where: '表单控件（M12b-31）', what: k31.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '表单 = VBox，每行一个 HBox（两层排法 = PanelContainer > VBox(HBox(Label 名称, Label 数值), 控件)，当前行两侧键帽 TextureRect）；逐行控件按这一行的种类实例化：LineEdit（+ 骰子 Button）/ OptionButton / 色块 ColorRect（swatch）/ 三条 HSlider（色相轨 = GradientTexture2D 彩虹，饱和 / 明度轨 = 两色 Gradient，右边三个 Label）/ 旋钮 = 自定义 Knob Control（_draw 弧 + 指示线）/ 推子 = VSlider·HSlider 换 grabber 纹理 / 拨动开关 = 自定义 Control（两帧纹理）/ CheckButton / 两颗 Button（ButtonGroup）的图标切换 / 带极值步进器 = HBox(五个 Button, Label)；浏览器原生外观 = 一套灰白 Theme；容器外缩略图列 = 容器外的 PanelContainer > VBox of TextureButton + PopupPanel 说明卡；句内填空 = RichTextLabel（空位 = [url] meta，点击弹 PopupMenu 分栏词表），批量确认 = 计数 Label + 每满 N 项锁定',
    level: 'builtin', done: false, params: k31 });
  // M12b-30 标题与播报类锁扣
  const k30 = [...(has('el.title.form', ['notice', 'titlePage', 'chapterCard']) ? ['el.title.form'] : []), ...(has('el.subtitle.form', ['quoteCard']) ? ['el.subtitle.form'] : []),
    ...anyKey(/^el[.](title|notify|subtitle)(#[23])?[.](name|span)$/), ...(['el.title', 'el.notify', 'el.subtitle'].some((x) => elsB9.includes(x)) ? anyKey(/^elx[.]span$/).filter((k) => r.str(k, '') === 'full') : []), ...anyKey(/^el[.](ticker|lowerThird|viewfinder)[.]form$/), ...anyKey(/^lay[.]panelHeader$/), ...(has('cnt.subtype', ['rpgSettle']) ? ['cnt.subtype'] : []),
    ...(['el.ticker', 'el.lowerThird', 'el.viewfinder'].some((x) => r.list('cnt.elements').includes(x)) ? ['cnt.elements'] : [])];
  if (k30.length) notes.push({ where: '标题与播报锁扣（M12b-30）', what: k30.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '标题块 = 居中 VBox，每行一个 Label（引子 / 引语 = LabelSettings 宽字距 + 全大写，大标题 = 斜体字体变体），行间分隔线 = TextureRect（牛津线纹理）/ HSeparator，插画位 = TextureRect；章节卡 = VBox(Label「地点 — 年代」, Label 章节名, Label 章节号)，不写主标题 = Label.visible = false；'
      + '引文字卡 = VBox(Label 名称, HBox(TextureRect 圆图标, PanelContainer(VBox(RichTextLabel 引文, Label 出处))))；贴满屏宽 = 锚点预设 TOP_WIDE / BOTTOM_WIDE；跑马条 = clip_contents 的 Control 里一个 HBox of Label，AnimationPlayer 循环 position.x（行情的涨跌色 = HudRoles/colors/good·bad）；'
      + '人名条 = HBox(Panel 队徽, VBox(Label 名字, Label 头衔))，两条斜切色带 = 两个 Polygon2D；取景框 = 全屏自绘 Control（_draw 四角 L 形 + 对焦框 + 三分线）+ REC Label（Timer 每秒切 visible）+ 时间码 Label（_process 写 HH:MM:SS:FF），四角括角 / REC / 电池 / 时间码在 HudLayout.gd 里当固定占位（别的元素排位时让开，挪不动时 REC / 电池 / 时间码自己挪到旁边）；'
      + 'RPG 结算 = 右侧 VBox of 斜 Panel（rotation −3°，StyleBoxFlat skew）+ 底部 HBox of 队员卡（TextureRect 头像 + ProgressBar 经验）+ LEVEL UP 斜签；面板抬头勋章 = 页头 HBox(TextureRect 勋章（圆形遮罩）, VBox(Label 领袖, Label 帝国))；标题块（notice / titlePage / chapterCard）显式选过时在任何模板上都是这一页的内容：主体是标题时不放主体的标题 Label、标题块 VBox 放进主体那一栏，模板按文字长度补的那一句不放（R4 回归修复 C1 ⑥）',
    level: 'builtin', done: false, params: k30 });
}

/**
 * M12b B10 的迁移说明（地图画风、图例、全屏层、倾斜、像素化、K1 余项、静帧姿态）：M12b-25 / 26 / 51 / 40 / 56 / 63 与 M12c-14。
 * 只列选过的参数（旧皮肤只认皮肤之后的层，与画布同口径）。停靠跟着当前成员（elx.dockFollow = active）与样本血量（cnt.sampleHp）已导出进 hud_sample.gd（done）
 */
function m12bB10Notes(r: Resolved, th: Theme, notes: UiNote[]) {
  const set = (k: string) => { const l = r.src(k)?.layer; return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived' && !['auto', 'none', '', 'false'].includes(r.str(k, 'auto')) && (!th.legacy || afterSkin(r, k)); };
  const keys = r.keys(), anyKey = (re: RegExp) => keys.filter((k) => re.test(k) && set(k));
  const val = (k: string) => r.list(k).join(' / ');
  const has = (k: string, vs: string[]) => set(k) && r.list(k).some((x) => vs.includes(x));
  // M12b-25 地图 / 小地图的程序画风
  const MAP25 = ['linePlan', 'vectorOutline', 'hexChart', 'chart', 'inkTiles', 'frostSketch', 'pencil', 'desatTerrain'];
  const k25 = [...anyKey(/^vis[.]mapStyle(@|$)/).filter((k) => MAP25.includes(r.str(k, ''))), ...(has('vis.mapUnexplored', ['cloudSwirl', 'unpainted', 'dashedExits']) ? ['vis.mapUnexplored'] : []),
    ...anyKey(/^vis[.](mapRoomStates|mapRoute|mapFloors|mapFurniture)$/), ...anyKey(/^el[.]minimap(#[23])?[.](aspect|rotate|layers|compassText|cornerCurl)$/), ...anyKey(/^el[.]minimap(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => ['roomGraph', 'tickLine'].includes(x))),
    ...(has('rel.semanticZoom', ['chart']) ? ['rel.semanticZoom'] : []), ...(has('cmp.node', ['worldIcon']) ? ['cmp.node'] : [])];
  if (k25.length) notes.push({ where: '地图画风与小地图（M12b-25）', what: k25.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '地图底图 = 导出时按同一画风烘好的 ImageTexture（world.ts bakeStyled 的线稿 / 六角海图 / 墨块 / 冰霜素描 / 铅笔 / 褪色地形，按类别色表着色；Godot 侧不再程序画），挂在 TextureRect 上；小地图 = SubViewport + 同一张底图（16 : 9 / 2 : 1 扁条 = custom_minimum_size 比例，朝向朝上 = 底图节点 rotation = -player_heading）。未探索区：云团 = 迷雾 TextureRect 叠 shader（noise 漩涡 + 阈值），未上色 = 灰度 shader（saturation 0）+ multiply，虚线出口 = Line2D（dash 纹理）。房间状态 / 路线 / 楼层页签 / 罗盘 / 比例尺 / 图例 = 地图上的子节点（Line2D 路线 + TextureRect 头像、TabBar 楼层、TextureRect 罗盘、Label 比例尺、图例见「图例与数据叠加」行）。房间图 = GraphEdit 近似或 Control._draw（与 combat.ts roomGraph 同一组点位），刻度线 = HBox of ColorRect',
    level: 'texture', done: false, params: k25 });
  // M12b-26 图例与数据叠加
  // 实例键（el.minimap#2.layers、el.overlay#2.form……）同样出说明（终期审查修复 ⑲：B6–B9 都按 (#[23])? 匹配，B10 原来只认第一份）
  const k26 = [...anyKey(/^el[.]overlay(#[23])?[.](legendStyle|legendAnchor|legality)$/), ...anyKey(/^el[.]overlay(#[23])?[.]form$/).filter((k) => r.list(k).some((x) => ['routeLines', 'guides', 'moveRange', 'coverIcons'].includes(x)))];
  if (k26.length) notes.push({ where: '图例与数据叠加（M12b-26）', what: k26.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '图例 = 锚在角上的 PanelContainer > VBox：色块行 = HBox(ColorRect, Label)、渐变条 = TextureRect(GradientTexture1D) + 两端 Label、数值行 = GridContainer 2 列、图标行 = HBox(TextureRect, Label)（内容 = 内容包 hud.legends 的这一种叠加）。叠加层 = 世界上方的 Control._draw：线路 = Line2D（每条线一色 + 站点圆）、对齐辅助线 = 虚线 Line2D + 距离 Label、移动范围 = 等距菱形格 Polygon2D（可达 / 冲刺两档色）、掩体 = 盾形 TextureRect（满 / 半两档）；建造合法性 = 每格 ColorRect + 斜纹 shader（stripes）/ 禁止图标 + 原因 Label',
    level: 'builtin', done: false, params: k26 });
  // M12b-51 全屏层
  const k51 = [...anyKey(/^ast[.](bgFlow|bgWarp|bgConfetti|bgColors|bgForeground|screenEdge|screenEdgeColor|screenEdgeStrength|screenEdgeLayer|watermark2|watermark2Opacity)$/),
    ...(has('ast.bgArt', ['shaderSwirl', 'skyClouds', 'backlight']) ? ['ast.bgArt'] : []), ...(has('ast.watermark', ['glyphBand', 'hexVignette', 'doodles', 'lensBokeh']) ? ['ast.watermark'] : []),
    ...(has('flow.chrome', ['topStrip', 'topRule']) ? ['flow.chrome'] : []), ...(has('ix.close', ['cornerSign']) ? ['ix.close'] : []), ...anyKey(/^ix[.]closeCorner$/), ...(has('lay.container', ['panels']) ? ['lay.container'] : [])];
  if (k51.length) notes.push({ where: '全屏层（M12b-51）', what: k51.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '替换背景 = 全屏 ColorRect + canvas_item shader：漩涡 = fbm 噪声域扭曲（flow / warp uniform = ast.bgFlow / bgWarp，TIME 驱动；三色 uniform color_a / color_b / color_c = ast.bgColors，没写 = 强调色 / 第二强调色 / 面板底色）+ 彩纸 = GPUParticles2D（ast.bgConfetti）；像素云天（skyClouds）= 低分辨率 SubViewport + NEAREST；背光 = 径向 GradientTexture2D。前景剪影 = 底部 TextureRect（ast.bgForeground）。屏幕边缘遮罩 = 全屏 TextureRect + shader（冰雾 / 墨烟 = 边缘距离场 × 噪声，六角暗角 = 六角格距离场，字带 = 平铺字形纹理，胶片齿孔 = 两侧 TextureRect TILE），CanvasLayer.layer 放在 HUD 之下（under，在替换背景与出血地图之上）或之上（over：在 HUD 与文字之上、飘字 / 合规层之下）；第二层水印 = 第二个 TextureRect（modulate.a = ast.watermark2Opacity）。居中顶条 = 锚点 CENTER_TOP 的 PanelContainer > HBox(星 TextureRect × 3, Label 资源, VSeparator, 分段 ProgressBar, Label 百分比, Label 回合)；贯穿分隔线 = 全宽 TextureRect（两端渐隐 GradientTexture1D）；角上返回牌 = 锚到角的 Button（箭头 + 「返回」）；主窗 + 侧栏（panels）= HBox(主 PanelContainer, 侧栏 PanelContainer) 按 lay.panelAlign 左右换位、底对齐',
    level: 'shader', done: false, params: k51 });
  // M12b-40 倾斜方式与作用层
  const k40 = anyKey(/^vis[.](tiltMode|tiltLayers)(@|$)/);
  if (k40.length) notes.push({ where: '倾斜方式与作用层（M12b-40）', what: k40.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '倾角 = Control.rotation（pivot_offset = size / 2）：逐块随机 = 按节点名哈希取 ±vis.tilt 内的角度，统一 = 同一个角，满角正反 = ±vis.tilt 按哈希取号。作用层：只转盒子 = 面板背景节点（Panel）单独转、内容子节点正放；整块 = 元素根节点转；只转内容 = 内容子节点转、背景正放；反着斜 = 背景转 θ、内容转 −0.6θ。界面模板整块转 = 模板根 Control 绕中心转（跨界面常驻层不转）',
    level: 'builtin', done: false, params: k40 });
  // M12b-56 按角色像素化与栅格化字体
  const k56 = [...anyKey(/^vis[.]pixelRoles$/), ...anyKey(/^typ[.]rasterize$/)];
  if (k56.length) notes.push({ where: '按角色像素化（M12b-56）', what: k56.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '每个低分辨率角色层一个 SubViewport（size = 视口 / 倍数，texture_filter = NEAREST，transparent_bg）：面板 / 条 / 图标 / 字按角色挂进对应的 SubViewport（框 < 条 < 图标 < 字的顺序叠 TextureRect），没选的角色留在清晰层；栅格化字体 = 把 Label 放进低分辨率 SubViewport（字体本身不换，Font.antialiasing = NONE、整数字号）；倍数 = vis.pixelScale（没开时 2）或 typ.rasterize 的 x2 / x3',
    level: 'script', done: false, params: k56 });
  // M12b-63 K1 视觉语言余项
  const K1P = ['dogEar', 'photoCorners', 'paperclip', 'pushpin', 'washiTape', 'polaroid', 'bow', 'waxSeal', 'bunting', 'screws', 'grille', 'marginDoodles', 'wavyRibbon'];
  const k63 = [...anyKey(/^vis[.](misregister|misregisterAngle|lightAngle|blurTint|edgeLight|grain)(@|$)/), ...anyKey(/^ast[.]aging(@|$)/), ...anyKey(/^typ[.]mix$/),
    ...anyKey(/^vis[.]depth(@|$)/).filter((k) => r.str(k, '') === 'layeredPaper'), ...anyKey(/^st[.]selected(@|$)/).filter((k) => r.str(k, '') === 'inset'),
    ...anyKey(/^vis[.]iconStyle(@|$)/).filter((k) => ['woodcut', 'nato', 'alchemy'].includes(r.str(k, ''))), ...anyKey(/^vis[.](silhouette|panelShape)(@|$)/).filter((k) => ['boomerang', 'quarterCircleBase', 'roundShield'].includes(r.str(k, ''))),
    ...anyKey(/^vis[.]motif2?(@|$)/).filter((k) => ['whiplash', 'drips', 'sunsetStripes'].includes(r.str(k, ''))), ...anyKey(/^ast[.]ornaments(@|$)/).filter((k) => r.list(k).some((x) => K1P.includes(x))),
    ...anyKey(/^ast[.]endcapShape(@|$)/).filter((k) => ['beastHead', 'crestPillar', 'wing'].includes(r.str(k, ''))), ...anyKey(/(^elx|[.])groupConnector$/).filter((k) => r.str(k, '') === 'ironBeam'),
    ...anyKey(/(^elx|[.])dockConnector$/), ...anyKey(/(^elx|[.])dockFollow$/), ...anyKey(/^el[.]toolbar(#[23])?[.]form$/).filter((k) => r.str(k, '') === 'bigButtons'), ...anyKey(/^el[.]objective(#[23])?[.]form$/).filter((k) => r.list(k).includes('blindPlate'))];
  if (k63.length) notes.push({ where: 'K1 视觉语言余项（M12b-63）', what: k63.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '套印错位 = 面板 / 标题后面垫一份偏移 (sin θ, −cos θ) × 距离的副本（modulate = 强调色）；做旧 = 面板上叠做旧纹理 TextureRect（泛黄 / 污渍 / 折痕 / 咖啡圈 / 订书钉 / 复印噪点各一张）；叠纸 = 面板后两个错开、略转的 Panel；光源方向 = StyleBoxFlat.shadow_offset 与双向阴影 shader 的 light_dir 按同一角度；毛玻璃 = BackBufferCopy + 模糊 shader 的 tint / edge / grain uniform；按下态 = 选中格的 StyleBoxFlat 换成内阴影版（或 shader）；字体混排 = RichTextLabel 的 [font] 标签逐行 / 逐说话人切换，注释层 = [i][color]；新图标画风 / 外形 / 母题 / 饰件 / 端头 = 预渲染纹理（与 paint.ts / ornament.ts 同一组点列，Polygon2D 也可）；连接梁 = 铁艺翼梁 NinePatchRect 从宿主的边伸到停靠者外端、排在停靠者之前（停靠者挂在梁上），细线 = 两块之间的 Line2D；跟着当前成员 = 已导出（DOCKS 的宿主第几格 = 当前行动者，回合脚本换人时改它再调 _dock_place）；竖长大色块钮 = HBox of Button（StyleBoxFlat 各一色）；盲注名牌 = VBox(色条 Panel + Label, HBox(筹码 TextureRect, VBox(Label 至少得分, Label 目标分, Label 奖励)))。伸出盒外的饰件：画布登记进帧占位表（decor.orn:<元素>），HudLayout.gd 要避让时把饰件纹理的外接框算进障碍（导出包里还没写）',
    level: 'texture', done: false, params: k63 });
  // M12c-14 静帧姿态、样本血量、演示脚本
  const k14 = [...anyKey(/^chk[.](simPose|simTime)$/), ...anyKey(/^cnt[.]sampleHp$/), ...(has('chk.demo', ['openScreen', 'resultsTally', 'bossIntro', 'scoringSequence', 'beat', 'drawCards']) ? ['chk.demo'] : [])];
  if (k14.length) notes.push({ where: '静帧姿态与演示脚本（M12c-14）', what: k14.map((k) => `${k} = ${val(k)}`).join('、'),
    how: '示例场景的 AnimationPlayer：每个演示脚本一条同名动画（openScreen / resultsTally / bossIntro / scoringSequence / beat / drawCards，与 sim.ts DEMOS 的事件与时刻一一对应：打开 = 模板根节点 clip_contents 的高度 0 → 全高 + modulate.a，计数 = Tween 数字从 0 到目标、按 y 错开，Boss 登场 = 名牌 modulate.a 先到 1、条 value 再涨，计分 = 飘字 Label 往上飘，节拍 = 元素（背景信息除外）scale 1.05 → 1，发牌 = 每张牌 position.x 从右侧滑入）；静帧姿态 = 同一动画 seek(姿态时刻) 后暂停。样本血量已导出（hud_sample.gd 的生命条起点）',
    level: 'builtin', done: false, params: k14 });
}
