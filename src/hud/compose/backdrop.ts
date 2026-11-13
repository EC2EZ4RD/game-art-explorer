import { drawGreybox, PLACEHOLDER } from '../greybox';
import { fillMaterial, MATERIAL_BASE, mix, parseColor, withAlpha } from '../material';
import { drawBox, drawPattern, MEASURE_ONLY, QUALITY, resolveColor, type Rect } from '../paint';
import { simNow } from '../sim';
import { afterSkin, type Theme } from '../sys/theme';
import { doodlePath, glyph, VECTOR_MOTIFS } from '../ornament';
import { bgAssetFile, drawImageFitFx, drawInkTitle } from '../uiAssets';
import { pack } from '../content';
import type { DrawCtx } from './sample';
import { withPixRole } from '../pixelRoles';

/*
 * 背景与场景处理（M12a-24，§2 的 backdrop.ts）：界面模板（compose/screen.ts）、菜单样本（compose/menu.ts）与局内 HUD（HudSystem）共用。
 *   drawBackdrop：rel.behind = replaced 时的替换背景（ast.bgArt 全部取值），铺满整张画布（d.full，钉住画幅时黑边以内的 R 只用来排内容，顶边不再漏一行世界画面）；
 *     实时 / 冻结时按 sceneTreatment 处理背后的画面。
 *   drawWatermark：ast.watermark 水印（模板里画在背景之上、容器之下；菜单样本画在详情区）。
 *   sceneTreatment：先按 rel.dim 压暗，再按 rel.sceneTone（多选）着色 / 去色 / 暗角，暗角强度 rel.vignette。
 * HUD 画布是叠在 3D 画面上的透明层（OUTPUT 着色器里合成），画不了真正的正片叠底 / 去色：着色是压暗之后的一层薄色、去色是灰幕；
 * 真去色、先压暗再着色的后处理版见 M12c-11。Godot：全屏 TextureRect / ColorRect + CanvasItem shader（dim / tint / vignette 作 uniform）。
 */

/** 显式给了（预设 / 手动 / 适配，不是默认 / 兜底 / 派生规则补的）：替换背景与局内 HUD 只在这时做场景处理（原来不做，默认画面不变） */
export function relSet(th: Theme, k: string): boolean {
  const l = th.r.src(k)?.layer;
  return !!l && l !== 'default' && l !== 'fallback' && l !== 'ruleDefault' && l !== 'derived';
}

/** 背后调色的取值（rel.sceneTone 改成多选，M12a-24：tint + vignette = 中间暗、四周染色；原来存的单个字符串照样读） */
export const sceneTones = (th: Theme) => th.r.list('rel.sceneTone').filter((x) => x && x !== 'none' && x !== 'auto');

/**
 * 场景处理（M12a-24）：dim = 压暗多少（调用方按 rel.dim / 冻结 / 默认算好）；blur = 背后虚化（借毛玻璃通道）。
 *   desaturate / mono：灰幕（原来的画法，透明度至少 0.45）；没有它们时是黑色压暗。
 *   tint：压暗之后叠一层强调色薄色（原来把强调色平涂到 max(压暗, 0.35)，吃掉了压暗，XCOM 的蓝黑地球被刷成发亮的浅粉）；
 *   duotone：强调色 → 第二强调色的斜向渐变薄色；vignette：径向暗角，强度 rel.vignette（没给时 0.6，原来的），同时选了 tint 时暗角是强调色（中间暗、四周红）。
 * 只选了 vignette / 什么都没选时与原来逐像素一样
 */
export function sceneTreatment(d: Pick<DrawCtx, 'ctx'>, R: Rect, th: Theme, o: { dim: number; blur?: number }) {
  const g = d.ctx, tones = sceneTones(th), r = th.r;
  const accent = resolveColor('@accent', th.pal), accent2 = resolveColor('@accent2', th.pal);
  const gray = tones.includes('desaturate') || tones.includes('mono');
  const tint = tones.includes('tint'), duo = tones.includes('duotone');
  // 暗罩颜色（rel.dimColor，M12b-41，elden-ring#32 的暖褐橄榄灰）：显式给了时压暗用它，否则原来的中性黑
  const dc = relSet(th, 'rel.dimColor') ? r.str('rel.dimColor', 'auto') : 'auto', dimC = dc && dc !== 'auto' ? resolveColor(dc, th.pal) : null;
  const base = gray ? `rgba(70,70,70,${Math.max(o.dim, 0.45)})` : dimC ? withAlpha(dimC, o.dim) : `rgba(0,0,0,${o.dim})`;
  drawBox(g, R, { bg: { solid: base }, backdropBlur: o.blur && o.blur > 0 ? o.blur : undefined }, th.pal);
  if (tint) { g.fillStyle = withAlpha(accent, 0.22); g.fillRect(R.x, R.y, R.w, R.h); }
  if (duo) {
    const gr = g.createLinearGradient(R.x, R.y, R.x + R.w, R.y + R.h);
    gr.addColorStop(0, withAlpha(accent, 0.24)); gr.addColorStop(1, withAlpha(accent2, 0.24));
    g.fillStyle = gr; g.fillRect(R.x, R.y, R.w, R.h);
  }
  // 双色网点（rel.sceneTone = halftone，M12b-42，disco-elysium#25）：画布版是一层强调色 / 第二强调色的双色网屏（缓存图块）盖在背后；按场景亮度重画网点的后处理版见 M12c-11
  if (tones.includes('halftone')) drawPattern(g, R, { kind: 'halftoneDuo', opacity: 0.42, color: accent, colors: [accent, accent2] }, th.pal);
  // 方向性暗罩（rel.sceneTone = directional + rel.toneDir，M12b-41）：一侧 / 两侧更暗（颜色 = 暗罩色），around = 四周
  if (tones.includes('directional')) {
    const dir = r.str('rel.toneDir', 'leftBottom'), c = dimC ?? '#000', k = Math.min(0.85, Math.max(0.35, o.dim + 0.25));
    const side = (x0: number, y0: number, x1: number, y1: number) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, withAlpha(c, k)); gr.addColorStop(1, withAlpha(c, 0)); g.fillStyle = gr; g.fillRect(R.x, R.y, R.w, R.h); };
    if (dir === 'left' || dir === 'leftBottom') side(R.x, 0, R.x + R.w * 0.6, 0);
    if (dir === 'right') side(R.x + R.w, 0, R.x + R.w * 0.4, 0);
    if (dir === 'top') side(0, R.y, 0, R.y + R.h * 0.6);
    if (dir === 'bottom' || dir === 'leftBottom') side(0, R.y + R.h, 0, R.y + R.h * 0.45);
    if (dir === 'around') {
      const v = g.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, Math.min(R.w, R.h) * 0.25, R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w, R.h) * 0.72);
      v.addColorStop(0, withAlpha(c, 0)); v.addColorStop(1, withAlpha(c, k)); g.fillStyle = v; g.fillRect(R.x, R.y, R.w, R.h);
    }
  }
  // 雾带（rel.fogBand，M12b-41）：底部一条横向的浅色雾（暗罩色提亮），强度 0~1
  const fog = relSet(th, 'rel.fogBand') ? Math.max(0, Math.min(1, r.num('rel.fogBand', 0))) : 0;
  if (fog > 0) {
    const fc = mix(dimC ?? '#202020', '#ffffff', 0.45), y0 = R.y + R.h * 0.62, y1 = R.y + R.h;
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, withAlpha(fc, 0)); gr.addColorStop(0.55, withAlpha(fc, 0.42 * fog)); gr.addColorStop(1, withAlpha(fc, 0.12 * fog));
    g.fillStyle = gr; g.fillRect(R.x, y0, R.w, y1 - y0);
  }
  const vk = relSet(th, 'rel.vignette') ? Math.max(0, Math.min(1, r.num('rel.vignette', 0.6))) : 0;
  if (tones.includes('vignette') || vk > 0) {
    const k = relSet(th, 'rel.vignette') ? vk : 0.6, c = tint ? accent : '#000';
    const v = g.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, Math.min(R.w, R.h) * 0.3, R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w, R.h) * 0.7);
    v.addColorStop(0, tint ? withAlpha(c, 0) : 'rgba(0,0,0,0)'); v.addColorStop(1, tint ? withAlpha(c, k) : `rgba(0,0,0,${k})`); g.fillStyle = v; g.fillRect(R.x, R.y, R.w, R.h);
  }
}

