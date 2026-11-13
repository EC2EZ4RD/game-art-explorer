import { useEffect, useMemo, useRef, useState } from 'react';
import type { Hit } from '../../hud/compose/hud';
import { fullRectOf, type PartHit } from '../../hud/HudSystem';
import type { Values } from '../../dims/types';
import { resolveUi } from '../../hud/sys/resolve';
import { useStore } from '../../state/store';
import { getEngine } from '../engineRef';
import {
  ANCHOR_GRID, ANCHOR_LABEL, anchorForPoint, anchorKey, anchorOf, colOf, elementName, isSampleHud, keyFor, makeHudEditable, nextInstance, offFine, offVal,
  resetElementNow, rowOf, scaleDrag, scaleText, sizeVal, toggleElementPatch, type Anchor,
} from './elements';
import { getFed, setDraft } from './engineFeed';
import { resetCameraNow } from './camState';
import { useHudInfo } from './hudInfo';
import { screenContextOf } from './selectionGuard';
import { PartBar, QuickBar, ScreenQuickBar } from './QuickBar';
import { partName } from './parts';
import { SELECTORS } from '../../hud/sys/register';
import { getParam } from '../../dims/registry';

/*
 * 画布编辑层（轨道 B，docs/workbench-redesign.md §6，第一阶段：元素型 HUD）。
 * 画框上叠一层 .edit-layer：每个 engine.hud.hits 矩形一个透明盒子（pointer-events:auto），层的其余部分不接管指针——
 *   鼠标在元素上交给编辑层，在别处照常转镜头；按住空格时整层放行（元素上也能转镜头）。
 * 悬停：1px 轮廓 + 名签「生命 · 左下」；点击：2px 轮廓 + 8 个手柄 + 锚点小圆点 + 快捷条，右栏切到这个元素；点空白处取消选中。
 * 占画面 1/5 以上的大框（飘字区、交互提示区）不接管指针、拖动照样转镜头，但在它上面点一下（不拖）就选中它（审查修复 20）。
 * 拖动：元素中心落在九宫格哪一格就写那一格的锚点，剩下的距离写成偏移（屏宽 / 屏高的百分比）。
 *   换格时先按安全区边距估一个这一格的基准位置、直接把元素放到指针下，下一帧量到实际位置后校准（审查修复 19：原来先发一帧零偏移去量，元素会跳到格子角上再弹回）；
 *   拖动中选中框画在指针处，不等命中框。
 * 偏移 / 大小写排版实际读的那个键（画法级键写了值时写它，审查修复 7）。
 * 缩放：角手柄写 elx.scale；边手柄写元素宽 / 高（elx.width / height，屏宽 / 屏高的比例，审查修复 9）。
 *   整合 U#21：角手柄按 0.05 一档、靠近 ×1 / ×1.5 / ×2 时吸上去，按住 Shift 微调（0.01、不吸）；拖动中选中框旁边实时写「×1.50」（拉宽 / 拉高写「宽 42%」），
 *   和快捷条、检查器一样两位小数。
 * 拖动中只改临时值（engineFeed 的 draft，按 rAF 合成），松手时一次 store.patch：一步撤销、拖动中零次存储写入。
 * 键盘（选中元素且焦点在画框里）：方向键 1 单位、Shift 10 单位；Delete 隐藏；Ctrl+D 复制；Tab 轮换；Shift+R 还原；Esc 取消选中、把按键还给角色行走。
 * 示例 HUD（没选品类布局时的 M1 样本，没有命中框）：画框左上角给「▣ 改成可拖动的 UI」（审查修复 16）。
 * 部件（轨道 B2，§6「第二阶段」）：模板 / 菜单屏没有元素命中框、但 HUD 给了部件命中框（engine.hud.parts，E 的面板 / 标题 / 页签 / 列表行 / 按钮）时，
 *   悬停出轮廓 + 名签、点一下选中（v1 只能选中、不能拖动），左上角换成这个部件的「▣ 整个界面」快捷条（标题写部件名，带「还原这一屏」）；
 *   大部件（面板这类占画面 1/5 以上的）照样不接管指针，在它上面点一下（不拖）选中。Esc 取消、Tab 轮换。还没有部件命中框时照旧是「▣ 整个界面」。
 * B2 审查修复：
 *   ① 双击画框（镜头复位）优先：在大框上单击的选中推迟 DBL_MS，第二下来了就取消；慢一点的双击第二下落到了刚选中的大框上，也撤掉选中、照样复位；
 *   ② 选中部件时取消元素选中，部件的按键先于元素处理；换屏 / 换场景时取消部件选中；部件按 id 认（E 的约定里每屏唯一）；
 *   ⑥ UI A/B 时拖着元素进了 A 侧（命中框没了）：选中框照样跟着指针；
 *   ⑦ 部件的快捷条写明改的是整个界面；部件自己的覆盖（<参数>@tpl.<这一屏>）在下面第二条「只在这一屏」（收尾 1，QuickBar.tsx 的 PartBar）；
 *   ⑧ 拖动中指针被取消（触屏、切走窗口）：放掉镜头锁、丢掉临时值，不提交；盒子与手柄 touch-action: none；
 *   ⑪ 整屏界面（局内 auto 但画的是模板，没有元素框）也给「▣ 整个界面」；
 *   ㉒ 拖过安全区边：排版把元素夹在边上，提交时偏移只写到夹住的那个位置（不留没有作用的偏移）；
 *   ㉓ 「整个界面」快捷条的 × 放进条里。
 */

