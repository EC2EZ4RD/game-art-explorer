import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 开发端点只接受本页面发来的请求：别的网站在浏览器里向 localhost 发跨站 POST 时，
 * 浏览器会带上 Origin / Sec-Fetch-Site，这里据此拒绝，免得外部页面往磁盘写文件。
 * 没有这两个头的请求（本机脚本）照常放行。
 */
function sameOrigin(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin !== 'null') {
    // HTTP/2（开了 server.https 时）没有 Host 头，用 :authority
    const host = req.headers.host ?? req.headers[':authority'];
    try { if (new URL(origin).host !== host) return false; } catch { return false; }
  } else if (origin === 'null') return false;
  return true;
}

/** 开发时：把页面截图保存到 qa/ 目录，用于视觉回归检查 */
function qaSaver(): Plugin {
  return {
    name: 'qa-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__qa/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        if (!sameOrigin(req)) { res.statusCode = 403; res.end('cross-origin'); return; }
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { name: string; dataUrl: string };
            // 可带子目录（如 replicas/xxx）：逐段清洗，不允许跳出 qa/
            const parts = name.split('/').map((s) => s.replace(/[^\w.-]/g, '_')).filter((s) => s && s !== '.' && s !== '..');
            const file = join(server.config.root, 'qa', ...parts) + '.png';
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
            res.end('ok');
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

/** 能写进 public/ 的烘焙产物（缩略图、色板…）的扩展名 */
const BAKE_EXT = /\.(webp|png|jpg|json)$/i;

/**
 * 开发时的通用烘焙端点（轨道 C，docs/workbench-redesign.md §11.1）：
 *   POST /__bake?dir=thumbs   body = {"name": "watercolor.webp", "dataUrl": "data:image/webp;base64,…"}（或 "text" 写 JSON）
 *   → 写到 public/<dir>/<name>。dir、name 逐段清洗，只能落在 public/ 下，不能覆盖 public/cases、public/assets、public/fonts。
 * 轨道 C 用它烘焙配方缩略图（public/thumbs/），轨道 D 可以用它烘焙皮肤色板（public/swatches/）。
 */
function bakeEndpoint(): Plugin {
  const PROTECTED = ['cases', 'assets', 'fonts'];
  return {
    name: 'bake-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__bake', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
        if (!sameOrigin(req)) { res.statusCode = 403; res.end('cross-origin'); return; }
        const url = new URL(req.url ?? '/', 'http://x');
        const clean = (s: string) => s.split(/[\\/]/).map((x) => x.replace(/[^\w.-]/g, '_')).filter((x) => x && x !== '.' && x !== '..');
        const dir = clean(url.searchParams.get('dir') ?? '');
        // Windows / macOS 的文件系统不分大小写，比较前统一小写并去掉结尾的点和空格
        if (!dir.length || PROTECTED.includes(dir[0].toLowerCase().replace(/[. ]+$/, ''))) { res.statusCode = 400; res.end('bad dir'); return; }
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { name: string; dataUrl?: string; text?: string };
            const name = clean(body.name ?? '');
            if (!name.length || !BAKE_EXT.test(name[name.length - 1])) { res.statusCode = 400; res.end('bad name'); return; }
            const root = join(server.config.root, 'public');
            const file = join(root, ...dir, ...name);
            if (relative(root, file).startsWith('..')) { res.statusCode = 400; res.end('bad path'); return; }
            mkdirSync(dirname(file), { recursive: true });
            if (typeof body.text === 'string') writeFileSync(file, body.text, 'utf8');
            else if (body.dataUrl) writeFileSync(file, Buffer.from(body.dataUrl.split(',')[1] ?? '', 'base64'));
            else { res.statusCode = 400; res.end('no data'); return; }
            res.end(`ok ${relative(server.config.root, file).split(sep).join('/')}`);
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

/**
 * 生产构建复制 public/ 时排除 public/cases（Steam 商店截图约 303 MB，只在本地开发时作学习参考，不分发）。
 * Vite 的 copyPublicDir 不能排除子目录，所以关掉它，构建结束后自己复制。--mode single 本来就不复制 public/。
 * 同时把 LICENSE 和 THIRD_PARTY_NOTICES.md 放进产物：打包进网页的 Riso 色板数据是 MIT 许可，要附带它的许可声明。
 */
function publicWithoutCases(): Plugin {
  const EXCLUDE = ['cases'];
  const NOTICES = ['LICENSE', 'THIRD_PARTY_NOTICES.md'];
  let root = '';
  let outDir = '';
  let publicDir = '';
  let enabled = true;
  return {
    name: 'public-without-cases',
    apply: 'build',
    configResolved(c) {
      root = c.root;
      outDir = resolve(c.root, c.build.outDir);
      publicDir = c.publicDir;
      enabled = c.mode !== 'single' && !!publicDir && existsSync(publicDir);
    },
    closeBundle() {
      if (!enabled) return;
      cpSync(publicDir, outDir, {
        recursive: true,
        filter: (src) => {
          const rel = relative(publicDir, src).split(sep);
          return !(rel.length && EXCLUDE.includes(rel[0]));
        },
      });
      for (const f of NOTICES) if (existsSync(join(root, f))) cpSync(join(root, f), join(outDir, f));
    },
  };
}

/**
 * 本地参考截图（不入库）在不在：开发服务器只在目录存在时才去加载它们，克隆下来的仓库不会出现破图。
 * 生产构建一律 false（这些截图不分发）。类型声明在 src/env.d.ts。
 */
function localRefs(serve: boolean) {
  const root = dirname(fileURLToPath(import.meta.url));
  const has = (p: string) => serve && existsSync(join(root, p));
  return { cases: has('public/cases'), refs: has('qa/refs-cache'), replicas: has('qa/replicas') };
}

// `--mode single` 产出一个可双击打开的 HTML；案例截图只在开发服务器上显示（src/content/cases.ts 的 caseImage）
export default defineConfig(({ mode, command }) => ({
  base: './',
  plugins: [react(), qaSaver(), bakeEndpoint(), publicWithoutCases(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  define: { __GAE_LOCAL_REFS__: JSON.stringify(localRefs(command === 'serve')) },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    copyPublicDir: false,
    chunkSizeWarningLimit: 4000,
    // 打包进网页的依赖的许可原文，随构建产物一起发布
    // 单文件版把依赖内联进 HTML，插件识别不到，生成的清单是空的，所以不生成（README 写了分发时附带 dist/ 的那份）
    license: mode === 'single' ? false : { fileName: 'third-party-licenses.md' },
  },
  server: { port: 5188 },
}));
