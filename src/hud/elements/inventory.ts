import { mix, withAlpha } from '../material';
import { drawBox, type Rect } from '../paint';
import { pack } from '../content';
import { drawCardBack } from './card';
import { chosenKey, DATA, drawNumber, elChosen, elOf, gaugeOf, icon, itemIcon, LH, numberWidth, ownCount, ownList, ownNum, panel, registerElement, slot, T, valueKind, W, wellBox, type ElCtx } from './core';
import type { ItemRow } from '../content/types';

/*
 * 格位类 HUD 元素（M12b-29，§2 的新文件 elements/inventory.ts）：牌堆 el.piles、遗物 / 被动道具列 el.passives、消耗品槽 el.consumables、增益 / 状态槽 el.buffs、
 * 人口胶囊 el.population、世界容器 el.container。都复用格子 slot()（格子状态 st.* 与外形 vis.silhouette@<元素> 照常）与卡背 drawCardBack；
 * 共用子参数 elx.tray（inset = 先垫一块深色内嵌托盘，配 elx.valueLabel = currentMax 时托盘下面写容量 x / y：Balatro 的小丑托盘 4/5、消耗品 0/2）。
 * 新元素默认不出现（要写进 cnt.elements）；按实例 id 取参数一律经 own*（core.ts）。Godot：各元素 = HBox / GridContainer of 格子子场景，见 export/godotHud.ts 的 m12bB7Notes
 */

const S = (e: ElCtx, n: number) => n * e.k;

/** 深色内嵌托盘（elx.tray = inset，选过才垫）：返回要不要托盘 */
const trayOn = (e: ElCtx) => elChosen(e, 'tray') && String(elOf(e, 'tray') ?? 'none') === 'inset';
/** 托盘下的容量行要不要（elx.valueLabel = currentMax） */
const capOn = (e: ElCtx) => valueKind(e) === 'currentMax';
/** 托盘与容量：托盘 = 内容外一圈 6 的深色凹槽（B3 的 wellBox），容量写在托盘下面居中 */
function trayWrap(e: ElCtx, a: Rect, inner: { w: number; h: number }, cap: string) {
  const pad = trayOn(e) ? S(e, 6) : 0;
  if (pad) wellBox(e, { x: a.x, y: a.y, w: inner.w + pad * 2, h: inner.h + pad * 2 });
  if (cap && capOn(e)) { const o = { ...e.small, weight: 700 }; drawNumber(e, cap, a.x + (inner.w + pad * 2) / 2 - numberWidth(e, cap, o) / 2, a.y + inner.h + pad * 2, LH(e, e.small), o); }
  return { x: a.x + pad, y: a.y + pad };
}
/** 托盘与容量行占的额外尺寸 */
const trayExtra = (e: ElCtx) => ({ w: trayOn(e) ? S(e, 12) : 0, h: (trayOn(e) ? S(e, 12) : 0) + (capOn(e) ? LH(e, e.small) : 0) });

/* ---------------- 牌堆 ---------------- */