/** 位图大比例缩小：临时打开平滑并用 high 质量，画完还原（与 screen.ts / menu.ts 的 smooth 同口径） */
function smooth(g: CanvasRenderingContext2D, fn: () => boolean): boolean {
  const on = g.imageSmoothingEnabled, q = g.imageSmoothingQuality;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const ok = fn();
  g.imageSmoothingEnabled = on;
  g.imageSmoothingQuality = q;
  return ok;
}

/** 两处原来各自的灰盒名（模板 / 菜单样本），沿用 */
const BG_LABEL = { template: { keyArt: '主视觉海报', sceneArt: '风景插画', comicPanels: '漫画分格' }, menu: { keyArt: '主视觉插画', sceneArt: '场景插画', comicPanels: '漫画分格' } } as Record<string, Record<string, string>>;

/** col.surface2 显式给了（旧皮肤要皮肤之后的层）：纯色 / 材质 / 舞台背景的底色用它 */
function surface2(th: Theme): string | undefined {
  const c = th.r.str('col.surface2', 'auto');
  if (!c || c === 'auto') return undefined;
  if (th.legacy ? !afterSkin(th.r, 'col.surface2') : !relSet(th, 'col.surface2')) return undefined;
  return resolveColor(c, th.pal);
}

/**
 * 替换背景（rel.behind = replaced 的 ast.bgArt，M12a-24：合并原来 screen.ts 的 backdrop 与 menu.ts 的 drawBackdrop，两边共用）：
 *   keyArt / sceneArt：位图铺满（主视觉贴底）；没有素材时灰盒；comicPanels：灰盒；
 *   solid：col.surface2（显式给了时；原来模板是场景墨色压暗六成、菜单是纸色压暗 8%，没给照旧）；gradient：天色 → 纸色（原来的）；
 *   material：ast.bgMat 材质（底色 col.surface2，纹理方向 ast.bgMatAngle；原来模板里退回浅色渐变）；
 *   starfield：深蓝底 + 星点；spotlightStage：暗场 + 中心一团暖色柔光（光色 = 强调色降饱和再偏暖）+ 暗角；pattern：暗底 + 斜纹（模板里原来都退回浅色渐变）。
 * 铺满 d.full（整张画布，没给时 R）；之后 rel.dim / rel.sceneTone / rel.vignette 显式给了才在上面做场景处理（原来替换背景不做）——o.sceneFx = false 时不做
 * （局内 HUD 的 hudBackdrop：场景处理由 hudSceneTreatment 统一做一次，B10 审查修复 ②：原来两处各做一遍，压暗 / 着色叠了两层）。返回画上去的位图背景
 */
