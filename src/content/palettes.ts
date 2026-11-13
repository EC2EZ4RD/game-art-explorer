import { adjust, mixHex, nearestHex } from '../core/color';
import { ROLES, type Role } from './roles';
import SURVEY from './palettes.survey.json';

/*
 * 色板库：每个色板给出"角色 → 颜色"。只给关键色的色板，其余角色由规则推导。
 * 复古主机色板只给色票（swatches），角色颜色由基准色板投影到最近色票（OKLab）。
 * 标注"近似取色"的色板是按印象取色，不是对照标准色卡，后续可替换为权威色值。
 */

export interface Palette {
  id: string;
  name: string;
  group: string;
  desc: string;
  roles: Record<Role, string>;
  /** 用于"严格限色"量化的色票 */
  swatches: string[];
  source?: string;
  /** 默认关联的配色说明，用于提示词 */
  prompt: string;
}

type Keys = Partial<Record<Role, string>>;

export const BASE: Record<Role, string> = {
  sand: '#F9E04B', grass: '#7BD148', highland: '#2FB8A6', snow: '#FFFFFF', rock: '#8E9AAF',
  soil: '#9C6B3F', path: '#E8C88A', water: '#3CC7F0', waterDeep: '#1F7FD1', foliage: '#3FAE4A',
  foliage2: '#1E8A6E', trunk: '#8A5A33', flower: '#FF5C8A', structure: '#F4EBDD', roof: '#E2483D',
  trim: '#6B4A2E', wood: '#B07A45', stone: '#B9B4A8', metal: '#8D99AE', cloth: '#4D7CFE',
  character: '#FF7A3D', characterAccent: '#2D3142', skin: '#FFD3A8', interactive: '#FFC233',
  accent: '#FF3D6E', cloud: '#FFFFFF', emissive: '#FFE08A', skyTop: '#4FB4FF', skyHorizon: '#CDEFFF',
  paper: '#F7F1E3', ink: '#1E1B2E', glass: '#BFE8FF',
};

/** 由关键色推导缺失角色，保证每个色板都完整 */
function derive(k: Keys): Record<Role, string> {
  const r: Partial<Record<Role, string>> = { ...k };
  const g = (role: Role) => r[role] ?? BASE[role];
  r.grass ??= BASE.grass;
  r.foliage ??= adjust(g('grass'), -0.12, 1.05);
  r.foliage2 ??= adjust(g('highland') ?? g('foliage'), -0.1, 1, -8);
  r.sand ??= mixHex(g('grass'), '#F3E3A0', 0.75);
  r.highland ??= adjust(g('grass'), -0.08, 0.9, 25);
  r.rock ??= mixHex(g('highland'), '#8E9AAF', 0.7);
  r.soil ??= mixHex(g('rock'), '#8A5A33', 0.6);
  r.path ??= mixHex(g('sand'), g('soil'), 0.35);
  r.trunk ??= adjust(g('soil'), -0.08);
  r.wood ??= adjust(g('trunk'), 0.08);
  r.trim ??= adjust(g('wood'), -0.15);
  r.stone ??= adjust(g('rock'), 0.1, 0.8);
  r.metal ??= mixHex(g('rock'), '#9AA6B8', 0.5);
  r.waterDeep ??= adjust(g('water'), -0.18, 1.1);
  r.skyHorizon ??= mixHex(g('skyTop'), '#FFFFFF', 0.65);
  r.cloud ??= mixHex(g('skyHorizon'), '#FFFFFF', 0.7);
  r.paper ??= mixHex(g('skyHorizon'), '#F7F1E3', 0.8);
  r.flower ??= g('accent');
  r.interactive ??= adjust(g('accent'), 0.1, 1, 30);
  r.characterAccent ??= g('ink');
  r.emissive ??= mixHex(g('interactive'), '#FFFFFF', 0.4);
  r.glass ??= mixHex(g('water'), '#FFFFFF', 0.5);
  const out = {} as Record<Role, string>;
  for (const [role] of ROLES) out[role] = r[role] ?? BASE[role];
  return out;
}

function uniqueSwatches(roles: Record<Role, string>) {
  return [...new Set(Object.values(roles))];
}

const LIST: Palette[] = [];
const PALETTE_IDS = () => new Set(LIST.map((p) => p.id));

