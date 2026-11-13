import type { Role } from '../../content/roles';
import { B } from './kits';
import { actor, brute, crawler, npcFigure } from './kits2d';
import type { ActorKind, SceneDesc } from './types';

/*
 * 现有 3D 场景的角色（RC8，docs/workbench-redesign.md §8，F 轨道）：给战斗 / 城镇类场景补上敌人、NPC、Boss，
 * 让 HUD 的头顶血条、伤害数字、名牌挂在「真的」敌人和 NPC 身上（以前没有敌人时目标退到最近的灯和地标）。
 * 位置写成相对玩家起点的偏移；落点不能走（墙里、水里、坑里）时在附近一圈圈找能站的地方。
 * 场景构建器自己写了 actors 的（2D 场景）不动；沙盒岛（首屏）、对象测试台、书房、赛道、桌面、超现实、策略地图不加。
 */

type Fig = 'npc' | 'crawler' | 'brute' | 'pad';
interface Spec { kind: ActorKind; label: string; dx: number; dz: number; fig: Fig; role?: Role; s?: number; ry?: number }

const SCENE_ACTORS: Record<string, Spec[]> = {
  forest: [{ kind: 'npc', label: '护林人', dx: -2.5, dz: 1.5, fig: 'npc' }, { kind: 'enemy', label: '野猪', dx: 3.5, dz: -2.5, fig: 'crawler' }],
  cave: [{ kind: 'enemy', label: '洞穴甲虫', dx: 3, dz: 1.5, fig: 'crawler' }, { kind: 'enemy', label: '洞穴甲虫', dx: -3.2, dz: -2.5, fig: 'crawler', s: 0.9 }, { kind: 'npc', label: '矿工', dx: -2, dz: 2.2, fig: 'npc', role: 'cloth', s: 1 }],
  // 审查修复 9：RPG / 节奏 / 塔防这些场景的「目标」原来没有敌人可挂（退到了灯上）；战斗类的敌人放在 6–10 米外，伤害数字不压在玩家身上
  courtyard: [{ kind: 'npc', label: '管家', dx: 2.2, dz: -1.8, fig: 'npc' }, { kind: 'enemy', label: '山贼', dx: -6.5, dz: -4, fig: 'npc', role: 'ink' }, { kind: 'enemy', label: '山贼', dx: -8, dz: -1.5, fig: 'npc', role: 'ink' }],
  street: [{ kind: 'npc', label: '摊主', dx: 2.6, dz: -2.2, fig: 'npc' }, { kind: 'enemy', label: '小偷', dx: -2.4, dz: -4.5, fig: 'npc', role: 'ink' }],
  // 塔防·渔港：一条从远处爬来的螃蟹队（车道）+ 三个建造位
  harbor: [
    { kind: 'npc', label: '渔夫', dx: -2, dz: 1.6, fig: 'npc', role: 'cloth' },
    { kind: 'enemy', label: '海蟹', dx: 6, dz: -3, fig: 'crawler' }, { kind: 'enemy', label: '海蟹', dx: 8, dz: -3.6, fig: 'crawler', s: 0.9 },
    { kind: 'enemy', label: '海蟹', dx: 10, dz: -4.2, fig: 'crawler' }, { kind: 'boss', label: '巨钳蟹', dx: 12.5, dz: -5, fig: 'crawler', s: 1.6 },
    { kind: 'objective', label: '建造位', dx: 4, dz: -0.6, fig: 'pad' }, { kind: 'objective', label: '建造位', dx: 7, dz: -0.8, fig: 'pad' }, { kind: 'objective', label: '建造位', dx: 9.5, dz: -6.6, fig: 'pad' },
  ],
  desert: [{ kind: 'enemy', label: '沙蝎', dx: 3, dz: 2.2, fig: 'crawler' }, { kind: 'npc', label: '商人', dx: -2.6, dz: -2, fig: 'npc', role: 'cloth' }],
  scifi: [{ kind: 'enemy', label: '巡逻机', dx: 1.6, dz: -4.5, fig: 'crawler', role: 'metal' }, { kind: 'npc', label: '研究员', dx: -1.2, dz: 2, fig: 'npc', role: 'paper' }],
  snowVillage: [{ kind: 'npc', label: '猎人', dx: 2.2, dz: 2, fig: 'npc' }, { kind: 'enemy', label: '雪狼', dx: -4, dz: -3, fig: 'crawler', role: 'cloth' }],
  mountain: [{ kind: 'npc', label: '向导', dx: -2, dz: 1.2, fig: 'npc' }],
  farm: [{ kind: 'npc', label: '农夫', dx: 2.2, dz: -1.6, fig: 'npc', role: 'cloth' }],
  city: [{ kind: 'npc', label: '行人', dx: 2, dz: 1.2, fig: 'npc' }],
  castle: [{ kind: 'npc', label: '卫兵', dx: 2.2, dz: 2, fig: 'npc', role: 'metal' }, { kind: 'enemy', label: '石像鬼', dx: -3.5, dz: -3, fig: 'crawler', role: 'stone' }],
  dungeon: [{ kind: 'enemy', label: '骷髅', dx: 6.5, dz: 3, fig: 'crawler' }, { kind: 'enemy', label: '骷髅', dx: 8, dz: -1, fig: 'crawler', s: 0.9 }, { kind: 'boss', label: '地牢守卫', dx: 10, dz: 6, fig: 'brute', s: 0.9 }],
  tavern: [{ kind: 'npc', label: '酒保', dx: 2, dz: -2, fig: 'npc', role: 'cloth' }, { kind: 'enemy', label: '闹事的酒客', dx: -6, dz: -3, fig: 'npc', role: 'ink' }],
  factory: [{ kind: 'npc', label: '工人', dx: 2, dz: 1.2, fig: 'npc', role: 'interactive' }],
  ruins: [{ kind: 'enemy', label: '变异犬', dx: 3.2, dz: -2, fig: 'crawler' }, { kind: 'enemy', label: '变异犬', dx: -3, dz: -3.5, fig: 'crawler', s: 0.9 }, { kind: 'npc', label: '幸存者', dx: -2, dz: 1.6, fig: 'npc', role: 'cloth' }],
  arena: [{ kind: 'boss', label: '竞技场之王', dx: 0, dz: -11, fig: 'brute', s: 1.3 }, { kind: 'enemy', label: '仆从', dx: -5, dz: -7, fig: 'crawler' }, { kind: 'enemy', label: '仆从', dx: 5, dz: -6.5, fig: 'crawler' }],
  underwater: [{ kind: 'enemy', label: '鲨鱼', dx: 4, dz: -3, fig: 'crawler', role: 'cloth', s: 1.2 }],
};

