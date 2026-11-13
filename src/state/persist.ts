import { del, get, set } from 'idb-keyval';
import { defaultsCached, isViewKey, validKey } from '../dims/registry';
import type { Values } from '../dims/types';

/*
 * 存储（轨道 A，docs/workbench-redesign.md §4.3）。只做读写，不碰 store：
 *   工作副本  sessionStorage gae.work.v2  { values, origin }，每个标签页一份，多个标签页不再互相覆盖；
 *   上次会话  localStorage   gae.last.v2  提交时去抖写入，新开标签页时读；
 *   视图状态  sessionStorage gae.view.v1  诊断、检查工具、冻结、A 槽、模式……（不进撤销、不进导出）；
 *   撤销记录  IndexedDB      gae.hist.v2.<标签页 id>  最近 50 步，刷新页面不丢；
 *             页面关闭 / 刷新时另把还没写进去的那份同步写一份到 sessionStorage gae.hist.v2.mirror（IndexedDB 是异步的，来不及写完；读的时候取新的那份）；
 *   旧存档    localStorage   gae.values.v1  只读（迁移：按空来源处理，所有非默认值都算改动）。
 * 「复制标签页」会把 sessionStorage 一起复制（标签页 id 相同）：新标签页用 BroadcastChannel 问一声，id 被占了就换一个新的。
 * 上次会话只由「用户正在用的」标签页写：后台标签页（visibilityState = hidden）、外壳登记为 QA / 钩子驱动的标签页不写（setLastGate）。
 * 值都按「与默认值不同的键」压缩存（857 个参数里通常只有几十个改过）。
 * 隐私模式、node 测试里没有这些存储：一律静默跳过。
 */

const WORK = 'gae.work.v2';
const LAST = 'gae.last.v2';
const LEGACY = 'gae.values.v1';
const VIEW = 'gae.view.v1';
const TAB = 'gae.tab.v1';
const HIST = 'gae.hist.v2.';
const HIST_INDEX = 'gae.hist.v2.index';
const HIST_MIRROR = 'gae.hist.v2.mirror';
/** 撤销记录存多少步 */
export const HISTORY_KEEP = 50;

