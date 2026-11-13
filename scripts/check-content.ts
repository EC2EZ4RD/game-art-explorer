/*
 * 内容一致性检查：参数解释是否齐全、配方是否只用有效参数、场景是否都有构建器、风格图谱的能力分布。
 * 运行：npx tsx scripts/check-content.ts
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import '../src/dims/index';
import { allParams, DIMS, getParam } from '../src/dims/registry';
import { RECIPES } from '../src/content/recipes';
import { PALETTES } from '../src/content/palettes';
import { GAMEUI_FUNCTION_TO_CONTENT, IIG_ELEMENT_TO_CONTENT, UI_CONTENT } from '../src/content/uiContent';
import { FONT_BUDGET_KB, FONT_ROLES, HUD_FONT_FILES, licenseFilesOf, roleHasFont } from '../src/hud/fontList';
import { hudCharSet } from './hud-chars';
import { displayCharset } from './display-chars';
import { createHash } from 'node:crypto';
import { PACKS, packById } from '../src/hud/content';
import { missingSamples, SAMPLE_KEYS } from '../src/hud/content/samples';
import { hasGenericText, SCREEN_GROUP_NAMES } from '../src/hud/content/texts';
import { GENERIC } from '../src/hud/content/generic';
import { defaultValues } from '../src/dims/registry';
import { IMPLEMENTED_RULES } from '../src/hud/sys/derive';
import { Resolved, resolveUi } from '../src/hud/sys/resolve';
import { presetsOf, PRESETS, SPEC, SPEC_PARAM, type Raw } from '../src/hud/sys/spec';
import { checkResolved } from '../src/hud/sys/check';
import { skinValueOf } from '../src/hud/sys/register';
import { SKINS } from '../src/hud/skins';
import { ROLES } from '../src/content/roles';
import { SCENES, SCENE_CATEGORIES } from '../src/content/sceneCatalog';
import { hasSceneBuilder } from '../src/engine/scene/sceneRegistry';
import '../src/engine/scene/scenes/index';

let problems = 0;
const warn = (msg: string) => { problems++; console.log('  ✗', msg); };

console.log('== 参数注册表');
const params = allParams();
for (const p of params) {
  if (!p.explain?.plain) warn(`${p.id} 缺少白话解释`);
  if (p.kind === 'choice') {
    if (!p.options?.length) warn(`${p.id} 没有选项`);
    // UI 体系参数以 auto（跟随）起步，auto 不是选项
    else if (!(p.ui && p.default === 'auto') && !p.options.some((o) => o.value === p.default)) warn(`${p.id} 默认值 ${String(p.default)} 不在选项里`);
  }
  if ((p.kind === 'range' || p.kind === 'int') && p.default !== 'auto' && (Number(p.default) < (p.min ?? -Infinity) || Number(p.default) > (p.max ?? Infinity))) warn(`${p.id} 默认值越界`);
}
const noPort = params.filter((p) => !p.port && !p.options?.some((o) => o.port));
console.log(`  参数 ${params.length} 个，维度 ${DIMS.length} 个，没有迁移说明的参数 ${noPort.length} 个`);
for (const d of DIMS) {
  const ps = params.filter((p) => p.dim === d.id);
  const opts = ps.reduce((n, p) => n + (p.options?.length ?? 0), 0);
  console.log(`  ${d.label.padEnd(6, '　')} 参数 ${String(ps.length).padStart(2)}，选项 ${opts}`);
}

console.log('== 配方');
for (const r of RECIPES) {
  for (const [id, v] of Object.entries(r.values)) {
    const p = getParam(id);
    if (!p) warn(`配方 ${r.id} 用了未知参数 ${id}`);
    else if (p.kind === 'choice' && !p.options?.some((o) => o.value === v)) warn(`配方 ${r.id}：${id} 没有选项 ${String(v)}`);
  }
  for (const id of r.firstTry) if (!getParam(id)) warn(`配方 ${r.id} 的"先调"参数 ${id} 不存在`);
}
console.log(`  配方 ${RECIPES.length} 套，其中完全可实时 ${RECIPES.filter((r) => !r.missing.length).length} 套`);

console.log('== UI 呈现内容');
{
  const genres = new Set(getParam('game.genre')?.options?.map((o) => o.value) ?? []);
  const ids = new Set<string>();
  for (const c of UI_CONTENT) {
    if (ids.has(c.id)) warn(`UI 呈现内容 id 重复：${c.id}`);
    ids.add(c.id);
    if (!c.id.startsWith(c.kind === 'screen' ? 'screen.' : 'el.')) warn(`UI 呈现内容 ${c.id} 的前缀与类型 ${c.kind} 不符`);
    for (const g of c.genres) if (!genres.has(g)) warn(`UI 呈现内容 ${c.id} 用了不存在的品类 ${g}`);
    if (!c.forms.length) warn(`UI 呈现内容 ${c.id} 没有画法`);
  }
  for (const [src, table] of [['GameUI', GAMEUI_FUNCTION_TO_CONTENT], ['Interface In Game', IIG_ELEMENT_TO_CONTENT]] as const)
    for (const [tag, id] of Object.entries(table)) if (!ids.has(id)) warn(`${src} 标签"${tag}"指向不存在的内容 ${id}`);
  // GameUI 的功能标签要全部有对应（标签表来自 gameui-digest.json；没有这个文件就跳过）
  const digestPath = join(process.cwd(), 'docs', 'survey', 'data', 'gameui-digest.json');
  if (existsSync(digestPath)) {
    const fn = (JSON.parse(readFileSync(digestPath, 'utf8')) as { filters: { name: string; values: [string, number][] }[] }).filters.find((f) => f.name === '功能');
    for (const [tag] of fn?.values ?? []) if (!(tag in GAMEUI_FUNCTION_TO_CONTENT)) warn(`GameUI 功能标签"${tag}"还没有对应的内容分类`);
    for (const tag of Object.keys(GAMEUI_FUNCTION_TO_CONTENT)) if (fn && !fn.values.some(([t]) => t === tag)) warn(`GameUI 功能标签"${tag}"在站方分类里不存在`);
  }
  console.log(`  界面类型 ${UI_CONTENT.filter((c) => c.kind === 'screen').length} 种，信息元素 ${UI_CONTENT.filter((c) => c.kind === 'element').length} 种；GameUI 功能标签对照 ${Object.keys(GAMEUI_FUNCTION_TO_CONTENT).length} 个，Interface In Game 元素对照 ${Object.keys(IIG_ELEMENT_TO_CONTENT).length} 个`);
}

console.log('== UI 字体');
{
  // M2：字体文件、许可、体积预算，以及 src/hud/ 里的字是否都在子集里（不在就要重跑 scripts/fonts-subset.ts）
  const dir = join(process.cwd(), 'src', 'assets', 'fonts');
  let total = 0;
  for (const f of HUD_FONT_FILES) {
    const file = join(dir, f.file);
    if (!existsSync(file)) { warn(`字体文件缺失：${f.file}（重跑 npx tsx scripts/fonts-subset.ts 生成，要先把原始字体放进 qa/fonts-src/，见 CONTRIBUTING.md「改 HUD 文字与字体」；或在 PR 里说明，由维护者重新生成）`); continue; }
    total += statSync(file).size;
    const l = f.license;
    if (l.license !== 'OFL-1.1' || !l.copyright || !l.source || !l.licenseFile) warn(`字体 ${f.file} 的许可信息不完整`);
    for (const lf of licenseFilesOf(l)) if (!existsSync(join(process.cwd(), 'public', 'fonts', lf))) warn(`字体 ${f.file} 缺少许可原文 public/fonts/${lf}`);
    for (const name of new Set([f.family, f.fontName ?? f.family])) if (/source|lxgw|霞鹜|kreon|pirata|almendra|smiley|得意黑/i.test(name)) warn(`字体 ${f.file} 的名字 ${name} 用了原字体的保留名`);
  }
  if (!existsSync(join(process.cwd(), 'public', 'fonts', 'LICENSES.md'))) warn('缺少 public/fonts/LICENSES.md');
  if (total > FONT_BUDGET_KB * 1024) warn(`UI 字体总量 ${(total / 1024).toFixed(1)} KB 超过 ${FONT_BUDGET_KB.toLocaleString('en')} KB 预算`);
  const charsetPath = join(dir, 'charset.txt');
  if (existsSync(charsetPath)) {
    const have = new Set(readFileSync(charsetPath, 'utf8'));
    const missing = new Set([...hudCharSet(process.cwd())].filter((ch) => !have.has(ch)));
    if (missing.size) warn(`src/hud/ 里有 ${missing.size} 个字不在字体子集里（${[...missing].slice(0, 20).join('')}…），请重跑 npx tsx scripts/fonts-subset.ts（要先把原始字体放进 qa/fonts-src/，见 CONTRIBUTING.md「改 HUD 文字与字体」），或在 PR 里说明，由维护者重新生成`);
  }
  // M12b-54：只收展示用字的中文字族（站酷快乐体、得意黑）——把界面按展示字体画一遍（scripts/display-chars.ts），展示角色画到的字都要在展示字表里；
  // 漏了的字在浏览器里会落到黑体（同一行两种字），不许静默回退
  let dispNote = '';
  if (HUD_FONT_FILES.some((f) => f.charset === 'display')) {
    const dPath = join(dir, 'display-charset.txt');
    const dc = displayCharset();
    for (const e of dc.errors.slice(0, 5)) warn(`展示用字扫描画出错：${e}`);
    if (!existsSync(dPath)) warn('缺少 src/assets/fonts/display-charset.txt（重跑 npx tsx scripts/fonts-subset.ts 生成，要先把原始字体放进 qa/fonts-src/，见 CONTRIBUTING.md「改 HUD 文字与字体」；或在 PR 里说明，由维护者重新生成）');
    else {
      const have = new Set(readFileSync(dPath, 'utf8'));
      const miss = [...dc.text].filter((ch) => !have.has(ch));
      if (miss.length) warn(`展示角色画到的 ${miss.length} 个字不在展示字表里（会落到黑体）：${miss.slice(0, 12).map((ch) => `${ch}（${dc.sweep.where.get(ch) ?? '保底标点'}）`).join('、')}${miss.length > 12 ? '…' : ''}，请重跑 npx tsx scripts/fonts-subset.ts（要先把原始字体放进 qa/fonts-src/，见 CONTRIBUTING.md「改 HUD 文字与字体」），或在 PR 里说明，由维护者重新生成`);
      const stale = [...have].filter((ch) => !dc.text.includes(ch));
      dispNote = `；展示字表 ${have.size} 字（汉字 ${dc.cjk}），扫了 ${dc.configs.toLocaleString('en')} 屏，漏字 ${miss.length}${stale.length ? `，多收 ${stale.length} 字（可重跑 fonts-subset 收紧）` : ''}`;
    }
  }
  console.log(`  字体 ${HUD_FONT_FILES.length} 个文件，合计 ${(total / 1024).toFixed(1)} KB（预算 ${FONT_BUDGET_KB.toLocaleString('en')} KB，余 ${(FONT_BUDGET_KB - total / 1024).toFixed(1)} KB）${dispNote}`);
  // 参数表里字族取值的 aliasOf / needs 与 FONT_ROLES 一致（M12b-54）：没有字体文件 = 标 aliasOf + needs: asset；有了文件就去掉 aliasOf（check-param-vectors 按 aliasOf 提醒复刻）
  type FamOpt = { value: string; needs?: string; aliasOf?: string };
  const ups = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'survey', 'data', 'ui-param-system.json'), 'utf8')) as { groups: { params: { id: string; options?: FamOpt[] }[] }[] };
  for (const p of ups.groups.flatMap((g) => g.params).filter((x) => x.id === 'typ.body.family' || x.id === 'typ.display.family')) {
    for (const o of p.options ?? []) {
      // calligraphy（标题走书法位图）与 ransom（逐字混排几套已有字体）的 needs: asset 另有含义，不核对
      if (!FONT_ROLES[o.value] || o.value === 'calligraphy' || o.value === 'ransom') continue;
      const alias = !roleHasFont(o.value);
      if (alias !== !!o.aliasOf) warn(`${p.id} = ${o.value}：${alias ? '没有字体文件，参数表要标 aliasOf' : '已有字体文件，参数表还标着 aliasOf'}（docs/survey/data/ui-param-system.json）`);
      if (!alias && o.needs === 'asset') warn(`${p.id} = ${o.value}：已有字体文件，needs 不该还是 asset`);
    }
  }
}

console.log('== UI 参数体系');
{
  const raw = readFileSync(join(process.cwd(), 'docs', 'survey', 'data', 'ui-param-system.json'), 'utf8');
  const hash = createHash('sha1').update(raw.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
  if (SPEC.hash !== hash) warn(`src/content/uiSpec.gen.json 过期（${SPEC.hash} ≠ ${hash}），请运行 npx tsx scripts/ui-spec-build.ts`);
  const ui = params.filter((p) => p.ui);
  const byStatus = ui.reduce<Record<string, number>>((a, p) => { const k = p.status ?? 'live'; a[k] = (a[k] ?? 0) + 1; return a; }, {});
  // 解析默认值不该出错，也不该有违例
  const r0 = resolveUi(defaultValues());
  for (const w of r0.warnings) warn(`默认值就违反约束 ${w.id}：${w.why}`);
  const notImpl = SPEC.derived.filter((r) => !IMPLEMENTED_RULES.has(r.id));
  console.log(`  参数 ${ui.length}（${Object.entries(byStatus).map(([k, n]) => `${k} ${n}`).join(' / ')}）· 派生规则 ${SPEC.derived.length}，已实现 ${SPEC.derived.length - notImpl.length}`);
  if (notImpl.length) console.log(`  · 未实现的规则（按里程碑补）：${notImpl.map((r) => r.id).join('、')}`);
  for (const id of IMPLEMENTED_RULES) if (!SPEC.derived.some((r) => r.id === id) && !id.startsWith('a11y.') && !/^D-(implies|reduceMotion|reduceTransparency|palette|input|harmony|iconSet|ops)$/.test(id)) warn(`派生规则 ${id} 在代码里实现了，但调研 JSON 里没有登记`);
  // 反例：v1 的 7 个自相矛盾组合必须被拦下（第 4.5 节）
  const CASES: [string, Record<string, Raw>, string][] = [
    ['skin.filigree：无底 + 深色面板', { 'vis.opacity': 0, 'col.lightness': 'dark' }, 'C-inactive'],
    ['skin.glass：不透明度 0 却设了填充', { 'vis.opacity': 0, 'ast.core': 'procedural', 'vis.fill': 'gradient' }, 'C-inactive'],
    ['skin.pixel：外框是素材却设转角', { 'ast.frame': 'carvedNinePatch', 'vis.corner': 'round' }, 'C-inactive'],
    ['tpl.cutscene：不画 UI + 字幕', { 'lay.container': 'none', 'cnt.elements': ['el.subtitle'] }, 'C-none-empty'],
    ['ex.nightCall：不画 UI + 选项', { 'lay.container': 'none', 'cnt.elements': ['el.choices'] }, 'C-none-empty'],
    ['tpl.confirm：二次确认弹窗自身又要二次确认', { 'cnt.subtype': 'confirm', 'ix.confirm': 'double' }, 'C-confirm-self'],
    ['同屏灰度锁 + 灰化完成', { 'st.locked': 'grayscale', 'st.done': 'grayOut' }, 'C-st-channels'],
  ];
  let caught = 0;
  for (const [name, vals, expect] of CASES) {
    const r = new Resolved({});
    for (const [k, v] of Object.entries(vals)) r.put(k, v, { layer: 'skin', ref: 'test' });
    const hits = checkResolved(r, { inactive: true }).map((x) => x.id);
    if (hits.includes(expect)) caught++;
    else warn(`反例没有被拦下：${name}（应由 ${expect} 报出，实际 ${hits.join('、') || '无'}）`);
  }
  console.log(`  反例 ${CASES.length} 个，拦下 ${caught} 个`);
  // 每个预设单独套用后解析：不该违反错误级约束
  const SEL: Partial<Record<string, string>> = { platform: 'uip.platform', business: 'uip.business', layout: 'uip.layout', screen: 'uip.screen', pattern: 'uip.pattern', container: 'uip.container', keyword: 'uip.keyword', theme: 'uip.theme' };
  const base = defaultValues();
  let runs = 0;
  const bad = new Map<string, string[]>();
  for (const pr of PRESETS) {
    const key = pr.kind === 'skin' ? 'hud.style' : SEL[pr.kind];
    if (!key) continue;
    const v = { ...base, [key]: pr.kind === 'skin' ? skinValueOf(pr.id) : pr.id };
    const r = resolveUi(v);
    runs++;
    // C-inactive 只看预设自己写的值（"被它自己的其它值关掉"），跨层的由界面上的"不生效"提示
    const own = new Set(Object.keys(pr.values));
    for (const x of checkResolved(r, { inactive: true, own })) if (x.level === 'error') bad.set(`${x.id}`, [...(bad.get(x.id) ?? []), `${pr.id}${x.keys ? `（${x.keys.join('、')}）` : ''}`]);
  }
  console.log(`  预设单独解析 ${runs} 次`);
  for (const [id, list] of bad) warn(`预设违反约束 ${id} × ${list.length}：${list.slice(0, 8).join('；')}${list.length > 8 ? '…' : ''}`);
  // 旧皮肤的取值都还在
  for (const sk of presetsOf('skin')) if (sk.existing && !SKINS.some((x) => x.id === sk.existing)) warn(`皮肤预设 ${sk.id} 指向不存在的旧皮肤 ${sk.existing}`);
}

console.log('== UI 参考卡');
{
  // R2：每张卡的参数键与取值都要在参数体系词表里（docs/survey/data/ui-param-system.json）
  const specPath = join(process.cwd(), 'docs', 'survey', 'data', 'ui-param-system.json');
  const refsPath = join(process.cwd(), 'src', 'content', 'uiRefs.json');
  if (existsSync(specPath) && existsSync(refsPath)) {
    type Opt = { value: string | number | boolean };
    const spec = JSON.parse(readFileSync(specPath, 'utf8')) as { groups: { params: { id: string; kind: string; options?: Opt[] }[] }[] };
    const params = new Map(spec.groups.flatMap((g) => g.params).map((p) => [p.id, p]));
    const base = (k: string) => {
      const b = k.split('@')[0];
      if (params.has(b)) return b;
      const m = /^el\.[a-zA-Z]+\.(\w+)$/.exec(b);
      return m && params.has(`elx.${m[1]}`) ? `elx.${m[1]}` : null;
    };
    const cards = (JSON.parse(readFileSync(refsPath, 'utf8')) as { cards: { id: string; name: string; params: Record<string, unknown>; screens: string[] }[] }).cards;
    const screens = new Set(UI_CONTENT.map((c) => c.id));
    for (const c of cards) {
      for (const [k, v] of Object.entries(c.params)) {
        const b = base(k);
        if (!b) { warn(`参考卡 ${c.name}：未知参数 ${k}`); continue; }
        const p = params.get(b)!;
        if (!p.options?.length || ['range', 'int', 'color', 'gradient'].includes(p.kind)) continue;
        for (const x of Array.isArray(v) ? v : [v]) if (!p.options.some((o) => o.value === x)) warn(`参考卡 ${c.name}：${k} 的取值 ${String(x)} 不在词表里`);
      }
      for (const s of c.screens) if (!screens.has(s)) warn(`参考卡 ${c.name}：未知界面 ${s}`);
    }
    console.log(`  参考卡 ${cards.length} 张，取值 ${cards.reduce((n, c) => n + Object.keys(c.params).length, 0)} 个`);
    // R3：有 Steam appid 的卡都要有评测统计（docs/survey/data/ui-review-stats.json，scripts/refs/r3-reviews.py）
    const statsPath = join(process.cwd(), 'docs', 'survey', 'data', 'ui-review-stats.json');
    if (existsSync(statsPath)) {
      const stats = JSON.parse(readFileSync(statsPath, 'utf8')) as { apps: Record<string, { n: number }> };
      const withApp = (cards as { appid?: number; name: string }[]).filter((c) => c.appid);
      // 没有条目 = 还没跑过；有条目但 0 条 = Steam 上这两种语言确实没有评测（如 Wash Card），不算缺
      const missing = withApp.filter((c) => !stats.apps[String(c.appid)]);
      const empty = withApp.filter((c) => stats.apps[String(c.appid)] && !stats.apps[String(c.appid)].n);
      if (missing.length) warn(`有 ${missing.length} 张带 appid 的参考卡没有评测统计（重跑 scripts/refs/r3-reviews.py）：${missing.slice(0, 5).map((c) => c.name).join('、')}`);
      console.log(`  评测统计覆盖 ${withApp.length - missing.length} / ${withApp.length} 张带 appid 的卡${empty.length ? `（其中 ${empty.length} 款没有英文 / 简中评测：${empty.slice(0, 3).map((c) => c.name).join('、')}）` : ''}`);
    }
  }
}

console.log('== 素材');
{
  // AI 生成 / 程序生成的素材：登记表里的每个文件都要在 public/assets/tex/ 下（M11 的 UI 素材也在这里）
  const reg = JSON.parse(readFileSync(join(process.cwd(), 'src', 'content', 'assets.json'), 'utf8')) as { assets: { id: string; kind: string; files: Record<string, string> }[] };
  let nFiles = 0;
  for (const a of reg.assets) for (const f of Object.values(a.files)) { nFiles++; if (!existsSync(join(process.cwd(), 'public', 'assets', 'tex', f))) warn(`素材 ${a.id} 缺文件 ${f}`); }
  const ui = reg.assets.filter((a) => a.kind.startsWith('ui'));
  console.log(`  素材 ${reg.assets.length} 条（其中游戏 UI ${ui.length} 条），文件 ${nFiles} 个`);
}

console.log('== 内容包的结构化样本与示例文字');
{
  // M12b-62 / 61：24 个包都要写全结构化样本（samplesFor 的类别）、按界面的示例文字的新槽位至少一条通用值、页签图标与对话正文；
  // 模板的数据形状要某类样本、包里没有时 samplesFor 回落到 GENERIC（这里报出来，免得新包悄悄用了通用样本）
  const NEW_SLOTS = ['bark', 'check', 'objective', 'original'] as const;
  const VARIANT_SLOTS = ['tabs', 'header', 'buttons', 'band', 'focalTitle'] as const;
  let nPacks = 0;
  for (const p of PACKS.values()) {
    nPacks++;
    const miss = missingSamples(p);
    if (miss.length) warn(`内容包 ${p.id} 缺结构化样本：${miss.join('、')}（会回落到 GENERIC 的通用样本）`);
    for (const slot of NEW_SLOTS) if (!hasGenericText(slot, p)) warn(`内容包 ${p.id} 的示例文字槽位 ${slot} 没有通用值`);
    for (const slot of VARIANT_SLOTS) if (!p.texts?.[slot]?.length) warn(`内容包 ${p.id} 的示例文字槽位 ${slot} 没有按界面的变体`);
    if ((p.screens.tabIcons?.length ?? 0) < p.screens.tabs.length) warn(`内容包 ${p.id} 的 screens.tabIcons 少于页签数（icon 画法会退回文字）`);
    if ((p.menu.tabIcons?.length ?? 0) < p.menu.tabs.length) warn(`内容包 ${p.id} 的 menu.tabIcons 少于页签数`);
    if (!p.screens.passage) warn(`内容包 ${p.id} 没有对话 / 事件正文 screens.passage（对话类模板会画公告）`);
    if (!p.hud.quickItems?.length) warn(`内容包 ${p.id} 没有快捷物品 hud.quickItems`);
    if (!p.hud.resExtra?.length) warn(`内容包 ${p.id} 没有第 4 项起的资源 hud.resExtra`);
    // 富文本标记要成对：{k:…} 之类没闭合的会原样画出来
    const texts = [p.screens.passage, p.menu.detail.desc, ...(p.screens.talents ?? []).map((t) => t[2]), ...(p.screens.codex ?? []).map((c) => c[2]), ...p.hud.choices].filter((x): x is string => !!x);
    for (const t of texts) if (/\{[kbdux]:[^}]*$|\{c[1-5]:[^}]*$|\[\[[^\]]*$/.test(t)) warn(`内容包 ${p.id} 的富文本标记没闭合：${t.slice(0, 30)}`);
    // 信息流里的「目标更新：X」与目标的文字式（texts.objective 的标题）在同一帧里出现，要是同一件事（终期审查修复 ⑧：shooter 包的目标写「夺回控制室」、
    // 信息流写「目标更新：夺回控制舱」）；X 也可以是目标清单 hud.objective / 任务名里的一条
    const norm = (s: string) => s.replace(/\s+/g, '');
    const objNames = [...(p.texts?.objective ?? []).map((v) => norm(v.value[0] ?? '')), ...p.hud.objective.map(norm), ...(p.screens.quests ?? []).map((q) => norm(q[0]))].filter(Boolean);
    const objTitles = (p.texts?.objective ?? []).map((v) => norm(v.value[0] ?? '')).filter(Boolean);
    for (const f of [...p.hud.feed, ...(p.texts?.feed ?? []).flatMap((v) => v.value)]) {
      const m = /目标更新[:：]\s*(.+)$/.exec(f), t = m ? norm(m[1]) : '';
      if (!t) continue;
      if (objTitles.length ? !objTitles.includes(t) : !objNames.includes(t)) warn(`内容包 ${p.id} 的信息流「${f}」与目标${objTitles.length ? `文字式的标题「${(p.texts?.objective ?? [])[0]?.value[0]}」` : ' / 任务名'}对不上（同一帧里两个目标）`);
    }
  }
  if (missingSamples(packById('snowline')).length) warn('雪线旅人缺结构化样本');
  // 变体条件的取值要在词表里（中期审查修复 ⑬：25 条横带变体写了 tone = triumphant，cnt.tone 原来没有这个取值，textPick 永远对不上）：
  // when.tone / stage / screen / subtype 对 cnt.* 的取值，when.group 对 texts.ts 的界面组
  const VOCAB: Record<string, Set<string>> = {
    tone: new Set((SPEC_PARAM.get('cnt.tone')?.options ?? []).map((o) => String(o.value))), stage: new Set((SPEC_PARAM.get('cnt.stage')?.options ?? []).map((o) => String(o.value))),
    screen: new Set((SPEC_PARAM.get('cnt.screen')?.options ?? []).map((o) => String(o.value))), subtype: new Set((SPEC_PARAM.get('cnt.subtype')?.options ?? []).map((o) => String(o.value))),
    group: new Set(SCREEN_GROUP_NAMES),
  };
  let nWhen = 0;
  for (const [pid, texts] of [['GENERIC', GENERIC.texts], ...[...PACKS.values()].map((p) => [p.id, p.texts] as const)] as const) {
    for (const [slot, vs] of Object.entries(texts ?? {})) for (const v of (vs ?? []) as { when?: Record<string, string | string[] | undefined> }[]) {
      for (const [k, val] of Object.entries(v.when ?? {})) for (const x of [val ?? []].flat()) {
        nWhen++;
        if (!VOCAB[k]) warn(`示例文字 ${pid}.${slot} 的变体条件 ${k} 不认识`);
        else if (!VOCAB[k].has(x)) warn(`示例文字 ${pid}.${slot} 的变体条件 ${k} = ${x} 不在词表里（这条变体永远取不到）`);
      }
    }
  }
  console.log(`  示例文字变体的条件取值 ${nWhen} 个，都在 cnt.tone / stage / screen / subtype 与界面组的词表里`);
  console.log(`  内容包 ${nPacks} 个：结构化样本 ${SAMPLE_KEYS.length} 类、示例文字槽位（通用值 ${NEW_SLOTS.length} 个 + 按界面变体 ${VARIANT_SLOTS.length} 个）都已核对`);
}

console.log('== 色板');
for (const p of PALETTES) for (const [role] of ROLES) if (!/^#[0-9a-fA-F]{6}$/.test(p.roles[role])) warn(`色板 ${p.id} 的 ${role} 颜色无效：${p.roles[role]}`);
console.log(`  色板 ${PALETTES.length} 个`);

console.log('== 场景');
const missingBuilders = SCENES.filter((s) => !hasSceneBuilder(s.id));
missingBuilders.forEach((s) => warn(`场景 ${s.id} 没有构建器`));
const covered = new Set(SCENES.filter((s) => hasSceneBuilder(s.id)).map((s) => s.category));
const gaps = SCENE_CATEGORIES.map(([c]) => c).filter((c) => !covered.has(c));
console.log(`  已实现场景 ${SCENES.length - missingBuilders.length} 个，覆盖 ${covered.size}/${SCENE_CATEGORIES.length} 类；待实现类别：${gaps.join('、') || '无'}`);

if (existsSync('src/content/styles.data.ts')) {
  console.log('== 风格图谱');
  const { STYLES, MOODS, CULTURES } = await import('../src/content/styles.data');
  const { capabilityOf, invalidApprox, CAP_LABEL } = await import('../src/content/styles');
  const { defaultValues } = await import('../src/dims/registry');
  const hist: Record<string, number> = {};
  for (const s of STYLES) {
    for (const b of invalidApprox(s)) warn(`风格 ${s.id}：${b}`);
    const st = capabilityOf(s, defaultValues()).state;
    hist[st] = (hist[st] ?? 0) + 1;
  }
  console.log(`  风格 ${STYLES.length} 种，情绪 ${MOODS.length}，文化题材 ${CULTURES.length}`);
  console.log('  能力分布：' + Object.entries(hist).map(([k, n]) => `${CAP_LABEL[k as keyof typeof CAP_LABEL]} ${n}`).join('，'));
}

if (existsSync('src/content/cases/cases.json')) {
  console.log('== 案例库');
  const { readFileSync } = await import('node:fs');
  type C = { appid: number | null; images?: { thumbs?: string[] }; sources?: string[]; verifiedAt?: string };
  const raw = JSON.parse(readFileSync('src/content/cases/cases.json', 'utf8')) as C[] | { cases?: C[] };
  const cases: C[] = Array.isArray(raw) ? raw : raw.cases ?? [];
  const withImg = cases.filter((c) => c.images?.thumbs?.length).length;
  const noSrc = cases.filter((c) => !c.sources?.length && !c.appid).length;
  if (noSrc) warn(`${noSrc} 个案例既没有 appid 也没有来源`);
  console.log(`  案例 ${cases.length} 个，有截图 ${withImg} 个，Steam ${cases.filter((c) => c.appid).length} 个`);

  // 视觉拆解：id 对得上案例，近似参数只用有效参数 / 选项 / 范围，配方存在
  const { readdirSync } = await import('node:fs');
  const ids = new Set((cases as (C & { id: string })[]).map((c) => c.id));
  type A = { id: string; approx?: Record<string, string | number | boolean>; recipe?: string | null; teardown?: Record<string, string> };
  let analyzed = 0;
  const seen = new Set<string>();
  for (const f of readdirSync('src/content/cases').filter((x) => /^analysis-.*\.json$/.test(x))) {
    const list = JSON.parse(readFileSync(`src/content/cases/${f}`, 'utf8')) as A[];
    for (const a of list) {
      analyzed++;
      if (!ids.has(a.id)) warn(`${f}: 案例 ${a.id} 不存在`);
      if (seen.has(a.id)) warn(`${f}: 案例 ${a.id} 重复拆解`);
      seen.add(a.id);
      if (a.recipe && !RECIPES.some((r) => r.id === a.recipe)) warn(`${f}: ${a.id} 的配方 ${a.recipe} 不存在`);
      if (!a.teardown || Object.keys(a.teardown).length < 5) warn(`${f}: ${a.id} 的视觉拆解不完整`);
      for (const [k, v] of Object.entries(a.approx ?? {})) {
        const p = getParam(k);
        if (!p) { warn(`${f}: ${a.id} 用了未知参数 ${k}`); continue; }
        if (p.kind === 'choice' && !p.options?.some((o) => o.value === v)) warn(`${f}: ${a.id} 的 ${k} 没有选项 ${String(v)}`);
        if ((p.kind === 'range' || p.kind === 'int') && (typeof v !== 'number' || v < (p.min ?? -Infinity) || v > (p.max ?? Infinity))) warn(`${f}: ${a.id} 的 ${k}=${String(v)} 超出范围`);
      }
    }
  }
  console.log(`  视觉拆解 ${analyzed} 条（${seen.size} 款）`);
}

console.log(problems ? `\n共 ${problems} 个问题` : '\n没有发现问题');
process.exitCode = problems ? 1 : 0;
