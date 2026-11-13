import { withAlpha } from '../material';
import { drawBox, drawText, inFx, logFx, measure, resolveColor, type Rect } from '../paint';
import type { SimState } from '../sim';
import type { Theme } from '../sys/theme';
import { bodyOpts, titleOpts, type DrawCtx } from './sample';

/*
 * 模拟事件在整屏上的表现（M5b）：飘字（伤害 / 回血 / 拾取）、升级横幅、获得提示、闪白、低血量暗角。
 * 震屏在 HudSystem 里平移整张画布；控件自己的变化（血条拖尾、冷却、逐字、入场）在各自的构图里。
 */
export function drawSimOverlays(d: DrawCtx, R: Rect, th: Theme, s: SimState) {
  const g = d.ctx, tx = d.t ?? g, t = th.tokens, pal = th.pal, k = th.scale;
  const base = bodyOpts(t, pal);
  const title = titleOpts(t, pal, base, 'title');
  // 低血量暗角（rel.metaFx = hurtVignette 时更重）
  if (s.vignette > 0) {
    const gr = g.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, Math.min(R.w, R.h) * 0.35, R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w, R.h) * 0.75);
    gr.addColorStop(0, 'rgba(160,0,0,0)');
    gr.addColorStop(1, `rgba(160,0,0,${s.vignette.toFixed(3)})`);
    g.fillStyle = gr;
    g.fillRect(R.x, R.y, R.w, R.h);
  }
  // 飘字
  for (const f of s.floaters) {
    const ax = f.anchor === 'target' ? R.x + R.w * 0.64 : R.x + R.w * 0.5;
    const ay = f.anchor === 'target' ? R.y + R.h * 0.42 : R.y + R.h * 0.6;
    const o = { ...title, size: 22 * k * f.scale, color: f.color, outline: { color: 'rgba(0,0,0,0.7)', width: 1.5 }, glow: undefined, glowColor: undefined };
    tx.save();
    tx.globalAlpha *= Math.max(0, Math.min(1, f.alpha));
    const fw = measure(tx, f.text, o), fr: Rect = { x: ax + f.x * k - fw / 2, y: ay + f.y * k - o.size, w: fw, h: o.size * 1.4 };
    if (f.alpha > 0.3) logFx(tx, fr, 'floater');
    inFx(() => drawText(tx, f.text, fr.x, fr.y, fr.h, o));
    tx.restore();
  }
  // 升级横幅：进场按入场缓动滑入，停留，退场淡出
  if (s.banner) {
    const p = s.banner.p;
    const a = p <= 1 ? Math.min(1, p * 1.5) : Math.max(0, 2 - p);
    const slide = p < 1 ? (1 - p) * -R.w * 0.3 : 0;
    const h = 64 * k, y = R.y + R.h * 0.3;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = withAlpha(resolveColor('@accent', pal), 0.88);
    g.fillRect(R.x + slide, y, R.w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(R.x + slide, y, R.w, 2); g.fillRect(R.x + slide, y + h - 2, R.w, 2);
    g.restore();
    if (a > 0.3) logFx(g, { x: R.x + slide, y, w: R.w, h }, 'banner');
    const o = { ...title, size: 28 * k, color: '#fff', glow: undefined, glowColor: undefined };
    tx.save(); tx.globalAlpha *= a;
    inFx(() => drawText(tx, s.banner!.text, R.x + R.w / 2 - measure(tx, s.banner!.text, o) / 2 + slide, y, h, o));
    tx.restore();
  }
  // 获得提示（右上滑入、淡出）
  if (s.toast) {
    const p = s.toast.p;
    const a = p < 0.12 ? p / 0.12 : p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1;
    const w = measure(tx, s.toast.text, base) + 28 * k, h = 32 * k;
    const r: Rect = { x: R.x + R.w - 14 - w + (p < 0.12 ? (1 - p / 0.12) * 40 : 0), y: R.y + R.h * 0.22, w, h };
    for (const c of tx === g ? [g] : [g, tx]) { c.save(); c.globalAlpha *= a; }
    if (a > 0.3) logFx(g, r, 'toast');
    inFx(() => {
      drawBox(g, r, { ...t.panel, ornament: undefined, fx: undefined, frame: undefined, rotate: 0, skewX: th.boxSkew, shadows: [] }, pal);
      drawText(tx, s.toast!.text, r.x + 14 * k, r.y, h, base);
    });
    for (const c of tx === g ? [g] : [tx, g]) c.restore();
  }
  // 元 UI 的整屏状态（rel.metaFx）：速度线、边缘光、故障
  const meta = th.r.list('rel.metaFx');
  if (meta.includes('speedLines')) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.45)';
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, rr = Math.hypot(R.w, R.h) / 2;
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2 + (i % 3) * 0.05, r0 = rr * (0.62 + ((i * 37) % 10) / 40); g.lineWidth = 1 + (i % 3); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.stroke(); }
    g.restore();
    // 速度线落在离中心 0.62 半径以外：四个角最密
    const cw = R.w * 0.22, chh = R.h * 0.22;
    for (const [x, y] of [[R.x, R.y], [R.x + R.w - cw, R.y], [R.x, R.y + R.h - chh], [R.x + R.w - cw, R.y + R.h - chh]]) logFx(g, { x, y, w: cw, h: chh }, 'speedLines');
  }
  if (meta.includes('edgeGlow')) {
    const gr = g.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, Math.min(R.w, R.h) * 0.42, R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w, R.h) * 0.72);
    gr.addColorStop(0, withAlpha(resolveColor('@accent2', pal), 0)); gr.addColorStop(1, withAlpha(resolveColor('@accent2', pal), 0.45));
    g.fillStyle = gr; g.fillRect(R.x, R.y, R.w, R.h);
  }
  if (meta.includes('glitch')) {
    for (let i = 0; i < 5; i++) { const y = R.y + ((Math.floor(s.t * 6) * 97 + i * 211) % 1000) / 1000 * R.h; g.fillStyle = i % 2 ? 'rgba(0,255,240,0.25)' : 'rgba(255,0,120,0.25)'; g.fillRect(R.x, y, R.w, 2 + (i % 3) * 3); logFx(g, { x: R.x, y, w: R.w, h: 2 + (i % 3) * 3 }, 'glitch'); }
  }
  // 闪白
  if (s.flash > 0.001) { g.fillStyle = `rgba(255,255,255,${s.flash.toFixed(3)})`; g.fillRect(R.x, R.y, R.w, R.h); }
}
