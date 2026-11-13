"""
把收集到的截图元数据整理成截图列表与分组（sheets.py 的输入）。本脚本不下载图片；sheets.py 只读本地已有的缩略图。
运行：python scripts/refs/build-lists.py
输入（存在才处理）：
  qa/refs-cache/gameui/material-all.json（没有就用 material-samples.json）、work-images.json、game-images.json、works.json、games.json
  qa/refs-cache/steam/shots.json（steam-shots.ts 生成）
输出：qa/refs-cache/lists/<名>.json = [{ id, url, group, label }]
"""
import json, os

ROOT = os.getcwd()
G = os.path.join(ROOT, 'qa', 'refs-cache', 'gameui')
OUT = os.path.join(ROOT, 'qa', 'refs-cache', 'lists')
os.makedirs(OUT, exist_ok=True)
GAME_CAP = 48   # 每款游戏最多取多少张（站方单款可达数百张）

def load(path):
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else None

def save(name, items):
    seen, out = set(), []
    for it in items:
        if it.get('url') and it['id'] not in seen:
            seen.add(it['id'])
            out.append(it)
    json.dump(out, open(os.path.join(OUT, f'{name}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{name}: {len(out)} 张，{len({i["group"] for i in out})} 组')

mat = load(os.path.join(G, 'material-all.json')) or load(os.path.join(G, 'material-samples.json'))
if mat:
    save('gameui-materials', [{'id': r['id'], 'url': r['content'], 'group': m, 'label': (r.get('article') or {}).get('name', '')} for m, rows in mat.items() for r in rows])

works = {w['id']: w for w in (load(os.path.join(G, 'works.json')) or [])}
wi = load(os.path.join(G, 'work-images.json'))
if wi:
    items = []
    for wid, rows in wi.items():
        w = works.get(int(wid), {})
        for r in sorted(rows, key=lambda x: x.get('sort') or 0):
            items.append({'id': r['id'], 'url': r['content'], 'group': f'w{wid}', 'label': w.get('name', '')})
    save('gameui-works', items)

games = {g['id']: g for g in (load(os.path.join(G, 'games.json')) or [])}
gi = load(os.path.join(G, 'game-images.json'))
if gi:
    items = []
    for gid, rows in gi.items():
        g = games.get(int(gid), {})
        for r in rows[:GAME_CAP]:
            items.append({'id': r['id'], 'url': r['content'], 'group': f'g{gid}', 'label': g.get('name', '')})
    save('gameui-games', items)

st = load(os.path.join(ROOT, 'qa', 'refs-cache', 'steam', 'shots.json'))
if st:
    save('steam-iig', [{'id': f's{a["appid"]}_{i}', 'url': u, 'group': f's{a["appid"]}', 'label': a['name']} for a in st for i, u in enumerate(a['thumbs'])])
