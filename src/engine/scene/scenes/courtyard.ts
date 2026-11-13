import { num } from '../../../dims/registry';
import { archBridge, B, bamboo, cnGate, cnHall, cnLantern, cnWall, moonGate, pavilion, stoneLanternPost, taihuRock } from '../kits';
import { registerSceneBuilder } from '../sceneRegistry';
import { characterAt, heightTextureFrom } from '../sceneUtil';
import type { Item, SceneDesc } from '../types';

/*
 * 中式庭院：二进院落 + 侧园。
 *   前院：门楼、影壁位置、两侧厢房（悬山顶）
 *   正房：歇山顶殿堂，台基、柱网、隔扇、额枋（细节高时有斗拱）
 *   侧园：月洞门进入，水池、拱桥、六角亭（攒尖顶）、竹丛、太湖石、石灯
 * 形制是程序化近似，用于比较风格；考据需对照 docs/survey/04 的建筑调研。
 */
registerSceneBuilder('courtyard', (ctx) => {
  const v = ctx.values;
  const rng = ctx.rng;
  const detail = num(v, 'shape.detail');
  const items: Item[] = [];
  const b = new B(items, 10);
  const W = 30, D = 26, half = 16;
  // 池塘（侧园内）：椭圆
  const pond = { x: 8.6, z: 2, rx: 3.6, rz: 4.6 };
  const inPond = (x: number, z: number) => ((x - pond.x) / pond.rx) ** 2 + ((z - pond.z) / pond.rz) ** 2 < 1;
  // 地面：2 米方砖（主院铺地，侧园是草地与卵石）
  const T = 2;
  for (let z = -D / 2; z < D / 2; z += T) {
    for (let x = -W / 2; x < W / 2; x += T) {
      const cx = x + T / 2, cz = z + T / 2;
      if (inPond(cx, cz)) continue;
      const garden = cx > 4;
      items.push({ prim: 'box', args: [0.1], pos: [cx, -0.1, cz], scale: [T - 0.04, 0.2, T - 0.04], role: garden ? 'grass' : 'path', id: 3, noOutline: true });
    }
  }
  // 池底与池岸
  items.push({ prim: 'cylinder', pos: [pond.x, -0.9, pond.z], scale: [pond.rx * 2 + 1, 0.2, pond.rz * 2 + 1], role: 'sand', id: 4, noOutline: true });
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const x = pond.x + Math.cos(a) * (pond.rx + 0.2), z = pond.z + Math.sin(a) * (pond.rz + 0.2);
    items.push({ prim: 'poly', args: [k % 2], pos: [x, 0.05, z], rot: [rng(), rng() * 6, rng()], scale: [0.9, 0.5, 0.8], role: 'stone', id: 4 });
  }
  // 院墙一圈（前墙留门）
  const wall = b.withId(30);
  cnWall(wall.at(0, 0, -D / 2), W);
  cnWall(wall.at(-W / 2, 0, 0, Math.PI / 2), D);
  cnWall(wall.at(W / 2, 0, 0, Math.PI / 2), D);
  cnWall(wall.at(-W / 4 - 2, 0, D / 2), W / 2 - 4);
  cnWall(wall.at(W / 4 + 2, 0, D / 2), W / 2 - 4);
  cnGate(b.withId(31).at(0, 0, D / 2), 4.2, 3.2);
  // 分隔主院与侧园的墙，中间是月洞门
  moonGate(b.withId(32).at(4, 0, -1, Math.PI / 2), D - 4, 1.2, 2.8);
  // 正房（歇山）
  cnHall(b.withId(40).at(-4, 0, -D / 2 + 4.2), 10, 4.6, 3.4, 3, detail, 0.22);
  // 厢房（悬山）
  cnHall(b.withId(41).at(-11.2, 0, 1.5, Math.PI / 2), 6.5, 3.6, 2.8, 1, detail * 0.6, 0.05);
  cnHall(b.withId(42).at(2.2, 0, 4.5, -Math.PI / 2), 5.5, 3.2, 2.7, 1, detail * 0.6, 0.05);
  // 侧园：亭、桥、竹、石
  pavilion(b.withId(50).at(11.5, 0, -7.5), 1.5, 6);
  archBridge(b.withId(51).at(pond.x, 0, pond.z + 0.5, Math.PI / 2 + 0.2), pond.rz * 1.5, 1.4, 0.9);
  bamboo(b.withId(52).at(12.4, 0, 8.5), 9, rng, 1.6);
  bamboo(b.withId(53).at(-13, 0, -9.5), 6, rng, 1.0);
  taihuRock(b.withId(54).at(6.2, 0, -6.5), 1.6, rng);
  taihuRock(b.withId(55).at(13.2, 0, 2.6), 1.2, rng);
  // 主院：石灯、灯笼、盆栽
  const lights: SceneDesc['lights'] = [];
  for (const [x, z] of [[-7.5, 4], [-0.5, 4]] as const) {
    stoneLanternPost(b.withId(60), x, z);
    lights.push({ pos: [x, 1.05, z], color: '#FFB347', range: 5, intensity: 1.3, night: true });
  }
  for (const [x, z] of [[-6.6, -D / 2 + 6.9], [-1.4, -D / 2 + 6.9]] as const) {
    cnLantern(b.withId(61), x, 2.9, z);
    lights.push({ pos: [x, 3.2, z], color: '#FF7A45', range: 5, intensity: 1.4, night: true });
  }
  lights.push({ pos: [11.5, 2.6, -7.5], color: '#FFB347', range: 6, intensity: 1.1, night: true });
  for (const [x, z] of [[-10, 8.5], [-2, 9.5]] as const) {
    b.withId(62).cyl(x, 0, z, 0.5, 0.7, 'stone', 0.85).ball(x, 1.15, z, 0.65, 0.6, 0.65, 'foliage', { sway: 0.3 });
  }
  if (detail > 0.4) items.push({ prim: 'box', args: [0.3], pos: [0, 1.4, D / 2 - 2.6], scale: [3.4, 2.8, 0.4], role: 'structure', id: 63 }); // 影壁
  const heightTexture = heightTextureFrom(half, (x, z) => (inPond(x, z) ? -0.8 : 0.05));
  return {
    items,
    dynamic: [characterAt(v, -3, 0, 6)],
    lights,
    water: { level: -0.15, shape: 'square', size: pond.rz * 2 + 1, center: [pond.x, pond.z], heightTexture, heightHalf: half },
    ground: { heightAt: () => 0, inside: (x, z) => Math.abs(x) < W / 2 - 0.6 && Math.abs(z) < D / 2 - 0.6 && !inPond(x, z) },
    bounds: { center: [0, 1.5, 0], radius: 19 },
    viewSize: 26,
    playerStart: [-3, 0, 6],
  };
});
