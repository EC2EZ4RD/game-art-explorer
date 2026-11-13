import type { Engine } from './Engine';

/*
 * 当前在画的引擎（整合修复 X#17）：引擎构造时登记、dispose 时清掉（只清自己：热替换时新引擎可能已经先登记了）。
 * 给 HUD 的画面亮度采样（src/hud/sceneLum.ts）读画布尺寸用——原来它 import ui/engineRef（HUD 依赖 UI 层），
 * 现在只依赖引擎这一层；采样函数本身由引擎经 registerSceneSampler 登记。这里只有类型引用 Engine，没有运行时环。
 */

let current: Engine | null = null;

/** 只给 Engine 用：构造时登记自己，dispose 时清掉 */
export function setSceneSource(e: Engine | null) { current = e; }

/** 当前在画的引擎；还没建好或已释放时是 null */
export const sceneSource = (): Engine | null => current;
