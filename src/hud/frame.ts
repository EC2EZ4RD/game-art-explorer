import { getAsset } from '../content/assets';
import { fillMaterial, MATERIAL_BASE, mix, withAlpha } from './material';
import { crownGeom, glyph, scroll, SCROLL_MOTIFS } from './ornament';
import type { Rect } from './paint';
import { assetFile, drawImageFit, drawNineSlice, frameAssetId, frameSlice, uiImage } from './uiAssets';

/*
 * 外框结构（ast.frame × ast.frameMat，docs/ui-hud-plan.md M3.5）的程序化画法：
 *   plainNinePatch  —— 一圈材质带（木 / 金 / 石 / 皮……）+ 内外倒角高光，相当于平框九宫格；
 *   carvedNinePatch —— 材质带上沿边压印母题纹样 + 四角花饰，相当于雕花九宫格；
 *   cornersOnly     —— 只有四个 L 形包角。
 * 材质用 material.ts 的程序化平铺图。M11：金 / 青铜 / 石 / 木 / 皮革五种材质有AI 生成的九宫格位图，
 * 位图加载完就画位图（drawFrameBitmap），没加载完、别的材质、或外形不方（圆形雷达、大圆角胶囊）照旧画程序化的带，盒子其余部分不变。
 * M12b-50 新取值：ring（环带：材质带 + 斜向高光 + 内外倒角线，圆钮 / 圆形盒子）、gear（环带 + 外缘一圈齿，齿数按周长 12~24；外形不方时只画环带）、
 * crowned（平框 + 顶边正中的顶冠、底边正中的底坠，取放大的母题 / 卷草）、illustratedFrame（整张外框插画 + meta.inner 内窗；没有素材时退回雕花框）、
 * threePart（顶冠 / 底坠两件不拉伸 + 中段九宫格；素材到之前画成 crowned 的程序版）。框厚 = ast.frameThickness（没给时 7 / 包角 5）
 */
export interface FrameSpec { kind: string; mat: string; width: number; motif: string }

/** 把外形（内缩 inset）加进当前路径，不 beginPath */
type Path = (inset: number) => void;

/**
 * 外形是不是"大致方的"：程序化带的四个内角（内缩 w）都落在外形里才算。
 * 圆 / 椭圆（雷达小地图）、圆角超过约 24px 的胶囊、切角太大的盒子会有内角落在外面——方的位图框套不上，留给程序化的带。
 * isPointInPath 吃的是没变换的画布坐标，所以探测点先过一遍当前变换。
 */
function squarish(g: CanvasRenderingContext2D, r: Rect, w: number, path: Path): boolean {
  g.beginPath();
  path(0);
  const m = g.getTransform();
  for (let i = 0; i < 4; i++) {
    const px = i === 0 || i === 3 ? r.x + w : r.x + r.w - w, py = i < 2 ? r.y + w : r.y + r.h - w;
    if (!g.isPointInPath(m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f)) return false;
  }
  return true;
}

/**
 * 位图九宫格外框：画上了返回 true；这种框 / 材质没有素材、图还没加载完、或外形不方（见 squarish）返回 false（调用方画程序化的带）。
 * 屏幕上的边带（含素材外缘一圈透明边）取程序化带宽的两倍（7 → 14px），夹在 10~18px，且不超过短边的 22%；
 * 四角切边不超过半个盒子（否则 drawNineSlice 会把角件压扁）。
 * 位置：边带内缘对齐程序化带的内缘（内缩 width），多出来的部分向盒外伸——盒内内容不比原来多挡（只有四角的雕花伸得深一些）。
 */
function drawFrameBitmap(g: CanvasRenderingContext2D, r: Rect, f: FrameSpec, path: Path): boolean {
  const id = frameAssetId(f.kind, f.mat);
  if (!id) return false;
  const sl = frameSlice(id), file = assetFile(id);
  if (!sl || !file || !uiImage(file)) return false;
  if (!squarish(g, r, f.width, path)) return false;
  const short = Math.min(r.w, r.h);
  const band = Math.min(Math.max(10, Math.min(18, f.width * 2)), short * 0.22);
  const k = Math.min(band / sl.band, short / 2 / sl.slice);
  const out = Math.max(0, sl.band * k - f.width);
  g.save();
  // 大幅缩小的位图要平滑采样（像素化皮肤的小画布默认关了平滑，这里只在本次绘制里打开）
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const ok = drawNineSlice(g, file, { x: r.x - out, y: r.y - out, w: r.w + out * 2, h: r.h + out * 2 }, sl.slice, sl.slice * k, false);
  g.restore();
  return ok;
}

