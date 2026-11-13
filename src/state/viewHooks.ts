/*
 * 视图状态的登记口（轨道 A）：外壳（B 的 src/ui/stage/shell.ts）的状态不归 A，A 的动作通过这里调用它，
 * 免得 actions.ts 直接引外壳模块（外壳一引入就碰 document，node 单测里跑不了）。
 *   registerKeepMine：「保留我的改动」开关的读法（套用函数在调用方没给 keepMine 时读它）；
 *   registerViewReset：重置视图时要跑的函数（缩放 → 适应、专注关、👁UI 关……）。kind = 'view' 是视图▾ → 重置视图，'all' 是全部重新开始。
 * 同名再登记会覆盖（热更新后重跑）。
 */

let keepMineFn: () => boolean = () => false;
const resets = new Map<string, (kind: 'view' | 'all') => void>();

export function registerKeepMine(f: () => boolean) {
  keepMineFn = f;
}

/** 「保留我的改动」现在开着没有 */
export function keepMineDefault(): boolean {
  try { return !!keepMineFn(); } catch { return false; }
}

export function registerViewReset(name: string, f: (kind: 'view' | 'all') => void) {
  resets.set(name, f);
}

export function runViewResets(kind: 'view' | 'all') {
  for (const f of resets.values()) {
    try { f(kind); } catch (e) { console.warn('重置视图时出错', e); }
  }
}
