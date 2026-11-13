import type { Rect } from '../paint';

/*
 * 元素锁扣的纯几何与拓扑（M12b-05，§2）：compose/hud.ts（画布排位）、export/godotLayout.ts（Godot 布局）、sys/check.ts（C-dock-cycle）共用同一份，
 * 不依赖主题 / 元素注册表（sys/check.ts 在解析阶段就要用）。B6 审查修复 ①：原来 check.ts 自己另抄了一份成环判断，与排位的口径不一致
 */

/** 停靠的边（elx.dockSide）：right / left / below / above / flankL / flankR（两翼，竖向居中）/ end（条形宿主的右端上方）/ cornerTL…BR（压在宿主的一个角上） */
export const DOCK_SIDES = ['right', 'left', 'below', 'above', 'flankL', 'flankR', 'end', 'cornerTL', 'cornerTR', 'cornerBL', 'cornerBR'] as const;
/** 每种边没选 elx.dockAlign 时的对齐：两翼居中、条端靠右，其余贴宿主的起边（左 / 上） */
export const dockAlignDefault = (side: string) => (side === 'flankL' || side === 'flankR' ? 'center' : side === 'end' ? 'end' : 'start');
/**
 * 停靠者的矩形（M12b-05 ①）：宿主矩形 h、停靠者尺寸 s、边 side、间距 gap、对齐 align（start / center / end：左右停靠按竖向、上下停靠按横向）。纯函数
 */
export function dockRect(h: Rect, s: { w: number; h: number }, side: string, gap: number, align: string): Rect {
  const ax = (a: string) => (a === 'center' ? h.x + (h.w - s.w) / 2 : a === 'end' ? h.x + h.w - s.w : h.x);
  const ay = (a: string) => (a === 'center' ? h.y + (h.h - s.h) / 2 : a === 'end' ? h.y + h.h - s.h : h.y);
  switch (side) {
    case 'left': case 'flankL': return { x: h.x - gap - s.w, y: ay(align), w: s.w, h: s.h };
    case 'below': return { x: ax(align), y: h.y + h.h + gap, w: s.w, h: s.h };
    case 'above': return { x: ax(align), y: h.y - gap - s.h, w: s.w, h: s.h };
    case 'end': return { x: ax(align), y: h.y - gap - s.h, w: s.w, h: s.h };
    case 'cornerTL': return { x: h.x - s.w / 2, y: h.y - s.h / 2, w: s.w, h: s.h };
    case 'cornerTR': return { x: h.x + h.w - s.w / 2, y: h.y - s.h / 2, w: s.w, h: s.h };
    case 'cornerBL': return { x: h.x - s.w / 2, y: h.y + h.h - s.h / 2, w: s.w, h: s.h };
    case 'cornerBR': return { x: h.x + h.w - s.w / 2, y: h.y + h.h - s.h / 2, w: s.w, h: s.h };
    default: return { x: h.x + h.w + gap, y: ay(align), w: s.w, h: s.h };
  }
}
/** 一项停靠：停靠者 → 宿主（元素 id 或实例 id），边 / 间距（px@1080p 已换算）/ 对齐 / 宿主的第几个成员格（1 起，0 = 整个元素） */
export interface DockSpec { id: string; host: string; side: string; gap: number; align: string; slot: number; /** 跟着宿主的当前成员走（elx.dockFollow = active，M12b-63 收 octopath#13） */ follow?: boolean; /** 宿主与停靠者之间的连接梁（elx.dockConnector，M12b-63 收 frostpunk#0） */ link?: string }
/**
 * 停靠的拓扑序（M12b-05 ①）：先放宿主再放停靠者；宿主不在场（不在 cnt.elements / 画在点上 / 挂世界点）的不停靠；成环的整环都不停靠（cycles 报出来，sys/check.ts 的 C-dock-cycle）。
 * B6 审查修复 ①：只有环上的元素算成环——停向环上某个元素的（A → B、B ↔ C）不在环里，照常停在它的宿主旁（宿主自己回到锚点）；原来顺着链走过的都记成环，A 也被扔回锚点。
 * 返回按拓扑序排好的有效停靠与成环的 id。纯函数（godotLayout 与检查共用）
 */
export function dockOrder(specs: DockSpec[], present: (id: string) => boolean): { order: DockSpec[]; cycles: string[] } {
  const by = new Map(specs.filter((s) => s.host !== s.id && present(s.host)).map((s) => [s.id, s]));
  const cycles = new Set<string>();
  for (const s of by.values()) {
    const seen = [s.id];
    let h = s.host;
    while (by.has(h)) {
      const at = seen.indexOf(h);
      if (at >= 0) { for (const x of seen.slice(at)) cycles.add(x); break; }
      seen.push(h); h = by.get(h)!.host;
    }
  }
  for (const c of cycles) by.delete(c);
  // 同一宿主、同一边（同一成员格、同样跟不跟当前成员）的几个停靠者（终期审查修复 ㉔：原来每个都按宿主的矩形算、落在同一处，后一个整块压在前一个上）：
  // 按 cnt.elements 的顺序依次往外排——后一个停靠在前一个上（上 / 下 / 左 / 右 / 两翼 / 条端：同一边再往外；压角的：沿那条边往里排在前一个旁边、竖向居中），
  // 不再按成员格 / 当前成员（前一个已经在那一格旁了）。画布与 Godot 的 DOCKS 同一份
  const lastOn = new Map<string, string>();
  for (const s of [...by.values()]) {
    const k = `${s.host}|${s.side}|${s.slot}|${s.follow ? 'f' : ''}`, prev = lastOn.get(k);
    lastOn.set(k, s.id);
    if (!prev) continue;
    const side = s.side === 'cornerTL' || s.side === 'cornerBL' ? 'right' : s.side === 'cornerTR' || s.side === 'cornerBR' ? 'left' : s.side;
    const { follow: _f, ...rest } = s;
    by.set(s.id, { ...rest, host: prev, side, slot: 0, align: side !== s.side ? 'center' : s.align });
  }
  const order: DockSpec[] = [], done = new Set<string>();
  const visit = (s: DockSpec) => { if (done.has(s.id)) return; const hs = by.get(s.host); if (hs) visit(hs); done.add(s.id); order.push(s); };
  for (const s of by.values()) visit(s);
  return { order, cycles: [...cycles] };
}
