import { CASE_MAP, CASES, GROUP_RECIPES, caseImage, type CaseEntry } from '../../content/cases';
import { gameScene } from '../../content/gameScenes';
import { RECIPE_MAP } from '../../content/recipes';
import { STYLES } from '../../content/styles.data';
import { effectiveApprox, type StyleEntry } from '../../content/styles';
import { REF_ONLY, cardName, refThumbUrl, thumbUrl, type RefOnlyCard } from '../../content/taxonomy';
import { LOCAL_REPLICA_SHOTS, replicaIds, type KFamily, type KReplica } from '../../content/uiKnowledge';

/*
 * 学习库（轨道 C，LearnOverlay）的数据函数：每张卡用哪几张图（按顺序试，失败就换下一张，最后是设计过的字牌）。
 * 生产构建里没有 Steam 截图和本地参考截图，只有我们自己渲染的缩略图（public/thumbs/）。
 * 我们自己的渲染一律标「近似」（ours = true）：那是用探索台参数凑出来的样子，不是这个风格本身。
 */

export type LearnTab = 'atlas' | 'cases' | 'uiPrinciples' | 'uiAtlas' | 'uiReplicas' | 'ref' | 'feel' | 'scenes' | 'coverage';

/** 一张候选图：ours = 我们自己按近似参数渲染的（卡上标「近似」）；tag = 另写角标（仅参考卡的示意插画标「示意」） */
export interface LearnImg { src: string; ours: boolean; tag?: string }

const rel = (p: string) => (p.startsWith('http') || p.startsWith('/') ? p : `./${p.replace(/^\.?\/+/, '')}`);
const caseByName = new Map<string, CaseEntry>();
for (const c of CASES) {
  caseByName.set(c.name.toLowerCase(), c);
  if (c.nameZh) caseByName.set(c.nameZh, c);
}
export const caseForName = (n: string) => caseByName.get(n.toLowerCase()) ?? caseByName.get(n);

/**
 * 风格研究库里和前面某一条的渲染几乎一样的条目（缩到 64×36 后平均差 < 14/255；同一场景同一配方底，换了几个参数看不出来）。
 * 这些条目不放渲染图（一屏里一排一样的图会让人以为它们是同一种风格），开发环境用代表作截图，否则用编号字牌。
 * 生成：public/thumbs/atlas 重新烘焙后在开发页面跑 await __gae.gallery.atlasDups()，把结果贴到这里。
 */
const ATLAS_DUP = new Set([
  'anime-atmospheric', 'ligne-claire', 'oil-impasto', 'pastel', 'smooth-lowpoly', 'impossible-geometry', 'neon-geometric', 'rpg-maker',
  'build-doom-25d', 'jinbi-landscape', 'guofeng-anime', 'dancheong', 'swiss-international', 'knitted', 'real-clay', 'handmade-photogrammetry',
  'toy-figurine', 'minimalist-abstract', 'biopunk-giger', 'hi-fi-frame-animation', 'vanillaware', 'rotoscope', 'darkest-dungeon-gothic',
  'storybook', 'photogrammetry', '3d-char-2d-fx',
]);
export const isAtlasDup = (id: string) => ATLAS_DUP.has(id);

/** 代表作的真实截图（开发环境才有） */
function styleShot(s: StyleEntry): string | null {
  for (const r of s.representatives) {
    const c = caseForName(r.name);
    const im = c ? caseImage(c) : null;
    if (im) return rel(im);
  }
  return null;
}

/**
 * 风格研究库一条风格的图：自己的烘焙图 → 对应配方的缩略图（都标「近似」）→ 代表作截图（开发环境）。
 * 和前面某条几乎一样的条目跳过渲染图，只用截图或字牌。
 */
export function styleImages(s: StyleEntry): LearnImg[] {
  const shot = styleShot(s);
  if (ATLAS_DUP.has(s.id)) return shot ? [{ src: shot, ours: false }] : [];
  const hasRecipe = !!s.recipe && RECIPE_MAP.has(s.recipe);
  const out: LearnImg[] = [];
  // 和烘焙脚本（src/dev/gallery.ts 的 atlasValues）同一条件：没有近似参数也没有配方的风格没有烘焙图，不去请求
  if (hasRecipe || Object.keys(effectiveApprox(s)).length) out.push({ src: thumbUrl(`atlas/${s.id}`), ours: true });
  if (hasRecipe) out.push({ src: thumbUrl(s.recipe!), ours: true });
  if (shot) out.push({ src: shot, ours: false });
  return out;
}

/** 名作案例的图：只用真实截图（开发环境）。生产构建没有截图时卡片画成字牌（名字 + 分组色），不拿某个配方的渲染图冒充这款游戏 */
export function caseImages(c: CaseEntry): LearnImg[] {
  const im = caseImage(c);
  return im ? [{ src: rel(im), ours: false }] : [];
}

/** 案例借用的近似配方（字牌角上的小图，标「近似：玩具手办」） */
export function caseApproxRecipe(c: CaseEntry): { id: string; name: string } | null {
  const rid = c.analysis?.recipe ?? GROUP_RECIPES[c.group]?.[0];
  const r = rid ? RECIPE_MAP.get(rid) : undefined;
  return r ? { id: r.id, name: cardName(r) } : null;
}

