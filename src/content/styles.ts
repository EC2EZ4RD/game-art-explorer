import { activeState, getParam } from '../dims/registry';
import type { Values } from '../dims/types';
import { RECIPE_MAP } from './recipes';

/*
 * 风格图谱：调研得到的风格条目（docs/survey/01-style-taxonomy.md → styles.data.ts）。
 * 能力状态不写死：由"近似参数是否都已实现"与"还缺的能力"自动计算，
 * 新模块实现后，依赖它的风格会自动升级。
 */

export type SurveyRealtime = 'live' | 'partial' | 'needsAsset' | '2d';

export interface StyleEntry {
  id: string;
  /** 调研表里的编号，如 9.1 */
  code: string;
  name: string;
  nameEn?: string;
  group: string;
  definition: string;
  mechanisms: string;
  differs: string;
  representatives: { name: string; platform?: string }[];
  /** 调研时对实时 3D 可实现度的判断 */
  surveyRealtime: SurveyRealtime;
  surveyGaps?: string;
  /** 用现有参数近似这一风格：参数 id → 值（只用注册表里存在的 id 与选项） */
  approx: Values;
  /** 近似时仍缺的能力（进入待办）；实现后从这里删掉即可升级 */
  needs: string[];
  /** 对应的现成配方 */
  recipe?: string;
  moods?: string[];
  cultures?: string[];
  genres?: string[];
}

export interface MoodEntry {
  id: string;
  name: string;
  nameEn?: string;
  factors: string[];
  /** 可选：把这个情绪推向画面的一组参数（多种做法之一，不是唯一答案） */
  approx?: Values;
  /** 机制不同的几种走法（配方 id） */
  recipes?: string[];
}

export interface CultureEntry {
  id: string;
  name: string;
  markers: string;
  pitfalls: string;
}

export type CapState = 'live' | 'partial' | 'needsAsset' | 'reference' | 'todo';

export const CAP_LABEL: Record<CapState, string> = {
  live: '可实时实验',
  partial: '局部实验',
  needsAsset: '需要专用素材',
  reference: '参考研究',
  todo: '待补充',
};

/** 校验近似参数：返回无效的 id / 值 */
export function invalidApprox(s: StyleEntry): string[] {
  const bad: string[] = [];
  for (const [id, v] of Object.entries(s.approx)) {
    const p = getParam(id);
    if (!p) { bad.push(`未知参数 ${id}`); continue; }
    if (p.kind === 'choice' && !p.options?.some((o) => o.value === v)) bad.push(`${id} 没有选项 ${String(v)}`);
  }
  return bad;
}

/*
 * 缺口解析：引擎补上一项能力后，在这里登记"什么样的缺口描述由哪组参数解决"。
 * 一条缺口按"与 / 和 / 、"拆成几部分，全部有对应能力才算补上；
 * 补上的部分会自动并入这一风格的近似参数（载入时一起打开），没补上的继续留在待办。
 */
export interface NeedResolver {
  /** 严格匹配：风格缺口拆分后的单项 */
  match: RegExp;
  /** 宽松匹配：案例拆解里自由书写的缺口 */
  hint: RegExp;
  values: Values;
  label: string;
}

