import { useStore } from '../../state/store';
import { Pop } from './Pop';
import { useMode, useShell } from './shell';
import { SLOT } from './slots';

/*
 * 画框下方（轨道 B 的插槽，§3.1 §3.2）：
 *   画面模式 → C 的 StyleDeck（配方卡：3 条看点、像这些游戏、配套 UI、变体、复制提示词），上面可放 D 的 FirstRunStrip；
 *   UI 模式 → D 的 Filmstrip（界面胶片）+ SkinSwatches（皮肤色板）。
 * 原则演示的提示条（DemoBanner）也放在这里，永不压画框。
 * UI 模式只留一行时（窗口矮）：一行里放胶片、皮肤收进行尾的「皮肤▾」（审查修复 22：原来一行时皮肤整行不见，只剩一个 20px 的 ⇣）。
 * 整合修复（IB · X#13）：C / D 上线前的配方卡、界面胶片、皮肤行过渡版删掉了（插槽都已交付，走不到，过渡版里还有绕过 A 的写入）。
 * 横向只让胶片 / 色板条自己滚（整合 U#7：.deck-inner 不横滚，原来整块能横滚 6000px，把「界面」「皮肤」标签滚出去）。
 */
export function DeckSlot({ oneRow }: { oneRow: boolean }) {
  const mode = useMode();
  const Demo = SLOT.DemoBanner;
  const hudDemo = useStore((s) => !!s.hudDemo);
  const setOne = () => useShell.getState().set({ deckOneRow: !oneRow });
  const Film = SLOT.Filmstrip, Skins = SLOT.SkinSwatches, Deck = SLOT.StyleDeck, First = SLOT.FirstRunStrip;
  return (
    <div className={`deck-inner ${oneRow ? 'one-row' : ''}`}>
      <button className="deck-rows" onClick={setOne} title={oneRow ? '画框下方展开成两行（画框会小一点）' : '画框下方只留一行（画框更大）'}>{oneRow ? '⇣两行' : '⇡一行'}</button>
      {hudDemo && Demo && <div className="deck-demo"><Demo /></div>}
      {mode === 'art' ? (
        <>
          {First && <First />}
          {Deck && <Deck oneRow={oneRow} />}
        </>
      ) : oneRow ? (
        <div className="deck-row deck-merged">
          <div className="deck-merged-film">{Film && <Film oneRow />}</div>
          {Skins && (
            <Pop label="皮肤▾" className="btn small" align="right" up portal title="换皮肤">
              {() => <div className="deck-skin-pop"><Skins /></div>}
            </Pop>
          )}
        </div>
      ) : (
        <>
          {Film && <Film oneRow={oneRow} />}
          {Skins && <Skins />}
        </>
      )}
    </div>
  );
}
