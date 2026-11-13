/*
 * 色板取景（轨道 D，docs/workbench-redesign.md §0.3 §5.3）：纯函数，node 测试能直接跑（swatchRenderer 要引 HudSystem，node 里引不了）。
 */

/** 色板的 CSS 尺寸（§0.3：约 152×64，按 1:1 显示） */
export const SWATCH_W = 152;
export const SWATCH_H = 64;

export interface Box { x: number; y: number; w: number; h: number }

/**
 * 局内 HUD 的取景优先级（§0.3「生命 + 快捷栏一带」）：先生命 / 快捷栏 / 技能，再是带面板、条、格子的元素（资源、队伍、工具栏、选中单位……）。
 * 皮肤的差别主要在面板、描边、条、格子上——纯文字的元素（目标、指南针、通知、字幕、提示）不当取景区（审查修复 19：
 * 原来目标框排在前三，按字计分时总是取到「胜利条件 / 守住发电厂」那几行字，38 个色板几乎一样）
 */
const PRIORITY = ['el.vitals', 'el.abilities', 'el.hotbar', 'el.consumables', 'el.resources', 'el.ammo', 'el.party', 'el.profile', 'el.toolbar', 'el.selection',
  'el.threat', 'el.timer', 'el.clock', 'el.score', 'el.speed', 'el.rank', 'el.meter', 'el.gameSpeed', 'el.minimap'];
/** 只有字、看不出皮肤的元素：取景时整块不算（字和盒子都不计分） */
const TEXTY = ['el.objective', 'el.compass', 'el.notify', 'el.subtitle', 'el.prompt', 'el.interact', 'el.chat', 'el.feedback', 'el.ticker', 'el.lowerThird', 'el.guide'];
/** 「生命 + 快捷栏」：里面的再加权 */
const RICH = new Set(['el.vitals', 'el.abilities', 'el.hotbar']);

interface LogItem { x: number; y: number; w: number; h: number; cw: number }
interface LogBox extends LogItem { color: string | null }
interface LogText extends LogItem { size: number }

/** 盒子的不透明度（绘制记录的颜色串：#rgb / #rrggbb / #rrggbbaa / rgba()） */
function alphaOf(c: string | null): number {
  if (!c) return 0;
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length >= 4 ? Number.parseFloat(p[3]) * (p[3].endsWith('%') ? 0.01 : 1) : 1; }
  if (c.startsWith('#') && (c.length === 9 || c.length === 5)) return Number.parseInt(c.length === 9 ? c.slice(7, 9) : c[4] + c[4], 16) / 255;
  return c === 'transparent' ? 0 : 1;
}

