import { useMemo, useState } from 'react';
import { GAME_SCENES, SCENE_GROUPS, sceneEnv, sceneName, type GameScene, type SceneGroupId } from '../../content/gameScenes';
import { RECIPE_MAP } from '../../content/recipes';
import { is2dScene, SCENE_CATEGORIES, SCENE_GROUPS as ENV_GROUPS, SCENES } from '../../content/sceneCatalog';
import { getParam } from '../../dims/registry';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { applyEnv, pickSkin } from '../../state/actions';
import { useStore } from '../../state/store';
import { randomSkinId } from '../hud/uiRandom';
import { useShell } from '../stage/shell';
import { pickGameScene } from './sceneActions';
import { myView, preloadSceneThumbs, saveGroup, savedGroup, sceneThumbUrl } from './sceneData';
import './scene.css';

/*
 * 场景图库（轨道 D，docs/workbench-redesign.md §2 F2 / F3、§5）：
 *   variant = 'rail'：UI 模式的左栏。标题行（🎲 随机皮肤 · ▾ 随机面板 · 🔒 保留我的改动 · 📌 钉住左栏）+ 分组芯片 + 两列图片卡；
 *   variant = 'popover'：顶栏场景标签的弹窗。头部「我的游戏」（平台 · 商业）与「换个布局」，下面同一套卡片，再下面「换环境」。
 * 点卡片 = 套用这个场景（一步撤销；画风、皮肤保留，元素位置清掉），界面停在「局内」。按住 Alt 点 = 保留我的改动。
 * 分组按视角（横版 / 俯视 / 等距 / 棋盘 / 立绘卡牌 / 伪 3D / 3D 自由 / 赛道 / 名作）；首屏「你的游戏更像哪种」选过的那组排最前。
 * 2D 场景（F 的横版分层 / 俯视瓦片 / 棋盘 / 立绘背景）卡片带「2D」角标、在各组里排前面，芯片「2D」只看它们（审查修复 28）。
 */

/** 这张卡现在是不是 2D 场景（基础场景：2D 环境上线了；名作：复刻指向的环境是 2D 的） */
const is2dCard = (sc: GameScene) => !!sc.env && (sceneEnv(sc, hasSceneBuilder).is2d || (is2dScene(sc.env) && hasSceneBuilder(sc.env)));
type Filter = SceneGroupId | '2D';
const sort2d = (list: GameScene[]) => [...list.filter(is2dCard), ...list.filter((s) => !is2dCard(s))];
/** 一个筛选下有几张卡 */
const countOf = (f: Filter) => (f === '2D' ? GAME_SCENES.filter(is2dCard).length : GAME_SCENES.filter((s) => s.group === f).length);

// 启动后空闲时把场景卡缩略图先拉下来（图库第一次打开时不再一张张从渐变占位里冒出来，整合修复 U#19）
preloadSceneThumbs(GAME_SCENES.map((s) => s.id));

const GROUP_HUE: Record<SceneGroupId, number> = { '3D自由': 150, 俯视: 95, 横版: 265, 等距: 175, 棋盘: 30, 立绘卡牌: 330, 伪3D: 300, 赛道: 200, 名作: 45 };

function SceneCard({ sc, on, compact }: { sc: GameScene; on: boolean; compact?: boolean }) {
  const [bad, setBad] = useState(false);
  const hue = GROUP_HUE[sc.group] ?? 200;
  const env = sc.env ? sceneEnv(sc, hasSceneBuilder) : null;
  const look = sc.look ? RECIPE_MAP.get(sc.look) : undefined;
  const tip = [sc.desc, look ? `配 ${look.short ?? look.name} 好看` : '', env && !env.is2d && sc.env2d ? '2D 环境上线前先用 3D 环境' : ''].filter(Boolean).join('\n');
  return (
    <button
      className={`sg-card ${on ? 'on' : ''} ${compact ? 'compact' : ''}`}
      title={tip}
      onClick={(e) => { void pickGameScene(sc, { alt: e.altKey }); }}
    >
      <span className="sg-thumb" style={{ background: `linear-gradient(135deg, hsl(${hue} 32% 58%), hsl(${(hue + 40) % 360} 30% 30%))` }}>
        {!bad && <img src={sceneThumbUrl(sc.id)} alt="" decoding="async" onError={() => setBad(true)} />}
        {is2dCard(sc) && <span className="sg-badge">2D</span>}
      </span>
      <span className="sg-name">{sceneName(sc, hasSceneBuilder)}</span>
    </button>
  );
}

function Grid({ list, cur, compact }: { list: GameScene[]; cur: string | null; compact?: boolean }) {
  return <div className={`sg-grid ${compact ? 'compact' : ''}`}>{list.map((sc) => <SceneCard key={sc.id} sc={sc} on={cur === sc.id} compact={compact} />)}</div>;
}

