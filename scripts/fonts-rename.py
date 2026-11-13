"""
把子集字体（src/assets/fonts/*.woff2）里的字体名改成我们自己的名字（GAE …，= fontList.ts 的 fontName ?? family）。
OFL 不允许修改版（子集也算）沿用原字体的保留字体名（Reserved Font Name）；subset-font 只取字、不改名，所以子集化之后要跑这一步。
scripts/fonts-subset.ts 写完 woff2 会自动调用本脚本（登记表从标准输入传进来）；也可以单独跑：
  python -I scripts/fonts-rename.py            按 src/hud/fontList.ts 的 HUD_FONT_FILES 改 src/assets/fonts/ 下的全部 woff2
  python -I scripts/fonts-rename.py --stdin    登记表从标准输入读（JSON：[{"file": ..., "family": ..., "fontName": ...（可省）, "weight": ...}]）
  python -I scripts/fonts-rename.py --check    只检查，不写文件（名字不对时退出码 1）
改什么：name 表的 1（字族）、2（子字族）、3（唯一标识）、4（全名）、6（PostScript 名），以及有的话 16 / 17 / 18 / 21 / 22 / 25；
  所有平台、所有语言的记录一起改。CFF 字体同时改 CFF 里的字体名（CFF2 不存字体名）。700 字重把 OS/2 与 head 的粗体标记对上「Bold」。
不改什么：0（版权）、5（版本）、13 / 14（许可）与其余名字；字形、度量、cmap 原样；不更新 head 的修改时间，重跑结果不变。
需要 fontTools 与 brotli（pip install fonttools brotli）。
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

# 输出走 UTF-8（-I 下 PYTHONIOENCODING 不生效；被 Node 用管道接住时默认是系统代码页）
for _stream in (sys.stdout, sys.stderr):
    _stream.reconfigure(encoding='utf-8')

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit('fonts-rename：缺少 fontTools，请先 pip install fonttools brotli')

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / 'src' / 'assets' / 'fonts'
FONT_LIST = ROOT / 'src' / 'hud' / 'fontList.ts'
SUFFIX = 'game-art-explorer subset'
# 原字体名里的词：改完后 1 / 3 / 4 / 6 / 16 / 17 / 18 / 21 / 22 / 25 里不能再出现（0 版权、13 / 14 许可里可以有）
UPSTREAM = re.compile(r'kreon|almendra|pirata|smiley|得意黑|lxgw|霞鹜|霞鶩|落霞|source|noto|space ?grotesk|rajdhani|cinzel|vt323|comic ?neue|zcool|站酷|fusion|ark ?pixel|cubic|galmuri', re.I)
WEIGHT_NAMES = {100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'}
# 只在原字体有这条记录时才改（没有就不加；400 / 700 以外的字重另外补上 16 / 17）
OPTIONAL_IDS = (16, 17, 18, 21, 22, 25)


def read_font_list():
    """从 fontList.ts 的 HUD_FONT_FILES 读 family / fontName / weight / file（一行一个 { family: '…', … }）"""
    text = FONT_LIST.read_text(encoding='utf-8')
    m = re.search(r'export const HUD_FONT_FILES[^=]*=\s*\[(.*?)\n\];', text, re.S)
    if not m:
        sys.exit(f'fonts-rename：{FONT_LIST} 里找不到 HUD_FONT_FILES')
    rows = []
    for line in m.group(1).splitlines():
        if not re.match(r'\s*\{\s*family:', line):
            continue

        def field(key, pat=r"'([^']+)'"):
            hit = re.search(rf'\b{key}:\s*{pat}', line)
            return hit.group(1) if hit else None

        fam, name, w, f = field('family'), field('fontName'), field('weight', r'(\d+)'), field('file')
        if not (fam and w and f):
            sys.exit(f'fonts-rename：读不懂 fontList.ts 的这一行：{line.strip()[:120]}')
        rows.append({'family': fam, 'fontName': name, 'weight': int(w), 'file': f})
    return rows


def names_for(family, weight):
    """文件内字族名 → 各 nameID 的值。400 / 700 是 RIBBI（字族 + Regular / Bold）；其他字重把字重名并进 1，16 / 17 写完整的字族与字重"""
    if not re.fullmatch(r'GAE [A-Za-z0-9 ]+', family):
        raise ValueError(f'字族名 {family!r} 要以 "GAE " 开头、只用英文字母数字与空格')
    if UPSTREAM.search(family[4:]):
        raise ValueError(f'字族名 {family!r} 带了原字体名：在 fontList.ts 这一行加 fontName（不带原字体名的 GAE … 名字）')
    sub = WEIGHT_NAMES.get(weight)
    if not sub:
        raise ValueError(f'字重 {weight} 不是 100–900 的整百数')
    ribbi = sub in ('Regular', 'Bold')
    ps = f"{family.replace(' ', '')}-{sub}"
    full = f'{family} {sub}'
    v = {
        1: family if ribbi else full,
        2: sub if ribbi else 'Regular',
        3: f'{full}; {SUFFIX}',
        4: full,
        6: ps,
        16: family,
        17: sub,
        18: full,
        21: family,
        22: sub,
        25: family.replace(' ', ''),
    }
    return v, ps, ribbi, sub == 'Bold'


def set_name(name_table, name_id, value, add):
    """把某个 nameID 的所有记录（所有平台 / 语言）换成 value；add = 没有记录时也加一条 Windows 英文"""
    keys = {(r.platformID, r.platEncID, r.langID) for r in name_table.names if r.nameID == name_id}
    if not keys and not add:
        return
    if add:
        keys.add((3, 1, 0x409))
    name_table.names = [r for r in name_table.names if r.nameID != name_id]
    for p, e, lang in sorted(keys):
        name_table.setName(value, name_id, p, e, lang)


def rename_cff(font, family, full, ps):
    """CFF 字体的名字也在 CFF 表里（Name INDEX、TopDict 的 FamilyName / FullName，CID 字体的 FDArray 各有 FontName）；CFF2 不存名字"""
    if 'CFF ' not in font:
        return
    cff = font['CFF '].cff
    cff.fontNames = [ps]
    td = cff.topDictIndex[0]
    if hasattr(td, 'FamilyName'):
        td.FamilyName = family
    if hasattr(td, 'FullName'):
        td.FullName = full
    if hasattr(td, 'FDArray'):
        for i, fd in enumerate(td.FDArray):
            if hasattr(fd, 'FontName'):
                tail = fd.FontName.rsplit('-', 1)[-1] if '-' in fd.FontName else str(i)
                fd.FontName = f'{ps}-{tail}'


def problems(font, want):
    """改完后核对：该改的 nameID 都等于我们的值、不含原字体名；CFF 名字也是我们的"""
    out = []
    for r in font['name'].names:
        if r.nameID in want and r.nameID in (1, 2, 3, 4, 6) + OPTIONAL_IDS:
            s = r.toUnicode()
            if s != want[r.nameID]:
                out.append(f'nameID {r.nameID} = {s!r}，应为 {want[r.nameID]!r}')
            elif UPSTREAM.search(s.replace('GAE', '')):
                out.append(f'nameID {r.nameID} = {s!r} 含原字体名')
    for nid in (1, 2, 3, 4, 6):
        if not any(r.nameID == nid and (r.platformID, r.platEncID, r.langID) == (3, 1, 0x409) for r in font['name'].names):
            out.append(f'缺 nameID {nid}（Windows 英文）')
    if 'CFF ' in font:
        names = font['CFF '].cff.fontNames
        if names != [want[6]]:
            out.append(f'CFF 字体名 {names}，应为 {want[6]!r}')
    return out


def process(path, family, weight, check_only):
    want, ps, ribbi, bold = names_for(family, weight)
    font = TTFont(str(path), recalcBBoxes=False, recalcTimestamp=False)
    if font.flavor != 'woff2':
        raise ValueError(f'{path.name} 不是 WOFF2')
    if check_only:
        return problems(font, want)
    name = font['name']
    for nid in (1, 2, 3, 4, 6):
        set_name(name, nid, want[nid], add=True)
    for nid in OPTIONAL_IDS:
        set_name(name, nid, want[nid], add=not ribbi and nid in (16, 17))
    rename_cff(font, family, want[4], ps)
    # 子字族写了 Bold，就把 OS/2.fsSelection 的 BOLD 位（并清掉 REGULAR 位）与 head.macStyle 的粗体位对上；其余字重清掉粗体位
    os2, head = font['OS/2'], font['head']
    if bold:
        os2.fsSelection = (os2.fsSelection | 0x20) & ~0x40
        head.macStyle |= 0x01
    else:
        os2.fsSelection &= ~0x20
        head.macStyle &= ~0x01
    left = problems(font, want)
    if left:
        return left
    tmp = path.with_name(path.name + '.tmp')
    font.save(str(tmp))
    os.replace(tmp, path)
    return []


def main():
    ap = argparse.ArgumentParser(description='把子集字体的 name 表改成我们的名字（GAE …）')
    ap.add_argument('--stdin', action='store_true', help='登记表从标准输入读（JSON 数组：file / family / fontName / weight）')
    ap.add_argument('--dir', default=str(FONT_DIR), help='woff2 所在目录（默认 src/assets/fonts/）')
    ap.add_argument('--check', action='store_true', help='只检查，不写文件')
    args = ap.parse_args()
    rows = json.loads(sys.stdin.buffer.read().decode('utf-8')) if args.stdin else read_font_list()
    font_dir = Path(args.dir)
    listed = {r['file'] for r in rows}
    on_disk = {p.name for p in font_dir.glob('*.woff2')}
    errors = [f'{f}：在 {font_dir} 里，但登记表里没有（不知道该叫什么名字）' for f in sorted(on_disk - listed)]
    errors += [f'{f}：登记表里有，文件不存在' for f in sorted(listed - on_disk)]
    if errors:
        sys.exit('fonts-rename：\n  ' + '\n  '.join(errors))
    bad = 0
    for r in rows:
        path = font_dir / r['file']
        family = r.get('fontName') or r['family']
        try:
            left = process(path, family, int(r['weight']), args.check)
        except Exception as e:  # noqa: BLE001 —— 一个文件出错也要报完其余的
            left = [f'{type(e).__name__}: {e}']
        if left:
            bad += 1
            print(f'  {r["file"]}：' + '；'.join(left), file=sys.stderr)
        elif not args.check:
            print(f'  {r["file"]:<28} → {names_for(family, int(r["weight"]))[1]}')
    verb = '核对' if args.check else '改名'
    if bad:
        sys.exit(f'fonts-rename：{bad} / {len(rows)} 个文件{verb}没通过')
    print(f'fonts-rename：{len(rows)} 个文件{verb}完成')


if __name__ == '__main__':
    main()
