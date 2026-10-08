import { walkerPreviewTarget } from '../core/walker-geometry.js';
import { deformBodyPoint, deformBodyFrame } from '../core/travel.js';
import { animateHumanoid } from './humanoid-animator.js';
import * as THREE from 'three';
import { sampleMotion } from '../core/motion.js';
import { solveTwoBone } from '../core/ik.js';
import { TAU, clamp, smooth, add, sub, mul, distance, rotateY } from '../core/math.js';
import { alignSegment } from './parts.js';
/** Authored gait policy + analytic IK, not a physical joint simulation. Stance
 * feet are held in world space in the habitat. Swing feet track terrain probes. */
export function animateCreature(creature, dt, ctx) {
  if (creature.humanoid) return animateHumanoid(creature, dt, ctx);
  const {
    time,
    speed = 0,
    preview = false,
    walking,
    groundHeight = (x, z) => 0,
    grounded = true,
    seek = false,
  } = ctx;
  const pose = sampleMotion(creature.genome.motion, { speed, preview, walking });
  const afloat = creature.genome.motion.travel.medium !== 'ground';
  const moving = preview || afloat ? pose.rate > 0.02 : speed > 0.12;
  const phaseRate = moving ? pose.rate * (preview || afloat ? 1 : Math.max(0.55, speed / 2)) : 0;
  if (seek) creature.phase = time * phaseRate;
  else creature.phase += phaseRate * dt;
  const gait = creature.phase;
  const animTime = time * creature.genome.motion.tempo;
  creature.torso.position.y =
    Math.sin(animTime * 2.1) * 0.018 * pose.layers.breath +
    Math.cos(gait * TAU * 2) * pose.bob -
    pose.tuck;
  creature.torso.rotation.z =
    Math.sin(moving ? gait * TAU : animTime * 1.1) * pose.sway + (ctx.bank ?? 0);
  creature.torso.rotation.x = pose.pitch + Math.sin(animTime * 1.5) * 0.008 * pose.layers.breath;
  const wave = creature.genome.motion.bodyWave;
  if (wave.kind !== 'rigid' || creature.bodyWasDeformed) {
    const source = creature.restSurface.attributes.position.array,
      target = creature.body.geometry.attributes.position.array;
    for (let i = 0; i < source.length; i += 3)
      target.set(
        deformBodyPoint(source.subarray(i, i + 3), wave, animTime, creature.deformationExtent),
        i,
      );
    creature.body.geometry.attributes.position.needsUpdate = true;
    creature.body.geometry.computeVertexNormals();
    creature.body.geometry.computeBoundingSphere();
    creature.bodyWasDeformed = wave.kind !== 'rigid';
  }
  for (const runtime of creature.parts) {
    if (runtime.kind === 'leg') continue;
    const p = runtime.part,
      frame = deformBodyFrame(p.position, p.normal, wave, animTime, creature.deformationExtent);
    runtime.group.position.fromArray(frame.position);
    runtime.group.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().fromArray(frame.normal),
    );
    runtime.group.rotateY(p.twist * p.mirrorSide);
    runtime.group.rotateX(p.bend * 0.12);
  }
  creature.torso.updateMatrix();
  const rootPos = creature.root.position.toArray(),
    yaw = creature.root.rotation.y;
  const toWorld = v => add(rotateY(v, yaw), rootPos),
    toLocal = v => rotateY(sub(v, rootPos), -yaw);
  for (const limb of creature.legs) {
    const p = limb.part,
      side = p.side,
      phase = (gait + (p.pair % 2) * pose.phaseLag + (side < 0 ? 0.5 : 0) + (p.phase ?? 0)) % 1;
    const hipV = new THREE.Vector3().fromArray(p.position).applyMatrix4(creature.torso.matrix),
      hip = hipV.toArray();
    const spread = 0.27 * p.size;
    let target = [
      p.position[0] + side * spread,
      -creature.analysis.restHeight + 0.12 * p.size,
      p.position[2] + 0.08,
    ];
    if (afloat || preview) {
      target = walkerPreviewTarget(p, pose, {
        gait,
        restHeight: creature.analysis.restHeight,
        hip,
        afloat,
        moving,
      });
    } else {
      const desired = toWorld(target);
      desired[1] = groundHeight(desired[0], desired[2]) + 0.12 * p.size;
      if (!limb.step)
        limb.step = { foot: [...desired], start: [...desired], end: [...desired], swing: false };
      const s = limb.step,
        swing = moving && phase > pose.stance;
      if (!grounded) {
        s.foot = s.foot.map((v, i) => v + (toWorld(target)[i] - v) * Math.min(1, dt * 12));
      } else if (swing) {
        if (!s.swing) {
          s.start = [...s.foot];
          const forward = rotateY([0, 0, 0.3 + speed * 0.07], yaw);
          s.end = add(desired, forward);
          s.end[1] = groundHeight(s.end[0], s.end[2]) + 0.12 * p.size;
        }
        const t = clamp((phase - pose.stance) / (1 - pose.stance), 0, 1),
          u = smooth(t);
        s.foot = s.start.map((v, i) => v + (s.end[i] - v) * u);
        s.foot[1] += Math.sin(t * Math.PI) * (pose.lift + speed * 0.02);
      } else if (
        !moving ||
        distance(s.foot, toWorld(hip)) > (limb.upperLength + limb.lowerLength) * 1.03
      ) {
        s.foot = s.foot.map((v, i) => v + (desired[i] - v) * Math.min(1, dt * (moving ? 10 : 7)));
      }
      s.swing = swing;
      target = toLocal(s.foot);
    }
    // The pole is anatomical: knees bend out and slightly toward the face.
    const result = solveTwoBone(
      hip,
      target,
      limb.upperLength,
      limb.lowerLength,
      rotateY([side * 0.5, 0, 0.85], p.twist * p.mirrorSide),
    );
    if (limb.setLegPose)
      limb.setLegPose({
        hip,
        knee: result.knee,
        foot: result.foot,
        footYaw: side * 0.1 + p.twist * p.mirrorSide,
      });
    else {
      alignSegment(limb.upper, hip, result.knee, limb.radius);
      alignSegment(limb.lower, result.knee, result.foot, limb.radius * 0.72);
      limb.hip.position.fromArray(hip);
      limb.hip.scale.setScalar(limb.radius * 1.28);
      limb.knee.position.fromArray(result.knee);
      limb.knee.scale.setScalar(limb.radius * 1.03);
      limb.ankle.position.fromArray(result.foot);
      limb.ankle.scale.setScalar(limb.radius * 0.75);
      limb.foot.position.fromArray(result.foot);
      limb.foot.rotation.y = side * 0.1 + p.twist * p.mirrorSide;
      limb.error = result.error;
    }
    limb.error = result.error;
  }
  for (const p of creature.parts) p.update?.(animTime, speed, pose);
  creature.root.updateMatrixWorld(true);
}
