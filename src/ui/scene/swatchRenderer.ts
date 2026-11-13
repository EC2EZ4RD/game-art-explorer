import { createStore, del, get, set as idbSet } from 'idb-keyval';
import { isViewKey, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { texturesReady } from '../../engine/textures';
import { HudSystem } from '../../hud/HudSystem';
import { pack, setPack } from '../../hud/content';
import { FLOW_PLAY, flowNow, setFlow } from '../../hud/flow';
import { hudFontsVersion } from '../../hud/fonts';
import { PLACEHOLDER } from '../../hud/greybox';
import { ICON_CTX, ICON_STYLE } from '../../hud/icons/draw';
import { BAKE, DRAW_LOG, FLOOR, FONT_EPOCH, ORN, paintScale, PSEUDO, setPaintScale, TEXT_K } from '../../hud/paint';
import { restoreSceneLum, SCENE_LUM, sceneLumSnapshot } from '../../hud/sceneLum';
import { uiAssetsVersion } from '../../hud/uiAssets';
import { setSim, simNow } from '../../hud/sim';
import { setWorld, worldNow } from '../../hud/world';
import { getEngine } from '../engineRef';
import { cropBox, cropCandidates, pickByDiff, SWATCH_H, SWATCH_W, type Box } from './swatchCrop';

export { SWATCH_H, SWATCH_W };

/*
 * 皮肤色板的离屏渲染（轨道 D，docs/workbench-redesign.md §5.3）。
 *
 * 第 1 天的验证结论（详见 docs/redesign/track-D.md「决定 1」）：离屏可行，不用预烘 PNG。
 *   - 另开一个 HudSystem 实例，同步画一帧（HudSystem.update 只读传进去的参数；画布用公开的 texture.image 取，不碰私有字段）；
 *   - 画之前把它会改写的模块全局（当前内容包、模拟状态、世界视图、流程、绘制记录、饰件上下文、伪本地化、字号倍数、字体版本、画布缩放）记下来，
 *     画完原样放回——主画框下一帧看到的和没画过色板一样；
 *   - resolveUi 原来只有一槽缓存：改成多槽（src/hud/sys/resolve.ts），离屏解析不再把主画面那份挤掉；
 *   - 背景：engine.sampleScene() 取一帧不带 UI 的画面（可读性检查用的同一个口子），按画面 / 场景缓存；
 *   - 毛玻璃：HudSystem 的遮罩（maskTexture.image）里白的地方换成模糊过的背景，和 OUTPUT pass 的做法一致（不含 CRT 弯曲等整屏后处理，可以接受）。
 * 裁哪一块：局内 HUD 取「生命 + 快捷栏一带」（命中框），按 1:1 显示，放不下时最多缩到一半；界面模板（没有命中框）取字号最大的那行字（标题和它的面板）一带。
 * 排队：一次画一张、在空闲时画（requestIdleCallback，没有时退回定时器）；同一组（场景 / 界面 / 画面 / 皮肤 / 参数）画过的直接用缓存（内存 + IndexedDB）。
 * 审查修复（4 / 6 / 11 / 12）：
 *   - 参数在排队时就定下来（调用方给快照）；画之前再核对背景（画面 / 画框尺寸）还是排队时的那个，不是就丢掉，不会把 B 的图存进 A 的键；
 *   - 画之前等贴图 / 字体加载完；画的过程中第一次用到的位图素材（九宫格框、图标、立绘）在画完后等它加载、重画一次再存；
 *   - 黑边按引擎同一个口径（camera.letterbox）；画的时候把正在播的流程演示摘掉（色板画的是不播流程时的样子）；
 *   - 烘焙账（BAKE 的帧号 / 预算 / 本帧新烘数）画前记下、画完放回，主画框的「稳住了才烘」判断不受色板影响。
 */

/** 放大预览的 CSS 尺寸（悬停时显示整帧） */
export const PREVIEW_W = 384;

export interface SwatchJob {
  /** 缓存键（调用方按「场景 / 界面 / 画面 / 皮肤 / 参数」算好） */
  key: string;
  /** 交给离屏 HUD 的完整参数（已经换上这个皮肤；按排队时的参数快照算，不读画的时候的） */
  values: () => Values | null;
  /** 画之前核对：背景（画面、画框尺寸）还是排队时的那个吗；不是就丢掉这一张（看得见的色板会按新的键重新排队） */
  fresh?: () => boolean;
  /**
   * 取景键（整合修复 U#5）：同一个键的色板共用一个取景框——一整行比的是同一块，而且这块是按几个对照皮肤「画出来差别最大」挑的。
   * 一般 = 当前参数 / 来源 / 背景 / 画框尺寸的哈希（与选项无关）。没给时每张按自己的绘制记录取（cropBox）
   */
  cropKey?: string;
  /** 挑取景框用的对照参数（几个风格差得远的皮肤套在当前参数上，useSwatch 给）；第一次遇到这个取景键时各画一遍、量差别 */
  probes?: () => Values[];
}

export interface SwatchResult {
  /** 152×64 的局部（data URL） */
  crop: string;
  /** 整帧缩略（悬停放大用） */
  full: string;
  /** 这一张花了多少毫秒（含解析） */
  ms: number;
}

/* ---------------- 缓存 ---------------- */

const MEM = new Map<string, SwatchResult>();
const MEM_MAX = 400;
const idb = typeof indexedDB !== 'undefined' ? createStore('gae-swatch', 'v1') : null;
const IDB_INDEX = '__index';
/** IndexedDB 里最多留多少张（按最近写入淘汰） */
const IDB_MAX = 600;

function remember(key: string, r: SwatchResult) {
  if (MEM.has(key)) MEM.delete(key);
  MEM.set(key, r);
  if (MEM.size > MEM_MAX) MEM.delete(MEM.keys().next().value!);
}

let idbIndex: string[] | null = null;
async function idbPut(key: string, r: SwatchResult) {
  if (!idb) return;
  try {
    idbIndex ??= ((await get<string[]>(IDB_INDEX, idb)) ?? []);
    idbIndex = [...idbIndex.filter((k) => k !== key), key];
    const drop = idbIndex.length > IDB_MAX ? idbIndex.splice(0, idbIndex.length - IDB_MAX) : [];
    await idbSet(key, r, idb);
    await idbSet(IDB_INDEX, idbIndex, idb);
    for (const k of drop) await del(k, idb);
  } catch { /* 存不了（隐私模式、配额）：只用内存缓存 */ }
}
async function idbGet(key: string): Promise<SwatchResult | null> {
  if (!idb) return null;
  try { return (await get<SwatchResult>(key, idb)) ?? null; } catch { return null; }
}

/** 已经有结果就同步返回（组件首帧用） */
export const peekSwatch = (key: string): SwatchResult | null => MEM.get(key) ?? null;

/* ---------------- 订阅 ---------------- */

const listeners = new Map<string, Set<(r: SwatchResult) => void>>();
function emit(key: string, r: SwatchResult) {
  remember(key, r);
  for (const f of listeners.get(key) ?? []) f(r);
}
export function onSwatch(key: string, f: (r: SwatchResult) => void): () => void {
  let s = listeners.get(key);
  if (!s) listeners.set(key, (s = new Set()));
  s.add(f);
  return () => { s!.delete(f); if (!s!.size) listeners.delete(key); };
}

/* ---------------- 排队 ---------------- */

const queue = new Map<string, SwatchJob>();
let timer = 0;
let busy = false;
/** 最近一次每张的耗时（开发钩子报给验证用） */
export const SWATCH_STATS = { drawn: 0, cacheHits: 0, idbHits: 0, lastMs: 0, totalMs: 0, bgMs: 0, failed: 0, globalsMismatch: 0, stale: 0, redrawn: 0, crops: 0, cropMs: 0, cropFallback: 0 };

/** 要一张色板：有缓存直接回调；否则排队（同一个键只排一次） */
export function requestSwatch(job: SwatchJob) {
  const hit = MEM.get(job.key);
  if (hit) { SWATCH_STATS.cacheHits++; emit(job.key, hit); return; }
  queue.set(job.key, job);
  schedule();
}
/** 取消还没画的（换场景 / 换界面后旧的那批不要了） */
export function cancelSwatches(keep?: (key: string) => boolean) {
  for (const k of [...queue.keys()]) if (!keep?.(k)) queue.delete(k);
}
/** 色板离开可见区域：没人再等这一张时从队列里拿掉 */
export function releaseSwatch(key: string) {
  if (!listeners.get(key)?.size) queue.delete(key);
}

/**
 * 空闲时再画（§5.3「空闲时分批画」）；没有 requestIdleCallback 的浏览器退回定时器。
 * 整合修复 U#4：画框每帧都在渲染时主线程很少真正空闲，原来 500ms 的超时让每张色板要等半秒（换场景后 5–6 秒才换完）——超时改成 120ms，
 * 一轮里画得快的连着再画（累计 14ms 就让出主线程）
 */
type Idle = (cb: () => void, o?: { timeout: number }) => number;
const IDLE_TIMEOUT = 120;
const TURN_BUDGET = 14;
function schedule(delay = 30) {
  if (timer || busy) return;
  const ric = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback;
  if (ric) { timer = -1; ric(() => { timer = 0; void pump(); }, { timeout: IDLE_TIMEOUT }); }
  else timer = window.setTimeout(pump, delay);
}

async function pump() {
  timer = 0;
  busy = true;
  let drew = false;
  const turn0 = performance.now();
  try {
    // IndexedDB 里有的连着取（不占主线程）；遇到要真画的，画完看这一轮用了多久：还在预算里就接着画下一张，否则让出主线程（画框照常走帧）
    while (!drew || performance.now() - turn0 < TURN_BUDGET) {
      const next = queue.entries().next();
      if (next.done) break;
      const [key, job] = next.value;
      queue.delete(key);
      try {
        const stored = await idbGet(key);
        if (stored) { SWATCH_STATS.idbHits++; emit(key, stored); continue; }
        // 贴图 / 字体还在加载时先等（背景和 HUD 都要用）
        await texturesReady();
        if (job.fresh && !job.fresh()) { SWATCH_STATS.stale++; continue; }
        // 这一轮已经画过一张、这一张又要先挑取景（要多画几遍）：留给下一轮
        if (drew && job.cropKey && !CROPS.has(job.cropKey)) { const rest = [...queue]; queue.clear(); queue.set(key, job); for (const [k, j] of rest) queue.set(k, j); break; }
        drew = true;
        const v0 = uiAssetsVersion(), f0 = hudFontsVersion();
        let r = drawSwatch(job);
        if (r) {
          // 这一张第一次用到的位图素材（uiImage 第一次调用才开始加载，这一遍画的是程序化的退路）：等加载完重画一次再存
          await texturesReady();
          if ((uiAssetsVersion() !== v0 || hudFontsVersion() !== f0) && (!job.fresh || job.fresh())) { SWATCH_STATS.redrawn++; r = drawSwatch(job) ?? r; }
          emit(key, r);
          void idbPut(key, r);
        } else SWATCH_STATS.failed++;
      } catch (e) {
        SWATCH_STATS.failed++;
        if (import.meta.env.DEV) console.warn('[色板] 画不出来：', key, e);
      }
    }
  } finally {
    busy = false;
  }
  if (queue.size) schedule(16);
}

/* ---------------- 背景（不带 UI 的一帧） ---------------- */

let bg: { key: string; canvas: HTMLCanvasElement; cssW: number; cssH: number } | null = null;

/** 背景的缓存键：画面 / 场景相关的键 + 画框尺寸（调用方给，一般是画面值的哈希） */
let bgWant = '';
export function setBackgroundKey(k: string) { bgWant = k; }

function background(cssW: number, cssH: number, pxW: number): HTMLCanvasElement | null {
  const key = `${bgWant}|${cssW}x${cssH}|${pxW}`;
  if (bg && bg.key === key) return bg.canvas;
  const eng = getEngine();
  if (!eng) return null;
  const t0 = performance.now();
  const s = eng.sampleScene(pxW);
  if (!s) return null;
  const cv = document.createElement('canvas');
  cv.width = s.w;
  cv.height = s.h;
  cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(s.data), s.w, s.h), 0, 0);
  SWATCH_STATS.bgMs = performance.now() - t0;
  bg = { key, canvas: cv, cssW, cssH };
  return cv;
}
/** 背景作废（换了场景 / 画面后由调用方触发；键变了也会自动重取） */
export function dropBackground() { bg = null; }

