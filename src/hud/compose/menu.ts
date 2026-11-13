import { plainText } from '../richText';
import { drawGreybox } from '../greybox';
import { tapMin } from '../sys/device';
import { fillMaterial, MATERIAL_BASE, mix, withAlpha } from '../material';
import { drawBox, drawnSize, drawPattern, drawText, logTarget, measure, resolveColor, withTransform, wrapLines, type Rect, type TextOpts } from '../paint';
import { afterSkin, px1080, type Theme } from '../sys/theme';
import type { BoxStyle, PatternOverlay } from '../types';
import { assetFile, CONTAINER_ASSET, drawImageFit, drawScene, sceneHole } from '../uiAssets';
import { bodyOpts, box, drawBar, fitLine, titleOpts, type DrawCtx } from './sample';
import { drawScreen, wantsTemplate } from './screen';
import { drawWatermark, replacedBackdrop, screenEdges, screenEdgesTop } from './backdrop';
import { liveView, pack } from '../content';
import type { MenuData } from '../content/types';

/*
 * 菜单样本（docs/ui-hud-plan.md M3.5）：同一份菜单数据，放进不同的"场景容器"（ast.container）里画：
 *   无容器 → 按 lay.container 摆成弹窗 / 全屏 / 抽屉 / 底部面板 / 窗口；
 *   程序化容器：书（左右两页）、笔记本、卷轴、手机、掌机、显示器、腕表；
 *   位图容器（M11②）：书桌 / 桌面、线索墙 / 布告板、柜台整屏铺图，菜单放进图里空着的那块；
 *   其余需要素材的容器（驾驶舱……）以及位图还没加载完时，画成带字的灰盒外圈，菜单照常画在里面。
 * 背景（rel.behind = replaced 时的 ast.bgArt）、水印（ast.watermark）、列表 / 格子排布（lay.arrangement）也在这里。
 * M9a 的 63 个界面模板会接管具体构图；这里是"换容器、换槽位"的回归样本。
 * 菜单里的字（标题、页签、物品、详情、按钮、水印的徽记字与英文大字）读当前内容包（docs/c1-content-packs.md）；主视觉与书法水印只有包里有这张图时才画，否则是灰盒。
 */

/** 菜单样本：当前内容包（../content）的 menu 字段的视图；原来写死的"雪线旅人"样本在 content/packs/snowline.ts */
export const MENU: MenuData = liveView(() => pack().menu);

const CONTAINER_LABEL: Record<string, string> = {
  book: '书', notebook: '笔记本', scroll: '卷轴', hangingBanner: '挂幅', desk: '书桌', tableTop: '桌面', counter: '柜台', phone: '手机',
  handheldDevice: '掌机', crt: '显示器', envelope: '信封', photoFrame: '相框', theater: '舞台', noticeBoard: '布告板', wrist: '腕表',
  cockpit: '驾驶舱', handMap: '手持地图', foldingScreen: '屏风', clueWall: '线索墙',
};

/**
 * 位图大比例缩小（主视觉 / 容器整屏图 / 书法水印）：临时打开平滑并用 high 质量，画完还原（与 elements/core.ts 的 smoothDraw 同口径）。
 * UI 像素化时盒子画布关了平滑，同样先平滑缩小（像素感由放大那一步给）。
 */
function smooth(g: CanvasRenderingContext2D, fn: () => boolean): boolean {
  const on = g.imageSmoothingEnabled, q = g.imageSmoothingQuality;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const ok = fn();
  g.imageSmoothingEnabled = on;
  g.imageSmoothingQuality = q;
  return ok;
}

/** 这一屏是不是菜单（而不是局内 HUD） */
export function wantsMenu(th: Theme): boolean {
  const r = th.r;
  return r.str('cnt.screen', 'screen.hud') !== 'screen.hud' || !['', 'none', 'auto'].includes(r.str('ast.container', 'none'));
}

type Mode = 'panel' | 'bare' | 'spread';

