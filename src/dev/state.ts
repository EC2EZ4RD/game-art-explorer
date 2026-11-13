import * as A from '../state/actions';
import * as L from '../state/layers';
import { useStore } from '../state/store';
import { devHooks } from './hooks';

/*
 * 轨道 A 的开发钩子：window.__gae.state（docs/workbench-redesign.md §4；约定见 README.md）。
 *   __gae.state.counts()            三个标签的改动数
 *   __gae.state.tabs()              三个标签上显示的数（场景另算「界面离开了第一个」1 项）
 *   __gae.state.modified('ui')      某一层改过的键（不给 = 全部）
 *   __gae.state.origin()            来源
 *   __gae.state.base('shading.steps')  基线值
 *   __gae.state.actions / layers    套用、重置动作与纯函数（在控制台里直接试）
 *   __gae.state.check()             在当前状态上把每个配方 / 皮肤 / 风格词 / 成套算一遍，看套完改动是不是 0
 *                                    （只跑纯函数 plan*，不提交：页面、撤销记录、存档都不动，审查修复 14）
 */

if (import.meta.env.DEV) {
  const st = () => useStore.getState();
  devHooks({
    state: {
      counts: () => L.countLayers(st().values, st().origin),
      tabs: () => L.tabCounts(st().values, st().origin),
      modified: (layer?: L.TabLayer) => L.modifiedKeysOf(st().values, st().origin).filter((k) => !layer || L.tabOf(L.layerOfKey(k, st().origin)) === layer),
      origin: () => st().origin,
      base: (k: string) => L.baseValueOf(k, st().origin),
      actions: A,
      layers: L,
      check: async () => {
        const { RECIPES } = await import('../content/recipes');
        const { presetsOf } = await import('../hud/sys/spec');
        const { skinValueOf } = await import('../hud/sys/register');
        const { applyPreset } = await import('../hud/sys/apply');
        const { isUiKey } = await import('../dims/registry');
        const { values, origin } = st();
        const bad: string[] = [];
        for (const r of RECIPES) {
          const p = L.planLook(values, origin, { ref: r.id, name: r.name, values: r.values });
          if (L.countLayers(p.values, p.origin).art) bad.push(`配方 ${r.id}`);
        }
        for (const p of presetsOf('skin')) {
          const q = L.planSkin(values, origin, { id: p.id, value: skinValueOf(p.id), name: p.label });
          if (L.modifiedKeysOf(q.values, q.origin).some((k) => L.layerOfKey(k, q.origin) === 'uiStyle' && L.skinOwns(k))) bad.push(`皮肤 ${p.id}`);
        }
        for (const kind of ['recipe', 'example'] as const) {
          for (const p of presetsOf(kind)) {
            const patch = applyPreset(p.id, values, { isUi: isUiKey, scene: null });
            if (!patch) continue;
            const q = L.planBundle(values, origin, { id: p.id, kind, name: p.label, set: patch.set });
            if (L.countLayers(q.values, q.origin).ui) bad.push(`${kind === 'recipe' ? '成套' : '案例屏'} ${p.id}`);
          }
        }
        return bad.length ? bad : 'ok';
      },
    },
  });
}

// 自接受热更新：改这个文件时只重跑它，不整页刷新
if (import.meta.hot) import.meta.hot.accept();
