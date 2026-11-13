"""品类布局对照图配参考截图（docs/ui-hud-plan.md M7 / M9 验收）：
每行 = 我们的布局（取 qa/m7-layouts-*.png 第一列，扁平皮肤）+ 布局预设 refs 里能在本地找到的参考截图（最多 3 张）+ 引用的 A 节规则。
运行：python scripts/refs/layout-ref-sheet.py <输出名> <对照图前缀> <布局id,…>
例：python scripts/refs/layout-ref-sheet.py m7-layouts-refs m7-layouts layout.strategyTurn,layout.strategyRts,…
"""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec_mod = importlib.util.spec_from_file_location('skinref', Path(__file__).parent / 'skin-ref-sheet.py')
skinref = importlib.util.module_from_spec(spec_mod)
spec_mod.loader.exec_module(skinref)


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


ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'qa'
spec = json.loads((ROOT / 'src/content/uiSpec.gen.json').read_text(encoding='utf-8'))
PRESETS = {p['id']: p for p in spec['presets']}
# 名字对不上案例库的参考：直接用 Steam 商店截图（本地学习用）
ALIAS = {'Witcher 3': (292030, 1), 'RimWorld': (294100, 1), 'Oxygen Not Included': (457140, 0), 'Going Medieval': (1029780, 1)}
out_name, prefix, ids = sys.argv[1], sys.argv[2], sys.argv[3].split(',')

# 对照图：3 列（皮肤），每格 520 宽 + 20 标签；第一列是扁平皮肤；行序 = 布局序，每张 5 行
sheets = sorted(QA.glob(f'{prefix}-*.png'))
cells = []
for sh in sheets:
    im = Image.open(sh).convert('RGB')
    rows = 5
    ch = im.height // rows
    for r in range(rows):
        cells.append(im.crop((0, r * ch + 20, 520, (r + 1) * ch)))
font = cjk_font(15)
H = 300
REF_W = 420
canvas = Image.new('RGB', (520 + 12 + 3 * (REF_W + 6) + 10, len(ids) * (H + 26)), '#1d1d1d')
d = ImageDraw.Draw(canvas)
for i, lid in enumerate(ids):
    p = PRESETS[lid]
    y = i * (H + 26)
    rule = p.get('rules') or ''
    d.text((6, y + 3), f"{p['label']}（{lid}）· 规则 {rule} · 参考：{'、'.join(p.get('refs') or [])}"[:90], fill='#fff', font=font)
    if i < len(cells):
        c = cells[i].copy()
        c.thumbnail((520, H))
        canvas.paste(c, (0, y + 24))
    x = 520 + 12
    got = []
    for ref in p.get('refs') or []:
        hits = skinref.find(ref)
        if not hits and ref in ALIAS:
            hits = [h for h in [QA / ('refs-cache/steam/img/s%d_%d.jpg' % ALIAS[ref])] if h.exists()]
        for f in hits:
            if f not in got:
                got.append(f)
    for f in got[:3]:
        im = Image.open(f).convert('RGB')
        im.thumbnail((REF_W, H))

        canvas.paste(im, (x, y + 24))
        x += REF_W + 6
    if len(got) < 2:
        d.text((x + 6, y + 120), f'（本地参考图 {len(got)} 张）', fill='#f96', font=font)
    print(lid, len(got))
canvas.save(QA / f'{out_name}.png')
print('saved', out_name)