/** 双击判定：大框上的单击推迟这么久再选中（第二下来了就当双击，交给画框的镜头复位） */
const DBL_MS = 280;

interface R4 { x: number; y: number; w: number; h: number }
/** 命中框（画框 CSS px）：x / y / w / h 是元素的整框（拖动、缩放、选中框都按它）；hit = UI A/B 时裁到当前一侧的那段（只有它接管指针，B2 审查修复 ⑥） */
interface Box extends R4 { id: string; form?: string; hit?: R4 }
/** 接管指针的那块（没裁时就是整框） */
const hitOf = (b: Box): R4 => b.hit ?? b;
/** 部件框：key = 部件 id + 序号（同一种部件可以有好几个，如列表行） */
interface PartBox extends Box { key: string; part?: string; target?: string; label?: string }

/** 某个锚点的基准位置（零偏移时元素左上角，画框 CSS px）；cal = 这一轴已经按实际画出来的位置校准过 */
interface Base { x: number; y: number; calX: boolean; calY: boolean }

/** 拖动中的状态（ref 里，不触发渲染） */
interface Drag {
  kind: 'move' | 'scale' | 'size';
  id: string;
  form?: string;
  /** 起点（屏幕 px）与起始框（画框 CSS px） */
  sx: number; sy: number;
  rect: Box;
  started: boolean;
  /** 画框尺寸（CSS px） */
  W: number; H: number;
  a0: Anchor; off0: [number, number]; scale0: number;
  /** 写哪些键：锚点、横 / 纵偏移、大小（都是排版实际读的那个键） */
  aKey: string; kx: string; ky: string; sKey: string;
  /** 边手柄：拉的是宽还是高、写哪个键、起始比例 */
  axis: 'width' | 'height' | null; zKey: string; size0: number;
  base: Partial<Record<Anchor, Base>>;
  /** 安全区边距的估计（起始锚点量出来的；估别的格子的基准位置用） */
  mx: number; my: number;
  /** 当前想要的结果 */
  want: { a: Anchor; ox: number; oy: number; s: number; z: number };
  /** 想把元素左上角放到哪（画框 CSS px） */
  wantPos?: { x: number; y: number };
  /** 缩放手柄：-1 / 0 / 1（左 / 中 / 右，上 / 中 / 下） */
  hx: number; hy: number;
  /** 松手了、等最后一次校准后提交 */
  releasing: boolean;
  /** 最近一次画出来的临时值（锚点 + 偏移）和元素实际画在哪（画框 CSS px）：提交时按它去掉被排版夹掉的那段偏移（审查修复 ㉒） */
  drawn?: { a: Anchor; ox: number; oy: number; x: number; y: number };
}

