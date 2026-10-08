import { basePreset, createPart, validateGenome } from './genome.js';
import { defaultRig, syncHumanoidBody } from './humanoid.js';
import { defaultActor } from './actors.js';
import { defaultMotion } from './motion.js';
import { BLOOM_MODELS } from './bloom-catalog.js';
import { SURFACE_PRESETS } from './surfaces.js';
import { HUMANOID_ACTIONS } from './humanoid-motion.js';
/** Each model is an editable recipe. No baked model is required. */
export function bloomPreset(id, seed = 8108) {
  const def = BLOOM_MODELS.find(m => m.id === id);
  if (!def) throw new Error('Unknown Carapace & Bloom model.');
  const g = basePreset('sprout', seed);
  g.name = def.label;
  g.parts = [];
  const node = (id, radii, parent = null, offset = [0, 0, 0]) => ({ id, radii, parent, offset });
  const add = (
    type,
    host,
    anchor,
    size = 1,
    length = 1,
    variant = 0,
    mirror = false,
    more = {},
  ) => {
    const p = createPart(g, type, host, anchor, mirror);
    Object.assign(p, { size, length, variant, ...more });
    g.parts.push(p);
    return p;
  };
  const eyes = (host = 'head', size = 0.5) => add('optic', host, [1, 0.25, 0.7], size, 1, 0, true);
  const skin = (color, accent, id) => {
    Object.assign(g.appearance, SURFACE_PRESETS[id], {
      color,
      accent,
      patternScale: 3.5,
      strength: 0.7,
      warp: 0.16,
    });
    delete g.appearance.label;
  };
  const motion = (clip, kind = 'rigid', amplitude = 0.12) => {
    g.motion = defaultMotion(clip);
    g.motion.travel.medium = def.medium;
    Object.assign(g.motion.bodyWave, { kind, amplitude, frequency: 0.55, wavelength: 3.5 });
  };
  const human = (proportions, role, action) => {
    g.rig = defaultRig('humanoid');
    g.rig.bodyStyle = 'defined';
    Object.assign(g.rig.proportions, proportions);
    syncHumanoidBody(g);
    g.actor = defaultActor(role);
    motion('idle');
    g.motion.humanoid.action = action;
    g.motion.humanoid.repeat = HUMANOID_ACTIONS[action].loop;
  };
  switch (id) {
    case 'pebbleroller':
      g.nodes = [
        node('core', [0.63, 0.42, 0.94]),
        node('head', [0.4, 0.3, 0.42], 'core', [0, -0.04, 0.66]),
      ];
      skin('#6c7968', '#d7c692', 'scutearmor');
      motion('ripplewalk');
      add('plateband', 'core', [0, 1, 0], 0.96, 1.0, 1);
      add('legbank', 'core', [1, -0.65, 0], 0.72, 1.15, 2, true);
      add('irismouth', 'head', [0, 0, 1], 0.4, 0.6, 1);
      eyes();
      break;
    case 'mossstrider':
      g.nodes = [
        node('core', [0.4, 0.48, 0.88]),
        node('neck', [0.28, 0.55, 0.32], 'core', [0, 0.38, 0.54]),
        node('head', [0.3, 0.36, 0.37], 'neck', [0, 0.4, 0.13]),
      ];
      skin('#647d51', '#c9d39b', 'saddlehide');
      motion('ripplewalk');
      add('legbank', 'core', [1, -0.8, 0], 1.15, 1.55, 0, true);
      add('whiskerfan', 'head', [1, 0.4, 0.5], 0.48, 0.85, 0, true);
      add('plateband', 'core', [0, 1, -0.25], 0.65, 0.8, 0);
      eyes('head', 0.43);
      break;
    case 'crowngrazer':
      g.nodes = [
        node('core', [0.52, 0.55, 0.73]),
        node('head', [0.33, 0.44, 0.36], 'core', [0, 0.47, 0.12]),
      ];
      skin('#66734f', '#e8b58c', 'petalwax');
      motion('ripplewalk');
      g.motion.weights.bloomcycle = 0.65;
      add('petalcrown', 'head', [0, 1, 0], 0.94, 1.2, 1);
      add('legbank', 'core', [1, -0.7, 0], 0.76, 1.3, 0, true);
      add('irismouth', 'head', [0, 0.05, 1], 0.4, 0.7, 0);
      eyes('head', 0.38);
      break;
    case 'duneauger':
      g.nodes = [
        node('core', [0.403, 0.363, 0.583]),
        node('head', [0.42, 0.4, 0.42], 'core', [0, 0, 0.46]),
        node('tail1', [0.34, 0.32, 0.57], 'core', [0, 0, -0.5]),
        node('tail2', [0.27, 0.27, 0.46], 'tail1', [0, 0, -0.47]),
      ];
      skin('#ae865d', '#e2cfa7', 'growthshell');
      motion('padcrawl', 'lateral', 0.13);
      g.motion.weights.siphonreach = 0.7;
      add('plateband', 'core', [0, 1, -0.3], 0.65, 0.8, 2);
      for (const [i, host] of ['core', 'tail1', 'tail2'].entries())
        add('tubecluster', host, [0, -1, 0], 0.55, 0.8, 0, false, { phase: i * 0.22 });
      add('irismouth', 'head', [0, 0, 1], 0.9, 1, 2);
      add('whiskerfan', 'head', [1, 0.3, 0.6], 0.4, 0.7, 0, true);
      break;
    case 'clapshell':
      g.nodes = [node('core', [0.3, 0.27, 0.3])];
      skin('#bda084', '#efdab7', 'growthshell');
      motion('shellclap');
      g.motion.weights.padcrawl = 0.3;
      add('valvepair', 'core', [0, 1, 0], 1.4, 1.1, 0);
      add('tubecluster', 'core', [0, -1, 0], 0.7, 0.8, 0);
      eyes('core', 0.4);
      break;
    case 'lanternpolyp':
      g.nodes = [node('core', [0.3, 0.4, 0.3])];
      skin('#6b94a2', '#b9e9cc', 'mazeenamel');
      motion('bloomcycle');
      g.motion.weights.padcrawl = 0.6;
      add('latticecage', 'core', [0, 1, 0], 0.8, 0.85, 1);
      add('petalcrown', 'core', [0, -1, 0], 0.76, 0.8, 2);
      add('tubecluster', 'core', [0, -1, 0], 0.65, 1.6, 1, false, { socketOffset: [0, -0.12, 0] });
      break;
    case 'bristleskate':
      g.nodes = [
        node('core', [0.86, 0.27, 0.76]),
        node('head', [0.47, 0.26, 0.41], 'core', [0, 0, 0.5]),
      ];
      skin('#766789', '#e0bfd1', 'saddlehide');
      motion('sensorscan', 'lateral', 0.08);
      g.motion.weights.siphonreach = 0.4;
      add('whiskerfan', 'core', [1, 0.05, 0], 0.95, 1.1, 2, true);
      add('trunk', 'core', [0, 0, -1], 0.52, 1.1, 2);
      add('irismouth', 'head', [0, -0.4, 1], 0.45, 0.8, 0);
      eyes();
      break;
    case 'suckerribbon':
      g.nodes = [
        node('core', [0.3, 0.3, 0.6]),
        node('head', [0.37, 0.34, 0.44], 'core', [0, 0, 0.48]),
        node('unit1', [0.28, 0.28, 0.58], 'core', [0, 0, -0.49]),
        node('unit2', [0.26, 0.26, 0.54], 'unit1', [0, 0.02, -0.5]),
      ];
      skin('#a36e84', '#e6ba9a', 'saddlehide');
      motion('padcrawl', 'lateral', 0.28);
      for (const [i, host] of ['head', 'core', 'unit1', 'unit2'].entries())
        add('tubecluster', host, [1, -0.5, 0], 0.45, 0.85, 1, true, { phase: i * 0.19 });
      add('trunk', 'head', [0, 0, 1], 0.42, 0.8, 0);
      eyes('head', 0.4);
      break;
    case 'bloomkite':
      g.nodes = [node('core', [0.32, 0.52, 0.32])];
      skin('#946b92', '#edc597', 'petalwax');
      motion('bloomcycle');
      g.motion.travel.speed = 2.7;
      add('petalcrown', 'core', [0, 1, 0], 1.16, 1.0, 0);
      add('petalcrown', 'core', [0, -1, 0], 0.65, 0.75, 1, false, { phase: 0.5, twist: 0.4 });
      add('irismouth', 'core', [0, 0, 1], 0.4, 0.75, 0);
      break;
    case 'basketdrifter':
      g.nodes = [node('core', [0.28, 0.46, 0.3])];
      skin('#b1aa87', '#e7e0bd', 'fieldcloth');
      motion('sensorscan');
      g.motion.weights.siphonreach = 0.55;
      g.motion.travel.speed = 1.8;
      add('latticecage', 'core', [0, 1, 0], 1.05, 1.0, 2, false, { socketOffset: [0, -0.62, 0] });
      add('whiskerfan', 'core', [1, 0.25, 0], 0.85, 1.2, 1, true);
      add('trunk', 'core', [0, -1, 0], 0.4, 0.85, 2);
      break;
    case 'apiarist':
      human({ scale: 0.98, bulk: 1.08, shoulders: 1.06, head: 1.04 }, 'civilian', 'sweep');
      g.rig.headStyle = 'hood';
      skin('#a88457', '#e3c974', 'fieldcloth');
      g.appearance.strength = 0.3;
      add('faceplate', 'head', [0, 0, 1], 0.43, 1, 0, false, { socket: 'head', material: 'bone' });
      add('tubecluster', 'chest', [-0.1, 1, 0], 0.4, 1.2, 0, false, { socket: 'hand' });
      add('latticecage', 'chest', [0, 0, -1], 0.4, 0.65, 0);
      break;
    case 'shrinesentinel':
      human(
        { scale: 1.15, shoulders: 1.42, bulk: 1.4, hips: 1.12, head: 0.9 },
        'sentinel',
        'salute',
      );
      g.rig.outfit = 'armor';
      g.rig.headStyle = 'bare';
      g.rig.handStyle = 'stone';
      skin('#66766f', '#d4b780', 'oxidized');
      g.motion.humanoid.style = 'heavy';
      add('faceplate', 'head', [0, 0, 1], 0.44, 1.0, 1, false, {
        socket: 'head',
        material: 'metal',
      });
      add('latticecage', 'chest', [1, 0.15, 0], 0.42, 0.7, 2, true, {
        socket: 'upperArm',
        material: 'armor',
      });
      add('plateband', 'chest', [0, 0, 1], 0.42, 0.65, 0, false, { socketOffset: [0, -0.15, 0] });
      break;
    case 'marshforager':
      human(
        { scale: 1.04, legs: 1.22, arms: 1.18, bulk: 0.78, posture: 0.13, head: 0.92 },
        'scout',
        'beckon',
      );
      g.rig.outfit = 'wrap';
      g.rig.headStyle = 'bare';
      skin('#718875', '#c6dca8', 'saddlehide');
      g.motion.humanoid.style = 'nimble';
      add('trunk', 'head', [0, -0.15, 1], 0.43, 0.8, 1, false, { socket: 'head' });
      add('whiskerfan', 'head', [1, 0.4, 0], 0.35, 0.8, 0, true, { socket: 'head' });
      add('plateband', 'chest', [0, 0, -1], 0.46, 0.7, 1);
      break;
    case 'thornenvoy':
      human(
        { scale: 1.12, arms: 1.12, legs: 1.05, shoulders: 0.82, bulk: 0.74 },
        'caster',
        'stretch',
      );
      g.rig.headStyle = 'bare';
      skin('#5c7961', '#cf9ab1', 'petalwax');
      g.motion.humanoid.style = 'proud';
      add('faceplate', 'head', [0, 0, 1], 0.39, 0.9, 2, false, { socket: 'head' });
      add('petalcrown', 'head', [0, 1, 0], 0.57, 0.8, 1, false, { socket: 'head' });
      add('petalcrown', 'chest', [1, 0.1, 0], 0.36, 0.7, 0, true, {
        socket: 'upperArm',
        phase: 0.5,
      });
      break;
  }
  g.appearance.textureSeed = seed >>> 0;
  syncHumanoidBody(g);
  return validateGenome(g);
}
