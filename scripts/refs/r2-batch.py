"""
R2 建卡的取材：一批游戏 → 每款 6 张截图 → 对照图（每张 6 款，每行一款）。
运行：python scripts/refs/r2-batch.py <批次名>
  批次 1（strategy）：R1 名单里主品类为 策略 / 建造 / 工厂 的游戏 + Interface In Game 浏览过但不在 R1 的同类 + GameUI 热门策略 / 模拟经营 / 塔防 / 即时战略手游 20 款
  批次 3（life）：养成 / 解谜 / 叙事 + 恐怖 / 生存 / 沙盒，每品类按证据档与好评数取前 16；GameUI 恋爱养成 / 消除 / 桌游棋牌 14 款
  批次 4（card）：卡牌 / 竞速 / 射击 + 平台跳跃，同上；GameUI 卡牌 / 射击 / 竞速 / 音乐 / 格斗 / 体育 18 款
  批次 2（arpg）：R1 名单里主品类为 探索 / 角色扮演 / 动作 的 A 档全部 + B 档按好评数前 45 + IIG 浏览过的同类（用手挑原图）
                 + GameUI 热门角色扮演 / 动作 / MMORPG / 冒险手游 18 款
截图：Steam 商店缩略图 600x338（案例库与 IIG 已缓存的先用；其余调 appdetails，1.5 秒一次）。
  GameUI 的游戏只按本地元数据 qa/refs-cache/gameui/games.json（gameui-collect.ts 生成）挑选；本脚本不下载 GameUI 图片
  （站方用户协议禁止复制、传播站内作品），只用本地已有的 qa/refs-cache/r2/<批次>/img/gameui_<游戏 id>_<序号>.jpg，没有的跳过、不进对照图。
  IIG 手挑原图（第 2 批起）也只读本地已有的 qa/refs-cache/iig/img/<slug>__*.jpg，不下载。
输出：qa/refs-cache/r2/<批次>/{list.json, img/, sheet-NN.jpg, index.json}
只作本地学习参考，不分发。
"""
import glob, json, os, re, subprocess, sys, time, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
BATCH = sys.argv[1] if len(sys.argv) > 1 else 'strategy'
OUT = os.path.join(ROOT, 'qa', 'refs-cache', 'r2', BATCH)
IMG = os.path.join(OUT, 'img')
os.makedirs(IMG, exist_ok=True)
UA = 'game-art-explorer-research/0.1'
GENRES = {'strategy': {'strategy', 'builder', 'factory'}, 'arpg': {'explore', 'rpg', 'action'},
          'life': {'life', 'puzzle', 'narrative', 'horror', 'survival', 'sandbox'}, 'card': {'card', 'racing', 'shooter', 'platformer'}}[BATCH]
PER_GAME = 6

def jload(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))

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

# ---------- 选游戏 ----------
games = []
cands = [c for c in jload('docs/survey/data/ui-ref-candidates.json')['candidates'] if (c.get('genres') or {}).get('primary') in GENRES and c.get('appid')]
pos = lambda c: ((c.get('reviews') or {}).get('positive') or 0)
if BATCH == 'arpg':
    cands = [c for c in cands if c['evidence']['tier'] == 'A'] + sorted([c for c in cands if c['evidence']['tier'] == 'B'], key=pos, reverse=True)[:45]
elif BATCH in ('life', 'card'):
    # 第 3 / 4 批：每个品类按证据档（A→E）再按好评数排，取前 16 款（品类少于 16 款就全取）
    tier_rank = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
    picked = []
    for gname in sorted(GENRES):
        lst = sorted([c for c in cands if c['genres']['primary'] == gname], key=lambda c: (tier_rank.get(c['evidence']['tier'], 9), -pos(c)))
        picked += lst[:16]
    cands = picked
for c in cands:
    games.append({'key': f"steam:{c['appid']}", 'name': c['name'], 'appid': c['appid'], 'genre': c['genres']['primary'], 'tier': c['evidence']['tier'], 'src': 'r1'})
have = {g['appid'] for g in games}
EXTRA_IIG = {} if BATCH != 'strategy' else {'anno-1800': 'builder', 'frostpunk': 'builder', 'sid-meiers-civilization-vi': 'strategy', 'cities-skylines': 'builder', 'xcom-2': 'strategy',
             'stellaris': 'strategy', 'planet-zoo': 'builder', 'total-war-warhammer-ii': 'strategy', 'planet-coaster': 'builder', 'bad-north': 'strategy', 'mini-metro': 'builder'}
