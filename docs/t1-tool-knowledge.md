# T1 探索台接入 UI 知识库：原则、风格图谱、复刻库

> 架构稿（2026-10-15）。目标：探索台不只让人"调出某款游戏的 UI"，还要随手解释**为什么、什么时候用**，并且能**大而全**地浏览风格。
> 数据来自 K2 设计原则（`docs/survey/16-ui-design-principles.md` ↔ `src/content/uiPrinciples.json`）、K1 风格图谱（`docs/survey/17-ui-style-atlas.md` ↔ `src/content/uiStyleFamilies.json`）、R5 复刻库（`docs/ui-replicas.md` ↔ `src/content/replicas/*.json`）和 452 张参考卡（`src/content/uiRefs.json`）。
> 用户原话："为什么、什么时候用"；"大而全，不是复刻一款游戏"；"手游的商城、奖励、抽卡这些不用学了"。

## 0. 五个目标

| | 目标 | 落在哪 | 构建者 |
|---|---|---|---|
| G1 | 每个参数 / 取值旁边的依据：相关原则（标题 + 做法 + 适用 + 代价，点了打开原则）、用这个取值的风格家族（点了打开家族）、例子游戏 | 右栏 UI 面板的参数行（UiParamRow）与选项提示 | B1 |
| G2 | 左栏"UI 原则"：领域 → 原则（可搜索）+ 品类篇；原则页带"套用做法"与"演示"（UI A/B） | 左栏新页签 + 视口演示条 | B2 |
| G3 | 左栏"UI 风格图谱"：门类 → 家族 → 子族；家族页带"套用"（皮肤 + 参数 + 预览情境） | 左栏新页签 | B3 |
| G4 | 左栏"复刻库"：按品类 / 家族 / 名字列出复刻；逐屏套用、参考截图、评分、缺口 | 左栏新页签 | B4 |
| G5 | 商业化收起：界面模板与案例里的商城 / 奖励 / 抽卡 / 签到 / 首充 / 通行证 / 转盘 / 红包 / 拍脸图收进折叠组「商业化（不再扩充）」，随机探索不抽它们和运营参数组 | 起点页、案例 chips、随机面板、动效页演示下拉 | B4 |

## 1. 数据与加载

| 文件 | 原始大小 | 构建后（gzip） | 加载方式 |
|---|---|---|---|
| `src/content/uiPrinciples.json` | 2.36 MB | 1.82 MB（557 KB） | 懒加载，独立块 |
| `src/content/uiStyleFamilies.json` | 2.16 MB | 1.62 MB（443 KB） | 懒加载，独立块 |
| `src/content/uiRefs.json` | 436 KB | 335 KB（59 KB） | 懒加载，独立块（之前 src 里没有任何地方 import 它，只有脚本读） |
| `src/content/replicas/*.json` | 9–34 KB / 份 | 14–30 KB / 份 | `import.meta.glob` 懒加载，一份一块；以后几百份照样（真到上千份再加生成的索引文件） |

- 实测（`vite build` 到临时目录）：主包只多了约 14 KB（架构代码 + 占位组件），四类数据全部是单独的块。
- 加载器用 `import.meta.glob(<单个文件>, { import: 'default' })` 而不是 `import('./x.json')`：Vite 一样拆块，但 TypeScript 不去推断几 MB JSON 的类型（类型在 `uiKnowledge.ts` 里手写）。
- 第一次用到时才加载：`useUiKnowledge()` 挂上就触发；原则 + 图谱 + 参考卡一起加载并建索引（只建一次），之后同步可得（`peekUiKnowledge()`）。复刻库单独加载（`useReplicas()`）。
- `npm run build:single`（vite-plugin-singlefile）会把所有块内联进一个 HTML：单文件版多约 3.8 MB，且数据在启动时就解析——这是单文件模式本身的代价，维护者决定要不要在单文件里排除知识库。
- **参考截图**（`qa/refs-cache/**`、复刻的 `screens[].ref`）只在本地开发服务器显示：`refImageUrl(path)` 在 `import.meta.env.DEV` 时返回 `/qa/…`（Vite 从项目根目录直接服务），生产构建返回 `null`，界面显示「参考截图只在本地开发环境显示」（`REF_DEV_ONLY_NOTE` / `<RefNote />`）。截图**不复制**进 `public/`、不进包；外链一律不显示。

## 2. 架构总览