function pal(id: string, name: string, group: string, desc: string, prompt: string, keys: Keys, source?: string) {
  const roles = derive(keys);
  LIST.push({ id, name, group, desc, prompt, roles, swatches: uniqueSwatches(roles), source });
}

/** 只有色票的色板：把基准色板的每个角色投影到最近色票 */
function swatchPal(id: string, name: string, group: string, desc: string, prompt: string, swatches: string[], source?: string, from: Keys = {}) {
  const base = derive(from);
  const roles = {} as Record<Role, string>;
  for (const [role] of ROLES) roles[role] = nearestHex(base[role], swatches);
  LIST.push({ id, name, group, desc, prompt, roles, swatches, source });
}

/* ---------------- 灵感与玩具 ---------------- */
pal('inspiration', '高饱和纯色（灵感提示词）', '玩具与微缩', '沙滩柠檬黄、低地苹果绿、高山松石青、雪顶纯白，水体清透', '高饱和纯色：海滨浅滩柠檬黄、低地苹果绿、高山松石青、雪顶纯白，水体清透半透明', { ...BASE });
pal('macaron', '马卡龙粉彩', '玩具与微缩', '高明度、低饱和的糖果色', '高明度低饱和的马卡龙粉彩，整体轻盈柔和', {
  sand: '#FCE8B2', grass: '#B8E6B0', highland: '#A7D8DE', snow: '#FFFFFF', rock: '#C9C3D9', soil: '#E3B8A0',
  water: '#A8DCF0', foliage: '#95D5A6', trunk: '#C79A86', accent: '#FF9EB5', character: '#FFB38A', roof: '#F49FB6',
  structure: '#FFF6EC', skyTop: '#B9DDF7', ink: '#6A5A7A',
});
pal('toy', '玩具原色', '玩具与微缩', '红黄蓝原色加纯白，塑料玩具感', '原色玩具配色：红黄蓝原色配纯白，颜色块面干净', {
  sand: '#FFD23F', grass: '#3BB273', highland: '#1F8A5B', rock: '#B0BEC5', soil: '#E0A458', water: '#2D9CDB',
  foliage: '#2E9E5B', trunk: '#A0522D', accent: '#E63946', character: '#E63946', roof: '#E63946', structure: '#FFFFFF',
  cloth: '#1D70E3', skyTop: '#5EB6FF', ink: '#14213D',
});
pal('clay', '黏土暖色', '玩具与微缩', '略灰的暖色，像手捏黏土', '略带灰度的暖色黏土配色，颜色不过分鲜艳，保留手作温度', {
  sand: '#E9C98D', grass: '#8DB46B', highland: '#6E9C8A', snow: '#F2EEE6', rock: '#9C928A', soil: '#B07D5A',
  water: '#78B6C4', foliage: '#6F9E57', trunk: '#8C5E3C', accent: '#D96C4E', character: '#E39B5A', roof: '#C8553D',
  structure: '#EADBC8', skyTop: '#9CC7D9', ink: '#3B2F2A',
});

