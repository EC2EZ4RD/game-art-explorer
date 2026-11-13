import { mix, withAlpha } from '../material';
import { boxPath, drawBox, drawFinish, lightFace, logTarget, resolveColor, TEXT_K, wrapLines, type Rect, type TextOpts } from '../paint';
import { onColorOf } from '../sys/theme';
import { drawRich, measureRich, plainText } from '../richText';
import type { BoxStyle } from '../types';
import { pack } from '../content';
import { samplesFor } from '../content/samples';
import { drawField, FIELD_KINDS, FLEX_FIELDS, measureField, type FieldData } from './fields';
import { chosen, DATA, drawNumber, icon, itemIcon, lineColor, LH, numberWidth, panel, pickedStr, rarityColor, rarityCues, rarityShown, romanOf, scopedSet, T, W, type ElCtx } from './core';

/*
 * 卡面渲染器（M12b-12，§2 的 drawCard(e, r, item, opts)）：所有卡牌入口（el.abilities = cards 的手牌、el.reward = cards / bigCard、模板的卡行 cardsRow、
 * 网格里的竖卡 tallCard / 肖像竖卡 portraitCard / 收藏卡 collectionCard、扇形牌 fanCards、马赛克瓷砖墙 mosaic）都经它画。
 * 版式 = cmp.card（按 @card → @元素 → 全局、选过才换，旧皮肤只认皮肤之后的层）：iconCard = 各入口原来的画法（调用方把原来那段画法当 legacy 传进来，
 * 什么都不设时画面与调用序列逐字不变）；其余版式在卡片部件 e.part('card') 上画（底色读 col.surface@card / @元素，ast.finish@card 的表面处理随卡面盒子）。
 * 插画窗没有素材时画类型符号（卡的符号淡显在一块渐变底上，素材在 M12c-A3）。卡内按序嵌套的子件（cmp.cardParts）、手牌扇叠、版本叠层见 M12b-69。
 * Godot：每种版式一个 PanelContainer 子场景（CardFace_<版式>.tscn，VBox 分段：名条 Label、插画 TextureRect、类型 Label、RichTextLabel 文本框、费用 Panel + Label），
 * 主题类型变体 Card；语义着色 = 按样本切 StyleBoxFlat；版本叠层 = canvas_item shader（ui_surface.gdshader 的 finish）
 */

/** 卡面的数据（各入口从自己的样本组出来；只用到版式需要的那几项） */
export interface CardItem {
  /** 序号（演示状态 / 罗马数字 / 点数按它取） */
  i: number;
  /** 卡的符号（插画窗没有素材时画它） */
  glyph: string;
  name: string;
  /** 说明（可带富文本标记） */
  desc?: string;
  /** 费用（TCG 的左上费用球） */
  cost?: string;
  /** 类型：attack / skill / power / status / curse（TCG 的类型条、插画窗形状），别的写什么画什么 */
  type?: string;
  /** 稀有度 0~4 */
  rarity?: number;
  /** 扑克牌：点数（A 2–10 J Q K）与花色（S 黑桃 H 红心 D 方块 C 梅花） */
  rank?: string; suit?: string;
  /** 类别 / 流派序号（col.coding 含 lineId 时的整卡底色 / 外框色） */
  line?: number;
  /** 数值角标（肖像竖卡右下的白方块、球员卡的评分） */
  value?: string;
  /** 副题（职业 / 位置 / 时代：圆龛卡的抬头、球员卡的位置） */
  sub?: string;
  /** 图集里的物品名（收藏卡的插画窗有图集图标时画它） */
  item?: string;
  /** 版本叠层（foil / holo / polychrome / glass；不写时按 st.rarityCue = finish 的档位） */
  edition?: string;
  /** 能不能打出 / 费用够不够（cmp.cardColorBy 的 playableGlow / costAffordable） */
  playable?: boolean; affordable?: boolean;
  /** 当前项（卡行的当前卡：卡内子件 actionTop 画「选择」按钮，其余画状态牌） */
  current?: boolean;
}

/** 入口给的选项：legacy = 这个入口原来的画法（iconCard 时调用它）；kind 给了时不读 cmp.card（马赛克瓷砖墙固定 tile） */
export interface CardOpts { legacy: () => void; kind?: string; ink?: string; small?: boolean }

/** 卡面版式（cmp.card 的取值；auto / 没选 = iconCard） */
export const CARD_KINDS = new Set(['iconCard', 'fullArt', 'tile', 'tcg', 'playingCard', 'tarot', 'medallion', 'portrait', 'talisman', 'collection', 'statCard', 'playerCard']);
/** 这一处画哪种卡面（cmp.card 按 @card → @元素 → 全局，选过才换：旧皮肤只认皮肤之后的层；不认识的值当 iconCard） */
export function cardKind(e: ElCtx): string {
  const v = pickedStr(e.part('card'), 'cmp.card', 'iconCard');
  return CARD_KINDS.has(v) ? v : 'iconCard';
}
/** 卡的语义着色（cmp.cardColorBy，多选，选过才着色）：frameLine 整卡底色按类别、bannerRarity 名条按稀有度、artType 插画窗形状按类型、playableGlow 可打出外发光、costAffordable 费用不够变红 */
export function cardColorBy(e: ElCtx): string[] {
  const ec = e.part('card'), k = ['cmp.cardColorBy@card', ...e.scope.map((t) => `cmp.cardColorBy@${t}`), 'cmp.cardColorBy'].find((x) => e.r.has(x) && chosen(ec, x));
  return k ? e.r.list(k).filter((x) => x !== 'auto' && x !== 'none') : [];
}

/**
 * 卡的版本叠层：只在 st.rarityCue（按 @card → @元素 → 全局）含 finish 时画（B7 审查修复 ①：原来样本写了 edition 就画，deckBuilder 包的手牌样本带版本，
 * StS 等所有用这个包的手牌都被叠上箔 / 镭射）——这时样本写了 edition 用它，否则按稀有度档位（与格子同一张表：罕见箔、稀有镭射、史诗多彩、传说玻璃）。
 * 整卡统一的表面处理是 ast.finish@card（卡面盒子自己画，不经这里）
 */
const EDITION_OF = ['none', 'foil', 'holo', 'polychrome', 'glass'];
export function editionOf(e: ElCtx, it: CardItem): string | null {
  if (!rarityCues(e).includes('finish')) return null;
  if (it.edition && it.edition !== 'none') return it.edition;
  if (it.rarity === undefined || it.rarity <= 0 || !rarityShown(e)) return null;
  return EDITION_OF[Math.min(it.rarity, EDITION_OF.length - 1)];
}