/** 分组 → 字牌的颜色（按分组名散列到色环上，同组同色） */
export function groupHue(group: string): number {
  let h = 0;
  for (const ch of group) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

/** 复刻在场景图库里的卡片缩略图（D 烘焙的 public/swatches/scenes/rep_<id>.webp，320×180，约 8 KB，生产构建也有） */
export const replicaThumbUrl = (id: string) => `${import.meta.env.BASE_URL}swatches/scenes/${`rep:${id}`.replace(/[^\w.-]/g, '_')}.webp`;

/**
 * 复刻的图：场景图库同一张卡片缩略图（小，生产也有；整合 U#19：原来先试 qa/replicas 的整帧 PNG，每张近 1 MB，学习库要白 5 秒）
 * → 开发环境的整帧复刻渲染（qa/replicas）→ 复刻用的画面配方缩略图（近似）
 */
export function replicaImages(r: KReplica): LearnImg[] {
  const out: LearnImg[] = [{ src: replicaThumbUrl(r.id), ours: true }];
  if (LOCAL_REPLICA_SHOTS && r.screens[0]) out.push({ src: `/qa/replicas/${encodeURIComponent(`${r.id}__${r.screens[0].key}`)}.png`, ours: true });
  const rid = r.art?.recipe;
  if (rid && RECIPE_MAP.has(rid)) out.push({ src: thumbUrl(rid), ours: true });
  return out;
}

/** 品类键 → 中文短名（复刻卡、复刻页用；与 uiPrinciples.json 品类篇的标题一致，取「与」之前那一截。知识库没加载时也能显示中文） */
const GENRE_ZH: Record<string, string> = {
  explore: '探索', action: '动作', platformer: '横版平台', shooter: '射击', racing: '竞速', rpg: '角色扮演', narrative: '叙事',
  strategy: '策略', builder: '建造经营', factory: '工厂', life: '生活养成', sandbox: '沙盒', survival: '生存', horror: '恐怖',
  puzzle: '解谜', card: '卡牌', mobile: '手机', fighting: '格斗', rhythm: '音游', sports: '体育', mobaBr: 'MOBA', vehicleSim: '模拟驾驶', mmo: 'MMO',
};
export const genreZh = (g: string): string => GENRE_ZH[g] ?? g;

/** 复刻的中文名：场景图库卡片上的那个（哈迪斯、小丑牌）；没有对应场景时用复刻文件里的名字（整合 U#10） */
export const replicaZh = (r: { id: string; name: string }): string => gameScene(`rep:${r.id}`)?.name ?? r.name;

/** 预取一组图（只取一次）。学习库的复刻卡、风格研究库首屏打开前就在缓存里（整合 U#19） */
const prefetched = new Set<string>();
export function prefetchImages(urls: string[]) {
  for (const u of urls) {
    if (prefetched.has(u)) continue;
    prefetched.add(u);
    const im = new Image();
    im.decoding = 'async';
    im.src = u;
  }
}

/** 浏览器空闲时预取学习库首屏要用的小图：26 张复刻卡、8 张仅参考示意图、风格研究库前 24 张（都是几 KB 的 webp）。图库挂上后调一次 */
let learnPreloaded = false;
export function preloadLearnImages() {
  if (learnPreloaded || typeof window === 'undefined') return;
  learnPreloaded = true;
  const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
  const run = () => {
    prefetchImages(replicaIds().map(replicaThumbUrl));
    prefetchImages(REF_ONLY.map((c) => refThumbUrl(c.id)));
    prefetchImages(STYLES.slice(0, 24).map((s) => styleImages(s)[0]?.src).filter((x): x is string => !!x));
  };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 6000 }); else window.setTimeout(run, 3000);
}

/** 仅参考卡的代表作真实截图（只在开发环境有；生产构建返回 null）。仅参考的风格做不出来，所以不放我们的近似渲染 */
export function refShot(c: RefOnlyCard): string | null {
  for (const g of c.games) {
    const hit = CASE_MAP.get(g) ?? caseForName(g);
    const im = hit ? caseImage(hit) : null;
    if (im) return rel(im);
  }
  return null;
}

/** UI 风格家族的小样：用家族参数里的颜色、圆角、描边画一块 CSS 面板（不需要截图） */
export interface FamilySwatch { bg: string; text: string; accent: string; radius: number; border: string; dark: boolean }
const hex = (x: unknown) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : null);
export function familySwatch(f: KFamily, parent?: KFamily): FamilySwatch {
  const p = { ...(parent?.effectiveParams ?? parent?.params ?? {}), ...(f.effectiveParams ?? f.params ?? {}) } as Record<string, unknown>;
  const dark = p['col.lightness'] === 'dark' || p['col.lightness'] === 'mid';
  const bg = hex(p['col.surface']) ?? (dark ? '#1c1d22' : '#f4f1ea');
  const text = hex(p['col.text']) ?? (dark ? '#e8e4da' : '#1f1d1a');
  const accent = hex(p['col.accent']) ?? hex(p['col.accent2']) ?? (dark ? '#c8a463' : '#3b6fd8');
  const corner = String(p['vis.corner'] ?? '');
  const radius = corner === 'round' || corner === 'pill' ? 12 : corner === 'soft' ? 6 : corner === 'cut' || corner === 'chamfer' ? 0 : 3;
  const sw = Number(p['vis.strokeWidth'] ?? 1);
  const border = p['vis.stroke'] === 'none' ? 'transparent' : `${Math.max(1, Math.min(4, sw || 1))}px solid ${hex(p['vis.strokeColorHex']) ?? accent}`;
  return { bg, text, accent, radius, border, dark };
}

/** 风格研究库的门类（按调研表顺序） */
export const STYLE_GROUPS: string[] = [...new Set(STYLES.map((s) => s.group))];