export function replacedBackdrop(d: DrawCtx, R: Rect, th: Theme, flavor: 'template' | 'menu' = 'template', o: { sceneFx?: boolean } = {}): string | undefined {
  const g = d.ctx, r = th.r, pal = th.pal, F = d.full ?? R;
  const bg0 = r.str('ast.bgArt', 'gradient');
  // 主视觉海报只有带主视觉的内容包才有（雪线旅人）：别的包在品质下限开着时换成所有包共用的风景插画（审查修复 E 视觉 ⑥：标题页铺主视觉，原来是整块灰盒）
  const bg = bg0 === 'keyArt' && !bgAssetFile('keyArt') && QUALITY.on && !PLACEHOLDER.qa ? 'sceneArt' : bg0;
  let shown: string | undefined;
  const file = bgAssetFile(bg);
  // 背景位图的画法处理（ast.bgArtRender，M12b-32，frostpunk#43：结局回顾的炭笔 / 铅笔速写）：选过才处理（旧皮肤只认皮肤之后的层）
  const bgFx = th.legacy && !afterSkin(r, 'ast.bgArtRender') ? 'color' : r.str('ast.bgArtRender', 'color');
  if (file && smooth(g, () => drawImageFitFx(g, file, F, 'cover', bg === 'keyArt' ? [0.5, 1] : [0.5, 0.5], bgFx === 'color' || bgFx === 'auto' ? 'color' : bgFx))) shown = bg;
  else if (BG_LABEL[flavor][bg]) drawGreybox(g, F, `${BG_LABEL[flavor][bg]}（需素材）`, { opaque: true, labelTop: true });
  // 程序画的全屏背景（M12b-51：漩涡底 / 像素云天 / 背光透射）
  else if (SCREEN_BG.has(bg)) screenBg(g, F, th, bg);
  else {
    const s2 = surface2(th);
    g.save();
    if (bg === 'solid') { g.fillStyle = s2 ?? (flavor === 'menu' ? mix(pal.paper, '#000', 0.08) : mix(pal.ink, '#000', 0.6)); g.fillRect(F.x, F.y, F.w, F.h); }
    else if (bg === 'material') {
      const mat = r.str('ast.bgMat', 'paper'), ang = r.num('ast.bgMatAngle', 0);
      if (!ang) fillMaterial(g, F.x, F.y, F.w, F.h, mat, s2 ?? MATERIAL_BASE[mat]);
      else {
        // 纹理方向（ast.bgMatAngle，度）：绕画面中心转，铺一块够大的方形再裁回画面
        const D = Math.hypot(F.w, F.h);
        g.beginPath(); g.rect(F.x, F.y, F.w, F.h); g.clip();
        g.translate(F.x + F.w / 2, F.y + F.h / 2); g.rotate((ang * Math.PI) / 180);
        fillMaterial(g, -D / 2, -D / 2, D, D, mat, s2 ?? MATERIAL_BASE[mat]);
      }
    } else if (bg === 'starfield') {
      g.fillStyle = s2 ?? '#0b1022'; g.fillRect(F.x, F.y, F.w, F.h);
      g.fillStyle = 'rgba(255,255,240,0.85)';
      for (let i = 0; i < 160; i++) { const x = F.x + ((i * 7919) % 1000) / 1000 * F.w, y = F.y + ((i * 104729) % 997) / 997 * F.h; g.fillRect(x, y, i % 9 ? 1 : 2, i % 9 ? 1 : 2); }
    } else if (bg === 'spotlightStage') {
      g.fillStyle = s2 ?? '#111'; g.fillRect(F.x, F.y, F.w, F.h);
      const light = mix(mix(resolveColor('@accent', pal), '#8a8a8a', 0.55), '#ffe2b0', 0.5);
      const gr = g.createRadialGradient(F.x + F.w / 2, F.y + F.h * 0.4, 10, F.x + F.w / 2, F.y + F.h * 0.4, F.w * 0.55);
      gr.addColorStop(0, withAlpha(light, 0.38)); gr.addColorStop(1, withAlpha(light, 0));
      g.fillStyle = gr; g.fillRect(F.x, F.y, F.w, F.h);
      const v = g.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, Math.min(F.w, F.h) * 0.35, F.x + F.w / 2, F.y + F.h / 2, Math.max(F.w, F.h) * 0.72);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(F.x, F.y, F.w, F.h);
    } else if (bg === 'pattern') {
      g.fillStyle = s2 ?? mix(pal.ink, '#000', 0.55); g.fillRect(F.x, F.y, F.w, F.h);
      g.strokeStyle = withAlpha(pal.paper, 0.07); g.lineWidth = 6;
      for (let x = F.x - F.h; x < F.x + F.w; x += 28) { g.beginPath(); g.moveTo(x, F.y + F.h); g.lineTo(x + F.h, F.y); g.stroke(); }
    } else {
      const gr = g.createLinearGradient(0, F.y, 0, F.y + F.h);
      gr.addColorStop(0, pal.sky); gr.addColorStop(1, pal.paper);
      g.fillStyle = gr; g.fillRect(F.x, F.y, F.w, F.h);
    }
    g.restore();
  }
  // 替换背景上的场景处理：显式给了 rel.dim / rel.sceneTone / rel.vignette 才做（原来替换背景什么都不做，暗角对它无效）
  if (o.sceneFx !== false && (relSet(th, 'rel.dim') || sceneTones(th).length || relSet(th, 'rel.vignette') || relSet(th, 'rel.fogBand'))) sceneTreatment(d, F, th, { dim: relSet(th, 'rel.dim') ? r.num('rel.dim', 0) : 0 });
  return shown;
}

const WM_LABEL: Record<string, string> = { factionEmblem: '阵营徽记', calligraphy: '书法水印', faintPainting: '淡彩画', totem: '图腾' };
const inset = (r: Rect, l: number, t = l): Rect => ({ x: r.x + l, y: r.y + t, w: r.w - l * 2, h: r.h - t * 2 });

/**
 * 水印（ast.watermark，M12a-24 从 menu.ts 搬来，模板与菜单样本共用）：徽记 / 书法 / 淡彩画 / 图腾需要素材（书法有当前包的书法字时画位图，其余是半透明灰盒），
 * sigil 圆环 + 三角、logo 游戏的单字徽记、mapLines 等高线、bigText 英文大字按 opacity（ast.watermarkOpacity）画成 color 色。
 * motif / level（M12b-43）：sigil 水印在母题是 B4 的新母题（神秘学 sigil、卷草、原子……）时画成大号的母题符号（level = 变体：倒五芒星 / 全视之眼 / 王冠）
 */