/** 字在 maxW 里放得下：放不下按比例缩字号（下限 0.55） */
function fit(e: ElCtx, s: string, maxW: number, o: TextOpts): TextOpts {
  const w = W(e, s, o);
  return w <= maxW || w <= 0 ? o : { ...o, size: o.size * Math.max(0.55, maxW / w) };
}
/** 居中写一行（返回字样） */
function centered(e: ElCtx, s: string, cx: number, y: number, lh: number, o: TextOpts, maxW = Infinity): TextOpts {
  const oo = fit(e, s, maxW, o);
  T(e, s, cx - W(e, s, oo) / 2, y, lh, oo);
  return oo;
}
/** 居中写一串数字（B7 审查修复 ⑧：费用、数值角标、评分经 B5 的 drawNumber / numberWidth，有 typ.numerals.* 的皮肤换数字字形；放不下按比例缩，下限 0.55） */
function centeredNum(e: ElCtx, s: string, cx: number, y: number, lh: number, o: TextOpts, maxW = Infinity): TextOpts {
  const w = numberWidth(e, s, o), oo = w <= maxW || w <= 0 ? o : { ...o, size: o.size * Math.max(0.55, maxW / w) };
  drawNumber(e, s, cx - numberWidth(e, s, oo) / 2, y, lh, oo);
  return oo;
}
/** 卡内小字的字号（B7 审查修复 ㉔）：按卡的比例算的值 prop（不超过 cap）乘 TEXT_K（a11y.textScale / 平台字号跟着放大，原来 fixedSize 不跟），下限 7 × TEXT_K；配 fixedSize 用 */
export const cardTextSize = (prop: number, cap: number) => Math.max(7, Math.min(cap, prop)) * TEXT_K.k;

/** 卡的底色：col.surface 按目标写在 @card / @元素 上时跟面板 token，否则版式自己的底（扑克 / 收藏卡 = 牌白、符箓 = 黄纸） */
const ownFace = (ec: ElCtx) => scopedSet(ec, 'col.surface');
const faceOf = (ec: ElCtx): string => {
  const bg = ec.t.card?.bg ?? ec.t.panel.bg;
  return bg && 'solid' in bg ? resolveColor(bg.solid, ec.pal) : resolveColor(ec.th.surface, ec.pal);
};

/** 插画窗：有图集图标（收藏卡的物品）时画图标，否则一块按类别 / 强调色调的渐变底 + 淡显的卡符号；shape = 窗形（attack 尖底 / power 拱顶 / box 方框） */
function artWindow(ec: ElCtx, q: Rect, it: CardItem, shape = 'box', tone?: string, gy = 0.48) {
  const g = ec.g, base = tone ?? lineColor(ec, it.line) ?? ec.accent, face = faceOf(ec);
  g.save();
  g.beginPath();
  if (shape === 'pointed') { g.moveTo(q.x, q.y); g.lineTo(q.x + q.w, q.y); g.lineTo(q.x + q.w, q.y + q.h * 0.82); g.lineTo(q.x + q.w / 2, q.y + q.h); g.lineTo(q.x, q.y + q.h * 0.82); g.closePath(); }
  else if (shape === 'arch') { const rr = Math.min(q.w / 2, q.h * 0.5); g.moveTo(q.x, q.y + q.h); g.lineTo(q.x, q.y + rr); g.arc(q.x + q.w / 2, q.y + rr, q.w / 2, Math.PI, 0); g.lineTo(q.x + q.w, q.y + q.h); g.closePath(); }
  else g.rect(q.x, q.y, q.w, q.h);
  const gr = g.createLinearGradient(q.x, q.y, q.x, q.y + q.h);
  gr.addColorStop(0, mix(base, face, 0.55)); gr.addColorStop(1, mix(base, '#000', 0.45));
  g.fillStyle = gr; g.fill(); g.clip();
  if (!(it.item && itemIcon(ec, it.item, q.x + q.w / 2, q.y + q.h / 2, Math.min(q.w, q.h) * 0.7))) icon(ec, it.glyph, q.x + q.w / 2, q.y + q.h * gy, Math.min(q.w, q.h) * 0.5, withAlpha('#fff', 0.55));
  g.restore();
  g.save(); g.strokeStyle = withAlpha('#000', 0.5); g.lineWidth = 1;
  g.beginPath(); if (shape === 'box') g.rect(q.x, q.y, q.w, q.h); else { g.moveTo(q.x, q.y); g.lineTo(q.x + q.w, q.y); } g.stroke(); g.restore();
}

/**
 * 底部暗渐变标签带（整幅插画 / 瓷砖）：名字（标题字族、不超过正文字号的粗体，瓷砖大写）+ 可选一行小字。
 * B7 审查修复 ㉑：名字原来用页面标题字号（FH5 的瓷砖标签与页签一样大，大字号时伸出瓷砖压到邻格）——字号封顶到正文、行高限在标签带里（放不下两行时只写名字），字裁在卡里
 */
function captionBand(ec: ElCtx, r: Rect, name: string, line: string | null, upper: boolean) {
  const g = ec.g, pad = 8 * ec.k;
  const nm0: TextOpts = { ...ec.title, size: Math.min(ec.title.size, ec.base.size), weight: 900, color: '#fff', outline: undefined, shadow: undefined }, lo0: TextOpts = { ...ec.small, color: withAlpha('#fff', 0.82), outline: undefined, shadow: undefined };
  const h = Math.min(r.h * 0.42, Math.max(LH(ec, nm0) + (line ? LH(ec, lo0) : 0) + pad, r.h * 0.26));
  const gr = g.createLinearGradient(0, r.y + r.h - h * 1.3, 0, r.y + r.h);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.78)');
  g.save(); g.fillStyle = gr; g.fillRect(r.x, r.y + r.h - h * 1.3, r.w, h * 1.3); g.restore();
  const nm = upper ? name.toUpperCase() : name, avail = h - pad * 0.4, two = !!line && LH(ec, nm0) + LH(ec, lo0) <= avail;
  // 名字的行高不超过标签带剩下的高（按行高反推字号），宽放不下再按 fit 缩
  const room = avail - (two ? LH(ec, lo0) : 0), nmH = LH(ec, nm0) <= room ? nm0 : { ...nm0, size: nm0.size * Math.max(0.3, room / LH(ec, nm0)) };
  const no = fit(ec, nm, r.w - pad * 2, nmH);
  const y0 = r.y + r.h - h + pad * 0.4, ctxs = ec.tx === g ? [g] : [g, ec.tx];
  for (const c of ctxs) { c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip(); }
  try {
    T(ec, nm, r.x + pad, y0, LH(ec, no), no);
    if (two) { const lo = fit(ec, line!, r.w - pad * 2, lo0); T(ec, line!, r.x + pad, y0 + LH(ec, no), LH(ec, lo), lo); }
  } finally { for (const c of ctxs) c.restore(); }
}

