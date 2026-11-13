/*
 * 游戏 UI 皮肤的数据结构（docs/ui-hud-plan.md）。
 * 盒子样式的字段刻意对齐 Godot 的 StyleBoxFlat（底色、各边边框、圆角、切角、阴影、内边距、倾斜），
 * StyleBoxFlat 表达不了的效果（毛玻璃、双线边框、内阴影、图案底、手绘椭圆圆角）单独成字段，迁移时标注难度。
 * 颜色可以写死（'#rrggbb' / 'rgba(...)'），也可以引用色板：'@accent' '@accent2' '@paper' '@ink' '@good' '@sky'
 * （"UI 取色自色板"打开时取当前色板，关闭时取皮肤默认值）。
 */

export type ColorRef = string;

export type Paint =
  | { solid: ColorRef }
  /** angle 与 CSS 一致：180 = 从上到下，90 = 从左到右；stops 的位置 0~1 */
  | { linear: { angle: number; stops: [number, ColorRef][] } }
  /** at：圆心在盒子里的相对位置（默认中心）；shape：ellipse 贴合盒子，circle 为正圆（半径到最远角） */
  | { radial: { at?: [number, number]; shape?: 'ellipse' | 'circle'; stops: [number, ColorRef][] } }
  /** 图案底：横格纸线 / 网点 / 竖条纹 / 斜条纹（size = 一个周期，line = 线或点的宽度） */
  | { pattern: { kind: 'ruled' | 'dots' | 'stripes' | 'diagonal'; bg?: ColorRef; fg: ColorRef; size: number; line: number } };

export interface Shadow {
  color: ColorRef;
  x: number;
  y: number;
  blur: number;
  /** 内阴影（CSS inset） */
  inset?: boolean;
  /** 实心厚度（vis.depth = extrude，M12b-36）：沿偏移方向扫出连续的侧壁（几份偏移副本叠成一块），不是一个错位块 */
  sweep?: boolean;
}

export interface Border {
  width: number;
  color: ColorRef;
  /**
   * double：外线、空隙、内线各占三分之一；dashed：虚线。M12b-37 新线型：sticker = 贴纸多重环（外墨环 w + 主描边 2w + 内墨环 w，墨色 = ink）；
   * inline = 主边 + 内缩 2 的 1px 对比线（色 = ink，没给时按主边明暗自动取）；stitched = 内缩 3 的缝线虚线；pencil = 两遍低透明的抖动铅笔线
   */
  style?: 'solid' | 'double' | 'dashed' | 'sticker' | 'inline' | 'stitched' | 'pencil';
  /** 描边发光（0~1） */
  glow?: number;
  /** sticker 的内外墨环色 / inline 的对比线色（M12b-37） */
  ink?: ColorRef;
  /** 两端渐隐（vis.strokeFade，M12b-37）：每条线两端各渐隐这么多比例（0~0.5）；只对矩形框的四边、分边、分隔线生效 */
  fade?: number;
  /** 粗细调制（vis.strokeModulation，M12b-44）：0~1，直线段画成两端细、中段胖的膨线（书法线）；只对矩形框的四边与分边生效，没给 = 等宽 */
  mod?: number;
}

/**
 * 外形（vis.silhouette 小组件 / vis.panelShape 面板）：box = 按转角画。M12b-38：oval 椭圆（方框里是竖椭圆）、octagon 八角、arrowRight / arrowLeft 箭头端、arch 拱顶、
 * stepped 装饰艺术两级阶梯顶、scallop 扇贝 / 云边；M12b-39：randomQuad 逐角随机的不规则四边形、shard 尖碎片、brushStroke 一笔干笔刷（两端收尖、尾部飞白）
 */
export type Silhouette = 'box' | 'circle' | 'diamond' | 'hexagon' | 'shield' | 'shieldTail' | 'ribbon' | 'trapezoid'
  | 'oval' | 'octagon' | 'arrowRight' | 'arrowLeft' | 'arch' | 'stepped' | 'scallop' | 'randomQuad' | 'shard' | 'brushStroke'
  | 'boomerang' | 'quarterCircleBase' | 'roundShield';
