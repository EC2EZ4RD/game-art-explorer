import { getPalette } from '../../content/palettes';
import { str } from '../../dims/registry';
import type { Values } from '../../dims/types';
import type { SkinPalette } from '../types';

/** 场景色板 → UI 色板角色（画布绘制、参数面板、Godot 导出共用） */
export function scenePaletteOf(v: Values): SkinPalette {
  const r = getPalette(str(v, 'color.palette')).roles;
  return { accent: r.accent, accent2: r.interactive, paper: r.paper, ink: r.ink, good: r.grass, sky: r.skyTop };
}
