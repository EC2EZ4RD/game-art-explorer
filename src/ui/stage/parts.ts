import type { Values } from '../../dims/types';
import { baseValues, isModifiedKey, type Origin } from '../../state/layers';

/*
 * 模板 / 菜单屏的部件（轨道 B2，docs/workbench-redesign.md §6「覆盖范围 · 第二阶段」）：画框上的名签、「还原这一屏」用的小工具。
 * 部件命中框由 HUD 给（src/hud/HudSystem.ts 的 PartHit：kind = 'part'、element = 部件 id、part = 部件种类、target = 覆盖目标 tpl.<id>、label = 中文名），
 * 这里只认名字和数改动，不碰排版。
 */

/** 部件种类的中文短名（register.ts 的 COMPONENTS 里模板常见的那些；没列的用部件 id） */
const PART_LABEL: Record<string, string> = {
  panel: '面板', modal: '弹窗', button: '按钮', key: '按键', tab: '页签', nav2: '二级导航', bar: '条', hudBar: '贴边条', slot: '格子',
  tooltip: '提示框', titleBar: '标题栏', title: '标题', listRow: '列表行', nameplate: '名牌', dialog: '对话框', card: '卡片', badge: '徽章',
  plate: '牌子', node: '节点', input: '输入框', name: '名字', progress: '进度', rank: '等级', stateTag: '状态签', groupHeader: '分组标题',
  slotGroup: '格子组', body: '正文', frame: '边框', icon: '图标', avatar: '头像', earTab: '耳签', panelArt: '面板插画',
};

/** 画框上部件的名签：给了中文名用它，否则按部件种类（列表行 #3 这类带序号的保留序号） */
export function partName(p: { id: string; part?: string; label?: string }): string {
  if (p.label) return p.label;
  const kind = p.part ?? p.id.replace(/[#|].*$/, '');
  const n = /#(\d+)/.exec(p.id)?.[1];
  return (PART_LABEL[kind] ?? kind) + (n ? ` ${n}` : '');
}

/** 覆盖目标的后缀（tpl.inventory → '@tpl.inventory'） */
const suffixOf = (tpl: string) => `@${tpl.startsWith('tpl.') ? tpl : `tpl.${tpl}`}`;

/** 这一屏的部件覆盖（cmp.*@tpl.<id> 这类）里改过的有几个：与 A 的 resetScreenParts 同一个口径（按来源基线比） */
export function screenPartChanges(values: Values, origin: Origin, tpl: string): number {
  const suffix = suffixOf(tpl);
  return Object.keys({ ...values, ...baseValues(origin) }).filter((k) => k.endsWith(suffix) && isModifiedKey(k, values, origin)).length;
}
