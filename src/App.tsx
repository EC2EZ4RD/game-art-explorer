import { Dialogs } from './ui/Dialogs';
import { ExplainCard } from './ui/ExplainCard';
import { ExplorePanels } from './ui/ExplorePanels';
import { LeftRail } from './ui/LeftRail';
import { RightPanel } from './ui/RightPanel';
import { TopBar } from './ui/TopBar';
import { CommandPalette } from './ui/stage/CommandPalette';
import { DevPanel } from './ui/stage/DevPanel';
import { LearnLayer } from './ui/stage/LearnLayer';
import { useMode, useRail, useShell } from './ui/stage/shell';
import { SLOT } from './ui/stage/slots';
import { Stage } from './ui/stage/Stage';
import './ui/stage/stage.css';

/*
 * 外壳（轨道 B，docs/workbench-redesign.md §1 §3）：顶栏 44 + 主区三栏（左 288 / 64 / 0 · 中舞台 · 右 320 / 296）。
 * 舞台（画框里的 WebGL）在树里的位置永远不变：切模式、专注、收起左栏都只改 CSS，不重新挂引擎。
 */
export function App() {
  const mode = useMode();
  const focus = useShell((s) => s.focus);
  const rail = useRail();
  const dev = useShell((s) => s.dev);
  const CaseDialog = SLOT.CaseDialog;
  return (
    <div className={`app mode-${mode} ${focus ? 'is-focus' : ''} ${rail ? 'left-rail' : ''} ${dev ? 'is-dev' : ''}`}>
      <TopBar />
      <div className="main">
        <LeftRail />
        <Stage />
        <RightPanel />
        <LearnLayer />
      </div>
      <Dialogs />
      {CaseDialog && <CaseDialog />}
      <ExplorePanels />
      <ExplainCard />
      <CommandPalette />
      <DevPanel />
    </div>
  );
}
