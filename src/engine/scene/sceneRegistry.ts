import type { SceneDesc, BuildCtx } from './types';

/** 场景构建器注册表：场景是开放的，新增一个文件注册即可 */
export type SceneBuilder = (ctx: BuildCtx) => SceneDesc;

const builders = new Map<string, SceneBuilder>();

export function registerSceneBuilder(id: string, b: SceneBuilder) {
  builders.set(id, b);
}
export const hasSceneBuilder = (id: string) => builders.has(id);
export const getSceneBuilder = (id: string) => builders.get(id);
export const sceneBuilderIds = () => [...builders.keys()];
