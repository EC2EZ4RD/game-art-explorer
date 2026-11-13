import { CUN_ASSET, DETAIL_ASSET, getAsset } from '../content/assets';
import { bool, num, str } from '../dims/registry';
import type { Values } from '../dims/types';
import { U } from './materials/uniforms';
import { assetTexture, solidTexture } from './textures';

/*
 * 场景材质用到的素材纹理：按参数选文件、写 uniform。没选用的槽位绑 1×1 中性纹理。
 * 纹理只在第一次被选中时下载（textures.ts 缓存），切换选项不重新加载。
 */

const file = (id: string | undefined, key: string) => (id ? getAsset(id)?.files[key] : undefined);

export function bindAssetUniforms(v: Values) {
  const grey = solidTexture('#808080');
  const flatN = solidTexture('#8080ff');
  const white = solidTexture('#ffffff');

  // 凹凸图案（黏土指纹、针织）
  const detail = str(v, 'material.detail');
  const dn = file(DETAIL_ASSET[detail], 'normal');
  const dh = file(DETAIL_ASSET[detail], 'height');
  U.uDetailMode.value = dn ? Math.max(0, ['noise', 'clay', 'knit'].indexOf(detail)) : 0;
  U.uDetailScale.value = num(v, 'material.detailScale');
  U.tDetailN.value = dn ? assetTexture(dn, { repeat: true, placeholder: '#8080ff' }) : flatN;
  U.tDetailH.value = dh ? assetTexture(dh, { repeat: true, placeholder: '#ffffff' }) : white;

  // 皴法
  const cun = str(v, 'material.cun');
  const cf = file(CUN_ASSET[cun], 'gray');
  U.uCunMode.value = cf ? ['none', 'pima', 'fupi', 'midian'].indexOf(cun) : 0;
  U.uCunAmount.value = num(v, 'material.cunAmount');
  U.uCunScale.value = num(v, 'material.cunScale');
  U.tCun.value = cf ? assetTexture(cf, { repeat: true, placeholder: '#000000' }) : grey;

  // 剥落：参数 0~1 → 距离场阈值 0~0.8（0.5 ≈ 原图的剥落范围）
  const wear = num(v, 'material.weathering');
  const wf = file('peel_mask', 'field');
  U.uWeather.value = wf && wear > 0 ? wear * 0.8 : 0;
  U.uWeatherScale.value = num(v, 'material.weatherScale');
  U.tWeather.value = wf && wear > 0 ? assetTexture(wf, { repeat: true, placeholder: '#ffffff' }) : white;

  // 剪纸
  const cut = str(v, 'material.papercut');
  const lf = file('jianzhi_lattice', 'mask');
  U.uPapercut.value = lf ? Math.max(0, ['none', 'architecture', 'vegetation', 'all'].indexOf(cut)) : 0;
  U.uPapercutScale.value = num(v, 'material.papercutScale');
  U.tPapercut.value = lf && cut !== 'none' ? assetTexture(lf, { repeat: true, placeholder: '#ffffff' }) : white;
  const wfl = file('jianzhi_window', 'mask');
  U.uWindowFlower.value = wfl && bool(v, 'material.windowFlower') ? 1 : 0;
  U.tWindow.value = U.uWindowFlower.value ? assetTexture(wfl!, { repeat: true, placeholder: '#000000' }) : grey;

  // 排线来源（TAM）
  const tam = str(v, 'shading.hatchTex') === 'tam' && str(v, 'shading.model') === 'hatching';
  U.uHatchTex.value = tam ? 1 : 0;
  U.tTam1.value = tam ? assetTexture(file('tam', 'tones123')!, { repeat: true, placeholder: '#ffffff' }) : white;
  U.tTam2.value = tam ? assetTexture(file('tam', 'tones456')!, { repeat: true, placeholder: '#ffffff' }) : white;
}
