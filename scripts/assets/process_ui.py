"""M11① / M11② AI 生成 UI 素材的本地处理：品红抠像、切图集、九宫格切边测量、背景压缩。

用法（Python 3，需要 numpy / Pillow / scipy）：
  python -X utf8 scripts/assets/process_ui.py              # 全部
  python -X utf8 scripts/assets/process_ui.py ui_frame_gold # 只处理指定 id

原图 assets/generated/raw/<id>.png（提示词见 assets/generated/ui-batches.json），输出 public/assets/tex/<id>*.png|jpg
与 public/assets/tex/<id>.json（文件、切边、图集矩形），由 scripts/assets/register.py 汇总进 src/content/assets.json，
游戏 UI 的素材加载器（src/hud/uiAssets.ts）按 json 读。九宫格外框另出一张 192 的 <id>_godot.png（切边同比例换算，
Godot 迁移包的 StyleBoxTexture 用，见 src/export/godotHud.ts）。

抠像：背景是模型画的"品红"，但各张颜色不完全一样、九宫格的内芯还有一点亮度渐变，所以不用固定色：
  1) 种子 = 明显的品红（min(R,B) − G > 0.5 且 G < 0.35）；
  2) 用种子像素的颜色做归一化卷积，得到逐像素的局部背景色（渐变也跟得上）；
  3) alpha 按到局部背景色的距离做斜坡（紫宝石这类偏品红的前景离背景仍然够远，不会被抠穿）；
  4) 半透明边缘按 c = (rgb − (1−a)·bg) / a 去掉背景色溢出。
九宫格边框另外用"连通的品红区"判内芯：从中心出发的品红连通域整块透明。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "assets" / "generated" / "raw"
OUT = ROOT / "public" / "assets" / "tex"


def load(id_: str) -> np.ndarray:
    return np.asarray(Image.open(RAW / f"{id_}.png").convert("RGB"), dtype=np.float32) / 255.0


def save_rgba(a: np.ndarray, name: str) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(OUT / name, optimize=True)
    return name


def save_jpg(rgb: np.ndarray, name: str, quality=86) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").save(OUT / name, quality=quality, optimize=True, progressive=True)
    return name


def resize_rgba(a: np.ndarray, w: int, h: int) -> np.ndarray:
    """预乘后缩放，避免透明边缘发黑 / 发品红"""
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    im = Image.fromarray((np.clip(pm, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").resize((w, h), Image.Resampling.LANCZOS)
    out = np.asarray(im, dtype=np.float32) / 255.0
    al = out[..., 3:4]
    out[..., :3] = np.where(al > 1e-3, out[..., :3] / np.maximum(al, 1e-3), 0)
    return np.clip(out, 0, 1)


def key_magenta(rgb: np.ndarray, lo=0.10, hi=0.32, sigma=24) -> np.ndarray:
    s = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    seed = (s > 0.5) & (rgb[..., 1] < 0.35)
    w = ndimage.gaussian_filter(seed.astype(np.float32), sigma)
    bg = np.stack([ndimage.gaussian_filter(rgb[..., c] * seed, sigma) for c in range(3)], -1) / np.maximum(w[..., None], 1e-4)
    glob = rgb[seed].mean(0) if seed.any() else np.array([1, 0, 1], np.float32)
    bg = np.where(w[..., None] > 1e-3, bg, glob)
    d = np.linalg.norm(rgb - bg, axis=-1)
    a = np.clip((d - lo) / (hi - lo), 0, 1)
    a[seed & (d < lo)] = 0
    c = (rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3)
    return np.concatenate([np.clip(c, 0, 1), a[..., None]], -1)


def key_frame(rgb: np.ndarray) -> np.ndarray:
    """九宫格边框：品红度斜坡 + 从中心出发的品红连通域整块透明（内芯有渐变也不残留）。"""
    s = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    a = 1 - np.clip((s - 0.06) / 0.22, 0, 1)
    pink = s > 0.18
    lab, _ = ndimage.label(pink)
    h, w = s.shape
    center = lab[h // 2, w // 2]
    if center:
        a[lab == center] = 0
    # 去溢色：半透明边缘按局部背景色减掉
    seed = s > 0.3
    sw = ndimage.gaussian_filter(seed.astype(np.float32), 16)
    bg = np.stack([ndimage.gaussian_filter(rgb[..., c] * seed, 16) for c in range(3)], -1) / np.maximum(sw[..., None], 1e-4)
    bg = np.where(sw[..., None] > 1e-3, bg, np.array([0.95, 0.15, 0.85], np.float32))
    c = (rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3)
    return np.concatenate([np.clip(c, 0, 1), a[..., None]], -1)


def trim(a: np.ndarray, pad=8, thr=0.04):
    ys, xs = np.nonzero(a[..., 3] > thr)
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1), max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1)
    return a[y0:y1, x0:x1]


def items(a: np.ndarray, count: int, rows: int, join=14, thr=0.08):
    """按连通域切出 count 个前景，按行（上到下）、行内左到右排序；返回裁好的 RGBA 列表"""
    mask = a[..., 3] > thr
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=join))
    sizes = ndimage.sum(mask, lab, index=np.arange(1, n + 1))
    keep = list(np.argsort(-sizes)[:count] + 1)
    boxes = []
    for lid in keep:
        ys, xs = np.nonzero((lab == lid) & mask)
        boxes.append({"lid": lid, "y0": ys.min(), "y1": ys.max() + 1, "x0": xs.min(), "x1": xs.max() + 1, "cy": ys.mean(), "cx": xs.mean()})
    boxes.sort(key=lambda b: b["cy"])
    per = max(1, round(len(boxes) / rows))
    ordered = []
    for r in range(rows):
        ordered += sorted(boxes[r * per:(r + 1) * per], key=lambda b: b["cx"])
    out = []
    for b in ordered:
        sub = a[b["y0"]:b["y1"], b["x0"]:b["x1"]].copy()
        sub[..., 3] *= ndimage.binary_dilation(lab[b["y0"]:b["y1"], b["x0"]:b["x1"]] == b["lid"], iterations=2)
        out.append(np.pad(sub, ((6, 6), (6, 6), (0, 0))))
    return out, len(boxes)


def atlas(id_: str, parts, names, cell: int, cols: int, fit="contain") -> dict:
    rows = (len(parts) + cols - 1) // cols
    sheet = np.zeros((rows * cell, cols * cell, 4), np.float32)
    rects = {}
    for k, (p, name) in enumerate(zip(parts, names)):
        h, w = p.shape[:2]
        s = min((cell - 8) / w, (cell - 8) / h)
        nw, nh = max(1, int(w * s)), max(1, int(h * s))
        im = resize_rgba(p, nw, nh)
        cx, cy = (k % cols) * cell, (k // cols) * cell
        ox, oy = cx + (cell - nw) // 2, cy + (cell - nh) // 2
        sheet[oy:oy + nh, ox:ox + nw] = im
        rects[name] = [ox, oy, nw, nh]
    f = save_rgba(sheet, f"{id_}.png")
    return {"files": {"atlas": f}, "size": [sheet.shape[1], sheet.shape[0]], "cell": cell, "rects": rects}


GODOT_FRAME = 192  # Godot 迁移包用的小图：StyleBoxTexture 的角按原像素 1:1 画，1024 的切边在 HUD 里太粗


def frame(id_: str, size=1024) -> dict:
    a = resize_rgba(key_frame(load(id_)), size, size)
    al = a[..., 3]
    # 边带宽度：中段每行从左往右第一次变透明的位置取中位数；角件伸进来多少：上 / 下 30% 的行里的最大值
    def inner(line):
        # 从外往里：先跳过外沿可能残留的透明边，到第一个不透明像素，再找之后第一个透明像素 = 边带内沿
        op = np.nonzero(line > 0.5)[0]
        if not len(op):
            return 0
        tr = np.nonzero(line[op[0]:] < 0.5)[0]
        return int(op[0] + tr[0]) if len(tr) else 0
    rows_mid = [inner(al[y]) for y in range(int(size * 0.35), int(size * 0.65), 4)]
    band = int(np.median(rows_mid))
    rows_corner = [inner(al[y]) for y in list(range(0, int(size * 0.3), 4)) + list(range(int(size * 0.7), size, 4))]
    cols_corner = [inner(al[:, x]) for x in list(range(0, int(size * 0.3), 4)) + list(range(int(size * 0.7), size, 4))]
    # 九宫格切边 = 把角件整个包进角里：角区里第一列 / 行从"伸进来的角件"回到正常边带的位置
    def corner_extent(lines):
        ext = 0
        for k, v in enumerate(lines[: len(lines) // 2]):
            if v > band * 1.15:
                ext = (k + 1) * 4
        return ext
    ext = max(corner_extent(rows_corner), corner_extent(cols_corner), band)
    slice_px = int(min(size * 0.3, max(band + 6, ext + 6)))
    f = save_rgba(a, f"{id_}.png")
    # Godot 变体：缩到 192，切边 / 边带同比例换算（texture_margin = sliceGodot，内容边距按 bandGodot 留）
    k = GODOT_FRAME / size
    fg = save_rgba(resize_rgba(a, GODOT_FRAME, GODOT_FRAME), f"{id_}_godot.png")
    return {"files": {"image": f, "godot": fg}, "size": [size, size], "band": band, "slice": slice_px,
            "sizeGodot": [GODOT_FRAME, GODOT_FRAME], "sliceGodot": max(1, int(round(slice_px * k))), "bandGodot": max(1, int(round(band * k))),
            "coverage": float((al > 0.5).mean())}


def sprite_sheet(id_, count, rows, cols, cell, names, join=14):
    parts, found = items(key_magenta(load(id_)), count, rows, join=join)
    meta = atlas(id_, parts, names[: len(parts)], cell, cols)
    meta["found"] = found
    return meta


ITEM_NAMES = ["wood", "stone", "ironOre", "crystal", "herb", "rope", "resin", "pot", "sword", "shield", "potion", "coin", "gem", "key", "map", "scroll"]


def character(id_, height=1400):
    a = trim(key_magenta(load(id_)), pad=12)
    h, w = a.shape[:2]
    s = min(1.0, height / h)
    a = resize_rgba(a, int(w * s), int(h * s))
    f = save_rgba(a, f"{id_}.png")
    return {"files": {"image": f}, "size": [a.shape[1], a.shape[0]]}


def bust_chibi(id_):
    parts, found = items(key_magenta(load(id_)), 2, 1, join=24)
    out = {"files": {}, "size": {}, "found": found}
    for p, name in zip(parts, ["bust", "chibi"]):
        f = save_rgba(p, f"{id_}_{name}.png")
        out["files"][name] = f
        out["size"][name] = [p.shape[1], p.shape[0]]
    return out


def backdrop(id_, w=1920):
    rgb = load(id_)
    h = int(round(w * rgb.shape[0] / rgb.shape[1]))
    im = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).resize((w, h), Image.Resampling.LANCZOS)
    f = save_jpg(np.asarray(im, np.float32) / 255, f"{id_}.jpg")
    return {"files": {"image": f}, "size": [w, h]}


def map_image(id_, size=1024):
    rgb = load(id_)
    im = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).resize((size, size), Image.Resampling.LANCZOS)
    f = save_jpg(np.asarray(im, np.float32) / 255, f"{id_}.jpg", quality=88)
    return {"files": {"image": f}, "size": [size, size]}


def calligraphy(id_, width=1600):
    rgb = load(id_)
    luma = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    a = np.clip((1 - luma - 0.06) / 0.8, 0, 1)
    rgba = np.concatenate([np.zeros_like(rgb) + 0.04, a[..., None]], -1)
    rgba = trim(rgba, pad=16, thr=0.08)
    h, w = rgba.shape[:2]
    s = min(1.0, width / w)
    rgba = resize_rgba(rgba, int(w * s), int(h * s))
    f = save_rgba(rgba, f"{id_}.png")
    return {"files": {"image": f}, "size": [rgba.shape[1], rgba.shape[0]], "note": "黑墨 + alpha；使用时可按字色着色（source-in）"}


def ribbons(id_):
    parts, found = items(key_magenta(load(id_)), 3, 3, join=10)
    out = {"files": {}, "size": {}, "cap": {}, "found": found}
    for p, name in zip(parts, ["red", "blue", "gold"]):
        p = trim(p, pad=4)
        h, w = p.shape[:2]
        s = min(1.0, 900 / w)
        p = resize_rgba(p, int(w * s), int(h * s))
        f = save_rgba(p, f"{id_}_{name}.png")
        out["files"][name] = f
        out["size"][name] = [p.shape[1], p.shape[0]]
        # 横向九宫格：两端燕尾的宽度（不透明列数在中段稳定前的部分），中段可拉伸
        col = (p[..., 3] > 0.5).sum(0)
        mid = np.median(col[int(len(col) * 0.4): int(len(col) * 0.6)])
        left = next((x for x in range(len(col) // 2) if abs(col[x] - mid) < mid * 0.08 and abs(col[min(len(col) - 1, x + 6)] - mid) < mid * 0.08), int(len(col) * 0.2))
        right = next((x for x in range(len(col) // 2) if abs(col[-1 - x] - mid) < mid * 0.08 and abs(col[max(0, len(col) - 7 - x)] - mid) < mid * 0.08), int(len(col) * 0.2))
        out["cap"][name] = [int(left) + 8, int(right) + 8]
    return out


RECIPES = {
    "ui_frame_gold": lambda: frame("ui_frame_gold"),
    "ui_frame_bronze": lambda: frame("ui_frame_bronze"),
    "ui_frame_stone": lambda: frame("ui_frame_stone"),
    "ui_frame_wood": lambda: frame("ui_frame_wood"),
    "ui_frame_leather": lambda: frame("ui_frame_leather"),
    "ui_ornament_corners": lambda: sprite_sheet("ui_ornament_corners", 4, 2, 2, 512, ["floral", "cloud", "wing", "rune"], join=18),
    "ui_ornament_gems": lambda: sprite_sheet("ui_ornament_gems", 9, 3, 3, 256, ["ruby", "sapphire", "emerald", "rivetGold", "rivetIron", "studBronze", "medallion", "crestBase", "finial"]),
    "ui_ribbons": ribbons and (lambda: ribbons("ui_ribbons")),
    "ui_icons_painted": lambda: sprite_sheet("ui_icons_painted", 16, 4, 4, 256, ITEM_NAMES),
    "ui_icons_3d": lambda: sprite_sheet("ui_icons_3d", 16, 4, 4, 256, ITEM_NAMES),
    "ui_char_anime": lambda: character("ui_char_anime"),
    "ui_char_painterly": lambda: character("ui_char_painterly"),
    "ui_char_bust_chibi": lambda: bust_chibi("ui_char_bust_chibi"),
    "ui_keyart": lambda: backdrop("ui_keyart"),
    "ui_scene_watercolor": lambda: backdrop("ui_scene_watercolor"),
    "ui_desk": lambda: backdrop("ui_desk"),
    "ui_clue_wall": lambda: backdrop("ui_clue_wall"),
    "ui_counter": lambda: backdrop("ui_counter"),
    "ui_badges": lambda: sprite_sheet("ui_badges", 9, 3, 3, 256, ["medal", "trophy", "laurel", "crest", "stamp", "crystal", "chevron", "winged", "base"]),
    "ui_empty_states": lambda: sprite_sheet("ui_empty_states", 4, 2, 2, 384, ["bag", "mail", "seat", "search"], join=20),
    "ui_map_parchment": lambda: map_image("ui_map_parchment"),
    "ui_calligraphy_title": lambda: calligraphy("ui_calligraphy_title"),
}


def main(ids):
    ids = ids or [k for k in RECIPES if (RAW / f"{k}.png").exists()]
    for id_ in ids:
        if not (RAW / f"{id_}.png").exists():
            print(f"skip {id_}: no raw")
            continue
        meta = RECIPES[id_]()
        meta["id"] = id_
        (OUT / f"{id_}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
        brief = {k: v for k, v in meta.items() if k not in ("rects",)}
        print(json.dumps(brief, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1:])
