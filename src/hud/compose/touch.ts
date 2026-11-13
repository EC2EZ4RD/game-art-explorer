import { withAlpha } from '../material';
import { drawText, logTarget, measure, resolveColor, type Rect } from '../paint';
import { tapMin } from '../sys/device';
import { px1080, type Theme } from '../sys/theme';
import { bodyOpts } from './sample';
import { pack } from '../content';

/*
 * 触屏操作层（docs/ui-hud-plan.md M10）：输入方式 = 触屏时，在局内 HUD 上画虚拟摇杆（ix.touchStick）与动作按钮簇（ix.touchCluster），
 * 尺寸以 ix.touchSize 为下限；返回占掉的两块区域，元素排版把它们当固定障碍避让。
 *   摇杆：固定（左下底盘 + 摇杆头）/ 浮动（左半屏淡圈 + "按住任意处移动"）/ 十字键 / 点地移动（落点涟漪）/ 滑动手势（左右箭头）/ 无。
 *   按钮簇：大键 + 弧形环绕 / 技能方格 / 底部一排（单手竖屏）/ 按住展开轮盘 / 左右两个大键。
 * 所有按钮都记进触控目标（logTarget），可读性检查据此查尺寸与单手可达。
 * 按钮上的符号与名字（主按钮、技能、跳跃、动作）读当前内容包的 hud.touch（docs/c1-content-packs.md）。
 */

export interface TouchLayer { stick: Rect | null; cluster: Rect | null; draw: () => void }

