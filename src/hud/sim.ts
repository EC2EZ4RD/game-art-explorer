import type { Resolved } from './sys/resolve';
import { packFor } from './content';
import { SKIN_MAP } from './skins';
import { afterSkin } from './sys/theme';

/*
 * HUD 的确定性模拟（docs/ui-hud-plan.md M5b）：UI 上一切会动的东西都是 (时刻 t, 事件列表, 动效参数) 的纯函数。
 *   时钟由引擎推进（冻结 / 同步截图时不动），所以同一参数两次同步截图逐字节相同；UI A/B 两侧共用同一个时钟，动画天然同步。
 * 事件：受击、回血、拾取、升级、冷却、低血量、对话、入场；"演示脚本"（chk.demo）是一串排好时间的事件。
 * 动效参数：mo.valueChange（数值怎么变：瞬间 / 平滑 / 拖尾 / 分段 / 跳数）、mo.enter + mo.duration + mo.easing（入场）、
 *           mo.juice（震屏、飘字放大、闪白强度）、mo.idle（待机：闪光 / 浮动 / 摇摆）、mo.textReveal（逐字）、mo.frameRate（一拍二 / 一拍三）。
 * 按元素的动效（M12a-01，<参数>@el.x）：生命数值怎么变读 mo.valueChange@el.vitals、资源跳数读 @el.resources；飘字放大读 mo.juice@el.feedback；
 *   震屏是整张 UI 平移（全局 mo.juice），写了 mo.juice@el.x 的元素按自己的力度另加一段位移（shakeUnit × (元素力度 − 全局力度)，compose/hud.ts）。
 * 事件文字（拾取、获得、升级、回血）与生命起点读 r 对应的内容包（packFor(r)，r 为 null 时是雪线旅人）——不读全局 pack()：simulate 在 setPack 之前调用，A/B 两侧的 r 也不同。
 * 静帧姿态（M12c-14）：chk.simPose 选一个姿态（低血 / 受击 / 回血 / 拾取 / 升级 / 对话中途 / 入场中途 / 闲置淡出 / Boss 登场 / 节拍重拍）时，
 *   HudSystem 把事件换成姿态的事件、时钟钉在姿态时刻（simPin）；chk.simTime 单独给时 = 把 chk.demo 的演示钉在那一秒。cnt.sampleHp 覆盖内容包的生命起点。
 */

export type SimKind = 'hit' | 'heal' | 'pickup' | 'levelUp' | 'cooldown' | 'lowHp' | 'dialog' | 'enter' | 'open' | 'tally' | 'boss' | 'score' | 'beat' | 'draw';
export interface SimEvent { kind: SimKind; at: number }

export interface Floater { text: string; color: string; x: number; y: number; alpha: number; scale: number; anchor: 'target' | 'player' }
export interface SimState {
  t: number;
  hp: number;
  /** 拖尾（受击后慢慢追上的那截） */
  hpGhost: number;
  /** 回血 / 受击时血条闪一下（0~1） */
  barFlash: number;
  barFlashColor: string;
  resources: number;
  /** 技能 0 的冷却剩余（0~1） */
  cd0: number;
  /** 整屏闪白（0~1）与震屏（像素） */
  flash: number;
  shake: [number, number];
  /** 每单位力度的震屏位移（shake = shakeUnit × 全局 mo.juice）：写了 mo.juice@el.x 的元素按它换算自己的震动 */
  shakeUnit: [number, number];
  /** 低血量：脉冲（0~1）与暗角强度 */
  lowPulse: number;
  vignette: number;
  floaters: Floater[];
  /** 横幅（升级）进度：0 未出现，0~1 进场，1 停留，>1 退场 */
  banner: { text: string; p: number } | null;
  toast: { text: string; p: number } | null;
  /** 对话逐字：可见字数比例（1 = 全显） */
  reveal: number;
  /** 整体入场进度（1 = 已就位） */
  enter: number;
  /** 待机相位（秒） */
  idle: number;
  /** 有东西在动：HudSystem 据此每帧重画 */
  active: boolean;
  /** 距最近一次事件的秒数（没有事件 = Infinity）：情境显现 / 闲置淡出用 */
  sinceEvent: number;
  /** 界面模板的打开进度（open 事件，M12c-14：0 → 1，1 = 已就位；没有事件时 1）：layers.ts 按它从上往下揭开模板 */
  open: number;
  /** 结算计数进度（tally 事件：0 → 1，没有事件时 1）：drawNumber 按它从 0 数到目标值，越靠下的数越晚开始 */
  tally: number;
  /** Boss 登场进度（boss 事件：0 → 1，没有事件时 1）：名牌先出、条再从空涨满（el.threat = bossBar） */
  bossIntro: number;
  /** 节拍脉冲（beat 事件：重拍时 1，约 0.3 秒衰减到 0；没有事件时 0）：屏上的元素（背景信息除外）随它鼓一下 */
  beat: number;
  /** 已发到手里的牌（draw 事件：整数部分 = 已发完的张数，小数 = 正在飞进来的那张的进度；没有事件时 Infinity = 全部在手） */
  drawn: number;
}

