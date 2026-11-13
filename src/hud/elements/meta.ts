import { mix, parseColor, rgba, withAlpha } from '../material';
import { asItem, ptShiftAt, chosen, displayFor, elChosen, memberMode, ownBool, ownCount, ownNum, ownKey, alignedRect, alignX, arrangeCells, attachFor, attachPoint, avatar, badge, button, buttonBoxOn, buttonText, CELL_MODES, chosenKey, cmp, DATA, drawNumber, lineColor, mutedOf, pickedStr, numberWidth, drawValue, elCount, elOf, fitW, gauge, gaugeKind, gaugeOf, icon, iconChip, itemIcon, labelShown, LH, onAccent, onKey, ornColor, slot, ownArrangement, panel, plate, platePick, registerElement, ROUND_GAUGES, scopedSilhouette, shapeOver, shapeStyle, T, tap, thicknessOf, valueKind, valueSize, valueStyle, valueText, W, type ElCtx } from './core';
import { drawBox, fadePaint, logTarget, resolveColor, wrapLines, type Rect } from '../paint';
import { tabStrip } from './tabs';
import { flowNow } from '../flow';
import { worldNow } from '../world';
import { frameOccupancy } from '../compose/occupancy';
import type { TextOpts } from '../paint';
import { samplesFor } from '../content/samples';
import { pack } from '../content';
import { drawRich, plainText } from '../richText';

/*
 * 系统与流程元素（M5a 第三批）：段位、个人信息、加载、新手引导、聊天、游戏速度、计量条、工具栏、行动顺序、对话选项。
 * 样本字读当前内容包（DATA = pack().hud 的视图，docs/c1-content-packs.md 6.2）；载入中、速度按钮、小菜单这类界面通用字留在代码里。
 */

const S = (e: ElCtx, n: number) => n * e.k;

/* 段位 / 评级 */
/** 段位的名次数字与评级字母的字样（size 与 draw 共用：盒宽按实际字宽算，M12a-18） */
const rankNumO = (e: ElCtx) => ({ ...e.big, size: S(e, 34) });
const rankLetterO = (e: ElCtx): TextOpts => ({ ...e.big, size: S(e, 48), color: e.fill(0, 'highlight'), italic: true, outline: { color: 'rgba(0,0,0,0.6)', width: 1.5 } });
/** 名次数字 + 小注的内容宽：小注没显式给时仍在固定的 90 处（M12a-13） */
function rankNumW(e: ElCtx): number {
  const nw = numberWidth(e, DATA.rank.number, rankNumO(e)), note = valueKind(e, 'auto');
  return note === 'none' ? nw : note === 'auto' ? Math.max(nw, S(e, 90) + W(e, DATA.rank.scope, e.small)) : nw + S(e, 8) + W(e, DATA.rank.scope, e.small);
}
registerElement({
  id: 'el.rank', forms: ['badge', 'number', 'letter', 'stars', 'medal', 'ordinal', 'letterDisc'], anchor: 'tr',
  // 名次数字 / 评级字母的盒宽按实际字宽算（M12a-18：原来固定 120，锚在右上时字母离右上角一截，hi-fi-rush#10 / #26）
  size: (e) => {
    const f = e.forms[0];
    if (f === 'stars') return { w: S(e, 140), h: S(e, 30) };
    if (f === 'ordinal') return { w: ordinalW(e) + S(e, 6), h: S(e, 64) };
    if (f === 'letterDisc') return { w: S(e, 88), h: S(e, 88) };
    if (f === 'letter') return scopedSilhouette(e, 'rank') ? { w: S(e, 72), h: S(e, 72) } : { w: W(e, DATA.rank.letter, rankLetterO(e)) + S(e, 12), h: S(e, 64) };
    if (f === 'number') return { w: rankNumW(e) + S(e, 4), h: S(e, 64) };
    return { w: S(e, 120), h: S(e, 64) };
  },
  draw: (e, a) => {
    const f = e.forms[0];
    switch (f) {
      case 'number': {
        // 名次旁的小注（"全服"、"名次"，M12a-13）：el.rank.valueLabel 显式给了 none 不画；给了别的取值时紧跟在主数字后面；没给时仍在原来固定的 90 处
        const o = rankNumO(e), x0 = alignX(e, a, Math.min(a.w, rankNumW(e) + S(e, 4)));
        drawNumber(e, DATA.rank.number, x0, a.y, a.h, o);
        const note = valueKind(e, 'auto');
        if (note !== 'none') T(e, DATA.rank.scope, x0 + (note === 'auto' ? S(e, 90) : numberWidth(e, DATA.rank.number, o) + S(e, 8)), a.y + S(e, 6), S(e, 20), e.small);
        return;
      }
      // 评级字母与星级：高亮色（M12a-02 的 highlight 角色，默认 #ffd34d；col.accent@el.rank 时用作用域强调色）；字母按锚点对齐（M12a-18）
      case 'letter': {
        // 圆盘（M12b-68，hi-fi-rush#7）：按目标写了外形时字母压在盘中央，字号按盘收
        const disc = rankDisc(e, a), o = rankLetterO(e);
        if (disc) { const so = { ...o, size: Math.min(o.size, disc.h * 0.62) }; T(e, DATA.rank.letter, disc.x + disc.w / 2 - W(e, DATA.rank.letter, so) / 2, disc.y, disc.h, so); return; }
        T(e, DATA.rank.letter, alignX(e, a, Math.min(a.w, W(e, DATA.rank.letter, o) + S(e, 12))), a.y, a.h, o);
        return;
      }
      case 'stars': gauge(e, a, 0.6, 'stars', e.fill(0, 'highlight')); return;
      // 序数名次（M12b-06，forza-horizon-5#6）：大号主数字 + 序数后缀大字（2ND）+ 小号「/总数」，按锚点对齐
      case 'ordinal': {
        const [main, suf, tot] = ordinalParts(), x0 = alignX(e, a, Math.min(a.w, ordinalW(e))), mo = ordMainO(e), so = { ...mo, size: mo.size * 0.5 }, to = { ...e.title, size: S(e, 18) };
        let x = x0 + drawNumber(e, main, x0, a.y, a.h, mo);
        x += T(e, suf, x + S(e, 1), a.y - a.h * 0.12, a.h, so) + S(e, 3);
        drawNumber(e, tot, x, a.y + a.h * 0.12, a.h, to);
        return;
      }
      // 字母盘（M12b-06，hi-fi-rush#6）：黑色齿轮圆盘 + 外圈评级进度环 + 环上一行弧形小字 + 强调色大字母
      case 'letterDisc': letterDisc(e, a); return;
      case 'medal': { const x0 = alignX(e, a, Math.min(a.w, S(e, 62) + W(e, DATA.rank.medal, e.title))); badge(e, x0 + S(e, 30), a.y + a.h / 2, S(e, 24), 'medal', ''); T(e, DATA.rank.medal, x0 + S(e, 62), a.y, a.h, e.title); return; }
      default: badge(e, a.x + S(e, 30), a.y + a.h / 2, S(e, 24), 'crest', DATA.rank.tierShort); T(e, DATA.rank.tier, a.x + S(e, 62), a.y + S(e, 6), S(e, 26), e.title); gauge(e, { x: a.x + S(e, 62), y: a.y + S(e, 38), w: a.w - S(e, 62), h: S(e, 6) }, 0.4, 'thinBar', e.accent);
    }
  },
});

/**
 * 段位的作用域圆盘（部件 rank，M12b-68 ④，hi-fi-rush#7）：vis.silhouette@el.rank / @rank 按目标写了外形时，在字后面垫一块这个外形的盘（rank 部件主题的面板底 + 描边参数那圈边）；
 * cmp.gauge@el.rank 选了圆形画法（ring / arc / dial，旧皮肤只认皮肤之后的层）时盘外再套一圈进度（样本 0.6，高亮色）。返回盘的矩形，没写外形时 null（原来的画法）
 */
function rankDisc(e: ElCtx, a: Rect): Rect | null {
  if (!scopedSilhouette(e, 'rank')) return null;
  const s = Math.min(a.w, a.h), r = { x: alignX(e, a, s), y: a.y + (a.h - s) / 2, w: s, h: s };
  const kind = gaugeKind(e, 'none', true), ring = ROUND_GAUGES.has(kind), k = ring ? s * 0.13 : 0;
  const d = { x: r.x + k, y: r.y + k, w: s - k * 2, h: s - k * 2 }, ek = e.part('rank'), p = ek.t.panel;
  const sty = shapeStyle(e, 'rank', { bg: p.bg, ...(ek.t.edge ?? { border: p.border }), shadows: [] }, d);
  if (!sty.bare) drawBox(e.g, d, sty, e.pal);
  if (ring) gauge(e, r, 0.6, kind, e.fill(0, 'highlight'));
  return d;
}

/** 序数名次的三段：主数字、英文序数后缀、「/总数」（取比赛名次 hud.place） */
function ordinalParts(): [string, string, string] {
  const n = DATA.place[0], m100 = n % 100, suf = m100 >= 11 && m100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH';
  return [String(n), suf, `/${DATA.place[1]}`];
}
const ordMainO = (e: ElCtx): TextOpts => ({ ...e.big, size: S(e, 44), italic: true });
function ordinalW(e: ElCtx): number {
  const [main, suf, tot] = ordinalParts(), mo = ordMainO(e);
  return numberWidth(e, main, mo) + W(e, suf, { ...mo, size: mo.size * 0.5 }) + S(e, 4) + numberWidth(e, tot, { ...e.title, size: S(e, 18) });
}
/** 字母盘：圆盘 12 齿、进度 = 样本 0.6（高亮色）、弧字 = 评级的英文评语（hud.rating[1]） */
function letterDisc(e: ElCtx, a: Rect) {
  const g = e.g, s = Math.min(a.w, a.h), cx = alignX(e, a, s) + s / 2, cy = a.y + a.h / 2, R = s / 2, lw = Math.max(2, S(e, 4));
  g.save();
  g.lineCap = 'round'; g.lineWidth = lw;
  g.strokeStyle = withAlpha(e.text, 0.22); g.beginPath(); g.arc(cx, cy, R - lw / 2, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = e.fill(0, 'highlight'); g.beginPath(); g.arc(cx, cy, R - lw / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.6); g.stroke();
  // 齿轮圆盘
  g.fillStyle = '#141414'; g.beginPath();
  for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2, r = i % 2 ? R * 0.68 : R * 0.76; const t2 = t + Math.PI / 24; g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); g.lineTo(cx + Math.cos(t2) * r, cy + Math.sin(t2) * r); }
  g.closePath(); g.fill();
  g.restore();
  // 弧形小字（沿上半圈，逐字旋转）
  const word = (DATA.rating?.[1] ?? '').toUpperCase().slice(0, 12), wo = { ...e.small, size: Math.max(7, R * 0.15), weight: 800, color: e.text };
  if (word) {
    const span = Math.min(Math.PI * 0.9, word.length * 0.2), r = R * 0.86;
    [...word].forEach((ch, i) => {
      const t = -Math.PI / 2 - span / 2 + (word.length > 1 ? (i / (word.length - 1)) * span : span / 2);
      e.tx.save(); e.tx.translate(cx + Math.cos(t) * r, cy + Math.sin(t) * r); e.tx.rotate(t + Math.PI / 2);
      T(e, ch, -W(e, ch, wo) / 2, -wo.size * 0.7, wo.size * 1.4, wo);
      e.tx.restore();
    });
  }
  const lo = { ...rankLetterO(e), size: R * 0.95, color: e.accent };
  T(e, DATA.rank.letter, cx - W(e, DATA.rank.letter, lo) / 2, cy - R * 0.62, R * 1.24, lo);
}

