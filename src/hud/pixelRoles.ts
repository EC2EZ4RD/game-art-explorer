/*
 * 按角色像素化（M12b-56，K1 G-pixel-roles）：vis.pixelRoles（多选：text 正文 / display 标题与大字 / numerals 数字 / icons 图标 / frame 面板与框 / bars 数值条）
 * 分别决定哪些东西画在低分辨率（最近邻放大）的那一层；typ.rasterize 把任何字族的字按世界分辨率栅格化（不强推像素字族）。
 *
 * 做法：盒子画布与文字画布各拆成「低分辨率 / 清晰」两张，元素代码照旧往 e.g / e.tx 上画——这两个是 roleCtx() 包出来的代理：
 *   状态（字体、颜色、线宽……）、变换（save / translate / rotate / setTransform……）与路径（beginPath / moveTo / arc / clip……）发给两张画布，保持同步；
 *   真正落墨的调用（fill / stroke / fillRect / fillText / drawImage……）只发给当前角色那一张（PIXROLE：数值条 gauge() 标 bars、图标 icon() 标 icons、
 *   drawNumber 标 numerals、drawText 按字号分 display / text，其余盒子 = frame）；getTransform / getImageData 也读那一张（成品缓存按它的设备像素放）。
 * 合成（HudSystem）：含 frame 的那一层盒子在下、另一层盒子在上，再叠低分辨率文字、清晰文字（层内顺序不变，层间按 框 < 条 < 图标 < 字）。
 * 没选 vis.pixelRoles、也没开 typ.rasterize 时不走这里（原来的两张画布，逐字节不变）。
 * Godot：按角色的清晰度 = 每层一个最近邻过滤的 SubViewport（脚本），像素字 = 关抗锯齿的整数字号 FontFile（内置）。
 */

/**
 * 当前落墨的角色：box（盒子画布上：frame / bars / icons）、text（文字画布上：text / display / numerals / icons）；displayMin = 字号到这么大算标题与大字（设计单位，HudSystem 每帧按正文字号设）；
 * lowText / lowPx（R4 回归修复 into-the-breach#43）= 画在低分辨率字层的文字角色、那一层上 1 个设计单位折几个层像素（floor(DPR) / textK × unitK；0 = 没有低分辨率字层），drawText 的可读下限用
 */
export const PIXROLE = { box: '', text: '', displayMin: Infinity, lowPx: 0, lowText: new Set<string>() as ReadonlySet<string> };
/**
 * 可读下限（R4 回归修复 into-the-breach#43）：要画进低分辨率字层的字，在那一层上的字号（层像素）低于它时改画在清晰层——
 * 中日韩字 12（像素字族 Fusion Pixel 的原生字格；再小，笔画在放大前就糊成一团：ITB 的页签「布阵」在 1028 宽的画面上只有 6.5 层像素），
 * 其余 10（同一套 12 格像素字里拉丁字母 / 数字的单像素笔画缩到 0.8 像素以下就抹成灰边：ITB 细框条的「DEFENSE 19%」在 1028 宽时只有 4.3 层像素）。
 * 字号够大的标题、大按钮、数字照旧像素化；画面变大（1080p）时同一行字的层像素跟着变多，够了就回到低分辨率层。改画到的角色 LEGIBLE 不在 PIXEL_ROLES 里，哪一层都不选它
 */
export const LEGIBLE_PX = { cjk: 12, other: 10 };
export const LEGIBLE = 'legible';
/** 在 fn 里把落墨角色标成 role（嵌套时内层优先，退出还原） */
export function withPixRole<T>(kind: 'box' | 'text', role: string, fn: () => T): T {
  const p = PIXROLE[kind];
  PIXROLE[kind] = role;
  try { return fn(); } finally { PIXROLE[kind] = p; }
}
/** 只落到当前角色那一张的调用 */
const DRAWS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'putImageData', 'drawFocusIfNeeded']);
/** 读当前角色那一张的调用 */
const ROUTED_GET = new Set(['getTransform', 'getImageData', 'isPointInPath', 'isPointInStroke']);
/** 只问第一张的调用（与画布无关的工厂、量字） */
const FIRST = new Set(['measureText', 'createLinearGradient', 'createRadialGradient', 'createConicGradient', 'createPattern', 'createImageData', 'getLineDash', 'getContextAttributes']);

/**
 * 角色代理画布：layers 里的画布状态 / 变换 / 路径同步，落墨按 pick() 选一张。canvas 属性给 pick() 选中的那一张（B10 审查修复 ⑩：可读性记录的 cw 与 getTransform
 * 是同一层的，按 CSS 像素换算才对；放大镜读自己画布的像素也读到那一层——原来给 main，低分辨率层上的字记录小了 textK 倍、放大镜读到空的输出画布）；main 只在 pick 没给时兜底
 */
