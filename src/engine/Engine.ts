import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getPalette } from '../content/palettes';
import { ROLE_GROUPS, ROLE_INDEX, ROLES, type Role } from '../content/roles';
import { hexToLinear, mixHex } from '../core/color';
import { mulberry32 } from '../core/rng';
import { CAMERA_ANGLES } from '../dims/camera';
import { allParams, bool, num, str } from '../dims/registry';
import type { Values } from '../dims/types';
import { outlineMaterial, particleMaterial, PARTICLE_U, shadowDepthMaterial, skyMaterial, surfaceMaterial, waterMaterial, WATER_U } from './materials/materials';
import { U } from './materials/uniforms';
import { bindAssetUniforms } from './assetUniforms';
import { CharacterSprites } from './sprites';
import { HudSystem } from '../hud/HudSystem';
import { resolveUi } from '../hud/sys/resolve';
import { SELECTORS } from '../hud/sys/register';
import { hudValues } from '../hud/flow';
import { HUD_SIM, fireHud } from '../hud/sim';
import { registerSceneSampler } from '../hud/sceneLum';
import { sceneSource, setSceneSource } from './sceneSource';
import { bakeCached, bakeMinimap, derivePois, ExploredMask, INTERACT_KINDS, lensInverse, mapKindOf, mapUVOf, minimapArtKey, questOrder, TARGET_KINDS, type Poi, type ScreenPt, type WorldGrid, type WorldView } from '../hud/world';
import { Pipeline, type Diag } from './post/Pipeline';
import { DiegeticSigns } from './diegetic';
import { buildScene, rebuildDynamic, LAYER_FX, LAYER_HULL, LAYER_MAIN, type BuiltDynamic, type BuiltScene, type BuildOpts } from './scene/build';
import * as parts from './scene/parts';
import { getSceneBuilder } from './scene/sceneRegistry';
import { withSceneActors } from './scene/actors3d';
import './scene/scenes';
import type { SceneDesc, SceneGrid } from './scene/types';
import { engineExts, runEngineExt, type EngineExtCtx } from './engineExt';
import './ext/index';

/*
 * 引擎：持有 renderer、场景、相机、阴影、后处理与运行循环。
 * apply(values) 根据参数的 rebuild 级别决定：重建场景 / 只重建角色 / 只改 uniform / 只改相机。
 */

export interface EngineStats {
  fps: number;
  triangles: number;
  calls: number;
  timeOfDay: number;
  internal: [number, number];
  /** 游戏 UI 样本最近一次重画耗时（毫秒）；不显示 UI 时为 null */
  hudMs: number | null;
}

const PRESETS = ['matte', 'plastic', 'clay', 'ceramic', 'felt', 'metal', 'paper', 'stone', 'wood'];
const MODELS = ['unlit', 'lambert', 'halfLambert', 'toonRamp', 'cel', 'gooch', 'pbr', 'hatching', 'matcap'];

/** 横版自动跳的重力（世界单位 / 秒²） */
const HOP_G = 30;

function keyOf(values: Values, level: string) {
  const ids = allParams().filter((p) => p.rebuild === level).map((p) => p.id).sort();
  return ids.map((id) => `${id}=${values[id]}`).join('|');
}

/**
 * 立绘的色板调色（整合修复 U#15：原来只「换成最近的角色色」，自然色板之间差不多，油画 / 写实 / 黏土 / 体素在立绘场景里看起来一样）：
 * 色板颜色（去掉发光、强调、交互、花这类点缀色）按明度排序分三段，各取平均色 → 插画的暗部 / 中间调 / 亮部分别借这三段的色相与饱和度。
 * 写成模块函数而不是 Engine 的方法：热替换时旧的引擎实例也不会调到不存在的方法
 */
