import { isUiKey } from '../../dims/registry';
import type { Values } from '../../dims/types';
import { HudSystem } from '../../hud/HudSystem';
import { SCENE_LUM } from '../../hud/sceneLum';
import { skinValueOf } from '../../hud/sys/register';
import { presetsOf } from '../../hud/sys/spec';
import { useStore } from '../../state/store';
import { skinShort } from '../deck/deckText';
import { getEngine } from '../engineRef';

/*
 * 皮肤规格页（docs/workbench-redesign.md §8 RC6，开发页；整合 X#11：⋯ → 开发者模式 → 皮肤规格页）：
 * 38 个皮肤 × 同一套组件（某个品类布局的局内 HUD：生命、资源、技能、小地图、目标、队伍、通知……），各画在灰 / 亮 / 暗三种底上。
 * 与 E 的开发钩子 __gae.hudQa.specSheet（src/dev/hudQa.ts）同一个画法：离屏 HudSystem 直接画 960×540（不经引擎），按 scale 缩进格子；
 * 区别只是不存盘，返回图片给开发者面板显示（生产构建里也能用）。离屏实例会改写 HUD 的模块全局（世界、内容包……），画完让主画框下一帧重画。
 */

export interface SpecPage { url: string; skins: string[] }

const BG: [string, string][] = [['灰底', '#7d7f84'], ['亮底', '#e9e6dc'], ['暗底', '#14161b']];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 按页画规格页（每页 per 个皮肤）；每画完一页回调一次（面板边画边显示）；alive() 变成 false（面板关了、换了布局）就停 */
export async function renderSpecSheet(layout: string, onPage: (p: SpecPage, i: number, n: number) => void, alive: () => boolean = () => true, per = 8, scale = 0.5): Promise<void> {
  const ids = presetsOf('skin').map((p) => p.id);
  const values = useStore.getState().values;
  const base: Values = Object.fromEntries(Object.entries(values).filter(([k]) => !isUiKey(k)));
  const W0 = 960, H0 = 540, cw = Math.round(W0 * scale), ch = Math.round(H0 * scale), lw = 120;
  const pages = Math.ceil(ids.length / per);
  const hud = new HudSystem();
  try {
    for (let page = 0; page < pages && alive(); page++) {
      const list = ids.slice(page * per, (page + 1) * per);
      const cv = document.createElement('canvas');
      cv.width = lw + BG.length * (cw + 8);
      cv.height = 28 + list.length * (ch + 8);
      const g = cv.getContext('2d')!;
      g.fillStyle = '#202227';
      g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#fff';
      g.font = '14px sans-serif';
      BG.forEach(([n], i) => g.fillText(n, lw + i * (cw + 8) + 4, 18));
      list.forEach((id, row) => {
        const y = 28 + row * (ch + 8);
        g.fillStyle = '#fff';
        g.fillText(skinShort(id), 6, y + 18);
        const v = { ...base, 'hud.style': skinValueOf(id), 'uip.layout': layout, 'uip.screen': 'auto', 'cnt.pack': 'snowline' } as Values;
        // 离屏合成不动主画面的亮度采样（E 的 SCENE_LUM.muted，与皮肤色板同一个做法，收尾 6）
        SCENE_LUM.muted++;
        let f: ReturnType<HudSystem['update']> = null;
        try { f = hud.update(v, W0, H0, W0, H0, 0, 0, [], null, null); } finally { SCENE_LUM.muted--; }
        const img = f?.texture.image as HTMLCanvasElement | undefined;
        BG.forEach(([, c], i) => {
          const x = lw + i * (cw + 8);
          g.fillStyle = c;
          g.fillRect(x, y, cw, ch);
          if (img) g.drawImage(img, 0, 0, img.width, img.height, x, y, cw, ch);
        });
      });
      onPage({ url: cv.toDataURL('image/png'), skins: list.map(skinShort) }, page, pages);
      // 让主画框喘口气（离屏实例改过的全局，主画框下一帧重画时会放回去）
      getEngine()?.hud.invalidate();
      await wait(30);
    }
  } finally {
    hud.dispose();
    getEngine()?.hud.invalidate();
  }
}

/** 规格页可选的品类布局（局内 HUD 组件最全的几种排前面） */
export function specLayouts(): { id: string; label: string }[] {
  const all = presetsOf('layout').map((p) => ({ id: p.id, label: p.label.replace(/（.*?）/g, '') }));
  const first = ['layout.rpg', 'layout.showcase', 'layout.action', 'layout.shooter', 'layout.soulslike', 'layout.survival'];
  return [...first.map((id) => all.find((x) => x.id === id)).filter((x): x is { id: string; label: string } => !!x), ...all.filter((x) => !first.includes(x.id))];
}
