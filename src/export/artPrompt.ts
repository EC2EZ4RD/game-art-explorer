import { getPalette } from '../content/palettes';
import { RECIPE_MAP, type Recipe } from '../content/recipes';
import { activeState, getParam, num, str } from '../dims/registry';
import type { Values } from '../dims/types';
import { PRESET } from '../hud/sys/spec';
import { describeVisual, forbidden } from './describe';
import { checkPrompt, type CheckResult } from './promptCheck';

/*
 * 复制提示词（轨道 C，docs/workbench-redesign.md §7「复制提示词」）：约 250 字的美术提示词，给出图 AI 或美术外包用。
 *   画面 = 只取当前确实生效的参数（describeVisual）；禁用 = forbidden()；
 *   UI = 配套皮肤的一句话 + 配套 UI 家族的语法（形 / 线 / 面 / 色 / 字 / 饰 / 图标 / 动效 / 版式，取 3–4 轴）；
 *   末尾一行「交付物 / 禁用」。可切英文（按关键参数的取值拼，不翻译中文句子）。内置体检：用提示词体检（promptCheck）再扫一遍。
 * 纯函数，不读 store；UI 家族语法由调用方传入（uiStyleFamilies.json 是懒加载的大文件）。
 */

export type PromptLang = 'zh' | 'en';

export interface UiGrammar { name: string; grammar: Record<string, string> }
export interface ArtPromptInput {
  values: Values;
  recipeId?: string | null;
  /** 配套皮肤预设 id（skin.*）；不给时用当前 hud.style */
  skin?: string | null;
  /** 配套 UI 家族（可选）；必须和 skin 是同一套 UI（deckText.pickFamily），否则名字和语法会互相矛盾 */
  family?: UiGrammar | null;
  lang?: PromptLang;
  /** 没有配方时（风格研究库 / 案例近似的画面）用的名字和一句话说明 */
  name?: string | null;
  summary?: string | null;
}
export interface ArtPromptResult { text: string; chars: number; check: CheckResult; lang: PromptLang }

const GRAMMAR_AXES: [string, string][] = [['shape', '形'], ['line', '线'], ['color', '色'], ['type', '字']];
const len = (s: string) => [...s].length;
/**
 * 一段说明只取第一句（到第一个 ；或 。），去掉括号里的补充。太长时只在小句边界（，、+ 和空格分隔的并列项）处截：
 * 取放得下的最长一串完整小句；连第一个小句都放不下就返回空串（调用方整句不写），
 * 所以不会出现截了半个词、半个数字或半个色值再加「…」的情况。
 */
export function firstClause(s: string, max = 22): string {
  const t = s.split(/[；。;]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim();
  if (len(t) <= max) return t;
  let best = '';
  const re = /[，、,]|\s\+\s|\s和\s/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const head = t.slice(0, m.index).replace(/[\s+、，,]+$/, '').trim();
    if (len(head) <= max) best = head; else break;
  }
  return best;
}
const skinLabel = (id: string | null | undefined) => (id ? PRESET.get(id)?.label?.replace(/（.*?）|\(.*?\)/g, '').split(/[／/]/)[0].trim() ?? id : null);
const skinIdOf = (v: Values) => {
  const val = String(v['hud.style'] ?? '');
  if (!val || val === 'none' || val === 'auto') return null;
  const id = val.startsWith('skin.') ? val : `skin.${val}`;
  return PRESET.has(id) ? id : [...PRESET.values()].find((p) => p.kind === 'skin' && (p as { existing?: string }).existing === val)?.id ?? null;
};

