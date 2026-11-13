"""
M12a-05 的迁移：typ.baseSize 的单位统一成 px@1080p 以后，复刻（以及知识库示例）里按旧口径（画布 CSS 像素）手调的字号换算成 px@1080p。

背景：M12a-05 之前渲染器把 typ.baseSize 当 CSS 像素用（正文 = round(值 × 0.93)，版面缩放 = 正文 / 13），电视平台派生的 26 在
928 × 522 的复刻画布上把整套 HUD 放大约一倍；R5a 第二轮有 10 款复刻靠把 typ.baseSize 压到 12–16 才排对。现在正文 = 值 × 0.5
（设计画布 960 × 540 = 1080p 的一半），整张 HUD 再按画面缩放（928 × 522 上 × 0.967）。

规则（docs/m12a-progress.md §3 B2）：
- 复刻里 < 16 的 typ.baseSize 按 × 2 换成 px@1080p（--exact：改用 2 × round(0.93 × 值)，在 540 高的画布上与迁移前逐像素一样大；× 2 会大 7–17%）；
- 电视平台上手调过字号的 rep.ghost-of-tsushima、rep.persona5 改回派生值（删掉 base 的 typ.baseSize：电视派生 26px@1080p = 预览上 13px）；
- ≥ 16 的值默认不动、只列出来（--all 一起换算：第二轮里它们同样是按旧口径调的，不换算会小一半）；
- 为抵消电视平台放大而改的 uip.platform / lay.safeMargin（修订记录里写了的）只列出，不自动改——要不要改回电视平台由人决定。
- --knowledge：另查 src/content/uiPrinciples.json、uiStyleFamilies.json 里示例 / 做法的参数向量（同样是旧口径，规则同上）。

默认只打印差异；--write 才写回（保持每个文件原来的换行符、缩进与结尾换行；重写后与原文不一致的文件拒绝写入）。
用法：python -X utf8 scripts/refs/migrate-basesize.py [--exact] [--all] [--knowledge] [--write] [复刻 id ...]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPS = ROOT / 'src/content/replicas'
KNOWLEDGE = [ROOT / 'src/content/uiPrinciples.json', ROOT / 'src/content/uiStyleFamilies.json']
# 计划里点名改回派生值的两款（电视平台，手调了字号）
TO_DERIVED = {'rep.ghost-of-tsushima', 'rep.persona5'}
VEC_KEYS = {'params', 'a', 'b', 'base', 'values', 'effectiveParams'}

args = [a for a in sys.argv[1:] if not a.startswith('--')]
EXACT = '--exact' in sys.argv
ALL = '--all' in sys.argv
WRITE = '--write' in sys.argv
WITH_KNOWLEDGE = '--knowledge' in sys.argv


def convert(v: float) -> float:
    return 2 * round(0.93 * v) if EXACT else v * 2


def read(path: Path):
    raw = path.read_text(encoding='utf-8')
    return raw, json.loads(raw)


def indent_of(raw: str) -> int:
    """原文件的缩进宽度（第二行行首空格数；复刻文件有缩进 1 和 2 两种）"""
    lines = raw.splitlines()
    return (len(lines[1]) - len(lines[1].lstrip(' '))) or 2 if len(lines) > 1 else 2


def dump_like(raw: str, data) -> str:
    """按原文件的缩进 / 换行符 / 结尾换行写回（不转义中文）"""
    s = json.dumps(data, ensure_ascii=False, indent=indent_of(raw))
    crlf = '\r\n' in raw
    if crlf:
        s = s.replace('\n', '\r\n')
    if raw.endswith('\n'):
        s += '\r\n' if crlf else '\n'
    return s


def save(path: Path, raw: str, data) -> bool:
    if dump_like(raw, json.loads(raw)) != raw:
        print(f'  ！{path.name}：原文件不是标准缩进格式，拒绝写入（请手改）')
        return False
    path.write_text(dump_like(raw, data), encoding='utf-8', newline='')
    return True


def fmt(v) -> str:
    return f'{v:g}' if isinstance(v, (int, float)) else str(v)


def migrate_vec(vec: dict, where: str, changes: list, keep: list, drop: bool = False):
    v = vec.get('typ.baseSize')
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        return
    if drop:
        changes.append(f'{where}: typ.baseSize {fmt(v)} → 删掉（改回派生值：电视 26px@1080p，预览上 13px）')
        del vec['typ.baseSize']
    elif v < 16 or ALL:
        nv = convert(v)
        nv = int(nv) if float(nv).is_integer() else nv
        changes.append(f'{where}: typ.baseSize {fmt(v)} → {fmt(nv)}')
        vec['typ.baseSize'] = nv
    else:
        keep.append(f'{where}: typ.baseSize {fmt(v)}（≥ 16，没换算；旧口径下正文字号 {round(v * 0.93)}，现在不改就是 {fmt(v / 2)} —— 加 --all 一起换成 {fmt(convert(v))}）')


def workarounds(rep: dict) -> list:
    """修订记录 / 差异里提到为抵消电视平台放大而改的平台与安全边距"""
    out = []
    texts = list(rep.get('revisions') or [])
    for k, v in rep.items():
        if re.match(r'^round\d+Diffs$', k) and isinstance(v, dict):
            for lst in v.values():
                texts += [x for x in lst if isinstance(x, str)]
    for t in texts:
        if re.search(r'电视|过扫描|platform\.tv', t) and re.search(r'uip\.platform|平台|lay\.safeMargin|安全边', t):
            out.append(t[:160] + ('…' if len(t) > 160 else ''))
    return out


def replica_files():
    files = sorted(REPS.glob('*.json'))
    if args:
        files = [f for f in files if any(a in f.stem for a in args)]
    return files


total = 0
print(f'规则：< 16 的值 × 2{"（--exact：2 × round(0.93 × 值)）" if EXACT else ""}{"；≥ 16 的也换算（--all）" if ALL else ""}；{"写回" if WRITE else "只打印差异（加 --write 写回）"}\n')
for f in replica_files():
    raw, rep = read(f)
    changes: list = []
    keep: list = []
    rid = rep.get('id', f.stem)
    base = rep.get('base') or {}
    migrate_vec(base, 'base', changes, keep, drop=rid in TO_DERIVED)
    for s in rep.get('screens') or []:
        vals = s.get('values') or {}
        migrate_vec(vals, f'screens.{s.get("key")}', changes, keep)
    wk = workarounds(rep)
    if not (changes or keep or wk):
        continue
    print(f'== {rid}')
    for c in changes:
        print('  改 ', c)
    for c in keep:
        print('  留 ', c)
    plat = base.get('uip.platform'), base.get('ctx.device'), base.get('ctx.input'), base.get('lay.safeMargin')
    for t in wk:
        print(f'  核对（uip.platform = {plat[0]}，ctx.device = {plat[1]}，ctx.input = {plat[2]}，lay.safeMargin = {plat[3]}）：{t}')
    total += len(changes)
    if WRITE and changes:
        save(f, raw, rep)

if WITH_KNOWLEDGE:
    for f in KNOWLEDGE:
        raw, d = read(f)
        changes: list = []
        keep: list = []

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    if k in VEC_KEYS and isinstance(v, dict) and 'typ.baseSize' in v:
                        migrate_vec(v, f'{path}.{k}', changes, keep)
                    walk(v, f'{path}.{k}')
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f'{path}[{i}]')
        walk(d, '$')
        if changes or keep:
            print(f'== {f.name}')
            for c in changes:
                print('  改 ', c)
            for c in keep:
                print('  留 ', c)
        total += len(changes)
        if WRITE and changes:
            save(f, raw, d)

print(f'\n合计 {total} 处{"已写回" if WRITE else "待改"}。迁移前后各出一次复刻对照图（qa/replicas/）确认不漂移。')