/* ---------------- 自然与季节 ---------------- */
pal('summer', '自然夏日', '自然与季节', '饱和但不刺眼的自然色', '自然夏日配色：草木偏暖绿，天空通透', {
  sand: '#E6D29B', grass: '#6FAE45', highland: '#4E8C5A', rock: '#8C8C85', soil: '#8B6B4A', water: '#4AA3C8',
  foliage: '#4C8F38', trunk: '#6B4A32', accent: '#E8553E', skyTop: '#5A9FE0', ink: '#22261F',
});
pal('autumn', '秋色', '自然与季节', '橙红、赭黄与暗绿', '秋季配色：橙红与赭黄为主，少量暗绿压住画面', {
  sand: '#E8C07D', grass: '#C9A23F', highland: '#9A6B3F', rock: '#8D7F72', soil: '#8A5236', water: '#4F7F8F',
  foliage: '#D9622B', foliage2: '#A63D2A', trunk: '#5A3A28', accent: '#B8322A', skyTop: '#8FB3C9', ink: '#2A1E19',
});
pal('winter', '冬季冷调', '自然与季节', '高明度冷色，阴影偏蓝', '冬季冷调：高明度雪地与蓝色阴影，少量暖色点缀', {
  sand: '#DCE3E8', grass: '#B9C9C2', highland: '#8FA9B5', snow: '#FFFFFF', rock: '#7D8A99', soil: '#7E7468',
  water: '#7FB2CF', foliage: '#3F6B5E', trunk: '#4E4038', accent: '#D9483B', skyTop: '#9EC3E0', ink: '#1E2733',
});
pal('desert', '沙漠暖色', '自然与季节', '沙黄、陶土橙与强烈天蓝', '沙漠暖色：沙黄与陶土橙大面积铺陈，强烈的天空蓝作对比', {
  sand: '#F2C879', grass: '#D9A65A', highland: '#C47A45', snow: '#FFF3DC', rock: '#B5653A', soil: '#9E5B34',
  water: '#2FA7B8', foliage: '#7E9C4A', trunk: '#6E4B30', accent: '#2FA7B8', skyTop: '#3F9BE0', ink: '#3A2416',
});
pal('tropical', '热带', '自然与季节', '青绿海水、浓绿植被、亮黄沙', '热带配色：青绿海水、浓绿植被与亮黄沙滩', {
  sand: '#FFE08A', grass: '#2BB673', highland: '#138A5E', rock: '#7A8C8C', water: '#19D3C5', waterDeep: '#0A7EA4',
  foliage: '#1E9E57', trunk: '#7A5233', accent: '#FF5E5B', skyTop: '#38B6FF', ink: '#10302A',
});
pal('earthy', '大地色', '自然与季节', '低饱和土棕橄榄', '低饱和大地色：土棕、橄榄与灰绿，沉稳朴素', {
  sand: '#C8B48A', grass: '#7E8A4E', highland: '#5E6B4A', rock: '#7B7468', soil: '#7A5C41', water: '#5E7F7F',
  foliage: '#5C6B3A', trunk: '#4F3B2A', accent: '#B5562E', skyTop: '#9AAEB5', ink: '#2B2620',
});
pal('misty', '雾霭灰绿', '自然与季节', '灰调绿、低对比，适合雾天', '低对比的雾霭灰绿，远景融入天色', {
  sand: '#C9C8B5', grass: '#8FA38A', highland: '#6F8A86', rock: '#8C918E', soil: '#857A6A', water: '#8AA3A6',
  foliage: '#62806A', trunk: '#4E4A42', accent: '#C9734F', skyTop: '#B8C4C2', ink: '#2E3532',
});