/** 花色（矢量，不依赖字体：♦ ♣ 不在字体子集里）：S 黑桃 H 红心 D 方块 C 梅花，(cx, cy) 为中心、s 为高 */
export function drawSuit(g: CanvasRenderingContext2D, suit: string, cx: number, cy: number, s: number, color: string) {
  const h = s / 2;
  g.save(); g.fillStyle = color; g.beginPath();
  if (suit === 'D') { g.moveTo(cx, cy - h); g.lineTo(cx + h * 0.72, cy); g.lineTo(cx, cy + h); g.lineTo(cx - h * 0.72, cy); g.closePath(); g.fill(); }
  else if (suit === 'H' || suit === 'S') {
    // 心形 = 两个圆 + 一个尖朝外的三角（黑桃 = 倒过来的心 + 底下一根柄）；只用圆弧与直线（Godot 的 draw_circle / draw_polygon 同样画得出）
    const up = suit === 'S' ? -1 : 1, rr = h * 0.5, yc = cy - up * h * 0.3;
    g.arc(cx - rr * 0.95, yc, rr, 0, Math.PI * 2); g.moveTo(cx + rr * 0.95 + rr, yc); g.arc(cx + rr * 0.95, yc, rr, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - rr * 1.92, yc + up * rr * 0.25); g.lineTo(cx + rr * 1.92, yc + up * rr * 0.25); g.lineTo(cx, cy + up * h); g.closePath(); g.fill();
    if (suit === 'S') { g.beginPath(); g.moveTo(cx, cy + h * 0.15); g.lineTo(cx + h * 0.3, cy + h); g.lineTo(cx - h * 0.3, cy + h); g.closePath(); g.fill(); }
  } else if (suit === 'C') {
    const rr = h * 0.4;
    for (const [dx, dy] of [[0, -0.48], [-0.46, 0.12], [0.46, 0.12]]) { g.moveTo(cx + dx * h + rr, cy + dy * h); g.arc(cx + dx * h, cy + dy * h, rr, 0, Math.PI * 2); }
    g.fill(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + h * 0.28, cy + h); g.lineTo(cx - h * 0.28, cy + h); g.closePath(); g.fill();
  }
  g.restore();
}
const SUIT_RED = new Set(['H', 'D']);
/** 点阵的位置（列 x：0 / 0.5 / 1，行 y：0…1），2–10 按扑克牌的标准排法 */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]], 2: [[0.5, 0], [0.5, 1]], 3: [[0.5, 0], [0.5, 0.5], [0.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]], 5: [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]],
  6: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [1, 1]], 7: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
  8: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0.5, 0.75], [0, 1], [1, 1]], 9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0.5, 0.5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  10: [[0, 0], [1, 0], [0.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0.5, 5 / 6], [0, 1], [1, 1]],
};
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['S', 'H', 'D', 'C'];
/** 样本没写点数 / 花色时按序号演示（A♠、K♥、7♦、10♣……：一手牌里大小与红黑都有） */
export const demoRank = (i: number) => RANKS[(i * 5 + 12) % 13];
export const demoSuit = (i: number) => SUITS[i % 4];

/** 类型的中文字（类型条）：内容包没写别的就按 attack / skill / power 换成「攻击 / 技能 / 能力」 */
const TYPE_WORD: Record<string, string> = { attack: '攻击', skill: '技能', power: '能力', status: '状态', curse: '诅咒' };
/** 样本没写类型时按序号演示（攻击、技能、攻击、能力…） */
export const demoType = (i: number) => ['attack', 'skill', 'attack', 'power'][i % 4];

/**
 * 画一张卡（§2）：kind = opts.kind ?? cmp.card；iconCard 调 opts.legacy（入口原来的画法）。其余版式见各分支。
 * 版本叠层与可打出外发光对所有新版式生效；登记 logTarget（名字）
 */
export function drawCard(e: ElCtx, r: Rect, it: CardItem, o: CardOpts): void {
  const kind = o.kind ?? cardKind(e), parts = cardPartsOf(e);
  if ((kind === 'iconCard' && !parts.length) || r.w < 4 || r.h < 4) { o.legacy(); return; }
  const ec = e.part('card'), g = ec.g, by = cardColorBy(e);
  const lc = by.includes('frameLine') ? lineColor(ec, it.line ?? it.i) : null;
  // 可打出外发光（cmp.cardColorBy 含 playableGlow，StS 的青色光）：卡外一圈
  if (by.includes('playableGlow') && it.playable !== false) { g.save(); g.shadowColor = '#5ee7ff'; g.shadowBlur = 14 * ec.k; g.fillStyle = withAlpha('#5ee7ff', 0.9); g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * 0.06); g.fill(); g.restore(); }
  const face = (over: Partial<BoxStyle> = {}) => panel(ec, r, !!o.small, over, 'card');
  // 卡面的底色（版本叠层按它选深 / 浅色版，B7 审查修复 ⑯）：版式自己的纸色（扑克 / 收藏卡 / 符箓）或卡面盒子的底
  let faceCol = faceOf(ec);
  const paper = (c: string) => { if (!ownFace(ec)) faceCol = c; face(ownFace(ec) ? {} : { bg: { solid: c } }); };
  if (kind === 'tcg' && lc && !parts.length) faceCol = mix(lc, '#000', 0.35);
  // 卡内按序嵌套的子件（cmp.cardParts 选过，M12b-69）：卡面底照版式（扑克 / 符箓的纸色），里面按子件栈排，不画版式自己的内容
  if (parts.length) { if (kind === 'playingCard' || kind === 'collection') paper('#f7f3ea'); else if (kind === 'talisman') paper('#e9c46a'); else face(lc ? { border: { width: 3, color: lc } } : {}); cardSections(ec, r, it, parts); }
  else switch (kind) {
    case 'fullArt': face(lc ? { border: { width: 3, color: lc } } : {}); artWindow(ec, inset(r, 4 * ec.k), it, 'box', lc ?? undefined, 0.36); captionBand(ec, r, it.name, null, false); break;
    case 'tile': face(); artWindow(ec, r, it, 'box', lc ?? undefined, 0.36); captionBand(ec, r, it.name, it.desc ? firstLine(it.desc) : null, true); break;
    case 'collection': paper('#f4f1ea'); collectionCard(ec, r, it); break;
    case 'tcg': tcgCard(ec, r, it, by, lc, face); break;
    case 'playingCard': paper('#f7f3ea'); playingCard(ec, r, it); break;
    case 'tarot': face(lc ? { border: { width: 2, color: lc } } : {}); tarotCard(ec, r, it); break;
    case 'medallion': face(); medallionCard(ec, r, it); break;
    case 'portrait': face(); portraitCard(ec, r, it); break;
    case 'talisman': paper('#e9c46a'); talismanCard(ec, r, it); break;
    case 'statCard': face(); statCard(ec, r, it); break;
    case 'playerCard': face(lc ? { border: { width: 3, color: lc } } : {}); playerCard(ec, r, it); break;
  }
  // 版本叠层（ast.finish 的同一套画法：样本 edition，或 st.rarityCue = finish 按档位），沿卡外形裁剪
  const ed = editionOf(ec, it);
  if (ed) { const sty = ec.t.card ?? ec.t.panel, path = () => { g.beginPath(); boxPath(g, r, sty); }; g.save(); path(); g.clip(); drawFinish(g, r, ed, path, lightFace(faceCol)); g.restore(); }
  logTarget(g, r, it.name);
}