/* ---------------- 离屏 HUD ---------------- */

let off: HudSystem | null = null;

/** HudSystem.update 会改写的模块全局：画之前记下，画完放回（主画框下一帧看到的和没画过一样） */
function saveGlobals() {
  const log = { on: DRAW_LOG.on, texts: DRAW_LOG.texts, boxes: DRAW_LOG.boxes, targets: DRAW_LOG.targets, fx: DRAW_LOG.fx, inFx: DRAW_LOG.inFx };
  const eng = getEngine();
  const S = paintScale();
  const C = eng ? S / Math.max(1e-6, eng.hud.unitK) : S;
  return {
    pack: pack(), sim: simNow(), world: worldNow(), flow: flowNow(), log, pseudo: PSEUDO.pct, textK: TEXT_K.k, orn: { where: ORN.where, frame: ORN.frame }, font: FONT_EPOCH.v, S, C,
    bake: { frame: BAKE.frame, made: BAKE.made, budget: BAKE.budget }, demo: FLOW_PLAY.demo,
    // E 的审查修复加的模块全局（整合修复 X#18）：下限豁免、一屏的图标画风与「符号 → 物品图标」对照、占位剪影的着色
    floor: { ...FLOOR }, icon: { v: ICON_STYLE.v, on: ICON_STYLE.on, item: ICON_CTX.item, pack: ICON_CTX.pack }, ph: { tint: PLACEHOLDER.tint, qa: PLACEHOLDER.qa },
    // 画面亮度网格（E 的 sceneLum.ts：网格、版本、签名、节流、是否排着采样；收尾 6 接上 IE 给的快照接口，替掉原来事后按主画框签名再请求一次的做法）
    lum: sceneLumSnapshot(),
  };
}
function restoreGlobals(g: ReturnType<typeof saveGlobals>) {
  setPack(g.pack); setSim(g.sim); setWorld(g.world); setFlow(g.flow);
  BAKE.frame = g.bake.frame; BAKE.made = g.bake.made; BAKE.budget = g.bake.budget;
  FLOW_PLAY.demo = g.demo;
  Object.assign(DRAW_LOG, g.log);
  PSEUDO.pct = g.pseudo; TEXT_K.k = g.textK;
  ORN.where = g.orn.where; ORN.frame = g.orn.frame;
  FONT_EPOCH.v = g.font;
  setPaintScale(g.S, g.C);
  Object.assign(FLOOR, g.floor);
  ICON_STYLE.v = g.icon.v; ICON_STYLE.on = g.icon.on; ICON_CTX.item = g.icon.item; ICON_CTX.pack = g.icon.pack;
  PLACEHOLDER.tint = g.ph.tint; PLACEHOLDER.qa = g.ph.qa;
  restoreSceneLum(g.lum);
}
/** 放回去的全局与画之前的是不是同一份（开发时核对，SWATCH_STATS.globalsMismatch） */
function sameGlobals(a: ReturnType<typeof saveGlobals>, b: ReturnType<typeof saveGlobals>): boolean {
  return a.pack === b.pack && a.sim === b.sim && a.world === b.world && a.flow === b.flow && a.log.texts === b.log.texts && a.orn.frame === b.orn.frame
    && a.icon.pack === b.icon.pack && a.icon.v === b.icon.v && a.icon.item === b.icon.item && a.ph.tint === b.ph.tint
    && (Object.keys(a.floor) as (keyof typeof FLOOR)[]).every((k) => a.floor[k] === b.floor[k])
    && a.lum.wantSig === b.lum.wantSig && a.lum.grid === b.lum.grid && a.lum.version === b.lum.version && a.lum.pending === b.lum.pending;
}

