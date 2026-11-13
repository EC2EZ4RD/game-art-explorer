import type * as THREE from 'three';
import type { Values } from '../dims/types';
import type { SceneDesc } from './scene/types';

/*
 * 引擎扩展（2026-10-23 技术补全）：材质 / 灯光 / 粒子等模块在自己的文件里用 registerEngineExt 登记，
 * 引擎在「参数生效」「场景重建」「每帧渲染前」三个时刻调用，不用改 Engine.ts。
 * 例：舞台聚光灯在 onSceneBuilt 里往场景加光锥网格，在 onValues 里写自己的 uniform，在 onFrame 里让光锥摆动。
 */

export interface EngineExtCtx {
  /** 整个 three 场景（光锥、粒子之类可以挂在这里；场景重建时由扩展自己清理上一份） */
  scene: THREE.Scene;
  /** 当前场景构建结果的根节点（重建时整棵换掉） */
  root: THREE.Object3D | null;
  desc: SceneDesc | null;
  values: Values;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  /** 引擎时间（秒）与抽帧后的动画时间 */
  time: number;
  stepTime: number;
  dt: number;
  /** 镜头注视点（K 轨道补：粒子跟着它铺）与注视平面上看得到的世界高度 */
  target: THREE.Vector3;
  viewH: number;
  /** 玩家脚底（没有可操控角色时为 null） */
  player: THREE.Vector3 | null;
  /** 画框宽高比 */
  aspect: number;
}

export interface EngineExt {
  id: string;
  /** 参数生效之后（引擎写完自己的 uniform 之后） */
  onValues?(c: EngineExtCtx): void;
  /** 场景重建之后（新场景已挂进 scene） */
  onSceneBuilt?(c: EngineExtCtx): void;
  /** 每帧渲染之前（相机已更新） */
  onFrame?(c: EngineExtCtx): void;
  onDispose?(): void;
}

const exts: EngineExt[] = [];

export function registerEngineExt(e: EngineExt) {
  const i = exts.findIndex((x) => x.id === e.id);
  if (i >= 0) exts[i] = e; else exts.push(e);
}

export const engineExts = () => exts;

/** 引擎调用：逐个跑某个时刻的钩子，一个扩展出错不影响别的 */
export function runEngineExt(kind: 'onValues' | 'onSceneBuilt' | 'onFrame', c: EngineExtCtx) {
  for (const e of exts) {
    try { e[kind]?.(c); } catch (err) { console.error(`引擎扩展 ${e.id}.${kind} 出错`, err); }
  }
}