const inset = (r: Rect, d: number): Rect => ({ x: r.x + d, y: r.y + d, w: Math.max(0, r.w - d * 2), h: Math.max(0, r.h - d * 2) });
const firstLine = (s: string) => plainText(s).split(/[。；\n]/)[0];

/** 收藏卡（Balatro 收藏页的小丑牌）：牌白底、插画窗占上 76%、下面写名字，不写价格 */
function collectionCard(ec: ElCtx, r: Rect, it: CardItem) {
  const pad = Math.max(3, r.w * 0.07), q = { x: r.x + pad, y: r.y + pad, w: r.w - pad * 2, h: r.h * 0.74 - pad };
  artWindow(ec, q, it);
  const ink = onColorOf(faceOf(ec), faceOf(ec));
  const lh = r.y + r.h - (q.y + q.h);
  centered(ec, it.name, r.x + r.w / 2, q.y + q.h, lh, { ...ec.small, weight: 800, color: ownFace(ec) ? ink : '#1f2328', outline: undefined, shadow: undefined }, r.w - pad * 2);
}

/**
 * TCG（StS）：整卡底色（cmp.cardColorBy 含 frameLine 时按类别 / 角色色）、顶部名条（bannerRarity 时按稀有度色）、插画窗（artType 时攻击尖底 / 技能方框 / 能力拱顶）、
 * 窗下类型小牌、文本框（富文本：关键词着色）、左上圆形费用（costAffordable 且费用不够时字变红）
 */
function tcgCard(ec: ElCtx, r: Rect, it: CardItem, by: string[], lc: string | null, face: (over?: Partial<BoxStyle>) => void) {
  const g = ec.g, s = Math.min(r.w, r.h), k = ec.k;
  face(lc ? { bg: { solid: mix(lc, '#000', 0.35) }, border: { width: Math.max(2, s * 0.025), color: mix(lc, '#fff', 0.25) } } : {});
  const px = r.w * 0.09, bannerH = Math.max(LH(ec, ec.small) * 1.1, r.h * 0.11), by0 = r.y + r.h * 0.05;
  const type = it.type ?? demoType(it.i);
  // 费用球的半径（有费用时）：名条的字从费用球右边起排（B7 审查修复 ㉛：原来居中排满 78% 卡宽，三四个字的名字压到费用球下）
  const cr = it.cost !== undefined ? Math.max(6, s * 0.13) : 0;
  // 名条
  const bc = by.includes('bannerRarity') && it.rarity !== undefined ? rarityColor(ec, it.rarity) : mix(faceOf(ec), '#fff', 0.22);
  drawBox(g, { x: r.x + px * 0.6, y: by0, w: r.w - px * 1.2, h: bannerH }, { bg: { solid: bc }, radius: bannerH * 0.25, border: { width: 1, color: withAlpha('#000', 0.45) } }, ec.pal);
  const nl = cr ? r.x + cr * 1.75 + px * 0.3 : r.x + px * 1.2, nr = r.x + r.w - px * 1.2;
  centered(ec, it.name, (nl + nr) / 2, by0, bannerH, { ...ec.title, size: Math.min(ec.title.size, bannerH * 0.62), weight: 800, color: onColorOf(bc, faceOf(ec)), outline: undefined, shadow: undefined }, nr - nl);
  // 插画窗 + 类型小牌
  const aw = { x: r.x + px, y: by0 + bannerH + r.h * 0.02, w: r.w - px * 2, h: r.h * 0.31 };
  // 类型小牌的字（审查修复 ㉔：原来 min(小字, 卡高 5%)、fixedSize——1080p 的 tpl.hand 上 8.8 px，大字号设置也不跟；现在下限 7 × TEXT_K、跟 TEXT_K 放大）
  const tw = TYPE_WORD[type] ?? type, to: TextOpts = { ...ec.small, size: cardTextSize(r.h * 0.05, ec.small.size), weight: 700, fixedSize: true, color: '#fff', outline: undefined, shadow: undefined };
  const tph0 = Math.max(to.size, LH(ec, to, 1)) * 1.5;
  // 说明按画出来的字号（含品质下限）要几行（至多 3 行）：文本框不够高时插画窗让出高度（至少留卡高 16%）——审查修复 E 视觉 ①：字号被下限抬大后行高跟着抬，
  // 原来文本框按没抬的字号定，两行叠字 / 末行被裁
  if (it.desc) {
    const lhK0 = 1.35, base0: TextOpts = { ...ec.small, size: Math.min(ec.small.size, 7), color: '#fff', outline: undefined, shadow: undefined };
    const ibw = r.w - px * 2 - 8 * k, lines = Math.min(3, Math.max(1, measureRich(ec, it.desc, ibw, { o: base0, align: 'center', lh: lhK0 }).lines));
    const need = lines * LH(ec, base0, lhK0) + 8 * k + 1, have = r.y + r.h * 0.95 - (aw.y + aw.h - tph0 * 0.4 + tph0 + r.h * 0.02);
    if (have < need) aw.h = Math.max(r.h * 0.16, aw.h - (need - have));
  }
  artWindow(ec, aw, it, by.includes('artType') ? (type === 'attack' ? 'pointed' : type === 'power' ? 'arch' : 'box') : 'box', lc ?? undefined);
  const tpw = W(ec, tw, to) + to.size * 1.4, tph = tph0, tpy = aw.y + aw.h - tph * 0.4;
  drawBox(g, { x: r.x + r.w / 2 - tpw / 2, y: tpy, w: tpw, h: tph }, { bg: { solid: withAlpha('#000', 0.7) }, radiusPct: 50 }, ec.pal);
  T(ec, tw, r.x + r.w / 2 - W(ec, tw, to) / 2, tpy, tph, to);
  // 文本框
  const tb = { x: r.x + px, y: tpy + tph + r.h * 0.02, w: r.w - px * 2, h: r.y + r.h * 0.95 - (tpy + tph + r.h * 0.02) };
  if (tb.h > 6) {
    drawBox(g, tb, { bg: { solid: withAlpha('#000', 0.28) }, radius: 4 * k }, ec.pal);
    if (it.desc) {
      // 终期审查修复 ③：说明装不下时字号往下收（每次 0.5，下限 6 × TEXT_K），收到整段（至多 3 行）装得下为止；到下限仍装不下的，最后一行行尾写「…」
      // （原来字号下限 7、默认卡上文本框只装得下一行，「造成 8 点伤害。」截成「造成 8 点伤」，没有省略号）
      const ib = inset(tb, 4 * k), lhK = 1.35, base: TextOpts = { ...ec.small, size: Math.min(ec.small.size, Math.max(7, tb.h / 3.6)), color: '#fff', outline: undefined, shadow: undefined };
      let o = base;
      for (let s = base.size; s >= 6 - 1e-6; s -= 0.5) {
        o = { ...base, size: s };
        const cap = Math.min(3, Math.floor((ib.h + 0.5) / LH(ec, o, lhK)));
        if (cap >= 1 && measureRich(ec, it.desc, ib.w, { o, align: 'center', lh: lhK }).lines <= cap) break;
      }
      drawRich(ec, it.desc, ib, { o, align: 'center', maxLines: 3, lh: lhK, ellipsis: true });
    }
  }
  // 费用球
  if (it.cost !== undefined) {
    const cx = r.x + cr * 0.75, cy = r.y + cr * 0.75;
    g.save(); g.fillStyle = mix(ec.accent, '#000', 0.2); g.strokeStyle = withAlpha('#000', 0.7); g.lineWidth = Math.max(1, cr * 0.14);
    g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    const short = by.includes('costAffordable') && it.affordable === false;
    centeredNum(ec, it.cost, cx, cy - cr, cr * 2, { ...ec.title, size: cr * 1.15, weight: 900, color: short ? ec.bad : '#fff', fixedSize: true, outline: { color: 'rgba(0,0,0,0.65)', width: Math.max(1, cr * 0.1) } });
  }
}

