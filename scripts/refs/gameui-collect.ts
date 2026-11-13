/*
 * UI 参考库：从 GameUI.net（国内游戏 UI 设计师社区）的公开接口收集元数据。
 * 运行：npx tsx scripts/refs/gameui-collect.ts
 *
 * 只取元数据，不下载、不转存图片（用户协议禁止复制、传播站内作品）：
 *   - 筛选分类（风格 / 平台 / 版式 / 年份 / 类型 / 主题 / 功能 / 材质）及每个值的截图数
 *   - 全部游戏：风格、平台、年份、类型、主题标签、点赞 / 浏览 / 收藏、截图数
 *   - 全部设计师作品：分类、标签、点赞 / 浏览 / 收藏
 *   - 每种"材质"、每种"功能"各抽样最近的截图：截图上的功能 + 材质标签、所属游戏的风格 / 平台 / 类型（用于交叉统计）
 *   - 点赞最多的作品的评论（只取内容与点赞数，不取用户信息）
 * 不查询任何用户个人字段（邮箱、电话、QQ、微信等）。
 * robots.txt 允许全部抓取；最多 3 个请求同时进行，相邻两次发出至少隔 0.4 秒；结果缓存在 qa/refs-cache/gameui/q/，重跑不重复请求。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'qa', 'refs-cache', 'gameui');
const QDIR = join(DIR, 'q');
mkdirSync(QDIR, { recursive: true });
const UA = 'game-art-explorer-research/0.1';
// 站点较慢：最多 3 个请求同时在路上，相邻两次发出至少隔 400ms；单次请求 45 秒超时
const GAP = 400;
const CONCURRENCY = 3;
const TIMEOUT = 45_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;
let live = 0;
let inflight = 0;

async function slot() {
  for (;;) {
    const wait = last + GAP - Date.now();
    if (inflight < CONCURRENCY && wait <= 0) { inflight++; last = Date.now(); return; }
    await sleep(Math.max(50, wait));
  }
}

async function gql<T>(query: string): Promise<T | null> {
  const key = createHash('sha1').update(query).digest('hex').slice(0, 16);
  const f = join(QDIR, `${key}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')).data as T;
  for (let attempt = 0; attempt < 4; attempt++) {
    await slot();
    try {
      const r = await fetch(`https://www.gameui.net/api?query=${encodeURIComponent(query)}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
      if (r.status === 429 || r.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
      const j = await r.json() as { data?: T; errors?: unknown };
      if (j.errors) { console.warn('errors', JSON.stringify(j.errors).slice(0, 200), query.slice(0, 120)); return null; }
      writeFileSync(f, JSON.stringify({ query, data: j.data }));
      live++;
      return j.data ?? null;
    } catch {
      await sleep(5000 * (attempt + 1));
    } finally {
      inflight--;
    }
  }
  console.warn('  放弃：', query.slice(0, 100));
  return null;
}

/** 并行跑一组任务（实际并发由 gql 的 slot 控制） */
const pmap = <T, R>(xs: T[], f: (x: T) => Promise<R>) => Promise.all(xs.map(f));

/** 翻页直到返回不足一页 */
async function all<T>(make: (page: number) => string, field: string, size: number, max = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let p = 1; p <= max; p++) {
    const d = await gql<Record<string, T[]>>(make(p));
    const rows = d?.[field] ?? [];
    out.push(...rows);
    if (rows.length < size) break;
    if (p % 20 === 0) console.log(`  ${field} page ${p}: ${out.length}`);
  }
  return out;
}

const save = (name: string, data: unknown) => writeFileSync(join(DIR, name), JSON.stringify(data));

interface FilterList { name: string; field: string; list: { id: number; name: string; num: number }[] | null }