/* ---------------- 取景（整合修复 U#5） ---------------- */

/** 取景键 → 取景框（一整行色板共用）；最近 64 个 */
const CROPS = new Map<string, Box>();
const CROPS_MAX = 64;
/** 量差别时把离屏 HUD 缩到 1/4（152×64 的窗口 = 38×16 格） */
const DS = 4;

/** 离屏 HUD 画布缩小后的预乘像素（只看 UI 这一层：几个对照皮肤的背景是同一张） */
function shrink(hud: HTMLCanvasElement, w: number, h: number): Float32Array {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(hud, 0, 0, hud.width, hud.height, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h * 4);
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; out[i] = (d[i] / 255) * a; out[i + 1] = (d[i + 1] / 255) * a; out[i + 2] = (d[i + 2] / 255) * a; out[i + 3] = a; }
  return out;
}

/** 几张对照图两两的平均差别（每格 0–1）做成积分图：任意窗口（CSS 像素）的平均差别 O(1) 取 */
function diffTable(maps: Float32Array[], w: number, h: number): (b: Box) => number {
  const cell = new Float32Array(w * h);
  let pairs = 0;
  for (let i = 0; i < maps.length; i++) for (let j = i + 1; j < maps.length; j++) {
    pairs++;
    const A = maps[i], B = maps[j];
    for (let p = 0, q = 0; p < cell.length; p++, q += 4) cell[p] += (Math.abs(A[q] - B[q]) + Math.abs(A[q + 1] - B[q + 1]) + Math.abs(A[q + 2] - B[q + 2]) + Math.abs(A[q + 3] - B[q + 3])) / 4;
  }
  const W = w + 1;
  const sat = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += cell[y * w + x] / Math.max(1, pairs); sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row; }
  }
  return (b: Box) => {
    const x0 = Math.max(0, Math.floor(b.x / DS)), y0 = Math.max(0, Math.floor(b.y / DS));
    const x1 = Math.min(w, Math.ceil((b.x + b.w) / DS)), y1 = Math.min(h, Math.ceil((b.y + b.h) / DS));
    if (x1 <= x0 || y1 <= y0) return 0;
    return (sat[y1 * W + x1] - sat[y1 * W + x0] - sat[y0 * W + x1] + sat[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
  };
}

/**
 * 这一行色板的取景框：几个对照皮肤各画一遍，在候选框（cropCandidates：面板优先，放宽到所有带面板的元素）里挑「各皮肤画出来差别最大」的一块。
 * 全都差不多（没有 UI、UI 不随皮肤变）时 null，调用方按自己的绘制记录取（cropBox）。调用方已经存好全局、画完会放回
 */
function pickCrop(job: SwatchJob, cssW: number, cssH: number, pxW: number, pxH: number, lb: number, world: WorldArg): Box | null {
  const pv = job.probes?.() ?? [];
  if (pv.length < 2 || !off) return null;
  const t0 = performance.now();
  const w = Math.max(1, Math.round(cssW / DS)), h = Math.max(1, Math.round(cssH / DS));
  const maps: Float32Array[] = [];
  let cands: ReturnType<typeof cropCandidates> | null = null;
  for (const v of pv) {
    FLOW_PLAY.demo = null;
    const fr = off.update(v, cssW, cssH, pxW, pxH, lb, 1, [], null, world);
    if (!fr) continue;
    cands ??= cropCandidates(cssW, cssH, off.hits, off.drawLog.texts, off.drawLog.boxes, true);
    maps.push(shrink(off.texture.image as HTMLCanvasElement, w, h));
  }
  SWATCH_STATS.cropMs = performance.now() - t0;
  if (!cands?.length || maps.length < 2) return null;
  return pickByDiff(cands, diffTable(maps, w, h));
}
type WorldArg = Parameters<HudSystem['update']>[9];

/** 毛玻璃：遮罩里白的地方换成模糊过的背景（与 OUTPUT pass 一致） */
function frostedBg(bgc: HTMLCanvasElement, mask: HTMLCanvasElement, blurPx: number, sx: number, sy: number, sw: number, sh: number, ow: number, oh: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = ow; out.height = oh;
  const g = out.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bgc, sx, sy, sw, sh, 0, 0, ow, oh);
  const blurred = document.createElement('canvas');
  blurred.width = ow; blurred.height = oh;
  const b = blurred.getContext('2d', { willReadFrequently: true })!;
  b.filter = `blur(${Math.max(1, blurPx * (ow / sw)).toFixed(1)}px)`;
  // 模糊要用到取景框外面一圈的像素：多取一点再画
  const m = blurPx * 2;
  b.drawImage(bgc, sx - m, sy - m, sw + m * 2, sh + m * 2, -m * (ow / sw), -m * (oh / sh), ow + m * 2 * (ow / sw), oh + m * 2 * (oh / sh));
  b.filter = 'none';
  // 遮罩是半分辨率：取对应的一块放大到输出尺寸，按红通道当透明度
  const mk = document.createElement('canvas');
  mk.width = ow; mk.height = oh;
  const mg = mk.getContext('2d', { willReadFrequently: true })!;
  const mx = mask.width / bgc.width;
  mg.drawImage(mask, sx * mx, sy * mx, sw * mx, sh * mx, 0, 0, ow, oh);
  const md = mg.getImageData(0, 0, ow, oh).data;
  const bd = b.getImageData(0, 0, ow, oh);
  for (let i = 0; i < md.length; i += 4) bd.data[i + 3] = md[i];
  b.putImageData(bd, 0, 0);
  g.drawImage(blurred, 0, 0);
  return out;
}

