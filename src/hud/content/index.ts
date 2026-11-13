import type { Resolved } from '../sys/resolve';
import { GENERIC } from './generic';
import type { AssetRef, AtlasIcon, ContentPack, HudData, VitalRow } from './types';
import { PACK as SNOWLINE } from './packs/snowline';
import { PACK as ACTION } from './packs/action';
import { PACK as SOULSLIKE } from './packs/soulslike';
import { PACK as PLATFORMER } from './packs/platformer';
import { PACK as SHOOTER } from './packs/shooter';
import { PACK as SHMUP } from './packs/shmup';
import { PACK as RPG } from './packs/rpg';
import { PACK as TACTICS } from './packs/tactics';
import { PACK as RTS } from './packs/rts';
import { PACK as TOWER_DEFENSE } from './packs/towerDefense';
import { PACK as ARENA } from './packs/arena';
import { PACK as CITY_BUILDER } from './packs/cityBuilder';
import { PACK as COLONY } from './packs/colony';
import { PACK as FACTORY } from './packs/factory';
import { PACK as FARMING } from './packs/farming';
import { PACK as SANDBOX } from './packs/sandbox';
import { PACK as DECK_BUILDER } from './packs/deckBuilder';
import { PACK as PUZZLE } from './packs/puzzle';
import { PACK as VISUAL_NOVEL } from './packs/visualNovel';
import { PACK as RHYTHM } from './packs/rhythm';
import { PACK as HORROR } from './packs/horror';
import { PACK as SURVIVAL } from './packs/survival';
import { PACK as SURVIVORS } from './packs/survivors';
import { PACK as RACING } from './packs/racing';

/*
 * 示例内容包的登记与"当前包"（docs/c1-content-packs.md）。
 *   选包：参数 cnt.pack；auto 由派生规则 D-pack（sys/derive.ts）换成具体的包——显式选的品类布局对应的包 → 画面品类（game.genre）对应的包 → 雪线旅人；
 *         24 个包都已写好（30 个品类布局、16 个画面品类都有对应的包；"全部控件展示"不算品类，跟着画面品类走），雪线旅人只在 id 拼错 / 没登记时兜底。
 *   当前包：HudSystem 在画每一侧（A/B 时两侧各一次）之前 setPack(packFor(r))，构图与元素用 pack() 读；不在 HudSystem 里画的（Godot 导出、面板）直接用 packFor(r)。
 *   旧导出 DATA（core.ts）/ MENU（menu.ts）/ SAMPLE（sample.ts）是 liveView(() => pack().…) 的视图：元素都读 DATA；MENU、SAMPLE 已经没有消费方（删不删由维护者定）；
 *   screen.ts 的 Q 已删，消费方直接读包字段。
 * 包文件互不依赖、只放数据：每个作者只改自己的 packs/<id>.ts，不用改这里。
 */

export type { AssetRef, AtlasIcon, ContentPack } from './types';
export { GENERIC };

/** 已写好的包（id → 包） */
export const PACKS = new Map<string, ContentPack>();
export function registerPack(p: ContentPack) { PACKS.set(p.id, p); }
for (const p of [SNOWLINE, ACTION, SOULSLIKE, PLATFORMER, SHOOTER, SHMUP, RPG, TACTICS, RTS, TOWER_DEFENSE, ARENA, CITY_BUILDER, COLONY, FACTORY, FARMING, SANDBOX, DECK_BUILDER, PUZZLE, VISUAL_NOVEL, RHYTHM, HORROR, SURVIVAL, SURVIVORS, RACING]) if (p) registerPack(p);

/** 兜底包：雪线旅人（原来的样本） */
export const DEFAULT_PACK = SNOWLINE;

/** 计划中的全部包 id（cnt.pack 的取值；中文名与说明在调研 JSON 的 cnt.pack 选项里） */
export const PACK_IDS = ['snowline', 'action', 'soulslike', 'platformer', 'shooter', 'shmup', 'rpg', 'tactics', 'rts', 'towerDefense', 'arena', 'cityBuilder', 'colony', 'factory', 'farming', 'sandbox', 'deckBuilder', 'puzzle', 'visualNovel', 'rhythm', 'horror', 'survival', 'survivors', 'racing'];

/** 品类布局（uip.layout 的 30 个品类布局）→ 包；layout.showcase（全部控件展示）不在表里，按画面品类选包，各包都能在它下面把所有控件看一遍 */
export const LAYOUT_PACK: Record<string, string> = {
  'layout.explore': 'snowline',
  'layout.action': 'action', 'layout.mobileArpg': 'action',
  'layout.soulslike': 'soulslike',
  'layout.platformer': 'platformer', 'layout.metroidvania': 'platformer',
  'layout.shooter': 'shooter',
  'layout.shmup': 'shmup',
  'layout.rpg': 'rpg', 'layout.arpgOrb': 'rpg',
  'layout.strategyTurn': 'tactics',
  'layout.strategyRts': 'rts',
  'layout.towerDefense': 'towerDefense',
  'layout.moba': 'arena', 'layout.fighting': 'arena',
  'layout.builder': 'cityBuilder', 'layout.idle': 'cityBuilder',
  'layout.colonySim': 'colony',
  'layout.factory': 'factory',
  'layout.life': 'farming',
  'layout.sandbox': 'sandbox',
  'layout.card': 'deckBuilder', 'layout.autobattler': 'deckBuilder',
  'layout.puzzle': 'puzzle',
  'layout.narrative': 'visualNovel',
  'layout.rhythm': 'rhythm',
  'layout.horror': 'horror',
  'layout.survival': 'survival',
  'layout.survivors': 'survivors',
  'layout.racing': 'racing',
};

