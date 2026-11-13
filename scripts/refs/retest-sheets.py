"""
参数体系复测（docs/survey/09-ui-param-system.md 第 8 节）：抽 30 条从没用来设计体系的参考，拼对照图，逐条编码。
运行：python scripts/refs/retest-sheets.py
  - Interface In Game：15 款没浏览过的游戏，人工逐页挑 1 张（名单见下方 IIG）
  - GameUI：15 种不同界面功能，各取 1 张"每种功能前 36 张之外"的截图（体系设计时没看过），不同游戏
    （按 qa/refs-cache/gameui/function-samples.json 挑，gameui-collect.ts 生成；没有这个文件就跳过 GameUI）
本脚本不下载图片（两站的用户协议都不允许爬取或转存站内作品），只用本地已有的图：
  qa/refs-cache/retest/img/iig__<slug>__<文件名> 与 gameui__<图片 id>.jpg；没有的在对照图里标"缺图"，序号不变。
输出：qa/refs-cache/retest/{sheet-1..4.jpg,refs.json}
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'qa', 'refs-cache', 'retest')
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

IIG = '''stellaris/stellaris-planet-summary.jpg
planet-zoo/planet-zoo-animal-information.jpg
total-war-warhammer-ii/total-war-warhammer-ii-technology.jpg
gwent-the-witcher-card-game/gwent-the-witcher-card-game-deck-builder.jpg
slay-the-spire-2/slay-the-spire-2-hud.png
trackmania-turbo/trackmania-turbo-new-record.jpg
hidden-folks/hidden-folks-find-targets.jpg
portal-2/portal-2-chapter.jpg
alan-wake-ii/alan-wake-ii-case-board.png
god-of-war/god-of-war-boss-fight.jpg
horizon-zero-dawn/horizon-zero-dawn-in-game.jpg
celeste/celeste-postcard-tip.jpg
dragon-quest-builders-2/dragon-quest-builders-2-make-a-room-complete.jpg
team-fortress-2/team-fortress-2-mission-complete.jpg
a-short-hike/a-short-hike-buy-golden-feather.png'''.split()

GAMEUI_FUNCS = ['战斗界面', '主界面', '背包', '设置', '地图', '建造/家园', '卡组/卡牌', 'NPC对话', '结算', '商城', '技能', '任务', '图鉴', '角色', '排行榜']

refs, missing = [], []
for path in IIG:
    out = os.path.join(IMG, 'iig__' + path.replace('/', '__').rsplit('.', 1)[0] + '.' + path.rsplit('.', 1)[1])
    if not os.path.exists(out):
        missing.append(out)
    refs.append({'src': 'iig', 'id': path.split('/')[0], 'file': out, 'label': path.split('/')[0]})

fp = os.path.join(ROOT, 'qa', 'refs-cache', 'gameui', 'function-samples.json')
fs = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
if not fs:
    print('没有 qa/refs-cache/gameui/function-samples.json（gameui-collect.ts 生成），跳过 GameUI 的样本')
used_games = set()
for fn in GAMEUI_FUNCS:
    rows = fs.get(fn, [])[36:]   # 前 36 张做过横向对照，这里只取之后的
    pick = next((r for r in rows if (r.get('article') or {}).get('id') not in used_games and r.get('content')), None)
    if not pick:
        continue
    used_games.add((pick.get('article') or {}).get('id'))
    out = os.path.join(IMG, f"gameui__{pick['id']}.jpg")
    if not os.path.exists(out):
        missing.append(out)
    refs.append({'src': 'gameui', 'id': str(pick['id']), 'file': out, 'label': f"{fn}·{(pick.get('article') or {}).get('name', '')[:12]}"})

if missing:
    print(f'本地没有 {len(missing)} 张图（本脚本不下载），对照图里标"缺图"：')
    for m in missing:
        print('  ', os.path.relpath(m, ROOT))
json.dump(refs, open(os.path.join(OUT, 'refs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
FONT = cjk_font(22)
CW, CH = 800, 470
for s in range(0, len(refs), 8):
    chunk = refs[s:s + 8]
    rows = (len(chunk) + 1) // 2
    sheet = Image.new('RGB', (CW * 2, CH * rows), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for k, r in enumerate(chunk):
        x, y = (k % 2) * CW, (k // 2) * CH
        try:
            im = Image.open(r['file']).convert('RGB')
            im.thumbnail((CW - 6, CH - 34))
            sheet.paste(im, (x + 3, y + 32))
        except Exception as e:
            d.text((x + 10, y + 100), f'缺图 {e}', fill=(255, 80, 80), font=FONT)
        d.text((x + 6, y + 2), f"{s + k + 1}. {r['label']}", fill=(255, 220, 120), font=FONT)
    f = os.path.join(OUT, f'sheet-{s // 8 + 1}.jpg')
    sheet.save(f, quality=86)
    print(f, sheet.size)
print(len(refs), 'refs')
