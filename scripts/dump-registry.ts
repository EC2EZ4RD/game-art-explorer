/*
 * 导出参数注册表（id、类型、选项、范围）到 docs/registry.json，
 * 供数据整理（风格图谱映射到参数）和外部工具使用。
 * 运行：npx tsx scripts/dump-registry.ts
 */
import { writeFileSync } from 'node:fs';
import '../src/dims/index';
import { allParams, DIMS } from '../src/dims/registry';
import { RECIPES } from '../src/content/recipes';
import { PALETTES } from '../src/content/palettes';
import { SCENES, SCENE_CATEGORIES } from '../src/content/sceneCatalog';

const out = {
  generatedAt: new Date().toISOString(),
  dims: DIMS,
  params: allParams().map((p) => ({
    id: p.id,
    dim: p.dim,
    label: p.label,
    kind: p.kind,
    min: p.min,
    max: p.max,
    default: p.default,
    status: p.status ?? 'live',
    options: p.options?.map((o) => ({ value: o.value, label: o.label, status: o.status ?? 'live', desc: o.desc })),
  })),
  recipes: RECIPES.map((r) => ({ id: r.id, name: r.name, family: r.family, missing: r.missing })),
  palettes: PALETTES.map((p) => ({ id: p.id, name: p.name, group: p.group })),
  scenes: SCENES.map((s) => ({ id: s.id, name: s.name, category: s.category })),
  sceneCategories: SCENE_CATEGORIES.map(([c]) => c),
};
writeFileSync('docs/registry.json', JSON.stringify(out, null, 2));
console.log(`params ${out.params.length}, recipes ${out.recipes.length}, palettes ${out.palettes.length}`);
