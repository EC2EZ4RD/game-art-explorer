/*
 * 展示用字（M12b-54）：只收展示用字的中文字族（fontList.ts 里 charset = display 的：站酷快乐体 GAE Comic CJK、得意黑 GAE Condensed CJK）该收哪些字。
 * 做法：用不出像素的 Canvas 替身把界面按「展示字体 = 窄体、展示范围 = 全部角色（标题 / 名牌 / 菜单词 / 数字 / 按钮）」画一遍，
 * 记下画字（fillText / strokeText）时字体栈里有展示字族的那些字——就是展示角色实际会画到的字（标题、名牌、横幅、通知、菜单词、按钮、数字……）。
 * 字体换成哪一款不改变画哪些字，所以两款展示字体共用一份字表（窄体扫一遍就够；勒索信逐字换字族，不走展示字族）。
 * 扫的范围（24 个内容包都扫；约 1.5 万屏，十秒上下）：
 *   新皮肤 darkHairline：全部控件展示（带模拟事件：飘字、回血、拾取、升级横幅）、31 个品类布局、63 个界面模板、每个元素的每种形态（只放这一个元素）、
 *     改字的条件 × 全部控件展示（cnt.tone / stage / textLength / dataState / density、ctx.timeModel、cnt.subtype = combat / callout、外语原文），
 *     内容包变体里写到的语气（texts 的 when.tone，且在 cnt.tone 词表里）与 cnt.density = 4 × 63 个界面模板；
 *   旧皮肤 flat：全部控件展示、63 个界面模板（旧皮肤的模板构图另一条路）。
 *   不扫的：与界面模板自己的子功能相冲突的 cnt.subtype 覆盖（例如商城模板 + 战斗子功能）、勒索信。
 * fonts-subset.ts 用它做 display 字表（src/assets/fonts/display-charset.txt）；check-content.ts 用它核对字表有没有漏字——
 * 漏了的字在浏览器里会落到栈里的下一个字体（黑体），同一行半句两种字，所以必须报出来、重跑 fonts-subset。
 */
import '../src/dims/index';
import { defaultValues } from '../src/dims/registry';
import { resolveUi } from '../src/hud/sys/resolve';
import { buildTheme } from '../src/hud/sys/theme';
import { unitKOf } from '../src/hud/sys/device';
import { scenePaletteOf } from '../src/hud/sys/scenePalette';
import { presetsOf, SPEC } from '../src/hud/sys/spec';
import { composeLayers } from '../src/hud/compose/layers';
import { drawSimOverlays } from '../src/hud/compose/simfx';
import { drawOps } from '../src/hud/compose/screen';
import { setSim, simulate, type SimEvent } from '../src/hud/sim';
import { ORN, PSEUDO, TEXT_K, setPaintScale } from '../src/hud/paint';
import { GENERIC, packFor, PACK_IDS, PACKS, setPack } from '../src/hud/content';
import { DISPLAY_EXTRA, LATIN_CHARS } from '../src/hud/fontList';
import { setWorld } from '../src/hud/world';
import type { TextVariant } from '../src/hud/content/types';
import type { Values } from '../src/dims/types';

/** 扫描用的展示字族（窄体的中文；两款展示字体共用一份字表） */
const MARK = 'GAE Condensed CJK';
/** 展示范围：全部角色（elements/core.ts 的 displayFor） */
export const ALL_SCOPE = ['title', 'nameplate', 'menuItem', 'numerals', 'button'];
/** 模拟事件（飘字、回血、拾取、升级横幅在 t = 0.5 s 时都还在显示） */
const EVENTS: SimEvent[] = [{ kind: 'enter', at: 0 }, { kind: 'lowHp', at: 0.2 }, { kind: 'hit', at: 0.3 }, { kind: 'heal', at: 0.35 }, { kind: 'pickup', at: 0.4 }, { kind: 'levelUp', at: 0.45 }];

