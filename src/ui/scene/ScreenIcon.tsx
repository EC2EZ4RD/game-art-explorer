import type { ScreenEntry } from '../../content/gameScenes';

/*
 * 界面胶片卡上的小示意图（轨道 D）：44×26 的线框，按界面种类画（局内四角、Boss 顶条、背包网格、对话底框……）。
 * 只用 currentColor 画线，跟着工具界面的明暗主题走。
 */

type Kind = 'hud' | 'aim' | 'iso' | 'boss' | 'lowhp' | 'title' | 'pause' | 'list' | 'grid' | 'figure' | 'tree' | 'map' | 'dialogue' | 'shop' | 'table' | 'cards3' | 'hand' | 'build' | 'board' | 'vs' | 'band' | 'flow' | 'window';

const TPL_KIND: Record<string, Kind> = {
  'tpl.bossIntro': 'boss', 'tpl.title': 'title', 'tpl.lobby': 'title', 'tpl.login': 'title', 'tpl.pausePc': 'pause', 'tpl.pauseMobile': 'pause',
  'tpl.settings': 'list', 'tpl.rebind': 'list', 'tpl.difficulty': 'list', 'tpl.quest': 'list', 'tpl.mail': 'list', 'tpl.saveSlot': 'list', 'tpl.server': 'list',
  'tpl.inventory': 'grid', 'tpl.packGrid': 'grid', 'tpl.codex': 'grid', 'tpl.achievement': 'grid', 'tpl.formation': 'grid', 'tpl.checkin': 'grid',
  'tpl.loadout': 'figure', 'tpl.hero': 'figure', 'tpl.create': 'figure', 'tpl.forge': 'figure',
  'tpl.skilltree': 'tree', 'tpl.deduction': 'tree',
  'tpl.worldmap': 'map', 'tpl.routeMap': 'map', 'tpl.levelPath': 'map',
  'tpl.npc': 'dialogue', 'tpl.dialogueWheel': 'dialogue', 'tpl.chat': 'dialogue', 'tpl.cutscene': 'dialogue',
  'tpl.shopCounter': 'shop', 'tpl.mall': 'shop', 'tpl.pass': 'shop',
  'tpl.runSummary': 'table', 'tpl.settle': 'table', 'tpl.stats': 'table', 'tpl.leaderboard': 'table', 'tpl.credits': 'table',
  'tpl.draft3': 'cards3', 'tpl.gachaResult': 'cards3', 'tpl.reward': 'cards3', 'tpl.hand': 'hand', 'tpl.build': 'build', 'tpl.vs': 'vs',
  'tpl.chapterCard': 'band', 'tpl.callout': 'band', 'tpl.levelup': 'band', 'tpl.unlock': 'band', 'tpl.loading': 'band',
};
const KEY_KIND: Record<string, Kind> = {
  hud: 'hud', 'hud-lowhp': 'lowhp', 'hud-boss': 'boss', 'hud-base': 'hud', 'hud-combat': 'hud', 'hud-world': 'hud', 'hud-building': 'hud', combat: 'hud', battle: 'hud', 'battle-boss': 'boss', field: 'hud', 'battle-command': 'list', allout: 'band',
  inventory: 'grid', codex: 'grid', cards: 'grid', character: 'figure', create: 'figure', skilltree: 'tree', research: 'tree', deduction: 'tree', greatpeople: 'figure',
  map: 'map', dialogue: 'dialogue', check: 'dialogue', results: 'table', economy: 'table', infoview: 'map', title: 'title', frontend: 'title', pause: 'pause',
  draft: 'cards3', hand: 'hand', build: 'build', city: 'build', base: 'build', chapter: 'band', callout: 'band', cutscene: 'dialogue', journal: 'list', calendar: 'grid',
  diplomacy: 'vs', wonder: 'band', craft: 'grid', scan: 'hud', squad: 'figure', blinds: 'cards3',
};

function kindOfScreen(s: Pick<ScreenEntry, 'id' | 'kind' | 'values'>): Kind {
  if (s.kind === 'flow') return 'flow';
  if (s.kind === 'replica') return KEY_KIND[s.id] ?? 'window';
  if (s.id === 'aim') return 'aim';
  if (s.id === 'iso') return 'iso';
  if (s.id === 'lowhp' || s.values?.['chk.simPose'] === 'lowHp') return 'lowhp';
  if (s.id === 'boss' || s.values?.['chk.simPose'] === 'bossIntro') return 'boss';
  const tpl = String(s.values?.['uip.screen'] ?? (s.id.startsWith('tpl.') ? s.id : ''));
  if (!tpl || tpl === 'auto') return 'hud';
  return TPL_KIND[tpl] ?? 'window';
}

