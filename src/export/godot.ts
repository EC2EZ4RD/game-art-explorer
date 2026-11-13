import { CARRIER_ASSET, CUN_ASSET, DETAIL_ASSET, FX_ASSET, getAsset, paperFile } from '../content/assets';
import { getPalette } from '../content/palettes';
import { ROLES } from '../content/roles';
import { hexToRgb } from '../core/color';
import { activeState, allParams, bool, labelOf, num, optionOf, str, uiIdle } from '../dims/registry';
import { godotUiFiles } from './godotHud';
import type { Theme } from '../hud/sys/theme';
import type { Values } from '../dims/types';

/*
 * Godot 4 迁移包：把当前实验翻译成 Godot 4（Forward+）能直接打开的最小工程。
 *   art_style.gdshader   表面着色（light() 实现所选明暗模型）
 *   outline.gdshader     反向外壳描边（next_pass）
 *   post_*.gdshader      全屏后处理（内部线、媒介、限色、移轴、纸纹、录像带、压缩噪点）
 *   style_demo.gd        在空场景里搭一个测试台，并把相机、灯光、环境、后处理接好
 *   palette.gd           颜色角色表
 *   MIGRATION.md         逐项迁移说明与未验证项
 * 只用 Godot 4 着色语言的通用写法；生成后可用 Godot 4.7 打开验证。
 */

export interface GodotFile {
  path: string;
  text: string;
  /** 二进制素材：public/assets/tex/ 下的文件名（打包时按原样拷贝，text 为空） */
  asset?: string;
  /** UI 字体：src/assets/fonts/ 下的 WOFF2（打包时原样拷贝） */
  font?: string;
  /** 字体许可原文：public/fonts/ 下的文件 */
  license?: string;
}

const f = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d).replace(/\.?0+$/, '') || '0' : '0');
const fl = (x: number) => {
  const s = f(x);
  return s.includes('.') ? s : `${s}.0`;
};
const col3 = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return `vec3(${fl(r)}, ${fl(g)}, ${fl(b)})`;
};
const gdColor = (hex: string) => `Color("${hex}")`;

/* ---------------- 素材纹理（AI 生成 / 程序生成，src/content/assets.json） ---------------- */

/** 迁移包里要附带的素材 PNG：放在 res://textures/ 下，脚本用 _tex() 直接读文件（命令行运行也不需要编辑器导入） */
function assetTextures(v: Values): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (key: string, id: string | undefined, fileKey: string) => {
    const f = id ? getAsset(id)?.files[fileKey] : undefined;
    if (f) out[key] = f;
  };
  const detail = str(v, 'material.detail');
  if (detailOn(v)) { add('detail_n', DETAIL_ASSET[detail], 'normal'); add('detail_h', DETAIL_ASSET[detail], 'height'); }
  if (str(v, 'material.cun') !== 'none') add('cun_tex', CUN_ASSET[str(v, 'material.cun')], 'gray');
  if (num(v, 'material.weathering') > 0) add('wear_tex', 'peel_mask', 'field');
  if (str(v, 'material.papercut') !== 'none') add('cut_tex', 'jianzhi_lattice', 'mask');
  if (bool(v, 'material.windowFlower')) add('flower_tex', 'jianzhi_window', 'mask');
  if (tamSurface(v) || tamPost(v)) { add('tam_a', 'tam', 'tones123'); add('tam_b', 'tam', 'tones456'); }
  const pf = paperFile(str(v, 'surface.paperTex'));
  if (pf) out.paper_tex = pf.file;
  const carrier = str(v, 'shape.carrier');
  if (carrier === 'pixelA' || carrier === 'pixelB') add('sprite_sheet', CARRIER_ASSET[carrier], 'sheet');
  if (str(v, 'motion.fx2d') !== 'none') add('fx_sheet', FX_ASSET[str(v, 'motion.fx2d')], 'sheet');
  return out;
}
const detailOn = (v: Values) => str(v, 'material.detail') !== 'noise' && num(v, 'material.bump') > 0 && str(v, 'shading.model') !== 'unlit';
const tamSurface = (v: Values) => str(v, 'shading.hatchTex') === 'tam' && str(v, 'shading.model') === 'hatching';
const tamPost = (v: Values) => str(v, 'shading.hatchTex') === 'tam' && ['sketch', 'crosshatch'].includes(str(v, 'surface.medium'));
const surfaceAssetsOn = (v: Values) => detailOn(v) || str(v, 'material.cun') !== 'none' || num(v, 'material.weathering') > 0
  || str(v, 'material.papercut') !== 'none' || bool(v, 'material.windowFlower');

/** 每个颜色角色要不要皴法 / 剥落 / 镂空 / 窗花（位标志，与网页版 isCunRole / isWearRole / isCutRole 一致；测试台的地面是 grass，也算地形） */
function roleFlagsScript(v: Values): string {
  const cut = str(v, 'material.papercut');
  const arch = ['structure', 'roof', 'trim', 'wood', 'stone', 'paper'];
  const veg = ['foliage', 'foliage2', 'flower'];
  const cutRoles = cut === 'architecture' ? arch : cut === 'vegetation' ? veg : cut === 'all' ? [...arch, ...veg, 'interactive', 'metal', 'cloth'] : [];
  const flags: Record<string, number> = {};
  const set = (roles: string[], bit: number) => roles.forEach((r) => (flags[r] = (flags[r] ?? 0) | bit));
  if (str(v, 'material.cun') !== 'none') set(['rock', 'stone', 'highland', 'soil', 'grass', 'sand', 'path', 'snow'], 1);
  if (num(v, 'material.weathering') > 0) set(['structure', 'wood', 'trim', 'stone', 'roof', 'metal'], 2);
  set(cutRoles, 4);
  if (bool(v, 'material.windowFlower')) set(['paper'], 8);
  return `const ROLE_FLAGS := {${Object.entries(flags).map(([r, b]) => `"${r}": ${b}`).join(', ')}}`;
}

function assetGlsl(v: Values): string {
  if (!surfaceAssetsOn(v) && !tamSurface(v)) return '';
  const pal = getPalette(str(v, 'color.palette'));
  const detail = Math.max(0, ['noise', 'clay', 'knit'].indexOf(str(v, 'material.detail')));
  return `
// 素材纹理（AI 生成，style_demo.gd 用 _tex() 读 res://textures/ 下的 PNG 后写入）
uniform int role_flags = 0; // 1 皴法 / 2 剥落 / 4 镂空 / 8 窗花（按颜色角色由脚本设置）
uniform sampler2D detail_n : repeat_enable, filter_linear_mipmap;
uniform sampler2D detail_h : repeat_enable, filter_linear_mipmap;
uniform int detail_mode = ${detailOn(v) ? detail : 0}; // 0 无 / 1 黏土指纹 / 2 针织
uniform float detail_scale = ${fl(num(v, 'material.detailScale'))};
uniform float bump = ${fl(num(v, 'material.bump'))};
uniform sampler2D cun_tex : repeat_enable, filter_linear_mipmap;
uniform int cun_mode = ${Math.max(0, ['none', 'pima', 'fupi', 'midian'].indexOf(str(v, 'material.cun')))};
uniform float cun_amount = ${fl(num(v, 'material.cunAmount'))};
uniform float cun_scale = ${fl(num(v, 'material.cunScale'))};
uniform vec3 sun_dir = vec3(0.4, 0.8, 0.3); // 指向太阳，脚本写入
uniform vec3 ink_color : source_color = ${col3(pal.roles.ink)};
uniform sampler2D wear_tex : repeat_enable, filter_linear_mipmap;
uniform float wear = ${fl(num(v, 'material.weathering') * 0.8)};
uniform float wear_scale = ${fl(num(v, 'material.weatherScale'))};
uniform vec3 under_color : source_color = ${col3(pal.roles.soil)};
uniform sampler2D cut_tex : repeat_enable, filter_linear_mipmap;
uniform float cut_scale = ${fl(num(v, 'material.papercutScale'))};
uniform sampler2D flower_tex : repeat_enable, filter_linear_mipmap;
uniform vec3 accent_color : source_color = ${col3(pal.roles.accent)};
uniform sampler2D tam_a : repeat_enable, filter_linear_mipmap;
uniform sampler2D tam_b : repeat_enable, filter_linear_mipmap;

vec3 tri_w(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }
// 三平面取样：侧面 v 取 -y，图片上方 = 世界上方（与网页版一致）
float tri_tex(sampler2D t, vec3 p, vec3 n, float s) {
\tvec3 w = tri_w(n);
\treturn texture(t, vec2(p.z, -p.y) * s).r * w.x + texture(t, p.xz * s).r * w.y + texture(t, vec2(p.x, -p.y) * s).r * w.z;
}
vec3 tri_normal(sampler2D t, vec3 p, vec3 n, float s, float k) {
\tvec3 w = tri_w(n);
\tvec3 a = texture(t, vec2(p.z, -p.y) * s).xyz * 2.0 - 1.0;
\tvec3 b = texture(t, p.xz * s).xyz * 2.0 - 1.0;
\tvec3 c = texture(t, vec2(p.x, -p.y) * s).xyz * 2.0 - 1.0;
\tvec3 nx = normalize(vec3(0.0, 0.0, 1.0) * a.x * k + vec3(0.0, 1.0, 0.0) * a.y * k + n * a.z);
\tvec3 ny = normalize(vec3(1.0, 0.0, 0.0) * b.x * k + vec3(0.0, 0.0, -1.0) * b.y * k + n * b.z);
\tvec3 nz = normalize(vec3(1.0, 0.0, 0.0) * c.x * k + vec3(0.0, 1.0, 0.0) * c.y * k + n * c.z);
\treturn normalize(nx * w.x + ny * w.y + nz * w.z);
}
float tam_level(vec2 uv, int k) {
\tif (k <= 0) { return 1.0; }
\tif (k <= 3) { vec3 a = texture(tam_a, uv).rgb; return k == 1 ? a.r : (k == 2 ? a.g : a.b); }
\tvec3 b = texture(tam_b, uv).rgb; return k == 4 ? b.r : (k == 5 ? b.g : b.b);
}
float tam_paper(vec2 uv, float tone) {
\tfloat x = clamp(tone, 0.0, 1.0) * 6.0;
\tint i = int(floor(x));
\treturn mix(tam_level(uv, i), tam_level(uv, min(i + 1, 6)), x - float(i));
}
`;
}

/** fragment() 里改固有色的部分（镂空、窗花、剥落、针缝、皴法）；wn = 世界空间法线 */
function assetFragAlbedo(v: Values): string {
  if (!surfaceAssetsOn(v)) return '';
  return `
\tvec3 wn = normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
\tif ((role_flags & 4) != 0 && tri_tex(cut_tex, world, wn, cut_scale) < 0.5) { discard; }
\tif ((role_flags & 8) != 0) {
\t\tvec2 buv = abs(wn.y) > 0.6 ? world.xz : (abs(wn.x) > abs(wn.z) ? world.zy : world.xy);
\t\tbase = mix(base, accent_color, texture(flower_tex, fract(buv * 1.6)).r);
\t}
\tif ((role_flags & 2) != 0 && wear > 0.0) {
\t\tfloat f = tri_tex(wear_tex, world, wn, wear_scale);
\t\tfloat peel = 1.0 - smoothstep(wear - 0.012, wear + 0.012, f);
\t\tfloat lip = smoothstep(wear, wear + 0.03, f) * (1.0 - smoothstep(wear + 0.03, wear + 0.08, f));
\t\tbase = mix(base * (1.0 - lip * 0.22), mix(base * 0.78, under_color, 0.35), peel);
\t}
\tif (detail_mode > 0) {
\t\tfloat dh = tri_tex(detail_h, world, wn, detail_scale);
\t\tbase *= detail_mode == 2 ? mix(1.0, 0.45 + 0.65 * dh, min(1.0, bump * 1.5)) : mix(1.0, 0.82 + 0.3 * dh, min(1.0, bump));
\t}
\tif ((role_flags & 1) != 0 && cun_mode > 0) {
\t\t// 皴法：网页版在光照之后压暗，这里在固有色上压（背光与陡坡处更浓）
\t\tfloat cun = tri_tex(cun_tex, world, wn, cun_scale);
\t\tfloat lit = clamp(dot(wn, normalize(sun_dir)) * 0.5 + 0.5, 0.0, 1.0);
\t\tfloat slope = 1.0 - clamp(wn.y, 0.0, 1.0);
\t\tfloat k = cun_amount * cun * (0.3 + 0.7 * (1.0 - lit)) * (cun_mode == 3 ? 1.0 : 0.35 + 0.65 * smoothstep(0.04, 0.45, slope));
\t\tbase = mix(base, base * 0.3 + ink_color * 0.35, clamp(k * 1.3, 0.0, 1.0));
\t}`;
}

/** fragment() 末尾：凹凸图案的三平面法线（写回视空间 NORMAL） */
function assetFragNormal(v: Values): string {
  if (!detailOn(v)) return '';
  return `
\tif (detail_mode > 0) {
\t\tvec3 nw = tri_normal(detail_n, world, normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz), detail_scale, bump * (detail_mode == 1 ? 6.0 : 2.5));
\t\tNORMAL = normalize((VIEW_MATRIX * vec4(nw, 0.0)).xyz);
\t}`;
}

/** style_demo.gd 头部：素材路径表、按角色的标志、读 PNG 的 _tex()、精灵与特效引用 */
function assetScriptHead(v: Values): string {
  // 总是生成：后处理也会调用 _bind_tex()（没有素材时 TEX 为空，什么都不绑）
  const tex = assetTextures(v);
  return `
# 素材纹理（AI 生成 / 程序生成）：直接读 res://textures/ 下的 PNG。
# Image.load_from_file 不依赖编辑器导入，命令行运行也能用（Godot 会提示"导出后不可用"）；正式项目里改成 load() 导入的纹理。
const TEX := {${Object.entries(tex).map(([k, f]) => `"${k}": "res://textures/${f}"`).join(', ')}}
${roleFlagsScript(v)}
var tex_cache := {}
var sprite_ref: Sprite3D
var fx_ref: Sprite3D

func _tex(path: String, mipmaps := true) -> Texture2D:
\tvar key := path + str(mipmaps)
\tif tex_cache.has(key):
\t\treturn tex_cache[key]
\tvar img := Image.load_from_file(path)
\tif img == null:
\t\tpush_warning("缺少素材 " + path)
\t\treturn null
\tif mipmaps:
\t\timg.generate_mipmaps()
\tvar tx := ImageTexture.create_from_image(img)
\ttex_cache[key] = tx
\treturn tx

func _bind_tex(m: ShaderMaterial, keys: Array) -> void:
\tfor k in keys:
\t\tif TEX.has(k) and m.shader.get_shader_uniform_list().any(func(u): return u.name == k):
\t\t\tm.set_shader_parameter(k, _tex(TEX[k]))
`;
}

/** 测试台的角色：三维胶囊，或像素精灵（Sprite3D：4×4 帧、公告板、最近邻、alpha 裁切）；可选 2D 序列帧特效 */
function characterScript(v: Values): string {
  const tex = assetTextures(v);
  const lines: string[] = [];
  if (tex.sprite_sheet) {
    const size = num(v, 'shape.spriteSize');
    lines.push(
      `\t# 角色载体：${labelOf('shape.carrier', v)}（48×48 一格；第 0 行朝镜头、1 左、2 右、3 背对；这里只播朝镜头的行走）`,
      '\tvar spr := Sprite3D.new()',
      '\tspr.texture = _tex(TEX["sprite_sheet"], false)',
      '\tspr.hframes = 4',
      '\tspr.vframes = 4',
      '\tspr.billboard = BaseMaterial3D.BILLBOARD_ENABLED',
      '\tspr.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST',
      '\tspr.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD',
      `\tspr.shaded = ${num(v, 'shape.spriteLit') > 0.3 ? 'true' : 'false'}`,
      `\tspr.pixel_size = ${fl((1.15 * size) / 48)}`,
      '\tspr.centered = true',
      '\tspr.offset = Vector2(0, 24)',
      '\tspr.position = Vector3(1.8, 0.0, 1.2)',
      '\tadd_child(spr)',
      '\tsprite_ref = spr',
    );
  } else {
    lines.push(
      str(v, 'shape.carrier') === 'puppet' ? '\t# 纸片人（分件关节）没有自动迁移：见 MIGRATION.md 的做法，这里放三维胶囊占位' : '',
      '\tvar body := CapsuleMesh.new()', '\tbody.radius = 0.25', '\tbody.height = 0.8', '\t_add(body, "character", Vector3(1.8, 0.4, 1.2))',
      '\tvar head := SphereMesh.new()', '\thead.radius = 0.22', '\thead.height = 0.44', '\t_add(head, "skin", Vector3(1.8, 0.95, 1.2))',
    );
  }
  if (tex.fx_sheet) {
    const s = num(v, 'motion.fxSize');
    lines.push(
      `\t# 2D 序列帧特效：${labelOf('motion.fx2d', v)}（4×2 = 8 帧，${str(v, 'motion.fxFps')} 帧/秒，播完停 6 帧再循环）`,
      '\tvar fx := Sprite3D.new()',
      '\tfx.texture = _tex(TEX["fx_sheet"])',
      '\tfx.hframes = 4',
      '\tfx.vframes = 2',
      '\tfx.billboard = BaseMaterial3D.BILLBOARD_ENABLED',
      '\tfx.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD',
      '\tfx.shaded = false',
      `\tfx.pixel_size = ${fl(s / 256)}`,
      `\tfx.position = Vector3(3.8, ${fl(s * 0.45)}, -0.2)`,
      '\tadd_child(fx)',
      '\tfx_ref = fx',
    );
  }
  return lines.filter(Boolean).join('\n');
}

