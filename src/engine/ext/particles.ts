// K 粒子与节拍：引擎扩展（registerEngineExt，见 ../engineExt.ts）
import * as THREE from 'three';
import { ROLE_INDEX } from '../../content/roles';
import { num, str } from '../../dims/registry';
import { registerEngineExt, type EngineExtCtx } from '../engineExt';
import { U } from '../materials/uniforms';
import { AmbientParticles, EmitterParticles, PARTICLE_KINDS, type ParticleKind } from '../particles';

/*
 * 氛围粒子（motion.particles / particleDensity / particleSize）、场景发射器（SceneDesc.emitters：弹幕、火把火星）、
 * 节拍（motion.beat / beatPulse）：每一拍发光体 / 强调色 / 交互色和点光源一起亮一下，粒子跟着涨落，火花踩点炸开。
 * 都是默认关：没开粒子、没设节拍、场景没写发射器时什么都不做（不加网格、不改 uniform）。
 */

let amb: AmbientParticles | null = null;
let emit: EmitterParticles | null = null;
const cfg = { bpm: 0, pulse: 0.6, kind: 'none' as ParticleKind };

/** 被节拍调亮的颜色：引擎每次重写后（换参数、时段循环）记下新的底色，再按脉冲写回 */
const PULSE_ROLES = [ROLE_INDEX.emissive, ROLE_INDEX.accent, ROLE_INDEX.interactive];
const roleBase = PULSE_ROLES.map(() => new THREE.Color());
const roleWritten = PULSE_ROLES.map(() => new THREE.Color(-1, -1, -1));
const lightBase = Array.from({ length: 8 }, () => new THREE.Color());
const lightWritten = Array.from({ length: 8 }, () => new THREE.Color(-1, -1, -1));
let pulsing = false;

function attach(c: EngineExtCtx, o: THREE.Object3D | undefined | null) {
  if (o && o.parent !== c.scene) { o.parent?.remove(o); c.scene.add(o); }
}

/** 把一个颜色按倍数写回（先认出引擎有没有重写过它） */
function pulseColor(cur: THREE.Color, base: THREE.Color, written: THREE.Color, k: number) {
  if (!cur.equals(written)) base.copy(cur);
  cur.copy(base).multiplyScalar(k);
  written.copy(cur);
}

function restore() {
  if (!pulsing) return;
  PULSE_ROLES.forEach((r, i) => { const cur = U.uRoleColors.value[r]; if (cur.equals(roleWritten[i])) cur.copy(roleBase[i]); roleWritten[i].setRGB(-1, -1, -1); });
  for (let i = 0; i < 8; i++) { const cur = U.uPointColor.value[i] as THREE.Color; if (cur.equals(lightWritten[i])) cur.copy(lightBase[i]); lightWritten[i].setRGB(-1, -1, -1); }
  pulsing = false;
}

registerEngineExt({
  id: 'k-particles',
  onValues(c) {
    const v = c.values;
    const kind = (PARTICLE_KINDS as readonly string[]).includes(str(v, 'motion.particles')) ? (str(v, 'motion.particles') as ParticleKind) : 'none';
    cfg.kind = kind;
    cfg.bpm = Math.max(0, num(v, 'motion.beat') || 0);
    cfg.pulse = num(v, 'motion.beatPulse');
    if (kind !== 'none' && !amb) amb = new AmbientParticles();
    if (amb) {
      attach(c, amb.points);
      amb.configure(kind, num(v, 'motion.particleDensity'), num(v, 'motion.particleSize') || 1);
    }
    if (!cfg.bpm) restore();
  },
  onSceneBuilt(c) {
    if (emit) { emit.points.parent?.remove(emit.points); emit.dispose(); emit = null; }
    const list = c.desc?.emitters;
    if (list?.length) { emit = new EmitterParticles(list); c.scene.add(emit.points); }
  },
  onFrame(c) {
    if (!amb?.points.visible && !emit && !cfg.bpm) return;
    // 节拍脉冲：每拍瞬间到 1、按指数衰减（拍子越快衰减越快）
    let beat = 0, beatP = 0;
    if (cfg.bpm > 0) {
      beatP = 60 / cfg.bpm;
      // 相位按动画时间 stepTime（和音符、程序动画同一个钟；节奏·音轨的品格正好在拍上过判定线）
      const ph = (c.stepTime / beatP) % 1;
      beat = Math.exp(-ph * 5.5) * Math.min(1, Math.max(0, cfg.pulse));
    }
    const t = c.stepTime;
    if (amb?.points.visible) { attach(c, amb.points); amb.frame(t, beat, beatP, c.target, c.viewH, c.aspect, c.player, 1); }
    if (emit) { attach(c, emit.points); emit.frame(t, beat, c.player, 1); }
    if (cfg.bpm > 0) {
      const s = Math.min(1, Math.max(0, cfg.pulse));
      // 发光体：拍与拍之间暗一点、拍上亮一截；强调 / 交互色轻一些
      const ks = [1 - 0.6 * s + 1.5 * beat, 1 - 0.25 * s + 0.7 * beat, 1 - 0.25 * s + 0.7 * beat];
      PULSE_ROLES.forEach((r, i) => pulseColor(U.uRoleColors.value[r], roleBase[i], roleWritten[i], ks[i]));
      const n = Math.min(8, U.uPointCount.value as number);
      for (let i = 0; i < n; i++) pulseColor(U.uPointColor.value[i] as THREE.Color, lightBase[i], lightWritten[i], 1 - 0.5 * s + 1.3 * beat);
      pulsing = true;
    }
  },
  onDispose() {
    restore();
    amb?.points.parent?.remove(amb.points); amb?.dispose(); amb = null;
    emit?.points.parent?.remove(emit.points); emit?.dispose(); emit = null;
  },
});
