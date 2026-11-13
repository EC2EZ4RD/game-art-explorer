import type { SceneRig } from '../engine/scene/types';

/**
 * 与锁定镜头一致的镜头键（场景层写它们，配方的镜头键不再生效；角度名见 dims/camera.ts 的 CAMERA_ANGLES）。
 * 从 sceneCatalog.ts 挪出来（2026-10-23），scenes25d/* 的场景登记也用它
 */
/** CAMERA_ANGLES（dims/camera.ts）各档的俯角：这里抄一份，免得 sceneCatalog → sceneRig → dims/camera → sceneCatalog 循环引入 */
const ANGLE_PITCH: [string, number][] = [['side', 0], ['low', 12], ['dimetric', 30], ['iso', 35.264], ['high', 50], ['top', 88]];

export function sceneRigValues(r: SceneRig, extra: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
  // 取俯角最接近的一档（0 / 30 / 50 / 88 与原来的写法结果一样；10–20° 归「低机位」，H 的请求）
  const angle = ANGLE_PITCH.reduce((a, b) => (Math.abs(b[1] - r.pitch) < Math.abs(a[1] - r.pitch) ? b : a))[0];
  return {
    'camera.projection': r.projection === 'values' ? 'persp' : r.projection,
    'camera.angle': angle,
    'camera.azimuth': r.yaw,
    ...(r.fovMm ? { 'camera.fov': r.fovMm } : {}),
    'camera.zoom': 1,
    'camera.mode': r.followAxis ? 'follow' : 'orbit',
    ...extra,
  };
}