/* 个人信息 */
/** 个人信息的尺寸（size 与 draw 共用） */
function profileSize(e: ElCtx) { const pr = DATA.profile; if (e.forms[0] === 'nameText') return { w: fitW(e, S(e, 80), [[pr.name, { ...e.title, ...displayFor(e, 'nameplate') }], [pr.title, e.small]], S(e, 4)), h: LH(e, e.title, 1.2) + LH(e, e.small, 1.2) }; return e.forms[0] === 'idCard' ? { w: fitW(e, S(e, 300), [[pr.name, e.title], [pr.line, e.small]], S(e, 116)), h: S(e, 120) } : e.forms[0] === 'levelBar' ? { w: S(e, 260), h: S(e, 40) } : e.forms[0] === 'titleBanner' ? { w: fitW(e, S(e, 280), [[pr.name, { size: S(e, 16) }]], S(e, 90)), h: S(e, 60) } : { w: fitW(e, S(e, 210), [[pr.name, e.title]], S(e, 74)), h: Math.max(S(e, 60), LH(e, e.title) + S(e, 22)) }; }
registerElement({
  id: 'el.profile', forms: ['avatarLevel', 'idCard', 'levelBar', 'titleBanner', 'nameText'], anchor: 'tl',
  size: profileSize,
  draw: (e, a0) => {
    const f = e.forms[0];
    // 拿到的矩形比自己宽（elx.stackWidth = match）时：铭牌卡（idCard）拉满，其余按内容宽贴锚点那一边（M12a-18）
    const a = f === 'idCard' ? a0 : alignedRect(e, a0, profileSize(e).w);
    // 玩家信息（不是游戏名）：名字、头像首字、称号、UID 行、等级、经验
    const pr = DATA.profile;
    switch (f) {
      // 名字 + 小字副题（M12b-18，slay-the-spire#25）：无底、无头像，可收进顶栏
      case 'nameText': {
        const no = { ...e.title, ...displayFor(e, 'nameplate') }, nh = LH(e, e.title, 1.2);
        T(e, pr.name, a.x, a.y, nh, no);
        T(e, pr.title, a.x, a.y + nh, LH(e, e.small, 1.2), { ...e.small, color: mutedOf(e, 0.7) });
        return;
      }
      case 'idCard':
        panel(e, a);
        avatar(e, a.x + S(e, 54), a.y + a.h / 2, S(e, 38), pr.initial);
        T(e, pr.name, a.x + S(e, 104), a.y + S(e, 14), S(e, 26), e.title);
        T(e, pr.line, a.x + S(e, 104), a.y + S(e, 44), S(e, 20), e.small);
        plate(e, { x: a.x + S(e, 104), y: a.y + S(e, 74), w: S(e, 90), h: S(e, 24) }, pr.title, 'pill', { size: S(e, 12) });
        return;
      case 'levelBar':
        // 等级徽章读 cmp.badge（M12a-31：选过就换成选的设计，原来写死晶体；vis.iconStyle = flat 时画程序徽章、不走图集）
        badge(e, a.x + S(e, 18), a.y + a.h / 2, S(e, 16), 'crystal', pr.level, { generic: true });
        gauge(e, { x: a.x + S(e, 42), y: a.y + a.h / 2 - S(e, 5), w: a.w - S(e, 42), h: S(e, 10) }, 0.62, 'bar', e.accent2);
        T(e, pr.exp, a.x + S(e, 42), a.y - S(e, 4), S(e, 16), e.small);
        return;
      case 'titleBanner':
        // 横幅名牌是部件 nameplate（M12b-68）：形态 cmp.plate@nameplate（选过才换，原来的燕尾旗），颜色 / 描边 col.surface / col.text / vis.stroke@nameplate
        plate(e, { x: a.x + S(e, 30), y: a.y + S(e, 14), w: a.w - S(e, 30), h: S(e, 34) }, pr.name, platePick(e, 'nameplate', 'swallowtail'), { size: S(e, 16) }, 'nameplate');
        avatar(e, a.x + S(e, 30), a.y + a.h / 2, S(e, 28), pr.initial);
        return;
      default:
        avatar(e, a.x + S(e, 30), a.y + a.h / 2, S(e, 26), pr.initial);
        badge(e, a.x + S(e, 50), a.y + a.h - S(e, 10), S(e, 11), 'crystal', pr.level, { generic: true });
        { const nh = Math.max(S(e, 22), LH(e, e.title, 1.2)); T(e, pr.name, a.x + S(e, 66), a.y + S(e, 8), nh, e.title);
        gauge(e, { x: a.x + S(e, 66), y: a.y + S(e, 14) + nh, w: a.w - S(e, 70), h: S(e, 6) }, 0.62, 'thinBar', e.accent2); }
    }
  },
});

/* 加载 */
registerElement({
  id: 'el.loading', forms: ['gauge', 'spinner', 'motif', 'download', 'tipsOnly'], anchor: 'bc',
  size: (e) => (e.forms[0] === 'spinner' || e.forms[0] === 'motif' ? { w: S(e, 220), h: S(e, 60) } : { w: Math.min(S(e, 520), e.R.w * 0.7), h: S(e, 60) }),
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    const tip = DATA.loading.tip;
    switch (f) {
      case 'spinner': {
        const cx = a.x + a.w - S(e, 24), cy = a.y + a.h / 2;
        for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.fillStyle = withAlpha(e.text, 0.2 + (i / 8) * 0.8); g.beginPath(); g.arc(cx + Math.cos(t) * S(e, 14), cy + Math.sin(t) * S(e, 14), S(e, 3), 0, Math.PI * 2); g.fill(); }
        T(e, '载入中…', a.x, a.y, a.h, { ...e.base, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } });
        return;
      }
      case 'motif': {
        // 主题小动画的静帧：一行脚印（符号随包）
        for (let i = 0; i < 6; i++) icon(e, DATA.loading.motif, a.x + S(e, 20) + i * S(e, 28), a.y + a.h / 2 + (i % 2 ? S(e, 6) : -S(e, 6)), S(e, 10), withAlpha(e.text, 0.3 + i * 0.12));
        T(e, '62%', a.x + S(e, 190), a.y, a.h, e.title);
        return;
      }
      case 'tipsOnly': T(e, tip, a.x + a.w / 2 - W(e, tip) / 2, a.y, a.h, { ...e.base, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } }); return;
      case 'download':
        T(e, '下载资源包　1.2 GB / 2.0 GB　12 MB/s', a.x, a.y, S(e, 22), { ...e.small, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } });
        gauge(e, { x: a.x, y: a.y + S(e, 28), w: a.w, h: S(e, 12) }, 0.6, 'bar', e.accent);
        return;
      default:
        T(e, tip, a.x, a.y, S(e, 22), { ...e.small, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } });
        // 流程演示的读取阶段（M9b）：进度跟着这一屏走
        // 进度的数值标注（M12a-13，tpl.loading 预设写了 percent）：条后的字从条长里扣
        { const fl = flowNow(); const v = fl && fl.s.stage === 'waiting' ? Math.min(1, 0.05 + fl.p) : 0.62;
          const vk = valueKind(e), vt = valueText(e, v, 100, vk), vw = valueSize(e, valueText(e, 1, 100, vk)).w;
          const br = { x: a.x, y: a.y + S(e, 30), w: a.w - vw, h: S(e, 8) };
          gauge(e, br, v, cmp(e, 'cmp.gauge', 'bar'), e.accent);
          drawValue(e, br, vt, e.valueLabelPos, vk); }
    }
  },
});

