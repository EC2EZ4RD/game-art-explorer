import { useMemo, useState } from 'react';
import { awardBadge, CASE_BY_APPID, CASE_SHOTS, CASES, caseGroups, caseImage, caseShots, GROUP_RECIPES, GROUP_SCENES, PEEK_NOTE, peekedBy, peekFor, type CaseEntry } from '../../content/cases';
import { RECIPE_MAP } from '../../content/recipes';
import { hintsFromGaps } from '../../content/styles';
import { sceneMeta } from '../../content/sceneCatalog';
import { applyCaseApprox, applyRecipe } from '../../state/actions';
import type { Values } from '../../dims/types';
import { useStore } from '../../state/store';
import { goScene } from '../left/galleryActions';

const img = (p: string | null | undefined) => (p ? (p.startsWith('http') ? p : `./${p.replace(/^\/+/, '')}`) : null);

/** 案例库列表 */
export function CaseLibrary() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [onlyAward, setOnlyAward] = useState(false);
  const [onlyImg, setOnlyImg] = useState(false);
  const [onlyChart, setOnlyChart] = useState(false);
  const setCaseId = useStore((s) => s.setCaseId);
  const groups = useMemo(caseGroups, []);
  const list = CASES.filter((c) => {
    if (group !== 'all' && c.group !== group && !(c.alsoInGroups ?? []).includes(group)) return false;
    if (onlyAward && !c.evidence?.awards?.length) return false;
    if (onlyImg && !caseImage(c)) return false;
    if (onlyChart && !c.evidence?.charts?.length) return false;
    if (!q) return true;
    return `${c.name}${c.nameZh ?? ''}${c.artFeature ?? ''}${(c.developers ?? []).join('')}${(c.steamTags ?? []).join('')}`.toLowerCase().includes(q.toLowerCase());
  });
  return (
    <>
      <div className="hint">真实游戏画面（Steam 商店截图，本地缓存，仅学习参考）。依据分开记录：奖项是美术专项证据，榜单只是热度，SteamPeek 只是发现途径。</div>
      <div style={{ padding: '0 10px' }}>
        <input className="search" placeholder="搜索：游戏名、开发者、标签、美术特征…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="sel" style={{ width: '100%', marginTop: 6 }} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">全部分组（{CASES.length}）</option>
          {groups.map(([g, x]) => <option key={g} value={g}>{g} · {x.title}（{x.count}）</option>)}
        </select>
        <div className="chips">
          <span className={`chip link ${onlyAward ? 'blue' : ''}`} onClick={() => setOnlyAward(!onlyAward)}>有美术奖项</span>
          <span className={`chip link ${onlyImg ? 'blue' : ''}`} onClick={() => setOnlyImg(!onlyImg)}>有截图</span>
          <span className={`chip link ${onlyChart ? 'blue' : ''}`} onClick={() => setOnlyChart(!onlyChart)} title="热销榜 / 热门愿望单上的作品（热度信号，不是美术评价）">上榜作品</span>
          <span className="chip">显示 {list.length}</span>
        </div>
      </div>
      {list.slice(0, 160).map((c) => {
        const im = img(caseImage(c));
        const badge = awardBadge(c);
        return (
          <div key={c.id} className="card case-card" onClick={() => setCaseId(c.id)}>
            {im ? <img src={im} alt="" loading="lazy" /> : <div className="noimg">{!CASE_SHOTS ? '截图仅本地' : c.appid ? '截图下载中' : '非 Steam · 见来源'}</div>}
            <div style={{ minWidth: 0 }}>
              <h4>{c.nameZh && c.nameZh !== c.name ? `${c.nameZh} ` : ''}<span className="term">{c.name}</span></h4>
              <p>{c.artFeature}</p>
              <div className="chips">
                <span className="chip">{c.group} · {c.groupTitle}</span>
                {badge && <span className="chip ok">{badge}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {list.length > 160 && <div className="hint">还有 {list.length - 160} 个，请用搜索或分组缩小范围。</div>}
    </>
  );
}

/** 案例详情：截图、出处、依据、进入实验、设为对照图 */
export function CaseDialog() {
  const id = useStore((s) => s.caseId);
  const setCaseId = useStore((s) => s.setCaseId);
  const setRef = useStore((s) => s.setRefImage);
  const c = CASES.find((x) => x.id === id);
  const [big, setBig] = useState<string | null>(null);
  if (!c) return null;
  // 截图只在开发环境（Steam 商店截图不分发，见 src/content/cases.ts 的 CASE_SHOTS）
  const shots = caseShots(c);
  const main = CASE_SHOTS ? img(big ?? shots[0] ?? c.images?.header) : null;
  const recipes = GROUP_RECIPES[c.group] ?? [];
  const hints = hintsFromGaps(c.analysis?.gaps ?? []);
  const scene = GROUP_SCENES[c.group];
  return (
    <div className="dialog-mask" onClick={() => setCaseId(null)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>{c.nameZh && c.nameZh !== c.name ? `${c.nameZh} · ` : ''}{c.name}</h3>
          {main && <button className="btn" onClick={() => { setRef({ url: main, label: c.name }); setCaseId(null); }}>设为对照图</button>}
          <button className="btn ghost" onClick={() => setCaseId(null)}>关闭</button>
        </div>
        <div className="dialog-body case-detail">
          <div>
            {main ? <img className="case-main" src={main} alt={c.name} /> : <div className="noimg big">{!CASE_SHOTS ? '原作截图不随工具分发（本地抓取后在开发环境显示），请看下方来源链接。' : c.appid ? '没有本地截图：截图还在下载或下载失败。' : '这是非 Steam 作品，请查看下方官方来源。'}</div>}
            <div className="case-thumbs">
              {shots.map((s) => <img key={s} src={img(s)!} alt="" onClick={() => setBig(s)} className={s === big ? 'on' : ''} loading="lazy" />)}
            </div>
            <p className="hint" style={{ margin: '4px 0' }}>图片类型：Steam 商店截图（未逐张核验是否为宣传合成图）。仅本地学习参考，不再分发。</p>
          </div>
          <div>
            <p><b>美术特征（调研）：</b>{c.artFeature}</p>
            <p><b>分组：</b>{c.group} · {c.groupTitle}{(c.alsoInGroups ?? []).length ? `（也属于 ${c.alsoInGroups!.join('、')}）` : ''}</p>
            {c.developers?.length ? <p><b>开发：</b>{c.developers.join('、')}{c.publishers?.length ? ` / 发行：${c.publishers.join('、')}` : ''}</p> : null}
            {c.steam?.releaseDate && <p><b>发行：</b>{c.steam.releaseDate}{c.steam.comingSoon ? '（未发售）' : ''}</p>}
            <p><b>美术专项证据：</b>{c.evidence?.awards?.length ? c.evidence.awards.map((a) => `${a.award} ${a.year}（${a.result === 'winner' ? '获奖' : a.result === 'honorable' ? '荣誉提名' : '提名'}）`).join('；') : '无（只说明入选原因，不代表美术评分）'}</p>
            {c.evidence?.other?.length ? <p><b>入选原因：</b>{c.evidence.other.join('、')}</p> : null}
            {c.evidence?.charts?.length ? <p><b>榜单（热度信号）：</b>{c.evidence.charts.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('；')}</p> : null}
            {c.steamTags?.length ? <div className="chips">{c.steamTags.slice(0, 12).map((t) => <span key={t} className="chip">{t}</span>)}</div> : null}
            {c.analysis?.teardown && (
              <>
                <h4 style={{ margin: '10px 0 4px' }}>视觉拆解</h4>
                {Object.entries(c.analysis.teardown).map(([k, val]) => <p key={k}><b>{k}：</b>{val}</p>)}
                {c.analysis.evidence?.length ? <><p><b>观察依据：</b></p><ul className="check-list">{c.analysis.evidence.map((e) => <li key={e}>{e}</li>)}</ul></> : null}
                {c.analysis.transferable?.length ? <p><b>可借鉴：</b>{c.analysis.transferable.join('；')}</p> : null}
                {c.analysis.gaps?.length ? <div className="chips">{c.analysis.gaps.map((g) => hints.matched.includes(g)
                  ? <span key={g} className="chip ok" title="实验台已有近似能力，载入近似参数时会一起打开">可近似：{g}</span>
                  : hints.partial.includes(g)
                    ? <span key={g} className="chip warn" title="其中一部分实验台能近似（载入时一起打开），其余部分仍然缺">部分可近似：{g}</span>
                    : <span key={g} className="chip warn">实验台缺：{g}</span>)}</div> : null}
                {c.analysis.prompt && <p><b>可复用描述：</b>{c.analysis.prompt} <CopyText text={c.analysis.prompt} /></p>}
                {c.analysis.screenshotNotes && <p className="hint" style={{ margin: 0 }}>截图说明：{c.analysis.screenshotNotes}</p>}
                {c.analysis.confidence && <p className="hint" style={{ margin: 0 }}>技术判断可信度：{c.analysis.confidence}（依据截图观察，不是官方说明）</p>}
              </>
            )}
            <h4 style={{ margin: '10px 0 4px' }}>进入实验</h4>
            <p className="hint" style={{ margin: '0 0 6px' }}>下面的配方与这组作品的视觉机制相近，用来理解差异，不代表能复刻原作。</p>
            <div className="chips">
              {c.analysis?.approx && Object.keys(c.analysis.approx).length > 0 && (
                <button className="btn small primary" onClick={() => {
                  // 轨道 A 的统一合成（applyCaseApprox → planLook）：以对应配方为底叠这款的近似参数，只换画面层；
                  // 近似参数里的 UI 键（hud.style 等）和 game.* 不跟着走（换画面不碰 UI 和场景，§0.3 / §4.2），套完画面改动 = 0。
                  // 拆解里列为缺口、但实验台现在已能近似的能力（景深、体积光束等）一起打开
                  applyCaseApprox({ id: c.id, name: c.nameZh ?? c.name, recipe: c.analysis!.recipe ?? null, values: { ...hints.values, ...(c.analysis!.approx as Values) } });
                  if (main) setRef({ url: main, label: c.name });
                  setCaseId(null);
                }}>载入这款的近似参数</button>
              )}
              {recipes.map((rid) => {
                const r = RECIPE_MAP.get(rid);
                return r ? <button key={rid} className="btn small" onClick={() => { applyRecipe(r); if (main) setRef({ url: main, label: c.name }); setCaseId(null); }}>{r.name}</button> : null;
              })}
              {scene && <button className="btn small" title="只换环境，画风和 UI 不动（记进场景，不算改动；可撤销）" onClick={() => { goScene(scene, sceneMeta(scene).name); setCaseId(null); }}>换到场景：{sceneMeta(scene).name}</button>}
            </div>
            <PeekSection c={c} />
            <h4 style={{ margin: '10px 0 4px' }}>来源</h4>
            {c.sources.map((s) => <div key={s}><a href={s} target="_blank" rel="noreferrer">{s}</a></div>)}
            {c.verifiedAt && <p className="hint" style={{ margin: '4px 0 0' }}>核对日期：{c.verifiedAt}（{c.verifyStatus}）</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** SteamPeek 延伸：从这款出发的相似推荐；库里有的可以直接打开，并标出美术分组相同还是不同 */
function PeekSection({ c }: { c: CaseEntry }) {
  const setCaseId = useStore((s) => s.setCaseId);
  const [all, setAll] = useState(false);
  const seed = peekFor(c.appid);
  const by = peekedBy(c.appid).filter((s) => s.seed !== c.appid);
  if (!seed && !by.length) return null;
  const items = seed ? seed.related : [];
  const inLib = items.filter((r) => CASE_BY_APPID.has(r.appid));
  const shown = all ? items : items.filter((r) => CASE_BY_APPID.has(r.appid) || (r.steamPeekRating ?? 0) >= 7).slice(0, 14);
  return (
    <>
      <h4 style={{ margin: '10px 0 4px' }}>SteamPeek 延伸{seed ? `（${items.length} 款，库内 ${inLib.length} 款）` : ''}</h4>
      <p className="hint" style={{ margin: '0 0 6px' }}>{PEEK_NOTE}</p>
      {seed && (
        <div className="peek-list">
          {shown.map((r) => {
            const lib = CASE_BY_APPID.get(r.appid);
            const same = lib && (lib.group === c.group || (lib.alsoInGroups ?? []).includes(c.group));
            return (
              <div key={r.appid} className={`peek-item ${lib ? 'link' : ''}`} onClick={() => lib && setCaseId(lib.id)}>
                <b>{r.name}</b>
                {r.steamPeekRating != null && <span className="chip">评分 {r.steamPeekRating}</span>}
                {lib ? <span className={`chip ${same ? 'ok' : 'warn'}`}>{same ? '美术相近' : '美术不同'}：{lib.group} · {lib.groupTitle}</span> : <a className="chip" href={`https://store.steampowered.com/app/${r.appid}/`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Steam</a>}
                {lib?.artFeature && <span className="hint" style={{ margin: 0 }}>{lib.artFeature}</span>}
              </div>
            );
          })}
          {!all && items.length > shown.length && <button className="btn small ghost" onClick={() => setAll(true)}>显示全部 {items.length} 款</button>}
          <a className="hint" href={seed.url} target="_blank" rel="noreferrer">在 SteamPeek 打开（更新于 {seed.updatedOn ?? '未知'}）</a>
        </div>
      )}
      {by.length > 0 && (
        <div className="chips">
          <span className="chip">也出现在这些作品的推荐里：</span>
          {by.map((s) => {
            const lib = CASE_BY_APPID.get(s.seed);
            return <span key={s.seed} className={`chip ${lib ? 'link' : ''}`} onClick={() => lib && setCaseId(lib.id)}>{s.name}</span>;
          })}
        </div>
      )}
    </>
  );
}

/** 复制一段文字（案例拆解里的可复用描述） */
function CopyText({ text }: { text: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  return (
    <button className="btn small" title="复制这段描述" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setOk(true); } catch { setOk(false); }
      window.setTimeout(() => setOk(null), 2500);
    }}>{ok === true ? '已复制' : ok === false ? '复制失败' : '📋 复制'}</button>
  );
}

export type { CaseEntry };