export function drawMenuScreen(d: DrawCtx, R: Rect, th: Theme) {
  // 选了界面模板（cnt.subtype）：交给 M9a 的模板构图器
  if (wantsTemplate(th)) { drawScreen(d, R, th); return; }
  drawBackdrop(d, R, th);
  // 屏幕边缘遮罩（ast.screenEdge，B10 审查修复 ④）：背景之上、容器之下；over 画在最上面
  screenEdges(d.ctx, d.full ?? R, th, 'under');
  const c = drawContainer(d, R, th);
  drawMenu(d, c.content, th, c.mode, c.ink);
  c.after?.();
  screenEdgesTop(d, d.full ?? R, th);
}

/* ---------------- 背景 ---------------- */

/** 背景：画面还在后面时压暗一层（菜单浮在上面）；替换背景（rel.behind = replaced）与模板共用 backdrop.ts（M12a-24） */
function drawBackdrop(d: DrawCtx, R: Rect, th: Theme) {
  if (th.r.str('rel.behind', 'live') === 'replaced') { replacedBackdrop(d, R, th, 'menu'); return; }
  const g = d.ctx;
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.fillRect(R.x, R.y, R.w, R.h);
}

/* ---------------- 容器 ---------------- */

/** framed：内容区是位图容器里空着的那块，模板构图器要在下面垫一块面板 */
interface Placed { content: Rect; mode: Mode; ink?: string; after?: () => void; framed?: boolean; hotspots?: { label: string; rect: Rect }[];
  /** 内容所在的那张纸（书：装内容的那一页，两页都装时整个跨页；B8 审查修复 ㉑：翻页角画在它的右下角，不画在数据区的角上） */
  page?: Rect }

/** 场景容器（书、笔记本、手机……）给模板构图器用 */
export const drawContainerFor = (d: DrawCtx, R: Rect, th: Theme): Placed => drawContainer(d, R, th);

/**
 * 位图容器里空着的那块（源图比例坐标 x0, y0, x1, y1）与内容的放法：
 * 书桌、线索墙中间是空桌面 / 空软木 → 面板；柜台是柜台上方空着的货架 → 直接摆（浅色字压在深色木架上）。
 */
const CONTAINER_HOLE: Record<string, { hole: [number, number, number, number]; mode: Mode; ink?: string }> = {
  ui_desk: { hole: [0.21, 0.19, 0.79, 0.81], mode: 'panel' },
  ui_clue_wall: { hole: [0.30, 0.24, 0.72, 0.68], mode: 'panel' },
  ui_counter: { hole: [0.27, 0.12, 0.72, 0.6], mode: 'bare', ink: '#f4e6c6' },
};

/** 位图书桌上物件的位置（源图比例 x0, y0, x1, y1）：场景热区导航（lay.nav = hotspots）框在它们上面 */
const DESK_SPOTS: [string, [number, number, number, number]][] = [['日记', [0.0, 0.0, 0.22, 0.52]], ['信件', [0.0, 0.57, 0.22, 1.0]], ['钥匙', [0.74, 0.62, 0.87, 0.85]], ['地图', [0.87, 0.56, 1.0, 1.0]]];

/** 位图容器整屏铺图（物件在图的四边：画面比图窄时不硬裁，见 drawScene），返回内容区；素材没加载完返回 null（调用方画灰盒） */
function drawArtContainer(g: CanvasRenderingContext2D, R: Rect, id: string): Placed | null {
  const file = assetFile(id), spec = CONTAINER_HOLE[id];
  if (!file || !spec) return null;
  let p: Rect | null = null;
  smooth(g, () => !!(p = drawScene(g, file, R)));
  if (!p) return null;
  // 上下空出了条带（竖屏 / 窄画面）：内容区纵向按整个画面取比例（不然面板只剩一条），横向仍对准图里的空位（两侧物件不被盖住）
  const pp: Rect = p;
  const content = sceneHole(pp.h < R.h - 1 ? { ...pp, y: R.y, h: R.h } : pp, R, spec.hole);
  // 热区只算面板外的部分：物件压进面板的那截截掉（右侧物件从面板右沿起，左侧物件到面板左沿止）
  const gap = 6;
  const outside = (q: Rect): Rect => {
    if (q.x + q.w / 2 > content.x + content.w / 2) { const x0 = Math.max(q.x, content.x + content.w + gap); return { ...q, x: x0, w: q.x + q.w - x0 }; }
    return { ...q, w: Math.min(q.x + q.w, content.x - gap) - q.x };
  };
  const hotspots = id === 'ui_desk' ? DESK_SPOTS.map(([label, h]) => ({ label, rect: outside(sceneHole(pp, R, h)) })).filter((q) => q.rect.w > 20 && q.rect.h > 20) : undefined;
  return { content, mode: spec.mode, ink: spec.ink, framed: spec.mode === 'panel', hotspots };
}