/** 边缘处理（vis.edge）；M12b-39：burnt 烧边（撕边 + 暗色焦边）、deckle 毛边纸、scallop 扇贝边 */
export type Edge = 'clean' | 'torn' | 'jagged' | 'brush' | 'ornate' | 'burnt' | 'deckle' | 'scallop' | 'printWorn';
/** 盒子的角（vis.cornerMask，M12b-38） */
export type Corner = 'tl' | 'tr' | 'br' | 'bl';
/**
 * 叠在面板上的图案（vis.pattern）。M12b-42：area = 作用区域（vis.patternArea：panel 整块 / header 标题带 / edgeStrip 沿描边那几条边 6% / shadowOnly 下方与右侧 40% 渐隐）；
 * colors = 多色图案（双色网屏、肯特布、龟甲）的第二 / 第三色；matrix = 抖动矩阵（bayer4 / bayer8）、cell = 抖动格边长（设计单位，跟 vis.pixelScale）；
 * origin = 放射光芒的中心（盒内相对位置）；header = 标题带高（设计单位，没给时按 dividerAt / 盒高 18%）；edges = edgeStrip 的边（t / r / b / l）
 */
export interface PatternOverlay { kind: string; opacity: number; color: ColorRef; area?: string; colors?: ColorRef[]; matrix?: string; cell?: number; origin?: [number, number]; header?: number; edges?: string }
/** 装饰（vis.ornament + vis.motif + ast.ornaments） */
/** named：明确点名（不是派生规则补出来）的饰件，位图饰件只给这些画（M11） */
/**
 * scope：饰件作用范围（ast.ornamentScope：all / screens / templatePanels / largePanels）；minSize：短边低于它不画角饰与分隔线（ast.ornamentMinSize，px@1080p，theme.ts 已换成设计单位）；
 * 两者没给 = 原来的画法（旧皮肤没显式选过时）。container：这块是界面的主容器面板（templatePanels 只画它）（M12a-07）
 */
/** dividerStyle：分隔线样式（vis.dividerStyle，M12a-08：plain = 只画两段线、不放中间的母题符号；没给 = 原来的带符号分隔线） */
/**
 * micro（M12b-48 的功能性微字饰件，ast.ornaments 含 microText / rulerRail / registration 时 theme.ts 给）：density = 数据噪声块的密度（vis.noiseDensity）、
 * color = 小字色（col.muted）、font = 小字的字族（窄体）、rail = 刻度侧轨画在哪几条边（t / r / b / l，跟 vis.strokeSides，没给 = 左右）、mat = 轨面材质（ast.frameMat）
 */
export interface Ornament { level: number; motif: string; color: ColorRef; parts: string[]; dividerAt?: number; named?: string[]; scope?: string; minSize?: number; container?: boolean; dividerStyle?: string;
  micro?: { density: number; color: ColorRef; font: string; rail: string; mat?: string };
  /** 饰件线（分隔饰条）两端渐隐的比例（vis.strokeFade，M12b-37，hollow-knight#22）；没给 = 齐头 */
  fade?: number;
  /** 粗细调制（vis.strokeModulation，M12b-44）：显式给了才有；没给时卷草母题按母题默认（baroque 0.7 / ironScroll 0.3 / wroughtIron 0.45），其余母题等宽 */
  mod?: number;
  /** 第二母题（vis.motif2，M12b-43）：分隔线中间的符号与端头用它；没给 = motif */
  motif2?: string;
  /** 分隔线的位置（vis.dividerPlace 显式给了才有，M12b-45）：不含 panelBottom 时饰件的底边分隔线不画 */
  dividerPlace?: string[];
  /** M12b-49（都是显式给了才有）：宝石 / 挂件色 col.gem、饰件挂点 ast.ornamentAnchor（面板只认 panelCorners / panelEdges）、出框量 ast.ornamentOverhang、端头形 ast.endcapShape */
  gem?: ColorRef; anchors?: string[]; overhang?: number; endcap?: string }

