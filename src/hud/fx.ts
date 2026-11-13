import { withAlpha } from './material';
import type { Rect } from './paint';

/*
 * 叠加特效层（ast.fx，docs/ui-hud-plan.md M3.5）：静态、可复现（同一盒子每帧一样），动起来留给 M5b。
 *   盒子后面：glow 外发光、rays 放射光、pillar 光柱、magicCircle 法阵、speedlines 速度线、ink 墨溅；
 *   盒子前面：holo 全息扫描、scanlines 扫描线、glitch 错位色块、petals 花瓣、stardust 星屑。
 */
export const FX_BEHIND = new Set(['glow', 'rays', 'pillar', 'magicCircle', 'speedlines', 'ink']);

function rng(seed: number) {
  let t = (seed * 2654435761) >>> 0 || 1;
  return () => { t += 0x6d2b79f5; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

/** path：把盒子外形加进当前路径（不 beginPath） */
export function drawFx(g: CanvasRenderingContext2D, r: Rect, kinds: string[], color: string, front: boolean, path: () => void, seed = 1) {
  const R = rng(seed + Math.round(r.x * 7 + r.y * 13));
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (const k of kinds) {
    if (FX_BEHIND.has(k) === front) continue;
    g.save();
    switch (k) {
      case 'glow':
        // 只发在盒子外面：半透明面板里面不被染色
        g.beginPath(); g.rect(r.x - 200, r.y - 200, r.w + 400, r.h + 400); path(); g.clip('evenodd');
        g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = withAlpha(color, 0.55);
        g.beginPath(); path(); g.fill();
        break;
      case 'rays': {
        const rad = Math.max(r.w, r.h) * 0.9;
        g.translate(cx, cy);
        g.fillStyle = withAlpha(color, 0.16);
        for (let i = 0; i < 16; i++) {
          g.rotate((Math.PI * 2) / 16);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(rad, -rad * 0.08); g.lineTo(rad, rad * 0.08); g.closePath(); g.fill();
        }
        break;
      }
      case 'pillar': {
        const pw = r.w * 0.35;
        const gr = g.createLinearGradient(0, r.y - r.h * 1.4, 0, r.y + r.h);
        gr.addColorStop(0, withAlpha(color, 0)); gr.addColorStop(0.7, withAlpha(color, 0.35)); gr.addColorStop(1, withAlpha(color, 0));
        g.fillStyle = gr;
        g.fillRect(cx - pw / 2, r.y - r.h * 1.4, pw, r.h * 2.4);
        break;
      }
      case 'magicCircle': {
        const rad = Math.min(Math.max(r.w, r.h) * 0.62, 160);
        g.strokeStyle = withAlpha(color, 0.38); g.lineWidth = 1.5;
        g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(cx, cy, rad * 0.82, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * rad * 0.84, cy + Math.sin(a) * rad * 0.84); g.lineTo(cx + Math.cos(a) * rad * (i % 3 ? 0.92 : 0.98), cy + Math.sin(a) * rad * (i % 3 ? 0.92 : 0.98)); g.stroke(); }
        g.beginPath();
        for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 * 2 - Math.PI / 2; const x = cx + Math.cos(a) * rad * 0.8, y = cy + Math.sin(a) * rad * 0.8; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
        break;
      }
      case 'speedlines': {
        g.strokeStyle = withAlpha(color, 0.35);
        for (let i = 0; i < 26; i++) {
          const a = R() * Math.PI * 2, r0 = Math.max(r.w, r.h) * (0.55 + R() * 0.1), len = 20 + R() * 40;
          g.lineWidth = 1 + R() * 2;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.6); g.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 0.6); g.stroke();
        }
        break;
      }
      case 'ink': {
        g.fillStyle = 'rgba(20,18,16,0.72)';
        const x0 = r.x + r.w * 0.06, y0 = r.y + r.h * 0.9;
        for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x0 + (R() - 0.3) * r.w * 0.3, y0 + (R() - 0.5) * r.h * 0.3, 2 + R() * Math.min(18, r.h * 0.22), 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'holo': {
        g.beginPath(); path(); g.clip();
        g.fillStyle = 'rgba(120,240,255,0.07)';
        for (let y = r.y; y < r.y + r.h; y += 3) g.fillRect(r.x, y, r.w, 1);
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(255,60,200,0.35)'; g.lineWidth = 1;
        g.beginPath(); path(); g.translate(1.5, 0); g.stroke();
        break;
      }
      case 'scanlines':
        g.beginPath(); path(); g.clip();
        g.fillStyle = 'rgba(0,0,0,0.14)';
        for (let y = r.y; y < r.y + r.h; y += 3) g.fillRect(r.x, y, r.w, 1);
        break;
      case 'glitch':
        for (let i = 0; i < 3; i++) {
          const y = r.y + R() * r.h, h = 2 + R() * 5, off = (R() - 0.5) * 14;
          g.fillStyle = i % 2 ? 'rgba(0,255,240,0.35)' : 'rgba(255,0,120,0.35)';
          g.fillRect(r.x + off, y, r.w * (0.4 + R() * 0.5), h);
        }
        break;
      case 'petals':
        for (let i = 0; i < 9; i++) {
          const x = r.x + R() * r.w, y = r.y + (R() < 0.5 ? -4 + R() * 10 : r.h - 6 + R() * 10);
          g.save(); g.translate(x, y); g.rotate(R() * Math.PI);
          g.fillStyle = withAlpha(i % 3 ? '#f6a7c1' : color, 0.85);
          g.beginPath(); g.ellipse(0, 0, 4 + R() * 3, 2 + R() * 1.5, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        break;
      case 'stardust':
        g.fillStyle = withAlpha('#fffbe6', 0.9);
        for (let i = 0; i < 10; i++) {
          // 只撒在上下边带里，不压正文
          const x = r.x + R() * r.w, y = R() < 0.5 ? r.y + R() * r.h * 0.18 : r.y + r.h * (0.86 + R() * 0.14), s = 1 + R() * 2.5;
          g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y - s * 0.5); g.lineTo(x + s * 2, y); g.lineTo(x + s * 0.5, y + s * 0.5); g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.5, y + s * 0.5); g.lineTo(x - s * 2, y); g.lineTo(x - s * 0.5, y - s * 0.5); g.closePath(); g.fill();
        }
        break;
    }
    g.restore();
  }
}
