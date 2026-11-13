import { useEffect, useState } from 'react';
import { loadReplicas, loadUiKnowledge, peekReplicas, peekUiKnowledge, type KReplica, type UiKnowledge } from '../../content/uiKnowledge';

/*
 * UI 知识库的 React 入口（docs/t1-tool-knowledge.md）：第一次用到时才懒加载（约 5 MB JSON，独立的块），加载完所有用到它的组件一起重画。
 * 加载好以后再挂上的组件同步拿到（peek），不会闪"加载中"。
 * 架构文件：各构建者只调用，不改；要加功能先改 src/content/uiKnowledge.ts 的纯函数。
 */

export function useUiKnowledgeState(): { k: UiKnowledge | null; error: string | null } {
  const [k, setK] = useState<UiKnowledge | null>(peekUiKnowledge);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (k) return;
    let alive = true;
    loadUiKnowledge().then((x) => { if (alive) setK(x); }, (e: unknown) => { if (alive) setError(String(e)); console.error('UI 知识库加载失败', e); });
    return () => { alive = false; };
  }, [k]);
  return { k, error };
}

/** 知识库（原则 + 图谱 + 参考卡 + 索引）；没加载完时 null */
export const useUiKnowledge = (): UiKnowledge | null => useUiKnowledgeState().k;

/** 复刻库（全部复刻，按名字排序）；没加载完时 null */
export function useReplicas(): { list: KReplica[] | null; error: string | null } {
  const [list, setList] = useState<KReplica[] | null>(peekReplicas);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (list) return;
    let alive = true;
    loadReplicas().then((x) => { if (alive) setList(x); }, (e: unknown) => { if (alive) setError(String(e)); console.error('复刻库加载失败', e); });
    return () => { alive = false; };
  }, [list]);
  return { list, error };
}