/** 雪线旅人的生命起点（模拟实际从 packFor(r).hud.hp 起跳，雪线旅人正好是它） */
export const BASE_HP = 0.72;

/** 低血线：目标血量低于它时心跳脉冲 + 暗角；lowHp 事件只在样本血量本身低于它时掉到样本血量（R4 审查修复 ①） */
const LOW_HP = 0.25;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const EASE: Record<string, (x: number) => number> = {
  linear: (x) => x,
  easeOut: (x) => 1 - (1 - x) ** 3,
  overshoot: (x) => { const c = 1.70158, d = x - 1; return 1 + (c + 1) * d * d * d + c * d * d; },
  spring: (x) => 1 - Math.exp(-6 * x) * Math.cos(x * 12),
};

/** 演示脚本（chk.demo）：事件与相对时间 */
export const DEMOS: Record<string, [SimKind, number][]> = {
  combatBeat: [['enter', 0], ['hit', 0.6], ['cooldown', 0.9], ['hit', 1.5], ['lowHp', 2.4], ['heal', 3.4], ['pickup', 4.2]],
  levelUp: [['pickup', 0.2], ['levelUp', 0.8]],
  dialogue: [['dialog', 0.2]],
  login: [['enter', 0]],
  gacha: [['enter', 0], ['levelUp', 0.8]],
  build: [['pickup', 0.3], ['pickup', 0.9]],
  purchase: [['pickup', 0.3]],
  draft: [['enter', 0]],
  // M12c-14 新增：打开界面（模板从上往下揭开 + 对话逐字）、结算逐项计数、Boss 登场（名牌 → 条）、逐张计分（筹码 / 倍率飘字）、节拍器（120 BPM，8 拍）、发牌（5 张）
  openScreen: [['open', 0], ['enter', 0], ['dialog', 0.3]],
  resultsTally: [['open', 0], ['tally', 0.4]],
  bossIntro: [['boss', 0]],
  scoringSequence: [['score', 0.3], ['score', 0.7], ['score', 1.1], ['score', 1.5], ['score', 1.9], ['tally', 2.3]],
  beat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [SimKind, number] => ['beat', t]),
  drawCards: [['draw', 0], ['draw', 0.2], ['draw', 0.4], ['draw', 0.6], ['draw', 0.8]],
};

/** 模板打开的时长（秒）：mo.duration 的两倍、至少 0.4 */
const openLen = (dur: number) => Math.max(0.4, dur * 2);
const durOf = (r: Resolved | null) => { const v = r ? r.num('mo.duration', 0.25) : 0.25; return Math.max(0.05, Number.isFinite(v) ? v : 0.25); };