/** 牌堆的样本：[种类, 张数, 总数?]（draw 抽牌堆 / discard 弃牌堆 / exhaust 消耗堆）；内容包 hud.piles 没写时按演示 */
const PILE_DEMO: [string, number, number?][] = [['draw', 41, 52], ['discard', 6], ['exhaust', 2]];
const pileOf = (kind: string): [string, number, number?] => (DATA.piles ?? PILE_DEMO).find((p) => p[0] === kind) ?? PILE_DEMO.find((p) => p[0] === kind) ?? [kind, 0];
/** 这一份画哪几堆（el.piles.kinds，多选；没写时只画抽牌堆）：StS 左下抽牌堆、右下弃牌堆是同一元素的两份（el.piles#2.kinds = discard） */
const pileKinds = (e: ElCtx) => { const k = ownList(e, 'kinds').filter((x) => ['draw', 'discard', 'exhaust'].includes(x)); return k.length ? k : ['draw']; };
/** 每种堆的颜色：抽牌堆强调色、弃牌堆第二强调色、消耗堆紫 */
const pileColor = (e: ElCtx, kind: string) => (kind === 'discard' ? e.accent2 : kind === 'exhaust' ? '#8b5cf6' : e.accent);
registerElement({
  id: 'el.piles', forms: ['deckIcon'], anchor: 'bl',
  // 锚点没显式给时的默认位置（B9 审查修复 ⑭：单画法时 elx.screenAnchor 的兜底 tl 盖过 anchor，经 cnt.elements 加进来的格位元素都叠在左上）
  formAnchor: () => 'bl',
  size: (e) => { const n = pileKinds(e).length, x = trayExtra(e); return { w: S(e, 58) + x.w, h: n * S(e, 74) + (n - 1) * S(e, 8) + x.h }; },
  draw: (e, a) => {
    const kinds = pileKinds(e), first = pileOf(kinds[0]);
    const o = trayWrap(e, a, { w: S(e, 58), h: kinds.length * S(e, 74) + (kinds.length - 1) * S(e, 8) }, first[2] ? `${first[1]}/${first[2]}` : String(first[1]));
    kinds.forEach((k, i) => {
      const [, n] = pileOf(k), y = o.y + i * S(e, 82), c = pileColor(e, k), cr = { x: o.x + S(e, 4), y: y + S(e, 4), w: S(e, 44), h: S(e, 62) };
      // 牌背叠两张（后一张错开 3）+ 右下圆形计数角标
      drawCardBack(e.part('card'), { ...cr, x: cr.x + S(e, 3), y: cr.y - S(e, 3) }, mix(c, '#000', 0.25));
      drawCardBack(e.part('card'), cr, c);
      if (!capOn(e) || i > 0) { const br = S(e, 11), bx = cr.x + cr.w + S(e, 2), by = cr.y + cr.h - S(e, 2), t = String(n), to = { ...e.small, weight: 800, color: '#fff' };
        e.g.fillStyle = mix(c, '#000', 0.2); e.g.beginPath(); e.g.arc(bx, by, br, 0, Math.PI * 2); e.g.fill(); e.g.strokeStyle = withAlpha('#fff', 0.8); e.g.lineWidth = 1.5; e.g.stroke();
        drawNumber(e, t, bx - numberWidth(e, t, to) / 2, by - br, br * 2, to); }
    });
  },
});

/* ---------------- 遗物 / 被动道具列 ---------------- */

/** 遗物样本：[符号, 名字, 层数?]；内容包 hud.relics 没写时取菜单物品的符号与名字 */
const relics = (): [string, string, number?][] => DATA.relics ?? pack().menu.items.map(([g, n, q]) => [g, n, q > 1 && q < 10 ? q : undefined] as [string, string, number?]);
registerElement({
  id: 'el.passives', forms: ['iconRow', 'iconGrid'], anchor: 'tl',
  formAnchor: () => 'tl',
  size: (e) => { const L = passiveLayout(e), x = trayExtra(e); return { w: L.w + x.w, h: L.h + x.h }; },
  draw: (e, a) => {
    const L = passiveLayout(e), list = relics(), o = trayWrap(e, a, L, `${L.n}/${list.length}`);
    for (let i = 0; i < L.shown; i++) {
      const [g, name, q] = list[i % list.length], c = i % L.cols, r = Math.floor(i / L.cols), cx = o.x + L.arrow + c * L.pitch + L.cell / 2, cy = o.y + r * L.pitch + L.cell / 2;
      if (!itemIcon(e, name, cx, cy, L.cell * 0.8)) icon(e, g, cx, cy, L.cell * 0.7, e.icon);
      if (q) { const t = String(q), to = { ...e.small, size: Math.min(e.small.size, L.cell * 0.4), weight: 800, fixedSize: true }; drawNumber(e, t, cx + L.cell / 2 - numberWidth(e, t, to), cy + L.cell / 2 - to.size * 1.2, to.size * 1.2, to); }
    }
    // 超出一页：两端翻页箭头（StS 遗物过多时左右翻）
    if (L.arrow) { icon(e, '<', o.x + L.arrow / 2, o.y + L.cell / 2, L.cell * 0.6, withAlpha(e.text, 0.7)); icon(e, '>', o.x + L.arrow + L.cols * L.pitch + L.arrow / 2 - L.pitch + L.cell, o.y + L.cell / 2, L.cell * 0.6, withAlpha(e.text, 0.7)); }
  },
});
/** 遗物列的排法：个数 el.passives.count（默认样本数，最多 24）、一行 iconRow 最多 elx.count 个（默认 10，超出画翻页箭头）/ 网格 iconGrid 每行 6 个 */
function passiveLayout(e: ElCtx) {
  const n = ownCount(e, relics().length, 24), grid = e.forms[0] === 'iconGrid', cell = S(e, 28), pitch = cell + S(e, 6);
  const perRow = grid ? 6 : Math.max(1, Math.round(ownNum(e, 'perPage', 10))), cols = Math.min(n, perRow), rows = grid ? Math.ceil(n / cols) : 1;
  const shown = grid ? n : Math.min(n, perRow), arrow = !grid && n > perRow ? S(e, 16) : 0;
  return { n, cols, rows, shown, cell, pitch, arrow, w: cols * pitch - S(e, 6) + arrow * 2, h: rows * pitch - S(e, 6) };
}

