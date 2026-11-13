import SPEC_JSON from '../../content/uiSpec.gen.json';

/*
 * 游戏 UI 参数体系的运行时数据（scripts/ui-spec-build.ts 从 docs/survey/data/ui-param-system.json 生成）。
 * 这里只做类型与索引；登记成参数见 register.ts，分层解析见 resolve.ts。
 */

export type Raw = string | number | boolean | string[] | null;

export interface SpecOption {
  value: string | number | boolean;
  label: string;
  desc?: string;
  needs?: string;
  godotLevel?: string;
  refs?: string[];
  parent?: string;
  layer?: string;
  channel?: string;
}

export interface SpecParam {
  id: string;
  group: string;
  label: string;
  cls: string;
  scope: 'global' | 'globalScreen' | 'screen' | 'element';
  kind: 'choice' | 'range' | 'int' | 'toggle' | 'multi' | 'color' | 'gradient';
  default: Raw;
  range?: { min: number; max: number; step: number; unit?: string };
  options?: SpecOption[];
  activeWhen?: Cond;
  overrideAt?: string[];
  merge?: 'union' | 'replace';
  tier: number;
  tab: string;
  preview?: string;
  random?: boolean;
  randomRange?: [number, number];
  fallback?: Raw;
  plain?: string;
  lookAt?: string;
  ends?: string[];
  starter?: boolean;
  status?: string;
  milestone?: string;
  impl?: string;
  godot?: string;
  godotLevel?: string;
  panel?: boolean;
  appliesTo?: string[];
  optionsFrom?: string;
  ordered?: boolean;
  /** 颜色列表（el.vitals.rowColors、col.actionColors、cmp.listRowColors）：项可以是角色名或 #hex（M12a-12；参数面板可直接加 #hex，审查修复 B · C3） */
  freeColors?: boolean;
  /** 可并排的列表（lay.edgeBarSlots）：项可以写成 "a|b"（M12a-16；参数面板可把一项并到上一项，审查修复 B · C3） */
  joinable?: boolean;
  control?: string;
  needs?: string;
  absorbs?: string[];
}

export interface SpecGroup { id: string; label: string; desc?: string; question?: string; params: SpecParam[] }

export type PresetKind = 'skin' | 'keyword' | 'theme' | 'layout' | 'screen' | 'platform' | 'business' | 'pattern' | 'container' | 'nudge' | 'overlay' | 'example' | 'recipe';

export interface NudgeOp { op: 'add' | 'set' | 'min' | 'max' | 'mul' | 'union' | 'invertScene'; v?: Raw }

export interface SpecPreset {
  id: string;
  kind: PresetKind;
  label: string;
  desc: string;
  values: Record<string, Raw | NudgeOp>;
  refs?: string[];
  suggests?: Record<string, Raw>;
  accent?: Record<string, Raw>;
  keywordDefaults?: Record<string, Raw>;
  keyword?: string;
  existing?: string;
  genre?: string | string[];
  audience?: string;
  browse?: string;
  layers?: Record<string, string>;
  members?: string[];
  firstTry?: string;
  lookAt?: string;
  differs?: string;
  tags?: string[];
  missing?: string[];
  pattern?: string;
  container?: string;
  family?: string;
  terms?: string[];
  survey?: string;
}

/** 数据式条件：{p, in} {p, notIn} {p, has} {p, hasAny} {p, empty} {p, gt|lt|eq} {all} {any} {not} */
export type Cond = {
  p?: string; in?: Raw[]; notIn?: Raw[]; has?: Raw; hasAny?: Raw[]; empty?: boolean; gt?: number; lt?: number; eq?: number | string | boolean;
  all?: Cond[]; any?: Cond[]; not?: Cond;
};

export interface SpecRule { id: string; cls: 'default' | 'adapt' | 'derived' | 'a11y' | string; from: string[]; to: string[]; rule: string; apply?: string }
export interface SpecConstraint { id: string; kind: 'imply' | 'check' | string; level: string; if: Cond; then: Cond; why: string; set?: Record<string, Raw> }
export interface ArtMap { id: string; name: string; sameMedium: string; neutral: string; contrast: string }

interface SpecFile {
  hash: string;
  groups: SpecGroup[];
  vocab: { materials: SpecOption[]; components: unknown; roles: unknown; elements: unknown };
  presets: SpecPreset[];
  derived: SpecRule[];
  constraints: SpecConstraint[];
  fromArt: { recipes: ArtMap[]; moods: ArtMap[]; cultures: ArtMap[] };
}

export const SPEC = SPEC_JSON as unknown as SpecFile;
export const SPEC_GROUPS = SPEC.groups;
export const SPEC_PARAMS = SPEC.groups.flatMap((g) => g.params);
export const SPEC_PARAM = new Map(SPEC_PARAMS.map((p) => [p.id, p]));
export const PRESETS = SPEC.presets;
export const PRESET = new Map(PRESETS.map((p) => [p.id, p]));
export const presetsOf = (k: PresetKind) => PRESETS.filter((p) => p.kind === k);

/** 取值表（optionsFrom 共用另一个参数的词表；材质参数共用 vocab.materials） */
export function optionsOf(p: SpecParam): SpecOption[] {
  if (p.options?.length) return p.options;
  if (p.optionsFrom) {
    if (p.optionsFrom.startsWith('vocab.')) return (SPEC.vocab as unknown as Record<string, SpecOption[]>)[p.optionsFrom.slice(6)] ?? [];
    const q = SPEC_PARAM.get(p.optionsFrom);
    if (q) return optionsOf(q);
  }
  return [];
}

/** 信息元素 id（el.vitals …）与它们的模板参数（elx.*） */
export const ELEMENT_IDS = (SPEC_PARAM.get('cnt.elements')?.options ?? []).map((o) => String(o.value)).filter((v) => v.startsWith('el.'));
export const ELX_PARAMS = SPEC_PARAMS.filter((p) => p.id.startsWith('elx.'));
/** 元素自己的参数（el.vitals.count、el.minimap.form …） */
export const ELEMENT_OWN = SPEC_PARAMS.filter((p) => /^el\.[a-zA-Z]+\.\w+$/.test(p.id));
/** 覆盖目标（@ 后面能写什么） */
export const OVERRIDE_TARGETS = new Set<string>(SPEC_PARAMS.flatMap((p) => p.overrideAt ?? []));