for g in jload('docs/survey/data/iig-games.json')['games']:
    if g['slug'] in EXTRA_IIG:
        appid = (g['r1'] or {}).get('appid') or (g['steam'] or {}).get('appid')
        if appid and appid not in have:
            games.append({'key': f'steam:{appid}', 'name': (g['steam'] or g['r1'] or {}).get('name', g['name']), 'appid': appid, 'genre': EXTRA_IIG[g['slug']], 'tier': 'IIG', 'src': 'iig', 'iig': g['url']})
            have.add(appid)
# 第 2 批起：IIG 人工浏览过的同品类游戏，直接用手挑的原图（qa/refs-cache/iig/img/<slug>__*.jpg）放在最前面
IIG_LOCAL = {}
if BATCH != 'strategy':
    for g in jload('docs/survey/data/iig-browse-notes.json')['games']:
        if g.get('genre') not in GENRES:
            continue
        files = sorted(glob.glob(os.path.join(ROOT, 'qa', 'refs-cache', 'iig', 'img', g['slug'] + '__*')))
        if not files:
            continue
        hit = next((x for x in games if x['name'].lower().replace(':', '').startswith(g['slug'].replace('-', ' ')[:10])), None)
        if hit:
            IIG_LOCAL[hit['key']] = files
            hit['iig'] = g['url']
        else:
            key = f"iig:{g['slug']}"
            games.append({'key': key, 'name': g['slug'].replace('-', ' ').title(), 'genre': g['genre'], 'tier': 'IIG', 'src': 'iig', 'iig': g['url']})
            IIG_LOCAL[key] = files
gp = os.path.join(ROOT, 'qa', 'refs-cache', 'gameui', 'games.json')
gd = json.load(open(gp, encoding='utf-8')) if os.path.exists(gp) else []
if not gd:
    print('没有 qa/refs-cache/gameui/games.json（gameui-collect.ts 生成），这一批不加 GameUI 的游戏')
score = lambda x: (x.get('collect_num') or 0) * 3 + (x.get('praise') or 0) * 5 + (x.get('see') or 0) / 100
GU = {'strategy': {'策略游戏': 'strategy', '模拟经营': 'builder', '塔防': 'strategy', '即时战略': 'strategy'},
      'arpg': {'角色扮演': 'rpg', '动作游戏': 'action', 'MMORPG': 'rpg', '冒险游戏': 'explore'},
      'life': {'恋爱养成': 'life', '消除游戏': 'puzzle', '桌游棋牌': 'puzzle'},
      'card': {'卡牌': 'card', '射击游戏': 'shooter', '竞速游戏': 'racing', '音乐游戏': 'rhythm', '格斗游戏': 'fighting', '体育游戏': 'sports'}}[BATCH]
GU_N = {'strategy': 20, 'arpg': 18, 'life': 14, 'card': 18}[BATCH]
mob = sorted([x for x in gd if (x.get('category') or {}).get('name') in GU], key=score, reverse=True)
seen_names = set()
for x in mob:
    base = x['name'].split('（')[0].split('(')[0].strip()
    if base in seen_names:
        continue
    seen_names.add(base)
    games.append({'key': f"gameui:{x['id']}", 'name': x['name'], 'gameui': x['id'], 'genre': GU[x['category']['name']], 'tier': 'GameUI', 'src': 'gameui', 'style': x.get('style'), 'device': x.get('device')})
    if sum(1 for g in games if g['src'] == 'gameui') >= GU_N:
        break
print(len(games), 'games', {s: sum(1 for g in games if g['src'] == s) for s in ('r1', 'iig', 'gameui')})

# ---------- 截图地址 ----------
cases = {}
cp = os.path.join(ROOT, 'scripts', 'cases', 'cache', 'screens.json')
if os.path.exists(cp):
    cases = json.load(open(cp, encoding='utf-8')).get('apps', {})
