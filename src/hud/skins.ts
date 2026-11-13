import type { SkinDef, SkinTokens } from './types';

/*
 * 皮肤表。M1 把原来写死在 hud.css 里的 14 种皮肤逐条翻译成数据（原文件与参考图在 docs/legacy-hud/）；
 * M3 再补到 26 种并加覆盖参数。新增皮肤 = 在 SKINS 里加一条。
 */

/* 字体栈：前面是自托管的 GAE 字体（src/hud/fontList.ts，M2），后面保留系统字体作为加载失败时的后备 */
const SYS = '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif';
const SANS = `"GAE Sans", ${SYS}`;
const SERIF = `"GAE Serif", "Songti SC", SimSun, serif`;
const KAI = `"GAE Kai", "STKaiti", KaiTi, serif`;
const PIXEL = `"GAE Pixel", ${SYS}`;

/** 所有皮肤共用的默认值（对应 hud.css 开头的通用规则） */
const BASE: SkinTokens = {
  font: SANS,
  text: '@ink',
  panel: {},
  bar: { height: 12, track: { bg: { solid: 'rgba(0,0,0,0.15)' } }, fill: { bg: { solid: '@good' } } },
  key: {},
  icon: '@accent',
};

const skin = (id: string, survey: string, label: string, desc: string, prompt: string, t: Partial<SkinTokens>): SkinDef => ({
  id, survey, label, desc, prompt,
  tokens: { ...BASE, ...t, bar: { ...BASE.bar, ...t.bar } },
});