function spriteProcess(v: Values): string {
  const tex = assetTextures(v);
  const out: string[] = [];
  if (tex.sprite_sheet) out.push('\tif sprite_ref != null:\n\t\tsprite_ref.frame = int(t * 6.0) % 4');
  if (tex.fx_sheet) out.push(`\tif fx_ref != null:\n\t\tvar n := int(t * ${fl(Number(str(v, 'motion.fxFps')) || 12)}) % 14\n\t\tfx_ref.visible = n < 8\n\t\tfx_ref.frame = mini(n, 7)`);
  return out.length ? `${out.join('\n')}\n` : '';
}

/** 纸纹图：post_overlay / post_medium 共用（亮度起伏围绕平均值，整体亮度不变） */
function paperGlsl(v: Values): string {
  const pf = paperFile(str(v, 'surface.paperTex'));
  if (!pf) return '';
  return `uniform sampler2D paper_tex : repeat_enable, filter_linear_mipmap;
uniform float paper_scale = ${fl(num(v, 'surface.paperTexScale'))};
// 纸面高度 0~1（0.5 ≈ 平均）：${labelOf('surface.paperTex', v)}，按屏幕像素平铺
float paper_h(vec2 p) { return clamp(0.5 + (dot(texture(paper_tex, p / (1024.0 * paper_scale)).rgb, vec3(0.2126, 0.7152, 0.0722)) - ${fl(pf.mean)}) * ${pf.color ? '2.0' : '1.0'}, 0.0, 1.0); }
`;
}

function surfaceShader(v: Values): string {
  const model = str(v, 'shading.model');
  const steps = num(v, 'shading.steps');
  const flat = str(v, 'geometry.representation') === 'faceted';
  const head = `// 由游戏美术风格探索台生成：明暗模型 = ${labelOf('shading.model', v)}
shader_type spatial;
render_mode ${model === 'unlit' ? 'unshaded' : 'diffuse_lambert, specular_disabled'}, cull_back;

uniform vec4 albedo : source_color = vec4(1.0);
uniform vec3 shadow_color : source_color = ${col3(str(v, 'shading.shadowColor'))};
uniform float shadow_tint : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.shadowTint'))};
uniform float shadow_depth : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.shadowDepth'))};
uniform int steps : hint_range(2, 6) = ${steps};
uniform float threshold : hint_range(-0.6, 0.6) = ${fl(num(v, 'shading.threshold'))};
uniform float softness : hint_range(0.0, 0.5) = ${fl(num(v, 'shading.softness'))};
uniform bool quantize_shadow = ${bool(v, 'shading.quantizeShadow') ? 'true' : 'false'};
uniform float wrap : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.wrap'))};
uniform float rim_amount : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.rim'))};
uniform float rim_width : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.rimWidth'))};
uniform float highlight : hint_range(0.0, 1.0) = ${fl(num(v, 'shading.highlight'))};
uniform float roughness_k : hint_range(0.0, 1.0) = ${fl(num(v, 'material.roughness'))};
uniform float grain : hint_range(0.0, 1.0) = ${fl(num(v, 'material.grain'))};
uniform bool flat_normals = ${flat && str(v, 'geometry.normals') === 'derivative' ? 'true' : 'false'};
// 局部彩色：不保留颜色的材质由 style_demo.gd 设为 > 0
uniform float desaturate : hint_range(0.0, 1.0) = 0.0;
${bendGlsl(v)}${texGlsl(v)}${assetGlsl(v)}
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise3(vec3 x) {
\tvec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
\t\tmix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float soft_band(float x, float edge, float w) { return smoothstep(edge - w - 0.0005, edge + w + 0.0005, x); }
float cel_levels(float x, int n, float w) {
\tfloat acc = 0.0;
\tfor (int k = 1; k < 6; k++) { if (k >= n) { break; } acc += soft_band(x, float(k) / float(n), w); }
\treturn acc / float(max(n - 1, 1));
}
vec3 tint_color() {
\tvec3 sc = shadow_color / max(max(shadow_color.r, max(shadow_color.g, shadow_color.b)), 0.01);
\treturn mix(vec3(1.0), sc, shadow_tint);
}
`;
  const tex = texOn(v);
  const vtx: string[] = [];
  if (tex) {
    vtx.push('\t// 贴图坐标：按主法线方向做世界空间盒式投影；仿射贴图插值 uv·w 与 w，片元里相除');
    vtx.push('\tvec3 wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;');
    vtx.push('\tvec3 wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);');
    vtx.push('\ttuv_p = abs(wn.y) > 0.6 ? wpos.xz : (abs(wn.x) > abs(wn.z) ? wpos.zy : wpos.xy);');
    vtx.push('\tfloat cw = (PROJECTION_MATRIX * MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).w;');
    vtx.push('\taff = vec3(tuv_p * cw, cw);');
  }
  if (bendOn(v)) {
    vtx.push('\t// 世界弯曲：只弯顶点位置（与网页版一致：按离焦点水平距离的平方下沉）');
    vtx.push('\tvec3 wp = bend_world((MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz);');
    vtx.push('\tVERTEX = (inverse(MODEL_MATRIX) * vec4(wp, 1.0)).xyz;');
  }
  const frag = `${vtx.length ? `
void vertex() {
${vtx.join('\n')}
}
` : ''}
void fragment() {
\tvec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
\tvec3 base = albedo.rgb;${assetFragAlbedo(v)}
\tif (grain > 0.0) { base *= 1.0 - grain * 0.4 * (vnoise3(world * 7.0) - 0.5); }${tex ? `
\tif (pattern >= 0) { vec2 tuv = affine ? aff.xy / aff.z : tuv_p; base *= mix(1.0, sample_pattern(pattern, tuv * tex_scale) * 1.18, tex_amount); }` : ''}
\tbase = mix(base, vec3(dot(base, vec3(0.2126, 0.7152, 0.0722))), desaturate);
\tALBEDO = base;
\tif (flat_normals) { NORMAL = normalize(cross(dFdx(VERTEX), dFdy(VERTEX))); }${assetFragNormal(v)}
${model === 'unlit' ? '' : `\tfloat fres = 1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0);
\tEMISSION = mix(vec3(1.0), base, 0.45) * smoothstep(1.0 - rim_width, 1.0, fres) * rim_amount * 0.5;`}
${model === 'matcap' ? `\tfloat d = clamp(dot(NORMAL, normalize(vec3(-0.35, 0.55, 0.75))), 0.0, 1.0);
\tEMISSION += base * (0.22 + 0.9 * d) + vec3(pow(d, 30.0) * 0.45);
\tALBEDO = vec3(0.0);` : ''}
}
`;
  let light = '';
  switch (model) {
    case 'unlit':
    case 'matcap':
      light = '';
      break;
    case 'lambert':
      light = `
void light() {
\tDIFFUSE_LIGHT += clamp(dot(NORMAL, LIGHT), 0.0, 1.0) * ATTENUATION * LIGHT_COLOR / PI;
}
`;
      break;
    case 'halfLambert':
      light = `
void light() {
\tfloat d = clamp((dot(NORMAL, LIGHT) + wrap) / (1.0 + wrap), 0.0, 1.0);
\tDIFFUSE_LIGHT += d * mix(1.0, ATTENUATION, 0.85) * LIGHT_COLOR / PI;
}
`;
      break;
    case 'toonRamp':
      light = `
// 复刻 MeshToonMaterial：half-Lambert 坐标查 N 格最近邻 ramp，投影（ATTENUATION）不参与量化
void light() {
\tfloat coord = clamp(dot(NORMAL, LIGHT) * 0.5 + 0.5 + threshold * 0.5, 0.0, 0.9999);
\tfloat lev = floor(coord * float(steps)) / max(float(steps) - 1.0, 1.0);
\tDIFFUSE_LIGHT += lev * ATTENUATION * LIGHT_COLOR / PI;
}
`;
      break;
    case 'gooch':
      light = `
void light() {
\tfloat t = clamp(dot(NORMAL, LIGHT) * 0.5 + 0.5, 0.0, 1.0) * mix(0.55, 1.0, ATTENUATION);
\tvec3 cool = mix(vec3(0.3), shadow_color / max(ALBEDO, vec3(0.05)), 0.45 * (0.5 + shadow_tint));
\tDIFFUSE_LIGHT += mix(cool, LIGHT_COLOR / PI * 1.05, t);
}
`;
      break;
    case 'pbr':
      light = `
// 物理材质：建议直接用 StandardMaterial3D（roughness/metallic），这里给出等价的漫反射 + GGX 近似
void light() {
\tvec3 H = normalize(LIGHT + VIEW);
\tfloat nl = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
\tfloat nh = clamp(dot(NORMAL, H), 0.0, 1.0);
\tfloat a = max(roughness_k * roughness_k, 0.002);
\tfloat dd = nh * nh * (a * a - 1.0) + 1.0;
\tfloat D = a * a / (PI * dd * dd);
\tDIFFUSE_LIGHT += nl * ATTENUATION * LIGHT_COLOR / PI;
\tSPECULAR_LIGHT += D * 0.04 * nl * ATTENUATION * LIGHT_COLOR;
}
`;
      break;
    case 'hatching':
      light = `
// 排线：亮度决定排线层数（世界空间锚定需要在 fragment 里传 world 坐标，这里用屏幕坐标简化）
void light() {
\tfloat t = clamp(dot(NORMAL, LIGHT), 0.0, 1.0) * ATTENUATION * 0.8 + 0.2;
${tamSurface(v) ? `\t// 色调排线图（TAM）：屏幕空间 45° 铺，一个纹素对一个像素，按亮度在相邻两级之间插值
\t// （light() 里不能 return，所以按导出时的选择只生成一种写法）
\tvec2 tuv = mat2(vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071)) * FRAGCOORD.xy / 512.0;
\tDIFFUSE_LIGHT += vec3(tam_paper(tuv, smoothstep(0.78, 0.08, t))) * LIGHT_COLOR / PI;
` : `\tvec2 p = FRAGCOORD.xy / 5.0;
\tfloat l1 = step(0.82, fract(dot(p, vec2(0.7071, 0.7071)))) * step(t, 0.66);
\tfloat l2 = step(0.82, fract(dot(p, vec2(0.7071, -0.7071)))) * step(t, 0.4);
\tDIFFUSE_LIGHT += vec3(1.0 - max(l1, l2) * 0.85) * LIGHT_COLOR / PI;
`}}
`;
      break;
    case 'cel':
    default:
      light = `
// 自定义赛璐璐：明暗分 N 阶，暗部用阴影色；quantize_shadow 时投影（ATTENUATION）也参与阈值化
void light() {
\tfloat x = clamp(dot(NORMAL, LIGHT) * 0.5 + 0.5 + threshold * 0.5, 0.0, 1.0);
\tif (quantize_shadow) { x *= ATTENUATION; }
\tfloat lev = cel_levels(x, steps, softness);
\tvec3 lit = LIGHT_COLOR / PI;
\tvec3 c = LIGHT_IS_DIRECTIONAL ? mix(shadow_depth * tint_color(), lit, lev) : lit * lev * 0.6;
\tif (!quantize_shadow) { c = mix(shadow_depth * tint_color(), c, ATTENUATION); }
\tvec3 H = normalize(LIGHT + VIEW);
\tfloat hl = soft_band(clamp(dot(NORMAL, H), 0.0, 1.0), 1.0 - (0.004 + roughness_k * 0.06), 0.002) * highlight * lev;
\tDIFFUSE_LIGHT += c;
\tSPECULAR_LIGHT += lit * hl;
}
`;
  }
  return head + frag + light;
}

function outlineShader(v: Values): string {
  const pal = getPalette(str(v, 'color.palette'));
  const mode = str(v, 'lines.outlineColorMode');
  const color = mode === 'custom' ? str(v, 'lines.outlineColor') : pal.roles.ink;
  return `// 反向外壳描边：作为表面材质的 next_pass 使用
// 注意：低模（非索引/硬边）网格请把平滑法线烘到 CUSTOM0，并把下面的 NORMAL 换成 CUSTOM0.xyz，否则转角会裂开
shader_type spatial;
render_mode unshaded, cull_front, depth_draw_opaque;

uniform vec4 outline_color : source_color = vec4(${col3(color)}, 1.0);
uniform float width_px = ${fl(num(v, 'lines.outlineWidth'))};
uniform bool tint_by_albedo = ${mode === 'tinted' ? 'true' : 'false'};
uniform vec4 albedo : source_color = vec4(1.0);
${bendGlsl(v)}
void vertex() {
\tvec4 clip = ${bendOn(v) ? 'PROJECTION_MATRIX * VIEW_MATRIX * vec4(bend_world((MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz), 1.0)' : 'PROJECTION_MATRIX * MODELVIEW_MATRIX * vec4(VERTEX, 1.0)'};
\tvec3 n = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
\tvec2 dir = (PROJECTION_MATRIX * vec4(n, 0.0)).xy;
\tfloat len = length(dir);
\tdir = len > 1e-5 ? dir / len : vec2(0.0);
\tclip.xy += dir * width_px * 2.0 / VIEWPORT_SIZE * clip.w;
\tPOSITION = clip;
}

void fragment() {
\tALBEDO = tint_by_albedo ? albedo.rgb * 0.32 : outline_color.rgb;
}
`;
}

/** 全屏 spatial 四边形的公共头：可读深度与法线（Forward+） */
const SCREEN_HEAD = `shader_type spatial;
render_mode unshaded, depth_test_disabled, depth_draw_never, cull_disabled, fog_disabled;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform sampler2D normal_tex : hint_normal_roughness_texture, filter_nearest;

void vertex() {
\tPOSITION = vec4(VERTEX.xy * 2.0, 1.0, 1.0);
}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; } return s; }
float lin_depth(vec2 uv, mat4 inv_proj) {
\tfloat d = texture(depth_tex, uv).r;
\tvec4 v = inv_proj * vec4(uv * 2.0 - 1.0, d, 1.0);
\treturn -v.z / v.w;
}
`;

const GRADES = ['none', 'tealOrange', 'bleach', 'sepia', 'technicolor', 'cross', 'faded', 'mono'];

/**
 * 体积光近似：从太阳屏幕位置径向模糊天空遮罩（sun_uv 由 style_demo.gd 每帧写入）。
 * Godot 里几个全屏四边形读的是同一份屏幕拷贝，所以这里只输出要加上去的光（blend_add），排在最后画，不会盖掉媒介和内部线。
 */