last = [0.0]
def appdetails(appid):
    f = os.path.join(ROOT, 'qa', 'refs-cache', 'steam', f'appdetails_{appid}.json')
    if not os.path.exists(f):
        wait = last[0] + 1.5 - time.time()
        if wait > 0:
            time.sleep(wait)
        last[0] = time.time()
        try:
            req = urllib.request.Request(f'https://store.steampowered.com/api/appdetails?appids={appid}&l=english', headers={'User-Agent': UA})
            data = urllib.request.urlopen(req, timeout=30).read()
            open(f, 'wb').write(data)
        except Exception as e:
            print('appdetails fail', appid, e)
            return []
    d = json.load(open(f, encoding='utf-8')).get(str(appid), {}).get('data') or {}
    return [s['path_thumbnail'] for s in d.get('screenshots', [])]

def gameui_local(gid):
    """GameUI 的截图只用本地已有的 img/gameui_<id>_<序号>.jpg（不下载，见文件头）"""
    files = [f for f in glob.glob(os.path.join(IMG, f'gameui_{gid}_*.jpg')) if re.search(r'_\d+\.jpg$', f)]
    return sorted(files, key=lambda f: int(re.search(r'_(\d+)\.jpg$', f).group(1)))[:PER_GAME]

for g in games:
    if g['key'] in IIG_LOCAL and 'appid' not in g:
        g['urls'] = []
        g['links'] = {'iig': g['iig']}
        continue
    if 'appid' in g:
        c = cases.get(str(g['appid']))
        urls = [s['thumb'] for s in (c or {}).get('screenshots', [])] or appdetails(g['appid'])
        g['urls'] = urls[:PER_GAME]
        g['links'] = {'steam': f"https://store.steampowered.com/app/{g['appid']}/", **({'iig': g['iig']} if g.get('iig') else {})}
    else:
        g['urls'] = []
        g['links'] = {'gameui': 'https://www.gameui.net/games'}

# ---------- 下载（只下 Steam 商店缩略图） ----------
def fetch(url, out):
    if os.path.exists(out):
        return True
    tmp = out + '.part'
    cmd = ['curl', '-s', '-f', '--max-time', '60', '-A', UA, '-o', tmp, url]
    ok = subprocess.run(cmd).returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 0
    if ok:
        os.replace(tmp, out)
    elif os.path.exists(tmp):
        os.remove(tmp)
    return ok

gameui_skipped = []
for g in games:
    if g['src'] == 'gameui':
        g['files'] = gameui_local(g['gameui'])
        if not g['files']:
            gameui_skipped.append(g['name'])
        continue
    g['files'] = list(IIG_LOCAL.get(g['key'], []))[:2]
    for i, u in enumerate(g['urls']):
        f = os.path.join(IMG, f"{g['key'].replace(':', '_')}_{i}.jpg")
        if len(g['files']) >= PER_GAME:
            break
        if fetch(u, f):
            g['files'].append(f)
if gameui_skipped:
    print(f'GameUI：{len(gameui_skipped)} 款本地没有截图，跳过（本脚本不下载 GameUI 图片）：' + '、'.join(gameui_skipped))
json.dump(games, open(os.path.join(OUT, 'list.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- 对照图：每张 6 款，每行一款 6 格 ----------
FONT = cjk_font(18)
CW, CH, LH = 320, 186, 26
games_ok = [g for g in games if g['files']]
index = []
for s in range(0, len(games_ok), 6):
    chunk = games_ok[s:s + 6]
    sheet = Image.new('RGB', (CW * PER_GAME, (CH + LH) * len(chunk)), (18, 18, 18))
    d = ImageDraw.Draw(sheet)
    for r, g in enumerate(chunk):
        y = r * (CH + LH)
        n = s + r + 1
        d.text((6, y + 2), f"{n}. {g['name'][:40]} · {g['genre']} · {g['tier']}", fill=(255, 220, 120), font=FONT)
        for c, f in enumerate(g['files'][:PER_GAME]):
            try:
                im = Image.open(f).convert('RGB')
                im.thumbnail((CW - 4, CH - 4))
                sheet.paste(im, (c * CW + 2, y + LH + (CH - im.height) // 2))
            except Exception:
                pass
        g['n'] = n
    out = os.path.join(OUT, f'sheet-{s // 6 + 1:02d}.jpg')
    sheet.save(out, quality=82)
    index.append({'sheet': os.path.relpath(out, ROOT).replace('\\', '/'), 'games': [g['key'] for g in chunk]})
json.dump(games, open(os.path.join(OUT, 'list.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(games_ok), 'games with shots;', len(index), 'sheets')
