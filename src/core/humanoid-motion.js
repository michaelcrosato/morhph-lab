import { FIELD_ACTIONS, applyFieldAction } from './field-motion.js';
import { BLOOM_ACTIONS, applyBloomAction } from './bloom-motion.js';
import { EXPANSION_ACTIONS, applyExpansionAction } from './expansion-motion.js';
import { clamp, smooth, TAU } from './math.js';

export const HUMANOID_STYLES = Object.freeze([
  'neutral',
  'heavy',
  'skulking',
  'stiff',
  'proud',
  'nimble',
  'limping',
]);
export const HUMANOID_ACTIONS = Object.freeze({
  none: { label: 'No action', duration: 1, mask: 'upper', loop: true, events: [] },
  wave: { label: 'Wave', duration: 2.4, mask: 'upper', loop: true, events: [] },
  point: { label: 'Point', duration: 2.2, mask: 'upper', loop: true, events: [] },
  talk: { label: 'Talk', duration: 3.1, mask: 'upper', loop: true, events: [] },
  guard: { label: 'Guard', duration: 2, mask: 'upper', loop: true, events: [] },
  attack: {
    label: 'Melee swing',
    duration: 1.1,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.52, name: 'attack-contact' }],
  },
  cast: {
    label: 'Cast',
    duration: 2,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.68, name: 'cast-release' }],
  },
  hit: { label: 'Hit reaction', duration: 0.7, mask: 'full', loop: false, events: [] },
  jump: {
    label: 'Jump pose',
    duration: 1.2,
    mask: 'full',
    loop: false,
    events: [
      { at: 0.18, name: 'takeoff' },
      { at: 0.82, name: 'land' },
    ],
  },
  sit: { label: 'Sit', duration: 1.8, mask: 'full', loop: false, hold: true, events: [] },
  defeat: { label: 'Defeat', duration: 2.1, mask: 'full', loop: false, hold: true, events: [] },
  celebrate: { label: 'Celebrate', duration: 2.8, mask: 'upper', loop: true, events: [] },
  ...EXPANSION_ACTIONS,
  ...BLOOM_ACTIONS,
  ...FIELD_ACTIONS,
});
export const HUMAN_MOTION_RANGES = {
  armSwing: [0, 2],
  lookYaw: [-0.8, 0.8],
  lookPitch: [-0.5, 0.5],
  actionWeight: [0, 1],
  actionSpeed: [0.25, 2],
};
export function defaultHumanoidMotion() {
  return {
    style: 'neutral',
    armSwing: 1,
    lookYaw: 0,
    lookPitch: 0,
    action: 'none',
    actionWeight: 1,
    actionSpeed: 1,
    repeat: true,
    mask: 'auto',
  };
}
export function validateHumanoidMotion(raw = defaultHumanoidMotion()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Invalid blueprint: humanoid motion must be an object.');
  const out = defaultHumanoidMotion();
  for (const [key, values] of [
    ['style', HUMANOID_STYLES],
    ['action', Object.keys(HUMANOID_ACTIONS)],
    ['mask', ['auto', 'upper', 'full']],
  ]) {
    const v = raw[key] ?? out[key];
    if (!values.includes(v)) throw new Error('Invalid blueprint: unknown humanoid ' + key + '.');
    out[key] = v;
  }
  for (const [key, [min, max]] of Object.entries(HUMAN_MOTION_RANGES)) {
    const v = raw[key] ?? out[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
      throw new Error('Invalid blueprint: humanoid ' + key + ' is out of range.');
    out[key] = v;
  }
  if (raw.repeat !== undefined && typeof raw.repeat !== 'boolean')
    throw new Error('Invalid blueprint: action repeat must be true or false.');
  out.repeat = raw.repeat ?? true;
  return out;
}
export function blendHumanoidMotion(a, b, t) {
  a = validateHumanoidMotion(a);
  b = validateHumanoidMotion(b);
  const out = structuredClone(t < 0.5 ? a : b);
  for (const key of Object.keys(HUMAN_MOTION_RANGES)) out[key] = a[key] + (b[key] - a[key]) * t;
  return out;
}
export function actionPhase(config, time) {
  const def = HUMANOID_ACTIONS[config.action],
    elapsed = Math.max(0, time) * config.actionSpeed;
  const cycles = elapsed / def.duration,
    loop = config.repeat;
  return {
    phase: loop ? cycles % 1 : clamp(cycles, 0, 1),
    finished: !loop && cycles >= 1,
    def,
    cycles,
  };
}
/** Pure, deterministic action layer. The pose is sampled, not accumulated. */
export function sampleHumanoidAction(config, time) {
  const { phase: t, finished, def } = actionPhase(config, time),
    v = Math.sin(t * TAU),
    ease = smooth(clamp(t / 0.2, 0, 1));
  const fade = def.hold ? ease : ease * (1 - smooth(clamp((t - 0.8) / 0.2, 0, 1)));
  const w = config.action === 'none' ? 0 : config.actionWeight * (finished && !def.hold ? 0 : fade);
  const pose = {
    rotations: {},
    pelvisOffset: [0, 0, 0],
    weight: w,
    mask: config.mask === 'auto' ? def.mask : config.mask,
    phase: t,
    finished,
    handCurl: 0,
    jaw: 0,
  };
  const r = (name, x = 0, y = 0, z = 0) => {
    pose.rotations[name] = [x, y, z];
  };
  switch (config.action) {
    case 'wave':
      r('upperArm.R', -0.35, 0, -2.1);
      r('forearm.R', -0.35 - v * 0.35, 0, -0.65);
      r('hand.R', 0, 0, v * 0.28);
      r('head', 0, -0.13, 0);
      break;
    case 'point':
      r('upperArm.R', -1.42, -0.1, -0.14);
      r('forearm.R', -0.08);
      r('head', 0, -0.23, 0);
      pose.handCurl = 0.62;
      break;
    case 'talk':
      r('upperArm.L', -0.4 - v * 0.18, 0, 0.26);
      r('upperArm.R', -0.35 + v * 0.22, 0, -0.22);
      r('forearm.L', -0.9 - v * 0.22);
      r('forearm.R', -0.8 + v * 0.15);
      r('head', v * 0.035, Math.sin(t * TAU * 0.5) * 0.12, 0);
      pose.jaw = (0.5 + 0.5 * Math.sin(t * TAU * 7)) * 0.16;
      break;
    case 'guard':
      r('upperArm.L', -0.72, 0, 0.3);
      r('upperArm.R', -0.8, 0, -0.3);
      r('forearm.L', -1.65);
      r('forearm.R', -1.55);
      r('chest', 0.1, 0, 0);
      pose.handCurl = 1;
      break;
    case 'attack': {
      const sweep = smooth(clamp((t - 0.28) / 0.32, 0, 1));
      r('chest', 0.08, 0.55 - sweep * 0.95, 0);
      r('upperArm.R', -0.8 - sweep * 0.9, -0.5 + sweep * 1.2, -0.7 + sweep * 0.4);
      r('forearm.R', -1.3 + sweep * 1.2);
      r('upperArm.L', -0.65, 0, 0.2);
      r('forearm.L', -1.1);
      pose.handCurl = 1;
      break;
    }
    case 'cast':
      r('upperArm.L', -1.25 - 0.35 * Math.sin(t * Math.PI), 0, 0.3);
      r('upperArm.R', -1.25 - 0.35 * Math.sin(t * Math.PI), 0, -0.3);
      r('forearm.L', -0.3);
      r('forearm.R', -0.3);
      r('hand.L', -0.35);
      r('hand.R', -0.35);
      r('head', -0.13);
      break;
    case 'hit':
      r('chest', -0.33 * Math.sin(t * Math.PI), 0, -0.14);
      r('head', -0.18);
      r('upperArm.L', 0.2, 0, 0.45);
      r('upperArm.R', 0.2, 0, -0.45);
      break;
    case 'jump':
      r('upperArm.L', -1.8, 0, 0.2);
      r('upperArm.R', -1.8, 0, -0.2);
      r('upperLeg.L', -0.55);
      r('upperLeg.R', -0.55);
      r('shin.L', 0.9);
      r('shin.R', 0.9);
      r('foot.L', -0.35);
      r('foot.R', -0.35);
      pose.pelvisOffset[1] = Math.sin(Math.PI * t) * 0.22;
      break;
    case 'sit':
      r('upperLeg.L', -1.48, 0, 0.07);
      r('upperLeg.R', -1.48, 0, -0.07);
      r('shin.L', 1.48);
      r('shin.R', 1.48);
      r('foot.L', 0);
      r('foot.R', 0);
      r('upperArm.L', -0.3);
      r('upperArm.R', -0.3);
      r('forearm.L', -0.95);
      r('forearm.R', -0.95);
      pose.pelvisOffset[1] = -0.4;
      break;
    case 'defeat':
      r('pelvis', 0, 0, 1.5);
      r('chest', 0.18);
      r('head', 0.28);
      r('upperArm.L', -0.1, 0, 0.38);
      r('upperArm.R', -0.1, 0, -0.35);
      r('upperLeg.L', 0);
      r('shin.L', 0);
      r('foot.L', 0);
      r('upperLeg.R', -0.32);
      r('shin.R', 0.58);
      r('foot.R', -0.26);
      pose.pelvisOffset = [0.38, -0.82, 0];
      break;
    case 'celebrate':
      r('upperArm.L', -0.22, 0, 2.35 + v * 0.14);
      r('upperArm.R', -0.22, 0, -2.35 - v * 0.14);
      r('forearm.L', -0.48);
      r('forearm.R', -0.48);
      r('head', -0.2);
      break;
  }
  applyExpansionAction(config.action, pose, t);
  applyBloomAction(config.action, pose, t);
  applyFieldAction(config.action, pose, t);
  if (pose.mask === 'upper') {
    for (const key of Object.keys(pose.rotations))
      if (/^(pelvis|upperLeg|shin|foot)/.test(key)) delete pose.rotations[key];
    pose.pelvisOffset = [0, 0, 0];
  }
  return pose;
}
/** Collect semantic markers crossed in (previous, current]. Seeking emits none.
 * The caller owns damage, effects, audio, and movement. This has no combat code. */
export function collectActionEvents(config, previous, current, { seek = false } = {}) {
  if (
    seek ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current) ||
    current <= previous ||
    config.actionWeight === 0
  )
    return [];
  const def = HUMANOID_ACTIONS[config.action],
    duration = def.duration / config.actionSpeed,
    out = [];
  if (!def.events.length) return out;
  const first = Math.max(0, Math.floor(previous / duration)),
    last = config.repeat ? Math.floor(current / duration) : 0;
  // Bound work after a long frame, without producing duplicate markers.
  for (let cycle = Math.max(first, last - 32); cycle <= last; cycle++)
    for (const event of def.events) {
      const at = (cycle + event.at) * duration;
      if (at > previous && at <= current)
        out.push({ name: event.name, time: at, action: config.action, cycle });
    }
  return out;
}

/** Local visual offset in metres. Sitting height derives from leg lengths.
 * This changes bones only. It never changes the physics body transform. */
export function humanoidActionOffset(config, pose, layout) {
  if (pose.mask !== 'full') return [0, 0, 0];
  const offset = [
    pose.pelvisOffset[0] * layout.scale,
    pose.pelvisOffset[1] * layout.restHeight,
    pose.pelvisOffset[2] * layout.scale,
  ];
  if (config.action === 'sit' || config.action === 'kneel') {
    // The foot mesh sole is below its ankle by footHeight + 0.025 * scale.
    // Both knees bend 1.48 radians. The shins remain approximately vertical.
    const thighAngle = config.action === 'kneel' ? 1.52 : 1.48,
      sideAngle = config.action === 'kneel' ? 0 : 0.07;
    const seatedHeight =
      (layout.thigh * Math.cos(thighAngle) + layout.shin) * Math.cos(sideAngle) +
      layout.footHeight +
      0.025 * layout.scale;
    offset[1] = seatedHeight - layout.restHeight;
  }
  return offset;
}