/* ---------------- 氛围 ---------------- */
pal('dusk', '黄昏', '氛围', '橙粉天空、紫色阴影', '黄昏配色：橙粉天空，阴影偏紫，暖冷对比明显', {
  sand: '#F2B880', grass: '#9C8F5A', highland: '#6E6B8C', rock: '#8C6E7E', water: '#7E78B8', foliage: '#6E7A4A',
  trunk: '#4A3348', accent: '#FF7B54', skyTop: '#7A5CA8', skyHorizon: '#FFB37A', ink: '#2A1B33',
});
pal('night', '月夜', '氛围', '深蓝夜色、暖黄灯火', '月夜配色：大面积深蓝，少量暖黄灯火作焦点', {
  sand: '#5A6B8C', grass: '#2F4A5E', highland: '#263B52', snow: '#B8C8E0', rock: '#3D4A63', soil: '#3A3346',
  water: '#1C3557', foliage: '#1F3A44', trunk: '#2A2433', accent: '#FFC857', emissive: '#FFD27A', skyTop: '#0B1630',
  skyHorizon: '#2A3E6B', structure: '#55607A', ink: '#05070F',
});
pal('neon', '霓虹赛博', '氛围', '洋红、青色与深紫底', '霓虹赛博配色：深紫黑底上的洋红与青色霓虹', {
  sand: '#3A2E5A', grass: '#2A2350', highland: '#1F1B3D', rock: '#2E2A4A', soil: '#231A35', water: '#0F2A4A',
  foliage: '#2D1F55', trunk: '#1A1330', accent: '#FF2E97', emissive: '#22F2FF', interactive: '#22F2FF',
  structure: '#2B2948', roof: '#3D2A66', metal: '#4B4F7A', skyTop: '#0A0618', skyHorizon: '#3B1556', ink: '#05030C',
});
pal('noirRed', '黑白一点红', '氛围', '纯黑白灰，只留一种红', '高反差黑白灰，只保留一种红色作强调', {
  sand: '#D8D8D8', grass: '#A0A0A0', highland: '#6E6E6E', snow: '#FFFFFF', rock: '#555555', soil: '#3C3C3C',
  water: '#8C8C8C', foliage: '#4A4A4A', trunk: '#222222', structure: '#E8E8E8', roof: '#2A2A2A', accent: '#D7263D',
  character: '#D7263D', skyTop: '#BEBEBE', skyHorizon: '#EDEDED', ink: '#000000',
});
pal('gothic', '哥特暗紫', '氛围', '暗紫灰、冷石、烛火橙', '哥特暗色：冷灰石材与暗紫天空，烛火橙作焦点', {
  sand: '#6B6470', grass: '#4A4A55', highland: '#3A3545', rock: '#55505E', soil: '#3B3036', water: '#2C3445',
  foliage: '#2F3A33', trunk: '#241E22', structure: '#6E6A75', roof: '#2E2A38', accent: '#FF8A3D', emissive: '#FFB15E',
  skyTop: '#1E1A2B', skyHorizon: '#4A3E5C', ink: '#0B0910',
});
pal('cozy', '温馨暖光', '氛围', '奶油、木色与橙黄', '温馨暖调：奶油色与木色为主，灯光橙黄', {
  sand: '#F3DDB3', grass: '#A8C27A', highland: '#7FA58A', rock: '#B3A594', soil: '#B98A5E', water: '#8CC5C8',
  foliage: '#86A85C', trunk: '#7A5236', accent: '#E07A5F', structure: '#FFF1DC', roof: '#C8664A', emissive: '#FFC97A',
  skyTop: '#A9CBE3', skyHorizon: '#FBE3C2', ink: '#3A2A20',
});
pal('vaporwave', '蒸汽波', '氛围', '粉紫青渐变', '蒸汽波配色：粉、紫、青的柔和渐变', {
  sand: '#FFB6E1', grass: '#C79BF2', highland: '#8C7CF0', rock: '#9BA3EB', soil: '#E58FB5', water: '#7FF0F0',
  foliage: '#B78CF2', trunk: '#7A4FA0', accent: '#00F0FF', structure: '#FFE3F5', skyTop: '#6E5BE0', skyHorizon: '#FF9ED8',
  ink: '#2A1640',
});
pal('synthwave', '合成波', '氛围', '洋红地平线、深蓝夜空、橙色太阳', '合成波配色：洋红与橙色的落日，深蓝夜空和霓虹网格', {
  sand: '#FF6EC7', grass: '#2B1055', highland: '#3A1C71', rock: '#462A7A', soil: '#2A0E3F', water: '#24104A',
  foliage: '#5B1E8C', trunk: '#1C0A30', accent: '#FFB000', emissive: '#FF2BD6', structure: '#3D1A6E',
  skyTop: '#120A33', skyHorizon: '#FF4F9A', ink: '#05010F',
});
pal('solarpunk', '太阳朋克', '氛围', '明亮植物绿、白色建筑、金色阳光', '太阳朋克：明亮植物绿与白色曲线建筑，金色阳光', {
  sand: '#F4E3B5', grass: '#79C267', highland: '#4FA77A', rock: '#B9C4B0', water: '#5FC9D6', foliage: '#5DB04E',
  trunk: '#7B5A3A', structure: '#FAF7EE', roof: '#E9B949', accent: '#F2A541', skyTop: '#7FC8F8', ink: '#203226',
});
pal('wasteland', '废土', '氛围', '锈橙、尘黄、褪色', '废土配色：锈橙、尘黄与褪色的灰绿，整体干燥', {
  sand: '#D2B07A', grass: '#A89160', highland: '#8C7556', rock: '#7D6A58', soil: '#8A5A3B', water: '#6F7F6A',
  foliage: '#6E7148', trunk: '#4D3A2A', metal: '#8A5C3E', accent: '#C2502E', skyTop: '#C9B08A', skyHorizon: '#E8D3A8',
  ink: '#2A1F17',
});
pal('liminal', '阈限冷光', '氛围', '荧光灯下的米黄与冷白', '阈限空间：荧光灯下的米黄墙与冷白光，均匀而空旷', {
  sand: '#E8E2C8', grass: '#CFC9A8', highland: '#B5B39A', rock: '#BDBAAE', structure: '#EDE6C8', water: '#9FD3D6',
  foliage: '#9CA38A', accent: '#7AB8BF', skyTop: '#DCE3E0', skyHorizon: '#F2F2E8', ink: '#4A4A42',
});
pal('horror', '恐怖压抑', '氛围', '暗绿灰、病态黄', '压抑配色：暗绿灰为主，病态黄与暗红点缀', {
  sand: '#6E6A55', grass: '#4A4F3C', highland: '#3A3F33', rock: '#4C4B44', soil: '#3B342A', water: '#2F3A33',
  foliage: '#33402F', trunk: '#231F1A', accent: '#8C1C13', emissive: '#C9C26B', skyTop: '#2A2E27', skyHorizon: '#5E5F4E',
  ink: '#0A0A08',
});

