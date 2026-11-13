/*
 * 面板材质（ast.coreMat / ast.frameMat / ast.bgMat）的程序化贴图：每种材质一张 128px 的可平铺小图，
 * 以面板底色为基色调制（纸、羊皮纸、宣纸、绢、布、皮革、木、石、金、青铜、铁、冰、玉、漆、塑料、全息、线描）。
 * 这是 M3.5 之前的程序化版本；AI 生成素材（M11）生成后同名替换成真实贴图。
 * M12b-52 加：丝绒 velvet、大理石 marble、瓷 porcelain、瓦楞纸板 cardboard、毛毡 felt、黏土 clay、水彩 watercolor、彩绘玻璃 stainedGlass、
 * 透明塑料 translucentPlastic、玉絮 jadeFloc（都是程序画的，不要素材；跟着盒子外形的部分——水彩潮线、瓷釉光、塑料光泽条——在 paint.ts 的 materialBox）。
 * 小图缓存是有上限的 LRU（审查修复 A · L9 的规则：96 张图块之外，材质最多 64 张；底色每种一张，换色多的皮肤不会无限长）
 */

const TILE = 128;
const cache = new Map<string, HTMLCanvasElement>();
const CACHE_MAX = 64;

/** 可复现的伪随机（同一材质每次一样） */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const NAMED: Record<string, [number, number, number, number]> = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1] };

/** 纯文本解析 #rgb / #rrggbb / #rrggbbaa / rgb() / rgba()；解析不了返回 null（交给浏览器） */
function parseColorText(c: string): [number, number, number, number] | null {
  const s = c.trim().toLowerCase();
  if (NAMED[s]) return [...NAMED[s]];
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const v = [...h].map((x) => parseInt(x + x, 16));
      return [v[0], v[1], v[2], h.length === 4 ? v[3] / 255 : 1];
    }
    if (h.length === 6 || h.length === 8) {
      const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
    }
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith('%') ? Number(x.slice(0, -1)) / 100 : Number(x)));
    if (p.length >= 3 && p.every((x) => !Number.isNaN(x))) return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return null;
}