/**
 * 静帧姿态（chk.simPose，M12c-14）：ev = 注入的事件（相对时刻），t = 钉住的时刻（秒）。
 * 低血 = 掉到 16%（写了低于 25% 的 cnt.sampleHp 时掉到它）之后 1 秒（暗角 + 心跳脉冲）；受击 = 0.1 秒（闪白、震屏、伤害数字、血条闪）；回血 0.3 秒；拾取 0.6 秒（提示条在）；升级 1 秒（横幅停留）；
 * 对话中途 = 逐字显示到一半（mo.textReveal 非 instant 时）；入场中途 = 入场动画与模板打开都在一半；闲置淡出 = 没有事件、时钟 10 秒（情境显现 / 闲置淡出的元素淡出）；
 * Boss 登场 = 名牌出来、条涨到一半；节拍重拍 = 重拍之后 0.02 秒
 */
export const SIM_POSES: Record<string, { ev: (dur: number) => [SimKind, number][]; t: (dur: number) => number }> = {
  lowHp: { ev: () => [['lowHp', 0]], t: () => 1 },
  hit: { ev: () => [['hit', 0]], t: () => 0.1 },
  heal: { ev: () => [['heal', 0]], t: () => 0.3 },
  pickup: { ev: () => [['pickup', 0]], t: () => 0.6 },
  levelUp: { ev: () => [['levelUp', 0]], t: () => 1 },
  dialogueMid: { ev: () => [['dialog', 0]], t: () => 0.8 },
  enterMid: { ev: (d) => [['enter', 0], ['open', d * 0.5 - openLen(d) * 0.5]], t: (d) => d * 0.5 },
  idleFaded: { ev: () => [], t: () => 10 },
  bossIntro: { ev: () => [['boss', 0]], t: () => 0.9 },
  beatDown: { ev: () => [['beat', 0]], t: () => 0.02 },
};

/**
 * 截图钉帧（M12c-14）：chk.simPose 选了姿态 → 姿态的事件 + 姿态时刻（chk.simTime 给了时换成那一秒）；只给了 chk.simTime → chk.demo 的演示事件钉在那一秒
 * （没选演示时没有事件，只钉时钟：背景流动、待机动画停在那一帧）。都没给 → null（照常跟引擎时钟走）
 */
export function simPin(r: Resolved | null): { t: number; events: SimEvent[] } | null {
  if (!r) return null;
  const pose = r.str('chk.simPose', 'none'), tk = r.num('chk.simTime', NaN), d = durOf(r);
  const tt = Number.isFinite(tk) ? Math.max(0, Math.min(10, tk)) : undefined;
  const P = SIM_POSES[pose];
  if (P) return { t: tt ?? P.t(d), events: P.ev(d).map(([kind, at]) => ({ kind, at })) };
  if (tt === undefined) return null;
  const demo = r.str('chk.demo', 'none');
  return { t: tt, events: (DEMOS[demo] ?? []).map(([kind, at]) => ({ kind, at })) };
}

