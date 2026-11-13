import type { Rect } from '../paint';

/*
 * HUD 占位表（M12a-17，§2 的 Occupancy）：一帧里屏幕上谁占了哪块——锚点元素、贴边条（lay.hudOrg）、触屏层、模板已画的区域（页头 / 主体 / 数据区 / 按钮行）、
 * 世界挂点元素投影后的包围盒、玩家投影点外扩的软禁区、合规层文字。每项记矩形、优先级、能不能挪、种类。
 * compose/hud.ts 的排位按它避让（先横向收、不越过中线，见 drawElements），世界挂点元素落进禁区时隐藏，合规层（screen.ts 的 drawOps）读最近一次的表换位置；
 * B8 的世界挂点（elx.occlusion）、B9 的浮动详情（placeFloating 的 avoid）也查这张表。
 * Godot：运行时布局脚本 HudLayout.gd 每帧按同一张表算（迁移说明见 godotHud.ts 的 b7Notes）。
 */

export type OccKind = 'element' | 'edgeBar' | 'touch' | 'template' | 'world' | 'player' | 'compliance';
export type TemplateSub = 'header' | 'data' | 'buttons' | 'detail' | 'focal' | 'companion' | 'ear';
export interface OccItem {
  rect: Rect;
  /** 优先级（primary 2 / secondary 1 / ambient 0；贴边条、触屏层、模板区域按 3 算：谁都挪不动它们） */
  prio: number;
  /** 避让时能不能挪它 */
  movable: boolean;
  kind: OccKind;
  /** 元素 id（kind = element / world） */
  id?: string;
  /** 模板区域的子类（kind = template，M12b-64）：页头行 / 数据条目 / 按钮行 / 常驻详情 / 主体 / 陪衬立绘位 */
  sub?: TemplateSub;
  /** 软禁区（玩家位置）：只有打开了 elx.avoidPlayer 的元素躲它，查询时默认跳过 */
  soft?: boolean;
  /** 弹出模板垫底的局内 HUD（压暗在模板后面，审查修复 A · L15）：浮动详情不躲它；矩形已按 pushBack 的缩放换算 */
  under?: boolean;
}

/** 两个矩形是否相交（eps：贴边 1 像素不算） */
export const intersects = (a: Rect, b: Rect, eps = 1) => a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
/** 相交面积（不相交为 0） */
export const overlapArea = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
/** 外扩 n（四边） */
export const inflateRect = (a: Rect, n: number): Rect => ({ x: a.x - n, y: a.y - n, w: a.w + n * 2, h: a.h + n * 2 });

export class Occupancy {
  readonly items: OccItem[] = [];
  add(rect: Rect, o: Omit<OccItem, 'rect' | 'prio' | 'movable'> & { prio?: number; movable?: boolean }): OccItem {
    const it: OccItem = { rect, prio: o.prio ?? 1, movable: o.movable ?? false, kind: o.kind, id: o.id, soft: o.soft, ...(o.sub ? { sub: o.sub } : {}) };
    this.items.push(it);
    return it;
  }
  /** 与 rect 相交的项（默认跳过软禁区；skip = 不算的项，比如自己） */
  hits(rect: Rect, o: { soft?: boolean; skip?: (it: OccItem) => boolean } = {}): OccItem[] {
    return this.items.filter((it) => (o.soft || !it.soft) && !o.skip?.(it) && intersects(rect, it.rect));
  }
  /** rect 这块是不是空的（同 hits 的口径） */
  free(rect: Rect, o: { soft?: boolean; skip?: (it: OccItem) => boolean } = {}): boolean {
    return !this.items.some((it) => (o.soft || !it.soft) && !o.skip?.(it) && intersects(rect, it.rect));
  }
  /** 所有不可挪的硬禁区（贴边条、触屏层、模板区域） */
  fixed(): OccItem[] { return this.items.filter((it) => !it.movable && !it.soft); }
}

/**
 * 最近一次排位的占位表（HudSystem 每次合成前清空）：drawOps 的合规层避让读它；没有按元素排版时为 null（合规层照原来的位置画）。
 * 一帧里可能排好几次（模板里按锚点空间分组、垫底的局内 HUD），都记进同一张表
 */
export const OCC: { last: Occupancy | null } = { last: null };
export const resetOccupancy = () => { OCC.last = null; };
/** 这一帧的表（没有就新建一张） */
export const frameOccupancy = () => (OCC.last ??= new Occupancy());
