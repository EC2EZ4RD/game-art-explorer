import { assetUrl, getAsset } from '../content/assets';
import { trackLoad } from '../engine/textures';
import { artRef, iconOf, pack, packFor, type ArtKey, type ContentPack } from './content';
import type { Rect } from './paint';
import type { Resolved } from './sys/resolve';
import { sceneLumVersion } from './sceneLum';

/*
 * 游戏 UI 的位图素材（docs/ui-hud-plan.md M11① / M11②，AI 生成，处理见 scripts/assets/process_ui.py，登记在 src/content/assets.json）：
 *   九宫格外框 5 种、角花 / 宝石铆钉 / 缎带、图标两套（手绘 / 3D）、徽章、空状态插画、立绘（全身 ×2、半身、Q 版）、
 *   主视觉 / 风景背景、书桌 / 线索墙 / 柜台三个叙事容器、羊皮纸地图、书法标题。
 * 画法统一：素材没加载完（或参数没选到）时 draw* 返回 false，调用方继续用原来的程序化画法 / 灰盒——所以截图前要 texturesReady()。
 * 每张图加载完成会让 uiAssetsVersion() 加一，HudSystem 据此重画。
 * 示例内容包（docs/c1-content-packs.md）：立绘、主视觉、书法标题画的是"雪线旅人"，只在当前包有这张图（content 的 artRef）时才用，
 *   别的包返回 null / false，调用方画剪影 / 灰盒 / 文字；外框、图标集、徽章、风景插画、容器、地图是风格素材，所有包共用。
 */

const images = new Map<string, HTMLImageElement | null>();
let version = 0;
/**
 * HUD 要不要重画的版本：位图加载完成 + 画面亮度网格更新（sceneLum.ts，边缘衬底按画面亮度垫，审查修复 ①）。HudSystem 的重画键用它
 */
export const uiAssetsVersion = () => version + sceneLumVersion();
/** 只算位图加载的版本（烘焙缓存、模板测量的记忆键用它：画面亮度变了不用重烘） */
export const uiImagesVersion = () => version;

/** 取一张图（第一次调用时开始加载）；没加载完返回 null */
export function uiImage(file: string): HTMLImageElement | null {
  if (images.has(file)) return images.get(file)!;
  if (typeof Image === 'undefined') { images.set(file, null); return null; }
  images.set(file, null);
  const img = new Image();
  const p = new Promise<void>((resolve) => {
    img.onload = () => { images.set(file, img); version++; resolve(); };
    img.onerror = () => { console.warn('UI 素材加载失败', file); resolve(); };
  });
  img.src = assetUrl(file);
  trackLoad(p);
  return null;
}

/** 素材登记表里某个 id 的某个文件（files.image / files.atlas / files.<name>） */
export function assetFile(id: string, key = 'image'): string | null {
  const a = getAsset(id);
  return (a?.files[key] ?? null) as string | null;
}

/** 预加载一组素材（UI 打开时调用一次，免得第一帧全是灰盒） */
export function preloadUiAssets(ids: string[]) {
  for (const id of ids) {
    const a = getAsset(id);
    if (!a) continue;
    // *_godot.png 是给 Godot 迁移包的小图，网页不用
    for (const [k, f] of Object.entries(a.files)) if (k !== 'godot') uiImage(String(f));
  }
}

/* ---------------- 参数取值 → 素材 ---------------- */

/** 九宫格外框：ast.frame（carvedNinePatch / plainNinePatch）× ast.frameMat */
export const FRAME_ASSET: Record<string, string> = { gold: 'ui_frame_gold', bronze: 'ui_frame_bronze', stone: 'ui_frame_stone', wood: 'ui_frame_wood', leather: 'ui_frame_leather' };
export function frameAssetId(kind: string, mat: string): string | null {
  if (kind !== 'carvedNinePatch' && kind !== 'plainNinePatch') return null;
  return FRAME_ASSET[mat] ?? null;
}

/**
 * 图标集（ast.iconSet = asset）：vis.iconStyle = render3d / realistic → 3D 渲染，painted → 手绘。
 * 像素 / 扁平 / 线描等画风没有对应的位图集：派生规则（D-iconSet：像素图标也算"素材"）给的不套手绘集——像素皮肤配厚涂图标很违和；手动选了素材图标才用手绘集。
 */
