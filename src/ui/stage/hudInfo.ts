import { useSyncExternalStore } from 'react';
import { getEngine } from '../engineRef';

/*
 * 画框上 HUD 最近一次绘制的概况（轨道 B2 审查修复 10 / 11）：现在是不是按元素排版、画出了东西没有、画了哪些元素。
 * 一个 rAF 轮询（只在有人订阅时跑），HUD 每重画一次（drawSerial + 1）读一次：
 *   - onHudDraw(cb)：每次重画都回调（选中守卫：选中的元素这一屏没有了就取消选中）；
 *   - useHudInfo()：React 用，只在概况真的变了时换新（本屏元素列表：整屏界面时不列不画的元素）。
 */

export interface HudInfo {
  /** HUD 的绘制序号 */
  serial: number;
  /** 局内 HUD 按元素排版（不是整屏模板 / 菜单 / 示例 HUD） */
  usesElements: boolean;
  /** 这一帧画出了东西（不显示 / 画面模式藏 HUD 时为假） */
  drawn: boolean;
  /** 画出来的元素（hits，UI A/B 时只有当前一侧） */
  hitIds: ReadonlySet<string>;
}

const EMPTY: HudInfo = { serial: -1, usesElements: false, drawn: false, hitIds: new Set() };
let info: HudInfo = EMPTY;
/** 只在内容变了时换新的那一份（给 useSyncExternalStore） */
let shape: HudInfo = EMPTY;
const drawSubs = new Set<(i: HudInfo) => void>();
const shapeSubs = new Set<() => void>();
let raf = 0;

const sameIds = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

function tick() {
  raf = requestAnimationFrame(tick);
  const eng = getEngine();
  if (!eng || eng.hud.drawSerial === info.serial) return;
  const h = eng.hud;
  const hitIds = new Set(h.hits.map((x) => x.element));
  const drawn = h.drawLog.boxes.length + h.drawLog.texts.length > 0 || h.hits.length > 0 || h.parts.length > 0;
  info = { serial: h.drawSerial, usesElements: h.usesElements, drawn, hitIds };
  if (shape.usesElements !== info.usesElements || shape.drawn !== info.drawn || !sameIds(shape.hitIds, info.hitIds)) {
    shape = info;
    shapeSubs.forEach((f) => f());
  }
  drawSubs.forEach((f) => f(info));
}

function retain() { if (!raf) raf = requestAnimationFrame(tick); }
function release() { if (!drawSubs.size && !shapeSubs.size && raf) { cancelAnimationFrame(raf); raf = 0; } }

/** HUD 每重画一次回调一次；返回取消订阅 */
export function onHudDraw(cb: (i: HudInfo) => void): () => void {
  drawSubs.add(cb);
  retain();
  return () => { drawSubs.delete(cb); release(); };
}

export const getHudInfo = () => info;

function subscribeShape(cb: () => void) {
  shapeSubs.add(cb);
  retain();
  return () => { shapeSubs.delete(cb); release(); };
}

/** HUD 的概况（只在 usesElements / drawn / 画了哪些元素变了时重渲染） */
export const useHudInfo = (): HudInfo => useSyncExternalStore(subscribeShape, () => shape, () => EMPTY);
