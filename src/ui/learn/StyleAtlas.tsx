import { useMemo, useState } from 'react';
import { CASES } from '../../content/cases';
import { RECIPE_MAP } from '../../content/recipes';
import { CAP_LABEL, capabilityOf, effectiveApprox, type CapState, type StyleEntry } from '../../content/styles';
import { STYLES } from '../../content/styles.data';
import { defaultValues } from '../../dims/registry';
import { applyStyle } from '../../state/actions';
import { useStore } from '../../state/store';

const CAP_CLASS: Record<CapState, string> = { live: 'ok', partial: 'warn', needsAsset: 'warn', reference: '', todo: '' };
const caseByName = new Map(CASES.flatMap((c) => [[c.name.toLowerCase(), c], ...(c.nameZh ? [[c.nameZh, c] as const] : [])]));

/** 风格图谱：227 种风格，能力状态按实现情况自动计算 */
export function StyleAtlas() {
  const [q, setQ] = useState('');
  const [cap, setCap] = useState<CapState | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const base = useStore((s) => s.baseStyle);
  const caps = useMemo(() => {
    const d = defaultValues();
    return new Map(STYLES.map((s) => [s.id, capabilityOf(s, d)]));
  }, []);
  const hist = useMemo(() => {
    const h: Partial<Record<CapState, number>> = {};
    for (const c of caps.values()) h[c.state] = (h[c.state] ?? 0) + 1;
    return h;
  }, [caps]);
  const filtered = STYLES.filter((s) => {
    if (cap !== 'all' && caps.get(s.id)?.state !== cap) return false;
    if (!q) return true;
    const t = `${s.name}${s.nameEn ?? ''}${s.group}${s.definition}${s.representatives.map((r) => r.name).join('')}${(s.moods ?? []).join('')}${(s.cultures ?? []).join('')}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });
  const groups = new Map<string, StyleEntry[]>();
  for (const s of filtered) {
    if (!groups.has(s.group)) groups.set(s.group, []);
    groups.get(s.group)!.push(s);
  }
  return (
    <>
      <div className="hint">调研整理的 {STYLES.length} 种风格。能力状态按"它需要的参数是否都已实现、还缺什么"自动计算；模块补上后会自动升级。</div>
      <div style={{ padding: '0 10px' }}>
        <input className="search" placeholder="搜索：风格、游戏、情绪、文化…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          <span className={`chip link ${cap === 'all' ? 'blue' : ''}`} onClick={() => setCap('all')}>全部 {STYLES.length}</span>
          {(Object.keys(CAP_LABEL) as CapState[]).filter((k) => hist[k]).map((k) => (
            <span key={k} className={`chip link ${cap === k ? 'blue' : CAP_CLASS[k]}`} onClick={() => setCap(k)}>{CAP_LABEL[k]} {hist[k]}</span>
          ))}
        </div>
      </div>
      {[...groups.entries()].map(([g, list]) => (
        <div key={g}>
          <div className="section-title">{g} · {list.length}</div>
          {list.map((s) => {
            const c = caps.get(s.id)!;
            const isOpen = open === s.id;
            return (
              <div key={s.id} className={`card ${base === s.id ? 'on' : ''}`} onClick={() => setOpen(isOpen ? null : s.id)}>
                <h4>{s.code} {s.name}{s.nameEn ? <span className="term"> {s.nameEn}</span> : null}</h4>
                {!isOpen && <p>{s.definition}</p>}
                <div className="chips">
                  <span className={`chip ${CAP_CLASS[c.state]}`}>{CAP_LABEL[c.state]}</span>
                  {s.recipe && <span className="chip blue">配方：{RECIPE_MAP.get(s.recipe)?.name}</span>}
                  {!isOpen && (s.moods ?? []).slice(0, 2).map((m) => <span key={m} className="chip">{m}</span>)}
                </div>
                {isOpen && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <p style={{ marginTop: 6 }}>{s.definition}</p>
                    <p><b>关键机制：</b>{s.mechanisms}</p>
                    <p><b>区别：</b>{s.differs}</p>
                    {s.representatives.length > 0 && (
                      <div className="chips">
                        <span className="chip">代表作：</span>
                        {s.representatives.map((r) => {
                          const hit = caseByName.get(r.name.toLowerCase()) ?? caseByName.get(r.name);
                          return hit ? (
                            <span key={r.name} className="chip blue link" onClick={() => useStore.getState().setCaseId(hit.id)}>{r.name}</span>
                          ) : (
                            <span key={r.name} className="chip">{r.name}{r.platform ? `（${r.platform}）` : ''}</span>
                          );
                        })}
                      </div>
                    )}
                    {c.reasons.length > 0 && (
                      <div className="chips">{c.reasons.slice(0, 6).map((n) => <span key={n} className="chip warn">缺：{n}</span>)}</div>
                    )}
                    {c.resolved.length > 0 && (
                      <div className="chips">{c.resolved.map((n) => <span key={n} className="chip ok">已补上：{n}</span>)}</div>
                    )}
                    {(s.cultures ?? []).length > 0 && <div className="chips">{s.cultures!.map((x) => <span key={x} className="chip">{x}</span>)}</div>}
                    <div className="chips" style={{ marginTop: 8 }}>
                      {Object.keys(effectiveApprox(s)).length > 0 ? (
                        <button className="btn small primary" onClick={() => applyStyle(s)}>载入近似参数（{Object.keys(effectiveApprox(s)).length} 项）</button>
                      ) : (
                        <span className="chip">还没有可执行的参数组合，已列入待办</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
