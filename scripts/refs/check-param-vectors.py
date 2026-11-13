"""
校验任意 JSON 里的参数向量（K1 / R5 子代理产出用）：找出所有键名为 "params" / "a" / "b" / "base" / "values" 且值是对象的地方，
逐个检查参数 id 与取值是否在参数体系词表里（docs/survey/data/ui-param-system.json），规则与 scripts/check-content.ts 的参考卡检查一致：
- 键可带作用域后缀 "<参数>@<目标>"：目标必须是组件（src/hud/sys/register.ts 的 COMPONENTS）或词表里的信息元素 el.<id>（cnt.elements 的取值），否则错误；
  参数不在 SCOPABLE（src/hud/sys/scopable.ts，渲染器真正按目标读的参数）里时给警告——写了也只按全局值画（M12a-01）；
  目标是还没接上作用域的组件（不在 scopable.ts 的 SCOPE_PARTS 里，如 icon / nameplate / rank）时同样给警告；
  元素实例键 / 画法级键（el.vitals.scale、el.threat.bossBar.screenAnchor）不能再带 @（TS 的 parseOverrideKey 不认，存不进参数：错误）；
- 逐元素键 "el.<元素>.<子参数>" 按 "elx.<子参数>" 校验；画法级键 "el.<元素>.<画法>.<子参数>"（M12a-14）的画法要在 el.<元素>.form 的词表里；
- 颜色列表参数（freeColors，如 el.vitals.rowColors）的项可以是角色名或 #hex（#rgb / #rgba / #rrggbb / #rrggbbaa）；不能写 rgba()——列表存成逗号串（toStoreVal），
  读时按逗号拆（cond.ts 的 asList），rgba(255,0,0,0.8) 会被拆成 4 项（审查修复 B · C8）；
- 可并排的列表参数（joinable，如 lay.edgeBarSlots）的项可以写成 "el.a|el.b"，每一段都要在词表里；词表借别的参数的（optionsFrom）按那个参数的取值查；
  有序列表（ordered：el.vitals.rowForms / rowColors、cmp.listRowColors、col.actionColors……）可以写 "auto" 占位（这一行 / 这一项用默认）；
- range / int：数要在 range 的 min–max 以内，或是取值表里的非数取值（auto、none、fit……）；toggle：true / false；color：#hex、rgb() / rgba()、色板引用 @accent / @text……
  或取值表里的取值（审查修复 B · C12：原来这几类只查 id，"fitt"、"darkscrim"、lay.cellSize = 600、lay.drawerFlush = "yes" 都能过）；
  gradient 只查 id；选项类参数查取值（数组逐个查，多选的逗号串拆开查）；
- typ.baseSize < 16 给警告：单位是 px@1080p（M12a-05），这么小的值多半是旧的 CSS 像素写法；
- 字族取值标了 aliasOf（M12b-54：还没有字体文件的字族）时给警告：画面落到别的字体；
- 并集合并的多选（merge = union，M12a-07）：[] 或 ["none"] = 清空下层带来的并集，["none", "a"] = 清空后只留 a（替换），
  "-x" = 从并集里减掉 x（x 要在取值表里）。
另外检查参考卡 id（"cards" / "examples" / "exemplars" 里形如 steam:123 / gameui:… 的字符串）是否存在于 src/content/uiRefs.json。
复刻文件（src/content/replicas/*.json，顶层有 id = rep.* 与 screens）另查格式（M12a-39，docs/ui-replicas.md）：
- scores：屏 key → 单个评分对象或逐轮数组（round 递增，各项 0–10）；
- round<N>Diffs：屏 key → 字符串列表；revisions：字符串列表；
- gaps[]：screen（屏 key / "a / b" / all，旧写法 global、* 同义）、severity（high / medium / low）、kind（GAP_KINDS，src/content/uiKnowledge.ts）。
- screens[].sim（M12c-14，可选）：{pose: chk.simPose 的取值} 或 {demo: chk.demo 的取值, at: 0–10 秒}（pose 与 demo 可以同写：at 换掉姿态时刻）。

用法：python -X utf8 scripts/refs/check-param-vectors.py [<file.json> ...]（不给文件 = 全部复刻）
退出码：有错误时为 1（警告不算）。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / 'docs/survey/data/ui-param-system.json').read_text(encoding='utf-8'))
PARAMS = {p['id']: p for g in SPEC['groups'] for p in g['params']}
CARDS = {c['id'] for c in json.loads((ROOT / 'src/content/uiRefs.json').read_text(encoding='utf-8'))['cards']}
# 起点选择器（uip.*）取预设 id；hud.style 取皮肤值（旧皮肤用旧 id）
_PRESETS = SPEC['presets']
SELECTOR_KIND = {'uip.platform': 'platform', 'uip.business': 'business', 'uip.layout': 'layout', 'uip.screen': 'screen', 'uip.pattern': 'pattern',
                 'uip.container': 'container', 'uip.keyword': 'keyword', 'uip.theme': 'theme', 'uip.overlay': 'overlay'}
SELECTOR_VALUES = {k: {p['id'] for p in _PRESETS if p['kind'] == kind} | {'auto', 'none'} for k, kind in SELECTOR_KIND.items()}
SKIN_VALUES = {p.get('existing') or p['id'].replace('skin.', '', 1) for p in _PRESETS if p['kind'] == 'skin'} | {'none'}
VEC_KEYS = {'params', 'a', 'b', 'base', 'values'}
CARD_RE = re.compile(r'^(steam|gameui|iig|nonsteam|ns|app|case)[:#]')


def _ts_strings(path: str, name: str) -> list:
    """从 TS 源码里读一个字符串数组常量（const NAME = [ '…', … ]），读不到返回 []"""
    try:
        src = (ROOT / path).read_text(encoding='utf-8')
    except OSError:
        return []
    m = re.search(rf'\b{name}\b[^=]*=\s*\[(.*?)\]', src, re.S)
    return re.findall(r"'([^']+)'", m.group(1)) if m else []


# 覆盖目标：组件（register.ts）+ 信息元素；渲染器按目标读的参数（scopable.ts，'cmp.*' 这类以 .* 结尾的是前缀）
COMPONENTS = set(_ts_strings('src/hud/sys/register.ts', 'COMPONENTS'))
SCOPABLE = set(_ts_strings('src/hud/sys/scopable.ts', 'SCOPABLE_IDS'))
SCOPE_PARTS = set(_ts_strings('src/hud/sys/scopable.ts', 'SCOPE_PARTS'))
# 只给个别参数用的目标（中期审查修复 ⑯ ⑰）：frame / core / well 是面板三层立体的层名（M12b-36，theme.ts 只按 vis.depth@frame / @core / @well 读字面键）；
# icon 部件只有行首 / 条前图标的底章（iconChip：外形与底），图标画风 / 位图着色在元素 / 格子的上下文里按目标读，写 @icon 不起作用
LAYER_ONLY = {'frame': {'vis.depth'}, 'core': {'vis.depth'}, 'well': {'vis.depth'}}
PART_DEAD = {'icon': {'vis.iconStyle', 'vis.iconTint', 'vis.iconTintAmount'}}
# 终期审查修复 ⑱：只认少数几个参数的部件（body = 长文块，screen.ts 的 textAlign 只按它读 typ.align；字本身按元素的上下文画）
PART_ONLY = {'body': {'typ.align'}}
GAP_KINDS = set(_ts_strings('src/content/uiKnowledge.ts', 'GAP_KINDS'))
SEVERITIES = {'high', 'medium', 'low'}
SCORE_KEYS = {'layout', 'elements', 'palette', 'type', 'shape', 'density', 'overall'}


def scopable(param: str) -> bool:
    return param in SCOPABLE or any(s.endswith('.*') and param.startswith(s[:-1]) for s in SCOPABLE)


def _forms_of(element: str) -> set:
    p = PARAMS.get(f'{element}.form')
    return {str(o['value']) for o in (p.get('options') or [])} if p else set()


def base(k: str):
    b = k.split('@')[0]
    if b in PARAMS:
        return b
    # 元素实例键（M12b-04）el.<元素>#2.<后缀>：元素自己的参数按基 id 找，否则 elx.*
    mi = re.match(r'^(el\.[a-zA-Z]+)#[23]\.(\w+)$', b)
    if mi:
        if f'{mi.group(1)}.{mi.group(2)}' in PARAMS:
            return f'{mi.group(1)}.{mi.group(2)}'
        if f'elx.{mi.group(2)}' in PARAMS:
            return f'elx.{mi.group(2)}'
    m = re.match(r'^el\.[a-zA-Z0-9]+\.(\w+)$', b)
    if m and f'elx.{m.group(1)}' in PARAMS:
        return f'elx.{m.group(1)}'
    # 画法级键 el.<元素>.<画法>.<后缀>（M12a-14）：画法在 el.<元素>.form 的词表里，后缀是元素自己的参数或 elx.*
    m3 = re.match(r'^(el\.[a-zA-Z]+)(?:#[23])?\.([a-zA-Z0-9]+)\.(\w+)$', b)
    if m3 and m3.group(2) in _forms_of(m3.group(1)):
        own = f'{m3.group(1)}.{m3.group(3)}'
        if own in PARAMS:
            return own
        if f'elx.{m3.group(3)}' in PARAMS:
            return f'elx.{m3.group(3)}'
    return None


# 颜色列表的项（freeColors）只认 #hex：列表存成逗号串，rgba(…) 会被拆开（审查修复 B · C8）
HEX_RE = re.compile(r'^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$')
FUNC_COLOR_RE = re.compile(r'^(rgba?|hsla?)\(.*\)$')
# 单个颜色值（color 类参数）：#hex、rgb() / rgba() / hsl()、色板引用（theme.ts 的 refColor：@accent / @accent2 / @ink / @paper / @good / @sky / @text / @heading……）
COLOR_REF_RE = re.compile(r'^@[a-zA-Z0-9]+$')
# 信息元素词表（作用域目标 @el.<id> 要在里面）
ELEMENT_IDS = {str(o['value']) for o in (PARAMS.get('cnt.elements', {}).get('options') or [])}


def _num(x):
    """数值（JSON 数或数字串），不是数返回 None（布尔不算数）"""
    if isinstance(x, bool):
        return None
    if isinstance(x, (int, float)):
        return float(x)
    if isinstance(x, str):
        try:
            return float(x)
        except ValueError:
            return None
    return None


def check_scalar(k: str, b: str, p: dict, v, opts: list, where: str, errs: list, warns: list):
    """range / int / toggle / color 的取值（审查修复 B · C12）"""
    kind = p.get('kind')
    vals = {str(o['value']) for o in opts} | {'auto'}
    if isinstance(v, list):
        errs.append(f'{where}: {k} 是单值参数（{kind}），不能写成列表 {v!r}')
        return
    if kind in ('range', 'int'):
        if isinstance(v, str) and v in vals:
            return
        n = _num(v)
        if n is None:
            errs.append(f'{where}: {k} 的取值 {v!r} 不是数，也不在取值表里（可选：{", ".join(sorted(vals))}）')
            return
        rg = p.get('range') or {}
        lo, hi = rg.get('min'), rg.get('max')
        if (lo is not None and n < lo) or (hi is not None and n > hi):
            # typ.baseSize 的旧 CSS 像素写法另有提醒（上面），不重复报错
            if b == 'typ.baseSize' and lo is not None and n < lo:
                return
            errs.append(f'{where}: {k} = {v!r} 超出范围 {lo}–{hi}{(" " + rg["unit"]) if rg.get("unit") else ""}')
        elif kind == 'int' and n != int(n):
            errs.append(f'{where}: {k} = {v!r} 应是整数')
        return
    if kind == 'toggle':
        if isinstance(v, bool) or v in ('true', 'false', 'auto'):
            return
        errs.append(f'{where}: {k} 是开关，取值应是 true / false（写的是 {v!r}）')
        return
    if kind == 'color':
        if not isinstance(v, str):
            errs.append(f'{where}: {k} 的取值 {v!r} 不是颜色')
            return
        if v in vals or HEX_RE.match(v) or FUNC_COLOR_RE.match(v) or COLOR_REF_RE.match(v):
            return
        errs.append(f'{where}: {k} 的取值 {v!r} 不是颜色（#hex、rgba()、色板引用 @accent / @text……）也不在取值表里（可选：{", ".join(sorted(vals))}）')


def check_vec(vec: dict, where: str, errs: list, warns: list):
    for k, v in vec.items():
        if k in SELECTOR_VALUES or k == 'hud.style':
            ok = SELECTOR_VALUES.get(k, SKIN_VALUES)
            for x in (v if isinstance(v, list) else [v]):
                if x not in ok:
                    errs.append(f'{where}: {k} 的取值 {x!r} 不是预设 id（可选：{", ".join(sorted(ok))[:300]}）')
            continue
        if k.startswith(('game.', 'camera.', 'color.', 'shading.', 'surface.', 'material.', 'post.', 'light.', 'shape.', 'motion.')):
            continue  # 画面侧参数（复刻配方的 art.values）：由探索台的画面参数注册表校验，这里放过
        b = base(k)
        if not b:
            errs.append(f'{where}: 未知参数 {k}')
            continue
        if '@' in k:
            target = k.split('@', 1)[1]
            if k.split('@', 1)[0] not in PARAMS:
                # 元素实例键 / 画法级键（el.vitals.scale、el.threat.bossBar.screenAnchor）：TS 的 parseOverrideKey 只认参数表里的 id，带 @ 存不进参数
                errs.append(f'{where}: {k} —— 元素实例键 / 画法级键不能带作用域（只有参数表里的参数能写 <参数>@<目标>；要按元素设就直接写 {k.split("@", 1)[0]}）')
                continue
            if COMPONENTS and target not in COMPONENTS and not re.match(r'^el\.[a-zA-Z]+(#[23])?$', target):
                errs.append(f'{where}: {k} 的作用域目标 {target!r} 既不是组件也不是信息元素（存不进参数；组件：{", ".join(sorted(COMPONENTS))[:300]}）')
            elif ELEMENT_IDS and target.startswith('el.') and target.split('#')[0] not in ELEMENT_IDS:
                errs.append(f'{where}: {k} 的作用域目标 {target!r} 不是词表里的信息元素（cnt.elements 的取值；写错了画面上什么都不会变）')
            elif SCOPABLE and not scopable(b):
                warns.append(f'{where}: {k} —— 渲染器不按目标读 {b}（不在 src/hud/sys/scopable.ts 的 SCOPABLE 里），只按全局值画')
            elif SCOPE_PARTS and not target.startswith('el.') and target not in SCOPE_PARTS:
                warns.append(f'{where}: {k} —— 部件 {target} 还没接上作用域（不在 src/hud/sys/scopable.ts 的 SCOPE_PARTS 里），按元素 / 全局值画')
            elif target in LAYER_ONLY and b not in LAYER_ONLY[target]:
                warns.append(f'{where}: {k} —— {target} 是面板三层立体的层名（M12b-36），只有 {"、".join(sorted(LAYER_ONLY[target]))} 按它读；别的参数写 @{target} 不起作用（要改外框带 / 内芯 / 凹槽的颜色写在面板或元素上）')
            elif target in PART_ONLY and b not in PART_ONLY[target]:
                warns.append(f'{where}: {k} —— {target} 部件只认 {"、".join(sorted(PART_ONLY[target]))}（长文块的对齐）；{b} 写 @{target} 不起作用（长文的字色 / 字族写在元素或全局）')
            elif b in PART_DEAD.get(target, set()):
                warns.append(f'{where}: {k} —— {target} 部件只管行首图标的底章（外形 / 底），{b} 不按它读；按元素写 {b}@el.<元素> 或 @slot')
        if b == 'typ.baseSize' and isinstance(v, (int, float)) and not isinstance(v, bool) and v < 16:
            warns.append(f'{where}: {k} = {v} —— 单位是 px@1080p（M12a-05），小于 16 多半是旧的 CSS 像素写法（预览上只有 {v / 2:g}px）；迁移见 scripts/refs/migrate-basesize.py')
        p = PARAMS[b]
        # 词表借别的参数的（optionsFrom，如 lay.edgeBarSlots → cnt.elements、el.vitals.rowForms → cmp.gauge）：按那个参数的取值查
        src = PARAMS.get(p.get('optionsFrom') or '')
        opts = p.get('options') or (src.get('options') if src else None) or []
        # 对象值：渐变（{from, to, angle}）或预设里的推移操作（{op: add / mul……}），这里不查
        if isinstance(v, dict):
            continue
        if p.get('kind') in ('range', 'int', 'toggle', 'color'):
            check_scalar(k, b, p, v, opts, where, errs, warns)
            continue
        if not opts or p.get('kind') in ('gradient', 'list'):
            continue
        vals = {o['value'] for o in opts}
        multi = p.get('kind') == 'multi'
        if p.get('freeColors') and isinstance(v, str) and re.search(r'(rgba?|hsla?)\(', v):
            errs.append(f'{where}: {k} = {v!r}：颜色列表里不能写 rgba() / hsl()——列表存成逗号串，读时按逗号拆开；带透明度用 #rrggbbaa')
            continue
        items = v if isinstance(v, list) else (str(v).split(',') if multi and isinstance(v, str) and v else [v])
        union = multi and p.get('merge') == 'union'
        for x in items:
            if union and isinstance(x, str) and x.startswith('-') and len(x) > 1:
                if x[1:] not in vals:
                    errs.append(f'{where}: {k} 的减项 {x!r}：{x[1:]!r} 不在词表里（可选：{", ".join(map(str, sorted(vals, key=str)))[:300]}）')
                continue
            if union and x == 'none':
                continue
            # 颜色列表（freeColors，M12a-12 的 el.vitals.rowColors）：角色名或直接写 #hex；rgba() 会被逗号拆开（审查修复 B · C8）
            if p.get('freeColors') and isinstance(x, str) and HEX_RE.match(x):
                continue
            if p.get('freeColors') and isinstance(x, str) and (FUNC_COLOR_RE.match(x) or re.match(r'^(rgba?|hsla?)\(', x) or re.match(r'^[\d.\s]+\)?$', x)):
                errs.append(f'{where}: {k} 的项 {x!r}：颜色列表里不能写 rgba() / hsl()——列表存成逗号串，读时按逗号拆开；带透明度用 #rrggbbaa')
                continue
            # 并排写法（joinable，M12a-16 的 lay.edgeBarSlots）："el.a|el.b" 每一段都要在词表里
            if p.get('joinable') and isinstance(x, str) and '|' in x:
                for part in x.split('|'):
                    if part not in vals and part.split('#')[0] not in vals:
                        errs.append(f'{where}: {k} 的取值 {x!r}：{part!r} 不在词表里')
                continue
            # 元素实例（M12b-04）：cnt.elements / lay.edgeBarSlots 里的 el.<元素>#2 / #3 按基 id 查词表
            if isinstance(x, str) and re.match(r'^el\.[a-zA-Z]+#[23]$', x) and x.split('#')[0] in vals:
                continue
            if x not in vals and x != 'auto':
                errs.append(f'{where}: {k} 的取值 {x!r} 不在词表里（可选：{", ".join(map(str, sorted(vals, key=str)))[:300]}）')
                continue
            # 字族别名（M12b-54）：取值标了 aliasOf = 这套字族还没有字体文件，画面落到别的字体（不再静默别名）
            al = next((o.get('aliasOf') for o in opts if o['value'] == x and o.get('aliasOf')), None)
            if al:
                warns.append(f'{where}: {k} = {x!r} —— 这套字族还没有字体文件，现在落到 {al} 的字体画（字体来源见 public/fonts/LICENSES.md 与 CONTRIBUTING.md「改 HUD 文字与字体」）')


def walk(o, path: str, errs: list, warns: list, cards_seen: list):
    if isinstance(o, dict):
        for k, v in o.items():
            p2 = f'{path}.{k}'
            if k in VEC_KEYS and isinstance(v, dict) and v and all(isinstance(x, str) for x in v.keys()) and any('.' in x for x in v.keys()):
                check_vec(v, p2, errs, warns)
            else:
                walk(v, p2, errs, warns, cards_seen)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, f'{path}[{i}]', errs, warns, cards_seen)
    elif isinstance(o, str) and CARD_RE.match(o):
        cards_seen.append(o)
        if o not in CARDS:
            errs.append(f'{path}: 参考卡 id {o} 不在 uiRefs.json 里')


def check_replica(d: dict, errs: list, warns: list):
    """复刻文件的格式（M12a-39）：scores 单对象 / 逐轮数组、round<N>Diffs、revisions、gaps[].kind"""
    keys = [s.get('key') for s in d.get('screens') or [] if isinstance(s, dict)]
    ks = set(keys)
    if len(ks) != len(keys):
        errs.append('$.screens: 屏 key 重复')
    # 每屏的静帧钉法（M12c-14）：pose = chk.simPose，demo + at = chk.demo 钉在第 at 秒（chk.simTime）
    poses = {o['value'] for o in PARAMS.get('chk.simPose', {}).get('options', [])} - {'auto', 'none'}
    demos = {o['value'] for o in PARAMS.get('chk.demo', {}).get('options', [])} - {'auto', 'none'}
    for i, s in enumerate(d.get('screens') or []):
        sim = s.get('sim') if isinstance(s, dict) else None
        if sim is None:
            continue
        w = f'$.screens[{i}].sim'
        if not isinstance(sim, dict):
            errs.append(f'{w}: 应是 {{pose}} 或 {{demo, at}}')
            continue
        for kk in sim:
            if kk not in ('pose', 'demo', 'at'):
                errs.append(f'{w}.{kk}: 未知字段（只认 pose / demo / at）')
        if 'pose' in sim and sim['pose'] not in poses:
            errs.append(f'{w}.pose: {sim["pose"]!r} 不是 chk.simPose 的取值（{" / ".join(sorted(poses))}）')
        if 'demo' in sim and sim['demo'] not in demos:
            errs.append(f'{w}.demo: {sim["demo"]!r} 不是 chk.demo 的取值（{" / ".join(sorted(demos))}）')
        if 'at' in sim and (isinstance(sim['at'], bool) or not isinstance(sim['at'], (int, float)) or not 0 <= sim['at'] <= 10):
            errs.append(f'{w}.at: 应是 0–10 的秒数')
        if 'pose' not in sim and 'demo' not in sim:
            warns.append(f'{w}: 没写 pose / demo（只钉时钟）')
        if 'demo' in sim and 'at' not in sim and 'pose' not in sim:
            errs.append(f'{w}: 写了 demo 要写 at（钉在第几秒）')
    scores = d.get('scores')
    if scores is not None and not isinstance(scores, dict):
        errs.append('$.scores: 应是 {屏 key: 评分对象 | [第 1 轮, 第 2 轮, …]}')
        scores = {}
    for sk, sv in (scores or {}).items():
        w = f'$.scores.{sk}'
        if sk not in ks:
            errs.append(f'{w}: 没有这一屏')
        rounds = sv if isinstance(sv, list) else [sv]
        last = 0
        for i, sc in enumerate(rounds):
            if not isinstance(sc, dict):
                errs.append(f'{w}[{i}]: 评分应是对象')
                continue
            for kk, vv in sc.items():
                if kk == 'round':
                    if not isinstance(vv, int) or vv < 1:
                        errs.append(f'{w}[{i}].round: 应是 ≥ 1 的整数')
                    elif vv <= last:
                        errs.append(f'{w}[{i}].round: 轮次要递增（{last} → {vv}）')
                    else:
                        last = vv
                elif kk in SCORE_KEYS:
                    if not isinstance(vv, (int, float)) or not 0 <= vv <= 10:
                        errs.append(f'{w}[{i}].{kk}: 评分应是 0–10 的数')
                else:
                    warns.append(f'{w}[{i}]: 未知评分项 {kk}')
            if 'overall' not in sc:
                warns.append(f'{w}[{i}]: 缺 overall')
    for k in keys:
        if scores is not None and k not in (scores or {}):
            warns.append(f'$.scores: {k} 没有评分')
    for dk, dv in d.items():
        if not re.match(r'^round\d+Diffs$', dk):
            continue
        if not isinstance(dv, dict):
            errs.append(f'$.{dk}: 应是 {{屏 key: [差异, …]}}')
            continue
        for sk, lst in dv.items():
            if sk not in ks:
                errs.append(f'$.{dk}.{sk}: 没有这一屏')
            if not isinstance(lst, list) or not all(isinstance(x, str) for x in lst):
                errs.append(f'$.{dk}.{sk}: 应是字符串列表')
    rev = d.get('revisions')
    if rev is not None and (not isinstance(rev, list) or not all(isinstance(x, str) for x in rev)):
        errs.append('$.revisions: 应是字符串列表')
    for i, g in enumerate(d.get('gaps') or []):
        w = f'$.gaps[{i}]'
        if not isinstance(g, dict):
            errs.append(f'{w}: 应是对象')
            continue
        for f in ('screen', 'what', 'severity', 'proposal'):
            if not isinstance(g.get(f), str) or not g.get(f):
                errs.append(f'{w}.{f}: 缺字段')
        if g.get('severity') not in SEVERITIES:
            errs.append(f'{w}.severity: {g.get("severity")!r} 不是 high / medium / low')
        kind = g.get('kind')
        if kind is None:
            errs.append(f'{w}.kind: 缺字段（{" / ".join(sorted(GAP_KINDS))}）')
        elif GAP_KINDS and kind not in GAP_KINDS:
            errs.append(f'{w}.kind: {kind!r} 不在缺口类型表里（{" / ".join(sorted(GAP_KINDS))}）')
        scr = str(g.get('screen') or '').strip()
        if scr in ('all', 'global', '*'):
            continue
        bad = [x for x in re.split(r'\s*/\s*', scr) if x and x not in ks]
        if bad:
            errs.append(f'{w}.screen: 没有这一屏 {", ".join(bad)}（整套共有写 all，几屏共有写 "a / b"）')


def main():
    files = sys.argv[1:] or sorted(str(p) for p in (ROOT / 'src/content/replicas').glob('*.json'))
    bad = 0
    nwarn = 0
    for f in files:
        errs: list = []
        warns: list = []
        seen: list = []
        d = json.loads(Path(f).read_text(encoding='utf-8'))
        walk(d, '$', errs, warns, seen)
        if isinstance(d, dict) and str(d.get('id', '')).startswith('rep.') and isinstance(d.get('screens'), list):
            check_replica(d, errs, warns)
        try:
            name = Path(f).resolve().relative_to(ROOT).as_posix()
        except ValueError:
            name = f
        print(f'== {name}：{len(errs)} 个问题，{len(warns)} 个提醒，引用参考卡 {len(set(seen))} 张')
        for e in errs[:200]:
            print('  ' + e)
        for w in warns[:60]:
            print('  ⚠ ' + w)
        bad += len(errs)
        nwarn += len(warns)
    if len(files) > 1:
        print(f'\n合计：{len(files)} 个文件，{bad} 个问题，{nwarn} 个提醒')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