export function drawWatermark(g: CanvasRenderingContext2D, a: Rect, kind: string, color: string, opacity: number, motif = '', level = 0) {
  if (!kind || kind === 'none') return;
  g.save();
  g.beginPath(); g.rect(a.x, a.y, a.w, a.h); g.clip();
  if (kind === 'calligraphy') {
    // 书法水印：书法标题位图按字色着色，透明度同其余水印；当前内容包没有书法字（drawInkTitle 返回 false）时落到下面的灰盒
    const a0 = g.globalAlpha;
    g.globalAlpha = opacity;
    if (smooth(g, () => drawInkTitle(g, inset(a, a.w * 0.06, a.h * 0.18), color, 'center'))) { g.restore(); return; }
    g.globalAlpha = a0;
  }
  // 缺素材的水印（M12b-68，black-myth#45）：只按水印强度（ast.watermarkOpacity，至少 0.1）描一圈虚线框 + 小字，不再铺斜纹灰底——原来的灰盒比任何水印都显眼
  if (WM_LABEL[kind]) { drawGreybox(g, inset(a, a.w * 0.2, a.h * 0.2), `${WM_LABEL[kind]}（需素材）`, { faint: Math.max(0.1, opacity), small: true }); g.restore(); return; }
  g.globalAlpha = opacity;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 3;
  const cx = a.x + a.w * 0.62, cy = a.y + a.h * 0.55, s = Math.min(a.w, a.h) * 0.42;
  if (kind === 'sigil' && VECTOR_MOTIFS.has(motif)) { g.translate(cx, cy); g.lineWidth = Math.max(2, s * 0.035); glyph(g, motif, s * 2, level); }
  else if (kind === 'sigil') {
    g.beginPath(); g.arc(cx, cy, s, 0, Math.PI * 2); g.stroke();
    g.beginPath(); for (let i = 0; i <= 3; i++) { const t = (i / 3) * Math.PI * 2 - Math.PI / 2; const x = cx + Math.cos(t) * s * 0.85, y = cy + Math.sin(t) * s * 0.85; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  } else if (kind === 'logo') {
    g.font = `900 ${s * 1.6}px "GAE Serif", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pack().game.glyph, cx, cy);
  } else if (kind === 'mapLines') {
    g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { g.beginPath(); for (let x = a.x; x <= a.x + a.w; x += 8) { const y = a.y + a.h * (0.15 + i * 0.12) + Math.sin(x / 40 + i) * 8; if (x === a.x) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  } else if (kind === 'bigText') {
    g.font = `900 ${a.h * 0.5}px "GAE Grotesk", "GAE Sans", sans-serif`; g.textBaseline = 'middle'; g.fillText(pack().menu.titleEn, a.x + 6, cy);
  } else if (kind === 'glyphBand' || kind === 'hexVignette') {
    // 异星字带 / 六角暗角当水印（M12b-51，xcom2#10）：与 ast.screenEdge 同一套画法，透明度按水印强度
    edgeLayer(g, a, kind, color, 1, motif);
  } else if (kind === 'doodles') {
    // 页边涂鸦（M12b-51）：沿四边散几个手画小图案——螺旋、星、箭头、波浪线（确定的位置）
    g.lineWidth = Math.max(1.5, Math.min(a.w, a.h) * 0.004); g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const side = i % 4, u = 0.08 + rnd(i * 7) * 0.84, inset = Math.min(a.w, a.h) * (0.05 + rnd(i * 7 + 1) * 0.04), sz = Math.min(a.w, a.h) * (0.025 + rnd(i * 7 + 2) * 0.025);
      const x = side === 0 || side === 2 ? a.x + u * a.w : side === 1 ? a.x + a.w - inset : a.x + inset, y = side === 0 ? a.y + inset : side === 2 ? a.y + a.h - inset : a.y + u * a.h;
      // 与页边涂鸦饰件（ornament.ts 的 marginDoodles）同一套笔画（B10 审查修复 ⑧）
      doodlePath(g, i % 4, x, y, sz);
      g.stroke();
    }
  } else if (kind === 'lensBokeh') {
    // 光斑 / 散景（M12b-51）：大小不一的柔边圆斑（径向渐变），偏向画面两侧
    for (let i = 0; i < 18; i++) {
      const x = a.x + (rnd(i * 5) < 0.5 ? rnd(i * 5 + 1) * 0.35 : 0.65 + rnd(i * 5 + 1) * 0.35) * a.w, y = a.y + rnd(i * 5 + 2) * a.h, rr = Math.min(a.w, a.h) * (0.03 + rnd(i * 5 + 3) * 0.09);
      const gr = g.createRadialGradient(x, y, rr * 0.2, x, y, rr); gr.addColorStop(0, withAlpha(color, 0.9)); gr.addColorStop(0.7, withAlpha(color, 0.45)); gr.addColorStop(1, withAlpha(color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

/**
 * 局内 HUD 的场景处理（M12a-24）：rel.dim / rel.sceneTone / rel.vignette 显式设置时才在元素下面压暗 / 着色（Cyberpunk 扫描模式下世界整体压暗染色）；
 * 默认不画（原来局内 HUD 完全不读它们）。HudSystem 的元素 HUD 分支与只画元素的叠加模板调用
 */
export function hudSceneTreatment(d: Pick<DrawCtx, 'ctx'>, R: Rect, th: Theme) {
  const dim = relSet(th, 'rel.dim') ? th.r.num('rel.dim', 0) : 0, blur = relSet(th, 'rel.sceneBlur') ? th.r.num('rel.sceneBlur', 0) : 0;
  if (dim <= 0 && blur <= 0 && !sceneTones(th).length && !relSet(th, 'rel.vignette') && !relSet(th, 'rel.fogBand')) return;
  sceneTreatment(d, R, th, { dim, blur });
}

/* ---------------- M12b-51 全屏层（画布版）：漩涡底 / 像素云天 / 背光透射、屏幕边缘遮罩、新水印 ---------------- */

/** 全屏背景的新取值（ast.bgArt）：程序画的，不要素材 */
export const SCREEN_BG = new Set(['shaderSwirl', 'skyClouds', 'backlight']);
/** 0~1 的确定伪随机（种子 i） */
const rnd = (i: number) => { let x = (i + 1) * 2654435761; x ^= x >>> 13; x = Math.imul(x, 1274126177); x ^= x >>> 16; return ((x >>> 0) % 100000) / 100000; };
/** 值噪声的格点表（256 × 256，按 rnd 哈希一次建好：逐像素的漩涡底不再逐点算哈希，快几倍；周期 256 格，画面里用不到那么远） */
let LAT: Float32Array | null = null;
const lattice = () => { if (!LAT) { LAT = new Float32Array(65536); for (let i = 0; i < 65536; i++) LAT[i] = rnd((((i >> 8) * 73856093) ^ ((i & 255) * 19349663)) & 0x7fffffff); } return LAT; };
/** 二维值噪声（格点表 + 平滑插值），0~1 */
function vnoise(x: number, y: number): number {
  const L = lattice(), xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, a = (xi & 255) << 8, a1 = ((xi + 1) & 255) << 8, b0 = yi & 255, b1 = (yi + 1) & 255;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (L[a | b0] * (1 - u) + L[a1 | b0] * u) * (1 - v) + (L[a | b1] * (1 - u) + L[a1 | b1] * u) * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * 0.55 + vnoise(x * 2.03, y * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1) * 0.15;
/** 背景参数（显式给了才用，旧皮肤只认皮肤之后的层）：ast.bgFlow / bgWarp 0~1，没给 0.5；ast.bgConfetti；ast.bgForeground */
function bgNum(th: Theme, k: string, def: number): number {
  if (th.legacy ? !afterSkin(th.r, k) : !relSet(th, k)) return def;
  return Math.max(0, Math.min(1, th.r.num(k, def)));
}
const bgStr = (th: Theme, k: string, def: string) => (th.legacy ? !afterSkin(th.r, k) : !relSet(th, k)) ? def : th.r.str(k, def);

/**
 * 漩涡的三色（ast.bgColors，B10 审查修复 ⑯）：有序列表，第 1 / 2 / 3 项 = 低值色 / 中值色 / 亮边色，项是颜色角色名（accent / accent2 / surface / good / bad / warn / text）或 #hex，
 * auto 占位 = 这一项用默认；没写（旧皮肤：皮肤之后没给）= 强调色 / 第二强调色 / 面板底色（原来的）
 */
export function bgColorsOf(th: Theme): [string, string, string] {
  const def: [string, string, string] = [resolveColor('@accent', th.pal), resolveColor('@accent2', th.pal), resolveColor(th.surface, th.pal)];
  if (th.legacy ? !afterSkin(th.r, 'ast.bgColors') : !relSet(th, 'ast.bgColors')) return def;
  const ro = th.roles as unknown as Record<string, unknown>;
  const pick = (c: string) => (c.startsWith('#') || c.startsWith('rgb') ? c : c === 'surface' ? resolveColor(th.surface, th.pal) : c === 'text' ? resolveColor(th.text, th.pal) : c === 'accent' || c === 'accent2' ? resolveColor(`@${c}`, th.pal) : typeof ro[c] === 'string' ? (ro[c] as string) : resolveColor(c.startsWith('@') ? c : `@${c}`, th.pal, ''));
  const L = th.r.list('ast.bgColors');
  return def.map((d0, i) => { const c = L[i]; if (!c || c === 'auto') return d0; return pick(c) || d0; }) as [string, string, string];
}
/** 漩涡底的低分辨率画布缓存：键 = 颜色 + 流速 + 扭曲 + 时刻（按 1/15 s 量化：动起来时隔一帧重算一张）+ 尺寸；只留最近 2 张（A / B 两侧），时刻往前走时把最旧的那张拿来重画（不每帧新建画布） */
const SWIRL = new Map<string, HTMLCanvasElement>();
/**
 * 漩涡底（ast.bgArt = shaderSwirl，M12b-51，balatro#6）：三色（ast.bgColors，没写时强调色 / 第二强调色 / 面板底色）的域扭曲噪声漩涡——p 先绕画面中心旋一下（流速 ast.bgFlow），
 * 再按两层 fbm 互相扭（扭曲度 ast.bgWarp），色按扭出来的值在三色之间插；按模拟时钟 t 确定（静帧 t = 0 时每次一样），在 120 宽的低分辨率画布上算、平滑放大（动起来时每张约几毫秒）。
 * ast.bgConfetti = true 时再撒一层彩纸碎屑（确定的位置，随 t 缓慢下落）
 */
function swirlBg(g: CanvasRenderingContext2D, F: Rect, th: Theme) {
  const bc = bgColorsOf(th), c0 = parseColor(bc[0]), c1 = parseColor(bc[1]), c2 = parseColor(bc[2]);
  const flow = bgNum(th, 'ast.bgFlow', 0.5), warp = bgNum(th, 'ast.bgWarp', 0.5), t = Math.round(simNow().t * 15) / 15;
  const W0 = 120, H0 = Math.max(9, Math.round((120 * F.h) / Math.max(1, F.w)));
  const key = `${c0}|${c1}|${c2}|${flow}|${warp}|${t}|${W0}x${H0}`;
  let cv = SWIRL.get(key);
  if (!cv) {
    let old: HTMLCanvasElement | undefined;
    if (SWIRL.size >= 2) { const k0 = SWIRL.keys().next().value!; old = SWIRL.get(k0); SWIRL.delete(k0); }
    cv = old ?? document.createElement('canvas');
    if (cv.width !== W0 || cv.height !== H0) { cv.width = W0; cv.height = H0; }
    const c = cv.getContext('2d')!, img = c.createImageData(W0, H0), dd = img.data;
    const tt = t * (0.15 + flow * 0.6);
    for (let j = 0; j < H0; j++) for (let i = 0; i < W0; i++) {
      // 绕中心旋一下：离中心越近转得越多（漩涡）
      const x0 = (i / W0 - 0.5) * 3, y0 = (j / H0 - 0.5) * 3 * (H0 / W0), rr = Math.hypot(x0, y0), a = tt + (1.6 + flow) / (0.6 + rr);
      const x = x0 * Math.cos(a) - y0 * Math.sin(a), y = x0 * Math.sin(a) + y0 * Math.cos(a);
      const qx = fbm(x + tt, y), qy = fbm(x + 5.2, y + 1.3 - tt), w = 1 + warp * 3.5;
      const f = fbm(x + w * qx, y + w * qy);
      // 三色插值：f 低 → 强调色、中 → 第二强调色、高 → 面板底色（加一道亮边）
      const k = Math.max(0, Math.min(1, f * 1.6 - 0.25)), k2 = Math.max(0, Math.min(1, (qx - 0.35) * 2.2));
      const p = (j * W0 + i) * 4;
      for (let ch = 0; ch < 3; ch++) { const m = c0[ch] * (1 - k) + c1[ch] * k; dd[p + ch] = Math.round(m * (1 - k2 * 0.55) + c2[ch] * k2 * 0.55); }
      dd[p + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    SWIRL.set(key, cv);
  }
  g.save(); g.imageSmoothingEnabled = true; g.drawImage(cv, F.x, F.y, F.w, F.h); g.restore();
  if ((th.legacy ? afterSkin(th.r, 'ast.bgConfetti') : relSet(th, 'ast.bgConfetti')) && th.r.bool('ast.bgConfetti')) {
    const cols = [bc[0], bc[1], '#ffffff', '#ffd34d'];
    g.save();
    for (let i = 0; i < 70; i++) {
      const x = F.x + rnd(i * 3) * F.w, y = F.y + ((rnd(i * 3 + 1) + simNow().t * 0.03 * (0.5 + rnd(i))) % 1) * F.h, s = 3 + rnd(i * 7) * 5, a = rnd(i * 11) * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = withAlpha(cols[i % cols.length], 0.85); g.fillRect(-s / 2, -s * 0.3, s, s * 0.6); g.restore();
    }
    g.restore();
  }
}

/**
 * 像素云天（ast.bgArt = skyClouds，M12b-51，Stardew 标题 / 捏人）：天色从上到下渐亮、几朵像素块拼的云（块边长跟 vis.pixelScale：没开时 4，开了 = 倍数 × 3），
 * 云的下沿压一层暗一点的块（像素阴影），随模拟时钟慢慢往右飘；前景 ast.bgForeground = hills（两层台阶状山丘）/ forest（一排像素树剪影）
 */
function skyBg(g: CanvasRenderingContext2D, F: Rect, th: Theme) {
  const sky = th.pal.sky ?? '#7ec8f0', B = th.pixel > 1 ? th.pixel * 3 : 4, t = simNow().t;
  const gr = g.createLinearGradient(0, F.y, 0, F.y + F.h); gr.addColorStop(0, mix(sky, '#2a6fb5', 0.35)); gr.addColorStop(1, mix(sky, '#ffffff', 0.45));
  g.fillStyle = gr; g.fillRect(F.x, F.y, F.w, F.h);
  const snap = (v: number) => Math.round(v / B) * B;
  for (let c = 0; c < 7; c++) {
    const cw = (6 + Math.floor(rnd(c * 5) * 8)) * B * 2, ch = (2 + Math.floor(rnd(c * 5 + 1) * 3)) * B * 2;
    const cx = snap(F.x + (((rnd(c * 5 + 2) + t * 0.004 * (1 + c * 0.2)) % 1.2) - 0.1) * F.w), cy = snap(F.y + (0.06 + rnd(c * 5 + 3) * 0.42) * F.h);
    for (let j = 0; j * B < ch; j++) for (let i = 0; i * B < cw; i++) {
      const u = (i * B) / cw - 0.5, v = (j * B) / ch - 0.5;
      if (u * u * 4 + v * v * 4 * (1 + 0.6 * Math.sin(u * 9 + c)) > 1) continue;
      g.fillStyle = v > 0.18 ? '#dbe7f2' : '#ffffff'; g.fillRect(cx + i * B, cy + j * B, B, B);
    }
  }
  const fg = bgStr(th, 'ast.bgForeground', 'none');
  if (fg === 'hills' || fg === 'forest') {
    for (const [k, col, base] of [[0, '#5b9b4e', 0.78], [1, '#3e7a3c', 0.86]] as [number, string, number][]) {
      g.fillStyle = col;
      for (let x = F.x; x < F.x + F.w; x += B) {
        const hgt = fg === 'hills' ? (Math.sin((x - F.x) / (F.w * 0.18) + k * 2) * 0.05 + 0.04) * F.h : (rnd(Math.floor((x - F.x) / (B * 3)) + k * 97) * 0.08 + 0.03) * F.h;
        const y = snap(F.y + F.h * base - hgt);
        g.fillRect(x, y, B, F.y + F.h - y);
      }
    }
  }
}

/** 背光透射（ast.bgArt = backlight，M12b-51，K1 南亚 / 东南亚的皮影）：暗底 + 中上一团偏暖的强光（光色 = 强调色往暖黄走）+ 一圈放射的淡光芒；配半透明面板（vis.opacity）就是背光透色 */
function backlightBg(g: CanvasRenderingContext2D, F: Rect, th: Theme) {
  const light = mix(resolveColor('@accent', th.pal), '#ffcf7a', 0.55), cx = F.x + F.w / 2, cy = F.y + F.h * 0.42, R0 = Math.max(F.w, F.h) * 0.62;
  g.fillStyle = mix(resolveColor(th.surface, th.pal), '#000', 0.82); g.fillRect(F.x, F.y, F.w, F.h);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 30;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0); gr.addColorStop(0, withAlpha(light, 0.16)); gr.addColorStop(1, withAlpha(light, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R0, a0, a1); g.closePath(); g.fill();
  }
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.75); gr.addColorStop(0, withAlpha(light, 0.85)); gr.addColorStop(0.35, withAlpha(light, 0.35)); gr.addColorStop(1, withAlpha(light, 0));
  g.fillStyle = gr; g.fillRect(F.x, F.y, F.w, F.h);
  g.restore();
}
/** 全屏背景的新取值（replacedBackdrop 调） */
function screenBg(g: CanvasRenderingContext2D, F: Rect, th: Theme, bg: string) {
  if (bg === 'shaderSwirl') swirlBg(g, F, th);
  else if (bg === 'skyClouds') skyBg(g, F, th);
  else backlightBg(g, F, th);
}
/**
 * 局内 HUD 也能用的全屏背景（M12b-51：Balatro 的漩涡底本身就是 UI 的底）：rel.behind = replaced 且 ast.bgArt 是程序画的新取值（漩涡 / 云天 / 背光）时先铺满整张画布；
 * 其余取值的局内 HUD 照旧不画替换背景（原来的）。场景处理不在这里做（调用方之后的 hudSceneTreatment 做一次，B10 审查修复 ②）
 */
export function hudBackdrop(d: DrawCtx, R: Rect, th: Theme) {
  if (th.r.str('rel.behind', 'live') !== 'replaced' || !SCREEN_BG.has(th.r.str('ast.bgArt', 'auto'))) return;
  replacedBackdrop(d, R, th, 'template', { sceneFx: false });
}

/* 屏幕边缘遮罩（ast.screenEdge，多选） */
export const SCREEN_EDGES = ['frostSmoke', 'inkSmoke', 'hexVignette', 'glyphBand', 'filmPerf'];
/** 选了哪些边缘遮罩（旧皮肤只认皮肤之后的层） */
export function screenEdgesOf(th: Theme): string[] {
  if (th.legacy && !afterSkin(th.r, 'ast.screenEdge')) return [];
  return th.r.list('ast.screenEdge').filter((x) => SCREEN_EDGES.includes(x));
}
/**
 * 边缘遮罩画在哪一层（ast.screenEdgeLayer）：under = 背景之上（替换背景、整屏主体、出血地图都在它下面）、面板之下（默认）；
 * over = 面板与文字之上（调用方画在最上面那张画布上：有文字画布时画在文字画布上）——模拟反馈（飘字、横幅）与运营 / 合规层仍在它上面（B10 审查修复 ⑦ / ㉑ 写明）
 */
export const screenEdgeLayer = (th: Theme) => (bgStr(th, 'ast.screenEdgeLayer', 'under') === 'over' ? 'over' : 'under');
/**
 * 屏幕边缘遮罩（ast.screenEdge，M12b-51）：
 *   frostSmoke 冰雾（frostpunk#22：四周被白色冰雾吃掉、中间留暗）/ inkSmoke 墨烟（同一套边缘粒子：沿四边按噪声起伏的一圈软团 + 几颗溅点，墨色）；
 *   hexVignette 六角暗角（xcom2#10：六角网格线向中心淡出）；glyphBand 异星字带（上下两条暗带里一串程序笔画的符文 / 异星字，母题是 runes 时画符文的直折笔画）；
 *   filmPerf 胶片齿孔（上下两条黑带 + 圆角方孔，K1 默片 / 胶片画幅）。
 * 颜色 ast.screenEdgeColor（auto：冰雾白、墨烟取墨色、其余强调色），强度 ast.screenEdgeStrength（0~1，没给 0.6）。
 * 缓存（B10 审查修复 ⑨）：每种遮罩按（种类、颜色、强度、母题、画面尺寸、设备像素尺寸）烘进自己的离屏画布（EDGE，最多 12 张、复用最旧的画布），每帧只贴图——
 * 原来走成品缓存（bakedPaint），整屏一块超过「预算 / 4」，画布到 1600 × 900 设备像素以上（1080p、任何 2 倍屏）就每帧直接重画（冰雾 56 个大径向渐变、六角暗角 345 个六边形）。
 * 软的（冰雾 / 墨烟 0.6M、六角暗角 2.2M 设备像素以内）按比例降分辨率烘、平滑放大；字带 / 胶片齿孔只烘上下两条带、设备分辨率（字与孔不糊）
 */
export function screenEdges(g: CanvasRenderingContext2D, R: Rect, th: Theme, layer: 'under' | 'over') {
  const kinds = screenEdgesOf(th);
  if (!kinds.length || screenEdgeLayer(th) !== layer) return;
  const strength = bgNum(th, 'ast.screenEdgeStrength', 0.6), cv = bgStr(th, 'ast.screenEdgeColor', 'auto');
  const userC = cv && cv !== 'auto' ? resolveColor(cv, th.pal) : null, accent = resolveColor('@accent', th.pal), motif = th.tokens.panel.ornament?.motif ?? '';
  for (const k of kinds) {
    const color = userC ?? (k === 'frostSmoke' ? '#eaf3f8' : k === 'inkSmoke' ? mix(th.pal.ink ?? '#1a1a1a', '#000', 0.4) : accent);
    edgeBlit(g, R, k, color, strength, motif);
  }
}
/**
 * over 那一层画在最上面那张画布上（B10 审查修复 ㉑）：有文字画布（像素皮肤 / 按角色拆层）时画在文字画布上（拆层时落到清晰字那一层），
 * 原来只画在盒子画布上、文字层合成在它上面，字压在冰雾上
 */
export function screenEdgesTop(d: Pick<DrawCtx, 'ctx' | 't'>, R: Rect, th: Theme) {
  const top = d.t ?? d.ctx;
  withPixRole('text', 'edge', () => screenEdges(top, R, th, 'over'));
}
/** 边缘遮罩的离屏画布（见 screenEdges）：键 → 画布，按最近使用排；满了把最旧的那张拿来重画 */
const EDGE = new Map<string, HTMLCanvasElement>();
const EDGE_MAX = 12;
/** 一种遮罩要烘的几块（画面坐标）与每块的设备像素上限：字带 / 齿孔 = 上下两条带（满分辨率），其余整屏一块（降分辨率） */
function edgeParts(R: Rect, k: string): { r: Rect; cap: number }[] {
  const m = Math.min(R.w, R.h);
  if (k === 'glyphBand') { const bh = Math.max(14, m * 0.045), p = Math.max(1, bh * 0.06) + 1; return [R.y + m * 0.02, R.y + R.h - m * 0.02 - bh].map((y0) => ({ r: { x: R.x, y: y0 - p, w: R.w, h: bh + p * 2 }, cap: Infinity })); }
  if (k === 'filmPerf') { const bh = Math.max(12, m * 0.05); return [R.y, R.y + R.h - bh].map((y0) => ({ r: { x: R.x, y: y0, w: R.w, h: bh }, cap: Infinity })); }
  return [{ r: R, cap: k === 'hexVignette' ? 2_200_000 : 600_000 }];
}
function edgeBlit(g: CanvasRenderingContext2D, R: Rect, k: string, color: string, s: number, motif: string) {
  // 只量不画 / 没有 document（Node 里的导出）：直接画
  if ((g as unknown as Record<symbol, unknown>)[MEASURE_ONLY] || typeof document === 'undefined') { edgeLayer(g, R, k, color, s, motif); return; }
  const m = g.getTransform(), sc = Math.max(0.25, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1);
  edgeParts(R, k).forEach(({ r: P, cap }, i) => {
    const W0 = P.w * sc, H0 = P.h * sc, f = Math.min(1, Math.sqrt(cap / Math.max(1, W0 * H0)));
    const W = Math.max(1, Math.min(4096, Math.round(W0 * f))), H = Math.max(1, Math.min(4096, Math.round(H0 * f)));
    const key = `${k}|${color}|${s}|${motif}|${R.x.toFixed(1)},${R.y.toFixed(1)},${R.w.toFixed(1)}x${R.h.toFixed(1)}|${i}|${W}x${H}`;
    let cv = EDGE.get(key);
    if (cv) { EDGE.delete(key); EDGE.set(key, cv); }
    else {
      let old: HTMLCanvasElement | undefined;
      if (EDGE.size >= EDGE_MAX) { const k0 = EDGE.keys().next().value!; old = EDGE.get(k0); EDGE.delete(k0); }
      cv = old ?? document.createElement('canvas');
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const c = cv.getContext('2d')!;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
      c.setTransform(W / P.w, 0, 0, H / P.h, (-P.x * W) / P.w, (-P.y * H) / P.h);
      edgeLayer(c, R, k, color, s, motif);
      EDGE.set(key, cv);
    }
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(cv, P.x, P.y, P.w, P.h); g.restore();
  });
}
function edgeLayer(c: CanvasRenderingContext2D, R: Rect, k: string, color: string, s: number, motif: string) {
  const m = Math.min(R.w, R.h);
  if (k === 'frostSmoke' || k === 'inkSmoke') {
    // 沿四边一圈软团：每团一个径向渐变，半径按噪声起伏（离边越近越实），角上更厚
    const n = 56, depth = m * (0.1 + 0.22 * s);
    for (let i = 0; i < n; i++) {
      const t = i / n, side = Math.floor(t * 4), u = (t * 4) % 1;
      const x = side === 0 ? R.x + u * R.w : side === 1 ? R.x + R.w : side === 2 ? R.x + (1 - u) * R.w : R.x, y = side === 0 ? R.y : side === 1 ? R.y + u * R.h : side === 2 ? R.y + R.h : R.y + (1 - u) * R.h;
      const corner = Math.min(u, 1 - u) < 0.12 ? 1.35 : 1, rr = depth * (0.7 + 0.8 * fbm(i * 0.7, 3.1)) * corner;
      const gr = c.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, withAlpha(color, Math.min(1, 0.75 + s * 0.2))); gr.addColorStop(0.55, withAlpha(color, 0.35 * (0.6 + s))); gr.addColorStop(1, withAlpha(color, 0));
      c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // 溅点（墨烟更多）
    const dots = k === 'inkSmoke' ? 40 : 18;
    c.fillStyle = withAlpha(color, 0.8);
    for (let i = 0; i < dots; i++) {
      const side = i % 4, u = rnd(i * 13), d0 = depth * (0.6 + rnd(i * 17) * 0.9), r0 = m * (0.002 + rnd(i * 19) * 0.006);
      const x = side === 0 ? R.x + u * R.w : side === 1 ? R.x + R.w - d0 : side === 2 ? R.x + u * R.w : R.x + d0, y = side === 0 ? R.y + d0 : side === 1 ? R.y + u * R.h : side === 2 ? R.y + R.h - d0 : R.y + u * R.h;
      c.beginPath(); c.arc(x, y, r0, 0, Math.PI * 2); c.fill();
    }
    return;
  }
  if (k === 'hexVignette') {
    // 六角网格（尖顶），每格的线按离中心的距离淡入：中心空、四周实
    const hr = m * 0.045, wq = Math.sqrt(3) * hr, cx = R.x + R.w / 2, cy = R.y + R.h / 2, maxD = Math.hypot(R.w, R.h) / 2;
    c.lineWidth = Math.max(1, m * 0.0025);
    for (let r0 = 0; r0 * 1.5 * hr < R.h + hr; r0++) for (let q = 0; q * wq < R.w + wq; q++) {
      const x = R.x + q * wq + (r0 % 2 ? wq / 2 : 0), y = R.y + r0 * 1.5 * hr, d = Math.hypot(x - cx, y - cy) / maxD;
      const a = Math.max(0, Math.min(1, (d - 0.42) / 0.5)) * (0.35 + 0.65 * s);
      if (a < 0.03) continue;
      c.strokeStyle = withAlpha(color, a); c.beginPath();
      for (let t = 0; t < 6; t++) { const an = -Math.PI / 2 + (t * Math.PI) / 3; const px = x + Math.cos(an) * hr * 0.92, py = y + Math.sin(an) * hr * 0.92; if (t) c.lineTo(px, py); else c.moveTo(px, py); }
      c.closePath(); c.stroke();
    }
    const v = c.createRadialGradient(cx, cy, maxD * 0.4, cx, cy, maxD); v.addColorStop(0, withAlpha(color, 0)); v.addColorStop(1, withAlpha(color, 0.28 * s)); c.fillStyle = v; c.fillRect(R.x, R.y, R.w, R.h);
    return;
  }
  if (k === 'glyphBand') {
    // 上下两条暗带，带里一串程序笔画的字（每个字 2–4 笔，直线 / 折线；母题是 runes 时只用竖直与斜线），带边一道细线
    const bh = Math.max(14, m * 0.045);
    for (const y0 of [R.y + m * 0.02, R.y + R.h - m * 0.02 - bh]) {
      c.fillStyle = withAlpha('#000', 0.45 * (0.5 + s)); c.fillRect(R.x, y0, R.w, bh);
      c.strokeStyle = withAlpha(color, 0.8); c.lineWidth = Math.max(1, bh * 0.06);
      c.beginPath(); c.moveTo(R.x, y0); c.lineTo(R.x + R.w, y0); c.moveTo(R.x, y0 + bh); c.lineTo(R.x + R.w, y0 + bh); c.stroke();
      const gw = bh * 0.62, gh = bh * 0.62, gy = y0 + (bh - gh) / 2;
      c.strokeStyle = withAlpha(color, 0.55 + 0.45 * s); c.lineWidth = Math.max(1, bh * 0.08); c.lineCap = 'square';
      for (let i = 0; R.x + i * gw * 1.35 < R.x + R.w; i++) {
        const gx = R.x + i * gw * 1.35 + gw * 0.2, seed = i * 31 + (y0 > R.y + R.h / 2 ? 997 : 0), strokes = 2 + Math.floor(rnd(seed) * 3);
        c.beginPath();
        for (let s0 = 0; s0 < strokes; s0++) {
          const pts = motif === 'runes' ? [[rnd(seed + s0 * 5) > 0.5 ? 0.5 : rnd(seed + s0 * 5 + 1), 0], [rnd(seed + s0 * 5 + 2), 1]] : [[Math.round(rnd(seed + s0 * 5) * 2) / 2, Math.round(rnd(seed + s0 * 5 + 1) * 2) / 2], [Math.round(rnd(seed + s0 * 5 + 2) * 2) / 2, Math.round(rnd(seed + s0 * 5 + 3) * 2) / 2]];
          c.moveTo(gx + pts[0][0] * gw, gy + pts[0][1] * gh); c.lineTo(gx + pts[1][0] * gw, gy + pts[1][1] * gh);
        }
        c.stroke();
      }
    }
    return;
  }
  // filmPerf：上下两条黑带 + 等距圆角方孔（孔透出背后）
  const bh = Math.max(12, m * 0.05), hw = bh * 0.42, hh = bh * 0.5;
  for (const y0 of [R.y, R.y + R.h - bh]) {
    // 带与孔一条路径、奇偶填充（孔透出背后；不用 destination-out：不烘焙直接画时会擦掉下面的画面）
    c.fillStyle = withAlpha('#0b0b0b', 0.75 + 0.25 * s); c.beginPath(); c.rect(R.x, y0, R.w, bh);
    for (let x = R.x + hw; x < R.x + R.w - hw; x += hw * 2.4) c.roundRect(x, y0 + (bh - hh) / 2, hw, hh, hw * 0.25);
    c.fill('evenodd');
  }
}