/** 画面那一段：按维度挑生效的描述（不写测试场景本身：地形、树、岛），总长控制在 ~90 字 */
const ZH_SECTIONS: { title: string; max: number }[] = [
  { title: '形状、比例与几何', max: 1 }, { title: '材质、明暗与线条', max: 2 }, { title: '画面媒介', max: 1 }, { title: '色彩、灯光与环境', max: 2 },
];
const SCENE_ONLY = /树|树冠|岛|地形|噪声|起伏|山脊|海|沙滩|雪线|云/;
function visualZh(v: Values, skipMedium: boolean, skip: string[], budget = 90): string {
  const secs = describeVisual(v);
  const picked: string[] = [];
  let used = 0;
  for (const { title, max } of ZH_SECTIONS) {
    if (skipMedium && title === '画面媒介') continue;
    const sec = secs.find((x) => x.title === title);
    let n = 0;
    for (const line of sec?.lines ?? []) {
      if (n >= max) break;
      if (SCENE_ONLY.test(line) || skip.some((x) => x && line.includes(x))) continue;
      const short = firstClause(line, 24);
      if (!short) continue;
      if (used + short.length > budget) break;
      picked.push(short);
      used += short.length + 1;
      n++;
    }
  }
  return picked.join('；');
}
/** 镜头：自己写一句（不用「等距」这个有歧义的词，体检会提醒） */
const ZH_ANGLE: Record<string, string> = { iso: '35° 斜俯视', dimetric: '2:1 二等角俯视', high: '高俯角', top: '正俯视', low: '低机位', side: '侧视' };
const camZh = (v: Values) => `${ZH_ANGLE[str(v, 'camera.angle')] ?? ''}${str(v, 'camera.projection') === 'ortho' ? '正交' : '透视'}镜头${num(v, 'camera.pixelSize') > 1 ? `，${num(v, 'camera.pixelSize')} 倍像素` : ''}`;

const BAN_ZH = '【禁用】';
/** forbidden() 的长句 → 禁用短语 */
const BAN_SHORT: [RegExp, string][] = [
  [/像素化冒充体素/, '用屏幕像素化冒充方块'], [/体素/, '方块体素'], [/ACES|AgX/, '发灰偏色的电影调色'], [/挤出描边|描边外壳/, '描边转角开裂'],
  [/软边渐变穿过色阶/, '软阴影穿过色阶'], [/灰度滤镜/, '单纯灰度滤镜'], [/外轮廓线当作工笔/, '只描外框的假工笔'],
];
const banShort = (x: string) => BAN_SHORT.find(([re]) => re.test(x))?.[1] ?? firstClause(x.replace(/^不要/, ''), 10);
function zh(inp: ArtPromptInput, r: Recipe | undefined): string {
  const v = inp.values;
  const skin = inp.skin ?? skinIdOf(v);
  const pal = getPalette(str(v, 'color.palette'));
  const palLine = pal?.prompt ? firstClause(pal.prompt, 28) : '';
  const out: string[] = [];
  const vis = visualZh(v, !!r, [palLine.slice(0, 6)], 72);
  const name = r ? r.name.replace(/（.*?）/g, '') : inp.name ?? '';
  const sum = firstClause(r?.summary ?? inp.summary ?? '', 26);
  out.push(`【画风】${name ? `「${name}」${sum ? `：${sum}` : ''}。` : ''}${vis ? `${vis}；` : ''}${camZh(v)}。`);
  if (palLine) out.push(`【配色】${palLine}。`);
  if (skin) {
    const p = PRESET.get(skin);
    const g = inp.family?.grammar;
    const axes = g ? GRAMMAR_AXES.map(([k, n]) => [n, g[k] ? firstClause(g[k], 20) : ''] as const).filter(([, x]) => x).slice(0, 3).map(([n, x]) => `${n}：${x}`) : [];
    const desc = p?.desc ? firstClause(p.desc, 16) : '';
    out.push(`【UI】${skinLabel(skin)}${desc ? `（${desc}）` : ''}${axes.length ? `；${axes.join('；')}` : ''}。`);
  }
  const ban = forbidden(v).map(banShort).filter(Boolean);
  out.push(`【交付】16:9 游戏实机画面${skin ? '，含 HUD' : ''}。${BAN_ZH}照片质感、文字水印、乱码字${ban.length ? `、${ban.slice(0, 3).join('、')}` : ''}。`);
  return out.join('\n');
}

/* ---------------- 英文：按关键参数取值拼，不翻译中文句子 ---------------- */

