import { withAlpha } from '../material';
import { boxPath, drawBox, logTarget, paintScale, QUALITY, type Rect } from '../paint';
import { drawPadlock } from '../glyphs';
import { avatar, chosen, chosenKey, cornerOf, DATA, drawNumber, icon, itemIcon, LH, lineColor, numberWidth, onAccent, pickedStr, plate, shapeStyle, silhouetteOf, slot, T, tap, W, type ElCtx } from './core';
import { contrastRatio, mix, parseColor, rgba } from '../material';

/*
 * 节点（M12a-29，原来是 compose/screen.ts 里的 drawNode）：路线图、关卡路径、技能树 / 科技树、星图、地图上的点都走这里。
 * 画法 cmp.node：circleNumber 编号圆 / avatar 头像 / building 图标格（建筑、科技）/ chest 宝箱 / block 等距方块 / glowDot 发光点 / pin 图钉 / grace 发光图标。
 * 外形读 vis.silhouette@node（shapeStyle，默认：编号圆是圆、图标格跟面板转角）；三态色走颜色角色（sys/theme.ts 的 Roles）：
 *   完成 = col.accent@node（作用域强调色）或 col.nodeDone（auto = 好色），当前 = col.focus（显式给了才换，否则强调色），外圈与字用 onAccent，锁定 = 字色 35%；
 * st.done / st.locked 显式选了时在节点上叠完成 / 锁定记号（勾、章、灰化、划线、角标 / 挂锁、问号、剪影）。
 * Godot：节点 = 子场景（TextureButton + 三态 theme variation，HudRoles 的 done / current / locked 颜色常量）。
 */

export type NodeState = 'done' | 'current' | 'locked';
export interface NodeSpec {
  /** 画法（cmp.node 的取值） */
  kind: string;
  /** 序号（编号圆写 i + 1，图标格按序号取包里的建筑 / 科技符号） */
  i: number;
  state: NodeState;
  /** 图标格的符号（不给时按序号取 DATA.tools） */
  type?: string;
  /** 编号圆上的字（路线图的单字；不给时写序号）；图标格没给 type 时也画它 */
  label?: string;
  cost?: string;
  level?: string;
  progress?: number;
  /** 类型色（M12a-30：地图节点在 col.coding 含 lineId 时按类型轮流着色）：给了时代替完成 / 当前的颜色（锁定照旧） */
  color?: string;
  /** 类型序号（R4 C2 ⑥，cult-of-the-lamb#43）：路线图 = 路线单字的类型（战 / 店 / 营……）、地图 = 筛选类别；类型圆章的图标按它取类别色（col.coding = lineId 的类别色表） */
  ti?: number;
  /** 尺寸倍数（M12b-24：路线图的 Boss / 放射树的根放大、挤的图整体缩小）；不给 = 1 */
  scale?: number;
  /** 版式节点的数据（M12b-23，样本 = 内容包的天赋 talents：名字、当前级 / 上限、花费、解锁图标、进度 0~1） */
  name?: string;
  lv?: number;
  max?: number;
  unlocks?: string[];
  /** 当前位置标记（lay.currentMarker）由调用方另画（M12b-25：地图路线上的头像挂在路线上，节点本身不再画） */
  noMarker?: boolean;
}