export function iconSetId(r: Resolved, style?: string): string | null {
  if (r.str('ast.iconSet', 'auto') !== 'asset') return null;
  // style（M12b-58）：按目标的画风（vis.iconStyle@el.toolbar……，core.ts 的 iconStyleOf 取），没给时全局
  const st = style ?? r.str('vis.iconStyle', 'painted');
  if (st === 'render3d' || st === 'realistic') return 'ui_icons_3d';
  if (st === 'painted') return 'ui_icons_painted';
  if (r.src('ast.iconSet')?.layer === 'derived') return null;
  // 一屏一种图标语言（§8 RC4，审查修复 ⑭）：有人显式选了别的图标画风（像素 / 线描 / 扁平 / 双色 / 剪影……，复刻常写 pixel）时不套手绘位图集，
  // 物品与技能都画矢量图标；画风只是默认值时照旧用手绘集（手动选了素材图标的原意）
  const sl = r.src('vis.iconStyle')?.layer, chosenGlobal = !!sl && sl !== 'default' && sl !== 'fallback' && sl !== 'ruleDefault' && sl !== 'derived';
  const scopedOther = style !== undefined && style !== 'auto' && style !== r.str('vis.iconStyle', 'painted');
  if (chosenGlobal || scopedOther) return null;
  return 'ui_icons_painted';
}
/** 样本物品名 → 图集里的名字（MENU.items、DATA.reward 等用的中文名；包里没声明图标的物品按它查，新包的 featured.item 也可以写这里有的名字） */
export const ITEM_BY_NAME: Record<string, string> = {
  木材: 'wood', 石块: 'stone', 铁矿: 'ironOre', 水晶: 'crystal', 草药: 'herb', 绳索: 'rope', 松脂: 'resin', 陶罐: 'pot',
  剑: 'sword', 盾: 'shield', 药水: 'potion', 金币: 'coin', 宝石: 'gem', 钥匙: 'key', 地图: 'map', 卷轴: 'scroll',
};
/** 样本里用的符号 → 物品（格子只给了符号时的近似对照；只有声明了 glyphIcons 的包——雪线旅人——才这样猜） */
export const ITEM_BY_GLYPH: Record<string, string> = {
  '◆': 'wood', '●': 'coin', '▲': 'ironOre', '✦': 'crystal', '♥': 'potion', '■': 'rope', '⚔': 'sword', '⛨': 'shield', '✿': 'herb', '◈': 'gem', '▣': 'pot',
};
/**
 * 物品名或符号 → 图集里的名字：当前内容包里声明过的图标（物品行 / 奖励行 / 资源行 / icons 补充表）→ 中文名对照 → 按符号猜（只有 glyphIcons 的包）。
 * 别的包没声明图标的格子返回 null，画符号——不会再把"◆"一律猜成木头。
 */
export const itemName = (nameOrGlyph: string): string | null =>
  iconOf(nameOrGlyph) ?? ITEM_BY_NAME[nameOrGlyph] ?? (pack().glyphIcons ? ITEM_BY_GLYPH[nameOrGlyph] : undefined) ?? null;

/** 徽章（cmp.badge）→ 徽章图集 */
export const BADGE_ITEM: Record<string, string> = { medal: 'medal', trophy: 'trophy', winged: 'winged', laurel: 'laurel', crest: 'crest', stamp: 'stamp', crystal: 'crystal', chevron: 'chevron', base: 'base' };

/** 角花（ast.ornaments 含 corners）按母题选：花叶 / 祥云 / 羽翼 / 符文 */
export function cornerItem(motif: string): string {
  // vis.motif 的取值：cloud / sakura / inkSplash → 祥云；wings / stars / hearts → 羽翼；runes / circuit → 符文；其余 → 花叶
  if (['cloud', 'sakura', 'inkSplash', 'huiwen', 'kamon'].includes(motif)) return 'cloud';
  if (['wings', 'stars', 'hearts'].includes(motif)) return 'wing';
  if (['runes', 'circuit', 'magicCircle', 'constellation', 'hex'].includes(motif)) return 'rune';
  return 'floral';
}

