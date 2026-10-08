import { FIELD_MOTION } from './field-motion.js';
import { BLOOM_MOTION } from './bloom-motion.js';
import { FRONTIER_MOTION } from './frontier-motion.js';
import {
  defaultHumanoidMotion,
  validateHumanoidMotion,
  blendHumanoidMotion,
} from './humanoid-motion.js';
import {
  defaultTravel,
  defaultBodyWave,
  validateTravel,
  validateBodyWave,
  blendTravel,
  blendBodyWave,
} from './travel.js';
import { clamp } from './math.js';
/** Pure motion recipes. These are scalar channels, not imported animation clips. */
export const MOTION_CLIPS = Object.freeze({
  ...FRONTIER_MOTION,
  ...BLOOM_MOTION,
  ...FIELD_MOTION,
  idle: {
    label: 'Idle',
    stepBank: 0,
    valve: 0,
    bloom: 0,
    reach: 0,
    pad: 0,
    sense: 0,
    comb: 0,
    pump: 0,
    spread: 0,
    spin: 0,
    fold: 0,
    scull: 0,
    wingRate: 1,
    wingOpen: 0.65,
    pulse: 0,
    paddle: 0,
    lateral: 0,
    rate: 0,
    stride: 0,
    lift: 0.1,
    stance: 0.66,
    bob: 0.012,
    sway: 0.012,
    pitch: 0,
    flap: 0,
    tail: 0.3,
    jaw: 0.02,
    tuck: 0,
  },
  walk: {
    label: 'Walk',
    rate: 1.05,
    stride: 0.62,
    lift: 0.26,
    stance: 0.62,
    bob: 0.045,
    sway: 0.035,
    pitch: 0,
    flap: 0.08,
    tail: 0.6,
    jaw: 0.04,
    tuck: 0,
  },
  run: {
    label: 'Run',
    rate: 2.2,
    stride: 1.04,
    lift: 0.39,
    stance: 0.5,
    bob: 0.09,
    sway: 0.04,
    pitch: 0.05,
    flap: 0.15,
    tail: 0.9,
    jaw: 0.08,
    tuck: 0,
  },
  creep: {
    label: 'Creep',
    rate: 0.65,
    stride: 0.45,
    lift: 0.13,
    stance: 0.76,
    bob: 0.018,
    sway: 0.06,
    pitch: 0.07,
    flap: 0,
    tail: 0.25,
    jaw: 0.02,
    tuck: 0.08,
  },
  bound: {
    label: 'Bound',
    rate: 1.4,
    stride: 0.75,
    lift: 0.55,
    stance: 0.44,
    bob: 0.14,
    sway: 0.01,
    pitch: 0.09,
    flap: 0.2,
    tail: 0.8,
    jaw: 0.03,
    tuck: 0,
  },
  swim: {
    label: 'Swim',
    rate: 0.8,
    stride: 0.2,
    lift: 0.18,
    stance: 0.5,
    bob: 0.035,
    sway: 0.13,
    pitch: 0.06,
    flap: 0.35,
    tail: 1.3,
    jaw: 0.04,
    tuck: 0.18,
  },
  hover: {
    label: 'Hover',
    rate: 0.65,
    stride: 0.12,
    lift: 0.13,
    stance: 0.5,
    bob: 0.085,
    sway: 0.025,
    pitch: -0.04,
    flap: 1.2,
    tail: 0.7,
    jaw: 0.02,
    tuck: 0.28,
  },
  backpedal: {
    label: 'Backpedal',
    rate: 0.85,
    stride: -0.48,
    lateral: 0,
    lift: 0.18,
    stance: 0.68,
    bob: 0.035,
    sway: 0.03,
    pitch: -0.03,
    flap: 0.05,
    tail: 0.5,
    jaw: 0.02,
    tuck: 0.02,
  },
  strafe: {
    label: 'Side step',
    rate: 0.95,
    stride: 0,
    lateral: 0.5,
    lift: 0.22,
    stance: 0.64,
    bob: 0.035,
    sway: 0.05,
    pitch: 0,
    flap: 0.06,
    tail: 0.5,
    jaw: 0.02,
    tuck: 0.02,
  },
  prowl: {
    label: 'Prowl',
    rate: 0.58,
    stride: 0.4,
    lift: 0.11,
    stance: 0.8,
    bob: 0.018,
    sway: 0.07,
    pitch: 0.12,
    flap: 0,
    tail: 0.3,
    jaw: 0.03,
    tuck: 0.17,
  },
  trot: {
    label: 'Trot',
    rate: 1.6,
    stride: 0.74,
    lift: 0.31,
    stance: 0.55,
    bob: 0.068,
    sway: 0.03,
    pitch: 0.03,
    flap: 0.14,
    tail: 0.75,
    jaw: 0.05,
    tuck: 0,
  },
  cruise: {
    label: 'Swim cruise',
    rate: 1.2,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.015,
    sway: 0.015,
    pitch: 0,
    flap: 0.22,
    tail: 1.5,
    jaw: 0.02,
    tuck: 0.2,
    wingRate: 1,
    wingOpen: 0.9,
    pulse: 0,
    paddle: 0.3,
  },
  undulate: {
    label: 'Eel wave',
    rate: 0.7,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0,
    sway: 0.01,
    pitch: 0,
    flap: 0.25,
    tail: 1.7,
    jaw: 0.02,
    tuck: 0.25,
    wingRate: 0.8,
    wingOpen: 1,
    pulse: 0,
    paddle: 0.1,
  },
  jet: {
    label: 'Jet pulse',
    rate: 0.8,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.04,
    sway: 0.012,
    pitch: 0,
    flap: 0.2,
    tail: 0.5,
    jaw: 0.18,
    tuck: 0.2,
    wingRate: 0.8,
    wingOpen: 0.7,
    pulse: 1,
    paddle: 0,
  },
  row: {
    label: 'Paddle stroke',
    rate: 0.65,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.015,
    sway: 0.022,
    pitch: 0,
    flap: 0.22,
    tail: 0.5,
    jaw: 0.02,
    tuck: 0.15,
    wingRate: 0.85,
    wingOpen: 1,
    pulse: 0,
    paddle: 1,
  },
  soar: {
    label: 'Soar',
    rate: 0.25,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.03,
    sway: 0.035,
    pitch: -0.03,
    flap: 0.12,
    tail: 0.3,
    jaw: 0.01,
    tuck: 0.3,
    wingRate: 0.45,
    wingOpen: 1,
    pulse: 0,
    paddle: 0,
  },
  powerflight: {
    label: 'Power flight',
    rate: 1.3,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.08,
    sway: 0.025,
    pitch: -0.07,
    flap: 1,
    tail: 0.8,
    jaw: 0.01,
    tuck: 0.4,
    wingRate: 1.45,
    wingOpen: 1,
    pulse: 0,
    paddle: 0,
  },
  flutter: {
    label: 'Flutter',
    rate: 1.8,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.025,
    sway: 0.02,
    pitch: -0.025,
    flap: 1.3,
    tail: 0.4,
    jaw: 0.01,
    tuck: 0.35,
    wingRate: 4.5,
    wingOpen: 1,
    pulse: 0,
    paddle: 0,
  },
  float: {
    label: 'Float',
    rate: 0.25,
    stride: 0,
    lift: 0,
    stance: 0.6,
    bob: 0.1,
    sway: 0.025,
    pitch: 0,
    flap: 0.1,
    tail: 0.45,
    jaw: 0.02,
    tuck: 0.15,
    wingRate: 0.5,
    wingOpen: 0.9,
    pulse: 0.25,
    paddle: 0,
  },
  display: {
    label: 'Display',
    rate: 0.28,
    stride: 0.1,
    lift: 0.08,
    stance: 0.8,
    bob: 0.035,
    sway: 0.055,
    pitch: -0.08,
    flap: 0.5,
    tail: 0.85,
    jaw: 0.65,
    tuck: 0,
  },
});
export const MOTION_LAYERS = {
  breath: 'Breathing',
  blink: 'Blinking',
  gaze: 'Gaze',
  tail: 'Tail wave',
  flex: 'Soft-part flex',
  jaw: 'Jaw motion',
};
export function defaultMotion(clip = 'idle') {
  return {
    travel: defaultTravel(),
    bodyWave: defaultBodyWave(),
    humanoid: defaultHumanoidMotion(),
    weights: Object.fromEntries(Object.keys(MOTION_CLIPS).map(k => [k, k === clip ? 1 : 0])),
    layers: { breath: 1, blink: 1, gaze: 1, tail: 1, flex: 1, jaw: 1 },
    tempo: 1,
    stride: 1,
    lift: 1,
    phaseLag: 0.5,
  };
}
export function validateMotion(raw = defaultMotion()) {
  if (!raw || typeof raw !== 'object')
    throw new Error('Invalid blueprint: motion must be an object.');
  for (const group of ['weights', 'layers'])
    if (
      raw[group] !== undefined &&
      (!raw[group] || typeof raw[group] !== 'object' || Array.isArray(raw[group]))
    )
      throw new Error('Invalid blueprint: motion ' + group + ' must be an object.');
  const fallback = defaultMotion(),
    out = { weights: {}, layers: {} };
  const n = (v, d, lo, hi, label) => {
    v = v === undefined ? d : v;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi)
      throw new Error(`Invalid blueprint: ${label} must be between ${lo} and ${hi}.`);
    return v;
  };
  for (const k of Object.keys(MOTION_CLIPS))
    out.weights[k] = n(raw.weights?.[k], fallback.weights[k], 0, 1, 'motion weight');
  for (const k of Object.keys(MOTION_LAYERS))
    out.layers[k] = n(raw.layers?.[k], 1, 0, 2, 'motion layer');
  for (const [k, lo, hi] of [
    ['tempo', 0.1, 3],
    ['stride', 0.1, 2],
    ['lift', 0.1, 2],
    ['phaseLag', 0, 1],
  ])
    out[k] = n(raw[k], fallback[k], lo, hi, k);
  out.travel = validateTravel(raw.travel);
  out.bodyWave = validateBodyWave(raw.bodyWave);
  out.humanoid = validateHumanoidMotion(raw.humanoid);
  return out;
}
export function blendMotion(a, b, t) {
  const out = defaultMotion();
  for (const group of ['weights', 'layers'])
    for (const k of Object.keys(out[group]))
      out[group][k] = a[group][k] + (b[group][k] - a[group][k]) * t;
  for (const k of ['tempo', 'stride', 'lift', 'phaseLag']) out[k] = a[k] + (b[k] - a[k]) * t;
  out.travel = blendTravel(a.travel ?? defaultTravel(), b.travel ?? defaultTravel(), t);
  out.bodyWave = blendBodyWave(a.bodyWave ?? defaultBodyWave(), b.bodyWave ?? defaultBodyWave(), t);
  out.humanoid = blendHumanoidMotion(a.humanoid, b.humanoid, t);
  return out;
}
/** Normalize state weights once. Secondary layers remain additive and independent. */
export function sampleMotion(motion, { speed = 0, preview = true, walking } = {}) {
  const m = motion || defaultMotion();
  let weights = { ...m.weights };
  if (walking !== undefined) weights = defaultMotion(walking ? 'walk' : 'idle').weights;
  if (!preview && speed > 0.12 && (!m.travel || m.travel.medium === 'ground')) {
    const fast = clamp((speed - 2) / 3, 0, 1);
    weights = {
      ...weights,
      idle: 0,
      walk: Math.max(weights.walk, 1 - fast),
      run: Math.max(weights.run, fast),
    };
  }
  let sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum < 1e-8) {
    weights = { idle: 1 };
    sum = 1;
  }
  const out = {};
  for (const k of Object.keys(MOTION_CLIPS.idle)) if (k !== 'label') out[k] = 0;
  for (const [key, weight] of Object.entries(weights))
    for (const k of Object.keys(out)) out[k] += ((MOTION_CLIPS[key][k] ?? 0) * weight) / sum;
  if (!preview && speed <= 0.12 && (!m.travel || m.travel.medium === 'ground')) {
    out.rate = 0;
    out.stride = 0;
    out.bob = 0.012;
  }
  out.rate *= m.tempo;
  out.stride *= m.stride;
  out.lateral *= m.stride;
  out.lift *= m.lift;
  out.phaseLag = m.phaseLag;
  out.layers = m.layers;
  return out;
}