function shape(k: Kind) {
  switch (k) {
    case 'hud': return <><rect x="3" y="18" width="12" height="3" rx="1" /><rect x="34" y="3" width="7" height="7" rx="1" /><rect x="19" y="19" width="6" height="3" /><rect x="27" y="19" width="6" height="3" /></>;
    // 等距：一块菱形地面上立着一个方块（首屏条「等距」）
    case 'iso': return <><path d="M22 23l-15-7.5 15-7.5 15 7.5z" /><path d="M17 13.5v-6l5-2.5 5 2.5v6l-5 2.5z" /><path d="M17 7.5l5 2.5 5-2.5M22 10v6" /></>;
    case 'aim': return <><circle cx="22" cy="13" r="5" /><path d="M22 4v5M22 17v5M13 13h5M26 13h5" /><rect x="3" y="19" width="10" height="3" rx="1" /></>;
    case 'lowhp': return <><rect x="3" y="18" width="5" height="3" rx="1" className="si-hot" /><rect x="34" y="3" width="7" height="7" rx="1" /><path d="M1 1h42v24H1z" className="si-vig" /></>;
    case 'boss': return <><rect x="9" y="4" width="26" height="3" rx="1" /><path d="M14 10h16" /><rect x="3" y="19" width="12" height="3" rx="1" /></>;
    case 'title': return <><path d="M12 7h20" className="si-thick" /><path d="M17 13h10M17 17h10M17 21h10" /></>;
    case 'pause': return <><rect x="1" y="1" width="42" height="24" className="si-dim" /><rect x="14" y="5" width="16" height="16" rx="1" /><path d="M18 10h8M18 14h8M18 18h8" /></>;
    case 'list': return <><path d="M6 6h32M6 11h32M6 16h32M6 21h20" /><circle cx="35" cy="21" r="1.5" /></>;
    case 'grid': return <>{[0, 1, 2, 3, 4].map((i) => [0, 1, 2].map((j) => <rect key={`${i}-${j}`} x={8 + i * 6} y={4 + j * 6} width="4.5" height="4.5" rx="0.6" />))}</>;
    case 'figure': return <><circle cx="14" cy="8" r="3" /><path d="M14 11v8M10 14h8M11 23l3-4 3 4" /><rect x="25" y="5" width="5" height="5" /><rect x="32" y="5" width="5" height="5" /><rect x="25" y="13" width="5" height="5" /><rect x="32" y="13" width="5" height="5" /></>;
    case 'tree': return <><circle cx="22" cy="5" r="2" /><circle cx="13" cy="13" r="2" /><circle cx="31" cy="13" r="2" /><circle cx="9" cy="21" r="2" /><circle cx="17" cy="21" r="2" /><circle cx="31" cy="21" r="2" /><path d="M21 6.5l-6.5 5M23 6.5l6.5 5M12 15l-2 4M14 15l2 4M31 15v4" /></>;
    case 'map': return <><path d="M4 5l11-2 13 3 12-2v18l-12 2-13-3-11 2z" /><path d="M10 18l6-5 6 3 7-7" className="si-dash" /><circle cx="29" cy="9" r="1.6" /></>;
    case 'dialogue': return <><rect x="3" y="15" width="38" height="8" rx="1.5" /><circle cx="9" cy="9" r="3.5" /><path d="M14 19h20" /></>;
    case 'shop': return <><rect x="3" y="4" width="17" height="18" rx="1" /><rect x="24" y="4" width="17" height="18" rx="1" /><path d="M6 9h11M6 13h11M6 17h11M27 9h11" /></>;
    case 'table': return <><path d="M8 5h28" className="si-thick" /><path d="M8 10h28M8 14h28M8 18h28M8 22h20" /></>;
    case 'cards3': return <><rect x="6" y="5" width="9" height="16" rx="1" /><rect x="17.5" y="5" width="9" height="16" rx="1" /><rect x="29" y="5" width="9" height="16" rx="1" /></>;
    case 'hand': return <><rect x="10" y="12" width="7" height="11" rx="1" transform="rotate(-14 13 18)" /><rect x="18.5" y="11" width="7" height="11" rx="1" /><rect x="27" y="12" width="7" height="11" rx="1" transform="rotate(14 30 18)" /><rect x="16" y="3" width="12" height="5" rx="1" /></>;
    case 'build': return <><rect x="6" y="19" width="32" height="5" rx="1" /><path d="M10 19v5M14 19v5M18 19v5M22 19v5M26 19v5M30 19v5" /><path d="M17 7l5-3 5 3v7h-10z" /></>;
    case 'board': return <><path d="M6 4h32v18H6zM6 10h32M6 16h32M14 4v18M22 4v18M30 4v18" /></>;
    case 'vs': return <><path d="M22 2v22" /><circle cx="12" cy="11" r="4" /><circle cx="32" cy="11" r="4" /><path d="M8 21h8M28 21h8" /></>;
    case 'band': return <><rect x="1" y="9" width="42" height="8" className="si-dim" /><path d="M12 13h20" className="si-thick" /></>;
    case 'flow': return <><path d="M17 6l12 7-12 7z" className="si-fill" /></>;
    default: return <><rect x="8" y="4" width="28" height="18" rx="1.5" /><path d="M8 8h28M12 13h14M12 17h10" /></>;
  }
}

export function ScreenIcon({ screen }: { screen: Pick<ScreenEntry, 'id' | 'kind' | 'values'> }) {
  return (
    <svg className="si" viewBox="0 0 44 26" width="44" height="26" aria-hidden="true">
      <rect x="0.5" y="0.5" width="43" height="25" rx="2.5" className="si-frame" />
      {shape(kindOfScreen(screen))}
    </svg>
  );
}
