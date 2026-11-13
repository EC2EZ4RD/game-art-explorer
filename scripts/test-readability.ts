/*
 * 可读性检查的单元测试（docs/ui-hud-plan.md M8a 验收："对比度计算有单元测试"）。
 * 运行：npm test（= npx tsx scripts/test-readability.ts）
 */
import '../src/dims/index';
import { defaultValues } from '../src/dims/registry';
import { analyzeReadability, contrast, over, relLum, required, sceneUnder, type Rgb, type SceneSample } from '../src/hud/check/readability';
import { resolveUi } from '../src/hud/sys/resolve';

let fails = 0, n = 0;
const near = (a: number, b: number, eps: number, msg: string) => { n++; if (Math.abs(a - b) > eps) { fails++; console.log(`  ✗ ${msg}：得到 ${a.toFixed(3)}，应为 ${b}`); } };
const ok = (c: boolean, msg: string) => { n++; if (!c) { fails++; console.log(`  ✗ ${msg}`); } };

console.log('== WCAG 对比度');
const W: Rgb = [255, 255, 255], K: Rgb = [0, 0, 0];
near(relLum(W), 1, 1e-9, '白色相对亮度');
near(relLum(K), 0, 1e-9, '黑色相对亮度');
near(contrast(W, K), 21, 1e-9, '黑白 21:1');
near(contrast(K, W), 21, 1e-9, '对称');
near(contrast([0x76, 0x76, 0x76], W), 4.54, 0.01, '#767676 / 白 = 4.54（WCAG 正文及格线附近）');
near(contrast([0x77, 0x77, 0x77], W), 4.48, 0.01, '#777777 / 白 = 4.48（差一点不及格）');
near(contrast([255, 0, 0], W), 4.0, 0.01, '纯红 / 白 = 4.0');
near(contrast([0, 0, 255], W), 8.59, 0.01, '纯蓝 / 白 = 8.59');
near(contrast(W, W), 1, 1e-9, '同色 1:1');
console.log('== 合成与阈值');
const g = over(W, 0.5, K);
near(g[0], 127.5, 1e-9, '50% 白叠黑');
ok(required(13, false, false) === 4.5, '正文 13px 要 4.5');
ok(required(18, false, false) === 3, '大字 18px 要 3');
ok(required(14, true, false) === 3, '粗体 14px 要 3');
ok(required(12, false, true) === 1.5, '有描边辅助的字要 1.5');

console.log('== 画面采样');
const flat = (c: Rgb, w = 40, h = 30): SceneSample => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set([c[0], c[1], c[2], 255], i * 4); return { data: d, w, h, cssW: 400, cssH: 300 }; };
const half = (() => { const s = flat([20, 20, 20]); for (let y = 0; y < s.h; y++) for (let x = 20; x < s.w; x++) s.data.set([240, 240, 240, 255], (y * s.w + x) * 4); return s; })();
const u = sceneUnder(half, { x: 100, y: 50, w: 200, h: 100 });
ok(relLum(u.light) > 0.8 && relLum(u.dark) < 0.02, '跨明暗两半的矩形：最亮 / 最暗都取到');

