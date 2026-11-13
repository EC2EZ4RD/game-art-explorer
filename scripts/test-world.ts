/*
 * 世界 UI（M6）的单元测试：镜头畸变反函数（投影补偿）、兴趣点推导。
 * 运行：npm test
 */
import { derivePois, lensForward, lensInverse, mapUV } from '../src/hud/world';
import type { SceneDesc } from '../src/engine/scene/types';

let fails = 0, n = 0;
const ok = (c: boolean, msg: string) => { n++; if (!c) { fails++; console.log(`  ✗ ${msg}`); } };

console.log('== 镜头畸变：反函数再正向，回到原处');
let worst = 0;
for (const a of [0.25, 0.5, 1]) {
  for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
    const cx = i / 10 * 0.98, cy = j / 10 * 0.98;
    const [ox, oy] = lensInverse(cx, cy, a);
    const [bx, by] = lensForward(ox, oy, a);
    worst = Math.max(worst, Math.hypot(bx - cx, by - cy));
  }
}
// 1600 宽画布上 1e-4 的 NDC 误差 ≈ 0.08 像素
ok(worst < 1e-4, `往返误差 ${worst.toExponential(2)}（NDC），换算到 1600px 宽 < 0.1px`);
ok(lensInverse(0.3, -0.2, 0)[0] === 0.3, '强度 0 时不变');
const [ex] = lensInverse(0.9, 0, 0.5);
ok(ex > 0.9, '桶形畸变放大中心：物体在输出里离中心更远');

console.log('== 兴趣点');
const desc = {
  items: [
    { prim: 'box', pos: [2, 0.3, 1], scale: [0.8, 0.6, 0.5], role: 'interactive' },
    { prim: 'box', pos: [2.1, 0.7, 1], scale: [0.8, 0.2, 0.5], role: 'interactive' },
    { prim: 'box', pos: [-4, 0.3, -3], scale: [0.5, 0.5, 0.5], role: 'interactive' },
    { prim: 'cylinder', pos: [0, 3, 0], scale: [0.5, 6, 0.5], role: 'trunk', id: 7 },
  ],
  dynamic: [], lights: [{ pos: [1, 2, 1], color: '#ffd', range: 4, intensity: 1 }],
  bounds: { center: [0, 0, 0], radius: 10 }, viewSize: 10,
} as unknown as SceneDesc;
const pois = derivePois(desc);
ok(pois.filter((p) => p.kind === 'interact').length === 2, '没有编号的交互部件按距离聚成 2 团（宝箱的箱体和盖子算一个）');
ok(pois.some((p) => p.kind === 'landmark' && p.pos[1] === 6), '最高的物体是地标（顶部 y = 6）');
ok(pois.some((p) => p.kind === 'light'), '光源是兴趣点');
const chest = pois.find((p) => p.kind === 'interact')!;
ok(Math.abs(chest.pos[1] - 0.8) < 1e-9, '交互点在包围盒顶部');
// 场景写了 actors（收尾 X）：离 actor 不到 0.8 的交互物组跳过，剩下的叫「交互物」而不是「宝箱」
const withActors = { ...desc, actors: [{ kind: 'pickup', label: '包裹', pos: [2, 0, 1], height: 0.8 }] } as unknown as SceneDesc;
const ia = derivePois(withActors).filter((p) => p.kind === 'interact');
ok(ia.length === 1 && Math.abs(ia[0].pos[0] + 4) < 1e-9, '有 actors 时，挨着 actor（包裹）的交互物组不再单列一个交互点');
ok(ia.every((p) => p.label !== '宝箱'), '有 actors 时交互点不写死成「宝箱」');
const [u, v] = mapUV(desc, 10, -10);
ok(u === 1 && v === 0, '小地图坐标：包围盒右上角 = (1, 0)');

console.log(`\n${n - fails}/${n} 通过`);
if (fails) process.exit(1);
