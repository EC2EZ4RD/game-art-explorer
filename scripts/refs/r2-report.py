"""
R2 参考卡统计：src/content/uiRefs.json → 覆盖率与分布（给小结用，也是 check:content "每项 ≥ 3 款"的数据源）。
运行：python scripts/refs/r2-report.py [批次名]
"""
import json, sys
from collections import Counter, defaultdict

BATCH = sys.argv[1] if len(sys.argv) > 1 else None
spec = json.load(open('docs/survey/data/ui-param-system.json', encoding='utf-8'))
P = {p['id']: p for g in spec['groups'] for p in g['params']}
LAB = {pid: {str(o['value']): o['label'] for o in (p.get('options') or [])} for pid, p in P.items()}
cards = [c for c in json.load(open('src/content/uiRefs.json', encoding='utf-8'))['cards'] if not BATCH or c['batch'] == BATCH]
print(f'卡片 {len(cards)}，取值 {sum(len(c["params"]) for c in cards)}')
print('品类', dict(Counter(c['genre'] for c in cards)))
print('皮肤家族', Counter(c['family'] for c in cards).most_common())
scr = Counter(s for c in cards for s in c['screens'])
print('界面', scr.most_common())

def base(k):
    k = k.split('@')[0]
    if k in P:
        return k
    parts = k.split('.')
    return f'elx.{parts[2]}' if len(parts) == 3 and parts[0] == 'el' and f'elx.{parts[2]}' in P else k

vals = defaultdict(Counter)
for c in cards:
    for k, v in c['params'].items():
        b = base(k)
        for x in (v if isinstance(v, list) else [v]):
            vals[k][LAB.get(b, {}).get(str(x), str(x))] += 1
used = {base(k) for c in cards for k in c['params']}
print(f'用到的参数 {len(used)} / {len(P)}')
for k in ['lay.hudOrg', 'el.toolbar.form', 'el.toolbar.screenAnchor', 'el.resources.screenAnchor', 'el.party.form', 'el.selection.form', 'el.minimap.screenAnchor', 'el.meter.form', 'el.timer.form', 'vis.mapStyle', 'vis.connector', 'col.lightness', 'cnt.density', 'ast.frameMat', 'ast.container', 'vis.pixelScale', 'rel.hudVisibility', 'el.threat.form', 'lay.arrangement', 'ctx.orientation', 'el.overlay.form']:
    if vals.get(k):
        print(f'  {k}: ' + '、'.join(f'{a} {n}' for a, n in vals[k].most_common(8)))