/** safe = 画面矩形（顶冠 / 底坠放进画面安全区用，B4 审查修复；没给时照原来贴着盒边） */
export function drawFrame(g: CanvasRenderingContext2D, r: Rect, f0: FrameSpec, path: Path, safe?: Rect | null) {
  if (f0.kind === 'ring' || f0.kind === 'gear') { drawRing(g, r, f0, path); return; }
  if (f0.kind === 'illustratedFrame' && drawFrameArt(g, r, f0)) return;
  // 没有素材的整幅插画框 → 雕花框；三段式 → 顶冠框的程序版；顶冠框的中段是平框（位图平框有素材时用它）
  const f = f0.kind === 'illustratedFrame' ? { ...f0, kind: 'carvedNinePatch' } : f0.kind === 'threePart' || f0.kind === 'crowned' ? { ...f0, kind: 'plainNinePatch' } : f0;
  const crown = f0.kind === 'crowned' || f0.kind === 'threePart';
  if (drawFrameBitmap(g, r, f, path)) { if (crown) crownPieces(g, r, f0, safe); return; }
  const base = MATERIAL_BASE[f.mat] ?? '#8a6a44';
  const w = f.width;
  const light = withAlpha(mix(base, '#ffffff', 0.55), 0.85);
  const dark = withAlpha(mix(base, '#000000', 0.55), 0.9);
  g.save();
  if (f.kind === 'cornersOnly') {
    const L = Math.max(w * 2.5, Math.min(r.w, r.h) * 0.24);
    const pieces: [number, number, number, number][] = [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x + r.w, r.y + r.h, -1, -1], [r.x, r.y + r.h, 1, -1]];
    for (const [x, y, sx, sy] of pieces) {
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + sx * L, y); g.lineTo(x + sx * L, y + sy * w); g.lineTo(x + sx * w, y + sy * w); g.lineTo(x + sx * w, y + sy * L); g.lineTo(x, y + sy * L); g.closePath();
      g.save();
      g.clip();
      fillMaterial(g, x - L, y - L, L * 2, L * 2, f.mat, base);
      g.restore();
      g.lineWidth = 1;
      g.strokeStyle = dark;
      g.stroke();
    }
    g.restore();
    return;
  }
  // 材质带 = 外形 − 内缩 w 的外形
  g.beginPath();
  path(0);
  path(w);
  g.save();
  g.clip('evenodd');
  fillMaterial(g, r.x, r.y, r.w, r.h, f.mat, base);
  // 带内的明暗：上半亮、下半暗，像有厚度的木条 / 金属条
  const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h);
  gr.addColorStop(0, 'rgba(255,255,255,0.18)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = gr;
  g.fillRect(r.x, r.y, r.w, r.h);
  if (f.kind === 'carvedNinePatch') {
    // 沿四边压印母题，四角放大一号
    const s = w * 0.62;
    g.fillStyle = withAlpha(mix(base, '#000', 0.45), 0.55);
    g.strokeStyle = g.fillStyle;
    g.lineWidth = Math.max(1, s * 0.12);
    const step = Math.max(s * 2.2, 14);
    const stamp = (x: number, y: number, sz: number, m: string) => { g.save(); g.translate(x, y); glyph(g, m, sz); g.restore(); };
    // 卷草母题（M12b-44）的带状卷须逐个采样很贵：沿边的压印用花叶符号，只有四角放大的那四枚画卷草
    const m0 = f.motif === 'none' ? 'diamond' : f.motif, mEdge = SCROLL_MOTIFS.has(m0) ? 'floral' : m0;
    for (let x = r.x + w * 2.4; x < r.x + r.w - w * 2.4; x += step) { stamp(x, r.y + w / 2, s, mEdge); stamp(x, r.y + r.h - w / 2, s, mEdge); }
    for (let y = r.y + w * 2.4; y < r.y + r.h - w * 2.4; y += step) { stamp(r.x + w / 2, y, s, mEdge); stamp(r.x + r.w - w / 2, y, s, mEdge); }
    for (const [x, y] of [[r.x + w / 2, r.y + w / 2], [r.x + r.w - w / 2, r.y + w / 2], [r.x + r.w - w / 2, r.y + r.h - w / 2], [r.x + w / 2, r.y + r.h - w / 2]]) stamp(x, y, w * 1.1, m0);
  }
  g.restore();
  // 内外两道细线：外缘亮、内缘暗（倒角）
  g.lineWidth = 1;
  g.beginPath();
  path(0.5);
  g.strokeStyle = light;
  g.stroke();
  g.beginPath();
  path(w - 0.5);
  g.strokeStyle = dark;
  g.stroke();
  g.restore();
  if (crown) crownPieces(g, r, f0, safe);
}

/**
 * 环带 / 齿轮表圈（M12b-50，civ6#1 的黄铜齿轮表圈）：材质带（外形 − 内缩 w）+ 左上亮右下暗的斜向高光 + 内外两道倒角线；
 * gear 先在外缘画一圈齿（外形大致是圆 / 方时，齿数按周长 12~24，齿高 0.9 w），再画环带压住齿根
 */