/** 扑克牌（Balatro）：牌白底、左上 / 右下角标（点数 + 小花色，红黑两色）、中间按点数排花色点阵（A 一个大花色、J / Q / K 一块方形人头牌肖像） */
function playingCard(ec: ElCtx, r: Rect, it: CardItem) {
  const g = ec.g, rank = it.rank ?? demoRank(it.i), suit = it.suit ?? demoSuit(it.i), col = SUIT_RED.has(suit) ? '#d0342c' : '#22252b';
  const s = Math.min(r.w, r.h / 1.4), ro: TextOpts = { ...ec.title, size: s * 0.2, weight: 900, color: col, fixedSize: true, outline: undefined, shadow: undefined };
  const corner = () => { T(ec, rank, r.x + s * 0.07, r.y + s * 0.04, s * 0.24, ro); drawSuit(g, suit, r.x + s * 0.07 + W(ec, rank, ro) / 2, r.y + s * 0.36, s * 0.14, col); };
  corner();
  g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(Math.PI); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
  if (ec.tx !== g) { ec.tx.save(); ec.tx.translate(r.x + r.w / 2, r.y + r.h / 2); ec.tx.rotate(Math.PI); ec.tx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
  corner();
  if (ec.tx !== g) ec.tx.restore();
  g.restore();
  const body = { x: r.x + r.w * 0.33, y: r.y + r.h * 0.2, w: r.w * 0.34, h: r.h * 0.6 };
  const n = rank === 'A' ? 1 : Number(rank);
  if (Number.isFinite(n) && PIPS[n]) {
    const ps = Math.min(r.w * 0.17, body.h / 4.4) * (n === 1 ? 2.4 : 1);
    for (const [px, py] of PIPS[n]) drawSuit(g, suit, body.x + px * body.w, body.y + py * body.h, ps, col);
  } else {
    // 人头牌：方形肖像（深色框里一个剪影 + 点数字），没有素材时程序画
    const q = { x: r.x + r.w * 0.24, y: r.y + r.h * 0.2, w: r.w * 0.52, h: r.h * 0.6 };
    drawBox(g, q, { bg: { solid: mix(col, '#f7f3ea', 0.82) }, border: { width: 1.5, color: col } }, ec.pal);
    g.save(); g.fillStyle = withAlpha(col, 0.75); g.beginPath(); g.arc(q.x + q.w / 2, q.y + q.h * 0.36, q.w * 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(q.x + q.w / 2, q.y + q.h * 0.86, q.w * 0.36, q.h * 0.28, 0, Math.PI, Math.PI * 2); g.fill(); g.restore();
    centered(ec, rank, q.x + q.w / 2, q.y + q.h * 0.02, q.h * 0.24, { ...ro, size: s * 0.15 });
  }
}

/** 塔罗（Cult of the Lamb）：顶部罗马数字、整幅插画窗（拱顶）、底部名牌；说明不写在卡里（调用方写在卡外下方） */
function tarotCard(ec: ElCtx, r: Rect, it: CardItem) {
  const pad = Math.max(3, r.w * 0.07), top = r.h * 0.11, bottom = r.h * 0.14, ink = ec.heading;
  centered(ec, romanOf(it.i), r.x + r.w / 2, r.y + pad * 0.4, top, { ...ec.title, size: Math.min(ec.title.size, top * 0.6), weight: 700, color: ink });
  const q = { x: r.x + pad, y: r.y + top, w: r.w - pad * 2, h: r.h - top - bottom - pad * 0.5 };
  artWindow(ec, q, it, 'arch');
  const g = ec.g; g.save(); g.strokeStyle = withAlpha(ink, 0.6); g.lineWidth = 1; g.strokeRect(r.x + pad * 0.5, r.y + pad * 0.5, r.w - pad, r.h - pad); g.restore();
  centered(ec, it.name, r.x + r.w / 2, r.y + r.h - bottom - pad * 0.2, bottom, { ...ec.title, size: Math.min(ec.title.size, bottom * 0.55), weight: 800, color: ink }, r.w - pad * 2);
}

/** 圆龛人像（Civ6 伟人）：小型大写抬头（副题 = 职业 / 时代，样本有时；人名）、圆形凹龛里的骨白浮雕半身像 + 前景道具（卡的符号）、底部一行效果 */
function medallionCard(ec: ElCtx, r: Rect, it: CardItem) {
  const pad = Math.max(4, r.w * 0.08), ko: TextOpts = { ...ec.small, size: Math.max(8, Math.min(ec.small.size, r.h * 0.06)) * TEXT_K.k, spacing: 0.12, color: ec.muted, fixedSize: true };
  const kick = [it.sub ?? '', it.name].filter(Boolean);
  let y = r.y + pad * 0.6;
  kick.forEach((s, j) => { const o = j === 1 ? { ...ko, weight: 800, color: ec.heading, size: ko.size * 1.2 } : ko; centered(ec, j === 1 ? s : s.toUpperCase(), r.x + r.w / 2, y, LH(ec, o, 1.25), o, r.w - pad * 2); y += LH(ec, o, 1.25); });
  const rad = Math.min(r.w * 0.34, (r.h - (y - r.y)) * 0.32), cx = r.x + r.w / 2, cy = y + pad * 0.3 + rad;
  medallion(ec, cx, cy, rad, it.glyph);
  if (it.desc) {
    const lines = wrapLines(ec.tx, plainText(it.desc), r.w - pad * 2, { ...ec.base, ...ec.small }).slice(0, 3), lh = LH(ec, ec.small);
    let ty = cy + rad + pad * 0.5;
    for (const l of lines) { if (ty + lh > r.y + r.h - pad * 0.3) break; centered(ec, l, cx, ty, lh, { ...ec.small, color: ec.text }); ty += lh; }
  }
}
/** 圆形凹龛 + 骨白浮雕半身像 + 前景道具（圆龛卡与卡内子件 medallion 共用） */
export function medallion(ec: ElCtx, cx: number, cy: number, rad: number, prop: string) {
  const g = ec.g;
  g.save();
  const gr = g.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
  gr.addColorStop(0, '#5a5a5e'); gr.addColorStop(1, '#232327');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
  g.strokeStyle = withAlpha('#d9cfb4', 0.85); g.lineWidth = Math.max(1, rad * 0.06); g.stroke();
  g.beginPath(); g.arc(cx, cy, rad * 0.92, 0, Math.PI * 2); g.clip();
  // 浮雕：骨白头像 + 肩，左上受光（亮边）右下暗
  g.fillStyle = '#e6ddc8'; g.beginPath(); g.arc(cx, cy - rad * 0.18, rad * 0.32, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx, cy + rad * 0.72, rad * 0.62, rad * 0.5, 0, Math.PI, Math.PI * 2); g.fill();
  g.fillStyle = withAlpha('#000', 0.18); g.beginPath(); g.arc(cx + rad * 0.08, cy - rad * 0.14, rad * 0.3, -Math.PI * 0.2, Math.PI * 0.8); g.fill();
  g.restore();
  // 前景道具：压在凹龛下沿
  icon(ec, prop, cx + rad * 0.5, cy + rad * 0.62, rad * 0.55, '#f2c14e');
}

/** 肖像竖卡（Disco 技能）：整幅肖像（剪影占位）+ 底部窄名条（白字）+ 右下白方块黑数字 */
function portraitCard(ec: ElCtx, r: Rect, it: CardItem) {
  const g = ec.g;
  artWindow(ec, inset(r, 2 * ec.k), it, 'box', lineColor(ec, it.line ?? it.i) ?? undefined);
  g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); g.fillStyle = withAlpha('#000', 0.42);
  g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h * 0.9, r.w * 0.42, r.h * 0.3, 0, Math.PI, Math.PI * 2); g.fill(); g.restore();
  const bh = Math.max(LH(ec, ec.small), r.h * 0.14), vs = Math.min(r.w * 0.3, bh * 1.2);
  g.fillStyle = withAlpha('#000', 0.72); g.fillRect(r.x, r.y + r.h - bh, r.w, bh);
  const no = fit(ec, it.name.toUpperCase(), r.w - vs - 8 * ec.k, { ...ec.small, weight: 700, color: '#fff', outline: undefined, shadow: undefined });
  T(ec, it.name.toUpperCase(), r.x + 4 * ec.k, r.y + r.h - bh, bh, no);
  const v = it.value ?? String(1 + (it.i % 6));
  g.fillStyle = '#f4f1ea'; g.fillRect(r.x + r.w - vs, r.y + r.h - vs, vs, vs);
  centeredNum(ec, v, r.x + r.w - vs / 2, r.y + r.h - vs, vs, { ...ec.title, size: vs * 0.62, weight: 900, color: '#111', fixedSize: true, outline: undefined, shadow: undefined });
}