function godraysShader(v: Values): string | null {
  const amt = num(v, 'lighting.godrays');
  if (amt <= 0) return null;
  const pal = getPalette(str(v, 'color.palette'));
  return `// 体积光束（屏幕空间径向模糊）。真实体积光可改用 Environment.volumetric_fog_enabled，效果不同。
// 只输出加上去的光（blend_add），叠在媒介与内部线之上
${SCREEN_HEAD.replace('render_mode unshaded,', 'render_mode unshaded, blend_add,')}
uniform vec2 sun_uv = vec2(0.5, 0.2);
uniform bool sun_visible = false;
uniform float amount = ${fl(amt)};
uniform vec3 tint : source_color = ${col3(pal.roles.skyHorizon)};

// Godot 4 用反向深度：远平面 = 0，天空像素深度为 0
float sky_at(vec2 uv) { return texture(depth_tex, clamp(uv, 0.0, 1.0)).r < 0.000001 ? 1.0 : 0.0; }

void fragment() {
\tvec3 c = vec3(0.0);
\tif (sun_visible) {
\t\tvec2 asp = vec2(VIEWPORT_SIZE.x / VIEWPORT_SIZE.y, 1.0);
\t\tvec2 dir = (SCREEN_UV - sun_uv) * 0.55 / 40.0;
\t\tvec2 uv = SCREEN_UV - dir * hash12(FRAGCOORD.xy);
\t\tfloat acc = 0.0;
\t\tfloat decay = 1.0;
\t\tfor (int i = 0; i < 40; i++) {
\t\t\tuv -= dir;
\t\t\tfloat disc = 1.0 - smoothstep(0.02, 0.45, length((uv - sun_uv) * asp));
\t\t\tacc += sky_at(uv) * disc * decay;
\t\t\tdecay *= 0.96;
\t\t}
\t\tacc /= 40.0;
\t\tfloat self_sky = sky_at(SCREEN_UV) > 0.5 ? 0.35 : 1.0;
\t\tfloat near = 1.0 - smoothstep(0.15, 0.9, length((SCREEN_UV - sun_uv) * asp));
\t\tc += tint * acc * amount * 2.5 * self_sky * near;
\t}
\tALBEDO = c;
}
`;
}

function edgesShader(v: Values): string {
  const pal = getPalette(str(v, 'color.palette'));
  const mode = str(v, 'lines.edges');
  const bits = ({ depthNormal: 3, normal: 2, depth: 1, region: 1, all: 3 } as Record<string, number>)[mode] ?? 3;
  return `// 内部线（深度 + 法线 Sobel）：挂在相机前的全屏 QuadMesh 上（见 style_demo.gd）
// 原工具的"部件分界"模式依赖自定义角色缓冲，Godot 里需要自写 Compositor 或改用法线/深度近似
// 只输出线色 + 线的不透明度（ALPHA），排在媒介之后画：几个全屏四边形读的是同一份屏幕拷贝，整屏覆盖会互相盖掉
${SCREEN_HEAD}
uniform int mode = ${bits};
uniform float width_px = ${fl(num(v, 'lines.edgeWidth'))};
uniform float sensitivity = ${fl(num(v, 'lines.edgeThreshold'))};
uniform float far_fade = ${fl(num(v, 'lines.edgeFade'))};
uniform int color_mode = ${Math.max(0, ['ink', 'tinted', 'light', 'split'].indexOf(str(v, 'lines.edgeColorMode')))};
uniform vec3 ink : source_color = ${col3(pal.roles.ink)};
uniform vec3 light_color : source_color = ${col3(pal.roles.paper)};

void fragment() {
\tvec2 px = 1.0 / VIEWPORT_SIZE;
\tfloat dc = lin_depth(SCREEN_UV, INV_PROJECTION_MATRIX);
\tvec3 nc = texture(normal_tex, SCREEN_UV).xyz * 2.0 - 1.0;
\tfloat td = mix(0.09, 0.006, sensitivity);
\tfloat tn = mix(0.55, 0.04, sensitivity);
\tfloat e = 0.0;
\tfloat ed = 0.0;
\tvec2 offs[4] = vec2[](vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0));
\tfor (int i = 0; i < 4; i++) {
\t\tvec2 uv = SCREEN_UV + offs[i] * px * width_px;
\t\tfloat dn = lin_depth(uv, INV_PROJECTION_MATRIX);
\t\tvec3 nn = texture(normal_tex, uv).xyz * 2.0 - 1.0;
\t\tif ((mode & 1) != 0) { float de = smoothstep(td, td * 1.6, abs(dn - dc) / max(min(dn, dc), 0.001)); e = max(e, de); ed = max(ed, de); }
\t\tif ((mode & 2) != 0) { e = max(e, smoothstep(tn, tn * 1.5, 1.0 - dot(nc, nn))); }
\t}
\te *= 1.0 - far_fade * smoothstep(20.0, 120.0, dc);
\tvec3 cur = texture(screen_tex, SCREEN_UV).rgb;
\tvec3 lc = ink;
\tif (color_mode == 1) { lc = cur * 0.42; }
\telse if (color_mode == 2) { lc = light_color; }
\telse if (color_mode == 3) { lc = ed > 0.5 ? ink : mix(cur, light_color, 0.55); }
\tALBEDO = lc;
\tALPHA = clamp(e, 0.0, 1.0);
}
`;
}

/**
 * 油画 / 水粉 / 水彩共用的"刷色块"函数 paint(uv, r, px, dfac)，外加随距离变化的笔触尺寸 depth_factor()。
 * 各向异性版：Godot 的单个全屏 pass 里没有网页版那样的独立张量缓冲（BackBufferCopy 只能复制屏幕），
 * 所以结构张量在 5×5 格点（间距 2px，第 1 级 mip 先做约 2px 预模糊）上就地估算：3×3 个 Sobel 按 1-2-1 高斯加权，
 * 近似网页版"Sobel → σ2px 分离平滑"；刷痕（LIC）沿中心像素的方向走直线（网页版沿流线弯曲）。
 * Godot 的屏幕纹理是色调映射前的线性 HDR，网页版在调色后的 sRGB 上滤波：取样先开方（近似感知编码），
 * 阈值（方差下限 0.02、张量放大 1000 倍、平坦区噪声 0.002）才与网页版同量级，滤波后再平方还原。
 */
function paintGlsl(v: Values, classic: string): string {
  const ortho = str(v, 'camera.projection') === 'ortho';
  const head = `uniform float stroke_depth = ${fl(num(v, 'surface.strokeDepth'))};
// 镜头注视点距离：与 style_demo.gd 里相机到原点的距离一致；接入自己的相机后每帧写入
uniform float focus_dist = ${ortho ? '40.0' : '22.0'};
uniform bool ortho_cam = ${ortho ? 'true' : 'false'};
uniform float view_h = ${fl(20 / Math.max(0.1, num(v, 'camera.zoom')))};
// 随距离变化的笔触尺寸（与网页版 strokeDepthScale 同公式）：强度 1 时近处约 0.6 倍、远处约 2.4 倍
float depth_factor(float d) {
\tif (stroke_depth <= 0.0) { return 1.0; }
\tfloat f = max(focus_dist, 0.001);
\tfloat s = ortho_cam ? (d - f) / max(view_h, 0.001) * 2.0 : log2(max(d, 0.001) / f);
\treturn exp2(clamp(s, -1.5, 2.5) * 0.5 * stroke_depth);
}
`;
  if (str(v, 'surface.kuwahara') !== 'anisotropic') {
    return `${head}${classic}
vec3 paint(vec2 uv, int r, vec2 px, float dfac) { return kuwahara(uv, r, scale * dfac * px); }
`;
  }
  return `${head}uniform float stroke_flow = ${fl(num(v, 'surface.strokeFlow'))};
uniform float stroke_length = ${fl(num(v, 'surface.strokeLength'))};
// 线性 HDR → 近似感知编码（开方），让阈值与网页版（调色后的 sRGB）同量级
vec3 enc(vec3 c) { return sqrt(clamp(c, vec3(0.0), vec3(4.0))); }
// 结构张量 (E, F, G)：5×5 格点上算 3×3 个 Sobel，按 1-2-1 高斯加权（≈ 网页版的 σ2px 平滑），放大 1000 倍与网页版同量级
vec3 tensor_at(vec2 uv, vec2 px) {
\tvec3 c[25];
\tfor (int j = 0; j < 5; j++) {
\t\tfor (int i = 0; i < 5; i++) {
\t\t\tc[j * 5 + i] = enc(textureLod(screen_tex, uv + vec2(float(i - 2), float(j - 2)) * 2.0 * px, 1.0).rgb);
\t\t}
\t}
\tvec3 T = vec3(0.0);
\tfor (int j = 1; j < 4; j++) {
\t\tfor (int i = 1; i < 4; i++) {
\t\t\tvec3 gx = (c[(j - 1) * 5 + i + 1] + 2.0 * c[j * 5 + i + 1] + c[(j + 1) * 5 + i + 1] - c[(j - 1) * 5 + i - 1] - 2.0 * c[j * 5 + i - 1] - c[(j + 1) * 5 + i - 1]) * 0.125;
\t\t\tvec3 gy = (c[(j + 1) * 5 + i - 1] + 2.0 * c[(j + 1) * 5 + i] + c[(j + 1) * 5 + i + 1] - c[(j - 1) * 5 + i - 1] - 2.0 * c[(j - 1) * 5 + i] - c[(j - 1) * 5 + i + 1]) * 0.125;
\t\t\tfloat g = (j == 2 ? 2.0 : 1.0) * (i == 2 ? 2.0 : 1.0) / 16.0;
\t\t\tT += vec3(dot(gx, gx), dot(gx, gy), dot(gy, gy)) * g;
\t\t}
\t}
\t// 平坦区没有可靠方向：叠一层很弱的低频噪声走向（大致水平，与网页版相同）
\tfloat ang = (vnoise(uv / px / (90.0 * scale)) - 0.5) * 2.4;
\tvec2 n = vec2(-sin(ang), cos(ang));
\treturn T * 1000.0 + 0.002 * vec3(n.x * n.x, n.x * n.y, n.y * n.y);
}
// 张量 → 切线方向（颜色变化最小的方向）与各向异性 A；分母加 0.05 的软下限，平坦区 A≈0、笔刷接近圆形（与网页版相同）
vec2 flow_dir(vec3 T, out float A) {
\tfloat tr = T.x + T.z;
\tfloat disc = sqrt(max((T.x - T.z) * (T.x - T.z) + 4.0 * T.y * T.y, 0.0));
\tfloat l1 = 0.5 * (tr + disc);
\tfloat l2 = 0.5 * (tr - disc);
\tA = clamp((l1 - l2) / (max(l1 + l2, 0.0) + 0.05), 0.0, 1.0);
\tvec2 t = vec2(l1 - T.x, -T.y);
\tfloat len = length(t);
\treturn len > 1e-8 ? t / len : vec2(0.0, 1.0);
}
void acc(inout vec4 m, inout vec3 s, vec3 c, float w) { m += vec4(c * w, w); s += c * c * w; }
float sector_weight(vec4 m, vec3 s, out vec3 mean) {
\tmean = m.rgb / m.w;
\tvec3 vr = abs(s / m.w - mean * mean);
\tfloat sd = sqrt(vr.r) + sqrt(vr.g) + sqrt(vr.b);
\treturn pow(0.02 / max(sd, 0.02), 8.0);
}
float sq(float x) { return x * x; }
// 各向异性 Kuwahara（与网页版 AKF 同公式：椭圆核 α=1、8 扇区多项式权重 ζ=2/r、γ=3π/16、q=8；单位圆盘网格取样，≤6 格）
vec3 akf(vec2 uv, float r, int grid, vec2 px, out vec2 t, out float aniso) {
\tfloat A;
\tt = flow_dir(tensor_at(uv, px), A);
\taniso = A;
\tvec2 ax = t * r * (1.0 + A) * px;
\tvec2 ay = vec2(-t.y, t.x) * r / (1.0 + A) * px;
\tfloat zeta = 2.0 / r;
\tfloat eta = (zeta + 0.8315) / 0.3087;
\tvec3 c0 = enc(textureLod(screen_tex, uv, 0.0).rgb);
\tvec4 m0 = vec4(c0 * 0.125, 0.125);
\tvec4 m1 = m0; vec4 m2 = m0; vec4 m3 = m0; vec4 m4 = m0; vec4 m5 = m0; vec4 m6 = m0; vec4 m7 = m0;
\tvec3 s0 = c0 * c0 * 0.125;
\tvec3 s1 = s0; vec3 s2 = s0; vec3 s3 = s0; vec3 s4 = s0; vec3 s5 = s0; vec3 s6 = s0; vec3 s7 = s0;
\tfloat gr = float(grid);
\tfor (int j = 0; j <= 6; j++) {
\t\tif (j > grid) { break; }
\t\tfor (int i = -6; i <= 6; i++) {
\t\t\tif (i < -grid || i > grid || (j == 0 && i <= 0)) { continue; }
\t\t\tvec2 v = vec2(float(i), float(j)) / gr;
\t\t\tfloat r2 = dot(v, v);
\t\t\tif (r2 > 1.0) { continue; }
\t\t\t// poly.x = ζ - η x² 配 ±y 轴上的扇区 0、4；poly.y = ζ - η y² 配 ±x 轴上的扇区 2、6
\t\t\tvec2 poly = zeta - eta * v * v;
\t\t\tfloat w0 = sq(max(0.0, v.y + poly.x));
\t\t\tfloat w2 = sq(max(0.0, -v.x + poly.y));
\t\t\tfloat w4 = sq(max(0.0, -v.y + poly.x));
\t\t\tfloat w6 = sq(max(0.0, v.x + poly.y));
\t\t\tvec2 u = 0.70710678 * vec2(v.x - v.y, v.x + v.y);
\t\t\tvec2 poly_r = zeta - eta * u * u;
\t\t\tfloat w1 = sq(max(0.0, u.y + poly_r.x));
\t\t\tfloat w3 = sq(max(0.0, -u.x + poly_r.y));
\t\t\tfloat w5 = sq(max(0.0, -u.y + poly_r.x));
\t\t\tfloat w7 = sq(max(0.0, u.x + poly_r.y));
\t\t\tfloat gw = exp(-3.14159265 * r2) / max(w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7, 1e-6);
\t\t\tvec2 o = v.x * ax + v.y * ay;
\t\t\tvec3 cu = enc(textureLod(screen_tex, uv + o, 0.0).rgb);
\t\t\tvec3 cl = enc(textureLod(screen_tex, uv - o, 0.0).rgb);
\t\t\tacc(m0, s0, cu, w0 * gw); acc(m4, s4, cl, w0 * gw);
\t\t\tacc(m1, s1, cu, w1 * gw); acc(m5, s5, cl, w1 * gw);
\t\t\tacc(m2, s2, cu, w2 * gw); acc(m6, s6, cl, w2 * gw);
\t\t\tacc(m3, s3, cu, w3 * gw); acc(m7, s7, cl, w3 * gw);
\t\t\tacc(m4, s4, cu, w4 * gw); acc(m0, s0, cl, w4 * gw);
\t\t\tacc(m5, s5, cu, w5 * gw); acc(m1, s1, cl, w5 * gw);
\t\t\tacc(m6, s6, cu, w6 * gw); acc(m2, s2, cl, w6 * gw);
\t\t\tacc(m7, s7, cu, w7 * gw); acc(m3, s3, cl, w7 * gw);
\t\t}
\t}
\tvec3 mean;
\tfloat w;
\tvec3 sum = vec3(0.0);
\tfloat ws = 0.0;
\tw = sector_weight(m0, s0, mean); sum += mean * w; ws += w;
\tw = sector_weight(m1, s1, mean); sum += mean * w; ws += w;
\tw = sector_weight(m2, s2, mean); sum += mean * w; ws += w;
\tw = sector_weight(m3, s3, mean); sum += mean * w; ws += w;
\tw = sector_weight(m4, s4, mean); sum += mean * w; ws += w;
\tw = sector_weight(m5, s5, mean); sum += mean * w; ws += w;
\tw = sector_weight(m6, s6, mean); sum += mean * w; ws += w;
\tw = sector_weight(m7, s7, mean); sum += mean * w; ws += w;
\tvec3 e = ws > 0.0 ? sum / ws : c0;
\t// 平方还原回线性
\treturn e * e;
}
float streak(vec2 p, float w) { return vnoise(p / w) * 0.7 + vnoise(p / (w * 0.45) + 17.0) * 0.3; }
vec3 paint(vec2 uv, int r, vec2 px, float dfac) {
\tvec2 t;
\t// 取样网格每边格数按"半径 × 笔触/颗粒尺度"定（与网页版相同），≤6
\tint grid = int(clamp(round(float(r) * scale), 2.0, 6.0));
\tfloat an;
\tvec3 c = akf(uv, clamp(float(r) * scale * dfac, 1.5, 24.0), grid, px, t, an);
\tif (stroke_flow > 0.0) {
\t\t// 刷痕：沿中心像素的方向走直线积分噪声；噪声钉在屏幕像素上，镜头移动时刷痕相对物体滑动
\t\t// 粗细随距离按半个倍频程分档、两档交叉淡化（与网页版相同）：噪声坐标不乘连续变化的系数
\t\tvec2 p0 = uv / px;
\t\tfloat sw0 = max(1.2, 1.4 * scale);
\t\tfloat lw = log2(dfac) * 2.0;
\t\tfloat l0 = floor(lw);
\t\tfloat fw = lw - l0;
\t\tfloat sw_a = sw0 * exp2(l0 * 0.5);
\t\tfloat sw_b = sw_a * 1.41421356;
\t\tfloat h = clamp(stroke_length * scale * dfac, 2.0, 64.0) / 16.0;
\t\tfloat ta = streak(p0, sw_a);
\t\tfloat tb = fw > 0.0 ? streak(p0, sw_b) : 0.0;
\t\tfloat tw = 1.0;
\t\tfor (int k = 1; k <= 8; k++) {
\t\t\tfloat kw = 1.0 - float(k) / 9.0;
\t\t\tvec2 o = t * h * float(k);
\t\t\tta += (streak(p0 + o, sw_a) + streak(p0 - o, sw_a)) * kw;
\t\t\tif (fw > 0.0) { tb += (streak(p0 + o, sw_b) + streak(p0 - o, sw_b)) * kw; }
\t\t\ttw += 2.0 * kw;
\t\t}
\t\t// 平坦区（A≈0）刷痕减到约三成（与网页版相同）
\t\tc *= 1.0 + clamp((mix(ta, tb, fw) / tw - 0.5) * 4.0, -1.0, 1.0) * stroke_flow * 0.5 * mix(0.3, 1.0, an);
\t}
\treturn c;
}
`;
}

