"""皮肤对照图配参考截图（docs/ui-hud-plan.md M3b 验收）：
每行 = 我们的皮肤（取 qa/m3b-skins-1/2.png 对应行的状态面板与对话框）+ 皮肤预设 refs 里能在本地找到的参考图（最多 3 张）。
参考图来源（都只在本地，不分发）：
  sAPPID_N   → qa/refs-cache/steam/img/sAPPID_N.jpg
  GameUI#ID  → qa/refs-cache/gameui/img/ID.jpg
  游戏名     → Interface In Game 手挑原图 qa/refs-cache/iig/img/<slug>__*.jpg → 案例库 public/cases/<appid>/t*.jpg → Steam 缓存
运行：python scripts/refs/skin-ref-sheet.py
"""
import json
import os
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'qa'
spec = json.loads((ROOT / 'src/content/uiSpec.gen.json').read_text(encoding='utf-8'))
skins = [p for p in spec['presets'] if p['kind'] == 'skin']

cases = json.loads((ROOT / 'src/content/cases/cases.json').read_text(encoding='utf-8'))
cases = cases if isinstance(cases, list) else cases['cases']
name2app = {}
for c in cases:
    for n in (c.get('name'), c.get('nameZh')):
        if n and c.get('appid'):
            name2app[n.lower()] = c['appid']
lst = QA / 'refs-cache/lists/steam-iig.json'
if lst.exists():
    for g in json.loads(lst.read_text(encoding='utf-8')):
        if isinstance(g, dict) and g.get('appid') and g.get('name'):
            name2app.setdefault(g['name'].lower(), g['appid'])

# 案例库与 IIG 名单里没有、为 M3b 单独取了商店截图的游戏
for n, a in {'papers, please': 239030, 'bioshock': 409710, 'grim fandango': 316790, 'persona 5': 1687950, 'arma 3': 107410, 'xcom 2': 268500, 'xcom': 268500, 'the sims 3': 47890}.items():
    name2app[n] = a

iig = sorted((QA / 'refs-cache/iig/img').glob('*.jpg')) + sorted((QA / 'refs-cache/iig/img').glob('*.png'))


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


def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def clean(name: str) -> str:
    name = re.sub(r'[（(].*?[)）]', '', name)
    return re.sub(r'\s+s\d+_\d+$', '', name).strip()


def find(ref: str) -> list[Path]:
    out: list[Path] = []
    m = re.search(r's(\d+)_(\d+)', ref)
    if m:
        p = QA / f'refs-cache/steam/img/s{m.group(1)}_{m.group(2)}.jpg'
        if p.exists():
            out.append(p)
    m = re.match(r'GameUI#(\d+)', ref)
    if m:
        p = QA / f'refs-cache/gameui/img/{m.group(1)}.jpg'
        if p.exists():
            out.append(p)
        return out
    n = clean(ref)
    if not n:
        return out
    sl = slug(n)
    if sl:
        out += [p for p in iig if p.name.startswith(sl + '__')][:2]
    app = name2app.get(n.lower())
    if app and len(out) < 2:
        for k in ('t2', 't1', 't3'):
            p = ROOT / f'public/cases/{app}/{k}.jpg'
            if p.exists():
                out.append(p)
                break
        else:
            for k in (1, 0):
                p = QA / f'refs-cache/steam/img/s{app}_{k}.jpg'
                if p.exists():
                    out.append(p)
                    break
    return out


def main():
    ROW = 154
    LABEL = 170
    H = 150


    def ours(i: int) -> Image.Image:
        sheet = Image.open(QA / ('m3b-skins-1.png' if i < 19 else 'm3b-skins-2.png')).convert('RGB')
        y = (i % 19) * ROW
        status = sheet.crop((LABEL, y, LABEL + 240, y + H))
        x_dialog = LABEL + 240 + 8 + 120 + 8 + 240 + 8
        dialog = sheet.crop((x_dialog, y, x_dialog + 560, y + H))
        im = Image.new('RGB', (240 + 4 + 560, H), '#222')
        im.paste(status, (0, 0))
        im.paste(dialog, (244, 0))
        return im


    font = cjk_font(14)

    REF_W = 267  # 16:9 at height 150
    missing = []
    for part, chunk in enumerate([skins[:19], skins[19:]], 1):
        W = LABEL + 804 + 12 + 3 * (REF_W + 6)
        canvas = Image.new('RGB', (W, len(chunk) * (H + 22)), '#1d1d1d')
        d = ImageDraw.Draw(canvas)
        for j, sk in enumerate(chunk):
            i = (part - 1) * 19 + j
            y = j * (H + 22)
            d.text((6, y + 4), f"{sk['label']}\n{sk['id']}\n{sk.get('browse', '')}", fill='#fff', font=font)
            canvas.paste(ours(i), (LABEL, y + 20))
            x = LABEL + 804 + 12
            refs = sk.get('refs') or []
            got: list[tuple[str, Path]] = []
            for r in refs:
                for p in find(r):
                    if p not in [g[1] for g in got]:
                        got.append((r, p))
            for r, p in got[:3]:
                try:
                    im = Image.open(p).convert('RGB')
                except OSError:
                    continue
                im.thumbnail((REF_W * 2, H))
                im = im.crop((0, 0, min(im.width, REF_W), H)) if im.width > REF_W else im
                canvas.paste(im, (x, y + 20))
                d.text((x + 3, y + 2), clean(r)[:22], fill='#9cf', font=font)
                x += REF_W + 6
            if not got:
                missing.append(f"{sk['id']}: {', '.join(refs)}")
                d.text((x, y + 60), '（本地没有参考图：' + '、'.join(refs)[:40] + '）', fill='#f96', font=font)
        out = QA / f'm3b-skins-refs-{part}.png'
        canvas.save(out)
        print('saved', out)
    print('无本地参考图的皮肤：', len(missing))
    for m in missing:
        print('  ', m)


if __name__ == '__main__':
    main()
