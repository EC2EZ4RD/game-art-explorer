import { useStore } from '../state/store';
import { DirectionBoard, QuickFavorite, RandomPanel, SweepDialog } from './Explore';

/* 探索工具的弹出层。☆（panel = 'favorite'）= 一下就收藏 + 「加备注」小卡（审查修复 24，§2 F1.4） */
export function ExplorePanels() {
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);
  const close = () => setPanel(null);
  return (
    <>
      <SweepDialog />
      {panel === 'random' && <RandomPanel onClose={close} />}
      {panel === 'favorite' && <QuickFavorite onClose={close} />}
      {panel === 'board' && <DirectionBoard onClose={close} />}
    </>
  );
}