function mediumShader(v: Values): string | null {
  const m = str(v, 'surface.medium');
  const pal = getPalette(str(v, 'color.palette'));
  const common = `uniform float strength = ${fl(num(v, 'surface.strength'))};
uniform float scale = ${fl(num(v, 'surface.scale'))};
uniform vec3 paper : source_color = ${col3(pal.roles.paper)};
uniform vec3 ink : source_color = ${col3(pal.roles.ink)};
${paperGlsl(v)}${tamPost(v) ? `uniform sampler2D tam_a : repeat_enable, filter_linear_mipmap;
uniform sampler2D tam_b : repeat_enable, filter_linear_mipmap;
float tam_level(vec2 uv, int k) {
\tif (k <= 0) { return 1.0; }
\tif (k <= 3) { vec3 a = texture(tam_a, uv).rgb; return k == 1 ? a.r : (k == 2 ? a.g : a.b); }
\tvec3 b = texture(tam_b, uv).rgb; return k == 4 ? b.r : (k == 5 ? b.g : b.b);
}
float tam_paper(vec2 uv, float tone) { float x = clamp(tone, 0.0, 1.0) * 6.0; int i = int(floor(x)); return mix(tam_level(uv, i), tam_level(uv, min(i + 1, 6)), x - float(i)); }
` : ''}`;
  const hasPaper = !!paperFile(str(v, 'surface.paperTex'));
  const kuwahara = `vec3 kuwahara(vec2 uv, int r, vec2 t) {
\tvec3 m[4]; vec3 s[4];
\tfor (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
\tfor (int j = 0; j <= r; j++) { for (int i = 0; i <= r; i++) {
\t\tvec3 c0 = texture(screen_tex, uv + vec2(float(-i), float(-j)) * t).rgb; m[0] += c0; s[0] += c0 * c0;
\t\tvec3 c1 = texture(screen_tex, uv + vec2(float(i), float(-j)) * t).rgb; m[1] += c1; s[1] += c1 * c1;
\t\tvec3 c2 = texture(screen_tex, uv + vec2(float(-i), float(j)) * t).rgb; m[2] += c2; s[2] += c2 * c2;
\t\tvec3 c3 = texture(screen_tex, uv + vec2(float(i), float(j)) * t).rgb; m[3] += c3; s[3] += c3 * c3;
\t} }
\tfloat n = float((r + 1) * (r + 1));
\tvec3 acc = vec3(0.0); float ws = 0.0;
\tfor (int k = 0; k < 4; k++) {
\t\tvec3 mean = m[k] / n; vec3 var = abs(s[k] / n - mean * mean);
\t\tfloat w = 1.0 / (1.0 + pow((var.r + var.g + var.b) * 300.0, 2.0));
\t\tacc += mean * w; ws += w;
\t}
\treturn acc / ws;
}
`;
  const paint = paintGlsl(v, kuwahara);
  const body: Record<string, string> = {
    watercolor: `${paint}
void fragment() {
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tvec2 n = vec2(fbm(p / (70.0 * scale)), fbm(p / (70.0 * scale) + 7.3)) - 0.5;
\tvec2 uv = SCREEN_UV + n * ${fl(num(v, 'surface.bleed'))} * 9.0 * scale / VIEWPORT_SIZE;
\tvec3 a = paint(uv, ${Math.max(2, Math.round(num(v, 'surface.radius') * 0.85))}, 1.0 / VIEWPORT_SIZE, depth_factor(lin_depth(SCREEN_UV, INV_PROJECTION_MATRIX)));
\tvec3 b = textureLod(screen_tex, uv, 3.0).rgb;
\tfloat e = clamp(abs(lum(b) - lum(a)) * 7.0, 0.0, 1.0);
\tvec3 c = paper * mix(vec3(1.0), clamp(a / max(paper, vec3(0.05)), 0.0, 1.0), 0.92);
\tc *= 1.0 - ${fl(num(v, 'surface.edgeDarken'))} * e * 0.45;
\tc *= 1.0 - (1.0 - ${hasPaper ? 'paper_h(p)' : 'fbm(p / (2.2 * scale))'}) * 0.28 * (1.0 - lum(c));
\tALBEDO = mix(texture(screen_tex, SCREEN_UV).rgb, c, strength);
}
`,
    oil: `${paint}
void fragment() {
\tvec3 c = paint(SCREEN_UV, ${Math.round(num(v, 'surface.radius'))}, 1.0 / VIEWPORT_SIZE, depth_factor(lin_depth(SCREEN_UV, INV_PROJECTION_MATRIX)));
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tc *= 0.96 + 0.05 * (sin(p.x * 1.6 / scale) * sin(p.y * 1.6 / scale) * 0.5 + 0.5);
\tALBEDO = mix(texture(screen_tex, SCREEN_UV).rgb, c, strength);
}
`,
    gouache: `${paint}
void fragment() {
\tvec3 c = paint(SCREEN_UV, ${Math.max(2, Math.round(num(v, 'surface.radius') * 0.75))}, 1.0 / VIEWPORT_SIZE, depth_factor(lin_depth(SCREEN_UV, INV_PROJECTION_MATRIX)));
\tfloat q = ${fl(num(v, 'surface.inkLevels'))};
\tfloat l = lum(c);
\tc *= (floor(l * q) + smoothstep(0.35, 0.65, fract(l * q))) / q / max(l, 0.001);
\tALBEDO = mix(texture(screen_tex, SCREEN_UV).rgb, c, strength);
}
`,
    ink: `
void fragment() {
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tvec2 n = vec2(fbm(p / (45.0 * scale)), fbm(p / (45.0 * scale) + 5.1)) - 0.5;
\tvec2 uv = SCREEN_UV + n * ${fl(num(v, 'surface.bleed'))} * 7.0 * scale / VIEWPORT_SIZE;
\tfloat d = 1.0 - lum(texture(screen_tex, uv).rgb);
\tfloat db = 1.0 - lum(textureLod(screen_tex, uv, 3.0).rgb);
\tfloat q = ${fl(num(v, 'surface.inkLevels'))};
\tfloat lv = mix(floor(d * q + 0.35) / q, d, 0.25);
\tlv = max(lv, db * 0.55 * ${fl(num(v, 'surface.bleed'))});
\tfloat dry = smoothstep(0.35, 0.75, vnoise(vec2(p.x / (3.0 * scale), p.y / (26.0 * scale))));
\tlv = clamp(lv + clamp((d - db) * 5.0, 0.0, 1.0) * ${fl(num(v, 'surface.edgeDarken'))} * 0.5 * (0.5 + dry * 0.5), 0.0, 1.0);
\tvec3 c = mix(paper, ink, lv * 0.95);${hasPaper ? '\n\tc *= 1.0 + 0.12 * (paper_h(p) - 0.5);' : ''}
\tALBEDO = mix(texture(screen_tex, SCREEN_UV).rgb, c, strength);
}
`,
    gongbi: `
void fragment() {
\tvec3 o = texture(screen_tex, SCREEN_UV).rgb;
\tvec3 b = textureLod(screen_tex, SCREEN_UV, 3.0).rgb;
\tvec3 wash = paper * mix(vec3(1.0), clamp(o / max(paper, vec3(0.05)), 0.0, 1.0), 0.62);
\twash *= 1.0 - clamp((lum(b) - lum(o)) * 6.0, 0.0, 1.0) * 0.22 * ${fl(num(v, 'surface.edgeDarken'))};${hasPaper ? '\n\twash *= 1.0 + 0.1 * (paper_h(SCREEN_UV * VIEWPORT_SIZE) - 0.5);' : ''}
\tALBEDO = mix(o, wash, strength);
}
`,
    halftone: `
void fragment() {
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tfloat s = 6.0 * scale;
\tmat2 rot = mat2(vec2(0.7071, -0.7071), vec2(0.7071, 0.7071));
\tvec2 q = rot * p / s;
\tvec2 cell = floor(q) + 0.5;
\tvec2 cuv = (transpose(rot) * (cell * s)) / VIEWPORT_SIZE;
\tfloat l = lum(texture(screen_tex, cuv).rgb);
\tfloat r = sqrt(clamp(1.0 - l * 1.15, 0.0, 1.0)) * 0.62;
\tfloat dot_mask = 1.0 - smoothstep(r - 0.06, r + 0.06, length(q - cell));
\tvec3 o = texture(screen_tex, SCREEN_UV).rgb;
\tALBEDO = mix(o, mix(mix(o, vec3(1.0), 0.15), ink, dot_mask * 0.88), strength);
}
`,
    crosshatch: `
float hl(vec2 p, float ang, float sp, float w) { vec2 d = vec2(cos(ang), sin(ang)); float v = dot(p, d) / sp + vnoise(p * 0.05) * 0.6; return 1.0 - smoothstep(w, w + 0.2, abs(fract(v) - 0.5) * 2.0); }
void fragment() {
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tvec3 o = texture(screen_tex, SCREEN_UV).rgb;
\tfloat l = lum(o);
\tfloat sp = 5.0 * scale;
\tfloat k = 0.0;
\tif (l < 0.82) { k = max(k, hl(p, 0.785, sp, 0.14)); }
\tif (l < 0.6) { k = max(k, hl(p, -0.785, sp, 0.14)); }
\tif (l < 0.4) { k = max(k, hl(p, 0.0, sp * 0.8, 0.16)); }${tamPost(v) ? `
\t// 色调排线图（TAM）代替程序直线
\tk = 1.0 - tam_paper(mat2(vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071)) * p / (512.0 * scale), smoothstep(0.76, 0.08, l));` : ''}
\tALBEDO = mix(o, mix(paper, ink, k), strength);
}
`,
    posterize: `
void fragment() {
\tvec3 o = texture(screen_tex, SCREEN_UV).rgb;
\tfloat q = ${fl(num(v, 'surface.inkLevels'))};
\tALBEDO = mix(o, floor(o * q + 0.5) / q, strength);
}
`,
  };
  body.sketch = body.crosshatch;
  body.woodcut = `
void fragment() {
\tvec2 p = SCREEN_UV * VIEWPORT_SIZE;
\tvec3 o = texture(screen_tex, SCREEN_UV).rgb;
\tfloat l = clamp((lum(o) - 0.5) * 1.7 + 0.42, 0.0, 1.0);
\tfloat t = l * 1.1 + sin((p.x * 0.35 + p.y * 0.9) / (1.6 * scale) + fbm(p / (60.0 * scale)) * 6.0) * 0.22;
\tALBEDO = mix(o, mix(paper, ink, 1.0 - smoothstep(0.47, 0.53, t)), strength);
}
`;
  if (!body[m]) return null;
  return `// 画面媒介：${labelOf('surface.medium', v)}（近似移植，细节见 MIGRATION.md）
${SCREEN_HEAD}
${common}
${body[m]}`;
}

function quantizeShader(v: Values): string | null {
  const q = str(v, 'color.quantize');
  if (q === 'off') return null;
  const pal = getPalette(str(v, 'color.palette'));
  const sw = pal.swatches.slice(0, 64);
  const dither = ['none', 'bayer2', 'bayer4', 'bayer8', 'noise'].indexOf(str(v, 'color.dither'));
  return `// 限色${q === 'palette' ? '（严格落在色板里）' : '（每通道 N 级）'} + 抖色
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform int mode = ${q === 'palette' ? 1 : 2};
uniform int dither = ${Math.max(0, dither)};
uniform float levels = ${fl(num(v, 'color.levels'))};
// 世界稳定抖色：style_demo.gd 每帧按相机平移/转动写入偏移（像素），点阵跟着世界走
uniform vec2 anchor_offset = vec2(0.0);
const int COUNT = ${sw.length};
const vec3 SWATCHES[${sw.length}] = vec3[](${sw.map(col3).join(', ')});

float bayer2(vec2 p) { p = mod(floor(p), 2.0); return (p.x * 2.0 + p.y * 3.0 - 4.0 * p.x * p.y) / 4.0; }
float bayer4(vec2 p) { return bayer2(p * 0.5) * 0.25 + bayer2(p); }
float bayer8(vec2 p) { return bayer4(p * 0.5) * 0.25 + bayer2(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void fragment() {
\tvec3 c = texture(screen_tex, SCREEN_UV).rgb;
\tvec2 p = FRAGCOORD.xy + anchor_offset;
\tfloat th = 0.5;
\tif (dither == 1) { th = bayer2(p); } else if (dither == 2) { th = bayer4(p); } else if (dither == 3) { th = bayer8(p); } else if (dither == 4) { th = hash12(p); }
\tfloat spread = dither == 0 ? 0.0 : 1.0;
\tif (mode == 2) {
\t\tfloat q = max(levels - 1.0, 1.0);
\t\tc = floor(c * q + mix(0.5, th, spread)) / q;
\t} else {
\t\tc += (th - 0.5) * spread * 0.12;
\t\tfloat best = 1e9; int bi = 0;
\t\tfor (int i = 0; i < COUNT; i++) { vec3 d = c - SWATCHES[i]; float dd = dot(d, d); if (dd < best) { best = dd; bi = i; } }
\t\tc = SWATCHES[bi];
\t}
\tCOLOR = vec4(c, 1.0);
}
`;
}