/** 画一个节点，返回它占的矩形（之后的避让 / 命中登记用） */
export function drawNode(e0: ElCtx, x: number, y: number, node: NodeSpec): Rect {
  // 节点部件：三态颜色、外形与节点上的字按 @node 查（M12a-01）
  const e = e0.part('node');
  const S = (n: number) => n * e.k, g = e.g;
  const { kind, i, state } = node;
  const rad0 = Math.max(S(state === 'current' ? 20 : 16), tap(e) / 2), rad = node.scale ? rad0 * node.scale : rad0;
  const box = { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 };
  // 三态色（M12a-02 / 29）：完成 = 作用域强调色或 col.nodeDone（auto = 好色），当前 = 焦点色 / 强调色，锁定 = 字色 35%
  const c = state === 'locked' ? e.th.roles.locked : node.color ?? (state === 'current' ? e.th.roles.current : e.fill(0, 'done'));
  // 外形：选了 vis.silhouette@node 时按它（box = 跟转角、hexagon、diamond……），没选时各画法原来的外形
  const sil = silhouetteOf(e0, 'node');
  const shaped = sil && sil !== 'circle' ? shapeStyle(e0, 'node', cornerOf(e.t.panel), box, 0) : null;
  // 完成 / 锁定记号（st.done / st.locked）：显式选了才叠（默认兜底的「绿勾」「锁」不画——节点原来不读这两个参数）
  const doneK = state === 'done' ? chosenKey(e, 'st.done') : null, lockK = state === 'locked' ? chosenKey(e, 'st.locked') : null;
  const doneMode = doneK ? e.r.str(doneK, 'check') : '';
  const lockMode = lockK ? e.r.str(lockK, 'lock') : '';
  const gray = doneMode === 'grayOut' || lockMode === 'grayscale';
  if (gray) { g.save(); g.globalAlpha *= 0.5; g.filter = 'grayscale(1)'; }
  const label = lockMode === 'question' || lockMode === 'hiddenText' ? '?' : node.label ?? String(i + 1);
  switch (kind) {
    case 'chest': slot(e, box, '▣', { locked: state === 'locked' }); break;
    case 'avatar': avatar(e, x, y, rad, String(i + 1), c); break;
    // 发光点的光晕半径 1.6 倍：返回的矩形按光晕算（M12b-14，frostpunk#35：浮动详情原来按 2 × 半径的框避让，说明框压在光斑上）
    case 'glowDot': {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad * 1.6); gr.addColorStop(0, c); gr.addColorStop(1, withAlpha(c, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad * 1.6, 0, Math.PI * 2); g.fill();
      // 品质下限（审查修复 · 实测补看：浅色皮肤上技能树只剩一团团糊开的光斑）：光晕中间画一颗实心核 + 一圈细边，节点的位置和状态一眼看得出
      if (QUALITY.on) { const k = rad * (state === 'current' ? 0.55 : 0.42); g.fillStyle = c; g.beginPath(); g.arc(x, y, k, 0, Math.PI * 2); g.fill(); g.strokeStyle = state === 'current' ? '#ffffff' : withAlpha('#000', 0.45); g.lineWidth = Math.max(1, S(1.5)); g.stroke(); }
      box.x = x - rad * 1.6; box.y = y - rad * 1.6; box.w = box.h = rad * 3.2; break;
    }
    case 'block': g.fillStyle = c; g.beginPath(); g.moveTo(x, y - rad); g.lineTo(x + rad, y - rad * 0.4); g.lineTo(x, y + rad * 0.2); g.lineTo(x - rad, y - rad * 0.4); g.closePath(); g.fill(); break;
    case 'pin': {
      // 图钉（M12b-66 ⑧，control#31）：选了 vis.silhouette@node（diamond / hexagon……）时画成那个外形的标记（原来总是水滴）；当前节点（目标）用任务色 col.quest
      // （auto = 原来的金色；旧皮肤要皮肤之后选过 cmp.node），不再跟完成色一起变白
      const pc = state === 'current' && !node.color && (!e.th.legacy || chosen(e0, 'cmp.node')) ? e.th.roles.objective : c;
      if (shaped && !shaped.bare) { const k = rad * 0.7, mb = { x: x - k, y: y - k, w: k * 2, h: k * 2 }; g.fillStyle = pc; g.beginPath(); boxPath(g, mb, { ...shaped, radius: typeof shaped.radius === 'number' ? Math.min(shaped.radius, k * 0.3) : shaped.radius }); g.fill(); if (state === 'current') { g.strokeStyle = withAlpha('#000', 0.6); g.lineWidth = 1.5; g.stroke(); } break; }
      g.fillStyle = pc; g.beginPath(); g.arc(x, y - rad * 0.6, rad * 0.6, Math.PI, 0); g.lineTo(x, y + rad * 0.4); g.closePath(); g.fill(); break;
    }
    case 'building': {
      // 图标格（M12a-29）：控件底 + 包里的建筑 / 科技符号；外形跟 vis.silhouette@node（默认面板转角），当前 = 焦点色描边，已完成 = 右上角完成色圆章 + 勾，锁定 = 压暗
      const cp = e.t.control ?? e.t.panel;
      const sty = shapeStyle(e0, 'node', { ...cp, shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0, radius: typeof cp.radius === 'number' ? Math.min(cp.radius, 8) : cp.radius }, box, 6);
      if (!sty.bare) drawBox(g, box, sty, e.pal);
      // 符号：调用方给的类型 → 路线图的单字（战 / 店 / 营……）→ 包里的建筑 / 科技符号
      const sym = node.type ?? node.label ?? DATA.tools[i % DATA.tools.length][0];
      if (lockMode !== 'question' && lockMode !== 'hiddenText') icon(e, sym, x, y, rad * 0.95, state === 'locked' ? withAlpha(e.text, 0.4) : state === 'current' ? c : e.icon);
      else icon(e, '?', x, y, rad, withAlpha(e.text, 0.5));
      if (state === 'current') { g.save(); g.strokeStyle = c; g.lineWidth = 2.5; g.beginPath(); boxPath(g, box, sty); g.stroke(); g.restore(); }
      if (state === 'locked') { g.save(); g.beginPath(); boxPath(g, box, sty); g.clip(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(box.x, box.y, box.w, box.h); g.restore(); }
      if (state === 'done' && !doneMode) { const br = Math.max(4, rad * 0.32), bx = box.x + box.w - br * 0.6, by = box.y + br * 0.6; g.fillStyle = c; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); icon(e, '✓', bx, by, br * 1.3, '#fff'); }
      break;
    }
    case 'grace': {
      // 发光图标（M12a-29，Elden 的赐福）：高亮色的放射光 + 星形符号；完成 = 高亮色，当前更亮更大，锁定 = 暗淡无光
      const hc = state === 'locked' ? withAlpha(e.text, 0.3) : e.fill(0, 'highlight');
      const R0 = rad * (state === 'current' ? 2 : 1.6);
      if (state !== 'locked') { const gr = g.createRadialGradient(x, y, 0, x, y, R0); gr.addColorStop(0, withAlpha(hc, 0.85)); gr.addColorStop(0.45, withAlpha(hc, 0.3)); gr.addColorStop(1, withAlpha(hc, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, R0, 0, Math.PI * 2); g.fill(); }
      icon(e, '✦', x, y, rad * 1.1, state === 'locked' ? hc : '#fff');
      break;
    }
    case 'iconRing': case 'rowCard': case 'techCard': case 'rosette': case 'iconBadge': case 'diamond': case 'plainDot': case 'inkIcon': case 'pawn': case 'token': case 'counter': case 'worldIcon': {
      const q = drawNodeKind(e, x, y, node, rad, c, lockMode === 'question' || lockMode === 'hiddenText');
      box.x = q.x; box.y = q.y; box.w = q.w; box.h = q.h;
      break;
    }
    default: {
      // 编号圆：当前节点的外圈与字用强调色底上的字色（onAccent，M12a-04 / 29；旧皮肤没换强调色时是原来的白）
      const ink = state === 'current' ? onAccent(e, { ...e.small, weight: 800 }).color ?? '#fff' : '#fff';
      const path = () => { g.beginPath(); if (shaped) boxPath(g, box, shaped); else g.arc(x, y, rad, 0, Math.PI * 2); };
      if (!shaped?.bare) { g.fillStyle = state === 'locked' ? withAlpha(e.text, 0.15) : c; path(); g.fill(); }
      if (state === 'current') { g.strokeStyle = ink; g.lineWidth = 2.5; if (shaped?.bare) path(); g.stroke(); }
      if (lockMode === 'lock') drawPadlock(g, x, y, rad * 0.95, withAlpha(e.text, 0.85));
      else T(e, label, x - W(e, label, { ...e.small, weight: 800 }) / 2, y - rad, rad * 2, { ...e.small, weight: 800, color: shaped?.bare ? e.text : state === 'current' ? ink : '#fff' });
    }
  }
  if (gray) g.restore();
  // 记号：勾（右上小勾）/ 章（外圈虚线圆）/ 划线（斜线）/ 角标（下方小牌）；锁定的挂锁 / 封印叉（编号圆以外的画法）
  const mk = rad * 0.45;
  if (doneMode === 'check' && kind !== 'building') { g.fillStyle = e.good; g.beginPath(); g.arc(x + rad * 0.75, y - rad * 0.75, mk, 0, Math.PI * 2); g.fill(); icon(e, '✓', x + rad * 0.75, y - rad * 0.75, mk * 1.4, '#fff'); }
  else if (doneMode === 'stamp') { g.save(); g.strokeStyle = withAlpha(e.bad, 0.85); g.lineWidth = 2; g.setLineDash([3, 2]); g.beginPath(); g.arc(x, y, rad * 1.25, 0, Math.PI * 2); g.stroke(); g.restore(); }
  else if (doneMode === 'strike') { g.save(); g.strokeStyle = withAlpha(e.text, 0.85); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - rad * 1.1, y + rad * 0.6); g.lineTo(x + rad * 1.1, y - rad * 0.6); g.stroke(); g.restore(); }
  // 手绘墨圈（M12b-23，slay-the-spire#33）：走过的节点外面两道略错开的墨线圈（种子 = 序号，每帧一样）
  else if (doneMode === 'inkCircle') inkCircle(g, x, y, Math.max(box.w, box.h) / 2 + S(4), e.text, i);
  // 角标：版式节点（花托的名字、类型圆章的星……）挂在它实际画出的外接框下面（B8 审查修复 ⑭：花托缩小后角标压在名字上），其余画法照旧在圆下
  else if (doneMode === 'tag') { const tw = Math.max(S(22), W(e, '✓', e.small) + S(12)), ty = LAYOUT_NODES.has(kind) ? Math.max(y + rad, box.y + box.h) : y + rad; plate(e, { x: x - tw / 2, y: ty + S(2), w: tw, h: S(14) }, '✓', 'pill', { size: S(10) }); }
  // 锁定记号：编号圆的挂锁已代替序号画过、宝箱格由 slot() 自己画；其余画法叠一把挂锁，封印叠 ✕
  if (lockMode === 'sealed') icon(e, '✕', x, y, rad, withAlpha(e.text, 0.85));
  else if (lockMode === 'lock' && kind !== 'chest' && !kindIsDefault(kind)) drawPadlock(g, x, y, rad * 0.9, withAlpha(e.text, 0.9));
  // 当前位置标记（lay.currentMarker，M12b-23，cult-of-the-lamb#38 的小羊头）：选过才画，画在当前节点正上方
  if (state === 'current' && !node.noMarker) { const mk0 = pickedStr(e0, 'lay.currentMarker', 'none'); if (mk0 !== 'none') currentMarker(e, x, box.y, Math.max(S(9), rad * 0.55), mk0); }
  logTarget(g, box, node.name ?? node.label ?? `节点 ${i + 1}`);
  return box;
}