/** 背景（ast.bgArt）：风景插画是通用的风格素材；keyArt 这一项是雪线旅人的主视觉 id（旧调用方的判断还用它），按包取文件用 bgAssetFile */
export const BG_ASSET: Record<string, string> = { keyArt: 'ui_keyart', sceneArt: 'ui_scene_watercolor' };
/** 背景位图文件：主视觉只用当前内容包自己的（artRef('keyArt')，没有 → null，调用方画"主视觉（需素材）"灰盒），风景插画所有包共用 */
export function bgAssetFile(bg: string, p: ContentPack = pack()): string | null {
  if (bg === 'keyArt') {
    const ref = artRef('keyArt', p);
    return ref ? assetFile(ref.id, ref.file) : null;
  }
  return BG_ASSET[bg] ? assetFile(BG_ASSET[bg]) : null;
}
/** 叙事内容器（ast.container / ast.containerSurface） */
export const CONTAINER_ASSET: Record<string, string> = { desk: 'ui_desk', tableTop: 'ui_desk', table: 'ui_desk', clueWall: 'ui_clue_wall', noticeBoard: 'ui_clue_wall', counter: 'ui_counter', shelf: 'ui_counter' };

/**
 * 立绘（cnt.characterMedium）：全身按画风选二次元 / 厚涂；半身、Q 版、头像来自同一张角色表。
 * 图取自 r 这一侧的内容包（packFor(r)，面板缩略图等可能在 HudSystem 之外调，不读全局当前包）；包里没有这张立绘 → null，调用方画剪影 / 灰盒。
 */
export function characterImage(r: Resolved, medium: string): string | null {
  let key: ArtKey;
  switch (medium) {
    case 'full': {
      const dark = r.str('col.lightness', 'light') === 'dark';
      const painterly = ['serif', 'gothic', 'slabWestern'].includes(r.str('typ.display.family', '')) || (dark && r.num('vis.ornament', 1) >= 2);
      key = painterly ? 'painterly' : 'anime';
      break;
    }
    case 'bust': case 'avatar': key = 'bust'; break;
    case 'chibi': key = 'chibi'; break;
    default: return null;
  }
  const ref = artRef(key, packFor(r));
  return ref ? assetFile(ref.id, ref.file) : null;
}

/** 地图画风（vis.mapStyle）用羊皮纸手绘底图 */
export const mapAsset = (style: string) => (style === 'parchment' || style === 'painted' ? assetFile('ui_map_parchment') : null);

/** 缎带（cmp.plate = ribbon / swallowtail）按强调色的色相选红 / 蓝 / 金 */
export function ribbonFile(accentHex: string): string | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(accentHex.trim());
  let name = 'red';
  if (m) {
    const [rr, gg, bb] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    if (bb > rr && bb >= gg) name = 'blue';
    else if (rr > 150 && gg > 120 && bb < 110) name = 'gold';
  }
  return assetFile('ui_ribbons', name);
}

/* ---------------- 画法 ---------------- */

type G = CanvasRenderingContext2D;

/** 整张图按 cover（铺满裁切）/ contain（完整放进）/ stretch 画进矩形；anchor 0~1 决定 cover 裁切时保留哪部分 */
export function drawImageFit(g: G, file: string | null, r: Rect, mode: 'cover' | 'contain' | 'stretch' = 'cover', anchor: [number, number] = [0.5, 0.5]): boolean {
  if (!file) return false;
  const img = uiImage(file);
  if (!img) return false;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (mode === 'stretch') { g.drawImage(img, r.x, r.y, r.w, r.h); return true; }
  const s = mode === 'cover' ? Math.max(r.w / iw, r.h / ih) : Math.min(r.w / iw, r.h / ih);
  const w = iw * s, h = ih * s;
  if (mode === 'contain') { g.drawImage(img, r.x + (r.w - w) * anchor[0], r.y + (r.h - h) * anchor[1], w, h); return true; }
  // cover：按 anchor 取源图里的一块
  const sw = r.w / s, sh = r.h / s;
  g.drawImage(img, (iw - sw) * anchor[0], (ih - sh) * anchor[1], sw, sh, r.x, r.y, r.w, r.h);
  return true;
}

/* ---------------- 插画处理滤镜（M12b-32） ---------------- */

/**
 * 插画处理（cnt.characterRender / cnt.illustrationRender / ast.bgArtRender 的取值）：对位图做离屏逐像素处理，按「图片 + 模式」缓存（最多 16 张，最长边 512）。
 * monochrome 单色、sketch 素描（边缘线 + 淡明暗）、lineart 线稿、charcoal 炭笔（重线 + 颗粒）、engraving 铜版（按明度的排线 + 交叉线）、relief 浮雕（骨白）、
 * cutout 黑白剪纸（阈值两色 + 白色轮廓）、inkWash 水墨淡彩（去饱和 + 四级色调分离 + 一次模糊、纸色底）、halftone 网点（有序抖动）。color = 原样（不进这里）。
 * 位图没加载完 / 跨域取不到像素时返回 null（调用方画原图或灰盒）。Godot：TextureRect 上的 canvas_item shader（同一套公式：阈值、Sobel 边缘、色调分离、排线）
 */