/** lay.container：弹窗 / 全屏 / 抽屉 / 底部面板 / 窗口 / 横幅 / 托盘 */
function placement(R: Rect, how: string, k: number): Rect {
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const centered = (w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });
  switch (how) {
    case 'fullscreen': return { x: R.x + 24, y: R.y + 24, w: R.w - 48, h: R.h - 48 };
    case 'drawer': return { x: R.x + R.w * 0.56, y: R.y + 16, w: R.w * 0.44 - 16, h: R.h - 32 };
    case 'sheet': return { x: R.x + 16, y: R.y + R.h * 0.42, w: R.w - 32, h: R.h * 0.58 - 16 };
    case 'banner': return { x: R.x + 16, y: R.y + 16, w: R.w - 32, h: Math.max(150, R.h * 0.3) };
    case 'tray': return { x: R.x + 16, y: R.y + R.h * 0.68, w: R.w - 32, h: R.h * 0.32 - 16 };
    case 'window': return centered(Math.min(620 * k, R.w * 0.62), Math.min(400 * k, R.h * 0.64));
    default: return centered(Math.min(720 * k, R.w * 0.78), Math.min(440 * k, R.h * 0.74));
  }
}

function roundRect(g: CanvasRenderingContext2D, r: Rect, rad: number) { g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, rad); }

/** 书本参数（M12b-53）：选过才算（旧皮肤只认皮肤之后的层）；auto / 没选 = def */
function bookOpt(r: Theme['r'], th: Theme, k: string, def: string): string {
  const v = r.str(k, 'auto');
  if (!v || v === 'auto' || (th.legacy && !afterSkin(r, k))) return def;
  return v;
}
/**
 * 一页的底（M12b-53）：endpaper = 整页铺图案（vis.pattern 选过时按它，没选时 4 × 4 有序抖动，墨色 50%；Obra 的整页斜纹抖动衬页）；
 * framed = 离页边 10 / 14 两道内框线（扉页）；plain / content = 不画
 */
function bookPage(g: CanvasRenderingContext2D, th: Theme, p: Rect, kind: string, ink: string) {
  if (kind === 'endpaper') {
    const ov0 = th.tokens.panel.overlay;
    const ov: PatternOverlay = ov0 && ov0.kind !== 'none' ? { ...ov0, area: 'panel', color: ink, opacity: Math.max(0.35, ov0.opacity) } : { kind: 'dither', opacity: 0.5, color: ink, matrix: 'bayer4', area: 'panel' };
    drawPattern(g, inset(p, 8), ov, th.pal);
  } else if (kind === 'framed') {
    g.save(); g.strokeStyle = withAlpha(ink, 0.8); g.lineWidth = 1.5; const a = inset(p, 10); g.strokeRect(a.x, a.y, a.w, a.h); g.lineWidth = 0.75; const b = inset(p, 14); g.strokeRect(b.x, b.y, b.w, b.h); g.restore();
  }
}
const inset = (r: Rect, l: number, t = l, rr = l, b = t): Rect => ({ x: r.x + l, y: r.y + t, w: r.w - l - rr, h: r.h - t - b });

