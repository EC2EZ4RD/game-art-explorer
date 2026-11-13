import * as THREE from 'three';
import { str } from '../dims/registry';
import type { Values } from '../dims/types';
import { type DrawCtx } from './compose/sample';
import { wantsElements, type Hit } from './compose/hud';
import { autoLayoutElements, composeLayers, hudLayoutElements } from './compose/layers';
import { elementParts } from './elements/core';
import { drawSimOverlays } from './compose/simfx';
import { setSim, simPin, simulate, type SimEvent } from './sim';
import { FLOW_PLAY, FLOWS, flowEvents, flowValues, hudValues, setFlow, type FlowNow } from './flow';
import { SELECTORS } from './sys/register';
import { drawOps } from './compose/screen';
import { scaleWorld, setWorld, type WorldView } from './world';
import type { Theme as ThemeT } from './sys/theme';
import { hudFontsVersion, loadHudFonts } from './fonts';
import { bakeFrame, DRAW_LOG, drawText, FONT_EPOCH, ORN, PAINT_LAYERS, PSEUDO, QUALITY, resetState, TEXT_K, setPaintScale, type LoggedBox, type LoggedFx, type LoggedTarget, type LoggedText, type Rect } from './paint';
import { resolveUi, type Resolved } from './sys/resolve';
import { buildTheme, type Theme } from './sys/theme';
import { scenePaletteOf } from './sys/scenePalette';
import { contentRect, deviceAspect, unitKOf } from './sys/device';
import { uiAssetsVersion } from './uiAssets';
import { layerExtent, PIXEL_ROLES, pixelPlan, PIXROLE, roleCtx, ROLES } from './pixelRoles';
import { afterSkin } from './sys/theme';
import { packFor, setPack } from './content';

/*
 * 游戏 UI 样本的画布绘制（docs/ui-hud-plan.md M1 → M3a）。
 * HUD 画在一张与 WebGL 画布同分辨率的 Canvas2D 上，作为纹理在后处理的 OUTPUT pass 里合成：
 *   - 截图、A|B、扫描、收藏、QA 网格都读 WebGL 画布，所以自动带上 HUD；
 *   - 像素化（camera.pixelSize）只降低场景的内部分辨率，HUD 仍按画布分辨率绘制，保持清晰；UI 自己的像素化（vis.pixelScale）另算；
 *   - 画幅黑边：HUD 排在黑边以内；诊断视图可以选择是否包含 HUD；CRT 弯曲同样作用于 HUD；
 *   - 毛玻璃：另画一张半分辨率遮罩，OUTPUT 在遮罩处换成模糊过的画面。
 * 每次重画：Values → 分层解析（sys/resolve）→ 皮肤 token（sys/theme）→ 构图（compose/*）。
 * 坐标一律用设计单位排版（960 × 540 的设计画布 = 1080p 的一半，M12a-05），绘制时整张画布按"画布像素 / CSS 像素 × unitK"缩放：
 *   unitK = 画幅以内的画面相对设计画布的大小（sys/device.ts 的 unitKOf，与 Godot 的 canvas_items 拉伸一致）；
 *   命中框、叙事内板子的尺寸、可读性检查的记录再换回 CSS 像素；世界挂点的投影换成设计单位；「UI 1:1」开关（pixel1to1）让 unitK = 1。
 */

export interface HudFrame {
  texture: THREE.Texture;
  mask: THREE.Texture;
  /** 背景模糊半径（画布像素）；0 = 不需要模糊 */
  blurPx: number;
  /** 元 UI 对画面本身的处理（M6）：去饱和（低血量）、夜视 */
  meta?: { desat: number; night: number };
}

export { scenePaletteOf };

/**
 * 部件命中框（轨道 E 的第二阶段，docs/workbench-redesign.md §6「覆盖范围」：模板 / 菜单 / 示例屏的面板、标题、页签、列表行、按钮）。
 * 约定（轨道 B2 与 E）：构图返回的命中框里带 kind = 'part' 的是部件；element = 部件 id（如 'panel' / 'tab' / 'listRow#3'），
 * part = 部件种类（COMPONENTS 里的名字），target = 要写的覆盖目标（如 'tpl.inventory'，cmp.*@tpl.<id>），label = 画框上名签的中文名。
 * 不是按元素排版的界面（模板 / 菜单）返回的命中框一律当部件。v1 部件只能选中、不能拖动（编辑层 src/ui/stage/EditOverlay.tsx）。
 */