export function touchLayer(g: CanvasRenderingContext2D, tx: CanvasRenderingContext2D, th: Theme, A: Rect): TouchLayer | null {
  const r = th.r;
  if (r.str('ctx.input', 'kbm') !== 'touch') return null;
  // 和触控检查同一个单位：ix.touchSize 是 px@1080p，换成设计单位（M12a-05；原来当 CSS 像素直接用，手机的 88 画成约两倍大）；最小的按钮直径 = ix.touchSize
  const tp = Math.max(36, px1080(tapMin(r)));
  const stick = r.str('ix.touchStick', 'fixed');
  const cluster = r.str('ix.touchCluster', 'arc');
  const accent = resolveColor('@accent', th.pal);
  const base = bodyOpts(th.tokens, th.pal);
  // 按钮的符号与名字：建层时取当前内容包（draw 在同一侧画完之前调用，取的是同一个包）
  const tc = pack().hud.touch, skills = tc.skills;
  const hintO = { ...base, size: Math.max(11, base.size * 0.9), color: '#fff', outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } };
  const ring = (cx: number, cy: number, rad: number, fill = 0.28, stroke = 0.75) => {
    g.fillStyle = `rgba(0,0,0,${fill})`; g.strokeStyle = `rgba(255,255,255,${stroke})`; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill(); g.stroke();
  };
  const btn = (cx: number, cy: number, rad: number, ch: string, label: string, primary = false) => {
    ring(cx, cy, rad, primary ? 0.35 : 0.3, primary ? 0.9 : 0.7);
    if (primary) { g.strokeStyle = withAlpha(accent, 0.9); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, rad - 3, 0, Math.PI * 2); g.stroke(); }
    const o = { ...base, size: rad * 0.9, color: '#fff', outline: undefined, shadow: undefined };
    drawText(tx, ch, cx - measure(tx, ch, o) / 2, cy - rad * 0.6, rad * 1.2, o);
    logTarget(g, { x: cx - rad, y: cy - rad, w: rad * 2, h: rad * 2 }, label);
  };

  // 摇杆区（左下）
  let stickR: Rect | null = null;
  const sr = tp * 1.1;
  const sx = A.x + sr + 8, sy = A.y + A.h - sr - 8;
  if (stick === 'fixed' || stick === 'floating' || stick === 'dpad') stickR = { x: A.x, y: sy - sr - 8, w: sr * 2 + 16, h: sr * 2 + 16 };
  // 按钮簇（右下；底部一排时在底边中间）
  let clusterR: Rect | null = null;
  const big = tp * 0.8, small = tp * 0.5;
  const bx = A.x + A.w - big - 8, by = A.y + A.h - big - 8;
  if (cluster === 'arc' || cluster === 'radial') clusterR = { x: bx - big - small * 3.2, y: by - big - small * 3.2, w: big * 2 + small * 3.2 + 8, h: big * 2 + small * 3.2 + 8 };
  else if (cluster === 'grid') clusterR = { x: A.x + A.w - (small * 2 + 6) * 2 - 8, y: A.y + A.h - (small * 2 + 6) * 2 - 8, w: (small * 2 + 6) * 2 + 8, h: (small * 2 + 6) * 2 + 8 };
  else if (cluster === 'twoButtons') clusterR = { x: A.x + A.w - big * 4 - 24, y: by - big - 8, w: big * 4 + 24, h: big * 2 + 16 };
  else if (cluster === 'row') { const n = 4, s = Math.max(tp, small * 2), w = n * s + (n - 1) * 10; clusterR = { x: A.x + (A.w - w) / 2, y: A.y + A.h - s - 8, w, h: s + 8 }; }

  const draw = () => {
    g.save();
    switch (stick) {
      case 'fixed':
        ring(sx, sy, sr, 0.25, 0.6);
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(sx + sr * 0.22, sy - sr * 0.16, sr * 0.42, 0, Math.PI * 2); g.fill();
        logTarget(g, { x: sx - sr, y: sy - sr, w: sr * 2, h: sr * 2 }, '摇杆');
        break;
      case 'floating': {
        g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        const s = '按住左半屏任意处移动';
        drawText(tx, s, sx - measure(tx, s, hintO) / 2, sy - sr - 26, 22, hintO);
        logTarget(g, { x: A.x, y: A.y + A.h / 2, w: A.w / 2, h: A.h / 2 }, '浮动摇杆区');
        break;
      }
      case 'dpad': {
        const a = sr * 0.42;
        for (const [dx, dy, ch] of [[0, -1, '▲'], [1, 0, '▶'], [0, 1, '▼'], [-1, 0, '◀']] as [number, number, string][]) btn(sx + dx * a * 1.6, sy + dy * a * 1.6, a * 0.75, ch, `方向 ${ch}`);
        break;
      }
      case 'tapToMove': {
        const px = A.x + A.w * 0.42, py = A.y + A.h * 0.62;
        g.strokeStyle = withAlpha(accent, 0.9); g.lineWidth = 2.5;
        for (const k of [1, 0.6]) { g.globalAlpha = k; g.beginPath(); g.ellipse(px, py, 26 * k, 10 * k, 0, 0, Math.PI * 2); g.stroke(); }
        g.globalAlpha = 1;
        drawText(tx, '点地移动', px - measure(tx, '点地移动', hintO) / 2, py + 12, 22, hintO);
        break;
      }
      case 'swipe': {
        const cy = A.y + A.h * 0.78, s = '⇠ 滑动换道 ⇢';
        drawText(tx, s, A.x + A.w / 2 - measure(tx, s, { ...hintO, size: hintO.size * 1.3 }) / 2, cy, 30, { ...hintO, size: hintO.size * 1.3 });
        break;
      }
    }
    switch (cluster) {
      case 'arc': case 'radial': {
        btn(bx, by, big, tc.main[0], tc.main[1], true);
        const n = cluster === 'radial' ? 6 : 4, R0 = big + small * 1.5;
        for (let i = 0; i < n; i++) {
          const ang = Math.PI + (i / (n - 1)) * (Math.PI / 2);
          if (cluster === 'radial') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(bx + Math.cos(Math.PI + (i / n) * Math.PI * 2) * R0, by + Math.sin(Math.PI + (i / n) * Math.PI * 2) * R0, small * 0.35, 0, Math.PI * 2); g.fill(); continue; }
          btn(bx + Math.cos(ang) * R0, by + Math.sin(ang) * R0, small, skills[i % skills.length], `技能 ${i + 1}`);
        }
        if (cluster === 'radial') drawText(tx, '按住展开', bx - measure(tx, '按住展开', hintO) / 2, by - big - 26, 22, hintO);
        break;
      }
      case 'grid':
        for (let i = 0; i < 4; i++) btn(clusterR!.x + 4 + small + (i % 2) * (small * 2 + 6), clusterR!.y + 4 + small + Math.floor(i / 2) * (small * 2 + 6), small, skills[i], `技能 ${i + 1}`);
        break;
      case 'twoButtons':
        btn(bx, by, big, tc.jump[0], tc.jump[1], true);
        btn(bx - big * 2.3, by + big * 0.15, big * 0.85, tc.act[0], tc.act[1]);
        break;
      case 'row': {
        const n = 4, s = Math.max(tp, small * 2);
        for (let i = 0; i < n; i++) btn(clusterR!.x + s / 2 + i * (s + 10), clusterR!.y + s / 2, s / 2, skills[i], `头像 / 技能 ${i + 1}`, i === 0);
        break;
      }
    }
    g.restore();
  };
  return { stick: stickR, cluster: clusterR, draw };
}
