import { mix, withAlpha } from '../material';
import type { Rect, TextOpts } from '../paint';
import { pack } from '../content';
import { drawNumber, icon, lineColor, LH, mutedOf, numberWidth, T, W, type ElCtx } from './core';

/*
 * 数据图（M12b-27，§2 的 charts.ts）：statViz(e, kind, rect, data)——st.statViz 的新画法：keyValue 键值行（饥荒单人结算「存活 N 天 / 死于 X」）、
 * inkNumber 墨团数字（Disco 的属性块）、lineChart 折线、sparkline 迷你走势、stackedArea 堆叠面积、network 网络气泡（K1 G-leader-dataviz：模拟 / 策略工具面板）。
 * screen.ts 的 table()（cnt.dataShape = table 的统计屏）读它；B8 的详情 statTable 字段、B8 · 13 的色块数字在这上面扩。
 * Godot：自绘 Control（_draw 折线 / 面积 / 气泡；键值行 = VBox of HBox(Label, Label)；墨团 = TextureRect 墨团纹理 + Label）
 */

/**
 * 数据：表头、行（[名字, 数值…]）、走势（每行一串，没给时按行的数值生成确定的样本）、键值行（[标签, 值, 图标?]，没给时表头 + 第一行）、
 * cells = 第一行按表头逐列格式化好的字（第四列与统计表同一写法：满值 30,000 的数量或百分比；墨团数字用它，B5 审查修复 ⑲）
 */
export interface ChartData { head: string[]; rows: (string | number)[][]; series?: number[][]; pairs?: [string, string, string?][]; cells?: string[] }
/** st.statViz 里由 charts.ts 画的取值 */
export const CHART_KINDS = new Set(['keyValue', 'inkNumber', 'lineChart', 'sparkline', 'stackedArea', 'network']);

/** 统计屏的数据（内容包 screens.stats + 可选的 screens.series / keyValues） */
export function chartData(): ChartData {
  const s = pack().screens, st = s.stats;
  // 键值行没写时：表头 + 第一行，第四列与统计表同一写法（满值 30,000 的数量，或百分比）
  const col4 = (v: number) => (st.unit === 'pct' ? `${Math.round(v * 100)}%` : Math.round(v * 30000).toLocaleString('en'));
  const cells = st.head.map((_, i) => (i === 3 ? col4(Number(st.rows[0]?.[4] ?? 0)) : String(st.rows[0]?.[i + 1] ?? '')));
  const pairs = s.keyValues ?? st.head.map((h, i): [string, string] => [h, cells[i]]);
  return { head: st.head, rows: st.rows, series: s.series, pairs, cells };
}
/** 第 i 条的颜色：类别色（col.coding = lineId）→ 强调色 / 第二强调色 / 好色 / 警告色轮换 */
const seriesColor = (e: ElCtx, i: number) => lineColor(e, i) ?? [e.accent, e.accent2, e.good, e.warn, e.bad][i % 5];
/** 一行的走势：给了用给的，否则按行的数值生成 8 个点（确定的） */
function seriesOf(d: ChartData, i: number): number[] {
  if (d.series?.[i]?.length) return d.series[i];
  const row = d.rows[i] ?? [], base = Number(row[row.length - 1] ?? 0.5) || 0.5;
  return Array.from({ length: 8 }, (_, k) => Math.max(0.02, base * (0.35 + 0.65 * (k / 7)) * (1 + 0.18 * Math.sin(k * 1.7 + i * 2.1))));
}

