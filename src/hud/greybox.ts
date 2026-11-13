import { isHudCanvas, QUALITY, type Rect } from './paint';
import { mix, withAlpha } from './material';

/**
 * 占位的画法（docs/workbench-redesign.md §8 RC7，轨道 E）：默认画「按皮肤着色的剪影」——皮肤底色到强调色的渐变 + 程序剪影（宽的画远山、高的画人像、方的画一枚菱形徽），
 * 不写「需素材」；qa = true（开发 / QA：__gae.hudQa.placeholders(true)）时照原来的斜纹灰盒 + 字。tint 由 compose/layers.ts 每次合成前按这一侧的皮肤写
 */
export const PLACEHOLDER: { qa: boolean; tint: [string, string] } = { qa: false, tint: ['#3a4250', '#7b8798'] };

/** 按皮肤着色的剪影占位 */
function tintedPlaceholder(g: CanvasRenderingContext2D, r: Rect, label: string, o: { alpha?: number; radius?: number; small?: boolean; opaque?: boolean; faint?: number }) {
  const [c0, c1] = PLACEHOLDER.tint;
  g.save();
  g.globalAlpha *= o.faint !== undefined ? Math.min(1, o.faint * 0.7) : o.alpha ?? 1;
  const outline = () => { g.beginPath(); if (o.radius) g.roundRect(r.x, r.y, r.w, r.h, o.radius); else g.rect(r.x, r.y, r.w, r.h); };
  outline();
  g.save();
  g.clip();
  const gr = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  gr.addColorStop(0, withAlpha(c1, o.opaque ? 1 : 0.55)); gr.addColorStop(1, withAlpha(c0, o.opaque ? 1 : 0.7));
  g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h);
  // 剪影：宽 → 两层远山；高 → 半身人像；接近方形 → 一枚菱形徽
  const ink = withAlpha(mix(c0, '#000000', 0.35), 0.55), ink2 = withAlpha(mix(c0, '#000000', 0.15), 0.4);
  if (r.w > r.h * 1.25) {
    for (const [col, base, amp, seed] of [[ink2, 0.62, 0.22, 1.7], [ink, 0.78, 0.18, 3.1]] as [string, number, number, number][]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(r.x, r.y + r.h);
      for (let i = 0; i <= 24; i++) { const t = i / 24, y = r.y + r.h * (base - amp * (0.55 + 0.45 * Math.sin(t * 7.3 + seed) * Math.cos(t * 3.1 + seed * 0.7))); g.lineTo(r.x + r.w * t, y); }
      g.lineTo(r.x + r.w, r.y + r.h); g.closePath(); g.fill();
    }
  } else if (r.h > r.w * 1.2) {
    const cx = r.x + r.w / 2, hr = Math.min(r.w * 0.2, r.h * 0.14);
    g.fillStyle = ink; g.beginPath(); g.arc(cx, r.y + r.h * 0.38, hr, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - r.w * 0.38, r.y + r.h); g.quadraticCurveTo(cx - r.w * 0.36, r.y + r.h * 0.56, cx, r.y + r.h * 0.55); g.quadraticCurveTo(cx + r.w * 0.36, r.y + r.h * 0.56, cx + r.w * 0.38, r.y + r.h); g.closePath(); g.fill();
  } else {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, d = Math.min(r.w, r.h) * 0.24;
    g.fillStyle = ink; g.beginPath(); g.moveTo(cx, cy - d); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d); g.lineTo(cx - d, cy); g.closePath(); g.fill();
  }
  g.restore();
  outline();
  g.strokeStyle = withAlpha(c1, 0.6); g.lineWidth = 1; g.stroke();
  // 只留有内容意义的短字（人名首字、缩略图的两个字）；「卡面插画（需素材）」这类说明只在 QA 里写
  if (label && [...label].length <= 2) {
    const fs = Math.max(11, Math.min(16, r.h * 0.3));
    g.font = `700 ${fs}px "GAE Sans", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(20,20,26,0.8)'; g.strokeText(label, r.x + r.w / 2, r.y + r.h / 2);
    g.fillStyle = '#f4f2ec'; g.fillText(label, r.x + r.w / 2, r.y + r.h / 2); g.textAlign = 'start';
  }
  g.restore();
}

/*
 * 灰盒占位（docs/ui-hud-plan.md M3.5）：需要真实素材的槽位（立绘、主视觉、阵营徽记、驾驶舱……）先画成带字的斜纹灰盒，
 * 不禁用这个取值 —— 截图里一眼能认出"这里将来放什么"，换成AI 生成素材（M11）时只替换这一块。
 */
export function drawGreybox(g: CanvasRenderingContext2D, r: Rect, label: string, o: { alpha?: number; radius?: number; small?: boolean; labelTop?: boolean; opaque?: boolean; faint?: number } = {}) {
  // 只在 HUD 的主画布上换（单元测试的替身画布、离屏烘焙照旧灰盒）
  if (QUALITY.on && !PLACEHOLDER.qa && isHudCanvas(g)) return tintedPlaceholder(g, r, label, o);
  // faint（M12b-68，缺素材的水印）：只描虚线框 + 写小字，整体透明度 = faint，不铺灰底与斜纹
  if (o.faint !== undefined) return faintBox(g, r, label, o.faint, o.radius);
  const a = o.alpha ?? 1;
  g.save();
  g.globalAlpha *= a;
  // 外框路径（M12a-37：斜纹循环里每条线都 beginPath，原来描虚线框时路径已经是最后一条斜纹——灰盒没有外框，反而从右下角拖出一条伸出灰盒的斜虚线；
  // 现在描边前重建外框路径）
  const outline = () => { g.beginPath(); if (o.radius) g.roundRect(r.x, r.y, r.w, r.h, o.radius); else g.rect(r.x, r.y, r.w, r.h); };
  outline();
  // 整屏背景之类要完全挡住后面的画面：先铺实色
  if (o.opaque) { g.fillStyle = '#6d6d74'; g.fill(); }
  g.fillStyle = 'rgba(120,120,128,0.42)';
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 1;
  for (let d = -r.h; d < r.w; d += 10) { g.beginPath(); g.moveTo(r.x + d, r.y + r.h); g.lineTo(r.x + d + r.h, r.y); g.stroke(); }
  g.restore();
  outline();
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(40,40,48,0.75)';
  g.lineWidth = 1.5;
  g.stroke();
  g.setLineDash([]);
  const fs = o.small ? 10 : o.labelTop ? 12 : Math.max(10, Math.min(14, r.h * 0.18));
  // 外圈灰盒（中间会被别的东西盖住）：字放在上沿的灰带里
  const ly = o.labelTop ? r.y + 13 : r.y + r.h / 2;
  g.font = `700 ${fs}px "GAE Sans", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const t = `◇ ${label}`;
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(30,30,36,0.85)';
  g.strokeText(t, r.x + r.w / 2, ly);
  g.fillStyle = '#f2f2f2';
  g.fillText(t, r.x + r.w / 2, ly);
  g.textAlign = 'start';
  g.restore();
}

/** 淡显占位：虚线框 + 居中小字（字带一圈深色描边），整体透明度 a */
function faintBox(g: CanvasRenderingContext2D, r: Rect, label: string, a: number, radius?: number) {
  g.save();
  g.globalAlpha *= a;
  g.beginPath(); if (radius) g.roundRect(r.x, r.y, r.w, r.h, radius); else g.rect(r.x, r.y, r.w, r.h);
  g.setLineDash([5, 4]); g.strokeStyle = 'rgba(242,242,242,0.9)'; g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
  g.font = '700 10px "GAE Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = `◇ ${label}`;
  g.lineWidth = 3; g.strokeStyle = 'rgba(30,30,36,0.85)'; g.strokeText(t, r.x + r.w / 2, r.y + r.h / 2);
  g.fillStyle = '#f2f2f2'; g.fillText(t, r.x + r.w / 2, r.y + r.h / 2);
  g.textAlign = 'start';
  g.restore();
}