function overlayShader(v: Values): string | null {
  const tilt = num(v, 'camera.tiltShift');
  const paper = num(v, 'surface.paper');
  const grain = num(v, 'surface.grain');
  const vig = num(v, 'surface.vignette');
  const crt = str(v, 'surface.screen') === 'crt';
  const grade = Math.max(0, GRADES.indexOf(str(v, 'color.grade')));
  const lens = num(v, 'camera.lens');
  // 开了录像带或压缩噪点时，黑边留给最后一个着色器画：录像带的横移和压缩的宏块处理完整画面，不会把黑边拖进画面（与网页版一致）
  const lateLb = str(v, 'surface.screen') === 'vhs' || num(v, 'surface.compression') > 0;
  const letterbox = lateLb || str(v, 'camera.letterbox') === 'none' ? 0 : Number(str(v, 'camera.letterbox'));
  if (tilt + paper + grain + vig + lens + letterbox === 0 && !crt && !grade) return null;
  const pal = getPalette(str(v, 'color.palette'));
  return `// 移轴模糊、纸纹、胶片颗粒、暗角${crt ? '、CRT 扫描线' : ''}${grade ? '、调色预设' : ''}${lens ? '、鱼眼畸变' : ''}
// 调色也可以烘成 3D LUT 交给 Environment.adjustment_color_correction；这里用着色器写出同一组公式，便于对照
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform int grade = ${grade};
uniform float grade_amount = ${fl(num(v, 'color.gradeAmount'))};
uniform float lens = ${fl(lens)};
uniform float letterbox = ${fl(letterbox)};
uniform float tilt = ${fl(tilt)};
uniform float focus = ${fl(1 - num(v, 'camera.tiltFocus'))};
uniform float paper_amt = ${fl(paper)};
uniform vec3 paper : source_color = ${col3(pal.roles.paper)};
${paperGlsl(v)}
uniform float grain = ${fl(grain)};
uniform float vignette = ${fl(vig)};
uniform bool crt = ${crt ? 'true' : 'false'};

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y); }

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 grade_preset(vec3 c) {
\tfloat l = lum(c);
\tif (grade == 1) { return mix(c * vec3(0.82, 1.0, 1.12), c * vec3(1.15, 1.0, 0.82), smoothstep(0.2, 0.8, l)); }
\tif (grade == 2) { vec3 b = mix(vec3(l), c, 0.45); return (b - 0.5) * 1.25 + 0.5; }
\tif (grade == 3) { return vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131))); }
\tif (grade == 4) { vec3 t = vec3(c.r - (c.g + c.b) * 0.5 + c.r, c.g - (c.r + c.b) * 0.5 + c.g, c.b - (c.r + c.g) * 0.5 + c.b); return mix(c, t, 0.35); }
\tif (grade == 5) { return vec3(smoothstep(0.05, 0.95, c.r), c.g * 1.05, c.b * 0.85 + 0.08); }
\tif (grade == 6) { return mix(vec3(l), c, 0.6) * 0.86 + 0.08; }
\tif (grade == 7) { return vec3(smoothstep(0.08, 0.92, l)); }
\treturn c;
}

void fragment() {
\tvec2 uv = SCREEN_UV;
\tif (lens > 0.0) {
\t\t// 桶形畸变：除以角上的放大量，四角刚好落在画面边缘
\t\tvec2 cc = uv * 2.0 - 1.0;
\t\tuv = cc * (1.0 + dot(cc, cc) * lens * 0.35) / (1.0 + 2.0 * lens * 0.35) * 0.5 + 0.5;
\t}
\tfloat d = abs(uv.y - focus);
\tfloat lod = smoothstep(0.06, 0.42, d) * tilt * 4.0;
\tvec3 c = textureLod(screen_tex, uv, lod).rgb;
\tif (grade > 0) { c = mix(c, clamp(grade_preset(c), 0.0, 1.0), grade_amount); }
\tif (lens > 0.0) { vec2 cc = SCREEN_UV * 2.0 - 1.0; c *= 1.0 - lens * smoothstep(0.6, 1.4, dot(cc, cc)) * 0.6; }
\tvec2 p = uv / SCREEN_PIXEL_SIZE;
${paperFile(str(v, 'surface.paperTex')) ? '\tif (paper_amt > 0.0) { c *= 1.0 + paper_amt * 0.3 * (paper_h(p) - 0.5); }' : '\tif (paper_amt > 0.0) { c *= 1.0 - paper_amt * 0.18 * (1.0 - vnoise(p / 2.6)); }'}
\tif (grain > 0.0) { c += (hash12(p + floor(TIME * 24.0) * 17.31) - 0.5) * grain * 0.13; }
\tif (crt) { c *= 0.75 + 0.25 * sin(p.y * 3.14159); }
\tc *= 1.0 - vignette * smoothstep(0.3, 0.85, length(uv - 0.5) * 1.35);
\tif (letterbox > 0.0) {
\t\tfloat asp = SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x;
\t\tif (letterbox > asp) { if (abs(SCREEN_UV.y - 0.5) > 0.5 * asp / letterbox) { c = vec3(0.0); } }
\t\telse if (abs(SCREEN_UV.x - 0.5) > 0.5 * letterbox / asp) { c = vec3(0.0); }
\t}
\tCOLOR = vec4(c, 1.0);
}
`;
}

const letterboxOf = (v: Values) => (str(v, 'camera.letterbox') === 'none' ? 0 : Number(str(v, 'camera.letterbox')));

/** 画幅黑边：post_overlay 已经画过，但录像带/压缩着色器在它之后，会把噪声画进黑边，所以最后再涂黑一次（网页版黑边在 OUTPUT 最后画） */
const LETTERBOX_TAIL = `\tif (letterbox > 0.0) {
\t\tfloat lb_asp = SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x;
\t\tif (letterbox > lb_asp) { if (abs(SCREEN_UV.y - 0.5) > 0.5 * lb_asp / letterbox) { c = vec3(0.0); } }
\t\telse if (abs(SCREEN_UV.x - 0.5) > 0.5 * letterbox / lb_asp) { c = vec3(0.0); }
\t}
`;

/** VHS 录像带：与网页版 passes.ts 的 VHS 同一组公式。网页版 y 轴向上，这里先把 SCREEN_UV、FRAGCOORD 翻过来再算 */
function vhsShader(v: Values): string | null {
  if (str(v, 'surface.screen') !== 'vhs') return null;
  return `// VHS 录像带：亮度和颜色分开处理（YIQ），颜色带宽窄 → 糊开并往右拖；行抖动、磁带慢晃、跟踪噪声带、磁头切换、掉磁白线、雪花
// 接在 post_overlay 之后；摄像机日期（Label）放在它之前，录像机字幕放在它之后（见 style_demo.gd）
// 颜色读屏幕纹理更粗的 mip 层，相当于网页版先把颜色预模糊到半分辨率
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float wear : hint_range(0.0, 1.0) = ${fl(num(v, 'surface.vhsWear'))};
uniform float tracking : hint_range(0.0, 1.0) = ${fl(num(v, 'surface.vhsTracking'))};
uniform bool interlace = ${bool(v, 'surface.vhsInterlace') ? 'true' : 'false'};
uniform float letterbox = ${fl(letterboxOf(v))};

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
\treturn mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y); }
vec3 rgb2yiq(vec3 c) { return vec3(dot(c, vec3(0.299, 0.587, 0.114)), dot(c, vec3(0.596, -0.274, -0.322)), dot(c, vec3(0.211, -0.523, 0.312))); }
vec3 yiq2rgb(vec3 c) { return vec3(c.x + 0.956 * c.y + 0.621 * c.z, c.x - 0.272 * c.y - 0.647 * c.z, c.x - 1.106 * c.y + 1.703 * c.z); }
// 传入的 uv 是 y 向上的坐标；亮度固定读第 0 层（逐行横移会让 GPU 误选模糊的 mip 层）
vec3 src(vec2 uv) { return clamp(textureLod(screen_tex, vec2(uv.x, 1.0 - uv.y), 0.0).rgb, 0.0, 1.0); }
vec3 src_c(vec2 uv, float lod) { return clamp(textureLod(screen_tex, vec2(uv.x, 1.0 - uv.y), lod).rgb, 0.0, 1.0); }

void fragment() {
\tvec2 res = 1.0 / SCREEN_PIXEL_SIZE;
\tvec2 uv0 = vec2(SCREEN_UV.x, 1.0 - SCREEN_UV.y);
\tvec2 fc = vec2(FRAGCOORD.x, res.y - FRAGCOORD.y);
\tfloat W = wear;
\tfloat T = tracking;
\tfloat fr = mod(floor(TIME * 29.97), 4096.0);
\tvec2 uv = uv0;
\tuv.y += (hash12(vec2(fr, 3.1)) - 0.5) * 0.006 * smoothstep(0.5, 1.0, T);
\tfloat ln = floor(uv.y * 240.0);
\tfloat line_h = max(1.0, floor(res.y / 480.0));
\t// 1 横向偏移：每行抖动 + 磁带慢晃 + 跟踪噪声带 + 底部磁头切换（uv.x 减小 = 画面内容往右移）
\tfloat dx = (hash12(vec2(ln, fr)) - 0.5) * (0.0006 + 0.0022 * W);
\tdx += (sin(uv.y * 5.0 + TIME * 1.1) * 0.6 + sin(uv.y * 21.0 - TIME * 2.3) * 0.4) * (0.0005 + 0.0016 * W + 0.002 * T);
\tfloat band_y = fract(0.8 - TIME * (0.025 + 0.05 * T));
\tfloat bd = abs(uv.y - band_y);
\tbd = min(bd, 1.0 - bd);
\tfloat band = (1.0 - smoothstep(0.0, mix(0.015, 0.11, T), bd)) * smoothstep(0.1, 0.4, T);
\tdx -= band * ((hash12(vec2(ln * 1.7, fr + 3.0)) - 0.5) * 0.05 + 0.012) * T;
\tfloat asp = res.x / res.y;
\tfloat yb = letterbox > asp ? 0.5 - 0.5 * asp / letterbox : 0.0;
\tfloat hs_h = mix(0.012, 0.04, max(W, T));
\tfloat hs = 1.0 - smoothstep(yb, yb + hs_h, uv.y);
\tdx -= hs * hs * (0.015 + 0.03 * hash12(vec2(fr, 7.0))) * (0.4 + 0.6 * max(W, T));
\tfloat field = mod(floor(fc.y / line_h), 2.0);
\tif (interlace) { dx += (field - 0.5) * 0.0012 * (0.5 + W); }
\tuv.x += dx;
\t// 2 亮度：小步长窄模糊 + 锐化过冲；步长超过 2 像素时每个取样拆成若干子取样铺满步长，细线不会变成一串重影
\tfloat ls = (0.7 + 1.6 * W) / 1280.0;
\tint n_sub = int(clamp(ceil(ls * res.x * 0.5), 1.0, 4.0));
\tfloat y0 = 0.0;
\tfloat yw = 0.0;
\tfloat wn = 0.0;
\tfloat ww = 0.0;
\tfor (int k = -6; k <= 6; k++) {
\t\tfloat fk = float(k);
\t\tfloat yy = 0.0;
\t\tfor (int j = 0; j < 4; j++) {
\t\t\tif (j >= n_sub) { break; }
\t\t\tfloat o = (float(j) + 0.5) / float(n_sub) - 0.5;
\t\t\tyy += rgb2yiq(src(uv + vec2((fk + o) * ls, 0.0))).x;
\t\t}
\t\tyy /= float(n_sub);
\t\tfloat wa = exp(-fk * fk / 6.0);
\t\tfloat wb = exp(-fk * fk / 24.0);
\t\ty0 += yy * wa;
\t\twn += wa;
\t\tyw += yy * wb;
\t\tww += wb;
\t}
\ty0 /= wn;
\tyw /= ww;
\tfloat Y = y0 + (y0 - yw) * (0.8 + 1.2 * W);
\t// 3 颜色：读粗 mip 层（预模糊）+ 宽模糊 + 色度延迟（往右拖）
\tfloat cs = (2.2 + 4.0 * W) / 640.0;
\tfloat cd = 0.0025 + 0.004 * W;
\tfloat clod = log2(max(1.0, cs * res.x));
\tvec2 iq = vec2(0.0);
\tfloat wc = 0.0;
\tfor (int k = -4; k <= 4; k++) {
\t\tfloat fk = float(k);
\t\tfloat w = exp(-fk * fk / 8.0);
\t\tiq += rgb2yiq(src_c(uv + vec2(fk * cs - cd, 0.0), clod)).yz * w;
\t\twc += w;
\t}
\tiq /= wc;
\tif (uv.x < 0.0 || uv.x > 1.0) { Y = 0.02; iq = vec2(0.0); }
\t// 4 黑位抬高、褪色、偏色（只加在亮处）、噪声
\tY = Y * (0.92 - 0.06 * W) + 0.035 + 0.02 * W;
\tiq *= 0.86 - 0.3 * W;
\tiq += vec2(0.012, 0.01) * (0.3 + W) * smoothstep(0.03, 0.4, Y);
\tiq += (vec2(vnoise(vec2(uv.x * 60.0, ln * 0.7 + fr * 13.0)), vnoise(vec2(uv.x * 60.0 + 17.0, ln * 0.7 - fr * 7.0))) - 0.5) * (0.015 + 0.08 * W);
\tfloat sw = (1.0 + 2.0 * W) * max(1.0, res.y / 540.0);
\tvec2 sn0 = vec2(floor(fc.x / sw), floor(fc.y / line_h));
\tY += (hash12(sn0 + fr * vec2(37.0, 17.0)) - 0.5) * (0.025 + 0.09 * W + 0.04 * T);
\tY += (vnoise(vec2(fc.x / 6.0, ln + fr * 31.0)) - 0.5) * 0.06 * W;
\t// 5 掉磁白线
\tfloat p_drop = W * (0.0005 + 0.012 * W * W);
\tif (hash12(vec2(ln * 0.37 + 11.0, fr)) < p_drop) {
\t\tfloat x0 = hash12(vec2(ln, fr + 5.0));
\t\tfloat len = 0.02 + 0.12 * hash12(vec2(fr, ln + 9.0));
\t\tfloat d = (uv0.x - x0) / len;
\t\tfloat da = smoothstep(0.0, 0.04, d) * clamp(1.0 - d, 0.0, 1.0);
\t\tY = mix(Y, 1.0, da * 0.9);
\t\tiq *= 1.0 - da;
\t}
\t// 6 跟踪噪声带里的白色碎横纹
\tif (band > 0.001) {
\t\tfloat seg = floor(uv0.x * (40.0 + 200.0 * hash12(vec2(ln, fr + 1.0))));
\t\tfloat sn = hash12(vec2(seg, ln + fr * 57.0));
\t\tfloat st = smoothstep(0.55, 0.95, sn) * band;
\t\tY = mix(Y, 0.7 + 0.3 * sn, st * (0.4 + 0.6 * T));
\t\tiq *= 1.0 - band * 0.7;
\t}
\t// 7 磁头切换区
\tif (hs > 0.001) {
\t\tY = mix(Y, hash12(sn0 + fr), hs * 0.25 * (0.4 + 0.6 * max(W, T)));
\t\tiq *= 1.0 - hs * 0.6;
\t}
\tvec3 c = clamp(yiq2rgb(vec3(Y, iq)), 0.0, 1.0);
\tif (interlace) { c *= 1.0 - field * 0.12; }
${num(v, 'surface.compression') > 0 ? '' : LETTERBOX_TAIL}\tCOLOR = vec4(c, 1.0);
}
`;
}