/** 版式节点（M12b-23）的外接尺寸（scale = 1 时，设计单位 × e.k）：卡片类是矩形，花托连花瓣与名字，其余按圆 */
export function nodeFootprint(e: ElCtx, kind: string): { w: number; h: number } {
  const S = (n: number) => n * e.k, d = Math.max(S(32), tap(e));
  // 完成角标（st.done = tag）挂在外接框下面，算进高（B8 审查修复 ⑭：原来缩放只按节点本身算，角标压到下一层的 SIGNED / 名字）
  const tag = pickedStr(e.part('node'), 'st.done', '') === 'tag' ? S(16) : 0;
  if (kind === 'rowCard') return { w: S(156), h: S(44) + tag };
  if (kind === 'techCard') return { w: S(72), h: S(88) + tag };
  if (kind === 'rosette') return { w: d * 1.75, h: d * 1.75 + S(28) + tag };
  if (kind === 'iconRing') return { w: d * 1.45, h: d * 1.45 + tag };
  if (kind === 'iconBadge') return { w: d, h: d + S(10) + tag };
  // 墨色剪影 / 菱形 / 小点按实际画出的大小（B8 审查修复 ⑯：原来都按整个触控直径算，窄路线图上缩得比需要的小）
  const f = kind === 'inkIcon' || kind === 'worldIcon' ? 0.8 : kind === 'diamond' ? 0.85 : kind === 'plainDot' ? 0.75 : 1;
  return { w: d * f, h: d * f + tag };
}
/** 版式节点（M12b-23）：样本数据（名字 / 等级 / 花费 / 解锁 / 进度）只给这些 kind（原来的画法调用逐字不变） */
export const LAYOUT_NODES = new Set(['iconRing', 'rowCard', 'techCard', 'rosette', 'iconBadge', 'diamond', 'plainDot', 'inkIcon', 'pawn', 'token', 'counter', 'worldIcon']);

