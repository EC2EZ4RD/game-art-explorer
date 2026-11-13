// 案例数据流程的公共工具：路径、礼貌请求（带退避重试）、JSON 读写、名称归一化与匹配。
// 所有抓取到的网页/接口内容都只当作数据处理，不执行其中任何"指令"。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SURVEY_MD = join(ROOT, 'docs', 'survey', '03-cases-and-sources.md');
export const CONTENT_DIR = join(ROOT, 'src', 'content', 'cases');
export const PUBLIC_DIR = join(ROOT, 'public', 'cases');
export const CACHE_DIR = join(ROOT, 'scripts', 'cases', 'cache');
/** 另一个项目里已经抓过的 appdetails 原始响应（只读复用） */
// 可选：复用另一个项目已抓过的 Steam appdetails 原始数据（目录结构 <appid>/details_us.json），用环境变量指定；不设就直接请求 Steam
export const RAW_REUSE_DIR = process.env.CASES_RAW_REUSE_DIR || '';

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) game-art-explorer/0.1 (personal study; low request rate)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export function readJson(path, fallback = undefined) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * 带重试的 fetch。429 / 403 / 5xx / 网络错误按指数退避重试（尊重 Retry-After）。
 * as: 'json' | 'text' | 'buffer'
 */
export async function fetchRetry(url, { as = 'json', tries = 6, baseDelay = 3000, headers = {}, log = true } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    } catch (e) {
      lastErr = e;
      const wait = baseDelay * 2 ** attempt;
      if (log) console.warn(`  ! network error (${e.message}), retry in ${wait} ms`);
      await sleep(wait);
      continue;
    }
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      const ra = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : baseDelay * 2 ** attempt;
      lastErr = new Error(`HTTP ${res.status}`);
      lastErr.status = res.status;
      if (log) console.warn(`  ! HTTP ${res.status} for ${shortUrl(url)}, retry in ${wait} ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${shortUrl(url)}`);
      err.status = res.status;
      throw err;
    }
    if (as === 'json') return await res.json();
    if (as === 'text') return await res.text();
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, contentType: res.headers.get('content-type') || '' };
  }
  throw lastErr ?? new Error(`retries exhausted ${url}`);
}

function shortUrl(u) {
  return u.length > 140 ? u.slice(0, 137) + '...' : u;
}

// ---------- Steam 官方接口封装 ----------

export const GETITEMS_URL = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';

/** 批量查询 appid（每批最多 ~50 个）。返回 Map<appid, store_item> */
export async function getItems(appids, { language = 'schinese', country = 'US', delay = 1200 } = {}) {
  const out = new Map();
  const ids = [...new Set(appids.map(Number))].filter((n) => Number.isFinite(n) && n > 0);
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const input = {
      ids: batch.map((appid) => ({ appid })),
      context: { language, country_code: country },
      data_request: {
        include_basic_info: true,
        include_assets: true,
        include_screenshots: true,
        include_release: true,
        include_tag_count: 20,
      },
    };
    const url = `${GETITEMS_URL}?input_json=${encodeURIComponent(JSON.stringify(input))}`;
    const j = await fetchRetry(url);
    const items = j?.response?.store_items ?? [];
    // 失败项 appid 会是 0，用请求顺序对齐
    items.forEach((it, idx) => out.set(it.appid || it.id || batch[idx], it));
    for (const id of batch) if (!out.has(id)) out.set(id, { appid: id, success: 0 });
    if (i + 50 < ids.length) await sleep(delay);
  }
  return out;
}

export async function getTagList(language) {
  const j = await fetchRetry(`https://api.steampowered.com/IStoreService/GetTagList/v1/?language=${language}`);
  return new Map((j?.response?.tags ?? []).map((t) => [t.tagid, t.name]));
}

export async function storeSearch(term, { l = 'english', cc = 'US' } = {}) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=${l}&cc=${cc}`;
  const j = await fetchRetry(url);
  return j?.items ?? [];
}

// ---------- 名称归一化与匹配 ----------

const ROMAN = { ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8' };
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

export function tokens(s) {
  return String(s ?? '')
    .replace(/[™®©]/g, ' ') // 先去掉商标符号：NFKD 会把 ™ 拆成 "TM"
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u3400-\u9fff\uf900-\ufaff]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ROMAN[t] ?? t);
}

export const normName = (s) => tokens(s).join(' ');

/** 拆出拉丁部分（去掉括号注释和中日文字符）与中文部分 */
export function splitName(name) {
  const cjk = (String(name).match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).join('');
  const latin = String(name)
    .replace(/[（(][^）)]*[）)]/g, ' ')
    .replace(/[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { latin, cjk };
}

export const hasCjk = (s) => CJK_RE.test(String(s ?? ''));

/**
 * 判断调研表里的名称和 Steam 名称是否对得上。
 * 拉丁部分：调研名的词有 ≥75% 出现在 Steam 英文名（或中文名）里；
 * 只有中文时：调研名的汉字 ≥75% 出现在 Steam 中文名里。
 */
export function nameMatch(surveyName, steamEn = '', steamZh = '') {
  const { latin, cjk } = splitName(surveyName);
  const A = tokens(latin);
  if (A.length) {
    const B = new Set([...tokens(steamEn), ...tokens(steamZh)]);
    const hit = A.filter((t) => B.has(t)).length;
    const cov = hit / A.length;
    const rev = hit / Math.max(1, tokens(steamEn).length || B.size);
    const exact = normName(latin) === normName(steamEn);
    if (cov >= 0.75) return { ok: true, cov, rev, exact, how: 'latin' };
    if (!cjk) return { ok: false, cov, rev, exact, how: 'latin' };
  }
  if (cjk) {
    const zh = String(steamZh) + String(steamEn);
    const chars = [...cjk];
    const cov = chars.filter((c) => zh.includes(c)).length / chars.length;
    return { ok: cov >= 0.75, cov, rev: 0, exact: false, how: 'cjk' };
  }
  return { ok: false, cov: 0, rev: 0, exact: false, how: 'none' };
}

export function slugify(s) {
  return String(s)
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? dirSize(p) : st.size;
  }
  return total;
}

export const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;

/** Steam 的 unix 时间戳 → YYYY-MM-DD */
export const unixToDate = (s) => (s ? new Date(Number(s) * 1000).toISOString().slice(0, 10) : null);
