import { useSyncExternalStore } from 'react';
import type { Engine } from '../../engine/Engine';
import type { Values } from '../../dims/types';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';

/*
 * 镜头转过没有（轨道 B2 审查修复 ⑨，§4.2「镜头复位：镜头被转动过时才出现」）。
 * 视图状态，不进撤销。引擎有 cameraMoved（轨道 F，已在 track-B.md 里请求）时以它为准；还没有时外壳自己记：
 *   - 用户转 / 拉 / 平移镜头 → 转过：OrbitControls 发了 start（用户按下开始操控；锁定镜头的场景左键拖不发）之后、
 *     到 end 之后惯性停下之前，镜头真的动了（change 事件）才算——只在画布上点一下（取消选中）不算；
 *   - 镜头复位（双击画框、场景弹窗「镜头复位」）、换场景 / 换布局 / 改镜头参数（引擎这时自己回到场景机位）→ 没转过。
 */

let moved = false;
/** 用户正在操控镜头（start → end）；end 之后惯性还在动的截止时刻 */
let active = false, until = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function setMoved(v: boolean) {
  if (moved === v) return;
  moved = v;
  emit();
}

/** 镜头现在离开场景机位了吗 */
export function cameraMoved(): boolean {
  const own = (getEngine() as unknown as { cameraMoved?: unknown } | null)?.cameraMoved;
  return typeof own === 'boolean' ? own : moved;
}

/** 镜头复位（回到场景机位） */
export function resetCameraNow() {
  // 双击复位时两次按下都发了 start / end：先结束这一段，复位本身和之后跟拍挪镜头的 change 不算转过
  active = false; until = 0;
  getEngine()?.resetCamera?.();
  setMoved(false);
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useCameraMoved = (): boolean => useSyncExternalStore(subscribe, cameraMoved, () => false);

/** 镜头相关的参数（引擎换了它们会自己回到场景机位）：场景、种子、camera.* */
function camSig(v: Values): string {
  let s = `${String(v['game.scene'] ?? '')}#${String(v['game.seed'] ?? '')}`;
  for (const k in v) if (k.startsWith('camera.')) s += `|${k}=${String(v[k])}`;
  return s;
}

/** 挂到刚建好的引擎上（Frame.tsx）；返回卸载函数 */
export function watchCamera(engine: Engine): () => void {
  setMoved(false);
  const controls = (engine as unknown as { controls?: { addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void } }).controls;
  // 用户在操控（start → end，再给惯性 0.6 秒）时镜头动了才算转过；跟拍时引擎每帧挪镜头发的 change 不算
  active = false; until = 0;
  const onStart = () => { active = true; };
  const onEnd = () => { active = false; until = performance.now() + 600; };
  const onChange = () => { if (active || performance.now() < until) setMoved(true); };
  controls?.addEventListener?.('start', onStart);
  controls?.addEventListener?.('end', onEnd);
  controls?.addEventListener?.('change', onChange);
  let sig = camSig(useStore.getState().values);
  const unsub = useStore.subscribe((s, p) => {
    if (s.values === p.values) return;
    const n = camSig(s.values);
    if (n !== sig) { sig = n; active = false; until = 0; setMoved(false); }
  });
  return () => {
    controls?.removeEventListener?.('start', onStart);
    controls?.removeEventListener?.('end', onEnd);
    controls?.removeEventListener?.('change', onChange);
    unsub();
  };
}
