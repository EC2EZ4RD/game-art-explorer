import raw from './cases/cases.json';
import peekRaw from './cases/steampeek.json';

/*
 * 案例库：调研候选经 Steam 接口核验后的记录（scripts/cases/*），截图在 public/cases/<appid>/。
 * 依据分开记录：奖项（美术专项证据）、榜单（热度信号）、SteamPeek（发现途径）、其他。
 */

export interface CaseAward {
  award: string;
  year: number | string;
  result: 'winner' | 'nominee' | 'honorable' | string;
}

export interface CaseAnalysis {
  /** 视觉拆解：各维度的观察 */
  teardown?: Record<string, string>;
  /** 观察依据：哪张图哪个部位 */
  evidence?: string[];
  /** 技术判断可信度 */
  confidence?: '官方证实' | '画面推断' | '未知' | string;
  transferable?: string[];
  recipe?: string;
  approx?: Record<string, string | number | boolean>;
  gaps?: string[];
  prompt?: string;
  analyzedAt?: string;
  screenshotNotes?: string;
}

export interface CaseEntry {
  id: string;
  name: string;
  nameZh?: string;
  appid: number | null;
  platform?: string;
  developers?: string[];
  publishers?: string[];
  group: string;
  groupTitle: string;
  alsoInGroups?: string[];
  artFeature?: string;
  evidence: { awards: CaseAward[]; charts: unknown[]; steampeek: unknown[]; steampeekDetail?: unknown[]; other: string[] };
  sources: string[];
  verifyStatus?: string;
  verifiedAt?: string;
  steam?: { name?: string; nameZh?: string; releaseDate?: string; comingSoon?: boolean };
  images: { header: string | null; thumbs: string[]; full: string[]; provenance?: string | null };
  steamTags?: string[];
  analysis?: CaseAnalysis;
}

type Raw = { meta?: Record<string, unknown>; cases: CaseEntry[] } | CaseEntry[];
const data = raw as unknown as Raw;
export const CASES: CaseEntry[] = Array.isArray(data) ? data : data.cases;

// 视觉拆解（子代理逐款看截图写成，analysis-*.json），按 id 合并
const analysisFiles = import.meta.glob('./cases/analysis-*.json', { eager: true, import: 'default' }) as Record<string, (CaseAnalysis & { id: string; screenshotNotes?: string })[]>;
const analysisById = new Map(Object.values(analysisFiles).flat().map((a) => [a.id, a]));
for (const c of CASES) {
  const a = analysisById.get(c.id);
  if (a) c.analysis = a;
}
export const ANALYZED_COUNT = analysisById.size;
export const CASES_META: Record<string, unknown> = Array.isArray(data) ? {} : data.meta ?? {};

/** 案例分组 → 可以进入的配方（机制相近，不代表画风相同） */
export const GROUP_RECIPES: Record<string, string[]> = {
  A: ['toy-diorama', 'inspiration-fixed', 'lowpoly-geo'],
  B: ['cel-anime', 'inspiration-fixed'],
  C: ['cel-anime'],
  D: ['manga-halftone', 'moebius', 'noir'],
  E: ['oil', 'gouache', 'watercolor'],
  F: ['watercolor', 'gouache'],
  G: ['ink-landscape'],
  H: ['gongbi', 'qinglv'],
  I: ['soft-pbr', 'cel-anime', 'ink-landscape'],
  J: ['voxel'],
  K: ['pixel3d', 'gameboy'],
  L: ['pixel3d', 'toy-diorama'],
  M: ['ps1'],
  N: ['onebit'],
  O: ['pencil-hatch', 'pen-crosshatch', 'moebius'],
  P: ['woodcut'],
  Q: ['papercut'],
  R: ['claymation', 'felt', 'toy-diorama'],
  S: ['lowpoly-geo', 'poster'],
  T: ['neon-night'],
  U: ['noir', 'ps1'],
  V: ['soft-pbr'],
  W: ['toy-diorama', 'watercolor', 'felt'],
  X: ['watercolor', 'gouache'],
  Y: ['soft-pbr', 'neon-night'],
  Z: ['gouache', 'cel-anime'],
};

/** 分组 → 推荐场景（验证这类画面的空间） */
export const GROUP_SCENES: Record<string, string> = {
  I: 'courtyard', T: 'city', Y: 'scifi', U: 'dungeon', W: 'farm', H: 'courtyard', G: 'mountain', V: 'forest',
};

export const caseGroups = () => {
  const m = new Map<string, { title: string; count: number }>();
  for (const c of CASES) {
    const g = m.get(c.group);
    if (g) g.count++;
    else m.set(c.group, { title: c.groupTitle, count: 1 });
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

/**
 * 案例截图是 Steam 商店截图（public/cases/，约 303 MB），不入库，只在本地抓取后（scripts/cases/）由开发服务器显示；生产构建不分发（vite.config.ts 构建时排除 public/cases）。
 * 没有截图时 caseImage / caseShots 返回空，界面改显示名字或我们自己渲染的配方缩略图。
 */
export const CASE_SHOTS = !!import.meta.env?.DEV && typeof __GAE_LOCAL_REFS__ !== 'undefined' && !!__GAE_LOCAL_REFS__?.cases;
export const caseImage = (c: CaseEntry) => (CASE_SHOTS ? c.images?.header ?? c.images?.thumbs?.[0] ?? null : null);
/** 一款的全部截图（大图在前）；生产构建为空 */
export const caseShots = (c: CaseEntry): string[] => (CASE_SHOTS ? [...(c.images?.full ?? []), ...(c.images?.thumbs ?? [])] : []);
export const CASE_MAP = new Map(CASES.map((c) => [c.id, c]));

/* SteamPeek 相似推荐（第三方、按标签相似度；只是发现途径，不代表美术相近） */
export interface PeekItem { rank: number; appid: number; name: string; rs: number | null; steamPeekRating: number | null; release: string | null; tags: string[] }
export interface PeekSeed { seed: number; name: string; style: string; fromChart?: boolean; url: string; updatedOn: string | null; totalFound: number | null; seedTags: string[]; related: PeekItem[] }
const peek = peekRaw as unknown as { fetchedAt: string; note: string; seeds: PeekSeed[] };
export const PEEK_NOTE = peek.note;
export const peekFor = (appid: number | null) => (appid ? peek.seeds.find((s) => s.seed === appid) ?? null : null);
export const CASE_BY_APPID = new Map(CASES.filter((c) => c.appid).map((c) => [c.appid!, c]));
/** 反向：哪些种子的推荐里出现了这款 */
export const peekedBy = (appid: number | null) => (appid ? peek.seeds.filter((s) => s.related.some((r) => r.appid === appid)) : []);

export function awardBadge(c: CaseEntry): string | null {
  const w = c.evidence?.awards?.find((a) => a.result === 'winner');
  if (w) return `${w.award} ${w.year} 获奖`;
  const n = c.evidence?.awards?.[0];
  return n ? `${n.award} ${n.year} ${n.result === 'honorable' ? '荣誉提名' : '提名'}` : null;
}