```
uiPrinciples.json ─┐
uiStyleFamilies.json ─┼─ src/content/uiKnowledge.ts（类型 · 懒加载 · 纯索引 · 套用补丁；不依赖 React / store）
uiRefs.json ───────┘        │
replicas/*.json ────────────┤
                             ├─ src/ui/hud/useUiKnowledge.ts（React 入口：useUiKnowledge / useUiKnowledgeState / useReplicas）
                             ├─ src/ui/hud/KnowledgeBits.tsx（共用小件：截图、缩略图、原则 / 家族 / 参数小标签）
                             │
          ┌──────────────────┼───────────────────────┬─────────────────────┐
   B1 UiParamRow / UiPanel   B2 PrinciplesPanel        B3 UiAtlasPanel        B4 ReplicaPanel + Monetization + uiRandom
   （G1 依据）               + DemoBanner（G2）        （G3）                 （G4 + G5）
                             │
              store：openKnowledge / knowSel / uiLeftTab / jumpUiParam / uiJump / hudDemo / setSlotA
              所有"套用"= store.patch(set, unset, label)，一步可撤销
```

`src/content/uiMonetization.ts` 是商业化名单（小文件，启动包可以直接用）。

## 3. `src/content/uiKnowledge.ts` 接口

全部是纯函数（`tsx scripts/test-knowledge.ts` 485 项测试通过；顺带校验了所有家族、所有 demo、所有复刻的键：**0 个**存不进 Values 的键）。

### 3.1 加载

| 函数 | 说明 |
|---|---|
| `loadUiKnowledge(): Promise<UiKnowledge>` | 原则 + 图谱 + 参考卡 + 全部索引；缓存，失败可重试 |
| `peekUiKnowledge(): UiKnowledge \| null` | 已加载就同步给 |
| `loadPrinciples / loadFamilies / loadRefs` | 单独加载某一份（一般不用） |
| `loadReplicas(): Promise<KReplica[]>` / `peekReplicas()` | 全部复刻（按名字排序） |
| `replicaIds(): string[]` / `loadReplica(id)` | 只看文件名 / 只加载一份 |
| `IS_DEV`、`REF_DEV_ONLY_NOTE`、`refImageUrl(path)` | 截图只在开发环境 |

### 3.2 `UiKnowledge` 里的索引

| 字段 | 内容 |
|---|---|
| `principles` / `families` / `refs` | 三份原始数据（类型 `PrinciplesFile` / `FamiliesFile` / `RefsFile`） |
| `principleById`、`areaById`、`approachById`、`sourceById` | 原则（P-…）、领域、做法（P-…#a1）、文献（S…） |
| `chapterById` | 品类篇：`explore` 与 `G-explore` 两种键 |
| `demoById` | 原则 demo、派生的单变量 demo（extraDemos）、品类篇 demos：id → `{ demo, principle? , chapter? }` |
| `familyById`、`groupById`、`childrenOf`、`topFamiliesOf` | 家族 / 子族、门类、家族 → 子族、门类 → 顶层家族（按 groups[].families 顺序） |
| `cardById`、`cardNames` | 参考卡；卡名（参考库外的卡也能从家族 exemplars 拿到名字） |
| `principlesByParam` | 参数 → `ParamPrincipleRef[]`：做法谱系逐键登记（原键 **和** 模板参数都登记：`el.timer.priority` 也挂在 `elx.priority` 下），另加 paramIndex 的 demo / rule、paramRationale 的 rationale |
| `chaptersByParam` | 参数 → 品类篇 demo |
| `familiesByValue` | `"参数=取值"` → 家族（多选每一项单独登记；`hud.style=<皮肤值>` 也在里面） |
| `familiesByParam` | 参数 → 写了它的家族（只登记家族自己写的 params：子族只列它改过的键） |
| `familiesBySkin` | hud.style 的值 → 用这套皮肤的家族 / 子族 |
| `principlesByFamily` | 家族 → 原则（原则 styleVariants 的 `how` + 图谱 relatedPrinciples + topPrinciples） |

### 3.3 查询

| 函数 | 说明 |
|---|---|
| `rationaleOf(k, key, value)` → `Rationale` | **G1 的核心**：一个参数（可以是覆盖键 `cmp.gauge@el.vitals`、元素实例键 `el.vitals.scale`、选择器 `uip.screen` / `uip.layout` / `hud.style`）在当前取值下的依据：`approaches`（取值一致的 `match = true` 排前）、`mentions`（只被点名的原则）、`chapters`、`families`（取值一致的排前）、`note` / `noRationale`（工具参数显示"暂无原则"）、`cards`（例子游戏，最多 12）。界面模板 `tpl.*` 会换算成它的 cnt.screen / cnt.subtype 去查；品类布局查对应的品类篇；皮肤查用它的家族 |
| `valueMatches(raw, cur)` | 多选按交集、数值按相等、auto 不算 |
| `baseKeyOf(key)` | 覆盖键 / 元素实例键 → 模板参数 id |
| `principleOneLiner(p)` | JSON 里**没有** oneLiner 字段，用标题（标题本身就是一句话结论） |
| `demosOf(p)`、`demoRunnable(d)` | 原则的全部 demo；note 类不能演示 |
| `cardName(k, id)`、`cardShotUrl(k, id, i)`、`cardFamily(k, id)` | 卡名、第 i 张截图（开发环境）、卡的新家族（assignments 是唯一真相，uiRefs 的 family 是旧名） |
| `familySkinId(f, familyById)`、`topGenre(k, f)`、`familyPreview(k, f, 'main' \| 'hud' \| 'dwell')` | 家族的皮肤预设 id、最常见品类、预览情境 `{ pack, layout, screen?, demo? }` |
| `principlesOfFamily(k, f)` | 家族的相关原则（带 how） |
| `PACK_LAYOUT`、`packOfGenre(genre)` | 内容包 → 品类布局；图谱品类键（含 mobile / fighting / sports / mobaBr / vehicleSim / mmo）→ 内容包 |