export function simulate(tRaw: number, events: SimEvent[], r: Resolved | null): SimState {
  const mo = (k: string, d: string) => { const v = r?.str(k, d) ?? d; return v === 'auto' || v === '' ? d : v; };
  const num = (k: string, d: number) => { const v = r ? r.num(k, d) : d; return Number.isFinite(v) ? v : d; };
  // 按元素读（<参数>@el.x，没有时就是全局值）
  const moAt = (k: string, el: string, d: string) => { const v = r?.at(k, el); return v === undefined || v === null || v === 'auto' || v === '' ? d : String(v); };
  const numAt = (k: string, el: string, d: number) => { const v = Number(r?.at(k, el) ?? d); return Number.isFinite(v) ? v : d; };
  const fps = mo('mo.frameRate', 'smooth');
  // 一拍二 / 一拍三：动画时间按 12 / 8 帧每秒取整（逐格动画感）
  const t = fps === 'onTwos' ? Math.floor(tRaw * 12) / 12 : fps === 'onThrees' ? Math.floor(tRaw * 8) / 8 : tRaw;
  const juice = clamp01(num('mo.juice', 0.3));
  const dur = Math.max(0.05, num('mo.duration', 0.25));
  const ease = EASE[mo('mo.easing', 'easeOut')] ?? EASE.easeOut;
  // 通知停留时长（el.notify.dwell，M12b-20，doc16 G-notify-cap）：显式给了时拾取提示 / 升级横幅按它停（秒，横幅另加进出场），没给时原来的 2.2 / 2.6 秒；
  // 旧皮肤只认皮肤之后的层（B5 审查修复 ⑥，与元素里的 elChosen 同口径；主题的皮肤 id 就是原始值里的 hud.style，HudSystem 同一个值传给 buildTheme）
  const dwSrc = r?.src('el.notify.dwell')?.layer, legacy = !!r && SKIN_MAP.has(String(r.art['hud.style'] ?? ''));
  const dw = dwSrc && dwSrc !== 'default' && dwSrc !== 'fallback' && dwSrc !== 'ruleDefault' && (!legacy || afterSkin(r!, 'el.notify.dwell')) ? num('el.notify.dwell', NaN) : NaN;
  const toastLife = Number.isFinite(dw) && dw > 0 ? dw : 2.2, bannerLife = Number.isFinite(dw) && dw > 0 ? dw + dur * 2 : 2.6;
  // 生命条与资源各按自己的元素读数值变化方式（没写 @el.x 时 = 全局 mo.valueChange）
  const valueMode = moAt('mo.valueChange', 'el.vitals', mo('mo.valueChange', 'smooth'));
  const resMode = moAt('mo.valueChange', 'el.resources', mo('mo.valueChange', 'smooth'));
  // 减少动态效果（a11y.reduceMotion）时按元素写的力度也归零
  const calm = !!r?.bool('a11y.reduceMotion');
  const juiceFloat = calm ? 0 : clamp01(numAt('mo.juice', 'el.feedback', juice));
  const idleMode = mo('mo.idle', 'none');
  // 样本血量（cnt.sampleHp，M12c-14）：给了时盖过内容包的生命起点（钉住低血态的阈值变色 / 暗角，hades#13）
  const shp = r ? r.num('cnt.sampleHp', NaN) : NaN;
  const pk = packFor(r), ev = pk.events, hp0 = Number.isFinite(shp) ? clamp01(shp) : pk.hud.hp;

  const s: SimState = {
    t, hp: hp0, hpGhost: hp0, barFlash: 0, barFlashColor: '#fff', resources: 0, cd0: 0, flash: 0, shake: [0, 0], shakeUnit: [0, 0],
    lowPulse: 0, vignette: 0, floaters: [], banner: null, toast: null, reveal: 1, enter: 1, idle: idleMode === 'none' ? 0 : t, active: idleMode !== 'none',
    sinceEvent: Infinity, open: 1, tally: 1, bossIntro: 1, beat: 0, drawn: Infinity,
  };
  let target = hp0, nScore = 0, nDraw = 0;
  const allDraw = events.filter((e) => e.kind === 'draw').length;
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const dt = t - e.at;
    if (dt < 0) continue;
    s.sinceEvent = Math.min(s.sinceEvent, dt);
    const live = (len: number) => dt < len;
    switch (e.kind) {
      case 'hit': {
        const from = target;
        target = Math.max(0.05, target - 0.18);
        // 数值怎么变
        const k = valueMode === 'instant' || valueMode === 'trail' || valueMode === 'segment' ? 1 : ease(clamp01(dt / 0.3));
        s.hp = from + (target - from) * k;
        if (valueMode === 'segment') s.hp = Math.round(s.hp * 10) / 10;
        // 拖尾：停 0.4 秒再用 0.5 秒追上
        s.hpGhost = valueMode === 'trail' ? from + (target - from) * ease(clamp01((dt - 0.4) / 0.5)) : s.hp;
        s.barFlash = Math.max(s.barFlash, clamp01(1 - dt / 0.25));
        s.barFlashColor = '#ffffff';
        s.flash = Math.max(s.flash, juice * 0.55 * clamp01(1 - dt / 0.12));
        const amp = 8 * juice * clamp01(1 - dt / 0.35), unit = 8 * clamp01(1 - dt / 0.35);
        s.shake = [Math.sin(dt * 90) * amp, Math.cos(dt * 77) * amp * 0.6];
        s.shakeUnit = [Math.sin(dt * 90) * unit, Math.cos(dt * 77) * unit * 0.6];
        if (live(1.1)) s.floaters.push({ text: String(Math.round(18 + (e.at * 37) % 20)), color: '#ffd34d', x: (e.at * 53) % 40 - 20, y: -30 * ease(clamp01(dt / 1.1)), alpha: clamp01(1.4 - dt / 0.8), scale: 1 + juiceFloat * 0.7 * clamp01(1 - dt / 0.18), anchor: 'target' });
        if (live(1.2)) s.active = true;
        break;
      }
      case 'heal': {
        const from = target;
        target = Math.min(1, target + 0.3);
        const k = valueMode === 'instant' ? 1 : ease(clamp01(dt / 0.5));
        s.hp = from + (target - from) * k;
        s.hpGhost = s.hp;
        s.barFlash = Math.max(s.barFlash, clamp01(1 - dt / 0.6) * 0.8);
        s.barFlashColor = '#5ef08a';
        if (live(1.2)) s.floaters.push({ text: ev.heal, color: '#5ef08a', x: 0, y: -24 * ease(clamp01(dt / 1.2)), alpha: clamp01(1.4 - dt / 0.9), scale: 1, anchor: 'player' });
        if (live(1.2)) s.active = true;
        break;
      }
      case 'lowHp':
        // 掉到 16%；写了样本血量（cnt.sampleHp）而且它本身是低血（< LOW_HP）时掉到它（R4 · C3，renderer-issues 第 3 组 #9：原来写死 0.16 盖过 sampleHp，低血姿态钉不到别的血量）。
        // R4 审查修复 ①：样本血量不是低血（0.6 / 0.9……）时照旧掉到 16%——原来掉「到」样本血量，低血姿态与 combatBeat 演示的 lowHp 一拍反而把血拉回 0.6，暗角与心跳都不出
        target = Number.isFinite(shp) && shp < LOW_HP ? clamp01(shp) : 0.16;
        s.hp = valueMode === 'instant' ? target : s.hp + (target - s.hp) * ease(clamp01(dt / 0.3));
        s.hpGhost = s.hp;
        break;
      case 'pickup': {
        const n = 3;
        s.resources += resMode === 'countUp' ? Math.round(n * clamp01(dt / 0.6)) : n;
        if (live(1.4)) { s.floaters.push({ text: ev.pickup, color: '#a5f3a1', x: 26, y: -40 * ease(clamp01(dt / 1.4)), alpha: clamp01(1.6 - dt / 0.9), scale: 1, anchor: 'player' }); s.active = true; }
        if (live(toastLife)) s.toast = { text: ev.pickupToast, p: dt / toastLife };
        break;
      }
      case 'levelUp':
        if (live(bannerLife)) { s.banner = { text: ev.levelUp, p: dt < dur ? ease(dt / dur) : dt < bannerLife - dur ? 1 : 1 + (dt - (bannerLife - dur)) / dur }; s.active = true; }
        s.flash = Math.max(s.flash, juice * 0.35 * clamp01(1 - dt / 0.2));
        break;
      case 'cooldown':
        s.cd0 = clamp01(1 - dt / 3);
        if (s.cd0 > 0) s.active = true;
        break;
      case 'dialog':
        s.reveal = mo('mo.textReveal', 'instant') === 'instant' ? 1 : clamp01(dt / 1.6);
        if (s.reveal < 1) s.active = true;
        break;
      case 'enter':
        s.enter = mo('mo.enter', 'cut') === 'cut' ? 1 : clamp01(dt / dur);
        if (s.enter < 1) s.active = true;
        break;
      // M12c-14 的新事件（只有演示脚本 / 静帧姿态会发）
      case 'open':
        s.open = clamp01(dt / openLen(dur));
        if (s.open < 1) s.active = true;
        break;
      case 'tally':
        s.tally = clamp01(dt / 1.8);
        if (s.tally < 1) s.active = true;
        break;
      case 'boss':
        s.bossIntro = clamp01(dt / 1.6);
        if (s.bossIntro < 1) s.active = true;
        break;
      case 'score': {
        // 逐张计分：每张一枚往上飘的「+筹码」（蓝）/「×倍率」（红）交替，横向按张次错开
        const i = nScore++, chip = i % 2 === 0;
        if (live(0.9)) { s.floaters.push({ text: chip ? `+${10 + i * 5}` : `×${2 + i}`, color: chip ? '#4aa3ff' : '#ff5a5a', x: -40 + i * 20, y: -26 * ease(clamp01(dt / 0.9)), alpha: clamp01(1.3 - dt / 0.7), scale: 1 + juiceFloat * 0.6 * clamp01(1 - dt / 0.15), anchor: 'target' }); s.active = true; }
        break;
      }
      case 'beat':
        if (dt < 0.4) { s.beat = Math.max(s.beat, Math.exp(-dt * 10)); s.active = true; }
        break;
      case 'draw': {
        // 发牌：前面的都算发完，这一张按 0.25 秒飞进来
        // 最后一张也落定了 = 整手都在（手牌比发的张数多时，剩下的也一起出现）
        const k = nDraw++, p = clamp01(dt / 0.25);
        s.drawn = k === allDraw - 1 && p >= 1 ? Infinity : k + p;
        if (dt < 0.25) s.active = true;
        break;
      }
    }
  }
  if (target < LOW_HP) {
    // 低血量：心跳脉冲 + 暗角（rel.metaFx 里有受伤暗角时更重）
    s.lowPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.4);
    const meta = r?.list('rel.metaFx') ?? [];
    s.vignette = (meta.includes('hurtVignette') ? 0.7 : 0.35) * (0.75 + 0.25 * s.lowPulse);
    s.active = true;
  }
  return s;
}

