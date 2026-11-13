import type { GameScene } from '../../content/gameScenes';
import type { KReplica, KReplicaScreen } from '../../content/uiKnowledge';
import type { Values } from '../../dims/types';
import type * as L from '../../state/layers';
import { replicaInput as replicaPlanInput } from '../../state/replica';

/*
 * 名作（复刻）套用的输入（轨道 D 的入口，整合修复 X#1 后是 A 的 state/replica.ts 的一层薄壳）：学习库复刻面板与场景图库共用 A 的那一个合成，
 * 镜头归场景（rigLock）、2D 环境并进锁定的镜头、名字用卡片上的中文名、各屏自己的 UI 记在界面层（重置场景能回到第一屏）。
 *   mode = 'full'：整套套用（尊重「保留我的改动」：keepMine 时只清场景负责的键）；
 *   mode = 'screen'：已在这款名作里，只换这一屏（皮肤、风格词、UI 样式 / 位置改动、画面、环境都不动）。
 * 纯函数，node 测试能直接跑（sceneActions 引了 HudSystem，node 里引不了）。
 */

/** 名作里一屏的中文标签（胶片卡上的）；没有时用屏 key */
export const replicaScreenLabel = (sc: GameScene, key: string) => sc.screens.find((x) => x.id === key)?.label ?? key;

export function replicaInput(values: Values, origin: L.Origin, sc: GameScene, rep: KReplica, screen: KReplicaScreen, mode: 'full' | 'screen', keepMine = false): L.CompositeInput {
  return replicaPlanInput(values, origin, rep, screen, { mode, keepMine, names: { scene: sc.name, screen: replicaScreenLabel(sc, screen.key) } });
}