/* 新手引导 */
registerElement({
  id: 'el.guide', forms: ['finger', 'ring', 'arrow', 'box', 'spotlight', 'npcBubble'], anchor: 'center', attach: 'poi',
  size: (e) => ({ w: S(e, 10), h: S(e, 10) }),
  draw: (e) => {
    const f = e.forms[0], g = e.g, p = attachPoint(e, attachFor(e)), R = e.R;
    const tipBox = (x: number, y: number, s: string) => { const w = W(e, s, e.small) + S(e, 20); panel(e, { x, y, w, h: S(e, 30) }, true); T(e, s, x + S(e, 10), y, S(e, 30), e.small); };
    switch (f) {
      case 'spotlight':
        g.save(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.arc(p.x, p.y - S(e, 16), S(e, 70), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
        tipBox(p.x + S(e, 80), p.y - S(e, 40), DATA.guide.spotlight);
        return;
      case 'box':
        g.strokeStyle = e.fill(0, 'highlight'); g.lineWidth = 3; g.setLineDash([8, 5]); g.strokeRect(p.x - S(e, 80), p.y - S(e, 44), S(e, 160), S(e, 44)); g.setLineDash([]);
        tipBox(p.x - S(e, 80), p.y + S(e, 6), DATA.guide.box);
        return;
      case 'arrow':
        g.fillStyle = e.fill(0, 'highlight'); g.beginPath(); g.moveTo(p.x, p.y - S(e, 50)); g.lineTo(p.x - S(e, 16), p.y - S(e, 80)); g.lineTo(p.x - S(e, 6), p.y - S(e, 80)); g.lineTo(p.x - S(e, 6), p.y - S(e, 110)); g.lineTo(p.x + S(e, 6), p.y - S(e, 110)); g.lineTo(p.x + S(e, 6), p.y - S(e, 80)); g.lineTo(p.x + S(e, 16), p.y - S(e, 80)); g.closePath(); g.fill();
        return;
      case 'ring':
        g.strokeStyle = e.fill(0, 'highlight'); g.lineWidth = 3; for (const rr of [26, 38]) { g.globalAlpha = rr === 26 ? 1 : 0.5; g.beginPath(); g.arc(p.x, p.y - S(e, 16), S(e, rr), 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1;
        return;
      case 'npcBubble':
        avatar(e, R.x + S(e, 60), R.y + R.h - S(e, 170), S(e, 34), DATA.guide.npc);
        panel(e, { x: R.x + S(e, 104), y: R.y + R.h - S(e, 206), w: S(e, 240), h: S(e, 60) }, true, { radiusPct: 30 });
        T(e, DATA.guide.line, R.x + S(e, 118), R.y + R.h - S(e, 206), S(e, 60), e.small);
        return;
      default: {
        // finger：指向的手（简化成圆 + 指头）
        g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(p.x + S(e, 6), p.y - S(e, 14), S(e, 12), S(e, 30), S(e, 6)); g.fill(); g.stroke();
        g.beginPath(); g.roundRect(p.x + S(e, 2), p.y + S(e, 6), S(e, 34), S(e, 30), S(e, 10)); g.fill(); g.stroke();
      }
    }
  },
});

/* 聊天 */
registerElement({
  id: 'el.chat', forms: ['lines', 'collapsed', 'bubbles'], anchor: 'bl',
  // 气泡（bubbles）按实际画出的范围报尺寸（M12b-21 顺延的 B1 · 64 tpl.chat：原来按 lines 的字宽 / 行高报，气泡每行 36 高、左气泡从 30 起，画出的范围比报的宽和高都大，贴着「确定」钮）
  size: (e) => (e.forms[0] === 'bubbles' ? { w: Math.max(S(e, 300), ...DATA.chat.map(([, s]) => W(e, s, e.small) + S(e, 48))), h: DATA.chat.length * S(e, 36) - S(e, 8) } : e.forms[0] === 'collapsed' ? { w: fitW(e, S(e, 240), [[`${DATA.chat[0][0]}：${DATA.chat[0][1]}`, e.small]], S(e, 44)), h: Math.max(S(e, 30), LH(e, e.small, 1.8)) } : { w: fitW(e, S(e, 300), DATA.chat.map(([n, s]) => [`[${n}] ${s}`, e.small] as [string, Partial<TextOpts>]), S(e, 20)), h: S(e, 12) + DATA.chat.length * Math.max(S(e, 24), LH(e, e.small) + S(e, 4)) + S(e, 12) }),
  draw: (e, a) => {
    const f = e.forms[0];
    if (f === 'collapsed') { panel(e, a, true, { radiusPct: 50 }); icon(e, '✉', a.x + S(e, 16), a.y + a.h / 2, S(e, 14), e.accent); T(e, `${DATA.chat[0][0]}：${DATA.chat[0][1]}`, a.x + S(e, 30), a.y, a.h, e.small); return; }
    if (f === 'bubbles') {
      DATA.chat.forEach(([n, s], i) => { const w = W(e, s, e.small) + S(e, 18), x = i === 1 ? a.x + a.w - w : a.x + S(e, 30); panel(e, { x, y: a.y + i * S(e, 36), w, h: S(e, 28) }, true, { radiusPct: 50 }); T(e, s, x + S(e, 9), a.y + i * S(e, 36), S(e, 28), e.small); if (i !== 1) avatar(e, a.x + S(e, 12), a.y + i * S(e, 36) + S(e, 14), S(e, 11), n); });
      return;
    }
    e.g.fillStyle = 'rgba(0,0,0,0.35)'; e.g.fillRect(a.x, a.y, a.w, a.h);
    const rh = Math.max(S(e, 24), LH(e, e.small) + S(e, 4));
    DATA.chat.forEach(([n, s], i) => { T(e, `[${n}]`, a.x + S(e, 8), a.y + S(e, 6) + i * rh, rh, { ...e.small, color: n === '系统' ? '#ffd34d' : e.accent2 }); T(e, s, a.x + S(e, 8) + W(e, `[${n}] `, e.small), a.y + S(e, 6) + i * rh, rh, { ...e.small, color: '#fff' }); });
  },
});

/** 速度按钮：至少原来的宽度，装得下按钮上的字 */
function speedButtons(e: ElCtx, f: string): { label: string; w: number; on: boolean }[] {
  const fit = (l: string, min: number) => Math.max(S(e, min), tap(e), W(e, l, buttonText(e, Math.max(S(e, 34), tap(e)))) + S(e, 14));
  if (f === 'x2' || f === 'autoBattle') return [{ label: '×2', w: fit('×2', 64), on: true }, { label: '自动', w: fit('自动', 74), on: f === 'autoBattle' }];
  return ['Ⅱ', '▶', '▶▶', '▶▶▶'].map((l, i) => ({ label: l, w: fit(l, 34), on: i === 1 }));
}

/**
 * 速度按钮条（el.gameSpeed = speedBar，M12a-11）：暂停 + 档位（el.gameSpeed.steps 档；没给时包里 speeds 的长度，再没有是 3 档 1× / 2× / 3×）；
 * 小方钮边长 = 30 与触屏下限取大，装不下字时加宽
 */
function speedBarButtons(e: ElCtx): { label: string; w: number }[] {
  const st = Number(elOf(e, 'steps')), n = Number.isFinite(st) && st > 0 ? Math.min(6, Math.round(st)) : DATA.speeds?.length || 3;
  const b = Math.max(S(e, 30), tap(e)), o = { ...e.base, weight: 700 };
  return ['Ⅱ', ...Array.from({ length: n }, (_, i) => DATA.speeds?.[i] ?? `${i + 1}×`)].map((label) => ({ label, w: Math.max(b, W(e, label, o) + S(e, 10)) }));
}
const speedBarSize = (e: ElCtx) => ({ w: speedBarButtons(e).reduce((s, b) => s + b.w + S(e, 4), -S(e, 4)), h: Math.max(S(e, 30), tap(e)) });

/* 游戏速度 */
registerElement({
  id: 'el.gameSpeed', forms: ['playFF', 'pauseMenu', 'x2', 'autoBattle', 'speedBar'], anchor: 'tr',
  size: (e) => (e.forms[0] === 'speedBar' ? speedBarSize(e) : e.forms[0] === 'pauseMenu' ? { w: Math.max(S(e, 44), tap(e)), h: Math.max(S(e, 44), tap(e)) } : { w: speedButtons(e, e.forms[0]).reduce((s, b) => s + b.w + S(e, 6), -S(e, 6)), h: Math.max(S(e, 34), LH(e, e.base, 1.6), tap(e)) }),
  draw: (e, a) => {
    const f = e.forms[0];
    if (f === 'pauseMenu') { button(e, a, 'Ⅱ', false); return; }
    if (f === 'speedBar') {
      // 暂停 / 1× / 2× / 3× 一排小方钮（M12a-11，按定义画；原来是「速度」二字 + 分段条）：当前是 1×
      let x = a.x;
      for (const [i, b] of speedBarButtons(e).entries()) { button(e, { x, y: a.y, w: b.w, h: a.h }, b.label, i === 1); x += b.w + S(e, 4); }
      return;
    }
    // 按钮宽度按字量（M8b）
    let x = a.x;
    for (const b of speedButtons(e, f)) { button(e, { x, y: a.y, w: b.w, h: a.h }, b.label, b.on); x += b.w + S(e, 6); }
  },
});

/* 计量条（饥饿、温度、理智……） */
registerElement({
  id: 'el.meter', forms: ['withIcon', 'single', 'paired', 'stack', 'formula', 'demandBars', 'framedStrip', 'dangerDot'], anchor: 'bl',
  attachSide: 'below',
  // 数值标注（elx.valueLabel / Pos，M12a-13）与粗细（elx.thickness，M12a-12）：条后的字算进宽，粗了行高跟着加
  size: (e) => {
    const f = e.forms[0], th = thicknessOf(e), vw = meterValueW(e), rh = S(e, 24) + S(e, 8) * (th - 1);
    if (METER_NEW.has(f)) return meterNewSize(e, f);
    // 首行加粗（el.meter.leadRow = bold，M12b-27）：第一行高 1.4 倍
    if (f === 'stack' && leadRow(e)) return { w: S(e, 200) + vw, h: 3 * rh + rh * 0.4 };
    return f === 'stack' ? { w: S(e, 200) + vw, h: 3 * rh } : f === 'paired' ? { w: S(e, 240), h: S(e, 30) + S(e, 24) * (th - 1) } : { w: S(e, 200) + vw, h: rh };
  },
  draw: (e, a) => {
    const f = e.forms[0], th = thicknessOf(e);
    if (METER_NEW.has(f)) { drawMeterNew(e, a, f); return; }
    const rows = DATA.meters;
    if (f === 'paired') {
      // 两项对立（M12a-11，原来是一条红条 + 两端小字）：上下两条独立横条，名字大写居中压在条上（按 typ.legibility 描边），
      // 上条第二强调色、下条强调色（col.accent2@el.meter / col.accent@el.meter；Frostpunk 的不满 / 希望、Balatro 的筹码 / 倍率）
      const pair = DATA.meterPair ?? [[DATA.meterEnds[0], 0.62], [DATA.meterEnds[1], 0.45]];
      const bh = S(e, 12) * th, gap = S(e, 4);
      // 两项对立 + 双向条（cmp.gauge@el.meter = bipolar，B5 审查修复 ㉓）：两项合成一条中线双向的拔河条（右 = 下条，强调色；左 = 上条，第二强调色；
      // 指针 = 0.5 + (下 − 上) / 2），两项的名字压在两端——原来两条各自画成中线双向，同一对数被编码两遍
      if (gaugeKind(e, 'bar', true) === 'bipolar' && pair.length >= 2) {
        const [[l0, v0], [l1, v1]] = pair, br = { x: a.x, y: a.y + S(e, 1), w: a.w, h: bh * 2 + gap };
        gaugeOf(e, br, 0.5 + (v1 - v0) / 2, 1, 'bar', { fixed: true, color: e.accent });
        if (labelShown(e)) {
          const lo = valueStyle(e, l0, 'inside', 'label', { upper: true, spacing: 0.08 }), ro = valueStyle(e, l1, 'inside', 'label', { upper: true, spacing: 0.08 }), lh = br.h;
          T(e, l0, br.x + S(e, 6), br.y, lh, lo); T(e, l1, br.x + br.w - S(e, 6) - W(e, l1, ro), br.y, lh, ro);
        }
        return;
      }
      pair.slice(0, 2).forEach(([l, v], i) => {
        const br = { x: a.x, y: a.y + S(e, 1) + i * (bh + gap), w: a.w, h: bh };
        gaugeOf(e, br, v, i, 'bar', { fixed: true, color: i ? e.accent : e.accent2 });
        if (labelShown(e)) drawValue(e, br, l, 'inside', 'label', { upper: true, spacing: 0.08 });
      });
      return;
    }
    const vk = valueKind(e), vw = meterValueW(e), rh = S(e, 24) + S(e, 8) * (th - 1);
    // 逐行颜色（el.meter.rowColors，M12b-27，cult-of-the-lamb#15：原来由内容包写死）与首行加粗（el.meter.leadRow = bold：首行条粗 1.8 倍、行高 1.4 倍，其余条细 0.6 倍）
    const rc = meterRowColors(e), lead = f === 'stack' && leadRow(e);
    let y = a.y;
    rows.slice(0, f === 'stack' ? 3 : 1).forEach(([ch, l, v, c0], i) => {
      const c = rc[i] ?? c0, h = lead && i === 0 ? rh * 1.4 : rh, bk = lead ? (i === 0 ? 1.8 : 0.6) : 1;
      if (f !== 'single') iconChip(e, ch, a.x + S(e, 10), y + h / 2, S(e, 16) * (lead && i === 0 ? 1.25 : 1), c); else if (labelShown(e)) T(e, l, a.x, y, h, e.small);
      const bh = S(e, 8) * th * bk, br = { x: a.x + S(e, 30), y: lead ? y + h / 2 - bh / 2 : y + S(e, 8), w: a.w - S(e, 30) - vw, h: bh };
      gaugeOf(e, br, v, i, 'bar', { color: c, value: { text: valueText(e, v, 100, vk), pos: e.valueLabelPos, kind: vk } });
      y += h;
    });
  },
});

/* ---------------- 计量条的新画法（M12b-27） ---------------- */

const METER_NEW = new Set(['formula', 'demandBars', 'framedStrip', 'dangerDot']);
/** 首行加粗（el.meter.leadRow = bold，选过才算） */
const leadRow = (e: ElCtx) => pickedStr(e, ownKey(e, 'leadRow'), 'none') === 'bold';
/** 逐行颜色（el.meter.rowColors：角色名 / accent / accent2 / text / #hex，'auto' 占位 = 这一行用包里的） */
function meterRowColors(e: ElCtx): (string | undefined)[] {
  const k = chosenKey(e, ownKey(e, 'rowColors'));
  if (!k) return [];
  const ro = e.th.roles as unknown as Record<string, unknown>;
  return e.r.list(k).map((c) => (!c || c === 'auto' ? undefined : c === 'accent' ? e.accent : c === 'accent2' ? e.accent2 : c === 'text' ? e.text : typeof ro[c] === 'string' ? (ro[c] as string) : c));
}
/** 计分公式的样本（包的 hud.formula：牌型名、等级、A、B），没写时 FLUSH / lvl.2 / 35 × 4 */
const formulaOf = () => DATA.formula ?? { name: 'FLUSH', level: 'lvl.2', a: 35, b: 4 };
/** 需求竖条的样本（包的 hud.demand：[字母, 0~1, 颜色]），没写时住宅绿 / 商业蓝 / 工业黄 */
const demandOf = (): [string, number, string][] => DATA.demand ?? [['R', 0.7, '#3fb950'], ['C', 0.45, '#3b82f6'], ['I', 0.6, '#e3b341']];
/** 细框条的样本（包的 hud.meterStrip：[标签, 0~1, 读数, 按钮字?]），没写时 POWER GRID / 0.6 / DEFENSE 19% / RESET TURN */
const stripOf = (): [string, number, string, string?] => DATA.meterStrip ?? ['POWER GRID', 0.6, 'DEFENSE 19%', 'RESET TURN'];
const stripLO = (e: ElCtx): Partial<TextOpts> => ({ ...e.small, size: Math.max(8, e.small.size * 0.85), weight: 800, spacing: 0.06 });
function meterNewSize(e: ElCtx, f: string): { w: number; h: number } {
  switch (f) {
    case 'formula': { const F = formulaOf(), no = { ...e.title, size: S(e, 24), weight: 800 }; return { w: Math.max(S(e, 200), numberWidth(e, String(F.a), no) + numberWidth(e, String(F.b), no) + S(e, 96)), h: S(e, 72) }; }
    case 'demandBars': { const n = demandOf().length; return { w: n * S(e, 18) + (n - 1) * S(e, 8), h: S(e, 64) }; }
    case 'framedStrip': { const [l, , rd, bt] = stripOf(), lo = stripLO(e); return { w: S(e, 30) + W(e, l, lo) + S(e, 140) + W(e, rd, lo) + (bt ? W(e, bt, lo) + S(e, 30) : 0) + S(e, 30), h: S(e, 34) }; }
    default: return { w: S(e, 24), h: S(e, 24) };
  }
}
function drawMeterNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  if (f === 'formula') {
    // 计分公式（Balatro）：上一行牌型名 + 等级；下面 A 色块 × B 色块（色 = 强调色 / 第二强调色），数字白色粗体
    const F = formulaOf(), to = { ...e.title, size: S(e, 18) }, lo = { ...e.small, color: mutedOf(e, 0.8) };
    const tw = T(e, F.name, a.x + a.w / 2 - (W(e, F.name, to) + S(e, 8) + W(e, F.level, lo)) / 2, a.y, S(e, 26), to);
    T(e, F.level, a.x + a.w / 2 - (tw + S(e, 8) + W(e, F.level, lo)) / 2 + tw + S(e, 8), a.y + S(e, 3), S(e, 26), lo);
    const bh = S(e, 40), by = a.y + S(e, 30), xw = S(e, 24), bw = (a.w - xw) / 2, no = { ...e.title, size: S(e, 24), weight: 800, color: '#fff' };
    [[F.a, e.accent, a.x], [F.b, e.accent2, a.x + bw + xw]].forEach(([v, c, x]) => {
      drawBox(g, { x: x as number, y: by, w: bw, h: bh }, { bg: { solid: c as string }, radius: S(e, 6), shadows: [{ color: 'rgba(0,0,0,0.45)', x: 0, y: S(e, 3), blur: 0 }] }, e.pal);
      const s = String(v); drawNumber(e, s, (x as number) + bw / 2 - numberWidth(e, s, no) / 2, by, bh, no);
    });
    const xo = { ...e.title, size: S(e, 22), color: e.fill(0, 'danger') };
    T(e, '×', a.x + bw + xw / 2 - W(e, '×', xo) / 2, by, bh, xo);
    return;
  }
  if (f === 'demandBars') {
    // 需求竖条（Cities RCI）：并排小竖条 + 底部字母，色 = 类别色（col.coding = lineId）或样本色
    const ds = demandOf(), bw = S(e, 18), gap = S(e, 8), lh = S(e, 16), bh = a.h - lh;
    ds.forEach(([l, v, c], i) => {
      const x = a.x + i * (bw + gap), col = lineColor(e, i) ?? c;
      g.fillStyle = withAlpha(e.text, 0.15); g.fillRect(x, a.y, bw, bh);
      g.fillStyle = col; g.fillRect(x, a.y + bh * (1 - Math.max(0, Math.min(1, v))), bw, bh * Math.max(0, Math.min(1, v)));
      const lo = { ...e.small, weight: 800, color: col };
      T(e, l, x + bw / 2 - W(e, l, lo) / 2, a.y + bh, lh, lo);
    });
    return;
  }
  if (f === 'framedStrip') {
    // 细框条（ITB 左上）：细线框里 闪电图标 + 小字标签 + 分段格（cmp.gauge@el.meter，没选时分段）+ 读数 + 一个文字按钮
    const [l, v, rd, bt] = stripOf(), lo = stripLO(e);
    g.save(); g.strokeStyle = withAlpha(e.text, 0.8); g.lineWidth = Math.max(1, S(e, 1)); g.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1); g.restore();
    let x = a.x + S(e, 8);
    icon(e, '⚡', x + S(e, 8), a.y + a.h / 2, S(e, 16), e.accent); x += S(e, 22);
    x += T(e, l, x, a.y, a.h, lo) + S(e, 8);
    gaugeOf(e, { x, y: a.y + a.h * 0.3, w: S(e, 132), h: a.h * 0.4 }, v, 0, 'segmented', { color: e.accent }); x += S(e, 140);
    x += drawNumber(e, rd, x, a.y, a.h, { ...lo, color: e.text }) + S(e, 12);
    if (bt) { const bw = W(e, bt, lo) + S(e, 16), q = { x, y: a.y + S(e, 5), w: bw, h: a.h - S(e, 10) }; g.save(); g.strokeStyle = e.accent; g.lineWidth = Math.max(1, S(e, 1)); g.strokeRect(q.x, q.y, q.w, q.h); g.restore(); T(e, bt, q.x + S(e, 8), q.y, q.h, { ...lo, color: e.accent }); }
    return;
  }
  // dangerDot：遇敌危险度圆点（Octopath）：低蓝、中黄、高红（包的 hud.danger），一圈细环 + 实心点
  const v = DATA.danger ?? 0.45, c = v < 0.34 ? '#4aa8ff' : v < 0.67 ? '#e3b341' : e.fill(0, 'danger'), s = Math.min(a.w, a.h), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  g.save(); g.fillStyle = withAlpha('#000', 0.45); g.beginPath(); g.arc(cx, cy, s / 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = c; g.lineWidth = Math.max(1, S(e, 1.5)); g.stroke();
  g.shadowColor = c; g.shadowBlur = S(e, 6); g.fillStyle = c; g.beginPath(); g.arc(cx, cy, s * 0.3, 0, Math.PI * 2); g.fill(); g.restore();
}

/** 计量条条后数值标注的宽（只在 valueLabelPos = end 时占地方） */
const meterValueW = (e: ElCtx) => { const vk = valueKind(e); return e.valueLabelPos === 'end' ? valueSize(e, valueText(e, 1, 100, vk), 'end', vk).w : 0; };

/** 工具栏按钮边长：原尺寸与触屏下限取大 */
const toolbarBtn = (e: ElCtx, f: string) => Math.max(S(e, f === 'microMenu' ? 36 : 50), tap(e));
const MICRO = ['☰', '⚙', '✉', '⚑', '?'];

/**
 * 工具栏的排版（M12a-20）：按钮数 elx.count（小菜单默认 5、按钮条 / 类别图标默认 7，样本不够时循环）、排法 elx.arrangement（只认元素级显式给的：
 * column 竖排、grid、ring……；原来三种画法都只会横排）、贴边通高 / 通宽 elx.fill（整条一块面板，ast.frame 作用在整条上，按钮在里面排开）
 */
function toolbarLayout(e: ElCtx) {
  const f = e.forms[0], b = toolbarBtn(e, f), gap = S(e, f === 'microMenu' ? 4 : 6);
  const n = elCount(e, f === 'microMenu' ? MICRO.length : DATA.tools.length);
  const mode0 = ownArrangement(e, false), mode = CELL_MODES.has(mode0) ? mode0 : 'row';
  const fill = String(e.r.el(e.id, 'fill') ?? 'none');
  // 通高 / 通宽：长度 = 排版区（画面减安全边距，与 compose/hud.ts 同算法）
  const m = (e.r.num('lay.safeMargin', 2) / 100) * Math.min(e.R.w, e.R.h) + 12;
  const pad = fill === 'height' || fill === 'width' ? S(e, 8) : 0;
  if (f === 'categoryTabs') {
    // 竖排时页签成列、子项在右边展开成两列图标；横排是原来的样子
    if (mode !== 'column') return { f, b, n, mode: 'row', fill, pad, cells: [] as Rect[], size: { w: S(e, 480), h: S(e, 80) } };
    const tabsH = 5 * S(e, 30), itemsH = Math.ceil(n / 2) * S(e, 56) + S(e, 8);
    const h = fill === 'height' ? e.R.h - 2 * m : Math.max(tabsH, itemsH);
    return { f, b, n, mode, fill, pad, cells: [] as Rect[], size: { w: S(e, 92) + S(e, 8) + S(e, 140), h } };
  }
  const L = arrangeCells(n, { w: b, h: b }, mode, { gap });
  let w = L.bbox.w + 2 * pad, h = L.bbox.h + 2 * pad;
  // 原来的横排尺寸（末尾也算一个间距）
  if (mode === 'row' && !pad) w = n * (b + gap);
  if (fill === 'height') h = Math.max(h, e.R.h - 2 * m);
  if (fill === 'width') w = Math.max(w, e.R.w - 2 * m);
  return { f, b, n, mode, fill, pad, cells: L.rects.map((q) => ({ ...q, x: q.x + pad, y: q.y + pad })), size: { w, h } };
}

/* 工具栏（建造类别、按钮条、小菜单） */
registerElement({
  // 新画法（M12b-17）：iconStrip 无底彩绘图标条、drawer 抽屉工具条；附件 el.toolbar.screenCode / el.toolbar.extras 见 toolExtrasW / drawToolExtras
  id: 'el.toolbar', forms: ['buttonRow', 'categoryTabs', 'microMenu', 'iconStrip', 'drawer', 'bigButtons'], anchor: 'bc',
  // 挂到光标 / 世界点上时（塔防的建造环，M12a-15）默认以挂点为中心
  attachSide: 'center',
  size: (e) => { const s0 = toolStripSize(e), x = toolExtrasBox(e, s0); return x ? (x.v ? { w: Math.max(s0.w, x.w), h: x.fillH ? s0.h : s0.h + x.h } : { w: s0.w + x.w, h: s0.h }) : s0; },
  draw: (e, a0) => {
    // 附件（屏幕代码 / 转镜头箭头 / 圆暂停钮，M12b-17）选过时让出它们的位置：横条从右边让、竖条 / 通高条从下边让（B9 审查修复 ⑲）；没选时 a = a0（原来的）
    const x = toolExtrasBox(e, toolStripSize(e)), a = !x ? a0 : x.v ? { ...a0, w: Math.min(a0.w, toolStripSize(e).w), h: a0.h - x.h } : { ...a0, w: a0.w - x.w };
    if (x) drawToolExtras(e, x.v ? { x: a0.x, y: a.y + a.h, w: a0.w, h: x.h } : { x: a.x + a.w, y: a0.y, w: x.w, h: a0.h }, x);
    if (TOOL_NEW.has(e.forms[0])) { drawToolNew(e, a, e.forms[0]); return; }
    const L = toolbarLayout(e), f = L.f;
    const cats = DATA.tools;
    // 通高 / 通宽时整条一块面板（外框、饰件都作用在整条上）
    if (L.pad) panel(e, a, false);
    if (f === 'microMenu') { L.cells.forEach((c, i) => button(e, { x: a.x + c.x, y: a.y + c.y, w: c.w, h: c.h }, MICRO[i % MICRO.length], false)); return; }
    // 外形（M12a-09）：vis.silhouette@el.toolbar / @button（圆钮、六角……；none = 不画底只画图标），默认跟面板转角
    const so = (r: Rect) => shapeOver(e, 'button', r);
    if (f === 'categoryTabs') {
      if (L.mode === 'column') {
        const tw = S(e, 92), px = a.x + tw + S(e, 8), pw = a.w - tw - S(e, 8);
        tabStrip(e, { x: a.x, y: a.y, w: tw, h: a.h }, catTabs(cats), { dir: 'v', h: S(e, 26), w: tw, ...CAT_TABS(e) });
        panel(e, { x: px, y: a.y, w: pw, h: a.h }, true);
        for (let i = 0; i < L.n; i++) {
          const cx = px + pw * (i % 2 ? 0.72 : 0.28), cy = a.y + S(e, 30) + Math.floor(i / 2) * S(e, 56);
          if (cy > a.y + a.h - S(e, 10)) break;
          asItem(cats[i % cats.length][1], () => toolIcon(e, cats[i % cats.length][0], cx, cy, so));
        }
        return;
      }
      tabStrip(e, { x: a.x, y: a.y, w: a.w, h: S(e, 26) }, catTabs(cats), { dir: 'h', h: S(e, 26), w: S(e, 92), ...CAT_TABS(e) });
      panel(e, { x: a.x, y: a.y + S(e, 26), w: a.w, h: a.h - S(e, 26) }, true);
      for (let i = 0; i < L.n; i++) asItem(cats[i % cats.length][1], () => toolIcon(e, cats[i % cats.length][0], a.x + S(e, 34) + i * S(e, 64), a.y + S(e, 54), so));
      return;
    }
    // 按钮底框（cmp.buttonBox@el.toolbar / @button，M12a-35）：显式关掉时只画图标（Disco 的细线图标工具栏）
    const boxOn = buttonBoxOn(e);
    L.cells.forEach((c, i) => {
      const [ch, l] = cats[i % cats.length], r = { x: a.x + c.x, y: a.y + c.y, w: c.w, h: c.h };
      const over = so(r);
      if (!over.bare && boxOn) panel(e, r, true, over);
      asItem(l, () => icon(e, ch, r.x + r.w / 2, r.y + r.h / 2, S(e, 22))); logTarget(e.g, r, l);
    });
  },
});

/* ---------------- 工具条的新画法与附件（M12b-17） ---------------- */
/**
 * iconStrip（slay-the-spire#24）：无底的彩绘图标一排（地图 / 牌组 / 设置这类系统入口，个数 elx.count，没写 3），第二个图标右下角一枚计数角标（牌堆张数）；
 * drawer（cities-skylines#8）：两层——下层一排分类图标钮（工具的符号，第一个选中），上层抽屉 = 一行小号子页签 + 一排缩略卡（卡的画法 cmp.slot@el.toolbar：thumbCard = 缩略图 + 底部价格，
 * 没选时 thumbCard；cell = 普通格子）
 */
const TOOL_NEW = new Set(['iconStrip', 'drawer', 'bigButtons']);
const STRIP_ICONS = ['⌖', '☰', '⚙', '✉', '⚑', '?'];
function toolNewSize(e: ElCtx, f: string): { w: number; h: number } {
  if (f === 'bigButtons') { const n = Math.max(1, Math.min(4, elCount(e, 2))), bw = Math.max(S(e, 64), tap(e) * 1.3); return { w: n * bw + (n - 1) * S(e, 6), h: Math.max(S(e, 72), tap(e) * 1.6) }; }
  if (f === 'iconStrip') { const n = elCount(e, 3), s = Math.max(S(e, 40), tap(e)); return { w: n * s + (n - 1) * S(e, 8), h: s }; }
  const bh = Math.max(S(e, 44), tap(e));
  return { w: Math.min(e.R.w * 0.8, S(e, 620)), h: bh + S(e, 6) + LH(e, e.small, 1.8) + S(e, 96) };
}
function drawToolNew(e: ElCtx, a: Rect, f: string) {
  const g = e.g;
  // 两颗竖长大色块按钮（el.toolbar = bigButtons，M12b-63 收 balatro#7：竖栏里红「Run Info」/ 橙「Options」并排）：个数 elx.count（没写 2，最多 4），
  // 颜色轮着取坏色 / 警告色 / 强调色 / 第二强调色，字 = 工具样本的名字（竖排两行以内），白字
  if (f === 'bigButtons') {
    const n = Math.max(1, Math.min(4, elCount(e, 2))), gap = S(e, 6), w = (a.w - gap * (n - 1)) / n, cols = [e.bad, e.warn, e.accent, e.accent2];
    for (let i = 0; i < n; i++) {
      const q = { x: a.x + i * (w + gap), y: a.y, w, h: a.h }, [, name] = DATA.tools[i % DATA.tools.length];
      panel(e, q, true, { bg: { solid: cols[i % cols.length] }, radius: S(e, 6) });
      const o = { ...e.small, weight: 800, color: '#ffffff' }, lines = wrapLines(e.tx, name, w - S(e, 8), o).slice(0, 2), lh = LH(e, o, 1.25);
      lines.forEach((ln, k) => T(e, ln, q.x + w / 2 - W(e, ln, o) / 2, q.y + q.h / 2 - (lines.length * lh) / 2 + k * lh, lh, o));
      logTarget(g, q, name);
    }
    return;
  }
  if (f === 'iconStrip') {
    const n = elCount(e, 3), s = Math.max(S(e, 40), tap(e));
    for (let i = 0; i < n; i++) {
      const q = { x: a.x + i * (s + S(e, 8)), y: a.y + (a.h - s) / 2, w: s, h: s }, ch = STRIP_ICONS[i % STRIP_ICONS.length];
      // 彩绘图标：一层深色投影 + 填色图标（色 = col.icon，没给时正文色）
      icon(e, ch, q.x + s / 2 + S(e, 1.5), q.y + s / 2 + S(e, 1.5), s * 0.62, 'rgba(0,0,0,0.55)');
      icon(e, ch, q.x + s / 2, q.y + s / 2, s * 0.62, e.icon);
      logTarget(g, q, ch);
      if (i === 1) {
        const t = String(DATA.piles?.[0]?.[1] ?? 24), bs = s * 0.42, o = { ...onAccent(e, e.small), size: bs * 0.62, weight: 800 };
        drawBox(g, { x: q.x + s - bs * 0.8, y: q.y + s - bs * 0.8, w: bs, h: bs }, { bg: { solid: e.accent }, radiusPct: 50 }, e.pal);
        drawNumber(e, t, q.x + s - bs * 0.8 + bs / 2 - numberWidth(e, t, o) / 2, q.y + s - bs * 0.8, bs, o);
      }
    }
    return;
  }
  // drawer：上层抽屉（子页签 + 缩略卡）、下层分类图标钮
  const bh = Math.max(S(e, 44), tap(e)), th = LH(e, e.small, 1.8), cats = DATA.tools, n = Math.min(elCount(e, cats.length), 9);
  const top = { x: a.x, y: a.y, w: a.w, h: a.h - bh - S(e, 6) };
  panel(e, top, true);
  const subs = pack().menu.tabs.slice(0, 4), so = { ...e.small, weight: 700 };
  let sx = top.x + S(e, 10);
  subs.forEach((t, i) => { const o = i ? { ...so, weight: 400, color: mutedOf(e, 0.65) } : { ...so, color: e.accent }, w = W(e, t, o); T(e, t, sx, top.y + S(e, 2), th, o); if (!i) { g.fillStyle = e.accent; g.fillRect(sx, top.y + th - S(e, 2), w, S(e, 2)); } logTarget(g, { x: sx, y: top.y, w, h: th }, t); sx += w + S(e, 16); });
  const cardK = pickedStr(e.part('slot'), 'cmp.slot', 'thumbCard'), ch = top.h - th - S(e, 10), cw = ch * 0.92, items = pack().menu.items;
  for (let i = 0; ; i++) {
    const q = { x: top.x + S(e, 10) + i * (cw + S(e, 8)), y: top.y + th + S(e, 4), w: cw, h: ch };
    if (q.x + q.w > top.x + top.w - S(e, 8) || i >= 8) break;
    const it = items[i % Math.max(1, items.length)];
    if (cardK === 'thumbCard') thumbCard(e, q, it?.[0] ?? '◆', it?.[1] ?? '', 120 + i * 40);
    else slot(e, q, it?.[0] ?? '◆');
  }
  const bw = Math.min(bh, (a.w - S(e, 6) * (n - 1)) / Math.max(1, n));
  for (let i = 0; i < n; i++) {
    const [gl, l] = cats[i % cats.length], q = { x: a.x + i * (bw + S(e, 6)), y: a.y + a.h - bh, w: bw, h: bh };
    // 钮上的工具符号走图标（icon 字族），不当按钮字（按钮字可能是展示字族，展示字表里没有这些符号）
    button(e, q, '', i === 0 ? 'primary' : 'secondary');
    icon(e, gl, q.x + q.w / 2, q.y + q.h / 2, Math.min(S(e, 22), q.h * 0.5), i === 0 ? onAccent(e, e.small).color : e.icon);
    logTarget(g, q, l);
  }
}
/** 缩略卡（cmp.slot = thumbCard，M12b-17）：上面一块缩略图（物品图标 / 灰盒），底部一条暗带写价格（主货币符号 + 数） */
function thumbCard(e: ElCtx, q: Rect, glyph: string, name: string, price: number) {
  const g = e.g, ph = Math.max(S(e, 16), q.h * 0.24);
  drawBox(g, q, { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, radius: S(e, 4) }, e.pal);
  if (!itemIcon(e, name || glyph, q.x + q.w / 2, q.y + (q.h - ph) / 2, Math.min(q.w, q.h - ph) * 0.62)) icon(e, glyph, q.x + q.w / 2, q.y + (q.h - ph) / 2, Math.min(q.w, q.h - ph) * 0.5, e.icon);
  g.save(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(q.x, q.y + q.h - ph, q.w, ph); g.restore();
  const t = `${DATA.res[0][0]} ${price}`, o = { ...e.small, size: Math.min(e.small.size, ph * 0.7), weight: 700, color: '#fff' };
  drawNumber(e, t, q.x + q.w / 2 - numberWidth(e, t, o) / 2, q.y + q.h - ph, ph, o);
  logTarget(g, q, name || glyph);
}
/** 当前屏的三字母代码（el.toolbar.screenCode = code，disco-elysium#17）：按 cnt.screen / 子功能取（R4 · C3：思想柜是 screen.skilltree，原来的键写成 screen.skill 查不到、落回 INV，disco-elysium#53） */
const SCREEN_CODES: Record<string, string> = { 'screen.inventory': 'INV', 'screen.character': 'CHR', 'screen.map': 'MAP', 'screen.journal': 'JRN', 'screen.quest': 'JRN', 'screen.skilltree': 'THC', 'screen.settings': 'OPT', 'screen.codex': 'COD', 'screen.craft': 'CRF' };
const screenCode = (e: ElCtx) => SCREEN_CODES[e.r.str('cnt.screen', '')] ?? 'INV';
/** 附件选了哪些（el.toolbar.screenCode / el.toolbar.extras，元素参数，选过才算；旧皮肤只认皮肤之后的层） */
function toolExtras(e: ElCtx): { code: boolean; arrows: boolean; pause: boolean } {
  const code = elChosen(e, 'screenCode') && String(elOf(e, 'screenCode') ?? 'none') === 'code';
  const ex = elChosen(e, 'extras') ? String(elOf(e, 'extras') ?? '').split(',').map((x) => x.trim()) : [];
  return { code, arrows: ex.includes('cameraArrows'), pause: ex.includes('roundPause') };
}
/** 工具条本身（不含附件）的尺寸 */
const toolStripSize = (e: ElCtx) => (TOOL_NEW.has(e.forms[0]) ? toolNewSize(e, e.forms[0]) : toolbarLayout(e).size);
/**
 * 附件的排法（B9 审查修复 ⑲）：边长 s = 条的短边（横条 = 高、竖条 = 宽），最大一个控件高（48 / 触控下限；原来一律按条高，竖排通高的工具条上箭头与暂停钮有 380 高、元素比画面还宽）。
 * 横条（宽 ≥ 高）：接在右边，w = 屏幕代码 + 一对箭头 + 暂停钮；竖条：排在下面，一行放一件（箭头对一行），h = 各行之和，w = 最宽的一行；
 * 通高（elx.fill = height）的竖条不再加高，附件占条的下段（fillH）
 */
function toolExtrasBox(e: ElCtx, s0: { w: number; h: number }): { w: number; h: number; s: number; v: boolean; fillH: boolean } | null {
  const x = toolExtras(e);
  if (!x.code && !x.arrows && !x.pause) return null;
  const v = s0.h > s0.w, s = Math.min(s0.w, s0.h, Math.max(S(e, 48), tap(e))), gp = S(e, 8), co = codeFont(e, s), cw = x.code ? W(e, screenCode(e), co) + S(e, 16) : 0;
  if (!v) return { w: cw + (x.arrows ? s * 1.7 + gp : 0) + (x.pause ? s + gp : 0), h: s0.h, s, v, fillH: false };
  const rows = [x.arrows ? s * 0.85 : 0, x.pause ? s : 0, x.code ? LH(e, co, 1.1) : 0].filter((hh) => hh > 0);
  return { w: Math.max(x.arrows ? s * 1.7 : 0, x.pause ? s : 0, cw), h: rows.reduce((t, hh) => t + hh + gp, 0), s, v, fillH: String(e.r.el(e.id, 'fill') ?? 'none') === 'height' };
}
/** 屏幕代码的字（大号细体）：字号跟附件边长 */
const codeFont = (e: ElCtx, s: number) => ({ ...e.title, size: Math.max(e.title.size * 1.6, s * 0.62), weight: 300 });
/**
 * 画附件（饥荒右下的一对花饰转镜头箭头 + 圆形暂停钮，Disco 菜单打开时工具栏右端的 CHR / INV）：横条在 r 里从左往右排，竖条在 r 里从上往下排、各行居中。
 * 转镜头箭头（审查修复 ㉕）：左右两枚互为镜像——同一段穿过底部的弧（−0.15π → 1.05π，右边那枚按竖轴翻过来 = −0.05π → 1.15π），箭头都在外侧上端、朝下
 */
function drawToolExtras(e: ElCtx, r: Rect, xb: { s: number; v: boolean }) {
  const x0 = toolExtras(e), g = e.g, h = xb.s, c = ornColor(e), gp = S(e, 8);
  // 下一件的左上角：横条沿 x、竖条沿 y（宽 w 的一件在竖条里居中）
  let cur = xb.v ? r.y : r.x + gp;
  const at = (w: number, hh: number): { x: number; y: number } => (xb.v ? { x: r.x + (r.w - w) / 2, y: cur } : { x: cur, y: r.y + (r.h - hh) / 2 });
  const step = (w: number, hh: number) => { cur += (xb.v ? hh : w) + gp; };
  if (x0.arrows) {
    const p0 = at(h * 1.7, h * 0.85);
    for (const side of [-1, 1]) {
      const bx = p0.x + (side < 0 ? 0 : h * 0.85), cx = bx + h * 0.42, cy = p0.y + h * 0.425, rr = h * 0.32;
      g.save(); g.strokeStyle = c; g.lineWidth = Math.max(1.5, S(e, 2.2)); g.lineCap = 'round';
      g.beginPath(); side < 0 ? g.arc(cx, cy, rr, -Math.PI * 0.15, Math.PI * 1.05) : g.arc(cx, cy, rr, -Math.PI * 0.05, Math.PI * 1.15); g.stroke();
      const ax = side < 0 ? cx - rr * Math.cos(Math.PI * 0.05) : cx + rr * Math.cos(Math.PI * 0.05), ay = cy - rr * Math.sin(Math.PI * 0.05);
      g.fillStyle = c; g.beginPath(); g.moveTo(ax - h * 0.12, ay - h * 0.02); g.lineTo(ax + h * 0.12, ay - h * 0.02); g.lineTo(ax, ay + h * 0.14); g.closePath(); g.fill(); g.restore();
      logTarget(g, { x: bx, y: p0.y, w: h * 0.85, h: h * 0.85 }, side < 0 ? '向左转' : '向右转');
    }
    step(h * 1.7, h * 0.85);
  }
  if (x0.pause) {
    const p = at(h, h), q = { x: p.x, y: p.y, w: h, h };
    drawBox(g, q, { ...(e.t.control ?? e.t.panel), shadows: [], ornament: undefined, fx: undefined, frame: undefined, radiusPct: 50 }, e.pal);
    g.fillStyle = e.text; g.fillRect(q.x + h * 0.36, q.y + h * 0.3, h * 0.1, h * 0.4); g.fillRect(q.x + h * 0.54, q.y + h * 0.3, h * 0.1, h * 0.4);
    logTarget(g, q, '暂停'); step(h, h);
  }
  if (x0.code) { const co = { ...codeFont(e, h), color: e.text }, t = screenCode(e), lh = xb.v ? LH(e, co, 1.1) : r.h, p = at(xb.v ? W(e, t, co) + S(e, 16) : 0, lh); T(e, t, p.x + S(e, 8), p.y, lh, co); }
}

/**
 * 类别页签（el.toolbar = categoryTabs，M12a-22）：走 tabStrip，有选中 / 未选之分——选中是按键色梯形牌，其余第二面色梯形 + 次要字（原来五个都是强调色梯形、
 * 只有第一个白字，Cities 全屏最抢眼的一块）；内容 cmp.tab（图标取工具的符号）、指示 cmp.tabIndicator、外形 vis.silhouette@tab 与模板页签同一套
 */
const catTabs = (cats: [string, string][]) => cats.slice(0, 5).map(([icon, label]) => ({ label, icon }));
const CAT_TABS = (e: ElCtx) => ({ gap: S(e, 4), text: { size: S(e, 12) }, shape: 'trapezoid' as const, offFill: 'surface2' as const, center: true });

/** 类别页签下的子项图标：选了外形（vis.silhouette@el.toolbar / @button）时每个图标垫一块该外形的小底座（M12a-09），否则只画图标（原来的画法） */
function toolIcon(e: ElCtx, ch: string, cx: number, cy: number, so: (r: Rect) => ReturnType<typeof shapeOver>) {
  const s = S(e, 40), r = { x: cx - s / 2, y: cy - s / 2, w: s, h: s }, over = so(r);
  if (Object.keys(over).length && !over.bare) panel(e, r, true, over);
  icon(e, ch, cx, cy, S(e, 22));
}

/* 行动顺序 */
/**
 * 行动顺序的轨道版式（M12b-18，octopath#2）：头像数 el.turnOrder.count（只认元素级键，没给 = 内容包的 5 个，循环取）、轨道线 el.turnOrder.track（single / double：贯穿元素的细线，
 * 元素拉到约 90% 屏宽）、分段 el.turnOrder.segments（本回合 el.turnOrder.roundSize 个（默认 3）之后写「>>> NEXT TURN」，再排下回合）、间距 el.turnOrder.spacing（tight 紧挨 / even 均分）、
 * 当前项强调 elx.activeEmphasis（scale 时当前项更大；没选时当前项照原来大一号）。都没选时 null（原来的版式）
 */
function turnPlan(e: ElCtx) {
  const n = ownCount(e, DATA.turnOrder.length, 10), track = pickedStr(e, ownKey(e, 'track'), 'none'), seg = elChosen(e, 'segments') && ownBool(e, 'segments');
  const spacing = pickedStr(e, ownKey(e, 'spacing'), 'auto'), emph = memberMode(e, 'activeEmphasis', 'none');
  if (n === DATA.turnOrder.length && track === 'none' && !seg && spacing === 'auto' && emph === 'none') return null;
  const round = Math.max(1, Math.min(n, Math.round(ownNum(e, 'roundSize', 3)))), big = S(e, emph === 'scale' ? 28 : 24), small = S(e, 18);
  const label = '>>> NEXT TURN', lo = { ...e.small, size: S(e, 11), weight: 800, italic: true }, lw = seg ? W(e, label, lo) + S(e, 16) : 0;
  const tight = spacing === 'tight', gap = tight ? S(e, 4) : S(e, 16);
  const natural = big * 2 + S(e, 10) + (n - 1) * (small * 2 + gap) + lw;
  // 元素按自然宽排（B6 审查修复 ⑭：原来写了轨道线就拉到 90% 屏宽，同一排右上的元素被挤到下一行、压到飘字）；轨道线是装饰，画的时候往外延（trackSpan）。
  // 只有显式要均分（spacing = even）时才把头像铺到约 90% 屏宽
  const w = track !== 'none' && spacing === 'even' ? Math.max(natural, e.R.w * 0.9) : natural, h = Math.max(S(e, 56), big * 2 + S(e, 8));
  return { n, track, seg, round, big, small, label, lo, lw, tight, gap, w, h, even: spacing === 'even' };
}
const turnName = (i: number) => DATA.turnOrder[i % DATA.turnOrder.length];
/**
 * 轨道线往外延到哪（B6 审查修复 ⑭）：从元素的起边（内容左对齐时往右、右对齐时往左、居中时两边都延）延到同一排最近的已登记元素前 8，没有时到画面边内 16。
 * 元素都排好、登记进帧占位表以后才画，所以读得到旁边的元素；线不登记占位（装饰，别的元素可以压在上面）
 */
function trackSpan(e: ElCtx, a: Rect, cy: number): [number, number] {
  const m = S(e, 16), gp = S(e, 8), R = e.R, y0 = cy - S(e, 6), y1 = cy + S(e, 6);
  const occ = frameOccupancy().items.filter((o) => (o.kind === 'element' || o.kind === 'edgeBar') && o.id !== e.id && !(o.id ?? '').endsWith(`:${e.id}`) && o.rect.y < y1 && y0 < o.rect.y + o.rect.h);
  let x0 = a.x, x1 = a.x + a.w;
  if (e.align !== 'right') { x1 = R.x + R.w - m; for (const o of occ) if (o.rect.x >= a.x + a.w - 0.5) x1 = Math.min(x1, o.rect.x - gp); }
  if (e.align !== 'left') { x0 = R.x + m; for (const o of occ) if (o.rect.x + o.rect.w <= a.x + 0.5) x0 = Math.max(x0, o.rect.x + o.rect.w + gp); }
  return [Math.min(x0, a.x), Math.max(x1, a.x + a.w)];
}
/** 攻击顺序编号（el.turnOrder = numberBadges，M12b-19，into-the-breach#27）：每个敌方单位头顶一枚黄色圆形序号（世界单位来自场景投影，没有场景时目标 + 两个近似位置） */
function orderPoints(e: ElCtx): { x: number; y: number }[] {
  const wv = e.noWorld ? null : worldNow(), all = wv?.all.filter((q) => q.on) ?? [];
  // 每块的附加平移（ptShiftAt，终期审查修复 ㉖：compose/hud.ts 逐块推开 / 夹进版面）
  if (all.length) return all.slice(0, 6).map((q, i) => ptShiftAt(e, i, { x: q.x, y: q.y }));
  const t = attachPoint(e, attachFor(e));
  return [t, { x: t.x + S(e, 90), y: t.y + S(e, 30) }, { x: t.x - S(e, 110), y: t.y + S(e, 18) }].map((q, i) => ptShiftAt(e, i, q));
}
/** 一枚攻击顺序编号画出的范围（圆心在单位头顶上方 72，半径 11 + 描边） */
const badgeBox = (e: ElCtx, q: { x: number; y: number }): Rect => ({ x: q.x - S(e, 12), y: q.y - S(e, 84), w: S(e, 24), h: S(e, 24) });
registerElement({
  id: 'el.turnOrder', forms: ['portraitQueue', 'timeline', 'icons', 'numberBadges'], anchor: 'tc',
  // 攻击顺序编号挂目标（B6 审查修复 ②：只选这一种画法时原来不登记占位、不推开）
  formDefaults: { numberBadges: { attach: 'target' } },
  points: { numberBadges: 'target' },
  // 编号画在几个单位上（B6 审查修复 ⑥ / ㉒）：第一枚报 pointBox（推开 / 藏按它），其余的跟着登记
  pointBox: (e) => (e.forms[0] === 'numberBadges' ? badgeBox(e, orderPoints(e)[0]) : null),
  pointBoxes: (e) => (e.forms[0] === 'numberBadges' ? orderPoints(e).slice(1).map((q) => badgeBox(e, q)) : []),
  size: (e) => { if (e.forms[0] === 'numberBadges') return { w: S(e, 10), h: S(e, 10) }; const P = e.forms[0] === 'timeline' ? null : turnPlan(e); return P ? { w: P.w, h: P.h } : e.forms[0] === 'timeline' ? { w: S(e, 420), h: S(e, 56) } : { w: S(e, 5 * 52), h: S(e, 56) }; },
  draw: (e, a) => {
    const f = e.forms[0], g = e.g;
    // 与当前目标（敌人）同名的是敌方，画成红色
    const foe = DATA.target.name;
    if (f === 'numberBadges') {
      orderPoints(e).forEach((p, i) => {
        const cx = p.x, cy = p.y - S(e, 72), s = S(e, 11);
        g.save(); g.fillStyle = e.warn; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = Math.max(1, S(e, 1.5)); g.beginPath(); g.arc(cx, cy, s, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        const t = String(i + 1), o = { ...e.small, size: S(e, 13), weight: 900, color: '#1a1a1a' };
        drawNumber(e, t, cx - numberWidth(e, t, o) / 2, cy - s, s * 2, o);
      });
      return;
    }
    const P = f === 'timeline' ? null : turnPlan(e);
    if (P) {
      // 轨道式（octopath#2）：当前行动者的大头像单独在最左，本回合其余的小头像挨着排，分段标签之后是下回合；轨道线贯穿整个元素
      const cy = a.y + a.h / 2, lc = withAlpha(e.text, 0.65);
      const restW = a.w - (P.big * 2 + S(e, 10)) - P.lw, step = P.even && P.n > 1 ? Math.max(P.small * 2 + P.gap, restW / Math.max(1, P.n - 1)) : P.small * 2 + P.gap;
      if (P.track !== 'none') {
        // 轨道线延到旁边的元素前（trackSpan）；「>>> NEXT TURN」字后面断开（B6 审查修复 ⑭：原来线从字中间穿过去）
        const [x0, x1] = trackSpan(e, a, cy), lx = P.seg && P.round < P.n ? a.x + P.big * 2 + S(e, 10) + (P.round - 1) * step + S(e, 6) : NaN;
        const cuts: [number, number][] = Number.isNaN(lx) ? [[x0, x1]] : [[x0, lx - S(e, 4)], [lx + P.lw - S(e, 12), x1]];
        g.save(); g.strokeStyle = lc; g.lineWidth = Math.max(1, S(e, 1.2));
        for (const dy of P.track === 'double' ? [-S(e, 3), S(e, 3)] : [0]) for (const [u0, u1] of cuts) if (u1 > u0) { g.beginPath(); g.moveTo(u0, cy + dy); g.lineTo(u1, cy + dy); g.stroke(); }
        g.restore();
      }
      let x = a.x;
      const one = (i: number, rr: number, cx: number) => {
        const n = turnName(i);
        if (f === 'icons' && !scopedSilhouette(e, 'avatar')) { badge(e, cx, cy, rr * 0.8, 'crystal', n.slice(0, 1)); return; }
        avatar(e, cx, cy, rr, n, n === foe ? e.bad : i === 0 ? e.accent : e.good);
      };
      one(0, P.big, x + P.big); x += P.big * 2 + S(e, 10);
      for (let i = 1; i < P.n; i++) {
        if (P.seg && i === P.round) { T(e, P.label, x + S(e, 6), cy - S(e, 10), S(e, 20), { ...P.lo, color: e.accent }); x += P.lw; }
        one(i, P.small, x + P.small); x += step;
      }
      return;
    }
    if (f === 'timeline') {
      g.fillStyle = withAlpha(e.text, 0.3); g.fillRect(a.x, a.y + a.h / 2 - 1, a.w, 2);
      DATA.turnOrder.forEach((n, i) => avatar(e, a.x + S(e, 20) + i * (a.w - S(e, 40)) / 4 + (i === 1 ? S(e, 14) : 0), a.y + a.h / 2, S(e, 16), n, n === foe ? e.bad : e.good));
      return;
    }
    DATA.turnOrder.forEach((n, i) => {
      const cx = a.x + S(e, 26) + i * S(e, 52), rr = i === 0 ? S(e, 24) : S(e, 18);
      // 外形按目标写了（vis.silhouette@el.turnOrder = diamond，M12b-18，octopath#2）时 icons 画成那个外形的头像框（菱形裁剪），否则原来的晶体徽章
      if (f === 'icons' && !scopedSilhouette(e, 'avatar')) { badge(e, cx, a.y + a.h / 2, rr * 0.8, 'crystal', n.slice(0, 1)); return; }
      avatar(e, cx, a.y + a.h / 2, rr, n, n === foe ? e.bad : e.good);
    });
  },
});

/**
 * 选项的内容（M12b-62，octopath#14）：局内 HUD 的回合制战斗（cnt.screen = screen.hud 且 ctx.timeModel = turn）= 内容包的战斗指令（screens.commands：攻击 / 能力 / 道具 / 防御……），
 * 其余 = 对话回复（hud.choices，原来的）
 */
const choicesOf = (e: ElCtx): string[] => (e.r.str('cnt.screen', 'screen.hud') === 'screen.hud' && e.r.str('ctx.timeModel', '') === 'turn' ? samplesFor('commands').map(([, l]) => l) : DATA.choices);
/**
 * 选项的标签样式与对齐（M12b-57 / 22，slay-the-spire#42）：el.choices.labelStyle = bracketTag 时选项写成「[选项名] 效果」——方括号里的名字用强调色，效果按富文本着色
 * （hier.inlineMap 的增益绿 / 代价红），左对齐、没有默认高亮的第一项；el.choices.align = left / center 单独定对齐。都没给时原来的居中按钮、第一项实心
 */
function choiceStyle(e: ElCtx) {
  const ls = String(elOf(e, 'labelStyle') ?? 'auto'), al = String(elOf(e, 'align') ?? 'auto');
  const tag = ls === 'bracketTag', check = ls === 'checkTag' && elChosen(e, 'labelStyle');
  // 默认焦点（el.choices.defaultFocus，M12b-22，slay-the-spire#42）：none = 没有默认高亮的那一项；没选 = 原来（bracketTag 时也不高亮，其余第一项）
  const df = elChosen(e, 'defaultFocus') ? String(elOf(e, 'defaultFocus') ?? 'auto') : 'auto', noFocus = df === 'none' || (df !== 'first' && tag);
  // 键位徽章 / 焦点标记（el.choices.keyBadge / focusMark，frostpunk#24）、不满足条件的项（el.choices.lockedItem：第几项整行压灰 + 原因）
  const kb = elChosen(e, 'keyBadge') ? String(elOf(e, 'keyBadge') ?? 'none') : 'none', fm = elChosen(e, 'focusMark') ? String(elOf(e, 'focusMark') ?? 'none') : 'none';
  const lk = elChosen(e, 'lockedItem') ? Math.round(Number(elOf(e, 'lockedItem')) || 0) : 0;
  // focusOff = 显式选了 none（横幅、非富文本 / 环上的文字与按钮只认它：bracketTag 的「不高亮」原来只管富文本那两处，B9 审查修复 ⑦）
  return { tag, check, left: al === 'left' || (tag && al !== 'center'), noFocus, focusOff: df === 'none', keyBadge: kb === 'start' || kb === 'end' ? kb : '', focusMark: fm === 'arrow' || fm === 'shift' ? fm : '', locked: lk };
}
/** 检定标签的样本（el.choices.labelStyle = checkTag，disco-elysium#41）：[技能, 难度, 红色检定?]（红 = 不可重试、白 = 可重试）；内容包 hud.choiceChecks，没写时 逻辑 · 中等 / 感知 · 困难（红） */
const choiceChecks = (): [string, string, boolean][] => DATA.choiceChecks ?? [['逻辑', '中等', false], ['感知', '困难', true]];
/** 不满足条件的原因（内容包 hud.choiceLockReason，没写时「条件不足」） */
const lockReason = () => DATA.choiceLockReason ?? '条件不足';
/** 选项字去掉富文本标记（量宽、居中按钮用）；bracketTag 时选项名两边补方括号 */
const choicePlain = (c: string) => plainText(c);

/** 对话选项行高：装得下一行字，触屏时不低于触控下限 */
const choiceRow = (e: ElCtx) => Math.max(S(e, 40), LH(e, e.base, 1.6) + S(e, 6), tap(e) + S(e, 6));

/**
 * 环形选项（el.choices 的 elx.arrangement = ring，M12a-20）：选项沿圆周排、从正上方顺时针，中间一圈细线和圆心（对话轮盘）；
 * 只认元素级显式给的排布（原来不读，一律竖排）。半径按最宽的选项定，横向椭圆（纵向 0.8）
 */
function choiceRing(e: ElCtx) {
  const list = choicesOf(e), rh = choiceRow(e) - S(e, 6), n = list.length;
  const ws = list.map((c) => W(e, choicePlain(c), e.base) + S(e, 40)), maxW = Math.max(...ws);
  const R0 = Math.max(S(e, 70), maxW * 0.62, rh * 1.4);
  const size = { w: 2 * R0 + maxW, h: 2 * R0 * 0.8 + rh };
  const cx = size.w / 2, cy = size.h / 2;
  const rects = ws.map((w, i) => { const t = (i / n) * Math.PI * 2 - Math.PI / 2; return { x: cx + Math.cos(t) * R0 - w / 2, y: cy + Math.sin(t) * R0 * 0.8 - rh / 2, w, h: rh }; });
  return { size, rects, R0, cx, cy };
}

/* 对话选项 */
registerElement({
  // 新画法 commandList（M12b-22，octopath#13）与排布 fan / cascade 见 choicesNew；检定标签 / 键位徽章 / 焦点标记 / 压灰项见 choiceStyle 与 choiceExtras
  id: 'el.choices', forms: ['buttons', 'text', 'banners', 'bubbles', 'commandList'], anchor: 'bc',
  size: (e) => {
    const nw = choicesNewSize(e);
    if (nw) return nw;
    const list = choicesOf(e), cs = choiceStyle(e), extra = (cs.check ? S(e, 110) : 0) + (cs.keyBadge ? choiceRow(e) * 0.8 : 0) + (cs.focusMark ? S(e, 22) : 0);
    // 检定的概率卡在选项上面、算进元素的高（B9 审查修复 ⑥：原来画在元素上沿以外、不算尺寸，上面的通知 / 元素会压上来）
    return ownArrangement(e, false) === 'ring' ? choiceRing(e).size : { w: fitW(e, S(e, 380), list.map((c, i) => [`${i + 1}. ${choicePlain(c)}`, e.base] as [string, Partial<TextOpts>]), S(e, 40)) + extra, h: list.length * choiceRow(e) + checkCardH(e) };
  },
  draw: (e, a0) => {
    if (choicesNew(e, a0)) return;
    // 检定的概率卡占元素顶上那一条，选项从它下面排
    const kc = checkCardH(e), a = kc ? { ...a0, y: a0.y + kc, h: a0.h - kc } : a0;
    const f = e.forms[0];
    const rh = choiceRow(e);
    const ring = ownArrangement(e, false) === 'ring' ? choiceRing(e) : null;
    if (ring) {
      // 轮盘（目检修复：原来只是一圈 22% 字色的细线，选项是光秃秃的字，压在场景上看不清）：选项落在一圈宽带上——带色 = 控件面（col.control，没给时面板底色），
      // 不透明度至少 0.8，内外两道细边用面板描边色；当前项（第 0 项）那一段叠强调色，圆心一颗轮毂、一根强调色指针指向它。选项本身按画法（buttons = 主 / 次按钮）
      const g = e.g, cx = a.x + ring.cx, cy = a.y + ring.cy, n = choicesOf(e).length, ry = 0.8, bw = (rh - S(e, 6)) * 0.8;
      const ctl = e.t.control ?? e.t.panel, solid = ctl.bg && 'solid' in ctl.bg ? ctl.bg.solid : undefined;
      const pc = parseColor(resolveColor(solid ?? e.th.surface, e.pal, '#1b1f27')), band = rgba([pc[0], pc[1], pc[2], Math.max(0.8, pc[3])]);
      const edge = resolveColor(ctl.border?.color ?? e.t.panel.border?.color, e.pal, withAlpha(e.text, 0.45));
      const t0 = -Math.PI / 2, seg = (Math.PI / Math.max(1, n)) * 0.85;
      g.save();
      g.strokeStyle = band; g.lineWidth = bw; g.beginPath(); g.ellipse(cx, cy, ring.R0, ring.R0 * ry, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = withAlpha(e.accent, 0.55); g.beginPath(); g.ellipse(cx, cy, ring.R0, ring.R0 * ry, 0, t0 - seg, t0 + seg); g.stroke();
      g.strokeStyle = edge; g.lineWidth = 1.5;
      for (const k of [-1, 1]) { g.beginPath(); g.ellipse(cx, cy, ring.R0 + (k * bw) / 2, (ring.R0 + (k * bw) / 2) * ry, 0, 0, Math.PI * 2); g.stroke(); }
      // 轮毂与指针
      const hub = S(e, 14);
      g.strokeStyle = e.accent; g.lineWidth = S(e, 3); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(t0) * (ring.R0 - bw / 2 - S(e, 4)), cy + Math.sin(t0) * (ring.R0 - bw / 2 - S(e, 4)) * ry); g.stroke();
      g.fillStyle = band; g.beginPath(); g.arc(cx, cy, hub, 0, Math.PI * 2); g.fill(); g.strokeStyle = edge; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = e.accent; g.beginPath(); g.arc(cx, cy, S(e, 5), 0, Math.PI * 2); g.fill(); g.restore();
    }
    const cs = choiceStyle(e);
    // 只换字色的焦点（ix.focus = textColor，M12b-60，disco-elysium#37）选过时：text 画法的当前项用焦点色（col.focus），没选时照旧强调色
    const hot = chosen(e, 'ix.focus') && e.r.list('ix.focus').includes('textColor') ? e.focus : e.accent;
    const ex = choiceExtrasOn(cs);
    choicesOf(e).forEach((c0, i) => {
      const r0 = ring ? { ...ring.rects[i], x: a.x + ring.rects[i].x, y: a.y + ring.rects[i].y } : { x: a.x, y: a.y + i * rh, w: a.w, h: rh - S(e, 6) };
      // 选过检定标签 / 键位徽章 / 焦点标记 / 压灰项时（M12b-22）：先让出它们的位置、画附件，再按原来的画法画这一项；没选时 r = r0（原来的）
      const r = ex && !ring ? choiceExtras(e, r0, i, cs) : r0;
      if (ex && !ring && cs.locked === i + 1) { e.g.save(); e.g.globalAlpha *= 0.42; }
      const c = choicePlain(c0), rich = c !== c0 || cs.tag;
      // 富文本标签（M12b-57）：一行，竖直居中，左对齐（cs.left）或居中；字按 hier.inlineMap 着色，bracketTag 时方括号里的名字是关键词色
      const richAt = (q: Rect, o: TextOpts, pad: number) => { const lh = q.h / LH(e, o, 1); const src = cs.tag && !c0.includes('[[') ? `{k:${c0}}` : cs.tag ? c0.replace(/\[\[([^\]]*)\]\]/, '{k:[$1]}') : c0; drawRich(e, src, { x: q.x + pad, y: q.y, w: q.w - pad * 2, h: q.h }, { o, lh, maxLines: 1, align: cs.left ? 'left' : 'center' }); };
      switch (f) {
        case 'text': if (rich && !ring) richAt({ ...r, x: r.x + W(e, `${i + 1}. `), w: r.w - W(e, `${i + 1}. `) }, { ...e.base, color: i === 0 && !cs.noFocus ? hot : e.text, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } }, 0), T(e, `${i + 1}. `, r.x, r.y, r.h, { ...e.base, color: e.text, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } }); else T(e, ring ? c : `${i + 1}. ${c}`, r.x + (ring ? (r.w - W(e, c)) / 2 : 0), r.y, r.h, { ...e.base, color: i === 0 && !cs.focusOff ? hot : e.text, outline: { color: 'rgba(0,0,0,0.5)', width: 1 } }); break;
        // 第 2 条起缩进 16（宽同减，不伸出元素框：目检修复，选项放在托盘右侧时原来压到面板边框上）
        case 'banners': { const ind = i === 0 || ring ? 0 : S(e, 16); plate(e, { ...r, x: r.x + ind, w: r.w - ind }, c, i === 0 && !cs.focusOff ? 'slashBand' : 'plaque', { size: S(e, 14) }); break; }
        case 'bubbles': panel(e, { ...r, w: ring ? r.w : W(e, c) + S(e, 30) }, true, { radiusPct: 50 }); T(e, c, r.x + (ring ? (r.w - W(e, c)) / 2 : S(e, 15)), r.y, r.h); break;
        default:
          if (rich && !ring) { const primary = i === 0 && !cs.noFocus; button(e, r, '', primary); const bo = buttonText(e.part('button'), r.h); richAt(r, primary ? onKey(e, bo) : bo, S(e, 14)); }
          // 非富文本 / 环上的按钮：bracketTag 的「不高亮」原来只管富文本那两处，这里只认显式的 defaultFocus = none（B9 审查修复 ⑦：环 + bracketTag 原来第一项高亮）
          else button(e, r, c, i === 0 && !cs.focusOff);
      }
      if (ex && !ring && cs.locked === i + 1) { e.g.restore(); const ro = { ...e.small, weight: 700, color: e.bad }, t = `（${lockReason()}）`; T(e, t, r.x + r.w - W(e, t, ro) - S(e, 10), r.y, r.h, ro); }
    });
    // 检定的概率卡（checkTag：焦点项旁一张小卡写成功率与加减项，disco-elysium#41）
    if (cs.check && !ring) checkCard(e, a0);
    void attachPoint;
  },
});

/* ---------------- 选项余项（M12b-22） ---------------- */
const choiceExtrasOn = (cs: ReturnType<typeof choiceStyle>) => cs.check || !!cs.keyBadge || !!cs.focusMark || cs.locked > 0;
/**
 * 一项的附件（返回这一项剩下的矩形）：焦点标记（focusMark = arrow：当前项左边一枚小三角；shift：再整条右移 10）、键位徽章（keyBadge = start / end：一端骑一枚圆形键位徽，
 * 字 = 第几项（手柄时面键））、检定标签（checkTag：选项后面写「[技能 · 难度]」，红色检定坏色、白色检定次要色）。focus = 第一项（noFocus 时没有）
 */
function choiceExtras(e: ElCtx, r0: Rect, i: number, cs: ReturnType<typeof choiceStyle>): Rect {
  const g = e.g, focus = i === 0 && !cs.noFocus;
  let r = { ...r0 };
  if (cs.focusMark) {
    const aw = S(e, 22);
    if (focus) { const cx = r.x + aw * 0.45, cy = r.y + r.h / 2, s = aw * 0.3; g.fillStyle = e.accent; g.beginPath(); g.moveTo(cx - s * 0.6, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx - s * 0.6, cy + s); g.closePath(); g.fill(); }
    r = { ...r, x: r.x + aw + (focus && cs.focusMark === 'shift' ? S(e, 10) : 0), w: r.w - aw - (cs.focusMark === 'shift' ? S(e, 10) : 0) };
  }
  if (cs.keyBadge) {
    const d = r.h * 0.8, pad = e.r.str('ctx.input', 'kbm') === 'pad', key = pad ? ['A', 'B', 'X', 'Y'][i % 4] : String(i + 1);
    const cx = cs.keyBadge === 'end' ? r.x + r.w - d / 2 : r.x + d / 2, cy = r.y + r.h / 2, kb = e.part('keyBadge');
    drawBox(g, { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, { bg: { solid: resolveColor(kb.th.surface, kb.pal) }, border: { width: Math.max(1, S(e, 1.5)), color: ornColor(kb) }, radiusPct: 50 }, kb.pal);
    const ko = { ...kb.small, size: d * 0.5, weight: 800, color: kb.text }; T(kb, key, cx - W(kb, key, ko) / 2, cy - d / 2, d, ko);
    r = cs.keyBadge === 'end' ? { ...r, w: r.w - d - S(e, 6) } : { ...r, x: r.x + d + S(e, 6), w: r.w - d - S(e, 6) };
  }
  if (cs.check) {
    const [sk, df, red] = choiceChecks()[i % choiceChecks().length], t = `[${sk} · ${df}]`, o = { ...e.small, weight: 700, color: red ? e.bad : mutedOf(e, 0.8) }, tw = W(e, t, o);
    T(e, t, r.x + r.w - tw, r.y, r.h, o);
    r = { ...r, w: r.w - tw - S(e, 8) };
  }
  return r;
}
/** 检定的概率卡的位置：元素顶上那一条、右对齐（只在检定标签、有默认焦点、不是环 / 新画法 / 新排布时有） */
function checkCardRect(e: ElCtx, a: Rect): Rect | null {
  const cs = choiceStyle(e), arr = ownArrangement(e, false);
  if (!cs.check || cs.noFocus || arr === 'ring' || arr === 'fan' || arr === 'cascade' || e.forms[0] === 'commandList') return null;
  const w = S(e, 104), h = S(e, 70);
  return { x: a.x + a.w - w, y: a.y, w, h };
}
/** 概率卡占的高（卡 + 与选项的间距；没有卡时 0） */
const checkCardH = (e: ElCtx) => (checkCardRect(e, { x: 0, y: 0, w: 0, h: 0 }) ? S(e, 76) : 0);
/** 检定的概率卡：焦点项（第一项）右上一张小卡——成功率大字 + 两行加减项（技能 +1 / 难度 −2），占元素顶上那一条 */
function checkCard(e: ElCtx, a: Rect) {
  const q = checkCardRect(e, a);
  if (!q) return;
  const [sk, df] = choiceChecks()[0], h = q.h;
  panel(e.part('tooltip'), q, true, {}, 'tooltip');
  const big = { ...e.title, weight: 800, color: e.text }, so = { ...e.small, color: mutedOf(e, 0.8) };
  T(e, '成功率', q.x + S(e, 8), q.y + S(e, 4), LH(e, so), so);
  drawNumber(e, '72%', q.x + S(e, 8), q.y + S(e, 4) + LH(e, so), LH(e, big, 1.1), big);
  T(e, `+1 ${sk} · ${df}`, q.x + S(e, 8), q.y + h - LH(e, so) - S(e, 2), LH(e, so), { ...so, color: e.good });
}
/**
 * 选项的新画法与排布（返回 true = 画过了）：
 *   commandList（octopath#13）：每条指令一条向左渐隐的深色横带、左对齐，当前项更亮 + 左边一枚指针（▶）；配 B6 的 elx.dockTo = el.party + dockSlot 挂到当前行动者名牌旁；
 *   elx.arrangement = fan：选项沿一道上拱的弧排开、每项顺着弧转一个小角度（扇形）；cascade：沿对角线错落、逐项按种子转 ±6°、字号逐项小一档，当前项垫强调色斜块
 */
function choicesNewSize(e: ElCtx): { w: number; h: number } | null {
  const f = e.forms[0], arr = ownArrangement(e, false);
  // 只在新画法 / 新排布时量字（默认的量字调用序列与原来一样）
  if (f !== 'commandList' && arr !== 'fan' && arr !== 'cascade') return null;
  const list = choicesOf(e), n = list.length, rh = choiceRow(e), mw = Math.max(...list.map((c) => W(e, choicePlain(c), e.base))) + S(e, 40);
  if (f === 'commandList') return { w: Math.max(S(e, 220), mw + S(e, 40)), h: n * (rh - S(e, 4)) };
  if (arr === 'fan') return { w: Math.max(S(e, 380), mw * Math.min(n, 4) * 0.9), h: rh * 2.4 };
  if (arr === 'cascade') return { w: mw * 1.6 + n * S(e, 18), h: n * rh * 1.05 };
  return null;
}
function choicesNew(e: ElCtx, a: Rect): boolean {
  const f = e.forms[0], arr = ownArrangement(e, false), list = choicesOf(e), n = list.length, rh = choiceRow(e), g = e.g, ctxs = e.tx === g ? [g] : [g, e.tx];
  if (f === 'commandList') {
    const h = rh - S(e, 4), base = resolveColor(e.th.surface, e.pal);
    list.forEach((c0, i) => {
      const r = { x: a.x, y: a.y + i * h, w: a.w, h: h - S(e, 2) }, on = i === 0, c = choicePlain(c0);
      g.save(); g.fillStyle = fadePaint(g, r, 'left', 0.65, withAlpha(on ? mix(base, '#ffffff', 0.18) : base, on ? 0.95 : 0.78)); g.fillRect(r.x, r.y, r.w, r.h); g.restore();
      const o = { ...e.base, weight: on ? 700 : 400, color: on ? e.text : withAlpha(e.text, 0.82) };
      if (on) icon(e, '▶', r.x + S(e, 12), r.y + r.h / 2, S(e, 12), e.accent);
      T(e, c, r.x + S(e, 26), r.y, r.h, o);
      logTarget(g, r, c);
    });
    return true;
  }
  if (arr !== 'fan' && arr !== 'cascade') return false;
  const cs = choiceStyle(e);
  list.forEach((c0, i) => {
    const c = choicePlain(c0), on = i === 0 && !cs.noFocus;
    let cx: number, cy: number, deg: number, o: TextOpts;
    if (arr === 'fan') {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0, R0 = a.w * 0.9;
      cx = a.x + a.w / 2 + Math.sin(t * 0.9) * R0 * 0.5; cy = a.y + a.h * 0.32 + (1 - Math.cos(t * 0.9)) * R0 * 0.5; deg = t * 0.9 * 57.3 * 0.6; o = { ...e.base, weight: on ? 700 : 400 };
    } else {
      const k = Math.max(1, 1.5 - i * 0.12) * (on ? 1.12 : 1);
      o = { ...e.base, size: e.base.size * k, weight: 900, ...displayFor(e, 'menuItem') };
      cx = a.x + S(e, 14) + i * ((a.w - W(e, c, o) - S(e, 28)) / Math.max(1, n - 1)) + W(e, c, o) / 2; cy = a.y + (i + 0.5) * (a.h / n); deg = (((i * 7919) % 13) / 13 - 0.5) * 12;
    }
    const w = W(e, c, o) + S(e, 24), h = LH(e, o, 1.3), rr = { x: cx - w / 2, y: cy - h / 2, w, h };
    for (const q of ctxs) { q.save(); q.translate(cx, cy); q.rotate((deg * Math.PI) / 180); q.translate(-cx, -cy); }
    if (arr === 'fan') button(e, rr, c, on);
    else {
      if (on) { g.fillStyle = e.accent; g.beginPath(); g.moveTo(rr.x - S(e, 6), rr.y + rr.h * 0.12); g.lineTo(rr.x + rr.w + S(e, 8), rr.y); g.lineTo(rr.x + rr.w, rr.y + rr.h); g.lineTo(rr.x - S(e, 10), rr.y + rr.h * 0.9); g.closePath(); g.fill(); }
      T(e, c, rr.x + S(e, 12), rr.y, rr.h, on ? onAccent(e, o) : { ...o, color: e.text });
    }
    for (const q of ctxs) q.restore();
    logTarget(g, rr, c);
  });
  return true;
}
