/*
 * 颜色角色：场景里每个部件都标一个角色，色板按角色给颜色。
 * 换色板只改一组 uniform，不重建几何。迁移到 Godot 时，一个角色对应一个材质颜色或一张色板贴图的一格。
 */
export const ROLES = [
  ['sand', '沙滩/浅滩'],
  ['grass', '低地草地'],
  ['highland', '高地'],
  ['snow', '雪顶'],
  ['rock', '岩石'],
  ['soil', '土层'],
  ['path', '道路'],
  ['water', '浅水'],
  ['waterDeep', '深水'],
  ['foliage', '树冠'],
  ['foliage2', '针叶/次级植被'],
  ['trunk', '树干'],
  ['flower', '花'],
  ['structure', '墙体'],
  ['roof', '屋顶'],
  ['trim', '饰件/木构'],
  ['wood', '木材'],
  ['stone', '石材'],
  ['metal', '金属'],
  ['cloth', '布料'],
  ['character', '角色主体'],
  ['characterAccent', '角色点缀'],
  ['skin', '皮肤'],
  ['interactive', '交互物'],
  ['accent', '强调色'],
  ['cloud', '云'],
  ['emissive', '发光体'],
  ['skyTop', '天顶'],
  ['skyHorizon', '地平线'],
  ['paper', '纸色/留白'],
  ['ink', '墨色/线色'],
  ['glass', '玻璃'],
] as const;

export type Role = (typeof ROLES)[number][0];
export const ROLE_INDEX: Record<Role, number> = Object.fromEntries(ROLES.map(([r], i) => [r, i])) as Record<Role, number>;
export const ROLE_LABEL: Record<Role, string> = Object.fromEntries(ROLES) as Record<Role, string>;
export const ROLE_COUNT = ROLES.length;
/** 地形按高度/坡度在着色器里决定颜色时用的特殊值 */
export const ROLE_TERRAIN = -1;

/** 描边范围分组 */
export const ROLE_GROUPS: Record<string, Role[]> = {
  terrain: ['sand', 'grass', 'highland', 'snow', 'rock', 'soil', 'path'],
  vegetation: ['foliage', 'foliage2', 'trunk', 'flower'],
  architecture: ['structure', 'roof', 'trim', 'wood', 'stone', 'metal', 'glass'],
  character: ['character', 'characterAccent', 'skin', 'cloth'],
  props: ['interactive', 'accent', 'emissive', 'cloud'],
};
