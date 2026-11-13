import { borderWidths, boxPath, drawBox, drawText, fitLine, measure, QUALITY, resolveColor, withTransform, type Rect, type TextOpts } from '../paint';
import { worldNow } from '../world';
import { drawGlyph, glyphSetOf, glyphWidth, mouseButtonOf } from '../glyphs';
import { afterSkin, type Theme } from '../sys/theme';
import { enterXf, simNow } from '../sim';
import type { BoxStyle, SkinTokens } from '../types';
import { liveView, pack, type ContentPack } from '../content';
import type { PadButton } from '../content/types';

/*
 * "全部控件展示"之前的样本 HUD（M1 的四个控件：状态面板、小地图、交互提示、对话框），按信息密度增减：
 *   0 极简：只有交互提示；1 稀疏：状态面板（无资源行）+ 提示；2 中等：M1 原样（旧皮肤逐像素一致）；
 *   3 密集：再加通知滚动列与底部技能栏；4 极密：再加右侧任务追踪与多一行资源。
 * M5a 起由信息元素系统（compose/elements）接管；这里保留为旧皮肤的回归基线。
 * 样本字来自当前内容包（docs/c1-content-packs.md）的 hud 字段；雪线旅人包里就是原来写死的"旅人 / 木材 24 / 打开宝箱 / 向导的台词"。
 */

/** 四控件的样本字：状态面板标题、生命、两行资源 [符号, "名 数量"]、交互键（与它的手柄按钮）与动作、对白的说话人与台词、通知三行、任务三行 */
export interface SampleText { title: string; hp: number; row: [string, string][]; row2: [string, string][]; key: string; pad?: PadButton; prompt: string; name: string; line: string; feed: string[]; quest: string[] }

const SAMPLE_CACHE = new WeakMap<ContentPack, SampleText>();
/** 某个包的四控件样本（按包缓存；drawSample 用 sampleOf(pack())，HudSystem 之外要用时传 packFor(r)） */
export function sampleOf(p: ContentPack): SampleText {
  let s = SAMPLE_CACHE.get(p);
  if (!s) {
    const h = p.hud;
    s = { title: h.m1.title, hp: h.hp, row: h.m1.row, row2: h.m1.row2, key: h.interactKey, pad: h.interactPad, prompt: h.interact, name: h.subtitle[0], line: h.subtitle[1], feed: h.feed, quest: h.objective };
    SAMPLE_CACHE.set(p, s);
  }
  return s;
}

/** 过渡视图：当前包的四控件样本（已经没有消费方——Godot 导出直接读 packFor(r).hud，drawSample 用 sampleOf；删不删由维护者定） */
export const SAMPLE: SampleText = liveView(() => sampleOf(pack()));

/**
 * 开发 / QA 开关（docs/workbench-redesign.md §8 RC2）：开时局内 HUD 在没选品类布局时仍画这份 M1 四控件回归样本；
 * 关（默认）时跟随画面品类的布局直接画元素 HUD。只由开发钩子 __gae.hudQa.sample(on) 改
 */
export const SAMPLE_HUD = { on: false };

const merge = (a: BoxStyle, b?: Partial<BoxStyle>): BoxStyle => ({ ...a, ...(b ?? {}) });
/** 装饰分隔线放在标题行下沿 */
const withDivider = (s: BoxStyle, at: number): BoxStyle => (s.ornament ? { ...s, ornament: { ...s.ornament, dividerAt: at } } : s);

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  /** 文字层：UI 像素化时盒子画在低分辨率画布上，文字单独画在全分辨率画布上保持可读；平时就是 ctx */
  t?: CanvasRenderingContext2D;
  /** 毛玻璃遮罩画布（半分辨率） */
  m: CanvasRenderingContext2D;
  blur: number;
  /** 整张画布（设计单位，M12a-24）：钉住画幅时替换背景铺满它，构图的 R 只是黑边以内的内容区；没给 = R */
  full?: Rect;
}