/* ---------------- 东方传统（近似取色） ---------------- */
pal('qinglv', '青绿山水', '东方传统', '石青、石绿叠在赭石底上，绢色天空', '青绿山水配色：以石青、石绿为主，赭石打底，绢本暖黄天空（近似取色）', {
  sand: '#C9A66B', grass: '#5E9E7E', highland: '#2F6E8E', snow: '#EDE3CC', rock: '#3E7C8C', soil: '#A0703F',
  water: '#7FA9A0', foliage: '#3F8C6E', foliage2: '#2B5E7A', trunk: '#6B4A2E', structure: '#E8DCC0', roof: '#4A6B7A',
  accent: '#B8432F', skyTop: '#D9C9A3', skyHorizon: '#EADFC4', paper: '#E9DDBF', ink: '#2E2A24',
}, '近似取色：参考《千里江山图》常见的石青、石绿、赭石用色，待对照色卡');
pal('inkwash', '水墨', '东方传统', '浓淡墨色、宣纸白、一点朱砂', '水墨配色：墨分浓淡，宣纸留白，只用一点朱砂作印章式强调', {
  sand: '#D9D4C7', grass: '#A9A69C', highland: '#6E6C66', snow: '#F2EFE6', rock: '#4E4C48', soil: '#7A766D',
  water: '#C9C5BA', foliage: '#3E3D3A', foliage2: '#2A2928', trunk: '#2A2826', structure: '#E8E3D6', roof: '#3A3936',
  accent: '#B83A2E', character: '#5A5853', skyTop: '#EFEBE0', skyHorizon: '#F4F1E8', paper: '#F3EFE4', ink: '#1A1918',
}, '近似取色');
pal('gongbi', '工笔淡彩', '东方传统', '淡赭、花青、胭脂，绢色底', '工笔淡彩配色：淡赭、花青、胭脂等透明淡色，绢色底子，颜色不盖住线（近似取色）', {
  sand: '#E6D3B0', grass: '#B9C9A6', highland: '#9CB4B8', snow: '#F5EFE2', rock: '#B6AFA2', soil: '#C9A884',
  water: '#BFD1CF', foliage: '#9DB48F', foliage2: '#7E9EA8', trunk: '#8C6E54', structure: '#F1E6CF', roof: '#7F9AA6',
  accent: '#C4566A', character: '#D98B7A', skyTop: '#E9DDC3', skyHorizon: '#F2E9D5', paper: '#EFE4CC', ink: '#5A4A3E',
}, '近似取色');
pal('song', '宋画淡雅', '东方传统', '低饱和暖灰，绢色留白', '宋画式淡雅配色：低饱和暖灰与绢色，大面积留白', {
  sand: '#D8CBB0', grass: '#B3B096', highland: '#8E9488', rock: '#9B958A', soil: '#B09A7E', water: '#C2C3B5',
  foliage: '#7D8670', trunk: '#5E5446', structure: '#E5DCC8', roof: '#6F6B63', accent: '#A65A44',
  skyTop: '#E4DAC4', skyHorizon: '#EEE6D4', paper: '#ECE3CF', ink: '#3A342C',
}, '近似取色');
pal('dunhuang', '敦煌壁画', '东方传统', '土红、石绿、青金、黄土', '敦煌壁画配色：土红、石绿、青金石蓝与黄土底，略带剥落旧色（近似取色）', {
  sand: '#D8B27A', grass: '#5E9C83', highland: '#3E5E8C', snow: '#EADCC0', rock: '#A5643E', soil: '#B5743F',
  water: '#4F8C8C', foliage: '#4E8A6E', trunk: '#7A4A30', structure: '#E2C9A0', roof: '#8C3A2A', accent: '#B5402E',
  character: '#C46A45', skyTop: '#C9A27A', skyHorizon: '#E6CFA6', paper: '#E3CDA4', ink: '#3A2418',
}, '近似取色');
pal('nianhua', '年画', '东方传统', '桃红、大绿、明黄套色', '年画配色：桃红、大绿、明黄高饱和套色，黑线勾边', {
  sand: '#FFD34D', grass: '#2EAA5C', highland: '#1F7AC2', rock: '#7A6E9C', soil: '#D9822B', water: '#33A1DE',
  foliage: '#1E9C4E', trunk: '#8C3A2A', structure: '#FFF0D6', roof: '#E8384F', accent: '#FF3F7F', character: '#E8384F',
  skyTop: '#FFE7B0', skyHorizon: '#FFF4D9', paper: '#FFF4DE', ink: '#1A1110',
}, '近似取色');
pal('qinghua', '青花', '东方传统', '白釉上的钴蓝单色', '青花配色：白釉为底，钴蓝深浅一色', {
  sand: '#EEF2F5', grass: '#C9D6E8', highland: '#7F9CCB', snow: '#FFFFFF', rock: '#5674B0', soil: '#A9B9D6',
  water: '#8FA9D6', foliage: '#2F4F99', foliage2: '#1F3B80', trunk: '#243A73', structure: '#F7F9FB', roof: '#2B4A94',
  accent: '#1F3B80', character: '#3A5BA8', skyTop: '#F2F5F8', skyHorizon: '#FAFBFC', paper: '#F6F8FA', ink: '#15275C',
}, '近似取色');
pal('lacquer', '漆器', '东方传统', '黑、朱、描金', '漆器配色：黑与朱红大面积对比，金色描线', {
  sand: '#B5402E', grass: '#2A1A16', highland: '#1A1110', rock: '#3A2620', soil: '#8C2A1E', water: '#2A1A1A',
  foliage: '#1E1412', trunk: '#120B0A', structure: '#C23B2A', roof: '#120B0A', accent: '#D9A441', metal: '#D9A441',
  character: '#C23B2A', skyTop: '#1A1110', skyHorizon: '#3A2620', paper: '#2A1A16', ink: '#D9A441',
}, '近似取色');
pal('ukiyoe', '浮世绘', '东方传统', '普鲁士蓝、米黄、朱红', '浮世绘套色：普鲁士蓝与米黄纸色，朱红点缀，平涂色块', {
  sand: '#E8D3A3', grass: '#7E9C6A', highland: '#3B6E8F', snow: '#F4EEDC', rock: '#5E6E78', soil: '#B08A5A',
  water: '#2B5C8A', waterDeep: '#1B3A66', foliage: '#4E7A55', trunk: '#5A4030', structure: '#EFE2C2', roof: '#3A4E5E',
  accent: '#D04A2F', skyTop: '#C9B98F', skyHorizon: '#EDE0BE', paper: '#F0E3C4', ink: '#1E2A33',
}, '近似取色');

