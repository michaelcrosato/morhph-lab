import { bowPull } from './equipment-pose.js';
import { TAU } from './math.js';
const clip = (label, values) => ({
  label,
  rate: 0,
  stride: 0,
  lateral: 0,
  lift: 0.08,
  stance: 0.7,
  bob: 0.014,
  sway: 0.012,
  pitch: 0,
  flap: 0,
  tail: 0.3,
  jaw: 0.04,
  tuck: 0,
  wingRate: 1,
  wingOpen: 1,
  pulse: 0,
  paddle: 0,
  stepBank: 0,
  sense: 0,
  ...values,
});
export const FIELD_MOTION = Object.freeze({
  animalamble: clip('Animal amble', {
    rate: 0.9,
    stride: 0.65,
    lift: 0.2,
    stance: 0.68,
    bob: 0.035,
    tail: 0.75,
    stepBank: 1,
  }),
  animalsniff: clip('Animal sniff', {
    rate: 0,
    pitch: 0.16,
    bob: 0.025,
    tail: 0.25,
    jaw: 0.18,
    sense: 1,
  }),
  animalbound: clip('Animal bound', {
    rate: 1.3,
    stride: 0.85,
    lift: 0.35,
    stance: 0.42,
    bob: 0.08,
    tail: 0.85,
    stepBank: 1.2,
  }),
});
export const FIELD_ACTIONS = Object.freeze({
  readbook: {
    label: 'Read book',
    duration: 3.6,
    mask: 'upper',
    loop: true,
    events: [{ at: 0.6, name: 'page-cue' }],
  },
  writenote: { label: 'Write note', duration: 3.0, mask: 'upper', loop: true, events: [] },
  lamplook: { label: 'Inspect with lamp', duration: 3.2, mask: 'upper', loop: true, events: [] },
  bowdraw: {
    label: 'Draw bow',
    duration: 2.8,
    mask: 'upper',
    loop: true,
    events: [{ at: 0.76, name: 'release-cue' }],
  },
  offer: {
    label: 'Offer item',
    duration: 2.6,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.58, name: 'offer-cue' }],
  },
  restlean: { label: 'Rest hands on hips', duration: 3.4, mask: 'upper', loop: true, events: [] },
});
/** Absolute pose targets. Props stay on one socket; no two-hand constraint or item transfer. */
export function applyFieldAction(name, pose, t) {
  const r = (id, x = 0, y = 0, z = 0) => {
      pose.rotations[id] = [x, y, z];
    },
    v = Math.sin(t * TAU);
  switch (name) {
    case 'readbook':
      r('upperArm.L', -0.65, 0, 0.12);
      r('forearm.L', -1.38);
      r('hand.L', 0.1, 0, -0.2);
      r('upperArm.R', -0.72, 0, -0.08);
      r('forearm.R', -1.35);
      r('hand.R', 0, 0, 0.22);
      r('head', 0.28, v * 0.05);
      pose.handCurl = 0.22;
      break;
    case 'writenote':
      r('upperArm.L', -0.66, 0, 0.12);
      r('forearm.L', -1.45);
      r('hand.L', 0.1, 0, -0.15);
      r('upperArm.R', -0.82, 0, 0.15);
      r('forearm.R', -1.1 + Math.sin(t * TAU * 4) * 0.06);
      r('hand.R', 0, v * 0.12, 0.22);
      r('head', 0.28);
      pose.handCurl = 0.6;
      break;
    case 'lamplook':
      r('upperArm.R', -1.15, -0.25, -0.15);
      r('forearm.R', -0.62);
      r('hand.R', -0.25);
      r('head', -0.03, -0.22 + v * 0.14);
      r('upperArm.L', -0.2, 0, 0.1);
      pose.handCurl = 0.8;
      break;
    case 'bowdraw': {
      const pull = bowPull(t);
      r('chest', 0, -0.3);
      r('upperArm.L', -1.42, 0.06, 0.05);
      r('forearm.L', -0.06);
      r('upperArm.R', -0.9, -0.75 * pull, -0.3);
      r('forearm.R', -0.2 - 1.65 * pull);
      r('head', -0.06, -0.3);
      pose.handCurl = 0.8;
      break;
    }
    case 'offer': {
      const reach = Math.sin(t * Math.PI);
      r('upperArm.R', -0.45 - 0.65 * reach, 0, -0.12);
      r('forearm.R', -0.6 + 0.25 * reach);
      r('hand.R', 0, 0, 0.3);
      r('head', 0.07);
      pose.handCurl = 0.18;
      break;
    }
    case 'restlean':
      r('upperArm.L', 0.1, 0, 0.45);
      r('upperArm.R', 0.1, 0, -0.45);
      r('forearm.L', -0.8, 0, -0.35);
      r('forearm.R', -0.8, 0, 0.35);
      r('head', 0, v * 0.08);
      pose.handCurl = 0.35;
      break;
  }
}