### 3.4 套用（返回 `KPatch = { set, unset, label, baseRecipe?, dropped? }`，交给 `store.patch(set, unset, label)`）

| 函数 | 语义 |
|---|---|
| `applyFamily(k, f, current, opts)` | 皮肤（hud.style）+ 父族 params + 子族 params（+ `variant`）；关键词回到跟随皮肤、节日清掉；先把**风格域**手动值（vis / col / typ / ast / cmp / st / mo、rel.hudVisibility、rel.harmony、ix.press、ix.focus，含它们的 @ 覆盖）清回跟随。`opts.preview`（默认 true）：cnt.pack = 家族预览的包、uip.layout = 这个包的品类布局（家族 params 自己写了就不覆盖），并清掉**内容 / 版式域**手动值（cnt / lay / hier / el / elx，界面类型除外）——这样每个家族都在自己的典型题材里画，不会全是雪线旅人；零 HUD 族带上 chk.demo。`opts.screen`：`keep`（默认，不动当前界面）/ `main` / `hud` / `dwell`（写 cnt.screen，uip.screen 回 auto）。`opts.layout`：同时写 context.params（lay.hudOrg、元素画法……）。`opts.lite`：HUD 减配版。不改平台、商业模式、无障碍叠加 |
| `convertPatch(k, f, step, current)` | 灰盒 → 家族的改造：step 0 = 灰盒，1–5 = 累加 convertParams 前几步；没有分步数据返回 null |
| `applyApproach(p, a, { context })` | 只写做法自己的参数（叠在当前值上）；`context = true` 先垫主 demo 的 base（内容包、界面类型、元素集合）——不换皮肤。`renderNote` 存在时界面要把它显示出来（探索台画不全的地方） |
| `demoSides(demo, current)` → `{ a, b, patchB, dropped }` | a / b = 当前画面 + **UI 全部回到跟随** + 基线皮肤（demo.skin，默认灰盒）+ base + 各自一侧；patchB 把当前状态变成 b |
| `sceneVariantValues(s)` | demo 的场景变体 → `{ game.scene, …set }` |
| `rebaseUi(uiFrom, artFrom)` | 画面取 artFrom、UI 取 uiFrom（演示中换了画面，A 槽要跟着换画面） |
| `replicaScreenPatch(rep, screen, current, { uiOnly })` | 与 `__gae.replicaShots`（src/main.tsx）同一套叠法：默认值 →（art.recipe：整套画面配方，保留场景 / 品类）→ art.values、art.scene → cnt.pack = pack → base → 这一屏的 values；UI 键全部先回跟随。**不钉 16:9 画幅**、**保留当前种子**。返回整套值 + `baseRecipe`（调用方接着 `setBaseRecipe(baseRecipe)`、`setBaseStyle(null)`，与 applyRecipe 一致）。`uiOnly`：只套 UI，画面不动（这时不要动 baseRecipe） |
| `replicaScore(rep, key)` | 一屏的评分 |
| `toStoreVal / toStoreValues(raw, dropped)` | 原始值 → Values 的存法（多选 → 逗号串、渐变对象 → 逗号色标），只留 validKey 认得的键 |
| `uiCleared(values)` | UI 键全部回跟随（与 store.unset 同口径） |
| `isStyleKey / isContentKey` | 上面两个"域"的判定 |

## 4. store 新增（`src/state/store.ts`，架构已写好）

