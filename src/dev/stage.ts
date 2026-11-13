import { useStore } from '../state/store';
import { getEngine } from '../ui/engineRef';
import { railOf, useShell } from '../ui/stage/shell';
import { devHooks } from './hooks';

/*
 * 轨道 B 的开发钩子（docs/workbench-redesign.md §11.0；约定见本目录 README.md）：__gae.stage.*
 *   info()        画框尺寸、unitK、模式、左右栏宽、有没有横向溢出
 *   textBudget()  默认可见文字数（§7：左栏 ≤150、画框下方 ≤100、右栏 ≤300、栏条 ≤50、整屏 ≤600；不算数字和符号）
 *   shell / set() 外壳视图状态（缩放、专注、👁UI……）
 *   qa(on)        QA 标签页开关：开时画面模式也照常画 HUD（老截图脚本的行为）
 *   store         不触发 QA 的 store 引用（自测用）
 * 另外：__gae.store / __gae.engine 改成访问器——老的截图 / 回归脚本一碰它们，这个标签页就进 QA 状态（画面模式不藏 HUD），
 * 用户正常使用时不受影响。
 * 审查修复 6：main.tsx 里的老钩子（readCheck、replicaShots、hudSheet、snap、contact……）内部直接用 useStore / getEngine，不经过上面两个访问器，
 * 只调它们的脚本在画面模式下拿到的是没有 HUD 的图。所以 window.__gae 换成一层代理：读到任何一个顶层的函数钩子就先进 QA。
 * 各轨道的命名空间（__gae.stage / state / gallery……，是对象不是函数）不受影响——C 烘焙配方缩略图照旧不画 HUD；要 HUD 的命名空间钩子自己调 __gae.stage.qa()。
 */

type R = { x: number; y: number; w: number; h: number };
const toR = (a: DOMRect | R): R => ('left' in a ? { x: a.left, y: a.top, w: a.width, h: a.height } : a);
const inter = (a0: DOMRect | R, b: R): R | null => {
  const a = toR(a0);
  const ax = a.x, ay = a.y, aw = a.w, ah = a.h;
  const x0 = Math.max(ax, b.x), y0 = Math.max(ay, b.y), x1 = Math.min(ax + aw, b.x + b.w), y1 = Math.min(ay + ah, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
};

/** 元素在屏幕上真正露出来的区域：一路与带裁剪的祖先、视口求交 */
function clipOf(el: Element, root: Element): R | null {
  let r: R | null = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  for (let p: Element | null = el; p && r; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (p === root || cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') r = inter(p.getBoundingClientRect(), r);
    if (p === root) break;
  }
  return r;
}

/** 一块区域里默认看得见的文字（只算汉字和字母） */
function visibleText(root: Element | null): { n: number; text: string } {
  if (!root) return { n: 0, text: '' };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent?.trim()) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const clip = clipOf(el, root);
    if (!clip) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    if (![...range.getClientRects()].some((rc) => rc.width > 0 && rc.height > 0 && inter(rc, clip))) continue;
    text += n.textContent;
  }
  const letters = text.match(/[\p{Script=Han}\p{L}]/gu) ?? [];
  return { n: letters.length, text: text.replace(/\s+/g, ' ').trim() };
}

function textBudget() {
  const q = (s: string) => document.querySelector(s);
  // 栏条的状态槽是改动后 4 秒的提示，不算「默认可见」
  const slot = visibleText(q('.status-slot')).n;
  const regions = { left: visibleText(q('.left')), deck: visibleText(q('.deck')), right: visibleText(q('.right')), bars: { n: visibleText(q('.topbar')).n + visibleText(q('.stage-bar')).n - slot, text: '' } };
  const limit = { left: 150, deck: 100, right: 300, bars: 50 };
  const total = Object.values(regions).reduce((a, r) => a + r.n, 0);
  return {
    total, ok: total <= 600 && (Object.keys(limit) as (keyof typeof limit)[]).every((k) => regions[k].n <= limit[k]),
    left: regions.left.n, deck: regions.deck.n, right: regions.right.n, bars: regions.bars.n,
    text: { left: regions.left.text, deck: regions.deck.text, right: regions.right.text, top: visibleText(q('.topbar')).text, bar: visibleText(q('.stage-bar')).text },
  };
}

function info() {
  const f = document.querySelector('[data-frame]') as HTMLElement | null;
  const eng = getEngine();
  const tb = document.querySelector('.topbar') as HTMLElement | null;
  const sb = document.querySelector('.stage-bar') as HTMLElement | null;
  return {
    win: [window.innerWidth, window.innerHeight],
    frame: f ? [f.clientWidth, f.clientHeight] : null,
    aspect: f ? +(f.clientWidth / f.clientHeight).toFixed(4) : null,
    unitK: eng ? +eng.hud.unitK.toFixed(3) : null,
    canvas: eng ? [eng.renderer.domElement.width, eng.renderer.domElement.height] : null,
    deck: (document.querySelector('.deck') as HTMLElement | null)?.clientHeight ?? 0,
    left: (document.querySelector('.left') as HTMLElement | null)?.offsetWidth ?? 0,
    right: (document.querySelector('.right') as HTMLElement | null)?.offsetWidth ?? 0,
    mode: useStore.getState().activeDim === 'hud' ? 'ui' : 'art',
    shell: { zoom: useShell.getState().zoom, focus: useShell.getState().focus, leftRail: railOf(useShell.getState(), useStore.getState().activeDim === 'hud' ? 'ui' : 'art'), artRail: useShell.getState().leftRail, uiRail: useShell.getState().uiRail, hudInArt: useShell.getState().hudInArt, qa: useShell.getState().qa },
    overflowX: document.documentElement.scrollWidth > window.innerWidth || (tb ? tb.scrollWidth > tb.clientWidth + 1 : false) || (sb ? sb.scrollWidth > sb.clientWidth + 1 : false),
    topbarW: tb ? [tb.scrollWidth, tb.clientWidth] : null,
  };
}

if (import.meta.env.DEV) {
  const g = devHooks({
    stage: {
      info,
      textBudget,
      get shell() { return useShell.getState(); },
      set: (p: Record<string, unknown>) => useShell.getState().set(p as never),
      qa: (on = true) => useShell.getState().set({ qa: on }),
      store: useStore,
    },
  });
  // 老脚本一碰 __gae.store / __gae.engine 就进 QA 状态（main.tsx 的 devHooksBase 看到已有这两个键，不会覆盖）
  const qa = () => { if (!useShell.getState().qa) useShell.getState().set({ qa: true }); };
  for (const [k, v] of [['store', () => useStore], ['engine', () => getEngine]] as const) {
    if (Object.getOwnPropertyDescriptor(g, k)?.get) continue;
    Object.defineProperty(g, k, { configurable: true, enumerable: true, get() { qa(); return v(); } });
  }
  // 顶层函数钩子一被读到（脚本要调它）就进 QA；只包一次（热更新重跑本文件时 window.__gae 已经是代理）
  const w = window as unknown as { __gae?: Record<string | symbol, unknown> };
  const MARK = Symbol.for('gae.qaProxy');
  if (w.__gae && !(w.__gae as Record<symbol, unknown>)[MARK]) {
    const target = w.__gae;
    w.__gae = new Proxy(target, {
      get(t, k, recv) {
        if (k === MARK) return true;
        const v = Reflect.get(t, k, recv);
        if (typeof k === 'string' && typeof v === 'function') qa();
        return v;
      },
    });
  }
}

if (import.meta.hot) import.meta.hot.accept();
