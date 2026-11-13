# src/dev/ · 开发钩子

T0（`docs/workbench-redesign.md` §11.0）建的目录。`src/main.tsx` 里有一行

```ts
import.meta.glob('./dev/*.ts', { eager: true });
```

会把本目录下所有 `.ts` 一次性引入。各轨道把自己的 `window.__gae` 调试 / 截图钩子写在 **`src/dev/<轨道>.ts`**，**不再改 main.tsx**。

| 文件 | 归属 |
|---|---|
| `hooks.ts` | T0（登记函数，别的轨道只调用不改） |
| `state.ts` | A |
| `gallery.ts` | C |
| `scenes.ts` | D |
| `hudQa.ts` | E |
| `scenes2d.ts` | F |
| B 的钩子 | B 自选文件名（如 `stage.ts`） |

## 写法

```ts
// src/dev/<轨道>.ts
import { devHooks } from './hooks';

if (import.meta.env.DEV) {
  devHooks({
    // 推荐：一个轨道一个顶层键，免得撞名，例如 __gae.scenes.list()
    scenes: { list: () => ['…'] },
  });
}

// 自接受热更新：改这个文件时只重跑它，不整页刷新
if (import.meta.hot) import.meta.hot.accept();
```

- 整段代码包在 `if (import.meta.env.DEV)` 里。生产构建会把它删掉。glob 引入本身仍会打进包里，所以文件顶层不要有别的副作用。
- 要换掉 main.tsx 里的老钩子（`snap`、`grid`、`replicaShots` 等），在自己的文件里用**同名键**登记就行：老钩子用 `devHooksBase` 登记，只补还没有的键，所以轨道文件优先。
- 引擎实例用 `getEngine()`（`src/ui/engineRef.ts`），不要从组件文件里取。
- 本目录只放 `.ts`。别放 `.tsx` 组件，否则 glob 不会引入，Fast Refresh 也会受影响。