const ss = (): Storage | null => { try { return typeof window === 'undefined' || typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } };
const ls = (): Storage | null => { try { return typeof window === 'undefined' || typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
const hasIdb = () => { try { return typeof indexedDB !== 'undefined'; } catch { return false; } };
const readJson = (s: Storage | null, k: string): unknown => {
  try { const raw = s?.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeJson = (s: Storage | null, k: string, v: unknown) => {
  try { s?.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

/** 只留与默认值不同的键（视图键不存） */
export function compact(v: Values): Values {
  const d = defaultsCached();
  const out: Values = {};
  for (const [k, x] of Object.entries(v)) {
    if (isViewKey(k) || x === undefined) continue;
    if (k in d ? d[k] !== x : x !== 'auto') out[k] = x;
  }
  return out;
}

/** 压缩的值还原成整张表（不认识的键丢掉） */
export function expand(c: unknown): Values {
  const out: Values = { ...defaultsCached() };
  if (!c || typeof c !== 'object') return out;
  for (const [k, x] of Object.entries(c as Values)) if (validKey(k) && !isViewKey(k) && (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')) out[k] = x;
  return out;
}

export interface WorkCopy { schema: 2; ts: number; values: Values; origin: unknown; label?: string }

const asWork = (x: unknown): WorkCopy | null => (x && typeof x === 'object' && (x as WorkCopy).schema === 2 && (x as WorkCopy).values ? (x as WorkCopy) : null);

/** 这个标签页的工作副本（刷新页面后接着用） */
export const readWork = (): WorkCopy | null => asWork(readJson(ss(), WORK));
/** 上次会话（新开标签页时用） */
export const readLast = (): WorkCopy | null => asWork(readJson(ls(), LAST));

/** 旧版存档（gae.values.v1：整张值表，没有来源） */
export function readLegacy(): Values | null {
  const raw = readJson(ls(), LEGACY);
  return raw && typeof raw === 'object' ? (raw as Values) : null;
}

let workTimer: ReturnType<typeof setTimeout> | null = null;
let workPending: WorkCopy | null = null;
let lastTimer: ReturnType<typeof setTimeout> | null = null;
let lastPending: WorkCopy | null = null;

let lastGate: () => boolean = () => true;
/**
 * 上次会话（gae.last.v2，所有标签页共用）只由用户正在用的标签页写（审查修复 26）：
 * 外壳登记判断（QA / 被 __gae 钩子驱动的标签页返回 false）；另外看不见的、没有焦点的标签页也不写——
 * 实测内置浏览器里别的会话开的后台标签页 visibilityState 仍是 visible，但 hasFocus() = false（QA 标记刷新后也会丢）。
 * 用户点画面、拖滑块、按快捷键时页面一定有焦点。
 */
export function setLastGate(f: () => boolean) { lastGate = f; }
const mayWriteLast = (): boolean => {
  try {
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'hidden') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
    }
    return !!lastGate();
  } catch { return true; }
};

/** 马上把还没写的工作副本 / 上次会话 / 撤销记录写下去（页面关闭、刷新前） */
export function flushWork() {
  if (workTimer) { clearTimeout(workTimer); workTimer = null; }
  if (workPending) writeJson(ss(), WORK, workPending);
  workPending = null;
  if (lastTimer) { clearTimeout(lastTimer); lastTimer = null; }
  if (lastPending) writeJson(ls(), LAST, lastPending);
  lastPending = null;
  flushHistory();
}
if (typeof window !== 'undefined') {
  try { window.addEventListener('pagehide', flushWork); } catch { /* 忽略 */ }
}

/**
 * 提交后写工作副本（本标签页，150ms 去抖：拖滑块时不每一下都写）+ 上次会话（800ms 去抖）。
 * 刷新 / 关页面时 pagehide 会把没写的补上
 */
export function writeWork(values: Values, origin: unknown, label?: string, opts: { last?: boolean } = {}) {
  const w: WorkCopy = { schema: 2, ts: Date.now(), values: compact(values), origin, label };
  workPending = w;
  if (opts.last === false) {
    if (!workTimer) workTimer = setTimeout(() => { workTimer = null; if (workPending) writeJson(ss(), WORK, workPending); workPending = null; }, 150);
    return;
  }
  if (!workTimer) workTimer = setTimeout(() => { workTimer = null; if (workPending) writeJson(ss(), WORK, workPending); workPending = null; }, 150);
  if (!mayWriteLast()) return;
  lastPending = w;
  if (lastTimer) clearTimeout(lastTimer);
  lastTimer = setTimeout(() => { lastTimer = null; if (lastPending) writeJson(ls(), LAST, lastPending); lastPending = null; }, 800);
}

/* ---------------- 视图状态 ---------------- */

export const readView = (): Record<string, unknown> | null => {
  const x = readJson(ss(), VIEW);
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : null;
};
let viewTimer: ReturnType<typeof setTimeout> | null = null;
/** 视图状态去抖写入；A 槽的截图太大（>1.5MB）时不存图 */
export function writeView(v: Record<string, unknown>) {
  if (viewTimer) clearTimeout(viewTimer);
  viewTimer = setTimeout(() => {
    viewTimer = null;
    if (!writeJson(ss(), VIEW, v) && v.slotA) writeJson(ss(), VIEW, { ...v, slotA: { ...(v.slotA as object), image: undefined } });
  }, 300);
}

/* ---------------- 撤销记录（IndexedDB） ---------------- */

const newTabId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** 本标签页的 id（存在 sessionStorage：刷新不变，新标签页换新的） */
export function tabId(): string {
  const s = ss();
  try {
    const cur = s?.getItem(TAB);
    if (cur) return cur;
    if (!s) return 'mem';
    const id = newTabId();
    s.setItem(TAB, id);
    return id;
  } catch {
    return 'mem';
  }
}

/**
 * 「复制标签页」会连 sessionStorage 一起复制：两个标签页同一个 id，撤销记录写同一个键（审查修复 8）。
 * 打开时广播问一声「这个 id 有人在用吗」；3 秒内有人答「在用」就换一个新 id，并把原来那份撤销记录拷过来接着用。
 */
function claimTabId() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined' || !ss()) return;
  try {
    const bc = new BroadcastChannel('gae.tabs');
    const born = Date.now();
    bc.onmessage = (e: MessageEvent) => {
      const m = e.data as { t?: string; id?: string } | null;
      if (!m || m.id !== tabId()) return;
      if (m.t === 'who') bc.postMessage({ t: 'mine', id: m.id });
      else if (m.t === 'mine' && Date.now() - born < 3000) {
        const old = m.id, fresh = newTabId();
        try { ss()?.setItem(TAB, fresh); } catch { /* 忽略 */ }
        if (hasIdb()) get<StoredHistory>(HIST + old).then((h) => (h ? set(HIST + fresh, h) : undefined)).catch(() => { /* 忽略 */ });
      }
    };
    bc.postMessage({ t: 'who', id: tabId() });
  } catch { /* 忽略 */ }
}
claimTabId();

export interface StoredSnap { values: Values; origin?: unknown; label: string; ts: number }
export interface StoredHistory { history: StoredSnap[]; future: StoredSnap[]; ts: number }

const asHist = (h: unknown): StoredHistory | null => (h && typeof h === 'object' && Array.isArray((h as StoredHistory).history) ? (h as StoredHistory) : null);

/** 读撤销记录：IndexedDB 那份和关页面时同步写的那份（sessionStorage）取新的 */
export async function loadHistory(): Promise<StoredHistory | null> {
  const mirror = asHist(readJson(ss(), HIST_MIRROR));
  if (!hasIdb()) return mirror;
  try {
    const h = asHist(await get<StoredHistory>(HIST + tabId()));
    if (h && mirror) return (mirror.ts ?? 0) > (h.ts ?? 0) ? mirror : h;
    return h ?? mirror;
  } catch {
    return mirror;
  }
}

interface PendingHist { history: StoredSnap[]; future: StoredSnap[]; ts: number }
let histTimer: ReturnType<typeof setTimeout> | null = null;
/** 还没写下去的撤销记录（ts = 提交的时刻：IndexedDB 和 sessionStorage 两份按它比新旧） */
let histPending: PendingHist | null = null;
const packSnap = (x: StoredSnap): StoredSnap => ({ values: compact(x.values), origin: x.origin, label: x.label, ts: x.ts });
const packHist = (p: PendingHist): StoredHistory => ({ history: p.history.slice(-HISTORY_KEEP).map(packSnap), future: p.future.slice(0, HISTORY_KEEP).map(packSnap), ts: p.ts });

/** 页面关闭 / 刷新：还没写进 IndexedDB 的撤销记录同步写一份到 sessionStorage（IndexedDB 那份照样开始写） */
function flushHistory() {
  const p = histPending;
  if (!p) return;
  if (histTimer) { clearTimeout(histTimer); histTimer = null; }
  writeJson(ss(), HIST_MIRROR, packHist(p));
  void writeHistory(p);
}

/** 撤销记录去抖写入（只存最近 50 步，值压缩） */
export function saveHistory(history: StoredSnap[], future: StoredSnap[]) {
  if (!hasIdb() && !ss()) return;
  histPending = { history, future, ts: Date.now() };
  if (histTimer) clearTimeout(histTimer);
  histTimer = setTimeout(() => { histTimer = null; if (histPending) void writeHistory(histPending); }, 600);
}

async function writeHistory(p: PendingHist) {
  if (histPending === p) histPending = null;
  if (!hasIdb()) return;
  const id = tabId();
  try {
    await set(HIST + id, packHist(p) satisfies StoredHistory);
    // 清掉很久没用的标签页的记录（留最近 12 个、7 天内）
    const idx = ((await get<Record<string, number>>(HIST_INDEX)) ?? {}) as Record<string, number>;
    idx[id] = Date.now();
    const keep = Object.entries(idx).sort((a, b) => b[1] - a[1]);
    const old = keep.filter(([, t], i) => i >= 12 || Date.now() - t > 7 * 864e5);
    for (const [k] of old) { delete idx[k]; await del(HIST + k); }
    await set(HIST_INDEX, idx);
  } catch {
    /* 存不下：只是刷新后撤销不了 */
  }
}

/** 压缩存档里的一步还原成整张值表 */
export const expandSnap = (x: StoredSnap): StoredSnap => ({ ...x, values: expand(x.values) });

