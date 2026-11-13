import type { SceneGroupId } from '../../content/gameScenes';
import { isMonetizationPreset } from '../../content/uiMonetization';
import { presetsOf } from '../../hud/sys/spec';

/*
 * 场景图库 / 界面胶片用的小数据与本地记忆（轨道 D）。本文件不放组件（Fast Refresh）。
 */

/** 场景卡缩略图（__gae.scenes.bakeThumbs() 烘焙到 public/swatches/scenes/）；id 里的冒号换成下划线 */
export const sceneThumbUrl = (id: string) => `${import.meta.env.BASE_URL}swatches/scenes/${id.replace(/[^\w.-]/g, '_')}.webp`;

/**
 * 空闲时把场景卡缩略图预先拉下来（整合修复 U#19：原来进 UI 模式后图库 3–5 秒是渐变占位）：63 张 320×180 webp（合计约 1 MB），
 * 启动后等主线程空下来，一次 4 张地拉，解码好的图留在内存里（同一个地址的 <img> 直接用缓存）。整个页面只拉一次
 */
const THUMBS = new Map<string, HTMLImageElement>();
let preloadStarted = false;
export function preloadSceneThumbs(ids: string[]) {
  if (preloadStarted || typeof window === 'undefined' || typeof Image === 'undefined') return;
  preloadStarted = true;
  const queue = ids.map(sceneThumbUrl).filter((u) => !THUMBS.has(u));
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const later = (f: () => void) => (ric ? ric(f, { timeout: 1500 }) : window.setTimeout(f, 300));
  const next = () => {
    const batch = queue.splice(0, 4);
    if (!batch.length) return;
    let left = batch.length;
    for (const u of batch) {
      const im = new Image();
      im.decoding = 'async';
      const done = () => { if (--left === 0) later(next); };
      im.onload = () => { void im.decode?.().catch(() => undefined); done(); };
      im.onerror = done;
      im.src = u;
      THUMBS.set(u, im);
    }
  };
  later(next);
}

/* ---------------- 本地记忆（每个浏览器一份，读写都包 try） ---------------- */

const LS = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* 存不了就算了 */ } },
};

/** 「你的游戏更像哪种？」选过的视角（场景图库把这一组排在最前） */
const MY_VIEW = 'gae.myView.v1';
export const myView = (): SceneGroupId | null => LS.get(MY_VIEW) as SceneGroupId | null;
export const setMyView = (g: SceneGroupId | null) => LS.set(MY_VIEW, g);

/** 首屏条看过 / 跳过了 */
const FIRST_RUN = 'gae.firstRun.v1';
export const firstRunDone = () => LS.get(FIRST_RUN) === '1';
export const setFirstRunDone = () => LS.set(FIRST_RUN, '1');

/** 场景图库停在哪个筛选（分组 id 或「2D」；null = 全部） */
const GROUP = 'gae.sceneGroup.v1';
export const savedGroup = (): string | null => LS.get(GROUP) || null;
export const saveGroup = (g: string | null) => LS.set(GROUP, g);

/* ---------------- 更多界面（63 个模板，§5.2） ---------------- */

const OUTSIDE = new Set(['tpl.login', 'tpl.server', 'tpl.create', 'tpl.notice', 'tpl.naming', 'tpl.lobby', 'tpl.title', 'tpl.loading', 'tpl.cutscene', 'tpl.credits', 'tpl.levelPath', 'tpl.vs', 'tpl.formation', 'tpl.chapterCard']);
const SYSTEM = new Set(['tpl.pausePc', 'tpl.pauseMobile', 'tpl.settings', 'tpl.rebind', 'tpl.difficulty', 'tpl.saveSlot', 'tpl.confirm', 'tpl.guide', 'tpl.photo', 'tpl.toast']);

/** 模板分四组：局外 / 局内弹出 / 系统 / 运营（商业化的进运营） */
export function templateGroups(): { label: string; ids: { id: string; label: string }[] }[] {
  const short = (l: string) => l.replace(/（.*?）/g, '');
  const ps = presetsOf('screen');
  // 去掉括号后重名的（暂停 PC / 手游）保留括号
  const all = ps.map((p) => ({ id: p.id, label: ps.filter((q) => short(q.label) === short(p.label)).length > 1 ? p.label : short(p.label) }));
  const g = { 局外: [] as typeof all, 局内弹出: [] as typeof all, 系统: [] as typeof all, 运营: [] as typeof all };
  for (const t of all) (isMonetizationPreset(t.id) ? g.运营 : OUTSIDE.has(t.id) ? g.局外 : SYSTEM.has(t.id) ? g.系统 : g.局内弹出).push(t);
  return Object.entries(g).map(([label, ids]) => ({ label, ids }));
}
