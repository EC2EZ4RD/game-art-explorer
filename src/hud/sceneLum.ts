import { sceneSource as getEngine } from '../engine/sceneSource';

/*
 * 画面亮度网格（§8 RC3 ②「场景亮度高于 0.25 时……用 sampleScene」，轨道 E 审查修复 ①）：
 * HUD 自己拿不到画面像素，这里在 HUD 重画以后（异步、节流）请引擎渲一帧不带 UI 的画面（Engine.sampleScene，可读性检查用的同一个口子），
 * 缩成 192 宽的相对亮度网格（同一画面多次采样取每格最暗 / 最亮）；边缘衬底按每段字底下的实际亮度决定垫不垫、垫深还是垫浅。
 * 网格变了（平均差 > 0.02）时 version 加一，经 uiAssetsVersion() 让 HudSystem 重画一次。
 * 没有引擎（导出、单元测试、离屏的规格页 / 色板）或画布大小对不上时 lumIn 返回 null，调用方退回按色板估的 sceneBright。
 * 依赖：引擎在构造时登记采样函数（registerSceneSampler）、当前引擎经 engine/sceneSource 拿（只为画布尺寸），不经 src/ui。
 */

type Sampler = (w: number) => { data: Uint8ClampedArray; w: number; h: number } | null;
let sampler: Sampler | null = null;
/** 引擎登记自己的采样函数（Engine 构造时登记、dispose 时清掉自己的） */
export function registerSceneSampler(fn: Sampler | null) { sampler = fn; }

/** lum = 这一次的亮度；lo / hi = 同一个画面最近几次采样里每格的最暗 / 最亮（画面在动——云、水、镜头微动——时衬底按最差的情况垫，不随采样时刻忽有忽无） */
export interface Grid { lum: Float32Array; lo: Float32Array; hi: Float32Array; w: number; h: number; pxW: number; pxH: number; sig: string }
let grid: Grid | null = null;
let version = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let last = 0;
/** 最近一次请求采样时的画面签名（场景 / 画风 / 镜头参数）：网格只给签名相同的画面用，换了场景还没采到新网格时退回按色板估 */
let wantSig = '';
const UI_KEY = /^(uip|hud|cnt|lay|vis|col|typ|ast|el|elx|cmp|ix|mo|rel|ctx|a11y|chk|ops|flow|st|hier)\./;
const SIGS = new WeakMap<object, string>();
/** 画面签名：参数里不是 UI 的那些键（场景、种子、配方的画面参数、镜头……）；按参数对象缓存 */
export function sceneSig(art: Record<string, unknown>): string {
  const hit = SIGS.get(art);
  if (hit !== undefined) return hit;
  const sig = Object.keys(art).filter((k) => !UI_KEY.test(k)).sort().map((k) => `${k}=${JSON.stringify(art[k])}`).join('&');
  SIGS.set(art, sig);
  return sig;
}
/** 网格变化的版本（uiAssetsVersion 加上它） */
export const sceneLumVersion = () => version;

const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

function sampleNow() {
  timer = null;
  last = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // 采样函数由引擎构造时登记（registerSceneSampler，F 的 X#17）；画布尺寸照旧从当前引擎取（收尾 7：去掉原来经 getEngine 再包一层的双保险）
  const eng = getEngine();
  if (!sampler || !eng) return;
  const c = eng.renderer.domElement;
  let s: ReturnType<Sampler> = null;
  // 192 宽：与可读性检查（analyzeReadability 的画面采样）同一个分辨率，衬底的判断和检查口径一致
  try { s = sampler(192); } catch { s = null; }
  if (!s) return;
  const lum = new Float32Array(s.w * s.h);
  for (let i = 0; i < lum.length; i++) lum[i] = 0.2126 * lin(s.data[i * 4]) + 0.7152 * lin(s.data[i * 4 + 1]) + 0.0722 * lin(s.data[i * 4 + 2]);
  const prev = grid;
  const same = !!prev && prev.w === s.w && prev.h === s.h && prev.pxW === c.width && prev.pxH === c.height;
  const keep = same && prev!.sig === wantSig;
  const lo = keep ? Float32Array.from(lum, (v, i) => Math.min(v, prev!.lo[i])) : lum.slice(), hi = keep ? Float32Array.from(lum, (v, i) => Math.max(v, prev!.hi[i])) : lum.slice();
  grid = { lum, lo, hi, w: s.w, h: s.h, pxW: c.width, pxH: c.height, sig: wantSig };
  let diff = 1;
  if (same) { diff = 0; for (let i = 0; i < lum.length; i++) diff += Math.abs(lo[i] - prev!.lo[i]) + Math.abs(hi[i] - prev!.hi[i]); diff /= lum.length * 2; }
  // 亮度变了，或者这是新画面的第一张网格（换画面时 HUD 先按色板估着画过一次，要按网格再画一次）
  if (diff > 0.02 || !prev || prev.sig !== grid.sig) version++;
}