/** 文字样式：正文 + 皮肤 body（旧皮肤没有 body，与 M1 一致） */
export function bodyOpts(t: SkinTokens, pal: Theme['pal']): TextOpts {
  const b = t.body ?? {};
  return {
    font: t.font, size: t.textSize ?? 13, weight: b.weight ?? 400, color: resolveColor(t.text, pal),
    glow: t.textGlow ? resolveColor(t.textGlow, pal) : undefined,
    upper: b.upper, spacing: b.spacing, italic: b.italic,
    outline: b.outline ? { ...b.outline, color: resolveColor(b.outline.color, pal) } : undefined,
    shadow: b.shadow ? { ...b.shadow, color: resolveColor(b.shadow.color, pal) } : undefined,
    glowColor: b.glowColor ? resolveColor(b.glowColor, pal) : undefined,
  };
}

export function titleOpts(t: SkinTokens, pal: Theme['pal'], base: TextOpts, which: 'title' | 'name'): TextOpts {
  const s = (which === 'title' ? t.title : t.name) ?? {};
  return {
    ...base, weight: 800, ...s, font: s.font ?? base.font,
    color: resolveColor(s.color ?? t.text, pal), size: s.size ?? t.textSize ?? 13,
    outline: s.outline ? { ...s.outline, color: resolveColor(s.outline.color, pal) } : base.outline,
    shadow: s.shadow ? { ...s.shadow, color: resolveColor(s.shadow.color, pal) } : base.shadow,
    glowColor: s.glowColor ? resolveColor(s.glowColor, pal) : base.glowColor,
  };
}

/** 画一个盒子（含毛玻璃遮罩与倾斜 / 旋转） */
export function box(d: DrawCtx, r: Rect, st: BoxStyle, pal: Theme['pal'], inner: () => void, anim?: { i: number; enter: string; idle: string }) {
  // 入场（mo.enter）与待机（mo.idle）：给整块控件加透明度 / 位移 / 缩放 / 轻微摇摆（M5b）
  if (anim) {
    const s = simNow();
    const xf = enterXf(s, anim.enter, anim.i);
    const fl = anim.idle === 'float' ? Math.sin(s.idle * 2.2 + anim.i) * 2 : 0;
    const sw = anim.idle === 'sway' ? Math.sin(s.idle * 1.6 + anim.i) * 0.6 : 0;
    if (xf.alpha < 1 || xf.dx || xf.dy || xf.scale !== 1 || fl || sw) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const ctxs = d.t && d.t !== d.ctx ? [d.ctx, d.t] : [d.ctx];
      for (const c of ctxs) { c.save(); c.globalAlpha *= Math.max(0, xf.alpha); c.translate(cx + xf.dx, cy + xf.dy + fl); c.rotate((sw * Math.PI) / 180); c.scale(xf.scale, xf.scale); c.translate(-cx, -cy); }
      box(d, r, st, pal, inner);
      for (const c of ctxs) c.restore();
      return;
    }
  }
  const t = d.t;
  // 盒子与里面的内容一起旋转 / 斜切：变换在这里套一次，drawBox 拿到去掉 rotate / skewX 的样式（它自己也会套，M12a-06）
  withTransform(d.ctx, r, st, () => { drawBox(d.ctx, r, { ...st, rotate: 0, skewX: 0 }, pal); if (t) withTransform(t, r, st, inner); else inner(); });
  if (st.backdropBlur) {
    d.blur = Math.max(d.blur, st.backdropBlur);
    withTransform(d.m, r, st, () => { d.m.beginPath(); boxPath(d.m, r, st); d.m.fillStyle = '#fff'; d.m.fill(); });
  }
}