/** 符箓：黄纸、两道朱红细框、名字朱红竖排、底部一方红印 */
function talismanCard(ec: ElCtx, r: Rect, it: CardItem) {
  const g = ec.g, red = '#b8322a', pad = Math.max(3, r.w * 0.08);
  g.save(); g.strokeStyle = red; g.lineWidth = 1.5; g.strokeRect(r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2); g.lineWidth = 0.8; g.strokeRect(r.x + pad * 1.6, r.y + pad * 1.6, r.w - pad * 3.2, r.h - pad * 3.2); g.restore();
  const chars = [...plainText(it.name)].slice(0, 5), seal = Math.min(r.w * 0.36, r.h * 0.16), avail = r.h - pad * 4 - seal - pad;
  const size = Math.min(r.w * 0.42, avail / Math.max(1, chars.length) / 1.1), o: TextOpts = { ...ec.title, size, weight: 900, color: red, fixedSize: true, outline: undefined, shadow: undefined };
  chars.forEach((c, j) => T(ec, c, r.x + r.w / 2 - W(ec, c, o) / 2, r.y + pad * 2 + j * size * 1.1, size * 1.1, o));
  const sx = r.x + r.w / 2 - seal / 2, sy = r.y + r.h - pad * 2 - seal;
  g.fillStyle = red; g.fillRect(sx, sy, seal, seal);
  icon(ec, it.glyph, sx + seal / 2, sy + seal / 2, seal * 0.6, '#e9c46a');
}

/** 名牌 + 属性表：顶部名条，下面两三行「属性 + 细条」（属性取卡的说明拆出的数字，没有时按序号演示） */
function statCard(ec: ElCtx, r: Rect, it: CardItem) {
  const pad = Math.max(4, r.w * 0.08), nh = Math.max(LH(ec, ec.title), r.h * 0.16), g = ec.g;
  g.fillStyle = withAlpha(ec.accent, 0.85); g.fillRect(r.x, r.y, r.w, nh);
  centered(ec, it.name, r.x + r.w / 2, r.y, nh, { ...ec.title, size: Math.min(ec.title.size, nh * 0.6), color: onColorOf(ec.accent, faceOf(ec)), outline: undefined, shadow: undefined }, r.w - pad * 2);
  artWindow(ec, { x: r.x + pad, y: r.y + nh + pad * 0.5, w: r.w - pad * 2, h: r.h * 0.34 }, it);
  const labels = ['攻击', '生命', '速度'], lh = Math.max(LH(ec, ec.small), r.h * 0.09);
  let y = r.y + nh + pad + r.h * 0.34;
  labels.forEach((l, j) => {
    if (y + lh > r.y + r.h - pad * 0.3) return;
    const v = 0.35 + (((it.i + 1) * (j + 3) * 37) % 60) / 100;
    T(ec, l, r.x + pad, y, lh, { ...ec.small, color: ec.text });
    const bx = r.x + pad + W(ec, '攻击', ec.small) + 6 * ec.k, bw = r.x + r.w - pad - bx;
    g.fillStyle = withAlpha(ec.text, 0.18); g.fillRect(bx, y + lh / 2 - 2, bw, 4); g.fillStyle = ec.good; g.fillRect(bx, y + lh / 2 - 2, bw * v, 4);
    y += lh;
  });
}

