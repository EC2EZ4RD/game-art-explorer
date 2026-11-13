// 引入即注册。新增维度文件后在这里加一行。
import './game';
import './world';
import './geometry';
import './shape';
import './material';
import './shading';
import './lines';
import './surface';
import './color';
import './lighting';
import './camera';
import './atmosphere';
import './motion';
import './hud';
// 技术补全（2026-10-23）：各轨道的新参数 / 追加选项，各写一个文件
import './tech-lines';
import './tech-print';
import './tech-retro';
import './tech-material';
import './tech-scene';
// 迁移说明补全（必须在所有维度注册之后）
import './ports';

export * from './registry';
export * from './types';