export function drawSample(d: DrawCtx, R: Rect, th: Theme) {
  const { ctx } = d;
  const tx = d.t ?? ctx;
  const t = th.tokens, pal = th.pal, density = th.density;
  // 版面缩放（大字号平台）；旧皮肤不改字号时 k = 1，与 M1 一致
  const k = th.scale;
  const base = bodyOpts(t, pal);
  const titleO = titleOpts(t, pal, base, 'title');
  const nameO = titleOpts(t, pal, base, 'name');
  const panel = t.panel;
  const bw = borderWidths(panel);
  const iconO = (c: string) => ({ ...base, size: t.textSize ?? 12, color: resolveColor(c, pal) });
  // 动画（M5b）：入场方式与待机方式；不触发事件时这些都不改变画面（旧皮肤回归不受影响）
  const sim = simNow();
  const enter = th.r.str('mo.enter', 'cut'), idle = th.r.str('mo.idle', 'none');
  const A = (i: number) => ({ i, enter, idle });
  // 样本字：当前内容包（HudSystem 画这一侧之前已 setPack）
  const smp = sampleOf(pack());

  // 1 状态面板：左上角，宽 200（含边框与内边距 10/12）
  if (density >= 1) {
    const titleLH = titleO.size * 1.5;
    const barH = t.bar.height;
    const rows = density >= 4 ? 2 : density >= 2 ? 1 : 0;
    const status: Rect = { x: R.x + 14, y: R.y + 14, w: 200 * k, h: bw.t + 10 + titleLH + 6 + barH + rows * (6 + 18) * k + 10 + bw.b };
    // §8 RC2（轨道 E）：品质下限开着时不画标题行下那条多余的装饰分隔线（四控件样本只剩开发 / QA 用）
    box(d, status, QUALITY.on ? panel : withDivider(panel, bw.t + 10 + titleLH + 2), pal, () => {
      const cx = status.x + bw.l + 12, cw = status.w - bw.l - bw.r - 24;
      let y = status.y + bw.t + 10;
      drawText(tx, smp.title, cx, y, titleLH, titleO);
      y += titleLH + 6;
      drawBar(ctx, { x: cx, y, w: cw, h: barH }, t, pal, sim.hp, sim);
      y += barH + 6;
      const rowO = { ...base, size: t.textSize ?? 12 };
      for (const row of [smp.row, smp.row2].slice(0, rows)) {
        let x = cx;
        row.forEach(([icon, label], i) => {
          if (i) x += 6 * k;
          x += drawText(tx, icon, x, y, 18 * k, iconO(t.icon)) + 6 * k;
          x += drawText(tx, label, x, y, 18 * k, rowO);
        });
        y += (18 + 6) * k;
      }
    }, A(0));
  }

  // 2 小地图：右上角 92×92，中间一个点
  if (density >= 2) {
    const ms = 92 * k;
    const mapR: Rect = { x: R.x + R.w - 14 - ms, y: R.y + 14, w: ms, h: ms };
    const mapS = merge(panel, t.map);
    box(d, mapR, mapS, pal, () => {
      // §8 RC2（轨道 E）：有场景时画引擎烘焙的真小地图（world.map：地形 + 未探索压暗 + 玩家箭头），没有场景时照原来的一个点
      const wm = QUALITY.on ? worldNow()?.map : undefined;
      if (wm) {
        const ins = Math.max(bw.l, 3), q = { x: mapR.x + ins, y: mapR.y + ins, w: ms - ins * 2, h: ms - ins * 2 };
        ctx.save(); ctx.beginPath(); ctx.rect(q.x, q.y, q.w, q.h); ctx.clip();
        ctx.imageSmoothingEnabled = true; ctx.drawImage(wm.canvas, q.x, q.y, q.w, q.h);
        const n = wm.en, cw = q.w / n, chh = q.h / n;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!wm.explored[j * n + i]) ctx.fillRect(q.x + i * cw, q.y + j * chh, cw + 0.5, chh + 0.5);
        const px = q.x + wm.player[0] * q.w, py = q.y + wm.player[1] * q.h;
        ctx.translate(px, py); ctx.rotate(-wm.heading);
        ctx.fillStyle = resolveColor('@accent', pal); ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -7 * k); ctx.lineTo(5 * k, 5 * k); ctx.lineTo(0, 2 * k); ctx.lineTo(-5 * k, 5 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.arc(mapR.x + ms / 2, mapR.y + ms / 2, 4 * k, 0, Math.PI * 2);
      ctx.fillStyle = resolveColor('@accent', pal);
      ctx.fill();
    }, A(1));
  }

  // 3 交互提示：水平居中、顶边在 58% 高度；按键 22×22 + 间距 8 + 文字
  {
    const keyO: TextOpts = { ...base, weight: 800, color: resolveColor(t.key.color ?? t.text, pal), font: t.key.font ?? t.font };
    const keyLabel = t.key.brackets ? `[${smp.key}]` : smp.key;
    const promptTextW = measure(tx, smp.prompt, base);
    const kz = 22 * k;
    // 手柄 / 触屏 / 文字图标（M10）；鼠标字形集里没有对应鼠标键的键照旧画键帽（B6 审查修复 ㉕：与 core.ts 的 keyCap 同口径，原来一律画成鼠标左键）
    const gset0 = glyphSetOf(th.r.str('ix.glyphs', 'keycap')), gset = gset0 === 'mouse' && !mouseButtonOf(smp.key, smp.pad) ? 'keycap' : gset0;
    const glyph = gset !== 'keycap' && gset !== 'brackets';
    // 字形着色（ix.glyphTint，M12b-59；旧皮肤只认皮肤之后的层）与字形实际的宽（触摸板手势 1.4 倍、肩键、文字图标比键帽宽：提示字跟在后面，不再压上去）
    const tv = th.r.str('ix.glyphTint', 'brand'), tint = (tv === 'mono' || tv === 'text') && (!th.legacy || afterSkin(th.r, 'ix.glyphTint')) ? { mode: tv, text: resolveColor(t.text, pal), face: resolveColor(th.surface, pal) } as const : undefined;
    const gw = glyph ? Math.max(kz, glyphWidth(tx, kz, smp.key, gset, keyO, smp.pad)) : kz;
    const pw = bw.l + 10 + gw + 8 + promptTextW + 10 + bw.r;
    const ph = bw.t + 4 + kz + 4 + bw.b;
    const promptR: Rect = { x: R.x + R.w / 2 - pw / 2, y: R.y + R.h * 0.58, w: pw, h: ph };
    box(d, promptR, panel, pal, () => {
      const kx = promptR.x + bw.l + 10, ky = promptR.y + bw.t + 4;
      const keyR: Rect = { x: kx, y: ky, w: kz, h: kz };
      // 键盘键帽与括号仍按皮肤按键样式画（旧皮肤原样）
      if (glyph) drawGlyph(ctx, tx, keyR, smp.key, gset, keyO, t.key, pal, smp.pad, tint);
      else {
        if (!t.key.brackets) drawBox(ctx, keyR, t.key, pal);
        const kw = measure(tx, keyLabel, keyO);
        drawText(tx, keyLabel, kx + kz / 2 - kw / 2, ky, kz, keyO);
      }
      drawText(tx, smp.prompt, kx + gw + 8, ky, kz, base);
    }, A(2));
  }

  // 4 对话框：底边距 40、宽 min(520, 70%)，名字 + 一行台词
  if (density >= 2) {
    const dw = Math.min(520 * k, R.w * (k > 1 ? 0.9 : 0.7));
    const dS = merge(panel, t.dialog);
    const dlh = 19.5 * k;
    const dh = bw.t + 10 + dlh + 2 + dlh + 10 + bw.b;
    const dlg: Rect = { x: R.x + R.w / 2 - dw / 2, y: R.y + R.h - 40 - dh - (density >= 3 ? 54 : 0), w: dw, h: dh };
    box(d, dlg, dS, pal, () => {
      const cx = dlg.x + bw.l + 14, cw = dlg.w - bw.l - bw.r - 28;
      let y = dlg.y + bw.t + 10;
      drawText(tx, smp.name, cx, y, dlh, nameO);
      y += dlh + 2;
      // 逐字（mo.textReveal + 对话事件）
      const full = fitLine(tx, smp.line, cw, base);
      drawText(tx, sim.reveal < 1 ? full.slice(0, Math.floor([...full].length * sim.reveal)) : full, cx, y, dlh, base);
      if (t.dialog?.tail) {
        const bx = dlg.x + bw.l + 30, by = dlg.y + dlg.h - bw.b - 6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 20, by);
        ctx.lineTo(bx + 10, by + 10);
        ctx.closePath();
        ctx.fillStyle = resolveColor(dS.border?.color ?? '#000', pal);
        ctx.fill();
      }
    });
  }

  // 5 密集：左侧通知滚动列 + 底部技能栏
  if (density >= 3) {
    const lh = (t.textSize ?? 13) * 1.6;
    smp.feed.forEach((line, i) => {
      const w = measure(tx, line, base) + 20 + bw.l + bw.r;
      const r: Rect = { x: R.x + 14, y: R.y + R.h * 0.42 + i * (lh + 6), w, h: lh + bw.t + bw.b };
      box(d, r, { ...panel, shadows: [] }, pal, () => drawText(tx, line, r.x + bw.l + 10, r.y + bw.t, lh, base));
    });
    const n = 6, sz = 40 * k, gap = 6;
    const x0 = R.x + R.w / 2 - (n * sz + (n - 1) * gap) / 2, y0 = R.y + R.h - 14 - sz;
    for (let i = 0; i < n; i++) {
      const r: Rect = { x: x0 + i * (sz + gap), y: y0, w: sz, h: sz };
      box(d, r, merge(panel, { ornament: undefined }), pal, () => {
        drawText(tx, String(i + 1), r.x + 5, r.y + 2, 12, { ...base, size: 10 });
        const g = pack().hud.m1.hotbar[i];
        const gw = measure(tx, g, iconO(t.icon));
        drawText(tx, g, r.x + sz / 2 - gw / 2, r.y + sz / 2 - 9, 18, iconO(i % 2 ? t.icon : '@accent2'));
      });
    }
  }

  // 6 极密：右侧任务追踪
  if (density >= 4) {
    const lh = (t.textSize ?? 13) * 1.6;
    const w = 190 * k;
    const r: Rect = { x: R.x + R.w - 14 - w, y: R.y + 14 + 92 * k + 12, w, h: bw.t + 10 + titleO.size * 1.5 + smp.quest.length * lh + 10 + bw.b };
    box(d, r, panel, pal, () => {
      let y = r.y + bw.t + 10;
      drawText(tx, '任务', r.x + bw.l + 12, y, titleO.size * 1.5, titleO);
      y += titleO.size * 1.5;
      smp.quest.forEach((q, i) => { drawText(tx, `${i ? '·' : '▸'} ${q}`, r.x + bw.l + 12, y, lh, base); y += lh; });
    });
  }
}

