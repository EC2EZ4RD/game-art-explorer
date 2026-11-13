import { RECIPE_MAP } from '../../content/recipes';
import { baseKeyOf, demoRunnable, demoSides, IS_DEV, isToolKey, peekUiKnowledge, rebaseUi, sceneVariantValues, type KDemo, type RawParams } from '../../content/uiKnowledge';
import { defaultValues, getParam, isUiKey, isViewKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import type { Diag } from '../../engine/post/Pipeline';
import { playDemoScript } from '../../hud/flow';
import { fireHud } from '../../hud/sim';
import { uiKeyLabel } from '../../hud/sys/register';
import type { Origin } from '../../state/layers';
import { useStore, type HudDemo, type Snapshot } from '../../state/store';

/*
 * 原则对比演示的动作（G2，docs/t1-tool-knowledge.md §7 B2）：开始 / 换画面 / 换场景 / 眯眼开关 / 结束。
 *   开始：画面配方（demo.art）与场景变体（demo.scene）和"UI 改成 B 侧"并成一步 patch——撤销一次就回到演示前；
 *         A 侧（算出来的一整套值）写进 A 槽，打开 UI A/B（左 A、右 B，分界回到对半），再登记 hudDemo 让视口演示条显示。
 *         要眯眼看的演示（数据里 chk.squint = true，或"看哪里"提到眯眼）打开诊断"眯眼"并含 UI——chk.squint 本身只是个记号，真正的模糊是诊断视图；
 *         base 里写了流程演示（chk.demo）的就播一遍，免得零 HUD / 事件型的演示开始时画面是空的。
 *   结束（endDemo）：
 *     restore = 回到演示前（默认；一步 patch，可撤销）；
 *     carry   = 回到演示前，只把这个演示的关键几项（focusKeys）带回自己的 UI——"学到的东西用在自己的风格上"；
 *     keep    = 保留右侧 B 的 UI 值；演示打开的检查工具（chk.*：色盲模拟、视距预览、触控 / 安全区叠加……）一并关掉；
 *     undone  = 用户 Ctrl+Z 撤掉了演示那一步：值已经回去了，只还原 A 槽、A/B 开关与诊断视图。
 *   所有结束方式都把演示前的 A 槽、A/B 开关、诊断视图（眯眼）原样还回去。
 *   restore / carry 连同演示前的来源（prevOrigin）一起恢复（整合修复 X#5，轨道 A 代改：原来 patch + setBaseRecipe / setBaseStyle，
 *     从名作 / 风格图谱 / 案例近似开始演示后「回到演示前」，来源变成借来的配方，借来的画面值显示成画面改动）。
 * 归属：B2。只调用 store 的现成动作，不读写 React。
 */

/** 一次演示会话：记住演示前的状态，结束时还回去（连续换几个演示也只记第一次之前的） */
interface Session {
  prevA: Snapshot | null;
  prevAB: boolean;
  prevValues: Values;
  /** 演示前的来源（结束时 restore / carry 原样放回：场景、配方、皮肤、各层的值） */
  prevOrigin: Origin;
  prevDiag: Diag;
  prevHudInDiag: boolean;
  /** 眯眼是演示打开的（结束时还原诊断视图） */
  squintOn: boolean;
  /** 演示写进 A 槽的那一份（用户中途自己"设为 A"时就不再还原 A 槽） */
  slot: Snapshot | null;
  /** 演示那一步在撤销栈里留下的记录（演示前的快照）：它被撤销掉 = 演示被撤销 */
  undoRef: Snapshot | null;
  unsub: (() => void) | null;
}
let session: Session | null = null;

/** 画面配方的整套画面值（与 applyRecipe 同口径：从默认值出发，保留场景 / 种子 / 品类）；只取画面键，UI 交给演示 */
function artValues(id: string, cur: Values): Values | null {
  const r = RECIPE_MAP.get(id);
  if (!r) return null;
  const full: Values = { ...defaultValues(), ...r.values, 'game.scene': cur['game.scene'], 'game.seed': cur['game.seed'], 'game.genre': cur['game.genre'] };
  const out: Values = {};
  for (const [k, v] of Object.entries(full)) if (v !== undefined && !isUiKey(k)) out[k] = v;
  return out;
}

/** 场景变体里哪一个和当前画面一致（-1 = 都不是） */
export function sceneIndex(scenes: HudDemo['scenes'], v: Values): number {
  return scenes.findIndex((s) => Object.entries(s.set).every(([k, x]) => v[k] === x));
}

export const recipeName = (id: string) => RECIPE_MAP.get(id)?.name ?? id;

/** 正文里写的画面配方 id（watercolor、soft-pbr……）换成「配方名」；只换这个 demo 自己的配方 */
export function withRecipeNames(text: string, art: string[] | null | undefined): string {
  let t = text;
  for (const id of art ?? []) {
    // 配方 id 只有小写字母、数字和连字符；前后不能紧挨着别的字母 / 连字符（免得 noir 换进别的词里）
    if (!RECIPE_MAP.has(id) || !/^[a-z0-9-]+$/.test(id)) continue;
    t = t.replace(new RegExp(`(?<![\\w-])${id}(?![\\w-])`, 'g'), `「${recipeName(id)}」`);
  }
  return t;
}

/** demo 里能用的画面配方（recipes.ts 里找得到的） */
const demoArt = (d: KDemo) => (d.art ?? []).filter((id) => RECIPE_MAP.has(id));

/** 三份原始取值（base / a / b）里有没有某个键取了"开着"的值 */
const sidesHave = (d: KDemo, key: string) => [d.base, d.a, d.b].some((x: RawParams | undefined) => {
  const v = x?.[key];
  return v !== undefined && v !== null && v !== false && v !== 'off' && v !== 'auto' && v !== '';
});
/** 派生的单变量版：取原 demo（它的"看哪里"才是给人看的说明） */
const parentDemo = (d: KDemo): KDemo | undefined => (d.derivedFrom ? peekUiKnowledge()?.demoById.get(d.derivedFrom)?.demo : undefined);
/** 这个演示要不要眯眼看：数据里 chk.squint = true，或"看哪里"（单变量版看原 demo 的）提到眯眼 */
export const demoWantsSquint = (d: KDemo) => sidesHave(d, 'chk.squint') || /眯眼/.test(parentDemo(d)?.lookAt ?? d.lookAt ?? '');
/** 这个演示用不用色盲模拟：数据里写了 chk.cvd，或"看哪里"提到色盲 */
const demoWantsCvd = (d: KDemo) => sidesHave(d, 'chk.cvd') || /色盲/.test(parentDemo(d)?.lookAt ?? d.lookAt ?? '');

/** 按钮的说明：点了会改什么（给 title 用） */
export function demoChangeNote(d: KDemo): string {
  if (!demoRunnable(d)) return '这条只有文字说明，探索台暂时画不出来';
  const parts = ['左半屏画 A、右半屏画 B（UI A/B）', '右栏的 UI 参数改成 B 侧'];
  const art = demoArt(d);
  if (art.length) parts.push(`画面换成「${recipeName(art[0])}」${art.length > 1 ? `（演示条上还能切换另外 ${art.length - 1} 套）` : ''}`);
  if (d.scene?.length) parts.push(`场景：${d.scene[0].label}${d.scene.length > 1 ? `（可切换 ${d.scene.map((s) => s.label).join(' / ')}）` : ''}`);
  if (d.play === 'enter') parts.push('循环播放入场动画');
  if (demoWantsSquint(d)) parts.push('打开诊断「眯眼」（结束时关掉）');
  if (Object.keys(d.base ?? {}).some((k) => isToolKey(k) && k !== 'chk.demo' && k !== 'chk.squint')) parts.push('演示期间开着检查工具（色盲模拟、视距预览……），结束时关掉');
  return `${parts.join('；')}。一步可撤销；结束时默认回到演示前，也可以保留 B，或只把关键几项带回自己的 UI。`;
}

/** 打开 / 关掉演示用的眯眼（诊断视图"眯眼"+ 含 UI）；关掉时回到演示前的诊断视图 */
export function setDemoSquint(on: boolean) {
  const st = useStore.getState();
  if (on) {
    if (session) session.squintOn = true;
    st.setDiag('squint');
    st.setHudInDiag(true);
    return;
  }
  const prevDiag = session?.prevDiag ?? 'none';
  st.setDiag(prevDiag === 'squint' ? 'none' : prevDiag);
  st.setHudInDiag(session?.prevHudInDiag ?? false);
  if (session) session.squintOn = false;
}

/** A 槽与当前值的画面部分（非 UI 键）是不是不一样了 */
function artDiffers(a: Values, v: Values): boolean {
  for (const k of new Set([...Object.keys(a), ...Object.keys(v)])) if (!isUiKey(k) && a[k] !== v[k]) return true;
  return false;
}

/**
 * 演示期间盯着 store：
 *   演示被 Ctrl+Z 撤掉了（演示前的那条撤销记录被撤销）→ 结束演示，只还原 A 槽、A/B 开关、诊断视图；
 *   画面变了（撤销 / 重做了换画面那一步，或者在别处改了画面）→ A 槽的画面跟着换（场景只有一份，A 侧的 UI 色板按 A 的画面算）。
 */
function watchStore(): () => void {
  return useStore.subscribe((s, p) => {
    if (!session) return;
    if (session.undoRef && s.history !== p.history && !s.history.includes(session.undoRef)) {
      // 撤销栈满了（200 步）把它挤掉了：再也撤不回演示前，不再盯
      if (s.history.length >= p.history.length) session.undoRef = null;
      else { endDemo('undone'); return; }
    }
    if (s.values !== p.values && s.slotA && s.slotA === session.slot && artDiffers(s.slotA.values, s.values)) rebaseA();
  });
}

/** 开始一个演示（owner = 原则 P-… 或品类篇 G-…）；不能演示时返回 false */
export function startDemo(demo: KDemo, owner: string): boolean {
  if (!demoRunnable(demo)) return false;
  const st = useStore.getState();
  // 上一次的会话没正常结束（演示条被别处直接关掉了）：丢掉
  if (session && !st.hudDemo) { session.unsub?.(); session = null; }
  if (!session) {
    session = {
      prevA: st.slotA, prevAB: st.hudABOn, prevValues: st.values, prevOrigin: st.origin,
      prevDiag: st.diag, prevHudInDiag: st.hudInDiag, squintOn: false, slot: null, undoRef: null, unsub: null,
    };
  }

  // 画面与场景：已经是其中之一就不换
  const art = demoArt(demo);
  const scenes = (demo.scene ?? []).map((s) => ({ id: s.id, label: s.label, set: sceneVariantValues(s) }));
  const pre: Values = {};
  let recipe: string | undefined;
  if (art.length && !art.includes(st.baseRecipe ?? '')) {
    const v = artValues(art[0], st.values);
    if (v) { Object.assign(pre, v); recipe = art[0]; }
  }
  if (scenes.length && sceneIndex(scenes, { ...st.values, ...pre }) < 0) Object.assign(pre, scenes[0].set);

  const sides = demoSides(demo, { ...st.values, ...pre });
  if (!sides) return false;
  if (IS_DEV && sides.dropped.length) console.warn(`[原则演示] ${demo.id} 有存不进 Values 的键：`, sides.dropped);
  const histBefore = st.history;
  st.patch({ ...pre, ...sides.patchB.set }, sides.patchB.unset, sides.patchB.label + (recipe ? `（画面：${recipeName(recipe)}）` : ''));
  const hist = useStore.getState().history;
  if (hist !== histBefore && hist.length) session.undoRef = hist[hist.length - 1];
  if (recipe) { st.setBaseRecipe(recipe); st.setBaseStyle(null); }
  session.unsub ??= watchStore();

  const slot: Snapshot = { values: sides.a, label: `A：${demo.title}`, ts: Date.now() };
  session.slot = slot;
  st.setSlotA(slot);
  st.setHudABSplit(0.5);
  st.setHudABOn(true);

  // 眯眼：要眯眼看的演示打开诊断"眯眼"（含 UI）；从眯眼演示换到不用眯眼的演示时关回去
  const squint = demoWantsSquint(demo);
  if (squint) setDemoSquint(true);
  else if (session.squintOn) setDemoSquint(false);

  const parent = parentDemo(demo);
  st.setHudDemo({
    id: demo.id, owner, title: demo.title, lookAt: parent?.lookAt ?? demo.lookAt, kind: demo.kind, focusKeys: demo.focusKeys ?? [], art, scenes, play: demo.play ?? null,
    derived: !!demo.derivedFrom, squint, cvd: demoWantsCvd(demo),
  });
  // 流程演示（chk.demo）：开始时播一遍（零 HUD / 事件型的演示不播什么都看不到）；否则入场演示播一次入场
  const script = sides.b['chk.demo'];
  if (typeof script === 'string' && script !== 'none' && script !== 'auto') playDemoScript(script);
  else if (demo.play === 'enter') fireHud('enter');
  return true;
}

/** 演示途中换了画面：A 槽的画面跟着换（UI 不动） */
function rebaseA() {
  const st = useStore.getState();
  if (!st.slotA) return;
  const slot: Snapshot = { ...st.slotA, values: rebaseUi(st.slotA.values, st.values), ts: Date.now() };
  if (session && session.slot === st.slotA) session.slot = slot;
  st.setSlotA(slot);
}

/** 演示条：换一套画面配方 */
export function switchDemoArt(id: string) {
  const st = useStore.getState();
  const v = artValues(id, st.values);
  if (!v) return;
  st.patch(v, [], `演示画面：${recipeName(id)}`);
  st.setBaseRecipe(id);
  st.setBaseStyle(null);
  rebaseA();
}

/** 演示条：换一个场景变体 */
export function switchDemoScene(i: number) {
  const st = useStore.getState();
  const s = st.hudDemo?.scenes[i];
  if (!s) return;
  st.patch(s.set, [], `演示场景：${s.label}`);
  rebaseA();
}

/** 演示打开着、结束时会关掉的检查工具（chk.*，不含流程演示与眯眼记号）：键 → 现在的取值 */
export function demoTools(v: Values): [string, unknown][] {
  if (!session) return [];
  const prev = session.prevValues;
  return Object.keys(v)
    .filter((k) => isToolKey(k) && k !== 'chk.demo' && k !== 'chk.squint' && v[k] !== prev[k])
    .filter((k) => { const x = v[k]; return x !== undefined && x !== false && x !== 'off' && x !== 'auto' && x !== ''; })
    .map((k) => [k, v[k]]);
}

/** "只带走关键几项"能带走哪些：focusKeys 里不是检查工具的 */
export const carryKeys = (d: HudDemo) => d.focusKeys.filter((k) => !isToolKey(k));

export type EndMode = 'restore' | 'carry' | 'keep' | 'undone';

/** 结束演示（见文件头）；默认 keep（换复刻、家族对比这类"右边整个换掉"的场合用它收尾） */
export function endDemo(mode: EndMode = 'keep') {
  const st = useStore.getState();
  const ses = session;
  session = null;
  ses?.unsub?.();
  if (ses && (mode === 'restore' || mode === 'carry')) {
    const set: Values = { ...ses.prevValues };
    let label = '结束演示：回到演示前';
    if (mode === 'carry' && st.hudDemo) {
      const keys = carryKeys(st.hudDemo);
      for (const k of keys) {
        if (k in st.values) set[k] = st.values[k];
        else delete set[k];
      }
      label = `结束演示：回到演示前，只带走 ${keys.length} 项（${keys.map(keyLabel).join('、')}）`;
    }
    // 值和来源一起回到演示前（一步撤销；'all' = 精确替换，演示带进来的动态键丢掉）；带走的关键几项在演示前的来源上算普通改动
    st.restore({ values: set, origin: ses.prevOrigin }, label, 'all');
    // 视图键（检查工具：色盲模拟、视距预览……）restore 不动：演示打开的也关回演示前
    const now = useStore.getState().values;
    const vSet: Values = {};
    const vUnset: string[] = [];
    for (const k of new Set([...Object.keys(now), ...Object.keys(ses.prevValues)])) {
      if (!isViewKey(k) || now[k] === ses.prevValues[k]) continue;
      if (k in ses.prevValues) vSet[k] = ses.prevValues[k];
      else vUnset.push(k);
    }
    if (Object.keys(vSet).length || vUnset.length) useStore.getState().patch(vSet, vUnset, label);
  } else if (ses && mode === 'keep') {
    // 保留 B 的 UI 值；检查工具（色盲模拟、视距预览、各种叠加层）回到演示前，免得以为画面坏了
    const set: Values = {};
    const unset: string[] = [];
    for (const k of new Set([...Object.keys(st.values), ...Object.keys(ses.prevValues)])) {
      if (!isToolKey(k) || st.values[k] === ses.prevValues[k]) continue;
      if (k in ses.prevValues) set[k] = ses.prevValues[k];
      else unset.push(k);
    }
    if (Object.keys(set).length || unset.length) st.patch(set, unset, '结束演示：保留 B，演示用的检查工具关掉');
  }
  // 诊断视图：演示打开的眯眼还回去（用户中途自己换了别的诊断就不动）
  if (ses?.squintOn && st.diag === 'squint') { st.setDiag(ses.prevDiag); st.setHudInDiag(ses.prevHudInDiag); }
  if (ses && st.slotA === ses.slot) {
    st.setSlotA(ses.prevA);
    st.setHudABOn(ses.prevAB && !!ses.prevA);
  } else st.setHudABOn(false);
  st.setHudABSplit(0.5);
  st.setHudDemo(null);
}

/* ---------- 显示用的小工具 ---------- */

/** 参数（含覆盖键 / 元素实例键）的中文名 */
export const keyLabel = (key: string) => getParam(key)?.label ?? uiKeyLabel(key) ?? getParam(baseKeyOf(key))?.label ?? key;

const fmtNum = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** 一个取值的中文写法（选项名；多选用顿号；auto = 跟随） */
export function valueLabel(key: string, raw: unknown): string {
  const p = getParam(key) ?? getParam(baseKeyOf(key));
  const one = (x: unknown): string => {
    if (typeof x === 'number') return fmtNum(x);
    const s = String(x);
    if (s === 'auto') return '跟随';
    return p?.options?.find((o) => o.value === s)?.label ?? s;
  };
  if (raw === undefined || raw === null) return '—';
  if (Array.isArray(raw)) return raw.length ? raw.map(one).join('、') : '无';
  if (typeof raw === 'boolean') return raw ? '开' : '关';
  if (raw === '') return '无';
  if (typeof raw === 'string' && p?.kind === 'multi' && raw !== 'auto') return raw.split(',').map(one).join('、');
  if (typeof raw === 'string' && p?.kind === 'toggle') return raw === 'true' ? '开' : raw === 'false' ? '关' : one(raw);
  return one(raw);
}

/** 从 demo 标题拆出两侧的说法（"A vs B"）；单变量版：A = 原来那一侧，B = 只换了几项 */
export function demoSideLabels(title: string, derived: boolean): { a: string; b: string } {
  const t = title.replace(/^单变量版：/, '').replace(/\s*→\s*只切换.*$/, '');
  const m = t.split(/\s*\bvs\b\s*/);
  if (derived) return { a: m[0] || 'A', b: '只换了下面这几项，其余同 A' };
  return m.length >= 2 ? { a: m[0], b: m.slice(1).join(' vs ') } : { a: 'A', b: 'B' };
}

/** 列表与按钮里的 demo 名：派生的单变量版不显示一长串参数 id */
export const demoShortTitle = (d: KDemo) => (d.derivedFrom ? `单变量版（只换 ${d.focusKeys?.length ?? 0} 项）` : d.title);
