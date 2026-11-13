// P2 镜头与复古显示：后处理扩展（registerFx，见 ./registry.ts）
// 每项技术一个文件（retro-*.ts），引入即登记；参数在 src/dims/tech-retro.ts
import './retro-dof'; // 按深度移轴（camera.tiltMode = depth）
import './retro-hardware'; // 老机器硬件限色（color.hardware）
import './retro-pixel'; // 像素清理（camera.pixelClean）
import './retro-film'; // 老胶片（surface.filmAge）
import './retro-wet'; // 湿地面反射（lighting.wetReflect）
import './retro-volume'; // 体积雾（atmosphere.volumetric）
import './retro-interlace'; // 隔行梳齿（surface.interlaceComb）
import './retro-stereo'; // 立体显示（surface.stereo）
import './retro-synth'; // 合成波落日（atmosphere.synthSun）
import './retro-fractal'; // 分形天空（surface.fractal）