export const NEED_RESOLVERS: NeedResolver[] = [
  { match: /^(环境光遮蔽|体素 ?AO|AO)$/i, hint: /环境光遮蔽|(^|[^A-Za-z])AO([^A-Za-z]|$)/, values: { 'lighting.ao': 0.7 }, label: '缝隙暗部（屏幕空间 AO）' },
  { match: /^体积光(束)?$/, hint: /体积光|光束|光锥|上帝光|丁达尔/, values: { 'lighting.godrays': 0.7 }, label: '体积光束（屏幕空间近似）' },
  { match: /^(真实)?浅?景深$|^散景$/, hint: /景深|散景|光斑/, values: { 'camera.dof': 0.6 }, label: '景深（散景近似）' },
  { match: /^(电影 ?)?LUT ?调色$|^电影调色$/i, hint: /LUT|电影调色|调色预设/i, values: { 'color.grade': 'tealOrange' }, label: '调色预设' },
  { match: /^鱼眼(畸变)?$/, hint: /鱼眼|桶形.{0,4}畸变/, values: { 'camera.lens': 0.6 }, label: '鱼眼畸变' },
  { match: /^手持(抖动|晃动)$/, hint: /手持(抖动|晃动)/, values: { 'camera.shake': 0.4 }, label: '手持晃动' },
  { match: /^世界稳定抖色$/, hint: /世界稳定抖色|点阵游动/, values: { 'color.ditherAnchor': 'world' }, label: '世界稳定抖色' },
  { match: /^(球面地形|小星球|弯曲世界)$/, hint: /小星球|球面地形|弯曲世界|滚筒世界/, values: { 'world.curve': 'sphere' }, label: '世界弯曲（视觉近似）' },
  { match: /^((最近邻)?点采样(的)?低清贴图|像素风低清贴图|16px 点采样方块贴图)$/, hint: /点采样|低清贴图|无过滤贴图/, values: { 'material.texture': 'nearest' }, label: '低清点采样贴图' },
  { match: /^三点双线性过滤的模糊低清贴图$|^三点过滤$/, hint: /三点(双线性)?过滤/, values: { 'material.texture': 'threePoint' }, label: 'N64 三点过滤贴图' },
  { match: /^仿射贴图扭曲$/, hint: /仿射/, values: { 'material.texture': 'nearest', 'camera.affine': true }, label: '仿射贴图扭曲' },
  { match: /^宽银幕(画幅|黑边)?$/, hint: /宽银幕|黑边|letterbox/i, values: { 'camera.letterbox': '2.39' }, label: '宽银幕黑边' },
  { match: /^(局部彩色|单一强调色)$/, hint: /单独指定的强调色|只给一个物体上色|单一强调色|局部彩色|单一物体强调/, values: { 'color.isolate': 'accent' }, label: '只留局部彩色' },
  { match: /^(摄像机)?(自动曝光|人眼适应|曝光适应)$/, hint: /自动曝光|人眼适应|曝光适应/, values: { 'color.autoExposure': 0.8 }, label: '自动曝光（人眼适应）' },
  { match: /^(VHS|录像带)(质感|效果|噪声|画面)?$/i, hint: /^(?!.*(剪辑|跳切|剪接|转场)).*(VHS|录像带|旧录像|跟踪噪声|磁带)/i, values: { 'surface.screen': 'vhs', 'surface.vhsWear': 0.45, 'surface.vhsTracking': 0.25 }, label: 'VHS 录像带' },
  { match: /^(时间码|时间码叠层|时间戳|日期水印|录像 ?UI ?叠层|录像(机)?字幕)$/i, hint: /时间码|时间戳|日期水印|REC ?标记|录像 ?UI|录像机字幕|屏显字幕|(^|[^A-Za-z])OSD([^A-Za-z]|$)/i, values: { 'surface.osd': 'camcorder' }, label: '屏显时间码（摄像机日期）' },
  { match: /^(数码)?压缩(噪点|伪影|失真|块)$/, hint: /压缩(噪点|伪影|失真|痕迹)|马赛克块|宏块|低码率|块状噪点|JPEG|视频压缩/i, values: { 'surface.compression': 0.45 }, label: '数码压缩噪点' },
  // 方向性笔触：只在油画/水粉/水彩媒介下生效（风格近似里本来就带媒介）；只写算法不写刷痕强度，刷痕沿用配方里按媒介调好的值。
  // 宽松匹配排除特效、UI、贴图层面与二维背景这类屏幕后处理做不到的笔触
  {
    match: /^(方向性笔触|屏幕空间方向笔触|沿形体方向的笔触|(手绘)?笔触方向)$/,
    hint: /^(?!.*(特效|UI|毛绒|排线|皴|不可见|墨线|颗粒|泼溅|贴图|二维|2D|背景|真实|裂纹)).*((方向|形体).{0,4}笔触|笔触方向|笔刷方向|Kuwahara|油画笔触|厚涂.{0,3}笔触|绘画笔触)/i,
    values: { 'surface.kuwahara': 'anisotropic' },
    label: '方向性笔触（各向异性 Kuwahara）',
  },
  { match: /^(随距离(增强的)?笔触化|远景笔触化)$/, hint: /随距离.{0,4}笔触|远景.{0,6}笔触化|远处.{0,4}笔触/, values: { 'surface.strokeDepth': 0.6 }, label: '远景笔触化（笔触随距离变粗）' },
  /* ---- 2026-10-13 AI 生成素材（src/content/assets.json）补上的缺口 ---- */
  { match: /^纸纹(贴图|素材)$/, hint: /纸纹|宣纸|纸张纹理/, values: { 'surface.paperTex': 'xuan', 'surface.paper': 0.5 }, label: '宣纸纸纹（AI 生成素材）' },
  { match: /^纸底素材$/, hint: /纸底|水彩纸|热压纸|冷压纸/, values: { 'surface.paperTex': 'hotPress', 'surface.paper': 0.5 }, label: '热压纸纸底（AI 生成素材）' },
  { match: /^绢本(质感)?(素材)?$/, hint: /绢本|绢底|绢纹/, values: { 'surface.paperTex': 'silk', 'surface.paper': 0.4, 'surface.paperColor': 0.4 }, label: '绢本（AI 生成素材）' },
  { match: /^皴法(纹理)?$/, hint: /皴/, values: { 'material.cun': 'pima', 'material.cunAmount': 0.7 }, label: '皴法纹理（披麻 / 斧劈 / 米点）' },
  { match: /^笔势$/, hint: /笔势|毛笔笔触|笔刷素材/, values: { 'surface.strokes': 'long', 'surface.strokeColor': 'ink' }, label: '物体空间毛笔笔触（墨色）' },
  { match: /^大笔触泼墨笔刷素材$/, hint: /泼墨笔刷|大笔触/, values: { 'surface.strokes': 'long', 'surface.strokeColor': 'ink', 'surface.strokeSize': 0.8 }, label: '物体空间大笔触（墨色）' },
  { match: /^手绘笔触方向$/, hint: /^(?!.*(特效|UI|屏幕)).*贴在物体上的笔触|物体空间笔触/, values: { 'surface.strokes': 'long' }, label: '物体空间笔触（取画面颜色）' },
  { match: /^2D ?手绘特效序列帧$/, hint: /序列帧特效|手绘(2D)?特效|2D ?特效|特效序列帧/, values: { 'motion.fx2d': 'smoke' }, label: '2D 手绘序列帧特效' },
  { match: /^(像素精灵角色|公告板像素精灵角色|公告板精灵角色)$/, hint: /像素精灵|公告板精灵|精灵角色/, values: { 'shape.carrier': 'pixelA' }, label: '公告板像素精灵角色' },
  { match: /^指纹凹凸法线素材$/, hint: /指纹/, values: { 'material.detail': 'clay', 'material.bump': 0.45 }, label: '黏土指纹法线（AI 生成素材）' },
  { match: /^(V 形)?针目的织物法线贴图$/, hint: /针目|针织|毛线/, values: { 'material.detail': 'knit', 'material.bump': 0.6 }, label: '针织法线（AI 生成素材）' },
  { match: /^(剥落龟裂贴图|磨损材质贴图)$/, hint: /剥落|磨损|做旧|斑驳/, values: { 'material.weathering': 0.5 }, label: '剥落做旧（AI 生成素材）' },
  { match: /^镂空阴阳刻图样$/, hint: /剪纸|镂空|窗花/, values: { 'material.papercut': 'architecture', 'material.windowFlower': true }, label: '剪纸镂空与窗花（AI 生成素材）' },
  {
    match: /^(墨线排影贴图|手绘线稿纹理|手绘铅笔贴图)$/, hint: /TAM|排线贴图|排影贴图|铅笔贴图|线稿纹理/,
    values: { 'shading.model': 'hatching', 'shading.hatchTex': 'tam', 'shading.hatchAnchor': 'world' }, label: '贴在模型上的色调排线图（TAM）',
  },
  { match: /^(粗剪边的分片角色|关节动画|关节铆点的分片角色动画|分片角色)$/, hint: /纸片人|分片角色|切片动画|关节动画/, values: { 'shape.carrier': 'puppet' }, label: '分件关节纸片人（AI 生成素材）' },
  /* ---- 2026-10-14 游戏 UI 参数体系（M3b：38 皮肤 + 18 关键词 + 外观参数）补上的缺口；头像对话框、分支选项、世界里的霓虹招牌留给 M5a / M6 / M9a ---- */
  { match: /^(剪报字与)?倾斜拼贴 ?UI$|^剪报字$/, hint: /拼贴字体|剪报|倾斜锯齿对话框|动态排版.{0,6}(斜切|错位)/, values: { 'hud.style': 'persona' }, label: 'Persona 拼贴 UI 皮肤' },
  { match: /^剪纸拼贴 ?HUD$/, hint: /剪纸拼贴 ?(HUD|UI)/i, values: { 'hud.style': 'persona', 'vis.edge': 'torn' }, label: '拼贴皮肤 + 撕纸边' },
  { match: /^传统纹样(素材)?$/, hint: /回纹|传统纹样.{0,4}UI|云纹.{0,4}UI/, values: { 'uip.keyword': 'kw.guochao' }, label: 'UI 关键词：国潮（云纹 / 回纹母题）' },
  { match: /^现代字体排版$/, hint: /现代字体排版/, values: { 'typ.display.family': 'sans' }, label: 'UI 标题用现代无衬线' },
  { match: /^哥特(浮雕)?装饰(的大型)? ?UI ?面板$/, hint: /哥特.{0,10}(UI|面板)/, values: { 'hud.style': 'ornate', 'uip.keyword': 'kw.gothic' }, label: '雕花框皮肤 + 哥特关键词' },
  { match: /^装饰艺术(风格)?的?.{0,4}UI$/, hint: /装饰艺术风格.{0,6}UI|Art ?Deco/i, values: { 'hud.style': 'deco' }, label: '装饰艺术 UI 皮肤' },
  { match: /^(金色)?新艺术(风格)?装饰 ?UI$/, hint: /新艺术风格.{0,6}UI|Art ?Nouveau/i, values: { 'uip.keyword': 'kw.luxury', 'typ.display.family': 'artNouveau' }, label: '奢华关键词 + 新艺术标题字' },
  { match: /^笔记本拼贴式菜单$/, hint: /笔记本.{0,4}(菜单|UI)/, values: { 'hud.style': 'handdrawn' }, label: '手绘笔记本 UI 皮肤' },
  { match: /^刷子笔触风格的?.{0,4}UI$/, hint: /(刷子|笔刷|毛笔)笔触.{0,8}(UI|界面)/, values: { 'vis.edge': 'brush' }, label: 'UI 面板毛笔边' },
  { match: /^密集的复古 ?RPG ?面板$/, hint: /复古 ?RPG ?面板/, values: { 'hud.style': 'jrpg', 'cnt.density': 4 }, label: 'JRPG 窗口皮肤 + 高信息密度' },
  { match: /^圆角卡片式 ?UI$/, hint: /圆角卡片式 ?UI/, values: { 'hud.style': 'cozy' }, label: '圆润友好 UI 皮肤' },
  /*
   * ---- 2026-10-23 技术补全（docs/tech/track-*.md，第二批 Z1 接入）----
   * match 是 gap-census 里的原文拆开（按「与 / 和 / 、 / 及 / +」、去括号）后的各段；值取各轨道日志「解决的缺口」一节。
   * 写了 game.scene 的条目：缺口由一个新场景补上（伪 3D 公路、错觉塔、卷轴长街……）。载入近似参数时场景键不跟着画面走（场景层另换），
   * 风格研究库的图会拍那个场景（src/dev/gallery.ts 的 atlasValues），学习库详情里给一个「换到场景」按钮。
   * 只部分做到、没写 resolver 的：8 方向公告板敌人精灵（只有正面）、发光法宝特效（只有护体光环）、毛发渲染（只有绒毛边缘）、
   * 舞台式布光（迪士尼式的电影布光不是舞台聚光灯）、图案化的波浪与云纹、传统年画纹样与人物素材、尺规般精确的建筑线描资产。
   */
  /* P1 线条 */
  { match: /^手绘线条的微妙粗细变化$/, hint: /线条.{0,4}粗细变化|手绘压力|线的提按/, values: { 'lines.edges': 'all', 'lines.weightStyle': 'pressure', 'lines.weightVar': 0.55 }, label: '手绘压力的线（内部线提按）' },
  { match: /^粗细变化的墨线$|^有提按变化的毛笔线条$/, hint: /毛笔线条|墨线.{0,4}粗细|提按变化/, values: { 'lines.edges': 'depthNormal', 'lines.weightStyle': 'brush', 'lines.weightVar': 0.85 }, label: '毛笔提按的墨线' },
  { match: /^(有主次|提按的手绘勾线|铁线描手绘勾线)$/, hint: /铁线描|游丝描|有主次.{0,4}勾线/, values: { 'lines.edges': 'all', 'lines.weightStyle': 'tiexian' }, label: '铁线描（细匀、有主次的勾线）' },
  { match: /^金属光泽的泥金描线$/, hint: /泥金|描金线|金线勾/, values: { 'lines.edgeColorMode': 'gold', 'lines.weightStyle': 'tiexian' }, label: '泥金勾线' },
  { match: /^刻纹沿形体方向$/, hint: /刻纹.{0,4}(形体|方向)/, values: { 'surface.medium': 'woodcut', 'surface.cutFlow': 'form' }, label: '木刻刻纹沿形体' },
  { match: /^线宽随明暗变化的精细雕刻线$/, hint: /雕刻线|铜版|蚀刻|钞票/, values: { 'surface.medium': 'engraving', 'surface.strength': 1 }, label: '铜版雕刻线（线宽随明暗）' },
  { match: /^彩色 ?TAM ?排线贴图$/, hint: /彩铅|彩色.{0,2}排线/, values: { 'surface.medium': 'sketch', 'shading.hatchTex': 'tam', 'surface.hatchColor': 'pencil' }, label: '彩铅排线（屏幕空间）' },
  { match: /^多色叠加的排线$/, hint: /多色.{0,4}排线/, values: { 'surface.medium': 'sketch', 'surface.hatchColor': 'multi' }, label: '多色叠加的排线' },
  { match: /^泼墨晕染$/, hint: /泼墨|破墨/, values: { 'surface.medium': 'ink', 'surface.pomo': 0.5 }, label: '泼墨' },
  { match: /^飞白的随机性$|^飞白$/, hint: /飞白/, values: { 'surface.medium': 'ink', 'surface.feibai': 0.5 }, label: '飞白' },
  { match: /^罩染的多层叠色(贴图)?$/, hint: /罩染|多层叠色/, values: { 'surface.medium': 'gongbi', 'surface.glaze': 0.7 }, label: '罩染（按明暗程序分层叠色）' },
  { match: /^分染$/, hint: /分染/, values: { 'surface.medium': 'gongbi', 'surface.edgeDarken': 0.8 }, label: '分染（轮廓旁加深，近似）' },
  { match: /^(真实)?湿画法晕染$/, hint: /湿画法|晕染.{0,4}(水渍|菜花)|水彩.{0,4}晕/, values: { 'surface.medium': 'watercolor', 'surface.wetness': 0.5 }, label: '湿画法晕染与水渍（程序近似）' },
  { match: /^只作用于环境的分层滤镜$/, hint: /(角色|人物).{0,6}(保持|不进).{0,6}(赛璐珞|滤镜)|只.{0,2}(环境|背景).{0,4}(滤镜|媒介)/, values: { 'surface.mediumScope': 'environment' }, label: '媒介只画环境（角色保持原样）' },
  { match: /^涂出线外的错位填色$/, hint: /错位填色|涂出线外/, values: { 'surface.misregister': 0.5, 'lines.edges': 'all', 'lines.outline': false }, label: '错位填色（颜色涂出线外）' },
  /* P1b 版画与漫画 */
  { match: /^(短笔点|补色并置的点彩笔触)$/, hint: /点彩|补色并置/, values: { 'surface.medium': 'pointillism', 'surface.dotComplement': 0.5 }, label: '点彩（补色小圆点）' },
  { match: /^(木版套色的错位|纸纹)$/, hint: /浮世绘|木版套色|套色错位|一文字晕染/, values: { 'surface.medium': 'ukiyoe', 'surface.printOffset': 0.5, 'surface.woodGrain': 0.5, 'surface.bokashi': 0.75 }, label: '浮世绘木版（套版错位、木纹、和纸）' },
  { match: /^(套印错位|木版肌理)$/, hint: /年画|套印/, values: { 'surface.medium': 'nianhua', 'surface.printOffset': 0.6, 'surface.woodGrain': 0.6 }, label: '木版年画（套印错位、木版斑驳）' },
  { match: /^色粉粉质笔触纹理$/, hint: /色粉|粉彩笔/, values: { 'surface.medium': 'pastel', 'surface.paperTooth': 0.6, 'surface.smudge': 0.5 }, label: '色粉笔触' },
  { match: /^蜡质颗粒纹理$/, hint: /蜡笔|蜡质/, values: { 'surface.medium': 'crayon', 'surface.paperTooth': 0.7 }, label: '蜡笔颗粒' },
  { match: /^马克笔溢色笔触$/, hint: /马克笔/, values: { 'surface.medium': 'marker', 'surface.markerAngle': 70 }, label: '马克笔笔道' },
  { match: /^(速度线|集中线|效果线)$/, hint: /速度线|集中线|效果线/, values: { 'surface.mangaFx': 'speed' }, label: '漫画速度线' },
  { match: /^拟声字(等漫画符号)?$/, hint: /^(?!.*2D).*(拟声字|象声词|音效字)/, values: { 'surface.sfxText': 'boom' }, label: '拟声字（轰！）' },
  { match: /^2D ?拟声字$/, hint: /2D ?拟声字/, values: { 'surface.sfxText': 'pow' }, label: '美漫拟声字（POW!）' },
  { match: /^手绘冲击线$/, hint: /冲击线|冲击爆炸/, values: { 'surface.mangaFx': 'impact' }, label: '冲击爆炸与集中线' },
  { match: /^分格构图$/, hint: /^(?!.*正交网格).*(分格|分镜格)/, values: { 'surface.panels': 'three' }, label: '漫画分格（三格含特写）' },
  { match: /^金云遮罩$/, hint: /金云|すやり霞/, values: { 'surface.goldCloud': 0.5 }, label: '金云（按深度前后穿插）' },
  { match: /^金箔底纹素材$/, hint: /金箔|金地/, values: { 'surface.goldLeaf': 1 }, label: '金箔天空（程序生成）' },
  { match: /^(金箔首字母|页边装饰素材)$/, hint: /手抄本|首字母|页边装饰/, values: { 'surface.medium': 'manuscript', 'surface.pageFrame': true }, label: '彩绘手抄本（页框、藤蔓、描金首字母）' },
  { match: /^(黑剪影|刻线细节的角色绘制|装饰带纹样素材)$/, hint: /黑绘|黑剪影.{0,4}刻线|回纹|装饰带/, values: { 'surface.medium': 'blackFigure', 'surface.pageFrame': true }, label: '黑绘陶（黑剪影刻线、瓶身纹带）' },
  /* P2 镜头与复古显示 */
  { match: /^(8×8 ?图块|每精灵 ?3 ?色的硬件限制)$/, hint: /NES|红白机|每精灵.{0,4}3 ?色/, values: { 'color.hardware': 'nes' }, label: 'NES 硬件限色（每格 3 色 + 精灵调色板）' },
  { match: /^每 ?8×8 ?格只允许 ?2 ?色的属性冲突后处理$/, hint: /属性冲突|ZX ?Spectrum/i, values: { 'color.hardware': 'zx' }, label: 'ZX 属性冲突（每格墨纸两色）' },
  { match: /^红黑立体双目显示$/, hint: /Virtual ?Boy|红黑.{0,4}立体/i, values: { 'surface.stereo': 'virtualBoy' }, label: '红黑双目立体（Virtual Boy）' },
  { match: /^湿地面屏幕空间反射$/, hint: /湿地面|积水.{0,4}倒影|屏幕空间反射/, values: { 'lighting.wetReflect': 0.8 }, label: '湿地面反射（屏幕空间）' },
  { match: /^体积烟尘$/, hint: /体积(烟|尘|雾)/, values: { 'atmosphere.volumetric': 0.6, 'atmosphere.volNoise': 0.8 }, label: '体积雾（烟尘）' },
  { match: /^(林间体积光|暖色点光源的体积光)$/, hint: /林间.{0,4}光柱|点光源.{0,6}体积/, values: { 'atmosphere.volumetric': 0.5 }, label: '体积雾里的光柱与灯晕' },
  { match: /^体积云海$/, hint: /云海/, values: { 'atmosphere.volumetric': 0.7, 'atmosphere.volHeight': 0.15, 'atmosphere.volNoise': 0.8 }, label: '体积云海（薄雾层，近似）' },
  { match: /^(线框网格地形|条纹落日)$/, hint: /合成波|条纹落日|线框网格/, values: { 'geometry.representation': 'wireframe', 'world.mesh': 'grid', 'geometry.wireColor': 'emissive', 'atmosphere.synthSun': true }, label: '线框网格地形 + 合成波落日' },
  { match: /^全屏光线步进渲染 ?SDF\/分形$/, hint: /分形|光线步进|SDF/i, values: { 'surface.fractal': 'mandelbulb' }, label: '分形天空（光线步进）' },
  /* M 材质与灯光 */
  { match: /^(实时)?全局光照$/, hint: /全局光照|(^|[^A-Za-z])GI([^A-Za-z]|$)|天光/, values: { 'lighting.envLight': 0.8 }, label: '天空环境光（全局光照近似）' },
  { match: /^镀铬环境反射贴图$/, hint: /镀铬|铬/, values: { 'material.envReflect': 'chrome' }, label: '镀铬反射' },
  { match: /^球面反射贴图式高光$/, hint: /球面反射|matcap/i, values: { 'material.envReflect': 'matcap' }, label: '球面反射贴图' },
  { match: /^(釉面)?清漆层材质$/, hint: /清漆|clearcoat|釉面/i, values: { 'material.clearcoat': 0.8, 'material.clearcoatRough': 0.06 }, label: '清漆层' },
  { match: /^(珐琅光泽材质|金属丝分格的纹样贴图)$/, hint: /珐琅|掐丝|景泰蓝/, values: { 'material.preset': 'cloisonne' }, label: '掐丝珐琅（程序纹样）' },
  { match: /^青花纹样贴图$/, hint: /青花/, values: { 'material.preset': 'porcelain' }, label: '青花瓷（程序纹样）' },
  { match: /^皮肤次表面散射$/, hint: /皮肤.{0,4}(次表面|透光)/, values: { 'material.sss': 0.8, 'material.sssScope': 'characters' }, label: '角色次表面散射' },
  { match: /^次表面散射$/, hint: /次表面|SSS/, values: { 'material.sss': 0.8 }, label: '次表面散射' },
  { match: /^透光材质$/, hint: /透光|透射/, values: { 'material.sss': 1 }, label: '背光透光（次表面散射）' },
  { match: /^半透明背光透射材质$/, hint: /背光透射|皮影/, values: { 'material.sss': 1, 'game.scene': 'shadow-puppet' }, label: '背光透射（次表面散射 / 场景「皮影·戏台」）' },
  { match: /^半透明塑料材质$/, hint: /半透明塑料/, values: { 'material.preset': 'plastic', 'material.sss': 0.8, 'material.sssScope': 'all', 'material.sssColor': '#FFFFFF' }, label: '半透明塑料' },
  { match: /^舞台聚光灯$/, hint: /聚光灯|追光|摇头灯/, values: { 'lighting.stage': 'single' }, label: '舞台追光' },
  { match: /^单点光源的戏剧布光$/, hint: /单点光源|戏剧布光/, values: { 'lighting.stage': 'single', 'lighting.stageDark': 0.9 }, label: '单束追光、四周压暗' },
  { match: /^只画边的线框几何$/, hint: /线框/, values: { 'geometry.representation': 'wireframe', 'geometry.wireFill': 'dark' }, label: '消隐线框（只画边）' },
  { match: /^网眼式透明$/, hint: /网眼|screen-?door/i, values: { 'material.screenDoor': 'all' }, label: '网眼透明' },
  { match: /^光照贴图式静态光照$/, hint: /光照贴图|顶点光照|高洛德/, values: { 'shading.model': 'vertex' }, label: '逐顶点光照（烘焙式暗角）' },
  { match: /^带法线贴图的像素精灵$/, hint: /法线.{0,4}像素精灵|像素精灵.{0,4}法线/, values: { 'shape.carrier': 'pixelA', 'shape.spriteNormal': 1 }, label: '带法线的像素精灵（自动法线）' },
  { match: /^2D ?动态光照$/, hint: /2D ?动态光/, values: { 'shape.carrier': 'pixelA', 'shape.spriteNormal': 1, 'lighting.lanterns': 1.6 }, label: '2D 动态光照（精灵法线 + 灯火）' },
  /* K 伪 3D 与粒子 */
  { match: /^(缩放精灵|条纹道路)$/, hint: /伪 ?3D|缩放精灵|条纹道路/i, values: { 'game.scene': 'road-pseudo3d' }, label: '伪 3D 公路（场景）' },
  { match: /^Mode ?7 地面缩放旋转$/i, hint: /Mode ?7/i, values: { 'game.scene': 'mode7-track', 'camera.pixelSize': 3 }, label: 'Mode 7 赛场（场景）' },
  { match: /^扇区式 ?2\.5D ?几何$/, hint: /扇区|2\.5D.{0,4}迷宫|Doom/i, values: { 'game.scene': 'fp-maze' }, label: '第一人称格子迷宫（场景）' },
  { match: /^道具$/, hint: /公告板.{0,6}道具/, values: { 'game.scene': 'fp-maze' }, label: '公告板道具（场景「第一人称·迷宫」）' },
  { match: /^大量粒子特效$/, hint: /粒子特效|大量粒子/, values: { 'motion.particles': 'sparks', 'motion.particleDensity': 0.85 }, label: '火花粒子' },
  { match: /^发光技能特效$/, hint: /技能特效|魔法光/, values: { 'motion.particles': 'magic', 'motion.particleDensity': 0.7 }, label: '魔法光环粒子' },
  { match: /^随音乐节拍驱动的动画$/, hint: /节拍|BPM/i, values: { 'motion.beat': 120, 'motion.beatPulse': 0.7 }, label: '随节拍闪（固定 BPM）' },
  /* G 等距与 2.5D */
  { match: /^视点相关的错觉连接$/, hint: /错觉|纪念碑谷|不可能几何/, values: { 'game.scene': 'iso-illusion', 'lighting.shadows': 'none' }, label: '错觉塔（场景）' },
  { match: /^屋顶剖切的建筑$/, hint: /剖切|吹抜|吹拔|剖面屋/, values: { 'game.scene': 'iso-cutaway' }, label: '去掉屋顶的剖面屋（场景）' },
  { match: /^2:1 ?等距像素图块素材$/, hint: /等距像素/, values: { 'game.scene': 'iso-city' }, label: '2:1 等距像素小城（场景，程序生成）' },
  /* H 纸艺与剧场 */
  { match: /^分层纸片几何$|^薄片角色几何$|^翻面动画$/, hint: /纸片.{0,4}(几何|分层|翻面)|翻面动画/, values: { 'game.scene': 'paper-theater' }, label: '分层纸片与双面纸片人（场景「纸片·剧场」）' },
  { match: /^平面布景片$/, hint: /布景片|剪影卡片/, values: { 'game.scene': 'paper-theater' }, label: '纸片布景（场景「纸片·剧场」）' },
  { match: /^(斜二测相机|平远构图的大尺度远景|多视点平面构图|平面多视点构图)$/, hint: /斜二测|斜投影|平远|多视点/, values: { 'game.scene': 'scroll-street' }, label: '斜投影长卷（场景「卷轴·长街」）' },
  { match: /^逆光剪影的纯黑前景材质$/, hint: /逆光剪影|纯黑前景/, values: { 'game.scene': 'silhouette-forest' }, label: '逆光剪影（场景「剪影·逆光」）' },
  { match: /^霓虹招牌文字$/, hint: /霓虹招牌/, values: { 'game.scene': 'beatemup-street' }, label: '霓虹招牌（场景「清版·街巷」）' },
  { match: /^固定机位$/, hint: /固定机位/, values: { 'game.scene': 'stage-theater' }, label: '固定机位（场景「舞台·剧场」）' },
  { match: /^多层视差(背景)?$/, hint: /多层视差|视差滚动/, values: { 'game.scene': 'sideStage', 'camera.projection': 'ortho' }, label: '横版分层视差（场景「横版·森林」）' },
  { match: /^(横向平面锁定的玩法相机|关卡)$/, hint: /横向.{0,4}锁定|横版.{0,4}(相机|关卡)/, values: { 'game.scene': 'sideStage' }, label: '横版锁定镜头与关卡（场景「横版·森林」）' },
];

