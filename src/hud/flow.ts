import type { Values } from '../dims/types';
import { HUD_SIM, replayHud, type SimEvent, type SimKind } from './sim';

/*
 * 流程演示（docs/ui-hud-plan.md M9b）：一段流程 = 几屏界面模板按时间串起来，每一屏有自己的阶段（cnt.stage：入口 / 确认 / 揭示演出 / 结果……）。
 *   和 M5b 的事件演示一样是 HUD 时钟的纯函数：同一时刻两次同步截图逐字节相同，逐帧条带可以直接录。
 *   每一屏：界面模板（null = 局内 HUD）、阶段、这一屏额外改的参数、这一屏里发生的事件（相对这一屏开始的秒数），
 *   以及演示动作——focus（高亮第几个条目）、press（结尾时点一下主按钮）、cursor（画手指 / 光标移过去）。
 * 揭示方式（mo.reveal）、先预告稀有度（mo.revealTease）、奖励演出强度（mo.reward）、转场（mo.transition）、继续提示（ix.continueCue）、
 * 跳过（ix.skip）、确认机制（ix.confirm）都在画的时候读参数，所以同一段流程换参数就能对比不同做法。
 */

export interface FlowStage {
  label: string;
  dur: number;
  screen: string | null;
  stage?: string;
  set?: Values;
  events?: [SimKind, number][];
  focus?: number;
  press?: boolean;
  cursor?: boolean;
  /** 确认阶段的提示文字 */
  ask?: string;
}

export const FLOWS: Record<string, FlowStage[]> = {
  gacha: [
    { label: '入口', dur: 1.4, screen: 'tpl.gachaEntry', stage: 'entry', press: true, cursor: true },
    { label: '确认消耗', dur: 1.1, screen: 'tpl.gachaEntry', stage: 'confirm', ask: '消耗 ◆1600 进行 10 次祈愿？', press: true },
    { label: '揭示演出', dur: 2.6, screen: 'tpl.gachaResult', stage: 'ceremony' },
    { label: '结果', dur: 1.6, screen: 'tpl.gachaResult', stage: 'result' },
  ],
  levelUp: [
    { label: '局内', dur: 1.0, screen: null, events: [['pickup', 0.1]] },
    { label: '升级演出', dur: 1.4, screen: 'tpl.levelup', stage: 'ceremony' },
    { label: '结果', dur: 1.2, screen: 'tpl.levelup', stage: 'result' },
    { label: '回到局内', dur: 0.8, screen: null },
  ],
  draft: [
    { label: '局内', dur: 0.6, screen: null, events: [['hit', 0.1]] },
    { label: '三选一出现', dur: 1.1, screen: 'tpl.draft3', stage: 'entry' },
    { label: '选择', dur: 0.9, screen: 'tpl.draft3', stage: 'main', focus: 1, cursor: true },
    { label: '确认', dur: 0.6, screen: 'tpl.draft3', stage: 'confirm', focus: 1, press: true },
    { label: '回到局内', dur: 1.0, screen: null, events: [['pickup', 0.05]] },
  ],
  purchase: [
    { label: '商城', dur: 1.0, screen: 'tpl.mall', stage: 'main' },
    { label: '选中商品', dur: 0.9, screen: 'tpl.mall', stage: 'main', focus: 1, cursor: true, set: { 'lay.detail': 'transient' } },
    { label: '二次确认', dur: 1.1, screen: 'tpl.mall', stage: 'confirm', focus: 1, ask: '确定花费 ¥30 购买「月光礼盒」？', press: true },
    { label: '获得演出', dur: 1.6, screen: 'tpl.reward', stage: 'ceremony' },
    { label: '结果', dur: 1.0, screen: 'tpl.reward', stage: 'result' },
  ],
  login: [
    { label: '登录', dur: 1.2, screen: 'tpl.login', stage: 'entry', press: true, cursor: true },
    { label: '选服', dur: 1.0, screen: 'tpl.server', stage: 'main', focus: 5, cursor: true, press: true },
    { label: '读取', dur: 1.4, screen: 'tpl.loading', stage: 'waiting' },
    { label: '主界面', dur: 1.2, screen: 'tpl.lobby', stage: 'main', events: [['enter', 0]] },
  ],
  dialogue: [
    { label: '对话逐字', dur: 1.8, screen: 'tpl.npc', stage: 'main', events: [['dialog', 0]] },
    { label: '选择回答', dur: 0.9, screen: 'tpl.npc', stage: 'main', focus: 1, cursor: true, press: true },
    { label: '下一句', dur: 1.4, screen: 'tpl.npc', stage: 'main', events: [['dialog', 0]] },
  ],
  build: [
    { label: '选建筑', dur: 0.9, screen: 'tpl.build', stage: 'entry', focus: 2, cursor: true },
    { label: '幽灵预览', dur: 1.2, screen: 'tpl.build', stage: 'main' },
    { label: '确认放置', dur: 0.8, screen: 'tpl.build', stage: 'confirm', press: true },
    { label: '建成', dur: 1.0, screen: null, events: [['pickup', 0.05]] },
  ],
};

