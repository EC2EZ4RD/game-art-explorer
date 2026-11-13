import { create } from 'zustand';
import { QUALITY } from '../../hud/paint';
import { DEV_NOTICES } from '../../hud/sys/check';
import { useStore } from '../../state/store';
import { registerViewReset } from '../../state/viewHooks';
import type { DimId } from '../../dims/types';

/*
 * 外壳的视图状态（轨道 B，docs/workbench-redesign.md §3 §4.3）：缩放、专注、左栏开合、👁UI、右栏分组展开、开发者模式、主题……
 * 这些只是"怎么看"，不进参数、不进撤销、不进导出。每个标签页各存一份在 sessionStorage（gae.shell.v1），刷新不丢、多标签页互不覆盖。
 * 轨道 A 的 src/state/view.ts 上线后，与它重叠的键（缩放、专注、👁UI、左栏开合）以 view.ts 为准时，这里改成转发即可（见 docs/redesign/track-B.md）。
 *
 * 模式（画面 / UI）不单独存：跟随 store.activeDim（'hud' = UI 模式），这样知识面板、参数跳转等老代码切模式的写法照旧生效。
 * 左栏开合按模式各记一份（审查修复 4 / 17）：画面模式是配方图库（首屏，默认展开），UI 模式选了场景收成图标栏；回画面模式不再带着 UI 模式的收起。
 * 新开标签页从上次的外观（主题、开发者模式、分组展开……）起步，但左栏开合、👁UI、专注、缩放不带过去（新标签页 = 首屏：配方图库展开、画面模式不显示 HUD）。
 */

export type Zoom = 'fit' | 'half' | 'full';
export type Mode = 'art' | 'ui';
export type Theme = 'auto' | 'light' | 'dark';

export interface ShellState {
  /** 画面模式下是否显示 HUD（👁UI；UI 模式下总是显示） */
  hudInArt: boolean;
  /** 缩放：适应 / 50%（960×540）/ 100%（1920×1080） */
  zoom: Zoom;
  /** 专注：两侧栏和画框下方都收起 */
  focus: boolean;
  /** 画面模式下左栏收成 64px 图标栏（用户自己收的；UI 模式另记在 uiRail） */
  leftRail: boolean;
  /** UI 模式下左栏收成图标栏（选了场景自动收一次；null = 这个标签页还没进过 UI 模式，进来时再定） */
  uiRail: boolean | null;
  /** 📌 钉住左栏：选场景后不自动收起 */
  leftPinned: boolean;
  /** 右栏：常用 / 全部 */
  rightTier: 'common' | 'all';
  /** 右栏各组的展开状态（画面 5 组；键 = 组 id） */
  openGroups: Record<string, boolean>;
  /** 开发者模式（⋯ → 开发者）：fps、覆盖、Godot、种子数字、依据徽标…… */
  dev: boolean;
  theme: Theme;
  /** 画框下方只留一行（null = 按窗口高度自动：<800 时一行） */
  deckOneRow: boolean | null;
  /** 「保留我的改动」：点卡片时不清手动改动（A 的套用函数读它，也可以按住 Alt 点） */
  keepMine: boolean;
  /** UI 模式的画布编辑层（✎）：关掉后画框上的 HUD 不能点选，鼠标全部交给镜头 */
  editOn: boolean;
  /** 📖 学习（C 的 LearnOverlay；还没上线时用外壳自带的过渡版） */
  learnOpen: boolean;
  /** ⌘K 搜索 */
  paletteOpen: boolean;
  /** 导出对话框打开时停在哪一页（⋯ → 导入 = json 页） */
  exportTab: string | null;
  /** 从画面模式切到 UI 模式前停在哪个维度（切回来时回到它） */
  lastArtDim: DimId;
  /** 开发 / QA 脚本在用这个标签页（访问过 __gae.store / __gae.engine）：画面模式也照常画 HUD，老的截图脚本不受影响。不持久化 */
  qa: boolean;
  /** 100% / 50% 缩放时画框的平移（CSS px）。不持久化 */
  pan: { x: number; y: number };
  /** 📖 学习停在哪一页（过渡版学习层用；C 的 LearnOverlay 可以读它） */
  learnTab: string;
  /** 对比的 A 叫什么（钉 A 时记下当时的配方 / 皮肤名） */
  aLabel: string;
  /** 钉 A 时画面上有没有游戏 UI（A 截图含不含 HUD；null = 不知道）。不持久化 */
  aHud: boolean | null;
  /** 顶栏场景标签的弹窗开着（⌘K 搜到「游戏条件」参数时打开它）。不持久化 */
  scenePopOpen: boolean;
  /** 正在截 1920×1080 的图：画框临时放到 100%，舞台盖一层「截图中」 */
  capturing: boolean;
  /** 开发者面板（⋯ → 覆盖统计 / 皮肤规格页）。不持久化 */
  devPanel: 'coverage' | 'spec' | null;
  /**
   * 游戏 UI 的品质下限（E 的 paint.ts QUALITY.on：最小字号、最细描边、面板不透明度、亮场景上的自动描边与衬底、矢量图标）。
   * 视图▾ 里的开关（整合 X#11），只是查看（对照改进前的样子），不进参数；记在外壳状态里，刷新、新标签页都带着；重置视图 / 全部重新开始时回到开
   */
  qualityFloor: boolean;
  set: (p: Partial<ShellState>) => void;
  toggleGroup: (id: string, open?: boolean) => void;
}