async function main() {
  const counts = await gql<{ counts: { games: number; images: number } }>('{counts{games,images}}');
  const filters = (await gql<{ filter: FilterList[] }>('{filter(type:"image"){name,game,field,only,list{id,name,num}}}'))?.filter ?? [];
  const categories = (await gql<{ categories: unknown[] }>('{categories{id,name,parent_id}}'))?.categories ?? [];
  save('filters.json', { counts: counts?.counts, filters, categories });
  console.log('counts', counts?.counts);

  // 1. 全部游戏
  const GS = 100;
  const games = await all((p) => `{games(page:${p},pagesize:${GS},sort:"id:DESC",status:0){id,name,hash,style,device,era,orientation,tags,praise,see,collect_num,total_image_count,category{id,name}}}`, 'games', GS);
  save('games.json', games);
  console.log('games', games.length);

  // 2. 全部作品（设计师作品集）
  const works = await all((p) => `{works(page:${p},pagesize:${GS},sort:"id:DESC",status:0){id,name,hash,praise,see,collect_num,total_image_count,video_url,tags,createdAt,category{id,name}}}`, 'works', GS);
  save('works.json', works);
  console.log('works', works.length);

  // 3. 材质 / 功能抽样：每个值取最近的 2 页（200 张）截图的标签与所属游戏
  const pick = (name: string) => filters.find((f) => f.name === name)?.list ?? [];
  const IMG = 'id,content,width,height,tags,article{id,name,style,device,category_id,tags}';
  const sample = async (group: string, pages: number) => {
    const out: Record<string, unknown[]> = {};
    for (const v of pick(group)) {
      const rows: unknown[] = [];
      for (let p = 1; p <= pages; p++) {
        const d = await gql<{ images: unknown[] }>(`{images(page:${p},pagesize:100,image_tags:"${v.name}",sort:"id:DESC",status:0){${IMG}}}`);
        rows.push(...(d?.images ?? []));
        if ((d?.images?.length ?? 0) < 100) break;
      }
      out[v.name] = rows;
    }
    return out;
  };
  save('material-samples.json', await sample('材质', 2));
  console.log('materials done');
  save('function-samples.json', await sample('功能', 1));
  console.log('functions done');

  // 4. 点赞最多的 120 个作品的评论（只要内容与点赞）
  const top = [...works].sort((a: any, b: any) => (b.praise ?? 0) - (a.praise ?? 0)).slice(0, 120);
  const comments: Record<number, { content: string; praise: number }[]> = {};
  for (const w of top as any[]) {
    const d = await gql<{ comments: { content: string; praise: number }[] }>(`{comments(article_id:${w.id},page:1,pagesize:50){content,praise}}`);
    comments[w.id] = d?.comments ?? [];
  }
  save('comments.json', comments);

  // 5. 材质截图全集（每种材质翻完所有页；材质标签总共约 4,000 张）
  const fullMat: Record<string, unknown[]> = {};
  await pmap(pick('材质'), async (v) => {
    const pages = Math.ceil(v.num / 100);
    const rows = await pmap(Array.from({ length: pages }, (_, i) => i + 1), async (p) =>
      (await gql<{ images: unknown[] }>(`{images(page:${p},pagesize:100,image_tags:"${v.name}",sort:"id:DESC",status:0){${IMG}}}`))?.images ?? []);
    fullMat[v.name] = rows.flat();
  });
  save('material-all.json', fullMat);
  console.log('material corpus', Object.values(fullMat).reduce((n, r) => n + r.length, 0));

  // 6. 热门作品与热门游戏的截图列表（只存图片地址 = Image.content，不下载图片）
  const SHOT = 'id,content,width,height,sort,tags';
  // 游戏的截图：images(article_id)；作品的图要加 category_top_id:34（"作品"大类），否则返回空（2026-10-14 试出来的）
  const shotsOf = async (id: number, work = false) =>
    (await gql<{ images: unknown[] }>(`{images(article_id:${id},${work ? 'category_top_id:34,' : ''}page:1,pagesize:100,status:0){${SHOT}}}`))?.images ?? [];
  const topWorks = [...works].sort((a: any, b: any) => ((b.collect_num ?? 0) * 2 + (b.praise ?? 0) * 3) - ((a.collect_num ?? 0) * 2 + (a.praise ?? 0) * 3)).slice(0, 60) as any[];
  const workShots: Record<number, unknown[]> = {};
  await pmap(topWorks, async (w) => { workShots[w.id] = await shotsOf(w.id, true); });
  save('work-images.json', workShots);
  const score = (g: any) => (g.collect_num ?? 0) * 3 + (g.praise ?? 0) * 5 + (g.see ?? 0) / 100;
  const topGames = [...games].sort((a: any, b: any) => score(b) - score(a)).slice(0, 100) as any[];
  const gameShots: Record<number, unknown[]> = {};
  await pmap(topGames, async (g) => { gameShots[g.id] = await shotsOf(g.id); });
  save('game-images.json', gameShots);
  console.log('work images', Object.values(workShots).reduce((n, r) => n + r.length, 0), 'game images', Object.values(gameShots).reduce((n, r) => n + r.length, 0));
  console.log(`done; live requests ${live}`);
}

main();