export interface FlowNow {
  demo: string;
  i: number;
  s: FlowStage;
  /** 这一屏里的进度 0~1 与秒数 */
  p: number;
  t: number;
  total: number;
}

export const flowTotal = (demo: string) => (FLOWS[demo] ?? []).reduce((a, s) => a + s.dur, 0);

export function flowAt(demo: string, t: number): FlowNow | null {
  const list = FLOWS[demo];
  if (!list) return null;
  const total = flowTotal(demo);
  // 播完停在最后一屏的最后一刻
  let acc = 0;
  const tt = Math.max(0, Math.min(t, total - 1e-3));
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (tt < acc + s.dur) return { demo, i, s, t: tt - acc, p: (tt - acc) / s.dur, total };
    acc += s.dur;
  }
  return null;
}

/** 流程里各屏的事件，换算成绝对时刻（只取已经开始的屏） */
export function flowEvents(demo: string): SimEvent[] {
  const out: SimEvent[] = [];
  let acc = 0;
  for (const s of FLOWS[demo] ?? []) {
    for (const [kind, at] of s.events ?? []) out.push({ kind, at: acc + at });
    acc += s.dur;
  }
  return out;
}

/** 这一刻的界面参数覆盖：模板选择器 + 阶段 + 这一屏额外改的参数 */
export function flowValues(fn: FlowNow, screenKey: string): Values {
  return { [screenKey]: fn.s.screen ?? 'auto', 'cnt.stage': fn.s.stage ?? 'main', ...(fn.s.set ?? {}) };
}

/**
 * 这一刻 HUD 实际用的参数（流程演示时把当前这一屏盖上去）。同一段内返回同一个对象，resolveUi 的单项缓存能命中；
 * 引擎烘小地图等 HudSystem 之外要读参数的地方也用它，与 HUD 看到的一致。
 */
let ovIn: Values | null = null, ovKey = '', ovOut: Values | null = null;
export function hudValues(v: Values, clock: number, screenKey: string): { v: Values; fn: FlowNow | null } {
  const demo = FLOW_PLAY.demo;
  const fn = demo ? flowAt(demo, clock) : null;
  if (!fn || !demo) return { v, fn: null };
  const key = `${demo}|${fn.i}|${screenKey}`;
  if (ovIn !== v || ovKey !== key || !ovOut) { ovIn = v; ovKey = key; ovOut = { ...v, ...flowValues(fn, screenKey) }; }
  return { v: ovOut, fn };
}

/* 当前帧的流程状态（HudSystem 每次重画前设置） */
let CUR: FlowNow | null = null;
export const flowNow = () => CUR;
export const setFlow = (f: FlowNow | null) => { CUR = f; };

/** 正在播放的流程（界面按钮 / QA 写，HudSystem 读） */
export const FLOW_PLAY: { demo: string | null } = { demo: null };
export function playFlow(demo: string) {
  FLOW_PLAY.demo = FLOWS[demo] ? demo : null;
  HUD_SIM.events = [];
  HUD_SIM.resetTo = 0;
}
export function stopFlow() { FLOW_PLAY.demo = null; }

/**
 * 播放一段流程演示（chk.demo）：有流程脚本的（M9b）按界面串起来播，否则只放事件（M5b）。
 * 动效页（MotionBar）、原则对比演示条、风格图谱的"套用"共用这一个，免得各写一份、互相 import 绕圈。
 */
export function playDemoScript(demo: string) {
  if (!demo || demo === 'none' || demo === 'auto') return;
  if (FLOWS[demo]) playFlow(demo);
  else { stopFlow(); replayHud(demo); }
}