function drawRing(g: CanvasRenderingContext2D, r: Rect, f: FrameSpec, path: Path) {
  const base = MATERIAL_BASE[f.mat] ?? '#b08d57', w = f.width;
  g.save();
  if (f.kind === 'gear' && Math.abs(r.w - r.h) <= Math.max(r.w, r.h) * 0.15) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.min(r.w, r.h) / 2, n = Math.max(12, Math.min(24, Math.round((Math.PI * 2 * R) / (w * 2.4)))), th = w * 0.9;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, da = (Math.PI / n) * 0.55, da2 = da * 0.7;
      g.moveTo(cx + Math.cos(a - da) * (R - 1), cy + Math.sin(a - da) * (R - 1));
      g.lineTo(cx + Math.cos(a - da2) * (R + th), cy + Math.sin(a - da2) * (R + th));
      g.lineTo(cx + Math.cos(a + da2) * (R + th), cy + Math.sin(a + da2) * (R + th));
      g.lineTo(cx + Math.cos(a + da) * (R - 1), cy + Math.sin(a + da) * (R - 1));
      g.closePath();
    }
    g.fillStyle = mix(base, '#000', 0.12); g.fill();
    g.strokeStyle = withAlpha(mix(base, '#000', 0.55), 0.9); g.lineWidth = 1; g.stroke();
  }
  g.beginPath(); path(0); path(w);
  g.save(); g.clip('evenodd');
  fillMaterial(g, r.x, r.y, r.w, r.h, f.mat, base);
  const gr = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h);
  g.restore();
  g.lineWidth = 1;
  g.beginPath(); path(0.5); g.strokeStyle = withAlpha(mix(base, '#ffffff', 0.6), 0.9); g.stroke();
  g.beginPath(); path(w - 0.5); g.strokeStyle = withAlpha(mix(base, '#000000', 0.6), 0.9); g.stroke();
  g.restore();
}

/**
 * 顶冠 / 底坠（crowned / threePart 的程序版，M12b-50，K1 重装饰雕花框）：顶边正中一枚顶冠（卷草母题 = 一对上卷的卷须 + 中间尖顶；别的母题 = 放大的母题符号压在一块弧形冠座上），
 * 底边正中一枚倒垂的小坠；材质色（亮）填、深色描边。大小 = 短边的 18%（12~48）。几何走 ornament.ts 的 crownGeom：给了画面（safe）时
 * 会伸出画面边就先缩、再往盒里挪（B4 审查修复：全屏面板 / 顶排 HUD 元素的顶冠原来被画面顶边截掉）
 */
function crownPieces(g: CanvasRenderingContext2D, r: Rect, f: FrameSpec, safe?: Rect | null) {
  const base = MATERIAL_BASE[f.mat] ?? '#b08d57', cg = crownGeom(r, safe), cx = cg.cx, m = f.motif === 'none' || !f.motif ? 'diamond' : f.motif;
  g.save();
  g.fillStyle = mix(base, '#ffffff', 0.15); g.strokeStyle = withAlpha(mix(base, '#000', 0.55), 0.9); g.lineWidth = Math.max(1, cg.top.sz * 0.05);
  for (const [y, k, sz] of [[cg.top.y, -1, cg.top.sz], [cg.bot.y, 1, cg.bot.sz]] as const) {
    g.save(); g.translate(cx, y); g.scale(1, k);
    // 冠座：一块压在框边上、往外鼓的弧形底（k = -1 顶冠朝上、1 底坠朝下）
    g.beginPath(); g.moveTo(-sz * 0.6, 0); g.quadraticCurveTo(0, sz * 0.5, sz * 0.6, 0); g.closePath(); g.fill(); g.stroke();
    if (SCROLL_MOTIFS.has(m)) {
      const w1 = Math.max(1, sz * 0.1);
      for (const q of [-1, 1]) scroll(g, [[q * sz * 0.08, sz * 0.18, q * sz * 0.5, sz * 0.28, q * sz * 0.62, sz * 0.7, q * sz * 0.3, sz * 0.72]], w1 * 0.35, w1, { end: 'volute', curl: q, size: sz * 0.12 });
      g.beginPath(); g.moveTo(-sz * 0.08, sz * 0.2); g.lineTo(0, sz * 1.05); g.lineTo(sz * 0.08, sz * 0.2); g.closePath(); g.fill();
    } else { g.translate(0, sz * 0.55); g.scale(1, -1); glyph(g, m, sz * 0.8, 3); }
    g.restore();
  }
  g.restore();
}

/**
 * 整幅插画外框（illustratedFrame，M12b-50）：素材 ui_frame_illustrated[_材质]（meta.inner = 内窗在原图里的 [x, y, w, h]）按内窗对齐、整张缩放铺在盒子外面；
 * 没有这张素材（M12c-A5 才生成）或没加载完时返回 false（调用方退回雕花框）
 */
function drawFrameArt(g: CanvasRenderingContext2D, r: Rect, f: FrameSpec): boolean {
  const a = getAsset(`ui_frame_illustrated_${f.mat}`) ?? getAsset('ui_frame_illustrated');
  const inner = a?.meta.inner as unknown as number[] | undefined, file = a ? assetFile(a.id) : null, img = file ? uiImage(file) : null;
  if (!a || !inner || !file || !img) return false;
  const kx = r.w / inner[2], ky = r.h / inner[3];
  return drawImageFit(g, file, { x: r.x - inner[0] * kx, y: r.y - inner[1] * ky, w: img.naturalWidth * kx, h: img.naturalHeight * ky }, 'stretch');
}
