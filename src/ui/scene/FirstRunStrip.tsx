import { useEffect, useState } from 'react';
import { gameScene, sceneEnv } from '../../content/gameScenes';
import { hasSceneBuilder } from '../../engine/scene/sceneRegistry';
import { freshOrigin, sameOrigin } from '../../state/layers';
import { useStore } from '../../state/store';
import { setMode, useShell } from '../stage/shell';
import { pickGameScene } from './sceneActions';
import { firstRunDone, setFirstRunDone, setMyView } from './sceneData';
import { ScreenIcon } from './ScreenIcon';
import './scene.css';

/*
 * 首屏「你的游戏更像哪种？」（轨道 D，docs/workbench-redesign.md §0.3 首屏、§2 F0）：画面模式画框下方最上面一行，7 个视角卡片（2026-10-23 Z2 加「等距」）。
 * 可以跳过、不挡操作；点了任何东西（包括左边的配方卡）就消失，以后不再出现。
 * 点一个视角 = 换到这一类的代表场景（画风保持）并进入 UI 模式（画框下方换成界面胶片）——§11.1 D 的验收「首次打开到我这类游戏的 Boss 界面 ≤2 次点击」：
 *   点视角（1）→ 胶片上点 Boss（2）。横版 / 等距 / 第三人称 / 第一人称的代表场景都有 Boss 界面；俯视（农场）、棋盘、卡牌·VN 的代表场景这一类本来没有 Boss，
 *   胶片上是它们自己的界面（scripts/test-scenes.ts 逐个核对）。场景图库以后把这一组排最前。
 * 2D 视角（横版 / 俯视 / 等距 / 棋盘 / 平面）要等 2D 环境真正上线：§11.2 M3「不用替身」——任何一个 2D 环境还没注册，整条都不出现。
 */

const VIEWS: { label: string; scene: string; needs2d: boolean; icon: string }[] = [
  { label: '横版', scene: 'gs.platformer', needs2d: true, icon: 'tpl.levelPath' },
  { label: '俯视', scene: 'gs.farming', needs2d: true, icon: 'tpl.worldmap' },
  // 等距 2.5D（2026-10-23，轨道 Z2）：代表场景是哈迪斯式的等距地牢（有 Boss 界面：点视角 + 点 Boss = 2 步）
  { label: '等距', scene: 'gs.isoDungeon', needs2d: true, icon: 'iso' },
  { label: '棋盘', scene: 'gs.tactics', needs2d: true, icon: 'tpl.formation' },
  { label: '第三人称', scene: 'gs.soulslike', needs2d: false, icon: 'auto' },
  { label: '第一人称', scene: 'gs.shooter', needs2d: false, icon: 'aim' },
  { label: '卡牌·VN', scene: 'gs.visualNovel', needs2d: true, icon: 'tpl.npc' },
];

/**
 * 强制显示（看样子、测首屏用）：localStorage gae.firstRun.force = 1，只在开发服务器或开发者模式下认。
 * 整合修复 U#24：原来只绕过「2D 环境都上线了」这一条，回访用户（看过 / 有撤销记录 / 从上次恢复 / 来源不是全新的）照样看不到；现在全部绕过
 */
function forced(): boolean {
  let force = false;
  try { force = localStorage.getItem('gae.firstRun.force') === '1'; } catch { /* 读不了 */ }
  return force && (import.meta.env.DEV || useShell.getState().dev);
}

/** 2D 环境都上线了没有 */
function ready(): boolean {
  return VIEWS.every((v) => { const sc = gameScene(v.scene); return !!sc && (!v.needs2d || sceneEnv(sc, hasSceneBuilder).is2d); });
}

export function FirstRunStrip() {
  // 只在真正的首屏出现：这个标签页还没有任何改动、也不是从上次的实验恢复来的（新标签页从 gae.last.v2 恢复时撤销记录是空的，
  // 所以还要看 restored 和来源是不是全新的；审查修复 10）
  const [show, setShow] = useState(() => {
    if (forced()) return true;
    const s = useStore.getState();
    return !firstRunDone() && !s.history.length && !s.restored && sameOrigin(s.origin, freshOrigin()) && ready();
  });
  // 用户做了任何改动（点配方、调参数……）：消失，以后不再出现
  useEffect(() => {
    if (!show) return;
    return useStore.subscribe((s, p) => { if (s.history.length !== p.history.length) { setFirstRunDone(); setShow(false); } });
  }, [show]);
  if (!show) return null;
  const done = () => { setFirstRunDone(); setShow(false); };
  return (
    <div className="fr" role="group" aria-label="你的游戏更像哪种">
      <span className="fr-q">你的游戏更像哪种？</span>
      {VIEWS.map((v) => {
        const sc = gameScene(v.scene)!;
        return (
          <button key={v.label} className="fr-card" title={`${sc.name}（进入 UI 模式）`} onClick={() => { setMyView(sc.group); done(); void pickGameScene(sc).then(() => setMode('ui')); }}>
            <ScreenIcon screen={{ id: v.icon, kind: 'template', values: { 'uip.screen': v.icon } }} />
            {v.label}
          </button>
        );
      })}
      <button className="fr-x" onClick={done} title="跳过">×</button>
    </div>
  );
}