export const ART_FILTERS = new Set(['monochrome', 'sketch', 'lineart', 'charcoal', 'engraving', 'relief', 'cutout', 'inkWash', 'halftone']);
/** 处理结果的缓存：键 = 图 | 模式 | 边长档；记着源图对象（素材重载换了图对象时重做）；cv = null = 这张图处理失败过（跨域取不到像素 / 没有 2D 上下文） */
const FILTERED = new Map<string, { img: HTMLImageElement; cv: HTMLCanvasElement | null }>();
/**
 * 处理后的图的最长边档（B7 审查修复 ㉕）：按这张图画到画面上的设备像素选（target，调用方按 cover / contain 的缩放 × 画布变换算），取不小于它的一档，最大 1536——
 * 原来一律压到 512，全屏背景（ast.bgArtRender）的炭笔颗粒 / 线稿在 1080p 被拉大 3.75 倍成糊块；头像、小图窗仍是 512
 */
export const FILTER_EDGES = [512, 1024, 1536];
export function filteredImage(file: string, mode: string, target = 512): HTMLCanvasElement | null {
  if (!ART_FILTERS.has(mode) || typeof document === 'undefined') return null;
  const img = uiImage(file);
  if (!img) return null;
  const edge = FILTER_EDGES.find((b) => b >= target) ?? FILTER_EDGES[FILTER_EDGES.length - 1];
  const key = `${file}|${mode}|${edge}`, hit = FILTERED.get(key);
  // 命中（同一张源图）直接用；失败过的也直接返回 null（B7 审查修复 ㉗：原来失败不记，每帧新建画布、整张图画一遍再抛一次异常）
  if (hit && hit.img === img) { FILTERED.delete(key); FILTERED.set(key, hit); return hit.cv; }
  const keep = (cv: HTMLCanvasElement | null) => { FILTERED.delete(key); FILTERED.set(key, { img, cv }); while (FILTERED.size > 16) FILTERED.delete(FILTERED.keys().next().value!); return cv; };
  const s = Math.min(1, edge / Math.max(1, img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (!c) return keep(null);
  c.drawImage(img, 0, 0, w, h);
  let id: ImageData;
  try { id = c.getImageData(0, 0, w, h); } catch { return keep(null); }
  filterPixels(id.data, w, h, mode);
  c.putImageData(id, 0, 0);
  return keep(cv);
}
/** 逐像素处理（纯函数，可单测）：d = RGBA 字节、w × h */
export function filterPixels(d: Uint8ClampedArray, w: number, h: number, mode: string) {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const at = (x: number, y: number) => L[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  const sobel = (x: number, y: number) => {
    const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
    const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
    return Math.min(1, (Math.abs(gx) + Math.abs(gy)) / 360);
  };
  const paper = [242, 236, 222], ink = [36, 34, 32];
  const put = (i: number, r: number, g: number, b: number) => { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; };
  const lerp = (t: number) => [paper[0] + (ink[0] - paper[0]) * t, paper[1] + (ink[1] - paper[1]) * t, paper[2] + (ink[2] - paper[2]) * t] as const;
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = L[i] / 255;
    if (mode === 'monochrome') { const g = L[i]; put(i, g, g, g); continue; }
    if (mode === 'sketch' || mode === 'lineart' || mode === 'charcoal') {
      const e = sobel(x, y), grain = mode === 'charcoal' ? (((x * 73856093) ^ (y * 19349663)) & 15) / 60 : 0;
      const t = mode === 'lineart' ? Math.min(1, e * 2.2) : mode === 'sketch' ? Math.min(1, e * 1.8 + (1 - v) * 0.25) : Math.min(1, e * 2.6 + (1 - v) * 0.55 + grain);
      const [r, g, b] = lerp(t); put(i, r, g, b); continue;
    }
    if (mode === 'engraving') {
      const dark = 1 - v, a = (x + y * 0.5) % 6 < dark * 6, c2 = dark > 0.6 && (x - y * 0.5 + 600) % 6 < (dark - 0.6) * 12;
      const [r, g, b] = lerp(a || c2 ? 0.92 : 0.04); put(i, r, g, b); continue;
    }
    if (mode === 'relief') { const e = at(x - 1, y - 1) - at(x + 1, y + 1), t = Math.max(0, Math.min(255, 196 + e * 0.9)); put(i, t * 0.92, t * 0.88, t * 0.8); continue; }
    // 剪纸（B7 审查修复 ㉓：黑纸剪影 + 白色轮廓线——原来非暗处映成白、只有暗块是黑，整张图读成白底黑斑，与「黑底白线」相反）：边缘白，其余近黑（高光略提一点）
    if (mode === 'cutout') { const edge = sobel(x, y) > 0.35, c = edge ? 245 : v > 0.82 ? 44 : 18; put(i, c, c, c); continue; }
    if (mode === 'halftone') { const t = (1 - v) * 16 > B4[(y % 4) * 4 + (x % 4)]; const [r, g, b] = lerp(t ? 0.92 : 0.02); put(i, r, g, b); continue; }
    if (mode === 'inkWash') { const q = Math.round((1 - v) * 4) / 4; const [r, g, b] = lerp(q * 0.85); put(i, r, g, b); }
  }
  if (mode === 'inkWash') {
    // 纸面晕染：一次 3 × 3 均值模糊
    const src = d.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) for (let k = 0; k < 3; k++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[((y + dy) * w + x + dx) * 4 + k];
      d[(y * w + x) * 4 + k] = s / 9;
    }
  }
}
/** drawImageFit 的带滤镜版：mode = color / 空时原样画；有滤镜时画处理后的离屏图（取不到像素时退回原图）。处理图的分辨率按画到画面上的设备像素取（filteredImage 的 target） */
export function drawImageFitFx(g: G, file: string | null, r: Rect, mode: 'cover' | 'contain' | 'stretch', anchor: [number, number], fx: string): boolean {
  if (!file) return false;
  const img = fx && fx !== 'color' ? uiImage(file) : null;
  const t = img ? g.getTransform?.() : null, dev = t ? Math.max(1e-3, Math.hypot(t.a, t.b)) : 1;
  const fit = img ? (mode === 'contain' ? Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight) : Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight)) : 1;
  const cv = img ? filteredImage(file, fx, Math.max(img.naturalWidth, img.naturalHeight) * fit * dev) : null;
  if (!cv) return drawImageFit(g, file, r, mode, anchor);
  const iw = cv.width, ih = cv.height;
  if (mode === 'stretch') { g.drawImage(cv, r.x, r.y, r.w, r.h); return true; }
  const s = mode === 'cover' ? Math.max(r.w / iw, r.h / ih) : Math.min(r.w / iw, r.h / ih);
  if (mode === 'contain') { g.drawImage(cv, r.x + (r.w - iw * s) * anchor[0], r.y + (r.h - ih * s) * anchor[1], iw * s, ih * s); return true; }
  const sw = r.w / s, sh = r.h / s;
  g.drawImage(cv, (iw - sw) * anchor[0], (ih - sh) * anchor[1], sw, sh, r.x, r.y, r.w, r.h);
  return true;
}

