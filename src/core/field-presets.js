import { basePreset, createPart, validateGenome } from './genome.js';
import { defaultRig, syncHumanoidBody } from './humanoid.js';
import { defaultActor } from './actors.js';
import { defaultMotion } from './motion.js';
import { FIELD_MODELS } from './field-catalog.js';
import { SURFACE_PRESETS } from './surfaces.js';
import { HUMANOID_ACTIONS } from './humanoid-motion.js';
/** These recipes deliberately reuse existing parts. They fill role and silhouette gaps. */
export function fieldPreset(id, seed = 9109) {
  const def = FIELD_MODELS.find(x => x.id === id);
  if (!def) throw new Error('Unknown field model.');
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
  const skin = (color, accent, id) => {
    Object.assign(g.appearance, SURFACE_PRESETS[id], {
      color,
      accent,
      patternScale: 3,
      strength: 0.45,
      warp: 0.1,
    });
    delete g.appearance.label;
  };
  const action = name => {
    g.motion.humanoid.action = name;
    g.motion.humanoid.repeat = HUMANOID_ACTIONS[name].loop;
  };
  const face = (muzzle = 0, size = 0.58, ears = 0.47) => {
    add('optic', 'head', [0.8, 0.24, 0.6], 0.53, 1, 0, true);
    add('muzzle', 'head', [0, -0.1, 1], size, 1, muzzle);
    add('ear', 'head', [0.48, 0.85, 0], ears, 1, 0, true);
  };
  const legs = (size = 0.8, length = 1, variant = 0) => {
    for (const [z, phase] of [
      [0.6, 0],
      [-0.6, 0.5],
    ])
      add('beastleg', 'core', [0.42, -1, z * 0.4], size, length, variant, true, {
        socketOffset: [0, 0, z * 0.65],
        phase,
      });
  };
  const human = (role, proportions = {}) => {
    g.rig = defaultRig('humanoid');
    g.rig.bodyStyle = 'defined';
    g.rig.headStyle = 'bare';
    g.rig.outfit = 'tunic';
    Object.assign(g.rig.proportions, proportions);
    syncHumanoidBody(g);
    g.actor = defaultActor(role);
    g.motion = defaultMotion('idle');
  };
  g.motion = defaultMotion('animalamble');
  g.actor = defaultActor('civilian');
  g.actor.faction = 'neutral';
  switch (id) {
    case 'trailhound':
      g.nodes = [
        node('core', [0.38, 0.45, 0.84]),
        node('neck', [0.29, 0.38, 0.34], 'core', [0, 0.16, 0.65]),
        node('head', [0.31, 0.32, 0.37], 'neck', [0, 0.27, 0.23]),
      ];
      skin('#735645', '#d6bc91', 'shortcoat');
      legs(0.76, 1.0, 0);
      face(0, 0.7, 0.43);
      add('brushtail', 'core', [0, 0.25, -1], 0.55, 1.1, 0);
      g.actor.faction = 'friendly';
      break;
    case 'hillgrazer':
      g.nodes = [
        node('core', [0.49, 0.58, 0.92]),
        node('neck', [0.27, 0.57, 0.34], 'core', [0, 0.37, 0.58]),
        node('head', [0.29, 0.37, 0.36], 'neck', [0, 0.48, 0.2]),
      ];
      skin('#b1a187', '#51463b', 'woolcoat');
      legs(0.85, 1.28, 1);
      face(1, 0.57, 0.42);
      add('antler', 'head', [0.46, 1, -0.2], 0.44, 0.75, 0, true);
      add('brushtail', 'core', [0, -0.1, -1], 0.38, 0.65, 1);
      break;
    case 'bristletusk':
      g.nodes = [
        node('core', [0.57, 0.59, 0.88]),
        node('shoulder', [0.52, 0.61, 0.56], 'core', [0, 0.11, 0.42]),
        node('head', [0.42, 0.36, 0.42], 'shoulder', [0, -0.22, 0.48]),
      ];
      skin('#594e45', '#b39770', 'shortcoat');
      legs(0.68, 0.74, 1);
      face(2, 0.83, 0.4);
      add('brushtail', 'core', [0, 0.05, -1], 0.36, 0.65, 2);
      g.motion = defaultMotion('animalsniff');
      g.actor = defaultActor('monster');
      g.actor.faction = 'neutral';
      break;
    case 'reedhopper':
      g.nodes = [
        node('core', [0.63, 0.34, 0.6]),
        node('head', [0.5, 0.31, 0.39], 'core', [0, 0.02, 0.4]),
      ];
      skin('#5a7154', '#d1bd82', 'shortcoat');
      g.appearance.pattern = 'spots';
      g.appearance.patternScale = 4.8;
      add('beastleg', 'core', [0.7, -1, 0.3], 0.53, 0.7, 2, true, { socketOffset: [0, 0, 0.18] });
      add('beastleg', 'core', [1, -0.8, -0.4], 0.82, 0.75, 2, true, {
        socketOffset: [0, 0, -0.24],
        phase: 0.5,
      });
      add('optic', 'head', [0.6, 0.8, 0.25], 0.84, 1, 1, true);
      add('muzzle', 'head', [0, -0.1, 1], 0.65, 0.7, 1);
      g.motion = defaultMotion('animalbound');
      break;
    case 'fieldmedic':
      human('civilian', { scale: 1, bulk: 0.85, shoulders: 0.88 });
      skin('#627e78', '#e2d7b6', 'repaircloth');
      g.rig.headStyle = 'hood';
      action('offer');
      add('utilitybelt', 'core', [0, 0, 1], 0.9, 1, 1, false, { socket: 'pelvis' });
      add('mantle', 'chest', [0, 0, -1], 0.72, 1, 0);
      add('pack', 'chest', [0, 0, -1], 0.53, 1, 0, false, { socketOffset: [0, -0.35, 0.03] });
      break;
    case 'lamplighter':
      human('civilian', { scale: 1.08, bulk: 0.8, legs: 1.1 });
      skin('#526476', '#d1b887', 'repaircloth');
      g.rig.headStyle = 'hood';
      action('lamplook');
      add('fieldlamp', 'chest', [-0.1, 0, -1], 0.73, 1, 0, false, {
        socket: 'hand',
        socketOffset: [0, -0.08, 0.11],
      });
      add('utilitybelt', 'core', [0, 0, 1], 0.8, 1, 0);
      add('mantle', 'chest', [0, 0, -1], 0.75, 1, 1);
      break;
    case 'archivist':
      human('civilian', { scale: 1.02, bulk: 0.86, arms: 0.92 });
      skin('#817087', '#d2c4a3', 'checkcloth');
      action('readbook');
      add('folio', 'chest', [0.1, 0, 1], 0.68, 1, 0, false, {
        socket: 'hand',
        socketOffset: [0, -0.1, -0.06],
      });
      add('utilitybelt', 'core', [0, 0, 1], 0.8, 1, 0);
      add('mantle', 'chest', [0, 0, -1], 0.8, 1, 2);
      break;
    case 'prospector':
      human('civilian', { scale: 0.93, bulk: 1.18, shoulders: 1.18, legs: 0.93 });
      skin('#8f7355', '#cebda1', 'repaircloth');
      g.rig.outfit = 'armor';
      action('work');
      add('worktool', 'chest', [-0.08, 1, 0], 0.72, 1, 1, false, { socket: 'hand' });
      add('pack', 'chest', [0, 0, -1], 0.8, 1, 2);
      add('utilitybelt', 'core', [0, 0, 1], 0.84, 1, 0);
      break;
    case 'waypostarcher':
      human('guard', { scale: 1.1, bulk: 0.77, arms: 1.02, legs: 1.08 });
      skin('#5b6658', '#bcb18a', 'fieldcloth');
      g.rig.headStyle = 'hood';
      action('bowdraw');
      add('bowrig', 'chest', [0.1, 0, 1], 0.83, 1, 1, false, {
        socket: 'hand',
        socketOffset: [0, -0.12, -0.06],
      });
      add('bowrig', 'chest', [0.01, 1, 0], 0.6, 1, 2, false, {
        socket: 'chest',
        socketOffset: [0.12, -0.25, -0.45],
      });
      add('utilitybelt', 'core', [0, 0, 1], 0.75, 1, 0);
      break;
    case 'caravancourier':
      human('civilian', { scale: 0.97, bulk: 0.88, legs: 1.03 });
      skin('#927451', '#d5bea0', 'checkcloth');
      action('writenote');
      add('folio', 'chest', [0.1, 0, 1], 0.55, 1, 1, false, {
        socket: 'hand',
        socketOffset: [0, -0.1, -0.06],
      });
      add('pack', 'chest', [0, 0, -1], 0.76, 1, 2);
      add('utilitybelt', 'core', [0, 0, 1], 0.8, 1, 2);
      break;
  }
  g.appearance.textureSeed = seed >>> 0;
  syncHumanoidBody(g);
  return validateGenome(g);
}
