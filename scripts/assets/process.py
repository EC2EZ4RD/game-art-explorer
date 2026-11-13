"""本地素材处理：把 AI 生成的原图整理成可平铺纹理、法线图、笔触图集等。

用法（Python 3，需要 numpy / Pillow / scipy）：
  python -I scripts/assets/process.py            # 处理 recipes 里全部条目
  python -I scripts/assets/process.py xuan_paper # 只处理指定 id

原图在 assets/generated/raw/<id>.png，输出到 public/assets/tex/<id>*.png，
每条的处理参数与输出清单写到 public/assets/tex/<id>.json，由 src/content/assets.json 引用。
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


# ---------- 基础 ----------

def load(id_: str) -> np.ndarray:
    im = Image.open(RAW / f"{id_}.png").convert("RGB")
    return np.asarray(im, dtype=np.float32) / 255.0


def save(a: np.ndarray, name: str, mode: str | None = None) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    a = np.clip(a, 0.0, 1.0)
    im = Image.fromarray((a * 255.0 + 0.5).astype(np.uint8), mode)
    im.save(OUT / name, optimize=True)
    return name


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def resize(a: np.ndarray, size: int) -> np.ndarray:
    """面积平均缩放到 size×size（各通道分别处理）。"""
    if a.shape[0] == size and a.shape[1] == size:
        return a
    def one(ch):
        return np.asarray(Image.fromarray(ch, "F").resize((size, size), Image.Resampling.BOX), dtype=np.float32)
    if a.ndim == 2:
        return one(a)
    return np.stack([one(a[..., c]) for c in range(a.shape[2])], axis=-1)


def flatten(a: np.ndarray, sigma_frac: float = 0.12) -> np.ndarray:
    """去掉大尺度明暗（扫描光照不均、暗角）：除以大半径高斯模糊，再乘回全图均值。"""
    s = sigma_frac * a.shape[0]
    if a.ndim == 2:
        low = ndimage.gaussian_filter(a, s, mode="reflect")
        return a / np.maximum(low, 1e-3) * low.mean()
    out = np.empty_like(a)
    for c in range(a.shape[2]):
        out[..., c] = flatten(a[..., c], sigma_frac)
    return out


def levels(a: np.ndarray, lo_pct: float = 0.5, hi_pct: float = 99.5) -> np.ndarray:
    lo, hi = np.percentile(a, [lo_pct, hi_pct])
    return (a - lo) / max(hi - lo, 1e-4)


def match_hist(src: np.ndarray, ref: np.ndarray) -> np.ndarray:
    """把 src 的值分布映射成 ref 的分布（单通道）。"""
    order = np.argsort(src, axis=None)
    out = np.empty(src.size, dtype=np.float32)
    out[order] = np.sort(ref, axis=None)
    return out.reshape(src.shape)


def seamless(a: np.ndarray, band: float = 0.18) -> np.ndarray:
    """偏移半格 + 方差保持混合（Heitz & Neyret 2018 的简化）：
    A = 原图，B = 平移半个尺寸的原图；A 的四边权重为 0，B 在 A 的边界处是连续的，
    所以结果四边可以无缝相接。混合后按 sqrt(w²+(1-w)²) 还原对比度，再做直方图匹配回原分布。"""
    n = a.shape[0]
    b = np.roll(a, (n // 2, n // 2), axis=(0, 1))
    t = np.linspace(0.0, 1.0, n, dtype=np.float32)
    edge = np.minimum(t, 1.0 - t) / band            # 离边界的距离（以 band 为单位）
    w1 = np.clip(edge, 0.0, 1.0)
    w1 = w1 * w1 * (3.0 - 2.0 * w1)                   # smoothstep
    w = np.minimum.outer(w1, w1)                       # 四边都为 0
    chans = [a] if a.ndim == 2 else [a[..., c] for c in range(a.shape[2])]
    bchs = [b] if b.ndim == 2 else [b[..., c] for c in range(b.shape[2])]
    outs = []
    for ca, cb in zip(chans, bchs):
        m = ca.mean()
        mix = (w * (ca - m) + (1.0 - w) * (cb - m)) / np.sqrt(w * w + (1.0 - w) ** 2) + m
        outs.append(match_hist(mix, ca))
    return outs[0] if a.ndim == 2 else np.stack(outs, axis=-1)


def seam_error(a: np.ndarray) -> float:
    """平铺接缝处的平均跳变，与图内相邻像素平均差的比值（≈1 表示看不出接缝）。"""
    g = a if a.ndim == 2 else luma(a)
    inner = np.abs(np.diff(g, axis=1)).mean()
    seam = np.abs(g[:, 0] - g[:, -1]).mean()
    return float(seam / max(inner, 1e-6))


def height_to_normal(h: np.ndarray, strength: float) -> np.ndarray:
    """可平铺的切线空间法线（OpenGL 约定，+Y 向上；Godot 需要在导入时勾选 normal_map=OpenGL 或翻转 G）。"""
    dx = ndimage.sobel(h, axis=1, mode="wrap") / 8.0
    dy = ndimage.sobel(h, axis=0, mode="wrap") / 8.0
    nx, ny, nz = -dx * strength, dy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], axis=-1) * 0.5 + 0.5


# ---------- 笔触图集 ----------

def ink_alpha(rgb: np.ndarray) -> np.ndarray:
    """白底墨迹 → 不透明度：1 - 亮度，纸白处压到 0。"""
    a = 1.0 - luma(rgb)
    paper = np.percentile(a, 60)                       # 大部分像素是纸
    return np.clip((a - paper - 0.03) / (1.0 - paper - 0.03), 0.0, 1.0)


def stroke_atlas(id_: str, rgb: np.ndarray, cols: int, rows: int, cell: tuple[int, int], min_area: float) -> dict:
    """按连通域切出每个笔触，等比放进 cols×rows 的格子（cell = 宽,高），输出单通道 alpha 图集与 UV 表。"""
    alpha = ink_alpha(rgb)
    mask = ndimage.binary_dilation(alpha > 0.06, iterations=10)   # 把飞白、溅点并进同一笔
    lab, n = ndimage.label(mask)
    boxes = ndimage.find_objects(lab)
    areas = ndimage.sum(np.ones_like(alpha), lab, index=np.arange(1, n + 1))
    items = [(b, ar) for b, ar in zip(boxes, areas) if ar >= min_area * alpha.size]
    # 按阅读顺序：先行后列
    h = alpha.shape[0]
    items.sort(key=lambda it: (int((it[0][0].start + it[0][0].stop) / 2 / (h / rows)), it[0][1].start))
    cw, ch = cell
    atlas = np.zeros((rows * ch, cols * cw), dtype=np.float32)
    rects = []
    for k, (b, _) in enumerate(items[: cols * rows]):
        # 框里可能伸进别的笔触，只保留面积最大的那个连通域
        lid = np.bincount(lab[b].ravel())[1:].argmax() + 1
        crop = alpha[b] * (lab[b] == lid)
        pad = 8
        sh, sw = crop.shape
        s = min((cw - 2 * pad) / sw, (ch - 2 * pad) / sh)
        nw, nh = max(1, int(sw * s)), max(1, int(sh * s))
        im = np.asarray(Image.fromarray(crop, "F").resize((nw, nh), Image.Resampling.LANCZOS), dtype=np.float32)
        cx, cy = (k % cols) * cw, (k // cols) * ch
        ox, oy = cx + (cw - nw) // 2, cy + (ch - nh) // 2
        atlas[oy:oy + nh, ox:ox + nw] = np.clip(im, 0, 1)
        rects.append({"x": ox / atlas.shape[1], "y": oy / atlas.shape[0], "w": nw / atlas.shape[1], "h": nh / atlas.shape[0]})
    name = save(atlas, f"{id_}.png", "L")
    return {"files": {"alpha": name}, "count": len(rects), "found": len(items), "grid": [cols, rows], "rects": rects}


# ---------- 处方 ----------

def tile_gray(id_, size=1024, flat=0.12, normalize=True, invert=False):
    a = luma(flatten(load(id_), flat))
    if invert:
        a = 1.0 - a
    a = seamless(resize(a, size))
    if normalize:
        a = np.clip(levels(a), 0, 1)
    return {"files": {"gray": save(a, f"{id_}.png", "L")}, "seam": seam_error(a), "mean": float(a.mean())}


def tile_color(id_, size=1024, flat=0.12):
    a = seamless(resize(flatten(load(id_), flat), size))
    g = luma(a)
    return {"files": {"color": save(a, f"{id_}.png", "RGB")}, "seam": seam_error(a), "mean": float(g.mean())}


def tile_height(id_, size=1024, strength=6.0, flat=0.2, normal=True):
    h = luma(flatten(load(id_), flat))
    h = np.clip(levels(seamless(resize(h, size))), 0, 1)
    files = {"height": save(h, f"{id_}_h.png", "L")}
    meta = {"seam": seam_error(h)}
    if normal:
        files["normal"] = save(height_to_normal(h, strength), f"{id_}_n.png", "RGB")
        meta.update({"normalStrength": strength, "normalConvention": "OpenGL (+Y up)"})
    return {"files": files, **meta}


def period_crop(a: np.ndarray, axis: int, lo: float = 0.8) -> int:
    """在 [lo·N, N] 里找一个长度 h，使第 0 行（列）与第 h 行最像：按 h 裁切后首尾相接处的跳变最小。"""
    g = a if a.ndim == 2 else luma(a)
    if axis == 1:
        g = g.T
    n = g.shape[0]
    head = g[:4]
    best, best_h = 1e9, n
    for h in range(int(n * lo), n - 3):
        err = np.abs(g[h:h + 4] - head).mean()
        if err < best:
            best, best_h = err, h
    return best_h


def tile_height_periodic(id_, size=1024, strength=5.0, rows_period=None):
    """规则织物：按整数个周期裁切再缩放，保证针脚首尾相接（混合会把针脚错位糊掉）。"""
    rgb = load(id_)
    h = luma(flatten(rgb, 0.3))
    ph = period_crop(h, 0, lo=0.85)
    pw = period_crop(h, 1, lo=0.85)
    h = np.clip(levels(resize_to(h[:ph, :pw], size, size)), 0, 1)
    n = height_to_normal(h, strength)
    return {"files": {"height": save(h, f"{id_}_h.png", "L"), "normal": save(n, f"{id_}_n.png", "RGB")},
            "crop": [pw, ph], "seam": seam_error(h), "normalStrength": strength, "normalConvention": "OpenGL (+Y up)"}


def resize_to(a: np.ndarray, w: int, h: int) -> np.ndarray:
    return np.asarray(Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.Resampling.LANCZOS), dtype=np.float32)


def erosion_field(id_, size=1024):
    """二值剥落遮罩 → 连续的"耐久度"场：黑（已剥落）处为 0，离剥落越远越接近 1。
    着色器用 smoothstep(做旧程度) 截取，做旧程度越大，剥落区域从现有斑块向外扩。"""
    a = luma(load(id_))
    ph = period_crop(a, 0, lo=0.9)
    pw = period_crop(a, 1, lo=0.9)
    m = resize_to(a[:ph, :pw], size, size) > 0.5
    # 环绕距离：把图平铺 3×3 后算距离，取中间一块
    big = np.tile(m, (3, 3))
    d_in = ndimage.distance_transform_edt(big)[size:2 * size, size:2 * size]        # 完好区到剥落区的距离
    d_out = ndimage.distance_transform_edt(~big)[size:2 * size, size:2 * size]      # 剥落区内部到边界的距离
    f = np.where(m, 0.5 + 0.5 * np.clip(d_in / 90.0, 0, 1) ** 0.7, 0.5 - 0.5 * np.clip(d_out / 40.0, 0, 1))
    # 加一点细噪声，让扩张边缘不规则
    rng = np.random.default_rng(7)
    noise = ndimage.gaussian_filter(rng.standard_normal((size, size)).astype(np.float32), 3, mode="wrap")
    f = np.clip(f + noise / noise.std() * 0.035, 0, 1)
    return {"files": {"field": save(f, f"{id_}.png", "L")}, "crop": [pw, ph], "seam": seam_error(f),
            "coverageBlack": float((~m).mean()), "use": "剥落 = field < 做旧程度；0.5 = 原图里的剥落范围"}


def papercut_mask(id_, size=1024, tile=False):
    """红纸剪纸 → 单通道遮罩（白 = 纸，黑 = 镂空），颜色交给调色板。"""
    a = load(id_)
    red = a[..., 0] - (a[..., 1] + a[..., 2]) * 0.5
    if tile:
        ph = period_crop(red, 0, lo=0.8)
        pw = period_crop(red, 1, lo=0.8)
        red = red[:ph, :pw]
        meta = {"crop": [pw, ph]}
    else:
        meta = {}
    m = np.clip((red - 0.15) / 0.3, 0, 1)
    m = resize_to(m, size, size) if tile else resize(m, size)
    meta.update({"files": {"mask": save(np.clip(m, 0, 1), f"{id_}.png", "L")}, "coverage": float(m.mean())})
    if tile:
        meta["seam"] = seam_error(m)
    return meta


# ---------- 精灵与序列帧 ----------

MAGENTA = np.array([1.0, 0.0, 1.0], np.float32)


def key_magenta(rgb: np.ndarray) -> np.ndarray:
    """品红差值抠像 + 去溢色。品红的特征是 R、B 都高而 G 低：s = min(R,B) − G。
    中性灰、白、黄、橙、青的 s ≤ 0，只有背景与背景混出来的边缘 s > 0，所以浅灰烟雾不会被误当成半透明。
    alpha = 1 − s / s_bg；半透明处按 c = (rgb − (1−a)·bg) / a 把背景色减掉。返回 RGBA。"""
    bg = np.median(rgb[:8, :8].reshape(-1, 3), axis=0)          # 实际背景色（模型给的不是纯 #FF00FF）
    s = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    s_bg = min(bg[0], bg[2]) - bg[1]
    a = np.clip(1.0 - (s - 0.04) / (s_bg - 0.12), 0, 1)
    c = (rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3)
    c = np.clip(c, 0, 1)
    return np.concatenate([c, a[..., None]], axis=-1)


def blobs(mask: np.ndarray, join: int, count: int):
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=join))
    sizes = ndimage.sum(mask, lab, index=np.arange(1, n + 1))
    keep = np.argsort(-sizes)[:count] + 1
    out = []
    for lid in keep:
        ys, xs = np.nonzero((lab == lid) & mask)
        out.append({"lid": int(lid), "x0": int(xs.min()), "x1": int(xs.max()) + 1, "y0": int(ys.min()), "y1": int(ys.max()) + 1,
                    "cx": float(xs.mean()), "cy": float(ys.mean())})
    return lab, out


def grid_order(items, rows: int):
    items = sorted(items, key=lambda b: b["cy"])
    per = len(items) // rows
    out = []
    for r in range(rows):
        out += sorted(items[r * per:(r + 1) * per], key=lambda b: b["cx"])
    return out


def pixel_pitch(rgb: np.ndarray, mask: np.ndarray) -> tuple[float, float, float]:
    """像素图的真实像素尺寸与网格相位：颜色跳变沿 x 方向的自相关峰。"""
    g = np.abs(np.diff(rgb, axis=1)).sum(-1) * mask[:, 1:]
    prof = g.sum(0)
    prof = prof - prof.mean()
    ac = np.correlate(prof, prof, "full")[len(prof) - 1:]
    k = max(range(5, 40), key=lambda i: ac[i])
    # 抛物线插值求亚像素周期，再用 4 倍周期细化
    k4 = max(range(4 * k - 3, 4 * k + 4), key=lambda i: ac[i]) / 4.0
    phases = np.arange(0, k4, 0.25)
    xs = np.arange(len(prof))
    score = [prof[((xs - p) % k4) < 1.0].sum() for p in phases]
    return k4, float(phases[int(np.argmax(score))]), float(ac[k] / ac[0])


def pixel_sheet(id_, colors: int, cell: int = 48):
    rgb = load(id_)
    rgba = key_magenta(rgb)
    fg = rgba[..., 3] > 0.5
    pitch, phase, conf = pixel_pitch(rgb, fg)
    _, items = blobs(fg, 6, 16)
    items = grid_order(items, 4)
    # 降采样：每个大像素取中心 50% 区域的中位色
    def down(b):
        x0 = phase + np.floor((b["x0"] - phase) / pitch) * pitch
        y0 = np.floor(b["y0"] / pitch) * pitch
        y_bottom = b["y1"]
        nx = int(np.ceil((b["x1"] - x0) / pitch))
        ny = int(np.ceil((y_bottom - y0) / pitch))
        out = np.zeros((ny, nx, 4), np.float32)
        for j in range(ny):
            for i in range(nx):
                xa, ya = x0 + (i + 0.25) * pitch, y0 + (j + 0.25) * pitch
                blk = rgba[int(ya):int(ya + pitch * 0.5) + 1, int(xa):int(xa + pitch * 0.5) + 1]
                if blk.size == 0:
                    continue
                al = blk[..., 3].reshape(-1)
                if (al > 0.5).mean() < 0.5:
                    continue
                px = blk[..., :3].reshape(-1, 3)[al > 0.5]
                out[j, i, :3] = np.median(px, axis=0)
                out[j, i, 3] = 1.0
        return out
    frames = [down(b) for b in items]
    # 统一调色板：所有帧的不透明像素一起量化
    allpx = np.concatenate([f[f[..., 3] > 0.5][:, :3] for f in frames])
    pal_im = Image.fromarray((allpx[None] * 255).astype(np.uint8), "RGB").quantize(colors, method=Image.Quantize.MEDIANCUT)
    pal = np.array(pal_im.getpalette()[: colors * 3], np.float32).reshape(-1, 3) / 255.0
    sheet = np.zeros((4 * cell, 4 * cell, 4), np.float32)
    for k, f in enumerate(frames):
        op = f[..., 3] > 0.5
        d = ((f[..., None, :3] - pal[None, None]) ** 2).sum(-1)
        f[..., :3] = np.where(op[..., None], pal[d.argmin(-1)], 0)
        h, w = f.shape[:2]
        r, c = divmod(k, 4)
        ox = c * cell + (cell - w) // 2          # 水平居中
        oy = r * cell + (cell - h) - 1           # 脚底对齐到格子底部上方 1 像素
        sheet[max(oy, r * cell):oy + h, ox:ox + w] = f[max(0, r * cell - oy):, :]
    name = save(sheet, f"{id_}.png", "RGBA")
    return {"files": {"sheet": name}, "pitch": pitch, "phase": phase, "pitchConfidence": conf, "frames": len(frames),
            "cell": cell, "grid": [4, 4], "rows": ["down", "left", "right", "up"], "colors": colors,
            "spriteSize": [int(max(f.shape[1] for f in frames)), int(max(f.shape[0] for f in frames))], "filter": "nearest"}


def fx_sheet(id_, cols=4, rows=2, frame=256):
    rgba = key_magenta(load(id_))
    n = rgba.shape[0]
    cw, ch = n // cols, n // rows
    a = rgba[..., 3]
    out = np.zeros((rows * frame, cols * frame, 4), np.float32)
    # 每行用同一个垂直中心，避免序列帧上下跳
    side = int(min(cw, ch) * 1.0)
    for r in range(rows):
        band = a[r * ch:(r + 1) * ch]
        ys = np.nonzero(band.sum(1) > 0.5)[0]
        cy = r * ch + (int(ys.mean()) if len(ys) else ch // 2)
        for c in range(cols):
            cx = c * cw + cw // 2
            y0, x0 = max(0, cy - side // 2), max(0, cx - side // 2)
            crop = rgba[y0:y0 + side, x0:x0 + side]
            pad = np.zeros((side, side, 4), np.float32)
            pad[:crop.shape[0], :crop.shape[1]] = crop
            # 预乘后缩放，避免透明边缘发黑
            pm = pad.copy()
            pm[..., :3] *= pm[..., 3:4]
            small = np.stack([resize(pm[..., k], frame) for k in range(4)], -1)
            small[..., :3] /= np.maximum(small[..., 3:4], 1e-3)
            out[r * frame:(r + 1) * frame, c * frame:(c + 1) * frame] = np.clip(small, 0, 1)
    name = save(out, f"{id_}.png", "RGBA")
    return {"files": {"sheet": name}, "grid": [cols, rows], "frame": frame, "frames": cols * rows, "order": "左到右、上到下"}


def puppet_parts(id_, anchors):
    """白底纸片人部件 → 每件一张 RGBA（背景 = 与图像边缘连通的近白像素；纸边约 243，留在部件上）。
    anchors：部件名 → 它在原图里的大致中心（看图标注），每个连通块分给最近的锚点。
    同时算出关节点：top / bottom = 部件最上 / 最下 10% 像素的质心（部件 UV，0~1，y 向下）。"""
    rgb = load(id_)
    nearwhite = rgb.min(-1) > 0.975
    lab, _ = ndimage.label(nearwhite)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    fg = ndimage.binary_opening(~np.isin(lab, border[border > 0]), iterations=2)
    blab, items = blobs(fg, 2, len(anchors))
    free = dict(anchors)
    parts = {}
    for b in sorted(items, key=lambda b: -((b["x1"] - b["x0"]) * (b["y1"] - b["y0"]))):
        name = min(free, key=lambda k: (free[k][0] - b["cx"]) ** 2 + (free[k][1] - b["cy"]) ** 2)
        del free[name]
        pad = 6
        y0, y1 = max(0, b["y0"] - pad), min(rgb.shape[0], b["y1"] + pad)
        x0, x1 = max(0, b["x0"] - pad), min(rgb.shape[1], b["x1"] + pad)
        own = (blab[y0:y1, x0:x1] == b["lid"]) & fg[y0:y1, x0:x1]
        alpha = ndimage.gaussian_filter(own.astype(np.float32), 0.8)
        crop = np.concatenate([rgb[y0:y1, x0:x1], alpha[..., None]], -1)
        h, w = crop.shape[:2]
        ys, xs = np.nonzero(own)
        band = max(2, int(0.1 * h))
        def cen(sel):
            return [round(float(xs[sel].mean()) / w, 4), round(float(ys[sel].mean()) / h, 4)]
        top, bottom = cen(ys < ys.min() + band), cen(ys > ys.max() - band)
        small = np.stack([resize_to(crop[..., k], max(1, w // 2), max(1, h // 2)) for k in range(4)], -1)
        f = save(np.clip(small, 0, 1), f"{id_}_{name}.png", "RGBA")
        parts[name] = {"file": f, "src": [x0, y0, x1 - x0, y1 - y0], "size": [small.shape[1], small.shape[0]],
                       "top": top, "bottom": bottom}
    return {"files": {k: v["file"] for k, v in parts.items()}, "parts": parts, "found": len(items),
            "facing": "right", "pixelsPerMeter": "按身高缩放，见引擎 puppet.ts"}


# ---------- 程序生成：色调排线图 TAM ----------

def tam(size=512, tones=6, seed=3):
    """Praun et al. 2001 的色调排线图：逐级加笔画，暗一级包含亮一级的全部笔画（保证过渡时笔画不跳）。
    1–3 级只有横向排线，4–6 级加竖向交叉。笔画短（tile 的 8%~22%）、两头收尖、略带倾斜抖动。
    6 级拆成两张 RGB（各 3 级）。每笔只在自己的包围盒里算（环绕取下标），所以能画上万笔。"""
    rng = np.random.default_rng(seed)
    targets = np.linspace(0.06, 0.62, tones)          # 每级目标墨量（覆盖率）
    ink = np.zeros((size, size), np.float32)
    levels_ = []
    for t_i, target in enumerate(targets):
        cross = t_i >= 3
        tries = 0
        while ink.mean() < target and tries < 40000:
            tries += 1
            ang = (np.pi / 2 if cross and rng.random() < 0.5 else 0.0) + rng.normal(0, 0.05)
            length = rng.uniform(0.08, 0.22) * size
            width = rng.uniform(1.0, 1.7)
            cx, cy = rng.uniform(0, size, 2)
            d = np.array([np.cos(ang), np.sin(ang)], np.float32)
            r = int(length / 2 + width + 2)
            ys = np.arange(int(cy) - r, int(cy) + r + 1)
            xs = np.arange(int(cx) - r, int(cx) + r + 1)
            py, px = np.meshgrid(ys - cy, xs - cx, indexing="ij")
            along = px * d[0] + py * d[1]
            perp = -px * d[1] + py * d[0]
            taper = np.clip(1.0 - np.abs(along) / (length / 2), 0, 1) ** 0.35
            line = (np.clip(width * taper - np.abs(perp), 0, 1) * (np.abs(along) < length / 2)).astype(np.float32)
            iy, ix = np.ix_(ys % size, xs % size)
            ink[iy, ix] = np.maximum(ink[iy, ix], line * rng.uniform(0.75, 1.0))
        levels_.append(1.0 - ink.copy())
    a = np.stack(levels_[:3], -1)
    b = np.stack(levels_[3:6], -1)
    return {"files": {"tones123": save(a, "tam_123.png", "RGB"), "tones456": save(b, "tam_456.png", "RGB")},
            "tones": tones, "coverage": [float(1 - l.mean()) for l in levels_], "source": "程序生成"}


RECIPES = {
    "xuan_paper": lambda: tile_gray("xuan_paper"),
    "watercolor_cold": lambda: tile_height("watercolor_cold", normal=False),
    "watercolor_hot": lambda: tile_height("watercolor_hot", normal=False),
    "kraft_paper": lambda: tile_color("kraft_paper"),
    "silk_juan": lambda: tile_color("silk_juan"),
    "brush_strokes_a": lambda: stroke_atlas("brush_strokes_a", load("brush_strokes_a"), 2, 4, (512, 256), 0.002),
    "brush_marks_b": lambda: stroke_atlas("brush_marks_b", load("brush_marks_b"), 4, 4, (256, 256), 0.0008),
    "cun_pima": lambda: tile_gray("cun_pima", invert=True),
    "cun_fupi": lambda: tile_gray("cun_fupi", invert=True),
    "cun_midian": lambda: tile_gray("cun_midian", invert=True),
    "clay_fingerprint": lambda: tile_height("clay_fingerprint", strength=4.0),
    "knit_wool": lambda: tile_height_periodic("knit_wool", strength=5.0),
    "peel_mask": lambda: erosion_field("peel_mask"),
    "pixel_walk_32": lambda: pixel_sheet("pixel_walk_32", 16),
    "pixel_walk_64": lambda: pixel_sheet("pixel_walk_64", 24),
    "paper_puppet_parts": lambda: puppet_parts("paper_puppet_parts", {
        "head": (470, 363), "torso": (1029, 711), "upperArmBack": (1444, 473), "upperArmFront": (1835, 470),
        "forearmBack": (1480, 1054), "forearmFront": (1802, 1051),
        "thighBack": (340, 1538), "thighFront": (822, 1540), "shinBack": (1296, 1660), "shinFront": (1748, 1658)}),
    "jianzhi_window": lambda: papercut_mask("jianzhi_window"),
    "jianzhi_lattice": lambda: papercut_mask("jianzhi_lattice", tile=True),
    "fx_smoke": lambda: fx_sheet("fx_smoke"),
    "fx_explosion": lambda: fx_sheet("fx_explosion"),
    "fx_slash": lambda: fx_sheet("fx_slash"),
}
GENERATED = {"tam": tam}


def main(ids):
    ids = ids or [k for k in RECIPES if (RAW / f"{k}.png").exists()] + list(GENERATED)
    for id_ in ids:
        if id_ in GENERATED:
            meta = GENERATED[id_]()
            meta["id"] = id_
            (OUT / f"{id_}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
            print(json.dumps(meta, ensure_ascii=False))
            continue
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