// v2（审查修复 4 / 17）：v1 的 leftRail 是两种模式共用的一份，旧标签页里可能记着「收起」——换键名让它们回到首屏的展开状态
const KEY = 'gae.shell.v2';
const OLD_LAST = 'gae.shell.v1.last';
const PERSIST: (keyof ShellState)[] = ['hudInArt', 'zoom', 'focus', 'leftRail', 'uiRail', 'leftPinned', 'rightTier', 'openGroups', 'dev', 'theme', 'deckOneRow', 'keepMine', 'editOn', 'lastArtDim', 'qualityFloor'];
/** 不跨会话带过去的（新开标签页从首屏开始）：专注、100%、左栏开合、👁UI */
const SESSION_ONLY: (keyof ShellState)[] = ['focus', 'zoom', 'leftRail', 'uiRail', 'hudInArt'];

function load(): Partial<ShellState> {
  try {
    const own = sessionStorage.getItem(KEY);
    const raw = own ?? localStorage.getItem(`${KEY}.last`) ?? localStorage.getItem(OLD_LAST);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of PERSIST) if (k in o) out[k] = o[k];
    if (!own) for (const k of SESSION_ONLY) delete out[k];
    if (typeof out.uiRail !== 'boolean') delete out.uiRail;
    return out as Partial<ShellState>;
  } catch {
    return {};
  }
}

let saveTimer = 0;
function save(s: ShellState) {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const o: Record<string, unknown> = {};
      for (const k of PERSIST) o[k] = s[k];
      const txt = JSON.stringify(o);
      sessionStorage.setItem(KEY, txt);
      // 新开的标签页从上次的外观开始（主题、开发者模式、分组展开……）
      localStorage.setItem(`${KEY}.last`, txt);
    } catch {
      /* 隐私模式等：只是不记 */
    }
  }, 300);
}

export const useShell = create<ShellState>((set, get) => ({
  hudInArt: false,
  zoom: 'fit',
  focus: false,
  leftRail: false,
  uiRail: null,
  leftPinned: false,
  rightTier: 'common',
  openGroups: { texture: true },
  dev: false,
  theme: 'auto',
  deckOneRow: null,
  keepMine: false,
  editOn: true,
  learnOpen: false,
  paletteOpen: false,
  exportTab: null,
  lastArtDim: 'world',
  qa: false,
  pan: { x: 0, y: 0 },
  learnTab: 'atlas',
  aLabel: '',
  aHud: null,
  scenePopOpen: false,
  capturing: false,
  devPanel: null,
  qualityFloor: true,
  ...load(),
  set: (p) => set(p),
  toggleGroup: (id, open) => set({ openGroups: { ...get().openGroups, [id]: open ?? !get().openGroups[id] } }),
}));