/** 圆角：一个数，或四个角（左上、右上、右下、左下），每个角可以是椭圆 {x, y} */
export type Radius = number | (number | { x: number; y: number })[];

export interface BoxStyle {
  bg?: Paint;
  border?: Border;
  /** 只画某几条边（与 border 二选一）：上、右、下、左 */
  sides?: { t?: Border; r?: Border; b?: Border; l?: Border };
  /** 四角括角（vis.strokeSides = corners，M12a-06）：臂长 len、线宽 width 的 L 形角，不画整边 */
  cornerMarks?: { len: number; width: number; color: ColorRef };
  radius?: Radius;
  /** 切角：左上与右下各切掉这么多像素（科幻面板） */
  chamfer?: number;
  /** 正圆（小地图、按键） */
  circle?: boolean;
  shadows?: Shadow[];
  /** 外圈实线（CSS box-shadow: 0 0 0 Npx），画在边框外面 */
  ring?: { width: number; color: ColorRef };
  /** 背景模糊（毛玻璃）：在后处理里模糊面板下面的画面 */
  backdropBlur?: number;
  /** 整个盒子绕中心旋转 / 横向倾斜（度） */
  rotate?: number;
  skewX?: number;
  /** 填充发光（科幻血条） */
  glow?: { color: ColorRef; blur: number };
  /* ---- 以下由 UI 参数体系（theme.ts）给出，旧皮肤不用 ---- */
  /** 圆角按短边百分比（vis.cornerSize，单位 %），优先于 radius */
  radiusPct?: number;
  /** 像素台阶转角（vis.corner = step），台阶边长 */
  step?: number;
  shape?: Silhouette;
  edge?: Edge;
  /** 手绘抖动 0~1（vis.jitter）：路径与整体轻微旋转 */
  jitter?: number;
  /** 抖动的种子（同一个盒子每帧一样） */
  seed?: number;
  /** 光泽（vis.gloss）；M12b-41：diagonalSheen 一道 30° 宽斜光带、arc 沿顶部转角的弧形玻璃高光 */
  gloss?: 'topShine' | 'chrome' | 'metalGrad' | 'candy' | 'diagonalSheen' | 'arc';
  overlay?: PatternOverlay;
  ornament?: Ornament;
  /** 材质内芯（ast.core = texture 时的 ast.coreMat） */
  material?: string;
  /* ---- M12b B3：风格图元 I（theme.ts 按参数给，旧皮肤要皮肤之后的层选过；没给 = 原来的画法） ---- */
  /** 分角遮罩（vis.cornerMask，M12b-38）：圆角 / 切角 / 台阶只做这几个角；没给 = 原来的（切角左上 + 右下，圆角 / 台阶四角） */
  cornerMask?: Corner[];
  /** 外形尺寸（vis.cornerSize 显式给了时，% 短边，M12b-38）：箭头尖深、扇贝半径、阶梯高按它；没给 = 各外形自己的默认 */
  shapeSize?: number;
  /** 随机外形的抖动幅度（vis.shapeJitter，0~0.3 × 短边，M12b-39）：randomQuad 每个角往里偏这么多以内 */
  shapeJitter?: number;
  /** 干笔刷外形（vis.brushDryness / brushDir / brushTip，M12b-39）：飞白强度 0~1、笔向、笔锋长度（0~0.4 × 宽） */
  brush?: { dryness: number; dir: 'ltr' | 'rtl'; tip: number };
  /** 边缘处理只作用在这几条边（vis.edgeSides，M12b-39：t / r / b / l）；没给 = 四边 */
  edgeSides?: ('t' | 'r' | 'b' | 'l')[];
  /** 开口分边（vis.strokeSides = endSquares，M12b-37）：上下两条线两端各让出 inset（比例），线端画边长 square 的实心小方块 */
  sideEnds?: { inset: number; square: number };
  /**
   * 分层立体（vis.depth@frame / @core，M12b-36）：外框带（宽 width、底色 color、立体 depth：bevel 凸起 / innerShadow 凹 / pixelBevel / flat）
   * 与内芯的立体（core：innerShadow / bevel / pixelBevel / flat）。Factorio 的「框凸、芯平、槽凹」三层；槽见 tokens.well
   */
  layers?: { frame?: { width: number; depth: string; color: ColorRef; px: number }; core?: { depth: string; px: number } };
  /** 透明度渐隐遮罩（vis.fade / vis.fadeLength，M12b-41）：left / right / both / top / bottom / vertical，len = 渐隐长度占边长的比例 */
  fade?: { dir: string; len: number };
  /** 磨损（ast.wear，0~1，M12b-52）：芯与框上的划痕、边缘缺口、角部压暗 */
  wear?: number;
  /** 套印错位（vis.misregister，M12b-63，K1 G-misregistration）：盒子底下先垫一块错开 (x, y) 的强调色版（木刻 / 孔版印刷的第二色没对准） */
  misregister?: { x: number; y: number; color: ColorRef };
  /** 做旧（ast.aging，M12b-63，K1 G-aging）：泛黄暗角 / 污渍 / 折痕 / 咖啡圈 / 订书钉 / 复印噪点（AGING_KINDS），叠在材质与磨损之后 */
  aging?: string[];
  /** 做旧的逐块序号（B10 审查修复 ⑭，drawBox 自己填：每画一侧从 1 数起、按画的顺序；同尺寸的盒子不再是同一张做旧，帧间稳定）——调用方不用写 */
  agingSeed?: number;
  /** 叠纸（vis.depth = layeredPaper，M12b-63，K1 G-paper-stack）：盒子后面垫几张错开、略转的纸，各带软投影 */
  paperStack?: number;
  /** 毛玻璃的画布部分（M12b-63，K1 G-glass）：tint = 玻璃着色（与面板底色分开）、edge = 亮边方向（top / left / topLeft / all）、grain = 防色带颗粒 0~1 */
  glass?: { tint?: ColorRef; edge?: string; grain?: number };
  /** 表面处理（ast.finish，M12b-52）：foil 箔 / holo 镭射 / polychrome 多彩 / glass 玻璃，叠在填充之上（screen / overlay 合成） */
  finish?: string;
  /** 外框结构（ast.frame × ast.frameMat，M3.5 程序化九宫格） */
  frame?: { kind: string; mat: string; width: number; motif: string };
  /** 叠加特效（ast.fx） */
  fx?: { kinds: string[]; color: ColorRef };
}