| 字段 / 动作 | 说明 |
|---|---|
| `LeftTab` 加 `'uiPrinciples' \| 'uiAtlas' \| 'uiReplicas'` | UI 模式的三页 |
| `uiLeftTab` / `setUiLeftTab` | UI 模式的左栏页签（与画面模式的 `leftTab` 分开记，切模式各自回到上次的页）；默认 `uiPrinciples` |
| `knowSel: { principle, family, replica }` | 知识面板里选中的条目（null = 列表）。principle 可以是 `P-…` 或品类篇 `G-…` |
| `openKnowledge(kind, id)` | 切到 UI 模式（如果不在）、切左栏页签（`KNOW_TAB`）、选中条目。**所有"点了去看原则 / 家族 / 复刻"的地方都用它** |
| `jumpUiParam(id)` / `uiJump` | 请求右栏 UI 面板跳到某个参数：UiPanel 已经在监听——切到它的页签（元素实例键 / `@el.*` 覆盖键先选中元素、切"元素"页），tier 3 展开"更多"，滚到 `#param-<id>` |
| `hudDemo: HudDemo \| null` / `setHudDemo` | 正在进行的原则演示（id、owner、title、lookAt、kind、focusKeys、art、scenes、play），视口演示条读它 |
| `setSlotA(snapshot)` | 直接写 A 槽（演示时 A 是算出来的一组值，不是当前快照）；Viewport 已经订阅 slotA / hudABOn → `engine.hudAB` |

UI A/B 的工作方式（读过的代码）：`hudABOn && slotA` 时 Viewport 把 `slotA.values` 交给 `engine.hudAB`，HudSystem 左半边用 A 的值解析、画 UI，右半边用当前值；场景只有一份（当前值的），A 侧的 UI 色板用 `scenePaletteOf(A.values)`——所以演示途中换了画面，A 槽要 `rebaseUi`。

## 5. 已接好的接入点（架构在这一轮改的文件）

| 文件 | 改了什么 |
|---|---|
| `src/ui/LeftRail.tsx` | UI 模式（`activeDim === 'hud'`）显示另一组页签：UI 原则 / UI 风格图谱 / 复刻库 / 场景；渲染 `PrinciplesPanel` / `UiAtlasPanel` / `ReplicaPanel` |
| `src/ui/Viewport.tsx` | 视口里挂 `<DemoBanner />`（在视距缩放层之外） |
| `src/ui/hud/UiPanel.tsx` | 起点页"界面"选择器的选项改由 `Monetization.screenOptions(p, business, current)` 给（原来的排序原样搬过去），下面挂 `<MonetizationGroup kind="screen" />`；新增 `uiJump` 监听 |
| `src/ui/hud/UiPresets.tsx` | `chips()` 多一个过滤参数；"真实游戏案例"用 `keepPreset` 过滤，后面挂 `<MonetizationGroup kind="example" />` |
| `src/ui/Explore.tsx` | 随机面板多一个"游戏 UI"锁（默认锁住），解锁时并入 `randomizeUi(values, seed, amount)` 的结果 |
| `package.json` | `npm test` 加上 `scripts/test-knowledge.ts` |
| 新文件 | `src/content/uiKnowledge.ts`、`src/content/uiMonetization.ts`、`src/ui/hud/useUiKnowledge.ts`、`src/ui/hud/KnowledgeBits.tsx`、`src/ui/hud/knowledge.css`、四个构建者的占位组件与 CSS、`scripts/test-knowledge.ts` |

现在的占位组件只显示条目数（能看出懒加载通了），商业化折叠组不渲染、随机返回空对象——行为与改动前一致。

## 6. 文件归属（严格：只改自己的文件；要别人的文件改东西，写进交付说明由维护者合并）

| 构建者 | 独占（可以改 / 重写） | 只读调用 |
|---|---|---|
| **B1**（G1） | `src/ui/hud/UiParamRow.tsx`、`src/ui/hud/UiPanel.tsx`（**保留**第 5 节接入的 Monetization 两处与 uiJump 监听）、`src/ui/hud/ElementInspector.tsx`、`src/ui/hud/KnowledgeBits.tsx`（可改实现与样式，**导出名与 props 不改**，其他人在用）、`src/ui/hud/knowledge.css`、可新建 `src/ui/hud/ParamWhy.tsx` | uiKnowledge.ts、useUiKnowledge.ts、store |
| **B2**（G2） | `src/ui/hud/PrinciplesPanel.tsx`、`src/ui/hud/DemoBanner.tsx`、`src/ui/hud/principles.css`、可新建 `src/ui/hud/principleDemo.ts`（开始 / 切换 / 结束演示的动作） | 同上 + KnowledgeBits、`hud/sim`（fireHud）、`state/actions`（applyRecipe） |
| **B3**（G3） | `src/ui/hud/UiAtlasPanel.tsx`、`src/ui/hud/atlas.css` | 同上 |
| **B4**（G4 + G5） | `src/ui/hud/ReplicaPanel.tsx`、`src/ui/hud/replicas.css`、`src/ui/hud/Monetization.tsx`、`src/ui/hud/uiRandom.ts`、`src/content/uiMonetization.ts`（可以补名单）、`src/ui/Explore.tsx` 里的 `RandomPanel`（只动随机面板）、`src/ui/hud/MotionBar.tsx` 里演示下拉框那一个 `<select>` | 同上 |
| 架构（锁定） | `src/content/uiKnowledge.ts`、`src/ui/hud/useUiKnowledge.ts`、`src/state/store.ts`、`src/ui/LeftRail.tsx`、`src/ui/Viewport.tsx`、`src/styles.css`、`scripts/test-knowledge.ts` | 构建者需要新的纯函数 / store 字段时写进交付说明，不自己改 |

