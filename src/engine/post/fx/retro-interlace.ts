import type * as THREE from 'three';
import { bool } from '../../../dims/registry';
import { registerEngineExt } from '../../engineExt';
import { registerFx } from './registry';

/*
 * 真实隔行梳齿（surface.interlaceComb，P2）：隔行视频一帧由两"场"拼成——单数行是这一刻拍的，双数行是上一刻拍的。
 * 这里每帧轮换：本场的行用当前画面，另一场的行用上一帧的画面（ctx.persist 跨帧保存）。
 * 画面静止时两场一样，什么都看不出来；一动起来，运动物体和镜头平移时的竖边就裂成一排梳齿——这才是录像带 / 早期数码录像暂停时的样子。
 * 行高按约 480 条可见扫描线换算（1080p 下约 2 像素一行）。放在纸纹 / 颗粒之后、镜头畸变与录像带之前（录像带录的就是隔行信号）。
 * 换尺寸、刚打开、隔帧断开时（跨帧缓冲不是上一帧的内容）那一帧不交织。
 * 迁移到 Godot：两个 SubViewport 轮流保存上一帧（或 BackBufferCopy），全屏着色器按行奇偶取当前 / 上一帧。
 */

const FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tPrev;
uniform float uField;
uniform float uRowH;
uniform float uValid;
void main() {
  vec3 cur = texture(tInput, vUv).rgb;
  float row = floor((uRes.y - gl_FragCoord.y) / uRowH);
  bool other = mod(row, 2.0) != uField;
  vec3 c = other && uValid > 0.5 ? texture(tPrev, vUv).rgb : cur;
  // 两场的余辉略有差别：另一场暗 3%
  oColor = vec4(c * (other ? 0.97 : 1.0), 1.0);
}`;

/** 引擎每渲一帧加一（不管这个效果开没开），用来判断跨帧缓冲是不是紧挨着的上一帧 */
let frameNo = 0;
registerEngineExt({ id: 'retroCombClock', onFrame() { frameNo++; } });
let lastRT: THREE.WebGLRenderTarget | null = null;
let lastFrame = -10;

registerFx({
  id: 'retroComb',
  stage: 'afterOverlay',
  order: 30,
  frag: FRAG,
  uniforms: { tPrev: { value: null }, uField: { value: 0 }, uRowH: { value: 2 }, uValid: { value: 0 } },
  active: (v) => bool(v, 'surface.interlaceComb'),
  render(c, out, p) {
    const prev = c.persist('retroComb:prev');
    const valid = prev === lastRT && lastFrame === frameNo - 1;
    p.uniforms.tPrev.value = prev.texture;
    p.uniforms.uField.value = frameNo % 2;
    p.uniforms.uRowH.value = Math.max(1, Math.round(c.res.y / 480));
    p.uniforms.uValid.value = valid ? 1 : 0;
    p.render(c.renderer, out);
    // 存下这一帧的画面，下一帧另一场的行用它
    c.copy(c.input, prev);
    lastRT = prev;
    lastFrame = frameNo;
  },
});