export function roleCtx(layers: CanvasRenderingContext2D[], main: HTMLCanvasElement, pick: () => CanvasRenderingContext2D): CanvasRenderingContext2D {
  const all = [...new Set(layers)];
  const fn = new Map<string, (...a: unknown[]) => unknown>();
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_, k) {
      if (k === ROLE_LAYERS) return all;
      if (k === 'canvas') return pick()?.canvas ?? main;
      if (typeof k !== 'string') return undefined;
      const first = all[0] as unknown as Record<string, unknown>;
      if (typeof first[k] !== 'function') return first[k];
      let f = fn.get(k);
      if (!f) {
        f = DRAWS.has(k) || ROUTED_GET.has(k) ? (...a: unknown[]) => (pick() as unknown as Record<string, (...b: unknown[]) => unknown>)[k](...a)
          : FIRST.has(k) ? (...a: unknown[]) => (first[k] as (...b: unknown[]) => unknown).apply(first, a)
            : (...a: unknown[]) => { let r: unknown; for (const c of all) { const v = (c as unknown as Record<string, (...b: unknown[]) => unknown>)[k](...a); if (c === all[0]) r = v; } return r; };
        fn.set(k, f);
      }
      return f;
    },
    set(_, k, v) { for (const c of all) (c as unknown as Record<string | symbol, unknown>)[k] = v; return true; },
  });
}

/**
 * 按层次冲洗（B10 审查修复 ⑲）：几张角色层是整层合成的（框 < 条 < 低分辨率字 < 清晰字），弹出模板画在垫底的局内 HUD 之上、浮动详情画在模板之上时，
 * 后画的盒子会落到先画的字下面（垫底 HUD 的字压在弹窗面板上、浮框盖不住模板的字）。HudSystem 拆层时给 flush：把各层到这一刻为止的内容按层序合成进输出画布、清空各层，
 * 之后画的东西整体在上面；构图在层次的分界处调 flushRoles()（垫底之后、浮动详情之前）。没拆层时 flush = null，什么都不做
 */
export const ROLES: { flush: (() => void) | null } = { flush: null };
export const flushRoles = () => { ROLES.flush?.(); };

/** 代理画布上取它包着的几层（layerExtent 用） */
export const ROLE_LAYERS = Symbol('roleLayers');
/**
 * 画布的设备像素尺寸（成品缓存的预算按它定）：代理画布取它包着的几层里最大的（canvas 属性现在是挑中的那一层，可能是低分辨率层——B10 审查修复 ⑩），
 * 普通画布就是它自己的 canvas
 */
export function layerExtent(c: CanvasRenderingContext2D): [number | undefined, number | undefined] {
  const ls = (c as unknown as Record<symbol, unknown>)[ROLE_LAYERS];
  if (!Array.isArray(ls) || !ls.length) return [c.canvas?.width, c.canvas?.height];
  return [Math.max(...ls.map((q) => q.canvas?.width ?? 0)), Math.max(...ls.map((q) => q.canvas?.height ?? 0))];
}

/** 角色表（vis.pixelRoles 的取值） */
export const PIXEL_ROLES = ['text', 'display', 'numerals', 'icons', 'frame', 'bars'];
/**
 * 这一屏的按角色像素化设置：null = 走原来的两张画布（没选 vis.pixelRoles、没开 typ.rasterize）；否则 boxLow / textLow = 哪些角色画在低分辨率层，
 * boxK / textK = 两层的像素倍数（盒子跟 vis.pixelScale，没开时 2；字跟 typ.rasterize：world = 跟 vis.pixelScale（没开时 2）、x2 / x3）
 */
export interface PixelPlan { boxLow: Set<string>; textLow: Set<string>; boxK: number; textK: number }
export function pixelPlan(roles: string[] | null, rasterize: string, px: number): PixelPlan | null {
  const rk = rasterize === 'x2' ? 2 : rasterize === 'x3' ? 3 : rasterize === 'world' ? (px > 1 ? px : 2) : 0;
  if (!roles && !rk) return null;
  // 没选角色时：盒子照原来（开了 vis.pixelScale 就全像素）、字（正文 / 标题 / 数字）按 typ.rasterize 栅格化，图标字形照旧清晰（原来图标画在清晰的文字层）
  const set = roles ? new Set(roles) : null;
  const boxLow = new Set(['frame', 'bars', 'icons'].filter((x) => (set ? set.has(x) : px > 1)));
  const textLow = new Set(['text', 'display', 'numerals', 'icons'].filter((x) => (set ? set.has(x) : rk > 0 && x !== 'icons')));
  return { boxLow, textLow, boxK: px > 1 ? px : rk || 2, textK: rk || (px > 1 ? px : 2) };
}
