import { withAlpha } from '../material';
import { drawBox, logTarget, type Rect } from '../paint';
import { frameOccupancy, intersects } from '../compose/occupancy';
import { simNow } from '../sim';
import { DATA, drawNumber, fitW, LH, numberWidth, registerElement, T, W, type ElCtx } from './core';

/*
 * 播报类元素（M12b-30，§3 的 elements/broadcast.ts，K1 G-el-broadcast-film / G-el-device：电视转播包装、镜头屏显两个 P1 家族的身份件）：
 *   el.ticker = 滚动新闻 / 行情条（cyberpunk-2077#10）、el.lowerThird = 下三分之一人名条、el.viewfinder = 整屏取景框（四角 L 形 + 对焦框 + 三分线 + REC + 电池 + 时间码）。
 * 样本：内容包 hud.ticker / hud.lowerThird（content/types.ts，都可不写：新闻 = 信息流，人名条 = 玩家名 + 称号）。跑马条的滚动跟模拟时钟（静帧 t = 0，QA 截图稳定）。
 * Godot：ticker = Label + AnimationPlayer（position.x 循环）；lowerThird = HBox(Panel 队徽, VBox(Label, Label))；viewfinder = 全屏自绘 Control（_draw）
 */

const S = (e: ElCtx, n: number) => n * e.k;

/** 跑马条的条目：新闻 = 内容包 hud.ticker（没写时信息流 hud.feed），行情 = 「代号 ▲ 涨跌%」（按条目序号给演示值） */
function tickerItems(e: ElCtx): { text: string; tone?: 'good' | 'bad' }[] {
  const src = DATA.ticker?.length ? DATA.ticker : DATA.feed;
  if (e.forms[0] !== 'stocks') return src.map((text) => ({ text }));
  const codes = ['SNW', 'FRY', 'LUX', 'ARC', 'ION', 'MLT'];
  return codes.map((c, i) => { const d = ((i * 37) % 11) / 2 - 2.2; return { text: `${c} ${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%`, tone: d >= 0 ? 'good' : 'bad' }; });
}
registerElement({
  id: 'el.ticker', forms: ['news', 'stocks'], anchor: 'tc',
  formDefaults: { stocks: { anchor: 'br' } },
  // 锚点没显式给时：新闻条在上中、行情条在右下（单画法时 elx.screenAnchor 的兜底 tl 会盖过 anchor，经 formAnchor 给）
  formAnchor: (_r, form) => (form === 'stocks' ? 'br' : 'tc'),
  size: (e) => ({ w: e.forms[0] === 'stocks' ? Math.min(e.R.w * 0.5, S(e, 420)) : e.R.w * 0.96, h: Math.max(S(e, 24), LH(e, e.small, 1.7)) }),
  draw: (e, a) => {
    const g = e.g, items = tickerItems(e), news = e.forms[0] !== 'stocks', lab = news ? 'NEWS' : 'MARKET';
    g.save(); g.fillStyle = withAlpha('#06070a', 0.82); g.fillRect(a.x, a.y, a.w, a.h); g.fillStyle = e.accent; g.fillRect(a.x, a.y + a.h - S(e, 2), a.w, S(e, 2));
    // 左端的台标小牌（强调色底 + 粗体 ASCII）
    const lo = { ...e.small, weight: 800, color: '#fff' }, lw = W(e, lab, lo) + S(e, 14);
    g.fillStyle = e.accent; g.fillRect(a.x, a.y, lw, a.h); T(e, lab, a.x + S(e, 7), a.y, a.h, lo);
    // 条目：跟模拟时钟往左滚（mo.idle = marquee 的静帧：t = 0），裁在条里
    g.beginPath(); g.rect(a.x + lw, a.y, a.w - lw, a.h); g.clip();
    const tx = e.tx; if (tx !== g) { tx.save(); tx.beginPath(); tx.rect(a.x + lw, a.y, a.w - lw, a.h); tx.clip(); }
    const gap = S(e, 28), widths = items.map((it) => W(e, it.text, e.small)), span = widths.reduce((s, w) => s + w + gap, 0), t = simNow().t;
    let x = a.x + lw + S(e, 10) - (span > 0 ? (t * S(e, 40)) % span : 0);
    // 条目一轮一轮接着画，直到铺满整条（B9 审查修复 ⑳：原来只画两轮，3 条新闻在宽条上滚到一半就空了一大截）
    for (let k = 0; k < 64 && span > 0 && x < a.x + a.w; k++) items.forEach((it, i) => { const c = it.tone === 'good' ? e.good : it.tone === 'bad' ? e.bad : '#e8e8ea'; T(e, it.text, x, a.y, a.h, { ...e.small, color: c }); x += widths[i] + gap; if (x < a.x + a.w) { g.fillStyle = withAlpha('#ffffff', 0.4); g.fillRect(x - gap / 2 - 1, a.y + a.h * 0.4, 2, a.h * 0.2); } });
    if (tx !== g) tx.restore();
    g.restore();
    logTarget(g, a, lab);
  },
});