export interface TextStyle {
  color?: ColorRef;
  weight?: number;
  size?: number;
  upper?: boolean;
  /** 字距，单位 em */
  spacing?: number;
  font?: string;
  italic?: boolean;
  /**
   * 文字可读辅助 / 标题特效：描边、投影、发光、金属渐变。
   * outline.widthEm（M12a-33）：描边宽按字号算（= max(1, 字号 × widthEm)，字号 < 12 设计单位时不描边、改成一圈软投影）；
   * 参数生成的描边（typ.legibility / typ.titleFx / typ.outlineWidth）都带它，旧皮肤 token 里写死的描边没有 = 照旧按 width 画
   */
  outline?: { color: ColorRef; width: number; widthEm?: number };
  shadow?: { color: ColorRef; x: number; y: number; blur: number };
  glowColor?: ColorRef;
  metal?: boolean;
  /** 勒索信逐字混排（typ.display.family = ransom，M12a-33）：每个字按（字串, 序号）的哈希换字族 / 字重 / 反白方块 / 小角度 / 基线 */
  ransom?: boolean;
  /** 枯笔描边（typ.titleFx = drybrush 而书法标题位图缺失时，M12a-23）：字填好后沿字形再描一圈断续的半透明笔触（飞白），模板页头用 */
  drybrush?: boolean;
  /**
   * 字内填充（M12b-20，typ.fillStyle / typ.fillColors）：gradient = 字高方向两色渐变、halftone = 底色上第二色网点（图块缓存的 CanvasPattern）、metal = 金属渐变（同 metal）；
   * colors = [第一色, 第二色]（没给时字色 + 字色提亮）
   */
  fill?: { kind: 'gradient' | 'halftone' | 'metal'; colors?: string[] };
  /** 逐字倾斜（M12b-20，el.feedback.sfxLetterTilt）：每个字按（字串, 序号）的哈希转 ±tilt 度，字宽不变 */
  tilt?: number;
  /** 套印错位（vis.misregister，M12b-63）：先按 (x, y) 错开画一遍强调色的字，再画本色的字 */
  misregister?: { x: number; y: number; color: ColorRef };
}