export const SKINS: SkinDef[] = [
  skin('neobrutal', 'B1', '新粗野主义', '粗黑边框、硬投影、高饱和纯色块', '新粗野主义（Neo-Brutalism）面板：粗黑描边、错位硬投影、高饱和纯色块、粗体无衬线字', {
    font: `"GAE Grotesk", ${SANS}`,
    text: '#000',
    panel: { bg: { solid: '@paper' }, border: { width: 3, color: '#000' }, shadows: [{ color: '#000', x: 5, y: 5, blur: 0 }] },
    map: { bg: { solid: '@good' } },
    title: { upper: true, spacing: 0.04 }, name: { upper: true, spacing: 0.04 },
    bar: { height: 14, track: { bg: { solid: '#fff' }, border: { width: 2, color: '#000' } }, fill: { bg: { solid: '@accent2' } } },
    key: { bg: { solid: '@accent' }, color: '#fff', border: { width: 2, color: '#000' } },
  }),
  skin('glass', 'B2', '毛玻璃', '半透明模糊背板、细白边', '毛玻璃（Glassmorphism）面板：半透明模糊背板、细白边、柔和阴影', {
    text: '#fff',
    panel: {
      bg: { solid: 'rgba(255,255,255,0.18)' }, backdropBlur: 12, border: { width: 1, color: 'rgba(255,255,255,0.55)' }, radius: 16,
      shadows: [{ color: 'rgba(0,0,0,0.15)', x: 0, y: 8, blur: 30 }],
    },
    map: { circle: true },
    bar: { height: 12, track: { bg: { solid: 'rgba(255,255,255,0.25)' }, radius: 8 }, fill: { bg: { linear: { angle: 90, stops: [[0, '@good'], [1, '@sky']] } } } },
    key: { border: { width: 1, color: 'rgba(255,255,255,0.8)' }, radius: 6 },
  }),
  skin('flat', 'B4', '扁平 Material', '纯色卡片、圆角、轻投影', '扁平化面板：纯色卡片、圆角、轻投影、清晰图标', {
    text: '#222',
    panel: { bg: { solid: '#fff' }, radius: 10, shadows: [{ color: 'rgba(0,0,0,0.18)', x: 0, y: 2, blur: 8 }] },
    map: { bg: { solid: '#e8f1e4' } },
    bar: { height: 12, track: { bg: { solid: '#eee' }, radius: 6 }, fill: { bg: { solid: '@accent' } } },
    key: { bg: { solid: '@sky' }, color: '#fff', radius: 6 },
  }),
  skin('pixel', 'B6', '像素位图', '像素字体、像素边框', '像素风 UI：位图字体、阶梯状像素边框', {
    font: PIXEL,
    textSize: 12,
    text: '@paper',
    panel: { bg: { solid: '@ink' }, border: { width: 4, color: '@paper' }, ring: { width: 4, color: '@ink' } },
    bar: { height: 10, track: { bg: { solid: '#000' }, border: { width: 2, color: '@paper' } }, fill: { bg: { pattern: { kind: 'stripes', fg: '@accent', size: 8, line: 6 } } } },
    key: { bg: { solid: '@paper' }, color: '@ink' },
  }),
  skin('handdrawn', 'B7', '手绘笔记本', '纸面、歪线、手写字', '手绘笔记本风 UI：纸面底、手绘歪线边框、手写体', {
    font: KAI,
    text: '#333',
    panel: {
      bg: { pattern: { kind: 'ruled', bg: '#fffdf4', fg: '#cfe0f0', size: 20, line: 1 } }, border: { width: 2, color: '#333' },
      radius: [{ x: 255, y: 15 }, { x: 15, y: 225 }, { x: 225, y: 15 }, { x: 15, y: 255 }], rotate: -0.6,
    },
    dialog: { rotate: 0.4 },
    bar: { height: 12, track: { border: { width: 2, color: '#333' }, radius: [10, 4, 10, 4] }, fill: { bg: { pattern: { kind: 'diagonal', fg: '@accent', size: 6, line: 3 } } } },
    key: { border: { width: 2, color: '#333' }, circle: true },
  }),
  skin('ink', 'B8', '国风卷轴印章', '宣纸、墨线、朱红印章', '国风 UI：宣纸底、墨线框、朱红印章作强调', {
    font: KAI,
    text: '#1a1918',
    panel: {
      bg: { solid: '#f3efe4' }, sides: { t: { width: 3, color: '#2a2826' }, b: { width: 3, color: '#2a2826' } },
      shadows: [{ color: '#b8a98a', x: 0, y: 2, blur: 0 }],
    },
    map: { circle: true, sides: undefined, border: { width: 3, color: '#2a2826', style: 'double' } },
    title: { color: '#b83a2e' }, name: { color: '#b83a2e' },
    bar: { height: 8, track: { bg: { solid: '#d9d4c7' } }, fill: { bg: { solid: '#2a2826' } } },
    key: { bg: { solid: '#b83a2e' }, color: '#f3efe4', radius: 3, font: SERIF },
  }),
  skin('scifi', 'B9', '科幻 HUD', '青色细线框、切角、扫描线', '科幻 HUD：青色细线框、切角边、扫描线与等宽字', {
    font: `"GAE Rajdhani", ${SANS}`,
    text: '#a8f6ff',
    panel: { bg: { solid: 'rgba(0,20,30,0.45)' }, border: { width: 1, color: '#39d0ff' }, chamfer: 10 },
    title: { upper: true, spacing: 0.2, size: 11 },
    bar: { height: 6, track: { bg: { solid: 'rgba(57,208,255,0.15)' } }, fill: { bg: { solid: '#39d0ff' }, glow: { color: '#39d0ff', blur: 8 } } },
    key: { border: { width: 1, color: '#39d0ff' } },
    icon: '@accent',
  }),
  skin('jrpg', 'B10', 'JRPG 蓝框', '深蓝渐变窗口、白色细框', '经典 JRPG 窗口：深蓝渐变底、白色双线框', {
    text: '#fff',
    panel: { bg: { linear: { angle: 180, stops: [[0, '#2a4bb8'], [1, '#0c1a5c']] } }, border: { width: 3, color: '#fff', style: 'double' }, radius: 6 },
    bar: { height: 12, track: { bg: { solid: '#0a0f33' }, border: { width: 1, color: '#fff' } }, fill: { bg: { linear: { angle: 90, stops: [[0, '#6fdc6f'], [1, '#bff27a']] } } } },
    key: { border: { width: 1, color: '#fff' } },
  }),
  skin('parchment', 'B11', '羊皮纸', '旧纸、深棕描边、衬线字', '羊皮纸 UI：旧纸纹理、深棕描边、衬线字体', {
    font: `"GAE Cinzel", ${SERIF}`,
    text: '#3a2410',
    panel: {
      bg: { radial: { stops: [[0, '#f3e2b8'], [1, '#dcc08a']] } }, border: { width: 2, color: '#5a3a1e' }, radius: 4,
      shadows: [{ color: 'rgba(90,58,30,0.35)', x: 0, y: 0, blur: 18, inset: true }],
    },
    bar: { height: 12, track: { bg: { solid: '#b8995e' }, border: { width: 1, color: '#5a3a1e' } }, fill: { bg: { solid: '#8c2a1e' } } },
    key: { border: { width: 1, color: '#5a3a1e' }, circle: true },
  }),
  skin('comic', 'B12', '漫画对话框', '粗黑边气泡、网点', '漫画式 UI：粗黑边对话气泡与网点', {
    font: `"GAE Grotesk", ${SANS}`,
    text: '#000',
    panel: { bg: { pattern: { kind: 'dots', bg: '#fff', fg: 'rgba(0,0,0,0.13)', size: 6, line: 1 } }, border: { width: 3, color: '#000' }, radius: 14 },
    dialog: { tail: true },
    bar: { height: 12, track: { bg: { solid: '#fff' }, border: { width: 2, color: '#000' } }, fill: { bg: { solid: '@accent' } } },
    key: { bg: { solid: '#ffe600' }, border: { width: 2, color: '#000' }, circle: true },
  }),
  skin('terminal', 'B13', 'CRT 终端', '黑底绿字、扫描线', '单色 CRT 终端 UI：黑底磷光绿字', {
    font: `"GAE VT323", ${PIXEL}`,
    textSize: 16,
    text: '#33ff66',
    textGlow: '#33ff66',
    panel: { bg: { solid: 'rgba(0,0,0,0.82)' }, border: { width: 1, color: '#33ff66' } },
    bar: { height: 12, track: { bg: { solid: '#003311' } }, fill: { bg: { pattern: { kind: 'stripes', fg: '#33ff66', size: 6, line: 4 } } } },
    key: { brackets: true },
  }),
  skin('y2k', 'B14', 'Y2K 镀铬', '银色金属渐变、气泡', 'Y2K 风 UI：镀铬银渐变、半透明塑料按钮', {
    text: '#1d2b44',
    panel: {
      bg: { linear: { angle: 180, stops: [[0, '#f6f8fb'], [0.48, '#b9c3d1'], [0.52, '#e3e8ef'], [1, '#c9d1dc']] } },
      border: { width: 1, color: '#8792a3' }, radius: 18,
      shadows: [{ color: '#fff', x: 0, y: 1, blur: 0, inset: true }, { color: 'rgba(0,0,0,0.25)', x: 0, y: 4, blur: 12 }],
    },
    bar: { height: 12, track: { bg: { solid: '#8fa0b8' }, radius: 8 }, fill: { bg: { linear: { angle: 180, stops: [[0, '#9ff3ff'], [1, '#2aa8ff']] } } } },
    key: { bg: { radial: { at: [0.35, 0.3], shape: 'circle', stops: [[0, '#fff'], [0.6, '#7ad2ff'], [1, '#2b7bd8']] } }, circle: true },
  }),
  skin('swiss', 'B15', '瑞士网格', '严格网格、无衬线、信息图', '瑞士国际主义 UI：严格网格排版、无衬线字、信息图符号', {
    font: `"GAE Grotesk", ${SANS}`,
    text: '#111',
    panel: { bg: { solid: '#fff' }, sides: { l: { width: 8, color: '@accent' } } },
    title: { weight: 900, spacing: -0.01 }, name: { weight: 900, spacing: -0.01 },
    bar: { height: 6, track: { bg: { solid: '#eee' } }, fill: { bg: { solid: '#111' } } },
    key: { bg: { solid: '#111' }, color: '#fff' },
  }),
  skin('constructivist', 'B16', '构成主义', '红黑白、斜向构图', '构成主义 UI：红黑白、斜向色块与粗体字', {
    font: `"GAE Grotesk", ${SANS}`,
    text: '#111',
    panel: { bg: { solid: '#f2ead8' }, sides: { l: { width: 14, color: '#c8102e' } }, skewX: -6 },
    title: { color: '#c8102e', upper: true }, name: { color: '#c8102e', upper: true },
    bar: { height: 10, track: { bg: { solid: '#111' } }, fill: { bg: { solid: '#c8102e' } } },
    key: { bg: { solid: '#111' }, color: '#f2ead8' },
  }),
];