/** 数码压缩噪点：与网页版 passes.ts 的 COMPRESS 同一算法（4×4 低频 DCT 系数按频率量化 + 残差死区 + 4:2:0 颜色） */
function compressShader(v: Values): string | null {
  const amt = num(v, 'surface.compression');
  if (amt <= 0) return null;
  return `// 数码压缩噪点：每个 8×8 宏块求 4×4 个最低频 DCT 系数，频率越高量化台阶越大 → 渐变台阶、细纹理抹平、边缘旁跟着边走的振铃（蚊式噪声）
// 更细的细节小的丢掉、压得越狠硬边也越多丢掉；颜色 2×2 共用并向整块平均色靠拢；约每 2 秒一个"关键帧"
// 接在 VHS 与录像机字幕之后（像把录像翻录成低码率的数码视频）
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float amount : hint_range(0.0, 1.0) = ${fl(amt)};
uniform float letterbox = ${fl(letterboxOf(v))};
// KC[u * 8 + i] = cos(PI * (2i + 1) * u / 16)：8 点 DCT 的前 4 个基函数
const float KC[32] = float[](
\t1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
\t0.98079, 0.83147, 0.55557, 0.19509, -0.19509, -0.55557, -0.83147, -0.98079,
\t0.92388, 0.38268, -0.38268, -0.92388, -0.92388, -0.38268, 0.38268, 0.92388,
\t0.83147, -0.19509, -0.98079, -0.55557, 0.55557, 0.98079, 0.19509, -0.83147);

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 to_ycc(vec3 c) { float y = dot(c, vec3(0.299, 0.587, 0.114)); return vec3(y, (c.b - y) * 0.564, (c.r - y) * 0.713); }
vec3 from_ycc(vec3 c) { return vec3(c.x + 1.403 * c.z, c.x - 0.344 * c.y - 0.714 * c.z, c.x + 1.773 * c.y); }
float qnt(float x, float q) { return floor(x / q + 0.5) * q; }
vec4 qnt4(vec4 x, vec4 q, float o) { return floor(x / q + 0.5 + o) * q; }
// 一个取样格的平均色：4 个偏移 ±h 的双线性样本（与网页版 cellAvg 相同），避免只读到格子里的一个像素
vec3 cell_avg(vec2 c, float h, vec2 res) {
\tif (h < 0.375) { return texture(screen_tex, c / res).rgb; }
\treturn 0.25 * (texture(screen_tex, (c + vec2(-h, -h)) / res).rgb + texture(screen_tex, (c + vec2(h, -h)) / res).rgb
\t\t+ texture(screen_tex, (c + vec2(-h, h)) / res).rgb + texture(screen_tex, (c + vec2(h, h)) / res).rgb);
}

void fragment() {
\tvec2 res = 1.0 / SCREEN_PIXEL_SIZE;
\t// 宏块按"约 540 行的视频"换算：1080p 下 16 像素一块
\tfloat block = 8.0 * max(1.0, floor(res.y / 540.0 + 0.5));
\tfloat a = amount;
\tfloat s = block / 8.0;
\tvec2 px = FRAGCOORD.xy;
\tvec2 blk = floor(px / block);
\tvec2 bo = blk * block;
\tvec4 C0 = vec4(0.0);
\tvec4 C1 = vec4(0.0);
\tvec4 C2 = vec4(0.0);
\tvec4 C3 = vec4(0.0);
\tvec2 cdc = vec2(0.0);
\tfor (int j = 0; j < 8; j++) {
\t\tvec4 row = vec4(0.0);
\t\tfor (int i = 0; i < 8; i++) {
\t\t\tvec3 v = to_ycc(clamp(cell_avg(bo + (vec2(float(i), float(j)) + 0.5) * s, s * 0.25, res), 0.0, 1.0));
\t\t\trow += v.x * vec4(KC[i], KC[8 + i], KC[16 + i], KC[24 + i]);
\t\t\tcdc += v.yz;
\t\t}
\t\tC0 += row * KC[j];
\t\tC1 += row * KC[8 + j];
\t\tC2 += row * KC[16 + j];
\t\tC3 += row * KC[24 + j];
\t}
\tvec4 nu = vec4(8.0, 4.0, 4.0, 4.0);
\tC0 /= nu * 8.0;
\tC1 /= nu * 4.0;
\tC2 /= nu * 4.0;
\tC3 /= nu * 4.0;
\tcdc /= 64.0;
\tfloat gop = mod(floor(TIME * 0.5), 256.0);
\tfloat ko = (hash12(blk + gop * vec2(13.0, 7.0)) - 0.5) * 0.35;
\tfloat Q = mix(0.004, 0.075, a);
\tvec4 fu = vec4(0.0, 1.0, 2.0, 3.0);
\tvec4 q0 = qnt4(C0, Q * (1.0 + 0.8 * fu), ko);
\tvec4 q1 = qnt4(C1, Q * (1.8 + 0.8 * fu), ko);
\tvec4 q2 = qnt4(C2, Q * (2.6 + 0.8 * fu), ko);
\tvec4 q3 = qnt4(C3, Q * (3.4 + 0.8 * fu), ko);
\tfloat dq = 1.0 / mix(96.0, 12.0, pow(a, 0.8));
\tq0.x = floor(C0.x / dq + 0.5) * dq;
\tvec2 q = (px - bo) / s;
\tvec4 bx = cos(PI * fu * q.x / 8.0);
\tvec4 by = cos(PI * fu * q.y / 8.0);
\tfloat low_f = dot(C0 * by.x + C1 * by.y + C2 * by.z + C3 * by.w, bx);
\tfloat low_q = dot(q0 * by.x + q1 * by.y + q2 * by.z + q3 * by.w, bx);
\tvec3 oc = to_ycc(clamp(texture(screen_tex, SCREEN_UV).rgb, 0.0, 1.0));
\tfloat r = oc.x - low_f;
\tfloat dz = mix(0.004, 0.12, a);
\tfloat keep = smoothstep(dz, dz * 2.0, abs(r)) * (1.0 - 0.75 * smoothstep(0.15, 0.9, a));
\tfloat Y = low_q + qnt(r * keep, mix(0.002, 0.05, a));
\tfloat s2 = 2.0 * s;
\tvec2 c420 = to_ycc(clamp(cell_avg((floor(px / s2) + 0.5) * s2, s2 * 0.25, res), 0.0, 1.0)).yz;
\tvec2 C = mix(c420, cdc, smoothstep(0.25, 1.0, a) * 0.8);
\tfloat cq = 1.0 / mix(128.0, 14.0, a);
\tC = vec2(qnt(C.x, cq), qnt(C.y, cq));
\tvec3 c = clamp(from_ycc(vec3(Y, C)), 0.0, 1.0);
${LETTERBOX_TAIL}\tCOLOR = vec4(c, 1.0);
}
`;
}

const osdOn = (v: Values) => str(v, 'surface.osd') !== 'none';

/** 屏显时间码：Label 用的常量与函数（时钟由 _process 里累计的 t 推算，与网页版一样不读系统时间） */
function osdScript(v: Values): string {
  return `
# ---------- 屏显时间码（${labelOf('surface.osd', v)}） ----------
const OSD_MODE := "${str(v, 'surface.osd')}"
# 摄像机时钟从"时间"参数设定的时刻起算，日期固定从 1997-08-14 开始（与网页版一致）
const OSD_HOURS := ${fl(num(v, 'lighting.time'))}
const OSD_BASE_UNIX := 871516800
# 画幅黑边：字放在黑边以内
const OSD_LETTERBOX := ${fl(letterboxOf(v))}
const MONTHS := ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
var osd_left: Label
var osd_right: Label
var osd_fs := 0

func _osd_label(layer: CanvasLayer, color: Color) -> Label:
\tvar l := Label.new()
\t# 等宽字体 + 关闭抗锯齿，接近录像机点阵字；网页版用内置 5×7 点阵字
\tvar font := SystemFont.new()
\tfont.font_names = PackedStringArray(["Lucida Console", "DejaVu Sans Mono", "Courier New", "monospace"])
\tfont.font_weight = 700
\tfont.antialiasing = TextServer.FONT_ANTIALIASING_NONE
\tl.add_theme_font_override("font", font)
\tl.add_theme_color_override("font_color", color)
\tl.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
\tl.add_theme_constant_override("shadow_offset_x", 2)
\tl.add_theme_constant_override("shadow_offset_y", 2)
\tl.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tlayer.add_child(l)
\treturn l

func _build_osd() -> void:
\tvar layer := CanvasLayer.new()
\tadd_child(layer)
\tosd_left = _osd_label(layer, Color("#ff3030") if OSD_MODE == "rec" else Color("#f4f4f4"))
\tosd_right = _osd_label(layer, Color("#fff2c8") if OSD_MODE == "camcorder" else Color("#f4f4f4"))
\tosd_right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

func _update_osd(vp: Vector2) -> void:
\tvar sec := floori(t)
\t# 黑边以内的可见区域；字号按它算，窄画面也放得下
\tvar x0 := 0.0
\tvar y0 := 0.0
\tvar x1 := vp.x
\tvar y1 := vp.y
\tvar asp := vp.x / vp.y
\tif OSD_LETTERBOX > 0.0:
\t\tif OSD_LETTERBOX > asp:
\t\t\tvar py := (vp.y - vp.y * asp / OSD_LETTERBOX) * 0.5
\t\t\ty0 += py
\t\t\ty1 -= py
\t\telse:
\t\t\tvar px := (vp.x - vp.x * OSD_LETTERBOX / asp) * 0.5
\t\t\tx0 += px
\t\t\tx1 -= px
\tvar fs := maxi(10, roundi(minf((y1 - y0) * 0.058, (x1 - x0) * 0.045)))
\tif fs != osd_fs:
\t\tosd_fs = fs
\t\tosd_left.add_theme_font_size_override("font_size", fs)
\t\tosd_right.add_theme_font_size_override("font_size", fs)
\tvar counter := "%d:%02d:%02d" % [floori(sec / 3600.0), floori(sec / 60.0) % 60, sec % 60]
\tif OSD_MODE == "play":
\t\tosd_left.text = "PLAY ▶\\nSP"
\t\tosd_right.text = counter
\telif OSD_MODE == "rec":
\t\tosd_left.text = "● REC" if sec % 2 == 0 else "  REC"
\t\tosd_right.text = counter
\telse:
\t\tvar dt := Time.get_datetime_dict_from_unix_time(OSD_BASE_UNIX + floori(OSD_HOURS * 3600.0) + sec)
\t\tvar hh: int = dt["hour"]
\t\tvar h12 := hh % 12
\t\tif h12 == 0:
\t\t\th12 = 12
\t\tvar month: int = dt["month"]
\t\tosd_right.text = "%s %d:%02d:%02d\\n%s.%02d %d" % ["AM" if hh < 12 else "PM", h12, dt["minute"], dt["second"], MONTHS[month - 1], dt["day"], dt["year"]]
\tvar m := float(fs) * 0.9
\tosd_left.reset_size()
\tosd_right.reset_size()
\tosd_left.position = Vector2(x0 + m, y0 + m)
\tif OSD_MODE == "camcorder":
\t\tosd_right.position = Vector2(x1 - m - osd_right.size.x, y1 - m - osd_right.size.y)
\telse:
\t\tosd_right.position = Vector2(x1 - m - osd_right.size.x, y0 + m)
`;
}

function paletteScript(v: Values): string {
  const pal = getPalette(str(v, 'color.palette'));
  return `# 颜色角色表（${pal.name}）。场景里每个部件按角色取色。
extends RefCounted

const ROLES := {
${ROLES.map(([r, label]) => `\t"${r}": ${gdColor(pal.roles[r])}, # ${label}`).join('\n')}
}
`;
}

const bendOn = (v: Values) => str(v, 'world.curve') !== 'none';
const texOn = (v: Values) => str(v, 'material.texture') !== 'none';

/** 低清像素贴图：与网页版 glsl.ts 相同的程序图案与过滤（图案编号由 style_demo.gd 按颜色角色设置） */
function texGlsl(v: Values): string {
  if (!texOn(v)) return '';
  const mode = ['none', 'nearest', 'threePoint', 'bilinear'].indexOf(str(v, 'material.texture'));
  return `uniform int pattern = -1;