const IMAGE_SPOT: Role[] = ['emissive', 'accent', 'interactive', 'characterAccent', 'flower'];
function setImageGrade(roles: Record<Role, string>) {
  const cols = ROLES.map(([r]) => r).filter((r) => !IMAGE_SPOT.includes(r)).map((r) => hexToLinear(roles[r]))
    .map((c) => ({ c, l: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] })).sort((a, b) => a.l - b.l);
  const n = cols.length, cut = [0, Math.round(n / 3), Math.round((n * 2) / 3), n];
  for (let k = 0; k < 3; k++) {
    const part = cols.slice(cut[k], Math.max(cut[k] + 1, cut[k + 1]));
    const avg = [0, 1, 2].map((i) => part.reduce((sum, q) => sum + q.c[i], 0) / part.length);
    U.uImageRamp.value[k].setRGB(avg[0], avg[1], avg[2]);
  }
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly pipeline: Pipeline;
  private scene = new THREE.Scene();
  private ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
  private persp = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera = this.ortho;
  private controls: OrbitControls;
  private mats = { surface: surfaceMaterial(), outline: outlineMaterial() };
  private depthMat = shadowDepthMaterial();
  private shadowRT: THREE.WebGLRenderTarget;
  private shadowCam = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
  private sky: THREE.Mesh;
  private water: THREE.Mesh;
  private particles: THREE.Points;
  private built?: BuiltScene;
  private desc?: SceneDesc;
  private character?: BuiltDynamic;
  /** 二维角色载体（像素精灵、纸片人）与序列帧特效 */
  private sprites = new CharacterSprites();
  /** 游戏 UI 样本（画布绘制，docs/ui-hud-plan.md M1） */
  /** 游戏 UI 画布（参数面板读命中框、解析结果；QA 读元素位置） */
  readonly hud = new HudSystem();
  private values: Values = {};
  private keys = { scene: '', character: '', camera: '' };
  private pressed = new Set<string>();
  private charState = { pos: new THREE.Vector3(), facing: 0, phase: 0, moving: false };
  private clock = new THREE.Timer();
  private simTime = 0;
  private stepTime = 0;
  private lastStep = -1;
  /** 交给后处理的帧间隔（秒）；0 = 时间冻结或同步截图（自动曝光据此直接对准） */
  private frameDt = 0;
  /** renderSync 期间为 true：交给后处理，屏显时间码显示起点 */
  private capturing = false;
  /** 可读性检查取画面时为 true：这一帧不合成 UI */
  private noHud = false;
  /** 世界里的 UI（M6）：兴趣点、已探索区、小地图底图缓存 */
  private pois: Poi[] = [];
  private explored = new ExploredMask();
  private mapCache: { key: string; canvas: HTMLCanvasElement } | null = null;
  /** 最近一帧的世界视图（参数面板、QA 读） */
  world: WorldView | null = null;
  /** 叙事内 UI 的板子（M6） */
  private diegetic = new DiegeticSigns();
  /** UI A/B：左半边用这组参数画 UI（null = 关） */
  hudAB: Values | null = null;
  timeOfDay = 15.5;
  frozen = false;
  private raf = 0;
  private fpsAcc = { t: 0, n: 0, fps: 60 };
  private captureResolve: ((url: string) => void)[] = [];
  private resizeObs: ResizeObserver;
  private viewSize = 20;
  private camDist = 60;
  /** 暂停镜头操控的原因（画框上拖动元素 'edit-drag' 等，§6）；有任何一个时 OrbitControls 不响应 */
  private orbitLocks = new Set<string>();
  /**
   * 渲染精度（§3.3）：设备像素比上限 2，跟随 matchMedia（拖到另一块屏幕、浏览器缩放）；
   * 实测掉帧（连续约 1.5 秒平均一帧超过 20ms）就退回 1.5，本页面之后不再升回去（避免来回抖）
   */
  private dpr = { cap: 2, fellBack: false, acc: 0, n: 0, mq: null as MediaQueryList | null, onMq: () => {} };
  onStats?: (s: EngineStats) => void;
  onError?: (msg: string) => void;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.wantDpr());
    this.watchDpr();
    this.renderer.info.autoReset = false;
    this.renderer.autoClear = true;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.pipeline = new Pipeline(this.renderer);

    const depthTex = new THREE.DepthTexture(2048, 2048);
    this.shadowRT = new THREE.WebGLRenderTarget(2048, 2048, { depthTexture: depthTex, depthBuffer: true });
    U.uShadowMap.value = depthTex;

    for (const c of [this.ortho, this.persp]) c.layers.enable(LAYER_HULL), c.layers.enable(LAYER_FX);
    this.shadowCam.layers.set(LAYER_MAIN);

    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.sky = new THREE.Mesh(tri, skyMaterial());
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    this.sky.layers.set(LAYER_FX);
    this.scene.add(this.sky);

    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), waterMaterial());
    this.water.layers.set(LAYER_FX);
    this.water.renderOrder = 10;
    this.scene.add(this.water);

    const N = 2400;
    const pg = new THREE.BufferGeometry();
    const seeds = new Float32Array(N * 3);
    const rr = mulberry32(99);
    for (let i = 0; i < N * 3; i++) seeds[i] = rr();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    this.particles = new THREE.Points(pg, particleMaterial());
    this.particles.frustumCulled = false;
    this.particles.layers.set(LAYER_FX);
    this.scene.add(this.particles);
    this.scene.add(this.sprites.group);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    // 侧视是正好 0°（§9.1），镜头可以平视；不能翻到地面以下
    this.controls.maxPolarAngle = Math.PI * 0.5;

    const el = this.renderer.domElement;
    el.addEventListener('keydown', (e) => this.onKey(e, true));
    el.addEventListener('keyup', (e) => this.onKey(e, false));
    el.addEventListener('blur', () => this.pressed.clear());
    el.addEventListener('pointerdown', () => el.focus());

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    // HUD 的画面亮度采样（sceneLum，§8 RC3 ②）：引擎自己登记采样函数和自己（整合修复 X#17：HUD 不再经 ui/engineRef 找引擎）
    setSceneSource(this);
    registerSceneSampler((w) => this.sampleScene(w));
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault();
      if (down) this.pressed.add(k); else this.pressed.delete(k);
    }
    // E：离交互物足够近时打开对话（M6：交互提示 → 对话框逐字）
    if (k === 'e' && down && this.world?.poi && this.world.poi.dist < 3) { fireHud('dialog'); fireHud('pickup'); }
  }

  /** 画框的 CSS 尺寸（同步截图 captureFrame 期间是指定的尺寸，不动 DOM） */
  private sizeOverride: { w: number; h: number } | null = null;
  get cssW() { return this.sizeOverride?.w ?? this.container.clientWidth; }
  get cssH() { return this.sizeOverride?.h ?? this.container.clientHeight; }

  private resize() {
    const w = Math.max(1, this.cssW), h = Math.max(1, this.cssH);
    // 换比例前的取景距离和镜头实际离注视点多远（两者之比 = 滚轮缩放的倍数；configureCamera 里 OrbitControls 会按新的距离上下限夹一次，要在夹之前记下）
    const prevDist = this.camDist, prevLen = this.camera.position.distanceTo(this.controls.target);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.applyPipelineSize();
    this.configureCamera(false);
    // 跟拍的镜头按新比例重摆（技术补全 H 的请求：内容框让取景距离变了、关卡两端按画面宽夹的注视点也变了；16:9 下距离不变）
    this.reframeFollow(prevDist, prevLen);
  }

  private applyPipelineSize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.pipeline.resize(size.x, size.y, Math.max(1, Math.round(num(this.values, 'camera.pixelSize') || 1)));
    U.uResolution.value.copy(this.pipeline.size);
  }

  /* ---------------- 渲染精度（DPR） ---------------- */

  private wantDpr() {
    return Math.min(window.devicePixelRatio || 1, this.dpr.fellBack ? 1.5 : this.dpr.cap);
  }

  /** 设备像素比变化（换屏、浏览器缩放）时重设：matchMedia 只对当前值触发一次，所以每次变化后重新挂 */
  private watchDpr() {
    this.dpr.mq?.removeEventListener('change', this.dpr.onMq);
    if (typeof window.matchMedia !== 'function') return;
    this.dpr.mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.dpr.onMq = () => { this.applyDpr(); this.watchDpr(); };
    this.dpr.mq.addEventListener('change', this.dpr.onMq);
  }

  private applyDpr() {
    const want = this.wantDpr();
    if (Math.abs(this.renderer.getPixelRatio() - want) < 1e-3) return;
    this.renderer.setPixelRatio(want);
    this.resize();
  }

  /**
   * 掉帧检测：只在页面可见、像素比 > 1.5 时统计；平均一帧超过 20ms（低于约 50 帧）就退回 1.5。
   * 用没夹过的帧间隔（审查修复 17：原来 ≥ 50ms 的帧会把统计清零，最慢的机器反而永远不退）；只有切标签页这类 > 250ms 的空档不算，单帧也最多按 100ms 计（一次卡顿不至于把整窗拉过线）
   */
  private watchFrameTime(dt: number) {
    const d = this.dpr;
    if (d.fellBack || this.renderer.getPixelRatio() <= 1.5 || document.visibilityState !== 'visible' || dt <= 0) { d.acc = 0; d.n = 0; return; }
    if (dt > 0.25) return;
    d.acc += Math.min(dt, 0.1); d.n++;
    if (d.n < 90) return;
    const avg = d.acc / d.n;
    d.acc = 0; d.n = 0;
    if (avg > 0.02) {
      d.fellBack = true;
      console.info(`[引擎] 平均一帧 ${(avg * 1000).toFixed(1)}ms，渲染精度从 ${this.renderer.getPixelRatio()} 退回 1.5`);
      this.applyDpr();
    }
  }

  /** 当前渲染精度（设备像素比）与是否因掉帧退回过 */
  get pixelRatio() { return { dpr: this.renderer.getPixelRatio(), cap: this.dpr.cap, fellBack: this.dpr.fellBack }; }

  /* ---------------- 镜头操控 ---------------- */

  /**
   * 暂停 / 恢复镜头操控（§6：画框上拖动元素时不能顺带转镜头）。
   * setOrbitLock('edit-drag') 加一个原因；setOrbitLock('edit-drag', false) 只去掉这一个；setOrbitLock(null) 去掉全部。
   * 有任何原因时 OrbitControls 整个不响应（转、平移、缩放都停）；场景自己锁定的镜头（2D 场景只是不能转）另算。
   */
  setOrbitLock(reason: string | null, on = true) {
    if (reason === null) this.orbitLocks.clear();
    else if (on) this.orbitLocks.add(reason);
    else this.orbitLocks.delete(reason);
    this.syncControlsEnabled();
  }

  /** OrbitControls 响应不响应：有暂停原因时不响应；第一人称 / 追尾镜头（K 轨道）由引擎每帧摆，也不响应 */
  private syncControlsEnabled() {
    this.controls.enabled = this.orbitLocks.size === 0 && !this.povRig();
  }

  /** 第一人称 / 追尾镜头的 rig（SceneRig.eye / chase，K 轨道）；别的场景是 null */
  private povRig() {
    const r = this.desc?.camera;
    return r && (r.chase || r.eye) ? r : null;
  }

  /** 镜头操控现在被哪些原因暂停 */
  get orbitLockReasons(): string[] { return [...this.orbitLocks]; }

  /** 镜头复位：回到场景机位（双击画框空白处、场景▾ 的「镜头复位」，§4.2；视图状态，不进撤销） */
  resetCamera() {
    this.configureCamera(true);
  }

  setDiag(d: Diag) {
    this.pipeline.diag = d;
  }

  /** 诊断视图是否包含游戏 UI 样本 */
  setHudInDiag(on: boolean) {
    this.pipeline.hudInDiag = on;
  }

  /** 应用一组参数 */
  apply(values: Values) {
    this.values = values;
    const sk = `${str(values, 'game.scene')}#${num(values, 'game.seed')}#${keyOf(values, 'scene')}`;
    const ck = keyOf(values, 'character');
    const camKey = keyOf(values, 'camera');
    try {
      if (sk !== this.keys.scene) {
        this.keys.scene = sk;
        this.keys.character = ck;
        this.rebuildScene();
        this.keys.camera = camKey;
        this.configureCamera(true);
      } else if (ck !== this.keys.character) {
        this.keys.character = ck;
        this.rebuildCharacter();
      }
      if (camKey !== this.keys.camera) {
        this.keys.camera = camKey;
        this.configureCamera(true);
      }
    } catch (err) {
      console.error(err);
      this.onError?.(String(err));
    }
    if (!bool(values, 'lighting.cycle')) this.timeOfDay = num(values, 'lighting.time');
    this.pipeline.configure(values);
    this.sprites.preload(values);
    this.applyPipelineSize();
    this.updateUniforms();
    runEngineExt('onValues', this.extCtx());
  }

  /** 引擎扩展的上下文：一个对象，每次只改字段（收尾 X / 复查 F8：原来每帧新建；扩展不要跨帧留着它） */
  private extC: EngineExtCtx | null = null;
  /** 引擎扩展（engineExt.ts）的上下文 */
  private extCtx(): EngineExtCtx {
    const c = this.extC ??= {
      scene: this.scene, root: null, desc: null, values: this.values, camera: this.camera, renderer: this.renderer,
      time: 0, stepTime: 0, dt: 0, target: this.controls.target, viewH: 10, player: null, aspect: 1,
    };
    c.scene = this.scene; c.root = this.built?.root ?? null; c.desc = this.desc ?? null; c.values = this.values;
    c.camera = this.camera; c.renderer = this.renderer; c.time = this.simTime; c.stepTime = this.stepTime; c.dt = this.frameDt;
    c.target = this.controls.target; c.viewH = this.desc ? this.viewHeight() : 10; c.player = this.character ? this.charState.pos : null;
    c.aspect = this.cssW / Math.max(1, this.cssH);
    return c;
  }

  private buildOpts(): BuildOpts {
    const v = this.values;
    const rep = str(v, 'geometry.representation') as BuildOpts['rep'];
    return {
      rep,
      prim: {
        rep: rep === 'smooth' ? 'smooth' : 'faceted',
        segments: num(v, 'geometry.segments'),
        roundness: num(v, 'shape.roundness'),
        jitter: num(v, 'geometry.vertexJitter'),
      },
      voxelSize: num(v, 'geometry.voxelSize'),
      voxelBevel: num(v, 'geometry.voxelBevel'),
      seed: num(v, 'game.seed'),
    };
  }

  private rebuildScene() {
    const v = this.values;
    const id = str(v, 'game.scene');
    const builder = getSceneBuilder(id) ?? getSceneBuilder('sandbox')!;
    const seed = num(v, 'game.seed');
    let nid = 1000;
    // 现有 3D 场景补上敌人 / NPC（RC8，scene/actors3d.ts）；构建器自己写了 actors 的场景原样
    const desc = withSceneActors(getSceneBuilder(id) ? id : 'sandbox', builder({ values: v, seed, rng: mulberry32(seed), nextId: () => nid++ }));
    if (this.built) {
      this.scene.remove(this.built.root);
      this.built.dispose();
    }
    this.desc = desc;
    this.pois = derivePois(desc);
    this.mapPoiList = [];
    this.explored.reset();
    this.mapCache = null;
    this.built = buildScene(desc, this.buildOpts(), this.mats);
    this.scene.add(this.built.root);
    // 换了场景：自动曝光下一帧直接对准，不从上一个场景的亮度慢慢过渡；屏显时间码重新计时
    this.pipeline.snapExposure();
    this.pipeline.resetOsdClock();
    this.character = this.built.dynamics.find((d) => d.group.kind === 'character');
    // 公告板 / 程序动画的动态组（K 轨道）：换场景时挑一次，每帧只走这张表（没有时不花时间）
    this.props = this.built.dynamics.filter((d) => d.group.billboard || d.group.anim);
    this.sprites.group.visible = false;
    // 立绘背景（铺满画面的贴图）没有纵深：景深、移轴不做（审查修复 15：原来会把立绘的脸糊掉，像渲染错误）
    this.pipeline.flatDepth = !!desc.images?.some((im) => im.cover);
    // 物体空间笔触只铺静态网格：根节点下直接挂的表面网格（不含描边外壳、动态组）
    this.built.root.updateMatrixWorld(true);
    // 深度带（横版）不铺：正交分层视差会挪动它们，笔触点是这里一次烘死的（build.ts 的 strokeSources 已排除）
    this.pipeline.strokes.setSources(this.built.strokeSources.filter((m) => m.material === this.mats.surface));
    // 会动的物体（角色、云……）也登记给物体空间笔触（技术补全 P1：surface.strokeTargets = 'all' 时才铺；默认 'static' 不变）
    this.pipeline.strokes.setDynamicSources(this.strokeDynamicMeshes());
    this.hop = null;
    if (desc.playerStart) this.charState.pos.set(...desc.playerStart);
    this.charState.facing = desc.playerFacing ?? 0;

    // 水
    const hTex = desc.water?.heightTexture ?? desc.terrain?.heightTexture;
    if (desc.water && hTex) {
      const w = desc.water;
      this.water.geometry.dispose();
      this.water.geometry = (w.shape === 'circle' && (!desc.terrain || w.size === desc.terrain.size)
        ? new THREE.CircleGeometry(w.size / 2, 96)
        : new THREE.PlaneGeometry(w.size, w.size, 96, 96)
      ).rotateX(-Math.PI / 2);
      this.water.position.set(w.center?.[0] ?? 0, w.level, w.center?.[1] ?? 0);
      WATER_U.uHeightTex.value = hTex;
      WATER_U.uHalf.value = w.heightHalf ?? (desc.terrain ? desc.terrain.size / 2 : w.size / 2);
      WATER_U.uWaterLevel.value = w.level;
      this.water.visible = true;
    } else {
      this.water.visible = false;
    }
    U.uTerrainAmp.value = desc.terrain?.amplitude ?? 1;
    U.uTerrainBottom.value = desc.terrain?.bottomY ?? -2;

    // 阴影相机框住整个场景（rig.shadowFollow：只罩住注视点周围，K 轨道的长赛道）
    const R = desc.camera?.shadowFollow ?? desc.bounds.radius;
    this.shadowCam.left = -R; this.shadowCam.right = R; this.shadowCam.top = R; this.shadowCam.bottom = -R;
    this.shadowCam.near = 0.1; this.shadowCam.far = R * 4;
    this.shadowCam.updateProjectionMatrix();
    // 换场景时让后处理扩展放掉自建的渲染目标 / 画布纹理（还开着的效果下一帧按需重建；复查 F9 的「便宜做法」）
    this.pipeline.releaseFx();
    runEngineExt('onSceneBuilt', this.extCtx());
  }

  private rebuildCharacter() {
    // 自带身体的玩家（赛车、飞船，K 轨道）不随 shape.character 换成小人
    if (!this.character || !this.desc || this.character.group.fixedBody) return;
    const v = this.values;
    const shape: parts.ShapeOpts = {
      roundness: num(v, 'shape.roundness'), proportion: num(v, 'shape.proportion'), detail: num(v, 'shape.detail'),
      variation: num(v, 'shape.variation'), canopy: str(v, 'shape.canopy'),
    };
    rebuildDynamic(this.character, parts.character(str(v, 'shape.character'), num(v, 'shape.headRatio'), shape, 2), this.buildOpts(), this.mats);
    // 角色网格换了：重新登记物体空间笔触的动态源（技术补全 P1）
    this.pipeline.strokes.setDynamicSources(this.strokeDynamicMeshes());
  }

  /**
   * 物体空间笔触的动态源（技术补全 P1）：角色与云这类会动的物体的表面网格（描边外壳 BackSide 不要）。
   * 角色排在最前（笔触最多登记 24 个，伪 3D 场景的公告板很多，角色不能被挤掉）；角色本身也在 dynamics 里，去重
   */
  private strokeDynamicMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    const seen = new Set<THREE.Object3D>();
    const add = (o?: THREE.Object3D) => o?.traverse((m) => {
      const mm = m as THREE.Mesh;
      if (!mm.isMesh || seen.has(mm)) return;
      seen.add(mm);
      if ((mm.material as THREE.Material).side !== THREE.BackSide) out.push(mm);
    });
    add(this.character?.object);
    for (const d of this.built?.dynamics ?? []) add(d.object);
    return out;
  }

  /**
   * 这一刻实际用的镜头（§5.2 / §9.1）：场景带了 rig（2D 场景）时按 rig——投影 / 俯角 / 方位 / 焦距锁定，配方与手写的这几个键不生效；
   * rig.projection = 'values' 的横版跟参数选正交或透视，像素化 > 1 时强制正交（像素不爬）；rig.angles 给了可选俯角时 camera.angle 是其中一个就用它。
   * 正交 + 有深度带 + 平视（俯角 0、方位 0）时打开分层视差。
   */
  private camSpec() {
    const v = this.values, d = this.desc!, rig = d.camera;
    if (!rig) {
      const angle = CAMERA_ANGLES[str(v, 'camera.angle')] ?? CAMERA_ANGLES.iso;
      return { persp: str(v, 'camera.projection') === 'persp', pitch: angle.pitch, yaw: num(v, 'camera.azimuth'), fovMm: num(v, 'camera.fov'), viewSize: d.viewSize, parallax: false };
    }
    const pix = Math.round(num(v, 'camera.pixelSize')) > 1;
    const persp = rig.projection === 'persp' || (rig.projection === 'values' && str(v, 'camera.projection') === 'persp' && !pix);
    const pitch = rig.angles?.[str(v, 'camera.angle')] ?? rig.pitch;
    const parallax = !persp && !!d.layers?.length && pitch === 0 && rig.yaw === 0;
    return { persp, pitch, yaw: rig.yaw, fovMm: rig.fovMm ?? 35, viewSize: rig.viewSize ?? d.viewSize, parallax };
  }

  /** 正交分层视差开着（横版像素化 / 选了正交时，§9.1 P1b） */
  private parallaxOn = false;
  /** 正交分层视差按哪个焦距换算每层缩放（与透视版同一个取景） */
  private parallaxFov = 35;

  /** 每帧路径上复用的向量（审查修复 27：跟拍、注视点、格子投影不再每帧 new） */
  private scratch = { rest: new THREE.Vector3(), follow: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() };

  /**
   * 默认注视点：rig.target → 包围球中心。rig.fit（内容框）：画框比内容窄时（手机竖屏、4:3），
   * 注视点沿镜头右方向挪到「内容不出画」的范围里离默认点最近的位置（审查修复 2）；16:9 下内容框都在画面里，不动
   */
  private restTarget(out = this.scratch.rest): THREE.Vector3 {
    const d = this.desc!, rig = d.camera, t = rig?.target ?? d.bounds.center;
    out.set(t[0], t[1], t[2]);
    const fit = rig?.fit;
    if (fit) {
      const visW = this.viewSize * (this.cssW / Math.max(1, this.cssH)), cx = fit.cx ?? 0;
      const lo = cx + fit.w / 2 - visW / 2, hi = cx - fit.w / 2 + visW / 2;
      const o = lo <= hi ? Math.max(lo, Math.min(hi, 0)) : cx;
      const yaw = THREE.MathUtils.degToRad(rig.yaw);
      out.x += Math.cos(yaw) * o;
      out.z -= Math.sin(yaw) * o;
    }
    return out;
  }

  /** 场景镜头的最小取景倍数（camera.zoom × 滚轮缩放）：固定机位的布景只铺到 1 倍（审查修复 5 / 18） */
  private minZoomOf(rig: SceneDesc['camera']): number {
    return rig?.minZoom ?? 0.75;
  }

  /** 跟拍：有 rig 时只有写了 followAxis 的才跟（没写 = 固定机位，审查修复 19）；3D 场景照旧看 camera.mode */
  private following(): boolean {
    const rig = this.desc?.camera;
    return str(this.values, 'camera.mode') === 'follow' && !!this.character && (!rig || !!rig.followAxis);
  }

  /** 注视平面上看得到的世界高度（正交按缩放；透视按到注视点的距离） */
  private viewHeight(cam: THREE.Camera = this.camera): number {
    return cam === this.ortho
      ? (this.ortho.top - this.ortho.bottom) / this.ortho.zoom
      : 2 * Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2)) * cam.position.distanceTo(this.controls.target);
  }

  /**
   * 跟拍时镜头要看的点（复用同一个向量，调用方要留着就 copy）：rig.followAxis = 'x' 只沿 x 跟（横版，竖直方向跟脚底 + 画面偏移，x 夹在关卡两端）；
   * 'xz' 在地面上跟，rig.bounds 给了地面范围时把注视点夹住，让正交镜头看到的地面（半宽 = 取景 × 宽高比 / 2，半深 = 取景 / (2 · sin 俯角)）不出地图（审查修复 4）；
   * 3D 场景是角色胸口
   */
  private followPoint(): THREE.Vector3 {
    const rig = this.desc?.camera, p = this.charState.pos, out = this.scratch.follow;
    if (!rig?.followAxis) return out.set(p.x, p.y + 0.8, p.z);
    const H = this.viewHeight(), off = rig.frameOffset ?? [0, 0];
    const aspect = this.cssW / Math.max(1, this.cssH);
    const clampTo = (v: number, a: number, b: number, half: number) => (b - a <= half * 2 ? (a + b) / 2 : Math.max(a + half, Math.min(b - half, v)));
    if (rig.followAxis === 'xz') {
      let x = p.x + off[0] * H, z = p.z;
      const y = 0.8 + off[1] * H;
      if (rig.bounds) {
        const [x0, x1, z0, z1] = rig.bounds;
        const pitch = THREE.MathUtils.degToRad(this.lastPitch || 50), yawR = THREE.MathUtils.degToRad(this.lastYaw || 0);
        // 注视点在 y 高处，视线落地的点比注视点远 y / tan(俯角)（正俯视时几乎为 0），沿「远离镜头」的水平方向
        const dz = y / Math.max(0.05, Math.tan(pitch));
        // 看得到的地面是一个按方位转过的矩形（半宽 = 取景 × 宽高比 / 2，半深 = 取景 / (2 · sin 俯角)）：转到世界轴上取外包再夹（技术补全 G 的请求；方位 0 时和原来一模一样）
        const hw = (H * aspect) / 2, hd = H / (2 * Math.max(0.2, Math.sin(pitch)));
        const sn = Math.abs(Math.sin(yawR)), cn = Math.abs(Math.cos(yawR));
        const ex = cn * hw + sn * hd, ez = sn * hw + cn * hd;
        const ox = -Math.sin(yawR) * dz, oz = -Math.cos(yawR) * dz;
        x = clampTo(x + ox, x0, x1, ex) - ox;
        z = clampTo(z + oz, z0, z1, ez) - oz;
      }
      return out.set(x, p.y + y, z);
    }
    const rest = this.restTarget(this.scratch.a);
    let x = p.x + off[0] * H;
    if (rig.xRange) x = clampTo(x, rig.xRange[0], rig.xRange[1], (H * aspect) / 2);
    return out.set(x, p.y + off[1] * H, rest.z);
  }

  /** 相机：投影、俯角、方位、取景、焦距；reset 为 true 时重置位置 */
  private configureCamera(reset: boolean) {
    const v = this.values;
    if (!this.desc) return;
    const pov = this.povRig();
    if (pov) { this.configurePov(pov, reset); return; }
    this.syncControlsEnabled();
    this.controls.enableZoom = true;
    const spec = this.camSpec(), rig = this.desc.camera;
    const persp = spec.persp;
    const cam = persp ? this.persp : this.ortho;
    const switched = cam !== this.camera;
    this.camera = cam;
    const aspect = this.cssW / Math.max(1, this.cssH);
    const R = this.desc.bounds.radius;
    // 2D 场景：取景大小夹在 [rig.minZoom（固定机位的布景 = 1，其余 0.75）, 3] 倍，滑块和滚轮的乘积都不出这个范围（审查修复 5 / 18）；
    // rig.fit（内容框）：画框比内容窄时取景放大到装得下内容宽度（contain，审查修复 2：手机竖屏不丢主体）
    const minZ = this.minZoomOf(rig);
    const zoomV = rig ? Math.max(minZ, Math.min(3, num(v, 'camera.zoom'))) : Math.max(0.05, num(v, 'camera.zoom'));
    const baseView = rig?.fit ? Math.max(spec.viewSize, rig.fit.w / aspect) : spec.viewSize;
    this.viewSize = baseView / zoomV;
    const pitch = THREE.MathUtils.degToRad(spec.pitch);
    const yaw = THREE.MathUtils.degToRad(spec.yaw);
    this.parallaxOn = spec.parallax;
    this.parallaxFov = spec.fovMm;
    if (persp) {
      const f = spec.fovMm;
      this.persp.fov = THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * f)));
      this.persp.aspect = aspect;
      this.camDist = (this.viewSize / 2) / Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2)) * 1.05;
      this.persp.near = Math.max(0.05, this.camDist * 0.02);
      this.persp.far = this.camDist + Math.max(R * 6, 900);
      this.persp.updateProjectionMatrix();
    } else {
      const hh = this.viewSize / 2;
      this.ortho.left = -hh * aspect; this.ortho.right = hh * aspect; this.ortho.top = hh; this.ortho.bottom = -hh;
      this.camDist = R * 3 + 20;
      this.ortho.near = 0.1;
      this.ortho.far = this.camDist + Math.max(R * 4, 900);
      if (reset) this.ortho.zoom = 1;
      this.ortho.updateProjectionMatrix();
    }
    U.uViewHeight.value = this.viewSize;
    const follow = this.following();
    // 锁定的场景：俯角 / 方位夹死（不能转），不能平移（布景只铺到取景框，平移就露边，审查修复 5 / 18）；滚轮缩放照旧但夹住。镜头复位、换参数时机位也跟着 rig 走
    const locked = !!rig?.lockOrbit;
    const lockedChanged = locked !== this.wasLocked || (locked && (this.lastPitch !== spec.pitch || this.lastYaw !== spec.yaw));
    this.wasLocked = locked; this.lastPitch = spec.pitch; this.lastYaw = spec.yaw;
    // 画框比例变了（resize）：固定机位的内容框要重新对一次注视点
    const fitMoved = !!rig?.fit && !follow && locked;
    if (reset || switched || lockedChanged || fitMoved) {
      // 先按注视平面放好机位（正交的取景高度不随距离变，透视用 camDist）；跟拍时再按 rig 的画面偏移挪一次
      const dir = this.scratch.b.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));
      const place = (t: THREE.Vector3) => { this.controls.target.copy(t); cam.position.copy(t).addScaledVector(dir, this.camDist); cam.up.set(0, 1, 0); cam.lookAt(this.controls.target); this.controls.object = cam; };
      place(follow ? this.scratch.c.copy(this.charState.pos).setY(this.charState.pos.y + 0.8) : this.restTarget());
      if (follow) place(this.followPoint());
    }
    this.controls.enableRotate = !locked;
    // 滚轮缩放：2D 场景同样夹住（正交改 zoom，透视改距离），和滑块的乘积不出 [minZoom, 3]（原来滚轮能到 4，和滑块的 3 不一致）
    this.controls.minZoom = rig ? minZ / zoomV : 0;
    this.controls.maxZoom = rig ? 3 / zoomV : Infinity;
    this.controls.minDistance = rig && persp ? (this.camDist * zoomV) / 3 : 0;
    this.controls.maxDistance = rig && persp ? (this.camDist * zoomV) / minZ : Infinity;
    if (rig && !persp) this.ortho.zoom = Math.max(this.controls.minZoom, Math.min(this.controls.maxZoom, this.ortho.zoom));
    this.ortho.updateProjectionMatrix();
    this.controls.enablePan = !locked;
    if (locked) {
      const phi = Math.PI / 2 - pitch;
      this.controls.minPolarAngle = this.controls.maxPolarAngle = phi;
      this.controls.minAzimuthAngle = this.controls.maxAzimuthAngle = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    } else {
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = Math.PI * 0.5;
      this.controls.minAzimuthAngle = -Infinity;
      this.controls.maxAzimuthAngle = Infinity;
    }
    this.controls.autoRotate = !locked && str(v, 'camera.mode') === 'autoRotate';
    this.controls.autoRotateSpeed = 0.8;
    this.controls.update();
  }
  private wasLocked = false;
  private lastPitch = NaN;
  private lastYaw = NaN;

  /**
   * 第一人称 / 追尾镜头（SceneRig.eye / chase，K 轨道）：透视；焦距按 rig（画框太窄时按 minHFov 放大垂直视角）；
   * 不经过 OrbitControls（拖动、滚轮、平移都不响应），机位每帧由 placePov 按玩家的位置和朝向摆。
   */
  private configurePov(rig: NonNullable<SceneDesc['camera']>, reset: boolean) {
    const cam = this.persp;
    this.camera = cam;
    this.controls.object = cam;
    const aspect = this.cssW / Math.max(1, this.cssH);
    let vfov = 2 * Math.atan(24 / (2 * (rig.fovMm ?? 24)));
    if (rig.minHFov) {
      const want = THREE.MathUtils.degToRad(rig.minHFov);
      if (2 * Math.atan(Math.tan(vfov / 2) * aspect) < want) vfov = Math.min(THREE.MathUtils.degToRad(100), 2 * Math.atan(Math.tan(want / 2) / aspect));
    }
    cam.fov = THREE.MathUtils.radToDeg(vfov);
    cam.aspect = aspect;
    cam.near = rig.eye ? 0.05 : 0.1;
    cam.far = Math.max(this.desc!.bounds.radius * 4, 900);
    cam.updateProjectionMatrix();
    this.viewSize = rig.viewSize ?? this.desc!.viewSize;
    this.camDist = rig.chase ? Math.hypot(rig.chase.back, rig.chase.up) : 4;
    U.uViewHeight.value = this.viewSize;
    this.parallaxOn = false;
    this.wasLocked = true; this.lastPitch = NaN; this.lastYaw = NaN;
    const c = this.controls;
    c.enableRotate = false; c.enablePan = false; c.enableZoom = false; c.autoRotate = false;
    c.minPolarAngle = 0; c.maxPolarAngle = Math.PI * 0.5; c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity;
    this.syncControlsEnabled();
    if (reset) this.placePov(1);
  }

  /**
   * 按玩家摆第一人称 / 追尾镜头；k = 这一帧往目标机位走多少（1 = 直接到位）。eye：眼睛高度、朝玩家朝向、低头 down 度；
   * chase：玩家身后 back、高 up，看向前方 ahead 处（camera.zoom 按比例拉近 / 推远）。controls.target 放在注视点（雾、景深、粒子都按它）
   */
  private placePov(k: number) {
    const rig = this.povRig();
    if (!rig) return;
    const cs = this.charState, S = this.scratch, cam = this.persp;
    const fx = Math.sin(cs.facing), fz = Math.cos(cs.facing);
    const pos = S.a, look = S.b;
    if (rig.eye) {
      const down = Math.tan(THREE.MathUtils.degToRad(rig.eye.down ?? 0));
      // 走路时镜头轻轻起伏（motion.bob；毁灭战士式的晃，小）
      const bob = cs.moving ? Math.abs(Math.sin(cs.phase)) * 0.035 * num(this.values, 'motion.bob') : 0;
      pos.set(cs.pos.x, cs.pos.y + rig.eye.height + bob, cs.pos.z);
      look.set(pos.x + fx * 4, pos.y - down * 4, pos.z + fz * 4);
    } else {
      const ch = rig.chase!, zk = 1 / Math.max(0.6, Math.min(2, num(this.values, 'camera.zoom') || 1));
      pos.set(cs.pos.x - fx * ch.back * zk, cs.pos.y + ch.up * zk, cs.pos.z - fz * ch.back * zk);
      look.set(cs.pos.x + fx * ch.ahead, cs.pos.y + (ch.look ?? 0), cs.pos.z + fz * ch.ahead);
    }
    if (k >= 1) { cam.position.copy(pos); this.controls.target.copy(look); }
    else { cam.position.lerp(pos, k); this.controls.target.lerp(look, k); }
    cam.up.set(0, 1, 0);
    cam.lookAt(this.controls.target);
    cam.updateMatrixWorld();
  }

  /** 公告板 / 程序动画的动态组（K 轨道；换场景时挑好） */
  private props: BuiltDynamic[] = [];

  /** 程序动画（按动画时间走、可循环）与公告板（绕竖轴转到正对镜头）：每帧渲染前 */
  private stepProps(cam: THREE.Camera) {
    const t = this.stepTime, cp = cam.position;
    // anim.beatSync（节奏·音轨）：速度按 128 BPM 写，乘 motion.beat / 128；节拍相位也按 stepTime 算（ext/particles.ts），所以品格正好在拍上过判定线
    const bpm = num(this.values, 'motion.beat');
    const beatK = bpm > 0 ? bpm / 128 : 1;
    for (const d of this.props) {
      const g = d.group, o = d.object, a = g.anim;
      if (a) {
        let x = g.origin[0], y = g.origin[1], z = g.origin[2];
        if (a.v) { const tv = a.beatSync ? t * beatK : t; x += a.v[0] * tv; y += a.v[1] * tv; z += a.v[2] * tv; }
        if (a.follow) { const p = this.charState.pos; x += p.x * a.follow[0]; y += p.y * a.follow[1]; z += p.z * a.follow[2]; }
        if (a.wrap) {
          const w = a.wrap, span = Math.max(1e-6, w.hi - w.lo);
          const wr = (q: number) => w.lo + ((((q - w.lo) % span) + span) % span);
          if (w.axis === 0) x = wr(x); else if (w.axis === 1) y = wr(y); else z = wr(z);
        }
        if (a.bob) y += Math.sin(t * a.bob[1] + g.origin[0] * 1.7 + g.origin[2]) * a.bob[0];
        o.position.set(x, y, z);
        if (a.spin) o.rotation.y = a.spin * t;
      }
      if (g.billboard) o.rotation.y = Math.atan2(cp.x - o.position.x, cp.z - o.position.z);
    }
  }

  /**
   * 正交分层视差（§9.1 P1b）：正交镜头下每个深度带按「同一取景的透视镜头」换算——缩放 s = D / (D − z)，
   * 位置 = 镜头 x / y × (1 − s)，于是近大远小、远层移得慢，和透视版一模一样；像素化时每带单独对齐到像素网格（像素横版不糊）。
   * 透视或没开时深度带保持原样（透视自己就有视差）。
   */
  private placeLayers(cam: THREE.Camera) {
    const layers = this.built?.layers;
    if (!layers?.length) return;
    if (!this.parallaxOn || cam !== this.ortho) {
      for (const L of layers) { L.group.position.set(0, 0, 0); L.group.scale.set(1, 1, 1); }
      return;
    }
    // 同一取景高度 H 的透视镜头离注视平面多远：D = (H / 2) / tan(半视角)，半视角的 tan = 24 / (2 · 焦距)
    const H = this.viewHeight(cam);
    const D = (H * this.parallaxFov) / 24;
    const pix = Math.max(1, Math.round(num(this.values, 'camera.pixelSize')));
    const ppu = this.pipeline.size.y / Math.max(1e-6, H);
    const cx = cam.position.x, cy = cam.position.y;
    // 每带对齐到「渲染时」的像素网格：像素对齐开着时相机随后会吸到网格上（renderFrame），这里先按同一个式子算出吸附后的位置，
    // 每带相对它取整像素（审查修复 16：原来相对没吸附的相机取整，每帧差一个变化的小数像素，远景在像素网格上爬）
    const snapCam = pix > 1 && bool(this.values, 'camera.pixelSnap');
    const sx = snapCam ? Math.round(cx * ppu) / ppu : cx, sy = snapCam ? Math.round(cy * ppu) / ppu : cy;
    for (const L of layers) {
      const s = D / Math.max(D * 0.2, D - L.z);
      let ox = cx * (1 - s), oy = cy * (1 - s);
      if (pix > 1) { ox = sx + Math.round((ox - sx) * ppu) / ppu; oy = sy + Math.round((oy - sy) * ppu) / ppu; }
      L.group.position.set(ox, oy, 0);
      L.group.scale.set(s, s, 1);
    }
  }

  /** 每带相对吸附后相机的小数像素（开发自检：像素横版开着对齐时应该全是 0） */
  layerSnapError(): number[] {
    const cam = this.camera, layers = this.built?.layers;
    if (!layers?.length || cam !== this.ortho) return [];
    const ppu = this.pipeline.size.y / Math.max(1e-6, this.viewHeight(cam));
    const sx = Math.round(cam.position.x * ppu) / ppu;
    return layers.map((L) => { const f = (L.group.position.x - sx) * ppu; return Math.round((f - Math.round(f)) * 1000) / 1000; });
  }

  /**
   * 铺满画面的贴图（立绘背景，SceneImage.cover，审查修复 2）：按这一帧正交镜头看到的范围把背景等比放大到盖住整个画面，
   * 画框是 19.5:9、竖屏、4:3 都不露天色。只对正交平视的固定机位有意义（取景不小于 1 倍、不能平移）
   */
  private placeCovers(cam: THREE.Camera) {
    const covers = this.built?.covers;
    if (!covers?.length || cam !== this.ortho) return;
    const hw = (this.ortho.right - this.ortho.left) / 2 / this.ortho.zoom, hh = (this.ortho.top - this.ortho.bottom) / 2 / this.ortho.zoom;
    const mx = cam.position.x, my = cam.position.y;
    for (const c of covers) {
      const s = Math.max(1, (Math.abs(mx - c.cx) + hw) / (c.w / 2), (Math.abs(my - c.cy) + hh) / (c.h / 2)) * 1.002;
      c.mesh.scale.set(s * c.sx, s, 1);
    }
  }

  private updateUniforms() {
    const v = this.values;
    const pal = getPalette(str(v, 'color.palette'));
    ROLES.forEach(([role], i) => U.uRoleColors.value[i].setRGB(...hexToLinear(pal.roles[role])));
    setImageGrade(pal.roles as unknown as Record<Role, string>);
    U.uVariation.value = num(v, 'material.variation');
    U.uMatPreset.value = Math.max(0, PRESETS.indexOf(str(v, 'material.preset')));
    U.uRoughness.value = num(v, 'material.roughness');
    U.uSpecular.value = num(v, 'material.specular');
    U.uMetalness.value = num(v, 'material.metalness');
    U.uBump.value = num(v, 'material.bump');
    U.uGrain.value = num(v, 'material.grain');
    U.uModel.value = Math.max(0, MODELS.indexOf(str(v, 'shading.model')));
    U.uSteps.value = num(v, 'shading.steps');
    U.uThreshold.value = num(v, 'shading.threshold');
    U.uSoftness.value = num(v, 'shading.softness');
    U.uShadowColor.value.setRGB(...hexToLinear(str(v, 'shading.shadowColor')));
    U.uShadowTint.value = num(v, 'shading.shadowTint');
    U.uShadowDepth.value = num(v, 'shading.shadowDepth');
    U.uQuantShadow.value = bool(v, 'shading.quantizeShadow') ? 1 : 0;
    U.uAmbient.value = num(v, 'shading.ambient');
    U.uWrap.value = num(v, 'shading.wrap');
    U.uRim.value = num(v, 'shading.rim');
    U.uRimWidth.value = num(v, 'shading.rimWidth');
    U.uHighlight.value = num(v, 'shading.highlight');
    U.uHatchScale.value = num(v, 'shading.hatchScale');
    U.uHatchWorld.value = str(v, 'shading.hatchAnchor') === 'world' ? 1 : 0;
    U.uFlatMode.value = str(v, 'geometry.representation') === 'faceted' && str(v, 'geometry.normals') === 'derivative' ? 1 : 0;

    // 描边
    U.uOutlineWidth.value = bool(v, 'lines.outline') ? num(v, 'lines.outlineWidth') : 0;
    // 立绘上的墨线（整合修复 U#15）：插画没有深度 / 法线可检测，描边、内部线配方改在插画的明暗边上勾一道淡墨线
    U.uImageInk.value = bool(v, 'lines.outline') ? 0.7 : str(v, 'lines.edges') !== 'none' ? 0.55 : 0;
    U.uOutlineMode.value = ['screen', 'world', 'clamped'].indexOf(str(v, 'lines.outlineMode'));
    U.uOutlineColorMode.value = ['black', 'tinted', 'custom'].indexOf(str(v, 'lines.outlineColorMode'));
    U.uOutlineColor.value.setRGB(...hexToLinear(str(v, 'lines.outlineColor')));
    U.uOutlineRaw.value = str(v, 'lines.outlineNormals') === 'raw' ? 1 : 0;
    const scope = str(v, 'lines.outlineScope');
    const groups: Record<string, string[]> = {
      all: Object.keys(ROLE_GROUPS),
      important: ['terrain', 'vegetation', 'character'],
      characters: ['character'],
      environment: ['terrain', 'vegetation', 'architecture', 'props'],
    };
    const on = new Set<Role>((groups[scope] ?? groups.all).flatMap((g) => ROLE_GROUPS[g]));
    if (scope === 'characters') ['interactive', 'accent'].forEach((r) => on.add(r as Role));
    if (scope === 'all') ['interactive', 'accent', 'emissive', 'cloud', 'ink'].forEach((r) => on.add(r as Role));
    if (scope === 'important') on.add('interactive');
    ROLES.forEach(([role], i) => (U.uOutlineMask.value[i] = on.has(role) ? 1 : 0));
    U.uOutlineMask.value[ROLE_INDEX.ink] = 0;
    U.uOutlineTerrain.value = scope === 'characters' ? 0 : 1;

    // 阴影
    const shadowMode = ['none', 'hard', 'pcf', 'cel', 'blob'].indexOf(str(v, 'lighting.shadows'));
    U.uShadowMode.value = Math.max(0, shadowMode);
    U.uShadowRadius.value = num(v, 'lighting.shadowSoft');
    U.uShadowStrength.value = num(v, 'lighting.shadowStrength');
    const res = Number(str(v, 'lighting.shadowRes')) || 2048;
    if (this.shadowRT.width !== res) {
      this.shadowRT.dispose();
      const dt = new THREE.DepthTexture(res, res);
      this.shadowRT = new THREE.WebGLRenderTarget(res, res, { depthTexture: dt, depthBuffer: true });
      U.uShadowMap.value = dt;
    }
    U.uShadowTexel.value = 1 / res;
    U.uCloudShadow.value = num(v, 'lighting.cloudShadows');

    // 地形分带
    U.uSea.value = num(v, 'world.seaLevel');
    U.uBeach.value = num(v, 'world.beach');
    U.uHighland.value = num(v, 'world.highland');
    U.uSnow.value = num(v, 'world.snowLine');
    U.uBiomeMode.value = ['height', 'heightSlope', 'heightMoist', 'single'].indexOf(str(v, 'world.biome'));
    U.uBlendMode.value = ['face', 'hard', 'smooth'].indexOf(str(v, 'world.biomeBlend'));

    // 环境
    U.uSkyMode.value = Math.max(0, ['gradient', 'solid', 'paper', 'bands'].indexOf(str(v, 'atmosphere.sky')));
    U.uFogMode.value = Math.max(0, ['none', 'distance', 'height', 'layers'].indexOf(str(v, 'atmosphere.fog')));
    U.uFogDensity.value = num(v, 'atmosphere.fogDensity');
    U.uWind.value = num(v, 'atmosphere.wind');
    U.uSnap.value = num(v, 'camera.psx');
    U.uBendMode.value = Math.max(0, ['none', 'sphere', 'cylinder'].indexOf(str(v, 'world.curve')));
    U.uTexMode.value = Math.max(0, ['none', 'nearest', 'threePoint', 'bilinear'].indexOf(str(v, 'material.texture')));
    U.uTexScale.value = num(v, 'material.texScale');
    U.uTexAmount.value = num(v, 'material.texAmount');
    U.uAffine.value = bool(v, 'camera.affine') ? 1 : 0;
    bindAssetUniforms(v);
    U.uPaper.value.setRGB(...hexToLinear(pal.roles.paper));
    U.uInk.value.setRGB(...hexToLinear(pal.roles.ink));
    const wm = str(v, 'atmosphere.water');
    WATER_U.uWaterMode.value = Math.max(0, ['toon', 'flat', 'glossy'].indexOf(wm));
    WATER_U.uWaterOpacity.value = num(v, 'atmosphere.waterOpacity');
    WATER_U.uWaves.value = num(v, 'atmosphere.waves');
    this.water.visible = !!this.desc?.water && wm !== 'hidden';
    const weather = ['none', 'snow', 'rain', 'petals', 'dust'].indexOf(str(v, 'atmosphere.weather'));
    this.particles.visible = weather > 0;
    PARTICLE_U.uKind.value = weather;
    this.updateTimeOfDay();
  }

  /** 时间 → 太阳方向、颜色、天色、雾色、环境光、灯火 */
  private updateTimeOfDay() {
    const v = this.values;
    const pal = getPalette(str(v, 'color.palette'));
    const t = this.timeOfDay;
    const ang = ((t - 6) / 12) * Math.PI;
    const elevS = Math.sin(ang);
    const az = THREE.MathUtils.degToRad(num(v, 'lighting.azimuth')) + (t - 12) * 0.12;
    const dayK = THREE.MathUtils.smoothstep(elevS, -0.12, 0.22);
    const warmK = (1 - THREE.MathUtils.smoothstep(elevS, 0.05, 0.5)) * dayK;
    const full = str(v, 'lighting.timeLink') === 'full';
    const sunI = num(v, 'lighting.sun');
    const elev = Math.max(0.12, Math.abs(elevS)) * (Math.PI / 2.4);
    const dir = new THREE.Vector3(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
    U.uSunDir.value.copy(dir);
    const lin = (hex: string) => new THREE.Color().setRGB(...hexToLinear(hex));
    let sunCol: THREE.Color, skyTop: string, skyHor: string;
    if (full) {
      const dayCol = new THREE.Color(1, 0.97, 0.92).lerp(new THREE.Color(1.0, 0.55, 0.3), warmK);
      const moon = new THREE.Color(0.32, 0.4, 0.68).multiplyScalar(0.55);
      sunCol = moon.lerp(dayCol, dayK).multiplyScalar(sunI * (elevS > 0 ? 1 : 0.9));
      const nightTop = mixHex(pal.roles.skyTop, '#060B1E', 0.85);
      const nightHor = mixHex(pal.roles.skyHorizon, '#1B2547', 0.8);
      skyTop = mixHex(nightTop, mixHex(pal.roles.skyTop, '#6B4E9B', warmK * 0.55), dayK);
      skyHor = mixHex(nightHor, mixHex(pal.roles.skyHorizon, '#FFB37A', warmK * 0.75), dayK);
    } else {
      sunCol = new THREE.Color(1, 1, 1).multiplyScalar(sunI * (0.15 + 0.85 * dayK));
      skyTop = pal.roles.skyTop;
      skyHor = pal.roles.skyHorizon;
    }
    U.uSunColor.value.copy(sunCol);
    // 立绘 / 背景插画的时段色（审查修复 1）：白天接近原色，傍晚偏暖、夜里压暗偏蓝；「只随时段变色」时只按昼夜明暗
    const tint = this.scratch.a.set(1, 1, 1);
    if (full) tint.set(1, 0.97, 0.92).lerp(this.scratch.b.set(1.05, 0.72, 0.5), warmK).lerp(this.scratch.b.set(0.38, 0.45, 0.72), 1 - dayK);
    else tint.multiplyScalar(0.55 + 0.45 * dayK);
    U.uImageTint.value.setRGB(tint.x, tint.y, tint.z);
    U.uSkyTop.value.copy(lin(skyTop));
    U.uSkyHorizon.value.copy(lin(skyHor));
    const ambK = full ? 0.35 + 0.65 * dayK : 0.15 + 0.85 * dayK;
    U.uSkyAmb.value.copy(lin(mixHex(skyTop, '#FFFFFF', 0.45))).multiplyScalar(ambK);
    U.uGroundAmb.value.copy(lin(mixHex(pal.roles.grass, '#000000', 0.45))).multiplyScalar(ambK);
    const paperSky = str(v, 'atmosphere.sky') === 'paper';
    U.uFogColor.value.copy(paperSky ? lin(pal.roles.paper) : lin(skyHor));

    // 点光源：夜里亮
    const lights = this.desc?.lights ?? [];
    const nightK = 1 - dayK * 0.85;
    const lk = num(v, 'lighting.lanterns');
    U.uPointCount.value = Math.min(lights.length, 8);
    lights.slice(0, 8).forEach((l, i) => {
      U.uPointPos.value[i].set(...l.pos);
      U.uPointColor.value[i].copy(lin(l.color)).multiplyScalar(l.intensity * lk * (l.night ? nightK : 1));
      U.uPointRange.value[i] = l.range;
    });
  }

  private updateFog() {
    if (!this.desc) return;
    const R = this.desc.bounds.radius;
    const d = 1 - num(this.values, 'atmosphere.fogDensity');
    const D = this.camera.position.distanceTo(this.controls.target);
    const fd = this.desc.camera?.fogDist;
    if (fd) {
      // 按距离给的雾（K 轨道：长赛道、迷宫）：浓度 0.5 时正好是 [开始, 到顶]，越浓开始得越早、越快到顶
      const start = fd[0] * (0.3 + 1.4 * d);
      U.uFogRange.value.set(start, start + (fd[1] - fd[0]) * (0.4 + 1.2 * d));
      return;
    }
    const span = this.desc.camera?.fogSpan;
    if (span) {
      // 横版（§9.1）：雾从注视平面稍后开始，按深度带一层层加深；浓度越大开始得越早、越快到顶
      const start = D - 1 + span * 0.22 * d;
      U.uFogRange.value.set(start, start + span * (0.45 + d * 0.9));
      return;
    }
    const start = D + R * (-0.7 + d * 1.1);
    U.uFogRange.value.set(start, start + R * (0.5 + d * 1.6));
  }

  /** 横版自动跳的状态（null = 在地上） */
  private hop: { t: number; T: number; x0: number; y0: number; dx: number; vy: number; y1: number } | null = null;

  /**
   * 横版自动跳（审查修复 20）：往 sign 方向找 0.6 ~ 4.4 内第一个能站稳的落点（落点和它再往前 0.3 都是地面、比现在高不超过 2.6），
   * 找到就按抛物线跳过去：滞空时间随距离 0.45 ~ 0.85 秒，水平匀速——速度慢的配方也跳得过坑。找不到返回 false（照旧挡住）
   */
  private startHop(sign: number, speed: number): boolean {
    const g = this.desc?.ground, cs = this.charState;
    if (!g || !sign) return false;
    for (let d = 0.6; d <= 4.4; d += 0.2) {
      const x = cs.pos.x + sign * d;
      if (!g.inside(x, cs.pos.z) || !g.inside(x + sign * 0.3, cs.pos.z)) continue;
      const y1 = g.heightAt(x + sign * 0.3, cs.pos.z);
      if (y1 - cs.pos.y > 2.6) return false;
      if (Math.abs(g.heightAt(x, cs.pos.z) - cs.pos.y) <= 0.35 && d < 0.8) return false;
      const dx = sign * (d + 0.3), T = Math.max(0.45, Math.min(0.85, Math.abs(dx) / Math.max(speed, 4)));
      this.hop = { t: 0, T, x0: cs.pos.x, y0: cs.pos.y, dx, y1, vy: (y1 - cs.pos.y + 0.5 * HOP_G * T * T) / T };
      return true;
    }
    return false;
  }

  private stepCharacter(dt: number) {
    if (!this.character || !this.desc) return;
    const v = this.values;
    const cs = this.charState;
    const walk = str(v, 'game.controls') === 'walk';
    // 横版（rig 只沿 x 跟拍）：角色夹在自己的平面上，只能左右走（§9.1）
    const sideOnly = this.desc.camera?.followAxis === 'x';
    const dir = new THREE.Vector3();
    const steer = this.desc.camera?.steer;
    if (steer) {
      // 车 / 坦克式操作（K 轨道）：A / D 原地转向，W / S 沿朝向进退；撞墙时贴着墙滑
      const p = this.pressed;
      const fwd = walk ? (p.has('w') || p.has('arrowup') ? 1 : 0) - (p.has('s') || p.has('arrowdown') ? 1 : 0) : 0;
      const turn = walk ? (p.has('a') || p.has('arrowleft') ? 1 : 0) - (p.has('d') || p.has('arrowright') ? 1 : 0) : 0;
      cs.facing += turn * (steer.turn ?? 1.8) * dt;
      cs.moving = fwd !== 0;
      if (fwd !== 0 && dt > 0) {
        const sp = num(v, 'motion.speed') * (steer.speed ?? 1) * fwd * dt;
        const nx = cs.pos.x + Math.sin(cs.facing) * sp, nz = cs.pos.z + Math.cos(cs.facing) * sp;
        const ok = (x: number, z: number) => (this.desc!.terrain ? this.desc!.terrain.inside(x, z) : this.desc!.ground ? this.desc!.ground.inside(x, z) : Math.hypot(x, z) < this.desc!.bounds.radius * 0.7);
        if (ok(nx, nz)) { cs.pos.x = nx; cs.pos.z = nz; } else if (ok(nx, cs.pos.z)) cs.pos.x = nx; else if (ok(cs.pos.x, nz)) cs.pos.z = nz;
        cs.phase += dt * Math.abs(num(v, 'motion.speed') * (steer.speed ?? 1)) * 0.6;
      }
    } else if (walk) {
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
      fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      const p = this.pressed;
      if (!sideOnly && (p.has('w') || p.has('arrowup'))) dir.add(fwd);
      if (!sideOnly && (p.has('s') || p.has('arrowdown'))) dir.sub(fwd);
      if (p.has('d') || p.has('arrowright')) dir.add(right);
      if (p.has('a') || p.has('arrowleft')) dir.sub(right);
    }
    if (!steer) cs.moving = dir.lengthSq() > 0;
    const terrain = this.desc.terrain;
    const hop = this.hop;
    if (steer) {
      // 上面已经走完
    } else if (sideOnly && hop) {
      // 横版自动跳（审查修复 20）：起跳后按抛物线飞到落点，途中不受按键影响
      hop.t = Math.min(hop.T, hop.t + dt);
      cs.pos.x = hop.x0 + (hop.dx * hop.t) / hop.T;
      cs.pos.y = hop.y0 + hop.vy * hop.t - 0.5 * HOP_G * hop.t * hop.t;
      cs.moving = true;
      cs.phase += dt * 6;
      if (hop.t >= hop.T) { cs.pos.y = hop.y1; this.hop = null; }
    } else if (cs.moving) {
      dir.normalize();
      const speed = num(v, 'motion.speed');
      const nx = cs.pos.x + dir.x * speed * dt, nz = cs.pos.z + dir.z * speed * dt;
      let ok = true;
      if (terrain) {
        ok = terrain.inside(nx, nz) && terrain.surfaceAt(nx, nz) > terrain.seaY - 0.35;
      } else if (this.desc.ground) {
        ok = this.desc.ground.inside(nx, nz);
        // 横版：前面是坑或高过半个身子的台阶时自动跳过去（原来坑过不去，默认种子下只能在一屏宽里走，审查修复 20）
        if (sideOnly && dt > 0 && (!ok || this.desc.ground.heightAt(nx, nz) - cs.pos.y > 0.35) && this.startHop(Math.sign(dir.x), speed)) ok = false;
      } else {
        ok = Math.hypot(nx, nz) < this.desc.bounds.radius * 0.7;
      }
      if (ok) { cs.pos.x = nx; cs.pos.z = nz; }
      // 平移不转身（DynamicGroup.strafe：竖版射击的自机）
      if (!this.character.group.strafe) {
        const target = Math.atan2(dir.x, dir.z);
        let dA = target - cs.facing;
        dA = Math.atan2(Math.sin(dA), Math.cos(dA));
        cs.facing += dA * Math.min(1, dt * 12);
      }
      cs.phase += dt * speed * 2.2;
    }
    const gy = terrain ? terrain.surfaceAt(cs.pos.x, cs.pos.z) : this.desc.ground ? this.desc.ground.heightAt(cs.pos.x, cs.pos.z) : 0;
    // 横版走下平台边缘时落下去（上台阶照旧一步上去）；同步截图（dt = 0）直接落到位；跳的途中按抛物线
    if (!(sideOnly && this.hop)) cs.pos.y = sideOnly && gy < cs.pos.y && dt > 0 ? Math.max(gy, cs.pos.y - Math.max(0.05, (cs.pos.y - gy) * Math.min(1, dt * 10))) : gy;
    const o = this.character.object;
    const fr = str(v, 'motion.frameRate');
    const ph = fr === 'smooth' ? cs.phase : Math.floor(cs.phase * (Number(fr) / 8)) / (Number(fr) / 8);
    // 自带身体（赛车、飞船，K 轨道）不做走路起伏 / 挤压，也不让角色载体精灵接管；第一人称不画玩家
    const fb = this.character.group.fixedBody, body = !fb, eye = !!this.desc.camera?.eye;
    // 起伏 / 挤压：普通角色和 fixedBody = 'keepBob'（纸片人）照常，车、飞船（fixedBody = true）不做
    const sway = !fb || fb === 'keepBob';
    const bob = cs.moving && sway ? Math.abs(Math.sin(ph)) * 0.09 * num(v, 'motion.bob') : 0;
    const sq = cs.moving && sway ? Math.sin(ph * 2) * 0.1 * num(v, 'motion.squash') : 0;
    o.position.set(cs.pos.x, cs.pos.y + bob, cs.pos.z);
    o.rotation.y = cs.facing;
    // 场景要求放大角色（正俯视的竞技场里角色只剩一个点，审查修复 12）
    const ps = this.desc.playerScale ?? 1;
    o.scale.set((1 - sq * 0.5) * ps, (1 + sq) * ps, (1 - sq * 0.5) * ps);
    // 像素精灵 / 纸片人接管角色时隐藏三维模型；特效跟着角色
    o.visible = !this.sprites.update(v, cs, this.camera, ph, this.simTime, body && !eye) && !eye;
    U.uBlob.value.set(cs.pos.x, cs.pos.y, cs.pos.z, str(v, 'lighting.shadows') === 'blob' ? 0.55 : 0);
  }

  private stepClouds(dt: number) {
    if (!this.built) return;
    const drift = num(this.values, 'atmosphere.cloudDrift');
    for (const d of this.built.dynamics) {
      if (d.group.kind !== 'cloud') continue;
      const range = d.group.data?.range ?? 30;
      const sp = d.group.data?.speed ?? 0.5;
      const p = d.object.position;
      p.x += sp * drift * dt * 1.5;
      if (p.x > range) p.x = -range;
    }
  }

  private loop() {
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    const fullDt = this.clock.getDelta();
    this.watchFrameTime(fullDt);
    const rawDt = Math.min(0.05, fullDt);
    const dt = this.frozen ? 0 : rawDt;
    const v = this.values;
    if (!this.desc) return;
    this.simTime += dt;
    // 抽帧：环境动画按节拍更新
    const fr = str(v, 'motion.frameRate');
    if (fr === 'smooth') this.stepTime = this.simTime;
    else {
      const fps = Number(fr);
      const s = Math.floor(this.simTime * fps);
      if (s !== this.lastStep) { this.lastStep = s; this.stepTime = s / fps; }
    }
    U.uTime.value = this.simTime;
    U.uAnimTime.value = this.stepTime;
    if (bool(v, 'lighting.cycle') && !this.frozen) {
      this.timeOfDay = (this.timeOfDay + dt * num(v, 'lighting.cycleSpeed')) % 24;
      this.updateTimeOfDay();
    }
    this.stepCharacter(dt);
    if (fr === 'smooth' || this.stepTime !== U.uTime.value) this.stepClouds(fr === 'smooth' ? dt : dt);

    const pov = this.povRig();
    if (pov) {
      // 第一人称 / 追尾镜头（K 轨道）：引擎自己摆，不经过 OrbitControls；第一人称直接到位，追尾按 lag 慢慢甩过去
      this.placePov(pov.eye ? 1 : 1 - Math.exp(-rawDt * (pov.chase?.lag ?? 6)));
    } else {
      // 跟随（固定机位的 2D 场景不跟，审查修复 19）
      if (this.following()) {
        const want = this.followPoint();
        const delta = want.sub(this.controls.target).multiplyScalar(Math.min(1, rawDt * 5));
        this.controls.target.add(delta);
        this.camera.position.add(delta);
      }
      this.controls.update(rawDt);
    }
    this.updateFog();
    PARTICLE_U.uCenter.value.copy(this.controls.target);
    const R = this.desc.bounds.radius;
    PARTICLE_U.uBox.value.set(R * 1.6, 14, R * 1.6);
    PARTICLE_U.uPointScale.value = this.renderer.getPixelRatio() / Math.max(1, num(v, 'camera.pixelSize'));

    this.frameDt = dt;
    this.renderFrame();
  }

  private renderFrame() {
    const r = this.renderer;
    r.info.reset();
    const v = this.values;
    // 公告板转向镜头、程序动画（K 轨道；没有这类动态组的场景直接跳过）
    if (this.props.length) this.stepProps(this.camera);
    runEngineExt('onFrame', this.extCtx());
    // 1 阴影
    const shadows = U.uShadowMode.value;
    if (shadows > 0 && shadows < 4 && this.desc) {
      // rig.shadowFollow（K 轨道的长赛道）：阴影只罩住注视点周围
      const sf = this.desc.camera?.shadowFollow;
      const c = sf ? this.controls.target.clone() : new THREE.Vector3(...this.desc.bounds.center);
      const R = sf ?? this.desc.bounds.radius;
      this.shadowCam.position.copy(c).addScaledVector(U.uSunDir.value, R * 2);
      this.shadowCam.lookAt(c);
      this.shadowCam.updateMatrixWorld();
      // 对齐阴影贴图纹素，减少移动时的闪烁
      U.uShadowMatrix.value.multiplyMatrices(this.shadowCam.projectionMatrix, this.shadowCam.matrixWorldInverse);
      U.uShadowBias.value = 0.0006 + (str(v, 'lighting.shadows') === 'hard' ? 0.0004 : 0.0008);
      this.scene.overrideMaterial = this.depthMat;
      const skyVis = this.sky.visible;
      r.setRenderTarget(this.shadowRT);
      r.setClearColor(0xffffff, 1);
      r.clear();
      r.render(this.scene, this.shadowCam);
      this.scene.overrideMaterial = null;
      this.sky.visible = skyVis;
    }
    // 2 主场景 → MRT
    const cam = this.camera;
    // 正交分层视差：每个深度带按镜头位置缩放、平移（像素化时每带对齐像素）。阴影已经按上一帧的位置画了，差一帧看不出来
    this.placeLayers(cam);
    this.placeCovers(cam);
    const pix = Math.max(1, Math.round(num(v, 'camera.pixelSize')));
    let restore: THREE.Vector3 | null = null;
    if (pix > 1 && bool(v, 'camera.pixelSnap') && cam === this.ortho) {
      // 像素对齐：把相机吸附到一个"渲染像素"的世界尺寸网格上
      restore = cam.position.clone();
      const ppu = this.pipeline.size.y / ((this.ortho.top - this.ortho.bottom) / this.ortho.zoom);
      cam.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const pr = cam.position.dot(right), pu = cam.position.dot(up);
      cam.position.addScaledVector(right, Math.round(pr * ppu) / ppu - pr);
      cam.position.addScaledVector(up, Math.round(pu * ppu) / ppu - pu);
      cam.updateMatrixWorld();
    }
    // 手持晃动：渲染前给相机加一点平滑噪声位移，渲染后还原（不影响操控）
    const shake = num(v, 'camera.shake');
    if (shake > 0) {
      restore ??= cam.position.clone();
      const t = this.simTime;
      const amp = shake * this.viewSize * 0.006;
      cam.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      cam.position.addScaledVector(right, (Math.sin(t * 1.3) + Math.sin(t * 2.9 + 2) * 0.5 + Math.sin(t * 7.1) * 0.15) * amp);
      cam.position.addScaledVector(up, (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.7) * 0.4 + Math.sin(t * 8.3 + 3) * 0.15) * amp);
      cam.updateMatrixWorld();
    }
    // 世界弯曲：以镜头注视点为中心；强度按当前看得到的世界高度换算，缩放时手感一致
    if (U.uBendMode.value > 0) {
      const viewH = cam === this.ortho
        ? (this.ortho.top - this.ortho.bottom) / this.ortho.zoom
        : 2 * Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2)) * cam.position.distanceTo(this.controls.target);
      U.uBend.value = (num(v, 'world.curveAmount') * 0.8) / Math.max(1, viewH);
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      const h = Math.hypot(fwd.x, fwd.z);
      U.uBendAxis.value.set(h > 1e-4 ? fwd.x / h : 0, h > 1e-4 ? fwd.z / h : 1);
      U.uBendCenter.value.copy(this.controls.target);
      if (U.uBendMode.value === 2) {
        // 滚筒：弯曲起点放在画面下沿附近
        U.uBendCenter.value.x -= U.uBendAxis.value.x * viewH * 0.5;
        U.uBendCenter.value.z -= U.uBendAxis.value.y * viewH * 0.5;
      }
    }
    r.setRenderTarget(this.pipeline.sceneRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, cam);
    // 后处理需要的相机信息（以实际渲染时的相机为准）
    cam.updateMatrixWorld();
    const sunP = cam.position.clone().addScaledVector(U.uSunDir.value, 500).project(cam);
    const sunOn = sunP.z < 1 && Math.abs(sunP.x) < 1.6 && Math.abs(sunP.y) < 1.6 && U.uSunDir.value.y > 0.02;
    const invViewProj = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
    const camPos = cam.position.clone();
    const camRight = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const focusDist = cam.position.distanceTo(this.controls.target);
    const viewHalf: [number, number] = cam === this.ortho
      ? [(this.ortho.right - this.ortho.left) / 2 / this.ortho.zoom, (this.ortho.top - this.ortho.bottom) / 2 / this.ortho.zoom]
      : [Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2)) * this.persp.aspect, Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2))];
    // 游戏 UI 样本：画在画布纹理上，OUTPUT 合成（只有参数或尺寸变化时重画）
    const lb = str(v, 'camera.letterbox') === 'none' ? 0 : Number(str(v, 'camera.letterbox'));
    // HUD 模拟时钟（M5b）：冻结 / 同步截图时不走；重放时从 0 开始；慢放按倍率
    if (HUD_SIM.resetTo !== null) { HUD_SIM.clock = HUD_SIM.resetTo; HUD_SIM.resetTo = null; }
    HUD_SIM.clock += this.frameDt * HUD_SIM.scale;
    this.world = this.buildWorldView(cam);
    const hudFrame = this.hud.update(v, this.cssW, this.cssH, r.domElement.width, r.domElement.height, lb, HUD_SIM.clock, HUD_SIM.events, this.hudAB, this.world);
    this.pipeline.deviceLetterbox = hudFrame ? this.hud.deviceLetterbox : 0;
    // 叙事内 UI：板子跟着 HUD 重画重建，每帧放到挂点（这一帧画面里没有它们，下一帧起出现——参数改动后的第一帧差一帧可以接受）
    if (this.diegetic.group.parent !== this.scene) this.scene.add(this.diegetic.group);
    const wpp = (cam === this.ortho
      ? (this.ortho.top - this.ortho.bottom) / this.ortho.zoom
      : 2 * Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2)) * cam.position.distanceTo(this.controls.target)) / Math.max(1, this.cssH);
    this.diegetic.sync(this.hud.diegetic, this.hud.diegeticVersion, wpp);
    const head = this.character ? this.charState.pos.clone().add(new THREE.Vector3(0, 2.1, 0)) : this.controls.target.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.diegetic.place((it) => {
      const w = this.world;
      const fromPt = (q: { wp?: [number, number, number] } | null | undefined, up = 0.35) => (q?.wp ? new THREE.Vector3(q.wp[0], q.wp[1] + up, q.wp[2]) : null);
      if (it.mode === 'decal') return this.character ? this.charState.pos.clone().add(new THREE.Vector3(Math.sin(this.charState.facing) * 1.4, 0.02, Math.cos(this.charState.facing) * 1.4)) : this.controls.target.clone();
      if (it.attach === 'poi') return fromPt(w?.poi);
      if (it.attach === 'target') return fromPt(w?.target);
      return head;
    }, cam);
    this.pipeline.hud = this.noHud ? null : hudFrame;
    // 3 后处理（相机仍停在晃动 / 像素对齐后的位置：物体空间笔触要用渲染时的同一个相机投影）
    this.pipeline.render({
      near: cam.near,
      far: cam.far,
      ortho: cam === this.ortho,
      time: this.simTime,
      stepTime: this.stepTime,
      dt: this.frameDt,
      capture: this.capturing,
      sun: sunOn ? [sunP.x * 0.5 + 0.5, sunP.y * 0.5 + 0.5] : null,
      invViewProj,
      camPos,
      camRight,
      camUp,
      focusDist,
      viewHalf,
      camera: cam,
    });
    if (restore) {
      cam.position.copy(restore);
      cam.updateMatrixWorld();
    }
    if (this.captureResolve.length) {
      const url = r.domElement.toDataURL('image/png');
      this.captureResolve.splice(0).forEach((f) => f(url));
    }
    // 统计
    const now = performance.now();
    this.fpsAcc.n++;
    if (now - this.fpsAcc.t > 500) {
      this.fpsAcc.fps = (this.fpsAcc.n * 1000) / (now - this.fpsAcc.t);
      this.fpsAcc.t = now;
      this.fpsAcc.n = 0;
      const s = this.pipeline.size;
      this.onStats?.({ fps: this.fpsAcc.fps, triangles: this.built?.triangles ?? 0, calls: r.info.render.calls, timeOfDay: this.timeOfDay, internal: [s.x, s.y], hudMs: this.pipeline.hud ? this.hud.lastDrawMs : null });
    }
  }

  /** 截取下一帧画面 */
  capture(): Promise<string> {
    return new Promise((res) => this.captureResolve.push(res));
  }

  /** 立即同步渲染一帧并返回 PNG（页面不可见、rAF 暂停时也能用，用于视觉回归） */
  /**
   * 世界坐标 → 画布 CSS 像素（M6）：与渲染完全同一套变换——世界弯曲（applyBend 的 JS 版）→ 当前相机（含晃动、像素对齐）
   * → 顶点吸附（camera.psx）→ 镜头畸变的反函数。CRT 弯曲不用补：HUD 在 OUTPUT 里和画面用同一个 uv 一起弯。
   */
  projectWorld(p: THREE.Vector3, cam: THREE.Camera = this.camera): ScreenPt {
    const w = p.clone();
    const mode = U.uBendMode.value;
    if (mode > 0) {
      const dx = w.x - U.uBendCenter.value.x, dz = w.z - U.uBendCenter.value.z;
      const ahead = Math.max(dx * U.uBendAxis.value.x + dz * U.uBendAxis.value.y, 0);
      w.y -= U.uBend.value * (mode === 1 ? dx * dx + dz * dz : ahead * ahead);
    }
    const depth = -w.clone().applyMatrix4(cam.matrixWorldInverse).z;
    const ndc = w.project(cam);
    const snap = U.uSnap.value;
    if (snap > 0) {
      const g = U.uResolution.value.y * 0.25 + (40 - U.uResolution.value.y * 0.25) * snap;
      ndc.x = Math.floor(ndc.x * g + 0.5) / g;
      ndc.y = Math.floor(ndc.y * g + 0.5) / g;
    }
    const [ox, oy] = lensInverse(ndc.x, ndc.y, num(this.values, 'camera.lens'));
    const cw = this.cssW, ch = this.cssH;
    const on = depth > 0 && Math.abs(ox) <= 1 && Math.abs(oy) <= 1;
    const sgn = depth > 0 ? 1 : -1;
    const len = Math.hypot(ox, oy) || 1;
    return { x: (ox * 0.5 + 0.5) * cw, y: (0.5 - oy * 0.5) * ch, depth, on, dir: [(sgn * ox) / len, (-sgn * oy) / len] };
  }

  private buildWorldView(cam: THREE.Camera): WorldView | null {
    const desc = this.desc;
    if (!desc) return null;
    const v = this.values;
    // 玩家：可操控角色的胸口；没有角色的场景（立绘、卡牌）用场景给的挂点
    const pa = desc.playerAnchor, S = this.scratch;
    const player = this.character ? this.projectWorld(S.d.copy(this.charState.pos).setY(this.charState.pos.y + 1.4), cam) : pa ? { ...this.projectWorld(S.d.set(pa[0], pa[1], pa[2]), cam), wp: pa } : null;
    const anchor = this.character ? this.charState.pos : pa ? S.c.set(pa[0], pa[1], pa[2]) : this.controls.target;
    // 横版按 x / y 量距离（角色和别人不在同一个 z 上也算近）
    const side = desc.camera?.followAxis === 'x';
    const all = this.pois.map((q) => ({ ...this.projectWorld(S.d.set(q.pos[0], q.pos[1], q.pos[2]), cam), kind: q.kind, label: q.label, wd: side ? Math.abs(q.pos[0] - anchor.x) : Math.hypot(q.pos[0] - anchor.x, q.pos[2] - anchor.z), wp: q.pos }));
    type Q = (typeof all)[number];
    // 一遍线性扫描取最小（不排序、不建中间数组）
    const pick = (ok: (q: Q) => boolean, score: (q: Q) => number): Q | undefined => {
      let best: Q | undefined, bs = Infinity;
      for (const q of all) { if (!ok(q)) continue; const s = score(q); if (s < bs) { bs = s; best = q; } }
      return best;
    };
    const byDist = (q: Q) => q.wd;
    // 交互点：最近的交互物（含场景写明的 NPC / 拾取物 / 目标点）；没有时退到最近的灯，再退到地标
    const inter = pick((q) => INTERACT_KINDS.includes(q.kind), byDist) ?? pick((q) => q.kind === 'light', byDist) ?? pick((q) => q.kind === 'landmark', byDist);
    const cw = this.cssW, ch = this.cssH;
    // 目标（RC8：头顶血条、伤害数字挂在真的敌人身上）：画面上的敌人 / Boss 里离中心最近的 → 画面外离玩家最近的敌人（on = false，HUD 按屏外处理）→ 没有（审查修复 9 / 23：
    // 不再退到灯、地标、NPC、友方、拾取物——敌人血条挂在灯柱或友方身上比不画更糟；null 时 HUD 用画面上的近似位置）
    const target = pick((q) => TARGET_KINDS.includes(q.kind) && q.on, (q) => Math.hypot(q.x - cw / 2, q.y - ch / 2)) ?? pick((q) => TARGET_KINDS.includes(q.kind), byDist) ?? null;
    // 小地图：底图按场景 + 画风 + 色板缓存；玩家走过的地方记为已探索
    // 用本帧的参数解析（hud.resolved 是上一帧的：换了地图画风后第一帧——包括同步截图——会烘出旧画风）；resolveUi 按参数对象缓存，随后 hud.update 直接命中
    const style = resolveUi(hudValues(v, HUD_SIM.clock, SELECTORS.screen).v).str('vis.mapStyle', 'flatVector');
    const palName = str(v, 'color.palette');
    // 羊皮纸 / 手绘底图是异步加载的位图：键里带上素材版本，加载完后重烘
    const key = `${str(v, 'game.scene')}|${num(v, 'game.seed')}|${style}|${palName}|${minimapArtKey(style)}`;
    if (!this.mapCache || this.mapCache.key !== key) this.mapCache = { key, canvas: bakeMinimap(desc, getPalette(palName).roles as unknown as Record<string, string>, style === 'auto' ? 'flatVector' : style) };
    const pu = mapUVOf(desc, anchor.x, anchor.y, anchor.z);
    this.explored.mark(pu[0], pu[1]);
    return {
      player,
      poi: inter ? { ...inter, dist: inter.wd } : null,
      target,
      all,
      grid: desc.grid ? this.projectGrid(desc.grid, anchor, cam) : undefined,
      // 小地图的兴趣点按「任务」顺序（目标点 / 宝箱 / 拾取物 / NPC 在前，敌人在后）：HUD 的任务路线取 pois[0]（审查修复 24）
      map: { canvas: this.mapCache.canvas, player: pu, pois: this.mapPois(desc), heading: this.mapHeading(), explored: this.explored.cells, en: this.explored.n },
      // 世界地图界面按自己的尺寸 / 画风 / 颜色单独烘焙（M12a-30），按（场景, 画风, 尺寸, 颜色）缓存
      bake: (st, size, colors) => bakeCached(`${str(v, 'game.scene')}|${num(v, 'game.seed')}|${palName}|${minimapArtKey(st)}|${st}|${size}|${colors ? `${colors.bg},${colors.ink}` : ''}`,
        () => bakeMinimap(desc, getPalette(palName).roles as unknown as Record<string, string>, st === 'auto' ? 'flatVector' : st, size, colors)),
      refDepth: player?.depth ?? (inter?.depth ?? 10),
    };
  }

  /**
   * 小地图朝向：HUD 把箭头（默认朝上）转 −heading、「车头朝上」时把地图转 +heading；地图上 +z 向下、+x 向右，
   * 角色朝向 facing = atan2(dx, dz)（0 = 朝 +z），所以 heading = facing + π 时箭头才指向角色面朝的方向（原来差了半圈）。侧视地图 +x 向右，同一个式子
   */
  private mapHeading(): number {
    const h = this.charState.facing + Math.PI;
    return Math.atan2(Math.sin(h), Math.cos(h));
  }

  /**
   * 棋盘格子投到画面上（§9.1：导出给 HUD，移动范围对齐地面）：玩家脚下那一格（夹在棋盘内）的中心，加沿两条格轴各走一格的画面位移。
   * 正交镜头下位移处处一样；透视时取这一格附近的（够 HUD 画几格的范围用）
   */
  private projectGrid(g: SceneGrid, anchor: THREE.Vector3, cam: THREE.Camera): WorldGrid {
    const G = this.gridScratch, o = G.o.set(...g.origin), a = G.a.set(...g.axes[0]).normalize(), b = G.b.set(...g.axes[1]).normalize();
    const rel = G.c.copy(anchor).sub(o);
    const i = Math.max(0, Math.min(g.size[0] - 1, Math.round(rel.dot(a) / g.cell)));
    const j = Math.max(0, Math.min(g.size[1] - 1, Math.round(rel.dot(b) / g.cell)));
    const c = G.c.copy(o).addScaledVector(a, i * g.cell).addScaledVector(b, j * g.cell);
    const P = this.projectWorld(c, cam);
    const Pu = this.projectWorld(G.p.copy(c).addScaledVector(a, g.cell), cam), Pv = this.projectWorld(G.p.copy(c).addScaledVector(b, g.cell), cam);
    return { o: { ...P, wp: [c.x, c.y, c.z] }, u: [Pu.x - P.x, Pu.y - P.y], v: [Pv.x - P.x, Pv.y - P.y], at: [i, j], size: g.size };
  }
  private gridScratch = { o: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3() };

  /** 小地图兴趣点（静态：换场景时算一次）：按任务顺序排，HUD 的任务路线取第一个 */
  private mapPoiList: { uv: [number, number]; kind: Poi['kind'] }[] = [];
  private mapPois(desc: SceneDesc) {
    if (!this.mapPoiList.length && this.pois.length) this.mapPoiList = questOrder(this.pois).map((q) => ({ uv: mapUVOf(desc, q.pos[0], q.pos[1], q.pos[2]), kind: mapKindOf(q.kind) }));
    return this.mapPoiList;
  }

  /**
   * 可读性检查（M8a）：渲染一帧不含 UI 的画面，缩到 w 宽读回像素；随后马上再渲染一帧带 UI 的，画面不会闪。
   */
  sampleScene(w = 192): { data: Uint8ClampedArray; w: number; h: number; cssW: number; cssH: number } | null {
    const c = this.renderer.domElement;
    if (!c.width || !c.height) return null;
    this.noHud = true;
    this.capturing = true;
    this.frameDt = 0;
    this.renderFrame();
    const h = Math.max(1, Math.round((w * c.height) / c.width));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(c, 0, 0, w, h);
    this.noHud = false;
    this.renderFrame();
    this.capturing = false;
    return { data: g.getImageData(0, 0, w, h).data, w, h, cssW: this.cssW, cssH: this.cssH };
  }

  /**
   * 按指定尺寸同步渲一帧（§10「截图：只截画框，1920×1080」；缩略图 / 色板烘焙也能用）：画框当作 w × h 的 CSS 尺寸、像素比 1，
   * 画面与 HUD 都按这个尺寸排（HUD 的 unitK = w / 960），渲完立即还原。不改 DOM、不触发 ResizeObserver，页面上的画框不会闪。
   */
  captureFrame(w = 1920, h = 1080, steps = 2): string {
    const prevDpr = this.renderer.getPixelRatio();
    // 跟拍的镜头（技术补全 H 的请求）：换了画框比例，取景大小（内容框）和跟拍的注视点（关卡两端、地图范围按画面宽夹）都会变——
    // resize 里的 reframeFollow 按这个比例重摆，截完把镜头原样放回
    const saved = { pos: this.camera.position.clone(), target: this.controls.target.clone() };
    this.sizeOverride = { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
    this.renderer.setPixelRatio(1);
    this.resize();
    let url = '';
    try { url = this.renderSync(steps); } finally {
      this.sizeOverride = null;
      this.renderer.setPixelRatio(prevDpr);
      this.resize();
      if (!this.povRig()) {
        this.camera.position.copy(saved.pos);
        this.controls.target.copy(saved.target);
        this.camera.lookAt(this.controls.target);
        this.camera.updateMatrixWorld();
      }
      // 还原后的画布是空的：立刻补画一帧（后台标签页不跑 rAF 时也不会留白）
      this.frameDt = 0;
      this.renderFrame();
    }
    return url;
  }

  /**
   * 换画框比例后把跟拍的镜头摆到「这个比例下实时画面会停的地方」（resize 调，captureFrame 换比例也走这里）：锁定的透视 rig 按新的取景距离缩放镜头离注视点的距离
   *（保留滚轮缩放的倍数），再把注视点挪到 followPoint（关卡两端 / 地图范围按新的画面宽夹）。固定机位由 configureCamera 的内容框处理；
   * 3D 场景的自由环绕、第一人称 / 追尾镜头不动
   */
  private reframeFollow(prevDist: number, prevLen: number) {
    if (this.povRig() || !this.following()) return;
    const cam = this.camera, t = this.controls.target, rig = this.desc?.camera;
    if (rig?.lockOrbit && cam === this.persp && prevDist > 0 && prevLen > 0 && Math.abs(this.camDist - prevDist) > 1e-6) {
      const off = this.scratch.d.copy(cam.position).sub(t);
      off.setLength(this.camDist * (prevLen / prevDist));
      cam.position.copy(t).add(off);
    }
    const want = this.followPoint();
    const dx = want.x - t.x, dy = want.y - t.y, dz = want.z - t.z;
    t.set(want.x, want.y, want.z);
    cam.position.x += dx; cam.position.y += dy; cam.position.z += dz;
    cam.lookAt(t);
    cam.updateMatrixWorld();
  }

  renderSync(steps = 2): string {
    this.capturing = true;
    for (let i = 0; i < steps; i++) {
      // 同步截图不推进时间：自动曝光每一步都直接对准，截图是收敛后的样子
      this.frameDt = 0;
      if (this.povRig()) {
        // 第一人称 / 追尾镜头（K 轨道）：先落好角色，再把镜头直接摆到位
        this.stepCharacter(0);
        this.placePov(1);
        this.updateFog();
      } else {
        this.controls.update(0.016);
        this.updateFog();
        this.stepCharacter(0);
      }
      this.renderFrame();
    }
    this.capturing = false;
    // 截图 / 扫描缩略图会把自动曝光对准到别的参数组合；下一帧实时画面重新直接对准，避免从缩略图的亮度慢慢漂回来
    this.pipeline.snapExposure();
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const e of engineExts()) { try { e.onDispose?.(); } catch (err) { console.error(err); } }
    // 只清自己登记的（热替换时新引擎可能已经先登记了）
    if (sceneSource() === this) { setSceneSource(null); registerSceneSampler(null); }
    this.resizeObs.disconnect();
    this.dpr.mq?.removeEventListener('change', this.dpr.onMq);
    this.built?.dispose();
    this.sprites.dispose();
    this.hud.dispose();
    this.pipeline.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
