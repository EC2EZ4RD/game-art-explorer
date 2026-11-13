"""
R3 参考库 · 玩家评价（docs/ui-hud-plan.md）：给 UI 参考卡里有 Steam appid 的游戏挖评测，统计美术好评率与 UI 的好评 / 抱怨。
运行：python scripts/refs/r3-reviews.py [--pages=2] [--workers=3]
取数：Steam 公开评测接口 appreviews（英文 + 简体中文，按"有帮助"排序，每种语言最多 pages×100 条），缓存在 qa/refs-cache/reviews/。
      每个请求间隔 ≥ --gap 秒（默认 1.5），429 限流时退避重试，失败不缓存，不抓用户资料。
统计：评测正文里提到美术 / 画面的比例与其中好评占比；提到界面 / UI 的条数（按好评 / 差评）；
      UI 抱怨按类别归类（字太小、背包 / 物品管理难用、菜单层级深、HUD 太乱挡视野、地图难用、提示 / 引导不清、手柄 / 键位、缩放 / 分辨率、UI 卡顿）。
输出：docs/survey/data/ui-review-stats.json（每款的统计 + 每类抱怨的出处游戏）；只存计数与归类，不存评测原文（版权）。
"""
import json, os, re, sys, time, threading, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.getcwd()
CACHE = os.path.join(ROOT, 'qa', 'refs-cache', 'reviews')
os.makedirs(CACHE, exist_ok=True)
UA = 'game-art-explorer-research/0.1'
PAGES = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--pages=')), 2))
WORKERS = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--workers=')), 3))
GAP = float(next((a.split('=')[1] for a in sys.argv if a.startswith('--gap=')), 1.5))
LOCK = threading.Lock()
LAST = [0.0]

def throttle():
    with LOCK:
        wait = LAST[0] + GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        LAST[0] = time.time()