/** 画面品类（game.genre，16 个）→ 包 */
export const GENRE_PACK: Record<string, string> = {
  explore: 'snowline', action: 'action', platformer: 'platformer', shooter: 'shooter', rpg: 'rpg', puzzle: 'puzzle', horror: 'horror', survival: 'survival',
  builder: 'cityBuilder', factory: 'factory', life: 'farming', strategy: 'tactics', card: 'deckBuilder', racing: 'racing', sandbox: 'sandbox', narrative: 'visualNovel',
};

/** 按 id 取包；没有（拼错 / 没登记）时回到雪线旅人 */
export const packById = (id: string | null | undefined): ContentPack => (id && PACKS.get(id)) || DEFAULT_PACK;

/**
 * cnt.pack = auto 时选哪个包（派生规则 D-pack）：显式选了品类布局 → 它对应的包；否则（或那个包没登记）→ 画面品类对应的包；都没有 → 雪线旅人。
 * 只返回已写好的包，所以界面上的来源标签显示的就是实际在画的包。
 */
export function autoPackId(layout: unknown, genre: unknown): string {
  const lay = typeof layout === 'string' && layout !== 'auto' && layout !== 'none' ? LAYOUT_PACK[layout] : undefined;
  if (lay && PACKS.has(lay)) return lay;
  const gen = GENRE_PACK[String(genre ?? 'explore')];
  if (gen && PACKS.has(gen)) return gen;
  return DEFAULT_PACK.id;
}

/** 解析结果对应的包（cnt.pack 已由派生规则换成具体 id；id 没登记时回到雪线旅人） */
export const packFor = (r: Resolved | null | undefined): ContentPack => packById(r?.str('cnt.pack', DEFAULT_PACK.id));

/* ---------------- 当前包（HudSystem 每画一侧前设置，构图与元素读取） ---------------- */

let CUR: ContentPack = DEFAULT_PACK;
export const pack = () => CUR;
export const setPack = (p: ContentPack | string) => { CUR = typeof p === 'string' ? packById(p) : p; };

/* ---------------- 小工具 ---------------- */

/** 生命类的行（M12a-12）：包写了 vitals 就用它，否则由 hp / shield / stamina / vitalNames 兼容出三行（上限都是 hpMax，与原来的数值标注一样） */
export function vitalsOf(h: Pick<HudData, 'vitals' | 'vitalNames' | 'hp' | 'shield' | 'stamina' | 'hpMax'>): VitalRow[] {
  if (h.vitals?.length) return h.vitals;
  return [{ name: h.vitalNames[0], v: h.hp, max: h.hpMax }, { name: h.vitalNames[1], v: h.shield, max: h.hpMax }, { name: h.vitalNames[2], v: h.stamina, max: h.hpMax }];
}

/** 模板字填空：fill('第 {n} 天', { n: 12 }) → "第 12 天"（没给的占位原样保留） */
export const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** 包里声明过的物品图标：物品行 / 奖励行 / 资源行的第 4（资源行第 3）项，加上 icons 补充表 */
const ICONS = new WeakMap<ContentPack, Map<string, AtlasIcon>>();
export function iconOf(name: string, p: ContentPack = CUR): AtlasIcon | null {
  let m = ICONS.get(p);
  if (!m) {
    m = new Map();
    for (const [, n, , ic] of [...p.menu.items, ...p.hud.reward]) if (ic) m.set(n, ic);
    for (const [, n, ic] of p.hud.res) if (ic) m.set(n, ic);
    for (const [n, ic] of Object.entries(p.icons ?? {})) m.set(n, ic);
    ICONS.set(p, m);
  }
  return m.get(name) ?? null;
}

/** 包里的位图（书法标题 / 主视觉 / 四种立绘）；null = 这个包没有这张图，调用方画剪影、灰盒或文字，不借别的包的图。文件用 uiAssets.assetFile(ref.id, ref.file) 取 */
export type ArtKey = 'title' | 'keyArt' | 'anime' | 'painterly' | 'bust' | 'chibi';
export function artRef(key: ArtKey, p: ContentPack = CUR): AssetRef | null {
  const a = p.art;
  if (!a) return null;
  return (key === 'title' ? a.title : key === 'keyArt' ? a.keyArt : a.characters?.[key]) ?? null;
}

/** 运营层文字：GENERIC.ops 上盖包自己的覆盖 */
export const opsText = (p: ContentPack = CUR) => ({ ...GENERIC.ops, ...(p.ops ?? {}) });

/** 设置页：包自己的或 GENERIC 的 */
export const settingsOf = (p: ContentPack = CUR) => p.screens.settings ?? GENERIC.settings;

/**
 * 旧导出的过渡视图：读属性时转到 get() 的当前结果（DATA / MENU / SAMPLE 用它，消费方不用改就跟着当前包走）。
 * 每次读属性都会调一次 get()，get 里不要每次新建大对象（要组装的先按包缓存）。
 */
export function liveView<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get: (_t, k) => Reflect.get(get(), k),
    has: (_t, k) => Reflect.has(get(), k),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => { const d = Reflect.getOwnPropertyDescriptor(get(), k); return d ? { ...d, configurable: true } : undefined; },
  });
}
