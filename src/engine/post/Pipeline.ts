import * as THREE from 'three';
import { getPalette, type Palette } from '../../content/palettes';
import { hexToLinear, hexToRgb, linearToOklab } from '../../core/color';
import { bool, num, str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { U } from '../materials/uniforms';
import { getAsset, paperFile } from '../../content/assets';
import { assetTexture, solidTexture } from '../textures';
import { FullscreenPass } from './FullscreenPass';
import * as P from './passes';
import { StrokeLayer } from './strokes';
import type { HudFrame } from '../../hud/HudSystem';
import { disposeAllFx, FX_HEAD, fxById, fxForMedium, fxOfStage, type FxCtx, type FxDef, type FxStage } from './fx/registry';
import './fx/index';

/*
 * 后处理管线：场景(MRT) → 环境光遮蔽 → 体积光 → 自动曝光测光 → 辉光 → 调色/色调映射 → 景深 → 媒介 → 内部线 → 限色 → 移轴 → 纸纹/颗粒 → 镜头畸变 → 录像带/时间码 → 压缩噪点 → 输出(诊断、显示设备、画幅黑边)。
 * 每一步只在需要时执行；顺序固定，写在这里，迁移时按同样顺序搭 Godot 的后处理链。
 */

export type Diag = 'none' | 'gray' | 'value' | 'silhouette' | 'squint';

export interface PostFrame {
  near: number;
  far: number;
  ortho: boolean;
  time: number;
  stepTime: number;
  /** 太阳在屏幕上的位置（0~1），看不到时为 null */
  sun: [number, number] | null;
  invViewProj: THREE.Matrix4;
  camPos: THREE.Vector3;
  camRight: THREE.Vector3;
  camUp: THREE.Vector3;
  focusDist: number;
  /** 视锥半宽高：正交为世界单位；透视为 tan(半视角)（乘以深度得世界单位） */
  viewHalf: [number, number];
  /** 距上一帧的真实秒数；0 = 时间冻结或同步截图，自动曝光直接对准、不做过渡 */
  dt: number;
  /** 同步截图（renderSync）：屏显时间码显示起点，结果可复现 */
  capture?: boolean;
  /** 实际渲染用的相机（物体空间笔触要用它投影撒点） */
  camera?: THREE.Camera;
}

const SPOT_COLORS: Record<string, string[]> = {
  pinkBlue: ['#FF48B0', '#0078BF'],
  pinkBlueYellow: ['#FF48B0', '#0078BF', '#FFE800'],
  redTeal: ['#F15060', '#00838A'],
  orangeNavy: ['#FF6C2F', '#2F3D7E'],
};

function makeRT(w: number, h: number, opts: Partial<THREE.RenderTargetOptions> = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    ...opts,
  });
}