/** 人名条的字：内容包 hud.lowerThird（名字、头衔、队徽字），没写时玩家名 + 称号 + 头像首字 */
const lowerThirdOf = () => { const l = DATA.lowerThird, p = DATA.profile; return { name: l?.name ?? p.name, title: l?.title ?? p.title, team: l?.team ?? p.initial }; };
registerElement({
  id: 'el.lowerThird', forms: ['bar', 'tag'], anchor: 'bl',
  formAnchor: () => 'bl',
  size: (e) => { const l = lowerThirdOf(), no = { ...e.title, weight: 800 }; return { w: fitW(e, S(e, 260), [[l.name, no], [l.title, e.small]], S(e, 96)), h: Math.max(S(e, 58), LH(e, no, 1.2) + LH(e, e.small, 1.4) + S(e, 10)) }; },
  draw: (e, a) => {
    const g = e.g, l = lowerThirdOf(), no = { ...e.title, weight: 800, color: '#fff' }, so = { ...e.small, weight: 700, upper: true, spacing: 0.12 };
    const bs = a.h, nh = LH(e, no, 1.2);
    if (e.forms[0] === 'tag') {
      // 一块实底小牌：左边队徽方块 + 名字 / 头衔两行
      drawBox(g, a, { bg: { solid: withAlpha('#0c0d10', 0.86) }, radius: S(e, 3) }, e.pal);
    } else {
      // 两条斜切色带：上面名字带（深色，左端队徽）、下面头衔带（强调色，略短）——下三分之一的标准件
      g.save();
      g.fillStyle = withAlpha('#0c0d10', 0.9); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + a.w, a.y); g.lineTo(a.x + a.w - S(e, 14), a.y + nh + S(e, 8)); g.lineTo(a.x, a.y + nh + S(e, 8)); g.closePath(); g.fill();
      g.fillStyle = e.accent; g.beginPath(); g.moveTo(a.x + bs, a.y + nh + S(e, 8)); g.lineTo(a.x + a.w * 0.82, a.y + nh + S(e, 8)); g.lineTo(a.x + a.w * 0.82 - S(e, 10), a.y + a.h); g.lineTo(a.x + bs, a.y + a.h); g.closePath(); g.fill();
      g.restore();
    }
    // 队徽：第二强调色方块 + 队名首字
    drawBox(g, { x: a.x, y: a.y, w: bs, h: a.h }, { bg: { solid: e.accent2 } }, e.pal);
    const to = { ...e.title, weight: 900, size: bs * 0.42, color: '#fff' }; T(e, l.team, a.x + bs / 2 - W(e, l.team, to) / 2, a.y, a.h, to);
    T(e, l.name, a.x + bs + S(e, 10), a.y + S(e, 4), nh, no);
    T(e, l.title, a.x + bs + S(e, 10), a.y + nh + S(e, 8), a.h - nh - S(e, 8), { ...so, color: e.forms[0] === 'tag' ? withAlpha('#fff', 0.7) : '#fff' });
    logTarget(g, a, l.name);
  },
});

/**
 * 整屏取景框（el.viewfinder，镜头屏显：取景器 / 摄像机 / 监控）：四角 L 形括角、中心对焦框、三分线（camera）/ 摄像头编号（cctv）、左上 REC 闪点（每秒闪一次，静帧亮）、
 * 右上电池格、下方正中 HH:MM:SS:FF 时间码。画在整个画面上（元素报 10 × 10、不占锚点位）；字都是 ASCII
 */
/** 取景框的几何（draw 与 reserve 同一份）：边距 m、括角长 L、四角括角块、左上 REC 行、右上电池、下方正中时间码（时间码按最宽的「00:00:00:00」量） */
function vfGeom(e: ElCtx) {
  const R = e.R, m = Math.max(S(e, 24), Math.min(R.w, R.h) * 0.06), L = Math.min(R.w, R.h) * 0.08, lw = Math.max(1.5, S(e, 2));
  const so = { ...e.small, weight: 800 }, to = { ...e.base, weight: 700 }, tw = numberWidth(e, '00:00:00:00', to), th = LH(e, to, 1.3);
  const lab = e.forms[0] === 'cctv' ? 'CAM 03' : 'REC', bw = S(e, 34), bh = S(e, 14);
  const corners = [[R.x + m, R.y + m], [R.x + R.w - m - L, R.y + m], [R.x + m, R.y + R.h - m - L], [R.x + R.w - m - L, R.y + R.h - m - L]].map(([x, y]) => ({ x: x - lw, y: y - lw, w: L + lw * 2, h: L + lw * 2 }));
  const rec = { x: R.x + m + S(e, 4), y: R.y + m + L + S(e, 4), w: S(e, 18) + W(e, lab, so) + S(e, 4), h: S(e, 20) };
  const bat = { x: R.x + R.w - m - bw - S(e, 4), y: R.y + m + L + S(e, 7), w: bw + S(e, 3), h: bh };
  const tc = { x: R.x + R.w / 2 - tw / 2, y: R.y + R.h - m - th, w: tw, h: th };
  return { R, m, L, lw, so, to, lab, bw, bh, corners, rec, bat, tc };
}
/**
 * 画的时候的位置（B9 审查修复 ⑤ / ㉑）：排位时别的元素已经按 reserve 让过；还压着排好的元素（挪不动的一整列）时 REC 行挪到它们右边、电池挪到左边、时间码挪到上面
 * （各自不越过画面中线），放不下就留在原位。draw 与 extraRects（登记实际画出的块）同一份
 */