const needParts = (n: string) => n.replace(/（[^）]*）|\([^)]*\)/g, '').split(/与|和|、|及|\+/).map((x) => x.trim()).filter(Boolean);

/** 这条缺口现在是否已有能力解决；返回可并入的参数 */
export function resolveNeed(n: string): { resolved: boolean; values: Values; labels: string[] } {
  const values: Values = {};
  const labels: string[] = [];
  let all = true;
  for (const part of needParts(n)) {
    const r = NEED_RESOLVERS.find((x) => x.match.test(part) && Object.keys(x.values).every((id) => getParam(id) && getParam(id)!.status !== 'todo'));
    if (!r) { all = false; continue; }
    Object.assign(values, r.values);
    labels.push(r.label);
  }
  return { resolved: all && labels.length > 0, values, labels };
}

/** 案例拆解的自由文本缺口：哪些现在能近似 */
export function hintsFromGaps(gaps: string[]): { values: Values; labels: string[]; matched: string[]; partial: string[] } {
  const values: Values = {};
  const labels: string[] = [];
  const matched: string[] = [];
  const partial: string[] = [];
  const usable = (r: NeedResolver) => Object.keys(r.values).every((id) => getParam(id) && getParam(id)!.status !== 'todo');
  for (const g of gaps) {
    // 和风格缺口一样按"与 / 和 / 、"拆开：每一部分都有对应能力才算可近似，只有一部分有就是"部分可近似"
    const parts = needParts(g);
    const hits = parts.map((part) => NEED_RESOLVERS.filter((r) => r.hint.test(part) && usable(r)));
    const n = hits.filter((h) => h.length).length;
    if (!n) continue;
    (n === parts.length ? matched : partial).push(g);
    for (const r of hits.flat()) {
      Object.assign(values, r.values);
      if (!labels.includes(r.label)) labels.push(r.label);
    }
  }
  return { values, labels, matched, partial };
}