**样式**：每个构建者只写自己的 CSS 文件（已由各自的组件 import），类名用自己的前缀：B1 `kn-`、B2 `pr-`、B3 `at-`、B4 `rp-` / `mz-`；优先复用 `src/styles.css` 的现成类（`card` / `chip`（`blue` / `ok` / `warn` / `link`）/ `hint` / `section-title` / `group-title` / `btn small ghost` / `search` / `sel` / `tabs tab` / `ui-tools` / `ui-chips` / `dialog-mask dialog dialog-head dialog-body`）与颜色变量（深浅色主题自动跟随）。不要改 `src/styles.css`。预留类名写在每个 CSS 文件的头注释里。

## 7. 各构建者的任务

### B1 · G1 参数行的依据

1. **参数行**（UiParamRow）：拿 `useUiKnowledge()`（没加载完就不显示依据，不要阻塞控件）。
   - 行头加一个小徽标（如 `原则 3 · 家族 5`），数字来自 `rationaleOf(k, p.id, 当前值)`；没有任何依据且 `noRationale` 时显示"暂无原则"（灰）。
   - 展开（点徽标，或行处于 focus 时）显示 `kn-why` 块：
     - **做法**（最多 3 条，取值一致的在前）：`<PrincipleChip>`（原则标题，点了打开原则页）· 做法名；"适用：whenToUse"；"代价：cost"；例子游戏 `<CardChips>`（开发环境可用 `<CardThumbs>`）；做法有 `renderNote` 时附上。可选：做法旁"套用"按钮 = `applyApproach(p, a)` → `patch`。
     - **只被点名的原则**（mentions）、**品类篇**（chapters）：一排 `<PrincipleChip>`。
     - **用这个取值的家族**：`families.filter(f => f.match)` 最多 6 个 `<FamilyChip>`；再列"也调这个参数的家族"（不一致的，带它们的取值）最多 4 个。
     - `note`（没有原则覆盖的参数补的一句理由）。
   - 覆盖键 / 元素实例键（ElementInspector 里的行）照样调 `rationaleOf`（它会退到模板参数）。
2. **选项**：分段按钮的 `title`、下拉框 `<option title>`：在原来的 `desc` 后面加一行"做法：N 条 · 家族：A、B、C"（`rationaleOf(k, p.id, o.value)`，按行 `useMemo` 缓存）。起点选择器同样适用：皮肤（hud.style）→ 用它的家族；界面模板 → 对应界面类型的原则；品类布局 → 品类篇。
3. `KnowledgeBits.tsx` / `knowledge.css`：可以打磨（缩略图悬停放大、截图点开大图……），导出名与 props 不改。
4. UiPanel 的 uiJump 监听可以完善（例如 `@button` 这类非元素覆盖键落到"组件"页）。
5. 验收：任选 10 个参数（含 `hier.emphasis`、`el.vitals.scale`、`cmp.gauge@el.vitals`、`hud.style`、`uip.screen`、`uip.layout`、`cnt.pack`），依据都能显示、链接都能打开对应页；没加载完时参数行照常可用。

### B2 · G2 "UI 原则"

1. **列表**：搜索框（标题、问题、做法名、规则全文、例子游戏名）；按领域分组（`areas`：标题 + summary 可折叠）列原则；顶部可选"总则 12 条"（`core`：标题 + 正文 + 原则链接）；底部"品类篇 23 个"（`genres`：label + summary）。选中写 `openKnowledge('principle', id)`（或直接 `knowSel`），列表 ↔ 详情用 `<span className="kn-back">` 返回。
2. **原则页**（左栏 300px 宽，表格改成竖排卡片；可加"大窗看"用 `dialog` 打开同一个组件）：
   - 标题、`principleOneLiner`、领域、universal 标记、`problem`；
   - **做法谱系**（approaches）：每个做法一张卡：名字、适用、代价、参数（`<ParamChip id value>`）、例子游戏（开发环境 `<CardThumbs>`，生产 `<CardChips>`）、`renderNote`；按钮"套用"（`applyApproach(p, a)`）与"在演示情境里套用"（`{ context: true }`）；
   - 经验法则（rules）、反例（antiPatterns：desc + basis + reviewEvidence + 例子）、文献（sources：title 链接、point；`sourceById` 可以补作者 / 年份）、品类（genres + genreNotes → 品类篇链接）、同一原则换一种风格（styleVariants：`<FamilyChip>` + how）、相关原则（related）。
   - **演示**：`demosOf(p)` 每个一个按钮（主 demo + 派生的单变量版）；`kind === 'note'` 只显示 lookAt。