/**
 * 节点版式库（M12b-23）：
 *   iconRing 暗底圆 + 白色线稿图标 + 外圈一圈等级小点（黑神话）；rowCard 左侧圆图标的横长卡：名字 + 花费 / 回合 + 一行解锁小图标 + 半圆进度（Civ6 科技树）；
 *   techCard 方形科技卡：大图标 + 名字 + 底部花费，卡底按状态绿 / 黄 / 红（Factorio）；rosette 圆章 + 四周对称的叶形花托，已签署整朵强调色发光、头顶 SIGNED、下面写名字（Frostpunk 法典）；
 *   iconBadge 黑底白边圆章 + 类型图标（类型色），完成加星（Cult / FH5 / Hollow 的地图徽章）；diamond 菱形标记（Control 任务点）；plainDot 不写序号的空心 / 实心小点（Dead Space 升级节点）；
 *   inkIcon 无底的墨色剪影图标（StS 路线）；pawn 带底座的棋子、token 圆形代币、counter 兵棋方形算子（K1 fam.tabletop）；
 *   worldIcon 与世界物件同画法的地图图标（M12b-25，dont-starve#35：图集开着时画物品图集里的那一枚，否则程序符号；无底、脚下一团淡影）。
 * 颜色：c = 三态色（完成 / 当前 / 锁定；col.coding 含 lineId 时调用方给的类型色）；图标 = 节点的 type → label → 包里的建筑 / 科技符号。返回实际画出的外接矩形（占位 / 避让）
 */