export type PartHit = Hit & { kind: 'part'; part?: string; target?: string; label?: string };
export const isPartHit = (h: Hit): h is PartHit => (h as { kind?: unknown }).kind === 'part';
/**
 * UI A/B 时跨在分界上的命中框（B2 审查修复 ⑥）：rect 裁到当前（B）一侧露出来的那段（接管指针只接这一段），
 * full = 裁之前的整框（编辑层拖动、缩放按整框算，选中框也画整框）。没裁的框没有 full
 */
export type ClippedRect = { full?: Rect };
export const fullRectOf = (h: Hit): Rect => (h as ClippedRect).full ?? h.rect;
const scaleRect = (r: Rect, k: number): Rect => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });
const scaleHit = <T extends Hit>(h: T, k: number): T => {
  const full = (h as ClippedRect).full;
  return { ...h, rect: scaleRect(h.rect, k), ...(full ? { full: scaleRect(full, k) } : {}) };
};

export class HudSystem {
  private canvas = document.createElement('canvas');
  private maskCanvas = document.createElement('canvas');
  /** UI 像素化时先画在这张小画布上，再整数倍放大 */
  private lowCanvas = document.createElement('canvas');
  /** UI 像素化时的文字层（全分辨率，叠在放大后的盒子上面） */
  private textCanvas = document.createElement('canvas');
  /** 按角色像素化（M12b-56）多出来的两层：清晰的盒子层、低分辨率的文字层 */
  private boxHiCanvas = document.createElement('canvas');
  private textLowCanvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private mctx = this.maskCanvas.getContext('2d')!;
  readonly texture = new THREE.CanvasTexture(this.canvas);
  readonly maskTexture = new THREE.CanvasTexture(this.maskCanvas);
  private key = '';
  private lastValues: Values | null = null;
  private lastAb: Values | null = null;
  private lastDiegeticValues: Values | null = null;
  private frame: HudFrame | null = null;
  /** 最近一次重画的 CPU 耗时（毫秒，不含纹理上传）；统计栏显示 */
  lastDrawMs = 0;
  /** 最近一次的解析结果与主题（面板显示来源、可读性检查用） */
  resolved: Resolved | null = null;
  theme: Theme | null = null;
  /** 按元素排版时每个元素的外接矩形（CSS 像素，画框上的编辑层 / 画面模式悬停提示用）；UI A/B 时只有当前（B）一侧、露在分界右边的 */
  hits: Hit[] = [];
  /** 模板 / 菜单屏的部件命中框（CSS 像素，见 PartHit）；E 的第二阶段之前一直是空的 */
  parts: PartHit[] = [];
  /** 「UI 1:1」（编辑器开关，不进配方，M12a-05）：开时 HUD 不随画面缩放（unitK = 1，设计单位 = CSS 像素），方便对齐像素皮肤 */
  pixel1to1 = false;
  /** 最近一次重画的画布缩放（设计单位 → CSS 像素） */
  unitK = 1;
  /** 参数面板选中的元素：画一个虚线框 */
  private highlightId: string | null = null;
  setHighlight(id: string | null) { if (id !== this.highlightId) { this.highlightId = id; this.key = ''; } }
  /** 下一帧一定重画（离屏实例画过东西、改写了模块全局之后：开发者面板的皮肤规格页） */
  invalidate() { this.key = ''; }
  /** 最近一次绘制的文字与盒子（可读性检查用，画布像素） */
  /** 设备画幅换算出的黑边比例（0 = 无），引擎同步给后处理 OUTPUT */
  deviceLetterbox = 0;
  drawLog: { texts: LoggedText[]; boxes: LoggedBox[]; targets: LoggedTarget[]; fx: LoggedFx[]; area?: Rect; unitK?: number } = { texts: [], boxes: [], targets: [], fx: [] };
  /** 特效遮挡检查（chk.fxOcclusion）：特效一闪而过，记住最近 4 秒出现过的特效区域，动画停下后的检查也看得到 */
  private fxRecent: (LoggedFx & { until: number })[] = [];
  /** 每次重画 + 1：可读性检查据此知道要不要重算 */
  drawSerial = 0;
  /** 叙事内的元素（M6）：引擎挂成世界里的板子 */
  diegetic: import('./compose/hud').DiegeticItem[] = [];
  /** 叙事内板子的内容版本：只在参数或动画变化时 + 1（相机移动引起的重画不算），引擎据此决定要不要重建板子 */
  diegeticVersion = 0;
  private diegeticKey = '';
  /** 局内 HUD 现在是按元素排版的吗（不是四控件样本 / 菜单） */
  usesElements = false;
  /**
   * UI A/B 的分界：占视口宽度（CSS 像素）的比例；0 = 整屏画 B（当前）、1 = 整屏画 A、0.5 = 对半。
   * 两侧都画整套 HUD 再按分界裁切，贴边的元素只在一侧看得见——拖到 0 / 1 就能完整看某一侧（Viewport 从 store.hudABSplit 同步）。
   */
  abSplit = 0.5;
  /** 流程演示时 A 侧也盖上当前这一屏（同一段内复用同一个对象，resolveUi 的缓存能命中） */
  private abFlow: { src: Values | null; key: string; out: Values | null } = { src: null, key: '', out: null };