export function parseColor(c: string): [number, number, number, number] {
  const direct = parseColorText(c);
  // Node（Godot 导出校验、内容检查）里没有画布：解析不了的颜色名按黑色
  if (direct || typeof document === 'undefined') return direct ?? [0, 0, 0, 1];
  const ctx = probe();
  ctx.fillStyle = '#000';
  ctx.fillStyle = c;
  const v = String(ctx.fillStyle);
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [m[0], m[1], m[2], m[3] ?? 1];
}
let probeCtx: CanvasRenderingContext2D | null = null;
function probe() {
  if (!probeCtx) probeCtx = document.createElement('canvas').getContext('2d')!;
  return probeCtx;
}
export const rgba = (c: [number, number, number, number]) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+c[3].toFixed(3)})`;
export const mix = (a: string, b: string, t: number) => {
  const x = parseColor(a), y = parseColor(b);
  return rgba([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t, x[3] + (y[3] - x[3]) * t]);
};
export const withAlpha = (c: string, a: number) => {
  const x = parseColor(c);
  return rgba([x[0], x[1], x[2], x[3] * a]);
};
export const luminance = (c: string) => {
  const [r, g, b] = parseColor(c).map((v, i) => (i < 3 ? v / 255 : v)).map((v, i) => (i < 3 ? (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) : v));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a: string, b: string) => {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * 渐变的平均色（R4 回归修复 elden-ring#49：渐变底上材质内芯的基色、主题按它查字色对比）：stops = [位置 0~1, 已解析的颜色]；
 * 按色标位置加权、预乘透明度求平均（与浏览器的渐变插值同口径），首个色标之前 / 末个之后按端点色延伸；没有色标 → undefined
 */
export function gradientMean(stops: [number, string][]): string | undefined {
  const st = stops.map(([t, c]) => [Math.max(0, Math.min(1, t)), parseColor(c)] as const).sort((a, b) => a[0] - b[0]);
  if (!st.length) return undefined;
  const pm = (c: readonly number[]) => [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]];
  const acc = [0, 0, 0, 0], add = (c: number[], w: number) => { for (let i = 0; i < 4; i++) acc[i] += c[i] * w; };
  add(pm(st[0][1]), st[0][0]);
  for (let i = 0; i + 1 < st.length; i++) { const a = pm(st[i][1]), b = pm(st[i + 1][1]); add(a.map((v, k) => (v + b[k]) / 2), st[i + 1][0] - st[i][0]); }
  add(pm(st[st.length - 1][1]), 1 - st[st.length - 1][0]);
  const a = acc[3], c0 = st[0][1];
  return rgba(a > 1e-4 ? [acc[0] / a, acc[1] / a, acc[2] / a, a] : [c0[0], c0[1], c0[2], c0[3]]);
}

/** 材质的默认基色（面板没给底色时用） */
export const MATERIAL_BASE: Record<string, string> = {
  paper: '#f2ead8', parchment: '#e6d2a6', xuan: '#efe9dc', silk: '#e9dcbc', cloth: '#7a2b2b', leather: '#6b4429',
  wood: '#8a5a33', stone: '#8d8d88', gold: '#c9a24a', bronze: '#9a6a3a', iron: '#5d6168', ice: '#bfd8e6',
  jade: '#5aa58a', lacquer: '#8e1f1f', plastic: '#f4f4f4', hologram: '#0b2a3a', lineArt: '#fafafa',
  // M12b-52
  velvet: '#2a1420', marble: '#ece8e1', porcelain: '#cfdcdf', cardboard: '#b88a5a', felt: '#7d6a8e', clay: '#b8734f',
  watercolor: '#f3ead8', stainedGlass: '#3a5a8a', translucentPlastic: '#5ac8e8', jadeFloc: '#bfe0cf',
};

function tile(mat: string, base: string): HTMLCanvasElement {
  const key = `${mat}|${base}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d')!;
  const R = rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);
  const dark = (a: number) => withAlpha('#000', a), light = (a: number) => withAlpha('#fff', a);
  const speckle = (n: number, a: number, size = 1) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = R() < 0.5 ? dark(a * R()) : light(a * R());
      g.fillRect(R() * TILE, R() * TILE, size, size);
    }
  };
  const fibers = (n: number, a: number, len: number) => {
    g.lineWidth = 0.6;
    for (let i = 0; i < n; i++) {
      const x = R() * TILE, y = R() * TILE, ang = R() * Math.PI, l = len * (0.4 + R());
      g.strokeStyle = dark(a * R());
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(ang) * l * 0.5 + (R() - 0.5) * 4, y + Math.sin(ang) * l * 0.5, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
      g.stroke();
    }
  };
  const blotches = (n: number, a: number, r: number) => {
    for (let i = 0; i < n; i++) {
      const x = R() * TILE, y = R() * TILE, rr = r * (0.4 + R());
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, R() < 0.6 ? dark(a) : light(a));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) {
        g.save(); g.translate(dx, dy); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore();
      }
    }
  };
  switch (mat) {
    case 'paper': speckle(900, 0.08); fibers(30, 0.08, 10); break;
    case 'parchment': blotches(10, 0.07, 28); speckle(700, 0.1); fibers(20, 0.06, 12); break;
    case 'xuan': fibers(140, 0.12, 14); speckle(400, 0.05); break;
    case 'silk':
      g.globalAlpha = 0.07;
      for (let i = 0; i < TILE; i += 2) { g.fillStyle = '#000'; g.fillRect(i, 0, 1, TILE); g.fillRect(0, i, TILE, 1); }
      g.globalAlpha = 1; speckle(200, 0.05); break;
    case 'cloth':
      for (let y = 0; y < TILE; y += 4) for (let x = 0; x < TILE; x += 4) {
        g.fillStyle = (x + y) % 8 === 0 ? dark(0.18) : light(0.06);
        g.fillRect(x, y, 4, 2);
      }
      break;
    case 'leather': blotches(26, 0.1, 10); speckle(1500, 0.12); break;
    case 'wood': {
      for (let y = 0; y < TILE; y += 1) {
        const w = Math.sin(y * 0.25 + Math.sin(y * 0.05) * 3) * 0.5 + 0.5;
        g.fillStyle = dark(0.05 + w * 0.12);
        g.fillRect(0, y, TILE, 1);
      }
      fibers(40, 0.12, 30);
      break;
    }
    case 'stone': blotches(30, 0.12, 18); speckle(1600, 0.14); break;
    case 'gold': case 'bronze': case 'iron': case 'ice': {
      const gr = g.createLinearGradient(0, 0, TILE, TILE);
      gr.addColorStop(0, light(0.25)); gr.addColorStop(0.5, dark(0.1)); gr.addColorStop(1, light(0.15));
      g.fillStyle = gr; g.fillRect(0, 0, TILE, TILE);
      for (let y = 0; y < TILE; y++) { g.fillStyle = (R() < 0.5 ? light : dark)(0.04 * R()); g.fillRect(0, y, TILE, 1); }
      if (mat === 'ice') fibers(16, 0.2, 40);
      break;
    }
    case 'jade': blotches(18, 0.14, 22); fibers(20, 0.08, 24); break;
    case 'lacquer': { const gr = g.createLinearGradient(0, 0, 0, TILE); gr.addColorStop(0, light(0.12)); gr.addColorStop(1, dark(0.15)); g.fillStyle = gr; g.fillRect(0, 0, TILE, TILE); break; }
    case 'plastic': speckle(200, 0.03); break;
    case 'hologram':
      g.strokeStyle = 'rgba(80,220,255,0.25)';
      g.lineWidth = 1;
      for (let i = 0; i <= TILE; i += 16) { g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, TILE); g.stroke(); g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(TILE, i + 0.5); g.stroke(); }
      break;
    /* ---- M12b-52 ---- */
    case 'velvet': {
      // 丝绒挂幕（civ6#29）：竖向垂褶（整数频率的正弦，图块左右接得上）的明暗 + 细绒点
      for (let x = 0; x < TILE; x++) {
        const v = 0.5 + 0.5 * Math.sin((2 * Math.PI * 3 * x) / TILE + 0.8 * Math.sin((2 * Math.PI * x) / TILE));
        g.fillStyle = v > 0.5 ? light(0.1 * (v - 0.5) * 2) : dark(0.32 * (0.5 - v) * 2);
        g.fillRect(x, 0, 1, TILE);
      }
      speckle(500, 0.05);
      break;
    }
    case 'marble': {
      // 大理石（hades#34）：浅底 + 几道扭曲的细脉纹（随机游走折线，跨图块边的部分在对边重画）+ 很淡的宽晕
      blotches(8, 0.035, 30);
      for (let v = 0; v < 5; v++) {
        const pts: [number, number][] = [];
        let x = R() * TILE, y = R() * TILE, a = R() * Math.PI * 2;
        for (let i = 0; i < 26; i++) { pts.push([x, y]); a += (R() - 0.5) * 0.9; x += Math.cos(a) * 6; y += Math.sin(a) * 6; }
        for (const [w, al] of [[3.5, 0.05], [0.7 + R() * 0.7, 0.2]] as const) {
          g.lineWidth = w; g.strokeStyle = dark(al);
          for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.stroke(); }
        }
      }
      break;
    }
    case 'porcelain': {
      // 瓷（slay-the-spire#16）：极淡的斑点 + 细开片（短折线网，跨边重画）；釉光渐变在 materialBox
      speckle(160, 0.03);
      g.lineWidth = 0.45; g.strokeStyle = dark(0.12);
      for (let i = 0; i < 22; i++) {
        let x = R() * TILE, y = R() * TILE, a = R() * Math.PI * 2;
        const seg: [number, number][] = [[x, y]];
        for (let k = 0; k < 4; k++) { a += (R() - 0.5) * 1.6; x += Math.cos(a) * (5 + R() * 9); y += Math.sin(a) * (5 + R() * 9); seg.push([x, y]); }
        for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) { g.beginPath(); seg.forEach(([px, py], j) => (j ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.stroke(); }
      }
      break;
    }
    case 'cardboard':
      // 瓦楞纸板：每 8 像素一道楞（亮 / 暗两半）+ 纸纤维
      for (let y = 0; y < TILE; y++) { const v = Math.sin((2 * Math.PI * y) / 8); g.fillStyle = v > 0 ? light(0.07 * v) : dark(0.1 * -v); g.fillRect(0, y, TILE, 1); }
      fibers(40, 0.1, 10); speckle(400, 0.06);
      break;
    case 'felt': fibers(700, 0.12, 5); speckle(1800, 0.09); break;
    case 'clay': blotches(22, 0.08, 16); speckle(700, 0.07); fibers(12, 0.06, 18); break;
    case 'watercolor':
      // 水彩洗底（storybook）：大块柔晕 + 颜料颗粒；边缘潮线在 materialBox
      blotches(18, 0.09, 36); speckle(600, 0.05);
      break;
    case 'jadeFloc':
      // 玉絮（仙侠）：半透明青白底里飘着几缕白絮（宽而淡的纤维 + 亮晕）
      blotches(14, 0.12, 26);
      g.lineWidth = 2.2;
      for (let i = 0; i < 26; i++) { const x = R() * TILE, y = R() * TILE, a = R() * Math.PI, l = 14 + R() * 26; g.strokeStyle = light(0.1 + R() * 0.12); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 10, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      break;
    case 'translucentPlastic':
      // 透明彩色塑料（Y2K）：底色本身半透明；光泽条在 materialBox
      g.clearRect(0, 0, TILE, TILE); g.fillStyle = withAlpha(base, 0.55); g.fillRect(0, 0, TILE, TILE); speckle(120, 0.02);
      break;
    case 'stainedGlass': stainedGlass(g, base, R); break;
    default: break;
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, c);
  return c;
}