/** 血条：底槽（含边框）+ 填充（在底槽的内容区里，宽度按比例），超出底槽圆角的部分裁掉 */
export function drawBar(ctx: CanvasRenderingContext2D, r: Rect, t: SkinTokens, pal: Theme['pal'], value: number, fx?: { hpGhost: number; barFlash: number; barFlashColor: string; lowPulse: number }) {
  const tb = borderWidths(t.bar.track);
  drawBox(ctx, r, t.bar.track, pal);
  const inner: Rect = { x: r.x + tb.l, y: r.y + tb.t, w: r.w - tb.l - tb.r, h: r.h - tb.t - tb.b };
  const fill: Rect = { ...inner, w: inner.w * value };
  ctx.save();
  if (!t.bar.fill.glow) {
    ctx.beginPath();
    boxPath(ctx, r, t.bar.track, Math.max(tb.l, tb.t));
    ctx.clip();
  }
  if (t.bar.fill.glow) {
    ctx.shadowColor = resolveColor(t.bar.fill.glow.color, pal);
    ctx.shadowBlur = t.bar.fill.glow.blur * (ctx.getTransform().a || 1);
    ctx.fillStyle = resolveColor(t.bar.fill.glow.color, pal);
    ctx.fillRect(fill.x, fill.y, fill.w, fill.h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
  // 拖尾：受击后还没追上的那截（mo.valueChange = trail）
  if (fx && fx.hpGhost > value + 0.002) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(inner.x + inner.w * value, inner.y, inner.w * (fx.hpGhost - value), inner.h);
  }
  drawBox(ctx, fill, t.bar.fill, pal);
  if (fx && fx.barFlash > 0) { ctx.globalAlpha = fx.barFlash * 0.7; ctx.fillStyle = fx.barFlashColor; ctx.fillRect(inner.x, inner.y, inner.w, inner.h); ctx.globalAlpha = 1; }
  if (fx && fx.lowPulse > 0) { ctx.globalAlpha = 0.25 + fx.lowPulse * 0.35; ctx.fillStyle = '#ff2d2d'; ctx.fillRect(fill.x, fill.y, fill.w, fill.h); ctx.globalAlpha = 1; }
  ctx.restore();
}

/** 超宽时截断加省略号（终期审查修复 ⑦：挪到 paint.ts，元素层也用；这里转出去，原来的调用不变） */
export { fitLine };
