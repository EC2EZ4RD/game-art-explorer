import { useMemo } from 'react';
import { CASES } from '../content/cases';
import { RECIPES } from '../content/recipes';
import { SCENES, SCENE_CATEGORIES } from '../content/sceneCatalog';
import { CAP_LABEL, capabilityOf, remainingNeeds, type CapState } from '../content/styles';
import { CULTURES, MOODS, STYLES } from '../content/styles.data';
import { allParams, defaultValues } from '../dims/registry';
import { hasSceneBuilder } from '../engine/scene/sceneRegistry';
import { useStore } from '../state/store';

const STATES: CapState[] = ['live', 'partial', 'needsAsset', 'reference', 'todo'];

/** 覆盖矩阵：哪些区域有实时实验、哪些缺素材、哪些尚未研究 —— 空缺直接可见 */
export function Coverage() {
  const set = useStore((s) => s.set);
  const data = useMemo(() => {
    const d = defaultValues();
    const byGroup = new Map<string, Record<CapState, number>>();
    const needCount = new Map<string, number>();
    for (const s of STYLES) {
      const c = capabilityOf(s, d);
      const row = byGroup.get(s.group) ?? { live: 0, partial: 0, needsAsset: 0, reference: 0, todo: 0 };
      row[c.state]++;
      byGroup.set(s.group, row);
      for (const n of remainingNeeds(s)) needCount.set(n, (needCount.get(n) ?? 0) + 1);
    }
    const cultureCount = new Map(CULTURES.map((c) => [c.name, STYLES.filter((s) => (s.cultures ?? []).includes(c.name)).length]));
    const topNeeds = [...needCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { byGroup, cultureCount, topNeeds };
  }, []);
  const params = allParams();
  const options = params.reduce((n, p) => n + (p.options?.length ?? 0), 0);
  return (
    <>
      <div className="hint">覆盖不靠数量证明：下面按维度列出哪些已经能实时实验、哪些只有局部、哪些缺素材。没做出来的方向不会从分类里消失。</div>
      <div className="card" style={{ cursor: 'default' }}>
        <h4>总量</h4>
        <p>参数 {params.length} · 选项 {options} · 配方 {RECIPES.length} · 风格 {STYLES.length} · 情绪 {MOODS.length} · 文化题材 {CULTURES.length} · 场景 {SCENES.filter((s) => hasSceneBuilder(s.id)).length} · 案例 {CASES.length}</p>
      </div>
      <div className="section-title">风格 × 能力状态</div>
      <div style={{ padding: '0 10px' }}>
        <table className="cov">
          <thead><tr><th>分组</th>{STATES.map((s) => <th key={s} title={CAP_LABEL[s]}>{CAP_LABEL[s].slice(0, 2)}</th>)}</tr></thead>
          <tbody>
            {[...data.byGroup.entries()].map(([g, row]) => (
              <tr key={g}><td>{g}</td>{STATES.map((s) => <td key={s} className={row[s] ? `c-${s}` : ''}>{row[s] || ''}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section-title">最常见的缺口（补上后能升级最多风格）</div>
      <div className="chips" style={{ padding: '0 10px' }}>
        {data.topNeeds.map(([n, k]) => <span key={n} className="chip warn">{n} × {k}</span>)}
      </div>
      <div className="section-title">场景类别</div>
      <div style={{ padding: '0 10px' }}>
        <table className="cov">
          <tbody>
            {SCENE_CATEGORIES.map(([cat, checks]) => {
              const ss = SCENES.filter((s) => s.category === cat && hasSceneBuilder(s.id));
              return (
                <tr key={cat}>
                  <td title={checks}>{cat}</td>
                  <td style={{ textAlign: 'left' }}>
                    {ss.length ? ss.map((s) => <span key={s.id} className="chip ok link" onClick={() => set('game.scene', s.id)}>{s.name}</span>) : <span className="chip">待实现</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="section-title">文化与世界题材（关联的风格数）</div>
      <div className="chips" style={{ padding: '0 10px 12px' }}>
        {CULTURES.map((c) => <span key={c.id} className={`chip ${data.cultureCount.get(c.name) ? '' : 'warn'}`} title={`${c.markers}\n陷阱：${c.pitfalls}`}>{c.name} {data.cultureCount.get(c.name) || '· 待补'}</span>)}
      </div>
      <div className="section-title">案例分组</div>
      <div className="chips" style={{ padding: '0 10px 16px' }}>
        {[...new Map(CASES.map((c) => [c.group, c.groupTitle])).entries()].sort().map(([g, t]) => {
          const n = CASES.filter((c) => c.group === g).length;
          const withImg = CASES.filter((c) => c.group === g && (c.images?.thumbs?.length || c.images?.header)).length;
          return <span key={g} className="chip">{g} {t}：{n}（图 {withImg}）</span>;
        })}
      </div>
    </>
  );
}
