"""把素材表、本地处理结果与生成记录合并成 src/content/assets.json（引擎与界面读取的素材登记表）。

用法：python -I scripts/assets/register.py
每条素材记录：来源（类型、模型、参数、日期、提示词）、原图、处理后的文件与指标、用在哪些参数上、已知局限、许可。
新增素材时在 ENTRIES 里加一条（处理结果在 public/assets/tex/<id>.json），再重跑本脚本。

数据来源：
  - ENTRIES / PROCEDURAL（本文件）：标签、类别、用途、提示词、处理说明、局限；
  - public/assets/tex/<id>.json（process.py / process_ui.py 写出）：files 与 meta；
  - 生成记录 assets/generated/ledger.json、UI 提示词 assets/generated/ui-batches.json、原图 assets/generated/raw/：
    只在作者本地，不随仓库发布。登记表只写公开的模型名和通用参数，生成记录里的其他字段不写进去。
没有本地生成记录时（刚克隆的仓库），本地数据覆盖不到的条目沿用现有 assets.json 里的来源、原图、批次与许可，
不会改标成程序生成；找不到来源的新条目直接报错。不是 AI 生成的图在 ENTRIES 里直接写 source 与 license（见 ENTRIES 上方）。
环境变量 GAE_ASSET_LEDGER / GAE_ASSET_UI_BATCHES 可以改这两个文件的路径（指向不存在的文件即可模拟刚克隆的仓库）。
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = Path(os.environ.get("GAE_ASSET_LEDGER") or ROOT / "assets" / "generated" / "ledger.json")
TEX = ROOT / "public" / "assets" / "tex"
OUT = ROOT / "src" / "content" / "assets.json"

DATE = "2026-10-13"
LICENSE = "AI 生成（gpt-image-2 等外部图像模型），随本项目以 CC0 1.0 发布"
PROCEDURAL_LICENSE = "程序生成（scripts/assets/process.py），随本项目以 CC0 1.0 发布"

# 登记表里 source 可用的字段与来源类型（与 src/content/assets.ts 的 AssetSource 一致）
SOURCE_KEYS = ("service", "tool", "params", "date", "prompt", "script", "author", "url")
SERVICES = ("ai", "procedural", "manual", "third-party")
# 生成记录里的模型统一成小写、连字符后，必须是这里的公开模型名，否则报错（不把未知写法写进登记表）
MODELS = ("gpt-image-2",)
QUALITY = ("low", "medium", "high", "auto")
FORMATS = {"png": "PNG", "jpg": "JPEG", "jpeg": "JPEG", "webp": "WebP"}

# id → 标签、类别、用途、提示词、局限。AI 生成的条目，来源从本地生成记录里取。
# 不是 AI 生成的图（自己画的、第三方 CC0 图片）没有生成记录，在条目里直接写来源与许可（也可加 raw、batch），例如：
#   "my_paper": dict(label="手抄纸", kind="paper", usedBy=["surface.paperTex"], process="同牛皮纸", limits="",
#       source=dict(service="manual", author="作者名", date="2026-11-06"),
#       license="作者自绘，随本项目以 CC0 1.0 发布"),
# 第三方图片写 source=dict(service="third-party", author="原作者", url="原始页面", date="取得日期")，
# license 写原图的许可（只收 CC0 或同等宽松的许可）。
ENTRIES = {
    "xuan_paper": dict(label="宣纸", kind="paper", usedBy=["surface.paperTex"],
        prompt="Flat top-down scan of a sheet of raw Chinese xuan paper (rice paper), filling the entire frame edge to edge. Visible long soft plant fibers and short fiber flecks, subtle cloudy variations in pulp density, very faint mottling, warm off-white tone. Perfectly even shadowless lighting, no vignette, no folds, no creases, no sheet edges, no ink, no objects, no text, no seal. Seamless tileable texture with uniform detail density across the whole image.",
        process="去大尺度明暗 → 灰度 → 缩到 1024 → 偏移半格方差保持混合（去缝）→ 拉满色阶",
        limits="只存明暗起伏（颜色来自色板纸色）"),
    "watercolor_cold": dict(label="冷压水彩纸", kind="paper", usedBy=["surface.paperTex"],
        prompt="Flat top-down macro scan of cold-press (NOT surface) 300gsm watercolor paper, pure white, filling the entire frame. Pronounced irregular tooth: soft rounded hills and valleys of varying size, read only as gentle grey shading under perfectly even diffuse light. No paint, no pigment, no vignette, no sheet edges, no shadows cast by objects, no text. Seamless tileable texture, uniform detail density across the whole image.",
        process="同宣纸；另由高度图按 Sobel 生成可平铺法线（OpenGL 约定）",
        limits="高度来自照片明暗，不是真实测量的起伏"),
    "watercolor_hot": dict(label="热压水彩纸", kind="paper", usedBy=["surface.paperTex"],
        prompt="Flat top-down macro scan of hot-press watercolor paper, pure white, filling the entire frame. Smooth surface with very fine, subtle grain and faint felt-blanket marks, barely visible soft grey variation under perfectly even diffuse light. No paint, no pigment, no vignette, no sheet edges, no text. Seamless tileable texture, uniform detail density across the whole image.",
        process="同冷压水彩纸", limits=""),
    "kraft_paper": dict(label="牛皮纸", kind="paper", usedBy=["surface.paperTex"],
        prompt="Flat top-down scan of plain brown kraft paper filling the entire frame edge to edge. Visible short fibers, small dark speckles and lighter flecks, gentle irregular color variation, matte surface. Perfectly even shadowless lighting, no folds, no creases, no wrinkles, no sheet edges, no vignette, no text, no stamps. Seamless tileable texture with uniform detail density across the whole image.",
        process="去大尺度明暗 → 缩到 1024 → 去缝（保留颜色）", limits="彩色纸：纸色混入时用纸本身的颜色代替色板纸色"),
    "silk_juan": dict(label="绢本", kind="paper", usedBy=["surface.paperTex"],
        prompt="Flat top-down scan of aged plain-weave silk painting ground (juan, the silk used for Chinese gongbi painting), filling the entire frame. Warm pale tan to light ochre tone, a fine regular warp-and-weft weave visible at close scale, subtle uneven toning and soft faded age stains. No painting, no ink, no figures, no text, no seals, no edges, no vignette, perfectly even lighting. Seamless tileable texture with uniform detail density across the whole image.",
        process="同牛皮纸", limits="原图偏橙；纸色混入低时只取明暗"),
    "brush_strokes_a": dict(label="毛笔长笔触 8 种", kind="stroke-atlas", usedBy=["surface.strokes"],
        prompt="Reference sheet of 8 isolated Chinese calligraphy brush strokes in black sumi ink on pure flat white paper, laid out as 2 columns by 4 rows with generous white space around each stroke so that no strokes touch or overlap. Every stroke is a single roughly horizontal stroke with a different start and finish: 1) blunt hidden-tip start with rounded end, 2) sharp exposed-tip start tapering to a point, 3) heavy press then lift to thin, 4) thin start swelling to a heavy end, 5) dry brush with flying-white streaks (feibai), 6) wet stroke with soft blooming edges, 7) slightly curved stroke with a hooked end, 8) broken dry stroke made with the side of the brush. Pure white background, no text, no labels, no numbers, no seals, no shadows, no paper texture.",
        process="1 − 亮度得墨量 → 连通域切出每一笔 → 等比放进 2×4 格（每格 512×256）",
        limits="笔触都是横向的；按笔触方向旋转使用"),
    "brush_marks_b": dict(label="短笔点 16 种", kind="stroke-atlas", usedBy=["surface.strokes"],
        prompt="Reference sheet of 16 isolated Chinese ink-painting brush marks in black and grey sumi ink on pure flat white paper, laid out as a 4 by 4 grid with generous white space around each mark so that no marks touch or overlap. Include a variety of short marks: round dots, elongated horizontal dots, leaf-shaped strokes, short vertical strokes, a comma-like stroke, a dry scumbled patch, a wet grey wash blot with a darker rim, a split-brush mark, small moss dots cluster, a bamboo-leaf stroke, a short hook, a pale wet dab, a textured dry dab, a thick blunt dab, a thin flick, a tapered drop.",
        process="同长笔触，4×4 格（每格 256×256）", limits=""),
    "cun_pima": dict(label="披麻皴", kind="cun", usedBy=["material.cun"],
        prompt="Seamless tileable monochrome texture of Chinese landscape painting \"hemp-fiber\" texture strokes (pima cun): long, soft, slightly wavy, roughly parallel lines in light-to-mid grey ink with a few darker accents, flowing mostly vertically and evenly distributed over the whole frame, as used to model earthen mountain slopes in Dong Yuan and Huang Gongwang paintings. Pure white paper between strokes. No mountain outlines, no composition, no trees, no text, no seals; only the stroke texture uniformly filling the frame.",
        process="反相（白 = 墨）→ 去缝 → 拉满色阶", limits="平铺纹理，皴笔不随山形走势变化"),
    "cun_fupi": dict(label="斧劈皴", kind="cun", usedBy=["material.cun"],
        prompt="Seamless tileable monochrome texture of Chinese landscape painting \"axe-cut\" texture strokes (fupi cun): short, angular, broad wedge-shaped strokes made with the side of the brush, mid-to-dark grey ink with dry broken edges, slanting diagonally, overlapping in layers and evenly distributed over the whole frame, as used for rocky cliffs in Li Tang and Ma Yuan paintings. Pure white paper between strokes. No mountain outlines, no composition, no trees, no text, no seals; only the stroke texture uniformly filling the frame.",
        process="同披麻皴", limits="同披麻皴"),
    "cun_midian": dict(label="米点皴", kind="cun", usedBy=["material.cun"],
        prompt="Seamless tileable monochrome texture of Chinese landscape painting \"Mi dots\" (midian cun): horizontally elongated soft ink dots laid wet-on-wet in several grey tones from pale to dark, overlapping in loose horizontal bands, evenly scattered over the whole frame, as in the misty hills of Mi Fu and Mi Youren. Pure white paper between dots. No mountain outlines, no composition, no trees, no text, no seals; only the dot texture uniformly filling the frame.",
        process="同披麻皴", limits="同披麻皴"),
    "clay_fingerprint": dict(label="黏土指纹", kind="detail", usedBy=["material.detail"],
        prompt="Grayscale height map (displacement map) of a hand-sculpted modeling clay / plasticine surface viewed straight on: fingerprint ridges and smudges, small sculpting-tool marks, shallow thumb presses and gentle irregular dents, distributed evenly. White = raised, black = recessed, mid grey = base surface. No lighting, no shading, no specular highlights, no color, no edges. Seamless tileable texture filling the entire frame with uniform detail density.",
        process="去大尺度明暗 → 去缝 → 高度图 → Sobel 法线（强度 4）", limits="模型画成了打光的黏土照片，用明暗当高度，凹凸方向可能有少量反转"),
    "knit_wool": dict(label="针织（平针）", kind="detail", usedBy=["material.detail"],
        prompt="Grayscale height map (displacement map) of stockinette knitted chunky wool fabric viewed straight on: rows of V-shaped knit stitches in a perfectly regular grid, exactly 8 stitches across and 12 rows down, slightly fuzzy yarn fibers. White = raised yarn, black = gaps between stitches. No lighting, no shading, no color, no edges. Seamless tileable texture filling the entire frame.",
        process="按自相关找出针脚周期（横 256、竖约 164 像素），裁成整数个周期再缩放，不做混合（混合会把针脚错位糊掉）",
        limits="实际是 8 针 × 11 行，不是提示词要求的 12 行；裁切后纵向拉伸约 13%"),
    "peel_mask": dict(label="剥落做旧", kind="field", usedBy=["material.weathering"],
        prompt="Pure black-and-white mask texture of weathering: peeling, flaking old paint and plaster. White = intact paint layer, black = exposed underlayer. Irregular chips, flakes, hairline cracks and worn patches clustered in some areas and sparse in others, about 35 percent black coverage overall, crisp edges, flat 2-tone only. No shading, no grey gradients, no color, no objects, no text. Seamless tileable texture filling the entire frame.",
        process="二值遮罩 → 环绕距离场（剥落区 0、完好区越远越接近 1、边界 = 0.5）+ 细噪声；做旧程度截取这个场，剥落从现有斑块向外扩",
        limits="原图剥落覆盖约 21%（提示词要求 35%）；做旧程度 0.5 对应原图"),
    "pixel_walk_32": dict(label="像素角色 A（SNES 16 色）", kind="sprite-sheet", usedBy=["shape.carrier"],
        prompt="Pixel art sprite sheet for a top-down RPG: a small young traveler wearing a conical straw hat, blue tunic, brown trousers and a small backpack. Exactly 4 rows by 4 columns of frames on an invisible uniform grid, every frame the same size with the character centered in it: row 1 walking toward the viewer (down), row 2 walking left, row 3 walking right, row 4 walking away (up); each row is a 4-frame walk cycle. Authentic 32x32-pixel sprites upscaled with hard square nearest-neighbour pixels, no anti-aliasing, no blur, 1-pixel dark outline, limited palette of about 16 colors, 3/4 top-down view like classic SNES RPGs. Flat solid pure magenta #FF00FF background everywhere, no grid lines, no text, no shadows, identical character design in every frame.",
        process="品红差值抠像 → 颜色跳变自相关测出真实像素尺寸（9.75 屏幕像素 = 1 像素）与相位 → 每个大像素取中心中位色 → 16 帧统一量化到 16 色 → 48×48 一格、脚底对齐",
        limits="模型没按 32 像素画：实际约 28×40 像素；帧间腿部变化小"),
    "pixel_walk_64": dict(label="像素角色 B（HD-2D 细明暗）", kind="sprite-sheet", usedBy=["shape.carrier"],
        prompt="Pixel art sprite sheet in HD-2D style (like Octopath Traveler): a young traveler wearing a conical straw hat, blue tunic, brown trousers and a small backpack. Exactly 4 rows by 4 columns of frames on an invisible uniform grid, every frame the same size with the character centered in it: row 1 walking toward the viewer (down), row 2 walking left, row 3 walking right, row 4 walking away (up); each row is a 4-frame walk cycle. Authentic 64x64-pixel sprites upscaled with hard square nearest-neighbour pixels, no anti-aliasing, no blur, dark outline, palette of about 24 colors with soft pixel shading, 3/4 top-down view. Flat solid pure magenta #FF00FF background everywhere, no grid lines, no text, no shadows, identical character design in every frame.",
        process="同 A，量化到 24 色",
        limits="提示词要 64 像素，实际约 25×41 像素（和 A 一样小），区别只在明暗层次"),
    "paper_puppet_parts": dict(label="纸片人分件（10 件）", kind="puppet", usedBy=["shape.carrier"],
        prompt="Character parts for 2D cut-out (paper puppet) animation, laid out separately and spaced well apart on a flat pure white background: a young traveler in side view facing right, wearing a conical straw hat, blue tunic and brown trousers. Separate pieces: head with hat, torso with tunic, two upper arms, two forearms with hands, two thighs, two shins with feet. No piece touches another. Joint ends are rounded with extra overlap for pivoting. Style: gouache painted on textured card, visible hand-cut edges with a thin white paper border around every piece. Do not show the assembled figure. No text, no labels, no shadows.",
        process="与图像边缘连通的近白像素为背景（纸边约 243 保留）→ 每块只留自己的连通域 → 按原图位置标注部件名 → 算出上下关节点（最上 / 最下 10% 像素的质心）",
        limits="只有侧面（朝右），朝左时水平翻转；没有正面与背面"),
    "jianzhi_window": dict(label="窗花（团花）", kind="mask", usedBy=["material.papercut"],
        prompt="A single Chinese paper-cut window flower (chuanghua): solid flat red paper cut into a circular, radially symmetric design with a peony in the center, surrounded by auspicious clouds, plum blossoms and fine lattice cutwork, shown perfectly flat and straight-on on a pure white background, centered with margin around it. Crisp cut edges, solid uniform red, no shading, no paper texture, no shadows, no text, no other objects.",
        process="红度 = R − (G+B)/2 → 遮罩（白 = 纸）", limits="颜色交给色板的强调色"),
    "jianzhi_lattice": dict(label="冰裂梅花剪纸（可平铺）", kind="mask", usedBy=["material.papercut"],
        prompt="Seamless tileable pattern of Chinese red paper-cut: an all-over repeating lattice of ice-crack (bingliewen) lines with small plum blossoms inside the cells, solid flat red paper with the cut-out holes showing pure white background, crisp edges, consistent line width, straight-on flat view. No shading, no paper texture, no shadows, no text. The pattern fills the entire frame edge to edge with uniform density.",
        process="红度遮罩 → 原图左右已无缝；上下找与顶边最吻合的裁切高度后缩放", limits="上下接缝处冰裂线有轻微错位"),
    "fx_smoke": dict(label="2D 烟雾 8 帧", kind="flipbook", usedBy=["motion.fx2d"],
        prompt="2D hand-drawn anime-style effect animation sprite sheet of a puff of smoke: exactly 8 frames on a 4-column by 2-row grid of equal cells, read left to right then top to bottom: small burst, expanding billows, larger billows, peak size, breaking apart, thinning wisps, faint wisps, almost gone. Cel-shaded with 3 flat tones of warm grey and white and a clean dark-grey outline, like Japanese game and Ghibli effects animation. Each frame centered in its cell and not touching its neighbours. Flat solid pure magenta #FF00FF background everywhere, no grid lines, no text.",
        process="品红差值抠像（min(R,B)−G，浅灰不会被误抠）+ 去溢色 → 每格按行的内容中心裁方 → 预乘缩到 256", limits=""),
    "fx_explosion": dict(label="2D 爆炸 8 帧", kind="flipbook", usedBy=["motion.fx2d"],
        prompt="2D hand-drawn anime-style effect animation sprite sheet of a fiery explosion: exactly 8 frames on a 4-column by 2-row grid of equal cells, read left to right then top to bottom: bright flash, small fireball, expanding fireball with sparks, peak fireball, fire turning into dark smoke, smoke billowing, smoke dispersing, last embers fading. Cel-shaded with flat yellow, orange, red and dark brown-grey smoke tones and a bold dark outline, like Japanese game effects animation. Each frame centered in its cell and not touching its neighbours. Flat solid pure magenta #FF00FF background everywhere, no grid lines, no text.",
        process="同烟雾", limits=""),
    "fx_slash": dict(label="2D 刀光 8 帧", kind="flipbook", usedBy=["motion.fx2d"],
        prompt="2D hand-drawn anime-style effect animation sprite sheet of a sword slash: exactly 8 frames on a 4-column by 2-row grid of equal cells, read left to right then top to bottom: thin starting streak, growing crescent arc, full wide crescent swoosh with speed lines, arc at full strength, arc thinning, arc breaking into sparkles, scattered sparkles, last fading sparkles. White core with cyan-blue glow edges, flat cel-shaded tones, crisp shapes, like Japanese action game effects animation. Each frame centered in its cell and not touching its neighbours. Flat solid pure magenta #FF00FF background everywhere, no grid lines, no text, no character, no sword.",
        process="同烟雾", limits=""),
}

PROCEDURAL = {
    "tam": dict(label="色调排线图 TAM（6 级）", kind="tam", usedBy=["shading.hatchTex"],
        process="Praun et al. 2001：逐级加笔画，暗一级包含亮一级的全部笔画；1–3 级横向、4–6 级加竖向交叉；6 级拆成两张 RGB",
        limits="笔画是程序画的直线，没有手绘抖动"),
}


# M11① / M11② 游戏 UI 素材（2026-10-14）：提示词在 assets/generated/ui-batches.json，处理在 scripts/assets/process_ui.py
UI_BATCHES = Path(os.environ.get("GAE_ASSET_UI_BATCHES") or ROOT / "assets" / "generated" / "ui-batches.json")
UI_KIND = {"ui_frame_": ("ui-frame", ["ast.frame", "ast.frameMat"]), "ui_ornament_": ("ui-ornament", ["ast.ornaments"]), "ui_ribbons": ("ui-ribbon", ["cmp.plate"]),
           "ui_icons_": ("ui-icons", ["ast.iconSet", "vis.iconStyle"]), "ui_char_": ("ui-character", ["cnt.characterMedium"]),
           "ui_keyart": ("ui-backdrop", ["ast.bgArt"]), "ui_scene_": ("ui-backdrop", ["ast.bgArt"]), "ui_desk": ("ui-container", ["ast.container"]),
           "ui_clue_wall": ("ui-container", ["ast.container"]), "ui_counter": ("ui-container", ["ast.container"]), "ui_badges": ("ui-badges", ["cmp.badge"]),
           "ui_empty_states": ("ui-empty", ["st.emptySlot"]), "ui_map_": ("ui-map", ["vis.mapStyle"]), "ui_calligraphy_": ("ui-title", ["el.title", "typ.titleFx"])}
UI_PROCESS = {"ui-frame": "品红连通域抠内芯 + 斜坡 alpha + 去溢色 → 1024 → 测边带宽与角件伸入量，给九宫格切边；另出 192 的 Godot 变体（切边同比例换算）", "ui-backdrop": "缩到 1920 宽 JPEG",
              "ui-container": "缩到 1920 宽 JPEG（中间留空放界面）", "ui-map": "缩到 1024 JPEG", "ui-title": "1 − 亮度得墨量 → 黑墨 + alpha，裁边",
              "ui-character": "局部背景色抠像（归一化卷积跟随渐变）+ 去溢色 → 裁边 → 高 1400"}


def ui_entries() -> dict | None:
    """UI 素材的条目；没有本地 ui-batches.json 时返回 None（现有登记表里的 UI 条目整条保留）"""
    if not UI_BATCHES.exists():
        return None
    out = {}
    for it in json.loads(UI_BATCHES.read_text(encoding="utf-8"))["items"]:
        kind, used = next((v for k, v in UI_KIND.items() if it["id"].startswith(k)), ("ui", []))
        out[it["id"]] = dict(label=it["label"], kind=kind, usedBy=used, prompt=it["prompt"],
                             process=UI_PROCESS.get(kind, "局部背景色抠像 + 去溢色 → 连通域切图 → 按行排序 → 预乘缩放进图集"), limits="", date="2026-10-14")
    return out


def public_model(tool: str) -> str:
    """生成记录里的模型写法 → 公开模型名"""
    name = tool.strip().lower().replace("_", "-")
    if name not in MODELS:
        sys.exit(f"不认识的模型 {tool!r}：查清它的公开名称后加进 register.py 的 MODELS")
    return name


def public_params(params: str) -> str:
    """生成参数 → 通用写法「画幅，质量，格式」，例如 1:1，medium 质量，PNG。
    分辨率档位（2K 之类）不登记：原图只在本地，成品尺寸见 files 与 meta。已经是通用写法的原样返回。"""
    if "，" in params:
        return params
    parts = {}
    for tok in params.split():
        t = tok.lower()
        if re.fullmatch(r"\d+:\d+", t):
            parts["ratio"] = t
        elif re.fullmatch(r"\d+k", t):
            continue
        elif t in QUALITY:
            parts["quality"] = f"{t} 质量"
        elif t in FORMATS:
            parts["format"] = FORMATS[t]
        else:
            sys.exit(f"看不懂的生成参数 {tok!r}：在 register.py 的 public_params 里补上它的通用写法")
    return "，".join(parts[k] for k in ("ratio", "quality", "format") if k in parts)


def clean_source(id_: str, src: dict) -> dict:
    """沿用的旧来源：只留 SOURCE_KEYS 里的字段，模型名与参数换成公开写法"""
    extra = [k for k in src if k not in SOURCE_KEYS]
    if extra:
        print(f"注意：{id_} 的来源里有不登记的字段，已去掉：{'、'.join(extra)}")
    src = {k: v for k, v in src.items() if k in SOURCE_KEYS}
    if src.get("service") == "ai" and str(src.get("tool", "")).lower().replace("_", "-") in MODELS:
        src["tool"] = public_model(src["tool"])
        if "params" in src:
            src["params"] = public_params(src["params"])
    return src


def own_source(id_: str, e: dict) -> dict:
    """ENTRIES 里直接写的来源（没有本地生成记录的图：自己画的、第三方的，或在别处生成的 AI 图）"""
    s = e["source"]
    bad = [k for k in s if k not in SOURCE_KEYS]
    if s.get("service") not in SERVICES or not s.get("date") or not e.get("license") or bad \
            or (s["service"] == "ai" and not s.get("tool")):
        sys.exit(f"{id_}：ENTRIES 里的 source 要写 service（{' / '.join(SERVICES)}）和 date（AI 生成另写公开模型名 tool），"
                 f"条目里另写 license" + (f"；不认识的字段：{'、'.join(bad)}" if bad else ""))
    s = dict(s)
    if s["service"] == "ai" and e.get("prompt"):
        s.setdefault("prompt", e["prompt"])
    return s


def tex_meta(id_: str):
    """public/assets/tex/<id>.json → (files, meta)；没有这个文件时返回 None"""
    p = TEX / f"{id_}.json"
    if not p.exists():
        return None
    meta = json.loads(p.read_text(encoding="utf-8"))
    files = meta.pop("files", {})
    meta.pop("id", None)
    return files, meta


def main():
    old_list = json.loads(OUT.read_text(encoding="utf-8"))["assets"] if OUT.exists() else []
    old = {a["id"]: a for a in old_list}
    tasks = {t["id"]: t for t in json.loads(LEDGER.read_text(encoding="utf-8"))["tasks"]} if LEDGER.exists() else None
    ui = ui_entries()
    table = {**ENTRIES, **PROCEDURAL, **(ui or {})}
    out, kept = [], []
    for id_, e in table.items():
        t = (tasks or {}).get(id_)
        if "source" in e:
            if t:
                sys.exit(f"{id_}：本地生成记录里有这条，ENTRIES 里又写了 source；AI 生成的图不要改写来源")
            source, raw, batch, lic = own_source(id_, e), e.get("raw"), e.get("batch", 0), e["license"]
        elif t:
            if not e.get("prompt"):
                sys.exit(f"{id_}：AI 生成的条目要写提示词 prompt")
            source = {"service": "ai", "tool": public_model(t["tool"]), "params": public_params(t["params"]),
                      "date": e.get("date", DATE), "prompt": e["prompt"]}
            raw, batch, lic = f"assets/generated/raw/{id_}.png", t["batch"], LICENSE
        elif id_ in PROCEDURAL:
            source = {"service": "procedural", "script": "scripts/assets/process.py", "date": DATE}
            raw, batch, lic = None, 0, PROCEDURAL_LICENSE
        elif id_ in old:
            # 本地生成记录没有这条（或没有生成记录）：沿用现有登记，不改标成程序生成
            o = old[id_]
            source, raw, batch, lic = clean_source(id_, o["source"]), o["raw"], o["batch"], o["license"]
            kept.append(id_)
        else:
            sys.exit(f"{id_}：找不到来源。AI 生成的图要在本地生成记录 {LEDGER.name} 里有记录；"
                     "自己画的或第三方 CC0 图片在 ENTRIES 里写 source 与 license")
        tm = tex_meta(id_) or ((old[id_]["files"], old[id_]["meta"]) if id_ in kept else ({}, {}))
        out.append({
            "id": id_, "label": e["label"], "kind": e["kind"], "batch": batch,
            "source": source, "raw": raw, "files": tm[0], "meta": tm[1],
            "process": e["process"], "usedBy": e["usedBy"], "limits": e["limits"], "license": lic,
        })
    # 没有 ui-batches.json：现有登记表里的 UI 素材整条保留，只按 public/assets/tex/<id>.json 刷新 files 与 meta
    kept_ui = []
    if ui is None:
        for o in old_list:
            if o["id"] in table or not o["kind"].startswith("ui"):
                continue
            a = dict(o, source=clean_source(o["id"], o["source"]))
            a["files"], a["meta"] = tex_meta(o["id"]) or (o["files"], o["meta"])
            out.append(a)
            kept_ui.append(o["id"])
    done = {a["id"] for a in out}
    dropped = [i for i in old if i not in done]

    # 生成记录里的内部字段（任务编号之类）与原始的模型、参数写法不能出现在登记表里。
    # status 是 done 之类的普通单词，提示词里也会出现（abandoned），不查；已经是公开写法的模型名与参数也不算
    text = json.dumps(out, ensure_ascii=False)
    leaks = sorted({f"{k}={v}" for t in (tasks or {}).values() for k, v in t.items()
                    if k not in ("id", "batch", "date", "prompt", "status") and isinstance(v, str) and len(v) >= 4 and v in text
                    and not (k == "tool" and v in MODELS) and not (k == "params" and "，" in v)})
    if leaks:
        sys.exit(f"登记表里出现了生成记录的内部字段，没有写入：{'、'.join(leaks)}")

    doc = {"note": "由 scripts/assets/register.py 生成，不要手改。文件路径相对 public/assets/tex/。", "assets": out}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} assets")
    if tasks is None:
        print(f"注意：没有本地生成记录 {LEDGER}")
    if kept:
        print(f"注意：{len(kept)} 条本地生成记录覆盖不到，沿用现有登记表里的来源、原图、批次与许可：{'、'.join(kept)}")
    if kept_ui:
        print(f"注意：没有本地 UI 提示词表 {UI_BATCHES}，{len(kept_ui)} 条游戏 UI 素材整条沿用现有登记（只刷新 files 与 meta）：{'、'.join(kept_ui)}")
    if dropped:
        print(f"注意：{len(dropped)} 条不在 ENTRIES / PROCEDURAL / UI 提示词表里，已从登记表去掉：{'、'.join(dropped)}")


if __name__ == "__main__":
    main()
