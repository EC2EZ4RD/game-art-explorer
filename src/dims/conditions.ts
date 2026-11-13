import { sceneMeta } from '../content/sceneCatalog';
import { bool, is, str } from './registry';
import type { Values } from './types';

/* 常用的"是否生效"判断，返回 true 或不生效的原因 */

export const scene = (s: Values) => sceneMeta(str(s, 'game.scene'));

export const needTerrain = (s: Values): true | string =>
  scene(s).features.terrain ? true : `当前场景「${scene(s).name}」没有地形`;

export const needWater = (s: Values): true | string =>
  scene(s).features.water ? true : `当前场景「${scene(s).name}」没有水面`;

export const needCharacter = (s: Values): true | string =>
  scene(s).features.character ? true : '当前场景没有角色';

export const notVoxel = (s: Values): true | string =>
  is(s, 'geometry.representation', 'voxel') ? '几何表示为体素时，由体素尺度决定形状' : true;

export const shadingIs = (...models: string[]) => (s: Values): true | string =>
  is(s, 'shading.model', ...models) ? true : `只在明暗模型为「${models.map(modelName).join('/')}」时生效`;

export const shadingNot = (...models: string[]) => (s: Values): true | string =>
  is(s, 'shading.model', ...models) ? `明暗模型「${modelName(str(s, 'shading.model'))}」不使用这个参数` : true;

export const toggleOn = (id: string, name: string) => (s: Values): true | string =>
  bool(s, id) ? true : `需要先打开「${name}」`;

export const mediumIs = (...m: string[]) => (s: Values): true | string =>
  is(s, 'surface.medium', ...m) ? true : '只在对应的画面媒介下生效';

export const all = (...fs: ((s: Values) => true | string)[]) => (s: Values): true | string => {
  for (const f of fs) {
    const r = f(s);
    if (r !== true) return r;
  }
  return true;
};

const MODEL_NAMES: Record<string, string> = {
  unlit: '无光照平涂', lambert: '漫反射', halfLambert: '半兰伯特', toonRamp: '内置式卡通色阶', cel: '自定义赛璐璐',
  gooch: '冷暖', pbr: '物理材质', hatching: '排线', matcap: '材质球', vertex: '逐顶点光照',
};
export const modelName = (m: string) => MODEL_NAMES[m] ?? m;
