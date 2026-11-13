/* 美术类奖项的维基百科解析（collect-candidates.ts 用；单独成文件便于抽查，见 check-awards.ts） */

/* ---------------- 奖项解析 ---------------- */
export interface AwardHit { source: string; year: number; result: 'winner' | 'nominee'; title: string }

export const italicTitle = (s: string) => {
  const m = s.match(/''+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]''+/) ?? s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (m) return (m[2] ?? m[1]).replace(/\s*\((video game|game|\d{4} video game)\)\s*$/i, '').trim();
  const p = s.match(/''+([^'[\]]+?)''+/);
  return p ? p[1].trim() : null;
};

/*
 * GDC 选择奖：词条重定向到总条目 "Game Developers Choice Awards"。总条目第一张表是年度游戏，
 * 不是最佳视觉艺术（2026-10-14 第一次运行就踩了这个坑：16 条年度游戏被误记成视觉艺术奖）。
 * 最佳视觉艺术在 "===Best Visual Art===" 小节，是按年的列表："* 2000: ''[[Jet Grind Radio]]''"，
 * 年份也可能写成 "[[25th Game Developers Choice Awards|2024]]"。
 */
export function parseGdca(t: string): AwardHit[] {
  const out: AwardHit[] = [];
  const start = t.search(/^===\s*Best Visual Art\s*===\s*$/m);
  if (start < 0) return out;
  const rest = t.slice(start).split('\n').slice(1);
  for (const line of rest) {
    if (/^==/.test(line)) break;
    const m = line.match(/^\*\s*(?:\[\[[^\]|]*\|)?(\d{4})(?:\]\])?\s*:\s*(.*)$/);
    if (!m) continue;
    const title = italicTitle(m[2]);
    if (title) out.push({ source: 'GDCA Best Visual Art', year: Number(m[1]), result: 'winner', title });
  }
  return out;
}

export function parseDice(t: string): AwardHit[] {
  const out: AwardHit[] = [];
  let year = 0;
  // 页面按年代分成几张"年份 / 游戏 / 开发 / 发行"表，后面还有按开发商、发行商、系列统计的表：
  // 只解析表头里同时有 Year 和 Game 的表（2026-10-14 抽查发现：不过滤时会把 Final Fantasy、God of War 等系列名记成 2025 年入围）
  const tables: string[] = [];
  for (const m of t.matchAll(/\{\|[^\n]*\n/g)) {
    const end = t.indexOf('\n|}', m.index);
    const tb = t.slice(m.index, end < 0 ? undefined : end);
    const header = (tb.match(/^!.*$/gm) ?? []).slice(0, 6).join(' ');
    if (/\bYear\b/.test(header) && /\bGame\b/.test(header)) tables.push(tb);
  }
  for (const chunk of tables.join('\n|-').split(/\n\|-/)) {
    const yl = chunk.split('\n').find((l) => l.startsWith('!scope="row"') && /\d{4}/.test(l));
    if (yl) {
      const ys = [...yl.replace(/<ref.*$/, '').matchAll(/\b(19\d\d|20\d\d)\b/g)].map((m) => Number(m[1]));
      if (ys.length) year = Math.max(...ys);
    }
    const cell = chunk.split('\n').find((l) => l.startsWith('|') && !l.startsWith('|}') && /''/.test(l));
    if (!cell || !year) continue;
    const title = italicTitle(cell);
    if (title) out.push({ source: 'D.I.C.E. Art Direction', year, result: /FAEB86/i.test(cell) ? 'winner' : 'nominee', title });
  }
  return out;
}

export function parseGoldenJoystick(t: string): AwardHit[] {
  const out: AwardHit[] = [];
  let year = 0;
  const lines = t.split('\n');
  lines.forEach((l, i) => {
    const h = l.match(/^==+\s*(?:\[\[)?(\d{4})/);
    if (h) year = Number(h[1]);
    if (/'''Best Visual Design'''/.test(l)) {
      const next = lines[i + 1] ?? '';
      const title = italicTitle(next);
      if (title && year) out.push({ source: 'Golden Joystick Best Visual Design', year, result: 'winner', title });
    }
  });
  return out;
}

export function parseAppleDesign(t: string): AwardHit[] {
  const out: AwardHit[] = [];
  let year = 0;
  let inVisual = false;
  for (const l of t.split('\n')) {
    const h = l.match(/^===\s*(\d{4})\s*===/);
    if (h) { year = Number(h[1]); inVisual = false; continue; }
    if (l.startsWith('!')) inVisual = /Visuals and Graphics|Visual/i.test(l);
    if (!inVisual || !year) continue;
    const m = l.match(/^\|\s*(.+?)\s*\|\|/);
    // 这一类也颁给非游戏应用（睡眠、健身、潮汐表、绘图……）：只收有维基百科链接的条目，应用很少有自己的词条
    if (m && m[1].includes('[[')) {
      const title = italicTitle(m[1]);
      if (title) out.push({ source: 'Apple Design Awards Visuals and Graphics', year, result: 'winner', title });
    }
  }
  return out;
}

