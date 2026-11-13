import { useEffect, useMemo, useState } from 'react';
import { RECIPE_MAP } from '../content/recipes';
import { getParam, labelOf } from '../dims/registry';
import { artPrompt, type PromptLang } from '../export/artPrompt';
import { familyFor, prefetchFamilies, promptSkin } from './deck/deckData';
import { strToU8, zipSync } from 'fflate';
import { assetUrl } from '../content/assets';
import { hudFontUrl } from '../hud/fonts';
import { aiPrompt, describeVisualText, parseRecipe, recipeJson, targetBrief, type TargetEngine } from '../export/describe';
import { STYLES } from '../content/styles.data';
import { remainingNeeds } from '../content/styles';

/** Brief 用的风格：缺口只列还没补上的 */
const briefStyle = (id: string | null) => {
  const s = STYLES.find((x) => x.id === id);
  return s ? { ...s, needs: remainingNeeds(s) } : null;
};
import { godotPackage } from '../export/godot';
import { checkPrompt, INSPIRATION_PROMPT } from '../export/promptCheck';
import { useStore } from '../state/store';
import { useShell } from './stage/shell';

/*
 * 导出 / 体检对话框（轨道 B，docs/workbench-redesign.md §10：合并成一个导出对话框；导入放到 ⋯ → 导入配方（打开 JSON 页）；Godot 只在开发者模式）。
 * 打开时停在哪一页由 useShell().exportTab 决定（顶栏「导出▾」的各项）。页签名和「导出▾」菜单同一套中文名（审查修复 28）：
 *   画面说明 · 风格说明书 · 美术提示词（C 的 artPrompt，约 250 字，带体检；§2 F6，审查修复 12）· 编码提示词 · 参数 JSON（· Godot 迁移包，开发者模式）。
 * 「提示词体检」（粘贴一段提示词 → 映射成参数、载入为实验）是反方向的工具，放在 ⋯ → 提示词体检（导入）。
 * 导入配方走 A 的 store.restore（精确替换、带来源，不漏键）。
 */