/** 还没解决的缺口 */
export const remainingNeeds = (s: StyleEntry) => s.needs.filter((n) => !resolveNeed(n).resolved);

/** 实际可载入的近似参数：调研给的近似 + 已补上的能力带来的参数（调研值优先） */
export function effectiveApprox(s: StyleEntry): Values {
  const extra: Values = {};
  for (const n of s.needs) Object.assign(extra, resolveNeed(n).values);
  return { ...extra, ...s.approx };
}

/** 能力状态：由实现情况推出 */
export function capabilityOf(s: StyleEntry, base: Values): { state: CapState; reasons: string[]; resolved: string[] } {
  const reasons: string[] = [];
  const approx = effectiveApprox(s);
  const approxKeys = Object.keys(approx);
  const needs = remainingNeeds(s);
  const resolved = s.needs.filter((n) => !needs.includes(n));
  if (s.recipe && !RECIPE_MAP.has(s.recipe)) reasons.push(`配方 ${s.recipe} 不存在`);
  const bad = invalidApprox(s);
  reasons.push(...bad);
  // 近似参数里有"局部"选项或"待实现"参数
  const merged = { ...base, ...approx };
  let partialOpt = false;
  for (const id of approxKeys) {
    const p = getParam(id);
    if (!p) continue;
    if (p.status === 'todo') reasons.push(`${p.label} 尚未实现`);
    const opt = p.kind === 'choice' ? p.options?.find((o) => o.value === merged[id]) : undefined;
    if (opt?.status === 'partial' || p.status === 'partial') partialOpt = true;
    if (activeState(p, merged) !== true) reasons.push(`${p.label} 在这组参数下不生效`);
  }
  if (!approxKeys.length && !s.recipe) {
    return { state: s.surveyRealtime === '2d' ? 'reference' : 'todo', reasons: ['还没有可执行的参数组合'], resolved };
  }
  if (needs.length) {
    const assetLike = needs.some((n) => /素材|贴图|实拍|扫描|手绘|视频|Live2D|序列帧/.test(n));
    return { state: assetLike && s.surveyRealtime === 'needsAsset' ? 'needsAsset' : 'partial', reasons: [...reasons, ...needs], resolved };
  }
  if (bad.length) return { state: 'partial', reasons, resolved };
  return { state: partialOpt ? 'partial' : 'live', reasons, resolved };
}