const baseId = (el: string) => el.replace(/#\d$/, '');
const inter = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const centerIn = (r: Box, z: Box, pad = 4) => r.x + r.w / 2 >= z.x - pad && r.x + r.w / 2 <= z.x + z.w + pad && r.y + r.h / 2 >= z.y - pad && r.y + r.h / 2 <= z.y + z.h + pad;

/**
 * 取景框（CSS 像素，1:1 = 152×64）：在「生命 + 快捷栏一带」（没有时：带面板 / 条的元素）里找面板、条、格子最多的一块。
 *   - 不透明盒子（面板、条、格子）计 2 分，按它盖住窗口（或窗口盖住它）的比例；盒子的角落进了窗口再加分（框的描边、圆角、角花在角上）；
 *   - 字计 1 分（一行字大半在窗口里才算），被窗口边切掉一截的字扣分；
 *   - 生命 / 快捷栏 / 技能里的再乘 1.5；只有字的元素（目标、指南针、通知、字幕……）整块不算。
 * 没有命中框（界面模板）时在整屏里找，同样是面板优先。
 */
export function cropBox(cssW: number, cssH: number, hits: { element: string; rect: Box }[], texts: LogText[], boxes: LogBox[]): Box {
  return cropCandidates(cssW, cssH, hits, texts, boxes)[0]?.box ?? fallbackBox(cssW, cssH, hits);
}

/** 一个候选取景框和它的面板分（cropBox 的计分） */
export interface CropCand { box: Box; score: number }

/** 什么都没有时的取景：第一个优先元素的中心，再没有就左下角（生命 / 快捷栏常在那里） */
function fallbackBox(cssW: number, cssH: number, hits: { element: string; rect: Box }[]): Box {
  const w = Math.min(SWATCH_W, cssW), h = Math.min(SWATCH_H, cssH);
  // 与 cropCandidates 的取景区同一个口径：生命 / 快捷栏 / 技能，没有时第一个带面板的优先元素（占画面 1/5 以上的不算）
  const small = (r: Box) => r.w * r.h < (cssW * cssH) / 5;
  const prio = PRIORITY.map((id) => hits.find((x) => baseId(x.element) === id && small(x.rect))?.rect).filter((r): r is Box => !!r);
  const rich = PRIORITY.filter((id) => RICH.has(id)).map((id) => hits.find((x) => baseId(x.element) === id && small(x.rect))?.rect).filter((r): r is Box => !!r);
  const z = rich[0] ?? prio[0] ?? { x: cssW * 0.05, y: cssH * 0.78, w: cssW * 0.3, h: cssH * 0.17 };
  return { x: Math.min(Math.max(0, z.x + z.w / 2 - w / 2), Math.max(0, cssW - w)), y: Math.min(Math.max(0, z.y + z.h / 2 - h / 2), Math.max(0, cssH - h)), w, h };
}

/**
 * 候选取景框，按面板分从高到低（cropBox 取第一个）。
 * wide = true（整合修复 U#5，按皮肤间差别挑取景时用）：取景区放宽到所有带面板的优先元素（不只生命 / 快捷栏），
 * 让「各皮肤画出来一样」的生命心、生命条输给快捷栏、资源栏这类面板——最后由 pickByDiff 按几个对照皮肤的实际差别定。
 */
export function cropCandidates(cssW: number, cssH: number, hits: { element: string; rect: Box }[], texts: LogText[], boxes: LogBox[], wide = false): CropCand[] {
  const w = Math.min(SWATCH_W, cssW), h = Math.min(SWATCH_H, cssH);
  const k = (texts[0] ?? boxes[0])?.cw ? cssW / (texts[0] ?? boxes[0]).cw : 1;
  const toCss = (o: LogItem): Box => ({ x: o.x * k, y: o.y * k, w: o.w * k, h: o.h * k });
  // 最大的框不要（占画面 1/5 以上的飘字区、通知区）
  const small = (r: Box) => r.w * r.h < (cssW * cssH) / 5;
  const prio = PRIORITY.map((id) => hits.find((x) => baseId(x.element) === id && small(x.rect))).filter((x): x is { element: string; rect: Box } => !!x);
  const texty = hits.filter((x) => TEXTY.includes(baseId(x.element))).map((x) => x.rect);
  // 取景区：生命 / 快捷栏 / 技能有的话只用它们，否则取优先级最高的两个带面板的元素
  const rich = prio.filter((p) => RICH.has(baseId(p.element)));
  const zone = (wide ? prio : rich.length ? rich : prio.slice(0, 2)).map((x) => x.rect);
  const inTexty = (r: Box) => texty.some((z) => centerIn(r, z, 0));
  const items = [
    ...texts.map((t) => ({ r: toCss(t), box: false })),
    ...boxes.filter((b) => alphaOf(b.color) > 0.25).map((b) => ({ r: toCss(b), box: true })),
  ].filter((it) => it.r.w > 1 && it.r.h > 1 && it.r.w < cssW * 0.8 && !inTexty(it.r));
  const pool = zone.length ? items.filter((it) => zone.some((z) => centerIn(it.r, z) || inter(it.r, z) > 0.5 * it.r.w * it.r.h)) : items;
  const bonus = (r: Box) => (rich.some((p) => centerIn(r, p.rect)) ? 1.5 : 1);
  const winArea = w * h;
  const score = (win: Box) => {
    let s = 0;
    for (const it of pool) {
      const a = inter(win, it.r);
      if (a <= 0) continue;
      if (it.box) {
        // 盒子：盖住窗口的比例（大面板）或自己在窗口里的比例（小格子、条），取大的
        const cov = a / Math.max(1, Math.min(winArea, it.r.w * it.r.h));
        if (cov < 0.4) continue;
        let corners = 0;
        for (const [cx, cy] of [[it.r.x, it.r.y], [it.r.x + it.r.w, it.r.y], [it.r.x, it.r.y + it.r.h], [it.r.x + it.r.w, it.r.y + it.r.h]]) {
          if (cx >= win.x && cx <= win.x + win.w && cy >= win.y && cy <= win.y + win.h) corners++;
        }
        s += (2 * Math.min(1, cov) + 0.4 * corners) * bonus(it.r);
      } else {
        // 字：大半在窗口里才算；被窗口边切掉一截的扣分（B 的审查修复 ⑱「不切到字」）
        const frac = a / Math.max(1, it.r.w * it.r.h);
        if (frac > 0.5) s += frac * bonus(it.r);
        if (frac < 0.95) s -= 0.6;
      }
    }
    return s;
  };
  const clampWin = (cx: number, cy: number): Box => ({
    x: Math.min(Math.max(0, cx - w / 2), Math.max(0, cssW - w)),
    y: Math.min(Math.max(0, cy - h / 2), Math.max(0, cssH - h)), w, h,
  });
  // 候选：以每个字 / 盒子为中心、以它的左上角为起点（一整行字 / 一排格子落进来），以及取景区本身的中心
  const cands: Box[] = zone.map((z) => clampWin(z.x + z.w / 2, z.y + z.h / 2));
  for (const it of pool) cands.push(clampWin(it.r.x + it.r.w / 2, it.r.y + it.r.h / 2), clampWin(it.r.x - 6 + w / 2, it.r.y - 6 + h / 2));
  // 同一个位置只留一个；分数相同时先出现的在前（与原来「严格大于才换」一致）
  const seen = new Set<string>();
  const out: CropCand[] = [];
  for (const c of cands) {
    const id = `${c.x},${c.y}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ box: c, score: score(c) });
  }
  // cropBox 原来要求分数 > -1 才算候选
  return out.filter((c) => c.score > -1).sort((a, b) => b.score - a.score);
}

/** 几个对照皮肤之间的平均差别低于这个值时（整屏几乎一样：没有 UI、或 UI 不随皮肤变）不按差别挑，退回 cropBox */
export const MIN_SKIN_DIFF = 0.004;

/**
 * 按皮肤间的实际差别挑取景框（整合修复 U#5：横版·洞穴五排一样的心、射击·舱室五条一样的「生命」）：
 * diff(box) = 几个风格差得远的对照皮肤在这块里画出来的平均差别（0–1，swatchRenderer 量）；面板分只做加权（0.3–3 倍），
 * 差别为 0 的块（各皮肤一样）永远不选。所有候选都几乎没有差别时返回 null（调用方退回 cropBox）。
 */
export function pickByDiff(cands: CropCand[], diff: (b: Box) => number): Box | null {
  let best: Box | null = null, bestS = -1, maxD = 0;
  for (const c of cands) {
    const d = diff(c.box);
    if (d > maxD) maxD = d;
    const s = d * Math.min(3, Math.max(0.3, 1 + c.score / 10));
    if (s > bestS) { bestS = s; best = c.box; }
  }
  return maxD < MIN_SKIN_DIFF ? null : best;
}