/**
 * 彩绘玻璃（M12b-52）：图块里 11 个种子点（跨边绕回）的 Voronoi 格——每格一种宝石色（红 / 蓝 / 绿 / 琥珀 / 紫与底色混），离种子越近越亮；
 * 两格交界（最近与次近的距离差 < 2.2）是深色铅条。逐像素算一次、缓存；拿不到像素（只有画布替身时）就只铺底色
 */
function stainedGlass(g: CanvasRenderingContext2D, base: string, R: () => number) {
  const img = g.getImageData(0, 0, TILE, TILE);
  if (!img?.data || img.data.length < TILE * TILE * 4) return;
  const JEWEL = ['#b3202e', '#2a4fa8', '#2f8a4a', '#d99a22', '#6b3fa0', '#1f8a9a'];
  const seeds = Array.from({ length: 11 }, () => ({ x: R() * TILE, y: R() * TILE, c: parseColor(mix(base, JEWEL[Math.floor(R() * JEWEL.length)], 0.62)) }));
  const lead = parseColor('#1a1410');
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let d1 = Infinity, d2 = Infinity, k = 0;
    for (let i = 0; i < seeds.length; i++) {
      const dx = Math.min(Math.abs(x - seeds[i].x), TILE - Math.abs(x - seeds[i].x)), dy = Math.min(Math.abs(y - seeds[i].y), TILE - Math.abs(y - seeds[i].y)), d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; k = i; } else if (d < d2) d2 = d;
    }
    const o = (y * TILE + x) * 4, c = d2 - d1 < 2.2 ? lead : seeds[k].c, lit = d2 - d1 < 2.2 ? 1 : 1.12 - Math.min(0.3, d1 / 60);
    img.data[o] = Math.min(255, c[0] * lit); img.data[o + 1] = Math.min(255, c[1] * lit); img.data[o + 2] = Math.min(255, c[2] * lit); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/** 用材质铺满矩形（调用方已经裁剪到面板形状） */
export function fillMaterial(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mat: string, base?: string) {
  const t = tile(mat, base ?? MATERIAL_BASE[mat] ?? '#ccc');
  const p = ctx.createPattern(t, 'repeat');
  if (!p) return;
  ctx.save();
  ctx.fillStyle = p;
  ctx.translate(x, y);
  ctx.fillRect(-2, -2, w + 4, h + 4);
  ctx.restore();
  // 羊皮纸 / 宣纸的暗边
  if (mat === 'parchment' || mat === 'xuan') {
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, mat === 'parchment' ? 'rgba(90,50,10,0.28)' : 'rgba(60,50,40,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}