/**
 * 叙事场景图（书桌 / 线索墙 / 柜台）的摆法：cover，但每条边最多裁掉 maxCrop（比例）。
 * 物件都摆在图的四边，画面比图窄（带侧栏的视口、竖屏）时纯 cover 会把它们裁掉；这时宁可缩小、空出条带。返回图在屏幕上的矩形。
 */
export function scenePlacement(iw: number, ih: number, R: Rect, maxCrop = 0.04): Rect {
  const cover = Math.max(R.w / iw, R.h / ih);
  const s = Math.min(cover, R.w / (iw * (1 - 2 * maxCrop)), R.h / (ih * (1 - 2 * maxCrop)));
  const w = iw * s, h = ih * s;
  return { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h };
}

/** 按 scenePlacement 画场景图；盖不满的条带用同一张图模糊压暗铺底。没加载完返回 null，否则返回图的矩形 */
export function drawScene(g: G, file: string | null, R: Rect, maxCrop = 0.04): Rect | null {
  if (!file) return null;
  const img = uiImage(file);
  if (!img) return null;
  const p = scenePlacement(img.naturalWidth, img.naturalHeight, R, maxCrop);
  const covers = p.x <= R.x + 0.5 && p.y <= R.y + 0.5 && p.x + p.w >= R.x + R.w - 0.5 && p.y + p.h >= R.y + R.h - 0.5;
  g.save();
  g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip();
  if (!covers) {
    g.save();
    g.filter = `blur(${Math.round(Math.max(8, Math.min(R.w, R.h) * 0.02))}px) brightness(0.55)`;
    drawImageFit(g, file, { x: R.x - 24, y: R.y - 24, w: R.w + 48, h: R.h + 48 }, 'cover');
    g.restore();
    // 条带与图之间一道软阴影，免得硬接缝
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24; g.fillStyle = '#000'; g.fillRect(p.x, p.y, p.w, p.h); g.restore();
  }
  g.drawImage(img, p.x, p.y, p.w, p.h);
  g.restore();
  return p;
}