def fetch(appid, lang):
    f = os.path.join(CACHE, f'{appid}_{lang}.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    out, cursor, ok = [], '*', False
    for _ in range(PAGES):
        q = urllib.parse.urlencode({'json': 1, 'language': lang, 'filter': 'all', 'review_type': 'all', 'purchase_type': 'all', 'num_per_page': 100, 'cursor': cursor})
        data = None
        for attempt in range(4):
            throttle()
            try:
                data = json.loads(urllib.request.urlopen(urllib.request.Request(f'https://store.steampowered.com/appreviews/{appid}?{q}', headers={'User-Agent': UA}), timeout=40).read())
                break
            except Exception as e:
                print('  fail', appid, lang, e)
                # 429 限流：退避 30 / 60 / 90 秒（期间其它线程也被 throttle 卡住）
                with LOCK:
                    time.sleep(30 * (attempt + 1) if '429' in str(e) else 3)
        if not data or not data.get('success'):
            break
        ok = True
        # 只留统计要用的字段：好评与否、正文（本地分析后不再写出原文）
        out += [{'up': r.get('voted_up'), 'text': r.get('review', '')} for r in data.get('reviews', [])]
        nc = data.get('cursor')
        if not nc or nc == cursor or not data.get('reviews'):
            break
        cursor = nc
    # 只有成功拿到过数据才写缓存（限流失败不缓存空结果，下次重跑会补）
    if ok:
        json.dump(out, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
    return out

ART = re.compile(r'\b(art|art ?style|artstyle|visuals?|graphics|aesthetic|gorgeous|beautiful|stunning|pretty)\b|美术|画风|画面|风格|好看|漂亮|唯美|画质', re.I)
UI = re.compile(r'\b(ui|interface|menus?|hud|inventory|font|text size|tooltips?|minimap|map screen|controls? scheme|keybind)\b|界面|UI|菜单|背包|字体|小地图|地图|提示|按键|键位|操作', re.I)
POS_UI = re.compile(r'\b(clean|intuitive|clear|readable|elegant|slick|polished|beautiful|great|well[- ]designed)\b.{0,30}\b(ui|interface|menus?|hud)\b|\b(ui|interface|menus?|hud)\b.{0,30}\b(clean|intuitive|clear|readable|elegant|slick|polished|great|well[- ]designed)\b|界面.{0,8}(简洁|清晰|好看|精致|舒服|直观)|(简洁|清晰|精致|直观).{0,8}界面|UI.{0,8}(简洁|清晰|好看|精致|舒服)', re.I)
COMPLAINTS = {
    'smallText': ('字太小 / 看不清', re.compile(r'(text|font)s? (is |are )?(too |really |way too )?(small|tiny)|tiny (text|font)|can.?t read|字太小|字体太小|看不清|字小', re.I)),
    'inventory': ('背包 / 物品管理难用', re.compile(r'inventory.{0,40}(clunky|tedious|awful|terrible|annoying|a mess|cumbersome|a pain|frustrat|too small|limited|micromanag)|(clunky|tedious|annoying|awful|terrible|limited|tiny|small) inventory|inventory (space|limit|weight)|背包.{0,8}(难用|麻烦|反人类|太小|不好用|别扭|不够|满了)|物品管理|仓库.{0,6}(不够|太小|难用)', re.I)),
    'menus': ('菜单 / 界面难用（繁琐、不直观）', re.compile(r'(menus?|ui|interface).{0,30}(clunky|confusing|convoluted|cumbersome|unintuitive|counter-?intuitive|messy|terrible|awful)|(too many|endless|convoluted|clunky|confusing|cumbersome|unintuitive|terrible|awful|bad) (menus?|ui|interface)|menu (diving|navigation)|菜单.{0,8}(繁琐|复杂|太深|难找|反人类|难用)|(UI|界面).{0,8}(难用|反人类|繁琐|复杂|不直观|难看|丑)|层级太深|点来点去', re.I)),
    'clutter': ('HUD 太乱 / 挡视野', re.compile(r'(hud|ui|screen) (is )?(too )?(cluttered|busy|noisy)|clutter(ed)?|obstructs?|blocks? (the )?(view|screen)|(ui|界面|HUD).{0,6}(太乱|挡|遮挡|杂乱)|满屏', re.I)),
    'map': ('地图难用 / 没有地图', re.compile(r'\bmap.{0,30}(useless|terrible|awful|confusing|annoying|hard to read|unreadable|cluttered|is bad|was bad)|(confusing|useless|bad|terrible|awful) (world |mini ?)?map|(no|lack of a?|without a) (mini ?map|map\b)|地图.{0,8}(难用|难看|看不懂|没用|不好用|太大|太乱|不清楚)|没有(小)?地图', re.I)),
    'guidance': ('提示 / 引导不清', re.compile(r'(no|poor|bad|lack of) (tutorial|guidance|explanation)|(doesn.?t|does not|never) explain|unclear (objectives?|where to go)|(引导|教程|提示).{0,6}(不清|太少|没有|不足|不明确)|不知道去哪|不知道干嘛', re.I)),
    'controller': ('手柄 / 键位不好', re.compile(r'(controller|gamepad) (support )?(is )?(bad|awful|terrible|broken|clunky)|(bad|no|clunky|awful) (controller|gamepad|keybind)|rebind|键位.{0,6}(反人类|不能改|难受|奇怪)|手柄.{0,6}(不支持|难用|不好)', re.I)),
    'scaling': ('UI 缩放 / 分辨率', re.compile(r'ui (scaling|scale)|(no|lack of) (ui )?scaling|(4k|ultrawide|1440p).{0,20}(ui|hud|text)|(ui|hud|text).{0,20}(4k|ultrawide)|界面.{0,6}(缩放|分辨率|比例)|超宽屏|4K.{0,6}(界面|UI|字)', re.I)),
    'lag': ('UI 卡顿 / 响应慢', re.compile(r'(ui|menus?|interface) (is |are )?(laggy|slow|sluggish|unresponsive)|(laggy|slow|sluggish) (ui|menus?)|(界面|菜单|UI).{0,6}(卡|慢|延迟)', re.I)),
}

def analyze(rows):
    n = len(rows)
    art = [r for r in rows if ART.search(r['text'] or '')]
    ui = [r for r in rows if UI.search(r['text'] or '')]
    pos_ui = [r for r in rows if POS_UI.search(r['text'] or '')]
    comp = {k: sum(1 for r in rows if (not r['up'] or True) and rx.search(r['text'] or '')) for k, (_, rx) in COMPLAINTS.items()}
    return {
        'n': n,
        'artMention': round(len(art) / n, 3) if n else 0,
        'artPositive': round(sum(1 for r in art if r['up']) / len(art), 3) if art else None,
        'uiMention': len(ui), 'uiMentionPos': sum(1 for r in ui if r['up']), 'uiMentionNeg': sum(1 for r in ui if not r['up']),
        'uiPraise': len(pos_ui),
        'complaints': {k: v for k, v in comp.items() if v},
    }

def main():
    cards = json.load(open(os.path.join(ROOT, 'src', 'content', 'uiRefs.json'), encoding='utf-8'))['cards']
    apps = sorted({c['appid'] for c in cards if c.get('appid')})
    print(len(apps), 'apps')
    def one(appid):
        rows = fetch(appid, 'english') + fetch(appid, 'schinese')
        return appid, analyze(rows)
    stats = {}
    with ThreadPoolExecutor(WORKERS) as ex:
        for appid, st in ex.map(one, apps):
            stats[str(appid)] = st
    # 每类抱怨：哪些游戏提到（≥ 2 条评测才算这款的抱怨）
    by_cat = {k: sorted([a for a, s in stats.items() if s['complaints'].get(k, 0) >= 2], key=lambda a: -stats[a]['complaints'][k]) for k in COMPLAINTS}
    name = {str(c['appid']): c['name'] for c in cards if c.get('appid')}
    out = {
        'date': time.strftime('%Y-%m-%d'),
        'method': 'Steam appreviews（英文 + 简中，按有帮助排序，每语言最多 %d00 条）；关键词归类，只存计数' % PAGES,
        'complaintLabels': {k: v[0] for k, v in COMPLAINTS.items()},
        'apps': stats,
        'complaints': {k: [{'appid': int(a), 'name': name.get(a, a), 'count': stats[a]['complaints'][k]} for a in v] for k, v in by_cat.items()},
    }
    p = os.path.join(ROOT, 'docs', 'survey', 'data', 'ui-review-stats.json')
    json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('saved', p, {k: len(v) for k, v in by_cat.items()})

if __name__ == '__main__':
    main()