function drawNodeKind(e: ElCtx, x: number, y: number, node: NodeSpec, rad: number, c: string, hide: boolean): Rect {
  const g = e.g, S = (n: number) => n * e.k, k = node.scale ?? 1, { kind, state, i } = node;
  const sym = hide ? '?' : node.type ?? node.label ?? DATA.tools[i % DATA.tools.length][0];
  const lock = state === 'locked', done = state === 'done', cur = state === 'current';
  const dim = (col: string) => (lock ? withAlpha(col, 0.4) : col);
  const circle = (r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
  switch (kind) {
    case 'iconRing': {
      g.save();
      g.fillStyle = 'rgba(14,14,16,0.88)'; circle(rad); g.fill();
      g.strokeStyle = cur ? c : withAlpha(e.text, lock ? 0.25 : 0.6); g.lineWidth = cur ? 2.5 : 1.5; circle(rad); g.stroke();
      g.restore();
      icon(e, sym, x, y, rad * 0.95, dim('#f2efe8'));
      // 等级点：上限 max 个（默认 5），当前级 lv 个点亮，沿外圈半径 1.32 排一圈
      const n = Math.max(1, Math.min(12, node.max ?? 5)), lit = Math.max(0, Math.min(n, node.lv ?? (done ? n : cur ? 1 : 0))), dr = Math.max(1.5, rad * 0.1);
      g.save();
      for (let j = 0; j < n; j++) { const t = -Math.PI / 2 + (j * Math.PI * 2) / n; g.fillStyle = j < lit ? (lock ? withAlpha(c, 0.5) : e.fill(0, 'highlight')) : withAlpha(e.text, 0.22); g.beginPath(); g.arc(x + Math.cos(t) * rad * 1.32, y + Math.sin(t) * rad * 1.32, dr, 0, Math.PI * 2); g.fill(); }
      g.restore();
      return { x: x - rad * 1.45, y: y - rad * 1.45, w: rad * 2.9, h: rad * 2.9 };
    }
    case 'rowCard': {
      const w = S(156) * k, h = S(44) * k, r = { x: x - w / 2, y: y - h / 2, w, h };
      const cp = e.t.control ?? e.t.panel;
      drawBox(g, r, { ...cp, shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0, radius: Math.min(typeof cp.radius === 'number' ? cp.radius : 6, h * 0.5) }, e.pal);
      if (lock) { g.save(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.x, r.y, r.w, r.h); g.restore(); }
      if (cur) { g.save(); g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); g.restore(); }
      // 左侧圆图标（完成 / 当前 = 状态色底，锁定 = 暗）+ 半圆进度（尤里卡：progress 0~1，没完成时沿圆的下半圈画）
      const cr = h * 0.38, cx = r.x + h * 0.48;
      g.save(); g.fillStyle = lock ? withAlpha(e.text, 0.2) : c; g.beginPath(); g.arc(cx, y, cr, 0, Math.PI * 2); g.fill(); g.restore();
      icon(e, sym, cx, y, cr * 1.1, lock ? withAlpha('#fff', 0.5) : '#fff');
      if (!done && node.progress !== undefined && node.progress > 0) { g.save(); g.strokeStyle = e.fill(1, 'highlight'); g.lineWidth = Math.max(2, cr * 0.18); g.beginPath(); g.arc(cx, y, cr + g.lineWidth, Math.PI / 2, Math.PI / 2 + Math.PI * Math.min(1, node.progress)); g.stroke(); g.restore(); }
      const tx = cx + cr + S(6) * k, nO = { ...e.small, size: e.small.size * Math.max(0.75, k), weight: 700, color: dim(e.text) };
      const name = node.name ?? node.label ?? sym;
      T(e, name, tx, r.y + S(3) * k, LH(e, nO), nO);
      const sO = { ...e.small, size: e.small.size * 0.85 * Math.max(0.75, k), color: withAlpha(e.text, lock ? 0.35 : 0.7) };
      // 花费经 drawNumber（B8 审查修复 ⑪：与方形科技卡、列表行的升级格同口径，typ.numerals.* 也作用到横长卡；混排的「2 核心」只换数字段）
      if (node.cost) drawNumber(e, node.cost, tx, r.y + h - LH(e, sO) - S(3) * k, LH(e, sO), sO);
      // 解锁图标行（右下最多 3 个）
      const un = (node.unlocks ?? []).slice(0, 3), us = Math.min(h * 0.32, S(13) * k);
      un.forEach((u, j) => icon(e, u, r.x + w - S(6) * k - us / 2 - j * (us + S(3) * k), r.y + h - us * 0.75 - S(3) * k, us, withAlpha(e.text, lock ? 0.35 : 0.8)));
      return r;
    }
    case 'techCard': {
      const w = S(72) * k, h = S(88) * k, r = { x: x - w / 2, y: y - h / 2, w, h };
      const cp = e.t.control ?? e.t.panel;
      drawBox(g, r, { ...cp, shadows: [], ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: 0, radius: Math.min(typeof cp.radius === 'number' ? cp.radius : 4, 4) }, e.pal);
      // 卡底按状态：已研究 = 好色、可研究（当前）= 警告色、不可研究（锁定）= 坏色
      const band = h * 0.26, bc = done ? e.good : cur ? e.warn : e.bad;
      g.save(); g.fillStyle = withAlpha(bc, 0.85); g.fillRect(r.x, r.y + h - band, w, band); g.restore();
      icon(e, sym, x, r.y + h * 0.34, Math.min(w, h) * 0.42, lock ? withAlpha(e.icon, 0.55) : e.icon);
      // 名字（B8 审查修复 ⑯）：字号至少 0.75 × 小字、再按卡宽收；缩到 0.6 以下的卡或收完仍不到 0.55 × 小字时不写（原来字号 = 卡高 × 0.13，40 张卡时 4.6 设计单位）
      const name = node.name ?? sym, n0 = { ...e.small, size: Math.max(e.small.size * 0.75, Math.min(e.small.size, h * 0.13)), color: e.text };
      const nO = { ...n0, size: n0.size * Math.min(1, (w - 4) / Math.max(1, W(e, name, n0))) };
      if (k >= 0.6 && nO.size >= e.small.size * 0.55) T(e, name, x - Math.min(W(e, name, nO), w - 4) / 2, r.y + h * 0.6, LH(e, nO), nO);
      // 花费（科技包 × 数量，factorio#33）：「200 红瓶」画成一枚瓶色圆点 + ×200（瓶色按名字的首字：红 / 绿 / 蓝 / 黄 / 白），别的写法照旧整串；数字经 drawNumber
      const cO = { ...e.small, size: Math.min(e.small.size, band * 0.6), weight: 700, color: '#fff' }, cs = node.cost ?? '1';
      const pack0 = /^(\d[\d,.]*)\s*(\S.*)$/.exec(cs), cy = r.y + h - band + (band - LH(e, cO)) / 2;
      if (pack0) {
        const num = `×${pack0[1]}`, dot = Math.min(band * 0.26, S(6) * k), cw = dot * 2.6 + numberWidth(e, num, cO), x0 = x - cw / 2;
        g.save(); g.fillStyle = PACK_COLORS[[...pack0[2]][0]] ?? e.accent; g.strokeStyle = withAlpha('#000', 0.55); g.lineWidth = 1; g.beginPath(); g.arc(x0 + dot, r.y + h - band / 2, dot, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        drawNumber(e, num, x0 + dot * 2.6, cy, LH(e, cO), cO);
      } else { const cw = numberWidth(e, cs, cO); drawNumber(e, cs, x - cw / 2, cy, LH(e, cO), cO); }
      if (cur) { g.save(); g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(r.x - 1, r.y - 1, w + 2, h + 2); g.restore(); }
      return r;
    }
    case 'rosette': {
      // 花托：8 片叶形花瓣（两段二次曲线的尖叶），完成 = 强调色整朵发光，当前（可签署）= 银色描边空心，锁定 = 几乎透明
      const pc = done ? e.accent : cur ? '#cfd6dc' : withAlpha(e.text, 0.22), petals = 8, r0 = rad * 1.02, r1 = rad * 1.7;
      g.save();
      // 光晕按画布缩放（与 paint.ts 的阴影同口径）；8 片花瓣并成一条路径、一次填 / 描（B8 审查修复 ㉓：原来逐片 fill，签过的节点每个 8 遍模糊）
      if (done) { g.shadowColor = e.accent; g.shadowBlur = rad * 0.6 * paintScale(g); }
      g.beginPath();
      for (let j = 0; j < petals; j++) {
        const t = -Math.PI / 2 + (j * Math.PI * 2) / petals, ct = Math.cos(t), st = Math.sin(t), nx = -st, ny = ct, wv = rad * 0.32;
        const bx = x + ct * r0, by = y + st * r0, tx = x + ct * r1, ty = y + st * r1, mx = x + (ct * (r0 + r1)) / 2, my = y + (st * (r0 + r1)) / 2;
        g.moveTo(bx, by); g.quadraticCurveTo(mx + nx * wv, my + ny * wv, tx, ty); g.quadraticCurveTo(mx - nx * wv, my - ny * wv, bx, by); g.closePath();
      }
      if (cur) { g.strokeStyle = pc; g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = pc; g.fill(); }
      g.shadowBlur = 0;
      g.fillStyle = done ? mix(e.accent, '#000', 0.55) : 'rgba(10,14,20,0.85)'; circle(rad); g.fill();
      g.strokeStyle = done ? e.accent : cur ? '#cfd6dc' : withAlpha(e.text, 0.25); g.lineWidth = cur ? 2 : 1.5; circle(rad); g.stroke();
      g.restore();
      icon(e, sym, x, y, rad * 0.95, done ? '#fff' : cur ? '#e8eef2' : withAlpha(e.text, 0.35));
      // SIGNED 与名字跟着节点缩（B8 审查修复 ⑭：原来花托缩到 0.4 时字照旧整号，名字比节点宽一倍、压到邻居）：字号 × clamp(k, 0.7, 1)，名字再按 1.35 倍花托宽收；
      // 节点缩到 0.6 以下、或名字收完不到 0.55 × 小字时不写名字
      const tk = Math.max(0.7, Math.min(1, k)), sO = { ...e.small, size: e.small.size * 0.75 * tk, weight: 700, color: e.warn };
      const signed = done && W(e, 'SIGNED', sO) <= r1 * 2.6;
      if (signed) T(e, 'SIGNED', x - W(e, 'SIGNED', sO) / 2, y - r1 - LH(e, sO), LH(e, sO), sO);
      const n0 = node.name && k >= 0.6 ? { ...e.small, size: e.small.size * tk, color: lock ? withAlpha(e.text, 0.4) : e.text } : null;
      const nO = n0 && node.name ? { ...n0, size: n0.size * Math.min(1, (r1 * 2 * 1.35) / Math.max(1, W(e, node.name, n0))) } : null;
      const name = nO && nO.size >= e.small.size * 0.55 ? node.name : undefined;
      if (name && nO) T(e, name, x - W(e, name, nO) / 2, y + r1 + S(2) * tk, LH(e, nO), nO);
      const nw = name && nO ? Math.max(r1 * 2, W(e, name, nO)) : r1 * 2;
      return { x: x - nw / 2, y: y - r1 - (signed ? LH(e, sO) : 0), w: nw, h: r1 * 2 + (signed ? LH(e, sO) : 0) + (name && nO ? LH(e, nO) + S(2) * tk : 0) };
    }
    case 'iconBadge': {
      // 黑底白边圆章 + 类型图标；完成后章下加 1–3 颗星（按等级）。R4 C2 ⑥（cult-of-the-lamb#43）：图标按类型色（类别色表按 node.ti → 调用方给的类型色）→ 字色，
      // 不再用三态色（锁定的三态色 = 字色 35% 再 × 0.45，近黑压在黑章上读不出）；未到达的只压暗外圈（白 35%）、图标往章底收三成，图标与章底的对比不低于 3 : 1
      g.save();
      g.fillStyle = BADGE; circle(rad); g.fill();
      g.strokeStyle = lock ? withAlpha('#fff', 0.35) : cur ? c : '#f4f1ea'; g.lineWidth = cur ? 3 : 2; circle(rad - 1); g.stroke();
      g.restore();
      const tc = (node.ti !== undefined ? lineColor(e, node.ti) : null) ?? node.color ?? e.text;
      icon(e, sym, x, y, rad * 1.05, inkOn(lock ? mix(tc, BADGE, 0.3) : tc, BADGE, 3));
      let bh = 0;
      if (done) { const n = Math.max(1, Math.min(3, node.lv ?? 1)), sr = Math.max(3, rad * 0.24); for (let j = 0; j < n; j++) star(g, x + (j - (n - 1) / 2) * sr * 2.2, y + rad + sr * 1.3, sr, e.fill(0, 'highlight')); bh = sr * 2.6; }
      return { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 + bh };
    }
    case 'diamond': {
      // 菱形标记：当前 / 目标 = 任务色（col.quest），完成 = 完成色，锁定 = 空心
      const d = rad * 0.85, col = cur ? e.th.roles.objective : c;
      g.save(); g.beginPath(); g.moveTo(x, y - d); g.lineTo(x + d, y); g.lineTo(x, y + d); g.lineTo(x - d, y); g.closePath();
      if (lock) { g.strokeStyle = withAlpha(e.text, 0.5); g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = col; g.fill(); g.strokeStyle = withAlpha('#000', 0.45); g.lineWidth = 1; g.stroke(); }
      g.restore();
      return { x: x - d, y: y - d, w: d * 2, h: d * 2 };
    }
    case 'plainDot': {
      // 不写序号的小点：已装 / 完成 = 实心、当前 = 实心 + 外圈、未装 = 空心
      const d = Math.max(S(5), rad * 0.42);
      g.save();
      circle(d);
      if (lock) { g.strokeStyle = withAlpha(e.text, 0.65); g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = c; g.fill(); }
      if (cur) { g.strokeStyle = c; g.lineWidth = 1.5; circle(d * 1.7); g.stroke(); }
      g.restore();
      return { x: x - d * 1.7, y: y - d * 1.7, w: d * 3.4, h: d * 3.4 };
    }
    case 'inkIcon': {
      // 无底的墨色剪影：字色画符号（当前略大），锁定淡一半
      const s = rad * (cur ? 1.5 : 1.25);
      icon(e, sym, x, y, s, lock ? withAlpha(e.text, 0.45) : e.text);
      return { x: x - s * 0.6, y: y - s * 0.6, w: s * 1.2, h: s * 1.2 };
    }
    case 'worldIcon': {
      // 地图上的世界物件图标（M12b-25，dont-starve#35）：图集物件（ast.iconSet = asset 时 itemIcon）→ 程序符号；无底，脚下一团椭圆淡影，锁定淡一半、当前略大
      const s = rad * (cur ? 1.45 : 1.2);
      g.save(); g.fillStyle = withAlpha('#000', lock ? 0.15 : 0.3); g.beginPath(); g.ellipse(x, y + s * 0.42, s * 0.42, s * 0.14, 0, 0, Math.PI * 2); g.fill(); g.restore();
      if (lock) { g.save(); g.globalAlpha *= 0.5; }
      if (hide || !itemIcon(e, sym, x, y, s * 0.85)) icon(e, sym, x, y, s, lock ? withAlpha(e.icon, 0.6) : e.icon);
      if (lock) g.restore();
      return { x: x - s * 0.6, y: y - s * 0.6, w: s * 1.2, h: s * 1.2 };
    }
    case 'pawn': {
      // 棋子：圆头 + 梯形身 + 椭圆底座（状态 / 类型色），深色描边
      const col = lock ? withAlpha(c, 0.45) : c;
      g.save(); g.fillStyle = col; g.strokeStyle = withAlpha('#000', 0.55); g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(x, y + rad * 0.72, rad * 0.78, rad * 0.24, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - rad * 0.55, y + rad * 0.62); g.lineTo(x - rad * 0.22, y - rad * 0.2); g.lineTo(x + rad * 0.22, y - rad * 0.2); g.lineTo(x + rad * 0.55, y + rad * 0.62); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(x, y - rad * 0.45, rad * 0.36, 0, Math.PI * 2); g.fill(); g.stroke();
      if (cur) { g.strokeStyle = e.th.roles.current; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + rad * 0.72, rad * 1.02, rad * 0.36, 0, 0, Math.PI * 2); g.stroke(); }
      g.restore();
      return { x: x - rad, y: y - rad * 0.85, w: rad * 2, h: rad * 1.85 };
    }
    case 'token': {
      // 圆形代币：状态 / 类型色底 + 内圈细环 + 白色图标 + 深色边
      g.save(); g.fillStyle = lock ? withAlpha(c, 0.45) : c; circle(rad); g.fill();
      g.strokeStyle = withAlpha('#000', 0.5); g.lineWidth = 1.5; circle(rad); g.stroke();
      g.strokeStyle = withAlpha('#fff', 0.45); g.lineWidth = 1; circle(rad * 0.78); g.stroke();
      if (cur) { g.strokeStyle = e.th.roles.current; g.lineWidth = 2.5; circle(rad + 3); g.stroke(); }
      g.restore();
      icon(e, sym, x, y, rad * 0.9, '#fff');
      return { x: x - rad - 3, y: y - rad - 3, w: rad * 2 + 6, h: rad * 2 + 6 };
    }
    case 'counter': {
      // 兵棋算子：方块（状态 / 类型色浅底）+ 上半北约兵种框（步兵 = 叉）+ 下面「攻-移」两个数
      const s = rad * 1.9, r = { x: x - s / 2, y: y - s / 2, w: s, h: s }, base = lock ? withAlpha(mix(c, '#fff', 0.45), 0.5) : mix(c, '#fff', 0.45);
      g.save(); g.fillStyle = base; g.fillRect(r.x, r.y, s, s); g.strokeStyle = withAlpha('#000', 0.7); g.lineWidth = 1.2; g.strokeRect(r.x + 0.5, r.y + 0.5, s - 1, s - 1);
      const bx = { x: x - s * 0.3, y: r.y + s * 0.14, w: s * 0.6, h: s * 0.36 };
      g.strokeRect(bx.x, bx.y, bx.w, bx.h); g.beginPath(); g.moveTo(bx.x, bx.y); g.lineTo(bx.x + bx.w, bx.y + bx.h); g.moveTo(bx.x + bx.w, bx.y); g.lineTo(bx.x, bx.y + bx.h); g.stroke();
      if (cur) { g.strokeStyle = e.th.roles.current; g.lineWidth = 2.5; g.strokeRect(r.x - 2, r.y - 2, s + 4, s + 4); }
      g.restore();
      const v = `${node.lv ?? 4}-${node.max ?? 4}`, nO = { ...e.small, size: Math.min(e.small.size, s * 0.26), weight: 700, color: '#111' }, nw = numberWidth(e, v, nO);
      drawNumber(e, v, x - nw / 2, r.y + s * 0.56, LH(e, nO), nO);
      return r;
    }
  }
  return { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 };
}