console.log('== 分析：雪地上的毛玻璃');
const r = resolveUi(defaultValues());
const log = (panel: string, text: string, blur: number) => ({
  boxes: [{ x: 20, y: 20, w: 220, h: 80, color: panel, blur, cw: 400 }],
  texts: [{ x: 34, y: 30, w: 60, h: 20, size: 13, color: text, aided: false, bold: false, text: '旅人', cw: 400 }],
});
const snow = flat([238, 243, 248]), night = flat([18, 22, 34]);
const glassOnSnow = analyzeReadability(log('rgba(255,255,255,0.18)', '#ffffff', 12), snow, 400, 300, r);
ok(glassOnSnow.some((i) => i.id === 'contrast'), '雪地 + 毛玻璃 + 白字：报文字对比度不足');
ok(glassOnSnow.some((i) => i.id === 'panel'), '雪地 + 毛玻璃：报面板和背景分不开');
const glassAtNight = analyzeReadability(log('rgba(255,255,255,0.18)', '#ffffff', 12), night, 400, 300, r);
ok(!glassAtNight.some((i) => i.id === 'contrast'), '夜景 + 毛玻璃 + 白字：对比度及格');
const solid = analyzeReadability(log('#1b1d24', '#f2f2f2', 0), snow, 400, 300, r);
ok(!solid.some((i) => i.id === 'contrast' || i.id === 'panel'), '雪地 + 不透明深色面板：没有问题');
const fix = glassOnSnow.find((i) => i.id === 'contrast')?.fixes.map((f) => f.label) ?? [];
ok(fix.includes('文字加描边') && fix.includes('面板改成不透明'), '给出描边 / 不透明两种修复');
const tiny = analyzeReadability({ boxes: [], texts: [{ x: 0, y: 0, w: 30, h: 12, size: 9, color: '#000', aided: true, bold: false, text: 'x', cw: 400 }] }, snow, 400, 300, r);
ok(tiny.some((i) => i.id === 'minText'), '9px 的字：报字太小');
// px@1080p（M12a-05）：PC 门槛 24px@1080p = 设计画布上 12px；画布放大一倍（unitK = 2）时 13px 的字只相当于 13px@1080p
const t13 = { boxes: [], texts: [{ x: 0, y: 0, w: 30, h: 12, size: 13, color: '#000', aided: true, bold: false, text: 'x', cw: 400 }] };
ok(!analyzeReadability(t13, snow, 400, 300, r).some((i) => i.id === 'minText'), '13px（unitK = 1，= 26px@1080p）：不报');
ok(analyzeReadability({ ...t13, unitK: 2 }, snow, 400, 300, r).some((i) => i.id === 'minText'), '13px 在放大一倍的画布上（= 13px@1080p）：报字太小');
// 轨道 E 审查修复 ③：修法要真能放大（原来写「正文 = 门槛 + 2 = 26」就是默认值，点了没变化）——基准字号在现在的基础上 + 4
ok(analyzeReadability({ ...t13, unitK: 2 }, snow, 400, 300, r).find((i) => i.id === 'minText')?.fixes[0].set['typ.baseSize'] === r.num('typ.baseSize', 26) + 4, '修复：基准字号 + 4（px@1080p）');
const icon = analyzeReadability({ boxes: [{ x: 0, y: 0, w: 100, h: 40, color: '#f5efe2', blur: 0, cw: 400 }], texts: [{ x: 5, y: 5, w: 14, h: 18, size: 13, color: '#e0457b', aided: false, bold: false, text: '◆', cw: 400 }] }, snow, 400, 300, r);
ok(!icon.some((i) => i.id === 'contrast'), '图标字 ◆ 按非文字图形 3:1 算');

