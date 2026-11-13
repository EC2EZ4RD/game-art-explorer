import * as THREE from 'three';
import { ROLE_INDEX } from '../content/roles';
import type { DiegeticItem } from '../hud/compose/hud';
import { SHARED_DECL } from './materials/glsl';
import { U } from './materials/uniforms';
import { LAYER_FX } from './scene/build';

/*
 * 叙事内 UI（docs/ui-hud-plan.md M6）：放置方式选"叙事内"（elx.diegesis = diegetic）的信息元素不画在屏幕叠加层上，
 * 而是画成一张贴图、作为世界里的一块板子出现（挂点上方 / 地面上）：它和场景一起被描边、纸纹、媒介、CRT 处理——
 * "UI 是世界里的东西"。板子写进场景的两张输出（颜色 + 角色编号 = 强调色），和三维物体正确遮挡。
 */

const VERT = /* glsl */ `
${SHARED_DECL}
out vec2 vUv;
out vec3 vWorld;
void main() {
  vUv = vec2(uv.x, uv.y);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
${SHARED_DECL}
uniform sampler2D tMap;
uniform float uRole;
in vec2 vUv;
in vec3 vWorld;
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oNormal;
void main() {
  vec4 t = texture(tMap, vUv);
  if (t.a < 0.08) discard;
  // 画布是预乘的：还原成直通色
  oColor = vec4(t.rgb / max(t.a, 1e-3), 1.0);
  oNormal = vec4(0.5, 0.5, 1.0, (uRole + 0.5) / 64.0);
}`;


export class DiegeticSigns {
  readonly group = new THREE.Group();
  private meshes: { mesh: THREE.Mesh; item: DiegeticItem; tex: THREE.CanvasTexture; h: number }[] = [];
  private version = -1;

  constructor() { this.group.name = 'diegetic-ui'; }

  /** HudSystem 重画过（version 变了）就重建板子 */
  /** worldPerPx：挂点处一个 CSS 像素对应的世界长度（板子做出来时和屏幕上的版本差不多大） */
  sync(items: DiegeticItem[], version: number, worldPerPx = 0.01) {
    if (version === this.version) return;
    this.version = version;
    for (const m of this.meshes) { m.mesh.geometry.dispose(); (m.mesh.material as THREE.Material).dispose(); m.tex.dispose(); this.group.remove(m.mesh); }
    this.meshes = [];
    for (const item of items) {
      const tex = new THREE.CanvasTexture(item.canvas);
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const mat = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: { ...U, tMap: { value: tex }, uRole: { value: ROLE_INDEX.accent } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        transparent: false,
      });
      const w = item.cssW * worldPerPx, h = item.cssH * worldPerPx;
      const geo = new THREE.PlaneGeometry(w, h);
      if (item.mode === 'decal') geo.rotateX(-Math.PI / 2);
      else geo.translate(0, h / 2, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.layers.set(LAYER_FX);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.meshes.push({ mesh, item, tex, h });
    }
  }

  /**
   * 每帧：放到挂点（世界坐标），立牌转向镜头（只绕竖轴转，像立在地上的牌子）。
   * 几块立牌落在同一个挂点上时往上叠（M12b-65 ①，dead-space#26：生命板与弹药板原来叠在同一点、互相遮住），间隔 = 板高的 8%
   */
  place(worldOf: (item: DiegeticItem) => THREE.Vector3 | null, cam: THREE.Camera) {
    const camPos = new THREE.Vector3();
    cam.getWorldPosition(camPos);
    const stacks: { p: THREE.Vector3; top: number }[] = [];
    for (const m of this.meshes) {
      const p = worldOf(m.item);
      m.mesh.visible = !!p;
      if (!p) continue;
      m.mesh.position.copy(p);
      if (m.item.mode !== 'decal') {
        const st = stacks.find((q) => q.p.distanceToSquared(p) < 1e-6);
        if (st) { m.mesh.position.y = st.top + m.h * 0.08; st.top = m.mesh.position.y + m.h; } else stacks.push({ p: p.clone(), top: p.y + m.h });
      }
      if (m.item.mode === 'decal') { m.mesh.position.y += 0.03; m.mesh.rotation.set(0, 0, 0); continue; }
      const dx = camPos.x - p.x, dz = camPos.z - p.z;
      m.mesh.rotation.set(0, Math.atan2(dx, dz), 0);
    }
  }

  dispose() { this.sync([], -2); }
}
