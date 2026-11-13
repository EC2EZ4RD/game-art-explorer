// 按顺序跑完整个案例数据流程（每一步也可以单独运行）
// 用法：node scripts/cases/run-all.mjs [--skip=charts,steampeek] [--budget-mb=295]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const STEPS = ['candidates', 'verify', 'screens', 'download', 'charts', 'steampeek', 'assemble'];
const skip = (process.argv.find((a) => a.startsWith('--skip=')) ?? '').replace('--skip=', '').split(',').filter(Boolean);
const passthrough = process.argv.filter((a) => a.startsWith('--budget-mb=') || a.startsWith('--concurrency=') || a.startsWith('--phases='));

for (const step of STEPS) {
  if (skip.includes(step)) {
    console.log(`\n=== skip ${step} ===`);
    continue;
  }
  console.log(`\n=== ${step} ===`);
  const args = [join(ROOT, 'scripts', 'cases', `${step}.mjs`), ...(step === 'download' ? passthrough : [])];
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) {
    console.error(`step ${step} failed with code ${r.status}`);
    process.exit(r.status ?? 1);
  }
}