/** 墨迹（inkNumber）：一团主墨（16 个点、半径按种子起伏的毛边，两层：淡的外晕 + 实的墨心）+ 三颗溅出的墨点；种子 = 序号（确定的） */
function inkSplat(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, c: string, seed: number) {
  const n = 16, wob = (j: number, k: number) => 0.5 + 0.5 * Math.sin(j * 2.3 + seed * 1.7 + k * 0.9) * Math.cos(j * 1.1 + seed * 0.6);
  const blob = (sc: number, k: number) => {
    g.beginPath();
    for (let j = 0; j <= n; j++) { const t = (j % n) / n * Math.PI * 2, rr = R * sc * (0.82 + 0.3 * wob(j % n, k)); if (j) g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.92); else g.moveTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.92); }
    g.closePath();
  };
  g.save();
  g.fillStyle = withAlpha(c, 0.35); blob(1.12, 1); g.fill();
  g.fillStyle = withAlpha(c, 0.9); blob(0.92, 2); g.fill();
  for (let j = 0; j < 3; j++) { const t = seed * 2.1 + j * 2.4, d = R * (1.08 + 0.14 * j); g.beginPath(); g.arc(cx + Math.cos(t) * d, cy + Math.sin(t) * d * 0.9, R * (0.11 - j * 0.025), 0, Math.PI * 2); g.fill(); }
  g.restore();
}
/** 画一种数据图，返回实际画到的矩形（调用方登记占位用）；ink = 压在实底上时的字色 */
export function statViz(e: ElCtx, kind: string, r: Rect, d: ChartData = chartData(), ink?: string): Rect {
  const g = e.g, k = e.k, S = (n: number) => n * k, text = ink ?? e.text;
  switch (kind) {
    case 'keyValue': {
      // 单列「标签  值」：标签次要色、值粗体（数字经 drawNumber），可带行首图标
      const pairs = d.pairs?.length ? d.pairs : d.head.map((h, i) => [h, String(d.rows[0]?.[i + 1] ?? '')] as [string, string]);
      const lo = { ...e.base, color: ink ? withAlpha(ink, 0.7) : mutedOf(e, 0.7) }, vo: Partial<TextOpts> = { ...e.title, size: e.base.size * 1.25, color: text }, rh = Math.max(S(30), LH(e, vo, 1.5));
      const lw = Math.max(...pairs.map(([l]) => W(e, l, lo))) + S(16);
      pairs.forEach(([l, v, ic], i) => {
        const y = r.y + i * rh;
        if (y + rh > r.y + r.h + 1) return;
        let x = r.x;
        if (ic) { icon(e, ic, x + S(10), y + rh / 2, S(16)); x += S(24); }
        T(e, l, x, y, rh, lo);
        drawNumber(e, v, x + lw, y, rh, vo);
        g.fillStyle = withAlpha(text, 0.12); g.fillRect(r.x, y + rh - Math.max(1, S(1)), r.w, Math.max(1, S(1)));
      });
      return { x: r.x, y: r.y, w: r.w, h: Math.min(r.h, pairs.length * rh) };
    }
    case 'inkNumber': {
      // 墨团数字：每项一团类别色的墨迹（一团带毛边的主墨 + 几颗溅出的墨点），压大号白数字，下面菱形点（数值个）+ 名字。
      // B5 审查修复 ⑲：数字按统计表同一写法格式化（第四列是 0–1 的比例，原来四舍五入成「1」）、按位数缩字号放进墨团；菱形点只给 0–10 的整数（大数原来压满 6 颗）；
      // 墨团原来是 5 个硬边的半透明圆（读成一串气泡）
      const items = d.head.slice(0, 4).map((h, i) => [h, Number(d.rows[0]?.[i + 1] ?? i + 2), d.cells?.[i] ?? String(Math.round(Number(d.rows[0]?.[i + 1] ?? i + 2)))] as [string, number, string]);
      const cw = r.w / items.length, R = Math.min(cw * 0.32, r.h * 0.3);
      items.forEach(([name, v, n], i) => {
        const cx = r.x + cw * (i + 0.5), cy = r.y + R * 1.15, c = seriesColor(e, i);
        inkSplat(g, cx, cy, R, c, i);
        const no0 = { ...e.title, size: R * 1.05, weight: 900, color: '#fff', outline: { color: withAlpha(mix(c, '#000000', 0.6), 0.85), width: 2 } };
        const w0 = numberWidth(e, n, no0), no = w0 > R * 1.8 ? { ...no0, size: no0.size * (R * 1.8) / w0 } : no0;
        drawNumber(e, n, cx - numberWidth(e, n, no) / 2, cy - R * 0.75, R * 1.5, no);
        // 菱形点：实心 = 数值、空心补到 6（数值 7–10 时 10 颗）；不是 0–10 的整数（伤害、比例）不画
        const pr = Math.max(2, S(3.5)), py = cy + R * 1.35, dots = Number.isInteger(v) && v >= 0 && v <= 10 ? (v > 6 ? 10 : 6) : 0;
        for (let j = 0; j < dots; j++) {
          const px = cx + (j - (dots - 1) / 2) * pr * 2.6;
          g.beginPath(); g.moveTo(px, py - pr); g.lineTo(px + pr, py); g.lineTo(px, py + pr); g.lineTo(px - pr, py); g.closePath();
          if (j < v) { g.fillStyle = c; g.fill(); } else { g.strokeStyle = withAlpha(c, 0.7); g.lineWidth = Math.max(1, S(1)); g.stroke(); }
        }
        const lo = { ...e.small, weight: 700, color: text, upper: true };
        T(e, name, cx - W(e, name, lo) / 2, py + pr + S(2), LH(e, lo, 1.3), lo);
      });
      return r;
    }
    case 'lineChart': case 'stackedArea': {
      // 坐标框 + 三道网格线；折线：每行一条（类别色），点上画小圆；堆叠面积：从下往上累加，每层半透明
      const pad = { l: S(26), b: S(18), t: S(6), r: S(6) }, q = { x: r.x + pad.l, y: r.y + pad.t, w: r.w - pad.l - pad.r, h: r.h - pad.t - pad.b };
      const n = Math.min(4, d.rows.length), ser = Array.from({ length: n }, (_, i) => seriesOf(d, i)), len = Math.max(...ser.map((s) => s.length));
      const stack = kind === 'stackedArea', top = stack ? Math.max(...Array.from({ length: len }, (_, j) => ser.reduce((s, x) => s + (x[j] ?? 0), 0))) : Math.max(...ser.flat());
      g.save();
      g.strokeStyle = withAlpha(text, 0.6); g.lineWidth = Math.max(1, S(1));
      g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x, q.y + q.h); g.lineTo(q.x + q.w, q.y + q.h); g.stroke();
      g.strokeStyle = withAlpha(text, 0.15);
      for (let j = 1; j <= 3; j++) { const y = q.y + q.h * (1 - j / 4); g.beginPath(); g.moveTo(q.x, y); g.lineTo(q.x + q.w, y); g.stroke(); }
      const X = (j: number) => q.x + (len > 1 ? (j / (len - 1)) * q.w : q.w / 2), Y = (v: number) => q.y + q.h * (1 - v / (top || 1));
      if (stack) {
        const base = new Array(len).fill(0);
        ser.forEach((s, i) => {
          const lo = base.slice(); for (let j = 0; j < len; j++) base[j] += s[j] ?? 0;
          g.beginPath(); for (let j = 0; j < len; j++) g.lineTo(X(j), Y(base[j])); for (let j = len - 1; j >= 0; j--) g.lineTo(X(j), Y(lo[j])); g.closePath();
          g.fillStyle = withAlpha(seriesColor(e, i), 0.55); g.fill(); g.strokeStyle = seriesColor(e, i); g.lineWidth = Math.max(1, S(1.2)); g.stroke();
        });
      } else {
        ser.forEach((s, i) => {
          const c = seriesColor(e, i);
          g.strokeStyle = c; g.lineWidth = Math.max(1.5, S(2)); g.lineJoin = 'round'; g.beginPath(); s.forEach((v, j) => g.lineTo(X(j), Y(v))); g.stroke();
          g.fillStyle = c; s.forEach((v, j) => { g.beginPath(); g.arc(X(j), Y(v), Math.max(1.5, S(2.2)), 0, Math.PI * 2); g.fill(); });
        });
      }
      g.restore();
      // 图例：每行一个色块 + 名字（右上）
      const lo = { ...e.small, size: Math.max(8, e.small.size * 0.85), color: text };
      let lx = q.x + q.w;
      for (let i = n - 1; i >= 0; i--) { const nm = String(d.rows[i][0]); lx -= W(e, nm, lo) + S(16); g.fillStyle = seriesColor(e, i); g.fillRect(lx, q.y + S(4), S(8), S(8)); T(e, nm, lx + S(11), q.y, S(16), lo); }
      return r;
    }
    case 'sparkline': {
      // 迷你走势：一条细折线 + 下方淡面积 + 末点圆点（tooltip / 详情里的小图）
      const s = seriesOf(d, 0), top = Math.max(...s), lo = Math.min(...s), c = seriesColor(e, 0);
      const X = (j: number) => r.x + (s.length > 1 ? (j / (s.length - 1)) * r.w : r.w / 2), Y = (v: number) => r.y + r.h * (1 - (v - lo) / ((top - lo) || 1)) * 0.9 + r.h * 0.05;
      g.save();
      g.beginPath(); s.forEach((v, j) => g.lineTo(X(j), Y(v))); g.lineTo(X(s.length - 1), r.y + r.h); g.lineTo(X(0), r.y + r.h); g.closePath(); g.fillStyle = withAlpha(c, 0.18); g.fill();
      g.beginPath(); s.forEach((v, j) => g.lineTo(X(j), Y(v))); g.strokeStyle = c; g.lineWidth = Math.max(1, S(1.5)); g.lineJoin = 'round'; g.stroke();
      g.fillStyle = c; g.beginPath(); g.arc(X(s.length - 1), Y(s[s.length - 1]), Math.max(2, S(2.5)), 0, Math.PI * 2); g.fill();
      g.restore();
      return r;
    }
    default: {
      // network：每行一个气泡（大小按最后一列数值），排成两圈（确定的），相邻与隔一个的连线；气泡类别色，名字写在下面
      const n = Math.min(10, d.rows.length), cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.min(r.w, r.h) * 0.36;
      const vals = d.rows.slice(0, n).map((x) => Number(x[x.length - 1] ?? 0.5) || 0.5), vmax = Math.max(...vals);
      const pts = vals.map((_, i) => { const ring = i % 2 ? 0.55 : 1, t = (i / n) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(t) * R * ring, cy + Math.sin(t) * R * ring] as [number, number]; });
      g.save(); g.strokeStyle = withAlpha(text, 0.35); g.lineWidth = Math.max(1, S(1));
      g.beginPath(); for (let i = 0; i < n; i++) for (const j of [i + 1, i + 2]) { if (j >= n) continue; g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[j][0], pts[j][1]); } g.stroke();
      pts.forEach(([x, y], i) => {
        const rr = S(6) + (vals[i] / (vmax || 1)) * S(14), c = seriesColor(e, i);
        g.fillStyle = withAlpha(c, 0.85); g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.strokeStyle = withAlpha('#000', 0.5); g.stroke();
        const nm = String(d.rows[i][0]), lo = { ...e.small, size: Math.max(8, e.small.size * 0.8), color: text };
        T(e, nm, x - W(e, nm, lo) / 2, y + rr, S(14), lo);
      });
      g.restore();
      return r;
    }
  }
}