/** 没登记的方法（moveTo、fillRect、drawImage……）一律空操作：放在原型上；登记过的属性 / 方法是自有属性 */
const NOOP_PROTO = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? () => undefined : undefined) });
const mul = (m: number[], n: number[]) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
/** 不出像素的 Canvas 替身：量字按「中文 1em、其它 0.56em」（与快照工具同一口径）；画字时把（字体栈, 字串）交给 onText */
function mockCanvas(onText: (font: string, s: string) => void, w = 960, h = 540): CanvasRenderingContext2D {
  let mat = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const canvas: Record<string, unknown> = { width: w, height: h };
  const ctx: Record<string, unknown> = Object.assign(Object.create(NOOP_PROTO) as object, {
    canvas, font: '10px sans-serif', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, textAlign: 'start', textBaseline: 'alphabetic', letterSpacing: '0px', filter: 'none', globalCompositeOperation: 'source-over',
    shadowColor: 'rgba(0, 0, 0, 0)', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, lineCap: 'butt', lineJoin: 'miter', imageSmoothingEnabled: true, direction: 'ltr',
    measureText(t: string) {
      const m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font)); const px = m ? Number(m[1]) : 10;
      let ww = 0; for (const ch of String(t)) ww += /[\u2e80-\uffff]/.test(ch) ? px : px * 0.56;
      return { width: ww, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.3 };
    },
    fillText(t: string) { onText(String(ctx.font), String(t)); },
    strokeText(t: string) { onText(String(ctx.font), String(t)); },
    getTransform: () => ({ a: mat[0], b: mat[1], c: mat[2], d: mat[3], e: mat[4], f: mat[5] }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createConicGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({ setTransform() {} }),
    getImageData: (_x: number, _y: number, ww: number, hh: number) => ({ data: new Uint8ClampedArray(Math.max(4, ww * hh * 4)), width: ww, height: hh }),
    getLineDash: () => [], isPointInPath: () => false, isPointInStroke: () => false,
    save() { stack.push(mat); }, restore() { mat = stack.pop() ?? mat; },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { mat = [a, b, c, d, e, f]; },
    resetTransform() { mat = [1, 0, 0, 1, 0, 0]; },
    transform(a: number, b: number, c: number, d: number, e: number, f: number) { mat = mul(mat, [a, b, c, d, e, f]); },
    translate(x: number, y: number) { mat = mul(mat, [1, 0, 0, 1, x, y]); },
    scale(x: number, y: number) { mat = mul(mat, [x, 0, 0, y, 0, 0]); },
    rotate(r: number) { const c = Math.cos(r), s = Math.sin(r); mat = mul(mat, [c, s, -s, c, 0, 0]); },
  });
  canvas.getContext = () => ctx;
  return ctx as unknown as CanvasRenderingContext2D;
}

export interface DisplaySweep {
  /** 展示角色画到的字（含 ASCII；不含空白与变体选择符） */
  chars: Set<string>;
  /** 每个字第一次出现在哪一屏（「包|皮肤|画面[|参数=值]」，报漏字时用） */
  where: Map<string, string>;
  /** 扫了几屏 */
  configs: number;
  /** 画出错的屏（不该有） */
  errors: string[];
}

const optionsOf = (id: string) => SPEC.groups.flatMap((g) => g.params).find((p) => p.id === id)?.options?.map((o) => String(o.value)).filter((x) => x !== 'auto') ?? [];

/** 内容包（含 GENERIC）的示例文字变体里写到的语气，且在 cnt.tone 词表里（不在词表里的取不到） */
function variantTones(): string[] {
  const out = new Set<string>(), ok = new Set(optionsOf('cnt.tone'));
  for (const texts of [GENERIC.texts, ...[...PACKS.values()].map((p) => p.texts ?? {})]) {
    for (const vs of Object.values(texts) as (TextVariant<unknown>[] | undefined)[]) for (const v of vs ?? []) for (const t of [v.when?.tone ?? []].flat()) if (ok.has(t)) out.add(t);
  }
  return [...out].sort();
}

/** 扫描的配置：[标签, 参数] */
function sweepConfigs(scope: string[]): [string, Values][] {
  const base = defaultValues();
  const disp: Values = { 'typ.display.family': 'condensed', ...(scope.length ? { 'typ.display.scope': scope.join(',') } : {}) };
  // 元素形态：el.<元素>.form / caption / subject / slotContent 的每个取值（只放这一个元素，比整屏展示快）
  const forms: [string, string][] = [];
  for (const g of SPEC.groups) for (const p of g.params) {
    if (!/^el\.[a-zA-Z]+\.(form|caption|subject|slotContent)$/.test(p.id)) continue;
    for (const o of p.options ?? []) if (o.value !== 'auto') forms.push([p.id, String(o.value)]);
  }
  // 改字的条件：texts.ts 的 textFor 按界面组 / 阶段 / 语气取变体；数据状态、密度、回合制、外语原文改画哪几条
  const conds: [string, string | boolean][] = [
    ...['cnt.tone', 'cnt.stage', 'cnt.textLength', 'cnt.dataState', 'ctx.timeModel', 'cnt.density'].flatMap((k) => optionsOf(k).map((x): [string, string] => [k, x])),
    ['cnt.subtype', 'combat'], ['cnt.subtype', 'callout'], ['el.subtitle.untranslated', true],
  ];
  // 界面模板 × 条件：变体里写到的语气、最大密度（世界地图的地名、服务器列表随密度加行）
  const cross: [string, string][] = [...variantTones().map((t): [string, string] => ['cnt.tone', t]), ['cnt.density', '4']];
  const layouts = presetsOf('layout').map((p) => p.id), screens = presetsOf('screen').map((p) => p.id);
  const out: [string, Values][] = [];
  for (const pk of PACK_IDS) {
    // 新皮肤：全部条件
    const v0: Values = { ...base, ...disp, 'hud.style': 'darkHairline', 'cnt.pack': pk };
    const tag = (s: string) => `${pk}|darkHairline|${s}`;
    out.push([tag('showcase'), { ...v0, 'uip.layout': 'layout.showcase' }]);
    for (const l of layouts) out.push([tag(l), { ...v0, 'uip.layout': l }]);
    for (const s of screens) out.push([tag(s), { ...v0, 'uip.screen': s }]);
    for (const [k, x] of forms) out.push([tag(`showcase|${k}=${x}`), { ...v0, 'uip.layout': 'layout.showcase', 'cnt.elements': k.split('.').slice(0, 2).join('.'), [k]: x }]);
    for (const [k, x] of conds) out.push([tag(`showcase|${k}=${x}`), { ...v0, 'uip.layout': 'layout.showcase', [k]: x }]);
    for (const [k, x] of cross) for (const s of screens) out.push([tag(`${s}|${k}=${x}`), { ...v0, 'uip.screen': s, [k]: x }]);
    // 旧皮肤：模板构图走另一条路
    const v1: Values = { ...base, ...disp, 'hud.style': 'flat', 'cnt.pack': pk };
    out.push([`${pk}|flat|showcase`, { ...v1, 'uip.layout': 'layout.showcase' }]);
    for (const s of screens) out.push([`${pk}|flat|${s}`, { ...v1, 'uip.screen': s }]);
  }
  return out;
}