/** 类型圆章（iconBadge）的章底 */
const BADGE = '#121418';
/** 压在不透明底 bg 上的字 / 图标色（R4 C2 ⑥）：先按透明度合成到底上，与底的对比不到 min 时往白（底亮时往黑）一成一成地提，最多提满 */
export function inkOn(c: string, bg: string, min: number): string {
  const x = parseColor(c), b = parseColor(bg), a = Math.max(0, Math.min(1, x[3]));
  let o = rgba([b[0] + (x[0] - b[0]) * a, b[1] + (x[1] - b[1]) * a, b[2] + (x[2] - b[2]) * a, 1]);
  if (contrastRatio(o, bg) >= min) return o;
  const to = contrastRatio('#ffffff', bg) >= contrastRatio('#000000', bg) ? '#ffffff' : '#000000', o0 = o;
  for (let k = 1; k <= 10 && contrastRatio(o, bg) < min; k++) o = mix(o0, to, k / 10);
  return o;
}

/** 科技包的颜色（方形科技卡的花费「200 红瓶」：按名字首字取）；表里没有的用强调色 */
const PACK_COLORS: Record<string, string> = { 红: '#e5484d', 绿: '#3fb950', 蓝: '#3b82f6', 黄: '#e3b341', 白: '#e8e8e8' };