/** 场景图里的一块（源图比例坐标 x0, y0, x1, y1）落在屏幕的哪里；超出画面的部分收回到边距以内 */
export function sceneHole(p: Rect, R: Rect, hole: [number, number, number, number]): Rect {
  const m = Math.max(12, Math.min(R.w, R.h) * 0.03);
  const x0 = Math.max(R.x + m, p.x + hole[0] * p.w), y0 = Math.max(R.y + m, p.y + hole[1] * p.h);
  const x1 = Math.min(R.x + R.w - m, p.x + hole[2] * p.w), y1 = Math.min(R.y + R.h - m, p.y + hole[3] * p.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** 图集里的一项（meta.rects[name] = [x, y, w, h] 像素）按 contain 画进矩形 */
export function drawAtlasItem(g: G, id: string, name: string, r: Rect): boolean {
  const a = getAsset(id);
  const file = a?.files.atlas as string | undefined;
  const rect = (a?.meta.rects as unknown as Record<string, [number, number, number, number]> | undefined)?.[name];
  if (!file || !rect) return false;
  const img = uiImage(file);
  if (!img) return false;
  const [sx, sy, sw, sh] = rect;
  const s = Math.min(r.w / sw, r.h / sh);
  const w = sw * s, h = sh * s;
  g.drawImage(img, sx, sy, sw, sh, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  return true;
}

/** 图集的位图加载好了没有（饰件占位要知道画的是位图还是矢量，M12a-08） */
export function atlasReady(id: string): boolean {
  const f = assetFile(id, 'atlas');
  return !!f && !!uiImage(f);
}

/**
 * 按颜色着色的图集项（M12a-08：角花图集是金色 / 红金 / 白 / 蓝的成品色，饰色是白、墨或描线材质时要换色）：
 * 去色并提亮成灰阶（保留明暗与笔触），再正片叠底饰色，最后按原图的透明度裁回——白色饰色 = 白描角花，红色 = 红角花。
 * 着色后的整项缓存（键 = 图集 + 项 + 颜色，最多 12 张）；没加载完返回 false。Godot：灰阶角件贴图 + TextureRect.modulate（乘法着色）
 */
const tintedItems = new Map<string, HTMLCanvasElement>();
export function drawAtlasItemTinted(g: G, id: string, name: string, r: Rect, color: string): boolean {
  const a = getAsset(id);
  const file = a?.files.atlas as string | undefined;
  const rect = (a?.meta.rects as unknown as Record<string, [number, number, number, number]> | undefined)?.[name];
  if (!file || !rect) return false;
  const img = uiImage(file);
  if (!img) return false;
  const [sx, sy, sw, sh] = rect;
  const key = `${id}|${name}|${color}`;
  let cv = tintedItems.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = sw; cv.height = sh;
    const c = cv.getContext('2d')!;
    c.filter = 'grayscale(1) brightness(1.35)';
    c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    c.filter = 'none';
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = color; c.fillRect(0, 0, sw, sh);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    tintedItems.set(key, cv);
    while (tintedItems.size > 12) { const [k, old] = tintedItems.entries().next().value!; old.width = old.height = 0; tintedItems.delete(k); }
  }
  const s = Math.min(r.w / sw, r.h / sh);
  const w = sw * s, h = sh * s;
  g.drawImage(cv, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  return true;
}

/**
 * 图标着色（M12b-58，vis.iconTint）：desaturate = 去色（grayscale × 强度）、darken = 压暗（brightness 1 − 0.6 × 强度）、saturate = 饱和度倍数（auto 时 col.saturation 作用到位图）、
 * mono / accent = 灰阶提亮后正片叠底 color（单色，按原图透明度裁回）再按强度与原图混、duotone = 暗部 color2 → 亮部 color 的双色映射。
 * 着色后的整项缓存（键 = 图集 + 项 + 着色，最多 24 张）。Godot：mono = TextureRect.self_modulate；去色 / 双色 = CanvasItem shader（灰度 → mix(color2, color, 灰度)）
 */
export interface IconTint { mode: 'desaturate' | 'darken' | 'saturate' | 'mono' | 'duotone'; amount: number; color?: string; color2?: string }
const fxItems = new Map<string, HTMLCanvasElement>();
export function drawAtlasItemFx(g: G, id: string, name: string, r: Rect, fx: IconTint): boolean {
  const a = getAsset(id);
  const file = a?.files.atlas as string | undefined;
  const rect = (a?.meta.rects as unknown as Record<string, [number, number, number, number]> | undefined)?.[name];
  if (!file || !rect) return false;
  const img = uiImage(file);
  if (!img) return false;
  const [sx, sy, sw, sh] = rect;
  const key = `${id}|${name}|${fx.mode}|${fx.amount.toFixed(2)}|${fx.color ?? ''}|${fx.color2 ?? ''}`;
  let cv = fxItems.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = sw; cv.height = sh;
    const c = cv.getContext('2d')!;
    const k = Math.max(0, Math.min(1, fx.amount));
    if (fx.mode === 'desaturate' || fx.mode === 'darken' || fx.mode === 'saturate') {
      c.filter = fx.mode === 'desaturate' ? `grayscale(${k.toFixed(3)})` : fx.mode === 'darken' ? `brightness(${(1 - 0.6 * k).toFixed(3)})` : `saturate(${fx.amount.toFixed(3)})`;
      c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      c.filter = 'none';
    } else {
      // 单色 / 双色：先画灰阶，再着色，最后按原图透明度裁回
      c.filter = 'grayscale(1) brightness(1.35)';
      c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      c.filter = 'none';
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = fx.color ?? '#ffffff'; c.fillRect(0, 0, sw, sh);
      if (fx.mode === 'duotone' && fx.color2) {
        // 暗部换成 color2：在反相的灰阶上叠 color2 再加上去（lighter）
        const d = document.createElement('canvas');
        d.width = sw; d.height = sh;
        const dc = d.getContext('2d')!;
        dc.filter = 'grayscale(1) invert(1)';
        dc.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        dc.filter = 'none';
        dc.globalCompositeOperation = 'multiply';
        dc.fillStyle = fx.color2; dc.fillRect(0, 0, sw, sh);
        c.globalCompositeOperation = 'lighter';
        c.drawImage(d, 0, 0);
        d.width = d.height = 0;
      }
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      c.globalCompositeOperation = 'source-over';
      // 强度 < 1：原图在下、着色的按强度盖上去
      if (k < 1) {
        const m = document.createElement('canvas');
        m.width = sw; m.height = sh;
        const mc = m.getContext('2d')!;
        mc.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        mc.globalAlpha = k; mc.drawImage(cv, 0, 0);
        cv.width = cv.height = 0;
        cv = m;
      }
    }
    fxItems.set(key, cv);
    while (fxItems.size > 24) { const [k0, old] = fxItems.entries().next().value!; old.width = old.height = 0; fxItems.delete(k0); }
  }
  const s = Math.min(r.w / sw, r.h / sh);
  const w = sw * s, h = sh * s;
  g.drawImage(cv, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  return true;
}

/**
 * 九宫格：源图四角各 slice 像素不缩放比例地画成 border 像素，四边与中心拉伸。
 * centerFill = false 时中间不画（外框素材中间本来就是透明的）。
 */
export function drawNineSlice(g: G, file: string | null, r: Rect, slice: number, border: number, centerFill = false): boolean {
  if (!file) return false;
  const img = uiImage(file);
  if (!img) return false;
  const W = img.naturalWidth, H = img.naturalHeight;
  const b = Math.max(1, Math.min(border, r.w / 2, r.h / 2));
  const s = slice;
  const xs = [0, s, W - s, W], ys = [0, s, H - s, H];
  const dx = [r.x, r.x + b, r.x + r.w - b, r.x + r.w], dy = [r.y, r.y + b, r.y + r.h - b, r.y + r.h];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    if (i === 1 && j === 1 && !centerFill) continue;
    const sw = xs[i + 1] - xs[i], sh = ys[j + 1] - ys[j], w = dx[i + 1] - dx[i], h = dy[j + 1] - dy[j];
    if (sw <= 0 || sh <= 0 || w <= 0.5 || h <= 0.5) continue;
    g.drawImage(img, xs[i], ys[j], sw, sh, dx[i], dy[j], w, h);
  }
  return true;
}

/** 横向三段（缎带）：左右端头按高度等比画，中段拉伸 */
export function drawHSlice(g: G, file: string | null, r: Rect, capL: number, capR: number): boolean {
  if (!file) return false;
  const img = uiImage(file);
  if (!img) return false;
  const W = img.naturalWidth, H = img.naturalHeight;
  const k = r.h / H;
  const l = Math.min(capL * k, r.w / 2), rr = Math.min(capR * k, r.w / 2);
  g.drawImage(img, 0, 0, capL, H, r.x, r.y, l, r.h);
  g.drawImage(img, capL, 0, W - capL - capR, H, r.x + l, r.y, Math.max(0, r.w - l - rr), r.h);
  g.drawImage(img, W - capR, 0, capR, H, r.x + r.w - rr, r.y, rr, r.h);
  return true;
}

/** 外框素材的切边（源图像素）与边带宽度（源图像素），来自 process_ui.py 的测量 */
export function frameSlice(id: string): { slice: number; band: number; size: number } | null {
  const a = getAsset(id);
  if (!a) return null;
  const m = a.meta as unknown as { slice?: number; band?: number; size?: [number, number] };
  return m.slice ? { slice: m.slice, band: m.band ?? m.slice, size: m.size?.[0] ?? 1024 } : null;
}

/** 缎带端头宽度（源图像素） */
export function ribbonCaps(name: string): [number, number] | null {
  const a = getAsset('ui_ribbons');
  const cap = (a?.meta as unknown as { cap?: Record<string, [number, number]> } | undefined)?.cap?.[name];
  return cap ?? null;
}

/**
 * 黑墨书法字（当前内容包的 art.title，雪线旅人是 ui_calligraphy_title）按颜色着色后画进矩形（contain，居左）。
 * 书法字写的是那款游戏的名字：当前包没有这张图时返回 false，调用方照常写字 / 画"书法水印（需素材）"灰盒。
 */
// 按颜色着色后的整张字（每张约 3.6 MB）：最近用过的几种留着，拖颜色时不会无限堆；键 = 文件 + 颜色（不同包的书法字不串）
const tinted = new Map<string, HTMLCanvasElement>();
const TINT_MAX = 6;
export function drawInkTitle(g: G, r: Rect, color: string, align: 'left' | 'center' = 'left'): boolean {
  const ref = artRef('title');
  if (!ref) return false;
  const file = assetFile(ref.id, ref.file);
  if (!file) return false;
  const img = uiImage(file);
  if (!img) return false;
  const tk = `${file}|${color}`;
  let cv = tinted.get(tk);
  if (cv) { tinted.delete(tk); tinted.set(tk, cv); }
  else {
    cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const c = cv.getContext('2d')!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
    tinted.set(tk, cv);
    while (tinted.size > TINT_MAX) {
      const [k, old] = tinted.entries().next().value!;
      old.width = old.height = 0;
      tinted.delete(k);
    }
  }
  const s = Math.min(r.w / cv.width, r.h / cv.height);
  const w = cv.width * s, h = cv.height * s;
  g.drawImage(cv, align === 'center' ? r.x + (r.w - w) / 2 : r.x, r.y + (r.h - h) / 2, w, h);
  return true;
}

/** 所有 UI 素材 id（预加载与检查用） */
export const UI_ASSET_IDS = ['ui_frame_gold', 'ui_frame_bronze', 'ui_frame_stone', 'ui_frame_wood', 'ui_frame_leather', 'ui_ornament_corners', 'ui_ornament_gems', 'ui_ribbons',
  'ui_icons_painted', 'ui_icons_3d', 'ui_char_anime', 'ui_char_painterly', 'ui_char_bust_chibi', 'ui_keyart', 'ui_scene_watercolor', 'ui_desk', 'ui_clue_wall', 'ui_counter',
  'ui_badges', 'ui_empty_states', 'ui_map_parchment', 'ui_calligraphy_title'];