3. **演示流程**（建议写在 `principleDemo.ts`）：
   1. 画面：`demo.art?.[0]` → `applyRecipe(RECIPE_MAP.get(id))`；`demo.scene?.[0]` → `setMany(sceneVariantValues(s), label)`；
   2. `const s = demoSides(demo, useStore.getState().values)`；开发环境 `s.dropped.length` 时 console.warn；
   3. `patch(s.patchB.set, s.patchB.unset, s.patchB.label)`；
   4. `setSlotA({ values: s.a, label: 'A：' + demo.title, ts: Date.now() })`；`setHudABOn(true)`；
   5. `setHudDemo({ id, owner, title, lookAt, kind, focusKeys, art, scenes, play })`。
   - **演示条**（DemoBanner）：标题、"看哪里"、左 A / 右 B 的说明、focusKeys 的 `<ParamChip>`；`art` / `scenes` 多于一个时给切换按钮——切换后 `setSlotA({ ...slotA, values: rebaseUi(slotA.values, useStore.getState().values) })`；`play === 'enter'` 时每 ~2.5 秒 `fireHud('enter')`（`src/hud/sim`），演示结束停；"结束演示" = `setHudABOn(false)` + `setHudDemo(null)`（保留 B 的值，可撤销）。视口顶部中间是改动提示（`.toast`），演示条放左下（占位样式已经这样写）。
   - 品类篇的 demos（`chapter.demos`）用同一套流程。
4. 验收：P-priority-tiers 的主 demo 与单变量 demo、P-harmony-four-relations（art 三套切换）、P-world-legibility-guard（场景两种切换）、P-motion-personality（循环入场）都能演示；撤销一步回到演示前（画面配方那一步另算一步）。

### B3 · G3 "UI 风格图谱"

1. **列表**：搜索（名字、oneLiner、definition、题材 settings、情绪 moods、代表作名字）；筛选：题材（`families.settingIndex` 的键）、情绪（`moodIndex`）、"只看待补参考"；12 个门类（name、description、cardCount）→ 家族（name、oneLiner、cardCount、`needsRefs` 标"待补参考"、kind = visibilityStrategy 标"显隐策略，可叠在任何视觉家族上"）→ 展开子族（`childrenOf`）。
2. **家族页**：
   - 头部：名字、门类、status / confidence（存在性）/ evidenceConfidence（证据）、grammarBasis = 推断 时提示"语法未经卡片验证"、**needsRefs → "待补参考"**（附 refsWanted）。
   - **套用**（`applyFamily` → `patch`）：主按钮"套用（在它的典型题材里看）"= 默认参数；"只换风格"= `{ preview: false }`；"看局内 HUD" / "看停留界面" = `{ screen: 'hud' }` / `{ screen: 'dwell' }`；"同时套版式" = `{ layout: true }`；"HUD 减配版" = `{ lite: true }`（附 hudLite.note 与 channels）；变体（variants：name、diff、cards）各一个"套用变体" = `{ variant: id }`。按钮旁写预览情境：`familyPreview(k, f)` 的包名（cnt.pack 选项的 label）+ 布局名（uip.layout 选项的 label）。
   - oneLiner、definition、distinctFrom；**10 轴语法表**：`families.axes` 每一轴一行（name，question 做 title）→ `grammar[axis.grammarKey]`，下面是这一轴里家族写了的参数 `<ParamChip id value>`；
   - 适用 / 避免（whenToUse / avoidWhen）；**改造 5 步**（convert 文字）每步一个"到这一步"按钮 = `convertPatch(k, f, step, values)`，第 0 步"灰盒"；
   - 美术搭配（artPairing：relation → 同一媒介 / 中性 / 刻意对比、artStyle、why；有 recipeId 时"换成这个画面配方" = `applyRecipe`）；品类（genres：genre + count + why）；题材与情绪 chips；
   - 代表作（exemplars：开发环境缩略图 + why；evidence = described 标"据已知描述"；cross 标"跨族证据"）；失败模式（failureModes：desc、basis、evidence 卡名）；皮肤缺口（skinGap）、参数缺口（paramGaps）、identityGap；相关原则（`principlesOfFamily`：`<PrincipleChip>` + how）。
3. 验收：随便点 10 个不同门类的家族"套用"，画面上的示例游戏随家族换（不是全是雪线旅人）；再点"只换风格"不换题材；撤销一步回到套用前。

### B4 · G4 "复刻库" + G5 商业化收起