/**
 * HUD 合成之后调（sig = 这一帧画面的签名）：画面换了（签名变了）时 120ms 后采；同一个画面至多每 1.2 秒采一次（镜头转动、动画中的 HUD 每秒重画 30 次，不能每次都多渲两帧）
 */
export function requestSceneLum(sig = '') {
  if (typeof window === 'undefined' || SCENE_LUM.muted > 0) return;
  const changed = sig !== wantSig;
  wantSig = sig;
  if (timer && !changed) return;
  if (timer) clearTimeout(timer);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  timer = setTimeout(sampleNow, changed ? 120 : Math.max(150, 1200 - (now - last)));
}
/**
 * 离屏渲染（D 的皮肤色板、规格页）用的开关与快照（整合修复，ID 的请求）：离屏的 HudSystem 合成完也会调 requestSceneLum(自己的签名)，
 * 会把主画面的签名换掉、排一次采样。muted > 0 时 requestSceneLum 什么都不做（可以嵌套：进 +1、出 −1）；
 * sceneLumSnapshot() / restoreSceneLum(s) 存取全部状态（网格、版本、签名、节流时刻、是否排着采样），离屏画完原样放回，globalsMismatch 也能拿签名比对
 */
export const SCENE_LUM = { muted: 0 };
export interface SceneLumState { grid: Grid | null; version: number; wantSig: string; last: number; pending: boolean }
export function sceneLumSnapshot(): SceneLumState { return { grid, version, wantSig, last, pending: !!timer }; }
export function restoreSceneLum(s: SceneLumState) {
  grid = s.grid; version = s.version; wantSig = s.wantSig; last = s.last;
  if (!s.pending && timer) { clearTimeout(timer); timer = null; }
  else if (s.pending && !timer && typeof window !== 'undefined') timer = setTimeout(sampleNow, 120);
}
/** 签名（比对用）：主画面当前请求采样的画面签名 */
export const sceneLumSig = () => wantSig;

/** 立刻采一次（QA 截图前用：不等节流，网格马上对上当前画面） */
export function sampleSceneLumNow() { if (timer) { clearTimeout(timer); timer = null; } sampleNow(); }

/**
 * 一块区域（画布像素 x / y / w / h，画布 cw × ch）底下画面的平均 / 最亮 / 最暗相对亮度；没有网格或画布对不上（离屏 HUD、比例不同）时 null
 */
export function lumIn(x: number, y: number, w: number, h: number, cw: number, ch: number, sig?: string): { mean: number; max: number; min: number } | null {
  const G = grid;
  if (!G || !cw || !ch || Math.abs(cw / ch - G.pxW / G.pxH) > 0.01) return null;
  // 换了画面、还没采到新网格：不借上一个画面的亮度
  if (sig !== undefined && G.sig !== sig) return null;
  // 按比例换算（HUD 画布与渲染画布可以不一样大：UI 像素化的低分辨率层、只量不画的那几遍）；外接到整格（与检查的 floor / ceil 同口径）
  const x0 = Math.max(0, Math.floor((x / cw) * G.w)), x1 = Math.min(G.w - 1, Math.ceil(((x + w) / cw) * G.w));
  const y0 = Math.max(0, Math.floor((y / ch) * G.h)), y1 = Math.min(G.h - 1, Math.ceil(((y + h) / ch) * G.h));
  if (x1 < x0 || y1 < y0) return null;
  let s = 0, n = 0, mx = 0, mn = 1;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const k = j * G.w + i; s += G.lum[k]; n++; if (G.hi[k] > mx) mx = G.hi[k]; if (G.lo[k] < mn) mn = G.lo[k]; }
  return n ? { mean: s / n, max: mx, min: mn } : null;
}