type ExportKind = 'visual' | 'brief' | 'prompt' | 'ai' | 'json' | 'godot';
const KINDS: [ExportKind, string][] = [['visual', '画面说明'], ['brief', '风格说明书'], ['prompt', '美术提示词'], ['ai', '编码提示词'], ['json', '参数 JSON']];
export function Dialogs() {
  const dialog = useStore((s) => s.dialog);
  const setDialog = useStore((s) => s.setDialog);
  if (!dialog) return null;
  return (
    <div className="dialog-mask" onClick={() => setDialog(null)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog">
        {dialog === 'export' && <ExportBody />}
        {dialog === 'check' && <CheckBody />}
      </div>
    </div>
  );
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function download(name: string, text: string, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function ExportBody() {
  const values = useStore((s) => s.values);
  const base = useStore((s) => s.baseRecipe);
  const setDialog = useStore((s) => s.setDialog);
  const dev = useShell((s) => s.dev);
  const tab0 = useShell((s) => s.exportTab);
  const [kind, setKind] = useState<ExportKind>(() => (KINDS.some(([k]) => k === tab0) || (tab0 === 'godot' && dev) ? tab0 as ExportKind : 'visual'));
  const baseStyle = useStore((s) => s.baseStyle);
  const origin = useStore((s) => s.origin);
  const [lang, setLang] = useState<PromptLang>('zh');
  // 配套 UI 家族的语法是懒加载的大文件：打开美术提示词页时取一次，取到后重算
  const [famReady, setFamReady] = useState(0);
  useEffect(() => { if (kind === 'prompt') void prefetchFamilies().then(() => setFamReady((x) => x + 1)).catch(() => {}); }, [kind]);
  const prompt = useMemo(() => {
    if (kind !== 'prompt') return null;
    const r = base ? RECIPE_MAP.get(base) : undefined;
    const skin = promptSkin(r, values, origin);
    return artPrompt({ values, recipeId: r?.id ?? null, skin, family: familyFor(r, skin), lang });
  }, [kind, values, base, origin, lang, famReady]);
  const godotFiles = useMemo(() => (kind === 'godot' ? godotPackage(values) : []), [kind, values]);
  const [godotFile, setGodotFile] = useState('art_style.gdshader');
  const [target, setTarget] = useState<TargetEngine>('three');
  const text = useMemo(() => {
    if (kind === 'prompt') return prompt?.text ?? '';
    if (kind === 'visual') return describeVisualText(values, base);
    if (kind === 'ai') return aiPrompt(values, target, base);
    if (kind === 'brief') return targetBrief(values, base, briefStyle(baseStyle));
    if (kind === 'godot') {
      const f = godotFiles.find((x) => x.path === godotFile);
      if (f?.font) return `（UI 字体 WOFF2，打包时从 src/assets/fonts/${f.font} 原样拷贝；SIL OFL 1.1，许可原文同目录）`;
      if (f?.license) return `（字体许可原文，打包时从 public/fonts/${f.license} 拷贝）`;
      return f?.asset ? `（二进制素材，打包时从 public/assets/tex/${f.asset} 原样拷贝；来源与提示词见 src/content/assets.json）` : f?.text ?? '';
    }
    return recipeJson(values, base);
  }, [kind, target, values, base, godotFiles, godotFile, baseStyle, prompt]);
  const downloadZip = async () => {
    // 素材 PNG 按原样打进包里（textures/）
    // 二进制：素材贴图、UI 字体（Vite 打包后的地址）、字体许可原文（public/fonts/）
    const bin = async (u: string) => new Uint8Array(await (await fetch(u)).arrayBuffer());
    const entries = await Promise.all(godotFiles.map(async (f) => [f.path,
      f.asset ? await bin(assetUrl(f.asset))
        : f.font ? await bin(hudFontUrl(f.font) ?? '')
          : f.license ? await bin(`${import.meta.env.BASE_URL}fonts/${f.license}`)
            : strToU8(f.text)] as const));
    const z = zipSync(Object.fromEntries(entries));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([z.slice().buffer], { type: 'application/zip' }));
    a.download = 'godot-art-style.zip';
    a.click();
  };
  return (
    <>
      <div className="dialog-head">
        <h3>导出</h3>
        <div className="seg">
          {KINDS.map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
          {dev && <button className={kind === 'godot' ? 'on' : ''} onClick={() => setKind('godot')}>Godot 迁移包</button>}
        </div>
        {kind === 'prompt' && (
          <div className="seg">
            <button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>中文</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          </div>
        )}
        {kind === 'ai' && dev && (
          <div className="seg">
            <button className={target === 'three' ? 'on' : ''} onClick={() => setTarget('three')}>three.js</button>
            <button className={target === 'godot' ? 'on' : ''} onClick={() => setTarget('godot')}>Godot 4</button>
          </div>
        )}
        {kind === 'godot' && <button className="btn primary" onClick={downloadZip}>下载工程 zip</button>}
        <button className="btn" onClick={() => copy(text)}>复制</button>
        <button className="btn" onClick={() => download(kind === 'json' ? 'recipe.json' : kind === 'ai' ? `prompt-${target}.md` : kind === 'prompt' ? `art-prompt-${lang}.txt` : kind === 'brief' ? 'brief.md' : 'description.md', text, kind === 'json' ? 'application/json' : kind === 'prompt' ? 'text/plain' : 'text/markdown')}>下载</button>
        <button className="btn ghost" onClick={() => setDialog(null)}>关闭</button>
      </div>
      <div className="dialog-body">
        {kind === 'visual' && <p className="hint" style={{ margin: '0 0 8px' }}>只写当前确实生效的选择；不生效的参数不会出现。</p>}
        {kind === 'godot' && (
          <>
            <p className="hint" style={{ margin: '0 0 8px' }}>可直接用 Godot 4.x 打开的最小工程：表面着色（light() 实现明暗模型）、描边、后处理、环境与测试台脚本。已用 Godot 4.7.2 编译运行检查；画面是近似移植，差异写在 MIGRATION.md。</p>
            <div className="seg" style={{ marginBottom: 8 }}>
              {godotFiles.map((f) => <button key={f.path} className={f.path === godotFile ? 'on' : ''} onClick={() => setGodotFile(f.path)}>{f.path}</button>)}
            </div>
          </>
        )}
        {kind === 'ai' && <p className="hint" style={{ margin: '0 0 8px' }}>给 AI 编程助手：按灵感提示词的结构组织，附实现方式、禁止项、技术体检注意与验收方式。Godot 版给出每一项的迁移方式（尚未在引擎内验证）。</p>}
        {kind === 'prompt' && prompt && (
          <div className="prompt-check">
            <p className="hint" style={{ margin: '0 0 6px' }}>给出图 AI / 美术外包：{prompt.chars} 字，只写现在确实生效的画面，加上配套 UI 和禁用项。</p>
            {prompt.check.warnings.length > 0
              ? <ul className="check-list">{prompt.check.warnings.map((w) => <li key={w} style={{ color: 'var(--warn)' }}>体检：{w}</li>)}</ul>
              : <p className="hint" style={{ margin: '0 0 8px' }}>体检：没有发现技术误区。</p>}
          </div>
        )}
        {kind === 'json' && <ImportRecipe />}
        <pre>{text}</pre>
      </div>
    </>
  );
}

/** 导入配方：粘贴或选择 recipe.json，校验后恢复完整状态（可撤销） */
function ImportRecipe() {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const setDialog = useStore((s) => s.setDialog);
  const res = useMemo(() => (text.trim() ? parseRecipe(text) : null), [text]);
  const apply = () => {
    if (!res?.ok) return;
    // A 的 restore（'all'）：精确替换值和来源，不把当前的动态 UI 键带进来（A 审查修复 10）
    useStore.getState().restore({ values: res.values, origin: res.origin ?? undefined, baseRecipe: res.baseRecipe, baseStyle: null }, `导入配方${res.createdAt ? `（${res.createdAt.slice(0, 16).replace('T', ' ')}）` : ''}`, 'all');
    setDialog(null);
  };
  if (!open) return <p style={{ margin: '0 0 8px' }}><button className="btn small" onClick={() => setOpen(true)}>导入配方 JSON（恢复之前导出的方案）</button></p>;
  return (
    <div className="card" style={{ cursor: 'default', margin: '0 0 10px' }}>
      <h4>导入配方</h4>
      <p className="hint" style={{ margin: '0 0 6px' }}>粘贴 recipe.json 的内容，或选择文件。导入会替换当前状态（可撤销），场景、种子、镜头一并恢复。</p>
      <input type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(setText); }} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="{ &quot;schema&quot;: …, &quot;values&quot;: { … } }" style={{ minHeight: 90 }} />
      {res && !res.ok && <p className="chip warn">{res.error}</p>}
      {res?.ok && (
        <>
          <p>可恢复 {res.applied} 项参数{res.baseRecipe ? `，起点配方 ${res.baseRecipe}` : ''}{res.notes ? `；备注：${res.notes}` : ''}。</p>
          {res.problems.length > 0 && <ul className="check-list">{res.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <button className="btn primary small" onClick={apply}>恢复这个方案</button>
        </>
      )}
    </div>
  );
}

function CheckBody() {
  const setMany = useStore((s) => s.setMany);
  const setDialog = useStore((s) => s.setDialog);
  const values = useStore((s) => s.values);
  const [text, setText] = useState(INSPIRATION_PROMPT);
  const result = useMemo(() => checkPrompt(text), [text]);
  const apply = () => {
    setMany(result.changes, '提示词体检：载入');
    setDialog(null);
  };
  return (
    <>
      <div className="dialog-head">
        <h3>提示词体检</h3>
        <button className="btn primary" onClick={apply} disabled={!Object.keys(result.changes).length}>载入为实验（{Object.keys(result.changes).length} 项）</button>
        <button className="btn ghost" onClick={() => setDialog(null)}>关闭</button>
      </div>
      <div className="dialog-body">
        <p className="hint" style={{ margin: '0 0 8px' }}>粘贴一段美术或技术提示词。工具会把能识别的部分映射成参数，标出技术误区，列出识别不了的句子（本地词典匹配，不调用 AI）。</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 10 }}>
          <div>
            <h4 style={{ margin: '4px 0' }}>会改动的参数</h4>
            <ul className="check-list">
              {Object.entries(result.changes).map(([id, v]) => {
                const p = getParam(id);
                const fake = { ...values, [id]: v };
                return <li key={id}>{p?.label ?? id}：{labelOf(id, fake)}</li>;
              })}
            </ul>
            <h4 style={{ margin: '10px 0 4px' }}>识别到的说法</h4>
            <ul className="check-list">
              {result.matched.map((m, i) => <li key={i}><code>{m.phrase}</code> → {m.note}</li>)}
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '4px 0', color: 'var(--warn)' }}>技术体检（{result.warnings.length}）</h4>
            <ul className="check-list">
              {result.warnings.map((w) => <li key={w} style={{ color: 'var(--warn)' }}>{w}</li>)}
            </ul>
            <h4 style={{ margin: '10px 0 4px' }}>没识别的句子（{result.unmatched.length}）</h4>
            <ul className="check-list">
              {result.unmatched.map((u) => <li key={u} style={{ color: 'var(--text-3)' }}>{u}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