**G4**
1. **列表**：`useReplicas()`；分组方式（品类 / 家族 / 名字，分段按钮）+ 搜索；每条：名字、品类、家族（`<FamilyChip>`，图谱里没有的中文家族名显示成普通 chip）、屏数、平均 overall 分、高严重度缺口数。
2. **复刻页**：名字、参考卡（`<CardThumb>`）、家族、内容包、notes；**每一屏**一张卡：key、评分（layout / elements / palette / type / shape / density / overall、round）、按钮"套用这一屏"（`replicaScreenPatch(rep, s, values)` → `patch` → `setBaseRecipe(baseRecipe ?? null)`、`setBaseStyle(null)`）与"只套 UI"（`{ uiOnly: true }`，不动 baseRecipe）；**参考截图**：开发环境 `<RefImage path={s.ref}>`，点一下 `setRefImage({ url: refImageUrl(s.ref)!, label })` 放到视口右下角对照；生产 `<RefNote />`；`ref = null` 显示"凭记忆编码，没有参考图"。
3. 缺口清单（gaps：按 screen 分组，severity 上色 `rp-sev-*`，what + proposal）；revisions / round1Diffs 折叠显示。

**G5**（名单在 `src/content/uiMonetization.ts`，已经定好：10 个模板 `tpl.mall / gachaEntry / gachaResult / pass / checkin / firstPay / wheel / redPacket / popupAd / reward`、2 个案例 `ex.cnGacha / ex.cnCheckin`、2 段流程 `gacha / purchase`、界面类型 `screen.liveops`、11 个子功能、参数组 `ops`；`tpl.shopCounter` 柜台商店是玩法里的交易，**不算**）：
1. `screenOptions(p, business, current)`：下拉框去掉商业化模板（`current` 正是其中之一时留着它）；
2. `<MonetizationGroup kind="screen">`：`<details className="mz-group">`，summary「商业化（不再扩充）· 10」，里面一排 chips，点了 = `applyPreset(id, values, { isUi: isUiKey, scene: scenePaletteOf(values) })` → `patch`（与 UiPresets 同一写法），选中的高亮；`kind="example"` 同理列 2 个案例；
3. `keepPreset(p) = !isMonetizationPreset(p.id)`；
4. `randomizeUi(values, seed, amount)`（`uiRandom.ts`）：**探索台原来没有 UI 随机**（随机面板只抽画面维度），这里新写：只抽 `ui.random === true` 的体系参数与起点选择器（hud.style 用皮肤预设、uip.* 用各自的预设），`isMonetizationValue(key, value)` 为真的取值与 ops 组整组跳过；choice 均匀、range 用 `ui.randomRange`（没有时 min–max）、multi 0–2 项、toggle 对半；`amount` = 每个参数被改的概率；同 seed 同结果（`core/rng` 的 mulberry32）。不抽 chk.*（工具）、a11y.*（玩家选项）、cnt.pack（工具参数）。随机面板（Explore.tsx 的 RandomPanel）已经有"游戏 UI"锁，可以调整文案或加"只随机皮肤 / 版式"之类的子选项；
5. MotionBar 演示下拉框：`MONETIZATION_FLOWS` 两项放进 `<optgroup label="商业化（不再扩充）">` 放在最后；
6. 验收：起点页"界面"下拉框里没有商业化模板、折叠组里点得到且能用；案例 chips 同理；随机 50 次（解锁 UI）不出现商业化模板、ops.* 不变；原来选了商业化模板的存档打开后控件显示正常。

## 8. 共同规则

- 界面文字与注释用中文，风格与周围代码一致；TypeScript strict；`npx tsc --noEmit -p tsconfig.json` 必须通过；`npx tsx scripts/test-knowledge.ts` 必须通过。
- 不运行开发服务器、不开浏览器（维护者做视觉 QA）。
- 所有改参数的操作都走 `store.patch / setMany / unset`，一步可撤销，label 写清楚做了什么（"UI 风格家族：暗金金属牌""复刻：Hades · hud"……）。
- 数据只读：不改 JSON；数据看起来有问题（键丢了、字段缺了）写进交付说明。`KPatch.dropped` 非空时开发环境 console.warn。
- 截图只在开发环境：一律用 `refImageUrl` / `<RefImage>` / `<CardThumb>`，不要自己拼 `/qa/...`。
- 大数据不要在模块顶层同步 import（`import x from '../../content/uiPrinciples.json'` 会把 2 MB 塞进主包）——只通过 `useUiKnowledge()` / `useReplicas()` / `load*()` 拿。
- 左栏只有 300px：长列表用 `card` + `chips`，宽表格改竖排；需要大面积时用现成的 `dialog`。

## 9. 给维护者的备注