function drawContainer(d: DrawCtx, R: Rect, th: Theme): Placed {
  const g = d.ctx, r = th.r, k = th.scale;
  const kind = r.str('ast.container', 'none');
  const surface = r.str('ast.containerSurface', 'none');
  const base = placement(R, r.str('lay.container', 'modal'), k);
  if (surface && surface !== 'none' && kind !== 'none') {
    // 容器下面的台面：书桌 / 桌面 / 木架位图铺满；没加载完时是木纹程序化近似 + 角落标注
    if (!(CONTAINER_ASSET[surface] && smooth(g, () => drawImageFit(g, assetFile(CONTAINER_ASSET[surface]), R, 'cover')))) {
      fillMaterial(g, R.x, R.y, R.w, R.h, surface === 'shelf' ? 'wood' : 'wood', MATERIAL_BASE.wood);
      drawGreybox(g, { x: R.x + 10, y: R.y + R.h - 34, w: 150, h: 24 }, `${surface === 'shelf' ? '书架' : surface === 'table' ? '桌面' : '书桌'}（需素材）`, { small: true });
    }
  }
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  // 书 / 笔记本的页、封皮、墨色读色板（M12a-06）：皮肤之后的层显式给了 col.surface / col.surface2 / col.text 才换，没给时是原来写死的颜色
  const pick = (key: string) => { const c = r.str(key, 'auto'); return afterSkin(r, key) && c && c !== 'auto' ? resolveColor(c, th.pal) : undefined; };
  const pageC = pick('col.surface'), coverC = pick('col.surface2'), inkC = pick('col.text');
  switch (kind) {
    case 'phone': {
      const h = Math.min(R.h * 0.92, 720), w = h * 0.5;
      const body: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
      roundRect(g, body, h * 0.065); g.fillStyle = '#17171c'; g.fill();
      g.restore();
      const screen = inset(body, 9);
      roundRect(g, screen, h * 0.055); g.fillStyle = mix(th.pal.paper, '#fff', 0.2); g.fill();
      roundRect(g, { x: cx - w * 0.16, y: screen.y + 8, w: w * 0.32, h: 18 }, 9); g.fillStyle = '#17171c'; g.fill();
      roundRect(g, { x: cx - w * 0.18, y: screen.y + screen.h - 12, w: w * 0.36, h: 4 }, 2); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
      return { content: inset(screen, 8, 34, 8, 20), mode: 'panel' };
    }
    case 'handheldDevice': {
      const w = Math.min(R.w * 0.88, 920), h = w * 0.46;
      const body: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      roundRect(g, body, h * 0.42); g.fillStyle = '#2b2e36'; g.fill();
      const screen: Rect = { x: cx - w * 0.29, y: body.y + h * 0.1, w: w * 0.58, h: h * 0.8 };
      roundRect(g, inset(screen, -6), 10); g.fillStyle = '#111317'; g.fill();
      // 十字键与四个按钮
      g.fillStyle = '#16181d';
      const dx = body.x + w * 0.1, dy = cy;
      g.fillRect(dx - 24, dy - 8, 48, 16); g.fillRect(dx - 8, dy - 24, 16, 48);
      for (const [ox, oy] of [[0, -22], [22, 0], [0, 22], [-22, 0]]) { g.beginPath(); g.arc(body.x + w * 0.9 + ox, dy + oy, 10, 0, Math.PI * 2); g.fill(); }
      return { content: screen, mode: 'panel' };
    }
    case 'crt': {
      const w = Math.min(R.w * 0.8, 840), h = Math.min(w * 0.7, R.h * 0.86);
      const bezel: Rect = { x: cx - w / 2, y: cy - h / 2 - 10, w, h };
      roundRect(g, bezel, 20); g.fillStyle = '#cbc1a6'; g.fill();
      g.fillStyle = '#b3a98e'; g.fillRect(cx - w * 0.15, bezel.y + h, w * 0.3, 14);
      const screen = inset(bezel, 34, 30, 34, 44);
      roundRect(g, screen, 26); g.fillStyle = '#0d120e'; g.fill();
      return {
        content: inset(screen, 16), mode: 'panel',
        after: () => {
          g.save(); roundRect(g, screen, 26); g.clip();
          g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = screen.y; y < screen.y + screen.h; y += 3) g.fillRect(screen.x, y, screen.w, 1);
          const v = g.createRadialGradient(screen.x + screen.w / 2, screen.y + screen.h / 2, screen.h * 0.3, screen.x + screen.w / 2, screen.y + screen.h / 2, screen.w * 0.7);
          v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = v; g.fillRect(screen.x, screen.y, screen.w, screen.h);
          g.restore();
        },
      };
    }
    case 'wrist': {
      const face: Rect = { x: cx - 130, y: cy - 140, w: 260, h: 280 };
      g.fillStyle = '#3a3d44'; g.fillRect(cx - 90, R.y, 180, R.h);
      roundRect(g, face, 56); g.fillStyle = '#121418'; g.fill();
      return { content: inset(face, 18, 24), mode: 'panel' };
    }
    case 'book': {
      const w = Math.min(R.w * 0.9, 960), h = Math.min(w * 0.6, R.h * 0.88);
      const cover: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      // 书本变体（M12b-53）：ast.bookStyle = flat = 正对屏幕的硬边书（直角、无皮革纹、无纸纹、书脊只是一道细缝，obra-dinn#3）；
      // ast.pageLeft / pageRight：endpaper 整页铺图案的衬页（vis.pattern，没选时有序抖动）/ framed 带内双线框的扉页 / plain 素页 / content 内容页（原来的）。
      // 一页不是内容页（endpaper / plain）时主体与数据都放到另一页（obra-dinn#20）。都没选时与原来逐字一样
      const flat = bookOpt(r, th, 'ast.bookStyle', 'leather') === 'flat';
      const pl = bookOpt(r, th, 'ast.pageLeft', 'content'), pr = bookOpt(r, th, 'ast.pageRight', 'content');
      const ink = inkC ?? '#33261a';
      let pages: Rect;
      if (flat) {
        g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 4; g.fillStyle = coverC ?? '#2b2a22'; g.fillRect(cover.x, cover.y, cover.w, cover.h); g.restore();
        pages = inset(cover, 10);
        g.fillStyle = pageC ?? '#f3ead6'; g.fillRect(pages.x, pages.y, pages.w, pages.h);
        g.fillStyle = withAlpha(ink, 0.55); g.fillRect(Math.round(pages.x + pages.w / 2) - 0.5, pages.y, 1, pages.h);
      } else {
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
        roundRect(g, cover, 10); g.fillStyle = coverC ? mix(coverC, '#000', 0.15) : '#5b3420'; g.fill();
        g.restore();
        g.save(); roundRect(g, cover, 10); g.clip(); fillMaterial(g, cover.x, cover.y, cover.w, cover.h, 'leather', coverC ?? '#6a3b24'); g.restore();
        pages = inset(cover, 14);
        g.save(); g.beginPath(); g.rect(pages.x, pages.y, pages.w, pages.h); g.clip();
        fillMaterial(g, pages.x, pages.y, pages.w, pages.h, 'paper', pageC ?? '#f3ead6');
        const sp = g.createLinearGradient(pages.x + pages.w / 2 - 40, 0, pages.x + pages.w / 2 + 40, 0);
        sp.addColorStop(0, 'rgba(0,0,0,0)'); sp.addColorStop(0.5, 'rgba(60,40,20,0.35)'); sp.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sp; g.fillRect(pages.x + pages.w / 2 - 40, pages.y, 80, pages.h);
        g.restore();
      }
      if (pl === 'content' && pr === 'content') return { content: inset(pages, 28, 24), mode: 'spread', ink, page: pages };
      const half = pages.w / 2, left = { ...pages, w: half }, right = { ...pages, x: pages.x + half, w: half };
      bookPage(g, th, left, pl, ink); bookPage(g, th, right, pr, ink);
      const holds = (k: string) => k === 'content' || k === 'framed';
      // 一页装内容、另一页是衬页 / 素页：内容只排在装内容的那一页；两页都装 / 都不装时照旧跨两页
      const one = holds(pl) !== holds(pr) ? (holds(pl) ? left : right) : null, padF = (k: string) => (k === 'framed' ? 14 : 0);
      if (one) { const k = one === left ? pl : pr; return { content: inset(one, 24 + padF(k), 22 + padF(k)), mode: 'panel', ink, page: one }; }
      return { content: inset(pages, 28, 24), mode: 'spread', ink, page: pages };
    }
    case 'notebook': {
      const w = Math.min(R.w * 0.72, 740), h = Math.min(R.h * 0.84, 520);
      const page: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      g.save(); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
      g.fillStyle = pageC ?? '#fbf8ef'; g.fillRect(page.x, page.y, page.w, page.h); g.restore();
      g.strokeStyle = 'rgba(90,140,200,0.35)'; g.lineWidth = 1;
      for (let y = page.y + 52; y < page.y + page.h - 8; y += 24) { g.beginPath(); g.moveTo(page.x, y); g.lineTo(page.x + page.w, y); g.stroke(); }
      g.strokeStyle = 'rgba(210,70,70,0.5)'; g.beginPath(); g.moveTo(page.x + 52, page.y); g.lineTo(page.x + 52, page.y + page.h); g.stroke();
      g.strokeStyle = '#555'; g.lineWidth = 2.5;
      for (let x = page.x + 30; x < page.x + page.w - 20; x += 34) { g.beginPath(); g.ellipse(x, page.y, 6, 11, 0, 0, Math.PI * 2); g.stroke(); }
      return { content: inset(page, 64, 30, 28, 20), mode: 'bare', ink: inkC ?? '#2a2d3a' };
    }
    case 'scroll': {
      const w = Math.min(R.w * 0.86, 920), h = Math.min(R.h * 0.66, 440);
      const sheet: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      g.save(); g.beginPath(); g.rect(sheet.x, sheet.y, sheet.w, sheet.h); g.clip();
      fillMaterial(g, sheet.x, sheet.y, sheet.w, sheet.h, 'parchment', '#e9d6a8');
      g.restore();
      for (const x of [sheet.x - 14, sheet.x + sheet.w - 14]) {
        const gr = g.createLinearGradient(x, 0, x + 28, 0);
        gr.addColorStop(0, '#5a3a1e'); gr.addColorStop(0.5, '#a0703e'); gr.addColorStop(1, '#4a2f18');
        g.fillStyle = gr; roundRect(g, { x, y: sheet.y - 18, w: 28, h: sheet.h + 36 }, 10); g.fill();
      }
      return { content: inset(sheet, 46, 26), mode: 'bare', ink: '#3b2814' };
    }
    case 'none': case 'auto': case '':
      return { content: base, mode: 'panel' };
    default: {
      // 书桌 / 线索墙 / 柜台：位图整屏，菜单放进图里空着的那块
      const art = CONTAINER_ASSET[kind] ? drawArtContainer(g, R, CONTAINER_ASSET[kind]) : null;
      if (art) return art;
      // 需要素材的容器（或位图还没加载完）：灰盒外圈 + 名字，菜单照常画在里面
      drawGreybox(g, inset(base, -26), `${CONTAINER_LABEL[kind] ?? kind}（需素材）`, { radius: 6, labelTop: true });
      return { content: base, mode: 'panel' };
    }
  }
}