export interface SkinTokens {
  /** CSS 字体栈 */
  font: string;
  /** 正文字号（默认 13，行内小字 12）；像素字体设成它的原生像素高度才清晰 */
  textSize?: number;
  /** 面板里的文字颜色 */
  text: ColorRef;
  /** 文字发光（终端） */
  textGlow?: ColorRef;
  panel: BoxStyle;
  /** 对话框在面板样式上的覆盖；tail = 漫画气泡的尾巴 */
  dialog?: Partial<BoxStyle> & { tail?: boolean };
  /** 小地图在面板样式上的覆盖 */
  map?: Partial<BoxStyle>;
  title?: TextStyle;
  name?: TextStyle;
  /** 正文样式（字重、大小写、字距、斜体、可读辅助）；旧皮肤没有，按 400 常规 */
  body?: TextStyle;
  /** 显式给了描边色 / 粗细（typ.outlineColor / typ.outlineWidth，M12a-33）时的描边：飘字、连击、评级这类自带描边的大字改用它；没给时不设（各自原来的描边） */
  outline?: { color: ColorRef; widthEm: number };
  /**
   * 按钮（M12a-35，theme.ts 生成）：font / weight / ransom = 按钮字的字族角色（typ.button.family：display 用标题字、numerals 用数字字体；没给时正文粗体）；
   * size = 显式字号（typ.button.size，px@1080p 已换成设计单位）、fit = 按按钮高 × 0.42；roles = 各动作角色的底色（col.semantic / col.actionColors，没有的角色按原来的按键 / 控件盒子画）
   */
  button?: { font?: string; weight?: number; ransom?: boolean; size?: number; fit?: boolean; roles: Partial<Record<ButtonRole, string>> };
  /**
   * trackStroke：col.trackStroke（M12a-03，auto / none / 颜色；auto 时条高 < 6 的横条自动去描边，M12a-11）；
   * trackColor：col.track 给了时的空槽色（M12a-11：分段、细条、环、竖条等画法的空槽也读它，没给时是正文色 18%）
   */
  bar: { height: number; track: BoxStyle; fill: BoxStyle; trackStroke?: string; trackColor?: string };
  key: BoxStyle & { color?: ColorRef; font?: string; brackets?: boolean };
  icon: ColorRef;
  /** 强调色底上的字色（M12a-04，theme.ts 按强调色亮度派生）：标牌、徽章、主按钮、选中页签……；旧皮肤没显式换强调色时不设（= 白字） */
  onAccent?: ColorRef;
  /**
   * 角色盒子（M12a-03，theme.ts 生成，默认 = panel 的副本）：control 格子与次按钮的面（col.control）、tooltip 浮动详情 / 悬浮提示、
   * titleBar 标题带（模板页头，M12a-23 / M12b-47 接）、card 卡面（tallCard、三选一卡）；controlText = 次按钮与格子角标的字色（col.controlText）
   */
  control?: BoxStyle;
  tooltip?: BoxStyle;
  titleBar?: BoxStyle;
  card?: BoxStyle;
  /** 贴边条 / 底座 / 边框与同锚点共用底条（M12a-16 / 18，部件 hudBar）：面板的副本，底色换成 col.surface2（渐变面板保留渐变） */
  hudBar?: BoxStyle;
  /**
   * 凹槽（M12b-36，§2 的 tokens.well）：装格子 / 列表的内凹槽——底比面板深一档、上左暗下右亮的内阴影（vis.depth@well 换立体）；
   * 画法 core.ts 的 wellBox(e, r)。lay.grouping = wells 的集合底、vis.depth@well 选过时格子的内凹边用它
   */
  well?: BoxStyle;
  controlText?: ColorRef;
  /**
   * 描边参数（vis.stroke / strokeWidth / strokeColor / strokeSides）算出来的那一圈边（M12b-68）：外框结构（ast.frame 九宫格）会把面板的描边删掉，
   * 这里另存一份——不画外框的小部件（格子）与「按目标描边」的地方（scopedEdge：资源下划线、血条外框）用它。没有描边参数时不设
   */
  edge?: Pick<BoxStyle, 'border' | 'sides' | 'cornerMarks'>;
  /** 饰色（col.ornament 选过，M12b-49）：没有饰件的元素上的端头 / 花枝 / 角花焦点也用它；没选时不设（core.ts ornColor 退回饰件色 / 描边色 / 字色） */
  ornColor?: ColorRef;
  /**
   * 展示字体的作用范围（M12b-55，typ.display.scope）：scope = 用展示字体的角色（title / nameplate / menuItem / numerals / button），face = 展示字体本身（字族、字重、勒索信、大小写、字距、斜体）。
   * 没给 typ.display.scope 时不设（标题与人名照旧用展示字体，其余角色用正文）；取用一律经 core.ts 的 displayFor(e, role)
   */
  display?: { scope: string[]; face: Partial<TextStyle> };
  /**
   * 数字字形（M12b-07，§2 的 drawNumber）：显式给了 typ.numerals.* / typ.numberFormat 时才有（旧皮肤只认皮肤之后的层）——
   * family = 字族（tabular 等宽格 / display 标题字 / pixel 像素字 / odometer 里程表 / oldstyle 旧式 / sevenSeg / dotMatrix / singleStroke 矢量），font / weight / italic = 字面，
   * thick = 矢量笔画的粗细倍数（跟 typ.numerals.weight），digits = 固定位数（补前导零）、cells = 每位一个内凹格（tokens.well）、
   * format = 数字格式（grouped / plain / western / cn10k）。没有时 core.ts 的 drawNumber 就是原来的 T()
   */
  numerals?: NumeralFace;
  /**
   * 事件字效（M12b-20，typ.fillStyle / typ.fillColors / typ.shadowOffset，显式给了才有）：飘字、连击、评级、拟声字、无底大字、收尾大卡口号这类自带描边的大字用它
   * （与 t.outline 同一组）；fill = 字内填充、shadow = 硬投影偏移（设计单位，0 = 不加）
   */
  textFx?: { fill?: TextStyle['fill']; shadow?: number };
}

