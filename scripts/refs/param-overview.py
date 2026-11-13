"""
UI 参数体系一页总览：docs/survey/data/ui-param-system.json → docs/survey/09-ui-param-system-overview.md
运行：python scripts/refs/param-overview.py
"""
import json
from collections import Counter

d = json.load(open('docs/survey/data/ui-param-system.json', encoding='utf-8'))
NAMES = {'screen': '界面模板', 'skin': '皮肤', 'layout': '品类布局', 'keyword': '设计关键词', 'example': '参考游戏复刻', 'recipe': '整套 UI 配方', 'nudge': '微调方向（UI 感觉）', 'platform': '平台', 'pattern': '常用模式', 'container': '场景容器', 'theme': '节日主题', 'business': '商业化强度', 'overlay': '叠加'}
params = [p for g in d['groups'] for p in g['params']]
L = ['# 游戏 UI / UX / HUD 调参体系 · 总览', '',
     '> 由 `docs/survey/data/ui-param-system.json` 自动生成（`scripts/refs/param-overview.py`），完整说明见 `docs/survey/09-ui-param-system.md`。', '',
     f"规模：{len(d['groups'])} 个维度组、{len(params)} 个参数、{sum(len(p.get('options') or []) for p in params)} 个取值；{len(d['presets'])} 个预设；{len(d['derived'])} 条派生规则。",
     f"复测：{d.get('validation', {}).get('retest', {}).get('result', '—')}", '', '## 维度组与参数', '']
for g in d['groups']:
    L += [f"### {g['label']}（{len(g['params'])}）"] + ([g['desc'][:200]] if g.get('desc') else []) + ['']
    for p in g['params']:
        opts = p.get('options') or []
        sample = '、'.join(o.get('label', o.get('value', '')) for o in opts[:6])
        more = f' 等 {len(opts)} 种' if len(opts) > 6 else ''
        rng = f" {p['range']}" if p.get('range') and not opts else ''
        L.append(f"- **{p['label']}** `{p['id']}` · {p.get('scope', '')} · {p.get('kind', '')}{rng} · {p.get('milestone', '')}：{sample}{more}")
    L.append('')
L += ['## 预设（起点）', '']
for k, n in Counter(p.get('kind') for p in d['presets']).most_common():
    ex = '、'.join(p['label'] for p in d['presets'] if p.get('kind') == k)[:260]
    L.append(f"- **{NAMES.get(k, k)}**（{n}）：{ex}…")
L += ['', '## 派生规则（UI 跟随画面等，不是独立维度）', '']
L += [f"- `{r.get('id')}`：{str(r.get('rule', ''))[:120]}" for r in d['derived']]
open('docs/survey/09-ui-param-system-overview.md', 'w', encoding='utf-8').write('\n'.join(L))
print(len(L), 'lines')