/* ---------------- 消耗品槽 / 增益槽 / 世界容器 ---------------- */

/** 消耗品样本（药水）：内容包 hud.potions，没写时快捷物品（hud.quickItems）或菜单物品 */
const potions = (): ItemRow[] => DATA.potions ?? DATA.quickItems ?? pack().menu.items;
/**
 * 一排格子（消耗品 / 增益共用）：n 格、前 filled 格有东西，其余空格（st.emptySlot）。
 * 垫了托盘（elx.tray = inset）又没在这个元素 / 格子上选过 st.emptySlot 时空格留白（B7 审查修复 ㉚：托盘本身就是暗槽，Balatro 的空消耗品托盘不画「+」格）
 */
function slotRow(e: ElCtx, x: number, y: number, n: number, filled: number, src: ItemRow[], cell: number, gap: number) {
  const blank = trayOn(e) && !chosenKey(e.part('slot'), 'st.emptySlot');
  for (let i = 0; i < n; i++) {
    const [g, name, q, ic] = src[i % Math.max(1, src.length)] ?? ['?', '', 0];
    slot(e, { x: x + i * (cell + gap), y, w: cell, h: cell }, g, i < filled ? { qty: q > 1 ? String(q) : undefined, item: ic ? name : undefined, line: i } : { empty: true, ...(blank ? { emptyMode: 'blank' } : {}) });
  }
}
registerElement({
  id: 'el.consumables', forms: ['slots'], anchor: 'tc',
  formAnchor: () => 'tc',
  size: (e) => { const n = ownCount(e, 3, 8), x = trayExtra(e); return { w: n * S(e, 36) - S(e, 6) + x.w, h: S(e, 30) + x.h }; },
  draw: (e, a) => {
    // 格数 el.consumables.count（默认 3）；有东西的格数 = el.consumables.filled（默认样本里的前两个），其余空槽（StS 的虚线瓶：st.emptySlot@el.consumables = dashed）
    const n = ownCount(e, 3, 8), filled = Math.max(0, Math.min(n, Math.round(ownNum(e, 'filled', Math.min(2, n))))), o = trayWrap(e, a, { w: n * S(e, 36) - S(e, 6), h: S(e, 30) }, `${filled}/${n}`);
    slotRow(e, o.x, o.y, n, filled, potions(), S(e, 30), S(e, 6));
  },
});