const sameR = (x: R4, y: R4) => Math.abs(x.x - y.x) < 0.5 && Math.abs(x.y - y.y) < 0.5 && Math.abs(x.w - y.w) < 0.5 && Math.abs(x.h - y.h) < 0.5;
const sameBoxes = (a: Box[], b: Box[]) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.form === b[i].form && sameR(x, b[i]) && sameR(hitOf(x), hitOf(b[i])));
const toBox = (h: Hit): Box => {
  const f = fullRectOf(h);
  return { id: h.element, form: h.form, x: f.x, y: f.y, w: f.w, h: f.h, ...(f !== h.rect ? { hit: { x: h.rect.x, y: h.rect.y, w: h.rect.w, h: h.rect.h } } : {}) };
};
/** 部件按 id 认（E 的约定：element 在一屏里唯一；万一重了，第二个起加序号），换屏后同一序号的别的部件不会被当成还选着 */
function toParts(hs: PartHit[]): PartBox[] {
  const seen = new Map<string, number>();
  return hs.map((h) => {
    const n = (seen.get(h.element) ?? 0) + 1;
    seen.set(h.element, n);
    return { ...toBox(h), key: n === 1 ? h.element : `${h.element}|${n}`, part: h.part, target: h.target, label: h.label };
  });
}
const sameParts = (a: PartBox[], b: PartBox[]) => a.length === b.length && sameBoxes(a, b) && a.every((x, i) => x.key === b[i].key && x.target === b[i].target && x.label === b[i].label);
/** 一个元素可能按画法拆成几块：选中框取并集 */
function unionOf(boxes: Box[], id: string): Box | null {
  const bs = boxes.filter((b) => b.id === id);
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { id, form: bs[0].form, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** 大框：占画面五分之一以上（飘字、通知、交互提示这类大片透明区域）；按接管指针的那块算 */
const isBig = (b: Box, W: number, H: number) => { const r = hitOf(b); return W > 0 && H > 0 && r.w * r.h > 0.2 * W * H; };

/** 按起始锚点估一个格子的基准位置：边距按起始那一格量到的（中列 / 中排时取一个常见的安全区边距），左右 / 上下对称 */
function estimateBase(d: Drag, a: Anchor): Base {
  const c = colOf(a), r = rowOf(a), w = d.rect.w, h = d.rect.h;
  const x = c === 0 ? d.mx : c === 2 ? d.W - d.mx - w : (d.W - w) / 2;
  const y = r === 0 ? d.my : r === 2 ? d.H - d.my - h : (d.H - h) / 2;
  return { x, y, calX: false, calY: false };
}

/** 最近一次画出来的就是最后想要的那份临时值（锚点、偏移都一样） */
const drawnIsWant = (d: Drag) => !!d.drawn && d.drawn.a === d.want.a && Math.abs(d.drawn.ox - d.want.ox) < 1e-6 && Math.abs(d.drawn.oy - d.want.oy) < 1e-6;

/**
 * 提交的锚点与偏移（审查修复 ㉒）：最后画出来的位置和「基准 + 想要的偏移」差出 1.5px 以上 = 排版把元素夹在了安全区边上，
 * 这一轴的偏移只写到夹住的那个位置（实际位置 − 基准）。原来照写想要的偏移：检查器里是 −4% / −9.5% •↺，画面上却贴着边不动，滑块有一段死区。
 * 基准还没校准（一直拖在安全区外）时用估计值：贴边那一格的估计基准就在安全区边上，偏移回到约 0
 */
function settledOffsets(d: Drag): { a: Anchor; ox: number; oy: number } {
  const { a, ox, oy } = d.want;
  const dr = d.drawn, base = d.base[a];
  if (!dr || !base || !drawnIsWant(d)) return { a, ox, oy };
  const fix = (off: number, got: number, b: number, size: number) => (Math.abs(got - (b + (off / 100) * size)) > 1.5 ? Number(offFine(((got - b) / size) * 100)) : off);
  return { a, ox: fix(ox, dr.x, base.x, d.W), oy: fix(oy, dr.y, base.y, d.H) };
}

export function EditOverlay({ vdK }: { vdK: number }) {
  const sel = useStore((s) => s.hudSel);
  const values = useStore((s) => s.values);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  /** 部件命中框（模板 / 菜单屏）与选中、悬停的部件（视图状态，只在画框里，不进 store） */
  const [parts, setParts] = useState<PartBox[]>([]);
  const [partSel, setPartSel] = useState<string | null>(null);
  const [partHover, setPartHover] = useState<string | null>(null);
  const partsRef = useRef<PartBox[]>([]);
  partsRef.current = parts;
  const partSelRef = useRef<string | null>(null);
  partSelRef.current = partSel;
  const [guide, setGuide] = useState<{ a: Anchor; kind: Drag['kind'] } | null>(null);
  /** 拖动中选中框画在哪（指针处，不等命中框） */
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  /** 缩放 / 拉宽拖动中的实时读数（「×1.50」「宽 42%」） */
  const [readout, setReadout] = useState<string | null>(null);
  const [pass, setPass] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const boxesRef = useRef<Box[]>([]);
  boxesRef.current = boxes;
  const r = useMemo(() => resolveUi(values), [values]);
  // 命中框轮询只挂一次：它调的测量函数要拿到最新的解析结果，所以都经过 ref
  const rRef = useRef(r);
  rRef.current = r;
  const sample = useMemo(() => isSampleHud(r), [r]);

  // 命中框：HUD 每重画一次（drawSerial + 1）读一次；拖动中顺便按刚画出来的位置校准基准
  useEffect(() => {
    let raf = 0, serial = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const eng = getEngine();
      if (!eng || eng.hud.drawSerial === serial) return;
      serial = eng.hud.drawSerial;
      const next = eng.hud.usesElements ? eng.hud.hits.map(toBox) : [];
      if (!sameBoxes(next, boxesRef.current)) setBoxes(next);
      // 部件框只在没有元素框时用（元素型 HUD 上不叠部件，免得两种盒子抢指针）
      const np = next.length ? [] : toParts(eng.hud.parts ?? []);
      if (!sameParts(np, partsRef.current)) {
        setParts(np);
        // 选中的部件这一屏没有了（换屏、换布局）：取消选中
        if (partSelRef.current && !np.some((x) => x.key === partSelRef.current)) setPartSel(null);
      }
      const d = drag.current;
      const fed = getFed();
      if (d && d.started && fed.serial < serial) api.current.measure(d, next, fed.draft);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /**
   * 用刚画好的命中框校准基准位置：画的时候用的是哪一格、多少偏移（fedDraft），实际画在哪 → 基准 = 实际位置 − 偏移。
   * 只在想要的位置落在安全区以内时校准（贴边时排版会把元素夹回版面，那一帧算出来的基准不准）。校准变了就按新基准重算偏移；松手后等到这一步再提交
   */
  const measure = (d: Drag, next: Box[], fedDraft: Values | null) => {
    if (d.kind === 'move' && fedDraft && d.wantPos) {
      const fa = String(fedDraft[d.aKey] ?? '') as Anchor;
      const base = d.base[fa];
      const b = unionOf(next, d.id);
      const fox = Number(fedDraft[d.kx] ?? 0) || 0, foy = Number(fedDraft[d.ky] ?? 0) || 0;
      if (b) d.drawn = { a: fa, ox: fox, oy: foy, x: b.x, y: b.y };
      if (base && b && (!base.calX || !base.calY)) {
        const px = base.x + (fox / 100) * d.W, py = base.y + (foy / 100) * d.H;
        let changed = false;
        if (!base.calX && px >= d.mx - 1 && px + d.rect.w <= d.W - d.mx + 1) { base.x = b.x - (fox / 100) * d.W; base.calX = true; changed = true; }
        if (!base.calY && py >= d.my - 1 && py + d.rect.h <= d.H - d.my + 1) { base.y = b.y - (foy / 100) * d.H; base.calY = true; changed = true; }
        if (changed && fa === d.want.a) pushDraft(d);
      }
    }
    // 松手后：等到画出来的正是最后想要的那份临时值再提交（提交时要按它量夹边；最多等 0.4 秒，见 up）
    if (d.releasing && (d.kind !== 'move' || drawnIsWant(d))) commit(d);
  };

  /** 按想要的位置算锚点和偏移（这一格的基准还没量过时先用估计值） */
  const placeFor = (d: Drag, px: number, py: number) => {
    const a = anchorForPoint(px + d.rect.w / 2, py + d.rect.h / 2, d.W, d.H);
    const base = (d.base[a] ??= estimateBase(d, a));
    d.want = { ...d.want, a, ox: Number(offVal(((px - base.x) / d.W) * 100)), oy: Number(offVal(((py - base.y) / d.H) * 100)) };
    d.wantPos = { x: px, y: py };
  };

  const pushDraft = (d: Drag) => {
    if (d.kind === 'scale') { setDraft({ [d.sKey]: d.want.s }); setReadout(scaleText(d.want.s)); return; }
    if (d.kind === 'size') { setDraft({ [d.zKey]: d.want.z }); setReadout(`${d.axis === 'width' ? '宽' : '高'} ${Math.round(d.want.z * 100)}%`); return; }
    if (d.wantPos) placeFor(d, d.wantPos.x, d.wantPos.y);
    setDraft({ [d.aKey]: d.want.a, [d.kx]: d.want.ox, [d.ky]: d.want.oy });
    setGuide({ a: d.want.a, kind: 'move' });
    if (d.wantPos) setDragPos({ ...d.wantPos });
  };

  const commit = (d: Drag) => {
    drag.current = null;
    setGuide(null);
    setDragPos(null);
    setReadout(null);
    const st = useStore.getState();
    const name = elementName(d.id);
    if (d.kind === 'scale') {
      if (d.want.s !== d.scale0) st.patch({ [d.sKey]: d.want.s }, [], `缩放 ${name}`);
    } else if (d.kind === 'size') {
      if (d.want.z !== d.size0) st.patch({ [d.zKey]: d.want.z }, [], `${d.axis === 'width' ? '拉宽' : '拉高'} ${name}`);
    } else {
      const { a, ox, oy } = settledOffsets(d);
      if (a !== d.a0 || ox !== d.off0[0] || oy !== d.off0[1]) {
        // 没改的、本来也没写的键不写（偏移夹回 0、锚点没换时不多出一项改动）
        const set: Values = {};
        if (a !== d.a0 || st.values[d.aKey] !== undefined) set[d.aKey] = a;
        if (ox !== d.off0[0] || st.values[d.kx] !== undefined) set[d.kx] = ox;
        if (oy !== d.off0[1] || st.values[d.ky] !== undefined) set[d.ky] = oy;
        st.patch(set, [], `拖动 ${name}`);
      }
    }
    setDraft(null);
  };

  /** 拖动中途取消（指针被系统收回、窗口失焦）：丢掉临时值，不提交 */
  const abort = () => {
    drag.current = null;
    setGuide(null);
    setDragPos(null);
    setReadout(null);
    setDraft(null);
  };

  const api = useRef({ measure });
  api.current = { measure };

  const begin = (e: React.PointerEvent, b: Box, kind: 'move' | 'scale', hx = 0, hy = 0) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const st = useStore.getState();
    if (st.hudSel !== b.id) st.setHudSel(b.id);
    focusFrame();
    const W = layer.current?.clientWidth ?? 1, H = layer.current?.clientHeight ?? 1;
    const rect = unionOf(boxesRef.current, b.id) ?? b;
    const form = b.form;
    const a0 = anchorOf(r, b.id, form);
    const off0: [number, number] = [Number(r.el(b.id, 'offsetX', form) ?? 0) || 0, Number(r.el(b.id, 'offsetY', form) ?? 0) || 0];
    const scale0 = Number(r.el(b.id, 'scale', form) ?? 1) || 1;
    // 边手柄（只有一个方向）拉宽 / 高；角手柄缩放
    const axis = kind === 'scale' && !!hx !== !!hy ? (hx ? 'width' : 'height') : null;
    const zKey = axis ? keyFor(r, b.id, axis, form) : '';
    const cur = axis ? Number(r.el(b.id, axis, form)) : NaN;
    const size0 = axis ? (Number.isFinite(cur) && cur > 0 ? cur : Number(sizeVal(axis === 'width' ? rect.w / W : rect.h / H, axis))) : 0;
    // 起始锚点的基准 = 现在的位置 − 偏移。偏移把元素推到了版面边上（贴着安全区边）时这一轴被排版夹过，减出来的不准：
    // 那一轴先按估计、等画出来再校准。安全区边距从没被夹的轴量（量不到时用 2.5%，与参考线的安全框一致）
    const bx = rect.x - (off0[0] / 100) * W, by = rect.y - (off0[1] / 100) * H;
    const c0 = colOf(a0), r0 = rowOf(a0), tol = 4;
    const clampedX = (off0[0] > 0 && rect.x + rect.w >= W - W * 0.025 - tol) || (off0[0] < 0 && rect.x <= W * 0.025 + tol);
    const clampedY = (off0[1] > 0 && rect.y + rect.h >= H - H * 0.025 - tol) || (off0[1] < 0 && rect.y <= H * 0.025 + tol);
    const mx = Math.max(0, Math.min(W * 0.15, !clampedX && c0 !== 1 ? (c0 === 0 ? bx : W - bx - rect.w) : W * 0.025));
    const my = Math.max(0, Math.min(H * 0.15, !clampedY && r0 !== 1 ? (r0 === 0 ? by : H - by - rect.h) : H * 0.025));
    const d: Drag = {
      kind: axis ? 'size' : kind, id: b.id, form, sx: e.clientX, sy: e.clientY, rect, started: false, W, H, a0, off0, scale0,
      aKey: anchorKey(r, b.id, form), kx: keyFor(r, b.id, 'offsetX', form), ky: keyFor(r, b.id, 'offsetY', form), sKey: keyFor(r, b.id, 'scale', form),
      axis, zKey, size0,
      base: {}, mx, my,
      want: { a: a0, ox: off0[0], oy: off0[1], s: scale0, z: size0 }, hx, hy, releasing: false,
    };
    const est = estimateBase(d, a0);
    d.base[a0] = { x: clampedX ? est.x : bx, y: clampedY ? est.y : by, calX: !clampedX, calY: !clampedY };
    drag.current = d;
    orbitLock(true);
    const pid = e.pointerId;
    const detach = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      orbitLock(false);
    };
    // 系统收回了指针（触屏开始滚动 / 缩放、切走窗口、鼠标在窗外松开没收到）：放掉镜头锁、丢掉这次拖动（审查修复 ⑧）
    const cancel = (ev?: Event) => {
      if (ev instanceof PointerEvent && ev.pointerId !== pid) return;
      detach();
      if (drag.current === d) abort();
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const dd = drag.current;
      if (!dd) return;
      // 鼠标键已经不在按着了（松手的事件丢了）：当作取消
      if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) { cancel(); return; }
      const dx = (ev.clientX - dd.sx) / vdK, dy = (ev.clientY - dd.sy) / vdK;
      if (!dd.started && Math.hypot(dx, dy) < 3) return;
      dd.started = true;
      if (dd.kind === 'move') {
        placeFor(dd, dd.rect.x + dx, dd.rect.y + dy);
        pushDraft(dd);
      } else if (dd.kind === 'size') {
        // 边手柄：按拉动后的框边长换算比例（左 / 上手柄往外拉也是变大）
        const len = dd.axis === 'width' ? dd.rect.w : dd.rect.h;
        const k = (len + (dd.axis === 'width' ? dd.hx * dx : dd.hy * dy)) / Math.max(1, len);
        dd.want = { ...dd.want, z: Number(sizeVal(dd.size0 * Math.max(0.05, k), dd.axis!)) };
        setGuide({ a: dd.a0, kind: 'size' });
        pushDraft(dd);
      } else {
        // 角手柄：取两个方向里放大得多的那个；0.05 一档、靠近 ×1 / ×1.5 / ×2 吸上去，Shift 微调（整合 U#21）
        const kx = (dd.rect.w + dd.hx * dx) / Math.max(1, dd.rect.w);
        const ky = (dd.rect.h + dd.hy * dy) / Math.max(1, dd.rect.h);
        dd.want = { ...dd.want, s: scaleDrag(dd.scale0 * Math.max(0.05, Math.max(kx, ky)), ev.shiftKey) };
        setGuide({ a: dd.a0, kind: 'scale' });
        pushDraft(dd);
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      detach();
      const dd = drag.current;
      if (!dd) return;
      if (!dd.started) { drag.current = null; return; }
      // 移动：落点那一格的基准还没按实际位置校准、或者最后一份临时值还没画出来（提交要按它量夹边），等下一次重画再提交（最多等 0.4 秒）
      const base = dd.kind === 'move' ? dd.base[dd.want.a] : undefined;
      if (dd.kind === 'move' && (!base || !base.calX || !base.calY || !drawnIsWant(dd))) { dd.releasing = true; setTimeout(() => { if (drag.current === dd) commit(dd); }, 400); }
      else commit(dd);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
  };

  /** 选中一个部件：元素选中一起取消（右栏、键盘都不再对着上一屏留下的元素，审查修复 ②） */
  const selectPart = (key: string | null) => {
    setPartSel(key);
    if (key) { const st = useStore.getState(); if (st.hudSel) st.setHudSel(null); }
  };
  const selectPartRef = useRef(selectPart);
  selectPartRef.current = selectPart;

  // 点画框空白处（画布上按下又松开、没拖动）：落在大框（不接管指针的那些）里就选中它，否则取消选中。
  // 双击画框 = 镜头复位（Frame.tsx）优先（审查修复 ①）：大框上的单击推迟 DBL_MS 再选中，第二下来了就不选；
  // 第二下来得慢、落在了刚选中的大框上（它选中后就接管指针了）：双击时撤掉这次选中，照样复位镜头
  useEffect(() => {
    let down: { x: number; y: number } | null = null;
    let last = { t: -1e9, x: 0, y: 0 };
    let timer = 0;
    /** 刚才那一下单击（推迟后）选中的大框：kind + id，选中的时刻 */
    let auto: { kind: 'el' | 'part'; id: string; t: number; prevSel: string | null } | null = null;
    const isCanvas = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('.frame-host');
    const pd = (e: PointerEvent) => { down = isCanvas(e.target) && e.button === 0 ? { x: e.clientX, y: e.clientY } : null; };
    const pu = (e: PointerEvent) => {
      const st = useStore.getState();
      if (down && isCanvas(e.target) && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) {
        const now = performance.now();
        const second = e.detail >= 2 || (now - last.t < DBL_MS + 220 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 6);
        last = { t: now, x: e.clientX, y: e.clientY };
        if (timer) { clearTimeout(timer); timer = 0; }
        if (second) { down = null; last.t = -1e9; return; }
        const L = layer.current;
        const hit = L ? bigBoxAt(L, boxesRef.current, e.clientX, e.clientY) : null;
        const part = L && !hit ? (bigBoxAt(L, partsRef.current, e.clientX, e.clientY) as PartBox | null) : null;
        if (hit || part) {
          const cx = e.clientX, cy = e.clientY;
          timer = window.setTimeout(() => {
            timer = 0;
            const s2 = useStore.getState();
            // 这段时间里盒子换了（换屏、重画挪了位置）：按松手的那一点重新找
            const L2 = layer.current;
            const h2 = hit && L2 ? bigBoxAt(L2, boxesRef.current, cx, cy) : null;
            const p2 = part && L2 && !h2 ? (bigBoxAt(L2, partsRef.current, cx, cy) as PartBox | null) : null;
            if (h2) { auto = { kind: 'el', id: h2.id, t: performance.now(), prevSel: s2.hudSel }; if (s2.hudSel !== h2.id) s2.setHudSel(h2.id); focusFrame(); }
            else if (p2) { auto = { kind: 'part', id: p2.key, t: performance.now(), prevSel: partSelRef.current }; selectPartRef.current(p2.key); focusFrame(); }
          }, DBL_MS);
        } else { if (st.hudSel) st.setHudSel(null); if (partSelRef.current) setPartSel(null); }
      }
      down = null;
    };
    const dbl = (e: MouseEvent) => {
      const a = auto;
      auto = null;
      if (!a || performance.now() - a.t > 700) return;
      const box = (e.target as HTMLElement | null)?.closest?.('.edit-box') as HTMLElement | null;
      if (!box || (a.kind === 'el' ? box.dataset.el : box.dataset.key) !== a.id) return;
      e.stopPropagation();
      const st = useStore.getState();
      if (a.kind === 'el') { if (st.hudSel === a.id) st.setHudSel(a.prevSel); }
      else setPartSel(a.prevSel);
      resetCameraNow();
    };
    window.addEventListener('pointerdown', pd, true);
    window.addEventListener('pointerup', pu, true);
    window.addEventListener('dblclick', dbl, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', pd, true);
      window.removeEventListener('pointerup', pu, true);
      window.removeEventListener('dblclick', dbl, true);
    };
  }, []);

  // 空格：整层放行（元素上也转镜头）
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement)?.closest?.('input,textarea,select')) setPass(true); };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') setPass(false); };
    const bl = () => setPass(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', bl);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', bl); };
  }, []);

  // 键盘：只在选中了元素、焦点在画框里时接管（捕获阶段先拿到，角色行走就收不到）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();
      const id = st.hudSel;
      const frame = layer.current?.closest('[data-frame]');
      // 选中的是部件：Esc 取消、Tab 轮换（部件 v1 不能拖、不能用方向键挪）。部件先于元素（审查修复 ②：原来只在没选元素时才走这里，
      // 上一屏留下的元素选中会把方向键、Esc 抢走）；这一屏有元素框时没有部件
      const ps = partSelRef.current;
      if (ps && !boxesRef.current.length && frame && frame.contains(document.activeElement)) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setPartSel(null); }
        else if (e.key === 'Tab') {
          e.preventDefault(); e.stopPropagation();
          const keys = partsRef.current.map((x) => x.key), i = keys.indexOf(ps);
          if (keys.length) selectPartRef.current(keys[(i + (e.shiftKey ? keys.length - 1 : 1)) % keys.length]);
        }
        return;
      }
      if (!id || !frame || !frame.contains(document.activeElement)) return;
      const rr = resolveUi(st.values);
      const W = layer.current?.clientWidth ?? 1, H = layer.current?.clientHeight ?? 1;
      const uk = getEngine()?.hud.unitK ?? 1;
      const k = e.key;
      const stop = () => { e.preventDefault(); e.stopPropagation(); };
      if (k.startsWith('Arrow')) {
        stop();
        // 1 个设计单位（960×540 画布）= unitK 个画框 CSS px；写排版实际读的那个键，按 0.01% 取整（审查修复 3 / 7）
        const form = boxesRef.current.find((b) => b.id === id)?.form;
        const u = (e.shiftKey ? 10 : 1) * uk;
        const dx = k === 'ArrowLeft' ? -u : k === 'ArrowRight' ? u : 0, dy = k === 'ArrowUp' ? -u : k === 'ArrowDown' ? u : 0;
        if (dx) st.set(keyFor(rr, id, 'offsetX', form), offFine((Number(rr.el(id, 'offsetX', form) ?? 0) || 0) + (dx / W) * 100));
        if (dy) st.set(keyFor(rr, id, 'offsetY', form), offFine((Number(rr.el(id, 'offsetY', form) ?? 0) || 0) + (dy / H) * 100));
      } else if (k === 'Delete' || k === 'Backspace') {
        stop();
        st.patch(toggleElementPatch(rr, id, false), [], `隐藏 ${elementName(id)}`);
        st.setHudSel(null);
      } else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'd') {
        stop();
        const n = nextInstance(rr, id);
        if (n) { st.patch({ 'cnt.elements': [...rr.elements(), n].join(',') }, [], `复制 ${elementName(id)}`); st.setHudSel(n); }
      } else if (k === 'Tab') {
        stop();
        const ids = [...new Set(boxesRef.current.map((b) => b.id))];
        if (ids.length) st.setHudSel(ids[(ids.indexOf(id) + (e.shiftKey ? ids.length - 1 : 1)) % ids.length]);
      } else if (e.shiftKey && (k === 'R' || k === 'r')) {
        stop();
        resetElementNow(id);
      } else if (k === 'Escape') {
        stop();
        st.setHudSel(null);
        (frame.querySelector('canvas') as HTMLCanvasElement | null)?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const focusFrame = () => (layer.current?.closest('[data-frame]')?.querySelector('canvas') as HTMLCanvasElement | null)?.focus({ preventScroll: true });

  // 换屏 / 换场景：部件选中、悬停作废（元素选中由舞台的选中守卫取消，selectionGuard.ts）
  const ctx = useStore((s) => screenContextOf(s));
  useEffect(() => { setPartSel(null); setPartHover(null); }, [ctx]);
  // 选了元素（右栏列表、⌘K）：部件选中让位
  useEffect(() => { if (sel) setPartSel(null); }, [sel]);
  // 整屏界面：不按元素排版、但画出了东西（局内 auto 而布局画的是模板，审查修复 ⑪）
  const hi = useHudInfo();
  const abOn = useStore((s) => s.hudABOn);
  const wholeScreen = !abOn && !hi.usesElements && hi.drawn;

  // 模板 / 菜单屏（没有元素命中框）：选「整个界面」
  const [screenOpen, setScreenOpen] = useState(false);
  const screen = String(values[SELECTORS.screen] ?? 'auto');
  const screenLabel = getParam(SELECTORS.screen)?.options?.find((o) => o.value === screen)?.label ?? '界面';
  const selHit = sel ? unionOf(boxes, sel) : null;
  // 拖动中：选中框跟着指针走（命中框要等下一帧才更新）；UI A/B 时拖进了 A 侧（当前一侧没有它的命中框了）也照样画在指针处（审查修复 ⑥）
  const dd = drag.current;
  const dragBox = dd && dd.id === sel && dragPos && guide?.kind === 'move' ? { id: dd.id, form: dd.form, x: dragPos.x, y: dragPos.y, w: dd.rect.w, h: dd.rect.h } : null;
  const selBox = dragBox ?? selHit;
  const hovBox = hover && hover !== sel ? unionOf(boxes, hover) : null;
  const W = layer.current?.clientWidth ?? 0, H = layer.current?.clientHeight ?? 0;
  const partSelBox = !boxes.length && partSel ? parts.find((x) => x.key === partSel) ?? null : null;
  const partHovBox = !boxes.length && partHover && partHover !== partSel ? parts.find((x) => x.key === partHover) ?? null : null;
  const tplOf = (p?: PartBox | null) => p?.target ?? (screen.startsWith('tpl.') ? screen : undefined);
  return (
    <div className={`edit-layer ${pass ? 'pass' : ''}`} ref={layer}>
      {guide && <Guides W={W} H={H} a={guide.a} kind={guide.kind} />}
      {boxes.map((b, i) => (
        <div
          key={`${b.id}-${b.form ?? ''}-${i}`}
          // 大框（飘字、通知、交互提示区这类大片透明区域）不接管指针，免得画面中间转不了镜头；点一下（不拖）照样选中，选中后才能拖
          className={`edit-box ${isBig(b, W, H) && b.id !== sel ? 'big' : ''}`}
          style={{ left: hitOf(b).x, top: hitOf(b).y, width: hitOf(b).w, height: hitOf(b).h }}
          data-el={b.id}
          onPointerEnter={() => setHover(b.id)}
          onPointerLeave={() => setHover((h) => (h === b.id ? null : h))}
          onPointerDown={(e) => begin(e, b, 'move')}
        />
      ))}
      {hovBox && !guide && (
        <div className="edit-hover" style={{ left: hovBox.x, top: hovBox.y, width: hovBox.w, height: hovBox.h }}>
          <span className="edit-tag">{elementName(hovBox.id)} · {ANCHOR_LABEL[anchorOf(r, hovBox.id, hovBox.form)]}</span>
        </div>
      )}
      {selBox && (
        <div className="edit-sel" style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}>
          <span className="edit-anchor" style={anchorDot(anchorOf(r, selBox.id, selBox.form))} />
          {HANDLES.map(([hx, hy]) => (
            <span
              key={`${hx},${hy}`}
              className={`edit-handle h${hx}${hy} ${hx && hy ? 'corner' : 'side'}`}
              style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, cursor: CURSOR[`${hx},${hy}`] }}
              title={hx && hy ? '拖角：放大 / 缩小' : hx ? '拖边：拉宽' : '拖边：拉高'}
              onPointerDown={(e) => begin(e, selBox, 'scale', hx, hy)}
            />
          ))}
          {!guide && <span className="edit-tag sel">{elementName(selBox.id)} · {ANCHOR_LABEL[anchorOf(r, selBox.id, selBox.form)]}</span>}
          {guide && guide.kind !== 'move' && readout && <span className="edit-tag sel readout">{readout}</span>}
        </div>
      )}
      {selBox && !guide && <QuickBar id={selBox.id} form={selBox.form} box={selBox} W={W} H={H} r={r} />}
      {!boxes.length && sample && (
        <button className="screen-pill accent" onClick={() => makeHudEditable(r)} title="现在画的是示例 HUD，元素不能单独点选：换成这个品类的布局，就能直接拖动、缩放（一步撤销）">▣ 改成可拖动的 UI</button>
      )}
      {!boxes.length && parts.map((b) => (
        <div
          key={b.key}
          className={`edit-box part ${isBig(b, W, H) && b.key !== partSel ? 'big' : ''}`}
          style={{ left: hitOf(b).x, top: hitOf(b).y, width: hitOf(b).w, height: hitOf(b).h }}
          data-part={b.part ?? b.id}
          onPointerEnter={() => setPartHover(b.key)}
          onPointerLeave={() => setPartHover((h) => (h === b.key ? null : h))}
          data-key={b.key}
          onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); e.preventDefault(); selectPart(b.key); focusFrame(); }}
        />
      ))}
      {partHovBox && (
        <div className="edit-hover" style={{ left: partHovBox.x, top: partHovBox.y, width: partHovBox.w, height: partHovBox.h }}>
          <span className="edit-tag">{partName(partHovBox)}</span>
        </div>
      )}
      {partSelBox && (
        <div className="edit-sel part" style={{ left: partSelBox.x, top: partSelBox.y, width: partSelBox.w, height: partSelBox.h }}>
          <span className="edit-tag sel">{partName(partSelBox)} · {screenLabel}</span>
        </div>
      )}
      {!boxes.length && !sample && (screen !== 'auto' || parts.length > 0 || wholeScreen) && (
        // 选中部件时：上面一条照旧改整个界面（版式 / 容器 / 密度 / 背景 / 虚化写的都是全局键，审查修复 ⑦）；
        // 下面第二条（PartBar，收尾 1）写这一屏的部件覆盖 <参数>@tpl.<id>（D 的 resolve.ts 解析，只在这一屏生效）
        partSelBox
          ? <>
            <ScreenQuickBar r={r} label={`整个界面 · 选中：${partName(partSelBox)}`} tpl={tplOf(partSelBox)} onClose={() => setPartSel(null)} closeTitle="取消选中（Esc）" />
            {tplOf(partSelBox) && <PartBar tpl={tplOf(partSelBox)!} part={partSelBox.part ?? partSelBox.id.replace(/[#|].*$/, '')} name={partName(partSelBox)} screenName={screenNameOf(tplOf(partSelBox)!, screenLabel)} />}
          </>
          : screenOpen
            ? <ScreenQuickBar r={r} label={screenLabel === '局内 HUD' ? '整个界面' : screenLabel} tpl={tplOf()} onClose={() => setScreenOpen(false)} closeTitle="收起" />
            : <button className="screen-pill" onClick={() => setScreenOpen(true)} title={parts.length ? '点画面上的面板、标题、按钮可以单独选中；这里整屏调版式、容器、密度、背景' : '这一屏没有可单独拖动的元素：整屏调版式、容器、密度、背景'}>▣ 整个界面</button>
      )}
    </div>
  );
}

/** 这一屏的中文名（界面模板的选项名，去掉括号里的说明；没有时用胶片上的名字） */
function screenNameOf(tpl: string, fallback: string): string {
  const l = getParam(SELECTORS.screen)?.options?.find((o) => o.value === tpl)?.label;
  return (l ?? fallback).replace(/（.*?）|\(.*?\)/g, '').trim() || fallback;
}

/** 点在哪个大框里（画框 CSS px；有视距缩放时按层的实际显示尺寸换算）：几个大框叠着时取面积最小的 */
function bigBoxAt(L: HTMLElement, boxes: Box[], cx: number, cy: number): Box | null {
  const rc = L.getBoundingClientRect();
  const W = L.clientWidth, H = L.clientHeight;
  const k = rc.width / Math.max(1, W);
  const x = (cx - rc.left) / k, y = (cy - rc.top) / k;
  const hits = boxes.filter((b) => { const r = hitOf(b); return isBig(b, W, H) && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; });
  return hits.sort((a, b) => hitOf(a).w * hitOf(a).h - hitOf(b).w * hitOf(b).h)[0] ?? null;
}

/**
 * 拖动元素时暂停镜头转动（轨道 F 的 engine.setOrbitLock(原因, 开关)）：只加 / 去掉自己这一个原因（'edit-drag'），
 * 不用 setOrbitLock(null)——那会把别人加的锁也一起解掉（轨道 B2）。还没有这个方法时什么也不做：编辑层的盒子本来就接住了指针
 */
function orbitLock(on: boolean) {
  const eng = getEngine() as unknown as { setOrbitLock?: (reason: string | null, on?: boolean) => void } | null;
  try { eng?.setOrbitLock?.('edit-drag', on); } catch { /* F 的接口变了：忽略 */ }
}

const HANDLES: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const CURSOR: Record<string, string> = { '-1,-1': 'nwse-resize', '1,1': 'nwse-resize', '1,-1': 'nesw-resize', '-1,1': 'nesw-resize', '0,-1': 'ns-resize', '0,1': 'ns-resize', '-1,0': 'ew-resize', '1,0': 'ew-resize' };
/** 锚点小圆点：画在选中框上锚点那一角 / 边的中点 */
const anchorDot = (a: Anchor) => ({ left: `${colOf(a) * 50}%`, top: `${rowOf(a) * 50}%` });

/** 拖动时的参考线：安全区框、三分线、中线、9 个锚点（目标格高亮） */
function Guides({ W, H, a, kind }: { W: number; H: number; a: Anchor; kind: Drag['kind'] }) {
  if (!W || !H) return null;
  return (
    <div className="edit-guides">
      <div className="g-safe" />
      {[1, 2].map((i) => <div key={`v${i}`} className="g-line v third" style={{ left: (W * i) / 3 }} />)}
      {[1, 2].map((i) => <div key={`h${i}`} className="g-line h third" style={{ top: (H * i) / 3 }} />)}
      <div className="g-line v mid" style={{ left: W / 2 }} />
      <div className="g-line h mid" style={{ top: H / 2 }} />
      {kind === 'move' && <div className="g-cell" style={{ left: (W * colOf(a)) / 3, top: (H * rowOf(a)) / 3, width: W / 3, height: H / 3 }}><span>{ANCHOR_LABEL[a]}</span></div>}
      {ANCHOR_GRID.flat().map((x) => (
        <span key={x} className={`g-dot ${x === a ? 'on' : ''}`} style={{ left: `${3 + colOf(x) * 47}%`, top: `${4 + rowOf(x) * 46}%` }} />
      ))}
    </div>
  );
}