  constructor() {
    for (const t of [this.texture, this.maskTexture]) {
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }
    // Canvas2D 的像素本来就是预乘的：按预乘上传，OUTPUT 里用 c·(1−a) + hud 合成，边缘不发黑
    this.texture.premultiplyAlpha = true;
    // 自托管字体（M2）：每加载完一个就让下一帧重画
    loadHudFonts();
  }

  /**
   * 每帧调用（只有内容变了才重画）。返回 null 表示不显示 HUD。
   * @param cssW/cssH 视口的 CSS 尺寸；pxW/pxH 画布像素尺寸；letterbox 画幅比例（0 = 无黑边）
   */
  update(v: Values, cssW: number, cssH: number, pxW: number, pxH: number, letterbox: number, clock = 0, events: SimEvent[] = [], ab: Values | null = null, world: WorldView | null = null): HudFrame | null {
    const style = str(v, 'hud.style');
    if (style === 'none' || !style || cssW < 2 || cssH < 2) {
      // 不显示：清掉上一屏的命中框 / 部件框 / 绘制记录，绘制序号 + 1（编辑层、悬停提示、可读性检查按序号换新，不然会留着看不见的盒子）
      // 叙事内的板子一起撤掉（画面模式藏 HUD 时世界里不留板子；再显示时重建）
      if (this.frame || this.hits.length || this.parts.length || this.drawLog.texts.length || this.diegetic.length) {
        this.hits = []; this.parts = []; this.usesElements = false;
        if (this.diegetic.length) { this.diegetic = []; this.diegeticVersion++; }
        this.diegeticKey = '';
        this.drawLog = { texts: [], boxes: [], targets: [], fx: [] };
        this.drawSerial++;
      }
      return (this.frame = null);
    }
    // 流程演示（M9b）：当前这一屏的模板与阶段盖在参数上，这一段流程的事件并进事件列表
    const v0 = v;
    const fdemo = FLOW_PLAY.demo;
    const hv = hudValues(v, clock, SELECTORS.screen);
    const fn: FlowNow | null = hv.fn;
    if (fn && fdemo) { v = hv.v; events = [...events, ...flowEvents(fdemo)]; }
    setFlow(fn);
    const r = resolveUi(v);
    // 静帧姿态（chk.simPose / chk.simTime，M12c-14）：钉住时钟、事件换成姿态（或 chk.demo 演示）的事件——同一组参数两次截图逐字节相同，
    // 动画键不再随引擎时钟走（钉住时不重画）；A/B 两侧用同一个钉住的时刻
    const pin = simPin(r);
    if (pin) { clock = pin.t; events = pin.events; }
    // 设备画幅（M10）：没开画面黑边时按 ctx.aspect / ctx.orientation 加黑边（竖屏手机 = 两侧黑边），引擎同步给 OUTPUT。
    // 画布本身已经是设备比例（工作台的画框按设备比例取尺寸，§3.3）时 deviceAspect 返回 0：不再加一圈取整误差的黑边（轨道 B2）
    const devLb = letterbox > 0 ? 0 : deviceAspect(r, cssW / cssH);
    if (devLb) letterbox = devLb;
    this.deviceLetterbox = devLb;
    // 模拟（M5b）：有东西在动时按 30Hz 重画；事件列表变了也重画一次（动画结束后的终态）
    const sim = simulate(clock, events, r);
    const animKey = sim.active || fn ? Math.floor(clock * 30) : -1;
    // 世界挂点（M6）：画面用到世界点时，挂点随相机移动要重画（按 0.5px 取整）——按元素排版、挂点卡片（anchoredCard）、世界地图、
    // 弹出模板垫底 / 保留的局内 HUD（显式布局，或布局跟随品类时的 autoLayoutElements——E 的请求，B2 审查修复时加上）、
    // 模板里挂在世界点上的元素（审查修复 A · L10：原来只看 wantsElements，背包 / 角色页的挂点卡片在相机移动时不动）
    const usesWorld = (rr: Resolved) => wantsElements({ r: rr } as ThemeT) || rr.str('lay.container', 'modal') === 'anchoredCard' || rr.str('cnt.dataShape', 'none') === 'spatial'
      || !!(hudLayoutElements({ r: rr } as ThemeT) ?? autoLayoutElements({ r: rr } as ThemeT)) || rr.elements().some((id) => elementParts(rr, id).some((p) => p.attach !== 'none'));
    const wsig = world && usesWorld(r) ? [world.player, world.poi, world.target].map((q) => (q ? `${Math.round(q.x * 2)},${Math.round(q.y * 2)},${q.on ? 1 : 0}` : '-')).join(';') + `|${world.map ? Math.round(world.map.player[0] * 200) + ',' + Math.round(world.map.player[1] * 200) : ''}` : '';
    const split = Math.min(1, Math.max(0, this.abSplit));
    // 品质下限开关（paint.ts 的 QUALITY.on，视图▾「品质下限」）也进重画键：切换后下一帧就重画（整合 X#11）
    const key = [cssW, cssH, pxW, pxH, letterbox, hudFontsVersion(), uiAssetsVersion(), animKey, events.length, events.at(-1)?.at ?? 0, wsig, ab ? split : '', this.pixel1to1 ? 1 : 0, QUALITY.on ? 1 : 0].join('|');
    if (key === this.key && v0 === this.lastValues && ab === this.lastAb && this.frame) return this.frame;
    this.key = key;
    this.lastValues = v0;
    this.lastAb = ab;
    const t0 = performance.now();

    // 画幅黑边以内的区域（与 OUTPUT 的黑边公式一致，CSS 像素；sys/device.ts 的 contentRect，舞台栏条的「预览 N%」用同一个函数）。
    // 对齐到整 CSS 像素（M12a-37）：起点向里取整、终点向里取整，内容不压到黑边那一行（原来 1.78 的画幅与画布取整差一像素，替换背景屏顶行漏出世界画面；
    // 替换背景本身铺满整张画布，见 M12a-24）
    const R: Rect = contentRect(cssW, cssH, letterbox);
    // px@1080p（M12a-05）：整张 HUD 画布按 unitK 缩放，构图拿到的是设计单位的画面矩形 RD；世界挂点的投影跟着换成设计单位
    const uk = unitKOf(r, R, this.pixel1to1);
    const RD: Rect = { x: R.x / uk, y: R.y / uk, w: R.w / uk, h: R.h / uk };
    this.unitK = uk;
    setWorld(world ? scaleWorld(world, 1 / uk) : null);
    const th = buildTheme(r, scenePaletteOf(v), style);
    th.unitK = uk;
    FONT_EPOCH.v = hudFontsVersion();
    this.resolved = r;
    this.theme = th;

    const sizeChanged = this.canvas.width !== pxW || this.canvas.height !== pxH;
    if (sizeChanged) {
      this.canvas.width = pxW;
      this.canvas.height = pxH;
      this.maskCanvas.width = Math.max(1, pxW >> 1);
      this.maskCanvas.height = Math.max(1, pxH >> 1);
      // 尺寸变了要重新分配 GPU 存储
      this.texture.dispose();
      this.maskTexture.dispose();
    }
    const s = pxW / cssW;
    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    resetState(m);
    m.fillStyle = '#000';
    m.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    m.setTransform((s / 2) * uk, 0, 0, (s / 2) * uk, 0, 0);

    // UI 像素化：盒子画在 1/n 分辨率的小画布上（CSS 像素 → 设计分辨率）再最近邻放大；文字画在全分辨率的文字层上，保持可读
    const px = th.pixel;
    let ctx = this.ctx;
    let tctx: CanvasRenderingContext2D | undefined;
    // 按角色像素化（M12b-56）：vis.pixelRoles / typ.rasterize 选过时盒子、文字各拆成低分辨率 / 清晰两层（pixelRoles.ts 的 roleCtx 代理），没选时走原来的两张画布
    const legacyOff = (k: string) => th.legacy && !afterSkin(r, k);
    const roles0 = legacyOff('vis.pixelRoles') ? [] : r.list('vis.pixelRoles').filter((x) => PIXEL_ROLES.includes(x));
    const plan = pixelPlan(roles0.length ? roles0 : null, legacyOff('typ.rasterize') ? 'off' : r.str('typ.rasterize', 'off'), px);
    const scale = plan ? s : px > 1 ? Math.max(1, Math.floor(s)) / px : s;
    let roleOut: (() => void) | null = null;
    // A / B 对照时当前这一侧的裁剪框（设计单位）：按层次冲洗（ROLES.flush）只合成、只清这一块
    let roleClip: Rect | null = null;
    PIXROLE.displayMin = Infinity; PIXROLE.box = ''; PIXROLE.text = ''; PIXROLE.lowPx = 0;
    PAINT_LAYERS.of = null; ROLES.flush = null;
    if (plan) {
      const fs = Math.max(1, Math.floor(s)), sb = fs / plan.boxK, stx = fs / plan.textK;
      const prep = (cv: HTMLCanvasElement, w: number, h: number, k: number, low: boolean) => {
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const c = cv.getContext('2d')!;
        c.setTransform(1, 0, 0, 1, 0, 0); resetState(c); c.clearRect(0, 0, w, h); c.setTransform(k * uk, 0, 0, k * uk, 0, 0);
        if (low) c.imageSmoothingEnabled = false;
        return c;
      };
      const bLo = plan.boxLow.size ? prep(this.lowCanvas, Math.ceil(cssW * sb), Math.ceil(cssH * sb), sb, true) : null, bHi = plan.boxLow.size < 3 ? prep(this.boxHiCanvas, pxW, pxH, s, false) : null;
      const tLo = plan.textLow.size ? prep(this.textLowCanvas, Math.ceil(cssW * stx), Math.ceil(cssH * stx), stx, true) : null, tHi = prep(this.textCanvas, pxW, pxH, s, false);
      ctx = bLo && bHi ? roleCtx([bLo, bHi], this.canvas, () => (plan.boxLow.has(PIXROLE.box || 'frame') ? bLo : bHi)) : (bLo ?? bHi)!;
      tctx = tLo ? roleCtx([tLo, tHi], this.canvas, () => (plan.textLow.has(PIXROLE.text || 'text') ? tLo : tHi)) : tHi;
      // 标题与大字：字号 ≥ 正文字号 × 1.3（设计单位，按 drawText 拿到的字号比）
      PIXROLE.displayMin = (th.tokens.textSize ?? 13) * th.scale * 1.3;
      // 可读下限（R4 回归修复 into-the-breach#43）：低分辨率字层的角色与每设计单位的层像素，drawText 按它把太小的字改画在清晰层（pixelRoles.ts 的 LEGIBLE_PX）
      PIXROLE.lowText = plan.textLow; PIXROLE.lowPx = plan.textLow.size ? stx * uk : 0;
      // 每层自己的绘制缩放（B10 审查修复 ① / ⑩）：阴影 / 发光 / 字的软投影按画到的那一层乘（原来全局 S = s × uk，低分辨率层上的影子放大回来大了 boxK / textK 倍）；
      // 代理画布的 canvas 是当前角色挑中的那一层，所以按画布认层
      const lowC = this.lowCanvas, textLowC = this.textLowCanvas, hiCs = [this.boxHiCanvas, this.textCanvas];
      PAINT_LAYERS.of = (c) => { const cv = c.canvas as unknown; return cv === lowC ? [sb * uk, sb] : cv === textLowC ? [stx * uk, stx] : hiCs.includes(cv as HTMLCanvasElement) ? [s * uk, s] : null; };
      // 合成顺序：含 frame 的那一层盒子在下、另一层盒子在上，再叠低分辨率文字、清晰文字（最近邻放大）
      const frameLow = plan.boxLow.has('frame');
      const order = [...(frameLow ? [[bLo, sb], [bHi, s]] : [[bHi, s], [bLo, sb]]), [tLo, stx], [tHi, s]] as [CanvasRenderingContext2D | null, number][];
      let outReady = false;
      const composite = (clip: Rect | null) => {
        const out = this.ctx;
        out.setTransform(1, 0, 0, 1, 0, 0);
        if (!outReady) { resetState(out); out.clearRect(0, 0, pxW, pxH); out.imageSmoothingEnabled = false; outReady = true; }
        out.save();
        if (clip) { const k = s * uk; out.beginPath(); out.rect(clip.x * k, clip.y * k, clip.w * k, clip.h * k); out.clip(); }
        for (const [c, k] of order) if (c) out.drawImage(c.canvas, 0, 0, c.canvas.width, c.canvas.height, 0, 0, c.canvas.width * (s / k), c.canvas.height * (s / k));
        out.restore();
      };
      // 按层次冲洗（B10 审查修复 ⑲，pixelRoles.ts 的 ROLES）：到这一刻为止的各层按层序合成进输出、清空（A / B 对照时只合成、只清当前这一侧——清空受各层当前的裁剪约束），
      // 之后画的弹窗 / 浮框整体压在上面
      ROLES.flush = () => {
        composite(roleClip);
        for (const [c] of order) if (c) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.restore(); }
      };
      roleOut = () => composite(null);
    } else if (px > 1) {
      this.lowCanvas.width = Math.ceil(cssW * scale);
      this.lowCanvas.height = Math.ceil(cssH * scale);
      ctx = this.lowCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      if (this.textCanvas.width !== pxW || this.textCanvas.height !== pxH) { this.textCanvas.width = pxW; this.textCanvas.height = pxH; }
      tctx = this.textCanvas.getContext('2d')!;
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      resetState(tctx);
      tctx.clearRect(0, 0, pxW, pxH);
      tctx.setTransform(s * uk, 0, 0, s * uk, 0, 0);
    }
    setPaintScale(scale * uk, scale);
    // 按角色像素化的几层在上面各自设好了变换；原来的路径照旧
    if (!plan) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resetState(ctx);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.setTransform(scale * uk, 0, 0, scale * uk, 0, 0);
    }

    // 整张画布（设计单位）：替换背景铺满它，钉住画幅时黑边以内的 RD 只用来排内容（M12a-24）
    const d: DrawCtx = { ctx, m, blur: 0, t: tctx, full: { x: 0, y: 0, w: cssW / uk, h: cssH / uk } };
    // 局内 HUD 样本，或菜单样本（选了非 HUD 的界面模板 / 场景容器时，M3.5）
    this.hits = [];
    this.parts = [];
    this.diegetic = [];
    this.usesElements = false;
    DRAW_LOG.on = true;
    DRAW_LOG.texts = [];
    DRAW_LOG.boxes = [];
    DRAW_LOG.targets = [];
    DRAW_LOG.fx = [];
    DRAW_LOG.inFx = 0;
    const ctxs = tctx ? [ctx, tctx] : [ctx];
    // 成品缓存每个真实帧只进一帧（终期审查修复 ㉒：A / B 对照两侧都在这一帧里画，各自调 bakeFrame 时帧号一帧涨 2，只在一侧出现的块永远「没稳住」、烘不上）
    bakeFrame(...layerExtent(ctx));
    /**
     * 合成一侧。own = 这是当前（B）一侧：只有它的命中框留给编辑层（UI A/B 时 A 侧的元素不能拖——拖了改的是当前参数）；
     * span = 这一侧露出来的横向范围（设计单位），整块落在分界另一边的命中框不要，跨在分界上的裁到这一侧（轨道 B2；
     * B2 审查修复 ⑥：原来跨分界的框整块留着，盖住 A 侧的画面，在 A 侧悬停 / 拖动拿到的是 B 的元素）
     */
    const compose = (tth: ThemeT, simState: ReturnType<typeof simulate>, own = true, span: [number, number] | null = null) => {
      setSim(simState);
      // 示例内容包（cnt.pack）：按这一侧的参数选（A/B 时两边可以是不同的游戏）
      setPack(packFor(tth.r));
      // 伪本地化（chk.overflow）：文字按比例加长，按各自一侧的参数（A/B 时两边可以不同）
      const ov = tth.r.str('chk.overflow', 'off');
      PSEUDO.pct = ov === 'plus30' ? 0.3 : ov === 'plus50' ? 0.5 : 0;
      TEXT_K.k = tth.textK;
      // 震屏：整张 UI 平移（mo.juice 决定幅度）
      const [sx, sy] = simState.shake;
      for (const c of ctxs) { c.save(); c.translate(sx, sy); }
      // 流程转场（M9b，mo.transition）：换屏后的前 0.35 秒
      const tr = fn && fn.i > 0 && fn.t < 0.35 && (FLOWS[fn.demo][fn.i - 1].screen !== fn.s.screen) ? fn.t / 0.35 : 1;
      if (tr < 1) {
        const mode = tth.r.str('mo.transition', 'crossfade');
        const cx = RD.x + RD.w / 2, cy = RD.y + RD.h / 2;
        for (const c of ctxs) {
          if (mode === 'iris') { c.beginPath(); c.arc(cx, cy, Math.hypot(RD.w, RD.h) * 0.5 * tr, 0, Math.PI * 2); c.clip(); }
          else if (mode === 'zoomInto') { const s = 1.25 - 0.25 * tr; c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy); c.globalAlpha = tr; }
          else if (mode === 'useEnter') { c.translate((1 - tr) * -RD.w * 0.08, 0); c.globalAlpha = tr; }
          else c.globalAlpha = tr;
        }
      }
      // 饰件的作用范围（ast.ornamentScope）要知道现在画的是局内 HUD 还是界面（M12a-07）
      ORN.frame = RD; ORN.where = 'hud';
      // 合成分支（界面模板 / 叠加模板 / 菜单 / 元素 HUD / 四控件样本、弹出模板的垫底与菜单打开时保留的局内元素）：compose/layers.ts，快照工具共用（M12a-19）
      const out = composeLayers(d, RD, tth, this.highlightId, this.diegetic, { newFrame: false });
      if (own) {
        const seen = (h: Hit) => !span || (h.rect.x + h.rect.w > span[0] && h.rect.x < span[1]);
        const clip = <T extends Hit>(h: T): T => {
          if (!span || (h.rect.x >= span[0] && h.rect.x + h.rect.w <= span[1])) return h;
          const x0 = Math.max(h.rect.x, span[0]), x1 = Math.min(h.rect.x + h.rect.w, span[1]);
          return { ...h, rect: { ...h.rect, x: x0, w: x1 - x0 }, full: h.rect };
        };
        // 按元素排版：带 kind = 'part' 的是部件，其余是元素；模板 / 菜单（不按元素排版）返回的命中框一律当部件（PartHit 的约定）
        if (out.usesElements) { this.usesElements = true; this.hits = out.hits.filter((h) => !isPartHit(h) && seen(h)).map(clip); }
        this.parts = out.hits.filter((h) => (!out.usesElements || isPartHit(h)) && seen(h)).map((h) => clip(isPartHit(h) ? h : { ...h, kind: 'part' as const }));
      }
      drawSimOverlays(d, RD, tth, simState);
      // 运营层（ops.entries / ops.compliance，M9b）：局内与主界面
      drawOps(d, RD, tth);
      for (const c of ctxs) c.restore();
    };
    if (ab && str(ab, 'hud.style') !== 'none') {
      // UI A/B（M5b）：分界左边画 A 的 UI、右边画 B（当前）的，共用同一个模拟时钟，动画同步；
      // 流程演示（M9b）时 A 侧也盖上当前这一屏，两边一起换屏
      let abv = ab;
      if (fn && fdemo) {
        const fk = `${fdemo}|${fn.i}`;
        let out = this.abFlow.out;
        if (this.abFlow.src !== ab || this.abFlow.key !== fk || !out) { out = { ...ab, ...flowValues(fn, SELECTORS.screen) }; this.abFlow = { src: ab, key: fk, out }; }
        abv = out;
      }
      const rA = resolveUi(abv);
      const thA = buildTheme(rA, scenePaletteOf(abv), str(abv, 'hud.style'));
      thA.unitK = uk;
      // 分界按视口宽度算（与视口上的拖动柄一致，CSS 像素），夹在画幅黑边以内；0 / 1 = 只画一侧。下面换成设计单位画
      const half = Math.min(R.x + R.w, Math.max(R.x, cssW * split)) / uk;
      const sides: [ThemeT, ReturnType<typeof simulate>, number, number][] = [];
      if (half > RD.x) sides.push([thA, simulate(clock, events, rA), RD.x, half]);
      if (half < RD.x + RD.w) sides.push([th, sim, half, RD.x + RD.w]);
      for (const [tth, simState, x0, x1] of sides) {
        for (const c of ctxs) { c.save(); c.beginPath(); c.rect(x0, RD.y, x1 - x0, RD.h); c.clip(); }
        roleClip = { x: x0, y: RD.y, w: x1 - x0, h: RD.h };
        compose(tth, simState, tth === th, [x0, x1]);
        roleClip = null;
        for (const c of ctxs) c.restore();
      }
      if (half > RD.x && half < RD.x + RD.w) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(half - 1, RD.y, 2, RD.h); }
      const tags: [string, number][] = [];
      if (half > RD.x + 40) tags.push([half >= RD.x + RD.w ? 'UI A（只看 A）' : 'UI A', RD.x + 8]);
      if (half < RD.x + RD.w - 40) tags.push([half <= RD.x ? 'UI B（只看 B）' : 'UI B', half + 8]);
      for (const [label, x] of tags) drawText(tctx ?? ctx, label, x, RD.y + RD.h - 26, 20, { font: th.tokens.font, size: 12, weight: 800, color: '#fff', outline: { color: 'rgba(0,0,0,0.7)', width: 1.5 } });
    } else compose(th, sim);
    // 命中框与叙事内板子的尺寸换回 CSS 像素（参数面板点选、引擎按 CSS 像素算板子大小）
    if (uk !== 1) {
      this.hits = this.hits.map((h) => scaleHit(h, uk));
      this.parts = this.parts.map((h) => scaleHit(h, uk));
      for (const it of this.diegetic) { it.cssW *= uk; it.cssH *= uk; }
    }
    setSim(sim);
    // 画完留在当前（B）一侧的包：面板、导出等在 HudSystem 之外读 DATA / MENU 的地方看到的是画面上的游戏
    setPack(packFor(r));
    PSEUDO.pct = 0;
    TEXT_K.k = 1;
    DRAW_LOG.on = false;
    const now = performance.now();
    this.fxRecent = r.bool('chk.fxOcclusion') ? [...this.fxRecent.filter((f) => f.until > now), ...DRAW_LOG.fx.map((f) => ({ ...f, until: now + 4000 }))].slice(-400) : [];
    this.drawLog = { texts: DRAW_LOG.texts, boxes: DRAW_LOG.boxes, targets: DRAW_LOG.targets, fx: r.bool('chk.fxOcclusion') ? this.fxRecent : DRAW_LOG.fx, area: R, unitK: uk };
    this.drawSerial++;
    const dk = `${this.diegetic.map((x) => x.id).join(',')}|${animKey}|${cssW}x${cssH}`;
    if (dk !== this.diegeticKey || v !== this.lastDiegeticValues) { this.diegeticKey = dk; this.lastDiegeticValues = v; this.diegeticVersion++; }

    PIXROLE.displayMin = Infinity; PIXROLE.lowPx = 0;
    if (roleOut) { roleOut(); PAINT_LAYERS.of = null; ROLES.flush = null; }
    else if (px > 1) {
      const out = this.ctx;
      out.setTransform(1, 0, 0, 1, 0, 0);
      resetState(out);
      out.clearRect(0, 0, pxW, pxH);
      out.imageSmoothingEnabled = false;
      out.drawImage(this.lowCanvas, 0, 0, this.lowCanvas.width, this.lowCanvas.height, 0, 0, this.lowCanvas.width * (s / scale), this.lowCanvas.height * (s / scale));
      out.drawImage(this.textCanvas, 0, 0);
    }
    this.texture.needsUpdate = true;
    this.maskTexture.needsUpdate = true;
    // 元 UI：rel.metaFx 里的低血量去饱和随心跳、夜视常开
    const metaFx = r.list('rel.metaFx');
    this.frame = { texture: this.texture, mask: this.maskTexture, blurPx: d.blur * s, meta: { desat: metaFx.includes('lowHpDesat') && sim.lowPulse > 0 ? 0.55 + 0.25 * sim.lowPulse : 0, night: metaFx.includes('nightVision') ? 1 : 0 } };
    this.lastDrawMs = performance.now() - t0;
    return this.frame;
  }

  dispose() {
    this.texture.dispose();
    this.maskTexture.dispose();
  }
}
