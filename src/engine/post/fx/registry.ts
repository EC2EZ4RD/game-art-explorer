import type * as THREE from 'three';
import type { Palette } from '../../../content/palettes';
import type { Values } from '../../../dims/types';
import type { FullscreenPass } from '../FullscreenPass';
import type { PostFrame } from '../Pipeline';
import { POST_HEAD, POST_LIB } from '../postGlsl';
import { ROLE_INDEX } from '../../../content/roles';

/*
 * 后处理扩展（2026-10-23 技术补全）：新的后处理效果写在 fx/ 下各自的文件里，用 registerFx 登记，
 * Pipeline 在固定的几个阶段按 order 调用，不用改 Pipeline.ts 本身。
 *
 * 阶段（与 Pipeline.ts 顶部注释的顺序对应）：
 *   linear        体积光之后、自动曝光之前（输入输出都是线性 HDR）
 *   graded        调色 + 景深之后、媒介之前（显示空间；改写的结果会作为后面媒介的「原画」）
 *   medium        surface.medium 的取值 = def.medium 时代替内置媒介（内置媒介没有这个取值才会走到这里）
 *   afterStrokes  物体空间笔触之后、内部线之前
 *   afterEdges    内部线之后、限色之前
 *   afterQuantize 限色之后、移轴之前
 *   afterOverlay  纸纹 / 颗粒 / 暗角之后、镜头畸变之前
 *   final         录像带 / 压缩噪点之后、输出之前（画幅黑边、HUD 还没画）
 * 迁移到 Godot：每个 fx 仍是一个全屏 pass，按同样的阶段顺序插进后处理链。
 */

export type FxStage = 'linear' | 'graded' | 'medium' | 'afterStrokes' | 'afterEdges' | 'afterQuantize' | 'afterOverlay' | 'final';

export interface FxCtx {
  renderer: THREE.WebGLRenderer;
  values: Values;
  frame: PostFrame;
  palette: Palette;
  /** 色板的纸色 / 墨色（显示空间） */
  paper: THREE.Color;
  ink: THREE.Color;
  /** 本阶段的输入画面 */
  input: THREE.Texture;
  /** 场景原图（线性 HDR） */
  scene: THREE.Texture;
  /** 调色后、媒介之前的画面（linear 阶段为 null） */
  graded: THREE.Texture | null;
  /** 法线缓冲：rgb = 视空间法线 × 0.5 + 0.5，a = 角色编号 / 64（见 FX_HEAD 的 roleAt） */
  normal: THREE.Texture;
  depth: THREE.Texture;
  /** 内部渲染分辨率（像素化时是低分辨率） */
  res: THREE.Vector2;
  /** 像素化（camera.pixelSize > 1，纹理是最近邻过滤） */
  pixelated: boolean;
  /** 半分辨率两轮可分离模糊（结果是共用缓冲：在下一次 blur 之前用完） */
  blur(src: THREE.Texture, radius: number): THREE.Texture;
  /** 本帧可用的临时全尺寸目标（i = 0..3；每个 fx 自己用，跨 fx 不保留内容） */
  scratch(i: number): THREE.WebGLRenderTarget;
  /** 跨帧保留的全尺寸目标（如上一帧画面）：key 由 fx 自己起，换尺寸时清空重建 */
  persist(key: string): THREE.WebGLRenderTarget;
  /** 把一张纹理原样复制到目标 */
  copy(src: THREE.Texture, dst: THREE.WebGLRenderTarget): void;
  /** 用别的 fx 着色器跑一遍（多 pass 的 fx：passOf 取自己登记的辅助 pass） */
  passOf(name: string): FullscreenPass;
}