uniform int tex_mode = ${mode};
uniform float tex_scale = ${fl(num(v, 'material.texScale'))};
uniform float tex_amount = ${fl(num(v, 'material.texAmount'))};
uniform bool affine = ${bool(v, 'camera.affine') ? 'true' : 'false'};
varying vec2 tuv_p;
varying vec3 aff;
float hash_t(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float pattern_texel(int pat, vec2 q) {
\tq = mod(q, 32.0);
\tfloat n = hash_t(q + float(pat) * 37.0);
\tif (pat == 1) {
\t\tfloat row = floor(q.y / 8.0);
\t\tfloat x = q.x + (mod(row, 2.0) > 0.5 ? 8.0 : 0.0);
\t\tbool mortar = mod(q.y, 8.0) < 1.0 || mod(x, 16.0) < 1.0;
\t\treturn mortar ? 0.4 : 0.78 + 0.16 * hash_t(vec2(floor(x / 16.0), row)) + 0.08 * (n - 0.5);
\t}
\tif (pat == 2) {
\t\tfloat plank = floor(q.x / 8.0);
\t\tbool seam = mod(q.x, 8.0) < 1.0 || mod(q.y + plank * 11.0, 32.0) < 1.0;
\t\tfloat grain_t = 0.86 + 0.14 * hash_t(vec2(q.x, floor(q.y / 5.0)));
\t\treturn seam ? 0.45 : grain_t * (0.86 + 0.14 * hash_t(vec2(plank, 3.0)));
\t}
\tif (pat == 3) {
\t\tfloat r = mod(q.y, 6.0);
\t\tfloat x = q.x + (mod(floor(q.y / 6.0), 2.0) > 0.5 ? 3.0 : 0.0);
\t\treturn (r < 1.0 ? 0.5 : 0.74 + r * 0.05) * (mod(x, 6.0) < 1.0 ? 0.78 : 1.0);
\t}
\treturn 0.8 + 0.2 * n - (hash_t(floor(q / 2.0) + 5.0) > 0.86 ? 0.22 : 0.0);
}
float sample_pattern(int pat, vec2 p) {
\tif (tex_mode == 1) { return pattern_texel(pat, floor(p)); }
\tvec2 b = floor(p - 0.5);
\tvec2 f = p - 0.5 - b;
\tfloat A = pattern_texel(pat, b);
\tfloat B = pattern_texel(pat, b + vec2(1.0, 0.0));
\tfloat C = pattern_texel(pat, b + vec2(0.0, 1.0));
\tfloat D = pattern_texel(pat, b + vec2(1.0, 1.0));
\tif (tex_mode == 2) { return f.x + f.y < 1.0 ? A + f.x * (B - A) + f.y * (C - A) : D + (1.0 - f.x) * (C - D) + (1.0 - f.y) * (B - D); }
\treturn mix(mix(A, B, f.x), mix(C, D, f.x), f.y);
}
`;
}

/** 世界弯曲常量：与网页版相同的公式，焦点 = 镜头注视的原点 */
function bendGlsl(v: Values): string {
  if (!bendOn(v)) return '';
  const mode = str(v, 'world.curve') === 'sphere' ? 1 : 2;
  const ortho = str(v, 'camera.projection') === 'ortho';
  const fovY = 2 * Math.atan(24 / (2 * num(v, 'camera.fov')));
  const viewH = ortho ? 20 / Math.max(0.1, num(v, 'camera.zoom')) : 2 * Math.tan(fovY / 2) * 22;
  const yaw = (num(v, 'camera.azimuth') * Math.PI) / 180;
  const ax = -Math.sin(yaw), az = -Math.cos(yaw);
  const cx = mode === 2 ? -ax * viewH * 0.5 : 0, cz = mode === 2 ? -az * viewH * 0.5 : 0;
  return `const int BEND_MODE = ${mode};
const float BEND = ${fl((num(v, 'world.curveAmount') * 0.8) / viewH)};
const vec2 BEND_CENTER = vec2(${fl(cx)}, ${fl(cz)});
const vec2 BEND_AXIS = vec2(${fl(ax)}, ${fl(az)});
vec3 bend_world(vec3 wp) {
\tvec2 d = wp.xz - BEND_CENTER;
\tfloat ahead = max(dot(d, BEND_AXIS), 0.0);
\twp.y -= BEND * (BEND_MODE == 1 ? dot(d, d) : ahead * ahead);
\treturn wp;
}
`;
}

/** 局部彩色要保留颜色的角色（与网页版 GRADE 着色器里的判断一致） */
function keepRoles(v: Values): string[] {
  const mode = str(v, 'color.isolate');
  const acc = ['accent', 'flower', 'interactive', 'characterAccent', 'emissive'];
  const chr = ['character', 'characterAccent', 'skin', 'cloth'];
  if (mode === 'accent') return acc;
  if (mode === 'character') return chr;
  if (mode === 'both') return [...new Set([...acc, ...chr])];
  return [];
}

/** 景深：Godot 的 CameraAttributesPractical；焦点放在镜头注视点（与原工具的自动对焦一致） */
function dofBlock(v: Values, ortho: boolean): string {
  const dist = ortho ? 40 : 22;
  const fovY = (2 * Math.atan(24 / (2 * num(v, 'camera.fov'))));
  const viewH = ortho ? 20 / Math.max(0.1, num(v, 'camera.zoom')) : 2 * Math.tan(fovY / 2) * dist;
  const range = Math.max(0.2, viewH * num(v, 'camera.dofRange'));
  return `\tattrs.dof_blur_far_enabled = true
\tattrs.dof_blur_far_distance = ${fl(dist + range * 0.3)}
\tattrs.dof_blur_far_transition = ${fl(range)}
\tattrs.dof_blur_near_enabled = true
\tattrs.dof_blur_near_distance = ${fl(Math.max(0.1, dist - range * 0.3))}
\tattrs.dof_blur_near_transition = ${fl(range * 0.7)}
\tattrs.dof_blur_amount = ${fl(num(v, 'camera.dof') * 0.15)}
`;
}

/**
 * Godot 把 auto_exposure_min/max_sensitivity 换算成亮度：感光度 × (12.5 / 100) / exposure_sensitivity，
 * exposure_sensitivity 保持默认 100 时就是 感光度 ÷ 800（Godot 4.7.2 实测 775~784，与源码一致）
 */
const AE_ISO_PER_LUM = 800;
/** Godot 测光值 ÷ 网页版测光值的经验系数（场景越饱和、高光越多越大），见 autoExposureBlock */
const GODOT_METER_BIAS = 1.6;

/**
 * 自动曝光：Godot 内置（单一速度）。Godot 测的是整屏 max(R,G,B) 的算术平均（luminance_reduce.glsl），
 * 网页版测的是亮度（Rec.709）的对数平均：饱和色（天空、草地）和小块高亮会让 Godot 测得偏亮、曝光偏暗，
 * 不补偿时夜景开了自动曝光反而比不开更暗。所以目标亮度与上下限都乘一个经验系数 GODOT_METER_BIAS（实测夜景约 1.9、白天约 1.4，取 1.6）。
 * 目标亮度 → auto_exposure_scale；可补偿范围 → 用 min/max 感光度夹住测到的亮度。
 * 强度 < 1：Godot 没有"只补一部分"，用收窄可补偿范围近似（两端的最大补偿量一致，中间段补得更足）。
 * 速度：原工具变亮快、变暗慢（慢的是快的 0.35 倍），Godot 只有一个速度，取两者之间。
 */
function autoExposureBlock(v: Values): string {
  const s = num(v, 'color.autoExposure');
  const key = num(v, 'color.exposureKey');
  const ev = num(v, 'color.exposureRange') * s;
  const lo = key * Math.pow(2, -ev);
  const hi = key * Math.pow(2, ev);
  return `\t# 自动曝光：目标亮度 ${f(key, 2)}，最多补偿 ±${f(ev, 2)} 档（测到的亮度夹在 ${f(lo, 3)}~${f(hi, 3)}）
\tattrs.auto_exposure_enabled = true
\t# Godot 按 max(R,G,B) 测光、网页版按亮度：目标与上下限都乘 ${GODOT_METER_BIAS}（经验值；整体偏暗就调大，偏亮就调小）
\tattrs.auto_exposure_scale = ${fl(key * GODOT_METER_BIAS)}
\tattrs.auto_exposure_speed = ${fl(num(v, 'color.exposureSpeed') * 0.6)}
\tattrs.auto_exposure_min_sensitivity = ${fl(lo * GODOT_METER_BIAS * AE_ISO_PER_LUM)}
\tattrs.auto_exposure_max_sensitivity = ${fl(hi * GODOT_METER_BIAS * AE_ISO_PER_LUM)}
`;
}

/** 相机属性：景深与自动曝光共用一个 CameraAttributesPractical（Camera3D.attributes 只能挂一个） */
function cameraAttrsBlock(v: Values, ortho: boolean): string {
  const dof = num(v, 'camera.dof') > 0;
  const ae = num(v, 'color.autoExposure') > 0;
  if (!dof && !ae) return '';
  return `\tvar attrs := CameraAttributesPractical.new()
${dof ? dofBlock(v, ortho) : ''}${ae ? autoExposureBlock(v) : ''}\tcam.attributes = attrs
`;
}

function demoScript(v: Values, files: { edges: boolean; medium: boolean; quantize: boolean; overlay: boolean; godrays: boolean; vhs: boolean; compress: boolean; hud?: boolean }): string {
  const ortho = str(v, 'camera.projection') === 'ortho';
  const pitch = ({ iso: 35.264, dimetric: 30, high: 50, top: 88, low: 12, side: 2 } as Record<string, number>)[str(v, 'camera.angle')] ?? 35.264;
  const shadows = str(v, 'lighting.shadows');
  const tonemap = ({ none: 'Environment.TONE_MAPPER_LINEAR', neutral: 'Environment.TONE_MAPPER_LINEAR', aces: 'Environment.TONE_MAPPER_ACES', agx: 'Environment.TONE_MAPPER_AGX', reinhard: 'Environment.TONE_MAPPER_REINHARDT' } as Record<string, string>)[str(v, 'color.tonemap')];
  const fog = str(v, 'atmosphere.fog');
  const pal = getPalette(str(v, 'color.palette'));
  const sunAz = num(v, 'lighting.azimuth');
  const sunElev = Math.max(10, Math.sin(((num(v, 'lighting.time') - 6) / 12) * Math.PI) * 75);
  return `# 由游戏美术风格探索台生成：在空场景里搭测试台，接好相机、灯光、环境与后处理。
# 用法：把这个文件夹作为 Godot 4.x 工程打开，运行 main.tscn。
extends Node3D

const ArtPalette := preload("res://palette.gd")
const SURFACE := preload("res://art_style.gdshader")
const OUTLINE := preload("res://outline.gdshader")
${files.edges ? 'const POST_EDGES := preload("res://post_edges.gdshader")' : ''}
${files.medium ? 'const POST_MEDIUM := preload("res://post_medium.gdshader")' : ''}
${files.quantize ? 'const POST_QUANTIZE := preload("res://post_quantize.gdshader")' : ''}
${files.overlay ? 'const POST_OVERLAY := preload("res://post_overlay.gdshader")' : ''}
${files.godrays ? 'const POST_GODRAYS := preload("res://post_godrays.gdshader")' : ''}
${files.vhs ? 'const POST_VHS := preload("res://post_vhs.gdshader")' : ''}
${files.compress ? 'const POST_COMPRESS := preload("res://post_compress.gdshader")' : ''}

var outline_enabled := ${bool(v, 'lines.outline') ? 'true' : 'false'}
# 低清像素贴图：颜色角色 → 图案（0 泥土斑点 / 1 砖 / 2 木板 / 3 瓦），与网页版 patternOf() 一致
const PATTERN := {"structure": 1, "stone": 1, "wood": 2, "trim": 2, "trunk": 2, "roof": 3, "sand": 0, "grass": 0, "highland": 0, "rock": 0, "soil": 0, "path": 0, "snow": 0}
# 局部彩色：只有这些颜色角色保留颜色（空 = 不启用）
const KEEP_COLOR: Array[String] = [${keepRoles(v).map((r) => `"${r}"`).join(', ')}]
var shake := ${fl(num(v, 'camera.shake'))}
var world_dither := ${str(v, 'color.ditherAnchor') === 'world' && files.quantize ? 'true' : 'false'}
var cam_ref: Camera3D
var sun_ref: DirectionalLight3D
var quant_mat: ShaderMaterial
var godrays_mat: ShaderMaterial
var t := 0.0
${assetScriptHead(v)}${osdOn(v) ? osdScript(v) : ''}

func _ready() -> void:
\t_build_environment()
\t_build_light()
\tvar cam := _build_camera()
\t_build_props()
\t_build_post(cam)
${files.hud ? '\t# 游戏 UI 样本（ui/hud_sample.gd + ui/ui_theme.tres，见 ui/UI_MIGRATION.md）\n\tadd_child(load("res://ui/hud_sample.gd").new())\n' : ''}\t# 命令行加 -- --shot 时：渲染几帧后截图到 res://shot.png 并退出（用于对照网页画面）
\tif OS.get_cmdline_user_args().has("--shot"):
\t\tfor i in 20:
\t\t\tawait get_tree().process_frame
\t\tget_viewport().get_texture().get_image().save_png("res://shot.png")
\t\tget_tree().quit()

func make_material(role: String) -> ShaderMaterial:
\tvar m := ShaderMaterial.new()
\tm.shader = SURFACE
\tm.set_shader_parameter("albedo", ArtPalette.ROLES[role])
${texOn(v) ? '\tm.set_shader_parameter("pattern", PATTERN.get(role, -1))\n' : ''}${surfaceAssetsOn(v) || tamSurface(v) ? `\tm.set_shader_parameter("role_flags", ROLE_FLAGS.get(role, 0))
\t_bind_tex(m, ["detail_n", "detail_h", "cun_tex", "wear_tex", "cut_tex", "flower_tex", "tam_a", "tam_b"])
\tif sun_ref != null:
\t\tm.set_shader_parameter("sun_dir", sun_ref.global_transform.basis.z)
` : ''}\tvar line_col: Color = ArtPalette.ROLES[role]
\tif not KEEP_COLOR.is_empty() and not KEEP_COLOR.has(role):
\t\tm.set_shader_parameter("desaturate", ${fl(num(v, 'color.isolateAmount'))})
\t\tvar l := line_col.get_luminance()
\t\tline_col = line_col.lerp(Color(l, l, l), ${fl(num(v, 'color.isolateAmount'))})
\tif outline_enabled:
\t\tvar o := ShaderMaterial.new()
\t\to.shader = OUTLINE
\t\to.set_shader_parameter("albedo", line_col)
\t\tm.next_pass = o
\treturn m

func _add(mesh: Mesh, role: String, pos: Vector3, scl := Vector3.ONE) -> MeshInstance3D:
\tvar mi := MeshInstance3D.new()
\tmi.mesh = mesh
\tmi.material_override = make_material(role)
\tmi.position = pos
\tmi.scale = scl
\tadd_child(mi)
\treturn mi

func _build_props() -> void:
\tvar ground := PlaneMesh.new()
\tground.size = Vector2(24, 24)
\t# 细分地面：顶点着色器里的世界弯曲、波动等效果需要足够的顶点
\tground.subdivide_width = 48
\tground.subdivide_depth = 48
\t_add(ground, "grass", Vector3.ZERO)
\tvar trunk := CylinderMesh.new()
\ttrunk.top_radius = 0.12
\ttrunk.bottom_radius = 0.18
\ttrunk.height = 1.2
\tvar crown := SphereMesh.new()
\tcrown.radius = 0.8
\tcrown.height = 1.5
\tvar pine := CylinderMesh.new()
\tpine.top_radius = 0.02
\tpine.bottom_radius = 0.7
\tpine.height = 1.6
\tfor i in 7:
\t\tvar a := float(i) / 7.0 * TAU
\t\tvar p := Vector3(cos(a) * 6.0, 0.0, sin(a) * 6.0)
\t\t_add(trunk, "trunk", p + Vector3(0, 0.6, 0))
\t\tif i % 2 == 0:
\t\t\t_add(crown, "foliage", p + Vector3(0, 1.7, 0))
\t\telse:
\t\t\t_add(pine, "foliage2", p + Vector3(0, 1.8, 0))
\tvar box := BoxMesh.new()
\tbox.size = Vector3(2.2, 1.4, 1.8)
\t_add(box, "structure", Vector3(0, 0.7, -1.5))
\tvar roof := PrismMesh.new()
\troof.size = Vector3(2.6, 1.0, 2.1)
\t_add(roof, "roof", Vector3(0, 1.9, -1.5))
${characterScript(v)}
\tvar rock := SphereMesh.new()
\trock.radial_segments = 6
\trock.rings = 3
\t_add(rock, "rock", Vector3(-2.5, 0.3, 2.0), Vector3(1.0, 0.6, 0.8))

func _build_light() -> void:
\tvar sun := DirectionalLight3D.new()
\tsun.rotation_degrees = Vector3(-${f(sunElev, 1)}, ${f(sunAz, 1)}, 0)
\tsun.light_energy = ${fl(num(v, 'lighting.sun'))}
\tsun.shadow_enabled = ${shadows !== 'none' && shadows !== 'blob' ? 'true' : 'false'}
\t# 阴影软硬：项目设置 rendering/lights_and_shadows/directional_shadow/soft_shadow_filter_quality
\t# 原工具"${labelOf('lighting.shadows', v)}"${shadows === 'cel' ? '的阈值化在 art_style.gdshader 的 light() 里完成（quantize_shadow）' : ''}
\tsun.shadow_blur = ${shadows === 'hard' ? '0.0' : fl(num(v, 'lighting.shadowSoft') * 0.5)}
\tadd_child(sun)
\tsun_ref = sun

func _build_camera() -> Camera3D:
\tvar cam := Camera3D.new()
\tcam.projection = ${ortho ? 'Camera3D.PROJECTION_ORTHOGONAL' : 'Camera3D.PROJECTION_PERSPECTIVE'}
\t${ortho ? `cam.size = ${fl(20 / Math.max(0.1, num(v, 'camera.zoom')))}` : `cam.fov = ${f((2 * Math.atan(24 / (2 * num(v, 'camera.fov'))) * 180) / Math.PI, 1)}`}
\tvar pitch := deg_to_rad(${f(pitch, 3)})
\tvar yaw := deg_to_rad(${f(num(v, 'camera.azimuth'), 1)})
\tvar dir := Vector3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw))
\tcam.position = dir * ${ortho ? '40.0' : '22.0'}
\tcam.far = 400.0
\tadd_child(cam)
\tcam.look_at(Vector3.ZERO, Vector3.UP)
${cameraAttrsBlock(v, ortho)}\tcam_ref = cam
\treturn cam

func _build_environment() -> void:
\tvar env := Environment.new()
\tenv.background_mode = Environment.BG_COLOR
\tenv.background_color = ${gdColor(pal.roles.skyHorizon)}
\tenv.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
\tenv.ambient_light_color = ${gdColor(pal.roles.skyTop)}
\tenv.ambient_light_energy = ${fl(num(v, 'shading.ambient'))}
\tenv.tonemap_mode = ${tonemap}
\tenv.tonemap_exposure = ${fl(num(v, 'color.brightness'))}
\tenv.adjustment_enabled = true
\tenv.adjustment_saturation = ${fl(num(v, 'color.saturation'))}
\tenv.adjustment_contrast = ${fl(num(v, 'color.contrast'))}
\tenv.fog_enabled = ${fog !== 'none' ? 'true' : 'false'}
\tenv.fog_light_color = ${gdColor(pal.roles.skyHorizon)}
\t# 深度雾：从相机距离附近开始，模拟原工具按场景尺度设置的距离雾
\tenv.fog_mode = Environment.FOG_MODE_DEPTH
\tenv.fog_depth_begin = ${fl((ortho ? 34 : 16) + (1 - num(v, 'atmosphere.fogDensity')) * 14)}
\tenv.fog_depth_end = ${fl((ortho ? 60 : 42) + (1 - num(v, 'atmosphere.fogDensity')) * 30)}
\tenv.fog_density = 1.0
\tenv.fog_height_density = ${fog === 'height' ? fl(num(v, 'atmosphere.fogDensity')) : '0.0'}
\tenv.glow_enabled = ${num(v, 'camera.bloom') > 0 ? 'true' : 'false'}
\tenv.glow_intensity = ${fl(num(v, 'camera.bloom'))}
${num(v, 'lighting.ao') > 0 ? `\t# 缝隙暗部：Godot 的 SSAO 默认只压环境光；light_affect 让它也压直射光，接近原工具
\tenv.ssao_enabled = true
\tenv.ssao_intensity = ${fl(num(v, 'lighting.ao') * 2.5)}
\tenv.ssao_radius = ${fl(num(v, 'lighting.aoRadius'))}
\tenv.ssao_light_affect = ${fl(num(v, 'lighting.ao') * 0.6)}
` : ''}\tvar we := WorldEnvironment.new()
\twe.environment = env
\tadd_child(we)

# prio：几个全屏四边形读的是同一份屏幕拷贝，按 render_priority 依次叠：媒介（整屏覆盖）→ 内部线（ALPHA）→ 体积光（相加）
func _screen_quad(cam: Camera3D, shader: Shader, prio := 0) -> ShaderMaterial:
\tvar quad := MeshInstance3D.new()
\tvar qm := QuadMesh.new()
\tqm.size = Vector2(1, 1)
\tquad.mesh = qm
\tvar m := ShaderMaterial.new()
\tm.shader = shader
\tm.render_priority = prio
\tquad.material_override = m
\tquad.extra_cull_margin = 16384.0
\tcam.add_child(quad)
\treturn m

func _screen_rect(shader: Shader) -> ShaderMaterial:
\tvar layer := CanvasLayer.new()
\tvar rect := ColorRect.new()
\trect.set_anchors_preset(Control.PRESET_FULL_RECT)
\trect.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tvar m := ShaderMaterial.new()
\tm.shader = shader
\trect.material = m
\tlayer.add_child(rect)
\tadd_child(layer)
\treturn m

func _build_post(cam: Camera3D) -> void:
${files.medium ? '\tvar med := _screen_quad(cam, POST_MEDIUM, 0)\n\t_bind_tex(med, ["paper_tex", "tam_a", "tam_b"])\n' : ''}${files.edges ? '\t_screen_quad(cam, POST_EDGES, 1)\n' : ''}${files.godrays ? '\tgodrays_mat = _screen_quad(cam, POST_GODRAYS, 2)\n' : ''}${files.quantize ? '\tquant_mat = _screen_rect(POST_QUANTIZE)\n' : ''}${files.overlay ? '\tvar ov := _screen_rect(POST_OVERLAY)\n\t_bind_tex(ov, ["paper_tex"])\n' : ''}${str(v, 'surface.osd') === 'camcorder' ? '\t# 摄像机日期先画上去，再和画面一起经过录像带\n\t_build_osd()\n' : ''}${files.vhs ? '\t_screen_rect(POST_VHS)\n' : ''}${osdOn(v) && str(v, 'surface.osd') !== 'camcorder' ? '\t# 录像机字幕是播放机后加的：放在录像带之后，保持清晰\n\t_build_osd()\n' : ''}${files.compress ? '\t_screen_rect(POST_COMPRESS)\n' : ''}\tpass