export const SKIN_MAP = new Map(SKINS.map((s) => [s.id, s]));

/** "UI 取色自色板"关闭时的默认色（与旧 hud.css 开头的变量默认值一致） */
/**
 * 每个皮肤自己的一对强调色（docs/workbench-redesign.md §8 RC6，轨道 E）：取代全局的粉红 #ff3d6e 与「强调色跟场景色板走」——
 * 皮肤的按钮 / 选中 / 标牌颜色不再随画面配方变（色板缩略图、规格页、换配方时 UI 稳定）；场景色板只给面板底、字色、好色这些次要着色。
 * 选色规则：白字对比 ≥ 4.5（深色强调）或深字对比 ≥ 4.5（浅色强调），按钮字跟着选（theme.ts 的 onAccent）。
 * 显式要「跟随画面」（col.source 手动选场景、rel.harmony = 同一媒介 / 统一调色）时仍取场景色板的强调色；皮肤预设自己写了 col.accent 的照它。
 * 审查修复 ⑫：自带关键词会写 col.accent 的新皮肤（全息 = kw.cyber、和风 = kw.wafu、暗金 = kw.luxury）这一对与关键词对齐（原来写的色对被关键词盖掉，表里的颜色画不出来）
 */
export const SKIN_ACCENTS: Record<string, [string, string]> = {
  neobrutal: ['#2b59c3', '#ffd23f'], glass: ['#3d6fd6', '#8f6bff'], neumorph: ['#3e66d8', '#ff8a65'], flat: ['#1976d2', '#ff9800'], skeuo: ['#8a4b1c', '#d9a441'],
  pixel: ['#c42430', '#feae34'], pixelWood: ['#9e4539', '#f7c873'], handdrawn: ['#c0392b', '#2e86de'], ink: ['#b22222', '#3a5f5a'], scifi: ['#00c2ff', '#ff9f1c'],
  holo: ['#ff2bd6', '#29f0ff'], jrpg: ['#2f5fd0', '#ffd166'], parchment: ['#8b2e16', '#c9973b'], comic: ['#d91e26', '#ffde00'], slant: ['#d81e3c', '#ffd400'],
  terminal: ['#33ff66', '#ffb000'], y2k: ['#6a4cff', '#00d4ff'], swiss: ['#e30613', '#111111'], constructivist: ['#c8102e', '#111111'], deco: ['#c9a54c', '#1f6f6b'],
  persona: ['#e60012', '#ffffff'], memphis: ['#d12f72', '#00b8a9'], mono: ['#1f2328', '#8a8f98'], thinGeo: ['#2a6be0', '#ffbe0b'], aero: ['#1565c0', '#7cd34a'],
  synth: ['#ff3cac', '#2bd2ff'], military: ['#c8a632', '#6b8e23'], cozy: ['#b8502f', '#81b29a'], wa: ['#d7402b', '#c9a96e'], gacha: ['#f2c14e', '#a259ff'],
  ornate: ['#c9a24a', '#7a1f2b'], filigree: ['#b8955a', '#3f5e5a'], darkHairline: ['#2f6fe0', '#e8c170'], animeCard: ['#ff6f91', '#5ac8fa'], candy: ['#ff6fae', '#59d2fe'],
  darkGold: ['#c9a54c', '#8c2f2f'], greybox: ['#3a6ea5', '#c0c0c0'], godotDefault: ['#699ce8', '#e0e0e0'],
};

export const DEFAULT_SKIN_PALETTE = { accent: '#ff3d6e', accent2: '#ffc233', paper: '#f7f1e3', ink: '#1e1b2e', good: '#7bd148', sky: '#4fb4ff' };