function vfPlaced(e: ElCtx) {
  const q = vfGeom(e), R = q.R, gp = S(e, 8);
  const bl = frameOccupancy().items.filter((o) => !o.under && o.kind !== 'player' && o.kind !== 'world' && o.id !== e.id && !(o.id ?? '').endsWith(`:${e.id}`));
  const hits = (a: Rect) => bl.filter((o) => intersects(a, o.rect));
  const move = (a: Rect, f: (h: Rect[]) => Rect, ok: (b: Rect) => boolean): Rect => { const h = hits(a).map((o) => o.rect); if (!h.length) return a; const b = f(h); return ok(b) && !hits(b).length ? b : a; };
  const rec = move(q.rec, (h) => ({ ...q.rec, x: Math.max(...h.map((o) => o.x + o.w)) + gp }), (b) => b.x + b.w <= R.x + R.w * 0.45);
  const bat = move(q.bat, (h) => ({ ...q.bat, x: Math.min(...h.map((o) => o.x)) - gp - q.bat.w }), (b) => b.x >= R.x + R.w * 0.55);
  const tc = move(q.tc, (h) => ({ ...q.tc, y: Math.min(...h.map((o) => o.y)) - S(e, 6) - q.tc.h }), (b) => b.y >= R.y + R.h * 0.5);
  return { ...q, rec, bat, tc };
}
registerElement({
  id: 'el.viewfinder', forms: ['camera', 'cctv'], anchor: 'center',
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  // 四角括角、REC 行、电池、时间码都是跟画面走的成块小件：别的元素排位时让开它们（B9 审查修复 ⑤ / ㉑：原来只报中心 10 × 10，HUD 元素压在 REC / 时间码上）
  reserve: (e) => { const q = vfGeom(e); return [...q.corners, q.rec, q.bat, q.tc]; },
  // 实际画出的块（让位以后的位置）登记进帧占位表
  extraRects: (e) => { const q = vfPlaced(e); return [...q.corners, q.rec, q.bat, q.tc]; },
  draw: (e) => {
    const g = e.g, { R, m, L, lw, so: so0, to: to0, lab, bw, bh, rec, bat, tc: tcR } = vfPlaced(e), c = '#f2f2f2';
    g.save(); g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'square';
    for (const [x, y, sx, sy] of [[R.x + m, R.y + m, 1, 1], [R.x + R.w - m, R.y + m, -1, 1], [R.x + m, R.y + R.h - m, 1, -1], [R.x + R.w - m, R.y + R.h - m, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, fw = Math.min(R.w, R.h) * 0.14;
    if (e.forms[0] === 'camera') {
      // 中心对焦框 + 三分线（淡）
      g.strokeRect(cx - fw / 2, cy - fw * 0.36, fw, fw * 0.72);
      g.strokeStyle = withAlpha(c, 0.25); g.lineWidth = 1;
      for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(R.x + R.w * f, R.y + m); g.lineTo(R.x + R.w * f, R.y + R.h - m); g.stroke(); g.beginPath(); g.moveTo(R.x + m, R.y + R.h * f); g.lineTo(R.x + R.w - m, R.y + R.h * f); g.stroke(); }
    } else { g.beginPath(); g.moveTo(cx - S(e, 10), cy); g.lineTo(cx + S(e, 10), cy); g.moveTo(cx, cy - S(e, 10)); g.lineTo(cx, cy + S(e, 10)); g.stroke(); }
    g.restore();
    const so = { ...so0, color: c }, t = simNow().t, on = Math.floor(t) % 2 === 0;
    // REC 闪点
    if (on) { g.fillStyle = '#e5484d'; g.beginPath(); g.arc(rec.x + S(e, 6), rec.y + S(e, 10), S(e, 6), 0, Math.PI * 2); g.fill(); }
    T(e, lab, rec.x + S(e, 18), rec.y, S(e, 20), so);
    // 电池格（4 格亮 3）
    const bx = bat.x, by = bat.y;
    g.strokeStyle = c; g.lineWidth = 1.5; g.strokeRect(bx, by, bw, bh); g.fillStyle = c; g.fillRect(bx + bw, by + bh * 0.3, S(e, 3), bh * 0.4);
    for (let i = 0; i < 3; i++) g.fillRect(bx + S(e, 3) + i * ((bw - S(e, 6)) / 4), by + S(e, 3), (bw - S(e, 6)) / 4 - S(e, 2), bh - S(e, 6));
    // 时间码 HH:MM:SS:FF（按模拟时钟走，静帧固定）
    const sec = Math.floor(t), fr = Math.floor((t % 1) * 24), tc = `00:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
    const to = { ...to0, color: c }, tw = numberWidth(e, tc, to);
    drawNumber(e, tc, tcR.x + tcR.w / 2 - tw / 2, tcR.y, tcR.h, to);
  },
});