/** 同步画一张色板（主线程上约十几毫秒） */
function drawSwatch(job: SwatchJob): SwatchResult | null {
  const eng = getEngine();
  if (!eng) return null;
  const host = eng.renderer.domElement;
  const cssW = host.parentElement?.clientWidth ?? 0, cssH = host.parentElement?.clientHeight ?? 0;
  const pxW = host.width, pxH = host.height;
  if (cssW < 40 || cssH < 40 || !pxW || !pxH) return null;
  const t0 = performance.now();
  const values = job.values();
  if (!values) return null;
  const bgc = background(cssW, cssH, pxW);
  if (!bgc) return null;
  off ??= new HudSystem();
  const saved = saveGlobals();
  let frame: ReturnType<HudSystem['update']> = null;
  // 黑边与引擎同一个口径（Engine 每帧传给 HUD 的 camera.letterbox）：配方写了 2.39 时色板的内容区、单位缩放与画框一致
  const lb0 = str(values, 'camera.letterbox') === 'none' ? 0 : Number(str(values, 'camera.letterbox'));
  const lb = Number.isFinite(lb0) ? lb0 : 0;
  let box: Box | null = job.cropKey ? CROPS.get(job.cropKey) ?? null : null;
  const newCrop = !!job.cropKey && !box;
  // 离屏合成时 HUD 会按色板参数的画面签名 requestSceneLum：静音（不改主画面的签名、不排采样），画完连同快照一起放回
  SCENE_LUM.muted++;
  try {
    // 这一行第一次画：先按几个对照皮肤挑取景框（之后同一行的色板都用它）
    if (newCrop) { box = pickCrop(job, cssW, cssH, pxW, pxH, lb, eng.world); SWATCH_STATS.crops++; if (!box) SWATCH_STATS.cropFallback++; }
    // 流程演示在播时 HudSystem 会把演示的那一屏盖上去：色板画的是不播流程时的样子
    FLOW_PLAY.demo = null;
    // 静帧：时钟停在 1 秒、没有事件（入场动画已经播完，也还没到闲置淡出）
    frame = off.update(values, cssW, cssH, pxW, pxH, lb, 1, [], null, eng.world);
  } finally {
    SCENE_LUM.muted--;
    restoreGlobals(saved);
  }
  // 开发时核对：放回去的全局与画之前是同一份（验证「离屏不影响主画框」）
  if (import.meta.env.DEV && !sameGlobals(saveGlobals(), saved)) SWATCH_STATS.globalsMismatch++;
  const dpr = pxW / cssW;
  const hud = off.texture.image as HTMLCanvasElement;
  box ??= cropBox(cssW, cssH, off.hits, off.drawLog.texts, off.drawLog.boxes);
  if (job.cropKey && newCrop) { CROPS.set(job.cropKey, box); if (CROPS.size > CROPS_MAX) CROPS.delete(CROPS.keys().next().value!); }
  const ow = Math.round(SWATCH_W * dpr), oh = Math.round(SWATCH_H * dpr);
  const sx = box.x * dpr, sy = box.y * dpr, sw = box.w * dpr, sh = box.h * dpr;
  const out = document.createElement('canvas');
  out.width = ow; out.height = oh;
  const g = out.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  const blurPx = frame?.blurPx ?? 0;
  if (blurPx > 0) g.drawImage(frostedBg(bgc, off.maskTexture.image as HTMLCanvasElement, blurPx, sx, sy, sw, sh, ow, oh), 0, 0);
  else g.drawImage(bgc, sx, sy, sw, sh, 0, 0, ow, oh);
  if (frame) g.drawImage(hud, sx, sy, sw, sh, 0, 0, ow, oh);
  // 整帧缩略（悬停放大）
  const fw = Math.round(PREVIEW_W * Math.min(2, dpr)), fh = Math.round((fw * cssH) / cssW);
  const full = document.createElement('canvas');
  full.width = fw; full.height = fh;
  const fg = full.getContext('2d')!;
  fg.imageSmoothingQuality = 'high';
  fg.drawImage(bgc, 0, 0, bgc.width, bgc.height, 0, 0, fw, fh);
  if (frame) fg.drawImage(hud, 0, 0, hud.width, hud.height, 0, 0, fw, fh);
  // 取景框画一圈（放大图上看得出色板取的是哪一块）
  fg.strokeStyle = 'rgba(255,255,255,0.85)';
  fg.lineWidth = Math.max(1, fw / 384);
  fg.strokeRect((box.x / cssW) * fw, (box.y / cssH) * fh, (box.w / cssW) * fw, (box.h / cssH) * fh);
  const ms = performance.now() - t0;
  SWATCH_STATS.drawn++;
  SWATCH_STATS.lastMs = ms;
  SWATCH_STATS.totalMs += ms;
  return { crop: out.toDataURL('image/webp', 0.9), full: full.toDataURL('image/webp', 0.82), ms };
}

/* ---------------- 键 ---------------- */

/** 字符串哈希（FNV-1a，32 位，十六进制） */
export function hashStr(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
/** 参数表的哈希（键排序；视图键不算——诊断、检查工具不影响色板） */
export function hashValues(v: Values, keep?: (k: string) => boolean): string {
  const keys = Object.keys(v).filter((k) => !isViewKey(k) && (!keep || keep(k))).sort();
  return hashStr(keys.map((k) => `${k}=${JSON.stringify(v[k])}`).join('|'));
}