/** 入场动画：给一个控件（序号 i，越后越晚）算透明度与位移 */
export function enterXf(s: SimState, mode: string, i: number): { alpha: number; dx: number; dy: number; scale: number } {
  if (s.enter >= 1 || mode === 'cut' || mode === 'auto') return { alpha: 1, dx: 0, dy: 0, scale: 1 };
  const p = clamp01(s.enter * 1.4 - i * 0.12);
  switch (mode) {
    case 'slide': case 'slashIn': return { alpha: p, dx: (1 - p) * -60, dy: 0, scale: 1 };
    case 'pop': return { alpha: p, dx: 0, dy: 0, scale: 0.6 + 0.4 * EASE.overshoot(p) };
    case 'slam': return { alpha: p, dx: 0, dy: 0, scale: 1 + (1 - p) * 0.8 };
    case 'unroll': case 'pageTurn': return { alpha: 1, dx: 0, dy: (1 - p) * -30, scale: Math.max(0.05, p) };
    default: return { alpha: p, dx: 0, dy: 0, scale: 1 };
  }
}

/* ---------------- 当前帧的模拟状态（HudSystem 每次重画前设置，构图与元素读取） ---------------- */

let CUR: SimState = simulate(0, [], null);
export const simNow = () => CUR;
export const setSim = (s: SimState) => { CUR = s; };

/* ---------------- 事件队列与时钟倍率（界面按钮写，引擎读） ---------------- */

export const HUD_SIM: { events: SimEvent[]; scale: number; clock: number; resetTo: number | null } = { events: [], scale: 1, clock: 0, resetTo: null };
/** 在当前时刻触发一个事件 */
export function fireHud(kind: SimKind) { HUD_SIM.events = [...HUD_SIM.events.filter((e) => HUD_SIM.clock - e.at < 10), { kind, at: HUD_SIM.clock }]; }
/** 从 0 重放一段演示（chk.demo） */
export function replayHud(demo: string) {
  HUD_SIM.events = (DEMOS[demo] ?? DEMOS.combatBeat).map(([kind, at]) => ({ kind, at }));
  HUD_SIM.resetTo = 0;
}
export function clearHud() { HUD_SIM.events = []; }
