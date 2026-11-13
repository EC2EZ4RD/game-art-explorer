import { withAlpha } from '../material';
import { drawBox, resolveColor, type Rect } from '../paint';
import type { ElCtx } from '../elements/core';

/*
 * 贴边条（M12a-16，§2 的 drawEdgeBar）：lay.hudOrg = edgeBar / console / inMargin 的整条底板、同锚点共用底条（elx.stackDir = rowBar），
 * 以及模板顶栏 flow.chrome = statusBar 共用这一种画法——先排位（edgeBarPlan：起 / 中 / 末三段，段里一格一格，格里几项并排），再画（drawEdgeBar：底板 + 1px 分隔线 + 每项的画法）。
 * 底板 = 部件 hudBar 的盒子（theme.ts 的 t.hudBar：面板副本、底色 col.surface2；@hudBar 可单独覆盖），小控件口径：不带阴影、饰件、外框素材、前景特效。
 * Godot：锚到边的 PanelContainer（hudBar 类型变体）+ HBoxContainer / VBoxContainer，三段之间 VSeparator / HSeparator。
 */

export type BarSide = 'start' | 'center' | 'end';
/** 一项：尺寸 + 可选的画法（局内 HUD 的元素由 drawElements 自己画，这里只排位；模板顶栏的字段带 draw） */
export interface BarItem { w: number; h: number; draw?: (r: Rect) => void }
/** 一格：几项并排（lay.edgeBarSlots 的 "a|b"） */
export interface BarSlot { items: BarItem[] }
export interface BarSegment { side: BarSide; slots: BarSlot[] }
export interface EdgePlan {
  bar: Rect;
  vertical: boolean;
  /** [段][格][项] 的矩形（与输入同序） */
  rects: Rect[][][];
  /** 1px 分隔线 */
  dividers: Rect[];
  /** 底座（console）两端加高的仪表盒 */
  boxes: Rect[];
}

/**
 * 排位：bar = 整条底板；content = 条内放东西的区域（横条：x 取安全区以内、y 取底板去掉留白；竖条反过来）；
 * 横条三段——起段贴 content 左缘、末段贴右缘、中段在中间（夹在两段之间），格与格之间 gap；竖条三段从上到下。
 * divide = slots：每格之间画分隔线（给了 lay.edgeBarSlots）；segments：只在中段两侧画（段间分隔）
 */
export function edgeBarPlan(bar: Rect, content: Rect, vertical: boolean, segs: BarSegment[], gap: number, divide: 'slots' | 'segments'): EdgePlan {
  const slotLen = (s: BarSlot) => (vertical ? Math.max(0, ...s.items.map((i) => i.h)) : s.items.reduce((a, i) => a + i.w, 0) + gap * Math.max(0, s.items.length - 1));
  const segLen = (g: BarSegment) => g.slots.reduce((a, s) => a + slotLen(s), 0) + gap * Math.max(0, g.slots.length - 1);
  const c0 = vertical ? content.y : content.x, cl = vertical ? content.h : content.w;
  const byS = (side: BarSide) => segs.find((g) => g.side === side && g.slots.length);
  const st = byS('start'), md = byS('center'), en = byS('end');
  const startEnd = st ? c0 + segLen(st) : c0, endStart = en ? c0 + cl - segLen(en) : c0 + cl;
  const pos = new Map<BarSegment, number>();
  if (st) pos.set(st, c0);
  if (en) pos.set(en, endStart);
  if (md) { const L = segLen(md); pos.set(md, Math.max(startEnd + gap, Math.min(endStart - gap - L, c0 + (cl - L) / 2))); }
  const dividers: Rect[] = [];
  const line = (p: number) => dividers.push(vertical ? { x: bar.x + 4, y: Math.round(p), w: bar.w - 8, h: 1 } : { x: Math.round(p), y: bar.y + 4, w: 1, h: bar.h - 8 });
  const rects = segs.map((g) => {
    let p = pos.get(g) ?? c0;
    return g.slots.map((s, si) => {
      if (si > 0 && divide === 'slots') line(p - gap / 2);
      const len = slotLen(s);
      // 竖条：一格里并排的几项在条宽里居中；横条：从这一格的起点往右排
      let q = vertical ? content.x + (content.w - s.items.reduce((a, i) => a + i.w, 0) - gap * Math.max(0, s.items.length - 1)) / 2 : p;
      const out = s.items.map((it) => {
        const r: Rect = vertical
          ? { x: q, y: p + (len - it.h) / 2, w: it.w, h: it.h }
          : { x: q, y: content.y + (content.h - it.h) / 2, w: it.w, h: it.h };
        q += it.w + gap;
        return r;
      });
      p += len + gap;
      return out;
    });
  });
  if (md && pos.has(md)) {
    const a = pos.get(md)!, L = segLen(md);
    if (st) line(a - gap / 2);
    if (en) line(a + L + gap / 2);
  } else if (divide === 'slots' && st && en) line((startEnd + endStart) / 2);
  return { bar, vertical, rects, dividers, boxes: [] };
}

/** 分隔线颜色：col.border 给了就用它，否则面板描边色，再没有是字色 30%（与模板分栏线 dividerLine 同口径） */
export function barDividerColor(e: ElCtx): string {
  const bc = e.v.str('col.border', 'auto');
  const b = e.t.hudBar?.border ?? e.t.panel.border;
  return bc && bc !== 'auto' ? resolveColor(bc, e.pal) : b ? resolveColor(b.color, e.pal) : withAlpha(e.text, 0.3);
}

/** 部件 hudBar 的底板（小控件口径）：贴边条、底座的仪表盒、边框、同锚点共用底条都画它 */
export function hudBarBox(e0: ElCtx, r: Rect) {
  const e = e0.part('hudBar');
  const p = e.t.hudBar ?? e.t.panel;
  drawBox(e.g, r, { ...p, shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0 }, e.pal);
}

/** 画：底板（与仪表盒）+ 分隔线 + 带画法的项（items 顺序与 plan.rects 一致） */
export function drawEdgeBar(e0: ElCtx, plan: EdgePlan, segs?: BarSegment[]) {
  const e = e0.part('hudBar');
  hudBarBox(e0, plan.bar);
  for (const b of plan.boxes) hudBarBox(e0, b);
  const g = e.g;
  g.save();
  g.fillStyle = barDividerColor(e);
  for (const d of plan.dividers) g.fillRect(d.x, d.y, d.w, d.h);
  g.restore();
  if (segs) segs.forEach((sg, i) => sg.slots.forEach((s, j) => s.items.forEach((it, k) => { const r = plan.rects[i]?.[j]?.[k]; if (it.draw && r) it.draw(r); })));
}