- **UI 随机原来不存在**：任务里说的"随机 UI 探索"在代码里找不到（`RandomPanel` 只抽 12 个画面维度，`paramsOf()` 本身就排除了 UI 参数）；这一轮由 B4 新写 `randomizeUi`，默认锁住，不影响原来的画面随机。
- **"家族层"没有做**：图谱 JSON 的说明里提议在 `resolve.ts` 的 LAYER_RANK 加一个 skin 与 theme 之间的"家族层"；这一轮按任务要求把家族当成手动值套（`applyFamily`），解析器不动。好处是可撤销、和"UI 配方 / 案例"同一口径；代价是家族参数显示为"手动"，之后单独改皮肤盖不过它们（需要先"↺ 全部跟随"）。要不要加家族层由维护者决定。
- `tpl.shopCounter`（柜台商店）、`tpl.forge`（锻造 / 变强）、`tpl.lobby`（手游主界面）留在常规列表；需要的话在 `uiMonetization.ts` 里加。
- 发现一个旧问题：`src/ui/styles.css`（`.vp-scale` / `.vp-dist`，M8b 视距预览）没有被任何文件 import，样式没有生效；不在本轮范围，没改。
- `build:single` 会把知识库内联进单文件（见第 1 节）。

## 10. 修复轮（体验评审 27 条之后）

- **UI A/B 分界**：`store.hudABSplit`（0 = 只看 B、1 = 只看 A、0.5 = 对半）→ Viewport 同步给 `engine.hud.abSplit`；HudSystem 按视口宽度算分界（夹在画幅黑边内），0 / 1 只画一侧；视口上有拖动柄（`AbSplitHandle`，挂在视距缩放层里），演示条与"UI 左右对比"小横条上有"只看 A / 对半 / 只看 B"。流程演示时 A 侧也盖上当前这一屏（两侧一起换屏）。
- **对比演示的结束方式**（`principleDemo.endDemo(mode)`）：`restore` 回到演示前（列表与演示条的默认）· `carry` 回到演示前、只把 focusKeys 带回自己的 UI · `keep` 保留 B（演示打开的 `chk.*` 检查工具一并关掉）· `undone` 演示那一步被 Ctrl+Z 撤掉时自动收尾（只还原 A 槽、A/B 开关、诊断视图）。换复刻、家族"UI 左右对比"之前都走 `endDemo('keep')`，不再直接 `setHudDemo(null)`。
- **眯眼 / 色盲**：`chk.squint` 没有代码读它，真正的模糊是诊断视图；演示数据里 `chk.squint = true` 或"看哪里"提到眯眼时，开始演示打开诊断"眯眼"+"含 UI"，结束时还原；演示条有"眯眼看"开关，用到色盲模拟的演示有 `chk.cvd` 下拉框。`HudDemo` 多了 `derived / squint / cvd`；单变量版的 lookAt 换成原 demo 的。
- **品类布局补全**（`genreLayoutFill`）：只给了内容包、没给布局的局内 HUD 演示 / "换到演示题材再套用" / 品类篇"套用这种组织"补上 `PACK_LAYOUT[pack]`，不然画的是四控件样本、el.* 的差别看不出来（235 个演示里原来 102 个这样）；`scripts/test-knowledge.ts` 检查每个局内 HUD 演示两侧都按元素排版。"换到演示题材再套用"不带 demo.base 里的 `chk.*`。
- **撤销**：`Snapshot` 记下 `baseRecipe / baseStyle`，撤销 / 重做时一起还原（配方列表高亮、"跟随当前画面"的三个方案跟着回去）。
- **返回上一条**：`store.knowStack` + `knowBack()`；`openKnowledge(kind, id, how)` 的 `how = 'replace'` 用于上一条 / 下一条翻页（不进返回栈），回到列表时清空。各详情页有"← 返回「上一条」"（`KnowledgeBits.KnowBackLink`）。
- **大窗**：里面点了套用 / 演示 / 参数 / 截图就自动关掉（`useCloseOnAction`）。
- **随机**：UI 模式下打开随机面板默认锁住全部画面维度、只随机 UI；锁的选择按模式记在模块里。界面模板 / 版式模式 / 场景容器移到单独的"界面"块（默认不抽）；这三类预设里带商业化取值的（手游主界面、邮件、任务的活跃度宝箱……，`presetCarriesMonetization`）不抽。`rcp.mobileArpgF2P` 收进 UI 配方后面的商业化折叠组；右栏"运营"页签改名"运营·商业化"放到最后。
- **其它**：起点页提示"手动风格值 / 手动元素集合会盖住新皮肤 / 新布局"并给一键回到跟随；家族套用旁写明"参数显示为手动"、可以同时换建议场景、零 HUD 族套用后播一遍流程演示；复刻库不再等知识库加载；`loadReplicas` 用 id → 加载器的 Map + `Promise.allSettled`（坏文件只跳过）；参数跳转（uiJump）不再在面板重新挂上时重跳；家族小标签里的"待补参考"改成空心小圆点；`src/ui/styles.css`（视距缩放层）由 Viewport 引入。
