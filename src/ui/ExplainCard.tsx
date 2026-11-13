import { useEffect, useRef } from 'react';
import { activeState, getParam, optionOf } from '../dims/registry';
import { useStore } from '../state/store';
import { useExplain } from './stage/explain';
import { useShell } from './stage/shell';

const LEVEL: Record<string, string> = {
  builtin: '直接对应（内置设置）',
  shader: '需要写着色器',
  post: '需要后处理',
  script: '需要脚本或生成器',
  texture: '需素材 / 贴图',
  hard: '困难（需专用素材或大量工作）',
};

const cut = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n)}…` : s);

/*
 * 参数说明的 ⓘ 弹窗（轨道 B，docs/workbench-redesign.md §7 T2：≤120 字 + 链接）。原来右栏底部常驻的解释卡改成按需弹出：
 *   作用（白话）· 当前选项 · 两端 · 为什么不生效 · 描述片段；按钮：▦ 扫一遍；开发者模式下另列实现、Godot 迁移、误区、术语。
 * 打开方式见 stage/explain.ts 的 openExplain。
 */
export function ExplainCard() {
  const id = useExplain((s) => s.id);
  const at = useExplain((s) => s.at);
  const close = useExplain((s) => s.close);
  const values = useStore((s) => s.values);
  const dev = useShell((s) => s.dev);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest?.('.row-info')) return;
      close();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); };
  }, [id, close]);
  const p = id ? getParam(id) : undefined;
  if (!p) return null;
  const v = values[p.id] ?? p.default;
  const opt = p.kind === 'choice' ? optionOf(p, v) : undefined;
  const act = activeState(p, values);
  const prompt = p.prompt ? p.prompt(v, values) : opt?.prompt;
  const tech = p.techPrompt?.(v, values) ?? opt?.techPrompt ?? p.explain.tech ?? opt?.tech;
  const port = opt?.port ?? p.port;
  const pitfalls = [...(opt?.pitfalls ?? []), ...(p.explain.pitfalls ?? [])];
  const term = opt?.term ?? p.explain.term;
  // 弹窗放在按钮左边（右栏在屏幕右侧）；放不下时贴着屏幕边
  const W = 300;
  const left = at ? Math.max(8, Math.min(window.innerWidth - W - 8, at.x - W - 8)) : window.innerWidth - W - 340;
  const top = at ? Math.max(52, Math.min(window.innerHeight - 260, at.top - 8)) : 120;
  return (
    <div className="explain-pop" ref={ref} style={{ left, top, width: W }} role="dialog" aria-label={`${p.label}说明`}>
      <div className="ep-head">
        <b>{p.label}</b>
        {opt && <span className="ep-opt">· {opt.label}</span>}
        <span className="tb-spacer" />
        <button className="btn ghost small" onClick={close} aria-label="关闭">×</button>
      </div>
      <p className="ep-plain">{cut(p.explain.plain, 60)}</p>
      {opt?.desc && <p className="ep-line">当前：{cut(opt.desc, 40)}</p>}
      {p.explain.ends && <p className="ep-line">{p.explain.ends[0]} ↔ {p.explain.ends[1]}</p>}
      {act !== true && <p className="ep-line pit">不生效：{cut(act, 40)}</p>}
      {prompt && <p className="ep-line ep-prompt" title={prompt}>描述：{cut(prompt, 50)}</p>}
      <div className="ep-actions">
        {p.kind !== 'color' && <button className="btn small" onClick={() => { useStore.getState().setSweep(p.id); close(); }} title="其他条件不变，把这一项的几个取值并排渲染">▦ 扫一遍</button>}
        {term && <span className="term">{term.zh}{term.en ? ` / ${term.en}` : ''}</span>}
      </div>
      {dev && (
        <dl className="ep-dev">
          {p.explain.lookAt && <><dt>看哪里</dt><dd>{p.explain.lookAt}</dd></>}
          {tech && <><dt>实现</dt><dd className="mono">{tech}</dd></>}
          {p.explain.limits && <><dt>边界</dt><dd>{p.explain.limits}</dd></>}
          {pitfalls.length > 0 && <><dt>误区</dt><dd className="pit">{pitfalls.map((x) => <div key={x}>· {x}</div>)}</dd></>}
          {port?.godot && <><dt>Godot</dt><dd>{port.godot}{port.godotLevel ? <span className="term">（{LEVEL[port.godotLevel]}）</span> : null}</dd></>}
        </dl>
      )}
    </div>
  );
}