/** 增益样本（大卢恩 / 状态）：内容包 hud.buffs，没写时快捷物品 */
const buffs = (): ItemRow[] => DATA.buffs ?? DATA.quickItems ?? pack().menu.items;
registerElement({
  id: 'el.buffs', forms: ['slotRow'], anchor: 'tl',
  formAnchor: () => 'tl',
  size: (e) => { const n = ownCount(e, 1, 8), c = n === 1 ? S(e, 46) : S(e, 34), x = trayExtra(e); return { w: n * (c + S(e, 6)) - S(e, 6) + x.w, h: c + x.h }; },
  draw: (e, a) => {
    // 单格时大一号（Elden 左上的大卢恩八角槽：vis.silhouette@el.buffs = octagon），一排时小格；有东西的格数 el.buffs.filled（默认全满），空格 = 暗坑
    const n = ownCount(e, 1, 8), c = n === 1 ? S(e, 46) : S(e, 34), filled = Math.max(0, Math.min(n, Math.round(ownNum(e, 'filled', n))));
    const o = trayWrap(e, a, { w: n * (c + S(e, 6)) - S(e, 6), h: c }, `${filled}/${n}`);
    slotRow(e, o.x, o.y, n, filled, buffs(), c, S(e, 6));
  },
});

/** 世界容器的列数 / 格数（el.container.columns 默认 3、格数 el.container.count 默认 9：饥荒箱子 3 × 3；背包竖条写 columns = 2、count = 8） */
const contDims = (e: ElCtx) => { const cols = Math.max(1, Math.min(8, Math.round(ownNum(e, 'columns', 3)))), n = ownCount(e, cols * 3, 32); return { cols, rows: Math.ceil(n / cols), n }; };
registerElement({
  id: 'el.container', forms: ['grid'], anchor: 'mr', attachSide: 'right',
  formAnchor: () => 'mr',
  size: (e) => { const d = contDims(e), c = S(e, 36), p = S(e, 8); return { w: d.cols * (c + S(e, 4)) - S(e, 4) + p * 2, h: d.rows * (c + S(e, 4)) - S(e, 4) + p * 2 }; },
  draw: (e, a) => {
    // 面板底（elx.frame = panel / tray 套木框：饥荒）+ 格子网格；样本 = 菜单物品，后三分之一空格
    const d = contDims(e), c = S(e, 36), p = S(e, 8), items = pack().menu.items;
    panel(e, a, true);
    for (let i = 0; i < d.n; i++) {
      const col = i % d.cols, row = Math.floor(i / d.cols), r = { x: a.x + p + col * (c + S(e, 4)), y: a.y + p + row * (c + S(e, 4)), w: c, h: c };
      const [g, name, q, ic] = items[i % items.length];
      slot(e, r, g, i < Math.ceil(d.n * 0.6) ? { qty: q > 1 ? String(q) : undefined, item: ic ? name : undefined, line: i } : { empty: true });
    }
  },
});

/* ---------------- 人口胶囊 ---------------- */

