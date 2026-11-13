"""
R2 参考卡：把看图时写的"参数 = 取值标签"笔记换算成参数体系的取值 id，校验后写入 src/content/uiRefs.json。
运行：python scripts/refs/r2-cards.py <批次名>
输入：qa/refs-cache/r2/<批次>/notes.txt（每行一款，格式见下）与 list.json
  n=序号 | fam=皮肤家族 | scr=界面id,界面id | p=参数=取值标签; 参数=取值A&取值B（多选用 &，因为有的标签里本身带 +）; … | note=一句话
  参数可写 <参数>@<组件或元素>（按组件覆盖）或 el.<元素>.<后缀>（逐元素实例，后缀对应 elx.<后缀>）
  取值标签按参数体系里的中文标签匹配（先全等，再包含）；range / int 直接写数字
输出：src/content/uiRefs.json（合并同批旧卡）、qa/refs-cache/r2/<批次>/gaps.json（换算不了的 → 词表缺口）
"""
import json, os, re, sys

ROOT = os.getcwd()
BATCH = sys.argv[1] if len(sys.argv) > 1 else 'strategy'
DIR = os.path.join(ROOT, 'qa', 'refs-cache', 'r2', BATCH)
SPEC = json.load(open(os.path.join(ROOT, 'docs', 'survey', 'data', 'ui-param-system.json'), encoding='utf-8'))
PARAMS = {p['id']: p for g in SPEC['groups'] for p in g['params']}
FAMILIES = [p['label'] for p in SPEC['presets'] if p.get('kind') == 'skin']
OUT = os.path.join(ROOT, 'src', 'content', 'uiRefs.json')

def base_param(key):
    k = key.split('@')[0]
    if k in PARAMS:
        return k
    m = re.match(r'^el\.([a-zA-Z]+)\.(\w+)$', k)
    if m and f'elx.{m.group(2)}' in PARAMS:
        return f'elx.{m.group(2)}'
    return None

def norm(s):
    return re.sub(r'[\s/／·・、，,（）()]+', '', s).lower()

def match_option(p, label):
    opts = p.get('options') or []
    n = norm(label)
    for o in opts:
        if norm(o.get('label', '')) == n or str(o.get('value')).lower() == label.lower():
            return o['value']
    hits = [o for o in opts if n and (n in norm(o.get('label', '')) or norm(o.get('label', '')) in n) and norm(o.get('label', ''))]
    return hits[0]['value'] if len(hits) == 1 else None

games = {g.get('n'): g for g in json.load(open(os.path.join(DIR, 'list.json'), encoding='utf-8')) if g.get('n')}
cards, gaps = [], []
for line in open(os.path.join(DIR, 'notes.txt'), encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    f = {}
    for part in line.split(' | '):
        k, _, v = part.partition('=')
        f[k.strip()] = v.strip()
    n = int(f['n'])
    g = games.get(n)
    if not g:
        print('没有这一款', n)
        continue
    values = {}
    for pair in [x for x in f.get('p', '').split(';') if x.strip()]:
        key, _, raw = pair.strip().partition('=')
        key, raw = key.strip(), raw.strip()
        bp = base_param(key)
        if not bp:
            gaps.append({'game': g['name'], 'kind': 'param', 'key': key, 'value': raw})
            continue
        p = PARAMS[bp]
        if p.get('kind') in ('range', 'int') and re.fullmatch(r'-?\d+(\.\d+)?', raw):
            values[key] = float(raw) if '.' in raw else int(raw)
            continue
        if p.get('kind') in ('color', 'gradient'):
            values[key] = raw
            continue
        parts = [x.strip() for x in raw.split('&')] if p.get('kind') == 'multi' else [raw]
        got = []
        for lab in parts:
            v = match_option(p, lab)
            if v is None:
                gaps.append({'game': g['name'], 'kind': 'value', 'key': key, 'param': bp, 'value': lab})
            else:
                got.append(v)
        if got:
            values[key] = got if p.get('kind') == 'multi' else got[0]
    fam = f.get('fam', '')
    hit = next((x for x in FAMILIES if norm(x) == norm(fam)), None) or next((x for x in FAMILIES if fam and (norm(fam) in norm(x))), None)
    if fam and not hit:
        gaps.append({'game': g['name'], 'kind': 'family', 'value': fam})
    fam = hit or fam
    cards.append({
        'id': g['key'], 'name': g['name'], 'batch': BATCH, 'genre': g['genre'], 'evidence': g.get('tier'),
        'appid': g.get('appid'), 'gameui': g.get('gameui'), 'links': g.get('links', {}),
        'family': fam, 'screens': [s.strip() for s in f.get('scr', '').split(',') if s.strip()],
        'params': values, 'note': f.get('note', ''), 'shots': [os.path.relpath(x, ROOT).replace('\\', '/') for x in g.get('files', [])],
    })

old = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {'cards': []}
keep = [c for c in old.get('cards', []) if c.get('batch') != BATCH]
data = {'source': 'R2 参考卡：每款游戏一张，取值来自 docs/survey/data/ui-param-system.json（scripts/refs/r2-cards.py 换算校验）', 'cards': keep + cards}
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(gaps, open(os.path.join(DIR, 'gaps.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
n_vals = sum(len(c['params']) for c in cards)
print(f'{len(cards)} 张卡，{n_vals} 个取值；换算不了 {len(gaps)} 处')
for gp in gaps[:40]:
    print('  缺口', gp)
