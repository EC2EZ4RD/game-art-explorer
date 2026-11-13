/*
 * 生成若干配方的 Godot 4 迁移包，并用本机 Godot 打开运行几帧，收集着色器 / 脚本错误。
 * 运行：npx tsx scripts/godot-validate.ts [配方id ...]
 * 需要本机安装 Godot 4.x：环境变量 GODOT 指向可执行文件（Windows 用 *_console.exe 才能拿到输出），
 * 不设时找 PATH 上的 `godot`。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import '../src/dims/index';
import { defaultValues } from '../src/dims/registry';
import { RECIPES } from '../src/content/recipes';
import { godotPackage } from '../src/export/godot';
import { isUiKey } from '../src/dims/registry';
import { applyPreset } from '../src/hud/sys/apply';
import { skinValueOf } from '../src/hud/sys/register';
import { PRESETS } from '../src/hud/sys/spec';

const GODOT = process.env.GODOT || 'godot';
{
  // 先确认能启动 Godot，找不到时给出说明而不是每个配方都报一遍错
  const probe = spawnSync(GODOT, ['--version'], { encoding: 'utf8', timeout: 30000 });
  if (probe.error || probe.status !== 0) {
    console.error(`找不到 Godot 4（${GODOT}）。安装 Godot 4.x 后把环境变量 GODOT 设为可执行文件路径，或把 godot 加入 PATH。`);
    process.exit(1);
  }
}

/** 功能变体：在配方上叠加新功能，验证对应的 Godot 映射 */
const VARIANTS: Record<string, { recipe: string; extra: Record<string, string | number | boolean> }> = {
  'fx-cinema': { recipe: 'soft-pbr', extra: { 'lighting.ao': 0.8, 'camera.dof': 0.7, 'lighting.godrays': 0.8, 'lighting.time': 7, 'color.grade': 'tealOrange', 'camera.lens': 0.4, 'camera.shake': 0.5 } },
  'fx-obra': { recipe: 'onebit', extra: { 'color.ditherAnchor': 'world' } },
  'fx-planet': { recipe: 'inspiration-fixed', extra: { 'world.curve': 'sphere', 'world.curveAmount': 0.8 } },
  'fx-roll': { recipe: 'cel-anime', extra: { 'world.curve': 'cylinder', 'world.curveAmount': 0.8, 'camera.projection': 'persp', 'camera.angle': 'low' } },
  'fx-n64': { recipe: 'soft-pbr', extra: { 'material.texture': 'threePoint', 'material.texScale': 6, 'world.curve': 'sphere' } },
  'fx-isolate': { recipe: 'cel-anime', extra: { 'color.isolate': 'accent', 'camera.letterbox': '2.39' } },
  // 方向性笔触：经典路径 + 远景笔触化、正交 + 大半径、透视 + 远景、无刷痕
  'akf-oil-classic': { recipe: 'oil', extra: { 'surface.kuwahara': 'classic', 'surface.strokeDepth': 0.6 } },
  'akf-oil-ortho': { recipe: 'oil', extra: { 'camera.projection': 'ortho', 'surface.radius': 8 } },
  'akf-water-persp': { recipe: 'watercolor', extra: { 'camera.projection': 'persp', 'surface.strokeDepth': 1 } },
  'akf-gouache-noflow': { recipe: 'gouache', extra: { 'surface.strokeFlow': 0 } },
  'fx-eye': { recipe: 'neon-night', extra: { 'color.autoExposure': 0.8, 'color.exposureSpeed': 2, 'color.metering': 'center' } },
  'fx-eye-dof': { recipe: 'soft-pbr', extra: { 'color.autoExposure': 0.6, 'camera.dof': 0.6, 'lighting.time': 21 } },
  'fx-vhs': { recipe: 'vhs-tape', extra: { 'surface.compression': 0.4, 'surface.vhsInterlace': true, 'camera.letterbox': '2.39' } },
  'fx-vcr': { recipe: 'vhs-tape', extra: { 'surface.osd': 'play', 'surface.vhsTracking': 0.8 } },
  'fx-bodycam': { recipe: 'soft-pbr', extra: { 'surface.osd': 'rec', 'surface.compression': 0.6, 'camera.lens': 0.5, 'camera.shake': 0.4 } },
  // AI 生成素材（2026-10-13 生成）：纸纹、皴法、凹凸图案、剥落、剪纸、TAM、像素精灵与序列帧特效
  'asset-xuan-ink': { recipe: 'ink-landscape', extra: { 'surface.paperTex': 'xuan', 'surface.paper': 0.5, 'material.cun': 'fupi' } },
  'asset-silk-gongbi': { recipe: 'gongbi', extra: { 'surface.paperTex': 'silk', 'surface.paper': 0.4 } },
  'asset-cold-watercolor': { recipe: 'watercolor', extra: { 'surface.paperTex': 'coldPress' } },
  'asset-cun-wear': { recipe: 'qinglv', extra: { 'material.cun': 'pima', 'material.weathering': 0.6 } },
  'asset-clay': { recipe: 'claymation', extra: { 'material.detail': 'clay', 'material.bump': 0.5 } },
  'asset-knit': { recipe: 'felt', extra: { 'material.detail': 'knit', 'material.bump': 0.6 } },
  'asset-papercut': { recipe: 'papercut', extra: { 'material.papercut': 'architecture', 'material.windowFlower': true, 'shape.carrier': 'puppet' } },
  'asset-tam-post': { recipe: 'pen-crosshatch', extra: { 'shading.hatchTex': 'tam', 'surface.paperTex': 'hotPress', 'surface.paper': 0.4 } },
  'asset-tam-shading': { recipe: 'pencil-hatch', extra: { 'shading.model': 'hatching', 'shading.hatchTex': 'tam' } },
  'asset-sprite': { recipe: 'soft-pbr', extra: { 'shape.carrier': 'pixelB', 'camera.tiltShift': 0.5 } },
  'asset-sprite-fx': { recipe: 'cel-anime', extra: { 'shape.carrier': 'pixelA', 'motion.fx2d': 'explosion', 'surface.strokes': 'long' } },
};
// 游戏 UI（M4）：38 套皮肤各一个变体 + 几种起点（UI 配方、电视大字、像素化、跟随水墨画面），以及不显示 UI
for (const p of PRESETS.filter((x) => x.kind === 'skin')) VARIANTS[`ui-${skinValueOf(p.id)}`] = { recipe: 'inspiration-fixed', extra: { 'hud.style': skinValueOf(p.id) } };
for (const id of ['rcp.hadesLike', 'rcp.pixelPlatformer', 'rcp.consoleAction', 'rcp.mobileArpgF2P', 'rcp.hollowFiligree']) {
  const patch = applyPreset(id, { ...defaultValues() }, { isUi: isUiKey });
  if (patch) VARIANTS[`ui-${id}`] = { recipe: 'inspiration-fixed', extra: patch.set as Record<string, string | number | boolean> };
}
VARIANTS['ui-ink-follow'] = { recipe: 'ink-landscape', extra: { 'hud.style': 'ink', 'rel.harmony': 'sameMedium' } };
VARIANTS['ui-none'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'none' } };
// 元素排版导出（M9b）：几个品类布局 × 皮肤
// 输入方式与画幅（M10）
VARIANTS['ui-input-pad'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'flat', 'uip.platform': 'platform.tv', 'uip.layout': 'layout.explore' } };
VARIANTS['ui-input-touch'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'animeCard', 'uip.platform': 'platform.phonePortrait', 'uip.layout': 'layout.mobileArpg' } };
for (const [lay, skin] of [['layout.rpg', 'darkHairline'], ['layout.strategyRts', 'flat'], ['layout.action', 'parchment'], ['layout.mobileArpg', 'animeCard'], ['layout.colonySim', 'pixelWood'], ['layout.racing', 'scifi']] as const) VARIANTS[`ui-${lay}`] = { recipe: 'inspiration-fixed', extra: { 'hud.style': skin, 'uip.layout': lay } };
// 位图外框（M11）：面板 / 对话框 / 小地图框换成 StyleBoxTexture（ui/tex/ 下的 192 px 外框），雕花金框 + 华丽皮肤、平框木 + 背包模板；再加一个品类布局验证元素排版路径
VARIANTS['ui-frame-gold'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'ornate', 'ast.frame': 'carvedNinePatch', 'ast.frameMat': 'gold' } };
VARIANTS['ui-frame-wood'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.inventory', 'ast.frame': 'plainNinePatch', 'ast.frameMat': 'wood' } };
// 倾斜皮肤 + 素材外框：StyleBoxTexture 不能倾斜，底色也要跟着不倾斜（否则从角上露出来）
VARIANTS['ui-frame-gold-skew'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'ast.frame': 'carvedNinePatch', 'ast.frameMat': 'gold', 'vis.skew': -8 } };
VARIANTS['ui-frame-bronze-rpg'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'ast.frame': 'carvedNinePatch', 'ast.frameMat': 'bronze', 'uip.layout': 'layout.rpg' } };
// 按目标覆盖（M12a-01）：元素、格子、按钮、数值条各有作用域键 → 主题里多出 Hud_<目标> 类型变体；旧皮肤（scifi）上的作用域键同样导出
VARIANTS['ui-scoped'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.action', 'col.accent@el.vitals': '#3fd8e0', 'col.surface@slot': '#f4efe4', 'vis.corner@slot': 'round', 'vis.stroke@button': 'double', 'col.accent@bar': '#e3b341' } };
VARIANTS['ui-scoped-legacy'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'scifi', 'uip.layout': 'layout.action', 'col.surface@el.minimap': '#101820', 'vis.stroke@el.minimap': 'solid', 'vis.strokeColor@el.minimap': 'accent2' } };
// 按钮角色色、按钮字号、按字号的描边（M12a-35 / 33）：主题里多出 HudButton<角色> 类型变体，描边 outline_size 按字号算
// HUD 版式引擎（M12a-16 / 18）：贴边竖条 + 条内顺序、同锚点横排 / 共用底条 / 等宽 / 偏移、底座、PC 式状态条 → hud_sample.gd 里的 HBox / VBox / HudBar
VARIANTS['ui-edgebar'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'left', 'cnt.elements': 'el.objective,el.timer,el.meter,el.resources,el.clock,el.toolbar,el.abilities', 'el.objective.screenAnchor': 'tl', 'el.timer.screenAnchor': 'tl', 'el.meter.screenAnchor': 'ml', 'el.resources.screenAnchor': 'bl', 'el.clock.screenAnchor': 'bl', 'el.toolbar.screenAnchor': 'bl', 'el.abilities.screenAnchor': 'bc', 'lay.edgeBarSlots': 'el.objective,el.timer,el.toolbar|el.clock' } };
VARIANTS['ui-stack'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'filigree', 'uip.layout': 'layout.metroidvania', 'cnt.elements': 'el.abilities,el.vitals,el.resources,el.minimap,el.objective', 'el.abilities.form': 'ultimate', 'el.abilities.screenAnchor': 'tl', 'el.vitals.screenAnchor': 'tl', 'el.resources.screenAnchor': 'tl', 'el.vitals.stackDir': 'rowBar', 'el.minimap.screenAnchor': 'tr', 'el.objective.screenAnchor': 'tr', 'elx.stackWidth': 'match', 'el.objective.offsetY': 4, 'flow.chrome': 'statusBar' } };
VARIANTS['ui-console'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.moba' } };
// B8（M12a-15 / 31 / 32 / 34 / 30）：世界挂点的整块元素与挂点卡片、状态图标与徽章、字幕气泡与通知取色、图例与分页、出血世界地图
VARIANTS['ui-attach'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.survivors', 'el.vitals.attachOffset': 'below', 'el.vitals.attachWidth': 'actor', 'el.vitals.occlusion': 'push', 'cnt.elements': 'el.profile,el.timer,el.resources,el.vitals,el.abilities,el.subtitle', 'el.subtitle.attachTo': 'target', 'el.subtitle.form': 'bubble' } };
VARIANTS['ui-status'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'pixelWood', 'uip.layout': 'layout.factory', 'cmp.badge': 'roundel', 'st.alert': 'blink', 'el.notify.form': 'band', 'col.surface@el.notify': '#1a1a1a', 'col.text@el.notify': '#a8211b' } };
VARIANTS['ui-map'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.worldmap', 'cmp.modal': 'floating', 'vis.mapLabels': 'onMap', 'cnt.itemCount': 24, 'rel.semanticZoom': 'iconize', 'vis.mapInk': '#ff5e57', 'lay.pageIndicator': 'arrows', 'cnt.elements': 'el.prompt' } };
VARIANTS['ui-buttons'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.quest', 'col.semantic': 'blueRedOrange', 'typ.button.size': 40, 'typ.titleFx': 'outline', 'typ.outlineWidth': 0.12, 'typ.legibility': 'outline' } };
// B9（M12a-28 / 21 / 26 / 38）：网格几何与格子占用、卡行、详情栏与浮动详情、容器几何
VARIANTS['ui-grid'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.inventory', 'lay.arrangement': 'hexGrid', 'vis.silhouette@slot': 'hexagon', 'lay.columns': 10, 'lay.cellSize': 64, 'lay.gap': 12, 'lay.cellAspect': 0.9, 'cnt.slotCount': 30, 'cnt.fillRatio': 0.2, 'cnt.fillOrder': 'scattered', 'st.emptySlot': 'pit', 'ix.focus': 'scale' } };
VARIANTS['ui-cards'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.draft3', 'cnt.itemCount': 4, 'lay.cellAspect': 0.6, 'hier.dimInactive': 0.4, 'lay.raisedCurrent': true, 'lay.titleAlign': 'center' } };
VARIANTS['ui-detail'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.quest', 'lay.detail': 'transient', 'lay.container': 'drawer', 'lay.drawerFlush': true, 'flow.chrome': 'statusBar', 'ix.close': 'xOutside', 'lay.panelFit': 'fitContent', 'lay.vAlign': 'bottom', 'cnt.itemCount': 4 } };
VARIANTS['ui-panel'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.hero', 'lay.container': 'modal', 'lay.panelAspect': 'portrait', 'lay.panelSize': 0.9, 'ix.mode': 'multiButton', 'vis.stroke@title': 'solid', 'typ.scale': 1.8 } };
// 审查修复 B（M12a 审查）：Godot 导出跟上画布——设计画布 960 × 540（C1）；贴边条的格序、"a|b" 并排、逐格分隔线与 Hud_hudBar（C7 / C6）；
// 元素面板 / 正文字用 Hud_<元素>、按钮用 Hud_button（C6）；inMargin 的玩法区按 lay.playfield（boxed → 3:4、边框 277 宽，D2）；旧皮肤上品类布局写的整块挂点不挂（D6）
VARIANTS['ui-edgebar-slots'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'lay.hudOrg': 'edgeBar', 'lay.hudEdge': 'bottom', 'cnt.elements': 'el.objective,el.timer,el.resources,el.clock,el.minimap', 'el.objective.screenAnchor': 'bl', 'el.timer.screenAnchor': 'bc', 'el.resources.screenAnchor': 'br', 'el.clock.screenAnchor': 'bl', 'el.minimap.screenAnchor': 'tr', 'lay.edgeBarSlots': 'el.resources,el.timer|el.clock,el.objective', 'col.surface2@hudBar': '#203a4a', 'col.surface@el.objective': '#4a2020' } };
VARIANTS['ui-scoped-el'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'col.surface@el.minimap': '#3a1010', 'vis.stroke@el.minimap': 'double', 'col.text@el.objective': '#ffd34d', 'col.surface@el.vitals': '#10283a', 'col.surface@slot': '#f4efe4', 'typ.button.size@button': 40, 'col.semantic@button': 'blueRedOrange', 'col.accent2@el.vitals': '#3fd8e0' } };
VARIANTS['ui-inmargin'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.shmup' } };
VARIANTS['ui-attach-legacy'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'neobrutal', 'uip.layout': 'layout.survivors' } };
// M12b B2：按界面取的样本字（回合制局内的按键图例 / 主按钮 / 单词字幕进 hud_sample.gd）、富文本 / 字族别名 / 展示字体范围 / 技能栏放物品的迁移说明
VARIANTS['ui-text-b2'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.pack': 'tactics', 'ctx.timeModel': 'turn', 'cnt.elements': 'el.prompt,el.subtitle,el.cta,el.objective,el.abilities', 'cnt.textLength': 'word', 'el.cta.caption': 'endTurn', 'el.abilities.slotContent': 'items', 'hier.inlineMap': 'keyword,buff,debuff,redact', 'typ.display.family': 'slab', 'typ.display.scope': 'title,nameplate', 'typ.align@title': 'center', 'typ.script': 'cjk' } };
// M12b-54 字体落地：新字族的 FontFile 与按字体栈的回退链（Label / HudTitle / HudName 三个类型变体能放两套字族，五个新字族分三个变体）——
// 正文板衬线（Kreon → 思源宋体）+ 展示漫画手写（Comic Neue → 站酷快乐体展示字表 → 思源黑体）；正文墨线衬线（Almendra → 霞鹜文楷）+ 展示窄体（Rajdhani → 得意黑展示字表 → 思源黑体）；
// 正文漫画手写（Comic Neue → 思源黑体：正文不挂展示字表）+ 展示神秘学衬线（Pirata One，字重范围注册、不加 embolden → 思源宋体）
VARIANTS['ui-fonts-b2'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.pack': 'rhythm', 'cnt.elements': 'el.title,el.subtitle,el.objective,el.notify,el.cta', 'typ.body.family': 'slab', 'typ.display.family': 'comicHand', 'typ.display.scope': 'title,nameplate' } };
VARIANTS['ui-fonts-b2-cond'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.shooter', 'cnt.pack': 'shooter', 'typ.body.family': 'inkedSerif', 'typ.display.family': 'condensed', 'typ.display.weight': 'bold' } };
VARIANTS['ui-fonts-b2-occult'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.title', 'cnt.pack': 'horror', 'typ.body.family': 'comicHand', 'typ.display.family': 'occultSerif', 'typ.display.weight': 'black' } };

// M12b B3：风格图元 I——分角切角、随机四边形面板、贴纸描边、实心厚度、渐隐 / 抖动 / 表面处理（ui_fade.gdshader / ui_surface.gdshader 挂在样本面板上，Godot 编译它们）、凹槽、微字饰件
VARIANTS['ui-style-b3a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'vis.pattern': 'dither', 'vis.ditherMatrix': 'bayer8', 'vis.patternOpacity': 0.35, 'ast.finish': 'foil', 'vis.fade': 'both', 'vis.fadeLength': 0.2, 'vis.depth@frame': 'bevel', 'vis.depth@well': 'innerShadow', 'lay.grouping': 'wells', 'vis.panelShape': 'randomQuad', 'ast.wear': 0.5 } };
VARIANTS['ui-style-b3b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'neobrutal', 'uip.layout': 'layout.shooter', 'cnt.pack': 'shooter', 'vis.corner': 'chamfer', 'vis.cornerMask': 'br', 'vis.stroke': 'sticker', 'vis.strokeWidth': 2, 'vis.depth': 'extrude', 'vis.depthOffset': 8, 'vis.depthColor': 'accent', 'vis.pattern': 'halftoneDuo', 'ast.ornaments': 'microText,rulerRail,registration', 'vis.noiseEdges': true, 'vis.silhouette@slot': 'octagon', 'rel.sceneTone': 'directional', 'rel.fogBand': 0.6 } };
// M12b B4：风格图元 II——卷草母题 + 尖顶饰 + 饰色 / 宝石色 + 线的粗细调制 + 牛津分隔线、齿轮表圈图标钮 + 元素套框 + 框厚、标题前缀（迁移说明 m12bB4Notes）；
// 神秘学母题 + 第二母题 + 元素两端 / 条两端端头 + 骑边耳标、整宽标题带 + 图标槽、印刷磨损、只斜一端的页签、贴边页签钮
VARIANTS['ui-style-b4a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.strategyTurn', 'vis.motif': 'baroque', 'vis.ornament': 2, 'ast.ornaments': 'corners,finials,gems,dividers', 'col.ornament': '#e8eef2', 'col.gem': '#9b5de5', 'vis.stroke': 'solid', 'vis.strokeModulation': 0.6, 'vis.dividerStyle': 'oxford', 'vis.dividerPlace': 'panelBottom,afterTitle', 'ast.frame@el.cta': 'gear', 'ast.frameMat@el.cta': 'bronze', 'cmp.button@el.cta': 'icon', 'elx.frame': 'panel', 'ast.frameThickness': 10, 'typ.titlePrefix': 'chevron' } };
VARIANTS['ui-style-b4b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'neobrutal', 'uip.layout': 'layout.shooter', 'cnt.pack': 'shooter', 'cnt.elements': 'el.selection,el.vitals,el.objective,el.cta', 'vis.motif': 'sigil', 'vis.motif2': 'notes', 'ast.ornamentAnchor': 'panelCorners,panelEdges,elementEnds,barEnds', 'ast.endcapShape': 'cloud', 'ast.earTabAt@el.selection': 'topLeft', 'cmp.plate@title': 'band', 'lay.headerIcon': 'item', 'vis.edge': 'printWorn', 'cmp.plateEnds': 'right', 'vis.silhouette@button': 'edgeTab', 'ix.focus': 'cornerFlourish' } };
// M12b B5：数值图形与读数——数字字形（七段 / 里程表 / 数字格式，按目标）、离散 / 仪表盘族、条的端头 / 外框 / 换色 / 附属件、生命条附属件（迁移说明 m12bB5Notes）；
// 计数读数（统计格 / 双环计数 / 序数名次）、时钟日历（昼夜盘 + 时间尺多选）、计量条（计分公式）、事件字效（填充 / 硬投影）、新事件画法（技能链 / 气泡流 / 警报列）、st.alert 多选
VARIANTS['ui-num-b5a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.racing', 'typ.numerals.family': 'sevenSeg', 'typ.numerals.weight': 'bold', 'typ.numberFormat': 'western', 'cmp.gauge@el.speed': 'tachometer', 'cmp.dialParts': 'ticks,numbers,redline,needle,centerValue', 'el.rank.form': 'ordinal', 'el.timer.form': 'raceStack', 'cmp.gaugeCap': 'pointed', 'cmp.gaugeFrame': 'double', 'cmp.gaugeColorBy': 'thresholds', 'el.speed.showPlace': 'off', 'el.feedback.form': 'chainStack', 'typ.fillStyle': 'gradient', 'typ.shadowOffset': 4 } };
VARIANTS['ui-num-b5b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'neobrutal', 'uip.layout': 'layout.colonySim', 'cnt.elements': 'el.vitals,el.resources,el.clock,el.meter,el.notify,el.timer', 'typ.numerals.family@el.resources': 'odometer', 'typ.numerals.cells@el.resources': 'inset', 'el.resources.form': 'statGrid', 'cmp.gauge@el.vitals': 'pips', 'cmp.gaugeUnits': 6, 'cmp.gaugeExtra@el.vitals': 'recoverable,statusRow', 'el.vitals.attach': 'lives,statusFace', 'el.clock.form': 'phaseDial,timelineRuler', 'el.clock.rim': 'serrated', 'el.meter.form': 'formula', 'el.timer.form': 'ringCounter', 'el.timer.caption': 'mission', 'el.notify.form': 'socialFeed,alertIcons', 'el.notify.maxItems': 2, 'st.alert': 'warnIcon,blink', 'st.statViz': 'lineChart' } };
// M12b 中期审查修复：图案作用区（vis.patternArea = shadowOnly 进 ui_surface.gdshader 的 area uniform）、按目标的渐隐只写说明、只改了标题前缀的目标不出类型变体、
// 展示字体范围外的数字仍取展示字体、密度 1 的信息流与画布同口径
VARIANTS['ui-midfix'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'vis.pattern': 'dither', 'vis.patternArea': 'shadowOnly', 'vis.patternOpacity': 0.5, 'vis.fade@el.notify': 'vertical', 'typ.display.family': 'condensed', 'typ.display.scope': 'nameplate,numerals', 'typ.numerals.family': 'display', 'typ.titlePrefix@el.objective': 'chevron', 'cnt.density': 1 } };

// M12b B6：HUD 组合——元素实例（el.vitals#2、el.threat.count）、停靠（DOCKS + _dock_place：挂牌下接资源、指令窗挂在队伍第 1 格左边、危险度圆点压在小地图右下角）、
// 元素宽高、成组托盘、骑边小件、状态带名册 + 点亮格、轨道式行动顺序、剧情条（迁移说明 m12bB6Notes）
VARIANTS['ui-hud-b6a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.pack': 'rpg', 'cnt.elements': 'el.vitals,el.vitals#2,el.clock,el.resources,el.party,el.choices,el.minimap,el.meter,el.turnOrder,el.objective,el.threat', 'el.vitals#2.attachTo': 'player', 'el.vitals#2.form': 'bar', 'el.threat.count': 2, 'el.resources.dockTo': 'el.clock', 'el.resources.dockSide': 'below', 'el.resources.dockAlign': 'center', 'el.choices.dockTo': 'el.party', 'el.choices.dockSide': 'left', 'el.choices.dockSlot': 1, 'el.meter.form': 'dangerDot', 'el.meter.dockTo': 'el.minimap', 'el.meter.dockSide': 'cornerBR', 'el.minimap.satellites': 'button', 'el.minimap.satelliteSide': 't', 'el.minimap.satelliteCount': 4, 'el.party.form': 'statusStrip', 'el.party.pointsRow': 'lightUp', 'el.party.count': 3, 'el.clock.group': 'g1', 'el.resources.group': 'g1', 'el.clock.groupFrame': 'tray', 'el.turnOrder.form': 'icons', 'el.turnOrder.track': 'double', 'el.turnOrder.segments': true, 'el.objective.form': 'storyTracker', 'el.objective.width': 0.3 } };
// 单色键位圈 + 鼠标键字形 + 指手光标 + 焦点多选（描边 + 整格填色）+ 细圈长十字 + 世界标记 + 世界标签 + 分节简报的黄框警告 + 视频通话格
VARIANTS['ui-hud-b6b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'neobrutal', 'uip.layout': 'layout.shooter', 'cnt.pack': 'shooter', 'cnt.elements': 'el.prompt,el.interact,el.crosshair,el.threat,el.worldLabel,el.objective,el.party,el.overlay', 'ix.glyphs': 'mouse', 'ix.glyphTint': 'mono', 'ix.cursorSet': 'finger', 'ix.cursorContext': true, 'ix.focus': 'outline,fill', 'el.interact.form': 'cursor', 'el.interact.itemName': true, 'el.crosshair.form': 'reticle', 'el.threat.form': 'weaknessGrid,detection,targetRow', 'el.threat.detectShape': 'eye', 'el.worldLabel.form': 'nameplate', 'el.objective.form': 'sectioned', 'st.alert': 'framedLabel', 'el.party.form': 'videoGrid', 'el.party.gap': 0, 'el.overlay.form': 'statusIcons', 'el.overlay.statusStyle': 'thoughtBubble', 'el.objective.titleColor': 'text', 'el.objective.descColor': 'objective' } };

// M12b B7：格位与卡牌——卡面版式（TCG + 语义着色）、手牌叠压 / 出屏 / 抬起 / 张数、牌堆两份（抽牌 / 弃牌）、遗物列、消耗品托盘、说明框内卡、格子状态（品质小徽 / 角星 / 斜条 / 回合禁用）；
// 新元素进 LAYOUT（迁移说明 m12bB7Notes）
VARIANTS['ui-cards-b7'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.card', 'cnt.screen': 'screen.hud', 'cnt.pack': 'deckBuilder', 'cnt.elements': 'el.abilities,el.piles,el.piles#2,el.passives,el.consumables,el.selection,el.cta', 'cmp.card': 'tcg', 'cmp.cardColorBy': 'frameLine,bannerRarity,artType,costAffordable', 'col.coding': 'lineId,rarity', 'lay.cardOverlap': 0.2, 'lay.cardBleed': 0.15, 'st.selected': 'lift', 'el.abilities.valueLabel': 'currentMax', 'el.piles#2.kinds': 'exhaust,discard', 'el.piles#2.screenAnchor': 'br', 'el.consumables.tray': 'inset', 'el.consumables.valueLabel': 'currentMax', 'el.selection.form': 'tooltip', 'el.selection.innerCard': 'white', 'st.rarityCue': 'cornerIcon,cornerStar,roman,cornerTab', 'st.cooldown@el.cta': 'turnLocked' } };
// 技能变体（指令列表 / 单位装配 / 武器读数）、增益槽、人口胶囊、世界容器、配方行、插画处理（角色剪纸、背景炭笔）
VARIANTS['ui-hud-b7'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkGold', 'uip.layout': 'layout.rpg', 'cnt.pack': 'rpg', 'cnt.elements': 'el.abilities,el.abilities#2,el.buffs,el.population,el.container,el.cost', 'el.abilities.form': 'unitLoadout', 'el.abilities#2.form': 'list', 'el.abilities#2.screenAnchor': 'mr', 'vis.silhouette@el.buffs': 'octagon', 'el.cost.form': 'recipeRow', 'el.cost.moduleSlots': 2, 'el.container.columns': 3, 'cnt.characterRender': 'cutout', 'ast.bgArtRender': 'charcoal', 'cmp.slotLabel': 'levelTag', 'st.statusMark': 'slotTint' } };
// M12b B8：数据区与图结构——自下而上的种子分叉路线 + Boss 放大 + 横长科技卡 + 进度连线 + 层列头 + 墨圈 + 当前位置头像 + 引线 + 详情字段（迁移说明 m12bB8Notes，带 layoutGraph 点位）
VARIANTS['ui-data-b8a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.skilltree', 'cnt.pack': 'tactics', 'lay.arrangement': 'tree', 'lay.flowDir': 'up', 'lay.branching': 'seeded', 'lay.layers': 8, 'lay.rootEmphasis': 'end', 'cmp.node': 'rowCard', 'vis.connector': 'progress', 'vis.connectorWeight': 'byValue', 'lay.grouping': 'header', 'st.done': 'inkCircle', 'lay.currentMarker': 'avatar', 'cmp.leader': 'curve', 'lay.detail': 'persistent', 'cmp.detailFields': 'derive' } };
// 分段数据区 + 子栏 + 格组 + 详情两栏 + 列表行字段 + 选择条 + 硬边书（衬页 + 翻页角）
VARIANTS['ui-data-b8b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'parchment', 'uip.screen': 'tpl.inventory', 'cnt.pack': 'soulslike', 'lay.sections': 'row,grid,stats', 'lay.subColumns': 2, 'cmp.slotGroup': 'counted', 'lay.detail': 'wide', 'cmp.listRow': 'icon,title,upgrade,grade', 'cmp.listHeader': 'selectorStrip', 'ast.container': 'book', 'ast.bookStyle': 'flat', 'ast.pageLeft': 'endpaper', 'ast.pageRight': 'framed', 'lay.overflow': 'paged', 'lay.pageIndicator': 'pageCurl' } };
// M12b B9：控件与对话——侧栏选中面板（贴右 + 新详情字段）、三联 CTA、两层抽屉工具条（屏幕代号 + 镜头箭头 / 圆暂停）、指令列表选项（键位徽章 / 焦点箭头 / 压灰项）、
// 行情跑马条、人名条、取景框、骑边计数、引文字卡贴满屏宽（迁移说明 m12bB9Notes；新元素进 LAYOUT）
VARIANTS['ui-ctrl-b9a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.pack': 'cityBuilder', 'cnt.elements': 'el.selection,el.cta,el.toolbar,el.choices,el.ticker,el.lowerThird,el.viewfinder,el.minimap,el.subtitle', 'el.selection.form': 'sidePanel', 'el.selection.edge': 'right', 'cmp.detailFields@el.selection': 'name,statusRow,memberList,quantity', 'cmp.quantity': 'stepperMinMax', 'el.cta.form': 'triple', 'el.toolbar.form': 'drawer', 'el.toolbar.screenCode': 'code', 'el.toolbar.extras': 'cameraArrows,roundPause', 'el.choices.form': 'commandList', 'el.choices.keyBadge': 'start', 'el.choices.focusMark': 'arrow', 'el.choices.lockedItem': 2, 'el.ticker.form': 'stocks', 'el.lowerThird.form': 'tag', 'el.viewfinder.form': 'cctv', 'el.minimap.satellites': 'counters', 'el.subtitle.form': 'quoteCard', 'el.subtitle.span': 'full' } };
// 设置页：两层小框 + 逐行控件（骰子 / 色块 / 色相三联 / 旋钮 / 推子 / 带极值步进器）+ 外侧缩略图列 + 勋章两行抬头 + 居中圆点页签挂在容器外 + 左外侧按钮列
VARIANTS['ui-form-b9b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.settings', 'cmp.optionLayout': 'stacked', 'cmp.optionRows': 'dice,swatch,hsvTriplet,knob,fader,stepperMinMax,toggleSwitch', 'lay.sideThumbs': 'right', 'lay.panelHeader': 'crestTwoLine', 'lay.nav': 'tabsTop', 'lay.navAlign': 'center', 'lay.navSeparator': 'dot', 'cmp.tabMount': 'outsideTop', 'lay.sideButtons': 'left' } };
// 对话：通讯框 + 尖刺尾 + 花饰续读 + 检定标签选项（无默认高亮）+ 说话人前缀
VARIANTS['ui-dlg-b9c'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.npc', 'cmp.dialogBox@dialog': 'codec', 'cmp.dialogTail': 'spike', 'ix.continueCue': 'ornament', 'el.choices.labelStyle': 'checkTag', 'el.choices.defaultFocus': 'none', 'el.subtitle.speaker': 'prefix' } };
// RPG 战斗结算 + 分角双钮 + 句内填空（批量确认）不在同一屏：结算页一组、推理页一组
VARIANTS['ui-scr-b9d'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.settle', 'cnt.subtype': 'rpgSettle', 'el.cta.form': 'splitCorners', 'lay.windowLink': 'elbow' } };
VARIANTS['ui-scr-b9e'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'parchment', 'uip.screen': 'tpl.settings', 'cmp.formKind': 'inlineBlanks', 'ix.confirm': 'batch', 'lay.nav': 'breadcrumb' } };
// 标题块：告示（不写主标题）
VARIANTS['ui-title-b9f'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'parchment', 'uip.screen': 'tpl.chapterCard', 'el.title.form': 'notice', 'el.title.name': 'none' } };

// M12b B10：地图画风与图例——世界地图六角海图 + 云团迷雾 + 房间状态 / 路线 / 楼层页签 / 罗盘、比例尺、图例（迁移说明 m12bB10Notes）
VARIANTS['ui-map-b10a'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'parchment', 'uip.screen': 'tpl.worldmap', 'vis.mapStyle': 'hexChart', 'vis.mapUnexplored': 'cloudSwirl', 'vis.mapRoomStates': 'states', 'vis.mapRoute': 'dashed', 'vis.mapFloors': 'left', 'vis.mapFurniture': 'compassRose,scaleBar,legend' } };
// 局内 HUD：线稿小地图（宽幅、朝向朝上、图层、卷角）+ 线路网叠加与图例 + 指令窗跟着当前行动者（DOCKS 的宿主第几格 = 当前成员）+ 铁梁 + 整块倾斜 +
// 按角色像素化（数字 / 面板）+ 套印错位、做旧、叠纸、K1 饰件 + 竖长大色块钮 + 盲注名牌 + 样本血量（hud_sample.gd 的生命条起点）+ 静帧姿态
VARIANTS['ui-hud-b10b'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.layout': 'layout.rpg', 'cnt.pack': 'cityBuilder', 'cnt.elements': 'el.vitals,el.minimap,el.overlay,el.party,el.choices,el.toolbar,el.objective', 'vis.mapStyle@el.minimap': 'linePlan', 'el.minimap.aspect': 'wide', 'el.minimap.rotate': 'headingUp', 'el.minimap.layers': 'terrain,roads,route', 'el.minimap.cornerCurl': 'one', 'el.overlay.form': 'routeLines', 'el.overlay.legendStyle': 'swatches', 'el.choices.dockTo': 'el.party', 'el.choices.dockSide': 'left', 'el.choices.dockFollow': 'active', 'el.choices.dockConnector': 'ironBeam', 'vis.tilt': 3, 'vis.tiltMode': 'alternate', 'vis.tiltLayers': 'boxAndContent', 'vis.pixelRoles': 'numerals,frame', 'vis.misregister': 2, 'ast.aging': 'yellowed,creases', 'vis.depth': 'layeredPaper', 'ast.ornaments': 'paperclip,washiTape,waxSeal', 'el.toolbar.form': 'bigButtons', 'el.objective.form': 'blindPlate', 'cnt.sampleHp': 0.23, 'chk.simPose': 'lowHp' } };
// 界面模板：漩涡替换背景 + 冰雾边缘遮罩 + 第二层水印 + 居中顶条 / 贯穿分隔线 + 角上返回牌 + 主窗 + 侧栏 + 逐行换字 + 毛玻璃三件 + 光源方向
VARIANTS['ui-scr-b10c'] = { recipe: 'inspiration-fixed', extra: { 'hud.style': 'darkHairline', 'uip.screen': 'tpl.quest', 'rel.behind': 'replaced', 'ast.bgArt': 'shaderSwirl', 'ast.screenEdge': 'frostSmoke', 'ast.watermark': 'glyphBand', 'ast.watermark2': 'doodles', 'flow.chrome': 'topStrip,topRule', 'ix.close': 'cornerSign', 'lay.container': 'panels', 'typ.mix': 'perLine', 'vis.blurTint': '@accent', 'vis.edgeLight': 'topLeft', 'vis.grain': 0.4, 'vis.depth': 'soft3d', 'vis.lightAngle': 45 } };

// --ui：只跑 UI / HUD 变体（同一个固定场景上叠 UI），改 HUD 时不必把 43 个画面配方和美术功能变体再跑一遍
const argv = process.argv.slice(2);
const named = argv.filter((a) => !a.startsWith('--'));
const ids = named.length ? named
  : argv.includes('--ui') ? Object.keys(VARIANTS).filter((k) => k.startsWith('ui-'))
  : [...RECIPES.map((r) => r.id), ...Object.keys(VARIANTS)];
const root = join(process.cwd(), 'qa', 'godot');
const report: { id: string; ok: boolean; errors: string[] }[] = [];

for (const id of ids) {
  const vr = VARIANTS[id];
  const r = RECIPES.find((x) => x.id === (vr?.recipe ?? id));
  if (!r) continue;
  const v = { ...defaultValues(), ...r.values, ...(vr?.extra ?? {}) };
  const dir = join(root, id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const pkg = godotPackage(v);
  for (const f of pkg) {
    const out = join(dir, f.path);
    mkdirSync(dirname(out), { recursive: true });
    // 素材 PNG 从 public/assets/tex 原样拷贝；UI 字体从 src/assets/fonts、许可原文从 public/fonts
    if (f.asset) copyFileSync(join(process.cwd(), 'public', 'assets', 'tex', f.asset), out);
    else if (f.font) copyFileSync(join(process.cwd(), 'src', 'assets', 'fonts', f.font), out);
    else if (f.license) copyFileSync(join(process.cwd(), 'public', 'fonts', f.license), out);
    else writeFileSync(out, f.text, 'utf8');
  }
  // 位图外框由主题 .tres 的 ext_resource 引用，要先导入（编辑器打开工程时会自动做）；没导入时主题加载失败、缺 GAE_HUD_OK
  if (pkg.some((f) => f.path.startsWith('ui/tex/'))) {
    const imp = spawnSync(GODOT, ['--headless', '--path', dir, '--import'], { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
    if (imp.status !== 0) console.log(`  （${id}：导入步骤退出码 ${imp.status}${imp.error ? `，${String(imp.error)}` : ''}）`);
  }
  // --quit-after：脚本解析失败时场景照样运行，靠它退出（正常情况脚本在第 20 帧截图后自己退出）
  // 标准输出和标准错误都要读：Godot 正常退出时，着色器编译错误只打在标准错误里
  // （2026-10-13 之前只读了标准输出，退出码为 0 时漏掉了这些错误）
  const res = spawnSync(GODOT, ['--path', dir, '--resolution', '960x540', '--position', '0,0', '--quit-after', '900', '--', '--shot'], { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}${res.error ? `\nERROR: ${String(res.error)}` : ''}`;
  const errors = out.split(/\r?\n/).filter((l) => /SHADER ERROR|Parse Error|SCRIPT ERROR|ERROR:|error\(/i.test(l) && !/vulkan|d3d12|Failed to load|ignoring|^\s*$/i.test(l));
  // 有游戏 UI 的包必须打印成功标记：资源没加载（"Failed to load" 被上面过滤掉）、脚本没跑到底都会缺这一行
  const hasHud = pkg.some((f) => f.path === 'ui/hud_sample.gd');
  if (hasHud && !/GAE_HUD_OK/.test(out)) errors.push('缺少游戏 UI 成功标记 GAE_HUD_OK（ui/hud_sample.gd 没有跑完）');
  for (const l of out.split(/\r?\n/)) if (/GAE_HUD_FAIL|GAE_HUD font/.test(l) && !errors.includes(l)) errors.push(l);
  report.push({ id, ok: errors.length === 0, errors: errors.slice(0, 12) });
  console.log(`${errors.length ? '✗' : '✓'} ${id}${errors.length ? `\n   ${errors.slice(0, 8).join('\n   ')}` : ''}`);
}
writeFileSync(join(root, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.filter((r) => r.ok).length}/${report.length} 通过`);
