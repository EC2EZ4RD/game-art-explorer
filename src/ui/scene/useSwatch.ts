import { useEffect, useRef, useState } from 'react';
import { isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { hudFontsVersion } from '../../hud/fonts';
import type { Origin } from '../../state/layers';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';
import { useShell } from '../stage/shell';
import { choiceKey, planChoice, type SkinChoice } from './skinChoices';
import { cancelSwatches, hashStr, hashValues, onSwatch, peekSwatch, releaseSwatch, requestSwatch, setBackgroundKey, type SwatchResult } from './swatchRenderer';

/*
 * 色板的 React 接口（轨道 D）：一个色板元素在可见区域里、且参数停下来 400ms 后，才排队离屏画（swatchRenderer）。
 * 键 = 选项 + 当前参数与来源的哈希 + 背景（画面 / 场景）哈希 + 字体版本 + 画框尺寸：同一组合画过就直接用缓存。
 * 审查修复 4：排队时把参数、来源、「保留我的改动」拍成快照交给渲染器（原来画的时候才读 store，排队后又改了参数时 B 的图会存进 A 的键）；
 *   画之前渲染器再核对背景键和画框尺寸，变了就丢掉。
 * 审查修复 12：可见性双向跟踪——滚出可见区域的色板从队列里拿掉，参数再变时只重画看得见的。
 * B 的审查修复 ⑱：换场景 / 换界面时（皮肤行可能整个重新挂上）先留着这个选项上一张图，新图好了再换，不闪成空白。
 * 整合修复 U#4：旧图只在「同一个场景、同一屏」时留着（变暗 + 扫光，看得出在重画）；换了场景 / 界面就显示中性骨架，
 *   不再让新皮肤名压在上一个场景的裁切上 5–6 秒。
 * 整合修复 U#5：一整行色板共用一个取景键（与选项无关），渲染器第一次遇到它时用几个风格差得远的对照皮肤挑「差别最大」的一块。
 */

/** 每个选项最近一张图（跨组件挂载保留，新图没画好时先显示它）；bg / screen = 画它时的画面与界面 */
const lastByChoice = new Map<string, { res: SwatchResult; bg: string; screen: string }>();

/** 挑取景框用的对照皮肤：暗色科幻、手绘纸本、卡通潮流各一个（面板底色、描边、字体都差得远） */
const PROBE_SKINS = ['skin.scifi', 'skin.parchment', 'skin.neobrutal'];

/** 当前是哪一屏（界面选择的几个键）：旧图只在同一屏时留着 */
const screenOf = (v: Values) => `${v['uip.screen'] ?? ''}|${v['cnt.screen'] ?? ''}|${v['cnt.subtype'] ?? ''}|${v['chk.simPose'] ?? ''}|${v['chk.demo'] ?? ''}`;

/** 色板现在的样子：ok = 当前这张；old = 同一屏的上一张（变暗 + 扫光）；wait = 还没有（中性骨架） */
export type SwatchState = 'ok' | 'old' | 'wait';

/** 参数 / 来源的哈希（按对象身份记住，一次改动只算一次） */
let memo: { v: Values | null; o: Origin | null; keepMine: boolean; floor: boolean; key: string; bg: string } = { v: null, o: null, keepMine: false, floor: true, key: '', bg: '' };
/** floor = 视图▾「品质下限」（paint.ts 的 QUALITY.on，外壳的 qualityFloor）：开关一变色板就按新的画法重画（整合，IB 的请求） */
function stateKeys(v: Values, o: Origin, keepMine: boolean, floor: boolean): { key: string; bg: string } {
  if (memo.v === v && memo.o === o && memo.keepMine === keepMine && memo.floor === floor) return memo;
  const bg = hashValues(v, (k) => !isUiKey(k));
  const key = `${hashValues(v)}.${hashStr(JSON.stringify(o))}.${keepMine ? 1 : 0}.f${hudFontsVersion()}.q${floor ? 1 : 0}`;
  memo = { v, o, keepMine, floor, key, bg };
  return memo;
}

/** 画框尺寸（引擎画布的 CSS 尺寸）：色板按画框 1:1 取景，尺寸变了要重画 */
function frameSizeKey(): string {
  const c = getEngine()?.renderer.domElement;
  const p = c?.parentElement;
  return c && p ? `${p.clientWidth}x${p.clientHeight}@${c.width}` : '0';
}

/**
 * 一个选项的色板图（没画好时 null）。el = 色板元素的 ref（看不见时不排队）。
 * active = false 时什么都不做（例如画面模式下皮肤行藏着）
 */
export function useSwatch(choice: SkinChoice, el: React.RefObject<HTMLElement | null>, active = true): { img: SwatchResult | null; state: SwatchState } {
  const values = useStore((s) => s.values);
  const origin = useStore((s) => s.origin);
  const keepMine = useShell((s) => s.keepMine);
  const floor = useShell((s) => s.qualityFloor);
  const { key: sk, bg } = stateKeys(values, origin, keepMine, floor);
  const key = `${choiceKey(choice)}|${sk}|${bg}`;
  // 当前这张图和它对应的键（键变了之后、新图到之前，旧的不算「现在」的）
  const [res, setRes] = useState<{ k: string; r: SwatchResult } | null>(() => { const r = peekSwatch(`${key}|${frameSizeKey()}`); return r ? { k: key, r } : null; });
  const [seen, setSeen] = useState(false);
  const ck = choiceKey(choice);
  const scr = screenOf(values);
  const last = useRef(lastByChoice.get(ck) ?? null);
  // 记下这张图画的是哪个画面 / 哪一屏（按排队时的键，不按回调时的 store）
  const keepFor = (k: string, b: string, sc: string) => (r: SwatchResult) => { last.current = { res: r, bg: b, screen: sc }; lastByChoice.set(ck, last.current); setRes({ k, r }); };

  // 在可见区域里才画；滚出去了就不再排队（双向）
  useEffect(() => {
    const node = el.current;
    if (!node || !active) return;
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; if (e) setSeen(e.isIntersecting); }, { rootMargin: '0px 200px' });
    io.observe(node);
    return () => io.disconnect();
  }, [el, active]);

  useEffect(() => {
    if (!active) return;
    const fs = frameSizeKey();
    const full = `${key}|${fs}`;
    const keep = keepFor(key, bg, scr);
    const hit = peekSwatch(full);
    if (hit) { keep(hit); return; }
    if (!seen) return;
    const off = onSwatch(full, keep);
    // 这一次渲染的参数快照（键就是按它算的）
    const snap = { values, origin, keepMine };
    // 参数停下来 400ms 再排队；旧的、还没画的那批作废
    const t = window.setTimeout(() => {
      cancelSwatches((k) => k.includes(`|${sk}|`));
      setBackgroundKey(bg);
      requestSwatch({
        key: full,
        values: () => planChoice(snap.values, snap.origin, choice, snap.keepMine),
        // 一整行共用的取景（与选项无关）：参数、来源、背景、画框尺寸一样就是同一块
        cropKey: `${sk}|${bg}|${fs}`,
        probes: () => PROBE_SKINS.map((id) => planChoice(snap.values, snap.origin, { kind: 'skin', id }, snap.keepMine)).filter((v): v is Values => !!v),
        // 背景（画面键）和画框尺寸还是排队时的才画
        fresh: () => { const s = useStore.getState(), sh = useShell.getState(); return stateKeys(s.values, s.origin, sh.keepMine, sh.qualityFloor).bg === bg && sh.qualityFloor === floor && frameSizeKey() === fs; },
      });
    }, 400);
    return () => { clearTimeout(t); off(); releaseSwatch(full); };
    // choice 是每次渲染新建的对象：按它的键比较；values / origin / keepMine 由 key 代表
  }, [key, seen, active, sk, bg]);

  // 新的还没画好时：同一个画面、同一屏的上一张先留着（变暗）；换了场景 / 界面显示骨架
  if (res && res.k === key) return { img: res.r, state: 'ok' };
  const l = last.current;
  if (l && l.bg === bg && l.screen === scr) return { img: l.res, state: 'old' };
  return { img: null, state: 'wait' };
}
