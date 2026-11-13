"""两张对照图逐格比较：python scripts/refs/imgdiff.py a.png b.png [cols] [cellW] [labels...]
输出每格的差异像素占比与最大差值，并把差异放大图存到 qa/<b>-diff.png。"""
import sys
from PIL import Image, ImageChops

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
cw = int(sys.argv[4]) if len(sys.argv) > 4 else 800
labels = sys.argv[5:]
if a.size != b.size:
    print('size differs', a.size, b.size)
    sys.exit(1)
d = ImageChops.difference(a, b)
rows = []
ch = None
# 每格高度 = (图高 / 行数)，行数从标签数推
n = len(labels) or cols
nrows = (n + cols - 1) // cols
ch = a.size[1] // nrows
for i in range(n):
    x, y = (i % cols) * cw, (i // cols) * ch
    cell = d.crop((x, y + 20, x + cw, y + ch))
    px = cell.load()
    W, H = cell.size
    bad = 0
    mx = 0
    for yy in range(0, H):
        for xx in range(0, W):
            p = px[xx, yy]
            m = max(p)
            if m > 8:
                bad += 1
            if m > mx:
                mx = m
    print(f'{labels[i] if labels else i:16s} diff>8: {100 * bad / (W * H):6.3f}%  max {mx}')
out = sys.argv[2].replace('.png', '-diff.png')
d.point(lambda v: min(255, v * 8)).save(out)
print('saved', out)
