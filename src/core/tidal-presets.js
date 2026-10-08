import { basePreset, createPart, validateGenome } from './genome.js';
import { defaultMotion } from './motion.js';
import { TIDAL_MODELS } from './tidal-catalog.js';
import { SURFACE_PRESETS } from './surfaces.js';
/** New graphs, not recolors of the ground-model library. +Z is forward. */
export function tidalPreset(id, seed = 1042) {
  const def = TIDAL_MODELS.find(x => x.id === id);
  if (!def) throw new Error('Unknown Tide & Sky model.');
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
    extra = {},
  ) => {
    const p = createPart(g, type, host, anchor, mirror);
    Object.assign(p, { size, length, variant, ...extra });
    g.parts.push(p);
    return p;
  };
  const eyes = (host = 'head', size = 0.65, variant = 0) =>
    add('optic', host, [1, 0.22, 0.6], size, 1, variant, true);
  const skin = (color, accent, recipe) => {
    Object.assign(g.appearance, SURFACE_PRESETS[recipe], {
      color,
      accent,
      strength: 0.7,
      patternScale: 4,
      warp: 0.2,
    });
    delete g.appearance.label;
  };
  const motion = (clip, body = 'rigid', amplitude = 0.25) => {
    g.motion = defaultMotion(clip);
    g.motion.travel.medium = def.medium;
    g.motion.travel.speed = def.medium === 'air' ? 4.4 : 3.2;
    g.motion.bodyWave.kind = body;
    g.motion.bodyWave.amplitude = amplitude;
  };
  const longBody = (r = 0.3) => {
    g.nodes = [
      node('core', [r + 0.035, r, 0.51]),
      node('head', [r + 0.05, r + 0.015, 0.46], 'core', [0, 0, 0.43]),
    ];
    let parent = 'core';
    for (let i = 1; i <= 5; i++) {
      g.nodes.push(
        node(
          'rear' + i,
          [Math.max(0.25, r - i * 0.009), Math.max(0.25, r - i * 0.009), 0.44],
          parent,
          [0, 0, -0.39],
        ),
      );
      parent = 'rear' + i;
    }
  };
  switch (id) {
    case 'needleswimmer':
      g.nodes = [
        node('core', [0.42, 0.48, 1.04]),
        node('head', [0.36, 0.36, 0.62], 'core', [0, 0, 0.64]),
        node('rear', [0.25, 0.28, 0.57], 'core', [0, 0, -0.57]),
      ];
      skin('#347c91', '#dfd9a3', 'pelagic');
      motion('cruise', 'lateral', 0.19);
      eyes('head', 0.72);
      add('caudal', 'rear', [0, 0, -1], 1.0, 1.05, 0);
      add('paddle', 'core', [1, -0.12, 0.28], 0.53, 0.87, 0, true);
      add('ribbon', 'core', [0, 1, -0.15], 0.4, 0.48, 2);
      add('siphon', 'head', [0, 0, 1], 0.42, 0.55, 1);
      break;
    case 'ribbondrift':
      longBody();
      skin('#5c689b', '#c3ded5', 'eelhide');
      motion('undulate', 'lateral', 0.53);
      g.motion.bodyWave.wavelength = 2.6;
      eyes('head', 0.58);
      add('caudal', 'rear5', [0, 0, -1], 0.56, 0.83, 2);
      for (const host of ['core', 'rear2', 'rear4'])
        add('ribbon', host, [0, 1, -0.1], 0.35, 0.55, 0, false, { twist: Math.PI / 2 });
      add('siphon', 'head', [0, -0.1, 1], 0.38, 0.55, 1);
      break;
    case 'moonbell':
      g.nodes = [node('core', [0.4, 0.25, 0.4])];
      skin('#9784b8', '#e8c5db', 'jelly');
      motion('jet', 'pulse', 0.4);
      g.motion.travel.speed = 1.6;
      g.motion.travel.climb = 1.4;
      add('bell', 'core', [0, 1, 0], 1.45, 1, 0);
      add('oralarm', 'core', [0, -1, 0], 0.84, 1.3, 0);
      add('oralarm', 'core', [0, -1, 0], 0.6, 0.73, 1, false, { phase: 0.37, twist: 0.4 });
      break;
    case 'coilnautilus':
      g.nodes = [
        node('core', [0.58, 0.55, 0.65]),
        node('head', [0.37, 0.36, 0.46], 'core', [0, -0.09, 0.53]),
      ];
      skin('#bf9974', '#f0dec2', 'nacre');
      motion('jet');
      g.motion.travel.speed = 1.8;
      eyes('head', 0.72);
      add('coil', 'core', [0, 1, -0.25], 1.2, 1, 0, false, { twist: Math.PI / 2 });
      add('oralarm', 'head', [0, -0.25, 1], 0.7, 0.7, 1);
      add('siphon', 'core', [0, -0.55, 1], 0.62, 0.85, 0);
      break;
    case 'diskfin':
      g.nodes = [node('core', [0.3, 0.98, 0.7])];
      skin('#e5b36b', '#784856', 'tropical');
      motion('cruise');
      eyes('core', 0.68);
      add('caudal', 'core', [0, 0, -1], 0.7, 0.82, 1);
      add('paddle', 'core', [1, -0.12, 0.3], 0.5, 0.85, 2, true);
      add('ribbon', 'core', [0, 1, -0.05], 0.38, 0.58, 2);
      add('ribbon', 'core', [0, -1, -0.05], 0.35, 0.55, 2);
      add('siphon', 'core', [0, 0, 1], 0.38, 0.5, 0);
      break;
    case 'abyssangler':
      g.nodes = [
        node('core', [0.92, 0.76, 0.9]),
        node('head', [0.64, 0.58, 0.65], 'core', [0, -0.08, 0.53]),
      ];
      skin('#385467', '#69dbcd', 'abyssal');
      motion('cruise');
      g.motion.travel.speed = 2.1;
      eyes('head', 0.85, 1);
      add('siphon', 'head', [0, -0.1, 1], 1.52, 0.9, 2);
      add('caudal', 'core', [0, 0, -1], 0.7, 1.15, 0);
      add('paddle', 'core', [1, -0.15, 0.1], 0.75, 1, 2, true);
      add('oralarm', 'head', [0, 1, 0.25], 0.35, 0.55, 0, false, { material: 'glow' });
      add('floatsac', 'head', [0, 1, 0.25], 0.35, 0.5, 2, false, { material: 'glow' });
      break;
    case 'rayskimmer':
      g.nodes = [
        node('core', [0.97, 0.27, 0.9]),
        node('head', [0.58, 0.26, 0.48], 'core', [0, 0, 0.47]),
      ];
      skin('#617e8c', '#d0d8be', 'rayhide');
      motion('cruise');
      eyes('head', 0.7);
      add('rayfoil', 'core', [1, 0, -0.05], 1.12, 1.07, 1, true);
      add('ribbon', 'core', [0, 0, -1], 0.4, 1.7, 0);
      add('siphon', 'head', [0, -0.35, 1], 0.6, 0.45, 2);
      break;
    case 'paddleback':
      g.nodes = [
        node('core', [0.84, 0.5, 1.0]),
        node('head', [0.37, 0.34, 0.43], 'core', [0, 0, 0.66]),
      ];
      skin('#637d65', '#c7bd80', 'tidalarmor');
      motion('row');
      g.motion.travel.speed = 2.4;
      eyes('head', 0.58);
      add('elytra', 'core', [0, 1, -0.1], 1.0, 0.85, 2, false, { flex: 0 });
      add('paddle', 'core', [1, -0.25, 0.6], 0.66, 1.1, 1, true);
      add('paddle', 'core', [1, -0.25, -0.65], 0.57, 1, 2, true, { phase: 0.5 });
      add('caudal', 'core', [0, 0, -1], 0.35, 0.7, 2);
      add('siphon', 'head', [0, 0, 1], 0.4, 0.6, 1);
      break;
    case 'sailwing':
      g.nodes = [
        node('core', [0.4, 0.42, 0.8]),
        node('head', [0.28, 0.27, 0.37], 'core', [0, 0.15, 0.48]),
      ];
      skin('#c4cdd1', '#455b71', 'plumage');
      motion('soar');
      g.motion.travel.speed = 5.8;
      eyes('head', 0.55);
      add('featherwing', 'core', [1, 0.22, 0.05], 1.14, 1.14, 0, true);
      add('tailfan', 'core', [0, 0, -1], 0.75, 0.9, 0, false, { twist: Math.PI / 2 });
      add('siphon', 'head', [0, 0, 1], 0.49, 0.95, 1);
      break;
    case 'glassdart':
      g.nodes = [
        node('core', [0.39, 0.33, 0.46]),
        node('head', [0.29, 0.28, 0.34], 'core', [0, 0.05, 0.44]),
        node('rear1', [0.25, 0.25, 0.47], 'core', [0, 0, -0.43]),
        node('rear2', [0.25, 0.25, 0.45], 'rear1', [0, 0, -0.4]),
        node('rear3', [0.25, 0.25, 0.44], 'rear2', [0, 0, -0.4]),
      ];
      skin('#437f83', '#cdeae3', 'wingfilm');
      motion('flutter');
      g.motion.travel.speed = 5;
      eyes('head', 1.0, 2);
      add('insectwing', 'core', [1, 0.25, 0.35], 0.95, 1, 0, true, { phase: 0.0 });
      add('insectwing', 'core', [1, 0.25, -0.5], 0.85, 1.05, 0, true, { phase: 0.5, twist: 0.16 });
      add('tailfan', 'rear3', [0, 0, -1], 0.35, 0.65, 2, false, { twist: Math.PI / 2 });
      add('oralarm', 'core', [0, -1, 0.1], 0.35, 0.45, 2);
      break;
    case 'velvetmoth':
      g.nodes = [
        node('core', [0.36, 0.4, 0.59]),
        node('head', [0.27, 0.27, 0.34], 'core', [0, 0.08, 0.44]),
        node('rear', [0.28, 0.28, 0.43], 'core', [0, -0.03, -0.37]),
      ];
      skin('#b578a0', '#e8c690', 'mothdust');
      motion('flutter');
      g.motion.travel.speed = 2.8;
      eyes('head', 0.7, 2);
      add('insectwing', 'core', [1, 0.2, 0.37], 1.15, 1, 1, true, { phase: 0, twist: -0.25 });
      add('insectwing', 'core', [1, 0.15, -0.62], 0.8, 0.85, 1, true, { phase: 0.1, twist: 0.32 });
      add('ribbon', 'head', [0.55, 0.7, 0.5], 0.35, 0.45, 2, true);
      add('oralarm', 'core', [0, -1, 0.1], 0.35, 0.45, 2);
      break;
    case 'skymedusa':
      g.nodes = [node('core', [0.49, 0.25, 0.65])];
      skin('#8195b6', '#ddd4eb', 'jelly');
      motion('float');
      g.motion.travel.speed = 1.8;
      add('floatsac', 'core', [0, 1, 0], 1.15, 1.1, 0);
      add('oralarm', 'core', [0, -1, 0], 0.8, 1.35, 0);
      add('ribbon', 'core', [1, 0, -0.35], 0.45, 0.7, 2, true);
      eyes('core', 0.65, 1);
      break;
    case 'cavekite':
      g.nodes = [
        node('core', [0.42, 0.38, 0.61]),
        node('head', [0.34, 0.3, 0.35], 'core', [0, 0.07, 0.43]),
      ];
      skin('#776878', '#d7b5b4', 'wingfilm');
      motion('powerflight');
      g.motion.travel.speed = 4.6;
      eyes('head', 0.72, 1);
      add('rayfoil', 'core', [1, 0.18, 0], 1.16, 1.1, 2, true);
      add('ribbon', 'head', [0.65, 0.8, -0.1], 0.37, 0.45, 2, true);
      add('tailfan', 'core', [0, -0.2, -1], 0.46, 0.85, 0, false, { twist: Math.PI / 2 });
      add('siphon', 'head', [0, 0, 1], 0.35, 0.5, 0);
      break;
    case 'gyreseed':
      g.nodes = [node('core', [0.35, 0.5, 0.35])];
      skin('#8e9a67', '#d2c991', 'seedhusk');
      motion('float');
      g.motion.travel.speed = 1.7;
      add('rotor', 'core', [0, 1, 0], 1.1, 1, 0);
      add('oralarm', 'core', [0, -1, 0], 0.65, 1, 2);
      break;
    case 'windribbon':
      longBody(0.29);
      skin('#879fb7', '#e9d9ad', 'plumage');
      motion('soar', 'vertical', 0.52);
      g.motion.bodyWave.frequency = 0.6;
      g.motion.travel.speed = 4.5;
      eyes('head', 0.62);
      add('featherwing', 'core', [1, 0.18, 0.15], 0.7, 0.9, 2, true);
      add('featherwing', 'rear3', [1, 0.15, 0], 0.52, 0.8, 2, true, { phase: 0.25 });
      add('tailfan', 'rear5', [0, 0, -1], 0.48, 1.12, 2, false, { twist: Math.PI / 2 });
      add('siphon', 'head', [0, 0, 1], 0.4, 0.75, 1);
      break;
    case 'lanternbeetle':
      g.nodes = [
        node('core', [0.53, 0.38, 0.71]),
        node('head', [0.32, 0.3, 0.35], 'core', [0, 0.02, 0.49]),
      ];
      skin('#5d6e7b', '#d3df9c', 'tidalarmor');
      motion('flutter');
      g.motion.travel.speed = 3.1;
      eyes('head', 0.65, 2);
      add('elytra', 'core', [0, 1, -0.12], 0.9, 0.87, 1);
      add('insectwing', 'core', [1, 0.3, -0.15], 0.85, 0.9, 2, true);
      add('floatsac', 'core', [0, -0.1, -1], 0.4, 0.5, 2, false, { material: 'glow' });
      add('oralarm', 'core', [0, -1, 0], 0.35, 0.45, 2);
      add('siphon', 'head', [0, 0, 1], 0.4, 0.5, 2);
      break;
  }
  g.appearance.textureSeed = seed >>> 0;
  g.motion.layers.blink = 0.9;
  return validateGenome(g);
}