/** 五角星（iconBadge 的完成星；不用字形，不加字） */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.save(); g.fillStyle = color; g.beginPath();
  for (let j = 0; j < 10; j++) { const t = -Math.PI / 2 + (j * Math.PI) / 5, rr = j % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
  g.closePath(); g.fill(); g.restore();
}

/** 手绘墨圈（st.done = inkCircle）：两道略错开、起止不闭合的墨线圈，半径按序号抖一点（确定的） */
function inkCircle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, seed: number) {
  g.save(); g.strokeStyle = withAlpha(color, 0.85); g.lineCap = 'round';
  for (let p = 0; p < 2; p++) {
    const j = ((seed * 37 + p * 11) % 7) / 7, a0 = -1.9 + j * 0.6 + p * 0.4, sweep = Math.PI * 2 * (0.94 + 0.08 * p);
    g.lineWidth = p ? 1.2 : 2.2; g.beginPath();
    for (let s = 0; s <= 24; s++) { const t = a0 + (sweep * s) / 24, rr = r * (1 + 0.06 * Math.sin(t * 3 + seed + p)) + p * 1.5, px = x + Math.cos(t) * rr * 1.06, py = y + Math.sin(t) * rr * 0.94; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
  g.restore();
}

/** 当前位置标记（lay.currentMarker）：avatar = 节点上方一枚小头像（内容包第一个角色的首字），pin = 一枚图钉；top = 节点外接框上沿 */
export function currentMarker(e: ElCtx, x: number, top: number, r: number, kind: string) {
  const g = e.g, cy = top - r * 1.25;
  if (kind === 'avatar') {
    g.save(); g.fillStyle = withAlpha('#000', 0.35); g.beginPath(); g.moveTo(x - r * 0.4, cy + r * 0.85); g.lineTo(x, top - 1); g.lineTo(x + r * 0.4, cy + r * 0.85); g.closePath(); g.fill(); g.restore();
    avatar(e, x, cy, r, CURRENT_LABEL(), e.th.roles.current);
    return;
  }
  g.save(); g.fillStyle = e.th.roles.objective; g.strokeStyle = withAlpha('#000', 0.5); g.lineWidth = 1;
  g.beginPath(); g.arc(x, cy - r * 0.2, r * 0.7, Math.PI, 0); g.lineTo(x, top - 1); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); g.fill(); g.restore();
}
/** 当前位置头像上的字（screen.ts 设：内容包第一个角色的首字；没设时「我」） */
let CURRENT_LABEL = () => '我';
export const setCurrentLabel = (fn: () => string) => { CURRENT_LABEL = fn; };

/** 编号圆（默认画法）：cmp.node 没有对应分支的取值都按它画 */
const KINDS = new Set(['chest', 'avatar', 'glowDot', 'block', 'pin', 'building', 'grace', 'iconRing', 'rowCard', 'techCard', 'rosette', 'iconBadge', 'diamond', 'plainDot', 'inkIcon', 'pawn', 'token', 'counter', 'worldIcon']);
const kindIsDefault = (k: string) => !KINDS.has(k);