/** 建造位（塔防）：一块方形石台，四角交互色的角标 */
function buildPad(b: B) {
  b.box(0, 0, 0, 1.5, 0.14, 1.5, 'stone', { args: [0.1] });
  for (const [x, z] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) b.box(x, 0.14, z, 0.26, 0.05, 0.26, 'interactive', { args: [0], noOutline: true });
}

/** 构建器之后、建网格之前补上这个场景的角色（构建器已经写了 actors 的场景不动） */
export function withSceneActors(id: string, desc: SceneDesc): SceneDesc {
  const specs = SCENE_ACTORS[id];
  if (!specs || desc.actors?.length) return desc;
  const [sx, , sz] = desc.playerStart ?? [desc.bounds.center[0], 0, desc.bounds.center[2]];
  const t = desc.terrain, g = desc.ground;
  const yAt = (x: number, z: number) => (t ? t.surfaceAt(x, z) : g ? g.heightAt(x, z) : 0);
  const ok = (x: number, z: number) => (t ? t.inside(x, z) && t.surfaceAt(x, z) > t.seaY - 0.2 : g ? g.inside(x, z) : true);
  const taken: [number, number][] = [];
  const spot = (x0: number, z0: number): [number, number] => {
    for (let r = 0; r <= 5; r += 0.5) {
      for (let k = 0; k < Math.max(1, Math.round(r * 6)); k++) {
        const a = (k / Math.max(1, Math.round(r * 6))) * Math.PI * 2, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
        if (ok(x, z) && !taken.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.2) && Math.hypot(x - sx, z - sz) > 1.2) return [x, z];
      }
    }
    return [x0, z0];
  };
  const actors = [...(desc.actors ?? [])];
  specs.forEach((sp, n) => {
    const [x, z] = spot(sx + sp.dx, sz + sp.dz);
    taken.push([x, z]);
    const y = yAt(x, z), id = 950 + n;
    // 面朝玩家起点
    const ry = sp.ry ?? Math.atan2(sx - x, sz - z);
    const b = new B(desc.items, id).at(x, y, z, ry);
    const s = sp.s ?? 1;
    if (sp.fig === 'npc') npcFigure(b, sp.role ?? 'cloth');
    else if (sp.fig === 'brute') brute(b, sp.role ?? 'accent', s);
    else if (sp.fig === 'pad') buildPad(b);
    else crawler(b, sp.role ?? 'accent', s);
    const h = sp.fig === 'npc' ? 1.25 : sp.fig === 'brute' ? 2.4 * s : sp.fig === 'pad' ? 0.3 : 0.8 * s;
    actors.push(actor(sp.kind, sp.label, [x, y, z], h, id));
  });
  return { ...desc, actors };
}

/** 哪些场景补了角色（日志 / 自检用） */
export const SCENES_WITH_ACTORS = Object.keys(SCENE_ACTORS);
