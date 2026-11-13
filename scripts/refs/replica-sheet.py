"""
R5 复刻库对照图：每款游戏一张，左边参考截图（本地，只作学习参考、不分发）、右边探索台按复刻配方渲染的同一界面。

输入：src/content/replicas/*.json（每款一份复刻配方，screens[].key / screens[].ref）
      qa/replicas/<复刻 id>__<界面 key>.png（浏览器里 __gae.replicaShots 渲染，16:9）
      qa/replicas/strips/<复刻 id>__<界面 key>.png（可选，__gae.replicaStrip 拍的逐帧条带，M12c-14）：有就拼在那一屏的下方（动效缺口按它评分）
输出：qa/replicas/sheets/<复刻 id>.jpg（每个界面一行：参考 | 复刻，有条带时下面再加一行条带）与 qa/replicas/sheets/index.json

用法：python -X utf8 scripts/refs/replica-sheet.py [复刻 id ...]
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REP = ROOT / 'src/content/replicas'
SHOTS = ROOT / 'qa/replicas'
OUT = SHOTS / 'sheets'
STRIPS = SHOTS / 'strips'
W, H, LAB = 800, 450, 26


def font(size: int):
    """中文字体：先看环境变量 GAE_CJK_FONT，再试各系统常见字体，都没有就用 Pillow 自带字体（中文可能显示不出来）"""
    for f in (os.environ.get('GAE_CJK_FONT'), 'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf', '/System/Library/Fonts/PingFang.ttc',
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


F = font(16)


def fit(path: Path) -> Image.Image:
    """按 16:9 cover 裁到 W×H；文件不存在时返回带字的灰块"""
    cell = Image.new('RGB', (W, H), (40, 40, 40))
    if not path or not path.exists():
        ImageDraw.Draw(cell).text((12, 12), f'缺：{path.name if path else "无参考图"}', fill=(200, 120, 120), font=F)
        return cell
    im = Image.open(path).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def strip_of(rep_id: str, key: str):
    """这一屏的逐帧条带（M12c-14）：按整张对照图的宽缩放；没有时 None"""
    p = STRIPS / f'{rep_id}__{key}.png'
    if not p.exists():
        return None
    im = Image.open(p).convert('RGB')
    s = (W * 2 + 12) / im.width
    return im.resize((W * 2 + 12, max(1, round(im.height * s))), Image.LANCZOS)


def sheet(rep: dict) -> dict:
    rows = [s for s in rep.get('screens', [])]
    strips = [strip_of(rep['id'], s['key']) for s in rows]
    heights = [H + LAB + ((st.height + LAB) if st else 0) for st in strips]
    img = Image.new('RGB', (W * 2 + 12, max(H + LAB, sum(heights)) + LAB), (24, 24, 24))
    d = ImageDraw.Draw(img)
    d.text((8, 4), f"{rep.get('name', rep['id'])}  ·  {rep['id']}  ·  {rep.get('genre', '')}  ·  {rep.get('family', '')}", fill=(255, 255, 255), font=F)
    out_rows = []
    for i, s in enumerate(rows):
        y = LAB + sum(heights[:i])
        ref = ROOT / s['ref'] if s.get('ref') else None
        ours = SHOTS / f"{rep['id']}__{s['key']}.png"
        tag = '（凭记忆编码，无参考图）' if not s.get('ref') else ''
        d.text((8, y + 4), f"{s['key']} · 参考 {tag}", fill=(220, 220, 220), font=F)
        d.text((W + 20, y + 4), f"{s['key']} · 探索台复刻", fill=(220, 220, 220), font=F)
        img.paste(fit(ref), (0, y + LAB - 2))
        img.paste(fit(ours), (W + 12, y + LAB - 2))
        st = strips[i]
        if st:
            sim = s.get('sim') or {}
            d.text((8, y + H + LAB + 2), f"{s['key']} · 逐帧条带 {sim.get('demo') or sim.get('pose') or ''}", fill=(220, 220, 220), font=F)
            img.paste(st, (0, y + H + LAB * 2 - 2))
        out_rows.append({'key': s['key'], 'ref': s.get('ref'), 'ours': str(ours.relative_to(ROOT)).replace('\\', '/'), 'oursExists': ours.exists(), 'strip': bool(st)})
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / f"{rep['id']}.jpg"
    img.save(p, quality=86)
    return {'id': rep['id'], 'sheet': str(p.relative_to(ROOT)).replace('\\', '/'), 'rows': out_rows}


def main():
    want = set(sys.argv[1:])
    index = []
    for f in sorted(REP.glob('*.json')):
        rep = json.loads(f.read_text(encoding='utf-8'))
        if want and rep['id'] not in want:
            continue
        index.append(sheet(rep))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(index)} 张对照图 → {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
