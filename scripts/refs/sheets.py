"""
按组拼对照图（给模型看图用：一张图装 24 张缩略图，比逐张看省得多）。
运行：python scripts/refs/sheets.py <列表名> [--per=24] [--cols=6] [--groups-per-sheet=1]
  列表：qa/refs-cache/lists/<列表名>.json（build-lists.py 生成）
  缩略图（只读本地已有的图，本脚本不下载）：GameUI 在 qa/refs-cache/gameui/img/<id>.jpg，Steam 在 qa/refs-cache/steam/img/<id>.jpg
输出：qa/refs-cache/sheets/<列表名>/<编号>.jpg 与 index.json（每张对照图里按顺序是哪些图片 id、属于哪组）
每格左上角标图片 id，方便引用具体截图。缺图的格子跳过。
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()

def cjk_font(size):
    """中文字体：先看环境变量 GAE_CJK_FONT，再试各系统常见字体，都没有就用 Pillow 自带字体（中文可能显示不出来）"""
    for f in (os.environ.get('GAE_CJK_FONT'), 'C:/Windows/Fonts/msyh.ttc', '/System/Library/Fonts/PingFang.ttc',
              '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc'):
        if f and os.path.exists(f):
            try:
                return ImageFont.truetype(f, size)
            except OSError:
                continue
    print('没找到中文字体，改用 Pillow 自带字体（中文显示不出来，Pillow 10.1 以前的版本遇到中文会报错）；可设环境变量 GAE_CJK_FONT=<字体文件路径>', file=sys.stderr)
    try:
        return ImageFont.load_default(size=size)   # Pillow ≥ 10.1
    except TypeError:
        return ImageFont.load_default()

def arg(name, default):
    for a in sys.argv:
        if a.startswith(f'--{name}='):
            return type(default)(a.split('=', 1)[1])
    return default

name = next(a for a in sys.argv[1:] if not a.startswith('--'))
PER, COLS = arg('per', 24), arg('cols', 6)
GPS = arg('groups-per-sheet', 1)
MAXG = arg('max-per-group', 0)        # 每组最多取多少格（0 = 不限）
TALL = arg('tall-chunks', 3)          # 竖长图（设计师作品常见长图）切成几段横图，每段一格
CW, CH, HEAD = 320, 200, 28
FONT = cjk_font(14)
FONT_H = cjk_font(18)
IMG_DIRS = [os.path.join(ROOT, 'qa', 'refs-cache', 'gameui', 'img'), os.path.join(ROOT, 'qa', 'refs-cache', 'steam', 'img')]
OUT = os.path.join(ROOT, 'qa', 'refs-cache', 'sheets', name)
os.makedirs(OUT, exist_ok=True)

items = json.load(open(os.path.join(ROOT, 'qa', 'refs-cache', 'lists', f'{name}.json'), encoding='utf-8'))
def path_of(i):
    for d in IMG_DIRS:
        p = os.path.join(d, f"{i['id']}.jpg")
        if os.path.exists(p):
            return p
    return None

def cells_of(iid, p):
    # 竖长图：按 16:10 切段，取前 TALL 段（长图一缩到格子里就看不清了）
    try:
        w, h = Image.open(p).size
    except Exception:
        return []
    if h <= w * 1.2 or TALL <= 1:
        return [(iid, p, None)]
    ch = int(w * 0.625)
    n = min(TALL, max(1, h // ch))
    return [(f'{iid}#{k + 1}', p, (0, k * ch, w, (k + 1) * ch)) for k in range(n)]

groups = {}
for it in items:
    p = path_of(it)
    if p:
        g = groups.setdefault(it['group'], {'label': it.get('label', ''), 'items': []})
        g['items'].extend(cells_of(it['id'], p))
if MAXG:
    for g in groups.values():
        g['items'] = g['items'][:MAXG]

# 每组切成若干张（每张 PER 格）；groups-per-sheet > 1 时把小组拼在一起（每组各占 PER // GPS 格）
pages = []
keys = list(groups)
if GPS > 1:
    per_g = PER // GPS
    for k in range(0, len(keys), GPS):
        cells = []
        for g in keys[k:k + GPS]:
            cells += [(g, groups[g]['label'], i, p, box) for i, p, box in groups[g]['items'][:per_g]]
        pages.append(cells)
else:
    for g in keys:
        its = groups[g]['items']
        for s in range(0, len(its), PER):
            pages.append([(g, groups[g]['label'], i, p, box) for i, p, box in its[s:s + PER]])

index = []
for n, cells in enumerate(pages, 1):
    rows = (len(cells) + COLS - 1) // COLS
    sheet = Image.new('RGB', (CW * COLS, HEAD + CH * rows), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    title = ' / '.join(dict.fromkeys(f'{g} {lab}'[:40] for g, lab, _, _, _ in cells))
    d.text((6, 4), title[:150], fill=(255, 220, 120), font=FONT_H)
    for k, (g, lab, iid, p, box) in enumerate(cells):
        x, y = (k % COLS) * CW, HEAD + (k // COLS) * CH
        try:
            im = Image.open(p).convert('RGB')
            if box:
                im = im.crop(box)
            im.thumbnail((CW - 4, CH - 4))
            sheet.paste(im, (x + (CW - im.width) // 2, y + (CH - im.height) // 2))
        except Exception:
            continue
        d.rectangle([x, y, x + 8 + 8 * len(str(iid)), y + 18], fill=(0, 0, 0))
        d.text((x + 3, y + 1), str(iid), fill=(255, 255, 255), font=FONT)
    f = os.path.join(OUT, f'{n:03d}.jpg')
    sheet.save(f, quality=80)
    index.append({'sheet': os.path.relpath(f, ROOT).replace('\\', '/'), 'cells': [{'group': g, 'label': lab, 'id': iid} for g, lab, iid, _, _ in cells]})
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{name}: {len(pages)} 张对照图，{sum(len(c) for c in pages)} 格 → {OUT}')
