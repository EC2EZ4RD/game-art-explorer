"""
R4 参考库 · 手机 / 触屏（docs/ui-hud-plan.md）：GameUI 功能抽样里平台 = 手游的"战斗界面"截图（每款游戏一张，再补"主界面"），
看虚拟摇杆、按钮布局、安全区、单手操作。竖屏与横屏分开拼图（竖屏格子瘦高，避免 R2 里竖屏看不清的问题）。
运行：python scripts/refs/r4-mobile.py
输入：qa/refs-cache/gameui/function-samples.json（gameui-collect.ts 的功能抽样，含平台 / 尺寸 / 所属游戏）
输出：qa/refs-cache/r2/mobile/{list.json, img/, sheet-land-NN.jpg, sheet-port-NN.jpg}；list.json 与 R2 同格式，r2-cards.py mobile 直接建卡
缩略图只用本地已有的 qa/refs-cache/gameui/img/<图片 id>.jpg，本脚本不下载（GameUI 用户协议禁止复制、传播站内作品）；没有图的跳过。
只作本地学习参考，不分发。
"""
import json, os, shutil, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
GU = os.path.join(ROOT, 'qa', 'refs-cache', 'gameui')
OUT = os.path.join(ROOT, 'qa', 'refs-cache', 'r2', 'mobile')
IMG = os.path.join(OUT, 'img')
os.makedirs(IMG, exist_ok=True)

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

fs = json.load(open(os.path.join(GU, 'function-samples.json'), encoding='utf-8'))
picked, seen = [], set()
for func in ('战斗界面', '主界面'):
    for x in fs.get(func, []):
        a = x['article']
        if a.get('device') != '手游' or a['id'] in seen:
            continue
        seen.add(a['id'])
        picked.append({'func': func, **x})
# 先全部战斗界面，再用主界面补到 48 款
picked = [p for p in picked if p['func'] == '战斗界面'] + [p for p in picked if p['func'] == '主界面']
picked = picked[:48]

games = []
missing = 0
for p in picked:
    src = os.path.join(GU, 'img', f"{p['id']}.jpg")
    if not os.path.exists(src):
        print('本地没有缩略图，跳过：', p['article']['name'], os.path.relpath(src, ROOT))
        missing += 1
        continue
    dst = os.path.join(IMG, f"{p['id']}.jpg")
    if not os.path.exists(dst):
        shutil.copyfile(src, dst)
    a = p['article']
    games.append({'key': f"gameui:{a['id']}", 'name': a['name'], 'gameui': a['id'], 'genre': 'mobile', 'tier': 'GameUI', 'src': 'gameui',
                  'style': a.get('style'), 'device': a.get('device'), 'func': p['func'], 'portrait': p['height'] > p['width'],
                  'links': {'gameui': f"https://www.gameui.net/game/{a['id']}"}, 'files': [dst]})
for i, g in enumerate(games):
    g['n'] = i + 1
json.dump(games, open(os.path.join(OUT, 'list.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

font = cjk_font(15)
def sheet(items, name, cols, cw, ch):
    for s in range(0, len(items), cols * 2):
        part = items[s:s + cols * 2]
        cv = Image.new('RGB', (cols * (cw + 6), 2 * (ch + 24)), '#151515')
        d = ImageDraw.Draw(cv)
        for i, g in enumerate(part):
            im = Image.open(g['files'][0]).convert('RGB')
            im.thumbnail((cw, ch))
            x, y = (i % cols) * (cw + 6), (i // cols) * (ch + 24)
            cv.paste(im, (x + (cw - im.width) // 2, y + 22))
            d.text((x + 2, y + 2), f"{g['n']}. {g['name'][:16]} · {g['func']}", fill='#ffd36b', font=font)
        cv.save(os.path.join(OUT, f'{name}-{s // (cols * 2) + 1:02d}.jpg'), quality=88)
port = [g for g in games if g['portrait']]
land = [g for g in games if not g['portrait']]
sheet(port, 'sheet-port', 6, 300, 600)
sheet(land, 'sheet-land', 3, 620, 300)
print(len(games), 'games;', len(port), 'portrait,', len(land), 'landscape;', missing, 'skipped (no local image)')