/** 数字字形（M12b-07）：见 SkinTokens.numerals */
export interface NumeralFace { family?: string; font?: string; weight?: number; italic?: boolean; thick?: number; digits?: number; cells?: boolean; format?: string }

/**
 * 按钮的动作角色（M12a-35）：primary / confirm（确认、出牌、开始）、secondary（次要）、back（取消 / 返回）、danger（危险、弃牌）、utility（排序、工具）、sell（出售）。
 * 决定主次（secondary / back 是次按钮）和角色色（col.semantic 的配色方案、col.actionColors 逐个指定）
 */
export type ButtonRole = 'primary' | 'secondary' | 'confirm' | 'back' | 'danger' | 'utility' | 'sell';

export interface SkinDef {
  id: string;
  /** 对应调研 docs/survey/06-genre-camera-ui.md 的 B 节编号 */
  survey?: string;
  label: string;
  desc: string;
  prompt: string;
  tokens: SkinTokens;
}

/** 色板变量：'@accent' 等在这里解析；heading / icon / muted / quest 是 theme.ts 派生的颜色角色（M12a-03，'@heading' 等处处可引用） */
export type SkinPalette = Record<'accent' | 'accent2' | 'paper' | 'ink' | 'good' | 'sky', string> & Partial<Record<'heading' | 'icon' | 'muted' | 'quest', string>>;

/** 做旧的种类（ast.aging，M12b-63）：theme.ts 筛取值、paint.ts 的 drawAging 画 */
export const AGING_KINDS = ['yellowed', 'stains', 'creases', 'coffeeRing', 'staples', 'photocopy'];