/** 人口样本：[已分配, 总数]（内容包 hud.population，没写时 42 / 80） */
const popOf = (): [number, number] => DATA.population ?? [42, 80];
registerElement({
  id: 'el.population', forms: ['pill'], anchor: 'br',
  formAnchor: () => 'br',
  size: (e) => { const [u, t] = popOf(), o = { ...e.base, weight: 700 }; return { w: S(e, 40) + numberWidth(e, `${u} / ${t}`, o) + S(e, 18), h: S(e, 34) }; },
  draw: (e, a) => {
    // 全圆角胶囊：左端一颗放大镜圆钮（查看人口详情）+ 人形符号 + 已分配 / 总数（Frostpunk 右下）
    const [u, t] = popOf(), g = e.g, h = a.h, o = { ...e.base, weight: 700 };
    panel(e, a, true, { radiusPct: 50 });
    const bc = { x: a.x + h / 2, y: a.y + h / 2 }, br = h * 0.4;
    g.fillStyle = mix(e.accent, '#000', 0.25); g.beginPath(); g.arc(bc.x, bc.y, br, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.2, br * 0.16); g.beginPath(); g.arc(bc.x - br * 0.12, bc.y - br * 0.12, br * 0.42, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(bc.x + br * 0.18, bc.y + br * 0.18); g.lineTo(bc.x + br * 0.5, bc.y + br * 0.5); g.stroke();
    const s = `${u} / ${t}`;
    drawNumber(e, s, a.x + h + S(e, 6), a.y, h, o);
  },
});

/* ---------------- 价格 / 消耗：配方行与凹槽点数（el.cost 的新画法，info.ts 调用） ---------------- */

/**
 * 配方行（el.cost.form = recipeRow，M12b-29，factorio#31）：原料格 → 箭头 → 进度条（cmp.gauge@el.cost 选过时按它（B4 的 gaugeOf，fixed），没给时 bar，强调色；
 * B7 审查修复 ⑬：原来写死 bar + 橙色）→ 产物格，
 * el.cost.moduleSlots 给了时下面一排插件空槽；原料 = 内容包配方样本（screens.recipes）的材料，产物 = 配方本身
 */
export function recipeRow(e: ElCtx, a: Rect) {
  const rec = pack().screens.recipes?.[0], c = Math.min(a.h - (moduleN(e) ? S(e, 28) : 0), S(e, 40)), g = S(e, 6);
  const mats = (rec?.[3] ?? [['?', 1, 2]]).slice(0, 3);
  let x = a.x;
  mats.forEach(([n, have]) => { slot(e, { x, y: a.y, w: c, h: c }, n.slice(0, 1), { qty: String(have), item: n }); x += c + g; });
  icon(e, '→', x + S(e, 8), a.y + c / 2, S(e, 14), withAlpha(e.text, 0.7)); x += S(e, 18);
  const pw = Math.max(S(e, 30), a.x + a.w - x - c - g);
  gaugeOf(e, { x, y: a.y + c / 2 - S(e, 4), w: pw, h: S(e, 8) }, 0.62, 0, 'bar', { fixed: true, color: e.accent });
  x += pw + g;
  slot(e, { x, y: a.y, w: c, h: c }, rec?.[0] ?? '✦', { qty: '1', item: rec?.[1] });
  for (let i = 0; i < moduleN(e); i++) slot(e, { x: a.x + i * (S(e, 24) + g), y: a.y + c + S(e, 4), w: S(e, 24), h: S(e, 24) }, '', { empty: true });
}
/** 插件槽个数（el.cost.moduleSlots，0–4，默认 0） */
const moduleN = (e: ElCtx) => Math.max(0, Math.min(4, Math.round(ownNum(e, 'moduleSlots', 0))));
/** 配方行要多宽多高 */
export const recipeSize = (e: ElCtx) => ({ w: S(e, 300), h: S(e, 40) + (moduleN(e) ? S(e, 28) : 0) });

/** 凹槽点数（el.cost.form = pips，M12b-29，hollow-knight#25）：「消耗」+ N 个凹槽小圆（亮 = 要花的，形跟 st.emptySlot = pit 的暗坑）；N = 消耗数（hud.cost 第二项的需要数，2–6） */
export function costPips(e: ElCtx, a: Rect) {
  const need = Math.max(1, Math.min(6, DATA.cost[1]?.[1] ?? 2)), tot = Math.max(need, Math.min(6, need + 1)), o = { ...e.base, weight: 700 }, lw = W(e, '消耗', o);
  T(e, '消耗', a.x, a.y, a.h, o);
  const r = Math.min(a.h * 0.32, S(e, 9));
  for (let i = 0; i < tot; i++) {
    const cx = a.x + lw + S(e, 10) + r + i * (r * 2 + S(e, 5)), cy = a.y + a.h / 2;
    drawBox(e.g, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, { circle: true, bg: { solid: i < need ? e.accent : withAlpha('#000', 0.45) }, border: { width: 1, color: withAlpha(e.text, 0.35) } }, e.pal);
  }
}
export const pipsSize = (e: ElCtx) => ({ w: W(e, '消耗', { ...e.base, weight: 700 }) + S(e, 10) + 6 * S(e, 23), h: S(e, 32) });