export function SceneGallery({ variant = 'rail', onPicked }: { variant?: 'rail' | 'popover'; onPicked?: () => void }) {
  const cur = useStore((s) => s.origin.scene);
  const keepMine = useShell((s) => s.keepMine);
  const pinned = useShell((s) => s.leftPinned);
  const setShell = useShell((s) => s.set);
  // 记住的筛选只有一张卡时退回「全部」（审查修复 28：localStorage 记的「横版」让 UI 模式一进来只剩一张卡）
  const [group, setGroupState] = useState<Filter | null>(() => { const g = savedGroup() as Filter | null; return g && countOf(g) > 1 ? g : null; });
  const setGroup = (g: Filter | null) => { setGroupState(g); saveGroup(g); };
  const mine = myView();
  // 「你的游戏更像哪种」选过的那组排最前
  const groups = useMemo(() => (mine ? [...SCENE_GROUPS.filter((g) => g.id === mine), ...SCENE_GROUPS.filter((g) => g.id !== mine)] : SCENE_GROUPS), [mine]);
  // 每组里 2D 的排前面
  const byGroup = useMemo(() => new Map(SCENE_GROUPS.map((g) => [g.id, sort2d(GAME_SCENES.filter((s) => s.group === g.id))])), []);
  const shown: { id: Filter; label: string; list: GameScene[] }[] = group === '2D'
    ? [{ id: '2D', label: '2D', list: GAME_SCENES.filter(is2dCard) }]
    : (group ? groups.filter((g) => g.id === group) : groups).map((g) => ({ ...g, list: byGroup.get(g.id) ?? [] }));
  const pop = variant === 'popover';
  // 弹窗里点了卡片就关上
  const body = (
    <div className="sg-body" onClick={(e) => { if (pop && (e.target as HTMLElement).closest('.sg-card')) onPicked?.(); }}>
      {shown.map((g) => (
        <section key={g.id} className="sg-sec">
          {!group && <div className="sg-sec-title">{g.label}</div>}
          <Grid list={g.list} cur={cur} compact={pop} />
        </section>
      ))}
    </div>
  );
  const chips = (
    <div className="sg-chips">
      <button className={`sg-chip ${!group ? 'on' : ''}`} onClick={() => setGroup(null)}>全部</button>
      <button className={`sg-chip ${group === '2D' ? 'on' : ''}`} onClick={() => setGroup(group === '2D' ? null : '2D')} title="只看 2D / 2.5D 场景（横版、俯视瓦片、等距、棋盘、立绘、纸艺剧场、伪 3D）">2D</button>
      {groups.map((g) => <button key={g.id} className={`sg-chip ${group === g.id ? 'on' : ''}`} onClick={() => setGroup(group === g.id ? null : g.id)}>{g.label}</button>)}
    </div>
  );
  if (pop) {
    return (
      <div className="sg sg-pop">
        <MyGame />
        {chips}
        <div className="sg-pop-scroll">{body}</div>
        <EnvSwitch onPicked={onPicked} />
      </div>
    );
  }
  const randomSkin = () => {
    const v = String(useStore.getState().values['hud.style'] ?? '');
    const id = randomSkinId(v);
    if (id) pickSkin(id);
  };
  return (
    <div className="sg">
      <div className="sg-head">
        <b>场景</b>
        <span className="sg-spacer" />
        <button className="sg-ico" onClick={randomSkin} title="随机换一套皮肤">🎲</button>
        <button className="sg-ico sg-caret" onClick={() => useStore.getState().setPanel('random')} title="随机探索（锁定维度的小面板）">▾</button>
        <button className={`sg-ico ${keepMine ? 'on' : ''}`} onClick={() => setShell({ keepMine: !keepMine })} title="保留我的改动：点场景、皮肤时不清掉手动改过的参数（也可以按住 Alt 点）">🔒</button>
        <button className={`sg-ico ${pinned ? 'on' : ''}`} onClick={() => setShell({ leftPinned: !pinned })} title="钉住左栏：选了场景也不收起">📌</button>
      </div>
      {chips}
      <div className="sg-scroll">{body}</div>
    </div>
  );
}