/**
 * 把界面按展示字体 = 窄体画一遍，收展示角色画到的字。scope = 展示范围（默认全部角色）；onString = 每段展示字串的回调（调试用）；keep = 只扫标签对得上的屏（调试用）
 */
export function displaySweep(scope: string[] = ALL_SCOPE, onString?: (tag: string, s: string) => void, keep?: (tag: string) => boolean): DisplaySweep {
  const chars = new Set<string>(), where = new Map<string, string>(), errors: string[] = [];
  let tag = '';
  const onText = (font: string, s: string) => {
    if (!font.includes(MARK)) return;
    onString?.(tag, s);
    for (const ch of s) if (!/\s/.test(ch) && !/[\ufe00-\ufe0f]/.test(ch)) { chars.add(ch); if (!where.has(ch)) where.set(ch, tag); }
  };
  const gl = globalThis as Record<string, unknown>;
  const hadDoc = 'document' in gl, doc0 = gl.document;
  if (!hadDoc) gl.document = { createElement: () => mockCanvas(onText, 64, 64).canvas, fonts: { add() {} } };
  const list = sweepConfigs(scope).filter(([t]) => !keep || keep(t));
  try {
    for (const [t, v] of list) {
      tag = t;
      try {
        const r = resolveUi(v);
        const th = buildTheme(r, scenePaletteOf(v), String(v['hud.style'] ?? ''));
        const R0 = { x: 0, y: 0, w: 960, h: 540 };
        const uk = unitKOf(r, R0);
        th.unitK = uk;
        const R = { x: 0, y: 0, w: R0.w / uk, h: R0.h / uk };
        const ctx = mockCanvas(onText), m = mockCanvas(onText, 480, 270);
        if (uk !== 1) ctx.setTransform(uk, 0, 0, uk, 0, 0);
        setWorld(null); setPaintScale(uk, 1);
        const sim = simulate(0.5, EVENTS, r);
        setSim(sim); setPack(packFor(r));
        PSEUDO.pct = 0; TEXT_K.k = th.textK;
        ORN.frame = R; ORN.where = 'hud';
        const d = { ctx, m, blur: 0, full: R };
        composeLayers(d, R, th);
        drawSimOverlays(d, R, th, sim);
        drawOps(d, R, th);
      } catch (e) {
        errors.push(`${t}: ${(e as Error).message}`);
      }
    }
  } finally {
    if (!hadDoc) delete gl.document; else gl.document = doc0;
    setWorld(null); setPaintScale(1, 1); PSEUDO.pct = 0; TEXT_K.k = 1; ORN.frame = null; ORN.where = 'hud';
  }
  return { chars, where, configs: list.length, errors };
}

/**
 * 展示字表（fonts-subset.ts 写进 display-charset.txt、check-content.ts 拿它比对）：展示角色画到的字 + 全角标点保底，去掉拉丁字符
 * （展示栈里拉丁字族排在中文展示字族前面，拉丁字符轮不到它）
 */
/** cjk = 其中的汉字个数（不含全角标点与符号） */
export function displayCharset(): { text: string; cjk: number; configs: number; errors: string[]; sweep: DisplaySweep } {
  const sweep = displaySweep();
  const latin = new Set(LATIN_CHARS);
  const text = [...new Set([...sweep.chars, ...DISPLAY_EXTRA])].filter((c) => !latin.has(c)).sort().join('');
  return { text, cjk: [...text].filter((c) => /[\u3400-\u9fff\uf900-\ufaff]/.test(c)).length, configs: sweep.configs, errors: sweep.errors, sweep };
}