export interface FxDef {
  /** 唯一 id（也用作 pass 名） */
  id: string;
  stage: FxStage;
  /** 同一阶段里的先后（小的先，默认 0） */
  order?: number;
  /** stage = 'medium' 时对应的 surface.medium 取值 */
  medium?: string;
  /**
   * 片元着色器：开头拼上 FX_HEAD（公共 uniform、噪声、深度线性化、OKLab、角色编号）；输出写 oColor。
   * 输入纹理叫 tInput：uniform 由 Pipeline 自动补上，但 FX_HEAD 不声明它——着色器里要自己写 `uniform sampler2D tInput;`
   * （P1 实测：漏写会编译失败、画面全黑）
   */
  frag: string;
  /** 额外 uniform（tInput 与公共 uniform 自动补上） */
  uniforms?: Record<string, THREE.IUniform>;
  /** 多 pass 的辅助着色器：name → { frag, uniforms }，用 ctx.passOf(`${id}:${name}`) 取 */
  extra?: Record<string, { frag: string; uniforms?: Record<string, THREE.IUniform> }>;
  /** 这一帧要不要跑（medium 阶段不用写：取值对上就跑） */
  active?(v: Values, frame: PostFrame): boolean;
  /** 每帧写 uniform（tInput 已设成本阶段输入） */
  setup?(pass: FullscreenPass, ctx: FxCtx): void;
  /** 自定义渲染（多 pass）：不给 = 用 frag 单 pass 渲染到 out */
  render?(ctx: FxCtx, out: THREE.WebGLRenderTarget, pass: FullscreenPass): void;
  /**
   * 释放 fx 自己建的显存资源（模块级的渲染目标、画布纹理；收尾 X / 复查 F9）：Pipeline.dispose 时调；
   * 换画布尺寸、换场景时也调一次（关掉的效果不再一直占着显存，下次用到时按需重建），所以只放「下次能重建」的东西
   */
  dispose?(): void;
}

/** 扩展着色器的公共头：POST_HEAD + POST_LIB + 角色编号（与 passes.ts 的 ROLE_FN 同一算法；天空没有角色，深度 ≈ 1 即天空） */
export const FX_HEAD = POST_HEAD + POST_LIB + /* glsl */ `
float roleAt(sampler2D tN, vec2 uv) { return floor(texture(tN, uv).a * 64.0); }
${Object.entries(ROLE_INDEX).map(([r, i]) => `const float ROLE_${r} = ${i}.0;`).join('\n')}
bool isCharacterRole(float r) { return r == ROLE_character || r == ROLE_characterAccent || r == ROLE_skin || r == ROLE_cloth; }
bool isAccentRole(float r) { return r == ROLE_accent || r == ROLE_flower || r == ROLE_interactive || r == ROLE_characterAccent; }
`;

const defs: FxDef[] = [];
/** 按阶段排好序的表与按 id 的表：登记时维护好，Pipeline 每帧直接取（收尾 X / 复查 F8：原来每帧 filter / 复制数组） */
const STAGES: FxStage[] = ['linear', 'graded', 'medium', 'afterStrokes', 'afterEdges', 'afterQuantize', 'afterOverlay', 'final'];
const byStage = Object.fromEntries(STAGES.map((s) => [s, [] as FxDef[]])) as Record<FxStage, FxDef[]>;
const byId = new Map<string, FxDef>();

export function registerFx(d: FxDef) {
  const i = defs.findIndex((x) => x.id === d.id);
  if (i >= 0) defs[i] = d; else defs.push(d);
  defs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const s of STAGES) byStage[s] = defs.filter((x) => x.stage === s);
  byId.set(d.id, d);
}

/** 这一阶段登记的 fx（按 order 排好；返回的是内部数组，只读） */
export const fxOfStage = (s: FxStage): readonly FxDef[] => byStage[s];
export const fxForMedium = (m: string) => byStage.medium.find((d) => d.medium === m);
export const fxById = (id: string) => byId.get(id);
export const allFx = () => [...defs];
/** 让所有 fx 释放自建的显存资源（FxDef.dispose） */
export function disposeAllFx() {
  for (const d of defs) { try { d.dispose?.(); } catch (err) { console.error(err); } }
}