/** 弹窗头部：我的游戏（平台 · 商业，不算改动）+ 换个布局（种子；数字只在开发者模式显示） */
function MyGame() {
  const platform = useStore((s) => String(s.values['uip.platform'] ?? 'auto'));
  const business = useStore((s) => String(s.values['uip.business'] ?? 'auto'));
  const seed = useStore((s) => Number(s.values['game.seed'] ?? 7));
  const set = useStore((s) => s.set);
  const dev = useShell((s) => s.dev);
  const opts = (id: string) => getParam(id)?.options ?? [];
  return (
    <div className="sg-mygame">
      <span className="sg-mg-label" title="我的游戏：决定画幅、输入方式，以及会不会出现运营界面和 ▶流程">我的游戏</span>
      <select className="sel" value={platform} onChange={(e) => set('uip.platform', e.target.value)} title="平台">
        {opts('uip.platform').map((o) => <option key={o.value} value={o.value}>{o.value === 'auto' ? '平台' : o.label}</option>)}
      </select>
      <select className="sel" value={business} onChange={(e) => set('uip.business', e.target.value)} title="商业模式">
        {opts('uip.business').map((o) => <option key={o.value} value={o.value}>{o.value === 'auto' ? '商业' : o.label}</option>)}
      </select>
      <span className="sg-spacer" />
      <button className="btn small" onClick={() => set('game.seed', (seed % 99999) + 1)} title="同一个环境换一种随机布局（画风、UI 不变）">🎲 换个布局{dev ? ` #${seed}` : ''}</button>
    </div>
  );
}

/** 场景类别的顺序（「换环境」的 2D 组按它分小节；一个 2D 环境也没有的类别不出现） */
const CATEGORY_ORDER: readonly (readonly [string, string])[] = SCENE_CATEGORIES;

/** 测试用的环境（对象测试台）：只在开发者模式的「换环境」里出现（F 的审查修复 13） */
const TEST_ENVS: ReadonlySet<string> = new Set(['bench']);

/**
 * 换环境（§1.2：25 个 3D 环境只在这里出现）：换环境不换 UI。
 * F 的审查修复 13：最上面「这个场景」= 当前场景的环境与它建议的几个（altEnvs）；其余按环境目录的 5 组（自然 / 聚落 / 室内 / 特殊 / 2D）分开；
 * 测试台只在开发者模式出现；环境和场景默认的不同时，标题上写出现在的环境。
 */
function EnvSwitch({ onPicked }: { onPicked?: () => void }) {
  const curEnv = useStore((s) => String(s.values['game.scene'] ?? ''));
  const sc = useStore((s) => GAME_SCENES.find((x) => x.id === s.origin.scene));
  const dev = useShell((s) => s.dev);
  const [open, setOpen] = useState(false);
  const live = SCENES.filter((s) => hasSceneBuilder(s.id) && (dev || !TEST_ENVS.has(s.id)));
  const own = sc?.env ? sceneEnv(sc, hasSceneBuilder).env : '';
  const first = [...new Set([own, ...(sc?.env2d ?? []), ...(sc?.altEnvs ?? []), ...(sc?.env ? [sc.env] : [])])].filter(Boolean);
  const top = first.map((id) => live.find((s) => s.id === id)).filter((s): s is (typeof live)[number] => !!s);
  const rest = live.filter((s) => !first.includes(s.id));
  const differs = !!own && curEnv !== own;
  const curName = SCENES.find((s) => s.id === curEnv)?.name ?? curEnv;
  const pill = (s: (typeof live)[number]) => (
    <button key={s.id} className={`sg-env-pill ${curEnv === s.id ? 'on' : ''}`} title={s.desc} onClick={() => { applyEnv(s.id, s.name); onPicked?.(); }}>{s.name}</button>
  );
  return (
    <details className="sg-env" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary title={differs ? '环境和这个场景默认的不一样' : undefined}>换环境{differs ? ` · 现在：${curName}` : ''}</summary>
      {open && (
        <>
          {top.length > 0 && <><div className="sg-env-head">这个场景</div><div className="sg-env-grid">{top.map(pill)}</div></>}
          {ENV_GROUPS.map(([g, desc]) => {
            const list = rest.filter((s) => s.group === g);
            if (!list.length) return null;
            // 2D 组有 30 多个环境：按场景类别分小节（横版卷轴 / 俯视瓦片 / … / 等距 2.5D / 纸艺与剧场 / 伪 3D / 竖版与节奏），同类的排在一起（G 的请求，轨道 Z2）
            if (g === '2D') {
              return CATEGORY_ORDER.map(([cat, cdesc]) => {
                const sub = list.filter((s) => s.category === cat);
                return sub.length ? <div key={cat}><div className="sg-env-head" title={cdesc}>2D · {cat}</div><div className="sg-env-grid">{sub.map(pill)}</div></div> : null;
              });
            }
            return <div key={g}><div className="sg-env-head" title={desc}>{g}</div><div className="sg-env-grid">{list.map(pill)}</div></div>;
          })}
        </>
      )}
    </details>
  );
}