function glyphAtlas(): THREE.Texture {
  const chars = ' .:-=+*#%@';
  const cell = 16;
  const c = document.createElement('canvas');
  c.width = cell * chars.length;
  c.height = cell;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  g.font = `bold ${cell - 2}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...chars].forEach((ch, i) => g.fillText(ch, i * cell + cell / 2, cell / 2 + 1));
  const t = new THREE.CanvasTexture(c);
  t.flipY = true;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

export type OsdMode = 'play' | 'rec' | 'camcorder';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/** 5×7 点阵字（录像机屏显那种方块字）：每个字 7 行，每行 5 位，最高位在左。">" = 播放三角，"*" = 录制圆点 */
const FONT: Record<string, number[]> = {
  '0': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ':': [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00], '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f], M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11], O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  '>': [0x10, 0x18, 0x1c, 0x1e, 0x1c, 0x18, 0x10], '*': [0x00, 0x0e, 0x1f, 0x1f, 0x1f, 0x0e, 0x00],
};
const OSD_WHITE: [number, number, number] = [244, 244, 244];
const OSD_RED: [number, number, number] = [255, 48, 48];
const OSD_WARM: [number, number, number] = [255, 242, 200];

/*
 * 屏显字幕（OSD）：低分辨率字幕层，用内置 5×7 点阵字逐点写入（不依赖系统字体，任何机器上截图都一样），带右下 1 像素黑影。
 * 字的大小按黑边以内的可见区域算（约 120 行高、至少 150 列宽），窄画面也放得下。
 * 计时由引擎时间推算（不读系统时钟）；只在显示的秒数、模式、画面尺寸或黑边变化时重写，最多每秒一次。
 * 第 0 行对齐画面顶部；着色器用 texelFetch 按"一个字幕像素 = k 个画面像素"取样，字永远是整齐的方块。
 */
class OsdLayer {
  texture: THREE.DataTexture;
  /** 一个字幕像素占几个画面像素 */
  k = 1;
  cols = 2;
  rows = 2;
  private data = new Uint8Array(2 * 2 * 4);
  private key = '';

  constructor() {
    this.texture = this.makeTexture();
  }

  private makeTexture() {
    const t = new THREE.DataTexture(this.data, this.cols, this.rows, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }

  /**
   * @param time 引擎时间（秒）：磁带计数器从 0:00:00 走
   * @param hours "时间"参数（小时）：摄像机时钟从这一刻走，日期固定从 1997-08-14 起；与导出的 style_demo.gd 一致
   * @param letterbox 画幅黑边比例（0 = 无）：字放在黑边里面，不被盖住
   */
  update(mode: OsdMode, time: number, hours: number, w: number, h: number, letterbox: number) {
    const asp0 = w / h;
    // 黑边以内的可见区域
    const aw = letterbox > 0 && letterbox < asp0 ? h * letterbox : w;
    const ah = letterbox > asp0 ? w / letterbox : h;
    const k = Math.max(1, Math.round(Math.min(ah / 120, aw / 150)));
    const cols = Math.ceil(w / k);
    const rows = Math.ceil(h / k);
    const sec = Math.max(0, Math.floor(time));
    const counter = `${Math.floor(sec / 3600)}:${pad2(Math.floor(sec / 60) % 60)}:${pad2(sec % 60)}`;
    const all = Math.floor((Number.isFinite(hours) ? hours : 12) * 3600) + sec;
    const day = Math.floor(all / 86400);
    const sd = all - day * 86400;
    const hh = Math.floor(sd / 3600);
    const clock = `${hh < 12 ? 'AM' : 'PM'} ${hh % 12 || 12}:${pad2(Math.floor(sd / 60) % 60)}:${pad2(sd % 60)}`;
    const d = new Date(Date.UTC(1997, 7, 14 + day));
    const date = `${MONTHS[d.getUTCMonth()]}.${pad2(d.getUTCDate())} ${d.getUTCFullYear()}`;
    const blink = sec % 2 === 0;
    const key = [mode, k, cols, rows, letterbox, mode === 'camcorder' ? `${clock}|${date}` : `${counter}|${blink}`].join('|');
    if (key === this.key) return;
    this.key = key;
    this.k = k;
    if (cols !== this.cols || rows !== this.rows) {
      // 尺寸变了就换一张纹理（GPU 上的纹理尺寸不可变）
      this.texture.dispose();
      this.cols = cols;
      this.rows = rows;
      this.data = new Uint8Array(cols * rows * 4);
      this.texture = this.makeTexture();
    }
    this.data.fill(0);
    // 画幅黑边会盖住的地方不放字
    let x0 = 0, y0 = 0, x1 = cols, y1 = rows;
    if (letterbox > asp0) {
      const p = Math.ceil((rows - (rows * asp0) / letterbox) / 2);
      y0 += p; y1 -= p;
    } else if (letterbox > 0) {
      const p = Math.ceil((cols - (cols * letterbox) / asp0) / 2);
      x0 += p; x1 -= p;
    }
    const m = 7;
    const width = (s: string) => s.length * 6 - 1;
    if (mode === 'play') {
      this.text('PLAY >', x0 + m, y0 + m, OSD_WHITE);
      this.text('SP', x0 + m, y0 + m + 10, OSD_WHITE);
      this.text(counter, x1 - m - width(counter), y0 + m, OSD_WHITE);
    } else if (mode === 'rec') {
      this.text(blink ? '* REC' : '  REC', x0 + m, y0 + m, OSD_RED);
      this.text(counter, x1 - m - width(counter), y0 + m, OSD_WHITE);
    } else {
      this.text(clock, x1 - m - width(clock), y1 - m - 17, OSD_WARM);
      this.text(date, x1 - m - width(date), y1 - m - 7, OSD_WARM);
    }
    this.texture.needsUpdate = true;
  }

  /** 逐点写字：字点不透明；右下 1 像素黑影只落在还没有字的地方 */
  private text(s: string, x: number, y: number, rgb: [number, number, number]) {
    const { cols, rows, data } = this;
    const set = (px: number, py: number, shadow: boolean) => {
      if (px < 0 || py < 0 || px >= cols || py >= rows) return;
      const i = (py * cols + px) * 4;
      if (shadow) {
        if (data[i + 3] === 255) return;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 200;
      } else {
        data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
      }
    };
    for (let n = 0; n < s.length; n++) {
      const g = FONT[s[n]];
      if (!g) continue;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (!((g[r] >> (4 - c)) & 1)) continue;
          set(x + n * 6 + c, y + r, false);
          set(x + n * 6 + c + 1, y + r + 1, true);
        }
      }
    }
  }

  dispose() {
    this.texture.dispose();
  }
}

export class Pipeline {
  sceneRT!: THREE.WebGLRenderTarget;
  private rt: THREE.WebGLRenderTarget[] = [];
  private half: THREE.WebGLRenderTarget[] = [];
  /** 结构张量（各向异性 Kuwahara 用）：全分辨率半精度，两张互为平滑的输入输出；第一次用到时才创建 */
  private tensor: THREE.WebGLRenderTarget[] = [];
  private w = 1;
  private h = 1;
  private nearest = false;
  private samples = 4;
  /** 所有 pass 共用的 uniform */
  private readonly C = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uStepTime: { value: 0 },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uOrtho: { value: 1 },
    uViewHalf: { value: new THREE.Vector2(1, 1) },
  };
  private readonly passes: Record<string, FullscreenPass> = {};
  /** 后处理扩展（fx/registry.ts）：pass 第一次用到时才编译；临时目标与跨帧目标随画布尺寸重建 */
  private readonly fxPasses: Record<string, FullscreenPass> = {};
  private readonly fxSrc = new Map<string, string>();
  private readonly fxUni = new Map<string, Record<string, THREE.IUniform> | undefined>();
  private fxScratch: THREE.WebGLRenderTarget[] = [];
  private fxPersist = new Map<string, THREE.WebGLRenderTarget>();
  /** pass 名 → [fx id, 辅助名]（只在第一次见到这个名字时拆，收尾 X / 复查 F8） */
  private readonly fxNames = new Map<string, [string, string | undefined]>();
  /** 色板纸色 / 墨色、扩展 fx 的上下文：各一个对象，每帧只改字段（复查 F8：原来每帧、每个 fx 新建对象和闭包） */
  private readonly paperC = new THREE.Color();
  private readonly inkC = new THREE.Color();
  private readonly fxC: FxCtx = {
    renderer: null as unknown as THREE.WebGLRenderer, values: {}, frame: null as unknown as PostFrame, palette: null as unknown as Palette,
    paper: this.paperC, ink: this.inkC, input: null as unknown as THREE.Texture, scene: null as unknown as THREE.Texture, graded: null,
    normal: null as unknown as THREE.Texture, depth: null as unknown as THREE.Texture, res: new THREE.Vector2(), pixelated: false,
    blur: (src, radius) => this.blurFrom(src, radius),
    scratch: (i) => this.fxScratchRT(i),
    persist: (k) => this.fxPersistRT(k),
    copy: (src, dst) => { this.passes.copy.uniforms.tInput.value = src; this.passes.copy.render(this.renderer, dst); },
    passOf: (name) => this.fxPassOf(name),
  };
  private glyphs = glyphAtlas();
  private osd = new OsdLayer();
  /** 屏显时间码的起点（引擎时间）：打开字幕或换场景时重置，计数器从 0:00:00、摄像机时钟从设定的时刻走 */
  private osdT0 = 0;
  private osdPrev = 'none';
  /** 自动曝光：64×64 测光图 → 8×8 → 1×1（对数亮度）；1×1 两张交替（读上一帧、写这一帧），用浮点保证慢速适应时的细小增量不被吃掉 */
  private aeMeterRT!: THREE.WebGLRenderTarget;
  private aeReduceRT!: THREE.WebGLRenderTarget;
  private aeAdaptRT: THREE.WebGLRenderTarget[] = [];
  private aeIdx = 0;
  /** false = 下一帧直接对准当前画面（首帧、场景重建、截图之后、刚打开自动曝光） */
  private aePrimed = false;
  values: Values = {};
  /** 物体空间笔触层（引擎在场景重建后登记撒点用的网格） */
  readonly strokes = new StrokeLayer();
  palette: Palette = getPalette('inspiration');
  diag: Diag = 'none';
  /** 诊断视图是否包含游戏 UI 样本 */
  hudInDiag = false;
  /** 画面没有纵深（立绘背景铺满画面）：景深、移轴不做（引擎按场景设，审查修复 15） */
  flatDepth = false;
  /** 本帧的游戏 UI 样本（引擎每帧设置；null = 不显示） */
  hud: HudFrame | null = null;
  /** 纸张素材的 uniform（多个 pass 共享同一批对象） */
  private readonly paperU = {
    tPaperTex: { value: solidTexture('#808080') as THREE.Texture },
    uPaperTexOn: { value: 0 },
    uPaperTexScale: { value: 1 },
    uPaperTexMean: { value: 0.5 },
    uPaperTexGain: { value: 1 },
    uPaperTexColor: { value: 0 },
    uPaperTexSat: { value: 1 },
  };
  /** 色调排线图（素描、钢笔排线媒介用） */
  private readonly tamU = {
    tTam1: { value: solidTexture('#ffffff') as THREE.Texture },
    tTam2: { value: solidTexture('#ffffff') as THREE.Texture },
    uTam: { value: 0 },
  };

  constructor(private renderer: THREE.WebGLRenderer) {
    const mk = (name: string, frag: string, extra: Record<string, THREE.IUniform> = {}) => {
      this.passes[name] = new FullscreenPass(frag, { ...this.C, ...extra });
    };
    const tex = () => ({ value: null as THREE.Texture | null });
    const f = (v = 0) => ({ value: v });
    const col = (c = '#ffffff') => ({ value: new THREE.Color(c) });
    // 纸张素材：这几个 pass 共用同一组 uniform 对象，configure() 里改一次全部生效
    const paperU = this.paperU;
    const tamU = this.tamU;
    mk('bloomPre', P.BLOOM_PRE, { tInput: tex(), uThreshold: f(0.85) });
    mk('blur', P.BLUR, { tInput: tex(), uDir: { value: new THREE.Vector2(1, 0) } });
    mk('copy', P.COPY, { tInput: tex() });
    mk('grade', P.GRADE, {
      tScene: tex(), tBloom: tex(), uBloom: f(), uExposure: f(1), uTonemap: f(), uSat: f(1), uContrast: f(1), uTemp: f(), uGrade: f(), uGradeAmt: f(1), tNormal: tex(), uIsolate: f(), uIsolateAmt: f(1),
      tAdapt: tex(), uAuto: f(), uAEKey: f(0.45), uAERange: f(2.5),
    });
    mk('aeMeter', P.AE_METER, { tInput: tex(), uMetering: f(), uKeyLog: f(), uRange: f(2.5) });
    mk('aeReduce', P.AE_REDUCE, { tInput: tex() });
    mk('aeAdapt', P.AE_ADAPT, { tInput: tex(), tPrev: tex(), uDt: f(), uSpeed: f(1), uSnap: f(1), uKeyLog: f(), uRange: f(2.5) });
    mk('kuwahara', P.KUWAHARA, { tInput: tex(), uRadius: f(4), uSpread: f(1), tDepth: tex(), uStrokeDepth: f(), uFocus: f(20) });
    mk('sst', P.SST, { tInput: tex(), uScale: f(1) });
    mk('akf', P.AKF, {
      tInput: tex(), tTensor: tex(), tDepth: tex(), uRadius: f(4), uGrid: f(4), uAlpha: f(1), uSharp: f(8), uScale: f(1),
      uFlow: f(), uLength: f(14), uStrokeDepth: f(), uFocus: f(20),
    });
    mk('watercolor', P.WATERCOLOR, { tInput: tex(), tBlur: tex(), tOrig: tex(), uEdge: f(), uBleed: f(), uScale: f(1), uStrength: f(1), uPaper: col(), uWet: f(), ...paperU });
    mk('gouache', P.GOUACHE, { tInput: tex(), tOrig: tex(), uLevels: f(4), uScale: f(1), uStrength: f(1), ...paperU });
    mk('oil', P.OIL, { tInput: tex(), tOrig: tex(), uImpasto: f(), uScale: f(1), uStrength: f(1), uFlowOn: f() });
    mk('ink', P.INK, { tInput: tex(), tBlur: tex(), tNormal: tex(), tDepth: tex(), uLevels: f(4), uEdge: f(), uBleed: f(), uScale: f(1), uStrength: f(1), uKeepAccent: f(1), uPaper: col(), uInk: col(), uPomo: f(), uFeibai: f(), ...paperU });
    mk('gongbi', P.GONGBI, { tInput: tex(), tBlur: tex(), uEdge: f(), uScale: f(1), uStrength: f(1), uPaper: col(), uGlaze: f(), ...paperU });
    mk('hatch', P.HATCH_POST, { tInput: tex(), tNormal: tex(), uScale: f(1), uStrength: f(1), uKeepAccent: f(1), uMode: f(), uPaper: col(), uInk: col(), uHatchColor: f(), ...paperU, ...tamU });
    mk('halftone', P.HALFTONE, { tInput: tex(), uScale: f(1), uStrength: f(1), uInk: col() });
    mk('woodcut', P.WOODCUT, { tInput: tex(), tNormal: tex(), tDepth: tex(), uScale: f(1), uStrength: f(1), uKeepAccent: f(1), uPaper: col(), uInk: col(), uCutFlow: f(), uFocus: f(20) });
    mk('posterize', P.POSTERIZE, { tInput: tex(), uLevels: f(4), uStrength: f(1) });
    mk('riso', P.RISO, { tInput: tex(), uInk1: col(), uInk2: col(), uInk3: col(), uInkCount: f(2), uPaper: col(), uScale: f(1), uStrength: f(1) });
    mk('stainedGlass', P.STAINED, { tInput: tex(), uScale: f(1), uStrength: f(1), uInk: col() });
    mk('mosaic', P.MOSAIC, { tInput: tex(), uScale: f(1), uStrength: f(1), uPaper: col() });
    mk('ascii', P.ASCII, { tInput: tex(), tGlyphs: { value: this.glyphs }, uScale: f(1), uStrength: f(1), uGlyphCount: f(10) });
    mk('edges', P.EDGES, {
      tInput: tex(), tNormal: tex(), tDepth: tex(), uMode: f(), uWidth: f(1), uThreshold: f(0.5), uFade: f(), uBoil: f(), uWobble: f(),
      uColorMode: f(), uInk: col(), uLight: col(), uWeightStyle: f(), uWeightVar: f(0.6), uFocus: f(20), tEdgeMask: tex(),
    });
    mk('edgeMask', P.EDGE_MASK, { tNormal: tex(), tDepth: tex(), uMode: f(), uThreshold: f(0.5) });
    mk('ssao', P.SSAO, { tInput: tex(), tNormal: tex(), tDepth: tex(), uAmount: f(), uRadius: f(1) });
    mk('dof', P.DOF, { tInput: tex(), tDepth: tex(), uAmount: f(), uFocus: f(20), uRange: f(10) });
    mk('godrays', P.GODRAYS, { tInput: tex(), tNormal: tex(), uSun: { value: new THREE.Vector2(0.5, 0.8) }, uAmount: f(), uTint: col() });
    mk('lens', P.LENS, { tInput: tex(), uAmount: f() });
    mk('quantize', P.QUANTIZE, {
      tInput: tex(), uMode: f(), uDither: f(), uCount: f(), uLevels: f(6),
      uAnchor: f(), uInvViewProj: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uCamRight: { value: new THREE.Vector3() }, uCamUp: { value: new THREE.Vector3() }, uOrthoCam: f(), uDitherScale: f(1),
      uSwLab: { value: Array.from({ length: 64 }, () => new THREE.Vector3()) },
      uSwRgb: { value: Array.from({ length: 64 }, () => new THREE.Vector3()) },
    });
    mk('tilt', P.TILTSHIFT, { tInput: tex(), uDir: { value: new THREE.Vector2(1, 0) }, uAmount: f(), uFocus: f(0.5) });
    mk('overlay', P.OVERLAY, { tInput: tex(), uPaperAmt: f(), uPaperMix: f(), uGrain: f(), uChroma: f(), uVignette: f(), uPaper: col(), ...paperU });
    mk('vhs', P.VHS, {
      tInput: tex(), tChroma: tex(), tOsd: { value: this.osd.texture }, uVhs: f(), uWear: f(), uTracking: f(), uInterlace: f(), uLetterbox: f(),
      uOsdMode: f(), uOsdK: f(1), uOsdSize: { value: new THREE.Vector2(2, 2) },
    });
    mk('compress', P.COMPRESS, { tInput: tex(), uAmount: f(), uBlock: f(8) });
    mk('output', P.OUTPUT, {
      uLetterbox: f(), tInput: tex(), tNormal: tex(), uDiag: f(), uScreen: f(), uInRes: { value: new THREE.Vector2() }, uOutH: f(1), uPaper: col(), uInk: col(),
      tHud: tex(), tHudMask: tex(), tHudBlur: tex(), uHudOn: f(), uHudBlur: f(), uHudInDiag: f(), uCvd: { value: 0 }, uMetaDesat: f(), uNight: f(),
    });
    // 自动曝光的小尺寸目标：尺寸固定，不随画布重建
    const nearestOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.aeMeterRT = makeRT(64, 64, nearestOpts);
    this.aeReduceRT = makeRT(8, 8, nearestOpts);
    const aeType = renderer.extensions.has('EXT_color_buffer_float') ? THREE.FloatType : THREE.HalfFloatType;
    this.aeAdaptRT = [0, 1].map(() => makeRT(1, 1, { ...nearestOpts, type: aeType }));
    this.allocate(2, 2);
  }

  /** 按画布尺寸与像素化倍数分配渲染目标 */
  resize(canvasW: number, canvasH: number, pixelSize: number) {
    const w = Math.max(2, Math.floor(canvasW / pixelSize));
    const h = Math.max(2, Math.floor(canvasH / pixelSize));
    const nearest = pixelSize > 1;
    const samples = nearest ? 0 : 4;
    if (w === this.w && h === this.h && nearest === this.nearest && samples === this.samples) return;
    this.nearest = nearest;
    this.samples = samples;
    this.allocate(w, h);
  }

  private allocate(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.sceneRT?.dispose();
    this.rt.forEach((r) => r.dispose());
    this.half.forEach((r) => r.dispose());
    // 张量缓冲只释放不重建：下次用到时按新尺寸创建（不用油画/水粉/水彩时不占显存）
    this.tensor.forEach((r) => r.dispose());
    this.tensor = [];
    this.fxScratch.forEach((r) => r.dispose());
    this.fxScratch = [];
    this.fxPersist.forEach((r) => r.dispose());
    this.fxPersist.clear();
    // 扩展 fx 自建的目标也一起放掉（下一帧按新尺寸重建；关掉的效果不再一直占着显存）
    disposeAllFx();
    const filter = this.nearest ? THREE.NearestFilter : THREE.LinearFilter;
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, {
      count: 2,
      type: THREE.HalfFloatType,
      minFilter: filter,
      magFilter: filter,
      depthBuffer: true,
      depthTexture,
      samples: this.samples,
    });
    this.rt = [0, 1, 2].map(() => makeRT(w, h, { minFilter: filter, magFilter: filter }));
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    this.half = [0, 1].map(() => makeRT(hw, hh));
    this.C.uRes.value.set(w, h);
  }

  get size() {
    return new THREE.Vector2(this.w, this.h);
  }

  /** 下一帧自动曝光直接对准当前画面，不做过渡（场景重建、同步截图之后由引擎调用） */
  snapExposure() {
    this.aePrimed = false;
  }

  /** 屏显时间码从下一帧起重新计时（换场景时由引擎调用） */
  resetOsdClock() {
    this.osdPrev = 'none';
  }

  /** 把当前参数写入各 pass */
  configure(values: Values) {
    this.values = values;
    this.palette = getPalette(str(values, 'color.palette'));
    const pu = this.paperU;
    const pf = paperFile(str(values, 'surface.paperTex'));
    pu.uPaperTexOn.value = pf ? 1 : 0;
    if (pf) {
      pu.tPaperTex.value = assetTexture(pf.file, { repeat: true, placeholder: '#808080' });
      pu.uPaperTexMean.value = pf.mean;
      pu.uPaperTexGain.value = pf.color ? 2 : 1;
      pu.uPaperTexSat.value = pf.sat;
      pu.uPaperTexColor.value = pf.color ? 1 : 0;
    }
    pu.uPaperTexScale.value = num(values, 'surface.paperTexScale');
    this.strokes.preload(str(values, 'surface.strokes'));
    const tam = str(values, 'shading.hatchTex') === 'tam' && ['sketch', 'crosshatch'].includes(str(values, 'surface.medium'));
    this.tamU.uTam.value = tam ? 1 : 0;
    const tf = getAsset('tam')?.files;
    if (tam && tf) {
      this.tamU.tTam1.value = assetTexture(tf.tones123, { repeat: true, placeholder: '#ffffff' });
      this.tamU.tTam2.value = assetTexture(tf.tones456, { repeat: true, placeholder: '#ffffff' });
    }
  }

  /** 游戏 UI 的设备画幅（ctx.aspect / ctx.orientation，M10）：没开画面黑边时用它 */
  deviceLetterbox = 0;

  render(frame: PostFrame) {
    const r = this.renderer;
    const v = this.values;
    const pal = this.palette;
    const ps = this.passes;
    this.C.uNear.value = frame.near;
    this.C.uFar.value = frame.far;
    this.C.uOrtho.value = frame.ortho ? 1 : 0;
    this.C.uViewHalf.value.set(frame.viewHalf[0], frame.viewHalf[1]);
    this.C.uTime.value = frame.time;
    this.C.uStepTime.value = frame.stepTime;
    const paper = this.paperC.setRGB(...hexToRgb(pal.roles.paper));
    const ink = this.inkC.setRGB(...hexToRgb(pal.roles.ink));

    const sceneTex = this.sceneRT.textures[0];
    const normalTex = this.sceneRT.textures[1];
    const depthTex = this.sceneRT.depthTexture!;
    let cur: THREE.WebGLRenderTarget | null = null;
    const next = (...avoid: (THREE.WebGLRenderTarget | null)[]) => this.rt.find((t) => !avoid.includes(t))!;
    const tex = (t: THREE.WebGLRenderTarget | null) => (t ? t.texture : sceneTex);

    // 后处理扩展（fx/registry.ts）：各阶段按 order 跑登记的 fx，每个 fx 输出到池里一张不冲突的目标
    const fc = this.fxC;
    fc.renderer = r; fc.values = v; fc.frame = frame; fc.palette = pal; fc.scene = sceneTex;
    fc.normal = normalTex; fc.depth = depthTex; fc.res = this.C.uRes.value; fc.pixelated = this.nearest;
    const fxRun = (d: FxDef, input: THREE.Texture, out: THREE.WebGLRenderTarget, gradedTex: THREE.Texture | null) => {
      const p = this.fxPassOf(d.id);
      p.uniforms.tInput.value = input;
      const c = fc;
      c.input = input; c.graded = gradedTex;
      d.setup?.(p, c);
      if (d.render) d.render(c, out, p); else p.render(r, out);
    };
    const fxStage = (stage: FxStage, input: THREE.WebGLRenderTarget | null, gradedTex: THREE.Texture | null, ...avoid: (THREE.WebGLRenderTarget | null)[]) => {
      let at = input;
      for (const d of fxOfStage(stage)) {
        if (d.active && !d.active(v, frame)) continue;
        const out = next(at, ...avoid);
        fxRun(d, tex(at), out, gradedTex);
        at = out;
      }
      return at;
    };

    // 0 线性阶段：环境光遮蔽、体积光（输出仍是线性 HDR）
    let linearTex: THREE.Texture = sceneTex;
    const ao = num(v, 'lighting.ao');
    if (ao > 0) {
      const u = ps.ssao.uniforms;
      u.tInput.value = linearTex; u.tNormal.value = normalTex; u.tDepth.value = depthTex;
      u.uAmount.value = ao; u.uRadius.value = num(v, 'lighting.aoRadius');
      ps.ssao.render(r, this.rt[2]);
      linearTex = this.rt[2].texture;
    }
    const rays = num(v, 'lighting.godrays');
    if (rays > 0 && frame.sun) {
      const u = ps.godrays.uniforms;
      u.tInput.value = linearTex; u.tNormal.value = normalTex;
      u.uSun.value.set(frame.sun[0], frame.sun[1]);
      u.uAmount.value = rays;
      // 光束颜色 = 当前阳光色与天际色的混合（随时段变化）
      u.uTint.value.setRGB(...hexToLinear(pal.roles.skyHorizon)).lerp(U.uSunColor.value, 0.6);
      const target = linearTex === this.rt[2].texture ? this.rt[1] : this.rt[2];
      ps.godrays.render(r, target);
      linearTex = target.texture;
    }
    // 0.2 扩展：线性阶段
    linearTex = tex(fxStage('linear', this.rt.find((t) => t.texture === linearTex) ?? null, null));

    // 0.5 自动曝光：测线性 HDR 画面的对数平均亮度，随时间适应；结果留在 1×1 纹理里，调色时读取（全程在 GPU，不回读）
    const autoExp = num(v, 'color.autoExposure');
    const aeKey = num(v, 'color.exposureKey');
    const aeRange = num(v, 'color.exposureRange');
    if (autoExp > 0) {
      const keyLog = Math.log2(Math.max(1e-4, aeKey));
      const m = ps.aeMeter.uniforms;
      m.tInput.value = linearTex;
      m.uMetering.value = Math.max(0, ['average', 'center', 'spot'].indexOf(str(v, 'color.metering')));
      m.uKeyLog.value = keyLog;
      m.uRange.value = aeRange;
      ps.aeMeter.render(r, this.aeMeterRT);
      ps.aeReduce.uniforms.tInput.value = this.aeMeterRT.texture;
      ps.aeReduce.render(r, this.aeReduceRT);
      const a = ps.aeAdapt.uniforms;
      const prev = this.aeAdaptRT[this.aeIdx];
      const out = this.aeAdaptRT[1 - this.aeIdx];
      a.tInput.value = this.aeReduceRT.texture;
      a.tPrev.value = prev.texture;
      a.uDt.value = frame.dt;
      a.uSpeed.value = num(v, 'color.exposureSpeed');
      // 首帧、场景重建、截图之后、刚打开、时间冻结、同步截图：直接对准
      a.uSnap.value = !this.aePrimed || !(frame.dt > 0) ? 1 : 0;
      a.uKeyLog.value = keyLog;
      a.uRange.value = aeRange;
      ps.aeAdapt.render(r, out);
      this.aeIdx = 1 - this.aeIdx;
      this.aePrimed = true;
    } else {
      // 关掉期间不测光；重新打开时直接对准，不从很久以前的结果慢慢过渡
      this.aePrimed = false;
    }

    // 1 辉光
    const bloom = num(v, 'camera.bloom');
    let bloomTex: THREE.Texture | null = null;
    if (bloom > 0) {
      ps.bloomPre.uniforms.tInput.value = linearTex;
      ps.bloomPre.render(r, this.half[0]);
      for (let k = 0; k < 3; k++) {
        this.blurHalf(this.half[0].texture, 1 + k * 1.5);
      }
      bloomTex = this.half[0].texture;
    }

    // 2 调色
    const g = ps.grade.uniforms;
    g.tScene.value = linearTex;
    g.tBloom.value = bloomTex;
    g.uBloom.value = bloom;
    g.uExposure.value = num(v, 'color.brightness');
    g.uAuto.value = autoExp;
    g.uAEKey.value = aeKey;
    g.uAERange.value = aeRange;
    g.tAdapt.value = this.aeAdaptRT[this.aeIdx].texture;
    g.uTonemap.value = ['none', 'neutral', 'aces', 'agx', 'reinhard'].indexOf(str(v, 'color.tonemap'));
    g.uSat.value = num(v, 'color.saturation');
    g.uContrast.value = num(v, 'color.contrast');
    g.uTemp.value = num(v, 'color.temperature');
    g.uGrade.value = Math.max(0, ['none', 'tealOrange', 'bleach', 'sepia', 'technicolor', 'cross', 'faded', 'mono'].indexOf(str(v, 'color.grade')));
    g.uGradeAmt.value = num(v, 'color.gradeAmount');
    g.tNormal.value = normalTex;
    g.uIsolate.value = Math.max(0, ['none', 'accent', 'character', 'both'].indexOf(str(v, 'color.isolate')));
    g.uIsolateAmt.value = num(v, 'color.isolateAmount');
    let graded = this.rt.find((t) => t.texture !== linearTex)!;
    ps.grade.render(r, graded);
    cur = graded;
    // 景深（在媒介之前：它属于镜头）
    const dof = this.flatDepth ? 0 : num(v, 'camera.dof');
    if (dof > 0) {
      const u = ps.dof.uniforms;
      u.tInput.value = graded.texture; u.tDepth.value = depthTex;
      u.uAmount.value = dof; u.uFocus.value = frame.focusDist; // 清晰范围按"画面里看得到的世界高度"计，正交与透视手感一致
      const viewH = frame.viewHalf[1] * 2 * (frame.ortho ? 1 : frame.focusDist);
      u.uRange.value = Math.max(0.2, viewH * num(v, 'camera.dofRange'));
      const out = next(graded);
      ps.dof.render(r, out);
      graded = out;
      cur = out;
    }
    // 2.5 扩展：调色之后、媒介之前（结果当作媒介的原画）
    graded = fxStage('graded', graded, graded.texture)!;
    cur = graded;

    // 3 媒介
    const medium = str(v, 'surface.medium');
    const strength = num(v, 'surface.strength');
    const scale = num(v, 'surface.scale');
    const setCommon = (p: FullscreenPass) => {
      if (p.uniforms.uStrength) p.uniforms.uStrength.value = strength;
      if (p.uniforms.uScale) p.uniforms.uScale.value = scale;
      if (p.uniforms.uPaper) p.uniforms.uPaper.value.copy(paper);
      if (p.uniforms.uInk) p.uniforms.uInk.value.copy(ink);
      if (p.uniforms.uKeepAccent) p.uniforms.uKeepAccent.value = bool(v, 'surface.keepAccent') ? 1 : 0;
      if (p.uniforms.tNormal) p.uniforms.tNormal.value = normalTex;
      if (p.uniforms.tDepth) p.uniforms.tDepth.value = depthTex;
    };
    const run = (name: string, input: THREE.WebGLRenderTarget, extra: (p: FullscreenPass) => void = () => {}) => {
      const p = ps[name];
      setCommon(p);
      p.uniforms.tInput.value = input.texture;
      extra(p);
      const out = next(input, graded);
      p.render(r, out);
      return out;
    };
    if (medium !== 'none') {
      const radius = Math.round(num(v, 'surface.radius'));
      if (medium === 'watercolor' || medium === 'oil' || medium === 'gouache') {
        // 笔刷半径：水粉用较小的笔（约 0.75 倍）、水彩略小（约 0.85 倍）；各向异性路径用连续值，滑杆每一档都有变化，经典路径取整
        const radF = medium === 'gouache' ? Math.max(2, radius * 0.75) : medium === 'watercolor' ? Math.max(2, radius * 0.85) : radius;
        const rad = Math.round(radF);
        const strokeDepth = num(v, 'surface.strokeDepth');
        const k = str(v, 'surface.kuwahara') === 'anisotropic'
          ? this.anisoKuwahara(graded, depthTex, radF, scale, strokeDepth, frame.focusDist, num(v, 'surface.strokeFlow'), num(v, 'surface.strokeLength'))
          : run('kuwahara', graded, (p) => {
            p.uniforms.uRadius.value = rad;
            p.uniforms.uSpread.value = scale;
            p.uniforms.uStrokeDepth.value = strokeDepth;
            p.uniforms.uFocus.value = frame.focusDist;
          });
        if (medium === 'watercolor') {
          const blurT = this.blurFrom(k.texture, 2.2 * scale);
          cur = this.runInto('watercolor', k, graded, (p) => {
            setCommon(p);
            p.uniforms.tBlur.value = blurT;
            p.uniforms.tOrig.value = graded.texture;
            p.uniforms.uEdge.value = num(v, 'surface.edgeDarken');
            p.uniforms.uBleed.value = num(v, 'surface.bleed');
            p.uniforms.uWet.value = num(v, 'surface.wetness');
          });
        } else if (medium === 'oil') {
          cur = this.runInto('oil', k, graded, (p) => {
            setCommon(p);
            p.uniforms.tOrig.value = graded.texture;
            p.uniforms.uImpasto.value = num(v, 'surface.impasto');
            p.uniforms.uFlowOn.value = str(v, 'surface.kuwahara') === 'anisotropic' && num(v, 'surface.strokeFlow') > 0 ? 1 : 0;
          });
        } else {
          cur = this.runInto('gouache', k, graded, (p) => {
            setCommon(p);
            p.uniforms.tOrig.value = graded.texture;
            p.uniforms.uLevels.value = num(v, 'surface.inkLevels');
          });
        }
      } else if (medium === 'ink' || medium === 'gongbi') {
        const blurT = this.blurFrom(graded.texture, 2.5 * scale);
        cur = run(medium, graded, (p) => {
          p.uniforms.tBlur.value = blurT;
          p.uniforms.uEdge.value = num(v, 'surface.edgeDarken');
          if (p.uniforms.uBleed) p.uniforms.uBleed.value = num(v, 'surface.bleed');
          if (p.uniforms.uLevels) p.uniforms.uLevels.value = num(v, 'surface.inkLevels');
          // 泼墨 / 飞白（水墨）、罩染（工笔）：技术补全 P1，0 = 原样
          if (p.uniforms.uPomo) p.uniforms.uPomo.value = num(v, 'surface.pomo');
          if (p.uniforms.uFeibai) p.uniforms.uFeibai.value = num(v, 'surface.feibai');
          if (p.uniforms.uGlaze) p.uniforms.uGlaze.value = num(v, 'surface.glaze');
        });
      } else if (medium === 'sketch' || medium === 'crosshatch') {
        cur = run('hatch', graded, (p) => {
          p.uniforms.uMode.value = medium === 'sketch' ? 0 : 1;
          // 彩色排线（技术补全 P1）：0 = 原来的单色
          p.uniforms.uHatchColor.value = Math.max(0, ['mono', 'pencil', 'multi'].indexOf(str(v, 'surface.hatchColor')));
        });
      } else if (medium === 'riso') {
        const inks = SPOT_COLORS[str(v, 'surface.spotColors')] ?? SPOT_COLORS.pinkBlue;
        cur = run('riso', graded, (p) => {
          p.uniforms.uInk1.value.setRGB(...hexToRgb(inks[0]));
          p.uniforms.uInk2.value.setRGB(...hexToRgb(inks[1]));
          p.uniforms.uInk3.value.setRGB(...hexToRgb(inks[2] ?? '#ffffff'));
          p.uniforms.uInkCount.value = inks.length;
        });
      } else if (medium === 'woodcut') {
        // 刻纹走向（技术补全 P1）：fixed = 原来的固定斜向
        cur = run('woodcut', graded, (p) => {
          p.uniforms.uCutFlow.value = str(v, 'surface.cutFlow') === 'form' ? 1 : 0;
          p.uniforms.uFocus.value = frame.focusDist;
        });
      } else if (medium === 'posterize') {
        cur = run('posterize', graded, (p) => { p.uniforms.uLevels.value = num(v, 'surface.inkLevels'); });
      } else if (ps[medium]) {
        cur = run(medium, graded);
      } else {
        // 扩展媒介（fx/registry.ts 里 stage = 'medium' 的）
        const fx = fxForMedium(medium);
        if (fx) {
          const out = next(graded);
          fxRun(fx, graded.texture, out, graded.texture);
          cur = out;
        }
      }
    }

    // 3.5 物体空间笔触：先把当前画面复制一份当底，再把笔触叠上去；颜色取调色后（媒介之前）的画面
    const strokeSet = str(v, 'surface.strokes');
    if (strokeSet !== 'none' && frame.camera) {
      const out = next(cur, graded);
      ps.copy.uniforms.tInput.value = tex(cur);
      ps.copy.render(r, out);
      const drew = this.strokes.render(r, frame.camera, out, graded.texture, depthTex, {
        set: strokeSet,
        density: num(v, 'surface.strokeDensity'),
        size: num(v, 'surface.strokeSize'),
        colorMode: str(v, 'surface.strokeColor') === 'ink' ? 'ink' : 'scene',
        ink,
        // 技术补全 P1：按深度排序、角色与云也铺（默认都关 = 原样）
        sort: bool(v, 'surface.strokeSort'),
        dynamic: str(v, 'surface.strokeTargets') === 'all',
      }, { near: frame.near, far: frame.far, viewHalfY: frame.viewHalf[1], res: this.C.uRes.value });
      if (drew) cur = out;
    }
    cur = fxStage('afterStrokes', cur, graded.texture, graded);

    // 4 内部线
    const edgeMode = str(v, 'lines.edges');
    if (edgeMode !== 'none') {
      const bits = { depthNormal: 3, normal: 2, depth: 1, region: 5, all: 7 }[edgeMode] ?? 0;
      const e = ps.edges.uniforms;
      e.tInput.value = tex(cur);
      e.tNormal.value = normalTex;
      e.tDepth.value = depthTex;
      e.uMode.value = bits;
      e.uWidth.value = num(v, 'lines.edgeWidth') / (this.nearest ? 1.5 : 1);
      e.uThreshold.value = num(v, 'lines.edgeThreshold');
      e.uFade.value = num(v, 'lines.edgeFade');
      e.uBoil.value = num(v, 'lines.boil');
      e.uWobble.value = num(v, 'lines.wobble');
      e.uColorMode.value = ['ink', 'tinted', 'light', 'split', 'gold'].indexOf(str(v, 'lines.edgeColorMode'));
      // 线的提按（技术补全 P1）：0 = 原来的固定线宽
      e.uWeightStyle.value = Math.max(0, ['none', 'pressure', 'tiexian', 'youshi', 'brush'].indexOf(str(v, 'lines.weightStyle')));
      e.uWeightVar.value = num(v, 'lines.weightVar');
      e.uFocus.value = frame.focusDist;
      e.uInk.value.copy(ink);
      e.uLight.value.copy(paper);
      if (e.uWeightStyle.value > 0) {
        // 提按画法：先画一张边点图（借用扩展的临时目标 3：这里不在任何扩展 fx 之内）
        const m = ps.edgeMask.uniforms;
        m.tNormal.value = normalTex; m.tDepth.value = depthTex;
        m.uMode.value = bits; m.uThreshold.value = e.uThreshold.value;
        const mask = this.fxScratchRT(3);
        ps.edgeMask.render(r, mask);
        e.tEdgeMask.value = mask.texture;
      }
      const out = next(cur);
      ps.edges.render(r, out);
      cur = out;
    }
    cur = fxStage('afterEdges', cur, graded.texture, graded);

    // 5 限色
    const qm = str(v, 'color.quantize');
    if (qm !== 'off') {
      const q = ps.quantize.uniforms;
      q.tInput.value = tex(cur);
      q.uMode.value = qm === 'palette' ? 1 : 2;
      q.uDither.value = ['none', 'bayer2', 'bayer4', 'bayer8', 'noise'].indexOf(str(v, 'color.dither'));
      q.uLevels.value = num(v, 'color.levels');
      q.uAnchor.value = str(v, 'color.ditherAnchor') === 'world' ? 1 : 0;
      q.uInvViewProj.value.copy(frame.invViewProj);
      q.uCamPos.value.copy(frame.camPos);
      q.uCamRight.value.copy(frame.camRight);
      q.uCamUp.value.copy(frame.camUp);
      q.uOrthoCam.value = frame.ortho ? 1 : 0;
      q.uDitherScale.value = Math.max(1, num(v, 'camera.pixelSize'));
      const sw = pal.swatches.slice(0, 64);
      q.uCount.value = sw.length;
      sw.forEach((hex, i) => {
        const [lr, lg, lb] = hexToLinear(hex);
        const lab = linearToOklab([lr, lg, lb]);
        (q.uSwLab.value as THREE.Vector3[])[i].set(lab[0], lab[1], lab[2]);
        (q.uSwRgb.value as THREE.Vector3[])[i].set(...hexToRgb(hex));
      });
      const out = next(cur);
      ps.quantize.render(r, out);
      cur = out;
    }
    cur = fxStage('afterQuantize', cur, graded.texture, graded);

    // 6 移轴
    // camera.tiltMode = 'depth'（技术补全 P2 的按深度移轴，fx/retro.ts）时这里的屏幕带状模糊不做
    const tilt = this.flatDepth || str(v, 'camera.tiltMode') === 'depth' ? 0 : num(v, 'camera.tiltShift');
    if (tilt > 0) {
      const t = ps.tilt.uniforms;
      t.uAmount.value = tilt;
      t.uFocus.value = 1 - num(v, 'camera.tiltFocus');
      for (const dir of [[1, 0], [0, 1]]) {
        t.tInput.value = tex(cur);
        t.uDir.value.set(dir[0], dir[1]);
        const out = next(cur);
        ps.tilt.render(r, out);
        cur = out;
      }
    }

    // 7 纸纹、颗粒、色差、暗角
    const screen = str(v, 'surface.screen');
    const o = ps.overlay.uniforms;
    o.uPaperAmt.value = num(v, 'surface.paper');
    o.uPaperMix.value = num(v, 'surface.paperColor');
    o.uGrain.value = num(v, 'surface.grain');
    o.uChroma.value = num(v, 'surface.chroma');
    o.uVignette.value = num(v, 'surface.vignette');
    o.uPaper.value.copy(paper);
    if (o.uPaperAmt.value + o.uPaperMix.value + o.uGrain.value + o.uChroma.value + o.uVignette.value > 0) {
      o.tInput.value = tex(cur);
      const out = next(cur);
      ps.overlay.render(r, out);
      cur = out;
    }
    cur = fxStage('afterOverlay', cur, graded.texture, graded);

    // 7.5 镜头畸变
    const lens = num(v, 'camera.lens');
    if (lens > 0) {
      ps.lens.uniforms.tInput.value = tex(cur);
      ps.lens.uniforms.uAmount.value = lens;
      const o2 = next(cur);
      ps.lens.render(r, o2);
      cur = o2;
    }

    // 7.6 录像带 / 屏显字幕：放在镜头之后——先有镜头，再录上带子，最后才播到屏幕上
    const osdMode = str(v, 'surface.osd');
    const vhsOn = screen === 'vhs';
    const letterbox = str(v, 'camera.letterbox') === 'none' ? 0 : Number(str(v, 'camera.letterbox'));
    if (vhsOn || osdMode !== 'none') {
      const u = ps.vhs.uniforms;
      let mode = 0;
      if (osdMode !== 'none') {
        // 摄像机时钟从"时间"参数设定的时刻起算（不用昼夜循环的当前时段：那样会快进、跨午夜时倒退），与导出的 style_demo.gd 一致
        if (this.osdPrev === 'none') this.osdT0 = frame.time;
        // 同步截图固定显示起点（0:00:00 / 设定的时刻），截图可复现
        const osdTime = frame.capture ? 0 : Math.max(0, frame.time - this.osdT0);
        this.osd.update(osdMode as OsdMode, osdTime, num(v, 'lighting.time'), this.w, this.h, letterbox);
        u.tOsd.value = this.osd.texture;
        u.uOsdK.value = this.osd.k;
        u.uOsdSize.value.set(this.osd.cols, this.osd.rows);
        mode = osdMode === 'camcorder' ? 2 : 1;
      }
      u.uOsdMode.value = mode;
      u.uVhs.value = vhsOn ? 1 : 0;
      const wear = num(v, 'surface.vhsWear');
      u.uWear.value = wear;
      u.uTracking.value = num(v, 'surface.vhsTracking');
      u.uInterlace.value = bool(v, 'surface.vhsInterlace') ? 1 : 0;
      u.uLetterbox.value = letterbox;
      u.tInput.value = tex(cur);
      if (vhsOn) {
        // 颜色先横向预模糊到半分辨率（磁带的颜色带宽本来就只有亮度的几分之一）：VHS pass 的颜色取样从这里读，不会稀疏跳读出重影
        // half[] 在调色之后没有别的 pass 占用（辉光与水彩/水墨的模糊都已用完）
        const b = ps.blur.uniforms;
        const cw = Math.max(0.5, ((1.5 + 2.5 * wear) * this.w) / 1920);
        b.tInput.value = tex(cur);
        b.uDir.value.set(cw, 0);
        ps.blur.render(r, this.half[1]);
        b.tInput.value = this.half[1].texture;
        b.uDir.value.set(cw * 1.7, 0);
        ps.blur.render(r, this.half[0]);
        u.tChroma.value = this.half[0].texture;
      } else u.tChroma.value = tex(cur);
      const o3 = next(cur);
      ps.vhs.render(r, o3);
      cur = o3;
    }

    this.osdPrev = osdMode;

    // 7.7 数码压缩噪点（在录像带之后：像把录像翻录成低码率的数码视频）
    const comp = num(v, 'surface.compression');
    if (comp > 0) {
      const u = ps.compress.uniforms;
      u.tInput.value = tex(cur);
      u.uAmount.value = comp;
      // 宏块按"约 540 行的视频"换算：1080p 下 16 像素一块，低分辨率下不小于 8 像素
      u.uBlock.value = 8 * Math.max(1, Math.round(this.h / 540));
      const o4 = next(cur);
      ps.compress.render(r, o4);
      cur = o4;
    }
    cur = fxStage('final', cur, graded.texture, graded);

    // 8 输出（画幅黑边在这里最后画，录像带和压缩噪点都不会弄脏黑边）
    const out = ps.output.uniforms;
    out.tInput.value = tex(cur);
    out.tNormal.value = normalTex;
    out.uDiag.value = ['none', 'gray', 'value', 'silhouette', 'squint'].indexOf(this.diag);
    out.uCvd.value = ['off', 'protan', 'deutan', 'tritan', 'achroma'].indexOf(str(v, 'chk.cvd')) > 0 ? ['off', 'protan', 'deutan', 'tritan', 'achroma'].indexOf(str(v, 'chk.cvd')) : 0;
    out.uScreen.value = screen === 'crt' ? 1 : screen === 'lcd' ? 3 : 0;
    out.uInRes.value.set(this.w, this.h);
    // 输出画布的设备像素高（CRT 扫描线按输出像素定周期，整合修复 U#11）
    out.uOutH.value = r.domElement.height || this.h;
    out.uLetterbox.value = str(v, 'camera.letterbox') === 'none' ? this.deviceLetterbox : Number(str(v, 'camera.letterbox'));
    out.uPaper.value.copy(paper);
    out.uInk.value.copy(ink);
    // 游戏 UI 样本：画布纹理在这里合成；毛玻璃要一张模糊过的当前画面（half[] 在录像带之后已空闲）
    const hud = this.hud;
    out.uHudOn.value = hud ? 1 : 0;
    out.uHudInDiag.value = this.hudInDiag ? 1 : 0;
    out.uMetaDesat.value = hud?.meta?.desat ?? 0;
    out.uNight.value = hud?.meta?.night ?? 0;
    out.tHud.value = hud?.texture ?? null;
    out.uHudBlur.value = 0;
    if (hud && hud.blurPx > 0) {
      // CSS blur(r) 的 σ = r；换算到半分辨率内部像素；blurFrom 两轮模糊合计 σ ≈ 3.06 × 半径
      const canvasW = r.domElement.width || this.w;
      const sigmaHalf = (hud.blurPx * (this.w / canvasW)) / 2;
      out.tHudBlur.value = this.blurFrom(tex(cur), Math.max(0.5, sigmaHalf / 3.06));
      out.tHudMask.value = hud.mask;
      out.uHudBlur.value = 1;
    }
    ps.output.render(r, null);
  }

  private runInto(name: string, input: THREE.WebGLRenderTarget, avoid: THREE.WebGLRenderTarget, extra: (p: FullscreenPass) => void) {
    const p = this.passes[name];
    p.uniforms.tInput.value = input.texture;
    extra(p);
    const out = this.rt.find((t) => t !== input && t !== avoid)!;
    p.render(this.renderer, out);
    return out;
  }

  /**
   * 各向异性 Kuwahara：结构张量（Sobel）→ 分离高斯平滑（σ≈2px）→ 沿流向的椭圆 8 扇区滤波 + 笔触纹。
   * 输出写到 rt 池里第一张不是 src 的；调用方再用 runInto(…, k, src) 取第三张，三张池子正好够用。
   */
  private anisoKuwahara(src: THREE.WebGLRenderTarget, depthTex: THREE.Texture, radius: number, scale: number, strokeDepth: number, focus: number, flow: number, length: number) {
    const r = this.renderer;
    // 张量是方向场，不是画面：像素化模式下也用线性过滤；按需创建，allocate() 清空后按新尺寸重建
    if (!this.tensor.length) this.tensor = [0, 1].map(() => makeRT(this.w, this.h));
    const [t0, t1] = this.tensor;
    const s = this.passes.sst.uniforms;
    s.tInput.value = src.texture;
    s.uScale.value = scale;
    this.passes.sst.render(r, t0);
    // 复用模糊 pass：它的 9 抽头核 σ≈1.7px，偏移放大 1.18 倍 ≈ 论文里张量平滑用的 σ=2px
    const b = this.passes.blur.uniforms;
    b.tInput.value = t0.texture;
    b.uDir.value.set(1.18, 0);
    this.passes.blur.render(r, t1);
    b.tInput.value = t1.texture;
    b.uDir.value.set(0, 1.18);
    this.passes.blur.render(r, t0);
    const a = this.passes.akf.uniforms;
    a.tInput.value = src.texture;
    a.tTensor.value = t0.texture;
    a.tDepth.value = depthTex;
    a.uRadius.value = radius;
    // 圆盘取样网格每边的格数按实际笔刷半径（含"笔触/颗粒尺度"）定：≤6 时约一像素一格，更大只把取样拉稀（封顶 6，最多 113 次取样）
    a.uGrid.value = Math.min(6, Math.max(2, Math.round(radius * scale)));
    a.uScale.value = scale;
    a.uFlow.value = flow;
    a.uLength.value = length;
    a.uStrokeDepth.value = strokeDepth;
    a.uFocus.value = focus;
    const out = this.rt.find((t) => t !== src)!;
    this.passes.akf.render(r, out);
    return out;
  }

  /** 半分辨率模糊，结果留在 half[0] */
  private blurHalf(src: THREE.Texture, radius: number) {
    const b = this.passes.blur.uniforms;
    b.tInput.value = src;
    b.uDir.value.set(radius, 0);
    this.passes.blur.render(this.renderer, this.half[1]);
    b.tInput.value = this.half[1].texture;
    b.uDir.value.set(0, radius);
    this.passes.blur.render(this.renderer, this.half[0]);
  }

  private blurFrom(src: THREE.Texture, radius: number): THREE.Texture {
    const b = this.passes.blur.uniforms;
    b.tInput.value = src;
    b.uDir.value.set(radius, 0);
    this.passes.blur.render(this.renderer, this.half[1]);
    b.tInput.value = this.half[1].texture;
    b.uDir.value.set(0, radius);
    this.passes.blur.render(this.renderer, this.half[0]);
    b.tInput.value = this.half[0].texture;
    b.uDir.value.set(radius * 1.5, 0);
    this.passes.blur.render(this.renderer, this.half[1]);
    b.tInput.value = this.half[1].texture;
    b.uDir.value.set(0, radius * 1.5);
    this.passes.blur.render(this.renderer, this.half[0]);
    return this.half[0].texture;
  }

  /** 扩展 fx 的 pass（'id' 或 'id:辅助名'）：第一次用到时编译 */
  private fxPassOf(name: string): FullscreenPass {
    let key = this.fxNames.get(name);
    if (!key) { const [id, sub] = name.split(':'); key = [id, sub]; this.fxNames.set(name, key); }
    const d = fxById(key[0]), sub = key[1];
    const ex = d && sub ? d.extra?.[sub] : undefined;
    const frag = sub ? ex?.frag : d?.frag, uniforms = sub ? ex?.uniforms : d?.uniforms;
    if (!d || frag === undefined) throw new Error(`没有登记的后处理扩展：${name}`);
    // 热更新会重新登记同一个 id：着色器或 uniform 对象换了就重新编译（缓存按登记对象比较）
    const have = this.fxPasses[name];
    if (have && this.fxSrc.get(name) === frag && this.fxUni.get(name) === uniforms) return have;
    have?.material.dispose();
    const p = new FullscreenPass(FX_HEAD + frag, { ...this.C, tInput: { value: null }, ...uniforms });
    this.fxPasses[name] = p;
    this.fxSrc.set(name, frag);
    this.fxUni.set(name, uniforms);
    return p;
  }

  private fxTarget() {
    const filter = this.nearest ? THREE.NearestFilter : THREE.LinearFilter;
    return makeRT(this.w, this.h, { minFilter: filter, magFilter: filter });
  }

  private fxScratchRT(i: number) {
    while (this.fxScratch.length <= i) this.fxScratch.push(this.fxTarget());
    return this.fxScratch[i];
  }

  private fxPersistRT(key: string) {
    let t = this.fxPersist.get(key);
    if (!t) { t = this.fxTarget(); this.fxPersist.set(key, t); }
    return t;
  }

  /** 扩展 fx 自建的显存资源（模块级渲染目标、画布纹理）释放掉：换场景时引擎调、dispose 时调；还开着的效果下一帧按需重建（复查 F9） */
  releaseFx() {
    disposeAllFx();
  }

  dispose() {
    this.fxScratch.forEach((r) => r.dispose());
    this.fxPersist.forEach((r) => r.dispose());
    disposeAllFx();
    Object.values(this.fxPasses).forEach((p) => p.material.dispose());
    this.sceneRT.dispose();
    this.rt.forEach((r) => r.dispose());
    this.half.forEach((r) => r.dispose());
    this.strokes.dispose();
    this.aeMeterRT.dispose();
    this.aeReduceRT.dispose();
    this.aeAdaptRT.forEach((r) => r.dispose());
    this.tensor.forEach((r) => r.dispose());
    Object.values(this.passes).forEach((p) => p.material.dispose());
    this.glyphs.dispose();
    this.osd.dispose();
  }
}