console.log('== M8b：溢出 / 互压 / 触控 / 安全区 / 特效遮挡');
const T0 = { size: 13, color: '#111', aided: true, bold: false, cw: 400 };
const B0 = { color: '#f5efe2', blur: 0, cw: 400 };
const ovf = analyzeReadability({ boxes: [{ x: 10, y: 10, w: 80, h: 30, ...B0 }], texts: [{ x: 16, y: 15, w: 120, h: 20, text: '收集 木材 24 / 30～～', ...T0 }] }, snow, 400, 300, r);
ok(ovf.some((i) => i.id === 'overflow'), '字比盒子宽：报文字冒出盒子');
const fits = analyzeReadability({ boxes: [{ x: 10, y: 10, w: 160, h: 30, ...B0 }], texts: [{ x: 16, y: 15, w: 120, h: 20, text: '收集 木材', ...T0 }] }, snow, 400, 300, r);
ok(!fits.some((i) => i.id === 'overflow' || i.id === 'textClash'), '装得下：不报');
const thinBar = analyzeReadability({ boxes: [{ x: 10, y: 20, w: 40, h: 6, ...B0 }], texts: [{ x: 16, y: 13, w: 80, h: 20, text: '86/120', ...T0 }] }, snow, 400, 300, r);
ok(!thinBar.some((i) => i.id === 'overflow'), '压在细条上的数值不算溢出（条比字矮）');
const clash = analyzeReadability({ boxes: [], texts: [{ x: 10, y: 10, w: 100, h: 20, text: '艾琳～～～', ...T0 }, { x: 80, y: 12, w: 40, h: 20, text: '×24', ...T0 }] }, snow, 400, 300, r);
ok(clash.some((i) => i.id === 'textClash'), '两段字重叠：报互相压住');
const fxText = analyzeReadability({ boxes: [], texts: [{ x: 10, y: 10, w: 100, h: 20, text: '128', ...T0, fx: true }, { x: 20, y: 12, w: 40, h: 20, text: '生命', ...T0 }] }, snow, 400, 300, r);
ok(!fxText.some((i) => i.id === 'textClash'), '飘字（特效画的字）不和 HUD 字算互压');
const touchR = resolveUi({ ...defaultValues(), 'ctx.input': 'touch', 'ix.touchSize': 88 });
// ix.touchSize 是 px@1080p（M12a-05）：88 = 设计画布上 44px；unitK = 2 时要 88 CSS 像素
const tgt = (w: number, unitK?: number) => ({ boxes: [], texts: [], targets: [{ x: 100, y: 100, w, h: w, cw: 400, label: '技能' }], unitK });
ok(analyzeReadability(tgt(40), snow, 400, 300, touchR).some((i) => i.id === 'touch'), '触屏 + 40px 按钮（要 44）：报触控目标太小');
ok(!analyzeReadability(tgt(46), snow, 400, 300, touchR).some((i) => i.id === 'touch'), '触屏 + 46px 按钮：通过');
ok(analyzeReadability(tgt(52, 2), snow, 400, 300, touchR).some((i) => i.id === 'touch'), '触屏 + 52px 按钮、画布放大一倍（要 88）：报触控目标太小');
ok(!analyzeReadability(tgt(90, 2), snow, 400, 300, touchR).some((i) => i.id === 'touch'), '触屏 + 90px 按钮、画布放大一倍：通过');
ok(!analyzeReadability(tgt(30), snow, 400, 300, r).some((i) => i.id === 'touch'), '键鼠输入：不查触控尺寸');
const phoneR = resolveUi({ ...defaultValues(), 'ctx.device': 'phone' });
const edge = { boxes: [{ x: 4, y: 100, w: 80, h: 30, ...B0 }], texts: [] };
ok(analyzeReadability(edge, snow, 400, 300, phoneR).some((i) => i.id === 'safeArea'), '手机横屏：贴左边（刘海）的面板报安全区');
ok(!analyzeReadability({ boxes: [{ x: 60, y: 100, w: 80, h: 30, ...B0 }], texts: [] }, snow, 400, 300, phoneR).some((i) => i.id === 'safeArea'), '离边够远：通过');
ok(!analyzeReadability(edge, snow, 400, 300, r).some((i) => i.id === 'safeArea'), 'PC：不查安全区');
const fxR = resolveUi({ ...defaultValues(), 'chk.fxOcclusion': true });
const fxLog = { boxes: [], texts: [{ x: 20, y: 20, w: 60, h: 20, text: '生命', ...T0 }], fx: [{ x: 0, y: 0, w: 120, h: 80, cw: 400, kind: 'speedLines' }] };
ok(analyzeReadability(fxLog, snow, 400, 300, fxR).some((i) => i.id === 'fxOcclusion'), '速度线压住生命字：报特效遮挡');
ok(!analyzeReadability(fxLog, snow, 400, 300, r).some((i) => i.id === 'fxOcclusion'), '没开 chk.fxOcclusion：不查');

const oneHand = resolveUi({ ...defaultValues(), 'ctx.input': 'touch', 'ix.touchSize': 88, 'ix.thumbZone': 'oneHand' });
const topBtn = { boxes: [], texts: [], targets: [{ x: 100, y: 10, w: 100, h: 100, cw: 400, label: '开始' }] };
ok(analyzeReadability(topBtn, snow, 400, 300, oneHand).some((i) => i.id === 'thumbReach'), '竖屏单手：上 1/3 的大按钮报够不到');
ok(!analyzeReadability({ ...topBtn, targets: [{ x: 100, y: 190, w: 100, h: 100, cw: 400, label: '开始' }] }, snow, 400, 300, oneHand).some((i) => i.id === 'thumbReach'), '大按钮在下面：通过');

console.log(`\n${n - fails}/${n} 通过`);
if (fails) process.exit(1);