/** 球员卡：左上大号评分 + 位置小字、插画窗、底部名条 */
function playerCard(ec: ElCtx, r: Rect, it: CardItem) {
  const pad = Math.max(4, r.w * 0.08), s = Math.min(r.w, r.h);
  artWindow(ec, { x: r.x + pad, y: r.y + pad, w: r.w - pad * 2, h: r.h * 0.66 }, it);
  const v = it.value ?? String(78 + ((it.i * 7) % 17));
  const vo: TextOpts = { ...ec.title, size: s * 0.22, weight: 900, color: '#fff', fixedSize: true, outline: { color: 'rgba(0,0,0,0.6)', width: Math.max(1, s * 0.015) } };
  drawNumber(ec, v, r.x + pad * 1.4, r.y + pad, s * 0.26, vo);
  if (it.sub) T(ec, it.sub, r.x + pad * 1.4, r.y + pad + s * 0.24, s * 0.14, { ...ec.small, size: s * 0.09, weight: 800, color: '#fff', fixedSize: true });
  const bh = r.y + r.h - (r.y + pad + r.h * 0.66);
  centered(ec, it.name, r.x + r.w / 2, r.y + r.h - bh, bh, { ...ec.title, size: Math.min(ec.title.size, bh * 0.5), weight: 800 }, r.w - pad * 2);
}

/* ---------------- 卡内组合（M12b-69） ---------------- */

/** 卡内子件（cmp.cardParts，有序多选，按 @card → @元素 → 全局、选过才算；悬浮提示按 @tooltip → @元素）：空 = 不用子件栈（版式自己的内容） */
export function cardPartsOf(e: ElCtx, part = 'card'): string[] {
  const ep = e.part(part), k = [`cmp.cardParts@${part}`, ...e.scope.map((t) => `cmp.cardParts@${t}`), 'cmp.cardParts'].find((x) => e.r.has(x) && chosen(ep, x));
  return k ? e.r.list(k).filter((x) => (FIELD_KINDS as readonly string[]).includes(x)) : [];
}
/** 卡下要留多高（子件 actionBelow 画在卡外下方：Balatro 盲注卡下的「跳过 + 标签」），没有时 0 */
export function cardBelowH(e: ElCtx, w: number): number {
  return cardPartsOf(e).includes('actionBelow') ? measureField(e.part('card'), 'actionBelow', w) + 4 * e.k : 0;
}
/** 盲注卡的演示状态字（已跳过 / 下一桌） */
const BLIND_WAIT = ['已跳过', '下一桌'];
/**
 * 子件的数据（样本取当前包：盲注 hud.blinds、选中物的属性、价格与货币、队伍、费用……；没有的按序号演示）。
 * Civ6 伟人卡 = [kicker, medallion, iconDesc, progressTable, priceChips, button]；Cyberpunk 数据卡 = [kicker, fieldPair, amountBar]；
 * Balatro 盲注卡 = [actionTop, nameplate, art, valueTarget, actionBelow]；ITB 整备 = [kicker, art, powerCells]
 */
export function fieldDataOf(e: ElCtx, it: CardItem, kind: string): FieldData {
  const bl = DATA.blinds?.[it.i % (DATA.blinds?.length || 1)], res = DATA.res, type = it.type ?? demoType(it.i);
  switch (kind) {
    case 'kicker': return { lines: [it.sub ?? TYPE_WORD[type] ?? type, it.name] };
    case 'nameplate': return { text: bl?.[0] ?? it.name, color: bl?.[3] ?? lineColor(e, it.line ?? it.i) ?? e.accent };
    case 'iconDesc': return { glyph: it.glyph, text: it.desc ?? '', color: lineColor(e, it.line ?? it.i) ?? e.accent };
    case 'fieldPair': return { pairs: DATA.selection.stats.slice(0, 2).map(([n, v]) => [n, String(Math.round(v * 100))] as [string, string]) };
    case 'amountBar': return { text: `${res[0][0]} ${DATA.price}`, color: e.bad };
    case 'progressTable': return { title: '进度', rows: DATA.party.slice(0, 2).map(([n, v]) => [n, `${Math.round(v * 40)}/40`] as [string, string]) };
    case 'priceChips': return { chips: res.slice(0, 2).map(([gl], j) => [gl, String((it.i + 1) * 120 + j * 40)] as [string, string]), color: e.accent };
    case 'valueTarget': return { targetLabel: '至少得分', target: String(bl?.[1] ?? (it.i + 1) * 300), reward: '$'.repeat(bl?.[2] ?? 3 + it.i) };
    case 'actionTop': return it.current === false ? { text: BLIND_WAIT[Math.min(1, it.i)], active: false } : { text: '选择', active: true };
    case 'actionBelow': return { text: '跳过', glyph: '✦', color: lineColor(e, it.line ?? it.i) ?? e.accent };
    case 'powerCells': return { cells: [[1 + (it.i % 3), 3], [it.i % 2, 2]], color: e.accent };
    case 'categoryChip': return { text: TYPE_WORD[type] ?? type, color: lineColor(e, it.line ?? it.i) ?? e.accent };
    case 'button': return { text: '详情' };
    default: return {};
  }
}
/**
 * 卡内子件栈（§3 的 cardSections(e, r, item, fields)）：按 parts 的顺序从上往下排，固定字段按 measureField 量高，插画 / 圆龛平分剩下的高（flexH 给了时用它）；
 * actionBelow 画在卡外下方（调用方用 cardBelowH 留地方）。返回画出的矩形（含卡下那块）
 */
/**
 * 卡内子件栈的排位（cardSections 画、test-knowledge 量）：返回每个要画的子件 [名字, 矩形, 数据]。
 * B7 审查修复 ⑰：先定放得下哪些——固定字段的高加间距超过卡内高时，先省插画 / 圆龛（它们本来就只分剩余的高），再从后往前省固定字段，
 * 剩下的每个都整块落在卡内（原来只看字段顶边，起点在卡里的固定字段整块画到卡下沿以外，压到下一行或卡下的次级动作）
 */