func _process(delta: float) -> void:
\tt += delta
\tif cam_ref == null:
\t\treturn
${spriteProcess(v)}
\tvar vp := get_viewport().get_visible_rect().size
\t# 手持晃动：与原工具相同的几组正弦叠加
\tif shake > 0.0:
\t\tvar view_h := cam_ref.size if cam_ref.projection == Camera3D.PROJECTION_ORTHOGONAL else 20.0
\t\tvar amp := shake * view_h * 0.006
\t\tcam_ref.h_offset = (sin(t * 1.3) + sin(t * 2.9 + 2.0) * 0.5 + sin(t * 7.1) * 0.15) * amp
\t\tcam_ref.v_offset = (sin(t * 1.7 + 1.0) + sin(t * 3.7) * 0.4 + sin(t * 8.3 + 3.0) * 0.15) * amp
\t# 体积光：把太阳方向投到屏幕上
\tif godrays_mat != null and sun_ref != null:
\t\tvar to_sun := sun_ref.global_transform.basis.z
\t\tvar far_pt := cam_ref.global_position + to_sun * 1000.0
\t\tvar on := to_sun.y > 0.02 and not cam_ref.is_position_behind(far_pt)
\t\tvar suv := cam_ref.unproject_position(far_pt) / vp
\t\ton = on and abs(suv.x - 0.5) < 0.8 and abs(suv.y - 0.5) < 0.8
\t\tgodrays_mat.set_shader_parameter("sun_visible", on)
\t\tgodrays_mat.set_shader_parameter("sun_uv", suv)
\t# 世界稳定抖色：正交相机按平移量、透视相机按转角换算成像素偏移
\tif world_dither and quant_mat != null:
\t\tvar off := Vector2.ZERO
\t\tif cam_ref.projection == Camera3D.PROJECTION_ORTHOGONAL:
\t\t\tvar ppu := vp.y / cam_ref.size
\t\t\tvar b := cam_ref.global_transform.basis
\t\t\toff = Vector2(cam_ref.global_position.dot(b.x), -cam_ref.global_position.dot(b.y)) * ppu
\t\telse:
\t\t\tvar ppr := vp.y / (2.0 * tan(deg_to_rad(cam_ref.fov) * 0.5))
\t\t\toff = Vector2(-cam_ref.global_rotation.y, -cam_ref.global_rotation.x) * ppr
\t\tquant_mat.set_shader_parameter("anchor_offset", off)
${osdOn(v) ? '\t# 屏显时间码：按累计时间更新文字与位置\n\tif osd_left != null:\n\t\t_update_osd(vp)\n' : ''}${num(v, 'camera.pixelSize') > 1 ? `\t# 像素化 ${num(v, 'camera.pixelSize')} 倍：请把场景放进 SubViewport（尺寸 = 屏幕 / ${num(v, 'camera.pixelSize')}），再用 TextureRect（texture_filter = NEAREST）放大显示\n` : ''}`;
}

function migrationDoc(v: Values): string {
  const lines: string[] = ['# Godot 4 迁移说明', '', `生成时间：${new Date().toISOString()}`, '', '> 本包未在 Godot 编辑器里逐项人工核对；着色器可用 Godot 4.7 打开验证编译。下面逐项列出当前生效参数的迁移方式。', '', '| 维度 | 参数 | 当前值 | Godot 做法 | 难度 |', '|---|---|---|---|---|'];
  const LEVEL: Record<string, string> = { builtin: '直接对应', shader: '需写着色器', post: '需后处理', script: '需脚本', texture: '需素材 / 贴图', hard: '困难' };
  for (const p of allParams()) {
    if (uiIdle(p, v) || activeState(p, v) !== true) continue;
    const val = v[p.id] ?? p.default;
    const opt = p.kind === 'choice' ? optionOf(p, val) : undefined;
    const port = opt?.port ?? p.port;
    if (!port?.godot) continue;
    lines.push(`| ${p.dim} | ${p.label} | ${labelOf(p.id, v)} | ${port.godot.replace(/\|/g, '/')} | ${port.godotLevel ? LEVEL[port.godotLevel] : '—'} |`);
  }
  lines.push('', '## 已知差异', '- 原工具的"部件分界"内线依赖自定义角色缓冲；Godot 版只做深度 + 法线检测。', '- 低模网格做反向外壳描边时，需把平滑法线烘到 CUSTOM0 并在 outline.gdshader 里改用它。', '- 云影、脚下圆影、抽帧动画在本包里没有实现，可参照原工具的着色器补上。', '- 世界弯曲：Godot 的阴影 pass 也会运行 vertex()，所以投影跟着弯；网页版的阴影按平直世界计算。', '- 缝隙暗部用 Godot 内置 SSAO，景深用 CameraAttributesPractical：算法和原工具不同，强度已按经验换算，需目视微调。', '- 体积光束、调色预设、鱼眼、世界稳定抖色用与原工具相同的公式写在后处理里；世界稳定抖色在透视相机下用转角近似球面映射。', '- 程序化地形：用 FastNoiseLite 按"地貌"维度的参数生成高度，再用 SurfaceTool 建网格。', '- 全屏四边形叠加顺序：Godot 的几个 spatial 全屏四边形读的是同一份屏幕拷贝，所以按 render_priority 叠放：媒介整屏覆盖 → 内部线只画线（ALPHA）→ 体积光只加光（blend_add）。与原工具的差别：内部线的"随固有色"颜色取自上媒介之前的画面，体积光叠在媒介之上而不是被媒介一起画进去。');
  const tex = assetTextures(v);
  if (Object.keys(tex).length) {
    lines.push('', '## 素材纹理', '', '包里的 textures/ 是 AI 生成（或程序生成）的素材，来源、提示词和处理步骤登记在原工具的 src/content/assets.json。style_demo.gd 用 Image.load_from_file 直接读 PNG，正式项目里换成编辑器导入的纹理（法线图导入时选 Normal Map，并按 OpenGL 约定，绿 = 上）。', '');
    for (const [k, f] of Object.entries(tex)) lines.push(`- ${k}：textures/${f}`);
    lines.push('', '- 三平面取样（凹凸图案、皴法、剥落、剪纸）：与网页版同一组公式，按世界坐标从三个方向投影；侧面 v 取 -y，图片上方 = 世界上方。');
    if (str(v, 'material.cun') !== 'none') lines.push('- 皴法：网页版在光照之后压暗，Godot 版在固有色上压（光照再乘上去），背光处略浅；太阳方向由脚本写进 sun_dir。');
    if (str(v, 'material.papercut') !== 'none') lines.push('- 剪纸镂空用 discard：阴影 pass 里同样会镂空（Godot 的阴影也执行 fragment），网页版的阴影仍是实心的。');
    if (paperFile(str(v, 'surface.paperTex'))) lines.push('- 纸张素材：只迁移了纸纹的明暗起伏；牛皮纸、绢本这类彩色纸在网页版里还会替换纸色，Godot 版仍用色板纸色。');
  }
  if (str(v, 'surface.strokes') !== 'none') {
    lines.push('- 物体空间笔触（未自动迁移）：在 GDScript 里用 MeshDataTool 按三角形面积在静态网格表面撒点（位置、法线、随机数），放进 MultiMeshInstance3D（每实例一个 QuadMesh）；spatial 着色器在 vertex() 里把四边形沿"表面水平切线"的屏幕投影展开（长度 = 笔触大小 × 每米像素），读 hint_depth_texture 做遮挡剔除，fragment() 读 hint_screen_texture 取笔触中心的画面颜色，ALPHA = 笔刷图集的墨量。笔刷图集在原工具 public/assets/tex/brush_*.png，切图坐标在 assets.json 的 rects。');
  }
  if (str(v, 'shape.carrier') === 'puppet') {
    lines.push('- 纸片人（未自动迁移）：10 个部件 PNG 与关节点（top / bottom，部件 UV）在原工具 assets.json 的 paper_puppet_parts。做法：Node3D 层级（髋 → 躯干 → 颈 / 肩 → 肘；髋 → 膝），每个部件一个 Sprite3D（centered = false，offset 让关节点落在原点），整组每帧对齐相机朝向；走路时按相位转动各关节（摆幅见原工具 sprites.ts 的 pose()）。也可以用 Skeleton2D + Polygon2D 在 SubViewport 里做，再贴到 Sprite3D。');
  }
  const med = str(v, 'surface.medium');
  if (med === 'oil' || med === 'gouache' || med === 'watercolor') {
    if (str(v, 'surface.kuwahara') === 'anisotropic') {
      lines.push('- 各向异性 Kuwahara（笔触算法「顺着形体走」）：网页版先单独算结构张量、做两次分离高斯平滑并存进独立缓冲，再滤波；Godot 版在 post_medium.gdshader 一个 pass 里就地估算张量（5×5 格点 + 第 1 级 mip 预模糊 + 3×3 Sobel 高斯加权），方向场略粗，细小形体处的走向不如网页版准。');
      lines.push('- 颜色空间：Godot 的屏幕纹理是色调映射前的线性 HDR，网页版在调色后的 sRGB 上滤波。Godot 版取样时先开方做近似感知编码、滤波后平方还原，阈值大致对齐；暗部与高光处的扇区选择仍会与网页版略有差别。');
      if (num(v, 'surface.strokeFlow') > 0) lines.push('- 刷痕纹理（LIC）：网页版沿流线逐步重新查方向，会顺着轮廓弯；Godot 版沿中心像素的方向走直线，急弯处刷痕更直。两边的噪声都钉在屏幕像素上，镜头移动时刷痕相对物体滑动。');
      if (med === 'oil') lines.push('- 油画：Godot 版没有网页版的"厚涂起伏"光照（颜料脊），只有画布纹；刷痕只表现为明暗条纹。');
      lines.push('- 想与网页版完全一致（张量 → 平滑 → 滤波三步分开）：用 Compositor + CompositorEffect 写计算着色器，或把场景渲染进 SubViewport 后用 2~3 个 SubViewport 级联各 pass；BackBufferCopy 只能复制屏幕颜色，存不下独立的张量缓冲。');
    }
    if (num(v, 'surface.strokeDepth') > 0) lines.push('- 远景笔触化：按深度缓冲的线性深度缩放笔触；注视距离 focus_dist 按测试台相机写死，接入自己的相机后要每帧写入"相机到注视点的距离"。');
  }
  if (str(v, 'surface.screen') === 'vhs' || osdOn(v) || num(v, 'surface.compression') > 0) {
    lines.push(
      '- 录像带与压缩噪点：post_vhs.gdshader、post_compress.gdshader 与原工具同一组公式；顺序为 post_overlay → 摄像机日期 → post_vhs → 录像机字幕 → post_compress（与原工具一致：先录上带子，再翻录成数码视频）。',
      '- 录像带的颜色预模糊：原工具先横向模糊到半分辨率，Godot 版改读屏幕纹理的 mip 层（横竖一起模糊），颜色拖影略粗一些。',
      '- 画幅黑边：开了录像带或压缩噪点时，Godot 版只在最后一个后处理着色器（post_compress 或 post_vhs）里画黑边，录像带的横移与压缩的宏块处理的是完整画面；原工具也在输出时最后画黑边，结果一致。',
      '- Godot 的 TIME 默认每 3600 秒回绕一次，录像带和压缩的噪声图案会在那一刻跳一下。',
      '- 屏显时间码：Godot 版是 CanvasLayer + Label（系统等宽字体、关闭抗锯齿），原工具是内置 5×7 点阵字；内容、位置、颜色一致，字形不同。要完全一致可导入像素字体（FontFile）替换 SystemFont。',
      '- 压缩噪点只做单帧块效应；真实视频的帧间拖影、花屏没有实现。',
    );
  }
  if (num(v, 'color.autoExposure') > 0) {
    lines.push(
      '- 自动曝光用 Godot 内置（CameraAttributesPractical.auto_exposure_*，与景深共用同一个 Camera3D.attributes）。差异：Godot 只有整屏平均测光，没有中央重点 / 点测光；变亮变暗同一个速度；强度 < 1 用收窄补偿范围近似。',
      `- Godot 测的是整屏 max(R,G,B) 的算术平均（网页版是亮度的对数平均）：饱和的天空、草地和灯笼、霓虹这类小块高亮都会让 Godot 测得偏亮、曝光偏暗，不补偿时夜景开了自动曝光反而比不开更暗。导出时目标亮度和上下限都乘了经验系数 ${GODOT_METER_BIAS}，只能让方向一致，不能逐场景对齐：整体偏暗就调大 auto_exposure_scale，偏亮就调小。要完全一致，关掉内置自动曝光，用缩小的 SubViewport 测对数亮度，在脚本里改 CameraAttributes.exposure_multiplier。`,
      `- 感光度换算：亮度 = 感光度 ÷ ${AE_ISO_PER_LUM}（Godot 源码公式，前提是 exposure_sensitivity 保持默认 100；改了它要同比例改 min/max 感光度）。`,
      '- Godot 的辉光（glow）按自动曝光之后的亮度判断阈值（按 Godot 源码，未逐版本核对）：暗场景被提亮后，Godot 里发光体周围的辉光会比网页版多，必要时调高 glow_hdr_threshold。',
      '- 自动曝光会改变色板的最终颜色；Godot 里同样如此。色调映射用 Linear 时，提亮后的亮部会溢出成纯白。',
    );
  }
  return lines.join('\n');
}

/**
 * 游戏 UI 的拉伸（M12a-05）：探索台的 HUD 按 960 × 540 的设计画布（= 1080p 的一半）排版、整张按画面缩放，
 * 这里给 Godot 同一套：canvas_items + expand、基准 960 × 540（竖屏 540 × 960），主题里的尺寸是设计单位（px@1080p ÷ 2）。
 * 窗口仍开成原来的 1152 × 648。3D 画面按窗口分辨率渲染，不受影响
 */
function hudDisplay(th: Theme): string {
  const portrait = th.r.str('ctx.orientation', 'landscape') === 'portrait';
  const [w, h] = portrait ? [540, 960] : [960, 540];
  const [ow, oh] = portrait ? [648, 1152] : [1152, 648];
  return `\n[display]\n\nwindow/size/viewport_width=${w}\nwindow/size/viewport_height=${h}\nwindow/size/window_width_override=${ow}\nwindow/size/window_height_override=${oh}\nwindow/stretch/mode="canvas_items"\nwindow/stretch/aspect="expand"\n${portrait ? 'window/handheld/orientation=1\n' : ''}`;
}

export function godotPackage(v: Values): GodotFile[] {
  const files: GodotFile[] = [];
  const edges = str(v, 'lines.edges') !== 'none';
  const medium = mediumShader(v);
  const quant = quantizeShader(v);
  const overlay = overlayShader(v);
  const godrays = godraysShader(v);
  const vhs = vhsShader(v);
  const compress = compressShader(v);
  const ui = godotUiFiles(v);
  files.push({ path: 'project.godot', text: `config_version=5\n\n[application]\n\nconfig/name="Art Style Export"\nrun/main_scene="res://main.tscn"\nconfig/features=PackedStringArray("4.7", "Forward Plus")\n${ui ? hudDisplay(ui.theme) : ''}\n[rendering]\n\nrenderer/rendering_method="forward_plus"\n` });
  files.push({ path: 'main.tscn', text: `[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="res://style_demo.gd" id="1"]\n\n[node name="Main" type="Node3D"]\nscript = ExtResource("1")\n` });
  files.push({ path: 'art_style.gdshader', text: surfaceShader(v) });
  files.push({ path: 'outline.gdshader', text: outlineShader(v) });
  if (edges) files.push({ path: 'post_edges.gdshader', text: edgesShader(v) });
  if (medium) files.push({ path: 'post_medium.gdshader', text: medium });
  if (quant) files.push({ path: 'post_quantize.gdshader', text: quant });
  if (overlay) files.push({ path: 'post_overlay.gdshader', text: overlay });
  if (godrays) files.push({ path: 'post_godrays.gdshader', text: godrays });
  if (vhs) files.push({ path: 'post_vhs.gdshader', text: vhs });
  if (compress) files.push({ path: 'post_compress.gdshader', text: compress });
  files.push({ path: 'palette.gd', text: paletteScript(v) });
  files.push({ path: 'style_demo.gd', text: demoScript(v, { edges, medium: !!medium, quantize: !!quant, overlay: !!overlay, godrays: !!godrays, vhs: !!vhs, compress: !!compress, hud: !!ui }) });
  // UI 位图外框（ui/tex/）由主题 .tres 的 ext_resource 引用，和 textures/ 的运行时读文件不同，要先导入
  const uiTex = !!ui?.files.some((x) => x.asset);
  files.push({ path: 'MIGRATION.md', text: migrationDoc(v) + (ui ? `\n\n## 游戏 UI\n\n见 ui/UI_MIGRATION.md：Theme 资源、字体、示例 HUD 与每个 token 的迁移难度。\n${uiTex ? '\nUI 外框用了位图素材（ui/tex/，主题 ui_theme.tres 以 ext_resource 引用）：先用编辑器打开一次工程让它导入（或 `godot --headless --path . --import`），再命令行运行，否则主题加载失败。\n' : ''}` : '') });
  if (ui) files.push(...ui.files);
  for (const f of new Set(Object.values(assetTextures(v)))) files.push({ path: `textures/${f}`, text: '', asset: f });
  return files;
}