/* ---------------- 艺术运动与平面 ---------------- */
pal('bauhaus', '包豪斯原色', '艺术运动', '红黄蓝加黑白', '包豪斯式原色：红、黄、蓝配黑白，块面几何', {
  sand: '#F2C230', grass: '#E8E4D8', highland: '#1F4E9C', snow: '#FFFFFF', rock: '#2A2A2A', soil: '#C8352B',
  water: '#1F4E9C', foliage: '#C8352B', trunk: '#1A1A1A', structure: '#F4F1E8', roof: '#C8352B', accent: '#F2C230',
  character: '#1F4E9C', skyTop: '#E8E4D8', skyHorizon: '#F4F1E8', ink: '#111111',
});
pal('memphis', '孟菲斯', '艺术运动', '粉彩撞色、黑色点缀', '孟菲斯撞色：粉、薄荷、黄与紫的高明度撞色，黑色点缀', {
  sand: '#FFD166', grass: '#06D6A0', highland: '#8E7CC3', rock: '#EF476F', soil: '#FFB4A2', water: '#118AB2',
  foliage: '#06D6A0', trunk: '#073B4C', structure: '#FFF5E6', roof: '#EF476F', accent: '#FFD166', skyTop: '#B5E2FA',
  ink: '#111111',
});
pal('popart', '波普', '艺术运动', '原色高饱和、黑线', '波普配色：高饱和原色与网点，粗黑线', {
  sand: '#FFE600', grass: '#00C853', highland: '#0091EA', rock: '#FF4081', soil: '#FF6D00', water: '#00B0FF',
  foliage: '#00C853', trunk: '#212121', structure: '#FFFFFF', roof: '#FF1744', accent: '#FF1744', character: '#FF1744',
  skyTop: '#00B0FF', skyHorizon: '#80D8FF', ink: '#000000',
});
pal('riso', '孔版专色', '艺术运动', '荧光粉、蓝、黄三专色', '孔版印刷专色：荧光粉、蓝与黄三色叠印', {
  sand: '#FFE800', grass: '#FF48B0', highland: '#0078BF', rock: '#765BA7', soil: '#FF6C2F', water: '#0078BF',
  foliage: '#00A95C', trunk: '#3D5588', structure: '#F7F2E7', roof: '#FF48B0', accent: '#FF48B0', skyTop: '#F7F2E7',
  skyHorizon: '#F7F2E7', paper: '#F7F2E7', ink: '#3D5588',
}, '油墨色取自 mattdesl/riso-colors（MIT，见 THIRD_PARTY_NOTICES.md §4），纸色自定');
pal('moebius', '法漫沙漠', '艺术运动', '奶油沙、粉橙、淡青天', '法式漫画沙漠色：奶油沙色、粉橙岩石与淡青天空，平涂少阴影', {
  sand: '#F2DDB0', grass: '#E8B98A', highland: '#D98E73', snow: '#FFF6E6', rock: '#C97B63', soil: '#B86A55',
  water: '#7EC8C8', foliage: '#9CB27A', trunk: '#7A5A4A', structure: '#F7EBD3', roof: '#4E8CA6', accent: '#E04E39',
  skyTop: '#9ED6D9', skyHorizon: '#F6E9CF', ink: '#2B2433',
});
pal('poster', '海报暖橙', '艺术运动', '橙紫分层的风景海报', '风景海报式配色：橙色到紫色的分层大色块，远景按层变淡', {
  sand: '#F6B26B', grass: '#E07A3F', highland: '#9C4F6E', rock: '#6E3F6B', soil: '#B85A3C', water: '#5E6EA8',
  foliage: '#B84A3A', foliage2: '#6E3A5E', trunk: '#3A2033', accent: '#FFD166', skyTop: '#F2994A', skyHorizon: '#FFD9A0',
  ink: '#2A1530',
});