export function sectionsLayout(ec: ElCtx, r: Rect, it: CardItem, parts: string[], flexH?: number): [string, Rect, FieldData][] {
  const p = Math.max(3, Math.min(r.w, r.h) * 0.05), inner = { x: r.x + p, y: r.y + p, w: r.w - p * 2, h: r.h - p * 2 }, gap = p * 0.6;
  const inside0 = parts.filter((k) => k !== 'actionBelow');
  const fixed0 = new Map(inside0.map((k) => [k, FLEX_FIELDS.has(k) ? 0 : measureField(ec, k, inner.w, fieldDataOf(ec, it, k))]));
  const need = (ks: string[]) => ks.reduce((a, k) => a + (fixed0.get(k) ?? 0) + (FLEX_FIELDS.has(k) ? flexH ?? 0 : 0), 0) + gap * Math.max(0, ks.length - 1);
  const keep = inside0.slice();
  while (keep.length && need(keep) > inner.h + 0.5) {
    const fi = keep.map((k) => FLEX_FIELDS.has(k)).lastIndexOf(true);
    keep.splice(fi >= 0 ? fi : keep.length - 1, 1);
  }
  const nFlex = keep.filter((k) => FLEX_FIELDS.has(k)).length;
  const rest = Math.max(0, inner.h - keep.reduce((a, k) => a + (fixed0.get(k) ?? 0), 0) - gap * Math.max(0, keep.length - 1));
  const fh = flexH ?? (nFlex ? rest / nFlex : 0);
  const out: [string, Rect, FieldData][] = [];
  let y = inner.y;
  for (const k of keep) {
    const h = FLEX_FIELDS.has(k) ? fh : fixed0.get(k) ?? 0;
    if (y + h > inner.y + inner.h + 0.5) break;
    out.push([k, { x: inner.x, y, w: inner.w, h }, fieldDataOf(ec, it, k)]);
    y += h + gap;
  }
  return out;
}
export function cardSections(ec: ElCtx, r: Rect, it: CardItem, parts: string[], flexH?: number): Rect {
  for (const [k, q, d] of sectionsLayout(ec, r, it, parts, flexH)) {
    if (k === 'art') { if (q.h > 4) artWindow(ec, q, it, 'box', lineColor(ec, it.line ?? it.i) ?? undefined); }
    else if (k === 'medallion') { if (q.h > 8) medallion(ec, q.x + q.w / 2, q.y + q.h / 2, Math.min(q.w, q.h) * 0.46, it.glyph); }
    else drawField(ec, k, q, d);
  }
  let bottom = r.y + r.h;
  if (parts.includes('actionBelow')) { const q = { x: r.x, y: r.y + r.h + 4 * ec.k, w: r.w, h: measureField(ec, 'actionBelow', r.w) }; drawField(ec, 'actionBelow', q, fieldDataOf(ec, it, 'actionBelow')); bottom = q.y + q.h; }
  return { x: r.x, y: r.y, w: r.w, h: Math.max(r.h, bottom - r.y) };
}
/** 卡内子件栈要多高（悬浮提示按内容定高用）：固定字段 + 每个插画 / 圆龛 flexH */
export function sectionsHeight(ec: ElCtx, w: number, it: CardItem, parts: string[], flexH: number): number {
  const p = Math.max(3, w * 0.05), inside = parts.filter((k) => k !== 'actionBelow');
  return p * 2 + inside.reduce((a, k) => a + (FLEX_FIELDS.has(k) ? flexH : measureField(ec, k, w - p * 2, fieldDataOf(ec, it, k))), 0) + p * 0.6 * Math.max(0, inside.length - 1);
}

/**
 * 手牌的第 i 张（M12b-12）：内容包写了 hud.hand 时按它（多了循环取），否则用三选一卡的样本（screens.draft：符号 / 名字 / 说明）+ 演示的费用、类型、点数、花色；
 * glyph = 原来那张图标牌的符号（iconCard 照旧画它）
 */
export function handCard(i: number, glyph: string): CardItem {
  const h = DATA.hand;
  if (h?.length) { const [g, name, desc, cost, type, rank, suit, rarity, edition] = h[i % h.length]; return { i, glyph: g, name, desc, cost: String(cost), type, rank, suit, rarity, edition, playable: cost <= 3, affordable: cost <= 3 }; }
  // 包里没写手牌（hud.hand，24 个包里只有卡牌构筑包写了）时的退路（终期审查修复 ②：原来按 3 条三选一样本循环、符号用调用方的技能符号、类型按序号演示——
  // 名字重复、符号与名字对不上、回血卡写成「攻击」）：先取三选一样本（draft），用完了接天赋样本（talents，当「能力」牌），两样都用完才循环；
  // 符号一律用样本自己的（glyph 参数只在样本没写符号时用），类型按说明猜（handType）
  const pool = handPool(), [g, name, desc, type] = pool[i % pool.length];
  return { i, glyph: g || glyph, name, desc, cost: String(i % 3), type, rarity: [0, 1, 0, 2, 0, 3, 1, 4][i % 8] };
}
/** 手牌的退路样本（handCard）：三选一（draft）→ 天赋（talents），同名的只留一张 */
function handPool(): [string, string, string, string][] {
  const out: [string, string, string, string][] = [], seen = new Set<string>();
  for (const [g, name, desc] of pack().screens.draft) if (!seen.has(name)) { seen.add(name); out.push([g, name, desc, handType(desc)]); }
  for (const t of samplesFor('talents')) if (!seen.has(t[1])) { seen.add(t[1]); out.push([t[0], t[1], t[2], 'power']); }
  return out.length ? out : [['✦', '', '', 'attack']];
}
/** 退路手牌的类型（攻击 / 技能 / 能力）按说明猜：回复 / 格挡 / 护盾类 = 技能，冷却 / 上限 / 百分比 / 每层这类常驻加成 = 能力，其余 = 攻击 */
function handType(desc: string): string {
  const s = plainText(desc);
  if (/回复|恢复|格挡|护盾|回血|气血/.test(s)) return 'skill';
  if (/冷却|上限|%|每层|持续/.test(s)) return 'power';
  return 'attack';
}
/** 卡行 / 网格 / 奖励的一张：[符号, 名字, 说明] 一类的样本行 + 序号（费用 / 类型 / 点数按序号演示） */
export const rowCard = (i: number, glyph: string, name: string, desc = '', extra: Partial<CardItem> = {}): CardItem => ({ i, glyph, name, desc, cost: String(1 + (i % 3)), type: demoType(i), ...extra });

/** 程序卡背（牌堆 el.piles、翻牌揭示 mo.reveal = flip 没有素材时）：深色底 + 双线框 + 中间一枚菱形纹章；color = 主色 */
export function drawCardBack(ec: ElCtx, r: Rect, color: string) {
  const g = ec.g, s = Math.min(r.w, r.h), d = Math.max(2, s * 0.08);
  drawBox(g, r, { bg: { solid: mix(color, '#000', 0.45) }, radius: s * 0.08, border: { width: Math.max(1, s * 0.03), color: mix(color, '#fff', 0.35) } }, ec.pal);
  g.save(); g.strokeStyle = withAlpha(mix(color, '#fff', 0.5), 0.8); g.lineWidth = 1; g.strokeRect(r.x + d, r.y + d, r.w - d * 2, r.h - d * 2);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, h = s * 0.28; g.fillStyle = mix(color, '#fff', 0.2);
  g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + h * 0.7, cy); g.lineTo(cx, cy + h); g.lineTo(cx - h * 0.7, cy); g.closePath(); g.fill(); g.restore();
}