useShell.subscribe((s, prev) => {
  if (PERSIST.some((k) => s[k] !== prev[k])) save(s);
  if (s.theme !== prev.theme) applyTheme(s.theme);
  if (s.dev !== prev.dev) applyDevNotices(s.dev, true);
  if (s.qualityFloor !== prev.qualityFloor) QUALITY.on = s.qualityFloor;
});

/**
 * 开发者模式打开时 HUD 的解析警告也收开发用的提示（E 的 sys/check.ts DEV_NOTICES.on：C-font-alias「缺字体文件，用黑体画」，整合 X#11）。
 * 解析结果按 values 对象缓存（D 的 resolve.ts），切换后给 values 换一个同内容的新对象，让面板的「⚠N」重新解析（不进撤销、不改任何值）
 */
function applyDevNotices(on: boolean, reresolve: boolean) {
  if (DEV_NOTICES.on === on) return;
  DEV_NOTICES.on = on;
  if (reresolve) useStore.setState((st) => ({ values: { ...st.values } }));
}
applyDevNotices(useShell.getState().dev, false);
QUALITY.on = useShell.getState().qualityFloor;

/** 主题：auto 跟随系统；light / dark 写到 <html data-theme> */
export function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === 'auto') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
}
applyTheme(useShell.getState().theme);

/** 当前模式：store.activeDim === 'hud' 就是 UI 模式 */
export const modeOf = (dim: DimId): Mode => (dim === 'hud' ? 'ui' : 'art');
export const useMode = (): Mode => useStore((s) => modeOf(s.activeDim));

/** 切模式（顶栏的画面 / UI 标签、快捷键 1 / 2）：UI → activeDim = 'hud'；回画面时回到上次的维度 */
export function setMode(m: Mode) {
  const st = useStore.getState();
  const cur = modeOf(st.activeDim);
  if (cur === m) return;
  if (m === 'ui') {
    useShell.getState().set({ lastArtDim: st.activeDim });
    st.setDim('hud');
  } else st.setDim(useShell.getState().lastArtDim === 'hud' ? 'world' : useShell.getState().lastArtDim);
}

/** 画面模式下 HUD 是否隐藏（UI 模式总是显示；QA 标签页照旧显示） */
export const hudHidden = (s: ShellState, dim: DimId) => modeOf(dim) === 'art' && !s.hudInArt && !s.qa;

/** 这个模式下左栏是不是收成了图标栏 */
export const railOf = (s: ShellState, m: Mode): boolean => (m === 'ui' ? !!s.uiRail : s.leftRail);
/** 当前模式的左栏开合（App 的 left-rail 类、左栏本身用） */
export const useRail = (): boolean => {
  const m = useMode();
  return useShell((s) => railOf(s, m));
};
/** 收起 / 展开当前模式的左栏（[ 键、收起把手、» 按钮） */
export function setRail(collapsed: boolean, m: Mode = modeOf(useStore.getState().activeDim)) {
  useShell.getState().set(m === 'ui' ? { uiRail: collapsed } : { leftRail: collapsed });
}

// 全部重新开始（A 的 resetView('all')）：左栏回到首屏的展开状态，UI 模式的收起也重新算（A 的 shellBridge 管缩放 / 专注 / 👁UI / 平移，这里只补左栏）
registerViewReset('shell.rail', (kind) => {
  if (kind === 'all') useShell.getState().set({ leftRail: false, uiRail: null, aHud: null, scenePopOpen: false });
});
// 重置视图 / 全部重新开始：品质下限回到开（它是视图▾ 里的查看开关）
registerViewReset('shell.quality', () => { if (!useShell.getState().qualityFloor) useShell.getState().set({ qualityFloor: true }); });