const EN_MEDIUM: Record<string, string> = {
  watercolor: 'watercolor washes with pigment pooling at the edges and paper grain', gouache: 'opaque matte gouache flats', oil: 'oil-paint impasto with form-following brush strokes',
  ink: 'Chinese ink wash with tonal ink levels and empty paper space', gongbi: 'gongbi fine lines under transparent light color', sketch: 'graphite sketch',
  crosshatch: 'pen-and-ink crosshatching', halftone: 'manga halftone screentone in the shadows', woodcut: 'black-and-white woodcut carving marks', posterize: 'posterized flat color',
  riso: 'risograph spot-color overprint with misregistration', stainedGlass: 'stained glass cells with black leading', mosaic: 'mosaic tiles', ascii: 'ASCII characters',
  // 技术补全新加的 9 种媒介（Z1 §5 的文案）
  engraving: 'copperplate engraving with form-following line families', pointillism: 'pointillist dots of pure complementary color',
  ukiyoe: 'ukiyo-e woodblock print with misregistered color blocks and bokashi sky', nianhua: 'Chinese New Year woodblock print with bold black key lines',
  pastel: 'soft pastel strokes on toned paper', crayon: 'waxy crayon scribbles with paper tooth', marker: 'marker rendering with parallel overlapping strokes',
  manuscript: 'illuminated manuscript with gold leaf and vine borders', blackFigure: 'Greek black-figure pottery silhouettes with incised lines',
};
const EN_SHADING: Record<string, (v: Values) => string> = {
  unlit: () => 'unlit flat color', lambert: () => 'soft diffuse shading', halfLambert: () => 'wrapped soft lighting', toonRamp: (v) => `${num(v, 'shading.steps')}-step toon ramp`,
  cel: (v) => `${num(v, 'shading.steps')}-tone cel shading with hard terminators`, gooch: () => 'warm-cool shading', pbr: () => 'physically based materials', hatching: () => 'hatched shading stuck to the objects', matcap: () => 'matcap shading',
};
const EN_ANGLE: Record<string, string> = { iso: '35° three-quarter', dimetric: '2:1 pixel-art dimetric (30°)', high: 'high-angle', top: 'top-down', low: 'low-angle', side: 'side-on' };
const EN_GEOM: Record<string, string> = { faceted: 'faceted low-poly geometry', smooth: 'smooth rounded forms', voxel: 'voxel blocks', wireframe: 'glowing hidden-line wireframe' };
const EN_MATERIAL: Record<string, string> = {
  plastic: 'glossy plastic toy material', clay: 'matte clay with fingerprints', felt: 'fuzzy felt fabric', paper: 'paper texture', ceramic: 'glazed ceramic', metal: 'metal', stone: 'stone', wood: 'wood',
  cloisonne: 'cloisonné enamel with raised gold wire cells', porcelain: 'blue-and-white porcelain with cobalt scroll patterns under clear glaze', lacquer: 'carved red cinnabar lacquer with floral relief',
};
const EN_FOG: Record<string, string> = { distance: 'aerial perspective haze', height: 'low-lying mist', layers: 'layered atmospheric bands' };
const EN_SKY: Record<string, string> = { bands: 'banded flat sky', paper: 'blank paper sky', solid: 'solid-color sky' };
const hourEn = (h: number) => (h < 5 || h >= 21 ? 'night' : h < 8 ? 'dawn' : h < 11 ? 'morning' : h < 15 ? 'midday' : h < 17.5 ? 'afternoon' : h < 19.5 ? 'golden hour' : 'dusk');
const live = (v: Values, id: string) => { const p = getParam(id); return !!p && activeState(p, v) === true; };