/* ---------------- 菜单本体 ---------------- */

/** 多行文字断行：paint.ts 的 wrapLines（M12a-33：CJK 避头尾、拉丁按词） */
const wrap = wrapLines;

export function drawMenu(d: DrawCtx, A: Rect, th: Theme, mode: Mode, ink?: string) {
  const g = d.ctx, tx = d.t ?? g, t = th.tokens, pal = th.pal, r = th.r, k = th.scale;
  let base = bodyOpts(t, pal);
  let titleO = titleOpts(t, pal, base, 'title');
  let nameO = titleOpts(t, pal, base, 'name');
  if (ink) {
    // 纸面容器（书、笔记本、卷轴）：字用墨色，不用皮肤的面板字色
    base = { ...base, color: ink, glow: undefined, outline: undefined, shadow: undefined, glowColor: undefined };
    titleO = { ...titleO, color: ink, glow: undefined, outline: undefined, glowColor: undefined };
    nameO = { ...nameO, color: ink, glow: undefined, outline: undefined, glowColor: undefined };
  }
  const iconO = (c: string): TextOpts => ({ ...base, size: (t.textSize ?? 13) * k, color: resolveColor(c, pal) });
  const accent = resolveColor('@accent', pal);
  const S = (n: number) => n * k;
  // 触屏时可点的页签、列表行、格子、按钮不低于 ix.touchSize（M8b；px@1080p → 设计单位，M12a-05）
  const tp = px1080(tapMin(r));
  const panel: BoxStyle = t.panel;
  const tSize = Math.max(titleO.size * 1.35, 18) * k;
  const bigTitle: TextOpts = { ...titleO, size: tSize };
  // 菜单数据：当前内容包的 menu（MENU 就是它的视图）
  const M = pack().menu;

  const content = (inner: Rect) => {
    // 标题 + 页签
    const lh = tSize * 1.4;
    drawText(tx, M.title, inner.x, inner.y, lh, bigTitle);
    let x = inner.x + measure(tx, M.title, bigTitle) + S(18);
    M.tabs.forEach((tab, i) => {
      const w = Math.max(measure(tx, tab, base) + S(16), tp), h = Math.max(S(24), tp);
      const tr: Rect = { x, y: inner.y + (lh - h) / 2, w, h };
      if (i === 0) drawBox(g, tr, t.key, pal);
      logTarget(g, tr, tab, 'tab');
      drawText(tx, tab, x + S(8), tr.y, h, i === 0 ? { ...base, color: resolveColor(t.key.color ?? t.text, pal), weight: 700 } : { ...base, color: withAlpha(base.color, 0.6) });
      x += w + S(6);
    });
    const body: Rect = { x: inner.x, y: inner.y + lh + S(10), w: inner.w, h: inner.h - lh - S(10) };
    const spread = mode === 'spread';
    const side = spread || body.w >= S(420);
    const gap = spread ? S(64) : S(14);
    const listR: Rect = side ? { ...body, w: (body.w - gap) * (spread ? 0.5 : 0.56) } : { ...body, h: body.h * 0.5 };
    const detR: Rect = side ? { x: listR.x + listR.w + gap, y: body.y - (spread ? lh + S(10) : 0), w: body.w - listR.w - gap, h: body.h + (spread ? lh + S(10) : 0) } : { x: body.x, y: listR.y + listR.h + S(10), w: body.w, h: body.h - listR.h - S(10) };

    // 列表或格子
    const arr = r.str('lay.arrangement', 'list');
    if (arr === 'grid') {
      const cols = Math.max(2, Math.min(r.num('lay.columns', 4), Math.floor(listR.w / S(48))));
      const sz = Math.max(tp, Math.min(S(64), (listR.w - (cols - 1) * S(6)) / cols));
      M.items.forEach(([icon, , qty], i) => {
        const sr: Rect = { x: listR.x + (i % cols) * (sz + S(6)), y: listR.y + Math.floor(i / cols) * (sz + S(6)), w: sz, h: sz };
        if (sr.y + sz > listR.y + listR.h) return;
        // 格子：面板字色的淡底 + 细边（任何皮肤上都看得见格子）
        const tc = resolveColor(t.text, pal);
        drawBox(g, sr, { bg: { solid: withAlpha(tc, 0.07) }, border: { width: 1, color: withAlpha(tc, 0.28) }, radius: Math.min(8, sz * 0.12), step: panel.step ? 2 : undefined }, pal);
        const gw = measure(tx, icon, iconO(t.icon));
        drawText(tx, icon, sr.x + sz / 2 - gw / 2, sr.y + sz * 0.22, sz * 0.5, { ...iconO(t.icon), size: sz * 0.36 });
        const q = String(qty), qw = measure(tx, q, { ...base, size: S(11) });
        drawText(tx, q, sr.x + sz - qw - S(4), sr.y + sz - S(16), S(14), { ...base, size: S(11) });
        if (i === 0) { g.save(); g.strokeStyle = accent; g.lineWidth = 2; g.strokeRect(sr.x - 1, sr.y - 1, sz + 2, sz + 2); g.restore(); }
        logTarget(g, sr, icon, 'slot');
      });
    } else {
      const rh = Math.max(S(28), tp);
      M.items.forEach(([icon, name, qty], i) => {
        const y = listR.y + i * (rh + S(2));
        if (y + rh > listR.y + listR.h) return;
        if (i === 0) { g.fillStyle = withAlpha(accent, 0.16); g.fillRect(listR.x, y, listR.w, rh); g.fillStyle = accent; g.fillRect(listR.x, y, S(3), rh); }
        drawText(tx, icon, listR.x + S(10), y, rh, iconO(i % 2 ? t.icon : '@accent'));
        drawText(tx, name, listR.x + S(32), y, rh, base);
        logTarget(g, { x: listR.x, y, w: listR.w, h: rh }, name, 'listRow');
        const q = `×${qty}`, qw = measure(tx, q, base);
        drawText(tx, q, listR.x + listR.w - qw - S(8), y, rh, { ...base, color: withAlpha(base.color, 0.7) });
      });
    }

    // 详情：水印 → 名字 → 描述 → 属性条 → 按钮
    const detailBox = !spread && mode === 'panel';
    const drawDetail = () => {
      const p = inset(detR, detailBox ? S(14) : 0, detailBox ? S(12) : 0);
      drawWatermark(g, detR, r.str('ast.watermark', 'none'), ink ?? resolveColor(t.text, pal), r.num('ast.watermarkOpacity', 0.1), t.panel.ornament?.motif, t.panel.ornament?.level);
      let y = p.y;
      const big: TextOpts = { ...nameO, size: nameO.size * 1.25 * k };
      drawText(tx, M.detail.name, p.x, y, big.size * 1.5, big);
      y += big.size * 1.5 + S(4);
      // 行高按画出来的字号算、放不下的行不画（整合修复：B2 ⑪「视觉小说详情框最后一行（时间）画到框外」——品质下限把小字抬大以后，
      // 写死的 20 / 22 行高装不下，最后一条属性画到了详情框的下边框外面）。按钮行放得下时属性行也给它让位
      const bh = Math.max(S(30), tp), by = p.y + p.h - bh, bottom = p.y + p.h;
      const lh = Math.max(S(20), drawnSize(tx, base) * 1.35), sO = { ...base, size: S(12) }, sh = Math.max(S(22), drawnSize(tx, sO) * 1.45);
      for (const line of wrap(tx, plainText(M.detail.desc), p.w, base).slice(0, 3)) { if (y + lh > bottom) break; drawText(tx, line, p.x, y, lh, base); y += lh; }
      y += S(8);
      for (const [label, v] of M.detail.stats) {
        if (y + sh - S(4) > bottom) break;
        const lw = Math.max(S(44), measure(tx, label, sO) + S(8));
        drawText(tx, label, p.x, y, sh - S(6), sO);
        drawBar(g, { x: p.x + lw, y: y + (sh - S(6)) / 2 - Math.max(6, t.bar.height * 0.8) / 2, w: p.w - lw, h: Math.max(6, t.bar.height * 0.8) }, t, pal, v);
        y += sh;
      }
      let bx = p.x;
      for (const label of M.buttons) {
        const lw = Math.max(measure(tx, label, base) + S(28), tp);
        if (by > y) {
          drawBox(g, { x: bx, y: by, w: lw, h: bh }, t.key, pal);
          logTarget(g, { x: bx, y: by, w: lw, h: bh }, label, 'button');
          drawText(tx, label, bx + S(14), by, bh, { ...base, color: resolveColor(t.key.color ?? t.text, pal), weight: 700 });
        }
        bx += lw + S(8);
      }
      void fitLine;
    };
    if (detailBox) box(d, detR, { ...panel, ...(t.dialog ?? {}), rotate: 0, shadows: [], fx: undefined, tail: undefined } as BoxStyle, pal, drawDetail);
    else drawDetail();
  };

  if (mode === 'panel') {
    // 菜单的主面板：饰件作用范围 = 只画主面板（templatePanels）时只有它带饰件（M12a-07）
    box(d, A, panel.ornament ? { ...panel, ornament: { ...panel.ornament, container: true } } : panel, pal, () => content(inset(A, S(18), S(14))));
  } else {
    withTransform(g, A, {}, () => content(A));
  }
}