/* ---------------- 复古主机（色票投影） ---------------- */
swatchPal('pico8', 'PICO-8 16 色', '复古主机', '幻想主机固定 16 色', '限定 PICO-8 固定 16 色色板', [
  '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
  '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
], 'https://lospec.com/palette-list/pico-8');
swatchPal('gameboy', 'Game Boy 四绿', '复古主机', '4 阶绿色', '限定 Game Boy 四阶绿色', ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'], 'Game Boy DMG 常用模拟色');
swatchPal('cga', 'CGA 青品', '复古主机', '黑、青、品红、白', '限定 CGA 四色：黑、青、品红、白', ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF'], 'CGA palette 1 high intensity');
swatchPal('ega', 'EGA 16 色', '复古主机', 'DOS 时代 16 色', '限定 EGA 标准 16 色', [
  '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
], 'EGA 默认调色板');
swatchPal('sweetie16', 'Sweetie 16', '复古主机', '现代像素画常用 16 色', '限定 Sweetie 16 色板', [
  '#1A1C2C', '#5D275D', '#B13E53', '#EF7D57', '#FFCD75', '#A7F070', '#38B764', '#257179',
  '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7', '#F4F4F4', '#94B0C2', '#566C86', '#333C57',
], 'https://lospec.com/palette-list/sweetie-16');
swatchPal('virtualboy', 'Virtual Boy 红黑', '复古主机', '红黑单色', '限定红黑单色四阶', ['#000000', '#550000', '#AA0000', '#FF0000']);
swatchPal('onebit', '1-bit 纸墨', '复古主机', '只有两色', '只用两种颜色：纸色与墨色', ['#E6E1C5', '#2B2B26'], '近似取色');
swatchPal('mac1bit', '1-bit 黑白', '复古主机', '纯黑与纯白', '只用纯黑与纯白', ['#000000', '#FFFFFF']);
swatchPal('sepia4', '棕褐四阶', '复古主机', '旧照片棕褐', '棕褐色四阶单色', ['#2B1D14', '#6B4A32', '#B08A62', '#EBD9B4']);

/* ---------------- 调研色板（docs/survey/05-palettes.md，精确色值与出处） ---------------- */
type SurveyPalette = { id: string; name: string; group: string; source?: string; notes?: string; swatches: { name?: string; hex: string }[]; roles?: Record<string, string> };

/** 调研色板的角色名 → 本工具的颜色角色 */
function surveyRoles(r: Record<string, string>): Keys {
  const k: Keys = {};
  const set = (role: Role, v?: string) => { if (v && !k[role]) k[role] = v.toUpperCase(); };
  set('paper', r.paper);
  set('skyTop', r.skyHigh ?? r.sky);
  if (r.skyHigh) set('skyHorizon', r.sky);
  set('grass', r.ground);
  set('highland', r.peak ?? r.foliageFar);
  set('rock', r.rock);
  set('water', r.water);
  set('foliage', r.foliage);
  set('foliage2', r.foliageDark ?? r.foliageLight ?? r.foliageFar ?? r.moss);
  // 有 wall 时 wall 是墙体，structure 是木构；否则 structure 就是墙体
  if (r.wall) { set('structure', r.wall); set('wood', r.structure); set('trim', r.trim ?? r.structure); } else { set('structure', r.structure); set('trim', r.trim); }
  set('roof', r.roof);
  set('stone', r.base);
  set('metal', r.gold);
  set('accent', r.accent);
  set('interactive', r.accent2 ?? r.glow);
  set('emissive', r.light ?? r.glow ?? r.gold);
  set('flower', r.blossom);
  set('ink', r.ink);
  set('character', r.accent2 ?? r.accent);
  return k;
}

const SURVEY_GROUP: Record<string, string> = {
  '中国传统色': '中国传统色（考据）', '日本传统色': '日本传统色',
  '复古主机/电脑': '复古主机（精确色值）', 'IBM PC': '复古主机（精确色值）', '幻想主机': '复古主机（精确色值）',
  'Game Boy 4 色': '复古主机（精确色值）', '1-bit 双色': '复古主机（精确色值）', '现代像素调色板': '像素画色板',
};
// 与已有色板重复（同一组色值）或不适合当整体色板（78 色油墨全表）的跳过
const SURVEY_SKIP = new Set(['pico-8', 'sweetie-16', 'cga-p1-high', 'memphis-approx', 'riso-inks-stencil']);
for (const p of SURVEY as SurveyPalette[]) {
  if (SURVEY_SKIP.has(p.id) || PALETTE_IDS().has(p.id)) continue;
  const short = p.name.replace(/（[^）]*）/g, '').trim();
  const named = p.swatches.filter((s) => s.name && !/^[0-9a-f]{1,3}$/i.test(s.name)).map((s) => s.name!);
  const group = SURVEY_GROUP[p.group] ?? p.group;
  const desc = (p.notes ?? p.name).split(/[。；]/)[0];
  const hexes = p.swatches.map((s) => s.hex.toUpperCase());
  if (p.roles) {
    const prompt = `${short}配色${named.length ? `：${named.slice(0, 8).join('、')}` : ''}`;
    pal(`sv-${p.id}`, `${short}${group.startsWith('中国') ? ' · 考据' : ''}`, group, desc, prompt, surveyRoles(p.roles), p.source);
    // 严格限色只用考据色值本身，推导出来的角色色会被投到最近的考据色
    LIST[LIST.length - 1].swatches = [...new Set(hexes)];
  } else {
    swatchPal(`sv-${p.id}`, short, group, desc, `限定 ${short} 的 ${hexes.length} 色色板`, hexes, p.source);
  }
}

export const PALETTES = LIST;
export const PALETTE_MAP = new Map(LIST.map((p) => [p.id, p]));
export const getPalette = (id: string) => PALETTE_MAP.get(id) ?? LIST[0];

/** 允许用户自定义色板（本地保存后注册） */
export function registerPalette(p: Palette) {
  const i = LIST.findIndex((x) => x.id === p.id);
  if (i >= 0) LIST[i] = p; else LIST.push(p);
  PALETTE_MAP.set(p.id, p);
}
