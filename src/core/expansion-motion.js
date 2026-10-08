import { clamp, smooth, TAU } from './math.js';
/** Author actions as pose functions. All samples are absolute, so scrubbing is safe. */
export const EXPANSION_ACTIONS = Object.freeze({
  bow: { label: 'Bow', duration: 2.4, mask: 'upper', loop: false, events: [] },
  kneel: { label: 'Kneel', duration: 2.2, mask: 'full', loop: false, hold: true, events: [] },
  pray: { label: 'Pray', duration: 3.2, mask: 'upper', loop: true, events: [] },
  inspect: { label: 'Inspect hand', duration: 3, mask: 'upper', loop: true, events: [] },
  interact: {
    label: 'Reach / use',
    duration: 2.1,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.55, name: 'interact-contact' }],
  },
  carry: { label: 'Carry', duration: 2.4, mask: 'upper', loop: true, events: [] },
  push: {
    label: 'Push',
    duration: 2.2,
    mask: 'upper',
    loop: true,
    events: [{ at: 0.55, name: 'push-contact' }],
  },
  work: {
    label: 'Work strike',
    duration: 1.6,
    mask: 'upper',
    loop: true,
    events: [{ at: 0.56, name: 'work-contact' }],
  },
  thrust: {
    label: 'Thrust',
    duration: 1,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.5, name: 'attack-contact' }],
  },
  kick: {
    label: 'Kick',
    duration: 1.25,
    mask: 'full',
    loop: false,
    events: [{ at: 0.5, name: 'attack-contact' }],
  },
  dodge: {
    label: 'Dodge pose',
    duration: 1,
    mask: 'full',
    loop: false,
    events: [{ at: 0.3, name: 'dodge-peak' }],
  },
  roar: {
    label: 'Roar',
    duration: 2.5,
    mask: 'upper',
    loop: false,
    events: [{ at: 0.42, name: 'voice-cue' }],
  },
});
export function applyExpansionAction(name, pose, t) {
  const r = (name, x = 0, y = 0, z = 0) => {
    pose.rotations[name] = [x, y, z];
  };
  const v = Math.sin(t * TAU),
    pulse = Math.sin(Math.PI * t),
    reach = smooth(clamp((t - 0.15) / 0.4, 0, 1));
  switch (name) {
    case 'bow':
      r('spine', 0.44 * pulse);
      r('chest', 0.35 * pulse);
      r('head', 0.27 * pulse);
      r('upperArm.L', -0.16, 0, 0.07);
      r('upperArm.R', -0.2, 0, -0.07);
      r('forearm.R', -0.95);
      break;
    case 'kneel':
      r('upperLeg.L', -1.52);
      r('shin.L', 1.52);
      r('foot.L', 0);
      r('upperLeg.R', 0.05);
      r('shin.R', 2.4);
      r('foot.R', -1.0);
      r('chest', 0.14);
      r('head', 0.2);
      r('forearm.L', -0.85);
      r('forearm.R', -0.7);
      pose.pelvisOffset[1] = -0.42;
      break;
    case 'pray':
      r('upperArm.L', -0.85, 0, -0.18);
      r('upperArm.R', -0.85, 0, 0.18);
      r('forearm.L', -1.6, 0, -0.3);
      r('forearm.R', -1.6, 0, 0.3);
      r('hand.L', 0, 0, 0.24);
      r('hand.R', 0, 0, -0.24);
      r('head', 0.25);
      break;
    case 'inspect':
      r('upperArm.L', -0.78, 0, 0.1);
      r('forearm.L', -1.75, 0.25, 0);
      r('hand.L', 0, v * 0.38, -0.3);
      r('head', 0.22, 0.18, 0);
      r('upperArm.R', -0.15);
      pose.handCurl = 0.18;
      break;
    case 'interact':
      r('upperArm.R', -0.5 - 0.85 * reach, 0, -0.14);
      r('forearm.R', -0.8 + 0.65 * reach);
      r('hand.R', -0.2);
      r('chest', 0.08, -0.1, 0);
      pose.handCurl = 0.35 * reach;
      break;
    case 'carry':
      for (const [end, side] of [
        ['L', 1],
        ['R', -1],
      ]) {
        r('upperArm.' + end, -0.38, 0, side * 0.18);
        r('forearm.' + end, -1.6);
        r('hand.' + end, 0, side * 0.25, 0);
      }
      r('chest', -0.04);
      pose.handCurl = 0.4;
      break;
    case 'push':
      for (const [end, side] of [
        ['L', 1],
        ['R', -1],
      ]) {
        r('upperArm.' + end, -1.35 - v * 0.08, 0, side * 0.12);
        r('forearm.' + end, -0.35 + v * 0.14);
        r('hand.' + end, 0.9);
      }
      r('spine', 0.2);
      break;
    case 'work': {
      const strike = smooth(clamp((t - 0.28) / 0.28, 0, 1));
      r('upperArm.R', -2.25 + strike * 1.3, 0, -0.14);
      r('forearm.R', -1.45 + strike * 0.95);
      r('chest', strike * 0.16);
      r('upperArm.L', -0.4);
      r('forearm.L', -0.95);
      pose.handCurl = 1;
      break;
    }
    case 'thrust': {
      const thrust = Math.sin(Math.PI * clamp((t - 0.18) / 0.64, 0, 1));
      r('upperArm.R', -0.6 - thrust * 0.95, -0.2, 0);
      r('forearm.R', -1.55 + thrust * 1.5);
      r('chest', 0.04, -0.2 - thrust * 0.17, 0);
      r('upperArm.L', -0.45, 0, 0.2);
      r('forearm.L', -1.2);
      pose.handCurl = 1;
      break;
    }
    case 'kick': {
      const extend = Math.sin(Math.PI * clamp((t - 0.15) / 0.65, 0, 1));
      r('upperLeg.R', -1.45 * extend);
      r('shin.R', 0.95 * (1 - extend));
      r('foot.R', -0.16);
      r('upperLeg.L', 0.1);
      r('shin.L', 0.1);
      r('foot.L', -0.2);
      r('chest', -0.22 * extend);
      r('upperArm.L', -0.6, 0, 0.5);
      r('upperArm.R', -0.6, 0, -0.5);
      r('forearm.L', -1);
      r('forearm.R', -1);
      pose.handCurl = 0.85;
      break;
    }
    case 'dodge':
      r('pelvis', 0, 0, -0.15 * pulse);
      r('chest', 0.2, 0, -0.3 * pulse);
      r('upperLeg.L', -0.6);
      r('upperLeg.R', -0.9);
      r('shin.L', 1.0);
      r('shin.R', 1.3);
      r('foot.L', -0.4);
      r('foot.R', -0.4);
      r('upperArm.L', -0.8, 0, 0.4);
      r('upperArm.R', -0.8, 0, -0.4);
      r('forearm.L', -1.3);
      r('forearm.R', -1.3);
      pose.pelvisOffset = [0.3 * pulse, -0.2 * pulse, 0];
      break;
    case 'roar':
      r('chest', -0.15 * pulse);
      r('head', -0.25 * pulse);
      r('upperArm.L', -0.3, 0, 0.65);
      r('upperArm.R', -0.3, 0, -0.65);
      r('forearm.L', -0.55);
      r('forearm.R', -0.55);
      pose.jaw = 0.5 * pulse;
      pose.handCurl = 0.7;
      break;
  }
}
