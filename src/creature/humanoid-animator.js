import { fingerCurl, equipmentAction } from '../core/equipment-pose.js';
import * as THREE from 'three';
import { HUMANOID_LOCOMOTION } from '../core/humanoid.js';
import { sampleMotion } from '../core/motion.js';
import {
  sampleHumanoidAction,
  collectActionEvents,
  humanoidActionOffset,
} from '../core/humanoid-motion.js';
import { solveTwoBone } from '../core/ik.js';
import { clamp, smooth, TAU, add, sub, rotateY, distance } from '../core/math.js';

const down = new THREE.Vector3(0, -1, 0);
const quat = e => new THREE.Quaternion().setFromEuler(new THREE.Euler(...e));
const lowerBody = name => /^(pelvis|upperLeg|shin|foot|toe)/.test(name);
/** Layered biped animation. IK is last for grounded locomotion. Full-body actions
 * can override the legs; they never rotate or teleport the physics body. */
export function animateHumanoid(c, dt, ctx) {
  const h = c.humanoid,
    l = h.layout,
    p = c.genome.rig.proportions,
    b = h.bones;
  const {
    time = 0,
    speed = 0,
    preview = false,
    groundHeight = () => 0,
    grounded = true,
    seek = false,
    walking,
  } = ctx;
  const config = c.genome.motion.humanoid,
    motion = { ...c.genome.motion, weights: { ...c.genome.motion.weights } };
  for (const key of Object.keys(motion.weights))
    if (!HUMANOID_LOCOMOTION.includes(key)) motion.weights[key] = 0;
  const pose = sampleMotion(motion, { speed, preview, walking }),
    moving = preview ? pose.rate > 0.02 : speed > 0.12;
  const rate = moving ? pose.rate * (preview ? 1 : Math.max(0.55, speed / 2)) : 0;
  if (seek) c.phase = time * rate;
  else c.phase += rate * dt;
  const gait = c.phase,
    heavy = config.style === 'heavy',
    stiff = config.style === 'stiff',
    skulk = config.style === 'skulking';
  const proud = config.style === 'proud',
    nimble = config.style === 'nimble',
    limping = config.style === 'limping';
  const t = time * motion.tempo,
    breath = Math.sin(t * 2.1) * 0.012 * pose.layers.breath;
  for (const [name, bone] of Object.entries(b)) {
    bone.position.copy(h.rest.get(name));
    bone.quaternion.identity();
  }
  c.torso.position.set(0, 0, 0);
  c.torso.rotation.set(0, 0, 0);
  b.pelvis.position.y =
    (breath + (moving ? Math.cos(gait * TAU * 2) * pose.bob * 0.6 : 0) - pose.tuck) * l.scale;
  b.pelvis.rotation.z = stiff ? 0 : Math.sin(gait * TAU) * pose.sway * 0.38;
  b.spine.rotation.x =
    (proud ? -0.09 : 0) + p.posture + (skulk ? 0.1 : 0) + (moving ? pose.pitch : 0);
  b.chest.rotation.y = stiff ? 0 : Math.sin(gait * TAU) * 0.06 * (moving ? 1 : 0.1);
  b.head.rotation.set(
    config.lookPitch,
    config.lookYaw + Math.sin(t * 0.65) * 0.045 * pose.layers.gaze,
    0,
  );
  for (const side of [1, -1]) {
    const end = side > 0 ? '.L' : '.R',
      swing = Math.sin(gait * TAU + (side < 0 ? Math.PI : 0));
    b['upperArm' + end].rotation.set(
      (moving ? swing * (heavy ? 0.32 : stiff ? 0.18 : nimble ? 0.7 : 0.52) * config.armSwing : 0) -
        p.posture * 0.25,
      0,
      side * (heavy ? 0.23 : 0.13),
    );
    b['forearm' + end].rotation.x = -(moving ? (heavy ? 0.55 : 0.33) : 0.12) - (skulk ? 0.45 : 0);
  }
  const actionKey = [config.action, config.actionSpeed, config.repeat, config.mask].join(':');
  if (h.actionKey !== actionKey) {
    h.actionKey = actionKey;
    h.actionStart = time;
    h.lastActionTime = 0;
  }
  if (ctx.restartAction) {
    h.actionStart = time;
    h.lastActionTime = 0;
  }
  if (time < h.actionStart) h.actionStart = 0;
  const actionTime = Math.max(0, time - h.actionStart),
    action = sampleHumanoidAction(config, actionTime);
  h.events = collectActionEvents(config, h.lastActionTime, actionTime, { seek });
  h.lastActionTime = actionTime;
  for (const marker of h.events) c.root.dispatchEvent({ type: 'animation-marker', marker });
  const actionWeight = action.weight;
  // Keep a copy of leg targets. Apply full-body rotations after the IK solution.
  for (const [name, euler] of Object.entries(action.rotations))
    if (b[name] && !lowerBody(name)) b[name].quaternion.slerp(quat(euler), actionWeight);
  if (action.mask === 'full') {
    const offset = humanoidActionOffset(config, action, l);
    b.pelvis.position.lerp(new THREE.Vector3().fromArray(offset), actionWeight);
    if (action.rotations.pelvis)
      b.pelvis.quaternion.slerp(quat(action.rotations.pelvis), actionWeight);
  }
  c.root.updateMatrixWorld(true);
  const rootPos = c.root.position.toArray(),
    yaw = c.root.rotation.y;
  const toWorld = v => add(rotateY(v, yaw), rootPos),
    toLocal = v => rotateY(sub(v, rootPos), -yaw);
  const pelvisMatrix = b.pelvis.matrix.clone(),
    invPelvis = pelvisMatrix.clone().invert();
  for (const limb of c.legs) {
    const side = limb.side,
      end = side > 0 ? '.L' : '.R',
      phase = (gait + (side < 0 ? 0.5 : 0)) % 1;
    const hip = new THREE.Vector3(side * l.hipX, 0, 0).applyMatrix4(pelvisMatrix).toArray();
    const neutral = [
      side * l.hipX,
      -l.restHeight + l.footHeight + 0.025 * l.scale,
      0.035 * l.scale,
    ];
    let target = [...neutral];
    if (preview) {
      if (moving) {
        const swing = phase > pose.stance,
          u = swing ? (phase - pose.stance) / (1 - pose.stance) : phase / pose.stance;
        const step = (swing ? -0.5 + smooth(u) : 0.5 - u) * (limping && side < 0 ? 0.58 : 1);
        target[2] += step * pose.stride * p.legs * l.scale;
        target[0] += step * pose.lateral * p.legs * l.scale;
        target[1] += swing ? Math.sin(u * Math.PI) * pose.lift * (nimble ? 1 : 0.75) * l.scale : 0;
      }
    } else {
      const desired = toWorld(neutral);
      desired[1] = groundHeight(desired[0], desired[2]) + l.footHeight + 0.025 * l.scale;
      if (!limb.step)
        limb.step = { foot: [...desired], start: [...desired], end: [...desired], swing: false };
      const step = limb.step,
        swing = moving && phase > pose.stance;
      if (!grounded) {
        const air = toWorld(neutral);
        air[1] += 0.22 * l.scale;
        step.foot = step.foot.map((v, i) => v + (air[i] - v) * Math.min(1, dt * 12));
      } else if (swing) {
        if (!step.swing) {
          step.start = [...step.foot];
          step.end = add(desired, rotateY([0, 0, (0.25 + speed * 0.06) * l.scale], yaw));
          step.end[1] = groundHeight(step.end[0], step.end[2]) + l.footHeight + 0.025 * l.scale;
        }
        const u = clamp((phase - pose.stance) / (1 - pose.stance), 0, 1);
        step.foot = step.start.map((v, i) => v + (step.end[i] - v) * smooth(u));
        step.foot[1] += Math.sin(u * Math.PI) * pose.lift * 0.85 * l.scale;
      } else if (!moving || distance(step.foot, toWorld(hip)) > (l.thigh + l.shin) * 1.02) {
        step.foot = step.foot.map((v, i) => v + (desired[i] - v) * Math.min(1, dt * 8));
      }
      step.swing = swing;
      target = toLocal(step.foot);
    }
    // Solve in pelvis space, then express the shin quaternion relative to thigh.
    const hipP = new THREE.Vector3().fromArray(hip).applyMatrix4(invPelvis).toArray(),
      targetP = new THREE.Vector3().fromArray(target).applyMatrix4(invPelvis).toArray();
    const solution = solveTwoBone(hipP, targetP, l.thigh, l.shin, [0, 0, 1]);
    const upperQ = new THREE.Quaternion().setFromUnitVectors(
      down,
      new THREE.Vector3().fromArray(sub(solution.knee, hipP)).normalize(),
    );
    const lowerQ = new THREE.Quaternion().setFromUnitVectors(
      down,
      new THREE.Vector3().fromArray(sub(solution.foot, solution.knee)).normalize(),
    );
    b['upperLeg' + end].quaternion.copy(upperQ);
    b['shin' + end].quaternion.copy(upperQ.clone().invert().multiply(lowerQ));
    b['foot' + end].quaternion.copy(b.pelvis.quaternion.clone().multiply(lowerQ).invert());
    if (action.mask === 'full')
      for (const joint of ['upperLeg', 'shin', 'foot']) {
        const key = joint + end;
        if (action.rotations[key])
          b[key].quaternion.slerp(quat(action.rotations[key]), actionWeight);
      }
    limb.error = solution.error;
  }
  const resolvedParts = c.parts.map(r => r.part);
  for (const finger of h.fingers)
    finger.group.rotation.x = finger.base - fingerCurl(action, resolvedParts, finger.side);
  pose.action = equipmentAction(config.action, action);
  const blinkTime = (t + gSeed(c) * 0.01) % 4.1,
    blink = blinkTime < 0.14 ? Math.sin((blinkTime / 0.14) * Math.PI) : 0;
  for (const eye of h.eyes) {
    eye.group.scale.y = Math.max(0.06, 1 - blink * pose.layers.blink);
    eye.iris.position.x = config.lookYaw * 0.018 * p.head * l.scale;
  }
  b.jaw.rotation.x = (action.jaw * actionWeight + pose.jaw * 0.025) * pose.layers.jaw;
  for (const part of c.parts) part.update?.(t, speed, pose);
  c.root.updateMatrixWorld(true);
  if (h.guides.visible) {
    const attr = h.guides.geometry.attributes.position;
    let i = 0;
    for (const desc of h.spec)
      if (desc.parent) {
        for (const name of [desc.parent, desc.name]) {
          const v = c.root.worldToLocal(b[name].getWorldPosition(new THREE.Vector3()));
          attr.setXYZ(i++, v.x, v.y, v.z);
        }
      }
    attr.needsUpdate = true;
  }
  h.pose = {
    action: config.action,
    phase: action.phase,
    finished: action.finished,
    mask: action.mask,
    weight: actionWeight,
  };
}
function gSeed(c) {
  return c.genome.seed % 113;
}
