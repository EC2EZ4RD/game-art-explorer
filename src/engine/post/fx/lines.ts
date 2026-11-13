// P1 线条与后处理核心：后处理扩展（registerFx，见 ./registry.ts）。引入即登记
import './lines-engrave'; // 铜版 / 钞票雕刻线（surface.medium = 'engraving'）
import './lines-layer'; // 媒介范围（只画环境）、错位填色
