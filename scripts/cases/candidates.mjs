// 第 1 步：解析调研文档 docs/survey/03-cases-and-sources.md
//   - 第三节候选案例表 → src/content/cases/candidates.json（每行一条，原样保留调研文字）
//   - 第二节三大奖项表 → src/content/cases/awards.json
// 用法：node scripts/cases/candidates.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SURVEY_MD, CONTENT_DIR, writeJson, nowIso } from './lib.mjs';

const md = readFileSync(SURVEY_MD, 'utf8');
const lines = md.split(/\r?\n/);

// ---------- 来源缩写 → URL ----------
const IGF_SRC = {
  2026: 'https://igf.com/article/baby-steps-strolls-to-lead-with-5-nominations-at-2026-igf-awards/',
  2024: 'https://press-start.com.au/news/2024/03/21/the-independent-games-festival-awards-2024-finalists-have-been-revealed/',
};
const igfUrl = (year) => IGF_SRC[year] ?? (year >= 2015 && year <= 2025 ? `https://igf.com/archive-${year}/` : 'https://en.wikipedia.org/wiki/Independent_Games_Festival');
const BAFTA_SRC = 'https://en.wikipedia.org/wiki/British_Academy_Games_Award_for_Artistic_Achievement';
const tgaUrl = (year) => `https://en.wikipedia.org/wiki/The_Game_Awards_${year}`;
const SP_SEEDS = { 'SP-ASH': 'https://steampeek.hu/?appid=1055540', 'SP-TS': 'https://steampeek.hu/?appid=1291340' };

function cells(line) {
  const parts = line.split('|').map((s) => s.trim());
  return parts.slice(1, parts.length - 1);
}

function parseAppidCell(raw) {
  const s = raw.trim();
  let m;
  if ((m = s.match(/^(\d+)\s*\(SP\)$/))) return { appids: [Number(m[1])], marker: 'SP' };
  if ((m = s.match(/^(\d+)$/))) return { appids: [Number(m[1])], marker: null };
  if (/^\d+(\s*\/\s*\d+)+$/.test(s)) return { appids: s.split('/').map((x) => Number(x.trim())), marker: null };
  if (s === '—' || s === '-') return { appids: [null], marker: 'non-steam' };
  if (s.startsWith('待核验')) return { appids: [null], marker: 'unverified', note: s };
  return { appids: [null], marker: 'unknown', note: s };
}

function parseSources(raw, appid) {
  const urls = [];
  const markers = [];
  const add = (u) => { if (u && !urls.includes(u)) urls.push(u); };
  if (/\[S\]/.test(raw) && appid) add(`https://store.steampowered.com/app/${appid}/`);
  for (const [k, u] of Object.entries(SP_SEEDS)) if (raw.includes(`[${k}]`)) { add(u); markers.push(k); }
  if (raw.includes('[TOP]')) markers.push('TOP');
  if (raw.includes('[WL]')) markers.push('WL');
  for (const m of raw.matchAll(/https?:\/\/[^\s；;，,）]+/g)) {
    let u = m[0];
    // 只去掉不成对的结尾右括号（保留 wiki 地址里的 "(video_game)"）
    while (u.endsWith(')') && (u.match(/\(/g) || []).length < (u.match(/\)/g) || []).length) u = u.slice(0, -1);
    add(u);
  }
  const site = raw.match(/官网\s*([a-z0-9.-]+\.[a-z]{2,})/i);
  if (site) add(`https://${site[1]}`);
  for (const m of raw.matchAll(/\bIGF(\d{2})\b/g)) add(igfUrl(2000 + Number(m[1])));
  if (/见\s*2\.2/.test(raw)) add(BAFTA_SRC);
  if (/2\.3/.test(raw)) add('https://en.wikipedia.org/wiki/The_Game_Awards');
  if (raw.includes('来源待补')) markers.push('来源待补');
  return { urls, markers };
}