function en(inp: ArtPromptInput, r: Recipe | undefined): string {
  const v = inp.values;
  const bits: string[] = [];
  const med = str(v, 'surface.medium');
  if (med !== 'none' && EN_MEDIUM[med] && live(v, 'surface.medium')) bits.push(EN_MEDIUM[med]);
  bits.push(EN_SHADING[str(v, 'shading.model')]?.(v) ?? 'stylized shading');
  bits.push(EN_GEOM[str(v, 'geometry.representation')] ?? '');
  const mat = str(v, 'material.preset');
  if (EN_MATERIAL[mat] && mat !== 'matte' && live(v, 'material.preset')) bits.push(EN_MATERIAL[mat]);
  if (v['lines.outline']) {
    const w = num(v, 'lines.outlineWidth');
    bits.push(`${w >= 3 ? 'bold ' : w < 1.4 ? 'thin ' : ''}${str(v, 'lines.outlineColorMode') === 'black' ? 'black' : 'colored'} outlines`);
  }
  if (str(v, 'lines.edges') !== 'none') bits.push('inner contour lines');
  const px = num(v, 'camera.pixelSize');
  if (px > 1) bits.push(`low-resolution pixel art (${px}x pixels)`);
  if (str(v, 'color.quantize') !== 'off') bits.push('limited color palette');
  if (str(v, 'color.dither') !== 'none') bits.push('ordered dithering');
  if (num(v, 'camera.psx') > 0) bits.push('PS1-style vertex jitter');
  const ortho = str(v, 'camera.projection') === 'ortho';
  bits.push(`${EN_ANGLE[str(v, 'camera.angle')] ?? ''} ${ortho ? 'orthographic' : 'perspective'} camera`.trim());
  if (num(v, 'camera.tiltShift') > 0.25) bits.push('tilt-shift miniature blur');
  if (num(v, 'camera.dof') > 0.2) bits.push('shallow depth of field');
  if (str(v, 'camera.letterbox') === '2.39') bits.push('anamorphic letterbox');
  if (num(v, 'camera.bloom') > 0.5) bits.push('strong bloom glow');
  if (str(v, 'color.grade') === 'tealOrange') bits.push('teal-and-orange grade');
  const fog = str(v, 'atmosphere.fog');
  if (EN_FOG[fog]) bits.push(EN_FOG[fog]);
  const sky = str(v, 'atmosphere.sky');
  if (EN_SKY[sky]) bits.push(EN_SKY[sky]);
  const screen = str(v, 'surface.screen');
  if (screen === 'vhs') bits.push('VHS tape artifacts'); else if (screen === 'crt') bits.push('CRT scanlines'); else if (screen === 'lcd') bits.push('LCD pixel grid');
  const wx = str(v, 'atmosphere.weather');
  if (wx !== 'none') bits.push(wx === 'dust' ? 'floating dust motes' : wx);
  bits.push(`${hourEn(num(v, 'lighting.time'))} light`);
  const sat = num(v, 'color.saturation');
  const palName = str(v, 'color.palette');
  bits.push(`${sat > 1.15 ? 'saturated ' : sat < 0.5 ? 'desaturated ' : ''}${palName.replace(/^sv-/, '').replace(/-/g, ' ')} palette`);
  const head = r ? `${(r.nameEn ?? r.id).replace(/^\w/, (c) => c.toUpperCase())} game art` : 'Stylized game art';
  // 没有配方时（风格研究库的近似画面）只写通用的头：中文风格名不翻译
  const skin = inp.skin ?? skinIdOf(v);
  const ui = skin ? ` UI: ${skin.replace(/^skin\./, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} style HUD.` : '';
  const ban: string[] = ['photo textures', 'watermarks', 'garbled text'];
  if (str(v, 'geometry.representation') !== 'voxel') ban.push('voxel cubes');
  return `${head}: ${bits.filter(Boolean).join(', ')}.${ui}\nDeliver: a 16:9 in-game screenshot${skin ? ' with HUD' : ''}. Avoid: ${ban.join(', ')}.`;
}

/** 生成复制用的美术提示词（中文约 250 字），带体检结果 */
export function artPrompt(inp: ArtPromptInput): ArtPromptResult {
  const lang = inp.lang ?? 'zh';
  const r = inp.recipeId ? RECIPE_MAP.get(inp.recipeId) : undefined;
  const text = lang === 'en' ? en(inp, r) : zh(inp, r);
  // 体检只查「禁用」之前的部分（禁用项里写着 ACES、体素，本来就是要避开的）
  const body = text.split(lang === 'en' ? '\nDeliver:' : BAN_ZH)[0];
  return { text, chars: [...text].length, check: checkPrompt(body), lang };
}