// ---------- 候选表 ----------
const candidates = [];
let inCases = false;
let group = null;
let rowNo = 0;
for (const line of lines) {
  if (/^## /.test(line)) { inCases = line.startsWith('## 三'); group = null; continue; }
  if (!inCases) continue;
  const g = line.match(/^### ([A-Z])\. (.+)$/);
  if (g) { group = { letter: g[1], title: g[2].trim() }; continue; }
  if (!group || !line.startsWith('|')) continue;
  const c = cells(line);
  if (c.length < 7 || c[0] === '名称' || /^-+$/.test(c[0].replace(/[:\s]/g, ''))) continue;
  rowNo++;
  const [nameCell, appidCell, platform, developer, artFeature, evidence, sourcesCell] = c;
  const parsed = parseAppidCell(appidCell);
  const names = parsed.appids.length > 1 ? nameCell.split('/').map((s) => s.trim()) : [nameCell];
  const crossRef = [artFeature, evidence, sourcesCell].join(' ').match(/见\s*([A-Z])\s*组/);
  names.forEach((name, i) => {
    const appid = parsed.appids[i] ?? null;
    const src = parseSources(sourcesCell, appid);
    candidates.push({
      row: rowNo,
      name,
      surveyAppid: appid,
      appidCell,
      marker: parsed.marker, // null=已核验数字 / SP / non-steam / unverified
      markerNote: parsed.note ?? null,
      group: group.letter,
      groupTitle: group.title,
      platform,
      developer,
      artFeature,
      evidence,
      sourcesRaw: sourcesCell,
      sources: src.urls,
      sourceMarkers: src.markers,
      crossRefGroup: crossRef ? crossRef[1] : null,
      splitFrom: names.length > 1 ? nameCell : null,
    });
  });
}

// ---------- 奖项表 ----------
const awards = [];
const AWARD = {
  IGF: 'IGF Excellence in Visual Art',
  BAFTA: 'BAFTA Artistic Achievement',
  TGA: 'TGA Best Art Direction',
};
const stripBold = (s) => s.replace(/\*\*/g, '').replace(/★/g, '').trim();
let sec = null;
for (const line of lines) {
  if (line.startsWith('### 2.1')) sec = 'IGF';
  else if (line.startsWith('### 2.2')) sec = 'BAFTA';
  else if (line.startsWith('### 2.3')) sec = 'TGA';
  else if (/^##? /.test(line) && !line.startsWith('### 2.')) { if (line.startsWith('## ')) sec = null; }
  if (!sec) continue;

  if (sec === 'IGF' && line.startsWith('更早的获奖作品')) {
    for (const part of line.replace(/^[^：]*：/, '').replace(/。$/, '').split('、')) {
      const m = part.trim().match(/^(\d{4})\s+(.+)$/);
      if (m) awards.push({ awardKey: 'IGF', award: AWARD.IGF, year: Number(m[1]), name: m[2].trim(), result: 'winner', source: igfUrl(Number(m[1])) });
    }
    continue;
  }
  if (!line.startsWith('|')) continue;
  const c = cells(line);
  const ym = c[0]?.match(/^(\d{4})/);
  if (!ym) continue;
  const year = Number(ym[1]);
  const yearLabel = c[0];
  if (sec === 'IGF') {
    for (const item of c[1].split('、')) {
      const winner = item.includes('★');
      awards.push({ awardKey: 'IGF', award: AWARD.IGF, year, name: stripBold(item), result: winner ? 'winner' : 'nominee', source: igfUrl(year) });
    }
    for (const item of (c[2] ?? '').split('、').filter((s) => s.trim())) {
      awards.push({ awardKey: 'IGF', award: AWARD.IGF, year, name: stripBold(item), result: 'honorable', source: igfUrl(year) });
    }
  } else {
    const [win, rest = ''] = c[1].split('；');
    const src = sec === 'BAFTA' ? BAFTA_SRC : tgaUrl(year);
    const extra = sec === 'BAFTA' && yearLabel !== String(year) ? { yearLabel } : {};
    awards.push({ awardKey: sec, award: AWARD[sec], year, name: stripBold(win), result: 'winner', source: src, ...extra });
    for (const item of rest.split('、').filter((s) => s.trim())) {
      awards.push({ awardKey: sec, award: AWARD[sec], year, name: stripBold(item), result: 'nominee', source: src, ...extra });
    }
  }
}

const generatedAt = nowIso();
writeJson(join(CONTENT_DIR, 'candidates.json'), {
  generatedAt,
  source: 'docs/survey/03-cases-and-sources.md 第三节',
  surveyRows: rowNo,
  count: candidates.length,
  candidates,
});
writeJson(join(CONTENT_DIR, 'awards.json'), {
  generatedAt,
  source: 'docs/survey/03-cases-and-sources.md 第二节（IGF 以维基百科与 igf.com 存档为准；BAFTA 年份为游戏年度，括号为颁奖年）',
  count: awards.length,
  awards,
});

const byMarker = candidates.reduce((m, c) => ((m[c.marker ?? 'numeric'] = (m[c.marker ?? 'numeric'] ?? 0) + 1), m), {});
const groups = new Set(candidates.map((c) => c.group));
console.log(`survey rows: ${rowNo}, candidates: ${candidates.length} (groups ${groups.size})`, byMarker);
console.log(`awards: ${awards.length}`, ['IGF', 'BAFTA', 'TGA'].map((k) => `${k}=${awards.filter((a) => a.awardKey === k).length}`).join(' '));
